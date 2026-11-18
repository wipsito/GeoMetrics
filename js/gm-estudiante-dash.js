/* GeoMetrics — Dashboard del estudiante (vista «Inicio» del aula, presentada como «Dashboard»).
 *
 * Se monta sobre lo existente sin reemplazarlo:
 *   - aula-virtual.js sigue manejando la navegación (data-av-view, data-open-course) y renderHome().
 *   - gm-estudiante-panel.js sigue calculando su agenda y laboratorios; aquí se reubican los laboratorios.
 * Distribución: encabezado de perfil, 5 indicadores con acceso directo, «Mis cursos» (con ilustración,
 * compañeros, avance y «Entrar al curso»), «Mi calendario», «Mi progreso académico», «Próximas actividades»,
 * «Mis notas recientes», «Actividad reciente», Civix, laboratorios y franja institucional.
 * La barra lateral pasa a ser ancha con nombres, «Mi perfil», «Configuración» y «Cerrar sesión».
 * Todo sale de los datos reales del estudiante. GeoMetrics Verified es exclusivo de docentes:
 * aquí solo aparece junto al nombre de los docentes de cada curso.
 */
(function (global) {
    var doc = global.document;
    var DAY = 864e5;
    function $(id) { return doc.getElementById(id); }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var low = function (s) { return String(s || '').trim().toLowerCase(); };
    var SV = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
    var IC = {
        dash: SV('<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'),
        cube: SV('<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m12 12 8-4.5M12 12v9M12 12 4 7.5"/>'),
        user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
        gear: SV('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
        out: SV('<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>'),
        cap: SV('<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'),
        mail: SV('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
        pin: SV('<path d="M12 21s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>'),
        group: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.2 2.4 3.5 5.5"/>'),
        layer: SV('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>'),
        eye: SV('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
        arrow: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'),
        chev: SV('<path d="m9 6 6 6-6 6"/>'),
        left: SV('<path d="m15 6-6 6 6 6"/>'),
        book: SV('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
        star: SV('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
        chart: SV('<path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/>'),
        clock: SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
        bolt: SV('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
        bot: SV('<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M8 14h.01M16 14h.01M9 18h6"/>'),
        task: SV('<rect x="4" y="4" width="16" height="16" rx="2"/><path d="m8 12 3 3 5-6"/>'),
        quiz: SV('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3v2h6V3M9 11h6M9 15h4"/>'),
        file: SV('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>'),
        cal: SV('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
        msg: SV('<path d="M4 5h16v11H9l-5 4z"/>'),
        grade: SV('<path d="M12 3 2 8l10 5 10-5z"/><path d="M6 10v5c3 2 9 2 12 0v-5"/>'),
        lib: SV('<path d="M4 4h4v16H4zM10 4h4v16h-4z"/><path d="m16 5 3.8-1 2.2 15.6-3.8 1z"/>'),
        build: SV('<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6M9 11h.01M15 11h.01"/>'),
        trophy: SV('<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0z"/><path d="M17 5h3a3 3 0 0 1-3 4M7 5H4a3 3 0 0 0 3 4"/>')
    };

    /* ------------------------------------------------------------ datos reales */
    function sesion() {
        try {
            var u = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
            if (u && typeof aulaRegistroUsuario === 'function') u = aulaRegistroUsuario(u) || u;
            return u;
        } catch (e) { return null; }
    }
    function load(k) { try { return (typeof aulaLoad === 'function' && global.AULA_KEYS) ? (aulaLoad(AULA_KEYS[k], []) || []) : []; } catch (e) { return []; } }
    function ve(u, t) { try { return typeof aulaUsuarioCoincideMateriaGrupo === 'function' && aulaUsuarioCoincideMateriaGrupo(u, t.materia, t.grupo || ''); } catch (e) { return false; } }
    function ts(v) { if (!v) return 0; if (typeof v === 'number') return v; var d = new Date(String(v).length === 10 ? v + 'T23:59:00' : v); return isNaN(d.getTime()) ? 0 : d.getTime(); }
    function limite(t) {
        try { if (typeof aulaParseLimite === 'function') { var d = aulaParseLimite(t); if (d) return d.getTime(); } } catch (e) {}
        return t.fechaLimite ? ts(t.fechaLimite + 'T' + (t.horaLimite || '23:59')) : 0;
    }
    function nota(e) { var n = parseFloat(String(e.nota).replace(',', '.')); return (e.nota == null || e.nota === '' || isNaN(n)) ? null : n; }
    function n1(n) { return (Math.round(n * 10) / 10).toFixed(1).replace('.', ','); }
    function fecha(t, o) { try { return new Date(t).toLocaleDateString('es-CO', o || { day: 'numeric', month: 'short' }); } catch (e) { return ''; } }
    function hace(t) {
        var d = Date.now() - t, h = Math.floor(d / 36e5);
        if (h < 1) return 'Hace minutos'; if (h < 24) return 'Hace ' + h + ' h';
        var dd = Math.floor(h / 24); return dd === 1 ? 'Ayer' : 'Hace ' + dd + ' días';
    }
    function falta(t) {
        var d = t - Date.now();
        if (d < 0) return ['Vencida', 'bad'];
        var h = Math.floor(d / 36e5); if (h < 24) return ['Hoy · ' + h + ' h', 'bad'];
        var dd = Math.ceil(d / DAY); return [dd === 1 ? 'Mañana' : 'En ' + dd + ' días', dd <= 3 ? 'warn' : 'ok'];
    }
    function materias(u) {
        var out = [];
        try { (aulaMateriasUsuario(u) || []).forEach(function (m, i) { if (m && m.nombre) out.push({ nombre: m.nombre, grupo: m.grupo || ((m.grupos || [])[0]) || '', idx: i }); }); } catch (e) {}
        return out;
    }
    function docenteDe(m, users, tareas) {
        var d = users.filter(function (x) {
            if (!x || x.rol !== 'docente') return false;
            var ms = []; try { ms = aulaMateriasUsuario(x) || []; } catch (e) {}
            return ms.some(function (y) { return low(y.nombre) === low(m.nombre) && (!m.grupo || !y.grupo || low(y.grupo).split(/[,;\s]+/).indexOf(low(m.grupo)) >= 0); });
        })[0];
        if (d) return { nombre: typeof aulaNombreRegistro === 'function' ? aulaNombreRegistro(d) : d.nombre, email: d.email };
        var t = tareas.filter(function (x) { return low(x.materia) === low(m.nombre) && x.docenteNombre; })[0];
        return t ? { nombre: t.docenteNombre, email: '' } : null;
    }
    /* compañeros: estudiantes registrados en la misma materia y grupo (el propio estudiante incluido) */
    function companeros(m, users) {
        return users.filter(function (x) {
            if (!x || x.rol === 'docente') return false;
            try { return aulaUsuarioCoincideMateriaGrupo(x, m.nombre, m.grupo || ''); } catch (e) { return false; }
        }).length;
    }
    var Q = { lista: null, at: 0, cargando: false };
    function quices(u, cb) {
        if (!global.GeoQuiz || !GeoQuiz.listForStudent || !global.GeoAuth || !GeoAuth.verified()) return;
        if (Q.cargando || (Q.lista && Date.now() - Q.at < 60000)) return;
        Q.cargando = true;
        GeoQuiz.listForStudent(u).then(function (l) { (l || []).forEach(function (it) { try { it.st = GeoQuiz.statusFor(it); } catch (e) {} }); Q.lista = l || []; })
            .catch(function () { Q.lista = Q.lista || []; })
            .then(function () { Q.cargando = false; Q.at = Date.now(); if (cb) cb(); });
    }
    function notaQuiz(q) {
        var best = null, at = 0;
        Object.keys(q.grades || {}).forEach(function (n) {
            var g = q.grades[n]; if (!g || !g.final || g.nota == null) return;
            var s = Number(g.scale || (q.meta && q.meta.scale) || 5), v = s === 5 ? Number(g.nota) : Number(g.nota) / s * 5;
            var t = (q.attempts && q.attempts[n] && q.attempts[n].submittedAt) || 0;
            if (best == null || v > best) { best = v; at = t; }
        });
        return best == null ? null : { nota: best, at: at };
    }
    function datos() {
        var u = sesion(); if (!u) return null;
        var tareas = load('tareas').filter(function (t) { return ve(u, t); });
        var mias = load('entregas').filter(function (e) { return e && (e.estudianteId === u.id || (e.estudianteEmail && low(e.estudianteEmail) === low(u.email))); });
        var porTarea = {}; mias.forEach(function (e) { porTarea[e.tareaId] = e; });
        var D = { u: u, tareas: tareas, mias: mias, porTarea: porTarea, mats: materias(u), users: load('users'),
            materiales: load('presentaciones').filter(function (p) { return ve(u, p); }), quices: Q.lista || [] };
        /* notas (tareas + quices) y actividades evaluables */
        D.notas = [];
        mias.forEach(function (e) {
            var n = nota(e); if (n === null) return;
            var t = tareas.filter(function (x) { return x.id === e.tareaId; })[0] || {};
            D.notas.push({ m: t.materia || e.materia || '', a: t.titulo || 'Tarea', n: n, at: ts(e.calificadaEn) || ts(e.fecha), tipo: 'Tarea' });
        });
        D.quices.forEach(function (q) { var g = notaQuiz(q); if (g) D.notas.push({ m: q.meta.materia || '', a: q.meta.title || 'Quiz', n: g.nota, at: g.at, tipo: 'Quiz' }); });
        D.prom = D.notas.length ? D.notas.reduce(function (a, b) { return a + b.n; }, 0) / D.notas.length : null;
        var cerrados = D.quices.filter(function (q) { return q.st && q.st.code !== 'soon'; });
        D.hechasT = tareas.filter(function (t) { return porTarea[t.id]; }).length;
        D.hechosQ = cerrados.filter(function (q) { return q.st && /graded|submitted/.test(q.st.code); }).length;
        D.total = tareas.length + cerrados.length;
        D.hechas = D.hechasT + D.hechosQ;
        D.pend = tareas.filter(function (t) { return !porTarea[t.id] && (!limite(t) || limite(t) >= Date.now()); });
        D.vencidas = tareas.filter(function (t) { return !porTarea[t.id] && limite(t) && limite(t) < Date.now(); });
        D.qActivos = D.quices.filter(function (q) { return q.st && (q.st.code === 'available' || q.st.code === 'progress'); });
        return D;
    }

    /* ------------------------------------------------------------ barra lateral (ancha, con nombres) */
    var ORDEN = [
        ['inicio', 'Dashboard', IC.dash], ['aula', 'Aula virtual', IC.cube], ['perfil', 'Mi perfil', IC.user], ['cursos', 'Mis cursos', IC.book],
        ['calendario', 'Calendario', IC.cal], ['tareas', 'Tareas', IC.task], ['quices', 'Quices', IC.quiz],
        ['calificaciones', 'Calificaciones', IC.grade], ['foros', 'Mensajes', IC.msg], ['recursos', 'Recursos', IC.lib], ['config', 'Configuración', IC.gear]
    ];
    function barra() {
        var M = $('pantallaEstudiante'), nav = M && M.querySelector('.av-nav'); if (!nav) return;
        M.classList.add('ged-wide');
        if (!nav.querySelector('.ged-nav-title')) nav.insertBefore(el('div', 'ged-nav-title', 'PANEL ESTUDIANTIL'), nav.firstChild);
        var prev = nav.querySelector('.ged-nav-title');
        ORDEN.forEach(function (o) {
            var b = nav.querySelector(':scope > [data-av-view="' + o[0] + '"]');
            if (!b) { b = el('button'); b.type = 'button'; b.setAttribute('data-av-view', o[0]); }
            /* si otro módulo reescribe el botón una y otra vez, no se pelea con él (máx. 3 veces) */
            b.__gedN = b.__gedN || 0;
            if ((!b.querySelector('.ged-lab') || b.querySelector('.ged-lab').textContent !== o[1]) && b.__gedN < 3) {
                b.__gedN++;
                var badge = b.querySelector('.gtd-cnt, .av-badge'); b.innerHTML = '<span class="av-ico">' + o[2] + '</span><span class="ged-lab">' + esc(o[1]) + '</span>';
                if (badge) b.appendChild(badge);
            }
            if (b.title !== o[1]) b.title = o[1];
            if (prev.nextElementSibling !== b) nav.insertBefore(b, prev.nextSibling);
            prev = b;
        });
        if (!nav.querySelector('.ged-nav-foot')) {
            var f = el('div', 'ged-nav-foot', '<div class="ged-inst"><span>' + IC.build + '</span><p>Universidad de Pamplona</p><small>Ingeniería Civil</small></div>' +
                '<button type="button" class="ged-out">' + '<span class="av-ico">' + IC.out + '</span><span class="ged-lab">Cerrar sesión</span></button>');
            nav.appendChild(f);
            f.querySelector('.ged-out').addEventListener('click', function () { var b = $('btnCerrarSesion'); if (b) b.click(); else if (typeof aulaLogout === 'function') aulaLogout(); });
        }
    }
    /* «Configuración» abre la pestaña de preferencias del perfil (no se duplica un módulo) */
    doc.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('#pantallaEstudiante [data-av-view="config"]');
        if (!b) return;
        e.preventDefault(); e.stopPropagation();
        try { aulaAbrirPerfil(); if (typeof aulaPerfilSetTab === 'function') aulaPerfilSetTab('prefs'); } catch (ex) {}
    }, true);

    /* ------------------------------------------------------------ estructura */
    function vista() { return doc.querySelector('#pantallaEstudiante .av-view[data-av-view="inicio"]'); }
    function estructura() {
        var V = vista(); if (!V) return null;
        V.classList.add('ged-on');
        var root = $('gedRoot');
        if (!root) {
            root = el('div', 'ged'); root.id = 'gedRoot';
            root.innerHTML =
                '<section class="ged-hero" id="gedHero" aria-label="Tu perfil"></section>' +
                '<div class="ged-kpis" id="gedKpis"></div>' +
                '<div class="ged-row ged-row-a">' +
                    '<section class="ged-card ged-cursos"><header>' + IC.cap + '<h3>Mis cursos</h3><button type="button" class="ged-link" data-av-view="cursos">Ver todos ' + IC.arrow + '</button></header><div id="gedCursos"></div></section>' +
                    '<section class="ged-card ged-cal"><header>' + IC.cal + '<h3>Mi calendario</h3><button type="button" class="ged-link" data-av-view="calendario">Ver calendario ' + IC.arrow + '</button></header><div id="gedCal"></div></section>' +
                    '<section class="ged-card ged-prog"><header>' + IC.chart + '<h3>Mi progreso académico</h3></header><div id="gedProg"></div></section>' +
                '</div>' +
                '<div class="ged-row ged-row-b">' +
                    '<section class="ged-card ged-prox"><header>' + IC.clock + '<h3>Próximas actividades</h3><button type="button" class="ged-link" data-av-view="tareas">Ver todas ' + IC.arrow + '</button></header><div id="gedProx"></div></section>' +
                    '<section class="ged-card ged-notas"><header>' + IC.star + '<h3>Mis notas recientes</h3><button type="button" class="ged-link" data-av-view="calificaciones">Ver historial ' + IC.arrow + '</button></header><div id="gedNotas"></div></section>' +
                    '<section class="ged-card ged-act"><header>' + IC.bolt + '<h3>Actividad reciente</h3></header><div id="gedAct"></div></section>' +
                '</div>' +
                '<section class="ged-civix"><span class="ged-civix-ico">' + IC.bot + '</span><div><b>Civix, tu asistente de Ingeniería Civil</b>' +
                    '<small>Fórmulas, conversión de unidades, ensayos de laboratorio, apoyo en ejercicios y planos CAD. Conserva tu historial de conversaciones.</small></div>' +
                    '<button type="button" class="ged-btn" data-ged-civix>Abrir Civix ' + IC.arrow + '</button></section>' +
                '<div class="ged-labs-slot"></div>' +
                '<footer class="ged-band"><svg class="ged-band-bg" viewBox="0 0 1200 120" preserveAspectRatio="xMaxYMid slice" aria-hidden="true"><g fill="none" stroke="#22d3ee" stroke-opacity=".22" stroke-width="1.4">' +
                    '<path d="M860 120V40h50v80M930 120V20h60v100M1010 120V55h45v65M1075 120V30h70v90M870 60h30M870 80h30M940 40h40M940 60h40M940 80h40M1085 50h50M1085 70h50M1085 90h50"/></g></svg>' +
                    '<span class="ged-band-ico">' + IC.cap + '</span><div><b>GeoMetrics</b><small>Tu conocimiento, nuestra ingeniería</small></div>' +
                    '<p>“La ingeniería no solo se construye con planos, sino con la pasión de aprender cada día.”</p></footer>';
            V.insertBefore(root, V.firstChild);
            root.addEventListener('click', clic);
        }
        var labs = $('avHomeLabs'), slot = root.querySelector('.ged-labs-slot');
        if (labs && slot && labs.parentNode !== slot) slot.appendChild(labs);
        return root;
    }
    var CAL = { y: null, m: null, sel: null };
    function clic(e) {
        if (e.target.closest('[data-ged-perfil]')) { try { aulaAbrirPerfil(); } catch (ex) {} return; }
        if (e.target.closest('[data-ged-civix]')) { try { if (typeof abrirCivixModal === 'function') abrirCivixModal(); else { var b = $('btnAsistenteAI'); if (b) b.click(); } } catch (ex) {} return; }
        var cod = e.target.closest('[data-ged-cod]');
        if (cod) { var s = cod.parentNode.querySelector('.ged-cod-v'), oc = s.getAttribute('data-oculto') === '1'; s.textContent = oc ? s.getAttribute('data-v') : '••••' + s.getAttribute('data-v').slice(-3); s.setAttribute('data-oculto', oc ? '0' : '1'); cod.setAttribute('aria-pressed', oc ? 'true' : 'false'); return; }
        var c = e.target.closest('[data-ged-chat]'); if (c && global.GMChatCon) { GMChatCon(c.getAttribute('data-ged-chat'), 'estudiante'); return; }
        var mv = e.target.closest('[data-ged-mes]');
        if (mv) { CAL.m += Number(mv.getAttribute('data-ged-mes')); if (CAL.m < 0) { CAL.m = 11; CAL.y--; } if (CAL.m > 11) { CAL.m = 0; CAL.y++; } CAL.sel = null; var D = datos(); if (D) poner('gedCal', calendario(D), true); return; }
        var dia = e.target.closest('[data-ged-dia]');
        if (dia) { CAL.sel = Number(dia.getAttribute('data-ged-dia')); var D2 = datos(); if (D2) poner('gedCal', calendario(D2), true); }
    }

    /* ------------------------------------------------------------ encabezado */
    function linea(ico, txt) { return txt ? '<span class="ged-li">' + ico + '<span>' + txt + '</span></span>' : ''; }
    function hero(D) {
        var u = D.u, nombre = typeof aulaNombreRegistro === 'function' ? aulaNombreRegistro(u) : u.nombre;
        var foto = typeof aulaFotoUsuario === 'function' ? aulaFotoUsuario(u) : u.foto;
        var p = nombre.split(/\s+/), ini = ((p[0] || 'E')[0] + (p.length > 1 ? p[p.length >= 4 ? 2 : 1][0] : '')).toUpperCase();
        var grupos = D.mats.map(function (m) { return m.grupo; }).filter(Boolean).filter(function (g, i, a) { return a.indexOf(g) === i; });
        var cod = u.codigo && u.mostrarCodigo !== false ? '<span class="ged-li">' + IC.cap + '<span>Código <b class="ged-cod-v" data-oculto="1" data-v="' + esc(u.codigo) + '">••••' + esc(String(u.codigo).slice(-3)) + '</b></span>' +
            '<button type="button" class="ged-eye" data-ged-cod aria-pressed="false" title="Mostrar u ocultar el código">' + IC.eye + '</button></span>' : '';
        return '<svg class="ged-hero-bg" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
            '<defs><linearGradient id="gedSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050912"/><stop offset="1" stop-color="#0b2a55"/></linearGradient>' +
            '<linearGradient id="gedFade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#050912" stop-opacity=".97"/><stop offset=".5" stop-color="#050912" stop-opacity=".75"/><stop offset="1" stop-color="#050912" stop-opacity=".1"/></linearGradient></defs>' +
            '<rect width="1200" height="300" fill="url(#gedSky)"/>' +
            /* puente atirantado */
            '<g fill="none" stroke="#22d3ee" stroke-opacity=".55" stroke-width="2"><path d="M560 220h640" stroke-width="3"/><path d="M780 220V70M1030 220V70" stroke-width="7"/>' +
            '<path d="M780 78 620 220M780 78 660 220M780 78 700 220M780 78 740 220M780 78 820 220M780 78 860 220M780 78 900 220M780 78 940 220M1030 78 870 220M1030 78 910 220M1030 78 950 220M1030 78 990 220M1030 78 1070 220M1030 78 1110 220M1030 78 1150 220M1030 78 1190 220" stroke-width="1.1" stroke-opacity=".35"/>' +
            '<path d="M760 220v80M800 220v80M1010 220v80M1050 220v80" stroke-width="4" stroke-opacity=".3"/></g>' +
            '<g fill="none" stroke="#2dd4bf" stroke-opacity=".2" stroke-width="1.3"><path d="M500 300c100-40 260-50 400-40s200 10 300-20"/><path d="M520 300c110-30 270-36 410-26s190 6 270-14"/></g>' +
            '<rect width="1200" height="300" fill="url(#gedFade)"/></svg>' +
            '<div class="ged-hero-in">' +
                '<div class="ged-foto">' + (foto ? '<img src="' + esc(foto) + '" alt="Foto de ' + esc(nombre) + '">' : '<span>' + esc(ini) + '</span>') + '</div>' +
                '<div class="ged-hero-t">' +
                    '<h2>' + esc(nombre) + '</h2>' +
                    '<p class="ged-sub">Estudiante de ' + esc(String(u.programa || 'Ingeniería Civil').replace(/^Programa de /i, '')) + (u.semestre ? ' · Semestre ' + esc(u.semestre) : '') + '</p>' +
                    '<div class="ged-lis">' +
                        linea(IC.group, grupos.length ? (grupos.length === 1 ? 'Grupo ' : 'Grupos ') + esc(grupos.join(', ')) : '') +
                        linea(IC.mail, esc(u.email || '')) +
                        linea(IC.pin, 'Universidad de Pamplona · Pamplona, N. de S.') + cod +
                    '</div>' +
                    (u.bio && u.mostrarBio !== false ? '<p class="ged-frase">“' + esc(u.bio) + '”</p>' : '') +
                '</div>' +
                '<button type="button" class="ged-edit" data-ged-perfil>' + IC.user + 'Ver mi perfil</button>' +
            '</div>';
    }

    /* ------------------------------------------------------------ indicadores */
    function kpis(D) {
        var k = function (view, c, ico, label, valor, sub) {
            return '<button type="button" class="ged-kpi" data-av-view="' + view + '" style="--c:' + c + '"><span class="ged-kpi-ico">' + ico + '</span>' +
                '<span class="ged-kpi-t"><small>' + label + '</small><b>' + valor + '</b>' + (sub ? '<em>' + sub + '</em>' : '') + '</span><span class="ged-kpi-go">' + IC.chev + '</span></button>';
        };
        var pct = D.total ? Math.round(D.hechas * 100 / D.total) : null;
        return k('cursos', '#22d3ee', IC.cap, 'Mis cursos', D.mats.length, D.mats.length === 1 ? 'asignatura' : 'asignaturas') +
            k('tareas', '#f59e0b', IC.task, 'Tareas pendientes', D.pend.length, D.vencidas.length ? D.vencidas.length + ' vencida' + (D.vencidas.length === 1 ? '' : 's') : 'al día') +
            k('quices', '#2dd4bf', IC.quiz, 'Quices activos', Q.lista ? D.qActivos.length : '…', Q.lista ? 'disponibles ahora' : 'cargando') +
            k('calificaciones', '#a78bfa', IC.star, 'Promedio general', D.prom == null ? '—' : n1(D.prom) + '<i> / 5,0</i>', D.prom == null ? 'sin notas aún' : D.notas.length + ' nota' + (D.notas.length === 1 ? '' : 's')) +
            k('calificaciones', '#38bdf8', IC.chart, 'Actividades completadas', pct == null ? '—' : pct + '%', D.hechas + ' de ' + D.total);
    }

    /* ------------------------------------------------------------ mis cursos (ilustración por tipo de materia) */
    function escena(n) {
        n = low(n);
        var cielo = '<rect width="300" height="110" fill="url(#gedCs)"/>', suelo = '';
        var cuerpo;
        if (/suelo|geot/.test(n)) { /* excavadora y estratos */
            suelo = '<path d="M0 82h300v28H0z" fill="#3b2f1f"/><path d="M0 92h300M0 101h300" stroke="#6b5332" stroke-width="2"/>';
            cuerpo = '<g fill="#f59e0b"><rect x="120" y="58" width="56" height="22" rx="3"/><rect x="150" y="44" width="24" height="16" rx="2"/></g><rect x="114" y="78" width="70" height="8" rx="4" fill="#1f2937"/>' +
                '<path d="M172 52l40-22 22 26" fill="none" stroke="#f59e0b" stroke-width="6" stroke-linecap="round"/><path d="M228 52l14 16-16 4z" fill="#d97706"/><path d="M40 82l26-20 30 20z" fill="#5b4632"/>';
        } else if (/resist|estruct/.test(n)) { /* pórtico en construcción */
            suelo = '<path d="M0 90h300v20H0z" fill="#1f2937"/>';
            cuerpo = '<g stroke="#cbd5e1" stroke-width="5"><path d="M70 90V30M130 90V30M190 90V30M250 90V30"/></g><g stroke="#94a3b8" stroke-width="4"><path d="M60 34h200M60 62h200"/></g>' +
                '<path d="M40 90V12M40 12h60M92 12v22" stroke="#f59e0b" stroke-width="3" fill="none"/>';
        } else if (/v[ií]a|geom|carret|transp/.test(n)) { /* carretera */
            suelo = '<path d="M0 70c80-10 220-10 300 0v40H0z" fill="#14532d"/>';
            cuerpo = '<path d="M120 110 145 62h10l25 48z" fill="#374151"/><path d="M150 64v8M150 78v10M150 94v12" stroke="#facc15" stroke-width="2"/><path d="M0 62c60-18 120-24 150-24s90 6 150 24" fill="none" stroke="#2dd4bf" stroke-opacity=".35" stroke-width="2"/>';
        } else if (/mezcl|concret/.test(n)) { /* mezcladora y cono de asentamiento */
            suelo = '<path d="M0 90h300v20H0z" fill="#334155"/>';
            cuerpo = '<ellipse cx="130" cy="62" rx="40" ry="24" fill="#a78bfa" transform="rotate(-18 130 62)"/><rect x="90" y="80" width="90" height="10" fill="#475569"/><circle cx="104" cy="92" r="7" fill="#1f2937"/><circle cx="168" cy="92" r="7" fill="#1f2937"/>' +
                '<path d="M220 90l10-36h14l10 36z" fill="#94a3b8"/>';
        } else {
            suelo = '<path d="M0 90h300v20H0z" fill="#1f2937"/>';
            cuerpo = '<path d="M90 90V40l60-20 60 20v50" fill="none" stroke="#22d3ee" stroke-width="3"/><path d="M110 90V60h80v30" fill="none" stroke="#22d3ee" stroke-opacity=".5" stroke-width="2"/>';
        }
        return '<svg class="ged-cur-img" viewBox="0 0 300 110" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="gedCs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2a55"/><stop offset="1" stop-color="#12324f"/></linearGradient></defs>' + cielo + suelo + cuerpo + '</svg>';
    }
    function cursos(D) {
        if (!D.mats.length) return '<p class="ged-empty">Aún no tienes asignaturas vinculadas. Agrégalas en tu perfil con la materia y el grupo en que estás matriculado.</p>';
        var ahora = Date.now();
        return '<div class="ged-cur-grid">' + D.mats.map(function (m) {
            var dc = docenteDe(m, D.users, D.tareas);
            var ts_ = D.tareas.filter(function (t) { return low(t.materia) === low(m.nombre); });
            var hechas = ts_.filter(function (t) { return D.porTarea[t.id]; }).length;
            var pend = ts_.filter(function (t) { return !D.porTarea[t.id]; }).length;
            var pct = ts_.length ? Math.round(hechas * 100 / ts_.length) : null;
            var prox = ts_.filter(function (t) { return !D.porTarea[t.id] && limite(t) >= ahora; }).sort(function (a, b) { return limite(a) - limite(b); })[0];
            var n = companeros(m, D.users);
            return '<article class="ged-cur">' + escena(m.nombre) +
                '<div class="ged-cur-b"><b class="ged-cur-n">' + esc(m.nombre) + '</b>' +
                    '<small class="ged-cur-d">' + (m.grupo ? 'Grupo ' + esc(m.grupo) : 'Sin grupo') + (dc ? ' · ' + esc(dc.nombre) + (dc.email && global.GMV ? GMV.slot(dc.email, 'xs') : '') : '') + '</small>' +
                    '<small class="ged-cur-s">' + IC.group + n + ' estudiante' + (n === 1 ? '' : 's') + (pend ? ' · <em>' + pend + ' pendiente' + (pend === 1 ? '' : 's') + '</em>' : '') + '</small>' +
                    '<div class="ged-cur-bar" title="Tareas entregadas"><i style="width:' + (pct || 0) + '%"></i><span>' + (pct == null ? '—' : pct + '%') + '</span></div>' +
                    (prox ? '<small class="ged-cur-next">Próxima: ' + esc(prox.titulo) + ' · ' + esc(fecha(limite(prox))) + '</small>' : '') +
                    '<button type="button" class="ged-enter" data-open-course="m' + m.idx + '">Entrar al curso ' + IC.arrow + '</button>' +
                '</div></article>';
        }).join('') + '</div>';
    }

    /* ------------------------------------------------------------ calendario (eventos reales) */
    function eventos(D) {
        var ev = [];
        D.tareas.forEach(function (t) { var l = limite(t); if (l) ev.push({ at: l, t: 'Entrega: ' + (t.titulo || 'Tarea'), s: t.materia || '', c: D.porTarea[t.id] ? '#4ade80' : '#f59e0b', v: 'tareas', hecho: !!D.porTarea[t.id] }); });
        D.quices.forEach(function (q) {
            var m = q.meta || {};
            if (m.publishAt) ev.push({ at: m.publishAt, t: 'Abre quiz: ' + (m.title || 'Quiz'), s: m.materia || '', c: '#a78bfa', v: 'quices' });
            if (m.closeAt) ev.push({ at: m.closeAt, t: 'Cierra quiz: ' + (m.title || 'Quiz'), s: m.materia || '', c: '#a78bfa', v: 'quices' });
        });
        return ev;
    }
    function calendario(D) {
        var hoy = new Date();
        if (CAL.y === null) { CAL.y = hoy.getFullYear(); CAL.m = hoy.getMonth(); }
        var ev = eventos(D), porDia = {};
        ev.forEach(function (e) { var d = new Date(e.at); if (d.getFullYear() === CAL.y && d.getMonth() === CAL.m) (porDia[d.getDate()] = porDia[d.getDate()] || []).push(e); });
        var primero = new Date(CAL.y, CAL.m, 1), ini = (primero.getDay() + 6) % 7, dias = new Date(CAL.y, CAL.m + 1, 0).getDate();
        var h = '<div class="ged-cal-h"><button type="button" class="ged-cal-nav" data-ged-mes="-1" aria-label="Mes anterior">' + IC.left + '</button>' +
            '<b>' + esc(primero.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })) + '</b>' +
            '<button type="button" class="ged-cal-nav" data-ged-mes="1" aria-label="Mes siguiente">' + IC.chev + '</button></div>' +
            '<div class="ged-cal-g">' + ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(function (d) { return '<span class="dow">' + d + '</span>'; }).join('');
        for (var i = 0; i < ini; i++) h += '<span></span>';
        for (var d = 1; d <= dias; d++) {
            var esHoy = d === hoy.getDate() && CAL.m === hoy.getMonth() && CAL.y === hoy.getFullYear();
            var e = porDia[d];
            h += '<button type="button" class="ged-dia' + (esHoy ? ' hoy' : '') + (e ? ' ev' : '') + (CAL.sel === d ? ' sel' : '') + '" data-ged-dia="' + d + '"' + (e ? ' title="' + esc(e.map(function (x) { return x.t; }).join(' · ')) + '"' : '') + '>' + d +
                (e ? '<i style="--c:' + e[0].c + '"></i>' : '') + '</button>';
        }
        h += '</div>';
        var sel = CAL.sel ? (porDia[CAL.sel] || []) : null;
        if (sel) {
            h += '<div class="ged-cal-list"><small>' + esc(new Date(CAL.y, CAL.m, CAL.sel).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })) + '</small>' +
                (sel.length ? sel.map(function (x) { return '<button type="button" data-av-view="' + x.v + '" style="--c:' + x.c + '"><i></i><span><b>' + esc(x.t) + '</b><small>' + esc(x.s) + ' · ' + esc(new Date(x.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })) + (x.hecho ? ' · entregada' : '') + '</small></span></button>'; }).join('')
                    : '<p class="ged-empty">Sin actividades este día.</p>') + '</div>';
        } else {
            var n = Object.keys(porDia).length;
            h += '<p class="ged-cal-tip">' + (n ? 'Toca un día marcado para ver sus actividades.' : 'No hay actividades este mes.') + '</p>';
        }
        return h;
    }

    /* ------------------------------------------------------------ progreso */
    function progreso(D) {
        var pct = D.total ? Math.round(D.hechas * 100 / D.total) : null, R = 40, C = 2 * Math.PI * R;
        var msg;
        if (pct == null) msg = ['Aún no hay actividades evaluables', 'Cuando tus docentes publiquen tareas o quices verás tu avance aquí.', ''];
        else if (D.vencidas.length) msg = ['Tienes ' + D.vencidas.length + ' tarea' + (D.vencidas.length === 1 ? '' : 's') + ' vencida' + (D.vencidas.length === 1 ? '' : 's'), 'Escríbele a tu docente si necesitas apoyo para ponerte al día.', 'warn'];
        else if (D.prom != null && D.prom < 3) msg = ['Tu promedio está por debajo de 3,0', 'Revisa la retroalimentación de tus notas y apóyate en Civix y en tus docentes.', 'warn'];
        else if (pct >= 80) msg = ['¡Vas muy bien!', 'Mantén tu esfuerzo y tu constancia.', 'good'];
        else msg = ['Sigue avanzando', 'Revisa tus próximas actividades para completar lo pendiente.', ''];
        return '<div class="ged-ring"><svg viewBox="0 0 100 100" aria-label="Actividades completadas ' + (pct || 0) + '%"><circle cx="50" cy="50" r="' + R + '" class="bg"/><circle cx="50" cy="50" r="' + R + '" class="fg" stroke-dasharray="' + (C * (pct || 0) / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><b>' + (pct == null ? '—' : pct + '%') + '</b><small>completado</small></div>' +
            '<ul class="ged-prog-l">' +
                '<li><i style="--c:#4ade80"></i>Tareas entregadas<b>' + D.hechasT + '</b></li>' +
                '<li><i style="--c:#22d3ee"></i>Quices presentados<b>' + D.hechosQ + '</b></li>' +
                '<li><i style="--c:#f59e0b"></i>Pendientes<b>' + (D.pend.length + D.qActivos.length) + '</b></li>' +
                '<li><i style="--c:#a78bfa"></i>Promedio<b>' + (D.prom == null ? '—' : n1(D.prom)) + '</b></li>' +
            '</ul>' +
            '<div class="ged-msg ' + msg[2] + '">' + IC.trophy + '<div><b>' + esc(msg[0]) + '</b><small>' + esc(msg[1]) + '</small></div></div>';
    }

    /* ------------------------------------------------------------ próximas actividades */
    function proximas(D) {
        var it = D.pend.filter(function (t) { return limite(t); }).map(function (t) { return { at: limite(t), t: t.titulo || 'Tarea', s: t.materia || '', i: IC.file, c: '#22d3ee', tipo: 'Tarea', v: 'tareas' }; });
        D.qActivos.forEach(function (q) { var m = q.meta || {}; if (m.closeAt) it.push({ at: m.closeAt, t: m.title || 'Quiz', s: m.materia || '', i: IC.quiz, c: '#a78bfa', tipo: q.st.code === 'progress' ? 'Quiz en curso' : 'Quiz', v: 'quices' }); });
        D.vencidas.forEach(function (t) { it.push({ at: limite(t), t: t.titulo || 'Tarea', s: t.materia || '', i: IC.file, c: '#fb7185', tipo: 'Tarea vencida', v: 'tareas' }); });
        it.sort(function (a, b) { return a.at - b.at; });
        if (!it.length) return '<p class="ged-empty">No tienes actividades pendientes. Cuando tus docentes publiquen tareas o quices aparecerán aquí.</p>';
        return '<ul class="ged-list">' + it.slice(0, 5).map(function (x) {
            var f = falta(x.at);
            return '<li><button type="button" data-av-view="' + x.v + '" style="--c:' + x.c + '"><span class="ged-li-ico">' + x.i + '</span><span class="ged-li-t"><b>' + esc(x.tipo + ': ' + x.t) + '</b><small>' + esc(x.s) + ' · ' + esc(fecha(x.at, { day: 'numeric', month: 'short', year: 'numeric' })) + '</small></span>' +
                '<span class="ged-pill ' + f[1] + '">' + esc(f[0]) + '</span></button></li>';
        }).join('') + '</ul>';
    }

    /* ------------------------------------------------------------ notas recientes (por asignatura) */
    function notasRecientes(D) {
        var revision = D.mias.filter(function (e) { return nota(e) === null; }).length;
        if (!D.notas.length) return '<p class="ged-empty">Aún no tienes notas publicadas.' + (revision ? ' Tienes ' + revision + ' entrega' + (revision === 1 ? '' : 's') + ' en revisión.' : '') + '</p>';
        var porM = {};
        D.notas.forEach(function (x) { var k = x.m || 'Sin asignatura'; (porM[k] = porM[k] || []).push(x); });
        var filas = Object.keys(porM).map(function (k) {
            var l = porM[k].sort(function (a, b) { return b.at - a.at; });
            return { m: k, prom: l.reduce(function (a, b) { return a + b.n; }, 0) / l.length, ult: l[0], n: l.length };
        }).sort(function (a, b) { return b.ult.at - a.ult.at; });
        return '<ul class="ged-notas-l">' + filas.slice(0, 5).map(function (f) {
            var c = f.prom >= 4 ? 'good' : f.prom >= 3 ? 'warn' : 'bad';
            return '<li><div><b>' + esc(f.m) + '</b><small>Última: ' + esc(f.ult.a) + ' (' + n1(f.ult.n) + ') · ' + esc(fecha(f.ult.at)) + ' · ' + f.n + ' nota' + (f.n === 1 ? '' : 's') + '</small></div><span class="ged-nota ' + c + '" title="Promedio de la asignatura">' + n1(f.prom) + '</span></li>';
        }).join('') + '</ul>' + (revision ? '<p class="ged-nota-p">' + revision + ' entrega' + (revision === 1 ? '' : 's') + ' en revisión por el docente.</p>' : '');
    }

    /* ------------------------------------------------------------ actividad reciente */
    function actividad(D) {
        var ev = [], desde = Date.now() - 21 * DAY, ahora = Date.now();
        D.mias.forEach(function (e) {
            var t = D.tareas.filter(function (x) { return x.id === e.tareaId; })[0] || {};
            ev.push({ at: ts(e.fecha), i: IC.task, c: '#4ade80', t: 'Entregaste la tarea: ' + (t.titulo || 'Tarea') });
            if (nota(e) !== null && e.calificadaEn) ev.push({ at: ts(e.calificadaEn), i: IC.star, c: '#f59e0b', t: 'Obtuviste ' + n1(nota(e)) + ' en ' + (t.titulo || 'una tarea') });
        });
        D.tareas.forEach(function (t) { var c = ts(t.creada); if (c >= desde) ev.push({ at: c, i: IC.file, c: '#22d3ee', t: 'Nueva tarea: ' + (t.titulo || '') }); });
        D.materiales.forEach(function (p) { var c = ts(p.creada); if (c >= desde) ev.push({ at: c, i: IC.lib, c: '#fb923c', t: 'Nuevo material: ' + (p.titulo || '') }); });
        D.quices.forEach(function (q) {
            var m = q.meta || {};
            if (m.publishAt && m.publishAt >= desde && m.publishAt <= ahora) ev.push({ at: m.publishAt, i: IC.quiz, c: '#a78bfa', t: 'Quiz publicado: ' + (m.title || '') });
            Object.keys(q.attempts || {}).forEach(function (n) { var a = q.attempts[n]; if (a && a.submittedAt) ev.push({ at: a.submittedAt, i: IC.quiz, c: '#2dd4bf', t: 'Presentaste el quiz: ' + (m.title || 'Quiz') }); });
        });
        ev = ev.filter(function (x) { return x.at; }).sort(function (a, b) { return b.at - a.at; }).slice(0, 5);
        if (!ev.length) return '<p class="ged-empty">Sin actividad reciente. Tus entregas, notas y materiales nuevos aparecerán aquí.</p>';
        return '<ul class="ged-act-l">' + ev.map(function (x) {
            return '<li style="--c:' + x.c + '"><span class="ged-act-i">' + x.i + '</span><b>' + esc(x.t) + '</b><time>' + esc(hace(x.at)) + '</time></li>';
        }).join('') + '</ul>';
    }

    /* ------------------------------------------------------------ pintar */
    function poner(id, h, forzar) { var b = $(id); if (b && (forzar || b.__h !== h)) { b.__h = h; b.innerHTML = h; } }
    function pintar() {
        barra();
        var V = vista(); if (!V || !V.classList.contains('active')) return;
        var D = datos(); if (!D) return;
        if (!estructura()) return;
        poner('gedHero', hero(D));
        poner('gedKpis', kpis(D));
        poner('gedCursos', cursos(D));
        poner('gedCal', calendario(D));
        poner('gedProg', progreso(D));
        poner('gedProx', proximas(D));
        poner('gedNotas', notasRecientes(D));
        poner('gedAct', actividad(D));
        quices(D.u, programar);
    }
    var pend = false;
    function programar() { if (pend) return; pend = true; setTimeout(function () { pend = false; pintar(); }, 120); }

    function iniciar() {
        var M = $('pantallaEstudiante'); if (!M) return;
        var V = vista();
        /* Solo se reacciona a cambios reales (vista activada o pantalla mostrada), nunca a cualquier
           cambio de atributos: así no se crean ciclos con otros módulos que también observan el aula.
           Nunca se modifica el DOM dentro del callback: todo pasa por programar(). */
        var vActiva = false, mVisible = false;
        if (V && global.MutationObserver) new MutationObserver(function () {
            var a = V.classList.contains('active'); if (a !== vActiva) { vActiva = a; if (a) programar(); }
        }).observe(V, { attributes: true, attributeFilter: ['class'] });
        if (global.MutationObserver) new MutationObserver(function () {
            var v = M.style.display !== 'none'; if (v !== mVisible) { mVisible = v; if (v) programar(); }
        }).observe(M, { attributes: true, attributeFilter: ['style', 'class'] });
        ['geometrics-perfil-actualizado', 'geometrics-users-updated', 'gm-verified-changed', 'storage'].forEach(function (n) { global.addEventListener(n, programar); });
        setInterval(function () { if (M.style.display !== 'none' && vista() && vista().classList.contains('active')) programar(); }, 20000);
        programar();
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar); else iniciar();
    global.GeoEstudianteDash = { pintar: pintar };
})(window);
