/**
 * GeoMetrics / Civix — Cloudflare Worker
 * Secrets:
 *   wrangler secret put GROQ_API_KEY
 *   wrangler secret put BRAVE_API_KEY   (opcional, búsqueda web de calidad)
 *
 * Despliegue: wrangler deploy
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = 'llama-3.3-70b-versatile';

/** Modelos permitidos (Groq) */
const ALLOWED_MODELS = {
  'llama-3.3-70b-versatile': { label: 'Llama 3.3 70B', tier: 'potente' },
  'llama-3.1-8b-instant': { label: 'Llama 3.1 8B', tier: 'rapido' },
  'openai/gpt-oss-20b': { label: 'GPT-OSS 20B', tier: 'equilibrado' },
  'openai/gpt-oss-120b': { label: 'GPT-OSS 120B', tier: 'maximo' },
  'qwen/qwen3-32b': { label: 'Qwen3 32B', tier: 'potente' },
  'moonshotai/kimi-k2-instruct': { label: 'Kimi K2', tier: 'potente' },
  'gemma2-9b-it': { label: 'Gemma2 9B', tier: 'rapido' },
};

const SYSTEM_CIVIX =
  'Eres Civix, mascota y docente-tutor de GeoMetrics (Universidad de Pamplona, Ingenieria Civil). '
  + 'Tono cercano, motivador y profesional. Trata al usuario como futuro ingeniero. Responde SIEMPRE en espanol.\n\n'
  + '=== ESTILO DE RESPUESTA (PRIORITARIO) ===\n'
  + 'Responde de forma NATURAL, cercana y conversacional, como un tutor humano. '
  + 'Para preguntas cotidianas, cartas, fechas, permisos o dudas generales: ve al grano en parrafos claros. '
  + 'PROHIBIDO por defecto usar la plantilla: Identificacion del tema / Fundamento teorico / Formulas / Ejemplo practico / Ejercicio de refuerzo / Resumen / Fuentes. '
  + 'Esa plantilla SOLO si el usuario pide explicitamente una clase, un tema de estudio paso a paso o refuerzo formal de la asignatura.\n\n'
  + 'Si pide un tema formal de la materia, organiza con titulos cortos y ejemplos utiles, sin secciones vacias '
  + '(nunca escribas "Formulas: No aplica"). No entregues todo el programa de la materia de una vez. '
  + 'NO repitas el prompt del usuario.\n\n'
  + '=== NOMBRE DEL USUARIO ===\n'
  + 'Si el mensaje de sistema o el cuerpo indica el primer nombre del usuario, dirigete a esa persona por su primer nombre de forma natural.\n\n'
  + '=== CONOCIMIENTO ===\n'
  + 'Prioriza textos guia de la materia y documentos adjuntos cuando existan. '
  + 'Tambien usa conocimiento general solido (ingenieria civil, normas, cultura general, redaccion). '
  + 'Si recibes resultados de BUSQUEDA WEB, usalos y menciona la fuente de forma breve. '
  + 'No inventes resultados de laboratorio del estudiante. No mezcles autores entre materias distintas.\n\n'
  + '=== REGLA DE ORO - NO MEZCLAR FUENTES ENTRE MATERIAS ===\n'
  + 'Identifica la materia y usa SOLO su biblioteca cuando hable de textos guia.\n\n'
  + '1) RESISTENCIA DE MATERIALES / ESTATICA - Beer, Johnston, DeWolf, Mazurek, Hibbeler. PROHIBIDO: Das, Holtz, FLA-23.\n'
  + '2) MECANICA DE SUELOS (teoria) - Das / Das y Sobhan; apoyo Holtz. NSR-10 Titulo H si preguntan norma colombiana.\n'
  + '3) LABORATORIO DE SUELOS - Guias FLA-23 Universidad de Pamplona. Das solo apoyo teorico breve.\n'
  + '4) DOCUMENTO ADJUNTO: prioridad de ESA consulta; cita archivo y Pagina N si aparece.\n\n'
  + '=== FORMULAS ===\n'
  + 'Usa texto plano legible (ej. sigma = M * c / I). Evita LaTeX con barra invertida.\n'
  + 'Solo numera cuando aporte claridad. No fuerces plantillas 1)-5) en respuestas naturales.\n'
  + 'FORMATO: titulos cortos si ayudan, listas con -, tablas markdown, parrafos cortos.';

const SYSTEM_IMPROVE =
  'Eres un experto en ingenieria de prompts para estudiantes de Ingenieria Civil. '
  + 'Tu unica tarea es REESCRIBIR el mensaje del usuario como un prompt mejorado, claro y especifico. '
  + 'Reglas: 1) Responde SOLO con el prompt mejorado, sin comillas ni explicaciones. '
  + '2) Conserva la intencion original. 3) Anade contexto de ingenieria civil si falta. '
  + '4) Escribe en espanol. 5) Se conciso pero completo.';

