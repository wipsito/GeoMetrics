/**
 * GeoMetrics — service worker de la aplicación instalable (PWA).
 *
 * Sin internet funciona TODO menos Civix:
 * · Al instalarse descarga lo esencial (páginas, código, estilos, imágenes y librerías externas: ~12 MB) y queda
 *   lista para usarse sin conexión en pocos segundos.
 * · Después descarga en segundo plano lo pesado (audios del tutor, PDF, modelos 3D: ~45 MB). Si se interrumpe
 *   (se apaga el equipo, se cierra la app), continúa donde quedó la próxima vez que se abra con internet.
 * · Lo pesado se guarda en un almacén aparte que NO se borra al actualizar la app: solo se vuelve a descargar un
 *   archivo si cambió (precache.json trae la firma de cada uno: tamaño + fecha).
 * · Páginas, código y estilos: primero internet (los cambios subidos a GitHub llegan de inmediato); sin conexión o si
 *   internet tarda, la copia guardada.
 * · Civix (Worker de Cloudflare) y los datos en vivo de Firebase NUNCA se guardan: solo funcionan con internet.
 * La versión la cambia herramientas/actualizar-app.bat.
 */
var VERSION = 'geometrics-20261125-1836';
var MEDIOS = 'gm-medios';                                   /* imágenes, audios, PDF: se conserva entre versiones */
var FIRMAS = 'firmas.json';                                 /* dentro de MEDIOS: firma de cada archivo guardado */
var BASICO = ['./', 'index.html', 'manifest.webmanifest', 'precache.json', 'js/vendor/three.min.js'];
/* librerías externas que se guardan (las del index.html se agregan solas al instalar) */
var CDN = /^https:\/\/(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com|www\.gstatic\.com\/firebasejs)\//;
var MEDIA = /\.(png|jpe?g|webp|gif|svg|ico|mp3|wav|ogg|pdf|glb|woff2?|ttf)$/i;
var PESADO = /\.(mp3|wav|ogg|pdf|glb)$/i;
var ESPERA_RED = 3500;                                      /* ms: si internet no responde, se usa la copia */

function abs(u) { return new URL(u, self.registration.scope).href; }
function guardable(res) { return res && (res.ok || res.type === 'opaque'); }

/* ---------- lista de archivos ---------- */
function leerLista() {
    return fetch('precache.json', { cache: 'no-store' }).then(function (r) { return r.json(); })
        .catch(function () { return caches.match('precache.json').then(function (r) { return r ? r.json() : null; }); })
        .then(function (d) {
            d = d || {};
            var firmas = d.firmas || {};
            (d.archivos || []).forEach(function (a) { if (!(a in firmas)) firmas[a] = '1'; });
            return firmas;                                   /* { ruta: firma } */
        });
}
function leerFirmas(c) {
    return c.match(FIRMAS).then(function (r) { return r ? r.json() : {}; }).catch(function () { return {}; });
}
function escribirFirmas(c, f) {
    return c.put(FIRMAS, new Response(JSON.stringify(f), { headers: { 'Content-Type': 'application/json' } }));
}

/* descarga por lotes; en cache lo que falte. ok(ruta) se llama con cada archivo guardado */
function enLotes(cache, urls, n, ok) {
    var i = 0;
    function lote() {
        if (i >= urls.length) return Promise.resolve();
        var parte = urls.slice(i, i + n); i += n;
        return Promise.all(parte.map(function (u) {
            return fetch(u, { cache: 'reload' }).then(function (res) {
                if (guardable(res)) return cache.put(u, res).then(function () { if (ok) ok(u); });
            }).catch(function () { });
        })).then(lote);
    }
    return lote();
}
function faltantes(cache, urls) {
    return Promise.all(urls.map(function (u) { return cache.match(u).then(function (r) { return r ? null : u; }); }))
        .then(function (l) { return l.filter(Boolean); });
}

/* librerías externas que cita el index.html (Firebase, KaTeX, EmailJS, fuentes) */
function externasDelIndex(cache) {
    return cache.match('index.html').then(function (r) { return r ? r.text() : ''; }).then(function (html) {
        var urls = [], re = /(?:src|href)="(https:\/\/[^"]+)"/g, m;
        while ((m = re.exec(html))) if (CDN.test(m[1])) urls.push(m[1]);
        return faltantes(cache, urls).then(function (f) { return enLotes(cache, f, 4); });
    });
}

