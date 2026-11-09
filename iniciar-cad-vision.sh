#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
VENV="${XDG_DATA_HOME:-$HOME/.local/share}/GeoMetrics/cad-vision-venv"
[ -x "$VENV/bin/python" ] || python3 -m venv "$VENV"
"$VENV/bin/python" -c "import fastapi,uvicorn,cv2,ezdxf,pymupdf,rapidocr" 2>/dev/null \
  || "$VENV/bin/python" -m pip install --disable-pip-version-check -r backend/cad_vision/requirements.txt
echo "Civix CAD Vision en http://127.0.0.1:8765 (no cierres esta terminal)"
exec "$VENV/bin/python" -m uvicorn cad_vision.main:app --app-dir backend --host 127.0.0.1 --port 8765
