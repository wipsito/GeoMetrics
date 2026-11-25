/**
 * GeoMetrics — aplicación instalable (PWA).
 * · Registra el service worker (sw.js) cuando la página se abre desde internet (GitHub Pages) o un servidor local.
 * · Guarda en el equipo los archivos de la primera visita para que la teoría y los simuladores funcionen sin conexión.
 * · Civix solo funciona con internet: sin conexión, cualquier llamada al Worker se detiene con un aviso claro.
 * · Muestra un aviso discreto al perder o recuperar la conexión.
 */
(function (global) {
    'use strict';
    var doc = document;

    /* 1 · service worker */
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
        global.addEventListener('load', function () {
            navigator.serviceWorker.register('sw.js').then(function () { return navigator.serviceWorker.ready; }).then(function (reg) {
                /* con internet: terminar de bajar lo pesado (audios, PDF) para usarlo sin conexión */
                if (navigator.onLine !== false && reg.active) reg.active.postMessage({ tipo: 'completar' });
            }).catch(function () { /* sin service worker la página funciona igual, solo que no sin conexión */ });
        });
        /* progreso de la descarga para uso sin internet (solo se muestra la primera vez o cuando hay archivos nuevos) */
        var mostroProgreso = false;
        navigator.serviceWorker.addEventListener('message', function (e) {
            var d = e.data || {};
            if (d.tipo === 'offline-progreso' && d.total >= 20) {
                mostroProgreso = true;
                avisar('Preparando GeoMetrics para usar sin internet… ' + Math.round(100 * d.hechos / d.total) + ' %', true, 60000);
            } else if (d.tipo === 'offline-listo' && mostroProgreso) {
                mostroProgreso = false;
                avisar('Listo: GeoMetrics ya funciona sin internet (menos Civix).', true);
            }
        });
    }

    /* 2 · Civix solo con internet: las llamadas al Worker se detienen con un mensaje claro si no hay conexión */
    var MSG = 'Civix necesita conexión a internet. Conéctate y vuelve a intentarlo; la teoría y los simuladores siguen funcionando sin conexión.';
    function origenCivix() {
        try { return global.AI_CONFIG && global.AI_CONFIG.backendUrl ? new URL(global.AI_CONFIG.backendUrl).origin : ''; } catch (e) { return ''; }
    }
    if (global.fetch) {
        var fetch0 = global.fetch.bind(global);
        global.fetch = function (input, init) {
            if (navigator.onLine === false) {
                var o = origenCivix(), u = typeof input === 'string' ? input : (input && input.url) || '';
                if (o && u.indexOf(o) === 0) return Promise.reject(new Error(MSG));
            }
            return fetch0(input, init);
        };
    }

    /* 3 · aviso de conexión */
    var aviso = null, tAviso = 0;
    function avisar(txt, ok, dura) {
        if (!doc.body) return;
        if (!aviso) {
            aviso = doc.createElement('div'); aviso.setAttribute('role', 'status'); aviso.setAttribute('aria-live', 'polite');
            aviso.style.cssText = 'position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:2147483600;padding:10px 16px;border-radius:12px;' +
                'font:600 13.5px/1.35 system-ui,sans-serif;color:#eef4ff;box-shadow:0 12px 30px rgba(0,0,0,.45);max-width:min(92vw,560px);text-align:center;transition:opacity .3s';
            doc.body.appendChild(aviso);
        }
        aviso.style.background = ok ? 'rgba(6,78,59,.95)' : 'rgba(127,29,29,.95)';
        aviso.style.border = '1px solid ' + (ok ? 'rgba(52,211,153,.5)' : 'rgba(248,113,113,.5)');
        aviso.textContent = txt; aviso.style.opacity = '1';
        clearTimeout(tAviso); tAviso = setTimeout(function () { if (aviso) aviso.style.opacity = '0'; }, dura || (ok ? 3500 : 6500));
    }
    global.addEventListener('offline', function () { avisar('Sin conexión: GeoMetrics sigue funcionando; solo Civix necesita internet y volverá cuando regrese la conexión.', false); });
    global.addEventListener('online', function () { avisar('Conexión restablecida: Civix ya está disponible.', true); });
})(window);
