/**
 * Civix CAD Vision: imagen → detección → revisión humana → DXF/PDF/SVG.
 * Módulo independiente: se abre sobre la página y se apoya en el backend Python (puerto 8765).
 * Todo el procesamiento real está en backend/cad_vision; aquí vive el editor de revisión.
 * API pública: CivixCAD.vision.open()
 */
(function (global) {
    'use strict';
    var doc = global.document;
    var CAD = global.CivixCAD = global.CivixCAD || {};
    if (CAD.vision) return;

    /* Dirección del servidor público de CAD Vision. Pégala aquí tras publicarlo, por ejemplo 'https://mi-motor.onrender.com'. */
    var API_PUBLICA = '';

    /* Abierto desde este mismo equipo se usa el motor local; desde la web, el servidor público. */
    var PAGINA_LOCAL = /^(localhost|127\.0\.0\.1|\[::1\]|)$/.test(global.location ? global.location.hostname : '');
    var API_BASE = (function () { var o = null; try { o = localStorage.getItem('cadVisionApi'); } catch (e) { } return global.CAD_VISION_API || o || (PAGINA_LOCAL ? 'http://127.0.0.1:8765' : API_PUBLICA); })();
    var API = API_BASE.replace(/\/$/, '') + '/api/cad-vision';

    var LAYERS = [['00_REFERENCIA', '#94A3B8'], ['01_MUROS', '#111827'], ['02_DIVISIONES', '#374151'], ['03_PUERTAS', '#B45309'], ['04_VENTANAS', '#0369A1'], ['05_COLUMNAS', '#7C3AED'], ['06_COTAS', '#15803D'], ['07_TEXTOS', '#111827'], ['08_EJES', '#DC2626'], ['09_OTROS', '#64748B']];
    var LCOLOR = {}; LAYERS.forEach(function (l) { LCOLOR[l[0]] = l[1]; });
    var TYPE_LABEL = { wall: 'Muro', partition: 'División', door: 'Puerta', window: 'Ventana', column: 'Columna', stair: 'Escalera', dimension: 'Cota', text: 'Texto', axis: 'Eje', other: 'Otro', contour: 'Contorno', ref: 'Referencia' };
    var LAYER_OF = { wall: '01_MUROS', partition: '02_DIVISIONES', door: '03_PUERTAS', window: '04_VENTANAS', column: '05_COLUMNAS', dimension: '06_COTAS', text: '07_TEXTOS', axis: '08_EJES', other: '09_OTROS', stair: '09_OTROS' };
    var UF = { m: 1, cm: 100, mm: 1000, in: 1 / 0.0254 };
    var STATUS_LABEL = { high: 'Alta confianza', uncertain: 'Con incertidumbre', manual: 'Necesita intervención' };
    var STATE_LABEL = { pending: 'pendiente', confirmed: 'confirmado', rejected: 'rechazado' };

    function h(tag, props) {
        var e = doc.createElement(tag), i, c;
        if (props) Object.keys(props).forEach(function (k) {
            if (k === 'class') e.className = props[k];
            else if (k === 'text') e.textContent = props[k];
            else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), props[k]);
            else if (k in e && k !== 'list') e[k] = props[k];
            else e.setAttribute(k, props[k]);
        });
        for (i = 2; i < arguments.length; i++) { c = arguments[i]; if (c != null) e.appendChild(typeof c === 'string' ? doc.createTextNode(c) : c); }
        return e;
    }
    function uid() { return Math.random().toString(16).slice(2, 10); }
    function dist(a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); }
    function fmt(v, d) { return (Math.round(v * Math.pow(10, d == null ? 2 : d)) / Math.pow(10, d == null ? 2 : d)).toString(); }

    var S = { root: null, sid: null, upload: null, backdrop: null, quad: null, pageQuad: null, rotate: 0, doc: null, view: 'original', tool: 'select', sel: null, undo: [], redo: [], hist: [], layers: {}, grid: true, white: true, highlight: true, showRejected: false, tab: 'items', filter: 'all', units: 'm', T: {}, draft: null, drag: null, cropping: false };
    LAYERS.forEach(function (l) { S.layers[l[0]] = l[0] !== '00_REFERENCIA'; });
    var U = {}; // referencias de interfaz

    /* ───────── geometría de entidades ───────── */
    var PT_KEYS = ['a', 'b', 'hinge', 'open', 'leaf', 'c', 'at', 'ref_a', 'ref_b'];
    function eachPoint(g, fn) {
        PT_KEYS.forEach(function (k) { if (g[k]) fn(g[k]); });
        if (g.pts) g.pts.forEach(fn);
        if (g.treads) g.treads.forEach(function (t) { fn(t[0]); fn(t[1]); });
    }
    function syncDim(e) {
        var g = e.geom; if (g.kind !== 'dim') return;
        if (g.axis === 'x') { g.b[1] = g.a[1]; g.base = g.a[1]; g.measured_m = Math.abs(g.b[0] - g.a[0]); }
        else { g.b[0] = g.a[0]; g.base = g.a[0]; g.measured_m = Math.abs(g.b[1] - g.a[1]); }
    }
    function arcPts(hg, o, l) {
        var r = dist(hg, o), a0 = Math.atan2(o[1] - hg[1], o[0] - hg[0]), a1 = Math.atan2(l[1] - hg[1], l[0] - hg[0]), d = a1 - a0, i, out = [];
        while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
        for (i = 0; i <= 20; i++) out.push([hg[0] + r * Math.cos(a0 + d * i / 20), hg[1] + r * Math.sin(a0 + d * i / 20)]);
        return out;
    }
    function circlePts(c, r) { var o = [], i; for (i = 0; i <= 40; i++) o.push([c[0] + r * Math.cos(i * Math.PI / 20), c[1] + r * Math.sin(i * Math.PI / 20)]); return o; }
    function rectPts(a, b) { return [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]], [a[0], a[1]]]; }
    function polysOf(e) {
        var g = e.geom;
        switch (g.kind) {
            case 'line': case 'access': case 'window': case 'axis': case 'dim': return [[g.a, g.b]];
            case 'polyline': return [g.closed ? g.pts.concat([g.pts[0]]) : g.pts];
            case 'circle': return [circlePts(g.c, g.r)];
            case 'rect': return [rectPts(g.a, g.b)];
            case 'door': return [arcPts(g.hinge, g.open, g.leaf), [g.hinge, g.leaf]];
            case 'stair': return g.treads;
            case 'text': case 'note_dim': var w = g.height * Math.max(1, String(g.text).length) * 0.3; return [rectPts([g.at[0] - w, g.at[1] - g.height / 2], [g.at[0] + w, g.at[1] + g.height / 2])];
        }
        return [];
    }
    function handlesOf(e) {
        var g = e.geom, out = [];
        ['a', 'b', 'hinge', 'open', 'leaf', 'c', 'at'].forEach(function (k) { if (g[k]) out.push(g[k]); });
        if (g.pts) g.pts.forEach(function (p) { out.push(p); });
        return out;
    }
    function lengthOf(e) { var g = e.geom; return (g.a && g.b && g.kind !== 'rect') ? dist(g.a, g.b) : null; }
    function ptSeg(p, a, b) { var dx = b[0] - a[0], dy = b[1] - a[1], t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / Math.max(dx * dx + dy * dy, 1e-12))); return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy); }
    function hitDist(e, p, polys) { var best = Infinity; polys.forEach(function (pl) { for (var i = 1; i < pl.length; i++) best = Math.min(best, ptSeg(p, pl[i - 1], pl[i])); }); return best; }
    function live(e) { return e.state !== 'rejected' || S.showRejected; }
    function ents() { return S.doc ? S.doc.entities : []; }
    function byId(id) { return ents().filter(function (e) { return e.id === id; })[0] || null; }
    function selected() { return S.sel ? byId(S.sel) : null; }

    /* ───────── historial ───────── */
    function snapshot() { return JSON.stringify({ entities: S.doc.entities, scale: S.doc.scale, units: S.doc.units, params: S.doc.params }); }
    function commit(label) { S.undo.push(S._before || snapshot()); if (S.undo.length > 60) S.undo.shift(); S.redo = []; S._before = null; addHist(label); refresh(); }
    function begin() { S._before = snapshot(); }
    function restore(str) { var o = JSON.parse(str); if (o.scale.m_per_px !== S.doc.scale.m_per_px) S.T = {}; S.doc.entities = o.entities; S.doc.scale = o.scale; S.doc.units = o.units; S.doc.params = o.params; }
    function undo() { if (!S.undo.length) return; S.redo.push(snapshot()); restore(S.undo.pop()); addHist('Deshacer'); refresh(); }
    function redo() { if (!S.redo.length) return; S.undo.push(snapshot()); restore(S.redo.pop()); addHist('Rehacer'); refresh(); }
    function addHist(t) { S.hist.unshift(t); if (S.hist.length > 80) S.hist.pop(); U.hist.innerHTML = ''; S.hist.slice(0, 40).forEach(function (x) { U.hist.appendChild(h('div', { text: x })); }); }
    function status(t, sub) { U.st.textContent = t; U.stSub.textContent = sub || ''; }

    /* ───────── red ───────── */
    function api(path, opt) {
        if (!API_BASE) { setOnline(false); return Promise.reject(new Error('CAD Vision todavía no tiene un servidor configurado.')); }
        return fetch(API + path, opt).catch(function () { setOnline(false); throw new Error(PAGINA_LOCAL ? 'No hay conexión con el motor de CAD Vision. Ejecuta iniciar-cad-vision.bat.' : 'No se pudo conectar con el servidor de CAD Vision. Inténtalo de nuevo en un momento.'); }).then(function (r) {
            if (r.ok || r.status === 409) return r;
            return r.json().catch(function () { return {}; }).then(function (b) { throw new Error(b.detail || ('Error ' + r.status)); });
        });
    }
    function post(path, body) { return api(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); }
    function setOnline(on, info) { U.api.className = 'cvv-api' + (on ? ' on' : ''); U.apiT.textContent = on ? (info || 'Motor activo') : (PAGINA_LOCAL ? 'Motor apagado' : 'Servidor no disponible'); U.off.hidden = on; draw(); }
    function health() {
        clearTimeout(S.retry);
        return api('/health').then(function (r) { return r.json(); }).then(function (j) { setOnline(true, j.ocr && j.ocr.ok ? 'Motor activo · OCR listo' : 'Motor activo · sin OCR'); return true; }).catch(function () {
            setOnline(false);
            if (!PAGINA_LOCAL && API_BASE && S.root && !S.root.hidden) S.retry = setTimeout(health, 10000); // un servidor dormido tarda en despertar
            return false;
        });
    }
    function busy(t) { U.busy.hidden = !t; U.busy.textContent = t || ''; }
    function loadImg(src) { return new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = src; }); }
    function fail(e) { busy(null); status('⚠ ' + (e.message || e)); addHist('Error: ' + (e.message || e)); }

    /* ───────── carga y preparación ───────── */
    function takeFile(f) {
        if (!f) return;
        if (!/\.(png|jpe?g|pdf)$/i.test(f.name) && !/^image\/(png|jpeg)$|pdf$/.test(f.type)) { status('⚠ Formato no admitido: usa PNG, JPG o PDF.'); return; }
        var fd = new FormData(); fd.append('file', f);
        busy('Cargando imagen…');
        api('/upload', { method: 'POST', body: fd }).then(function (r) { return r.json(); }).then(function (j) {
            return loadImg(j.preview).then(function (img) {
                resetAll();
                S.sid = j.id; S.upload = { img: img, w: j.w, h: j.h, name: f.name }; S.backdrop = S.upload; S.pageQuad = j.page_quad;
                U.file.textContent = f.name + ' · ' + j.w + '×' + j.h + ' px' + (j.meta.pages > 1 ? ' · PDF: página 1 de ' + j.meta.pages : '');
                setView('original'); addHist('Imagen cargada: ' + f.name); status('Imagen lista.', 'Ajusta si hace falta y pulsa «Interpretar plano».'); busy(null); syncButtons();
            });
        }).catch(fail);
    }
    function options() {
        return { rotate: S.rotate, quad: S.quad, deskew: U.o_deskew.checked, illumination: U.o_illum.checked, contrast: U.o_contrast.checked, denoise: U.o_denoise.checked, sensitivity: parseFloat(U.o_sens.value), units: U.o_units.value, wall_thickness: num(U.o_wall.value, 0.15), partition_thickness: num(U.o_part.value, 0.1), axes: U.o_axes.checked };
    }
    function num(v, d) { var x = parseFloat(String(v).replace(',', '.')); return isFinite(x) ? x : d; }
    function previewPrep() {
        if (!S.sid) return;
        busy('Aplicando correcciones…'); S.cropping = false; syncButtons();
        post('/preprocess', { id: S.sid, options: options() }).then(function (r) { return r.json(); }).then(function (j) {
            return loadImg(j.preview).then(function (img) { S.backdrop = { img: img, w: j.w, h: j.h }; fit(); busy(null); status('Vista previa actualizada.', j.log.join(' · ')); addHist('Correcciones: ' + (j.log.join(', ') || 'ninguna')); });
        }).catch(fail);
    }
    function startCrop() {
        if (!S.sid) return;
        busy('Preparando recorte…');
        post('/preprocess', { id: S.sid, options: { rotate: S.rotate, deskew: false, illumination: false, contrast: false, denoise: false } }).then(function (r) { return r.json(); }).then(function (j) {
            return loadImg(j.preview).then(function (img) {
                S.backdrop = { img: img, w: j.w, h: j.h }; S.cropping = true;
                if (!S.quad) S.quad = [[0.04, 0.04], [0.96, 0.04], [0.96, 0.96], [0.04, 0.96]];
                setView('original'); busy(null); status('Arrastra las 4 esquinas sobre la hoja.', 'Sirve de recorte y de corrección de perspectiva.'); syncButtons();
            });
        }).catch(fail);
    }
    function analyze() {
        if (!S.sid) return;
        busy('Interpretando el plano… (visión + OCR, puede tardar unos segundos)'); status('Procesando…');
        S.cropping = false;
        post('/analyze', { id: S.sid, options: options() }).then(function (r) { return r.json(); }).then(function (d) {
            return loadImg(d.image.src).then(function (img) {
                d.imageEl = img; S.doc = d; S.undo = []; S.redo = []; S.sel = null; S.units = 'm';
                d.log.forEach(addHist);
                busy(null); setView('plan'); refresh();
                var n = pendingCounts();
                status(d.scale.known ? 'Plano reconstruido. Revísalo antes de exportar.' : 'Geometría detectada SIN escala: calibra con una medida conocida.', n.manual + ' por decidir · ' + n.uncertain + ' con incertidumbre · ' + n.high + ' de alta confianza');
                if (!d.scale.known) { S.tab = 'warn'; refresh(); }
            });
        }).catch(fail);
    }
    function pendingCounts() { var c = { high: 0, uncertain: 0, manual: 0 }; ents().forEach(function (e) { if (e.state === 'pending') c[e.status]++; }); return c; }
    function resetAll() { S.doc = null; S.sel = null; S.quad = null; S.rotate = 0; S.undo = []; S.redo = []; S.draft = null; S.cropping = false; U.o_rot.value = 0; U.rotV.textContent = '0°'; refresh(); }

    /* ───────── transformaciones de vista ───────── */
    function panes() { return Array.prototype.slice.call(U.stage.querySelectorAll('.cvv-pane')); }
    function sizeCanvas(p) { var c = p.__c, r = p.getBoundingClientRect(), d = global.devicePixelRatio || 1; c.width = Math.max(2, r.width * d); c.height = Math.max(2, r.height * d); return { w: r.width, h: r.height, d: d }; }
    function planBounds() {
        var xs = [], ys = [];
        ents().forEach(function (e) { if (e.type === 'ref' || e.state === 'rejected') return; if (e.type === 'other' && e.status === 'manual') return; eachPoint(e.geom, function (p) { xs.push(p[0]); ys.push(p[1]); }); });
        if (!xs.length) return [0, 0, 10, 10];
        return [Math.min.apply(null, xs), Math.min.apply(null, ys), Math.max.apply(null, xs), Math.max.apply(null, ys)];
    }
    function fitT(mode, w, hh) {
        if (mode === 'plan') {
            var b = planBounds(), bw = Math.max(b[2] - b[0], 1e-3), bh = Math.max(b[3] - b[1], 1e-3), k = 0.9 * Math.min(w / bw, hh / bh);
            return { k: k, ox: w / 2 - k * (b[0] + b[2]) / 2, oy: hh / 2 + k * (b[1] + b[3]) / 2, flip: true };
        }
        var im = imageFor(mode), iw = im ? im.w : 1000, ih = im ? im.h : 1000, kk = 0.96 * Math.min(w / iw, hh / ih);
        return { k: kk, ox: (w - iw * kk) / 2, oy: (hh - ih * kk) / 2, flip: false };
    }
    function imageFor(mode) { if (mode === 'detect' && S.doc) return { img: S.doc.imageEl, w: S.doc.image.w, h: S.doc.image.h }; if (S.backdrop) return S.backdrop; return S.doc ? { img: S.doc.imageEl, w: S.doc.image.w, h: S.doc.image.h } : null; }
    function X(T, p) { return T.flip ? [T.ox + p[0] * T.k, T.oy - p[1] * T.k] : [T.ox + p[0] * T.k, T.oy + p[1] * T.k]; }
    function W(T, x, y) { return T.flip ? [(x - T.ox) / T.k, (T.oy - y) / T.k] : [(x - T.ox) / T.k, (y - T.oy) / T.k]; }
    function fit() { panes().forEach(function (p) { var r = p.getBoundingClientRect(); S.T[p.__mode] = fitT(p.__mode, r.width, r.height); }); draw(); }

    function setView(v) {
        S.view = v; U.stage.innerHTML = ''; U.stage.className = 'cvv-stage' + (v === 'compare' ? ' compare' : '');
        var list = v === 'compare' ? [['original', '1 · Imagen original'], ['detect', '2 · Interpretación IA'], ['plan', '3 · Plano reconstruido']] : [[v, null]];
        list.forEach(function (m) {
            var c = h('canvas'), p = h('div', { class: 'cvv-pane' }, c); p.__c = c; p.__mode = m[0];
            if (m[1]) p.appendChild(h('b', { text: m[1] }));
            U.stage.appendChild(p); bindPane(p);
        });
        U.stage.appendChild(U.emptyEl);
        Array.prototype.forEach.call(U.viewBtns.children, function (b) { b.classList.toggle('on', b.__v === v); });
        S.T = {}; fit(); syncButtons();
    }

    /* ───────── dibujo ───────── */
    function draw() {
        U.emptyEl.hidden = !!(S.upload || S.doc) || !U.off.hidden;
        panes().forEach(function (p) {
            var sz = sizeCanvas(p), c = p.__c.getContext('2d'), mode = p.__mode;
            if (!S.T[mode]) S.T[mode] = fitT(mode, sz.w, sz.h);
            c.setTransform(sz.d, 0, 0, sz.d, 0, 0);
            if (mode === 'plan') drawPlan(c, sz, S.T[mode]); else drawImage(c, sz, S.T[mode], mode);
        });
    }
    function drawImage(c, sz, T, mode) {
        c.fillStyle = '#05090F'; c.fillRect(0, 0, sz.w, sz.h);
        var im = imageFor(mode); if (!im) return;
        c.globalAlpha = mode === 'detect' ? 0.5 : 1; c.drawImage(im.img, T.ox, T.oy, im.w * T.k, im.h * T.k); c.globalAlpha = 1;
        if (mode === 'detect' && S.doc) {
            ents().forEach(function (e) {
                if (e.type === 'ref' || e.type === 'axis' || !S.layers[e.layer] || !live(e)) return;
                var col = e.state === 'confirmed' ? '#22D3EE' : e.status === 'high' ? '#16A34A' : e.status === 'uncertain' ? '#F59E0B' : '#EF4444';
                c.strokeStyle = col; c.lineWidth = e.id === S.sel ? 4 : 2; c.setLineDash(e.state === 'rejected' ? [3, 4] : []);
                (e.px || []).forEach(function (pl) { c.beginPath(); pl.forEach(function (q, i) { var s = X(T, q); i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); }); c.stroke(); });
            });
            c.setLineDash([]);
        }
        if (S.cropping && S.quad && mode === 'original') {
            var pts = S.quad.map(function (q) { return X(T, [q[0] * im.w, q[1] * im.h]); });
            c.strokeStyle = '#22D3EE'; c.lineWidth = 2; c.beginPath(); pts.forEach(function (s, i) { i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); }); c.closePath(); c.stroke();
            pts.forEach(function (s) { c.fillStyle = '#22D3EE'; c.beginPath(); c.arc(s[0], s[1], 8, 0, 7); c.fill(); });
        }
    }
    function drawPlan(c, sz, T) {
        c.fillStyle = S.white ? '#FFFFFF' : '#0B1220'; c.fillRect(0, 0, sz.w, sz.h);
        if (!S.doc) return;
        if (S.grid) drawGrid(c, sz, T);
        var order = ['ref', 'contour', 'axis', 'other', 'stair', 'column', 'partition', 'wall', 'window', 'door', 'dimension', 'text'];
        order.forEach(function (ty) { ents().forEach(function (e) { if (e.type === ty && S.layers[e.layer] && live(e)) drawEnt(c, e, T); }); });
        var sel = selected();
        if (sel && S.layers[sel.layer]) {
            c.strokeStyle = '#06B6D4'; c.lineWidth = 2; c.setLineDash([5, 3]);
            polysOf(sel).forEach(function (pl) { c.beginPath(); pl.forEach(function (q, i) { var s = X(T, q); i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); }); c.stroke(); });
            c.setLineDash([]);
            handlesOf(sel).forEach(function (q) { var s = X(T, q); c.fillStyle = '#fff'; c.strokeStyle = '#06B6D4'; c.lineWidth = 2; c.fillRect(s[0] - 4, s[1] - 4, 8, 8); c.strokeRect(s[0] - 4, s[1] - 4, 8, 8); });
        }
        if (S.tool === 'close') freeEnds().forEach(function (f) { var s = X(T, f.p); c.strokeStyle = '#EF4444'; c.lineWidth = 2; c.beginPath(); c.arc(s[0], s[1], 7, 0, 7); c.stroke(); });
        if (S.draft && S.draft.cur) { var a = X(T, S.draft.a), b = X(T, S.draft.cur); c.strokeStyle = '#06B6D4'; c.lineWidth = 2; c.setLineDash([6, 4]); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); c.setLineDash([]); c.fillStyle = '#0369A1'; c.font = '700 12px sans-serif'; c.fillText(fmt(dist(S.draft.a, S.draft.cur) * UF[S.units]) + ' ' + S.units, b[0] + 8, b[1] - 8); }
    }
    function drawGrid(c, sz, T) {
        var unit = 1; while (unit * T.k < 28) unit *= 5; while (unit * T.k > 170) unit /= 5;
        var a = W(T, 0, sz.h), b = W(T, sz.w, 0), v;
        c.strokeStyle = S.white ? '#E5E7EB' : '#1E293B'; c.lineWidth = 1; c.beginPath();
        for (v = Math.floor(a[0] / unit) * unit; v <= b[0]; v += unit) { var sx = X(T, [v, 0])[0]; c.moveTo(sx, 0); c.lineTo(sx, sz.h); }
        for (v = Math.floor(a[1] / unit) * unit; v <= b[1]; v += unit) { var sy = X(T, [0, v])[1]; c.moveTo(0, sy); c.lineTo(sz.w, sy); }
        c.stroke();
    }
    function inkOf(e) { var col = LCOLOR[e.layer] || '#111'; if (!S.white && (col === '#111827' || col === '#374151')) return '#E5E7EB'; return col; }
    function path(c, T, pl) { c.beginPath(); pl.forEach(function (q, i) { var s = X(T, q); i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); }); }
    function label(c, T, at, t, hgt, col, rot) {
        var s = X(T, at), size = Math.max(9, hgt * T.k);
        c.save(); c.translate(s[0], s[1]); if (rot) c.rotate(rot); c.fillStyle = col; c.font = size + 'px Arial, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(t, 0, 0); c.restore();
    }
    function drawEnt(c, e, T) {
        var g = e.geom, col = inkOf(e), ps = polysOf(e), flag = S.highlight && e.state === 'pending' && e.status !== 'high', i;
        if (flag) { c.strokeStyle = e.status === 'manual' ? 'rgba(239,68,68,.32)' : 'rgba(245,158,11,.32)'; c.lineWidth = Math.max(9, (g.width || 0) * T.k + 7); c.lineCap = 'round'; ps.forEach(function (pl) { path(c, T, pl); c.stroke(); }); c.lineCap = 'butt'; }
        c.strokeStyle = col; c.fillStyle = col; c.lineWidth = 1.3; c.setLineDash(e.state === 'rejected' ? [3, 3] : []);
        switch (g.kind) {
            case 'line': c.lineWidth = g.width ? Math.max(1.5, g.width * T.k) : 1.3; if (g.dashed) c.setLineDash([8, 5]); c.lineCap = g.width ? 'square' : 'butt'; ps.forEach(function (pl) { path(c, T, pl); c.stroke(); }); c.lineCap = 'butt'; break;
            case 'polyline': ps.forEach(function (pl) { path(c, T, pl); c.stroke(); }); if (e.room && e.area != null && S.layers['00_REFERENCIA']) { var pt = g.pts.reduce(function (m, q) { return [m[0] + q[0] / g.pts.length, m[1] + q[1] / g.pts.length]; }, [0, 0]); label(c, T, [pt[0], pt[1] - S.doc.params.text_height * 2], fmt(e.area) + ' m²', S.doc.params.text_height * .85, '#64748B'); } break;
            case 'circle': case 'rect': ps.forEach(function (pl) { path(c, T, pl); c.stroke(); }); break;
            case 'door': c.lineWidth = 1.2; path(c, T, ps[0]); c.stroke(); c.lineWidth = 2.4; path(c, T, ps[1]); c.stroke(); break;
            case 'access': c.setLineDash([6, 4]); c.lineWidth = 2; ps.forEach(function (pl) { path(c, T, pl); c.stroke(); }); break;
            case 'window':
                var d = (g.depth || .15) / 2, L = dist(g.a, g.b) || 1, nx = -(g.b[1] - g.a[1]) / L * d, ny = (g.b[0] - g.a[0]) / L * d;
                path(c, T, [[g.a[0] + nx, g.a[1] + ny], [g.b[0] + nx, g.b[1] + ny], [g.b[0] - nx, g.b[1] - ny], [g.a[0] - nx, g.a[1] - ny], [g.a[0] + nx, g.a[1] + ny]]); c.stroke(); path(c, T, [g.a, g.b]); c.stroke(); break;
            case 'stair': for (i = 0; i < ps.length; i++) { path(c, T, ps[i]); c.stroke(); } break;
            case 'text': label(c, T, g.at, g.text, g.height, col); break;
            case 'note_dim': label(c, T, g.at, g.text + ' ?', g.height, '#DC2626'); break;
            case 'dim':
                path(c, T, [g.a, g.b]); c.stroke();
                [g.a, g.b].forEach(function (q) { var s = X(T, q); c.beginPath(); c.moveTo(s[0] - 4, s[1] + 4); c.lineTo(s[0] + 4, s[1] - 4); c.lineWidth = 2; c.stroke(); });
                var hz = g.axis === 'x', th = g.height, m = [(g.a[0] + g.b[0]) / 2 + (hz ? 0 : -th * .8), (g.a[1] + g.b[1]) / 2 + (hz ? th * .8 : 0)], t = e.applied ? fmt(dist(g.a, g.b) * UF[S.units]) + ' ' + S.units : (g.written || '');
                label(c, T, m, t, th, e.applied ? col : '#DC2626', hz ? 0 : -Math.PI / 2); break;
            case 'axis':
                c.setLineDash([12, 4, 2, 4]); c.lineWidth = .8; c.globalAlpha = .6; path(c, T, [g.a, g.b]); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
                var r = Math.max(9, g.height * 1.2 * T.k), s0 = X(T, g.a); c.beginPath(); c.arc(s0[0], s0[1], r, 0, 7); c.stroke(); label(c, T, g.a, g.label, g.height, col); break;
        }
        c.setLineDash([]);
    }

    /* ───────── interacción ───────── */
    function freeEnds() {
        var segs = ents().filter(function (e) { return (e.type === 'wall' || e.type === 'partition') && e.state !== 'rejected' && e.geom.kind === 'line'; }), out = [], tol = 0.04;
        segs.forEach(function (e) { ['a', 'b'].forEach(function (k) { var p = e.geom[k], free = !segs.some(function (o) { return o !== e && ptSeg(p, o.geom.a, o.geom.b) < tol; }); if (free) out.push({ p: p, e: e, k: k }); }); });
        return out;
    }
    function hitAt(mode, w0, tolW) {
        var best = null, bd = tolW;
        ents().forEach(function (e) {
            if (!S.layers[e.layer] || !live(e) || e.type === 'ref' || e.type === 'axis') return;
            var polys = mode === 'plan' ? polysOf(e) : (e.px || []), dd = hitDist(e, w0, polys);
            if (e.type === 'contour') dd += tolW * .6; // los contornos son fondo: ceden ante el resto
            if (dd <= bd) { bd = dd; best = e; }
        });
        return best;
    }
    function snapPoint(p, T, skip) {
        var r = 10 / T.k, best = null, bd = r;
        ents().forEach(function (e) { if (e === skip || e.state === 'rejected' || !S.layers[e.layer] || e.type === 'axis' || e.type === 'ref') return; handlesOf(e).forEach(function (q) { var d = dist(p, q); if (d < bd) { bd = d; best = q; } }); });
        return best ? [best[0], best[1]] : p;
    }
    function ortho(a, p, ev) { if (ev.shiftKey) return p; return Math.abs(p[0] - a[0]) > Math.abs(p[1] - a[1]) ? [p[0], a[1]] : [a[0], p[1]]; }
    function bindPane(p) {
        var c = p.__c;
        function loc(ev) { var r = c.getBoundingClientRect(); return [ev.clientX - r.left, ev.clientY - r.top]; }
        c.addEventListener('wheel', function (ev) { ev.preventDefault(); var T = S.T[p.__mode], l = loc(ev), f = ev.deltaY < 0 ? 1.15 : 1 / 1.15; zoomAt(T, l[0], l[1], f); draw(); }, { passive: false });
        c.addEventListener('pointerdown', function (ev) { c.setPointerCapture(ev.pointerId); down(p, loc(ev), ev); });
        c.addEventListener('pointermove', function (ev) { move(p, loc(ev), ev); });
        c.addEventListener('pointerup', function (ev) { up(p, loc(ev), ev); });
    }
    function zoomAt(T, x, y, f) { var w0 = W(T, x, y); T.k *= f; var s = X(T, w0); T.ox += x - s[0]; T.oy += y - s[1]; }
    function down(p, l, ev) {
        var mode = p.__mode, T = S.T[mode], w0 = W(T, l[0], l[1]);
        if (S.cropping && mode === 'original') {
            var im = imageFor(mode), idx = -1, bd = 22;
            S.quad.forEach(function (q, i) { var s = X(T, [q[0] * im.w, q[1] * im.h]), d = Math.hypot(s[0] - l[0], s[1] - l[1]); if (d < bd) { bd = d; idx = i; } });
            if (idx >= 0) { S.drag = { kind: 'quad', i: idx, im: im }; return; }
        }
        if (ev.button === 1 || ev.button === 2 || mode === 'original') { S.drag = { kind: 'pan', T: T, l: l }; return; }
        if (!S.doc) { S.drag = { kind: 'pan', T: T, l: l }; return; }
        if (mode === 'detect') { var ed = hitAt('detect', w0, 8 / T.k); if (ed) { S.sel = ed.id; refresh(); } else S.drag = { kind: 'pan', T: T, l: l }; return; }
        if (S.tool === 'select') {
            var sel = selected();
            if (sel && S.layers[sel.layer]) { var hs = handlesOf(sel), q = hs.filter(function (x) { var s = X(T, x); return Math.hypot(s[0] - l[0], s[1] - l[1]) < 10; })[0]; if (q) { begin(); S.drag = { kind: 'handle', q: q, e: sel, moved: false }; return; } }
            var e = hitAt('plan', w0, 8 / T.k);
            if (e) { S.sel = e.id; refresh(); begin(); S.drag = { kind: 'move', e: e, last: w0, moved: false }; }
            else { S.sel = null; refresh(); S.drag = { kind: 'pan', T: T, l: l }; }
            return;
        }
        toolClick(w0, T, ev);
    }
    function move(p, l, ev) {
        var mode = p.__mode, T = S.T[mode], dg = S.drag, w0 = W(T, l[0], l[1]);
        if (S.draft && mode === 'plan') { S.draft.cur = S.draft.free ? w0 : ortho(S.draft.a, snapPoint(w0, T, null), ev); draw(); }
        if (!dg) return;
        if (dg.kind === 'pan') { dg.T.ox += l[0] - dg.l[0]; dg.T.oy += l[1] - dg.l[1]; dg.l = l; draw(); }
        else if (dg.kind === 'quad') { S.quad[dg.i] = [Math.max(0, Math.min(1, w0[0] / dg.im.w)), Math.max(0, Math.min(1, w0[1] / dg.im.h))]; draw(); }
        else if (dg.kind === 'handle') { var s = snapPoint(w0, T, dg.e); dg.q[0] = s[0]; dg.q[1] = s[1]; syncDim(dg.e); dg.moved = true; draw(); }
        else if (dg.kind === 'move') { var dx = w0[0] - dg.last[0], dy = w0[1] - dg.last[1]; eachPoint(dg.e.geom, function (q) { q[0] += dx; q[1] += dy; }); syncDim(dg.e); dg.last = w0; dg.moved = true; draw(); }
    }
    function up() {
        var dg = S.drag; S.drag = null; if (!dg) return;
        if (dg.kind === 'handle' || dg.kind === 'move') { if (dg.moved) { touch(dg.e); commit((dg.kind === 'move' ? 'Mover ' : 'Ajustar ') + TYPE_LABEL[dg.e.type].toLowerCase()); } else S._before = null; }
    }
    function touch(e) { if (e.state === 'pending') e.state = 'confirmed'; e.edited = true; }
    function addEnt(type, geom, label_) {
        begin();
        var e = { id: uid(), type: type, layer: LAYER_OF[type] || '09_OTROS', geom: geom, px: [], conf: 1, status: 'high', state: 'confirmed', source: 'manual' };
        S.doc.entities.push(e); S.sel = e.id; commit(label_ || ('Añadir ' + TYPE_LABEL[type].toLowerCase()));
        return e;
    }
    function toolClick(w0, T, ev) {
        var p = snapPoint(w0, T, null), t = S.tool;
        if (t === 'calibrate') {
            var e = hitAt('plan', w0, 10 / T.k), L = e && lengthOf(e);
            if (!L) { status('Haz clic sobre una línea, una cota o un muro.'); return; }
            ask('Calibrar escala', 'Esa línea mide ahora ' + fmt(L * (S.doc.scale.known ? UF[S.units] : 1)) + ' ' + (S.doc.scale.known ? S.units : 'unidades de imagen') + '. ¿Cuánto mide en la realidad?', [{ k: 'v', label: 'Medida real', value: '' }, { k: 'u', label: 'Unidad', options: ['m', 'cm', 'mm', 'in'], value: 'm' }]).then(function (r) {
                if (!r) return; var v = num(r.v, NaN); if (!(v > 0)) { status('⚠ Medida no válida.'); return; }
                calibrate(v / UF[r.u] / L); setTool('select');
            });
            return;
        }
        if (t === 'text') { ask('Nuevo texto', '', [{ k: 't', label: 'Contenido', value: '' }]).then(function (r) { if (r && r.t) addEnt('text', { kind: 'text', at: p, text: r.t, height: S.doc.params.text_height, role: 'note' }); }); return; }
        if (t === 'close') {
            var fr = freeEnds().filter(function (f) { return dist(f.p, w0) < 14 / T.k; })[0];
            if (!fr) { status('Pulsa un extremo libre (círculo rojo).'); draw(); return; }
            if (!S.draft) { S.draft = { a: [fr.p[0], fr.p[1]], cur: fr.p, free: true, src: fr }; status('Ahora pulsa el otro extremo libre.'); return; }
            var src = S.draft.src; S.draft = null;
            if (fr.e === src.e) return;
            addEnt(src.e.type, { kind: 'line', a: [src.p[0], src.p[1]], b: [fr.p[0], fr.p[1]], width: src.e.geom.width }, 'Cerrar contorno');
            return;
        }
        if (!S.draft) { S.draft = { a: p, cur: p }; return; }
        var a = S.draft.a, b = ortho(a, p, ev); S.draft = null;
        if (dist(a, b) < 1e-3) return;
        var pr = S.doc.params;
        if (t === 'wall') addEnt('wall', { kind: 'line', a: a, b: b, width: pr.wall_thickness });
        else if (t === 'partition') addEnt('partition', { kind: 'line', a: a, b: b, width: pr.partition_thickness });
        else if (t === 'window') addEnt('window', { kind: 'window', a: a, b: b, depth: pr.wall_thickness });
        else if (t === 'door') { var r = dist(a, b), L2 = r || 1, leaf = [a[0] - (b[1] - a[1]) / L2 * r, a[1] + (b[0] - a[0]) / L2 * r]; addEnt('door', { kind: 'door', hinge: a, open: b, leaf: leaf }); }
        else if (t === 'dim') {
            var hz = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]), off = pr.text_height * 2, A = hz ? [a[0], a[1] + off] : [a[0] - off, a[1]], B = hz ? [b[0], a[1] + off] : [a[0] - off, b[1]], m = dist(A, B);
            addEnt('dimension', { kind: 'dim', axis: hz ? 'x' : 'y', a: A, b: B, base: hz ? A[1] : A[0], written_m: m, measured_m: m, written: fmt(m) + ' m', height: pr.text_height }).applied = true;
            refresh();
        }
    }
    function calibrate(f) {
        begin();
        var wasKnown = S.doc.scale.known;
        ents().forEach(function (e) {
            var g = e.geom; eachPoint(g, function (q) { q[0] *= f; q[1] *= f; });
            if (g.r) g.r *= f; if (g.base != null) g.base *= f; if (g.height && !wasKnown) g.height = null;
            if (g.kind === 'dim') { g.measured_m = dist(g.a, g.b); }
        });
        var span = planBounds(), th = Math.max(span[2] - span[0], span[3] - span[1]) / 42;
        if (!wasKnown) { ents().forEach(function (e) { if ('height' in e.geom) e.geom.height = th; }); S.doc.params.text_height = th; }
        S.doc.scale.known = true; S.doc.scale.source = 'calibración manual'; S.doc.scale.m_per_px = (S.doc.scale.m_per_px || 1) * f; S.doc.units = 'm';
        S.doc.warnings = S.doc.warnings.filter(function (w) { return w.code !== 'no_scale'; });
        S.T = {}; commit('Calibración manual de escala'); fit(); status('Escala calibrada.', 'Revisa las cotas: las que no coincidan quedan marcadas.');
    }

    /* ───────── panel derecho ───────── */
    function dotCls(e) { return e.state === 'confirmed' ? 'done' : e.status; }
    function itemRow(e, txt, sub) {
        var row = h('div', { class: 'cvv-it' + (e.id === S.sel ? ' sel' : '') + (e.state === 'rejected' ? ' rej' : ''), onclick: function () { S.sel = e.id; refresh(); } }, h('i', { class: 'cvv-dot ' + dotCls(e) }), h('span', { text: txt, title: txt }), h('em', { text: sub }));
        return row;
    }
    function passes(e) { var f = S.filter; if (f === 'all') return true; if (f === 'pending') return e.state === 'pending'; if (f === 'rejected') return e.state === 'rejected'; return e.state === 'pending' && e.status === f; }
    function renderList() {
        var L = U.list; L.innerHTML = '';
        Array.prototype.forEach.call(U.tabs.children, function (b) { b.classList.toggle('on', b.__t === S.tab); });
        U.filterRow.hidden = S.tab === 'warn' || S.tab === 'layers';
        if (!S.doc) { L.appendChild(h('div', { class: 'cvv-w info', text: 'Aún no hay plano interpretado.' })); return; }
        var E = ents(), pct = function (e) { return Math.round(e.conf * 100) + ' %'; };
        if (S.tab === 'items') E.filter(function (e) { return ['dimension', 'text', 'axis', 'ref'].indexOf(e.type) < 0 && passes(e); }).forEach(function (e) { var ln = lengthOf(e); L.appendChild(itemRow(e, TYPE_LABEL[e.type] + (e.room ? ': ' + e.room : '') + (e.geom.kind === 'access' ? ' (hueco)' : '') + (ln && S.doc.scale.known ? ' · ' + fmt(ln * UF[S.units]) + ' ' + S.units : ''), pct(e))); });
        else if (S.tab === 'dims') E.filter(function (e) { return e.type === 'dimension' && passes(e); }).forEach(function (e) { var g = e.geom; L.appendChild(itemRow(e, (g.written || g.text) + (g.measured_m != null ? ' → dibujo: ' + fmt(g.measured_m) + ' m' : '') + (e.applied ? '' : ' (no aplicada)'), pct(e))); });
        else if (S.tab === 'texts') E.filter(function (e) { return e.type === 'text' && passes(e); }).forEach(function (e) { L.appendChild(itemRow(e, e.geom.text, pct(e))); });
        else if (S.tab === 'warn') {
            if (!S.doc.warnings.length) L.appendChild(h('div', { class: 'cvv-w info', text: 'Sin advertencias.' }));
            S.doc.warnings.forEach(function (w) { L.appendChild(h('div', { class: 'cvv-w ' + w.level, text: (w.level === 'error' ? '⛔ ' : w.level === 'warn' ? '⚠ ' : 'ℹ ') + w.msg, onclick: function () { if (w.ids[0]) { S.sel = w.ids[0]; refresh(); } } })); });
        } else if (S.tab === 'layers') {
            LAYERS.forEach(function (l) { var n = E.filter(function (e) { return e.layer === l[0] && e.state !== 'rejected'; }).length, cb = h('input', { type: 'checkbox', checked: S.layers[l[0]], onchange: function () { S.layers[l[0]] = cb.checked; draw(); } }); L.appendChild(h('label', { class: 'cvv-chk', style: 'padding:5px 8px;margin:0' }, cb, h('i', { class: 'cvv-dot', style: 'background:' + l[1] + ';outline:1px solid #475569' }), h('span', { text: l[0] + ' (' + n + ')' }))); });
        }
        if (!L.children.length) L.appendChild(h('div', { class: 'cvv-w info', text: 'Nada que mostrar con este filtro.' }));
    }
    function field(label_, value, on, type) { var i = h('input', { type: type || 'text', value: value == null ? '' : value }); i.addEventListener('change', function () { on(i.value); }); return h('label', { class: 'cvv-f' }, label_, i); }
    function setState(e, st) { begin(); e.state = st; commit((st === 'confirmed' ? 'Confirmar ' : 'Rechazar ') + TYPE_LABEL[e.type].toLowerCase()); }
    function stretch(e, newM) {
        begin();
        var g = e.geom, ix = g.axis === 'x' ? 0 : 1, cur = Math.abs(g.b[ix] - g.a[ix]), hi = Math.max(g.a[ix], g.b[ix]), d = newM - cur;
        ents().forEach(function (o) { if (o.type === 'ref') return; eachPoint(o.geom, function (q) { if (q[ix] >= hi - 1e-3) q[ix] += d; }); syncDim(o); });
        g.written_m = newM; g.written = fmt(newM) + ' m'; e.applied = true; touch(e); syncDim(e);
        commit('Aplicar cota ' + fmt(newM) + ' m a la geometría');
    }
    function renderProps() {
        var P = U.props; P.innerHTML = ''; var e = selected();
        if (!e) { P.appendChild(h('p', { class: 'cvv-hint', text: 'Selecciona un elemento en el plano o en la lista.' })); return; }
        var g = e.geom, pc = Math.round(e.conf * 100), col = e.status === 'high' ? '#22C55E' : e.status === 'uncertain' ? '#F59E0B' : '#EF4444';
        P.appendChild(h('h4', { text: TYPE_LABEL[e.type] + (e.room ? ' · ' + e.room : '') }));
        P.appendChild(h('div', { class: 'cvv-hint', text: STATUS_LABEL[e.status] + ' · ' + pc + ' % · ' + STATE_LABEL[e.state] + ' · ' + e.layer }));
        P.appendChild(h('div', { class: 'cvv-conf' }, h('i', { style: 'width:' + pc + '%;background:' + col })));
        if (e.note) P.appendChild(h('div', { class: 'cvv-note', text: e.note }));
        if (e.ocr) P.appendChild(h('div', { class: 'cvv-hint', text: 'Leído por OCR: «' + e.ocr + '»' }));
        P.appendChild(h('div', { class: 'cvv-row' }, h('button', { class: 'cvv-b ok', text: '✓ Confirmar', onclick: function () { setState(e, 'confirmed'); } }), h('button', { class: 'cvv-b bad', text: e.state === 'rejected' ? 'Restaurar' : '✕ Rechazar', onclick: function () { setState(e, e.state === 'rejected' ? 'pending' : 'rejected'); } })));
        if (['wall', 'partition', 'other'].indexOf(e.type) >= 0 && g.kind === 'line') {
            var sel = h('select', { onchange: function () { begin(); var was = e.type; e.type = sel.value; e.layer = LAYER_OF[e.type]; g.width = e.type === 'wall' ? S.doc.params.wall_thickness : e.type === 'partition' ? S.doc.params.partition_thickness : undefined; touch(e); commit('Cambiar ' + TYPE_LABEL[was] + ' a ' + TYPE_LABEL[e.type]); } });
            ['wall', 'partition', 'other'].forEach(function (t) { sel.appendChild(h('option', { value: t, text: TYPE_LABEL[t], selected: e.type === t })); });
            P.appendChild(h('label', { class: 'cvv-f' }, 'Tipo', sel));
        }
        if (g.kind === 'line' || g.kind === 'window') {
            P.appendChild(field('Longitud (' + S.units + ')', fmt(dist(g.a, g.b) * UF[S.units], 3), function (v) { var L = num(v, NaN) / UF[S.units], c = dist(g.a, g.b); if (!(L > 0) || !c) return; begin(); g.b[0] = g.a[0] + (g.b[0] - g.a[0]) / c * L; g.b[1] = g.a[1] + (g.b[1] - g.a[1]) / c * L; touch(e); commit('Cambiar longitud'); }));
            if (g.width) P.appendChild(field('Grosor de dibujo (m)', fmt(g.width, 3), function (v) { var w = num(v, NaN); if (w > 0) { begin(); g.width = w; touch(e); commit('Cambiar grosor'); } }));
        }
        if (g.kind === 'door') {
            P.appendChild(field('Ancho de puerta (' + S.units + ')', fmt(dist(g.hinge, g.open) * UF[S.units], 3), function (v) { var r = num(v, NaN) / UF[S.units], c = dist(g.hinge, g.open); if (!(r > 0)) return; begin(); [g.open, g.leaf].forEach(function (q) { q[0] = g.hinge[0] + (q[0] - g.hinge[0]) / c * r; q[1] = g.hinge[1] + (q[1] - g.hinge[1]) / c * r; }); touch(e); commit('Cambiar ancho de puerta'); }));
            P.appendChild(h('button', { class: 'cvv-b', text: 'Invertir abatimiento', onclick: function () { begin(); g.leaf = [2 * g.hinge[0] - g.leaf[0], 2 * g.hinge[1] - g.leaf[1]]; touch(e); commit('Invertir puerta'); } }));
        }
        if (g.kind === 'text' || g.kind === 'note_dim') {
            P.appendChild(field('Texto', g.text, function (v) { begin(); g.text = v; touch(e); commit('Editar texto'); }));
            P.appendChild(field('Altura (m)', fmt(g.height, 3), function (v) { var x = num(v, NaN); if (x > 0) { begin(); g.height = x; touch(e); commit('Altura de texto'); } }));
        }
        if (g.kind === 'dim') {
            var inp = h('input', { type: 'text', value: fmt(g.written_m, 3) });
            P.appendChild(h('div', { class: 'cvv-hint', text: 'En el dibujo: ' + fmt(g.measured_m, 3) + ' m · Escrita: ' + (g.written || '') }));
            P.appendChild(h('label', { class: 'cvv-f' }, 'Medida correcta (m)', inp));
            P.appendChild(h('button', { class: 'cvv-b go', text: 'Aplicar a la geometría', onclick: function () { var v = num(inp.value, NaN); if (v > 0) stretch(e, v); else status('⚠ Medida no válida.'); } }));
        }
        if (g.kind === 'polyline') {
            var cb = h('input', { type: 'checkbox', checked: !!g.closed, onchange: function () { begin(); g.closed = cb.checked; touch(e); commit(cb.checked ? 'Cerrar contorno' : 'Abrir contorno'); } });
            P.appendChild(h('label', { class: 'cvv-chk' }, cb, 'Contorno cerrado'));
            if (e.area != null) P.appendChild(h('div', { class: 'cvv-hint', text: 'Área: ' + fmt(e.area) + ' m²' }));
        }
        P.appendChild(h('div', { class: 'cvv-hint', text: e.source === 'manual' ? 'Añadido a mano.' : e.source === 'derivado' ? 'Derivado de la geometría detectada.' : 'Detectado automáticamente.' }));
    }
    function syncButtons() {
        var has = !!S.sid, d = !!S.doc;
        U.btnAna.disabled = !has; U.btnPrev.disabled = !has; U.btnCrop.disabled = !has; U.btnPage.disabled = !has;
        U.btnCropOk.hidden = !S.cropping; U.btnExp.disabled = !d; U.btnRev.disabled = !d; U.btnHigh.disabled = !d; U.btnUndo.disabled = !S.undo.length; U.btnRedo.disabled = !S.redo.length;
        Array.prototype.forEach.call(U.tools.children, function (b) { b.disabled = !d; b.classList.toggle('on', b.__t === S.tool); });
        Array.prototype.forEach.call(U.viewBtns.children, function (b) { b.disabled = (b.__v === 'detect' || b.__v === 'plan' || b.__v === 'compare') && !d; });
    }
    function refresh() { renderList(); renderProps(); syncButtons(); draw(); if (S.doc) { var n = pendingCounts(); U.count.textContent = n.manual + ' por decidir · ' + n.uncertain + ' dudosos · ' + n.high + ' altos'; } else U.count.textContent = ''; }
    function setTool(t) { S.tool = t; S.draft = null; var hints = { select: 'Clic para seleccionar. Arrastra para mover; los cuadritos ajustan esquinas.', wall: 'Clic en inicio y fin. Shift desactiva el modo ortogonal.', partition: 'Clic en inicio y fin.', door: 'Clic en la bisagra y en el otro lado del vano.', window: 'Clic en los dos extremos.', text: 'Clic donde va el texto.', dim: 'Clic en los dos puntos a acotar.', calibrate: 'Clic sobre una línea de medida conocida.', close: 'Pulsa dos extremos libres para unirlos.' }; U.hint.textContent = hints[t]; syncButtons(); draw(); }
    function nextPending() {
        var order = { manual: 0, uncertain: 1 }, list = ents().filter(function (e) { return e.state === 'pending' && e.status !== 'high'; }).sort(function (a, b) { return order[a.status] - order[b.status]; });
        if (!list.length) { status('No quedan elementos por revisar.'); return; }
        var cur = list.map(function (e) { return e.id; }).indexOf(S.sel), e = list[(cur + 1) % list.length];
        S.sel = e.id; S.layers[e.layer] = true; S.tab = e.type === 'dimension' ? 'dims' : e.type === 'text' ? 'texts' : 'items'; S.filter = 'pending'; U.filter.value = 'pending'; refresh();
    }

    /* ───────── diálogos ───────── */
    function ask(title, msg, fields) {
        return new Promise(function (res) {
            var vals = {}, dlg = h('div', { class: 'cvv-dlg' }, h('h3', { text: title })), md = h('div', { class: 'cvv-modal' }, dlg), first;
            if (msg) dlg.appendChild(h('p', { text: msg }));
            fields.forEach(function (f) {
                var i;
                if (f.options) { i = h('select'); f.options.forEach(function (o) { i.appendChild(h('option', { value: o, text: o, selected: o === f.value })); }); }
                else i = h('input', { type: 'text', value: f.value || '' });
                vals[f.k] = i; dlg.appendChild(h('label', { class: 'cvv-f' }, f.label, i)); first = first || i;
            });
            function end(ok) { md.remove(); if (!ok) return res(null); var o = {}; Object.keys(vals).forEach(function (k) { o[k] = vals[k].value; }); res(o); }
            dlg.appendChild(h('div', { class: 'cvv-row' }, h('button', { class: 'cvv-b', text: 'Cancelar', onclick: function () { end(false); } }), h('button', { class: 'cvv-b go', text: 'Aceptar', onclick: function () { end(true); } })));
            md.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') end(true); if (ev.key === 'Escape') end(false); ev.stopPropagation(); });
            S.root.appendChild(md); if (first) first.focus();
        });
    }
    function exportDialog() {
        var dlg = h('div', { class: 'cvv-dlg' }, h('h3', { text: 'Exportar plano' })), md = h('div', { class: 'cvv-modal' }, dlg), out = h('div'), n = pendingCounts();
        var unit = h('select'); ['m', 'cm', 'mm', 'in'].forEach(function (u) { unit.appendChild(h('option', { value: u, text: u, selected: u === S.units })); });
        dlg.appendChild(h('p', { text: 'Se exporta como geometría CAD editable, en capas 00–09. La foto no se incrusta.' }));
        dlg.appendChild(h('label', { class: 'cvv-f' }, 'Unidades del archivo DXF', unit));
        dlg.appendChild(out);
        function send(fmt_, ack) {
            out.innerHTML = ''; out.appendChild(h('p', { text: 'Generando ' + fmt_.toUpperCase() + '…' }));
            var payload = { document: Object.assign({}, S.doc, { imageEl: undefined, image: { w: S.doc.image.w, h: S.doc.image.h } }), units: unit.value, acknowledge_uncertain: !!ack };
            post('/export/' + fmt_, payload).then(function (r) {
                if (r.status === 409) return r.json().then(function (j) {
                    out.innerHTML = ''; var ul = h('ul'); j.issues.forEach(function (i) { ul.appendChild(h('li', { text: i.msg })); }); out.appendChild(h('p', { text: 'Antes de exportar:' })); out.appendChild(ul);
                    var row = h('div', { class: 'cvv-row' }, h('button', { class: 'cvv-b', text: 'Volver al editor', onclick: function () { md.remove(); nextPending(); } }));
                    if (j.issues.every(function (i) { return i.code === 'uncertain'; })) row.appendChild(h('button', { class: 'cvv-b go', text: 'Exportar dudosos en rojo', onclick: function () { send(fmt_, true); } }));
                    out.appendChild(row);
                });
                var rep = r.headers.get('X-CAD-Validation');
                return r.blob().then(function (b) {
                    var a = h('a', { href: URL.createObjectURL(b), download: (S.doc.name || 'plano') + '_civix.' + fmt_ }); doc.body.appendChild(a); a.click(); a.remove();
                    out.innerHTML = ''; var msg = fmt_.toUpperCase() + ' descargado.';
                    if (rep) { var j = JSON.parse(rep); msg += ' Verificado: ' + j.dxfversion + ', ' + j.errors + ' errores de auditoría, ' + j.raster_images + ' imágenes incrustadas.'; }
                    out.appendChild(h('p', { text: '✓ ' + msg })); addHist(msg);
                });
            }).catch(function (e) { out.innerHTML = ''; out.appendChild(h('p', { text: '⚠ ' + e.message })); });
        }
        dlg.appendChild(h('div', { class: 'cvv-row', style: 'justify-content:flex-start' }, h('button', { class: 'cvv-b go', text: 'Descargar DXF', onclick: function () { send('dxf'); } }), h('button', { class: 'cvv-b', text: 'Descargar PDF', onclick: function () { send('pdf'); } }), h('button', { class: 'cvv-b', text: 'Descargar SVG', onclick: function () { send('svg'); } })));
        dlg.appendChild(h('div', { class: 'cvv-row' }, h('button', { class: 'cvv-b', text: 'Generar nuevo plano', onclick: function () { md.remove(); S.sid = null; S.upload = null; S.backdrop = null; resetAll(); U.file.textContent = 'Sin archivo'; setView('original'); status('Carga una imagen para empezar.'); } }), h('button', { class: 'cvv-b', text: 'Volver al editor', onclick: function () { md.remove(); } })));
        if (n.manual || n.uncertain) dlg.insertBefore(h('p', { class: 'cvv-note', text: 'Por decidir: ' + n.manual + ' · Dudosos: ' + n.uncertain }), out);
        S.root.appendChild(md);
    }

    /* ───────── construcción de la interfaz ───────── */
    function chk(label_, on) { var i = h('input', { type: 'checkbox', checked: on }); return { i: i, el: h('label', { class: 'cvv-chk' }, i, label_) }; }
    function build() {
        var file = h('input', { type: 'file', accept: '.png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf', hidden: true, onchange: function () { takeFile(file.files[0]); file.value = ''; } });
        var drop = h('div', { class: 'cvv-drop', text: 'Arrastra una foto, croquis o PDF, o haz clic para elegirlo', onclick: function () { file.click(); } });
        ['dragover', 'dragenter'].forEach(function (t) { drop.addEventListener(t, function (ev) { ev.preventDefault(); drop.classList.add('over'); }); });
        drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
        drop.addEventListener('drop', function (ev) { ev.preventDefault(); drop.classList.remove('over'); takeFile(ev.dataTransfer.files[0]); });
        U.file = h('p', { class: 'cvv-hint', text: 'Sin archivo' });

        var rotV = U.rotV = h('b', { text: '0°' }), rot = U.o_rot = h('input', { type: 'range', min: -15, max: 15, step: 0.25, value: 0 }), base90 = 0;
        function applyRot() { S.rotate = base90 + parseFloat(rot.value); rotV.textContent = S.rotate + '°'; S.quad = null; }
        rot.addEventListener('input', applyRot); rot.addEventListener('change', previewPrep);
        var dsk = chk('Corregir inclinación', true), ill = chk('Corregir iluminación', true), con = chk('Mejorar contraste', true), den = chk('Eliminar ruido', true), axs = chk('Generar ejes desde los muros', true);
        U.o_deskew = dsk.i; U.o_illum = ill.i; U.o_contrast = con.i; U.o_denoise = den.i; U.o_axes = axs.i;
        U.o_sens = h('input', { type: 'range', min: 0, max: 1, step: 0.05, value: 0.5 });
        U.o_units = h('select'); [['m', 'Metros'], ['cm', 'Centímetros'], ['mm', 'Milímetros'], ['in', 'Pulgadas']].forEach(function (u) { U.o_units.appendChild(h('option', { value: u[0], text: u[1] })); });
        U.o_wall = h('input', { type: 'number', step: 0.01, min: 0.02, value: 0.15 }); U.o_part = h('input', { type: 'number', step: 0.01, min: 0.02, value: 0.10 });
        U.btnCrop = h('button', { class: 'cvv-b', text: '⛶ Recorte / perspectiva', onclick: startCrop });
        U.btnPage = h('button', { class: 'cvv-b', text: 'Detectar hoja', onclick: function () { if (!S.pageQuad || S.rotate) { status('No se detectó el borde de la hoja: usa Recorte / perspectiva.'); return; } S.quad = S.pageQuad; startCrop(); } });
        U.btnCropOk = h('button', { class: 'cvv-b go full', text: 'Aplicar recorte', hidden: true, onclick: previewPrep });
        U.btnPrev = h('button', { class: 'cvv-b full', text: 'Ver imagen corregida', onclick: previewPrep });
        U.btnAna = h('button', { class: 'cvv-b go full', text: '🧠 Interpretar plano', onclick: analyze, style: 'min-height:38px' });

        var left = h('aside', { class: 'cvv-left' },
            h('div', { class: 'cvv-sec' }, h('h3', { text: '1 · Cargar imagen' }), drop, file, U.file, PAGINA_LOCAL ? null : h('p', { class: 'cvv-hint', text: 'La imagen se envía al servidor de CAD Vision para procesarla y no se guarda: se borra de la memoria en 30 minutos como máximo.' })),
            h('div', { class: 'cvv-sec' }, h('h3', { text: '2 · Preparar imagen' }),
                h('div', { class: 'cvv-row' }, h('button', { class: 'cvv-b', text: '⟲ 90°', onclick: function () { base90 = (base90 + 270) % 360; applyRot(); previewPrep(); } }), h('button', { class: 'cvv-b', text: '⟳ 90°', onclick: function () { base90 = (base90 + 90) % 360; applyRot(); previewPrep(); } }), rotV),
                h('label', { class: 'cvv-f' }, 'Rotación fina', rot),
                h('div', { class: 'cvv-row' }, U.btnCrop, U.btnPage), U.btnCropOk, dsk.el, ill.el, con.el, den.el, U.btnPrev),
            h('div', { class: 'cvv-sec' }, h('h3', { text: '3 · Procesamiento y escala' }),
                h('label', { class: 'cvv-f' }, 'Sensibilidad del trazo', U.o_sens),
                h('label', { class: 'cvv-f' }, 'Unidad si la cota no la indica', U.o_units),
                h('div', { class: 'cvv-row' }, h('label', { class: 'cvv-f' }, 'Muro (m)', U.o_wall), h('label', { class: 'cvv-f' }, 'División (m)', U.o_part)),
                axs.el, h('p', { class: 'cvv-hint', text: 'Los grosores son de dibujo: un croquis de una línea no permite medirlos.' }), U.btnAna));

        U.tools = h('div', { class: 'cvv-tools' });
        [['select', '↖ Seleccionar'], ['calibrate', '📏 Calibrar'], ['wall', 'Muro'], ['partition', 'División'], ['door', 'Puerta'], ['window', 'Ventana'], ['dim', 'Cota'], ['text', 'Texto'], ['close', 'Cerrar contorno']].forEach(function (t) { var b = h('button', { class: 'cvv-b', text: t[1], onclick: function () { setTool(t[0]); } }); b.__t = t[0]; U.tools.appendChild(b); });
        U.btnUndo = h('button', { class: 'cvv-b', text: '↶ Deshacer', onclick: undo }); U.btnRedo = h('button', { class: 'cvv-b', text: '↷ Rehacer', onclick: redo });
        U.hint = h('p', { class: 'cvv-hint', text: 'Clic para seleccionar. Arrastra para mover; los cuadritos ajustan esquinas.' });
        left.appendChild(h('div', { class: 'cvv-sec' }, h('h3', { text: '4 · Corrección' }), U.tools, h('div', { class: 'cvv-row' }, U.btnUndo, U.btnRedo), U.hint));

        U.viewBtns = h('div', { class: 'cvv-tabs' });
        [['original', 'Original'], ['detect', 'Interpretación IA'], ['plan', 'Plano CAD'], ['compare', 'Comparar']].forEach(function (v) { var b = h('button', { text: v[1], onclick: function () { setView(v[0]); } }); b.__v = v[0]; U.viewBtns.appendChild(b); });
        function zoomBtn(f) { return function () { panes().forEach(function (p) { var r = p.getBoundingClientRect(); zoomAt(S.T[p.__mode], r.width / 2, r.height / 2, f); }); draw(); }; }
        var gr = chk('Cuadrícula', true), wh = chk('Fondo blanco', true), hl = chk('Resaltar dudas', true), rj = chk('Ver rechazados', false);
        gr.i.onchange = function () { S.grid = gr.i.checked; draw(); }; wh.i.onchange = function () { S.white = wh.i.checked; draw(); }; hl.i.onchange = function () { S.highlight = hl.i.checked; draw(); }; rj.i.onchange = function () { S.showRejected = rj.i.checked; refresh(); };
        var bar = h('div', { class: 'cvv-bar' }, U.viewBtns, h('span', { class: 'cvv-sp' }), gr.el, wh.el, hl.el, rj.el, h('button', { class: 'cvv-b', text: '−', 'aria-label': 'Alejar', onclick: zoomBtn(1 / 1.25) }), h('button', { class: 'cvv-b', text: '+', 'aria-label': 'Acercar', onclick: zoomBtn(1.25) }), h('button', { class: 'cvv-b', text: 'Ajustar', onclick: fit }));
        U.stage = h('div', { class: 'cvv-stage' });
        U.emptyEl = h('div', { class: 'cvv-empty' }, h('div', { text: 'Carga una fotografía, croquis o PDF para comenzar.' }));
        U.busy = h('div', { class: 'cvv-busy', hidden: true });
        var offMsg = PAGINA_LOCAL
            ? [h('p', { text: 'El motor de CAD Vision no está encendido.' }), h('p', { style: 'color:#94A3B8;font-weight:400', text: 'Abre la carpeta de GeoMetrics y haz doble clic en:' }), h('code', { text: 'iniciar-cad-vision.bat' })]
            : API_BASE
                ? [h('p', { text: 'Conectando con el servidor de CAD Vision…' }), h('p', { style: 'color:#94A3B8;font-weight:400', text: 'Si estaba inactivo puede tardar uno o dos minutos en despertar. Esta pantalla se actualiza sola.' })]
                : [h('p', { text: 'CAD Vision todavía no está disponible aquí.' }), h('p', { style: 'color:#94A3B8;font-weight:400', text: 'Falta conectar esta página con su servidor.' })];
        U.off = h('div', { class: 'cvv-busy cvv-off', hidden: true }, h.apply(null, ['div', null].concat(offMsg, API_BASE ? [h('button', { class: 'cvv-b go', text: 'Reintentar', onclick: health })] : [])));
        var center = h('section', { class: 'cvv-c', style: 'position:relative' }, bar, U.stage, U.busy, U.off);

        U.tabs = h('div', { class: 'cvv-tabs' });
        [['items', 'Elementos'], ['dims', 'Cotas'], ['texts', 'Textos'], ['warn', 'Avisos'], ['layers', 'Capas']].forEach(function (t) { var b = h('button', { text: t[1], onclick: function () { S.tab = t[0]; refresh(); } }); b.__t = t[0]; U.tabs.appendChild(b); });
        U.filter = h('select', { onchange: function () { S.filter = U.filter.value; refresh(); } });
        [['all', 'Todos'], ['pending', 'Pendientes'], ['high', 'Alta confianza'], ['uncertain', 'Con incertidumbre'], ['manual', 'Necesitan intervención'], ['rejected', 'Rechazados']].forEach(function (o) { U.filter.appendChild(h('option', { value: o[0], text: o[1] })); });
        U.filterRow = h('div', null, U.filter); U.filter.style.width = '100%';
        U.list = h('div', { class: 'cvv-list' }); U.props = h('div', { class: 'cvv-props' });
        var right = h('aside', { class: 'cvv-right' }, U.tabs, U.filterRow, U.list, U.props);

        U.st = h('span', { text: 'Carga una imagen para empezar.' }); U.stSub = h('small'); U.hist = h('div', { class: 'cvv-hist' }); U.count = h('small');
        U.btnHigh = h('button', { class: 'cvv-b ok', text: 'Confirmar altas', onclick: function () { begin(); var n = 0; ents().forEach(function (e) { if (e.state === 'pending' && e.status === 'high') { e.state = 'confirmed'; n++; } }); commit('Confirmar ' + n + ' elementos de alta confianza'); } });
        U.btnRev = h('button', { class: 'cvv-b', text: 'Revisar siguiente', onclick: nextPending });
        U.btnExp = h('button', { class: 'cvv-b go', text: 'Exportar…', onclick: exportDialog });
        var bottom = h('footer', { class: 'cvv-bottom' }, h('div', { class: 'cvv-status' }, U.st, U.stSub, U.count), U.hist, h('div', { class: 'cvv-actions' }, U.btnHigh, U.btnRev, U.btnExp));

        U.apiT = h('span', { text: 'Comprobando…' }); U.api = h('span', { class: 'cvv-api' }, h('i'), U.apiT);
        var top = h('header', { class: 'cvv-top' }, h('h2', { text: 'Civix CAD Vision' }), h('small', { text: 'De imagen a plano CAD editable' }), h('span', { class: 'cvv-sp' }), U.api, h('button', { class: 'cvv-b', text: '✕ Cerrar', onclick: close }));
        S.root = h('div', { id: 'cvv', hidden: true, role: 'dialog', 'aria-label': 'Civix CAD Vision' }, top, h('div', { class: 'cvv-main' }, left, center, right), bottom);
        doc.body.appendChild(S.root);
        doc.addEventListener('keydown', onKey);
        new ResizeObserver(function () { if (!S.root.hidden) { S.T = {}; draw(); } }).observe(U.stage);
        setView('original'); refresh();
    }
    function onKey(ev) {
        if (!S.root || S.root.hidden) return;
        var tag = (ev.target.tagName || '').toLowerCase(); if (tag === 'input' || tag === 'select' || tag === 'textarea') return;
        if (S.root.querySelector('.cvv-modal')) return;
        if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); ev.shiftKey ? redo() : undo(); }
        else if (ev.key === 'Delete' || ev.key === 'Backspace') { var e = selected(); if (e) { ev.preventDefault(); setState(e, 'rejected'); } }
        else if (ev.key === 'Escape') { S.draft = null; setTool('select'); }
    }
    function open() { if (!S.root) build(); S.root.hidden = false; doc.documentElement.style.overflow = 'hidden'; health(); S.T = {}; requestAnimationFrame(function () { fit(); }); }
    function close() { S.root.hidden = true; doc.documentElement.style.overflow = ''; }

    /* ───────── pestaña en Planos y CAD ───────── */
    function addTab() {
        var panel = doc.getElementById('civixViewCad'); if (!panel) return false; if (panel.__vision) return true;
        var tabs = panel.querySelector('.cxp-tabs'); if (!tabs) return false; panel.__vision = true;
        var t = h('button', { class: 'cxp-tab', type: 'button', text: '🧠 CAD Vision' }); t.setAttribute('data-t', 'vision'); tabs.appendChild(t);
        var sec = h('section', { class: 'cxp-sec', hidden: true }); sec.setAttribute('data-s', 'vision'); panel.appendChild(sec);
        t.addEventListener('click', function () { panel.querySelectorAll('.cxp-tab').forEach(function (x) { x.classList.toggle('on', x === t); }); panel.querySelectorAll('.cxp-sec').forEach(function (s) { s.hidden = s.getAttribute('data-s') !== 'vision'; }); });
        tabs.querySelectorAll('.cxp-tab').forEach(function (b) { if (b !== t) b.addEventListener('click', function () { t.classList.remove('on'); sec.hidden = true; }); });
        sec.appendChild(h('div', { class: 'cvv-card' }, h('p', { text: 'Sube una foto, un croquis sobre papel cuadriculado o un plano escaneado. CAD Vision lee cotas y nombres, reconstruye muros, puertas y ventanas en medidas reales, y te deja revisar cada elemento antes de descargar el DXF para AutoCAD.' }), h('button', { class: 'cx-btn cxp-go', type: 'button', text: 'Abrir CAD Vision', onclick: open })));
        return true;
    }
    function waitTab(n) { if (addTab()) return; if (n < 60) setTimeout(function () { waitTab(n + 1); }, 250); }
    if (doc) { if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { waitTab(0); }); else waitTab(0); }

    CAD.vision = { open: open, close: close, state: S };
})(typeof window !== 'undefined' ? window : globalThis);
