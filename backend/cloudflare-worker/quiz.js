/**
 * GeoMetrics — calificación segura de quices (Cloudflare Worker).
 *
 * POST /api/quiz/grade   { quizId }   con  Authorization: Bearer <ID token de Firebase>
 *   - Estudiante: cierra sus intentos vencidos y califica sus intentos entregados.
 *   - Docente dueño o administrador: hace lo mismo para todos los estudiantes del quiz.
 * Las claves de respuesta solo se leen aquí, con privilegios de servidor; nunca se envían al navegador.
 *
 * Configuración (wrangler):
 *   secret FIREBASE_SERVICE_ACCOUNT  JSON de una cuenta de servicio de Firebase
 *   var    FIREBASE_PROJECT_ID       ej. geometrics-c9369
 *   var    FIREBASE_DB_URL           ej. https://geometrics-c9369-default-rtdb.firebaseio.com
 * Solo para pruebas locales con emuladores: FIREBASE_EMULATOR=1 y FIREBASE_DB_NS.
 */
const DOMAIN = '@unipamplona.edu.co';
const SUPER_ADMIN = 'andres.enriquezval@unipamplona.edu.co';
const GRACE_MS = 20000; // igual que en las reglas de la base de datos
const JWK_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

export function emailKey(email) {
  return String(email || '').toLowerCase().replace(/\./g, ',').replace(/@/g, '_at_');
}

function b64urlToBytes(s) {
  s = String(s).replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function bytesToB64url(bytes) {
  let bin = '';
  const b = new Uint8Array(bytes);
  for (let i = 0; i < b.length; i++) bin += String.fromCharCode(b[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const enc = (s) => new TextEncoder().encode(s);
const decodeJson = (part) => JSON.parse(new TextDecoder().decode(b64urlToBytes(part)));
const isEmulator = (env) => env.FIREBASE_EMULATOR === '1';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

/* ---------------- verificación del usuario ---------------- */
let jwkCache = { keys: null, until: 0 };
async function googleKeys(force) {
  if (!force && jwkCache.keys && Date.now() < jwkCache.until) return jwkCache.keys;
  const r = await fetch(JWK_URL);
  if (!r.ok) throw new HttpError(503, 'No se pudieron obtener las claves de verificación de Google.');
  const body = await r.json();
  const m = /max-age=(\d+)/.exec(r.headers.get('Cache-Control') || '');
  jwkCache = { keys: body.keys || [], until: Date.now() + (m ? +m[1] * 1000 : 3600000) };
  return jwkCache.keys;
}

export async function verifyIdToken(token, env) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new HttpError(401, 'Sesión inválida.');
  let header, payload;
  try { header = decodeJson(parts[0]); payload = decodeJson(parts[1]); } catch (e) { throw new HttpError(401, 'Sesión inválida.'); }
  if (!isEmulator(env)) {
    if (header.alg !== 'RS256' || !header.kid) throw new HttpError(401, 'Sesión inválida.');
    let keys = await googleKeys(false);
    let jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) { keys = await googleKeys(true); jwk = keys.find((k) => k.kid === header.kid); }
    if (!jwk) throw new HttpError(401, 'Sesión inválida.');
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlToBytes(parts[2]), enc(parts[0] + '.' + parts[1]));
    if (!valid) throw new HttpError(401, 'Sesión inválida.');
  }
  const project = env.FIREBASE_PROJECT_ID;
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== project || payload.iss !== 'https://securetoken.google.com/' + project) throw new HttpError(401, 'Sesión de otro proyecto.');
  if (!(payload.exp > now) || !(payload.iat <= now + 300) || !payload.sub) throw new HttpError(401, 'La sesión expiró. Vuelve a iniciar sesión.');
  const email = String(payload.email || '').toLowerCase();
  if (payload.email_verified !== true || !email.endsWith(DOMAIN)) throw new HttpError(403, 'Se requiere un correo institucional verificado.');
  return { email, key: emailKey(email) };
}

