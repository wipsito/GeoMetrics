/**
 * Simuladores 2D · Resistencia de Materiales: tracción, compresión, flexión, torsión y dureza Rockwell
 * (valores de material típicos, de referencia didáctica)
 */
(function (global) {
    'use strict';
    var G = global.GeoSim2D, H = G.H, C = G.C;
    var clamp = H.clamp, lerp = H.lerp, fmt = H.fmt;
    function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
    var SVG = function (inner) { return '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>'; };

    function frame(ctx, accent, tick, x, y, w, h, label) {
        H.steel(ctx, x, y, w, h, 6, true);
        if (label) H.label(ctx, label, x + w / 2, y + h / 2, { align: 'center', size: 9.5, color: '#cbd5e1', weight: '800' });
    }
    function lcd(ctx, x, y, w, txt) {
        H.rrect(ctx, x, y, w, 28, 5); ctx.fillStyle = '#0a1a10'; ctx.fill();
        ctx.fillStyle = '#86efac'; ctx.font = '800 17px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x + w - 8, y + 15);
    }

    /* =====================================================================
       1 · TRACCIÓN  (ASTM E8 · máquina universal)
    ===================================================================== */
    var TA = '#F87171';
    var TMAT = {
        a36: { n: 'Acero estructural A36', E: 200000, sy: 250, su: 400, eh: 0.02, eu: 0.20, ef: 0.27, sf: 300, plateau: true },
        alum: { n: 'Aluminio 6061-T6', E: 69000, sy: 275, su: 310, eh: 0.004, eu: 0.10, ef: 0.14, sf: 250, plateau: false },
        alta: { n: 'Acero de alta resistencia', E: 200000, sy: 690, su: 860, eh: 0.0035, eu: 0.09, ef: 0.13, sf: 700, plateau: false },
        fund: { n: 'Hierro fundido gris (frágil)', E: 100000, sy: 0, su: 200, ef: 0.004, brittle: true }
    };
    function sigT(m, e) {
        if (m.brittle) { var x = clamp(e / m.ef, 0, 1); return m.su * (2 * x - x * x); }
        var ey = m.sy / m.E;
        if (e <= ey) return m.E * e;
        if (e <= m.eh) return m.plateau ? m.sy * (1 + 0.012 * Math.sin((e - ey) * 900)) : m.sy + (m.su - m.sy) * 0.15 * (e - ey) / (m.eh - ey);
        if (e <= m.eu) { var q = (m.eu - e) / (m.eu - m.eh); return lerp(m.su, m.plateau ? m.sy : m.sy + (m.su - m.sy) * 0.15, q * q); }
        var r = (e - m.eu) / (m.ef - m.eu); return m.su - (m.su - m.sf) * r * r;
    }
    G.register('traccion', {
        key: 'traccion', num: '01', title: 'Ensayo de Tracción', accent: TA, rgb: '248,113,113',
        norma: 'ASTM E8 / E8M', duration: 13, machine: 'Máquina universal de ensayos (UTM)',
        glyph: SVG('<path d="M10 8h44M10 56h44"/><path d="M32 8v8M32 48v8"/><path d="M26 16h12l-3 8v16l3 8H26l3-8V24z"/>'),
        desc: 'Máquina universal: estira una probeta hasta romperla; curva σ–ε, módulo E, fluencia, resistencia última y estricción.',
        chips: ['E', 'σy', 'σu', 'Estricción'],
        fields: [
            { id: 'mat', type: 'select', label: 'Material', value: 'a36', options: Object.keys(TMAT).map(function (k) { return [k, TMAT[k].n]; }) },
            { id: 'd', label: 'Diámetro de la probeta d₀', unit: 'mm', min: 6, max: 20, step: 0.5, value: 12.5, dec: 1 },
            { id: 'L0', label: 'Longitud calibrada L₀', unit: 'mm', min: 30, max: 100, step: 1, value: 50, dec: 0 }
        ],
        readouts: [
            { k: 'eps', label: 'ε', unit: '%', dec: 2 },
            { k: 'sig', label: 'σ', unit: 'MPa', dec: 1 },
            { k: 'Pk', label: 'Carga P', unit: 'kN', dec: 2 },
            { k: 'dL', label: 'ΔL', unit: 'mm', dec: 2 },
            { k: 'fase', label: 'Fase', unit: '', dec: 0, f: function (S) { return S.fase; } }
        ],
        fromData: null,
        model: function (P) {
            var m = TMAT[P.mat], pts = [], i, A0 = Math.PI * P.d * P.d / 4, efin = m.ef;
            for (i = 0; i <= 200; i++) { var e = efin * i / 200; pts.push({ x: e * 100, y: sigT(m, e) }); }
            var ey02 = m.brittle ? null : (function () { for (var k = 0; k <= 400; k++) { var e2 = efin * k / 400; if (m.E * (e2 - 0.002) <= sigT(m, e2) && k > 2 && e2 > m.sy / m.E) return e2; } return m.sy / m.E; })();
            return { m: m, pts: pts, A0: A0, ef: efin, Pmax: m.su * A0 / 1000, ey: m.brittle ? m.su / m.E : m.sy / m.E };
        },
        at: function (P, M, p) {
            var m = M.m, q = clamp(p / 0.96, 0, 1), e = q * M.ef, sig = sigT(m, e), broke = p >= 0.96;
            var fase = m.brittle ? (broke ? 'Rotura frágil' : 'Elástica') : (e <= m.sy / m.E ? 'Elástica' : (e <= m.eh && m.plateau ? 'Fluencia' : (e <= m.eu ? 'Endurecimiento' : (broke ? 'Fractura' : 'Estricción'))));
            if (m.brittle && broke) fase = 'Rotura frágil';
            return { e: e, eps: e * 100, sig: broke ? 0 : sig, sigRaw: sig, Pk: (broke ? 0 : sig) * M.A0 / 1000, dL: e * P.L0, fase: fase, broke: broke, gap: broke ? ease((p - 0.96) / 0.04) : 0 };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Probeta fracturada', cls: 'is-done' };
            return S.fase === 'Estricción' ? { txt: 'Estricción del cuello', cls: 'is-fail' } : { txt: S.fase, cls: 'is-run' };
        },
        summary: function (P, M) {
            var m = M.m;
            return [
                { label: 'Módulo E', value: fmt(m.E / 1000, 0), unit: 'GPa', hi: true },
                { label: m.brittle ? 'σ rotura' : 'σ fluencia', value: fmt(m.brittle ? m.su : m.sy, 0), unit: 'MPa', hi: true },
                { label: 'σ última', value: fmt(m.su, 0), unit: 'MPa' },
                { label: 'Alargamiento a rotura', value: fmt(m.ef * 100, 1), unit: '%' },
                { label: 'Carga máx.', value: fmt(M.Pmax, 1), unit: 'kN' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, TA, tick * 0.15);
            var cx = W / 2, m = M.m;
            H.steel(ctx, cx - 210, 410, 420, 34, 8, true); H.steel(ctx, cx - 190, 38, 14, 372, 3, true); H.steel(ctx, cx + 176, 38, 14, 372, 3, true);
            var up = Math.min(S.dL * 4.2, 120);
            H.steel(ctx, cx - 200, 28, 400, 22, 5);                                  /* travesaño fijo + celda */
            H.steel(ctx, cx - 26, 50, 52, 30, 8);
            H.label(ctx, 'CELDA', cx, 66, { align: 'center', size: 8.5, color: '#1e293b', weight: '800' });
            var gy1 = 108 - up * 0.0, gy2 = 346;                                    /* mordaza superior fija, inferior móvil */
            var topG = 82, botG = 352 - up;                                          /* el travesaño inferior sube...: la probeta se estira hacia abajo */
            botG = 352 + Math.min(S.dL * 3.6, 46);
            H.steel(ctx, cx - 38, topG, 76, 30, 4); H.steel(ctx, cx - 38, botG, 76, 30, 4, false);
            /* travesaño móvil y husillo */
            H.steel(ctx, cx - 200, botG + 28, 400, 18, 5);
            ctx.fillStyle = '#7b8ca6'; ctx.fillRect(cx - 5, botG + 46, 10, 410 - botG - 46);
            /* probeta "hueso de perro" */
            var yT = topG + 30, yB = botG, len = yB - yT, shoulder = 44, w0 = P.d * 1.5, wsh = w0 * 1.85;
            var neck = 0, mid = (yT + yB) / 2;
            if (!m.brittle && S.e > m.eu) neck = clamp((S.e - m.eu) / (m.ef - m.eu), 0, 1);
            function body(top, bot, fracture, side) {
                ctx.beginPath();
                var pts = [];
                for (var i = 0; i <= 24; i++) {
                    var t = i / 24, y = lerp(top, bot, t), w;
                    var d = Math.abs(y - (yT + yB) / 2) / ((yB - yT) / 2);
                    w = d > 0.72 ? lerp(wsh, w0, clamp((0.92 - d) / 0.2, 0, 1)) : w0;
                    var nk = 1 - 0.62 * Math.pow(neck, 1.2) * Math.exp(-Math.pow((y - mid) / 20, 2));
                    pts.push([y, w * nk / 2]);
                }
                ctx.moveTo(cx - pts[0][1], pts[0][0]);
                pts.forEach(function (q) { ctx.lineTo(cx - q[1], q[0]); });
                for (var k = pts.length - 1; k >= 0; k--) ctx.lineTo(cx + pts[k][1], pts[k][0]);
                ctx.closePath();
            }
            var col = m.brittle ? ['#9aa3ad', '#6b747e'] : ['#d3dbe5', '#7f8b9a'];
            function paintBody() { var g = ctx.createLinearGradient(cx - wsh / 2, 0, cx + wsh / 2, 0); g.addColorStop(0, col[1]); g.addColorStop(0.45, col[0]); g.addColorStop(1, col[1]); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke(); }
            if (!S.broke) { body(yT, yB, false); paintBody(); }
            else {
                var gap = S.gap * 34;
                ctx.save(); ctx.beginPath(); ctx.rect(0, 0, W, mid - 1 - gap / 2); ctx.clip(); ctx.translate(0, -gap * 0.2); body(yT, yB, true); paintBody(); ctx.restore();
                ctx.save(); ctx.beginPath(); ctx.rect(0, mid + 1 + gap / 2, W, 400); ctx.clip(); ctx.translate(0, gap * 0.6); body(yT, yB, true); paintBody(); ctx.restore();
            }
            /* marcas calibradas + extensómetro */
            ctx.strokeStyle = 'rgba(244,63,94,.8)'; ctx.lineWidth = 1.5;
            [mid - 40, mid + 40].forEach(function (yy) { ctx.beginPath(); ctx.moveTo(cx - 44, yy); ctx.lineTo(cx + 44, yy); ctx.stroke(); });
            H.label(ctx, 'L₀ = ' + P.L0 + ' mm', cx + 66, mid, { size: 11, color: C.soft, weight: '700' });
            if (S.fase === 'Fluencia') H.label(ctx, 'Fluencia', cx - 66, mid - 40, { align: 'right', size: 12, color: '#fbbf24', weight: '800' });
            if (neck > 0.05) H.label(ctx, 'Estricción', cx - 66, mid, { align: 'right', size: 12, color: '#fda4af', weight: '800' });
            H.arrow(ctx, cx, topG - 6, cx, topG - 34, TA, 4, 11);
            H.arrow(ctx, cx, botG + 80, cx, botG + 108, TA, 4, 11);
            /* relojes */
            H.dial(ctx, 98, 150, 52, S.Pk, Math.max(M.Pmax * 1.1, 1), TA, 'CARGA', fmt(S.Pk, 1) + ' kN');
            H.label(ctx, 'Celda de carga', 98, 220, { align: 'center', size: 10.5, color: C.mute });
            H.dial(ctx, W - 98, 150, 52, S.dL, Math.max(M.ef * P.L0, 1), '#FBBF24', 'ΔL', fmt(S.dL, 2) + ' mm');
            H.label(ctx, 'Extensómetro', W - 98, 220, { align: 'center', size: 10.5, color: C.mute });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var m = M.m;
                    H.plot(ctx, W, Ht, {
                        title: 'Curva esfuerzo – deformación (ingeniería)', xlabel: 'Deformación ε (%)', ylabel: 'σ (MPa)',
                        xmin: 0, xmax: M.ef * 100, ymin: 0, ymax: Math.ceil(m.su * 1.15 / 50) * 50, pts: M.pts, progress: Math.max(0.001, Math.min(1, p / 0.96)), color: TA,
                        under: function (c, X, Y) {
                            c.save(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(248,113,113,.5)';
                            c.beginPath(); c.moveTo(X(0), Y(m.su)); c.lineTo(X(m.brittle ? m.ef * 100 : m.eu * 100), Y(m.su)); c.lineTo(X(m.brittle ? m.ef * 100 : m.eu * 100), Y(0)); c.stroke();
                            if (!m.brittle) { c.strokeStyle = 'rgba(251,191,36,.6)'; c.beginPath(); c.moveTo(X(0), Y(m.sy)); c.lineTo(X(m.ey * 100 * 1.0 + 0.2), Y(m.sy)); c.stroke(); }
                            c.restore();
                            H.label(c, 'σu = ' + fmt(m.su, 0), X(0) + 8, Y(m.su) - 10, { size: 10.5, color: TA, weight: '800' });
                            if (!m.brittle) H.label(c, 'σy = ' + fmt(m.sy, 0), X(0) + 8, Y(m.sy) + 14, { size: 10.5, color: '#FBBF24', weight: '800' });
                            c.save(); c.setLineDash([5, 4]); c.strokeStyle = 'rgba(167,180,200,.55)'; c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(Math.min(M.ef * 100, (m.su * 0.55) / m.E * 100 * (m.brittle ? 1 : 1))), Y(m.su * 0.55)); c.stroke(); c.restore();
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var pts = M.pts.map(function (q) { return { x: q.x / 100 * P.L0, y: q.y * M.A0 / 1000 }; });
                    H.plot(ctx, W, Ht, {
                        title: 'Registro de la máquina: carga – alargamiento', xlabel: 'Alargamiento ΔL (mm)', ylabel: 'Carga P (kN)',
                        xmin: 0, xmax: M.ef * P.L0, ymin: 0, ymax: Math.ceil(M.Pmax * 1.15), pts: pts, progress: Math.max(0.001, Math.min(1, p / 0.96)), color: '#FBBF24',
                        over: function (c, X, Y) { H.label(c, 'Pmáx = ' + fmt(M.Pmax, 1) + ' kN', X(0) + 8, Y(M.Pmax) - 10, { size: 10.5, color: '#FBBF24', weight: '800' }); }
                    });
                }
            }
        ]
    });

    /* =====================================================================
       2 · COMPRESIÓN  (ASTM C39 / E9)
    ===================================================================== */
    var CA = '#60A5FA';
    var CMAT = {
        conc: { n: 'Concreto (cilindro)', E: 24900, fc: 28, e0: 0.002, ratio: 2, tone: 'gray', fail: 'cone', end: 0.0036 },
        acero: { n: 'Acero dulce (dúctil)', E: 200000, fc: 250, e0: 0.02, ratio: 1.5, tone: 'steel', fail: 'barrel', end: 0.2 },
        madera: { n: 'Madera (paralela a la fibra)', E: 11000, fc: 40, e0: 0.0036, ratio: 2, tone: 'wood', fail: 'crush', end: 0.012 },
        fund: { n: 'Hierro fundido gris', E: 100000, fc: 600, e0: 0.008, ratio: 1.5, tone: 'steel', fail: 'shear', end: 0.011 }
    };
    function sigC(m, f, e) {
        var fc = m.fc * f;
        if (m.fail === 'barrel') { var ey = fc / m.E; return e <= ey ? m.E * e : fc * (1 + 0.55 * (1 - Math.exp(-(e - ey) / 0.07))); }
        var x = e / m.e0;
        if (x <= 1) return fc * (2 * x - x * x);
        return fc * Math.max(0.25, 1 - 0.65 * (x - 1) / 0.8);
    }
    G.register('compresion', {
        key: 'compresion', num: '02', title: 'Ensayo de Compresión', accent: CA, rgb: '96,165,250',
        norma: 'ASTM C39 · ASTM E9', duration: 12, machine: 'Prensa hidráulica de compresión',
        glyph: SVG('<path d="M10 8h44M10 56h44"/><path d="M32 8v8M28 12l4 4 4-4"/><rect x="22" y="20" width="20" height="26" rx="2"/><path d="M32 56v-6M28 52l4-4 4 4"/>'),
        desc: 'Prensa hidráulica: comprime un cilindro hasta la falla (cono, barril, aplastamiento o corte); curva σ–ε y módulo E.',
        chips: ['f′c', 'E', 'Falla', 'σ – ε'],
        fields: [
            { id: 'mat', type: 'select', label: 'Material', value: 'conc', options: Object.keys(CMAT).map(function (k) { return [k, CMAT[k].n]; }) },
            { id: 'f', label: 'Resistencia relativa', unit: '%', min: 70, max: 130, step: 1, value: 100, dec: 0 },
            { id: 'd', label: 'Diámetro del cilindro', unit: 'mm', min: 50, max: 160, step: 1, value: 100, dec: 0 }
        ],
        readouts: [
            { k: 'eps', label: 'ε', unit: '%', dec: 3 },
            { k: 'sig', label: 'σ', unit: 'MPa', dec: 1 },
            { k: 'Pk', label: 'Carga P', unit: 'kN', dec: 1 },
            { k: 'dL', label: 'ΔL', unit: 'mm', dec: 2 },
            { k: 'fase', label: 'Fase', unit: '', dec: 0, f: function (S) { return S.fase; } }
        ],
        fromData: null,
        model: function (P) {
            var m = CMAT[P.mat], f = P.f / 100, pts = [], i, A0 = Math.PI * P.d * P.d / 4, Hh = m.ratio * P.d;
            for (i = 0; i <= 200; i++) { var e = m.end * i / 200; pts.push({ x: e * 100, y: sigC(m, f, e) }); }
            var fcm = m.fc * f, E = m.fail === 'barrel' ? m.E : (m.fail === 'cone' ? 4700 * Math.sqrt(fcm) : m.E * (0.8 + 0.2 * f));
            return { m: m, f: f, pts: pts, A0: A0, H: Hh, fc: fcm, Pmax: fcm * A0 / 1000, E: E, epeak: m.fail === 'barrel' ? 0 : m.e0 };
        },
        at: function (P, M, p) {
            var m = M.m, e = p * m.end, sig = sigC(m, M.f, e), fail = m.fail === 'barrel' ? clamp((e - 0.04) / 0.1, 0, 1) : clamp((e - m.e0) / (m.e0 * 0.35), 0, 1);
            var fase = m.fail === 'barrel' ? (e < M.fc / m.E ? 'Elástica' : 'Fluencia / abarrilamiento') : (e < m.e0 ? 'Carga' : (fail < 1 ? 'Falla' : 'Post-pico'));
            return { e: e, eps: e * 100, sig: sig, Pk: sig * M.A0 / 1000, dL: e * M.H, fail: fail, fase: fase };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ensayo finalizado', cls: 'is-done' };
            return S.fail > 0.02 ? { txt: S.fase, cls: 'is-fail' } : { txt: S.fase, cls: 'is-run' };
        },
        summary: function (P, M) {
            var m = M.m, lbl = m.fail === 'barrel' ? 'σ fluencia' : 'σ máx (f′c)';
            return [
                { label: lbl, value: fmt(M.fc, 1), unit: 'MPa', hi: true },
                { label: 'Módulo E', value: fmt(M.E / 1000, 1), unit: 'GPa', hi: true },
                { label: 'Carga máxima', value: fmt(M.Pmax, 0), unit: 'kN' },
                { label: 'Área', value: fmt(M.A0 / 100, 1), unit: 'cm²' },
                { label: 'Tipo de falla', value: { cone: 'Cono y corte', barrel: 'Abarrilamiento', crush: 'Aplastamiento', shear: 'Corte a 45°' }[m.fail], unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, CA, tick * 0.15);
            var cx = W / 2, m = M.m, sc = Math.min(1.5, 190 / M.H * 1.1), h0 = M.H * sc * 0.55 + 70, w0 = P.d * sc * 0.55 + 10;
            h0 = clamp(h0, 130, 210); w0 = clamp(w0, 56, 130);
            H.steel(ctx, cx - 190, 408, 380, 36, 8, true);
            H.steel(ctx, cx - 170, 40, 16, 368, 3, true); H.steel(ctx, cx + 154, 40, 16, 368, 3, true);
            H.steel(ctx, cx - 190, 28, 380, 26, 6);
            H.label(ctx, 'PRENSA HIDRÁULICA · 1000 kN', cx, 427, { align: 'center', size: 9.5, color: '#cbd5e1', weight: '800' });
            var shortening = clamp(S.e * M.H / M.H, 0, 0.28) * h0 * 2.2, top = 120, h = h0 - Math.min(shortening, h0 * 0.35);
            var bot = top + h;
            H.steel(ctx, cx - 70, top - 16, 140, 16, 3); ctx.fillStyle = '#9fb0c8'; ctx.fillRect(cx - 6, 54, 12, top - 16 - 54);
            H.steel(ctx, cx - 70, bot, 140, 16, 3);
            var piston = ctx.createLinearGradient(cx - 22, 0, cx + 22, 0); piston.addColorStop(0, '#3a4659'); piston.addColorStop(0.5, '#9fb0c8'); piston.addColorStop(1, '#3a4659');
            ctx.fillStyle = piston; ctx.fillRect(cx - 22, bot + 16, 44, 408 - bot - 16);
            var mode = m.fail === 'barrel' ? 'barrel' : (m.fail === 'shear' || m.fail === 'cone' ? 'shear' : 'barrel');
            var sp = H.specimen(ctx, { cx: cx, top: top, w: w0, h: h, eps: clamp(S.e * (m.fail === 'barrel' ? 1 : 12) * 0.5, 0, 0.4), mode: mode, failed: m.fail === 'crush' ? S.fail * 0.8 : S.fail, theta: m.fail === 'cone' ? 1.15 : 0.95, seed: 31, tone: m.tone });
            if (m.fail === 'crush' && S.fail > 0.1) { ctx.strokeStyle = 'rgba(60,30,10,.7)'; ctx.lineWidth = 1.4; for (var k = 0; k < 7; k++) { var xx = cx - sp.wMean / 2 + (k + 0.5) * sp.wMean / 7; ctx.beginPath(); ctx.moveTo(xx, top + h * 0.4); ctx.lineTo(xx + (k % 2 ? 7 : -7) * S.fail, top + h * 0.6); ctx.stroke(); } }
            if (m.fail === 'cone' && S.fail > 0.05) { ctx.strokeStyle = 'rgba(30,30,30,.7)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(cx - sp.wMean / 2, top + 4); ctx.lineTo(cx - sp.wMean / 2 + 12, top + h * 0.38); ctx.moveTo(cx + sp.wMean / 2, bot - 4); ctx.lineTo(cx + sp.wMean / 2 - 12, bot - h * 0.38); ctx.stroke();
                if (S.fail > 0.4) for (var q = 0; q < 8; q++) { var fx = cx + (q % 2 ? 1 : -1) * (sp.wMean / 2 + 8 + ((tick * 0.7 + q * 9) % 26)), fy = top + h * 0.5 + ((tick * 1.1 + q * 17) % 60); ctx.fillStyle = 'rgba(150,155,160,.8)'; ctx.fillRect(fx, fy, 3, 3); } }
            H.arrow(ctx, cx + w0 / 2 + 40, top - 40, cx + w0 / 2 + 40, top - 4, CA, 4, 11);
            H.label(ctx, 'Ø ' + P.d + ' mm · H = ' + fmt(M.H, 0) + ' mm', cx, bot + 40, { align: 'center', size: 11, color: C.soft });
            H.dial(ctx, 98, 150, 52, S.Pk, Math.max(M.Pmax * 1.1, 1), CA, 'CARGA', fmt(S.Pk, 0) + ' kN');
            H.label(ctx, 'Manómetro / celda', 98, 220, { align: 'center', size: 10.5, color: C.mute });
            H.dial(ctx, W - 98, 150, 52, S.dL, Math.max(m.end * M.H, 0.1), '#FBBF24', 'ΔL', fmt(S.dL, 2) + ' mm');
            H.label(ctx, 'Compresómetro', W - 98, 220, { align: 'center', size: 10.5, color: C.mute });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Curva esfuerzo – deformación', xlabel: 'Deformación ε (%)', ylabel: 'σ (MPa)',
                        xmin: 0, xmax: M.m.end * 100, ymin: 0, ymax: Math.ceil(M.fc * 1.4 / 10) * 10, pts: M.pts, progress: Math.max(0.001, p), color: CA,
                        under: function (c, X, Y) {
                            c.save(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(96,165,250,.55)'; c.beginPath(); c.moveTo(X(0), Y(M.fc)); c.lineTo(X(M.epeak * 100 || M.fc / M.m.E * 100), Y(M.fc)); c.stroke(); c.restore();
                            H.label(c, (M.m.fail === 'barrel' ? 'σy = ' : 'f′c = ') + fmt(M.fc, 1) + ' MPa', X(0) + 8, Y(M.fc) - 10, { size: 10.5, color: CA, weight: '800' });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var lim = 0.4 * M.fc, xe = lim / M.E * 100 * 1.25, zp = [], i;
                    for (i = 0; i <= 60; i++) { var e = xe / 100 * i / 60; zp.push({ x: e * 100, y: Math.min(sigC(M.m, M.f, e), lim * 1.4) }); }
                    H.plot(ctx, W, Ht, {
                        title: 'Zona elástica y módulo E', xlabel: 'Deformación ε (%)', ylabel: 'σ (MPa)', xmin: 0, xmax: xe, ymin: 0, ymax: lim * 1.35,
                        pts: zp, progress: 1, color: CA, nolive: true,
                        over: function (c, X, Y) {
                            c.save(); c.strokeStyle = CA; c.lineWidth = 2.8; c.shadowColor = CA; c.shadowBlur = 8; c.beginPath(); zp.forEach(function (q, k) { if (k) c.lineTo(X(q.x), Y(q.y)); else c.moveTo(X(q.x), Y(q.y)); }); c.stroke(); c.restore();
                            c.save(); c.setLineDash([6, 4]); c.strokeStyle = '#FBBF24'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(lim / M.E * 100), Y(lim)); c.stroke(); c.restore();
                            c.beginPath(); c.arc(X(lim / M.E * 100), Y(lim), 5, 0, H.TAU); c.fillStyle = '#FBBF24'; c.fill();
                            H.label(c, 'E = ' + fmt(M.E / 1000, 1) + ' GPa', X(xe * 0.4), Y(lim * 0.2), { size: 12, color: '#FBBF24', weight: '800' });
                            H.label(c, '0,4·σmáx = ' + fmt(lim, 1) + ' MPa', X(0) + 8, Y(lim) - 10, { size: 10.5, color: C.soft, weight: '700' });
                        }
                    });
                }
            }
        ]
    });

    /* =====================================================================
       3 · FLEXIÓN (3 PUNTOS)  (ASTM C78 / D790 / E855)
    ===================================================================== */
    var FA = '#FBBF24';
    var FMAT = {
        acero: { n: 'Viga de acero A36', E: 200000, sr: 250, brittle: false },
        madera: { n: 'Madera estructural', E: 11000, sr: 60, brittle: true },
        conc: { n: 'Concreto simple', E: 25000, sr: 4, brittle: true }
    };
    G.register('flexion', {
        key: 'flexion', num: '03', title: 'Ensayo de Flexión', accent: FA, rgb: '251,191,36',
        norma: 'ASTM C78 · ASTM D790', duration: 12, machine: 'Banco de flexión en 3 puntos',
        glyph: SVG('<path d="M8 36h48"/><path d="M14 36l-4 12h8zM50 36l-4 12h8z"/><path d="M32 12v18M28 26l4 4 4-4"/>'),
        desc: 'Viga simplemente apoyada con carga central: deflexión, diagramas de cortante y momento y módulo de ruptura.',
        chips: ['σ = 3PL/2bh²', 'δ', 'V · M', 'MOR'],
        fields: [
            { id: 'mat', type: 'select', label: 'Material', value: 'madera', options: Object.keys(FMAT).map(function (k) { return [k, FMAT[k].n]; }) },
            { id: 'L', label: 'Luz entre apoyos L', unit: 'mm', min: 200, max: 1500, step: 10, value: 600, dec: 0 },
            { id: 'b', label: 'Ancho b', unit: 'mm', min: 20, max: 200, step: 5, value: 100, dec: 0 },
            { id: 'h', label: 'Altura h', unit: 'mm', min: 20, max: 300, step: 5, value: 100, dec: 0 }
        ],
        readouts: [
            { k: 'Pk', label: 'Carga P', unit: 'kN', dec: 2 },
            { k: 'dl', label: 'Deflexión δ', unit: 'mm', dec: 2 },
            { k: 'sg', label: 'σ máx', unit: 'MPa', dec: 1 },
            { k: 'Mk', label: 'M máx', unit: 'kN·m', dec: 3 },
            { k: 'fase', label: 'Fase', unit: '', dec: 0, f: function (S) { return S.fase; } }
        ],
        fromData: null,
        model: function (P) {
            var m = FMAT[P.mat], I = P.b * Math.pow(P.h, 3) / 12, Pmax = 2 * m.sr * P.b * P.h * P.h / (3 * P.L), dmax = Pmax * Math.pow(P.L, 3) / (48 * m.E * I), pts = [], i;
            for (i = 0; i <= 100; i++) {
                var q = i / 100, Pq = Pmax * Math.min(q / 0.9, 1), dq = Pq * Math.pow(P.L, 3) / (48 * m.E * I);
                if (q > 0.9) { if (m.brittle) { Pq = Pmax * Math.max(0, 1 - (q - 0.9) / 0.03); dq = dmax * 1.0; } else { dq = dmax * (1 + (q - 0.9) * 10); } }
                pts.push({ x: dq, y: Pq / 1000 });
            }
            return { m: m, I: I, Pmax: Pmax, dmax: dmax, pts: pts };
        },
        at: function (P, M, p) {
            var m = M.m, q = p, Pn = M.Pmax * Math.min(q / 0.9, 1), d = Pn * Math.pow(P.L, 3) / (48 * m.E * M.I), broken = q > 0.9 && m.brittle;
            if (q > 0.9) { if (m.brittle) { Pn = M.Pmax * Math.max(0, 1 - (q - 0.9) / 0.03); d = M.dmax; } else d = M.dmax * (1 + (q - 0.9) * 10); }
            var sg = 3 * Pn * P.L / (2 * P.b * P.h * P.h);
            return { P: Pn, Pk: Pn / 1000, dl: d, sg: sg, Mk: Pn * P.L / 4 / 1e6, broken: broken, plastic: q > 0.9 && !m.brittle, fase: q < 0.9 ? 'Elástica' : (m.brittle ? 'Rotura' : 'Fluencia (rótula)') };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: S.broken ? 'Viga fracturada' : 'Ensayo finalizado', cls: 'is-done' };
            return S.broken || S.plastic ? { txt: S.fase, cls: 'is-fail' } : { txt: 'Aplicando carga', cls: 'is-run' };
        },
        summary: function (P, M) {
            return [
                { label: M.m.brittle ? 'MOR (módulo de ruptura)' : 'σ de fluencia', value: fmt(M.m.sr, 1), unit: 'MPa', hi: true },
                { label: 'P máx', value: fmt(M.Pmax / 1000, 2), unit: 'kN', hi: true },
                { label: 'M máx = PL/4', value: fmt(M.Pmax * P.L / 4 / 1e6, 3), unit: 'kN·m' },
                { label: 'δ en P máx', value: fmt(M.dmax, 2), unit: 'mm' },
                { label: 'I = bh³/12', value: fmt(M.I / 1e6, 2), unit: '×10⁶ mm⁴' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, FA, tick * 0.15);
            var x0 = 130, x1 = 670, ybase = 300, k = 38 / Math.max(M.dmax, 1e-6), dvis = Math.min(S.dl * k, 70);
            var hpx = clamp(P.h / P.L * 540, 22, 90);
            H.steel(ctx, 80, 396, 640, 30, 8, true);
            [x0, x1].forEach(function (xs, i) {      /* apoyos */
                ctx.beginPath(); ctx.moveTo(xs, ybase + hpx + 4); ctx.lineTo(xs - 24, 392); ctx.lineTo(xs + 24, 392); ctx.closePath(); ctx.fillStyle = '#5a6a82'; ctx.fill();
                ctx.beginPath(); ctx.arc(xs, ybase + hpx + 12, 9, 0, H.TAU); ctx.fillStyle = '#c4d1e4'; ctx.fill(); ctx.strokeStyle = '#334155'; ctx.stroke();
            });
            var cols = { acero: ['#c3ccd7', '#7d8998'], madera: ['#d2a468', '#8c6130'], conc: ['#a4a9ad', '#6a7076'] }[P.mat];
            function yc(x) { var t = (x - x0) / (x1 - x0); return 4 * dvis * t * (1 - t) ; }
            var N = 40, top = [], bot = [];
            for (var i = 0; i <= N; i++) { var x = lerp(x0 - 18, x1 + 18, i / N), xx = clamp(x, x0, x1), d = yc(xx); top.push([x, ybase + d]); bot.push([x, ybase + hpx + d]); }
            function beamPath() { ctx.beginPath(); top.forEach(function (q, i) { if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); }); for (var j = bot.length - 1; j >= 0; j--) ctx.lineTo(bot[j][0], bot[j][1]); ctx.closePath(); }
            var g = ctx.createLinearGradient(0, ybase, 0, ybase + hpx + dvis); g.addColorStop(0, cols[0]); g.addColorStop(1, cols[1]);
            if (S.broken) {
                var op = clamp((S.P > 0 ? 1 : 1), 0, 1), spread = 10;
                ctx.save(); ctx.beginPath(); ctx.rect(0, 0, (x0 + x1) / 2 - 1, 500); ctx.clip(); ctx.translate(0, 0); ctx.rotate(0.012); beamPath(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke(); ctx.restore();
                ctx.save(); ctx.beginPath(); ctx.rect((x0 + x1) / 2 + 1, 0, 500, 500); ctx.clip(); ctx.rotate(-0.012); beamPath(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke(); ctx.restore();
                ctx.save(); ctx.strokeStyle = '#7f1d1d'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo((x0 + x1) / 2, ybase + dvis + hpx); ctx.lineTo((x0 + x1) / 2 - 4, ybase + dvis + hpx * 0.25); ctx.lineTo((x0 + x1) / 2 + 3, ybase + dvis); ctx.stroke(); ctx.restore();
            } else { beamPath(); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.lineWidth = 1.5; ctx.stroke(); }
            /* indentador (carga) */
            var ny = ybase + dvis - 40;
            ctx.beginPath(); ctx.moveTo((x0 + x1) / 2 - 9, ybase + dvis); ctx.lineTo((x0 + x1) / 2 + 9, ybase + dvis); ctx.lineTo((x0 + x1) / 2 + 24, ny); ctx.lineTo((x0 + x1) / 2 - 24, ny); ctx.closePath(); ctx.fillStyle = '#9fb0c8'; ctx.fill();
            ctx.fillStyle = '#7b8ca6'; ctx.fillRect((x0 + x1) / 2 - 6, 80, 12, ny - 80);
            H.steel(ctx, (x0 + x1) / 2 - 90, 62, 180, 20, 5);
            H.arrow(ctx, (x0 + x1) / 2 + 60, ny - 56, (x0 + x1) / 2 + 60, ny - 6, FA, 4, 11);
            H.label(ctx, 'P = ' + fmt(S.Pk, 2) + ' kN', (x0 + x1) / 2 + 72, ny - 34, { size: 12.5, color: FA, weight: '800' });
            /* cotas */
            ctx.strokeStyle = 'rgba(167,180,200,.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x0, 372); ctx.lineTo(x1, 372); ctx.moveTo(x0, 366); ctx.lineTo(x0, 378); ctx.moveTo(x1, 366); ctx.lineTo(x1, 378); ctx.stroke();
            H.label(ctx, 'L = ' + P.L + ' mm', (x0 + x1) / 2, 360, { align: 'center', size: 11.5, color: C.soft, weight: '700' });
            /* reloj bajo la viga */
            H.dial(ctx, 150, 140, 46, S.dl, Math.max(M.dmax * 1.6, 0.1), FA, 'δ', fmt(S.dl, 2) + ' mm');
            H.label(ctx, 'Deflectómetro', 150, 204, { align: 'center', size: 10.5, color: C.mute });
            H.dial(ctx, 650, 140, 46, S.Pk, Math.max(M.Pmax / 1000 * 1.15, 0.1), '#F87171', 'P', fmt(S.Pk, 2) + ' kN');
            H.label(ctx, 'Celda de carga', 650, 204, { align: 'center', size: 10.5, color: C.mute });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Carga – deflexión', xlabel: 'Deflexión central δ (mm)', ylabel: 'P (kN)',
                        xmin: 0, xmax: Math.max.apply(null, M.pts.map(function (q) { return q.x; })) * 1.05, ymin: 0, ymax: M.Pmax / 1000 * 1.2, pts: M.pts, progress: Math.max(0.001, p), color: FA,
                        over: function (c, X, Y) { H.label(c, 'Pmáx = ' + fmt(M.Pmax / 1000, 2) + ' kN', X(0) + 8, Y(M.Pmax / 1000) - 10, { size: 10.5, color: FA, weight: '800' }); }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.panelBg(ctx, W, Ht, 'Diagramas de cortante V y de momento M');
                    var x0 = 50, x1 = W - 30, Pn = S.P, Vm = Pn / 2 / 1000, Mm = Pn * P.L / 4 / 1e6;
                    function X(t) { return x0 + t * (x1 - x0); }
                    [[110, 'V (kN)', Vm, 'v'], [262, 'M (kN·m)', Mm, 'm']].forEach(function (d) {
                        var y = d[0], amp = 46, mx = d[3] === 'v' ? Math.max(M.Pmax / 2000, 1e-6) : Math.max(M.Pmax * P.L / 4e6, 1e-6), a = amp * (d[2] / mx);
                        ctx.strokeStyle = '#3b4a63'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(x1, y); ctx.stroke();
                        H.label(ctx, d[1], 14, y - 52, { size: 11, color: C.soft, weight: '800' });
                        ctx.beginPath();
                        if (d[3] === 'v') { ctx.moveTo(X(0), y); ctx.lineTo(X(0), y - a); ctx.lineTo(X(0.5), y - a); ctx.lineTo(X(0.5), y + a); ctx.lineTo(X(1), y + a); ctx.lineTo(X(1), y); }
                        else { ctx.moveTo(X(0), y); ctx.lineTo(X(0.5), y - a); ctx.lineTo(X(1), y); }
                        ctx.closePath(); ctx.fillStyle = H.rgba(FA, 0.22); ctx.fill(); ctx.strokeStyle = FA; ctx.lineWidth = 2.6; ctx.shadowColor = FA; ctx.shadowBlur = 8; ctx.stroke(); ctx.shadowBlur = 0;
                        if (d[3] === 'v') { H.label(ctx, '+P/2 = ' + fmt(d[2], 2), X(0.25), y - a - 12, { align: 'center', size: 10.5, color: '#fff', weight: '800' }); H.label(ctx, '−P/2', X(0.75), y + a + 14, { align: 'center', size: 10.5, color: '#fff', weight: '800' }); }
                        else H.label(ctx, 'Mmáx = PL/4 = ' + fmt(d[2], 3), X(0.5), y - a - 12, { align: 'center', size: 10.5, color: '#fff', weight: '800' });
                    });
                }
            }
        ]
    });

    /* =====================================================================
       4 · TORSIÓN  (ASTM E143 · barra circular)
    ===================================================================== */
    var OA = '#C084FC';
    var OMAT = {
        acero: { n: 'Acero dulce', G: 80000, ty: 145, tu: 260, gy: null, gf: 0.20 },
        alum: { n: 'Aluminio 6061-T6', G: 26000, ty: 160, tu: 205, gf: 0.12 },
        laton: { n: 'Latón', G: 39000, ty: 140, tu: 280, gf: 0.25 }
    };
    function tauO(m, g) { var gy = m.ty / m.G; if (g <= gy) return m.G * g; var q = clamp((g - gy) / (m.gf * 0.75 - gy), 0, 1); return m.ty + (m.tu - m.ty) * (1 - Math.pow(1 - q, 2)) - (g > m.gf * 0.75 ? (m.tu - m.ty) * 0.15 * (g - m.gf * 0.75) / (m.gf * 0.25) : 0); }
    G.register('torsion', {
        key: 'torsion', num: '04', title: 'Ensayo de Torsión', accent: OA, rgb: '192,132,252',
        norma: 'ASTM E143 (módulo de corte)', duration: 12, machine: 'Banco de torsión con goniómetro',
        glyph: SVG('<rect x="10" y="26" width="44" height="12" rx="3"/><path d="M10 20v24M54 20v24"/><path d="M18 26l6 12M28 26l6 12M38 26l6 12" stroke-dasharray="2 3"/>'),
        desc: 'Barra circular retorcida: torque, ángulo de giro, esfuerzo cortante τ = T·c/J, deformación γ y módulo G.',
        chips: ['τ = Tc/J', 'γ', 'G', 'φ = TL/GJ'],
        fields: [
            { id: 'mat', type: 'select', label: 'Material', value: 'acero', options: Object.keys(OMAT).map(function (k) { return [k, OMAT[k].n]; }) },
            { id: 'd', label: 'Diámetro d', unit: 'mm', min: 10, max: 50, step: 1, value: 25, dec: 0 },
            { id: 'L', label: 'Longitud calibrada L', unit: 'mm', min: 100, max: 600, step: 10, value: 300, dec: 0 }
        ],
        readouts: [
            { k: 'phiD', label: 'Ángulo φ', unit: '°', dec: 1 },
            { k: 'T', label: 'Torque T', unit: 'N·m', dec: 1 },
            { k: 'tau', label: 'τ máx', unit: 'MPa', dec: 1 },
            { k: 'gam', label: 'γ', unit: 'rad', dec: 4 },
            { k: 'fase', label: 'Fase', unit: '', dec: 0, f: function (S) { return S.fase; } }
        ],
        fromData: null,
        model: function (P) {
            var m = OMAT[P.mat], J = Math.PI * Math.pow(P.d, 4) / 32, c = P.d / 2, pts = [], i;
            for (i = 0; i <= 160; i++) { var g = m.gf * i / 160, t = tauO(m, g), T = t * J / c / 1000, ph = g * P.L / c * 180 / Math.PI; pts.push({ x: ph, y: T }); }
            var Ty = m.ty * J / c / 1000, Tu = m.tu * J / c / 1000;
            return { m: m, J: J, c: c, pts: pts, Ty: Ty, Tu: Tu, phiMax: m.gf * P.L / c * 180 / Math.PI };
        },
        at: function (P, M, p) {
            var m = M.m, q = clamp(p / 0.97, 0, 1), g = q * m.gf, tau = tauO(m, g), T = tau * M.J / M.c / 1000, broke = p >= 0.97;
            return { g: g, gam: g, tau: broke ? 0 : tau, T: broke ? 0 : T, phi: g * P.L / M.c, phiD: g * P.L / M.c * 180 / Math.PI, broke: broke, tauR: tau, fase: g <= m.ty / m.G ? 'Elástica' : (broke ? 'Fractura' : 'Plástica') };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Barra fracturada', cls: 'is-done' };
            return S.fase === 'Plástica' ? { txt: 'Fluencia por torsión', cls: 'is-fail' } : { txt: S.fase, cls: 'is-run' };
        },
        summary: function (P, M) {
            return [
                { label: 'Módulo G', value: fmt(M.m.G / 1000, 0), unit: 'GPa', hi: true },
                { label: 'τ fluencia', value: fmt(M.m.ty, 0), unit: 'MPa', hi: true },
                { label: 'τ última', value: fmt(M.m.tu, 0), unit: 'MPa' },
                { label: 'T fluencia', value: fmt(M.Ty, 1), unit: 'N·m' },
                { label: 'J = πd⁴/32', value: fmt(M.J / 1e4, 2), unit: 'cm⁴' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, OA, tick * 0.15);
            var cy = 238, xl = 170, xr = 630, R = clamp(P.d * 1.15, 18, 48);
            H.steel(ctx, 60, 390, 680, 30, 8, true);
            /* mordaza fija */
            H.steel(ctx, 70, cy - 78, 70, 156, 8, true); H.steel(ctx, 140, cy - 46, 30, 92, 4);
            /* mordaza móvil + husillo */
            var rot = S.phi;
            H.steel(ctx, 660, cy - 78, 70, 156, 8, true); H.steel(ctx, 630, cy - 46, 30, 92, 4);
            /* barra */
            function bar(a, b) {
                var g = ctx.createLinearGradient(0, cy - R, 0, cy + R); g.addColorStop(0, '#e1e8f0'); g.addColorStop(0.5, '#9fb0c8'); g.addColorStop(1, '#4a586e');
                ctx.fillStyle = g; ctx.fillRect(a, cy - R, b - a, 2 * R); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.strokeRect(a, cy - R, b - a, 2 * R);
            }
            var brk = S.broke, mid = (xl + xr) / 2, gap = brk ? S.gam * 0 + 14 : 0;
            if (!brk) bar(xl, xr); else { bar(xl, mid - gap / 2); bar(mid + gap / 2, xr); }
            /* líneas helicoidales */
            ctx.save(); ctx.beginPath(); ctx.rect(xl, cy - R, xr - xl, 2 * R); ctx.clip();
            for (var kk = 0; kk < 6; kk++) {
                ctx.beginPath(); var started = false;
                for (var i = 0; i <= 60; i++) {
                    var t = i / 60, x = lerp(xl, xr, t), ang = rot * t + kk * Math.PI / 3, vis = Math.cos(ang);
                    if (brk && Math.abs(x - mid) < gap / 2) { started = false; continue; }
                    if (vis < 0) { started = false; continue; }
                    var y = cy + R * Math.sin(ang); if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
                }
                ctx.strokeStyle = kk === 0 ? '#fb7185' : 'rgba(30,41,59,.65)'; ctx.lineWidth = kk === 0 ? 3 : 1.6; ctx.stroke();
            }
            ctx.restore();
            if (brk) { ctx.strokeStyle = '#fb7185'; ctx.lineWidth = 2; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(mid, cy - R - 10); ctx.lineTo(mid, cy + R + 10); ctx.stroke(); ctx.setLineDash([]); }
            /* flecha de giro */
            ctx.strokeStyle = OA; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.ellipse(695, cy, 18, 52, 0, -1.9, 1.5); ctx.stroke();
            H.arrow(ctx, 698, cy + 52, 690, cy + 53, OA, 3, 11);
            H.label(ctx, 'T', 724, cy - 60, { size: 16, color: OA, weight: '900' });
            H.label(ctx, 'L = ' + P.L + ' mm  ·  d = ' + P.d + ' mm', mid, cy + R + 40, { align: 'center', size: 11.5, color: C.soft, weight: '700' });
            /* goniómetro */
            var gx = 690, gy = 130, gr = 40;
            ctx.beginPath(); ctx.arc(gx, gy, gr, 0, H.TAU); ctx.fillStyle = '#f1f5f9'; ctx.fill(); ctx.strokeStyle = '#334155'; ctx.lineWidth = 2; ctx.stroke();
            for (var tkk = 0; tkk < 36; tkk++) { var aa = tkk * H.TAU / 36; ctx.beginPath(); ctx.moveTo(gx + Math.cos(aa) * (gr - (tkk % 3 ? 4 : 8)), gy + Math.sin(aa) * (gr - (tkk % 3 ? 4 : 8))); ctx.lineTo(gx + Math.cos(aa) * gr, gy + Math.sin(aa) * gr); ctx.stroke(); }
            ctx.strokeStyle = '#be123c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(rot - Math.PI / 2) * (gr - 6), gy + Math.sin(rot - Math.PI / 2) * (gr - 6)); ctx.stroke();
            H.label(ctx, fmt(S.phiD, 1) + '°', gx, gy + gr + 16, { align: 'center', size: 11.5, color: OA, weight: '800' });
            H.dial(ctx, 100, 120, 48, S.T, Math.max(M.Tu * 1.1, 1), OA, 'TORQUE', fmt(S.T, 0) + ' N·m');
            H.label(ctx, 'Torquímetro', 100, 186, { align: 'center', size: 10.5, color: C.mute });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Torque – ángulo de giro', xlabel: 'Ángulo φ (°)', ylabel: 'T (N·m)',
                        xmin: 0, xmax: M.phiMax, ymin: 0, ymax: Math.ceil(M.Tu * 1.15 / 10) * 10, pts: M.pts, progress: Math.max(0.001, Math.min(1, p / 0.97)), color: OA,
                        over: function (c, X, Y) { H.label(c, 'Ty = ' + fmt(M.Ty, 1) + ' N·m', X(0) + 8, Y(M.Ty) - 10, { size: 10.5, color: OA, weight: '800' }); }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var tmax = M.m.tu * 1.1;
                    H.plot(ctx, W, Ht, {
                        title: 'Distribución de τ en la sección (τ = Tr/J)', xlabel: 'τ (MPa)', ylabel: 'Radio r (mm)',
                        xmin: 0, xmax: tmax, ymin: 0, ymax: M.c, pts: [{ x: 0, y: 0 }, { x: tmax, y: M.c }], progress: 1, color: OA, nolive: true,
                        over: function (c, X, Y) {
                            var t = Math.min(S.tauR, M.m.tu);
                            c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(t), Y(M.c)); c.lineTo(X(0), Y(M.c)); c.closePath();
                            var gg = c.createLinearGradient(X(0), 0, X(t), 0); gg.addColorStop(0, H.rgba(OA, 0.05)); gg.addColorStop(1, H.rgba(OA, 0.5)); c.fillStyle = gg; c.fill();
                            c.save(); c.strokeStyle = OA; c.lineWidth = 3; c.shadowColor = OA; c.shadowBlur = 10; c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(t), Y(M.c)); c.stroke(); c.restore();
                            for (var r = 1; r <= 4; r++) H.arrow(c, X(0), Y(M.c * r / 4), X(t * r / 4), Y(M.c * r / 4), '#fff', 1.4, 6);
                            H.label(c, 'τmáx = ' + fmt(t, 1) + ' MPa', X(t) - 8, Y(M.c) + 16, { align: 'right', size: 11, color: '#fff', weight: '800' });
                            c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(251,191,36,.6)'; c.beginPath(); c.moveTo(X(M.m.ty), Y(0)); c.lineTo(X(M.m.ty), Y(M.c)); c.stroke(); c.restore();
                            H.label(c, 'τy', X(M.m.ty) + 5, Y(M.c * 0.12), { size: 10.5, color: '#FBBF24', weight: '800' });
                        }
                    });
                }
            }
        ]
    });

    /* =====================================================================
       5 · DUREZA ROCKWELL  (ASTM E18)
    ===================================================================== */
    var DA = '#2DD4BF';
    G.register('dureza', {
        key: 'dureza', num: '05', title: 'Dureza Rockwell', accent: DA, rgb: '45,212,191',
        norma: 'ASTM E18', duration: 12, machine: 'Durómetro Rockwell',
        glyph: SVG('<path d="M32 6v22"/><path d="M26 28h12l-6 14z"/><path d="M12 48h40"/><path d="M12 54h40"/>'),
        desc: 'Durómetro Rockwell: precarga, carga mayor, retiro y lectura de la profundidad permanente → HRC o HRB.',
        chips: ['HRC', 'HRB', 'Precarga 10 kgf', 'Profundidad'],
        fields: [
            { id: 'esc', type: 'select', label: 'Escala', value: 'C', options: [['C', 'HRC · cono de diamante · 150 kgf'], ['B', 'HRB · bola de 1/16" · 100 kgf']] },
            { id: 'hr', label: 'Dureza del material (HR)', unit: 'HR', min: 20, max: 100, step: 1, value: 55, dec: 0 }
        ],
        readouts: [
            { k: 'load', label: 'Carga', unit: 'kgf', dec: 0 },
            { k: 'depth', label: 'Profundidad', unit: 'µm', dec: 1 },
            { k: 'hrv', label: 'Lectura HR', unit: '', dec: 0, f: function (S, P, p) { return p >= 0.9 ? S.hrv + (P.esc === 'C' ? ' HRC' : ' HRB') : '—'; } },
            { k: 'fase', label: 'Fase', unit: '', dec: 0, f: function (S) { return S.fase; } }
        ],
        fromData: null,
        model: function (P) {
            var C0 = P.esc === 'C', hmax = C0 ? 100 : 130, hr = clamp(P.hr, C0 ? 20 : 35, C0 ? 70 : 100), e = (hmax - hr) * 2;   /* µm */
            var h1 = 30, h2 = h1 + e + 28, h3 = h1 + e, total = C0 ? 150 : 100, pts = [], q = [0, 0.15, 0.5, 0.75, 0.9, 1], i;
            function depthAt(p) { if (p < 0.15) return h1 * ease(p / 0.15); if (p < 0.5) return lerp(h1, h2, ease((p - 0.15) / 0.35)); if (p < 0.75) return h2 + 1.5 * (p - 0.5) / 0.25; if (p < 0.9) return lerp(h2 + 1.5, h3, ease((p - 0.75) / 0.15)); return h3; }
            for (i = 0; i <= 120; i++) pts.push({ x: i / 120, y: depthAt(i / 120) });
            return { hr: hr, e: e, h1: h1, h2: h2, h3: h3, hmax: hmax, total: total, depthAt: depthAt, pts: pts, C0: C0 };
        },
        at: function (P, M, p) {
            var load = p < 0.15 ? 10 * ease(p / 0.15) : p < 0.5 ? lerp(10, M.total, ease((p - 0.15) / 0.35)) : p < 0.75 ? M.total : p < 0.9 ? lerp(M.total, 10, ease((p - 0.75) / 0.15)) : 10;
            return { load: load, depth: M.depthAt(p), hrv: Math.round(M.hmax - (M.h3 - M.h1) / 2), fase: p < 0.15 ? 'Precarga' : p < 0.5 ? 'Carga mayor' : p < 0.75 ? 'Mantener' : p < 0.9 ? 'Retirar carga' : 'Lectura', ph: p < 0.15 ? 0 : p < 0.5 ? 1 : p < 0.75 ? 2 : p < 0.9 ? 3 : 4 };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Dureza leída', cls: 'is-done' };
            return S.ph === 1 || S.ph === 2 ? { txt: S.fase, cls: 'is-fail' } : { txt: S.fase, cls: 'is-run' };
        },
        summary: function (P, M) {
            var sc = M.C0 ? 'HRC' : 'HRB';
            return [
                { label: 'Dureza', value: fmt(M.hr, 0) + ' ' + sc, unit: '', hi: true },
                { label: 'Profundidad permanente e', value: fmt(M.e, 0), unit: 'µm', hi: true },
                { label: 'Fórmula', value: M.C0 ? '100 − e/2 µm' : '130 − e/2 µm', unit: '' },
                { label: 'Carga total', value: fmt(M.total, 0), unit: 'kgf' },
                { label: 'Indentador', value: M.C0 ? 'Cono 120°' : 'Bola 1/16"', unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, DA, tick * 0.15);
            /* bastidor en C */
            ctx.beginPath(); ctx.moveTo(130, 400); ctx.lineTo(130, 90); ctx.quadraticCurveTo(130, 44, 190, 44); ctx.lineTo(330, 44); ctx.lineTo(330, 100); ctx.lineTo(190, 100); ctx.lineTo(190, 400); ctx.closePath();
            var gc = ctx.createLinearGradient(130, 0, 330, 0); gc.addColorStop(0, '#2d3a50'); gc.addColorStop(0.5, '#51627f'); gc.addColorStop(1, '#2d3a50'); ctx.fillStyle = gc; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke();
            H.steel(ctx, 100, 400, 280, 28, 8, true);
            /* yunque y probeta */
            H.steel(ctx, 270, 350, 90, 30, 4); H.rrect(ctx, 250, 330, 130, 22, 3); ctx.fillStyle = '#b8c3d1'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
            /* indentador */
            var dpx = S.depth / 150 * 22 + (S.ph >= 1 ? 4 : 0) * 0, ix = 315, iy = 262 + dpx;
            ctx.fillStyle = '#7b8ca6'; ctx.fillRect(ix - 9, 100, 18, iy - 100);
            H.steel(ctx, ix - 16, iy - 38, 32, 26, 4);
            ctx.beginPath(); if (M.C0) { ctx.moveTo(ix - 8, iy - 12); ctx.lineTo(ix + 8, iy - 12); ctx.lineTo(ix, iy + 56 - 0); } else { ctx.moveTo(ix - 9, iy - 12); ctx.lineTo(ix + 9, iy - 12); ctx.lineTo(ix + 7, iy + 8); ctx.arc(ix, iy + 8, 7, 0, Math.PI); ctx.lineTo(ix - 9, iy - 12); }
            ctx.closePath(); ctx.fillStyle = M.C0 ? '#bfe9ff' : '#d8dee6'; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.5)'; ctx.stroke();
            /* carga */
            H.arrow(ctx, ix + 54, 70, ix + 54, 110, DA, 4, 11);
            H.label(ctx, fmt(S.load, 0) + ' kgf', ix + 64, 92, { size: 13, color: DA, weight: '800' });
            /* reloj HR */
            H.dial(ctx, 468, 140, 56, S.depth, 160, DA, M.C0 ? 'HRC' : 'HRB', S.ph === 4 ? S.hrv + '' : '—');
            H.label(ctx, 'Profundidad = ' + fmt(S.depth, 1) + ' µm', 468, 222, { align: 'center', size: 11.5, color: C.soft, weight: '700' });
            /* ampliación del contacto */
            var zx = 640, zy = 300, zr = 96;
            ctx.save(); ctx.beginPath(); ctx.arc(zx, zy, zr, 0, H.TAU); ctx.clip();
            ctx.fillStyle = '#0c1424'; ctx.fillRect(zx - zr, zy - zr, 2 * zr, 2 * zr);
            var surf = zy - 8, scl = 0.55;
            var gm = ctx.createLinearGradient(0, surf, 0, zy + zr); gm.addColorStop(0, '#9fb0c8'); gm.addColorStop(1, '#46546a'); ctx.fillStyle = gm;
            ctx.beginPath(); ctx.moveTo(zx - zr, surf); ctx.lineTo(zx - 30, surf); 
            var dd = S.depth * scl, rim = M.C0 ? 8 + dd * 0.9 : Math.sqrt(Math.max(0, 2 * 20 * dd - dd * dd)) * 0.6 + 4;
            ctx.quadraticCurveTo(zx - rim, surf + dd * 0.2, zx - rim * 0.85, surf + dd * 0.0); ctx.lineTo(zx - 1, surf + dd + 0.001); ctx.lineTo(zx + rim * 0.85, surf); ctx.lineTo(zx + zr, surf); ctx.lineTo(zx + zr, zy + zr); ctx.lineTo(zx - zr, zy + zr); ctx.closePath(); ctx.fill();
            ctx.beginPath(); if (M.C0) { ctx.moveTo(zx - 26, surf - 70); ctx.lineTo(zx + 26, surf - 70); ctx.lineTo(zx + 2, surf + dd); ctx.lineTo(zx - 2, surf + dd); } else { ctx.moveTo(zx - 24, surf - 70); ctx.lineTo(zx + 24, surf - 70); ctx.lineTo(zx + 24, surf + dd - 22); ctx.arc(zx, surf + dd - 22, 24, 0, Math.PI); ctx.lineTo(zx - 24, surf - 70); }
            ctx.closePath(); ctx.fillStyle = 'rgba(191,233,255,.9)'; ctx.fill();
            ctx.strokeStyle = '#fbbf24'; ctx.setLineDash([3, 3]); ctx.lineWidth = 1.2;
            [[M.h1, 'h₀'], [M.h3, 'h']].forEach(function (a) { var yy = surf + a[0] * scl * (S.ph >= 3 || a[1] === 'h₀' ? 1 : 0); if (S.ph >= 1) { ctx.beginPath(); ctx.moveTo(zx - zr, yy); ctx.lineTo(zx + zr, yy); ctx.stroke(); } });
            ctx.restore(); ctx.setLineDash([]);
            ctx.beginPath(); ctx.arc(zx, zy, zr, 0, H.TAU); ctx.strokeStyle = DA; ctx.lineWidth = 3; ctx.stroke();
            H.label(ctx, 'Ampliación del contacto', zx, zy - zr - 14, { align: 'center', size: 11, color: C.mute, weight: '800' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Profundidad de penetración durante el ensayo', xlabel: 'Avance del ensayo', ylabel: 'Profundidad (µm)',
                        xmin: 0, xmax: 1, ymin: 0, ymax: Math.ceil(M.h2 * 1.2 / 10) * 10, xticks: [0, 0.15, 0.5, 0.75, 0.9, 1], xfmt: function (v) { return Math.round(v * 100) + '%'; },
                        pts: M.pts, progress: Math.max(0.001, p), color: DA,
                        under: function (c, X, Y) {
                            [['Precarga', 0.075], ['Carga mayor', 0.325], ['Mantener', 0.625], ['Retiro', 0.825], ['Lectura', 0.95]].forEach(function (a) { H.label(c, a[0], X(a[1]), Y(0) - 14, { align: 'center', size: 8.5, color: C.mute, weight: '700' }); });
                            c.save(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(251,191,36,.6)'; c.beginPath(); c.moveTo(X(0), Y(M.h1)); c.lineTo(X(1), Y(M.h1)); c.moveTo(X(0), Y(M.h3)); c.lineTo(X(1), Y(M.h3)); c.stroke(); c.restore();
                            H.label(c, 'h₀ (precarga)', X(0) + 6, Y(M.h1) + 12, { size: 9.5, color: '#FBBF24', weight: '700' }); H.label(c, 'h (permanente)', X(0) + 6, Y(M.h3) - 10, { size: 9.5, color: '#FBBF24', weight: '700' });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.panelBg(ctx, W, Ht, 'Escala de dureza ' + (M.C0 ? 'HRC' : 'HRB'));
                    var cx = W / 2, cy = 232, R = 130, lo = M.C0 ? 20 : 30, hi = M.C0 ? 70 : 100;
                    function ang(v) { return Math.PI * (1 + (v - lo) / (hi - lo)); }
                    [[lo, lo + (hi - lo) * 0.34, '#38BDF8', 'Blando'], [lo + (hi - lo) * 0.34, lo + (hi - lo) * 0.67, '#FBBF24', 'Medio'], [lo + (hi - lo) * 0.67, hi, '#F87171', 'Duro']].forEach(function (z) {
                        ctx.beginPath(); ctx.arc(cx, cy, R, ang(z[0]), ang(z[1])); ctx.strokeStyle = z[2]; ctx.lineWidth = 16; ctx.globalAlpha = 0.85; ctx.stroke(); ctx.globalAlpha = 1;
                        var am = (ang(z[0]) + ang(z[1])) / 2; H.label(ctx, z[3], cx + Math.cos(am) * (R - 34), cy + Math.sin(am) * (R - 34), { align: 'center', size: 10.5, color: z[2], weight: '800' });
                    });
                    for (var v = lo; v <= hi; v += 10) { var a = ang(v); H.label(ctx, String(v), cx + Math.cos(a) * (R + 20), cy + Math.sin(a) * (R + 20), { align: 'center', size: 10, color: C.soft }); }
                    var cur = p >= 0.9 ? M.hr : lerp(lo, M.hr, 0.0), na = ang(clamp(cur, lo, hi));
                    ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(na) * (R - 10), cy + Math.sin(na) * (R - 10)); ctx.stroke();
                    ctx.beginPath(); ctx.arc(cx, cy, 9, 0, H.TAU); ctx.fillStyle = DA; ctx.fill();
                    H.label(ctx, p >= 0.9 ? fmt(M.hr, 0) + (M.C0 ? ' HRC' : ' HRB') : 'Esperando lectura…', cx, cy + 40, { align: 'center', size: 22, color: DA, weight: '900' });
                }
            }
        ]
    });
})(window);
