"""Carga y acondicionamiento de la imagen: PDF/foto -> imagen rectificada + máscara de tinta."""
from __future__ import annotations

import cv2
import numpy as np

MAX_SIDE = 2400
MIN_SIDE = 1200
PDF_DPI = 200


class ImagenInvalida(ValueError):
    pass


def load_image(data: bytes) -> tuple[np.ndarray, dict]:
    """Decodifica PNG/JPG/PDF. Devuelve imagen BGR y metadatos (dpi si se conoce)."""
    meta: dict = {"dpi": None, "pages": 1, "source": "image"}
    if data[:5] == b"%PDF-":
        import pymupdf

        try:
            pdf = pymupdf.open(stream=data, filetype="pdf")
        except Exception as e:
            raise ImagenInvalida(f"No se pudo abrir el PDF: {e}") from e
        if pdf.page_count == 0:
            raise ImagenInvalida("El PDF no tiene páginas.")
        pix = pdf[0].get_pixmap(dpi=PDF_DPI, alpha=False)
        arr = np.frombuffer(pix.samples, np.uint8).reshape(pix.height, pix.width, pix.n)
        img = cv2.cvtColor(arr, cv2.COLOR_RGB2BGR) if pix.n == 3 else cv2.cvtColor(arr, cv2.COLOR_GRAY2BGR)
        meta.update(dpi=PDF_DPI, pages=pdf.page_count, source="pdf")
    else:
        img = cv2.imdecode(np.frombuffer(data, np.uint8), cv2.IMREAD_COLOR)  # respeta EXIF
        if img is None:
            raise ImagenInvalida("El archivo no es una imagen válida (usa PNG, JPG o PDF).")

    h, w = img.shape[:2]
    if min(h, w) < 200:
        raise ImagenInvalida("La imagen es demasiado pequeña (mínimo 200 px por lado).")
    k = 1.0
    if max(h, w) > MAX_SIDE:
        k = MAX_SIDE / max(h, w)
    elif max(h, w) < MIN_SIDE:
        k = MIN_SIDE / max(h, w)
    if k != 1.0:
        interp = cv2.INTER_AREA if k < 1 else cv2.INTER_CUBIC
        img = cv2.resize(img, (round(w * k), round(h * k)), interpolation=interp)
        if meta["dpi"]:
            meta["dpi"] *= k
    return img, meta


def rotate_image(img: np.ndarray, deg: float) -> np.ndarray:
    """Rota sin recortar; los múltiplos de 90° no interpolan."""
    d = deg % 360
    if d == 0:
        return img
    if d in (90, 180, 270):
        code = {90: cv2.ROTATE_90_CLOCKWISE, 180: cv2.ROTATE_180, 270: cv2.ROTATE_90_COUNTERCLOCKWISE}[int(d)]
        return cv2.rotate(img, code)
    h, w = img.shape[:2]
    M = cv2.getRotationMatrix2D((w / 2, h / 2), -d, 1.0)
    c, s = abs(M[0, 0]), abs(M[0, 1])
    nw, nh = int(h * s + w * c), int(h * c + w * s)
    M[0, 2] += nw / 2 - w / 2
    M[1, 2] += nh / 2 - h / 2
    return cv2.warpAffine(img, M, (nw, nh), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))


def order_quad(pts: np.ndarray) -> np.ndarray:
    pts = np.asarray(pts, np.float32).reshape(4, 2)
    s, d = pts.sum(1), pts[:, 1] - pts[:, 0]
    return np.array([pts[s.argmin()], pts[d.argmin()], pts[s.argmax()], pts[d.argmax()]], np.float32)


def warp_quad(img: np.ndarray, quad_norm) -> np.ndarray:
    """Recorte + perspectiva a partir de 4 esquinas normalizadas (0..1)."""
    h, w = img.shape[:2]
    q = order_quad(np.asarray(quad_norm, np.float32) * [w, h])
    tl, tr, br, bl = q
    W = int(max(np.linalg.norm(tr - tl), np.linalg.norm(br - bl)))
    H = int(max(np.linalg.norm(bl - tl), np.linalg.norm(br - tr)))
    if W < 50 or H < 50:
        raise ImagenInvalida("La zona de recorte es demasiado pequeña.")
    dst = np.array([[0, 0], [W - 1, 0], [W - 1, H - 1], [0, H - 1]], np.float32)
    return cv2.warpPerspective(img, cv2.getPerspectiveTransform(q, dst), (W, H), flags=cv2.INTER_CUBIC, borderValue=(255, 255, 255))


