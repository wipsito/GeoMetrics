/**
 * Civix CAD — extras: perfil longitudinal, volúmenes de corte/relleno, mapa hipsométrico,
 * pendientes, cajetín (rótulo), exportación a PDF y «estudio» de curvas de nivel.
 * Todo se calcula en el navegador a partir del TIN que genera CivixCAD.contours().
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || CAD.__extra) return; CAD.__extra = true;
    var PI = Math.PI;
    function f(v, d) { return (+v).toFixed(d == null ? 2 : d); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

    /* ---------- interpolación sobre el TIN ---------- */
    function zAt(tin, x, y) {
        for (var i = 0; i < tin.length; i++) {
            var t = tin[i], a = t[0], b = t[1], c = t[2], d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y);
            if (Math.abs(d) < 1e-12) continue;
            var l1 = ((b.y - c.y) * (x - c.x) + (c.x - b.x) * (y - c.y)) / d, l2 = ((c.y - a.y) * (x - c.x) + (a.x - c.x) * (y - c.y)) / d, l3 = 1 - l1 - l2, e = -1e-9;
            if (l1 >= e && l2 >= e && l3 >= e) return l1 * a.z + l2 * b.z + l3 * c.z;
        }
        return null;
    }
    CAD.zAt = zAt;

    /* ---------- perfil longitudinal ---------- */
    function profile(res, A, B, n) {
        n = n || 200; var L = Math.hypot(B[0] - A[0], B[1] - A[1]), out = [], i;
        for (i = 0; i <= n; i++) { var t = i / n, x = A[0] + (B[0] - A[0]) * t, y = A[1] + (B[1] - A[1]) * t; out.push({ d: L * t, x: x, y: y, z: zAt(res.tin, x, y) }); }
        var ok = out.filter(function (p) { return p.z != null; });
        var stats = null;
        if (ok.length > 1) {
            var zmin = Infinity, zmax = -Infinity, up = 0, down = 0, maxS = 0;
            ok.forEach(function (p, k) { zmin = Math.min(zmin, p.z); zmax = Math.max(zmax, p.z); if (k) { var dz = p.z - ok[k - 1].z, dd = p.d - ok[k - 1].d || 1e-9; if (dz > 0) up += dz; else down -= dz; maxS = Math.max(maxS, Math.abs(dz / dd) * 100); } });
            stats = { length: L, zmin: zmin, zmax: zmax, up: up, down: down, avgSlope: (ok[ok.length - 1].z - ok[0].z) / (ok[ok.length - 1].d - ok[0].d || 1) * 100, maxSlope: maxS, outside: out.length - ok.length };
        }
        return { samples: out, stats: stats, L: L };
    }
    CAD.profile = profile;
    function drawProfile(canvas, pr, vex) {
        var ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height, ok = pr.samples.filter(function (p) { return p.z != null; }); ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#0F1A2D'; ctx.fillRect(0, 0, W, H);
        if (ok.length < 2) { ctx.fillStyle = '#FDA4AF'; ctx.font = '14px Inter, sans-serif'; ctx.fillText('El eje queda fuera de la superficie del terreno.', 20, 40); return; }
        var zmin = pr.stats.zmin, zmax = pr.stats.zmax, pad = Math.max((zmax - zmin) * 0.12, 0.5), y0 = zmin - pad, y1 = zmax + pad, L = 56, R = 16, T = 28, B = 42, pw = W - L - R, ph = H - T - B;
        function X(d) { return L + d / pr.L * pw; } function Y(z) { return T + ph - (z - y0) / (y1 - y0) * ph; }
        ctx.strokeStyle = 'rgba(148,163,184,.15)'; ctx.fillStyle = '#94A3B8'; ctx.font = '11px Inter, sans-serif'; ctx.textAlign = 'right';
        for (var k = 0; k <= 5; k++) { var z = y0 + (y1 - y0) * k / 5; ctx.beginPath(); ctx.moveTo(L, Y(z)); ctx.lineTo(W - R, Y(z)); ctx.stroke(); ctx.fillText(f(z, 1), L - 6, Y(z) + 4); }
        ctx.textAlign = 'center'; for (k = 0; k <= 5; k++) { var d = pr.L * k / 5; ctx.fillText(f(d, 0) + ' m', X(d), H - 22); }
        ctx.beginPath(); ok.forEach(function (p, i) { if (i) ctx.lineTo(X(p.d), Y(p.z)); else ctx.moveTo(X(p.d), Y(p.z)); }); ctx.lineTo(X(ok[ok.length - 1].d), Y(y0)); ctx.lineTo(X(ok[0].d), Y(y0)); ctx.closePath(); ctx.fillStyle = 'rgba(180,120,60,.25)'; ctx.fill();
        ctx.beginPath(); ok.forEach(function (p, i) { if (i) ctx.lineTo(X(p.d), Y(p.z)); else ctx.moveTo(X(p.d), Y(p.z)); }); ctx.strokeStyle = '#F59E0B'; ctx.lineWidth = 2.4; ctx.stroke(); ctx.lineWidth = 1;
        ctx.fillStyle = '#E2E8F0'; ctx.textAlign = 'left'; ctx.font = '700 13px Inter, sans-serif'; ctx.fillText('Perfil del terreno — exageración vertical ×' + f(vex, 1), L, 18);
    }
    function profileModel(pr, title) {
        var ok = pr.samples.filter(function (p) { return p.z != null; }), ents = [], zmin = pr.stats.zmin, zmax = pr.stats.zmax, vex = Math.max(1, Math.round(pr.L / Math.max(zmax - zmin, 1e-6) / 4)), base = Math.floor(zmin - 1), th = pr.L * 0.015;
        var layers = { 'TERRENO': { name: 'TERRENO', aci: 30 }, 'RASANTE-BASE': { name: 'RASANTE-BASE', aci: 7 }, 'COTAS': { name: 'COTAS', aci: 4 }, 'TEXTOS': { name: 'TEXTOS', aci: 2 } };
        function Y(z) { return (z - base) * vex; }
        ents.push({ t: 'poly', layer: 'TERRENO', pts: ok.map(function (p) { return [p.d, Y(p.z), 0]; }), closed: false, keepPoly: true });
        ents.push({ t: 'poly', layer: 'RASANTE-BASE', pts: [[0, 0, 0], [pr.L, 0, 0]], closed: false });
        var step = (function (v) { var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; })(pr.L / 8);
        for (var d = 0; d <= pr.L + 1e-6; d += step) { var p = ok.reduce(function (b, q) { return Math.abs(q.d - d) < Math.abs(b.d - d) ? q : b; }, ok[0]); ents.push({ t: 'poly', layer: 'COTAS', pts: [[d, 0, 0], [d, Y(p.z), 0]], closed: false }); ents.push({ t: 'text', layer: 'COTAS', p: [d, -th * 2.2, 0], h: th, s: [f(d, 0)], rot: 0, ha: 1, va: 3 }); ents.push({ t: 'text', layer: 'COTAS', p: [d, -th * 4.4, 0], h: th, s: [f(p.z, 2)], rot: 0, ha: 1, va: 3 }); }
        ents.push({ t: 'text', layer: 'TEXTOS', p: [-th * 1.5, -th * 2.2, 0], h: th * 0.9, s: ['Abscisa (m)'], rot: 0, ha: 2, va: 3 }); ents.push({ t: 'text', layer: 'TEXTOS', p: [-th * 1.5, -th * 4.4, 0], h: th * 0.9, s: ['Cota (m)'], rot: 0, ha: 2, va: 3 });
        ents.push({ t: 'text', layer: 'TEXTOS', p: [0, Y(zmax) + th * 5, 0], h: th * 1.5, s: [title || 'PERFIL LONGITUDINAL DEL TERRENO'], rot: 0, ha: 0, va: 0 });
        ents.push({ t: 'text', layer: 'TEXTOS', p: [0, Y(zmax) + th * 2.8, 0], h: th, s: ['Cota de referencia (rasante base) = ' + f(base, 2) + ' m - exageracion vertical x' + vex + ' - longitud ' + f(pr.L, 2) + ' m'], rot: 0, ha: 0, va: 0 });
        var m = { ents: ents, layers: layers, warn: [], units: 6, blocks: {} }; m.bbox = CAD.bboxOf(ents); return m;
    }
    CAD.profileModel = profileModel;

    /* ---------- volúmenes de corte y relleno contra una cota de plataforma ---------- */
    function triVol(a, b, c, zp) {
        var h = [a.z - zp, b.z - zp, c.z - zp].sort(function (x, y) { return x - y; }), A = Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2, h1 = h[0], h2 = h[1], h3 = h[2], tot = A * (h1 + h2 + h3) / 3, cut, fill;
        if (h1 >= 0) { cut = tot; fill = 0; } else if (h3 <= 0) { cut = 0; fill = -tot; }
        else if (h2 <= 0) { cut = A * Math.pow(h3, 3) / (3 * (h3 - h1) * (h3 - h2 || 1e-12)); fill = cut - tot; }
        else { fill = A * Math.pow(-h1, 3) / (3 * (h2 - h1) * (h3 - h1)); cut = tot + fill; }
        return [cut, fill, A];
    }
    function volumes(res, zp) { var cut = 0, fill = 0, area = 0; res.tin.forEach(function (t) { var v = triVol(t[0], t[1], t[2], zp); cut += v[0]; fill += v[1]; area += v[2]; }); return { zp: zp, cut: cut, fill: fill, net: cut - fill, area: area }; }
    function balanceZp(res) { var lo = res.stats.zmin, hi = res.stats.zmax, i; for (i = 0; i < 60; i++) { var mid = (lo + hi) / 2, v = volumes(res, mid); if (v.cut > v.fill) lo = mid; else hi = mid; } return (lo + hi) / 2; }
    function slopes(res) {
        var tot = 0, wsum = 0, mx = 0, a3 = 0, a2 = 0;
        res.tin.forEach(function (t) { var a = t[0], b = t[1], c = t[2], ux = b.x - a.x, uy = b.y - a.y, uz = b.z - a.z, vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z, nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nn = Math.hypot(nx, ny, nz) || 1e-12, s = Math.hypot(nx, ny) / Math.abs(nz || 1e-12) * 100, A2 = Math.abs(nz) / 2; if (!isFinite(s)) return; tot += s * A2; wsum += A2; mx = Math.max(mx, s); a2 += A2; a3 += nn / 2; });
        return { avg: wsum ? tot / wsum : 0, max: mx, area2d: a2, area3d: a3 };
    }
    CAD.volumes = volumes; CAD.balanceZp = balanceZp; CAD.slopes = slopes;

    /* ---------- mapa hipsométrico ---------- */
    var RAMP = [[0, [46, 125, 50]], [0.3, [160, 200, 90]], [0.55, [225, 195, 100]], [0.78, [160, 110, 60]], [1, [245, 240, 232]]];
    function ramp(t) { t = Math.max(0, Math.min(1, t)); for (var i = 1; i < RAMP.length; i++) if (t <= RAMP[i][0]) { var a = RAMP[i - 1], b = RAMP[i], k = (t - a[0]) / (b[0] - a[0]); return a[1].map(function (v, j) { return Math.round(v + (b[1][j] - v) * k); }); } return RAMP[RAMP.length - 1][1]; }
    function hypsoEntities(res, bands) {
        bands = bands || 12; var z0 = res.stats.zmin, dz = res.stats.zmax - z0 || 1;
        return res.tin.map(function (t) { var z = (t[0].z + t[1].z + t[2].z) / 3, k = Math.min(bands - 1, Math.floor((z - z0) / dz * bands)), rgb = ramp(k / (bands - 1)); return { t: 'poly', layer: 'MAPA-COLOR', pts: t.map(function (p) { return [p.x, p.y, p.z]; }), closed: true, fill: true, solid: true, noStroke: true, alpha: 0.9, fillRgb: rgb }; });
    }
    CAD.hypsoEntities = hypsoEntities; CAD.hypsoRamp = ramp;

    /* ---------- cajetín (rótulo) ---------- */
    function addTitleBlock(model, info) {
        info = info || {}; var bb = CAD.bboxOf(model.ents); if (!bb) return model; var w = bb[2] - bb[0], h = bb[3] - bb[1], span = Math.max(w, h), th = span * 0.014, bw = Math.max(span * 0.42, th * 40), rh = th * 2.6, rows = [['PROYECTO', info.proyecto || 'PROYECTO DE CURSO'], ['CONTENIDO', info.contenido || 'PLANO'], ['AUTOR', info.autor || ''], ['ESCALA', info.escala || 'S/E'], ['FECHA', info.fecha || new Date().toISOString().slice(0, 10)], ['HOJA', info.hoja || '1/1']];
        var x1 = bb[2], y0 = bb[1] - span * 0.06 - rows.length * rh, x0 = x1 - bw, gap = span * 0.03; model.layers.CAJETIN = model.layers.CAJETIN || { name: 'CAJETIN', aci: 7 };
        function rect(a, b, c, d) { model.ents.push({ t: 'poly', layer: 'CAJETIN', pts: [[a, b, 0], [c, b, 0], [c, d, 0], [a, d, 0]], closed: true }); }
        rect(x0, y0, x1, y0 + rows.length * rh);
        rows.forEach(function (r, i) { var y = y0 + (rows.length - 1 - i) * rh; model.ents.push({ t: 'poly', layer: 'CAJETIN', pts: [[x0, y, 0], [x1, y, 0]], closed: false }); model.ents.push({ t: 'text', layer: 'CAJETIN', p: [x0 + th * 0.5, y + rh * 0.3, 0], h: th * 0.8, s: [r[0]], rot: 0, ha: 0, va: 0 }); model.ents.push({ t: 'text', layer: 'CAJETIN', p: [x0 + bw * 0.28, y + rh * 0.3, 0], h: th * 1.05, s: [String(r[1])], rot: 0, ha: 0, va: 0 }); });
        model.ents.push({ t: 'poly', layer: 'CAJETIN', pts: [[x0 + bw * 0.26, y0, 0], [x0 + bw * 0.26, y0 + rows.length * rh, 0]], closed: false });
        var all = CAD.bboxOf(model.ents); rect(all[0] - gap, all[1] - gap, all[2] + gap, all[3] + gap); model.bbox = CAD.bboxOf(model.ents); return model;
    }
    CAD.addTitleBlock = addTitleBlock;

    /* ---------- PDF (una página con la imagen del plano) ---------- */
    function toPDF(canvas, title) {
        var url = canvas.toDataURL('image/jpeg', 0.92), bin = atob(url.split(',')[1]), img = new Uint8Array(bin.length), i; for (i = 0; i < bin.length; i++) img[i] = bin.charCodeAt(i);
        var iw = canvas.width, ih = canvas.height, pw = 842, ph = Math.round(842 * ih / iw); if (ph > 1190) { ph = 1190; pw = Math.round(1190 * iw / ih); }
        var enc = new TextEncoder(), chunks = [], offs = [], len = 0;
        function put(x) { var b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); len += b.length; }
        function obj(n, body) { offs[n] = len; put(n + ' 0 obj\n'); put(body); put('\nendobj\n'); }
        put('%PDF-1.4\n');
        obj(1, '<< /Type /Catalog /Pages 2 0 R >>'); obj(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
        obj(3, '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pw + ' ' + ph + '] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>');
        var cs = 'q ' + pw + ' 0 0 ' + ph + ' 0 0 cm /Im0 Do Q'; obj(4, '<< /Length ' + cs.length + ' >>\nstream\n' + cs + '\nendstream');
        offs[5] = len; put('5 0 obj\n<< /Type /XObject /Subtype /Image /Width ' + iw + ' /Height ' + ih + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + img.length + ' >>\nstream\n'); put(img); put('\nendstream\nendobj\n');
        obj(6, '<< /Title (' + String(title || 'Plano Civix').replace(/[()\\]/g, '') + ') /Producer (GeoMetrics Civix) >>');
        var xr = len; put('xref\n0 7\n0000000000 65535 f \n'); for (i = 1; i <= 6; i++) put(('0000000000' + offs[i]).slice(-10) + ' 00000 n \n');
        put('trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xr + '\n%%EOF\n');
        return new Blob(chunks, { type: 'application/pdf' });
    }
    CAD.toPDF = toPDF;
    CAD.renderToCanvas = function (model, W, dark) { // pinta el modelo en un canvas fuera de pantalla (para PNG / PDF)
        var bb = model.bbox || CAD.bboxOf(model.ents) || [0, 0, 10, 10], w = bb[2] - bb[0] || 1, h = bb[3] - bb[1] || 1, pad = Math.max(w, h) * 0.03, H = Math.round(W * (h + 2 * pad) / (w + 2 * pad)), cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        var svg = CAD.toSVG(model, { bg: dark ? 'dark' : 'light' }); return { canvas: cv, svg: svg, W: W, H: H };
    };
    CAD.svgToCanvas = function (svg, W, H) {
        return new Promise(function (res, rej) { var img = new Image(), url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' })); img.onload = function () { var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var c = cv.getContext('2d'); c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); c.drawImage(img, 0, 0, W, H); URL.revokeObjectURL(url); res(cv); }; img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('No se pudo rasterizar el SVG')); }; img.src = url; });
    };

    /* ---------- Estudio de curvas de nivel ---------- */
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    CAD.contourStudio = function (host, spec) {
        host.innerHTML = ''; var res, model, api, vbox = el('div', 'cx-box'), tabs = el('div', 'cxp-tabs cxs-tabs'), body = el('div', 'cxs-body'), ctl = el('div', 'cx-ctl');
        function inp(type, w) { var i = el('input'); i.type = type; if (w) i.className = 'cx-num'; return i; }
        var iv = inp('number', 1), me = inp('number', 1), sm = inp('checkbox'), tin = inp('checkbox'), hy = inp('checkbox'), lb = inp('checkbox'), pt = inp('checkbox'); iv.step = 'any'; iv.min = 0; me.min = 2; me.value = spec.params.majorEvery || 5; sm.checked = spec.params.smooth !== false; lb.checked = true; pt.checked = true;
        function lab(t, i) { var l = el('label', null, t + ' '); l.appendChild(i); return l; } function chk(t, i) { var l = el('label', null, ''); l.appendChild(i); l.appendChild(document.createTextNode(' ' + t)); return l; }
        ctl.appendChild(lab('Equidistancia (m)', iv)); ctl.appendChild(lab('Mayor cada', me)); ctl.appendChild(chk('suavizar', sm)); ctl.appendChild(chk('puntos', pt)); ctl.appendChild(chk('cotas', lb)); ctl.appendChild(chk('TIN', tin)); ctl.appendChild(chk('mapa de colores', hy));
        var go = el('button', 'cx-btn', 'Recalcular'); go.type = 'button'; ctl.appendChild(go); var again; if (spec.random) { again = el('button', 'cx-btn', '🎲 Otra aleatoria'); again.type = 'button'; ctl.appendChild(again); }
        iv.value = spec.params.interval || '';
        host.appendChild(ctl); host.appendChild(vbox); host.appendChild(tabs); host.appendChild(body);
        var TABS = [['res', '📋 Resumen'], ['perfil', '📈 Perfil'], ['vol', '⛏️ Corte y relleno'], ['pts', '📍 Puntos']], cur = 'res';
        TABS.forEach(function (t) { var b = el('button', 'cxp-tab' + (t[0] === cur ? ' on' : ''), t[1]); b.type = 'button'; b.addEventListener('click', function () { cur = t[0]; tabs.querySelectorAll('.cxp-tab').forEach(function (x) { x.classList.toggle('on', x === b); }); renderTab(); }); tabs.appendChild(b); });
        function run() {
            var p = { interval: parseFloat(iv.value) > 0 ? parseFloat(iv.value) : 0, smooth: sm.checked, majorEvery: Math.max(2, parseInt(me.value, 10) || 5) }; res = CAD.contours(spec.pts, p); vbox.innerHTML = '';
            if (!res.ok) { vbox.appendChild(el('p', 'cx-err', '⚠ ' + esc(res.error))); body.innerHTML = ''; return; }
            iv.value = +res.stats.interval.toFixed(4);
            model = CAD.contourModel(res, { title: spec.title, seed: spec.seed }); model.layers.TIN.off = !tin.checked; model.layers.PUNTOS.off = !pt.checked; model.layers['COTAS-CURVAS'].off = !lb.checked;
            if (hy.checked) { model.layers['MAPA-COLOR'] = { name: 'MAPA-COLOR', aci: 3 }; model.ents = hypsoEntities(res).concat(model.ents); model.bbox = CAD.bboxOf(model.ents); }
            var st = res.stats, sl = slopes(res), extra = '<b>' + st.n + '</b> puntos · cotas <b>' + f(st.zmin) + '</b> a <b>' + f(st.zmax) + ' m</b> · equidistancia <b>' + +st.interval.toFixed(4) + ' m</b> · <b>' + st.nLines + '</b> curvas · pendiente media ' + f(sl.avg, 1) + ' % (máx. ' + f(sl.max, 0) + ' %)' + (spec.seed != null ? ' · semilla <b>' + spec.seed + '</b>' + (spec.shape ? ' · forma <b>' + spec.shape + '</b>' : '') : '');
            api = CAD.viewer(vbox, model, { name: spec.name || 'curvas_de_nivel', extra: extra, actions: [{ label: '⬇ PDF', title: 'Plano en PDF', run: function (m) { CAD.exportRaster(m, 'pdf', spec.name || 'curvas'); } }, { label: '＋ Cajetín', title: 'Agregar cajetín (rótulo) al plano', run: function (m, a) { if (!m.__tb) { CAD.addTitleBlock(m, { contenido: spec.title || 'CURVAS DE NIVEL', proyecto: spec.proyecto }); m.__tb = 1; a.layersChanged(); a.fit(); } } }, { label: '⬇ Puntos CSV', title: 'X,Y,Z', run: function () { CAD.download((spec.name || 'puntos') + '.csv', new Blob([CAD.pointsCSV(spec.pts)], { type: 'text/csv' })); } }] });
            renderTab();
        }
        function stat(k, v) { return '<div class="cxs-stat"><small>' + k + '</small><b>' + v + '</b></div>'; }
        function renderTab() {
            body.innerHTML = ''; if (!res || !res.ok) return; var st = res.stats, bb = res.bbox;
            if (cur === 'res') {
                var sl = slopes(res), z = res.stats; body.innerHTML = '<div class="cxs-stats">' + stat('Puntos', st.n) + stat('Triángulos (TIN)', st.tri) + stat('Cota mínima', f(st.zmin) + ' m') + stat('Cota máxima', f(st.zmax) + ' m') + stat('Desnivel', f(st.zmax - st.zmin) + ' m') + stat('Equidistancia', +st.interval.toFixed(4) + ' m') + stat('N.º de curvas', st.nLines) + stat('Longitud total', f(st.length / 1000, 2) + ' km') + stat('Área en planta', f(sl.area2d, 0) + ' m² (' + f(sl.area2d / 10000, 3) + ' ha)') + stat('Área superficial', f(sl.area3d, 0) + ' m²') + stat('Pendiente media', f(sl.avg, 1) + ' %') + stat('Pendiente máxima', f(sl.max, 0) + ' %') + '</div><p class="cxp-note">Método: triangulación de Delaunay (TIN) y interpolación lineal de la cota en cada arista; las curvas mayores están en rojo. El suavizado Chaikin es solo visual: los cálculos de volumen, área y perfil usan el TIN sin suavizar.</p>';
            } else if (cur === 'perfil') {
                var ax = bb[0] + (bb[2] - bb[0]) * 0.05, ay = bb[1] + (bb[3] - bb[1]) * 0.5, bx = bb[0] + (bb[2] - bb[0]) * 0.95, by = ay;
                body.innerHTML = '<p class="cxp-note">Define el eje del perfil con dos puntos (coordenadas del plano).</p><div class="cxp-grid"><label class="cxp-f"><span>A: X</span><input type="number" step="any" id="pa_x" value="' + f(ax, 2) + '"></label><label class="cxp-f"><span>A: Y</span><input type="number" step="any" id="pa_y" value="' + f(ay, 2) + '"></label><label class="cxp-f"><span>B: X</span><input type="number" step="any" id="pb_x" value="' + f(bx, 2) + '"></label><label class="cxp-f"><span>B: Y</span><input type="number" step="any" id="pb_y" value="' + f(by, 2) + '"></label></div><div class="cxs-row"><button class="cx-btn cxp-go" id="pgo" type="button">▶ Trazar perfil</button></div><div id="pout"></div>';
                body.querySelector('#pgo').addEventListener('click', function () {
                    var A = [parseFloat(body.querySelector('#pa_x').value), parseFloat(body.querySelector('#pa_y').value)], B = [parseFloat(body.querySelector('#pb_x').value), parseFloat(body.querySelector('#pb_y').value)], out = body.querySelector('#pout'); out.innerHTML = '';
                    if ([A[0], A[1], B[0], B[1]].some(isNaN) || (A[0] === B[0] && A[1] === B[1])) { out.innerHTML = '<p class="cx-err">⚠ Define dos puntos distintos.</p>'; return; }
                    var pr = profile(res, A, B, 240); if (!pr.stats) { out.innerHTML = '<p class="cx-err">⚠ El eje queda fuera de la superficie del terreno.</p>'; return; }
                    model.layers['PERFIL-EJE'] = { name: 'PERFIL-EJE', aci: 5 }; model.ents = model.ents.filter(function (e) { return e.layer !== 'PERFIL-EJE'; }); var th = Math.max(res.bbox[2] - res.bbox[0], res.bbox[3] - res.bbox[1]) * 0.012;
                    model.ents.push({ t: 'poly', layer: 'PERFIL-EJE', pts: [[A[0], A[1], 0], [B[0], B[1], 0]], closed: false }); model.ents.push({ t: 'text', layer: 'PERFIL-EJE', p: [A[0], A[1] + th, 0], h: th, s: ['A'], rot: 0, ha: 1, va: 0 }); model.ents.push({ t: 'text', layer: 'PERFIL-EJE', p: [B[0], B[1] + th, 0], h: th, s: ['B'], rot: 0, ha: 1, va: 0 }); api.layersChanged();
                    var cv = el('canvas', 'cxs-canvas'); cv.width = 900; cv.height = 360; out.appendChild(cv); var s = pr.stats, vex = Math.max(1, Math.round(pr.L / Math.max(s.zmax - s.zmin, 1e-6) / 4));
                    drawProfile(cv, pr, vex);
                    out.appendChild(el('div', 'cxs-stats', stat('Longitud', f(s.length, 2) + ' m') + stat('Cota mín. / máx.', f(s.zmin) + ' / ' + f(s.zmax)) + stat('Pendiente media A→B', f(s.avgSlope, 2) + ' %') + stat('Pendiente máx. local', f(s.maxSlope, 1) + ' %') + stat('Ascenso / descenso', f(s.up, 2) + ' / ' + f(s.down, 2) + ' m') + (s.outside ? stat('Fuera del TIN', s.outside + ' muestras') : '')));
                    var row = el('div', 'cxs-row'); [['⬇ Perfil DXF', function () { CAD.download('perfil_AB.dxf', new Blob([CAD.writeDXF(profileModel(pr))], { type: 'application/dxf' })); }], ['⬇ Perfil PNG', function () { cv.toBlob(function (b) { CAD.download('perfil_AB.png', b); }); }], ['⬇ Perfil CSV', function () { CAD.download('perfil_AB.csv', new Blob(['abscisa,x,y,z\n' + pr.samples.filter(function (q) { return q.z != null; }).map(function (q) { return [f(q.d, 3), f(q.x, 3), f(q.y, 3), f(q.z, 3)].join(','); }).join('\n')], { type: 'text/csv' })); }]].forEach(function (a) { var b = el('button', 'cx-btn', a[0]); b.type = 'button'; b.addEventListener('click', a[1]); row.appendChild(b); }); out.appendChild(row);
                });
            } else if (cur === 'vol') {
                var zb = balanceZp(res), zdef = Math.round(zb * 100) / 100;
                body.innerHTML = '<p class="cxp-note">Volúmenes entre la superficie del terreno (TIN) y una plataforma horizontal a la cota indicada. <b>Corte</b> = terreno sobre la plataforma; <b>relleno</b> = terreno bajo la plataforma.</p><div class="cxp-grid"><label class="cxp-f"><span>Cota de la plataforma (m)</span><input type="number" step="any" id="vz" value="' + f(zdef, 2) + '"></label></div><div class="cxs-row"><button class="cx-btn cxp-go" id="vgo" type="button">▶ Calcular</button><button class="cx-btn" id="vbal" type="button">⚖ Usar cota de balance (corte = relleno)</button></div><div id="vout"></div>';
                function calc() { var zp = parseFloat(body.querySelector('#vz').value); if (isNaN(zp)) return; var v = volumes(res, zp); body.querySelector('#vout').innerHTML = '<div class="cxs-stats">' + stat('Cota de plataforma', f(zp, 2) + ' m') + stat('Volumen de corte', f(v.cut, 1) + ' m³') + stat('Volumen de relleno', f(v.fill, 1) + ' m³') + stat('Neto (corte − relleno)', f(v.net, 1) + ' m³') + stat('Área en planta', f(v.area, 0) + ' m²') + stat('Cota de balance', f(zb, 2) + ' m') + '</div><p class="cxp-note">Cálculo exacto sobre cada triángulo del TIN (sin factor de esponjamiento ni compactación). Es una estimación sobre la nube de puntos dada: su precisión depende de la densidad de puntos.</p>'; }
                body.querySelector('#vgo').addEventListener('click', calc); body.querySelector('#vbal').addEventListener('click', function () { body.querySelector('#vz').value = f(zb, 2); calc(); }); calc();
            } else {
                var rows = res.pts.slice(0, 400).map(function (p, i) { return '<tr><td>' + (i + 1) + '</td><td>' + f(p.x, 2) + '</td><td>' + f(p.y, 2) + '</td><td>' + f(p.z, 2) + '</td></tr>'; }).join('');
                body.innerHTML = '<div class="cxp-tblwrap"><table class="cxp-tbl"><thead><tr><th>#</th><th>X (E)</th><th>Y (N)</th><th>Z</th></tr></thead><tbody>' + rows + '</tbody></table></div>' + (res.pts.length > 400 ? '<p class="cxp-note">Se muestran 400 de ' + res.pts.length + ' puntos; el CSV descarga todos.</p>' : '');
            }
        }
        go.addEventListener('click', run); [iv, me, sm, tin, hy, lb, pt].forEach(function (i) { i.addEventListener('change', run); });
        if (again) again.addEventListener('click', function () { var t = CAD.randomTerrain(Object.assign({}, spec.params, { seed: undefined })); spec.pts = t.pts; spec.seed = t.seed; spec.shape = t.shape; iv.value = ''; run(); });
        run(); return { get result() { return res; }, get model() { return model; } };
    };

    /* exporta el modelo a PNG / PDF rasterizando el SVG */
    CAD.exportRaster = function (model, kind, name) {
        var r = CAD.renderToCanvas(model, 2400, false);
        CAD.svgToCanvas(r.svg, r.W, r.H).then(function (cv) { if (kind === 'pdf') CAD.download(name + '.pdf', CAD.toPDF(cv, name)); else cv.toBlob(function (b) { CAD.download(name + '.png', b); }); }).catch(function (e) { alert('No se pudo exportar: ' + e.message); });
    };
})(window);
