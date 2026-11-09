"""Detección geométrica con OpenCV: trazos rectos, arcos, sólidos y agrupaciones."""
from __future__ import annotations

from dataclasses import dataclass, field

import cv2
import numpy as np


@dataclass
class Seg:
    x0: float
    y0: float
    x1: float
    y1: float
    orient: str  # h | v | d
    thick: float = 3.0
    conf: float = 0.8
    double: bool = False
    tag: dict = field(default_factory=dict)

    @property
    def length(self) -> float:
        return float(np.hypot(self.x1 - self.x0, self.y1 - self.y0))

    @property
    def pos(self) -> float:
        return (self.y0 + self.y1) / 2 if self.orient == "h" else (self.x0 + self.x1) / 2

    @property
    def lo(self) -> float:
        return min(self.x0, self.x1) if self.orient == "h" else min(self.y0, self.y1)

    @property
    def hi(self) -> float:
        return max(self.x0, self.x1) if self.orient == "h" else max(self.y0, self.y1)


def stroke_width(mask: np.ndarray) -> float:
    dt = cv2.distanceTransform(mask, cv2.DIST_L2, 3)
    v = dt[dt > 0]
    return max(2.0, 2.0 * float(np.percentile(v, 80))) if v.size else 3.0


def extract_orth(mask: np.ndarray, horizontal: bool, min_len: int, gap: int, max_thick: float) -> tuple[list[Seg], np.ndarray]:
    """Trazos H o V tolerando el pulso de la mano (se engrosa 1 px antes de abrir con kernel largo)."""
    m = mask if horizontal else cv2.transpose(mask)
    fat = cv2.dilate(m, np.ones((3, 1), np.uint8))
    opened = cv2.morphologyEx(fat, cv2.MORPH_OPEN, np.ones((1, min_len), np.uint8))
    closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, np.ones((1, max(3, gap)), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(closed, connectivity=8)
    segs: list[Seg] = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if w < min_len or area / w > max_thick:
            continue
        ys, xs = np.where(lab[y : y + h, x : x + w] == i)
        xs, ys = xs + x, ys + y
        a, b = np.polyfit(xs, ys, 1) if np.ptp(xs) > 0 else (0.0, float(ys.mean()))
        rms = float(np.sqrt(np.mean((a * xs + b - ys) ** 2)))
        band_lo, band_hi = max(0, y - 2), min(m.shape[0], y + h + 2)
        cover = float(np.mean(m[band_lo:band_hi, x : x + w].max(0) > 0))
        conf = float(np.clip(0.55 + 0.45 * cover - 0.03 * max(0.0, rms - 2.5), 0.2, 0.99))
        x0, x1 = float(x), float(x + w - 1)
        y0, y1 = float(a * x0 + b), float(a * x1 + b)
        thick = float(area / w)
        if horizontal:
            segs.append(Seg(x0, y0, x1, y1, "h", thick, conf))
        else:
            segs.append(Seg(y0, x0, y1, x1, "v", thick, conf))
    return segs, (closed if horizontal else cv2.transpose(closed))


def merge_collinear(segs: list[Seg], tol: float, gap: float) -> list[Seg]:
    """Une pedazos del mismo trazo; los huecos mayores a `gap` se conservan (puertas)."""
    out: list[Seg] = []
    for o in ("h", "v"):
        pool = sorted([s for s in segs if s.orient == o], key=lambda s: s.pos)
        clusters: list[list[Seg]] = []
        for s in pool:
            if clusters and s.pos - np.mean([c.pos for c in clusters[-1]]) <= tol:
                clusters[-1].append(s)
            else:
                clusters.append([s])
        for c in clusters:
            c.sort(key=lambda s: s.lo)
            run = [c[0]]
            def flush(r: list[Seg]):
                L = sum(s.length for s in r)
                p = sum(s.pos * s.length for s in r) / L
                lo, hi = min(s.lo for s in r), max(s.hi for s in r)
                th = sum(s.thick * s.length for s in r) / L
                cf = sum(s.conf * s.length for s in r) / L
                out.append(Seg(lo, p, hi, p, "h", th, cf) if o == "h" else Seg(p, lo, p, hi, "v", th, cf))
            for s in c[1:]:
                if s.lo - max(r.hi for r in run) <= gap:
                    run.append(s)
                else:
                    flush(run)
                    run = [s]
            flush(run)
    return out


def merge_double_lines(segs: list[Seg], tol: float, max_sep: float) -> list[Seg]:
    """Dos líneas paralelas muy juntas son un muro (o ventana) dibujado a doble trazo: eje central."""
    segs = sorted(segs, key=lambda s: -s.length)
    used = [False] * len(segs)
    out: list[Seg] = []
    for i, a in enumerate(segs):
        if used[i]:
            continue
        used[i] = True
        for j in range(i + 1, len(segs)):
            b = segs[j]
            if used[j] or b.orient != a.orient:
                continue
            sep = abs(a.pos - b.pos)
            ov = min(a.hi, b.hi) - max(a.lo, b.lo)
            if tol < sep <= max_sep and ov >= 0.7 * min(a.length, b.length) and b.length >= 0.6 * a.length:
                used[j] = True
                p = (a.pos + b.pos) / 2
                lo, hi = min(a.lo, b.lo), max(a.hi, b.hi)
                cf = min(a.conf, b.conf)
                a = (Seg(lo, p, hi, p, "h", sep, cf, True) if a.orient == "h" else Seg(p, lo, p, hi, "v", sep, cf, True))
                break
        out.append(a)
    return out


def find_stairs(segs: list[Seg], L: float) -> tuple[list[dict], list[Seg]]:
    """Cuatro o más trazos cortos, paralelos y equiespaciados = huellas de escalera."""
    stairs: list[dict] = []
    consumed: set[int] = set()
    for o in ("h", "v"):
        pool = sorted([s for s in segs if s.orient == o and s.length < 0.3 * L], key=lambda s: s.pos)
        i = 0
        while i < len(pool):
            grp = [pool[i]]
            for s in pool[i + 1 :]:
                last = grp[-1]
                d = s.pos - last.pos
                ov = min(s.hi, last.hi) - max(s.lo, last.lo)
                if ov < 0.7 * min(s.length, last.length):
                    continue
                if d > 0.06 * L:
                    break
                if len(grp) == 1 or abs(d - (grp[-1].pos - grp[-2].pos)) < 0.35 * (grp[-1].pos - grp[-2].pos):
                    grp.append(s)
            if len(grp) >= 4:
                gaps = np.diff([g.pos for g in grp])
                cv = float(gaps.std() / gaps.mean())
                stairs.append({"segs": grp, "conf": float(np.clip(0.8 - cv, 0.35, 0.8)), "orient": o})
                consumed.update(id(g) for g in grp)
                i += len(grp)
            else:
                i += 1
    return stairs, [s for s in segs if id(s) not in consumed]


def _fit_circle(pts: np.ndarray) -> tuple[float, float, float]:
    x, y = pts[:, 0], pts[:, 1]
    A = np.c_[2 * x, 2 * y, np.ones_like(x)]
    b = x**2 + y**2
    c = np.linalg.lstsq(A, b, rcond=None)[0]
    return float(c[0]), float(c[1]), float(np.sqrt(max(c[2] + c[0] ** 2 + c[1] ** 2, 1e-6)))


def _robust_circle(pts: np.ndarray):
    """Ajuste iterativo: descarta outliers (p. ej. la hoja de la puerta unida al arco)."""
    keep = pts
    for _ in range(5):
        if len(keep) < 12:
            return None
        cx, cy, r = _fit_circle(keep)
        d = np.abs(np.hypot(pts[:, 0] - cx, pts[:, 1] - cy) - r)
        nxt = pts[d <= max(2.5, 2.2 * float(np.median(d)))]
        if len(nxt) == len(keep):
            break
        keep = nxt
    cx, cy, r = _fit_circle(keep)
    d = np.abs(np.hypot(pts[:, 0] - cx, pts[:, 1] - cy) - r)
    return cx, cy, r, float(np.sqrt(np.mean(d[d <= max(2.5, 2.2 * np.median(d))] ** 2))), len(keep) / len(pts), keep


def _sweep(cx: float, cy: float, pts: np.ndarray) -> tuple[float, float, float]:
    """Mayor arco continuo cubierto. Devuelve (inicio°, fin°, barrido°) con ángulos de imagen."""
    a = (np.degrees(np.arctan2(pts[:, 1] - cy, pts[:, 0] - cx)) + 360) % 360
    bins = np.zeros(72, bool)
    bins[(a // 5).astype(int) % 72] = True
    if bins.all():
        return 0.0, 360.0, 360.0
    start = int(np.where(~bins)[0][0])
    rolled = np.roll(bins, -start)
    best, bl, cur, cl = 0, 0, 0, 0
    for i, v in enumerate(rolled):
        if v:
            if cl == 0:
                cur = i
            cl += 1
            if cl > bl:
                best, bl = cur, cl
        else:
            cl = 0
    a0 = ((best + start) * 5) % 360
    return float(a0), float((a0 + bl * 5) % 360), float(bl * 5)


def find_curves(resid: np.ndarray, L: float) -> list[dict]:
    """Arcos y círculos en la tinta que no es recta larga ni texto."""
    n, lab, st, _ = cv2.connectedComponentsWithStats(resid, connectivity=8)
    out: list[dict] = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if max(w, h) < 0.025 * L or area < 40:
            continue
        ys, xs = np.where(lab[y : y + h, x : x + w] == i)
        pts = np.c_[xs + x, ys + y].astype(float)
        if len(pts) > 1500:
            pts = pts[np.linspace(0, len(pts) - 1, 1500).astype(int)]
        fit = _robust_circle(pts)
        if fit is None:
            continue
        cx, cy, r, rms, inl, keep = fit
        if not 0.018 * L <= r <= 0.22 * L or rms > max(3.5, 0.05 * r) or inl < 0.55:
            continue
        a0, a1, sw = _sweep(cx, cy, keep)
        if sw < 40:
            continue
        kind = "circle" if sw >= 300 else "arc"
        # un arco real ocupa área en sus dos ejes; los restos del pulso sobre un muro son tiras finas
        if kind == "arc" and (min(w, h) < 0.4 * r or r < 0.035 * L):
            continue
        out.append({"cx": cx, "cy": cy, "r": r, "a0": a0, "a1": a1, "sweep": sw, "rms": rms, "kind": kind, "label": i, "fit": float(np.clip(1 - rms / max(4.0, 0.08 * r), 0, 1)), "bbox": (x, y, x + w, y + h)})
    return out


def find_solids(mask: np.ndarray, sw: float, L: float, exclude: np.ndarray) -> list[dict]:
    """Bloques rellenos casi cuadrados: candidatos a columna."""
    k = int(sw * 1.5) | 1
    core = cv2.erode(mask, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
    core = cv2.dilate(core, cv2.getStructuringElement(cv2.MORPH_RECT, (k, k)))
    core[exclude > 0] = 0
    n, _, st, c = cv2.connectedComponentsWithStats(core, connectivity=8)
    out: list[dict] = []
    for i in range(1, n):
        x, y, w, h, area = st[i]
        if not (0.008 * L <= max(w, h) <= 0.06 * L) or not (0.6 <= w / h <= 1.67) or area / (w * h) < 0.72:
            continue
        out.append({"cx": float(c[i][0]), "cy": float(c[i][1]), "w": float(w), "h": float(h), "conf": float(np.clip(area / (w * h) - 0.1, 0.4, 0.85))})
    return out


def find_diagonals(resid: np.ndarray, min_len: int) -> list[Seg]:
    lines = cv2.HoughLinesP(resid, 1, np.pi / 360, 40, minLineLength=min_len, maxLineGap=6)
    if lines is None:
        return []
    raw = sorted(lines[:, 0].tolist(), key=lambda l: -np.hypot(l[2] - l[0], l[3] - l[1]))
    out: list[Seg] = []
    for x0, y0, x1, y1 in raw:
        ang = abs(np.degrees(np.arctan2(y1 - y0, x1 - x0))) % 90
        if ang < 8 or ang > 82:
            continue
        mx, my = (x0 + x1) / 2, (y0 + y1) / 2
        ax = np.arctan2(y1 - y0, x1 - x0)
        dup = False
        for s in out:
            bx = np.arctan2(s.y1 - s.y0, s.x1 - s.x0)
            d = abs(np.cos(bx) * (my - s.y0) - np.sin(bx) * (mx - s.x0))
            if abs(np.sin(ax - bx)) < 0.12 and d < 10:
                dup = True
                break
        if not dup:
            out.append(Seg(float(x0), float(y0), float(x1), float(y1), "d", 3.0, 0.55))
    return out[:60]


def group_dashed(segs: list[Seg], tol: float, L: float) -> tuple[list[Seg], list[Seg]]:
    """Tres o más trazos colineales cortos con huecos regulares: línea discontinua (viga u eje)."""
    dashed: list[Seg] = []
    consumed: set[int] = set()
    for o in ("h", "v"):
        pool = sorted([s for s in segs if s.orient == o and s.length < 0.12 * L], key=lambda s: s.pos)
        clusters: list[list[Seg]] = []
        for s in pool:
            if clusters and s.pos - clusters[-1][-1].pos <= tol:
                clusters[-1].append(s)
            else:
                clusters.append([s])
        for c in clusters:
            c.sort(key=lambda s: s.lo)
            gaps = np.array([b.lo - a.hi for a, b in zip(c, c[1:])])
            if len(c) >= 3 and (gaps > 0).all() and gaps.std() < 0.5 * gaps.mean() and gaps.mean() < 0.06 * L:
                p = float(np.mean([s.pos for s in c]))
                lo, hi = c[0].lo, c[-1].hi
                d = Seg(lo, p, hi, p, "h", c[0].thick, 0.55) if o == "h" else Seg(p, lo, p, hi, "v", c[0].thick, 0.55)
                d.tag["dashed"] = True
                dashed.append(d)
                consumed.update(id(s) for s in c)
    return dashed, [s for s in segs if id(s) not in consumed]
