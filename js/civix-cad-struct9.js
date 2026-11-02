/**
 * Civix CAD — UNIDADES: todo en METROS y varillas en PULGADAS.
 * Envuelve cada diseño estructural: escala el dibujo de mm a m (INSUNITS = metros), convierte textos, cotas,
 * memoria y cuadro de acero (Ø#5 → 5/8"), y usa «longitud» en lugar de «luz». Se carga al final.
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || !CAD.struct || !CAD.struct._h || !CAD.struct._h.U || CAD.struct.__v9) return; var S = CAD.struct; S.__v9 = true; var U = S._h.U;
    var fmtM = U.fmtM, UNIT_AFTER = '(?! ?(?:kN|MPa|kPa|kg|°|%|un\\b|m\\b|m²|m³|mm))';
    function txt(s, drawing, layer) {
        s = U.barTxt(U.luzTxt(String(s)));
        s = s.replace(/\(mm\)/g, '(m)').replace(/\ben mm\b/g, 'en m').replace(/\bsecci[oó]n en m\b/g, 'secciones en m');
        s = s.replace(/(\d+(?:\.\d+)?)\s*[×x]\s*(\d+(?:\.\d+)?)(?:\s*[×x]\s*(\d+(?:\.\d+)?))?\s*mm(?![²³\/])/g, function (m, a, b, c) { return fmtM(+a) + ' × ' + fmtM(+b) + (c ? ' × ' + fmtM(+c) : '') + ' m'; });
        s = s.replace(/(\d+(?:\.\d+)?)\s*mm(?![²³\/])/g, function (m, a) { return fmtM(+a) + ' m'; });
        s = s.replace(/@ ?(\d+(?:\.\d+)?)(?![\d.])(?! ?m\b)/g, function (m, a) { return +a >= 20 ? '@ ' + fmtM(+a) + ' m' : m; });
        if (drawing) {
            s = s.replace(/\d{2,5}(?:\s*×\s*\d{2,5}(?![\d.]))+/g, function (m) { return m.split(/\s*×\s*/).map(function (v) { return fmtM(+v); }).join(' × '); });
            s = s.replace(/(\d{3,5}) \+ 2×(\d{2,4})(?![\d.])/g, function (m, a, b) { return fmtM(+a) + ' + 2×' + fmtM(+b); });
            s = s.replace(/Ø(\d{3,4})(?![\d.\/"])/g, function (m, a) { return 'Ø' + fmtM(+a); });
            s = s.replace(new RegExp('= ?(\\d{2,6})(?![\\d.,])' + UNIT_AFTER, 'g'), function (m, a) { return '= ' + fmtM(+a); });
            s = s.replace(/\b(traslapo|ext\.|llave|puntera|talón|calzada|ancho total|ancho|espesor|lo|zapata|dado|hz|base|altura|vástago|banda) (\d{2,6})(?![\d.,])(?! ?(?:kN|MPa|kPa|kg|°|%|m\b))/gi, function (m, w, a) { return w + ' ' + fmtM(+a); });
            if (layer === 'COTAS') s = s.replace(new RegExp('(^|\\s)(\\d{2,6})(?![\\d.,])' + UNIT_AFTER, 'g'), function (m, p, a) { return p + fmtM(+a); });
        }
        return U.barTxt(s);
    }
    function scaleModel(model) {
        var k = 0.001;
        model.ents.forEach(function (e) {
            if (e.t === 'poly') e.pts.forEach(function (p) { p[0] *= k; p[1] *= k; if (p[2]) p[2] *= k; });
            else if (e.t === 'circle') { e.c[0] *= k; e.c[1] *= k; e.r *= k; }
            else if (e.t === 'text') { e.p[0] *= k; e.p[1] *= k; e.h *= k; e.s = e.s.map(function (l) { return txt(l, true, e.layer); }); }
        });
        model.units = 6; model.bbox = CAD.bboxOf(model.ents);
    }
    function convert(r) {
        if (!r || !r.ok || r.__units) return r; r.__units = true;
        if (r.model && !r.model.__m) { scaleModel(r.model); r.model.__m = true; }
        if (r.memo) r.memo = r.memo.map(function (l) { return txt(l, false); });
        if (r.warns) r.warns = r.warns.map(function (l) { return txt(l, false); });
        if (r.bom && r.bom.head && !r.bom.__u) { var cv = U.bomForTable(r.bom.head, r.bom.rows.map(function (q) { return q.map(function (c) { return typeof c === 'number' ? c : c; }); })); r.bom = { head: cv.head, rows: cv.rows.map(function (q) { return q.map(function (c) { return c !== '' && isFinite(+c) && /^-?\d+(\.\d+)?$/.test(c) ? +c : c; }); }), __u: true }; }
        if (r.qty && r.qty.items) r.qty.items = r.qty.items.map(function (q) { return q.map(function (c) { return U.barTxt(c); }); });
        return r;
    }
    Object.keys(S).forEach(function (k) {
        var f0 = S[k]; if (typeof f0 !== 'function' || k[0] === '_' || /^(lamina|memoPDF)$/.test(k)) return;
        S[k] = function (o) { var r = f0.apply(this, arguments); try { return convert(r); } catch (e) { try { console.warn('CivixCAD unidades', k, e); } catch (e2) { } return r; } };
    });
    S.__units = { txt: txt };
})(typeof window !== 'undefined' ? window : globalThis);
