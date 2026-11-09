"""Pipeline: imagen preparada -> documento de plano (entidades en unidades reales + confianza)."""
from __future__ import annotations

import math
import uuid
from dataclasses import replace

import cv2
import numpy as np

from . import ocr as ocr_mod
from .detectors import load_external
from .preprocess import ink_mask
from .textparse import parse_text
from .vision import (
    Seg,
    extract_orth,
    find_curves,
    find_diagonals,
    find_solids,
    find_stairs,
    group_dashed,
    merge_collinear,
    merge_double_lines,
    stroke_width,
)

LAYER_OF = {
    "ref": "00_REFERENCIA", "wall": "01_MUROS", "partition": "02_DIVISIONES", "door": "03_PUERTAS",
    "window": "04_VENTANAS", "column": "05_COLUMNAS", "dimension": "06_COTAS", "text": "07_TEXTOS",
    "axis": "08_EJES", "other": "09_OTROS",
}
SCALE_TOL = 0.25   # desviación máxima dibujo/cota aceptable en un croquis a mano
CONFLICT_TOL = 0.02  # metros


def status_of(conf: float) -> str:
    return "high" if conf >= 0.8 else "uncertain" if conf >= 0.5 else "manual"


def _new_id() -> str:
    return uuid.uuid4().hex[:8]


class Axes:
    """Rectas estructurales agrupadas (x de verticales, y de horizontales)."""

    def __init__(self, segs: list[Seg], tol: float):
        pool = sorted(segs, key=lambda s: s.pos)
        groups: list[list[Seg]] = []
        for s in pool:
            if groups:
                m = sum(g.pos * g.length for g in groups[-1]) / sum(g.length for g in groups[-1])
                if s.pos - m <= tol:
                    groups[-1].append(s)
                    continue
            groups.append([s])
        self.pos = [sum(g.pos * g.length for g in c) / sum(g.length for g in c) for c in groups]
        self.ranges = [(min(g.lo for g in c), max(g.hi for g in c)) for c in groups]
        self.members = groups

    def nearest(self, v: float) -> int:
        return int(np.argmin([abs(p - v) for p in self.pos]))

    def snap_end(self, v: float, at: float, tol: float) -> tuple[float, bool]:
        best, bd = None, tol
        for p, (lo, hi) in zip(self.pos, self.ranges):
            d = abs(p - v)
            if d <= bd and lo - tol <= at <= hi + tol:
                best, bd = p, d
        return (best, True) if best is not None else (v, False)


def _pt_seg_dist(px: float, py: float, s: Seg) -> float:
    dx, dy = s.x1 - s.x0, s.y1 - s.y0
    t = max(0.0, min(1.0, ((px - s.x0) * dx + (py - s.y0) * dy) / max(dx * dx + dy * dy, 1e-9)))
    return math.hypot(px - (s.x0 + t * dx), py - (s.y0 + t * dy))


def _largest_structure(segs: list[Seg], tol: float) -> tuple[list[Seg], list[Seg]]:
    n = len(segs)
    if not n:
        return [], []
    par = list(range(n))

    def find(a: int) -> int:
        while par[a] != a:
            par[a] = par[par[a]]
            a = par[a]
        return a

    for i, a in enumerate(segs):
        for j in range(i + 1, n):
            b = segs[j]
            if min(_pt_seg_dist(a.x0, a.y0, b), _pt_seg_dist(a.x1, a.y1, b), _pt_seg_dist(b.x0, b.y0, a), _pt_seg_dist(b.x1, b.y1, a)) <= tol:
                par[find(i)] = find(j)
    total: dict[int, float] = {}
    for i, s in enumerate(segs):
        total[find(i)] = total.get(find(i), 0.0) + s.length
    root = max(total, key=total.get)
    return [s for i, s in enumerate(segs) if find(i) == root], [s for i, s in enumerate(segs) if find(i) != root]


def _solve_axis(px: list[float], s: float, dims: list[dict]) -> np.ndarray:
    """Mínimos cuadrados: las cotas mandan; los tramos sin cota conservan la proporción del dibujo."""
    n = len(px)
    rows, rhs = [], []
    r = np.zeros(n); r[0] = 100.0
    rows.append(r); rhs.append(0.0)
    for k in range(n - 1):
        r = np.zeros(n); r[k + 1], r[k] = 0.03, -0.03
        rows.append(r); rhs.append(0.03 * s * (px[k + 1] - px[k]))
    for d in dims:
        r = np.zeros(n); r[d["j"]], r[d["i"]] = 10.0, -10.0
        rows.append(r); rhs.append(10.0 * d["m"])
    return np.linalg.lstsq(np.array(rows), np.array(rhs), rcond=None)[0]


def _span_candidates(t: dict, axes: Axes, other: Axes, axis: str, L: float, dimlines: list[Seg], w: float) -> list[dict]:
    """Tramos (i, j) a los que una cota aislada podría referirse."""
    cx, cy = t["cx"], t["cy"]
    along, across = (cx, cy) if axis == "x" else (cy, cx)
    reach = 0.11 * L
    out: list[dict] = []
    for s in dimlines:
        if s.orient != ("h" if axis == "x" else "v"):
            continue
        d = abs(s.pos - across)
        if d <= 0.05 * L and s.lo - 0.02 * L <= along <= s.hi + 0.02 * L:
            i, j = axes.nearest(s.lo), axes.nearest(s.hi)
            if i != j and abs(axes.pos[i] - s.lo) < 0.05 * L and abs(axes.pos[j] - s.hi) < 0.05 * L:
                out.append({"axis": axis, "i": min(i, j), "j": max(i, j), "q": 1.5 * w, "dimline": s})
    for k, p in enumerate(other.pos):
        d = abs(p - across)
        lo, hi = other.ranges[k]
        if d > reach or not (lo - 0.02 * L <= along <= hi + 0.02 * L):
            continue
        idx = [m for m, q in enumerate(axes.pos) if lo - 0.02 * L <= q <= hi + 0.02 * L]
        for a in range(len(idx)):
            for b in range(a + 1, len(idx)):
                i, j = idx[a], idx[b]
                if axes.pos[i] - 0.02 * L <= along <= axes.pos[j] + 0.02 * L:
                    out.append({"axis": axis, "i": i, "j": j, "q": w * (1 - 0.6 * d / reach), "line": k})
    return out


