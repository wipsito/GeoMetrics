/**
 * Simuladores 2D · Mecánica de Suelos I (1/2): humedad, granulometría, límites de Atterberg, gravedad específica
 */
(function (global) {
    'use strict';
    var G = global.GeoSim2D, H = G.H, C = G.C;
    var clamp = H.clamp, lerp = H.lerp, fmt = H.fmt;
    function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
    var SVG = function (inner) { return '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'; };

    /* ---- carta de plasticidad reutilizable (también la usa clasificación) ---- */
    function plasticity(ctx, W, Ht, LL, IP, color, title) {
        var A = [{ x: 20, y: 0 }, { x: 100, y: 0.73 * 80 }];
        H.plot(ctx, W, Ht, {
            title: title || 'Carta de plasticidad', xlabel: 'Límite líquido LL (%)', ylabel: 'Índice de plasticidad IP (%)',
            xmin: 0, xmax: 100, ymin: 0, ymax: 60, xticks: [0, 20, 40, 50, 60, 80, 100], yticks: [0, 10, 20, 30, 40, 50, 60],
            pts: A, progress: 1, color: color, nolive: true,
            over: function (c, X, Y) {
                /* zonas */
                c.save(); c.globalAlpha = 0.10; c.fillStyle = color;
                c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(50), Y(0)); c.lineTo(X(50), Y(60)); c.lineTo(X(0), Y(60)); c.closePath();
                c.restore();
                c.save(); c.setLineDash([]); c.lineWidth = 2; c.strokeStyle = '#FBBF24';
                c.beginPath(); c.moveTo(X(20), Y(0)); c.lineTo(X(100), Y(Math.min(60, 0.73 * 80))); c.stroke();
                c.setLineDash([5, 4]); c.strokeStyle = '#F87171';
                c.beginPath(); c.moveTo(X(16), Y(0)); c.lineTo(X(16), Y(7.2)); c.lineTo(X(8 + 60 / 0.9), Y(60)); c.stroke();
                c.setLineDash([3, 4]); c.strokeStyle = 'rgba(167,180,200,.6)'; c.lineWidth = 1.4;
                c.beginPath(); c.moveTo(X(50), Y(0)); c.lineTo(X(50), Y(60)); c.stroke();
                c.beginPath(); c.moveTo(X(10), Y(4)); c.lineTo(X(25.5), Y(4)); c.moveTo(X(10), Y(7)); c.lineTo(X(29.5), Y(7)); c.stroke();
                c.restore();
                H.label(c, 'Línea A', X(88), Y(0.73 * 68) + 16, { size: 10.5, color: '#FBBF24', weight: '700', align: 'center' });
                H.label(c, 'Línea U', X(8 + 52 / 0.9) - 6, Y(52) - 2, { size: 10.5, color: '#F87171', weight: '700', align: 'right' });
                H.label(c, 'CL', X(34), Y(18), { size: 13, color: C.soft, weight: '800', align: 'center' });
                H.label(c, 'CH', X(74), Y(42), { size: 13, color: C.soft, weight: '800', align: 'center' });
                H.label(c, 'ML / OL', X(34), Y(2.2), { size: 10.5, color: C.mute, weight: '700', align: 'center' });
                H.label(c, 'MH / OH', X(76), Y(10), { size: 12, color: C.soft, weight: '800', align: 'center' });
                H.label(c, 'CL-ML', X(16), Y(5.5), { size: 8.5, color: C.mute, weight: '700', align: 'center' });
                /* punto */
                var px = X(clamp(LL, 0, 100)), py = Y(clamp(IP, 0, 60));
                c.beginPath(); c.arc(px, py, 11, 0, H.TAU); c.fillStyle = H.rgba(color, 0.28); c.fill();
                c.beginPath(); c.arc(px, py, 5.5, 0, H.TAU); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = color; c.lineWidth = 2.2; c.stroke();
                H.label(c, '(' + fmt(LL, 0) + ', ' + fmt(IP, 0) + ')', px + 12, py - 10, { size: 11, color: '#fff', weight: '800' });
            }
        });
    }
    G.ms1 = { plasticity: plasticity, SVG: SVG, ease: ease };

    /* =====================================================================
       1 · CONTENIDO DE HUMEDAD  (ASTM D2216 · INV E-122)
    ===================================================================== */
    var HA = '#38BDF8';
    G.register('humedad', {
        key: 'humedad', num: '01', title: 'Contenido de Humedad', accent: HA, rgb: '56,189,248',
        norma: 'ASTM D2216 · INV E-122', duration: 12, machine: 'Horno de secado y balanza analítica',
        glyph: SVG('<rect x="8" y="14" width="48" height="38" rx="4"/><rect x="14" y="26" width="30" height="20" rx="2"/><circle cx="50" cy="22" r="2"/><path d="M22 36c2-3 4 3 6 0s4 3 6 0"/>'),
        desc: 'Pesa la muestra húmeda, sécala a 110 °C hasta masa constante y calcula w = Ww / Ws.',
        chips: ['w', 'Ws', 'Ww', 'Horno 110 °C'],
        fields: [
            { id: 'Wh', label: 'Masa húmeda del suelo', unit: 'g', min: 50, max: 500, step: 5, value: 200, dec: 0 },
            { id: 'w', label: 'Humedad real w', unit: '%', min: 2, max: 80, step: 0.5, value: 18, dec: 1 },
            { id: 'tara', label: 'Masa del recipiente (tara)', unit: 'g', min: 5, max: 80, step: 1, value: 30, dec: 0 }
        ],
        readouts: [
            { k: 'tH', label: 't secado', unit: 'h', dec: 1 },
            { k: 'T', label: 'T horno', unit: '°C', dec: 0 },
            { k: 'm', label: 'Masa suelo', unit: 'g', dec: 2 },
            { k: 'wNow', label: 'w actual', unit: '%', dec: 2 },
            { k: 'lost', label: 'Agua perdida', unit: 'g', dec: 2 }
        ],
        fromData: null,
        model: function (P) {
            var Ws = P.Wh / (1 + P.w / 100), Ww = P.Wh - Ws, tau = 3.2, tmax = 24, pts = [];
            for (var i = 0; i <= 120; i++) { var t = tmax * i / 120; pts.push({ x: t, y: Ws + Ww * Math.exp(-t / tau) }); }
            return { Ws: Ws, Ww: Ww, tau: tau, tmax: tmax, pts: pts };
        },
        at: function (P, M, p) {
            var a = 0.12, b = 0.88, tH = clamp((p - a) / (b - a), 0, 1) * M.tmax;
            var ph = p < a ? 0 : p < b ? 1 : 2;
            var water = M.Ww * Math.exp(-tH / M.tau), m = M.Ws + water;
            if (ph === 0) m = P.Wh;
            return { tH: tH, T: ph === 1 ? 22 + 88 * clamp(tH / 0.7, 0, 1) : (ph === 2 ? 40 : 22), m: m, wNow: water / M.Ws * 100, lost: P.Wh - m, ph: ph, wet: water / Math.max(M.Ww, 1e-6) };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Masa seca registrada', cls: 'is-done' };
            return [{ txt: 'Pesando muestra húmeda', cls: 'is-run' }, { txt: 'Secando a 110 °C', cls: 'is-fail' }, { txt: 'Pesando muestra seca', cls: 'is-run' }][S.ph];
        },
        summary: function (P, M) {
            return [
                { label: 'w = Ww / Ws', value: fmt(P.w, 1), unit: '%', hi: true },
                { label: 'Ws (sólidos)', value: fmt(M.Ws, 2), unit: 'g', hi: true },
                { label: 'Ww (agua)', value: fmt(M.Ww, 2), unit: 'g' },
                { label: 'Wh + tara', value: fmt(P.Wh + P.tara, 1), unit: 'g' },
                { label: 'Ws + tara', value: fmt(M.Ws + P.tara, 1), unit: 'g' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, HA, tick * 0.15);
            var Tf = clamp((S.T - 22) / 88, 0, 1);
            /* ---- horno ---- */
            H.steel(ctx, 50, 96, 360, 310, 14, false);
            H.rrect(ctx, 78, 150, 304, 226, 8); ctx.fillStyle = '#10151f'; ctx.fill();
            var gi = ctx.createLinearGradient(0, 150, 0, 376);
            gi.addColorStop(0, 'rgba(251,146,60,' + (0.15 + 0.5 * Tf) + ')'); gi.addColorStop(1, 'rgba(244,63,94,' + (0.1 + 0.55 * Tf) + ')');
            H.rrect(ctx, 78, 150, 304, 226, 8); ctx.fillStyle = gi; ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.strokeStyle = 'rgba(200,210,225,.65)'; ctx.lineWidth = 3;
            [240, 320].forEach(function (y) { ctx.beginPath(); ctx.moveTo(86, y); ctx.lineTo(374, y); ctx.stroke(); });
            for (var r = 0; r < 12; r++) { ctx.fillStyle = 'rgba(255,255,255,.05)'; ctx.fillRect(86 + r * 24, 156, 2, 214); }
            H.rrect(ctx, 70, 108, 320, 32, 8); ctx.fillStyle = '#0a0f18'; ctx.fill();
            ctx.fillStyle = Tf > 0.02 ? '#fb923c' : '#64748b'; ctx.font = '800 20px monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
            ctx.fillText(fmt(S.T, 0) + ' °C', 84, 125);
            H.label(ctx, 'HORNO · 105–110 °C', 380, 125, { align: 'right', size: 10.5, color: C.mute, weight: '700' });
            /* ---- balanza ---- */
            H.steel(ctx, 470, 366, 280, 46, 8, true);
            H.rrect(ctx, 520, 372, 120, 30, 5); ctx.fillStyle = '#0a1a10'; ctx.fill();
            var reading = S.ph === 1 ? 0 : (S.ph === 0 ? P.Wh + P.tara : M.Ws + P.tara);
            ctx.fillStyle = '#86efac'; ctx.font = '800 21px monospace'; ctx.textAlign = 'right'; ctx.fillText(fmt(reading, 2) + ' g', 632, 388);
            H.steel(ctx, 520, 352, 220, 10, 3);
            ctx.fillStyle = 'rgba(167,180,200,.4)'; ctx.fillRect(500, 340, 4, 26); ctx.fillRect(736, 340, 4, 26);
            H.label(ctx, 'BALANZA 0,01 g', 690, 389, { align: 'center', size: 9.5, color: '#cbd5e1', weight: '800' });
            /* ---- recipiente: viaja balanza → horno → balanza ---- */
            var tIn = ease((p - 0.10) / 0.05), tOut = ease((p - 0.85) / 0.05);
            var px = lerp(630, 230, tIn), py = lerp(352, 316, tIn);
            px = lerp(px, 630, tOut); py = lerp(py, 352, tOut);
            if (tIn > 0 && tIn < 1) py -= Math.sin(tIn * Math.PI) * 40;
            if (tOut > 0 && tOut < 1) py -= Math.sin(tOut * Math.PI) * 40;
            var dw = 96;
            var c1 = [92, 58, 34], c2 = [188, 150, 104], wet = S.ph === 1 ? S.wet : (S.ph === 0 ? 1 : 0);
            var col = 'rgb(' + Math.round(lerp(c2[0], c1[0], wet)) + ',' + Math.round(lerp(c2[1], c1[1], wet)) + ',' + Math.round(lerp(c2[2], c1[2], wet)) + ')';
            var col2 = 'rgb(' + Math.round(lerp(c2[0], c1[0], wet) * 0.78) + ',' + Math.round(lerp(c2[1], c1[1], wet) * 0.78) + ',' + Math.round(lerp(c2[2], c1[2], wet) * 0.78) + ')';
            H.pile(ctx, px, py - 14, dw * 0.8, 10 + 20 * (S.m / Math.max(P.Wh, 1)), col, col2, 8);
            ctx.beginPath(); ctx.moveTo(px - dw / 2, py - 16); ctx.lineTo(px + dw / 2, py - 16); ctx.lineTo(px + dw / 2 - 8, py); ctx.lineTo(px - dw / 2 + 8, py); ctx.closePath();
            var gc = ctx.createLinearGradient(px - dw / 2, 0, px + dw / 2, 0);
            gc.addColorStop(0, '#6b7a90'); gc.addColorStop(0.5, '#dfe7f1'); gc.addColorStop(1, '#6b7a90'); ctx.fillStyle = gc; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
            /* vapor */
            if (S.ph === 1 && S.wet > 0.04) {
                for (var k = 0; k < 9; k++) {
                    var ph = ((tick * 0.8 + k * 13) % 80) / 80, sx = px + Math.sin(tick * 0.08 + k) * 12 + (k - 4) * 6;
                    ctx.beginPath(); ctx.arc(sx, py - 36 - ph * 70, 3 + ph * 5, 0, H.TAU);
                    ctx.fillStyle = 'rgba(186,230,253,' + (0.5 * (1 - ph) * Math.min(1, S.wet * 3)).toFixed(3) + ')'; ctx.fill();
                }
            }
            H.label(ctx, 'tara + suelo', px, py + 18, { align: 'center', size: 10, color: C.soft });
            H.label(ctx, S.ph === 1 ? 'Secando… masa constante al final' : (S.ph === 0 ? 'Wh + tara' : 'Ws + tara'), 560, 120, { align: 'center', size: 12, color: HA, weight: '800' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Masa de suelo vs tiempo de secado', xlabel: 'Tiempo en el horno (h)', ylabel: 'Masa (g)',
                        xmin: 0, xmax: M.tmax, ymin: Math.floor(M.Ws * 0.96), ymax: Math.ceil(P.Wh * 1.03),
                        pts: M.pts, progress: clamp((p - 0.12) / 0.76, 0.0, 1) || 0.0001, color: HA,
                        under: function (c, X, Y) {
                            c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(56,189,248,.5)';
                            c.beginPath(); c.moveTo(X(0), Y(M.Ws)); c.lineTo(X(M.tmax), Y(M.Ws)); c.stroke(); c.restore();
                            H.label(c, 'masa constante: Ws = ' + fmt(M.Ws, 2) + ' g', X(M.tmax) - 6, Y(M.Ws) - 10, { align: 'right', size: 10.5, color: HA, weight: '700' });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.panelBg(ctx, W, Ht, 'Fases del suelo: sólidos y agua');
                    var x0 = 40, bw = 400, y0 = 88, bh = 56, fs = M.Ws / P.Wh, fw = 1 - fs;
                    H.rrect(ctx, x0, y0, bw, bh, 10); ctx.fillStyle = '#0B1220'; ctx.fill();
                    var waterNow = S.ph === 1 ? S.wet : (S.ph === 0 ? 1 : 0);
                    var ww = bw * fw * waterNow;
                    H.rrect(ctx, x0, y0, bw * fs, bh, 10); ctx.fillStyle = '#a77a4b'; ctx.fill();
                    ctx.save(); H.rrect(ctx, x0 + bw * fs - 6, y0, ww + 6, bh, 8); ctx.fillStyle = H.rgba(HA, 0.85); ctx.fill(); ctx.restore();
                    H.label(ctx, 'Sólidos Ws = ' + fmt(M.Ws, 1) + ' g', x0 + 12, y0 + bh / 2, { size: 12, color: '#fff', weight: '800' });
                    if (waterNow > 0.15) H.label(ctx, 'Agua', x0 + bw * fs + ww / 2 + 2, y0 + bh / 2, { size: 11.5, color: '#06222f', weight: '800', align: 'center' });
                    H.label(ctx, 'Wh = Ws + Ww = ' + fmt(P.Wh, 1) + ' g', x0, y0 - 18, { size: 11.5, color: C.soft, weight: '700' });
                    H.label(ctx, 'w = Ww / Ws × 100', W / 2, 190, { align: 'center', size: 15, color: C.text, weight: '800' });
                    H.label(ctx, '= ' + fmt(S.wNow, 2) + ' %', W / 2, 224, { align: 'center', size: 28, color: HA, weight: '800' });
                    H.label(ctx, 'Agua restante: ' + fmt(M.Ww * S.wet, 2) + ' g de ' + fmt(M.Ww, 2) + ' g', W / 2, 262, { align: 'center', size: 12, color: C.mute });
                    H.label(ctx, 'Tara: ' + fmt(P.tara, 0) + ' g (no cuenta como suelo)', W / 2, 288, { align: 'center', size: 11, color: C.mute });
                }
            }
        ]
    });

    /* =====================================================================
       2 · GRANULOMETRÍA  (ASTM D6913 / D422 · INV E-123)
    ===================================================================== */
    var GA = '#F59E0B';
    var SIEVES = [['3/4"', 19], ['3/8"', 9.5], ['No. 4', 4.75], ['No. 10', 2.0], ['No. 40', 0.425], ['No. 100', 0.15], ['No. 200', 0.075]];
    var PRESETS = {
        grava: { n: 'Grava bien gradada', v: [70, 45, 30, 20, 10, 5, 2] },
        arena: { n: 'Arena bien gradada', v: [100, 100, 98, 80, 40, 12, 4] },
        uniforme: { n: 'Arena uniforme (mal gradada)', v: [100, 100, 100, 98, 62, 6, 1] },
        mixto: { n: 'Arena limo-arcillosa', v: [100, 96, 88, 78, 60, 46, 32] },
        fino: { n: 'Suelo fino (limo / arcilla)', v: [100, 100, 100, 100, 97, 90, 78] }
    };
    function dAt(pass, target) {          /* D para un % que pasa dado, interpolando en escala log */
        var d = SIEVES.map(function (s) { return s[1]; });
        for (var i = 0; i < d.length - 1; i++) {
            var p1 = pass[i], p2 = pass[i + 1];
            if (p1 >= target && p2 <= target && p1 > p2) return Math.pow(10, lerp(Math.log10(d[i]), Math.log10(d[i + 1]), (p1 - target) / (p1 - p2)));
        }
        return pass[0] <= target ? d[0] : null;      /* D más fino que el tamiz 200: no determinable */
    }
    function grLive(P, M, f) {
        var n = SIEVES.length, ret = new Array(n + 1).fill(0), j;
        for (j = 0; j <= n; j++) {
            var pos = Math.min(j, f * n * 1.15), k = Math.floor(pos), fr = pos - k;
            ret[k] += M.fin[j] * (1 - fr);
            if (k + 1 <= n) ret[k + 1] += M.fin[j] * fr; else ret[k] += M.fin[j] * fr;
        }
        return ret;
    }
    G.register('granulometria', {
        key: 'granulometria', num: '02', title: 'Granulometría', accent: GA, rgb: '245,158,11',
        norma: 'ASTM D6913 / D422 · INV E-123', duration: 13, machine: 'Tamizadora con columna de tamices',
        glyph: SVG('<path d="M12 14h40l-4 10H16z"/><path d="M14 28h36l-4 10H18z"/><path d="M16 42h32l-4 10H20z"/>'),
        desc: 'Columna de tamices sobre tamizadora: masas retenidas, curva granulométrica, D10, D30, D60, Cu y Cc.',
        chips: ['% pasa', 'D10 · D30 · D60', 'Cu · Cc'],
        fields: [
            { id: 'M', label: 'Masa total de la muestra', unit: 'g', min: 200, max: 1000, step: 10, value: 500, dec: 0 },
            { id: 'tipo', type: 'select', label: 'Tipo de suelo', value: 'arena',
              options: Object.keys(PRESETS).map(function (k) { return [k, PRESETS[k].n]; }) }
        ],
        readouts: [
            { k: 'tMin', label: 't tamizado', unit: 'min', dec: 1 },
            { k: 'pan', label: 'En el fondo', unit: 'g', dec: 1 },
            { k: 'p200', label: 'Pasa No. 200', unit: '%', dec: 1 },
            { k: 'tot', label: 'Masa total', unit: 'g', dec: 0 }
        ],
        fromData: null,
        model: function (P) {
            var pass = PRESETS[P.tipo].v, fin = [], i, prev = 100, pts = [];
            for (i = 0; i < pass.length; i++) { fin.push(P.M * (prev - pass[i]) / 100); prev = pass[i]; }
            fin.push(P.M * prev / 100);
            for (i = 0; i < pass.length; i++) pts.push({ x: -Math.log10(SIEVES[i][1]), y: pass[i] });
            var D10 = dAt(pass, 10), D30 = dAt(pass, 30), D60 = dAt(pass, 60);
            var Cu = D10 && D60 ? D60 / D10 : null, Cc = D10 && D30 && D60 ? D30 * D30 / (D10 * D60) : null;
            return { pass: pass, fin: fin, pts: pts, D10: D10, D30: D30, D60: D60, Cu: Cu, Cc: Cc };
        },
        at: function (P, M, p) {
            var f = ease((p - 0.10) / 0.70), live = grLive(P, M, f), n = SIEVES.length;
            var below = [], acc = 0, i;
            for (i = n; i >= 0; i--) { below[i] = acc; acc += live[i]; }
            return { f: f, live: live, below: below, tMin: f * 15, pan: live[n], p200: live[n] / P.M * 100, tot: P.M, ph: p < 0.10 ? 0 : p < 0.80 ? 1 : 2 };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Curva granulométrica lista', cls: 'is-done' };
            return [{ txt: 'Cargando la muestra', cls: 'is-run' }, { txt: 'Tamizando (vibración)', cls: 'is-fail' }, { txt: 'Pesando retenidos', cls: 'is-run' }][S.ph];
        },
        summary: function (P, M) {
            function f(v, d) { return v ? fmt(v, d) : '<' + fmt(SIEVES[SIEVES.length - 1][1], 3); }
            return [
                { label: 'D10', value: f(M.D10, 3), unit: 'mm', hi: true },
                { label: 'D30', value: f(M.D30, 3), unit: 'mm' },
                { label: 'D60', value: f(M.D60, 3), unit: 'mm', hi: true },
                { label: 'Cu = D60/D10', value: M.Cu ? fmt(M.Cu, 1) : '—', unit: '' },
                { label: 'Cc', value: M.Cc ? fmt(M.Cc, 2) : '—', unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, GA, tick * 0.15);
            var n = SIEVES.length, shake = S.ph === 1 && p < 1 ? Math.sin(tick * 1.4) * 3.2 : 0;
            var cx = 235, top = 52, sh = 40, gap = 3, wS = 190;
            /* tamizadora */
            H.steel(ctx, cx - 125, 406, 250, 38, 8, true);
            H.label(ctx, 'TAMIZADORA', cx, 426, { align: 'center', size: 9.5, color: '#cbd5e1', weight: '800' });
            /* fondo (pan) */
            var panY = top + n * (sh + gap);
            ctx.save(); ctx.translate(shake, 0);
            ctx.beginPath(); ctx.moveTo(cx - wS / 2, panY); ctx.lineTo(cx + wS / 2, panY); ctx.lineTo(cx + wS / 2 - 14, panY + 38); ctx.lineTo(cx - wS / 2 + 14, panY + 38); ctx.closePath();
            var gp = ctx.createLinearGradient(cx - wS / 2, 0, cx + wS / 2, 0); gp.addColorStop(0, '#5a6a82'); gp.addColorStop(0.5, '#b8c6da'); gp.addColorStop(1, '#5a6a82');
            ctx.fillStyle = gp; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
            H.pile(ctx, cx, panY + 34, wS * 0.7, clamp(S.live[n] / P.M * 140, 0, 26), '#cfae7c', '#8c6a3f', 2);
            for (var i = n - 1; i >= 0; i--) {
                var y = top + i * (sh + gap), mesh = '#2b3a50';
                H.rrect(ctx, cx - wS / 2, y, wS, sh, 4);
                var gs = ctx.createLinearGradient(cx - wS / 2, 0, cx + wS / 2, 0); gs.addColorStop(0, '#8d6e2a'); gs.addColorStop(0.5, '#e9c46a'); gs.addColorStop(1, '#8d6e2a');
                ctx.fillStyle = gs; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
                H.rrect(ctx, cx - wS / 2 + 8, y + sh - 12, wS - 16, 8, 2); ctx.fillStyle = '#1b2433'; ctx.fill();
                ctx.strokeStyle = 'rgba(167,180,200,.35)'; ctx.lineWidth = 1; ctx.beginPath();
                for (var g = 0; g < 18; g++) { ctx.moveTo(cx - wS / 2 + 12 + g * 9, y + sh - 12); ctx.lineTo(cx - wS / 2 + 12 + g * 9, y + sh - 4); }
                ctx.stroke();
                H.pile(ctx, cx, y + sh - 12, wS * 0.7, clamp(S.live[i] / P.M * 190, 0, sh - 14), '#d8b98a', '#9a7447', 5 + i);
            }
            ctx.restore();
            for (var j = 0; j < n; j++) {
                var yy = top + j * (sh + gap) + sh / 2;
                H.label(ctx, SIEVES[j][0], cx - wS / 2 - 14, yy - 6, { align: 'right', size: 11, color: C.soft, weight: '800' });
                H.label(ctx, SIEVES[j][1] + ' mm', cx - wS / 2 - 14, yy + 8, { align: 'right', size: 9.5, color: C.mute });
            }
            H.label(ctx, 'Fondo', cx - wS / 2 - 14, panY + 22, { align: 'right', size: 11, color: C.soft, weight: '800' });
            /* tabla */
            var tx = 480, ty = 56;
            H.rrect(ctx, tx - 16, ty - 24, 306, 340, 16); ctx.fillStyle = 'rgba(8,14,26,.72)'; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
            H.label(ctx, 'Tamiz', tx, ty - 6, { size: 11, color: C.mute, weight: '800' });
            H.label(ctx, 'Retenido', tx + 150, ty - 6, { size: 11, color: C.mute, weight: '800', align: 'right' });
            H.label(ctx, '% pasa', tx + 270, ty - 6, { size: 11, color: C.mute, weight: '800', align: 'right' });
            for (var r = 0; r <= n; r++) {
                var ry = ty + 22 + r * 34, nm = r < n ? SIEVES[r][0] : 'Fondo';
                if (r % 2 === 0) { ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(tx - 8, ry - 14, 290, 30); }
                H.label(ctx, nm, tx, ry, { size: 13, color: C.text, weight: '700' });
                H.label(ctx, fmt(S.live[r], 1) + ' g', tx + 150, ry, { size: 13, color: GA, weight: '800', align: 'right' });
                H.label(ctx, r < n ? fmt(S.below[r] / P.M * 100, 1) : '—', tx + 270, ry, { size: 13, color: C.soft, weight: '700', align: 'right' });
            }
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var xt = SIEVES.map(function (s) { return -Math.log10(s[1]); });
                    H.plot(ctx, W, Ht, {
                        title: 'Curva granulométrica', xlabel: 'Diámetro de partícula D (mm, escala log)', ylabel: '% que pasa',
                        xmin: -Math.log10(30), xmax: -Math.log10(0.05), ymin: 0, ymax: 100, xticks: xt, yticks: [0, 20, 40, 60, 80, 100],
                        xfmt: function (v) { var d = Math.pow(10, -v); return d >= 1 ? fmt(d, d >= 10 ? 0 : 1) : fmt(d, d < 0.1 ? 3 : 2); },
                        pts: M.pts, progress: Math.max(0.001, S.f), color: GA,
                        over: function (c, X, Y) {
                            if (S.f < 0.98) return;
                            [[10, M.D10, 'D10'], [30, M.D30, 'D30'], [60, M.D60, 'D60']].forEach(function (a) {
                                if (!a[1]) return;
                                c.save(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(245,158,11,.7)';
                                c.beginPath(); c.moveTo(X(-Math.log10(30)), Y(a[0])); c.lineTo(X(-Math.log10(a[1])), Y(a[0])); c.lineTo(X(-Math.log10(a[1])), Y(0)); c.stroke(); c.restore();
                                H.label(c, a[2], X(-Math.log10(a[1])) + 4, Y(a[0]) - 10, { size: 10.5, color: GA, weight: '800' });
                            });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.panelBg(ctx, W, Ht, 'Masa retenida en cada tamiz');
                    var n = SIEVES.length + 1, x0 = 52, y0 = 270, bw = (W - x0 - 24) / n, mx = Math.max.apply(null, M.fin) * 1.12 || 1;
                    ctx.strokeStyle = 'rgba(167,180,200,.12)'; ctx.lineWidth = 1;
                    for (var g = 0; g <= 4; g++) { var gy = y0 - g * (y0 - 52) / 4; ctx.beginPath(); ctx.moveTo(x0, gy); ctx.lineTo(W - 16, gy); ctx.stroke(); H.label(ctx, fmt(mx * g / 4, 0), x0 - 6, gy, { align: 'right', size: 9.5, color: C.mute }); }
                    for (var i = 0; i < n; i++) {
                        var h = (S.live[i] / mx) * (y0 - 52), x = x0 + i * bw + 5;
                        var gr = ctx.createLinearGradient(0, y0 - h, 0, y0); gr.addColorStop(0, GA); gr.addColorStop(1, 'rgba(245,158,11,.35)');
                        H.rrect(ctx, x, y0 - h, bw - 10, Math.max(h, 1), 4); ctx.fillStyle = gr; ctx.fill();
                        H.label(ctx, i < n - 1 ? SIEVES[i][0].replace('No. ', '#') : 'Fondo', x + (bw - 10) / 2, y0 + 14, { align: 'center', size: 9.5, color: C.soft, weight: '700' });
                        if (h > 14) H.label(ctx, fmt(S.live[i], 0), x + (bw - 10) / 2, y0 - h - 9, { align: 'center', size: 9.5, color: C.text, weight: '700' });
                    }
                    H.label(ctx, 'g', 24, 46, { size: 10, color: C.mute });
                }
            }
        ]
    });

    /* =====================================================================
       3 · LÍMITES DE ATTERBERG  (ASTM D4318 · INV E-125 / E-126)
    ===================================================================== */
    var LA = '#34D399';
    function limN(P) { var Fi = 0.16 * P.LL; return clamp(25 * Math.pow(10, -P.dw / Fi), 6, 80); }
    G.register('limites', {
        key: 'limites', num: '03', title: 'Límites de Atterberg', accent: LA, rgb: '52,211,153',
        norma: 'ASTM D4318 · INV E-125 / E-126', duration: 12, machine: 'Copa de Casagrande',
        glyph: SVG('<path d="M10 40h44"/><path d="M14 40a18 18 0 0 1 36 0z"/><path d="M32 28v12" stroke-dasharray="2 3"/><rect x="12" y="44" width="40" height="8" rx="2"/>'),
        desc: 'Copa de Casagrande: cuenta los golpes hasta cerrar la ranura; curva de flujo, LL, LP, IP y carta de plasticidad.',
        chips: ['LL', 'LP', 'IP', 'Carta de plasticidad'],
        fields: [
            { id: 'LL', label: 'Límite líquido LL', unit: '%', min: 20, max: 90, step: 1, value: 45, dec: 0 },
            { id: 'IP', label: 'Índice de plasticidad IP', unit: '%', min: 0, max: 50, step: 1, value: 22, dec: 0 },
            { id: 'dw', label: 'Humedad de la prueba (w − LL)', unit: 'pts %', min: -3, max: 4, step: 0.5, value: 0, dec: 1 }
        ],
        readouts: [
            { k: 'N', label: 'Golpes', unit: 'N', dec: 0 },
            { k: 'gap', label: 'Ranura', unit: 'mm', dec: 1 },
            { k: 'w', label: 'w prueba', unit: '%', dec: 1 },
            { k: 'LL', label: 'LL', unit: '%', dec: 0 },
            { k: 'IP', label: 'IP', unit: '%', dec: 0 }
        ],
        fromData: null,
        model: function (P) {
            var Fi = 0.16 * P.LL, Nc = limN(P), pts = [], i;
            for (i = 0; i <= 40; i++) { var lN = lerp(1, 2, i / 40); pts.push({ x: lN, y: P.LL - Fi * (lN - Math.log10(25)) }); }
            return { Fi: Fi, Nc: Nc, pts: pts, LP: P.LL - P.IP, w: P.LL + P.dw };
        },
        at: function (P, M, p) {
            var a = 0.06, b = 0.94, q = clamp((p - a) / (b - a), 0, 1), N = q * M.Nc;
            return { N: N, gap: 2 * (1 - Math.pow(q, 1.4)), w: M.w, LL: P.LL, IP: P.IP, q: q, ph: p < a ? 0 : (p < b ? 1 : 2) };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ranura cerrada · registrar N', cls: 'is-done' };
            return S.ph === 0 ? { txt: 'Trazando la ranura', cls: 'is-run' } : { txt: 'Golpeando la copa', cls: 'is-fail' };
        },
        summary: function (P, M) {
            var IPc = P.IP < 7 ? 'Baja' : P.IP < 17 ? 'Media' : 'Alta';
            return [
                { label: 'LL', value: fmt(P.LL, 0), unit: '%', hi: true },
                { label: 'LP', value: fmt(M.LP, 0), unit: '%', hi: true },
                { label: 'IP = LL − LP', value: fmt(P.IP, 0), unit: '%' },
                { label: 'Índice de flujo', value: fmt(M.Fi, 1), unit: '' },
                { label: 'Plasticidad', value: IPc, unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, LA, tick * 0.15);
            var N = S.N, fr = N - Math.floor(N), running = S.ph === 1 && p < 1;
            var lift = running ? (fr < 0.5 ? ease(fr * 2) : 1 - Math.pow((fr - 0.5) * 2, 3)) * 16 : 0;
            if (running && fr > 0.92) lift = 0;
            /* ---- vista lateral ---- */
            H.label(ctx, 'Vista lateral', 200, 52, { align: 'center', size: 11.5, color: C.mute, weight: '800' });
            H.steel(ctx, 70, 372, 260, 38, 6, true);
            ctx.fillStyle = '#2a2f3a'; ctx.fillRect(110, 340, 180, 32); H.label(ctx, 'BASE DE CAUCHO DURO', 200, 357, { align: 'center', size: 9, color: '#94a3b8', weight: '800' });
            /* leva y manivela */
            ctx.beginPath(); ctx.arc(300, 330, 18, 0, H.TAU); ctx.fillStyle = '#9fb0c8'; ctx.fill(); ctx.strokeStyle = '#334155'; ctx.stroke();
            var ang = N * H.TAU; ctx.beginPath(); ctx.moveTo(300, 330); ctx.lineTo(300 + Math.cos(ang) * 46, 330 + Math.sin(ang) * 46); ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 5; ctx.stroke();
            ctx.beginPath(); ctx.arc(300 + Math.cos(ang) * 46, 330 + Math.sin(ang) * 46, 9, 0, H.TAU); ctx.fillStyle = '#F87171'; ctx.fill();
            /* copa */
            ctx.save(); ctx.translate(200, 336 - lift); 
            ctx.beginPath(); ctx.moveTo(-82, -36); ctx.quadraticCurveTo(-82, 4, 0, 4); ctx.quadraticCurveTo(82, 4, 82, -36); ctx.closePath();
            var gc = ctx.createLinearGradient(-82, 0, 82, 0); gc.addColorStop(0, '#8a6d22'); gc.addColorStop(0.5, '#f2d57a'); gc.addColorStop(1, '#8a6d22'); ctx.fillStyle = gc; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.beginPath(); ctx.moveTo(-70, -34); ctx.quadraticCurveTo(-70, -6, 0, -6); ctx.quadraticCurveTo(70, -6, 70, -34); ctx.closePath(); ctx.fillStyle = '#7a5a3a'; ctx.fill();
            ctx.restore();
            if (lift > 1) { ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(52,211,153,.7)'; ctx.beginPath(); ctx.moveTo(100, 340); ctx.lineTo(100, 340 - 16); ctx.stroke(); ctx.setLineDash([]); H.label(ctx, '10 mm', 56, 332, { size: 10, color: LA, weight: '800' }); }
            H.label(ctx, 'N = ' + Math.floor(N), 200, 90, { align: 'center', size: 30, color: '#fff', weight: '800' });
            H.label(ctx, 'golpes (2 por segundo)', 200, 116, { align: 'center', size: 11, color: C.mute });
            /* ---- vista superior ---- */
            var tx = 590, ty = 220, R = 118;
            H.label(ctx, 'Vista superior · ranura', tx, 52, { align: 'center', size: 11.5, color: C.mute, weight: '800' });
            ctx.beginPath(); ctx.arc(tx, ty, R + 10, 0, H.TAU); ctx.fillStyle = '#b9962b'; ctx.fill();
            var gs = ctx.createRadialGradient(tx - 30, ty - 30, 10, tx, ty, R); gs.addColorStop(0, '#9a7551'); gs.addColorStop(1, '#6b4c30');
            ctx.beginPath(); ctx.arc(tx, ty, R, 0, H.TAU); ctx.fillStyle = gs; ctx.fill();
            var gw = S.gap * 7.2;      /* px */
            ctx.save(); ctx.beginPath(); ctx.arc(tx, ty, R - 2, 0, H.TAU); ctx.clip();
            ctx.fillStyle = '#b9962b'; ctx.fillRect(tx - gw / 2, ty - R, gw, 2 * R);
            ctx.fillStyle = 'rgba(0,0,0,.28)'; ctx.fillRect(tx - gw / 2 - 5, ty - R, 5, 2 * R); ctx.fillRect(tx + gw / 2, ty - R, 5, 2 * R);
            if (S.gap < 0.6) { ctx.fillStyle = '#7d5c3d'; ctx.fillRect(tx - 4, ty - 30, 8, 60); }
            ctx.restore();
            ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(tx, ty, R - 14, 0, H.TAU); ctx.stroke();
            H.label(ctx, 'Ancho de ranura: ' + fmt(S.gap, 1) + ' mm', tx, ty + R + 34, { align: 'center', size: 12.5, color: LA, weight: '800' });
            if (p >= 1) H.label(ctx, 'Cierre de 13 mm con N = ' + fmt(M.Nc, 0) + ' golpes', tx, ty - R - 18, { align: 'center', size: 12.5, color: '#fff', weight: '800', bg: 'rgba(52,211,153,.18)', stroke: 'rgba(52,211,153,.6)' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Curva de flujo (w vs N)', xlabel: 'Número de golpes N (escala log)', ylabel: 'Humedad w (%)',
                        xmin: 1, xmax: 2, ymin: Math.max(0, Math.floor(P.LL - 0.16 * P.LL * 0.55) - 2), ymax: Math.ceil(P.LL + 0.16 * P.LL * 0.55) + 2,
                        xticks: [1, Math.log10(25), 2], xfmt: function (v) { return Math.round(Math.pow(10, v)); },
                        pts: M.pts, progress: 1, color: LA, nolive: true,
                        over: function (c, X, Y) {
                            c.save(); c.strokeStyle = LA; c.lineWidth = 2.6; c.shadowColor = LA; c.shadowBlur = 10; c.beginPath();
                            M.pts.forEach(function (q, i) { if (i) c.lineTo(X(q.x), Y(q.y)); else c.moveTo(X(q.x), Y(q.y)); }); c.stroke(); c.restore();
                            c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(167,180,200,.6)';
                            c.beginPath(); c.moveTo(X(Math.log10(25)), Y(0)); c.lineTo(X(Math.log10(25)), Y(P.LL)); c.lineTo(X(1), Y(P.LL)); c.stroke(); c.restore();
                            H.label(c, 'LL = ' + fmt(P.LL, 0) + ' % (N = 25)', X(1) + 8, Y(P.LL) - 10, { size: 10.5, color: LA, weight: '800' });
                            var nowX = X(Math.log10(Math.max(S.N, 1)));
                            c.save(); c.strokeStyle = 'rgba(255,255,255,.35)'; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(nowX, Y(0)); c.lineTo(nowX, Y(M.w + 30)); c.stroke(); c.restore();
                            var ex = X(Math.log10(M.Nc)), ey = Y(M.w);
                            if (p >= 0.98) { c.beginPath(); c.arc(ex, ey, 10, 0, H.TAU); c.fillStyle = 'rgba(52,211,153,.3)'; c.fill(); c.beginPath(); c.arc(ex, ey, 5, 0, H.TAU); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = LA; c.lineWidth = 2; c.stroke();
                                H.label(c, 'N = ' + fmt(M.Nc, 0), ex + 10, ey - 12, { size: 10.5, color: '#fff', weight: '800' }); }
                        }
                    });
                }
            },
            { W: 480, H: 320, draw: function (ctx, W, Ht, P) { plasticity(ctx, W, Ht, P.LL, P.IP, LA); } }
        ]
    });

    /* =====================================================================
       4 · GRAVEDAD ESPECÍFICA  (ASTM D854 · INV E-128)
    ===================================================================== */
    var PA = '#F472B6';
    function rhoW(T) { return (999.842594 + 6.793952e-2 * T - 9.09529e-3 * T * T + 1.001685e-4 * Math.pow(T, 3) - 1.120083e-6 * Math.pow(T, 4) + 6.536332e-9 * Math.pow(T, 5)) / 1000; }
    G.register('gravedad', {
        key: 'gravedad', num: '04', title: 'Gravedad Específica', accent: PA, rgb: '244,114,182',
        norma: 'ASTM D854 · INV E-128', duration: 13, machine: 'Picnómetro con bomba de vacío y balanza',
        glyph: SVG('<path d="M26 8h12M28 8v14L14 46a6 6 0 0 0 5 10h26a6 6 0 0 0 5-10L36 22V8"/><path d="M20 42h24"/>'),
        desc: 'Picnómetro: pesa con agua y con suelo, elimina el aire con vacío y calcula Gs corregido por temperatura.',
        chips: ['Gs', 'Picnómetro', 'Vacío', 'Corrección T'],
        fields: [
            { id: 'Ws', label: 'Masa de suelo seco Ws', unit: 'g', min: 20, max: 120, step: 1, value: 60, dec: 0 },
            { id: 'Gs', label: 'Gs real del suelo', unit: '', min: 2.4, max: 2.9, step: 0.01, value: 2.67, dec: 2 },
            { id: 'T', label: 'Temperatura del agua', unit: '°C', min: 15, max: 35, step: 1, value: 22, dec: 0 }
        ],
        readouts: [
            { k: 'tV', label: 't vacío', unit: 'min', dec: 0 },
            { k: 'air', label: 'Aire removido', unit: '%', dec: 0 },
            { k: 'Wpw', label: 'Wpw', unit: 'g', dec: 2 },
            { k: 'Wpws', label: 'Wpws', unit: 'g', dec: 2 },
            { k: 'Gs', label: 'Gs', unit: '', dec: 3 }
        ],
        fromData: null,
        model: function (P) {
            var rw = rhoW(P.T), Wp = 175, Vp = 500, Wpw = Wp + Vp * rw, Wpws = Wpw + P.Ws * (1 - 1 / P.Gs);
            var GsT = P.Ws / (P.Ws + Wpw - Wpws), K = rw / rhoW(20), pts = [];
            for (var i = 0; i <= 80; i++) { var t = 30 * i / 80; pts.push({ x: t, y: 100 * (1 - Math.exp(-t / 7)) }); }
            return { rw: rw, Wp: Wp, Wpw: Wpw, Wpws: Wpws, GsT: GsT, K: K, Gs20: GsT * K, pts: pts };
        },
        at: function (P, M, p) {
            var ph = p < 0.15 ? 0 : p < 0.30 ? 1 : p < 0.80 ? 2 : p < 0.92 ? 3 : 4;
            var tV = clamp((p - 0.30) / 0.50, 0, 1) * 30, air = 100 * (1 - Math.exp(-tV / 7));
            var Wpw = ph >= 0 ? M.Wpw : 0;
            return { ph: ph, tV: tV, air: air, Wpw: M.Wpw, Wpws: p >= 0.92 ? M.Wpws : 0, Gs: p >= 0.92 ? M.Gs20 : 0, pour: clamp((p - 0.15) / 0.15, 0, 1) };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Gs calculado', cls: 'is-done' };
            return [{ txt: 'Pesando picnómetro + agua', cls: 'is-run' }, { txt: 'Vertiendo el suelo', cls: 'is-run' }, { txt: 'Aplicando vacío', cls: 'is-fail' }, { txt: 'Aforando el volumen', cls: 'is-run' }, { txt: 'Pesando Wpws', cls: 'is-run' }][S.ph];
        },
        summary: function (P, M) {
            return [
                { label: 'Gs (a 20 °C)', value: fmt(M.Gs20, 3), unit: '', hi: true },
                { label: 'Gs a T de ensayo', value: fmt(M.GsT, 3), unit: '' },
                { label: 'Factor K', value: fmt(M.K, 4), unit: '', hi: true },
                { label: 'ρw a ' + fmt(P.T, 0) + ' °C', value: fmt(M.rw, 4), unit: 'g/cm³' },
                { label: 'Vs', value: fmt(P.Ws / (P.Gs * M.rw), 1), unit: 'cm³' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, PA, tick * 0.15);
            var cx = 330, base = 380;
            /* bomba de vacío */
            H.steel(ctx, 40, 300, 110, 100, 10, true);
            H.label(ctx, 'BOMBA DE VACÍO', 95, 388, { align: 'center', size: 9, color: '#cbd5e1', weight: '800' });
            H.dial(ctx, 95, 336, 28, S.ph === 2 ? 0.9 : 0, 1, PA, 'vac', S.ph === 2 ? '−0.9 bar' : '0');
            ctx.strokeStyle = '#64748b'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(150, 330); ctx.bezierCurveTo(230, 330, 250, 120, cx - 6, 120); ctx.stroke();
            /* mesa */
            H.steel(ctx, 190, base, 300, 22, 5, true);
            /* picnómetro */
            var bodyTop = 190, neckTop = 100;
            ctx.beginPath();
            ctx.moveTo(cx - 14, neckTop); ctx.lineTo(cx - 14, bodyTop); ctx.bezierCurveTo(cx - 14, bodyTop + 14, cx - 90, bodyTop + 30, cx - 90, bodyTop + 100);
            ctx.bezierCurveTo(cx - 90, base - 4, cx - 70, base, cx - 50, base); ctx.lineTo(cx + 50, base);
            ctx.bezierCurveTo(cx + 70, base, cx + 90, base - 4, cx + 90, bodyTop + 100); ctx.bezierCurveTo(cx + 90, bodyTop + 30, cx + 14, bodyTop + 14, cx + 14, bodyTop); ctx.lineTo(cx + 14, neckTop); ctx.closePath();
            ctx.save(); ctx.clip();
            var wl = S.ph === 0 ? bodyTop + 20 : (S.ph >= 3 ? bodyTop - 24 : bodyTop + 14 - S.pour * 8);
            var wg = ctx.createLinearGradient(0, wl, 0, base); var turb = S.ph >= 1 ? 0.55 : 0.3;
            wg.addColorStop(0, 'rgba(96,165,250,' + turb + ')'); wg.addColorStop(1, 'rgba(37,99,235,' + (turb + 0.2) + ')');
            ctx.fillStyle = wg; ctx.fillRect(cx - 100, wl, 200, base - wl + 4);
            if (S.ph >= 1) H.pile(ctx, cx, base - 2, 150, 30 * Math.min(1, S.pour * 1.2), '#c6a27a', '#8a6340', 4);
            if (S.ph === 1) { for (var q = 0; q < 8; q++) { var f = ((tick * 0.04 + q * 0.13) % 1); ctx.fillStyle = '#c6a27a'; ctx.beginPath(); ctx.arc(cx + (q - 4) * 3, neckTop + f * (base - 10 - neckTop) * 0.7, 2, 0, H.TAU); ctx.fill(); } }
            if (S.ph === 2) { var nb = Math.round(16 * (1 - S.air / 100)) + 2;
                for (var b = 0; b < nb; b++) { var bf = ((tick * 0.013 + b * 0.071) % 1), bx = cx + Math.sin(b * 12.7) * 62 * (1 - bf * 0.8), by = base - 10 - bf * (base - 30 - wl);
                    ctx.beginPath(); ctx.arc(bx, by, 2 + (b % 3), 0, H.TAU); ctx.strokeStyle = 'rgba(224,242,254,.8)'; ctx.lineWidth = 1.3; ctx.stroke(); } }
            ctx.restore();
            ctx.strokeStyle = 'rgba(224,242,254,.7)'; ctx.lineWidth = 2.4; ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - 74, bodyTop + 70); ctx.lineTo(cx - 76, bodyTop + 120); ctx.stroke();
            H.steel(ctx, cx - 20, neckTop - 14, 40, 14, 3);
            ctx.strokeStyle = PA; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx - 22, bodyTop - 24); ctx.lineTo(cx + 22, bodyTop - 24); ctx.stroke();
            H.label(ctx, 'marca de aforo', cx + 28, bodyTop - 24, { size: 9.5, color: PA, weight: '700' });
            /* balanza */
            H.steel(ctx, 560, 330, 190, 66, 10, true);
            H.rrect(ctx, 590, 340, 130, 30, 5); ctx.fillStyle = '#0a1a10'; ctx.fill();
            var on = S.ph === 0 ? M.Wpw : (S.ph === 4 ? M.Wpws : 0);
            ctx.fillStyle = '#86efac'; ctx.font = '800 20px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(fmt(on, 2), 710, 356);
            H.label(ctx, 'BALANZA', 655, 386, { align: 'center', size: 9, color: '#cbd5e1', weight: '800' });
            H.steel(ctx, 590, 318, 130, 10, 3);
            if (S.ph === 0 || S.ph === 4) { H.rrect(ctx, 628, 258, 54, 60, 12); ctx.fillStyle = 'rgba(96,165,250,.55)'; ctx.fill(); ctx.strokeStyle = 'rgba(224,242,254,.7)'; ctx.stroke(); }
            H.label(ctx, S.ph === 0 ? 'Wpw (picnómetro + agua)' : S.ph === 4 ? 'Wpws (+ suelo)' : '', 655, 240, { align: 'center', size: 11, color: PA, weight: '800' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Aire atrapado removido por vacío', xlabel: 'Tiempo de vacío (min)', ylabel: 'Aire removido (%)',
                        xmin: 0, xmax: 30, ymin: 0, ymax: 100, pts: M.pts, progress: Math.max(0.001, clamp((p - 0.30) / 0.50, 0, 1)), color: PA,
                        under: function (c, X, Y) { c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(244,114,182,.5)'; c.beginPath(); c.moveTo(X(0), Y(95)); c.lineTo(X(30), Y(95)); c.stroke(); c.restore();
                            H.label(c, '≥ 95 %: la suspensión puede aforarse', X(30) - 6, Y(95) - 10, { align: 'right', size: 10, color: PA, weight: '700' }); }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.panelBg(ctx, W, Ht, 'Valores típicos de Gs');
                    var rows = [['Suelo orgánico', 1.5, 2.5], ['Arena', 2.63, 2.67], ['Limo', 2.65, 2.73], ['Arcilla', 2.70, 2.90]], x0 = 120, x1 = W - 28, g0 = 1.4, g1 = 3.0;
                    function X(v) { return x0 + (v - g0) / (g1 - g0) * (x1 - x0); }
                    ctx.strokeStyle = 'rgba(167,180,200,.12)'; ctx.lineWidth = 1;
                    [1.5, 2, 2.5, 3].forEach(function (v) { ctx.beginPath(); ctx.moveTo(X(v), 60); ctx.lineTo(X(v), 270); ctx.stroke(); H.label(ctx, fmt(v, 1), X(v), 282, { align: 'center', size: 10, color: C.mute }); });
                    rows.forEach(function (r, i) { var y = 80 + i * 48; H.label(ctx, r[0], 14, y, { size: 11.5, color: C.soft, weight: '700' });
                        H.rrect(ctx, X(r[1]), y - 11, Math.max(X(r[2]) - X(r[1]), 8), 22, 8); ctx.fillStyle = H.rgba(PA, 0.55); ctx.fill(); });
                    var gx = X(P.Gs); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(gx, 58); ctx.lineTo(gx, 266); ctx.stroke(); ctx.setLineDash([]);
                    H.label(ctx, 'Gs = ' + fmt(P.Gs, 2), gx, 48, { align: 'center', size: 11.5, color: '#fff', weight: '800' });
                    H.label(ctx, 'Gs corregido (20 °C): ' + fmt(M.Gs20, 3), W / 2, 306, { align: 'center', size: 11.5, color: PA, weight: '800' });
                }
            }
        ]
    });
})(window);
