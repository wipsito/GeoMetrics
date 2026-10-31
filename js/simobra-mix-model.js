/**
 * Simulador de Obra 3D — MODELOS 3D de hormigonado: CAMIÓN MIXER (cabina azul, tambor con espiral que gira,
 * canaleta articulada), MEZCLADORA DE TROMPO (tambor basculante con palas internas, motor, volante, ruedas)
 * y PLANTA DOSIFICADORA (silo + tolva para recargar el mixer). Solo geometría; la lógica vive en simobra-mix.js.
 * Marco local: la máquina mira hacia -Z, +Y arriba, +X a la derecha.
 */
(function (G) {
    'use strict';
    var DT = {                                                    /* camión mixer */
        fz: -2.9, rz1: 1.5, rz2: 2.85, tr: 1.05, R: 0.52, wb: 4.4,
        eye: [-0.55, 2.75, -3.25],
        cp: [0, 2.05, 1.2],                                         /* centro del tambor */
        ch: [0, 1.75, 4.15], CL: 3.4                                /* pivote de la canaleta y su longitud */
    };
    var DM = { cap: 0.18, wheelR: 0.3, pivot: [0, 1.0, -0.15], lip: 0.62 };    /* trompo */

    function mats(THREE) {
        function mat(color, o) { o = o || {}; return new THREE.MeshPhongMaterial({ color: color, shininess: o.sh == null ? 55 : o.sh, specular: o.sp == null ? 0x333333 : o.sp, transparent: !!o.tr, opacity: o.op == null ? 1 : o.op, side: o.side || THREE.FrontSide, emissive: o.em || 0 }); }
        return {
            blue: mat(0x2459b4, { sh: 80, sp: 0x666688 }), blue2: mat(0x183e80, { sh: 40 }), white: mat(0xe9ecee, { sh: 70, sp: 0x666666 }), grey: mat(0xa3a8ad, { sh: 60, sp: 0x888888, side: THREE.DoubleSide }),
            orange: mat(0xf07a1a, { sh: 60, sp: 0x664422 }), dark: mat(0x27282b, { sh: 30 }), black: mat(0x111113, { sh: 20 }), tire: mat(0x18181a, { sh: 6, sp: 0x0a0a0a }), rim: mat(0xcfd3d7, { sh: 80, sp: 0x888888 }),
            glass: mat(0xcfe3ea, { sh: 120, sp: 0xffffff, tr: true, op: 0.32, side: THREE.DoubleSide }), chrome: mat(0xc9ced2, { sh: 120, sp: 0xffffff }), lamp: mat(0xfff3b0, { em: 0xffe9a0 }), red: mat(0xd02a1f, { em: 0x400000 }), amber: mat(0xff9a1a, { em: 0x663000 }),
            steel: mat(0x7c8087, { sh: 90, sp: 0xaaaaaa, side: THREE.DoubleSide }), conc: mat(0x8a8a85, { sh: 5, sp: 0x000000 }), redm: mat(0xc8321f, { sh: 50 }), seat: mat(0x232326, { sh: 10 }), yellow: mat(0xffcd11, { sh: 70 })
        };
    }
    function helpers(THREE, M, geo) {
        function rbox(w, h, d, r) {
            var key = [w, h, d, r].join('|'); if (geo[key]) return geo[key];
            var bt = Math.max(0.01, Math.min(r * 0.7, d / 2 - 0.005, w / 2 - 0.01, h / 2 - 0.01)), ww = w - 2 * bt, hh = h - 2 * bt, rr = Math.max(0.005, Math.min(r - bt, ww / 2 - 0.002, hh / 2 - 0.002)), sh = new THREE.Shape();
            sh.moveTo(-ww / 2 + rr, -hh / 2); sh.lineTo(ww / 2 - rr, -hh / 2); sh.quadraticCurveTo(ww / 2, -hh / 2, ww / 2, -hh / 2 + rr); sh.lineTo(ww / 2, hh / 2 - rr); sh.quadraticCurveTo(ww / 2, hh / 2, ww / 2 - rr, hh / 2); sh.lineTo(-ww / 2 + rr, hh / 2); sh.quadraticCurveTo(-ww / 2, hh / 2, -ww / 2, hh / 2 - rr); sh.lineTo(-ww / 2, -hh / 2 + rr); sh.quadraticCurveTo(-ww / 2, -hh / 2, -ww / 2 + rr, -hh / 2);
            var dep = Math.max(0.01, d - 2 * bt), g = new THREE.ExtrudeGeometry(sh, { depth: dep, bevelEnabled: true, bevelThickness: bt, bevelSize: bt, bevelSegments: 2, curveSegments: 3 }); g.translate(0, 0, -dep / 2); return (geo[key] = g);
        }
        return {
            rb: function (p, w, h, d, r, m, x, y, z, rx, ry, rz) { var o = new THREE.Mesh(rbox(w, h, d, r), m); o.position.set(x || 0, y || 0, z || 0); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; o.receiveShadow = true; p.add(o); return o; },
            bx: function (p, w, h, d, m, x, y, z, rx, ry, rz) { var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.rotation.set(rx || 0, ry || 0, rz || 0); o.castShadow = true; p.add(o); return o; },
            cyl: function (p, r, h, m, x, y, z, rz, rx, seg) { var o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg || 14), m); o.position.set(x, y, z); o.rotation.z = rz || 0; o.rotation.x = rx || 0; o.castShadow = true; p.add(o); return o; },
            wheel: function (p, R, W, x, y, z, side, list) {
                var spin = new THREE.Group(), n = 18, i; spin.position.set(x, y, z); p.add(spin);
                var tire = new THREE.Mesh(new THREE.CylinderGeometry(R, R, W, 24), M.tire); tire.rotation.z = Math.PI / 2; tire.castShadow = true; spin.add(tire);
                for (i = 0; i < n; i++) { var a = i / n * Math.PI * 2, lug = new THREE.Mesh(new THREE.BoxGeometry(W * 0.98, 0.05, 0.12), M.tire); lug.position.set(0, Math.sin(a) * (R + 0.01), Math.cos(a) * (R + 0.01)); lug.rotation.x = -a; lug.rotation.z = (i % 2 ? 0.2 : -0.2); spin.add(lug); }
                var rim = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.6, R * 0.6, W + 0.03, 20), M.rim); rim.rotation.z = Math.PI / 2; spin.add(rim);
                var hub = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.22, R * 0.22, W + 0.08, 10), M.dark); hub.rotation.z = Math.PI / 2; spin.add(hub);
                for (i = 0; i < 8; i++) { var a2 = i / 8 * Math.PI * 2, bolt = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), M.black); bolt.position.set(side * (W / 2 + 0.03), Math.sin(a2) * R * 0.4, Math.cos(a2) * R * 0.4); spin.add(bolt); }
                if (list) list.push({ g: spin, R: R }); return spin;
            }
        };
    }
    function disposeAll(root, geo, M) { root.traverse(function (o) { if (o.geometry && !Object.keys(geo).some(function (k) { return geo[k] === o.geometry; })) o.geometry.dispose(); }); Object.keys(geo).forEach(function (k) { geo[k].dispose(); }); Object.keys(M).forEach(function (k) { M[k].dispose(); }); }

    /* ====================== CAMIÓN MIXER ====================== */
    function buildTruck(THREE) {
        var geo = {}, M = mats(THREE), H = helpers(THREE, M, geo), rb = H.rb, bx = H.bx, cyl = H.cyl, root = new THREE.Group(), wheels = [], steerPv = [], i;
        root.rotation.order = 'YXZ';
        /* chasis */
        rb(root, 1.05, 0.34, 8.6, 0.06, M.dark, 0, 0.95, 0.35); bx(root, 0.9, 0.2, 8.2, M.black, 0, 0.78, 0.35);
        bx(root, 2.0, 0.12, 0.3, M.dark, 0, 0.58, DT.fz); cyl(root, 0.08, 2.0, M.black, 0, 0.55, DT.fz, Math.PI / 2);
        [DT.rz1, DT.rz2].forEach(function (z) { bx(root, 2.0, 0.14, 0.35, M.dark, 0, 0.6, z); cyl(root, 0.1, 2.0, M.black, 0, 0.58, z, Math.PI / 2); });
        /* ruedas: 2 delanteras (dirección) y 2 ejes traseros con ruedas dobles */
        [-1, 1].forEach(function (s) {
            var pv = new THREE.Group(); pv.position.set(s * DT.tr, 0, DT.fz); root.add(pv); steerPv.push(pv); H.wheel(pv, DT.R, 0.36, 0, DT.R, 0, s, wheels);
            [DT.rz1, DT.rz2].forEach(function (z) { H.wheel(root, DT.R, 0.3, s * (DT.tr + 0.22), DT.R, z, s, wheels); H.wheel(root, DT.R, 0.3, s * (DT.tr - 0.2), DT.R, z, s, wheels); });
            rb(root, 0.4, 0.07, 3.1, 0.03, M.dark, s * (DT.tr + 0.05), 1.12, (DT.rz1 + DT.rz2) / 2); bx(root, 0.36, 0.5, 0.04, M.black, s * (DT.tr + 0.3), 0.55, DT.rz2 + 0.75);   /* guardabarros y faldón */
            rb(root, 0.55, 0.08, 1.0, 0.04, M.blue2, s * (DT.tr + 0.02), 1.08, DT.fz);
        });
        /* cabina avanzada (cabover) */
        var cab = new THREE.Group(); root.add(cab);
        rb(cab, 2.4, 1.0, 1.9, 0.18, M.blue, 0, 1.55, -3.2); rb(cab, 2.35, 1.15, 1.75, 0.15, M.blue, 0, 2.55, -3.05); rb(cab, 2.3, 0.12, 1.7, 0.06, M.white, 0, 3.17, -3.0);
        rb(cab, 2.0, 0.3, 0.2, 0.05, M.black, 0, 1.4, -4.12);                                               /* parrilla */
        for (i = 0; i < 4; i++) bx(cab, 1.8, 0.025, 0.03, M.dark, 0, 1.28 + i * 0.1, -4.2);
        bx(cab, 2.3, 0.12, 0.22, M.dark, 0, 0.92, -4.12);                                                    /* defensa */
        [-1, 1].forEach(function (s) {
            rb(cab, 0.34, 0.2, 0.1, 0.04, M.dark, s * 0.85, 1.65, -4.14); bx(cab, 0.26, 0.13, 0.05, M.lamp, s * 0.85, 1.65, -4.2); bx(cab, 0.12, 0.1, 0.05, M.amber, s * 1.1, 1.65, -4.15);
            bx(cab, 0.03, 0.9, 1.4, M.glass, s * 1.19, 2.6, -3.05); bx(cab, 0.05, 0.4, 0.05, M.dark, s * 1.22, 2.85, -4.0); rb(cab, 0.1, 0.45, 0.28, 0.03, M.black, s * 1.38, 2.8, -4.0);   /* ventanas y espejos */
            bx(cab, 0.3, 0.05, 0.4, M.dark, s * 1.28, 0.95, -3.0); bx(cab, 0.3, 0.05, 0.4, M.dark, s * 1.28, 1.35, -3.0);    /* peldaños */
            cyl(cab, 0.08, 1.5, M.chrome, s * 1.15, 2.4, -1.95);                                              /* escape vertical */
            rb(cab, 0.5, 0.5, 1.2, 0.08, M.blue2, s * 1.18, 0.88, -1.6);                                         /* tanque de combustible */
        });
        bx(cab, 2.1, 1.0, 0.03, M.glass, 0, 2.6, -3.92); for (i = -1; i <= 1; i += 2) bx(cab, 0.6, 0.015, 0.015, M.black, i * 0.5, 2.2, -3.95, 0, 0, i * 0.15);
        bx(cab, 2.3, 0.14, 0.05, M.white, 0, 3.0, -3.93);                                                    /* visera */
        cyl(cab, 0.06, 0.12, M.amber, 0.6, 3.28, -2.7);                                                      /* baliza */
        rb(cab, 0.7, 0.2, 0.6, 0.06, M.seat, -0.55, 1.85, -3.1); rb(cab, 0.7, 0.8, 0.14, 0.06, M.seat, -0.55, 2.3, -2.82);
        var sw = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.025, 6, 18), M.black); sw.position.set(-0.55, 2.35, -3.6); sw.rotation.x = -1.0; cab.add(sw);
        rb(cab, 2.1, 0.4, 0.4, 0.08, M.dark, 0, 2.0, -3.85);                                                  /* tablero */
        /* bastidor trasero, escalera y tolva de carga */
        rb(root, 1.2, 0.5, 0.9, 0.08, M.dark, 0, 1.3, 3.9);
        bx(root, 0.06, 1.7, 0.06, M.chrome, -1.05, 2.1, 3.2); bx(root, 0.06, 1.7, 0.06, M.chrome, -0.75, 2.1, 3.2); for (i = 0; i < 6; i++) bx(root, 0.3, 0.04, 0.06, M.chrome, -0.9, 1.4 + i * 0.28, 3.2);
        bx(root, 1.4, 0.07, 0.5, M.red, 0, 1.1, 4.6);                                                         /* parachoques trasero */
        [-1, 1].forEach(function (s) { bx(root, 0.2, 0.1, 0.05, M.red, s * 0.8, 1.35, 4.62); });
        /* soportes del tambor */
        rb(root, 1.4, 0.7, 0.5, 0.08, M.dark, 0, 1.45, -1.55); rb(root, 1.4, 0.55, 0.8, 0.08, M.dark, 0, 1.4, 3.6);
        /* tambor: perfil de revolución + espiral naranja, todo dentro de un grupo que gira */
        var tilt = new THREE.Group(); tilt.position.set(DT.cp[0], DT.cp[1] + 0.35, DT.cp[2]); tilt.rotation.x = 1.4; root.add(tilt);
        var drum = new THREE.Group(); tilt.add(drum);
        var prof = [[0.0, -2.6], [0.45, -2.58], [0.8, -2.45], [1.05, -2.2], [1.17, -1.8], [1.2, -1.0], [1.2, 0.8], [1.12, 1.45], [0.9, 2.05], [0.7, 2.5], [0.58, 2.65], [0.52, 2.7]], pts = prof.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
        var dm = new THREE.Mesh(new THREE.LatheGeometry(pts, 40), M.white); dm.castShadow = true; dm.receiveShadow = true; drum.add(dm);
        function rAt(y) { for (var k = 0; k < prof.length - 1; k++) if (y >= prof[k][1] && y <= prof[k + 1][1]) { var t = (y - prof[k][1]) / (prof[k + 1][1] - prof[k][1]); return prof[k][0] + (prof[k + 1][0] - prof[k][0]) * t; } return 0.5; }
        var NS = 200, bg = new THREE.BoxGeometry(0.2, 0.05, 0.2);
        for (var hx = 0; hx < 2; hx++) for (i = 0; i < NS; i++) { var t2 = i / NS, y = -2.35 + t2 * 4.9, ang = t2 * Math.PI * 5 + hx * Math.PI, r = rAt(y) + 0.015, sp = new THREE.Mesh(bg, M.orange); sp.position.set(Math.cos(ang) * r, y, Math.sin(ang) * r); sp.rotation.y = -ang; sp.rotation.z = 0.5; sp.rotation.x = 0; drum.add(sp); }
        [-1.6, 0.25].forEach(function (y) { var tor = new THREE.Mesh(new THREE.TorusGeometry(rAt(y) + 0.02, 0.07, 6, 36), M.dark); tor.rotation.x = Math.PI / 2; tor.position.y = y; drum.add(tor); });
        var ring = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.05, 6, 24), M.steel); ring.rotation.x = Math.PI / 2; ring.position.y = 2.68; drum.add(ring);   /* boca de descarga */
        cyl(drum, 0.18, 0.16, M.dark, 0, -2.66, 0, 0, 0);                                                           /* eje frontal */
        /* tolva de carga y canaleta articulada (giro + elevación) */
        rb(root, 1.0, 0.35, 0.9, 0.1, M.steel, 0, 2.7, 3.9, -0.5);
        var chS = new THREE.Group(); chS.position.set(DT.ch[0], DT.ch[1], DT.ch[2]); root.add(chS);       /* giro (eje vertical) */
        cyl(chS, 0.2, 0.2, M.dark, 0, 0, 0);
        var chT = new THREE.Group(); chS.add(chT);                                                           /* elevación (eje X) */
        bx(chT, 0.55, 0.06, DT.CL * 0.62, M.steel, 0, 0, DT.CL * 0.31); bx(chT, 0.05, 0.22, DT.CL * 0.62, M.steel, -0.27, 0.1, DT.CL * 0.31); bx(chT, 0.05, 0.22, DT.CL * 0.62, M.steel, 0.27, 0.1, DT.CL * 0.31);
        bx(chT, 0.48, 0.05, DT.CL * 0.4, M.grey, 0, -0.08, DT.CL * 0.8); bx(chT, 0.05, 0.2, DT.CL * 0.4, M.grey, -0.23, 0.0, DT.CL * 0.8); bx(chT, 0.05, 0.2, DT.CL * 0.4, M.grey, 0.23, 0.0, DT.CL * 0.8);   /* extensión */
        rb(chT, 0.7, 0.3, 0.5, 0.06, M.steel, 0, 0.12, -0.2);
        /* concreto que cae por la canaleta (visible mientras vierte) */
        var stream = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1, 10), M.conc); stream.visible = false; root.add(stream);
        var slab = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, DT.CL * 0.7), M.conc); slab.position.set(0, -0.04, DT.CL * 0.5); slab.visible = false; chT.add(slab);
        function setPose(m) {
            root.position.set(m.x, m.y, m.z); root.rotation.set(m.pitch, m.yaw, m.roll); steerPv.forEach(function (p) { p.rotation.y = m.steer; }); drum.rotation.y = m.drum; chS.rotation.y = m.cs; chT.rotation.set(m.ca, 0, 0); slab.visible = m.pouring;
            root.updateMatrixWorld(true);
            if (m.pouring && m.streamTop) { var top = chT.localToWorld(new THREE.Vector3(0, -0.1, DT.CL)); root.worldToLocal(top); var bot = top.clone(); bot.y = m.groundLocal; var len = Math.max(0.05, top.y - bot.y); stream.visible = true; stream.scale.y = len; stream.position.set(top.x, bot.y + len / 2, top.z); } else stream.visible = false;
        }
        function animate(m, dt) { wheels.forEach(function (w) { w.g.rotation.x -= m.speed * dt / w.R; }); }
        return { root: root, setPose: setPose, animate: animate, dispose: function () { disposeAll(root, geo, M); }, DIM: DT };
    }

    /* ====================== MEZCLADORA DE TROMPO ====================== */
    function buildTrompo(THREE) {
        var geo = {}, M = mats(THREE), H = helpers(THREE, M, geo), rb = H.rb, bx = H.bx, cyl = H.cyl, root = new THREE.Group(), i;
        root.rotation.order = 'YXZ';
        /* chasis y ruedas */
        rb(root, 1.0, 0.1, 1.1, 0.03, M.redm, 0, 0.55, 0.0); bx(root, 0.08, 0.08, 1.3, M.redm, -0.46, 0.5, 0.05); bx(root, 0.08, 0.08, 1.3, M.redm, 0.46, 0.5, 0.05);
        cyl(root, 0.03, 1.2, M.dark, 0, DM.wheelR, 0.0, Math.PI / 2); var wl = [];
        [-1, 1].forEach(function (s) { H.wheel(root, DM.wheelR, 0.12, s * 0.62, DM.wheelR, 0.05, s, wl); });
        bx(root, 0.06, 0.06, 0.9, M.dark, -0.4, 0.45, -0.85, -0.2); bx(root, 0.06, 0.06, 0.9, M.dark, 0.4, 0.45, -0.85, -0.2); bx(root, 0.9, 0.05, 0.05, M.dark, 0, 0.38, -1.25);          /* manubrio */
        [-1, 1].forEach(function (s) { bx(root, 0.07, 0.5, 0.07, M.dark, s * 0.4, 0.3, 0.7, 0.15); bx(root, 0.18, 0.04, 0.18, M.dark, s * 0.4, 0.05, 0.73); });                                     /* patas de apoyo */
        /* soporte del tambor + motor */
        rb(root, 0.16, 1.0, 0.16, 0.04, M.redm, 0, 1.0, 0.0); rb(root, 0.55, 0.35, 0.5, 0.08, M.blue, 0.5, 0.82, 0.18); cyl(root, 0.13, 0.1, M.dark, 0.78, 0.82, 0.18, Math.PI / 2);                  /* motor eléctrico */
        bx(root, 0.2, 0.12, 0.14, M.black, 0.5, 1.03, 0.18); bx(root, 0.06, 0.06, 0.06, M.red, 0.5, 1.12, 0.18);
        /* tambor basculante */
        var pivot = new THREE.Group(); pivot.position.set(DM.pivot[0], DM.pivot[1] + 0.3, DM.pivot[2]); root.add(pivot);
        var dr = new THREE.Group(); pivot.add(dr);
        var pr = [[0, -0.5], [0.32, -0.48], [0.5, -0.38], [0.62, -0.15], [0.66, 0.1], [0.58, 0.32], [0.4, 0.48], [0.36, 0.52]], pp = pr.map(function (p) { return new THREE.Vector2(p[0], p[1]); });
        var mo = new THREE.Mesh(new THREE.LatheGeometry(pp, 32), M.orange); mo.castShadow = true; dr.add(mo);
        var pi = pr.map(function (p) { return new THREE.Vector2(Math.max(0.0, p[0] - 0.03), p[1] + 0.02); }), mi = new THREE.Mesh(new THREE.LatheGeometry(pi, 32), M.steel); dr.add(mi);
        var gear = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.035, 6, 36), M.dark); gear.rotation.x = Math.PI / 2; gear.position.y = 0.1; dr.add(gear);
        var lipT = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.03, 6, 24), M.chrome); lipT.rotation.x = Math.PI / 2; lipT.position.y = 0.5; dr.add(lipT);
        for (i = 0; i < 3; i++) { var bl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.55, 0.22), M.steel); var a = i / 3 * Math.PI * 2; bl.position.set(Math.cos(a) * 0.4, -0.05, Math.sin(a) * 0.4); bl.rotation.y = -a; bl.rotation.z = 0.35; dr.add(bl); }  /* palas internas */
        var mix = new THREE.Mesh(new THREE.SphereGeometry(0.36, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.conc); mix.position.y = 0.0; mix.scale.y = 0.35; mix.visible = false; dr.add(mix);   /* mezcla húmeda */
        for (i = 0; i < 8; i++) { var rib = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.25, 0.06), M.orange); var a2 = i / 8 * Math.PI * 2; rib.position.set(Math.cos(a2) * 0.65, -0.28, Math.sin(a2) * 0.65); rib.rotation.y = -a2; rib.rotation.z = 0.25; dr.add(rib); }
        /* volante de basculado */
        var hw = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 16), M.black); hw.rotation.y = Math.PI / 2; hw.position.set(-0.33, 1.1, 0.0); root.add(hw); cyl(root, 0.02, 0.4, M.dark, -0.15, 1.1, 0.0, Math.PI / 2);
        for (i = 0; i < 4; i++) { var sp = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.02), M.black); sp.position.set(-0.33, 1.1, 0); sp.rotation.x = i * Math.PI / 4; hw.add(sp); }
        function setPose(m) { root.position.set(m.x, m.y, m.z); root.rotation.set(m.pitch, m.yaw, m.roll); pivot.rotation.x = -m.tilt; dr.rotation.y = m.spin; mix.visible = m.load > 0.01; mix.scale.set(1, 0.15 + 0.5 * m.load / DM.cap, 1); }
        return { root: root, setPose: setPose, dispose: function () { disposeAll(root, geo, M); }, DIM: DM };
    }

    /* ====================== PLANTA DOSIFICADORA ====================== */
    function buildPlant(THREE) {
        var geo = {}, M = mats(THREE), H = helpers(THREE, M, geo), rb = H.rb, bx = H.bx, cyl = H.cyl, root = new THREE.Group(), i;
        [[-2.1, -1.4], [2.1, -1.4], [-2.1, 1.4], [2.1, 1.4]].forEach(function (p) { bx(root, 0.24, 5.4, 0.24, M.dark, p[0], 2.7, p[1]); });
        bx(root, 4.4, 0.16, 0.16, M.dark, 0, 5.0, -1.4); bx(root, 4.4, 0.16, 0.16, M.dark, 0, 5.0, 1.4); bx(root, 0.16, 0.16, 2.9, M.dark, -2.1, 5.0, 0); bx(root, 0.16, 0.16, 2.9, M.dark, 2.1, 5.0, 0);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (d) { bx(root, 0.1, 0.1, 2.2, M.dark, d[0] * 1.1, 5.3, d[1] * 0.7, 0, 0, 0); });
        cyl(root, 1.5, 4.0, M.white, 0, 8.4, 0, 0, 0, 28); cyl(root, 1.55, 0.2, M.blue, 0, 10.5, 0, 0, 0, 28); cyl(root, 1.52, 0.5, M.orange, 0, 9.0, 0, 0, 0, 28);
        var cone = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 0.45, 1.8, 28), M.white); cone.position.y = 5.5; cone.castShadow = true; root.add(cone);
        cyl(root, 0.45, 1.6, M.steel, 0, 4.2, 0, 0, 0, 16); var hop = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.34, 0.8, 16), M.steel); hop.position.y = 3.2; root.add(hop);      /* boquilla */
        cyl(root, 0.05, 9.0, M.dark, 1.62, 5.0, 0); for (i = 0; i < 16; i++) bx(root, 0.5, 0.04, 0.04, M.dark, 1.62, 1.0 + i * 0.5, 0, 0, Math.PI / 2, 0);                                   /* escalera */
        rb(root, 2.2, 2.0, 1.8, 0.08, M.blue, 4.8, 1.0, 0.0); bx(root, 1.0, 0.7, 0.03, M.glass, 4.8, 1.5, 0.92);                                                                       /* caseta de control */
        rb(root, 2.5, 0.14, 2.0, 0.06, M.white, 4.8, 2.05, 0); cyl(root, 0.06, 0.12, M.amber, 4.8, 2.2, 0);
        /* anillo de la zona de carga (marcador en el suelo) */
        var ringG = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.1, 40), new THREE.MeshBasicMaterial({ color: 0xffcc4d, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })); ringG.rotation.x = -Math.PI / 2; ringG.position.y = 0.04; root.add(ringG);
        return { root: root, ring: ringG, dispose: function () { disposeAll(root, geo, M); ringG.material.dispose(); }, DIM: {} };
    }
    G.SimObraMixModel = { DT: DT, DM: DM, buildTruck: buildTruck, buildTrompo: buildTrompo, buildPlant: buildPlant };
})(typeof window !== 'undefined' ? window : globalThis);
