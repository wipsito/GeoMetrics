/**
 * Civix CAD — lectura robusta de DXF, visor 2D, reparación/escritura de DXF limpio
 * y generación de curvas de nivel (terreno aleatorio o nube de puntos X,Y,Z → TIN → isolíneas).
 *
 * Todo corre en el navegador, sin dependencias. API: window.CivixCAD
 *   parseDXF(texto)            → modelo {ents, layers, bbox, warn[], units}
 *   writeDXF(modelo)           → DXF R12 ASCII limpio (abre en AutoCAD / Civil 3D / LibreCAD / QGIS)
 *   viewer(host, modelo, opts) → visor con zoom, paneo, capas, PNG / SVG / DXF
 *   parsePoints(texto)         → [{x,y,z}]   (CSV, TXT, "P,N,E,Z", coma decimal con ;)
 *   randomTerrain(opts)        → {pts, seed, ...} terreno sintético reproducible por semilla
 *   contours(pts, opts)        → {levels, lines, tin, stats}
 *   contourModel(res, opts)    → modelo CAD con capas (puntos, curvas menores/mayores, cotas, marco, malla)
 *   onSend(texto, adjunto)     → integra con el chat de Civix (true si se atendió localmente)
 *
 * Método de las curvas: triangulación de Delaunay (Bowyer–Watson) sobre los puntos, interpolación lineal
 * de la cota a lo largo de cada arista y encadenado de segmentos por arista compartida. Es el método TIN
 * habitual de topografía. El suavizado (Chaikin) es solo estético y puede desactivarse.
 */
