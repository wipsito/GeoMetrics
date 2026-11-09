"""Interpretación del texto leído por OCR: cotas, unidades, escalas, nombres e identificadores."""
from __future__ import annotations

import re
import unicodedata

NUM = r"\d+(?:[.,]\d+)?"
UNIT = r"(?:metros?|mts?|mm|cms?|m|pulgadas?|pulg|in|pies?|ft|\"|'|”|’)"
PAIR_RE = re.compile(rf"({NUM})\s*({UNIT})?\s*[x×*]\s*({NUM})\s*({UNIT})?(?![a-z])", re.I)
SINGLE_RE = re.compile(rf"^(ancho|largo|alto|frente|fondo|longitud|l|a)?\s*[:=.]?\s*({NUM})\s*({UNIT})?\.?$", re.I)
SCALE_RE = re.compile(r"(?:esc(?:ala)?\.?\s*[:=]?\s*)?\b1\s*[:/]\s*(\d{1,4})\b", re.I)
ID_RE = re.compile(r"^[A-Za-z]{1,2}[-.]?\d{0,3}$")

TO_M = {"mm": 0.001, "cm": 0.01, "m": 1.0, "in": 0.0254, "ft": 0.3048}


def strip_accents(s: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def canon_unit(u: str | None) -> str | None:
    if not u:
        return None
    u = u.lower().strip()
    if u in ('"', "”") or u.startswith("pulg") or u == "in":
        return "in"
    if u in ("'", "’", "ft") or u.startswith("pie"):
        return "ft"
    if u.startswith("mm"):
        return "mm"
    if u.startswith("cm"):
        return "cm"
    return "m"


def _num(s: str) -> float:
    return float(s.replace(",", "."))


def _fix_ocr_digits(t: str) -> tuple[str, bool]:
    """Corrige O/l/I por dígitos sólo si la cadena parece numérica (nunca dentro de palabras)."""
    if not re.search(r"\d", t) or re.search(r"[a-záéíóúñ]{4,}", t, re.I):
        return t, False
    fixed = re.sub(r"(?<![a-z])[oO](?=[\s.,]*\d)|(?<=[\d.,])[oO](?![a-z])", "0", t)
    fixed = re.sub(r"(?<![a-z])[lI|](?=[\s.,]*\d)|(?<=[\d.,])[lI|](?![a-z])", "1", fixed)
    return fixed, fixed != t


def parse_text(raw: str, default_unit: str = "m") -> dict:
    """Clasifica un texto. role: dim_pair | dim | scale | room | id | note."""
    text = re.sub(r"\s+", " ", raw).strip()
    out: dict = {"raw": raw, "text": text, "role": "note", "corrected": False}
    t, corrected = _fix_ocr_digits(text)
    out["corrected"] = corrected

    m = SCALE_RE.search(t)
    if m and int(m.group(1)) >= 5:
        out.update(role="scale", scale_den=int(m.group(1)))
        return out

    m = PAIR_RE.search(t)
    if m:
        a, ua, b, ub = _num(m.group(1)), canon_unit(m.group(2)), _num(m.group(3)), canon_unit(m.group(4))
        unit = ub or ua
        assumed = unit is None
        unit = unit or default_unit
        ua, ub = ua or unit, ub or unit
        out.update(
            role="dim_pair",
            a_m=a * TO_M[ua],
            b_m=b * TO_M[ub],
            a=a,
            b=b,
            unit=unit,
            unit_assumed=assumed,
            name=(t[: m.start()] + " " + t[m.end() :]).strip(" :-.,") or None,
        )
        return out

    m = SINGLE_RE.match(t)
    if m:
        v = _num(m.group(2))
        unit = canon_unit(m.group(3))
        assumed = unit is None
        unit = unit or default_unit
        hint = (m.group(1) or "").lower()
        if hint in ("l", "a"):  # una letra suelta antes del número no es evidencia
            hint = ""
        if v > 0:
            out.update(role="dim", value=v, value_m=v * TO_M[unit], unit=unit, unit_assumed=assumed, hint=hint or None)
            return out

    if ID_RE.match(text) and (re.search(r"\d", text) or len(text) == 1):
        out["role"] = "id"
    elif re.search(r"[a-záéíóúñ]{3,}", strip_accents(text), re.I) and not re.search(r"\d", text) and len(text) <= 32:
        out["role"] = "room"  # candidato: pasa a nombre de espacio sólo si cae dentro de un ambiente
    return out
