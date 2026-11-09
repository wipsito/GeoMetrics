"""Punto de extensión para modelos entrenados de símbolos arquitectónicos.

Hoy se usa HeuristicDetector (reglas geométricas sobre OpenCV). Para sumar un modelo propio
(YOLO exportado a ONNX, por ejemplo) se crea una clase con `detect(gray, mask, L)` que devuelva
la misma lista de dicts y se define la variable de entorno:

    CAD_VISION_DETECTOR=paquete.modulo:MiDetector

Cada símbolo: {"type": "door"|"window"|"column"|"stair"|"other", "bbox": (x0,y0,x1,y1), "conf": 0..1}.
Las detecciones externas se añaden como elementos a revisar; nunca sustituyen a la geometría medida.
"""
from __future__ import annotations

import importlib
import os

import numpy as np


class SymbolDetector:
    name = "ninguno"

    def detect(self, gray: np.ndarray, mask: np.ndarray, L: float) -> list[dict]:
        return []


def load_external() -> SymbolDetector:
    spec = os.environ.get("CAD_VISION_DETECTOR", "").strip()
    if not spec:
        return SymbolDetector()
    mod, cls = spec.split(":", 1)
    return getattr(importlib.import_module(mod), cls)()
