/**
 * GeoMetrics — Prensa de Compresión Inconfinada 3D
 * Aspecto tipo máquina de laboratorio (bastidor, pistón, panel, reloj)
 */
(function (global) {
    'use strict';

    var state = {
        ready: false,
        renderer: null,
        scene: null,
        camera: null,
        root: null,
        platoMovil: null,
        cilindro: null,
        crack: null,
        pistonRod: null,
        dialNeedle: null,
        displayMat: null,
        animId: null,
        container: null,
        width: 480,
        height: 400,
        baseCylH: 1.15,
        baseCylR: 0.32,
        dragging: false,
        prevX: 0,
        prevY: 0,
        theta: 0.55,
        phi: 1.05,
        radius: 6.2
    };

    function $(id) { return document.getElementById(id); }

    function ensureThree(cb) {
        if (global.THREE) { cb(); return; }
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js';
        s.onload = function () { cb(); };
        s.onerror = function () { console.warn('Three.js no cargó'); };
        document.head.appendChild(s);
    }

    function mat(color, metal, rough) {
        return new THREE.MeshStandardMaterial({
            color: color,
            metalness: metal != null ? metal : 0.55,
            roughness: rough != null ? rough : 0.4
        });
    }

    function addBox(parent, w, h, d, x, y, z, material) {
        var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        return m;
    }

    function addCyl(parent, rTop, rBot, h, x, y, z, material, seg) {
        var m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg || 24), material);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        return m;
    }

    function buildScene(container) {
        state.container = container;
        var w = Math.max(320, container.clientWidth || state.width);
        var h = Math.max(300, container.clientHeight || state.height);
        state.width = w;
        state.height = h;

        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf0f2f5);
        state.scene = scene;

        var camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 100);
        state.camera = camera;
        updateCamera();

        var renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        state.renderer = renderer;

        // Luces tipo estudio
        scene.add(new THREE.AmbientLight(0xffffff, 0.62));
        var key = new THREE.DirectionalLight(0xffffff, 0.95);
        key.position.set(4, 8, 5);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        scene.add(key);
        var fill = new THREE.DirectionalLight(0xb0c4de, 0.35);
        fill.position.set(-4, 3, -2);
        scene.add(fill);
        var hemi = new THREE.HemisphereLight(0xddeeff, 0x888888, 0.35);
        scene.add(hemi);

        // Suelo
        var floor = new THREE.Mesh(
            new THREE.CircleGeometry(5, 48),
            new THREE.MeshStandardMaterial({ color: 0xe8eaed, roughnessness: 0.95, metalness: 0 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        var root = new THREE.Group();
        scene.add(root);
        state.root = root;

        var gray = mat(0x6b7280, 0.5, 0.45);
        var grayDark = mat(0x4b5563, 0.55, 0.4);
        var grayLight = mat(0x9ca3af, 0.45, 0.4);
        var chrome = mat(0xc0c8d0, 0.85, 0.22);
        var blue = mat(0x3b6ea5, 0.35, 0.45);
        var blueDark = mat(0x2c5282, 0.4, 0.4);
        var black = mat(0x1f2937, 0.3, 0.6);
        var soil = mat(0xb8956a, 0.05, 0.92);

        // —— Bancada / base ——
        addBox(root, 2.6, 0.22, 1.7, 0, 0.11, 0, grayDark);
        addBox(root, 2.4, 0.08, 1.5, 0, 0.26, 0, gray);

        // Pies
        [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]].forEach(function (p) {
            addBox(root, 0.22, 0.12, 0.22, p[0], 0.06, p[1], black);
        });

        // —— Columnas cromadas (4) ——
        [[-0.72, 0.48], [0.72, 0.48], [-0.72, -0.48], [0.72, -0.48]].forEach(function (p) {
            addCyl(root, 0.055, 0.055, 2.85, p[0], 1.55, p[1], chrome, 16);
        });

        // —— Travesaño / cabezal superior gris ——
        addBox(root, 1.85, 0.28, 1.15, 0, 3.05, 0, gray);
        addBox(root, 1.7, 0.12, 1.0, 0, 3.22, 0, grayLight);

        // Motor / cilindro hidráulico superior (azul)
        addCyl(root, 0.28, 0.28, 0.55, 0, 3.55, 0, blue, 24);
        addCyl(root, 0.18, 0.18, 0.2, 0, 3.9, 0, blueDark, 16);
        // mangueras simples
        var hose = new THREE.Mesh(
            new THREE.TorusGeometry(0.35, 0.025, 8, 24, Math.PI * 0.7),
            mat(0x334155, 0.2, 0.7)
        );
        hose.position.set(0.35, 3.55, 0.35);
        hose.rotation.y = 0.5;
        root.add(hose);

        // Placa superior FIJA (bajo el cabezal)
        var placaFija = addCyl(root, 0.5, 0.5, 0.1, 0, 2.88, 0, grayLight, 32);
        state.placaFija = placaFija;

        // —— Pistón / vástago (baja con la carga) ——
        var pistonRod = addCyl(root, 0.07, 0.07, 1.1, 0, 2.25, 0, chrome, 12);
        state.pistonRod = pistonRod;
        state.pistonRodBaseY = 2.25;

        // Placa inferior MÓVIL (sube el cilindro / aplica carga)
        // En muchas prensas UC la carga viene de abajo; aquí el plato inferior sube.
        var platoMovil = addCyl(root, 0.58, 0.58, 0.1, 0, 0.55, 0, grayLight, 32);
        state.platoMovil = platoMovil;
        state.platoBaseY = 0.55;

        // Célula de carga (entre plato y muestra, anillo)
        addCyl(root, 0.42, 0.42, 0.12, 0, 0.66, 0, chrome, 24);

        // —— Muestra cilíndrica de suelo ——
        var cylH = state.baseCylH;
        var cylR = state.baseCylR;
        var cilindro = new THREE.Mesh(
            new THREE.CylinderGeometry(cylR, cylR * 0.98, cylH, 32),
            soil
        );
        cilindro.position.y = 0.72 + cylH / 2;
        cilindro.castShadow = true;
        cilindro.receiveShadow = true;
        root.add(cilindro);
        state.cilindro = cilindro;
        state.cylBaseY = cilindro.position.y;

        // Capas/textura simple en el cilindro (anillos)
        for (var i = 0; i < 4; i++) {
            var ring = new THREE.Mesh(
                new THREE.TorusGeometry(cylR * 1.01, 0.012, 6, 24),
                mat(0x9a7b52, 0.05, 0.95)
            );
            ring.rotation.x = Math.PI / 2;
            ring.position.y = 0.72 + cylH * (0.2 + i * 0.2);
            root.add(ring);
        }

        // Grieta de falla
        var crack = new THREE.Mesh(
            new THREE.BoxGeometry(0.025, cylH * 0.5, cylR * 1.7),
            new THREE.MeshBasicMaterial({ color: 0x7f1d1d })
        );
        crack.position.set(0.06, state.cylBaseY, 0);
        crack.visible = false;
        root.add(crack);
        state.crack = crack;

        // —— Panel de control (azul, a la derecha) ——
        var panel = new THREE.Group();
        panel.position.set(1.55, 0.95, 0.15);
        root.add(panel);
        addBox(panel, 0.55, 1.1, 0.7, 0, 0, 0, blue);
        addBox(panel, 0.5, 0.35, 0.65, 0, 0.28, 0.02, black);
        // displays
        addBox(panel, 0.18, 0.08, 0.02, -0.12, 0.32, 0.36, mat(0x22c55e, 0.1, 0.3));
        addBox(panel, 0.18, 0.08, 0.02, 0.12, 0.32, 0.36, mat(0x22c55e, 0.1, 0.3));
        // botones
        addCyl(panel, 0.05, 0.05, 0.04, -0.12, -0.15, 0.36, mat(0x22c55e, 0.2, 0.4), 12);
        addCyl(panel, 0.05, 0.05, 0.04, 0.05, -0.15, 0.36, mat(0xfbbf24, 0.2, 0.4), 12);
        addCyl(panel, 0.06, 0.06, 0.05, 0.18, -0.15, 0.36, mat(0xef4444, 0.2, 0.4), 12);
        // parada emergencia
        addCyl(panel, 0.08, 0.08, 0.06, 0, -0.38, 0.36, mat(0xdc2626, 0.15, 0.5), 16);

        // —— Reloj comparador de deformación ——
        var dialG = new THREE.Group();
        dialG.position.set(1.15, 1.85, 0.75);
        root.add(dialG);
        addCyl(dialG, 0.22, 0.22, 0.08, 0, 0, 0, chrome, 24);
        addCyl(dialG, 0.18, 0.18, 0.02, 0, 0, 0.05, mat(0xf8fafc, 0.1, 0.8), 24);
        // aguja
        var needle = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.14, 0.01),
            mat(0x1e293b, 0.2, 0.5)
        );
        needle.position.set(0, 0.05, 0.06);
        dialG.add(needle);
        state.dialNeedle = needle;
        // soporte
        addCyl(root, 0.03, 0.03, 0.9, 1.15, 1.2, 0.75, chrome, 8);

        // Etiqueta frontal pequeña
        addBox(root, 0.5, 0.12, 0.02, 0, 3.05, 0.58, mat(0xe2e8f0, 0.1, 0.6));

        // Controles cámara
        var dom = renderer.domElement;
        dom.style.touchAction = 'none';
        dom.style.cursor = 'grab';
        dom.addEventListener('pointerdown', function (e) {
            state.dragging = true;
            state.prevX = e.clientX;
            state.prevY = e.clientY;
            dom.style.cursor = 'grabbing';
            try { dom.setPointerCapture(e.pointerId); } catch (err) {}
        });
        dom.addEventListener('pointermove', function (e) {
            if (!state.dragging) return;
            var dx = e.clientX - state.prevX;
            var dy = e.clientY - state.prevY;
            state.prevX = e.clientX;
            state.prevY = e.clientY;
            state.theta -= dx * 0.007;
            state.phi = Math.max(0.35, Math.min(1.4, state.phi + dy * 0.007));
            updateCamera();
        });
        function endDrag() {
            state.dragging = false;
            dom.style.cursor = 'grab';
        }
        dom.addEventListener('pointerup', endDrag);
        dom.addEventListener('pointerleave', endDrag);
        dom.addEventListener('wheel', function (e) {
            e.preventDefault();
            state.radius = Math.max(4, Math.min(10, state.radius + e.deltaY * 0.01));
            updateCamera();
        }, { passive: false });

        state.ready = true;
        startLoop();
    }

    function updateCamera() {
        var cam = state.camera;
        if (!cam) return;
        cam.position.x = state.radius * Math.sin(state.phi) * Math.sin(state.theta);
        cam.position.y = state.radius * Math.cos(state.phi) + 1.4;
        cam.position.z = state.radius * Math.sin(state.phi) * Math.cos(state.theta);
        cam.lookAt(0, 1.5, 0);
    }

    function renderOnce() {
        if (state.renderer && state.scene && state.camera) {
            state.renderer.render(state.scene, state.camera);
        }
    }

    function startLoop() {
        if (state.animId) cancelAnimationFrame(state.animId);
        function loop() {
            state.animId = requestAnimationFrame(loop);
            renderOnce();
        }
        loop();
    }

    /**
     * eps % · sig kPa · dims { d_mm, L0_mm }
     * Animación: plato móvil sube, muestra se comprime, aguja del reloj gira
     */
    function update(eps, sig, dims) {
        if (!state.ready || !state.cilindro) return;
        eps = Math.max(0, Number(eps) || 0);
        sig = Number(sig) || 0;
        dims = dims || {};

        var dmm = dims.d_mm || 38;
        var L0 = dims.L0_mm || 76;
        var scaleR = Math.max(0.75, Math.min(1.35, dmm / 38));
        var scaleH = Math.max(0.75, Math.min(1.35, L0 / 76));

        var compress = Math.min(0.28, (eps / 20) * 0.28);
        var hFactor = (1 - compress) * scaleH;
        var bulge = 1 + compress * 0.5;

        var h = state.baseCylH * hFactor;
        state.cilindro.scale.set(scaleR * bulge, h / state.baseCylH, scaleR * bulge);

        // Plato móvil sube según carga
        var lift = compress * 0.55;
        if (state.platoMovil) {
            state.platoMovil.position.y = state.platoBaseY + lift;
        }
        // Cilindro apoyado sobre plato
        var baseY = (state.platoMovil ? state.platoMovil.position.y : 0.55) + 0.17;
        state.cilindro.position.y = baseY + h / 2;

        // Pistón acompaña (ligero descenso visual desde arriba)
        if (state.pistonRod) {
            state.pistonRod.position.y = state.pistonRodBaseY - lift * 0.35;
        }

        if (state.crack) {
            state.crack.visible = eps >= 15;
            state.crack.position.y = state.cilindro.position.y;
            state.crack.scale.set(1, h / state.baseCylH, bulge);
        }

        // Aguja del reloj comparador
        if (state.dialNeedle) {
            state.dialNeedle.rotation.z = -eps * 0.12;
        }

        // Color suelo con la carga
        if (state.cilindro.material) {
            var t = Math.min(1, sig / 200);
            state.cilindro.material.color.setRGB(
                0.72 - t * 0.1,
                0.58 - t * 0.18,
                0.42 - t * 0.12
            );
        }
    }

    function resize() {
        if (!state.container || !state.renderer || !state.camera) return;
        var w = state.container.clientWidth || state.width;
        var h = state.container.clientHeight || state.height;
        state.camera.aspect = w / h;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(w, h);
    }

    function mount(containerId) {
        var el = typeof containerId === 'string' ? $(containerId) : containerId;
        if (!el) return;
        ensureThree(function () {
            try {
                if (state.ready && state.container === el) {
                    resize();
                    update(0, 0, {});
                    return;
                }
                buildScene(el);
                update(0, 0, {
                    d_mm: parseFloat(($('sim-uc-d') || {}).value) || 38,
                    L0_mm: parseFloat(($('sim-uc-l0') || {}).value) || 76
                });
            } catch (e) {
                console.warn('sim3d mount', e);
            }
        });
    }

    function dispose() {
        if (state.animId) cancelAnimationFrame(state.animId);
        state.animId = null;
        state.ready = false;
    }

    global.GeoSim3DPrensa = {
        mount: mount,
        update: update,
        resize: resize,
        dispose: dispose,
        isReady: function () { return !!state.ready; }
    };
})(window);
