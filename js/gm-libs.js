/* ============================================================
   GeoMetrics — carga diferida de las librerías pesadas
   SheetJS (~900 KB) y Plotly (~3,5 MB) se descargaban y se
   interpretaban en CADA visita antes de pintar nada, justo
   mientras se ve la pantalla de carga: eso bloqueaba el hilo
   principal y hacía que la animación fuera a tirones.

   Aquí se cargan solas, en segundo plano, cuando la pantalla de
   carga ya se fue y el navegador está desocupado. Todos los usos
   en app.js ya comprueban `typeof Plotly/XLSX === 'undefined'`,
   así que nada se rompe si todavía no han llegado.

   Si quieres volver al comportamiento anterior, borra este
   archivo y devuelve las dos etiquetas <script> a index.html.
   ============================================================ */
(function () {
    'use strict';

    var CDN = {
        XLSX: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
        Plotly: 'https://cdn.plot.ly/plotly-2.35.2.min.js'
    };
    var pend = {};

    function cargar(nombre) {
        if (window[nombre]) return Promise.resolve(window[nombre]);
        if (pend[nombre]) return pend[nombre];
        pend[nombre] = new Promise(function (res, rej) {
            var s = document.createElement('script');
            s.src = CDN[nombre];
            s.async = true;
            s.onload = function () { res(window[nombre]); };
            s.onerror = function () { pend[nombre] = null; rej(new Error('No se pudo cargar ' + nombre)); };
            (document.head || document.documentElement).appendChild(s);
        });
        return pend[nombre];
    }

    var ocioso = window.requestIdleCallback || function (f) { return setTimeout(f, 900); };

    function precargar() {
        /* primero la ligera, luego Plotly, cada una en un hueco libre */
        ocioso(function () {
            cargar('XLSX')['catch'](function () { });
            ocioso(function () { cargar('Plotly')['catch'](function () { }); }, { timeout: 6000 });
        }, { timeout: 4000 });
    }

    function cargaVisible() {
        var l = document.getElementById('geo-loader');
        if (!l) return false;
        if (l.classList.contains('gl-out')) return false;
        return l.style.display !== 'none';
    }

    function arrancar() {
        if (!cargaVisible()) { precargar(); return; }
        var n = 0;
        var t = setInterval(function () {
            if (!cargaVisible() || ++n > 60) { clearInterval(t); precargar(); }
        }, 300);
    }

    if (document.readyState === 'complete') setTimeout(arrancar, 0);
    else window.addEventListener('load', arrancar);

    /* por si algún día quieres pedirlas a mano: GMLibs.plotly().then(...) */
    window.GMLibs = {
        plotly: function () { return cargar('Plotly'); },
        xlsx: function () { return cargar('XLSX'); },
        listo: function (n) { return !!window[n]; }
    };
})();