const ALLOWED_ORIGINS = [
  'https://wipsito.github.io',
  'http://127.0.0.1:5500',
  'http://localhost:5500',
  'http://127.0.0.1:5501',
  'http://localhost:5501',
  'http://127.0.0.1:8080',
  'http://localhost:8080',
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

function json(status, data, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

function pickModel(requested, env) {
  const def = env.GROQ_MODEL || DEFAULT_MODEL;
  const m = String(requested || def).trim();
  if (ALLOWED_MODELS[m]) return m;
  // alias antiguos
  if (m === 'gpt-oss-20b') return 'openai/gpt-oss-20b';
  return ALLOWED_MODELS[def] ? def : DEFAULT_MODEL;
}

/** Búsqueda web: Brave (si hay key) o DuckDuckGo Instant Answer */
async function webSearch(query, env) {
  const q = String(query || '').trim().slice(0, 200);
  if (!q) return { ok: false, results: [], note: 'Consulta vacía' };

  // 1) Brave Search API (recomendado)
  if (env.BRAVE_API_KEY) {
    try {
      const url = 'https://api.search.brave.com/res/v1/web/search?q='
        + encodeURIComponent(q) + '&count=5';
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': env.BRAVE_API_KEY,
        },
      });
      if (res.ok) {
        const data = await res.json();
        const items = (data.web && data.web.results) || [];
        const results = items.slice(0, 5).map((r) => ({
          title: r.title || '',
          url: r.url || '',
          snippet: r.description || '',
        }));
        return { ok: true, provider: 'brave', results };
      }
    } catch (e) { /* fallback */ }
  }

  // 2) DuckDuckGo Instant Answer (gratis, sin key; limitado)
  try {
    const url = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(q)
      + '&format=json&no_redirect=1&no_html=1&skip_disambig=1';
    const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
    if (res.ok) {
      const data = await res.json();
      const results = [];
      if (data.AbstractText) {
        results.push({
          title: data.Heading || 'Resumen',
          url: data.AbstractURL || '',
          snippet: data.AbstractText,
        });
      }
      const related = Array.isArray(data.RelatedTopics) ? data.RelatedTopics : [];
      related.slice(0, 4).forEach((t) => {
        if (t.Text) {
          results.push({
            title: (t.Text || '').slice(0, 80),
            url: t.FirstURL || '',
            snippet: t.Text || '',
          });
        } else if (t.Topics && t.Topics[0]) {
          const x = t.Topics[0];
          results.push({
            title: (x.Text || '').slice(0, 80),
            url: x.FirstURL || '',
            snippet: x.Text || '',
          });
        }
      });
      if (results.length) return { ok: true, provider: 'duckduckgo', results };
    }
  } catch (e2) { /* ignore */ }

  return {
    ok: false,
    results: [],
    note: 'No hubo resultados web. Responde con conocimiento general y dilo con claridad.',
  };
}

function formatSearchBlock(search) {
  if (!search || !search.results || !search.results.length) {
    return search && search.note
      ? ('\n\n[BUSQUEDA WEB]\n' + search.note)
      : '';
  }
  const lines = search.results.map((r, i) =>
    (i + 1) + '. ' + (r.title || 'Fuente') + '\n   '
    + (r.snippet || '') + (r.url ? ('\n   URL: ' + r.url) : '')
  );
  return '\n\n[BUSQUEDA WEB — ' + (search.provider || 'web') + ']\n'
    + 'Usa estos hallazgos si aportan. Cita fuentes de forma breve.\n'
    + lines.join('\n');
}

function lastUserText(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i] && messages[i].role === 'user') {
      return String(messages[i].content || '').slice(0, 500);
    }
  }
  return '';
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    // Lista de modelos (GET)
    const url = new URL(request.url);
    if (request.method === 'GET' && (url.pathname === '/api/models' || url.pathname === '/models')) {
      const list = Object.keys(ALLOWED_MODELS).map((id) => ({ id, ...ALLOWED_MODELS[id] }));
      return json(200, { models: list, default: pickModel(null, env) }, origin);
    }

    if (request.method !== 'POST' || (url.pathname !== '/api/chat' && url.pathname !== '/')) {
      return json(404, { error: 'Usa POST /api/chat o GET /api/models' }, origin);
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

    if (messages.length > 40) {
      return json(400, { error: 'Demasiados mensajes en el historial' }, origin);
    }
    const totalChars = messages.reduce((n, m) => n + String(m.content || '').length, 0);
    if (totalChars > 250000) {
      return json(400, { error: 'Mensaje demasiado largo' }, origin);
    }

    const model = pickModel(body.model, env);
    const wantWeb = !!(body.webSearch || body.web || body.useWebSearch);

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
      // Conservar contexto del cliente (académico) y añadir system oficial
      const clientSystems = messages
        .filter((m) => m && m.role === 'system')
        .map((m) => String(m.content || '').trim())
        .filter(Boolean);
      messages = messages.filter((m) => m && m.role !== 'system');

      const uname = (body.userName || '').toString().trim();
      let sys = SYSTEM_CIVIX;
      if (uname) sys += '\n\nDirígete al usuario por su primer nombre: ' + uname + '.';
      if (clientSystems.length) {
        sys += '\n\n=== CONTEXTO DE LA SESION ===\n' + clientSystems.join('\n');
      }

      if (wantWeb) {
        const q = lastUserText(messages);
        const search = await webSearch(q, env);
        sys += formatSearchBlock(search);
        if (!search.ok) {
          sys += '\n(No hubo resultados web útiles; responde con conocimiento general y sé transparente.)';
        }
      }

      messages = [{ role: 'system', content: sys }, ...messages];
    }

    const payload = {
      model,
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
      return json(502, { error: 'No se pudo contactar a Groq' }, origin);
    }

    let data = {};
    try { data = await groqRes.json(); } catch (e) {}

    if (!groqRes.ok) {
      const errMsg = (data && data.error && data.error.message)
        ? data.error.message
        : ('Error Groq HTTP ' + groqRes.status);
      return json(groqRes.status, { error: errMsg, model }, origin);
    }

    const content =
      data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : '';

    return json(200, {
      content: content || '',
      model,
      webSearch: wantWeb,
    }, origin);
  },
};
