/**
 * Civix CAD — FOTO DE UN PLANO A MANO → DXF (vectorización local, sin IA, sin tokens).
 *
 * Proceso (todo en el navegador): reducción de tamaño → gris → corrección de sombras (fondo local) →
 * umbral adaptativo → limpieza de manchas → adelgazamiento (Zhang-Suen) → trazado de trayectorias →
 * simplificación (Douglas-Peucker) → enderezado opcional (deskew + alineación a H/V) → escala real → DXF.
 *
 * ALCANCE: reconoce TRAZOS (líneas, curvas aproximadas por polilíneas). No lee texto ni cotas escritas a mano,
 * no reconoce símbolos ni distingue capas: el resultado es un borrador limpio para retocar en AutoCAD/LibreCAD.
 * Funciona mejor con papel claro, línea oscura, foto frontal y buena luz.
 *
 * API: CivixCAD.photo.vectorize(imageSource, opts) → {model, paths, stats, w, h}
 *      CivixCAD.photo.ui(host, file, opts)         → monta el editor con vista previa y controles
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || CAD.__photo) return; CAD.__photo = true;
    var doc = global.document;
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

    /* ───────────────────────── 1) imagen → matriz de grises ───────────────────────── */
    function toGray(src, maxSide) {
        var iw = src.naturalWidth || src.width, ih = src.naturalHeight || src.height, k = Math.min(1, maxSide / Math.max(iw, ih)), w = Math.max(2, Math.round(iw * k)), h = Math.max(2, Math.round(ih * k));
        var c = doc.createElement('canvas'); c.width = w; c.height = h; var x = c.getContext('2d', { willReadFrequently: true });
        x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(src, 0, 0, w, h);
        var d = x.getImageData(0, 0, w, h).data, g = new Uint8Array(w * h), i;
        for (i = 0; i < w * h; i++) g[i] = (d[4 * i] * 0.299 + d[4 * i + 1] * 0.587 + d[4 * i + 2] * 0.114) | 0;
        return { g: g, w: w, h: h, canvas: c };
    }

    /* fondo local por desenfoque de caja (imagen integral) */
    function boxBlur(g, w, h, r) {
        var I = new Float64Array((w + 1) * (h + 1)), x, y;
        for (y = 0; y < h; y++) { var row = 0; for (x = 0; x < w; x++) { row += g[y * w + x]; I[(y + 1) * (w + 1) + x + 1] = I[y * (w + 1) + x + 1] + row; } }
        var out = new Float32Array(w * h);
        for (y = 0; y < h; y++) {
            var y0 = Math.max(0, y - r), y1 = Math.min(h - 1, y + r);
            for (x = 0; x < w; x++) {
                var x0 = Math.max(0, x - r), x1 = Math.min(w - 1, x + r), a = (y1 - y0 + 1) * (x1 - x0 + 1);
                out[y * w + x] = (I[(y1 + 1) * (w + 1) + x1 + 1] - I[y0 * (w + 1) + x1 + 1] - I[(y1 + 1) * (w + 1) + x0] + I[y0 * (w + 1) + x0]) / a;
            }
        }
        return out;
    }

    /* ───────────────────────── 2) binarización + limpieza ───────────────────────── */
    function binarize(G, o) {
        var w = G.w, h = G.h, g = G.g, n = w * h, i, mean = 0;
        for (i = 0; i < n; i += 7) mean += g[i]; mean /= Math.ceil(n / 7);
        var inv = o.invert === 'auto' ? mean < 110 : !!o.invert, src = g;
        if (inv) { src = new Uint8Array(n); for (i = 0; i < n; i++) src[i] = 255 - g[i]; }
        var bg = boxBlur(src, w, h, Math.max(12, Math.round(Math.max(w, h) / 22))), bin = new Uint8Array(n), sens = o.sens;
        /* umbral de «tinta» (Otsu sobre el contraste): separa el trazo oscuro de la cuadrícula / líneas tenues del papel */
        var hist = new Float64Array(256), tot = 0, df = new Uint8Array(n);
        for (i = 0; i < n; i++) { var dv = bg[i] - src[i]; dv = dv < 0 ? 0 : (dv > 255 ? 255 : dv | 0); df[i] = dv; if (dv >= 8) { hist[dv]++; tot++; } }
        var otsu = 9, sumAll = 0, k; for (k = 8; k < 256; k++) sumAll += k * hist[k];
        if (tot > 200) { var wB = 0, sB = 0, best = -1; for (k = 8; k < 256; k++) { wB += hist[k]; if (!wB) continue; var wF = tot - wB; if (!wF) break; sB += k * hist[k]; var mB = sB / wB, mF = (sumAll - sB) / wF, bv = wB * wF * (mB - mF) * (mB - mF); if (bv > best) { best = bv; otsu = k; } } }
        var thr = 9 + Math.max(0, otsu - 9) * (o.grid == null ? 0.7 : o.grid);
        for (i = 0; i < n; i++) { bin[i] = (df[i] > thr && src[i] < bg[i] * (1 - sens)) ? 1 : 0; }
        /* quitar componentes pequeños (manchas, granos de papel) */
        var lab = new Int32Array(n), stack = new Int32Array(n), minA = Math.max(4, o.minBlob | 0), cur = 0, j;
        for (i = 0; i < n; i++) {
            if (!bin[i] || lab[i]) continue;
            cur++; var sp = 0, cnt = 0, members = []; stack[sp++] = i; lab[i] = cur;
            while (sp) {
                var p = stack[--sp]; members.push(p); cnt++;
                var px = p % w, py = (p / w) | 0;
                for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) {
                    if (!dx && !dy) continue; var qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue;
                    j = qy * w + qx; if (bin[j] && !lab[j]) { lab[j] = cur; stack[sp++] = j; }
                }
            }
            if (cnt < minA) for (j = 0; j < members.length; j++) bin[members[j]] = 0;
        }
        return { bin: bin, inverted: inv };
    }

    function dilate(bin, w, h, r) {
        if (r < 1) return bin; var out = new Uint8Array(bin), x, y, dx, dy, i;
        for (y = r; y < h - r; y++) for (x = r; x < w - r; x++) { i = y * w + x; if (!bin[i]) continue; for (dy = -r; dy <= r; dy++) for (dx = -r; dx <= r; dx++) out[i + dy * w + dx] = 1; }
        return out;
    }

    /* ───────────────────────── 3) adelgazamiento Zhang-Suen ───────────────────────── */
    function thin(bin, w, h) {
        var a = bin, x, y, i, changed = true, del = [], guard = 0;
        for (x = 0; x < w; x++) { a[x] = 0; a[(h - 1) * w + x] = 0; } for (y = 0; y < h; y++) { a[y * w] = 0; a[y * w + w - 1] = 0; }
        while (changed && guard++ < 60) {
            changed = false;
            for (var step = 0; step < 2; step++) {
                del.length = 0;
                for (y = 1; y < h - 1; y++) for (x = 1; x < w - 1; x++) {
                    i = y * w + x; if (!a[i]) continue;
                    var n = a[i - w], ne = a[i - w + 1], e = a[i + 1], se = a[i + w + 1], s = a[i + w], sw = a[i + w - 1], we = a[i - 1], nw = a[i - w - 1];
                    var B = n + ne + e + se + s + sw + we + nw; if (B < 2 || B > 6) continue;
                    var A = (!n && ne) + (!ne && e) + (!e && se) + (!se && s) + (!s && sw) + (!sw && we) + (!we && nw) + (!nw && n); if (A !== 1) continue;
                    if (step === 0) { if (n * e * s !== 0 || e * s * we !== 0) continue; } else { if (n * e * we !== 0 || n * s * we !== 0) continue; }
                    del.push(i);
                }
                if (del.length) { changed = true; for (i = 0; i < del.length; i++) a[del[i]] = 0; }
            }
        }
        return a;
    }

    function dropSmallComps(sk, w, h, minSide) { // elimina componentes del esqueleto pequeños (letras, números, manchas)
        if (!(minSide > 0)) return sk; var n = w * h, lab = new Int32Array(n), st = new Int32Array(n), i, j;
        for (i = 0; i < n; i++) {
            if (!sk[i] || lab[i]) continue; var sp = 0, mem = [], x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; st[sp++] = i; lab[i] = 1;
            while (sp) { var p = st[--sp]; mem.push(p); var px = p % w, py = (p / w) | 0; if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
                for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; var qx = px + dx, qy = py + dy; if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue; j = qy * w + qx; if (sk[j] && !lab[j]) { lab[j] = 1; st[sp++] = j; } } }
            if (Math.max(x1 - x0, y1 - y0) < minSide) for (j = 0; j < mem.length; j++) sk[mem[j]] = 0;
        }
        return sk;
    }

    /* ───────────────────────── 4) esqueleto → trayectorias ───────────────────────── */
    var NB = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    function trace(sk, w, h) {
        var n = w * h, deg = new Uint8Array(n), vis = new Uint8Array(n), paths = [], i, k;
        function nbrs(p) { var px = p % w, py = (p / w) | 0, r = []; for (var t = 0; t < 8; t++) { var qx = px + NB[t][0], qy = py + NB[t][1]; if (qx < 0 || qy < 0 || qx >= w || qy >= h) continue; var q = qy * w + qx; if (sk[q]) r.push(q); } return r; }
        for (i = 0; i < n; i++) if (sk[i]) deg[i] = nbrs(i).length;
        function walk(path) {
            var prev = path[0], cur = path[1];
            for (var guard = 0; guard < n; guard++) {
                if (deg[cur] !== 2 || (cur === path[0])) break;
                var c = nbrs(cur), nxt = -1, t;
                for (t = 0; t < c.length; t++) if (c[t] !== prev && !vis[c[t]]) { nxt = c[t]; if (deg[c[t]] !== 2) break; }
                if (nxt < 0) break;
                path.push(nxt); if (deg[nxt] === 2) vis[nxt] = 1; prev = cur; cur = nxt;
                if (deg[nxt] !== 2) break;
            }
            return path;
        }
        for (i = 0; i < n; i++) {
            if (!sk[i] || deg[i] === 2) continue;
            var nb = nbrs(i);
            for (k = 0; k < nb.length; k++) {
                var j = nb[k];
                if (deg[j] !== 2) { if (i < j) paths.push([i, j]); continue; }
                if (vis[j]) continue; vis[j] = 1;
                paths.push(walk([i, j]));
            }
        }
        /* lazos cerrados sin nodos */
        for (i = 0; i < n; i++) {
            if (!sk[i] || deg[i] !== 2 || vis[i]) continue;
            vis[i] = 1; var nb2 = nbrs(i), first = i, prev2 = i, cur2 = nb2[0], loop = [i];
            for (var g2 = 0; g2 < n; g2++) {
                loop.push(cur2); if (cur2 === first) break; vis[cur2] = 1;
                var c2 = nbrs(cur2), nx = -1; for (k = 0; k < c2.length; k++) if (c2[k] !== prev2) { nx = c2[k]; break; }
                if (nx < 0) break; prev2 = cur2; cur2 = nx;
            }
            paths.push(loop);
        }
        return paths.map(function (p) { return p.map(function (q) { return [q % w, (q / w) | 0]; }); });
    }

    function dp(pts, eps) { // Douglas-Peucker iterativo
        var n = pts.length; if (n < 3) return pts.slice();
        var keep = new Uint8Array(n), st = [[0, n - 1]]; keep[0] = keep[n - 1] = 1;
        while (st.length) {
            var s = st.pop(), a = pts[s[0]], b = pts[s[1]], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9, md = -1, mi = -1;
            for (var i = s[0] + 1; i < s[1]; i++) { var d = Math.abs(dy * (pts[i][0] - a[0]) - dx * (pts[i][1] - a[1])) / L; if (a[0] === b[0] && a[1] === b[1]) d = Math.hypot(pts[i][0] - a[0], pts[i][1] - a[1]); if (d > md) { md = d; mi = i; } }
            if (md > eps) { keep[mi] = 1; st.push([s[0], mi], [mi, s[1]]); }
        }
        var out = []; for (var k = 0; k < n; k++) if (keep[k]) out.push(pts[k]); return out;
    }
    function plen(p) { var L = 0; for (var i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; }

    /* ───────────────────────── 5) enderezado ───────────────────────── */
    function dominantAngle(paths) { // ángulo (rad) del eje dominante respecto de H/V, en [-45°, 45°]
        var bins = new Float64Array(180), tot = 0;
        paths.forEach(function (p) { for (var i = 1; i < p.length; i++) { var dx = p[i][0] - p[i - 1][0], dy = p[i][1] - p[i - 1][1], L = Math.hypot(dx, dy); if (L < 6) continue; var a = Math.atan2(dy, dx) * 180 / Math.PI; a = ((a % 90) + 90) % 90; if (a > 45) a -= 90; var b = Math.round((a + 45) * 2) % 180; bins[b] += L; tot += L; } });
        if (!tot) return 0; var best = 0, bv = -1, i;
        for (i = 0; i < 180; i++) { var v = bins[i] + 0.5 * (bins[(i + 1) % 180] + bins[(i + 179) % 180]); if (v > bv) { bv = v; best = i; } }
        return ((best / 2) - 45) * Math.PI / 180;
    }
    function rotate(paths, ang, cx, cy) { var c = Math.cos(-ang), s = Math.sin(-ang); paths.forEach(function (p) { p.forEach(function (q) { var x = q[0] - cx, y = q[1] - cy; q[0] = cx + x * c - y * s; q[1] = cy + x * s + y * c; }); }); }
    function snapCoords(paths, idx, tol) { // une coordenadas casi iguales (cluster 1D)
        var all = []; paths.forEach(function (p) { p.forEach(function (q) { all.push(q); }); });
        all.sort(function (a, b) { return a[idx] - b[idx]; });
        var i = 0; while (i < all.length) { var j = i, sum = all[i][idx]; while (j + 1 < all.length && all[j + 1][idx] - all[j][idx] <= tol) { j++; sum += all[j][idx]; } var m = sum / (j - i + 1); for (var k = i; k <= j; k++) all[k][idx] = m; i = j + 1; }
    }

    /* ───────────────────────── API principal ───────────────────────── */
    function vectorize(src, opts) {
        var o = Object.assign({ maxSide: 2000, join: 1, grid: 0.85, minComp: 0.07, margin: true, sens: 0.10, minBlob: 8, minLen: 14, eps: 2.0, invert: 'auto', straighten: true, snap: 4, realWidth: 10 }, opts || {});
        var G = toGray(src, o.maxSide), B = binarize(G, o), sk = dropSmallComps(thin(dilate(B.bin, G.w, G.h, o.join | 0), G.w, G.h), G.w, G.h, o.minComp * Math.max(G.w, G.h)), raw = trace(sk, G.w, G.h), w = G.w, h = G.h;
        var paths = raw.map(function (p) { return dp(p, o.eps); }).filter(function (p) { return p.length >= 2 && plen(p) >= o.minLen; });
        if (o.margin) { var mg = 0.09 * Math.max(w, h); paths = paths.filter(function (p) { return !(p.every(function (q) { return q[0] < mg; }) || p.every(function (q) { return q[0] > w - mg; }) || p.every(function (q) { return q[1] < mg; }) || p.every(function (q) { return q[1] > h - mg; })); }); }
        var ang = 0;
        if (o.straighten && paths.length) {
            ang = dominantAngle(paths);
            if (Math.abs(ang) > 0.0035 && Math.abs(ang) < 0.5) rotate(paths, ang, w / 2, h / 2); else ang = 0;
            snapCoords(paths, 0, o.snap); snapCoords(paths, 1, o.snap);
        }
        paths = paths.map(function (p) { var q = [p[0]]; for (var i = 1; i < p.length; i++) if (Math.hypot(p[i][0] - q[q.length - 1][0], p[i][1] - q[q.length - 1][1]) > 0.5) q.push(p[i]); return q; }).filter(function (p) { return p.length >= 2; });
        /* escala */
        var minx = 1e9, miny = 1e9, maxx = -1e9, maxy = -1e9;
        paths.forEach(function (p) { p.forEach(function (q) { if (q[0] < minx) minx = q[0]; if (q[0] > maxx) maxx = q[0]; if (q[1] < miny) miny = q[1]; if (q[1] > maxy) maxy = q[1]; }); });
        var bw = Math.max(1, maxx - minx), bh = Math.max(1, maxy - miny), s = (o.realWidth > 0 ? o.realWidth * 1000 : bw) / bw;
        var ents = [], segs = 0;
        paths.forEach(function (p) {
            var pts = p.map(function (q) { return [(q[0] - minx) * s, (maxy - q[1]) * s, 0]; }), closed = false;
            if (pts.length > 2 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 2 * s) { pts.pop(); closed = true; }
            segs += pts.length - (closed ? 0 : 1);
            ents.push({ t: 'poly', layer: 'TRAZO', pts: pts, closed: closed, keepPoly: true });
        });
        var model = { ents: ents, layers: { TRAZO: { name: 'TRAZO', aci: 7 } }, warn: [], units: 4, blocks: {} };
        model.bbox = ents.length ? CAD.bboxOf(ents) : [0, 0, 1, 1];
        return { model: model, paths: paths, w: w, h: h, scale: s, stats: { poly: ents.length, segs: segs, inverted: B.inverted, angle: ang * 180 / Math.PI, widthMm: bw * s, heightMm: bh * s }, canvas: G.canvas };
    }

    /* ───────────────────────── Interfaz ───────────────────────── */
    function loadFile(file) {
        return new Promise(function (res, rej) {
            var url = URL.createObjectURL(file), img = new Image();
            img.onload = function () { res({ img: img, url: url }); };
            img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('No pude abrir la imagen (usa JPG, PNG o WEBP).')); };
            img.src = url;
        });
    }
    function download(name, blob) { if (CAD.download) CAD.download(name, blob); else { var a = doc.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; doc.body.appendChild(a); a.click(); a.remove(); } }

    function ui(host, file, opts) {
        opts = opts || {}; host.innerHTML = '';
        var box = el('div', 'cxf'), info = el('p', 'cxf-info', '⏳ Procesando imagen…'); box.appendChild(info); host.appendChild(box);
        loadFile(file).then(function (L) {
            var st = { sens: 0.10, minLen: 14, eps: 2.0, join: 1, grid: 0.85, minComp: 0.07, margin: true, straighten: true, invert: 'auto', realWidth: 10, maxSide: 2000 }, res = null, timer = null, nm = String(file.name || 'plano').replace(/\.[a-z0-9]+$/i, '') + '_civix';
            box.innerHTML = '';
            var grid = el('div', 'cxf-grid'), left = el('div', 'cxf-prev'), right = el('div', 'cxf-ctl');
            var cv = el('canvas', 'cxf-canvas'); left.appendChild(cv); var stats = el('p', 'cxf-stats', ''); left.appendChild(stats);
            function ctl(key, label, min, max, step, fmt, hint) {
                var w = el('label', 'cxf-f'), v = el('b', null, fmt(st[key])), inp = el('input'); inp.type = 'range'; inp.min = min; inp.max = max; inp.step = step; inp.value = st[key];
                w.appendChild(el('span', null, esc(label) + ' ')); w.lastChild.appendChild(v); w.appendChild(inp); if (hint) w.appendChild(el('small', null, hint));
                inp.addEventListener('input', function () { st[key] = parseFloat(inp.value); v.textContent = fmt(st[key]); schedule(); }); return w;
            }
            right.appendChild(ctl('sens', 'Sensibilidad del trazo', 0.01, 0.5, 0.01, function (x) { return Math.round(x * 100) + ' %'; }, 'BAJA este valor para captar más líneas (también las tenues); súbelo si aparece ruido o sombras.'));
            right.appendChild(ctl('maxSide', 'Resolución de análisis', 800, 3000, 100, function (x) { return x + ' px'; }, 'Más alta = capta líneas finas y detalles (más lento). Usa 2500–3000 en planos grandes.'));
            right.appendChild(ctl('grid', 'Ignorar cuadrícula del cuaderno / líneas tenues', 0, 1, 0.05, function (x) { return Math.round(x * 100) + ' %'; }, 'Sube hasta que desaparezca la cuadrícula y solo quede el trazo oscuro.'));
            right.appendChild(ctl('minComp', 'Descartar texto y detalles pequeños', 0, 0.3, 0.01, function (x) { return Math.round(x * 100) + ' % del tamaño'; }, 'Elimina letras, números y garabatos; conserva muros, ejes y cotas largas. Bájalo a 0 para conservarlo todo.'));
            right.appendChild(ctl('join', 'Unir trazos cercanos / punteados', 0, 4, 1, function (x) { return x + ' px'; }, 'Cierra pequeños huecos (líneas de eje, trazos discontinuos).'));
            right.appendChild(ctl('minLen', 'Limpieza de ruido (longitud mínima)', 4, 80, 1, function (x) { return x + ' px'; }, 'Elimina trazos cortos y manchas.'));
            right.appendChild(ctl('eps', 'Suavizado de líneas', 0.5, 8, 0.5, function (x) { return x.toFixed(1) + ' px'; }, 'Más alto = menos vértices (líneas más rectas).'));
            var chkS = el('label', 'cxf-chk'), cs = el('input'); cs.type = 'checkbox'; cs.checked = true; chkS.appendChild(cs); chkS.appendChild(doc.createTextNode(' Enderezar (corregir inclinación y alinear a horizontal/vertical)')); right.appendChild(chkS);
            cs.addEventListener('change', function () { st.straighten = cs.checked; schedule(); });
            var chkM = el('label', 'cxf-chk'), cm = el('input'); cm.type = 'checkbox'; cm.checked = true; chkM.appendChild(cm); chkM.appendChild(doc.createTextNode(' Ignorar márgenes y bordes de la hoja (espiral, margen del cuaderno)')); right.appendChild(chkM);
            cm.addEventListener('change', function () { st.margin = cm.checked; schedule(); });
            var chkI = el('label', 'cxf-chk'), ci = el('select'); [['auto', 'Fondo claro / oscuro: automático'], ['0', 'Trazo oscuro sobre papel claro'], ['1', 'Trazo claro sobre fondo oscuro (plano azul)']].forEach(function (o) { var op = el('option', null, esc(o[1])); op.value = o[0]; ci.appendChild(op); }); chkI.appendChild(ci); right.appendChild(chkI);
            ci.addEventListener('change', function () { st.invert = ci.value === 'auto' ? 'auto' : ci.value === '1'; schedule(); });
            var wrow = el('label', 'cxf-f'), wi = el('input'); wi.type = 'number'; wi.min = 0.1; wi.max = 2000; wi.step = 'any'; wi.value = st.realWidth; wrow.appendChild(el('span', null, 'Ancho real del dibujo (m)')); wrow.appendChild(wi); wrow.appendChild(el('small', null, 'Mide una dimensión conocida del plano para que el DXF salga a escala (unidades: mm).'));
            wi.addEventListener('input', function () { var v = parseFloat(wi.value.replace(',', '.')); if (v > 0) { st.realWidth = v; schedule(); } }); right.appendChild(wrow);
            var bar = el('div', 'cxf-btns');
            function btn(label, fn, cls) { var b = el('button', 'cx-btn' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.addEventListener('click', function () { try { fn(b); } catch (e) { b.textContent = '⚠ ' + (e.message || 'error'); } }); bar.appendChild(b); return b; }
            btn('⬇ Descargar DXF', function () { if (!res || !res.model.ents.length) throw new Error('Sin trazos'); download(nm + '.dxf', new Blob([CAD.writeDXF(res.model)], { type: 'application/dxf' })); }, 'cxp-go');
            var vbox = el('div', 'cx-box'); vbox.hidden = true;
            btn('👁 Ver en visor CAD', function (b) { if (!res) return; vbox.hidden = !vbox.hidden; b.textContent = vbox.hidden ? '👁 Ver en visor CAD' : '🙈 Ocultar visor'; if (!vbox.hidden) { vbox.innerHTML = ''; CAD.viewer(vbox, res.model, { name: nm, extra: 'Vectorización de tu foto · capa TRAZO · unidades mm.' }); } });
            right.appendChild(bar);
            right.appendChild(el('p', 'cxf-note', '⚠ Se convierten <b>trazos</b> (líneas y curvas como polilíneas). El <b>texto, las cotas escritas y los símbolos no se reconocen</b>. Es un borrador para retocar en AutoCAD/LibreCAD. Revisa siempre las medidas.'));
            grid.appendChild(left); grid.appendChild(right); box.appendChild(grid); box.appendChild(vbox);

            function draw() {
                var W = Math.min(720, res.w), k = W / res.w, Hh = Math.round(res.h * k); cv.width = W; cv.height = Hh; var x = cv.getContext('2d');
                x.globalAlpha = 0.45; x.drawImage(res.canvas, 0, 0, W, Hh); x.globalAlpha = 1; x.fillStyle = 'rgba(8,16,32,.35)'; x.fillRect(0, 0, W, Hh);
                x.strokeStyle = '#22D3EE'; x.lineWidth = 1.6; x.lineJoin = 'round';
                // las rutas están rotadas/ajustadas: se redibujan desde el modelo en coordenadas de imagen
                res.paths.forEach(function (p) { x.beginPath(); p.forEach(function (q, i) { i ? x.lineTo(q[0] * k, q[1] * k) : x.moveTo(q[0] * k, q[1] * k); }); x.stroke(); });
                stats.innerHTML = '<b>' + res.stats.poly + '</b> polilíneas · <b>' + res.stats.segs + '</b> segmentos · dibujo de <b>' + (res.stats.widthMm / 1000).toFixed(2) + ' × ' + (res.stats.heightMm / 1000).toFixed(2) + ' m</b>' + (Math.abs(res.stats.angle) > 0.2 ? ' · inclinación corregida ' + res.stats.angle.toFixed(1) + '°' : '') + (res.stats.inverted ? ' · fondo oscuro detectado' : '');
                if (!res.stats.poly) stats.innerHTML += '<br><span class="cx-err">No se detectaron trazos: sube la sensibilidad o usa una foto con más contraste.</span>';
            }
            function run() { res = vectorize(L.img, { sens: st.sens, minLen: st.minLen, eps: st.eps, join: st.join, grid: st.grid, minComp: st.minComp, margin: st.margin, straighten: st.straighten, invert: st.invert, realWidth: st.realWidth, maxSide: st.maxSide }); draw(); if (!vbox.hidden) { vbox.innerHTML = ''; CAD.viewer(vbox, res.model, { name: nm }); } if (opts.onResult) opts.onResult(res); }
            function schedule() { clearTimeout(timer); stats.textContent = '⏳ …'; timer = setTimeout(function () { try { run(); } catch (e) { stats.innerHTML = '<span class="cx-err">⚠ ' + esc(e.message) + '</span>'; } }, 220); }
            setTimeout(function () { try { run(); } catch (e) { box.innerHTML = '<p class="cx-err">⚠ ' + esc(e.message) + '</p>'; } }, 30);
        }).catch(function (e) { info.className = 'cx-err'; info.textContent = '⚠ ' + (e.message || e); });
    }
    CAD.photo = { vectorize: vectorize, ui: ui };

    /* ───────────────────────── pestaña en Planos y CAD ───────────────────────── */
    function addTab() {
        var panel = doc.getElementById('civixViewCad'); if (!panel || panel.__photo) return false; panel.__photo = true;
        var tabs = panel.querySelector('.cxp-tabs'); if (!tabs) return false;
        var t = el('button', 'cxp-tab', '📷 Foto → DXF'); t.setAttribute('data-t', 'foto'); t.type = 'button'; tabs.appendChild(t);
        var sec = el('section', 'cxp-sec'); sec.setAttribute('data-s', 'foto'); sec.hidden = true; panel.appendChild(sec);
        t.addEventListener('click', function () { panel.querySelectorAll('.cxp-tab').forEach(function (x) { x.classList.toggle('on', x === t); }); panel.querySelectorAll('.cxp-sec').forEach(function (s) { s.hidden = s.getAttribute('data-s') !== 'foto'; }); });
        tabs.querySelectorAll('.cxp-tab').forEach(function (b) { if (b !== t) b.addEventListener('click', function () { t.classList.remove('on'); sec.hidden = true; }); });
        sec.appendChild(el('p', 'cxp-note', '📷 <b>Convierte la foto de un plano hecho a mano en un archivo DXF.</b> Toma la foto de frente, con buena luz y sobre papel claro. Todo se procesa en tu navegador: la imagen no se sube a ningún servidor y no gasta tokens.'));
        var drop = el('div', 'cxf-drop'), editor = el('div', 'cxf-editor');
        var f1 = el('input'); f1.type = 'file'; f1.accept = 'image/*'; f1.hidden = true; var f2 = el('input'); f2.type = 'file'; f2.accept = 'image/*'; f2.setAttribute('capture', 'environment'); f2.hidden = true;
        var b1 = el('button', 'cx-btn cxp-go', '🖼 Elegir imagen'), b2 = el('button', 'cx-btn', '📸 Tomar foto'); b1.type = b2.type = 'button';
        drop.appendChild(el('div', 'cxf-drop-t', 'Arrastra aquí la foto del plano o elige un archivo (JPG, PNG, WEBP)')); drop.appendChild(b1); drop.appendChild(b2); drop.appendChild(f1); drop.appendChild(f2);
        b1.onclick = function () { f1.click(); }; b2.onclick = function () { f2.click(); };
        function take(f) { if (f && /^image\//.test(f.type)) ui(editor, f); }
        f1.onchange = function () { take(f1.files[0]); }; f2.onchange = function () { take(f2.files[0]); };
        drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); }); drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
        drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); take(e.dataTransfer.files[0]); });
        sec.appendChild(drop); sec.appendChild(editor);
        return true;
    }
    function waitTab(n) { if (addTab()) return; if (n < 40) setTimeout(function () { waitTab(n + 1); }, 250); }
    if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { waitTab(0); }); else waitTab(0); }

    /* ───────────────────────── Chat: imagen adjunta + «conviértelo a DXF» ───────────────────────── */
    var prevSend = CAD.onSend;
    CAD.onSend = function (texto, adj) {
        try {
            var f = global.__civixLastFile, t = String(texto || '').toLowerCase();
            if (f && adj && adj.name === f.name && /^image\//.test(f.type || '') && (!t.trim() || /dxf|plano|cad|vectoriz|digitaliz|convierte|convertir|convert|pasa|pasar|transform|croquis|boceto|dibujo|a mano|autocad|traza/.test(t))) {
                var chat = doc.getElementById('chatMensajes'); if (chat) {
                    var card = el('div', 'mensaje mensaje-bot mensaje-bot-rich cx-card'); chat.appendChild(card);
                    var m = el('div', 'civix-md', '📷 Vectoricé tu foto <b>' + esc(f.name) + '</b> en tu navegador (sin gastar tokens). Ajusta la <b>sensibilidad</b>, el <b>ancho real</b> y el enderezado hasta que el trazo cian siga tu dibujo, y luego descarga el <b>DXF</b>. El texto y las cotas escritas a mano no se reconocen.');
                    card.appendChild(m); var host = el('div'); card.appendChild(host); ui(host, f);
                    try { if (typeof chatHistory !== 'undefined') { chatHistory.push({ role: 'user', content: (texto || 'Convierte esta foto de plano a DXF') + ' [foto: ' + f.name + ']' }); chatHistory.push({ role: 'assistant', content: 'Convertí la foto del plano a polilíneas DXF con vectorización local (trazos, sin texto).' }); } if (typeof civixGuardarConversacionActual === 'function') civixGuardarConversacionActual(); } catch (e) { }
                    chat.scrollTop = chat.scrollHeight; return true;
                }
            }
        } catch (e) { try { console.warn('CivixCAD foto', e); } catch (e2) { } }
        return prevSend ? prevSend.apply(this, arguments) : false;
    };
})(typeof window !== 'undefined' ? window : globalThis);
