/**
 * GeoMetrics — service worker de la aplicación instalable (PWA).
 *
 * Sin internet funciona TODO menos Civix:
 * · Al instalarse descarga la app completa (lista en precache.json: páginas, código, imágenes, PDF, audios del tutor)
 *   más las librerías externas (Firebase, KaTeX, fuentes…).
 * · Páginas, código y estilos: primero internet (cada cambio subido a GitHub llega de inmediato); sin conexión, la copia
 *   guardada.
 * · Imágenes, PDF, audios y librerías: desde el equipo.
 * · Los audios se sirven por partes (Range), como los pide el reproductor, también sin conexión.
 * · Civix (Worker de Cloudflare) y los datos en vivo de Firebase NUNCA se guardan: solo funcionan con internet.
 * La versión la cambia herramientas/actualizar-app.bat.
 */
var VERSION = 'geometrics-20261125-1143';
var BASICO = ['./', 'index.html', 'manifest.webmanifest', 'precache.json', 'docs/GeoMetrics.png',
    'docs/icons/icon-192.png', 'docs/icons/icon-512.png', 'docs/icons/maskable-192.png', 'docs/icons/maskable-512.png', 'docs/icons/apple-180.png',
    'js/vendor/three.min.js'];
/* librerías externas que se guardan (las del index.html se agregan solas al instalar) */
var CDN = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com\/firebasejs)\//;
var MEDIA = /\.(png|jpe?g|webp|gif|svg|ico|mp3|wav|ogg|pdf|glb|woff2?|ttf)$/i;

function enLotes(cache, urls, n) {
    var i = 0;
    function lote() {
        if (i >= urls.length) return Promise.resolve();
        var parte = urls.slice(i, i + n); i += n;
        return Promise.all(parte.map(function (u) {
            return cache.match(u).then(function (ya) {
                if (ya) return;
                return fetch(u, { cache: 'reload' }).then(function (res) { if (res.ok || res.type === 'opaque') return cache.put(u, res); }).catch(function () { });
            });
        })).then(lote);
    }
    return lote();
}
/* librerías externas que cita el index.html (Firebase, KaTeX, EmailJS, fuentes) */
function externasDelIndex(cache) {
    return cache.match('index.html').then(function (r) { return r ? r.text() : ''; }).then(function (html) {
        var urls = [], re = /(?:src|href)="(https:\/\/[^"]+)"/g, m;
        while ((m = re.exec(html))) if (CDN.test(m[1])) urls.push(m[1]);
        return enLotes(cache, urls, 4);
    });
}

self.addEventListener('install', function (e) {
    e.waitUntil(caches.open(VERSION).then(function (c) {
        return c.addAll(BASICO).catch(function () { })
            .then(function () { return externasDelIndex(c); })
            .then(function () { return c.match('precache.json'); })
            .then(function (r) { return r ? r.json() : { archivos: [] }; })
            .then(function (d) { return enLotes(c, (d && d.archivos) || [], 8); })
            .catch(function () { });
    }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k !== VERSION && k.indexOf('geometrics-') === 0; }).map(function (k) { return caches.delete(k); }));
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
/* audio por partes (Range) desde la copia guardada; si no está, se descarga completo una vez y se guarda */
function porPartes(req) {
    var url = req.url;
    return caches.match(url).then(function (r) {
        if (r) return r;
        return fetch(url).then(function (res) { if (res.ok) { var cp = res.clone(); caches.open(VERSION).then(function (c) { c.put(url, cp); }); } return res; });
    }).then(function (res) {
        if (!res || !res.ok) return res;
        var tipo = res.headers.get('Content-Type') || 'audio/mpeg';
        return res.arrayBuffer().then(function (buf) {
            var m = /bytes=(\d*)-(\d*)/.exec(req.headers.get('range') || ''), total = buf.byteLength;
            var ini = m && m[1] ? parseInt(m[1], 10) : 0, fin = m && m[2] ? parseInt(m[2], 10) : total - 1;
            if (!m || !m[1] && m[2]) { ini = Math.max(0, total - parseInt(m && m[2] || total, 10)); fin = total - 1; }
            fin = Math.min(fin, total - 1);
            return new Response(buf.slice(ini, fin + 1), { status: 206, statusText: 'Partial Content', headers: {
                'Content-Type': tipo, 'Content-Range': 'bytes ' + ini + '-' + fin + '/' + total, 'Content-Length': String(fin - ini + 1), 'Accept-Ranges': 'bytes' } });
        });
    }).catch(function () { return Response.error(); });
}

/* la página le pasa los archivos que ya cargó, para tenerlos aunque la instalación siga descargando el resto */
self.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.tipo !== 'guardar' || !d.urls) return;
    e.waitUntil(caches.open(VERSION).then(function (c) { return enLotes(c, d.urls, 6); }));
});

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;                         /* POST (Civix, Firebase…) siempre por internet */
    var url = new URL(req.url);
    if (url.origin === self.location.origin) {
        if (req.headers.has('range')) { e.respondWith(porPartes(req)); return; }
        if (MEDIA.test(url.pathname)) { e.respondWith(primeroCache(req)); return; }
        e.respondWith(primeroRed(req));                       /* html, js, css, json */
        return;
    }
    if (CDN.test(req.url)) { e.respondWith(primeroCache(req)); return; }
    /* todo lo demás (Worker de Civix, base de datos de Firebase, Google…) va directo a internet, sin guardar */
});
