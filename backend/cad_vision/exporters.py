"""Exportación del documento revisado a DXF (ezdxf), SVG y PDF."""
from __future__ import annotations

import io
import math
from xml.sax.saxutils import escape

import ezdxf
from ezdxf import units as dxf_units

LAYERS = [
    ("00_REFERENCIA", 8, 13), ("01_MUROS", 7, 50), ("02_DIVISIONES", 7, 30), ("03_PUERTAS", 30, 18),
    ("04_VENTANAS", 4, 18), ("05_COLUMNAS", 6, 35), ("06_COTAS", 3, 13), ("07_TEXTOS", 2, 13),
    ("08_EJES", 1, 13), ("09_OTROS", 9, 13),
]
FACTOR = {"m": 1.0, "cm": 100.0, "mm": 1000.0, "in": 1 / 0.0254}
DXF_UNIT = {"m": dxf_units.M, "cm": dxf_units.CM, "mm": dxf_units.MM, "in": dxf_units.IN}


def _live(doc: dict) -> list[dict]:
    return [e for e in doc["entities"] if e.get("state") != "rejected"]


def check(doc: dict, acknowledge: bool) -> list[dict]:
    """Regla del producto: nada dudoso se exporta en silencio."""
    issues: list[dict] = []
    sc = doc.get("scale") or {}
    if not sc.get("known"):
        issues.append({"code": "no_scale", "msg": "El plano no tiene escala real. Calibra con una medida conocida.", "ids": []})
    must = [e for e in _live(doc) if e.get("state") == "pending" and e.get("status") == "manual"]
    if must:
        issues.append({"code": "manual", "msg": f"{len(must)} elemento(s) necesitan tu decisión: confírmalos o recházalos.", "ids": [e["id"] for e in must]})
    doubt = [e for e in _live(doc) if e.get("state") == "pending" and e.get("status") == "uncertain"]
    if doubt and not acknowledge:
        issues.append({"code": "uncertain", "msg": f"{len(doubt)} elemento(s) con incertidumbre sin revisar. Revísalos o acepta exportarlos marcados en rojo.", "ids": [e["id"] for e in doubt]})
    return issues


def _is_flagged(e: dict) -> bool:
    return e.get("state") == "pending" and e.get("status") == "uncertain"


def _arc_angles(h, a, b) -> tuple[float, float]:
    """Ángulos antihorarios del arco corto entre los puntos a y b, con centro h."""
    a0 = math.degrees(math.atan2(a[1] - h[1], a[0] - h[0])) % 360
    a1 = math.degrees(math.atan2(b[1] - h[1], b[0] - h[0])) % 360
    return (a0, a1) if (a1 - a0) % 360 <= 180 else (a1, a0)


