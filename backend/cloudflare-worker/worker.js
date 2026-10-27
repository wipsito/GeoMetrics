/**
 * GeoMetrics / Civix — Cloudflare Worker (multi-proveedor)
 *
 * Secretos (wrangler secret put NOMBRE):
 *   GROQ_API_KEY       → Groq (gsk_...)
 *   OPENAI_API_KEY     → OpenAI (sk-...)
 *   ANTHROPIC_API_KEY  → Claude
 *   GEMINI_API_KEY     → Google Gemini
 *   DEEPSEEK_API_KEY   → DeepSeek
 *   XAI_API_KEY        → xAI Grok
 *
 * Despliegue:
 *   wrangler secret put GROQ_API_KEY
 *   wrangler secret put OPENAI_API_KEY   (opcional)
 *   ...
 *   wrangler deploy
 */

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
  + '=== NOMBRE DEL USUARIO ===\n'
  + 'Si el mensaje de sistema o el cuerpo indica el primer nombre del usuario, dirigete a esa persona por su primer nombre.\n\n'
  + '=== CONOCIMIENTO ===\n'
  + 'Prioriza textos guia de la materia cuando existan. Tambien puedes usar conocimiento general de ingenieria civil '
  + 'bien establecido (normas, definiciones, metodos estandar). No inventes datos de laboratorio del estudiante. '
  + 'No mezcles autores entre materias distintas.\n\n'
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

/** Inferir proveedor por body.provider o por el id del modelo */
function resolveProvider(body) {
  const p = String(body.provider || '').toLowerCase().trim();
  if (p && p !== 'auto' && p !== 'backend') return p;
  const m = String(body.model || '').toLowerCase();
  if (m.startsWith('gpt-') || m.startsWith('o1') || m.startsWith('o3') || m.includes('chatgpt')) return 'openai';
  if (m.startsWith('claude')) return 'anthropic';
  if (m.startsWith('gemini')) return 'gemini';
  if (m.startsWith('deepseek')) return 'deepseek';
  if (m.startsWith('grok')) return 'xai';
  if (m.includes('llama') || m.includes('gpt-oss') || m.includes('qwen') || m.includes('mixtral') || m.includes('gemma')) return 'groq';
  return 'groq';
}

