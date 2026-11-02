/**
 * Civix CAD — CANTIDADES DE OBRA y DIAGRAMA DE CORTANTE para todos los diseños estructurales.
 * Envuelve cada generador S.<tipo>(o): suma el cuadro de acero (kg por diámetro, n.º de estribos, metros),
 * estima concreto (m³) y formaleta (m²) a partir de las dimensiones adoptadas y, en vigas, añade el
 * diagrama de cortante al plano. Todo local, sin IA. Cantidades aproximadas (sin desperdicio ni traslapos).
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || !CAD.struct || !CAD.struct._h || CAD.struct.__v8) return; var S = CAD.struct; S.__v8 = true; var H = S._h;
    var F = H.F, Draw = H.Draw, PI = Math.PI;
    function dflt(k, o) { return Object.assign({}, DEF[k] || {}, o || {}); }
    var DEF = {
        viga: { L: 6, b: 300, h: 500 }, despieceViga: { L: 6, b: 300, h: 500 }, vigaCont: { n: 2, L1: 5, L2: 5, L3: 5, b: 300, h: 500, cap: 300 }, vigaT: { L: 6, bw: 300, h: 550, hf: 100 },
        columna: { b: 400, h: 400, Lu: 3 }, despieceColumna: { b: 400, h: 400, Lu: 3 }, columnaC: { D: 450, Lu: 3 }, zapata: {}, zapataComb: {}, zapataCorr: {},
        muro: { H: 3 }, muroC: { H: 3 }, losa: { Lx: 4, Ly: 7 }, losa2d: { Lx: 4, Ly: 5 }, losaNerv: { L: 6, Ly: 5, bw: 120, s: 800, hf: 50 }, escalera: { H: 3, b: 1.2, huella: 28 },
        pilote: { D: 400, L: 12, n: 4 }, muroCorte: { Lw: 4, hw: 9, tw: 200 }, puente: { tipo: 1, L: 10, Wc: 7.2, Wa: 0.8 }
    };
    /* volumen (m³) y formaleta (m²) por tipo */
    var GEO = {
        viga: function (o) { var L = o.L, b = o.b / 1000, h = o.h / 1000; return { v: b * h * L, f: (b + 2 * h) * L, d: 'viga ' + o.b + '×' + o.h + ' mm, L = ' + L + ' m' }; },
        vigaCont: function (o) { var n = o.n === 3 ? 3 : 2, L = [o.L1, o.L2, o.L3].slice(0, n).reduce(function (a, c) { return a + c; }, 0) + o.cap / 1000, b = o.b / 1000, h = o.h / 1000; return { v: b * h * L, f: (b + 2 * h) * L, d: 'viga continua ' + n + ' tramos, L total = ' + F(L, 2) + ' m' }; },
        vigaT: function (o, r) { var be = (r.calc.be || o.bw * 4) / 1000, bw = o.bw / 1000, h = o.h / 1000, hf = o.hf / 1000; return { v: (bw * (h - hf) + be * hf) * o.L, f: (be + 2 * h) * o.L, d: 'viga T/L, be = ' + F(be * 1000, 0) + ' mm' }; },
        columna: function (o) { var b = o.b / 1000, h = o.h / 1000; return { v: b * h * o.Lu, f: 2 * (b + h) * o.Lu, d: 'columna ' + o.b + '×' + o.h + ' mm, H = ' + o.Lu + ' m' }; },
        columnaC: function (o) { var D = o.D / 1000; return { v: PI * D * D / 4 * o.Lu, f: PI * D * o.Lu, d: 'columna Ø' + o.D + ' mm, H = ' + o.Lu + ' m' }; },
        zapata: function (o, r) { var B = r.calc.B, h = r.calc.h / 1000; return { v: B * B * h, f: 4 * B * h, d: 'zapata ' + F(B, 2) + '×' + F(B, 2) + '×' + F(h, 2) + ' m' }; },
        zapataComb: function (o, r) { var L = r.calc.L, B = r.calc.B, h = r.calc.h / 1000; return { v: L * B * h, f: 2 * (L + B) * h, d: 'zapata combinada ' + F(L, 2) + '×' + F(B, 2) + '×' + F(h, 2) + ' m' }; },
        zapataCorr: function (o, r) { var B = r.calc.B, h = r.calc.h / 1000; return { v: B * h, f: 2 * h, d: 'zapata corrida, por metro de muro' }; },
        muro: function (o, r) { var c = r.calc, Hh = o.H, v = c.B * c.hz + Hh * (0.25 + c.tBot) / 2; return { v: v, f: 2 * Hh + c.B * 0 + 2 * c.hz + 0, d: 'muro de contención, por metro de longitud' }; },
        muroC: function (o, r) { var c = r.calc, Hh = o.H, hz = Math.max(0.30, Math.ceil(Hh / 10 / 0.05) * 0.05), tb = Math.max(0.30, Math.ceil(Hh / 11 / 0.05) * 0.05); return { v: c.B * hz + Hh * (0.25 + tb) / 2 + (c.key || 0) * 0.3, f: 2 * Hh + 2 * hz, d: 'muro de contención completo, por metro de longitud' }; },
        losa: function (o, r) { var h = r.calc.h / 1000; return { v: o.Lx * o.Ly * h, f: o.Lx * o.Ly + 2 * (o.Lx + o.Ly) * h, d: 'losa ' + o.Lx + '×' + o.Ly + ' m, h = ' + r.calc.h + ' mm' }; },
        losa2d: function (o, r) { var h = r.calc.h / 1000; return { v: o.Lx * o.Ly * h, f: o.Lx * o.Ly + 2 * (o.Lx + o.Ly) * h, d: 'losa 2 direcciones ' + o.Lx + '×' + o.Ly + ' m, h = ' + r.calc.h + ' mm' }; },
        losaNerv: function (o, r) { var h = r.calc.h / 1000, hf = o.hf / 1000, bw = o.bw / 1000, s = o.s / 1000, nn = o.Ly / s; return { v: o.L * o.Ly * hf + nn * bw * (h - hf) * o.L, f: o.L * o.Ly + nn * 2 * (h - hf) * o.L, d: 'losa nervada (loseta + nervios; sin casetón)' }; },
        escalera: function (o, r) { var n = r.calc.n, rr = r.calc.r / 100, g = o.huella / 100, t = r.calc.t / 1000, Lh = (n - 1) * g, Linc = Math.sqrt(Lh * Lh + Math.pow(o.H * (n - 1) / n, 2)); return { v: o.b * (Linc * t + n * 0.5 * rr * g), f: o.b * Linc + 2 * Linc * t, d: 'escalera: ' + n + ' contrapasos, garganta ' + r.calc.t + ' mm' }; },
        pilote: function (o, r) { var D = o.D / 1000, n = o.n === 2 ? 2 : 4, h = r.calc.h / 1000, sD = (o.sD || 3) * D, Ld = n === 2 ? sD + D + 0.3 : sD + D + 0.3, Bd = n === 2 ? D + 0.3 : sD + D + 0.3; return { v: n * PI * D * D / 4 * o.L + Ld * Bd * h, f: 2 * (Ld + Bd) * h, d: n + ' pilotes Ø' + o.D + ' mm × ' + o.L + ' m + dado' }; },
        muroCorte: function (o) { var t = o.tw / 1000; return { v: o.Lw * o.hw * t, f: 2 * o.Lw * o.hw + 2 * t * o.hw, d: 'muro ' + o.Lw + '×' + o.hw + ' m, t = ' + o.tw + ' mm' }; },
        puente: function (o, r) { if (o.tipo !== 1) return null; var h = r.calc.h / 1000, W = o.Wc + 2 * o.Wa; return { v: o.L * W * h, f: o.L * W + 2 * o.L * h, d: 'losa maciza ' + o.L + ' m × ' + F(W, 2) + ' m, h = ' + r.calc.h + ' mm' }; }
    };
    GEO.despieceViga = GEO.viga; GEO.despieceColumna = GEO.columna;

    function resumenAcero(bom) {
        if (!bom || !bom.head || !bom.rows || !bom.rows.length) return null;
        var hasMk = bom.head[0] === 'Marca', last = bom.head[bom.head.length - 1]; if (String(last).indexOf('Peso') !== 0) return null;
        var o = hasMk ? 1 : 0, byBar = {}, kg = 0, m = 0, stir = 0, stirM = 0, spiralM = 0;
        bom.rows.forEach(function (r) {
            if (String(r[o]).indexOf('TOTAL') === 0) return;
            var el = String(r[o]), bar = String(r[o + 1]), mt = /#(\d+)/.exec(bar), no = mt ? '#' + mt[1] : bar, n = +r[o + 2] || 0, tm = +r[o + 4 + 1 - 1 + 0] || 0, tot = +r[r.length - 2] || 0, w = +r[r.length - 1] || 0;
            kg += w; m += tot; var k = byBar[no] || (byBar[no] = { m: 0, kg: 0 }); k.m += tot; k.kg += w;
            if (/estribo|zuncho/i.test(el)) { stir += n; stirM += tot; } else if (/espiral/i.test(el)) spiralM += tot;
        });
        return { kg: kg, m: m, byBar: byBar, stir: stir, stirM: stirM, spiralM: spiralM };
    }

    function addQty(k, o, r) {
        if (!r || !r.ok || r.__qty) return r; r.__qty = true;
        var a = resumenAcero(r.bom), g = null; try { g = GEO[k] ? GEO[k](dflt(k, o), r) : null; } catch (e) { g = null; }
        if (!a && !g) return r;
        var items = [], lines = ['CANTIDADES DE OBRA (aproximadas, sin desperdicio ni traslapos):'];
        if (a) {
            Object.keys(a.byBar).sort().forEach(function (b) { items.push(['Acero ' + b, F(a.byBar[b].m, 1) + ' m', F(a.byBar[b].kg, 1) + ' kg']); lines.push(' · Acero ' + b + ': ' + F(a.byBar[b].m, 1) + ' m → ' + F(a.byBar[b].kg, 1) + ' kg'); });
            if (a.stir) { items.push(['Estribos / zunchos', a.stir + ' un.', F(a.stirM, 1) + ' m']); lines.push(' · Estribos: ' + a.stir + ' unidades (' + F(a.stirM, 1) + ' m de barra)'); }
            if (a.spiralM) { items.push(['Espiral', F(a.spiralM, 1) + ' m', '']); lines.push(' · Espiral: ' + F(a.spiralM, 1) + ' m de barra'); }
            items.push(['ACERO TOTAL', F(a.m, 1) + ' m', F(a.kg, 1) + ' kg']); lines.push(' · ACERO TOTAL: ' + F(a.m, 1) + ' m de barra → ' + F(a.kg, 1) + ' kg');
        }
        if (g) {
            items.push(['Concreto', F(g.v, 3) + ' m³', '']); items.push(['Formaleta', F(g.f, 2) + ' m²', '']); lines.push(' · Concreto: ' + F(g.v, 3) + ' m³ · Formaleta: ' + F(g.f, 2) + ' m² (' + g.d + ')');
            if (a && g.v > 0) { items.push(['Cuantía de acero', F(a.kg / g.v, 0) + ' kg/m³', '']); lines.push(' · Cuantía ≈ ' + F(a.kg / g.v, 0) + ' kg/m³'); }
        }
        var i = r.memo.length; for (var q = 0; q < r.memo.length; q++) if (/^NO verificado|^CANTIDADES DE OBRA/.test(r.memo[q])) { i = q; break; }
        if (!r.memo.some(function (x) { return /^CANTIDADES DE OBRA/.test(x); })) r.memo.splice.apply(r.memo, [i, 0].concat(lines));
        r.qty = { items: items, kg: a ? a.kg : 0, vol: g ? g.v : 0, form: g ? g.f : 0 };
        return r;
    }

    /* diagrama de cortante añadido al plano (a la derecha del dibujo) */
    function shearModel(model, L, vs, label, th) {
        var bb = CAD.bboxOf(model.ents), D = new Draw(th), Lmm = L * 1000, Vabs = Math.max.apply(null, vs.map(function (p) { return Math.abs(p[1]); }).concat([1])), sc = th * 14 / Vabs, x0 = bb[2] + th * 12, y0 = bb[1] + th * 30, i;
        D.text(x0, y0 + th * 18, 'DIAGRAMA DE CORTANTE ' + label + ' (kN)', { h: th * 1.1 }); D.line(x0, y0, x0 + Lmm, y0, 'EJES');
        var pts = [[x0, y0]]; vs.forEach(function (p) { pts.push([x0 + p[0] * 1000, y0 + p[1] * sc]); }); pts.push([x0 + Lmm, y0]); D.poly(pts, true, 'SOMBRA');
        var f = vs[0], l = vs[vs.length - 1]; D.text(x0, y0 + f[1] * sc + (f[1] >= 0 ? th * 0.8 : -th * 1.8), 'V = ' + F(f[1], 1), { h: th * 0.85 }); D.text(x0 + Lmm, y0 + l[1] * sc + (l[1] >= 0 ? th * 0.8 : -th * 1.8), 'V = ' + F(l[1], 1), { ha: 2, h: th * 0.85 });
        for (i = 1; i < vs.length; i++) if (vs[i - 1][1] * vs[i][1] < 0) { var xz = vs[i - 1][0] + (vs[i][0] - vs[i - 1][0]) * vs[i - 1][1] / (vs[i - 1][1] - vs[i][1]); D.circle(x0 + xz * 1000, y0, th * 0.35, 'TEXTO'); D.text(x0 + xz * 1000, y0 - th * 1.8, 'V = 0 en x = ' + F(xz, 2) + ' m', { ha: 1, h: th * 0.8 }); }
        D.text(x0, y0 - th * 4, '(+) hacia arriba · Vmáx = ' + F(Vabs, 1) + ' kN', { h: th * 0.8 });
        D.ents.forEach(function (e) { model.ents.push(e); }); Object.keys(D.layers).forEach(function (k) { if (!model.layers[k]) model.layers[k] = D.layers[k]; }); model.bbox = CAD.bboxOf(model.ents);
    }
    function lin(L, wu, Va, n) { var out = [], i; for (i = 0; i <= n; i++) { var x = L * i / n; out.push([x, Va - wu * x]); } return out; }
    var SHEAR = {
        viga: function (o, r) { var wu = r.calc.wu, L = o.L; return { L: L, vs: lin(L, wu, wu * L / 2, 60), lab: 'VIGA SIMPLEMENTE APOYADA', th: Math.max(60, L * 18) }; },
        despieceViga: function (o) { var rr = S.viga(o); if (!rr.ok) return null; return SHEAR.viga(o, rr); },
        vigaT: function (o, r) { var L = o.L, wu = 8 * r.calc.Mu / (L * L); return { L: L, vs: lin(L, wu, wu * L / 2, 60), lab: 'VIGA T/L', th: Math.max(60, L * 18) }; },
        vigaCont: function (o, r) {
            var n = o.n === 3 ? 3 : 2, Ls = [o.L1, o.L2, o.L3].slice(0, n), wu = r.calc.wu, x = 0, vs = [], i;
            for (i = 0; i < n; i++) { var ln = Ls[i] - o.cap / 1000, a = i === 0 ? 1 : 1, c = (i === 0 || i === n - 1 ? 1 : 1);
                var left = wu * ln / 2 * (i === 0 ? 1 : 1), right = -wu * ln / 2 * ((i === 0 && n > 1) || (i === n - 1 && n > 1 && i > 0) ? 1.15 : 1); if (i === n - 1 && i > 0) { left = wu * ln / 2 * 1.15; right = -wu * ln / 2; } if (i === 0) { left = wu * ln / 2; right = -1.15 * wu * ln / 2; }
                vs.push([x, left], [x + Ls[i], right]); x += Ls[i]; }
            return { L: x, vs: vs, lab: 'VIGA CONTINUA (coef. ACI aprox.)', th: Math.max(60, x * 18) };
        }
    };

    ['viga', 'despieceViga', 'vigaCont', 'vigaT', 'columna', 'despieceColumna', 'columnaC', 'zapata', 'zapataComb', 'zapataCorr', 'muro', 'muroC', 'losa', 'losa2d', 'losaNerv', 'escalera', 'pilote', 'muroCorte', 'puente'].forEach(function (k) {
        var f0 = S[k]; if (typeof f0 !== 'function') return;
        S[k] = function (o) {
            var r = f0.apply(this, arguments);
            try {
                if (r && r.ok) {
                    if (SHEAR[k] && r.model && !r.__shear) { var sh = SHEAR[k](dflt(k, o), r); if (sh) { shearModel(r.model, sh.L, sh.vs, sh.lab, sh.th); r.__shear = true; r.memo.splice(Math.max(0, r.memo.length - 2), 0, 'DIAGRAMA DE CORTANTE: V(apoyo izq.) = ' + F(sh.vs[0][1], 1) + ' kN · V(apoyo der.) = ' + F(sh.vs[sh.vs.length - 1][1], 1) + ' kN (kN, carga factorada; ver plano).'); } }
                    addQty(k, o, r);
                }
            } catch (e) { try { console.warn('CivixCAD cantidades', k, e); } catch (e2) { } }
            return r;
        };
    });
    var va = S.vigaApoyos; if (typeof va === 'function') S.vigaApoyos = function (o) { var r = va.apply(this, arguments); try { if (r && r.ok && !r.qty) { var a = resumenAcero(r.bom); var vol = r.calc.concreteM3; r.qty = { items: [['ACERO TOTAL', '', F(r.calc.steelKg, 1) + ' kg'], ['Estribos', r.calc.nStir + ' un.', ''], ['Concreto', F(vol, 3) + ' m³', '']], kg: r.calc.steelKg, vol: vol }; } } catch (e) { } return r; };
})(typeof window !== 'undefined' ? window : globalThis);
