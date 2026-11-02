/* =========================================================
   GeoMetrics — Núcleo de la teoría ampliada
   TN_ADD(clave, secciones, { bib, refs })
   Inserta secciones nuevas en un módulo de teoría ya definido
   (teoria-ms1/ms2/rm/dm/est.js). Cada sección nueva puede traer
   `after: 'id'` para fijar su posición; si no, va antes de 'errores'.
   Debe cargarse después de los módulos y antes de teoria-normas.js.
   ========================================================= */
(function (global) {
    'use strict';
    global.TN_ADD = function (key, nuevas, opts) {
        var m = global.TN_MODULES && global.TN_MODULES[key];
        if (!m || !Array.isArray(m.sections)) return;
        opts = opts || {};
        (nuevas || []).forEach(function (s) {
            if (m.sections.some(function (x) { return x.id === s.id; })) return;
            var pos = -1;
            if (s.after) {
                m.sections.forEach(function (x, i) { if (x.id === s.after) pos = i + 1; });
            }
            if (pos < 0) {
                m.sections.forEach(function (x, i) { if (x.id === 'errores') pos = i; });
            }
            if (pos < 0) pos = m.sections.length;
            m.sections.splice(pos, 0, { id: s.id, title: s.title, html: s.html });
        });
        if (opts.bib) {
            m.bib = m.bib || [];
            opts.bib.forEach(function (b) { if (m.bib.indexOf(b) < 0) m.bib.push(b); });
        }
        (m.stats || []).forEach(function (st) {
            if (/secciones/i.test(st[1])) st[0] = String(m.sections.length);
        });
    };
})(window);
