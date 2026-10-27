/**
 * GeoMetrics / Civix — Cloudflare Worker (multi-proveedor + búsqueda web)
 *
 * Secrets (wrangler secret put NOMBRE):
 *   GROQ_API_KEY       — Groq (obligatorio si usas modelos Groq)
 *   OPENAI_API_KEY     — OpenAI
 *   ANTHROPIC_API_KEY  — Claude
 *   GEMINI_API_KEY     — Google Gemini
 *   DEEPSEEK_API_KEY   — DeepSeek
 *   XAI_API_KEY        — xAI Grok
 *   BRAVE_API_KEY      — búsqueda web (opcional)
 *
 * Despliegue: wrangler deploy
 */

const DEFAULT_MODEL = 'openai/gpt-oss-120b';

/** id → { label, provider, tier } */
const ALLOWED_MODELS = {
  'openai/gpt-oss-120b': { label: 'GPT-OSS 120B', provider: 'groq', tier: 'maximo' },
};

function pickModel(requested, env) {
  const def = env.GROQ_MODEL || DEFAULT_MODEL;
  const id = String(requested || '').trim() || def;
  if (ALLOWED_MODELS[id]) return id;
  // si no está en lista, aún se permite si viene provider explícito (flexibilidad)
  if (requested) return String(requested).trim();
  return ALLOWED_MODELS[def] ? def : DEFAULT_MODEL;
}

function resolveProvider(body, modelId) {
  // 1) Catálogo (evita confundir openai/gpt-oss-* de Groq con OpenAI real)
  if (modelId && ALLOWED_MODELS[modelId] && ALLOWED_MODELS[modelId].provider) {
    const fromCatalog = ALLOWED_MODELS[modelId].provider;
    const p = String(body.provider || '').toLowerCase().trim();
    // Si el cliente manda provider y coincide con catálogo o es explícito distinto válido, preferir body si no es auto
    if (p && p !== 'auto' && p !== 'backend' && p !== 'groq') {
      // Si eligió un modelo de OpenAI/Claude/etc., confiar en body.provider
      if (p === fromCatalog || ['openai', 'anthropic', 'claude', 'gemini', 'google', 'deepseek', 'xai', 'grok'].indexOf(p) >= 0) {
        return p === 'claude' ? 'anthropic' : (p === 'google' ? 'gemini' : (p === 'grok' ? 'xai' : p));
      }
    }
    return fromCatalog;
  }
  const p = String(body.provider || '').toLowerCase().trim();
  if (p && p !== 'auto' && p !== 'backend') {
    if (p === 'claude') return 'anthropic';
    if (p === 'google') return 'gemini';
    if (p === 'grok') return 'xai';
    return p;
  }
  const m = String(modelId || '').toLowerCase();
  // No tratar "openai/gpt-oss-..." como OpenAI (son modelos de Groq)
  if (m.indexOf('gpt-oss') >= 0 || m.indexOf('llama') >= 0 || m.indexOf('qwen') >= 0 || m.indexOf('gemma') >= 0 || m.indexOf('kimi') >= 0) {
    return 'groq';
  }
  if (m.startsWith('gpt-4') || m.startsWith('gpt-3') || m.startsWith('o1') || m.startsWith('o3')) return 'openai';
  if (m.startsWith('claude')) return 'anthropic';
  if (m.startsWith('gemini')) return 'gemini';
  if (m.startsWith('deepseek')) return 'deepseek';
  if (m.startsWith('grok')) return 'xai';
  return 'groq';
}

function openaiStyleMessages(messages) {
  return (messages || []).map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : msg.role === 'system' ? 'system' : 'user',
    content: String(msg.content || ''),
  }));
}

async function callOpenAICompatible(url, apiKey, model, messages, temperature, maxTokens) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model,
      messages: openaiStyleMessages(messages),
      temperature,
      max_tokens: maxTokens,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data.error && (data.error.message || data.error)) || data.message || ('Error HTTP ' + res.status);
    return { ok: false, status: res.status, error: String(msg) };
  }
  const msg = data.choices && data.choices[0] && data.choices[0].message;
  let content = msg && msg.content != null ? String(msg.content) : '';
  if (!content.trim() && msg && msg.reasoning) content = String(msg.reasoning);
  return { ok: true, content };
}

async function callAnthropic(apiKey, model, messages, temperature, maxTokens) {
  let system = '';
  const msgs = [];
  for (const m of messages || []) {
    if (m.role === 'system') system += (system ? '\n\n' : '') + String(m.content || '');
    else msgs.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content || ''),
    });
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-latest',
      max_tokens: maxTokens || 4096,
      temperature,
      system: system || undefined,
      messages: msgs,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data.error && data.error.message) || data.message || ('Error HTTP ' + res.status);
    return { ok: false, status: res.status, error: String(msg) };
  }
  const parts = data.content || [];
  const text = parts.filter((p) => p.type === 'text').map((p) => p.text).join('\n');
  return { ok: true, content: text || '' };
}

async function callGemini(apiKey, model, messages, temperature, maxTokens) {
  const modelId = model || 'gemini-2.0-flash';
  let system = '';
  const contents = [];
  for (const m of messages || []) {
    if (m.role === 'system') {
      system += (system ? '\n\n' : '') + String(m.content || '');
      continue;
    }
    contents.push({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content || '') }],
    });
  }
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/'
    + encodeURIComponent(modelId) + ':generateContent?key=' + encodeURIComponent(apiKey);
  const body = {
    contents,
    generationConfig: { temperature, maxOutputTokens: maxTokens || 4096 },
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data.error && data.error.message) || data.message || ('Error HTTP ' + res.status);
    return { ok: false, status: res.status, error: String(msg) };
  }
  const cand = data.candidates && data.candidates[0];
  const parts = cand && cand.content && cand.content.parts ? cand.content.parts : [];
  return { ok: true, content: parts.map((p) => p.text || '').join('') };
}

