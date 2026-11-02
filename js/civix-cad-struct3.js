/**
 * Civix CAD — Diseño estructural académico, bloque P0:
 *   vigaCont (2 y 3 tramos) · vigaT (T y L) · losa2d (dos direcciones) · zapataComb · zapataCorr
 *   despieceViga · despieceColumna
 *
 * TODO es EDUCATIVO: predimensionamiento y croquis técnicos basados en principios de ACI 318 / NSR-10.
 * NO sustituye el diseño completo firmado por un ingeniero.
 * Unidades de cálculo: kN, m, MPa (secciones en mm). Los dibujos DXF están en mm.
 * Cada función devuelve { ok, warns[], memo[], model, bom?, calc }.  model → CivixCAD.writeDXF(model).
 * Capas: EJES, CONTORNO, ARMADURA, COTAS, TEXTO, MARCO, SOMBRA.
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || !CAD.struct || CAD.struct.__v3) return; var S = CAD.struct; S.__v3 = true;
    var PI = Math.PI, SQ = Math.sqrt;
    var BARS = { 3: [9.5, 71], 4: [12.7, 129], 5: [15.9, 199], 6: [19.1, 284], 7: [22.2, 387], 8: [25.4, 510] };
    var AVISO = 'AVISO: predimensionamiento ACADÉMICO (principios de ACI 318 / NSR-10). NO sustituye el diseño completo firmado por un ingeniero estructural.';

    /* ------------------------------- utilidades ------------------------------- */
    function F(v, d) { return (+v).toFixed(d == null ? 0 : d); }
    function r5(v) { return Math.ceil(v / 0.05 - 1e-9) * 0.05; }
    function fl25(v) { return Math.max(25, Math.floor(v / 25 + 1e-9) * 25); }
    function beta1(fc) { return fc <= 28 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 28) / 7); }
    function wkg(no) { return 0.00617 * BARS[no][0] * BARS[no][0]; }
    function needAs(Mu, b, d, fc, fy) { // Mu en kN·m; b, d en mm  (φ = 0.90)
        var Rn = Mu * 1e6 / (0.9 * b * d * d), disc = 1 - 2 * Rn / (0.85 * fc), Amin = Math.max(0.25 * SQ(fc) / fy, 1.4 / fy) * b * d, rmax = 0.85 * beta1(fc) * fc / fy * 0.375;
        if (disc <= 0) return { ok: false, Areq: Infinity, As: Infinity, Amin: Amin, rho: NaN, rmax: rmax };
        var rho = 0.85 * fc / fy * (1 - SQ(disc)), Areq = rho * b * d;
        return { ok: rho <= rmax, Areq: Areq, As: Math.max(Areq, Amin), Amin: Amin, rho: rho, rmax: rmax };
    }
    function phiMn(As, b, d, fc, fy) { var a = As * fy / (0.85 * fc * b); return 0.9 * As * fy * (d - a / 2) / 1e6; }
    function pickBars(As, b, rec, dest) { // una capa; devuelve la primera combinación que cabe
        var order = [5, 6, 7, 8], i, last = null;
        for (i = 0; i < order.length; i++) { var no = order[i], db = BARS[no][0], Ab = BARS[no][1], n = Math.max(2, Math.ceil(As / Ab)), sc = (b - 2 * rec - 2 * dest - n * db) / (n - 1); last = { no: no, n: n, As: n * Ab, db: db, fit: sc >= Math.max(25, db), sc: sc }; if (last.fit) return last; }
        return last;
    }
    function pickRow(As, b, h, cover) { // armadura distribuida en ancho b (zapatas / losas)
        var order = [5, 6, 7, 8], i, sMax = Math.min(3 * h, 450), last;
        for (i = 0; i < order.length; i++) { var no = order[i], Ab = BARS[no][1], span = b - 2 * cover, nmin = Math.ceil(span / sMax) + 1, n = Math.max(Math.ceil(As / Ab), nmin, 2), s = span / (n - 1); last = { no: no, n: n, s: s, As: n * Ab }; if (s >= 100) return last; }
        return last;
    }
    function stir(Vu, b, d, fc, fy, dbl) { // Vu (kN) a d de la cara; estribos Ø#3 de 2 ramas
        var Vc = 0.17 * SQ(fc) * b * d / 1000, Av = 2 * BARS[3][1], Vs = Math.max(0, Vu / 0.75 - Vc), r = { Vc: Vc, phiVc: 0.75 * Vc, Vu: Vu, Vs: Vs, ok: true };
        var Vsmax = 0.66 * SQ(fc) * b * d / 1000; if (Vs > Vsmax) r.ok = false;
        var smaxA = Vs > 0.33 * SQ(fc) * b * d / 1000 ? Math.min(d / 4, 300) : Math.min(d / 2, 600), sAvmin = Av * fy / (Math.max(0.062 * SQ(fc), 0.35) * b), sCalc = Vs > 0 ? Av * fy * d / (Vs * 1000) : 1e9;
        r.sCalc = sCalc; r.sEnd = Math.max(75, fl25(Math.min(sCalc, d / 4, 150, 8 * dbl))); r.sMid = Math.max(r.sEnd, fl25(Math.min(sCalc, smaxA, sAvmin)));
        return r;
    }
    function userName() { try { var s = typeof aulaGetSession === 'function' && aulaGetSession(); return s ? (s.nombre || s.nombres || s.email || '') : ''; } catch (e) { return ''; } }
    function niceScale(mm) { var t = mm / 380, c = [5, 10, 20, 25, 50, 75, 100, 150, 200, 250, 500, 1000], i; for (i = 0; i < c.length; i++) if (c[i] >= t) return '1:' + c[i]; return '1:2000'; }

    /* --------------------------------- dibujo --------------------------------- */
    var LAY = { 'EJES': 6, 'CONTORNO': 7, 'ARMADURA': 1, 'COTAS': 4, 'TEXTO': 2, 'MARCO': 7, 'SOMBRA': 8 };
    function Draw(th) { this.th = th; this.ents = []; this.layers = {}; for (var k in LAY) this.layers[k] = { name: k, aci: LAY[k] }; }
    Draw.prototype = {
        line: function (x1, y1, x2, y2, ly, aci) { var e = { t: 'poly', layer: ly || 'CONTORNO', pts: [[x1, y1, 0], [x2, y2, 0]], closed: false }; if (aci) e.aci = aci; this.ents.push(e); },
        poly: function (pts, closed, ly, aci) { var e = { t: 'poly', layer: ly || 'CONTORNO', pts: pts.map(function (p) { return [p[0], p[1], 0]; }), closed: !!closed, keepPoly: true }; if (aci) e.aci = aci; this.ents.push(e); },
        rect: function (x, y, w, h, ly, aci) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, ly, aci); },
        circle: function (x, y, r, ly, aci) { var e = { t: 'circle', layer: ly || 'ARMADURA', c: [x, y, 0], r: r }; if (aci) e.aci = aci; this.ents.push(e); },
        text: function (x, y, s, o) { o = o || {}; var e = { t: 'text', layer: o.layer || 'TEXTO', p: [x, y, 0], h: o.h || this.th, s: String(s).split('\n'), rot: o.rot || 0, ha: o.ha || 0, va: o.va || 0 }; if (o.aci) e.aci = o.aci; this.ents.push(e); },
        hatch: function (x, y, w, h, step) { var k; for (k = step; k < w + h; k += step) { var xa = Math.min(k, w), ya = k - xa, xb = Math.max(0, k - h), yb = Math.min(k, h); this.line(x + xa, y + ya, x + xb, y + yb, 'SOMBRA'); } },
        dim: function (x1, y1, x2, y2, off, label) {
            var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, e = this.th * 0.5, k = this.th * 0.35, sg = off >= 0 ? 1 : -1, ax = x1 + nx * off, ay = y1 + ny * off, bx = x2 + nx * off, by = y2 + ny * off;
            this.line(x1 + nx * sg * this.th * 0.3, y1 + ny * sg * this.th * 0.3, ax + nx * sg * e, ay + ny * sg * e, 'COTAS'); this.line(x2 + nx * sg * this.th * 0.3, y2 + ny * sg * this.th * 0.3, bx + nx * sg * e, by + ny * sg * e, 'COTAS'); this.line(ax, ay, bx, by, 'COTAS');
            this.line(ax - ux * k - nx * k, ay - uy * k - ny * k, ax + ux * k + nx * k, ay + uy * k + ny * k, 'COTAS'); this.line(bx - ux * k - nx * k, by - uy * k - ny * k, bx + ux * k + nx * k, by + uy * k + ny * k, 'COTAS');
            var ang = Math.atan2(uy, ux); if (ang > PI / 2 + 1e-9 || ang < -PI / 2 - 1e-9) ang += PI; this.text((ax + bx) / 2 + nx * sg * this.th * 0.25, (ay + by) / 2 + ny * sg * this.th * 0.25, label == null ? F(L) : label, { layer: 'COTAS', ha: 1, va: sg > 0 ? 0 : 3, rot: ang });
        },
        balloon: function (x, y, n) { this.circle(x, y, this.th * 0.9, 'TEXTO'); this.text(x, y, n, { ha: 1, va: 2, h: this.th * 0.9 }); },
        table: function (x, y, head, rows, colw) { var cv = U.bomForTable(head, rows); head = cv.head; rows = cv.rows; // tabla con celdas (esquina superior izquierda en x,y; crece hacia abajo)
            var th = this.th, rh = th * 1.8, tw = colw.reduce(function (a, b) { return a + b; }, 0), all = [head].concat(rows), i, j, cx;
            for (i = 0; i <= all.length; i++) this.line(x, y - i * rh, x + tw, y - i * rh, 'MARCO');
            cx = x; for (j = 0; j <= colw.length; j++) { this.line(cx, y, cx, y - all.length * rh, 'MARCO'); cx += colw[j] || 0; }
            all.forEach(function (r, ri) { var xx = x; r.forEach(function (c, cj) { this.text(xx + th * 0.3, y - (ri + 1) * rh + rh * 0.3, String(c), { h: th * (ri === 0 ? 0.75 : 0.7), aci: ri === 0 ? 4 : 0 }); xx += colw[cj]; }, this); }, this);
            return y - all.length * rh;
        },
        /* sección rectangular con estribo y barras (bars: [{n,no,face:'bot'|'top'}]) */
        section: function (cx, cy, b, h, rec, dest, bot, top, label) {
            var th = this.th, db, x, i; this.rect(cx, cy, b, h, 'CONTORNO'); this.rect(cx + rec, cy + rec, b - 2 * rec, h - 2 * rec, 'ARMADURA', 3);
            function row(self, spec, y) { if (!spec) return; db = BARS[spec.no][0]; var x0 = cx + rec + dest + db / 2, x1 = cx + b - rec - dest - db / 2; for (i = 0; i < spec.n; i++) { x = spec.n === 1 ? (x0 + x1) / 2 : x0 + (x1 - x0) * i / (spec.n - 1); self.circle(x, y, db / 2, 'ARMADURA'); } }
            row(this, bot, cy + rec + dest + (bot ? BARS[bot.no][0] / 2 : 0)); row(this, top, cy + h - rec - dest - (top ? BARS[top.no][0] / 2 : 0));
            this.dim(cx, cy, cx + b, cy, -th * 1.8, 'b = ' + F(b)); this.dim(cx + b, cy, cx + b, cy + h, th * 1.8, 'h = ' + F(h)); this.text(cx + b / 2, cy + h + th * 1.2, label, { ha: 1, h: th * 1.05 });
        },
        model: function () { var m = { ents: this.ents, layers: this.layers, warn: [], units: 4, blocks: {} }; m.bbox = CAD.bboxOf(this.ents); return m; }
    };
    function bomRow(el, mk, no, n, Lmm) { return [mk, el, '#' + no + ' (Ø' + BARS[no][0] + ')', n, Math.round(Lmm), +(n * Lmm / 1000).toFixed(2), +(n * Lmm / 1000 * wkg(no)).toFixed(1)]; }
    var BOMH = ['Marca', 'Elemento', 'Barra', 'Cant.', 'Long. (mm)', 'Total (m)', 'Peso (kg)'];
    /* cierra el dibujo: tabla BOM + cajetín en capa MARCO */
    function finish(D, titulo, bom, info) {
        info = info || {};
        if (bom && bom.rows.length && !info.noTable) { var bb = CAD.bboxOf(D.ents), th = D.th; D.text(bb[0], bb[1] - th * 3, 'CUADRO DE ACERO (despiece)', { h: th * 1.1 }); D.table(bb[0], bb[1] - th * 4.2, bom.head, bom.rows.map(function (r) { return r.map(function (c) { return String(c); }); }), [th * 5, th * 14, th * 8, th * 5, th * 8, th * 7, th * 7]); }
        var m = D.model(); m.__tb = true; var bb2 = m.bbox || [0, 0, 1000, 1000], span = Math.max(bb2[2] - bb2[0], bb2[3] - bb2[1]);
        if (CAD.addTitleBlock) { CAD.addTitleBlock(m, { proyecto: 'GeoMetrics · Universidad de Pamplona · Ing. Civil', contenido: titulo, autor: info.autor != null ? info.autor : userName(), escala: niceScale(span) + ' (en hoja A3)', hoja: '1/1' }); m.ents.forEach(function (e) { if (e.layer === 'CAJETIN') e.layer = 'MARCO'; }); delete m.layers.CAJETIN; m.bbox = CAD.bboxOf(m.ents); }
        return m;
    }
    function fail(msg) { return { ok: false, warns: [msg], memo: [], model: null }; }
    function bomCheck(b) { return b; }
    var U = (function () {
        var FRAC = { 2: '1/4"', 3: '3/8"', 4: '1/2"', 5: '5/8"', 6: '3/4"', 7: '7/8"', 8: '1"', 9: '1 1/8"', 10: '1 1/4"', 11: '1 3/8"' };
        function fmtM(mm) { var t = (mm / 1000).toFixed(3); if (/0$/.test(t)) t = t.slice(0, -1); return t; }
        function barTxt(t) {
            return String(t).replace(/(#\d+) \((?:Ø)?\d+(?:\.\d+)?(?: ?mm)?\)/g, '$1').replace(/Ø#(\d+)/g, function (m, n) { return 'Ø' + (FRAC[n] || '#' + n); }).replace(/E#(\d+)/g, function (m, n) { return 'E ' + (FRAC[n] || '#' + n); }).replace(/#(\d+)(?!\d)/g, function (m, n) { return FRAC[n] || m; });
        }
        function luzTxt(t) { return String(t).replace(/\bluces\b/g, 'longitudes').replace(/\bLuces\b/g, 'Longitudes').replace(/\bLuz\b/g, 'Longitud').replace(/\bluz\b/g, 'longitud'); }
        function bomForTable(head, rows) {
            var im = -1; head.forEach(function (h, i) { if (/\(mm\)/.test(h)) im = i; });
            return { head: head.map(function (h) { return luzTxt(String(h).replace('(mm)', '(m)')); }), rows: rows.map(function (r) { return r.map(function (c, i) { c = String(c); if (i === im && c !== '' && isFinite(+c)) return fmtM(+c); return luzTxt(barTxt(c)); }); }) };
        }
        return { FRAC: FRAC, fmtM: fmtM, barTxt: barTxt, luzTxt: luzTxt, bomForTable: bomForTable };
    })();
    S._h = { U: U, BARS: BARS, F: F, r5: r5, fl25: fl25, beta1: beta1, wkg: wkg, needAs: needAs, phiMn: phiMn, pickBars: pickBars, pickRow: pickRow, stir: stir, Draw: Draw, bomRow: bomRow, BOMH: BOMH, finish: finish, fail: fail, AVISO: AVISO, userName: userName, niceScale: niceScale };

    /* ============================================================================
     * 1) VIGA CONTINUA DE 2 Ó 3 TRAMOS — coeficientes aproximados ACI 318 (cap. 6.5)
     *    Hipótesis: tramos aprox. iguales (Lmayor ≤ 1.2·Lmenor), cargas uniformes, wL ≤ 3·wD,
     *    sección prismática, extremos discontinuos sin restricción (apoyos simples en los extremos).
     * ========================================================================== */
    S.vigaCont = function (o) {
        o = Object.assign({ n: 2, L1: 5, L2: 5, L3: 5, b: 300, h: 500, cap: 300, wD: 15, wL: 10, fc: 21, fy: 420, rec: 40 }, o || {});
        var n = o.n === 3 ? 3 : 2, L = [o.L1, o.L2, o.L3].slice(0, n), b = o.b, h = o.h, fc = o.fc, fy = o.fy, rec = o.rec, dest = BARS[3][0], warns = [], memo = [], i;
        var ln = L.map(function (l) { return l - o.cap / 1000; }), wself = 24 * b * h / 1e6, wu = 1.2 * (o.wD + wself) + 1.6 * o.wL;
        if (Math.max.apply(null, L) / Math.min.apply(null, L) > 1.2) warns.push('Los tramos difieren más de 20 %: los coeficientes aproximados ACI no aplican; use análisis elástico (p. ej. el módulo de pórticos).');
        if (o.wL > 3 * o.wD) warns.push('wL > 3·wD: los coeficientes aproximados ACI no aplican estrictamente.');
        var d0 = h - rec - dest - BARS[6][0] / 2, Mpos = [], Mneg = [], k;
        for (i = 0; i < n; i++) Mpos.push(wu * ln[i] * ln[i] / ((i === 0 || i === n - 1) ? 11 : 16));
        for (k = 1; k < n; k++) { var lna = (ln[k - 1] + ln[k]) / 2; Mneg.push(wu * lna * lna / (n === 2 ? 9 : 10)); }
        function des(Mu, label) { var a = needAs(Mu, b, d0, fc, fy), bars = pickBars(a.As, b, rec, dest), dd = h - rec - dest - bars.db / 2, pm = phiMn(bars.As, b, dd, fc, fy); if (!a.ok) warns.push(label + ': ρ = ' + F(a.rho * 100, 2) + ' % > ρmáx: aumente h o b.'); if (!bars.fit) warns.push(label + ': las barras no caben en una capa (b = ' + b + ' mm): aumente b.'); if (pm < Mu) warns.push(label + ': φMn = ' + F(pm, 1) + ' < Mu = ' + F(Mu, 1) + ' kN·m (revise).'); return { a: a, bars: bars, pm: pm, d: dd }; }
        var P = Mpos.map(function (m, i) { return des(m, 'Tramo ' + (i + 1) + ' (+)'); }), N = Mneg.map(function (m, k) { return des(m, 'Apoyo ' + (k + 1) + ' (−)'); });
        var Vend = wu * ln[0] / 2, Vint = 1.15 * wu * ln[0] / 2, dd0 = Math.min.apply(null, P.concat(N).map(function (x) { return x.d; }));
        var Vmax = 1.15 * wu * Math.max.apply(null, ln) / 2 - wu * dd0 / 1000, st = stir(Vmax, b, dd0, fc, fy, Math.min.apply(null, P.concat(N).map(function (x) { return x.bars.db; })));
        if (!st.ok) warns.push('Vs > 0.66√f′c·b·d: aumente la sección por cortante.');
        memo.push('VIGA CONTINUA DE ' + n + ' TRAMOS — PREDIMENSIONAMIENTO (coeficientes aproximados ACI 318 §6.5 / NSR-10 C.8.3, educativo)',
            'Unidades: kN, m, MPa; sección en mm.',
            'Datos: tramos L = ' + L.join(' / ') + ' m (entre ejes) · ancho de apoyo = ' + o.cap + ' mm → luces libres ln = ' + ln.map(function (v) { return F(v, 2); }).join(' / ') + ' m · b×h = ' + b + '×' + h + ' mm · f′c = ' + fc + ' · fy = ' + fy + ' MPa',
            'Cargas: wD = ' + o.wD + ' + peso propio 24·b·h = ' + F(wself, 2) + ' kN/m · wL = ' + o.wL + ' kN/m → wu = 1.2(wD) + 1.6(wL) = ' + F(wu, 2) + ' kN/m');
        P.forEach(function (x, i) { memo.push('Tramo ' + (i + 1) + ': M⁺ = wu·ln²/' + ((i === 0 || i === n - 1) ? '11' : '16') + ' = ' + F(wu, 2) + '·' + F(ln[i], 2) + '²/' + ((i === 0 || i === n - 1) ? 11 : 16) + ' = ' + F(Mpos[i], 1) + ' kN·m → As = ' + F(x.a.As, 0) + ' mm² (mín. ' + F(x.a.Amin, 0) + ') → ' + x.bars.n + ' Ø#' + x.bars.no + ' · φMn = ' + F(x.pm, 1) + ' kN·m'); });
        N.forEach(function (x, k) { memo.push('Apoyo interior ' + (k + 1) + ': M⁻ = wu·ln²/' + (n === 2 ? 9 : 10) + ' (ln promedio ' + F((ln[k] + ln[k + 1]) / 2, 2) + ' m) = ' + F(Mneg[k], 1) + ' kN·m → As = ' + F(x.a.As, 0) + ' mm² → ' + x.bars.n + ' Ø#' + x.bars.no + ' (superior) · φMn = ' + F(x.pm, 1) + ' kN·m'); });
        memo.push('Cortante: Vu en cara del apoyo interior = 1.15·wu·ln/2 = ' + F(Vint, 1) + ' kN (apoyo extremo wu·ln/2 = ' + F(Vend, 1) + ') → Vu(d) = ' + F(Vmax, 1) + ' kN · φVc = 0.75·0.17√f′c·b·d = ' + F(st.phiVc, 1) + ' kN',
            'Estribos Ø#3 (2 ramas): zona de confinamiento 2h = ' + 2 * h + ' mm en cada apoyo @ ' + st.sEnd + ' mm (≤ d/4, 150, 8db); zona central @ ' + st.sMid + ' mm (≤ d/2, 600, Av,mín)',
            'Refuerzo superior corrido: 2 Ø#4 (porta-estribos). Apoyos extremos: se asumen simples (M⁻ ≈ 0; prever acero superior mínimo y anclaje).',
            'NO verificado: momentos con patrones de carga alterna, deflexiones, longitudes de desarrollo/corte de barras exactas, torsión, sismo, nudos.', AVISO);
        // ---- dibujo ----
        var th = Math.max(35, L.reduce(function (a, c) { return a + c; }, 0) * 1000 * 0.012), D = new Draw(th), xs = [0], tot;
        L.forEach(function (l) { xs.push(xs[xs.length - 1] + l * 1000); }); tot = xs[n];
        var x0 = -o.cap / 2, bw = tot + o.cap;
        D.text(x0, h + th * 8, 'VIGA CONTINUA VC-1 DE ' + n + ' TRAMOS — ELEVACION ARMADO (mm)', { h: th * 1.5 }); D.text(x0, h + th * 6, 'b×h = ' + b + '×' + h + ' · f′c ' + fc + ' · fy ' + fy + ' MPa · wu = ' + F(wu, 1) + ' kN/m', { h: th * 0.9 });
        D.rect(x0, 0, bw, h, 'CONTORNO'); xs.forEach(function (x) { D.rect(x - o.cap / 2, -h * 0.7, o.cap, h * 0.7, 'CONTORNO'); D.line(x, -h * 0.9, x, h + th * 3, 'EJES'); });
        var yb = rec + dest + 8, yt = h - rec - dest - 8;
        P.forEach(function (x, i) { D.line(xs[i] + 150 - (i === 0 ? 0 : 0), yb, xs[i + 1] - 150 + 300, yb, 'ARMADURA'); D.text((xs[i] + xs[i + 1]) / 2, yb + th * 0.4, x.bars.n + ' Ø#' + x.bars.no + ' (inf.)', { ha: 1, h: th * 0.85 }); });
        N.forEach(function (x, k) { var c = xs[k + 1], l = 0.33 * (ln[k] + ln[k + 1]) / 2 * 1000; D.line(c - l, yt - 25, c + l, yt - 25, 'ARMADURA', 5); D.text(c, yt - 25 - th * 1.3, x.bars.n + ' Ø#' + x.bars.no + ' sup.', { ha: 1, h: th * 0.85, aci: 5 }); });
        D.line(x0 + rec, yt, x0 + bw - rec, yt, 'ARMADURA', 4); D.text(x0 + bw / 2, yt + th * 0.5, '2 Ø#4 corridas (porta-estribos)', { ha: 1, h: th * 0.8, aci: 4 });
        var nst = 0; xs.forEach(function (x, i) { var zs = []; if (i > 0) zs.push([x - 2 * h, x]); if (i < n) zs.push([x, x + 2 * h]); zs.forEach(function (z) { for (var p = z[0] + st.sEnd / 2; p < z[1]; p += st.sEnd) { D.line(Math.max(x0 + rec, Math.min(x0 + bw - rec, p)), rec, Math.max(x0 + rec, Math.min(x0 + bw - rec, p)), h - rec, 'ARMADURA', 3); nst++; } }); });
        for (i = 0; i < n; i++) { var za = xs[i] + (i === 0 ? 0 : 2 * h), zb = xs[i + 1] - (i === n - 1 ? 0 : 2 * h); za = xs[i] + 2 * h; zb = xs[i + 1] - 2 * h; for (var p = za + st.sMid; p < zb - 1; p += st.sMid) { D.line(p, rec, p, h - rec, 'ARMADURA', 3); nst++; } }
        D.text(xs[0] + h, h / 2, 'E#3 @' + st.sEnd + '\nL = ' + F(2 * (b - 2 * rec) + 2 * (h - 2 * rec) + 150, 0) + ' mm c/u', { h: th * 0.8, ha: 1, va: 2, rot: PI / 2 }); D.text((xs[0] + xs[1]) / 2, h / 2, 'E#3 @' + st.sMid + ' (centro)\nL = ' + F(2 * (b - 2 * rec) + 2 * (h - 2 * rec) + 150, 0) + ' mm c/u', { h: th * 0.85, ha: 1, va: 2 }); D.text(x0, -h * 0.95, 'Estribos Ø#3: 1@50, ' + F(2 * h / st.sEnd, 0) + ' @ ' + st.sEnd + ' en cada extremo de tramo; resto @ ' + st.sMid + ' mm', { h: th * 0.9 });
        for (i = 0; i < n; i++) D.dim(xs[i], h, xs[i + 1], h, th * 2.2, 'L' + (i + 1) + ' = ' + F(L[i] * 1000));
        var sy = -h * 0.95 - th * 8 - h; D.section(xs[0] + 0, sy, b, h, rec, dest, P[0].bars, { n: 2, no: 4 }, 'SECCION A-A (tramo 1)');
        D.section(xs[0] + b + 1600, sy, b, h, rec, dest, { n: 2, no: 4 }, N[0].bars, 'SECCION B-B (apoyo 1)');
        // BOM
        var rows = [], mk = 1; P.forEach(function (x, i) { rows.push(bomRow('Inferior tramo ' + (i + 1), mk++, x.bars.no, x.bars.n, L[i] * 1000 + 300)); }); N.forEach(function (x, k) { rows.push(bomRow('Superior apoyo ' + (k + 1), mk++, x.bars.no, x.bars.n, 0.66 * (ln[k] + ln[k + 1]) / 2 * 1000)); });
        rows.push(bomRow('Porta-estribos', mk++, 4, 2, tot - 2 * rec + 300)); rows.push(bomRow('Estribos Ø#3', mk++, 3, nst, 2 * (b - 2 * rec) + 2 * (h - 2 * rec) + 150));
        var bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'VIGA CONTINUA ' + n + ' TRAMOS', bom), bom: bom, calc: { wu: wu, Mpos: Mpos, Mneg: Mneg, stir: st, bars: P.concat(N).map(function (x) { return x.bars; }) } };
    };

    /* ============================================================================
     * 2) VIGA T / L — ancho efectivo del ala (ACI 318 §6.3.2.1), simplemente apoyada
     * ========================================================================== */
    S.vigaT = function (o) {
        o = Object.assign({ tipo: 1, L: 6, bw: 300, h: 550, hf: 100, sn: 2, wD: 20, wL: 12, fc: 21, fy: 420, rec: 40 }, o || {});
        var isT = o.tipo !== 2, bw = o.bw, h = o.h, hf = o.hf, fc = o.fc, fy = o.fy, rec = o.rec, dest = BARS[3][0], warns = [], memo = [];
        if (hf >= h - 150) return fail('El espesor del ala (hf) es casi igual a la altura total: reduzca hf.');
        var lnn = o.L * 1000, sn = o.sn * 1000, ov = isT ? Math.min(8 * hf, sn / 2, lnn / 8) : Math.min(6 * hf, sn / 2, lnn / 12), be = bw + (isT ? 2 : 1) * ov;
        var wself = 24 * (bw * h + (be - bw) * hf) / 1e6, wu = 1.2 * (o.wD + wself) + 1.6 * o.wL, Mu = wu * o.L * o.L / 8, Vu0 = wu * o.L / 2;
        var d = h - rec - dest - BARS[6][0] / 2, a1 = needAs(Mu, be, d, fc, fy), a = a1.Areq * fy / (0.85 * fc * be), As, mode;
        if (a <= hf) { As = a1.Areq; mode = 'rectangular (a = ' + F(a, 0) + ' mm ≤ hf)'; }
        else { var Asf = 0.85 * fc * (be - bw) * hf / fy, Mnf = 0.9 * Asf * fy * (d - hf / 2) / 1e6, Muw = Mu - Mnf, aw = needAs(Muw, bw, d, fc, fy); As = Asf + aw.As; mode = 'viga T real (a > hf): Asf = ' + F(Asf, 0) + ' mm² · Mnf = ' + F(Mnf, 1) + ' kN·m · Muw = ' + F(Muw, 1) + ' kN·m'; if (!aw.ok || !isFinite(aw.As)) warns.push('El alma no resiste el momento remanente (ρ > ρmáx): aumente bw o h.'); }
        var Amin = Math.max(0.25 * SQ(fc) / fy, 1.4 / fy) * bw * d; As = Math.max(As, Amin);
        var bars = pickBars(As, bw, rec, dest); if (!bars.fit) warns.push('Las barras no caben en una capa del alma (bw = ' + bw + ' mm): aumente bw o use dos capas.'); var dd = h - rec - dest - bars.db / 2;
        var Vud = Vu0 - wu * dd / 1000, st = stir(Vud, bw, dd, fc, fy, bars.db); if (!st.ok) warns.push('Vs > 0.66√f′c·bw·d: aumente la sección del alma.');
        var af = bars.As * fy / (0.85 * fc * be), pm = af <= hf ? 0.9 * bars.As * fy * (dd - af / 2) / 1e6 : (function () { var Asf = 0.85 * fc * (be - bw) * hf / fy, Asw = bars.As - Asf, aw = Asw * fy / (0.85 * fc * bw); return 0.9 * (Asf * fy * (dd - hf / 2) + Asw * fy * (dd - aw / 2)) / 1e6; })();
        if (pm < Mu) warns.push('φMn = ' + F(pm, 1) + ' < Mu = ' + F(Mu, 1) + ' kN·m (revise).');
        memo.push('VIGA ' + (isT ? 'T' : 'L') + ' SIMPLEMENTE APOYADA — PREDIMENSIONAMIENTO (ACI 318 §6.3.2.1 / NSR-10 C.8.12, educativo)', 'Unidades: kN, m, MPa; sección en mm.',
            'Datos: L = ' + o.L + ' m · bw = ' + bw + ' · h = ' + h + ' · hf = ' + hf + ' mm · distancia libre al alma vecina = ' + o.sn + ' m · f′c = ' + fc + ' · fy = ' + fy + ' MPa',
            'Ancho efectivo be = bw + ' + (isT ? '2' : '1') + '·min(' + (isT ? '8' : '6') + 'hf, sn/2, ln/' + (isT ? 8 : 12) + ') = ' + bw + ' + ' + (isT ? '2' : '1') + '·' + F(ov, 0) + ' = ' + F(be, 0) + ' mm',
            'Peso propio = 24·A = ' + F(wself, 2) + ' kN/m → wu = 1.2(' + o.wD + ' + ' + F(wself, 2) + ') + 1.6(' + o.wL + ') = ' + F(wu, 2) + ' kN/m',
            'Mu = wu·L²/8 = ' + F(Mu, 1) + ' kN·m · Vu = wu·L/2 = ' + F(Vu0, 1) + ' kN · d = ' + F(d, 0) + ' mm', 'Comportamiento: ' + mode,
            'As req = ' + F(As, 0) + ' mm² (mín. ' + F(Amin, 0) + ') → ' + bars.n + ' Ø#' + bars.no + ' (As = ' + F(bars.As, 0) + ' mm²) · φMn = ' + F(pm, 1) + ' kN·m',
            'Cortante (alma): Vu(d) = ' + F(Vud, 1) + ' kN · φVc = 0.75·0.17√f′c·bw·d = ' + F(st.phiVc, 1) + ' kN → estribos Ø#3: extremos (2h) @ ' + st.sEnd + ' mm; centro @ ' + st.sMid + ' mm',
            'Refuerzo del ala (acero transversal de la losa) NO calculado aquí. NO verificado: deflexión, cortante horizontal ala–alma, continuidad, torsión.', AVISO);
        var Lm = o.L * 1000, th = Math.max(30, Lm * 0.012), D = new Draw(th), yb = rec + dest + 8, ex = 150;
        D.text(0, h + th * 8, 'VIGA ' + (isT ? 'T' : 'L') + ' VT-1 — ELEVACION Y SECCION (mm)', { h: th * 1.5 }); D.text(0, h + th * 6, 'L = ' + F(Lm) + ' · bw×h = ' + bw + '×' + h + ' · hf = ' + hf + ' · be = ' + F(be), { h: th * 0.9 });
        D.rect(0, 0, Lm, h, 'CONTORNO'); D.line(0, hf > h ? 0 : h - hf, Lm, h - hf, 'SOMBRA'); D.line(rec, yb, Lm - rec, yb, 'ARMADURA'); D.text(Lm / 2, yb + th * 0.5, bars.n + ' Ø#' + bars.no, { ha: 1, h: th * 0.9 }); D.line(rec, h - rec - 10, Lm - rec, h - rec - 10, 'ARMADURA', 4); D.text(Lm / 2, h - rec - 10 - th * 1.2, '2 Ø#4 (porta-estribos)', { ha: 1, h: th * 0.8, aci: 4 });
        var nst = 0, p; for (p = st.sEnd / 2; p < 2 * h; p += st.sEnd) { D.line(p, rec, p, h - rec, 'ARMADURA', 3); D.line(Lm - p, rec, Lm - p, h - rec, 'ARMADURA', 3); nst += 2; } for (p = 2 * h + st.sMid; p < Lm - 2 * h; p += st.sMid) { D.line(p, rec, p, h - rec, 'ARMADURA', 3); nst++; }
        D.text(h, h / 2, 'E#3 @' + st.sEnd + '\nL = ' + F(2 * (bw - 2 * rec) + 2 * (h - 2 * rec) + 150, 0) + ' mm c/u', { h: th * 0.8, ha: 1, va: 2, rot: PI / 2 }); D.text(Lm / 2, h / 2, 'E#3 @' + st.sMid + ' (centro)\nL = ' + F(2 * (bw - 2 * rec) + 2 * (h - 2 * rec) + 150, 0) + ' mm c/u', { h: th * 0.85, ha: 1, va: 2 });
        D.dim(0, h, Lm, h, th * 2.2, 'L = ' + F(Lm)); D.poly([[0, 0], [-th * 1.4, -th * 2.4], [th * 1.4, -th * 2.4]], true, 'CONTORNO'); D.poly([[Lm, 0], [Lm - th * 1.4, -th * 2.4], [Lm + th * 1.4, -th * 2.4]], true, 'CONTORNO');
        var cx = Lm * 0.5 - be / 2, cy = -h - th * 14; D.rect(cx, cy + h - hf, be, hf, 'CONTORNO'); D.rect(cx + (be - bw) / 2, cy, bw, h - hf, 'CONTORNO'); D.line(cx + (be - bw) / 2, cy + h - hf, cx + (be + bw) / 2, cy + h - hf, 'SOMBRA');
        D.rect(cx + (be - bw) / 2 + rec, cy + rec, bw - 2 * rec, h - 2 * rec, 'ARMADURA', 3); var xx0 = cx + (be - bw) / 2 + rec + dest + bars.db / 2, xx1 = cx + (be + bw) / 2 - rec - dest - bars.db / 2, i; for (i = 0; i < bars.n; i++) D.circle(bars.n === 1 ? (xx0 + xx1) / 2 : xx0 + (xx1 - xx0) * i / (bars.n - 1), cy + rec + dest + bars.db / 2, bars.db / 2, 'ARMADURA');
        D.dim(cx, cy + h, cx + be, cy + h, th * 1.8, 'be = ' + F(be)); D.dim(cx + (be - bw) / 2, cy, cx + (be + bw) / 2, cy, -th * 1.8, 'bw = ' + bw); D.dim(cx + be, cy, cx + be, cy + h, th * 1.8, 'h = ' + h); D.dim(cx + be + th * 4, cy + h - hf, cx + be + th * 4, cy + h, th * 1.8, 'hf = ' + hf); D.text(cx + be / 2, cy + h + th * 4, 'SECCION ' + (isT ? 'T' : 'L'), { ha: 1, h: th * 1.1 });
        var rows = [bomRow('Inferior', 1, bars.no, bars.n, Lm - 2 * rec + 300), bomRow('Porta-estribos', 2, 4, 2, Lm - 2 * rec + 300), bomRow('Estribos Ø#3', 3, 3, nst, 2 * (bw - 2 * rec) + 2 * (h - 2 * rec) + 150)], bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'VIGA ' + (isT ? 'T' : 'L'), bom), bom: bom, calc: { be: be, Mu: Mu, As: bars.As, bars: bars, stir: st } };
    };

    /* ============================================================================
     * 3) LOSA MACIZA EN DOS DIRECCIONES — franjas con reparto Rankine–Grashof
     *    (aproximación conservadora a los coeficientes ACI; los coeficientes tabulados de ACI
     *     NO se incluyen: verifique con las tablas del texto del curso).
     *    Reparto: wx = w·Ly⁴/(Lx⁴+Ly⁴), wy = w − wx. Cada franja se resuelve como viga con las
     *    condiciones de continuidad elegidas (0, 1 ó 2 extremos continuos).
     * ========================================================================== */
    function strip(w, L, nc) { // devuelve {pos, neg} en kN·m/m para una franja de luz L con nc extremos continuos
        var w2 = w * L * L; if (nc === 0) return { pos: w2 / 8, neg: 0 }; if (nc === 1) return { pos: 9 * w2 / 128, neg: w2 / 8 }; return { pos: w2 / 24, neg: w2 / 12 };
    }
    S.losa2d = function (o) {
        o = Object.assign({ Lx: 4, Ly: 5, cx: 0, cy: 0, wL: 2, wDextra: 1.5, fc: 21, fy: 420, rec: 20, apoyo: 300 }, o || {});
        var Lx = Math.min(o.Lx, o.Ly), Ly = Math.max(o.Lx, o.Ly), warns = [], memo = [], fc = o.fc, fy = o.fy, rec = o.rec;
        if (Ly / Lx > 2) warns.push('Ly/Lx = ' + F(Ly / Lx, 2) + ' > 2: la losa trabaja básicamente en una dirección; use el módulo de losa en una dirección.');
        var lnx = Lx - o.apoyo / 1000, lny = Ly - o.apoyo / 1000, beta = lny / lnx, hmin = Math.max(90, Math.ceil(lnx * 1000 * (0.8 + fy / 1400) / (36 + 9 * beta) / 5) * 5), h = hmin;
        var db = 9.5 + 3.2, wself = 24 * h / 1000, wu = 1.2 * (wself + o.wDextra) + 1.6 * o.wL, kx = Math.pow(Ly, 4) / (Math.pow(Lx, 4) + Math.pow(Ly, 4)), wx = wu * kx, wy = wu - wx;
        var sx = strip(wx, Lx, o.cx), sy = strip(wy, Ly, o.cy), dx = h - rec - 6.35, dy = dx - 12.7;
        function des(M, d, name) { if (M <= 0) return null; var a = needAs(M, 1000, d, fc, fy), Asmin = 0.0018 * 1000 * h, As = Math.max(a.Areq, Asmin, a.Amin), Ab = BARS[4][1], s = Math.min(fl25(Ab * 1000 / As), fl25(Math.min(2 * h, 450))); if (!a.ok) warns.push(name + ': ρ > ρmáx: aumente h.'); return { M: M, As: As, Asprov: Ab * 1000 / s, s: Math.max(s, 75), d: d }; }
        var px = des(sx.pos, dx, 'M⁺ dir. x'), py = des(sy.pos, dy, 'M⁺ dir. y'), nx_ = des(sx.neg, dx, 'M⁻ dir. x'), ny_ = des(sy.neg, dy, 'M⁻ dir. y');
        var Vu = wx * (lnx / 2) * (o.cx ? 1.15 : 1) - wu * dx / 1000, phiVc = 0.75 * 0.17 * SQ(fc) * 1000 * dx / 1000; if (Vu > phiVc) warns.push('Vu = ' + F(Vu, 1) + ' kN/m > φVc = ' + F(phiVc, 1) + ' kN/m: aumente h.');
        memo.push('LOSA MACIZA EN DOS DIRECCIONES — PREDIMENSIONAMIENTO (método de franjas, reparto Rankine–Grashof; educativo)', 'Unidades: kN, m, MPa; espesor en mm; momentos en kN·m por metro de ancho.',
            'Datos: Lx = ' + Lx + ' m (corta) · Ly = ' + Ly + ' m (larga) · apoyos de ' + o.apoyo + ' mm → ln = ' + F(lnx, 2) + ' × ' + F(lny, 2) + ' m · bordes continuos: dir. x = ' + o.cx + ', dir. y = ' + o.cy + ' · wL = ' + o.wL + ' · acabados = ' + o.wDextra + ' kN/m² · f′c = ' + fc + ' · fy = ' + fy,
            'Espesor mínimo (losa apoyada en vigas rígidas, αfm > 2): h = ln(0.8 + fy/1400)/(36 + 9β) = ' + F(lnx, 2) + '·(0.8 + ' + fy + '/1400)/(36 + 9·' + F(beta, 2) + ') = ' + F(lnx * 1000 * (0.8 + fy / 1400) / (36 + 9 * beta), 0) + ' mm ≥ 90 mm → h = ' + h + ' mm',
            'wu = 1.2(24·h + acabados) + 1.6·wL = ' + F(wu, 2) + ' kN/m² → reparto: wx = wu·Ly⁴/(Lx⁴+Ly⁴) = ' + F(wx, 2) + ' ; wy = ' + F(wy, 2) + ' kN/m²');
        function line(p, t, nm) { if (p) memo.push(nm + ': Mu = ' + F(p.M, 2) + ' kN·m/m · d = ' + F(p.d, 0) + ' mm → As = ' + F(p.As, 0) + ' mm²/m (mín. 0.0018·b·h = ' + F(0.0018 * 1000 * h, 0) + ') → Ø#4 @ ' + p.s + ' mm (As = ' + F(p.Asprov, 0) + ' mm²/m)'); }
        line(px, 0, 'M⁺ dir. x (corta, abajo)'); line(py, 0, 'M⁺ dir. y (larga, abajo)'); line(nx_, 0, 'M⁻ dir. x (apoyos continuos, arriba)'); line(ny_, 0, 'M⁻ dir. y (apoyos continuos, arriba)');
        memo.push('Cortante (franja corta): Vu(d) = ' + F(Vu, 1) + ' kN/m · φVc = ' + F(phiVc, 1) + ' kN/m ' + (Vu <= phiVc ? 'OK' : 'NO CUMPLE'),
            'Limitación: el reparto Grashof sin corrección por torsión sobrestima los momentos (es conservador). Los coeficientes tabulados ACI (método 3) darían valores algo menores.',
            'NO verificado: deflexiones, torsión en esquinas (acero de esquina), cargas concentradas, refuerzo negativo exacto (longitud 0.3·ln), sismo.', AVISO);
        var Lxm = Lx * 1000, Lym = Ly * 1000, th = Math.max(50, Lym * 0.018), D = new Draw(th);
        D.text(0, Lym + th * 6, 'LOSA MACIZA EN DOS DIRECCIONES L-2D — PLANTA Y CORTE (mm)', { h: th * 1.5 }); D.text(0, Lym + th * 4, 'h = ' + h + ' mm · f′c ' + fc + ' · fy ' + fy + ' MPa · bordes continuos x:' + o.cx + ' y:' + o.cy, { h: th * 0.9 });
        D.rect(0, 0, Lxm, Lym, 'CONTORNO'); var i, ex_ = px ? px.s : 250, ey_ = py ? py.s : 250;
        for (i = 0; i * ex_ < Lym - 50; i++) D.line(25, 25 + i * ex_ + 0, Lxm - 25, 25 + i * ex_, 'ARMADURA'); for (i = 0; i * ey_ < Lxm - 50; i++) D.line(25 + i * ey_, 40, 25 + i * ey_, Lym - 40, 'ARMADURA', 5);
        if (nx_) { D.line(0, Lym * 0.5, 0.3 * lnx * 1000, Lym * 0.5, 'ARMADURA', 3); D.line(Lxm - 0.3 * lnx * 1000, Lym * 0.5, Lxm, Lym * 0.5, 'ARMADURA', 3); }
        D.text(Lxm / 2, Lym / 2, 'Ø#4 @ ' + (px ? px.s : '—') + ' (dir. x, abajo)\nØ#4 @ ' + (py ? py.s : '—') + ' (dir. y, abajo)' + (nx_ ? '\nSup. Ø#4 @ ' + nx_.s + ' en apoyos continuos' : ''), { ha: 1, va: 2, h: th * 1.1 });
        D.dim(0, 0, Lxm, 0, -th * 2.5, 'Lx = ' + F(Lxm)); D.dim(0, 0, 0, Lym, -th * 2.5, 'Ly = ' + F(Lym));
        var cx0 = Lxm + 2500, ss = Math.max(1, Math.round(Lxm / (h * 8))); D.text(cx0, h * ss + th * 6, 'CORTE A-A dir. x (esc. vertical ' + ss + '×)', { h: th }); D.rect(cx0, 0, Lxm, h * ss, 'CONTORNO'); D.line(cx0 + 25, (rec + 6) * ss, cx0 + Lxm - 25, (rec + 6) * ss, 'ARMADURA'); D.dim(cx0 + Lxm, 0, cx0 + Lxm, h * ss, th * 2.5, 'h = ' + h);
        var rows = [bomRow('Inferior dir. x', 1, 4, Math.ceil(Lym / ex_) + 1, Lxm + 300), bomRow('Inferior dir. y', 2, 4, Math.ceil(Lxm / ey_) + 1, Lym + 300)]; if (nx_) rows.push(bomRow('Superior apoyos x', 3, 4, 2 * (Math.ceil(Lym / nx_.s) + 1), 0.3 * lnx * 1000 + 300)); if (ny_) rows.push(bomRow('Superior apoyos y', 4, 4, 2 * (Math.ceil(Lxm / ny_.s) + 1), 0.3 * lny * 1000 + 300));
        var bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'LOSA MACIZA 2 DIRECCIONES', bom), bom: bom, calc: { h: h, wu: wu, sx: sx, sy: sy, px: px, py: py } };
    };

    /* ============================================================================
     * 4a) ZAPATA COMBINADA (2 columnas) — presión uniforme (resultante en el centroide)
     * ========================================================================== */
    S.zapataComb = function (o) {
        o = Object.assign({ P1: 600, P2: 900, c1: 400, c2: 400, S: 4, a: 0.5, qadm: 150, fc: 21, fy: 420, Df: 1.5 }, o || {});
        var warns = [], memo = [], fc = o.fc, fy = o.fy, Ps = 1.10 * (o.P1 + o.P2), xbar = o.P2 * o.S / (o.P1 + o.P2), Lr = r5(2 * (o.a + xbar)), a_eff = Lr / 2 - xbar, x1 = a_eff, x2 = a_eff + o.S;
        if (a_eff * 1000 < o.c1 / 2) return fail('El voladizo izquierdo resulta menor que media columna: aumente la distancia "a" o la separación S.');
        var B = r5(Ps / (o.qadm * Lr)), qn = Ps / (B * Lr); if (B < Math.max(o.c1, o.c2) / 1000 + 0.4) { B = r5(Math.max(o.c1, o.c2) / 1000 + 0.4); warns.push('B ajustado al mínimo constructivo (columna + 0.4 m).'); }
        var Pu1 = 1.4 * o.P1, Pu2 = 1.4 * o.P2, Put = Pu1 + Pu2, w = Put / Lr, qu = Put / (B * Lr), N = 600, xsm = [], Vs = [], Ms = [], i;
        for (i = 0; i <= N; i++) { var x = Lr * i / N, V = w * x - (x > x1 ? Pu1 : 0) - (x > x2 ? Pu2 : 0), M = w * x * x / 2 - (x > x1 ? Pu1 * (x - x1) : 0) - (x > x2 ? Pu2 * (x - x2) : 0); xsm.push(x); Vs.push(V); Ms.push(M); }
        var Mpos = Math.max.apply(null, Ms), Mneg = -Math.min.apply(null, Ms), xz = [], jj; for (jj = 1; jj <= N; jj++) if (Ms[jj - 1] * Ms[jj] < 0 && xsm[jj] > x1 && xsm[jj] < x2) xz.push(xsm[jj]);
        function vAt(x) { var k = Math.max(0, Math.min(N, Math.round(x / Lr * N))); return Vs[k]; }
        var h = 400, d, ok = false, pun1, pun2, v1, bo1, bo2, phiP1, phiP2, phiV, Vb;
        for (h = 400; h <= 1500; h += 50) {
            d = h - 75 - 10; var c1 = o.c1, c2 = o.c2;
            bo2 = 4 * (c2 + d); bo1 = (x1 * 1000 - c1 / 2 - d / 2 >= 0) ? 4 * (c1 + d) : (c1 + d) + 2 * (c1 / 2 + d / 2 + x1 * 1000);
            pun1 = Pu1 - qu * (c1 + d) * (c1 + d) / 1e6; pun2 = Pu2 - qu * (c2 + d) * (c2 + d) / 1e6; phiP1 = 0.75 * 0.33 * SQ(fc) * bo1 * d / 1000; phiP2 = 0.75 * 0.33 * SQ(fc) * bo2 * d / 1000;
            Vb = Math.max(Math.abs(vAt(x1 - c1 / 2000 - d / 1000)), Math.abs(vAt(x1 + c1 / 2000 + d / 1000)), Math.abs(vAt(x2 - c2 / 2000 - d / 1000)), Math.abs(vAt(x2 + c2 / 2000 + d / 1000))); phiV = 0.75 * 0.17 * SQ(fc) * B * 1000 * d / 1000;
            if (pun1 <= phiP1 && pun2 <= phiP2 && Vb <= phiV) { ok = true; break; }
        }
        if (!ok) { warns.push('No se logró cumplir punzonamiento / cortante con h ≤ 1500 mm: revise cargas o dimensiones.'); h = 1500; d = h - 85; }
        var b = B * 1000, dT = d - 16, aB = needAs(Mpos, b, d, fc, fy), aT = needAs(Mneg, b, d, fc, fy), rB = pickRow(Math.max(aB.As, 0.0018 * b * h), b, h, 75), rT = pickRow(Math.max(aT.As, 0.0018 * b * h), b, h, 75);
        if (!aB.ok || !aT.ok) warns.push('ρ > ρmáx en el sentido longitudinal: aumente h.'); if (qn > o.qadm) warns.push('q = ' + F(qn, 1) + ' > qadm (' + o.qadm + ' kPa).');
        function band(Pu, c) { var bwid = Math.min(b, c + d), lt = (b - c) / 2000, Mu = Pu / B * lt * lt / 2, a = needAs(Mu, bwid, dT, fc, fy), As = Math.max(a.As, 0.0018 * bwid * h), n = Math.max(3, Math.ceil(As / BARS[5][1])); return { bw: bwid, Mu: Mu, As: As, n: n, s: bwid / n }; }
        var t1 = band(Pu1, o.c1), t2 = band(Pu2, o.c2);
        var xz1 = xz.length ? xz[0] : x1 + o.S * 0.25, xz2 = xz.length ? xz[xz.length - 1] : x2 - o.S * 0.25;
        memo.push('ZAPATA COMBINADA (2 columnas) — PREDIMENSIONAMIENTO (ACI 318 cap. 13 / NSR-10 C.15, educativo)', 'Unidades: kN, m, kPa, MPa; sección en mm.',
            'Datos: P1 = ' + o.P1 + ' kN (col. ' + o.c1 + ' mm) · P2 = ' + o.P2 + ' kN (col. ' + o.c2 + ' mm) · separación S = ' + o.S + ' m · qadm = ' + o.qadm + ' kPa · f′c = ' + fc + ' · fy = ' + fy + ' MPa · Df = ' + o.Df + ' m',
            'Resultante desde la columna 1: x̄ = P2·S/(P1+P2) = ' + F(xbar, 3) + ' m → L = 2(a + x̄) = ' + F(Lr, 2) + ' m (el centroide de la zapata coincide con la resultante ⇒ presión uniforme) · voladizo izq. = ' + F(a_eff, 2) + ' m · der. = ' + F(Lr - x2, 2) + ' m',
            'Área req.: 1.10(P1+P2)/qadm = ' + F(Ps / o.qadm, 2) + ' m² → B = ' + F(B, 2) + ' m · q servicio = ' + F(qn, 1) + ' kPa', 'Mayoradas (1.4P simplificado): Pu1 = ' + F(Pu1, 0) + ' · Pu2 = ' + F(Pu2, 0) + ' kN · carga lineal del suelo w = Put/L = ' + F(w, 1) + ' kN/m · qu = ' + F(qu, 1) + ' kPa',
            'Longitudinal (viga invertida): M⁺ máx (voladizos, acero inferior) = ' + F(Mpos, 1) + ' kN·m · M⁻ máx (entre columnas, acero superior) = ' + F(Mneg, 1) + ' kN·m',
            'Espesor por punzonamiento y cortante: h = ' + h + ' mm (d = ' + F(d, 0) + ') · punz. col.1: Vu = ' + F(pun1, 0) + ' ≤ φVc = ' + F(phiP1, 0) + ' · col.2: Vu = ' + F(pun2, 0) + ' ≤ φVc = ' + F(phiP2, 0) + ' kN · cortante 1 dir.: Vu = ' + F(Vb, 0) + ' ≤ φVc = ' + F(phiV, 0) + ' kN',
            'Acero inferior (b = ' + F(b, 0) + '): As = ' + F(Math.max(aB.As, 0.0018 * b * h), 0) + ' mm² → ' + rB.n + ' Ø#' + rB.no + ' @ ' + F(rB.s, 0) + ' mm · acero superior: As = ' + F(Math.max(aT.As, 0.0018 * b * h), 0) + ' mm² → ' + rT.n + ' Ø#' + rT.no + ' @ ' + F(rT.s, 0) + ' mm',
            'Transversal (bandas bajo columnas): col.1 banda ' + F(t1.bw, 0) + ' mm, Mu = ' + F(t1.Mu, 1) + ' kN·m → ' + t1.n + ' Ø#5 · col.2 banda ' + F(t2.bw, 0) + ' mm, Mu = ' + F(t2.Mu, 1) + ' kN·m → ' + t2.n + ' Ø#5',
            'NO verificado: excentricidades/momentos en columnas, asentamientos diferenciales, torsión, desarrollo del acero, nivel freático, columna de borde (perímetro crítico simplificado).', AVISO);
        var Lm = Lr * 1000, th = Math.max(40, Lm * 0.012), D = new Draw(th), px1 = x1 * 1000, px2 = x2 * 1000;
        D.text(0, b + th * 8, 'ZAPATA COMBINADA ZC-1 — PLANTA Y CORTE LONGITUDINAL (mm)', { h: th * 1.5 }); D.text(0, b + th * 6, 'L×B×h = ' + F(Lm) + '×' + F(b) + '×' + h + ' · f′c ' + fc + ' · fy ' + fy + ' MPa', { h: th * 0.9 });
        D.rect(0, 0, Lm, b, 'CONTORNO'); [[px1, o.c1], [px2, o.c2]].forEach(function (c) { D.rect(c[0] - c[1] / 2, b / 2 - c[1] / 2, c[1], c[1], 'CONTORNO'); D.line(c[0], -th * 2, c[0], b + th * 2, 'EJES'); D.hatch(c[0] - c[1] / 2, b / 2 - c[1] / 2, c[1], c[1], th * 2); });
        for (i = 0; i < rB.n; i++) D.line(75, 75 + (b - 150) * i / (rB.n - 1), Lm - 75, 75 + (b - 150) * i / (rB.n - 1), 'ARMADURA'); for (i = 0; i < rT.n; i++) D.line(xz1 * 1000 - 12 * 16, 75 + 25 + (b - 200) * i / (rT.n - 1), xz2 * 1000 + 12 * 16, 75 + 25 + (b - 200) * i / (rT.n - 1), 'ARMADURA', 5);
        [[px1, t1, o.c1], [px2, t2, o.c2]].forEach(function (c) { D.rect(c[0] - c[1].bw / 2, 40, c[1].bw, b - 80, 'SOMBRA'); for (var k = 0; k < c[1].n; k++) { var xx = c[0] - c[1].bw / 2 + c[1].bw * (k + 0.5) / c[1].n; D.line(xx, 60, xx, b - 60, 'ARMADURA', 3); } D.text(c[0], b + th * 0.8, c[1].n + ' Ø#5 transv. (banda ' + F(c[1].bw) + ')', { ha: 1, h: th * 0.8, aci: 3 }); });
        D.dim(0, 0, px1, 0, -th * 2.2, F(px1)); D.dim(px1, 0, px2, 0, -th * 2.2, 'S = ' + F(o.S * 1000)); D.dim(px2, 0, Lm, 0, -th * 2.2, F(Lm - px2)); D.dim(0, 0, Lm, 0, -th * 5, 'L = ' + F(Lm)); D.dim(0, 0, 0, b, -th * 2.2, 'B = ' + F(b));
        var cy = -b * 0.0 - h - th * 14; D.text(0, cy + h + th * 8, 'CORTE LONGITUDINAL', { h: th * 1.1 }); D.rect(0, cy, Lm, h, 'CONTORNO'); [[px1, o.c1], [px2, o.c2]].forEach(function (c) { D.rect(c[0] - c[1] / 2, cy + h, c[1], h * 0.8, 'CONTORNO'); });
        D.line(75, cy + 75 + 8, Lm - 75, cy + 75 + 8, 'ARMADURA'); D.text(Lm / 2, cy + 75 + th, rB.n + ' Ø#' + rB.no + ' (inferior)', { ha: 1, h: th * 0.9 }); D.line(xz1 * 1000 - 192, cy + h - 75 - 8, xz2 * 1000 + 192, cy + h - 75 - 8, 'ARMADURA', 5); D.text((px1 + px2) / 2, cy + h - 75 - th * 1.6, rT.n + ' Ø#' + rT.no + ' (superior)', { ha: 1, h: th * 0.9, aci: 5 }); D.dim(Lm, cy, Lm, cy + h, th * 2.2, 'h = ' + h);
        var rows = [bomRow('Inferior long.', 1, rB.no, rB.n, Lm - 150 + 2 * 200), bomRow('Superior long.', 2, rT.no, rT.n, (xz2 - xz1) * 1000 + 2 * 192), bomRow('Transv. col.1', 3, 5, t1.n, b - 150 + 2 * 200), bomRow('Transv. col.2', 4, 5, t2.n, b - 150 + 2 * 200)], bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'ZAPATA COMBINADA', bom), bom: bom, calc: { L: Lr, B: B, h: h, Mpos: Mpos, Mneg: Mneg, qn: qn } };
    };

    /* ============================================================================
     * 4b) ZAPATA CORRIDA (bajo muro) — franja de 1 m
     * ========================================================================== */
    S.zapataCorr = function (o) {
        o = Object.assign({ P: 150, t: 250, qadm: 150, fc: 21, fy: 420, Df: 1.2 }, o || {});
        var warns = [], memo = [], fc = o.fc, fy = o.fy, B = r5(1.10 * o.P / o.qadm), qs = 1.10 * o.P / B; if (B < o.t / 1000 + 0.3) { B = r5(o.t / 1000 + 0.3); warns.push('B ajustado al mínimo constructivo (muro + 0.3 m).'); }
        var qu = 1.4 * o.P / B, lt = (B - o.t / 1000) / 2, Mu = qu * lt * lt / 2, h, d, ok = false, Vu, phiVc;
        for (h = 250; h <= 900; h += 25) { d = h - 75 - 8; Vu = qu * (lt - d / 1000); phiVc = 0.75 * 0.17 * SQ(fc) * 1000 * d / 1000; if (Vu <= phiVc) { ok = true; break; } }
        if (!ok) { warns.push('No cumple cortante con h ≤ 900 mm.'); h = 900; d = h - 83; }
        var a = needAs(Mu, 1000, d, fc, fy), Asmin = 0.0018 * 1000 * h, As = Math.max(a.As, Asmin), Ab = BARS[5][1], s = Math.max(100, Math.min(fl25(Ab * 1000 / As), fl25(Math.min(3 * h, 450)))), Asp = Ab * 1000 / s, At = 0.0018 * 1000 * h, nL = Math.max(3, Math.ceil(At * B / BARS[4][1]));
        if (!a.ok) warns.push('ρ > ρmáx: aumente h.'); if (qs > o.qadm) warns.push('q > qadm.');
        memo.push('ZAPATA CORRIDA BAJO MURO — PREDIMENSIONAMIENTO (ACI 318 cap. 13 / NSR-10 C.15, educativo)', 'Unidades: kN/m, m, kPa, MPa; sección en mm; análisis por metro de longitud.',
            'Datos: carga del muro P = ' + o.P + ' kN/m (servicio) · espesor del muro t = ' + o.t + ' mm · qadm = ' + o.qadm + ' kPa · f′c = ' + fc + ' · fy = ' + fy + ' MPa · Df = ' + o.Df + ' m',
            'Ancho: B = 1.10·P/qadm = ' + F(1.1 * o.P / o.qadm, 2) + ' → B = ' + F(B, 2) + ' m · q servicio = ' + F(qs, 1) + ' kPa', 'qu = 1.4·P/B = ' + F(qu, 1) + ' kPa · voladizo lt = (B − t)/2 = ' + F(lt, 3) + ' m',
            'Mu = qu·lt²/2 = ' + F(Mu, 2) + ' kN·m/m · espesor por cortante (1 dir., a d de la cara): h = ' + h + ' mm (d = ' + F(d, 0) + ') · Vu = ' + F(Vu, 1) + ' ≤ φVc = ' + F(phiVc, 1) + ' kN/m',
            'Acero transversal (principal): As = ' + F(As, 0) + ' mm²/m (mín. ' + F(Asmin, 0) + ') → Ø#5 @ ' + s + ' mm (As = ' + F(Asp, 0) + ' mm²/m) · acero longitudinal (retracción): ' + nL + ' Ø#4 (0.0018·b·h)',
            'NO verificado: excentricidad, asentamientos, aplastamiento del muro, desarrollo del acero, nivel freático.', AVISO);
        var Bm = B * 1000, th = Math.max(25, Bm * 0.03), D = new Draw(th), n = Math.floor((Bm - 150) / s) + 1, i;
        D.text(0, h + 600 + th * 5, 'ZAPATA CORRIDA ZCO-1 — SECCION Y PLANTA (mm)', { h: th * 1.4 }); D.text(0, h + 600 + th * 3, 'B = ' + F(Bm) + ' · h = ' + h + ' · f′c ' + fc + ' · fy ' + fy + ' MPa', { h: th * 0.9 });
        D.rect(0, 0, Bm, h, 'CONTORNO'); D.rect(Bm / 2 - o.t / 2, h, o.t, 600, 'CONTORNO'); D.hatch(Bm / 2 - o.t / 2, h, o.t, 600, th * 2); D.line(75, 75 + 8, Bm - 75, 75 + 8, 'ARMADURA'); for (i = 0; i < 9; i++) D.circle(75 + (Bm - 150) * i / 8, 75 + 8 + 12, 6, 'ARMADURA', 5); D.line(Bm / 2, -th * 2, Bm / 2, h + 600 + th, 'EJES');
        D.text(Bm / 2, 75 + th * 1.6, 'Ø#5 @ ' + s + ' (transversal) · ' + nL + ' Ø#4 long.', { ha: 1, h: th * 0.9 }); D.dim(0, 0, Bm, 0, -th * 2.2, 'B = ' + F(Bm)); D.dim(Bm, 0, Bm, h, th * 2.2, 'h = ' + h); D.dim(Bm / 2 - o.t / 2, h + 600, Bm / 2 + o.t / 2, h + 600, th * 2.2, 't = ' + o.t);
        var py = -th * 12, Lp = 3000; D.text(0, py + 5 * th, 'PLANTA (tramo de 3 m)', { h: th * 1.1 }); D.rect(0, py - Bm, Lp, Bm, 'CONTORNO'); D.rect(0, py - Bm / 2 - o.t / 2, Lp, o.t, 'SOMBRA'); for (i = 0; i <= Lp / s; i++) D.line(i * s + 25, py - Bm + 75, i * s + 25, py - 75, 'ARMADURA'); D.line(25, py - Bm + 75 + 40, Lp - 25, py - Bm + 75 + 40, 'ARMADURA', 5);
        var rows = [bomRow('Transversal (por m)', 1, 5, Math.round(1000 / s), Bm - 150 + 2 * 200), bomRow('Longitudinal (en B)', 2, 4, nL, 1000)], bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'ZAPATA CORRIDA', bom), bom: bom, calc: { B: B, h: h, Mu: Mu, s: s } };
    };

    /* ============================================================================
     * 5a) DESPIECE DE VIGA — marcas, formas, longitudes y cuadro
     * ========================================================================== */
    S.despieceViga = function (o) {
        var r = S.viga(o); if (!r.ok) return r; o = Object.assign({ L: 6, b: 300, h: 500, rec: 40 }, o || {}); var c = r.calc, L = o.L * 1000, b = o.b, h = o.h, rec = o.rec, dest = BARS[3][0], db = BARS[c.bar][0], warns = r.warns.slice(), memo = [];
        var hook = 12 * db, Lm1 = L - 2 * rec + 2 * hook, Lm2 = L - 2 * rec + 2 * 12 * BARS[4][0], hk = Math.max(6 * dest, 75), Lest = 2 * (b - 2 * rec) + 2 * (h - 2 * rec) + 2 * (hk + 0), zE = 2 * h, nE = Math.round(2 * zE / c.sEnd) + Math.max(0, Math.round((L - 2 * zE) / c.sMid)) + 1;
        memo.push('DESPIECE DE ARMADURA DE VIGA — ESQUEMATICO (educativo)', 'Unidades: mm; masas en kg (0.00617·Ø² kg/m).', 'Base de cálculo: viga simplemente apoyada L = ' + o.L + ' m, b×h = ' + b + '×' + h + ' mm (ver memoria del elemento).',
            'Marca 1: ' + c.nBars + ' Ø#' + c.bar + ' inferiores, rectas con ganchos 90° de 12db = ' + F(hook, 0) + ' mm → longitud = L − 2·rec + 2·12db = ' + F(Lm1, 0) + ' mm',
            'Marca 2: 2 Ø#4 superiores (porta-estribos), ganchos 90° → ' + F(Lm2, 0) + ' mm', 'Marca 3: estribos Ø#3 cerrados con ganchos a 135° (extensión ' + F(hk, 0) + ' mm): perímetro = 2(b − 2rec) + 2(h − 2rec) + 2·ext = ' + F(Lest, 0) + ' mm · ' + nE + ' unidades (extremos @ ' + c.sEnd + ' en 2h; centro @ ' + c.sMid + ')',
            'Los empalmes, traslapos y la longitud de desarrollo exactos NO se incluyen: añadir según ACI 318 cap. 25 y detalles del curso.', AVISO);
        var th = Math.max(30, L * 0.011), D = new Draw(th), yb = rec + dest + db / 2, yt = h - rec - dest - 6.35, k;
        D.text(0, h + th * 8, 'DESPIECE DE VIGA DV-1 — ELEVACION (mm)', { h: th * 1.5 }); D.text(0, h + th * 6, 'L = ' + F(L) + ' · b×h = ' + b + '×' + h, { h: th * 0.9 }); D.rect(0, 0, L, h, 'CONTORNO'); D.rect(-150, -h * 0.5, 300, h * 0.5, 'CONTORNO'); D.rect(L - 150, -h * 0.5, 300, h * 0.5, 'CONTORNO');
        D.line(rec, yb, L - rec, yb, 'ARMADURA'); D.line(rec, yb, rec, yb + hook > h - rec ? h - rec : yb + Math.min(hook, h - 2 * rec - 20), 'ARMADURA'); D.line(L - rec, yb, L - rec, yb + Math.min(hook, h - 2 * rec - 20), 'ARMADURA'); D.balloon(L / 2, yb - th * 2.2, 1); D.text(L / 2 + th * 2, yb - th * 2.2, c.nBars + ' Ø#' + c.bar + ' L=' + F(Lm1), { h: th * 0.85 });
        D.line(rec, yt, L - rec, yt, 'ARMADURA', 4); D.balloon(L * 0.5, yt + th * 2.2, 2); D.text(L * 0.5 + th * 2, yt + th * 2.2, '2 Ø#4 L=' + F(Lm2), { h: th * 0.85, aci: 4 });
        var cnt = 0; for (k = c.sEnd / 2; k < zE; k += c.sEnd) { D.line(k, rec, k, h - rec, 'ARMADURA', 3); D.line(L - k, rec, L - k, h - rec, 'ARMADURA', 3); cnt += 2; } for (k = zE + c.sMid; k < L - zE; k += c.sMid) { D.line(k, rec, k, h - rec, 'ARMADURA', 3); cnt++; }
        D.balloon(zE / 2, h * 0.5, 3); D.text(zE / 2 + th * 2, h * 0.5, 'Ø#3 @' + c.sEnd + '\nL = ' + F(Lest) + ' c/u', { h: th * 0.85, aci: 3 }); D.text(L / 2, h * 0.5, 'Ø#3 @' + c.sMid + ' (centro)\nL = ' + F(Lest) + ' c/u', { h: th * 0.85, aci: 3, ha: 1, va: 2 }); D.dim(0, 0, zE, 0, -th * 1.8, '2h = ' + F(zE)); D.dim(zE, 0, L - zE, 0, -th * 1.8, '@ ' + c.sMid); D.dim(L - zE, 0, L, 0, -th * 1.8, '2h = ' + F(zE)); D.dim(0, h, L, h, th * 2.2, 'L = ' + F(L));
        var sy = -h * 0.5 - th * 12 - h; D.section(0, sy, b, h, rec, dest, { n: c.nBars, no: c.bar }, { n: 2, no: 4 }, 'SECCION A-A (centro)'); D.section(b + 1600, sy, b, h, rec, dest, { n: c.nBars, no: c.bar }, { n: 2, no: 4 }, 'SECCION B-B (apoyo)');
        // formas de barra
        var fx = 2 * b + 1600 + 800, fy = sy + h; D.text(fx, fy + th * 2, 'FORMAS DE BARRA', { h: th * 1.1 }); D.balloon(fx, fy - th * 2, 1); D.line(fx + th * 2, fy - th * 2, fx + th * 2 + 1500, fy - th * 2, 'ARMADURA'); D.line(fx + th * 2, fy - th * 2, fx + th * 2, fy - th * 2 + 250, 'ARMADURA'); D.line(fx + th * 2 + 1500, fy - th * 2, fx + th * 2 + 1500, fy - th * 2 + 250, 'ARMADURA'); D.text(fx + th * 2 + 750, fy - th * 3.5, F(L - 2 * rec) + ' + 2×' + F(hook), { ha: 1, h: th * 0.8 });
        D.balloon(fx, fy - th * 8, 3); var sx0 = fx + th * 2, sy0 = fy - th * 8 - 100; D.rect(sx0, sy0, b - 2 * rec, h - 2 * rec, 'ARMADURA', 3); D.line(sx0 + (b - 2 * rec), sy0 + (h - 2 * rec), sx0 + (b - 2 * rec) - hk * 0.7, sy0 + (h - 2 * rec) - hk * 0.7, 'ARMADURA', 3); D.text(sx0 + (b - 2 * rec) + th, sy0 + (h - 2 * rec) / 2, 'gancho 135° ext. ' + F(hk), { h: th * 0.8 });
        var rows = [bomRow('Inferior', 1, c.bar, c.nBars, Lm1), bomRow('Superior', 2, 4, 2, Lm2), bomRow('Estribos', 3, 3, nE, Lest)], bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'DESPIECE DE VIGA', bom), bom: bom, calc: { marks: 3, nE: nE } };
    };

    /* ============================================================================
     * 5b) DESPIECE DE COLUMNA — barras longitudinales con traslapo, estribos y sección
     * ========================================================================== */
    S.despieceColumna = function (o) {
        var r = S.columna(o); if (!r.ok) return r; o = Object.assign({ Pu: 1500, b: 400, h: 400, Lu: 3, rec: 40 }, o || {}); var c = r.calc, b = o.b, h = o.h, Lu = o.Lu * 1000, rec = o.rec, dest = BARS[3][0], db = BARS[c.bar][0], warns = r.warns.slice(), memo = [];
        var lap = Math.ceil(40 * db / 50) * 50, hookF = 12 * db, Lbar = Lu + lap + hookF, hk = Math.max(6 * dest, 75), Lest = 2 * (b - 2 * rec) + 2 * (h - 2 * rec) + 2 * hk, lo = Math.max(c.lo || 500, Math.max(b, h, Lu / 6)), nE = 2 * Math.round(lo / c.sConf) + Math.max(0, Math.round((Lu - 2 * lo) / c.sMid)) + 1;
        memo.push('DESPIECE DE ARMADURA DE COLUMNA — ESQUEMATICO (educativo)', 'Unidades: mm.', 'Base: columna rectangular b×h = ' + b + '×' + h + ' mm, altura libre Lu = ' + o.Lu + ' m, ' + c.nBars + ' Ø#' + c.bar + '.',
            'Marca 1: ' + c.nBars + ' Ø#' + c.bar + ' longitudinales: Lu + traslapo (≈ 40db = ' + lap + ' mm) + gancho en zapata (12db = ' + hookF + ') = ' + F(Lbar, 0) + ' mm',
            'Marca 2: estribos Ø#3 con ganchos a 135° (ext. ' + F(hk, 0) + '): ' + F(Lest, 0) + ' mm · ' + nE + ' uds · zona de confinamiento lo = ' + F(lo, 0) + ' mm en cada extremo @ ' + c.sConf + ' mm; zona central @ ' + c.sMid + ' mm',
            'Traslapo y longitud de desarrollo son valores ORIENTATIVOS (40db): calcule según ACI 318 cap. 25 / NSR-10 C.12. Ganchos suplementarios para barras intermedias no se incluyen.', AVISO);
        var th = Math.max(35, Lu * 0.014), D = new Draw(th), i, k;
        D.text(0, Lu + th * 8, 'DESPIECE DE COLUMNA DC-1 — ELEVACION Y SECCION (mm)', { h: th * 1.5 }); D.text(0, Lu + th * 6, 'b×h = ' + b + '×' + h + ' · Lu = ' + F(Lu), { h: th * 0.9 });
        D.rect(0, 0, b, Lu, 'CONTORNO'); D.rect(-300, -400, b + 600, 400, 'CONTORNO'); D.hatch(-300, -400, b + 600, 400, th * 3);
        var xl = rec + dest + db / 2, xr = b - xl; [xl, xr].forEach(function (x) { D.line(x, -300, x, Lu + lap * 0.6, 'ARMADURA'); }); D.line(xl, -300, xl + hookF, -300, 'ARMADURA'); D.line(xr, -300, xr - hookF, -300, 'ARMADURA');
        for (var y = 50; y < lo; y += c.sConf) { D.line(rec, y, b - rec, y, 'ARMADURA', 3); D.line(rec, Lu - y, b - rec, Lu - y, 'ARMADURA', 3); } for (var y2 = lo + c.sMid; y2 < Lu - lo; y2 += c.sMid) D.line(rec, y2, b - rec, y2, 'ARMADURA', 3);
        D.balloon(b + th * 4, Lu * 0.55, 1); D.text(b + th * 6.5, Lu * 0.55, c.nBars + ' Ø#' + c.bar + ' L=' + F(Lbar), { h: th * 0.9 }); D.balloon(b + th * 4, lo / 2, 2); D.text(b + th * 6.5, lo / 2, 'Ø#3 @' + c.sConf + ' (lo = ' + F(lo) + ')\nL = ' + F(Lest) + ' c/u', { h: th * 0.9, aci: 3 }); D.text(b + th * 6.5, Lu / 2 - th * 4, 'Ø#3 @' + c.sMid + '\nL = ' + F(Lest) + ' c/u', { h: th * 0.9, aci: 3 });
        D.dim(0, 0, 0, lo, -th * 2.4, 'lo = ' + F(lo)); D.dim(0, lo, 0, Lu - lo, -th * 2.4, F(Lu - 2 * lo)); D.dim(0, Lu - lo, 0, Lu, -th * 2.4, 'lo = ' + F(lo)); D.dim(b, 0, b, Lu, th * 14, 'Lu = ' + F(Lu)); D.text(b / 2, Lu + lap * 0.6 + th * 1.5, 'traslapo ' + lap, { ha: 1, h: th * 0.8 });
        var cx = b + th * 30, cy = Lu * 0.4, n = c.nBars; D.rect(cx, cy, b, h, 'CONTORNO'); D.rect(cx + rec, cy + rec, b - 2 * rec, h - 2 * rec, 'ARMADURA', 3);
        var x0 = cx + rec + dest + db / 2, x1 = cx + b - rec - dest - db / 2, y0 = cy + rec + dest + db / 2, y1 = cy + h - rec - dest - db / 2, rest = Math.max(0, n - 4), kh = Math.round(rest * b / (b + h) / 2) * 2, kv = rest - kh, pts = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]];
        for (k = 1; k <= Math.ceil(kh / 2); k++) pts.push([x0 + (x1 - x0) * k / (Math.ceil(kh / 2) + 1), y0]); for (k = 1; k <= Math.floor(kh / 2); k++) pts.push([x0 + (x1 - x0) * k / (Math.floor(kh / 2) + 1), y1]); for (k = 1; k <= Math.ceil(kv / 2); k++) pts.push([x0, y0 + (y1 - y0) * k / (Math.ceil(kv / 2) + 1)]); for (k = 1; k <= Math.floor(kv / 2); k++) pts.push([x1, y0 + (y1 - y0) * k / (Math.floor(kv / 2) + 1)]);
        pts.slice(0, Math.max(4, n)).forEach(function (p) { D.circle(p[0], p[1], db / 2, 'ARMADURA'); }); D.dim(cx, cy, cx + b, cy, -th * 1.8, 'b = ' + b); D.dim(cx + b, cy, cx + b, cy + h, th * 1.8, 'h = ' + h); D.text(cx + b / 2, cy + h + th * 1.5, 'SECCION ' + c.nBars + ' Ø#' + c.bar + ' + Ø#3', { ha: 1, h: th });
        var rows = [bomRow('Longitudinal', 1, c.bar, c.nBars, Lbar), bomRow('Estribos', 2, 3, nE, Lest)], bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'DESPIECE DE COLUMNA', bom), bom: bom, calc: { nE: nE, lap: lap } };
    };
})(typeof window !== 'undefined' ? window : globalThis);
