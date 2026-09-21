/**
 * GeoMetrics / Civix — Cloudflare Worker
 * La API key de Groq vive SOLO aquí (Secret: GROQ_API_KEY).
 *
 * Despliegue:
 * 1) npm i -g wrangler
 * 2) wrangler login
 * 3) cd backend/cloudflare-worker
 * 4) wrangler secret put GROQ_API_KEY   ← pega tu gsk_...
 * 5) wrangler deploy
 * 6) Copia la URL (https://geometrics-civix....workers.dev)
 *    y pégala en js/config.js → AI_CONFIG.backendUrl
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'openai/gpt-oss-20b';

const SYSTEM_CIVIX =
  'Eres Civix, mascota y tutor de GeoMetrics (Universidad de Pamplona, Programa de Ingenieria Civil). ' +
  'Tono cercano, motivador y profesional. Trata al usuario como futuro ingeniero. ' +
  'Materias: Mecanica de Suelos I, Mecanica de Suelos II, Resistencia de Materiales y diseno estructural basico. ' +
  'BASE DE CONOCIMIENTO PRIORITARIA (citas obligatorias cuando aplique): ' +
  '1) Universidad de Pamplona — Guia unificada de laboratorio FLA-23: Ensayo de corte directo. ' +
  '2) Universidad de Pamplona — Guia unificada de laboratorio FLA-23: Compresion inconfinada. ' +
  '3) Universidad de Pamplona — Guia unificada de laboratorio FLA-23: Consolidacion. ' +
  '4) Textos de apoyo tipicos: Das & Sobhan (Principles of Geotechnical Engineering); normas ACI 318 / NSR-10 solo como referencia general. ' +
  'Cuando uses informacion de laboratorio de suelos, CITA al final de la seccion o del mensaje: ' +
  'Fuente: Guia FLA-23 — [nombre del ensayo], Universidad de Pamplona. Si conoces seccion o pagina, indicala (ej: Seccion 3 / Procedimiento, pag. orientativa). ' +
  'Si no tienes el numero exacto de pagina, di "segun la guia FLA-23 del laboratorio" sin inventar paginas falsas. ' +
  'FORMATO OBLIGATORIO: ' +
  '1) Titulo ## corto. 2) Secciones ###. 3) Listas con -. ' +
  '4) Tablas en markdown con | (NUNCA dentro de ```). ' +
  '5) Formulas en unicode legible: τ = V/A, τ_max, A_c, φ, σ. NO uses etiquetas HTML <sub> ni <sup>. Usa subindices con _ (τ_max, A_c) o unicode. ' +
  '6) Parrafos cortos, sin paredes de texto. ' +
  '7) Cierra con **Resumen** (3-5 puntos) y **Fuentes** (guias/textos usados). ' +
  'Si el usuario sube codigo/archivo con error: identifica, explica, corrige en bloque ```lenguaje y resume cambios. ' +
  'Responde siempre en espanol.';

const SYSTEM_IMPROVEconst SYSTEM_IMPROVE =
  'Eres un experto en ingenieria de prompts para estudiantes de Ingenieria Civil. ' +
  'Tu unica tarea es REESCRIBIR el mensaje del usuario como un prompt mejorado, claro y especifico, ' +
  'listo para enviarlo a un tutor de IA (Civix). ' +
  'Reglas: 1) Responde SOLO con el prompt mejorado, sin comillas ni explicaciones. ' +
  '2) Conserva la intencion original. 3) Anade contexto de ingenieria civil si falta. ' +
  '4) Escribe en espanol. 5) Se conciso pero completo.';

// Orígenes permitidos (GitHub Pages + local)
const ALLOWED_ORIGINS = [
  'https://wipsito.github.io',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5501',
  'http://localhost:5501',
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}

function json(status, obj, origin) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin || ''),
    },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (request.method !== 'POST' || (url.pathname !== '/api/chat' && url.pathname !== '/')) {
      return json(404, { error: 'Usa POST /api/chat' }, origin);
    }

    if (!env.GROQ_API_KEY) {
      return json(500, { error: 'GROQ_API_KEY no configurada en el Worker' }, origin);
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json(400, { error: 'JSON invalido' }, origin);
    }

    const mode = body.mode === 'improve' ? 'improve' : 'chat';
    let messages = Array.isArray(body.messages) ? body.messages : [];

    // Limitar tamaño para abuso
    if (messages.length > 40) {
      return json(400, { error: 'Demasiados mensajes en el historial' }, origin);
    }
    const totalChars = messages.reduce((n, m) => n + String(m.content || '').length, 0);
    if (totalChars > 120000) {
      return json(400, { error: 'Mensaje demasiado largo' }, origin);
    }

    // Forzar system en el servidor (la key y el rol no salen del backend)
    if (mode === 'improve') {
      const userText = messages.length
        ? String(messages[messages.length - 1].content || '')
        : String(body.text || '');
      if (!userText.trim()) {
        return json(400, { error: 'Falta el texto a mejorar' }, origin);
      }
      messages = [
        { role: 'system', content: SYSTEM_IMPROVE },
        { role: 'user', content: 'Mejora este prompt:\n\n' + userText },
      ];
    } else {
      // Quitar systems del cliente y poner el oficial
      messages = messages.filter((m) => m && m.role !== 'system');
      messages = [{ role: 'system', content: SYSTEM_CIVIX }, ...messages];
    }

    const payload = {
      model: body.model || env.GROQ_MODEL || DEFAULT_MODEL,
      messages,
      temperature: mode === 'improve' ? 0.35 : (typeof body.temperature === 'number' ? body.temperature : 0.4),
      max_tokens: mode === 'improve' ? 800 : (body.max_tokens || 4096),
    };

    let groqRes;
    try {
      groqRes = await fetch(GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + env.GROQ_API_KEY,
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return json(502, { error: 'No se pudo contactar Groq' }, origin);
    }

    const data = await groqRes.json().catch(() => ({}));
    if (!groqRes.ok) {
      const msg =
        (data.error && data.error.message) ||
        data.message ||
        'Error HTTP ' + groqRes.status;
      return json(groqRes.status, { error: msg }, origin);
    }

    const msg = data.choices && data.choices[0] && data.choices[0].message;
    let content = msg && msg.content ? String(msg.content) : '';
    if (!content.trim() && msg && msg.reasoning) content = String(msg.reasoning);

    if (!content.trim()) {
      return json(502, { error: 'Civix no devolvio texto' }, origin);
    }

    // Limpiar comillas en modo improve
    if (mode === 'improve') {
      content = content.trim();
      if (
        (content.startsWith('"') && content.endsWith('"')) ||
        (content.startsWith('«') && content.endsWith('»'))
      ) {
        content = content.slice(1, -1).trim();
      }
    }

    return json(200, { content }, origin);
  },
};