async function dispatchLLM(env, provider, model, messages, temperature, maxTokens) {
  if (provider === 'openai') {
    if (!env.OPENAI_API_KEY) return { ok: false, status: 500, error: 'Falta OPENAI_API_KEY. En la carpeta del worker ejecuta: npx wrangler secret put OPENAI_API_KEY (pega tu sk-... de platform.openai.com)' };
    return callOpenAICompatible('https://api.openai.com/v1/chat/completions', env.OPENAI_API_KEY, model || 'gpt-4o-mini', messages, temperature, maxTokens);
  }
  if (provider === 'anthropic' || provider === 'claude') {
    if (!env.ANTHROPIC_API_KEY) return { ok: false, status: 500, error: 'Falta ANTHROPIC_API_KEY. Ejecuta: npx wrangler secret put ANTHROPIC_API_KEY (pega la key de console.anthropic.com)' };
    return callAnthropic(env.ANTHROPIC_API_KEY, model || 'claude-3-5-sonnet-latest', messages, temperature, maxTokens);
  }
  if (provider === 'gemini' || provider === 'google') {
    const key = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
    if (!key) return { ok: false, status: 500, error: 'Falta GEMINI_API_KEY. Ejecuta: npx wrangler secret put GEMINI_API_KEY (key de aistudio.google.com)' };
    return callGemini(key, model || 'gemini-2.0-flash', messages, temperature, maxTokens);
  }
  if (provider === 'deepseek') {
    if (!env.DEEPSEEK_API_KEY) return { ok: false, status: 500, error: 'Falta DEEPSEEK_API_KEY. Ejecuta: npx wrangler secret put DEEPSEEK_API_KEY' };
    return callOpenAICompatible('https://api.deepseek.com/chat/completions', env.DEEPSEEK_API_KEY, model || 'deepseek-chat', messages, temperature, maxTokens);
  }
  if (provider === 'xai' || provider === 'grok') {
    if (!env.XAI_API_KEY) return { ok: false, status: 500, error: 'Falta XAI_API_KEY. Ejecuta: npx wrangler secret put XAI_API_KEY (console.x.ai)' };
    return callOpenAICompatible('https://api.x.ai/v1/chat/completions', env.XAI_API_KEY, model || 'grok-2-latest', messages, temperature, maxTokens);
  }
  if (!env.GROQ_API_KEY) return { ok: false, status: 500, error: 'GROQ_API_KEY no configurada en el Worker' };
  return callOpenAICompatible(
    'https://api.groq.com/openai/v1/chat/completions',
    env.GROQ_API_KEY,
    model || env.GROQ_MODEL || DEFAULT_MODEL,
    messages,
    temperature,
    maxTokens
  );
}

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

    const url = new URL(request.url);

    if (request.method === 'GET' && (url.pathname === '/api/models' || url.pathname === '/models')) {
      const list = Object.keys(ALLOWED_MODELS).map((id) => ({ id, ...ALLOWED_MODELS[id] }));
      return json(200, { models: list, default: pickModel(null, env) }, origin);
    }

    if (request.method !== 'POST' || (url.pathname !== '/api/chat' && url.pathname !== '/')) {
      return json(404, { error: 'Usa POST /api/chat o GET /api/models' }, origin);
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
      // conservar systems del cliente (contexto) + system oficial Civix
      const clientSystems = messages.filter((m) => m && m.role === 'system');
      const rest = messages.filter((m) => m && m.role !== 'system');
      const uname = (body.userName || '').toString().trim();
      let sys = SYSTEM_CIVIX;
      if (uname) {
        sys += '\n\nEl usuario prefiere que lo llames "' + uname + '". Dirigete a esa persona por su nombre de forma natural.';
      }
      // Búsqueda web opcional
      if (body.webSearch) {
        try {
          const q = lastUserText(rest);
          if (q && typeof webSearch === 'function') {
            const search = await webSearch(q, env);
            const block = formatSearchBlock(search);
            if (block) sys += block;
          }
        } catch (eW) { /* ignore */ }
      }
      messages = [{ role: 'system', content: sys }, ...clientSystems, ...rest];
    }

    const modelId = pickModel(body.model, env);
    const provider = resolveProvider(body, modelId);
    const temperature = mode === 'improve' ? 0.35 : (typeof body.temperature === 'number' ? body.temperature : 0.4);
    const maxTokens = mode === 'improve' ? 800 : (body.max_tokens || 4096);

    let result;
    try {
      result = await dispatchLLM(env, provider, modelId, messages, temperature, maxTokens);
    } catch (e) {
      return json(502, { error: 'No se pudo contactar al proveedor (' + provider + '): ' + (e && e.message ? e.message : e) }, origin);
    }

    if (!result.ok) {
      return json(result.status || 502, { error: result.error || 'Error del proveedor', provider, model: modelId }, origin);
    }

    let content = String(result.content || '');
    if (!content.trim()) {
      return json(502, { error: 'Civix no devolvio texto', provider, model: modelId }, origin);
    }

    if (mode === 'improve') {
      content = content.trim();
      if ((content.startsWith('"') && content.endsWith('"')) || (content.startsWith('«') && content.endsWith('»'))) {
        content = content.slice(1, -1).trim();
      }
    }

    return json(200, { content, provider, model: modelId }, origin);
  },
};
