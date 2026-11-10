"""API FastAPI de Civix CAD Vision.

Local: iniciar-cad-vision.bat (puerto 8765, sólo este equipo).
Servidor: ver deploy/ y la sección «Publicar» de docs/CAD-VISION.md (CAD_VISION_PUBLIC=1).
"""
from __future__ import annotations

import base64
import json
import os
import threading
import time
import uuid
from collections import OrderedDict, deque
from pathlib import Path

import cv2
import numpy as np
from fastapi import Body, FastAPI, File, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from . import __version__, exporters, ocr, preprocess, reconstruct


def _env_int(name: str, default: int) -> int:
    try:
        return int(os.environ.get(name, default))
    except ValueError:
        return default


PUBLIC = os.environ.get("CAD_VISION_PUBLIC", "") == "1"
MAX_UPLOAD = 25 * 1024 * 1024
MAX_BODY = MAX_UPLOAD + 1024 * 1024  # el documento de exportación también pasa por aquí
MAX_ENTITIES = 20000
MAX_SESSIONS = _env_int("CAD_VISION_MAX_SESSIONS", 40 if PUBLIC else 8)
SESSION_TTL = _env_int("CAD_VISION_SESSION_TTL", 1800)  # segundos que la imagen permanece en memoria
MAX_CONCURRENT = _env_int("CAD_VISION_MAX_CONCURRENT", 2)  # análisis simultáneos
QUEUE_WAIT = _env_int("CAD_VISION_QUEUE_WAIT", 60)  # segundos de espera por un turno
# Por IP y por hora. Es alto porque un aula entera puede salir a internet con la misma IP.
RATE_PER_HOUR = _env_int("CAD_VISION_RATE_PER_HOUR", 240)

app = FastAPI(
    title="Civix CAD Vision",
    version=__version__,
    docs_url=None if PUBLIC else "/docs",
    redoc_url=None,
    openapi_url=None if PUBLIC else "/openapi.json",
)


@app.middleware("http")
async def limit_body(request: Request, call_next):
    if request.method == "POST":
        size = request.headers.get("content-length")
        if size is None or not size.isdigit():
            return JSONResponse(status_code=411, content={"detail": "Solicitud sin tamaño declarado."})
        if int(size) > MAX_BODY:
            return JSONResponse(status_code=413, content={"detail": "El archivo supera 25 MB."})
    return await call_next(request)


extra = [o.strip().rstrip("/") for o in os.environ.get("CAD_VISION_ORIGINS", "").split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^(https?://(localhost|127\.0\.0\.1)(:\d+)?|null)$",
    allow_origins=extra,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
    expose_headers=["X-CAD-Validation", "Content-Disposition"],
)

_sessions: "OrderedDict[str, dict]" = OrderedDict()
_lock = threading.Lock()
_hits: dict[str, deque] = {}
_slots = threading.BoundedSemaphore(max(1, MAX_CONCURRENT))


def _guard(request: Request, cost: int = 1) -> None:
    """Límite suave por IP. La protección real de CPU es el semáforo de análisis."""
    forwarded = request.headers.get("x-forwarded-for", "") if PUBLIC else ""
    ip = forwarded.split(",")[0].strip() or (request.client.host if request.client else "?")
    now = time.time()
    with _lock:
        if len(_hits) > 20000:
            _hits.clear()
        q = _hits.setdefault(ip, deque())
        while q and now - q[0] > 3600:
            q.popleft()
        if len(q) + cost > RATE_PER_HOUR:
            raise HTTPException(429, "Se alcanzó el límite de uso por hora en esta red. Inténtalo más tarde.")
        q.extend([now] * cost)


class _Turno:
    """Un turno de CPU: si el servidor está lleno se espera y, al agotarse, se avisa."""

    def __enter__(self):
        if not _slots.acquire(timeout=QUEUE_WAIT):
            raise HTTPException(503, "El servidor está atendiendo muchos planos. Inténtalo en un minuto.")

    def __exit__(self, *exc):
        _slots.release()


def _purge() -> None:
    limit = time.time() - SESSION_TTL
    for sid in [k for k, s in _sessions.items() if s["t"] < limit]:
        del _sessions[sid]


def _jpeg(img: np.ndarray, q: int = 82, max_side: int = 1800) -> str:
    h, w = img.shape[:2]
    k = min(1.0, max_side / max(h, w))
    if k < 1:
        img = cv2.resize(img, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
    ok, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, q])
    if not ok:
        raise HTTPException(500, "No se pudo codificar la vista previa.")
    return "data:image/jpeg;base64," + base64.b64encode(buf.tobytes()).decode()


