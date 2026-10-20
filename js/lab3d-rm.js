/**
 * GeoMetrics — Laboratorio 3D · Resistencia de Materiales
 * 5 escenas registradas sobre el visor GeoLab3D (js/lab3d-ensayos.js).
 *
 * Contrato por escena:
 *   builder(accent) → { root, pins[], set(p, prm) }
 *   set()  → { hud:[4 × {k,v,u}], phase:int }
 *   meta.parts.length DEBE igualar machine.pins.length
 *
 * Datos guardados en window.__datosEnsayoRM:
 *   traccion {d,L0,A0,P,dL,sigma,eps,E,sy,su}
 *   compresion {d,h,P,A,fc}
 *   flexion {L,b,h,P,M,I,Mr}
 *   torsion {d,L,T,thDeg,J,tau,gamma,G}
 *   dureza {escala,lecturas[],promedio}
 *
 * Claves de escena: rm-traccion, rm-compresion, rm-flexion, rm-torsion, rm-dureza.
 */
(function (global) {
    'use strict';
    var G3 = global.GeoLab3D;
    if (!G3 || !G3.register) return;
    var P = G3.prim;

    var ACC = {
        traccion: '#3B82F6', compresion: '#38BDF8', flexion: '#A78BFA', torsion: '#2DD4BF', dureza: '#FBBF24'
    };

    function datos(k) { try { return (global.__datosEnsayoRM && global.__datosEnsayoRM[k]) || null; } catch (e) { return null; } }

    /* ================================================================== */
    /*  1 · MÁQUINA UNIVERSAL · ENSAYO DE TRACCIÓN                        */
    /* ================================================================== */
    function buildTraccion(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        P.plinth(root, 3.6, 2.6, accent);

        /* bancada y columnas */
        P.box(root, 3.0, 0.2, 2.0, 0, 0.1, 0, mt.frameDark);
        P.box(root, 2.8, 0.08, 1.8, 0, 0.24, 0, mt.frame);
        [[-0.9, -0.7], [0.9, -0.7], [-0.9, 0.7], [0.9, 0.7]].forEach(function (p) {
            P.cyl(root, 0.08, 0.08, 3.4, p[0], 1.9, p[1], mt.chrome, 20);
            P.cyl(root, 0.11, 0.11, 0.06, p[0], 0.34, p[1], mt.chromeDark, 14);
            P.cyl(root, 0.11, 0.11, 0.06, p[0], 3.46, p[1], mt.chromeDark, 14);
        });
        /* cabezal superior e inferior */
        P.box(root, 2.2, 0.3, 1.6, 0, 3.6, 0, mt.frame);
        P.box(root, 2.0, 0.1, 1.4, 0, 3.8, 0, mt.frameLight);
        P.box(root, 1.0, 0.5, 0.03, 0, 3.6, 0.82, mt.white);
        var crossTop = P.box(root, 1.6, 0.28, 1.2, 0, 2.55, 0, mt.frameLight);
        var crossBot = P.box(root, 1.6, 0.28, 1.2, 0, 0.55, 0, mt.frameLight);
        /* actuador hidráulico */
        P.cyl(root, 0.26, 0.26, 0.7, 0, 3.35, 0, mt.blue, 28);
        P.cyl(root, 0.12, 0.12, 0.5, 0, 2.95, 0, mt.chrome, 16);

        /* probeta de tracción (cilindro esbelto) */
        var spec = new THREE.Group();
        root.add(spec);
        var body = P.cyl(spec, 0.1, 0.1, 1.4, 0, 0, 0, mt.chrome, 28);
        var gripTop = P.cyl(spec, 0.16, 0.16, 0.18, 0, 0.79, 0, mt.blueDeep, 24);
        var gripBot = P.cyl(spec, 0.16, 0.16, 0.18, 0, -0.79, 0, mt.blueDeep, 24);
        spec.position.set(0, 1.55, 0);

        /* zona de estricción (se resalta al final) */
        var neckMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xF43F5E), transparent: true, opacity: 0, depthWrite: false });
        var neck = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.015, 8, 24), neckMat);
        neck.rotation.x = Math.PI / 2;
        neck.position.set(0, 1.55, 0);
        root.add(neck);

        /* extensómetro (deformímetro axial) */
        P.box(root, 0.04, 0.5, 0.04, 0.28, 1.55, 0, mt.chromeDark);
        var dialExt = P.makeDial(root, 0.28, 1.9, 0, 0.16, mt);

        /* panel de control */
        P.box(root, 0.7, 0.5, 0.5, -1.35, 0.6, 0.6, mt.blueDeep);
        P.box(root, 0.5, 0.14, 0.02, -1.35, 0.72, 0.86, mt.white);
        var led = P.cylZ(root, 0.05, 0.05, 0.03, -1.35, 0.55, 0.86, mt.green, 16);

        var pins = [
            { v: [0, 3.6, 0] },       /* cabezal superior */
            { v: [0, 2.3, 0] },       /* mordaza superior */
            { v: [0, 1.55, 0.2] },    /* probeta */
            { v: [0, 0.8, 0] },       /* mordaza inferior */
            { v: [0.28, 1.9, 0] },    /* extensómetro */
            { v: [-1.35, 0.85, 0.6] } /* panel de control */
        ];

        function set(p, prm) {
            var load = P.ease(P.seg(p, 0, 0.2));
            var onset = P.seg(p, 0.2, 0.72);
            var plast = P.seg(p, 0.72, 0.94);
            var rot = P.seg(p, 0.94, 1.0);

            var A0 = prm.A0 || 122.7;
            var sy = prm.sy || 250, su = prm.su || 400, E = (prm.E || 200) * 1000;
            var epsY = sy / E;
            var eps = epsY * load + (epsY * 8) * onset + 0.12 * plast + 0.02 * rot;
            var sigma;
            if (eps <= epsY) sigma = E * eps;
            else if (plast < 1) sigma = sy + (su - sy) * (1 - Math.pow(1 - onset, 2));
            else sigma = su * (1 - 0.28 * rot);
            var dL = eps * (prm.L0 || 50);

            /* estiramiento visual de la probeta */
            var stretch = P.clamp(dL / 6, 0, 0.5);
            body.scale.y = 1 + stretch;
            body.scale.x = 1 - stretch * 0.35;   /* estricción */
            body.scale.z = 1 - stretch * 0.35;
            gripTop.position.y = 0.79 + stretch * 0.7;
            gripBot.position.y = -0.79 - stretch * 0.7;
            crossTop.position.y = 2.55 + stretch * 0.7;
            spec.position.y = 1.55;

            neckMat.opacity = 0.9 * P.clamp((plast - 0.4) / 0.6, 0, 1);
            dialExt.rotation.z = -(dL) * 0.5;
            led.material = led.material;

            var ph = p < 0.2 ? 0 : p < 0.72 ? 1 : p < 0.94 ? 2 : 3;
            return {
                hud: [
                    { k: 'σ', v: P.fmt(Math.max(0, sigma), 1), u: 'MPa' },
                    { k: 'ε', v: P.fmt(eps * 100, 3), u: '%' },
                    { k: 'ΔL', v: P.fmt(dL, 3), u: 'mm' },
                    { k: 'P', v: P.fmt(Math.max(0, sigma) * A0 / 1000, 2), u: 'kN' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_TRACCION = {
        accent: ACC.traccion, machine: 'Máquina universal de ensayos',
        machineSub: 'Marco de 4 columnas con mordazas y extensómetro',
        norma: 'ASTM E8 · NTC 2', duration: 16,
        phases: [
            { a: 0, b: 0.20, t: 'Sujetar la probeta', d: 'Se monta la probeta entre las mordazas y se pone a cero el extensómetro.' },
            { a: 0.20, b: 0.72, t: 'Carga elástica', d: 'La deformación es proporcional al esfuerzo (zona lineal, módulo E).' },
            { a: 0.72, b: 0.94, t: 'Fluencia y endurecimiento', d: 'Se alcanza σy y luego el esfuerzo último σu.' },
            { a: 0.94, b: 1.01, t: 'Estricción y rotura', d: 'La sección se reduce localmente y la probeta falla.' }
        ],
        parts: [
            { name: 'Cabezal superior', desc: 'Transmite la carga de tracción a la probeta.' },
            { name: 'Mordaza superior', desc: 'Sujeta el extremo superior de la probeta.' },
            { name: 'Probeta', desc: 'Espécimen normalizado que se somete a tracción.' },
            { name: 'Mordaza inferior', desc: 'Ancla el extremo inferior (reacción).' },
            { name: 'Extensómetro', desc: 'Mide el alargamiento ΔL de la probeta.' },
            { name: 'Panel de control', desc: 'Regula la velocidad y registra fuerza y deformación.' }
        ],
        cam: {
            target: [0, 1.9, 0],
            home: { theta: 0.7, phi: 1.12, radius: 7.6 },
            frontal: { theta: 0.0, phi: 1.3, radius: 7.4 },
            lateral: { theta: 1.5, phi: 1.2, radius: 7.2 },
            detalle: { theta: 0.5, phi: 1.15, radius: 4.6 }
        }
    };
    function paramsTraccion() {
        var d = datos('traccion');
        var o = { d: 12.5, L0: 50, A0: 122.7, sy: 285, su: 448, E: 200, real: false };
        if (d) {
            if (isFinite(d.d)) o.d = d.d;
            if (isFinite(d.L0)) o.L0 = d.L0;
            if (isFinite(d.A0)) o.A0 = d.A0;
            if (isFinite(d.sy)) o.sy = d.sy;
            if (isFinite(d.su)) o.su = d.su;
            if (isFinite(d.E)) o.E = d.E;
            o.real = isFinite(d.su) || isFinite(d.sy);
        }
        o.nota = o.real
            ? 'Con tus resultados: σy = ' + P.fmt(o.sy, 1) + ' MPa · σu = ' + P.fmt(o.su, 1) + ' MPa'
            : 'Valores típicos de ejemplo (acero estructural). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  2 · PRENSA DE COMPRESIÓN (probeta de concreto)                    */
    /* ================================================================== */
    function buildCompresion(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        P.plinth(root, 3.4, 2.6, accent);

        P.box(root, 2.8, 0.2, 2.0, 0, 0.1, 0, mt.frameDark);
        P.box(root, 2.6, 0.08, 1.8, 0, 0.24, 0, mt.frame);
        [[-0.85, -0.65], [0.85, -0.65], [-0.85, 0.65], [0.85, 0.65]].forEach(function (p) {
            P.cyl(root, 0.08, 0.08, 3.0, p[0], 1.75, p[1], mt.chrome, 20);
        });
        /* cabezal superior fijo */
        P.box(root, 2.2, 0.3, 1.6, 0, 3.2, 0, mt.frame);
        P.box(root, 2.0, 0.1, 1.4, 0, 3.4, 0, mt.frameLight);
        P.cyl(root, 0.32, 0.32, 0.4, 0, 2.8, 0, mt.blue, 28);
        P.cyl(root, 0.28, 0.28, 0.12, 0, 2.55, 0, mt.plate, 36);
        /* plato inferior móvil */
        P.cyl(root, 0.32, 0.32, 0.12, 0, 0.5, 0, mt.plate, 36);
        var piston = P.cyl(root, 0.14, 0.14, 0.5, 0, 0.28, 0, mt.chrome, 20);

        /* probeta cúbica/ cilíndrica de concreto */
        var cubeMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.05, roughness: 0.9 });
        var cube = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), cubeMat);
        cube.position.set(0, 1.45, 0);
        root.add(cube);
        /* fisuras progresivas */
        var crackMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x1f2937), transparent: true, opacity: 0 });
        var crack1 = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.8, 0.02), crackMat);
        crack1.position.set(0.1, 1.45, 0.41);
        root.add(crack1);
        var crack2 = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.8, 0.012), crackMat);
        crack2.position.set(-0.41, 1.45, -0.1);
        crack2.rotation.z = 0.2;
        root.add(crack2);

        /* marco de medición (deformímetro) */
        P.box(root, 0.04, 0.7, 0.04, 0.6, 1.45, 0, mt.chromeDark);
        var dialC = P.makeDial(root, 0.6, 1.9, 0, 0.16, mt);

        /* panel / manómetro */
        P.box(root, 0.7, 0.5, 0.5, -1.3, 0.6, 0.6, mt.blueDeep);
        P.cylZ(root, 0.14, 0.14, 0.06, -1.3, 0.68, 0.86, mt.white, 24);

        var pins = [
            { v: [0, 3.2, 0] },       /* cabezal superior */
            { v: [0, 2.6, 0] },       /* plato fijo */
            { v: [0, 1.45, 0.45] },   /* probeta */
            { v: [0, 0.5, 0] },       /* plato inferior */
            { v: [0.6, 1.9, 0] },     /* deformímetro */
            { v: [-1.3, 0.85, 0.6] }  /* manómetro */
        ];

        function set(p, prm) {
            var carga = P.ease(P.seg(p, 0, 0.8));
            var falla = P.seg(p, 0.8, 1.0);

            var fc = prm.fc || 40;
            var A = prm.A || Math.PI * Math.pow((prm.d || 150) / 2, 2);
            var sigma = fc * carga * (1 - 0.3 * falla);
            var eps = carga * 0.0022 + falla * 0.001;   /* ≈ 0,2 % */
            var P_kN = sigma * A / 1000;

            /* acortamiento y abarrilamiento */
            var acort = carga * 0.02 + falla * 0.02;
            cube.scale.y = 1 - acort;
            cube.scale.x = 1 + acort * 0.6;
            cube.scale.z = 1 + acort * 0.6;
            /* el plato inferior sube */
            piston.scale.y = 1 - acort;

            crackMat.opacity = 0.95 * P.clamp((falla - 0.2) / 0.8, 0, 1);
            crack1.scale.y = cube.scale.y;
            crack2.scale.y = cube.scale.y;
            dialC.rotation.z = -carga * 3.2;

            var ph = p < 0.5 ? 0 : p < 0.8 ? 1 : 2;
            return {
                hud: [
                    { k: 'σ', v: P.fmt(Math.max(0, sigma), 1), u: 'MPa' },
                    { k: 'Carga', v: P.fmt(Math.max(0, P_kN), 1), u: 'kN' },
                    { k: 'ε', v: P.fmt(eps * 100, 3), u: '%' },
                    { k: 'fc', v: P.fmt(fc, 1), u: 'MPa' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_COMPRESION = {
        accent: ACC.compresion, machine: 'Prensa de compresión',
        machineSub: 'Marco con platos y deformímetro para probetas de concreto',
        norma: 'ASTM C39 · NTC 673', duration: 14,
        phases: [
            { a: 0, b: 0.50, t: 'Colocar y cargar la probeta', d: 'Se aplica carga axial a velocidad controlada.' },
            { a: 0.50, b: 0.80, t: 'Zona cercana a la rotura', d: 'Aparecen fisuras y el esfuerzo se aproxima a su máximo.' },
            { a: 0.80, b: 1.01, t: 'Falla por compresión', d: 'La probeta se fractura; se registra fc.' }
        ],
        parts: [
            { name: 'Cabezal superior', desc: 'Transmite la carga de compresión.' },
            { name: 'Plato fijo superior', desc: 'Apoya la cara superior de la probeta.' },
            { name: 'Probeta de concreto', desc: 'Cilindro o cubo que se ensaya a compresión.' },
            { name: 'Plato móvil inferior', desc: 'Sube aplicando la carga axial.' },
            { name: 'Deformímetro', desc: 'Mide el acortamiento de la probeta.' },
            { name: 'Manómetro', desc: 'Indica la carga aplicada por la prensa.' }
        ],
        cam: {
            target: [0, 1.6, 0],
            home: { theta: 0.7, phi: 1.12, radius: 6.8 },
            frontal: { theta: 0.0, phi: 1.3, radius: 6.6 },
            lateral: { theta: 1.5, phi: 1.2, radius: 6.4 },
            detalle: { theta: 0.5, phi: 1.15, radius: 4.2 }
        }
    };
    function paramsCompresion() {
        var d = datos('compresion');
        var o = { d: 150, h: 300, A: Math.PI * Math.pow(75, 2), fc: 40, real: false };
        if (d) {
            if (isFinite(d.d)) { o.d = d.d; o.A = Math.PI * Math.pow(d.d / 2, 2); }
            if (isFinite(d.h)) o.h = d.h;
            if (isFinite(d.A)) o.A = d.A;
            if (isFinite(d.fc)) o.fc = d.fc;
            o.real = !!d.fc;
        }
        o.nota = o.real
            ? 'Con tus resultados: fc = ' + P.fmt(o.fc, 1) + ' MPa'
            : 'Valores típicos de ejemplo (fc ≈ 40 MPa). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  3 · ENSAYO DE FLEXIÓN (viga simplemente apoyada)                  */
    /* ================================================================== */
    function buildFlexion(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        P.plinth(root, 4.2, 2.6, accent);

        P.box(root, 3.8, 0.2, 1.8, 0, 0.1, 0, mt.frameDark);
        P.box(root, 3.6, 0.08, 1.6, 0, 0.24, 0, mt.frame);

        /* apoyos (rodillo y articulación) */
        P.cylZ(root, 0.14, 0.14, 0.5, -1.35, 0.42, 0, mt.chrome, 24);
        P.box(root, 0.2, 0.16, 0.5, -1.35, 0.32, 0, mt.frameDark);
        P.cylZ(root, 0.14, 0.14, 0.5, 1.35, 0.42, 0, mt.chrome, 24);
        P.box(root, 0.2, 0.16, 0.5, 1.35, 0.32, 0, mt.frameDark);

        /* viga */
        var beam = new THREE.Group();
        root.add(beam);
        var beamMat = new THREE.MeshStandardMaterial({ color: 0xb0a48c, metalness: 0.05, roughness: 0.85 });
        var viga = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.3, 0.4), beamMat);
        viga.position.set(0, 0.72, 0);
        beam.add(viga);
        /* marcadores de tercios */
        [-0.5, 0.5].forEach(function (x) { P.box(beam, 0.02, 0.32, 0.42, x, 0.72, 0, mt.accent); });

        /* marco de carga con dos puntos (tercios) */
        P.box(root, 1.8, 0.2, 1.2, 0, 2.4, 0, mt.frame);
        P.box(root, 1.6, 0.08, 1.0, 0, 2.56, 0, mt.frameLight);
        P.cyl(root, 0.2, 0.2, 0.4, 0, 2.15, 0, mt.blue, 24);
        var rodL = P.cyl(root, 0.06, 0.06, 0.5, -0.5, 1.9, 0, mt.chrome, 14);
        var rodR = P.cyl(root, 0.06, 0.06, 0.5, 0.5, 1.9, 0, mt.chrome, 14);
        P.box(root, 0.4, 0.1, 0.5, -0.5, 1.6, 0, mt.chromeDark);
        P.box(root, 0.4, 0.1, 0.5, 0.5, 1.6, 0, mt.chromeDark);

        /* comparador de flecha central */
        P.box(root, 0.04, 0.4, 0.04, 0, 0.35, 0.4, mt.chromeDark);
        var dialF = P.makeDial(root, 0, 0.5, 0.42, 0.14, mt);

        /* fisura central */
        var crackMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x1f2937), transparent: true, opacity: 0 });
        var crack = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.3), crackMat);
        crack.position.set(0, 0.57, 0);
        beam.add(crack);

        var pins = [
            { v: [0, 2.4, 0] },       /* marco de carga */
            { v: [-0.5, 1.6, 0] },    /* punto de carga izq. */
            { v: [0, 0.72, 0.45] },   /* viga */
            { v: [-1.35, 0.42, 0] },  /* apoyo fijo */
            { v: [1.35, 0.42, 0] },   /* apoyo móvil */
            { v: [0, 0.75, 0.42] }    /* comparador central */
        ];

        function set(p, prm) {
            var carga = P.ease(P.seg(p, 0, 0.8));
            var falla = P.seg(p, 0.8, 1.0);

            var L = prm.L || 450, b = prm.b || 150, hgt = prm.h || 150, Ptot = prm.P || 40;   /* kN */
            var Pn = Ptot / 2;
            /* flexión en los tercios: M = P·L/6, σ = M·c/I */
            var M = Pn * (L / 1000) / 3;      /* kN·m */
            var c = (hgt / 1000) / 2;
            var I = (b / 1000) * Math.pow(hgt / 1000, 3) / 12;
            var sigma = (M * c / I) / 1000 * carga;   /* MPa */
            var flecha = (23 * Pn * Math.pow(L / 1000, 3)) / (1296 * (prm.E || 200e6) * I) * 1000;  /* mm aprox */
            flecha = flecha * carga;

            /* deformación visual de la viga */
            var sag = carga * 0.22 + falla * 0.05;
            /* curvamos la viga con ligera rotación en los extremos + descenso */
            viga.position.y = 0.72 - sag;
            viga.rotation.z = 0;
            beam.position.y = -sag * 0.5;
            /* empujamos los puntos de carga hacia abajo */
            rodL.scale.y = Math.max(0.2, 1 - sag * 1.2);
            rodR.scale.y = Math.max(0.2, 1 - sag * 1.2);
            rodL.position.y = 1.9 - sag * 0.4;
            rodR.position.y = 1.9 - sag * 0.4;

            crackMat.opacity = 0.95 * P.clamp((falla - 0.3) / 0.7, 0, 1);
            dialF.rotation.z = -flecha * 0.05;

            var ph = p < 0.5 ? 0 : p < 0.8 ? 1 : 2;
            return {
                hud: [
                    { k: 'M', v: P.fmt(M * carga, 2), u: 'kN·m' },
                    { k: 'σf', v: P.fmt(sigma, 1), u: 'MPa' },
                    { k: 'δ', v: P.fmt(flecha, 2), u: 'mm' },
                    { k: 'Mr', v: P.fmt(prm.Mr || 20, 1), u: 'MPa' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_FLEXION = {
        accent: ACC.flexion, machine: 'Marco de flexión (viga en 3 puntos)',
        machineSub: 'Apoyos en los extremos y carga en los tercios',
        norma: 'ASTM C78 · NTC 2871', duration: 15,
        phases: [
            { a: 0, b: 0.50, t: 'Cargar la viga', d: 'La carga se aplica en los tercios del vano.' },
            { a: 0.50, b: 0.80, t: 'Flexión elástica', d: 'La viga se curva; se mide la flecha central.' },
            { a: 0.80, b: 1.01, t: 'Agrietamiento y rotura', d: 'Aparece la fisura en la zona de máximo momento.' }
        ],
        parts: [
            { name: 'Marco de carga', desc: 'Aplica la fuerza total sobre la viga.' },
            { name: 'Puntos de carga', desc: 'Transmiten la carga en los tercios del vano.' },
            { name: 'Viga', desc: 'Espécimen prismático que se ensaya a flexión.' },
            { name: 'Apoyo fijo', desc: 'Articulación que restringe el desplazamiento vertical.' },
            { name: 'Apoyo móvil', desc: 'Rodillo que permite la rotación y el deslizamiento.' },
            { name: 'Comparador central', desc: 'Mide la flecha en el centro del vano.' }
        ],
        cam: {
            target: [0, 1.2, 0],
            home: { theta: 0.7, phi: 1.12, radius: 7.2 },
            frontal: { theta: 0.0, phi: 1.3, radius: 7.0 },
            lateral: { theta: 1.5, phi: 1.2, radius: 6.8 },
            detalle: { theta: 0.5, phi: 1.15, radius: 4.4 }
        }
    };
    function paramsFlexion() {
        var d = datos('flexion');
        var o = { L: 450, b: 150, h: 150, P: 40, Mr: 20, E: 200e6, real: false };
        if (d) {
            if (isFinite(d.L)) o.L = d.L;
            if (isFinite(d.b)) o.b = d.b;
            if (isFinite(d.h)) o.h = d.h;
            if (isFinite(d.P)) o.P = d.P;
            if (isFinite(d.Mr)) o.Mr = d.Mr;
            o.real = isFinite(d.Mr);
        }
        o.nota = o.real
            ? 'Con tus resultados: Mr = ' + P.fmt(o.Mr, 1) + ' MPa'
            : 'Valores típicos de ejemplo (Mr ≈ 20 MPa). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  4 · ENSAYO DE TORSIÓN (probeta cilíndrica)                        */
    /* ================================================================== */
    function buildTorsion(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        P.plinth(root, 4.0, 2.4, accent);

        P.box(root, 3.6, 0.2, 1.8, 0, 0.1, 0, mt.frameDark);
        P.box(root, 3.4, 0.08, 1.6, 0, 0.24, 0, mt.frame);

        /* cabezal fijo izquierdo */
        P.box(root, 0.6, 1.0, 1.0, -1.5, 0.9, 0, mt.frame);
        P.box(root, 0.5, 0.16, 0.8, -1.5, 0.6, 0, mt.frameLight);
        /* cabezal móvil derecho (gira) */
        var headR = new THREE.Group();
        headR.position.set(1.5, 0.9, 0);
        root.add(headR);
        P.box(headR, 0.6, 1.0, 1.0, 0, 0, 0, mt.frame);
        P.box(headR, 0.5, 0.16, 0.8, 0, -0.3, 0, mt.frameLight);
        P.box(headR, 0.4, 0.4, 0.4, 0, 0.7, 0, mt.blueDeep);
        /* volante */
        var wheel = new THREE.Group();
        wheel.position.set(2.2, 0.9, 0);
        root.add(wheel);
        P.cylX(wheel, 0.5, 0.5, 0.06, 0, 0, 0, mt.blue, 36);
        for (var i = 0; i < 4; i++) P.box(wheel, 0.05, 0.06, 0.9, 0, 0, 0, mt.blueDeep);
        P.cylX(wheel, 0.08, 0.08, 0.12, 0, 0, 0, mt.chromeDark, 16);

        /* probeta cilíndrica */
        var spec = new THREE.Group();
        root.add(spec);
        P.cylX(spec, 0.12, 0.12, 2.4, 0, 0.9, 0, mt.chrome, 32);
        /* líneas de referencia (giran con la probeta) */
        var markers = [];
        [-0.6, 0, 0.6].forEach(function (x) {
            var m = P.cylX(spec, 0.125, 0.125, 0.03, x, 0.9, 0, mt.accent, 32);
            markers.push(m);
        });

        /* medidor de ángulo */
        var dialT = P.makeDial(root, 1.5, 1.9, 0.6, 0.2, mt);

        var pins = [
            { v: [-1.5, 0.9, 0] },    /* cabezal fijo */
            { v: [1.5, 0.9, 0] },     /* cabezal móvil */
            { v: [0, 1.1, 0.2] },     /* probeta */
            { v: [2.2, 0.9, 0] },     /* volante */
            { v: [1.5, 1.9, 0.6] },   /* medidor de ángulo */
            { v: [0, 0.3, 1.0] }      /* base */
        ];

        function set(p, prm) {
            var carga = P.ease(P.seg(p, 0, 0.85));
            var falla = P.seg(p, 0.85, 1.0);

            var T = (prm.T || 0.6) * carga;         /* kN·m */
            var d = (prm.d || 50) / 1000;
            var J = Math.PI * Math.pow(d, 4) / 32;
            var tau = (T * 1000) * (d / 2) / (J * 1e6);   /* MPa */
            var G = prm.G || 79.3e3;                   /* MPa */
            var gamma = tau / G;
            var thDeg = prm.thDeg != null ? prm.thDeg : (gamma * (prm.L || 1000) / (d / 2)) * 180 / Math.PI;

            headR.rotation.x = carga * (thDeg * Math.PI / 180);
            wheel.rotation.x = carga * (thDeg * Math.PI / 180) * 2.5;
            spec.rotation.x = headR.rotation.x * 0.5;
            dialT.rotation.z = -carga * 3.6;

            /* deformación helicoidal al acercarse a la falla */
            markers.forEach(function (m, i) { m.rotation.x = falla * 0.4 * (i - 1); });

            var ph = p < 0.5 ? 0 : p < 0.85 ? 1 : 2;
            return {
                hud: [
                    { k: 'T', v: P.fmt(T * 1000, 0), u: 'N·m' },
                    { k: 'τ', v: P.fmt(Math.max(0, tau), 1), u: 'MPa' },
                    { k: 'γ', v: gamma.toExponential(2), u: '—' },
                    { k: 'θ', v: P.fmt(carga * thDeg, 2), u: '°' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_TORSION = {
        accent: ACC.torsion, machine: 'Banco de torsión',
        machineSub: 'Cabezal fijo, cabezal giratorio con volante y medidor angular',
        norma: 'ASTM E143 · NTC 3655', duration: 15,
        phases: [
            { a: 0, b: 0.50, t: 'Aplicar torque', d: 'El cabezal gira transmitiendo el momento torsor.' },
            { a: 0.50, b: 0.85, t: 'Deformación angular', d: 'Se registra el giro θ y el esfuerzo cortante τ.' },
            { a: 0.85, b: 1.01, t: 'Falla por torsión', d: 'El material alcanza su resistencia y se retuerce.' }
        ],
        parts: [
            { name: 'Cabezal fijo', desc: 'Sujeta el extremo que no gira.' },
            { name: 'Cabezal móvil', desc: 'Transmite el momento torsor a la probeta.' },
            { name: 'Probeta cilíndrica', desc: 'Espécimen que trabaja a cortante por torsión.' },
            { name: 'Volante', desc: 'Acciona el giro del cabezal móvil.' },
            { name: 'Medidor de ángulo', desc: 'Mide el giro relativo θ entre extremos.' },
            { name: 'Base del banco', desc: 'Soporte rígido del conjunto.' }
        ],
        cam: {
            target: [0, 0.9, 0],
            home: { theta: 0.7, phi: 1.14, radius: 7.4 },
            frontal: { theta: 0.0, phi: 1.32, radius: 7.2 },
            lateral: { theta: 1.5, phi: 1.2, radius: 7.0 },
            detalle: { theta: 0.5, phi: 1.16, radius: 4.6 }
        }
    };
    function paramsTorsion() {
        var d = datos('torsion');
        var o = { d: 50, L: 1000, T: 0.6, thDeg: 6, tau: 50, G: 79.3e3, real: false };
        if (d) {
            if (isFinite(d.d)) o.d = d.d;
            if (isFinite(d.L)) o.L = d.L;
            if (isFinite(d.T)) o.T = d.T;
            if (isFinite(d.thDeg)) o.thDeg = d.thDeg;
            if (isFinite(d.tau)) o.tau = d.tau;
            if (isFinite(d.G)) o.G = d.G;
            o.real = isFinite(d.tau);
        }
        o.nota = o.real
            ? 'Con tus resultados: τ = ' + P.fmt(o.tau, 1) + ' MPa · θ = ' + P.fmt(o.thDeg, 2) + '°'
            : 'Valores típicos de ejemplo (τ ≈ 50 MPa). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  5 · DURÓMETRO ROCKWELL                                            */
    /* ================================================================== */
    function buildDureza(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        P.plinth(root, 3.0, 2.4, accent);

        P.box(root, 2.4, 0.2, 2.0, 0, 0.1, 0, mt.frameDark);
        P.box(root, 2.2, 0.08, 1.8, 0, 0.24, 0, mt.frame);

        /* columna y cabezal del durómetro */
        P.cyl(root, 0.16, 0.2, 1.6, -0.8, 1.0, 0, mt.frame, 24);
        P.box(root, 1.6, 0.4, 1.2, 0.2, 1.9, 0, mt.frame);
        P.box(root, 1.4, 0.12, 1.0, 0.2, 2.14, 0, mt.frameLight);
        /* carátula del durómetro */
        var dial = P.makeDial(root, 0.5, 1.95, 0.62, 0.3, mt);

        /* husillo y penetrador */
        var spindle = P.cyl(root, 0.06, 0.06, 0.9, 0.2, 1.25, 0, mt.chrome, 16);
        var tip = new THREE.Group();
        root.add(tip);
        var tipCone = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 20), new THREE.MeshStandardMaterial({ color: 0xd0d5dc, metalness: 0.9, roughness: 0.15 }));
        tipCone.position.set(0.2, 0.75, 0);
        tip.add(tipCone);

        /* yunque y probeta */
        P.cyl(root, 0.3, 0.34, 0.12, 0.2, 0.32, 0, mt.plate, 32);
        var probeta = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.6), new THREE.MeshStandardMaterial({ color: 0x9aa3ad, metalness: 0.85, roughness: 0.3 }));
        probeta.position.set(0.2, 0.46, 0);
        root.add(probeta);
        /* huella */
        var mark = P.cyl(root, 0.03, 0.03, 0.01, 0.2, 0.54, 0, mt.red, 16);
        mark.scale.y = 0.001;

        /* manivela de carga */
        var lever = P.cylX(root, 0.05, 0.05, 0.6, 1.1, 0.9, 0, mt.chromeDark, 14);
        P.cylX(root, 0.12, 0.12, 0.1, 1.4, 0.9, 0, mt.black, 20);

        var pins = [
            { v: [0.5, 2.4, 0.62] },   /* carátula */
            { v: [0.2, 1.9, 0] },      /* cabezal */
            { v: [0.2, 0.75, 0] },     /* penetrador */
            { v: [0.2, 0.46, 0.3] },   /* probeta */
            { v: [0.2, 0.32, 0] },     /* yunque */
            { v: [1.1, 0.9, 0] }       /* manivela */
        ];

        function set(p, prm) {
            var carga = P.ease(P.seg(p, 0, 0.5));      /* carga preliminar + mayor */
            var medicion = P.seg(p, 0.5, 0.9);
            var descarga = P.seg(p, 0.9, 1.0);

            var lect = (prm.lecturas && prm.lecturas.length) ? prm.lecturas : [32, 33, 31.5];
            var escala = prm.escala || 'HRC';
            var idx = Math.min(lect.length - 1, Math.floor(medicion * lect.length));
            var valor = Medicion(lect, medicion);

            /* el penetrador desciende y deja huella */
            var down = carga * 0.12 + medicion * 0.02;
            spindle.position.y = 1.25 - down * 0.4;
            tip.position.y = -down;
            tipCone.position.y = 0.75 - down * 0.6;
            probeta.position.y = 0.46 - down * 0.1;
            mark.scale.y = medicion > 0.05 ? 1 : 0.001;
            dial.rotation.z = -carga * 2.4 + valor * 0.05;
            lever.rotation.y = carga * 1.6;

            var ph = p < 0.5 ? 0 : p < 0.9 ? 1 : 2;
            return {
                hud: [
                    { k: 'Escala', v: String(escala), u: '' },
                    { k: 'Lectura', v: P.fmt(valor, 1), u: '' },
                    { k: 'Ensayo', v: String(Math.min(lect.length, Math.ceil(medicion * lect.length) || 1)), u: 'de ' + lect.length },
                    { k: 'Promedio', v: P.fmt(prom(lect), 1), u: escala }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }
    function Medicion(lect, t) {
        /* interpola las lecturas conforme avanza la medición */
        var x = t * (lect.length - 1);
        var i = Math.floor(x), f = x - i;
        var a = lect[i], b = lect[Math.min(lect.length - 1, i + 1)];
        return a + (b - a) * f;
    }
    function prom(l) { var s = 0; for (var i = 0; i < l.length; i++) s += l[i]; return l.length ? s / l.length : 0; }

    var META_DUREZA = {
        accent: ACC.dureza, machine: 'Durómetro Rockwell',
        machineSub: 'Penetrador de cono, yunque y carátula analógica',
        norma: 'ASTM E18 · NTC 588', duration: 12,
        phases: [
            { a: 0, b: 0.50, t: 'Carga preliminar y mayor', d: 'Se aplica la carga inicial y luego la carga mayor.' },
            { a: 0.50, b: 0.90, t: 'Medir la dureza', d: 'Se leen las unidades en la carátula del durómetro.' },
            { a: 0.90, b: 1.01, t: 'Descargar y tomar lecturas', d: 'Se retira la carga y se promedian las lecturas.' }
        ],
        parts: [
            { name: 'Carátula del durómetro', desc: 'Indica las unidades de dureza Rockwell.' },
            { name: 'Cabezal', desc: 'Soporte del husillo y del sistema de carga.' },
            { name: 'Penetrador', desc: 'Cono de diamante que deja la huella.' },
            { name: 'Probeta', desc: 'Pieza metálica cuya dureza se mide.' },
            { name: 'Yunque', desc: 'Apoyo rígido donde se asienta la probeta.' },
            { name: 'Manivela de carga', desc: 'Aplica la carga mayor controlada.' }
        ],
        cam: {
            target: [0.3, 1.2, 0],
            home: { theta: 0.7, phi: 1.12, radius: 6.0 },
            frontal: { theta: 0.0, phi: 1.3, radius: 5.8 },
            lateral: { theta: 1.5, phi: 1.2, radius: 5.6 },
            detalle: { theta: 0.5, phi: 1.15, radius: 3.6 }
        }
    };
    function paramsDureza() {
        var d = datos('dureza');
        var o = { escala: 'HRC', lecturas: [32, 33, 31.5], real: false };
        if (d && d.lecturas && d.lecturas.length) {
            o.lecturas = d.lecturas.slice();
            if (d.escala) o.escala = d.escala;
            o.real = true;
        }
        o.nota = o.real
            ? 'Con tus resultados: promedio = ' + P.fmt(prom(o.lecturas), 1) + ' ' + o.escala
            : 'Valores típicos de ejemplo (HRC ≈ 32). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  REGISTRO                                                          */
    /* ================================================================== */
    G3.register('rm-traccion', META_TRACCION, buildTraccion, paramsTraccion);
    G3.register('rm-compresion', META_COMPRESION, buildCompresion, paramsCompresion);
    G3.register('rm-flexion', META_FLEXION, buildFlexion, paramsFlexion);
    G3.register('rm-torsion', META_TORSION, buildTorsion, paramsTorsion);
    G3.register('rm-dureza', META_DUREZA, buildDureza, paramsDureza);

})(window);
