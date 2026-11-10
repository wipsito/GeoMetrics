/**
 * GeoMetrics — Panel del estudiante: «Inicio» y «Notas» con más información y mejor lectura.
 * aula-virtual.js le pasa los datos ya filtrados; los quices se agregan después (vienen de Firebase).
 *
 * Inicio: indicadores, agenda de la semana (tareas y quices por urgencia) y solo las materias del estudiante.
 * Notas:  tareas y quices juntos, promedio general y por materia, evolución en el tiempo y retroalimentación.
 */
(function (global) {
    'use strict';
    var doc = global.document;
    var DAY = 864e5;
    var SV = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
    var IC = {
        task: SV('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="m8 12 3 3 5-6"/>'),
        clock: SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
        quiz: SV('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 3v2h6V3"/><path d="m8.5 12 2 2 4-4"/><path d="M9 18h6"/>'),
        avg: SV('<path d="M4 4v16h16"/><path d="m7 15 4-5 3 3 5-6"/>'),
        book: SV('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
        layers: SV('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>'),
        home: SV('<path d="M4 20h16"/><path d="M6 20v-6h12v6"/><path d="M10 14V6h4v8"/><path d="M12 3v3"/>'),
        beam: SV('<path d="M4 6h16M4 18h16M12 6v12"/>'),
        flask: SV('<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/>'),
        grid: SV('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
        folder: SV('<path d="M3 6h6l2 2h10v11H3z"/>'),
        chart: SV('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
        arrow: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'),
        msg: SV('<path d="M4 5h16v11H9l-5 4z"/>'),
        check: SV('<path d="m5 12 4 4 10-10"/>'),
        warn: SV('<path d="M12 3 2 21h20z"/><path d="M12 10v5M12 18h.01"/>')
    };
    /* Materias: el nombre identifica; el color solo acompaña (los tonos de Suelos I y II son casi iguales). */
    var MATS = [
        [/suelos ii/, '#38bdf8', 'home', 'suelos2', 'Cimentaciones y estabilidad'],
        [/suelos/, '#22d3ee', 'layers', 'suelos', 'Teoría, ensayos y simuladores'],
        [/resistencia/, '#f59e0b', 'beam', 'resistencia', 'Esfuerzos y deformaciones'],
        [/mezcla/, '#a78bfa', 'flask', 'mezclas', 'Concreto y dosificaciones'],
        [/estructura/, '#f472b6', 'grid', 'estructuras', 'Análisis estructural y métodos aproximados']
    ];
    function norm(s) { s = String(s || '').toLowerCase(); return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s; }
    function mat(n) { n = norm(n); return MATS.filter(function (m) { return m[0].test(n); })[0] || [null, '#94a3b8', 'book', null, '']; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function $(id) { return doc.getElementById(id); }
    function fmtDate(ts, opts) { try { return new Date(ts).toLocaleDateString('es-CO', opts || { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
    function nota1(n) { return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }
    function to5(nota, scale) { var s = Number(scale) || 5; return s === 5 ? Number(nota) : Number(nota) / s * 5; }

    /** Estado de una nota (escala 0–5). Siempre con texto: el color nunca va solo. */
    function estadoNota(n) {
        if (n >= 3) return { cls: 'good', label: 'Aprobada' };
        return { cls: 'bad', label: 'Reprobada' };
    }
    function estadoPromedio(n) {
        if (n >= 3.5) return { cls: 'good', label: 'Vas bien' };
        if (n >= 3) return { cls: 'warn', label: 'En riesgo' };
        return { cls: 'bad', label: 'Por debajo de 3,0' };
    }
    function limiteTarea(t) {
        try { if (typeof global.aulaParseLimite === 'function') { var d = global.aulaParseLimite(t); if (d) return d.getTime(); } } catch (e) {}
        if (!t.fechaLimite) return null;
        var d2 = new Date(t.fechaLimite + 'T' + (t.horaLimite || '23:59'));
        return isNaN(d2) ? null : d2.getTime();
    }
    function urgencia(ts, now) {
        var a = new Date(now); a.setHours(0, 0, 0, 0);
        var b = new Date(ts); b.setHours(0, 0, 0, 0);
        var d = Math.round((b - a) / DAY);
        if (ts < now) return { cls: 'bad', label: 'Vencida', d: d };
        if (d === 0) return { cls: 'bad', label: 'Hoy', d: d };
        if (d === 1) return { cls: 'warn', label: 'Mañana', d: d };
        if (d <= 3) return { cls: 'warn', label: 'En ' + d + ' días', d: d };
        return { cls: 'ok', label: 'En ' + d + ' días', d: d };
    }
    function quizzesDe(user) {
        if (!global.GeoQuiz || !global.GeoAuth || !GeoAuth.verified()) return Promise.resolve([]);
        return GeoQuiz.listForStudent(user).then(function (l) {
            l.forEach(function (it) { it.st = GeoQuiz.statusFor(it); });
            return l;
        }).catch(function () { return []; });
    }
    function kpi(c, icon, valor, label, sub) {
        return '<div class="gpe-kpi" style="--c:' + c + '"><span class="gpe-ico">' + IC[icon] + '</span><div><b>' + valor + '</b><span>' + esc(label) + '</span>' + (sub ? '<em>' + sub + '</em>' : '') + '</div></div>';
    }
    function ir(view) { try { global.GeoMetricsAulaVirtual.setView(view); if (view === 'quices' && global.GeoQuizEstudiante) GeoQuizEstudiante.render(); } catch (e) {} }

    /* ============================ INICIO ============================ */
    var homeSeq = 0;
    function home(ctx) {
        var u = ctx.user, stats = $('avHomeStats'), pend = $('avHomePendientes'), labs = $('avHomeLabs');
        if (!stats || !pend || !labs) return false;
        var now = Date.now(), mine = {};
        (ctx.entregas || []).forEach(function (e) { if (u && e.estudianteId === u.id) mine[e.tareaId] = e; });
        var tareas = ctx.tareas || [];
        var pendientes = tareas.filter(function (t) { return !mine[t.id]; });
        var vencidas = pendientes.filter(function (t) { var l = limiteTarea(t); return l && l < now; });
        var notas = Object.keys(mine).map(function (k) { return mine[k]; }).filter(function (e) { return e.nota != null && e.nota !== '' && !isNaN(Number(e.nota)); }).map(function (e) { return Number(e.nota); });
        var materias = (ctx.materias || []).map(function (m) { return m.nombre; });
        var seq = ++homeSeq;

        function pintar(quizzes) {
            if (seq !== homeSeq) return; // una respuesta vieja no pisa una más reciente
            var disponibles = quizzes.filter(function (q) { return q.st.code === 'available' || q.st.code === 'progress'; });
            var qNotas = quizzes.map(function (q) { var g = mejorNota(q); return g == null ? null : g; }).filter(function (n) { return n != null; });
            var todas = notas.concat(qNotas);
            var prom = todas.length ? todas.reduce(function (a, b) { return a + b; }, 0) / todas.length : null;
            var ep = prom != null ? estadoPromedio(prom) : null;
            stats.className = 'gpe-kpis';
            stats.innerHTML =
                kpi('#22d3ee', 'task', pendientes.length - vencidas.length, 'Tareas pendientes') +
                kpi('#fb7185', 'clock', vencidas.length, 'Vencidas') +
                kpi('#a78bfa', 'quiz', disponibles.length, 'Quices disponibles') +
                kpi(ep ? (ep.cls === 'good' ? '#22c55e' : ep.cls === 'warn' ? '#f59e0b' : '#f87171') : '#64748b', 'avg', prom != null ? nota1(prom) : '—', 'Promedio', ep ? '<i class="gpe-pill ' + ep.cls + '">' + ep.label + '</i>' : '<i class="gpe-pill">Sin notas aún</i>');

            /* Agenda: lo que vence pronto, de lo más urgente a lo menos */
            var items = pendientes.map(function (t) { return { tipo: 'tarea', titulo: t.titulo, materia: t.materia, ts: limiteTarea(t), go: 'tareas' }; })
                .concat(disponibles.map(function (q) { return { tipo: 'quiz', titulo: q.meta.title, materia: q.meta.materia, ts: q.meta.closeAt, go: 'quices', prog: q.st.code === 'progress' }; }))
                .filter(function (x) { return x.ts && x.ts <= now + 14 * DAY && x.ts >= now - 7 * DAY; })
                .sort(function (a, b) { return a.ts - b.ts; });
            var sinFecha = pendientes.filter(function (t) { return !limiteTarea(t); }).length;
            pend.className = 'gpe-agenda';
            pend.innerHTML = '<h3 class="gpe-h">Esta semana y la próxima</h3>' + (items.length ? items.slice(0, 8).map(function (x) {
                var g = urgencia(x.ts, now), m = mat(x.materia);
                return '<button type="button" class="gpe-ag" data-go="' + x.go + '"><span class="gpe-ag-ico ' + x.tipo + '">' + IC[x.tipo === 'quiz' ? 'quiz' : 'task'] + '</span>' +
                    '<span class="gpe-ag-main"><b>' + esc(x.titulo) + '</b><small><i class="gpe-dot" style="--m:' + m[1] + '"></i>' + esc(x.materia || '') + ' · ' + (x.tipo === 'quiz' ? (x.prog ? 'Quiz en progreso' : 'Quiz') : 'Tarea') + ' · ' + esc(fmtDate(x.ts, { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })) + '</small></span>' +
                    '<span class="gpe-pill ' + g.cls + '">' + g.label + '</span></button>';
            }).join('') + (sinFecha ? '<p class="gpe-note">' + sinFecha + ' tarea(s) sin fecha límite.</p>' : '')
                : '<div class="gpe-empty"><span class="gpe-ico" style="--c:#22c55e">' + IC.check + '</span><div><b>Nada pendiente en las próximas dos semanas</b><small>Cuando tu docente publique tareas o quices aparecerán aquí, ordenados por urgencia.</small></div></div>');
            pend.querySelectorAll('[data-go]').forEach(function (b) { b.addEventListener('click', function () { ir(b.getAttribute('data-go')); }); });
        }

        /* Materias del estudiante (no las cinco del programa) */
        var tiles = materias.map(function (n) { var m = mat(n); return m[3] ? { id: m[3], title: n, desc: m[4], c: m[1], icon: m[2] } : null; }).filter(Boolean);
        tiles.push({ id: 'recursos', title: 'Recursos y guías PDF', desc: 'Biblioteca del laboratorio', c: '#94a3b8', icon: 'folder' });
        tiles.push({ id: 'resultados', title: 'Mis resultados', desc: 'Historial de ensayos', c: '#94a3b8', icon: 'chart' });
        labs.className = 'gpe-labs';
        labs.innerHTML = '<h3 class="gpe-h">Tus laboratorios</h3>' + tiles.map(function (t) {
            return '<button type="button" class="gpe-lab" data-lab="' + t.id + '" style="--c:' + t.c + '"><span class="gpe-ico">' + IC[t.icon] + '</span><span><b>' + esc(t.title) + '</b><small>' + esc(t.desc) + '</small></span><i>' + IC.arrow + '</i></button>';
        }).join('');
        labs.querySelectorAll('[data-lab]').forEach(function (b) { b.addEventListener('click', function () { if (ctx.goToLab) ctx.goToLab(b.getAttribute('data-lab')); }); });

        pintar([]);
        quizzesDe(u).then(function (q) { pintar(q); if (ctx.badge) ctx.badge(pendientes.length + q.filter(function (x) { return x.st.code === 'available'; }).length); });
        return true;
    }

    /* ============================ NOTAS ============================ */
    function mejorNota(q) {
        var best = null;
        Object.keys(q.grades || {}).forEach(function (n) { var g = q.grades[n]; if (g && g.final && g.nota != null) { var v = to5(g.nota, g.scale || q.meta.scale); if (best == null || v > best) best = v; } });
        return best;
    }
    var gradesSeq = 0;
    function grades(ctx) {
        var box = $('avGradesList');
        if (!box) return false;
        var u = ctx.user, seq = ++gradesSeq, mine = {};
        (ctx.entregas || []).forEach(function (e) { if (u && e.estudianteId === u.id) mine[e.tareaId] = e; });
        var base = (ctx.tareas || []).map(function (t) {
            var e = mine[t.id], has = e && e.nota != null && e.nota !== '' && !isNaN(Number(e.nota));
            return {
                tipo: 'Tarea', titulo: t.titulo, materia: t.materia,
                nota: has ? Number(e.nota) : null,
                ts: has ? Date.parse(e.calificadaEn || e.fecha) || null : (e ? Date.parse(e.fecha) : limiteTarea(t)),
                estado: !e ? 'Sin entrega' : (has ? null : 'Entregada · sin nota'),
                feedback: e && e.comentarioDocente ? e.comentarioDocente : ''
            };
        });
        function pintar(quizzes) {
            if (seq !== gradesSeq) return;
            var qs = quizzes.filter(function (q) { return Object.keys(q.attempts || {}).length; }).map(function (q) {
                var n = mejorNota(q), sub = Object.keys(q.attempts).map(function (k) { return q.attempts[k]; }).filter(function (a) { return a.submittedAt; }).pop();
                return {
                    tipo: 'Quiz', titulo: q.meta.title, materia: q.meta.materia, nota: n,
                    ts: sub ? sub.submittedAt : q.meta.closeAt,
                    estado: n != null ? null : (q.st.code === 'progress' ? 'En progreso' : sub ? (q.meta.showScore ? 'Pendiente de calificación' : 'Entregado') : 'Sin entregar'),
                    feedback: ''
                };
            });
            var all = base.concat(qs);
            var con = all.filter(function (x) { return x.nota != null; });
            var prom = con.length ? con.reduce(function (a, x) { return a + x.nota; }, 0) / con.length : null;
            var ep = prom != null ? estadoPromedio(prom) : null;
            var aprob = con.filter(function (x) { return x.nota >= 3; }).length;

            var h = '<div class="gpe-kpis">' +
                kpi(ep ? (ep.cls === 'good' ? '#22c55e' : ep.cls === 'warn' ? '#f59e0b' : '#f87171') : '#64748b', 'avg', prom != null ? nota1(prom) : '—', 'Promedio general', ep ? '<i class="gpe-pill ' + ep.cls + '">' + ep.label + '</i>' : '<i class="gpe-pill">Sin notas aún</i>') +
                kpi('#22d3ee', 'task', con.length, 'Calificaciones') +
                kpi('#22c55e', 'check', aprob, 'Aprobadas') +
                kpi('#f87171', 'warn', con.length - aprob, 'Por debajo de 3,0') + '</div>';

            /* Evolución: una sola serie, un solo eje 0–5 */
            var serie = con.filter(function (x) { return x.ts; }).sort(function (a, b) { return a.ts - b.ts; });
            h += '<section class="gpe-card"><header><span class="gpe-ico" style="--c:#22d3ee">' + IC.avg + '</span><div><small>EVOLUCIÓN</small><h3>Tus notas en el tiempo</h3></div></header>' +
                (serie.length >= 2 ? '<div class="gpe-chart" id="gpeChart"></div>' : '<p class="gpe-note">La gráfica aparece cuando tengas al menos dos calificaciones.</p>') + '</section>';

            /* Por materia */
            var porMat = {};
            all.forEach(function (x) { var k = x.materia || 'Sin materia'; (porMat[k] = porMat[k] || []).push(x); });
            var nombres = Object.keys(porMat).sort(function (a, b) { return a.localeCompare(b, 'es'); });
            h += nombres.length ? nombres.map(function (n) {
                var items = porMat[n].sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); }), m = mat(n);
                var c2 = items.filter(function (x) { return x.nota != null; }), pm = c2.length ? c2.reduce(function (a, x) { return a + x.nota; }, 0) / c2.length : null, e2 = pm != null ? estadoPromedio(pm) : null;
                return '<section class="gpe-card gpe-mat" style="--c:' + m[1] + '"><header><span class="gpe-ico">' + IC[m[2]] + '</span><div><small>MATERIA</small><h3>' + esc(n) + '</h3></div>' +
                    '<div class="gpe-mat-avg">' + (pm != null ? '<b>' + nota1(pm) + '</b><i class="gpe-pill ' + e2.cls + '">' + e2.label + '</i>' : '<span>Sin notas</span>') + '</div></header>' +
                    '<div class="gpe-rows">' + items.map(function (x) {
                        var en = x.nota != null ? estadoNota(x.nota) : null;
                        return '<div class="gpe-row"><span class="gpe-tag ' + (x.tipo === 'Quiz' ? 'quiz' : 'task') + '">' + x.tipo + '</span>' +
                            '<div class="gpe-row-main"><b>' + esc(x.titulo) + '</b>' + (x.ts ? '<small>' + esc(fmtDate(x.ts, { day: 'numeric', month: 'short', year: 'numeric' })) + '</small>' : '') +
                            (x.feedback ? '<p class="gpe-fb">' + IC.msg + '<span>' + esc(x.feedback) + '</span></p>' : '') + '</div>' +
                            (en ? '<div class="gpe-grade ' + en.cls + '"><b>' + nota1(x.nota) + '</b><small>' + en.label + '</small></div>' : '<span class="gpe-pill">' + esc(x.estado) + '</span>') + '</div>';
                    }).join('') + '</div></section>';
            }).join('') : '<div class="gpe-empty"><span class="gpe-ico" style="--c:#94a3b8">' + IC.avg + '</span><div><b>Aún no hay actividades calificables</b><small>Tus tareas y quices aparecerán aquí con su nota y la retroalimentación del docente.</small></div></div>';

            box.className = 'gpe-grades';
            box.innerHTML = h;
            if (serie.length >= 2) grafica($('gpeChart'), serie);
        }
        pintar([]);
        quizzesDe(u).then(pintar);
        return true;
    }

    /* Gráfica SVG: línea de 2px, marcadores de 8px con anillo del fondo, eje único 0–5,
       referencia en 3,0 y recuadro al pasar el cursor (o tocar) cada punto. */
    function grafica(el, serie) {
        if (!el) return;
        var W = 720, H = 240, L = 38, R = 16, T = 14, B = 32;
        var t0 = serie[0].ts, t1 = serie[serie.length - 1].ts, span = Math.max(t1 - t0, DAY);
        var x = function (t) { return L + (t - t0) / span * (W - L - R); };
        var y = function (v) { return T + (5 - v) / 5 * (H - T - B); };
        var grid = [0, 1, 2, 3, 4, 5].map(function (v) { return '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(v) + '" y2="' + y(v) + '" class="gpe-gl"/><text x="' + (L - 8) + '" y="' + (y(v) + 4) + '" class="gpe-ax" text-anchor="end">' + v + '</text>'; }).join('');
        var ref = '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(3) + '" y2="' + y(3) + '" class="gpe-ref"/><text x="' + (W - R) + '" y="' + (y(3) - 6) + '" class="gpe-ax" text-anchor="end">Mínimo aprobatorio 3,0</text>';
        var pts = serie.map(function (s) { return [x(s.ts), y(s.nota)]; });
        var line = '<polyline points="' + pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ') + '" class="gpe-line"/>';
        var ticks = [serie[0], serie[Math.floor(serie.length / 2)], serie[serie.length - 1]].filter(function (s, i, a) { return a.indexOf(s) === i; })
            .map(function (s) { return '<text x="' + x(s.ts) + '" y="' + (H - 10) + '" class="gpe-ax" text-anchor="middle">' + esc(fmtDate(s.ts)) + '</text>'; }).join('');
        var dots = pts.map(function (p, i) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="5" class="gpe-pt"/><circle cx="' + p[0] + '" cy="' + p[1] + '" r="16" class="gpe-hit" data-i="' + i + '" tabindex="0" role="img" aria-label="' + esc(serie[i].tipo + ' ' + serie[i].titulo + ': ' + nota1(serie[i].nota)) + '"/>'; }).join('');
        el.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="Evolución de tus notas de 0 a 5">' + grid + ref + line + ticks + dots + '</svg><div class="gpe-tip" hidden></div>';
        var tip = el.querySelector('.gpe-tip'), svg = el.querySelector('svg');
        function show(i) {
            var s = serie[i], r = svg.getBoundingClientRect(), k = r.width / W;
            tip.innerHTML = '<b>' + nota1(s.nota) + '</b> · ' + esc(s.tipo) + '<br><span>' + esc(s.titulo) + '</span><br><small>' + esc(s.materia || '') + ' · ' + esc(fmtDate(s.ts, { day: 'numeric', month: 'short', year: 'numeric' })) + '</small>';
            tip.hidden = false;
            var left = pts[i][0] * k, top = pts[i][1] * k;
            tip.style.left = Math.min(Math.max(left, 90), r.width - 90) + 'px';
            tip.style.top = Math.max(top - 12, 0) + 'px';
        }
        el.querySelectorAll('.gpe-hit').forEach(function (c) {
            var i = +c.getAttribute('data-i');
            c.addEventListener('mouseenter', function () { show(i); });
            c.addEventListener('focus', function () { show(i); });
            c.addEventListener('click', function () { show(i); });
            c.addEventListener('mouseleave', function () { tip.hidden = true; });
            c.addEventListener('blur', function () { tip.hidden = true; });
        });
    }

    global.GeoPanelEst = { home: home, grades: grades };
})(window);
