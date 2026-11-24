/* GeoMetrics — Dashboard docente (distribución tipo "tablero académico", con la identidad visual de GeoMetrics).
 *
 * Construye sobre el panel existente (#pantallaDocente, data-dp-view / data-dp-panel) sin borrar nada:
 *   - Barra lateral: orden y nombres nuevos, «Mi perfil», tarjeta institucional y «Cerrar sesión».
 *   - Dashboard: pestañas, 4 indicadores, actividad académica (gráfica), próximos eventos, «Tu perfil docente»,
 *     «Tus asignaturas», «Herramientas destacadas» y «Estudiantes que requieren acompañamiento».
 * Todas las cifras salen de los datos reales (tareas, entregas, usuarios y quices en Firebase).
 * Nada se inventa: si no hay datos, se dice que no hay datos.
 */
(function (global) {
    var doc = global.document;
    function $(id) { return doc.getElementById(id); }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var low = function (s) { return String(s || '').trim().toLowerCase(); };
    var SV = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
    var IC = {
        dash: SV('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'),
        user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
        book: SV('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
        task: SV('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="m8 12 3 3 5-6"/>'),
        inbox: SV('<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'),
        users: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.2 2.4 3.5 5.5"/>'),
        msg: SV('<path d="M4 5h16v11H9l-5 4z"/>'),
        file: SV('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>'),
        quiz: SV('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 3v2h6V3M9 11h6M9 15h4"/>'),
        lib: SV('<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16 5 3.8-1 2.2 15.6-3.8 1z"/>'),
        chart: SV('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
        cal: SV('<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
        star: SV('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
        alert: SV('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
        arrow: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'),
        plus: SV('<path d="M12 5v14M5 12h14"/>'),
        up: SV('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>'),
        grade: SV('<path d="M12 3 2 8l10 5 10-5z"/><path d="M6 10v5c3 2 9 2 12 0v-5"/>'),
        gear: SV('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z"/>'),
        layers: SV('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>'),
        beam: SV('<path d="M3 7h18M3 17h18M7 7v10M17 7v10M7 7l10 10M17 7 7 17"/>'),
        flask: SV('<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/>'),
        build: SV('<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 11h.01M15 11h.01"/>')
    };

    /* ------------------------------------------------------------------ datos reales */
    function sesion() {
        try {
            var u = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
            if (u && typeof aulaRegistroUsuario === 'function') u = aulaRegistroUsuario(u) || u;
            return u;
        } catch (e) { return null; }
    }
    function load(k) { try { return (typeof aulaLoad === 'function' && global.AULA_KEYS) ? (aulaLoad(AULA_KEYS[k], []) || []) : []; } catch (e) { return []; } }
    /* Materias registradas por el docente (sin listas por defecto: si no registró, no hay) */
    function materiasDocente(u) {
        var out = [], seen = {};
        var add = function (n, g) { n = String(n || '').trim(); if (!n) return; var k = low(n) + '|' + low(g); if (seen[k]) return; seen[k] = 1; out.push({ nombre: n, grupo: String(g || '').trim() }); };
        (Array.isArray(u.materias) ? u.materias : []).forEach(function (m) { if (typeof m === 'string') add(m, ''); else if (m) add(m.nombre || m.materia, m.grupo); });
        if (!out.length && u.materia) add(u.materia, u.grupo);
        return out;
    }
    function datos() {
        var u = sesion(); if (!u) return null;
        var tareas = load('tareas').filter(function (t) { return t && t.docenteId === u.id; });
        var ids = {}; tareas.forEach(function (t) { ids[t.id] = t; });
        var entregas = load('entregas').filter(function (e) { return e && ids[e.tareaId]; });
        var users = load('users');
        var est = [];
        try { if (typeof aulaEstudiantesDeDocente === 'function') est = aulaEstudiantesDeDocente(u) || []; } catch (e) { est = []; }
        return { u: u, tareas: tareas, ids: ids, entregas: entregas, users: users, est: est, mats: materiasDocente(u) };
    }
    function nota(e) { var n = parseFloat(String(e.nota).replace(',', '.')); return (e.nota == null || e.nota === '' || isNaN(n)) ? null : n; }
    function fechaTs(v) { if (!v) return 0; var d = typeof v === 'number' ? new Date(v) : new Date(String(v).length === 10 ? v + 'T23:59:00' : v); return isNaN(d.getTime()) ? 0 : d.getTime(); }
    var quices = { lista: null, cargando: false, at: 0 };
    function cargarQuices(cb) {
        if (!global.GeoQuiz || !GeoQuiz.listMine) return;
        if (quices.cargando || (quices.lista && Date.now() - quices.at < 60000)) return;
        quices.cargando = true;
        GeoQuiz.listMine().then(function (l) { quices.lista = (l || []).filter(Boolean); }).catch(function () { quices.lista = quices.lista || []; })
            .then(function () { quices.cargando = false; quices.at = Date.now(); if (cb) cb(); });
    }

    /* ------------------------------------------------------------------ barra lateral */
    var ORDEN = [
        ['dashboard', 'Dashboard', IC.dash], ['perfil', 'Mi perfil', IC.user], ['cursos', 'Mis asignaturas', IC.book],
        ['tareas', 'Tareas', IC.task], ['entregas', 'Entregas', IC.inbox], ['estudiantes', 'Estudiantes', IC.users],
        ['foros', 'Mensajes', IC.msg], ['material', 'Materiales', IC.file], ['quices', 'Quices y evaluaciones', IC.quiz],
        ['recursos', 'Recursos', IC.lib], ['analisis', 'Análisis y reportes', IC.chart]
    ];
    function barra() {
        var side = doc.querySelector('#pantallaDocente .dp-side'); if (!side) return;
        if (!side.querySelector('.gdd-side-title')) side.insertBefore(el('div', 'gdd-side-title', 'PANEL DOCENTE'), side.firstChild);
        var foot = side.querySelector('.dp-side-foot');
        var prev = side.querySelector('.gdd-side-title');
        ORDEN.forEach(function (o) {
            var b = o[0] === 'perfil' ? side.querySelector('#gddPerfil') : side.querySelector(':scope > [data-dp-view="' + o[0] + '"]');
            if (!b && o[0] === 'perfil') {
                b = el('button', 'gdd-perfil-btn'); b.type = 'button'; b.id = 'gddPerfil';
                b.addEventListener('click', function () { try { aulaAbrirPerfil(); } catch (e) {} });
            }
            if (!b) return;
            var lab = b.querySelector('.label');
            if (!lab) { b.innerHTML = '<span class="dp-ico gt-lico">' + o[2] + '</span><span class="label"></span>'; lab = b.querySelector('.label'); }
            if (lab.textContent !== o[1]) lab.textContent = o[1];
            b.title = o[1];
            if (prev.nextElementSibling !== b) side.insertBefore(b, prev.nextSibling);
            prev = b;
        });
        /* el antiguo botón «Perfil» del pie queda reemplazado por «Mi perfil» */
        var viejo = $('dpBtnPerfil'); if (viejo) viejo.style.display = 'none';
        if (foot && !foot.querySelector('.gdd-inst')) {
            foot.insertBefore(el('div', 'gdd-inst', '<span>' + IC.build + '</span><p>Construyendo conocimiento,<br>construimos futuro.</p><small>Universidad de Pamplona</small>'), foot.firstChild);
        }
    }

    /* ------------------------------------------------------------------ dashboard */
    function panel() { return doc.querySelector('#pantallaDocente [data-dp-panel="dashboard"]'); }
    function asegurarEstructura() {
        var P = panel(); if (!P) return null;
        P.classList.add('gdd-on');
        var root = $('gddRoot');
        if (!root) {
            root = el('div', 'gdd');
            root.id = 'gddRoot';
            root.innerHTML =
                '<nav class="gdd-tabs" aria-label="Secciones del docente">' +
                    '<button type="button" class="on" data-gdd-tab="resumen">' + IC.dash + 'Resumen</button>' +
                    '<button type="button" data-gdd-tab="perfil">' + IC.user + 'Mi perfil</button>' +
                    '<button type="button" data-gdd-tab="academico">' + IC.grade + 'Actividad académica</button>' +
                    '<button type="button" data-dp-view="cursos">' + IC.book + 'Asignaturas</button>' +
                    '<button type="button" data-dp-view="foros">' + IC.msg + 'Mensajes</button>' +
                    '<button type="button" data-gdd-tab="prefs">' + IC.gear + 'Configuración</button>' +
                '</nav>' +
                '<div class="gdd-kpis" id="gddKpis"></div>' +
                '<div class="gdd-row gdd-row-a">' +
                    '<section class="gdd-card gdd-act"><header>' + IC.chart + '<h3>Mi actividad académica</h3><span class="gdd-sub">Últimos 7 días</span></header>' +
                        '<div class="gdd-legend"><span><i style="--c:#22d3ee"></i>Tareas publicadas</span><span><i style="--c:#2dd4bf"></i>Entregas recibidas</span><span><i style="--c:#a78bfa"></i>Quices publicados</span></div>' +
                        '<div class="gdd-chart"><canvas id="gddChart" aria-label="Actividad académica de los últimos 7 días"></canvas><div class="gdd-tip" hidden></div><p class="gdd-chart-empty" hidden>Sin actividad en los últimos 7 días.</p></div></section>' +
                    '<section class="gdd-card gdd-ev"><header>' + IC.cal + '<h3>Próximos eventos</h3><button type="button" class="gdd-link" data-dp-view="tareas">Ver tareas ' + IC.arrow + '</button></header><div id="gddEventos"></div></section>' +
                    '<section class="gdd-card gdd-perf"><header>' + IC.star + '<h3>Tu perfil docente</h3></header><div id="gddPerfilBox"></div></section>' +
                '</div>' +
                '<div class="gdd-row gdd-row-b">' +
                    '<section class="gdd-card gdd-mats"><header>' + IC.book + '<h3>Tus asignaturas</h3><button type="button" class="gdd-link" data-dp-view="cursos">Ver todas ' + IC.arrow + '</button></header><div id="gddMats"></div></section>' +
                    '<section class="gdd-card gdd-tools"><header>' + IC.star + '<h3>Herramientas destacadas</h3></header><div class="gdd-tool-grid">' +
                        tool('tareas', IC.plus, 'Crear tarea') + tool('quices', IC.quiz, 'Crear quiz') + tool('entregas', IC.grade, 'Calificar entregas') +
                        tool('material', IC.up, 'Publicar material') + tool('foros', IC.msg, 'Mensajes') + tool('analisis', IC.chart, 'Informes y análisis') +
                    '</div></section>' +
                    '<section class="gdd-card gdd-acomp"><header>' + IC.alert + '<h3>Estudiantes que requieren acompañamiento</h3></header><div id="gddAcomp"></div>' +
                        '<p class="gdd-nota">Indicadores de apoyo calculados con tus tareas y entregas. No son diagnósticos ni etiquetas permanentes.</p></section>' +
                '</div>';
            var hero = $('gdpHero');
            P.insertBefore(root, hero ? hero.nextSibling : P.firstChild);
            root.addEventListener('click', clicDash);
            var cv = root.querySelector('#gddChart');
            cv.addEventListener('mousemove', tipChart); cv.addEventListener('mouseleave', function () { var t = root.querySelector('.gdd-tip'); if (t) t.hidden = true; });
        } else if ($('gdpHero') && root.previousElementSibling !== $('gdpHero')) {
            P.insertBefore(root, $('gdpHero').nextSibling);
        }
        return root;
    }
    function tool(v, ico, t) { return '<button type="button" class="gdd-tool" data-dp-view="' + v + '"><span>' + ico + '</span><b>' + esc(t) + '</b></button>'; }
    function clicDash(e) {
        var t = e.target.closest('[data-gdd-tab]');
        if (t) {
            var k = t.getAttribute('data-gdd-tab');
            if (k === 'resumen') return;
            try { aulaAbrirPerfil(); if (k !== 'perfil' && typeof aulaPerfilSetTab === 'function') aulaPerfilSetTab(k); } catch (ex) {}
            return;
        }
        var m = e.target.closest('[data-gdd-chat]');
        if (m && global.GMChatCon) { GMChatCon(m.getAttribute('data-gdd-chat'), 'docente'); return; }
        var p = e.target.closest('[data-gdd-perfil]');
        if (p) { try { aulaAbrirPerfil(); } catch (ex) {} }
    }

    function kpis(D) {
        var pend = D.entregas.filter(function (e) { return nota(e) === null; }).length;
        var notas = D.entregas.map(nota).filter(function (n) { return n !== null; });
        var prom = notas.length ? notas.reduce(function (a, b) { return a + b; }, 0) / notas.length : null;
        var activos = quices.lista ? quices.lista.filter(function (q) { var m = q.meta || {}, t = Date.now(); return m.status !== 'closed' && m.status !== 'draft' && (!m.closeAt || t < m.closeAt) && (!m.publishAt || t >= m.publishAt); }).length : null;
        var k = function (c, ico, l1, l2, n, sub) {
            return '<div class="gdd-kpi" style="--c:' + c + '"><span class="gdd-kpi-ico">' + ico + '</span><div><span class="gdd-kpi-l">' + l1 + '<br>' + l2 + '</span><b>' + n + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</div></div>';
        };
        return k('#22d3ee', IC.users, 'Estudiantes', 'en tus cursos', D.est.length, D.mats.length + ' asignatura' + (D.mats.length === 1 ? '' : 's')) +
            k('#f59e0b', IC.inbox, 'Entregas pendientes', 'por calificar', pend, D.entregas.length + ' entregas recibidas') +
            k('#a78bfa', IC.quiz, 'Quices', 'activos', activos === null ? '…' : activos, quices.lista ? quices.lista.length + (quices.lista.length === 1 ? ' creado' : ' creados') : 'Cargando…') +
            k('#2dd4bf', IC.grade, 'Rendimiento', 'promedio', prom === null ? '—' : prom.toFixed(1).replace('.', ','), prom === null ? 'Sin notas registradas' : 'Sobre 5,0 · ' + notas.length + ' nota' + (notas.length === 1 ? '' : 's'));
    }

    /* --- gráfica: 7 días, curvas suaves monótonas (no inventan picos entre puntos) --- */
    var serie = null;
    function semana(D) {
        var dias = [], hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        for (var i = 6; i >= 0; i--) { var d = new Date(hoy); d.setDate(d.getDate() - i); dias.push(d); }
        var idx = function (ts) { if (!ts) return -1; var d = new Date(ts); d.setHours(0, 0, 0, 0); var n = Math.round((d - dias[0]) / 86400000); return n >= 0 && n < 7 ? n : -1; };
        var t = [0, 0, 0, 0, 0, 0, 0], e = t.slice(), q = t.slice();
        D.tareas.forEach(function (x) { var i = idx(fechaTs(x.creada || x.fecha)); if (i >= 0) t[i]++; });
        D.entregas.forEach(function (x) { var i = idx(fechaTs(x.fecha)); if (i >= 0) e[i]++; });
        (quices.lista || []).forEach(function (x) { var i = idx(x.meta && (x.meta.publishAt || x.meta.createdAt)); if (i >= 0) q[i]++; });
        var lab = dias.map(function (d) { return d.toLocaleDateString('es-CO', { weekday: 'short' }).replace('.', ''); });
        return { lab: lab, dias: dias, s: [{ n: 'Tareas publicadas', c: '#22d3ee', v: t }, { n: 'Entregas recibidas', c: '#2dd4bf', v: e }, { n: 'Quices publicados', c: '#a78bfa', v: q }] };
    }
    function pendientes(y) { /* Fritsch–Carlson */
        var n = y.length, d = [], m = [];
        for (var i = 0; i < n - 1; i++) d.push(y[i + 1] - y[i]);
        m[0] = d[0]; m[n - 1] = d[n - 2];
        for (i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
        for (i = 0; i < n - 1; i++) {
            if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
            var a = m[i] / d[i], b = m[i + 1] / d[i], h = a * a + b * b;
            if (h > 9) { var tt = 3 / Math.sqrt(h); m[i] = tt * a * d[i]; m[i + 1] = tt * b * d[i]; }
        }
        return m;
    }
    function dibujar() {
        var cv = $('gddChart'); if (!cv || !serie) return;
        var wrap = cv.parentNode, W = Math.max(280, wrap.clientWidth), H = Math.max(200, Math.min(260, Math.round(W * 0.42)));
        var r = global.devicePixelRatio || 1;
        cv.width = Math.round(W * r); cv.height = Math.round(H * r); cv.style.width = W + 'px'; cv.style.height = H + 'px';
        var g = cv.getContext('2d'); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, W, H);
        var max = 0; serie.s.forEach(function (s) { s.v.forEach(function (v) { if (v > max) max = v; }); });
        var vacio = max === 0, top = vacio ? 4 : Math.max(4, Math.ceil(max * 1.25));
        var paso = top <= 5 ? 1 : top <= 10 ? 2 : Math.ceil(top / 5);
        top = Math.ceil(top / paso) * paso;
        var L = 34, R = 14, T = 12, B = 30, cw = W - L - R, ch = H - T - B;
        var X = function (i) { return L + cw * i / 6; }, Y = function (v) { return T + ch - ch * v / top; };
        g.font = '500 11px "JetBrains Mono", ui-monospace, monospace'; g.textBaseline = 'middle';
        for (var v = 0; v <= top; v += paso) {
            g.strokeStyle = v === 0 ? 'rgba(148,163,184,.35)' : 'rgba(148,163,184,.12)'; g.lineWidth = 1;
            g.beginPath(); g.moveTo(L, Math.round(Y(v)) + .5); g.lineTo(W - R, Math.round(Y(v)) + .5); g.stroke();
            g.fillStyle = '#8b9ab0'; g.textAlign = 'right'; g.fillText(String(v), L - 8, Y(v));
        }
        g.textAlign = 'center'; g.textBaseline = 'alphabetic';
        serie.lab.forEach(function (l, i) { g.fillStyle = '#8b9ab0'; g.fillText(l.charAt(0).toUpperCase() + l.slice(1), X(i), H - 9); });
        var p = cv.parentNode.querySelector('.gdd-chart-empty'); if (p) p.hidden = !vacio;
        if (vacio) return;
        serie.s.forEach(function (s, k) {
            var y = s.v, m = pendientes(y);
            var traza = function () {
                g.moveTo(X(0), Y(y[0]));
                for (var i = 0; i < 6; i++) {
                    var dx = (X(i + 1) - X(i)) / 3;
                    g.bezierCurveTo(X(i) + dx, Y(y[i] + m[i] / 3), X(i + 1) - dx, Y(y[i + 1] - m[i + 1] / 3), X(i + 1), Y(y[i + 1]));
                }
            };
            if (k === 0 || k === 1) {
                var gr = g.createLinearGradient(0, T, 0, T + ch); gr.addColorStop(0, s.c + '38'); gr.addColorStop(1, s.c + '00');
                g.beginPath(); traza(); g.lineTo(X(6), Y(0)); g.lineTo(X(0), Y(0)); g.closePath(); g.fillStyle = gr; g.fill();
            }
            g.beginPath(); traza(); g.strokeStyle = s.c; g.lineWidth = 2; g.stroke();
            y.forEach(function (v, i) { g.beginPath(); g.arc(X(i), Y(v), 4, 0, Math.PI * 2); g.fillStyle = '#0b1220'; g.fill(); g.lineWidth = 2; g.strokeStyle = s.c; g.stroke(); });
        });
        cv.__geo = { X: X, L: L, cw: cw };
    }
    function tipChart(ev) {
        var cv = ev.currentTarget, G = cv.__geo, tip = cv.parentNode.querySelector('.gdd-tip');
        if (!G || !serie || !tip) return;
        var r = cv.getBoundingClientRect(), x = (ev.clientX - r.left) * (cv.offsetWidth / r.width || 1);
        var i = Math.max(0, Math.min(6, Math.round((x - G.L) / (G.cw / 6))));
        tip.innerHTML = '<b>' + esc(serie.dias[i].toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'short' })) + '</b>' +
            serie.s.map(function (s) { return '<span><i style="--c:' + s.c + '"></i>' + esc(s.n) + ': ' + s.v[i] + '</span>'; }).join('');
        tip.hidden = false;
        tip.style.left = Math.min(cv.offsetWidth - tip.offsetWidth - 4, Math.max(4, G.X(i) + 12)) + 'px';
    }

    function eventos(D) {
        var hoy = new Date(); hoy.setHours(0, 0, 0, 0);
        var it = [];
        D.tareas.forEach(function (t) {
            var ts = fechaTs(t.fechaLimite); if (!ts || ts < hoy.getTime()) return;
            it.push({ ts: ts, t: 'Entrega: ' + (t.titulo || 'Tarea'), s: (t.materia || '') + (t.grupo ? ' · Grupo ' + t.grupo : '') + (t.horaLimite ? ' · ' + t.horaLimite : ''), c: '#22d3ee', v: 'tareas' });
        });
        (quices.lista || []).forEach(function (q) {
            var m = q.meta || {};
            if (m.status === 'draft') return;
            if (m.publishAt && m.publishAt >= Date.now()) it.push({ ts: m.publishAt, t: 'Quiz abre: ' + (m.title || 'Quiz'), s: (m.materia || '') + (m.grupo ? ' · Grupo ' + m.grupo : ''), c: '#a78bfa', v: 'quices' });
            else if (m.closeAt && m.closeAt >= Date.now()) it.push({ ts: m.closeAt, t: 'Quiz cierra: ' + (m.title || 'Quiz'), s: (m.materia || '') + (m.grupo ? ' · Grupo ' + m.grupo : ''), c: '#a78bfa', v: 'quices' });
        });
        it.sort(function (a, b) { return a.ts - b.ts; });
        if (!it.length) return '<p class="gdd-empty">No hay fechas próximas. Las fechas límite de tus tareas y quices aparecerán aquí.</p>';
        return '<ol class="gdd-tl">' + it.slice(0, 4).map(function (e) {
            var d = new Date(e.ts);
            var hora = (e.v === 'quices') ? ' · ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '';
            return '<li style="--c:' + e.c + '" data-dp-view="' + e.v + '" tabindex="0"><span class="gdd-date"><b>' + d.getDate() + '</b>' + esc(d.toLocaleDateString('es-CO', { month: 'short' }).replace('.', '')) + '</span>' +
                '<i></i><div><strong>' + esc(e.t) + '</strong><small>' + esc(e.s + hora) + '</small></div></li>';
        }).join('') + '</ol>';
    }

    function perfilBox(D) {
        var u = D.u, foto = typeof aulaFotoUsuario === 'function' ? aulaFotoUsuario(u) : u.foto;
        var ver = global.GMV && GMV.isVerified(u.email);
        var items = [
            ['Foto de perfil', !!foto], ['Título profesional', !!u.titulo], ['Programa académico', !!(u.programa || u.departamento)],
            ['Biografía', !!u.bio], ['Horario de atención', !!u.horarioAtencion], ['Asignaturas registradas', D.mats.length > 0],
            ['GeoMetrics Verified', !!ver]
        ];
        var ok = items.filter(function (x) { return x[1]; }).length, pct = Math.round(ok * 100 / items.length);
        var R = 42, C = 2 * Math.PI * R;
        return '<div class="gdd-ring-row"><svg class="gdd-ring" viewBox="0 0 100 100" aria-label="Perfil completo al ' + pct + '%"><circle cx="50" cy="50" r="' + R + '" class="bg"/>' +
            '<circle cx="50" cy="50" r="' + R + '" class="fg" stroke-dasharray="' + (C * pct / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/><text x="50" y="55">' + pct + '%</text></svg>' +
            '<div><b>Perfil profesional</b><small>' + ok + ' de ' + items.length + ' elementos completos</small></div></div>' +
            '<ul class="gdd-checks">' + items.map(function (x) { return '<li class="' + (x[1] ? 'ok' : '') + '">' + (x[1] ? '✓' : '·') + ' ' + esc(x[0]) + '</li>'; }).join('') + '</ul>' +
            '<button type="button" class="gdd-btn" data-gdd-perfil>' + (pct < 100 ? 'Completar perfil' : 'Ver mi perfil') + IC.arrow + '</button>';
    }

    function icoMateria(n) {
        n = low(n);
        if (/suelo|geot/.test(n)) return [IC.layers, '#f59e0b'];
        if (/resist|estruct/.test(n)) return [IC.beam, '#22d3ee'];
        if (/mezcl|concret|material/.test(n)) return [IC.flask, '#2dd4bf'];
        return [IC.book, '#a78bfa'];
    }
    function asignaturas(D) {
        if (!D.mats.length) return '<p class="gdd-empty">Aún no registras asignaturas. Agrégalas en tu perfil para ver aquí sus grupos y estudiantes.</p>';
        return '<div class="gdd-mat-grid">' + D.mats.map(function (m) {
            var n = D.est.filter(function (e) {
                try { return (aulaMateriasDeDocente(e, D.u) || []).some(function (x) { return low(x.nombre) === low(m.nombre) && (!m.grupo || !x.grupo || low(x.grupo) === low(m.grupo)); }); } catch (ex) { return false; }
            }).length;
            var nt = D.tareas.filter(function (t) { return low(t.materia) === low(m.nombre); }).length;
            var ic = icoMateria(m.nombre);
            return '<button type="button" class="gdd-mat" data-dp-view="cursos" style="--c:' + ic[1] + '"><span class="gdd-mat-ico">' + ic[0] + '</span>' +
                '<span class="gdd-mat-t"><b>' + esc(m.nombre) + '</b><small>' + (m.grupo ? 'Grupo ' + esc(m.grupo) + ' · ' : '') + n + ' estudiante' + (n === 1 ? '' : 's') + ' · ' + nt + ' tarea' + (nt === 1 ? '' : 's') + '</small></span>' +
                '<span class="gdd-mat-go">' + IC.arrow + '</span></button>';
        }).join('') + '</div>';
    }

    /* Acompañamiento: notas bajas en tus tareas o tareas vencidas sin entrega (de su materia y grupo). */
    function acompanamiento(D) {
        var hoy = Date.now(), filas = [];
        D.est.forEach(function (s) {
            var mias = D.entregas.filter(function (e) { return e.estudianteId === s.id || (e.estudianteEmail && low(e.estudianteEmail) === low(s.email)); });
            var ns = mias.map(nota).filter(function (n) { return n !== null; });
            var prom = ns.length ? ns.reduce(function (a, b) { return a + b; }, 0) / ns.length : null;
            var matsS = []; try { matsS = aulaMateriasDeDocente(s, D.u) || []; } catch (e) {}
            var vencidas = D.tareas.filter(function (t) {
                var ts = fechaTs(t.fechaLimite); if (!ts || ts >= hoy) return false;
                var aplica = matsS.some(function (x) { return low(x.nombre) === low(t.materia) && (!t.grupo || !x.grupo || low(t.grupo) === low(x.grupo)); });
                return aplica && !mias.some(function (e) { return e.tareaId === t.id; });
            }).length;
            var motivos = [];
            if (prom !== null && prom < 3) motivos.push(['bajo', 'Rendimiento bajo', 'Promedio ' + prom.toFixed(1).replace('.', ',') + ' en ' + ns.length + ' nota' + (ns.length === 1 ? '' : 's')]);
            if (vencidas > 0) motivos.push(['entregas', vencidas === 1 ? '1 entrega sin presentar' : vencidas + ' entregas sin presentar', 'Tareas vencidas sin entrega']);
            if (motivos.length) filas.push({ s: s, m: motivos, peso: motivos.length * 10 + vencidas + (prom !== null ? (3 - prom) : 0) });
        });
        filas.sort(function (a, b) { return b.peso - a.peso; });
        if (!filas.length) return '<p class="gdd-empty">' + (D.est.length ? 'Ningún estudiante muestra señales de alerta por ahora.' : 'Cuando tengas estudiantes inscritos, aquí verás quién podría necesitar apoyo.') + '</p>';
        return '<ul class="gdd-acomp-list">' + filas.slice(0, 5).map(function (f) {
            var nombre = typeof aulaNombreRegistro === 'function' ? aulaNombreRegistro(f.s) : (f.s.nombre || f.s.email);
            var foto = typeof aulaFotoUsuario === 'function' ? aulaFotoUsuario(f.s) : '';
            var p = nombre.split(/\s+/);
            return '<li><span class="gdd-av">' + (foto ? '<img src="' + esc(foto) + '" alt="">' : esc(((p[0] || '?')[0] + ((p[1] || '')[0] || '')).toUpperCase())) + '</span>' +
                '<div><b>' + esc(nombre) + (global.GMV ? GMV.slot(f.s.email, 'xs') : '') + '</b>' + f.m.map(function (m) { return '<span class="gdd-tag ' + m[0] + '" title="' + esc(m[2]) + '">' + esc(m[1]) + '</span>'; }).join('') +
                '<small>' + esc(f.m.map(function (m) { return m[2]; }).join(' · ')) + '</small></div>' +
                '<button type="button" class="gdd-mini" data-gdd-chat="' + esc(f.s.email) + '" title="Escribir a ' + esc(nombre) + '">' + IC.msg + '</button></li>';
        }).join('') + '</ul>';
    }

    function poner(id, h) { var b = $(id); if (b && b.__h !== h) { b.__h = h; b.innerHTML = h; } }
    var pend = false;
    function pintar() {
        var M = $('pantallaDocente');
        if (!M || M.style.display === 'none') return;
        barra();
        var D = datos(); if (!D || D.u.rol !== 'docente') return;
        if (!asegurarEstructura()) return;
        poner('gddKpis', kpis(D));
        poner('gddEventos', eventos(D));
        poner('gddPerfilBox', perfilBox(D));
        poner('gddMats', asignaturas(D));
        poner('gddAcomp', acompanamiento(D));
        var s = semana(D), firma = JSON.stringify(s.s.map(function (x) { return x.v; })) + s.lab.join();
        var cv = $('gddChart');
        if (cv && (firma !== (cv.__firma || '') || cv.__w !== cv.parentNode.clientWidth)) { cv.__firma = firma; cv.__w = cv.parentNode.clientWidth; serie = s; dibujar(); }
        cargarQuices(programar);
    }
    function programar() { if (pend) return; pend = true; setTimeout(function () { pend = false; pintar(); }, 120); }

    function iniciar() {
        var M = $('pantallaDocente'); if (!M) return;
        if (global.MutationObserver) new MutationObserver(function () { if (M.style.display !== 'none') programar(); })
            .observe(M, { attributes: true, attributeFilter: ['style', 'class'] });
        ['geometrics-perfil-actualizado', 'geometrics-users-updated', 'gm-verified-changed', 'resize'].forEach(function (n) { global.addEventListener(n, programar); });
        doc.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('#pantallaDocente [data-dp-view="dashboard"]')) programar(); });
        global.addEventListener('storage', programar);
        setInterval(function () { if (M.style.display !== 'none' && panel() && panel().classList.contains('active')) programar(); }, 15000);
        programar();
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar); else iniciar();
    global.GeoDocenteDash = { pintar: pintar };
})(window);
