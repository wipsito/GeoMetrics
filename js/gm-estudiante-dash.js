/* GeoMetrics — Dashboard del estudiante (vista «Inicio» del aula, renombrada «Panel»).
 *
 * Se monta sobre lo existente sin reemplazarlo:
 *   - aula-virtual.js sigue manejando la navegación (data-av-view) y llama a renderHome().
 *   - gm-estudiante-panel.js sigue pintando los indicadores (#avHomeStats), la agenda (#avHomePendientes)
 *     y los laboratorios (#avHomeLabs). Aquí solo se reubican dentro de la nueva distribución.
 * Este módulo agrega: encabezado de perfil (con GeoMetrics Verified), «Mis cursos» (docente real, pendientes,
 * próxima actividad y avance), «Notas recientes», «Mi progreso», «Actividad reciente» y acceso a Civix;
 * además ordena la barra lateral y añade «Perfil» y «Configuración».
 * Todo sale de los datos reales del estudiante (tareas, entregas, quices de Firebase, materiales, usuarios).
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
        user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
        gear: SV('<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>'),
        dash: SV('<rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>'),
        cap: SV('<path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'),
        mail: SV('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>'),
        pin: SV('<path d="M12 21s-7-6.3-7-12a7 7 0 0 1 14 0c0 5.7-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>'),
        group: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.2 2.4 3.5 5.5"/>'),
        layer: SV('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>'),
        pen: SV('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>'),
        eye: SV('<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
        arrow: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'),
        book: SV('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
        beam: SV('<path d="M3 7h18M3 17h18M7 7v10M17 7v10M7 7l10 10M17 7 7 17"/>'),
        flask: SV('<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/>'),
        grid: SV('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
        star: SV('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
        chart: SV('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
        hist: SV('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'),
        bot: SV('<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M8 14h.01M16 14h.01M9 18h6"/>'),
        task: SV('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="m8 12 3 3 5-6"/>'),
        quiz: SV('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 3v2h6V3M9 11h6M9 15h4"/>'),
        file: SV('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>'),
        cal: SV('<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>')
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
        if (h < 1) return 'hace minutos'; if (h < 24) return 'hace ' + h + ' h';
        var dd = Math.floor(h / 24); return dd === 1 ? 'ayer' : 'hace ' + dd + ' días';
    }
    function falta(t) {
        var d = t - Date.now();
        if (d < 0) return 'Vencida';
        var h = Math.floor(d / 36e5); if (h < 24) return 'Faltan ' + h + ' h';
        var dd = Math.ceil(d / DAY); return dd === 1 ? 'Mañana' : 'En ' + dd + ' días';
    }
    function materias(u) {
        var out = [];
        try { (aulaMateriasUsuario(u) || []).forEach(function (m) { if (m && m.nombre) out.push({ nombre: m.nombre, grupo: m.grupo || ((m.grupos || [])[0]) || '' }); }); } catch (e) {}
        return out;
    }
    /* Docente real de la materia y grupo: el docente registrado o, si no, quien publica tareas allí */
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
        var mats = load('presentaciones').filter(function (p) { return ve(u, p); });
        return { u: u, tareas: tareas, mias: mias, porTarea: porTarea, mats: materias(u), users: load('users'), materiales: mats, quices: Q.lista || [] };
    }

    /* ------------------------------------------------------------ barra lateral */
    function barra() {
        var nav = doc.querySelector('#pantallaEstudiante .av-nav'); if (!nav) return;
        var etiqueta = function (b, txt) {
            var t = [].slice.call(b.childNodes).filter(function (n) { return n.nodeType === 3 && n.textContent.trim(); })[0];
            if (t) { if (t.textContent !== txt) t.textContent = txt; } else if (!b.querySelector('.ged-lab')) b.appendChild(el('span', 'ged-lab', esc(txt)));
            b.title = b.getAttribute('data-ged-title') || txt;
        };
        var ini = nav.querySelector('[data-av-view="inicio"]'); if (ini) { ini.setAttribute('data-ged-title', 'Panel del estudiante'); etiqueta(ini, 'Panel'); }
        var notas = nav.querySelector('[data-av-view="calificaciones"]'); if (notas) { notas.setAttribute('data-ged-title', 'Calificaciones'); }
        var add = function (view, txt, ico, after) {
            if (nav.querySelector('[data-av-view="' + view + '"]')) return;
            var b = el('button', '', '<span class="av-ico">' + ico + '</span>' + esc(txt));
            b.type = 'button'; b.setAttribute('data-av-view', view); b.title = view === 'perfil' ? 'Mi perfil' : 'Configuración';
            var ref = after && nav.querySelector('[data-av-view="' + after + '"]');
            if (ref) nav.insertBefore(b, ref.nextSibling); else nav.appendChild(b);
        };
        add('perfil', 'Perfil', IC.user, 'inicio');
        add('config', 'Config.', IC.gear, null);
    }
    /* «Configuración» abre la pestaña de preferencias del perfil (no se crea un módulo duplicado) */
    doc.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('#pantallaEstudiante .av-nav [data-av-view="config"]');
        if (!b) return;
        e.preventDefault(); e.stopPropagation();
        try { aulaAbrirPerfil(); if (typeof aulaPerfilSetTab === 'function') aulaPerfilSetTab('prefs'); } catch (ex) {}
    }, true);

    /* ------------------------------------------------------------ estructura del panel */
    function vista() { return doc.querySelector('#pantallaEstudiante .av-view[data-av-view="inicio"]'); }
    function estructura() {
        var V = vista(); if (!V) return null;
        V.classList.add('ged-on');
        var root = $('gedRoot');
        if (!root) {
            root = el('div', 'ged'); root.id = 'gedRoot';
            root.innerHTML =
                '<section class="ged-hero" id="gedHero" aria-label="Tu perfil"></section>' +
                '<div class="ged-kpis-slot"></div>' +
                '<div class="ged-row ged-row-a">' +
                    '<section class="ged-card ged-cursos"><header>' + IC.book + '<h3>Mis cursos</h3><button type="button" class="ged-link" data-av-view="cursos">Ver todos ' + IC.arrow + '</button></header><div id="gedCursos"></div></section>' +
                    '<section class="ged-card ged-prox"><header>' + IC.cal + '<h3>Próximas actividades</h3><button type="button" class="ged-link" data-av-view="calendario">Calendario ' + IC.arrow + '</button></header><div class="ged-prox-slot"></div></section>' +
                '</div>' +
                '<div class="ged-row ged-row-b">' +
                    '<section class="ged-card ged-notas"><header>' + IC.star + '<h3>Notas recientes</h3><button type="button" class="ged-link" data-av-view="calificaciones">Historial ' + IC.arrow + '</button></header><div id="gedNotas"></div></section>' +
                    '<section class="ged-card ged-prog"><header>' + IC.chart + '<h3>Mi progreso</h3></header><div id="gedProg"></div></section>' +
                    '<section class="ged-card ged-act"><header>' + IC.hist + '<h3>Actividad reciente</h3></header><div id="gedAct"></div></section>' +
                '</div>' +
                '<section class="ged-civix"><span class="ged-civix-ico">' + IC.bot + '</span><div><b>Civix, tu asistente de Ingeniería Civil</b>' +
                    '<small>Pregúntale por fórmulas, conversión de unidades, ensayos de laboratorio o planos CAD. Conserva tu historial de conversaciones.</small></div>' +
                    '<button type="button" class="ged-btn" data-ged-civix>Abrir Civix ' + IC.arrow + '</button></section>' +
                '<div class="ged-labs-slot"></div>';
            V.insertBefore(root, V.firstChild);
            root.addEventListener('click', clic);
        }
        /* reubicar los bloques que pinta gm-estudiante-panel.js (mismos ids, mismo comportamiento) */
        var mover = function (id, slot) { var x = $(id), s = root.querySelector(slot); if (x && s && x.parentNode !== s) s.appendChild(x); };
        mover('avHomeStats', '.ged-kpis-slot');
        mover('avHomePendientes', '.ged-prox-slot');
        mover('avHomeLabs', '.ged-labs-slot');
        return root;
    }
    function clic(e) {
        if (e.target.closest('[data-ged-perfil]')) { try { aulaAbrirPerfil(); } catch (ex) {} return; }
        if (e.target.closest('[data-ged-civix]')) { try { if (typeof abrirCivixModal === 'function') abrirCivixModal(); else { var b = $('btnAsistenteAI'); if (b) b.click(); } } catch (ex) {} return; }
        var cod = e.target.closest('[data-ged-cod]');
        if (cod) { var s = cod.parentNode.querySelector('.ged-cod-v'); var oculto = s.getAttribute('data-oculto') === '1'; s.textContent = oculto ? s.getAttribute('data-v') : '••••' + s.getAttribute('data-v').slice(-3); s.setAttribute('data-oculto', oculto ? '0' : '1'); cod.setAttribute('aria-pressed', oculto ? 'true' : 'false'); return; }
        var c = e.target.closest('[data-ged-chat]');
        if (c && global.GMChatCon) { GMChatCon(c.getAttribute('data-ged-chat'), 'estudiante'); }
    }

    /* ------------------------------------------------------------ encabezado de perfil */
    function linea(ico, txt) { return txt ? '<span class="ged-li">' + ico + '<span>' + txt + '</span></span>' : ''; }
    function hero(D) {
        var u = D.u, nombre = typeof aulaNombreRegistro === 'function' ? aulaNombreRegistro(u) : u.nombre;
        var foto = typeof aulaFotoUsuario === 'function' ? aulaFotoUsuario(u) : u.foto;
        var p = nombre.split(/\s+/), ini = ((p[0] || 'E')[0] + (p.length > 1 ? p[p.length >= 4 ? 2 : 1][0] : '')).toUpperCase();
        var grupos = D.mats.map(function (m) { return m.grupo; }).filter(Boolean).filter(function (g, i, a) { return a.indexOf(g) === i; });
        /* Código: oculto por defecto (privacidad); solo se ve si el estudiante lo pide aquí mismo */
        var cod = u.codigo && u.mostrarCodigo !== false ? '<span class="ged-li">' + IC.cap + '<span>Código <b class="ged-cod-v" data-oculto="1" data-v="' + esc(u.codigo) + '">••••' + esc(String(u.codigo).slice(-3)) + '</b></span>' +
            '<button type="button" class="ged-eye" data-ged-cod aria-pressed="false" title="Mostrar u ocultar el código">' + IC.eye + '</button></span>' : '';
        return '<svg class="ged-hero-bg" viewBox="0 0 1200 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true">' +
            '<defs><linearGradient id="gedSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050912"/><stop offset="1" stop-color="#0b2a55"/></linearGradient>' +
            '<linearGradient id="gedFade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#050912" stop-opacity=".97"/><stop offset=".5" stop-color="#050912" stop-opacity=".78"/><stop offset="1" stop-color="#050912" stop-opacity=".2"/></linearGradient></defs>' +
            '<rect width="1200" height="300" fill="url(#gedSky)"/>' +
            '<g fill="none" stroke="#22d3ee" stroke-opacity=".5" stroke-width="2"><path d="M520 230h680"/><path d="M560 230c80-120 200-120 280 0M840 230c80-120 200-120 280 0" stroke-width="3"/>' +
            '<path d="M600 230v-70M640 230v-104M680 230v-118M720 230v-104M760 230v-70M880 230v-70M920 230v-104M960 230v-118M1000 230v-104M1040 230v-70" stroke-opacity=".3" stroke-width="1.4"/></g>' +
            '<g fill="none" stroke="#2dd4bf" stroke-opacity=".28" stroke-width="1.3"><path d="M480 300l120-70h600"/><path d="M420 300l150-82"/><path d="M640 266h40M760 266h40M880 266h40M1000 266h40" stroke-width="3"/></g>' +
            '<g stroke="#a78bfa" stroke-opacity=".3" fill="none" stroke-width="2"><path d="M430 230V110h70v120M430 150h70M430 190h70M465 110v120"/></g>' +
            '<rect width="1200" height="300" fill="url(#gedFade)"/></svg>' +
            '<div class="ged-hero-in">' +
                '<div class="ged-foto">' + (foto ? '<img src="' + esc(foto) + '" alt="Foto de ' + esc(nombre) + '">' : '<span>' + esc(ini) + '</span>') + '</div>' +
                '<div class="ged-hero-t">' +
                    '<small class="ged-eye-l">Estudiante · Ingeniería Civil</small>' +
                    '<h2><span>' + esc(nombre) + '</span>' + (global.GMV ? GMV.slot(u.email, 'm') : '') + '</h2>' +
                    '<div class="ged-lis">' +
                        linea(IC.cap, esc(u.programa || 'Programa de Ingeniería Civil')) +
                        linea(IC.layer, u.semestre ? 'Semestre ' + esc(u.semestre) : '') +
                        linea(IC.group, grupos.length ? (grupos.length === 1 ? 'Grupo ' : 'Grupos ') + esc(grupos.join(', ')) : '') +
                        linea(IC.pin, 'Universidad de Pamplona') +
                        linea(IC.mail, esc(u.email || '')) + cod +
                    '</div>' +
                    (u.bio && u.mostrarBio !== false ? '<p class="ged-frase">“' + esc(u.bio) + '”</p>' : '') +
                '</div>' +
                '<button type="button" class="ged-edit" data-ged-perfil>' + IC.pen + 'Mi perfil</button>' +
            '</div>';
    }

    /* ------------------------------------------------------------ tarjetas */
    function icoMat(n) {
        n = low(n);
        if (/suelos ii/.test(n)) return [IC.layer, '#38bdf8'];
        if (/suelo/.test(n)) return [IC.layer, '#22d3ee'];
        if (/resist/.test(n)) return [IC.beam, '#f59e0b'];
        if (/mezcl/.test(n)) return [IC.flask, '#a78bfa'];
        if (/estruct/.test(n)) return [IC.grid, '#f472b6'];
        return [IC.book, '#94a3b8'];
    }
    function cursos(D) {
        if (!D.mats.length) return '<p class="ged-empty">Aún no tienes asignaturas vinculadas. Agrégalas en tu perfil con la materia y el grupo en que estás matriculado.</p>';
        var ahora = Date.now();
        return '<div class="ged-cur-grid">' + D.mats.map(function (m) {
            var ic = icoMat(m.nombre), doc_ = docenteDe(m, D.users, D.tareas);
            var ts_ = D.tareas.filter(function (t) { return low(t.materia) === low(m.nombre); });
            var hechas = ts_.filter(function (t) { return D.porTarea[t.id]; }).length;
            var pend = ts_.filter(function (t) { return !D.porTarea[t.id]; });
            var prox = pend.map(function (t) { return { t: t, l: limite(t) }; }).filter(function (x) { return x.l && x.l >= ahora; }).sort(function (a, b) { return a.l - b.l; })[0];
            var pct = ts_.length ? Math.round(hechas * 100 / ts_.length) : null;
            return '<article class="ged-cur" style="--c:' + ic[1] + '">' +
                '<div class="ged-cur-h"><span class="ged-cur-ico">' + ic[0] + '</span><div><b>' + esc(m.nombre) + '</b>' +
                    '<small>' + (m.grupo ? 'Grupo ' + esc(m.grupo) : 'Sin grupo') + (doc_ ? ' · ' + esc(doc_.nombre) : '') + '</small>' +
                    (doc_ && doc_.email && global.GMV ? GMV.slot(doc_.email, 'xs') : '') + '</div></div>' +
                '<div class="ged-cur-bar" title="Tareas entregadas"><i style="width:' + (pct || 0) + '%"></i></div>' +
                '<div class="ged-cur-meta"><span>' + (pct == null ? 'Sin tareas publicadas' : hechas + ' de ' + ts_.length + ' tareas entregadas') + '</span>' +
                    (pend.length ? '<span class="ged-pill warn">' + pend.length + ' pendiente' + (pend.length === 1 ? '' : 's') + '</span>' : '') + '</div>' +
                (prox ? '<p class="ged-cur-next">Próxima: <b>' + esc(prox.t.titulo) + '</b> · ' + esc(fecha(prox.l, { weekday: 'short', day: 'numeric', month: 'short' })) + '</p>' : '') +
                '<div class="ged-cur-act"><button type="button" class="ged-mini" data-av-view="tareas">Tareas</button><button type="button" class="ged-mini" data-av-view="recursos">Materiales</button>' +
                    (doc_ && doc_.email ? '<button type="button" class="ged-mini" data-ged-chat="' + esc(doc_.email) + '">Escribir al docente</button>' : '') + '</div>' +
            '</article>';
        }).join('') + '</div>';
    }
    function notasRecientes(D) {
        var l = [];
        D.mias.forEach(function (e) {
            var n = nota(e); if (n === null) return;
            var t = D.tareas.filter(function (x) { return x.id === e.tareaId; })[0] || {};
            l.push({ m: t.materia || e.materia || '', a: t.titulo || 'Tarea', n: n, at: ts(e.calificadaEn) || ts(e.fecha), tipo: 'Tarea', fb: e.comentarioDocente || e.retro || '' });
        });
        D.quices.forEach(function (q) {
            var g = notaQuiz(q); if (!g) return;
            l.push({ m: q.meta.materia || '', a: q.meta.title || 'Quiz', n: g.nota, at: g.at, tipo: 'Quiz' });
        });
        var pendientes = D.mias.filter(function (e) { return nota(e) === null; }).length;
        l.sort(function (a, b) { return b.at - a.at; });
        if (!l.length) return '<p class="ged-empty">Aún no tienes notas publicadas.' + (pendientes ? ' Tienes ' + pendientes + ' entrega' + (pendientes === 1 ? '' : 's') + ' en revisión.' : '') + '</p>';
        return '<ul class="ged-notas-l">' + l.slice(0, 5).map(function (x) {
            var c = x.n >= 4 ? 'good' : x.n >= 3 ? 'warn' : 'bad';
            return '<li><span class="ged-nota ' + c + '">' + n1(x.n) + '</span><div><b>' + esc(x.a) + '</b><small>' + esc(x.m) + ' · ' + x.tipo + ' · ' + esc(fecha(x.at)) + '</small></div>' +
                '<span class="ged-pill ' + c + '">' + (x.n >= 3 ? 'Aprobada' : 'Reprobada') + '</span></li>';
        }).join('') + '</ul>' + (pendientes ? '<p class="ged-nota-p">' + pendientes + ' entrega' + (pendientes === 1 ? '' : 's') + ' en revisión por el docente.</p>' : '');
    }
    function progreso(D) {
        var ahora = Date.now();
        var totalT = D.tareas.length, hechasT = D.tareas.filter(function (t) { return D.porTarea[t.id]; }).length;
        var cerradosQ = D.quices.filter(function (q) { return q.st && q.st.code !== 'soon'; });
        var hechosQ = cerradosQ.filter(function (q) { return q.st && /graded|submitted/.test(q.st.code); }).length;
        var total = totalT + cerradosQ.length, hechas = hechasT + hechosQ;
        var vencidas = D.tareas.filter(function (t) { var l = limite(t); return !D.porTarea[t.id] && l && l < ahora; }).length;
        var ns = D.mias.map(nota).filter(function (n) { return n !== null; });
        D.quices.forEach(function (q) { var g = notaQuiz(q); if (g) ns.push(g.nota); });
        var prom = ns.length ? ns.reduce(function (a, b) { return a + b; }, 0) / ns.length : null;
        var pct = total ? Math.round(hechas * 100 / total) : null;
        var R = 40, C = 2 * Math.PI * R;
        return '<div class="ged-prog-top">' +
            '<div class="ged-prog-ring"><svg viewBox="0 0 100 100" aria-label="Actividades completadas ' + (pct || 0) + '%"><circle cx="50" cy="50" r="' + R + '" class="bg"/><circle cx="50" cy="50" r="' + R + '" class="fg" stroke-dasharray="' + (C * (pct || 0) / 100).toFixed(1) + ' ' + C.toFixed(1) + '"/></svg><b>' + (pct == null ? '—' : pct + '%') + '</b></div>' +
            '<div><span class="ged-prog-l">Actividades completadas</span><b class="ged-prog-v">' + hechas + ' de ' + total + '</b><small>Tareas entregadas y quices presentados</small></div></div>' +
            '<div class="ged-prog-rows">' +
                '<div><span>Promedio académico</span><b class="' + (prom == null ? '' : prom >= 3 ? 'good' : 'bad') + '">' + (prom == null ? '—' : n1(prom) + ' / 5,0') + '</b></div>' +
                '<div><span>Asignaturas en curso</span><b>' + D.mats.length + '</b></div>' +
                '<div><span>Tareas vencidas sin entregar</span><b class="' + (vencidas ? 'bad' : 'good') + '">' + vencidas + '</b></div>' +
            '</div>' +
            '<p class="ged-nota-p">El avance mide lo que has completado; el promedio mide tu rendimiento. Son indicadores distintos.</p>';
    }
    function actividad(D) {
        var ev = [], semana = Date.now() - 14 * DAY, ahora = Date.now();
        D.mias.forEach(function (e) {
            var t = D.tareas.filter(function (x) { return x.id === e.tareaId; })[0] || {};
            ev.push({ at: ts(e.fecha), i: IC.task, c: '#2dd4bf', t: 'Entregaste «' + (t.titulo || 'Tarea') + '»', s: t.materia || '' });
            if (nota(e) !== null && e.calificadaEn) ev.push({ at: ts(e.calificadaEn), i: IC.star, c: '#f59e0b', t: 'Nota publicada: ' + n1(nota(e)), s: t.titulo || '' });
        });
        D.tareas.forEach(function (t) { var c = ts(t.creada); if (c >= semana) ev.push({ at: c, i: IC.task, c: '#22d3ee', t: 'Nueva tarea: ' + (t.titulo || ''), s: t.materia || '' }); });
        D.materiales.forEach(function (p) { var c = ts(p.creada); if (c >= semana) ev.push({ at: c, i: IC.file, c: '#a78bfa', t: 'Nuevo material: ' + (p.titulo || ''), s: p.materia || '' }); });
        D.quices.forEach(function (q) {
            var m = q.meta || {};
            if (m.publishAt && m.publishAt >= semana && m.publishAt <= ahora) ev.push({ at: m.publishAt, i: IC.quiz, c: '#a78bfa', t: 'Quiz publicado: ' + (m.title || ''), s: m.materia || '' });
            Object.keys(q.attempts || {}).forEach(function (n) { var a = q.attempts[n]; if (a && a.submittedAt) ev.push({ at: a.submittedAt, i: IC.quiz, c: '#2dd4bf', t: 'Presentaste «' + (m.title || 'Quiz') + '»', s: m.materia || '' }); });
        });
        ev = ev.filter(function (x) { return x.at; }).sort(function (a, b) { return b.at - a.at; }).slice(0, 6);
        if (!ev.length) return '<p class="ged-empty">Sin actividad reciente. Tus entregas, notas y materiales nuevos aparecerán aquí.</p>';
        return '<ul class="ged-act-l">' + ev.map(function (x) {
            return '<li style="--c:' + x.c + '"><span class="ged-act-i">' + x.i + '</span><div><b>' + esc(x.t) + '</b><small>' + esc(x.s) + '</small></div><time>' + esc(hace(x.at)) + '</time></li>';
        }).join('') + '</ul>';
    }

    /* ------------------------------------------------------------ pintar */
    function poner(id, h) { var b = $(id); if (b && b.__h !== h) { b.__h = h; b.innerHTML = h; } }
    function pintar() {
        barra();
        var V = vista(); if (!V || !V.classList.contains('active')) return;
        var D = datos(); if (!D) return;
        if (!estructura()) return;
        poner('gedHero', hero(D));
        poner('gedCursos', cursos(D));
        poner('gedNotas', notasRecientes(D));
        poner('gedProg', progreso(D));
        poner('gedAct', actividad(D));
        quices(D.u, programar);
    }
    var pend = false;
    function programar() { if (pend) return; pend = true; setTimeout(function () { pend = false; pintar(); }, 120); }
    function iniciar() {
        var M = $('pantallaEstudiante'); if (!M) return;
        barra();
        var V = vista();
        if (V && global.MutationObserver) new MutationObserver(programar).observe(V, { attributes: true, attributeFilter: ['class'] });
        if (global.MutationObserver) new MutationObserver(function () { if (M.style.display !== 'none') { barra(); programar(); } }).observe(M, { attributes: true, attributeFilter: ['style', 'class'] });
        ['geometrics-perfil-actualizado', 'geometrics-users-updated', 'gm-verified-changed', 'storage'].forEach(function (n) { global.addEventListener(n, programar); });
        setInterval(function () { if (M.style.display !== 'none' && vista() && vista().classList.contains('active')) programar(); }, 20000);
        programar();
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar); else iniciar();
    global.GeoEstudianteDash = { pintar: pintar };
})(window);
