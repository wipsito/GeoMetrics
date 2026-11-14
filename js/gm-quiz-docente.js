/**
 * GeoMetrics — Panel docente: «Quices y evaluaciones» (Mis quices, Crear quiz, Resultados, Configuración)
 * y «Recursos». Se monta en los paneles data-dp-panel="quices" y data-dp-panel="recursos".
 */
(function (global) {
    'use strict';
    var doc = global.document;
    var Q = function () { return global.GeoQuiz; };
    var TYPES = { open: 'Abierta', mc: 'Selección múltiple', tf: 'Falso / Verdadero' };
    var S = { tab: 'mis', ed: null, list: [], res: null, sel: null, dragIdx: -1, settings: null };

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function $(id) { return doc.getElementById(id); }
    function sesion() { try { var u = global.aulaGetSession(); return (global.aulaUsuarioCompleto && global.aulaUsuarioCompleto(u)) || u; } catch (e) { return null; } }
    function fmt(ts) { if (!ts) return '—'; try { return new Date(ts).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }); } catch (e) { return '—'; } }
    function toLocalInput(ts) { if (!ts) return ''; var d = new Date(ts - new Date(ts).getTimezoneOffset() * 60000); return d.toISOString().slice(0, 16); }
    function fromLocalInput(v) { return v ? new Date(v).getTime() : 0; }
    function toast(msg, bad) {
        var t = doc.createElement('div'); t.className = 'gq-toast' + (bad ? ' bad' : ''); t.textContent = msg;
        doc.body.appendChild(t); setTimeout(function () { t.classList.add('out'); }, 3200); setTimeout(function () { t.remove(); }, 3800);
    }
    function confirmar(msg, ok) {
        if (global.gmConfirm) return global.gmConfirm(msg, { titulo: 'Confirmar', okTexto: ok || 'Aceptar' });
        return Promise.resolve(global.confirm(msg));
    }
    function chip(status) {
        var m = { draft: ['Borrador', 'amber'], published: ['Publicado', 'cyan'], closed: ['Cerrado', 'gray'] }[status] || [status, 'gray'];
        return '<span class="gq-chip ' + m[1] + '">' + esc(m[0]) + '</span>';
    }
    function sumPoints(qs) { return Math.round(qs.reduce(function (a, q) { return a + (Number(q.points) || 0); }, 0) * 100) / 100; }

    /* ======================= montaje ======================= */
    function root() { return $('gqDocRoot'); }
    function render() {
        var R = root(); if (!R) return;
        if (!global.GeoAuth || !GeoAuth.verified()) { R.innerHTML = '<div class="gq-empty">Inicia sesión con tu correo institucional verificado para usar los quices.</div>'; return; }
        var tabs = [['mis', 'Mis quices'], ['crear', 'Crear quiz'], ['res', 'Resultados'], ['cfg', 'Configuración']];
        R.innerHTML = '<div class="gq-tabs" role="tablist">' + tabs.map(function (t) { return '<button type="button" role="tab" data-gq-tab="' + t[0] + '" class="' + (S.tab === t[0] ? 'on' : '') + '">' + t[1] + '</button>'; }).join('') + '</div><div id="gqDocBody" class="gq-body"></div>';
        R.querySelectorAll('[data-gq-tab]').forEach(function (b) { b.addEventListener('click', function () { go(b.getAttribute('data-gq-tab')); }); });
        ({ mis: renderMis, crear: renderEditor, res: renderResultados, cfg: renderConfig })[S.tab]();
    }
    function go(tab) { S.tab = tab; render(); }
    function body() { return $('gqDocBody'); }

    /* ======================= Mis quices ======================= */
    function renderMis() {
        var B = body(); B.innerHTML = '<div class="gq-loading">Cargando tus quices…</div>';
        global.GeoSecure && GeoSecure.soyDocenteConfirmado().then(function (ok) {
            if (!ok) B.insertAdjacentHTML('afterbegin', '<div class="gq-alert">Tu cuenta docente aún no está confirmada por un administrador para quices. Podrás crear y publicar evaluaciones cuando lo haga (Panel Administrador → Seguridad).</div>');
        });
        Q().listMine().then(function (list) {
            S.list = list;
            var h = '<div class="gq-bar"><div><small class="gq-k">EVALUACIONES</small><h2>Mis quices</h2></div><button type="button" class="gq-btn primary" data-act="nuevo">＋ Crear quiz</button></div>';
            if (!list.length) h += '<div class="gq-empty">Aún no has creado quices. Pulsa «Crear quiz» para empezar.</div>';
            h += '<div class="gq-grid">' + list.map(function (it) {
                var m = it.meta;
                return '<article class="gq-card" style="--c:' + (m.status === 'published' ? '#22d3ee' : m.status === 'draft' ? '#f59e0b' : '#64748b') + '">' +
                    '<header><div><h3>' + esc(m.title) + '</h3><p>' + esc(m.materia || '') + ' · ' + (m.grupo && m.grupo !== 'Todos' ? 'Grupo ' + esc(m.grupo) : 'Todos los grupos') + (m.unit ? ' · ' + esc(m.unit) : '') + '</p></div>' + chip(m.status) + '</header>' +
                    '<dl><div><dt>Publicación</dt><dd>' + fmt(m.publishAt) + '</dd></div><div><dt>Cierre</dt><dd>' + fmt(m.closeAt) + '</dd></div><div><dt>Duración</dt><dd>' + (m.durationMin ? m.durationMin + ' min' : 'Sin límite') + '</dd></div><div><dt>Entregas</dt><dd>' + it.submitted + ' de ' + it.students + ' estudiante(s)</dd></div></dl>' +
                    '<footer>' +
                    '<button type="button" class="gq-btn" data-act="editar" data-id="' + it.id + '">' + (it.started ? 'Ver / ajustar' : 'Editar') + '</button>' +
                    '<button type="button" class="gq-btn" data-act="res" data-id="' + it.id + '">Resultados</button>' +
                    '<button type="button" class="gq-btn" data-act="dup" data-id="' + it.id + '">Duplicar</button>' +
                    (m.status === 'published' ? '<button type="button" class="gq-btn" data-act="cerrar" data-id="' + it.id + '">Cerrar</button>' : '') +
                    (m.status === 'closed' ? '<button type="button" class="gq-btn" data-act="reabrir" data-id="' + it.id + '">Reabrir</button>' : '') +
                    '<button type="button" class="gq-btn danger" data-act="borrar" data-id="' + it.id + '">Eliminar</button>' +
                    '</footer></article>';
            }).join('') + '</div>';
            B.innerHTML = h;
            B.querySelectorAll('[data-act]').forEach(function (b) { b.addEventListener('click', function () { accionMis(b.getAttribute('data-act'), b.getAttribute('data-id')); }); });
        }).catch(function (e) { B.innerHTML = '<div class="gq-alert">' + esc(e.message) + '</div>'; });
    }
    function accionMis(act, id) {
        var it = S.list.filter(function (x) { return x.id === id; })[0];
        if (act === 'nuevo') { S.ed = null; go('crear'); return; }
        if (act === 'editar') { abrirEditor(id, false); return; }
        if (act === 'dup') { abrirEditor(id, true); return; }
        if (act === 'res') { S.res = id; S.sel = null; go('res'); return; }
        if (act === 'cerrar' || act === 'reabrir') {
            var fields = { status: act === 'cerrar' ? 'closed' : 'published' };
            if (act === 'reabrir' && it.meta.closeAt <= Q().now()) { toast('La fecha de cierre ya pasó: edita el quiz y amplía el cierre para reabrirlo.', true); return; }
            Q().setMetaFields(id, fields).then(function () { toast(act === 'cerrar' ? 'Quiz cerrado.' : 'Quiz reabierto.'); renderMis(); }).catch(function (e) { toast(e.message, true); });
            return;
        }
        if (act === 'borrar') {
            /* con intentos: se advierte que también se borran los intentos y las notas de los estudiantes */
            var msg = it.started
                ? '¿Eliminar «' + it.meta.title + '»?\n\nYa lo presentaron ' + it.students + ' estudiante(s) (' + it.submitted + ' entrega(s)). Se borrarán también sus intentos, respuestas y notas, y desaparecerán de sus calificaciones. Esta acción no se puede deshacer.\n\nSi solo quieres que nadie más lo presente, usa «Cerrar».'
                : '¿Eliminar «' + it.meta.title + '»? Esta acción no se puede deshacer.';
            confirmar(msg, it.started ? 'Eliminar quiz y notas' : 'Eliminar').then(function (ok) {
                if (!ok) return;
                Q().removeQuiz(id, it.meta.courseKey).then(function () {
                    toast('Quiz eliminado.');
                    if (S.res === id) { S.res = null; S.R = null; S.sel = null; }
                    if (Q().watchTeacher) Q().watchTeacher();   /* deja de vigilar las entregas del quiz borrado */
                    renderMis();
                }).catch(function (e) { toast(/permission|denied/i.test(e.message) ? 'No tienes permiso para eliminar este quiz. Verifica que las reglas de Firebase estén actualizadas.' : e.message, true); });
            });
        }
    }

    /* ======================= Editor ======================= */
    /* Puntaje: todo quiz vale 5 y cada pregunta vale 5 ÷ número de preguntas.
       (Los quices que ya tienen intentos conservan sus puntajes para no alterar notas dadas.) */
    var TOTAL = 5;
    function repartir(E) {
        if (!E || E.locked) return;
        var n = E.qs.length;
        E.meta.totalPoints = TOTAL; E.meta.scale = 5;
        if (!n) return;
        var base = Math.round(TOTAL / n * 10000) / 10000;
        E.qs.forEach(function (q, i) { q.points = i < n - 1 ? base : Math.round((TOTAL - base * (n - 1)) * 10000) / 10000; });
    }
    function pts(x) { return String(Math.round((Number(x) || 0) * 100) / 100).replace('.', ','); }
    function defaults() {
        var s = S.settings || {};
        return {
            title: '', description: '', materia: '', grupo: 'Todos', unit: '', instructions: '',
            publishAt: Q().now(), closeAt: Q().now() + 7 * 864e5, durationMin: s.durationMin != null ? s.durationMin : 30,
            maxAttempts: s.maxAttempts || 1, totalPoints: TOTAL, status: 'draft', version: 1,
            showScore: s.showScore !== false, feedbackAfterClose: !!s.feedbackAfterClose, oneAtATime: !!s.oneAtATime,
            shuffleOptions: !!s.shuffleOptions, scale: 5
        };
    }
    function nuevaPregunta(type) {
        return { id: Q().uid('p'), type: type || 'mc', text: '', points: 1, image: '', options: { A: '', B: '', C: '', D: '' }, correct: type === 'tf' ? true : 'A', explanation: '', criteria: '', maxChars: 1500 };
    }
    function abrirEditor(id, duplicar) {
        Q().loadQuiz(id).then(function (qz) {
            var qs = Object.keys(qz.questions).map(function (k) {
                var q = qz.questions[k], key = qz.keys[k] || {};
                return { id: duplicar ? Q().uid('p') : k, type: q.type, text: q.text, points: q.points, image: q.image || '', options: q.options || { A: '', B: '', C: '', D: '' }, correct: key.correct !== undefined ? key.correct : (q.type === 'tf' ? true : 'A'), explanation: key.explanation || '', criteria: key.criteria || '', maxChars: q.maxChars || 1500, order: q.order };
            }).sort(function (a, b) { return a.order - b.order; });
            var meta = Object.assign({}, qz.meta);
            if (duplicar) { meta.title = meta.title + ' (copia)'; meta.status = 'draft'; meta.version = 1; delete meta.createdAt; }
            S.ed = { id: duplicar ? Q().uid('q') : id, meta: meta, qs: qs, locked: !duplicar && qz.hasAttempts, dirty: false };
            go('crear');
        }).catch(function (e) { toast(e.message, true); });
    }
    function guardarLocal() { try { if (S.ed) localStorage.setItem('gq_draft_' + Q().myKey(), JSON.stringify(S.ed)); } catch (e) {} }
    function leerLocal() { try { return JSON.parse(localStorage.getItem('gq_draft_' + Q().myKey()) || 'null'); } catch (e) { return null; } }
    function borrarLocal() { try { localStorage.removeItem('gq_draft_' + Q().myKey()); } catch (e) {} }

    function renderEditor() {
        var B = body();
        if (!S.ed) {
            var loc = leerLocal();
            if (loc && loc.dirty) {
                B.innerHTML = '<div class="gq-alert info">Tienes un quiz sin guardar: «' + esc(loc.meta.title || 'Sin título') + '». <button type="button" class="gq-btn" id="gqRecuperar">Recuperarlo</button> <button type="button" class="gq-btn" id="gqDescartar">Empezar uno nuevo</button></div>';
                $('gqRecuperar').onclick = function () { S.ed = loc; renderEditor(); };
                $('gqDescartar').onclick = function () { borrarLocal(); S.ed = { id: Q().uid('q'), meta: defaults(), qs: [nuevaPregunta('mc')], locked: false, dirty: false }; renderEditor(); };
                return;
            }
            S.ed = { id: Q().uid('q'), meta: defaults(), qs: [nuevaPregunta('mc')], locked: false, dirty: false };
        }
        var E = S.ed, m = E.meta, u = sesion() || {};
        repartir(E);
        var mats = []; try { mats = global.aulaMateriasUsuario(u) || []; } catch (e) {}
        var grupos = ['Todos'];
        mats.forEach(function (x) { if (x.nombre === m.materia) String(x.grupo || '').split(/[,;]/).concat(x.grupos || []).forEach(function (g) { g = String(g).trim().toUpperCase(); if (g && grupos.indexOf(g) < 0) grupos.push(g); }); });
        var L = E.locked;
        var h = '<div class="gq-bar"><div><small class="gq-k">' + (L ? 'QUIZ CON INTENTOS · EDICIÓN PROTEGIDA' : 'EDITOR') + '</small><h2>' + esc(m.title || 'Nuevo quiz') + '</h2></div>' + chip(m.status) + '</div>';
        if (L) h += '<div class="gq-alert">Algunos estudiantes ya iniciaron este quiz. Para proteger sus intentos, las preguntas, puntajes, claves y la duración no se pueden cambiar. Puedes ajustar textos generales, ampliar el cierre, aumentar intentos o cerrar el quiz. Para cambios de fondo usa «Duplicar».</div>';
        h += '<section class="gq-panel"><h4>Datos generales</h4><div class="gq-form">' +
            fld('Título del quiz', '<input id="gqT" maxlength="200" value="' + esc(m.title) + '" placeholder="Ej. Quiz 1 · Clasificación de suelos">', 2) +
            fld('Asignatura', '<select id="gqMat"' + (L ? ' disabled' : '') + '><option value="">Selecciona…</option>' + mats.map(function (x) { return '<option' + (x.nombre === m.materia ? ' selected' : '') + '>' + esc(x.nombre) + '</option>'; }).join('') + '</select>') +
            fld('Grupo', '<select id="gqGr"' + (L ? ' disabled' : '') + '>' + grupos.map(function (g) { return '<option value="' + esc(g) + '"' + (g === m.grupo ? ' selected' : '') + '>' + (g === 'Todos' ? 'Todos los grupos' : 'Grupo ' + esc(g)) + '</option>'; }).join('') + '</select>') +
            fld('Unidad o tema', '<input id="gqU" maxlength="120" value="' + esc(m.unit) + '">') +
            fld('Descripción', '<textarea id="gqD" rows="2" maxlength="600">' + esc(m.description) + '</textarea>', 2) +
            fld('Instrucciones para los estudiantes', '<textarea id="gqI" rows="3" maxlength="2000">' + esc(m.instructions) + '</textarea>', 2) +
            fld('Fecha de publicación', '<input type="datetime-local" id="gqP" value="' + toLocalInput(m.publishAt) + '">') +
            fld('Fecha y hora de cierre', '<input type="datetime-local" id="gqC" value="' + toLocalInput(m.closeAt) + '">') +
            fld('Duración (minutos, 0 = sin límite)', '<input type="number" id="gqDur" min="0" max="600" value="' + esc(m.durationMin) + '"' + (L ? ' disabled' : '') + '>') +
            fld('Intentos máximos', '<input type="number" id="gqAt" min="1" max="9" value="' + esc(m.maxAttempts) + '">') +
            fld('Puntaje total', '<input value="' + pts(m.totalPoints) + ' (nota de 0,0 a ' + pts(m.scale || 5) + ')" disabled>') +
            fld('Valor de cada pregunta', '<input value="' + (L ? 'Según el quiz original' : (E.qs.length ? pts(TOTAL / E.qs.length) + ' pt  (5 ÷ ' + E.qs.length + (E.qs.length === 1 ? ' pregunta)' : ' preguntas)') : '—')) + '" disabled>') +
            '</div><div class="gq-checks">' +
            chk('gqOne', 'Mostrar una pregunta a la vez', m.oneAtATime) +
            chk('gqShuf', 'Orden aleatorio de las opciones A–D', m.shuffleOptions) +
            chk('gqShow', 'El estudiante ve su nota cuando esté calificada', m.showScore) +
            chk('gqFb', 'Mostrar respuestas correctas y explicaciones después del cierre', m.feedbackAfterClose) +
            '</div></section>';
        var total = sumPoints(E.qs);
        h += '<section class="gq-panel"><div class="gq-qhead"><h4>Preguntas</h4><span class="gq-meter ' + (total === +m.totalPoints ? 'ok' : 'bad') + '">' + E.qs.length + ' pregunta(s) · ' + pts(total) + ' de ' + pts(m.totalPoints) + ' puntos</span></div>' +
            '<div id="gqQs" class="gq-qs">' + E.qs.map(function (q, i) { return preguntaHtml(q, i, L); }).join('') + '</div>' +
            (L ? '' : '<div class="gq-add"><span>Agregar pregunta:</span><button type="button" class="gq-btn" data-add="mc">＋ Selección múltiple</button><button type="button" class="gq-btn" data-add="tf">＋ Falso / Verdadero</button><button type="button" class="gq-btn" data-add="open">＋ Abierta</button></div>') +
            '</section>';
        h += '<div class="gq-actions"><span id="gqMsg" class="gq-msg"></span><button type="button" class="gq-btn" id="gqPrev">Vista previa</button><button type="button" class="gq-btn" id="gqSave">' + (L ? 'Guardar cambios' : 'Guardar borrador') + '</button>' + (L ? '' : '<button type="button" class="gq-btn primary" id="gqPub">' + (m.status === 'published' ? 'Guardar y mantener publicado' : 'Publicar quiz') + '</button>') + '</div>';
        B.innerHTML = h;
        bindEditor();
    }
    function fld(label, input, span) { return '<label class="gq-f' + (span ? ' span' + span : '') + '"><span>' + label + '</span>' + input + '</label>'; }
    function chk(id, label, on) { return '<label class="gq-chk"><input type="checkbox" id="' + id + '"' + (on ? ' checked' : '') + '> ' + label + '</label>'; }
    function preguntaHtml(q, i, L) {
        var dis = L ? ' disabled' : '';
        var h = '<article class="gq-q" data-i="' + i + '">' +
            '<header>' + (L ? '' : '<span class="gq-drag" draggable="true" title="Arrastra para reordenar" aria-label="Arrastrar pregunta">⋮⋮</span>') + '<b>Pregunta ' + (i + 1) + '</b>' +
            '<select data-f="type"' + dis + '>' + Object.keys(TYPES).map(function (t) { return '<option value="' + t + '"' + (t === q.type ? ' selected' : '') + '>' + TYPES[t] + '</option>'; }).join('') + '</select>' +
            '<span class="gq-pts" title="El quiz vale 5 y se reparte por igual entre las preguntas">Vale <b>' + pts(q.points) + '</b> pt</span>' +
            (q.type === 'open' ? '<span class="gq-auto-tag manual" title="Aparece en Resultados para que la califiques">La calificas tú</span>' : '<span class="gq-auto-tag" title="Se compara con la respuesta correcta al entregar">Calificación automática</span>') +
            (L ? '' : '<span class="gq-qtools"><button type="button" data-q="up" title="Subir">↑</button><button type="button" data-q="down" title="Bajar">↓</button><button type="button" data-q="dup" title="Duplicar">⧉</button><button type="button" data-q="del" title="Eliminar">✕</button></span>') +
            '</header>' +
            '<textarea data-f="text" rows="2" maxlength="5000" placeholder="Escribe el enunciado…"' + dis + '>' + esc(q.text) + '</textarea>' +
            '<div class="gq-img">' + (q.image ? '<img src="' + esc(q.image) + '" alt="Imagen de apoyo">' : '') +
            (L ? '' : '<label class="gq-btn small">' + (q.image ? 'Cambiar imagen' : '＋ Imagen de apoyo') + '<input type="file" accept="image/*" data-f="image" hidden></label>' + (q.image ? '<button type="button" class="gq-btn small" data-q="noimg">Quitar imagen</button>' : '')) + '</div>';
        if (q.type === 'mc') {
            h += '<div class="gq-opts">' + ['A', 'B', 'C', 'D'].map(function (k) {
                return '<label class="gq-opt' + (q.correct === k ? ' right' : '') + '"><input type="radio" name="gqc' + i + '" data-f="correct" value="' + k + '"' + (q.correct === k ? ' checked' : '') + dis + ' title="Marcar como correcta"><b>' + k + '</b><input data-opt="' + k + '" maxlength="500" value="' + esc(q.options[k]) + '" placeholder="Opción ' + k + '"' + dis + '></label>';
            }).join('') + '</div><p class="gq-hint">Marca el círculo de la opción correcta. El estudiante nunca recibe esta información antes de entregar.</p>';
        } else if (q.type === 'tf') {
            h += '<div class="gq-tf"><label><input type="radio" name="gqc' + i + '" data-f="correct" value="true"' + (q.correct === true ? ' checked' : '') + dis + '> Verdadero</label><label><input type="radio" name="gqc' + i + '" data-f="correct" value="false"' + (q.correct === false ? ' checked' : '') + dis + '> Falso</label></div>';
        } else {
            h += '<div class="gq-form"><label class="gq-f span2"><span>Respuesta esperada o criterios de evaluación (solo para ti)</span><textarea data-f="criteria" rows="2" maxlength="3000"' + dis + '>' + esc(q.criteria) + '</textarea></label>' +
                '<label class="gq-f"><span>Límite de caracteres de la respuesta</span><input type="number" min="50" max="20000" data-f="maxChars" value="' + esc(q.maxChars) + '"' + dis + '></label></div>';
        }
        if (q.type !== 'open') h += '<label class="gq-f"><span>Explicación de la respuesta correcta (opcional)</span><textarea data-f="explanation" rows="1" maxlength="2000"' + dis + '>' + esc(q.explanation) + '</textarea></label>';
        return h + '</article>';
    }
    function leerGenerales() {
        var E = S.ed, m = E.meta;
        m.title = $('gqT').value.trim(); m.unit = $('gqU').value.trim(); m.description = $('gqD').value.trim(); m.instructions = $('gqI').value.trim();
        m.publishAt = fromLocalInput($('gqP').value); m.closeAt = fromLocalInput($('gqC').value);
        m.maxAttempts = Math.max(1, Math.min(9, parseInt($('gqAt').value, 10) || 1));
        m.oneAtATime = $('gqOne').checked; m.shuffleOptions = $('gqShuf').checked; m.showScore = $('gqShow').checked; m.feedbackAfterClose = $('gqFb').checked;
        if (!E.locked) {
            m.materia = $('gqMat').value; m.grupo = $('gqGr').value || 'Todos';
            m.durationMin = Math.max(0, Math.min(600, parseInt($('gqDur').value, 10) || 0));
            repartir(E);
        }
        E.dirty = true; guardarLocal();
    }
    function bindEditor() {
        var B = body(), E = S.ed;
        ['gqT', 'gqU', 'gqD', 'gqI', 'gqP', 'gqC', 'gqDur', 'gqAt', 'gqOne', 'gqShuf', 'gqShow', 'gqFb', 'gqGr'].forEach(function (id) { var x = $(id); if (x) x.addEventListener('change', leerGenerales); });
        $('gqT').addEventListener('input', function () { E.meta.title = this.value; E.dirty = true; guardarLocal(); });
        var mat = $('gqMat'); if (mat) mat.addEventListener('change', function () { leerGenerales(); E.meta.grupo = 'Todos'; renderEditor(); });
        B.querySelectorAll('[data-add]').forEach(function (b) { b.addEventListener('click', function () { leerGenerales(); E.qs.push(nuevaPregunta(b.getAttribute('data-add'))); renderEditor(); var qs = $('gqQs'); if (qs && qs.lastElementChild) qs.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'center' }); }); });
        B.querySelectorAll('.gq-q').forEach(function (card) {
            var i = +card.getAttribute('data-i'), q = E.qs[i];
            card.querySelectorAll('[data-f]').forEach(function (inp) {
                var f = inp.getAttribute('data-f');
                inp.addEventListener(f === 'image' ? 'change' : (inp.tagName === 'SELECT' || inp.type === 'radio' ? 'change' : 'input'), function () {
                    if (f === 'type') { q.type = inp.value; q.correct = q.type === 'tf' ? true : 'A'; leerGenerales(); renderEditor(); return; }
                    if (f === 'points') { q.points = Math.max(0.25, Number(inp.value) || 0); refreshMeter(); }
                    else if (f === 'correct') { q.correct = q.type === 'tf' ? inp.value === 'true' : inp.value; card.querySelectorAll('.gq-opt').forEach(function (o) { o.classList.toggle('right', o.querySelector('[data-f=correct]').checked); }); }
                    else if (f === 'maxChars') q.maxChars = Math.max(50, Math.min(20000, parseInt(inp.value, 10) || 1500));
                    else if (f === 'image') { cargarImagen(inp.files[0], function (data) { q.image = data; leerGenerales(); renderEditor(); }); return; }
                    else q[f] = inp.value;
                    E.dirty = true; guardarLocal();
                });
            });
            card.querySelectorAll('[data-opt]').forEach(function (inp) { inp.addEventListener('input', function () { q.options[inp.getAttribute('data-opt')] = inp.value; E.dirty = true; guardarLocal(); }); });
            card.querySelectorAll('[data-q]').forEach(function (b) {
                b.addEventListener('click', function () {
                    var a = b.getAttribute('data-q'); leerGenerales();
                    if (a === 'del') { E.qs.splice(i, 1); }
                    else if (a === 'dup') { var c = JSON.parse(JSON.stringify(q)); c.id = Q().uid('p'); E.qs.splice(i + 1, 0, c); }
                    else if (a === 'up' && i > 0) { E.qs.splice(i - 1, 0, E.qs.splice(i, 1)[0]); }
                    else if (a === 'down' && i < E.qs.length - 1) { E.qs.splice(i + 1, 0, E.qs.splice(i, 1)[0]); }
                    else if (a === 'noimg') { q.image = ''; }
                    renderEditor();
                });
            });
            if (!E.locked) {
                var handle = card.querySelector('.gq-drag');
                if (handle) {
                    handle.addEventListener('dragstart', function (ev) { S.dragIdx = i; card.classList.add('dragging'); ev.dataTransfer.effectAllowed = 'move'; try { ev.dataTransfer.setData('text/plain', String(i)); ev.dataTransfer.setDragImage(card, 20, 20); } catch (e) {} });
                    handle.addEventListener('dragend', function () { card.classList.remove('dragging'); });
                }
                card.addEventListener('dragover', function (ev) { ev.preventDefault(); card.classList.add('over'); });
                card.addEventListener('dragleave', function () { card.classList.remove('over'); });
                card.addEventListener('drop', function (ev) {
                    ev.preventDefault(); card.classList.remove('over');
                    var from = S.dragIdx; if (from < 0 || from === i) return;
                    leerGenerales(); E.qs.splice(i, 0, E.qs.splice(from, 1)[0]); S.dragIdx = -1; renderEditor();
                });
            }
        });
        $('gqPrev').onclick = function () { leerGenerales(); vistaPrevia(false); };
        $('gqSave').onclick = function () { leerGenerales(); guardar(E.locked ? E.meta.status : 'draft'); };
        var pub = $('gqPub'); if (pub) pub.onclick = function () { leerGenerales(); var errs = validar(true); if (errs.length) { mostrarErrores(errs); return; } vistaPrevia(true); };
    }
    function refreshMeter() {
        var E = S.ed, el = body().querySelector('.gq-meter'), t = sumPoints(E.qs);
        if (el) { el.textContent = E.qs.length + ' pregunta(s) · ' + pts(t) + ' de ' + pts(E.meta.totalPoints) + ' puntos'; el.className = 'gq-meter ' + (t === +E.meta.totalPoints ? 'ok' : 'bad'); }
    }
    function cargarImagen(file, cb) {
        if (!file || !/^image\//.test(file.type)) return;
        var r = new FileReader();
        r.onload = function () {
            var img = new Image();
            img.onload = function () {
                var k = Math.min(1, 900 / Math.max(img.width, img.height)), c = doc.createElement('canvas');
                c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
                var x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
                var q = 0.85, data = c.toDataURL('image/jpeg', q);
                while (data.length > 380000 && q > 0.4) { q -= 0.1; data = c.toDataURL('image/jpeg', q); }
                if (data.length > 380000) { toast('La imagen es demasiado pesada incluso comprimida.', true); return; }
                cb(data);
            };
            img.src = r.result;
        };
        r.readAsDataURL(file);
    }
    function validar(publicar) {
        var E = S.ed, m = E.meta, e = [];
        repartir(E);
        if (!m.title) e.push('Escribe el título del quiz.');
        if (!m.materia) e.push('Selecciona la asignatura.');
        if (!publicar) return e;
        if (!m.closeAt || m.closeAt <= Q().now()) e.push('La fecha de cierre debe ser futura.');
        if (!m.publishAt || m.publishAt >= m.closeAt) e.push('La publicación debe ser anterior al cierre.');
        if (!E.qs.length) e.push('Agrega al menos una pregunta.');
        E.qs.forEach(function (q, i) {
            var n = 'Pregunta ' + (i + 1) + ': ';
            if (!String(q.text).trim()) e.push(n + 'falta el enunciado.');
            if (!(Number(q.points) > 0)) e.push(n + 'el puntaje debe ser mayor que 0.');
            if (q.type === 'mc') {
                ['A', 'B', 'C', 'D'].forEach(function (k) { if (!String(q.options[k] || '').trim()) e.push(n + 'falta la opción ' + k + '.'); });
                if (['A', 'B', 'C', 'D'].indexOf(q.correct) < 0) e.push(n + 'marca la opción correcta.');
            }
            if (q.type === 'tf' && typeof q.correct !== 'boolean') e.push(n + 'indica si es verdadera o falsa.');
        });
        var t = sumPoints(E.qs);
        if (Math.abs(t - +m.totalPoints) > 0.01) e.push('La suma de puntajes (' + pts(t) + ') no coincide con el puntaje total (' + pts(m.totalPoints) + ').');
        return e;
    }
    function mostrarErrores(errs) {
        var el = $('gqMsg');
        el.innerHTML = '<span class="bad">Revisa antes de publicar:</span><ul>' + errs.slice(0, 8).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>';
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    function serializar() {
        var E = S.ed, questions = {}, keys = {};
        E.qs.forEach(function (q, i) {
            var o = { type: q.type, text: String(q.text || ''), points: Number(q.points) > 0 ? Number(q.points) : 0.25, order: i };
            if (q.image) o.image = q.image;
            if (q.type === 'mc') o.options = { A: q.options.A || '', B: q.options.B || '', C: q.options.C || '', D: q.options.D || '' };
            if (q.type === 'open') o.maxChars = q.maxChars || 1500;
            questions[q.id] = o;
            keys[q.id] = q.type === 'open' ? { criteria: q.criteria || '' } : { correct: q.correct, explanation: q.explanation || '' };
        });
        return { questions: questions, keys: keys };
    }
    function guardar(status) {
        var E = S.ed, errs = validar(status === 'published');
        if (errs.length) { mostrarErrores(errs); return; }
        var meta = Object.assign({}, E.meta, { status: status, ownerName: (sesion() && sesion().nombre) || '' });
        if (!E.locked) meta.version = (Number(meta.version) || 0) + 1;
        if (!meta.closeAt) meta.closeAt = Q().now() + 7 * 864e5;
        if (!meta.publishAt) meta.publishAt = Q().now();
        var ser = serializar(), msg = $('gqMsg');
        msg.textContent = 'Guardando…';
        Q().saveQuiz(E.id, meta, ser.questions, ser.keys, { locked: E.locked }).then(function () {
            E.meta = meta; E.dirty = false; borrarLocal();
            toast(status === 'published' ? 'Quiz publicado: ya aparece a tus estudiantes.' : 'Quiz guardado.');
            S.ed = null; go('mis');
        }).catch(function (e) {
            var t = String(e && (e.code || e.message));
            msg.innerHTML = '<span class="bad">' + esc(/permission/i.test(t) ? 'Firebase rechazó el guardado. Verifica que tu cuenta docente esté confirmada por un administrador y que dictes esa asignatura.' : e.message) + '</span>';
        });
    }

    /* ---------- Vista previa (y confirmación de publicación) ---------- */
    function vistaPrevia(publicar) {
        var E = S.ed, m = E.meta;
        doc.querySelectorAll('.gq-modal').forEach(function (x) { x.remove(); }); // nunca dos vistas previas con datos distintos
        var ov = doc.createElement('div'); ov.className = 'gq-modal';
        ov.innerHTML = '<div class="gq-dlg wide" role="dialog" aria-modal="true" aria-label="Vista previa"><header><div><small class="gq-k">VISTA PREVIA' + (publicar ? ' · REVISA ANTES DE PUBLICAR' : '') + '</small><h3>' + esc(m.title || 'Sin título') + '</h3></div><button type="button" class="gq-x" data-close aria-label="Cerrar">✕</button></header>' +
            '<div class="gq-dlg-body"><dl class="gq-sum"><div><dt>Asignatura</dt><dd>' + esc(m.materia) + ' · ' + esc(m.grupo === 'Todos' ? 'Todos los grupos' : 'Grupo ' + m.grupo) + '</dd></div><div><dt>Tiempo</dt><dd>' + (m.durationMin ? m.durationMin + ' minutos' : 'Sin límite') + '</dd></div><div><dt>Publicación</dt><dd>' + fmt(m.publishAt) + '</dd></div><div><dt>Cierre</dt><dd>' + fmt(m.closeAt) + '</dd></div><div><dt>Intentos</dt><dd>' + m.maxAttempts + '</dd></div><div><dt>Puntaje</dt><dd>' + sumPoints(E.qs) + ' / ' + m.totalPoints + '</dd></div></dl>' +
            (m.instructions ? '<div class="gq-instr"><b>Instrucciones</b><p>' + esc(m.instructions) + '</p></div>' : '') +
            E.qs.map(function (q, i) {
                var h = '<div class="gq-pq"><header><b>' + (i + 1) + '. ' + TYPES[q.type] + '</b><span>' + pts(q.points) + ' pt</span></header><p>' + esc(q.text) + '</p>' + (q.image ? '<img src="' + esc(q.image) + '" alt="">' : '');
                if (q.type === 'mc') h += '<ul>' + ['A', 'B', 'C', 'D'].map(function (k) { return '<li class="' + (q.correct === k ? 'right' : '') + '"><b>' + k + '.</b> ' + esc(q.options[k]) + (q.correct === k ? ' <em>✓ correcta</em>' : '') + '</li>'; }).join('') + '</ul>';
                if (q.type === 'tf') h += '<ul><li class="' + (q.correct === true ? 'right' : '') + '">Verdadero' + (q.correct === true ? ' <em>✓</em>' : '') + '</li><li class="' + (q.correct === false ? 'right' : '') + '">Falso' + (q.correct === false ? ' <em>✓</em>' : '') + '</li></ul>';
                if (q.type === 'open') h += '<div class="gq-ans-box">Respuesta extensa del estudiante (máx. ' + q.maxChars + ' caracteres)</div>' + (q.criteria ? '<p class="gq-hint">Criterio: ' + esc(q.criteria) + '</p>' : '');
                return h + '</div>';
            }).join('') + '<p class="gq-hint">Las marcas ✓ y los criterios solo los ves tú.</p></div>' +
            '<footer><button type="button" class="gq-btn" data-close>Volver al editor</button>' + (publicar ? '<button type="button" class="gq-btn" data-draft>Guardar borrador</button><button type="button" class="gq-btn primary" data-pub>Publicar quiz</button>' : '') + '</footer></div>';
        doc.body.appendChild(ov);
        ov.querySelectorAll('[data-close]').forEach(function (b) { b.onclick = function () { ov.remove(); }; });
        var p = ov.querySelector('[data-pub]'); if (p) p.onclick = function () { ov.remove(); guardar('published'); };
        var d = ov.querySelector('[data-draft]'); if (d) d.onclick = function () { ov.remove(); guardar('draft'); };
    }

    /* ======================= Resultados ======================= */
    function renderResultados() {
        var B = body();
        B.innerHTML = '<div class="gq-loading">Cargando…</div>';
        (S.list.length ? Promise.resolve(S.list) : Q().listMine()).then(function (list) {
            S.list = list;
            if (!list.length) { B.innerHTML = '<div class="gq-empty">Aún no hay quices.</div>'; return; }
            if (!S.res) S.res = list[0].id;
            B.innerHTML = '<div class="gq-bar"><label class="gq-f"><span>Quiz</span><select id="gqResSel">' + list.map(function (x) { return '<option value="' + x.id + '"' + (x.id === S.res ? ' selected' : '') + '>' + esc(x.meta.title) + ' · ' + esc(x.meta.materia) + '</option>'; }).join('') + '</select></label><button type="button" class="gq-btn primary" id="gqRegrade">Actualizar y calificar</button></div><div id="gqResBody"><div class="gq-loading">Calificando y cargando resultados…</div></div>';
            $('gqResSel').onchange = function () { S.res = this.value; S.sel = null; cargarResultados(true); };
            $('gqRegrade').onclick = function () { cargarResultados(true); };
            cargarResultados(true);
        }).catch(function (e) { B.innerHTML = '<div class="gq-alert">' + esc(e.message) + '</div>'; });
    }
    function cargarResultados(calificar) {
        var RB = $('gqResBody'); if (!RB) return;
        RB.innerHTML = '<div class="gq-loading">' + (calificar ? 'Calificando preguntas objetivas y cerrando intentos vencidos…' : 'Cargando…') + '</div>';
        var pre = calificar ? Q().grade(S.res).catch(function (e) { toast('Calificador: ' + e.message, true); return null; }) : Promise.resolve(null);
        pre.then(function () { return Q().results(S.res); }).then(function (r) { S.R = r; pintarResultados(); })
            .catch(function (e) { RB.innerHTML = '<div class="gq-alert">' + esc(e.message) + '</div>'; });
    }
    function filas(r) {
        var rows = [], keys = {};
        Object.keys(r.roster).forEach(function (k) { keys[k] = true; });
        Object.keys(r.attempts).forEach(function (k) { keys[k] = true; });
        Object.keys(keys).forEach(function (s) {
            var atts = r.attempts[s] || {}, ns = Object.keys(atts).sort(), best = null, lastSub = null, pend = 0, prog = false;
            ns.forEach(function (n) {
                var a = atts[n], g = (r.grades[s] || {})[n];
                /* un intento vencido que ya se calificó cuenta como entregado por tiempo */
                if (a.submittedAt || (g && g.expiredAuto)) { lastSub = n; var sm = Q().summarize(r.meta, r.questions, a, g); pend += sm.openPending; if (sm.final && (best === null || sm.nota > best.nota)) best = { n: n, nota: sm.nota, points: sm.points }; }
                else if (!Q().expired(r.meta, a)) prog = true;
            });
            var info = r.roster[s] || {};
            rows.push({ s: s, nombre: info.nombre || (ns.length && atts[ns[0]].name) || s.replace(/_at_.*/, '').replace(/,/g, '.'), codigo: info.codigo || '', email: info.email || '', ns: ns, lastSub: lastSub,
                submittedAt: lastSub ? (atts[lastSub].submittedAt || Q().deadline(r.meta, atts[lastSub])) : null, best: best, pend: pend,
                estado: lastSub ? (pend ? 'Pendiente de calificación' : (best ? 'Calificado' : 'Entregado')) : (prog ? 'En progreso' : (ns.length ? 'Sin entregar' : 'No presentó')) });
        });
        return rows.sort(function (a, b) { return a.nombre.localeCompare(b.nombre, 'es'); });
    }
    function pintarResultados() {
        var r = S.R, RB = $('gqResBody'), rows = filas(r), m = r.meta, scale = +m.scale || 5;
        var notas = rows.filter(function (x) { return x.best; }).map(function (x) { return x.best.nota; });
        var presentaron = rows.filter(function (x) { return x.lastSub; }).length;
        var inscritos = Object.keys(r.roster).length;
        var avg = notas.length ? Math.round(notas.reduce(function (a, b) { return a + b; }, 0) / notas.length * 10) / 10 : null;
        var bins = [0, 0, 0, 0, 0];
        notas.forEach(function (n) { bins[Math.min(4, Math.floor(n / scale * 5))]++; });
        var maxBin = Math.max.apply(null, bins.concat([1]));
        var qids = Object.keys(r.questions).sort(function (a, b) { return r.questions[a].order - r.questions[b].order; });
        var perQ = qids.filter(function (q) { return r.questions[q].type !== 'open'; }).map(function (q) {
            var tot = 0, ok = 0;
            Object.keys(r.grades).forEach(function (s) { Object.keys(r.grades[s] || {}).forEach(function (n) { var a = (r.grades[s][n].auto || {})[q]; if (a) { tot++; if (a.correct) ok++; } }); });
            return { q: q, i: qids.indexOf(q) + 1, pct: tot ? Math.round(ok / tot * 100) : null };
        });
        var h = '<div class="gq-kpis">' +
            kpi(inscritos, 'Inscritos') + kpi(presentaron, 'Presentaron') + kpi(Math.max(0, inscritos - presentaron), 'Pendientes por presentar') +
            kpi(rows.reduce(function (a, x) { return a + x.pend; }, 0), 'Respuestas por calificar') +
            kpi(avg === null ? '—' : avg, 'Promedio') + kpi(notas.length ? Math.max.apply(null, notas) : '—', 'Nota máxima') + kpi(notas.length ? Math.min.apply(null, notas) : '—', 'Nota mínima') + '</div>';
        h += '<div class="gq-two"><section class="gq-panel"><h4>Distribución de notas</h4>' + (notas.length ? '<div class="gq-hist">' + bins.map(function (b, i) {
            var lo = Math.round(i * scale / 5 * 10) / 10, hi = Math.round((i + 1) * scale / 5 * 10) / 10;
            return '<div><i style="height:' + Math.round(b / maxBin * 100) + '%"></i><b>' + b + '</b><span>' + lo + '–' + hi + '</span></div>';
        }).join('') + '</div>' : '<p class="gq-hint">Sin notas finales todavía.</p>') + '</section>' +
            '<section class="gq-panel"><h4>Aciertos por pregunta objetiva</h4>' + (perQ.length ? perQ.map(function (p) { return '<div class="gq-bar-row"><span>P' + p.i + '</span><i><b style="width:' + (p.pct || 0) + '%"></b></i><em>' + (p.pct === null ? '—' : p.pct + ' %') + '</em></div>'; }).join('') : '<p class="gq-hint">Este quiz no tiene preguntas objetivas.</p>') + '</section></div>';
        h += '<section class="gq-panel"><h4>Estudiantes</h4><div class="gq-table-wrap"><table class="gq-table"><thead><tr><th>Estudiante</th><th>Estado</th><th>Entrega</th><th>Puntaje</th><th>Nota</th><th>Por calificar</th><th></th></tr></thead><tbody>' +
            (rows.length ? rows.map(function (x) {
                return '<tr><td><b>' + esc(x.nombre) + '</b>' + (x.codigo ? '<small>' + esc(x.codigo) + '</small>' : '') + '</td><td><span class="gq-st ' + esc(x.estado.split(' ')[0].toLowerCase()) + '">' + esc(x.estado) + '</span></td><td>' + fmt(x.submittedAt) + '</td><td>' + (x.best ? pts(x.best.points) + ' / ' + pts(m.totalPoints) : '—') + '</td><td>' + (x.best ? '<b>' + x.best.nota + '</b>' : '—') + '</td><td>' + (x.pend || '—') + '</td><td>' + (x.ns.length ? '<button type="button" class="gq-btn small" data-det="' + esc(x.s) + '">Ver detalle</button>' : '') + '</td></tr>';
            }).join('') : '<tr><td colspan="7">Aún no hay estudiantes inscritos en este curso.</td></tr>') + '</tbody></table></div></section><div id="gqDet"></div>';
        RB.innerHTML = h;
        RB.querySelectorAll('[data-det]').forEach(function (b) { b.onclick = function () { S.sel = b.getAttribute('data-det'); detalle(); }; });
        if (S.sel) detalle();
    }
    function kpi(n, l) { return '<div class="gq-kpi"><b>' + esc(n) + '</b><span>' + esc(l) + '</span></div>'; }
    function detalle() {
        var r = S.R, s = S.sel, D = $('gqDet'), atts = r.attempts[s] || {}, ns = Object.keys(atts).sort();
        var info = r.roster[s] || {}, nombre = info.nombre || (ns.length && atts[ns[0]].name) || s;
        var qids = Object.keys(r.questions).sort(function (a, b) { return r.questions[a].order - r.questions[b].order; });
        var h = '<section class="gq-panel gq-detail"><div class="gq-qhead"><h4>' + esc(nombre) + '</h4><button type="button" class="gq-btn small" id="gqDetX">Cerrar detalle</button></div>';
        ns.forEach(function (n) {
            var a = atts[n], g = (r.grades[s] || {})[n] || {}, sm = Q().summarize(r.meta, r.questions, a, g);
            h += '<div class="gq-att"><header><b>Intento ' + (+n.slice(1) + 1) + '</b><span>Inició ' + fmt(a.startedAt) + ' · ' + (a.submittedAt ? 'Entregó ' + fmt(a.submittedAt) + (a.autoSubmitted ? ' (cerrado por tiempo)' : '') : 'Sin entregar') + '</span><em>' + (sm.final ? 'Nota ' + sm.nota + ' · ' + pts(sm.points) + ' pts' : (a.submittedAt ? (g.auto ? 'Pendiente de calificación (' + sm.openPending + ')' : 'Sin calificar: pulsa «Actualizar y calificar»') : 'En curso')) + '</em></header>';
            qids.forEach(function (q, i) {
                var Qn = r.questions[q], k = r.keys[q] || {}, ans = (a.answers || {})[q], has = ans !== undefined && String(ans).trim() !== '', au = (g.auto || {})[q], man = (g.manual || {})[q];
                h += '<div class="gq-ans"><p><b>' + (i + 1) + '.</b> ' + esc(Qn.text) + ' <small>(' + pts(Qn.points) + ' pt)</small></p>';
                if (Qn.type === 'mc') h += '<p>Respondió: <b>' + (has ? esc(ans) + ') ' + esc((Qn.options || {})[ans] || '') : 'sin respuesta') + '</b> · Correcta: <b>' + esc(k.correct) + '</b> ' + mark(au) + ' <small class="gq-auto-tag">calificación automática</small></p>';
                else if (Qn.type === 'tf') h += '<p>Respondió: <b>' + (has ? (ans ? 'Verdadero' : 'Falso') : 'sin respuesta') + '</b> · Correcta: <b>' + (k.correct ? 'Verdadero' : 'Falso') + '</b> ' + mark(au) + ' <small class="gq-auto-tag">calificación automática</small></p>';
                else {
                    h += '<div class="gq-open-ans">' + (has ? esc(ans) : '<i>Sin respuesta</i>') + '</div>' + (k.criteria ? '<p class="gq-hint">Criterio: ' + esc(k.criteria) + '</p>' : '');
                    if (has && a.submittedAt) h += '<div class="gq-grade-row" data-n="' + n + '" data-q="' + q + '"><label>Puntaje (máx. ' + pts(Qn.points) + ') <input type="number" min="0" max="' + Qn.points + '" step="any" value="' + (man && typeof man.points === 'number' ? man.points : '') + '"></label><label class="grow">Observación <input maxlength="2000" value="' + esc(man ? man.comment : '') + '" placeholder="Retroalimentación para el estudiante"></label><button type="button" class="gq-btn small primary">Guardar</button>' + (man ? '<em>✓ calificada</em>' : '<em class="warn">pendiente</em>') + '</div>';
                }
                h += '</div>';
            });
            h += '</div>';
        });
        D.innerHTML = h + '</section>';
        $('gqDetX').onclick = function () { S.sel = null; D.innerHTML = ''; };
        D.querySelectorAll('.gq-grade-row').forEach(function (row) {
            row.querySelector('button').onclick = function () {
                var n = row.getAttribute('data-n'), q = row.getAttribute('data-q'), ins = row.querySelectorAll('input'), pts = Number(ins[0].value), max = Number(r.questions[q].points);
                /* el máximo puede tener decimales (5 ÷ 3 = 1,6667): 1,67 escrito por el docente cuenta como el máximo */
                if (pts > max && pts - max < 0.01) pts = max;
                if (ins[0].value === '' || !(pts >= 0) || pts > max) { toast('El puntaje debe estar entre 0 y ' + String(Math.round(max * 100) / 100).replace('.', ',') + '.', true); return; }
                var g = (r.grades[s] || {})[n];
                /* si la parte automática (selección múltiple y F/V) aún no está, se califica primero */
                var listo = (g && g.auto) ? Promise.resolve(g) : Q().gradeLocal(S.res).then(function () { return Q().results(S.res); }).then(function (rr) { S.R = rr; return (rr.grades[s] || {})[n]; });
                listo.then(function (g2) {
                    if (!g2 || !g2.auto) throw new Error('No se pudo calificar la parte automática de este intento.');
                    return Q().saveManual(S.res, s, n, q, pts, ins[1].value, r.meta, r.questions, atts[n], g2);
                }).then(function (sm) {
                    toast(sm.final ? 'Calificación final: ' + sm.nota : 'Guardado. Faltan ' + sm.openPending + ' por calificar.');
                    return Q().results(S.res).then(function (rr) { S.R = rr; pintarResultados(); });
                }).catch(function (e) { toast(e.message, true); });
            };
        });
        D.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    function mark(au) { return au ? (au.correct ? '<span class="gq-ok">✓ +' + pts(au.points) + '</span>' : '<span class="gq-bad">✗ 0</span>') : '<span class="gq-hint">sin calificar</span>'; }

    /* ======================= Configuración ======================= */
    function renderConfig() {
        var B = body(), s = S.settings || {};
        B.innerHTML = '<div class="gq-bar"><div><small class="gq-k">PREFERENCIAS</small><h2>Configuración</h2></div></div>' +
            '<section class="gq-panel"><h4>Valores por defecto de tus quices nuevos</h4><div class="gq-form">' +
            fld('Duración (minutos, 0 = sin límite)', '<input type="number" id="gqcDur" min="0" max="600" value="' + esc(s.durationMin != null ? s.durationMin : 30) + '">') +
            fld('Intentos máximos', '<input type="number" id="gqcAt" min="1" max="9" value="' + esc(s.maxAttempts || 1) + '">') +
            fld('Puntaje de cada quiz', '<input value="5,0 (se reparte por igual entre las preguntas)" disabled>') +
            '</div><div class="gq-checks">' + chk('gqcOne', 'Mostrar una pregunta a la vez', s.oneAtATime) + chk('gqcShuf', 'Orden aleatorio de las opciones', s.shuffleOptions) + chk('gqcShow', 'El estudiante ve su nota cuando esté calificada', s.showScore !== false) + chk('gqcFb', 'Retroalimentación después del cierre', s.feedbackAfterClose) +
            '</div><div class="gq-actions"><span id="gqcMsg" class="gq-msg"></span><button type="button" class="gq-btn primary" id="gqcSave">Guardar preferencias</button></div></section>' +
            '<section class="gq-panel"><h4>Estado del sistema</h4><ul class="gq-status"><li id="gqsDoc">Cuenta docente: comprobando…</li><li id="gqsGr">Calificador automático: comprobando…</li><li>Conexión con la base de datos: ' + (Q().isConnected() ? '✓ en línea' : '⚠ sin conexión') + '</li></ul>' +
            '<p class="gq-hint">Seguridad: las respuestas correctas se guardan aparte y los estudiantes solo pueden leerlas después del cierre si activas la retroalimentación. Las reglas de Firebase impiden editar preguntas cuando ya hay intentos, modificar respuestas después de entregar y responder fuera del tiempo.</p></section>';
        $('gqcSave').onclick = function () {
            var n = { durationMin: Math.max(0, Math.min(600, parseInt($('gqcDur').value, 10) || 0)), maxAttempts: Math.max(1, Math.min(9, parseInt($('gqcAt').value, 10) || 1)), scale: 5, oneAtATime: $('gqcOne').checked, shuffleOptions: $('gqcShuf').checked, showScore: $('gqcShow').checked, feedbackAfterClose: $('gqcFb').checked };
            Q().saveSettings(n).then(function () { S.settings = n; $('gqcMsg').textContent = '✓ Preferencias guardadas.'; }).catch(function (e) { $('gqcMsg').textContent = e.message; });
        };
        GeoSecure.soyDocenteConfirmado().then(function (ok) { var el = $('gqsDoc'); if (el) el.textContent = 'Cuenta docente: ' + (ok ? '✓ confirmada para quices' : '⚠ pendiente de confirmación por un administrador'); });
        Q().graderStatus().then(function (st) { var el = $('gqsGr'); if (el) el.textContent = 'Calificador automático: ' + (st.ok && st.configured ? '✓ activo' : st.ok ? '⚠ el Worker responde pero falta configurar la cuenta de servicio' : '⚠ Worker no disponible: las objetivas se califican desde tu panel mientras lo tengas abierto'); });
    }

    /* ======================= Recursos (igual que el aula del estudiante) ======================= */
    function renderRecursos() {
        var R = $('gqDocRecursos'); if (!R) return;
        var u = sesion() || {}, mats = [];
        try { mats = (global.aulaMateriasUsuario(u) || []).map(function (m) { return m.nombre; }); } catch (e) {}
        var pres = [];
        try { pres = (global.aulaLoad(global.AULA_KEYS.presentaciones, []) || []).filter(function (p) { return p && (!mats.length || mats.indexOf(p.materia) >= 0); }); } catch (e) {}
        R.innerHTML = '<div class="gq-grid gq-res-tiles">' +
            '<button type="button" class="gq-tile" data-r="biblioteca"><b>Biblioteca digital</b><span>Guías y PDFs del programa</span></button>' +
            '<button type="button" class="gq-tile" data-r="guias"><b>Guías de estudio</b><span>Material de apoyo por tema</span></button>' +
            '<button type="button" class="gq-tile" data-r="enlaces"><b>Enlaces útiles</b><span>Portal del programa Ingeniería Civil</span></button></div>' +
            '<h4 class="gq-sub">Material publicado para tus cursos</h4><div class="gq-list" id="gqResMat">' +
            (pres.length ? pres.slice().reverse().map(function (p) {
                return '<div class="gq-item"><div><b>' + esc(p.titulo) + '</b><span>' + esc(p.materia) + ' · Grupo ' + esc(p.grupo || 'Todos') + '</span></div>' + (p.data ? '<a class="gq-btn small" download="' + esc(p.fileName || 'material') + '" href="' + esc(p.data) + '">Descargar</a>' : '') + '</div>';
            }).join('') : '<div class="gq-empty">No hay materiales publicados todavía. Publícalos desde «Material».</div>') + '</div>';
        R.querySelectorAll('[data-r]').forEach(function (b) {
            b.onclick = function () {
                var a = b.getAttribute('data-r');
                if (a === 'biblioteca') global.open('docs/Guia_detallada_ensayos_GeoMetrics.pdf', '_blank', 'noopener');
                else if (a === 'enlaces') global.open('https://www.unipamplona.edu.co/unipamplona/portalIG/home_129/publicacion/publicado/', '_blank', 'noopener');
                else { var l = $('gqResMat'); if (l) l.scrollIntoView({ behavior: 'smooth' }); }
            };
        });
    }

    /* ======================= enganche con el panel docente ======================= */
    doc.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('#pantallaDocente [data-dp-view]');
        if (!b) return;
        var v = b.getAttribute('data-dp-view');
        setTimeout(function () {
            if (v === 'quices') {
                if (!S.settings && global.GeoAuth && GeoAuth.verified()) Q().settings().then(function (s) { S.settings = s; }).catch(function () {});
                render();
            }
            if (v === 'recursos') renderRecursos();
        }, 0);
    });
    global.GeoQuizDocente = { render: render, renderRecursos: renderRecursos, go: go };
})(window);
