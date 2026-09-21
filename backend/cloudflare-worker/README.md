# Backend Civix (Cloudflare Worker)

La API key de Groq **nunca** va en el navegador ni en GitHub.

## Pasos (una sola vez)

1. Instala Node.js si no lo tienes: https://nodejs.org
2. Abre una terminal en esta carpeta:

```bash
npm install -g wrangler
wrangler login
```

3. Guarda la key en Cloudflare (no en el código):

```bash
wrangler secret put GROQ_API_KEY
```

Pega: `gsk_...` y Enter.

4. Publica el worker:

```bash
wrangler deploy
```

5. Copia la URL que te muestre, por ejemplo:

`https://geometrics-civix.<tu-cuenta>.workers.dev`

6. En `js/config.js` del frontend:

```js
var AI_CONFIG = {
    provider: 'backend',
    backendUrl: 'https://geometrics-civix.<tu-cuenta>.workers.dev/api/chat',
    model: 'openai/gpt-oss-20b',
    // sin apiKey
};
```

7. Sube `js/config.js` y `js/app.js` a GitHub → Ctrl+F5.

## Probar

```bash
curl -X POST https://TU-WORKER.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hola Civix"}]}'
```

## Local (opcional)

En la carpeta `backend/`:

```bash
export GROQ_API_KEY=gsk_tu_clave
python3 server.py
```

Y en config: `backendUrl: 'http://127.0.0.1:5500/api/chat'`
