/**
 * GeoMetrics — Simuladores 2D · Mecánica de Suelos I
 * 8 ensayos sobre el motor compartido GeoSim2D (mismo contrato que MS2).
 * Cada def expone fields/model/at/estado/summary/stage/charts/fromData.
 *
 * Los resultados guardados en la pestaña «Ensayos» viven en window.__datosEnsayo
 * con prefijos cortos:  h, g, l, ge, cp, d, c, p.
 * El hub genérico (js/sim-ms2.js) lee ese almacén vía dataStore = '__datosEnsayo'.
 */
(function (global) {
    'use strict';
    var G = global.GeoSim2D;
    if (!G) return;
    var H = G.H, C = G.C;

    var AZ = '#3B82F6', TE = '#2DD4BF', AM = '#FBBF24', VI = '#A78BFA', RO = '#F43F5E', VE = '#22C55E', CI = '#38BDF8';

    /* =========================================================================
     * 1 · CONTENIDO DE HUMEDAD  (ASTM D2216 · INV E-122)
     * ======================================================================= */
    G.register('humedad', {
        key: 'humedad', num: '01', title: 'Contenido de Humedad', accent: AZ, rgb: '59,130,246',
        norma: 'ASTM D2216 · INV E-122', duration: 9,
        machine: 'Balanza de precisión y estufa',
        desc: 'Masa húmeda, seca y del recipiente: por diferencia se obtiene el agua y el suelo seco, y con ellos w = (Ww/Ws)·100.',
        chips: ['W recipiente', 'W húmeda', 'W seca', 'w'],
        fields: [
            { id: 'recipiente', label: 'Masa del recipiente', unit: 'g', min: 5, max: 60, step: 0.5, value: 18.4, dec: 1 },
            { id: 'humeda', label: 'Masa húmeda + recipiente', unit: 'g', min: 20, max: 400, step: 0.5, value: 128.6, dec: 1 },
            { id: 'seca', label: 'Masa seca + recipiente', unit: 'g', min: 15, max: 380, step: 0.5, value: 112.2, dec: 1 }
        ],
        readouts: [
            { k: 'agua', label: 'Agua Ww', unit: 'g', dec: 2 },
            { k: 'suelo', label: 'Suelo seco Ws', unit: 'g', dec: 2 },
            { k: 'w', label: 'Humedad w', unit: '%', dec: 2 },
            { k: 'humeda', label: 'W húmeda', unit: 'g', dec: 1 }
        ],
        fromData: function (d) {
            if (!d) return null;
            var o = {};
            if (d.recipiente != null) o.recipiente = d.recipiente;
            if (d.humeda != null) o.humeda = d.humeda;
            if (d.seca != null) o.seca = d.seca;
            return o.recipiente != null && o.humeda != null && o.seca != null ? o : null;
        },
        model: function (P) {
            var agua = Math.max(0, P.humeda - P.seca);
            var suelo = Math.max(0.001, P.seca - P.recipiente);
            var w = agua / suelo * 100;
            return { agua: agua, suelo: suelo, w: w };
        },
        at: function (P, M, p) {
            var paso = H.clamp(p * 3, 0, 3);
            return {
                paso: paso,
                secado: H.clamp(paso - 1, 0, 1),
                pesado: H.clamp(paso - 2, 0, 1),
                agua: M.agua * Math.min(1, paso), suelo: M.suelo,
                w: M.w, humeda: P.humeda, seca: P.seca, recipiente: P.recipiente
            };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ensayo finalizado', cls: 'is-done' };
            if (S.paso < 1) return { txt: 'Pesando muestra húmeda', cls: 'is-run' };
            if (S.paso < 2) return { txt: 'Secando en estufa 110 °C', cls: 'is-run' };
            return { txt: 'Pesando muestra seca', cls: 'is-run' };
        },
        summary: function (P, M) {
            var q = M.w < 10 ? 'Humedad baja' : M.w < 25 ? 'Humedad media' : 'Humedad alta';
            return [
                { label: 'w', value: H.fmt(M.w, 2), unit: '%', hi: true },
                { label: 'Agua Ww', value: H.fmt(M.agua, 2), unit: 'g' },
                { label: 'Suelo seco Ws', value: H.fmt(M.suelo, 2), unit: 'g' },
                { label: 'Interpretación', value: q, unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, AZ, tick * 0.15);
            var cx = W * 0.34;
            /* balanza */
            H.steel(ctx, cx - 120, 250, 240, 22, 6);
            H.steel(ctx, cx - 96, 272, 192, 92, 6, true);
            H.label(ctx, 'BALANZA  0,01 g', cx, 300, { align: 'center', size: 11, color: C.soft, weight: '700' });
            var disp = S.paso < 1 ? P.humeda : S.paso < 2 ? P.humeda : P.seca;
            H.label(ctx, H.fmt(disp, 2) + ' g', cx + 82, 284, { align: 'right', size: 16, color: TE, weight: '800' });
            /* recipiente */
            var rw = 120, rh = 56, ry = 250 - rh - 6;
            ctx.save();
            var g = ctx.createLinearGradient(cx - rw / 2, 0, cx + rw / 2, 0);
            g.addColorStop(0, '#334155'); g.addColorStop(0.5, '#94a3b8'); g.addColorStop(1, '#334155');
            H.rrect(ctx, cx - rw / 2, ry, rw, rh, 8); ctx.fillStyle = g; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
            /* suelo dentro */
            var fill = H.clamp(0.28 + (1 - S.secado) * 0.22, 0.28, 0.55);
            H.rrect(ctx, cx - rw / 2 + 4, ry + rh * (1 - fill), rw - 8, rh * fill - 3, 6);
            var sg = ctx.createLinearGradient(0, ry, 0, ry + rh);
            var wet = 1 - S.secado;
            sg.addColorStop(0, wet > 0.5 ? '#7c4a24' : '#b98a5a'); sg.addColorStop(1, '#5a3a1c');
            ctx.fillStyle = sg; ctx.fill(); ctx.restore();
            H.label(ctx, 'Recipiente', cx, ry - 16, { align: 'center', size: 11, color: C.soft, weight: '700' });
            if (S.secado > 0.02) {
                /* vapor de la estufa */
                var rr = H.rng(3);
                for (var k = 0; k < 12; k++) {
                    var yy = ry - 20 - ((tick * 1.4 + k * 22) % 130);
                    ctx.fillStyle = 'rgba(251,191,36,' + (0.35 * S.secado * (1 - (ry - 20 - yy) / 140)) + ')';
                    ctx.beginPath(); ctx.arc(cx + (rr() - 0.5) * 90, yy, 2 + rr() * 2, 0, H.TAU); ctx.fill();
                }
                H.label(ctx, 'SECADO EN ESTUFA · 110 ± 5 °C', cx, 96, { align: 'center', size: 11, color: AM, weight: '700', bg: 'rgba(251,191,36,.12)', stroke: 'rgba(251,191,36,.4)' });
            }
            /* barras de masa */
            var bx = W * 0.66, bw = 46;
            var bars = [
                { l: 'W recip.', v: P.recipiente, c: C.mute },
                { l: 'W húmeda', v: P.humeda, c: CI },
                { l: 'W seca', v: P.seca, c: AZ },
                { l: 'W agua', v: S.agua, c: TE }
            ];
            var base = 400, top = 130, mx = Math.max(P.humeda, P.seca, P.recipiente + S.agua, 1);
            bars.forEach(function (b, i) {
                var h = (b.v / mx) * (base - top);
                var x = bx + i * (bw + 26);
                ctx.fillStyle = H.rgba(b.c, 0.85);
                H.rrect(ctx, x, base - h, bw, h, 5); ctx.fill();
                H.label(ctx, H.fmt(b.v, 1), x + bw / 2, base - h - 12, { align: 'center', size: 10.5, color: C.text, weight: '700' });
                H.label(ctx, b.l, x + bw / 2, base + 16, { align: 'center', size: 10, color: C.soft });
            });
            H.label(ctx, 'Reparto de masas (g)', bx + (4 * (bw + 26) - 26) / 2, 104, { align: 'center', size: 12, color: C.text, weight: '800' });
            /* fórmula */
            H.label(ctx, 'w = (Ww / Ws) · 100 = ' + H.fmt(S.agua, 2) + ' / ' + H.fmt(S.suelo, 2) + ' · 100', W / 2, 300, { align: 'center', size: 12.5, color: TE, weight: '800', bg: 'rgba(45,212,191,.10)', stroke: 'rgba(45,212,191,.35)' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Pérdida de masa por secado', xlabel: 'Etapa', ylabel: 'Masa (g)',
                        xmin: 0, xmax: 3, ymin: 0, ymax: Math.ceil(P.humeda * 1.15 / 10) * 10,
                        xticks: [0, 1, 2, 3], xfmt: function (v) { return ['', 'Húmeda', 'Estufa', 'Seca'][v] || ''; },
                        pts: [{ x: 0, y: P.humeda }, { x: 1, y: P.humeda }, { x: 2, y: P.seca }, { x: 3, y: P.seca }],
                        progress: 1, color: CI, nolive: true,
                        over: function (c, X, Y) {
                            var mx = 3 * H.clamp(p, 0, 1);
                            c.save(); c.setLineDash([5, 4]); c.strokeStyle = 'rgba(45,212,191,.7)'; c.lineWidth = 1.6;
                            c.beginPath(); c.moveTo(X(0), Y(P.seca)); c.lineTo(X(3), Y(P.seca)); c.stroke(); c.restore();
                            H.label(c, 'W seca = ' + H.fmt(P.seca, 1) + ' g', X(3) - 6, Y(P.seca) - 10, { align: 'right', size: 10.5, color: TE, weight: '700' });
                            c.beginPath(); c.arc(X(Math.min(mx, 3)), Y(mx < 1 ? P.humeda : mx < 2 ? P.humeda - (mx - 1) * (P.humeda - P.seca) : P.seca), 4.6, 0, H.TAU);
                            c.fillStyle = '#fff'; c.fill(); c.strokeStyle = CI; c.lineWidth = 2; c.stroke();
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    /* pastel agua / suelo seco */
                    var total = M.agua + M.suelo, aA = M.agua / total;
                    var cx = W / 2, cy = Ht / 2 + 10, R = 92;
                    ctx.save();
                    H.rrect(ctx, 0, 0, W, Ht, 14); ctx.fillStyle = C.bg; ctx.fill();
                    H.label(ctx, 'Composición de la muestra', 16, 16, { color: C.text, size: 13, weight: '700' });
                    var a0 = -Math.PI / 2, a1 = a0 + aA * H.TAU;
                    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
                    ctx.fillStyle = H.rgba(TE, 0.85); ctx.fill();
                    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, a1, a0 + H.TAU); ctx.closePath();
                    ctx.fillStyle = H.rgba(AZ, 0.85); ctx.fill();
                    ctx.beginPath(); ctx.arc(cx, cy, R, 0, H.TAU); ctx.strokeStyle = C.line; ctx.lineWidth = 2; ctx.stroke();
                    ctx.beginPath(); ctx.arc(cx, cy, R * 0.56, 0, H.TAU); ctx.fillStyle = C.panel; ctx.fill();
                    H.label(ctx, H.fmt(M.w, 2) + ' %', cx, cy - 6, { align: 'center', size: 22, color: C.text, weight: '800' });
                    H.label(ctx, 'de humedad', cx, cy + 16, { align: 'center', size: 10.5, color: C.mute });
                    H.label(ctx, '■ Agua Ww = ' + H.fmt(M.agua, 2) + ' g', cx + R + 26, cy - 18, { size: 12, color: TE, weight: '700' });
                    H.label(ctx, '■ Suelo Ws = ' + H.fmt(M.suelo, 2) + ' g', cx + R + 26, cy + 6, { size: 12, color: AZ, weight: '700' });
                    ctx.restore();
                }
            }
        ]
    });

    /* =========================================================================
     * 2 · GRANULOMETRÍA (TAMIZADO)  (ASTM D6913 · INV E-123)
     * ======================================================================= */
    G.register('granulometria', {
        key: 'granulometria', num: '02', title: 'Análisis Granulométrico', accent: CI, rgb: '56,189,248',
        norma: 'ASTM D6913 · INV E-123', duration: 13,
        machine: 'Juego de tamices y tamizadora',
        desc: 'Serie de tamices con masa retenida: se calculan los porcentajes que pasan y la curva granulométrica con D10, D30, D60, Cu y Cc.',
        chips: ['masa retenida', '% pasa', 'D10 · D30 · D60', 'Cu · Cc'],
        fields: [
            { id: 'total', label: 'Masa total de la muestra', unit: 'g', min: 200, max: 5000, step: 10, value: 1000, dec: 0 },
            { id: 'p4', label: '% pasa tamiz #4 (4,75 mm)', unit: '%', min: 20, max: 100, step: 1, value: 78, dec: 0 },
            { id: 'p200', label: '% pasa tamiz #200 (0,075 mm)', unit: '%', min: 2, max: 90, step: 1, value: 24, dec: 0 },
            { id: 'D60', label: 'Diámetro D60', unit: 'mm', min: 0.1, max: 20, step: 0.1, value: 1.6, dec: 2 },
            { id: 'tipo', type: 'select', label: 'Familia del suelo', value: 'arena',
              options: [['grava', 'Grava / suelo grueso'], ['arena', 'Arena'], ['fino', 'Suelo fino (limo/arcilla)']] }
        ],
        readouts: [
            { k: 'paso', label: '% pasa acum.', unit: '%', dec: 1 },
            { k: 'ret', label: '% retenido', unit: '%', dec: 1 },
            { k: 'Cu', label: 'Cu', unit: '—', dec: 2 },
            { k: 'Cc', label: 'Cc', unit: '—', dec: 2 }
        ],
        fromData: function (d) {
            if (!d) return null;
            var o = {};
            if (isFinite(d.total)) o.total = d.total;
            if (isFinite(d.D60)) o.D60 = d.D60;
            if (isFinite(d.fPct)) o.p200 = d.fPct;
            if (isFinite(d.aPct) && isFinite(d.gPct)) o.p4 = Math.min(100, d.aPct + d.fPct);
            if (d.tipo && /fino/i.test(d.tipo)) o.tipo = 'fino';
            else if (d.tipo && /grava/i.test(d.tipo)) o.tipo = 'grava';
            else if (d.tipo) o.tipo = 'arena';
            return Object.keys(o).length ? o : null;
        },
        model: function (P) {
            /* curva log-interpolada que respeta p4 y p200 */
            var d4 = 4.75, d200 = 0.075;
            var mMid = 1 - (P.p200 / 100);
            var d10 = P.D60 / 6, d30 = P.D60 / 2;
            var Cu = P.D60 / d10, Cc = (d30 * d30) / (d10 * P.D60);
            var pts = [];
            for (var i = 0; i <= 120; i++) {
                var t = i / 120, d = Math.pow(10, H.lerp(-1.7, 1.5, t));
                var pasa;
                if (d >= d4) pasa = H.lerp(100, P.p4, H.clamp((Math.log10(d) - Math.log10(d4)) / (1.5 - Math.log10(d4)) , 0, 1));
                else if (d >= d200) pasa = H.lerp(P.p4, P.p200, H.clamp((Math.log10(d4) - Math.log10(d)) / (Math.log10(d4) - Math.log10(d200)), 0, 1));
                else pasa = H.lerp(P.p200, 2, H.clamp((Math.log10(d200) - Math.log10(d)) / (Math.log10(d200) + 1.7), 0, 1));
                pts.push({ x: d, y: H.clamp(pasa, 0, 100) });
            }
            return { pts: pts, d10: d10, d30: d30, d60: P.D60, Cu: Cu, Cc: Cc, mMid: mMid };
        },
        at: function (P, M, p) {
            var frac = H.clamp(p / 0.85, 0, 1);
            var idx = Math.round(frac * (M.pts.length - 1));
            var cur = M.pts[idx] || M.pts[0];
            var ret = 100 - cur.y;
            return { d: cur.x, paso: cur.y, ret: ret, Cu: M.Cu, Cc: M.Cc, montado: H.clamp(p / 0.35, 0, 1), vibrando: p >= 0.35 && p < 0.85 };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ensayo finalizado', cls: 'is-done' };
            if (S.montado < 1) return { txt: 'Montando la torre de tamices', cls: 'is-run' };
            if (S.vibrando) return { txt: 'Tamizando', cls: 'is-run' };
            return { txt: 'Pesando retenidos', cls: 'is-run' };
        },
        summary: function (P, M) {
            var bien = M.Cu >= 4 && M.Cc >= 1 && M.Cc <= 3;
            return [
                { label: 'D10', value: H.fmt(M.d10, 3), unit: 'mm' },
                { label: 'D30', value: H.fmt(M.d30, 3), unit: 'mm' },
                { label: 'D60', value: H.fmt(M.d60, 2), unit: 'mm' },
                { label: 'Cu', value: H.fmt(M.Cu, 2), unit: '—', hi: true },
                { label: 'Cc', value: H.fmt(M.Cc, 2), unit: '—', hi: true },
                { label: 'Graduación', value: bien ? 'Bien graduado' : 'Mal graduado', unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, CI, tick * 0.15);
            var cx = W * 0.42;
            /* torre de tamices: 6 tamices apilados */
            var n = 6, tw = 190, th = 40, baseY = 410;
            for (var i = 0; i < n; i++) {
                var y = baseY - (i + 1) * th - 18;
                var up = H.clamp(S.montado * n - i, 0, 1);
                var yy = y - (1 - up) * 60 + Math.sin(tick * 0.3 + i) * (S.vibrando ? 2.2 : 0);
                H.steel(ctx, cx - tw / 2, yy, tw, th, 4);
                ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 1;
                /* malla */
                ctx.beginPath();
                for (var mx = cx - tw / 2 + 8; mx < cx + tw / 2 - 6; mx += 7) { ctx.moveTo(mx, yy + 8); ctx.lineTo(mx, yy + th - 8); }
                ctx.strokeStyle = 'rgba(30,41,59,.5)'; ctx.stroke();
                H.label(ctx, 'Tamiz ' + (n - i + 3), cx - tw / 2 + 12, yy + th / 2, { size: 10, color: '#1e293b', weight: '800' });
                /* luz de malla decreciente */
                H.label(ctx, (400 / Math.pow(2, i)).toFixed(i < 2 ? 0 : 1) + ' mm', cx + tw / 2 - 12, yy + th / 2, { align: 'right', size: 9.5, color: '#334155', weight: '700' });
            }
            H.steel(ctx, cx - tw / 2 - 16, baseY - 18, tw + 32, 20, 5, true);
            H.label(ctx, 'TAMIZADORA · 10 min', cx, baseY + 14, { align: 'center', size: 11, color: C.soft, weight: '700' });
            if (S.vibrando) {
                for (var k = 0; k < 14; k++) {
                    var rr = H.rng(9);
                    ctx.fillStyle = 'rgba(56,189,248,' + (0.35 + 0.3 * Math.sin(tick + k)) + ')';
                    ctx.beginPath(); ctx.arc(cx + (rr() - 0.5) * 150, baseY - 24 - ((tick * 3 + k * 24) % 300), 1.6, 0, H.TAU); ctx.fill();
                }
            }
            /* curva en miniatura + tabla de % pasa */
            var px = W - 250, py = 110;
            H.label(ctx, 'Curva granulométrica', px, py - 16, { size: 12, color: C.text, weight: '800' });
            var Lx = px, Ly = py + 10, Lw = 220, Lh = 150;
            ctx.save();
            ctx.strokeStyle = 'rgba(167,180,200,.15)'; ctx.lineWidth = 1;
            for (var gx = 0; gx <= 4; gx++) { ctx.beginPath(); ctx.moveTo(Lx + gx / 4 * Lw, Ly); ctx.lineTo(Lx + gx / 4 * Lw, Ly + Lh); ctx.stroke(); }
            for (var gy = 0; gy <= 4; gy++) { ctx.beginPath(); ctx.moveTo(Lx, Ly + gy / 4 * Lh); ctx.lineTo(Lx + Lw, Ly + gy / 4 * Lh); ctx.stroke(); }
            ctx.strokeStyle = 'rgba(167,180,200,.5)'; ctx.beginPath(); ctx.moveTo(Lx, Ly); ctx.lineTo(Lx, Ly + Lh); ctx.lineTo(Lx + Lw, Ly + Lh); ctx.stroke();
            function CX(d) { return Lx + (Math.log10(d) + 1.7) / 3.2 * Lw; }
            function CY(v) { return Ly + Lh - v / 100 * Lh; }
            ctx.beginPath();
            M.pts.forEach(function (q, i) { if (i) ctx.lineTo(CX(q.x), CY(q.y)); else ctx.moveTo(CX(q.x), CY(q.y)); });
            ctx.strokeStyle = CI; ctx.lineWidth = 2.4; ctx.stroke();
            ctx.beginPath(); ctx.arc(CX(S.d), CY(S.paso), 4.6, 0, H.TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = CI; ctx.lineWidth = 2; ctx.stroke();
            H.label(ctx, 'd = ' + H.fmt(S.d, 3) + ' mm', Lx + Lw, Ly - 2, { align: 'right', size: 9.5, color: C.mute });
            ctx.restore();
            H.label(ctx, '% pasa = ' + H.fmt(S.paso, 1) + ' %', px, Ly + Lh + 18, { size: 12.5, color: TE, weight: '800' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Curva granulométrica', xlabel: 'Abertura del tamiz (mm)', ylabel: '% que pasa',
                        xmin: Math.log10(0.02), xmax: Math.log10(30), ymin: 0, ymax: 100,
                        xfmt: function (v) { var d = Math.pow(10, v); return d >= 1 ? d.toFixed(1) : d.toFixed(2); },
                        yfmt: function (v) { return v.toFixed(0); },
                        pts: M.pts.map(function (q) { return { x: Math.log10(q.x), y: q.y }; }),
                        progress: 1, color: CI, nolive: true,
                        over: function (c, X, Y) {
                            [['D10', M.d10], ['D30', M.d30], ['D60', M.d60]].forEach(function (t) {
                                c.save(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(45,212,191,.5)'; c.lineWidth = 1;
                                c.beginPath(); c.moveTo(X(Math.log10(t[1])), Y(0)); c.lineTo(X(Math.log10(t[1])), Y(60)); c.stroke(); c.restore();
                                H.label(c, t[0], X(Math.log10(t[1])), Y(64), { align: 'center', size: 9.5, color: TE, weight: '700' });
                            });
                            var lg = Math.log10(S.d);
                            c.save(); c.strokeStyle = CI; c.lineWidth = 1.6; c.beginPath();
                            c.moveTo(X(lg), Y(0)); c.lineTo(X(lg), Y(S.paso)); c.stroke(); c.restore();
                            H.label(c, H.fmt(S.paso, 1) + ' %', X(lg) + 6, Y(S.paso) + 10, { size: 11, color: '#fff', weight: '800' });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Retenido acumulado por tamiz', xlabel: 'Tamiz', ylabel: '% retenido acum.',
                        xmin: 0, xmax: 6, ymin: 0, ymax: 100,
                        xticks: [0, 1, 2, 3, 4, 5, 6],
                        xfmt: function (v) { return ['3"', '1½"', '¾"', '#4', '#10', '#40', '#200'][v] || ''; },
                        pts: (function () {
                            var out = [], acc = 0;
                            for (var i = 0; i <= 6; i++) { out.push({ x: i, y: 100 * (i / 6) }); }
                            return out;
                        })(),
                        progress: H.clamp(p / 0.85, 0, 1), color: VI,
                        under: function (c, X, Y) {
                            H.label(c, 'Retenido total = ' + H.fmt(S.ret, 1) + ' %', X(0.1), Y(88), { size: 11, color: VI, weight: '700' });
                        }
                    });
                }
            }
        ]
    });

    /* =========================================================================
     * 3 · LÍMITES DE ATTERBERG  (ASTM D4318 · INV E-125/126)
     * ======================================================================= */
    G.register('limites', {
        key: 'limites', num: '03', title: 'Límites de Atterberg', accent: VI, rgb: '167,139,250',
        norma: 'ASTM D4318 · INV E-125', duration: 12,
        machine: 'Copa de Casagrande y ranurador',
        desc: 'Tres puntos (número de golpes vs humedad) definen la recta de fluidez: LL a 25 golpes, LP con el rollito y el IP.',
        chips: ['LL', 'LP', 'IP', 'línea A'],
        fields: [
            { id: 'g1', label: 'Golpes punto 1', unit: 'golpes', min: 10, max: 40, step: 1, value: 18, dec: 0 },
            { id: 'h1', label: 'Humedad punto 1', unit: '%', min: 20, max: 80, step: 0.5, value: 46, dec: 1 },
            { id: 'g2', label: 'Golpes punto 2', unit: 'golpes', min: 15, max: 45, step: 1, value: 25, dec: 0 },
            { id: 'h2', label: 'Humedad punto 2', unit: '%', min: 15, max: 75, step: 0.5, value: 42, dec: 1 },
            { id: 'g3', label: 'Golpes punto 3', unit: 'golpes', min: 20, max: 50, step: 1, value: 34, dec: 0 },
            { id: 'h3', label: 'Humedad punto 3', unit: '%', min: 15, max: 70, step: 0.5, value: 37.5, dec: 1 },
            { id: 'lp', label: 'Límite plástico LP', unit: '%', min: 10, max: 45, step: 0.5, value: 21, dec: 1 }
        ],
        readouts: [
            { k: 'll', label: 'LL (25 golpes)', unit: '%', dec: 1 },
            { k: 'ip', label: 'IP', unit: '%', dec: 1 },
            { k: 'golpes', label: 'Golpes', unit: '', dec: 0 },
            { k: 'tipo', label: 'Clasif.', unit: '', txt: true }
        ],
        fromData: function (d) {
            if (!d || !d.puntos || d.puntos.length < 3) return null;
            var o = { g1: d.puntos[0].g, h1: d.puntos[0].h, g2: d.puntos[1].g, h2: d.puntos[1].h, g3: d.puntos[2].g, h3: d.puntos[2].h };
            if (isFinite(d.lp)) o.lp = d.lp;
            return o;
        },
        model: function (P) {
            var x = [Math.log(P.g1), Math.log(P.g2), Math.log(P.g3)], y = [P.h1, P.h2, P.h3], n = 3;
            var sx = x[0] + x[1] + x[2], sy = y[0] + y[1] + y[2];
            var sxy = x[0] * y[0] + x[1] * y[1] + x[2] * y[2], sx2 = x[0] * x[0] + x[1] * x[1] + x[2] * x[2];
            var m = (n * sxy - sx * sy) / (n * sx2 - sx * sx), b = (sy - m * sx) / n;
            var ll = m * Math.log(25) + b, ip = ll - P.lp;
            var lineaA = 0.73 * (ll - 20);
            var tipo = ll < 50 ? (ip > lineaA ? 'CL' : 'ML') : (ip > lineaA ? 'CH' : 'MH');
            return { m: m, b: b, ll: ll, ip: ip, lineaA: lineaA, tipo: tipo,
                pts: [{ g: P.g1, h: P.h1 }, { g: P.g2, h: P.h2 }, { g: P.g3, h: P.h3 }] };
        },
        at: function (P, M, p) {
            var giro = H.clamp(p / 0.75, 0, 1);
            return { ll: M.ll, ip: M.ip, tipo: M.tipo, lineaA: M.lineaA, golpes: Math.round(H.lerp(40, 25, giro)), giro: giro, cerrando: p > 0.75 };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ensayo finalizado', cls: 'is-done' };
            if (p < 0.75) return { txt: 'Contando golpes', cls: 'is-run' };
            return { txt: 'Cerrando la ranura', cls: 'is-run' };
        },
        summary: function (P, M) {
            return [
                { label: 'LL', value: H.fmt(M.ll, 1), unit: '%', hi: true },
                { label: 'LP', value: H.fmt(P.lp, 1), unit: '%' },
                { label: 'IP', value: H.fmt(M.ip, 1), unit: '%', hi: true },
                { label: 'Clasif. SUCS', value: M.tipo, unit: '' },
                { label: 'Carta', value: M.ll < 50 ? 'Baja plasticidad' : 'Alta plasticidad', unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, VI, tick * 0.15);
            var cx = W * 0.38;
            /* copa de Casagrande */
            H.steel(ctx, cx - 130, 300, 260, 26, 6, true);
            var copaG = ctx.createLinearGradient(cx - 110, 0, cx + 110, 0);
            copaG.addColorStop(0, '#4a5870'); copaG.addColorStop(0.5, '#93a3b8'); copaG.addColorStop(1, '#3a4659');
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx - 110, 230 + Math.sin(tick * 0.5) * 0);
            ctx.quadraticCurveTo(cx, 288, cx + 110, 230);
            ctx.lineTo(cx + 90, 210); ctx.quadraticCurveTo(cx, 262, cx - 90, 210);
            ctx.closePath(); ctx.fillStyle = copaG; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.restore();
            /* muestra de suelo dentro */
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(cx - 96, 224); ctx.quadraticCurveTo(cx, 272, cx + 96, 224);
            ctx.lineTo(cx + 96, 234); ctx.quadraticCurveTo(cx, 282, cx - 96, 234); ctx.closePath();
            var soilG = ctx.createLinearGradient(0, 224, 0, 280);
            soilG.addColorStop(0, '#b98a5a'); soilG.addColorStop(1, '#6b4626');
            ctx.fillStyle = soilG; ctx.fill(); ctx.restore();
            /* ranura que se cierra */
            var gap = H.lerp(70, 8, S.giro);
            ctx.save();
            ctx.translate(cx, 250);
            ctx.lineWidth = 4; ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(40,20,10,.85)';
            ctx.beginPath(); ctx.moveTo(-gap / 2, -14); ctx.lineTo(-gap / 2, 14); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(gap / 2, -14); ctx.lineTo(gap / 2, 14); ctx.stroke();
            ctx.restore();
            /* manivela que gira */
            var ang = tick * 0.2;
            H.steel(ctx, cx + 132, 236, 12, 60, 3, true);
            ctx.save(); ctx.translate(cx + 138, 232); ctx.rotate(ang);
            ctx.strokeStyle = '#9fb0c8'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(30, 0); ctx.stroke();
            ctx.beginPath(); ctx.arc(34, 0, 6, 0, H.TAU); ctx.fillStyle = TE; ctx.fill(); ctx.restore();
            H.label(ctx, 'Copa de Casagrande', cx, 316, { align: 'center', size: 11, color: C.soft, weight: '700' });
            /* bloque de golpes grande */
            H.label(ctx, String(S.golpes), cx - 200, 150, { align: 'center', size: 52, color: S.cerrando ? TE : VI, weight: '800' });
            H.label(ctx, 'golpes', cx - 200, 196, { align: 'center', size: 12, color: C.soft, weight: '700' });
            H.label(ctx, S.cerrando ? 'Ranura cerrada' : 'Contando…', cx - 200, 216, { align: 'center', size: 11, color: S.cerrando ? TE : C.mute });
            /* estados */
            H.label(ctx, 'LL = ' + H.fmt(M.ll, 1) + ' %', cx - 200, 250, { align: 'center', size: 15, color: C.text, weight: '800', bg: 'rgba(167,139,250,.12)', stroke: 'rgba(167,139,250,.4)' });
            H.label(ctx, 'IP = ' + H.fmt(M.ip, 1) + ' %', cx - 200, 284, { align: 'center', size: 15, color: VI, weight: '800', bg: 'rgba(167,139,250,.12)', stroke: 'rgba(167,139,250,.4)' });
            /* puntos sobre la recta en miniatura */
            var px = W - 250, py = 120, Lw = 210, Lh = 160;
            H.label(ctx, 'Recta de fluidez', px, py - 16, { size: 12, color: C.text, weight: '800' });
            ctx.save();
            ctx.strokeStyle = 'rgba(167,180,200,.18)'; ctx.beginPath();
            for (var i = 0; i <= 4; i++) { ctx.moveTo(px + i / 4 * Lw, py); ctx.lineTo(px + i / 4 * Lw, py + Lh); ctx.moveTo(px, py + i / 4 * Lh); ctx.lineTo(px + Lw, py + i / 4 * Lh); }
            ctx.stroke();
            ctx.strokeStyle = 'rgba(167,180,200,.5)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + Lh); ctx.lineTo(px + Lw, py + Lh); ctx.stroke();
            var lx = Math.log(25), x0 = Math.log(10), x1 = Math.log(50);
            function X(g) { return px + (Math.log(g) - x0) / (x1 - x0) * Lw; }
            function Y(h) { return py + Lh - (h - 20) / 60 * Lh; }
            ctx.beginPath();
            ctx.moveTo(X(10), Y(M.m * Math.log(10) + M.b)); ctx.lineTo(X(50), Y(M.m * Math.log(50) + M.b));
            ctx.strokeStyle = VI; ctx.lineWidth = 2.4; ctx.stroke();
            ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(45,212,191,.7)';
            ctx.beginPath(); ctx.moveTo(X(25), Y(20)); ctx.lineTo(X(25), Y(M.ll)); ctx.stroke(); ctx.restore();
            M.pts.forEach(function (q) { ctx.beginPath(); ctx.arc(X(q.g), Y(q.h), 5, 0, H.TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = VI; ctx.lineWidth = 2; ctx.stroke(); });
            ctx.restore();
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Recta de fluidez (golpes – humedad)', xlabel: 'log N (golpes)', ylabel: 'Humedad w (%)',
                        xmin: Math.log(10), xmax: Math.log(50), ymin: Math.floor(P.h2 / 5) * 5 - 5, ymax: Math.ceil(P.h1 / 5) * 5 + 5,
                        xfmt: function (v) { return Math.round(Math.exp(v)).toString(); },
                        pts: [{ x: Math.log(P.g1), y: P.h1 }, { x: Math.log(P.g2), y: P.h2 }, { x: Math.log(P.g3), y: P.h3 }],
                        progress: 1, color: VI, nolive: true,
                        over: function (c, X, Y) {
                            c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(45,212,191,.75)'; c.lineWidth = 1.6;
                            c.beginPath(); c.moveTo(X(Math.log(25)), Y(o_ymin(Y))); c.lineTo(X(Math.log(25)), Y(M.ll)); c.stroke(); c.restore();
                            function o_ymin() { return Y(Y.value === undefined ? 0 : 0); }
                            H.label(c, 'LL = ' + H.fmt(M.ll, 1) + ' %', X(Math.log(25)) + 6, Y(M.ll), { size: 11, color: TE, weight: '800' });
                            M.pts.forEach(function (q) { c.beginPath(); c.arc(X(Math.log(q.g)), Y(q.h), 4.4, 0, H.TAU); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = VI; c.lineWidth = 2; c.stroke(); });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    /* carta de plasticidad */
                    ctx.save();
                    H.rrect(ctx, 0, 0, W, Ht, 14); ctx.fillStyle = C.bg; ctx.fill();
                    H.label(ctx, 'Carta de plasticidad (Casagrande)', 16, 16, { color: C.text, size: 13, weight: '700' });
                    function X(ll) { return 54 + (ll - 0) / 100 * (W - 74); }
                    function Y(ip) { return Ht - 40 - (ip - 0) / 60 * (Ht - 80); }
                    ctx.strokeStyle = '#3b4a63'; ctx.lineWidth = 1.4;
                    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(0), Y(60)); ctx.lineTo(X(100), Y(0)); ctx.stroke();
                    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(167,139,250,.8)'; ctx.lineWidth = 1.6;
                    ctx.beginPath();
                    for (var i = 0; i <= 100; i++) { var y = 0.73 * (i - 20); if (y < 0) continue; if (y > 60) break; i === 0 ? ctx.moveTo(X(i), Y(y)) : ctx.lineTo(X(i), Y(y)); }
                    ctx.stroke(); ctx.restore();
                    H.label(ctx, 'Línea A', X(72), Y(0.73 * 52), { size: 10.5, color: VI, weight: '700' });
                    H.label(ctx, 'LL = 50', X(50), Y(60) + 6, { align: 'center', size: 10, color: C.mute });
                    ctx.beginPath(); ctx.arc(X(M.ll), Y(M.ip), 8, 0, H.TAU); ctx.fillStyle = H.rgba(VI, 0.25); ctx.fill();
                    ctx.beginPath(); ctx.arc(X(M.ll), Y(M.ip), 5, 0, H.TAU); ctx.fillStyle = VI; ctx.fill();
                    H.label(ctx, M.tipo, X(M.ll) + 12, Y(M.ip) - 6, { size: 13, color: '#fff', weight: '800' });
                    H.label(ctx, '(' + H.fmt(M.ll, 1) + ' %, ' + H.fmt(M.ip, 1) + ' %)', X(M.ll) + 12, Y(M.ip) + 12, { size: 10.5, color: C.soft });
                    ctx.restore();
                }
            }
        ]
    });

    /* =========================================================================
     * 4 · GRAVEDAD ESPECÍFICA  (ASTM D854 · INV E-128)
     * ======================================================================= */
    G.register('gravedad', {
        key: 'gravedad', num: '04', title: 'Gravedad Específica', accent: TE, rgb: '45,212,191',
        norma: 'ASTM D854 · INV E-128', duration: 10,
        machine: 'Picnómetro y balanza',
        desc: 'Pesos del picnómetro vacío, con suelo y con suelo + agua: Gs = Ws / (Ws + Wpw − Wpws).',
        chips: ['Ws', 'Gs', '2,60–2,80', 'tipo'],
        fields: [
            { id: 'mp', label: 'Picnómetro vacío', unit: 'g', min: 20, max: 80, step: 0.1, value: 34.5, dec: 1 },
            { id: 'mps', label: 'Picnómetro + suelo seco', unit: 'g', min: 25, max: 120, step: 0.1, value: 59.5, dec: 1 },
            { id: 'mpws', label: 'Picnómetro + suelo + agua', unit: 'g', min: 70, max: 220, step: 0.1, value: 159.7, dec: 1 },
            { id: 'mpw', label: 'Picnómetro + agua (lleno)', unit: 'g', min: 60, max: 200, step: 0.1, value: 144.7, dec: 1 }
        ],
        readouts: [
            { k: 'ms', label: 'Suelo seco Ws', unit: 'g', dec: 2 },
            { k: 'gs', label: 'Gs', unit: '—', dec: 3 },
            { k: 'vs', label: 'Vol. sólidos', unit: 'cm³', dec: 2 },
            { k: 'gs', label: 'Gs', unit: '', dec: 3 }
        ],
        fromData: function (d) {
            if (!d || !isFinite(d.gs)) return null;
            var o = { gs: d.gs, ms: d.ms };
            /* reconstruir entradas coherentes a partir de Gs y Ws */
            if (isFinite(d.ms)) {
                o.mp = 34.5; o.mps = Math.round((34.5 + d.ms) * 10) / 10;
                var denom = d.ms / d.gs;                       /* Ws + Wpw − Wpws */
                o.mpw = 144.7; o.mpws = Math.round((34.5 + d.ms + 144.7 - 34.5 - denom) * 10) / 10;
            }
            return o;
        },
        model: function (P) {
            var ms = P.mps - P.mp, denom = ms + P.mpw - P.mpws;
            var gs = denom > 0 ? ms / denom : 0;
            var vs = gs > 0 ? ms / gs : 0;
            return { ms: ms, gs: gs, denom: denom, vs: vs };
        },
        at: function (P, M, p) {
            var paso = H.clamp(p * 3, 0, 3);
            return { ms: M.ms, gs: M.gs, denom: M.denom, vs: M.vs, paso: paso, agitando: paso > 1 && paso < 2.4 };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ensayo finalizado', cls: 'is-done' };
            if (S.paso < 1) return { txt: 'Pesando suelo seco', cls: 'is-run' };
            if (S.paso < 2) return { txt: 'Eliminando aire (agitando)', cls: 'is-run' };
            return { txt: 'Enrasando el picnómetro', cls: 'is-run' };
        },
        summary: function (P, M) {
            var tipo = M.gs < 2.65 ? 'Arena / Grava' : M.gs < 2.8 ? 'Arcilla' : 'Especial';
            return [
                { label: 'Gs', value: H.fmt(M.gs, 3), unit: '—', hi: true },
                { label: 'Suelo seco Ws', value: H.fmt(M.ms, 2), unit: 'g' },
                { label: 'Vol. sólidos', value: H.fmt(M.vs, 2), unit: 'cm³' },
                { label: 'Tipo', value: tipo, unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, TE, tick * 0.15);
            var cx = W * 0.4;
            /* balanza */
            H.steel(ctx, cx - 140, 320, 280, 22, 6);
            H.steel(ctx, cx - 116, 342, 232, 70, 6, true);
            H.label(ctx, 'BALANZA  0,001 g', cx, 366, { align: 'center', size: 11, color: C.soft, weight: '700' });
            /* picnómetro (frasco con cuello) */
            var cur = S.paso < 1 ? P.mp : S.paso < 2 ? P.mps : P.mpws;
            H.label(ctx, H.fmt(cur, 2) + ' g', cx + 112, 348, { align: 'right', size: 16, color: TE, weight: '800' });
            ctx.save();
            var flask = ctx.createLinearGradient(cx - 50, 0, cx + 50, 0);
            flask.addColorStop(0, 'rgba(147,197,253,.35)'); flask.addColorStop(0.5, 'rgba(226,240,255,.5)'); flask.addColorStop(1, 'rgba(147,197,253,.35)');
            ctx.beginPath();
            ctx.moveTo(cx - 30, 130); ctx.lineTo(cx - 30, 190);
            ctx.quadraticCurveTo(cx - 66, 230, cx - 50, 300);
            ctx.lineTo(cx + 50, 300);
            ctx.quadraticCurveTo(cx + 66, 230, cx + 30, 190);
            ctx.lineTo(cx + 30, 130); ctx.closePath();
            ctx.fillStyle = flask; ctx.fill();
            ctx.strokeStyle = 'rgba(200,220,255,.7)'; ctx.lineWidth = 1.6; ctx.stroke();
            /* contenido */
            var lvl = S.paso < 1 ? 0 : S.paso < 2 ? 0.28 : 0.78;
            var topY = 300 - (300 - 190) * lvl;
            ctx.save(); ctx.beginPath();
            ctx.rect(cx - 66, S.paso >= 2 ? 210 : topY, 132, 300 - (S.paso >= 2 ? 210 : topY));
            ctx.clip();
            ctx.beginPath();
            ctx.moveTo(cx - 30, 130); ctx.lineTo(cx - 30, 190);
            ctx.quadraticCurveTo(cx - 66, 230, cx - 50, 300);
            ctx.lineTo(cx + 50, 300);
            ctx.quadraticCurveTo(cx + 66, 230, cx + 30, 190);
            ctx.lineTo(cx + 30, 130); ctx.closePath();
            ctx.fillStyle = S.paso < 2 ? 'rgba(185,138,90,.8)' : 'rgba(96,165,250,.45)';
            ctx.fill(); ctx.restore();
            ctx.restore();
            /* tapón */
            ctx.fillStyle = '#94a3b8'; H.rrect(ctx, cx - 20, 116, 40, 16, 4); ctx.fill();
            if (S.agitando) {
                var rr = H.rng(7);
                for (var k = 0; k < 12; k++) {
                    ctx.fillStyle = 'rgba(226,240,255,' + (0.3 + 0.3 * Math.sin(tick + k)) + ')';
                    ctx.beginPath(); ctx.arc(cx + (rr() - 0.5) * 50, 250 + (rr() - 0.5) * 60, 1.8, 0, H.TAU); ctx.fill();
                }
            }
            /* fórmula */
            H.label(ctx, 'Gs = Ws / (Ws + Wpw − Wpws)', W / 2, 250, { align: 'center', size: 12.5, color: TE, weight: '800', bg: 'rgba(45,212,191,.10)', stroke: 'rgba(45,212,191,.35)' });
            H.label(ctx, 'Gs = ' + H.fmt(M.gs, 3), W / 2, 286, { align: 'center', size: 20, color: C.text, weight: '800' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Composición de pesadas', xlabel: 'Pesada', ylabel: 'Masa (g)',
                        xmin: 0, xmax: 3, ymin: 0, ymax: Math.ceil(P.mpws * 1.12 / 10) * 10,
                        xticks: [0, 1, 2, 3], xfmt: function (v) { return ['Picnómetro', '+ suelo', '+ agua', 'Agua llena'][v] || ''; },
                        pts: [{ x: 0, y: P.mp }, { x: 1, y: P.mps }, { x: 2, y: P.mpws }, { x: 3, y: P.mpw }],
                        progress: H.clamp(p * 1.2, 0, 1), color: TE,
                        under: function (c, X, Y) { H.label(c, 'Wpw = ' + H.fmt(P.mpw, 1) + ' g', X(3), Y(P.mpw) - 12, { align: 'center', size: 10.5, color: C.soft }); }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    /* escala de Gs con rango típico */
                    ctx.save();
                    H.rrect(ctx, 0, 0, W, Ht, 14); ctx.fillStyle = C.bg; ctx.fill();
                    H.label(ctx, 'Gs frente al rango típico de suelos', 16, 16, { color: C.text, size: 13, weight: '700' });
                    var Lx = 60, Lw = W - 100, cy = Ht / 2 + 10;
                    function X(g) { return Lx + (g - 2.4) / 0.8 * Lw; }
                    ctx.fillStyle = 'rgba(34,197,94,.18)'; ctx.fillRect(X(2.6), cy - 26, X(2.8) - X(2.6), 52);
                    ctx.strokeStyle = '#3b4a63'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(Lx, cy); ctx.lineTo(Lx + Lw, cy); ctx.stroke();
                    for (var g = 2.4; g <= 3.2; g += 0.1) {
                        ctx.beginPath(); ctx.moveTo(X(g), cy - 6); ctx.lineTo(X(g), cy + 6); ctx.stroke();
                        H.label(ctx, g.toFixed(1), X(g), cy + 20, { align: 'center', size: 9.5, color: C.mute });
                    }
                    H.label(ctx, '2,60 – 2,80 típico', (X(2.6) + X(2.8)) / 2, cy - 40, { align: 'center', size: 11, color: VE, weight: '700' });
                    var gx = X(H.clamp(M.gs, 2.4, 3.2));
                    ctx.beginPath(); ctx.moveTo(gx, cy - 44); ctx.lineTo(gx, cy + 44);
                    ctx.strokeStyle = TE; ctx.lineWidth = 3; ctx.shadowColor = TE; ctx.shadowBlur = 12; ctx.stroke();
                    H.label(ctx, 'Gs = ' + H.fmt(M.gs, 3), gx, cy - 52, { align: 'center', size: 13, color: '#fff', weight: '800' });
                    ctx.restore();
                }
            }
        ]
    });

    /* =========================================================================
     * 5 · COMPACTACIÓN PROCTOR  (ASTM D698/D1557 · INV E-141/142)
     * ======================================================================= */
    G.register('compactacion', {
        key: 'compactacion', num: '05', title: 'Compactación (Proctor)', accent: AM, rgb: '251,191,36',
        norma: 'ASTM D698 · INV E-142', duration: 14,
        machine: 'Molde Proctor y martillo',
        desc: 'Con el peso del molde y su volumen se obtienen γh y γd de cada punto: la curva γd – w tiene un máximo en w óptimo.',
        chips: ['γd', 'w óptimo', 'γd máx', 'curva'],
        fields: [
            { id: 'molde', label: 'Peso del molde', unit: 'g', min: 2000, max: 6000, step: 10, value: 4250, dec: 0 },
            { id: 'vol', label: 'Volumen del molde', unit: 'cm³', min: 800, max: 2300, step: 5, value: 944, dec: 0 },
            { id: 'wopt', label: 'Humedad óptima', unit: '%', min: 6, max: 26, step: 0.5, value: 13, dec: 1 },
            { id: 'gmax', label: 'γd máxima', unit: 'g/cm³', min: 1.4, max: 2.3, step: 0.01, value: 1.92, dec: 3 },
            { id: 'energia', type: 'select', label: 'Energía', value: 'estandar',
              options: [['estandar', 'Estándar (600 kN·m/m³)'], ['modificado', 'Modificado (2700 kN·m/m³)']] }
        ],
        readouts: [
            { k: 'w', label: 'w', unit: '%', dec: 1 },
            { k: 'gh', label: 'γh', unit: 'g/cm³', dec: 3 },
            { k: 'gd', label: 'γd', unit: 'g/cm³', dec: 3 },
            { k: 'gc', label: 'GC', unit: '%', dec: 1 }
        ],
        fromData: function (d) {
            if (!d || !d.max) return null;
            var o = { wopt: Math.round(d.max.w * 2) / 2, gmax: Math.round(d.max.ds * 100) / 100 };
            return o;
        },
        model: function (P) {
            /* gaussiana alrededor del óptimo: γd(w) */
            var sig = P.energia === 'modificado' ? 3.6 : 4.6;
            var amp = P.energia === 'modificado' ? 1.045 : 1.0;
            var gmax = P.gmax * amp;
            var pts = [];
            for (var w = 3; w <= 30; w += 0.5) {
                var gd = gmax * Math.exp(-Math.pow(w - P.wopt, 2) / (2 * sig * sig));
                if (gd < 0.4) continue;
                var gh = gd * (1 + w / 100);
                pts.push({ x: w, y: gd, gh: gh });
            }
            /* saturación ZAV (Gs = 2.70) */
            var zav = [];
            for (var w2 = 4; w2 <= 30; w2 += 1) { var gdz = 2.70 / (1 + w2 / 100 * 2.70); if (gdz > 0.9) zav.push({ x: w2, y: gdz }); }
            return { pts: pts, gmax: gmax, zav: zav, sig: sig };
        },
        at: function (P, M, p) {
            var tt = H.clamp(p, 0, 1);
            var w = H.lerp(4, Math.min(28, P.wopt * 2 + 2), tt);
            var gd = M.gmax * Math.exp(-Math.pow(w - P.wopt, 2) / (2 * M.sig * M.sig));
            var gh = gd * (1 + w / 100);
            return { w: w, gd: gd, gh: gh, gc: gd / 1.80 * 100, golpes: Math.floor(H.clamp(p / 0.8, 0, 1) * 56) % 56 };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ensayo finalizado', cls: 'is-done' };
            return { txt: 'Compactando capas', cls: 'is-run' };
        },
        summary: function (P, M) {
            return [
                { label: 'w óptimo', value: H.fmt(P.wopt, 1), unit: '%', hi: true },
                { label: 'γd máx', value: H.fmt(M.gmax, 3), unit: 'g/cm³', hi: true },
                { label: 'γd máx', value: H.fmt(M.gmax * 9.81, 2), unit: 'kN/m³' },
                { label: 'Energía', value: P.energia === 'modificado' ? 'Modificada' : 'Estándar', unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, AM, tick * 0.15);
            var cx = W * 0.4;
            /* molde Proctor */
            var mw = 150, mh = 210, my = 180;
            ctx.save();
            var g = ctx.createLinearGradient(cx - mw / 2, 0, cx + mw / 2, 0);
            g.addColorStop(0, '#4a5870'); g.addColorStop(0.5, '#a7b4c8'); g.addColorStop(1, '#3a4659');
            H.rrect(ctx, cx - mw / 2, my, mw, mh, 8); ctx.fillStyle = g; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.4; ctx.stroke();
            /* suelo compactado por capas (3 capas) */
            var capas = 3, frac = H.clamp(p / 0.8, 0, 1);
            for (var i = 0; i < capas; i++) {
                var cf = H.clamp(frac * capas - i, 0, 1);
                if (cf <= 0) continue;
                var ch = (mh - 20) / capas;
                ctx.fillStyle = i % 2 ? '#8a5f36' : '#a37144';
                H.rrect(ctx, cx - mw / 2 + 6, my + mh - 10 - (i + 1) * ch, mw - 12, ch * cf, 3); ctx.fill();
            }
            ctx.restore();
            /* collarín y base */
            H.steel(ctx, cx - mw / 2 - 14, my - 20, mw + 28, 22, 4, true);
            H.steel(ctx, cx - mw / 2 - 14, my + mh - 4, mw + 28, 22, 4, true);
            /* martillo que cae */
            var golpe = (tick * 2) % 60;
            var hy = my + 60 - golpe;
            H.steel(ctx, cx - 34, hy, 68, 30, 5);
            ctx.strokeStyle = '#9fb0c8'; ctx.lineWidth = 3;
            ctx.beginPath(); ctx.moveTo(cx, hy); ctx.lineTo(cx, hy - 70); ctx.stroke();
            if (golpe > 54) { /* impacto */ }
            H.label(ctx, 'MARTILLO  2,5 kg · 30,5 cm', cx, my + 44, { align: 'center', size: 10.5, color: C.soft, weight: '700' });
            H.label(ctx, 'Golpes: ' + S.golpes, cx, my + mh + 40, { align: 'center', size: 12, color: AM, weight: '800' });
            /* curva γd – w en miniatura */
            var px = W - 250, py = 120, Lw = 210, Lh = 160;
            H.label(ctx, 'Curva de compactación', px, py - 16, { size: 12, color: C.text, weight: '800' });
            ctx.save();
            function X(w) { return px + (w - 3) / 27 * Lw; }
            function Y(v) { return py + Lh - (v - 1.3) / 0.9 * Lh; }
            ctx.strokeStyle = 'rgba(167,180,200,.18)'; ctx.beginPath();
            for (var i = 0; i <= 4; i++) { ctx.moveTo(px + i / 4 * Lw, py); ctx.lineTo(px + i / 4 * Lw, py + Lh); ctx.moveTo(px, py + i / 4 * Lh); ctx.lineTo(px + Lw, py + i / 4 * Lh); }
            ctx.stroke();
            ctx.strokeStyle = 'rgba(167,180,200,.5)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + Lh); ctx.lineTo(px + Lw, py + Lh); ctx.stroke();
            ctx.beginPath(); M.pts.forEach(function (q, i) { i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)); });
            ctx.strokeStyle = AM; ctx.lineWidth = 2.4; ctx.stroke();
            ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(45,212,191,.6)';
            ctx.beginPath(); M.zav.forEach(function (q, i) { i ? ctx.lineTo(X(q.x), Y(q.y)) : ctx.moveTo(X(q.x), Y(q.y)); }); ctx.stroke(); ctx.restore();
            ctx.beginPath(); ctx.arc(X(P.wopt), Y(M.gmax), 5, 0, H.TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = AM; ctx.lineWidth = 2; ctx.stroke();
            ctx.beginPath(); ctx.arc(X(S.w), Y(S.gd), 5, 0, H.TAU); ctx.fillStyle = AM; ctx.fill();
            ctx.restore();
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Curva de compactación γd – w', xlabel: 'Humedad w (%)', ylabel: 'γd (g/cm³)',
                        xmin: 3, xmax: 30, ymin: 1.3, ymax: 2.2,
                        pts: M.pts, progress: H.clamp(p, 0, 1), color: AM,
                        under: function (c, X, Y) {
                            c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(45,212,191,.55)';
                            c.beginPath(); c.moveTo(X(P.wopt), Y(1.3)); c.lineTo(X(P.wopt), Y(M.gmax)); c.stroke();
                            c.beginPath(); c.moveTo(X(3), Y(M.gmax)); c.lineTo(X(P.wopt), Y(M.gmax)); c.stroke(); c.restore();
                            H.label(c, 'w ópt = ' + H.fmt(P.wopt, 1) + ' %', X(P.wopt) + 6, Y(M.gmax) - 12, { size: 10.5, color: TE, weight: '700' });
                            H.label(c, 'γd máx = ' + H.fmt(M.gmax, 3), X(3) + 8, Y(M.gmax) + 12, { size: 10.5, color: AM, weight: '700' });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Puntos del ensayo (γh y γd)', xlabel: 'Humedad w (%)', ylabel: 'γ (g/cm³)',
                        xmin: 3, xmax: 30, ymin: 1.3, ymax: 2.3,
                        pts: M.pts.map(function (q) { return { x: q.x, y: q.gh }; }),
                        progress: H.clamp(p, 0, 1), color: CI,
                        under: function (c, X, Y) {
                            c.beginPath(); M.pts.forEach(function (q, i) { i ? c.lineTo(X(q.x), Y(q.y)) : c.moveTo(X(q.x), Y(q.y)); });
                            c.strokeStyle = H.rgba(CI, 0.7); c.lineWidth = 2; c.stroke();
                            H.label(c, 'γh (húmedo)', X(20), Y(2.15), { size: 10.5, color: CI, weight: '700' });
                            H.label(c, 'γd (seco)', X(20), Y(2.0), { size: 10.5, color: AM, weight: '700' });
                        }
                    });
                }
            }
        ]
    });

    /* =========================================================================
     * 6 · DENSIDAD DE CAMPO (CONO Y ARENA)  (ASTM D1556 · INV E-161)
     * ======================================================================= */
    G.register('densidad', {
        key: 'densidad', num: '06', title: 'Densidad de Campo', accent: RO, rgb: '244,63,94',
        norma: 'ASTM D1556 · INV E-161', duration: 11,
        machine: 'Cono de arena y placa base',
        desc: 'Con la masa de arena y su densidad se conoce el volumen del hueco; γh y γd salen del suelo extraído.',
        chips: ['vol. hueco', 'γh', 'γd', 'GC'],
        fields: [
            { id: 'cono', label: 'Masa arena (cono lleno)', unit: 'g', min: 2500, max: 7000, step: 10, value: 5700, dec: 0 },
            { id: 'rest', label: 'Masa arena restante', unit: 'g', min: 500, max: 5500, step: 10, value: 3150, dec: 0 },
            { id: 'darena', label: 'Densidad de la arena', unit: 'g/cm³', min: 1.2, max: 1.8, step: 0.01, value: 1.52, dec: 2 },
            { id: 'suelo', label: 'Masa del suelo extraído', unit: 'g', min: 500, max: 4000, step: 10, value: 1840, dec: 0 },
            { id: 'w', label: 'Humedad del suelo', unit: '%', min: 2, max: 30, step: 0.5, value: 11, dec: 1 }
        ],
        readouts: [
            { k: 'vol', label: 'Vol. hueco', unit: 'cm³', dec: 2 },
            { k: 'gh', label: 'γh', unit: 'g/cm³', dec: 3 },
            { k: 'gd', label: 'γd', unit: 'g/cm³', dec: 3 },
            { k: 'gc', label: 'GC', unit: '%', dec: 1 }
        ],
        fromData: function (d) {
            if (!d || !isFinite(d.gd)) return null;
            var o = {};
            if (isFinite(d.w)) o.w = d.w;
            /* recomponer entradas coherentes con γd, γh y humedad guardadas */
            if (isFinite(d.gd) && isFinite(d.w)) {
                var gh = d.gd * (1 + d.w / 100), vol = 620;
                o.suelo = Math.round(gh * vol);
                o.darena = 1.52; o.cono = 5700; o.rest = Math.round(5700 - vol * 1.52);
            }
            return Object.keys(o).length ? o : null;
        },
        model: function (P) {
            var vol = (P.cono - P.rest) / P.darena;
            var gh = vol > 0 ? P.suelo / vol : 0;
            var gd = gh / (1 + P.w / 100);
            return { vol: vol, gh: gh, gd: gd, gc: gd / 1.80 * 100 };
        },
        at: function (P, M, p) {
            var paso = H.clamp(p * 4, 0, 4);
            return { vol: M.vol, gh: M.gh, gd: M.gd, gc: M.gc, paso: paso,
                llenando: paso > 1 && paso < 3, pesando: paso >= 3 };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ensayo finalizado', cls: 'is-done' };
            if (S.paso < 1) return { txt: 'Excavando el hueco', cls: 'is-run' };
            if (S.paso < 3) return { txt: 'Llenando el cono con arena', cls: 'is-run' };
            return { txt: 'Pesando arena y suelo', cls: 'is-run' };
        },
        summary: function (P, M) {
            return [
                { label: 'Vol. hueco', value: H.fmt(M.vol, 1), unit: 'cm³' },
                { label: 'γh', value: H.fmt(M.gh, 3), unit: 'g/cm³' },
                { label: 'γd', value: H.fmt(M.gd, 3), unit: 'g/cm³', hi: true },
                { label: 'GC', value: H.fmt(M.gc, 1), unit: '%', hi: true },
                { label: 'Estado', value: M.gc >= 95 ? 'Bien compactado' : M.gc >= 90 ? 'Aceptable' : 'Insuficiente', unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, RO, tick * 0.15);
            var cx = W * 0.4;
            /* superficie del terreno */
            ctx.fillStyle = '#4a5870'; ctx.fillRect(0, 330, W, Ht - 330);
            ctx.fillStyle = 'rgba(167,180,200,.15)';
            ctx.fillRect(0, 330, W, 4);
            H.label(ctx, 'TERRENO COMPACTADO', W - 12, 352, { align: 'right', size: 10.5, color: C.mute, weight: '700' });
            /* hueco */
            var hw = 90, hd = 70;
            ctx.beginPath();
            ctx.moveTo(cx - hw / 2, 330); ctx.lineTo(cx - hw / 2 + 12, 330 + hd);
            ctx.quadraticCurveTo(cx, 330 + hd + 22, cx + hw / 2 - 12, 330 + hd);
            ctx.lineTo(cx + hw / 2, 330); ctx.closePath();
            ctx.fillStyle = S.paso < 1 ? '#2a3346' : S.paso < 3 ? '#b98a5a' : '#8a5f36';
            ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke();
            /* placa base + cono */
            if (S.paso > 0.6) {
                H.steel(ctx, cx - 110, 322, 220, 14, 4, true);
                ctx.beginPath();
                ctx.moveTo(cx - 60, 322); ctx.lineTo(cx + 60, 322);
                ctx.lineTo(cx + 26, 200); ctx.lineTo(cx - 26, 200); ctx.closePath();
                var cg = ctx.createLinearGradient(cx - 60, 0, cx + 60, 0);
                cg.addColorStop(0, '#3a4659'); cg.addColorStop(0.5, '#a7b4c8'); cg.addColorStop(1, '#3a4659');
                ctx.fillStyle = cg; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke();
                /* arena fluyendo */
                if (S.llenando) {
                    var rr = H.rng(4);
                    for (var k = 0; k < 22; k++) {
                        var t = (tick * 4 + k * 30) % hd;
                        ctx.fillStyle = 'rgba(226,214,180,.85)';
                        ctx.beginPath(); ctx.arc(cx + (rr() - 0.5) * 40, 322 + t, 1.8, 0, H.TAU); ctx.fill();
                    }
                }
                H.label(ctx, 'CONO DE ARENA', cx, 186, { align: 'center', size: 11, color: C.soft, weight: '700' });
            }
            /* volúmenes */
            H.label(ctx, 'Volumen del hueco ≈ ' + H.fmt(M.vol, 1) + ' cm³', W / 2, 250, { align: 'center', size: 13, color: RO, weight: '800', bg: 'rgba(244,63,94,.12)', stroke: 'rgba(244,63,94,.35)' });
            /* fórmula y resultado */
            H.label(ctx, 'γh = ' + H.fmt(M.gh, 3) + ' g/cm³    ·    γd = γh / (1 + w/100) = ' + H.fmt(M.gd, 3) + ' g/cm³', W / 2, Ht - 34, { align: 'center', size: 12.5, color: C.text, weight: '800' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Reparto de masas del ensayo', xlabel: 'Componente', ylabel: 'Masa (g)',
                        xmin: 0, xmax: 4, ymin: 0, ymax: Math.ceil(Math.max(P.cono, P.suelo) * 1.15 / 100) * 100,
                        xticks: [0, 1, 2, 3, 4], xfmt: function (v) { return ['Arena cono', 'Arena rest.', 'Arena usada', 'Suelo', ''][v] || ''; },
                        pts: [{ x: 0, y: P.cono }, { x: 1, y: P.rest }, { x: 2, y: P.cono - P.rest }, { x: 3, y: P.suelo }, { x: 4, y: 0 }],
                        progress: H.clamp(p * 1.1, 0, 1), color: RO,
                        under: function (c, X, Y) { H.label(c, 'Arena usada = ' + H.fmt(P.cono - P.rest, 0) + ' g', X(2), Y(P.cono - P.rest) - 12, { align: 'center', size: 10.5, color: RO, weight: '700' }); }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    ctx.save();
                    H.rrect(ctx, 0, 0, W, Ht, 14); ctx.fillStyle = C.bg; ctx.fill();
                    H.label(ctx, 'Grado de compactación (GC)', 16, 16, { color: C.text, size: 13, weight: '700' });
                    var cxm = W / 2, cym = Ht / 2 + 18, R = 88;
                    ctx.lineWidth = 20; ctx.strokeStyle = 'rgba(43,58,80,.8)';
                    ctx.beginPath(); ctx.arc(cxm, cym, R, Math.PI, H.TAU); ctx.stroke();
                    var frac = H.clamp(M.gc / 100, 0, 1.15);
                    ctx.strokeStyle = M.gc >= 95 ? VE : M.gc >= 90 ? AM : RO;
                    ctx.lineCap = 'round';
                    ctx.beginPath(); ctx.arc(cxm, cym, R, Math.PI, Math.PI + Math.min(frac, 1) * Math.PI); ctx.stroke();
                    H.label(ctx, H.fmt(M.gc, 1) + ' %', cxm, cym - 26, { align: 'center', size: 30, color: C.text, weight: '800' });
                    H.label(ctx, 'GC (referencia 95 %)', cxm, cym - 2, { align: 'center', size: 11, color: C.mute });
                    H.label(ctx, M.gc >= 95 ? 'Bien compactado' : M.gc >= 90 ? 'Aceptable' : 'Insuficiente', cxm, cym + 52, { align: 'center', size: 12.5, color: M.gc >= 95 ? VE : M.gc >= 90 ? AM : RO, weight: '800' });
                    ctx.restore();
                }
            }
        ]
    });

    /* =========================================================================
     * 7 · CLASIFICACIÓN SUCS  (ASTM D2487 · INV E-151/126)
     * ======================================================================= */
    G.register('clasificacion', {
        key: 'clasificacion', num: '07', title: 'Clasificación SUCS', accent: VE, rgb: '34,197,94',
        norma: 'ASTM D2487 · INV E-126', duration: 8,
        machine: 'Mesa de clasificación y carta SUCS',
        desc: 'Con % pasa #200, LL, IP y % pasa #4 se ubica el suelo en la carta SUCS y se obtiene su símbolo.',
        chips: ['% #200', 'LL', 'IP', 'símbolo'],
        fields: [
            { id: 'p200', label: '% pasa tamiz #200', unit: '%', min: 0, max: 100, step: 1, value: 62, dec: 0 },
            { id: 'll', label: 'Límite líquido LL', unit: '%', min: 0, max: 90, step: 1, value: 46, dec: 0 },
            { id: 'ip', label: 'Índice plástico IP', unit: '%', min: 0, max: 60, step: 1, value: 24, dec: 0 },
            { id: 'p4', label: '% pasa tamiz #4', unit: '%', min: 0, max: 100, step: 1, value: 92, dec: 0 }
        ],
        readouts: [
            { k: 'sim', label: 'Símbolo', unit: '', txt: true },
            { k: 'll', label: 'LL', unit: '%', dec: 0 },
            { k: 'ip', label: 'IP', unit: '%', dec: 0 },
            { k: 'p200', label: '% #200', unit: '%', dec: 0 }
        ],
        fromData: function (d) {
            if (!d || !isFinite(d.p200)) return null;
            var o = { p200: d.p200 };
            if (isFinite(d.ll)) o.ll = d.ll;
            if (isFinite(d.ip)) o.ip = d.ip;
            if (isFinite(d.p4)) o.p4 = d.p4;
            return o;
        },
        model: function (P) {
            var sim, tipo, desc, familia;
            var lineaA = 0.73 * (P.ll - 20);
            if (P.p200 < 50) {
                sim = P.p4 > 50 ? (P.p200 < 5 ? 'GW' : 'GP') : (P.p200 < 5 ? 'SW' : 'SP');
                tipo = P.p4 > 50 ? 'Grava' : 'Arena';
                familia = 'grueso';
                desc = tipo + ' ' + (P.p200 < 5 ? 'bien graduada' : 'mal graduada');
            } else {
                sim = P.ll < 50 ? (P.ip > lineaA ? 'CL' : 'ML') : (P.ip > lineaA ? 'CH' : 'MH');
                tipo = P.ll < 50 ? (P.ip > lineaA ? 'Arcilla' : 'Limo') : (P.ip > lineaA ? 'Arcilla grasa' : 'Limo elástico');
                familia = 'fino';
                desc = tipo + ' (IP=' + P.ip.toFixed(1) + ', LL=' + P.ll.toFixed(1) + ')';
            }
            return { sim: sim, tipo: tipo, desc: desc, familia: familia, lineaA: lineaA, plastico: P.ip > 0 };
        },
        at: function (P, M, p) {
            return { sim: M.sim, tipo: M.tipo, desc: M.desc, familia: M.familia, lineaA: M.lineaA,
                marcando: H.clamp(p * 1.5, 0, 1), plastico: M.plastico };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Clasificación obtenida', cls: 'is-done' };
            return { txt: 'Ubicando en la carta SUCS', cls: 'is-run' };
        },
        summary: function (P, M) {
            return [
                { label: 'Símbolo', value: M.sim, unit: '', hi: true },
                { label: 'Tipo', value: M.tipo, unit: '' },
                { label: '% #200', value: H.fmt(P.p200, 0), unit: '%' },
                { label: 'Familia', value: M.familia === 'fino' ? 'Suelo fino' : 'Suelo grueso', unit: '' },
                { label: 'Descripción', value: M.desc, unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, VE, tick * 0.15);
            /* carta SUCS simplificada */
            var Lx = 70, Ly = 70, Lw = W - 300, Lh = Ht - 150;
            H.label(ctx, 'CARTA SUCS', Lx, Ly - 24, { size: 13, color: C.text, weight: '800' });
            function X(ll) { return Lx + H.clamp(ll, 0, 100) / 100 * Lw; }
            function Y(ip) { return Ly + Lh - H.clamp(ip, 0, 60) / 60 * Lh; }
            ctx.save();
            /* zonas */
            ctx.fillStyle = 'rgba(34,197,94,.10)'; ctx.fillRect(X(0), Y(60), X(50) - X(0), Lh);
            ctx.fillStyle = 'rgba(56,189,248,.08)'; ctx.fillRect(X(50), Y(60), Lw - (X(50) - X(0)), Lh);
            /* línea A */
            ctx.beginPath();
            for (var i = 0; i <= 100; i++) { var y = 0.73 * (i - 20); if (y < 0) continue; if (y > 60) break; i === 0 ? ctx.moveTo(X(i), Y(y)) : ctx.lineTo(X(i), Y(y)); }
            ctx.strokeStyle = VI; ctx.lineWidth = 2; ctx.setLineDash([1, 0]); ctx.stroke();
            ctx.strokeStyle = '#3b4a63'; ctx.lineWidth = 1.4; ctx.strokeRect(Lx, Ly, Lw, Lh);
            ctx.beginPath(); ctx.moveTo(X(50), Ly); ctx.lineTo(X(50), Ly + Lh); ctx.stroke();
            ctx.restore();
            H.label(ctx, 'CL', X(20), Y(38), { size: 15, color: H.rgba(VE, .8), weight: '800' });
            H.label(ctx, 'CH', X(72), Y(42), { size: 15, color: H.rgba(VE, .8), weight: '800' });
            H.label(ctx, 'ML', X(20), Y(4), { size: 15, color: H.rgba(CI, .8), weight: '800' });
            H.label(ctx, 'MH', X(72), Y(8), { size: 15, color: H.rgba(CI, .8), weight: '800' });
            if (M.familia === 'fino') {
                var mx = X(P.ll), my = Y(P.ip);
                ctx.beginPath(); ctx.arc(mx, my, 10 * S.marcando + 2, 0, H.TAU); ctx.fillStyle = H.rgba(VE, .3 * S.marcando); ctx.fill();
                ctx.beginPath(); ctx.arc(mx, my, 5, 0, H.TAU); ctx.fillStyle = VE; ctx.fill();
                H.label(ctx, M.sim, mx + 14, my, { size: 16, color: '#fff', weight: '800' });
            }
            /* panel lateral */
            var bx = W - 210;
            H.label(ctx, 'SÍMBOLO', bx, 120, { size: 10.5, color: C.mute, weight: '700' });
            H.label(ctx, M.sim, bx, 168, { size: 56, color: VE, weight: '800' });
            H.label(ctx, M.tipo, bx, 220, { size: 16, color: C.text, weight: '800' });
            H.label(ctx, M.desc, bx, 250, { size: 11, color: C.soft });
            H.label(ctx, 'LL = ' + H.fmt(P.ll, 0) + ' %   IP = ' + H.fmt(P.ip, 0) + ' %', bx, 292, { size: 12, color: C.soft, weight: '700' });
            H.label(ctx, '% pasa #200 = ' + H.fmt(P.p200, 0) + ' %', bx, 316, { size: 12, color: C.soft, weight: '700' });
            H.label(ctx, '% pasa #4 = ' + H.fmt(P.p4, 0) + ' %', bx, 340, { size: 12, color: C.soft, weight: '700' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    ctx.save();
                    H.rrect(ctx, 0, 0, W, Ht, 14); ctx.fillStyle = C.bg; ctx.fill();
                    H.label(ctx, 'Ubicación en la carta SUCS', 16, 16, { color: C.text, size: 13, weight: '700' });
                    var Lx = 54, Ly = 34, Lw = W - 74, Lh = Ht - 78;
                    function X(ll) { return Lx + H.clamp(ll, 0, 100) / 100 * Lw; }
                    function Y(ip) { return Ly + Lh - H.clamp(ip, 0, 60) / 60 * Lh; }
                    ctx.fillStyle = 'rgba(34,197,94,.10)'; ctx.fillRect(X(0), Y(60), X(50) - X(0), Lh);
                    ctx.fillStyle = 'rgba(56,189,248,.08)'; ctx.fillRect(X(50), Y(60), Lw - (X(50) - X(0)), Lh);
                    ctx.beginPath();
                    for (var i = 0; i <= 100; i++) { var y = 0.73 * (i - 20); if (y < 0) continue; if (y > 60) break; i === 0 ? ctx.moveTo(X(i), Y(y)) : ctx.lineTo(X(i), Y(y)); }
                    ctx.strokeStyle = VI; ctx.lineWidth = 2; ctx.stroke();
                    ctx.strokeStyle = '#3b4a63'; ctx.lineWidth = 1.4; ctx.strokeRect(Lx, Ly, Lw, Lh);
                    ctx.beginPath(); ctx.moveTo(X(50), Ly); ctx.lineTo(X(50), Ly + Lh); ctx.stroke();
                    if (M.familia === 'fino') {
                        ctx.beginPath(); ctx.arc(X(P.ll), Y(P.ip), 7, 0, H.TAU); ctx.fillStyle = H.rgba(VE, .25); ctx.fill();
                        ctx.beginPath(); ctx.arc(X(P.ll), Y(P.ip), 4.4, 0, H.TAU); ctx.fillStyle = VE; ctx.fill();
                        H.label(ctx, M.sim, X(P.ll) + 12, Y(P.ip) - 6, { size: 13, color: '#fff', weight: '800' });
                    } else {
                        H.label(ctx, M.sim + ' · ' + M.tipo, W / 2, Ht / 2, { align: 'center', size: 16, color: VE, weight: '800' });
                        H.label(ctx, 'Suelo grueso: no se grafica en LL–IP', W / 2, Ht / 2 + 24, { align: 'center', size: 11, color: C.mute });
                    }
                    ctx.restore();
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    /* barras de fracciones granulométricas */
                    ctx.save();
                    H.rrect(ctx, 0, 0, W, Ht, 14); ctx.fillStyle = C.bg; ctx.fill();
                    H.label(ctx, 'Fracciones de la muestra', 16, 16, { color: C.text, size: 13, weight: '700' });
                    var grav = Math.max(0, 100 - P.p4), arena = Math.max(0, P.p4 - P.p200), fino = P.p200;
                    var fr = [{ l: 'Grava\n#4 a 3"', v: grav, c: '#F87171' }, { l: 'Arena\n#200 a #4', v: arena, c: CI }, { l: 'Finos\n< #200', v: fino, c: VE }];
                    var base = Ht - 50, top = 50, bw = 70, gapx = (W - 3 * bw) / 4;
                    fr.forEach(function (b, i) {
                        var h = Math.max(2, b.v / 100 * (base - top));
                        var x = gapx + i * (bw + gapx);
                        ctx.fillStyle = H.rgba(b.c, 0.85); H.rrect(ctx, x, base - h, bw, h, 5); ctx.fill();
                        H.label(ctx, H.fmt(b.v, 0) + ' %', x + bw / 2, base - h - 12, { align: 'center', size: 12, color: C.text, weight: '800' });
                        b.l.split('\n').forEach(function (ln, j) { H.label(ctx, ln, x + bw / 2, base + 16 + j * 14, { align: 'center', size: 10.5, color: C.soft }); });
                    });
                    ctx.restore();
                }
            }
        ]
    });

    /* =========================================================================
     * 8 · PERMEABILIDAD (CARGA CONSTANTE)  (ASTM D2434 · INV E-130)
     * ======================================================================= */
    G.register('permeabilidad', {
        key: 'permeabilidad', num: '08', title: 'Permeabilidad', accent: CI, rgb: '56,189,248',
        norma: 'ASTM D2434 · INV E-130', duration: 12,
        machine: 'Permeámetro de carga constante',
        desc: 'Con el volumen filtrado en el tiempo, el área y la carga hidráulica se obtiene k = (Q·L)/(A·h) según Darcy.',
        chips: ['Q', 'i = h/L', 'k', 'tipo de suelo'],
        fields: [
            { id: 'vol', label: 'Volumen filtrado', unit: 'cm³', min: 50, max: 900, step: 5, value: 240, dec: 0 },
            { id: 't', label: 'Tiempo', unit: 's', min: 30, max: 600, step: 5, value: 180, dec: 0 },
            { id: 'a', label: 'Área de la muestra', unit: 'cm²', min: 10, max: 90, step: 1, value: 40, dec: 0 },
            { id: 'l', label: 'Longitud de la muestra', unit: 'cm', min: 5, max: 30, step: 0.5, value: 12, dec: 1 },
            { id: 'h', label: 'Carga hidráulica h', unit: 'cm', min: 10, max: 120, step: 1, value: 45, dec: 0 }
        ],
        readouts: [
            { k: 'q', label: 'Caudal Q', unit: 'cm³/s', dec: 4 },
            { k: 'i', label: 'Gradiente i', unit: '—', dec: 4 },
            { k: 'v', label: 'Velocidad v', unit: 'cm/s', dec: 6 },
            { k: 'k', label: 'k', unit: 'cm/s', dec: 7 }
        ],
        fromData: function (d) {
            if (!d || !isFinite(d.k)) return null;
            var l = 12, a = 40, h = 45;
            /* recomponer Q e i coherentes preservando k */
            var i = h / l, v = d.k * i, q = v * a;
            var o = { vol: Math.round(q * 180), t: 180, a: a, l: l, h: h };
            return o;
        },
        model: function (P) {
            var q = P.vol / P.t, i = P.h / P.l, k = (q * P.l) / (P.a * P.h), v = q / P.a;
            return { q: q, i: i, k: k, v: v };
        },
        at: function (P, M, p) {
            var tEl = p * P.t;
            var vfrac = H.clamp(p, 0, 1);
            return { q: M.q, i: M.i, k: M.k, v: M.v, tEl: tEl, volAcum: vfrac * P.vol, llenado: H.clamp(p * 4, 0, 1) };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ensayo finalizado', cls: 'is-done' };
            if (S.llenado < 1) return { txt: 'Saturando la muestra', cls: 'is-run' };
            return { txt: 'Midiendo el caudal', cls: 'is-run' };
        },
        summary: function (P, M) {
            var tipo = M.k > 0.01 ? 'Grava' : M.k > 1e-4 ? 'Arena' : M.k > 1e-6 ? 'Limo' : 'Arcilla';
            return [
                { label: 'k', value: M.k.toExponential(3), unit: 'cm/s', hi: true },
                { label: 'Caudal Q', value: H.fmt(M.q, 4), unit: 'cm³/s' },
                { label: 'Gradiente i', value: H.fmt(M.i, 3), unit: '—' },
                { label: 'Tipo de suelo', value: tipo, unit: '', hi: true }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, CI, tick * 0.15);
            var cx = W * 0.4;
            /* permeámetro: celda con muestra y agua */
            var cw = 150, cy = 110, ch = 230;
            ctx.save();
            var glassG = ctx.createLinearGradient(cx - cw / 2, 0, cx + cw / 2, 0);
            glassG.addColorStop(0, 'rgba(147,197,253,.25)'); glassG.addColorStop(0.5, 'rgba(226,240,255,.35)'); glassG.addColorStop(1, 'rgba(147,197,253,.25)');
            H.rrect(ctx, cx - cw / 2, cy, cw, ch, 10); ctx.fillStyle = glassG; ctx.fill();
            ctx.strokeStyle = 'rgba(200,220,255,.7)'; ctx.lineWidth = 1.6; ctx.stroke();
            /* muestra de suelo */
            ctx.fillStyle = '#a37144';
            H.rrect(ctx, cx - cw / 2 + 8, cy + 90, cw - 16, 96, 4); ctx.fill();
            ctx.fillStyle = 'rgba(0,0,0,.18)';
            var rr = H.rng(6);
            for (var k = 0; k < 60; k++) { ctx.beginPath(); ctx.arc(cx - cw / 2 + 10 + rr() * (cw - 20), cy + 92 + rr() * 92, 1.3, 0, H.TAU); ctx.fill(); }
            /* agua arriba y abajo */
            var lvTop = cy + 90 - H.clamp(S.llenado, 0, 1) * 70;
            ctx.fillStyle = 'rgba(96,165,250,.45)';
            ctx.fillRect(cx - cw / 2 + 4, lvTop, cw - 8, 90 - (cy + 90 - lvTop));
            ctx.fillRect(cx - cw / 2 + 4, cy + 186, cw - 8, ch - 186 - 4);
            ctx.restore();
            /* carga h */
            ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(45,212,191,.7)'; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.moveTo(cx - cw / 2 - 40, lvTop); ctx.lineTo(cx + cw / 2 + 20, lvTop); ctx.stroke(); ctx.restore();
            H.label(ctx, 'h = ' + H.fmt(P.h, 0) + ' cm', cx + cw / 2 + 6, lvTop - 8, { size: 11, color: TE, weight: '700' });
            H.label(ctx, 'PERMEÁMETRO · CARGA CONSTANTE', cx, cy - 22, { align: 'center', size: 11, color: C.soft, weight: '700' });
            /* gotas / flujo */
            for (var d = 0; d < 8; d++) {
                var dy = (tick * 3 + d * 20) % 150;
                ctx.fillStyle = 'rgba(96,165,250,.8)';
                ctx.beginPath(); ctx.arc(cx + 20, cy + 120 + dy, 2, 0, H.TAU); ctx.fill();
            }
            /* probeta de recolección */
            var px = cx + 130, py = 250;
            H.steel(ctx, px - 34, py, 68, 150, 6, true);
            var lleno = H.clamp(S.volAcum / Math.max(P.vol, 1), 0, 1);
            ctx.fillStyle = 'rgba(56,189,248,.7)';
            ctx.fillRect(px - 28, py + 150 - 140 * lleno, 56, 140 * lleno);
            H.label(ctx, H.fmt(S.volAcum, 0) + ' cm³', px, py - 12, { align: 'center', size: 11, color: CI, weight: '800' });
            H.label(ctx, 't = ' + H.fmt(S.tEl, 0) + ' s', px, py + 168, { align: 'center', size: 11, color: C.soft });
            /* fórmula */
            H.label(ctx, 'k = (Q · L) / (A · h)', W / 2, 250, { align: 'center', size: 12.5, color: CI, weight: '800', bg: 'rgba(56,189,248,.10)', stroke: 'rgba(56,189,248,.35)' });
            H.label(ctx, 'k = ' + M.k.toExponential(3) + ' cm/s', W / 2, 286, { align: 'center', size: 18, color: C.text, weight: '800' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Volumen filtrado en el tiempo', xlabel: 'Tiempo t (s)', ylabel: 'Volumen Q·t (cm³)',
                        xmin: 0, xmax: P.t, ymin: 0, ymax: Math.ceil(P.vol * 1.15 / 10) * 10,
                        pts: [{ x: 0, y: 0 }, { x: P.t, y: P.vol }],
                        progress: H.clamp(p, 0, 1), color: CI,
                        under: function (c, X, Y) {
                            var xr = P.t;
                            H.label(c, 'Q = ' + H.fmt(M.q, 4) + ' cm³/s', X(xr * 0.5), Y(P.vol * 0.55), { size: 11, color: CI, weight: '700' });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    /* escala de k por tipo de suelo (log) */
                    ctx.save();
                    H.rrect(ctx, 0, 0, W, Ht, 14); ctx.fillStyle = C.bg; ctx.fill();
                    H.label(ctx, 'k frente a los tipos de suelo', 16, 16, { color: C.text, size: 13, weight: '700' });
                    var Lx = 60, Lw = W - 100, cy = Ht / 2 + 10;
                    var eMin = -8, eMax = 1;
                    function X(k) { return Lx + (Math.log10(H.clamp(k, 1e-8, 10)) - eMin) / (eMax - eMin) * Lw; }
                    var bands = [
                        { l: 'Arcilla', a: 1e-8, b: 1e-6, c: RO },
                        { l: 'Limo', a: 1e-6, b: 1e-4, c: AM },
                        { l: 'Arena', a: 1e-4, b: 1e-2, c: CI },
                        { l: 'Grava', a: 1e-2, b: 10, c: VE }
                    ];
                    bands.forEach(function (bd) {
                        ctx.fillStyle = H.rgba(bd.c, 0.18);
                        ctx.fillRect(X(bd.a), cy - 24, X(bd.b) - X(bd.a), 48);
                        H.label(ctx, bd.l, (X(bd.a) + X(bd.b)) / 2, cy + 34, { align: 'center', size: 10.5, color: bd.c, weight: '700' });
                    });
                    ctx.strokeStyle = '#3b4a63'; ctx.lineWidth = 1.4;
                    ctx.beginPath(); ctx.moveTo(Lx, cy); ctx.lineTo(Lx + Lw, cy); ctx.stroke();
                    var kx = X(M.k);
                    ctx.beginPath(); ctx.moveTo(kx, cy - 42); ctx.lineTo(kx, cy + 42);
                    ctx.strokeStyle = CI; ctx.lineWidth = 3; ctx.shadowColor = CI; ctx.shadowBlur = 12; ctx.stroke();
                    H.label(ctx, M.k.toExponential(2), kx, cy - 56, { align: 'center', size: 12.5, color: '#fff', weight: '800' });
                    ctx.restore();
                }
            }
        ]
    });

})(window);
