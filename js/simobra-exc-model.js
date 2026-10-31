/**
 * Simulador de Obra 3D — MODELO 3D de la excavadora (referencia: mini-excavadora amarilla de orugas).
 * Piezas independientes con articulaciones propias: chasis, 2 orugas (placas animadas + ruedas), plataforma
 * giratoria, cabina con cristales, brazo principal (boom), brazo secundario (stick), cucharón, 3 cilindros
 * hidráulicos que cambian de longitud, luces y operador. Solo geometría: la lógica vive en simobra-exc-sim.js.
 *
 * Marco local: la máquina mira hacia -Z, +Y arriba, +X a la derecha.
 */
(function (G) {
    'use strict';
    var DIM = {
        gauge: 2.1, trackLen: 3.1, trackW: 0.75, upperY: 0.9,
        pivot: [0.3, 0.25, -1.1],      /* pie del brazo, en el marco de la plataforma */
        L1: 2.91, hump: 0.035,         /* brazo principal (pivote → codo) */
        L2: 1.55,                      /* brazo secundario */
        L3: 0.98,                      /* pivote del cucharón → dientes */
        cab: [-0.55, 0.82, -0.15], eye: [-0.55, 1.78, -0.1]
    };
    var CYAN = 0xdbe9ef;

    function build(THREE) {
        var geoCache = {};
        function mat(color, o) { o = o || {}; return new THREE.MeshPhongMaterial({ color: color, shininess: o.sh == null ? 55 : o.sh, specular: o.sp == null ? 0x333333 : o.sp, transparent: !!o.tr, opacity: o.op == null ? 1 : o.op, side: o.side || THREE.FrontSide, emissive: o.em || 0x000000 }); }
        var M = {
            yellow: mat(0xf5bd12, { sh: 70, sp: 0x666644 }), dark: mat(0x3a3b3f, { sh: 30 }), tread: mat(0x1f2023, { sh: 10, sp: 0x111111 }), tire: mat(0x1c1c1e, { sh: 8 }), rim: mat(0xcfd3d7, { sh: 80, sp: 0x888888 }),
            glass: mat(CYAN, { sh: 120, sp: 0xffffff, tr: true, op: 0.34, side: THREE.DoubleSide }), brown: mat(0x7a3a22, { sh: 25 }), bucket: mat(0x46474b, { sh: 60, sp: 0x777777, side: THREE.DoubleSide }), chrome: mat(0xc9ced2, { sh: 120, sp: 0xffffff }), cyl: mat(0x2b2c2f, { sh: 40 }),
            lamp: mat(0xfff3b0, { em: 0xffe9a0 }), red: mat(0xd02a1f, { em: 0x400000 }), soil: mat(0x6b4a2c, { sh: 5, sp: 0x000000 }), vest: mat(0xff7a1a), skin: mat(0xe0ac84), hat: mat(0xf4f4f4), seat: mat(0x232326, { sh: 10 })
        };
        function rbox(w, h, d, r) {
            var key = [w, h, d, r].join('|'); if (geoCache[key]) return geoCache[key];
            var bt = Math.max(0.01, Math.min(r * 0.7, d / 2 - 0.005, w / 2 - 0.01, h / 2 - 0.01)), ww = w - 2 * bt, hh = h - 2 * bt, rr = Math.max(0.005, Math.min(r - bt, ww / 2 - 0.002, hh / 2 - 0.002)), sh = new THREE.Shape();
            sh.moveTo(-ww / 2 + rr, -hh / 2); sh.lineTo(ww / 2 - rr, -hh / 2); sh.quadraticCurveTo(ww / 2, -hh / 2, ww / 2, -hh / 2 + rr); sh.lineTo(ww / 2, hh / 2 - rr); sh.quadraticCurveTo(ww / 2, hh / 2, ww / 2 - rr, hh / 2); sh.lineTo(-ww / 2 + rr, hh / 2); sh.quadraticCurveTo(-ww / 2, hh / 2, -ww / 2, hh / 2 - rr); sh.lineTo(-ww / 2, -hh / 2 + rr); sh.quadraticCurveTo(-ww / 2, -hh / 2, -ww / 2 + rr, -hh / 2);
            var dep = Math.max(0.01, d - 2 * bt), g = new THREE.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelOffset: -0.0, bevelSegments: 2, curveSegments: 3 }); g.translate(0, 0, -dep / 2); return (geoCache[key] = g);
        }
        function rb(parent, w, h, d, r, m, x, y, z, rx, ry, rz) { var o = new THREE.Mesh(rbox(w, h, d, r), m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
        function bx(parent, w, h, d, m, x, y, z, rx) { var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (rx) o.rotation.x = rx; o.castShadow = true; parent.add(o); return o; }
        function cylX(parent, r, w, m, x, y, z) { var o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 18), m); o.rotation.z = Math.PI / 2; o.position.set(x, y, z); o.castShadow = true; parent.add(o); return o; }

        var root = new THREE.Group(); root.rotation.order = 'YXZ';
        /* ---------- orugas ---------- */
        var R = 0.42, LS = 2.2, PER = 2 * LS + 2 * Math.PI * R, NP = 34, tracks = [];
        function mkTrack(sx) {
            var g = new THREE.Group(); g.position.set(sx * DIM.gauge / 2, 0, 0); root.add(g);
            rb(g, 0.46, 0.5, 2.7, 0.14, M.dark, 0, 0.45, 0);                                   /* bastidor de la oruga */
            var plates = [], i, pm = new THREE.BoxGeometry(0.74, 0.07, 0.2);
            for (i = 0; i < NP; i++) { var p = new THREE.Mesh(pm, M.tread); p.castShadow = true; g.add(p); plates.push(p); }
            var wheels = [];
            [-LS / 2, LS / 2].forEach(function (z) {
                var pv = new THREE.Group(); pv.position.set(0, R, z); g.add(pv);
                var w = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.05, R - 0.05, 0.7, 20), M.tire); w.rotation.z = Math.PI / 2; w.castShadow = true; pv.add(w);
                [-1, 1].forEach(function (s) { var r2 = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 20), M.rim); r2.rotation.z = Math.PI / 2; r2.position.x = s * 0.36; pv.add(r2); var hb = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 10), M.dark); hb.rotation.z = Math.PI / 2; hb.position.x = s * 0.37; pv.add(hb); for (var q = 0; q < 5; q++) { var bolt = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 0.04), M.dark); var a = q / 5 * 6.283; bolt.position.set(s * 0.385, Math.sin(a) * 0.17, Math.cos(a) * 0.17); pv.add(bolt); } });
                wheels.push(pv);
            });
            [-0.55, 0, 0.55].forEach(function (z) { var rw = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.62, 12), M.dark); rw.rotation.z = Math.PI / 2; rw.position.set(0, 0.18, z); g.add(rw); });
            var t = { g: g, plates: plates, wheels: wheels, phase: 0 }; tracks.push(t); return t;
        }
        var trkL = mkTrack(-1), trkR = mkTrack(1);
        function placePlates(t) {
            for (var i = 0; i < NP; i++) {
                var s = ((i / NP) * PER + t.phase) % PER; if (s < 0) s += PER; var y, z, rx;
                if (s < LS) { z = LS / 2 - s; y = 2 * R; rx = 0; }                                       /* tramo superior hacia delante */
                else if (s < LS + Math.PI * R) { var a = (s - LS) / R; z = -LS / 2 - Math.sin(a) * R; y = R + Math.cos(a) * R; rx = a; }
                else if (s < 2 * LS + Math.PI * R) { z = -LS / 2 + (s - LS - Math.PI * R); y = 0; rx = Math.PI; }
                else { var a2 = (s - 2 * LS - Math.PI * R) / R; z = LS / 2 + Math.sin(a2) * R; y = R - Math.cos(a2) * R; rx = Math.PI + a2; }
                var p = t.plates[i]; p.position.set(0, y + 0.0, z); p.rotation.x = rx;
            }
        }
        placePlates(trkL); placePlates(trkR);
        /* ---------- chasis inferior ---------- */
        rb(root, 1.7, 0.5, 2.5, 0.16, M.dark, 0, 0.62, 0);
        var ring = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.14, 28), M.dark); ring.position.y = 0.88; ring.castShadow = true; root.add(ring);
        /* ---------- plataforma giratoria ---------- */
        var upper = new THREE.Group(); upper.position.y = DIM.upperY; root.add(upper);
        rb(upper, 2.35, 0.76, 2.7, 0.2, M.yellow, 0, 0.43, 0.12);
        rb(upper, 2.3, 0.9, 0.75, 0.22, M.brown, 0, 0.55, 1.55);                              /* contrapeso */
        rb(upper, 1.0, 0.36, 1.0, 0.14, M.yellow, 0.55, 1.08, 0.7);                           /* capó del motor */
        var ex = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.45, 8), M.dark); ex.position.set(0.9, 1.42, 0.55); upper.add(ex);
        [-0.7, 0.7].forEach(function (x) { bx(upper, 0.28, 0.14, 0.04, M.red, x, 0.6, 1.93); });
        /* ---------- cabina ---------- */
        var cab = new THREE.Group(); cab.position.set(DIM.cab[0], DIM.cab[1], DIM.cab[2]); upper.add(cab);
        rb(cab, 1.2, 0.34, 1.36, 0.1, M.yellow, 0, 0.17, 0);
        [[-0.56, -0.64], [0.56, -0.64], [-0.56, 0.64], [0.56, 0.64]].forEach(function (p) { rb(cab, 0.09, 1.0, 0.09, 0.03, M.yellow, p[0], 0.84, p[1]); });
        bx(cab, 1.04, 0.84, 0.03, M.glass, 0, 0.84, -0.65); bx(cab, 1.04, 0.84, 0.03, M.glass, 0, 0.84, 0.65); bx(cab, 0.03, 0.84, 1.2, M.glass, -0.57, 0.84, 0); bx(cab, 0.03, 0.84, 1.2, M.glass, 0.57, 0.84, 0);
        rb(cab, 1.5, 0.15, 1.66, 0.08, M.dark, 0, 1.4, 0);                                    /* techo oscuro */
        [-0.4, 0.4].forEach(function (x) { bx(cab, 0.22, 0.1, 0.06, M.lamp, x, 1.36, -0.84); });
        bx(cab, 0.5, 0.08, 0.5, M.seat, 0, 0.45, 0.25); bx(cab, 0.5, 0.55, 0.08, M.seat, 0, 0.72, 0.5);
        [-0.22, 0.22].forEach(function (x) { var lv = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.42, 6), M.dark); lv.position.set(x, 0.6, -0.2); lv.rotation.x = -0.25; cab.add(lv); });
        var oper = new THREE.Group(); oper.visible = false; cab.add(oper);                       /* sin figura de operador: el jugador ES el operador */
        /* ---------- brazo principal ---------- */
        rb(upper, 0.6, 0.55, 0.55, 0.14, M.yellow, DIM.pivot[0], DIM.pivot[1] + 0.05, DIM.pivot[2] + 0.05);       /* pie del brazo */
        var boom = new THREE.Group(); boom.position.set(DIM.pivot[0], DIM.pivot[1], DIM.pivot[2]); upper.add(boom);
        rb(boom, 0.5, 0.46, 1.7, 0.2, M.yellow, 0, 0.27, -0.75, 0.35);
        rb(boom, 0.5, 0.4, 1.55, 0.19, M.yellow, 0, 0.29, -2.205, -0.35);
        var boomPin = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12), M.dark); boomPin.rotation.z = Math.PI / 2; boomPin.castShadow = true; boom.add(boomPin);
        var bLamp = bx(boom, 0.16, 0.08, 0.1, M.lamp, 0, 0.95, -1.55);
        var anBoomA = new THREE.Object3D(); anBoomA.position.set(-0.3, 0.62, -0.95); boom.add(anBoomA);
        var anBoomB = new THREE.Object3D(); anBoomB.position.set(-0.3, 0.68, -1.7); boom.add(anBoomB);
        /* ---------- brazo secundario ---------- */
        var stick = new THREE.Group(); stick.position.set(0, DIM.hump, -DIM.L1); boom.add(stick);
        var pinE = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.45, 12), M.dark); pinE.rotation.z = Math.PI / 2; stick.add(pinE);
        rb(stick, 0.34, 0.36, 1.7, 0.15, M.yellow, 0, 0, -0.75);
        rb(stick, 0.26, 0.55, 0.42, 0.1, M.yellow, 0, 0.3, 0.1, 0.3);                                /* aleta trasera del codo */
        var anStickA = new THREE.Object3D(); anStickA.position.set(-0.3, 0.42, 0.18); stick.add(anStickA);
        var anStickB = new THREE.Object3D(); anStickB.position.set(-0.22, 0.2, -0.95); stick.add(anStickB);
        /* ---------- cucharón ---------- */
        var bkt = new THREE.Group(); bkt.position.set(0, 0, -DIM.L2); stick.add(bkt);
        var pinB = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.4, 12), M.dark); pinB.rotation.z = Math.PI / 2; bkt.add(pinB);
        
        (function () {                                                                                /* cuchara con espesor, nervaduras, labio, dientes y orejas */
            var W2 = 0.47, rad = 0.46, th = 0.045, n = 24, ri = rad - th, mIn = new THREE.MeshPhongMaterial({ color: 0x6d7076, shininess: 90, specular: 0x999999, side: THREE.DoubleSide }), mTooth = new THREE.MeshPhongMaterial({ color: 0xa4aab0, shininess: 100, specular: 0xdddddd }), k, t, t2;
            function Yp(r, tt) { return r * Math.sin(tt) * (0.96 + 0.04 * Math.sin(tt)); }
            function Zp(r, tt) { return -rad - r * Math.cos(tt); }
            function surface(r, mt) {
                var pos = [];
                function P(x, y, z) { pos.push(x, y, z); }
                for (k = 0; k < n; k++) { t = k / n * Math.PI; t2 = (k + 1) / n * Math.PI; P(-W2, Yp(r, t), Zp(r, t)); P(W2, Yp(r, t), Zp(r, t)); P(W2, Yp(r, t2), Zp(r, t2)); P(-W2, Yp(r, t), Zp(r, t)); P(W2, Yp(r, t2), Zp(r, t2)); P(-W2, Yp(r, t2), Zp(r, t2)); }
                var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.computeVertexNormals(); var m = new THREE.Mesh(g, mt); m.castShadow = true; m.receiveShadow = true; bkt.add(m);
            }
            surface(rad, M.bucket); surface(ri, mIn);
            [-1, 1].forEach(function (sd) {                                                                /* placas laterales */
                var sh = new THREE.Shape(); sh.moveTo(rad + 0.0, 0); for (var q = 0; q <= n; q++) { var a = q / n * Math.PI; sh.lineTo(rad + rad * Math.cos(a), Yp(rad, a)); } sh.lineTo(rad + 0.0, 0);
                var pl = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false }), M.bucket); pl.rotation.y = Math.PI / 2; pl.position.x = sd > 0 ? W2 - th : -W2; pl.castShadow = true; bkt.add(pl);
                var cut = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.1, 0.16), mTooth); cut.position.set(sd * (W2 + 0.01), 0.0, -2 * rad + 0.04); bkt.add(cut);   /* cuchilla lateral */
            });
            [-0.28, 0, 0.28].forEach(function (rx) {                                                       /* nervaduras de refuerzo */
                for (var q = 2; q < n - 1; q += 2) { var a = (q + 0.5) / n * Math.PI, rb2 = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.075, 0.1), M.dark); rb2.position.set(rx, Yp(rad + 0.03, a), Zp(rad + 0.03, a)); rb2.rotation.x = -(Math.PI / 2 - a) * 1.0; rb2.castShadow = true; bkt.add(rb2); }
            });
            var lip = new THREE.Mesh(new THREE.BoxGeometry(2 * W2, 0.045, 0.13), mTooth); lip.position.set(0, 0.005, -2 * rad + 0.03); lip.castShadow = true; bkt.add(lip);        /* labio de corte */
            [-0.36, -0.18, 0, 0.18, 0.36].forEach(function (x) {                                           /* 5 dientes: adaptador + punta */
                var sk = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.075, 0.1), M.dark); sk.position.set(x, 0.0, -2 * rad + 0.0); bkt.add(sk);
                var tp = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.17, 4), mTooth); tp.rotation.x = -Math.PI / 2; tp.rotation.z = Math.PI / 4; tp.position.set(x, -0.005, -2 * rad - 0.1); tp.castShadow = true; bkt.add(tp);
            });
            [-1, 1].forEach(function (sd) {                                                                 /* orejas de articulación */
                var ear = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.3, 0.3), M.bucket); ear.position.set(sd * 0.2, 0.24, -0.14); ear.castShadow = true; bkt.add(ear);
                var hole = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.07, 10), M.chrome); hole.rotation.z = Math.PI / 2; hole.position.set(sd * 0.2, 0.34, -0.12); bkt.add(hole);
            });
            var back = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.2), M.bucket); back.position.set(0, 0.2, -0.1); back.rotation.x = 0.25; back.castShadow = true; bkt.add(back);   /* placa trasera */
        })();
        var soil = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M.soil); soil.position.set(0, 0.12, -0.46); soil.visible = false; bkt.add(soil);
        var anBktA = new THREE.Object3D(); anBktA.position.set(-0.2, 0.34, -0.12); bkt.add(anBktA);
        /* ---------- cilindros hidráulicos (barril + vástago cromado) ---------- */
        function mkCyl(parent) {
            var g = new THREE.Group(); parent.add(g); var b = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 1, 10), M.cyl); b.castShadow = true; var r = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 8), M.chrome); g.add(b, r); return { g: g, b: b, r: r };
        }
        var cyBoom = mkCyl(upper), cyStick = mkCyl(boom), cyBkt = mkCyl(stick);
        var anUpper = new THREE.Vector3(DIM.pivot[0] - 0.3, 0.12, DIM.pivot[2] + 0.35), anStickBk = new THREE.Vector3(-0.3, 0.2, -0.85), v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0), q = new THREE.Quaternion();
        function placeCyl(c, a, b) {
            var dir = v2.copy(b).sub(a), len = dir.length(); if (len < 1e-4) return; dir.multiplyScalar(1 / len); c.g.position.copy(a); c.g.quaternion.setFromUnitVectors(up, dir);
            var lb = Math.min(len * 0.55, 1.15); c.b.scale.y = lb; c.b.position.y = lb / 2; c.r.scale.y = Math.max(0.01, len - lb + 0.1); c.r.position.y = lb + (len - lb) / 2 - 0.05;
        }
        function setPose(m) {
            root.position.set(m.x, m.y, m.z); root.rotation.set(m.pitch, m.yaw, m.roll); upper.rotation.y = m.swing; boom.rotation.x = m.boom; stick.rotation.x = -m.stick; bkt.rotation.x = -m.bucket;
            root.updateMatrixWorld(true);
            /* cilindro del brazo: plataforma → brazo */
            anBoomA.getWorldPosition(v1); upper.worldToLocal(v1); placeCyl(cyBoom, anUpper, v1.clone());
            /* cilindro del brazo secundario: brazo → aleta del codo */
            anStickA.getWorldPosition(v1); boom.worldToLocal(v1); placeCyl(cyStick, anBoomB.position, v1.clone());
            /* cilindro del cucharón: brazo secundario → bielas */
            anBktA.getWorldPosition(v1); stick.worldToLocal(v1); placeCyl(cyBkt, anStickB.position, v1.clone());
        }
        function animate(m, dt) {
            trkL.phase += m.vL * dt; trkR.phase += m.vR * dt; placePlates(trkL); placePlates(trkR);
            trkL.wheels.forEach(function (w) { w.rotation.x += m.vL * dt / (R - 0.05); }); trkR.wheels.forEach(function (w) { w.rotation.x += m.vR * dt / (R - 0.05); });
        }
        function setLoad(vol, cap) { var f = Math.max(0, Math.min(1, vol / cap)); soil.visible = f > 0.02; soil.scale.set(0.42, 0.05 + 0.22 * f, 0.38); soil.position.y = 0.06 + 0.1 * f; }
        function dispose() { root.traverse(function (o) { if (o.geometry && o.geometry !== undefined && !Object.keys(geoCache).some(function (k) { return geoCache[k] === o.geometry; })) o.geometry.dispose(); }); Object.keys(geoCache).forEach(function (k) { geoCache[k].dispose(); }); Object.keys(M).forEach(function (k) { M[k].dispose(); }); }
        return { root: root, upper: upper, boom: boom, stick: stick, bucket: bkt, cab: cab, operator: oper, lamp: bLamp, setPose: setPose, animate: animate, setLoad: setLoad, dispose: dispose, DIM: DIM };
    }
    G.SimObraExcModel = { DIM: DIM, build: build };
})(typeof window !== 'undefined' ? window : globalThis);
