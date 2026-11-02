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

    /* diagramas de cortante y momento + distribución de estribos (a la derecha del dibujo) */
    function fmtS(n, s, len) { return n + ' @ ' + s + ' = ' + Math.round(len); }
    function extraModel(model, sp) {
        var stL = ''; model.ents = model.ents.filter(function (e) { if (e.t === 'text' && /c\/u/.test((e.s || []).join(' '))) { var mm = (e.s || []).join(' ').match(/L\s*=\s*[\d.,]+\s*(mm|m)/); if (mm && !stL) stL = mm[0]; return false; } return true; });
        var bb = CAD.bboxOf(model.ents), th = sp.th, D = new Draw(th * 0.85), i, x0 = bb[2] + th * 12, Lmm = sp.L * 1000, ysh = bb[1] + th * 95, ymo = ysh - th * 38, ystr = ymo - th * 40; if (!sp.vs && !sp.ms) ystr = bb[1] + th * 20; if (sp.kind !== 'col' && (sp.vs || sp.ms)) { x0 = 0; ysh = bb[1] - th * 36; ymo = ysh - th * 36; ystr = ymo - th * 28; }
        if (false && sp.vs) {
            var Vabs = Math.max.apply(null, sp.vs.map(function (p) { return Math.abs(p[1]); }).concat([1])), sc = th * 14 / Vabs;
            D.text(x0, ysh + th * 18, 'DIAGRAMA DE CORTANTE ' + sp.lab + ' (kN)', { h: th * 1.1 }); D.line(x0, ysh, x0 + Lmm, ysh, 'EJES');
            var pts = [[x0, ysh]]; sp.vs.forEach(function (p) { pts.push([x0 + p[0] * 1000, ysh + p[1] * sc]); }); pts.push([x0 + Lmm, ysh]); D.poly(pts, true, 'SOMBRA');
            var f = sp.vs[0], l = sp.vs[sp.vs.length - 1]; D.text(x0, ysh + f[1] * sc + (f[1] >= 0 ? th * 0.8 : -th * 1.8), 'V = ' + F(f[1], 1), { h: th * 0.85 }); D.text(x0 + Lmm, ysh + l[1] * sc + (l[1] >= 0 ? th * 0.8 : -th * 1.8), 'V = ' + F(l[1], 1), { ha: 2, h: th * 0.85 });
            for (i = 1; i < sp.vs.length; i++) if (sp.vs[i - 1][1] * sp.vs[i][1] < 0) { var xz = sp.vs[i - 1][0] + (sp.vs[i][0] - sp.vs[i - 1][0]) * sp.vs[i - 1][1] / (sp.vs[i - 1][1] - sp.vs[i][1]); D.circle(x0 + xz * 1000, ysh, th * 0.35, 'TEXTO'); D.text(x0 + xz * 1000, ysh - th * 1.8, 'V = 0 en x = ' + F(xz, 2) + ' m', { ha: 1, h: th * 0.8 }); }
            D.text(x0, ysh - th * 4, '(+) hacia arriba · Vmáx = ' + F(Vabs, 1) + ' kN', { h: th * 0.8 });
        }
        if (false && sp.ms) {
            var Mmax = Math.max.apply(null, sp.ms.map(function (p) { return Math.abs(p[1]); }).concat([1])), sm = th * 14 / Mmax;
            D.text(x0, ymo + th * 18, 'DIAGRAMA DE MOMENTO FLECTOR ' + sp.lab + ' (kN·m, tracción hacia abajo)', { h: th * 1.1 }); D.line(x0, ymo, x0 + Lmm, ymo, 'EJES');
            var pm = [[x0, ymo]]; sp.ms.forEach(function (p) { pm.push([x0 + p[0] * 1000, ymo - p[1] * sm]); }); pm.push([x0 + Lmm, ymo]); D.poly(pm, true, 'SOMBRA');
            var imax = 0, imin = 0; sp.ms.forEach(function (p, k) { if (p[1] > sp.ms[imax][1]) imax = k; if (p[1] < sp.ms[imin][1]) imin = k; });
            if (sp.ms[imax][1] > 0.5) D.text(x0 + sp.ms[imax][0] * 1000, ymo - sp.ms[imax][1] * sm - th * 1.8, 'M⁺ = ' + F(sp.ms[imax][1], 1) + ' en x = ' + F(sp.ms[imax][0], 2) + ' m', { ha: 1, h: th * 0.85 });
            if (sp.ms[imin][1] < -0.5) D.text(x0 + sp.ms[imin][0] * 1000, ymo - sp.ms[imin][1] * sm + th * 0.9, 'M⁻ = ' + F(-sp.ms[imin][1], 1), { ha: 1, h: th * 0.85 });
        }
        if (false && sp.segs && sp.segs.length) {
            var tot = sp.segs.reduce(function (a, c) { return a + c[0]; }, 0), vert = sp.kind === 'col', pos = 0;
            if (!vert) { D.text(x0, ystr + th * 6, 'DISTRIBUCION DE ESTRIBOS ' + sp.lab + (stL ? ' · estribo ' + stL.replace(/\s+/g,' ') + ' c/u' : '') + ' (n @ separación = longitud de zona)', { h: th * 1.1 }); D.line(x0, ystr, x0 + tot, ystr, 'EJES'); }
            else { x0 = bb[2] + th * 12; ystr = bb[1]; D.text(x0, ystr + tot + th * 5, 'DISTRIBUCION DE ESTRIBOS (n @ separación = longitud de zona)', { h: th * 1.1 }); D.line(x0, ystr, x0, ystr + tot, 'EJES'); }
            sp.segs.forEach(function (sg) {
                var len = sg[0], sx = sg[1], n = Math.max(1, Math.round(len / sx)), k;
                if (len < 1) return;
                for (k = 0; k <= n && n < 300; k++) { var t = pos + len * k / n; if (!vert) D.line(x0 + t, ystr - th * 1.2, x0 + t, ystr + th * 1.2, 'ARMADURA', 3); else D.line(x0 - th * 1.2, ystr + t, x0 + th * 1.2, ystr + t, 'ARMADURA', 3); }
                if (!vert) D.dim(x0 + pos, ystr, x0 + pos + len, ystr, -th * 3.2, fmtS(n, sx, len)); else D.dim(x0, ystr + pos, x0, ystr + pos + len, th * 3.2, fmtS(n, sx, len));
                pos += len;
            });
        }
        D.ents.forEach(function (e) { model.ents.push(e); }); Object.keys(D.layers).forEach(function (k) { if (!model.layers[k]) model.layers[k] = D.layers[k]; }); model.bbox = CAD.bboxOf(model.ents);
    }
    /* cotas de separación entre dos estribos consecutivos (zona de extremo y zona central), con texto proporcional al elemento */
    function spacingDims(model, sp) {
        var thD = Math.max(18, Math.min(60, sp.hdim * 0.09)), D = new Draw(thD), L = sp.L, z = Math.min(sp.zE, L / 2), pa, pb, i, pos;
        if (sp.start === 'A') { pos = []; var x = 50, c = 0; while (x < L - 40 && c++ < 600) { pos.push(x); x += (x < z || x > L - z) ? sp.sEnd : sp.sMid; } pa = [pos[0], pos[1]]; for (i = 0; i < pos.length - 1; i++) if (pos[i] >= z) { pb = [pos[i], pos[i + 1]]; break; } }
        else { pa = [sp.sEnd / 2, sp.sEnd * 1.5]; pb = [z + sp.sMid, z + 2 * sp.sMid]; }
        function one(pr, sv) { if (!pr || pr[0] == null || pr[1] == null || pr[1] > L) return; if (sp.vertical) D.dim(sp.x0, pr[0], sp.x0, pr[1], -thD * 2.4, sv + ' mm'); else D.dim(pr[0], sp.y0, pr[1], sp.y0, thD * 2.4, sv + ' mm'); }
        one(pa, sp.sEnd); one(pb, sp.sMid);
        D.ents.forEach(function (e) { model.ents.push(e); }); Object.keys(D.layers).forEach(function (k) { if (!model.layers[k]) model.layers[k] = D.layers[k]; }); model.bbox = CAD.bboxOf(model.ents);
    }
    function hDim(model, h) {
        var has = model.ents.some(function (e) { return e.t === 'text' && /^h\s*=/.test((e.s || []).join('')) && e.p && e.p[0] < 0; });
        if (has) return;
        var thD = Math.max(18, Math.min(60, h * 0.09)), D = new Draw(thD * 1.3); D.dim(0, 0, 0, h, thD * 5, 'h = ' + h + ' mm');
        D.ents.forEach(function (e) { model.ents.push(e); }); Object.keys(D.layers).forEach(function (k) { if (!model.layers[k]) model.layers[k] = D.layers[k]; }); model.bbox = CAD.bboxOf(model.ents);
    }
    var SPACING = {
        viga: function (o, r) { return { start: 'A', L: o.L * 1000, zE: 2 * o.h, sEnd: r.calc.sEnd, sMid: r.calc.sMid, hdim: o.h, y0: o.h }; },
        despieceViga: function (o) { var rr = S.viga(o); return { start: 'B', L: o.L * 1000, zE: 2 * o.h, sEnd: rr.calc.sEnd, sMid: rr.calc.sMid, hdim: o.h, y0: o.h }; },
        vigaT: function (o, r) { var st = r.calc.stir; return st ? { start: 'B', L: o.L * 1000, zE: 2 * o.h, sEnd: st.sEnd, sMid: st.sMid, hdim: o.h, y0: o.h } : null; },
        vigaCont: function (o, r) { var st = r.calc.stir; return st ? { start: 'B', L: ((o.L1 || 5) * 1000), zE: 2 * o.h, sEnd: st.sEnd, sMid: st.sMid, hdim: o.h, y0: o.h } : null; },
        vigaApoyos: function (o, r) { var st = r.calc.stir; return { start: 'A', L: o.L * 1000, zE: 2 * o.h, sEnd: st.sEnd, sMid: st.sMid, hdim: o.h, y0: o.h }; },
        columnaC: function (o, r) { var pt = r.calc.pitch; return pt ? { start: 'A', vertical: true, L: o.Lu * 1000, zE: o.Lu * 1000, sEnd: Math.max(pt, o.Lu * 1000 / 150), sMid: pt, hdim: o.D, x0: o.D } : null; },
        columna: function (o, r) { return { start: 'A', vertical: true, L: o.Lu * 1000, zE: r.calc.lo, sEnd: r.calc.sConf, sMid: r.calc.sMid, hdim: Math.min(o.b, o.h), x0: o.b }; },
        despieceColumna: function (o) { var rr = S.columna(o); return { start: 'B', vertical: true, L: o.Lu * 1000, zE: rr.calc.lo, sEnd: rr.calc.sConf, sMid: rr.calc.sMid, hdim: Math.min(o.b, o.h), x0: o.b }; }
    };
    function lin(L, wu, Va, n) { var out = [], i; for (i = 0; i <= n; i++) { var x = L * i / n; out.push([x, Va - wu * x]); } return out; }
    function par(L, wu, n) { var out = [], i; for (i = 0; i <= n; i++) { var x = L * i / n; out.push([x, wu * x * (L - x) / 2]); } return out; }
    function zones(Lmm, h, st) { var z = Math.min(2 * h, Lmm / 2); return [[z, st.sEnd], [Lmm - 2 * z, st.sMid], [z, st.sEnd]]; }
    var EXTRA = {
        viga: function (o, r) { var wu = r.calc.wu, L = o.L; return { kind: 'beam', L: L, vs: lin(L, wu, wu * L / 2, 60), ms: par(L, wu, 60), segs: zones(L * 1000, o.h, r.calc), lab: 'VIGA SIMPLEMENTE APOYADA', th: Math.max(60, L * 18) }; },
        despieceViga: function (o) { var rr = S.viga(o); if (!rr.ok) return null; return EXTRA.viga(o, rr); },
        vigaT: function (o, r) { var L = o.L, wu = 8 * r.calc.Mu / (L * L); return { kind: 'beam', L: L, vs: lin(L, wu, wu * L / 2, 60), ms: par(L, wu, 60), segs: r.calc.stir ? zones(L * 1000, o.h, r.calc.stir) : null, lab: 'VIGA T/L', th: Math.max(60, L * 18) }; },
        vigaCont: function (o, r) {
            var n = o.n === 3 ? 3 : 2, Ls = [o.L1, o.L2, o.L3].slice(0, n), wu = r.calc.wu, x = 0, vs = [], ms = [], segs = [], i, st = r.calc.stir;
            for (i = 0; i < n; i++) {
                var ln = Ls[i] - o.cap / 1000, left = wu * ln / 2, right = -wu * ln / 2; if (i === 0) right = -1.15 * wu * ln / 2; if (i === n - 1 && i > 0) left = 1.15 * wu * ln / 2;
                vs.push([x, left], [x + Ls[i], right]);
                var Ml = i === 0 ? 0 : r.calc.Mneg[i - 1], Mr = i === n - 1 ? 0 : r.calc.Mneg[i], Mp = r.calc.Mpos[i], k;
                for (k = 0; k <= 40; k++) { var t = k / 40; ms.push([x + Ls[i] * t, -Ml * (1 - t) - Mr * t + 4 * (Mp + (Ml + Mr) / 2) * t * (1 - t)]); }
                if (st) zones(Ls[i] * 1000, o.h, st).forEach(function (z) { segs.push(z); });
                x += Ls[i];
            }
            return { kind: 'beam', L: x, vs: vs, ms: ms, segs: segs, lab: 'VIGA CONTINUA (coef. ACI aprox.)', th: Math.max(60, x * 18) };
        },
        vigaApoyos: function (o, r) { var L = o.L, h = o.h; return { kind: 'beam', L: L, vs: null, ms: null, segs: zones(L * 1000, h, r.calc.stir), lab: 'VIGA CON APOYOS A ELECCION', th: Math.max(40, L * 16) }; },
        columna: function (o, r) { var Lu = o.Lu * 1000, lo = r.calc.lo, c = r.calc; return { kind: 'col', L: o.Lu, segs: [[lo, c.sConf], [Lu - 2 * lo, c.sMid], [lo, c.sConf]], lab: 'COLUMNA', th: Math.max(40, Lu * 0.018) }; },
        despieceColumna: function (o) { var rr = S.columna(o); return rr.ok ? EXTRA.columna(o, rr) : null; },
        columnaC: function (o, r) { var Lu = o.Lu * 1000; return r.calc.pitch ? { kind: 'col', L: o.Lu, segs: [[Lu, r.calc.pitch]], lab: 'COLUMNA CIRCULAR (espiral, paso)', th: Math.max(40, Lu * 0.018) } : null; }
    };

    ['viga', 'despieceViga', 'vigaCont', 'vigaT', 'columna', 'despieceColumna', 'columnaC', 'zapata', 'zapataComb', 'zapataCorr', 'muro', 'muroC', 'losa', 'losa2d', 'losaNerv', 'escalera', 'pilote', 'muroCorte', 'puente'].forEach(function (k) {
        var f0 = S[k]; if (typeof f0 !== 'function') return;
        S[k] = function (o) {
            var r = f0.apply(this, arguments);
            try {
                if (r && r.ok) {
                    if (SPACING[k] && r.model && !r.__spc) { var spc = SPACING[k](dflt(k, o), r); if (spc) { spacingDims(r.model, spc); if (!spc.vertical && k !== 'viga' && k !== 'despieceViga') hDim(r.model, spc.hdim); r.__spc = true; } }
                    if (EXTRA[k] && r.model && !r.__extra) { var sp = EXTRA[k](dflt(k, o), r); if (sp && !sp.noVM) { extraModel(r.model, sp); r.__extra = true; if (sp.vs) r.memo.splice(Math.max(0, r.memo.length - 2), 0, 'DIAGRAMAS: V(apoyo izq.) = ' + F(sp.vs[0][1], 1) + ' kN · V(apoyo der.) = ' + F(sp.vs[sp.vs.length - 1][1], 1) + ' kN · momento y cortante con carga factorada (ver plano).'); if (sp.segs) r.memo.splice(Math.max(0, r.memo.length - 2), 0, 'DISTRIBUCION DE ESTRIBOS: ' + sp.segs.filter(function (z) { return z[0] > 1; }).map(function (z) { return Math.max(1, Math.round(z[0] / z[1])) + ' @ ' + z[1] + ' mm (zona de ' + Math.round(z[0]) + ' mm)'; }).join(' + ') + '.'); } }
                    addQty(k, o, r);
                }
            } catch (e) { try { console.warn('CivixCAD cantidades', k, e); } catch (e2) { } }
            return r;
        };
    });
    var va = S.vigaApoyos; if (typeof va === 'function') S.vigaApoyos = function (o) {
        var r = va.apply(this, arguments);
        try {
            if (r && r.ok && !r.qty) {
                var vol = r.calc.concreteM3; r.qty = { items: [['ACERO TOTAL', '', F(r.calc.steelKg, 1) + ' kg'], ['Estribos', r.calc.nStir + ' un.', ''], ['Concreto', F(vol, 3) + ' m³', '']], kg: r.calc.steelKg, vol: vol };
                var oo = Object.assign({ L: 5, h: 500 }, o || {}), sp = EXTRA.vigaApoyos(oo, r); if (r.model && !r.__spc) { spacingDims(r.model, SPACING.vigaApoyos(oo, r)); hDim(r.model, oo.h); r.__spc = true; } if (sp && r.model && !r.__extra) { extraModel(r.model, sp); r.__extra = true; r.memo.splice(Math.max(0, r.memo.length - 2), 0, 'DISTRIBUCION DE ESTRIBOS: ' + sp.segs.filter(function (z) { return z[0] > 1; }).map(function (z) { return Math.max(1, Math.round(z[0] / z[1])) + ' @ ' + z[1] + ' mm (zona de ' + Math.round(z[0]) + ' mm)'; }).join(' + ') + '.'); }
            }
        } catch (e) { try { console.warn('vigaApoyos extra', e); } catch (e2) { } }
        return r;
    };
})(typeof window !== 'undefined' ? window : globalThis);
