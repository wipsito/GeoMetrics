/* GeoMetrics — Encabezado profesional del docente (dashboard del panel docente).
 * Muestra solo datos reales del perfil (users/{correo} vía sesión y lista de usuarios):
 * foto, nombre de registro, distintivo GeoMetrics Verified (de verified/), título, posgrado,
 * departamento, correo, biografía (si el docente la tiene visible) y botón «Editar perfil».
 * Los campos vacíos no se inventan: se omiten o se invita a completarlos.
 */
(function (global) {
    var doc = global.document;
    function $(id) { return doc.getElementById(id); }
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

    /* Ilustración original (SVG) de ingeniería civil: curvas topográficas, puente atirantado,
       pórtico de un edificio en construcción y grúa torre. */
    var FONDO = '<svg class="gdp-bg" viewBox="0 0 1200 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">' +
        '<defs><linearGradient id="gdpSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b2a55"/><stop offset=".6" stop-color="#1264C5"/><stop offset="1" stop-color="#2588F5"/></linearGradient>' +
        '<linearGradient id="gdpFade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#07182F" stop-opacity=".96"/><stop offset=".45" stop-color="#07182F" stop-opacity=".82"/><stop offset="1" stop-color="#07182F" stop-opacity=".25"/></linearGradient></defs>' +
        '<rect width="1200" height="320" fill="url(#gdpSky)"/>' +
        /* curvas de nivel */
        '<g fill="none" stroke="#49C6F5" stroke-opacity=".22" stroke-width="1.4">' +
        '<path d="M520 300c60-40 140-60 230-48s170 10 250-30 140-60 200-52"/><path d="M540 320c70-44 150-62 240-50s170 6 250-34 140-58 170-52"/>' +
        '<path d="M500 278c60-38 140-58 230-46s170 12 250-28 150-62 220-54"/><path d="M480 256c60-36 140-56 230-44s170 14 250-26 160-64 240-56"/></g>' +
        /* puente atirantado */
        '<g stroke="#cfe9ff" stroke-opacity=".75" fill="none" stroke-width="2">' +
        '<path d="M560 236h640"/><path d="M560 244h640" stroke-opacity=".35"/>' +
        '<path d="M760 236V96M1010 236V96" stroke-width="6" stroke-opacity=".9"/>' +
        '<path d="M760 104 600 236M760 104 640 236M760 104 680 236M760 104 720 236M760 104 800 236M760 104 840 236M760 104 880 236M760 104 920 236" stroke-width="1.2"/>' +
        '<path d="M1010 104 850 236M1010 104 890 236M1010 104 930 236M1010 104 970 236M1010 104 1050 236M1010 104 1090 236M1010 104 1130 236M1010 104 1170 236" stroke-width="1.2"/></g>' +
        /* pórtico de edificio */
        '<g stroke="#9fd6ff" stroke-opacity=".55" stroke-width="3" fill="none">' +
        '<path d="M380 236V120M440 236V120M500 236V120M380 120h120M380 159h120M380 198h120"/>' +
        '<path d="M380 159l60-39M440 159l60-39M380 198l60-39M440 198l60-39" stroke-width="1.4" stroke-opacity=".4"/></g>' +
        /* grúa torre */
        '<g stroke="#ffd27a" stroke-opacity=".55" fill="none" stroke-width="2.4">' +
        '<path d="M560 236V60M572 236V60M560 60h12"/><path d="M560 84l12-12M560 108l12-12M560 132l12-12M560 156l12-12M560 180l12-12M560 204l12-12" stroke-width="1"/>' +
        '<path d="M470 60h220M470 70h220" stroke-width="1.6"/><path d="M640 70v58" stroke-width="1"/><rect x="633" y="128" width="14" height="10" stroke-width="1.4"/></g>' +
        '<rect width="1200" height="320" fill="url(#gdpFade)"/></svg>';

    function sesion() {
        try {
            var u = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
            if (u && typeof aulaRegistroUsuario === 'function') u = aulaRegistroUsuario(u) || u;
            return u;
        } catch (e) { return null; }
    }
    function iniciales(n) { var p = String(n || '').split(/\s+/).filter(Boolean); return ((p[0] || 'D')[0] + (p.length > 1 ? p[p.length >= 4 ? 2 : 1][0] : '')).toUpperCase(); }
    function linea(ico, txt) { return txt ? '<span class="gdp-li">' + ico + esc(txt) + '</span>' : ''; }
    var IC = {
        cap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/></svg>',
        med: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/></svg>',
        dep: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 21h18M5 21V8l7-5 7 5v13M9 21v-6h6v6"/></svg>',
        mail: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
        pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>'
    };

    function pintar() {
        var panel = doc.querySelector('#pantallaDocente [data-dp-panel="dashboard"]');
        var u = sesion();
        if (!panel || !u || u.rol !== 'docente') return;
        var card = $('gdpHero');
        if (!card) {
            card = doc.createElement('section'); card.id = 'gdpHero'; card.className = 'gdp-hero'; card.setAttribute('aria-label', 'Perfil profesional del docente');
            var head = panel.querySelector(':scope > .dp-head');
            panel.insertBefore(card, head ? head.nextSibling : panel.firstChild);
            card.addEventListener('click', function (e) {
                if (e.target.closest('[data-gdp-edit]')) { try { if (typeof aulaAbrirPerfil === 'function') aulaAbrirPerfil(); } catch (ex) {} }
            });
        }
        var nombre = typeof aulaNombreRegistro === 'function' ? aulaNombreRegistro(u) : (u.nombre || '');
        var foto = typeof aulaFotoUsuario === 'function' ? aulaFotoUsuario(u) : (u.foto || '');
        var bioVisible = u.mostrarBio !== false;
        var posgrado = u.posgrado || u.especializacion || '';
        var falta = !u.titulo && !u.departamento && !u.bio;
        var h = FONDO +
            '<div class="gdp-in">' +
                '<div class="gdp-foto">' + (foto ? '<img src="' + esc(foto) + '" alt="Foto de ' + esc(nombre) + '">' : '<span>' + esc(iniciales(nombre)) + '</span>') + '</div>' +
                '<div class="gdp-txt">' +
                    '<small class="gdp-eye">Docente · Ingeniería Civil</small>' +
                    '<h2><span class="gdp-nom">' + esc(nombre) + '</span>' + (global.GMV ? GMV.slot(u.email, 'm') : '') + '</h2>' +
                    '<div class="gdp-lis">' + linea(IC.cap, u.titulo) + linea(IC.med, posgrado) + linea(IC.dep, u.departamento) + linea(IC.mail, u.email) + '</div>' +
                    (bioVisible && u.bio ? '<p class="gdp-bio">' + esc(u.bio) + '</p>' : '') +
                    (falta ? '<p class="gdp-falta">Completa tu título, departamento y biografía para presentar tu perfil profesional a tus estudiantes.</p>' : '') +
                '</div>' +
                '<button type="button" class="gdp-edit" data-gdp-edit>' + IC.pen + 'Editar perfil</button>' +
            '</div>';
        if (card.__h !== h) { card.__h = h; card.innerHTML = h; }
    }

    function iniciar() {
        var M = $('pantallaDocente');
        if (M && global.MutationObserver) new MutationObserver(function () { if (M.style.display !== 'none') pintar(); })
            .observe(M, { attributes: true, attributeFilter: ['style', 'class'] });
        global.addEventListener('geometrics-perfil-actualizado', pintar);
        global.addEventListener('geometrics-users-updated', pintar);
        global.addEventListener('gm-verified-changed', function () { var c = $('gdpHero'); if (c) { c.__h = ''; pintar(); } });
        pintar();
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar); else iniciar();
    global.GeoDocentePerfil = { pintar: pintar };
})(window);
