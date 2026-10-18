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

    /* =========================================================
       Ejecutor común
    ========================================================= */
    var SIMS = { rev: REV, comp: COMP, aci211: ACI_SIM, agg: AGG };
    var ORDEN = ['rev', 'comp', 'aci211', 'agg'];
    var R = { sim: null, raf: 0, p: 0, running: false, last: 0, P: null };

    function simHome() {
        return '<div class="dm dm-intro"><p>Cada simulador abre en un panel propio: <b>parámetros a la izquierda, animación al centro y gráfica en vivo a la derecha</b>. Cambia los parámetros en cualquier momento y pulsa ▶ para repetir la animación.</p></div>' +
            '<div class="dm dm-cards dm-cards-sim">' + ORDEN.map(function (id) {
                var s = SIMS[id];
                return '<button type="button" class="dm-card" data-sim="' + id + '"><span class="dm-card-ico" aria-hidden="true">' + s.icon + '</span><span class="dm-card-t">' + s.titulo + '</span><span class="dm-card-n">' + s.norma + '</span><span class="dm-card-d">' + s.desc + '</span><span class="dm-card-go">ABRIR SIMULADOR →</span></button>';
            }).join('') + '</div>';
    }
    function simView(s) {
        return '<div class="dm dm-view dm-simview"><header class="dm-viewhead"><button type="button" class="btn-limpiar" id="smBack">← Simuladores</button><div class="dm-viewtitle"><h3>' + s.titulo + '</h3><span class="dm-norma">' + s.norma + '</span></div></header>' +
            '<div class="dm-simgrid"><aside class="dm-panel dm-controls"><h4>Parámetros</h4><div id="smControls">' + s.controls() + '</div>' +
            '<label class="dm-field" for="smSpeed"><span class="dm-lab">Velocidad de la animación</span><select id="smSpeed"><option value="0.5">Lenta</option><option value="1" selected>Media</option><option value="2">Rápida</option></select></label>' +
            '<div class="dm-actions"><button type="button" class="btn-calcular" id="smPlay">▶ INICIAR</button><button type="button" class="btn-limpiar" id="smReset">Reiniciar</button></div></aside>' +
            '<section class="dm-panel dm-stage"><canvas id="smStage" data-ratio="' + s.rs + '" role="img" aria-label="Animación del simulador"></canvas>' + (typeof s.extra === 'string' ? s.extra : '') + '</section>' +
            '<section class="dm-panel dm-graph"><h4>' + s.graphTitle + '</h4><canvas id="smGraph" data-ratio="' + s.rg + '" role="img" aria-label="Gráfica en vivo"></canvas></section></div>' +
            '<div class="dm-tiles dm-livechips" id="smChips"></div>' +
            '<details class="dm-panel dm-proc" open><summary>Qué estás viendo</summary>' + s.learn + '</details></div>';
    }
    function paint() {
        var s = R.sim; if (!s || !R.P) return;
        var cs = $('smStage'), cg = $('smGraph'); if (!cs) return;
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

    M.renderSims = function () {
        var rootEl = $('dmSimRoot'); if (!rootEl) return; stop();
        if (!R.sim) {
            rootEl.innerHTML = simHome();
            rootEl.querySelectorAll('[data-sim]').forEach(function (b) { b.addEventListener('click', function () { M.openSim(b.getAttribute('data-sim')); }); });
            return;
        }
        rootEl.innerHTML = simView(R.sim);
        $('smBack').addEventListener('click', function () { stop(); R.sim = null; R.P = null; M.renderSims(); try { var t = $('pantallaDisenoMezclas'); if (t) t.scrollIntoView({ block: 'start' }); } catch (e) {} });
        $('smPlay').addEventListener('click', play); $('smReset').addEventListener('click', reset);
        var ctr = $('smControls'); ctr.addEventListener('input', onInput); ctr.addEventListener('change', onInput);
        R.p = R.sim.idle; R.P = R.sim.read(); setBtn('▶ INICIAR');
        requestAnimationFrame(function () { requestAnimationFrame(paint); });
    };
    M.openSim = function (id) {
        if (!SIMS[id]) return; stop(); R.sim = SIMS[id];
        var btn = document.querySelector('#pantallaDisenoMezclas .tab-btn[data-tab="dm-simuladores"]');
        if (btn && !btn.classList.contains('active')) btn.click();
        M.renderSims();
        try { var t = $('pantallaDisenoMezclas'); if (t) t.scrollIntoView({ block: 'start' }); } catch (e) {}
    };
    M.sims = SIMS;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', M.renderSims); else M.renderSims();
})(typeof window !== 'undefined' ? window : globalThis);
