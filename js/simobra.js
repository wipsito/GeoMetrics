/**
 * Simulador de Obra 3D — primera persona (three.js r147 + SimObraCore).
 * Excavar, nivelar, cimentar, levantar columnas/vigas/losas/muros/techos, contención, vías, tuberías y puentes.
 * EDUCATIVO: modelos simplificados; no reemplaza un diseño firmado por un ingeniero.
 */
(function (global) {
    'use strict';
    var C = global.SimObraCore, doc = global.document, THREE = null, S = null, ROOT = null;
    if (!C || !doc) return;
    var N = C.N, HALF = N / 2, NAMES = C.NAMES;
    var HOOKS = { world: [], frame: [], key: [], mouse: [], wheel: [], blocked: [], close: [] };
    function hook(n) { var a = Array.prototype.slice.call(arguments, 1), r = false; HOOKS[n].forEach(function (fn) { if (fn.apply(null, a)) r = true; }); return r; }
    var LS_KEY = 'gm_simobra_v1';

    /* ---------- utilidades ---------- */
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function $(s, r) { return (r || doc).querySelector(s); }
    function sn(v) { return Math.round(v * 2) / 2; }
    function f(x, d) { return (Math.round(x * Math.pow(10, d == null ? 1 : d)) / Math.pow(10, d == null ? 1 : d)).toString(); }
    function money(v) { return 'US$ ' + Math.round(v).toLocaleString('es-CO'); }
    function stars(n) { return '★★★'.slice(0, n) + '☆☆☆'.slice(0, 3 - n); }
    function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    function loadProgress() { try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); } catch (e) { return {}; } }
    function saveProgress(id, st) { try { var p = loadProgress(); if ((p[id] || 0) < st) { p[id] = st; localStorage.setItem(LS_KEY, JSON.stringify(p)); } } catch (e) { } }
    function rgb(hex) { return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]; }
    function hash(i, j) { var s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); }

    function loadThree(cb) {
        if (global.THREE) { THREE = global.THREE; return cb(null); }
        var srcs = ['js/vendor/three.min.js', 'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js', 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r147/three.min.js', 'https://unpkg.com/three@0.147.0/build/three.min.js'], k = 0;
        (function next() { if (k >= srcs.length) return cb(new Error('No se pudo cargar three.js')); var s = doc.createElement('script'); s.src = srcs[k++]; s.onload = function () { if (global.THREE) { THREE = global.THREE; cb(null); } else next(); }; s.onerror = next; doc.head.appendChild(s); })();
    }

    /* ---------- herramientas ---------- */
    function P(id, n, vals, def, u, fmt) { return { id: id, n: n, vals: vals, def: def, u: u || '', fmt: fmt }; }
    var TOOLS = [
        { k: 'pala', s: 'Pala', ico: '⛏️', n: 'Pala (manual)', tip: 'Excavación manual: 1×1 m, 0.25 m por golpe, alcance 4.5 m, lenta y cara (mano de obra). Clic izq. excava/nivela (R) · clic der. rellena.', params: [] },
        { k: 'exc', ico: '🚜', n: 'Excavadora asistida', s: 'Asistida', tip: 'Atajo de maquinaria (la excavadora real se maneja subiendo a la amarilla con E): pasadas de 1, 3 o 5 m y 0.5 m de profundidad, alcance 10 m, barata por m³ (+ movilización). Clic izq. excava/nivela (R) · clic der. rellena.', params: [P('half', 'Ancho de pasada', [0, 1, 2], 1, '', function (v) { return (2 * v + 1) + ' m'; })] },
        { k: 'comp', s: 'Compactar', ico: '🛞', n: 'Compactador (plancha / rodillo)', tip: 'Compacta el RELLENO nuevo. El relleno suelto asienta y soporta poco; compactado, mucho más. Mantén pulsado.', params: [P('half', 'Ancho', [0, 1], 1, '', function (v) { return (2 * v + 1) + ' m'; })] },
        { k: 'zap', s: 'Zapata', ico: '▣', n: 'Zapata', type: 'zap', tip: 'Apunta al fondo NIVELADO de la excavación (bajo la capa vegetal) y haz clic.', params: [P('B', 'Lado B', [0.6, 0.8, 1, 1.2, 1.5, 1.8, 2, 2.5, 3, 3.5], 1.5, ' m'), P('th', 'Espesor', [0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1], 0.4, ' m')] },
        { k: 'cim', s: 'Cimiento', ico: '▭', n: 'Cimiento corrido', type: 'cim', tip: 'Clic en el inicio y clic en el final, dentro de una zanja nivelada.', params: [P('b', 'Ancho', [0.4, 0.5, 0.6, 0.8, 1, 1.2], 0.6, ' m'), P('th', 'Espesor', [0.25, 0.3, 0.4, 0.5, 0.6], 0.4, ' m')] },
        { k: 'col', s: 'Columna', ico: '▮', n: 'Columna', type: 'col', tip: 'Apunta a la cara superior de una zapata o de otra columna.', params: [P('s', 'Lado', [0.25, 0.3, 0.35, 0.4, 0.5, 0.6, 0.8], 0.3, ' m'), P('h', 'Altura', [2.4, 2.6, 2.8, 3, 3.5, 4], 2.8, ' m')] },
        { k: 'vig', s: 'Viga', ico: '═', n: 'Viga', type: 'vig', tip: 'Clic en una columna y clic en otra del mismo nivel (apunta a su parte superior).', params: [P('b', 'Ancho', [0.2, 0.25, 0.3, 0.4, 0.5], 0.3, ' m'), P('h', 'Peralte', [0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.2], 0.4, ' m')] },
        { k: 'los', s: 'Losa', ico: '▦', n: 'Losa', type: 'los', tip: 'Clic en una esquina y en la opuesta, sobre el eje de las vigas.', params: [P('th', 'Espesor', [0.1, 0.12, 0.15, 0.18, 0.2, 0.22, 0.25, 0.3], 0.15, ' m')] },
        { k: 'mur', s: 'Muro', ico: '🧱', n: 'Muro de mampostería', type: 'mur', tip: 'Clic en el inicio y en el final, sobre cimiento, viga o losa.', params: [P('th', 'Espesor', [0.1, 0.15, 0.2, 0.25], 0.15, ' m'), P('h', 'Altura', [2.2, 2.4, 2.6, 2.8], 2.6, ' m')] },
        { k: 'tec', s: 'Techo', ico: '⌂', n: 'Techo', type: 'tec', tip: 'Clic en esquinas opuestas, sobre los muros o vigas.', params: [P('rise', 'Cumbrera', [0.5, 1, 1.5], 1, ' m')] },
        { k: 'pav', s: 'Pavimento', ico: '🛣️', n: 'Pavimento', type: 'pav', tip: 'Esquinas opuestas sobre terreno nivelado. Orden de capas: subbase → base → carpeta.', params: [P('layer', 'Capa', [0, 1, 2], 0, '', function (v) { return ['Subbase', 'Base', 'Carpeta asfáltica'][v]; }), P('th', 'Espesor', [0, 0.05, 0.075, 0.1, 0.15, 0.2, 0.25, 0.3], 0, ' m', function (v) { return v === 0 ? 'estándar' : f(v * 100, 1) + ' cm'; })] },
        { k: 'cont', s: 'Contención', ico: '🧗', n: 'Muro de contención', type: 'cont', tip: 'Traza una línea al pie del talud; el muro retiene el lado alto.', params: [P('H', 'Altura H', [2, 2.5, 3, 3.5, 4, 4.5, 5], 3.5, ' m'), P('B', 'Base B', [1, 1.5, 2, 2.5, 3, 3.5, 4], 2.5, ' m')] },
        { k: 'tub', s: 'Tubería', ico: '⚪', n: 'Tubería / alcantarilla', type: 'tub', tip: 'Inicio y fin dentro de una zanja ya excavada; luego rellena encima.', params: [P('D', 'Diámetro', [0.3, 0.4, 0.6, 0.8, 1], 0.4, ' m'), P('pend', 'Pendiente', [0.5, 1, 2, 3, 5], 1, ' %')] },
        { k: 'acero', s: 'Acero', ico: '🔩', n: 'Armar acero de refuerzo', tip: 'MANTÉN el clic sobre un elemento encofrado para armar su acero (varillas longitudinales y estribos). Sin acero armado no se puede vaciar el concreto. Más acero = más tiempo y costo.', params: [] },
        { k: 'encof', s: 'Encofrar', ico: '📦', n: 'Armar encofrado', tip: 'DESPUÉS de armar el acero: MANTÉN el clic sobre el elemento para levantar el encofrado de madera (con puntales en vigas y losas). Sin encofrado no se puede vaciar.', params: [] },
        { k: 'bote', s: 'Bote', ico: '🪣', n: 'Bote de concreto', tip: 'Para donde no llega el mixer. 1) Ponte junto al trompo con el bote, enciéndelo (E) y mantén G: el concreto cae al bote (0.15 m³). 2) Camina al encofrado y haz CLIC sobre él (alcance 4.5 m) para vaciar el bote.', params: [] },
        { k: 'pump', s: 'Bomba', ico: '🏗️', n: 'Vaciar con bomba', tip: 'Clic sobre un elemento ENCOFRADO: lo llena de concreto con bomba (recargo). Alternativa realista: vierte con el mixer o el trompo apuntando la canaleta sobre el encofrado.', params: [] },
        { k: 'strip', s: 'Desencofrar', ico: '🪵', n: 'Desencofrar', tip: 'Retira el encofrado de un elemento ya fraguado. Mínimo: zapatas/cimientos 2 d · columnas 3 d · vigas/losas 14 d. Si lo haces antes, el concreto se daña. Avanza el tiempo con B (+1 día) o Shift+B (+7 días).', params: [] },
        { k: 'dem', s: 'Demoler', ico: '🔨', n: 'Demoler', tip: 'Clic sobre un elemento para demolerlo (puedes deshacer con U).', params: [] }
    ];
    var HOTKEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'q', 'e'];
    var REACH = { pala: 4.5, exc: 10, comp: 6 };
    function isDig(t) { return t.k === 'pala' || t.k === 'exc'; }
    function isGround(t) { return t.k === 'pala' || t.k === 'exc' || t.k === 'comp'; }
    var KIND_TOP = { vig: ['col'], los: ['vig', 'mur', 'col'], mur: ['cim', 'vig', 'los', 'zap'], tec: ['mur', 'vig'] };
    var STATUS_COL = { ok: 0x6fcf7a, warn: 0xf2c14e, fail: 0xe5534b };
    var BASE_COL = { zap: 0xa9a9a2, cim: 0xa2a29b, col: 0xbdbdb6, vig: 0xaeaea7, los: 0xc6c6bf, mur: 0xb8644a, tec: 0x8d3b2b, cont: 0xb3b3ac, tub: 0x8a9096 };
    var PAV_COL = [0x9c8b73, 0x7d7d7d, 0x2c2c30];

    function newState(id, siteKey) {
        var W = C.newWorld(id, siteKey);
        return { W: W, mid: id, siteKey: siteKey, tool: TOOLS[0], pv: {}, pa: 0, mode: 'cut', lvl: 0, anchor: null, undo: [], yaw: 0, pitch: -0.15, x: 0, z: 12, feet: 0, vy: 0, fly: false, eye: 1.7, keys: {}, btn: {}, digT: 0, hit: null, trial: null, rep: null, ms: null, anDirty: true, anT: 0, tDirty: true, eDirty: true, showAn: false, ov: null, collapsed: false, anim: null, meshes: {}, locked: false, triedLock: false, last: 0, aimT: 0, shake: 0, raf: 0, started: Date.now(), pre: null };
    }
    function curVals(tl) { var o = {}, pv = S.pv[tl.k] || (S.pv[tl.k] = {}); tl.params.forEach(function (p) { if (pv[p.id] == null) pv[p.id] = Math.max(0, p.vals.indexOf(p.def)); o[p.id] = p.vals[pv[p.id]]; }); return o; }
    function pfmt(p, v) { return p.fmt ? p.fmt(v) : v + p.u; }

    /* ---------- deshacer ---------- */
    function snapW() { var W = S.W; return { H: new Float32Array(W.H), elems: JSON.parse(JSON.stringify(W.elems)), nid: W.nid, stock: W.stock, bought: W.bought, excav: W.excav, day: W.day, pumpVol: W.pumpVol }; }
    function restoreW(s) { var W = S.W; W.H.set(s.H); W.elems = JSON.parse(JSON.stringify(s.elems)); W.nid = s.nid; W.stock = s.stock; W.bought = s.bought; W.excav = s.excav; if (s.day != null) { W.pumpVol = s.pumpVol; } dirtyAll(); }
    function pushUndo() { S.undo.push(snapW()); if (S.undo.length > 40) S.undo.shift(); }
    function undo() { if (S.collapsed) return toast('Primero restaura la obra.', 'warn'); var s = S.undo.pop(); if (!s) return toast('Nada que deshacer.', 'warn'); restoreW(s); S.anchor = null; toast('↩ Acción deshecha.'); }
    function dirtyAll() { S.tDirty = S.eDirty = S.anDirty = true; }

    /* ---------- texturas procedurales ---------- */
    var TILE = { conc: 1, brick: 0.5, asf: 1.2, base: 0.8, sub: 0.8, soil: 1.6 };
    function rr(a, b) { return a + Math.random() * (b - a); }
    function texDraw(kind) {
        var cv = doc.createElement('canvas'); cv.width = cv.height = 128; var g = cv.getContext('2d'), i, x, y, v;
        function dots(n, c0, c1, s0, s1, al) { for (i = 0; i < n; i++) { v = Math.floor(rr(c0, c1)); g.fillStyle = 'rgba(' + v + ',' + v + ',' + Math.floor(v * (kind === 'sub' ? 0.85 : 1)) + ',' + al + ')'; var sz = rr(s0, s1); g.fillRect(rr(0, 128), rr(0, 128), sz, sz); } }
        if (kind === 'conc') { g.fillStyle = '#cdcdc8'; g.fillRect(0, 0, 128, 128); dots(2600, 150, 235, 1, 2.2, 0.35); for (i = 0; i < 36; i++) { g.fillStyle = 'rgba(70,70,70,.35)'; g.beginPath(); g.arc(rr(0, 128), rr(0, 128), rr(0.6, 1.6), 0, 7); g.fill(); } g.fillStyle = 'rgba(0,0,0,.05)'; for (y = 20; y < 128; y += 42) g.fillRect(0, y, 128, 1.5); }
        else if (kind === 'brick') { g.fillStyle = '#cfc5b4'; g.fillRect(0, 0, 128, 128); for (y = 0; y < 5; y++) for (x = -1; x < 3; x++) { var ox = (y % 2) * 32 + x * 64; g.fillStyle = 'hsl(' + rr(8, 18) + ',' + rr(38, 52) + '%,' + rr(36, 46) + '%)'; g.fillRect(ox + 2, y * 25.6 + 2, 60, 21.5); } dots(900, 90, 200, 1, 2, 0.18); }
        else if (kind === 'asf') { g.fillStyle = '#34343a'; g.fillRect(0, 0, 128, 128); dots(2600, 60, 130, 1, 2.4, 0.5); dots(500, 15, 40, 1, 2, 0.5); }
        else if (kind === 'base') { g.fillStyle = '#8c8c88'; g.fillRect(0, 0, 128, 128); dots(900, 90, 200, 2, 5, 0.7); dots(500, 60, 120, 2, 4, 0.6); }
        else if (kind === 'sub') { g.fillStyle = '#a08f77'; g.fillRect(0, 0, 128, 128); dots(900, 110, 210, 2, 5, 0.65); dots(500, 80, 150, 2, 4, 0.55); }
        else { g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, 128, 128); dots(3200, 190, 255, 1, 3, 0.7); dots(1200, 150, 200, 1, 2.5, 0.6); }
        var t = new THREE.CanvasTexture(cv); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; return t;
    }
    function tex(kind) { var T = S.tex || (S.tex = {}); return T[kind] || (T[kind] = texDraw(kind)); }
    function scaleUV(geo, w, h, d, tile) {
        var uv = geo.attributes.uv, f, k, su, sv; for (f = 0; f < 6; f++) { if (f < 2) { su = d; sv = h; } else if (f < 4) { su = w; sv = d; } else { su = w; sv = h; } for (k = 0; k < 4; k++) { var q = f * 4 + k; uv.setXY(q, uv.getX(q) * su / tile, uv.getY(q) * sv / tile); } }
        uv.needsUpdate = true;
    }

    /* ---------- escena ---------- */
    function mkVM(cam) {
        var yel = new THREE.MeshLambertMaterial({ color: 0xf2b705 }), dark = new THREE.MeshLambertMaterial({ color: 0x2b2b2b }), steel = new THREE.MeshLambertMaterial({ color: 0x9aa1a8 }), wood = new THREE.MeshLambertMaterial({ color: 0xa06f3e });
        function bxm(w, h, d, m, x, y, z, rx) { var b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); if (rx) b.rotation.x = rx; b.frustumCulled = false; return b; }
        var pala = new THREE.Group(); pala.position.set(0.34, -0.36, -0.55); var hd = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 1.0, 8), wood); hd.rotation.x = Math.PI / 2; hd.position.set(0, 0, 0.1); pala.add(hd, bxm(0.17, 0.015, 0.24, steel, 0, -0.01, -0.5, 0.12), bxm(0.1, 0.03, 0.03, wood, 0, 0.02, 0.5));
        var exc = new THREE.Group(); exc.position.set(0.3, -0.52, -0.85); exc.add(bxm(0.08, 0.08, 0.85, yel, 0, 0.12, -0.35, 0.18), bxm(0.07, 0.07, 0.55, yel, 0, 0.0, -0.95, -0.55), bxm(0.34, 0.16, 0.24, yel, 0, -0.22, -1.2, -0.2), bxm(0.34, 0.03, 0.04, dark, 0, -0.32, -1.3, -0.2), bxm(0.07, 0.07, 0.5, dark, 0.0, 0.2, 0.2, 0.18));
        var comp = new THREE.Group(); comp.position.set(0.24, -0.56, -0.8); comp.add(bxm(0.34, 0.05, 0.34, steel, 0, 0, 0), bxm(0.05, 0.3, 0.1, dark, 0, 0.17, 0.05), bxm(0.03, 0.03, 0.55, dark, 0, 0.3, 0.3, 0.5), bxm(0.2, 0.12, 0.2, yel, 0, 0.1, -0.02));
        pala.visible = exc.visible = comp.visible = false; cam.add(pala, exc, comp); return { pala: pala, exc: exc, comp: comp };
    }
    function mkExcavator() {
        var g = new THREE.Group(), yel = new THREE.MeshLambertMaterial({ color: 0xf2b705 }), dark = new THREE.MeshLambertMaterial({ color: 0x2a2a2a }), glass = new THREE.MeshLambertMaterial({ color: 0x7aa6c8 });
        function b(w, h, d, m, x, y, z, rx, par) { var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (rx) o.rotation.x = rx; o.castShadow = true; (par || g).add(o); return o; }
        b(0.7, 0.6, 3.4, dark, -1.0, 0.3, 0); b(0.7, 0.6, 3.4, dark, 1.0, 0.3, 0); b(2.4, 0.35, 2.6, dark, 0, 0.75, 0);
        var up = new THREE.Group(); up.position.set(0, 0.95, 0); g.add(up);
        b(2.6, 0.8, 2.8, yel, 0, 0.4, 0, 0, up); b(2.4, 0.9, 0.7, dark, 0, 0.5, 1.5, 0, up); b(1.2, 1.3, 1.3, yel, -0.65, 1.45, -0.3, 0, up); b(1.0, 0.9, 0.05, glass, -0.65, 1.55, -0.98, 0, up);
        b(0.35, 0.4, 3.2, yel, 0.5, 1.82, -2.7, 0.61, up); b(0.28, 0.3, 1.8, yel, 0.5, 2.13, -4.35, -0.87, up); b(0.9, 0.6, 0.75, yel, 0.5, 1.35, -5.0, -0.7, up); b(0.9, 0.06, 0.08, dark, 0.5, 1.0, -5.3, -0.7, up);
        return g;
    }
    function initScene() {
        var cv = $('#sobCanvas', ROOT), R = S.R = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance' });
        R.setPixelRatio(Math.min(global.devicePixelRatio || 1, 1.75)); R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
        var sc = S.scene = new THREE.Scene(); sc.background = new THREE.Color(0xcfe6f7); sc.fog = new THREE.Fog(0xcfe6f7, 50, 150);
        var cam = S.cam = new THREE.PerspectiveCamera(72, 1, 0.1, 400); cam.rotation.order = 'YXZ';
        sc.add(cam); sc.add(new THREE.HemisphereLight(0xdcecff, 0x7a6a55, 0.75)); S.tex = {};
        var sg = new THREE.SphereGeometry(300, 24, 16), sp = sg.attributes.position, sc2 = [], ii; for (ii = 0; ii < sp.count; ii++) { var yy = Math.max(0, Math.min(1, (sp.getY(ii) / 300 + 0.05) / 0.75)), a0 = [0xcf / 255, 0xe6 / 255, 0xf7 / 255], a1 = [0x3f / 255, 0x86 / 255, 0xd0 / 255]; sc2.push(a0[0] + (a1[0] - a0[0]) * yy, a0[1] + (a1[1] - a0[1]) * yy, a0[2] + (a1[2] - a0[2]) * yy); }
        sg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(sc2), 3)); sc.add(new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })));
        var cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, fog: false, depthWrite: false }); for (ii = 0; ii < 12; ii++) { var cg = new THREE.Group(), cb = Math.floor(3 + Math.random() * 3); for (var q = 0; q < cb; q++) { var sph = new THREE.Mesh(new THREE.SphereGeometry(8 + Math.random() * 9, 10, 8), cm); sph.position.set(q * 11 - cb * 5, Math.random() * 4, Math.random() * 6); sph.scale.y = 0.45; cg.add(sph); } var ang = Math.random() * 6.28, dd = 140 + Math.random() * 110; cg.position.set(Math.cos(ang) * dd, 70 + Math.random() * 50, Math.sin(ang) * dd); sc.add(cg); }
        var sunM = new THREE.Mesh(new THREE.SphereGeometry(14, 12, 8), new THREE.MeshBasicMaterial({ color: 0xfff4c8, fog: false })); sunM.position.set(130, 210, 90); sc.add(sunM);
        var PN = 140, pgm = new THREE.BufferGeometry(), ppos = new Float32Array(PN * 3); for (ii = 0; ii < PN; ii++) ppos[ii * 3 + 1] = -100; pgm.setAttribute('position', new THREE.BufferAttribute(ppos, 3));
        var pmt = new THREE.PointsMaterial({ size: 0.3, color: 0xb89a74, transparent: true, opacity: 0, depthWrite: false }), pts = new THREE.Points(pgm, pmt); pts.frustumCulled = false; sc.add(pts);
        S.pf = { N: PN, geo: pgm, mat: pmt, pos: ppos, vel: new Float32Array(PN * 3), life: new Float32Array(PN) };
        S.vm = mkVM(cam);
        var sun = S.sun = new THREE.DirectionalLight(0xfff1d6, 0.95); sun.position.set(26, 42, 18); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
        var sh = sun.shadow.camera; sh.left = -32; sh.right = 32; sh.top = 32; sh.bottom = -32; sh.near = 5; sh.far = 120; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; sc.add(sun);
        var gmat0 = new THREE.MeshLambertMaterial({ color: 0x6f9250 }); [[0, -HALF - 150, 600, 300], [0, HALF + 150, 600, 300], [-HALF - 150, 0, 300, N], [HALF + 150, 0, 300, N]].forEach(function (a) { var gm = new THREE.Mesh(new THREE.PlaneGeometry(a[2], a[3]), gmat0); gm.rotation.x = -Math.PI / 2; gm.position.set(a[0], -0.02, a[1]); gm.receiveShadow = true; sc.add(gm); });
        /* cerramiento de obra */
        var fm = new THREE.MeshLambertMaterial({ color: 0xd9d4c3 }), fh = 10, fy = -1, t = 0.3, L = N + 1;
        [[0, -HALF - t / 2, L, t], [0, HALF + t / 2, L, t], [-HALF - t / 2, 0, t, L], [HALF + t / 2, 0, t, L]].forEach(function (a) { var m = new THREE.Mesh(new THREE.BoxGeometry(a[2], fh, a[3]), fm); m.position.set(a[0], fy, a[1]); m.castShadow = m.receiveShadow = true; sc.add(m); });
        var rm = new THREE.MeshLambertMaterial({ color: 0xf2b705 }); [[0, -HALF - t / 2, L, t], [0, HALF + t / 2, L, t], [-HALF - t / 2, 0, t, L], [HALF + t / 2, 0, t, L]].forEach(function (a) { var m = new THREE.Mesh(new THREE.BoxGeometry(a[2] + 0.02, 0.35, a[3] + 0.02), rm); m.position.set(a[0], 3.7, a[1]); sc.add(m); });
        /* árboles de fondo */
        var tm = new THREE.MeshLambertMaterial({ color: 0x3f7a3a }), bm = new THREE.MeshLambertMaterial({ color: 0x6b4a2b }), seed = 7;
        function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
        for (var i = 0; i < 46; i++) { var a = rnd() * Math.PI * 2, d = 38 + rnd() * 40, s = 0.8 + rnd() * 1.1, g = new THREE.Group(); var tr = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * s, 0.35 * s, 2.4 * s, 6), bm); tr.position.y = 1.2 * s; var co = new THREE.Mesh(new THREE.ConeGeometry(1.7 * s, 4.6 * s, 7), tm); co.position.y = 4.2 * s; g.add(tr, co); g.position.set(Math.cos(a) * d, 0, Math.sin(a) * d); sc.add(g); }
        S.gTerr = new THREE.Group(); S.gEl = new THREE.Group(); S.gDeco = new THREE.Group(); sc.add(S.gTerr, S.gEl, S.gDeco);
        /* fantasma */
        var gb = new THREE.BoxGeometry(1, 1, 1), gmat = new THREE.MeshBasicMaterial({ color: 0x35d07f, transparent: true, opacity: 0.32, depthWrite: false }), ge = new THREE.LineSegments(new THREE.EdgesGeometry(gb), new THREE.LineBasicMaterial({ color: 0xffffff }));
        S.ghost = new THREE.Mesh(gb, gmat); S.ghost.add(ge); S.ghost.visible = false; S.ghost.renderOrder = 5; sc.add(S.ghost);
        S.anchorM = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshBasicMaterial({ color: 0x4aa8ff })); S.anchorM.visible = false; sc.add(S.anchorM);
        S.waterM = new THREE.Mesh(new THREE.PlaneGeometry(N, N), new THREE.MeshLambertMaterial({ color: 0x2d7fb8, transparent: true, opacity: 0.55 })); S.waterM.rotation.x = -Math.PI / 2; S.waterM.visible = false; sc.add(S.waterM);
        resize();
    }
    function resize() { if (!S || !S.R) return; var w = ROOT.clientWidth || global.innerWidth, h = ROOT.clientHeight || global.innerHeight; S.R.setSize(w, h, false); S.cam.aspect = w / h; S.cam.updateProjectionMatrix(); }

    function buildTerrain() {
        var W = S.W, pos = [], nor = [], col = [], uvs = [], site = W.site, k, i, j, cc;
        function vtx(p, n, c, sh) { uvs.push(n[1] === 1 ? p[0] / 1.6 : (p[0] + p[2]) / 1.6, n[1] === 1 ? p[2] / 1.6 : p[1] / 1.6); pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]); col.push(c[0] * sh, c[1] * sh, c[2] * sh); }
        function quad(a, b, c, d, n, cl, sh) { vtx(a, n, cl, sh); vtx(b, n, cl, sh); vtx(c, n, cl, sh); vtx(a, n, cl, sh); vtx(c, n, cl, sh); vtx(d, n, cl, sh); }
        function wall(x1, z1, x2, z2, ylo, yhi, nx, nz, cl, sh) {
            if ((-(z2 - z1)) * nx + (x2 - x1) * nz < 0) { var tx = x1, tz = z1; x1 = x2; z1 = z2; x2 = tx; z2 = tz; }
            quad([x1, ylo, z1], [x2, ylo, z2], [x2, yhi, z2], [x1, yhi, z1], [nx, 0, nz], cl, sh);
        }
        function emitWall(x1, z1, x2, z2, lo, hi, nx, nz, h0hi) {
            var y = hi, cur = null, top = hi, sh = nx ? 0.84 : 0.76;
            while (y > lo + 1e-6) { var y2 = Math.max(lo, y - 0.25), c = C.layerAt(site, h0hi - (y + y2) / 2).col; if (cur === null) cur = c; else if (c !== cur) { wall(x1, z1, x2, z2, y, top, nx, nz, rgb(cur), sh); top = y; cur = c; } y = y2; }
            if (cur !== null) wall(x1, z1, x2, z2, lo, top, nx, nz, rgb(cur), sh);
        }
        for (j = 0; j < N; j++) for (i = 0; i < N; i++) {
            k = j * N + i; var h = W.H[k], x0 = i - HALF, z0 = j - HALF, h0 = W.H0[k], layer = C.layerAt(site, h0 - h), cl = rgb(h > h0 + 0.01 ? (W.comp[k] ? C.RELLENO_C.col : C.RELLENO.col) : layer.col), sh = 0.94 + hash(i, j) * 0.1;
            quad([x0, h, z0], [x0, h, z0 + 1], [x0 + 1, h, z0 + 1], [x0 + 1, h, z0], [0, 1, 0], cl, sh);
            if (i < N - 1) { var k2 = k + 1, h2 = W.H[k2]; if (h > h2 + 1e-4) emitWall(x0 + 1, z0, x0 + 1, z0 + 1, h2, h, 1, 0, h0); else if (h2 > h + 1e-4) emitWall(x0 + 1, z0, x0 + 1, z0 + 1, h, h2, -1, 0, W.H0[k2]); }
            if (j < N - 1) { var k3 = k + N, h3 = W.H[k3]; if (h > h3 + 1e-4) emitWall(x0, z0 + 1, x0 + 1, z0 + 1, h3, h, 0, 1, h0); else if (h3 > h + 1e-4) emitWall(x0, z0 + 1, x0 + 1, z0 + 1, h, h3, 0, -1, W.H0[k3]); }
        }
        var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
        if (S.terr) { S.gTerr.remove(S.terr); S.terr.geometry.dispose(); }
        if (!S.terrMat) S.terrMat = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide, map: tex('soil') });
        S.terr = new THREE.Mesh(g, S.terrMat); S.terr.castShadow = true; S.terr.receiveShadow = true; S.gTerr.add(S.terr);
        buildDeco();
        S.waterM.visible = W.water != null; if (W.water != null) S.waterM.position.y = W.water;
    }
    function buildDeco() {
        var W = S.W, g = S.gDeco; while (g.children.length) { var o = g.children.pop(); o.traverse(function (x) { if (x.geometry) x.geometry.dispose(); }); }
        if (!W.marks || !W.marks.length) return;
        var pm = new THREE.MeshLambertMaterial({ color: 0xf2b705 }), fm = new THREE.MeshLambertMaterial({ color: 0xd8322b }), pts = [];
        W.marks.forEach(function (p) { var hh = C.hAt(W, p[0], p[1]), top = (W.H0[Math.floor(p[1] + HALF) * N + Math.floor(p[0] + HALF)] || 0) + 1.5, len = Math.max(0.3, top - hh), m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 6), pm); m.position.set(p[0], hh + len / 2, p[1]); g.add(m); var fl = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.02), fm); fl.position.set(p[0] + 0.15, top - 0.12, p[1]); g.add(fl); });
        var M = W.marks; if (M.length >= 4) { var yy = (W.H0[Math.floor(M[0][1] + HALF) * N + Math.floor(M[0][0] + HALF)] || 0) + 1.2; for (var a = 0; a < M.length; a++) { var b = M[(a + 1) % M.length]; pts.push(new THREE.Vector3(M[a][0], yy, M[a][1]), new THREE.Vector3(b[0], yy, b[1])); } var lg = new THREE.BufferGeometry().setFromPoints(pts); g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffe066 }))); }
        else if (M.length === 2) { var y2 = (W.H0[Math.floor(M[0][1] + HALF) * N + Math.floor(M[0][0] + HALF)] || 0) + 1.2; g.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(M[0][0], y2, M[0][1]), new THREE.Vector3(M[1][0], y2, M[1][1])]), new THREE.LineBasicMaterial({ color: 0xffe066 }))); }
    }

    function gable(e, mat) {
        var r = e.r, o = 0.3, x0 = r[0] - o, x1 = r[2] + o, z0 = r[1] - o, z1 = r[3] + o, y0 = e.y0, y1 = e.y1, along = (r[2] - r[0]) >= (r[3] - r[1]), v = [];
        function tri(a, b, c) { v.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]); }
        var cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
        if (along) { var A = [x0, y1, cz], B = [x1, y1, cz]; tri([x0, y0, z0], [x1, y0, z0], B); tri([x0, y0, z0], B, A); tri([x1, y0, z1], [x0, y0, z1], A); tri([x1, y0, z1], A, B); tri([x0, y0, z1], [x0, y0, z0], A); tri([x1, y0, z0], [x1, y0, z1], B); }
        else { var A2 = [cx, y1, z0], B2 = [cx, y1, z1]; tri([x1, y0, z0], [x1, y0, z1], B2); tri([x1, y0, z0], B2, A2); tri([x0, y0, z1], [x0, y0, z0], A2); tri([x0, y0, z1], A2, B2); tri([x0, y0, z0], [x1, y0, z0], A2); tri([x1, y0, z1], [x0, y0, z1], B2); }
        for (var i = 0; i < v.length; i += 3) { v[i] -= e.cx; v[i + 1] -= (e.y0 + e.y1) / 2; v[i + 2] -= e.cz; }
        var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(v), 3)); g.computeVertexNormals(); return g;
    }
    function meshFor(e) {
        var g = new THREE.Group(), cy = (e.y0 + e.y1) / 2, mats = [];
        g.position.set(e.cx, cy, e.cz); g.userData = { e: e, mats: mats };
        function mk(color, tk) { var m = new THREE.MeshLambertMaterial({ color: color, side: THREE.DoubleSide, map: tk ? tex(tk) : null }); mats.push({ m: m, base: color }); return m; }
        function bx(x0, z0, x1, z1, y0, y1, color, tk) {
            var gw = Math.max(0.02, x1 - x0), gh2 = Math.max(0.02, y1 - y0), gd = Math.max(0.02, z1 - z0), bg = new THREE.BoxGeometry(gw, gh2, gd); if (tk) scaleUV(bg, gw, gh2, gd, TILE[tk]);
            var m = new THREE.Mesh(bg, mk(color, tk)); m.position.set((x0 + x1) / 2 - e.cx, (y0 + y1) / 2 - cy, (z0 + z1) / 2 - e.cz); m.castShadow = m.receiveShadow = true;
            var ed = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0.45 })); m.add(ed); g.add(m); return m;
        }
        var r = e.r;
        function seg(pts, color) { var ge = new THREE.BufferGeometry(); ge.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); var ln = new THREE.LineSegments(ge, new THREE.LineBasicMaterial({ color: color })); g.add(ln); }
        function rebarCage() {
            var P = [], x0 = r[0] + 0.05 - e.cx, x1 = r[2] - 0.05 - e.cx, z0 = r[1] + 0.05 - e.cz, z1 = r[3] - 0.05 - e.cz, y0 = e.y0 + 0.05 - cy, y1 = e.y1 - 0.05 - cy, a, n, st;
            function ring(axis, v) { if (axis === 'y') P.push(x0, v, z0, x1, v, z0, x1, v, z0, x1, v, z1, x1, v, z1, x0, v, z1, x0, v, z1, x0, v, z0); else if (axis === 'x') P.push(v, y0, z0, v, y1, z0, v, y1, z0, v, y1, z1, v, y1, z1, v, y0, z1, v, y0, z1, v, y0, z0); else P.push(x0, y0, v, x1, y0, v, x1, y0, v, x1, y1, v, x1, y1, v, x0, y1, v, x0, y1, v, x0, y0, v); }
            if (e.t === 'col') { [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].forEach(function (c) { P.push(c[0], y0, c[1], c[0], y1 + 0.3, c[1]); }); for (a = y0 + 0.1; a < y1; a += 0.2) ring('y', a); }
            else if (e.t === 'vig') { [[y0, z0], [y0, z1], [y1, z0], [y1, z1]].forEach(function (c) { P.push(x0, c[0], c[1], x1, c[0], c[1]); }); if (e.axisX) { for (a = x0 + 0.1; a < x1; a += 0.22) ring('x', a); } else { P.length = 0; [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].forEach(function (c) { P.push(c[0], c[1], z0, c[0], c[1], z1); }); for (a = z0 + 0.1; a < z1; a += 0.22) ring('z', a); } }
            else { var lays = e.t === 'los' ? [y0 + 0.02] : [y0 + 0.02, y1 - 0.03]; st = Math.max(0.25, Math.max(x1 - x0, z1 - z0) / 28); lays.forEach(function (yy) { for (a = x0; a <= x1 + 1e-6; a += st) P.push(a, yy, z0, a, yy, z1); for (a = z0; a <= z1 + 1e-6; a += st) P.push(x0, yy, a, x1, yy, a); }); }
            if (!e.rebar && e.rp < 1) P = P.slice(0, Math.floor(P.length / 6 * e.rp) * 6); if (P.length) seg(P, 0xc2631c);
        }
        function formwork(frac) {
            var wm = new THREE.MeshLambertMaterial({ color: 0xc89455, transparent: true, opacity: 0.55, side: THREE.DoubleSide }), t = 0.04, X0 = r[0] - e.cx, X1 = r[2] - e.cx, Z0 = r[1] - e.cz, Z1 = r[3] - e.cz, Y0 = e.y0 - cy, Y1 = e.y1 - cy, H = Y1 - Y0;
            var parts = []; function pl(w, h, d, x, y, z) { var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wm); m.position.set(x, y, z); g.add(m); parts.push(m); return m; }
            pl(X1 - X0 + 2 * t, H, t, (X0 + X1) / 2, (Y0 + Y1) / 2, Z0 - t / 2); pl(X1 - X0 + 2 * t, H, t, (X0 + X1) / 2, (Y0 + Y1) / 2, Z1 + t / 2); pl(t, H, Z1 - Z0, X0 - t / 2, (Y0 + Y1) / 2, (Z0 + Z1) / 2); pl(t, H, Z1 - Z0, X1 + t / 2, (Y0 + Y1) / 2, (Z0 + Z1) / 2);
            var wood = new THREE.MeshLambertMaterial({ color: 0x8a5a2b }); 
            if (e.t === 'los' || e.t === 'vig') { pl(X1 - X0, t, Z1 - Z0, (X0 + X1) / 2, Y0 - t / 2, (Z0 + Z1) / 2);
                var nx = Math.max(1, Math.round((X1 - X0) / 1.2)), nz = Math.max(1, Math.round((Z1 - Z0) / 1.2)), i, j; if (e.t === 'vig') { if (e.axisX) nz = 1; else nx = 1; }
                for (i = 0; i < nx; i++) for (j = 0; j < nz; j++) { var px = X0 + (i + 0.5) * (X1 - X0) / nx, pz = Z0 + (j + 0.5) * (Z1 - Z0) / nz, gy = C.groundAt(S.W, px + e.cx, pz + e.cz, e.y0 - 0.3), hh = e.y0 - gy; if (hh < 0.2 || hh > 8) continue; var pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, hh, 6), wood); pole.position.set(px, Y0 - t - hh / 2, pz); g.add(pole); parts.push(pole); } }
            parts.forEach(function (m, i) { m.visible = i < Math.ceil(frac * parts.length - 1e-6); });
        }
        function realConc() {
            var fr = Math.max(0, Math.min(1, e.pv / e.vol)); if (e.t === 'los' || e.t === 'vig' || e.t === 'col' || e.t === 'zap' || e.t === 'cim') rebarCage();
            if (fr > 0.01) bx(r[0], r[1], r[2], r[3], e.y0, e.y0 + (e.y1 - e.y0) * fr, e.dmg > 0 ? 0xa59686 : 0x9d9d97, 'conc');
            if (e.form) formwork(1); else if (e.fp > 0) formwork(e.fp);
        }
        switch (e.t) {
            case 'tec': { var m = new THREE.Mesh(gable(e), mk(BASE_COL.tec)); m.castShadow = m.receiveShadow = true; g.add(m); break; }
            case 'pav': bx(r[0], r[1], r[2], r[3], e.y0, e.y1, 0xffffff, ['sub', 'base', 'asf'][e.layer] || 'base'); break;
            case 'cont': { var tb = 0.4, ts = 0.3; bx(r[0], r[1], r[2], r[3], e.y0, e.y0 + tb, 0xf2f2ec, 'conc'); if (e.axisX) { var za = e.dir > 0 ? e.z1 : e.z1 - ts; bx(Math.min(e.x1, e.x2), za, Math.max(e.x1, e.x2), za + ts, e.y0 + tb, e.y1, 0xf2f2ec, 'conc'); } else { var xa = e.dir > 0 ? e.x1 : e.x1 - ts; bx(xa, Math.min(e.z1, e.z2), xa + ts, Math.max(e.z1, e.z2), e.y0 + tb, e.y1, 0xf2f2ec, 'conc'); } break; }
            case 'tub': { var L = Math.hypot(e.x2 - e.x1, e.z2 - e.z1, e.y2v - e.y1v), cyl = new THREE.Mesh(new THREE.CylinderGeometry(e.D / 2, e.D / 2, L, 16, 1, true), mk(BASE_COL.tub)); cyl.castShadow = true; var vx = e.x2 - e.x1, vy = e.y2v - e.y1v, vz = e.z2 - e.z1; cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(vx, vy, vz).normalize()); cyl.position.set((e.x1 + e.x2) / 2 - e.cx, (e.y1v + e.y2v) / 2 + e.D / 2 - cy, (e.z1 + e.z2) / 2 - e.cz); g.add(cyl); break; }
            default: if (e.t === 'mur') bx(r[0], r[1], r[2], r[3], e.y0, e.y1, 0xffffff, 'brick');
                else if (e.vol != null && (e.form || e.pv < e.vol - 1e-6)) realConc();
                else bx(r[0], r[1], r[2], r[3], e.y0, e.y1, e.dmg > 0 ? 0xb4a392 : 0xf4f4ee, 'conc');
        }
        return g;
    }
    function buildElems() {
        var W = S.W, id; for (id in S.meshes) { S.gEl.remove(S.meshes[id]); S.meshes[id].traverse(function (o) { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); }
        S.meshes = {}; W.elems.forEach(function (e) { var m = meshFor(e); S.meshes[e.id] = m; S.gEl.add(m); }); tint();
    }
    function tint() {
        var rep = S.rep; Object.keys(S.meshes).forEach(function (id) { var g = S.meshes[id], st = rep && rep.by[id] ? rep.by[id].status : null; g.userData.mats.forEach(function (o) { var c = (S.showAn && st) ? STATUS_COL[st] : o.base; o.m.color.setHex(c); }); });
    }

    /* ---------- selección con rayo ---------- */
    function hitAt(x, y, z) {
        var E = S.W.elems, i, e, r;
        for (i = 0; i < E.length; i++) { e = E[i]; r = e.r; if (x >= r[0] && x <= r[2] && z >= r[1] && z <= r[3] && y >= e.y0 && y <= e.y1) return { kind: 'elem', e: e }; }
        if (x >= -HALF && x < HALF && z >= -HALF && z < HALF && y <= C.hAt(S.W, x, z)) return { kind: 'terrain' };
        return null;
    }
    function pickRay(ox, oy, oz, dx, dy, dz, maxD) {
        var t = 0.25, last = 0.25, h, k, lo, hi, mid;
        while (t < maxD) {
            h = hitAt(ox + dx * t, oy + dy * t, oz + dz * t);
            if (h) { lo = last; hi = t; for (k = 0; k < 9; k++) { mid = (lo + hi) / 2; if (hitAt(ox + dx * mid, oy + dy * mid, oz + dz * mid)) hi = mid; else lo = mid; } h = hitAt(ox + dx * hi, oy + dy * hi, oz + dz * hi) || h; h.p = { x: ox + dx * hi, y: oy + dy * hi, z: oz + dz * hi }; h.t = hi; return h; }
            last = t; t += t < 10 ? 0.07 : 0.15;
        }
        return null;
    }
    function aimDir() { var cam = S.cam, d = new THREE.Vector3(0, 0, -1).applyEuler(cam.rotation); return d; }
    function topAim(kinds, p, hit, m) {
        if (hit && hit.e && kinds.indexOf(hit.e.t) >= 0) return hit.e.y1;
        var best = null; S.W.elems.forEach(function (e) { if (kinds.indexOf(e.t) >= 0 && p.x >= e.r[0] - m && p.x <= e.r[2] + m && p.z >= e.r[1] - m && p.z <= e.r[3] + m && (best == null || e.y1 > best)) best = e.y1; }); return best;
    }
    function ptOf(hit, centerKinds) { var e = hit.e; if (e && centerKinds.indexOf(e.t) >= 0) return { x: e.cx, z: e.cz }; return { x: sn(hit.p.x), z: sn(hit.p.z) }; }

    /* Planificación: devuelve {type,p} o {err} (inicio / fin) */
    function startInfo(hit) {
        var k = S.tool.k, p, top;
        if (!hit) return { err: 'Apunta a una superficie.' };
        if (k === 'vig') { p = ptOf(hit, ['col']); top = topAim(KIND_TOP.vig, p, hit, 0.25); if (top == null) return { err: 'Apunta a la parte superior de una columna.' }; return { x: p.x, z: p.z, top: top }; }
        if (k === 'los' || k === 'mur' || k === 'tec') { p = ptOf(hit, []); top = topAim(KIND_TOP[k], p, hit, 0.25); if (top == null) return { err: k === 'mur' ? 'El muro debe apoyarse en un cimiento, viga o losa.' : (k === 'los' ? 'La losa se apoya sobre vigas o muros: apunta a una.' : 'El techo se apoya sobre muros o vigas: apunta a uno.') }; return { x: p.x, z: p.z, top: top }; }
        if (k === 'pav' && S.tool && curVals(S.tool).layer > 0 && hit.e && hit.e.t === 'pav') { p = ptOf(hit, []); return { x: p.x, z: p.z }; }
        if (hit.kind !== 'terrain') return { err: 'Apunta al terreno.' };
        p = ptOf(hit, []); return { x: p.x, z: p.z };
    }
    function plan(hit) {
        var tl = S.tool, V = curVals(tl), A = S.anchor, B, si;
        if (tl.k === 'dem') return hit && hit.e ? { dem: hit.e } : { err: 'Apunta a un elemento.' };
        if (tl.k === 'pump' || tl.k === 'strip' || tl.k === 'acero' || tl.k === 'encof' || tl.k === 'bote') return hit && hit.e && hit.e.vol != null ? { act: tl.k, e: hit.e } : { err: 'Apunta a una zapata, cimiento, columna, viga o losa.' };
        if (!hit) return { err: 'Apunta a una superficie.' };
        if (tl.k === 'zap') { if (hit.kind !== 'terrain') return { err: 'La zapata se apoya en el fondo de la excavación: apunta al suelo.' }; return { type: 'zap', p: { x: hit.p.x, z: hit.p.z, B: V.B, th: V.th } }; }
        if (tl.k === 'col') { var q = ptOf(hit, ['zap', 'col']), top = topAim(['zap', 'col'], q, hit, 0.02); if (top == null) return { err: 'La columna se apoya sobre una zapata o columna: apunta a su cara superior.' }; return { type: 'col', p: { x: q.x, z: q.z, s: V.s, h: V.h, yb: top } }; }
        if (!A) { si = startInfo(hit); return si.err ? si : { start: si }; }
        B = ptOf(hit, tl.k === 'vig' ? ['col'] : []);
        var p = { x1: A.x, z1: A.z, x2: B.x, z2: B.z };
        switch (tl.k) {
            case 'cim': Object.assign(p, { b: V.b, th: V.th }); break;
            case 'vig': Object.assign(p, { b: V.b, h: V.h, top: A.top }); break;
            case 'los': Object.assign(p, { th: V.th, yb: A.top }); break;
            case 'mur': Object.assign(p, { th: V.th, h: V.h, yb: A.top }); break;
            case 'tec': Object.assign(p, { rise: V.rise, yb: A.top }); break;
            case 'pav': Object.assign(p, { layer: V.layer, th: V.th || undefined }); break;
            case 'cont': Object.assign(p, { H: V.H, B: V.B }); break;
            case 'tub': Object.assign(p, { D: V.D, pend: V.pend }); break;
        }
        return { type: tl.type, p: p };
    }
    function roughBox(pl, hit) {
        var p = pl.p, y = hit.p.y, w = 0.4, x0, x1, z0, z1;
        if (p.x1 != null) { x0 = Math.min(p.x1, p.x2) - w / 2; x1 = Math.max(p.x1, p.x2) + w / 2; z0 = Math.min(p.z1, p.z2) - w / 2; z1 = Math.max(p.z1, p.z2) + w / 2; } else { var s = p.B || p.s || 0.5; x0 = p.x - s / 2; x1 = p.x + s / 2; z0 = p.z - s / 2; z1 = p.z + s / 2; }
        return { r: [x0, z0, x1, z1], y0: y - 0.05, y1: y + 0.2 };
    }

    /* ---------- acciones ---------- */
    function useTool(btn) {
        if (S.collapsed || S.ov) return;
        var tl = S.tool, hit = S.hit;
        if (isGround(tl)) return;
        if (btn === 2) { if (S.anchor) { S.anchor = null; toast('Trazo cancelado.'); } return; }
        if (!hit) return toast('Apunta a una superficie.', 'warn');
        var pl = plan(hit);
        if (pl.err) return toast(pl.err, 'warn');
        if (pl.dem) { pushUndo(); C.remove(S.W, pl.dem.id); dirtyAll(); return toast('🔨 ' + NAMES[pl.dem.t] + ' demolido' + (pl.dem.t === 'zap' || pl.dem.t === 'col' ? ' (lo que se apoyaba en él quedará sin apoyo)' : '') + '.'); }
        if (pl.act === 'acero') return toast(pl.e.rebar ? 'El acero ya está armado.' : 'Mantén pulsado el clic para armar el acero.', 'warn');
        if (pl.act === 'encof') return toast(!pl.e.rebar ? 'Primero arma el acero.' : (pl.e.form ? 'Ya tiene encofrado.' : 'Mantén pulsado el clic para encofrar.'), 'warn');
        if (pl.act === 'bote') {
            var bt = S.W.bote || (S.W.bote = { vol: 0, cap: 0.15 }); if (bt.vol < 0.005) return toast('El bote está vacío: llénalo en el trompo (E para mezclar, mantén G).', 'warn');
            if (dist(S.hit.p) > 4.5) return toast('Fuera de alcance: acércate al encofrado.', 'warn');
            var pr = C.pourDirect(S.W, pl.e.id, bt.vol); if (!pr.ok) return toast(pr.msg, 'warn'); bt.vol = Math.max(0, bt.vol - pr.used); S.eDirty = S.anDirty = true; return toast('🪣 Vaciado ' + f(pr.used, 2) + ' m³ en el encofrado (' + f(pl.e.pv / pl.e.vol * 100, 0) + ' %).', 'ok');
        }
        if (pl.act) {
            pushUndo(); var rr = pl.act === 'pump' ? C.pumpPour(S.W, pl.e.id) : C.strip(S.W, pl.e.id);
            if (!rr.ok) { S.undo.pop(); return toast(rr.msg, 'warn'); }
            S.eDirty = S.anDirty = true; return toast(rr.msg, rr.early ? 'bad' : 'ok');
        }
        if (pl.start) { S.anchor = pl.start; return toast('Punto inicial fijado. Elige el punto final (clic der. cancela).'); }
        var dry = C.add(S.W, pl.type, pl.p, { dry: true });
        if (!dry.ok) return toast('✖ ' + dry.msg, 'bad');
        pushUndo(); var res = C.add(S.W, pl.type, pl.p); if (!res.ok) return toast('✖ ' + res.msg, 'bad');
        S.anchor = null; dirtyAll(); sfx('place'); toast('✔ ' + cap(NAMES[res.el.t]) + ' colocado/a (' + dims(res.el) + ').', 'ok');
    }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
    function dims(e) {
        switch (e.t) {
            case 'zap': return e.B + '×' + e.B + '×' + e.th + ' m'; case 'cim': return 'b ' + e.b + ' · e ' + e.th + ' · L ' + f(e.len, 1) + ' m'; case 'col': return e.s + '×' + e.s + ' · h ' + e.h + ' m';
            case 'vig': return e.b + '×' + e.h + ' · L ' + f(e.len, 1) + ' m'; case 'los': return 'e ' + e.th + ' · ' + f(e.r[2] - e.r[0], 1) + '×' + f(e.r[3] - e.r[1], 1) + ' m'; case 'mur': return 't ' + e.th + ' · h ' + e.h + ' · L ' + f(e.len, 1) + ' m';
            case 'tec': return 'cumbrera ' + e.rise + ' m'; case 'pav': return ['subbase', 'base', 'carpeta'][e.layer] + ' ' + f(e.th * 100, 1) + ' cm'; case 'cont': return 'H ' + e.H + ' · B ' + e.B + ' · L ' + f(e.len, 1) + ' m'; case 'tub': return 'Ø' + e.D + ' · L ' + f(e.len, 1) + ' m · ' + e.pend + ' %';
        } return '';
    }
    function dist(p) { var c = S.cam.position; return Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z); }
    function digTick() {
        var hit = S.hit, tl = S.tool; if (!hit || S.collapsed || S.ov || !isGround(tl)) return;
        if (dist(hit.p) > REACH[tl.k]) { if (!S.reachT || performance.now() - S.reachT > 1500) { S.reachT = performance.now(); toast('Fuera de alcance (' + f(REACH[tl.k], 1) + ' m). Acércate.', 'warn'); } return; }
        var V = curVals(tl), W = S.W, half = tl.k === 'pala' ? 0 : V.half, mach = tl.k === 'exc', r, lay = C.layerAt(W.site, Math.max(0, C.h0At(W, hit.p.x, hit.p.z) - C.hAt(W, hit.p.x, hit.p.z))), col = lay.col;
        if (tl.k === 'comp') { if (!S.btn[0]) return; var n = C.compact(W, hit.p.x, hit.p.z, half); if (n > 0) { S.tDirty = S.anDirty = true; sfx('comp'); puff(hit.p, 8, 0xb89a74); S.vmT = 1; } else toast('Solo se compacta el relleno nuevo (sobre el nivel natural).', 'warn'); return; }
        if (S.btn[2]) r = C.dig(W, hit.p.x, hit.p.z, half, 'fill', 0, mach);
        else if (S.btn[0]) { if (S.mode === 'level') { if (S.lvlSet == null) S.lvlSet = C.hAt(W, hit.p.x, hit.p.z); r = C.dig(W, hit.p.x, hit.p.z, half, 'level', S.lvlSet, mach); S.lvl = S.lvlSet; } else r = C.dig(W, hit.p.x, hit.p.z, half, 'cut', 0, mach); }
        else return;
        if (r && r.msg) toast(r.msg, 'warn');
        if (r && r.moved !== 0) {
            S.tDirty = S.anDirty = true; S.vmT = 1; puff(hit.p, mach ? 24 : 9, S.btn[2] ? RELLENO_COL : col); sfx(mach ? 'mach' : 'dig'); S.shake = Math.max(S.shake, mach ? 0.03 : 0.008);
            var m = C.stabilize(W, 4); if (m > 0) { S.tDirty = true; puff(hit.p, 34, col); sfx('cave'); toast('⚠ ¡Derrumbe de talud! El suelo no aguanta esa pendiente. Excava por escalones o con taludes más tendidos.', 'bad'); }
        }
    }
    var RELLENO_COL = C.RELLENO.col;
    /* polvo / partículas */
    function puff(p, n, color) {
        if (!S.pf) return; var P = S.pf, i, k = 0; P.mat.color.setHex(color || 0xb89a74);
        for (i = 0; i < P.N && k < n; i++) if (P.life[i] <= 0) { P.life[i] = 0.8 + Math.random() * 0.7; P.vel[i * 3] = (Math.random() - 0.5) * 2.2; P.vel[i * 3 + 1] = 0.8 + Math.random() * 2.2; P.vel[i * 3 + 2] = (Math.random() - 0.5) * 2.2; P.pos[i * 3] = p.x + (Math.random() - 0.5) * 0.6; P.pos[i * 3 + 1] = p.y + 0.1; P.pos[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.6; k++; }
    }
    function stepPuff(dt) {
        var P = S.pf; if (!P) return; var i, alive = 0;
        for (i = 0; i < P.N; i++) { if (P.life[i] > 0) { P.life[i] -= dt; P.vel[i * 3 + 1] -= 6 * dt; P.pos[i * 3] += P.vel[i * 3] * dt; P.pos[i * 3 + 1] += P.vel[i * 3 + 1] * dt; P.pos[i * 3 + 2] += P.vel[i * 3 + 2] * dt; alive++; if (P.life[i] <= 0) P.pos[i * 3 + 1] = -100; } }
        P.geo.attributes.position.needsUpdate = true; P.mat.opacity = alive ? 0.85 : 0;
    }
    /* sonido sintetizado (WebAudio) */
    var AC = null;
    function audio() { if (S && S.mute) return null; try { if (!AC) AC = new (global.AudioContext || global.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch (e) { return null; } }
    function noise(ac, dur, freq, gain, type) { var n = Math.floor(ac.sampleRate * dur), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0), i; for (i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n); var s0 = ac.createBufferSource(); s0.buffer = b; var fl = ac.createBiquadFilter(); fl.type = type || 'lowpass'; fl.frequency.value = freq; var g = ac.createGain(); g.gain.value = gain; s0.connect(fl); fl.connect(g); g.connect(ac.destination); s0.start(); }
    function tone(ac, f0, f1, dur, gain, type) { var o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime; o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(ac.destination); o.start(); o.stop(t + dur + 0.02); }
    function sfx(k) {
        var ac = audio(); if (!ac) return;
        try { switch (k) { case 'dig': noise(ac, 0.16, 700, 0.22, 'bandpass'); break; case 'mach': noise(ac, 0.4, 320, 0.3); tone(ac, 55, 38, 0.35, 0.16, 'sawtooth'); break; case 'comp': tone(ac, 80, 45, 0.18, 0.3); noise(ac, 0.12, 400, 0.15); break; case 'place': tone(ac, 120, 55, 0.2, 0.28); noise(ac, 0.08, 1200, 0.1); break; case 'bad': tone(ac, 190, 150, 0.14, 0.08, 'square'); break; case 'cave': noise(ac, 1.1, 420, 0.4); break; case 'collapse': noise(ac, 2.6, 260, 0.55); tone(ac, 60, 25, 1.4, 0.3); break; } } catch (e) { }
    }
    function toast(msg, kind) { var t = $('#sobToast', ROOT); if (!t) return; t.className = 'sob-toast show ' + (kind || ''); t.textContent = msg; if (kind === 'bad') sfx('bad'); clearTimeout(S.toastT); S.toastT = setTimeout(function () { t.classList.remove('show'); }, 3200); }

    /* ---------- análisis / HUD ---------- */
    function refreshAn(force) {
        var now = performance.now(); if (!S.anDirty || (!force && now - S.anT < 220)) return; S.anT = now; S.anDirty = false;
        S.rep = C.analyze(S.W); S.ms = C.missionStatus(S.W, S.rep); if (S.showAn) tint(); drawHud();
        if (S.ms.done && !S.doneNotified && S.rep.fails === 0) { S.doneNotified = true; toast('🏁 ¡Objetivos cumplidos! Pulsa T para entregar la obra.', 'ok'); }
        if (!S.ms.done) S.doneNotified = false;
    }
    function drawHud() {
        var W = S.W, ms = S.ms, rep = S.rep; if (!ms) return;
        var ob = ms.objs.map(function (o) { return '<li class="' + (o.ok ? 'ok' : '') + '"><span>' + (o.ok ? '✔' : '○') + '</span>' + esc(o.text) + (o.extra ? ' <em>' + esc(o.extra) + '</em>' : '') + '</li>'; }).join('');
        $('#sobMis', ROOT).innerHTML = '<h4>' + W.mission.ico + ' ' + esc(W.mission.n) + '</h4>' + (ob ? '<ul>' + ob + '</ul>' : '<p class="sob-dim">Modo libre: sin objetivos. Prueba la obra con T.</p>') + (W.mission.hint ? '<p class="sob-hint">💡 ' + esc(W.mission.hint) + '</p>' : '');
        var over = ms.budget && ms.cost > ms.budget;
        $('#sobStat', ROOT).innerHTML = '<div class="' + (over ? 'bad' : '') + '">💰 ' + money(ms.cost) + (ms.budget ? ' / ' + money(ms.budget) : '') + '</div>' + (W.real ? '<div class="sob-dim">📅 Día ' + f(W.day, 0) + ' · 1 min real = 28 d · B +1 d · ⇧B +7 d</div>' : '') + '<div>🟫 Acopio: ' + f(W.stock, 1) + ' m³</div><div class="sob-dim">⛏ ' + f(W.excavH, 1) + ' · 🚜 ' + f(W.excavM, 1) + ' · compra ' + f(W.bought, 1) + ' m³</div><div class="' + (rep.fails ? 'bad' : (rep.warns ? 'warn' : 'ok')) + '">' + (W.elems.length ? (rep.fails ? '✖ ' + rep.fails + ' falla(n)' : (rep.warns ? '⚠ ' + rep.warns + ' alerta(s)' : '✔ Sin fallas')) : 'Sin elementos') + '</div>';
    }
    function drawHotbar() {
        var hb = $('#sobBar', ROOT); hb.innerHTML = '';
        TOOLS.forEach(function (t, i) { var b = el('button', 'sob-slot' + (t === S.tool ? ' on' : ''), '<b>' + t.ico + '</b><span>' + t.s + '</span>'); b.type = 'button'; b.title = t.n; b.onclick = function (ev) { ev.stopPropagation(); selTool(i); }; hb.appendChild(b); });
        drawParams();
    }
    function drawParams() {
        var tl = S.tool, V = curVals(tl), box = $('#sobPar', ROOT), h = '<h4>' + tl.ico + ' ' + esc(tl.n) + '</h4><p class="sob-tip">' + esc(tl.tip) + '</p>';
        if (isDig(tl)) h += '<div class="sob-row ' + '"><span>Modo (R)</span><b>' + (S.mode === 'cut' ? 'Excavar' : 'Nivelar a ' + f(S.lvl, 2) + ' m') + '</b></div>';
        tl.params.forEach(function (p, i) { h += '<div class="sob-row' + (i === S.pa ? ' act' : '') + '" data-i="' + i + '"><span>' + p.n + '</span><button type="button" data-d="-1">−</button><b>' + pfmt(p, V[p.id]) + '</b><button type="button" data-d="1">+</button></div>'; });
        if (tl.params.length > 1) h += '<p class="sob-dim">C: siguiente parámetro · Shift+rueda o [ ]: cambiar</p>'; else if (tl.params.length) h += '<p class="sob-dim">Shift+rueda o [ ]: cambiar</p>';
        box.innerHTML = h;
        Array.prototype.forEach.call(box.querySelectorAll('.sob-row[data-i]'), function (row) { var i = +row.getAttribute('data-i'); row.onclick = function () { S.pa = i; drawParams(); }; Array.prototype.forEach.call(row.querySelectorAll('button'), function (b) { b.onclick = function (ev) { ev.stopPropagation(); S.pa = i; chVal(+b.getAttribute('data-d')); }; }); });
    }
    function selTool(i) { if (i < 0 || i >= TOOLS.length) return; S.tool = TOOLS[i]; S.pa = 0; S.anchor = null; drawHotbar(); }
    function cycleTool(d) { var i = TOOLS.indexOf(S.tool); if (i < 0) i = 0; if (S.wheelT && S.wheelT > Date.now() - 90) return; S.wheelT = Date.now(); selTool((i + d + TOOLS.length) % TOOLS.length); }
    function chVal(d) { var tl = S.tool; if (!tl.params.length) return; var p = tl.params[Math.min(S.pa, tl.params.length - 1)], pv = S.pv[tl.k] || (S.pv[tl.k] = {}); curVals(tl); pv[p.id] = Math.max(0, Math.min(p.vals.length - 1, pv[p.id] + d)); drawParams(); }

    function updateAim(dt) {
        var cam = S.cam, d = aimDir(), hit = pickRay(cam.position.x, cam.position.y, cam.position.z, d.x, d.y, d.z, 22);
        S.hit = hit; S.trial = null; var gh = S.ghost, ok = false, box = null, msg = '', tl = S.tool;
        if (S.ov || S.collapsed || S.mount) { gh.visible = false; S.anchorM.visible = false; return; }
        if (isGround(tl)) {
            if (hit) { var half = tl.k === 'pala' ? 0 : curVals(tl).half, c = C.cellOf(hit.p.x, hit.p.z); if (c) { var th = C.hAt(S.W, hit.p.x, hit.p.z); box = { r: [c[0] - HALF - half, c[1] - HALF - half, c[0] - HALF + half + 1, c[1] - HALF + half + 1], y0: th - 0.02, y1: th + 0.06 }; ok = dist(hit.p) <= REACH[tl.k]; msg = ok ? '' : 'Fuera de alcance (' + f(REACH[tl.k], 1) + ' m)'; } }
        } else if (hit) {
            var pl = plan(hit); S.trial = pl;
            if (pl.err) { msg = pl.err; box = pl.start ? null : null; if (!S.anchor && hit.p) box = { r: [sn(hit.p.x) - 0.2, sn(hit.p.z) - 0.2, sn(hit.p.x) + 0.2, sn(hit.p.z) + 0.2], y0: hit.p.y, y1: hit.p.y + 0.4 }; }
            else if (pl.act) { box = { r: pl.e.r, y0: pl.e.y0, y1: pl.e.y1 }; ok = true; msg = pl.act === 'bote' ? 'Clic para vaciar el bote aquí (' + f(S.W.bote ? S.W.bote.vol : 0, 2) + ' m³)' : pl.act === 'encof' ? (!pl.e.rebar ? 'Primero arma el acero' : (pl.e.form ? 'Ya encofrado' : 'Mantén el clic: encofrando ' + f(pl.e.fp * 100, 0) + ' %')) : pl.act === 'acero' ? (pl.e.rebar ? 'Acero ya armado' : 'Mantén el clic: armando acero ' + f(pl.e.rp * 100, 0) + ' %') : (pl.act === 'pump' ? 'Clic para vaciar con bomba: ' : 'Clic para desencofrar: ') + NAMES[pl.e.t]; S.trial.ok = true; }
            else if (pl.dem) { box = { r: pl.dem.r, y0: pl.dem.y0, y1: pl.dem.y1 }; ok = false; msg = 'Clic para demoler: ' + NAMES[pl.dem.t]; S.trial.ok = true; }
            else if (pl.start) { box = { r: [pl.start.x - 0.2, pl.start.z - 0.2, pl.start.x + 0.2, pl.start.z + 0.2], y0: (pl.start.top != null ? pl.start.top : hit.p.y), y1: (pl.start.top != null ? pl.start.top : hit.p.y) + 0.5 }; ok = true; msg = 'Clic para fijar el punto inicial.'; }
            else { var dry = C.add(S.W, pl.type, pl.p, { dry: true }); if (dry.ok) { ok = true; box = { r: dry.el.r, y0: dry.el.y0, y1: dry.el.y1 }; msg = 'Clic para colocar: ' + dims(dry.el); } else { msg = dry.msg; box = roughBox(pl, hit); } S.trial.ok = ok; }
        }
        if (box) { gh.visible = true; gh.position.set((box.r[0] + box.r[2]) / 2, (box.y0 + box.y1) / 2, (box.r[1] + box.r[3]) / 2); gh.scale.set(Math.max(0.05, box.r[2] - box.r[0]), Math.max(0.05, box.y1 - box.y0), Math.max(0.05, box.r[3] - box.r[1])); gh.material.color.setHex(isGround(tl) ? (ok ? (tl.k === 'comp' ? 0x7fd0ff : 0xf0a030) : 0x8a8a8a) : (tl.k === 'dem' ? 0xe5534b : (ok ? 0x35d07f : 0xe5534b))); } else gh.visible = false;
        if (S.anchor) { S.anchorM.visible = true; S.anchorM.position.set(S.anchor.x, (S.anchor.top != null ? S.anchor.top : C.hAt(S.W, S.anchor.x, S.anchor.z)) + 0.2, S.anchor.z); } else S.anchorM.visible = false;
        S.aimMsg = msg; S.aimOk = ok;
    }
    function slopeWarn(p) {
        var W = S.W, c = C.cellOf(p.x, p.z); if (!c) return null; var k = c[1] * N + c[0], best = 0, lim = 3, bd = 0;
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var i = c[0] + d[0], j = c[1] + d[1]; if (i < 0 || j < 0 || i >= N || j >= N) return; var k2 = j * N + i, hi = W.H[k] >= W.H[k2] ? k : k2, diff = Math.abs(W.H[k] - W.H[k2]), l = C.slopeLimit(W, hi); if (diff / l > best) { best = diff / l; lim = l; bd = diff; } });
        if (best > 1) return ['bad', '⚠ Talud inestable: ' + f(bd, 2) + ' m > ' + f(lim, 2) + ' m (se derrumbará)']; if (best > 0.8) return ['warn', '⚠ Talud de ' + f(bd, 2) + ' m (límite ≈ ' + f(lim, 1) + ' m): riesgo de derrumbe']; return null;
    }
    function aimText() {
        var W = S.W, hit = S.hit, box = $('#sobAim', ROOT), h = '';
        if (S.tool.k === 'bote') h += '<div>🪣 Bote: <b>' + f(W.bote ? W.bote.vol : 0, 2) + ' / ' + f(W.bote ? W.bote.cap : 0.15, 2) + ' m³</b></div>';
        if (!hit) { box.innerHTML = '<span class="sob-dim">Sin objetivo (acércate)</span>'; return; }
        var p = hit.p, nat = C.h0At(W, p.x, p.z), cur = C.hAt(W, p.x, p.z), dep = nat - cur;
        var sw0 = slopeWarn(hit.p); h += '<div class="sob-dim">x ' + f(p.x, 1) + ' · z ' + f(p.z, 1) + ' · cota ' + f(p.y, 2) + ' m</div>';
        if (hit.kind === 'terrain') { var lay = C.layerAt(W.site, dep < 0 ? -1 : dep + 0.001); h += '<div>Terreno: ' + (dep > 0.01 ? f(dep, 2) + ' m bajo el nivel natural' : (dep < -0.01 ? f(-dep, 2) + ' m sobre el natural (relleno)' : 'nivel natural')) + '</div><div class="sob-soil"><i style="background:#' + ('000000' + lay.col.toString(16)).slice(-6) + '"></i>' + esc(lay.n) + '</div>' + (sw0 ? '<div class="' + sw0[0] + '">' + sw0[1] + '</div>' : ''); }
        else if (hit.e) { var it = S.rep && S.rep.by[hit.e.id]; h += '<div><b>' + cap(NAMES[hit.e.t]) + '</b> #' + hit.e.id + ' · ' + dims(hit.e) + '</div>'; if (hit.e.vol != null && S.W.real) h += '<div class="sob-dim">🧱 ' + esc(C.stateOf(S.W, hit.e)) + ' · acero ' + f(hit.e.kg, 0) + ' kg · encofrado ' + f(hit.e.fa, 1) + ' m²</div>'; if (it) h += '<div class="st-' + it.status + '">' + (it.status === 'ok' ? '✔ ' : (it.status === 'warn' ? '⚠ ' : '✖ ')) + esc(it.msg) + '</div>'; }
        if (S.aimMsg) h += '<div class="' + (S.aimOk ? 'ok' : 'bad') + '">' + esc(S.aimMsg) + '</div>';
        box.innerHTML = h;
    }

    /* ---------- jugador ---------- */
    var PR = 0.28;
    function groundH(x, z, feet) { var m = -99, s = [[0, 0], [PR, 0], [-PR, 0], [0, PR], [0, -PR]], i; for (i = 0; i < s.length; i++) m = Math.max(m, C.groundAt(S.W, x + s[i][0], z + s[i][1], feet)); return m; }
    function blocked(x, z, feet) {
        if (hook('blocked', x, z, feet)) return true;
        var W = S.W, i, e, tm = -99, s = [[PR, PR], [-PR, PR], [PR, -PR], [-PR, -PR]];
        for (i = 0; i < 4; i++) tm = Math.max(tm, C.hAt(W, x + s[i][0], z + s[i][1])); if (tm > feet + 0.56) return true;
        for (i = 0; i < W.elems.length; i++) { e = W.elems[i]; if (e.t === 'tub' || e.t === 'tec' || e.t === 'pav') continue; if (x + PR > e.r[0] && x - PR < e.r[2] && z + PR > e.r[1] && z - PR < e.r[3] && e.y1 > feet + 0.56 && e.y0 < feet + 1.6) return true; }
        return false;
    }
    function move(dt) {
        var k = S.keys, fw = (k.KeyW || k.w ? 1 : 0) - (k.KeyS || k.s ? 1 : 0), st = (k.KeyD || k.d ? 1 : 0) - (k.KeyA || k.a ? 1 : 0), sp = (k.ShiftLeft || k.ShiftRight) ? (S.fly ? 0 : 9) : (S.fly ? 12 : 5);
        if (S.fly) sp = (k.ShiftLeft || k.ShiftRight) ? 12 : 12;
        var sy = Math.sin(S.yaw), cy = Math.cos(S.yaw), vx = (-sy * fw + cy * st), vz = (-cy * fw - sy * st), len = Math.hypot(vx, vz);
        if (k.ArrowLeft) S.yaw += 1.8 * dt; if (k.ArrowRight) S.yaw -= 1.8 * dt; if (k.ArrowUp) S.pitch = Math.min(1.5, S.pitch + 1.4 * dt); if (k.ArrowDown) S.pitch = Math.max(-1.5, S.pitch - 1.4 * dt);
        if (len > 0) { vx = vx / len * sp * dt; vz = vz / len * sp * dt; var nx = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, S.x + vx)), nz = Math.max(-HALF + 0.5, Math.min(HALF - 0.5, S.z + vz)); if (S.fly) { S.x = nx; S.z = nz; } else { if (!blocked(nx, S.z, S.feet)) S.x = nx; if (!blocked(S.x, nz, S.feet)) S.z = nz; } }
        var g = groundH(S.x, S.z, S.feet);
        if (S.fly) { var up = (k.Space ? 1 : 0) - ((k.ShiftLeft || k.ShiftRight) ? 1 : 0); S.feet += up * 8 * dt; S.vy = 0; if (S.feet < g) S.feet = g; }
        else { S.vy -= 22 * dt; S.feet += S.vy * dt; if (S.feet <= g) { S.feet = g; S.vy = 0; S.onG = true; } else S.onG = false; if (k.Space && S.onG) { S.vy = 7.2; S.onG = false; } }
        S.feet = Math.max(S.feet, -5.5); S.feet = Math.min(S.feet, 40);
        S.eye += ((S.feet + 1.7) - S.eye) * Math.min(1, dt * 16);
        var cam = S.cam; if (len > 0 && S.onG && !S.fly) S.bob = (S.bob || 0) + dt * sp * 1.8; cam.position.set(S.x, S.eye + (len > 0 && S.onG && !S.fly ? Math.sin(S.bob) * 0.035 : 0), S.z); cam.rotation.set(S.pitch, S.yaw, 0);
        if (S.shake > 0) { cam.position.x += (Math.random() - 0.5) * S.shake; cam.position.y += (Math.random() - 0.5) * S.shake; S.shake = Math.max(0, S.shake - dt * 0.6); }
    }

    /* ---------- colapso ---------- */
    function startCollapse(rep) {
        var items = []; Object.keys(rep.fall).forEach(function (id) { var g = S.meshes[id]; if (!g) return; var fail = rep.by[id] && rep.by[id].status === 'fail'; items.push({ g: g, e: g.userData.e, delay: fail ? Math.random() * 0.3 : 0.8 + Math.random() * 0.9, vy: 0, vx: (Math.random() - 0.5) * 1.5, vz: (Math.random() - 0.5) * 1.5, rx: (Math.random() - 0.5) * 2.6, rz: (Math.random() - 0.5) * 2.6, done: false }); });
        S.anim = { t: 0, items: items }; S.shake = 0.35; sfx('collapse');
        items.forEach(function (it) { it.g.userData.mats.forEach(function (o) { o.m.color.setHex(0x8a4a42); }); });
    }
    function stepCollapse(dt) {
        var A = S.anim; if (!A) return; A.t += dt; var all = true;
        A.items.forEach(function (it) {
            if (it.done) return; if (A.t < it.delay) { all = false; return; }
            it.vy -= 12 * dt; var g = it.g, e = it.e; g.position.y += it.vy * dt; g.position.x += it.vx * dt; g.position.z += it.vz * dt; g.rotation.x += it.rx * dt; g.rotation.z += it.rz * dt;
            var floor = C.hAt(S.W, g.position.x, g.position.z) + Math.min(0.25, (e.y1 - e.y0) / 2); if (g.position.y <= floor) { g.position.y = floor; it.done = true; S.shake = Math.max(S.shake, 0.08); puff({ x: g.position.x, y: floor, z: g.position.z }, 12, 0xc8c4bc); } else all = false;
        });
        if (all || A.t > 6) { S.anim = null; S.collapsed = true; showOverlay('collapse'); }
    }

    /* ---------- overlays ---------- */
    function showOverlay(mode) {
        var ov = $('#sobOv', ROOT); S.ov = mode; if (!mode) { ov.className = 'sob-ov'; ov.innerHTML = ''; return; }
        if (global.document.pointerLockElement) global.document.exitPointerLock();
        ov.className = 'sob-ov show'; var h = '';
        if (mode === 'missions') h = missionsHtml(); else if (mode === 'help') h = helpHtml(); else if (mode === 'pause') h = pauseHtml(); else if (mode === 'report') h = reportHtml(); else if (mode === 'collapse') h = collapseHtml(); else if (mode === 'win') h = winHtml();
        ov.innerHTML = '<div class="sob-box">' + h + '</div>'; wireOverlay(ov);
    }
    function missionsHtml() {
        var pr = loadProgress(), cards = Object.keys(C.MISSIONS).map(function (id) { var m = C.MISSIONS[id]; return '<button type="button" class="sob-mc" data-m="' + id + '"><b>' + m.ico + '</b><h4>' + esc(m.n) + '</h4><p>' + esc(m.desc) + '</p><div class="sob-dim">' + (m.budget ? 'Presupuesto ' + money(m.budget) : 'Sin presupuesto') + ' · ' + esc(C.SITES[m.site].n.split('(')[0]) + '</div><div class="sob-stars">' + stars(pr[id] || 0) + '</div></button>'; }).join('');
        return '<div class="sob-ttl"><h2>🏗️ Simulador de Obra 3D</h2><p>Camina por el lote, excava, cimenta y construye. Cada elemento se verifica con modelos simplificados (capacidad de carga, ACI 318 / NSR-10, Rankine). Si algo falla, <b>la obra colapsa</b>.</p></div><div class="sob-mg">' + cards + '</div><div class="sob-foot"><span class="sob-dim">Modo libre: elige el suelo →</span><button type="button" class="sob-b" data-s="firme">Suelo firme</button><button type="button" class="sob-b" data-s="blando">Suelo blando</button><button type="button" class="sob-b sec" data-act="help">❓ Controles</button><button type="button" class="sob-b sec" data-act="exit">Salir</button></div><p class="sob-dim sob-note">Uso educativo. No sustituye un diseño firmado por un ingeniero.</p>';
    }
    function helpHtml() {
        return '<div class="sob-ttl"><h2>❓ Controles</h2></div><div class="sob-help"><div><b>W A S D</b> mover · <b>ratón</b> mirar · <b>Espacio</b> saltar · <b>Shift</b> correr</div><div><b>F</b> volar (Espacio sube, Shift baja) · <b>P</b> volver al inicio</div><div><b>Rueda del ratón</b> elegir herramienta (pala → asistida → compactar → zapata…) · <b>Clic izq.</b> usar · <b>Clic der.</b> rellenar / cancelar trazo</div><div><b>Shift + rueda</b> o <b>[ ]</b> cambiar valor · <b>C</b> siguiente parámetro · <b>R</b> modo pala/excavadora (excavar / nivelar) · <b>N</b> sonido</div><div><b>🏗️ Obra realista:</b> cada zapata/cimiento/columna/viga/losa nace como <b>encofrado + acero</b>, sin concreto. Vacíalo con el <b>mixer / trompo</b> (apunta la canaleta sobre el encofrado) o con la herramienta <b>Bomba</b> (antes <b>arma el acero</b> con <b>Acero</b> y luego <b>encofra</b> con <b>Encofrar</b>, manteniendo el clic; donde no llega el mixer usa el <b>Bote</b>: llénalo en el trompo con G y vacíalo con clic en el encofrado); el concreto <b>fragua solo: 1 minuto real = 28 días</b> (<b>B</b> +1 día, <b>Shift+B</b> +7 para acelerar) y <b>desencofra</b> (zap. 2 d · col. 3 d · vigas/losas 14 d). Sobre un apoyo debes esperar ≥ 1 día. <b>K</b> alterna modo realista / simplificado.</div><div><b>U</b> deshacer · <b>V</b> colorear por estado (verde/amarillo/rojo) · <b>T</b> informe y entrega de obra</div><div><b>M</b> misiones · <b>H</b> ayuda · <b>Esc</b> pausa (libera el ratón)</div><h4>🚜 Excavadora (junto al lote)</h4><div>Acércate y pulsa <b>E</b> para subir. <b>W/S</b> avanzar · <b>A/D</b> girar · <b>Espacio</b> freno · <b>↑↓</b> brazo principal · <b>←→</b> brazo secundario · <b>Q/R</b> cerrar/abrir cucharón · <b>Z/X</b> girar la torre · <b>C</b> cámara (cabina / operación / exterior) · <b>E</b> bajar · <b>Y</b> reubicarla. Clava los dientes en el suelo y empuja o cierra el cucharón para llenarlo (1 m³); gira, vuélcalo con <b>R</b> y forma un montículo.</div><h4>🚜 Retroexcavadora (amarilla, a la izquierda)</h4><div>Acércate y pulsa <b>E</b>. <b>W/S</b> avanzar · <b>A/D</b> girar · <b>Espacio</b> freno · <b>F</b> estabilizadores · <b>G</b> cambiar el control entre la <b>PALA</b> delantera y la <b>RETRO</b> trasera (al pasar a la retro baja los estabilizadores). Los mismos controles mueven la parte activa: las flechas van invertidas: con la PALA, <b>↓</b> sube los brazos y <b>↑</b> los baja, y <b>←</b> (o <b>Q</b>) recoge y <b>→</b> (o <b>R</b>) vuelca; con la RETRO, <b>↓/↑</b> boom (sube/baja) · <b>←/→</b> balancín (recoge/extiende) · <b>Q/R</b> cuchara · <b>Z/X</b> girar. <b>C</b> cámara · <b>E</b> bajar.</div><h4>🚛 Hormigonado: mixer y trompo</h4><div><b>Camión mixer</b> (azul, a la izquierda): <b>E</b> sube · <b>W S A D</b> conducir · mantén <b>Q</b> para verter hormigón por la canaleta (<b>← →</b> la giran, <b>↑ ↓</b> la suben/bajan) · <b>Z</b> detiene/enciende el tambor · <b>C</b> cámara. Retrocede con la tolva trasera bajo la <b>planta dosificadora</b> (aro amarillo) para recargar sus 6 m³. <b>Mezcladora de trompo</b> (naranja): acércate, <b>E</b> la enciende (mezcla 6 s) y mantén <b>G</b> para volcar el tambor y verter. El hormigón vertido se cobra por m³.</div><h4>Orden de obra (casa)</h4><ol><li>Excava con la <b>pala</b> (manual, lenta) o la <b>excavadora</b> (rápida, con alcance) bajo la capa vegetal (≥ 0.8 m) y <b>nivela</b> el fondo. Ojo con los taludes: si son muy empinados, se derrumban.</li><li>Zapatas en el fondo → columnas → vigas (a la misma altura) → losa → muros → techo.</li><li>Rellena la excavación con la tierra acopiada y <b>compáctala</b> (el relleno suelto soporta poco).</li><li>Pulsa <b>T</b>: revisa el informe y entrega la obra. Si algo falla, colapsa.</li></ol><p class="sob-dim">Sin ratón capturado: arrastra con el botón derecho para mirar y usa las flechas del teclado.</p></div><div class="sob-foot"><button type="button" class="sob-b" data-act="back">Volver</button></div>';
    }
    function pauseHtml() { return '<div class="sob-ttl"><h2>⏸ Pausa</h2></div><div class="sob-foot col"><button type="button" class="sob-b" data-act="resume">▶ Continuar</button><button type="button" class="sob-b sec" data-act="report">📋 Informe de obra</button><button type="button" class="sob-b sec" data-act="help">❓ Controles</button><button type="button" class="sob-b sec" data-act="missions">🗺️ Misiones / reiniciar</button><button type="button" class="sob-b sec" data-act="exit">Salir al menú</button></div>'; }
    function itemRows(rep, W) {
        var by = { fail: [], warn: [], ok: [] }; rep.items.forEach(function (o) { by[o.status].push(o); });
        function row(o) { var e = W.elems.filter(function (z) { return z.id === o.id; })[0]; return '<li class="st-' + o.status + '"><b>' + (o.status === 'ok' ? '✔' : (o.status === 'warn' ? '⚠' : '✖')) + ' ' + cap(NAMES[o.t]) + ' #' + o.id + '</b>' + (e ? ' <span class="sob-dim">' + dims(e) + '</span>' : '') + '<div>' + esc(o.msg) + '</div></li>'; }
        return (by.fail.length ? '<h4 class="st-fail">Fallas (' + by.fail.length + ')</h4><ul class="sob-list">' + by.fail.map(row).join('') + '</ul>' : '') + (by.warn.length ? '<h4 class="st-warn">Alertas (' + by.warn.length + ')</h4><ul class="sob-list">' + by.warn.map(row).join('') + '</ul>' : '') + (by.ok.length ? '<details><summary class="st-ok">Elementos correctos (' + by.ok.length + ')</summary><ul class="sob-list">' + by.ok.map(row).join('') + '</ul></details>' : '');
    }
    function reportHtml() {
        refreshAn(true); var W = S.W, ms = S.ms, rep = S.rep, ob = ms.objs.map(function (o) { return '<li class="' + (o.ok ? 'ok' : '') + '"><span>' + (o.ok ? '✔' : '○') + '</span>' + esc(o.text) + (o.extra ? ' <em>' + esc(o.extra) + '</em>' : '') + '</li>'; }).join('');
        var det = Object.keys(rep.cost.det).map(function (k) { return k + ' ' + money(rep.cost.det[k]); }).join(' · ');
        return '<div class="sob-ttl"><h2>📋 Informe de obra</h2><p>' + W.mission.ico + ' ' + esc(W.mission.n) + ' · ' + W.elems.length + ' elementos · Costo <b class="' + (ms.budget && ms.cost > ms.budget ? 'bad' : '') + '">' + money(ms.cost) + '</b>' + (ms.budget ? ' de ' + money(ms.budget) : '') + '</p><p class="sob-dim">' + esc(det) + '</p></div>' + (ob ? '<ul class="sob-obj">' + ob + '</ul>' : '') + (W.elems.length ? itemRows(rep, W) : '<p>Aún no hay elementos.</p>') + '<div class="sob-foot"><button type="button" class="sob-b" data-act="back">Seguir construyendo</button><button type="button" class="sob-b go" data-act="deliver">🏁 Entregar y probar la obra</button></div>';
    }
    function collapseHtml() {
        var rep = S.pre && S.pre.rep, W = S.W, fails = rep ? rep.items.filter(function (o) { return o.status === 'fail'; }) : [], n = rep ? Object.keys(rep.fall).length : 0;
        return '<div class="sob-ttl bad"><h2>💥 ¡La obra colapsó!</h2><p>Fallaron ' + fails.length + ' elemento(s) y por pérdida de apoyo cayeron ' + n + ' en total. Revisa las causas, restaura la obra y corrige el diseño.</p></div><ul class="sob-list">' + fails.slice(0, 12).map(function (o) { return '<li class="st-fail"><b>✖ ' + cap(NAMES[o.t]) + ' #' + o.id + '</b><div>' + esc(o.msg) + '</div></li>'; }).join('') + '</ul><div class="sob-foot"><button type="button" class="sob-b go" data-act="restore">↩ Restaurar obra y corregir</button><button type="button" class="sob-b sec" data-act="missions">Reiniciar misión</button></div>';
    }
    function winHtml() {
        var ms = S.ms, W = S.W, pass = ms.done; saveProgress(W.mission.id, ms.stars);
        return '<div class="sob-ttl ' + (pass ? 'ok' : '') + '"><h2>' + (pass ? '🏆 ¡Obra entregada!' : '✔ La obra resiste') + '</h2><p>' + (pass ? 'Cumpliste los objetivos de la misión.' : 'La estructura resiste la carga de servicio, pero aún no cumples todos los objetivos.') + '</p><div class="sob-big">' + stars(ms.stars) + '</div><p class="sob-dim">★ objetivos · ★ dentro del presupuesto · ★ sin alertas. Costo ' + money(ms.cost) + (ms.budget ? ' de ' + money(ms.budget) : '') + '.</p></div>' + (ms.objs.length ? '<ul class="sob-obj">' + ms.objs.map(function (o) { return '<li class="' + (o.ok ? 'ok' : '') + '"><span>' + (o.ok ? '✔' : '○') + '</span>' + esc(o.text) + '</li>'; }).join('') + '</ul>' : '') + '<div class="sob-foot"><button type="button" class="sob-b" data-act="back">Seguir construyendo</button><button type="button" class="sob-b sec" data-act="missions">Otra misión</button></div>';
    }
    function wireOverlay(ov) {
        Array.prototype.forEach.call(ov.querySelectorAll('[data-m]'), function (b) { b.onclick = function () { startMission(b.getAttribute('data-m'), null); }; });
        Array.prototype.forEach.call(ov.querySelectorAll('[data-s]'), function (b) { b.onclick = function () { startMission('libre', b.getAttribute('data-s')); }; });
        Array.prototype.forEach.call(ov.querySelectorAll('[data-act]'), function (b) { b.onclick = function () { act(b.getAttribute('data-act')); }; });
    }
    function act(a) {
        if (a === 'exit') return close();
        if (a === 'help') return showOverlay('help');
        if (a === 'missions') return showOverlay('missions');
        if (a === 'report') return showOverlay('report');
        if (a === 'back') { if (!S.W.elems && !S.started) return; showOverlay(null); return lock(); }
        if (a === 'resume') { showOverlay(null); return lock(); }
        if (a === 'restore') { if (S.pre) { restoreW(S.pre.snap); S.pre = null; } S.collapsed = false; showOverlay(null); return lock(); }
        if (a === 'deliver') return deliver();
    }
    function deliver() {
        refreshAn(true); var rep = S.rep; showOverlay(null);
        if (!S.W.elems.length) return toast('Construye algo antes de entregar.', 'warn');
        if (rep.fails > 0 || Object.keys(rep.fall).length) { S.pre = { snap: snapW(), rep: rep }; startCollapse(rep); toast('Aplicando carga de servicio…', 'warn'); lock(); }
        else { showOverlay('win'); }
    }

    /* ---------- ciclo de vida ---------- */
    function lock() { var cv = $('#sobCanvas', ROOT); if (!cv || !cv.requestPointerLock) return; try { var p = cv.requestPointerLock(); if (p && p.catch) p.catch(function () { }); } catch (e) { } }
    function startMission(id, siteKey) {
        showOverlay(null); var keep = S && S.R ? { R: S.R, scene: S.scene, cam: S.cam, sun: S.sun, gTerr: S.gTerr, gEl: S.gEl, gDeco: S.gDeco, ghost: S.ghost, anchorM: S.anchorM, tex: S.tex, pf: S.pf, vm: S.vm, mute: S.mute, waterM: S.waterM, terrMat: S.terrMat, raf: S.raf } : null;
        var old = S; S = newState(id, siteKey); if (keep) Object.assign(S, keep); S.pv = old && old.pv ? old.pv : {};
        var m = S.W.mission; S.x = 0; S.z = 14; S.yaw = 0; S.pitch = -0.2; S.feet = C.groundAt(S.W, S.x, S.z, 5); S.eye = S.feet + 1.7;
        S.terr = null; while (S.gTerr.children.length) { var tc = S.gTerr.children.pop(); if (tc.geometry) tc.geometry.dispose(); }
        S.meshes = {}; while (S.gEl.children.length) { var o = S.gEl.children.pop(); o.traverse(function (x) { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); }
        dirtyAll(); buildTerrain(); buildElems(); S.tDirty = S.eDirty = false; refreshAn(true); drawHotbar();
        hook('world', S); $('#sobClick', ROOT).classList.add('show'); toast(m.ico + ' ' + m.n + ' — ' + (m.hint || 'Construye lo que quieras.'));
    }
    function updateVM(dt) {
        var V = S.vm; if (!V) return; var k = S.tool.k, hide = S.ov || S.collapsed || S.mount; V.pala.visible = !hide && k === 'pala'; V.exc.visible = !hide && k === 'exc'; V.comp.visible = !hide && k === 'comp';
        S.vmT = Math.max(0, (S.vmT || 0) - dt * 2.6); var sw = Math.sin(S.vmT * Math.PI), sway = Math.sin((S.bob || 0)) * 0.012;
        V.pala.rotation.x = -0.45 - sw * 0.9; V.pala.position.y = -0.36 + sway; V.exc.rotation.x = sw * 0.55; V.exc.position.y = -0.52 + sway; V.comp.position.y = -0.56 + sw * 0.1 + sway;
    }
    function frame(ts) {
        if (!S || !ROOT || !ROOT.classList.contains('open')) return; S.raf = requestAnimationFrame(frame);
        var dt = Math.min(0.1, (ts - (S.last || ts)) / 1000); S.last = ts;
        if (!S.ov && !S.mount) move(dt); else if (!S.mount) { S.cam.position.set(S.x, S.eye, S.z); S.cam.rotation.set(S.pitch, S.yaw, 0); }
        hook('frame', dt);
        if ((S.btn[0] || S.btn[2]) && isGround(S.tool) && !S.mount) { S.digT -= dt; if (S.digT <= 0) { S.digT = S.tool.k === 'exc' ? 0.42 : (S.tool.k === 'comp' ? 0.3 : 0.32); digTick(); } }
        if (S.tDirty) { S.tDirty = false; buildTerrain(); }
        S.W.bote = S.W.bote || { vol: 0, cap: 0.15 }; S.W.bote.on = S.tool.k === 'bote' && !S.mount;
        if (S.W.real && !S.ov && !S.collapsed) {
            S.dayAcc = (S.dayAcc || 0) + dt;
            if (S.dayAcc >= 0.5) { C.advance(S.W, S.dayAcc * 28 / 60); S.dayAcc = 0; S.anDirty = true; }
            if ((S.tool.k === 'acero' || S.tool.k === 'encof') && S.btn[0] && S.hit && S.hit.e && S.hit.e.vol != null && !S.mount && (S.tool.k === 'acero' ? !S.hit.e.rebar : !S.hit.e.form)) {
                var ra = S.tool.k === 'acero' ? C.armar(S.W, S.hit.e.id, dt) : C.encofrar(S.W, S.hit.e.id, dt); if (ra.done && ra.ok) { toast((S.tool.k === 'acero' ? '🔩 ' : '📦 ') + ra.msg, 'ok'); S.eDirty = S.anDirty = true; } else if (!ra.ok && !ra.done && (S.armWarn || 0) < Date.now() - 1500) { S.armWarn = Date.now(); toast(ra.msg, 'warn'); }
            }
        }
        S.sigT = (S.sigT || 0) - dt; if (S.sigT <= 0) { S.sigT = 0.2; var sg = S.W.elems.map(function (e) { return e.vol == null ? 0 : (e.form ? 1 : 0) + ':' + (e.rebar ? 1 : Math.round(e.rp * 10)) + ':' + (e.form ? 10 : Math.round((e.fp || 0) * 10)) + ':' + Math.round(e.pv / e.vol * 20) + ':' + (e.dmg ? 1 : 0); }).join(','); if (sg !== S.sig) { S.sig = sg; S.eDirty = S.anDirty = true; } }
        if (S.eDirty) { S.eDirty = false; buildElems(); }
        if (S.anim) stepCollapse(dt);
        stepPuff(dt); updateVM(dt); refreshAn(false); updateAim(dt);
        S.aimT -= dt; if (S.aimT <= 0) { S.aimT = 0.12; aimText(); }
        S.R.render(S.scene, S.cam);
    }
    function open() {
        if (ROOT && ROOT.classList.contains('open')) return;
        loadThree(function (err) {
            if (err) { global.alert && global.alert('No se pudo cargar el motor 3D (three.js). Revisa tu conexión.'); return; }
            if (!ROOT) buildRoot(); ROOT.classList.add('open'); doc.body.classList.add('sob-open');
            if (!S || !S.R) { S = newState('libre', 'firme'); initScene(); }
            S.ov = null; showOverlay('missions'); resize(); cancelAnimationFrame(S.raf); S.last = 0; S.raf = requestAnimationFrame(frame);
            if (!S.terr) { startMission('libre', 'firme'); showOverlay('missions'); }
        });
    }
    function close() {
        hook('close'); if (doc.pointerLockElement) doc.exitPointerLock(); if (!ROOT) return; ROOT.classList.remove('open'); doc.body.classList.remove('sob-open'); showOverlay(null);
        if (S) { cancelAnimationFrame(S.raf); try { S.R.dispose(); } catch (e) { }       /* sin forceContextLoss: el mismo canvas se reutiliza al reabrir y un contexto perdido dejaba la pantalla en blanco */ S = null; }
    }

    /* ---------- entrada ---------- */
    function buildRoot() {
        ROOT = el('div', 'sob'); ROOT.id = 'sobRoot';
        ROOT.innerHTML = '<canvas id="sobCanvas"></canvas><div class="sob-hud"><div class="sob-cross"></div><div id="sobMis" class="sob-p tl"></div><div id="sobStat" class="sob-p tr"></div><div id="sobPar" class="sob-p rm"></div><div id="sobAim" class="sob-p bl"></div><div id="sobBar" class="sob-bar"></div><div id="sobToast" class="sob-toast"></div><div id="sobClick" class="sob-click">🖱️ Haz clic para jugar<small>Esc libera el ratón · H ayuda</small></div><button type="button" class="sob-menu" id="sobMenuBtn">☰ Menú</button></div><div id="sobOv" class="sob-ov"></div>';
        doc.body.appendChild(ROOT);
        var cv = $('#sobCanvas', ROOT);
        $('#sobMenuBtn', ROOT).onclick = function () { showOverlay('pause'); };
        cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });
        cv.addEventListener('mousedown', function (e) {
            if (!S || S.ov) return; $('#sobClick', ROOT).classList.remove('show');
            if (doc.pointerLockElement !== cv && !S.triedLock) { S.triedLock = true; lock(); return; }
            S.btn[e.button] = true; if (S.mount) return; if (e.button === 0) S.lvlSet = null;
            if (isGround(S.tool)) { if (!S.collapsed) { pushUndo(); S.digT = 0; } } else useTool(e.button);
        });
        global.addEventListener('mouseup', function (e) { if (S) { S.btn[e.button] = false; if (e.button === 0) S.lvlSet = null; } });
        global.addEventListener('mousemove', function (e) { if (!S || S.ov || !ROOT.classList.contains('open')) return; if (S.mount) { if (doc.pointerLockElement === cv || S.btn[2]) hook('mouse', e.movementX, e.movementY); return; } if (doc.pointerLockElement === cv || S.btn[2] && doc.pointerLockElement !== cv) { S.yaw -= e.movementX * 0.0024; S.pitch = Math.max(-1.55, Math.min(1.55, S.pitch - e.movementY * 0.0024)); } });
        cv.addEventListener('wheel', function (e) { if (!S || S.ov) return; e.preventDefault(); if (S.mount) { hook('wheel', e.deltaY); return; } var dy = e.deltaY || e.deltaX; if (!dy) return; if (e.shiftKey) chVal(dy < 0 ? 1 : -1); else cycleTool(dy > 0 ? 1 : -1); }, { passive: false });
        doc.addEventListener('pointerlockchange', function () { if (!S || !ROOT.classList.contains('open')) return; if (doc.pointerLockElement === cv) { $('#sobClick', ROOT).classList.remove('show'); } else if (!S.ov && !S.anim) { S.btn = {}; S.keys = {}; showOverlay('pause'); } });
        global.addEventListener('resize', resize);
        global.addEventListener('keydown', function (e) {
            if (!S || !ROOT.classList.contains('open')) return; var tg = e.target && e.target.tagName; if (tg === 'INPUT' || tg === 'TEXTAREA') return;
            var code = e.code, key = e.key;
            if (S.ov) { if (code === 'Escape' && (S.ov === 'help' || S.ov === 'report' || S.ov === 'win')) { e.preventDefault(); showOverlay(null); lock(); } return; }
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(code) >= 0) e.preventDefault();
            S.keys[code] = true;
            if (hook('key', e)) return;
            
            switch (code) {
                case 'KeyF': S.fly = !S.fly; S.vy = 0; toast(S.fly ? '🕊️ Vuelo activado (Espacio sube, Shift baja)' : 'Vuelo desactivado'); break;
                case 'KeyC': if (S.tool.params.length) { S.pa = (S.pa + 1) % S.tool.params.length; drawParams(); } break;
                case 'KeyR': if (isDig(S.tool)) { S.mode = S.mode === 'cut' ? 'level' : 'cut'; drawParams(); toast(S.mode === 'cut' ? 'Modo excavar' : 'Modo nivelar: el primer clic fija la cota; arrastra para igualar.'); } break;
                case 'KeyU': undo(); break; case 'KeyN': S.mute = !S.mute; toast(S.mute ? '🔇 Sonido apagado' : '🔊 Sonido activado'); break;
                case 'KeyV': S.showAn = !S.showAn; tint(); toast(S.showAn ? 'Colores por estado: verde OK · amarillo alerta · rojo falla' : 'Colores de material'); break;
                case 'KeyB': { var dd = e.shiftKey ? 7 : 1; C.advance(S.W, dd); S.anDirty = S.eDirty = true; toast('📅 Día ' + f(S.W.day, 0) + ' de obra (+' + dd + ' d): el concreto sigue curando.'); break; }
                case 'KeyK': { S.W.real = !S.W.real; if (!S.W.real) C.setReal(S.W, false); S.eDirty = S.anDirty = true; toast(S.W.real ? '🏗️ Modo REALISTA: encofrado, acero, vaciado y curado.' : '⚡ Modo SIMPLIFICADO: los elementos nacen vaciados y curados.'); break; }
                case 'KeyT': showOverlay('report'); break;
                case 'KeyM': showOverlay('missions'); break;
                case 'KeyH': showOverlay('help'); break;
                case 'KeyP': S.x = 0; S.z = 14; S.feet = C.groundAt(S.W, S.x, S.z, 8) + 0.1; S.vy = 0; break;
                case 'BracketLeft': chVal(-1); break; case 'BracketRight': chVal(1); break;
                case 'Escape': if (!doc.pointerLockElement) showOverlay('pause'); break;
            }
        });
        global.addEventListener('keyup', function (e) { if (S) S.keys[e.code] = false; });
        global.addEventListener('blur', function () { if (S) { S.keys = {}; S.btn = {}; } });
    }

    /* ---------- tarjeta de menú ---------- */
    function mountCard() {
        var old = $('#sobMenuCard'); if (old && old.parentNode) old.parentNode.removeChild(old);
        var out = $('#btnCerrarSesion'); if (!out || $('#sobMenuItem')) return;
        var b = el('button', 'menu-user-item', '🏗️ Simulador de Obra 3D'); b.id = 'sobMenuItem'; b.type = 'button';
        b.onclick = function (ev) { ev.stopPropagation(); var dd = $('#menuUserDropdown'), tr = $('#btnMenuUsuario'); if (dd) dd.hidden = true; if (tr) tr.setAttribute('aria-expanded', 'false'); open(); };
        out.parentNode.insertBefore(b, out);
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { setTimeout(mountCard, 150); }); else setTimeout(mountCard, 150);

    global.GMObra = { open: open, close: close, hooks: HOOKS, api: { S: function () { return S; }, ROOT: function () { return ROOT; }, toast: function (m, k) { toast(m, k); }, puff: function (p, n, c) { puff(p, n, c); }, sfx: function (k) { sfx(k); }, dirtyTerrain: function () { if (S) S.tDirty = S.anDirty = true; }, blocked: function (x, z, f) { return blocked(x, z, f); } }, _test: {
        state: function () { return S; }, start: startMission, rebuild: function () { dirtyAll(); }, tools: TOOLS, deliver: deliver, snap: snapW, undo: undo, showOverlay: showOverlay, selTool: selTool, useTool: useTool, plan: plan, move: move
    } };
})(typeof window !== 'undefined' ? window : globalThis);