function openaiStyleMessages(messages) {
  return messages.map((msg) => ({
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
  // Claude: system aparte; roles user/assistant
  let system = '';
  const msgs = [];
  for (const m of messages) {
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
      model: model || 'claude-sonnet-4-5',
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
  // Convertir a contents de Gemini
  let system = '';
  const contents = [];
  for (const m of messages) {
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
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens || 4096,
    },
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }
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
  const text = parts.map((p) => p.text || '').join('');
  return { ok: true, content: text };
}

async function dispatchLLM(env, provider, model, messages, temperature, maxTokens) {
  const p = provider;
  if (p === 'openai') {
    if (!env.OPENAI_API_KEY) return { ok: false, status: 500, error: 'OPENAI_API_KEY no configurada en el Worker' };
    return callOpenAICompatible(
      'https://api.openai.com/v1/chat/completions',
      env.OPENAI_API_KEY,
      model || 'gpt-4o-mini',
      messages,
      temperature,
      maxTokens
    );
  }
  if (p === 'anthropic' || p === 'claude') {
    if (!env.ANTHROPIC_API_KEY) return { ok: false, status: 500, error: 'ANTHROPIC_API_KEY no configurada en el Worker' };
    return callAnthropic(env.ANTHROPIC_API_KEY, model || 'claude-sonnet-4-5', messages, temperature, maxTokens);
  }
  if (p === 'gemini' || p === 'google') {
    const key = env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
    if (!key) return { ok: false, status: 500, error: 'GEMINI_API_KEY no configurada en el Worker' };
    return callGemini(key, model || 'gemini-2.0-flash', messages, temperature, maxTokens);
  }
  if (p === 'deepseek') {
    if (!env.DEEPSEEK_API_KEY) return { ok: false, status: 500, error: 'DEEPSEEK_API_KEY no configurada en el Worker' };
    return callOpenAICompatible(
      'https://api.deepseek.com/chat/completions',
      env.DEEPSEEK_API_KEY,
      model || 'deepseek-chat',
      messages,
      temperature,
      maxTokens
    );
  }
  if (p === 'xai' || p === 'grok') {
    if (!env.XAI_API_KEY) return { ok: false, status: 500, error: 'XAI_API_KEY no configurada en el Worker' };
    return callOpenAICompatible(
      'https://api.x.ai/v1/chat/completions',
      env.XAI_API_KEY,
      model || 'grok-2-latest',
      messages,
      temperature,
      maxTokens
    );
  }
  // groq (default)
  if (!env.GROQ_API_KEY) return { ok: false, status: 500, error: 'GROQ_API_KEY no configurada en el Worker' };
  return callOpenAICompatible(
    'https://api.groq.com/openai/v1/chat/completions',
    env.GROQ_API_KEY,
    model || env.GROQ_MODEL || 'openai/gpt-oss-20b',
    messages,
    temperature,
    maxTokens
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    const url = new URL(request.url);
    if (request.method === 'GET' && (url.pathname === '/api/models' || url.pathname === '/models')) {
      // Catálogo público (sin keys) para el selector del front
      return json(200, {
        providers: [
          { id: 'groq', label: 'Groq', models: [
            { id: 'openai/gpt-oss-20b', label: 'GPT-OSS 20B (rápido)' },
            { id: 'openai/gpt-oss-120b', label: 'GPT-OSS 120B' },
            { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B' },
            { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B Instant' },
            { id: 'qwen/qwen3.8-27b', label: 'Qwen 3.8 27B' },
          ]},
          { id: 'openai', label: 'OpenAI', models: [
            { id: 'gpt-4o-mini', label: 'GPT-4o mini' },
            { id: 'gpt-4o', label: 'GPT-4o' },
            { id: 'gpt-4.1-mini', label: 'GPT-4.1 mini' },
          ]},
          { id: 'anthropic', label: 'Claude', models: [
            { id: 'claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
            { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5' },
          ]},
          { id: 'gemini', label: 'Gemini', models: [
            { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
            { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
          ]},
          { id: 'deepseek', label: 'DeepSeek', models: [
            { id: 'deepseek-chat', label: 'DeepSeek Chat' },
            { id: 'deepseek-reasoner', label: 'DeepSeek Reasoner' },
          ]},
          { id: 'xai', label: 'Grok (xAI)', models: [
            { id: 'grok-2-latest', label: 'Grok 2' },
          ]},
        ],
      }, origin);
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
      messages = messages.filter((m) => m && m.role !== 'system');
      const uname = (body.userName || '').toString().trim();
      let sys = SYSTEM_CIVIX;
      if (uname) {
        sys += '\n\nEl usuario prefiere que lo llames "' + uname + '". Dirígete SIEMPRE a esta persona por ese nombre de forma natural; no uses solo la frase generica "futuro ingeniero" si conoces el nombre.';
      }
      messages = [{ role: 'system', content: sys }, ...messages];
    }

    const provider = resolveProvider(body);
    const model = (body.model || '').toString().trim()
      || (provider === 'openai' ? 'gpt-4o-mini'
        : provider === 'anthropic' ? 'claude-sonnet-4-5'
        : provider === 'gemini' ? 'gemini-2.0-flash'
        : provider === 'deepseek' ? 'deepseek-chat'
        : provider === 'xai' ? 'grok-2-latest'
        : (env.GROQ_MODEL || 'openai/gpt-oss-20b'));

    const temperature = mode === 'improve' ? 0.35 : (typeof body.temperature === 'number' ? body.temperature : 0.4);
    const maxTokens = mode === 'improve' ? 800 : (body.max_tokens || 4096);

    let result;
    try {
      result = await dispatchLLM(env, provider, model, messages, temperature, maxTokens);
    } catch (e) {
      return json(502, { error: 'No se pudo contactar al proveedor (' + provider + '): ' + (e.message || e) }, origin);
    }

    if (!result.ok) {
      return json(result.status || 502, { error: result.error || 'Error del proveedor', provider, model }, origin);
    }

    let content = String(result.content || '');
    if (!content.trim()) {
      return json(502, { error: 'Civix no devolvio texto', provider, model }, origin);
    }

    if (mode === 'improve') {
      content = content.trim();
      if (
        (content.startsWith('"') && content.endsWith('"')) ||
        (content.startsWith('«') && content.endsWith('»'))
      ) {
        content = content.slice(1, -1).trim();
      }
    }

    return json(200, { content, provider, model }, origin);
  },
};
