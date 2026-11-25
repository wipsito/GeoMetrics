/**
 * GeoMetrics — service worker de la aplicación instalable (PWA).
 *
 * · Páginas, código y estilos: primero internet (así cada cambio subido a GitHub llega de inmediato); si no hay
 *   conexión, se usa la última copia guardada.
 * · Imágenes, íconos y librerías de CDN (three.js, fuentes): se guardan y se sirven desde el equipo.
 * · Audios del tutor: se guardan después de oírlos por primera vez.
 * · Civix (Worker de Cloudflare), Firebase y demás servicios: NUNCA se guardan; sin internet no funcionan.
 * Para forzar que todos los equipos descarguen todo de nuevo, cambia VERSION.
 */
var VERSION = 'geometrics-v1';
var BASICO = ['./', 'index.html', 'manifest.webmanifest', 'docs/GeoMetrics.png',
    'docs/icons/icon-192.png', 'docs/icons/icon-512.png', 'docs/icons/maskable-192.png', 'docs/icons/maskable-512.png', 'docs/icons/apple-180.png',
    'js/vendor/three.min.js'];   /* motor 3D: así los simuladores 3D abren sin conexión desde el primer día */
var CDN = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', function (e) {
    e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(BASICO).catch(function () { }); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); }));
});

function guardar(req, res) {
    if (res && (res.ok || res.type === 'opaque')) { var copia = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copia); }); }
    return res;
}
function primeroRed(req) {
    return fetch(req).then(function (res) { return guardar(req, res); }).catch(function () {
        return caches.match(req, { ignoreSearch: true }).then(function (r) {
            if (r) return r;
            if (req.mode === 'navigate') return caches.match('index.html');
            return Response.error();
        });
    });
}
function primeroCache(req) {
    return caches.match(req).then(function (r) { return r || fetch(req).then(function (res) { return guardar(req, res); }); });
}

/* la página le pasa la lista de archivos que ya cargó en la primera visita, para tenerlos sin conexión desde el inicio */
self.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.tipo !== 'guardar' || !d.urls) return;
    e.waitUntil(caches.open(VERSION).then(function (c) {
        return Promise.all(d.urls.map(function (u) {
            return c.match(u).then(function (ya) { if (ya) return; return fetch(u).then(function (res) { if (res.ok) return c.put(u, res); }).catch(function () { }); });
        }));
    }));
});

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;                         /* POST (Civix, Firebase…) siempre por internet */
    if (req.headers.has('range')) return;                     /* audio por partes: lo maneja el navegador */
    var url = new URL(req.url);
    if (url.origin === self.location.origin) {
        if (/\.(png|jpe?g|webp|gif|svg|ico|mp3|wav|ogg|woff2?|ttf)$/i.test(url.pathname)) { e.respondWith(primeroCache(req)); return; }
        e.respondWith(primeroRed(req));                       /* html, js, css, json */
        return;
    }
    if (CDN.test(req.url)) { e.respondWith(primeroCache(req)); return; }
    /* todo lo demás (Worker de Civix, Firebase, Google…) va directo a internet, sin guardar */
});
