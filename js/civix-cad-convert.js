/**
 * Civix CAD — Convertidor DWG ⇄ DXF integrado (sin páginas externas).
 *
 *  • DXF  → DXF limpio (R12, abre en cualquier CAD), SVG, PNG, PDF .......... 100 % en el navegador
 *  • DWG  → DXF ........ en el navegador con LibreDWG (WebAssembly, solo LECTURA) si el motor está disponible,
 *                         o con el servidor propio (Worker + CloudConvert) como alternativa
 *  • DXF  → DWG ........ requiere el servidor (el formato DWG es propietario y no se puede escribir en el navegador)
 *
 * Los archivos NO se suben a ningún sitio salvo que el usuario pulse «Convertir con servidor».
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || CAD.convert) return;
    var PI = Math.PI;

    var VERS = { AC1006: 'R10', AC1009: 'R11/R12', AC1012: 'R13', AC1014: 'R14', AC1015: 'AutoCAD 2000', AC1018: 'AutoCAD 2004', AC1021: 'AutoCAD 2007', AC1024: 'AutoCAD 2010', AC1027: 'AutoCAD 2013', AC1032: 'AutoCAD 2018 o posterior' };
    function sniff(buf) {
        var u = new Uint8Array(buf), s = ''; for (var i = 0; i < Math.min(6, u.length); i++) s += String.fromCharCode(u[i]);
        if (/^AC10\d\d$/.test(s) || /^AC\d{4}$/.test(s)) return { kind: 'dwg', code: s, name: VERS[s] || ('versión desconocida (' + s + ')') };
        var head = ''; for (i = 0; i < Math.min(400, u.length); i++) head += String.fromCharCode(u[i]);
        if (/\bSECTION\b/.test(head) || /^\s*0\s*\r?\n/.test(head)) return { kind: 'dxf' };
        if (u.length > 4 && u[0] === 0x41 && u[1] === 0x43) return { kind: 'dwg', code: s, name: 'versión desconocida' };
        return { kind: 'unknown' };
    }

    /* ---------- adaptador base de datos LibreDWG → modelo CivixCAD ---------- */
    function pt(p) { if (!p) return null; if (Array.isArray(p)) return [+p[0] || 0, +p[1] || 0, +p[2] || 0]; return [+p.x || 0, +p.y || 0, +p.z || 0]; }
    function rad(a) { a = +a || 0; return Math.abs(a) > 2 * PI + 0.01 ? a * PI / 180 : a; }
    function arcPts(c, r, a0, a1, ccw) {
        var d = a1 - a0; if (ccw === false) { while (d >= 0) d -= 2 * PI; } else { while (d <= 0) d += 2 * PI; } var n = Math.max(8, Math.ceil(Math.abs(d) / (PI / 36))), o = [], i;
        for (i = 0; i <= n; i++) { var a = a0 + d * i / n; o.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2] || 0]); } return o;
    }
    function bulgePts(a, b, bulge) {
        if (!bulge) return [b]; var th = 4 * Math.atan(bulge), dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy); if (L < 1e-12) return [b];
        var half = Math.abs(th) / 2, R = L / (2 * Math.sin(half)), h = R * Math.cos(half), sg = bulge > 0 ? 1 : -1, cx = (a[0] + b[0]) / 2 - sg * dy / L * h, cy = (a[1] + b[1]) / 2 + sg * dx / L * h;
        var out = arcPts([cx, cy, a[2] || 0], R, Math.atan2(a[1] - cy, a[0] - cx), Math.atan2(b[1] - cy, b[0] - cx), bulge > 0); out.shift(); out[out.length - 1] = b; return out;
    }
    function dbToModel(db) {
        var m = { ents: [], layers: {}, warn: [], units: 0, blocks: {} }, skipped = {}, ents = (db && (db.entities || (db.model && db.model.entities))) || [];
        var lt = db && db.tables && db.tables.LAYER && (db.tables.LAYER.entries || db.tables.LAYER);
        (Array.isArray(lt) ? lt : []).forEach(function (l) { if (l && l.name != null) m.layers[l.name] = { name: l.name, aci: Math.abs(+l.colorIndex || +l.color || 7) || 7, off: !!(l.off || l.frozen || (+l.colorIndex < 0)) }; });
        function layerOf(e) { var n = e.layer != null ? String(e.layer) : '0'; if (!m.layers[n]) m.layers[n] = { name: n, aci: 7 }; return n; }
        function add(o, e) { o.layer = layerOf(e); var ci = +e.colorIndex; if (ci > 0 && ci < 256) o.aci = ci; if (e.color != null && +e.color > 0x1000 && e.colorIndex == null) o.rgb = +e.color; m.ents.push(o); }
        ents.forEach(function (e) {
            var t = String(e.type || e.entityType || '').toUpperCase(), c, p, q;
            switch (t) {
                case 'LINE': p = pt(e.startPoint || e.start); q = pt(e.endPoint || e.end); if (p && q) add({ t: 'poly', pts: [p, q], closed: false }, e); break;
                case 'LWPOLYLINE': case 'POLYLINE': case 'POLYLINE2D': case 'POLYLINE3D': {
                    var vs = (e.vertices || []).map(function (v) { var pp = pt(v.position || v); pp.bulge = +v.bulge || 0; return pp; }); if (vs.length < 2) break;
                    var closed = !!(e.closed || e.shape || ((+e.flag || +e.flags || 0) & 1)), out = [vs[0].slice(0, 3)], n = vs.length, k;
                    for (k = 0; k < (closed ? n : n - 1); k++) { var a = vs[k], b = vs[(k + 1) % n]; var seg = bulgePts([a[0], a[1], a[2]], [b[0], b[1], b[2]], a.bulge); seg.forEach(function (s) { out.push(s); }); }
                    if (closed && out.length > 1) out.pop(); add({ t: 'poly', pts: out, closed: closed }, e); break;
                }
                case 'CIRCLE': c = pt(e.center); if (c && e.radius > 0) add({ t: 'circle', c: c, r: +e.radius }, e); break;
                case 'ARC': c = pt(e.center); if (c && e.radius > 0) add({ t: 'poly', pts: arcPts(c, +e.radius, rad(e.startAngle), rad(e.endAngle)), closed: false }, e); break;
                case 'ELLIPSE': {
                    c = pt(e.center); var mj = pt(e.majorAxisEndPoint || e.majorAxis), ar = +e.axisRatio || +e.ratio || 1; if (!c || !mj) break;
                    var a0 = e.startAngle != null ? rad(e.startAngle) : 0, a1 = e.endAngle != null ? rad(e.endAngle) : 2 * PI, rot = Math.atan2(mj[1], mj[0]), A = Math.hypot(mj[0], mj[1]), B = A * ar, ps = [], N = 72, d = a1 - a0; if (d <= 0) d += 2 * PI;
                    for (k = 0; k <= N; k++) { var u = a0 + d * k / N, x = A * Math.cos(u), y = B * Math.sin(u); ps.push([c[0] + x * Math.cos(rot) - y * Math.sin(rot), c[1] + x * Math.sin(rot) + y * Math.cos(rot), c[2]]); }
                    add({ t: 'poly', pts: ps, closed: Math.abs(d - 2 * PI) < 1e-6 }, e); break;
                }
                case 'SPLINE': { var cp = (e.fitPoints && e.fitPoints.length > 1 ? e.fitPoints : e.controlPoints) || []; var sp = cp.map(pt).filter(Boolean); if (sp.length > 1) add({ t: 'poly', pts: sp, closed: !!e.closed }, e); break; }
                case 'POINT': p = pt(e.position || e.point); if (p) add({ t: 'point', p: p }, e); break;
                case 'TEXT': case 'MTEXT': case 'ATTRIB': {
                    p = pt(e.startPoint || e.insertionPoint || e.position); var s = String(e.text != null ? e.text : (e.textString || '')).replace(/\\P/g, '\n').replace(/\\[A-Za-z][^;]*;/g, '').replace(/[{}]/g, ''); if (!p || !s) break;
                    add({ t: 'text', p: p, h: +e.textHeight || +e.height || 1, s: s.split('\n'), rot: rad(e.rotation || 0), ha: 0, va: 0 }, e); break;
                }
                case 'SOLID': case '3DFACE': case 'TRACE': {
                    var cs = (e.corners || [e.corner1, e.corner2, e.corner3, e.corner4]).map(pt).filter(Boolean); if (cs.length >= 3) { if (cs.length === 4 && t === 'SOLID') cs = [cs[0], cs[1], cs[3], cs[2]]; add({ t: 'poly', pts: cs, closed: true, fill: true, solid: true }, e); } break;
                }
                default: skipped[t || '?'] = (skipped[t || '?'] || 0) + 1;
            }
        });
        var sk = Object.keys(skipped); if (sk.length) m.warn.push('Entidades no soportadas en la vista previa (se conservan en el DXF del servidor, no en el generado aquí): ' + sk.map(function (k) { return k + ' ×' + skipped[k]; }).join(', ') + '.');
        if (!m.ents.length) m.warn.push('No se obtuvieron entidades dibujables.');
        m.bbox = CAD.bboxOf(m.ents); return m;
    }

    /* ---------- motor LibreDWG (WASM) ---------- */
    var engine = null, engineErr = null, engineTried = [];
    function cfg() { return global.CIVIX_LIBREDWG || {}; }
    function candidates() {
        var c = cfg(), base = new URL('js/vendor/libredwg/', document.baseURI).href, list = [];
        if (c.module) list.push({ mod: c.module, wasm: c.wasmDir || c.module.replace(/[^/]*$/, '') });
        list.push({ mod: base + 'libredwg-web.js', wasm: base });
        ['@0.4.2', ''].forEach(function (v) {
            var root = 'https://cdn.jsdelivr.net/npm/@mlightcad/libredwg-web' + v + '/';
            ['dist/libredwg-web.js', 'dist/index.js', 'dist/libredwg-web.mjs', 'dist/index.mjs', 'dist/libredwg-web.es.js'].forEach(function (f) { list.push({ mod: root + f, wasm: root + 'wasm/' }); });
        });
        return list;
    }
    function loadEngine() {
        if (engine) return Promise.resolve(engine); var list = candidates(), i = 0; engineTried = [];
        function next() {
            if (i >= list.length) { engineErr = new Error('No se pudo cargar el motor DWG (' + engineTried.join(' | ') + ')'); return Promise.reject(engineErr); }
            var cd = list[i++];
            return import(/* @vite-ignore */ cd.mod).then(function (mod) {
                var LD = mod.LibreDwg || (mod.default && mod.default.LibreDwg) || mod.default; if (!LD || !LD.create) throw new Error('el módulo no expone LibreDwg.create');
                return LD.create(cd.wasm).catch(function () { return LD.create(); }).then(function (lib) { engine = { lib: lib, T: mod.Dwg_File_Type || (mod.default && mod.default.Dwg_File_Type) || { DWG: 0 }, src: cd.mod }; return engine; });
            }).catch(function (e) { engineTried.push(cd.mod.replace(/^https?:\/\//, '').slice(0, 60) + ': ' + (e && e.message || e)); return next(); });
        }
        return next();
    }
    function dwgToModel(buf) {
        return loadEngine().then(function (en) {
            var lib = en.lib, data = lib.dwg_read_data(buf, en.T.DWG); if (!data) throw new Error('LibreDWG no pudo leer el archivo (¿versión muy nueva o archivo dañado?).');
            var db; try { db = lib.convert(data); } finally { try { lib.dwg_free(data); } catch (e) { } }
            return dbToModel(db);
        });
    }

    /* ---------- servidor (Worker) ---------- */
    function backend() { var u = (global.AI_CONFIG && global.AI_CONFIG.backendUrl || '').trim(); if (!u) return ''; try { return new URL(u).origin; } catch (e) { return ''; } }
    function serverStatus() { var b = backend(); if (!b) return Promise.resolve({ ok: false, why: 'No hay backendUrl configurado en js/config.js.' }); return fetch(b + '/api/convert/status').then(function (r) { return r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status)); }).then(function (j) { return { ok: !!j.enabled, why: j.enabled ? '' : 'El Worker no tiene CLOUDCONVERT_API_KEY.', max: j.maxMB }; }).catch(function (e) { return { ok: false, why: 'El Worker no responde a /api/convert (' + e.message + '). Actualiza y vuelve a desplegar el Worker.' }; }); }
    function serverConvert(buf, from, to) {
        var b = backend(); if (!b) return Promise.reject(new Error('No hay backendUrl configurado.'));
        return fetch(b + '/api/convert?from=' + from + '&to=' + to, { method: 'POST', body: buf, headers: { 'Content-Type': 'application/octet-stream' } }).catch(function () { throw new Error('No se pudo contactar el servidor de conversión. Verifica que el Worker esté desplegado con la versión nueva y que tenga el secreto CLOUDCONVERT_API_KEY (ver backend/cloudflare-worker/CONVERTIDOR-DWG.md).'); }).then(function (r) {
            if (!r.ok) return r.json().catch(function () { return {}; }).then(function (j) { throw new Error(j.error || ('HTTP ' + r.status)); });
            return r.arrayBuffer();
        });
    }

    /* ---------- interfaz ---------- */
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
    function baseName(n) { return String(n || 'plano').replace(/\.[^.]*$/, '').replace(/[^\w\-]+/g, '_') || 'plano'; }
    function mb(n) { return (n / 1048576).toFixed(2) + ' MB'; }

    function convertUI(host) {
        host.innerHTML = '';
        var box = el('div', 'cxp-conv');
        box.innerHTML = '<h4 class="cxp-h4">🔄 Convertidor DWG ⇄ DXF</h4><p class="cxp-note">Arrastra un <b>.dwg</b> o <b>.dxf</b>. El <b>DXF</b> se procesa en tu navegador (sin subir nada). Para el <b>DWG</b> hay dos caminos: el motor integrado (solo lectura DWG→DXF) y el servidor propio (ambos sentidos, el archivo se envía al servicio de conversión).</p>';
        var drop = el('label', 'cxv-drop', '📂 Suelta aquí el archivo o <u>haz clic para elegirlo</u><br><small>.dwg · .dxf — máx. 10 MB</small>'), inp = el('input'); inp.type = 'file'; inp.accept = '.dwg,.dxf'; inp.hidden = true; drop.appendChild(inp);
        var info = el('div'), acts = el('div', 'cxs-row'), view = el('div', 'cx-box'), eng = el('div', 'cxv-eng'), diag = el('details', 'cxp-memo'); diag.innerHTML = '<summary>Diagnóstico del convertidor</summary>'; var dp = el('pre'); diag.appendChild(dp);
        box.appendChild(drop); box.appendChild(info); box.appendChild(acts); box.appendChild(view); box.appendChild(eng); box.appendChild(diag); host.appendChild(box);
        var cur = null, logs = [];
        function log(s) { logs.push(new Date().toLocaleTimeString() + ' ' + s); dp.textContent = logs.join('\n'); }
        function msg(cls, html) { info.innerHTML = ''; var d = el('div', 'cxv-info ' + (cls || ''), html); info.appendChild(d); return d; }
        function btn(label, title, fn, primary) { var b = el('button', 'cx-btn' + (primary ? ' cxp-go' : ''), label); b.type = 'button'; b.title = title || ''; b.addEventListener('click', function () { b.disabled = true; Promise.resolve().then(fn).catch(function (e) { msg('cxv-bad', '⚠ ' + esc(e.message || e)); log('ERROR: ' + (e.message || e)); }).then(function () { b.disabled = false; }); }); return b; }
        function showModel(model, name, xtra) {
            view.innerHTML = ''; var host2 = el('div', 'cx-box'); view.appendChild(host2);
            CAD.viewer(host2, model, { name: name, extra: xtra || '', actions: [{ label: '⬇ PDF', title: 'Exportar a PDF', run: function (m) { CAD.exportRaster(m, 'pdf', name); } }] });
        }
        function refreshEngine() {
            eng.innerHTML = '<span>Motor DWG→DXF en el navegador: <b id="cxvE1">comprobando…</b></span><span>Servidor de conversión (DXF→DWG y respaldo): <b id="cxvE2">comprobando…</b></span>';
            loadEngine().then(function (e) { eng.querySelector('#cxvE1').textContent = '✅ disponible (' + e.src.replace(/^https?:\/\//, '').slice(0, 48) + ')'; log('Motor LibreDWG cargado desde ' + e.src); }).catch(function (e) { eng.querySelector('#cxvE1').textContent = '⚠ no disponible — ' + (engineTried.length ? 'ver diagnóstico' : e.message); log('Motor DWG no disponible: ' + e.message); });
            serverStatus().then(function (s) { eng.querySelector('#cxvE2').textContent = s.ok ? '✅ listo' : '⚠ no disponible — ' + s.why; log('Servidor: ' + (s.ok ? 'listo' : s.why)); });
        }
        function handle(f) {
            if (!f) return; view.innerHTML = ''; acts.innerHTML = '';
            if (f.size > 10 * 1048576) { msg('cxv-bad', '⚠ El archivo pesa ' + mb(f.size) + ' (máximo 10 MB).'); return; }
            var r = new FileReader(); r.onload = function () {
                var buf = r.result, sn = sniff(buf), name = baseName(f.name); cur = { buf: buf, sn: sn, name: name, file: f }; log('Archivo ' + f.name + ' · ' + mb(f.size) + ' · tipo ' + sn.kind + (sn.name ? ' · ' + sn.name : ''));
                if (sn.kind === 'unknown') { msg('cxv-bad', '⚠ No reconozco el formato de <b>' + esc(f.name) + '</b>. Debe ser un DWG o un DXF en texto (los DXF binarios no son compatibles).'); return; }
                if (sn.kind === 'dxf') {
                    var text = new TextDecoder('utf-8').decode(new Uint8Array(buf)); var m = CAD.parseDXF(text);
                    if (!m.ents.length) { msg('cxv-bad', '⚠ El DXF no contiene entidades dibujables que pueda leer (' + esc((m.warn || []).join(' ')) + ').'); return; }
                    msg('cxv-ok', '✅ <b>' + esc(f.name) + '</b> (DXF) leído: <b>' + m.ents.length + '</b> entidades, <b>' + Object.keys(m.layers).length + '</b> capas. ' + esc((m.warn || []).slice(0, 2).join(' ')));
                    showModel(m, name + '_limpio');
                    acts.appendChild(btn('⬇ DXF limpio (R12)', 'Reescribe el DXF en formato R12, el más compatible', function () { CAD.download(name + '_R12.dxf', new Blob([CAD.writeDXF(m)], { type: 'application/dxf' })); log('DXF R12 generado'); }));
                    acts.appendChild(btn('📦 Convertir a DWG (servidor)', 'Envía el archivo al servicio de conversión', function () { log('DXF→DWG por servidor…'); msg('', '⏳ Convirtiendo en el servidor…'); return serverConvert(buf, 'dxf', 'dwg').then(function (out) { CAD.download(name + '.dwg', new Blob([out], { type: 'application/acad' })); msg('cxv-ok', '✅ DWG generado (' + mb(out.byteLength) + '). Se descargó <b>' + esc(name) + '.dwg</b>.'); log('DWG recibido ' + out.byteLength + ' B'); }); }, true));
                    acts.appendChild(el('span', 'cxp-tok', 'Sin servidor: abre el DXF en AutoCAD / LibreCAD / DraftSight y usa «Guardar como… DWG».'));
                } else {
                    msg('', '📐 <b>' + esc(f.name) + '</b> es un <b>DWG</b> (' + esc(sn.name) + '). Elige cómo convertirlo.');
                    acts.appendChild(btn('⚙️ DWG → DXF en el navegador', 'Usa LibreDWG (WebAssembly); no sube el archivo', function () {
                        msg('', '⏳ Cargando motor y leyendo el DWG…'); log('DWG→DXF local…');
                        return dwgToModel(buf).then(function (m) {
                            if (!m.ents.length) throw new Error('El DWG se leyó pero no produjo geometría dibujable. Prueba con el servidor.');
                            msg('cxv-ok', '✅ Convertido en tu navegador: <b>' + m.ents.length + '</b> entidades, <b>' + Object.keys(m.layers).length + '</b> capas. ' + esc((m.warn || []).join(' '))); log('OK: ' + m.ents.length + ' entidades');
                            showModel(m, name); acts.appendChild(btn('⬇ Descargar DXF', 'DXF R12', function () { CAD.download(name + '.dxf', new Blob([CAD.writeDXF(m)], { type: 'application/dxf' })); }, true));
                        });
                    }, true));
                    acts.appendChild(btn('📦 DWG → DXF (servidor)', 'Conserva todas las entidades (bloques, cotas, hatch)', function () {
                        msg('', '⏳ Convirtiendo en el servidor…'); log('DWG→DXF por servidor…');
                        return serverConvert(buf, 'dwg', 'dxf').then(function (out) {
                            var blob = new Blob([out], { type: 'application/dxf' }); CAD.download(name + '.dxf', blob); var m = CAD.parseDXF(new TextDecoder('utf-8').decode(new Uint8Array(out)));
                            msg('cxv-ok', '✅ DXF recibido del servidor (' + mb(out.byteLength) + ') y descargado. Vista previa: ' + m.ents.length + ' entidades.'); log('DXF recibido');
                            if (m.ents.length) showModel(m, name);
                        });
                    }));
                }
            }; r.readAsArrayBuffer(f);
        }
        inp.addEventListener('change', function () { handle(inp.files && inp.files[0]); inp.value = ''; });
        ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
        ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
        drop.addEventListener('drop', function (e) { handle(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]); });
        var first = true;
        host.__activate = function () { if (first) { first = false; refreshEngine(); } };
        CAD.__convAct = host.__activate;
    }

    CAD.convert = { sniff: sniff, dbToModel: dbToModel, dwgToModel: dwgToModel, loadEngine: loadEngine, serverConvert: serverConvert, serverStatus: serverStatus };
    CAD.convertUI = convertUI;
})(typeof window !== 'undefined' ? window : globalThis);
