/* =========================================================
   GeoMetrics — Curvas suaves para las gráficas de los ensayos
   window.GeoCurvas
     .monotone(pts, opts)  → puntos densos {x, y} con interpolación
                             cúbica monótona (Fritsch–Butland / PCHIP).
         · pasa EXACTAMENTE por cada punto medido;
         · no inventa picos ni valles: entre dos lecturas la curva
           queda dentro de su rango (sin sobreoscilación);
         · un máximo medido sigue siendo el máximo (Proctor, qu…).
         Si x no es estrictamente monótona o hay < 3 puntos, devuelve
         los puntos tal cual (no se suaviza lo que no se puede).
     .trace(ctx, pts, X, Y)  → camino (beginPath + líneas) en píxeles.
     .hidpi(canvas, opts)    → prepara un canvas nítido en pantallas
                               HiDPI conservando su proporción original.
   ========================================================= */
(function (global) {
    'use strict';

    function sgn(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }

    /* pendiente en un extremo: fórmula de tres puntos con limitación (PCHIP) */
    function endSlope(h0, h1, m0, m1) {
        var d = ((2 * h0 + h1) * m0 - h0 * m1) / (h0 + h1);
        if (sgn(d) !== sgn(m0)) return 0;
        if (sgn(m0) !== sgn(m1) && Math.abs(d) > Math.abs(3 * m0)) return 3 * m0;
        return d;
    }

    function monotone(pts, opts) {
        opts = opts || {};
        var P = (pts || []).filter(function (p) { return p && isFinite(p.x) && isFinite(p.y); });
        var N = P.length;
        if (N < 3) return P.map(function (p) { return { x: p.x, y: p.y }; });
        var dir = sgn(P[1].x - P[0].x);
        for (var k = 0; k < N - 1; k++) {
            if (!dir || sgn(P[k + 1].x - P[k].x) !== dir) return P.map(function (p) { return { x: p.x, y: p.y }; });
        }
        var h = [], m = [], t = new Array(N), i;
        for (i = 0; i < N - 1; i++) { h[i] = P[i + 1].x - P[i].x; m[i] = (P[i + 1].y - P[i].y) / h[i]; }
        for (i = 1; i < N - 1; i++) {
            if (m[i - 1] * m[i] <= 0) t[i] = 0;                       /* extremo local: tangente horizontal */
            else {
                var w1 = 2 * h[i] + h[i - 1], w2 = h[i] + 2 * h[i - 1];
                t[i] = (w1 + w2) / (w1 / m[i - 1] + w2 / m[i]);     /* media armónica ponderada */
            }
        }
        t[0] = endSlope(h[0], h[1], m[0], m[1]);
        t[N - 1] = endSlope(h[N - 2], h[N - 3], m[N - 2], m[N - 3]);

        var per = opts.per || Math.max(10, Math.ceil((opts.total || 220) / (N - 1)));
        var out = [];
        for (i = 0; i < N - 1; i++) {
            var x0 = P[i].x, y0 = P[i].y, y1 = P[i + 1].y, hh = h[i];
            for (var s = 0; s < per; s++) {
                var u = s / per, u2 = u * u, u3 = u2 * u;
                var h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
                out.push({ x: x0 + u * hh, y: h00 * y0 + h10 * hh * t[i] + h01 * y1 + h11 * hh * t[i + 1] });
            }
        }
        out.push({ x: P[N - 1].x, y: P[N - 1].y });
        if (opts.ymin != null || opts.ymax != null) {
            out.forEach(function (p) {
                if (opts.ymin != null && p.y < opts.ymin) p.y = opts.ymin;
                if (opts.ymax != null && p.y > opts.ymax) p.y = opts.ymax;
            });
        }
        return out;
    }

    function trace(ctx, pts, X, Y) {
        ctx.beginPath();
        for (var i = 0; i < pts.length; i++) {
            var px = X ? X(pts[i].x) : pts[i].x, py = Y ? Y(pts[i].y) : pts[i].y;
            if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
        }
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
    }

    /* Canvas nítido: dibuja en unidades lógicas (mínimo minW de ancho) y
       escala al tamaño real en pantalla × devicePixelRatio. */
    function hidpi(canvas, opts) {
        if (!canvas) return null;
        opts = opts || {};
        var ds = canvas.dataset || {};
        var bw = parseFloat(ds.gmBaseW) || canvas.width || 640;
        var bh = parseFloat(ds.gmBaseH) || canvas.height || 360;
        if (canvas.dataset) { canvas.dataset.gmBaseW = bw; canvas.dataset.gmBaseH = bh; }
        var ratio = opts.ratio || bh / bw;
        var rect = canvas.getBoundingClientRect();
        var cssW = Math.round(rect.width || canvas.clientWidth || 0) || bw;
        /* se respeta el alto que da la hoja de estilos (p. ej. 360 px) para no deformar */
        var cssH = Math.round(rect.height || 0);
        if (!cssH || opts.ratio) { cssH = Math.round(cssW * ratio); if (rect.width) canvas.style.height = cssH + 'px'; }
        var lw = Math.max(cssW, opts.minW || 520);
        var lh = Math.round(lw * cssH / cssW);
        var dpr = Math.min(2.5, global.devicePixelRatio || 1);
        canvas.width = Math.round(cssW * dpr);
        canvas.height = Math.round(cssH * dpr);
        var ctx = canvas.getContext('2d');
        var sc = (cssW * dpr) / lw;
        ctx.setTransform(sc, 0, 0, sc, 0, 0);
        ctx.clearRect(0, 0, lw, lh);
        return { ctx: ctx, w: lw, h: lh };
    }

    global.GeoCurvas = { monotone: monotone, trace: trace, hidpi: hidpi };
})(window);
