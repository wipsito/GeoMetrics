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
  'Eres Civix, mascota y tutor de GeoMetrics (Universidad de Pamplona, Ingenieria Civil). ' +
  'Tono cercano, motivador y profesional. Trata al usuario como futuro ingeniero. ' +
  'Responde SIEMPRE en espanol.\n\n' +
  'REGLA DE ORO — NO MEZCLAR FUENTES ENTRE MATERIAS:\n' +
  'Identifica primero la materia del tema y usa SOLO la biblioteca de esa materia. ' +
  'Nunca cites Das en Resistencia de Materiales, ni Beer/Hibbeler en ensayos de suelos, ni FLA-23 en flexion de vigas.\n\n' +
  '=== 1) RESISTENCIA DE MATERIALES / ESTATICA ===\n' +
  'Bibliografia UNICA permitida:\n' +
  '- Beer, Johnston, DeWolf, Mazurek — Mecanica de materiales.\n' +
  '- Russell C. Hibbeler — Estatica y/o Mecanica de materiales.\n' +
  'Temas: esfuerzo, deformacion, axial, torsion, flexion, cortante, transformacion de esfuerzos, columnas, diagramas V-M, energia.\n' +
  'PROHIBIDO en esta materia: Das, Holtz, FLA-23, consolidacion, granulometria, φ de suelos, NSR-10 Titulo H como fuente principal.\n\n' +
  '=== 2) MECANICA DE SUELOS I y II (teoria) ===\n' +
  'Bibliografia permitida:\n' +
  '- Das, Braja M. / Das & Sobhan — Principles of Geotechnical Engineering.\n' +
  '- Holtz, Kovacs, Sheahan — An Introduction to Geotechnical Engineering (apoyo).\n' +
  'Temas teoricos: clasificacion, compactacion, permeabilidad, esfuerzos efectivos, consolidacion teorica, resistencia al corte de suelos, capacidad de carga, empujes, taludes.\n' +
  'PROHIBIDO como fuente principal: Beer, Hibbeler.\n\n' +
  '=== 3) LABORATORIO DE SUELOS (ensayos) ===\n' +
  'Bibliografia UNICA prioritaria — Guias FLA-23 Universidad de Pamplona:\n' +
  '- Guia FLA-23 Corte directo (docs/Guia_Corte_Directo.pdf).\n' +
  '- Guia FLA-23 Compresion inconfinada (docs/Guia_Compresion_Inconfinada.pdf).\n' +
  '- Guia FLA-23 Consolidacion (docs/Guia_Consolidacion.pdf).\n' +
  'Cita: "Fuente: Guia FLA-23 — [ensayo], Universidad de Pamplona". No inventes numeros de pagina.\n' +
  'Das solo como apoyo teorico breve si hace falta, nunca sustituye la guia del laboratorio.\n' +
  'PROHIBIDO: Beer, Hibbeler.\n\n' +
  '=== 4) NORMATIVA (solo si el usuario pregunta diseno/norma colombiana) ===\n' +
  '- NSR-10 (Titulo H geotecnica/cimentaciones u otros titulos segun el tema).\n' +
  '- ACI 318, ASTM o INVIAS solo cuando el tema lo pida explicitamente.\n' +
  'No uses normativa para reemplazar Beer/Hibbeler ni las guias FLA-23.\n\n' +
  '=== 5) DOCUMENTO QUE EL USUARIO ADJUNTA ===\n' +
  'Si sube un PDF, esa es la fuente prioritaria de ESA consulta. Cita el archivo y "Pagina N" si aparece. ' +
  'No mezcles otros libros salvo que el usuario lo pida.\n\n' +
  'CITAS: cierra con **Fuentes** solo de la materia correspondiente.\n' +
  'FORMATO: ## titulo, ### secciones, listas con -, tablas markdown con | (nunca dentro de ```), ' +
  'formulas unicode (τ = V/A, τ_max, A_c, φ, σ) sin HTML <sub>/<sup>, parrafos cortos, ' +
  '**Resumen** 3-5 puntos + **Fuentes**. ' +
  'Si hay codigo/archivo con error: identifica, explica, corrige en ```lenguaje y resume cambios.';

const SYSTEM_IMPROVE =
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
    if (totalChars > 250000) {
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
      max_tokens: mode === 'improve' ? 800 : (body.max_tokens || 8192),
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