def _get(sid: str) -> dict:
    with _lock:
        _purge()
        s = _sessions.get(sid)
        if s is None:
            raise HTTPException(404, "La imagen ya no está en memoria. Vuelve a cargarla.")
        s["t"] = time.time()
        _sessions.move_to_end(sid)
        return s


@app.get("/api/cad-vision/health")
def health():
    st = ocr.engine_status()
    if PUBLIC:
        st = {"ok": st["ok"], "name": st["name"]}  # el detalle interno sólo se ve en local
    return {"ok": True, "version": __version__, "ocr": st}


@app.post("/api/cad-vision/upload")
async def upload(request: Request, file: UploadFile = File(...)):
    _guard(request)
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "El archivo supera 25 MB.")
    try:
        img, meta = preprocess.load_image(data)
    except preprocess.ImagenInvalida as e:
        raise HTTPException(422, str(e)) from e
    sid = uuid.uuid4().hex
    with _lock:
        _purge()
        _sessions[sid] = {"img": img, "meta": meta, "name": file.filename or "plano", "t": time.time()}
        while len(_sessions) > MAX_SESSIONS:
            _sessions.popitem(last=False)
    h, w = img.shape[:2]
    return {"id": sid, "w": w, "h": h, "meta": meta, "preview": _jpeg(img), "page_quad": preprocess.detect_page(img)}


def _options(o: dict) -> dict:
    return {k: o[k] for k in ("rotate", "quad", "deskew", "illumination", "contrast", "denoise") if k in o}


@app.post("/api/cad-vision/preprocess")
def do_preprocess(request: Request, payload: dict = Body(...)):
    _guard(request)
    s = _get(payload.get("id", ""))
    try:
        with _Turno():
            prep = preprocess.prepare(s["img"], _options(payload.get("options") or {}))
    except preprocess.ImagenInvalida as e:
        raise HTTPException(422, str(e)) from e
    h, w = prep["view"].shape[:2]
    return {"w": w, "h": h, "preview": _jpeg(prep["view"]), "log": prep["log"]}


@app.post("/api/cad-vision/analyze")
def do_analyze(request: Request, payload: dict = Body(...)):
    _guard(request, cost=4)  # es la operación cara
    s = _get(payload.get("id", ""))
    o = payload.get("options") or {}
    try:
        with _Turno():
            prep = preprocess.prepare(s["img"], _options(o))
            doc = reconstruct.analyze(prep, s["meta"], o)
    except (preprocess.ImagenInvalida, ValueError) as e:
        raise HTTPException(422, str(e)) from e
    doc["name"] = Path(s["name"]).stem
    doc["image"]["src"] = _jpeg(prep["color"])
    doc["image"]["k"] = 1.0
    return doc


CONTENT = {"dxf": "application/dxf", "svg": "image/svg+xml", "pdf": "application/pdf"}


@app.post("/api/cad-vision/export/{fmt}")
def export(request: Request, fmt: str, payload: dict = Body(...)):
    _guard(request)
    if fmt not in CONTENT:
        raise HTTPException(404, "Formato no soportado.")
    doc = payload.get("document")
    if not isinstance(doc, dict) or not isinstance(doc.get("entities"), list):
        raise HTTPException(422, "Documento de plano inválido.")
    if len(doc["entities"]) > MAX_ENTITIES:
        raise HTTPException(413, "El plano tiene demasiados elementos.")
    units = payload.get("units", "m")
    if units not in exporters.FACTOR:
        raise HTTPException(422, "Unidad no soportada.")
    try:
        issues = exporters.check(doc, bool(payload.get("acknowledge_uncertain")))
        if issues:
            return JSONResponse(status_code=409, content={"blocked": True, "issues": issues})

        name = "".join(c for c in str(doc.get("name") or "plano") if c.isalnum() or c in "-_") or "plano"
        headers = {"Content-Disposition": f'attachment; filename="{name}_civix.{fmt}"'}
        with _Turno():
            if fmt == "dxf":
                text = exporters.to_dxf(doc, units)
                report = exporters.validate_dxf(text)
                if report["errors"]:
                    raise HTTPException(500, f"El DXF generado no pasó la auditoría: {report['errors']} errores.")
                headers["X-CAD-Validation"] = json.dumps(report, ensure_ascii=True)
                return Response(text.encode("utf-8"), media_type=CONTENT[fmt], headers=headers)
            if fmt == "svg":
                return Response(exporters.to_svg(doc).encode("utf-8"), media_type=CONTENT[fmt], headers=headers)
            return Response(exporters.to_pdf(doc), media_type=CONTENT[fmt], headers=headers)
    except (KeyError, TypeError, ValueError, IndexError, AttributeError) as e:
        raise HTTPException(422, "Documento de plano inválido.") from e