def to_dxf(doc: dict, units: str = "m") -> str:
    f = FACTOR[units]
    dw = ezdxf.new("R2013", setup=True)
    dw.units = DXF_UNIT[units]
    dw.header["$MEASUREMENT"] = 1
    dw.header["$LUNITS"] = 2
    dw.header["$LUPREC"] = 3
    for name, color, lw in LAYERS:
        lay = dw.layers.add(name, color=color, lineweight=lw)
        if name == "08_EJES":
            lay.dxf.linetype = "CENTER"
    dw.layers.get("00_REFERENCIA").dxf.plot = 0

    if "Civix" not in dw.styles:
        dw.styles.add("Civix", font="arial.ttf")
    th = float(doc["params"].get("text_height", 0.12)) * f
    ds = dw.dimstyles.new("CIVIX")
    ds.dxf.dimtxt = th
    ds.dxf.dimasz = th * 0.9
    ds.dxf.dimtsz = th * 0.5
    ds.dxf.dimexe = th * 0.5
    ds.dxf.dimexo = th * 0.4
    ds.dxf.dimgap = th * 0.3
    ds.dxf.dimdec = 2 if units == "m" else 0
    ds.dxf.dimtad = 1
    ds.dxf.dimtxsty = "Civix"
    ds.dxf.dimpost = f"<> {units}"

    msp = dw.modelspace()

    def P(p):
        return (p[0] * f, p[1] * f)

    for e in _live(doc):
        g = e["geom"]
        kind = g["kind"]
        attr = {"layer": e["layer"]}
        if _is_flagged(e):
            attr["color"] = 1  # incertidumbre aceptada: visible en rojo dentro de AutoCAD
        if kind == "line":
            if g.get("width"):
                msp.add_lwpolyline([P(g["a"]), P(g["b"])], dxfattribs={**attr, "const_width": g["width"] * f})
            else:
                dash = {"linetype": "DASHED"} if g.get("dashed") else {}
                msp.add_line(P(g["a"]), P(g["b"]), dxfattribs={**attr, **dash})
        elif kind == "polyline":
            msp.add_lwpolyline([P(p) for p in g["pts"]], close=bool(g.get("closed")), dxfattribs=attr)
        elif kind == "circle":
            msp.add_circle(P(g["c"]), g["r"] * f, dxfattribs=attr)
        elif kind == "rect":
            (x0, y0), (x1, y1) = P(g["a"]), P(g["b"])
            msp.add_lwpolyline([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], close=True, dxfattribs=attr)
        elif kind == "door":
            h, o, l = P(g["hinge"]), P(g["open"]), P(g["leaf"])
            r = math.dist(h, o)
            a0, a1 = _arc_angles(h, o, l)
            msp.add_arc(h, r, a0, a1, dxfattribs=attr)
            msp.add_line(h, l, dxfattribs=attr)
        elif kind == "access":
            msp.add_line(P(g["a"]), P(g["b"]), dxfattribs={**attr, "linetype": "DASHED"})
        elif kind == "window":
            a, b = P(g["a"]), P(g["b"])
            d = (g.get("depth") or 0.15) * f / 2
            L = math.dist(a, b) or 1.0
            nx, ny = -(b[1] - a[1]) / L * d, (b[0] - a[0]) / L * d
            msp.add_lwpolyline([(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)], close=True, dxfattribs=attr)
            msp.add_line(a, b, dxfattribs=attr)
        elif kind == "stair":
            for ta, tb in g["treads"]:
                msp.add_line(P(ta), P(tb), dxfattribs=attr)
        elif kind == "text":
            msp.add_text(g["text"], height=g["height"] * f, dxfattribs={**attr, "style": "Civix"}).set_placement(P(g["at"]), align=ezdxf.enums.TextEntityAlignment.MIDDLE_CENTER)
        elif kind == "note_dim":
            msp.add_text(g["text"], height=g["height"] * f, dxfattribs={**attr, "style": "Civix"}).set_placement(P(g["at"]), align=ezdxf.enums.TextEntityAlignment.MIDDLE_CENTER)
        elif kind == "dim":
            horiz = g["axis"] == "x"
            base = (g["a"][0] * f, g["base"] * f) if horiz else (g["base"] * f, g["a"][1] * f)
            txt = "<>" if e.get("applied") else g.get("written", "<>")
            msp.add_linear_dim(base=base, p1=P(g["a"]), p2=P(g["b"]), angle=0 if horiz else 90, dimstyle="CIVIX", text=txt, dxfattribs=attr).render()
        elif kind == "axis":
            msp.add_line(P(g["a"]), P(g["b"]), dxfattribs=attr)
            h = g["height"] * f
            r = h * 1.3
            ax, ay = P(g["a"])
            bx, by = P(g["b"])
            L = math.hypot(bx - ax, by - ay) or 1.0
            cx, cy = ax - (bx - ax) / L * r, ay - (by - ay) / L * r
            msp.add_circle((cx, cy), r, dxfattribs=attr)
            msp.add_text(g["label"], height=h, dxfattribs={**attr, "style": "Civix"}).set_placement((cx, cy), align=ezdxf.enums.TextEntityAlignment.MIDDLE_CENTER)

    buf = io.StringIO()
    dw.write(buf)
    return buf.getvalue()


def validate_dxf(text: str) -> dict:
    """Relee el DXF generado: estructura, auditoría, capas y ausencia de imágenes incrustadas."""
    dw = ezdxf.read(io.StringIO(text))
    audit = dw.audit()
    msp = dw.modelspace()
    counts: dict[str, int] = {}
    per_layer: dict[str, int] = {}
    for e in msp:
        counts[e.dxftype()] = counts.get(e.dxftype(), 0) + 1
        per_layer[e.dxf.layer] = per_layer.get(e.dxf.layer, 0) + 1
    return {
        "dxfversion": dw.dxfversion, "insunits": dw.header.get("$INSUNITS"), "errors": len(audit.errors), "fixes": len(audit.fixes),
        "entities": counts, "per_layer": per_layer, "layers": [l.dxf.name for l in dw.layers], "raster_images": counts.get("IMAGE", 0),
    }


