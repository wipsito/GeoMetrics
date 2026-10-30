/**
 * GeoMetrics — Laboratorio 3D · Estructuras I
 * Modelos físicos paramétricos para: viga, voladizo, cercha Pratt, pórtico y viga continua.
 * Mismo lenguaje visual del laboratorio 3D de Suelos I/II (escenario, luces, etiquetas y pasos).
 *
 * API:  EstruLab3D.mount(host, id, opts) -> { dispose(), refresh() }
 *       EstruLab3D.disposeAll()
 */
(function (global) {
    'use strict';

    var doc = global.document;
    var T = null;
    var THREE_SRCS = [
        'js/vendor/three.min.js',
        'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r147/three.min.js',
        'https://unpkg.com/three@0.147.0/build/three.min.js'
    ];
    var threePromise = null;
    var INSTANCES = [];

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = doc.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = function () { resolve(); };
            s.onerror = function () { reject(new Error('No se pudo cargar ' + src)); };
            doc.head.appendChild(s);
        });
    }
    function ensureThree() {
        if (global.THREE) { T = global.THREE; return Promise.resolve(T); }
        if (threePromise) return threePromise;
        threePromise = new Promise(function (resolve, reject) {
            var i = 0;
            function next() {
                if (i >= THREE_SRCS.length) { reject(new Error('No se pudo cargar Three.js.')); return; }
                loadScript(THREE_SRCS[i++]).then(function () {
                    if (global.THREE) { T = global.THREE; resolve(T); }
                    else next();
                }).catch(next);
            }
            next();
        });
        return threePromise;
    }

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function fmt(v, d) {
        if (v == null || !isFinite(v)) return '—';
        return Number(v).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    function num(v) { return isFinite(+v) ? +v : 0; }

    /* ---------------------------- materiales ---------------------------- */
    var MAT_INFO = {
        acero: { color: 0x8FA0B0, metalness: 0.72, roughness: 0.3 },
        concreto: { color: 0x7D8B9A, metalness: 0.04, roughness: 0.9 },
        madera: { color: 0xA57A55, metalness: 0.04, roughness: 0.78 },
        aluminio: { color: 0xB6C3CE, metalness: 0.85, roughness: 0.22 }
    };
    var STEEL = { color: 0x8FA3B8, metalness: 0.75, roughness: 0.3 };
    var STEEL_DARK = { color: 0x46566B, metalness: 0.55, roughness: 0.48 };
    var CONCRETE = { color: 0x94A3B8, metalness: 0.03, roughness: 0.92 };

    function standard(info, extra) {
        var o = { color: info.color, metalness: info.metalness, roughness: info.roughness };
        if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
        return new T.MeshStandardMaterial(o);
    }
    function solid(color, opacity) {
        return new T.MeshBasicMaterial({ color: color, transparent: opacity != null, opacity: opacity == null ? 1 : opacity, side: T.DoubleSide });
    }
    function matOf(P) {
        var info = MAT_INFO[P.mat] || MAT_INFO.concreto;
        return standard(info);
    }

    /* ---------------------------- geometría ---------------------------- */
    function addBox(parent, w, h, d, x, y, z, material, cast) {
        var m = new T.Mesh(new T.BoxGeometry(Math.max(0.001, w), Math.max(0.001, h), Math.max(0.001, d)), material);
        m.position.set(x || 0, y || 0, z || 0);
        m.castShadow = cast !== false; m.receiveShadow = true;
        parent.add(m); return m;
    }
    function addCyl(parent, rt, rb, h, x, y, z, material, axis, seg) {
        var m = new T.Mesh(new T.CylinderGeometry(Math.max(0.001, rt), Math.max(0.001, rb), Math.max(0.001, h), seg || 20), material);
        m.position.set(x || 0, y || 0, z || 0);
        if (axis === 'x') m.rotation.z = Math.PI / 2;
        else if (axis === 'z') m.rotation.x = Math.PI / 2;
        m.castShadow = true; m.receiveShadow = true;
        parent.add(m); return m;
    }
    function addEdges(mesh, color, opacity) {
        if (!mesh || !mesh.geometry) return null;
        var e = new T.LineSegments(new T.EdgesGeometry(mesh.geometry), new T.LineBasicMaterial({
            color: color == null ? 0x0B1220 : color,
            transparent: true, opacity: opacity == null ? 0.22 : opacity
        }));
        mesh.add(e); return e;
    }
    function strut(parent, a, b, thick, material, depth) {
        var dir = new T.Vector3().subVectors(b, a);
        var len = dir.length();
        if (len < 1e-5) return null;
        var m = new T.Mesh(new T.BoxGeometry(len, thick, depth || thick), material);
        m.position.copy(a).add(b).multiplyScalar(0.5);
        m.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), dir.normalize());
        m.castShadow = true; m.receiveShadow = true;
        parent.add(m); return m;
    }
    function addTube(parent, points, radius, material, seg) {
        var curve = new T.CatmullRomCurve3(points);
        var m = new T.Mesh(new T.TubeGeometry(curve, seg || 48, radius, 8, false), material);
        m.castShadow = true; m.receiveShadow = true;
        parent.add(m); return m;
    }
    function arrow3D(parent, from, to, color, radius, material) {
        var dir = new T.Vector3().subVectors(to, from);
        var len = dir.length();
        if (len < 1e-5) return null;
        var g = new T.Group();
        g.position.copy(from);
        var head = Math.min(len * 0.32, 0.26);
        var shaft = Math.max(0.02, len - head);
        var m = material || new T.MeshStandardMaterial({ color: color, metalness: 0.25, roughness: 0.45, emissive: color, emissiveIntensity: 0.16 });
        var sh = new T.Mesh(new T.CylinderGeometry(radius, radius, shaft, 10), m);
        sh.position.y = shaft / 2; sh.castShadow = true;
        var hd = new T.Mesh(new T.ConeGeometry(radius * 3.1, head, 12), m);
        hd.position.y = shaft + head / 2; hd.castShadow = true;
        g.add(sh); g.add(hd);
        g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
        parent.add(g); return g;
    }
    function makeLabel(text, color, scale) {
        var pad = 16, font = '700 28px Inter, Arial, sans-serif';
        var c = doc.createElement('canvas');
        var ctx = c.getContext('2d');
        ctx.font = font;
        var tw = Math.ceil(ctx.measureText(text).width);
        c.width = tw + pad * 2; c.height = 54;
        ctx = c.getContext('2d');
        ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(11,18,32,.86)';
        var r = 18, w = c.width, h = c.height;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(1, 1, w - 2, h - 2, r); else ctx.rect(1, 1, w - 2, h - 2);
        ctx.fill();
        ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = color; ctx.fillText(text, w / 2, h / 2 + 1);
        var tex = new T.CanvasTexture(c);
        tex.minFilter = T.LinearFilter; tex.magFilter = T.LinearFilter; tex.needsUpdate = true;
        var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
        var k = scale || 1;
        sp.scale.set(w / 110 * k, h / 110 * k, 1);
        return sp;
    }

    /* ---------------------------- soportes ---------------------------- */
    function makeSupport(parent, x, z, topY, kind, accent) {
        var g = new T.Group(); g.position.set(x, 0, z); parent.add(g);
        var steel = standard(STEEL), dark = standard(STEEL_DARK);
        var acc = standard({ color: accent, metalness: 0.4, roughness: 0.38 });
        var s = clamp(topY / 0.42, 0.8, 1.35);
        addBox(g, 0.58 * s, 0.07, 0.58 * s, 0, 0.035, 0, dark);
        if (kind === 'roller') {
            for (var i = -1; i <= 1; i++) addCyl(g, 0.045 * s, 0.045 * s, 0.46 * s, i * 0.13 * s, 0.075, 0, steel, 'z', 12);
        }
        var coneH = Math.max(0.18, topY - 0.12);
        var tri = new T.Mesh(new T.ConeGeometry(0.24 * s, coneH, 3), steel);
        tri.position.y = 0.07 + coneH / 2;
        tri.rotation.y = Math.PI / 6;
        tri.castShadow = true; tri.receiveShadow = true;
        g.add(tri);
        addCyl(g, 0.055 * s, 0.055 * s, 0.34 * s, 0, topY, 0, acc, 'z', 16);
        return g;
    }
    function makeFixedBase(parent, x, z, w, d, accent) {
        var g = new T.Group(); g.position.set(x, 0, z); parent.add(g);
        var dark = standard(STEEL_DARK), acc = standard({ color: accent, metalness: 0.4, roughness: 0.35 });
        addBox(g, w, 0.13, d, 0, 0.065, 0, dark);
        var bolts = [[-1, -1], [1, -1], [-1, 1], [1, 1]];
        bolts.forEach(function (q) {
            addCyl(g, 0.028, 0.028, 0.12, q[0] * w * 0.33, 0.16, q[1] * d * 0.33, acc, 'y', 10);
        });
        return g;
    }

    /* ---------------------------- diagramas ---------------------------- */
    function ribbonH(parent, xs, vals, z, color, scale, baseY) {
        var n = xs.length;
        var pos = new Float32Array(n * 2 * 3);
        var idx = [];
        for (var i = 0; i < n; i++) {
            pos[i * 6] = xs[i]; pos[i * 6 + 1] = 0; pos[i * 6 + 2] = z;
            pos[i * 6 + 3] = xs[i]; pos[i * 6 + 4] = vals[i] * scale; pos[i * 6 + 5] = z;
            if (i < n - 1) {
                var a = i * 2;
                idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
            }
        }
        var geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setIndex(idx);
        var mat = new T.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.32, side: T.DoubleSide, depthWrite: false });
        var mesh = new T.Mesh(geo, mat);
        var linePos = new Float32Array(n * 3);
        for (var j = 0; j < n; j++) { linePos[j * 3] = xs[j]; linePos[j * 3 + 1] = vals[j] * scale; linePos[j * 3 + 2] = z; }
        var lgeo = new T.BufferGeometry();
        lgeo.setAttribute('position', new T.BufferAttribute(linePos, 3));
        var line = new T.Line(lgeo, new T.LineBasicMaterial({ color: color, transparent: true, opacity: 1 }));
        var g = new T.Group();
        g.position.y = baseY || 0;
        g.add(mesh); g.add(line);
        parent.add(g);
        return g;
    }
    function ribbonV(parent, ys, vals, x0, z, color, scale) {
        var n = ys.length;
        var pos = new Float32Array(n * 2 * 3);
        var idx = [];
        for (var i = 0; i < n; i++) {
            pos[i * 6] = 0; pos[i * 6 + 1] = ys[i]; pos[i * 6 + 2] = z;
            pos[i * 6 + 3] = vals[i] * scale; pos[i * 6 + 4] = ys[i]; pos[i * 6 + 5] = z;
            if (i < n - 1) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        var geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        geo.setIndex(idx);
        var mesh = new T.Mesh(geo, new T.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.3, side: T.DoubleSide, depthWrite: false }));
        var linePos = new Float32Array(n * 3);
        for (var j = 0; j < n; j++) { linePos[j * 3] = vals[j] * scale; linePos[j * 3 + 1] = ys[j]; linePos[j * 3 + 2] = z; }
        var lgeo = new T.BufferGeometry();
        lgeo.setAttribute('position', new T.BufferAttribute(linePos, 3));
        var line = new T.Line(lgeo, new T.LineBasicMaterial({ color: color, transparent: true, opacity: 1 }));
        var g = new T.Group();
        g.position.x = x0;
        g.add(mesh); g.add(line);
        parent.add(g);
        return g;
    }

    /* ---------------------------- deformada ---------------------------- */
    function makeDefLine(parent, xs, ds, xMap, yBase, z, amp) {
        var n = xs.length;
        var pos = new Float32Array(n * 3);
        var ref = new Float32Array(n * 3);
        var maxD = 0;
        ds.forEach(function (v) { maxD = Math.max(maxD, Math.abs(v)); });
        maxD = maxD || 1;
        for (var i = 0; i < n; i++) {
            var x = xMap(xs[i]);
            pos[i * 3] = x; pos[i * 3 + 1] = yBase; pos[i * 3 + 2] = z;
            ref[i * 3] = x; ref[i * 3 + 1] = yBase; ref[i * 3 + 2] = z;
        }
        var geo = new T.BufferGeometry();
        geo.setAttribute('position', new T.BufferAttribute(pos, 3));
        var line = new T.Line(geo, new T.LineBasicMaterial({ color: 0xF472B6, transparent: true, opacity: 0.95 }));
        parent.add(line);
        var rgeo = new T.BufferGeometry();
        rgeo.setAttribute('position', new T.BufferAttribute(ref, 3));
        var refLine = new T.Line(rgeo, new T.LineDashedMaterial({ color: 0xF472B6, transparent: true, opacity: 0.25, dashSize: 0.12, gapSize: 0.09 }));
        refLine.computeLineDistances();
        parent.add(refLine);
        return {
            line: line,
            update: function (p) {
                var a = geo.attributes.position.array;
                for (var k = 0; k < n; k++) {
                    a[k * 3 + 1] = yBase - (ds[k] / maxD) * amp * p;
                }
                geo.attributes.position.needsUpdate = true;
                line.visible = p > 0.01;
                refLine.visible = p > 0.01;
            }
        };
    }

    /* ---------------------------- cámaras ---------------------------- */
    function cameraFor(bounds) {
        var size = bounds.size || 8;
        var t = bounds.target || [0, size * 0.18, 0];
        var r = Math.max(7.6, size * 1.38);
        return {
            target: t,
            home: { theta: 0.56, phi: 1.14, radius: r },
            frontal: { theta: 0.02, phi: 1.3, radius: r * 1.08 },
            lateral: { theta: 1.5, phi: 1.2, radius: r },
            detalle: { theta: 0.38, phi: 1.18, radius: r * 0.72, target: [t[0], t[1] + size * 0.06, t[2]] }
        };
    }

    /* ================================================================
       CONSTRUCTORES DE MODELOS
       ================================================================ */
    function dims(P) {
        return {
            w: clamp(num(P.b) / 1000, 0.14, 0.62),
            d: clamp(num(P.h) / 1000, 0.2, 0.9)
        };
    }

    /* 01 · Viga simplemente apoyada */
    function buildViga(P, r, accent) {
        var root = new T.Group();
        var L = num(P.L), D = dims(P), baseY = 0.62, y = baseY + D.d / 2;
        var beamMat = matOf(P), acc = standard({ color: accent, metalness: 0.35, roughness: 0.42 });
        var beam = addBox(root, L, D.d, D.w, 0, y, 0, beamMat);
        addEdges(beam, 0x0B1220, 0.24);
        makeSupport(root, -L / 2, 0, baseY, 'pin', accent);
        makeSupport(root, L / 2, 0, baseY, 'roller', accent);

        var loads = new T.Group(); root.add(loads);
        var arrows = [];
        var topLoad = y + D.d / 2 + 0.88;
        if (num(P.w) > 0) {
            for (var i = 0; i <= 9; i++) {
                var x = -L / 2 + L * i / 9;
                var a = arrow3D(loads, new T.Vector3(x, topLoad, 0), new T.Vector3(x, y + D.d / 2 + 0.05, 0), 0xFBBF24, 0.014);
                if (a) arrows.push(a);
            }
            addBox(loads, L * 0.94, 0.022, 0.022, 0, topLoad, 0, new T.MeshStandardMaterial({ color: 0xFBBF24, emissive: 0xFBBF24, emissiveIntensity: 0.25, metalness: 0.2, roughness: 0.4 }));
            var lb = makeLabel('w = ' + fmt(P.w, 1) + ' kN/m', '#FBBF24', 0.8);
            lb.position.set(-L * 0.3, topLoad + 0.27, 0); loads.add(lb);
        }
        if (num(P.P) > 0) {
            var xp = -L / 2 + L * clamp(num(P.aF), 0, 1);
            var pa = arrow3D(loads, new T.Vector3(xp, topLoad + 0.4, 0), new T.Vector3(xp, y + D.d / 2 + 0.06, 0), 0xF87171, 0.026);
            if (pa) arrows.push(pa);
            var pl = makeLabel('P = ' + fmt(P.P, 1) + ' kN', '#F87171', 0.86);
            pl.position.set(xp, topLoad + 0.66, 0); loads.add(pl);
        }

        var amp = clamp(Math.max(L, 4) * 0.055, 0.24, 0.72);
        var def = makeDefLine(root, r.xs, r.ds, function (x) { return -L / 2 + x; }, y, D.w / 2 + 0.045, amp);

        var diagrams = new T.Group(); root.add(diagrams);
        var maxM = Math.max(1e-9, r.Mabs), maxV = Math.max(1e-9, Math.abs(r.Vmax));
        var momVals = r.ms.map(function (v) { return -v; });
        var mom = ribbonH(diagrams, r.xs.map(function (x) { return -L / 2 + x; }), momVals, Math.max(0.9, D.w / 2 + 0.6), 0x34D399, 0.6 / maxM, y);
        var she = ribbonH(diagrams, r.xs.map(function (x) { return -L / 2 + x; }), r.vs, -(Math.max(0.9, D.w / 2 + 0.6)), 0x60A5FA, 0.42 / maxV, y);

        var dim = makeLabel('L = ' + fmt(P.L, 2) + ' m', '#94A3B8', 0.82);
        dim.position.set(0, baseY - 0.28, 0); root.add(dim);

        function set(p) {
            loads.visible = true;
            arrows.forEach(function (a) { a.scale.y = 0.2 + 0.8 * p; });
            def.update(p);
            diagrams.visible = p > 0.012;
            mom.scale.y = p;
            she.scale.y = p;
        }
        set(0);
        return {
            root: root, set: set, diagrams: diagrams,
            pins: [
                { v: [0, y + D.d / 2 + 0.15, 0], n: 'Viga', d: 'Prisma de sección ' + P.b + ' × ' + P.h + ' mm, material ' + (P.mat || 'concreto') + '.' },
                { v: [-L / 2, baseY * 0.55, 0], n: 'Apoyo A · pasador', d: 'Restringe desplazamientos horizontal y vertical; permite giro.' },
                { v: [L / 2, baseY * 0.55, 0], n: 'Apoyo B · rodillo', d: 'Solo restringe el desplazamiento vertical; la viga puede girar.' },
                { v: [-L / 2 + L * clamp(num(P.aF), 0, 1), y + D.d / 2 + 1.3, 0], n: 'Carga puntual P', d: 'Carga concentrada que se mueve con la posición a/L.' },
                { v: [0, y + D.d / 2 + 1.05, 0], n: 'Carga distribuida w', d: 'Carga por unidad de longitud sobre toda la luz.' },
                { v: [0, y - amp * 0.5, D.w / 2 + 0.06], n: 'Deformada', d: 'Elástica amplificada; la flecha real se lee en las tarjetas.' },
                { v: [L * 0.18, y - 0.35, D.w / 2 + 0.38], n: 'Diagrama de momento', d: 'Curtain verde: positivo cuelga, negativo sube. Se activa con el avance.' }
            ],
            bounds: { size: Math.max(L, 6), target: [0, y * 0.68, 0] }
        };
    }

    /* 02 · Voladizo */
    function buildVoladizo(P, r, accent) {
        var root = new T.Group();
        var L = num(P.L), D = dims(P), baseY = 0.62, y = baseY + D.d / 2;
        var beamMat = matOf(P);
        var beam = addBox(root, L, D.d, D.w, 0, y, 0, beamMat);
        addEdges(beam, 0x0B1220, 0.24);
        // muro de empotramiento
        var wallMat = standard({ color: 0x526175, metalness: 0.08, roughness: 0.86 });
        var wall = addBox(root, 0.5, 1.9, 1.35, -L / 2 - 0.25, 0.95, 0, wallMat);
        addEdges(wall, 0x0B1220, 0.28);
        for (var hh = -0.55; hh <= 0.55; hh += 0.27) {
            var hatch = addBox(root, 0.02, 0.02, 1.1, -L / 2 - 0.51, 0.95 + hh, 0, standard(STEEL_DARK));
            hatch.rotation.z = -0.5;
        }
        var loads = new T.Group(); root.add(loads);
        var arrows = [];
        var topLoad = y + D.d / 2 + 0.88;
        if (num(P.w) > 0) {
            for (var i = 0; i <= 9; i++) {
                var x = -L / 2 + L * i / 9;
                var a = arrow3D(loads, new T.Vector3(x, topLoad, 0), new T.Vector3(x, y + D.d / 2 + 0.05, 0), 0xFBBF24, 0.014);
                if (a) arrows.push(a);
            }
            addBox(loads, L * 0.95, 0.022, 0.022, 0, topLoad, 0, new T.MeshStandardMaterial({ color: 0xFBBF24, emissive: 0xFBBF24, emissiveIntensity: 0.25, metalness: 0.2, roughness: 0.4 }));
            var lw = makeLabel('w = ' + fmt(P.w, 1) + ' kN/m', '#FBBF24', 0.8);
            lw.position.set(-L * 0.28, topLoad + 0.27, 0); loads.add(lw);
        }
        if (num(P.P) > 0) {
            var pa = arrow3D(loads, new T.Vector3(L / 2, topLoad + 0.38, 0), new T.Vector3(L / 2, y + D.d / 2 + 0.06, 0), 0xF87171, 0.026);
            if (pa) arrows.push(pa);
            var lp = makeLabel('P = ' + fmt(P.P, 1) + ' kN', '#F87171', 0.86);
            lp.position.set(L / 2, topLoad + 0.64, 0); loads.add(lp);
        }
        var amp = clamp(Math.max(L, 4) * 0.07, 0.24, 0.7);
        var def = makeDefLine(root, r.xs, r.ds, function (x) { return -L / 2 + x; }, y, D.w / 2 + 0.045, amp);
        var diagrams = new T.Group(); root.add(diagrams);
        var maxM = Math.max(1e-9, r.Mabs), maxV = Math.max(1e-9, Math.abs(r.Vmax));
        var momVals = r.ms.map(function (v) { return -v; });
        var mom = ribbonH(diagrams, r.xs.map(function (x) { return -L / 2 + x; }), momVals, Math.max(0.9, D.w / 2 + 0.6), 0xF87171, 0.46 / maxM, y);
        var she = ribbonH(diagrams, r.xs.map(function (x) { return -L / 2 + x; }), r.vs, -(Math.max(0.9, D.w / 2 + 0.6)), 0x60A5FA, 0.32 / maxV, y);
        var dim = makeLabel('L = ' + fmt(P.L, 2) + ' m', '#94A3B8', 0.82);
        dim.position.set(0, baseY - 0.28, 0); root.add(dim);
        function set(p) {
            loads.visible = true;
            arrows.forEach(function (a) { a.scale.y = 0.2 + 0.8 * p; });
            def.update(p);
            diagrams.visible = p > 0.012;
            mom.scale.y = p; she.scale.y = p;
        }
        set(0);
        return {
            root: root, set: set, diagrams: diagrams,
            pins: [
                { v: [-L / 2 - 0.1, y, 0], n: 'Empotramiento', d: 'Impide desplazamiento y giro; aparecen reacción vertical y momento M_A.' },
                { v: [0, y + D.d / 2 + 0.15, 0], n: 'Viga en voladizo', d: 'Sección ' + P.b + ' × ' + P.h + ' mm. La longitud pesa al cubo en la flecha.' },
                { v: [L / 2, y + D.d / 2 + 1.3, 0], n: 'Carga en punta P', d: 'Carga concentrada en el extremo libre.' },
                { v: [-L * 0.16, y + D.d / 2 + 1.05, 0], n: 'Carga distribuida w', d: 'Carga repartida en toda la longitud del voladizo.' },
                { v: [L * 0.22, y - amp * 0.6, D.w / 2 + 0.06], n: 'Elástica', d: 'La flecha máxima ocurre en la punta; se amplifica para verla.' },
                { v: [-L * 0.24, y + 0.3, D.w / 2 + 0.38], n: 'Momento negativo', d: 'El momento de empotramiento es negativo (hogging) y máximo en el apoyo.' }
            ],
            bounds: { size: Math.max(L + 1.4, 5), target: [0, y * 0.72, 0] }
        };
    }

    /* 03 · Cercha Pratt */
    function forceColor(f, maxAbs) {
        if (Math.abs(f) < 1e-6) return 0x64748B;
        var t = clamp(Math.abs(f) / Math.max(1e-9, maxAbs), 0, 1);
        if (f > 0) return new T.Color(0x94A3B8).lerp(new T.Color(0xF87171), 0.3 + 0.7 * t).getHex();
        return new T.Color(0x94A3B8).lerp(new T.Color(0x60A5FA), 0.3 + 0.7 * t).getHex();
    }
    function buildCercha(P, r, accent) {
        var root = new T.Group();
        var L = num(P.L), h = num(P.h), baseY = 0.7, zHalf = 0.72;
        var nodes = r.nodes;
        var maxAbs = Math.max(1e-9, r.maxAbs);
        var members = new T.Group(); root.add(members);
        r.members.forEach(function (m) {
            var a = nodes[m.a], b = nodes[m.b];
            var thick = 0.055 + 0.075 * clamp(Math.abs(m.force) / maxAbs, 0, 1);
            var col = forceColor(m.force, maxAbs);
            var material = standard({ color: col, metalness: 0.62, roughness: 0.34 });
            [-zHalf, zHalf].forEach(function (z) {
                strut(members, new T.Vector3(a.x - L / 2, a.y + baseY, z), new T.Vector3(b.x - L / 2, b.y + baseY, z), thick, material, thick);
            });
        });
        // placas de unión y riostras espaciales
        var plates = new T.Group(); root.add(plates);
        nodes.forEach(function (n) {
            addBox(plates, 0.17, 0.17, zHalf * 2 + 0.16, n.x - L / 2, n.y + baseY, 0, standard(STEEL_DARK));
            addCyl(plates, 0.035, 0.035, zHalf * 2 + 0.24, n.x - L / 2, n.y + baseY, 0, standard(STEEL), 'z', 10);
        });
        var braces = new T.Group(); root.add(braces);
        var braceMat = standard({ color: 0x7C8DA3, metalness: 0.55, roughness: 0.45 });
        for (var i = 0; i < 4; i++) {
            var b0 = nodes[i], b1 = nodes[i + 1];
            strut(braces, new T.Vector3(b0.x - L / 2, b0.y + baseY, -zHalf), new T.Vector3(b1.x - L / 2, b1.y + baseY, zHalf), 0.035, braceMat);
            strut(braces, new T.Vector3(b0.x - L / 2, b0.y + baseY, zHalf), new T.Vector3(b1.x - L / 2, b1.y + baseY, -zHalf), 0.035, braceMat);
        }
        [5, 6, 7].forEach(function (idx) {
            var n = nodes[idx];
            var left = nodes[idx - 5], right = nodes[idx - 4];
            if (left) strut(braces, new T.Vector3(n.x - L / 2, n.y + baseY, -zHalf), new T.Vector3(left.x - L / 2, left.y + baseY, zHalf), 0.03, braceMat);
            if (right) strut(braces, new T.Vector3(n.x - L / 2, n.y + baseY, zHalf), new T.Vector3(right.x - L / 2, right.y + baseY, -zHalf), 0.03, braceMat);
        });
        // apoyos en los dos planos
        [-zHalf, zHalf].forEach(function (z) {
            makeSupport(root, -L / 2, z, baseY, 'pin', accent);
            makeSupport(root, L / 2, z, baseY, 'roller', accent);
        });
        // carga
        var loads = new T.Group(); root.add(loads);
        var ldn = nodes[r.loadNode];
        var lx = ldn.x - L / 2, ly = ldn.y + baseY;
        var loadArrow = arrow3D(loads, new T.Vector3(lx, ly + 1.08, 0), new T.Vector3(lx, ly + 0.08, 0), 0xFBBF24, 0.026);
        var loadLabel = makeLabel('P = ' + fmt(P.P, 1) + ' kN', '#FBBF24', 0.84);
        loadLabel.position.set(lx, ly + 1.36, 0); loads.add(loadLabel);
        // flecha de deflexión
        var deltaVis = clamp(Math.abs(r.delta) / 1000 * 4.2, 0.02, 0.3);
        var defGroup = new T.Group(); defGroup.position.set(lx, ly, zHalf + 0.12); root.add(defGroup);
        var defLine = new T.Line(new T.BufferGeometry().setFromPoints([
            new T.Vector3(0, 0, 0), new T.Vector3(0, -deltaVis, 0)
        ]), new T.LineBasicMaterial({ color: 0xF472B6, transparent: true, opacity: 0.95 }));
        defGroup.add(defLine);
        var defDot = new T.Mesh(new T.SphereGeometry(0.045, 12, 12), new T.MeshBasicMaterial({ color: 0xF472B6 }));
        defDot.position.set(0, -deltaVis, 0); defGroup.add(defDot);
        var defLabel = makeLabel('Δ = ' + fmt(r.delta, 2) + ' mm', '#F472B6', 0.78);
        defLabel.position.set(0.45, -deltaVis - 0.08, 0); defGroup.add(defLabel);
        // etiquetas de nudos
        var nodeLabels = new T.Group(); root.add(nodeLabels);
        nodes.forEach(function (n) {
            var sp = makeLabel(n.n, '#A7B4C8', 0.62);
            sp.position.set(n.x - L / 2, n.y + baseY + (n.y > 0 ? 0.22 : -0.2), zHalf + 0.18);
            nodeLabels.add(sp);
        });
        var dim = makeLabel('L = ' + fmt(P.L, 1) + ' m · h = ' + fmt(P.h, 1) + ' m', '#94A3B8', 0.82);
        dim.position.set(0, baseY - 0.3, 0); root.add(dim);

        function set(p) {
            loads.visible = true;
            if (loadArrow) loadArrow.scale.y = 0.2 + 0.8 * p;
            defGroup.visible = p > 0.012;
            defLine.scale.y = 0.2 + 0.8 * p;
            defDot.position.y = -deltaVis * (0.2 + 0.8 * p);
            defLabel.position.y = -deltaVis * (0.2 + 0.8 * p) - 0.08;
        }
        set(0);
        return {
            root: root, set: set, diagrams: null,
            pins: [
                { v: [-L / 2, baseY + h * 0.5, zHalf], n: 'Cordón inferior', d: 'Barras B0–B4; trabajan a tracción o compresión según la posición de P.' },
                { v: [0, baseY + h + 0.12, 0], n: 'Cordón superior', d: 'Barras T1–T3. En la cercha Pratt suelen trabajar a compresión.' },
                { v: [-L * 0.18, baseY + h * 0.45, zHalf], n: 'Diagonales y montantes', d: 'Transmiten el cortante; el color indica tracción (rojo) o compresión (azul).' },
                { v: [-L / 2, baseY * 0.55, -zHalf], n: 'Apoyo B0 · pasador', d: 'Reacciones Rx y Ry; nudo de referencia de la cercha.' },
                { v: [L / 2, baseY * 0.55, zHalf], n: 'Apoyo B4 · rodillo', d: 'Reacción vertical; permite el desplazamiento horizontal.' },
                { v: [lx, ly + 1.2, 0], n: 'Carga P en ' + r.loadName, d: 'Puedes cambiar el nudo cargado y ver cómo se redistribuyen las fuerzas.' },
                { v: [0, baseY + h * 0.5, 0], n: 'Riostras espaciales', d: 'Unen los dos planos de la cercha y le dan estabilidad fuera del plano.' }
            ],
            bounds: { size: Math.max(L, h * 2.4, 6), target: [0, baseY + h * 0.52, 0] }
        };
    }

    /* 04 · Pórtico portal */
    function buildPortico(P, r, accent) {
        var root = new T.Group();
        var b = num(P.b), h = num(P.h), zs = [-1.08, 1.08];
        var cw = clamp(num(P.hc) / 1000, 0.2, 0.62);
        var beamD = 0.34, beamW = 0.3;
        var frame = new T.Group(); root.add(frame);
        var colMat = matOf(P);
        var beamMat = standard({ color: 0xA7B4C8, metalness: 0.15, roughness: 0.72 });
        var acc = standard({ color: accent, metalness: 0.35, roughness: 0.4 });
        zs.forEach(function (z) {
            addBox(frame, cw, h, 0.3, -b / 2, h / 2, z, colMat);
            addBox(frame, cw, h, 0.3, b / 2, h / 2, z, colMat);
            addBox(frame, b + cw, beamD, beamW, 0, h, z, beamMat);
        });
        // losa de cubierta y correas
        var roofMat = new T.MeshStandardMaterial({ color: 0x9AA6B2, metalness: 0.08, roughness: 0.88, transparent: true, opacity: 0.72 });
        addBox(frame, b + 0.5, 0.075, 2.65, 0, h + 0.24, 0, roofMat);
        for (var i = -2; i <= 2; i++) {
            addBox(frame, 0.075, 0.14, 2.65, i * b / 5, h + 0.16, 0, standard(STEEL_DARK));
        }
        // bases empotradas fuera del grupo que se distorsiona
        zs.forEach(function (z) {
            makeFixedBase(root, -b / 2, z, 0.68, 0.68, accent);
            makeFixedBase(root, b / 2, z, 0.68, 0.68, accent);
        });
        // carga lateral
        var loads = new T.Group(); root.add(loads);
        var loadArrow = arrow3D(loads, new T.Vector3(-b / 2 - 1.35, h + 0.42, 1.08), new T.Vector3(-b / 2 - 0.12, h + 0.42, 1.08), 0xFBBF24, 0.03);
        var loadLabel = makeLabel('W = ' + fmt(P.W, 1) + ' kN', '#FBBF24', 0.94);
        loadLabel.position.set(-b / 2 - 0.75, h + 0.76, 1.08); loads.add(loadLabel);
        // momentos en esquinas
        var moments = new T.Group(); frame.add(moments);
        var mMat = new T.MeshStandardMaterial({ color: 0xF472B6, emissive: 0xF472B6, emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.4 });
        [[-b / 2, 0.18, 1.08], [-b / 2, h - 0.18, 1.08], [b / 2, h - 0.18, 1.08], [b / 2, 0.18, 1.08]].forEach(function (q) {
            var sp = new T.Mesh(new T.SphereGeometry(0.1, 16, 12), mMat);
            sp.position.set(q[0], q[1], q[2]); moments.add(sp);
        });
        // diagramas de momento en columnas
        var diagrams = new T.Group(); frame.add(diagrams);
        var Mcol = Math.max(1e-9, r.Mcol);
        var dScale = 0.48 / Mcol;
        var dLeft = ribbonV(diagrams, [0.02, h / 2, h - 0.02], [Mcol, 0, -Mcol], -b / 2, 1.44, 0xF472B6, dScale);
        var dRight = ribbonV(diagrams, [0.02, h / 2, h - 0.02], [-Mcol, 0, Mcol], b / 2, 1.44, 0xF472B6, dScale);
        // flecha de deriva
        var dxMax = clamp(r.sway / 1000 * 90, 0.12, 0.55);
        var swayArrow = arrow3D(root, new T.Vector3(b / 2, h + 0.46, 1.08), new T.Vector3(b / 2 + dxMax, h + 0.46, 1.08), 0x34D399, 0.022);
        var swayLabel = makeLabel('Δ = ' + fmt(r.sway, 2) + ' mm', '#34D399', 0.82);
        swayLabel.position.set(b / 2 + dxMax * 0.55, h + 0.78, 1.08); root.add(swayLabel);
        var dim = makeLabel('b = ' + fmt(P.b, 2) + ' m · h = ' + fmt(P.h, 2) + ' m', '#94A3B8', 0.8);
        dim.position.set(0, -0.26, 0); root.add(dim);

        var shear = new T.Matrix4();
        function set(p) {
            loads.visible = true;
            if (loadArrow) loadArrow.scale.y = 0.2 + 0.8 * p;
            var k = (dxMax * p) / Math.max(0.5, h);
            shear.set(1, k, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
            frame.matrixAutoUpdate = false;
            frame.matrix.copy(shear);
            frame.matrixWorldNeedsUpdate = true;
            swayArrow.visible = p > 0.012;
            swayArrow.scale.y = 0.18 + 0.82 * p;
            swayLabel.visible = p > 0.012;
            moments.visible = p > 0.012;
            moments.children.forEach(function (m) { m.scale.setScalar(0.5 + 0.5 * p); });
            diagrams.visible = p > 0.012;
            dLeft.scale.x = p; dRight.scale.x = p;
        }
        set(0);
        return {
            root: root, set: set, diagrams: diagrams,
            pins: [
                { v: [-b / 2, h * 0.55, 1.08], n: 'Columna izquierda', d: 'Toma V = W/2 y momento M = V·h/2; la base está empotrada.' },
                { v: [0, h + 0.1, 1.08], n: 'Viga de cubierta', d: 'Viga superior rígida; conecta las dos columnas y recibe la losa.' },
                { v: [-b / 2, 0.12, 1.08], n: 'Empotramiento', d: 'Restringe giro y desplazamiento en la base de cada columna.' },
                { v: [-b / 2 - 1.1, h + 0.42, 1.08], n: 'Carga lateral W', d: 'Viento o sismo aplicado a nivel de la cubierta; se reparte por igual entre columnas.' },
                { v: [b / 2 + dxMax * 0.55, h + 0.55, 1.08], n: 'Deriva lateral Δ', d: 'Desplazamiento relativo de la cubierta; se compara con h/250.' },
                { v: [0, h + 0.3, 0], n: 'Losa de cubierta', d: 'Losa y correas que arriostran los dos pórticos paralelos.' }
            ],
            bounds: { size: Math.max(b + 1.8, h * 1.7, 6), target: [0, h * 0.5, 0] }
        };
    }

    /* 05 · Viga continua */
    function buildContinuas(P, r, accent) {
        var root = new T.Group();
        var L1 = num(P.L1), L2 = num(P.L2), L = L1 + L2;
        var D = dims(P), baseY = 0.62, y = baseY + D.d / 2;
        var x0 = -L / 2, xB = -L / 2 + L1, xC = L / 2;
        var beamMat = matOf(P);
        var beam = addBox(root, L, D.d, D.w, 0, y, 0, beamMat);
        addEdges(beam, 0x0B1220, 0.24);
        makeSupport(root, x0, 0, baseY, 'pin', accent);
        makeSupport(root, xB, 0, baseY, 'roller', accent);
        makeSupport(root, xC, 0, baseY, 'roller', accent);
        var loads = new T.Group(); root.add(loads);
        var arrows = [];
        function addDist(xa, xb, w, label) {
            if (w <= 0) return;
            var n = 8;
            var top = y + D.d / 2 + 0.88;
            for (var i = 0; i <= n; i++) {
                var x = xa + (xb - xa) * i / n;
                var a = arrow3D(loads, new T.Vector3(x, top, 0), new T.Vector3(x, y + D.d / 2 + 0.05, 0), 0xFBBF24, 0.013);
                if (a) arrows.push(a);
            }
            addBox(loads, (xb - xa) * 0.94, 0.02, 0.02, (xa + xb) / 2, top, 0, new T.MeshStandardMaterial({ color: 0xFBBF24, emissive: 0xFBBF24, emissiveIntensity: 0.25, metalness: 0.2, roughness: 0.4 }));
            var lb = makeLabel(label, '#FBBF24', 0.78);
            lb.position.set((xa + xb) / 2, top + 0.27, 0); loads.add(lb);
        }
        addDist(x0, xB, num(P.w1), 'w₁ = ' + fmt(P.w1, 1) + ' kN/m');
        addDist(xB, xC, num(P.w2), 'w₂ = ' + fmt(P.w2, 1) + ' kN/m');
        // deformada cualitativa: parábolas por tramo, nulas en los apoyos
        var amp = clamp(Math.max(L, 5) * 0.055, 0.22, 0.62);
        var xs = [], ds = [];
        var N = 60;
        for (var i = 0; i <= N; i++) {
            var t = i / N, x = x0 + L1 * t;
            xs.push(x); ds.push(amp * Math.sin(Math.PI * t) * Math.sin(Math.PI * t));
        }
        for (var j = 1; j <= N; j++) {
            var t2 = j / N, x2 = xB + L2 * t2;
            xs.push(x2); ds.push(amp * Math.sin(Math.PI * t2) * Math.sin(Math.PI * t2));
        }
        var def = makeDefLine(root, xs, ds, function (x) { return x; }, y, D.w / 2 + 0.045, 1);
        var diagrams = new T.Group(); root.add(diagrams);
        var maxM = Math.max(1e-9, r.Mabs), maxV = Math.max(1e-9, Math.max.apply(null, r.vs.map(function (v) { return Math.abs(v); })));
        var momVals = r.ms.map(function (v) { return -v; });
        var mom = ribbonH(diagrams, r.xs.map(function (x) { return x0 + x; }), momVals, Math.max(0.9, D.w / 2 + 0.6), 0x34D399, 0.58 / maxM, y);
        var she = ribbonH(diagrams, r.xs.map(function (x) { return x0 + x; }), r.vs, -(Math.max(0.9, D.w / 2 + 0.6)), 0x60A5FA, 0.38 / maxV, y);
        var dim = makeLabel('L₁ = ' + fmt(P.L1, 1) + ' m · L₂ = ' + fmt(P.L2, 1) + ' m', '#94A3B8', 0.8);
        dim.position.set(0, baseY - 0.28, 0); root.add(dim);
        function set(p) {
            loads.visible = true;
            arrows.forEach(function (a) { a.scale.y = 0.2 + 0.8 * p; });
            def.update(p);
            diagrams.visible = p > 0.012;
            mom.scale.y = p; she.scale.y = p;
        }
        set(0);
        return {
            root: root, set: set, diagrams: diagrams,
            pins: [
                { v: [x0, baseY * 0.55, 0], n: 'Apoyo A', d: 'Apoyo simple con reacción R_A.' },
                { v: [xB, baseY * 0.55, 0], n: 'Apoyo B · continuidad', d: 'La continuidad impone el mismo giro en ambos tramos; aquí nace M_B negativo.' },
                { v: [xC, baseY * 0.55, 0], n: 'Apoyo C', d: 'Apoyo simple con reacción R_C.' },
                { v: [(x0 + xB) / 2, y + D.d / 2 + 1.1, 0], n: 'Luz 1 · w₁', d: 'Carga distribuida del primer tramo.' },
                { v: [(xB + xC) / 2, y + D.d / 2 + 1.1, 0], n: 'Luz 2 · w₂', d: 'Carga distribuida del segundo tramo.' },
                { v: [xB, y + 0.36, D.w / 2 + 0.38], n: 'Momento negativo en B', d: 'El diagrama sube sobre B: el momento negativo reduce los positivos de las luces.' },
                { v: [x0 + L * 0.25, y - 0.4, D.w / 2 + 0.38], n: 'Diagramas V y M', d: 'Curtains de cortante y momento; se activan con el avance de la carga.' }
            ],
            bounds: { size: Math.max(L, 6), target: [0, y * 0.68, 0] }
        };
    }

    var BUILDERS = { viga: buildViga, voladizo: buildVoladizo, cercha: buildCercha, portico: buildPortico, continuas: buildContinuas };

    var PARTS = {
        viga: [
            ['Viga', 'Prisma de sección rectangular; material y dimensiones se ajustan en el panel.'],
            ['Apoyo A', 'Pasador: restringe traslaciones y permite giro.'],
            ['Apoyo B', 'Rodillo: solo restringe el movimiento vertical.'],
            ['Cargas', 'Puntual P y distribuida w; se aplican gradualmente con el control de avance.'],
            ['Diagramas', 'Cortante azul y momento verde; la deformada magenta está amplificada.']
        ],
        voladizo: [
            ['Empotramiento', 'Muro que impide desplazamiento y giro en el extremo fijo.'],
            ['Viga', 'Prisma en voladizo con carga de punta y carga distribuida.'],
            ['Momento negativo', 'El momento máximo ocurre en el empotramiento y es negativo.'],
            ['Elástica', 'La flecha crece al cubo con la longitud para la carga puntual.'],
            ['Diagramas', 'Cortante y momento se dibujan como curtains 3D junto a la viga.']
        ],
        cercha: [
            ['Cordón inferior', 'Barras B0–B4; pueden trabajar a tracción o compresión.'],
            ['Cordón superior', 'Barras T1–T3; en la Pratt suelen estar comprimidas.'],
            ['Diagonales', 'Transmiten el cortante y cambian de signo según el nudo cargado.'],
            ['Apoyos', 'Pasador en B0 y rodillo en B4, repetidos en los dos planos.'],
            ['Riostras', 'Conectan los dos planos paralelos y estabilizan fuera del plano.']
        ],
        portico: [
            ['Columnas', 'Empotradas en la base; toman cortante y momento por el método del portal.'],
            ['Viga de cubierta', 'Conecta las columnas y recibe la losa; se idealiza rígida.'],
            ['Losa y correas', 'Arriostran los dos pórticos paralelos y reparten la carga.'],
            ['Carga lateral', 'W representa viento o sismo aplicado a nivel de cubierta.'],
            ['Deriva', 'Desplazamiento lateral de la cubierta, comparado con h/250.']
        ],
        continuas: [
            ['Tres apoyos', 'A, B y C; la continuidad en B hace la viga hiperestática de grado 1.'],
            ['Dos luces', 'L₁ y L₂ con cargas distribuidas independientes w₁ y w₂.'],
            ['Momento en B', 'La compatibilidad de giros produce un momento negativo sobre el apoyo central.'],
            ['Diagramas', 'Cortante y momento recorren los dos tramos; el momento negativo en B reduce los positivos.'],
            ['Deformada', 'Curva cualitativa con flechas en ambas luces y giro continuo en B.']
        ]
    };

    /* ================================================================
       VISOR
       ================================================================ */
    function template(s, id) {
        var parts = PARTS[id] || [];
        var phases = s.steps || [];
        return '<div class="lab3d est3d-lab" data-tipo="' + esc(id) + '" style="--lab-accent:' + s.accent + ';--a:' + s.accent + ';--rgb:' + s.rgb + '">' +
            '<div class="lab3d-stage">' +
                '<div class="lab3d-canvas" role="img" aria-label="' + esc(s.title) + ' en 3D" title="Arrastra para orbitar · rueda para zoom · doble clic para volver"></div>' +
                '<div class="lab3d-pins"></div>' +
                '<div class="lab3d-tag"><span>Modelo estructural</span><strong>' + esc(s.title) + '</strong></div>' +
                '<div class="lab3d-state"><i></i><b>Listo</b></div>' +
                '<div class="lab3d-views">' +
                    '<button type="button" data-view="home" class="on" title="Vista general">⌂</button>' +
                    '<button type="button" data-view="frontal" title="Vista frontal">F</button>' +
                    '<button type="button" data-view="lateral" title="Vista lateral">L</button>' +
                    '<button type="button" data-view="detalle" title="Acercar al detalle">＋</button>' +
                    '<button type="button" data-view="zoomout" title="Alejar">−</button>' +
                '</div>' +
                '<div class="lab3d-loading"><div class="lab3d-spin"></div><span>Preparando el modelo 3D…</span></div>' +
                '<div class="lab3d-fail" hidden><div class="lab3d-fail-ico">⚠</div><strong>No se pudo cargar el visor 3D</strong><small></small></div>' +
                '<div class="lab3d-controls">' +
                    '<button type="button" class="lab3d-play">▶ Iniciar análisis</button>' +
                    '<input type="range" class="lab3d-scrub" min="0" max="1000" step="1" value="0" aria-label="Avance de la carga">' +
                    '<span class="lab3d-pct">0 %</span>' +
                    '<select class="lab3d-speed" aria-label="Velocidad"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="2">2×</option></select>' +
                    '<label class="lab3d-toggle"><input type="checkbox" class="lab3d-tgl-pins" checked><span>Etiquetas</span></label>' +
                    '<label class="lab3d-toggle"><input type="checkbox" class="lab3d-tgl-diag" checked><span>Diagramas</span></label>' +
                '</div>' +
            '</div>' +
            '<aside class="lab3d-info">' +
                '<div class="lab3d-info-head"><span>Ficha del modelo</span><strong>' + esc(s.title) + '</strong><em>' + esc(s.desc) + '</em><code>' + esc(s.norma) + '</code></div>' +
                '<h5>Parámetros del modelo</h5><div class="lab3d-params">' + s.controls() + '</div>' +
                '<div class="lab3d-param-actions"><button type="button" class="lab3d-resetparams">↺ Valores típicos</button><button type="button" class="lab3d-save">Guardar corrida</button></div>' +
                '<h5>Componentes</h5><ol class="lab3d-parts">' + parts.map(function (p, i) {
                    return '<li data-part="' + i + '"><span class="lab3d-chip">' + (i + 1) + '</span><div><b>' + esc(p[0]) + '</b><small>' + esc(p[1]) + '</small></div></li>';
                }).join('') + '</ol>' +
                '<h5>Paso a paso del análisis</h5><ol class="lab3d-phases">' + phases.map(function (p, i) {
                    return '<li data-phase="' + i + '"><span class="lab3d-ph-n">' + (i + 1) + '</span><div><b>' + esc(p.t) + '</b><small>' + esc(p.d) + '</small></div></li>';
                }).join('') + '</ol>' +
                '<p class="lab3d-note"></p>' +
            '</aside>' +
            '<div class="lab3d-footer">' +
                '<div class="lab3d-paso"><span class="lab3d-paso-n">Paso 1 / ' + phases.length + '</span><b class="lab3d-paso-t">' + esc((phases[0] || {}).t || '') + '</b><span class="lab3d-paso-d">' + esc((phases[0] || {}).d || '') + '</span></div>' +
                '<div class="lab3d-resultados"><h5>Lecturas del modelo</h5><div class="lab3d-res-grid"></div></div>' +
            '</div>' +
        '</div>';
    }

    function disposeObject(obj) {
        if (!obj) return;
        obj.traverse(function (o) {
            if (o.geometry) o.geometry.dispose();
            if (o.material) {
                var mats = Array.isArray(o.material) ? o.material : [o.material];
                mats.forEach(function (m) {
                    if (m.map) m.map.dispose();
                    if (m.envMap) m.envMap.dispose();
                    m.dispose();
                });
            }
        });
    }

    function mount(host, id, opts) {
        opts = opts || {};
        var S = global.EstruSim;
        var s = S && S.sims && S.sims[id];
        if (!host) return null;
        if (!s) { host.innerHTML = '<p class="login-hint">El simulador no está disponible.</p>'; return null; }
        var P = Object.assign({}, s.defaults, opts.P || {});
        var state = {
            host: host, id: id, s: s, P: P, p: 0, playing: false, speed: 1, raf: 0, animRaf: 0, lastAnim: 0, lastFrame: 0,
            disposed: false, diagramsOn: true, pinsOn: true, model: null, r: null,
            renderer: null, scene: null, camera: null, canvasHost: null, pinsHost: null,
            stage: null, lab: null, paramsBox: null, info: null, resizeObs: null,
            cam: null, goal: null, bounds: null, pinEls: [], phaseEls: [], partEls: [],
            pointer: null, lastPinFrame: 0, stageGroup: null, keyLight: null
        };
        host.innerHTML = template(s, id);
        state.lab = host.querySelector('.lab3d');
        state.stage = host.querySelector('.lab3d-stage');
        state.canvasHost = host.querySelector('.lab3d-canvas');
        state.pinsHost = host.querySelector('.lab3d-pins');
        state.paramsBox = host.querySelector('.lab3d-params');
        state.info = host.querySelector('.lab3d-info');
        state.phaseEls = Array.prototype.slice.call(host.querySelectorAll('.lab3d-phases li'));
        state.partEls = Array.prototype.slice.call(host.querySelectorAll('.lab3d-parts li'));
        state.pinEls = [];
        bindUI();
        syncControls();
        ensureThree().then(function () {
            if (state.disposed) return;
            initScene();
        }).catch(function (err) {
            if (state.disposed) return;
            showFail(err && err.message ? err.message : 'Three.js no está disponible.');
        });
        var api = {
            dispose: dispose,
            refresh: function () { if (state.scene) rebuild(); },
            getP: function () { return Object.assign({}, P); }
        };
        INSTANCES.push(api);
        return api;

        function showFail(msg) {
            var fail = host.querySelector('.lab3d-fail');
            var load = host.querySelector('.lab3d-loading');
            if (load) load.hidden = true;
            if (fail) { fail.hidden = false; var sm = fail.querySelector('small'); if (sm) sm.textContent = msg + ' Revisa la conexión o usa la vista 2D.'; }
            state.stage.classList.add('is-fail');
        }

        function initScene() {
            var w = Math.max(320, state.canvasHost.clientWidth || 800);
            var h = Math.max(320, state.canvasHost.clientHeight || 520);
            var renderer = new T.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
            renderer.setPixelRatio(Math.min(2, global.devicePixelRatio || 1));
            renderer.setSize(w, h, false);
            renderer.shadowMap.enabled = true;
            renderer.shadowMap.type = T.PCFSoftShadowMap;

            renderer.domElement.style.width = '100%';
            renderer.domElement.style.height = '100%';
            renderer.domElement.style.display = 'block';
            state.canvasHost.appendChild(renderer.domElement);
            state.renderer = renderer;

            var scene = new T.Scene();
            scene.background = new T.Color(0x0B1220);
            scene.fog = new T.Fog(0x0B1220, 18, 44);
            state.scene = scene;

            var camera = new T.PerspectiveCamera(38, w / h, 0.08, 180);
            state.camera = camera;

            scene.add(new T.AmbientLight(0xB0C4DE, 0.55));
            scene.add(new T.HemisphereLight(0xA7B4C8, 0x0B1220, 0.45));
            var key = new T.DirectionalLight(0xFFFFFF, 1.1);
            key.position.set(8, 14, 9);
            key.castShadow = true;
            key.shadow.mapSize.width = 2048; key.shadow.mapSize.height = 2048;
            key.shadow.bias = -0.0004;
            key.shadow.normalBias = 0.02;
            scene.add(key); state.keyLight = key;
            var fill = new T.DirectionalLight(new T.Color(s.accent), 0.35);
            fill.position.set(-9, 7, -7); scene.add(fill);
            var rim = new T.DirectionalLight(0x2DD4BF, 0.22);
            rim.position.set(-5, 9, 8); scene.add(rim);

            state.bounds = { size: 8, target: [0, 1, 0] };
            state.cam = { theta: 0.62, phi: 1.12, radius: 9, tx: 0, ty: 1, tz: 0 };
            state.goal = { theta: 0.62, phi: 1.12, radius: 9, tx: 0, ty: 1, tz: 0 };
            resize();
            bindOrbit();
            bindResize();
            rebuild(true);
            var loading = host.querySelector('.lab3d-loading');
            if (loading) loading.hidden = true;
            state.lastFrame = performance.now();
            state.raf = requestAnimationFrame(tick);
        }

        function bindResize() {
            function onResize() { resize(); }
            if (global.ResizeObserver) {
                state.resizeObs = new global.ResizeObserver(onResize);
                state.resizeObs.observe(state.canvasHost);
            } else {
                global.addEventListener('resize', onResize);
            }
        }
        function resize() {
            if (!state.renderer || !state.camera || !state.canvasHost) return;
            var w = Math.max(240, state.canvasHost.clientWidth || 0);
            var h = Math.max(260, state.canvasHost.clientHeight || 0);
            if (!w || !h) return;
            state.renderer.setSize(w, h, false);
            state.camera.aspect = w / h;
            state.camera.updateProjectionMatrix();
        }

        function rebuild(first) {
            if (!state.scene) return;
            var oldSize = state.bounds && state.bounds.size || 8;
            if (state.model) {
                state.scene.remove(state.model.root);
                disposeObject(state.model.root);
                state.model = null;
            }
            if (state.stageGroup) {
                state.scene.remove(state.stageGroup);
                disposeObject(state.stageGroup);
                state.stageGroup = null;
            }
            var r;
            try { r = s.compute(P); }
            catch (e) {
                showFail(e && (e.userMessage || e.message) || 'Revisa los parámetros.');
                return;
            }
            state.r = r;
            var model;
            try { model = BUILDERS[id](P, r, s.accent); }
            catch (e) {
                showFail(e && (e.userMessage || e.message) || 'No se pudo construir el modelo.');
                return;
            }
            state.model = model;
            state.scene.add(model.root);
            var failEl = host.querySelector('.lab3d-fail');
            if (failEl) failEl.hidden = true;
            state.stage.classList.remove('is-fail');
            state.bounds = model.bounds || { size: 8, target: [0, 1, 0] };
            buildStage(state.bounds.size);
            var camDefs = cameraFor(state.bounds);
            state.camDefs = camDefs;
            var newSize = state.bounds.size || 8;
            var scale = first ? 1 : newSize / Math.max(0.001, oldSize);
            if (first) {
                setGoal(camDefs.home, true);
            } else {
                state.goal.radius = clamp(state.goal.radius * scale, newSize * 0.45, newSize * 3.2);
                state.goal.tx = camDefs.target[0]; state.goal.ty = camDefs.target[1]; state.goal.tz = camDefs.target[2];
                state.cam.radius = clamp(state.cam.radius * scale, newSize * 0.45, newSize * 3.2);
            }
            updatePins();
            updateResults();
            updateNote();
            apply();
        }

        function buildStage(size) {
            var g = new T.Group();
            var radius = Math.max(13, size * 1.95);
            var floor = new T.Mesh(new T.CircleGeometry(radius, 80), new T.MeshStandardMaterial({ color: 0x111A2B, metalness: 0.1, roughness: 0.92 }));
            floor.rotation.x = -Math.PI / 2; floor.position.y = -0.035; floor.receiveShadow = true; g.add(floor);
            var ring = new T.Mesh(new T.RingGeometry(radius * 0.92, radius, 96), new T.MeshBasicMaterial({ color: 0x2B3A50, transparent: true, opacity: 0.34, side: T.DoubleSide }));
            ring.rotation.x = -Math.PI / 2; ring.position.y = 0.006; g.add(ring);
            var grid = new T.GridHelper(radius * 2, Math.max(24, Math.round(radius * 2.4)), 0x233247, 0x111A2A);
            grid.position.y = 0.002; grid.material.transparent = true; grid.material.opacity = 0.26; g.add(grid);
            state.scene.add(g);
            state.stageGroup = g;
            if (state.keyLight) {
                var d = Math.max(10, size * 2.2);
                state.keyLight.position.set(d * 0.55, d * 0.95, d * 0.62);
                var sc = state.keyLight.shadow.camera;
                sc.left = -d; sc.right = d; sc.top = d; sc.bottom = -d; sc.near = 0.5; sc.far = d * 3;
                sc.updateProjectionMatrix();
            }
            state.scene.fog.near = Math.max(20, size * 2.2);
            state.scene.fog.far = Math.max(42, size * 4.4);
        }

        function setGoal(def, immediate) {
            if (!def) return;
            var target = def.target || state.camDefs.target;
            state.goal.theta = def.theta; state.goal.phi = def.phi; state.goal.radius = def.radius;
            state.goal.tx = target[0]; state.goal.ty = target[1]; state.goal.tz = target[2];
            if (immediate) {
                state.cam.theta = state.goal.theta; state.cam.phi = state.goal.phi; state.cam.radius = state.goal.radius;
                state.cam.tx = state.goal.tx; state.cam.ty = state.goal.ty; state.cam.tz = state.goal.tz;
            }
        }

        function apply() {
            if (!state.model) return;
            var p = clamp(state.p, 0, 1);
            state.model.set(p);
            if (state.model.diagrams) state.model.diagrams.visible = state.diagramsOn && p > 0.012;
            var pct = Math.round(p * 100);
            var scr = host.querySelector('.lab3d-scrub');
            if (scr && scr.value !== String(pct * 10)) scr.value = String(pct * 10);
            var pctEl = host.querySelector('.lab3d-pct');
            if (pctEl) pctEl.textContent = pct + ' %';
            updatePhase(p);
            updatePlayBtn();
        }

        function updatePlayBtn() {
            var b = host.querySelector('.lab3d-play');
            if (!b) return;
            if (state.playing) { b.textContent = '⏸ Pausar'; b.classList.add('is-playing'); }
            else if (state.p >= 1) { b.textContent = '↻ Repetir'; b.classList.remove('is-playing'); }
            else if (state.p > 0) { b.textContent = '▶ Continuar'; b.classList.remove('is-playing'); }
            else { b.textContent = '▶ Iniciar análisis'; b.classList.remove('is-playing'); }
        }

        function updatePhase(p) {
            var steps = s.steps || [];
            if (!steps.length) return;
            var n = steps.length;
            var k = p >= 1 ? n - 1 : Math.min(n - 1, Math.floor(p * n));
            var st = steps[k];
            var pn = host.querySelector('.lab3d-paso-n');
            var pt = host.querySelector('.lab3d-paso-t');
            var pd = host.querySelector('.lab3d-paso-d');
            if (pn) pn.textContent = 'Paso ' + (k + 1) + ' / ' + n;
            if (pt) pt.textContent = st.t;
            if (pd) pd.textContent = st.d;
            state.phaseEls.forEach(function (li, i) {
                li.classList.toggle('is-on', i === k);
                li.classList.toggle('is-done', i < k);
            });
            var stat = host.querySelector('.lab3d-state');
            if (stat) {
                var b = stat.querySelector('b');
                stat.classList.toggle('is-run', state.playing);
                stat.classList.toggle('is-done', p >= 1 && !state.playing);
                if (b) b.textContent = p >= 1 ? 'Análisis completado' : (state.playing ? 'Aplicando carga…' : (p > 0 ? 'Paso ' + (k + 1) + ' · ' + st.t : 'Listo para iniciar'));
            }
        }

        function updateResults() {
            var box = host.querySelector('.lab3d-res-grid');
            if (!box || !state.r) return;
            var tiles;
            try { tiles = s.tiles(state.r, P); } catch (e) { tiles = []; }
            box.innerHTML = tiles.map(function (t) {
                return '<div class="lab3d-res-tile' + (t.tone ? ' is-' + t.tone : '') + '"><span>' + esc(t.l) + '</span><strong>' + t.v + '</strong>' + (t.s ? '<small>' + t.s + '</small>' : '') + '</div>';
            }).join('');
        }

        function updateNote() {
            var n = host.querySelector('.lab3d-note');
            if (!n || !state.r) return;
            try { n.innerHTML = s.note(state.r, P); } catch (e) { n.textContent = ''; }
        }

        function updatePins() {
            if (!state.pinsHost) return;
            state.pinsHost.innerHTML = '';
            state.pinEls = [];
            var pins = (state.model && state.model.pins) || [];
            pins.forEach(function (pin, i) {
                var b = doc.createElement('button');
                b.type = 'button'; b.className = 'lab3d-pin'; b.setAttribute('data-pin', i);
                b.innerHTML = '<span>' + (i + 1) + '</span><em><b>' + esc(pin.n) + '</b><small>' + esc(pin.d) + '</small></em>';
                b.addEventListener('mouseenter', function () { highlightPart(i, true); });
                b.addEventListener('mouseleave', function () { highlightPart(i, false); });
                b.addEventListener('focus', function () { highlightPart(i, true); });
                b.addEventListener('blur', function () { highlightPart(i, false); });
                b.addEventListener('click', function (e) {
                    e.preventDefault();
                    var open = b.classList.contains('pin-open');
                    state.pinEls.forEach(function (x) { x.el.classList.remove('pin-open'); });
                    if (!open) b.classList.add('pin-open');
                });
                state.pinsHost.appendChild(b);
                state.pinEls.push({ el: b, v: new T.Vector3(pin.v[0], pin.v[1], pin.v[2]) });
            });
            state.partEls.forEach(function (li, i) {
                li.style.display = i < pins.length ? '' : 'none';
                var chip = li.querySelector('.lab3d-chip');
                if (chip) chip.textContent = i + 1;
            });
        }
        function highlightPart(i, on) {
            var li = state.partEls[i]; if (li) li.classList.toggle('hl', !!on);
            var pe = state.pinEls[i]; if (pe) pe.el.classList.toggle('hl', !!on);
        }

        function bindUI() {
            var params = state.paramsBox;
            function onCtl(e) {
                var t = e.target;
                if (!t || !t.getAttribute || !t.getAttribute('data-k')) return;
                var k = t.getAttribute('data-k');
                if (t.tagName === 'SELECT') P[k] = (t.value !== '' && isFinite(+t.value)) ? +t.value : t.value;
                else {
                    P[k] = parseFloat(t.value);
                    var out = doc.getElementById(t.id + 'V');
                    if (out) out.textContent = fmt(parseFloat(t.value), parseInt(t.getAttribute('data-dec') || '0', 10)) + (t.getAttribute('data-unit') || '');
                }
                if (opts.onP) opts.onP(Object.assign({}, P));
                stop();
                state.p = 1;
                rebuild(false);
            }
            params.addEventListener('input', onCtl);
            params.addEventListener('change', onCtl);
            var reset = host.querySelector('.lab3d-resetparams');
            if (reset) reset.addEventListener('click', function () {
                P = Object.assign({}, s.defaults);
                if (opts.onP) opts.onP(Object.assign({}, P));
                syncControls();
                stop(); state.p = 0; rebuild(false);
            });
            var save = host.querySelector('.lab3d-save');
            if (save) save.addEventListener('click', function () {
                if (!opts.onSave) return;
                try { opts.onSave(Object.assign({}, P)); }
                catch (e) {}
                var old = save.textContent;
                save.textContent = '✓ Guardado';
                setTimeout(function () { save.textContent = old; }, 1800);
            });
            var play = host.querySelector('.lab3d-play');
            if (play) play.addEventListener('click', togglePlay);
            var scr = host.querySelector('.lab3d-scrub');
            if (scr) scr.addEventListener('input', function () {
                stop(); state.p = clamp(parseFloat(scr.value) / 1000, 0, 1); apply();
            });
            var speed = host.querySelector('.lab3d-speed');
            if (speed) speed.addEventListener('change', function () { state.speed = parseFloat(speed.value) || 1; });
            var pins = host.querySelector('.lab3d-tgl-pins');
            if (pins) pins.addEventListener('change', function () {
                state.pinsOn = pins.checked; state.stage.classList.toggle('pins-off', !pins.checked);
            });
            var diag = host.querySelector('.lab3d-tgl-diag');
            if (diag) diag.addEventListener('change', function () {
                state.diagramsOn = diag.checked; apply();
            });
            host.querySelectorAll('.lab3d-views [data-view]').forEach(function (b) {
                b.addEventListener('click', function () {
                    var v = b.getAttribute('data-view');
                    if (v === 'zoomout') { state.goal.radius = clamp(state.goal.radius * 1.22, state.bounds.size * 0.4, state.bounds.size * 3.4); return; }
                    var def = state.camDefs && state.camDefs[v];
                    if (def) setGoal(def, false);
                    host.querySelectorAll('.lab3d-views [data-view]').forEach(function (x) { x.classList.toggle('on', x === b); });
                });
            });
            state.phaseEls.forEach(function (li) {
                li.addEventListener('click', function () {
                    var i = parseInt(li.getAttribute('data-phase'), 10);
                    var n = (s.steps || []).length || 1;
                    stop(); state.p = i >= n - 1 ? 1 : (i + 0.5) / n; apply();
                });
            });
            state.partEls.forEach(function (li, i) {
                li.addEventListener('mouseenter', function () { highlightPart(i, true); });
                li.addEventListener('mouseleave', function () { highlightPart(i, false); });
                li.addEventListener('click', function () {
                    var pe = state.pinEls[i]; if (!pe) return;
                    var open = pe.el.classList.contains('pin-open');
                    state.pinEls.forEach(function (x) { x.el.classList.remove('pin-open'); });
                    if (!open) pe.el.classList.add('pin-open');
                });
            });
        }

        function syncControls() {
            if (!state.paramsBox) return;
            state.paramsBox.querySelectorAll('[data-k]').forEach(function (el) {
                var k = el.getAttribute('data-k');
                if (P[k] == null) return;
                el.value = P[k];
                var out = doc.getElementById(el.id + 'V');
                if (out) out.textContent = fmt(P[k], parseInt(el.getAttribute('data-dec') || '0', 10)) + (el.getAttribute('data-unit') || '');
            });
        }

        function togglePlay() {
            if (state.playing) { stop(); apply(); return; }
            if (state.p >= 1) state.p = 0;
            state.playing = true;
            state.lastAnim = performance.now();
            state.animRaf = requestAnimationFrame(loop);
            updatePlayBtn();
        }
        function stop() {
            state.playing = false;
            if (state.animRaf) cancelAnimationFrame(state.animRaf);
            state.animRaf = 0;
        }
        function loop(now) {
            if (!state.playing || state.disposed) return;
            var dt = Math.min(80, now - state.lastAnim); state.lastAnim = now;
            state.p = Math.min(1, state.p + dt * state.speed / 12000);
            apply();
            if (state.p >= 1) { stop(); apply(); return; }
            state.animRaf = requestAnimationFrame(loop);
        }

        function bindOrbit() {
            var el = state.canvasHost;
            if (!el) return;
            el.addEventListener('pointerdown', function (e) {
                state.pointer = { x: e.clientX, y: e.clientY, theta: state.goal.theta, phi: state.goal.phi };
                try { el.setPointerCapture(e.pointerId); } catch (x) {}
                state.stage.classList.add('is-drag');
            });
            el.addEventListener('pointermove', function (e) {
                if (!state.pointer) return;
                var dx = e.clientX - state.pointer.x, dy = e.clientY - state.pointer.y;
                state.goal.theta = state.pointer.theta - dx * 0.008;
                state.goal.phi = clamp(state.pointer.phi - dy * 0.006, 0.28, 1.46);
            });
            function up() { state.pointer = null; state.stage.classList.remove('is-drag'); }
            el.addEventListener('pointerup', up);
            el.addEventListener('pointercancel', up);
            el.addEventListener('wheel', function (e) {
                e.preventDefault();
                var f = Math.exp(e.deltaY * 0.0011);
                state.goal.radius = clamp(state.goal.radius * f, state.bounds.size * 0.38, state.bounds.size * 3.6);
            }, { passive: false });
            el.addEventListener('dblclick', function () { if (state.camDefs) setGoal(state.camDefs.home, false); });
        }

        function tick(now) {
            if (state.disposed) return;
            var dt = Math.min(80, now - state.lastFrame); state.lastFrame = now;
            var k = 1 - Math.exp(-dt * 0.0065);
            state.cam.theta += (state.goal.theta - state.cam.theta) * k;
            state.cam.phi += (state.goal.phi - state.cam.phi) * k;
            state.cam.radius += (state.goal.radius - state.cam.radius) * k;
            state.cam.tx += (state.goal.tx - state.cam.tx) * k;
            state.cam.ty += (state.goal.ty - state.cam.ty) * k;
            state.cam.tz += (state.goal.tz - state.cam.tz) * k;
            var c = state.cam;
            var sp = Math.sin(c.phi), cp = Math.cos(c.phi);
            state.camera.position.set(c.tx + c.radius * sp * Math.sin(c.theta), c.ty + c.radius * cp, c.tz + c.radius * sp * Math.cos(c.theta));
            state.camera.lookAt(c.tx, c.ty, c.tz);
            state.renderer.render(state.scene, state.camera);
            if (state.pinsOn && now - state.lastPinFrame > 28) {
                state.lastPinFrame = now;
                projectPins();
            }
            state.raf = requestAnimationFrame(tick);
        }
        function projectPins() {
            if (!state.pinEls.length || !state.camera) return;
            var w = state.canvasHost.clientWidth, h = state.canvasHost.clientHeight;
            var v = new T.Vector3();
            state.pinEls.forEach(function (pe) {
                v.copy(pe.v).project(state.camera);
                var visible = v.z > -1 && v.z < 1 && v.x > -1.05 && v.x < 1.05 && v.y > -1.05 && v.y < 1.05;
                pe.el.style.display = visible ? '' : 'none';
                if (!visible) return;
                var x = (v.x * 0.5 + 0.5) * w, y = (-v.y * 0.5 + 0.5) * h;
                pe.el.style.transform = 'translate3d(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px,0)';
            });
        }

        function dispose() {
            state.disposed = true;
            stop();
            if (state.raf) cancelAnimationFrame(state.raf);
            state.raf = 0;
            if (state.resizeObs) { try { state.resizeObs.disconnect(); } catch (e) {} }
            if (state.renderer) {
                try { state.renderer.dispose(); state.renderer.forceContextLoss(); } catch (e) {}
                if (state.renderer.domElement && state.renderer.domElement.parentNode) state.renderer.domElement.parentNode.removeChild(state.renderer.domElement);
            }
            if (state.scene) disposeObject(state.scene);
            state.scene = null; state.camera = null; state.renderer = null;
            host.innerHTML = '';
            var idx = INSTANCES.indexOf(api);
            if (idx >= 0) INSTANCES.splice(idx, 1);
        }
    }

    global.EstruLab3D = {
        mount: mount,
        disposeAll: function () {
            INSTANCES.slice().forEach(function (i) { try { i.dispose(); } catch (e) {} });
            INSTANCES = [];
        }
    };
})(window);
