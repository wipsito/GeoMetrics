// Prueba del calificador del Worker contra los emuladores, con usuarios y reglas reales.
import { user, admin, reset, ok, ref, get, set, update, serverTimestamp } from './h.mjs';
import { pathToFileURL } from 'node:url';

const R = [];
function expect(name, cond, info = '') { R.push(cond); console.log((cond ? 'OK    ' : 'FALLA ') + name + (cond ? '' : '  ' + info)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 'http://127.0.0.1:8787/api/quiz/grade';
async function grade(u, quizId, token) {
  const t = token || await u.auth.currentUser.getIdToken();
  const r = await fetch(W, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t, Origin: 'http://127.0.0.1:5500' }, body: JSON.stringify({ quizId }) });
  return { status: r.status, body: await r.json(), cors: r.headers.get('access-control-allow-origin') };
}

await reset();
const SUPER = await user('andres.enriquezval@unipamplona.edu.co');
const DOC = await user('docente.uno@unipamplona.edu.co');
const EST = await user('est.uno@unipamplona.edu.co');
const EST2 = await user('est.dos@unipamplona.edu.co');
const OUT = await user('intruso@gmail.com');
await set(ref(SUPER.db, 'secure/docentes/' + DOC.key), DOC.email);
const C = 'resistencia-de-materiales__b';
await set(ref(DOC.db, 'quizTeach/' + DOC.key + '/' + C), true);
const now = Date.now();
const meta = { title: 'Parcial corto', courseKey: C, ownerKey: DOC.key, ownerName: 'Doc', status: 'published', publishAt: now - 1000, closeAt: now + 3600000, durationMin: 20, maxAttempts: 1, totalPoints: 10, version: 1, attemptKeys: { a0: true }, showScore: true, feedbackAfterClose: false, scale: 5 };
const questions = { q1: { type: 'mc', text: 'mc', points: 4, order: 0, options: { A: '1', B: '2', C: '3', D: '4' } }, q2: { type: 'tf', text: 'tf', points: 3, order: 1 }, q3: { type: 'open', text: 'open', points: 3, order: 2 } };
await update(ref(DOC.db, 'quizzes/qg1'), { meta, questions });
await set(ref(DOC.db, 'quizKeys/qg1'), { q1: { correct: 'C' }, q2: { correct: false }, q3: { criteria: 'X' } });
for (const s of [EST, EST2]) await set(ref(s.db, 'quizEnroll/' + C + '/' + s.key), { nombre: s.email });

// Estudiante 1: ABCD correcta, V/F incorrecta, abierta respondida
const A1 = 'attempts/qg1/' + EST.key + '/a0';
await update(ref(EST.db, A1), { startedAt: serverTimestamp(), version: 1 });
await set(ref(EST.db, A1 + '/answers/q1'), 'C');
await set(ref(EST.db, A1 + '/answers/q2'), true);
await set(ref(EST.db, A1 + '/answers/q3'), 'Respuesta abierta');
await set(ref(EST.db, A1 + '/submittedAt'), serverTimestamp());

// Seguridad del endpoint
let r = await grade(EST, 'qg1', 'a.b.c');
expect('token basura rechazado (401)', r.status === 401, JSON.stringify(r));
r = await grade(OUT, 'qg1');
expect('correo externo rechazado (403)', r.status === 403, JSON.stringify(r));
r = await grade(EST, '../users');
expect('id de quiz con ruta maliciosa rechazado (400)', r.status === 400, JSON.stringify(r));
const [h, p] = (await EST.auth.currentUser.getIdToken()).split('.');
const forged = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url') + '.' + p + '.';
const prod = (await import(pathToFileURL(process.argv[2]).href));
let prodErr = null;
try { await prod.verifyIdToken(forged, { FIREBASE_PROJECT_ID: 'demo-geometrics' }); } catch (e) { prodErr = e.status; }
expect('en producción un token sin firma se rechaza', prodErr === 401, String(prodErr));
expect('CORS permite la página de GeoMetrics', r.cors === 'http://127.0.0.1:5500', String(r.cors));

// Calificación automática pedida por el estudiante
r = await grade(EST, 'qg1');
expect('el estudiante pide su calificación (200)', r.status === 200, JSON.stringify(r));
const g1 = await admin('GET', 'grades/qg1/' + EST.key + '/a0');
expect('ABCD correcta suma 4, V/F incorrecta 0', g1.autoPoints === 4 && g1.auto.q1.correct === true && g1.auto.q2.correct === false, JSON.stringify(g1));
expect('la abierta queda pendiente de calificación docente', g1.openPending === 1 && g1.final === false && g1.points == null && g1.nota == null, JSON.stringify(g1));
expect('la respuesta del estudiante no recibe la clave', !JSON.stringify(r.body).includes('"C"') && !('keys' in r.body), JSON.stringify(r.body));
expect('el estudiante no ve una nota que no es final', !(await ok(get(ref(EST.db, 'grades/qg1/' + EST.key + '/a0')))));

// El docente califica la abierta y se recalcula
await set(ref(DOC.db, 'grades/qg1/' + EST.key + '/a0/manual/q3'), { points: 2.5, comment: 'Bien argumentado' });
r = await grade(DOC, 'qg1');
const g2 = await admin('GET', 'grades/qg1/' + EST.key + '/a0');
expect('con la abierta calificada la nota es final: 6.5 pts → 3.3', g2.final === true && g2.points === 6.5 && g2.nota === 3.3, JSON.stringify(g2));
expect('se conserva la observación del docente', g2.manual && g2.manual.q3.comment === 'Bien argumentado');
expect('el estudiante ya ve su nota final', await ok(get(ref(EST.db, 'grades/qg1/' + EST.key + '/a0'))));

// Estudiante que abandona: el intento vencido se cierra solo y se califica lo guardado
const now2 = Date.now();
await update(ref(DOC.db, 'quizzes/qg2'), { meta: { ...meta, closeAt: now2 + 3000 }, questions });
await set(ref(DOC.db, 'quizKeys/qg2'), { q1: { correct: 'A' }, q2: { correct: true } });
const B = 'attempts/qg2/' + EST2.key + '/a0';
await update(ref(EST2.db, B), { startedAt: serverTimestamp(), version: 1 });
await set(ref(EST2.db, B + '/answers/q1'), 'A');
console.log('… esperando a que venza el quiz (25 s)');
await sleep(25000);
r = await grade(EST, 'qg2');
expect('otro estudiante no puede cerrar intentos ajenos', (await admin('GET', B + '/submittedAt')) === null, JSON.stringify(r));
r = await grade(DOC, 'qg2');
const att = await admin('GET', B);
const g3 = await admin('GET', 'grades/qg2/' + EST2.key + '/a0');
expect('el docente cierra el intento vencido', r.body.finalized === 1 && att.autoSubmitted === true && att.submittedAt > 0, JSON.stringify(r.body));
expect('se califica lo guardado: 4 pts, sin respuesta en V/F y abierta', g3.autoPoints === 4 && g3.final === true && g3.points === 4 && g3.auto.q3.answered === false, JSON.stringify(g3));
r = await grade(DOC, 'qg2');
const g4 = await admin('GET', 'grades/qg2/' + EST2.key + '/a0');
expect('recalificar es idempotente (no duplica)', r.body.finalized === 0 && g4.points === 4, JSON.stringify(r.body));

for (const u of [SUPER, DOC, EST, EST2, OUT]) await u.close();
const bad = R.filter((x) => !x).length;
console.log(`\nRESUMEN: ${R.length - bad} de ${R.length} correctas`);
process.exit(bad ? 1 : 0);