/* ---------------- acceso de servidor a Realtime Database ---------------- */
let tokenCache = { value: null, until: 0 };
async function adminToken(env) {
  if (isEmulator(env)) return 'owner';
  if (tokenCache.value && Date.now() < tokenCache.until) return tokenCache.value;
  let sa;
  try { sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT); } catch (e) { throw new HttpError(500, 'Falta configurar FIREBASE_SERVICE_ACCOUNT en el Worker.'); }
  const iat = Math.floor(Date.now() / 1000);
  const head = bytesToB64url(enc(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const claims = bytesToB64url(enc(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.database https://www.googleapis.com/auth/userinfo.email',
    aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600,
  })));
  const pem = String(sa.private_key || '').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = b64urlToBytes(pem.replace(/\+/g, '-').replace(/\//g, '_'));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc(head + '.' + claims));
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + head + '.' + claims + '.' + bytesToB64url(sig),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new HttpError(500, 'La cuenta de servicio fue rechazada por Google.');
  tokenCache = { value: j.access_token, until: Date.now() + (j.expires_in - 120) * 1000 };
  return tokenCache.value;
}

async function rtdb(env, method, path, body) {
  const base = String(env.FIREBASE_DB_URL || '').replace(/\/$/, '');
  let url = base + '/' + path + '.json';
  if (isEmulator(env)) url += '?ns=' + encodeURIComponent(env.FIREBASE_DB_NS || '');
  const r = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await adminToken(env) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!r.ok) throw new HttpError(502, 'Base de datos: ' + r.status);
  return r.json();
}

/* ---------------- calificación ---------------- */
export function gradeAttempt(meta, questions, keys, attempt, prev) {
  /* modo anticopia: intento anulado → todo en 0, nota final 0 */
  if (attempt && attempt.annulled) {
    const z = {};
    Object.keys(questions || {}).forEach((qid) => { z[qid] = { points: 0, correct: false, answered: false }; });
    return { auto: z, autoPoints: 0, objective: 0, correct: 0, openPending: 0, final: true, points: 0, nota: 0,
      scale: Number(meta.scale) || 5, annulled: true, annulReason: String(attempt.annulled.reason || 'Intento anulado') };
  }
  const auto = {};
  const manual = (prev && prev.manual) || {};
  let autoPoints = 0, manualPoints = 0, openPending = 0, objective = 0, correct = 0;
  const answers = (attempt && attempt.answers) || {};
  Object.keys(questions || {}).forEach((qid) => {
    const q = questions[qid];
    const k = (keys && keys[qid]) || {};
    const has = Object.prototype.hasOwnProperty.call(answers, qid);
    const ans = answers[qid];
    if (q.type === 'mc' || q.type === 'tf') {
      objective++;
      const ok = has && k.correct !== undefined && ans === k.correct;
      if (ok) correct++;
      const pts = ok ? Number(q.points) || 0 : 0;
      auto[qid] = { points: pts, correct: ok, answered: has };
      autoPoints += pts;
    } else if (!has || String(ans).trim() === '') {
      auto[qid] = { points: 0, answered: false }; // abierta sin respuesta: no hay nada que revisar
    } else if (manual[qid] && typeof manual[qid].points === 'number') {
      manualPoints += manual[qid].points;
    } else {
      openPending++;
    }
  });
  const scale = Number(meta.scale) || 5;
  const final = openPending === 0;
  const points = Math.round((autoPoints + manualPoints) * 100) / 100;
  return {
    auto, autoPoints, objective, correct, openPending, final,
    points: final ? points : null,
    nota: final ? Math.round((points / Number(meta.totalPoints)) * scale * 10) / 10 : null,
    scale,
  };
}

function expired(meta, attempt, now) {
  if (!attempt || !attempt.startedAt || attempt.submittedAt) return false;
  const dur = Number(meta.durationMin) || 0;
  return (dur > 0 && now > attempt.startedAt + dur * 60000 + GRACE_MS) || now > Number(meta.closeAt) + GRACE_MS;
}