(function (global) {
    'use strict';
    var CAD = {};
    var PI = Math.PI, TAU = PI * 2, D2R = PI / 180;

    /* ============================ COLOR ACI ============================ */
    var ACI9 = { 1: [255, 0, 0], 2: [255, 255, 0], 3: [0, 255, 0], 4: [0, 255, 255], 5: [0, 0, 255], 6: [255, 0, 255], 7: null, 8: [128, 128, 128], 9: [192, 192, 192] };
    function hsv(h, s, v) {
        h = ((h % 360) + 360) % 360 / 60; var i = Math.floor(h), f = h - i, p = v * (1 - s), q = v * (1 - s * f), t = v * (1 - s * (1 - f)), r, g, b;
        switch (i % 6) { case 0: r = v; g = t; b = p; break; case 1: r = q; g = v; b = p; break; case 2: r = p; g = v; b = t; break; case 3: r = p; g = q; b = v; break; case 4: r = t; g = p; b = v; break; default: r = v; g = p; b = q; }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }
    function aciRGB(i) {
        i = Math.abs(i | 0);
        if (i >= 1 && i <= 9) return ACI9[i];
        if (i >= 250 && i <= 255) { var g = [51, 91, 132, 173, 214, 255][i - 250]; return [g, g, g]; }
        if (i >= 10 && i <= 249) {
            var k = i - 10, hue = Math.floor(k / 10) * 15, n = k % 10, val = [1, 1, .8, .8, .6, .6, .5, .5, .3, .3][n], sat = (n % 2 === 0) ? 1 : 0.5;
            return hsv(hue, sat, val);
        }
        return null;
    }
    function rgbCss(c) { return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; }

    /* ============================ MATRICES 2D ============================ */
    function mul(A, B) { // A·B ; [a,b,c,d,e,f]: x' = a x + c y + e ; y' = b x + d y + f
        return [A[0] * B[0] + A[2] * B[1], A[1] * B[0] + A[3] * B[1], A[0] * B[2] + A[2] * B[3], A[1] * B[2] + A[3] * B[3], A[0] * B[4] + A[2] * B[5] + A[4], A[1] * B[4] + A[3] * B[5] + A[5]];
    }
    var I3 = [1, 0, 0, 1, 0, 0];
    function tp(M, p) { return [M[0] * p[0] + M[2] * p[1] + M[4], M[1] * p[0] + M[3] * p[1] + M[5], p[2] || 0]; }
    function mscale(M) { return Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) || 1; }
    function mrot(M) { return Math.atan2(M[1], M[0]); }

    /* ============================ LECTOR DXF ============================ */
    function cleanText(s) {
        s = String(s == null ? '' : s);
        s = s.replace(/%%[dD]/g, '°').replace(/%%[pP]/g, '±').replace(/%%[cC]/g, 'Ø').replace(/%%[uUoO]/g, '').replace(/%%(\d{3})/g, function (m, d) { return String.fromCharCode(+d); });
        s = s.replace(/\\U\+([0-9A-Fa-f]{4})/g, function (m, h) { return String.fromCharCode(parseInt(h, 16)); });
        return s;
    }
    function cleanMText(s) {
        s = String(s || '');
        s = s.replace(/\\P/g, '\n').replace(/\\~/g, ' ').replace(/\\[Ff][^;]*;/g, '').replace(/\\[HhWwQqTtAaCc][^;]*;/g, '').replace(/\\[LlOoKk]/g, '').replace(/\\S([^;^]*)[\^\/#]([^;]*);/g, '$1/$2').replace(/[{}]/g, '').replace(/\\\\/g, '\\');
        return cleanText(s);
    }
    function tagsOf(text) {
        var lines = String(text || '').replace(/^﻿/, '').split(/\r\n|\r|\n/), tags = [], i = 0;
        while (i < lines.length) {
            var cs = lines[i].trim();
            if (cs === '' || !/^-?\d+$/.test(cs)) { i++; continue; }          // resincroniza si hay basura entre pares
            var code = parseInt(cs, 10), val = i + 1 < lines.length ? lines[i + 1] : '';
            tags.push([code, val.replace(/\s+$/, '').replace(/^\s+/, code === 1 || code === 3 || code === 2 ? '' : '')]);
            i += 2;
        }
        return tags;
    }
    function group(tags, from, stop) { // agrupa en entidades crudas hasta stop(tag)
        var ents = [], cur = null, i = from;
        for (; i < tags.length; i++) {
            var t = tags[i];
            if (t[0] === 0) {
                if (stop && stop(t[1])) break;
                cur = { type: String(t[1]).toUpperCase(), g: [] }; ents.push(cur);
            } else if (cur) cur.g.push(t);
        }
        // agrupa POLYLINE ... VERTEX ... SEQEND y INSERT con ATTRIB
        var out = [], p = null;
        ents.forEach(function (e) {
            if (e.type === 'POLYLINE') { p = e; p.verts = []; out.push(e); }
            else if (e.type === 'VERTEX' && p) p.verts.push(e);
            else if (e.type === 'SEQEND') p = null;
            else { if (e.type !== 'ATTRIB') p = null; if (e.type !== 'ATTRIB') out.push(e); }
        });
        return { ents: out, next: i };
    }
    function gv(e, c, d) { for (var i = 0; i < e.g.length; i++) if (e.g[i][0] === c) return e.g[i][1]; return d; }
    function gn(e, c, d) { var v = gv(e, c, null); if (v === null) return d; var n = parseFloat(v); return isFinite(n) ? n : d; }
    function ga(e, c) { var r = []; for (var i = 0; i < e.g.length; i++) if (e.g[i][0] === c) r.push(e.g[i][1]); return r; }

    function bulgeArc(p1, p2, b, out) { // añade puntos intermedios (sin p1, con p2)
        if (!b || Math.abs(b) < 1e-9) { out.push(p2); return; }
        var dx = p2[0] - p1[0], dy = p2[1] - p1[1], c = Math.hypot(dx, dy); if (c < 1e-12) { out.push(p2); return; }
        var theta = 4 * Math.atan(b), d = c * (1 - b * b) / (4 * b), nx = -dy / c, ny = dx / c;
        var cx = (p1[0] + p2[0]) / 2 + nx * d, cy = (p1[1] + p2[1]) / 2 + ny * d, r = Math.hypot(p1[0] - cx, p1[1] - cy), a0 = Math.atan2(p1[1] - cy, p1[0] - cx);
        var n = Math.max(2, Math.ceil(Math.abs(theta) / (PI / 24))), z0 = p1[2] || 0, z1 = p2[2] || 0;
        for (var i = 1; i < n; i++) { var t = i / n, a = a0 + theta * t; out.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + (z1 - z0) * t]); }
        out.push(p2);
    }
    function deBoor(p, knots, ctrl, u) {
        var n = ctrl.length - 1, k = p; for (var s = p; s < n; s++) if (u >= knots[s + 1]) k = s + 1; else break;
        var d = []; for (var j = 0; j <= p; j++) d.push(ctrl[Math.min(n, Math.max(0, j + k - p))].slice());
        for (var r = 1; r <= p; r++) for (var jj = p; jj >= r; jj--) {
            var den = knots[jj + 1 + k - r] - knots[jj + k - p], al = den === 0 ? 0 : (u - knots[jj + k - p]) / den;
            for (var q = 0; q < 3; q++) d[jj][q] = (1 - al) * d[jj - 1][q] + al * d[jj][q];
        }
        return d[p];
    }
    function layerTable(tags, from) {
        var layers = {}, i = from;
        for (; i < tags.length; i++) {
            if (tags[i][0] === 0 && tags[i][1] === 'ENDSEC') break;
            if (tags[i][0] === 0 && String(tags[i][1]).toUpperCase() === 'LAYER') {
                var L = { name: '0', aci: 7, off: false }; i++;
                for (; i < tags.length && tags[i][0] !== 0; i++) {
                    var c = tags[i][0], v = tags[i][1];
                    if (c === 2) L.name = v; else if (c === 62) { var n = parseInt(v, 10) || 7; if (n < 0) L.off = true; L.aci = Math.abs(n) || 7; } else if (c === 70) { if ((parseInt(v, 10) || 0) & 1) L.off = true; } else if (c === 420) L.rgb = trueColor(v);
                }
                i--; layers[L.name] = L;
            }
        }
        return layers;
    }
    function trueColor(v) { var n = parseInt(v, 10); if (!isFinite(n)) return null; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }

    function parseDXF(text) {
        var warn = [], tags = tagsOf(text), model = { ents: [], layers: {}, bbox: null, warn: warn, units: null, blocks: {}, nraw: 0 };
        if (!tags.length) { warn.push('El archivo no tiene pares código/valor de DXF (¿es un DWG binario o texto vacío?).'); return finish(model); }
        var secs = {}, i = 0, hasSection = false;
        for (; i < tags.length; i++) {
            if (tags[i][0] === 0 && String(tags[i][1]).toUpperCase() === 'SECTION' && tags[i + 1] && tags[i + 1][0] === 2) {
                hasSection = true; var nm = String(tags[i + 1][1]).toUpperCase(); secs[nm] = i + 2;
            }
        }
        var entStart;
        if (hasSection) {
            if (secs.HEADER != null) { for (var h = secs.HEADER; h < tags.length && !(tags[h][0] === 0 && tags[h][1] === 'ENDSEC'); h++) if (tags[h][0] === 9 && tags[h][1] === '$INSUNITS' && tags[h + 1]) model.units = parseInt(tags[h + 1][1], 10); }
            if (secs.TABLES != null) model.layers = layerTable(tags, secs.TABLES);
            if (secs.BLOCKS != null) {
                var pos = secs.BLOCKS, guard = 0;
                while (pos < tags.length && guard++ < 20000) {
                    while (pos < tags.length && !(tags[pos][0] === 0 && (tags[pos][1] === 'BLOCK' || tags[pos][1] === 'ENDSEC'))) pos++;
                    if (pos >= tags.length || tags[pos][1] === 'ENDSEC') break;
                    var hd = { g: [] }; pos++;
                    while (pos < tags.length && tags[pos][0] !== 0) { hd.g.push(tags[pos]); pos++; }
                    var gr = group(tags, pos, function (t) { return t === 'ENDBLK'; });
                    model.blocks[gv(hd, 2, '')] = { name: gv(hd, 2, ''), base: [gn(hd, 10, 0), gn(hd, 20, 0)], raw: gr.ents };
                    pos = gr.next;
                }
            }
            entStart = secs.ENTITIES;
            if (entStart == null) { warn.push('No hay sección ENTITIES; se intentó leer el archivo como lista de entidades.'); entStart = 0; }
        } else { warn.push('El DXF no tiene secciones (SECTION/ENDSEC); se leyó como lista de entidades sueltas.'); entStart = 0; }
        var gr2 = group(tags, entStart, function (t) { return t === 'ENDSEC' || (hasSection && t === 'SECTION'); });
        model.nraw = gr2.ents.length;
        var unsup = {};
        gr2.ents.forEach(function (e) { emit(model, e, I3, null, 0, unsup, ''); });
        Object.keys(unsup).forEach(function (k) { warn.push(unsup[k] + ' entidad(es) ' + k + ' no se dibujan en el visor.'); });
        if (!model.ents.length && model.nraw) warn.push('Se leyeron ' + model.nraw + ' entidades pero ninguna es dibujable.');
        return finish(model);
    }
    function ensureLayer(model, name) { if (!model.layers[name]) model.layers[name] = { name: name, aci: 7, off: false }; return model.layers[name]; }
    function add(model, ent, e, parentCol, parentLayer) {
        var ly = gv(e, 8, '0'); if (ly === '0' && parentLayer) ly = parentLayer; ent.layer = ly; ensureLayer(model, ly);
        var c = gn(e, 62, 256), tcol = gv(e, 420, null);
        if (tcol !== null) ent.rgb = trueColor(tcol); else if (c === 0) { if (parentCol) { ent.aci = parentCol.aci; ent.rgb = parentCol.rgb; } } else if (c !== 256) ent.aci = Math.abs(c);
        model.ents.push(ent); return ent;
    }
    function emit(model, e, M, parentCol, depth, unsup, parentLayer) {
        var T = e.type, s = mscale(M), P = function (x, y, z) { return tp(M, [x, y, z]); };
        switch (T) {
            case 'LINE': add(model, { t: 'poly', pts: [P(gn(e, 10, 0), gn(e, 20, 0), gn(e, 30, 0)), P(gn(e, 11, 0), gn(e, 21, 0), gn(e, 31, 0))], closed: false }, e, parentCol, parentLayer); break;
            case 'POINT': add(model, { t: 'point', p: P(gn(e, 10, 0), gn(e, 20, 0), gn(e, 30, 0)) }, e, parentCol, parentLayer); break;
            case 'CIRCLE': pushCircle(model, e, M, s, parentCol, parentLayer); break;
            case 'ARC': {
                var a0 = gn(e, 50, 0) * D2R, a1 = gn(e, 51, 360) * D2R, r = gn(e, 40, 0), cx = gn(e, 10, 0), cy = gn(e, 20, 0); while (a1 <= a0) a1 += TAU;
                var n = Math.max(6, Math.ceil((a1 - a0) / (PI / 36))), pts = [];
                for (var k = 0; k <= n; k++) { var a = a0 + (a1 - a0) * k / n; pts.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a), gn(e, 30, 0))); }
                add(model, { t: 'poly', pts: pts, closed: false }, e, parentCol, parentLayer); break;
            }
            case 'ELLIPSE': {
                var ccx = gn(e, 10, 0), ccy = gn(e, 20, 0), mx = gn(e, 11, 1), my = gn(e, 21, 0), ra = gn(e, 40, 1), t0 = gn(e, 41, 0), t1 = gn(e, 42, TAU); while (t1 <= t0) t1 += TAU;
                var nn = Math.max(24, Math.ceil((t1 - t0) / (PI / 36))), ep = [];
                for (var q = 0; q <= nn; q++) { var tt = t0 + (t1 - t0) * q / nn; ep.push(P(ccx + Math.cos(tt) * mx + Math.sin(tt) * (-my * ra), ccy + Math.cos(tt) * my + Math.sin(tt) * (mx * ra), 0)); }
                add(model, { t: 'poly', pts: ep, closed: false }, e, parentCol, parentLayer); break;
            }
            case 'LWPOLYLINE': {
                var vs = [], flag = gn(e, 70, 0), elev = gn(e, 38, 0), g = e.g;
                for (var i = 0; i < g.length; i++) {
                    if (g[i][0] === 10) vs.push({ x: parseFloat(g[i][1]) || 0, y: 0, b: 0 });
                    else if (g[i][0] === 20 && vs.length) vs[vs.length - 1].y = parseFloat(g[i][1]) || 0;
                    else if (g[i][0] === 42 && vs.length) vs[vs.length - 1].b = parseFloat(g[i][1]) || 0;
                }
                pushPoly(model, e, vs.map(function (v) { return { x: v.x, y: v.y, z: elev, b: v.b }; }), !!(flag & 1), M, parentCol, parentLayer); break;
            }
            case 'POLYLINE': {
                var fl = gn(e, 70, 0); if (fl & 64) { unsup['POLYLINE (malla)'] = (unsup['POLYLINE (malla)'] || 0) + 1; break; }
                var el = gn(e, 30, 0), vv = [];
                (e.verts || []).forEach(function (v) { if ((gn(v, 70, 0) & 16)) return; vv.push({ x: gn(v, 10, 0), y: gn(v, 20, 0), z: v.g.some(function (t) { return t[0] === 30; }) ? gn(v, 30, 0) : el, b: gn(v, 42, 0) }); });
                pushPoly(model, e, vv, !!(fl & 1), M, parentCol, parentLayer); break;
            }
            case 'SPLINE': {
                var deg = gn(e, 71, 3), kn = ga(e, 40).map(parseFloat), ctrl = [], fit = [], xs = [], gg = e.g;
                for (var j = 0; j < gg.length; j++) {
                    if (gg[j][0] === 10) ctrl.push([parseFloat(gg[j][1]) || 0, 0, 0]); else if (gg[j][0] === 20 && ctrl.length) ctrl[ctrl.length - 1][1] = parseFloat(gg[j][1]) || 0; else if (gg[j][0] === 30 && ctrl.length) ctrl[ctrl.length - 1][2] = parseFloat(gg[j][1]) || 0;
                    else if (gg[j][0] === 11) fit.push([parseFloat(gg[j][1]) || 0, 0, 0]); else if (gg[j][0] === 21 && fit.length) fit[fit.length - 1][1] = parseFloat(gg[j][1]) || 0;
                }
                var pts2 = [];
                if (ctrl.length > deg && kn.length === ctrl.length + deg + 1) { var u0 = kn[deg], u1 = kn[ctrl.length], ns = Math.max(40, ctrl.length * 12); for (var z = 0; z <= ns; z++) pts2.push(deBoor(deg, kn, ctrl, u0 + (u1 - u0) * Math.min(z / ns, 0.999999))); pts2[pts2.length - 1] = ctrl[ctrl.length - 1]; }
                else pts2 = fit.length > 1 ? fit : ctrl;
                if (pts2.length > 1) add(model, { t: 'poly', pts: pts2.map(function (p) { return P(p[0], p[1], p[2]); }), closed: !!(gn(e, 70, 0) & 1) }, e, parentCol, parentLayer); break;
            }
            case 'TEXT': case 'ATTDEF': {
                var h1 = gn(e, 72, 0), v1 = gn(e, 73, 0), hasAl = (h1 || v1) && gv(e, 11, null) !== null;
                var px = hasAl ? gn(e, 11, 0) : gn(e, 10, 0), py = hasAl ? gn(e, 21, 0) : gn(e, 20, 0), ang = (gn(e, 50, 0) * D2R) + mrot(M);
                var txt = cleanText(gv(e, 1, '')); if (!txt.trim()) break;
                add(model, { t: 'text', p: P(px, py, gn(e, 30, 0)), h: gn(e, 40, 1) * s, s: [txt], rot: ang, ha: h1 === 4 ? 1 : (h1 === 3 || h1 === 5 ? 0 : h1), va: v1 }, e, parentCol, parentLayer); break;
            }
            case 'MTEXT': {
                var tx = ga(e, 3).join('') + gv(e, 1, ''), lines = cleanMText(tx).split('\n'), ap = gn(e, 71, 1), rot = gv(e, 11, null) !== null ? Math.atan2(gn(e, 21, 0), gn(e, 11, 1)) : gn(e, 50, 0) * D2R;
                if (!lines.join('').trim()) break;
                add(model, { t: 'text', p: P(gn(e, 10, 0), gn(e, 20, 0), gn(e, 30, 0)), h: gn(e, 40, 1) * s, s: lines, rot: rot + mrot(M), ha: [0, 1, 2][(ap - 1) % 3], va: ap <= 3 ? 3 : (ap <= 6 ? 2 : 1) }, e, parentCol, parentLayer); break;
            }
            case 'SOLID': case 'TRACE': case '3DFACE': {
                var q4 = [0, 1, 2, 3].map(function (k) { return P(gn(e, 10 + k, 0), gn(e, 20 + k, 0), gn(e, 30 + k, 0)); });
                if (T !== '3DFACE') q4 = [q4[0], q4[1], q4[3], q4[2]];
                var uq = q4.filter(function (p, k) { return k === 0 || Math.hypot(p[0] - q4[k - 1][0], p[1] - q4[k - 1][1]) > 1e-12; });
                add(model, { t: 'poly', pts: uq, closed: true, fill: T !== '3DFACE' }, e, parentCol, parentLayer); break;
            }
            case 'LEADER': {
                var lp = [], gl = e.g; for (var m = 0; m < gl.length; m++) { if (gl[m][0] === 10) lp.push([parseFloat(gl[m][1]) || 0, 0, 0]); else if (gl[m][0] === 20 && lp.length) lp[lp.length - 1][1] = parseFloat(gl[m][1]) || 0; }
                if (lp.length > 1) add(model, { t: 'poly', pts: lp.map(function (p) { return P(p[0], p[1], 0); }), closed: false }, e, parentCol, parentLayer); break;
            }
            case 'HATCH': hatch(model, e, M, parentCol, parentLayer); break;
            case 'INSERT': {
                var bn = gv(e, 2, ''), B = model.blocks[bn]; if (!B) { unsup['INSERT sin bloque «' + bn + '»'] = (unsup['INSERT sin bloque «' + bn + '»'] || 0) + 1; break; }
                if (depth > 6) break;
                var sx = gn(e, 41, 1), sy = gn(e, 42, sx === 1 && gv(e, 42, null) === null ? 1 : 1), rr = gn(e, 50, 0) * D2R, ix = gn(e, 10, 0), iy = gn(e, 20, 0), cs = Math.cos(rr), sn = Math.sin(rr);
                if (gv(e, 42, null) === null) sy = gn(e, 41, 1);
                var Mi = mul(M, mul([1, 0, 0, 1, ix, iy], mul([cs, sn, -sn, cs, 0, 0], mul([sx, 0, 0, sy, 0, 0], [1, 0, 0, 1, -B.base[0], -B.base[1]]))));
                var col = { aci: gn(e, 62, 256) === 256 ? (parentCol && parentCol.aci) : Math.abs(gn(e, 62, 256)), rgb: parentCol && parentCol.rgb }, ly = gv(e, 8, '0');
                var nc = gn(e, 70, 1), nr = gn(e, 71, 1), dc = gn(e, 44, 0), dr = gn(e, 45, 0);
                for (var rj = 0; rj < Math.min(nr, 200); rj++) for (var ci = 0; ci < Math.min(nc, 200); ci++) {
                    var Mk = (nc > 1 || nr > 1) ? mul(Mi, [1, 0, 0, 1, ci * dc / (sx || 1), rj * dr / (sy || 1)]) : Mi;
                    B.raw.forEach(function (be) { emit(model, be, Mk, col, depth + 1, unsup, ly); });
                }
                break;
            }
            case 'DIMENSION': dimension(model, e, M, parentCol, depth, unsup, parentLayer); break;
            case 'ATTRIB': case 'VIEWPORT': case 'SEQEND': case 'ENDBLK': case 'IMAGE': case 'WIPEOUT': case 'OLE2FRAME': case 'ACAD_PROXY_ENTITY': break;
            default: unsup[T] = (unsup[T] || 0) + 1;
        }
    }
    function pushCircle(model, e, M, s, pc, pl) {
        var cx = gn(e, 10, 0), cy = gn(e, 20, 0), r = gn(e, 40, 0), c = tp(M, [cx, cy, gn(e, 30, 0)]);
        add(model, { t: 'circle', c: c, r: r * s }, e, pc, pl);
    }
    function pushPoly(model, e, vs, closed, M, pc, pl) {
        if (vs.length < 2) { if (vs.length === 1) add(model, { t: 'point', p: tp(M, [vs[0].x, vs[0].y, vs[0].z]) }, e, pc, pl); return; }
        var pts = [[vs[0].x, vs[0].y, vs[0].z]], n = vs.length;
        for (var i = 0; i < (closed ? n : n - 1); i++) { var a = vs[i], b = vs[(i + 1) % n]; bulgeArc([a.x, a.y, a.z], [b.x, b.y, b.z], a.b, pts); }
        if (closed && pts.length > 1) pts.pop();
        add(model, { t: 'poly', pts: pts.map(function (p) { return tp(M, p); }), closed: closed }, e, pc, pl);
    }
    function hatch(model, e, M, pc, pl) {
        var g = e.g, paths = [], cur = null, i = 0;
        for (; i < g.length; i++) {
            var c = g[i][0], v = g[i][1];
            if (c === 92) { cur = { flag: parseInt(v, 10) || 0, v: [], edges: [] }; paths.push(cur); }
            else if (cur && cur.flag & 2) { if (c === 10) cur.v.push([parseFloat(v) || 0, 0]); else if (c === 20 && cur.v.length) cur.v[cur.v.length - 1][1] = parseFloat(v) || 0; }
            else if (cur) { if (c === 72) cur.edges.push({ k: parseInt(v, 10) || 0, d: {} }); else if (cur.edges.length) { var ed = cur.edges[cur.edges.length - 1]; if (!ed.d[c]) ed.d[c] = parseFloat(v); } }
        }
        paths.forEach(function (p) {
            var pts = [];
            if (p.flag & 2) pts = p.v.map(function (q) { return tp(M, [q[0], q[1], 0]); });
            else p.edges.forEach(function (ed) {
                if (ed.k === 1) { pts.push(tp(M, [ed.d[10] || 0, ed.d[20] || 0, 0])); pts.push(tp(M, [ed.d[11] || 0, ed.d[21] || 0, 0])); }
                else if (ed.k === 2) { var a0 = (ed.d[50] || 0) * D2R, a1 = (ed.d[51] || 360) * D2R; while (a1 <= a0) a1 += TAU; for (var k = 0; k <= 24; k++) { var a = a0 + (a1 - a0) * k / 24; pts.push(tp(M, [(ed.d[10] || 0) + (ed.d[40] || 0) * Math.cos(a), (ed.d[20] || 0) + (ed.d[40] || 0) * Math.sin(a), 0])); } }
            });
            if (pts.length > 2) add(model, { t: 'poly', pts: pts, closed: true, fill: true, hatch: true }, e, pc, pl);
        });
    }
    function dimension(model, e, M, pc, depth, unsup, pl) {
        var bn = gv(e, 2, ''), B = bn && model.blocks[bn];
        if (B && depth < 6) { B.raw.forEach(function (be) { emit(model, be, M, pc, depth + 1, unsup, gv(e, 8, '0')); }); return; }
        var type = gn(e, 70, 0) & 7, P = function (x, y) { return tp(M, [x, y, 0]); };
        var p1 = [gn(e, 13, 0), gn(e, 23, 0)], p2 = [gn(e, 14, 0), gn(e, 24, 0)], dl = [gn(e, 10, 0), gn(e, 20, 0)], t = gv(e, 1, '');
        if (type === 0 || type === 1) {
            var ang = type === 0 ? gn(e, 50, 0) * D2R : Math.atan2(p2[1] - p1[1], p2[0] - p1[0]), ux = Math.cos(ang), uy = Math.sin(ang), nx = -uy, ny = ux;
            var off = (dl[0] - p1[0]) * nx + (dl[1] - p1[1]) * ny, a = [p1[0] + nx * off, p1[1] + ny * off], b = [p2[0] + nx * ((dl[0] - p2[0]) * nx + (dl[1] - p2[1]) * ny), p2[1] + ny * ((dl[0] - p2[0]) * nx + (dl[1] - p2[1]) * ny)];
            var meas = Math.hypot(b[0] - a[0], b[1] - a[1]), txt = (t && t !== '<>') ? cleanText(t).replace('<>', meas.toFixed(2)) : meas.toFixed(2), s = mscale(M);
            add(model, { t: 'poly', pts: [P(p1[0], p1[1]), P(a[0], a[1])], closed: false }, e, pc, pl); add(model, { t: 'poly', pts: [P(p2[0], p2[1]), P(b[0], b[1])], closed: false }, e, pc, pl); add(model, { t: 'poly', pts: [P(a[0], a[1]), P(b[0], b[1])], closed: false }, e, pc, pl);
            add(model, { t: 'text', p: P((a[0] + b[0]) / 2, (a[1] + b[1]) / 2), h: Math.max(meas * 0.06, 1e-6) * s, s: [txt], rot: Math.atan2(b[1] - a[1], b[0] - a[0]) + mrot(M), ha: 1, va: 1 }, e, pc, pl);
        } else unsup['DIMENSION (tipo ' + type + ')'] = (unsup['DIMENSION (tipo ' + type + ')'] || 0) + 1;
    }
    function finish(model) {
        model.bbox = bboxOf(model.ents);
        var hs = []; model.ents.forEach(function (e) { if (e.t === 'text' && e.h > 0) hs.push(e.h); });
        var span = model.bbox ? Math.max(model.bbox[2] - model.bbox[0], model.bbox[3] - model.bbox[1]) : 1;
        model.ents.forEach(function (e) { if (e.t === 'text' && !(e.h > 0)) e.h = span * 0.012 || 1; });
        return model;
    }
    function bboxOf(ents) {
        var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        function pt(x, y) { if (!isFinite(x) || !isFinite(y)) return; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
        ents.forEach(function (e) {
            if (e.t === 'poly') e.pts.forEach(function (p) { pt(p[0], p[1]); });
            else if (e.t === 'point') pt(e.p[0], e.p[1]);
            else if (e.t === 'circle') { pt(e.c[0] - e.r, e.c[1] - e.r); pt(e.c[0] + e.r, e.c[1] + e.r); }
            else if (e.t === 'text') pt(e.p[0], e.p[1]);
        });
        return x0 === Infinity ? null : [x0, y0, x1, y1];
    }
    function robustBBox(ents) { // percentiles 1–99 de los puntos de anclaje; descarta basura lejana
        var xs = [], ys = [];
        ents.forEach(function (e) {
            if (e.t === 'poly') e.pts.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); });
            else if (e.t === 'point') { xs.push(e.p[0]); ys.push(e.p[1]); } else if (e.t === 'circle') { xs.push(e.c[0]); ys.push(e.c[1]); } else if (e.t === 'text') { xs.push(e.p[0]); ys.push(e.p[1]); }
        });
        if (xs.length < 20) return null;
        xs.sort(function (a, b) { return a - b; }); ys.sort(function (a, b) { return a - b; });
        var q = function (a, f) { return a[Math.min(a.length - 1, Math.max(0, Math.round(f * (a.length - 1))))]; };
        var rx0 = q(xs, 0.01), rx1 = q(xs, 0.99), ry0 = q(ys, 0.01), ry1 = q(ys, 0.99), px = (rx1 - rx0) * 0.08, py = (ry1 - ry0) * 0.08;
        return [rx0 - px, ry0 - py, rx1 + px, ry1 + py];
    }

    /* ============================ ESCRITOR DXF (R12) ============================ */
    function asciiText(s) {
        s = String(s == null ? '' : s).replace(/°/g, '%%d').replace(/±/g, '%%p').replace(/[ØØ⌀]/g, '%%c').replace(/²/g, '2').replace(/³/g, '3');
        try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {}
        return s.replace(/[^\x20-\x7e]/g, '?').replace(/[\r\n]+/g, ' ');
    }
    function writeDXF(model, opts) {
        opts = opts || {};
        var o = [], P = function (c, v) { o.push(String(c)); o.push(String(v)); }, f = function (n) { return (Math.round(n * 1e6) / 1e6).toString().replace(/e\+?/, 'E'); };
        var bb = model.bbox || bboxOf(model.ents) || [0, 0, 10, 10];
        var lnames = Object.keys(model.layers); model.ents.forEach(function (e) { if (lnames.indexOf(e.layer) < 0) lnames.push(e.layer || '0'); });
        if (lnames.indexOf('0') < 0) lnames.unshift('0');
        function lname(n) { return String(n || '0').replace(/[<>\/\\":;?*|=`,]/g, '_').toUpperCase().slice(0, 31) || '0'; }
        P(0, 'SECTION'); P(2, 'HEADER'); P(9, '$ACADVER'); P(1, 'AC1009'); P(9, '$INSBASE'); P(10, 0); P(20, 0); P(30, 0);
        P(9, '$EXTMIN'); P(10, f(bb[0])); P(20, f(bb[1])); P(30, 0); P(9, '$EXTMAX'); P(10, f(bb[2])); P(20, f(bb[3])); P(30, 0);
        P(9, '$LIMMIN'); P(10, f(bb[0])); P(20, f(bb[1])); P(9, '$LIMMAX'); P(10, f(bb[2])); P(20, f(bb[3]));
        P(9, '$LTSCALE'); P(40, 1); P(9, '$TEXTSIZE'); P(40, f(Math.max(bb[2] - bb[0], bb[3] - bb[1]) * 0.012 || 1)); P(0, 'ENDSEC');
        P(0, 'SECTION'); P(2, 'TABLES');
        P(0, 'TABLE'); P(2, 'LTYPE'); P(70, 1); P(0, 'LTYPE'); P(2, 'CONTINUOUS'); P(70, 0); P(3, 'Solid line'); P(72, 65); P(73, 0); P(40, 0); P(0, 'ENDTAB');
        P(0, 'TABLE'); P(2, 'LAYER'); P(70, lnames.length);
        lnames.forEach(function (n) { var L = model.layers[n] || { aci: 7, off: false }; P(0, 'LAYER'); P(2, lname(n)); P(70, 0); P(62, (L.off ? -1 : 1) * (L.aci || 7)); P(6, 'CONTINUOUS'); });
        P(0, 'ENDTAB');
        P(0, 'TABLE'); P(2, 'STYLE'); P(70, 1); P(0, 'STYLE'); P(2, 'STANDARD'); P(70, 0); P(40, 0); P(41, 1); P(50, 0); P(71, 0); P(42, 2.5); P(3, 'txt'); P(4, ''); P(0, 'ENDTAB');
        P(0, 'ENDSEC'); P(0, 'SECTION'); P(2, 'ENTITIES');
        function col(e) { if (e.aci) P(62, e.aci); else if (e.rgb) P(62, nearestAci(e.rgb)); }
        model.ents.forEach(function (e) {
            var ly = lname(e.layer);
            if (e.t === 'poly') {
                var pts = e.pts.filter(function (p) { return isFinite(p[0]) && isFinite(p[1]); }); if (!pts.length) return;
                if (pts.length === 2 && !e.closed && !e.keepPoly) { P(0, 'LINE'); P(8, ly); col(e); P(10, f(pts[0][0])); P(20, f(pts[0][1])); P(30, f(pts[0][2] || 0)); P(11, f(pts[1][0])); P(21, f(pts[1][1])); P(31, f(pts[1][2] || 0)); return; }
                var allZ = pts.every(function (p) { return Math.abs((p[2] || 0) - (pts[0][2] || 0)) < 1e-9; });
                P(0, 'POLYLINE'); P(8, ly); col(e); P(66, 1); P(10, 0); P(20, 0); P(30, allZ ? f(pts[0][2] || 0) : 0); P(70, (e.closed ? 1 : 0) | (allZ ? 0 : 8));
                pts.forEach(function (p) { P(0, 'VERTEX'); P(8, ly); P(10, f(p[0])); P(20, f(p[1])); P(30, f(p[2] || 0)); if (!allZ) P(70, 32); });
                P(0, 'SEQEND'); P(8, ly);
            } else if (e.t === 'point') { P(0, 'POINT'); P(8, ly); col(e); P(10, f(e.p[0])); P(20, f(e.p[1])); P(30, f(e.p[2] || 0)); }
            else if (e.t === 'circle') { P(0, 'CIRCLE'); P(8, ly); col(e); P(10, f(e.c[0])); P(20, f(e.c[1])); P(30, f(e.c[2] || 0)); P(40, f(e.r)); }
            else if (e.t === 'text') {
                e.s.forEach(function (ln, k) {
                    var t = asciiText(ln); if (!t.trim()) return; var ox = Math.sin(e.rot) * e.h * 1.4 * k, oy = -Math.cos(e.rot) * e.h * 1.4 * k;
                    P(0, 'TEXT'); P(8, ly); col(e); P(10, f(e.p[0] + ox)); P(20, f(e.p[1] + oy)); P(30, f(e.p[2] || 0)); P(40, f(e.h)); P(1, t); if (e.rot) P(50, f(e.rot / D2R));
                    if (e.ha || e.va) { P(72, e.ha || 0); P(11, f(e.p[0] + ox)); P(21, f(e.p[1] + oy)); P(31, 0); P(73, e.va === 3 ? 3 : e.va === 2 ? 2 : e.va === 1 ? 1 : 0); }
                });
            }
        });
        P(0, 'ENDSEC'); P(0, 'EOF');
        return o.join('\r\n') + '\r\n';
    }
    function nearestAci(rgb) {
        var best = 7, bd = 1e9, cand = [1, 2, 3, 4, 5, 6, 8, 9, 30, 40, 50, 70, 90, 110, 130, 150, 170, 190, 210, 230];
        cand.forEach(function (i) { var c = aciRGB(i); if (!c) return; var d = Math.pow(c[0] - rgb[0], 2) + Math.pow(c[1] - rgb[1], 2) + Math.pow(c[2] - rgb[2], 2); if (d < bd) { bd = d; best = i; } });
        return best;
    }

    /* ============================ SVG / EXPORT ============================ */
    function toSVG(model, opts) {
        opts = opts || {}; var bb = model.bbox || [0, 0, 10, 10], w = bb[2] - bb[0] || 1, h = bb[3] - bb[1] || 1, pad = Math.max(w, h) * 0.03;
        var fg = opts.bg === 'dark' ? '#e6edf7' : '#111', out = [], W = 1400, sc = W / (w + 2 * pad), H = (h + 2 * pad) * sc;
        function X(x) { return ((x - bb[0] + pad) * sc).toFixed(2); } function Y(y) { return ((bb[3] - y + pad) * sc).toFixed(2); }
        out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H.toFixed(0) + '" viewBox="0 0 ' + W + ' ' + H.toFixed(0) + '"><rect width="100%" height="100%" fill="' + (opts.bg === 'dark' ? '#0b1220' : '#fff') + '"/>');
        model.ents.forEach(function (e) {
            if (model.layers[e.layer] && model.layers[e.layer].off) return;
            var c = entColor(model, e, opts.bg === 'dark'), st = 'stroke="' + c + '" fill="none" stroke-width="1" vector-effect="non-scaling-stroke"';
            if (e.t === 'poly') out.push('<' + (e.closed ? 'polygon' : 'polyline') + ' points="' + e.pts.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ') + '" ' + st.replace('fill="none"', e.fill ? 'fill="' + c + '" fill-opacity="0.18"' : 'fill="none"') + '/>');
            else if (e.t === 'circle') out.push('<circle cx="' + X(e.c[0]) + '" cy="' + Y(e.c[1]) + '" r="' + (e.r * sc).toFixed(2) + '" ' + st + '/>');
            else if (e.t === 'point') out.push('<circle cx="' + X(e.p[0]) + '" cy="' + Y(e.p[1]) + '" r="1.6" fill="' + c + '"/>');
            else if (e.t === 'text') e.s.forEach(function (ln, k) {
                var fs = Math.max(e.h * sc, 1), anc = e.ha === 1 ? 'middle' : e.ha === 2 ? 'end' : 'start', dy = e.va === 3 ? fs * 0.9 : e.va === 2 ? fs * 0.35 : 0;
                out.push('<text x="' + X(e.p[0]) + '" y="' + (parseFloat(Y(e.p[1])) + dy + k * fs * 1.4).toFixed(2) + '" font-size="' + fs.toFixed(2) + '" font-family="Arial,sans-serif" fill="' + c + '" text-anchor="' + anc + '" transform="rotate(' + (-e.rot / D2R).toFixed(2) + ' ' + X(e.p[0]) + ' ' + Y(e.p[1]) + ')">' + String(ln).replace(/[&<>]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]; }) + '</text>');
            });
        });
        out.push('</svg>'); return out.join('\n');
    }
    function entColor(model, e, dark) {
        var rgb = e.rgb; if (!rgb && e.aci) rgb = aciRGB(e.aci) || (e.aci === 7 ? null : null);
        var L = model.layers[e.layer] || {};
        if (!rgb && !e.aci) { rgb = L.rgb || (L.aci && L.aci !== 7 ? aciRGB(L.aci) : null); }
        if (!rgb) return dark ? '#e6edf7' : '#111111';
        if (dark && rgb[0] + rgb[1] + rgb[2] < 120) rgb = [200, 200, 200];
        if (!dark && rgb[0] + rgb[1] + rgb[2] > 700) rgb = [90, 90, 90];
        if (!dark && rgb[0] > 240 && rgb[1] > 240 && rgb[2] < 80) rgb = [180, 150, 0];
        return rgbCss(rgb);
    }

    /* ============================ VISOR ============================ */
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function dl(name, blob) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 600); }

    function viewer(host, model, opts) {
        opts = opts || {};
        var root = el('div', 'cx-view'), bar = el('div', 'cx-bar'), stage = el('div', 'cx-stage'), cv = el('canvas', 'cx-canvas'), co = el('div', 'cx-coord', 'X — · Y —'), lay = el('div', 'cx-layers'), info = el('div', 'cx-info');
        lay.hidden = true; stage.appendChild(cv); stage.appendChild(co); stage.appendChild(lay);
        function btn(t, title, fn) { var b = el('button', 'cx-btn', t); b.type = 'button'; b.title = title; b.addEventListener('click', fn); bar.appendChild(b); return b; }
        var dark = opts.dark !== false, view = { cx: 0, cy: 0, s: 1 }, grid = false, ctx = cv.getContext('2d'), dpr = Math.min(2, global.devicePixelRatio || 1), W = 600, H = 380, raf = 0;
        function fit(full) {
            var bb = (!full && robustBBox(model.ents)) || model.bbox; if (!bb) { bb = [0, 0, 10, 10]; }
            var bw = Math.max(bb[2] - bb[0], 1e-9), bh = Math.max(bb[3] - bb[1], 1e-9); view.s = Math.min((W - 40) / bw, (H - 40) / bh); view.cx = (bb[0] + bb[2]) / 2; view.cy = (bb[1] + bb[3]) / 2; draw();
        }
        function resize() { var r = stage.getBoundingClientRect(); W = Math.max(280, r.width || 600); H = Math.max(240, r.height || 380); cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'; draw(); }
        function SX(x) { return (x - view.cx) * view.s + W / 2; } function SY(y) { return H / 2 - (y - view.cy) * view.s; }
        function draw() { if (raf) return; raf = requestAnimationFrame(function () { raf = 0; paint(); }); }
        function niceStep(v) { var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
        function paint() {
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.fillStyle = dark ? '#0b1220' : '#ffffff'; ctx.fillRect(0, 0, W, H);
            if (grid) {
                var st = niceStep(80 / view.s), x0 = Math.floor((view.cx - W / 2 / view.s) / st) * st, y0 = Math.floor((view.cy - H / 2 / view.s) / st) * st;
                ctx.strokeStyle = dark ? 'rgba(148,163,184,.14)' : 'rgba(0,0,0,.10)'; ctx.fillStyle = dark ? '#64748b' : '#666'; ctx.font = '10px Inter, system-ui, sans-serif'; ctx.lineWidth = 1; ctx.beginPath();
                for (var gx = x0; gx < view.cx + W / 2 / view.s; gx += st) { ctx.moveTo(SX(gx), 0); ctx.lineTo(SX(gx), H); }
                for (var gy = y0; gy < view.cy + H / 2 / view.s; gy += st) { ctx.moveTo(0, SY(gy)); ctx.lineTo(W, SY(gy)); }
                ctx.stroke(); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
                for (gx = x0; gx < view.cx + W / 2 / view.s; gx += st) ctx.fillText(+gx.toFixed(6) + '', SX(gx) + 3, 3);
                ctx.textBaseline = 'bottom'; for (gy = y0; gy < view.cy + H / 2 / view.s; gy += st) ctx.fillText(+gy.toFixed(6) + '', 3, SY(gy) - 2);
            }
            ctx.lineJoin = 'round'; ctx.lineWidth = 1.15;
            var ents = model.ents, n = ents.length, step = n > 120000 ? 2 : 1;
            for (var i = 0; i < n; i += step) {
                var e = ents[i], L = model.layers[e.layer]; if (L && L.off) continue;
                var c = entColor(model, e, dark); ctx.strokeStyle = c; ctx.fillStyle = c;
                if (e.t === 'poly') {
                    var pts = e.pts, k, x, y, minx = 1e30, maxx = -1e30, miny = 1e30, maxy = -1e30;
                    ctx.beginPath();
                    for (k = 0; k < pts.length; k++) { x = SX(pts[k][0]); y = SY(pts[k][1]); if (x < minx) minx = x; if (x > maxx) maxx = x; if (y < miny) miny = y; if (y > maxy) maxy = y; if (k) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
                    if (maxx < -5 || minx > W + 5 || maxy < -5 || miny > H + 5) { ctx.beginPath(); continue; }
                    if (e.closed) ctx.closePath();
                    if (e.fill) { ctx.globalAlpha = 0.18; ctx.fill(); ctx.globalAlpha = 1; }
                    ctx.stroke();
                } else if (e.t === 'circle') {
                    var cxs = SX(e.c[0]), cys = SY(e.c[1]), rr = e.r * view.s; if (cxs + rr < 0 || cxs - rr > W || cys + rr < 0 || cys - rr > H) continue;
                    ctx.beginPath(); ctx.arc(cxs, cys, Math.max(rr, 0.5), 0, TAU); ctx.stroke();
                } else if (e.t === 'point') {
                    var px = SX(e.p[0]), py = SY(e.p[1]); if (px < -5 || px > W + 5 || py < -5 || py > H + 5) continue;
                    ctx.beginPath(); ctx.moveTo(px - 3, py); ctx.lineTo(px + 3, py); ctx.moveTo(px, py - 3); ctx.lineTo(px, py + 3); ctx.stroke();
                } else if (e.t === 'text') {
                    var fs = e.h * view.s; if (fs < 2.5 || fs > 800) { if (fs >= 0.8 && fs < 2.5) { var tx = SX(e.p[0]), ty = SY(e.p[1]); ctx.globalAlpha = 0.5; ctx.fillRect(tx, ty - 1, Math.min(e.s[0].length * fs * 0.55, 80), 1.2); ctx.globalAlpha = 1; } continue; }
                    var tx2 = SX(e.p[0]), ty2 = SY(e.p[1]); if (tx2 < -200 || tx2 > W + 200 || ty2 < -200 || ty2 > H + 200) continue;
                    ctx.save(); ctx.translate(tx2, ty2); ctx.rotate(-e.rot); ctx.font = fs.toFixed(1) + 'px Arial, Inter, sans-serif'; ctx.textAlign = e.ha === 1 ? 'center' : e.ha === 2 ? 'right' : 'left'; ctx.textBaseline = e.va === 3 ? 'top' : e.va === 2 ? 'middle' : e.va === 1 ? 'bottom' : 'alphabetic';
                    e.s.forEach(function (ln, kk) { ctx.fillText(ln, 0, kk * fs * 1.4); }); ctx.restore();
                }
            }
        }
        /* interacción */
        var ptrs = {}, last = null, pinch = 0;
        cv.style.touchAction = 'none';
        cv.addEventListener('pointerdown', function (e) { cv.setPointerCapture(e.pointerId); ptrs[e.pointerId] = [e.clientX, e.clientY]; last = [e.clientX, e.clientY]; pinch = 0; });
        cv.addEventListener('pointermove', function (e) {
            var r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
            co.textContent = 'X ' + (view.cx + (mx - W / 2) / view.s).toFixed(2) + ' · Y ' + (view.cy - (my - H / 2) / view.s).toFixed(2);
            if (!ptrs[e.pointerId]) return; ptrs[e.pointerId] = [e.clientX, e.clientY]; var ids = Object.keys(ptrs);
            if (ids.length === 2) {
                var a = ptrs[ids[0]], b = ptrs[ids[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoomAt((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, d / pinch); pinch = d; return;
            }
            view.cx -= (e.clientX - last[0]) / view.s; view.cy += (e.clientY - last[1]) / view.s; last = [e.clientX, e.clientY]; draw();
        });
        function up(e) { delete ptrs[e.pointerId]; pinch = 0; last = null; }
        cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
        function zoomAt(mx, my, f) { var wx = view.cx + (mx - W / 2) / view.s, wy = view.cy - (my - H / 2) / view.s; view.s = Math.max(1e-9, Math.min(1e9, view.s * f)); view.cx = wx - (mx - W / 2) / view.s; view.cy = wy + (my - H / 2) / view.s; draw(); }
        cv.addEventListener('wheel', function (e) { e.preventDefault(); var r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.2 : 1 / 1.2); }, { passive: false });
        cv.addEventListener('dblclick', function () { fit(); });
        /* barra */
        btn('⌂', 'Ajustar a la vista', function () { fit(); });
        btn('⤢', 'Ver todas las entidades (incluye las muy alejadas)', function () { fit(true); });
        btn('＋', 'Acercar', function () { zoomAt(W / 2, H / 2, 1.5); });
        btn('－', 'Alejar', function () { zoomAt(W / 2, H / 2, 1 / 1.5); });
        btn('▦', 'Cuadrícula con coordenadas', function () { grid = !grid; draw(); });
        btn('◐', 'Fondo claro / oscuro', function () { dark = !dark; draw(); });
        var bl = btn('☰ Capas', 'Mostrar u ocultar capas', function () { lay.hidden = !lay.hidden; });
        function buildLayers() {
            lay.innerHTML = ''; var names = Object.keys(model.layers).sort();
            names.forEach(function (n) {
                var L = model.layers[n], cnt = model.ents.filter(function (e) { return e.layer === n; }).length; if (!cnt && n !== '0') return;
                var row = el('label', 'cx-lrow'), cb = el('input'); cb.type = 'checkbox'; cb.checked = !L.off; cb.addEventListener('change', function () { L.off = !cb.checked; draw(); });
                var sw = el('i', 'cx-sw'); sw.style.background = entColor(model, { layer: n, aci: L.aci, rgb: L.rgb }, true); row.appendChild(cb); row.appendChild(sw); row.appendChild(el('span', null, n + ' <small>(' + cnt + ')</small>')); lay.appendChild(row);
            });
        }
        buildLayers();
        var acts = el('span', 'cx-acts'); bar.appendChild(acts);
        function abtn(t, title, fn) { var b = el('button', 'cx-btn cx-dl', t); b.type = 'button'; b.title = title; b.addEventListener('click', fn); acts.appendChild(b); }
        abtn('⬇ DXF', 'Descargar DXF limpio (AutoCAD / Civil 3D / QGIS)', function () { dl((opts.name || 'plano_civix') + '.dxf', new Blob([writeDXF(model)], { type: 'application/dxf' })); });
        abtn('⬇ PNG', 'Descargar imagen', function () { paint(); cv.toBlob(function (b) { dl((opts.name || 'plano_civix') + '.png', b); }); });
        abtn('⬇ SVG', 'Descargar vectorial', function () { dl((opts.name || 'plano_civix') + '.svg', new Blob([toSVG(model, { bg: dark ? 'dark' : 'light' })], { type: 'image/svg+xml' })); });
        (opts.actions || []).forEach(function (a) { abtn(a.label, a.title || '', function () { a.run(model); }); });
        root.appendChild(bar); root.appendChild(stage); root.appendChild(info);
        host.appendChild(root);
        function setInfo(html) { info.innerHTML = html; }
        var cnt = {}; model.ents.forEach(function (e) { cnt[e.t] = (cnt[e.t] || 0) + 1; });
        var ib = '<b>' + model.ents.length + '</b> entidades · <b>' + Object.keys(model.layers).filter(function (n) { return model.ents.some(function (e) { return e.layer === n; }); }).length + '</b> capas';
        if (model.bbox) ib += ' · ' + (model.bbox[2] - model.bbox[0]).toFixed(2) + ' × ' + (model.bbox[3] - model.bbox[1]).toFixed(2) + ' u';
        if (model.units != null && UNITS[model.units]) ib += ' · unidades: ' + UNITS[model.units];
        if (opts.extra) ib += '<br>' + opts.extra;
        if (model.warn && model.warn.length) ib += '<ul class="cx-warn">' + model.warn.map(function (w) { return '<li>⚠ ' + esc(w) + '</li>'; }).join('') + '</ul>';
        setInfo(ib);
        var ro = global.ResizeObserver ? new ResizeObserver(function () { resize(); }) : null; if (ro) ro.observe(stage); else global.addEventListener('resize', resize);
        setTimeout(function () { resize(); fit(); }, 30);
        return { root: root, fit: fit, redraw: draw, setInfo: setInfo, layersChanged: function () { buildLayers(); draw(); }, destroy: function () { if (ro) ro.disconnect(); root.remove(); } };
    }
    var UNITS = { 0: 'sin unidades', 1: 'pulgadas', 2: 'pies', 4: 'mm', 5: 'cm', 6: 'm', 7: 'km' };
    function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }

    /* ============================ PUNTOS Y TERRENO ============================ */
    function parsePoints(text) {
        var lines = String(text || '').replace(/^﻿/, '').split(/\r\n|\r|\n/), rows = [], header = null;
        lines.forEach(function (ln) {
            var s = ln.trim(); if (!s || /^(#|\/\/|;|\*)/.test(s)) return;
            var semi = s.indexOf(';') >= 0 || s.indexOf('\t') >= 0; if (semi) s = s.replace(/,/g, '.');
            var toks = s.split(semi ? /[;\t]+\s*/ : /[,\s]+/).filter(function (t) { return t !== ''; });
            var num = toks.map(function (t) { return /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(t) ? parseFloat(t) : NaN; });
            var okAll = num.every(function (v) { return isFinite(v); });
            if (okAll && num.length >= 3) rows.push({ n: num, id: null });
            else if (!okAll && num.slice(1).every(function (v) { return isFinite(v); }) && num.length >= 4) rows.push({ n: num.slice(1), id: toks[0] });
            else if (!okAll && !rows.length && toks.length >= 3 && !header) header = toks.map(function (t) { return t.toLowerCase(); });
        });
        if (!rows.length) return [];
        var withId = rows.filter(function (r) { return r.n.length >= 4; }).length > rows.length * 0.6, hasSeq = false;
        if (withId) {
            var c0 = rows.map(function (r) { return r.n[0]; }), ints = c0.every(function (v) { return Math.abs(v - Math.round(v)) < 1e-9; }), uniq = {}; c0.forEach(function (v) { uniq[v] = 1; });
            hasSeq = ints && Object.keys(uniq).length > c0.length * 0.95 && c0.every(function (v) { return Math.abs(v) < 1e6; }) && rows.some(function (r) { return r.n.length >= 4; });
            if (rows.every(function (r) { return r.n.length === 4; })) hasSeq = hasSeq || rows[0].id !== null;
        }
        var swap = false;
        if (header) {
            var ix = header.findIndex(function (h) { return /^(x|e|este|east|easting|longitud|lon)$/.test(h); }), iy = header.findIndex(function (h) { return /^(y|n|norte|north|northing|latitud|lat)$/.test(h); });
            if (ix >= 0 && iy >= 0 && iy < ix) swap = true;
        }
        var pts = [];
        rows.forEach(function (r) {
            var n = r.n; if (withId && hasSeq && n.length >= 4 && r.id === null) n = n.slice(1);
            var x = n[0], y = n[1], z = n[2]; if (swap) { x = n[1]; y = n[0]; }
            if (isFinite(x) && isFinite(y) && isFinite(z)) pts.push({ x: x, y: y, z: z });
        });
        return pts;
    }
    function pointsFromDXF(model) {
        var pts = [];
        model.ents.forEach(function (e) { if (e.t === 'point' && (e.p[2] || 0) !== 0) pts.push({ x: e.p[0], y: e.p[1], z: e.p[2] }); });
        if (pts.length < 3) { pts = []; model.ents.forEach(function (e) { if (e.t === 'point') pts.push({ x: e.p[0], y: e.p[1], z: e.p[2] || 0 }); }); }
        if (pts.length < 3) { var seen = {}; pts = []; model.ents.forEach(function (e) { if (e.t === 'poly') e.pts.forEach(function (p) { if ((p[2] || 0) !== 0) { var k = p[0].toFixed(3) + '|' + p[1].toFixed(3); if (!seen[k]) { seen[k] = 1; pts.push({ x: p[0], y: p[1], z: p[2] }); } } }); }); }
        return pts;
    }
    function rng(seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
    function randomTerrain(o) {
        o = o || {}; var seed = o.seed != null ? (o.seed >>> 0) : (Math.floor(Math.random() * 4294967295) >>> 0), r = rng(seed);
        var Wd = o.width || 200, Hd = o.height || 150, n = Math.max(30, Math.min(1500, o.n || 180)), relief = o.relief || 20, base = o.base != null ? o.base : 2300, x0 = o.x0 != null ? o.x0 : 0, y0 = o.y0 != null ? o.y0 : 0;
        var hills = [], nh = 5 + Math.floor(r() * 4), mn = Math.min(Wd, Hd), i;
        for (i = 0; i < nh; i++) hills.push({ x: r() * Wd, y: r() * Hd, s: mn * (0.10 + r() * 0.2), a: (r() < 0.62 ? 1 : -1) * (0.35 + r() * 0.65) });
        var slope = (r() - 0.5) * 1.2, dir = r() * TAU, nv = []; for (i = 0; i < 64; i++) nv.push(r());
        function vnoise(x, y) { var xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); function h(a, b) { return nv[(((a * 7 + b * 13) % 64) + 64) % 64]; } return (h(xi, yi) * (1 - u) + h(xi + 1, yi) * u) * (1 - v) + (h(xi, yi + 1) * (1 - u) + h(xi + 1, yi + 1) * u) * v; }
        function zf(x, y) {
            var z = slope * (Math.cos(dir) * x + Math.sin(dir) * y) / mn; hills.forEach(function (h) { z += h.a * Math.exp(-((x - h.x) * (x - h.x) + (y - h.y) * (y - h.y)) / (2 * h.s * h.s)); });
            z += 0.10 * (vnoise(x / (mn * 0.18), y / (mn * 0.18)) - 0.5) + 0.04 * (vnoise(x / (mn * 0.07) + 9, y / (mn * 0.07) + 3) - 0.5); return z;
        }
        var cols = Math.max(3, Math.round(Math.sqrt(n * Wd / Hd))), rows = Math.max(3, Math.round(n / cols)), cw = Wd / cols, ch = Hd / rows, pts = [], j;
        for (j = 0; j <= rows; j++) for (i = 0; i <= cols; i++) {
            var edge = i === 0 || j === 0 || i === cols || j === rows, jx = edge ? 0 : (r() - 0.5) * cw * 0.8, jy = edge ? 0 : (r() - 0.5) * ch * 0.8;
            var px = Math.min(Wd, Math.max(0, i * cw + (i === 0 || i === cols ? 0 : jx))), py = Math.min(Hd, Math.max(0, j * ch + (j === 0 || j === rows ? 0 : jy)));
            if (!edge && (i === 0 || j === 0)) continue;
            pts.push({ x: px, y: py, z: zf(px, py) });
        }
        var zmin = Infinity, zmax = -Infinity; pts.forEach(function (p) { zmin = Math.min(zmin, p.z); zmax = Math.max(zmax, p.z); });
        var k = relief / Math.max(zmax - zmin, 1e-9);
        pts = pts.map(function (p) { return { x: +(x0 + p.x).toFixed(2), y: +(y0 + p.y).toFixed(2), z: +(base + (p.z - zmin) * k).toFixed(2) }; });
        return { pts: pts, seed: seed, width: Wd, height: Hd, relief: relief, base: base };
    }

    /* ============================ TIN + CURVAS ============================ */
    function delaunay(P) { // Bowyer–Watson sobre coordenadas normalizadas; devuelve triángulos [i,j,k]
        var n = P.length, minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity, i;
        for (i = 0; i < n; i++) { minx = Math.min(minx, P[i].x); maxx = Math.max(maxx, P[i].x); miny = Math.min(miny, P[i].y); maxy = Math.max(maxy, P[i].y); }
        var d = Math.max(maxx - minx, maxy - miny) || 1, mx = (minx + maxx) / 2, my = (miny + maxy) / 2, X = new Float64Array(n + 3), Y = new Float64Array(n + 3);
        for (i = 0; i < n; i++) { X[i] = (P[i].x - mx) / d; Y[i] = (P[i].y - my) / d; }
        X[n] = -20; Y[n] = -10; X[n + 1] = 0; Y[n + 1] = 20; X[n + 2] = 20; Y[n + 2] = -10;
        var tris = [[n, n + 1, n + 2, 0, 0, 0]]; circ(tris[0]);
        function circ(t) { var ax = X[t[0]], ay = Y[t[0]], bx = X[t[1]], by = Y[t[1]], cx = X[t[2]], cy = Y[t[2]], dd = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)); if (Math.abs(dd) < 1e-18) { t[3] = 0; t[4] = 0; t[5] = Infinity; return; } var a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cx * cx + cy * cy; t[3] = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / dd; t[4] = (a2 * (cx - bx) + b2 * (ax - cx) + c2 * (bx - ax)) / dd; t[5] = (ax - t[3]) * (ax - t[3]) + (ay - t[4]) * (ay - t[4]); }
        var order = []; for (i = 0; i < n; i++) order.push(i); order.sort(function (a, b) { return X[a] - X[b] || Y[a] - Y[b]; });
        order.forEach(function (p) {
            var bad = [], keep = [], px = X[p], py = Y[p], t, k;
            for (k = 0; k < tris.length; k++) { t = tris[k]; var dx = px - t[3], dy = py - t[4]; if (dx * dx + dy * dy <= t[5] * (1 + 1e-12)) bad.push(t); else keep.push(t); }
            var edges = {};
            bad.forEach(function (t) { for (var e = 0; e < 3; e++) { var a = t[e], b = t[(e + 1) % 3], key = a < b ? a + ',' + b : b + ',' + a; if (edges[key]) edges[key].c++; else edges[key] = { a: a, b: b, c: 1 }; } });
            Object.keys(edges).forEach(function (key) { var ed = edges[key]; if (ed.c === 1) { var nt = [ed.a, ed.b, p, 0, 0, 0]; circ(nt); keep.push(nt); } });
            tris = keep;
        });
        return tris.filter(function (t) { return t[0] < n && t[1] < n && t[2] < n; }).map(function (t) { return [t[0], t[1], t[2]]; });
    }
    function niceInterval(range) { var raw = range / 12, p = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p; }
    function chaikin(pts, closed, it) {
        for (var k = 0; k < it; k++) {
            var out = [], n = pts.length; if (n < 3) break;
            if (!closed) out.push(pts[0]);
            for (var i = 0; i < (closed ? n : n - 1); i++) { var a = pts[i], b = pts[(i + 1) % n]; out.push([a[0] * .75 + b[0] * .25, a[1] * .75 + b[1] * .25]); out.push([a[0] * .25 + b[0] * .75, a[1] * .25 + b[1] * .75]); }
            if (!closed) out.push(pts[n - 1]); pts = out;
        }
        return pts;
    }
    function contours(points, o) {
        o = o || {}; var res = { ok: false, error: '', levels: [], lines: [], tin: [], pts: [], stats: {} };
        var map = {}, P = [];
        (points || []).forEach(function (p) { if (!isFinite(p.x) || !isFinite(p.y) || !isFinite(p.z)) return; var k = p.x.toFixed(4) + '|' + p.y.toFixed(4); if (map[k] != null) { var q = P[map[k]]; q.z = (q.z * q.c + p.z) / (q.c + 1); q.c++; } else { map[k] = P.length; P.push({ x: p.x, y: p.y, z: p.z, c: 1 }); } });
        if (P.length < 3) { res.error = 'Se necesitan al menos 3 puntos distintos con X, Y, Z (hay ' + P.length + ').'; return res; }
        if (P.length > 8000) { res.error = 'Demasiados puntos (' + P.length + '). El límite del navegador es 8000; reduce la nube.'; return res; }
        var zmin = Infinity, zmax = -Infinity; P.forEach(function (p) { zmin = Math.min(zmin, p.z); zmax = Math.max(zmax, p.z); });
        if (zmax - zmin < 1e-9) { res.error = 'Todos los puntos tienen la misma cota: no hay relieve que contornear.'; return res; }
        var tris = delaunay(P);
        if (!tris.length) { res.error = 'No se pudo triangular (¿puntos alineados?).'; return res; }
        // elimina triángulos de borde excesivamente largos (huecos fuera de la nube)
        var le = tris.map(function (t) { var m = 0; for (var e = 0; e < 3; e++) { var a = P[t[e]], b = P[t[(e + 1) % 3]]; m = Math.max(m, Math.hypot(a.x - b.x, a.y - b.y)); } return m; }), sorted = le.slice().sort(function (a, b) { return a - b; }), med = sorted[Math.floor(sorted.length / 2)];
        var maxEdge = o.maxEdge > 0 ? o.maxEdge : med * 4.5; tris = tris.filter(function (t, i) { return le[i] <= maxEdge; });
        var interval = o.interval > 0 ? o.interval : niceInterval(zmax - zmin), majorEvery = o.majorEvery || 5, first = Math.ceil((zmin + 1e-9) / interval) * interval, levels = [];
        for (var L = first; L <= zmax + 1e-9; L += interval) levels.push(+L.toFixed(9));
        if (levels.length > 600) { res.error = 'La equidistancia ' + interval + ' genera ' + levels.length + ' curvas; aumenta el intervalo.'; return res; }
        var segs = {}; levels.forEach(function (l) { segs[l] = []; });
        tris.forEach(function (t) {
            var a = P[t[0]], b = P[t[1]], c = P[t[2]], lo = Math.min(a.z, b.z, c.z), hi = Math.max(a.z, b.z, c.z), V = [a, b, c], I = t;
            var i0 = Math.max(0, Math.ceil((lo - first) / interval - 1e-9)), i1 = Math.min(levels.length - 1, Math.floor((hi - first) / interval + 1e-9));
            for (var li = i0; li <= i1; li++) {
                var Lz = levels[li], hits = [];
                for (var e = 0; e < 3; e++) {
                    var u = V[e], v = V[(e + 1) % 3], ub = u.z < Lz, vb = v.z < Lz;
                    if (ub !== vb) { var tt = (Lz - u.z) / (v.z - u.z), ia = I[e], ib = I[(e + 1) % 3]; hits.push({ k: ia < ib ? ia * 100003 + ib : ib * 100003 + ia, x: u.x + (v.x - u.x) * tt, y: u.y + (v.y - u.y) * tt }); }
                }
                if (hits.length === 2) segs[Lz].push(hits);
            }
        });
        var lines = [], totalLen = 0;
        levels.forEach(function (Lz, li) {
            var S = segs[Lz], idx = {}, used = new Uint8Array(S.length);
            S.forEach(function (s, i) { [s[0].k, s[1].k].forEach(function (k) { (idx[k] = idx[k] || []).push(i); }); });
            function other(k, from) { var a = idx[k] || []; for (var q = 0; q < a.length; q++) if (a[q] !== from && !used[a[q]]) return a[q]; return -1; }
            for (var i = 0; i < S.length; i++) {
                if (used[i]) continue; used[i] = 1; var chain = [S[i][0], S[i][1]], tail = S[i][1].k, head = S[i][0].k, cur = i, nx;
                while ((nx = other(tail, cur)) >= 0) { used[nx] = 1; var s = S[nx], np = s[0].k === tail ? s[1] : s[0]; chain.push(np); tail = np.k; cur = nx; }
                cur = i; while ((nx = other(head, cur)) >= 0) { used[nx] = 1; var s2 = S[nx], np2 = s2[0].k === head ? s2[1] : s2[0]; chain.unshift(np2); head = np2.k; cur = nx; }
                var closed = chain.length > 3 && chain[0].k === chain[chain.length - 1].k; if (closed) chain.pop();
                var pl = chain.map(function (h) { return [h.x, h.y]; });
                if (o.smooth !== false && pl.length > 2) pl = chaikin(pl, closed, o.smoothIter || 2);
                var len = 0; for (var q = 1; q < pl.length; q++) len += Math.hypot(pl[q][0] - pl[q - 1][0], pl[q][1] - pl[q - 1][1]); if (closed) len += Math.hypot(pl[0][0] - pl[pl.length - 1][0], pl[0][1] - pl[pl.length - 1][1]);
                totalLen += len; lines.push({ z: Lz, pts: pl, closed: closed, major: Math.round(Lz / interval) % majorEvery === 0, len: len });
            }
        });
        res.ok = true; res.levels = levels; res.lines = lines; res.tin = tris.map(function (t) { return [P[t[0]], P[t[1]], P[t[2]]]; }); res.pts = P;
        res.stats = { n: P.length, tri: tris.length, zmin: zmin, zmax: zmax, interval: interval, majorEvery: majorEvery, nLevels: levels.length, nLines: lines.length, length: totalLen, droppedEdges: le.length - tris.length };
        res.bbox = (function () { var a = Infinity, b = Infinity, c = -Infinity, d = -Infinity; P.forEach(function (p) { a = Math.min(a, p.x); c = Math.max(c, p.x); b = Math.min(b, p.y); d = Math.max(d, p.y); }); return [a, b, c, d]; })();
        return res;
    }
    function fmtZ(z, interval) { var d = interval >= 1 ? 0 : Math.min(3, Math.ceil(-Math.log10(interval))); return z.toFixed(d); }
    function contourModel(res, o) {
        o = o || {}; var bb = res.bbox, w = bb[2] - bb[0], h = bb[3] - bb[1], span = Math.max(w, h), th = span * 0.012, ents = [], st = res.stats;
        var layers = {
            'CURVAS-MENORES': { name: 'CURVAS-MENORES', aci: 30 }, 'CURVAS-MAYORES': { name: 'CURVAS-MAYORES', aci: 1 }, 'COTAS-CURVAS': { name: 'COTAS-CURVAS', aci: 1 },
            'PUNTOS': { name: 'PUNTOS', aci: 2 }, 'COTAS-PUNTOS': { name: 'COTAS-PUNTOS', aci: 8, off: true }, 'MARCO': { name: 'MARCO', aci: 7 }, 'CUADRICULA': { name: 'CUADRICULA', aci: 9 }, 'TIN': { name: 'TIN', aci: 8, off: true }, 'TEXTOS': { name: 'TEXTOS', aci: 7 }
        };
        if (o.showTin !== false) res.tin.forEach(function (t) { ents.push({ t: 'poly', layer: 'TIN', pts: [[t[0].x, t[0].y, 0], [t[1].x, t[1].y, 0], [t[2].x, t[2].y, 0]], closed: true }); });
        res.lines.forEach(function (l) {
            ents.push({ t: 'poly', layer: l.major ? 'CURVAS-MAYORES' : 'CURVAS-MENORES', pts: l.pts.map(function (p) { return [p[0], p[1], l.z]; }), closed: l.closed, keepPoly: true });
            if (l.major && l.len > th * 10 && l.pts.length > 3) {
                var half = l.len / 2, acc = 0, k = 1; for (; k < l.pts.length; k++) { acc += Math.hypot(l.pts[k][0] - l.pts[k - 1][0], l.pts[k][1] - l.pts[k - 1][1]); if (acc >= half) break; }
                k = Math.min(k, l.pts.length - 1); var a = l.pts[Math.max(0, k - 1)], b = l.pts[k], ang = Math.atan2(b[1] - a[1], b[0] - a[0]); if (ang > PI / 2) ang -= PI; if (ang < -PI / 2) ang += PI;
                ents.push({ t: 'text', layer: 'COTAS-CURVAS', p: [b[0], b[1], l.z], h: th * 0.9, s: [fmtZ(l.z, st.interval)], rot: ang, ha: 1, va: 1 });
            }
        });
        res.pts.forEach(function (p) { ents.push({ t: 'point', layer: 'PUNTOS', p: [p.x, p.y, p.z] }); if (res.pts.length <= 800) ents.push({ t: 'text', layer: 'COTAS-PUNTOS', p: [p.x + th * 0.4, p.y + th * 0.3, 0], h: th * 0.6, s: [p.z.toFixed(2)], rot: 0, ha: 0, va: 0 }); });
        var m = span * 0.04, x0 = bb[0] - m, y0 = bb[1] - m, x1 = bb[2] + m, y1 = bb[3] + m;
        ents.push({ t: 'poly', layer: 'MARCO', pts: [[x0, y0, 0], [x1, y0, 0], [x1, y1, 0], [x0, y1, 0]], closed: true });
        var gs = (function (v) { var p = Math.pow(10, Math.floor(Math.log10(v))), mm = v / p; return (mm < 1.5 ? 1 : mm < 3.5 ? 2 : mm < 7.5 ? 5 : 10) * p; })(span / 6);
        for (var gx = Math.ceil(x0 / gs) * gs; gx <= x1; gx += gs) for (var gy = Math.ceil(y0 / gs) * gs; gy <= y1; gy += gs) {
            ents.push({ t: 'poly', layer: 'CUADRICULA', pts: [[gx - th * 0.6, gy, 0], [gx + th * 0.6, gy, 0]], closed: false }); ents.push({ t: 'poly', layer: 'CUADRICULA', pts: [[gx, gy - th * 0.6, 0], [gx, gy + th * 0.6, 0]], closed: false });
        }
        for (gx = Math.ceil(x0 / gs) * gs; gx <= x1; gx += gs) ents.push({ t: 'text', layer: 'TEXTOS', p: [gx, y0 - th * 1.6, 0], h: th * 0.8, s: ['E ' + +gx.toFixed(3)], rot: 0, ha: 1, va: 3 });
        for (gy = Math.ceil(y0 / gs) * gs; gy <= y1; gy += gs) ents.push({ t: 'text', layer: 'TEXTOS', p: [x0 - th * 0.6, gy, 0], h: th * 0.8, s: ['N ' + +gy.toFixed(3)], rot: Math.PI / 2, ha: 1, va: 1 });
        // norte y escala gráfica
        var nx = x1 - span * 0.06, ny = y1 - span * 0.05, nl = span * 0.05;
        ents.push({ t: 'poly', layer: 'TEXTOS', pts: [[nx, ny - nl, 0], [nx, ny, 0]], closed: false }); ents.push({ t: 'poly', layer: 'TEXTOS', pts: [[nx - nl * 0.18, ny - nl * 0.3, 0], [nx, ny, 0], [nx + nl * 0.18, ny - nl * 0.3, 0]], closed: false });
        ents.push({ t: 'text', layer: 'TEXTOS', p: [nx, ny + th * 0.3, 0], h: th * 1.1, s: ['N'], rot: 0, ha: 1, va: 1 });
        var sb = (function (v) { var p = Math.pow(10, Math.floor(Math.log10(v))), mm = v / p; return (mm < 2 ? 1 : mm < 5 ? 2 : 5) * p; })(span / 5), sx = x0 + span * 0.03, sy = y0 + span * 0.035;
        ents.push({ t: 'poly', layer: 'TEXTOS', pts: [[sx, sy, 0], [sx + sb, sy, 0]], closed: false }); ents.push({ t: 'poly', layer: 'TEXTOS', pts: [[sx, sy - th * 0.4, 0], [sx, sy + th * 0.4, 0]], closed: false }); ents.push({ t: 'poly', layer: 'TEXTOS', pts: [[sx + sb, sy - th * 0.4, 0], [sx + sb, sy + th * 0.4, 0]], closed: false });
        ents.push({ t: 'text', layer: 'TEXTOS', p: [sx + sb / 2, sy + th * 0.6, 0], h: th * 0.9, s: [+sb.toFixed(3) + ' m'], rot: 0, ha: 1, va: 0 });
        ents.push({ t: 'text', layer: 'TEXTOS', p: [x0, y1 + th * 1.2, 0], h: th * 1.4, s: [o.title || 'PLANO TOPOGRAFICO - CURVAS DE NIVEL'], rot: 0, ha: 0, va: 0 });
        ents.push({ t: 'text', layer: 'TEXTOS', p: [x0, y1 + th * 3.1, 0], h: th * 0.9, s: ['Equidistancia ' + +st.interval.toFixed(4) + ' m (curvas mayores cada ' + st.majorEvery + ') - ' + st.n + ' puntos - cotas ' + st.zmin.toFixed(2) + ' a ' + st.zmax.toFixed(2) + ' m' + (o.seed != null ? ' - semilla ' + o.seed : '')], rot: 0, ha: 0, va: 0 });
        var model = { ents: ents, layers: layers, warn: [], units: 6, blocks: {} }; model.bbox = bboxOf(ents); return model;
    }
    function pointsCSV(pts) { return 'X,Y,Z\n' + pts.map(function (p) { return p.x + ',' + p.y + ',' + p.z; }).join('\n') + '\n'; }

    /* ============================ INTEGRACIÓN CON EL CHAT ============================ */
    function norm(s) { s = String(s || '').toLowerCase(); try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) {} return s; }
    function num(s) { return parseFloat(String(s).replace(',', '.')); }
    function chatBox() { return document.getElementById('chatMensajes'); }
    function botCard() { var chat = chatBox(), d = el('div', 'mensaje mensaje-bot mensaje-bot-rich cx-card'); chat.appendChild(d); return d; }
    function say(card, html) { var b = el('div', 'civix-md'); b.innerHTML = html; card.appendChild(b); return b; }
    function scrollEnd() { var c = chatBox(); if (c) c.scrollTop = c.scrollHeight; }
    function wantsContours(q) { return /curva[s]? de nivel|curvas? topograf|isolinea|isohips|\bcontour|levantamiento topograf|modelo digital de terreno|\bmdt\b|\btin\b|nube de puntos|topografia/.test(q); }
    function wantsAction(q) { return /gener|crea|crear|dibuj|haz\b|hacer|traza|trazar|dame|necesito|quiero|elabora|calcul|obten|produc|plano|dxf|aleator|ejemplo|a partir|con estos|con los|interpret|convierte|transforma|procesa/.test(q); }
    function paramsFrom(q) {
        var o = {}, m;
        if ((m = q.match(/(?:equidistancia|intervalo|cada|separacion)\s*(?:de|entre)?\s*(\d+(?:[.,]\d+)?)\s*(m|cm|metros?)?/))) { var v = num(m[1]); if (m[2] === 'cm') v /= 100; if (v > 0) o.interval = v; }
        if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metros)?\s*(?:x|por|\*)\s*(\d+(?:[.,]\d+)?)\s*(?:m|metros)?/))) { o.width = num(m[1]); o.height = num(m[2]); }
        else if ((m = q.match(/(\d+(?:[.,]\d+)?)\s*(?:ha|hectareas?)/))) { var a = num(m[1]) * 10000, r = 4 / 3; o.width = Math.sqrt(a * r); o.height = Math.sqrt(a / r); }
        if ((m = q.match(/(\d+)\s*puntos/))) o.n = Math.min(1500, Math.max(30, +m[1]));
        if ((m = q.match(/(?:desnivel|relieve)\s*(?:de|total)?\s*(\d+(?:[.,]\d+)?)\s*m/)) || (m = q.match(/(\d+(?:[.,]\d+)?)\s*m\s*de\s*(?:desnivel|relieve)/))) o.relief = num(m[1]);
        if ((m = q.match(/semilla\s*(\d+)/))) o.seed = +m[1];
        if ((m = q.match(/(?:cota|elevacion|altitud)\s*(?:base|inicial)?\s*(?:de)?\s*(\d+(?:[.,]\d+)?)/))) o.base = num(m[1]);
        if (/sin suaviz|poligonal|sin curv/.test(q)) o.smooth = false;
        return o;
    }
    function contourCard(card, spec) { // spec: {pts, title, seed, random, params, name}
        var res, model, vw, st, ctl = el('div', 'cx-ctl'), box = el('div', 'cx-box');
        var iv = el('input'); iv.type = 'number'; iv.step = 'any'; iv.min = 0; iv.className = 'cx-num'; iv.title = 'Equidistancia (m)';
        var sm = el('input'); sm.type = 'checkbox'; sm.checked = spec.params.smooth !== false; var tin = el('input'); tin.type = 'checkbox';
        var bgo = el('button', 'cx-btn', 'Recalcular'); bgo.type = 'button';
        ctl.appendChild(el('label', null, 'Equidistancia (m) ')); ctl.lastChild.appendChild(iv); var l2 = el('label', null, ' '); l2.appendChild(sm); l2.appendChild(document.createTextNode(' suavizar')); ctl.appendChild(l2); var l3 = el('label', null, ' '); l3.appendChild(tin); l3.appendChild(document.createTextNode(' mostrar TIN')); ctl.appendChild(l3); ctl.appendChild(bgo);
        var again; if (spec.random) { again = el('button', 'cx-btn', '🎲 Otra aleatoria'); again.type = 'button'; ctl.appendChild(again); }
        card.appendChild(ctl); card.appendChild(box);
        function run() {
            var p = { interval: iv.value ? parseFloat(iv.value) : (spec.params.interval || 0), smooth: sm.checked, majorEvery: spec.params.majorEvery };
            res = contours(spec.pts, p); box.innerHTML = '';
            if (!res.ok) { box.appendChild(el('p', 'cx-err', '⚠ ' + esc(res.error))); return; }
            iv.value = +res.stats.interval.toFixed(4); st = res.stats;
            model = contourModel(res, { title: spec.title, seed: spec.seed, showTin: true }); if (tin.checked) model.layers.TIN.off = false;
            var extra = '<b>' + st.n + '</b> puntos · cotas <b>' + st.zmin.toFixed(2) + '</b> a <b>' + st.zmax.toFixed(2) + ' m</b> (desnivel ' + (st.zmax - st.zmin).toFixed(2) + ' m) · equidistancia <b>' + +st.interval.toFixed(4) + ' m</b> · <b>' + st.nLines + '</b> curvas (' + st.nLevels + ' niveles) · longitud total ' + (st.length / 1000).toFixed(2) + ' km' + (spec.seed != null ? ' · semilla <b>' + spec.seed + '</b>' : '') + '<br><small>Método: TIN de Delaunay con interpolación lineal de la cota en cada arista; ' + (sm.checked ? 'suavizado Chaikin solo estético. ' : 'sin suavizado. ') + (st.droppedEdges ? st.droppedEdges + ' triángulos de borde alargados se descartaron. ' : '') + 'Curvas mayores (rojo) cada ' + st.majorEvery + '.</small>';
            vw = viewer(box, model, { name: spec.name || 'curvas_de_nivel', extra: extra, actions: [{ label: '⬇ Puntos CSV', title: 'Descargar X,Y,Z', run: function () { dl((spec.name || 'puntos') + '.csv', new Blob([pointsCSV(spec.pts)], { type: 'text/csv' })); } }] });
            scrollEnd();
        }
        bgo.addEventListener('click', run); iv.addEventListener('change', run); sm.addEventListener('change', run); tin.addEventListener('change', run);
        if (again) again.addEventListener('click', function () { var t = randomTerrain(Object.assign({}, spec.params, { seed: undefined })); spec.pts = t.pts; spec.seed = t.seed; iv.value = ''; spec.params.interval = 0; run(); });
        run(); return { get result() { return res; }, get model() { return model; } };
    }
    function histAdd(user, bot) { try { if (typeof chatHistory !== 'undefined') { chatHistory.push({ role: 'user', content: user }); chatHistory.push({ role: 'assistant', content: bot }); } if (typeof civixGuardarConversacionActual === 'function') civixGuardarConversacionActual(); } catch (e) {} }
    function previewDXF(adj) {
        var model = parseDXF(adj.text || ''), card = botCard();
        if (!model.ents.length) { say(card, '⚠ No pude dibujar <b>' + esc(adj.name) + '</b>: ' + esc(model.warn.join(' ') || 'sin entidades dibujables') + ' Si es un DWG, expórtalo a DXF (Guardar como → DXF R12/2000).'); return; }
        say(card, '📐 Vista previa de <b>' + esc(adj.name) + '</b> (leída localmente; arrastra para mover, rueda para zoom):'); var box = el('div', 'cx-box'); card.appendChild(box); viewer(box, model, { name: String(adj.name || 'plano').replace(/\.dxf$/i, '') + '_civix' }); scrollEnd();
    }
    function onSend(texto, adj) {
        var q = norm(texto), isDxf = adj && !adj.binary && /\.dxf$/i.test(adj.name || '');
        var pastedPts = texto && texto.split(/\n/).length >= 4 ? parsePoints(texto) : [], attPts = [];
        if (adj && !adj.binary && adj.text) {
            if (isDxf) { try { attPts = pointsFromDXF(parseDXF(adj.text)); } catch (e) {} }
            else if (/\.(csv|txt|xyz|pts|dat|asc|prn|out)$/i.test(adj.name || '')) attPts = parsePoints(adj.text);
        }
        var pts = attPts.length >= 3 ? attPts : (pastedPts.length >= 3 ? pastedPts : []), contour = wantsContours(q);
        if (contour && (pts.length >= 3 || wantsAction(q) || (pts.length >= 3))) {
            var params = paramsFrom(q), card = botCard(), user = texto || ('[Archivo] ' + (adj && adj.name));
            if (pts.length >= 3) {
                say(card, '🗺️ Interpreté <b>' + pts.length + ' puntos</b> (' + (attPts.length >= 3 ? 'archivo ' + esc(adj.name) : 'texto pegado') + ') como X, Y, Z y generé la triangulación y las curvas de nivel. Puedes cambiar la equidistancia y recalcular:');
                var c1 = contourCard(card, { pts: pts, title: 'PLANO TOPOGRAFICO - CURVAS DE NIVEL', random: false, params: params, name: 'curvas_de_nivel' });
                histAdd(user, 'Generé curvas de nivel a partir de ' + pts.length + ' puntos X,Y,Z' + (c1.result && c1.result.ok ? ' (cotas ' + c1.result.stats.zmin.toFixed(2) + '–' + c1.result.stats.zmax.toFixed(2) + ' m, equidistancia ' + c1.result.stats.interval + ' m, ' + c1.result.stats.nLines + ' curvas).' : '.'));
            } else {
                var t = randomTerrain(params);
                say(card, '🎲 Generé un <b>terreno aleatorio reproducible</b> (semilla <b>' + t.seed + '</b>, ' + t.width.toFixed(0) + ' × ' + t.height.toFixed(0) + ' m, ' + t.pts.length + ' puntos, desnivel ' + t.relief + ' m): colinas y depresiones gaussianas + pendiente general + ruido suave. Luego lo trianguló y contorneó. Si me das tus puntos (pega filas «X, Y, Z» o adjunta un CSV/TXT/DXF) uso los tuyos:');
                var c2 = contourCard(card, { pts: t.pts, title: 'TERRENO ALEATORIO - CURVAS DE NIVEL', random: true, seed: t.seed, params: params, name: 'curvas_nivel_aleatorio_' + t.seed });
                histAdd(user, 'Generé un terreno aleatorio (semilla ' + t.seed + ') con curvas de nivel' + (c2.result && c2.result.ok ? ' cada ' + c2.result.stats.interval + ' m.' : '.'));
            }
            return true;
        }
        if (isDxf) { try { previewDXF(adj); } catch (e) { console.warn(e); } }
        return false;
    }

    /* Enriquecer los bloques ```dxf de las respuestas de la IA: vista previa + DXF corregido */
    function enhanceBlocks(msg) {
        if (!msg) return;
        msg.querySelectorAll('.civix-code-block').forEach(function (wrap) {
            if (wrap.__cx) return; var code = wrap.querySelector('code'), lab = wrap.querySelector('.civix-code-actions span'), txt = code ? code.textContent : '';
            var isDxf = (lab && /^(dxf|cad|autocad)$/i.test(lab.textContent)) || /(^|\n)\s*0\s*\r?\n\s*SECTION/.test(txt) || /(^|\n)\s*0\s*\r?\n\s*(LINE|LWPOLYLINE|CIRCLE|POLYLINE)\s*(\r?\n|$)/.test(txt);
            if (!isDxf) return; wrap.__cx = 1;
            var model = parseDXF(txt), host = el('div', 'cx-box');
            if (!model.ents.length) { host.appendChild(el('p', 'cx-err', '⚠ El DXF generado no contiene entidades dibujables' + (model.warn.length ? ': ' + esc(model.warn.join(' ')) : '') + '. Pide a Civix que lo regenere indicando LINE/LWPOLYLINE/CIRCLE/TEXT.')); wrap.parentNode.insertBefore(host, wrap); return; }
            wrap.parentNode.insertBefore(host, wrap);
            viewer(host, model, { name: 'plano_civix', extra: 'Vista previa leída del DXF de la respuesta. El botón <b>⬇ DXF</b> descarga una versión <b>normalizada y válida</b> (R12) del mismo dibujo.' });
            var b = wrap.querySelector('.btn-descarga-civix');
            if (b) { var nb = b.cloneNode(true); nb.textContent = '⬇ Descargar plano DXF corregido'; b.parentNode.replaceChild(nb, b); nb.addEventListener('click', function () { dl('Civix_plano.dxf', new Blob([writeDXF(model)], { type: 'application/dxf' })); }); }
        });
    }
    function install() {
        var orig = global.agregarMensajeBotConDescargas;
        if (typeof orig === 'function' && !orig.__cx) {
            var w = function (texto) { var r = orig.apply(this, arguments); try { var chat = chatBox(); var last = chat && chat.querySelector('.mensaje-bot-rich:last-of-type'); var all = chat ? chat.querySelectorAll('.mensaje-bot-rich') : []; enhanceBlocks(all[all.length - 1]); } catch (e) { console.warn('CivixCAD', e); } return r; };
            w.__cx = true; global.agregarMensajeBotConDescargas = w;
        }
    }

    CAD.parseDXF = parseDXF; CAD.writeDXF = writeDXF; CAD.toSVG = toSVG; CAD.viewer = viewer; CAD.parsePoints = parsePoints; CAD.pointsFromDXF = pointsFromDXF;
    CAD.randomTerrain = randomTerrain; CAD.contours = contours; CAD.contourModel = contourModel; CAD.delaunay = delaunay; CAD.onSend = onSend; CAD.enhance = enhanceBlocks; CAD.install = install; CAD.aciRGB = aciRGB; CAD.bboxOf = bboxOf; CAD.contourCard = contourCard; CAD.download = dl; CAD.pointsCSV = pointsCSV;
    global.CivixCAD = CAD;
    if (typeof module !== 'undefined' && module.exports) module.exports = CAD;
    if (global.document) { if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install(); }
})(typeof window !== 'undefined' ? window : globalThis);
