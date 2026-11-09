"""API FastAPI de Civix CAD Vision. Ejecutar: iniciar-cad-vision.bat (puerto 8765, sólo este equipo)."""
from __future__ import annotations

import base64
import json
import os
import threading
import uuid
from collections import OrderedDict
from pathlib import Path

import cv2
import numpy as np
from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from . import __version__, exporters, ocr, preprocess, reconstruct

MAX_UPLOAD = 25 * 1024 * 1024
MAX_SESSIONS = 8

app = FastAPI(title="Civix CAD Vision", version=__version__)
extra = [o.strip() for o in os.environ.get("CAD_VISION_ORIGINS", "").split(",") if o.strip()]
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
        s = _sessions.get(sid)
        if s is None:
            raise HTTPException(404, "La imagen ya no está en memoria. Vuelve a cargarla.")
        _sessions.move_to_end(sid)
        return s


@app.get("/api/cad-vision/health")
def health():
    return {"ok": True, "version": __version__, "ocr": ocr.engine_status()}


@app.post("/api/cad-vision/upload")
async def upload(file: UploadFile = File(...)):
    data = await file.read(MAX_UPLOAD + 1)
    if len(data) > MAX_UPLOAD:
        raise HTTPException(413, "El archivo supera 25 MB.")
    try:
        img, meta = preprocess.load_image(data)
    except preprocess.ImagenInvalida as e:
        raise HTTPException(422, str(e)) from e
    sid = uuid.uuid4().hex
    with _lock:
        _sessions[sid] = {"img": img, "meta": meta, "name": file.filename or "plano"}
        while len(_sessions) > MAX_SESSIONS:
            _sessions.popitem(last=False)
    h, w = img.shape[:2]
    return {"id": sid, "w": w, "h": h, "meta": meta, "preview": _jpeg(img), "page_quad": preprocess.detect_page(img)}


def _options(o: dict) -> dict:
    return {k: o[k] for k in ("rotate", "quad", "deskew", "illumination", "contrast", "denoise") if k in o}


@app.post("/api/cad-vision/preprocess")
def do_preprocess(payload: dict = Body(...)):
    s = _get(payload.get("id", ""))
    try:
        prep = preprocess.prepare(s["img"], _options(payload.get("options") or {}))
    except preprocess.ImagenInvalida as e:
        raise HTTPException(422, str(e)) from e
    h, w = prep["view"].shape[:2]
    return {"w": w, "h": h, "preview": _jpeg(prep["view"]), "log": prep["log"]}


@app.post("/api/cad-vision/analyze")
def do_analyze(payload: dict = Body(...)):
    s = _get(payload.get("id", ""))
    o = payload.get("options") or {}
    try:
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
def export(fmt: str, payload: dict = Body(...)):
    if fmt not in CONTENT:
        raise HTTPException(404, "Formato no soportado.")
    doc = payload.get("document")
    if not isinstance(doc, dict) or not isinstance(doc.get("entities"), list):
        raise HTTPException(422, "Documento de plano inválido.")
    units = payload.get("units", "m")
    if units not in exporters.FACTOR:
        raise HTTPException(422, "Unidad no soportada.")
    issues = exporters.check(doc, bool(payload.get("acknowledge_uncertain")))
    if issues:
        return JSONResponse(status_code=409, content={"blocked": True, "issues": issues})

    name = "".join(c for c in str(doc.get("name") or "plano") if c.isalnum() or c in "-_") or "plano"
    headers = {"Content-Disposition": f'attachment; filename="{name}_civix.{fmt}"'}
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
