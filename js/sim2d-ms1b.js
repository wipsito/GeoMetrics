/**
 * Simuladores 2D · Mecánica de Suelos I (2/2): compactación, densidad en sitio, clasificación SUCS, permeabilidad
 */
(function (global) {
    'use strict';
    var G = global.GeoSim2D, H = G.H, C = G.C, K = G.ms1;
    var clamp = H.clamp, lerp = H.lerp, fmt = H.fmt, ease = K.ease, SVG = K.SVG;

    /* =====================================================================
       5 · COMPACTACIÓN PROCTOR  (ASTM D698 / D1557 · INV E-141 / E-142)
    ===================================================================== */
    var CA = '#FB923C';
    function proc(P) {
        var mod = P.energia === 'modificada';
        var gm = P.gmax * (mod ? 1.07 : 1), wo = Math.max(5, P.wopt - (mod ? 2.5 : 0));
        return { gm: gm, wo: wo, k: 0.0019 * gm, layers: mod ? 5 : 3, blows: 25, drop: mod ? 457 : 305, hammer: mod ? 44.5 : 24.4 };
    }
    function gdW(Pr, w) { return Pr.gm - Pr.k * (w - Pr.wo) * (w - Pr.wo); }
    function zav(Gs, w) { return Gs * 9.81 / (1 + w / 100 * Gs); }

    G.register('compactacion', {
        key: 'compactacion', num: '05', title: 'Compactación Proctor', accent: CA, rgb: '251,146,60',
        norma: 'ASTM D698 / D1557 · INV E-141 / E-142', duration: 16, machine: 'Molde Proctor con martillo de compactación',
        glyph: SVG('<rect x="22" y="34" width="20" height="18" rx="2"/><path d="M32 6v12M26 18h12v8H26z"/><path d="M32 26v6"/>'),
        desc: 'Cinco moldes a distintas humedades: golpes del martillo, curva γd vs w, humedad óptima y línea de saturación.',
        chips: ['γd máx', 'w óptima', 'ZAV', 'Energía'],
        fields: [
            { id: 'energia', type: 'select', label: 'Energía de compactación', value: 'estandar', options: [['estandar', 'Proctor estándar · 3 capas'], ['modificada', 'Proctor modificado · 5 capas']] },
            { id: 'gmax', label: 'γd máx (energía estándar)', unit: 'kN/m³', min: 15, max: 20, step: 0.1, value: 18, dec: 1 },
            { id: 'wopt', label: 'Humedad óptima (estándar)', unit: '%', min: 8, max: 24, step: 0.5, value: 14, dec: 1 },
            { id: 'Gs', label: 'Gravedad específica Gs', unit: '', min: 2.5, max: 2.8, step: 0.01, value: 2.7, dec: 2 }
        ],
        readouts: [
            { k: 'pt', label: 'Molde', unit: 'de 5', dec: 0 },
            { k: 'w', label: 'w', unit: '%', dec: 1 },
            { k: 'bl', label: 'Golpes', unit: '', dec: 0 },
            { k: 'gd', label: 'γd', unit: 'kN/m³', dec: 2 },
            { k: 'gh', label: 'γ húmedo', unit: 'kN/m³', dec: 2 }
        ],
        fromData: null,
        model: function (P) {
            var Pr = proc(P), ws = [-6, -3, 0, 3, 6].map(function (d) { return Pr.wo + d; }), pts = [], i;
            for (i = 0; i <= 50; i++) { var w = Pr.wo - 8 + 18 * i / 50; pts.push({ x: w, y: gdW(Pr, w) }); }
            return { Pr: Pr, ws: ws, pts: pts, gds: ws.map(function (w) { return gdW(Pr, w); }) };
        },
        at: function (P, M, p) {
            var seg = clamp(p, 0, 0.9999) * 5, i = Math.floor(seg), s = seg - i;
            var total = M.Pr.layers * M.Pr.blows, bl = Math.min(total, Math.floor(s / 0.8 * total));
            var gdF = M.gds[i], gd0 = gdF * 0.82, gdNow = lerp(gd0, gdF, ease(s / 0.8)), w = M.ws[i];
            return { i: i, s: s, w: w, bl: bl, total: total, gd: p >= 1 ? M.gds[4] : gdNow, gh: (p >= 1 ? M.gds[4] : gdNow) * (1 + w / 100), pt: i + 1, fr: (s / 0.8 * total) % 1, weighing: s >= 0.8 };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Curva de compactación completa', cls: 'is-done' };
            return S.weighing ? { txt: 'Pesando el molde', cls: 'is-run' } : { txt: 'Compactando molde ' + S.pt, cls: 'is-fail' };
        },
        summary: function (P, M) {
            var sr = (M.Pr.gm * 100 * 0) + 100 * (M.Pr.wo / 100) * P.Gs / (P.Gs * 9.81 / M.Pr.gm - 1);
            return [
                { label: 'γd máx', value: fmt(M.Pr.gm, 2), unit: 'kN/m³', hi: true },
                { label: 'w óptima', value: fmt(M.Pr.wo, 1), unit: '%', hi: true },
                { label: 'Sr en el óptimo', value: fmt(sr, 0), unit: '%' },
                { label: 'Capas × golpes', value: M.Pr.layers + ' × ' + M.Pr.blows, unit: '' },
                { label: 'Martillo', value: fmt(M.Pr.hammer, 1) + ' N', unit: '· ' + M.Pr.drop + ' mm' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, CA, tick * 0.15);
            var Pr = M.Pr, cx = 400, mb = 392, mh = 170, mw = 130;
            /* fila de moldes (progreso) */
            for (var m = 0; m < 5; m++) {
                var x = 60 + m * 66, done = m < S.i || p >= 1, cur = m === S.i && p < 1;
                H.rrect(ctx, x, 40, 54, 66, 8); ctx.fillStyle = cur ? H.rgba(CA, 0.22) : 'rgba(8,14,26,.7)'; ctx.fill(); ctx.strokeStyle = cur ? CA : C.line; ctx.lineWidth = cur ? 2 : 1; ctx.stroke();
                H.rrect(ctx, x + 11, 56, 32, 34, 4); ctx.fillStyle = done || cur ? '#7a5a3a' : '#2a3547'; ctx.fill();
                H.label(ctx, fmt(M.ws[m], 1) + '%', x + 27, 98, { align: 'center', size: 10, color: done || cur ? '#fff' : C.mute, weight: '800' });
            }
            /* martillo con guía */
            var hh = 120, fr = S.fr, y;
            if (S.weighing || p >= 1) y = 0; else y = fr < 0.7 ? ease(fr / 0.7) * hh : hh * (1 - Math.pow((fr - 0.7) / 0.3, 2));
            var topSoil = mb - mh + 6;
            var hy = topSoil - 44 - y;
            ctx.fillStyle = '#9fb0c8'; ctx.fillRect(cx - 4, 150, 8, topSoil - 150 - 6);
            H.steel(ctx, cx - 40, 140, 80, 14, 3);
            H.steel(ctx, cx - 26, hy, 52, 44, 6);
            H.label(ctx, fmt(Pr.hammer, 1) + ' N', cx, hy + 22, { align: 'center', size: 10, color: '#0f172a', weight: '800' });
            ctx.strokeStyle = 'rgba(251,146,60,.5)'; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(cx + 64, topSoil - 44 - hh); ctx.lineTo(cx + 64, topSoil - 44); ctx.stroke(); ctx.setLineDash([]);
            H.label(ctx, Pr.drop + ' mm', cx + 72, topSoil - 44 - hh / 2, { size: 10.5, color: CA, weight: '700' });
            /* molde */
            H.steel(ctx, cx - mw / 2 - 18, mb, mw + 36, 14, 3, true);
            H.steel(ctx, cx - mw / 2 - 10, mb - mh - 12, mw + 20, 14, 3);                            /* collar */
            H.rrect(ctx, cx - mw / 2, mb - mh, mw, mh, 4); ctx.fillStyle = '#10151f'; ctx.fill();
            var lh = mh / Pr.layers, filled = Math.min(Pr.layers, S.bl / Pr.blows), t = clamp((S.w - 6) / 22, 0, 1);
            var c1 = [Math.round(lerp(165, 98, t)), Math.round(lerp(130, 66, t)), Math.round(lerp(92, 40, t))];
            for (var l = 0; l < Pr.layers; l++) {
                var lf = clamp(filled - l, 0, 1); if (lf <= 0) continue;
                var ly = mb - (l + 1) * lh, shr = (1 - lf) * 14;
                var shade = 'rgb(' + (c1[0] - l * 6) + ',' + (c1[1] - l * 5) + ',' + (c1[2] - l * 4) + ')';
                ctx.fillStyle = shade; ctx.fillRect(cx - mw / 2 + 3, ly + shr, mw - 6, lh - 2 - shr);
                var r = H.rng(7 + l); for (var g = 0; g < 14; g++) { ctx.fillStyle = r() > 0.5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.15)'; ctx.beginPath(); ctx.arc(cx - mw / 2 + 8 + r() * (mw - 16), ly + shr + r() * (lh - 4 - shr), 1 + r() * 1.5, 0, H.TAU); ctx.fill(); }
            }
            ctx.strokeStyle = 'rgba(200,210,225,.7)'; ctx.lineWidth = 3; ctx.strokeRect(cx - mw / 2, mb - mh, mw, mh);
            for (var q = 1; q < Pr.layers; q++) { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx - mw / 2, mb - q * lh); ctx.lineTo(cx + mw / 2, mb - q * lh); ctx.stroke(); ctx.setLineDash([]); }
            H.label(ctx, 'Capa ' + Math.min(Pr.layers, Math.floor(S.bl / Pr.blows) + 1) + ' de ' + Pr.layers, cx - mw / 2 - 28, mb - mh / 2, { align: 'right', size: 11.5, color: C.soft, weight: '700' });
            H.label(ctx, 'Golpes: ' + S.bl + ' / ' + S.total, cx + mw / 2 + 28, mb - mh / 2, { size: 13, color: CA, weight: '800' });
            /* balanza */
            H.steel(ctx, 600, 340, 160, 56, 8, true); H.rrect(ctx, 625, 350, 110, 26, 5); ctx.fillStyle = '#0a1a10'; ctx.fill();
            ctx.fillStyle = '#86efac'; ctx.font = '800 17px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(S.weighing ? fmt(S.gh, 2) : '0.00', 728, 363);
            H.label(ctx, S.weighing ? 'γ húmedo (kN/m³)' : 'BALANZA', 680, 330, { align: 'center', size: 10.5, color: S.weighing ? CA : '#cbd5e1', weight: '800' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var wlo = M.Pr.wo - 8, whi = M.Pr.wo + 10, gtop = Math.ceil(M.Pr.gm + 0.6), gbot = Math.floor(M.Pr.gm - 3.6);
                    var zp = []; for (var i = 0; i <= 40; i++) { var w = wlo + (whi - wlo) * i / 40; zp.push({ x: w, y: zav(P.Gs, w) }); }
                    H.plot(ctx, W, Ht, {
                        title: 'Curva de compactación', xlabel: 'Humedad w (%)', ylabel: 'γd (kN/m³)',
                        xmin: wlo, xmax: whi, ymin: gbot, ymax: gtop, pts: M.pts, progress: 1, color: CA, nolive: true,
                        over: function (c, X, Y) {
                            c.save(); c.setLineDash([6, 4]); c.strokeStyle = '#38BDF8'; c.lineWidth = 1.8; c.beginPath();
                            zp.forEach(function (q, k) { if (q.y > gtop || q.y < gbot) return; if (k) c.lineTo(X(q.x), Y(q.y)); else c.moveTo(X(q.x), Y(q.y)); }); c.stroke(); c.restore();
                            H.label(c, 'ZAV (Sr = 100 %)', X(whi) - 6, Y(zav(P.Gs, whi - 0.5)) - 10, { align: 'right', size: 10, color: '#38BDF8', weight: '700' });
                            var cur = clamp(p * 5, 0, 5), last = Math.min(4, Math.floor(cur)), ww = p >= 1 ? M.ws[4] : (M.ws[last] - (last > 0 ? 0 : 0));
                            var upto = p >= 1 ? 4 : (cur - last >= 0.8 ? last : last - 1);
                            if (upto >= 0) {
                                c.save(); c.strokeStyle = CA; c.lineWidth = 3; c.shadowColor = CA; c.shadowBlur = 10; c.beginPath();
                                for (var k = 0; k <= 30; k++) { var w2 = lerp(M.ws[0], M.ws[upto], k / 30), y2 = gdW(M.Pr, w2); if (k) c.lineTo(X(w2), Y(y2)); else c.moveTo(X(w2), Y(y2)); } c.stroke(); c.restore();
                            }
                            for (var m = 0; m <= upto; m++) { c.beginPath(); c.arc(X(M.ws[m]), Y(M.gds[m]), 6, 0, H.TAU); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = CA; c.lineWidth = 2.2; c.stroke(); }
                            if (p >= 1) {
                                c.save(); c.setLineDash([3, 4]); c.strokeStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.moveTo(X(M.Pr.wo), Y(gbot)); c.lineTo(X(M.Pr.wo), Y(M.Pr.gm)); c.lineTo(X(wlo), Y(M.Pr.gm)); c.stroke(); c.restore();
                                H.label(c, 'γd máx = ' + fmt(M.Pr.gm, 2), X(wlo) + 8, Y(M.Pr.gm) - 10, { size: 10.5, color: CA, weight: '800' });
                                H.label(c, 'w opt = ' + fmt(M.Pr.wo, 1) + ' %', X(M.Pr.wo) + 6, Y(gbot) - 12, { size: 10.5, color: '#fff', weight: '800' });
                            }
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var A = proc({ energia: 'estandar', gmax: P.gmax, wopt: P.wopt }), B = proc({ energia: 'modificada', gmax: P.gmax, wopt: P.wopt });
                    var wlo = A.wo - 9, whi = A.wo + 11, pa = [], pb = [];
                    for (var i = 0; i <= 40; i++) { var w = wlo + (whi - wlo) * i / 40; pa.push({ x: w, y: gdW(A, w) }); pb.push({ x: w, y: gdW(B, w) }); }
                    var cur = P.energia === 'modificada';
                    H.plot(ctx, W, Ht, {
                        title: 'Efecto de la energía de compactación', xlabel: 'Humedad w (%)', ylabel: 'γd (kN/m³)',
                        xmin: wlo, xmax: whi, ymin: Math.floor(A.gm - 3.4), ymax: Math.ceil(B.gm + 0.6), pts: pa, progress: 1, color: '#38BDF8', nolive: true,
                        over: function (c, X, Y) {
                            [[pa, A, '#38BDF8', 'Estándar', !cur], [pb, B, CA, 'Modificada', cur]].forEach(function (a) {
                                c.save(); c.strokeStyle = a[2]; c.lineWidth = a[4] ? 3.2 : 1.6; c.globalAlpha = a[4] ? 1 : 0.45; c.shadowColor = a[2]; c.shadowBlur = a[4] ? 10 : 0; c.beginPath();
                                a[0].forEach(function (q, k) { if (k) c.lineTo(X(q.x), Y(q.y)); else c.moveTo(X(q.x), Y(q.y)); }); c.stroke(); c.restore();
                                c.beginPath(); c.arc(X(a[1].wo), Y(a[1].gm), 5, 0, H.TAU); c.fillStyle = a[2]; c.fill();
                                H.label(c, a[3] + ' · ' + fmt(a[1].gm, 1) + ' kN/m³ · ' + fmt(a[1].wo, 1) + ' %', X(a[1].wo) + (a[3] === 'Estándar' ? 10 : -10), Y(a[1].gm) + (a[3] === 'Estándar' ? 22 : -14), { align: a[3] === 'Estándar' ? 'left' : 'right', size: 10, color: a[2], weight: '800' });
                            });
                        }
                    });
                }
            }
        ]
    });

    /* =====================================================================
       6 · DENSIDAD EN SITIO – CONO DE ARENA  (ASTM D1556 · INV E-161)
    ===================================================================== */
    var DA = '#A3E635';
    G.register('densidad', {
        key: 'densidad', num: '06', title: 'Densidad en Sitio', accent: DA, rgb: '163,230,53',
        norma: 'ASTM D1556 · INV E-161', duration: 13, machine: 'Cono de arena con frasco y placa base',
        glyph: SVG('<path d="M20 8h24l-4 14H24z"/><path d="M26 22l6 10 6-10"/><path d="M12 36h40"/><path d="M26 36c0 10 12 10 12 0"/>'),
        desc: 'Cono de arena calibrada: excavas el hueco, lo llenas con arena y obtienes γh, γd y el grado de compactación.',
        chips: ['ρh', 'ρd', 'V hueco', 'GC %'],
        fields: [
            { id: 'rs', label: 'Densidad de la arena calibrada', unit: 'g/cm³', min: 1.3, max: 1.7, step: 0.01, value: 1.45, dec: 2 },
            { id: 'V', label: 'Volumen del hueco', unit: 'cm³', min: 500, max: 1500, step: 10, value: 900, dec: 0 },
            { id: 'rh', label: 'Densidad húmeda del suelo', unit: 'g/cm³', min: 1.6, max: 2.3, step: 0.01, value: 1.95, dec: 2 },
            { id: 'w', label: 'Humedad del suelo', unit: '%', min: 5, max: 25, step: 0.5, value: 12, dec: 1 },
            { id: 'rdmax', label: 'ρd máx de laboratorio', unit: 'g/cm³', min: 1.6, max: 2.2, step: 0.01, value: 1.85, dec: 2 }
        ],
        readouts: [
            { k: 'out', label: 'Arena usada', unit: 'g', dec: 0 },
            { k: 'inHole', label: 'Arena en hueco', unit: 'g', dec: 0 },
            { k: 'Vc', label: 'V hueco', unit: 'cm³', dec: 0 },
            { k: 'rh', label: 'ρh', unit: 'g/cm³', dec: 3 },
            { k: 'rd', label: 'ρd', unit: 'g/cm³', dec: 3 }
        ],
        fromData: null,
        model: function (P) {
            var Mcono = 1180, inHoleT = P.rs * P.V, Mtot = Mcono + inHoleT, Msoil = P.rh * P.V, rd = P.rh / (1 + P.w / 100), pts = [], i;
            for (i = 0; i <= 80; i++) { var q = i / 80; pts.push({ x: q * 40, y: Mtot * ease(q) }); }
            return { Mcono: Mcono, inHoleT: inHoleT, Mtot: Mtot, Msoil: Msoil, rd: rd, GC: rd / P.rdmax * 100, pts: pts };
        },
        at: function (P, M, p) {
            var q = ease((p - 0.25) / 0.6), out = M.Mtot * q, inHole = Math.max(0, out - M.Mcono);
            var Vc = inHole / P.rs, fin = p >= 0.85;
            return { q: q, out: out, inHole: inHole, Vc: Vc, rh: fin ? M.Msoil / P.V : 0, rd: fin ? M.rd : 0, dig: clamp(p / 0.15, 0, 1), ph: p < 0.15 ? 0 : p < 0.25 ? 1 : p < 0.85 ? 2 : 3 };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Densidad calculada', cls: 'is-done' };
            return [{ txt: 'Excavando el hueco', cls: 'is-run' }, { txt: 'Colocando el cono', cls: 'is-run' }, { txt: 'Arena llenando el hueco', cls: 'is-fail' }, { txt: 'Pesando el frasco', cls: 'is-run' }][S.ph];
        },
        summary: function (P, M) {
            return [
                { label: 'ρh = Msuelo / V', value: fmt(P.rh, 3), unit: 'g/cm³', hi: true },
                { label: 'ρd = ρh / (1 + w)', value: fmt(M.rd, 3), unit: 'g/cm³', hi: true },
                { label: 'Suelo excavado', value: fmt(M.Msoil, 0), unit: 'g' },
                { label: 'Grado de compactación', value: fmt(M.GC, 1), unit: '%', hi: M.GC >= 95 },
                { label: 'Cumple 95 %', value: M.GC >= 95 ? 'Sí' : 'No', unit: '' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, DA, tick * 0.15);
            var cx = 280, gy = 300;
            /* terreno */
            var gg = ctx.createLinearGradient(0, gy, 0, 440); gg.addColorStop(0, '#6b4c30'); gg.addColorStop(1, '#3a2a1b'); ctx.fillStyle = gg; ctx.fillRect(40, gy, 480, 140);
            var rr = H.rng(4); for (var i = 0; i < 160; i++) { ctx.fillStyle = rr() > 0.5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.1)'; ctx.beginPath(); ctx.arc(40 + rr() * 480, gy + 6 + rr() * 130, 1 + rr() * 2, 0, H.TAU); ctx.fill(); }
            var hr = 54 * Math.cbrt(P.V / 900), hd = hr * 1.25 * S.dig;
            /* hueco */
            if (S.dig > 0) {
                ctx.save(); ctx.beginPath(); ctx.moveTo(cx - hr, gy); ctx.bezierCurveTo(cx - hr, gy + hd * 1.2, cx + hr, gy + hd * 1.2, cx + hr, gy); ctx.closePath(); ctx.fillStyle = '#1a120b'; ctx.fill(); ctx.clip();
                var fillH = (S.inHole / M.inHoleT) * hd * 1.15;
                if (S.inHole > 0) { ctx.fillStyle = '#e3c586'; ctx.fillRect(cx - hr - 2, gy + hd * 1.2 - fillH, hr * 2 + 4, fillH + 2); ctx.fillStyle = 'rgba(0,0,0,.2)'; for (var s = 0; s < 40; s++) { ctx.beginPath(); ctx.arc(cx - hr + rr() * hr * 2, gy + hd * 1.2 - rr() * fillH, 1.3, 0, H.TAU); ctx.fill(); } }
                ctx.restore();
            }
            /* placa base y cono + frasco */
            if (S.ph >= 1) {
                var drop = (1 - ease((p - 0.15) / 0.1)) * 70;
                H.steel(ctx, cx - 100, gy - 8 - drop, 200, 8, 2);
                ctx.beginPath(); ctx.moveTo(cx - 52, gy - 8 - drop); ctx.lineTo(cx + 52, gy - 8 - drop); ctx.lineTo(cx + 10, gy - 62 - drop); ctx.lineTo(cx - 10, gy - 62 - drop); ctx.closePath();
                var gc = ctx.createLinearGradient(cx - 52, 0, cx + 52, 0); gc.addColorStop(0, '#8a6d22'); gc.addColorStop(0.5, '#f2d57a'); gc.addColorStop(1, '#8a6d22'); ctx.fillStyle = gc; ctx.fill();
                var jb = gy - 62 - drop, jh = 170, level = 1 - S.out / (M.Mtot + 3200) * 1.0;
                H.rrect(ctx, cx - 62, jb - jh, 124, jh, 12); ctx.fillStyle = 'rgba(186,230,253,.12)'; ctx.fill(); ctx.strokeStyle = 'rgba(224,242,254,.65)'; ctx.lineWidth = 2.4; ctx.stroke();
                ctx.save(); H.rrect(ctx, cx - 62, jb - jh, 124, jh, 12); ctx.clip();
                var sandTop = jb - jh * (0.12 + 0.82 * clamp(level, 0, 1));
                ctx.fillStyle = '#e3c586'; ctx.fillRect(cx - 64, sandTop, 128, jb - sandTop); ctx.restore();
                if (S.ph === 2 && S.q < 0.995) { ctx.strokeStyle = '#e3c586'; ctx.lineWidth = 4; ctx.setLineDash([3, 5]); ctx.lineDashOffset = -tick; ctx.beginPath(); ctx.moveTo(cx, jb + 2); ctx.lineTo(cx, gy + hd * 0.7); ctx.stroke(); ctx.setLineDash([]); }
                H.label(ctx, 'frasco con arena', cx - 76, jb - jh / 2, { align: 'right', size: 10.5, color: C.soft });
            } else {
                H.steel(ctx, cx - 70, gy - 30 - 10 * S.dig, 140, 6, 2);
                ctx.save(); ctx.translate(cx + 110, gy - 60 - Math.sin(S.dig * Math.PI) * 24); ctx.rotate(0.5 - S.dig * 0.4); H.steel(ctx, 0, 0, 12, 90, 3); ctx.restore();
            }
            H.label(ctx, 'plano del ensayo', 52, gy + 14, { size: 10, color: C.mute });
            /* balanza con suelo excavado */
            H.steel(ctx, 580, 330, 180, 64, 10, true); H.rrect(ctx, 610, 342, 120, 28, 5); ctx.fillStyle = '#0a1a10'; ctx.fill();
            ctx.fillStyle = '#86efac'; ctx.font = '800 19px monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
            ctx.fillText(fmt(S.ph === 0 ? M.Msoil * S.dig : (S.ph === 3 ? M.Mtot : M.Msoil), 0) + ' g', 720, 356);
            H.steel(ctx, 600, 318, 140, 10, 3);
            H.pile(ctx, 670, 318, 80, 24 * (S.ph === 0 ? S.dig : 1), '#8a6340', '#4a3220', 6);
            H.label(ctx, S.ph === 3 ? 'arena consumida' : 'suelo excavado (Msuelo)', 670, 296, { align: 'center', size: 10.5, color: DA, weight: '800' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.plot(ctx, W, Ht, {
                        title: 'Arena consumida del frasco', xlabel: 'Tiempo (relativo, s)', ylabel: 'Masa de arena (g)',
                        xmin: 0, xmax: 40, ymin: 0, ymax: Math.ceil(M.Mtot * 1.1 / 100) * 100,
                        pts: M.pts, progress: Math.max(0.001, clamp((p - 0.25) / 0.6, 0, 1)), color: DA,
                        under: function (c, X, Y) {
                            c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(163,230,53,.5)';
                            c.beginPath(); c.moveTo(X(0), Y(M.Mcono)); c.lineTo(X(40), Y(M.Mcono)); c.stroke(); c.restore();
                            H.label(c, 'cono = ' + fmt(M.Mcono, 0) + ' g (calibración)', X(40) - 6, Y(M.Mcono) + 14, { align: 'right', size: 10, color: DA, weight: '700' });
                            H.label(c, 'hueco = ' + fmt(M.inHoleT, 0) + ' g', X(40) - 6, Y(M.Mtot) - 10, { align: 'right', size: 10, color: '#fff', weight: '700' });
                        }
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.panelBg(ctx, W, Ht, 'Densidades y grado de compactación');
                    var items = [['ρh', P.rh, '#A7B4C8'], ['ρd', M.rd, DA], ['ρd máx', P.rdmax, '#38BDF8'], ['95 % ρd máx', P.rdmax * 0.95, '#FBBF24']];
                    var x0 = 110, x1 = W - 30, mx = Math.max(P.rh, P.rdmax) * 1.08;
                    items.forEach(function (it, i) {
                        var y = 70 + i * 52, w = (x1 - x0) * (it[1] / mx) * (it[0] === 'ρd' || it[0] === 'ρh' ? clamp(p * 1.4, 0, 1) : 1);
                        H.label(ctx, it[0], 16, y + 12, { size: 12, color: C.soft, weight: '700' });
                        H.rrect(ctx, x0, y, Math.max(w, 4), 24, 7); ctx.fillStyle = it[2]; ctx.globalAlpha = it[0] === '95 % ρd máx' ? 0.55 : 0.9; ctx.fill(); ctx.globalAlpha = 1;
                        H.label(ctx, fmt(it[1], 3), x0 + Math.max(w, 4) + 8, y + 12, { size: 11.5, color: '#fff', weight: '800' });
                    });
                    var ok = M.GC >= 95;
                    H.label(ctx, 'GC = ' + fmt(M.GC, 1) + ' %  ' + (ok ? '✔ cumple' : '✖ no cumple'), W / 2, 296, { align: 'center', size: 15, color: ok ? '#4ade80' : '#fb7185', weight: '800' });
                }
            }
        ]
    });

    /* =====================================================================
       7 · CLASIFICACIÓN SUCS  (ASTM D2487 · INV E-181)
    ===================================================================== */
    var SA = '#818CF8';
    var NAMES = { GW: 'Grava bien gradada', GP: 'Grava mal gradada', GM: 'Grava limosa', GC: 'Grava arcillosa', SW: 'Arena bien gradada', SP: 'Arena mal gradada', SM: 'Arena limosa', SC: 'Arena arcillosa',
        CL: 'Arcilla de baja plasticidad', 'CL-ML': 'Arcilla limosa', ML: 'Limo de baja plasticidad', CH: 'Arcilla de alta plasticidad', MH: 'Limo de alta plasticidad' };
    function sucs(P) {
        var steps = [], F200 = P.F200, grava = 100 - P.F4, arena = P.F4 - P.F200, Aline = 0.73 * (P.LL - 20), above = P.IP > Aline, sym, name;
        function finos() { if (P.IP >= 4 && P.IP <= 7 && above) return 'CL-ML'; return (above && P.IP > 7) ? 'C' : 'M'; }
        if (F200 < 50) {
            steps.push({ q: '¿Pasa No. 200 < 50 %?', a: 'F200 = ' + fmt(F200, 0) + ' % → suelo de partículas gruesas' });
            var isG = grava > arena, L = isG ? 'G' : 'S';
            steps.push({ q: '¿Grava > arena?', a: 'Grava ' + fmt(grava, 0) + ' % ' + (isG ? '>' : '≤') + ' arena ' + fmt(Math.max(arena, 0), 0) + ' % → ' + (isG ? 'GRAVA (G)' : 'ARENA (S)') });
            var gradOK = P.Cu >= (isG ? 4 : 6) && P.Cc >= 1 && P.Cc <= 3, gr = gradOK ? 'W' : 'P', f = finos();
            if (F200 < 5) {
                steps.push({ q: 'Finos < 5 %: ¿bien gradado?', a: 'Cu = ' + fmt(P.Cu, 1) + ', Cc = ' + fmt(P.Cc, 1) + ' → ' + (gradOK ? 'bien gradado (W)' : 'mal gradado (P)') });
                sym = L + gr;
            } else if (F200 > 12) {
                steps.push({ q: 'Finos > 12 %: ¿sobre la línea A?', a: 'IP = ' + fmt(P.IP, 0) + ' ' + (above ? '>' : '≤') + ' 0,73(LL−20) = ' + fmt(Aline, 1) + ' → finos ' + (f === 'C' ? 'arcillosos (C)' : (f === 'M' ? 'limosos (M)' : 'dual CL-ML')) });
                sym = f === 'CL-ML' ? L + 'C-' + L + 'M' : L + f;
            } else {
                steps.push({ q: 'Finos 5–12 %: símbolo doble', a: 'Gradación ' + gr + ' + finos ' + (f === 'C' ? 'C' : 'M') + ' → ' + L + gr + '-' + L + (f === 'C' ? 'C' : 'M') });
                sym = L + gr + '-' + L + (f === 'C' ? 'C' : 'M');
            }
            name = NAMES[sym] || (NAMES[sym.split('-')[0]] + ' con finos (doble símbolo)');
        } else {
            steps.push({ q: '¿Pasa No. 200 ≥ 50 %?', a: 'F200 = ' + fmt(F200, 0) + ' % → suelo fino (limos y arcillas)' });
            var low = P.LL < 50;
            steps.push({ q: '¿LL < 50 %?', a: 'LL = ' + fmt(P.LL, 0) + ' % → plasticidad ' + (low ? 'baja (L)' : 'alta (H)') });
            var ff = finos();
            steps.push({ q: '¿Sobre la línea A?', a: 'IP = ' + fmt(P.IP, 0) + ' vs 0,73(LL−20) = ' + fmt(Aline, 1) + ' → ' + (above && P.IP > 4 ? 'arcilla (C)' : 'limo (M)') });
            sym = low ? (ff === 'CL-ML' ? 'CL-ML' : (ff === 'C' ? 'CL' : 'ML')) : (ff === 'C' ? 'CH' : 'MH');
            name = NAMES[sym];
        }
        steps.push({ q: 'Símbolo SUCS', a: sym + ' — ' + name });
        return { sym: sym, name: name, steps: steps, grava: grava, arena: Math.max(arena, 0), F200: F200 };
    }

    G.register('clasificacion', {
        key: 'clasificacion', num: '07', title: 'Clasificación SUCS', accent: SA, rgb: '129,140,248',
        norma: 'ASTM D2487 · INV E-181', duration: 10, machine: 'Carta de plasticidad y árbol de decisión SUCS',
        glyph: SVG('<circle cx="32" cy="12" r="5"/><path d="M32 17v8M32 25H16M32 25h16M16 25v8M48 25v8"/><circle cx="16" cy="38" r="5"/><circle cx="48" cy="38" r="5"/><path d="M16 43v8M48 43v8"/>'),
        desc: 'Árbol de decisión del SUCS: con granulometría y límites obtienes el símbolo y el nombre del suelo, paso a paso.',
        chips: ['SUCS', 'Línea A', 'F200', 'Símbolo'],
        fields: [
            { id: 'F4', label: '% que pasa No. 4', unit: '%', min: 20, max: 100, step: 1, value: 85, dec: 0 },
            { id: 'F200', label: '% que pasa No. 200', unit: '%', min: 0, max: 100, step: 1, value: 35, dec: 0 },
            { id: 'LL', label: 'Límite líquido LL', unit: '%', min: 20, max: 90, step: 1, value: 38, dec: 0 },
            { id: 'IP', label: 'Índice de plasticidad IP', unit: '%', min: 0, max: 50, step: 1, value: 16, dec: 0 },
            { id: 'Cu', label: 'Coeficiente de uniformidad Cu', unit: '', min: 1, max: 20, step: 0.5, value: 8, dec: 1 },
            { id: 'Cc', label: 'Coeficiente de curvatura Cc', unit: '', min: 0.3, max: 4, step: 0.1, value: 1.5, dec: 1 }
        ],
        readouts: [
            { k: 'g', label: 'Grava', unit: '%', dec: 0 },
            { k: 'a', label: 'Arena', unit: '%', dec: 0 },
            { k: 'f', label: 'Finos', unit: '%', dec: 0 },
            { k: 'sym', label: 'Símbolo', unit: '', dec: 0, f: function (S) { return S.shown >= S.n ? S.sym : '…'; } }
        ],
        fromData: null,
        model: function (P) { var r = sucs(P); return { r: r, pts: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }; },
        at: function (P, M, p) {
            var n = M.r.steps.length, shown = Math.min(n, Math.floor(p * (n + 0.5)) + (p > 0 ? 1 : 0));
            return { g: M.r.grava, a: M.r.arena, f: M.r.F200, shown: p >= 0.98 ? n : shown, n: n, sym: M.r.sym };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Suelo clasificado: ' + S.sym, cls: 'is-done' };
            return { txt: 'Evaluando criterios…', cls: 'is-run' };
        },
        summary: function (P, M) {
            return [
                { label: 'Símbolo SUCS', value: M.r.sym, unit: '', hi: true },
                { label: 'Nombre', value: M.r.name.length > 22 ? M.r.name.slice(0, 22) + '…' : M.r.name, unit: '' },
                { label: 'Línea A: 0,73(LL−20)', value: fmt(0.73 * (P.LL - 20), 1), unit: '' },
                { label: 'Grava / arena / finos', value: fmt(M.r.grava, 0) + ' / ' + fmt(M.r.arena, 0) + ' / ' + fmt(M.r.F200, 0), unit: '%' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, SA, tick * 0.15);
            var steps = M.r.steps, x0 = 36, y0 = 36, cw = 470, ch = 66, gap = 14;
            steps.forEach(function (st, i) {
                var on = i < S.shown, last = i === steps.length - 1, y = y0 + i * (ch + gap);
                var a = on ? 1 : 0.22, lift = on ? 0 : 10;
                ctx.save(); ctx.globalAlpha = a; ctx.translate(0, lift);
                H.rrect(ctx, x0, y, cw, ch, 14); ctx.fillStyle = last && on ? H.rgba(SA, 0.28) : 'rgba(8,14,26,.78)'; ctx.fill();
                ctx.strokeStyle = on ? SA : C.line; ctx.lineWidth = on ? 1.8 : 1; ctx.stroke();
                ctx.beginPath(); ctx.arc(x0 + 30, y + ch / 2, 16, 0, H.TAU); ctx.fillStyle = on ? SA : '#2B3A50'; ctx.fill();
                H.label(ctx, last ? '★' : String(i + 1), x0 + 30, y + ch / 2 + 1, { align: 'center', size: 14, color: '#0B1220', weight: '900' });
                H.label(ctx, st.q, x0 + 58, y + 22, { size: 12, color: SA, weight: '800' });
                H.label(ctx, st.a.length > 62 ? st.a.slice(0, 61) + '…' : st.a, x0 + 58, y + 46, { size: 12.5, color: C.text, weight: '600' });
                ctx.restore();
            });
            /* insignia */
            var bx = 640, by = 190, done = S.shown >= S.n;
            ctx.save(); ctx.globalAlpha = done ? 1 : 0.35;
            var rg = ctx.createRadialGradient(bx, by, 10, bx, by, 120); rg.addColorStop(0, H.rgba(SA, 0.55)); rg.addColorStop(1, H.rgba(SA, 0));
            ctx.fillStyle = rg; ctx.fillRect(bx - 130, by - 130, 260, 260);
            ctx.beginPath(); ctx.arc(bx, by, 86, 0, H.TAU); ctx.fillStyle = '#0B1220'; ctx.fill(); ctx.strokeStyle = SA; ctx.lineWidth = 4; ctx.shadowColor = SA; ctx.shadowBlur = 20; ctx.stroke(); ctx.shadowBlur = 0;
            ctx.restore();
            H.label(ctx, done ? M.r.sym : '?', bx, by - 4, { align: 'center', size: M.r.sym.length > 3 ? 34 : 46, color: '#fff', weight: '900' });
            H.label(ctx, 'SUCS', bx, by + 50, { align: 'center', size: 11, color: SA, weight: '800' });
            if (done) {
                var nm = M.r.name, parts = nm.length > 24 ? [nm.slice(0, nm.lastIndexOf(' ', 24)), nm.slice(nm.lastIndexOf(' ', 24) + 1)] : [nm];
                parts.forEach(function (t, k) { H.label(ctx, t, bx, by + 118 + k * 20, { align: 'center', size: 13.5, color: C.text, weight: '700' }); });
            }
        },
        charts: [
            { W: 480, H: 320, draw: function (ctx, W, Ht, P) { K.plasticity(ctx, W, Ht, P.LL, P.IP, SA); } },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.panelBg(ctx, W, Ht, 'Composición granulométrica');
                    var x0 = 36, bw = W - 72, y0 = 84, bh = 56, r = M.r, parts = [['Grava', r.grava, '#F59E0B'], ['Arena', r.arena, '#FBBF24'], ['Finos', r.F200, '#818CF8']], x = x0, k = clamp(p * 2, 0, 1);
                    H.rrect(ctx, x0, y0, bw, bh, 10); ctx.fillStyle = '#0B1220'; ctx.fill();
                    parts.forEach(function (pt, i) { var w = bw * pt[1] / 100 * k; if (w > 1) { ctx.fillStyle = pt[2]; ctx.fillRect(x, y0, w, bh); if (w > 40) H.label(ctx, fmt(pt[1], 0) + '%', x + w / 2, y0 + bh / 2, { align: 'center', size: 13, color: '#0B1220', weight: '900' }); } x += w; });
                    ctx.strokeStyle = 'rgba(255,255,255,.2)'; ctx.lineWidth = 1; H.rrect(ctx, x0, y0, bw, bh, 10); ctx.stroke();
                    parts.forEach(function (pt, i) { ctx.fillStyle = pt[2]; ctx.fillRect(x0 + i * 120, 168, 12, 12); H.label(ctx, pt[0], x0 + i * 120 + 20, 174, { size: 11.5, color: C.soft, weight: '700' }); });
                    H.label(ctx, 'Cu = ' + fmt(P.Cu, 1) + '   Cc = ' + fmt(P.Cc, 1), x0, 220, { size: 12, color: C.text, weight: '700' });
                    H.label(ctx, 'Pasa No. 4 = ' + fmt(P.F4, 0) + ' %   Pasa No. 200 = ' + fmt(P.F200, 0) + ' %', x0, 246, { size: 12, color: C.soft, weight: '600' });
                    H.label(ctx, 'Línea A: IP = 0,73 (LL − 20)', x0, 280, { size: 11.5, color: '#FBBF24', weight: '700' });
                }
            }
        ]
    });

    /* =====================================================================
       8 · PERMEABILIDAD  (ASTM D2434 / D5084 · INV E-130)
    ===================================================================== */
    var QA = '#22D3EE';
    function fmtT(s) { return s < 90 ? fmt(s, 0) + ' s' : s < 5400 ? fmt(s / 60, 1) + ' min' : s < 172800 ? fmt(s / 3600, 1) + ' h' : fmt(s / 86400, 1) + ' d'; }
    function sci(v) { if (!v) return '0'; var e = Math.floor(Math.log10(Math.abs(v))); return fmt(v / Math.pow(10, e), 2) + '×10' + String(e).replace('-', '⁻').replace(/\d/g, function (d) { return '⁰¹²³⁴⁵⁶⁷⁸⁹'[d]; }); }
    G.register('permeabilidad', {
        key: 'permeabilidad', num: '08', title: 'Permeabilidad', accent: QA, rgb: '34,211,238',
        norma: 'ASTM D2434 / D5084 · INV E-130', duration: 12, machine: 'Permeámetro de carga constante y variable',
        glyph: SVG('<rect x="22" y="22" width="20" height="22" rx="2"/><path d="M10 10h44M16 10v12h6M48 10v12h-6"/><path d="M32 44v6M26 56h12"/>'),
        desc: 'Permeámetro: agua atravesando el suelo, caudal, gradiente i y coeficiente k (carga constante o variable).',
        chips: ['k', 'i = h/L', 'Q = kiA', 'Ley de Darcy'],
        fields: [
            { id: 'tipo', type: 'select', label: 'Tipo de ensayo', value: 'constante', options: [['constante', 'Carga constante (suelos granulares)'], ['variable', 'Carga variable (suelos finos)']] },
            { id: 'lk', label: 'Permeabilidad k (log₁₀ cm/s)', unit: '', min: -8, max: -1, step: 0.25, value: -3, dec: 2 },
            { id: 'h', label: 'Altura de carga h', unit: 'cm', min: 20, max: 100, step: 1, value: 60, dec: 0 },
            { id: 'L', label: 'Longitud de la muestra L', unit: 'cm', min: 5, max: 15, step: 0.5, value: 10, dec: 1 },
            { id: 'D', label: 'Diámetro de la muestra D', unit: 'cm', min: 5, max: 12, step: 0.1, value: 10.2, dec: 1 }
        ],
        readouts: [
            { k: 't', label: 't', unit: '', dec: 0, f: function (S) { return fmtT(S.t); } },
            { k: 'V', label: 'Volumen / altura', unit: '', dec: 0, f: function (S, P) { return P.tipo === 'constante' ? fmt(S.V, 1) + ' mL' : fmt(S.hNow, 1) + ' cm'; } },
            { k: 'i', label: 'Gradiente i', unit: '', dec: 2, f: function (S, P) { return fmt(P.tipo === 'constante' ? P.h / P.L : S.hNow / P.L, 2); } },
            { k: 'Q', label: 'Caudal Q', unit: 'cm³/s', dec: 0, f: function (S) { return sci(S.Q); } },
            { k: 'k', label: 'k', unit: 'cm/s', dec: 0, f: function (S, P) { return sci(Math.pow(10, P.lk)); } }
        ],
        fromData: null,
        model: function (P) {
            var k = Math.pow(10, P.lk), A = Math.PI * P.D * P.D / 4, a = 1, tmax, pts = [], i, Q = k * (P.h / P.L) * A;
            if (P.tipo === 'constante') tmax = 150 / Q; else tmax = 3 * a * P.L / (k * A);
            for (i = 0; i <= 80; i++) { var t = tmax * i / 80; pts.push({ x: t, y: P.tipo === 'constante' ? Q * t : P.h * Math.exp(-k * A * t / (a * P.L)) }); }
            return { k: k, A: A, a: a, tmax: tmax, pts: pts, Q: Q, tau: a * P.L / (k * A) };
        },
        at: function (P, M, p) {
            var t = p * M.tmax, V = M.Q * t, hNow = P.h * Math.exp(-M.k * M.A * t / (M.a * P.L));
            return { t: t, V: V, hNow: hNow, Q: P.tipo === 'constante' ? M.Q : M.k * M.A * hNow / P.L, flow: p > 0 && p < 1 };
        },
        estado: function (S, p) {
            if (p <= 0) return { txt: 'Listo', cls: '' };
            if (p >= 1) return { txt: 'Lecturas completas', cls: 'is-done' };
            return { txt: 'Agua atravesando la muestra', cls: 'is-run' };
        },
        summary: function (P, M) {
            var k = M.k, cls = k >= 1 ? 'Grava' : k >= 1e-3 ? 'Arena limpia' : k >= 1e-5 ? 'Arena fina / limo' : k >= 1e-7 ? 'Limo arcilloso' : 'Arcilla';
            return [
                { label: 'k', value: sci(k), unit: 'cm/s', hi: true },
                { label: 'Suelo típico', value: cls, unit: '', hi: true },
                { label: 'Gradiente i', value: fmt(P.h / P.L, 2), unit: '' },
                { label: 'Área A', value: fmt(M.A, 1), unit: 'cm²' },
                { label: P.tipo === 'constante' ? 'k = QL / (A h t)' : 'k = (aL/At) ln(h₁/h₂)', value: sci(k), unit: 'cm/s' }
            ];
        },
        stage: function (ctx, W, Ht, P, M, S, p, tick) {
            H.stageBg(ctx, W, Ht, QA, tick * 0.15);
            var cx = 330, cy = 250, cw = 120, ch = P.L * 14;
            /* soporte */
            H.steel(ctx, 250, 404, 260, 22, 5, true);
            /* cilindro con suelo */
            H.rrect(ctx, cx - cw / 2, cy - ch / 2 + 20, cw, ch, 6); ctx.fillStyle = 'rgba(186,230,253,.1)'; ctx.fill();
            var sg = ctx.createLinearGradient(0, cy - ch / 2 + 20, 0, cy + ch / 2 + 20); sg.addColorStop(0, '#b78a5c'); sg.addColorStop(1, '#8c6139');
            ctx.fillStyle = sg; ctx.fillRect(cx - cw / 2 + 3, cy - ch / 2 + 28, cw - 6, ch - 16);
            var r = H.rng(2); for (var i = 0; i < 90; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.arc(cx - cw / 2 + 6 + r() * (cw - 12), cy - ch / 2 + 30 + r() * (ch - 18), 1 + r() * 1.6, 0, H.TAU); ctx.fill(); }
            ctx.fillStyle = '#d3dbe8'; ctx.fillRect(cx - cw / 2 + 3, cy - ch / 2 + 20, cw - 6, 8); ctx.fillRect(cx - cw / 2 + 3, cy + ch / 2 + 12, cw - 6, 8);
            ctx.strokeStyle = 'rgba(224,242,254,.7)'; ctx.lineWidth = 2.4; ctx.strokeRect(cx - cw / 2, cy - ch / 2 + 20, cw, ch);
            H.label(ctx, 'L = ' + fmt(P.L, 1) + ' cm', cx + cw / 2 + 12, cy + 20, { size: 11, color: C.soft, weight: '700' });
            /* depósito / bureta */
            var yTop = 70;
            if (P.tipo === 'constante') {
                H.rrect(ctx, cx - 100, yTop, 200, 74, 8); ctx.fillStyle = 'rgba(34,211,238,.35)'; ctx.fill(); ctx.strokeStyle = 'rgba(224,242,254,.7)'; ctx.lineWidth = 2; ctx.stroke();
                H.label(ctx, 'nivel constante (rebose)', cx, yTop + 38, { align: 'center', size: 11, color: '#e0f7ff', weight: '800' });
                ctx.fillStyle = 'rgba(34,211,238,.6)'; ctx.fillRect(cx - 12, yTop + 74, 24, cy - ch / 2 + 20 - yTop - 74);
                ctx.fillStyle = 'rgba(34,211,238,.5)'; ctx.fillRect(cx + 100, yTop + 14, 40, 8); ctx.fillRect(cx + 132, yTop + 14, 8, 44);
                if (S.flow) for (var d = 0; d < 3; d++) { var dy = ((tick * 1.6 + d * 15) % 46); ctx.fillStyle = '#e0f7ff'; ctx.beginPath(); ctx.arc(cx + 136, yTop + 60 + dy, 2.4, 0, H.TAU); ctx.fill(); }
                H.label(ctx, 'h = ' + fmt(P.h, 0) + ' cm', cx - 112, cy - ch / 2 - 10, { align: 'right', size: 11, color: QA, weight: '800' });
            } else {
                var bx = cx - 130, bt = 60, bb = cy - ch / 2 + 20, bh = bb - bt;
                H.rrect(ctx, bx - 12, bt, 24, bh, 8); ctx.fillStyle = 'rgba(186,230,253,.1)'; ctx.fill(); ctx.strokeStyle = 'rgba(224,242,254,.7)'; ctx.lineWidth = 2; ctx.stroke();
                var lv = bb - (S.hNow / P.h) * (bh - 20); ctx.fillStyle = 'rgba(34,211,238,.65)'; ctx.fillRect(bx - 10, lv, 20, bb - lv);
                for (var g = 0; g <= 5; g++) { ctx.strokeStyle = 'rgba(224,242,254,.5)'; ctx.beginPath(); ctx.moveTo(bx + 12, bb - g * (bh - 20) / 5); ctx.lineTo(bx + 20, bb - g * (bh - 20) / 5); ctx.stroke(); }
                H.label(ctx, 'h = ' + fmt(S.hNow, 1) + ' cm', bx + 26, lv, { size: 11.5, color: QA, weight: '800' });
                ctx.strokeStyle = 'rgba(34,211,238,.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(bx, bb); ctx.lineTo(bx, bb + 14); ctx.lineTo(cx, bb + 14); ctx.lineTo(cx, bb + 2); ctx.stroke();
                H.label(ctx, 'bureta (área a)', bx, bt - 12, { align: 'center', size: 10.5, color: C.mute });
            }
            /* probeta graduada */
            var px = 600, pb = 396, pt = 230, vmax = 150;
            H.rrect(ctx, px - 30, pt, 60, pb - pt, 8); ctx.fillStyle = 'rgba(186,230,253,.08)'; ctx.fill(); ctx.strokeStyle = 'rgba(224,242,254,.7)'; ctx.lineWidth = 2; ctx.stroke();
            var vv = P.tipo === 'constante' ? clamp(S.V, 0, vmax) : clamp((P.h - S.hNow) * M.a, 0, vmax);
            if (P.tipo === 'variable') vv = clamp(M.a * (P.h - S.hNow) * 1.0, 0, vmax);
            var vh = vv / vmax * (pb - pt - 10); ctx.fillStyle = 'rgba(34,211,238,.65)'; ctx.fillRect(px - 28, pb - 2 - vh, 56, vh);
            for (var m = 0; m <= 5; m++) { ctx.strokeStyle = 'rgba(224,242,254,.5)'; ctx.beginPath(); ctx.moveTo(px + 30, pb - m * (pb - pt - 10) / 5); ctx.lineTo(px + 40, pb - m * (pb - pt - 10) / 5); ctx.stroke(); H.label(ctx, String(m * 30), px + 44, pb - m * (pb - pt - 10) / 5, { size: 9, color: C.mute }); }
            H.label(ctx, fmt(vv, 1) + ' mL', px, pt - 12, { align: 'center', size: 12.5, color: QA, weight: '800' });
            ctx.strokeStyle = 'rgba(34,211,238,.6)'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(cx, cy + ch / 2 + 20); ctx.lineTo(cx, cy + ch / 2 + 50); ctx.lineTo(px, cy + ch / 2 + 50); ctx.lineTo(px, pt - 6); ctx.stroke();
            if (S.flow) for (var e = 0; e < 3; e++) { var ey = ((tick * 1.2 + e * 12) % 36); ctx.fillStyle = '#e0f7ff'; ctx.beginPath(); ctx.arc(px, pt - 4 + ey * 0.4, 2.2, 0, H.TAU); ctx.fill(); }
            H.label(ctx, 'Ley de Darcy: Q = k · i · A', 80, 400, { size: 12, color: QA, weight: '800' });
        },
        charts: [
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    var c = P.tipo === 'constante';
                    H.plot(ctx, W, Ht, {
                        title: c ? 'Volumen recolectado vs tiempo' : 'Descenso de la carga h(t)', xlabel: 't (' + (M.tmax < 5400 ? 's' : M.tmax < 172800 ? 'h' : 'días') + ')', ylabel: c ? 'V (mL)' : 'h (cm)',
                        xmin: 0, xmax: M.tmax, ymin: 0, ymax: c ? 160 : Math.ceil(P.h * 1.05),
                        xticks: [0, M.tmax / 4, M.tmax / 2, 3 * M.tmax / 4, M.tmax], xfmt: function (v) { return M.tmax < 5400 ? Math.round(v) : M.tmax < 172800 ? fmt(v / 3600, 1) : fmt(v / 86400, 1); },
                        pts: M.pts, progress: Math.max(0.001, p), color: QA
                    });
                }
            },
            {
                W: 480, H: 320,
                draw: function (ctx, W, Ht, P, M, S, p) {
                    H.panelBg(ctx, W, Ht, 'k típica según el suelo (cm/s)');
                    var rows = [['Grava', 0, 2], ['Arena limpia', -3, 0], ['Arena fina / limo', -5, -3], ['Limo arcilloso', -7, -5], ['Arcilla', -10, -7]], x0 = 128, x1 = W - 24;
                    function X(v) { return x0 + (v + 10) / 12 * (x1 - x0); }
                    ctx.strokeStyle = 'rgba(167,180,200,.12)'; ctx.lineWidth = 1;
                    [-10, -8, -6, -4, -2, 0, 2].forEach(function (v) { ctx.beginPath(); ctx.moveTo(X(v), 56); ctx.lineTo(X(v), 262); ctx.stroke(); H.label(ctx, '1e' + v, X(v), 276, { align: 'center', size: 9, color: C.mute }); });
                    rows.forEach(function (r, i) { var y = 76 + i * 40, hit = P.lk >= r[1] && P.lk <= r[2]; H.label(ctx, r[0], 12, y, { size: 11, color: hit ? '#fff' : C.soft, weight: hit ? '800' : '600' });
                        H.rrect(ctx, X(r[1]), y - 11, X(r[2]) - X(r[1]), 22, 8); ctx.fillStyle = H.rgba(QA, hit ? 0.8 : 0.3); ctx.fill(); });
                    var kx = X(P.lk); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(kx, 54); ctx.lineTo(kx, 264); ctx.stroke(); ctx.setLineDash([]);
                    H.label(ctx, 'k = ' + sci(M.k), kx, 44, { align: 'center', size: 11.5, color: '#fff', weight: '800' });
                }
            }
        ]
    });
})(window);
