/**
 * GeoMetrics — Tema de gráficas
 * Las gráficas de los ensayos se dibujan sobre "papel" blanco (papel logarítmico / milimetrado).
 * Este módulo vuelve a pintar el resultado con el azul de la paleta (#151F32): el papel blanco pasa al fondo azul,
 * la tinta negra pasa a texto claro y los colores vivos (curvas, puntos) se conservan.
 * Se aplica automáticamente después de cada función grafica*() de app.js.
 */
(function (global) {
    'use strict';
    var BG = [0x15, 0x1F, 0x32], FG = [0xF1, 0xF5, 0xF9];

    function themeCanvas(cv) {
        if (!cv || !cv.width || !cv.height) return;
        var ctx;
        try { ctx = cv.getContext('2d'); } catch (e) { return; }
        if (!ctx) return;
        var probe = ctx.getImageData(2, 2, 1, 1).data;
        if (probe[3] < 200 || (probe[0] + probe[1] + probe[2]) / 3 < 215) return;       /* ya es oscuro o transparente */
        var img = ctx.getImageData(0, 0, cv.width, cv.height), d = img.data;
        for (var i = 0; i < d.length; i += 4) {
            if (d[i + 3] === 0) continue;
            var r = d[i], g = d[i + 1], b = d[i + 2];
            var mx = Math.max(r, g, b), mn = Math.min(r, g, b);
            var lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255, chroma = (mx - mn) / 255, t = 1 - lum;
            var gr = BG[0] + (FG[0] - BG[0]) * t, gg = BG[1] + (FG[1] - BG[1]) * t, gb = BG[2] + (FG[2] - BG[2]) * t;
            var keep = Math.min(1, chroma * 2.6);
            if (keep > 0) {
                var f = lum > 0.6 ? 1 - (lum - 0.6) * 1.7 : 1;           /* pasteles → tonos más oscuros */
                gr += (r * f - gr) * keep; gg += (g * f - gg) * keep; gb += (b * f - gb) * keep;
            }
            d[i] = gr; d[i + 1] = gg; d[i + 2] = gb;
        }
        ctx.putImageData(img, 0, 0);
    }

    function themeAll() {
        var list = document.querySelectorAll('.grafica-panel canvas, .rm-grafica-panel canvas');
        for (var i = 0; i < list.length; i++) themeCanvas(list[i]);
    }

    function wrap(name) {
        var fn = global[name];
        if (typeof fn !== 'function' || fn.__themed) return;
        var w = function () {
            var out = fn.apply(this, arguments);
            try { themeAll(); } catch (e) { console.warn('chart-theme', e); }
            return out;
        };
        w.__themed = true;
        try { global[name] = w; } catch (e) {}
    }

    function init() {
        Object.keys(global).forEach(function (k) { if (/^grafica[A-Z]/.test(k)) wrap(k); });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
    global.GeoChartTheme = { apply: themeAll };
})(window);