/* medios (imágenes / audios / PDF): solo lo que falta o cambió de firma */
var completando = null;
function completarMedios(soloLivianos) {
    if (completando && !soloLivianos) return completando;
    var p = Promise.all([leerLista(), caches.open(MEDIOS)]).then(function (x) {
        var lista = x[0], c = x[1];
        return leerFirmas(c).then(function (tengo) {
            var rutas = Object.keys(lista).filter(function (r) { return MEDIA.test(r) && (!soloLivianos || !PESADO.test(r)); });
            return Promise.all(rutas.map(function (r) {
                return c.match(r).then(function (res) { return res && tengo[r] === lista[r] ? null : r; });
            })).then(function (l) {
                var pend = l.filter(Boolean), total = pend.length, hechos = 0, ultimo = 0;
                if (!total) { if (!soloLivianos) avisar({ tipo: 'offline-listo', nuevos: 0 }); return; }
                function ok(r) {
                    tengo[r] = lista[r]; hechos++;
                    if (!soloLivianos && (hechos - ultimo >= 10 || hechos === total)) {
                        ultimo = hechos;
                        avisar({ tipo: 'offline-progreso', hechos: hechos, total: total });
                        return escribirFirmas(c, tengo);
                    }
                }
                return enLotes(c, pend, soloLivianos ? 8 : 4, ok).then(function () {
                    /* se borran del equipo los archivos que ya no están en la app */
                    Object.keys(tengo).forEach(function (r) { if (!(r in lista)) { delete tengo[r]; c.delete(r); } });
                    return escribirFirmas(c, tengo);
                }).then(function () { if (!soloLivianos) avisar({ tipo: 'offline-listo', nuevos: hechos, total: total }); });
            });
        });
    }).catch(function () { });
    if (!soloLivianos) { completando = p.then(function () { completando = null; }); return completando; }
    return p;
}
function avisar(msg) {
    return self.clients.matchAll({ includeUncontrolled: true }).then(function (cs) { cs.forEach(function (c) { c.postMessage(msg); }); });
}

/* ---------- instalación: lo esencial, rápido ---------- */
self.addEventListener('install', function (e) {
    e.waitUntil(caches.open(VERSION).then(function (c) {
        return enLotes(c, BASICO, 5)
            .then(function () { return externasDelIndex(c); })
            .then(function () { return leerLista(); })
            .then(function (lista) {
                var codigo = Object.keys(lista).filter(function (r) { return !MEDIA.test(r); });
                return enLotes(c, codigo, 10);
            })
            .then(function () { return completarMedios(true); })          /* imágenes y fuentes */
            .catch(function () { });
    }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
    e.waitUntil(caches.keys().then(function (ks) {
        return Promise.all(ks.filter(function (k) { return k !== VERSION && k.indexOf('geometrics-') === 0; }).map(function (k) {
            /* lo externo (librerías) se conserva pasándolo a la versión nueva antes de borrar la vieja */
            return caches.open(k).then(function (vieja) {
                return vieja.keys().then(function (reqs) {
                    return caches.open(VERSION).then(function (nueva) {
                        return Promise.all(reqs.filter(function (r) { return CDN.test(r.url); }).map(function (r) {
                            return nueva.match(r).then(function (ya) { return ya || vieja.match(r).then(function (res) { return res && nueva.put(r, res); }); });
                        }));
                    });
                });
            }).then(function () { return caches.delete(k); });
        }));
    }).then(function () { return self.clients.claim(); }));
});

/* ---------- respuestas ---------- */
function guardar(nombre, req, res) {
    if (guardable(res)) { var copia = res.clone(); caches.open(nombre).then(function (c) { c.put(req, copia); }); }
    return res;
}
function enCache(req) {
    return caches.match(req).then(function (r) { return r || caches.match(req, { ignoreSearch: true }); });
}
/* html, js, css, json: internet primero; sin conexión (o si tarda) la copia guardada */
function primeroRed(req) {
    var red = fetch(req).then(function (res) { return guardar(VERSION, req, res); });
    var copia = function () {
        return enCache(req).then(function (r) {
            if (r) return r;
            if (req.mode === 'navigate') return caches.match('index.html').then(function (i) { return i || red; });
            return red;
        });
    };
    if (self.navigator && self.navigator.onLine === false) return copia().catch(function () { return Response.error(); });
    var plazo = new Promise(function (ok) { setTimeout(ok, ESPERA_RED, 'plazo'); });
    return Promise.race([red.catch(function () { return 'error'; }), plazo]).then(function (r) {
        if (r !== 'plazo' && r !== 'error' && r && r.ok) return r;
        if (r !== 'plazo' && r !== 'error' && r) return enCache(req).then(function (c) { return c || r; });
        return copia();
    }).catch(function () { return Response.error(); });
}
function primeroCache(nombre, req) {
    return enCache(req).then(function (r) { return r || fetch(req).then(function (res) { return guardar(nombre, req, res); }); })
        .catch(function () { return Response.error(); });
}
/* audio por partes (Range) desde la copia guardada; si no está, se descarga completo una vez y se guarda */
function porPartes(req) {
    var url = req.url.split('#')[0];
    return enCache(url).then(function (r) {
        if (r) return r;
        return fetch(url).then(function (res) { return guardar(MEDIOS, url, res); });
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

/* la página pide completar la descarga de lo pesado (audios, PDF) cada vez que abre con internet */
self.addEventListener('message', function (e) {
    var d = e.data || {};
    if (d.tipo === 'completar') e.waitUntil(completarMedios(false));
});

self.addEventListener('fetch', function (e) {
    var req = e.request;
    if (req.method !== 'GET') return;                         /* POST (Civix, Firebase…) siempre por internet */
    var url = new URL(req.url);
    if (url.origin === self.location.origin) {
        if (/precache\.json$/.test(url.pathname)) return;     /* la lista siempre fresca desde internet */
        if (req.headers.has('range')) { e.respondWith(porPartes(req)); return; }
        if (MEDIA.test(url.pathname)) { e.respondWith(primeroCache(MEDIOS, req)); return; }
        e.respondWith(primeroRed(req));                       /* html, js, css, json */
        return;
    }
    if (CDN.test(req.url)) { e.respondWith(primeroCache(VERSION, req)); return; }
    /* todo lo demás (Worker de Civix, base de datos de Firebase, Google…) va directo a internet, sin guardar */
});
