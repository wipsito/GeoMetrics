/**
 * Simulador de Obra 3D — MODELO 3D de la retroexcavadora (cargadora frontal + retro trasera) en amarillo industrial.
 * Piezas con articulaciones propias: chasis, 4 ruedas con taco (las delanteras direccionan), cabina con cristales,
 * brazos de la pala cargadora con su cucharón ancho y 2 cilindros de elevación + 1 de volteo, torre giratoria trasera,
 * boom acodado, balancín, cucharón con dientes, 2 estabilizadores y cilindros hidráulicos. Solo geometría:
 * la lógica vive en simobra-retro-sim.js.   Marco local: la máquina mira hacia -Z, +Y arriba, +X a la derecha.
 */
(function (G) {
    'use strict';
    var DIM = {
        fz: -1.3, rz: 0.9, trF: 0.86, trR: 0.93, rf: 0.5, rr: 0.62,
        eye: [0, 2.1, 0.1],
        lp: [0, 1.55, -0.6], LA: 2.5, LB: 1.0, LW: 2.0,            /* pala cargadora: pivote, brazo, cucharón (arista), ancho */
        bz: 1.95, by: 1.45, L1: 3.0, L2: 2.2, L3: 0.8,             /* retro: poste (z), pivote del boom (y), boom, balancín, cuchara */
        stabX: 1.15
    };
    function build(THREE) {
        var geoCache = {};
        function mat(color, o) { o = o || {}; return new THREE.MeshPhongMaterial({ color: color, shininess: o.sh == null ? 55 : o.sh, specular: o.sp == null ? 0x333333 : o.sp, transparent: !!o.tr, opacity: o.op == null ? 1 : o.op, side: o.side || THREE.FrontSide, emissive: o.em || 0x000000 }); }
        var M = {
            yellow: mat(0xffcd11, { sh: 75, sp: 0x777755 }), yellow2: mat(0xe3b200, { sh: 60 }), dark: mat(0x2a2b2e, { sh: 30 }), black: mat(0x131315, { sh: 20 }), tire: mat(0x19191b, { sh: 6, sp: 0x0c0c0c }),
            rim: mat(0xf2c200, { sh: 80, sp: 0x888866 }), glass: mat(0xcfe3ea, { sh: 120, sp: 0xffffff, tr: true, op: 0.3, side: THREE.DoubleSide }), steel: mat(0x70747a, { sh: 90, sp: 0xaaaaaa, side: THREE.DoubleSide }),
            tooth: mat(0xa9afb5, { sh: 100, sp: 0xdddddd }), chrome: mat(0xc9ced2, { sh: 120, sp: 0xffffff }), cyl: mat(0x2b2c2f, { sh: 40 }), lamp: mat(0xfff3b0, { em: 0xffe9a0 }), amber: mat(0xff9a1a, { em: 0x663000 }),
            red: mat(0xd02a1f, { em: 0x400000 }), white: mat(0xeeeeee, { sh: 20 }), hose: mat(0x0e0e10, { sh: 15 }), soil: mat(0x6b4a2c, { sh: 5, sp: 0x000000 }), seat: mat(0x232326, { sh: 10 })
        };
        function rbox(w, h, d, r) {
            var key = [w, h, d, r].join('|'); if (geoCache[key]) return geoCache[key];
            var bt = Math.max(0.01, Math.min(r * 0.7, d / 2 - 0.005, w / 2 - 0.01, h / 2 - 0.01)), ww = w - 2 * bt, hh = h - 2 * bt, rr = Math.max(0.005, Math.min(r - bt, ww / 2 - 0.002, hh / 2 - 0.002)), sh = new THREE.Shape();
            sh.moveTo(-ww / 2 + rr, -hh / 2); sh.lineTo(ww / 2 - rr, -hh / 2); sh.quadraticCurveTo(ww / 2, -hh / 2, ww / 2, -hh / 2 + rr); sh.lineTo(ww / 2, hh / 2 - rr); sh.quadraticCurveTo(ww / 2, hh / 2, ww / 2 - rr, hh / 2); sh.lineTo(-ww / 2 + rr, hh / 2); sh.quadraticCurveTo(-ww / 2, hh / 2, -ww / 2, hh / 2 - rr); sh.lineTo(-ww / 2, -hh / 2 + rr); sh.quadraticCurveTo(-ww / 2, -hh / 2, -ww / 2 + rr, -hh / 2);
            var dep = Math.max(0.01, d - 2 * bt), g = new THREE.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 2, curveSegments: 3 }); g.translate(0, 0, -dep / 2); return (geoCache[key] = g);
        }
        function rb(parent, w, h, d, r, m, x, y, z, rx, ry, rz) { var o = new THREE.Mesh(rbox(w, h, d, r), m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o; }
        function bx(parent, w, h, d, m, x, y, z, rx, ry, rz) { var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; parent.add(o); return o; }
        function cyl(parent, r, h, m, x, y, z, rz, rx) { var o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), m); o.position.set(x, y, z); o.rotation.z = rz || 0; o.rotation.x = rx || 0; o.castShadow = true; parent.add(o); return o; }
        var vA = new THREE.Vector3(), vB = new THREE.Vector3(), vZ = new THREE.Vector3(0, 0, 1), vUp = new THREE.Vector3(0, 1, 0), qq = new THREE.Quaternion();
        function bar(parent, a, b, w, h, m) {     /* viga rectangular entre dos puntos (eje largo → de a a b) */
            var d = new THREE.Vector3().subVectors(b, a), len = d.length(), o = new THREE.Mesh(new THREE.BoxGeometry(w, h, len), m);
            o.position.copy(a).addScaledVector(d, 0.5); o.quaternion.setFromUnitVectors(vZ, d.normalize()); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
        }
        function V(x, y, z) { return new THREE.Vector3(x, y, z); }

        var root = new THREE.Group(); root.rotation.order = 'YXZ';

        /* ---------- chasis, capó, defensas ---------- */
        function fender(wx, wy, wz, R, W) {                                                                    /* guardabarros curvo (arco de cilindro) */
            var sh = new THREE.Shape(), Ro = R + 0.15, Ri = R + 0.11, q, n = 14;
            for (q = 0; q <= n; q++) { var a = q / n * Math.PI; sh[q ? 'lineTo' : 'moveTo'](Math.cos(a) * Ro, Math.sin(a) * Ro); }
            for (q = n; q >= 0; q--) { var a2 = q / n * Math.PI; sh.lineTo(Math.cos(a2) * Ri, Math.sin(a2) * Ri); }
            var o = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: W, bevelEnabled: false }), M.yellow); o.rotation.y = Math.PI / 2; o.position.set(wx - W / 2, wy, wz); o.castShadow = true; o.receiveShadow = true; root.add(o);
            bx(root, W, 0.05, 0.08, M.black, wx, wy + Ro - 0.02, wz + Ro * 0.0);                                  /* franja del guardabarros */
        }
        rb(root, 1.2, 0.3, 3.3, 0.08, M.dark, 0, 0.8, -0.1);
        bx(root, 1.8, 0.2, 0.34, M.dark, 0, 0.5, DIM.fz); bx(root, 1.9, 0.26, 0.4, M.dark, 0, 0.62, DIM.rz); cyl(root, 0.09, 1.7, M.black, 0, 0.5, DIM.fz, Math.PI / 2);
        rb(root, 1.14, 0.54, 1.3, 0.2, M.yellow, 0, 1.32, -1.15);                                         /* capó */
        rb(root, 1.0, 0.56, 0.5, 0.14, M.yellow, 0, 1.28, -1.78, 0.3);                                    /* nariz inclinada */
        rb(root, 0.86, 0.1, 1.0, 0.05, M.yellow2, 0, 1.62, -1.1);                                         /* tapa del motor */
        bx(root, 1.16, 0.08, 1.2, M.black, 0, 1.1, -1.15);                                                /* franja inferior negra */
        rb(root, 0.84, 0.46, 0.06, 0.04, M.black, 0, 1.25, -2.0, 0.3);                                    /* parrilla */
        for (var gi = 0; gi < 6; gi++) bx(root, 0.74, 0.02, 0.04, M.dark, 0, 1.06 + gi * 0.075, -2.04 + gi * 0.0, 0.3);
        cyl(root, 0.09, 0.3, M.dark, 0, 1.2, -2.03, 0, Math.PI / 2 - 0.3);                                /* logo / emblema (disco neutro) */
        [-1, 1].forEach(function (sd) {
            rb(root, 0.24, 0.17, 0.12, 0.04, M.dark, sd * 0.4, 1.5, -1.95, 0.3); bx(root, 0.17, 0.11, 0.05, M.lamp, sd * 0.4, 1.5, -2.03); bx(root, 0.07, 0.07, 0.05, M.amber, sd * 0.53, 1.38, -2.0);
            fender(sd * (DIM.trR + 0.01), DIM.rr, DIM.rz, DIM.rr, 0.64); fender(sd * (DIM.trF + 0.01), DIM.rf, DIM.fz, DIM.rf, 0.52);   /* guardabarros */
            for (var lv = 0; lv < 5; lv++) bx(root, 0.02, 0.28, 0.03, M.dark, sd * 0.575, 1.36, -0.85 - lv * 0.14);             /* rejillas laterales del capó */
            bx(root, 0.1, 0.55, 0.06, M.black, sd * 0.52, 1.38, -0.62);
        });
        rb(root, 1.3, 0.18, 0.2, 0.05, M.dark, 0, 0.7, -2.05); cyl(root, 0.035, 0.2, M.chrome, 0, 0.62, -2.18, 0, Math.PI / 2);   /* defensa y gancho */
        cyl(root, 0.05, 0.9, M.dark, 0.4, 2.1, -1.45); cyl(root, 0.075, 0.05, M.black, 0.4, 2.57, -1.45); bx(root, 0.1, 0.02, 0.1, M.black, 0.4, 2.6, -1.45);  /* escape con tapa */
        cyl(root, 0.08, 0.6, M.black, -0.4, 1.95, -1.35);                                                 /* filtro de aire */
        rb(root, 1.5, 0.5, 0.55, 0.12, M.yellow, 0, 1.05, 1.28);                                          /* contrapeso trasero */
        for (var hz = -3; hz <= 3; hz++) bx(root, 0.1, 0.4, 0.02, M.black, hz * 0.2, 1.05, 1.57, 0, 0, 0.6);   /* franjas de advertencia */
        [-1, 1].forEach(function (sd) { bx(root, 0.16, 0.1, 0.04, M.red, sd * 0.62, 1.25, 1.57); bx(root, 0.08, 0.08, 0.04, M.amber, sd * 0.62, 1.12, 1.57); });
        bx(root, 0.34, 0.13, 0.02, M.white, 0, 0.93, 1.575); cyl(root, 0.045, 0.2, M.dark, 0, 0.65, 1.7, 0, Math.PI / 2);
        bx(root, 1.6, 0.5, 0.7, M.dark, 0, 0.98, DIM.bz);
        rb(root, 0.36, 0.5, 0.6, 0.12, M.yellow2, 0.88, 0.7, -0.1); cyl(root, 0.05, 0.06, M.chrome, 1.08, 0.9, -0.1, Math.PI / 2);   /* tanque */
        rb(root, 0.32, 0.45, 0.55, 0.1, M.dark, -0.88, 0.7, -0.1);                                        /* batería */
        [0.38, 0.8].forEach(function (yy) { bx(root, 0.5, 0.05, 0.55, M.dark, -1.0, yy, 0.05); });         /* peldaños */
        bx(root, 0.04, 0.62, 0.04, M.yellow2, -1.22, 1.0, -0.15); bx(root, 0.04, 0.62, 0.04, M.yellow2, -1.22, 1.0, 0.3); bx(root, 0.04, 0.04, 0.5, M.yellow2, -1.22, 1.3, 0.08);   /* pasamanos */

        /* ---------- cabina ---------- */
        var cab = new THREE.Group(); root.add(cab);
        rb(cab, 1.5, 0.14, 1.45, 0.05, M.dark, 0, 0.95, 0.05);
        [[-0.7, -0.56], [0.7, -0.56], [-0.7, 0.66], [0.7, 0.66]].forEach(function (p) { rb(cab, 0.1, 1.9, 0.1, 0.03, M.dark, p[0], 1.9, p[1]); });
        rb(cab, 1.7, 0.13, 1.88, 0.08, M.yellow, 0, 2.88, 0.05); rb(cab, 1.62, 0.05, 0.3, 0.03, M.dark, 0, 2.93, -0.95, -0.12);   /* techo y visera */
        rb(cab, 0.6, 0.12, 0.5, 0.05, M.yellow2, 0, 3.0, 0.45); bx(cab, 0.4, 0.015, 0.3, M.black, 0, 3.07, 0.45);                 /* aire acondicionado */
        cyl(cab, 0.06, 0.12, M.amber, 0.6, 3.02, 0.8); cyl(cab, 0.1, 0.04, M.dark, 0.6, 2.96, 0.8);                                /* baliza */
        bx(cab, 1.4, 0.04, 0.05, M.dark, 0, 2.8, -0.58); bx(cab, 0.07, 0.07, 1.25, M.dark, -0.7, 2.8, 0.05); bx(cab, 0.07, 0.07, 1.25, M.dark, 0.7, 2.8, 0.05);
        [-1, 1].forEach(function (sd) {
            bx(cab, 0.14, 0.09, 0.09, M.amber, sd * 0.62, 2.96, -0.86); rb(cab, 0.16, 0.12, 0.1, 0.03, M.dark, sd * 0.5, 2.95, -0.9); bx(cab, 0.12, 0.08, 0.05, M.lamp, sd * 0.5, 2.95, -0.97);
            bx(cab, 0.03, 0.03, 0.22, M.dark, sd * 0.84, 2.2, -0.58); rb(cab, 0.04, 0.26, 0.14, 0.02, M.black, sd * 0.88, 2.15, -0.7);      /* espejos */
            bx(cab, 0.03, 0.03, 1.15, M.dark, sd * 0.71, 1.2, 0.05); bx(cab, 0.03, 1.0, 0.03, M.dark, sd * 0.71, 1.7, 0.2);               /* marco de puerta */
            bx(cab, 0.05, 0.03, 0.14, M.black, sd * 0.74, 1.62, -0.25);                                                                     /* manija */
        });
        bx(cab, 1.34, 1.65, 0.03, M.glass, 0, 1.92, -0.57); bx(cab, 1.34, 1.65, 0.03, M.glass, 0, 1.92, 0.67);
        bx(cab, 0.03, 1.65, 1.2, M.glass, -0.71, 1.92, 0.05); bx(cab, 0.03, 1.65, 1.2, M.glass, 0.71, 1.92, 0.05);
        bx(cab, 0.5, 0.015, 0.015, M.black, 0.25, 1.35, -0.6, 0, 0, 0.18); bx(cab, 0.5, 0.015, 0.015, M.black, -0.25, 1.35, -0.6, 0, 0, -0.18);   /* limpiaparabrisas */
        rb(cab, 0.54, 0.16, 0.52, 0.07, M.seat, 0, 1.22, 0.3); rb(cab, 0.5, 0.7, 0.13, 0.07, M.seat, 0, 1.58, 0.54); rb(cab, 0.14, 0.05, 0.4, 0.02, M.black, 0.32, 1.42, 0.3); rb(cab, 0.14, 0.05, 0.4, 0.02, M.black, -0.32, 1.42, 0.3);   /* asiento */
        var sw = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.02, 6, 18), M.black); sw.position.set(0, 1.7, -0.22); sw.rotation.x = -0.9; cab.add(sw);
        bx(cab, 0.06, 0.5, 0.06, M.black, 0, 1.45, -0.3, 0.5); rb(cab, 1.1, 0.34, 0.3, 0.07, M.dark, 0, 1.3, -0.44); rb(cab, 0.4, 0.16, 0.12, 0.04, M.black, 0, 1.55, -0.4, -0.4);   /* tablero */
        bx(cab, 0.04, 0.36, 0.04, M.black, -0.36, 1.45, 0.1, 0.2); bx(cab, 0.04, 0.36, 0.04, M.black, 0.36, 1.45, 0.1, -0.2); cyl(cab, 0.03, 0.05, M.red, -0.36, 1.65, 0.07); cyl(cab, 0.03, 0.05, M.amber, 0.36, 1.65, 0.13);   /* palancas */

        /* ---------- ruedas ---------- */
        var wheels = [], steerPv = [];
        function mkWheel(parent, R, W, x, y, z, side) {
            var spin = new THREE.Group(), n = 18, i; spin.position.set(x, y, z); parent.add(spin);
            var tire = new THREE.Mesh(new THREE.CylinderGeometry(R, R, W, 24), M.tire); tire.rotation.z = Math.PI / 2; tire.castShadow = true; spin.add(tire);
            for (i = 0; i < n; i++) { var a = i / n * Math.PI * 2, lug = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.07, 0.15), M.tire); lug.position.set(0, Math.sin(a) * (R + 0.015), Math.cos(a) * (R + 0.015)); lug.rotation.x = -a; lug.rotation.z = (i % 2 ? 0.25 : -0.25); lug.castShadow = true; spin.add(lug); }
            var rim = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.62, R * 0.62, W + 0.03, 20), M.rim); rim.rotation.z = Math.PI / 2; spin.add(rim);
            var hub = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.2, R * 0.2, W + 0.09, 10), M.dark); hub.rotation.z = Math.PI / 2; spin.add(hub);
            for (i = 0; i < 8; i++) { var a2 = i / 8 * Math.PI * 2, bolt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.05), M.black); bolt.position.set(side * (W / 2 + 0.03), Math.sin(a2) * R * 0.38, Math.cos(a2) * R * 0.38); spin.add(bolt); }
            wheels.push({ g: spin, R: R }); return spin;
        }
        [-1, 1].forEach(function (s) {
            var pv = new THREE.Group(); pv.position.set(s * DIM.trF, 0, DIM.fz); root.add(pv); steerPv.push(pv); mkWheel(pv, DIM.rf, 0.42, 0, DIM.rf, 0, s);
            mkWheel(root, DIM.rr, 0.55, s * DIM.trR, DIM.rr, DIM.rz, s);
        });

        /* ---------- cargadora frontal ---------- */
        var la = new THREE.Group(); la.position.set(DIM.lp[0], DIM.lp[1], DIM.lp[2]); root.add(la);
        [-1, 1].forEach(function (s) {
            var x = s * 0.97; rb(root, 0.2, 1.1, 0.5, 0.08, M.yellow, x, 1.25, DIM.lp[2] + 0.05); rb(root, 0.24, 0.3, 0.55, 0.08, M.yellow2, x, 0.72, DIM.lp[2] + 0.1);   /* torre de pivote */
            cyl(la, 0.08, 0.32, M.dark, x, 0, 0, Math.PI / 2); cyl(la, 0.04, 0.36, M.chrome, x, 0, 0, Math.PI / 2);
            bar(la, V(x, 0.02, 0.2), V(x, 0.3, -1.25), 0.2, 0.4, M.yellow); bar(la, V(x, 0.3, -1.25), V(x, -0.04, -DIM.LA), 0.16, 0.3, M.yellow);   /* brazo acodado */
            rb(la, 0.1, 0.55, 0.55, 0.05, M.yellow2, x, 0.3, -1.25);                                                                                    /* placa del codo */
            bar(la, V(x * 0.9, 0.2, -0.1), V(x * 0.9, 0.18, -2.2), 0.035, 0.035, M.hose);                                                                /* mangueras */
            cyl(la, 0.09, 0.34, M.dark, x, -0.04, -DIM.LA, Math.PI / 2); cyl(la, 0.045, 0.38, M.chrome, x, -0.04, -DIM.LA, Math.PI / 2); rb(la, 0.1, 0.3, 0.5, 0.04, M.yellow2, x, 0.12, -0.5);
        });
        bx(la, 2 * 0.97, 0.13, 0.13, M.yellow, 0, 0.05, -0.7); bx(la, 0.1, 0.3, 0.1, M.dark, 0, 0.22, -0.7); var anLA2 = new THREE.Object3D(); anLA2.position.set(0, 0.38, -0.7); la.add(anLA2);
        var lbk = new THREE.Group(); lbk.position.set(0, -0.04, -DIM.LA); la.add(lbk);
        (function () {                                                                                         /* cucharón cargador: perfil curvo, espesor, nervaduras, borde con dientes y rejilla */
            var HW = DIM.LW / 2 - 0.05, LB = DIM.LB, pts = [], q, a, TH = 0.045;
            pts.push([LB, 0.0]); pts.push([0.6, 0.0]);
            for (q = 0; q <= 10; q++) { a = (-90 - q * 9) * Math.PI / 180; pts.push([0.35 + 0.4 * Math.cos(a), 0.4 + 0.4 * Math.sin(a)]); }
            pts.push([-0.15, 0.7]); pts.push([-0.23, 0.95]); pts.push([-0.12, 1.04]); pts.push([0.08, 1.02]);
            function normals(P) { return P.map(function (p, k) { var a0 = P[Math.max(0, k - 1)], b0 = P[Math.min(P.length - 1, k + 1)], dx = b0[0] - a0[0], dy = b0[1] - a0[1], l = Math.hypot(dx, dy) || 1; return [dy / l, -dx / l]; }); }
            var nrm = normals(pts), inner = pts.map(function (p, k) { return [p[0] + nrm[k][0] * TH, p[1] + nrm[k][1] * TH]; }), outerLift = pts.map(function (p, k) { return [p[0] - nrm[k][0] * 0.03, p[1] - nrm[k][1] * 0.03]; });
            function ribbon(P, x0, x1, mt) {
                var pos = [], k; function V3(u, v, x) { pos.push(x, v, -u); }
                for (k = 0; k < P.length - 1; k++) { V3(P[k][0], P[k][1], x0); V3(P[k][0], P[k][1], x1); V3(P[k + 1][0], P[k + 1][1], x1); V3(P[k][0], P[k][1], x0); V3(P[k + 1][0], P[k + 1][1], x1); V3(P[k + 1][0], P[k + 1][1], x0); }
                var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.computeVertexNormals(); var m = new THREE.Mesh(g, mt); m.castShadow = true; m.receiveShadow = true; lbk.add(m); return m;
            }
            ribbon(pts, -HW, HW, M.yellow); ribbon(inner, -HW, HW, M.steel);                                   /* chapa exterior amarilla e interior de acero */
            for (q = -3; q <= 3; q++) ribbon(outerLift, q * 0.3 - 0.04, q * 0.3 + 0.04, M.yellow2);              /* nervaduras de refuerzo */
            ribbon(pts.slice(0, 3).map(function (p) { return [p[0], p[1] - 0.001]; }), -HW, HW, M.black);        /* tira de desgaste */
            [-1, 1].forEach(function (sd) {                                                                      /* placas laterales con el perfil del cucharón */
                var sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (q = 1; q < pts.length; q++) sh.lineTo(pts[q][0], pts[q][1]); sh.lineTo(pts[0][0], pts[0][1]);
                var pl = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.01, bevelSize: 0.01, bevelSegments: 1 }), M.yellow); pl.rotation.y = Math.PI / 2; pl.position.x = sd > 0 ? HW - 0.03 : -HW - 0.03; pl.castShadow = true; lbk.add(pl);
                rb(lbk, 0.07, 0.36, 0.34, 0.03, M.yellow2, sd * (HW - 0.12), 0.25, 0.0);                           /* refuerzo / soporte del pasador */
                bx(lbk, 0.09, 0.05, 0.34, M.tooth, sd * (HW + 0.0), 0.01, -LB + 0.18);                              /* cuchilla lateral */
                rb(lbk, 0.07, 0.3, 0.3, 0.03, M.yellow2, sd * 0.28, 0.62, 0.15);                                    /* orejas del cilindro de volteo */
            });
            bx(lbk, 2 * HW + 0.02, 0.05, 0.22, M.tooth, 0, 0.0, -LB + 0.11);                                      /* borde de corte atornillado */
            for (q = 0; q < 6; q++) { var tx = -0.78 + q * 0.31; bx(lbk, 0.15, 0.065, 0.22, M.dark, tx, 0.0, -LB - 0.03); var tt = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.2, 4), M.tooth); tt.rotation.x = -Math.PI / 2; tt.rotation.z = Math.PI / 4; tt.position.set(tx, -0.005, -LB - 0.2); tt.castShadow = true; lbk.add(tt); }   /* 6 dientes */
            [-1, 1].forEach(function (sd) { bx(lbk, 0.05, 0.4, 0.05, M.dark, sd * (HW - 0.06), 1.22, 0.2, -0.35); });   /* rejilla antiderrame */
            for (q = 0; q < 3; q++) bx(lbk, 2 * HW - 0.1, 0.035, 0.035, M.dark, 0, 1.08 + q * 0.1, 0.25 + q * 0.04);
            for (q = -4; q <= 4; q++) bx(lbk, 0.03, 0.3, 0.03, M.dark, q * 0.2, 1.2, 0.3, -0.35);
            cyl(lbk, 0.095, 0.4, M.dark, 0, 0, 0, Math.PI / 2);
            [-1, 1].forEach(function (sd) { cyl(lbk, 0.045, 0.1, M.chrome, sd * (HW + 0.03), 0, 0, Math.PI / 2); });
        })();
        var lsoil = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M.soil); lsoil.position.set(0, 0.25, -0.5); lsoil.visible = false; lbk.add(lsoil);
        var anLB = new THREE.Object3D(); anLB.position.set(0, 0.64, 0.17); lbk.add(anLB);

        /* ---------- retro trasera ---------- */
        var swg = new THREE.Group(); swg.position.set(0, 0, DIM.bz); root.add(swg);
        rb(swg, 0.95, 1.35, 0.85, 0.15, M.yellow, 0, 1.12, 0.22);                                         /* torre */
        cyl(swg, 0.26, 0.2, M.dark, 0, 0.9, 0, 0, 0);
        var boom = new THREE.Group(); boom.position.set(0, DIM.by, 0); swg.add(boom);
        cyl(boom, 0.13, 0.5, M.dark, 0, 0, 0, Math.PI / 2);
        bar(boom, V(0, 0, 0.1), V(0, 0.62, -1.3), 0.3, 0.34, M.yellow); bar(boom, V(0, 0.62, -1.3), V(0, 0, -DIM.L1), 0.25, 0.3, M.yellow);
        rb(boom, 0.26, 0.4, 0.7, 0.1, M.yellow, 0, 0.4, -0.55, 0.3);
        cyl(boom, 0.12, 0.45, M.dark, 0, 0, -DIM.L1, Math.PI / 2);
        var anBoomB = new THREE.Object3D(); anBoomB.position.set(0, 0.45, -0.8); boom.add(anBoomB);
        var anStickA = new THREE.Object3D(); anStickA.position.set(0, 0.8, -1.95); boom.add(anStickA); bx(boom, 0.1, 0.25, 0.1, M.dark, 0, 0.72, -1.95);
        var stick = new THREE.Group(); stick.position.set(0, 0, -DIM.L1); boom.add(stick);
        bar(stick, V(0, 0.05, 0.3), V(0, 0, -DIM.L2), 0.2, 0.28, M.yellow); rb(stick, 0.22, 0.5, 0.4, 0.08, M.yellow, 0, 0.3, 0.12, 0.4);
        var anStickB = new THREE.Object3D(); anStickB.position.set(0, 0.5, 0.2); stick.add(anStickB);
        var anBkA = new THREE.Object3D(); anBkA.position.set(0, 0.18, -0.4); stick.add(anBkA); var anBkA2 = new THREE.Object3D(); anBkA2.position.set(0, 0.2, -0.9); stick.add(anBkA2);
        var bkt = new THREE.Group(); bkt.position.set(0, 0, -DIM.L2); stick.add(bkt);
        cyl(bkt, 0.09, 0.34, M.dark, 0, 0, 0, Math.PI / 2);
        (function () {                                                                                         /* cuchara trasera con dientes (misma construcción que la excavadora) */
            var W2 = 0.37, rad = 0.37, th = 0.04, n = 20, ri = rad - th, mIn = new THREE.MeshPhongMaterial({ color: 0x6d7076, shininess: 90, specular: 0x999999, side: THREE.DoubleSide }), k, t, t2;
            function Yp(r, tt) { return r * Math.sin(tt) * (0.96 + 0.04 * Math.sin(tt)); }
            function Zp(r, tt) { return -rad - r * Math.cos(tt); }
            function surface(r, mt) {
                var pos = []; function P(x, y, z) { pos.push(x, y, z); }
                for (k = 0; k < n; k++) { t = k / n * Math.PI; t2 = (k + 1) / n * Math.PI; P(-W2, Yp(r, t), Zp(r, t)); P(W2, Yp(r, t), Zp(r, t)); P(W2, Yp(r, t2), Zp(r, t2)); P(-W2, Yp(r, t), Zp(r, t)); P(W2, Yp(r, t2), Zp(r, t2)); P(-W2, Yp(r, t2), Zp(r, t2)); }
                var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.computeVertexNormals(); var m = new THREE.Mesh(g, mt); m.castShadow = true; m.receiveShadow = true; bkt.add(m);
            }
            surface(rad, M.yellow2); surface(ri, mIn);
            [-1, 1].forEach(function (sd) {
                var sh = new THREE.Shape(); sh.moveTo(rad, 0); for (var q = 0; q <= n; q++) { var a = q / n * Math.PI; sh.lineTo(rad + rad * Math.cos(a), Yp(rad, a)); } sh.lineTo(rad, 0);
                var pl = new THREE.Mesh(new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false }), M.yellow2); pl.rotation.y = Math.PI / 2; pl.position.x = sd > 0 ? W2 - th : -W2; pl.castShadow = true; bkt.add(pl);
                var ear = bx(bkt, 0.045, 0.3, 0.3, M.yellow2, sd * 0.17, 0.24, -0.14); ear.castShadow = true; cyl(bkt, 0.04, 0.07, M.chrome, sd * 0.17, 0.34, -0.12, Math.PI / 2);
            });
            bx(bkt, 2 * W2, 0.045, 0.13, M.tooth, 0, 0.005, -2 * rad + 0.03);
            [-0.27, -0.09, 0.09, 0.27].forEach(function (x) { bx(bkt, 0.09, 0.07, 0.1, M.dark, x, 0, -2 * rad); var tp = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), M.tooth); tp.rotation.x = -Math.PI / 2; tp.rotation.z = Math.PI / 4; tp.position.set(x, -0.005, -2 * rad - 0.09); tp.castShadow = true; bkt.add(tp); });
            bx(bkt, 0.45, 0.06, 0.2, M.yellow2, 0, 0.2, -0.1, 0.25);
        })();
        var bsoil = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), M.soil); bsoil.position.set(0, 0.1, -0.37); bsoil.visible = false; bkt.add(bsoil);
        var anBkB = new THREE.Object3D(); anBkB.position.set(-0.17, 0.34, -0.12); bkt.add(anBkB);

        /* ---------- estabilizadores ---------- */
        var stabs = [];
        [-1, 1].forEach(function (s) {
            var g = new THREE.Group(); g.position.set(s * DIM.stabX, 1.0, DIM.bz + 0.05); root.add(g);
            bx(g, 0.2, 0.2, 0.2, M.dark, 0, 0, 0); bar(g, V(0, 0, 0), V(0, -0.5, 0), 0.16, 0.16, M.yellow); bar(g, V(0, 0, 0), V(0, -0.98, 0.0), 0.12, 0.12, M.yellow);
            var leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.14), M.yellow); leg.position.set(0, -0.5, 0); leg.castShadow = true; g.add(leg);
            bx(g, 0.5, 0.07, 0.42, M.dark, 0, -0.97, 0); bx(g, 0.1, 0.05, 0.1, M.chrome, 0, -0.9, 0);
            stabs.push({ g: g, s: s });
        });

        /* ---------- cilindros hidráulicos ---------- */
        function mkCyl(parent) { var g = new THREE.Group(); parent.add(g); var b = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 10), M.cyl), r = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 1, 8), M.chrome); b.castShadow = true; g.add(b, r); return { g: g, b: b, r: r }; }
        function placeCyl(c, a, b) {
            var dir = vB.copy(b).sub(a), len = dir.length(); if (len < 1e-4) return; dir.multiplyScalar(1 / len); c.g.position.copy(a); c.g.quaternion.setFromUnitVectors(vUp, dir);
            var lb = Math.min(len * 0.55, 1.1); c.b.scale.y = lb; c.b.position.y = lb / 2; c.r.scale.y = Math.max(0.01, len - lb + 0.1); c.r.position.y = lb + (len - lb) / 2 - 0.05;
        }
        var cyLift = [mkCyl(root), mkCyl(root)], anLiftB = [], cyLTilt = mkCyl(la), cyBoom = mkCyl(swg), cyStick = mkCyl(boom), cyBk = mkCyl(stick);
        [-1, 1].forEach(function (s) { var o = new THREE.Object3D(); o.position.set(s * 0.97, -0.14, -1.3); la.add(o); anLiftB.push(o); });
        var anBoomA = new THREE.Object3D(); anBoomA.position.set(0, 0.35, -0.9); boom.add(anBoomA);
        var stabCyl = [mkCyl(root), mkCyl(root)], anStab = [];
        stabs.forEach(function (st2) { var o = new THREE.Object3D(); o.position.set(0, -0.4, 0.0); st2.g.add(o); anStab.push(o); });

        function pose(m) {
            root.position.set(m.x, m.y, m.z); root.rotation.set(m.pitch, m.yaw, m.roll);
            la.rotation.x = m.lift; lbk.rotation.x = m.ld - m.lift; swg.rotation.y = Math.PI + m.swing; boom.rotation.x = m.boom; stick.rotation.x = -m.stick; bkt.rotation.x = -m.bucket;
            steerPv.forEach(function (p) { p.rotation.y = m.steer; });
            stabs.forEach(function (s) { s.g.rotation.z = s.s * (1 - m.stab) * 1.75; });
            root.updateMatrixWorld(true);
            [0, 1].forEach(function (i) { var s = i ? 1 : -1; anLiftB[i].getWorldPosition(vA); root.worldToLocal(vA); placeCyl(cyLift[i], V(s * 0.9, 0.95, -0.15), vA.clone()); });
            anLB.getWorldPosition(vA); la.worldToLocal(vA); placeCyl(cyLTilt, anLA2.position, vA.clone());
            anBoomA.getWorldPosition(vA); swg.worldToLocal(vA); placeCyl(cyBoom, V(0, 0.6, 0.3), vA.clone());
            anStickB.getWorldPosition(vA); boom.worldToLocal(vA); placeCyl(cyStick, anStickA.position, vA.clone());
            anBkB.getWorldPosition(vA); stick.worldToLocal(vA); placeCyl(cyBk, anBkA.position, vA.clone());
            stabCyl.forEach(function (c, i) { var s = i ? 1 : -1; anStab[i].getWorldPosition(vA); root.worldToLocal(vA); placeCyl(c, V(s * 0.62, 0.9, DIM.bz + 0.05), vA.clone()); });
        }
        function animate(m, dt) { wheels.forEach(function (w) { w.g.rotation.x -= m.speed * dt / w.R; }); }
        function setLoad(which, vol, cap) {
            var f = Math.max(0, Math.min(1, vol / cap));
            if (which === 'L') { lsoil.visible = f > 0.02; lsoil.scale.set(0.9, 0.06 + 0.3 * f, 0.4); lsoil.position.set(0, 0.08 + 0.18 * f, -0.5); }
            else { bsoil.visible = f > 0.02; bsoil.scale.set(0.34, 0.05 + 0.2 * f, 0.32); bsoil.position.y = 0.06 + 0.1 * f; }
        }
        function dispose() { root.traverse(function (o) { if (o.geometry && !Object.keys(geoCache).some(function (k) { return geoCache[k] === o.geometry; })) o.geometry.dispose(); }); Object.keys(geoCache).forEach(function (k) { geoCache[k].dispose(); }); Object.keys(M).forEach(function (k) { M[k].dispose(); }); }
        return { root: root, cab: cab, setPose: pose, animate: animate, setLoad: setLoad, dispose: dispose, DIM: DIM };
    }
    G.SimObraRetroModel = { DIM: DIM, build: build };
})(typeof window !== 'undefined' ? window : globalThis);
