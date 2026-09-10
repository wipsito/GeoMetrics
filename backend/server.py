#!/usr/bin/env python3
"""
GeoMetrics / Civix — servidor local
- Sirve el frontend
- Proxy /api/chat → Groq (la API key vive solo aquí, no en el navegador)
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

# Carpeta frontend (hermana de backend/)
ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT  # index.html, css/, js/ están en la raíz del paquete geometrics

# API key SOLO en servidor (variable de entorno o valor por defecto del proyecto)
GROQ_API_KEY = os.environ.get(
    "GROQ_API_KEY",
    "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",
)
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
PORT = int(os.environ.get("PORT", "5500"))

SYSTEM_PROMPT = (
    "Eres Civix, la mascota asistente de GeoMetrics, laboratorio virtual de "
    "Ingeniería Civil de la Universidad de Pamplona. Eres cercano, motivador y "
    "experto en mecánica de suelos, resistencia de materiales, cimentaciones y "
    "temas afines. Responde siempre en español de forma clara, didáctica y "
    "concisa. Trata al estudiante como futuro ingeniero. Cuando escribas "
    "fórmulas usa LaTeX con \\( ... \\) en línea y $$ ... $$ en bloque."
)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND), **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("[GeoMetrics] " + (fmt % args) + "\n")

    def end_headers(self):
        # CORS por si abren el HTML desde otro origen en desarrollo
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path.rstrip("/") == "/api/chat":
            return self.handle_chat()
        self.send_error(404, "Not found")

    def handle_chat(self):
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length) if length else b"{}"
        try:
            body = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return self.json_response(400, {"error": "JSON inválido"})

        user_messages = body.get("messages") or []
        # Aceptar también un solo "message"
        if not user_messages and body.get("message"):
            user_messages = [{"role": "user", "content": body["message"]}]

        if not user_messages:
            return self.json_response(400, {"error": "Falta el mensaje"})

        if not GROQ_API_KEY:
            return self.json_response(
                500,
                {"error": "Servidor sin GROQ_API_KEY configurada"},
            )

        payload = {
            "model": body.get("model") or GROQ_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM_PROMPT},
                *user_messages,
            ],
            "temperature": 0.7,
            "max_tokens": 2000,
        }

        req = urllib.request.Request(
            GROQ_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "User-Agent": "GeoMetrics-Civix/1.0 (Universidad de Pamplona)",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data = json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            err_body = e.read().decode("utf-8", errors="replace")
            try:
                err_json = json.loads(err_body)
                msg = err_json.get("error", {}).get("message") or err_body
            except Exception:
                msg = err_body or str(e)
            return self.json_response(e.code, {"error": msg})
        except Exception as e:
            return self.json_response(502, {"error": f"No se pudo contactar Groq: {e}"})

        try:
            msg = data["choices"][0]["message"]
            content = msg.get("content") or msg.get("reasoning") or ""
        except Exception:
            return self.json_response(502, {"error": "Respuesta inesperada de Groq", "raw": data})

        return self.json_response(200, {"content": content, "raw": data})

    def json_response(self, status: int, obj: dict):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def main():
    os.chdir(FRONTEND)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("=" * 56)
    print("  GeoMetrics + Civix")
    print(f"  Abre:  http://127.0.0.1:{PORT}/index.html")
    print("  Chat:  POST /api/chat  (key solo en el servidor)")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")


if __name__ == "__main__":
    main()
