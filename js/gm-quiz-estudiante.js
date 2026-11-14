/**
 * GeoMetrics — Panel del estudiante: «Mis quices» y presentación de la evaluación.
 * - El inicio queda registrado con la hora del servidor; el reloj del navegador solo se usa para mostrar.
 * - Cada respuesta se guarda en Firebase y, además, en este equipo: si se cae la conexión o se
 *   recarga la página, no se pierde y se sincroniza al volver (si aún está dentro del tiempo).
 */
(function (global) {
    'use strict';
    var doc = global.document;
    var Q = function () { return global.GeoQuiz; };
    var T = null; // estado de la evaluación en curso

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function $(id) { return doc.getElementById(id); }
    function sesion() { try { var u = global.aulaGetSession(); return (global.aulaUsuarioCompleto && global.aulaUsuarioCompleto(u)) || u; } catch (e) { return null; } }
    function fmt(ts) { if (!ts) return '—'; try { return new Date(ts).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return '—'; } }
    function toast(msg, bad) {
        var t = doc.createElement('div'); t.className = 'gq-toast' + (bad ? ' bad' : ''); t.textContent = msg;
        doc.body.appendChild(t); setTimeout(function () { t.classList.add('out'); }, 3200); setTimeout(function () { t.remove(); }, 3800);
    }
    function backupKey(id, n) { return 'gq_ans_' + Q().myKey() + '_' + id + '_' + n; }
    function backupRead(id, n) { try { return JSON.parse(localStorage.getItem(backupKey(id, n)) || '{}'); } catch (e) { return {}; } }
    function backupWrite(id, n, obj) { try { localStorage.setItem(backupKey(id, n), JSON.stringify(obj)); } catch (e) {} }
    function backupClear(id, n) { try { localStorage.removeItem(backupKey(id, n)); } catch (e) {} }

    /* ======================= Mis quices ======================= */
    var watching = false, yaPedidos = {};
    function render() {
        var R = $('gqEstRoot'); if (!R) return;
        if (!global.GeoAuth || !GeoAuth.verified()) { R.innerHTML = '<div class="gq-empty">Inicia sesión con tu correo institucional verificado para ver tus quices.</div>'; return; }
        var u = sesion(); if (!u) return;
        if (!watching) { watching = true; Q().watchStudent(u, function () { if (visible()) cargar(); }); }
        cargar();
    }
    function visible() { var v = doc.querySelector('.av-view[data-av-view="quices"]'); return v && v.classList.contains('active'); }
    function cargar() {
        var R = $('gqEstRoot'), u = sesion();
        if (!R || !u) return;
        if (!R.innerHTML) R.innerHTML = '<div class="gq-loading">Cargando tus quices…</div>';
        Q().listForStudent(u).then(function (list) {
            var order = { progress: 0, available: 1, soon: 2, submitted: 3, graded: 4, expired: 5 };
            list.forEach(function (it) { it.st = Q().statusFor(it); });
            list.sort(function (a, b) { return (order[a.st.code] - order[b.st.code]) || (a.meta.closeAt - b.meta.closeAt); });
            if (!list.length) { R.innerHTML = '<div class="gq-empty">No tienes quices por ahora. Cuando tu docente publique uno para tus asignaturas aparecerá aquí automáticamente.</div>'; return; }
            // Intentos vencidos sin entregar o entregas sin nota visible: el servidor los cierra y califica (una vez por sesión)
            var pend = list.filter(function (it) {
                if (yaPedidos[it.id]) return false;
                var ns = Object.keys(it.attempts);
                return ns.some(function (n) { return Q().expired(it.meta, it.attempts[n]) || (it.attempts[n].submittedAt && !(it.grades[n] && it.grades[n].final)); });
            });
            if (pend.length) {
                pend.forEach(function (it) { yaPedidos[it.id] = true; });
                Promise.all(pend.map(function (it) { return Q().grade(it.id).catch(function () { return null; }); })).then(function (r) { if (r.some(Boolean)) cargar(); });
            }
            R.innerHTML = '<div class="gq-grid">' + list.map(cardHtml).join('') + '</div>';
            R.querySelectorAll('[data-go]').forEach(function (b) {
                b.onclick = function () {
                    var it = list.filter(function (x) { return x.id === b.getAttribute('data-id'); })[0];
                    var a = b.getAttribute('data-go');
                    if (a === 'start') confirmarInicio(it); else if (a === 'continue') abrir(it.id, it.st.attempt); else verResultado(it);
                };
            });
        }).catch(function (e) { R.innerHTML = '<div class="gq-alert">' + esc(e.message) + '</div>'; });
    }
    function cardHtml(it) {
        var m = it.meta, st = it.st, colors = { available: '#22d3ee', progress: '#a78bfa', submitted: '#f59e0b', graded: st.label === 'Anulado' ? '#ef4444' : '#22c55e', expired: '#64748b', soon: '#64748b' };
        var g = st.attempt && it.grades[st.attempt], anul = st.attempt && it.attempts[st.attempt] && it.attempts[st.attempt].annulled;
        var score = anul ? '<div class="gq-score bad"><b>0,0</b><span>Anulado</span></div>'
            : g && g.final ? '<div class="gq-score"><b>' + esc(g.nota) + '</b><span>' + esc(g.points) + ' / ' + esc(m.totalPoints) + ' pts</span></div>' : '';
        var btn = st.code === 'available' ? '<button type="button" class="gq-btn primary" data-go="start" data-id="' + it.id + '">' + (st.submitted ? 'Nuevo intento' : 'Iniciar evaluación') + '</button>'
            : st.code === 'progress' ? '<button type="button" class="gq-btn primary" data-go="continue" data-id="' + it.id + '">Continuar</button>'
            : (st.code === 'submitted' || st.code === 'graded') ? '<button type="button" class="gq-btn" data-go="result" data-id="' + it.id + '">Ver resultado</button>' : '';
        return '<article class="gq-card" style="--c:' + colors[st.code] + '"><header><div><h3>' + esc(m.title) + '</h3><p>' + esc(m.materia) + (m.unit ? ' · ' + esc(m.unit) : '') + '</p></div><span class="gq-chip" style="--c:' + colors[st.code] + '">' + esc(st.label) + '</span></header>' +
            (m.description ? '<p class="gq-desc">' + esc(m.description) + '</p>' : '') +
            '<dl><div><dt>Docente</dt><dd>' + esc(m.ownerName || '—') + '</dd></div><div><dt>Publicado</dt><dd>' + fmt(m.publishAt) + '</dd></div><div><dt>Fecha límite</dt><dd>' + fmt(m.closeAt) + '</dd></div><div><dt>Duración</dt><dd>' + (m.durationMin ? m.durationMin + ' min' : 'Sin límite') + '</dd></div><div><dt>Intentos disponibles</dt><dd>' + (st.left != null ? st.left : 0) + ' de ' + esc(m.maxAttempts) + '</dd></div></dl>' +
            '<footer>' + score + btn + '</footer></article>';
    }
    function confirmarInicio(it) {
        var m = it.meta, ov = doc.createElement('div');
        ov.className = 'gq-modal';
        ov.innerHTML = '<div class="gq-dlg" role="dialog" aria-modal="true"><header><div><small class="gq-k">ANTES DE EMPEZAR</small><h3>' + esc(m.title) + '</h3></div><button type="button" class="gq-x" data-close aria-label="Cerrar">✕</button></header><div class="gq-dlg-body">' +
            (m.instructions ? '<div class="gq-instr"><b>Instrucciones del docente</b><p>' + esc(m.instructions) + '</p></div>' : '') +
            '<ul class="gq-rules"><li>' + (m.durationMin ? 'Tendrás <b>' + m.durationMin + ' minutos</b> desde que pulses «Comenzar». El tiempo lo controla el servidor' + (m.antiCopia !== false ? '.' : ': cerrar la página no lo detiene.') : 'No hay límite de tiempo, pero debes entregar antes del ' + fmt(m.closeAt) + '.') + '</li>' +
            '<li>Tus respuestas se guardan solas mientras avanzas.</li><li>Al entregar ya no podrás cambiar tus respuestas.</li>' +
            '<li>Te quedan <b>' + it.st.left + '</b> intento(s).</li></ul>' +
            (m.antiCopia !== false ? '<div class="gq-anticopia"><b>⚠ Modo anticopia activo</b><p>Tu intento se <b>anula con nota 0</b> si durante la evaluación:</p><ul>' +
                '<li>cambias de pestaña, minimizas la ventana o abres otra aplicación;</li>' +
                '<li>tomas una captura de pantalla o intentas imprimir;</li>' +
                '<li>cierras o recargas la página, pulsas «Salir» o pierdes la conexión a internet.</li></ul>' +
                '<p>Copiar y pegar están desactivados. Asegúrate de tener buena conexión y de no recibir llamadas antes de comenzar.</p>' +
                '<label class="gq-chk"><input type="checkbox" data-acepto> Entiendo y acepto estas condiciones</label></div>' : '') +
            '</div>' +
            '<footer><button type="button" class="gq-btn" data-close>Cancelar</button><button type="button" class="gq-btn primary" data-ok>Comenzar</button></footer></div>';
        doc.body.appendChild(ov);
        ov.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = function () { ov.remove(); }; });
        var acepto = ov.querySelector('[data-acepto]'), okBtn = ov.querySelector('[data-ok]');
        if (acepto) { okBtn.disabled = true; acepto.onchange = function () { okBtn.disabled = !acepto.checked; }; }
        okBtn.onclick = function () {
            var b = this; b.disabled = true; b.textContent = 'Iniciando…';
            var u = sesion() || {};
            Q().startAttempt(it.id, it.st.next, u.nombre || '').then(function () { ov.remove(); abrir(it.id, it.st.next); })
                .catch(function (e) { b.disabled = false; b.textContent = 'Comenzar'; toast(/permission/i.test(String(e.code || e.message)) ? 'No se pudo iniciar: el quiz cerró o ya usaste tus intentos.' : e.message, true); });
        };
    }

    /* ======================= Presentación ======================= */
    function seededOrder(seed) {
        var h = 2166136261; for (var i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
        var arr = ['A', 'B', 'C', 'D'];
        for (var j = arr.length - 1; j > 0; j--) { h = Math.imul(h ^ (h >>> 15), 2246822507); var k = (h >>> 0) % (j + 1); var t = arr[j]; arr[j] = arr[k]; arr[k] = t; }
        return arr;
    }
    function abrir(id, n) {
        Q().loadForTaking(id).then(function (d) {
            var att = d.attempts[n];
            if (!att || !att.startedAt) throw new Error('No se encontró el intento.');
            if (att.annulled) { avisoAnulado(String(att.annulled.reason || '')); cargar(); return; }
            if (att.submittedAt) { toast('Este intento ya fue entregado.'); cargar(); return; }
            var qids = Object.keys(d.questions).sort(function (a, b) { return d.questions[a].order - d.questions[b].order; });
            T = { id: id, n: n, meta: d.meta, qs: d.questions, qids: qids, att: att, answers: Object.assign({}, att.answers || {}), pending: {}, idx: 0, locked: false, timers: [] };
            // Respaldo local: respuestas escritas sin conexión o antes de recargar
            var local = backupRead(id, n);
            Object.keys(local).forEach(function (q) { if (d.questions[q] && T.answers[q] !== local[q].v) { T.answers[q] = local[q].v; T.pending[q] = true; } });
            pintar();
            sincronizar();
            vigilar();
        }).catch(function (e) { toast(e.message, true); });
    }

    /* ======================= Modo anticopia ======================= */
    function anticopia() { return T && T.meta && T.meta.antiCopia !== false; }
    function vigilar() {
        if (!anticopia()) return;
        T.cancelarDesconexion = Q().armAnnulOnDisconnect(T.id, T.n);   /* cerrar, recargar o perder conexión */
        var enCampo = function (e) { return e.target && e.target.closest && e.target.closest('textarea.gq-open'); };
        var h = {
            vis: function () { if (doc.visibilityState === 'hidden') anular('Cambió de pestaña, minimizó la ventana o abrió otra aplicación'); },
            blur: function () {
                if (!T) return;
                clearTimeout(T.blurT);
                /* margen corto para notificaciones del sistema; la herramienta de recortes y otras ventanas sí anulan */
                T.blurT = setTimeout(function () { if (T && !doc.hasFocus()) anular('Salió de la ventana de la evaluación'); }, 1200);
            },
            focus: function () { if (T) clearTimeout(T.blurT); },
            key: function (e) {
                var k = String(e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
                if (k === 'printscreen' || e.keyCode === 44) { e.preventDefault(); anular('Intentó tomar una captura de pantalla'); return; }
                if (mod && e.shiftKey && /^(s|3|4|5)$/.test(k)) { e.preventDefault(); anular('Intentó tomar una captura de pantalla'); return; }
                if (mod && k === 'p') { e.preventDefault(); anular('Intentó imprimir la evaluación'); return; }
                if (mod && (k === 'v' || ((k === 'c' || k === 'x' || k === 'a') && !enCampo(e)) || k === 'u' || k === 's')) e.preventDefault();
            },
            keyup: function (e) { if (String(e.key || '').toLowerCase() === 'printscreen' || e.keyCode === 44) anular('Intentó tomar una captura de pantalla'); },
            bloquear: function (e) { if (e.type === 'copy' && enCampo(e)) return; e.preventDefault(); },
            imprimir: function () { anular('Intentó imprimir la evaluación'); },
            salir: function () { anular('Cerró o recargó la página'); }
        };
        doc.addEventListener('visibilitychange', h.vis);
        global.addEventListener('blur', h.blur);
        global.addEventListener('focus', h.focus);
        doc.addEventListener('keydown', h.key, true);
        doc.addEventListener('keyup', h.keyup, true);
        ['copy', 'cut', 'paste', 'contextmenu', 'dragstart'].forEach(function (ev) { doc.addEventListener(ev, h.bloquear, true); });
        global.addEventListener('beforeprint', h.imprimir);
        global.addEventListener('pagehide', h.salir);
        T.dejarDeVigilar = function () {
            doc.removeEventListener('visibilitychange', h.vis);
            global.removeEventListener('blur', h.blur);
            global.removeEventListener('focus', h.focus);
            doc.removeEventListener('keydown', h.key, true);
            doc.removeEventListener('keyup', h.keyup, true);
            ['copy', 'cut', 'paste', 'contextmenu', 'dragstart'].forEach(function (ev) { doc.removeEventListener(ev, h.bloquear, true); });
            global.removeEventListener('beforeprint', h.imprimir);
            global.removeEventListener('pagehide', h.salir);
        };
        /* marca de agua con el nombre del estudiante: desalienta las fotos a la pantalla */
        var u = sesion() || {}, nom = String(u.nombre || Q().myEmail() || '').slice(0, 40);
        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="360" height="200"><text x="20" y="110" transform="rotate(-22 180 100)" fill="rgba(148,163,184,0.10)" font-family="Arial" font-size="18">' +
            nom.replace(/[<&"]/g, '') + ' · ' + new Date().toLocaleDateString('es-CO') + '</text></svg>';
        var body = $('gqTBody'); if (body) body.style.backgroundImage = 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")';
        var info = doc.querySelector('#gqTake .gq-take-info');
        if (info && !info.querySelector('.gq-ac-badge')) info.insertAdjacentHTML('afterbegin', '<span class="gq-ac-badge" title="Si sales de la evaluación, el intento se anula">🔒 Anticopia</span>');
    }
    function anular(motivo) {
        if (!T || T.locked || T.anulando || T.entregando) return;
        T.anulando = true; bloquear();
        var id = T.id, n = T.n;
        if (T.dejarDeVigilar) T.dejarDeVigilar();
        Q().annul(id, n, motivo).then(function () {
            backupClear(id, n);
            if (T && T.cancelarDesconexion) T.cancelarDesconexion();
            cerrarTake();
            avisoAnulado(motivo);
            cargar();
        }).catch(function () { cerrarTake(); avisoAnulado(motivo); cargar(); });
    }
    function avisoAnulado(motivo) {
        if (doc.querySelector('.gq-modal.gq-anulado')) return;
        var ov = doc.createElement('div');
        ov.className = 'gq-modal gq-anulado';
        ov.innerHTML = '<div class="gq-dlg" role="alertdialog" aria-modal="true"><header><h3>Intento anulado</h3></header><div class="gq-dlg-body">' +
            '<div class="gq-result bad"><b>0,0</b><span>Nota del intento</span></div>' +
            '<p>El modo anticopia anuló tu intento. Motivo: <b>' + esc(motivo || 'salió de la evaluación') + '</b>.</p>' +
            '<p class="gq-hint">Tu docente verá el motivo en los resultados. Si fue un error (por ejemplo, se cayó tu internet), comunícate con él.</p></div>' +
            '<footer><button type="button" class="gq-btn primary" data-close>Entendido</button></footer></div>';
        doc.body.appendChild(ov);
        ov.querySelector('[data-close]').onclick = function () { ov.remove(); };
    }
    function pintar() {
        var m = T.meta, old = $('gqTake'); if (old) old.remove();
        var ov = doc.createElement('div'); ov.id = 'gqTake'; ov.className = 'gq-take'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', m.title);
        ov.innerHTML = '<header class="gq-take-top"><div><small class="gq-k">' + esc(m.materia) + '</small><h2>' + esc(m.title) + '</h2></div>' +
            '<div class="gq-take-info"><span id="gqSave" class="gq-save">Guardado</span><span id="gqTimer" class="gq-timer" aria-live="polite">--:--</span><button type="button" class="gq-btn" id="gqExit">Salir</button></div></header>' +
            '<div class="gq-progress"><i id="gqProg"></i></div><nav class="gq-dots" id="gqDots" aria-label="Preguntas"></nav>' +
            '<main class="gq-take-body" id="gqTBody"></main>' +
            '<footer class="gq-take-foot"><span id="gqCount"></span><div>' + (m.oneAtATime ? '<button type="button" class="gq-btn" id="gqPrevQ">← Anterior</button><button type="button" class="gq-btn" id="gqNextQ">Siguiente →</button>' : '') + '<button type="button" class="gq-btn primary" id="gqSubmit">Finalizar y entregar</button></div></footer>';
        doc.body.appendChild(ov);
        doc.documentElement.classList.add('gq-noscroll');
        $('gqExit').onclick = salir;
        $('gqSubmit').onclick = confirmarEntrega;
        if (m.oneAtATime) { $('gqPrevQ').onclick = function () { mover(-1); }; $('gqNextQ').onclick = function () { mover(1); }; }
        pintarPreguntas(); pintarDots();
        T.timers.push(setInterval(tick, 500));
        tick();
    }
    function preguntaHtml(q, i) {
        var Qn = T.qs[q], a = T.answers[q], dis = T.locked ? ' disabled' : '';
        var h = '<section class="gq-tq" id="gqq_' + q + '"><header><b>Pregunta ' + (i + 1) + ' de ' + T.qids.length + '</b><span>' + Qn.points + ' pt</span></header><p class="gq-stem">' + esc(Qn.text) + '</p>' + (Qn.image ? '<img class="gq-qimg" src="' + esc(Qn.image) + '" alt="Imagen de apoyo de la pregunta ' + (i + 1) + '">' : '');
        if (Qn.type === 'mc') {
            var order = T.meta.shuffleOptions ? seededOrder(q + Q().myKey()) : ['A', 'B', 'C', 'D'];
            h += '<div class="gq-choices" role="radiogroup">' + order.map(function (k, j) {
                return '<label class="gq-choice' + (a === k ? ' on' : '') + '"><input type="radio" name="r' + q + '" value="' + k + '"' + (a === k ? ' checked' : '') + dis + '><span class="gq-letter">' + String.fromCharCode(65 + j) + '</span><span>' + esc((Qn.options || {})[k]) + '</span></label>';
            }).join('') + '</div>';
        } else if (Qn.type === 'tf') {
            h += '<div class="gq-choices tf" role="radiogroup">' + [[true, 'Verdadero'], [false, 'Falso']].map(function (o) {
                return '<label class="gq-choice' + (a === o[0] ? ' on' : '') + '"><input type="radio" name="r' + q + '" value="' + o[0] + '"' + (a === o[0] ? ' checked' : '') + dis + '><span>' + o[1] + '</span></label>';
            }).join('') + '</div>';
        } else {
            var max = Qn.maxChars || 1500;
            h += '<textarea class="gq-open" rows="7" maxlength="' + max + '" placeholder="Escribe tu respuesta…"' + dis + '>' + esc(a || '') + '</textarea><small class="gq-chars"><span>' + String(a || '').length + '</span> / ' + max + ' caracteres</small>';
        }
        return h + '</section>';
    }
    function pintarPreguntas() {
        var B = $('gqTBody'), one = T.meta.oneAtATime;
        var list = one ? [T.qids[T.idx]] : T.qids;
        B.innerHTML = list.map(function (q) { return preguntaHtml(q, T.qids.indexOf(q)); }).join('');
        B.querySelectorAll('.gq-tq').forEach(function (sec) {
            var q = sec.id.slice(4), Qn = T.qs[q];
            sec.querySelectorAll('input[type=radio]').forEach(function (r) {
                r.addEventListener('change', function () {
                    var v = Qn.type === 'tf' ? r.value === 'true' : r.value;
                    sec.querySelectorAll('.gq-choice').forEach(function (c) { c.classList.toggle('on', c.querySelector('input').checked); });
                    responder(q, v);
                });
            });
            var ta = sec.querySelector('textarea');
            if (ta) {
                var tmo = null;
                ta.addEventListener('input', function () {
                    sec.querySelector('.gq-chars span').textContent = ta.value.length;
                    clearTimeout(tmo); tmo = setTimeout(function () { responder(q, ta.value); }, 700);
                    backupLocal(q, ta.value);
                });
                ta.addEventListener('blur', function () { clearTimeout(tmo); responder(q, ta.value); });
            }
        });
        if (one) { $('gqPrevQ').disabled = T.idx === 0; $('gqNextQ').disabled = T.idx === T.qids.length - 1; }
        contador();
    }
    function pintarDots() {
        var D = $('gqDots');
        D.innerHTML = T.qids.map(function (q, i) {
            var done = T.answers[q] !== undefined && String(T.answers[q]).trim() !== '';
            return '<button type="button" class="' + (done ? 'done' : '') + (T.meta.oneAtATime && i === T.idx ? ' cur' : '') + '" data-i="' + i + '" aria-label="Pregunta ' + (i + 1) + (done ? ', respondida' : ', pendiente') + '">' + (i + 1) + '</button>';
        }).join('');
        D.querySelectorAll('button').forEach(function (b) {
            b.onclick = function () {
                var i = +b.getAttribute('data-i');
                if (T.meta.oneAtATime) { T.idx = i; pintarPreguntas(); pintarDots(); }
                else { var el = $('gqq_' + T.qids[i]); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
            };
        });
    }
    function mover(d) { T.idx = Math.max(0, Math.min(T.qids.length - 1, T.idx + d)); pintarPreguntas(); pintarDots(); $('gqTBody').scrollTop = 0; }
    function respondidas() { return T.qids.filter(function (q) { return T.answers[q] !== undefined && String(T.answers[q]).trim() !== ''; }).length; }
    function contador() {
        var n = respondidas();
        $('gqCount').textContent = n + ' de ' + T.qids.length + ' respondidas · ' + (T.qids.length - n) + ' pendientes';
        $('gqProg').style.width = Math.round(n / T.qids.length * 100) + '%';
    }
    function backupLocal(q, v) {
        var b = backupRead(T.id, T.n); b[q] = { v: v, t: Date.now() }; backupWrite(T.id, T.n, b);
    }
    function estadoGuardado(txt, cls) { var s = $('gqSave'); if (s) { s.textContent = txt; s.className = 'gq-save ' + (cls || ''); } }
    function responder(q, v) {
        if (T.locked) return;
        if (T.qs[q].type === 'open' && typeof v === 'string' && v.length > (T.qs[q].maxChars || 1500)) v = v.slice(0, T.qs[q].maxChars || 1500);
        T.answers[q] = v; T.pending[q] = true;
        backupLocal(q, v);
        contador(); pintarDots();
        sincronizar();
    }
    /** Envía las respuestas pendientes. Firebase las encola si no hay red; el respaldo local cubre recargas. */
    function sincronizar() {
        var qs = Object.keys(T.pending);
        if (!qs.length) { estadoGuardado('Guardado ✓', 'ok'); return Promise.resolve(true); }
        if (!Q().isConnected()) estadoGuardado('Sin conexión: guardado en este equipo', 'warn');
        else estadoGuardado('Guardando…');
        return Promise.all(qs.map(function (q) {
            var v = T.answers[q];
            return Q().saveAnswer(T.id, T.n, q, v).then(function () { if (T && T.answers[q] === v) delete T.pending[q]; return true; })
                .catch(function (e) { if (/permission/i.test(String(e.code || e.message))) { delete T.pending[q]; return 'tiempo'; } return false; });
        })).then(function (r) {
            if (!T) return false;
            if (r.indexOf('tiempo') >= 0) { estadoGuardado('Tiempo agotado: no se aceptan más respuestas', 'bad'); bloquear(); return false; }
            if (Object.keys(T.pending).length) { estadoGuardado(Q().isConnected() ? 'Reintentando…' : 'Sin conexión: guardado en este equipo', 'warn'); return false; }
            estadoGuardado('Guardado ✓', 'ok'); return true;
        });
    }
    global.addEventListener('geoquiz-connection', function (e) { if (T && e.detail.connected) sincronizar(); else if (T) estadoGuardado('Sin conexión: guardado en este equipo', 'warn'); });

    function tick() {
        if (!T) return;
        var left = Q().deadline(T.meta, T.att) - Q().now(), el = $('gqTimer');
        if (!el) return;
        if (left <= 0) { el.textContent = '00:00'; el.className = 'gq-timer bad'; if (!T.locked) { bloquear(); entregar(true); } return; }
        var s = Math.floor(left / 1000), hh = Math.floor(s / 3600), mm = Math.floor(s % 3600 / 60), ss = s % 60;
        el.textContent = (hh ? hh + ':' : '') + String(mm).padStart(2, '0') + ':' + String(ss).padStart(2, '0');
        el.className = 'gq-timer' + (left < 60000 ? ' bad' : left < 300000 ? ' warn' : '');
        if (!T.meta.durationMin && left > 864e5) el.textContent = 'Hasta ' + fmt(T.meta.closeAt);
    }
    function bloquear() {
        if (!T) return;
        T.locked = true;
        doc.querySelectorAll('#gqTake input, #gqTake textarea').forEach(function (x) { x.disabled = true; });
    }
    function confirmarEntrega() {
        var falta = T.qids.length - respondidas(), ov = doc.createElement('div');
        ov.className = 'gq-modal';
        ov.innerHTML = '<div class="gq-dlg" role="alertdialog" aria-modal="true"><header><h3>¿Entregar la evaluación?</h3></header><div class="gq-dlg-body">' +
            (falta ? '<p class="gq-alert">Tienes <b>' + falta + '</b> pregunta(s) sin responder. Las preguntas sin respuesta valen 0.</p>' : '<p>Respondiste todas las preguntas.</p>') +
            '<p>Después de entregar no podrás modificar tus respuestas.</p></div><footer><button type="button" class="gq-btn" data-close>Seguir respondiendo</button><button type="button" class="gq-btn primary" data-ok>Entregar</button></footer></div>';
        doc.body.appendChild(ov);
        ov.querySelector('[data-close]').onclick = function () { ov.remove(); };
        ov.querySelector('[data-ok]').onclick = function () { ov.remove(); entregar(false); };
    }
    function entregar(porTiempo) {
        if (!T || T.entregando) return;
        T.entregando = true; bloquear();
        var btn = $('gqSubmit'); if (btn) { btn.disabled = true; btn.textContent = 'Entregando…'; }
        var id = T.id, n = T.n, cancelar = T.cancelarDesconexion;
        if (T.dejarDeVigilar) T.dejarDeVigilar();
        sincronizar().then(function () { return cancelar ? cancelar() : null; }).then(function () { return Q().submit(id, n); }).catch(function (e) {
            // Si el intento ya estaba entregado (otra pestaña o el servidor por tiempo) no es un error
            if (/permission/i.test(String(e.code || e.message))) return null;
            throw e;
        }).then(function () {
            backupClear(id, n);
            return Q().grade(id).catch(function () { return null; });
        }).then(function () {
            cerrarTake();
            toast(porTiempo ? 'Se acabó el tiempo: tu evaluación se entregó con lo guardado.' : 'Evaluación entregada.');
            return Q().listForStudent(sesion()).then(function (l) { var it = l.filter(function (x) { return x.id === id; })[0]; if (it) { it.st = Q().statusFor(it); verResultado(it); } cargar(); });
        }).catch(function (e) {
            T.entregando = false;
            if (anticopia()) vigilar();   /* la entrega falló: vuelve a vigilar */
            if (btn) { btn.disabled = false; btn.textContent = 'Finalizar y entregar'; }
            toast('No se pudo entregar (' + e.message + '). Tus respuestas siguen guardadas en este equipo: vuelve a intentarlo.', true);
        });
    }
    function salir() {
        if (anticopia()) {
            var m2 = 'Este quiz tiene el modo anticopia activo: si sales ahora, tu intento se anula y tu nota será 0. Para terminar sin perder tu trabajo, usa «Finalizar y entregar».';
            (global.gmConfirm ? global.gmConfirm(m2, { titulo: '¿Salir y anular el intento?', okTexto: 'Salir y anular' }) : Promise.resolve(global.confirm(m2)))
                .then(function (ok) { if (ok) anular('Salió de la evaluación con el botón «Salir»'); });
            return;
        }
        var pend = T && Object.keys(T.pending).length;
        var msg = 'Puedes volver y continuar mientras haya tiempo.' + (T && T.meta.durationMin ? ' El reloj sigue corriendo.' : '') + (pend ? ' Hay respuestas sin sincronizar: quedaron guardadas en este equipo.' : '');
        (global.gmConfirm ? global.gmConfirm(msg, { titulo: '¿Salir de la evaluación?', okTexto: 'Salir' }) : Promise.resolve(global.confirm(msg))).then(function (ok) { if (ok) { cerrarTake(); cargar(); } });
    }
    function cerrarTake() {
        if (T) { T.timers.forEach(clearInterval); clearTimeout(T.blurT); if (T.dejarDeVigilar) T.dejarDeVigilar(); }
        T = null;
        var o = $('gqTake'); if (o) o.remove();
        doc.documentElement.classList.remove('gq-noscroll');
    }

    /* ======================= Resultado ======================= */
    function verResultado(it) {
        var m = it.meta, st = it.st, n = st.attempt, att = it.attempts[n] || {}, g = it.grades[n];
        var afterClose = Q().now() > m.closeAt && m.feedbackAfterClose;
        Promise.all([Q().loadForTaking(it.id), afterClose ? Q().feedbackKeys(it.id) : Promise.resolve(null)]).then(function (r) {
            var qs = r[0].questions, keys = r[1], qids = Object.keys(qs).sort(function (a, b) { return qs[a].order - qs[b].order; });
            var ov = doc.createElement('div'); ov.className = 'gq-modal';
            var head = att.annulled
                ? '<div class="gq-result bad"><b>0,0</b><span>Intento anulado por el modo anticopia: ' + esc(att.annulled.reason || '') + '</span></div>'
                : g && g.final
                ? '<div class="gq-result ok"><b>' + esc(g.nota) + '</b><span>' + esc(g.points) + ' de ' + esc(m.totalPoints) + ' puntos</span></div>'
                : '<div class="gq-result"><b>Entregado</b><span>' + (m.showScore ? 'Pendiente de calificación: tu docente debe revisar las preguntas abiertas.' : 'Tu docente no publica la nota en este quiz.') + '</span></div>';
            var h = '<div class="gq-dlg wide" role="dialog" aria-modal="true"><header><div><small class="gq-k">RESULTADO · INTENTO ' + (+String(n).slice(1) + 1) + '</small><h3>' + esc(m.title) + '</h3></div><button type="button" class="gq-x" data-close aria-label="Cerrar">✕</button></header><div class="gq-dlg-body">' + head +
                '<p class="gq-hint">Entregado: ' + fmt(att.submittedAt) + (att.autoSubmitted ? ' (cerrado automáticamente por tiempo)' : '') + '</p>';
            if (!afterClose && m.feedbackAfterClose) h += '<p class="gq-hint">Las respuestas correctas se mostrarán después del cierre (' + fmt(m.closeAt) + ').</p>';
            h += qids.map(function (q, i) {
                var Qn = qs[q], a = (att.answers || {})[q], has = a !== undefined && String(a).trim() !== '', k = keys && keys[q], au = g && g.final && g.auto && g.auto[q], man = g && g.final && g.manual && g.manual[q];
                var mine = !has ? '<i>Sin respuesta</i>' : Qn.type === 'mc' ? esc(a) + ') ' + esc((Qn.options || {})[a]) : Qn.type === 'tf' ? (a ? 'Verdadero' : 'Falso') : esc(a);
                var line = '<div class="gq-pq"><header><b>' + (i + 1) + '.</b> ' + esc(Qn.text) + '<span>' + Qn.points + ' pt</span></header><p>Tu respuesta: <b>' + mine + '</b>' + (au ? (au.correct ? ' <span class="gq-ok">✓</span>' : ' <span class="gq-bad">✗</span>') : '') + '</p>';
                if (k && Qn.type !== 'open') line += '<p class="gq-fb">Correcta: <b>' + (Qn.type === 'mc' ? esc(k.correct) + ') ' + esc((Qn.options || {})[k.correct]) : (k.correct ? 'Verdadero' : 'Falso')) + '</b>' + (k.explanation ? '<br>' + esc(k.explanation) : '') + '</p>';
                if (man) line += '<p class="gq-fb">Puntaje: <b>' + esc(man.points) + ' / ' + Qn.points + '</b>' + (man.comment ? '<br>Observación del docente: ' + esc(man.comment) : '') + '</p>';
                return line + '</div>';
            }).join('');
            ov.innerHTML = h + '</div><footer><button type="button" class="gq-btn primary" data-close>Cerrar</button></footer></div>';
            doc.body.appendChild(ov);
            ov.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = function () { ov.remove(); }; });
        }).catch(function (e) { toast(e.message, true); });
    }

    doc.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('[data-av-view="quices"]:not(.av-view)');
        if (b) setTimeout(render, 0);
    });
    global.addEventListener('beforeunload', function (e) {
        /* con anticopia: el navegador pide confirmación antes de cerrar (cerrar anula el intento) */
        if (T && !T.locked && (anticopia() || Object.keys(T.pending).length)) { e.preventDefault(); e.returnValue = ''; }
    });
    global.GeoQuizEstudiante = { render: render };
})(window);
