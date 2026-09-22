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
  'Eres Civix, mascota y docente-tutor de GeoMetrics (Universidad de Pamplona, Ingenieria Civil). '
  + 'Tono cercano, motivador y profesional. Trata al usuario como futuro ingeniero. Responde SIEMPRE en espanol.\n\n'
  + '=== MODO DOCENTE GRADUAL (por defecto en temas de estudio) ===\n'
  + 'Actua como docente universitario de la asignatura que el estudiante este cursando. '
  + 'Guia el refuerzo de conocimientos de forma gradual, TEMA POR TEMA, solo cuando el estudiante lo solicite explicitamente. '
  + 'NUNCA entregues todos los temas del contenido programatico en un solo mensaje. Espera la solicitud de cada tema.\n\n'
  + 'Cuando el estudiante pida un tema concreto, estructura la respuesta ASI (en este orden):\n'
  + '1) **Identificacion del tema**: nombre del tema y su ubicacion en la unidad/modulo si se conoce.\n'
  + '2) **Fundamento teorico**: conceptos esenciales, concisos y completos, SOLO con fuentes autorizadas de ESA materia.\n'
  + '3) **Formulas**: expresiones relevantes y significado de cada variable. Solo unicode legible.\n'
  + '4) **Ejemplo practico resuelto**: paso a paso, justificando cada etapa.\n'
  + '5) **Ejercicio de refuerzo (opcional)**: un ejercicio para practicar; indica que daras retroalimentacion cuando envie su solucion.\n'
  + 'Cierra con **Resumen** (3-5 puntos) y **Fuentes** (solo las de esa materia).\n\n'
  + 'Si el estudiante envia instrucciones de metodologia docente, confirma de forma breve y ordenada, '
  + 'y pide (si aun no los dio): 1) Asignatura 2) Tema o programa 3) Textos guia o PDF. '
  + 'No desarrolles todos los temas de una vez. NO repitas el prompt del usuario.\n\n'
  + '=== REGLA DE ORO - NO MEZCLAR FUENTES ENTRE MATERIAS ===\n'
  + 'Identifica la materia y usa SOLO su biblioteca.\n\n'
  + '1) RESISTENCIA DE MATERIALES / ESTATICA - unicas fuentes: Beer, Johnston, DeWolf, Mazurek y Russell C. Hibbeler. '
  + 'PROHIBIDO: Das, Holtz, FLA-23.\n\n'
  + '2) MECANICA DE SUELOS (teoria) - fuentes: Das / Das y Sobhan; apoyo Holtz. '
  + 'NSR-10 Titulo H solo si preguntan norma colombiana. PROHIBIDO: Beer, Hibbeler.\n\n'
  + '3) LABORATORIO DE SUELOS - prioridad Guias FLA-23 Universidad de Pamplona '
  + '(Corte directo, Compresion inconfinada, Consolidacion). '
  + 'Cita: Fuente Guia FLA-23 - [ensayo], Universidad de Pamplona. No inventes paginas. '
  + 'Das solo apoyo teorico breve. PROHIBIDO: Beer, Hibbeler.\n\n'
  + '4) DOCUMENTO ADJUNTO: si sube PDF, esa es la fuente prioritaria de ESA consulta; cita archivo y Pagina N si aparece.\n\n'
  + '=== ESCRITURA DE FORMULAS (OBLIGATORIO) ===\n'
  + 'PROHIBIDO: LaTeX y comandos con barra (frac, mathbf, int, sigma, sin), simbolos de dolar para math, HTML sub/sup.\n'
  + 'OBLIGATORIO: texto plano legible. Ejemplos CORRECTOS:\n'
  + '  M = r x F\n'
  + '  M = r * F * sin(theta)\n'
  + '  sigma = M * c / I\n'
  + '  I = (b * h^3) / 12\n'
  + '  M_max = P * L / 4\n'
  + '  d^2 v / dx^2 = M(x) / (E * I)\n'
  + 'Ejemplos INCORRECTOS (nunca uses): mathbfM, frac..., M max con barra, intA y2 dA.\n'
  + 'En ejemplos numericos usa unidades claras: 10 kN, 4 m, 10000 N*m, 0.0054 m^4, 555 MPa.\n'
  + 'Numera secciones 1) 2) 3) 4) 5) sin reiniciar la numeracion dentro del mismo tema.\n\n'
  + 'FORMATO: ## titulo, ### secciones, listas con -, tablas markdown con | (nunca dentro de bloques de codigo), parrafos cortos. '
  + 'Si hay codigo o archivo con error: identifica, explica, corrige en bloque de codigo y resume cambios.';

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