def _vote_scale(texts: list[dict]) -> tuple[float | None, int]:
    """Escala m/px con mayor apoyo entre todas las hipótesis cota↔tramo (robusto a lecturas erróneas)."""
    hyp = [c["r"] for t in texts for c in t["cands"]]
    if not hyp:
        return None, 0
    best, bs, sup = None, -1.0, 0
    for r in hyp:
        score, cnt = 0.0, 0
        for t in texts:
            m = max((c["q"] * math.exp(-((math.log(c["r"] / r) / 0.1) ** 2)) for c in t["cands"]), default=0.0)
            score += m
            cnt += int(m > 0.3)
        if score > bs:
            best, bs, sup = r, score, cnt
    near = [c["r"] for t in texts for c in t["cands"] if abs(c["r"] / best - 1) < 0.12]
    return float(np.median(near)), sup


def analyze(prep: dict, meta: dict, opts: dict) -> dict:
    gray = prep["gray"]
    H, W = gray.shape
    default_unit = opts.get("units", "m")
    wall_t = float(opts.get("wall_thickness", 0.15))
    part_t = float(opts.get("partition_thickness", 0.10))
    log = list(prep["log"])
    warnings: list[dict] = []

    def warn(level: str, code: str, msg: str, ids=None):
        warnings.append({"level": level, "code": code, "msg": msg, "ids": ids or []})

    ink = ink_mask(gray, float(opts.get("sensitivity", 0.5)))
    mask = ink["mask"]
    if ink["grid"]:
        log.append(f"Cuadrícula periódica retirada (paso ≈ {ink['grid']:.0f} px)")
    ys, xs = np.where(mask > 0)
    if xs.size < 200:
        raise ValueError("No se encontró dibujo en la imagen. Prueba con más sensibilidad o mejor contraste.")
    L = float(max(np.percentile(xs, 99.7) - np.percentile(xs, 0.3), np.percentile(ys, 99.7) - np.percentile(ys, 0.3)))
    sw = stroke_width(mask)
    log.append(f"Tinta segmentada (trazo ≈ {sw:.1f} px)")

    min_len = max(24, int(0.035 * L))
    long_min = max(60, int(0.09 * L))
    max_thick = max(sw * 3 + 6, 0.03 * L)

    hl, hm = extract_orth(mask, True, long_min, int(sw * 3), max_thick)
    vl, vm = extract_orth(mask, False, long_min, int(sw * 3), max_thick)
    long_mask = cv2.dilate(cv2.bitwise_or(hm, vm), np.ones((3, 3), np.uint8), iterations=max(1, int(sw / 2)))

    # OCR sobre tinta sin rectas largas ni cuadrícula: las líneas confunden al detector de texto
    ink_only = np.full_like(gray, 255)
    ink_only[mask > 0] = gray[mask > 0]
    ink_only[long_mask > 0] = 255
    texts_raw, ocr_err = ocr_mod.read_text(ink_only) if opts.get("ocr", True) else ([], None)
    if ocr_err:
        warn("error", "ocr", f"El OCR no está disponible ({ocr_err}). No se leerán cotas ni nombres: calibra manualmente.")
    texts: list[dict] = []
    text_mask = np.zeros_like(gray)
    for t in texts_raw:
        if t["score"] < 0.45:
            continue
        p = parse_text(t["text"], default_unit)
        x0, y0, x1, y1 = t["rect"]
        pad = int(sw)
        cv2.rectangle(text_mask, (int(x0) - pad, int(y0) - pad), (int(x1) + pad, int(y1) + pad), 255, -1)
        texts.append({**p, "score": t["score"], "rect": t["rect"], "rotated": t["rotated"], "cx": (x0 + x1) / 2, "cy": (y0 + y1) / 2, "h": min(x1 - x0, y1 - y0)})
    log.append(f"OCR: {len(texts)} textos leídos")

    # curvas: lo que queda sin rectas largas ni texto
    resid = cv2.bitwise_and(mask, cv2.bitwise_not(cv2.bitwise_or(long_mask, text_mask)))
    curves = find_curves(resid, L)
    curve_mask = np.zeros_like(gray)
    for c in curves:
        steps = np.radians(np.linspace(c["a0"], c["a0"] + c["sweep"], max(8, int(c["sweep"] / 4))))
        pts = np.c_[c["cx"] + c["r"] * np.cos(steps), c["cy"] + c["r"] * np.sin(steps)].astype(np.int32)
        cv2.polylines(curve_mask, [pts], False, 255, int(sw * 2.5) + 5)

    keep = cv2.bitwise_and(mask, cv2.bitwise_not(cv2.bitwise_or(text_mask, curve_mask)))
    final = cv2.bitwise_or(keep, cv2.bitwise_and(mask, cv2.bitwise_and(cv2.bitwise_or(hm, vm), cv2.bitwise_not(curve_mask))))
    hs, hm2 = extract_orth(final, True, min_len, int(sw * 2), max_thick)
    vs, vm2 = extract_orth(final, False, min_len, int(sw * 2), max_thick)

    tol = max(6.0, 0.006 * L)
    segs = merge_collinear(hs + vs, tol, sw * 2)
    dashed, segs = group_dashed(segs, tol, L)
    segs = merge_collinear(segs, tol, max(sw * 3, 0.012 * L))
    stairs, segs = find_stairs(segs, L)
    segs = merge_double_lines(segs, tol, 0.024 * L)

    orth_mask = cv2.dilate(cv2.bitwise_or(hm2, vm2), np.ones((3, 3), np.uint8), iterations=max(1, int(sw)))
    diag_src = cv2.bitwise_and(final, cv2.bitwise_not(orth_mask))
    diagonals = find_diagonals(diag_src, max(40, int(0.06 * L)))
    solids = find_solids(mask, sw, L, cv2.bitwise_or(text_mask, curve_mask))
    external = load_external().detect(gray, mask, L)
    log.append(f"Geometría: {len(segs)} rectas, {len(curves)} curvas, {len(diagonals)} diagonales")

    # hojas de puerta: recta corta que nace del centro de un arco
    arcs = [c for c in curves if c["kind"] == "arc" and 55 <= c["sweep"] <= 135]
    for c in arcs:
        c["leaf"] = None
        for s in segs:
            for ex, ey, fx, fy in ((s.x0, s.y0, s.x1, s.y1), (s.x1, s.y1, s.x0, s.y0)):
                # desde 0,45 r: un texto cercano puede tapar el final de la hoja
                if math.hypot(ex - c["cx"], ey - c["cy"]) <= 0.3 * c["r"] and 0.45 * c["r"] <= s.length <= 1.3 * c["r"]:
                    c["leaf"] = (s, fx, fy)
                    break
            if c["leaf"]:
                break
    leaf_ids = {id(c["leaf"][0]) for c in arcs if c["leaf"]}
    segs = [s for s in segs if id(s) not in leaf_ids]

    structure, loose = _largest_structure(segs, max(sw * 2.5, 0.016 * L))
    if not structure:
        raise ValueError("No se reconocieron líneas rectas suficientes para reconstruir un plano.")

    snap_tol = max(8.0, 0.012 * L)
    vert = [s for s in structure if s.orient == "v"]
    horiz = [s for s in structure if s.orient == "h"]
    if not vert or not horiz:
        raise ValueError("El dibujo no tiene muros en las dos direcciones; no se puede cerrar un plano.")
    X, Y = Axes(vert, snap_tol), Axes(horiz, snap_tol)

    end_tol = max(10.0, 0.022 * L)
    snapped: list[Seg] = []
    for s in structure:
        if s.orient == "h":
            p = Y.pos[Y.nearest(s.pos)]
            a, oa = X.snap_end(s.lo, p, end_tol)
            b, ob = X.snap_end(s.hi, p, end_tol)
            n = replace(s, x0=a, x1=b, y0=p, y1=p)
        else:
            p = X.pos[X.nearest(s.pos)]
            a, oa = Y.snap_end(s.lo, p, end_tol)
            b, ob = Y.snap_end(s.hi, p, end_tol)
            n = replace(s, x0=p, x1=p, y0=a, y1=b)
        n.tag = {"a_ok": oa, "b_ok": ob}
        snapped.append(n)

    # puertas: dirección del muro y hueco
    doors: list[dict] = []
    for c in arcs:
        ends = [c["a0"], (c["a0"] + c["sweep"]) % 360]
        ends = [round(a / 90) * 90 % 360 if min(a % 90, 90 - a % 90) <= 22 else a for a in ends]
        if c["leaf"]:
            _, fx, fy = c["leaf"]
            la = math.degrees(math.atan2(fy - c["cy"], fx - c["cx"])) % 360
            la = round(la / 90) * 90 % 360
            def cdiff(u, v):
                return abs((u - v + 180) % 360 - 180)
            leaf_a = min(ends, key=lambda e: cdiff(e, la))
            open_a = ends[1] if leaf_a == ends[0] else ends[0]
        else:
            # sin hoja: el extremo alineado con un muro es el lado del hueco
            def on_wall(a):
                ex, ey = c["cx"] + c["r"] * math.cos(math.radians(a)), c["cy"] + c["r"] * math.sin(math.radians(a))
                return min(_pt_seg_dist(ex, ey, s) for s in snapped)
            open_a = min(ends, key=on_wall)
            leaf_a = ends[1] if open_a == ends[0] else ends[0]
        ca, sa = math.cos(math.radians(open_a)), math.sin(math.radians(open_a))
        hx, hy = c["cx"], c["cy"]
        wall_or = "h" if abs(ca) > abs(sa) else "v"
        wall_near = None
        if wall_or == "h":
            k = Y.nearest(hy)
            if abs(Y.pos[k] - hy) <= end_tol * 1.5:
                hy, wall_near = Y.pos[k], ("y", k)
        else:
            k = X.nearest(hx)
            if abs(X.pos[k] - hx) <= end_tol * 1.5:
                hx, wall_near = X.pos[k], ("x", k)
        conf = 0.5 * c["fit"] + 0.2 * (1 - min(1.0, abs(c["sweep"] - 90) / 45)) + (0.2 if wall_near else 0.0) + (0.1 if c["leaf"] else 0.0)
        doors.append({"hinge": (hx, hy), "r": c["r"], "open_a": open_a, "leaf_a": leaf_a, "conf": float(np.clip(conf, 0.2, 0.97)), "wall": wall_near, "wall_or": wall_or, "curve": c})

    # el hueco de cada puerta interrumpe el muro
    def cut(seglist: list[Seg], or_: str, pos: float, lo: float, hi: float) -> list[Seg]:
        out: list[Seg] = []
        for s in seglist:
            if s.orient != or_ or abs(s.pos - pos) > 2 or s.hi <= lo or s.lo >= hi:
                out.append(s)
                continue
            if s.lo < lo - 2:
                a = replace(s, x1=lo) if or_ == "h" else replace(s, y1=lo)
                a.tag = {**s.tag, "b_ok": True}
                out.append(a)
            if s.hi > hi + 2:
                b = replace(s, x0=hi) if or_ == "h" else replace(s, y0=hi)
                b.tag = {**s.tag, "a_ok": True}
                out.append(b)
        return out

    for d in doors:
        if d["wall"]:
            hx, hy = d["hinge"]
            ca, sa = math.cos(math.radians(d["open_a"])), math.sin(math.radians(d["open_a"]))
            ex, ey = hx + d["r"] * ca, hy + d["r"] * sa
            if d["wall_or"] == "h":
                snapped = cut(snapped, "h", hy, min(hx, ex), max(hx, ex))
            else:
                snapped = cut(snapped, "v", hx, min(hy, ey), max(hy, ey))

    # ventana: tramo a doble línea entre muros de línea simple sobre el mismo eje
    has_single_walls = any(not s.double for s in snapped)
    windows = [s for s in snapped if s.double and s.length < 0.5 * L] if has_single_walls else []
    window_ids = {id(s) for s in windows}

    # huecos entre tramos colineales: para cerrar ambientes y proponer accesos
    canvas = np.zeros_like(gray)
    for s in snapped:
        cv2.line(canvas, (int(s.x0), int(s.y0)), (int(s.x1), int(s.y1)), 255, 5)
    gaps: list[dict] = []
    for axes_obj, or_ in ((Y, "h"), (X, "v")):
        for pos in axes_obj.pos:
            on = sorted([s for s in snapped if s.orient == or_ and abs(s.pos - pos) <= 2], key=lambda s: s.lo)
            for a, b in zip(on, on[1:]):
                g = b.lo - a.hi
                if g <= 2 or g > 0.3 * L:
                    continue
                door_here = any(
                    d["wall_or"] == or_ and d["wall"] and
                    abs((d["hinge"][1] if or_ == "h" else d["hinge"][0]) - pos) <= 2 and
                    (d["hinge"][0] if or_ == "h" else d["hinge"][1]) >= a.hi - end_tol and
                    (d["hinge"][0] if or_ == "h" else d["hinge"][1]) <= b.lo + end_tol
                    for d in doors
                )
                free = not a.tag.get("b_ok") or not b.tag.get("a_ok")
                if door_here or free:
                    if or_ == "h":
                        cv2.line(canvas, (int(a.hi), int(pos)), (int(b.lo), int(pos)), 255, 5)
                    else:
                        cv2.line(canvas, (int(pos), int(a.hi)), (int(pos), int(b.lo)), 255, 5)
                    if not door_here:
                        gaps.append({"or": or_, "pos": pos, "lo": a.hi, "hi": b.lo})

    # ambientes: regiones cerradas por los muros
    n, lab, st, cen = cv2.connectedComponentsWithStats(cv2.bitwise_not(canvas), connectivity=4)
    rooms: list[dict] = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if x == 0 or y == 0 or x + w >= W or y + h >= H:
            continue
        if area < 0.004 * L * L or min(w, h) < 0.06 * L:
            continue
        cnts, _ = cv2.findContours((lab == i).astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        ap = cv2.approxPolyDP(max(cnts, key=cv2.contourArea), 0.012 * L, True).reshape(-1, 2).astype(float)
        poly = _clean_poly([(X.pos[X.nearest(p[0])], Y.pos[Y.nearest(p[1])]) for p in ap])
        rooms.append({"label": i, "poly": poly, "bbox": (x, y, x + w, y + h), "name": None, "rect": area / (w * h) >= 0.88, "rid": _new_id()})

    perim = None
    if rooms:
        # el contorno exterior sale de los muros: un ambiente mal cerrado no debe encoger el perímetro
        closed_canvas = cv2.morphologyEx(canvas, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
        cnts, _ = cv2.findContours(closed_canvas, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        ap = cv2.approxPolyDP(max(cnts, key=cv2.contourArea), 0.012 * L, True).reshape(-1, 2).astype(float)
        perim = _clean_poly([(X.pos[X.nearest(q[0])], Y.pos[Y.nearest(q[1])]) for q in ap])
    else:
        warn("warn", "open", "No se pudo cerrar ningún ambiente: revisa contornos abiertos y usa «Cerrar contorno».")

    # tramos que sobresalen del perímetro (prolongaciones de cota)
    if perim:
        pa = np.array(perim, np.float32)
        bx0, by0, bx1, by1 = pa[:, 0].min(), pa[:, 1].min(), pa[:, 0].max(), pa[:, 1].max()
        for s in snapped:
            lo_b, hi_b = (float(bx0), float(bx1)) if s.orient == "h" else (float(by0), float(by1))
            if s.hi <= lo_b or s.lo >= hi_b:
                continue  # totalmente fuera: no se recorta, se evalúa como elemento aparte
            if s.orient == "h":
                s.x0, s.x1 = max(s.x0, lo_b), min(s.x1, hi_b)
            else:
                s.y0, s.y1 = max(s.y0, lo_b), min(s.y1, hi_b)
        snapped = [s for s in snapped if s.length > 2]

    # ---- texto: nombres de ambiente y candidatos de cota ----
    for t in texts:
        ix, iy = int(np.clip(t["cx"], 0, W - 1)), int(np.clip(t["cy"], 0, H - 1))
        t["room"] = next((r for r in rooms if r["label"] == lab[iy, ix]), None)
        if t["room"] is None:
            for r in rooms:  # el recuadro puede caer sobre un muro; se admite por la caja del ambiente
                b = r["bbox"]
                if b[0] <= t["cx"] <= b[2] and b[1] <= t["cy"] <= b[3]:
                    t["room"] = r
                    break

    dim_texts: list[dict] = []
    def cand_ratio(c: dict, m: float, ax: Axes) -> dict:
        return {**c, "m": m, "px": ax.pos[c["j"]] - ax.pos[c["i"]], "r": m / (ax.pos[c["j"]] - ax.pos[c["i"]])}

    for t in texts:
        if t["role"] == "dim":
            cands: list[dict] = []
            hint = t.get("hint")
            if hint == "ancho" and len(X.pos) > 1:
                cands.append(cand_ratio({"axis": "x", "i": 0, "j": len(X.pos) - 1, "q": 2.0}, t["value_m"], X))
            elif hint in ("largo", "fondo", "alto") and len(Y.pos) > 1:
                cands.append(cand_ratio({"axis": "y", "i": 0, "j": len(Y.pos) - 1, "q": 2.0}, t["value_m"], Y))
            else:
                wx, wy = (0.2, 1.0) if t["rotated"] else (1.0, 0.7)
                for c in _span_candidates(t, X, Y, "x", L, loose, wx):
                    cands.append(cand_ratio(c, t["value_m"], X))
                for c in _span_candidates(t, Y, X, "y", L, loose, wy):
                    cands.append(cand_ratio(c, t["value_m"], Y))
            t["cands"] = cands
            dim_texts.append(t)
        elif t["role"] == "dim_pair":
            r = t["room"]
            # la cota de un ambiente también puede estar en una línea aparte del nombre
            if r is None or not r["rect"]:
                t["cands"] = []
                dim_texts.append(t)
                continue
            b = r["bbox"]
            ix0, ix1 = X.nearest(b[0]), X.nearest(b[2])
            iy0, iy1 = Y.nearest(b[1]), Y.nearest(b[3])
            t["room_span"] = (ix0, ix1, iy0, iy1)
            cands = []
            if ix0 != ix1:
                cands += [cand_ratio({"axis": "x", "i": ix0, "j": ix1, "q": 1.2, "which": w}, t[w + "_m"], X) for w in ("a", "b")]
            if iy0 != iy1:
                cands += [cand_ratio({"axis": "y", "i": iy0, "j": iy1, "q": 1.2, "which": w}, t[w + "_m"], Y) for w in ("a", "b")]
            t["cands"] = cands
            dim_texts.append(t)

    # ---- escala ----
    s_vote, support = _vote_scale([t for t in dim_texts if t.get("cands")])
    scale = {"known": False, "m_per_px": None, "source": None, "support": support}
    if s_vote:
        scale.update(known=True, m_per_px=s_vote, source="cotas")
        log.append(f"Escala estimada por {support} cota(s): 1 px = {s_vote * 1000:.2f} mm")
        if support == 1:
            warn("warn", "one_dim", "La escala se apoya en una sola cota: confírmala antes de exportar.")
    scale_note = next((t for t in texts if t["role"] == "scale"), None)
    if scale_note and meta.get("dpi"):
        s_doc = scale_note["scale_den"] * 0.0254 / meta["dpi"]
        if not s_vote:
            scale.update(known=True, m_per_px=s_doc, source=f"escala 1:{scale_note['scale_den']} del PDF")
            s_vote = s_doc
        elif abs(s_doc / s_vote - 1) > 0.05:
            warn("warn", "scale_conflict", f"La escala escrita 1:{scale_note['scale_den']} no coincide con las cotas.")
    elif scale_note:
        warn("info", "scale_note", f"Se leyó la escala 1:{scale_note['scale_den']}, pero una foto no conserva el tamaño físico del papel: no se puede usar sola.")
    if not s_vote:
        warn("error", "no_scale", "No hay cotas utilizables. Selecciona una línea con la herramienta Calibrar e indica su medida real.")

    s = s_vote or 1.0

    # ---- asignación cota ↔ tramo ----
    x_dims: list[dict] = []
    y_dims: list[dict] = []
    dim_records: list[dict] = []
    used_dimlines: set[int] = set()

    def pick(t: dict, cands: list[dict]) -> tuple[dict | None, float]:
        if not cands:
            return None, 1.0
        best = max(cands, key=lambda c: c["q"] * math.exp(-((math.log(c["r"] / s) / 0.1) ** 2)))
        return best, abs(best["r"] / s - 1)

    for t in dim_texts:
        if t["role"] == "dim":
            c, err = pick(t, t["cands"])
            if c is None:
                dim_records.append({"t": t, "c": None, "err": None, "m": t["value_m"], "applied": False})
                continue
            rec = {"t": t, "c": c, "err": err, "m": t["value_m"], "applied": bool(scale["known"] and err <= SCALE_TOL)}
            dim_records.append(rec)
            if c.get("dimline") is not None:
                used_dimlines.add(id(c["dimline"]))
            if rec["applied"]:
                (x_dims if c["axis"] == "x" else y_dims).append({"i": c["i"], "j": c["j"], "m": c["m"], "rec": rec})
        else:
            cs = t.get("cands") or []
            if not cs:
                dim_records.append({"t": t, "c": None, "err": None, "m": t["a_m"], "pair_part": "a", "applied": False})
                dim_records.append({"t": t, "c": None, "err": None, "m": t["b_m"], "pair_part": "b", "applied": False})
                continue
            best_o, best_e = None, 1e9
            for wx_, wy_ in (("a", "b"), ("b", "a")):
                cx_ = next((c for c in cs if c["axis"] == "x" and c["which"] == wx_), None)
                cy_ = next((c for c in cs if c["axis"] == "y" and c["which"] == wy_), None)
                if cx_ is None or cy_ is None:
                    continue
                e = abs(cx_["r"] / s - 1) + abs(cy_["r"] / s - 1)
                if e < best_e:
                    best_o, best_e = (cx_, cy_), e
            if best_o is None:
                dim_records.append({"t": t, "c": None, "err": None, "m": t["a_m"], "pair_part": "a", "applied": False})
                dim_records.append({"t": t, "c": None, "err": None, "m": t["b_m"], "pair_part": "b", "applied": False})
                continue
            for c in best_o:
                err = abs(c["r"] / s - 1)
                rec = {"t": t, "c": c, "err": err, "m": c["m"], "pair_part": c["which"], "applied": bool(scale["known"] and err <= SCALE_TOL)}
                dim_records.append(rec)
                if rec["applied"]:
                    (x_dims if c["axis"] == "x" else y_dims).append({"i": c["i"], "j": c["j"], "m": c["m"], "rec": rec})

    def solve(px: list[float], dims: list[dict]) -> np.ndarray:
        active = list(dims)
        sol = _solve_axis(px, s, active)
        while scale["known"] and active:
            res = [abs((sol[d["j"]] - sol[d["i"]]) - d["m"]) for d in active]
            worst = int(np.argmax(res))
            if res[worst] <= CONFLICT_TOL:
                break
            # se retira sólo la peor y se recalcula: una lectura errónea no arrastra a las cotas correctas
            d = active.pop(worst)
            d["rec"]["applied"] = False
            d["rec"]["conflict"] = True
            sol = _solve_axis(px, s, active)
        if np.any(np.diff(sol) <= 0):
            warn("error", "order", "Las cotas invierten el orden de las líneas del dibujo; se conservó la escala uniforme.")
            for d in dims:
                d["rec"]["applied"] = False
            sol = _solve_axis(px, s, [])
        return sol

    sol_x = solve(X.pos, x_dims) if len(X.pos) > 1 else np.zeros(1)
    sol_y = solve(Y.pos, y_dims) if len(Y.pos) > 1 else np.zeros(1)
    top_y = float(sol_y[-1])

    def wx(v: float) -> float:
        xs_ = X.pos
        if v <= xs_[0]:
            return float(sol_x[0] + (v - xs_[0]) * s)
        if v >= xs_[-1]:
            return float(sol_x[-1] + (v - xs_[-1]) * s)
        return float(np.interp(v, xs_, sol_x))

    def wy(v: float) -> float:
        ys_ = Y.pos
        if v <= ys_[0]:
            return top_y - float(sol_y[0] + (v - ys_[0]) * s)
        if v >= ys_[-1]:
            return top_y - float(sol_y[-1] + (v - ys_[-1]) * s)
        return top_y - float(np.interp(v, ys_, sol_y))

    def w(p: tuple[float, float]) -> list[float]:
        return [round(wx(p[0]), 4), round(wy(p[1]), 4)]

    ents: list[dict] = []

    def add(type_: str, layer_key: str, geom: dict, px: list, conf: float, **kw) -> dict:
        e = {"id": _new_id(), "type": type_, "layer": LAYER_OF[layer_key], "geom": geom, "px": px, "conf": round(float(conf), 3), "status": status_of(conf), "state": "pending", "source": "ia", **kw}
        ents.append(e)
        return e

    # ---- muros y divisiones ----
    thick_ref = float(np.median([x.thick for x in snapped])) if snapped else 3.0
    pa = np.array(perim, np.float32).reshape(-1, 1, 2) if perim else None

    def is_exterior(g: Seg) -> bool:
        if pa is not None:
            return abs(cv2.pointPolygonTest(pa, ((g.x0 + g.x1) / 2, (g.y0 + g.y1) / 2), True)) <= snap_tol
        return g.pos in (Y.pos[0], Y.pos[-1], X.pos[0], X.pos[-1])

    for g in snapped:
        if id(g) in window_ids:
            continue
        ext = is_exterior(g) or g.thick >= 1.7 * thick_ref
        conf = g.conf
        if not g.tag.get("a_ok") or not g.tag.get("b_ok"):
            conf *= 0.82
        key = "wall" if ext else "partition"
        add(key, key, {"kind": "line", "a": w((g.x0, g.y0)), "b": w((g.x1, g.y1)), "width": wall_t if ext else part_t}, [[[g.x0, g.y0], [g.x1, g.y1]]], conf)

    # ---- ventanas / puertas / accesos ----
    for g in windows:
        add("window", "window", {"kind": "window", "a": w((g.x0, g.y0)), "b": w((g.x1, g.y1)), "depth": wall_t}, [[[g.x0, g.y0], [g.x1, g.y1]]], min(0.72, g.conf))

    for d in doors:
        hx, hy = d["hinge"]
        r = d["r"]
        ca, sa = math.cos(math.radians(d["open_a"])), math.sin(math.radians(d["open_a"]))
        cl, sl = math.cos(math.radians(d["leaf_a"])), math.sin(math.radians(d["leaf_a"]))
        op = (hx + r * ca, hy + r * sa)
        lf = (hx + r * cl, hy + r * sl)
        c = d["curve"]
        st_ = np.radians(np.linspace(c["a0"], c["a0"] + c["sweep"], 24))
        arc = [[float(c["cx"] + c["r"] * np.cos(a)), float(c["cy"] + c["r"] * np.sin(a))] for a in st_]
        add("door", "door", {"kind": "door", "hinge": w((hx, hy)), "open": w(op), "leaf": w(lf)}, [arc, [[hx, hy], list(lf)]], d["conf"])

    for g in gaps:
        lo_hi = (g["hi"] - g["lo"]) * s if scale["known"] else None
        if scale["known"] and not 0.4 <= lo_hi <= 2.2:
            warn("warn", "gap", f"Hueco de {lo_hi:.2f} m en un muro, sin símbolo reconocido.")
            continue
        a_ = (g["lo"], g["pos"]) if g["or"] == "h" else (g["pos"], g["lo"])
        b_ = (g["hi"], g["pos"]) if g["or"] == "h" else (g["pos"], g["hi"])
        add("door", "door", {"kind": "access", "a": w(a_), "b": w(b_)}, [[list(a_), list(b_)]], 0.42, note="Hueco en el muro: ¿es un acceso?")

    # ---- otros símbolos ----
    for c in solids:
        hw, hh = c["w"] / 2, c["h"] / 2
        p0, p1 = w((c["cx"] - hw, c["cy"] + hh)), w((c["cx"] + hw, c["cy"] - hh))
        add("column", "column", {"kind": "rect", "a": p0, "b": p1}, [[[c["cx"] - hw, c["cy"] - hh], [c["cx"] + hw, c["cy"] - hh], [c["cx"] + hw, c["cy"] + hh], [c["cx"] - hw, c["cy"] + hh], [c["cx"] - hw, c["cy"] - hh]]], c["conf"])
    for st_g in stairs:
        treads = [[w((g.x0, g.y0)), w((g.x1, g.y1))] for g in st_g["segs"]]
        add("stair", "other", {"kind": "stair", "treads": treads}, [[[g.x0, g.y0], [g.x1, g.y1]] for g in st_g["segs"]], st_g["conf"])
    for c in curves:
        if c in arcs:
            continue
        steps = np.radians(np.linspace(c["a0"], c["a0"] + c["sweep"], 24))
        pts = [[float(c["cx"] + c["r"] * np.cos(a)), float(c["cy"] + c["r"] * np.sin(a))] for a in steps]
        if c["kind"] == "circle":
            add("other", "other", {"kind": "circle", "c": w((c["cx"], c["cy"])), "r": round(c["r"] * s, 4)}, [pts], 0.5 + 0.3 * c["fit"])
        else:
            add("other", "other", {"kind": "polyline", "pts": [w((p[0], p[1])) for p in pts[::3]], "closed": False}, [pts], 0.45)
    for g in diagonals:
        add("other", "other", {"kind": "line", "a": w((g.x0, g.y0)), "b": w((g.x1, g.y1))}, [[[g.x0, g.y0], [g.x1, g.y1]]], 0.6, subtype="diagonal")
    for g in dashed:
        add("other", "other", {"kind": "line", "a": w((g.x0, g.y0)), "b": w((g.x1, g.y1)), "dashed": True}, [[[g.x0, g.y0], [g.x1, g.y1]]], 0.55, subtype="viga/eje discontinuo", note="Línea discontinua: posible viga o eje.")
    for sym in external:
        x0, y0, x1, y1 = sym["bbox"]
        add("other", "other", {"kind": "rect", "a": w((x0, y1)), "b": w((x1, y0))}, [[[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]], float(sym["conf"]), subtype=sym["type"])

    # una línea exterior paralela a una cota aplicada, junto a su texto y del mismo largo, es su línea de cota
    for rec in dim_records:
        c = rec["c"]
        if c is None or not rec["applied"] or rec["t"]["role"] != "dim":
            continue
        ax_, or_ = (X, "h") if c["axis"] == "x" else (Y, "v")
        lo_, hi_ = ax_.pos[c["i"]], ax_.pos[c["j"]]
        across = rec["t"]["cy"] if or_ == "h" else rec["t"]["cx"]
        for g in loose:
            if g.orient == or_ and abs(g.pos - across) < 0.08 * L and min(g.hi, hi_) - max(g.lo, lo_) >= 0.8 * (hi_ - lo_):
                used_dimlines.add(id(g))

    # líneas sueltas fuera de la estructura: cotas ya usadas o elementos por decidir
    used_points = [g for g in loose if id(g) in used_dimlines]
    for g in loose:
        if id(g) in used_dimlines:
            continue
        if any(min(_pt_seg_dist(g.x0, g.y0, u), _pt_seg_dist(g.x1, g.y1, u)) < 0.03 * L for u in used_points):
            continue  # marca o prolongación de una línea de cota reconocida
        add("other", "other", {"kind": "line", "a": w((g.x0, g.y0)), "b": w((g.x1, g.y1))}, [[[g.x0, g.y0], [g.x1, g.y1]]], 0.35, note="Línea fuera del contorno principal.")

    # ---- contornos cerrados ----
    used_text: set[int] = set()
    for r in rooms:
        pts = [w(p) for p in r["poly"]]
        a = 0.5 * abs(sum(pts[k][0] * pts[(k + 1) % len(pts)][1] - pts[(k + 1) % len(pts)][0] * pts[k][1] for k in range(len(pts))))
        names = [t for t in texts if t["room"] is r and t["role"] == "room"] + [t for t in texts if t["room"] is r and t["role"] == "dim_pair" and t.get("name")]
        r["name"] = (names[0].get("name") or names[0]["text"]) if names else None
        px = [[list(p) for p in r["poly"]] + [list(r["poly"][0])]]
        add("contour", "ref", {"kind": "polyline", "pts": pts, "closed": True}, px, 0.85 if r["rect"] else 0.65, room=r["name"], area=round(a, 3) if scale["known"] else None)
    if perim:
        pts = [w(p) for p in perim]
        add("contour", "ref", {"kind": "polyline", "pts": pts, "closed": True}, [[list(p) for p in perim] + [list(perim[0])]], 0.9, room="Perímetro", perimeter=True)

    # ---- textos ----
    plan_span = max(float(sol_x[-1] - sol_x[0]), float(sol_y[-1] - sol_y[0]), 1e-6)
    txt_h = round(plan_span / 42, 3) if scale["known"] else round(plan_span / 42, 1)
    for t in texts:
        if t["role"] in ("dim", "dim_pair"):
            if t["role"] == "dim_pair" and t.get("name"):
                add("text", "text", {"kind": "text", "at": w((t["cx"], t["cy"])), "text": t["name"], "height": txt_h, "role": "room"}, [_rect_px(t)], t["score"], ocr=t["raw"])
            continue
        role = t["role"]
        if role == "room" and t["room"] is None:
            role = "note"
        add("text", "text", {"kind": "text", "at": w((t["cx"], t["cy"])), "text": t["text"], "height": txt_h, "role": role}, [_rect_px(t)], t["score"], ocr=t["raw"])

    # ---- cotas ----
    def label(rec: dict) -> str:
        t = rec["t"]
        if t["role"] == "dim":
            v = t["value"]
            return f"{v:g} {t['unit']}"
        v = t["a"] if rec.get("pair_part") == "a" else t["b"]
        return f"{v:g} {t['unit']}"

    for rec in dim_records:
        t, c = rec["t"], rec["c"]
        base_conf = t["score"] * (0.85 if t.get("unit_assumed") else 1.0) * (0.92 if t.get("corrected") else 1.0)
        txt = label(rec)
        if c is None:
            add("dimension", "dimension", {"kind": "note_dim", "at": w((t["cx"], t["cy"])), "text": txt, "height": txt_h, "value_m": rec["m"]}, [_rect_px(t)], 0.3, ocr=t["raw"], note="No se pudo relacionar esta cota con una línea del dibujo.", applied=False)
            warn("warn", "dim_unlinked", f"La cota «{t['raw']}» no se pudo asociar a ninguna línea.", [ents[-1]["id"]])
            continue
        axis_px = X if c["axis"] == "x" else Y
        pa_, pb_ = axis_px.pos[c["i"]], axis_px.pos[c["j"]]
        if c["axis"] == "x":
            a_w, b_w = float(sol_x[c["i"]]), float(sol_x[c["j"]])
            if t["role"] == "dim_pair":
                base = wy(Y.pos[t["room_span"][3]]) + 2.4 * txt_h  # cota del ambiente, despegada del muro
            else:
                base = wy(t["cy"])
            geom = {"kind": "dim", "axis": "x", "a": [round(a_w, 4), round(base, 4)], "b": [round(b_w, 4), round(base, 4)], "base": round(base, 4), "ref_a": [round(a_w, 4), round(top_y, 4)], "ref_b": [round(b_w, 4), round(top_y, 4)]}
            px = [[[pa_, t["cy"]], [pb_, t["cy"]]]]
        else:
            a_w, b_w = top_y - float(sol_y[c["j"]]), top_y - float(sol_y[c["i"]])
            if t["role"] == "dim_pair":
                base = wx(X.pos[t["room_span"][0]]) + 2.4 * txt_h
            else:
                base = wx(t["cx"])
            geom = {"kind": "dim", "axis": "y", "a": [round(base, 4), round(a_w, 4)], "b": [round(base, 4), round(b_w, 4)], "base": round(base, 4)}
            px = [[[t["cx"], pa_], [t["cx"], pb_]]]
        measured = abs(b_w - a_w) if scale["known"] else None
        geom.update(written_m=round(rec["m"], 4), written=txt, height=txt_h, measured_m=round(measured, 4) if measured is not None else None)
        err = rec["err"] or 0.0
        conf = base_conf * (1 - min(err, 0.5))
        if not rec["applied"]:
            conf = min(conf, 0.45)
        e = add("dimension", "dimension", geom, px + [_rect_px(t)], conf, ocr=t["raw"], applied=rec["applied"], drawn_error=round(err, 3))
        if rec.get("conflict"):
            e["note"] = "Contradice a otra cota sobre los mismos tramos."
            warn("error", "dim_conflict", f"La cota «{txt}» contradice a otras: no se aplicó. Corrígela o recházala.", [e["id"]])
        elif scale["known"] and not rec["applied"]:
            e["note"] = f"El dibujo no coincide con esta cota (desvío {err * 100:.0f} %)."
            warn("warn", "dim_mismatch", f"La cota «{txt}» no coincide con la geometría (desvío {err * 100:.0f} %): no se aplicó.", [e["id"]])

    # ---- ejes (derivados de muros existentes, sin líneas nuevas de construcción) ----
    if opts.get("axes", True) and scale["known"] and perim:
        ext = 0.05 * plan_span * 3
        x_lo, x_hi = float(sol_x[0]), float(sol_x[-1])
        y_lo, y_hi = top_y - float(sol_y[-1]), top_y - float(sol_y[0])
        for k, v in enumerate(sol_x):
            add("axis", "axis", {"kind": "axis", "a": [round(float(v), 4), round(y_lo - ext, 4)], "b": [round(float(v), 4), round(y_hi + ext, 4)], "label": chr(65 + k % 26), "height": txt_h}, [[[X.pos[k], Y.pos[0]], [X.pos[k], Y.pos[-1]]]], 1.0)
            ents[-1]["state"] = "confirmed"
            ents[-1]["source"] = "derivado"
        for k, v in enumerate(sol_y):
            yw = round(top_y - float(v), 4)
            add("axis", "axis", {"kind": "axis", "a": [round(x_lo - ext, 4), yw], "b": [round(x_hi + ext, 4), yw], "label": str(k + 1), "height": txt_h}, [[[X.pos[0], Y.pos[k]], [X.pos[-1], Y.pos[k]]]], 1.0)
            ents[-1]["state"] = "confirmed"
            ents[-1]["source"] = "derivado"

    if scale["known"]:
        for e in ents:
            if e["type"] == "dimension" and e.get("applied") and e["geom"].get("measured_m") is not None:
                if abs(e["geom"]["measured_m"] - e["geom"]["written_m"]) > CONFLICT_TOL:
                    e["applied"] = False
    # marco de la imagen en 00_REFERENCIA: permite ubicar el dibujo original sin insertar la foto
    add("ref", "ref", {"kind": "polyline", "pts": [w((0, H)), w((W, H)), w((W, 0)), w((0, 0))], "closed": True}, [[[0, 0], [W, 0], [W, H], [0, H], [0, 0]]], 1.0, note="Marco de la imagen original")
    ents[-1]["state"] = "confirmed"
    ents[-1]["source"] = "derivado"

    n_dims = sum(1 for e in ents if e["type"] == "dimension")
    n_rooms = sum(1 for e in ents if e["type"] == "contour" and not e.get("perimeter"))
    log.append(f"Reconstrucción: {n_rooms} ambientes, {n_dims} cotas, {len(ents)} entidades")
    if rooms and not any(r["name"] for r in rooms):
        warn("info", "no_names", "No se leyeron nombres de ambientes.")
    for r in rooms:
        if r["name"] is None:
            warn("info", "room_unnamed", "Hay un ambiente sin nombre legible; no se le asignó ninguno.")

    return {
        "version": 1,
        "image": {"w": W, "h": H},
        "units": "m" if scale["known"] else "px",
        "scale": scale,
        "params": {"wall_thickness": wall_t, "partition_thickness": part_t, "text_height": txt_h, "L": L},
        "entities": ents,
        "warnings": warnings,
        "log": log,
    }


def _clean_poly(poly: list[tuple[float, float]]) -> list[tuple[float, float]]:
    """Quita vértices repetidos y colineales que deja el ajuste a los ejes."""
    p = [q for k, q in enumerate(poly) if q != poly[k - 1]]
    changed = True
    while changed and len(p) > 3:
        changed = False
        for k in range(len(p)):
            a, b, c = p[k - 1], p[k], p[(k + 1) % len(p)]
            if abs((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0])) < 1e-6:
                del p[k]
                changed = True
                break
    return p


def _rect_px(t: dict) -> list:
    x0, y0, x1, y1 = t["rect"]
    return [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]]
