// Pruebas de las reglas reales contra el emulador. Cada caso dice qué debe pasar.
import { user, anon, admin, reset, ok, ref, get, set, update, serverTimestamp } from './h.mjs';

const R = [];
function expect(name, got, want) { R.push([name, got === want]); console.log((got === want ? 'OK    ' : 'FALLA ') + name + (got === want ? '' : `  (obtuvo ${got}, esperaba ${want})`)); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

await reset();
await admin('PUT', 'users/x_at_unipamplona,edu,co', { email: 'x@unipamplona.edu.co', nombre: 'X' });

const SUPER = await user('andres.enriquezval@unipamplona.edu.co');
const DOC = await user('docente.uno@unipamplona.edu.co');
const DOC2 = await user('docente.dos@unipamplona.edu.co');
const DOC3 = await user('docente.tres@unipamplona.edu.co');
const EST = await user('est.uno@unipamplona.edu.co');
const EST2 = await user('est.dos@unipamplona.edu.co');
const OUT = await user('intruso@gmail.com');
const UNV = await user('sinverificar@unipamplona.edu.co', { verified: false });
const ANON = await anon();

// 1. Nodos existentes
expect('anónimo no lee users', await ok(get(ref(ANON.db, 'users'))), false);
expect('sin verificar no lee users', await ok(get(ref(UNV.db, 'users'))), false);
expect('correo externo no lee users', await ok(get(ref(OUT.db, 'users'))), false);
expect('estudiante verificado lee users', await ok(get(ref(EST.db, 'users'))), true);
expect('no se puede guardar password en users', await ok(set(ref(EST.db, 'users/' + EST.key), { email: EST.email, password: '123456' })), false);
expect('perfil sin password sí se guarda', await ok(set(ref(EST.db, 'users/' + EST.key), { email: EST.email, nombre: 'Est Uno' })), true);
expect('anónimo lee teamCreators (pantalla pública)', await ok(get(ref(ANON.db, 'teamCreators'))), true);
expect('estudiante no escribe config', await ok(set(ref(EST.db, 'config/civixAvatar'), 'x')), false);
expect('nodo viejo quices cerrado', await ok(get(ref(EST.db, 'quices'))), false);

// 2. Roles de confianza
expect('estudiante no se autoriza como docente', await ok(set(ref(EST.db, 'secure/docentes/' + EST.key), EST.email)), false);
expect('superadmin autoriza docente', await ok(set(ref(SUPER.db, 'secure/docentes/' + DOC.key), DOC.email)), true);
expect('superadmin nombra admin', await ok(set(ref(SUPER.db, 'secure/admins/' + DOC2.key), DOC2.email)), true);
expect('admin (no super) no nombra admins', await ok(set(ref(DOC2.db, 'secure/admins/' + EST.key), EST.email)), false);
expect('admin autoriza docente', await ok(set(ref(DOC2.db, 'secure/docentes/' + DOC2.key), DOC2.email)), true);
expect('docente lee su propia autorización', await ok(get(ref(DOC.db, 'secure/docentes/' + DOC.key))), true);
await set(ref(SUPER.db, 'secure/docentes/' + DOC3.key), DOC3.email);
expect('estudiante no lee secure', await ok(get(ref(EST.db, 'secure'))), false);

// 3. Creación del quiz
const C = 'mecanica-de-suelos-i__a';
const now = Date.now();
const meta = { title: 'Quiz 1', courseKey: C, ownerKey: DOC.key, ownerName: 'Docente Uno', status: 'draft', publishAt: now - 60000, closeAt: now + 3600000, durationMin: 30, maxAttempts: 2, totalPoints: 10, version: 1, attemptKeys: { a0: true, a1: true }, attemptPrev: { a1: 'a0' }, showScore: true, feedbackAfterClose: true };
const questions = { q1: { type: 'mc', text: '¿A?', points: 4, order: 0, options: { A: 'a', B: 'b', C: 'c', D: 'd' } }, q2: { type: 'tf', text: '¿V?', points: 3, order: 1 }, q3: { type: 'open', text: 'Explica', points: 3, order: 2, maxChars: 500 } };
expect('estudiante no crea quiz', await ok(update(ref(EST.db, 'quizzes/qz1'), { meta: { ...meta, ownerKey: EST.key }, questions })), false);
expect('docente sin la materia registrada no crea quiz', await ok(update(ref(DOC.db, 'quizzes/qz1'), { meta, questions })), false);
expect('docente registra su materia', await ok(set(ref(DOC.db, 'quizTeach/' + DOC.key + '/' + C), true)), true);
expect('estudiante no se registra como profesor de una materia', await ok(set(ref(EST.db, 'quizTeach/' + EST.key + '/' + C), true)), false);
expect('pregunta con la respuesta dentro es rechazada', await ok(update(ref(DOC.db, 'quizzes/qz1'), { meta, questions: { ...questions, q1: { ...questions.q1, correct: 'B' } } })), false);
expect('docente crea quiz (borrador)', await ok(update(ref(DOC.db, 'quizzes/qz1'), { meta, questions })), true);
expect('docente guarda claves aparte', await ok(set(ref(DOC.db, 'quizKeys/qz1'), { q1: { correct: 'B', explanation: 'porque sí' }, q2: { correct: true }, q3: { criteria: 'menciona X' } })), true);
expect('otro docente no edita el quiz ajeno', await ok(update(ref(DOC2.db, 'quizzes/qz1/meta'), { ...meta, ownerKey: DOC2.key })), false);
expect('docente indexa el quiz en su curso', await ok(set(ref(DOC.db, 'quizIndex/' + C + '/qz1'), true)), true);
expect('docente ajeno no indexa el quiz', await ok(set(ref(DOC2.db, 'quizIndex/' + C + '/qz9'), true)), false);

// 4. Visibilidad para estudiantes
expect('estudiante no inscrito no lee el índice', await ok(get(ref(EST.db, 'quizIndex/' + C))), false);
expect('estudiante se inscribe a sí mismo', await ok(set(ref(EST.db, 'quizEnroll/' + C + '/' + EST.key), { nombre: 'Est Uno' })), true);
expect('estudiante no inscribe a otro', await ok(set(ref(EST.db, 'quizEnroll/' + C + '/' + EST2.key), { nombre: 'X' })), false);
expect('estudiante inscrito lee el índice', await ok(get(ref(EST.db, 'quizIndex/' + C))), true);
expect('estudiante no ve el borrador', await ok(get(ref(EST.db, 'quizzes/qz1'))), false);
expect('estudiante no lee claves', await ok(get(ref(EST.db, 'quizKeys/qz1'))), false);
expect('estado inválido rechazado', await ok(set(ref(DOC.db, 'quizzes/qz1/meta/status'), 'publicadisimo')), false);
expect('docente publica (meta completa)', await ok(set(ref(DOC.db, 'quizzes/qz1/meta'), { ...meta, status: 'published' })), true);
expect('estudiante inscrito ve el quiz publicado', await ok(get(ref(EST.db, 'quizzes/qz1'))), true);
expect('estudiante no inscrito no ve el quiz', await ok(get(ref(EST2.db, 'quizzes/qz1'))), false);
expect('estudiante sigue sin leer claves', await ok(get(ref(EST.db, 'quizKeys/qz1'))), false);

// 5. Intentos
const A = 'attempts/qz1/' + EST.key;
expect('no se acepta una hora de inicio inventada', await ok(set(ref(EST.db, A + '/a0/startedAt'), now - 3600000)), false);
expect('el segundo intento no puede empezar antes del primero', await ok(set(ref(EST.db, A + '/a1/startedAt'), serverTimestamp())), false);
expect('intento fuera de los permitidos', await ok(set(ref(EST.db, A + '/a5/startedAt'), serverTimestamp())), false);
expect('inicia intento con hora del servidor', await ok(update(ref(EST.db, A + '/a0'), { startedAt: serverTimestamp(), version: 1, name: 'Est Uno' })), true);
expect('no puede reiniciar el reloj', await ok(set(ref(EST.db, A + '/a0/startedAt'), serverTimestamp())), false);
expect('guarda respuesta ABCD', await ok(set(ref(EST.db, A + '/a0/answers/q1'), 'B')), true);
expect('rechaza opción inexistente', await ok(set(ref(EST.db, A + '/a0/answers/q1'), 'E')), false);
expect('guarda falso/verdadero', await ok(set(ref(EST.db, A + '/a0/answers/q2'), false)), true);
expect('rechaza respuesta abierta más larga que el límite', await ok(set(ref(EST.db, A + '/a0/answers/q3'), 'x'.repeat(600))), false);
expect('guarda respuesta abierta', await ok(set(ref(EST.db, A + '/a0/answers/q3'), 'Porque X')), true);
expect('rechaza respuesta a pregunta inexistente', await ok(set(ref(EST.db, A + '/a0/answers/q99'), 'A')), false);
expect('otro estudiante no escribe en mi intento', await ok(set(ref(EST2.db, A + '/a0/answers/q1'), 'A')), false);
expect('otro estudiante no lee mi intento', await ok(get(ref(EST2.db, A))), false);
expect('docente dueño lee los intentos', await ok(get(ref(DOC.db, 'attempts/qz1'))), true);
expect('docente ajeno (no admin) no lee los intentos', await ok(get(ref(DOC3.db, 'attempts/qz1'))), false);
expect('docente ajeno (no admin) no lee las claves', await ok(get(ref(DOC3.db, 'quizKeys/qz1'))), false);
expect('docente ajeno (no admin) no lee notas', await ok(get(ref(DOC3.db, 'grades/qz1'))), false);

// 6. Protección de evaluaciones en curso
expect('no se editan preguntas con intentos', await ok(set(ref(DOC.db, 'quizzes/qz1/questions/q1/text'), 'cambiada')), false);
expect('no cambia la duración con intentos', await ok(set(ref(DOC.db, 'quizzes/qz1/meta'), { ...meta, status: 'published', durationMin: 5 })), false);
expect('no cambia las claves con intentos', await ok(set(ref(DOC.db, 'quizKeys/qz1/q1/correct'), 'A')), false);
expect('no se borra un quiz con intentos', await ok(set(ref(DOC.db, 'quizzes/qz1'), null)), false);
expect('sí puede ampliar el cierre', await ok(set(ref(DOC.db, 'quizzes/qz1/meta'), { ...meta, status: 'published', closeAt: now + 7200000 })), true);

// 7. Entrega
expect('entrega con hora del servidor', await ok(set(ref(EST.db, A + '/a0/submittedAt'), serverTimestamp())), true);
expect('entrega duplicada rechazada', await ok(set(ref(EST.db, A + '/a0/submittedAt'), serverTimestamp())), false);
expect('no modifica respuestas tras entregar', await ok(set(ref(EST.db, A + '/a0/answers/q1'), 'C')), false);
expect('tras entregar puede iniciar el 2.º intento', await ok(update(ref(EST.db, A + '/a1'), { startedAt: serverTimestamp(), version: 1 })), true);

// 8. Calificaciones
const G = 'grades/qz1/' + EST.key + '/a0';
expect('estudiante no se pone nota', await ok(set(ref(EST.db, G), { final: true, points: 10 })), false);
expect('docente no asigna más puntos que la pregunta', await ok(set(ref(DOC.db, G + '/manual/q3/points'), 7)), false);
expect('docente califica la abierta', await ok(set(ref(DOC.db, G + '/manual/q3'), { points: 2, comment: 'Bien' })), true);
expect('estudiante no ve nota no final', await ok(get(ref(EST.db, G))), false);
expect('docente publica nota final', await ok(update(ref(DOC.db, G), { final: true, points: 9, nota: 4.5 })), true);
expect('estudiante ve su nota final', await ok(get(ref(EST.db, G))), true);
expect('otro estudiante no ve esa nota', await ok(get(ref(EST2.db, G))), false);

// 9. Tiempo agotado y cierre
const now2 = Date.now();
await ok(update(ref(DOC.db, 'quizzes/qz2'), { meta: { ...meta, status: 'published', closeAt: now2 + 4000, publishAt: now2 - 1000 }, questions }));
await ok(set(ref(DOC.db, 'quizIndex/' + C + '/qz2'), true));
const B = 'attempts/qz2/' + EST.key + '/a0';
expect('inicia antes del cierre', await ok(update(ref(EST.db, B), { startedAt: serverTimestamp(), version: 1 })), true);
console.log('… esperando 26 s a que venza (cierre + margen de 20 s)');
await sleep(26000);
expect('respuesta después del cierre rechazada', await ok(set(ref(EST.db, B + '/answers/q1'), 'A')), false);
expect('nadie inicia después del cierre', await ok(update(ref(EST2.db, 'attempts/qz2/' + EST2.key + '/a0'), { startedAt: serverTimestamp(), version: 1 })), false);
expect('la entrega tardía queda registrada (se califica lo guardado a tiempo)', await ok(set(ref(EST.db, B + '/submittedAt'), serverTimestamp())), true);
expect('tras el cierre, con retroalimentación activada, lee claves', await ok(get(ref(EST.db, 'quizKeys/qz2'))), true);
expect('el que no presentó no lee claves', await ok(get(ref(EST2.db, 'quizKeys/qz2'))), false);

for (const u of [SUPER, DOC, DOC2, DOC3, EST, EST2, OUT, UNV, ANON]) await u.close();
const bad = R.filter((r) => !r[1]);
console.log(`\nRESUMEN: ${R.length - bad.length} de ${R.length} correctas`);
process.exit(bad.length ? 1 : 0);
