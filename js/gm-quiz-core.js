/**
 * GeoMetrics — Quices y evaluaciones: acceso a datos (Firebase Realtime Database).
 *
 * Estructura (las reglas de firebase/database.rules.json imponen quién lee y escribe):
 *   quizzes/{qid}/meta        datos generales (sin claves)            quizzes/{qid}/questions/{pid}  preguntas visibles
 *   quizKeys/{qid}/{pid}      respuestas correctas y criterios (solo el docente; el estudiante tras el cierre si se permite)
 *   quizIndex/{curso}/{qid}   qué quices tiene cada curso              quizOwner/{docente}/{qid}       quices del docente
 *   quizEnroll/{curso}/{est}  estudiantes del curso                    quizTeach/{docente}/{curso}     cursos del docente
 *   attempts/{qid}/{est}/{aN} intento: inicio (hora del servidor), respuestas, entrega
 *   grades/{qid}/{est}/{aN}   calificación automática (Worker) y manual (docente)
 *   quizSettings/{docente}    valores por defecto del docente
 */
(function (global) {
    'use strict';
    var offset = 0, offsetBound = false, connected = true;
    var GRACE_MS = 20000;

    function db() {
        if (!global.GeoCloud || !GeoCloud.authed || !GeoCloud.authed()) return Promise.reject(new Error('Inicia sesión con tu correo institucional verificado.'));
        return GeoCloud.init().then(function (d) {
            if (!d) throw new Error('No hay conexión con la base de datos.');
            if (!offsetBound) {
                offsetBound = true;
                d.ref('.info/serverTimeOffset').on('value', function (s) { offset = s.val() || 0; });
                d.ref('.info/connected').on('value', function (s) {
                    connected = !!s.val();
                    try { global.dispatchEvent(new CustomEvent('geoquiz-connection', { detail: { connected: connected } })); } catch (e) {}
                });
            }
            return d;
        });
    }
    function key(email) { return String(email || '').toLowerCase().replace(/\./g, ',').replace(/@/g, '_at_'); }
    function myEmail() { return global.GeoAuth ? GeoAuth.email() : ''; }
    function myKey() { return key(myEmail()); }
    function now() { return Date.now() + offset; }
    function slug(s) {
        s = String(s || '').toLowerCase();
        if (s.normalize) s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
        return s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'x';
    }
    function courseKey(materia, grupo) {
        var g = String(grupo || '').trim();
        return slug(materia) + '__' + (g && !/^todos?$/i.test(g) ? slug(g) : 'todos');
    }
    function grupos(m) {
        if (m.grupos && m.grupos.length) return m.grupos.map(function (g) { return String(g).trim().toUpperCase(); }).filter(Boolean);
        return String(m.grupo || '').split(/[,;]/).map(function (g) { return g.trim().toUpperCase(); }).filter(Boolean);
    }
    /** Cursos de un usuario: materia+grupo y la materia completa («Todos los grupos»). */
    function coursesOf(user) {
        var out = {}, list = [];
        try { list = global.aulaMateriasUsuario ? global.aulaMateriasUsuario(user) : (user.materias || []); } catch (e) { list = []; }
        (list || []).forEach(function (m) {
            if (!m || !m.nombre) return;
            out[courseKey(m.nombre, '')] = { materia: m.nombre, grupo: 'Todos' };
            grupos(m).forEach(function (g) { out[courseKey(m.nombre, g)] = { materia: m.nombre, grupo: g }; });
        });
        return out;
    }
    function uid(prefix) {
        var b = new Uint8Array(9);
        (global.crypto || global.msCrypto).getRandomValues(b);
        return (prefix || '') + Date.now().toString(36) + Array.prototype.map.call(b, function (x) { return (x % 36).toString(36); }).join('');
    }
    function val(p) { return p.then(function (s) { return s.exists() ? s.val() : null; }); }
    function read(path) {
        return db().then(function (d) { return val(d.ref(path).once('value')); });
    }
    /** Lectura que tolera «sin permiso» (devuelve null): útil para listas filtradas por reglas. */
    function readOrNull(path) {
        return read(path).catch(function (e) { if (/permission/i.test(String(e && (e.code || e.message)))) return null; throw e; });
    }

    /* ---------------- sesión ---------------- */
    function alIniciarSesion(user) {
        if (!user || !global.GeoAuth || !GeoAuth.verified()) return Promise.resolve();
        return db().then(function (d) {
            var me = myKey(), courses = coursesOf(user), jobs = [];
            var nombre = String(user.nombre || ((user.nombres || '') + ' ' + (user.apellidos || '')) || myEmail()).trim().slice(0, 110);
            Object.keys(courses).forEach(function (c) {
                if (user.rol === 'docente') jobs.push(d.ref('quizTeach/' + me + '/' + c).set(true).catch(function () {}));
                else jobs.push(d.ref('quizEnroll/' + c + '/' + me).set({ nombre: nombre, email: myEmail(), codigo: String(user.codigo || '').slice(0, 30), materia: courses[c].materia, grupo: courses[c].grupo }).catch(function () {}));
            });
            return Promise.all(jobs);
        }).then(function () {
            if (user.rol === 'docente' || user.rol === 'admin' || user.rol === 'administrador') watchTeacher();
        }).catch(function (e) { console.warn('[GeoQuiz] alIniciarSesion', e && e.message); });
    }

    /* Quita los «(copia)» que se acumulaban al duplicar quices */
    function limpiarTitulo(t) { var c = String(t || '').replace(/(\s*\((copia|copy)\))+\s*$/i, '').trim(); return c || String(t || ''); }
    function limpiarMeta(m) { if (m && typeof m.title === 'string') m.title = limpiarTitulo(m.title); return m; }
    /* Color de la nota (escala 0–5): rojo < 3,0 · amarillo 3,0–3,9 · verde ≥ 4,0 */
    function claseNota(nota, scale) {
        var n = Number(nota); if (!isFinite(n)) return '';
        var s = Number(scale) || 5; if (s !== 5) n = n * 5 / s;
        n = Math.round(n * 10) / 10;
        return n < 3 ? 'gq-nota-baja' : n < 4 ? 'gq-nota-media' : 'gq-nota-alta';
    }

    /* ---------------- docente ---------------- */
    function listMine() {
        return db().then(function (d) {
            return val(d.ref('quizOwner/' + myKey()).once('value')).then(function (idx) {
                var ids = Object.keys(idx || {});
                return Promise.all(ids.map(function (id) {
                    return Promise.all([readOrNull('quizzes/' + id + '/meta'), readOrNull('attempts/' + id)]).then(function (r) {
                        if (!r[0]) return null;
                        limpiarMeta(r[0]);
                        var started = 0, submitted = 0;
                        Object.keys(r[1] || {}).forEach(function (s) {
                            Object.keys(r[1][s] || {}).forEach(function (n) { started++; if (r[1][s][n].submittedAt) submitted++; });
                        });
                        return { id: id, meta: r[0], started: started, submitted: submitted, students: Object.keys(r[1] || {}).length };
                    });
                }));
            }).then(function (l) { return l.filter(Boolean).sort(function (a, b) { return (b.meta.updatedAt || 0) - (a.meta.updatedAt || 0); }); });
        });
    }
    function loadQuiz(id) {
        return Promise.all([read('quizzes/' + id), readOrNull('quizKeys/' + id), readOrNull('attempts/' + id)]).then(function (r) {
            if (!r[0]) throw new Error('El quiz no existe o no tienes acceso.');
            return { id: id, meta: limpiarMeta(r[0].meta), questions: r[0].questions || {}, keys: r[1] || {}, hasAttempts: !!r[2] };
        });
    }
    function attemptMaps(max) {
        var keys = {}, prev = {};
        for (var i = 0; i < max; i++) { keys['a' + i] = true; if (i) prev['a' + i] = 'a' + (i - 1); }
        return { keys: keys, prev: prev };
    }
    /**
     * Guarda el quiz completo (crear o actualizar). Si ya hay intentos solo cambia los datos generales
     * permitidos: las preguntas y claves quedan protegidas por las reglas.
     */
    function saveQuiz(id, meta, questions, keys, opts) {
        opts = opts || {};
        return db().then(function (d) {
            var me = myKey();
            var am = attemptMaps(Math.max(1, Math.min(9, +meta.maxAttempts || 1)));
            var m = Object.assign({}, meta, {
                ownerKey: me,
                courseKey: courseKey(meta.materia, meta.grupo),
                attemptKeys: am.keys, attemptPrev: am.prev,
                updatedAt: firebase.database.ServerValue.TIMESTAMP
            });
            if (!m.createdAt) m.createdAt = firebase.database.ServerValue.TIMESTAMP;
            var p = opts.locked
                ? d.ref('quizzes/' + id + '/meta').set(m)
                : d.ref('quizzes/' + id).update({ meta: m, questions: questions }).then(function () { return d.ref('quizKeys/' + id).set(keys || {}); });
            return p.then(function () { return d.ref('quizOwner/' + me + '/' + id).set(true); })
                .then(function () { return d.ref('quizIndex/' + m.courseKey + '/' + id).set(true); })
                .then(function () { return id; });
        });
    }
    function removeQuiz(id, courseK) {
        // Orden importante: las reglas verifican la propiedad mirando el quiz, así que se borra al final.
        return db().then(function (d) {
            return (courseK ? d.ref('quizIndex/' + courseK + '/' + id).remove() : Promise.resolve())
                /* intentos y notas de los estudiantes (el docente dueño solo puede borrarlos, no modificarlos) */
                .then(function () { return d.ref('grades/' + id).remove(); })
                .then(function () { return d.ref('attempts/' + id).remove(); })
                .then(function () { return d.ref('quizKeys/' + id).remove(); })
                .then(function () { return d.ref('quizzes/' + id).remove(); })
                .then(function () { return d.ref('quizOwner/' + myKey() + '/' + id).remove(); });
        });
    }
    function setMetaFields(id, fields) {
        return read('quizzes/' + id + '/meta').then(function (m) {
            return db().then(function (d) { return d.ref('quizzes/' + id + '/meta').set(Object.assign(m, fields, { updatedAt: firebase.database.ServerValue.TIMESTAMP })); });
        });
    }
    function results(id) {
        return Promise.all([read('quizzes/' + id), readOrNull('quizKeys/' + id), readOrNull('attempts/' + id), readOrNull('grades/' + id)]).then(function (r) {
            var meta = limpiarMeta(r[0].meta);
            return readOrNull('quizEnroll/' + meta.courseKey).then(function (roster) {
                return { id: id, meta: meta, questions: r[0].questions || {}, keys: r[1] || {}, attempts: r[2] || {}, grades: r[3] || {}, roster: roster || {} };
            });
        });
    }
    /** Resumen de la nota con las mismas reglas que el Worker (auto + manual). */
    function summarize(meta, questions, attempt, grade) {
        if (attempt && attempt.annulled) return { points: 0, nota: 0, openPending: 0, final: true, partial: 0, annulled: true, reason: String(attempt.annulled.reason || '') };
        var auto = (grade && grade.auto) || {}, manual = (grade && grade.manual) || {}, answers = (attempt && attempt.answers) || {};
        var pts = 0, pending = 0;
        Object.keys(questions || {}).forEach(function (q) {
            var t = questions[q].type, has = Object.prototype.hasOwnProperty.call(answers, q) && String(answers[q]).trim() !== '';
            if (t === 'open') {
                if (!has) return;
                if (manual[q] && typeof manual[q].points === 'number') pts += manual[q].points; else pending++;
            } else if (auto[q]) pts += Number(auto[q].points) || 0;
        });
        var scale = Number(meta.scale) || 5, final = pending === 0 && !!(grade && grade.auto);
        pts = Math.round(pts * 100) / 100;
        return { points: final ? pts : null, nota: final ? Math.round(pts / Number(meta.totalPoints) * scale * 10) / 10 : null, openPending: pending, final: final, partial: pts };
    }
    function saveManual(id, sKey, n, qid, points, comment, meta, questions, attempt, grade) {
        return db().then(function (d) {
            var g = Object.assign({}, grade || {});
            g.manual = Object.assign({}, g.manual || {});
            g.manual[qid] = { points: Number(points), comment: String(comment || '').slice(0, 2000) };
            var s = summarize(meta, questions, attempt, g);
            var upd = {};
            upd['manual/' + qid] = g.manual[qid];
            upd.openPending = s.openPending;
            upd.final = s.final;
            upd.points = s.points;
            upd.nota = s.nota;
            upd.gradedAt = firebase.database.ServerValue.TIMESTAMP;
            return d.ref('grades/' + id + '/' + sKey + '/' + n).update(upd).then(function () { return s; });
        });
    }
    function settings() { return readOrNull('quizSettings/' + myKey()); }
    function saveSettings(s) { return db().then(function (d) { return d.ref('quizSettings/' + myKey()).set(s); }); }

    /* ---------------- calificador (Cloudflare Worker) ---------------- */
    function graderBase() {
        try { if (global.localStorage.getItem('gm_quiz_grader')) return global.localStorage.getItem('gm_quiz_grader'); } catch (e) {}
        if (global.GeoAuth && GeoAuth.EMULATOR) return 'http://127.0.0.1:8787';
        if (typeof QUIZ_CONFIG !== 'undefined' && QUIZ_CONFIG.graderUrl) return QUIZ_CONFIG.graderUrl;
        try { return new URL(AI_CONFIG.backendUrl).origin; } catch (e) { return ''; }
    }
    function gradeWorker(id) {
        var base = graderBase();
        if (!base) return Promise.reject(new Error('No hay calificador configurado.'));
        return GeoAuth.token().then(function (t) {
            return fetch(base.replace(/\/$/, '') + '/api/quiz/grade', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t },
                body: JSON.stringify({ quizId: id })
            });
        }).then(function (r) {
            return r.json().catch(function () { return {}; }).then(function (j) {
                if (!r.ok) throw new Error(j.error || ('El calificador respondió ' + r.status));
                return j;
            });
        });
    }

    /* ---------------- calificación automática en el navegador del docente ----------------
       Mismas reglas que el Worker (quiz.js → gradeAttempt):
       · selección múltiple y falso/verdadero: se califican solas comparando con la clave;
         cada acierto suma el puntaje de la pregunta (1 por defecto → la nota es
         proporcional a la cantidad de preguntas acertadas);
       · abiertas: quedan pendientes hasta que el docente las califica.
       Solo el docente dueño del quiz puede leer las claves y escribir en grades/{quiz}
       (reglas de Firebase), así que esto corre en su sesión. */
    function calcular(meta, questions, keys, attempt, prev) {
        /* intento anulado por el modo anticopia: todo vale 0 y la nota es final */
        if (attempt && attempt.annulled) {
            var z = {};
            Object.keys(questions || {}).forEach(function (qid) { z[qid] = { points: 0, correct: false, answered: false }; });
            return { auto: z, autoPoints: 0, objective: 0, correct: 0, openPending: 0, final: true, points: 0, nota: 0, scale: Number(meta.scale) || 5,
                annulled: true, annulReason: String(attempt.annulled.reason || 'Intento anulado') };
        }
        var auto = {}, manual = (prev && prev.manual) || {}, answers = (attempt && attempt.answers) || {};
        var autoPoints = 0, manualPoints = 0, openPending = 0, objective = 0, correct = 0;
        Object.keys(questions || {}).forEach(function (qid) {
            var q = questions[qid], k = (keys && keys[qid]) || {};
            var has = Object.prototype.hasOwnProperty.call(answers, qid), ans = answers[qid];
            if (q.type === 'mc' || q.type === 'tf') {
                objective++;
                var ok = has && k.correct !== undefined && ans === k.correct;
                if (ok) correct++;
                var pts = ok ? Number(q.points) || 0 : 0;
                auto[qid] = { points: pts, correct: ok, answered: has };
                autoPoints += pts;
            } else if (!has || String(ans).trim() === '') {
                auto[qid] = { points: 0, answered: false };
            } else if (manual[qid] && typeof manual[qid].points === 'number') {
                manualPoints += manual[qid].points;
            } else {
                openPending++;
            }
        });
        var scale = Number(meta.scale) || 5, final = openPending === 0, points = Math.round((autoPoints + manualPoints) * 100) / 100;
        return {
            auto: auto, autoPoints: Math.round(autoPoints * 100) / 100, objective: objective, correct: correct, openPending: openPending, final: final,
            points: final ? points : null,
            nota: final ? Math.round(points / Number(meta.totalPoints) * scale * 10) / 10 : null,
            scale: scale
        };
    }
    /* JSON con claves ordenadas: Firebase devuelve los objetos con sus claves en orden alfabético */
    function canon(o) {
        if (o === null || typeof o !== 'object') return JSON.stringify(o === undefined ? null : o);
        return '{' + Object.keys(o).sort().map(function (k) { return JSON.stringify(k) + ':' + canon(o[k]); }).join(',') + '}';
    }
    function gradeLocal(id) {
        return results(id).then(function (r) {
            return db().then(function (d) {
                var upd = {}, n = 0;
                Object.keys(r.attempts).forEach(function (s) {
                    Object.keys(r.attempts[s] || {}).forEach(function (k) {
                        var a = r.attempts[s][k];
                        if (!a || !a.startedAt) return;
                        if (!a.submittedAt && !a.annulled && !expired(r.meta, a)) return;   /* sigue en curso */
                        var prev = (r.grades[s] || {})[k] || null;
                        var g = calcular(r.meta, r.questions, r.keys, a, prev);
                        if (prev && prev.auto && canon(prev.auto) === canon(g.auto) &&
                            prev.final === g.final && (prev.nota == null ? null : prev.nota) === g.nota && (prev.openPending || 0) === g.openPending) return;
                        var b = 'grades/' + id + '/' + s + '/' + k + '/';
                        upd[b + 'auto'] = g.auto; upd[b + 'autoPoints'] = g.autoPoints; upd[b + 'objective'] = g.objective; upd[b + 'correct'] = g.correct;
                        upd[b + 'openPending'] = g.openPending; upd[b + 'final'] = g.final; upd[b + 'points'] = g.points; upd[b + 'nota'] = g.nota;
                        upd[b + 'scale'] = g.scale; upd[b + 'gradedAt'] = firebase.database.ServerValue.TIMESTAMP; upd[b + 'gradedBy'] = 'docente';
                        if (!a.submittedAt && !a.annulled) upd[b + 'expiredAuto'] = true;   /* entregado por tiempo */
                        if (g.annulled) { upd[b + 'annulled'] = true; upd[b + 'annulReason'] = g.annulReason; upd[b + 'manual'] = null; }
                        n++;
                    });
                });
                if (!n) return { ok: true, graded: 0, local: true };
                return d.ref().update(upd).then(function () { return { ok: true, graded: n, local: true }; });
            });
        });
    }
    /** Califica las preguntas objetivas: con el Worker si está desplegado; si no, en el navegador del docente. */
    function grade(id) {
        return gradeWorker(id).catch(function (e) {
            return gradeLocal(id).then(function (r) { r.workerError = e && e.message; return r; });
        });
    }

    /* Mientras el docente tiene GeoMetrics abierto, las entregas nuevas de sus quices se califican solas */
    var vigilados = [];
    function watchTeacher() {
        stopTeacher();
        listMine().then(function (list) {
            return db().then(function (d) {
                list.forEach(function (x) {
                    if (x.meta.status !== 'published' && x.meta.status !== 'closed') return;
                    var ref = d.ref('attempts/' + x.id), t = 0;
                    var h = function () { clearTimeout(t); t = setTimeout(function () { gradeLocal(x.id).catch(function () {}); }, 2500); };
                    ref.on('value', h, function () {});
                    vigilados.push(function () { clearTimeout(t); ref.off('value', h); });
                });
            });
        }).catch(function () {});
    }
    function stopTeacher() { vigilados.forEach(function (f) { try { f(); } catch (e) {} }); vigilados = []; }
    function graderStatus() {
        var base = graderBase();
        if (!base) return Promise.resolve({ ok: false, configured: false });
        return fetch(base.replace(/\/$/, '') + '/api/quiz/status').then(function (r) { return r.json(); }).catch(function () { return { ok: false }; });
    }

    /* ---------------- estudiante ---------------- */
    function listForStudent(user) {
        var courses = Object.keys(coursesOf(user));
        return db().then(function () {
            return Promise.all(courses.map(function (c) { return readOrNull('quizIndex/' + c); }));
        }).then(function (idxs) {
            var ids = {};
            idxs.forEach(function (ix) { Object.keys(ix || {}).forEach(function (id) { ids[id] = true; }); });
            var me = myKey();
            return Promise.all(Object.keys(ids).map(function (id) {
                return readOrNull('quizzes/' + id + '/meta').then(function (meta) {
                    if (!meta) return null; // borrador, aún no publicado o sin acceso
                    limpiarMeta(meta);
                    return readOrNull('attempts/' + id + '/' + me).then(function (atts) {
                        atts = atts || {};
                        var ns = Object.keys(atts).sort();
                        return Promise.all(ns.map(function (n) { return atts[n].submittedAt ? readOrNull('grades/' + id + '/' + me + '/' + n) : Promise.resolve(null); }))
                            .then(function (gs) {
                                var grades = {};
                                ns.forEach(function (n, i) { if (gs[i]) grades[n] = gs[i]; });
                                return { id: id, meta: meta, attempts: atts, grades: grades };
                            });
                    });
                });
            }));
        }).then(function (l) { return l.filter(Boolean); });
    }
    function statusFor(item) {
        var m = item.meta, atts = item.attempts || {}, ns = Object.keys(atts).sort(), t = now();
        var open = ns.filter(function (n) { return !atts[n].submittedAt && !atts[n].annulled && !expired(m, atts[n]); });
        if (open.length) return { code: 'progress', label: 'En progreso', attempt: open[0] };
        var graded = ns.filter(function (n) { return (item.grades[n] && item.grades[n].final) || atts[n].annulled; });
        var subs = ns.filter(function (n) { return atts[n].submittedAt || atts[n].annulled || expired(m, atts[n]); });
        var left = Math.max(0, (+m.maxAttempts || 1) - ns.length);
        var closed = m.status === 'closed' || t >= m.closeAt;
        if (!closed && left > 0 && t >= m.publishAt) return { code: 'available', label: 'Disponible', next: 'a' + ns.length, left: left, submitted: subs.length };
        if (graded.length) { var ult = graded[graded.length - 1]; return { code: 'graded', label: atts[ult].annulled ? 'Anulado' : 'Calificado', attempt: ult, left: closed ? 0 : left }; }
        if (subs.length) return { code: 'submitted', label: 'Entregado', attempt: subs[subs.length - 1], left: closed ? 0 : left };
        if (t < m.publishAt) return { code: 'soon', label: 'Próximamente', left: left };
        return { code: 'expired', label: 'Vencido', left: 0 };
    }
    function expired(meta, att) {
        if (!att || !att.startedAt || att.submittedAt) return false;
        var t = now(), dur = +meta.durationMin || 0;
        return (dur > 0 && t > att.startedAt + dur * 60000 + GRACE_MS) || t > meta.closeAt + GRACE_MS;
    }
    function deadline(meta, att) {
        var dur = +meta.durationMin || 0, end = +meta.closeAt;
        if (dur > 0 && att && att.startedAt) end = Math.min(end, att.startedAt + dur * 60000);
        return end;
    }
    function startAttempt(id, n, nombre) {
        return db().then(function (d) {
            return read('quizzes/' + id + '/meta/version').then(function (v) {
                return d.ref('attempts/' + id + '/' + myKey() + '/' + n).update({ startedAt: firebase.database.ServerValue.TIMESTAMP, version: v, name: String(nombre || '').slice(0, 110) });
            });
        });
    }
    function loadForTaking(id) {
        return Promise.all([read('quizzes/' + id), readOrNull('attempts/' + id + '/' + myKey())]).then(function (r) {
            return { id: id, meta: limpiarMeta(r[0].meta), questions: r[0].questions || {}, attempts: r[1] || {} };
        });
    }
    function saveAnswer(id, n, qid, value) {
        return db().then(function (d) { return d.ref('attempts/' + id + '/' + myKey() + '/' + n + '/answers/' + qid).set(value); });
    }
    function submit(id, n) {
        return db().then(function (d) { return d.ref('attempts/' + id + '/' + myKey() + '/' + n + '/submittedAt').set(firebase.database.ServerValue.TIMESTAMP); });
    }

    /* ---------------- modo anticopia ----------------
       annulled/{reason, at}: solo lo escribe el propio estudiante, una vez, antes de entregar,
       y no se puede borrar (reglas). Las reglas también bloquean nuevas respuestas. */
    function annul(id, n, reason) {
        return db().then(function (d) {
            var ref = d.ref('attempts/' + id + '/' + myKey() + '/' + n);
            return ref.child('annulled').set({ reason: String(reason || 'Salió de la evaluación').slice(0, 120), at: firebase.database.ServerValue.TIMESTAMP })
                .catch(function () { return null; })                   /* ya estaba anulado */
                .then(function () { return ref.child('submittedAt').set(firebase.database.ServerValue.TIMESTAMP).catch(function () { return null; }); });
        });
    }
    /** Si se cierra la página, se recarga o se pierde la conexión, el servidor anula el intento por su cuenta. */
    function armAnnulOnDisconnect(id, n) {
        var od = null;
        db().then(function (d) {
            od = d.ref('attempts/' + id + '/' + myKey() + '/' + n + '/annulled').onDisconnect();
            return od.set({ reason: 'Cerró o recargó la página, o perdió la conexión', at: firebase.database.ServerValue.TIMESTAMP });
        }).catch(function () {});
        return function cancelar() { try { if (od) return od.cancel(); } catch (e) {} return Promise.resolve(); };
    }
    function feedbackKeys(id) { return readOrNull('quizKeys/' + id); }

    /** Vigila en tiempo real los índices de los cursos del estudiante: un quiz recién publicado aparece solo. */
    var watched = [];
    function watchStudent(user, cb) {
        unwatch();
        db().then(function (d) {
            Object.keys(coursesOf(user)).forEach(function (c) {
                var r = d.ref('quizIndex/' + c), h = function () { cb(); };
                r.on('value', h, function () {});
                watched.push(function () { r.off('value', h); });
            });
        }).catch(function () {});
    }
    function unwatch() { watched.forEach(function (f) { try { f(); } catch (e) {} }); watched = []; }

    global.GeoQuiz = {
        GRACE_MS: GRACE_MS,
        key: key, myKey: myKey, myEmail: myEmail, now: now, slug: slug, courseKey: courseKey, coursesOf: coursesOf, uid: uid,
        isConnected: function () { return connected; },
        alIniciarSesion: alIniciarSesion,
        alCerrarSesion: function () { unwatch(); stopTeacher(); },
        limpiarTitulo: limpiarTitulo, claseNota: claseNota,
        listMine: listMine, loadQuiz: loadQuiz, saveQuiz: saveQuiz, removeQuiz: removeQuiz, setMetaFields: setMetaFields,
        results: results, summarize: summarize, saveManual: saveManual, settings: settings, saveSettings: saveSettings,
        grade: grade, gradeLocal: gradeLocal, calcular: calcular, watchTeacher: watchTeacher, graderStatus: graderStatus,
        listForStudent: listForStudent, statusFor: statusFor, expired: expired, deadline: deadline,
        startAttempt: startAttempt, loadForTaking: loadForTaking, saveAnswer: saveAnswer, submit: submit, feedbackKeys: feedbackKeys,
        annul: annul, armAnnulOnDisconnect: armAnnulOnDisconnect,
        watchStudent: watchStudent, unwatch: unwatch, db: db
    };
})(window);