# ----- primitivas 2D comunes a SVG y PDF -----

COLOR = {"01_MUROS": "#111", "02_DIVISIONES": "#222", "03_PUERTAS": "#B45309", "04_VENTANAS": "#0369A1", "05_COLUMNAS": "#7C3AED", "06_COTAS": "#15803D", "07_TEXTOS": "#111", "08_EJES": "#DC2626", "09_OTROS": "#64748B", "00_REFERENCIA": "#CBD5E1"}


def primitives(doc: dict) -> list[dict]:
    """Traduce cada entidad a trazos: line(pts,w) | text(at,s,h)."""
    out: list[dict] = []
    th = float(doc["params"].get("text_height", 0.12))

    def line(layer, pts, w=0.012, dash=False):
        out.append({"t": "line", "layer": layer, "pts": pts, "w": w, "dash": dash})

    def text(layer, at, s, h, rot=0.0):
        out.append({"t": "text", "layer": layer, "at": at, "s": s, "h": h, "rot": rot})

    for e in _live(doc):
        if e["layer"] == "00_REFERENCIA":
            continue
        g, k, lay = e["geom"], e["geom"]["kind"], e["layer"]
        if k == "line":
            line(lay, [g["a"], g["b"]], g.get("width") or 0.012, g.get("dashed", False))
        elif k == "polyline":
            line(lay, g["pts"] + ([g["pts"][0]] if g.get("closed") else []))
        elif k == "circle":
            line(lay, [[g["c"][0] + g["r"] * math.cos(i * math.pi / 24), g["c"][1] + g["r"] * math.sin(i * math.pi / 24)] for i in range(49)])
        elif k == "rect":
            (x0, y0), (x1, y1) = g["a"], g["b"]
            line(lay, [[x0, y0], [x1, y0], [x1, y1], [x0, y1], [x0, y0]], 0.02)
        elif k == "door":
            h, o, l = g["hinge"], g["open"], g["leaf"]
            r = math.dist(h, o)
            a0, a1 = _arc_angles(h, o, l)
            span = (a1 - a0) % 360
            line(lay, [[h[0] + r * math.cos(math.radians(a0 + span * i / 24)), h[1] + r * math.sin(math.radians(a0 + span * i / 24))] for i in range(25)], 0.01)
            line(lay, [h, l], 0.02)
        elif k == "access":
            line(lay, [g["a"], g["b"]], 0.01, True)
        elif k == "window":
            a, b = g["a"], g["b"]
            d = (g.get("depth") or 0.15) / 2
            L = math.dist(a, b) or 1.0
            nx, ny = -(b[1] - a[1]) / L * d, (b[0] - a[0]) / L * d
            line(lay, [[a[0] + nx, a[1] + ny], [b[0] + nx, b[1] + ny], [b[0] - nx, b[1] - ny], [a[0] - nx, a[1] - ny], [a[0] + nx, a[1] + ny]], 0.012)
            line(lay, [a, b], 0.008)
        elif k == "stair":
            for ta, tb in g["treads"]:
                line(lay, [ta, tb], 0.01)
        elif k in ("text", "note_dim"):
            text(lay, g["at"], g["text"], g["height"])
        elif k == "dim":
            a, b = g["a"], g["b"]
            line(lay, [a, b], 0.006)
            horiz = g["axis"] == "x"
            tick = th * 0.4
            for p in (a, b):
                line(lay, [[p[0] - tick, p[1] - tick], [p[0] + tick, p[1] + tick]], 0.012)
            m = [(a[0] + b[0]) / 2 + (0 if horiz else -th * 0.7), (a[1] + b[1]) / 2 + (th * 0.7 if horiz else 0)]
            label = g.get("written") if not e.get("applied") else f"{abs(b[0] - a[0]) if horiz else abs(b[1] - a[1]):.2f} m"
            text(lay, m, label or "", th, 0 if horiz else 90)
        elif k == "axis":
            line(lay, [g["a"], g["b"]], 0.005, True)
            text(lay, g["a"], g["label"], g["height"])
    return out


