#!/usr/bin/env python3
"""
GeoMetrics / Civix — servidor local
- Sirve el frontend
- Proxy POST /api/chat → Groq (API key solo en el servidor o env GROQ_API_KEY)
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT

GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "").strip()
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
PORT = int(os.environ.get("PORT", "5500"))

SYSTEM_CIVIX = (
    "Eres Civix, tutor de GeoMetrics (Universidad de Pamplona, Ingenieria Civil). "
    "Ayudas a estudiantes y docentes. Responde en espanol, claro y didactico. "
    "Formulas en unicode legible, sin LaTeX."
)
SYSTEM_IMPROVE = (
    "Eres experto en ingenieria de prompts para Ingenieria Civil. "
    "Reescribe el mensaje del usuario como un prompt mejorado. "
    "Responde SOLO con el prompt mejorado, en espanol, sin comillas ni explicaciones."
)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(FRONTEND), **kwargs)

    def log_message(self, fmt, *args):
        sys.stderr.write("[GeoMetrics] " + (fmt % args) + "\n")

    def end_headers(self):
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
            return self.json_response(400, {"error": "JSON invalido"})

        if not GROQ_API_KEY:
            return self.json_response(
                500,
                {"error": "Define la variable de entorno GROQ_API_KEY antes de iniciar el servidor"},
            )

        mode = "improve" if body.get("mode") == "improve" else "chat"
        messages = body.get("messages") if isinstance(body.get("messages"), list) else []

        if mode == "improve":
            user_text = ""
            if messages:
                user_text = str(messages[-1].get("content") or "")
            user_text = user_text or str(body.get("text") or "")
            if not user_text.strip():
                return self.json_response(400, {"error": "Falta el texto a mejorar"})
            messages = [
                {"role": "system", "content": SYSTEM_IMPROVE},
                {"role": "user", "content": "Mejora este prompt:\n\n" + user_text},
            ]
        else:
            messages = [m for m in messages if m and m.get("role") != "system"]
            messages = [{"role": "system", "content": SYSTEM_CIVIX}, *messages]

        payload = {
            "model": body.get("model") or GROQ_MODEL,
            "messages": messages,
            "temperature": 0.35 if mode == "improve" else float(body.get("temperature") or 0.4),
            "max_tokens": 800 if mode == "improve" else int(body.get("max_tokens") or 4096),
        }

        req = urllib.request.Request(
            GROQ_URL,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "User-Agent": "GeoMetrics-Civix/1.0",
            },
            method="POST",
        )

        try:
            with urllib.request.urlopen(req, timeout=90) as resp:
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
            return self.json_response(502, {"error": "Respuesta inesperada de Groq"})

        content = str(content).strip()
        if mode == "improve" and len(content) >= 2:
            if (content[0] == '"' and content[-1] == '"') or (content[0] == "«" and content[-1] == "»"):
                content = content[1:-1].strip()

        return self.json_response(200, {"content": content})

    def json_response(self, status: int, obj: dict):
        raw = json.dumps(obj, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def main():
    os.chdir(FRONTEND)
    if not GROQ_API_KEY:
        print("AVISO: exporta GROQ_API_KEY=gsk_... antes de usar Civix")
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print("=" * 56)
    print("  GeoMetrics + Civix (key solo en servidor)")
    print(f"  Abre:  http://127.0.0.1:{PORT}/index.html")
    print("  Chat:  POST /api/chat")
    print("=" * 56)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServidor detenido.")


if __name__ == "__main__":
    main()
