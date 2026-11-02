/**
 * Civix CAD — Viga con APOYOS A ELECCIÓN (articulado, rodillo, empotrado, libre en cada extremo).
 * Análisis por elementos finitos de Euler-Bernoulli (EstCalc.beamSupports) + diseño a flexión/cortante
 * (ACI 318 / NSR-10, educativo) + DXF con apoyos dibujados según el tipo y diagrama de momentos.
 * Corre en el navegador, sin IA ni tokens. NO sustituye el diseño de un ingeniero estructural.
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || !CAD.struct || !CAD.struct._h || CAD.struct.__v7) return; var S = CAD.struct; S.__v7 = true; var H = S._h;
    var PI = Math.PI, BARS = H.BARS, F = H.F, Draw = H.Draw, needAs = H.needAs, pickBars = H.pickBars, bomRow = H.bomRow, BOMH = H.BOMH, finish = H.finish, fail = H.fail, AVISO = H.AVISO, stir = H.stir, phiMn = H.phiMn;
    var NAMES = { pin: 'articulado (pasador)', roller: 'rodillo', fixed: 'empotrado', free: 'libre (voladizo)' };

    function support(D, x, y, kind, side, h) {
        var t = D.th * 2.2;
        if (kind === 'pin') { D.poly([[x, y], [x - t / 2, y - t], [x + t / 2, y - t]], true, 'APOYOS'); D.line(x - t, y - t, x + t, y - t, 'APOYOS'); D.hatch(x - t, y - t * 1.5, t * 2, t * 0.5, D.th * 0.6); }
        else if (kind === 'roller') { D.poly([[x, y], [x - t / 2, y - t * 0.8], [x + t / 2, y - t * 0.8]], true, 'APOYOS'); D.circle(x - t * 0.25, y - t * 0.95, t * 0.15, 'APOYOS'); D.circle(x + t * 0.25, y - t * 0.95, t * 0.15, 'APOYOS'); D.line(x - t, y - t * 1.1, x + t, y - t * 1.1, 'APOYOS'); }
        else if (kind === 'fixed') { var wd = t * 0.9, hh = h * 1.8, x0 = side < 0 ? x - wd : x; D.rect(x0, -h * 0.4, wd, hh, 'APOYOS'); D.hatch(x0, -h * 0.4, wd, hh, D.th * 0.7); }
    }

    S.vigaApoyos = function (o) {
        o = Object.assign({ L: 5, sl: 'pin', sr: 'roller', b: 300, h: 500, wD: 12, wL: 8, fc: 21, fy: 420, rec: 40 }, o || {});
        var NUM = { 1: 'pin', 2: 'roller', 3: 'fixed', 4: 'free' };
        var sl = NUM[o.sl] || o.sl, sr = NUM[o.sr] || o.sr, L = +o.L, b = +o.b, h = +o.h, fc = +o.fc, fy = +o.fy, rec = +o.rec, dest = BARS[3][0], warns = [], memo = [];
        if (!global.EstCalc || !EstCalc.beamSupports) return fail('Falta el módulo de análisis (est-calc.js).');
        if (!(L >= 1 && L <= 20)) return fail('La luz debe estar entre 1 y 20 m.');
        var wself = 24 * b * h / 1e6, wu = 1.2 * (o.wD + wself) + 1.6 * o.wL, r;
        try { r = EstCalc.beamSupports({ L: L, P: 0, w: wu, E: 4700 * Math.sqrt(fc), b: b, h: h, sl: sl, sr: sr }); } catch (e) { return fail(e.message || 'Configuración de apoyos no válida (mecanismo).'); }
        var Mp = Math.max(0, r.Mpos), Mn = Math.max(0, -r.Mneg), d0 = h - rec - dest - 10, i;
        function des(Mu, lab) { var a = needAs(Math.max(Mu, 0.5), b, d0, fc, fy), bars = pickBars(a.As, b, rec, dest), dd = h - rec - dest - bars.db / 2, pm = phiMn(bars.As, b, dd, fc, fy); if (!a.ok) warns.push(lab + ': ρ > ρmáx: aumenta h o b.'); if (!bars.fit) warns.push(lab + ': las barras no caben en una capa: aumenta b.'); if (pm < Mu) warns.push(lab + ': φMn = ' + F(pm, 1) + ' < Mu = ' + F(Mu, 1) + ' kN·m.'); return { a: a, bars: bars, pm: pm, d: dd }; }
        var P = des(Mp, 'Flexión positiva (inferior)'), N = des(Mn, 'Flexión negativa (superior)');
        var dd = Math.min(P.d, N.d), Vu = Math.max(0, Math.abs(r.Vmax) - wu * dd / 1000), st = stir(Vu, b, dd, fc, fy, Math.min(P.bars.db, N.bars.db));
        if (!st.ok) warns.push('Vs > 0.66√f′c·b·d: aumenta la sección por cortante.');
        if (r.dmax > L * 1000 / 240) warns.push('Flecha elástica del análisis (' + F(r.dmax, 1) + ' mm, sección bruta) > L/240: revisa deflexiones con inercia fisurada.');
        if (L * 1000 / h > 16) warns.push('L/h > 16: la viga puede ser esbelta; verifica deflexiones.');
        memo.push('VIGA CON APOYOS A ELECCIÓN — PREDIMENSIONAMIENTO (análisis elástico + ACI 318 / NSR-10, educativo)',
            'Apoyo izquierdo: ' + NAMES[sl] + ' · Apoyo derecho: ' + NAMES[sr] + ' → viga ' + r.clase + '.',
            'Datos: L = ' + L + ' m · b×h = ' + b + '×' + h + ' mm · f′c = ' + fc + ' MPa · fy = ' + fy + ' MPa · rec. = ' + rec + ' mm',
            'Cargas: wD = ' + o.wD + ' + peso propio ' + F(wself, 2) + ' kN/m · wL = ' + o.wL + ' kN/m → wu = 1.2D + 1.6L = ' + F(wu, 2) + ' kN/m',
            'Reacciones (factoradas): RA = ' + F(r.RA, 1) + ' kN · RB = ' + F(r.RB, 1) + ' kN' + (sl === 'fixed' ? ' · MA = ' + F(r.MA, 1) + ' kN·m' : '') + (sr === 'fixed' ? ' · MB = ' + F(r.MB, 1) + ' kN·m' : ''),
            'Momento positivo máx. M⁺ = ' + F(Mp, 1) + ' kN·m (x = ' + F(r.xM, 2) + ' m) · momento negativo máx. M⁻ = ' + F(Mn, 1) + ' kN·m',
            'Inferior: As = ' + F(P.a.As, 0) + ' mm² → ' + P.bars.n + ' Ø#' + P.bars.no + ' · φMn = ' + F(P.pm, 1) + ' kN·m',
            'Superior: As = ' + F(N.a.As, 0) + ' mm² → ' + N.bars.n + ' Ø#' + N.bars.no + ' · φMn = ' + F(N.pm, 1) + ' kN·m' + (Mn < 1 ? ' (momento despreciable: se coloca acero mínimo)' : ''),
            'Cortante: Vu(d) = ' + F(Vu, 1) + ' kN · φVc = ' + F(st.phiVc, 1) + ' kN → estribos Ø#3: extremos @ ' + st.sEnd + ' mm (zona 2h), centro @ ' + st.sMid + ' mm',
            'Flecha elástica máx. (sección bruta, carga factorada): ' + F(r.dmax, 1) + ' mm.',
            'NO verificado: patrones de carga, longitudes de desarrollo y corte exacto de barras, torsión, sismo, deflexión a largo plazo.', AVISO);
        /* dibujo */
        var Lmm = L * 1000, th = Math.max(40, Lmm * 0.016), D = new Draw(th), yb = rec + dest + 8, yt = h - rec - dest - 8;
        D.text(0, h + th * 8, 'VIGA VA-1 — ' + NAMES[sl].toUpperCase() + ' / ' + NAMES[sr].toUpperCase() + ' (mm)', { h: th * 1.4 });
        D.text(0, h + th * 6, 'L = ' + L + ' m · b×h = ' + b + '×' + h + ' · f′c ' + fc + ' · fy ' + fy + ' MPa · wu = ' + F(wu, 1) + ' kN/m', { h: th * 0.9 });
        D.rect(0, 0, Lmm, h, 'CONTORNO'); support(D, 0, 0, sl, -1, h); support(D, Lmm, 0, sr, 1, h);
        D.line(rec, yb, Lmm - rec, yb, 'ARMADURA'); D.text(Lmm / 2, yb + th * 0.4, P.bars.n + ' Ø#' + P.bars.no + ' (inf.)  L = ' + F(Lmm - 2 * rec + 300, 0) + ' mm', { ha: 1, h: th * 0.85 });
        var needL = sl === 'fixed' || sl === 'free' && false, topL = sl === 'fixed', topR = sr === 'fixed', cant = (sl === 'fixed' && sr === 'free') || (sr === 'fixed' && sl === 'free');
        var lt = cant ? Lmm - rec : 0.33 * Lmm;
        if (topL) { D.line(rec, yt - 25, lt, yt - 25, 'ARMADURA', 5); D.text(rec + 60, yt - 25 - th * 1.3, N.bars.n + ' Ø#' + N.bars.no + ' sup.', { h: th * 0.85, aci: 5 }); }
        if (topR) { D.line(Lmm - lt, yt - 25, Lmm - rec, yt - 25, 'ARMADURA', 5); D.text(Lmm - rec - 60, yt - 25 - th * 1.3, N.bars.n + ' Ø#' + N.bars.no + ' sup.', { ha: 2, h: th * 0.85, aci: 5 }); }
        D.line(rec, yt, Lmm - rec, yt, 'ARMADURA', 4); D.text(Lmm / 2, yt + th * 0.5, '2 Ø#4 porta-estribos  L = ' + F(Lmm - 2 * rec + 300, 0) + ' mm', { ha: 1, h: th * 0.8, aci: 4 });
        var x = 50, nst = 0; while (x < Lmm - 40 && nst < 800) { D.line(x, rec, x, h - rec, 'ARMADURA', 3); x += (x < 2 * h || x > Lmm - 2 * h) ? st.sEnd : st.sMid; nst++; }
        var Lst = F(2 * (b - 2 * rec) + 2 * (h - 2 * rec) + 150, 0); D.text(h, h / 2, 'E#3 @' + st.sEnd + '\nL = ' + Lst + ' mm c/u', { h: th * 0.8, ha: 1, va: 2, rot: PI / 2 }); D.text(Lmm / 2, h / 2, 'E#3 @' + st.sMid + ' (centro)\nL = ' + Lst + ' mm c/u', { h: th * 0.9, ha: 1, va: 2 });
        D.dim(0, h, Lmm, h, th * 2.6, 'L = ' + F(Lmm));
        /* diagrama de momentos (tracción hacia abajo: M⁺ se dibuja hacia abajo) */
        var Vabs = Math.max.apply(null, r.vs.map(Math.abs).concat([1])), scV = h * 1.2 / Vabs, yV = -h * 1.1 - th * 6;
        D.text(0, yV + h * 1.2 + th * 2, 'DIAGRAMA DE CORTANTE (kN, positivo hacia arriba)', { h: th * 1.0 }); D.line(0, yV, Lmm, yV, 'EJES');
        var pv = r.xs.map(function (xx, k) { return [xx * 1000, yV + r.vs[k] * scV]; }); pv.push([Lmm, yV]); pv.unshift([0, yV]); D.poly(pv, true, 'SOMBRA');
        D.text(0, yV + r.vs[0] * scV + (r.vs[0] >= 0 ? th * 0.8 : -th * 1.8), 'V = ' + F(r.vs[0], 1), { h: th * 0.85 });
        D.text(Lmm, yV + r.vs[r.vs.length - 1] * scV + (r.vs[r.vs.length - 1] >= 0 ? th * 0.8 : -th * 1.8), 'V = ' + F(r.vs[r.vs.length - 1], 1), { ha: 2, h: th * 0.85 });
        for (i = 1; i < r.vs.length; i++) if (r.vs[i - 1] * r.vs[i] < 0) { var xz = r.xs[i - 1] + (r.xs[i] - r.xs[i - 1]) * r.vs[i - 1] / (r.vs[i - 1] - r.vs[i]); D.circle(xz * 1000, yV, th * 0.35, 'TEXTO'); D.text(xz * 1000, yV - th * 1.8, 'V = 0 en x = ' + F(xz, 2) + ' m', { ha: 1, h: th * 0.8 }); break; }
        D.line(2 * h, yV - th * 3, 2 * h, yV + h * 1.2, 'COTAS'); D.line(Lmm - 2 * h, yV - th * 3, Lmm - 2 * h, yV + h * 1.2, 'COTAS'); D.text(2 * h, yV - th * 3.8, 'zona 2h', { ha: 1, h: th * 0.7 });
        var Mabs = Math.max(Mp, Mn, 1), sc = h * 1.4 / Mabs, y0 = yV - h * 1.2 - th * 12;
        D.text(0, y0 + h * 1.5 + th * 2, 'DIAGRAMA DE MOMENTOS (kN·m, tracción hacia abajo)', { h: th * 1.0 }); D.line(0, y0, Lmm, y0, 'EJES');
        var pts = r.xs.map(function (xx, k) { return [xx * 1000, y0 - r.ms[k] * sc]; }); pts.push([Lmm, y0]); pts.unshift([0, y0]);
        D.poly(pts, true, 'SOMBRA');
        D.text(r.xM * 1000, y0 - Mp * sc - th * 1.6, 'M⁺ = ' + F(Mp, 1), { ha: 1, h: th * 0.85 });
        if (Mn > 0.5) D.text(r.xMabs * 1000, y0 + Mn * sc + th * 0.8, 'M⁻ = ' + F(Mn, 1), { ha: 1, h: th * 0.85 });
        var sy = y0 - h * 1.6 - th * 12; D.section(0, sy, b, h, rec, dest, P.bars, { n: 2, no: 4 }, 'SECCION CENTRO'); D.section(b + 1600, sy, b, h, rec, dest, { n: 2, no: 4 }, N.bars, 'SECCION APOYO (sup.)');
        var rows = [], mk = 1; rows.push(bomRow('Inferior', mk++, P.bars.no, P.bars.n, Lmm - 2 * rec + 300));
        if (topL || topR) rows.push(bomRow('Superior (apoyo)', mk++, N.bars.no, N.bars.n * ((topL ? 1 : 0) + (topR ? 1 : 0)), lt));
        rows.push(bomRow('Porta-estribos', mk++, 4, 2, Lmm - 2 * rec + 300)); rows.push(bomRow('Estribos Ø#3', mk++, 3, nst, 2 * (b - 2 * rec) + 2 * (h - 2 * rec) + 150));
        var totKg = rows.reduce(function (t, q) { return t + q[6]; }, 0), totM = rows.reduce(function (t, q) { return t + q[5]; }, 0), vol = b * h * Lmm / 1e9, form = (b + 2 * h) * Lmm / 1e6;
        var nEnd = Math.ceil(2 * h / st.sEnd) * 2, nMid = Math.max(0, nst - nEnd);
        memo.splice(memo.length - 2, 0, 'CANTIDADES DE OBRA:',
            ' · Estribos Ø#3: ' + nst + ' unidades (≈ ' + nEnd + ' en zonas de 2h @ ' + st.sEnd + ' mm y ' + nMid + ' en el centro @ ' + st.sMid + ' mm), perímetro ' + F(2 * (b - 2 * rec) + 2 * (h - 2 * rec) + 150, 0) + ' mm c/u → ' + F(nst * (2 * (b - 2 * rec) + 2 * (h - 2 * rec) + 150) / 1000, 1) + ' m',
            ' · Acero longitudinal inferior: ' + P.bars.n + ' Ø#' + P.bars.no + ' × ' + F((Lmm - 2 * rec + 300) / 1000, 2) + ' m' + ((topL || topR) ? ' · superior de apoyo: ' + N.bars.n + ' Ø#' + N.bars.no + ' × ' + F(lt / 1000, 2) + ' m por cada apoyo empotrado' : '') + ' · porta-estribos 2 Ø#4',
            ' · Acero total ≈ ' + F(totKg, 1) + ' kg (' + F(totM, 1) + ' m de barra) · cuantía ≈ ' + F(totKg / vol, 0) + ' kg/m³',
            ' · Concreto: ' + F(vol, 3) + ' m³ · Formaleta (fondo + 2 caras): ' + F(form, 2) + ' m²',
            'CORTANTE: V en el apoyo izq. = ' + F(r.vs[0], 1) + ' kN · en el apoyo der. = ' + F(r.vs[r.vs.length - 1], 1) + ' kN · |Vmáx| = ' + F(Math.abs(r.Vmax), 1) + ' kN (ver diagrama en el plano).');
        var bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'VIGA ' + NAMES[sl] + ' / ' + NAMES[sr], bom), bom: bom, calc: { nStir: nst, steelKg: totKg, concreteM3: vol, wu: wu, RA: r.RA, RB: r.RB, Mpos: Mp, Mneg: Mn, clase: r.clase, stir: st } };
    };
})(typeof window !== 'undefined' ? window : globalThis);
