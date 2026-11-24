/* =========================================================
   GeoMetrics — Diseño de Mezclas: simuladores
   Requiere mezclas-calc.js y mezclas.js
   Apertura: la lista de tarjetas se reemplaza por un panel con
   [parámetros | animación | gráfica en vivo] + fila de resultados.
========================================================= */
(function (root) {
    'use strict';
    var M = root.Mezclas;
    if (!M || !M.C) { if (root.console) console.error('Simuladores DM: falta mezclas.js'); return; }
    var C = M.C, U = M.util, D = M.draw, COL = D.COL;
    var $ = U.$, fmt = U.fmt, esc = U.esc;

    /* ---------- utilidades de dibujo ---------- */
    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
    function eOut(t) { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); }
    function eIO(t) { t = clamp(t, 0, 1); return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function seeded(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
    function bgStage(ctx, W, H) {
        var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#0b1624'); g.addColorStop(1, '#13263d');
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    }
    function text(ctx, t, x, y, o) {
        o = o || {}; ctx.font = (o.bold ? 'bold ' : '') + (o.size || 12) + 'px Arial, sans-serif';
        ctx.fillStyle = o.color || COL.txt; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'alphabetic'; ctx.fillText(t, x, y);
    }
    function wrap(ctx, t, x, y, maxW, lh, o) {
        var words = String(t).split(' '), line = '', yy = y;
        ctx.font = (o && o.bold ? 'bold ' : '') + ((o && o.size) || 12) + 'px Arial, sans-serif';
        words.forEach(function (w) {
            var test = line ? line + ' ' + w : w;
            if (ctx.measureText(test).width > maxW && line) { text(ctx, line, x, yy, o); line = w; yy += lh; } else line = test;
        });
        if (line) text(ctx, line, x, yy, o);
        return yy;
    }
    function rr(ctx, x, y, w, h, r) {
        ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }

    /** Ejes y cuadrícula genéricos. o = {x:[min,max,step,label], y:[min,max,step,label]} → { X(), Y(), L,T,w,h } */
    function axes(ctx, W, H, o) {
        var L = 46, R = 14, T = 14, B = 38, w = W - L - R, h = H - T - B;
        function X(v) { return L + (v - o.x[0]) / (o.x[1] - o.x[0]) * w; }
        function Y(v) { return T + h - (v - o.y[0]) / (o.y[1] - o.y[0]) * h; }
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
        if (o.bands) o.bands.forEach(function (b) { ctx.fillStyle = b.c; ctx.fillRect(L, Y(b.to), w, Y(b.from) - Y(b.to)); if (b.l) text(ctx, b.l, W - R - 4, Y((b.from + b.to) / 2) + 4, { size: 10, align: 'right', color: 'rgba(255,255,255,0.45)' }); });
        ctx.lineWidth = 1; ctx.font = '11px Arial'; var v;
        for (v = o.x[0]; v <= o.x[1] + 1e-9; v += o.x[2]) { ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + h); ctx.stroke(); text(ctx, String(Math.round(v * 100) / 100), X(v), T + h + 15, { size: 11, align: 'center' }); }
        for (v = o.y[0]; v <= o.y[1] + 1e-9; v += o.y[2]) { ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + w, Y(v)); ctx.stroke(); text(ctx, String(Math.round(v * 100) / 100), L - 6, Y(v) + 4, { size: 11, align: 'right' }); }
        ctx.strokeStyle = COL.axis; ctx.strokeRect(L, T, w, h);
        text(ctx, o.x[3], L + w / 2, H - 5, { size: 11, align: 'center' });
        ctx.save(); ctx.translate(11, T + h / 2); ctx.rotate(-Math.PI / 2); text(ctx, o.y[3], 0, 0, { size: 11, align: 'center' }); ctx.restore();
        return { X: X, Y: Y, L: L, T: T, w: w, h: h };
    }
    function curve(ctx, A, pts, color, width, dash) {
        ctx.strokeStyle = color; ctx.lineWidth = width || 2; ctx.setLineDash(dash || []); ctx.beginPath();
        pts.forEach(function (p, i) { var x = A.X(p[0]), y = A.Y(p[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1;
    }
    function dot(ctx, x, y, r, color, ring) {
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
        if (ring) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.lineWidth = 1; }
    }

    /* ---------- controles ---------- */
    function rng(id, label, min, max, step, value, unit) {
        return '<label class="dm-field dm-range" for="' + id + '"><span class="dm-lab">' + label + ' <output id="' + id + 'V">' + value + (unit ? ' ' + unit : '') + '</output></span>' +
            '<input type="range" id="' + id + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '" data-unit="' + (unit || '') + '"></label>';
    }
    function rv(id) { return parseFloat($(id).value); }

    /* =========================================================
       SIMULADOR 1 — REVENIMIENTO
    ========================================================= */
    var REV_DOTS = (function () { var r = seeded(7), a = []; for (var i = 0; i < 170; i++) a.push([r() * 2 - 1, r(), r(), r()]); return a; })();
    function slumpShape(s, falla, q) {
        var h = 300 - s, rp = 50 + 0.35 * s;
        if (falla === 'colapso') rp = 50 + 0.5 * s;
        var K = 17500 * 300 / Math.max(h, 25), disc = 4 * K - 3 * rp * rp;
        var Rp = (-rp + Math.sqrt(Math.max(disc, 0))) / 2;
        return { h: h, rp: rp, Rp: Rp, dx: falla === 'cortante' ? s * 0.55 * q : 0 };
    }
    var REV = {
        id: 'rev', icon: '🥣', titulo: 'Revenimiento', norma: 'NTC 396 · ASTM C143', rs: 0.92, rg: 0.8, dur: 8000, idle: 0,
        desc: 'Cambia el agua de mezclado y el TMN y observa cuánto se asienta el concreto al levantar el cono de Abrams.',
        graphTitle: 'Asentamiento vs. agua de mezclado',
        learn: '<p>Cada <b>5 kg/m³</b> de agua suben el asentamiento ≈ 25 mm. La curva sale de interpolar la tabla 6.3.3 de ACI 211.1 para el TMN elegido. Para ganar trabajabilidad <b>sin</b> perder resistencia hay que subir el cemento junto con el agua (mantener a/c) o usar aditivo.</p><p>Si el cemento es poco para esa agua (a/c &gt; 0.75) la mezcla pierde cohesión y puede fallar por <b>cortante</b>; con asentamientos ≥ 200 mm hay <b>colapso</b>. Modelo didáctico, no sustituye el ensayo.</p>',
        controls: function () {
            return rng('rvAgua', 'Agua de mezclado', 140, 280, 1, 190, 'kg/m³') + rng('rvCem', 'Cemento', 250, 550, 5, 400, 'kg/m³') +
                U.select('rvTmn', 'TMN del agregado', [9.5, 12.5, 19, 25, 37.5, 50, 75].map(function (v) { return [v, v + ' mm']; }), 19);
        },
        read: function () {
            var P = { agua: rv('rvAgua'), cem: rv('rvCem'), tmn: parseFloat($('rvTmn').value) };
            P.slump = C.slumpDesdeAgua(P.agua, P.tmn, false); P.ac = P.agua / P.cem; P.fc = C.resistenciaPorAC(P.ac);
            P.falla = P.slump >= 200 ? 'colapso' : (P.ac > 0.75 && P.slump >= 50 ? 'cortante' : 'verdadero');
            return P;
        },
        fases: function (p) { return { fill: clamp(p / 0.12, 0, 1), lift: eIO((p - 0.12) / 0.2), q: eOut((p - 0.32) / 0.68) }; },
        draw: function (ctx, W, H, p, P) {
            bgStage(ctx, W, H);
            var f = REV.fases(p), sc = (H * 0.6) / 300, gy = H * 0.88, cx = W * 0.56;
            // placa base y piso
            ctx.fillStyle = '#1b2b40'; ctx.fillRect(0, gy, W, H - gy);
            ctx.fillStyle = '#6a7b8e'; ctx.fillRect(cx - 190 * sc, gy, 380 * sc, 6);
            // regla vertical
            var rx = 34; ctx.strokeStyle = COL.axis; ctx.beginPath(); ctx.moveTo(rx, gy); ctx.lineTo(rx, gy - 300 * sc); ctx.stroke();
            for (var mm = 0; mm <= 300; mm += 50) { ctx.beginPath(); ctx.moveTo(rx - 5, gy - mm * sc); ctx.lineTo(rx + 5, gy - mm * sc); ctx.stroke(); text(ctx, mm + '', rx + 9, gy - mm * sc + 4, { size: 10, color: 'rgba(255,255,255,0.55)' }); }
            text(ctx, 'mm', rx - 12, gy - 300 * sc - 8, { size: 10, color: 'rgba(255,255,255,0.55)' });
            // concreto
            var conc = function (path) { ctx.fillStyle = '#8b7a58'; ctx.fill(path); };
            function dots(h0, rp, Rp, dx) {
                var k = sc; REV_DOTS.forEach(function (d) {
                    var v = d[1], hw = (Rp + (rp - Rp) * v) * k, x = cx + d[0] * hw * 0.92 + dx * v * k, y = gy - v * h0 * k;
                    ctx.fillStyle = d[2] > 0.5 ? '#5e5036' : '#b9a67b'; ctx.beginPath(); ctx.arc(x, y, 1 + d[3] * 1.8, 0, 6.283); ctx.fill();
                });
            }
            var coneAlpha = 1 - f.lift, liftMm = f.lift * 430;
            if (p < 0.32) {
                // cono lleno hasta f.fill
                var hh = 300 * f.fill, wt = 100 - 50 * (hh / 300);
                ctx.save(); ctx.beginPath(); ctx.moveTo(cx - 100 * sc, gy); ctx.lineTo(cx - wt * sc, gy - hh * sc); ctx.lineTo(cx + wt * sc, gy - hh * sc); ctx.lineTo(cx + 100 * sc, gy); ctx.closePath();
                ctx.fillStyle = '#8b7a58'; ctx.fill(); ctx.clip(); dots(hh, wt, 100, 0); ctx.restore();
                if (f.fill < 1) for (var k2 = 1; k2 <= 2; k2++) if (f.fill > k2 / 3) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([3, 3]); var lw = 100 - 50 * (k2 / 3); ctx.beginPath(); ctx.moveTo(cx - lw * sc, gy - 100 * k2 * sc); ctx.lineTo(cx + lw * sc, gy - 100 * k2 * sc); ctx.stroke(); ctx.setLineDash([]); }
                // molde
                ctx.globalAlpha = Math.max(0, coneAlpha); ctx.strokeStyle = '#c9d4df'; ctx.lineWidth = 2.5; ctx.beginPath();
                ctx.moveTo(cx - 100 * sc, gy - liftMm * sc); ctx.lineTo(cx - 50 * sc, gy - (300 + liftMm) * sc); ctx.lineTo(cx + 50 * sc, gy - (300 + liftMm) * sc); ctx.lineTo(cx + 100 * sc, gy - liftMm * sc); ctx.closePath(); ctx.stroke();
                ctx.fillStyle = 'rgba(201,212,223,0.10)'; ctx.fill();
                ctx.fillStyle = '#c9d4df'; ctx.fillRect(cx - 100 * sc - 14, gy - liftMm * sc - 5, 14, 5); ctx.fillRect(cx + 100 * sc, gy - liftMm * sc - 5, 14, 5);
                ctx.lineWidth = 1; ctx.globalAlpha = 1;
                // varilla apisonando
                if (p < 0.12) {
                    var golpe = Math.sin(p / 0.12 * 75 * Math.PI) * 0.5 + 0.5, ry = gy - (300 * f.fill + 20 + 60 * (1 - golpe)) * sc;
                    ctx.strokeStyle = '#e8edf2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, ry); ctx.lineTo(cx, ry - 120 * sc); ctx.stroke(); ctx.lineWidth = 1;
                }
            } else {
                var q = f.q, s = P.slump * q, sh = slumpShape(s, P.falla, q), h = sh.h, rp = sh.rp, Rp = sh.Rp, dx = sh.dx;
                var path = new Path2D();
                path.moveTo(cx - Rp * sc, gy);
                path.bezierCurveTo(cx - Rp * sc * 1.05, gy - h * sc * 0.35, cx + (-rp * 1.1 + dx) * sc, gy - h * sc * 0.8, cx + (-rp + dx) * sc, gy - h * sc);
                path.quadraticCurveTo(cx + dx * sc, gy - h * sc - 7 * (1 - q * 0.6), cx + (rp + dx) * sc, gy - h * sc);
                path.bezierCurveTo(cx + (rp * 1.1 + dx) * sc, gy - h * sc * 0.8, cx + Rp * sc * 1.05, gy - h * sc * 0.35, cx + Rp * sc, gy);
                path.closePath();
                ctx.save(); conc(path); ctx.clip(path); dots(h, rp, Rp, dx); ctx.restore();
                ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.stroke(path);
                // varilla de referencia sobre el borde del molde (300 mm) y cota
                var yr = gy - 300 * sc;
                ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(rx, yr); ctx.lineTo(W - 12, yr); ctx.stroke(); ctx.setLineDash([]);
                ctx.fillStyle = '#e8edf2'; rr(ctx, cx - 150 * sc, yr - 3, 300 * sc, 6, 3); ctx.fill();
                var yt = gy - h * sc - 7 * (1 - q * 0.6) + 3;
                if (s > 1) {
                    ctx.strokeStyle = COL.rojo; ctx.fillStyle = COL.rojo; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + dx * sc, yr + 4); ctx.lineTo(cx + dx * sc, yt - 3); ctx.stroke();
                    ctx.beginPath(); ctx.moveTo(cx + dx * sc, yt); ctx.lineTo(cx + dx * sc - 5, yt - 9); ctx.lineTo(cx + dx * sc + 5, yt - 9); ctx.closePath(); ctx.fill(); ctx.lineWidth = 1;
                    text(ctx, fmt(s, 0) + ' mm', cx + dx * sc + 12, Math.max((yr + yt) / 2 + 4, yr + 26), { bold: true, size: 13, color: '#ffb3ae' });
                }
            }
            var cap = p < 0.12 ? '1 · Llenado en 3 capas — ' + Math.min(75, Math.floor(p / 0.12 * 75)) + ' de 75 golpes' : (p < 0.32 ? '2 · Se levanta el cono en vertical (5 ± 2 s)' : (p < 0.995 ? '3 · El concreto se asienta' : '3 · Medición: desde la varilla al centro de la muestra'));
            text(ctx, cap, 12, 22, { bold: true, size: 13 });
            if (p >= 0.995) text(ctx, 'Falla: ' + (P.falla === 'verdadero' ? 'asentamiento verdadero (válido)' : (P.falla === 'cortante' ? 'cortante (ensayo no válido, repetir)' : 'colapso')), 12, 42, { size: 12, color: P.falla === 'verdadero' ? COL.ok : COL.warn });
        },
        graph: function (ctx, W, H, p, P) {
            var A = axes(ctx, W, H, { x: [140, 280, 20, 'Agua de mezclado (kg/m³)'], y: [0, 250, 50, 'Asentamiento (mm)'],
                bands: [{ from: 0, to: 50, c: 'rgba(255,255,255,0.03)', l: 'seca' }, { from: 50, to: 100, c: 'rgba(77,143,217,0.07)', l: 'plástica' }, { from: 100, to: 150, c: 'rgba(255,255,255,0.03)', l: 'blanda' }, { from: 150, to: 250, c: 'rgba(77,143,217,0.07)', l: 'fluida' }] });
            var pts = []; for (var a = 140; a <= 280; a += 2) pts.push([a, C.slumpDesdeAgua(a, P.tmn, false)]);
            curve(ctx, A, pts, COL.acc, 2.5);
            var j = C.ACI.tmn.indexOf(P.tmn);
            [[0, 37.5], [1, 87.5], [2, 162.5]].forEach(function (r) {
                var w = C.ACI.agua.sin[r[0]][j]; if (w == null) return;
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(A.X(w), A.Y(r[1]), 4, 0, 6.283); ctx.stroke(); ctx.lineWidth = 1;
            });
            var q = p < 0.32 ? 0 : REV.fases(p).q, cur = P.slump * q;
            ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.moveTo(A.X(P.agua), A.T + A.h); ctx.lineTo(A.X(P.agua), A.Y(P.slump)); ctx.stroke(); ctx.setLineDash([]);
            dot(ctx, A.X(P.agua), A.Y(P.slump), 4, 'rgba(224,112,107,0.45)');
            dot(ctx, A.X(P.agua), A.Y(cur), 6, COL.rojo, true);
            text(ctx, '○ tabla ACI 211.1', A.L + 8, A.T + 16, { size: 10, color: COL.txt });
        },
        chips: function (p, P) {
            var q = p < 0.32 ? 0 : REV.fases(p).q, s = P.slump * q;
            var ph = p <= 0 ? 'Listo' : (p < 0.12 ? 'Llenando' : (p < 0.32 ? 'Levantando cono' : (p < 0.995 ? 'Asentándose' : 'Finalizado')));
            return [{ l: 'Asentamiento', v: fmt(s, 0) + ' mm', big: true }, { l: 'Consistencia (final)', v: C.claseAsentamiento(P.slump).split(' (')[0] }, { l: 'Forma de falla', v: P.falla === 'verdadero' ? 'Verdadero' : (P.falla === 'cortante' ? 'Cortante' : 'Colapso'), tone: P.falla === 'verdadero' ? 'ok' : 'warn' },
                { l: 'a/c', v: fmt(P.ac, 3), tone: P.ac > 0.75 ? 'warn' : '' }, { l: "f′c 28 d (est.)", v: fmt(P.fc, 0) + ' MPa' }, { l: 'Estado', v: ph }];
        }
    };

    /* =========================================================
       SIMULADOR 2 — COMPRESIÓN DE CILINDROS
    ========================================================= */
    var CRACKS = (function () { var r = seeded(23), a = []; for (var i = 0; i < 9; i++) a.push([r(), r(), (r() - 0.5) * 0.7]); return a; })();
    var SPALL = (function () { var r = seeded(41), a = []; for (var i = 0; i < 22; i++) a.push([r() * 2 - 1, r(), r() * 0.8 + 0.2, r()]); return a; })();
    var LOAD_END = 0.8;
    function compState(p, P) {
        if (p <= LOAD_END) { var s = P.fc * (p / LOAD_END); return { s: s, e: P.e0 * (1 - Math.sqrt(Math.max(0, 1 - s / P.fc))), q: 0 }; }
        var q = (p - LOAD_END) / (1 - LOAD_END); return { s: P.fc * (1 - 0.85 * eOut(q)), e: P.e0 + 0.0016 * q, q: q };
    }
    var COMP = {
        id: 'comp', icon: '🏛️', titulo: 'Compresión de cilindros', norma: 'NTC 673 · ASTM C39', rs: 0.92, rg: 0.8, dur: 9000, idle: 0,
        desc: 'Carga un cilindro hasta la falla: cambia la relación a/c, la edad y la velocidad de carga y mira la curva esfuerzo–deformación.',
        graphTitle: 'Esfuerzo – deformación (σ–ε)',
        learn: '<p>La resistencia a 28 d sale de la curva a/c → f′cr de ACI 211.1; la edad la escala con la relación hiperbólica de ACI 209R; la deformación sigue una parábola con E<sub>c</sub> = 4700 √f′c. La norma exige cargar a <b>0.25 ± 0.05 MPa/s</b>: cargar más rápido «aumenta» la resistencia aparente (modelo ≈ +6 % por década de velocidad).</p><p>Los concretos de alta resistencia fallan de forma más frágil (fractura diagonal, tipo 4) que los normales (conos, tipo 1).</p>',
        controls: function () {
            return rng('cmAc', 'Relación a/c', 0.3, 0.8, 0.01, 0.5, '') + rng('cmEdad', 'Edad de ensayo', 1, 90, 1, 28, 'd') +
                U.select('cmD', 'Diámetro del cilindro', [[100, 'Ø 100 × 200 mm'], [150, 'Ø 150 × 300 mm']], 150) +
                U.select('cmRate', 'Velocidad de carga', [[0.15, '0.15 MPa/s (lenta)'], [0.25, '0.25 MPa/s (norma)'], [0.5, '0.50 MPa/s'], [1, '1.0 MPa/s (rápida)']], 0.25);
        },
        read: function () {
            var P = { ac: rv('cmAc'), edad: rv('cmEdad'), d: parseFloat($('cmD').value), rate: parseFloat($('cmRate').value) };
            var m = C.modeloCompresion(P.ac, P.edad, P.rate); for (var k in m) P[k] = m[k];
            P.A = Math.PI * P.d * P.d / 4; P.Pmax = P.fc * P.A / 1000;
            var rngs = [200, 300, 500, 750, 1000, 1500, 2000, 3000]; P.dial = rngs.filter(function (r) { return r >= P.Pmax * 1.1; })[0] || 3000;
            P.tipo = P.fc < 40 ? 'Tipo 1 · conos bien formados' : 'Tipo 4 · fractura diagonal (frágil)'; P.rateOk = Math.abs(P.rate - 0.25) <= 0.05;
            return P;
        },
        draw: function (ctx, W, H, p, P) {
            bgStage(ctx, W, H);
            var st = compState(p, P), xs = W * 0.64, hs = H * 0.42, ws = hs / 2, yb = H * 0.79;
            var shorten = st.e * hs * 30;
            // bastidor
            ctx.fillStyle = '#2b3d54'; ctx.fillRect(W * 0.12, H * 0.07, 14, yb + 28 - H * 0.07); ctx.fillRect(W * 0.9 - 14, H * 0.07, 14, yb + 28 - H * 0.07);
            ctx.fillStyle = '#3b516c'; ctx.fillRect(W * 0.08, H * 0.07, W * 0.84, 24);
            ctx.fillStyle = '#3b516c'; ctx.fillRect(W * 0.08, yb + 14, W * 0.84, 18);
            // pistón y plato superior
            var yTop = yb - hs - 12 + shorten;
            ctx.fillStyle = '#7d8da1'; ctx.fillRect(xs - 6, H * 0.07 + 24, 12, yTop - H * 0.07 - 24);
            ctx.fillStyle = '#5b6b7d'; ctx.fillRect(xs - ws * 0.9, yTop, ws * 1.8, 12);
            ctx.fillStyle = '#5b6b7d'; ctx.fillRect(xs - ws * 0.9, yb, ws * 1.8, 14);
            // probeta
            var y0 = yb - hs + shorten, hh = hs - shorten;
            var g = ctx.createLinearGradient(xs - ws / 2, 0, xs + ws / 2, 0); g.addColorStop(0, '#8d9399'); g.addColorStop(0.5, '#b7bcc1'); g.addColorStop(1, '#868c92');
            var bulge = st.q > 0 ? ws * 0.04 * Math.min(1, st.q * 3) : ws * 0.01 * (st.e / P.e0);
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(xs - ws / 2, y0); ctx.quadraticCurveTo(xs - ws / 2 - bulge, y0 + hh / 2, xs - ws / 2, y0 + hh); ctx.lineTo(xs + ws / 2, y0 + hh);
            ctx.quadraticCurveTo(xs + ws / 2 + bulge, y0 + hh / 2, xs + ws / 2, y0); ctx.closePath(); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.28)'; ctx.fillRect(xs - ws / 2, y0, ws, 4); ctx.fillRect(xs - ws / 2, y0 + hh - 4, ws, 4);
            // grietas
            if (st.q > 0) {
                var cp = Math.min(1, st.q * 3.5); ctx.strokeStyle = '#2b2b2b'; ctx.lineWidth = 1.6;
                ctx.beginPath(); ctx.moveTo(xs - ws / 2, y0 + 3); ctx.lineTo(lerp(xs - ws / 2, xs - ws * 0.1, cp), lerp(y0 + 3, y0 + hh * 0.5, cp)); ctx.moveTo(xs + ws / 2, y0 + 3); ctx.lineTo(lerp(xs + ws / 2, xs + ws * 0.1, cp), lerp(y0 + 3, y0 + hh * 0.5, cp));
                ctx.moveTo(xs - ws / 2, y0 + hh - 3); ctx.lineTo(lerp(xs - ws / 2, xs - ws * 0.1, cp), lerp(y0 + hh - 3, y0 + hh * 0.5, cp)); ctx.moveTo(xs + ws / 2, y0 + hh - 3); ctx.lineTo(lerp(xs + ws / 2, xs + ws * 0.1, cp), lerp(y0 + hh - 3, y0 + hh * 0.5, cp)); ctx.stroke();
                ctx.lineWidth = 1;
                CRACKS.forEach(function (c) { var x = xs - ws / 2 + c[0] * ws, ya = y0 + c[1] * hh * 0.5, len = hh * 0.35 * cp; ctx.beginPath(); ctx.moveTo(x, ya); ctx.lineTo(x + c[2] * len, ya + len); ctx.stroke(); });
                SPALL.forEach(function (sp) {
                    var t = clamp((st.q - 0.05) / 0.9, 0, 1); if (t <= 0) return;
                    var x = xs + sp[0] * (ws / 2 + 40 * sp[2] * t), y = y0 + hh * 0.3 + sp[1] * hh * 0.5 + 120 * t * t * (0.4 + sp[2]);
                    ctx.globalAlpha = 1 - t * 0.8; ctx.fillStyle = '#9aa0a6'; ctx.fillRect(x, y, 2 + sp[3] * 4, 2 + sp[3] * 3); ctx.globalAlpha = 1;
                });
            }
            // carga: flechas
            if (st.s > 0 && st.q === 0) { ctx.strokeStyle = 'rgba(224,112,107,' + (0.4 + 0.6 * st.s / P.fc) + ')'; ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2;
                [-0.3, 0, 0.3].forEach(function (o) { var x = xs + o * ws; ctx.beginPath(); ctx.moveTo(x, H * 0.07 + 30); ctx.lineTo(x, yTop - 8); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, yTop - 2); ctx.lineTo(x - 4, yTop - 10); ctx.lineTo(x + 4, yTop - 10); ctx.fill(); }); ctx.lineWidth = 1; }
            text(ctx, 'Ø ' + P.d + ' × ' + P.d * 2 + ' mm', xs, yb + 50 > H - 4 ? H - 6 : yb + 52, { size: 11, align: 'center' });
            // manómetro
            var gx = W * 0.28, gy = H * 0.38, gr = Math.min(W * 0.17, H * 0.17), a0 = 0.75 * Math.PI, sw = 1.5 * Math.PI;
            ctx.fillStyle = '#0a1420'; ctx.beginPath(); ctx.arc(gx, gy, gr + 6, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#7d8da1'; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 1;
            for (var i = 0; i <= 10; i++) { var a = a0 + sw * i / 10, c = Math.cos(a), s = Math.sin(a); ctx.strokeStyle = COL.txt; ctx.beginPath(); ctx.moveTo(gx + c * (gr - (i % 5 ? 5 : 9)), gy + s * (gr - (i % 5 ? 5 : 9))); ctx.lineTo(gx + c * gr, gy + s * gr); ctx.stroke(); if (i % 2 === 0) text(ctx, String(Math.round(P.dial * i / 10)), gx + c * (gr - 20), gy + s * (gr - 20) + 3, { size: 9, align: 'center' }); }
            var Pk = st.s * P.A / 1000, Pmaxn = Math.min(1, Pk / P.dial), an = a0 + sw * Pmaxn;
            if (st.q > 0) { var apk = a0 + sw * Math.min(1, P.Pmax / P.dial); ctx.strokeStyle = 'rgba(224,112,107,0.5)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(apk) * (gr - 6), gy + Math.sin(apk) * (gr - 6)); ctx.stroke(); ctx.setLineDash([]); }
            ctx.strokeStyle = COL.rojo; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + Math.cos(an) * (gr - 6), gy + Math.sin(an) * (gr - 6)); ctx.stroke(); ctx.lineWidth = 1;
            dot(ctx, gx, gy, 4, '#c9d4df');
            text(ctx, 'kN', gx, gy + gr * 0.45, { size: 10, align: 'center' });
            text(ctx, fmt(Pk, 1) + ' kN', gx, gy + gr + 26, { bold: true, size: 14, align: 'center' });
            text(ctx, P.rate.toFixed(2) + ' MPa/s' + (P.rateOk ? '' : ' · fuera de norma'), gx, gy + gr + 44, { size: 11, align: 'center', color: P.rateOk ? COL.txt : COL.warn });
            if (st.q > 0.05) text(ctx, '¡FALLA!', xs, H * 0.07 + 52, { bold: true, size: 16, align: 'center', color: '#ffb3ae' });
        },
        graph: function (ctx, W, H, p, P) {
            var emax = 4.5, smax = Math.ceil(P.fc * 1.2 / 10) * 10;
            var A = axes(ctx, W, H, { x: [0, emax, 0.5, 'Deformación unitaria ε (‰)'], y: [0, smax, smax > 60 ? 20 : 10, 'Esfuerzo σ (MPa)'] });
            var all = [], pr = [], n = 80, i;
            for (i = 0; i <= n; i++) { var s = compState(i / n, P); all.push([s.e * 1000, s.s]); if (i / n <= p) pr.push([s.e * 1000, s.s]); }
            curve(ctx, A, all, 'rgba(255,255,255,0.18)', 1.5, [4, 4]);
            var f28 = P.f28;
            if (f28 <= smax) { ctx.setLineDash([6, 4]); ctx.strokeStyle = COL.ok; ctx.beginPath(); ctx.moveTo(A.L, A.Y(f28)); ctx.lineTo(A.L + A.w, A.Y(f28)); ctx.stroke(); ctx.setLineDash([]); text(ctx, "f′c 28 d (est.) = " + fmt(f28, 1), A.L + 6, A.Y(f28) - 5, { size: 10, color: COL.ok }); }
            if (pr.length > 1) curve(ctx, A, pr, COL.acc, 3);
            var cur = compState(p, P); dot(ctx, A.X(cur.e * 1000), A.Y(cur.s), 5.5, COL.rojo, true);
            if (p > LOAD_END) { dot(ctx, A.X(P.e0 * 1000), A.Y(P.fc), 4, '#fff'); text(ctx, "f′c = " + fmt(P.fc, 1) + ' MPa', A.X(P.e0 * 1000) + 8, A.Y(P.fc) - 6, { bold: true, size: 11 }); }
        },
        chips: function (p, P) {
            var st = compState(p, P), fin = p > LOAD_END, t = Math.min(p / LOAD_END, 1) * P.fc / P.rate;
            return [{ l: 'Carga P', v: fmt(st.s * P.A / 1000, 1) + ' kN', big: true }, { l: 'Esfuerzo σ', v: fmt(st.s, 2) + ' MPa' }, { l: 'Deformación ε', v: fmt(st.e * 1000, 2) + ' ‰' },
                { l: "f′c del ensayo", v: fin ? fmt(P.fc, 1) + ' MPa' : '—', s: fin ? fmt(P.fc * 10.197, 0) + ' kgf/cm²' : '', tone: fin ? 'ok' : '' }, { l: 'Módulo E<sub>c</sub>', v: fmt(P.Ec / 1000, 1) + ' GPa' },
                { l: 'Tiempo de ensayo', v: fmt(t, 0) + ' s', tone: P.rateOk ? '' : 'warn' }, { l: 'Tipo de falla', v: fin ? P.tipo : '—' }];
        }
    };

    /* =========================================================
       SIMULADOR 3 — ACI 211.1 (volumen absoluto paso a paso)
    ========================================================= */
    var ACI_STEPS = ['f′cr', 'Agua y aire', 'Relación a/c', 'Cemento', 'Grava', 'Arena (V. absoluto)', 'Proporciones'];
    var ACI_SIM = {
        id: 'aci', icon: '📐', titulo: 'Diseño ACI 211.1 paso a paso', norma: 'ACI 211.1-91', rs: 0.9, rg: 0.8, dur: 14000, idle: 1,
        desc: 'Mueve f′c, asentamiento, TMN y MF y mira cómo se llena 1 m³ de concreto paso a paso.',
        graphTitle: 'a/c vs. resistencia requerida',
        learn: '<p>Los cuatro volúmenes absolutos (cemento, agua, aire y grava) se calculan primero; la <b>arena es lo que falta para completar 1 m³</b>. Pulsa ▶ para ver el orden del método. Cualquier cambio en los controles recalcula al instante.</p><p>Observa cómo f′c alto baja el a/c y sube el cemento, y cómo un TMN mayor reduce el agua.</p>',
        extra: '<ol class="dm-steps" id="smSteps">' + ACI_STEPS.map(function (s, i) { return '<li data-i="' + i + '"><span>' + (i + 1) + '</span>' + s + '</li>'; }).join('') + '</ol>',
        controls: function () {
            var L = M.lastACI || {};
            return rng('aiFc', "f′c especificada", 10, 60, 1, L.fc || 28, 'MPa') + rng('aiSl', 'Asentamiento', 25, 175, 5, L.slump || 100, 'mm') +
                U.select('aiTmn', 'TMN del grueso', C.ACI.tmn.slice(0, 7).map(function (v) { return [v, v + ' mm']; }), L.tmn || 19) + rng('aiMf', 'MF de la arena', 2.4, 3.2, 0.05, L.mf || 2.7, '') +
                U.select('aiAire', 'Aire', [['atrapado', 'Atrapado (sin incorporado)'], ['leve', 'Incorporado — leve'], ['moderada', 'Incorporado — moderada'], ['severa', 'Incorporado — severa']], L.aire || 'atrapado') +
                U.field('aiPuc', 'PUC grueso', L.puc || 1600, { unit: 'kg/m³', step: '10', min: 1000, max: 2200 }) + '<div class="dm-formrow dm-3">' + U.field('aiGsC', 'Gs cem.', L.gsC || 3.15, { step: '0.01' }) + U.field('aiGsG', 'Gs grava', L.gsG || 2.7, { step: '0.01' }) + U.field('aiGsF', 'Gs arena', L.gsF || 2.65, { step: '0.01' }) + '</div>';
        },
        read: function () {
            var n = function (id) { return parseFloat($(id).value); };
            var P = { fc: n('aiFc'), slump: n('aiSl'), tmn: n('aiTmn'), mf: n('aiMf'), aire: $('aiAire').value, puc: n('aiPuc'), gsC: n('aiGsC'), gsG: n('aiGsG'), gsF: n('aiGsF') };
            P.r = C.disenoACI(P); return P;
        },
        stepOf: function (p) { return p >= 1 ? 7 : Math.floor(p * 7); },
        draw: function (ctx, W, H, p, P) {
            bgStage(ctx, W, H); var r = P.r;
            if (!r.ok) { wrap(ctx, '⚠ ' + r.error, 20, 40, W - 40, 18, { size: 13, color: '#ffb3ae' }); return; }
            var step = ACI_SIM.stepOf(p), within = p >= 1 ? 1 : (p * 7) % 1;
            var cx0 = W * 0.07, cw = W * 0.2, top = H * 0.07, ch = H * 0.62, bottom = top + ch;
            var v = r.vol, total = v.cemento + v.agua + v.aire + v.grueso + v.fino;
            var layers = [
                { k: 'fino', n: 'Arena', v: v.fino, col: COL.arena, st: 5, kg: r.fino, ord: 0 }, { k: 'grueso', n: 'Grava', v: v.grueso, col: COL.grava, st: 4, kg: r.grueso, ord: 1 },
                { k: 'cemento', n: 'Cemento', v: v.cemento, col: COL.cem, st: 3, kg: r.cemento, ord: 2 }, { k: 'agua', n: 'Agua', v: v.agua, col: COL.agua, st: 1, kg: r.agua, ord: 3 }, { k: 'aire', n: 'Aire', v: v.aire, col: COL.aire, st: 1, kg: null, ord: 4 }];
            var y = bottom, labels = [];
            layers.forEach(function (L) {
                var hh = L.v / total * ch, vis = step > L.st ? 1 : (step === L.st ? eOut(within) : 0), yt = y - hh;
                ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([3, 3]); ctx.strokeRect(cx0, yt, cw, hh); ctx.setLineDash([]);
                if (vis > 0) {
                    ctx.fillStyle = L.col; ctx.globalAlpha = 0.9; ctx.fillRect(cx0, y - hh * vis, cw, hh * vis); ctx.globalAlpha = 1;
                    var rnd = seeded(L.ord * 13 + 5); ctx.save(); ctx.beginPath(); ctx.rect(cx0, y - hh * vis, cw, hh * vis); ctx.clip();
                    if (L.k === 'grueso') for (var i = 0; i < 26; i++) { ctx.fillStyle = 'rgba(40,40,40,0.35)'; ctx.beginPath(); ctx.arc(cx0 + rnd() * cw, yt + rnd() * hh, 2 + rnd() * 4, 0, 6.283); ctx.fill(); }
                    else if (L.k === 'fino') for (var j = 0; j < 90; j++) { ctx.fillStyle = 'rgba(80,60,20,0.35)'; ctx.fillRect(cx0 + rnd() * cw, yt + rnd() * hh, 1.5, 1.5); }
                    else if (L.k === 'cemento') { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; for (var k = -hh; k < cw; k += 7) { ctx.beginPath(); ctx.moveTo(cx0 + k, yt + hh); ctx.lineTo(cx0 + k + hh, yt); ctx.stroke(); } }
                    else if (L.k === 'agua') { ctx.strokeStyle = 'rgba(255,255,255,0.45)'; for (var w2 = 0; w2 < cw; w2 += 6) { ctx.beginPath(); ctx.arc(cx0 + w2, yt + hh / 2, 3, Math.PI, 0); ctx.stroke(); } }
                    else for (var a2 = 0; a2 < 7; a2++) { ctx.strokeStyle = 'rgba(30,60,100,0.6)'; ctx.beginPath(); ctx.arc(cx0 + rnd() * cw, yt + hh / 2, 1.5, 0, 6.283); ctx.stroke(); }
                    ctx.restore();
                }
                var active = step === L.st && p < 1;
                if (active) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(cx0, yt, cw, hh); ctx.lineWidth = 1; }
                labels.push({ L: L, yc: yt + hh / 2, vis: vis }); y = yt;
            });
            ctx.strokeStyle = COL.axis; ctx.lineWidth = 2; ctx.strokeRect(cx0, top, cw, ch); ctx.lineWidth = 1;
            text(ctx, '1 m³', cx0 + cw / 2, top - 6, { bold: true, size: 12, align: 'center' });
            // etiquetas sin solaparse (de abajo hacia arriba)
            var lx = cx0 + cw + 18, prev = H;
            labels.forEach(function (lb) { lb.y = Math.min(lb.yc, prev - 26); prev = lb.y; });
            labels.forEach(function (lb) {
                ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath(); ctx.moveTo(cx0 + cw, lb.yc); ctx.lineTo(lx - 4, lb.y); ctx.stroke();
                var alpha = lb.vis > 0 ? 1 : 0.35; ctx.globalAlpha = alpha;
                ctx.fillStyle = lb.L.col; ctx.fillRect(lx, lb.y - 9, 10, 10);
                text(ctx, lb.L.n + (lb.L.kg != null ? ' · ' + fmt(lb.L.kg, 0) + ' kg' : ' · ' + fmt(r.aire, 1) + ' %'), lx + 16, lb.y, { bold: true, size: 12 });
                text(ctx, fmt(lb.L.v * 1000, 0) + ' L', lx + 16, lb.y + 13, { size: 11, color: 'rgba(255,255,255,0.6)' }); ctx.globalAlpha = 1;
            });
            // tarjeta de ecuación
            var cardY = H * 0.77; ctx.fillStyle = 'rgba(0,51,102,0.55)'; rr(ctx, 10, cardY, W - 20, H - cardY - 8, 10); ctx.fill();
            var cur = p >= 1 ? 6 : step, eq = [
                "f′cr = " + fmt(r.fcr, 1) + ' MPa  (NSR-10 C.5.3.2)',
                'Agua = ' + fmt(r.agua, 0) + ' kg/m³ · aire = ' + fmt(r.aire, 1) + ' %  (tabla 6.3.3: TMN ' + P.tmn + ' mm, ' + P.slump + ' mm)',
                'a/c = ' + fmt(r.ac, 3) + (r.controla === 'durabilidad' ? ' (durabilidad)' : '  (tabla 6.3.4 con f′cr)'),
                'Cemento = ' + fmt(r.agua, 0) + ' / ' + fmt(r.ac, 3) + ' = ' + fmt(r.cemento, 0) + ' kg/m³',
                'Grava = b/b₀ · PUC = ' + fmt(r.vg, 2) + ' · ' + P.puc + ' = ' + fmt(r.grueso, 0) + ' kg/m³',
                'V arena = 1 − ΣV = ' + fmt(r.vol.fino, 3) + ' m³  →  ' + fmt(r.fino, 0) + ' kg/m³',
                'Proporción 1 : ' + fmt(r.proporcion.fino, 2) + ' : ' + fmt(r.proporcion.grueso, 2) + '  ·  a/c = ' + fmt(r.ac, 2)];
            text(ctx, 'Paso ' + (cur + 1) + ' · ' + ACI_STEPS[cur], 22, cardY + 20, { bold: true, size: 12, color: '#cfe3f7' });
            wrap(ctx, eq[cur], 22, cardY + 40, W - 44, 16, { size: 13 });
        },
        graph: function (ctx, W, H, p, P) {
            var r = P.r, A = axes(ctx, W, H, { x: [10, 55, 5, "f′cr (MPa)"], y: [0.25, 0.85, 0.1, 'Relación a/c'] });
            var sin = [], con = [];
            for (var f = 10; f <= 55; f += 1) { sin.push([f, C.acPorResistencia(f, false).ac]); if (f <= 45) con.push([f, C.acPorResistencia(f, true).ac]); }
            curve(ctx, A, sin, COL.acc, 2.5); curve(ctx, A, con, COL.arena, 2, [5, 4]);
            text(ctx, '— sin aire incorporado', A.L + 8, A.T + 16, { size: 10, color: COL.acc }); text(ctx, '- - con aire incorporado', A.L + 8, A.T + 30, { size: 10, color: COL.arena });
            if (r && r.ok && p >= 2 / 7) {
                ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(A.X(r.fcr), A.T + A.h); ctx.lineTo(A.X(r.fcr), A.Y(r.ac)); ctx.lineTo(A.L, A.Y(r.ac)); ctx.stroke(); ctx.setLineDash([]);
                dot(ctx, A.X(r.fcr), A.Y(r.ac), 6, COL.rojo, true); text(ctx, 'a/c = ' + fmt(r.ac, 3), A.X(r.fcr) + 9, A.Y(r.ac) - 8, { bold: true, size: 11 });
            }
        },
        chips: function (p, P) {
            var r = P.r; if (!r.ok) return [{ l: 'Revisa los datos', v: '⚠', tone: 'bad', s: r.error }];
            var out = [{ l: "f′cr", v: fmt(r.fcr, 1) + ' MPa' }, { l: 'a/c', v: fmt(r.ac, 3), big: true }, { l: 'Agua', v: fmt(r.agua, 0) + ' kg/m³' }, { l: 'Cemento', v: fmt(r.cemento, 0) + ' kg/m³', big: true },
                { l: 'Grava', v: fmt(r.grueso, 0) + ' kg/m³' }, { l: 'Arena', v: fmt(r.fino, 0) + ' kg/m³' }, { l: 'Proporción', v: '1 : ' + fmt(r.proporcion.fino, 2) + ' : ' + fmt(r.proporcion.grueso, 2) }, { l: 'Arena / agregados', v: fmt(r.pctArena, 0) + ' %' }];
            if (r.avisos.length) out.push({ l: 'Aviso', v: '⚠', tone: 'warn', s: r.avisos[0] });
            return out;
        },
        after: function (p, P) {
            var step = ACI_SIM.stepOf(p);
            document.querySelectorAll('#smSteps li').forEach(function (li) { var i = +li.getAttribute('data-i'); li.classList.toggle('is-done', i < step || p >= 1); li.classList.toggle('is-on', i === step && p < 1); });
        }
    };

    /* =========================================================
       SIMULADOR 4 — COMBINACIÓN DE AGREGADOS (Fuller / Bolomey)
    ========================================================= */
    var SIEVES = [37.5, 25, 19, 12.5, 9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15];
    var ARENAS = {
        fina: { n: 'Fina (MF ≈ 2.2)', p: [100, 100, 100, 100, 100, 100, 96, 85, 62, 32, 10] },
        media: { n: 'Media (MF ≈ 2.7)', p: [100, 100, 100, 100, 100, 98, 88, 68, 46, 21, 7] },
        gruesa: { n: 'Gruesa (MF ≈ 3.3)', p: [100, 100, 100, 100, 100, 93, 75, 52, 30, 12, 4] }
    };
    var GRAVAS = {
        '12.5': { D: 12.5, p: [100, 100, 100, 95, 70, 15, 3, 1.5, 1, 0.5, 0] },
        '19': { D: 19, p: [100, 100, 95, 60, 38, 8, 3, 1.5, 1, 0.5, 0] },
        '25': { D: 25, p: [100, 95, 70, 42, 25, 6, 2, 1, 1, 0.5, 0] }
    };
    function aggModel(P) {
        var ar = ARENAS[P.ar].p, gr = GRAVAS[P.gr], best = 0.2, bestE = 1e9, scan = [];
        for (var f = 0.2; f <= 0.8001; f += 0.005) { var e = C.errorCombinacion(C.combinar(ar, gr.p, f), SIEVES, gr.D, P.obj); scan.push([f, e]); if (e < bestE) { bestE = e; best = f; } }
        return { ar: ar, gr: gr, best: best, bestE: bestE, scan: scan };
    }
    function aggF(p, P, Mo) { if (p <= 0) return P.f; if (p >= 1) return Mo.best; if (p < 0.75) return 0.2 + 0.6 * (p / 0.75); return lerp(0.8, Mo.best, eIO((p - 0.75) / 0.25)); }
    var AGG = {
        id: 'agg', icon: '🪨', titulo: 'Combinación de agregados', norma: 'Curvas de Fuller y Bolomey', rs: 0.95, rg: 0.8, dur: 9000, idle: 0, resetOnInput: true,
        desc: 'Mezcla arena y grava y busca el porcentaje que mejor se acerca a la curva ideal de Fuller o Bolomey.',
        graphTitle: 'Granulometría combinada',
        learn: '<p>Una buena combinación llena los vacíos con menos pasta. <b>Fuller:</b> P = 100 √(d/D). <b>Bolomey:</b> P = a + (100 − a) √(d/D), con a ≈ 10 para agregado rodado/triturado. El simulador barre de 20 a 80 % de arena y calcula el error cuadrático medio (RMS) frente a la curva objetivo en los tamices ≤ TMN.</p><p>Las curvas teóricas son una guía: la mezcla real se afina con ensayos de trabajabilidad y resistencia.</p>',
        controls: function () {
            return U.select('agAr', 'Arena', Object.keys(ARENAS).map(function (k) { return [k, ARENAS[k].n]; }), 'media') + U.select('agGr', 'Grava (TMN)', [['12.5', '12.5 mm'], ['19', '19 mm'], ['25', '25 mm']], '19') +
                U.select('agObj', 'Curva objetivo', [['fuller', 'Fuller'], ['bolomey', 'Bolomey (a = 10)']], 'bolomey') + rng('agF', '% de arena (del total)', 20, 80, 1, 45, '%');
        },
        read: function () { var P = { ar: $('agAr').value, gr: $('agGr').value, obj: $('agObj').value, f: rv('agF') / 100 }; P.mo = aggModel(P); return P; },
        draw: function (ctx, W, H, p, P) {
            bgStage(ctx, W, H); var Mo = P.mo, f = aggF(p, P, Mo);
            var hx1 = W * 0.2, hx2 = W * 0.8, hy = H * 0.05, hw = W * 0.2, hh = H * 0.2;
            function hopper(x, name, frac, col) {
                ctx.strokeStyle = COL.axis; ctx.beginPath(); ctx.moveTo(x - hw / 2, hy); ctx.lineTo(x + hw / 2, hy); ctx.lineTo(x + hw * 0.1, hy + hh); ctx.lineTo(x - hw * 0.1, hy + hh); ctx.closePath(); ctx.stroke();
                ctx.save(); ctx.beginPath(); ctx.moveTo(x - hw / 2, hy); ctx.lineTo(x + hw / 2, hy); ctx.lineTo(x + hw * 0.1, hy + hh); ctx.lineTo(x - hw * 0.1, hy + hh); ctx.closePath(); ctx.clip();
                ctx.fillStyle = col; ctx.globalAlpha = 0.85; var fh = hh * (0.15 + 0.85 * frac); ctx.fillRect(x - hw, hy + hh - fh, hw * 2, fh); ctx.restore(); ctx.globalAlpha = 1;
                text(ctx, name + ' ' + fmt(frac * 100, 0) + ' %', x, hy + hh + 15, { bold: true, size: 12, align: 'center' });
            }
            hopper(hx1, 'Arena', f, COL.arena); hopper(hx2, 'Grava', 1 - f, COL.grava);
            var dcx = W * 0.5, dcy = H * 0.37, dr = H * 0.14;
            ctx.strokeStyle = 'rgba(214,184,106,0.5)'; ctx.lineWidth = 2 + 6 * f; ctx.beginPath(); ctx.moveTo(hx1, hy + hh); ctx.quadraticCurveTo(hx1, dcy - dr, dcx - dr * 0.6, dcy - dr * 0.9); ctx.stroke();
            ctx.strokeStyle = 'rgba(154,165,177,0.5)'; ctx.lineWidth = 2 + 6 * (1 - f); ctx.beginPath(); ctx.moveTo(hx2, hy + hh); ctx.quadraticCurveTo(hx2, dcy - dr, dcx + dr * 0.6, dcy - dr * 0.9); ctx.stroke(); ctx.lineWidth = 1;
            ctx.fillStyle = '#16293f'; ctx.beginPath(); ctx.arc(dcx, dcy, dr, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#7d8da1'; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 1;
            var rnd = seeded(99), rot = (p * 14 + (p === 0 ? 0 : 0)) * Math.PI; ctx.save(); ctx.beginPath(); ctx.arc(dcx, dcy, dr - 3, 0, 6.283); ctx.clip();
            for (var i = 0; i < 90; i++) { var a = rnd() * 6.283 + rot * (0.4 + rnd() * 0.3), rr2 = Math.sqrt(rnd()) * (dr - 6), isA = rnd() < f; ctx.fillStyle = isA ? COL.arena : COL.grava; ctx.beginPath(); ctx.arc(dcx + Math.cos(a) * rr2, dcy + Math.sin(a) * rr2, isA ? 1.6 : 3.4, 0, 6.283); ctx.fill(); } ctx.restore();
            // error vs % arena
            var x0 = W * 0.1, w = W * 0.82, y0 = H * 0.66, h = H * 0.24, emax = Math.max.apply(null, Mo.scan.map(function (s) { return s[1]; })) * 1.1 || 1;
            text(ctx, 'Error RMS frente a la curva objetivo, según % de arena', x0, y0 - 8, { size: 11 });
            ctx.strokeStyle = COL.axis; ctx.strokeRect(x0, y0, w, h);
            ctx.strokeStyle = COL.acc; ctx.lineWidth = 2; ctx.beginPath();
            Mo.scan.forEach(function (s, i) { var x = x0 + (s[0] - 0.2) / 0.6 * w, y = y0 + h - s[1] / emax * h; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.lineWidth = 1;
            for (var t = 20; t <= 80; t += 10) { var xx = x0 + (t - 20) / 60 * w; text(ctx, t + '', xx, y0 + h + 13, { size: 10, align: 'center' }); }
            var xb = x0 + (Mo.best - 0.2) / 0.6 * w; ctx.setLineDash([4, 3]); ctx.strokeStyle = COL.ok; ctx.beginPath(); ctx.moveTo(xb, y0); ctx.lineTo(xb, y0 + h); ctx.stroke(); ctx.setLineDash([]);
            text(ctx, 'óptimo ' + fmt(Mo.best * 100, 1) + ' %', xb, y0 + 12, { size: 10, align: xb > x0 + w * 0.8 ? 'right' : 'left', color: COL.ok });
            var fe = C.errorCombinacion(C.combinar(Mo.ar, Mo.gr.p, f), SIEVES, Mo.gr.D, P.obj), xf = x0 + (f - 0.2) / 0.6 * w;
            dot(ctx, xf, y0 + h - fe / emax * h, 5.5, COL.rojo, true);
        },
        graph: function (ctx, W, H, p, P) {
            var Mo = P.mo, f = aggF(p, P, Mo), comb = C.combinar(Mo.ar, Mo.gr.p, f), D0 = Mo.gr.D;
            var tgt = SIEVES.map(function (s) { return [s, s > D0 ? 100 : C.curvaObjetivo(s, D0, P.obj)]; });
            var cv = M.draw.gradChart; var el = $('smGraph');
            cv(el, { xmin: 0.1, xmax: 50, aberturas: SIEVES, series: [
                { pts: SIEVES.map(function (s, i) { return [s, Mo.ar[i]]; }), color: COL.arena, width: 1.5, label: 'Arena' }, { pts: SIEVES.map(function (s, i) { return [s, Mo.gr.p[i]]; }), color: COL.grava, width: 1.5, label: 'Grava' },
                { pts: tgt, color: '#ffffff', width: 1.8, dash: [6, 4], label: P.obj === 'fuller' ? 'Fuller' : 'Bolomey' }, { pts: SIEVES.map(function (s, i) { return [s, comb[i]]; }), color: COL.acc, width: 3, dots: true, label: 'Combinada' }] });
        },
        chips: function (p, P) {
            var Mo = P.mo, f = aggF(p, P, Mo), comb = C.combinar(Mo.ar, Mo.gr.p, f), mf = 0;
            SIEVES.forEach(function (s, i) { if (C.SERIE_MF.indexOf(s) >= 0) mf += 100 - comb[i]; }); mf /= 100;
            var e = C.errorCombinacion(comb, SIEVES, Mo.gr.D, P.obj), d = f - Mo.best;
            var diag = Math.abs(d) <= 0.03 ? 'Cercana a la curva ideal' : (d < 0 ? 'Faltan finos: mezcla pedregosa y áspera' : 'Exceso de arena: más agua y pasta');
            return [{ l: '% arena', v: fmt(f * 100, 1) + ' %', big: true }, { l: '% grava', v: fmt((1 - f) * 100, 1) + ' %' }, { l: 'MF combinado', v: fmt(mf, 2) }, { l: 'Error RMS', v: fmt(e, 2), tone: e <= Mo.bestE * 1.3 ? 'ok' : '' },
                { l: 'Óptimo', v: fmt(Mo.best * 100, 1) + ' %', s: 'RMS ' + fmt(Mo.bestE, 2), tone: 'ok' }, { l: 'Diagnóstico', v: diag, tone: Math.abs(d) <= 0.03 ? 'ok' : 'warn' }];
        },
        onDone: function (P) { var s = $('agF'); if (s) { s.value = Math.round(P.mo.best * 100); var o = $('agFV'); if (o) o.textContent = s.value + ' %'; } }
    };

    /* ---------- parámetros compartidos con el laboratorio 3D (mismo ensayo, mismos datos) ---------- */
    function a3d(k, o) {
        var L3 = root.GeoLab3D; if (!L3) return;
        L3.pro = L3.pro || {}; L3.pro.over = L3.pro.over || {}; L3.pro.over[k] = o;
    }
    function fase(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
    function balanza(ctx, x, y, w, lectura, unidad, col) {
        ctx.fillStyle = '#2a3b52'; rr(ctx, x, y, w, 34, 6); ctx.fill();
        ctx.fillStyle = '#0b1220'; rr(ctx, x + 10, y + 8, w - 20, 18, 3); ctx.fill();
        text(ctx, lectura + ' ' + unidad, x + w - 16, y + 22, { bold: true, size: 13, align: 'right', color: col || '#7dd3fc' });
        ctx.fillStyle = '#4b5d75'; ctx.fillRect(x + w * 0.2, y - 6, w * 0.6, 6);
    }

    /* =========================================================
       SIMULADOR 5 — GRANULOMETRÍA DE AGREGADOS (NTC 77 · ASTM C136)
    ========================================================= */
    var GR_T = [{ n: 'N.º 4', mm: 4.75 }, { n: 'N.º 8', mm: 2.36 }, { n: 'N.º 16', mm: 1.18 }, { n: 'N.º 30', mm: 0.6 }, { n: 'N.º 50', mm: 0.3 }, { n: 'N.º 100', mm: 0.15 }];
    var GR_DOTS = (function () { var r = seeded(57), a = []; for (var i = 0; i < 260; i++) a.push([r(), r(), r()]); return a; })();
    function granModel(P) {
        var a = ARENAS[P.arena].p, pas = [a[5], a[6], a[7], a[8], a[9], a[10]], prev = 100, ret = [], acc = 0, i;
        for (i = 0; i < 6; i++) { ret.push((prev - pas[i]) / 100 * P.tot); prev = pas[i]; acc += 100 - pas[i]; }
        ret.push(pas[5] / 100 * P.tot);
        return { pas: pas, ret: ret, mf: acc / 100 };
    }
    var GRAN = {
        id: 'gran', icon: '📊', titulo: 'Granulometría de agregados', norma: 'NTC 77 · ASTM C136', rs: 0.92, rg: 0.8, dur: 9000, idle: 0,
        desc: 'Tamiza una arena por la serie N.º 4 a N.º 100, pesa lo retenido en cada tamiz y obtén la curva y el módulo de finura.',
        graphTitle: '% que pasa vs. abertura del tamiz',
        learn: '<p>Se pesa la muestra seca (M₀), se tamiza unos 10 min y se pesa lo retenido en cada tamiz. <b>% retenido acumulado</b> = suma de lo retenido hasta ese tamiz; <b>% que pasa</b> = 100 − retenido acumulado. El <b>módulo de finura</b> es MF = Σ % retenidos acumulados (N.º 4, 8, 16, 30, 50 y 100) / 100.</p><p>Para concreto, la arena debe quedar dentro de los límites de ASTM C33 (zona verde) y con MF entre 2.3 y 3.1. La suma de retenidos no debe diferir más de 0.3 % de M₀.</p>',
        controls: function () {
            return rng('grTot', 'Masa seca de la muestra (M₀)', 200, 1000, 10, 500, 'g') +
                U.select('grAr', 'Tipo de arena', Object.keys(ARENAS).map(function (k) { return [k, ARENAS[k].n]; }), 'media');
        },
        read: function () {
            var P = { tot: rv('grTot'), arena: $('grAr').value }, Mo = granModel(P);
            P.pas = Mo.pas; P.ret = Mo.ret; P.mf = Mo.mf; a3d('dm_gran', { tot: P.tot, arena: P.arena });
            return P;
        },
        draw: function (ctx, W, H, p, P) {
            bgStage(ctx, W, H);
            var vert = fase(p, 0, 0.12), vib = fase(p, 0.12, 0.62), pesa = fase(p, 0.62, 0.95);
            var cx = W * 0.36, tw = W * 0.42, th = Math.min(42, H * 0.095), y0 = H * 0.14, sh = vib > 0 && vib < 1 ? Math.sin(p * 900) * 3 : 0;
            var nombres = GR_T.map(function (t) { return t.n; }).concat(['Fondo']), mx = Math.max.apply(null, P.ret);
            for (var i = 0; i < 7; i++) {
                var y = y0 + i * (th + 6), x = cx - tw / 2 + sh;
                ctx.fillStyle = '#25364d'; rr(ctx, x, y, tw, th, 5); ctx.fill(); ctx.strokeStyle = '#7d8da1'; ctx.stroke();
                if (i < 6) { ctx.strokeStyle = 'rgba(200,210,225,0.35)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.moveTo(x + 6, y + th - 5); ctx.lineTo(x + tw - 6, y + th - 5); ctx.stroke(); ctx.setLineDash([]); }
                /* material que queda en cada tamiz: crece con la vibración */
                var q = i === 0 ? (vib > 0 ? 1 : 0) : vib, cuanto = P.ret[i] / mx;
                var hh = (th - 10) * Math.max(0.08, cuanto) * eOut(q);
                if (vib <= 0 && i === 0) hh = (th - 10) * vert;           /* antes de vibrar todo está arriba */
                ctx.fillStyle = i < 3 ? '#a08a5c' : (i < 5 ? '#c4ad7a' : '#d9c99f'); ctx.fillRect(x + 8, y + th - 6 - hh, tw - 16, hh);
                text(ctx, nombres[i], x - 10, y + th / 2 + 4, { size: 11, align: 'right', color: 'rgba(255,255,255,0.75)' });
                if (pesa > i / 7) text(ctx, fmt(P.ret[i], 1) + ' g', x + tw + 12, y + th / 2 + 4, { bold: true, size: 12, color: '#fbbf24' });
            }
            /* partículas cayendo durante la vibración */
            if (vib > 0 && vib < 1) GR_DOTS.forEach(function (d) {
                var yy = y0 + ((d[1] + p * 6) % 1) * 7 * (th + 6), xx = cx - tw / 2 + 12 + d[0] * (tw - 24);
                ctx.fillStyle = d[2] > 0.5 ? '#c4ad7a' : '#8b7a58'; ctx.beginPath(); ctx.arc(xx, yy, 1 + d[2], 0, 6.283); ctx.fill();
            });
            /* balanza que pesa cada tamiz al final */
            var ip = Math.min(6, Math.floor(pesa * 7));
            balanza(ctx, W * 0.74, H * 0.82, W * 0.22, pesa > 0 ? fmt(P.ret[ip] * eOut((pesa * 7) % 1 || 1), 1) : fmt(P.tot * vert, 0), 'g');
            var cap = p < 0.12 ? '1 · Se pesa la muestra seca (M₀) y se vierte en el tamiz superior' : (p < 0.62 ? '2 · Tamizado por vibración (≈ 10 min)' : (p < 0.95 ? '3 · Se pesa lo retenido en cada tamiz' : '4 · % que pasa y módulo de finura'));
            text(ctx, cap, 12, 22, { bold: true, size: 13 });
        },
        graph: function (ctx, W, H, p, P) {
            ctx.clearRect(0, 0, W, H); ctx.fillStyle = COL.bg; ctx.fillRect(0, 0, W, H);
            var mm = [9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15], pas = [100].concat(P.pas), L = 46, Rr = 14, T = 14, B = 38, w = W - L - Rr, h = H - T - B;
            var l0 = Math.log10(0.1), l1 = Math.log10(12);
            function X(v) { return L + (Math.log10(v) - l0) / (l1 - l0) * w; } function Y(v) { return T + h - v / 100 * h; }
            var LIM = C.LIMITES_C33_FINO || [];
            if (LIM.length) { ctx.fillStyle = 'rgba(52,211,153,0.12)'; ctx.beginPath(); LIM.forEach(function (l, i) { ctx[i ? 'lineTo' : 'moveTo'](X(l[0]), Y(l[2])); }); for (var k = LIM.length - 1; k >= 0; k--) ctx.lineTo(X(LIM[k][0]), Y(LIM[k][1])); ctx.closePath(); ctx.fill(); }
            mm.forEach(function (m) { ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(X(m), T); ctx.lineTo(X(m), T + h); ctx.stroke(); text(ctx, String(m), X(m), T + h + 15, { size: 10, align: 'center' }); });
            for (var v = 0; v <= 100; v += 20) { ctx.strokeStyle = COL.grid; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + w, Y(v)); ctx.stroke(); text(ctx, String(v), L - 6, Y(v) + 4, { size: 11, align: 'right' }); }
            ctx.strokeStyle = COL.axis; ctx.strokeRect(L, T, w, h);
            text(ctx, 'Abertura (mm, escala log)', L + w / 2, H - 5, { size: 11, align: 'center' });
            ctx.save(); ctx.translate(11, T + h / 2); ctx.rotate(-Math.PI / 2); text(ctx, '% que pasa', 0, 0, { size: 11, align: 'center' }); ctx.restore();
            var shown = p < 0.62 ? 0 : (p >= 0.95 ? 7 : Math.min(7, Math.floor(fase(p, 0.62, 0.95) * 7) + 1));
            var A = { X: X, Y: Y }, pts = mm.map(function (m, i) { return [m, pas[i]]; });
            curve(ctx, A, pts, 'rgba(251,191,36,0.3)', 1.5, [5, 5]);
            if (shown > 1) { curve(ctx, A, pts.slice(0, shown), COL.acc, 3); pts.slice(0, shown).forEach(function (q) { dot(ctx, X(q[0]), Y(q[1]), 4, COL.acc, true); }); }
            text(ctx, 'Zona verde: límites ASTM C33', L + 8, T + 16, { size: 10, color: '#6ee7b7' });
        },
        chips: function (p, P) {
            var acc = 0; P.ret.forEach(function (m) { acc += m; });
            var fin = p >= 0.95, mf = P.mf, clase = mf < 2.3 ? 'Arena fina' : (mf > 3.1 ? 'Arena gruesa' : 'Apta para concreto');
            var ph = p <= 0 ? 'Listo' : (p < 0.12 ? 'Pesando y vertiendo' : (p < 0.62 ? 'Tamizando' : (p < 0.95 ? 'Pesando retenidos' : 'Finalizado')));
            return [{ l: 'Módulo de finura', v: fin ? fmt(mf, 2) : '—', big: true, tone: fin ? (mf >= 2.3 && mf <= 3.1 ? 'ok' : 'warn') : '' }, { l: 'Masa inicial M₀', v: fmt(P.tot, 0) + ' g' },
                { l: 'Suma de retenidos', v: p >= 0.62 ? fmt(acc, 1) + ' g' : '—' }, { l: '% pasa N.º 100', v: fin ? fmt(P.pas[5], 1) + ' %' : '—' },
                { l: 'Clasificación', v: fin ? clase : '—', tone: fin ? (clase === 'Apta para concreto' ? 'ok' : 'warn') : '' }, { l: 'Estado', v: ph }];
        }
    };

    /* =========================================================
       SIMULADOR 6 — PESO UNITARIO Y VACÍOS (NTC 92 · ASTM C29)
    ========================================================= */
    var PU_DOTS = (function () { var r = seeded(81), a = []; for (var i = 0; i < 220; i++) a.push([r(), r(), r()]); return a; })();
    var PUNIT = {
        id: 'punit', icon: '⚖️', titulo: 'Peso unitario y vacíos', norma: 'NTC 92 · ASTM C29', rs: 0.92, rg: 0.8, dur: 9000, idle: 0,
        desc: 'Llena el recipiente en 3 capas con 25 golpes de varilla, enrasa, pesa y calcula el peso unitario compactado y los vacíos.',
        graphTitle: 'Vacíos vs. peso unitario',
        learn: '<p><b>PUC = (G − T) / V</b>: masa del recipiente lleno (G) menos la tara (T), entre el volumen calibrado del recipiente (V). Los <b>vacíos</b> son el espacio entre partículas: % vacíos = [1 − PUC / (Gs·ρw)] × 100, con ρw = 1000 kg/m³.</p><p>El PUC del agregado grueso entra al diseño ACI (grava = b/b₀ × PUC). Un agregado bien gradado tiene menos vacíos y necesita menos pasta.</p>',
        controls: function () {
            return rng('puPuc', 'PUC del agregado', 1000, 2200, 10, 1600, 'kg/m³') + rng('puGs', 'Gravedad específica (Gs)', 2.2, 3.2, 0.01, 2.7, '') +
                U.select('puV', 'Volumen del recipiente', [[2.832, '2.8 L (⅒ pie³)'], [9.435, '9.4 L (⅓ pie³)'], [14.158, '14.2 L (½ pie³)'], [28.317, '28.3 L (1 pie³)']], 14.158) +
                rng('puT', 'Tara del recipiente (T)', 0.5, 15, 0.05, 4.8, 'kg');
        },
        read: function () {
            var P = { puc: rv('puPuc'), gs: rv('puGs'), Vl: parseFloat($('puV').value), T: rv('puT') };
            P.V = P.Vl / 1000; P.neto = P.puc * P.V; P.G = P.T + P.neto; P.vac = (1 - P.puc / (P.gs * 1000)) * 100;
            a3d('dm_punit', { puc: P.puc, gs: P.gs, Vl: P.Vl, T: P.T });
            return P;
        },
        draw: function (ctx, W, H, p, P) {
            bgStage(ctx, W, H);
            var tara = fase(p, 0, 0.08), llen = fase(p, 0.08, 0.62), enr = fase(p, 0.62, 0.72), pes = fase(p, 0.72, 0.88);
            var cx = W * 0.38, cw = W * 0.34, ch = H * 0.5, gy = H * 0.8, top = gy - ch;
            ctx.fillStyle = '#1b2b40'; ctx.fillRect(0, gy, W, H - gy);
            /* agregado dentro del recipiente (capas) */
            var nivel = Math.min(1, llen * 1.06), hh = ch * nivel;
            ctx.save(); ctx.beginPath(); ctx.rect(cx - cw / 2 + 4, gy - hh, cw - 8, hh); ctx.clip();
            ctx.fillStyle = '#6e7c8c'; ctx.fillRect(cx - cw / 2, gy - hh, cw, hh);
            PU_DOTS.forEach(function (d) { var x = cx - cw / 2 + 6 + d[0] * (cw - 12), y = gy - d[1] * ch; ctx.fillStyle = d[2] > 0.5 ? '#a3aebb' : '#56636f'; ctx.beginPath(); ctx.arc(x, y, 2.5 + d[2] * 3.5, 0, 6.283); ctx.fill(); });
            ctx.restore();
            for (var k = 1; k <= 2; k++) if (nivel > k / 3) { ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(cx - cw / 2 + 4, gy - ch * k / 3); ctx.lineTo(cx + cw / 2 - 4, gy - ch * k / 3); ctx.stroke(); ctx.setLineDash([]); }
            if (llen >= 1 && enr < 1) { /* colmo antes de enrasar */ ctx.fillStyle = '#6e7c8c'; ctx.beginPath(); ctx.ellipse(cx, top, cw / 2 - 6, 10 * (1 - enr), 0, Math.PI, 0); ctx.fill(); }
            /* recipiente */
            ctx.strokeStyle = '#c9d4df'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - cw / 2, top); ctx.lineTo(cx - cw / 2, gy); ctx.lineTo(cx + cw / 2, gy); ctx.lineTo(cx + cw / 2, top); ctx.stroke(); ctx.lineWidth = 1;
            /* varilla compactando */
            if (llen > 0 && llen < 1) { var golpe = Math.sin(p * 260) * 0.5 + 0.5, ry = gy - hh - 10 - 40 * golpe; ctx.strokeStyle = '#e8edf2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx + cw * 0.1, ry); ctx.lineTo(cx + cw * 0.1, ry - 110); ctx.stroke(); ctx.lineWidth = 1; }
            /* regla enrasando */
            if (enr > 0 && enr < 1) { var rx = cx - cw / 2 - 20 + (cw + 40) * enr; ctx.fillStyle = '#e8edf2'; rr(ctx, rx - 60, top - 6, 120, 6, 3); ctx.fill(); }
            /* balanza */
            var lect = pes > 0 ? P.T + P.neto * eOut(pes) : P.T * tara;
            balanza(ctx, W * 0.7, H * 0.76, W * 0.26, fmt(lect, 2), 'kg', pes > 0 ? '#fbbf24' : '#7dd3fc');
            text(ctx, pes > 0 ? 'G (recipiente lleno)' : 'T (tara)', W * 0.83, H * 0.76 - 14, { size: 11, align: 'center', color: 'rgba(255,255,255,0.7)' });
            var cap = p < 0.08 ? '1 · Se pesa el recipiente vacío (tara T)' : (p < 0.62 ? '2 · Llenado en 3 capas — 25 golpes de varilla por capa' : (p < 0.72 ? '3 · Se enrasa la superficie con la regla' : (p < 0.88 ? '4 · Se pesa el recipiente lleno (G)' : '5 · PUC = (G − T)/V y % de vacíos')));
            text(ctx, cap, 12, 22, { bold: true, size: 13 });
        },
        graph: function (ctx, W, H, p, P) {
            var A = axes(ctx, W, H, { x: [1000, 2200, 200, 'PUC (kg/m³)'], y: [0, 70, 10, 'Vacíos (%)'], bands: [{ from: 30, to: 45, c: 'rgba(52,211,153,0.08)', l: 'típico 30–45 %' }] });
            var pts = []; for (var u = 1000; u <= 2200; u += 25) pts.push([u, clamp((1 - u / (P.gs * 1000)) * 100, 0, 70)]);
            curve(ctx, A, pts, COL.acc, 2.5);
            if (p >= 0.88) { dot(ctx, A.X(P.puc), A.Y(clamp(P.vac, 0, 70)), 6, COL.rojo, true); text(ctx, fmt(P.vac, 1) + ' % vacíos', A.X(P.puc) + 9, A.Y(clamp(P.vac, 0, 70)) - 8, { size: 11, bold: true, color: '#ffb3ae' }); }
            text(ctx, 'Gs = ' + fmt(P.gs, 2), A.L + 8, A.T + 16, { size: 10 });
        },
        chips: function (p, P) {
            var fin = p >= 0.88, ph = p <= 0 ? 'Listo' : (p < 0.08 ? 'Tara' : (p < 0.62 ? 'Llenando y compactando' : (p < 0.72 ? 'Enrasando' : (p < 0.88 ? 'Pesando' : 'Finalizado'))));
            return [{ l: 'PUC', v: fin ? fmt(P.puc, 0) + ' kg/m³' : '—', big: true }, { l: 'Tara T', v: fmt(P.T, 2) + ' kg' }, { l: 'Masa neta G − T', v: p >= 0.72 ? fmt(P.neto, 2) + ' kg' : '—' },
                { l: 'Volumen V', v: fmt(P.Vl, 2) + ' L' }, { l: 'Vacíos', v: fin ? fmt(P.vac, 1) + ' %' : '—', tone: fin ? (P.vac >= 30 && P.vac <= 45 ? 'ok' : 'warn') : '' }, { l: 'Estado', v: ph }];
        }
    };

    /* =========================================================
       SIMULADOR 7 — HUMEDAD DEL AGREGADO (NTC 1776 · ASTM C566)
    ========================================================= */
    var HU_DOTS = (function () { var r = seeded(13), a = []; for (var i = 0; i < 120; i++) a.push([r(), r(), r()]); return a; })();
    function humMasa(P, t) { return P.ms + (P.mh - P.ms) * Math.exp(-t / 6); }   /* tendencia del secado, τ = 6 h */
    var HUM = {
        id: 'hum', icon: '💧', titulo: 'Humedad del agregado', norma: 'NTC 1776 · ASTM C566', rs: 0.92, rg: 0.8, dur: 9000, idle: 0,
        desc: 'Pesa el agregado húmedo, sécalo en el horno a 110 °C hasta masa constante y obtén la humedad y la humedad libre.',
        graphTitle: 'Masa durante el secado',
        learn: '<p><b>w = (Mh − Ms) / Ms × 100</b>, con Mh la masa húmeda y Ms la masa seca a masa constante (110 ± 5 °C). La <b>humedad libre</b> = w − absorción: es el agua que el agregado trae «de más» respecto al estado saturado superficialmente seco (SSS).</p><p>Si la humedad libre es positiva, esa agua se <b>resta</b> del agua de mezclado; si es negativa, el agregado absorberá agua de la mezcla y hay que <b>agregarla</b>. La curva de secado es una tendencia cualitativa.</p>',
        controls: function () {
            return rng('huMh', 'Masa húmeda (Mh)', 100, 5000, 10, 1000, 'g') + rng('huW', 'Humedad real del agregado', 0, 15, 0.1, 3.8, '%') + rng('huAb', 'Absorción del agregado', 0, 8, 0.1, 1.5, '%');
        },
        read: function () {
            var P = { mh: rv('huMh'), w: rv('huW'), ab: rv('huAb') };
            P.ms = P.mh / (1 + P.w / 100); P.libre = P.w - P.ab; P.agua = P.mh - P.ms;
            a3d('dm_hum', { mh: P.mh, w: P.w, ab: P.ab });
            return P;
        },
        draw: function (ctx, W, H, p, P) {
            bgStage(ctx, W, H);
            var p1 = fase(p, 0, 0.15), horno = fase(p, 0.15, 0.7), p3 = fase(p, 0.7, 0.88), hrs = 24 * horno;
            var gy = H * 0.84; ctx.fillStyle = '#1b2b40'; ctx.fillRect(0, gy, W, H - gy);
            /* horno */
            var ox = W * 0.08, ow = W * 0.42, oh = H * 0.5, oy = gy - oh;
            ctx.fillStyle = '#cfd6de'; rr(ctx, ox, oy, ow, oh, 8); ctx.fill();
            var calor = horno > 0 && horno < 1 ? 1 : 0;
            ctx.fillStyle = calor ? '#7a3412' : '#26303d'; rr(ctx, ox + 14, oy + 34, ow - 28, oh - 48, 5); ctx.fill();
            ctx.fillStyle = '#0b1220'; rr(ctx, ox + 14, oy + 8, 74, 20, 3); ctx.fill();
            text(ctx, (calor ? fmt(lerp(25, 110, Math.min(1, horno * 6)), 0) : '25') + ' °C', ox + 82, oy + 23, { bold: true, size: 12, align: 'right', color: calor ? '#fb923c' : '#7dd3fc' });
            text(ctx, 'HORNO', ox + ow - 18, oy + 23, { size: 11, align: 'right', color: '#334155', bold: true });
            if (calor) for (var k = 0; k < 3; k++) { ctx.strokeStyle = 'rgba(251,146,60,0.55)'; ctx.lineWidth = 2; ctx.beginPath(); var bx = ox + ow * (0.3 + 0.2 * k); for (var t = 0; t <= 1; t += 0.1) ctx.lineTo(bx + Math.sin(t * 12 + p * 80 + k) * 4, oy + 40 + t * 26); ctx.stroke(); ctx.lineWidth = 1; }
            /* bandeja con el agregado: dentro del horno mientras seca, sobre la balanza al pesar */
            var enHorno = horno > 0 && horno < 1, tx = enHorno ? ox + ow / 2 : W * 0.76, ty = enHorno ? gy - 32 : H * 0.62, tw2 = W * 0.2;
            var seco = enHorno ? horno : (p >= 0.7 ? 1 : 0);
            ctx.fillStyle = '#9aa7b6'; rr(ctx, tx - tw2 / 2, ty, tw2, 12, 3); ctx.fill();
            HU_DOTS.forEach(function (d) { var x = tx - tw2 / 2 + 6 + d[0] * (tw2 - 12), y = ty - 2 - d[1] * 14; ctx.fillStyle = mezclaColor(seco, d[2]); ctx.beginPath(); ctx.arc(x, y, 1.6 + d[2] * 1.6, 0, 6.283); ctx.fill(); });
            /* balanza */
            var lect = p < 0.15 ? P.mh * eOut(p1) : (p < 0.7 ? humMasa(P, hrs) : P.ms);
            balanza(ctx, W * 0.64, H * 0.66, W * 0.25, fmt(lect, 1), 'g', p >= 0.7 ? '#fbbf24' : '#7dd3fc');
            if (enHorno) text(ctx, 'Tiempo en el horno: ' + fmt(hrs, 1) + ' h', W * 0.76, H * 0.6, { size: 12, align: 'center', color: '#fdba74', bold: true });
            var cap = p < 0.15 ? '1 · Se pesa la muestra húmeda (Mh)' : (p < 0.7 ? '2 · Secado en el horno a 110 ± 5 °C hasta masa constante' : (p < 0.88 ? '3 · Se deja enfriar y se pesa en seco (Ms)' : '4 · Humedad w y humedad libre'));
            text(ctx, cap, 12, 22, { bold: true, size: 13 });
        },
        graph: function (ctx, W, H, p, P) {
            var lo = Math.floor(P.ms * 0.98), hi = Math.ceil(P.mh * 1.01), st = Math.max(1, Math.round((hi - lo) / 5));
            var A = axes(ctx, W, H, { x: [0, 24, 4, 'Tiempo en el horno (h)'], y: [lo, lo + st * 5, st, 'Masa (g)'] });
            var pts = []; for (var t = 0; t <= 24; t += 0.5) pts.push([t, humMasa(P, t)]);
            curve(ctx, A, pts, COL.acc, 2.5);
            ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.beginPath(); ctx.moveTo(A.X(0), A.Y(P.ms)); ctx.lineTo(A.X(24), A.Y(P.ms)); ctx.stroke(); ctx.setLineDash([]);
            text(ctx, 'Ms = ' + fmt(P.ms, 1) + ' g (masa constante)', A.X(1), A.Y(P.ms) - 8, { size: 10.5, color: '#fda4af', bold: true });
            var hrs = p < 0.15 ? 0 : 24 * fase(p, 0.15, 0.7); if (p > 0) dot(ctx, A.X(hrs), A.Y(humMasa(P, hrs)), 6, COL.rojo, true);
        },
        chips: function (p, P) {
            var fin = p >= 0.88, ph = p <= 0 ? 'Listo' : (p < 0.15 ? 'Pesando húmeda' : (p < 0.7 ? 'Secando' : (p < 0.88 ? 'Pesando seca' : 'Finalizado')));
            var corr = P.libre * 10;   /* kg de agua por cada 1000 kg de agregado */
            return [{ l: 'Humedad w', v: fin ? fmt(P.w, 2) + ' %' : '—', big: true }, { l: 'Masa húmeda Mh', v: fmt(P.mh, 1) + ' g' }, { l: 'Masa seca Ms', v: p >= 0.7 ? fmt(P.ms, 1) + ' g' : '—' },
                { l: 'Humedad libre', v: fin ? fmt(P.libre, 2) + ' %' : '—', tone: fin ? (P.libre >= 0 ? 'ok' : 'warn') : '' },
                { l: 'Corrección de agua', v: fin ? (corr >= 0 ? 'Restar ' : 'Agregar ') + fmt(Math.abs(corr), 1) + ' kg' : '—', s: fin ? 'por cada 1000 kg de agregado' : '' }, { l: 'Estado', v: ph }];
        }
    };
    function mezclaColor(seco, r) { var h = [92, 74, 52], s = [196, 176, 138], c = h.map(function (v, i) { return Math.round(lerp(v, s[i], seco) * (0.85 + r * 0.3)); }); return 'rgb(' + c.join(',') + ')'; }

    /* =========================================================
       SIMULADOR 8 — CONCRETO FRESCO: PESO UNITARIO Y AIRE (NTC 1926 · ASTM C138 / C231)
    ========================================================= */
    var FR_DOTS = (function () { var r = seeded(29), a = []; for (var i = 0; i < 180; i++) a.push([r(), r(), r()]); return a; })();
    var FRESCO = {
        id: 'fresco', icon: '🧪', titulo: 'Concreto fresco · olla de aire', norma: 'NTC 1926 · ASTM C138 / C231', rs: 0.92, rg: 0.8, dur: 10000, idle: 0,
        desc: 'Compacta el concreto en la olla, pésalo, séllala, inyecta agua, presuriza y lee el contenido de aire y el rendimiento de la tanda.',
        graphTitle: 'Peso unitario vs. contenido de aire',
        learn: '<p><b>Peso unitario γ = Mc / V</b> (ASTM C138): masa del concreto compactado en la olla de volumen conocido (7 L). El <b>aire</b> se lee en el manómetro de la olla tipo B (ASTM C231): al presurizar, el aire de la mezcla se comprime y la aguja marca su porcentaje.</p><p><b>Rendimiento Y = ΣM / γ</b>: volumen que produce la tanda de diseño (debe ser ≈ 1 m³). Cada 1 % de aire reduce la resistencia ≈ 5 %. Aquí γ = γt (1 − A); la lectura del manómetro se muestra directamente.</p>',
        controls: function () {
            return rng('frAir', 'Contenido de aire (A)', 0.5, 8, 0.1, 2, '%') + rng('frG0', 'γ teórico sin aire', 2200, 2650, 10, 2480, 'kg/m³') +
                rng('frTanda', 'Masa de la tanda de diseño (ΣM)', 2200, 2550, 5, 2380, 'kg/m³') + rng('frT', 'Tara de la olla', 1, 10, 0.05, 5.1, 'kg');
        },
        read: function () {
            var P = { air: rv('frAir'), gamma0: rv('frG0'), tanda: rv('frTanda'), T: rv('frT') };
            P.gamma = P.gamma0 * (1 - P.air / 100); P.neto = P.gamma * 0.007; P.rend = P.tanda / P.gamma;
            a3d('dm_fresco', { air: P.air, gamma0: P.gamma0, tanda: P.tanda, T: P.T });
            return P;
        },
        draw: function (ctx, W, H, p, P) {
            bgStage(ctx, W, H);
            var llen = fase(p, 0, 0.3), pes = fase(p, 0.3, 0.42), tapa = fase(p, 0.42, 0.6), bomba = fase(p, 0.6, 0.75), lee = fase(p, 0.75, 0.95);
            var gy = H * 0.84, cx = W * 0.34, cw = W * 0.3, ch = H * 0.34; ctx.fillStyle = '#1b2b40'; ctx.fillRect(0, gy, W, H - gy);
            var top = gy - ch;
            /* concreto */
            var hh = ch * Math.min(1, llen * 1.05);
            ctx.save(); ctx.beginPath(); ctx.rect(cx - cw / 2 + 4, gy - hh, cw - 8, hh); ctx.clip(); ctx.fillStyle = '#8b7a58'; ctx.fillRect(cx - cw / 2, gy - hh, cw, hh);
            FR_DOTS.forEach(function (d) { ctx.fillStyle = d[2] > 0.5 ? '#5e5036' : '#b9a67b'; ctx.beginPath(); ctx.arc(cx - cw / 2 + 6 + d[0] * (cw - 12), gy - d[1] * ch, 1 + d[2] * 2, 0, 6.283); ctx.fill(); });
            /* burbujas de aire que se comprimen al presurizar */
            var nb = Math.round(P.air * 6), rb = 4 * (1 - 0.55 * bomba) * (1 - lee * 0.2);
            for (var b = 0; b < nb; b++) { var d0 = FR_DOTS[b]; ctx.strokeStyle = 'rgba(224,242,254,0.75)'; ctx.beginPath(); ctx.arc(cx - cw / 2 + 10 + d0[1] * (cw - 20), gy - 8 - d0[0] * (hh - 16), Math.max(1.2, rb), 0, 6.283); ctx.stroke(); }
            ctx.restore();
            ctx.strokeStyle = '#c9d4df'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx - cw / 2, top); ctx.lineTo(cx - cw / 2, gy); ctx.lineTo(cx + cw / 2, gy); ctx.lineTo(cx + cw / 2, top); ctx.stroke(); ctx.lineWidth = 1;
            /* varilla o mazo durante el llenado */
            if (llen > 0 && llen < 1) { var g = Math.sin(p * 400) * 0.5 + 0.5, ry = gy - hh - 10 - 36 * g; ctx.strokeStyle = '#e8edf2'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, ry); ctx.lineTo(cx, ry - 100); ctx.stroke(); ctx.lineWidth = 1; }
            /* tapa con manómetro */
            if (tapa > 0) {
                var ty = top - 18 - 60 * (1 - eOut(tapa));
                ctx.fillStyle = '#9aa7b6'; rr(ctx, cx - cw / 2 - 10, ty, cw + 20, 18, 4); ctx.fill();
                if (tapa > 0.5) { ctx.fillStyle = 'rgba(56,189,248,0.55)'; var ag = (tapa - 0.5) * 2; ctx.fillRect(cx + cw / 2 + 10, ty + 4, 20 * ag, 5); }   /* agua saliendo por la llave */
                var gx = cx, gyy = ty - 46, R2 = 38;
                ctx.fillStyle = '#e2e8f0'; ctx.beginPath(); ctx.arc(gx, gyy, R2, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#475569'; ctx.lineWidth = 3; ctx.stroke(); ctx.lineWidth = 1;
                for (var t = 0; t <= 10; t++) { var ang = Math.PI * (0.75 + 1.5 * t / 10); ctx.strokeStyle = '#334155'; ctx.beginPath(); ctx.moveTo(gx + Math.cos(ang) * (R2 - 4), gyy + Math.sin(ang) * (R2 - 4)); ctx.lineTo(gx + Math.cos(ang) * (R2 - 10), gyy + Math.sin(ang) * (R2 - 10)); ctx.stroke(); if (t % 2 === 0) text(ctx, String(t), gx + Math.cos(ang) * (R2 - 18), gyy + Math.sin(ang) * (R2 - 18) + 4, { size: 9, align: 'center', color: '#0f172a' }); }
                var val = bomba > 0 && lee <= 0 ? 10 * eOut(bomba) : (lee > 0 ? lerp(10, P.air, eOut(lee)) : 0);
                var an = Math.PI * (0.75 + 1.5 * clamp(val, 0, 10) / 10); ctx.strokeStyle = '#dc2626'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(gx, gyy); ctx.lineTo(gx + Math.cos(an) * (R2 - 12), gyy + Math.sin(an) * (R2 - 12)); ctx.stroke(); ctx.lineWidth = 1;
                text(ctx, '% aire', gx, gyy + 22, { size: 9, align: 'center', color: '#0f172a' });
            }
            /* balanza */
            balanza(ctx, W * 0.68, H * 0.74, W * 0.26, fmt(pes > 0 ? P.T + P.neto * eOut(pes) : P.T, 2), 'kg', pes > 0 ? '#fbbf24' : '#7dd3fc');
            var cap = p < 0.3 ? '1 · Llenado en 3 capas: 25 golpes de varilla y golpes laterales con el mazo' : (p < 0.42 ? '2 · Se enrasa y se pesa: peso unitario γ = Mc/V' : (p < 0.6 ? '3 · Se cierra la tapa y se inyecta agua por las llaves' : (p < 0.75 ? '4 · Se bombea hasta la presión inicial' : (p < 0.95 ? '5 · Se abre la válvula y se lee el aire' : '6 · Peso unitario, aire y rendimiento'))));
            text(ctx, cap, 12, 22, { bold: true, size: 13 });
        },
        graph: function (ctx, W, H, p, P) {
            var y0 = Math.floor(P.gamma0 * 0.9 / 50) * 50, y1 = Math.ceil(P.gamma0 / 50) * 50;
            var A = axes(ctx, W, H, { x: [0, 8, 1, 'Aire (%)'], y: [y0, y1, Math.max(25, Math.round((y1 - y0) / 5 / 5) * 5), 'γ (kg/m³)'] });
            var pts = []; for (var a = 0; a <= 8; a += 0.25) pts.push([a, P.gamma0 * (1 - a / 100)]);
            curve(ctx, A, pts, COL.acc, 2.5);
            if (p >= 0.42) { dot(ctx, A.X(P.air), A.Y(P.gamma), 6, COL.rojo, true); text(ctx, 'γ = ' + fmt(P.gamma, 0), A.X(P.air) + 9, A.Y(P.gamma) - 8, { size: 11, bold: true, color: '#ffb3ae' }); }
        },
        chips: function (p, P) {
            var ph = p <= 0 ? 'Listo' : (p < 0.3 ? 'Llenando' : (p < 0.42 ? 'Pesando' : (p < 0.6 ? 'Sellando la olla' : (p < 0.75 ? 'Presurizando' : (p < 0.95 ? 'Leyendo aire' : 'Finalizado')))));
            var okR = Math.abs(P.rend - 1) <= 0.02;
            return [{ l: 'Contenido de aire', v: p >= 0.95 ? fmt(P.air, 1) + ' %' : '—', big: true, tone: p >= 0.95 ? (P.air <= 6 ? 'ok' : 'warn') : '' }, { l: 'Masa del concreto Mc', v: p >= 0.42 ? fmt(P.neto, 2) + ' kg' : '—' },
                { l: 'Peso unitario γ', v: p >= 0.42 ? fmt(P.gamma, 0) + ' kg/m³' : '—' }, { l: 'Rendimiento Y', v: p >= 0.95 ? fmt(P.rend, 3) + ' m³' : '—', tone: p >= 0.95 ? (okR ? 'ok' : 'warn') : '', s: p >= 0.95 ? (okR ? 'la tanda rinde lo previsto' : (P.rend < 1 ? 'rinde menos de 1 m³' : 'rinde más de 1 m³')) : '' },
                { l: 'Volumen de la olla', v: '7.00 L' }, { l: 'Estado', v: ph }];
        }
    };

    /* =========================================================
       Ejecutor común
    ========================================================= */
    var SIMS = { rev: REV, comp: COMP, aci211: ACI_SIM, agg: AGG, gran: GRAN, punit: PUNIT, hum: HUM, fresco: FRESCO };
    var ORDEN = ['rev', 'comp', 'aci211', 'agg', 'gran', 'punit', 'hum', 'fresco'];
    var TONE = {
        rev: { a: '#38BDF8', rgb: '56,189,248' },
        comp: { a: '#A78BFA', rgb: '167,139,250' },
        aci211: { a: '#34D399', rgb: '52,211,153' },
        agg: { a: '#FBBF24', rgb: '251,191,36' },
        gran: { a: '#F59E0B', rgb: '245,158,11' },
        punit: { a: '#38BDF8', rgb: '56,189,248' },
        hum: { a: '#FB7185', rgb: '251,113,133' },
        fresco: { a: '#F472B6', rgb: '244,114,182' }
    };
    /* ---- Laboratorio 3D (js/lab3d-dm.js y lab3d-dm2.js) ---- */
    var TO3D = { rev: 'dm_rev', comp: 'dm_comp', aci211: 'dm_aci', agg: 'dm_agg', gran: 'dm_gran', punit: 'dm_punit', hum: 'dm_hum', fresco: 'dm_fresco' };
    var FROM3D = { dm_rev: 'rev', dm_comp: 'comp', dm_aci: 'aci211', dm_agg: 'agg', dm_gran: 'gran', dm_punit: 'punit', dm_hum: 'hum', dm_fresco: 'fresco' };
    var META3D = {
        dm_rev: { icon: '🥣', titulo: 'Revenimiento · cono de Abrams', norma: 'NTC 396 · ASTM C143', desc: 'Llena el cono en 3 capas, levántalo y mira cómo se asienta el concreto con una regla de medición.', a: '#38BDF8', rgb: '56,189,248' },
        dm_comp: { icon: '🏛️', titulo: 'Compresión de cilindros', norma: 'NTC 673 · ASTM C39', desc: 'Prensa con manómetro y consola: carga, falla, grietas y desprendimiento del cilindro.', a: '#A78BFA', rgb: '167,139,250' },
        dm_aci: { icon: '📐', titulo: 'Diseño ACI 211.1 · 1 m³', norma: 'ACI 211.1-91', desc: 'Cemento, agua, grava y arena entran al tanque de 1 m³ en el orden del método, con la ecuación de cada paso.', a: '#34D399', rgb: '52,211,153' },
        dm_agg: { icon: '🪨', titulo: 'Combinación de agregados', norma: 'Fuller · Bolomey', desc: 'Dos tolvas y una artesa mezcladora; la pizarra compara la curva combinada con la ideal.', a: '#FBBF24', rgb: '251,191,36' },
        dm_gran: { icon: '📊', titulo: 'Granulometría · tamizadora', norma: 'NTC 77 · ASTM C136', desc: 'Pesa la muestra, vibra la columna de tamices y calcula % pasa y módulo de finura.', a: '#F59E0B', rgb: '245,158,11' },
        dm_punit: { icon: '⚖️', titulo: 'Peso unitario y vacíos', norma: 'NTC 92 · ASTM C29', desc: 'Llena el recipiente en 3 capas, varilla 25 golpes, enrasa, pesa y calcula PUC y % de vacíos.', a: '#38BDF8', rgb: '56,189,248' },
        dm_hum: { icon: '💧', titulo: 'Humedad del agregado · horno', norma: 'NTC 1776 · ASTM C566', desc: 'Pesa la muestra húmeda, sécala a 110 °C, pésala en seco y obtén w y la humedad libre.', a: '#FB7185', rgb: '251,113,133' },
        dm_fresco: { icon: '🧪', titulo: 'Concreto fresco · olla de aire', norma: 'NTC 1926 · ASTM C138 / C231', desc: 'Compacta el concreto, pésalo, sella la olla, inyecta agua, bombea y lee el contenido de aire.', a: '#F472B6', rgb: '244,114,182' }
    };
    var ORDEN3D_LAB = [];   /* los 8 ensayos ya tienen 2D y 3D */
    var R = { sim: null, raf: 0, p: 0, running: false, last: 0, P: null };
    R.sim3d = null;

    function simHome() {
        return '<div class="simhub">' +
            '<header class="simhub-hero"><div class="simhub-hero-text"><em class="simhub-eyebrow">Laboratorio virtual · Diseño de Mezclas</em>' +
            '<h3>Ocho simuladores para ver la mezcla antes de vaciarla</h3>' +
            '<p>Mueve el agua, la relación a/c, el TMN o la combinación de agregados y observa la respuesta en <b>2D</b>, en las curvas en vivo y en el <b>laboratorio 3D</b>. Parámetros a la izquierda, animación al centro y gráfica a la derecha.</p></div>' +
            '<ul class="simhub-hero-stats"><li><strong>8</strong><em>Simuladores 2D</em></li><li><strong>8</strong><em>Máquinas 3D</em></li><li><strong>8</strong><em>Curvas</em></li></ul></header>' +
            '<div class="simhub-grid">' + ORDEN.map(function (id, i) {
                var s = SIMS[id], t = TONE[id] || TONE.rev;
                return '<article class="simcard est-dm-simcard has3d" style="--a:' + t.a + ';--rgb:' + t.rgb + '"><div class="simcard-glow"></div>' +
                    '<div class="simcard-head"><em class="simcard-num">' + String(i + 1).padStart(2, '0') + '</em><div class="simcard-glyph" aria-hidden="true">' + s.icon + '</div></div>' +
                    '<h4>' + s.titulo + '</h4><p>' + s.desc + '</p>' +
                    '<div class="simcard-chips"><em>' + s.norma + '</em></div>' +
                    '<div class="simcard-btns"><button type="button" class="simcard-btn is-2d" data-sim="' + id + '"><b>2D</b><span>Simulador 2D</span><i>Curvas en vivo</i></button>' +
                    '<button type="button" class="simcard-btn is-3d" data-sim3d="' + TO3D[id] + '"><b>3D</b><span>Simulador 3D</span><i>Máquina completa</i></button></div></article>';
            }).join('') + '</div>' +
            (ORDEN3D_LAB.length ? '<h4 class="simhub-sub">Laboratorio 3D · ensayos con la máquina completa</h4>' : '') +
            '<div class="simhub-grid">' + ORDEN3D_LAB.map(function (k, i) {
                var s3 = META3D[k];
                return '<article class="simcard est-dm-simcard has3d" style="--a:' + s3.a + ';--rgb:' + s3.rgb + '"><div class="simcard-glow"></div>' +
                    '<div class="simcard-head"><em class="simcard-num">' + String(i + 5).padStart(2, '0') + '</em><div class="simcard-glyph" aria-hidden="true">' + s3.icon + '</div></div>' +
                    '<h4>' + s3.titulo + '</h4><p>' + s3.desc + '</p><div class="simcard-chips"><em>' + s3.norma + '</em></div>' +
                    '<div class="simcard-btns"><button type="button" class="simcard-btn is-3d" data-sim3d="' + k + '"><b>3D</b><span>Abrir en 3D</span><i>Paso a paso del laboratorio</i></button></div></article>';
            }).join('') + '</div>' +
            '<h4 class="simhub-sub">Módulos de cálculo con datos de mezcla</h4>' +
            '<div id="dmCalcMount"></div>' +
            '<section class="ms2-guias est-ruta"><div class="ms2-guias-head"><h4>Cómo usar los simuladores</h4><p>Elige un ensayo, ajusta los parámetros y pulsa ▶. La gráfica y las lecturas se actualizan sin recargar.</p></div>' +
            '<div class="est-ruta-chips"><span><b>1</b>Parametriza</span><span><b>2</b>Anima el ensayo</span><span><b>3</b>Lee la curva</span></div></section></div>';
    }
    function simView(s) {
        var t = TONE[s.id] || TONE.rev;
        return '<div class="simhub-shell" style="--a:' + t.a + ';--rgb:' + t.rgb + '">' +
            '<div class="simhub-topbar"><button type="button" class="btn-volver simhub-back" id="smBack">← Simuladores</button>' +
            '<nav class="simhub-crumbs"><span>Diseño de Mezclas</span><i>/</i><span>Simuladores</span><i>/</i><b>' + s.titulo + '</b></nav>' +
            '<div class="simhub-mode" role="tablist" aria-label="Tipo de simulador"><button type="button" role="tab" class="on" aria-selected="true" data-dm-mode="2d">2D</button><button type="button" role="tab" aria-selected="false" data-dm-mode="3d">3D</button></div></div>' +
            '<header class="simhub-phero"><div class="simhub-phero-icon" aria-hidden="true">' + s.icon + '</div>' +
            '<div class="simhub-phero-text"><em class="simhub-phero-eyebrow">Simulador · ' + s.norma + '</em><h2>' + s.titulo + '</h2><p class="simhub-phero-desc">' + s.desc + '</p></div>' +
            '<ul class="simhub-phero-meta"><li><b>Referencia</b><span>' + s.norma + '</span></li><li><b>Gráfica</b><span>' + s.graphTitle + '</span></li></ul></header>' +
            '<div class="dm-simgrid"><aside class="dm-panel dm-controls"><h4>Parámetros</h4><div id="smControls">' + s.controls() + '</div>' +
            '<label class="dm-field" for="smSpeed"><span class="dm-lab">Velocidad de la animación</span><select id="smSpeed"><option value="0.5">Lenta</option><option value="1" selected>Media</option><option value="2">Rápida</option></select></label>' +
            '<div class="dm-actions"><button type="button" class="btn-calcular" id="smPlay">▶ INICIAR</button><button type="button" class="btn-limpiar" id="smReset">Reiniciar</button></div></aside>' +
            '<section class="dm-panel dm-stage"><div class="est-simstagehead"><span>Vista 2D</span><em>Animación del ensayo</em></div><canvas id="smStage" data-ratio="' + s.rs + '" role="img" aria-label="Animación del simulador"></canvas>' + (typeof s.extra === 'string' ? s.extra : '') + '</section>' +
            '<section class="dm-panel dm-graph"><h4>' + s.graphTitle + '</h4><canvas id="smGraph" data-ratio="' + s.rg + '" role="img" aria-label="Gráfica en vivo"></canvas></section></div>' +
            '<div class="dm-tiles dm-livechips" id="smChips"></div>' +
            '<details class="dm-panel dm-proc" open><summary>Qué estás viendo</summary>' + s.learn + '</details></div>';
    }
    function paint() {
        var s = R.sim; if (!s || !R.P) return;
        var cs = $('smStage'), cg = $('smGraph'); if (!cs) return;
        M.lastSimP = M.lastSimP || {}; M.lastSimP[s.id] = R.P;   // el 3D reutiliza los últimos valores del 2D
        var st = D.fit(cs, s.rs); if (st) s.draw(st.ctx, st.W, st.H, R.p, R.P);
        if (s.id === 'agg') { s.graph(null, 0, 0, R.p, R.P); } else { var g = D.fit(cg, s.rg); if (g) s.graph(g.ctx, g.W, g.H, R.p, R.P); }
        var items = s.chips(R.p, R.P);
        $('smChips').innerHTML = items.map(function (it) { return '<div class="dm-tile' + (it.tone ? ' is-' + it.tone : '') + (it.big ? ' is-big' : '') + '"><span>' + it.l + '</span><strong>' + it.v + '</strong>' + (it.s ? '<small>' + esc(it.s) + '</small>' : '') + '</div>'; }).join('');
        if (s.after) s.after(R.p, R.P);
    }
    function setBtn(t) { var b = $('smPlay'); if (b) b.textContent = t; }
    function stop() { R.running = false; if (R.raf) cancelAnimationFrame(R.raf); R.raf = 0; }
    function loop(now) {
        if (!R.running) return;
        var c = $('smStage'); if (!c || !c.offsetParent) { stop(); return; }
        var speed = parseFloat(($('smSpeed') || {}).value) || 1;
        R.p = Math.min(1, R.p + (now - R.last) / (R.sim.dur / speed)); R.last = now;
        paint();
        if (R.p >= 1) { stop(); setBtn('↻ REPETIR'); if (R.sim.onDone) { R.sim.onDone(R.P); R.P = R.sim.read(); } paint(); return; }
        R.raf = requestAnimationFrame(loop);
    }
    function play() {
        if (R.running) { stop(); setBtn('▶ CONTINUAR'); return; }
        if (R.p >= 1) R.p = 0;
        R.P = R.sim.read(); R.running = true; R.last = performance.now(); setBtn('⏸ PAUSAR'); R.raf = requestAnimationFrame(loop);
    }
    function reset() { stop(); R.p = R.sim.idle; R.P = R.sim.read(); setBtn('▶ INICIAR'); paint(); }
    function onInput(e) {
        var t = e.target; if (t && t.type === 'range') { var o = $(t.id + 'V'); if (o) o.textContent = t.value + (t.getAttribute('data-unit') ? ' ' + t.getAttribute('data-unit') : ''); }
        if (t && t.id === 'smSpeed') return;
        var keep = R.running; R.P = R.sim.read();
        if (R.sim.resetOnInput && !keep) { R.p = R.sim.idle; setBtn('▶ INICIAR'); }
        paint();
    }
    M.stopSim = function () { stop(); if (R.sim) setBtn(R.p >= 1 ? '↻ REPETIR' : (R.p > 0 && R.p < 1 ? '▶ CONTINUAR' : '▶ INICIAR')); };
    M.redrawSim = function () { if (R.sim && $('smStage')) paint(); };

    function view3d(k) {
        var s3 = META3D[k], two = FROM3D[k];
        return '<div class="simhub-shell" style="--a:' + s3.a + ';--rgb:' + s3.rgb + '">' +
            '<div class="simhub-topbar"><button type="button" class="btn-volver simhub-back" id="smBack3">← Simuladores</button>' +
            '<nav class="simhub-crumbs"><span>Diseño de Mezclas</span><i>/</i><span>Laboratorio 3D</span><i>/</i><b>' + s3.titulo + '</b></nav>' +
            (two ? '<div class="simhub-mode" role="tablist" aria-label="Tipo de simulador"><button type="button" role="tab" aria-selected="false" data-dm-mode="2d">2D</button><button type="button" role="tab" class="on" aria-selected="true" data-dm-mode="3d">3D</button></div>' : '') + '</div>' +
            '<header class="simhub-phero"><div class="simhub-phero-icon" aria-hidden="true">' + s3.icon + '</div>' +
            '<div class="simhub-phero-text"><em class="simhub-phero-eyebrow">Simulador 3D · Laboratorio virtual</em><h2>' + s3.titulo + '</h2><p class="simhub-phero-desc">' + s3.desc + ' Gira la vista, usa la rueda para acercar y consulta cada componente.</p></div>' +
            '<ul class="simhub-phero-meta"><li><b>Normativa</b><span>' + s3.norma + '</span></li></ul></header>' +
            '<div class="simhub-body"><div class="simhub-3d-host" id="smHost3d"></div></div></div>';
    }
    function disposeLab3d() { try { if (window.GeoLab3D) window.GeoLab3D.disposeAll(); } catch (e) {} }
    M.openSim3d = function (k) {
        if (!META3D[k]) return; stop(); R.sim = null; R.P = null; R.sim3d = k;
        var btn = document.querySelector('#pantallaDisenoMezclas .tab-btn[data-tab="dm-simuladores"]');
        if (btn && !btn.classList.contains('active')) btn.click();
        M.renderSims();
        try { var t = $('pantallaDisenoMezclas'); if (t) t.scrollIntoView({ block: 'start' }); } catch (e) {}
    };
    M.renderSims = function () {
        var rootEl = $('dmSimRoot'); if (!rootEl) return; stop();
        disposeLab3d();
        if (R.sim3d) {
            var k3 = R.sim3d; rootEl.innerHTML = view3d(k3);
            $('smBack3').addEventListener('click', function () { disposeLab3d(); R.sim3d = null; M.renderSims(); try { var t = $('pantallaDisenoMezclas'); if (t) t.scrollIntoView({ block: 'start' }); } catch (e) {} });
            rootEl.querySelectorAll('[data-dm-mode="2d"]').forEach(function (b) { b.addEventListener('click', function () { disposeLab3d(); var id = FROM3D[k3]; R.sim3d = null; M.openSim(id); }); });
            var host = $('smHost3d');
            if (!window.GeoLab3D) host.innerHTML = '<p class="login-hint">El módulo 3D no está disponible.</p>'; else window.GeoLab3D.mount(host, k3);
            return;
        }
        if (!R.sim) {
            rootEl.innerHTML = simHome();
            rootEl.querySelectorAll('[data-sim]').forEach(function (b) { b.addEventListener('click', function () { M.openSim(b.getAttribute('data-sim')); }); });
            rootEl.querySelectorAll('[data-sim3d]').forEach(function (b) { b.addEventListener('click', function () { M.openSim3d(b.getAttribute('data-sim3d')); }); });
            if (window.DMCalc && typeof window.DMCalc.mount === 'function') {
                window.DMCalc.mount(document.getElementById('dmCalcMount'));
            }
            return;
        }
        rootEl.innerHTML = simView(R.sim);
        $('smBack').addEventListener('click', function () { stop(); R.sim = null; R.P = null; M.renderSims(); try { var t = $('pantallaDisenoMezclas'); if (t) t.scrollIntoView({ block: 'start' }); } catch (e) {} });
        $('smPlay').addEventListener('click', play); $('smReset').addEventListener('click', reset);
        rootEl.querySelectorAll('[data-dm-mode="3d"]').forEach(function (b) { b.addEventListener('click', function () { var k = TO3D[R.sim && R.sim.id]; if (k) { M.openSim3d(k); } }); });
        var ctr = $('smControls'); ctr.addEventListener('input', onInput); ctr.addEventListener('change', onInput);
        R.p = R.sim.idle; R.P = R.sim.read(); setBtn('▶ INICIAR');
        requestAnimationFrame(function () { requestAnimationFrame(paint); });
    };
    M.openSim = function (id) {
        if (!SIMS[id]) return; stop(); R.sim3d = null; R.sim = SIMS[id];
        var btn = document.querySelector('#pantallaDisenoMezclas .tab-btn[data-tab="dm-simuladores"]');
        if (btn && !btn.classList.contains('active')) btn.click();
        M.renderSims();
        try { var t = $('pantallaDisenoMezclas'); if (t) t.scrollIntoView({ block: 'start' }); } catch (e) {}
    };
    M.sims = SIMS;
    M._m = { aggModel: aggModel, aggF: aggF, compState: compState, SIEVES: SIEVES, ARENAS: ARENAS, GRAVAS: GRAVAS };   // lo usa el laboratorio 3D (lab3d-dm.js)
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', M.renderSims); else M.renderSims();
})(typeof window !== 'undefined' ? window : globalThis);
