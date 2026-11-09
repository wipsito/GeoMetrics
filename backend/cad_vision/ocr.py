"""OCR intercambiable. Por defecto RapidOCR (modelos neuronales PP-OCR en ONNX, sin claves ni nube)."""
from __future__ import annotations

import os
import re
import threading

import cv2
import numpy as np

PARTIAL_PAIR = re.compile(r"^\d+(?:[.,]\d+)?\s*[a-z\"']{0,6}\s*[x×*]$", re.I)
_lock = threading.Lock()
_engine = None
_error: str | None = None


class RapidEngine:
    name = "RapidOCR (PP-OCR ONNX)"

    def __init__(self):
        from rapidocr import RapidOCR

        self.e = RapidOCR()

    def read(self, img: np.ndarray) -> list[dict]:
        r = self.e(img)
        if r is None or r.boxes is None or r.txts is None:
            return []
        return [
            {"box": np.asarray(b, float), "text": str(t), "score": float(s)}
            for b, t, s in zip(r.boxes, r.txts, r.scores)
        ]


class TesseractEngine:
    """Alternativa: requiere el programa Tesseract instalado y `pip install pytesseract`."""

    name = "Tesseract"

    def __init__(self):
        import pytesseract

        self.t = pytesseract

    def read(self, img: np.ndarray) -> list[dict]:
        d = self.t.image_to_data(img, lang=os.environ.get("CAD_VISION_TESS_LANG", "spa+eng"), output_type=self.t.Output.DICT)
        out = []
        for i, txt in enumerate(d["text"]):
            if txt.strip() and float(d["conf"][i]) > 0:
                x, y, w, h = d["left"][i], d["top"][i], d["width"][i], d["height"][i]
                out.append({"box": np.array([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], float), "text": txt, "score": float(d["conf"][i]) / 100})
        return out


def get_engine():
    """Carga perezosa. Devuelve None si no hay OCR disponible; el resto del proceso sigue y lo advierte."""
    global _engine, _error
    with _lock:
        if _engine is None and _error is None:
            kind = os.environ.get("CAD_VISION_OCR", "rapidocr").lower()
            try:
                _engine = TesseractEngine() if kind == "tesseract" else RapidEngine()
            except Exception as e:  # noqa: BLE001 - se informa al usuario como advertencia
                _error = f"{type(e).__name__}: {e}"
        return _engine


def engine_status() -> dict:
    e = get_engine()
    return {"ok": e is not None, "name": e.name if e else None, "error": _error}


def _rect(box: np.ndarray) -> tuple[float, float, float, float]:
    return float(box[:, 0].min()), float(box[:, 1].min()), float(box[:, 0].max()), float(box[:, 1].max())


def _overlap(a, b) -> float:
    ix = max(0.0, min(a[2], b[2]) - max(a[0], b[0]))
    iy = max(0.0, min(a[3], b[3]) - max(a[1], b[1]))
    area = min((a[2] - a[0]) * (a[3] - a[1]), (b[2] - b[0]) * (b[3] - b[1]))
    return ix * iy / area if area > 0 else 0.0


def _merge_same_line(items: list[dict]) -> list[dict]:
    """Une fragmentos contiguos de una misma línea cuando juntos forman una cota ('2 m' 'x' '2,5 m')."""
    from .textparse import parse_text

    items = sorted(items, key=lambda t: (t["rect"][1], t["rect"][0]))
    used = [False] * len(items)
    out = []
    for i, a in enumerate(items):
        if used[i]:
            continue
        cur = dict(a)
        used[i] = True
        changed = True
        while changed:
            changed = False
            for j, b in enumerate(items):
                if used[j] or b["rotated"] != cur["rotated"] or b["rotated"]:
                    continue
                ra, rb = cur["rect"], b["rect"]
                h = max(ra[3] - ra[1], rb[3] - rb[1])
                same = abs((ra[1] + ra[3]) - (rb[1] + rb[3])) / 2 < 0.6 * h
                gap = rb[0] - ra[2]
                if not same or not (-0.3 * h < gap < 1.4 * h):
                    continue
                joined = cur["text"] + " " + b["text"]
                # '2 m' + 'x' es una cota a medio armar; se une para completarla con el siguiente pedazo
                if parse_text(joined)["role"] in ("dim_pair", "dim") or PARTIAL_PAIR.match(joined.strip()):
                    cur.update(
                        text=joined,
                        score=min(cur["score"], b["score"]),
                        rect=(min(ra[0], rb[0]), min(ra[1], rb[1]), max(ra[2], rb[2]), max(ra[3], rb[3])),
                    )
                    used[j] = True
                    changed = True
        out.append(cur)
    return out


def read_text(ink_only: np.ndarray) -> tuple[list[dict], str | None]:
    """Lee texto horizontal y, en segunda pasada, texto girado 90° (cotas verticales)."""
    eng = get_engine()
    if eng is None:
        return [], _error or "OCR no disponible"
    bgr = cv2.cvtColor(ink_only, cv2.COLOR_GRAY2BGR)
    H, W = ink_only.shape[:2]
    items: list[dict] = []
    for r in eng.read(bgr):
        items.append({"text": r["text"], "score": r["score"], "rect": _rect(r["box"]), "rotated": False})

    rot = cv2.rotate(bgr, cv2.ROTATE_90_CLOCKWISE)  # texto escrito de abajo hacia arriba queda horizontal
    for r in eng.read(rot):
        x0, y0, x1, y1 = _rect(r["box"])
        # (u, v) rotado -> (x, y) original: x = v, y = H - u
        rect = (y0, H - x1, y1, H - x0)
        if (rect[2] - rect[0]) > (rect[3] - rect[1]):  # texto que ya era horizontal, leído como basura
            continue
        items.append({"text": r["text"], "score": r["score"], "rect": rect, "rotated": True})

    # de dos lecturas que se pisan gana la de mayor puntaje
    items.sort(key=lambda t: -t["score"])
    kept: list[dict] = []
    for it in items:
        if all(_overlap(it["rect"], k["rect"]) < 0.5 for k in kept) and it["text"].strip():
            kept.append(it)
    return _merge_same_line(kept), None
