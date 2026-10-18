/**
 * GeoMetrics — Prensa UC 3D
 * Fondo paleta app · plano de falla · deformímetro visible
 */
(function (global) {
    'use strict';

    var state = {
        ready: false,
        renderer: null,
        scene: null,
        camera: null,
        root: null,
        muestra: null,
        muestraBody: null,
        platoMovil: null,
        piston: null,
        dialNeedle: null,
        dialGroup: null,
        failurePlane: null,
        crackLine: null,
        animId: null,
        container: null,
        dragging: false,
        prevX: 0,
        prevY: 0,
        theta: 0.65,
        phi: 1.12,
        radius: 5.8,
        muestraBaseY: 0,
        platoBaseY: 0,
        pistonBaseY: 0
    };

    function $(id) { return document.getElementById(id); }

    function loadScript(src) {
        return new Promise(function (res, rej) {
            var s = document.createElement('script');
            s.src = src;
            s.onload = res;
            s.onerror = rej;
            document.head.appendChild(s);
        });
    }

    async function ensureThree() {
        if (!global.THREE) {
            await loadScript('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js');
        }
    }

    function M(hex, metal, rough) {
        return new THREE.MeshStandardMaterial({
            color: hex,
            metalness: metal,
            roughness: rough
        });
    }

    function box(parent, w, h, d, x, y, z, mat) {
        var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        return m;
    }

    function cyl(parent, rT, rB, h, x, y, z, mat, seg) {
        var m = new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg || 32), mat);
        m.position.set(x, y, z);
        m.castShadow = true;
        m.receiveShadow = true;
        parent.add(m);
        return m;
    }

    function updateCamera() {
        var c = state.camera;
        if (!c) return;
        c.position.set(
            state.radius * Math.sin(state.phi) * Math.sin(state.theta),
            state.radius * Math.cos(state.phi) + 1.35,
            state.radius * Math.sin(state.phi) * Math.cos(state.theta)
        );
        c.lookAt(0, 1.45, 0);
    }

    function buildMachine(root) {
        var frame = M(0x7a828c, 0.55, 0.38);
        var frameDark = M(0x5c6570, 0.6, 0.35);
        var frameLight = M(0x9aa3ad, 0.5, 0.4);
        var chrome = M(0xd0d5dc, 0.92, 0.18);
        var chromeDark = M(0xa8b0ba, 0.88, 0.22);
        var blue = M(0x3B82F6, 0.4, 0.42);
        var blueDeep = M(0x2563EB, 0.45, 0.4);
        var plate = M(0xb8c0c8, 0.7, 0.28);
        var soil = M(0xd2b48c, 0.0, 0.55);
        var soilDark = M(0xc4a574, 0.0, 0.55);
        var black = M(0x2a2e33, 0.3, 0.55);
        var white = M(0xf1f5f9, 0.1, 0.7);
        var red = M(0xF87171, 0.2, 0.45);
        var green = M(0x22C55E, 0.15, 0.5);
        var yellow = M(0xFBBF24, 0.15, 0.5);
        var accent = M(0x2DD4BF, 0.3, 0.4);

        box(root, 2.55, 0.18, 1.65, 0, 0.09, 0, frameDark);
        box(root, 2.35, 0.1, 1.45, 0, 0.22, 0, frame);
        box(root, 2.45, 0.04, 1.55, 0, 0.28, 0, frameLight);
        [[-1.1, -0.68], [1.1, -0.68], [-1.1, 0.68], [1.1, 0.68]].forEach(function (p) {
            box(root, 0.2, 0.1, 0.2, p[0], 0.05, p[1], black);
        });

        [[-0.7, 0.46], [0.7, 0.46], [-0.7, -0.46], [0.7, -0.46]].forEach(function (p) {
            cyl(root, 0.06, 0.06, 2.7, p[0], 1.55, p[1], chrome, 20);
            cyl(root, 0.09, 0.09, 0.04, p[0], 0.32, p[1], chromeDark, 12);
            cyl(root, 0.09, 0.09, 0.04, p[0], 2.88, p[1], chromeDark, 12);
        });

        box(root, 1.9, 0.32, 1.2, 0, 3.0, 0, frame);
        box(root, 1.75, 0.1, 1.05, 0, 3.2, 0, frameLight);
        box(root, 0.55, 0.14, 0.03, 0, 3.0, 0.62, white);

        cyl(root, 0.3, 0.3, 0.5, 0, 3.52, 0, blue, 28);
        cyl(root, 0.22, 0.22, 0.12, 0, 3.82, 0, blueDeep, 20);
        cyl(root, 0.12, 0.12, 0.15, 0, 3.95, 0, chromeDark, 12);
        var hose = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.028, 8, 20, Math.PI * 0.85), M(0x64748b, 0.2, 0.65));
        hose.position.set(0.38, 3.5, 0.2);
        hose.rotation.set(0.3, 0.8, 0.2);
        root.add(hose);

        cyl(root, 0.52, 0.52, 0.09, 0, 2.82, 0, plate, 40);
        cyl(root, 0.1, 0.1, 0.2, 0, 2.72, 0, chromeDark, 16);

        var piston = cyl(root, 0.065, 0.065, 1.15, 0, 2.15, 0, chrome, 16);
        state.piston = piston;
        state.pistonBaseY = 2.15;

        var plato = cyl(root, 0.62, 0.62, 0.08, 0, 0.52, 0, plate, 40);
        state.platoMovil = plato;
        state.platoBaseY = 0.52;
        cyl(root, 0.4, 0.4, 0.1, 0, 0.62, 0, chrome, 28);
        cyl(root, 0.28, 0.28, 0.06, 0, 0.7, 0, chromeDark, 20);

        // —— Muestra ——
        var grpSoil = new THREE.Group();
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 1.2, 48), soil);
        body.castShadow = true;
        body.receiveShadow = true;
        grpSoil.add(body);
        /* cilindro liso sin rugosidad/bandas */
        var capMat = M(0xd4c4a8, 0.05, 0.85);
        var capT = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 48), capMat);
        capT.position.y = 0.62;
        grpSoil.add(capT);
        var capB = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.03, 48), capMat);
        capB.position.y = -0.62;
        grpSoil.add(capB);

        // Plano de falla (oculto hasta el final) — disco inclinado rojo/teal
        var failMat = new THREE.MeshStandardMaterial({
            color: 0xF87171,
            metalness: 0.1,
            roughness: 0.5,
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide
        });
        var failPlane = new THREE.Mesh(new THREE.CircleGeometry(0.38, 32), failMat);
        failPlane.rotation.x = Math.PI / 2;
        failPlane.rotation.z = 0;
        failPlane.visible = false;
        grpSoil.add(failPlane);
        state.failurePlane = failPlane;

        // Línea de grieta auxiliar
        var crack = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 1.05, 0.7),
            new THREE.MeshBasicMaterial({ color: 0xF87171, transparent: true, opacity: 0.9 })
        );
        crack.position.set(0.02, 0, 0);
        crack.visible = false;
        grpSoil.add(crack);
        state.crackLine = crack;

        grpSoil.position.y = 1.35;
        root.add(grpSoil);
        state.muestra = grpSoil;
        state.muestraBaseY = 1.35;
        state.muestraBody = body;

        // —— Panel control ——
        var panel = new THREE.Group();
        panel.position.set(1.48, 0.9, 0.1);
        root.add(panel);
        box(panel, 0.58, 1.15, 0.72, 0, 0, 0, blue);
        box(panel, 0.52, 0.38, 0.68, 0, 0.28, 0.02, black);
        box(panel, 0.2, 0.09, 0.02, -0.12, 0.35, 0.37, green);
        box(panel, 0.2, 0.09, 0.02, 0.12, 0.35, 0.37, green);
        cyl(panel, 0.045, 0.045, 0.04, -0.14, -0.12, 0.37, green, 12);
        cyl(panel, 0.045, 0.045, 0.04, 0.0, -0.12, 0.37, yellow, 12);
        cyl(panel, 0.05, 0.05, 0.05, 0.14, -0.12, 0.37, red, 12);
        cyl(panel, 0.09, 0.09, 0.07, 0, -0.38, 0.38, red, 16);

        // —— Deformímetro (más grande y legible) ——
        var dial = new THREE.Group();
        dial.position.set(1.15, 1.9, 0.85);
        root.add(dial);
        state.dialGroup = dial;

        // carcasa
        cyl(dial, 0.28, 0.28, 0.1, 0, 0, 0, chrome, 36);
        cyl(dial, 0.26, 0.26, 0.04, 0, 0, 0.06, M(0x1E293B, 0.2, 0.5), 32);
        // cara blanca
        var face = new THREE.Mesh(new THREE.CircleGeometry(0.24, 48), white);
        face.position.z = 0.085;
        dial.add(face);
        // anillo teal
        var ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.24, 0.012, 8, 48),
            accent
        );
        ring.position.z = 0.09;
        dial.add(ring);
        // marcas numeradas (ticks)
        for (var k = 0; k < 20; k++) {
            var ang = (k / 20) * Math.PI * 2 - Math.PI / 2;
            var long = (k % 5 === 0);
            var tick = new THREE.Mesh(
                new THREE.BoxGeometry(long ? 0.018 : 0.01, long ? 0.045 : 0.025, 0.008),
                black
            );
            var rr = long ? 0.195 : 0.205;
            tick.position.set(Math.cos(ang) * rr, Math.sin(ang) * rr, 0.1);
            tick.rotation.z = ang + Math.PI / 2;
            dial.add(tick);
        }
        // centro
        cyl(dial, 0.025, 0.025, 0.03, 0, 0, 0.1, black, 12);
        // aguja grande
        var needle = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, 0.2, 0.012),
            M(0xF87171, 0.3, 0.35)
        );
        needle.position.set(0, 0.08, 0.11);
        dial.add(needle);
        state.dialNeedle = needle;
        // brazo / soporte más grueso
        cyl(root, 0.035, 0.035, 1.0, 1.15, 1.2, 0.85, chrome, 10);
        box(root, 0.12, 0.06, 0.12, 1.15, 0.72, 0.85, frameDark);
        // etiqueta "δ"
        var label = new THREE.Mesh(
            new THREE.CircleGeometry(0.06, 16),
            accent
        );
        label.position.set(1.15, 2.25, 0.95);
        root.add(label);
    }

    function setup(container) {
        var w = Math.max(320, container.clientWidth || 480);
        var h = Math.max(320, container.clientHeight || 400);
        state.container = container;

        var scene = new THREE.Scene();
        // Fondo paleta GeoMetrics sistema
        scene.background = new THREE.Color(0x0B1220);
        state.scene = scene;

        var camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
        state.camera = camera;
        updateCamera();

        var renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
        renderer.shadowMap.enabled = true;
        if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        state.renderer = renderer;

        scene.add(new THREE.AmbientLight(0xb0c4de, 0.5));
        var key = new THREE.DirectionalLight(0xffffff, 1.1);
        key.position.set(3.5, 7, 4);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        scene.add(key);
        var fill = new THREE.DirectionalLight(0x3B82F6, 0.35);
        fill.position.set(-3, 2.5, -2);
        scene.add(fill);
        scene.add(new THREE.HemisphereLight(0xA7B4C8, 0x0B1220, 0.4));
        var rim = new THREE.DirectionalLight(0x2DD4BF, 0.2);
        rim.position.set(0, 3, -5);
        scene.add(rim);

        // piso acorde a paleta
        var floor = new THREE.Mesh(
            new THREE.CircleGeometry(4.5, 64),
            new THREE.MeshStandardMaterial({ color: 0x151F32, roughnessness: 0.9, metalness: 0.1 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        // grid sutil
        var grid = new THREE.GridHelper(8, 16, 0x2B3A50, 0x1E293B);
        grid.position.y = 0.01;
        scene.add(grid);

        var root = new THREE.Group();
        scene.add(root);
        state.root = root;
        buildMachine(root);

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
            state.theta -= (e.clientX - state.prevX) * 0.006;
            state.phi = Math.max(0.4, Math.min(1.35, state.phi + (e.clientY - state.prevY) * 0.006));
            state.prevX = e.clientX;
            state.prevY = e.clientY;
            updateCamera();
        });
        function endD() { state.dragging = false; dom.style.cursor = 'grab'; }
        dom.addEventListener('pointerup', endD);
        dom.addEventListener('pointerleave', endD);
        dom.addEventListener('wheel', function (e) {
            e.preventDefault();
            state.radius = Math.max(3.8, Math.min(9.5, state.radius + e.deltaY * 0.01));
            updateCamera();
        }, { passive: false });

        state.ready = true;
        startLoop();
        update(0, 0, {});
    }

    function startLoop() {
        if (state.animId) cancelAnimationFrame(state.animId);
        (function loop() {
            state.animId = requestAnimationFrame(loop);
            if (state.renderer) state.renderer.render(state.scene, state.camera);
        })();
    }

    /**
     * Ángulo de falla orientativo (Mohr-Coulomb, φ≈0 en UC):
     * en inconfinada el plano típico se inclina ~45° + φ/2; con φ≈0 → ~45°–60°
     * Usamos qu y geometría para inclinar el disco de falla.
     */
    function showFailurePlane(eps, sig, dims) {
        if (!state.failurePlane) return;
        var qu = 120;
        try {
            qu = parseFloat((document.getElementById('sim-uc-qu') || {}).value) || sig || 120;
        } catch (e) {}
        // inclinación: suelos más resistentes → plano un poco más inclinado (visual)
        var deg = 45 + Math.min(20, (qu / 400) * 20);
        var rad = (deg * Math.PI) / 180;
        state.failurePlane.visible = true;
        state.failurePlane.rotation.x = Math.PI / 2 - rad * 0.35;
        state.failurePlane.rotation.y = 0.35;
        state.failurePlane.rotation.z = rad * 0.5;
        if (state.crackLine) {
            state.crackLine.visible = true;
            state.crackLine.rotation.z = rad * 0.4;
            state.crackLine.rotation.x = 0.15;
        }
    }

    function hideFailure() {
        if (state.failurePlane) state.failurePlane.visible = false;
        if (state.crackLine) state.crackLine.visible = false;
    }

    function update(eps, sig, dims) {
        if (!state.ready || !state.muestra) return;
        eps = Math.max(0, Number(eps) || 0);
        sig = Number(sig) || 0;
        dims = dims || {};
        var dmm = dims.d_mm || 38;
        var L0 = dims.L0_mm || 76;
        var scaleR = Math.max(0.8, Math.min(1.3, dmm / 38));
        var scaleH = Math.max(0.8, Math.min(1.3, L0 / 76));
        var compress = Math.min(0.3, (eps / 20) * 0.3);
        var bulge = 1 + compress * 0.4;
        var lift = compress * 0.5;

        state.muestra.scale.set(scaleR * bulge, scaleH * (1 - compress), scaleR * bulge);
        if (state.platoMovil) state.platoMovil.position.y = state.platoBaseY + lift;
        state.muestra.position.y = state.muestraBaseY + lift - compress * 0.35 * scaleH;
        if (state.piston) state.piston.position.y = state.pistonBaseY - lift * 0.25;

        // Deformímetro: aguja proporcional a ε (0–20% → casi una vuelta)
        if (state.dialNeedle) {
            state.dialNeedle.rotation.z = -(eps / 20) * Math.PI * 1.6;
        }

        if (state.muestraBody && state.muestraBody.material) {
            var t = Math.min(1, sig / 180);
            state.muestraBody.material.color.setRGB(0.77 - t * 0.08, 0.65 - t * 0.12, 0.45 - t * 0.1);
        }

        // Al final del ensayo: plano de falla
        if (eps >= 18) {
            showFailurePlane(eps, sig, dims);
        } else if (eps < 5) {
            hideFailure();
        }
    }

    function resize() {
        if (!state.container || !state.renderer || !state.camera) return;
        var w = state.container.clientWidth;
        var h = state.container.clientHeight;
        state.camera.aspect = w / h;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(w, h);
    }

    function mount(containerId) {
        var el = typeof containerId === 'string' ? $(containerId) : containerId;
        if (!el) return;
        ensureThree()
            .then(function () {
                if (state.ready && state.container === el) {
                    resize();
                    hideFailure();
                    update(0, 0, {});
                    return;
                }
                setup(el);
            })
            .catch(function (e) { console.warn('3D prensa', e); });
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
