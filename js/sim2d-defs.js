/**
 * Simuladores 2D rediseñados · Corte directo, Consolidación y Triaxial
 */
(function (global) {
    'use strict';
    var G = global.GeoSim2D, H = G.H, C = G.C;

    /* =====================================================================
       CORTE DIRECTO  (ASTM D3080 · INV E-154)
    ===================================================================== */
    var CA = '#3B82F6';
    var DP = { denso: 2.0, suelto: 4.5, arcilla: 3.5 };
    var RES = { denso: 0.70, suelto: 1.0, arcilla: 0.85 };

    function tauCorte(P, d) {
        var tp = P.c + P.sn * Math.tan(P.phi * Math.PI / 180), dp = DP[P.tipo], res = RES[P.tipo] * tp;
        var r = d / dp;
        if (r <= 1) return tp * Math.sin(Math.PI / 2 * r);
        return res + (tp - res) * Math.exp(-2.0 * (r - 1));
    }
    function dvCorte(P, d) {
        var r = d / DP[P.tipo];
        if (P.tipo === 'denso') return 0.06 * (1 - Math.exp(-6 * r)) - 0.22 * (1 - Math.exp(-0.9 * r));
        if (P.tipo === 'suelto') return 0.26 * (1 - Math.exp(-1.6 * r));
        return 0.14 * (1 - Math.exp(-1.2 * r));
    }

    G.register('corte', {
        key: 'corte', num: '01', title: 'Corte Directo', accent: CA, rgb: '59,130,246',
        norma: 'ASTM D3080 · INV E-154', duration: 10,
        desc: 'Caja de corte bipartida: σn, τ y deslizamiento; envolvente de Mohr-Coulomb en vivo.',
        chips: ['c', 'φ', 'τ – σn'],
        fields: [
            { id: 'sn', label: 'Esfuerzo normal σn', unit: 'kPa', min: 25, max: 400, step: 5, value: 100, dec: 0 },
            { id: 'c', label: 'Cohesión c', unit: 'kPa', min: 0, max: 60, step: 1, value: 10, dec: 0 },
            { id: 'phi', label: 'Ángulo de fricción φ', unit: '°', min: 10, max: 45, step: 0.5, value: 30, dec: 1 },
            { id: 'tipo', type: 'select', label: 'Tipo de suelo', value: 'suelto',
              options: [['denso', 'Arena densa · dilata'], ['suelto', 'Arena suelta · se comprime'], ['arcilla', 'Arcilla · pico suave']] }
        ],
        readouts: [
            { k: 'dh', label: 'δh', unit: 'mm', dec: 2 },
            { k: 'tau', label: 'τ', unit: 'kPa', dec: 1 },
            { k: 'sn', label: 'σn', unit: 'kPa', dec: 0 },
            { k: 'dv', label: 'δv', unit: 'mm', dec: 3 },
            { k: 'N', label: 'N', unit: 'N', dec: 0 }
        ],
        fromData: function (d) {
            if (!d || !isFinite(d.c) || !isFinite(d.phi)) return null;
            return { c: Math.max(0, Math.min(60, Math.round(d.c))), phi: Math.max(10, Math.min(45, Math.round(d.phi * 2) / 2)) };
        },
        model: function (P) {
            var pts = [], dmax = 10, tp = P.c + P.sn * Math.tan(P.phi * Math.PI / 180);
            for (var i = 0; i <= 160; i++) { var d = dmax * i / 160; pts.push({ x: d, y: tauCorte(P, d) }); }
            return { dmax: dmax, pts: pts, tp: tp, tr: RES[P.tipo] * tp, dp: DP[P.tipo] };
        },
        at: function (P, M, p) {
            var d = p * M.dmax, t = tauCorte(P, d);
            return { dh: d, tau: t, sn: P.sn, dv: dvCorte(P, d), N: P.sn * 3.6, failed: H.clamp((d - M.dp) / 1.2, 0, 1), peaked: d >= M.dp };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ensayo finalizado', cls: 'is-done' };
            if (S.peaked) return { txt: 'Falla · plano de corte', cls: 'is-fail' };
            return { txt: 'Cortando', cls: 'is-run' };
        },
        summary: function (P, M) {
            return [
                { label: 'τ pico', value: H.fmt(M.tp, 1), unit: 'kPa', hi: true },
                { label: 'τ residual', value: H.fmt(M.tr, 1), unit: 'kPa' },
                { label: 'c', value: H.fmt(P.c, 1), unit: 'kPa', hi: true },
                { label: 'φ', value: H.fmt(P.phi, 1), unit: '°', hi: true },
                { label: 'δ en falla', value: H.fmt(M.dp, 1), unit: 'mm' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            var cx = W / 2, bw = 250, bh = 62, yT = 218, xL = cx - bw / 2;
            var dx = S.dh * 8, dvPx = S.dv * 26;
            H.stageBg(ctx, W, Ht, CA, tick * 0.15);

            /* bancada */
            H.steel(ctx, 110, yT + 2 * bh + 8, 580, 18, 4, true);
            H.label(ctx, 'RIEL GUÍA', 128, yT + 2 * bh + 17, { size: 9, color: C.mute, weight: '700' });

            /* motor y vástago horizontal */
            H.steel(ctx, 50, yT + bh + 10, 62, 42, 8, true);
            H.label(ctx, 'MOTOR', 81, yT + bh + 31, { align: 'center', size: 9, color: '#cbd5e1', weight: '800' });
            ctx.fillStyle = '#8da0bb'; ctx.fillRect(112, yT + bh + 28, (xL + dx) - 112, 7);
            H.arrow(ctx, 120, yT + bh + 31, 120 + 18 + 44 * (S.tau / Math.max(M.tp, 1)), yT + bh + 31, CA, 3.2, 10);

            function soil(x, y, w, h, seed, shift) {
                var g = ctx.createLinearGradient(0, y, 0, y + h);
                if (P.tipo === 'arcilla') { g.addColorStop(0, '#9c6b45'); g.addColorStop(1, '#7a4f2f'); }
                else { g.addColorStop(0, '#d2b273'); g.addColorStop(1, '#b08f52'); }
                ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
                var r = H.rng(seed), n = P.tipo === 'arcilla' ? 140 : 70;
                ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
                for (var i = 0; i < n; i++) {
                    var gx = x + r() * w, gy = y + r() * h, gr = P.tipo === 'arcilla' ? 0.8 + r() * 1.1 : 1.6 + r() * 2.8;
                    ctx.fillStyle = r() > 0.5 ? 'rgba(0,0,0,.24)' : 'rgba(255,255,255,.22)';
                    ctx.beginPath(); ctx.arc(gx + (shift || 0), gy, gr, 0, H.TAU); ctx.fill();
                }
                ctx.restore();
            }
            function box(x, y, seed) {
                H.steel(ctx, x, y, bw, bh, 5, false);
                ctx.save(); ctx.beginPath(); ctx.rect(x + 9, y + 6, bw - 18, bh - 12); ctx.clip();
                soil(x + 9, y + 6, bw - 18, bh - 12, seed, 0);
                ctx.restore();
            }
            /* mitad inferior (móvil) y superior (fija) */
            box(xL + dx, yT + bh, 31);
            /* piedra porosa inferior */
            ctx.fillStyle = 'rgba(200,210,225,.55)'; ctx.fillRect(xL + dx + 9, yT + 2 * bh - 12, bw - 18, 6);
            box(xL, yT, 9);
            ctx.fillStyle = 'rgba(200,210,225,.55)'; ctx.fillRect(xL + 9, yT + 6, bw - 18, 6);

            /* plano de corte */
            var px0 = Math.max(xL, xL + dx) + 9, px1 = Math.min(xL + bw, xL + dx + bw) - 9;
            ctx.save();
            ctx.shadowColor = S.peaked ? '#fb7185' : CA; ctx.shadowBlur = 14;
            ctx.strokeStyle = S.peaked ? '#fb7185' : CA; ctx.lineWidth = 2.6; ctx.setLineDash([8, 5]); ctx.lineDashOffset = -tick * 0.6;
            ctx.beginPath(); ctx.moveTo(px0, yT + bh); ctx.lineTo(px1, yT + bh); ctx.stroke(); ctx.restore();
            /* granos sueltos en la zona de corte */
            if (S.peaked && p < 1) {
                var rr = H.rng(3);
                for (var k = 0; k < 10; k++) {
                    var gx = px0 + rr() * Math.max(10, px1 - px0), gy = yT + bh + (rr() - 0.5) * 14 + Math.sin(tick * 0.2 + k) * 3;
                    ctx.fillStyle = 'rgba(255,230,170,.8)'; ctx.beginPath(); ctx.arc(gx, gy, 1.8, 0, H.TAU); ctx.fill();
                }
            }
            H.label(ctx, 'plano de corte', xL - 10, yT + bh, { align: 'right', size: 10.5, color: CA, weight: '700' });

            /* anillo de carga + muro (reacción) */
            var rx = xL + bw + 14;
            ctx.fillStyle = '#8da0bb'; ctx.fillRect(xL + bw, yT + bh / 2 - 3, 26, 6);
            H.steel(ctx, rx + 24, yT + bh / 2 - 15, 36, 30, 14);
            ctx.fillStyle = '#8da0bb'; ctx.fillRect(rx + 60, yT + bh / 2 - 3, 28, 6);
            ctx.fillStyle = '#233047'; ctx.fillRect(rx + 88, yT - 30, 18, 2 * bh + 40);
            ctx.strokeStyle = 'rgba(167,180,200,.3)';
            for (var h2 = 0; h2 < 9; h2++) { ctx.beginPath(); ctx.moveTo(rx + 88, yT - 24 + h2 * 20); ctx.lineTo(rx + 106, yT - 36 + h2 * 20); ctx.stroke(); }

            /* tapa y carga normal */
            var capY = yT - 14 + dvPx;
            H.steel(ctx, cx - 100, capY, 200, 12, 3);
            ctx.beginPath(); ctx.arc(cx, capY - 4, 6, 0, H.TAU); ctx.fillStyle = '#c4d1e4'; ctx.fill(); ctx.strokeStyle = '#334155'; ctx.stroke();
            ctx.fillStyle = '#7b8ca6'; ctx.fillRect(cx - 3, 98, 6, capY - 98);
            var nw = H.clamp(Math.ceil(P.sn / 60), 1, 7);
            for (var i = 0; i < nw; i++) {
                var wg = ctx.createLinearGradient(0, 0, 0, 12);
                H.rrect(ctx, cx - 46 + i, 98 - (i + 1) * 12 - 2, 92 - 2 * i, 11, 3);
                var gx2 = ctx.createLinearGradient(cx - 46, 0, cx + 46, 0);
                gx2.addColorStop(0, '#a17c1f'); gx2.addColorStop(0.5, '#f3cf6d'); gx2.addColorStop(1, '#a17c1f');
                ctx.fillStyle = gx2; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
            }
            H.label(ctx, 'N = ' + H.fmt(S.N, 0) + ' N', cx + 62, 86 - (nw - 1) * 6, { size: 12, color: '#fcd34d', weight: '800' });
            H.arrow(ctx, cx - 130, capY - 48, cx - 130, capY - 4, '#22C55E', 4, 11);
            H.label(ctx, 'σn = ' + H.fmt(P.sn, 0) + ' kPa', cx - 138, capY - 56, { align: 'right', size: 12, color: '#86efac', weight: '800' });

            /* relojes */
            H.dial(ctx, 96, 120, 50, S.tau, Math.max(M.tp * 1.15, 1), CA, 'τ', H.fmt(S.tau, 1) + ' kPa');
            H.dial(ctx, W - 96, 120, 50, S.dh, M.dmax, '#FBBF24', 'δh', H.fmt(S.dh, 2) + ' mm');
            H.label(ctx, 'Anillo de carga', 96, 192, { align: 'center', size: 10.5, color: C.mute });
            H.label(ctx, 'Desplazamiento horizontal', W - 96, 192, { align: 'center', size: 10.5, color: C.mute });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Esfuerzo cortante vs desplazamiento', xlabel: 'Desplazamiento horizontal δh (mm)', ylabel: 'τ (kPa)',
                        xmin: 0, xmax: M.dmax, ymin: 0, ymax: Math.ceil(M.tp * 1.2 / 10) * 10 || 10,
                        pts: M.pts, progress: p, color: CA,
                        under: function (c, X, Y) {
                            c.save(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(59,130,246,.5)';
                            c.beginPath(); c.moveTo(X(0), Y(M.tp)); c.lineTo(X(M.dp), Y(M.tp)); c.lineTo(X(M.dp), Y(0)); c.stroke();
                            if (M.tr < M.tp - 0.5) { c.strokeStyle = 'rgba(251,191,36,.6)'; c.beginPath(); c.moveTo(X(M.dp), Y(M.tr)); c.lineTo(X(M.dmax), Y(M.tr)); c.stroke(); }
                            c.restore();
                            H.label(c, 'τ pico = ' + H.fmt(M.tp, 1), X(0) + 8, Y(M.tp) - 10, { size: 10.5, color: CA, weight: '700' });
                            if (M.tr < M.tp - 0.5) H.label(c, 'residual', X(M.dmax) - 6, Y(M.tr) - 9, { align: 'right', size: 10, color: '#FBBF24', weight: '700' });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var xm = Math.max(450, P.sn * 1.3), tg = Math.tan(P.phi * Math.PI / 180);
                    var ym = (P.c + xm * tg) * 1.05;
                    var env = [{ x: 0, y: P.c }, { x: xm, y: P.c + xm * Math.tan(P.phi * Math.PI / 180) }];
                    H.plot(ctx, W, Ht, {
                        title: 'Envolvente de Mohr-Coulomb', xlabel: 'σn (kPa)', ylabel: 'τ (kPa)',
                        xmin: 0, xmax: xm, ymin: 0, ymax: ym, pts: env, progress: 1, color: CA, nolive: true,
                        over: function (c, X, Y) {
                            c.save(); c.strokeStyle = CA; c.lineWidth = 2.6; c.shadowColor = CA; c.shadowBlur = 10;
                            c.beginPath(); c.moveTo(X(0), Y(P.c)); c.lineTo(X(xm), Y(P.c + xm * tg)); c.stroke(); c.restore();
                            /* φ */
                            c.save(); c.strokeStyle = 'rgba(167,180,200,.55)'; c.setLineDash([3, 4]);
                            c.beginPath(); c.moveTo(X(0), Y(P.c)); c.lineTo(X(xm * 0.55), Y(P.c)); c.stroke(); c.restore();
                            var sAng = Math.atan2(Y(P.c + xm * tg) - Y(P.c), X(xm) - X(0));
                            c.beginPath(); c.arc(X(0), Y(P.c), 34, sAng, 0, false);
                            c.strokeStyle = '#FBBF24'; c.lineWidth = 1.5; c.stroke();
                            H.label(c, 'φ = ' + H.fmt(P.phi, 1) + '°', X(0) + 42, Y(P.c) - 14, { size: 11, color: '#FBBF24', weight: '800' });
                            H.label(c, 'c = ' + H.fmt(P.c, 0), X(0) + 6, Y(P.c) + 14, { size: 10.5, color: C.soft, weight: '700' });
                            /* punto de ensayo */
                            var tx = X(P.sn), ty = Y(S.tau);
                            c.save(); c.setLineDash([2, 3]); c.strokeStyle = 'rgba(255,255,255,.45)';
                            c.beginPath(); c.moveTo(tx, Y(0)); c.lineTo(tx, ty); c.stroke(); c.restore();
                            c.beginPath(); c.arc(tx, ty, 9, 0, H.TAU); c.fillStyle = 'rgba(59,130,246,.28)'; c.fill();
                            c.beginPath(); c.arc(tx, ty, 5, 0, H.TAU); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = CA; c.lineWidth = 2; c.stroke();
                            H.label(c, '(σn, τ)', tx + 10, ty - 10, { size: 10.5, color: '#fff', weight: '700' });
                        }
                    });
                }
            }
        ]
    });

    /* =====================================================================
       CONSOLIDACIÓN  (ASTM D2435 · INV E-151)
    ===================================================================== */
    var KA = '#FBBF24';
    function Uavg(Tv) {
        if (Tv <= 0) return 0;
        if (Tv < 0.2) return 2 * Math.sqrt(Tv / Math.PI);
        var s = 0; for (var m = 0; m < 30; m++) { var M = Math.PI * (2 * m + 1) / 2; s += 2 / (M * M) * Math.exp(-M * M * Tv); }
        return 1 - s;
    }
    function uProf(Z, Tv) {          /* u/Δσ a profundidad adimensional Z (0 = cara drenante) */
        if (Tv <= 0) return 1;
        var s = 0; for (var m = 0; m < 60; m++) { var M = Math.PI * (2 * m + 1) / 2; s += 2 / M * Math.sin(M * Z) * Math.exp(-M * M * Tv); }
        return H.clamp(s, 0, 1);
    }
    function cons(P) {
        var s1 = Math.max(P.s1, P.s0 * 1.05), H0 = 20;
        var dH = H0 * P.Cc * Math.log10(s1 / P.s0) / (1 + P.e0);
        var Hdr = P.dren === 'doble' ? H0 / 2 : H0;
        return { s1: s1, H0: H0, dH: dH, Hdr: Hdr, e1: P.e0 - P.Cc * Math.log10(s1 / P.s0) };
    }

    G.register('consolidacion', {
        key: 'consolidacion', num: '03', title: 'Consolidación', accent: KA, rgb: '251,191,36',
        norma: 'ASTM D2435 · INV E-151', duration: 12,
        desc: 'Edómetro: un escalón de carga, disipación de la presión de poros (isócronas) y asentamiento vs log t.',
        chips: ['Cv', 'Cc', 'U – Tv', 'e – log σ′'],
        fields: [
            { id: 's0', label: 'Esfuerzo previo σ′₀', unit: 'kPa', min: 12.5, max: 400, step: 12.5, value: 100, dec: 1 },
            { id: 's1', label: 'Esfuerzo nuevo σ′₁', unit: 'kPa', min: 25, max: 800, step: 12.5, value: 200, dec: 1 },
            { id: 'e0', label: 'Relación de vacíos e₀', unit: '', min: 0.5, max: 1.6, step: 0.01, value: 0.9, dec: 2 },
            { id: 'Cc', label: 'Índice de compresión Cc', unit: '', min: 0.05, max: 0.8, step: 0.01, value: 0.25, dec: 2 },
            { id: 'Cv', label: 'Coeficiente Cv', unit: 'mm²/min', min: 0.5, max: 20, step: 0.5, value: 4, dec: 1 },
            { id: 'dren', type: 'select', label: 'Drenaje', value: 'doble',
              options: [['doble', 'Doble (arriba y abajo)'], ['simple', 'Simple (solo arriba)']] }
        ],
        readouts: [
            { k: 't', label: 't', unit: 'min', dec: 1 },
            { k: 'U', label: 'U', unit: '%', dec: 1 },
            { k: 'dv', label: 'δv', unit: 'mm', dec: 3 },
            { k: 'ue', label: 'u/Δσ medio', unit: '%', dec: 1 },
            { k: 'e', label: 'e', unit: '', dec: 3 }
        ],
        fromData: function (d) {
            if (!d) return null;
            var o = {};
            if (isFinite(d.e0) && d.e0 >= 0.5 && d.e0 <= 1.6) o.e0 = Math.round(d.e0 * 100) / 100;
            if (isFinite(d.Cc) && d.Cc >= 0.05 && d.Cc <= 0.8) o.Cc = Math.round(d.Cc * 100) / 100;
            if (isFinite(d.Cv) && d.Cv > 0) o.Cv = Math.max(0.5, Math.min(20, Math.round(d.Cv * 2) / 2));
            return Object.keys(o).length ? o : null;
        },
        model: function (P) {
            var K = cons(P), pts = [], lt0 = Math.log10(0.1), lt1 = Math.log10(1440), i;
            for (i = 0; i <= 160; i++) {
                var lt = lt0 + (lt1 - lt0) * i / 160, t = Math.pow(10, lt), U = Uavg(P.Cv * t / (K.Hdr * K.Hdr));
                pts.push({ x: lt, y: K.dH * U });
            }
            return { K: K, pts: pts, lt0: lt0, lt1: lt1, t50: 0.197 * K.Hdr * K.Hdr / P.Cv, t90: 0.848 * K.Hdr * K.Hdr / P.Cv };
        },
        at: function (P, M, p) {
            var lt = M.lt0 + (M.lt1 - M.lt0) * p, t = Math.pow(10, lt), Tv = P.Cv * t / (M.K.Hdr * M.K.Hdr), U = Uavg(Tv);
            var ue = 0; for (var i = 0; i < 12; i++) ue += uProf((i + 0.5) / 12, Tv);
            return { t: t, Tv: Tv, U: U * 100, dv: M.K.dH * U, ue: ue / 12 * 100, e: P.e0 - (P.e0 - M.K.e1) * U };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Consolidación completa', cls: 'is-done' };
            return { txt: S.U < 90 ? 'Drenando agua' : 'Fin de primaria', cls: S.U < 90 ? 'is-run' : 'is-fail' };
        },
        summary: function (P, M) {
            return [
                { label: 'Asentamiento final', value: H.fmt(M.K.dH, 3), unit: 'mm', hi: true },
                { label: 'e final', value: H.fmt(M.K.e1, 3), unit: '' , hi: true },
                { label: 't₅₀', value: H.fmt(M.t50, 1), unit: 'min' },
                { label: 't₉₀', value: H.fmt(M.t90, 1), unit: 'min' },
                { label: 'Cv (de t₅₀)', value: H.fmt(0.197 * M.K.Hdr * M.K.Hdr / M.t50, 2), unit: 'mm²/min' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, KA, tick * 0.15);
            var cx = 270, K = M.K, dpx = S.dv * 10;

            /* bandeja base */
            H.steel(ctx, 100, 404, 340, 28, 6, true);
            /* celda con agua */
            H.rrect(ctx, 150, 262, 240, 142, 10);
            ctx.fillStyle = 'rgba(59,130,246,.22)'; ctx.fill(); ctx.strokeStyle = 'rgba(147,197,253,.55)'; ctx.lineWidth = 2; ctx.stroke();
            ctx.fillStyle = 'rgba(147,197,253,.18)'; ctx.fillRect(152, 262, 236, 6);
            H.label(ctx, 'AGUA', 168, 392, { size: 9, color: 'rgba(147,197,253,.8)', weight: '800' });
            if (p > 0 && p < 1) {                                            /* burbujas */
                for (var b = 0; b < 7; b++) {
                    var bx = 164 + (b * 37) % 210, by = 396 - ((tick * 0.7 + b * 29) % 120);
                    ctx.beginPath(); ctx.arc(bx, by, 1.5 + (b % 3), 0, H.TAU); ctx.strokeStyle = 'rgba(191,219,254,.5)'; ctx.lineWidth = 1; ctx.stroke();
                }
            }

            /* anillo + probeta */
            var ringW = 124, hs = 100, sBot = 386, sTop = sBot - 8 - (hs - dpx);
            H.steel(ctx, cx - ringW / 2 - 8, sTop - 8, 8, sBot - sTop + 8, 2);
            H.steel(ctx, cx + ringW / 2, sTop - 8, 8, sBot - sTop + 8, 2);
            var sg = ctx.createLinearGradient(0, sTop, 0, sBot - 8);
            sg.addColorStop(0, '#b7885c'); sg.addColorStop(1, '#8c5f38');
            ctx.fillStyle = sg; ctx.fillRect(cx - ringW / 2, sTop, ringW, sBot - 8 - sTop);
            var r = H.rng(13);
            ctx.save(); ctx.beginPath(); ctx.rect(cx - ringW / 2, sTop, ringW, sBot - 8 - sTop); ctx.clip();
            for (var k = 0; k < 90; k++) { ctx.fillStyle = r() > 0.5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.arc(cx - ringW / 2 + r() * ringW, sTop + r() * (hs), 0.8 + r() * 1.6, 0, H.TAU); ctx.fill(); }
            /* presión de poros: velo azul según u(z) */
            var nS = 24, hh = (sBot - 8 - sTop) / nS;
            for (var i = 0; i < nS; i++) {
                var f = (i + 0.5) / nS, Z = P.dren === 'doble' ? 2 * Math.min(f, 1 - f) : f, u = uProf(Z, S.Tv);
                ctx.fillStyle = 'rgba(56,189,248,' + (0.62 * u).toFixed(3) + ')'; ctx.fillRect(cx - ringW / 2, sTop + i * hh, ringW, hh + 0.5);
            }
            ctx.restore();
            /* piedras porosas */
            ctx.fillStyle = '#d3dbe8'; ctx.fillRect(cx - ringW / 2, sBot - 8, ringW, 8); ctx.fillRect(cx - ringW / 2, sTop - 8, ringW, 8);
            ctx.fillStyle = 'rgba(0,0,0,.25)';
            for (var q = 0; q < 14; q++) { ctx.fillRect(cx - ringW / 2 + 5 + q * 8.6, sBot - 6, 3, 3); ctx.fillRect(cx - ringW / 2 + 5 + q * 8.6, sTop - 6, 3, 3); }
            /* agua que sale */
            if (p > 0 && S.U < 98) {
                var flow = 1 - S.U / 100;
                for (var a = 0; a < 5; a++) {
                    var ax = cx - ringW / 2 + 14 + a * 24, off = ((tick * 0.9 + a * 11) % 22);
                    ctx.fillStyle = 'rgba(147,197,253,' + (0.85 * flow).toFixed(2) + ')';
                    ctx.beginPath(); ctx.arc(ax, sTop - 12 - off, 2.4, 0, H.TAU); ctx.fill();
                    if (P.dren === 'doble') { ctx.beginPath(); ctx.arc(ax, sBot + 4 + off * 0.35, 2.4, 0, H.TAU); ctx.fill(); }
                }
            }
            /* tapa y vástago */
            var capY = sTop - 8 - 12;
            H.steel(ctx, cx - ringW / 2 - 4, capY, ringW + 8, 12, 3);
            ctx.fillStyle = '#9fb0c8'; ctx.fillRect(cx - 5, 150, 10, capY - 150);

            /* palanca y pesas */
            var pivX = 120, pivY = 150, beamL = 340, ang = S.dv * 0.012;
            ctx.save(); ctx.translate(pivX, pivY); ctx.rotate(ang);
            H.steel(ctx, -10, -8, beamL + 10, 16, 4);
            ctx.restore();
            ctx.beginPath(); ctx.moveTo(pivX, pivY + 8); ctx.lineTo(pivX - 18, pivY + 40); ctx.lineTo(pivX + 18, pivY + 40); ctx.closePath(); ctx.fillStyle = '#334155'; ctx.fill();
            ctx.beginPath(); ctx.arc(pivX, pivY, 6, 0, H.TAU); ctx.fillStyle = '#e2e8f0'; ctx.fill();
            var hx = pivX + beamL - 20, hy = pivY + Math.sin(ang) * (beamL - 20);
            ctx.strokeStyle = '#9fb0c8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy + 24); ctx.stroke();
            var nw = H.clamp(Math.ceil(K.s1 / 100), 1, 8);
            for (var w = 0; w < nw; w++) {
                H.rrect(ctx, hx - 28 + w * 0.8, hy + 24 + w * 13, 56 - w * 1.6, 12, 3);
                var wg = ctx.createLinearGradient(hx - 28, 0, hx + 28, 0); wg.addColorStop(0, '#a17c1f'); wg.addColorStop(0.5, '#f3cf6d'); wg.addColorStop(1, '#a17c1f');
                ctx.fillStyle = wg; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.stroke();
            }
            H.label(ctx, 'σ′₁ = ' + H.fmt(K.s1, 0) + ' kPa', hx, hy + 24 + nw * 13 + 16, { align: 'center', size: 12, color: '#fcd34d', weight: '800' });
            H.arrow(ctx, cx, 170, cx, capY - 2, '#22C55E', 3.5, 10);
            H.label(ctx, 'Δσ = ' + H.fmt(K.s1 - P.s0, 0) + ' kPa', cx + 14, 188, { size: 11.5, color: '#86efac', weight: '800' });

            /* reloj */
            H.dial(ctx, 76, 296, 46, S.dv, Math.max(K.dH * 1.1, 0.5), KA, 'δv', H.fmt(S.dv, 3) + ' mm');
            H.label(ctx, 'Extensómetro', 76, 362, { align: 'center', size: 10.5, color: C.mute });
            H.label(ctx, '(deformación ×10)', cx, 446, { align: 'center', size: 9.5, color: C.mute });

            /* ISÓCRONAS */
            var gx = 566, gy = 84, gw = 200, gh = 300;
            H.rrect(ctx, gx - 38, gy - 38, gw + 56, gh + 78, 14); ctx.fillStyle = 'rgba(8,14,26,.72)'; ctx.fill(); ctx.strokeStyle = C.line; ctx.lineWidth = 1; ctx.stroke();
            H.label(ctx, 'Isócronas · u / Δσ', gx + gw / 2, gy - 20, { align: 'center', size: 12, color: C.text, weight: '800' });
            ctx.strokeStyle = 'rgba(167,180,200,.12)'; ctx.beginPath();
            for (var g = 0; g <= 4; g++) { ctx.moveTo(gx + g * gw / 4, gy); ctx.lineTo(gx + g * gw / 4, gy + gh); }
            for (var g2 = 0; g2 <= 4; g2++) { ctx.moveTo(gx, gy + g2 * gh / 4); ctx.lineTo(gx + gw, gy + g2 * gh / 4); }
            ctx.stroke();
            ctx.strokeStyle = '#3b4a63'; ctx.lineWidth = 1.4; ctx.strokeRect(gx, gy, gw, gh);
            [0, 0.5, 1].forEach(function (v) { H.label(ctx, v.toString(), gx + v * gw, gy + gh + 12, { align: 'center', size: 10, color: C.mute }); });
            H.label(ctx, 'z / H  ↓', gx - 8, gy - 6, { align: 'right', size: 9.5, color: C.mute });
            H.label(ctx, P.dren === 'doble' ? 'cara drenante ↑↓' : 'cara drenante ↑', gx + gw / 2, gy + gh + 28, { align: 'center', size: 10, color: '#7dd3fc' });
            function curve(Tv, col, lw, fill) {
                ctx.beginPath();
                for (var j = 0; j <= 60; j++) {
                    var f = j / 60, Z = P.dren === 'doble' ? 2 * Math.min(f, 1 - f) : f, u = uProf(Z, Tv);
                    var xx = gx + u * gw, yy = gy + f * gh; if (j) ctx.lineTo(xx, yy); else ctx.moveTo(xx, yy);
                }
                if (fill) { ctx.lineTo(gx, gy + gh); ctx.lineTo(gx, gy); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
                ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
            }
            [0.01, 0.03, 0.08, 0.2, 0.5].forEach(function (tv) { curve(tv, 'rgba(147,197,253,.28)', 1.2); });
            curve(S.Tv, KA, 3, 'rgba(251,191,36,.20)');
            H.label(ctx, 'Tv = ' + H.fmt(S.Tv, 3), gx + gw - 4, gy + 14, { align: 'right', size: 11, color: KA, weight: '800' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var top = Math.ceil(M.K.dH * 1.15 * 10) / 10 || 1;
                    H.plot(ctx, W, Ht, {
                        title: 'Asentamiento vs log t', xlabel: 't (min)', ylabel: 'δv (mm)',
                        xmin: M.lt0, xmax: M.lt1, ymin: 0, ymax: top,
                        xticks: [-1, 0, 1, 2, 3], xfmt: function (v) { return Math.pow(10, v) >= 1 ? Math.round(Math.pow(10, v)) : '0.1'; },
                        pts: M.pts, progress: p, color: KA,
                        under: function (c, X, Y) {
                            [[M.t50, 't₅₀', 0.5], [M.t90, 't₉₀', 0.9]].forEach(function (a) {
                                var lx = Math.log10(a[0]); if (lx < M.lt0 || lx > M.lt1) return;
                                c.save(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(251,191,36,.45)';
                                c.beginPath(); c.moveTo(X(lx), Y(0)); c.lineTo(X(lx), Y(M.K.dH * a[2])); c.lineTo(X(M.lt0), Y(M.K.dH * a[2])); c.stroke(); c.restore();
                                H.label(c, a[1] + ' = ' + H.fmt(a[0], 1), X(lx) + 5, Y(0) - 12, { size: 10, color: KA, weight: '700' });
                            });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var x0 = Math.log10(P.s0 / 2), x1 = Math.log10(M.K.s1 * 2);
                    var eHi = P.e0 + 0.06, eLo = Math.max(0, M.K.e1 - 0.08);
                    var pts = [{ x: Math.log10(P.s0), y: P.e0 }, { x: Math.log10(M.K.s1), y: M.K.e1 }];
                    H.plot(ctx, W, Ht, {
                        title: 'Curva e – log σ′', xlabel: 'σ′ (kPa)', ylabel: 'e',
                        xmin: x0, xmax: x1, ymin: eLo, ymax: eHi,
                        xticks: [0, 1, 2, 3].filter(function (v) { return v >= x0 && v <= x1; }), xfmt: function (v) { return Math.round(Math.pow(10, v)); },
                        pts: pts, progress: 1, color: KA, nolive: true,
                        over: function (c, X, Y) {
                            c.save(); c.strokeStyle = KA; c.lineWidth = 2.8; c.shadowColor = KA; c.shadowBlur = 10;
                            c.beginPath(); c.moveTo(X(pts[0].x), Y(pts[0].y)); c.lineTo(X(pts[1].x), Y(pts[1].y));
                            c.lineTo(X(x1), Y(M.K.e1 - P.Cc * (x1 - pts[1].x))); c.stroke(); c.restore();
                            [[pts[0], 'σ′₀'], [pts[1], 'σ′₁']].forEach(function (a) {
                                c.beginPath(); c.arc(X(a[0].x), Y(a[0].y), 4.5, 0, H.TAU); c.fillStyle = C.bg; c.fill(); c.strokeStyle = KA; c.lineWidth = 2; c.stroke();
                                H.label(c, a[1], X(a[0].x) + 8, Y(a[0].y) - 11, { size: 10.5, color: C.soft, weight: '700' });
                            });
                            var f = S.U / 100, mx = X(pts[0].x) + (X(pts[1].x) - X(pts[0].x)) * f, my = Y(pts[0].y) + (Y(pts[1].y) - Y(pts[0].y)) * f;
                            c.beginPath(); c.arc(mx, my, 9, 0, H.TAU); c.fillStyle = 'rgba(251,191,36,.28)'; c.fill();
                            c.beginPath(); c.arc(mx, my, 5, 0, H.TAU); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = KA; c.lineWidth = 2; c.stroke();
                            H.label(c, 'Cc = ' + H.fmt(P.Cc, 2), X(x1) - 8, Y(M.K.e1) - 18, { align: 'right', size: 10.5, color: KA, weight: '800' });
                        }
                    });
                }
            }
        ]
    });

    /* =====================================================================
       TRIAXIAL  (ASTM D2850 / D4767 · INV E-153)
    ===================================================================== */
    var TA = '#A78BFA';
    function tx(P) {
        var phi = P.tipo === 'UU' ? 0 : P.phi, rad = phi * Math.PI / 180, N = Math.pow(Math.tan(Math.PI / 4 + rad / 2), 2);
        var uf = P.tipo === 'CU' ? 0.4 * P.s3 : 0, s3e = P.s3 - uf;
        var s1e = s3e * N + 2 * P.c * Math.sqrt(N), qf = s1e - s3e;
        var ef = P.tipo === 'UU' ? 4 : (P.tipo === 'CU' ? 5 : 7);
        return { phi: phi, N: N, uf: uf, s3e: s3e, s1e: s1e, qf: qf, ef: ef, s1: s1e + uf };
    }
    function qEps(K, e) {
        var r = e / K.ef;
        if (r <= 1) return K.qf * 2 * r / (1 + r * r);
        return K.qf * (1 - 0.10 * (1 - Math.exp(-1.5 * (r - 1))));
    }
    function uEps(K, e) { var r = e / K.ef; return K.uf * (r <= 1 ? 1 - Math.exp(-4 * r) : 1 - 0.08 * (1 - Math.exp(-(r - 1)))); }

    G.register('triaxial', {
        key: 'triaxial', num: '04', title: 'Ensayo Triaxial', accent: TA, rgb: '167,139,250',
        norma: 'ASTM D2850 / D4767 · INV E-153', duration: 11,
        desc: 'Cámara triaxial: presión de celda σ₃, carga axial hasta la falla y círculos de Mohr en vivo.',
        chips: ['σ₁', 'σ₃', 'c, φ', 'UU · CU · CD'],
        fields: [
            { id: 'tipo', type: 'select', label: 'Tipo de ensayo', value: 'CU',
              options: [['UU', 'UU · no consolidado no drenado'], ['CU', 'CU · consolidado no drenado'], ['CD', 'CD · consolidado drenado']] },
            { id: 's3', label: 'Presión de celda σ₃', unit: 'kPa', min: 50, max: 500, step: 10, value: 150, dec: 0 },
            { id: 'c', label: 'Cohesión c', unit: 'kPa', min: 0, max: 80, step: 1, value: 15, dec: 0 },
            { id: 'phi', label: 'Ángulo de fricción φ', unit: '°', min: 0, max: 40, step: 0.5, value: 25, dec: 1 }
        ],
        readouts: [
            { k: 'eps', label: 'εa', unit: '%', dec: 2 },
            { k: 's1', label: 'σ₁', unit: 'kPa', dec: 1 },
            { k: 's3', label: 'σ₃', unit: 'kPa', dec: 0 },
            { k: 'q', label: 'σ₁ − σ₃', unit: 'kPa', dec: 1 },
            { k: 'u', label: 'Δu', unit: 'kPa', dec: 1 }
        ],
        fromData: function (d) {
            if (!d || !isFinite(d.c) || !isFinite(d.phi)) return null;
            var o = { c: Math.max(0, Math.min(80, Math.round(d.c))), phi: Math.max(0, Math.min(40, Math.round(d.phi * 2) / 2)) };
            if (d.tipo === 'UU' || d.tipo === 'CU' || d.tipo === 'CD') o.tipo = d.tipo;
            return o;
        },
        model: function (P) {
            var K = tx(P), pts = [], i;
            for (i = 0; i <= 160; i++) { var e = 15 * i / 160; pts.push({ x: e, y: qEps(K, e) }); }
            return { K: K, pts: pts, end: 15 };
        },
        at: function (P, M, p) {
            var K = M.K, e = p * M.end, q = qEps(K, e), u = P.tipo === 'CU' ? uEps(K, e) : 0;
            return { eps: e, q: q, u: u, s3: P.s3, s1: P.s3 + q, s3e: P.s3 - u, s1e: P.s3 - u + q, failed: H.clamp((e - K.ef) / 2, 0, 1), peaked: e >= K.ef };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ensayo finalizado', cls: 'is-done' };
            if (S.peaked) return { txt: 'Falla', cls: 'is-fail' };
            return { txt: 'Carga axial', cls: 'is-run' };
        },
        summary: function (P, M) {
            var K = M.K, out = [
                { label: 'σ₁ en falla', value: H.fmt(K.s1, 1), unit: 'kPa', hi: true },
                { label: '(σ₁ − σ₃)f', value: H.fmt(K.qf, 1), unit: 'kPa', hi: true },
                { label: P.tipo === 'UU' ? 'cu = qf/2' : 'c', value: H.fmt(P.tipo === 'UU' ? K.qf / 2 : P.c, 1), unit: 'kPa' },
                { label: 'φ', value: H.fmt(K.phi, 1), unit: '°' }
            ];
            out.push(P.tipo === 'CU' ? { label: 'Δu falla', value: H.fmt(K.uf, 1), unit: 'kPa' } : { label: 'Drenaje', value: P.tipo === 'CD' ? 'Abierto' : 'Cerrado', unit: '' });
            return out;
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            var cx = W / 2, K = M.K;
            H.stageBg(ctx, W, Ht, TA, tick * 0.15);

            /* marco de carga */
            H.steel(ctx, cx - 220, 22, 440, 26, 5);
            H.steel(ctx, cx - 208, 48, 14, 366, 3, true);
            H.steel(ctx, cx + 194, 48, 14, 366, 3, true);
            H.steel(ctx, cx - 230, 412, 460, 30, 8, true);
            var rg = ctx.createLinearGradient(cx - 26, 0, cx + 26, 0);
            rg.addColorStop(0, '#5a6a82'); rg.addColorStop(0.5, '#c4d1e4'); rg.addColorStop(1, '#5a6a82');
            H.rrect(ctx, cx - 26, 48, 52, 36, 10); ctx.fillStyle = rg; ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();
            H.label(ctx, 'ANILLO', cx, 66, { align: 'center', size: 9, color: '#1e293b', weight: '800' });

            /* cámara */
            var cL = cx - 110, cR = cx + 110, cT = 118, cB = 384;
            H.rrect(ctx, cL, cT, cR - cL, cB - cT, 8);
            var wg = ctx.createLinearGradient(0, cT, 0, cB);
            wg.addColorStop(0, 'rgba(129,140,248,.10)'); wg.addColorStop(1, 'rgba(99,102,241,.38)');
            ctx.fillStyle = wg; ctx.fill();
            ctx.strokeStyle = 'rgba(196,181,253,.6)'; ctx.lineWidth = 2.4; ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cL + 10, cT + 14); ctx.lineTo(cL + 10, cB - 14); ctx.stroke();
            if (p > 0 && p < 1) {
                for (var b = 0; b < 8; b++) {
                    var bx = cL + 18 + (b * 41) % 190, by = cB - 14 - ((tick * 0.6 + b * 31) % 230);
                    ctx.beginPath(); ctx.arc(bx, by, 1.4 + (b % 3) * 0.8, 0, H.TAU); ctx.strokeStyle = 'rgba(221,214,254,.35)'; ctx.lineWidth = 1; ctx.stroke();
                }
            }
            H.steel(ctx, cL - 14, cT - 18, cR - cL + 28, 20, 4);                     /* tapa */
            H.steel(ctx, cL - 14, cB, cR - cL + 28, 24, 4);                          /* base */
            ctx.fillStyle = '#9fb0c8'; ctx.fillRect(cx - 6, 84, 12, cT - 18 - 84 + 2);   /* vástago */

            /* probeta */
            var s = 2.0, w0 = 38 * s, h0 = 76 * s, h = h0 * (1 - S.eps / 100), bot = cB - 14, top = bot - h;
            H.steel(ctx, cx - 50, bot, 100, 14, 2, true);                             /* pedestal */
            ctx.fillStyle = '#d3dbe8'; ctx.fillRect(cx - w0 / 2, bot - 5, w0, 5);
            ctx.fillRect(cx - w0 / 2, top, w0, 5);
            var sp = H.specimen(ctx, { cx: cx, top: top + 5, w: w0, h: h - 10, eps: S.eps / 100, mode: S.failed > 0 && P.tipo !== 'UU' ? 'shear' : 'barrel', failed: S.failed, theta: Math.PI / 4 + K.phi * Math.PI / 360, seed: 17, tone: 'clay' });
            /* membrana */
            ctx.strokeStyle = 'rgba(251,113,133,.65)'; ctx.lineWidth = 2; ctx.strokeRect(cx - sp.wMean / 2 - 1.5, top + 5, sp.wMean + 3, h - 10);
            H.steel(ctx, cx - w0 / 2 - 6, top - 12, w0 + 12, 12, 3);                  /* cabezal */
            ctx.fillStyle = '#9fb0c8'; ctx.fillRect(cx - 5, cT, 10, top - 12 - cT);

            /* σ3 radial */
            var al = 14 + 26 * (P.s3 / 500);
            [0.25, 0.5, 0.75].forEach(function (f) {
                var yy = top + 5 + (h - 10) * f;
                H.arrow(ctx, cx - sp.wMean / 2 - 12 - al, yy, cx - sp.wMean / 2 - 5, yy, TA, 3, 8);
                H.arrow(ctx, cx + sp.wMean / 2 + 12 + al, yy, cx + sp.wMean / 2 + 5, yy, TA, 3, 8);
            });
            H.label(ctx, 'σ₃ = ' + H.fmt(P.s3, 0), cL + 6, cT + 18, { size: 11.5, color: '#ddd6fe', weight: '800' });
            /* σ1 axial */
            var aa = 12 + 34 * (S.q / Math.max(K.qf, 1));
            H.arrow(ctx, cx + 36, cT - 50 - aa * 0.2, cx + 36, cT - 22, '#fb7185', 4, 11);
            H.label(ctx, 'σ₁ = ' + H.fmt(S.s1, 0) + ' kPa', cx + 48, cT - 44, { size: 12, color: '#fda4af', weight: '800' });

            /* drenajes */
            var open = P.tipo === 'CD';
            ctx.strokeStyle = '#7b8ca6'; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(cL - 14, cB + 12); ctx.lineTo(cL - 60, cB + 12); ctx.moveTo(cR + 14, cB + 12); ctx.lineTo(cR + 60, cB + 12); ctx.stroke();
            [[cL - 60, 'Drenaje'], [cR + 60, P.tipo === 'CU' ? 'Transductor u' : 'Contrapresión']].forEach(function (v, i) {
                var on = i === 0 ? open : P.tipo === 'CU';
                ctx.beginPath(); ctx.arc(v[0], cB + 12, 8, 0, H.TAU); ctx.fillStyle = on ? '#16a34a' : '#b91c1c'; ctx.fill();
                H.label(ctx, v[1], v[0], cB + 32, { align: 'center', size: 10, color: on ? '#86efac' : '#fca5a5', weight: '700' });
            });
            /* relojes */
            H.dial(ctx, 92, 150, 48, S.q, Math.max(K.qf * 1.15, 1), TA, 'σ₁−σ₃', H.fmt(S.q, 0) + ' kPa');
            H.label(ctx, 'Carga axial', 92, 220, { align: 'center', size: 10.5, color: C.mute });
            H.dial(ctx, W - 92, 150, 48, P.s3, 500, '#38bdf8', 'σ₃', H.fmt(P.s3, 0) + ' kPa');
            H.label(ctx, 'Presión de celda', W - 92, 220, { align: 'center', size: 10.5, color: C.mute });
            H.dial(ctx, W - 92, 312, 48, S.u, Math.max(K.uf * 1.2, 1), '#fb7185', 'Δu', P.tipo === 'CU' ? H.fmt(S.u, 1) + ' kPa' : '—');
            H.label(ctx, 'Presión de poros', W - 92, 382, { align: 'center', size: 10.5, color: C.mute });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Esfuerzo desviador vs deformación', xlabel: 'Deformación axial εa (%)', ylabel: 'σ₁ − σ₃ (kPa)',
                        xmin: 0, xmax: M.end, ymin: 0, ymax: Math.ceil(M.K.qf * 1.2 / 10) * 10 || 10,
                        pts: M.pts, progress: p, color: TA,
                        under: function (c, X, Y) {
                            c.save(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(167,139,250,.5)';
                            c.beginPath(); c.moveTo(X(0), Y(M.K.qf)); c.lineTo(X(M.K.ef), Y(M.K.qf)); c.lineTo(X(M.K.ef), Y(0)); c.stroke(); c.restore();
                            H.label(c, '(σ₁−σ₃)f = ' + H.fmt(M.K.qf, 0), X(0) + 8, Y(M.K.qf) - 10, { size: 10.5, color: TA, weight: '700' });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var K = M.K, xm = Math.max(K.s1 * 1.12, 200), ym = xm * 250 / 410;
                    var rad = K.phi * Math.PI / 180, env = [{ x: 0, y: P.c }, { x: xm, y: P.c + xm * Math.tan(rad) }];
                    H.plot(ctx, W, Ht, {
                        title: 'Círculos de Mohr', xlabel: 'σ (kPa)', ylabel: 'τ (kPa)',
                        xmin: 0, xmax: xm, ymin: 0, ymax: ym, pts: env, progress: 1, color: '#FBBF24', nolive: true,
                        over: function (c, X, Y) {
                            c.save(); c.strokeStyle = '#FBBF24'; c.lineWidth = 2; c.setLineDash([6, 4]);
                            c.beginPath(); c.moveTo(X(0), Y(P.c)); c.lineTo(X(xm), Y(Math.min(ym, P.c + xm * Math.tan(rad)))); c.stroke(); c.restore();
                            H.label(c, 'τf = c + σ tan φ', X(xm) - 8, Y(Math.min(ym, P.c + xm * Math.tan(rad))) + 14, { align: 'right', size: 10, color: '#FBBF24', weight: '700' });
                            function circ(c1, c2, col, lw, dash, fill) {
                                var cc = (c1 + c2) / 2, r = Math.max((c2 - c1) / 2, 0.01);
                                c.save(); c.beginPath(); c.arc(X(cc), Y(0), X(r) - X(0), Math.PI, H.TAU);
                                if (fill) { c.fillStyle = fill; c.fill(); }
                                if (dash) c.setLineDash(dash);
                                c.strokeStyle = col; c.lineWidth = lw; c.shadowColor = col; c.shadowBlur = dash ? 0 : 12; c.stroke(); c.restore();
                            }
                            circ(K.s3e, K.s1e, 'rgba(167,139,250,.30)', 1.4, [3, 4]);            /* círculo final efectivo */
                            if (P.tipo === 'CU') circ(P.s3, K.s1, 'rgba(56,189,248,.30)', 1.4, [3, 4]);   /* final total */
                            if (P.tipo === 'CU') circ(S.s3, S.s1, '#38bdf8', 2.2, [6, 3]);                /* total actual */
                            circ(S.s3e, S.s1e, TA, 2.8, null, 'rgba(167,139,250,.14)');                     /* efectivo actual */
                            H.label(c, P.tipo === 'CU' ? 'σ′3' : 'σ3', X(S.s3e), Y(0) - 12, { align: 'center', size: 10, color: C.soft });
                            H.label(c, P.tipo === 'CU' ? 'σ′1' : 'σ1', X(S.s1e), Y(0) - 12, { align: 'center', size: 10, color: C.soft });
                            if (P.tipo === 'CU') H.label(c, '— efectivo   - - total', X(0) + 6, Y(ym) + 16, { size: 10, color: C.mute });
                        }
                    });
                }
            }
        ]
    });
})(window);