def detect_page(img: np.ndarray) -> list[list[float]] | None:
    """Busca la hoja (cuadrilátero mayor). Devuelve esquinas normalizadas o None."""
    h, w = img.shape[:2]
    k = 800 / max(h, w)
    small = cv2.resize(img, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
    gray = cv2.GaussianBlur(cv2.cvtColor(small, cv2.COLOR_BGR2GRAY), (5, 5), 0)
    edges = cv2.dilate(cv2.Canny(gray, 40, 120), np.ones((3, 3), np.uint8))
    cnts, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    area_img = small.shape[0] * small.shape[1]
    for c in sorted(cnts, key=cv2.contourArea, reverse=True)[:6]:
        if cv2.contourArea(c) < 0.25 * area_img:
            break
        ap = cv2.approxPolyDP(c, 0.02 * cv2.arcLength(c, True), True)
        if len(ap) == 4 and cv2.isContourConvex(ap):
            q = order_quad(ap.reshape(4, 2)) / [small.shape[1], small.shape[0]]
            return q.tolist()
    return None


def illumination_flat(gray: np.ndarray) -> np.ndarray:
    """Aplana sombras dividiendo por el fondo estimado (el trazo oscuro no entra al fondo)."""
    h, w = gray.shape
    k = 8
    small = cv2.resize(gray, (max(8, w // k), max(8, h // k)), interpolation=cv2.INTER_AREA)
    r = max(5, int(max(small.shape) / 40)) | 1
    bg = cv2.morphologyEx(small, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (r, r)))
    bg = cv2.GaussianBlur(bg, (0, 0), r)
    bg = cv2.resize(bg, (w, h), interpolation=cv2.INTER_LINEAR).astype(np.float32)
    return np.clip(gray.astype(np.float32) / np.maximum(bg, 1) * 245, 0, 255).astype(np.uint8)


def estimate_skew(gray: np.ndarray) -> float:
    """Ángulo dominante respecto a H/V en grados (positivo = horario en imagen)."""
    h, w = gray.shape
    k = 1200 / max(h, w)
    small = cv2.resize(gray, None, fx=k, fy=k, interpolation=cv2.INTER_AREA)
    edges = cv2.Canny(small, 50, 150)
    lines = cv2.HoughLinesP(edges, 1, np.pi / 720, 80, minLineLength=max(small.shape) // 6, maxLineGap=8)
    if lines is None:
        return 0.0
    ang, wt = [], []
    for x0, y0, x1, y1 in lines[:, 0]:
        a = np.degrees(np.arctan2(y1 - y0, x1 - x0))
        a = ((a + 45) % 90) - 45
        ang.append(a)
        wt.append(np.hypot(x1 - x0, y1 - y0))
    ang, wt = np.array(ang), np.array(wt)
    order = ang.argsort()
    cum = np.cumsum(wt[order])
    return float(ang[order][np.searchsorted(cum, cum[-1] / 2)])


def prepare(img: np.ndarray, o: dict) -> dict:
    """Aplica las correcciones elegidas. Devuelve imagen rectificada, gris aplanado y resumen."""
    log: list[str] = []
    if o.get("rotate"):
        img = rotate_image(img, float(o["rotate"]))
        log.append(f"Rotación manual {float(o['rotate']):g}°")
    if o.get("quad"):
        img = warp_quad(img, o["quad"])
        log.append("Recorte y perspectiva aplicados")
    gray0 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    if o.get("deskew", True):
        a = estimate_skew(gray0)
        if 0.15 < abs(a) <= 15:
            img = rotate_image(img, -a)  # a>0 es giro horario aparente: se compensa en sentido contrario
            gray0 = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            log.append(f"Inclinación corregida {a:+.2f}°")
    if float(gray0.mean()) < 100:  # plano azul / fondo oscuro
        gray0 = 255 - gray0
        log.append("Fondo oscuro detectado: imagen invertida")
    gray = illumination_flat(gray0) if o.get("illumination", True) else gray0
    if o.get("illumination", True):
        log.append("Iluminación corregida")
    if o.get("denoise", True):
        gray = cv2.fastNlMeansDenoising(gray, None, h=6, templateWindowSize=5, searchWindowSize=11)
        log.append("Ruido reducido")
    view = gray
    if o.get("contrast", True):
        view = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
        log.append("Contraste mejorado")
    return {"color": img, "gray": gray, "view": view, "log": log}


def _remove_periodic_grid(mask: np.ndarray, horizontal: bool) -> tuple[np.ndarray, float | None]:
    """Quita rectas casi de página completa, finas y periódicas: cuadrícula oscura del papel."""
    m = mask if horizontal else cv2.transpose(mask)
    span = int(m.shape[1] * 0.6)
    opened = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((1, span), np.uint8))
    rows = np.where(opened.sum(1) > 0)[0]
    if rows.size == 0:
        return mask, None
    groups = np.split(rows, np.where(np.diff(rows) > 1)[0] + 1)
    centers = np.array([g.mean() for g in groups if g.size <= 6])
    if centers.size < 5:
        return mask, None
    d = np.diff(centers)
    pitch = float(np.median(d))
    if pitch < 6 or np.mean(np.abs(d / pitch - np.round(d / pitch)) < 0.2) < 0.75:
        return mask, None
    out = m.copy()
    for g in groups:
        if g.size <= 6:
            # sólo se borra donde la recta no tiene más tinta encima o debajo (cruces con el dibujo)
            y0, y1 = max(0, g.min() - 2), min(m.shape[0], g.max() + 3)
            alone = (m[max(0, y0 - 3)] == 0) & (m[min(m.shape[0] - 1, y1 + 2)] == 0)
            out[g.min() : g.max() + 1][:, alone] = 0
    return (out if horizontal else cv2.transpose(out)), pitch


def ink_mask(gray: np.ndarray, sensitivity: float = 0.5) -> dict:
    """Separa tinta de papel; la cuadrícula tenue queda bajo el umbral Otsu de la oscuridad."""
    dark = 255 - gray
    vals = dark[dark > 18]
    if vals.size < 200:
        return {"mask": np.zeros_like(gray), "grid": None, "threshold": 0}
    otsu, _ = cv2.threshold(vals.reshape(-1, 1), 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
    thr = float(max(26.0, otsu * (1.35 - 0.7 * float(sensitivity))))
    mask = (dark > thr).astype(np.uint8) * 255
    mask, ph = _remove_periodic_grid(mask, True)
    mask, pv = _remove_periodic_grid(mask, False)
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask, connectivity=8)
    small = np.where(st[:, cv2.CC_STAT_AREA] < 10)[0]
    if small.size:
        mask[np.isin(lab, small)] = 0
    return {"mask": mask, "grid": ph or pv, "threshold": thr}
