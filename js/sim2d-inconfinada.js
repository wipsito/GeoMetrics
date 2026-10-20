/**
 * Simulador 2D · Compresión inconfinada (ASTM D2166 · INV E-152) — diseño nuevo
 * Escenario: prensa con probeta que se deforma, plano de falla / abultamiento,
 * relojes de carga y deformación; curva σ–ε con módulo E50 y círculo de Mohr (σ3 = 0).
 */
(function (global) {
    'use strict';
    var G = global.GeoSim2D, H = G.H, C = G.C;
    var ACC = '#2DD4BF';

    function sigma(P, eps) {
        var r = eps / P.epsf;
        if (r <= 1) return P.qu * r * (2 - r);
        if (P.falla === 'fragil') return P.qu * (0.30 + 0.70 * Math.exp(-2.6 * (r - 1)));
        return P.qu * (1 - 0.045 * (r - 1));
    }
    function epsEnd(P) { return Math.min(15, Math.max(P.epsf * 2.4, P.epsf + 5)); }
    function consistencia(qu) {
        if (qu < 25) return 'Muy blanda';
        if (qu < 50) return 'Blanda';
        if (qu < 100) return 'Media';
        if (qu < 200) return 'Firme';
        if (qu < 400) return 'Muy firme';
        return 'Dura';
    }

    G.register('inconfinada', {
        key: 'inconfinada', num: '02', title: 'Compresión Inconfinada', accent: ACC, rgb: '45,212,191',
        norma: 'ASTM D2166 · INV E-152', duration: 11,
        desc: 'Prensa uniaxial: probeta libre (σ₃ = 0), curva σ–ε, círculo de Mohr y cohesión cu = qu/2.',
        chips: ['qu', 'cu = qu/2', 'E₅₀', 'σ – ε'],
        fields: [
            { id: 'd', label: 'Diámetro D', unit: 'mm', min: 33, max: 102, step: 1, value: 38, dec: 0 },
            { id: 'L0', label: 'Altura inicial L₀', unit: 'mm', min: 66, max: 204, step: 1, value: 76, dec: 0 },
            { id: 'qu', label: 'Resistencia qu', unit: 'kPa', min: 20, max: 400, step: 5, value: 120, dec: 0 },
            { id: 'epsf', label: 'Deformación a falla εf', unit: '%', min: 2, max: 15, step: 0.5, value: 6, dec: 1 },
            { id: 'falla', type: 'select', label: 'Tipo de falla', value: 'fragil',
              options: [['fragil', 'Frágil · plano de corte'], ['ductil', 'Dúctil · abultamiento (barril)']] }
        ],
        readouts: [
            { k: 'eps', label: 'ε', unit: '%', dec: 2 },
            { k: 'dL', label: 'ΔL', unit: 'mm', dec: 2 },
            { k: 'sigma', label: 'σ', unit: 'kPa', dec: 1 },
            { k: 'P', label: 'P', unit: 'N', dec: 0 },
            { k: 'A', label: 'A corr.', unit: 'cm²', dec: 2 }
        ],
        fromData: function (d) {
            if (!d || !isFinite(d.qu)) return null;
            var o = { qu: Math.round(d.qu) };
            if (d.d) o.d = d.d; if (d.L0) o.L0 = d.L0;
            if (d.peak && isFinite(d.peak.eps) && d.peak.eps > 1) o.epsf = Math.min(15, Math.max(2, Math.round(d.peak.eps * 2) / 2));
            return o;
        },
        model: function (P) {
            var end = epsEnd(P), pts = [], i, A0 = Math.PI * P.d * P.d / 4;
            for (i = 0; i <= 160; i++) { var e = end * i / 160; pts.push({ x: e, y: sigma(P, e) }); }
            var e50 = P.epsf * (1 - Math.sqrt(0.5));            /* σ = qu/2 sobre la rama inicial */
            return { end: end, pts: pts, A0: A0, E50: 0.5 * P.qu / (e50 / 100), eps50: e50 };
        },
        at: function (P, M, p) {
            var eps = p * M.end, s = sigma(P, eps), A = M.A0 / (1 - eps / 100), r = eps / P.epsf;
            var failed = P.falla === 'fragil' ? H.clamp((r - 1) / 0.35, 0, 1) : H.clamp((r - 1) / 1.6, 0, 1);
            return { eps: eps, sigma: s, P: s * A * 1e-3, A: A / 100, dL: eps / 100 * P.L0, failed: failed, r: r };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Ensayo finalizado', cls: 'is-done' };
            if (S.failed > 0.02) return { txt: S.r > 1 && S.failed >= 1 ? 'Post-pico' : 'Falla', cls: 'is-fail' };
            return { txt: 'Cargando', cls: 'is-run' };
        },
        summary: function (P, M) {
            return [
                { label: 'qu', value: H.fmt(P.qu, 1), unit: 'kPa', hi: true },
                { label: 'cu = qu/2', value: H.fmt(P.qu / 2, 1), unit: 'kPa', hi: true },
                { label: 'εf', value: H.fmt(P.epsf, 1), unit: '%' },
                { label: 'E₅₀', value: H.fmt(M.E50 / 1000, 2), unit: 'MPa' },
                { label: 'Consistencia', value: consistencia(P.qu), unit: '' }
            ];
        },

        /* ----------------------------- ESCENARIO ----------------------------- */
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            var cx = W / 2;
            H.stageBg(ctx, W, Ht, ACC, tick * 0.15);

            /* marco de carga */
            H.steel(ctx, cx - 190, 26, 380, 26, 5);
            H.steel(ctx, cx - 178, 52, 16, 358, 3, true);
            H.steel(ctx, cx + 162, 52, 16, 358, 3, true);
            H.steel(ctx, cx - 210, 408, 420, 36, 8, true);
            H.label(ctx, 'ACTUADOR · 1 %/min', cx, 426, { align: 'center', size: 10, color: C.mute, weight: '700' });

            /* anillo de carga (celda) fijo bajo la viga */
            var ringG = ctx.createLinearGradient(cx - 28, 0, cx + 28, 0);
            ringG.addColorStop(0, '#5a6a82'); ringG.addColorStop(0.5, '#c4d1e4'); ringG.addColorStop(1, '#5a6a82');
            H.rrect(ctx, cx - 28, 52, 56, 40, 10); ctx.fillStyle = ringG; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.stroke();
            H.label(ctx, 'CELDA', cx, 72, { align: 'center', size: 9, color: '#1e293b', weight: '800' });

            /* geometría de la probeta */
            var s = Math.min(2.5, 215 / P.L0), h0 = P.L0 * s, w0 = P.d * s;
            var top = 118, h = h0 * (1 - S.eps / 100);

            /* platos */
            H.steel(ctx, cx - 62, top - 14, 124, 14, 3);                /* superior (fijo) */
            ctx.fillStyle = '#7b8ca6'; ctx.fillRect(cx - 5, 92, 10, top - 14 - 92);
            var by = top + h;
            H.steel(ctx, cx - 62, by, 124, 14, 3);                      /* inferior (sube) */
            var rg = ctx.createLinearGradient(cx - 17, 0, cx + 17, 0);
            rg.addColorStop(0, '#3a4659'); rg.addColorStop(0.5, '#8da0bb'); rg.addColorStop(1, '#3a4659');
            ctx.fillStyle = rg; ctx.fillRect(cx - 17, by + 14, 34, 408 - (by + 14));

            /* probeta */
            var theta = Math.PI / 4 + 0.35;                              /* 45° + φ/2 (φ ≈ 20°) */
            var sp = H.specimen(ctx, {
                cx: cx, top: top, w: w0, h: h, eps: S.eps / 100,
                mode: P.falla === 'fragil' ? 'shear' : 'barrel', failed: S.failed, theta: theta, seed: 11, tone: 'clay'
            });

            /* migajas al fallar */
            if (S.failed > 0 && S.failed < 1 && p < 1) {
                var rr = H.rng(5);
                for (var k = 0; k < 9; k++) {
                    var fx = cx + (rr() - 0.5) * sp.wMean, fy = top + h * 0.5 + ((tick * 1.2 + k * 17) % 90);
                    ctx.fillStyle = 'rgba(185,138,90,' + (0.8 - ((tick * 1.2 + k * 17) % 90) / 120) + ')';
                    ctx.beginPath(); ctx.arc(fx, fy, 1.6 + rr() * 1.4, 0, H.TAU); ctx.fill();
                }
            }

            /* σ3 = 0 */
            var lx = cx - sp.wMean / 2 - 58;
            ctx.save(); ctx.setLineDash([3, 4]); ctx.strokeStyle = 'rgba(167,180,200,.4)'; ctx.lineWidth = 1;
            H.rrect(ctx, lx - 38, top + h / 2 - 20, 76, 40, 10); ctx.stroke(); ctx.restore();
            H.label(ctx, 'σ₃ = 0', lx, top + h / 2 - 5, { align: 'center', size: 13, color: C.text, weight: '800' });
            H.label(ctx, 'sin confinar', lx, top + h / 2 + 11, { align: 'center', size: 9.5, color: C.mute });

            /* flechas σ1 */
            var al = 14 + 40 * (S.sigma / Math.max(P.qu, 1));
            H.arrow(ctx, cx + 100, top - 14 - al, cx + 100, top - 16, ACC, 4, 11);
            H.arrow(ctx, cx + 100, by + 14 + al, cx + 100, by + 16, ACC, 4, 11);
            H.label(ctx, 'σ₁ = ' + H.fmt(S.sigma, 1) + ' kPa', cx + 112, top - 14 - al / 2, { size: 12, color: ACC, weight: '800' });

            /* cotas */
            ctx.save(); ctx.strokeStyle = 'rgba(167,180,200,.55)'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(167,180,200,.55)';
            var dxr = cx + sp.wMean / 2 + 62 + (P.falla === 'ductil' ? 14 : 0);
            ctx.beginPath(); ctx.moveTo(dxr, top); ctx.lineTo(dxr, top + h); ctx.moveTo(dxr - 5, top); ctx.lineTo(dxr + 5, top); ctx.moveTo(dxr - 5, top + h); ctx.lineTo(dxr + 5, top + h); ctx.stroke();
            ctx.restore();
            H.label(ctx, 'L = ' + H.fmt(P.L0 - S.dL, 1) + ' mm', dxr + 8, top + h / 2, { size: 11, color: C.soft });
            H.label(ctx, 'Ø ' + P.d + ' mm', cx, by + 40, { align: 'center', size: 11, color: C.soft });

            /* rótulos de falla */
            if (S.failed > 0.15) {
                var txt = P.falla === 'fragil' ? 'Plano de falla ≈ 45° + φ/2' : 'Abultamiento en barril';
                H.label(ctx, txt, cx - sp.wMean / 2 - 110, top + h + 24, { align: 'center', size: 11, color: '#fda4af', weight: '700', bg: 'rgba(244,63,94,.14)', stroke: 'rgba(244,63,94,.5)' });
            }

            /* relojes */
            H.dial(ctx, 100, 140, 52, S.P, Math.max(M.A0 * P.qu * 1e-3 * 1.1, 1), ACC, 'CARGA', H.fmt(S.P, 0) + ' N');
            H.dial(ctx, W - 100, 140, 52, S.dL, Math.max(P.L0 * M.end / 100, 1), '#FBBF24', 'ΔL', H.fmt(S.dL, 2) + ' mm');
            H.label(ctx, 'Anillo de carga', 100, 218, { align: 'center', size: 10.5, color: C.mute });
            H.label(ctx, 'Comparador de deformación', W - 100, 218, { align: 'center', size: 10.5, color: C.mute });
        },

        /* ------------------------------ GRÁFICAS ------------------------------ */
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Curva esfuerzo – deformación', xlabel: 'Deformación axial ε (%)', ylabel: 'σ (kPa)',
                        xmin: 0, xmax: M.end, ymin: 0, ymax: Math.ceil(P.qu * 1.18 / 10) * 10,
                        pts: M.pts, progress: p, color: ACC,
                        under: function (c, X, Y, pw, ph) {
                            /* secante E50 */
                            var yEnd = P.qu * 0.92, xEnd = yEnd / M.E50 * 100;
                            c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(251,191,36,.8)'; c.lineWidth = 1.6;
                            c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(Math.min(xEnd, M.end)), Y(yEnd)); c.stroke(); c.restore();
                            H.label(c, 'E₅₀ = ' + H.fmt(M.E50 / 1000, 2) + ' MPa', X(Math.min(xEnd, M.end)) + 6, Y(yEnd) + 4, { size: 10.5, color: '#FBBF24', weight: '700' });
                            /* qu */
                            c.save(); c.setLineDash([2, 4]); c.strokeStyle = 'rgba(45,212,191,.55)';
                            c.beginPath(); c.moveTo(X(0), Y(P.qu)); c.lineTo(X(P.epsf), Y(P.qu)); c.lineTo(X(P.epsf), Y(0)); c.stroke(); c.restore();
                            H.label(c, 'qu = ' + H.fmt(P.qu, 0) + ' kPa', X(0) + 8, Y(P.qu) - 10, { size: 10.5, color: ACC, weight: '700' });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var xm = P.qu * 1.25, ym = xm * 250 / 410;
                    var cuNow = S.sigma / 2;
                    var semi = []; for (var i = 0; i <= 40; i++) { var a = Math.PI * i / 40; semi.push({ x: P.qu / 2 - Math.cos(a) * P.qu / 2, y: Math.sin(a) * P.qu / 2 }); }
                    H.plot(ctx, W, Ht, {
                        title: 'Círculo de Mohr (σ₃ = 0)', xlabel: 'σ (kPa)', ylabel: 'τ (kPa)',
                        xmin: 0, xmax: xm, ymin: 0, ymax: ym, pts: semi, progress: 1, color: ACC, nolive: true,
                        over: function (c, X, Y) {
                            /* envolvente φ = 0 */
                            c.save(); c.setLineDash([6, 4]); c.strokeStyle = 'rgba(251,191,36,.85)'; c.lineWidth = 1.6;
                            c.beginPath(); c.moveTo(X(0), Y(P.qu / 2)); c.lineTo(X(xm), Y(P.qu / 2)); c.stroke(); c.restore();
                            H.label(c, 'τf = cu', X(xm) - 8, Y(P.qu / 2) - 10, { align: 'right', size: 10.5, color: '#FBBF24', weight: '700' });
                            /* círculo faltante (final) tenue */
                            c.save(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(45,212,191,.35)'; c.lineWidth = 1.4;
                            c.beginPath(); c.arc(X(P.qu / 2), Y(0), X(P.qu / 2) - X(0), Math.PI, H.TAU); c.stroke(); c.restore();
                            /* círculo actual */
                            var r = Math.max(S.sigma / 2, 0.01);
                            c.save();
                            c.beginPath(); c.arc(X(r), Y(0), X(r) - X(0), Math.PI, H.TAU); c.closePath();
                            var gg = c.createRadialGradient(X(r), Y(0), 2, X(r), Y(0), X(r) - X(0));
                            gg.addColorStop(0, 'rgba(45,212,191,.05)'); gg.addColorStop(1, 'rgba(45,212,191,.30)');
                            c.fillStyle = gg; c.fill();
                            c.shadowColor = ACC; c.shadowBlur = 12; c.strokeStyle = ACC; c.lineWidth = 2.6; c.stroke(); c.restore();
                            /* radio = cu */
                            c.save(); c.strokeStyle = '#fff'; c.lineWidth = 1.4; c.setLineDash([2, 3]);
                            c.beginPath(); c.moveTo(X(r), Y(0)); c.lineTo(X(r), Y(r)); c.stroke(); c.restore();
                            c.beginPath(); c.arc(X(r), Y(r), 4.2, 0, H.TAU); c.fillStyle = '#fff'; c.fill();
                            H.label(c, 'cu = ' + H.fmt(cuNow, 1), X(r) + 8, Y(r) - 6, { size: 11, color: '#fff', weight: '800' });
                            H.label(c, 'σ₃ = 0', X(0) + 4, Y(0) - 12, { size: 10, color: C.mute });
                            H.label(c, 'σ₁ = ' + H.fmt(S.sigma, 0), X(2 * r), Y(0) - 12, { align: 'center', size: 10, color: C.soft });
                        }
                    });
                }
            }
        ]
    });
})(window);