async function gradeQuiz(env, caller, quizId) {
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(quizId)) throw new HttpError(400, 'Quiz inválido.');
  const meta = await rtdb(env, 'GET', 'quizzes/' + quizId + '/meta');
  if (!meta) throw new HttpError(404, 'El quiz no existe.');
  const isOwner = meta.ownerKey === caller.key;
  const isAdmin = caller.email === SUPER_ADMIN || !!(await rtdb(env, 'GET', 'secure/admins/' + caller.key));
  const all = isOwner || isAdmin;
  const attemptsByStudent = all
    ? (await rtdb(env, 'GET', 'attempts/' + quizId)) || {}
    : { [caller.key]: (await rtdb(env, 'GET', 'attempts/' + quizId + '/' + caller.key)) || {} };
  const [questions, keys, grades] = await Promise.all([
    rtdb(env, 'GET', 'quizzes/' + quizId + '/questions'),
    rtdb(env, 'GET', 'quizKeys/' + quizId),
    all ? rtdb(env, 'GET', 'grades/' + quizId) : rtdb(env, 'GET', 'grades/' + quizId + '/' + caller.key).then((g) => ({ [caller.key]: g })),
  ]);
  const now = Date.now();
  let finalized = 0, graded = 0;
  const mine = [];
  for (const sKey of Object.keys(attemptsByStudent)) {
    const atts = attemptsByStudent[sKey] || {};
    for (const n of Object.keys(atts)) {
      const att = atts[n];
      if (expired(meta, att, now)) {
        await rtdb(env, 'PATCH', 'attempts/' + quizId + '/' + sKey + '/' + n, { submittedAt: { '.sv': 'timestamp' }, autoSubmitted: true });
        att.submittedAt = now;
        finalized++;
      }
      if (!att.submittedAt && !att.annulled) continue;
      const prev = grades && grades[sKey] && grades[sKey][n];
      const r = gradeAttempt(meta, questions, keys, att, prev);
      const g = {
        auto: r.auto, autoPoints: r.autoPoints, objective: r.objective, correct: r.correct,
        openPending: r.openPending, final: r.final, points: r.points, nota: r.nota, scale: r.scale,
        autoGradedAt: { '.sv': 'timestamp' },
      };
      if (r.annulled) { g.annulled = true; g.annulReason = r.annulReason; g.manual = null; }
      await rtdb(env, 'PATCH', 'grades/' + quizId + '/' + sKey + '/' + n, g);
      graded++;
      if (sKey === caller.key) mine.push({ attempt: n, final: r.final, openPending: r.openPending });
    }
  }
  return { ok: true, graded, finalized, mine };
}

export async function handleQuiz(request, env, origin, corsHeaders) {
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(origin) };
  const reply = (status, data) => new Response(JSON.stringify(data), { status, headers });
  try {
    const url = new URL(request.url);
    if (url.pathname === '/api/quiz/status' && request.method === 'GET') {
      return reply(200, { ok: true, configured: isEmulator(env) || !!(env.FIREBASE_SERVICE_ACCOUNT && env.FIREBASE_PROJECT_ID && env.FIREBASE_DB_URL) });
    }
    if (url.pathname !== '/api/quiz/grade' || request.method !== 'POST') return reply(404, { error: 'Ruta no encontrada.' });
    const auth = request.headers.get('Authorization') || '';
    const caller = await verifyIdToken(auth.replace(/^Bearer\s+/i, ''), env);
    let body;
    try { body = await request.json(); } catch (e) { throw new HttpError(400, 'Solicitud inválida.'); }
    return reply(200, await gradeQuiz(env, caller, String(body && body.quizId || '')));
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 500;
    return reply(status, { error: e instanceof HttpError ? e.message : 'Error interno al calificar.' });
  }
}
