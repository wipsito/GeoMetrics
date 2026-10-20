/**
 * GeoMetrics — Laboratorio 3D · Mecánica de Suelos I
 * 8 escenas registradas sobre el visor GeoLab3D (js/lab3d-ensayos.js).
 *
 * Contrato por escena (lo aplica el visor):
 *   builder(accent) → { root, pins[], set(p, prm) }
 *   set()  → { hud:[4 × {k,v,u}], phase:int }
 *   meta.parts.length DEBE igualar machine.pins.length
 *   paramsFn() nunca lanza; devuelve { real, nota, ...parámetros }
 *
 * Los datos guardados en «Ensayos» viven en window.__datosEnsayo con
 * prefijos cortos: h, g, l, ge, cp, d, c, p.
 */
(function (global) {
    'use strict';
    var G3 = global.GeoLab3D;
    if (!G3 || !G3.register) return;
    var P = G3.prim;

    var ACC = {
        humedad: '#3B82F6', granulometria: '#38BDF8', limites: '#A78BFA', gravedad: '#2DD4BF',
        compactacion: '#FBBF24', densidad: '#F43F5E', clasificacion: '#22C55E', permeabilidad: '#38BDF8'
    };

    function datos(pref) {
        try { return (global.__datosEnsayo && global.__datosEnsayo[pref]) || null; } catch (e) { return null; }
    }

    /* ================================================================== */
    /*  1 · HORNILLA / ESTUFA + BALANZA (contenido de humedad)            */
    /* ================================================================== */
    function buildHumedad(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        P.plinth(root, 4.4, 3.0, accent);

        /* mesa */
        P.box(root, 3.6, 0.16, 2.2, 0, 0.08, 0, mt.frameDark);
        P.box(root, 3.4, 0.06, 2.0, 0, 0.19, 0, mt.frame);
        [[-1.6, -0.95], [1.6, -0.95], [-1.6, 0.95], [1.6, 0.95]].forEach(function (p) {
            P.box(root, 0.16, 0.16, 0.16, p[0], 0.0, p[1], mt.black);
        });

        /* balanza */
        P.box(root, 1.0, 0.42, 0.8, -1.05, 0.5, 0.1, mt.frameLight);
        P.box(root, 0.92, 0.04, 0.72, -1.05, 0.73, 0.1, mt.chromeDark);
        var pan = P.cyl(root, 0.26, 0.26, 0.04, -1.05, 0.78, 0.1, mt.chrome, 36);
        var panBase = 0.78;

        /* recipiente con suelo (sobre el plato) */
        var dish = new THREE.Group();
        root.add(dish);
        P.cyl(dish, 0.24, 0.2, 0.14, 0, 0, 0, mt.chrome, 32);
        var soil = P.cyl(dish, 0.21, 0.18, 0.1, 0, 0.03, 0, mt.soilDark, 32);
        dish.position.set(-1.05, 0.85, 0.1);

        /* estufa / hornilla */
        P.box(root, 1.2, 1.1, 1.0, 1.0, 0.75, 0, mt.frameDark);
        var doorMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, metalness: 0.5, roughness: 0.35, transparent: true, opacity: 0.9 });
        var door = P.box(root, 1.02, 0.86, 0.06, 1.0, 0.78, 0.52, doorMat);
        P.cylZ(root, 0.03, 0.03, 0.12, 1.42, 0.78, 0.57, mt.chrome, 12);
        var heater = P.box(root, 0.9, 0.06, 0.7, 1.0, 0.32, 0, mt.red);
        heater.visible = false;
        var glow = new THREE.PointLight(0xFBBF24, 0, 4);
        glow.position.set(1.0, 0.7, 0);
        root.add(glow);
        /* llama / resistencia visible al secar */
        var coil = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.02, 8, 24), mt.red);
        coil.rotation.x = Math.PI / 2;
        coil.position.set(1.0, 0.6, 0);
        root.add(coil);

        /* bloque de pesas patrón */
        [0.14, 0.1, 0.06].forEach(function (w, i) { P.cyl(root, w, w, 0.08, 1.55, 0.24 + i * 0.09, -0.75, i % 2 ? mt.plate : mt.black, 28); });

        var pins = [
            { v: [-1.05, 1.15, 0.1] },   /* balanza */
            { v: [-1.05, 0.92, 0.1] },   /* recipiente */
            { v: [1.0, 1.5, 0] },        /* estufa */
            { v: [1.0, 0.62, 0.3] },     /* resistencia */
            { v: [1.55, 0.5, -0.75] },   /* pesas patrón */
            { v: [0, 0.3, 1.1] }         /* mesa */
        ];

        function set(p, prm) {
            var t1 = P.seg(p, 0, 0.30);          /* pesar húmeda */
            var t2 = P.seg(p, 0.30, 0.72);       /* secar */
            var t3 = P.seg(p, 0.72, 1.0);        /* pesar seca */
            var secado = P.ease(t2);

            var recipiente = prm.recipiente, humeda = prm.humeda, seca = prm.seca;
            var agua = Math.max(0, humeda - seca);
            var w = seca > recipiente ? agua / (seca - recipiente) * 100 : 0;

            /* masa mostrada según la etapa */
            var masa = t1 < 1 ? humeda : (t3 > 0 ? P.lerp(humeda, seca, secado) : humeda);
            /* el plato se hunde según la masa */
            pan.position.y = panBase - (masa / Math.max(humeda, 1)) * 0.05;
            dish.position.y = 0.85 - (masa / Math.max(humeda, 1)) * 0.05;

            /* la muestra pasa a la estufa y cambia de color al secarse */
            var mover = P.ease(P.seg(p, 0.28, 0.40));
            dish.position.x = P.lerp(-1.05, 1.0, mover);
            dish.position.z = P.lerp(0.1, 0.9, mover);
            var col = new THREE.Color(0x7c4a24).lerp(new THREE.Color(0xb98a5a), secado);
            soil.material = soil.material.clone();
            soil.material.color.copy(col);
            soil.scale.y = P.lerp(1, 0.82, secado);

            heater.visible = t2 > 0.02 && t2 < 0.999;
            coil.visible = heater.visible;
            glow.intensity = 1.4 * Math.sin(Math.PI * t2);
            door.rotation.y = -0.9 * (t2 > 0.02 ? 1 : 0);

            var ph = p < 0.30 ? 0 : p < 0.72 ? 1 : 2;
            return {
                hud: [
                    { k: 'W húmeda', v: P.fmt(humeda, 1), u: 'g' },
                    { k: 'W seca', v: P.fmt(seca, 1), u: 'g' },
                    { k: 'Ww', v: P.fmt(agua, 2), u: 'g' },
                    { k: 'w', v: P.fmt(w, 2), u: '%' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_HUMEDAD = {
        accent: ACC.humedad, machine: 'Balanza de precisión y estufa',
        machineSub: 'Cápsula de aluminio, balanza 0,01 g y hornilla a 110 °C',
        norma: 'ASTM D2216 · INV E-122', duration: 12,
        phases: [
            { a: 0, b: 0.30, t: 'Pesar la muestra húmeda', d: 'Se registra la masa húmeda más el recipiente.' },
            { a: 0.30, b: 0.72, t: 'Secar en estufa a 110 °C', d: 'El agua se evapora hasta masa constante.' },
            { a: 0.72, b: 1.0, t: 'Pesar la muestra seca', d: 'Por diferencia se obtiene el agua y el suelo seco.' }
        ],
        parts: [
            { name: 'Balanza de precisión', desc: 'Determina la masa con apreciación de 0,01 g.' },
            { name: 'Recipiente (cápsula)', desc: 'Contiene la muestra de suelo durante el pesaje y el secado.' },
            { name: 'Estufa / hornilla', desc: 'Secado a 110 ± 5 °C hasta masa constante.' },
            { name: 'Resistencia calefactora', desc: 'Aporta el calor que evapora el agua libre.' },
            { name: 'Pesas patrón', desc: 'Permiten calibrar y verificar la balanza.' },
            { name: 'Mesa de trabajo', desc: 'Superficie nivelada y estable para el ensayo.' }
        ],
        cam: {
            target: [0, 0.9, 0],
            home: { theta: 0.7, phi: 1.15, radius: 6.4 },
            frontal: { theta: 0.0, phi: 1.3, radius: 6.4 },
            lateral: { theta: 1.5, phi: 1.22, radius: 6.2 },
            detalle: { theta: 0.6, phi: 1.2, radius: 4.0 }
        }
    };
    function paramsHumedad() {
        var d = datos('h');
        var o = { recipiente: 18.4, humeda: 128.6, seca: 112.2, real: false };
        if (d && isFinite(d.recipiente) && isFinite(d.humeda) && isFinite(d.seca)) {
            o.recipiente = d.recipiente; o.humeda = d.humeda; o.seca = d.seca; o.real = true;
        }
        o.nota = o.real
            ? 'Con tus resultados: w = ' + P.fmt((d.agua / d.suelo) * 100, 2) + ' %'
            : 'Valores típicos de ejemplo (w ≈ 17 %). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  2 · TAMIZADORA VIBRATORIA (granulometría)                         */
    /* ================================================================== */
    function buildGranulometria(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        P.plinth(root, 4.2, 3.2, accent);

        /* base de la tamizadora */
        P.box(root, 3.2, 0.2, 2.4, 0, 0.1, 0, mt.frameDark);
        P.box(root, 3.0, 0.08, 2.2, 0, 0.24, 0, mt.frame);
        /* resortes y motor */
        [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]].forEach(function (p) {
            P.cyl(root, 0.06, 0.06, 0.3, p[0], 0.42, p[1], mt.chromeDark, 14);
        });
        P.box(root, 1.1, 0.5, 0.8, -1.55, 0.55, 0, mt.blue);
        P.cylX(root, 0.16, 0.16, 0.3, -2.1, 0.55, 0, mt.frameDark, 20);

        /* torre de tamices */
        var tower = new THREE.Group();
        root.add(tower);
        var R = 0.72, TH = 0.16, N = 6;
        var sieves = [];
        for (var i = 0; i < N; i++) {
            var y = 0.62 + i * TH;
            var g = P.cyl(tower, R - i * 0.01, R - i * 0.01, TH, 0, y, 0, mt.frame, 40);
            /* marco de acento */
            var ring = new THREE.Mesh(new THREE.TorusGeometry(R - i * 0.01, 0.02, 8, 40), mt.accent);
            ring.rotation.x = Math.PI / 2; ring.position.set(0, y + TH / 2, 0);
            tower.add(ring);
            /* malla */
            var mesh = new THREE.Mesh(new THREE.CircleGeometry(R - i * 0.01 - 0.02, 32),
                new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.6, roughness: 0.5, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
            mesh.rotation.x = -Math.PI / 2; mesh.position.set(0, y + TH / 2 - 0.02, 0);
            tower.add(mesh);
            sieves.push(g);
        }
        /* tapa y fondo */
        var cap = P.cyl(tower, R + 0.02, R + 0.02, 0.08, 0, 0.62 + N * TH + 0.02, 0, mt.frameLight, 40);
        var panF = P.cyl(tower, R + 0.02, R + 0.02, 0.1, 0, 0.55, 0, mt.frameDark, 40);
        /* bandeja de suelo retenido */
        var pile = P.cyl(root, 0.5, 0.55, 0.16, 1.35, 0.34, 0.55, mt.soilDark, 28);

        var pins = [
            { v: [0, 1.5, 0] },        /* torre de tamices */
            { v: [0.74, 0.9, 0] },     /* marco / malla */
            { v: [-1.55, 0.9, 0] },    /* motor */
            { v: [1.2, 0.5, -0.8] },   /* resortes */
            { v: [0, 0.32, 1.2] },     /* base */
            { v: [1.35, 0.5, 0.55] }   /* bandeja */
        ];

        function set(p, prm) {
            var mont = P.ease(P.seg(p, 0, 0.28));
            var vib = P.seg(p, 0.28, 0.82);
            var pes = P.ease(P.seg(p, 0.82, 1.0));
            var amp = Math.sin(p * 42) * 0.035 * (vib > 0 && vib < 1 ? 1 : 0);

            tower.position.y = amp - (1 - mont) * 0.3;
            tower.position.x = amp * 0.6;
            tower.rotation.z = amp * 0.4;
            cap.position.y = 0.62 + N * TH + 0.02 + amp;

            /* el suelo se reparte: fracción retenida crece */
            pile.scale.y = 0.2 + pes * 1.2;
            pile.visible = p > 0.7;

            var d60 = prm.D60, d10 = d60 / 6, d30 = d60 / 2;
            var Cu = d60 / d10, Cc = (d30 * d30) / (d10 * d60);
            var pasa = prm.p4 != null ? P.lerp(prm.p4, prm.p200, 0.5) : 55;
            pasa = pasa * P.lerp(0.05, 1, Math.min(p / 0.82, 1));

            var ph = p < 0.28 ? 0 : p < 0.82 ? 1 : 2;
            return {
                hud: [
                    { k: '% pasa', v: P.fmt(pasa, 1), u: '%' },
                    { k: 'D60', v: P.fmt(d60, 2), u: 'mm' },
                    { k: 'Cu', v: P.fmt(Cu, 2), u: '—' },
                    { k: 'Cc', v: P.fmt(Cc, 2), u: '—' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_GRANULOMETRIA = {
        accent: ACC.granulometria, machine: 'Tamizadora vibratoria y juego de tamices',
        machineSub: 'Serie de tamices normalizados apilados sobre tamizadora',
        norma: 'ASTM D6913 · INV E-123', duration: 16,
        phases: [
            { a: 0, b: 0.28, t: 'Montar la torre de tamices', d: 'Se apilan los tamices de mayor a menor abertura.' },
            { a: 0.28, b: 0.82, t: 'Tamizar (10 min)', d: 'La vibración reparte las partículas por tamaño.' },
            { a: 0.82, b: 1.0, t: 'Pesar los retenidos', d: 'Se calcula el porcentaje que pasa por cada tamiz.' }
        ],
        parts: [
            { name: 'Torre de tamices', desc: 'Ordena la muestra por abertura decreciente.' },
            { name: 'Marco y malla', desc: 'Cada tamiz tiene una malla normalizada que retiene las partículas mayores.' },
            { name: 'Motor de la tamizadora', desc: 'Genera la vibración que agita la muestra.' },
            { name: 'Resortes de suspensión', desc: 'Amortiguan y permiten el movimiento vibratorio.' },
            { name: 'Base de la tamizadora', desc: 'Estructura rígida donde apoya la torre.' },
            { name: 'Bandeja de retenidos', desc: 'Recibe y conserva el material separado.' }
        ],
        cam: {
            target: [0, 1.1, 0],
            home: { theta: 0.7, phi: 1.12, radius: 6.6 },
            frontal: { theta: 0.0, phi: 1.3, radius: 6.4 },
            lateral: { theta: 1.5, phi: 1.2, radius: 6.2 },
            detalle: { theta: 0.5, phi: 1.15, radius: 4.2 }
        }
    };
    function paramsGranulometria() {
        var d = datos('g');
        var o = { D60: 1.6, p4: 78, p200: 24, real: false };
        if (d) {
            if (isFinite(d.D60)) o.D60 = d.D60;
            if (isFinite(d.fPct)) o.p200 = d.fPct;
            if (isFinite(d.aPct) && isFinite(d.fPct)) o.p4 = Math.min(100, d.aPct + d.fPct);
            o.real = true;
        }
        o.nota = o.real
            ? 'Con tus resultados: Cu y Cc de la curva granulométrica.'
            : 'Valores típicos de ejemplo. Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  3 · COPA DE CASAGRANDE (límites de Atterberg)                     */
    /* ================================================================== */
    function buildLimites(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        P.plinth(root, 3.6, 2.6, accent);

        /* base */
        P.box(root, 2.6, 0.18, 1.8, 0, 0.09, 0, mt.frameDark);
        P.box(root, 2.4, 0.08, 1.6, 0, 0.22, 0, mt.frame);
        /* columna y manivela */
        P.cyl(root, 0.14, 0.16, 1.0, 0.95, 0.72, 0, mt.frame, 20);
        var crankG = new THREE.Group();
        crankG.position.set(0.95, 1.24, 0);
        root.add(crankG);
        P.box(crankG, 0.5, 0.05, 0.06, 0.25, 0, 0, mt.chrome);
        P.cylZ(crankG, 0.05, 0.05, 0.08, 0.5, 0, 0, mt.accent, 16);

        /* yunque y copa */
        P.box(root, 0.7, 0.16, 0.9, -0.55, 0.32, 0, mt.frameDark);
        var cup = new THREE.Group();
        cup.position.set(-0.55, 0.44, 0);
        root.add(cup);
        var bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.3, 0.16, 36), mt.chrome);
        cup.add(bowl);
        var cupBottom = P.cyl(cup, 0.3, 0.3, 0.04, 0, -0.1, 0, mt.chromeDark, 36);
        /* muestra de suelo en la copa */
        var suelo = P.cyl(cup, 0.4, 0.28, 0.08, 0, 0.02, 0, mt.soilDark, 36);
        /* ranura (dos medias lunas) */
        var slotL = P.box(cup, 0.05, 0.02, 0.5, -0.18, 0.07, 0, mt.black);
        var slotR = P.box(cup, 0.05, 0.02, 0.5, 0.18, 0.07, 0, mt.black);

        /* ranurador acanalado */
        var groover = new THREE.Group();
        groover.position.set(0.4, 0.5, 0.7);
        root.add(groover);
        P.box(groover, 0.04, 0.5, 0.04, 0, 0.2, 0, mt.chromeDark);
        P.box(groover, 0.1, 0.12, 0.3, 0, -0.05, 0, mt.chrome);

        /* cápsula de límite plástico */
        var plastG = new THREE.Group();
        plastG.position.set(-1.2, 0.25, 0.8);
        root.add(plastG);
        var cil = P.cyl(plastG, 0.09, 0.09, 0.36, 0, 0.18, 0, mt.soilDark, 20);
        cil.rotation.z = Math.PI / 2;

        var pins = [
            { v: [-0.55, 0.62, 0] },   /* copa */
            { v: [-0.55, 0.5, 0.35] }, /* ranura */
            { v: [0.95, 1.3, 0] },     /* manivela */
            { v: [0.4, 0.7, 0.7] },    /* ranurador */
            { v: [-1.2, 0.45, 0.8] },  /* rollito LP */
            { v: [0, 0.3, -1.1] }      /* base */
        ];

        function set(p, prm) {
            var gir = P.ease(P.seg(p, 0, 0.80));
            var cerrar = P.ease(P.seg(p, 0.80, 1.0));
            var ang = gir * Math.PI * 6;
            crankG.rotation.x = ang;
            cup.position.y = 0.44 + Math.abs(Math.sin(ang)) * 0.06 * (1 - cerrar);
            cup.rotation.z = Math.sin(ang) * 0.06 * (1 - cerrar);

            /* la ranura se cierra */
            var gap = P.lerp(0.18, 0.01, cerrar);
            slotL.position.x = -gap; slotR.position.x = gap;
            groover.visible = p < 0.82;
            groover.position.y = 0.5 + P.ease(P.seg(p, 0, 0.2)) * 0.3;
            groover.rotation.z = P.lerp(0.4, 0, P.ease(P.seg(p, 0, 0.25)));

            /* rollito plástico se adelgaza */
            var roll = P.ease(P.seg(p, 0.5, 1.0));
            cil.scale.y = P.lerp(1, 0.35, roll);
            cil.scale.z = P.lerp(1, 0.35, roll);
            plastG.rotation.y = roll * 3;

            var ll = prm.ll, lp = prm.lp, ip = ll - lp;
            var golpes = Math.round(P.lerp(40, 25, gir));
            var ph = p < 0.80 ? 0 : 1;
            return {
                hud: [
                    { k: 'Golpes', v: String(golpes), u: '' },
                    { k: 'LL', v: P.fmt(ll, 1), u: '%' },
                    { k: 'LP', v: P.fmt(lp, 1), u: '%' },
                    { k: 'IP', v: P.fmt(ip, 1), u: '%' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_LIMITES = {
        accent: ACC.limites, machine: 'Copa de Casagrande y ranurador',
        machineSub: 'Copa de latón con manivela, ranurador y cápsula de LP',
        norma: 'ASTM D4318 · INV E-125', duration: 14,
        phases: [
            { a: 0, b: 0.25, t: 'Preparar la muestra y la ranura', d: 'Se extiende la pasta y se abre la ranura con el ranurador.' },
            { a: 0.25, b: 0.80, t: 'Golpear la copa a 2 golpes/s', d: 'Se cuentan los golpes hasta que la ranura se cierra.' },
            { a: 0.80, b: 1.0, t: 'Registrar humedad y LP', d: 'Con tres puntos se traza la recta de fluidez (LL) y con el rollito el LP.' }
        ],
        parts: [
            { name: 'Copa de Casagrande', desc: 'Recipiente de latón que golpea contra el yunque.' },
            { name: 'Ranura de la muestra', desc: 'Separación que se cierra cuando la pasta fluye.' },
            { name: 'Manivela', desc: 'Acciona la copa a razón de 2 golpes por segundo.' },
            { name: 'Ranurador', desc: 'Herramienta acanalada que abre la ranura normalizada.' },
            { name: 'Rollito de LP', desc: 'Con el límite plástico la muestra se enrolla hasta 3 mm.' },
            { name: 'Base y contador', desc: 'Soporte rígido y conteo de golpes del ensayo.' }
        ],
        cam: {
            target: [-0.3, 0.5, 0],
            home: { theta: 0.7, phi: 1.15, radius: 5.4 },
            frontal: { theta: 0.0, phi: 1.32, radius: 5.2 },
            lateral: { theta: 1.5, phi: 1.2, radius: 5.0 },
            detalle: { theta: 0.5, phi: 1.18, radius: 3.4 }
        }
    };
    function paramsLimites() {
        var d = datos('l');
        var o = { ll: 42, lp: 21, real: false };
        if (d && isFinite(d.ll)) { o.ll = d.ll; o.real = true; }
        if (d && isFinite(d.lp)) o.lp = d.lp;
        o.nota = o.real
            ? 'Con tus resultados: LL = ' + P.fmt(o.ll, 1) + ' % · IP = ' + P.fmt(o.ll - o.lp, 1) + ' %'
            : 'Valores típicos de ejemplo (LL ≈ 42 %, LP ≈ 21 %). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  4 · PICNÓMETRO Y BALANZA (gravedad específica)                    */
    /* ================================================================== */
    function buildGravedad(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        var vidrio = P.glass(0xBFDBFE, 0.28);
        P.plinth(root, 3.4, 2.4, accent);

        P.box(root, 2.4, 0.16, 1.8, 0, 0.08, 0, mt.frameDark);
        P.box(root, 2.2, 0.06, 1.6, 0, 0.19, 0, mt.frame);
        /* balanza */
        P.box(root, 1.1, 0.44, 0.9, -0.85, 0.5, 0, mt.frameLight);
        P.box(root, 1.0, 0.04, 0.8, -0.85, 0.74, 0, mt.chromeDark);
        P.cyl(root, 0.3, 0.3, 0.04, -0.85, 0.79, 0, mt.chrome, 36);

        /* picnómetro sobre plato */
        var flask = new THREE.Group();
        flask.position.set(-0.85, 0.86, 0);
        root.add(flask);
        P.cyl(flask, 0.02, 0.22, 0.16, 0, 0.06, 0, vidrio, 28);       /* cuello a base */
        P.cyl(flask, 0.22, 0.22, 0.14, 0, -0.05, 0, vidrio, 28);      /* cuerpo */
        P.cyl(flask, 0.022, 0.022, 0.16, 0, 0.22, 0, vidrio, 16);     /* cuello */
        var stopper = P.cyl(flask, 0.03, 0.03, 0.06, 0, 0.31, 0, mt.chromeDark, 16);
        var caps = new THREE.Mesh(new THREE.SphereGeometry(0.2, 24, 18), vidrio);
        caps.scale.y = 0.7; caps.position.y = -0.05;
        flask.add(caps);
        /* agua dentro */
        var water = P.cyl(flask, 0.19, 0.19, 0.1, 0, -0.06, 0, P.glass(0x60A5FA, 0.5), 28);
        water.visible = false;

        /* bandeja con suelo seco y espátula */
        var tray = P.cyl(root, 0.42, 0.46, 0.1, 1.1, 0.28, 0.5, mt.soilDark, 30);
        var spat = P.box(root, 0.03, 0.03, 0.5, 0.6, 0.42, 0.7, mt.chrome);
        spat.rotation.x = 0.5;

        var pins = [
            { v: [-0.85, 1.1, 0] },    /* balanza */
            { v: [-0.85, 0.85, 0] },   /* picnómetro */
            { v: [-0.85, 1.2, 0] },    /* frasco / cuello */
            { v: [1.1, 0.4, 0.5] },    /* bandeja de suelo */
            { v: [0.6, 0.5, 0.7] },    /* espátula */
            { v: [0, 0.3, -1.0] }      /* base */
        ];

        function set(p, prm) {
            var t1 = P.seg(p, 0, 0.3);       /* pesar seco */
            var t2 = P.seg(p, 0.3, 0.62);    /* añadir agua */
            var t3 = P.seg(p, 0.62, 1.0);    /* enrasar */

            var ms = prm.mps - prm.mp;
            var denom = ms + prm.mpw - prm.mpws;
            var gs = denom > 0 ? ms / denom : 0;

            var mover = P.ease(P.seg(p, 0.18, 0.34));
            flask.position.x = P.lerp(-0.85, -0.85, mover);
            /* el suelo entra al picnómetro */
            tray.scale.y = P.lerp(1, 0.35, mover);
            var nivel = P.clamp(t2, 0, 1) * 0.6;
            water.scale.y = Math.max(0.001, P.lerp(0.001, 1, P.clamp(P.seg(p, 0.34, 0.7), 0, 1)));
            water.visible = t2 > 0.01;
            water.position.y = -0.08 + 0.02 * nivel;

            /* burbujas que escapan al agitar */
            var agit = P.seg(p, 0.62, 0.85);
            stopper.position.y = 0.31 + Math.sin(p * 40) * 0.01 * agit;

            var masaActual = t1 < 0.5 ? prm.mps : (t2 < 0.5 ? prm.mps : prm.mpws);
            var ph = p < 0.3 ? 0 : p < 0.62 ? 1 : 2;
            return {
                hud: [
                    { k: 'Ws', v: P.fmt(ms, 2), u: 'g' },
                    { k: 'Wpw', v: P.fmt(prm.mpw, 1), u: 'g' },
                    { k: 'Wpws', v: P.fmt(prm.mpws, 1), u: 'g' },
                    { k: 'Gs', v: P.fmt(gs, 3), u: '—' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_GRAVEDAD = {
        accent: ACC.gravedad, machine: 'Picnómetro y balanza',
        machineSub: 'Frasco picnómetro calibrado, balanza 0,001 g y espátula',
        norma: 'ASTM D854 · INV E-128', duration: 12,
        phases: [
            { a: 0, b: 0.30, t: 'Pesar el suelo seco', d: 'Masa del picnómetro y del picnómetro con suelo seco.' },
            { a: 0.30, b: 0.62, t: 'Llenar con agua destilada', d: 'Se añade agua y se elimina el aire atrapado.' },
            { a: 0.62, b: 1.0, t: 'Enrasar y pesar', d: 'Se pesa el conjunto y se calcula Gs = Ws/(Ws+Wpw−Wpws).' }
        ],
        parts: [
            { name: 'Balanza de precisión', desc: 'Mide la masa con apreciación de 0,001 g.' },
            { name: 'Picnómetro', desc: 'Frasco calibrado de volumen conocido.' },
            { name: 'Frasco y cuello enrasado', desc: 'El cuello permite eliminar el aire y enrasar el volumen.' },
            { name: 'Bandeja de suelo seco', desc: 'Suelo pasado por el tamiz #200 listo para el ensayo.' },
            { name: 'Espátula', desc: 'Introduce la muestra y remueve las burbujas.' },
            { name: 'Base nivelada', desc: 'Superficie estable para pesajes reproducibles.' }
        ],
        cam: {
            target: [0, 0.8, 0],
            home: { theta: 0.7, phi: 1.15, radius: 5.6 },
            frontal: { theta: 0.0, phi: 1.32, radius: 5.4 },
            lateral: { theta: 1.5, phi: 1.22, radius: 5.2 },
            detalle: { theta: 0.5, phi: 1.2, radius: 3.4 }
        }
    };
    function paramsGravedad() {
        var d = datos('ge');
        var o = { mp: 34.5, mps: 59.5, mpws: 159.7, mpw: 144.7, real: false };
        if (d && isFinite(d.gs) && isFinite(d.ms)) {
            o.mps = Math.round((o.mp + d.ms) * 10) / 10;
            var denom = d.ms / d.gs;
            o.mpws = Math.round((o.mpw + d.ms - denom) * 10) / 10;
            o.real = true;
        }
        o.nota = o.real
            ? 'Con tus resultados: Gs = ' + P.fmt(d.gs, 3)
            : 'Valores típicos de ejemplo (Gs ≈ 2,69). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  5 · MOLDE PROCTOR Y MARTILLO                                      */
    /* ================================================================== */
    function buildCompactacion(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        P.plinth(root, 3.4, 3.0, accent);

        P.box(root, 2.4, 0.16, 2.2, 0, 0.08, 0, mt.frameDark);
        P.box(root, 2.2, 0.06, 2.0, 0, 0.19, 0, mt.frame);

        /* molde Proctor (cilindro abierto con collarín) */
        var R = 0.62, Hm = 0.86;
        var mold = new THREE.Group();
        mold.position.set(0, 0.2, 0);
        root.add(mold);
        var shell = new THREE.Mesh(new THREE.CylinderGeometry(R, R, Hm, 40, 1, true), P.glass(0xC8D3E0, 0.35));
        shell.position.y = Hm / 2;
        mold.add(shell);
        var base = P.cyl(mold, R + 0.04, R + 0.04, 0.08, 0, 0.02, 0, mt.frameDark, 40);
        var collar = P.cyl(mold, R + 0.02, R + 0.02, 0.16, 0, Hm + 0.06, 0, mt.frameDark, 40);
        collar.material = P.glass(0x94A3B8, 0.6);
        /* collarín transparente alternativo */
        var collar2 = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.02, R + 0.02, 0.18, 40, 1, true), P.glass(0x93C5FD, 0.4));
        collar2.position.y = Hm + 0.07;
        mold.add(collar2);

        /* capas de suelo compactado */
        var capas = [];
        for (var i = 0; i < 3; i++) {
            var c = P.cyl(mold, R - 0.02, R - 0.02, Hm / 3 - 0.02, 0, 0.06 + Hm / 6 + i * (Hm / 3), 0, i % 2 ? mt.soilDark : mt.soil, 40);
            c.scale.y = 0.001;
            capas.push(c);
        }

        /* martillo Proctor (sobre guía) */
        var hammer = new THREE.Group();
        hammer.position.set(1.05, 0.2, 0);
        root.add(hammer);
        P.cyl(hammer, 0.03, 0.03, 1.5, 0, 0.75, 0, mt.chrome, 14);
        var masa = P.cyl(hammer, 0.14, 0.14, 0.34, 0, 0.55, 0, mt.frameDark, 28);
        var masaR = P.cyl(hammer, 0.15, 0.15, 0.02, 0, 0.72, 0, mt.accent, 28);
        P.box(hammer, 0.4, 0.06, 0.1, 0, 1.5, 0, mt.frameLight);
        /* placa base del martillo */
        P.box(root, 0.5, 0.04, 0.5, 1.05, 0.23, 0, mt.chromeDark);

        var pins = [
            { v: [0, 1.1, 0] },        /* molde */
            { v: [0, 1.25, 0.3] },     /* collarín */
            { v: [0, 0.5, 0.65] },     /* capas de suelo */
            { v: [1.05, 0.75, 0] },    /* martillo */
            { v: [1.05, 1.6, 0] },     /* guía */
            { v: [0, 0.25, -0.9] }     /* base */
        ];

        function set(p, prm) {
            var w = prm.wopt, gmax = prm.gmax;
            var prog = P.clamp(p, 0, 1);
            var capasDone = prog * 3;
            capas.forEach(function (c, i) {
                var f = P.clamp(capasDone - i, 0, 1);
                c.scale.y = Math.max(0.001, P.ease(f));
                c.position.y = 0.06 + (Hm / 3) * (i + 0.5);
                c.visible = f > 0.001;
            });
            /* martillo cayendo y subiendo */
            var golpe = Math.abs(Math.sin(prog * Math.PI * 24));
            masa.position.y = 0.55 + golpe * 0.5;
            masaR.position.y = 0.72 + golpe * 0.5;

            /* curva γd–w evaluada en el avance */
            var wAct = P.lerp(4, Math.min(28, w * 2 + 2), prog);
            var gd = gmax * Math.exp(-Math.pow(wAct - w, 2) / (2 * 4.6 * 4.6));
            var gh = gd * (1 + wAct / 100);

            var ph = p < 0.33 ? 0 : p < 0.66 ? 1 : 2;
            return {
                hud: [
                    { k: 'w', v: P.fmt(wAct, 1), u: '%' },
                    { k: 'γd', v: P.fmt(gd, 3), u: 'g/cm³' },
                    { k: 'γh', v: P.fmt(gh, 3), u: 'g/cm³' },
                    { k: 'Golpes', v: String(Math.round(prog * 56)), u: '' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_COMPACTACION = {
        accent: ACC.compactacion, machine: 'Molde Proctor y martillo',
        machineSub: 'Molde cilíndrico con collarín y martillo de 2,5 kg',
        norma: 'ASTM D698 · INV E-142', duration: 16,
        phases: [
            { a: 0, b: 0.33, t: 'Compactar la primera capa', d: '25 golpes distribuidos sobre la capa.' },
            { a: 0.33, b: 0.66, t: 'Compactar las capas restantes', d: 'Se repiten 3 capas en total para el Proctor estándar.' },
            { a: 0.66, b: 1.0, t: 'Enrasar, pesar y repetir', d: 'Con molde + suelo se obtienen γh y γd de cada punto.' }
        ],
        parts: [
            { name: 'Molde Proctor', desc: 'Cilindro de volumen conocido (≈944 cm³).' },
            { name: 'Collarín', desc: 'Extensión que permite enrasar la última capa.' },
            { name: 'Capas de suelo', desc: 'El suelo compactado se acomoda en capas sucesivas.' },
            { name: 'Martillo Proctor', desc: 'Masa de 2,5 kg que cae desde 30,5 cm.' },
            { name: 'Guía del martillo', desc: 'Asegura la altura de caída normalizada.' },
            { name: 'Base y placa', desc: 'Soporte firme del molde durante el ensayo.' }
        ],
        cam: {
            target: [0, 0.8, 0],
            home: { theta: 0.7, phi: 1.12, radius: 6.0 },
            frontal: { theta: 0.0, phi: 1.3, radius: 5.8 },
            lateral: { theta: 1.5, phi: 1.2, radius: 5.6 },
            detalle: { theta: 0.5, phi: 1.15, radius: 3.6 }
        }
    };
    function paramsCompactacion() {
        var d = datos('cp');
        var o = { wopt: 13, gmax: 1.92, real: false };
        if (d && d.max && isFinite(d.max.w) && isFinite(d.max.ds)) {
            o.wopt = d.max.w; o.gmax = d.max.ds; o.real = true;
        }
        o.nota = o.real
            ? 'Con tus resultados: wópt = ' + P.fmt(o.wopt, 1) + ' % · γd máx = ' + P.fmt(o.gmax, 3) + ' g/cm³'
            : 'Valores típicos de ejemplo (wópt ≈ 13 %, γd ≈ 1,92 g/cm³). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  6 · CONO DE ARENA Y PLACA BASE (densidad de campo)                */
    /* ================================================================== */
    function buildDensidad(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        P.plinth(root, 4.0, 3.0, accent);

        /* terreno */
        var ground = P.box(root, 3.4, 0.5, 2.4, 0, 0.25, 0, mt.soilDark);
        /* hueco excavado */
        var holeMat = new THREE.MeshStandardMaterial({ color: 0x2a3346, metalness: 0.1, roughness: 0.9 });
        var hole = P.cyl(root, 0.42, 0.3, 0.34, -0.4, 0.42, 0, holeMat, 32);
        /* el hueco se rellena con arena */
        var sandFill = P.cyl(root, 0.4, 0.4, 0.34, -0.4, 0.42, 0, mt.plate, 32);
        sandFill.scale.y = 0.001;

        /* placa base metálica con agujero */
        var plate = P.cyl(root, 0.7, 0.7, 0.05, -0.4, 0.53, 0, mt.frameLight, 40);
        var plateHole = P.cyl(root, 0.3, 0.3, 0.06, -0.4, 0.54, 0, mt.black, 28);

        /* cono de arena */
        var cone = new THREE.Group();
        cone.position.set(-0.4, 0.55, 0);
        root.add(cone);
        var coneM = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.42, 0.7, 36, 1, true), mt.chrome);
        coneM.position.y = 0.35;
        cone.add(coneM);
        var coneTop = P.cyl(cone, 0.07, 0.07, 0.08, 0, 0.72, 0, mt.chromeDark, 20);
        /* arena dentro del cono */
        var arenaCono = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.4, 0.62, 32), mt.plate);
        arenaCono.position.y = 0.33; arenaCono.scale.y = 1;
        cone.add(arenaCono);
        arenaCono.visible = false;

        /* lata/recipiente de arena */
        var can = P.cyl(root, 0.34, 0.34, 0.5, 1.1, 0.5, 0.3, mt.frame, 32);
        var canSand = P.cyl(root, 0.3, 0.3, 0.4, 1.1, 0.45, 0.3, mt.plate, 32);

        /* balanza y suelo extraído */
        P.box(root, 0.9, 0.4, 0.8, 1.15, 0.46, -0.65, mt.frameLight);
        var soilBag = P.cyl(root, 0.28, 0.32, 0.22, 1.15, 0.72, -0.65, mt.soilDark, 28);

        var pins = [
            { v: [-0.4, 0.75, 0] },    /* hueco */
            { v: [-0.4, 0.6, 0.6] },   /* placa base */
            { v: [-0.4, 1.3, 0] },     /* cono de arena */
            { v: [1.1, 0.8, 0.3] },    /* lata de arena */
            { v: [1.15, 0.9, -0.65] }, /* balanza / suelo */
            { v: [0, 0.3, 1.2] }       /* terreno */
        ];

        function set(p, prm) {
            var excav = P.ease(P.seg(p, 0, 0.25));
            var llenar = P.ease(P.seg(p, 0.25, 0.7));
            var pesar = P.seg(p, 0.7, 1.0);

            hole.visible = excav > 0.02;
            plate.visible = p > 0.22;
            plateHole.visible = p > 0.22;
            cone.visible = p > 0.25;
            arenaCono.visible = p > 0.3 && p < 0.75;
            sandFill.visible = llenar > 0.02;
            sandFill.scale.y = Math.max(0.001, llenar);

            /* la arena del cono baja al hueco */
            arenaCono.scale.y = Math.max(0.001, 1 - llenar);
            arenaCono.position.y = 0.33 - llenar * 0.1;
            canSand.scale.y = Math.max(0.001, 1 - llenar * 0.6);
            soilBag.scale.y = 0.6 + pesar * 0.6;

            var vol = (prm.cono - prm.rest) / prm.darena;
            var gh = vol > 0 ? prm.suelo / vol : 0;
            var gd = gh / (1 + prm.w / 100);
            var gc = gd / 1.80 * 100;

            var ph = p < 0.25 ? 0 : p < 0.7 ? 1 : 2;
            return {
                hud: [
                    { k: 'Vol. hueco', v: P.fmt(vol, 1), u: 'cm³' },
                    { k: 'γh', v: P.fmt(gh, 3), u: 'g/cm³' },
                    { k: 'γd', v: P.fmt(gd, 3), u: 'g/cm³' },
                    { k: 'GC', v: P.fmt(gc, 1), u: '%' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_DENSIDAD = {
        accent: ACC.densidad, machine: 'Cono de arena y placa base',
        machineSub: 'Placa circular, cono dosificador y arena calibrada',
        norma: 'ASTM D1556 · INV E-161', duration: 14,
        phases: [
            { a: 0, b: 0.25, t: 'Excavar el hueco de prueba', d: 'Se extrae el suelo cuidando no perder material.' },
            { a: 0.25, b: 0.70, t: 'Llenar el hueco con arena', d: 'El volumen de arena gastado iguala el volumen del hueco.' },
            { a: 0.70, b: 1.0, t: 'Pesar suelo y arena', d: 'Con γh y la humedad se calcula γd y el grado de compactación.' }
        ],
        parts: [
            { name: 'Hueco de prueba', desc: 'Cavidad excavada en el terreno compactado.' },
            { name: 'Placa base', desc: 'Apoya el cono y delimita el hueco.' },
            { name: 'Cono de arena', desc: 'Dosifica la arena calibrada dentro del hueco.' },
            { name: 'Lata de arena', desc: 'Arena de densidad conocida usada como patrón.' },
            { name: 'Balanza y suelo', desc: 'Pesaje del suelo extraído y de la arena restante.' },
            { name: 'Terreno compactado', desc: 'Capa de suelo cuyo grado de compactación se verifica.' }
        ],
        cam: {
            target: [0, 0.7, 0],
            home: { theta: 0.7, phi: 1.12, radius: 6.2 },
            frontal: { theta: 0.0, phi: 1.3, radius: 6.0 },
            lateral: { theta: 1.5, phi: 1.2, radius: 5.8 },
            detalle: { theta: 0.5, phi: 1.15, radius: 3.8 }
        }
    };
    function paramsDensidad() {
        var d = datos('d');
        var o = { cono: 5700, rest: 3150, darena: 1.52, suelo: 1840, w: 11, real: false };
        if (d && isFinite(d.gd) && isFinite(d.w)) {
            var vol = 620, gh = d.gd * (1 + d.w / 100);
            o.suelo = Math.round(gh * vol);
            o.rest = Math.round(o.cono - vol * o.darena);
            o.w = d.w; o.real = true;
        }
        o.nota = o.real
            ? 'Con tus resultados: γd = ' + P.fmt(d.gd, 3) + ' g/cm³'
            : 'Valores típicos de ejemplo (γd ≈ 1,74 g/cm³). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  7 · MESA DE CLASIFICACIÓN SUCS                                    */
    /* ================================================================== */
    function buildClasificacion(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        P.plinth(root, 3.8, 2.8, accent);

        P.box(root, 3.0, 0.16, 2.0, 0, 0.08, 0, mt.frameDark);
        P.box(root, 2.8, 0.06, 1.8, 0, 0.19, 0, mt.frame);
        [[-1.3, -0.85], [1.3, -0.85], [-1.3, 0.85], [1.3, 0.85]].forEach(function (p) {
            P.box(root, 0.14, 0.16, 0.14, p[0], 0, p[1], mt.black);
        });

        /* carta SUCS como panel vertical */
        var boardMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, metalness: 0.1, roughness: 0.8 });
        var board = P.box(root, 1.7, 1.25, 0.06, -0.85, 0.85, -0.2, boardMat);
        /* cuadrícula de líneas en la carta */
        for (var i = 0; i < 5; i++) {
            var vline = P.box(root, 0.008, 1.1, 0.01, -1.55 + i * 0.35, 0.85, -0.16, mt.frame);
            var hline = P.box(root, 1.5, 0.008, 0.01, -0.85, 0.35 + i * 0.25, -0.16, mt.frame);
        }
        /* línea A */
        var lineaA = P.box(root, 1.5, 0.02, 0.012, -0.85, 0.66, -0.15, mt.accent);
        lineaA.rotation.z = 0.32;
        /* marcador del suelo */
        var marker = P.cylZ(root, 0.08, 0.08, 0.04, -0.5, 0.7, -0.12, mt.blue, 20);

        /* bandejas con muestras de suelo */
        var tray1 = P.cyl(root, 0.36, 0.4, 0.1, 0.55, 0.28, 0.55, mt.soilDark, 28);
        var tray2 = P.cyl(root, 0.3, 0.34, 0.1, 1.25, 0.28, 0.3, mt.soil, 28);
        /* probetas de ensayo */
        var jar = P.cyl(root, 0.16, 0.16, 0.4, 1.35, 0.48, -0.55, P.glass(0xBFDBFE, 0.4), 24);
        var jarSoil = P.cyl(root, 0.14, 0.14, 0.2, 1.35, 0.4, -0.55, mt.soilDark, 24);

        var pins = [
            { v: [-0.85, 1.5, -0.2] },  /* carta SUCS */
            { v: [-0.85, 0.66, -0.1] }, /* línea A */
            { v: [-0.5, 0.7, -0.1] },   /* marcador */
            { v: [0.55, 0.45, 0.55] },  /* bandeja 1 */
            { v: [1.25, 0.45, 0.3] },   /* bandeja 2 */
            { v: [1.35, 0.7, -0.55] }   /* probeta */
        ];

        function set(p, prm) {
            var marcando = P.ease(P.seg(p, 0, 0.7));
            var p200 = prm.p200, ll = prm.ll, ip = prm.ip, p4 = prm.p4 != null ? prm.p4 : 100;
            var lineaA_v = 0.73 * (ll - 20);
            var sim;
            if (p200 < 50) { sim = p4 > 50 ? (p200 < 5 ? 'GW' : 'GP') : (p200 < 5 ? 'SW' : 'SP'); }
            else { sim = ll < 50 ? (ip > lineaA_v ? 'CL' : 'ML') : (ip > lineaA_v ? 'CH' : 'MH'); }

            /* el marcador se mueve a su posición en la carta */
            var tx = -1.55 + P.clamp(ll, 0, 100) / 100 * 1.4;
            var ty = 0.35 + P.clamp(ip, 0, 60) / 60 * 1.0;
            if (p200 < 50) { tx = -0.85; ty = 0.5; }
            marker.position.x = P.lerp(-0.85, tx, marcando);
            marker.position.y = P.lerp(0.9, ty, marcando);
            marker.material = marker.material;
            tray1.scale.y = 0.5 + marcando * 0.5;
            jarSoil.scale.y = 0.4 + marcando * 0.6;

            var ph = p < 0.4 ? 0 : p < 0.8 ? 1 : 2;
            return {
                hud: [
                    { k: '% #200', v: P.fmt(p200, 0), u: '%' },
                    { k: 'LL', v: P.fmt(ll, 0), u: '%' },
                    { k: 'IP', v: P.fmt(ip, 0), u: '%' },
                    { k: 'SUCS', v: sim, u: '' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_CLASIFICACION = {
        accent: ACC.clasificacion, machine: 'Mesa de clasificación y carta SUCS',
        machineSub: 'Panel de la carta de plasticidad y bandejas de muestras',
        norma: 'ASTM D2487 · INV E-126', duration: 10,
        phases: [
            { a: 0, b: 0.4, t: 'Revisar % pasa #200 y #4', d: 'Se define si el suelo es grueso o fino.' },
            { a: 0.4, b: 0.8, t: 'Ubicar LL e IP en la carta', d: 'Con la línea A se separa arcilla (C) de limo (M).' },
            { a: 0.8, b: 1.0, t: 'Leer el símbolo SUCS', d: 'Se obtiene la clasificación y la descripción del suelo.' }
        ],
        parts: [
            { name: 'Carta SUCS', desc: 'Diagrama de plasticidad con la línea A y el límite LL = 50.' },
            { name: 'Línea A', desc: 'Separa suelos arcillosos (arriba) de limosos (abajo).' },
            { name: 'Marcador del suelo', desc: 'Ubica la muestra según su LL e IP.' },
            { name: 'Bandeja de muestras gruesas', desc: 'Fracción retenida en el tamiz #4.' },
            { name: 'Bandeja de arenas', desc: 'Fracción entre los tamices #4 y #200.' },
            { name: 'Probeta de finos', desc: 'Fracción que pasa el tamiz #200 (limos y arcillas).' }
        ],
        cam: {
            target: [0, 0.85, 0],
            home: { theta: 0.7, phi: 1.12, radius: 6.0 },
            frontal: { theta: 0.0, phi: 1.3, radius: 5.8 },
            lateral: { theta: 1.5, phi: 1.2, radius: 5.6 },
            detalle: { theta: 0.5, phi: 1.15, radius: 3.6 }
        }
    };
    function paramsClasificacion() {
        var d = datos('c');
        var o = { p200: 62, ll: 46, ip: 24, p4: 92, real: false };
        if (d && isFinite(d.p200)) {
            o.p200 = d.p200;
            if (isFinite(d.ll)) o.ll = d.ll;
            if (isFinite(d.ip)) o.ip = d.ip;
            if (isFinite(d.p4)) o.p4 = d.p4;
            o.real = true;
        } else {
            var dl = datos('l');
            if (dl && isFinite(dl.ll)) { o.ll = dl.ll; if (isFinite(dl.ip)) o.ip = dl.ip; o.real = true; }
        }
        o.nota = o.real
            ? 'Con tus resultados se ubica la muestra en la carta SUCS.'
            : 'Valores típicos de ejemplo (CL). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  8 · PERMEÁMETRO DE CARGA CONSTANTE                                */
    /* ================================================================== */
    function buildPermeabilidad(accent) {
        var root = new THREE.Group();
        var mt = P.materiales();
        var vidrio = P.glass(0xBFDBFE, 0.25);
        P.plinth(root, 4.0, 2.8, accent);

        P.box(root, 3.0, 0.16, 2.0, 0, 0.08, 0, mt.frameDark);
        P.box(root, 2.8, 0.06, 1.8, 0, 0.19, 0, mt.frame);

        /* celda del permeámetro */
        var cell = new THREE.Group();
        cell.position.set(-0.6, 0.25, 0);
        root.add(cell);
        var R = 0.44, Hc = 1.2;
        var tube = new THREE.Mesh(new THREE.CylinderGeometry(R, R, Hc, 40, 1, true), vidrio);
        tube.position.y = Hc / 2; cell.add(tube);
        var sample = P.cyl(cell, R - 0.02, R - 0.02, 0.5, 0, 0.45, 0, mt.soilDark, 40);
        /* agua arriba */
        var waterTop = P.cyl(cell, R - 0.02, R - 0.02, 0.5, 0, 0.95, 0, P.glass(0x60A5FA, 0.45), 40);
        /* agua abajo / salida */
        var waterBot = P.cyl(cell, R - 0.02, R - 0.02, 0.14, 0, 0.28, 0, P.glass(0x60A5FA, 0.45), 40);
        /* placa porosa */
        var porous = P.cyl(cell, R - 0.01, R - 0.01, 0.04, 0, 0.72, 0, mt.stone, 40);

        /* depósito de carga constante */
        var tank = P.cyl(root, 0.34, 0.34, 0.9, -0.6, 1.65, 0, P.glass(0xBFDBFE, 0.3), 36);
        var tankWater = P.cyl(root, 0.31, 0.31, 0.7, -0.6, 1.6, 0, P.glass(0x60A5FA, 0.45), 36);
        /* tubo de alimentación */
        P.cyl(root, 0.03, 0.03, 1.0, -0.6, 1.15, 0.0, mt.hose, 12);

        /* probeta de recolección */
        var grad = P.cyl(root, 0.26, 0.26, 0.7, 1.1, 0.6, 0, P.glass(0xBFDBFE, 0.35), 32);
        var gradSoil = P.cyl(root, 0.24, 0.24, 0.6, 1.1, 0.5, 0, P.glass(0x38BDF8, 0.6), 32);
        gradSoil.scale.y = 0.001;
        /* tubería de salida */
        P.cyl(root, 0.025, 0.025, 0.5, 0.45, 0.3, 0, mt.hose, 12).rotation.z = Math.PI / 2;

        /* cronómetro */
        var clock = P.cylZ(root, 0.18, 0.18, 0.06, 1.1, 1.15, 0, mt.chrome, 28);
        var needle = P.cylZ(root, 0.02, 0.02, 0.02, 1.1, 1.15, 0.05, mt.red, 10);

        var pins = [
            { v: [-0.6, 1.2, 0] },     /* celda */
            { v: [-0.6, 0.7, 0.45] },  /* muestra */
            { v: [-0.6, 2.1, 0] },     /* depósito */
            { v: [-0.6, 1.2, 0.3] },   /* tubo de carga */
            { v: [1.1, 0.8, 0] },      /* probeta */
            { v: [1.1, 1.3, 0] }       /* cronómetro */
        ];

        function set(p, prm) {
            var sat = P.ease(P.seg(p, 0, 0.25));
            var medir = P.seg(p, 0.25, 1.0);

            var q = prm.vol / prm.t;
            var i = prm.h / prm.l;
            var k = (q * prm.l) / (prm.a * prm.h);
            var v = q / prm.a;

            /* nivel de agua y flujo */
            tankWater.scale.y = 0.6 + sat * 0.4;
            waterTop.scale.y = Math.max(0.001, sat);
            waterTop.position.y = 0.7 + 0.25 * sat;
            waterBot.scale.y = Math.max(0.001, sat);

            var lleno = P.clamp(medir, 0, 1);
            gradSoil.scale.y = Math.max(0.001, lleno);
            gradSoil.position.y = 0.2 + 0.3 * lleno;

            /* aguja del cronómetro */
            needle.rotation.z = -medir * Math.PI * 4;

            var ph = p < 0.25 ? 0 : 1;
            return {
                hud: [
                    { k: 'Q', v: P.fmt(q, 4), u: 'cm³/s' },
                    { k: 'i', v: P.fmt(i, 3), u: '—' },
                    { k: 'v', v: P.fmt(v, 5), u: 'cm/s' },
                    { k: 'k', v: k.toExponential(2), u: 'cm/s' }
                ],
                phase: ph
            };
        }
        return { root: root, pins: pins, set: set };
    }

    var META_PERMEABILIDAD = {
        accent: ACC.permeabilidad, machine: 'Permeámetro de carga constante',
        machineSub: 'Celda con muestra saturada, depósito de nivel y probeta',
        norma: 'ASTM D2434 · INV E-130', duration: 14,
        phases: [
            { a: 0, b: 0.25, t: 'Saturar la muestra', d: 'Se llena la celda con agua eliminando el aire.' },
            { a: 0.25, b: 1.0, t: 'Medir el caudal y el tiempo', d: 'Se recoge el volumen filtrado y se aplica la ley de Darcy.' }
        ],
        parts: [
            { name: 'Celda del permeámetro', desc: 'Cilindro que contiene la muestra de suelo.' },
            { name: 'Muestra saturada', desc: 'Suelo permeable por el que fluye el agua.' },
            { name: 'Depósito de carga constante', desc: 'Mantiene una altura h de agua invariable.' },
            { name: 'Tubo de alimentación', desc: 'Conduce el agua hacia la muestra.' },
            { name: 'Probeta de recolección', desc: 'Mide el volumen filtrado en el tiempo.' },
            { name: 'Cronómetro', desc: 'Registra el tiempo del ensayo.' }
        ],
        cam: {
            target: [-0.2, 1.0, 0],
            home: { theta: 0.7, phi: 1.12, radius: 6.4 },
            frontal: { theta: 0.0, phi: 1.3, radius: 6.2 },
            lateral: { theta: 1.5, phi: 1.2, radius: 6.0 },
            detalle: { theta: 0.5, phi: 1.15, radius: 4.0 }
        }
    };
    function paramsPermeabilidad() {
        var d = datos('p');
        var o = { vol: 240, t: 180, a: 40, l: 12, h: 45, real: false };
        if (d && isFinite(d.k)) {
            var l = 12, a = 40, h = 45, i = h / l, v = d.k * i;
            o.vol = Math.round(v * a * 180);
            o.real = true;
        }
        o.nota = o.real
            ? 'Con tus resultados: k = ' + d.k.toExponential(3) + ' cm/s'
            : 'Valores típicos de ejemplo. Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    /* ================================================================== */
    /*  REGISTRO                                                          */
    /* ================================================================== */
    G3.register('humedad', META_HUMEDAD, buildHumedad, paramsHumedad);
    G3.register('granulometria', META_GRANULOMETRIA, buildGranulometria, paramsGranulometria);
    G3.register('limites', META_LIMITES, buildLimites, paramsLimites);
    G3.register('gravedad', META_GRAVEDAD, buildGravedad, paramsGravedad);
    G3.register('compactacion', META_COMPACTACION, buildCompactacion, paramsCompactacion);
    G3.register('densidad', META_DENSIDAD, buildDensidad, paramsDensidad);
    G3.register('clasificacion', META_CLASIFICACION, buildClasificacion, paramsClasificacion);
    G3.register('permeabilidad', META_PERMEABILIDAD, buildPermeabilidad, paramsPermeabilidad);

})(window);
