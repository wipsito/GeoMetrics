/**
 * GeoMetrics — Prototipo 3D Prensa de Compresión Inconfinada (Suelos II)
 * Three.js + geometrías básicas (sin GLB)
 */
(function (global) {
    'use strict';

    var state = {
        ready: false,
        renderer: null,
        scene: null,
        camera: null,
        root: null,
        platoSup: null,
        cilindro: null,
        crack: null,
        labelSprite: null,
        animId: null,
        container: null,
        width: 460,
        height: 360,
        baseCylH: 1.6,
        baseCylR: 0.38,
        dragging: false,
        prevX: 0,
        prevY: 0,
        theta: 0.45,
        phi: 1.05,
        radius: 5.2
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

    function makeMetal(color) {
        return new THREE.MeshStandardMaterial({
            color: color,
            metalness: 0.65,
            roughness: 0.35
        });
    }

    function makeSoil() {
        return new THREE.MeshStandardMaterial({
            color: 0x9a7b4f,
            metalness: 0.05,
            roughness: 0.9
        });
    }

    function buildScene(container) {
        state.container = container;
        var w = container.clientWidth || state.width;
        var h = container.clientHeight || state.height;
        state.width = w;
        state.height = h;

        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0B1220);
        state.scene = scene;

        var camera = new THREE.PerspectiveCamera(42, w / h, 0.1, 100);
        state.camera = camera;
        updateCamera();

        var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
        renderer.shadowMap.enabled = true;
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        state.renderer = renderer;

        // Luces
        var amb = new THREE.AmbientLight(0x88aacc, 0.55);
        scene.add(amb);
        var dir = new THREE.DirectionalLight(0xffffff, 1.05);
        dir.position.set(3, 6, 4);
        dir.castShadow = true;
        scene.add(dir);
        var fill = new THREE.DirectionalLight(0x2DD4BF, 0.25);
        fill.position.set(-3, 2, -2);
        scene.add(fill);

        // Grid suelo
        var grid = new THREE.GridHelper(8, 16, 0x2B3A50, 0x1E293B);
        grid.position.y = -0.02;
        scene.add(grid);

        var root = new THREE.Group();
        scene.add(root);
        state.root = root;

        // Base / mesa
        var base = new THREE.Mesh(
            new THREE.BoxGeometry(2.4, 0.18, 1.6),
            makeMetal(0x334155)
        );
        base.position.y = 0.09;
        base.receiveShadow = true;
        root.add(base);

        // Columnas
        var colMat = makeMetal(0x64748b);
        [[-0.85, 0.55], [0.85, 0.55], [-0.85, -0.55], [0.85, -0.55]].forEach(function (p) {
            var col = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 3.2, 12), colMat);
            col.position.set(p[0], 1.7, p[1]);
            col.castShadow = true;
            root.add(col);
        });

        // Travesaño superior
        var cross = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 1.2), makeMetal(0x475569));
        cross.position.y = 3.25;
        root.add(cross);

        // Plato inferior
        var platoInf = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.08, 32),
            makeMetal(0x94a3b8)
        );
        platoInf.position.y = 0.22;
        platoInf.receiveShadow = true;
        root.add(platoInf);

        // Cilindro de suelo
        var cylH = state.baseCylH;
        var cylR = state.baseCylR;
        var cilindro = new THREE.Mesh(
            new THREE.CylinderGeometry(cylR, cylR, cylH, 32),
            makeSoil()
        );
        cilindro.position.y = 0.26 + cylH / 2;
        cilindro.castShadow = true;
        cilindro.receiveShadow = true;
        root.add(cilindro);
        state.cilindro = cilindro;
        state.cylBaseY = cilindro.position.y;
        state.cylBaseH = cylH;

        // Plato superior (móvil)
        var platoSup = new THREE.Mesh(
            new THREE.CylinderGeometry(0.55, 0.55, 0.1, 32),
            makeMetal(0xcbd5e1)
        );
        platoSup.position.y = 0.26 + cylH + 0.08;
        platoSup.castShadow = true;
        root.add(platoSup);
        state.platoSup = platoSup;
        state.platoBaseY = platoSup.position.y;

        // Vástago del pistón
        var piston = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 1.2, 12),
            makeMetal(0x64748b)
        );
        piston.position.y = platoSup.position.y + 0.65;
        root.add(piston);
        state.piston = piston;
        state.pistonBaseY = piston.position.y;

        // Grieta (oculta al inicio)
        var crack = new THREE.Mesh(
            new THREE.BoxGeometry(0.02, cylH * 0.55, cylR * 1.6),
            new THREE.MeshBasicMaterial({ color: 0xF87171 })
        );
        crack.position.set(0.05, state.cylBaseY, 0);
        crack.visible = false;
        root.add(crack);
        state.crack = crack;

        // Controles de cámara
        var dom = renderer.domElement;
        dom.style.touchAction = 'none';
        dom.addEventListener('pointerdown', function (e) {
            state.dragging = true;
            state.prevX = e.clientX;
            state.prevY = e.clientY;
            try { dom.setPointerCapture(e.pointerId); } catch (err) {}
        });
        dom.addEventListener('pointermove', function (e) {
            if (!state.dragging) return;
            var dx = e.clientX - state.prevX;
            var dy = e.clientY - state.prevY;
            state.prevX = e.clientX;
            state.prevY = e.clientY;
            state.theta -= dx * 0.008;
            state.phi = Math.max(0.25, Math.min(1.45, state.phi + dy * 0.008));
            updateCamera();
            renderOnce();
        });
        dom.addEventListener('pointerup', function () { state.dragging = false; });
        dom.addEventListener('pointerleave', function () { state.dragging = false; });
        dom.addEventListener('wheel', function (e) {
            e.preventDefault();
            state.radius = Math.max(3.2, Math.min(9, state.radius + e.deltaY * 0.01));
            updateCamera();
            renderOnce();
        }, { passive: false });

        state.ready = true;
        renderOnce();
        startLoop();
    }

    function updateCamera() {
        var cam = state.camera;
        if (!cam) return;
        cam.position.x = state.radius * Math.sin(state.phi) * Math.sin(state.theta);
        cam.position.y = state.radius * Math.cos(state.phi) + 1.2;
        cam.position.z = state.radius * Math.sin(state.phi) * Math.cos(state.theta);
        cam.lookAt(0, 1.2, 0);
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
     * eps: deformación axial en % (0–20)
     * sig: esfuerzo en kPa
     * dims: { d_mm, L0_mm }
     */
    function update(eps, sig, dims) {
        if (!state.ready || !state.cilindro) return;
        eps = Math.max(0, Number(eps) || 0);
        sig = Number(sig) || 0;
        dims = dims || {};

        var dmm = dims.d_mm || 38;
        var L0 = dims.L0_mm || 76;
        var scaleR = Math.max(0.7, Math.min(1.4, dmm / 38));
        var scaleH = Math.max(0.7, Math.min(1.4, L0 / 76));

        var compress = Math.min(0.22, (eps / 20) * 0.22); // hasta 22% de altura visual
        var h = state.baseCylH * scaleH * (1 - compress);
        var bulge = 1 + compress * 0.45; // barrilado leve

        state.cilindro.scale.set(scaleR * bulge, h / state.baseCylH, scaleR * bulge);
        state.cilindro.position.y = 0.26 + (state.baseCylH * scaleH * (1 - compress)) / 2;

        var topY = 0.26 + h + 0.08;
        state.platoSup.position.y = topY;
        if (state.piston) state.piston.position.y = topY + 0.65;

        // falla visual
        if (state.crack) {
            state.crack.visible = eps >= 16;
            state.crack.position.y = state.cilindro.position.y;
            state.crack.scale.y = (h / state.baseCylH);
        }

        // color del suelo según carga
        if (state.cilindro.material) {
            var t = Math.min(1, sig / 250);
            var r = 0.60 + t * 0.15;
            var g = 0.48 - t * 0.12;
            var b = 0.31 - t * 0.08;
            state.cilindro.material.color.setRGB(r, g, b);
        }
    }

    function resize() {
        if (!state.container || !state.renderer || !state.camera) return;
        var w = state.container.clientWidth || state.width;
        var h = state.container.clientHeight || state.height;
        state.camera.aspect = w / h;
        state.camera.updateProjectionMatrix();
        state.renderer.setSize(w, h);
        renderOnce();
    }

    function mount(containerId) {
        var el = typeof containerId === 'string' ? $(containerId) : containerId;
        if (!el) {
            console.warn('sim3d: contenedor no encontrado');
            return;
        }
        ensureThree(function () {
            try {
                buildScene(el);
                update(0, 0, {
                    d_mm: parseFloat(($('sim-uc-d') || {}).value) || 38,
                    L0_mm: parseFloat(($('sim-uc-l0') || {}).value) || 76
                });
            } catch (e) {
                console.warn('sim3d mount error', e);
            }
        });
    }

    function dispose() {
        if (state.animId) cancelAnimationFrame(state.animId);
        state.animId = null;
        if (state.renderer) {
            try { state.renderer.dispose(); } catch (e) {}
        }
        state.ready = false;
    }

    global.GeoSim3DPrensa = {
        mount: mount,
        update: update,
        resize: resize,
        dispose: dispose,
        isReady: function () { return state.ready; }
    };
})(window);