def _bounds(prims: list[dict]) -> tuple[float, float, float, float]:
    xs, ys = [], []
    for p in prims:
        for q in p.get("pts", [p.get("at")]):
            xs.append(q[0])
            ys.append(q[1])
    return min(xs), min(ys), max(xs), max(ys)


def to_svg(doc: dict) -> str:
    prims = primitives(doc)
    x0, y0, x1, y1 = _bounds(prims)
    pad = 0.08 * max(x1 - x0, y1 - y0, 1e-6)
    x0, y0, x1, y1 = x0 - pad, y0 - pad, x1 + pad, y1 + pad
    Y = lambda v: y1 - v + y0  # noqa: E731
    groups: dict[str, list[str]] = {}
    for p in prims:
        col = COLOR.get(p["layer"], "#111")
        if p["t"] == "line":
            pts = " ".join(f"{q[0]:.4f},{Y(q[1]):.4f}" for q in p["pts"])
            dash = f' stroke-dasharray="{p["w"] * 12:.3f}"' if p["dash"] else ""
            groups.setdefault(p["layer"], []).append(f'<polyline points="{pts}" fill="none" stroke="{col}" stroke-width="{p["w"]:.4f}"{dash}/>')
        else:
            rot = f' transform="rotate({-p["rot"]:g} {p["at"][0]:.4f} {Y(p["at"][1]):.4f})"' if p["rot"] else ""
            groups.setdefault(p["layer"], []).append(f'<text x="{p["at"][0]:.4f}" y="{Y(p["at"][1]):.4f}" font-size="{p["h"]:.4f}" text-anchor="middle" dominant-baseline="middle" font-family="Arial" fill="{col}"{rot}>{escape(p["s"])}</text>')
    body = "\n".join(f'<g id="{lay}">' + "".join(items) + "</g>" for lay, items in sorted(groups.items()))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0:.4f} {y0:.4f} {x1 - x0:.4f} {y1 - y0:.4f}" width="{(x1 - x0) * 100:.0f}mm"><rect x="{x0}" y="{y0}" width="{x1 - x0}" height="{y1 - y0}" fill="#fff"/>{body}</svg>'


def to_pdf(doc: dict) -> bytes:
    import pymupdf

    prims = primitives(doc)
    x0, y0, x1, y1 = _bounds(prims)
    W, H = pymupdf.paper_size("a3-l")
    M = 36.0
    k = min((W - 2 * M) / max(x1 - x0, 1e-6), (H - 2 * M - 26) / max(y1 - y0, 1e-6))
    ox, oy = (W - k * (x1 - x0)) / 2, (H - k * (y1 - y0)) / 2

    def P(q):
        return pymupdf.Point(ox + (q[0] - x0) * k, H - (oy + (q[1] - y0) * k))

    def rgb(hexc):
        h = hexc.lstrip("#")
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return tuple(int(h[i : i + 2], 16) / 255 for i in (0, 2, 4))

    pdf = pymupdf.open()
    page = pdf.new_page(width=W, height=H)
    for p in prims:
        col = rgb(COLOR.get(p["layer"], "#111"))
        if p["t"] == "line":
            pts = [P(q) for q in p["pts"]]
            page.draw_polyline(pts, color=col, width=max(0.3, p["w"] * k), dashes="[4 3] 0" if p["dash"] else None, lineCap=1)
        else:
            size = max(5.0, p["h"] * k)
            tw = pymupdf.get_text_length(p["s"], fontname="helv", fontsize=size)
            c = P(p["at"])
            if p["rot"] == 90:
                page.insert_text((c.x + size * 0.35, c.y + tw / 2), p["s"], fontsize=size, fontname="helv", color=col, rotate=90)
            else:
                page.insert_text((c.x - tw / 2, c.y + size * 0.35), p["s"], fontsize=size, fontname="helv", color=col)
    sc = doc.get("scale") or {}
    page.insert_text((M, H - 16), f"Civix CAD Vision - reconstruccion revisada - escala: {sc.get('source') or 's/d'}", fontsize=8, fontname="helv", color=(0.4, 0.4, 0.4))
    return pdf.tobytes()
