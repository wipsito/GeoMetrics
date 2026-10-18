/**
 * GeoMetrics — Prensa UC 3D (aspecto laboratorio real)
 * Geometría detallada + materiales metal/cromo/azul panel
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
        platoMovil: null,
        piston: null,
        placaSup: null,
        dialNeedle: null,
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
        pistonBaseY: 0,
        placaSupBaseY: 0
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

    function box(parent, w, h, d, x, y, z, mat, shadow) {
        var m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.position.set(x, y, z);
        if (shadow !== false) { m.castShadow = true; m.receiveShadow = true; }
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
        // Materiales cercanos a la foto
        var frame = M(0x7a828c, 0.55, 0.38);       // gris máquina
        var frameDark = M(0x5c6570, 0.6, 0.35);
        var frameLight = M(0x9aa3ad, 0.5, 0.4);
        var chrome = M(0xd0d5dc, 0.92, 0.18);      // columnas brillantes
        var chromeDark = M(0xa8b0ba, 0.88, 0.22);
        var blue = M(0x3d6fa8, 0.4, 0.42);         // panel / hidráulico
        var blueDeep = M(0x2a5580, 0.45, 0.4);
        var plate = M(0xb8c0c8, 0.7, 0.28);
        var soil = M(0xc4a574, 0.02, 0.88);        // muestra beige
        var soilDark = M(0xa8895e, 0.02, 0.9);
        var black = M(0x2a2e33, 0.3, 0.55);
        var white = M(0xf1f5f9, 0.1, 0.7);
        var red = M(0xe11d48, 0.2, 0.45);
        var green = M(0x22c55e, 0.15, 0.5);
        var yellow = M(0xfbbf24, 0.15, 0.5);

        // —— Base / bancada ——
        box(root, 2.55, 0.18, 1.65, 0, 0.09, 0, frameDark);
        box(root, 2.35, 0.1, 1.45, 0, 0.22, 0, frame);
        // chaflán visual
        box(root, 2.45, 0.04, 1.55, 0, 0.28, 0, frameLight);
        // patas
        [[-1.1, -0.68], [1.1, -0.68], [-1.1, 0.68], [1.1, 0.68]].forEach(function (p) {
            box(root, 0.2, 0.1, 0.2, p[0], 0.05, p[1], black);
        });

        // —— 4 columnas cromadas ——
        [[-0.7, 0.46], [0.7, 0.46], [-0.7, -0.46], [0.7, -0.46]].forEach(function (p) {
            cyl(root, 0.06, 0.06, 2.7, p[0], 1.55, p[1], chrome, 20);
            // arandelas
            cyl(root, 0.09, 0.09, 0.04, p[0], 0.32, p[1], chromeDark, 12);
            cyl(root, 0.09, 0.09, 0.04, p[0], 2.88, p[1], chromeDark, 12);
        });

        // —— Cabezal superior gris ——
        box(root, 1.9, 0.32, 1.2, 0, 3.0, 0, frame);
        box(root, 1.75, 0.1, 1.05, 0, 3.2, 0, frameLight);
        // placa etiqueta
        box(root, 0.55, 0.14, 0.03, 0, 3.0, 0.62, white, false);

        // —— Conjunto hidráulico azul (arriba) ——
        cyl(root, 0.3, 0.3, 0.5, 0, 3.52, 0, blue, 28);
        cyl(root, 0.22, 0.22, 0.12, 0, 3.82, 0, blueDeep, 20);
        cyl(root, 0.12, 0.12, 0.15, 0, 3.95, 0, chromeDark, 12);
        // manguera (torus parcial)
        var hoseMat = M(0x475569, 0.2, 0.65);
        var hose = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.028, 8, 20, Math.PI * 0.85), hoseMat);
        hose.position.set(0.38, 3.5, 0.2);
        hose.rotation.set(0.3, 0.8, 0.2);
        root.add(hose);

        // —— Placa superior FIJA ——
        var placaSup = cyl(root, 0.52, 0.52, 0.09, 0, 2.82, 0, plate, 40);
        state.placaSup = placaSup;
        state.placaSupBaseY = 2.82;
        // guía del vástago
        cyl(root, 0.1, 0.1, 0.2, 0, 2.72, 0, chromeDark, 16);

        // —— Vástago / pistón ——
        var piston = cyl(root, 0.065, 0.065, 1.15, 0, 2.15, 0, chrome, 16);
        state.piston = piston;
        state.pistonBaseY = 2.15;

        // —— Plato inferior MÓVIL + célula ——
        var plato = cyl(root, 0.62, 0.62, 0.08, 0, 0.52, 0, plate, 40);
        state.platoMovil = plato;
        state.platoBaseY = 0.52;
        // célula de carga (anillo)
        cyl(root, 0.4, 0.4, 0.1, 0, 0.62, 0, chrome, 28);
        cyl(root, 0.28, 0.28, 0.06, 0, 0.7, 0, chromeDark, 20);

        // —— Muestra de suelo (cilindro texturizado con bandas) ——
        var grpSoil = new THREE.Group();
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.33, 1.2, 36), soil);
        body.castShadow = true;
        body.receiveShadow = true;
        grpSoil.add(body);
        for (var i = 0; i < 5; i++) {
            var band = new THREE.Mesh(
                new THREE.TorusGeometry(0.335, 0.014, 6, 28),
                soilDark
            );
            band.rotation.x = Math.PI / 2;
            band.position.y = -0.45 + i * 0.22;
            grpSoil.add(band);
        }
        // tapa superior/inferior de la muestra
        var capMat = M(0xd4c4a8, 0.05, 0.85);
        var capT = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 32), capMat);
        capT.position.y = 0.62;
        grpSoil.add(capT);
        var capB = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 32), capMat);
        capB.position.y = -0.62;
        grpSoil.add(capB);

        grpSoil.position.y = 1.35;
        root.add(grpSoil);
        state.muestra = grpSoil;
        state.muestraBaseY = 1.35;
        state.muestraBody = body;

        // —— Panel de control (derecha, azul) ——
        var panel = new THREE.Group();
        panel.position.set(1.48, 0.9, 0.1);
        root.add(panel);
        box(panel, 0.58, 1.15, 0.72, 0, 0, 0, blue);
        box(panel, 0.52, 0.38, 0.68, 0, 0.28, 0.02, black);
        // displays LED
        box(panel, 0.2, 0.09, 0.02, -0.12, 0.35, 0.37, green, false);
        box(panel, 0.2, 0.09, 0.02, 0.12, 0.35, 0.37, green, false);
        // botones
        cyl(panel, 0.045, 0.045, 0.04, -0.14, -0.12, 0.37, green, 12);
        cyl(panel, 0.045, 0.045, 0.04, 0.0, -0.12, 0.37, yellow, 12);
        cyl(panel, 0.05, 0.05, 0.05, 0.14, -0.12, 0.37, red, 12);
        // seta emergencia
        cyl(panel, 0.09, 0.09, 0.07, 0, -0.38, 0.38, red, 16);
        box(panel, 0.2, 0.03, 0.2, 0, -0.42, 0.38, black, false);

        // —— Reloj comparador ——
        var dial = new THREE.Group();
        dial.position.set(1.05, 1.75, 0.72);
        root.add(dial);
        cyl(dial, 0.2, 0.2, 0.07, 0, 0, 0, chrome, 28);
        var face = new THREE.Mesh(
            new THREE.CircleGeometry(0.17, 28),
            white
        );
        face.position.z = 0.04;
        dial.add(face);
        // marcas
        for (var k = 0; k < 12; k++) {
            var ang = (k / 12) * Math.PI * 2;
            var tick = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.03, 0.005), black);
            tick.position.set(Math.sin(ang) * 0.13, Math.cos(ang) * 0.13, 0.045);
            tick.rotation.z = -ang;
            dial.add(tick);
        }
        var needle = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.13, 0.008), M(0x1e293b, 0.3, 0.4));
        needle.position.set(0, 0.04, 0.05);
        dial.add(needle);
        state.dialNeedle = needle;
        // pie del reloj
        cyl(root, 0.025, 0.025, 0.85, 1.05, 1.15, 0.72, chrome, 8);

        // tornillos decorativos en base
        [[-0.9, -0.55], [0.9, -0.55], [-0.9, 0.55], [0.9, 0.55]].forEach(function (p) {
            cyl(root, 0.03, 0.03, 0.03, p[0], 0.3, p[1], chromeDark, 8);
        });
    }

    function setup(container) {
        var w = Math.max(320, container.clientWidth || 480);
        var h = Math.max(320, container.clientHeight || 400);
        state.container = container;

        var scene = new THREE.Scene();
        scene.background = new THREE.Color(0xf3f4f6);
        state.scene = scene;

        var camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
        state.camera = camera;
        updateCamera();

        var renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(w, h);
        renderer.shadowMap.enabled = true;
        if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        // output more vivid
        if (renderer.outputEncoding !== undefined && THREE.sRGBEncoding) {
            renderer.outputEncoding = THREE.sRGBEncoding;
        }
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        state.renderer = renderer;

        // Iluminación tipo estudio / lab
        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        var key = new THREE.DirectionalLight(0xffffff, 1.05);
        key.position.set(3.5, 7, 4);
        key.castShadow = true;
        key.shadow.mapSize.set(1024, 1024);
        scene.add(key);
        var fill = new THREE.DirectionalLight(0xc7d2fe, 0.4);
        fill.position.set(-3, 2.5, -2);
        scene.add(fill);
        scene.add(new THREE.HemisphereLight(0xffffff, 0xb0b8c0, 0.45));
        var rim = new THREE.DirectionalLight(0xffffff, 0.25);
        rim.position.set(0, 3, -5);
        scene.add(rim);

        // piso claro
        var floor = new THREE.Mesh(
            new THREE.CircleGeometry(4.5, 64),
            new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughnessness: 0.92, metalness: 0.05 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        var root = new THREE.Group();
        scene.add(root);
        state.root = root;
        buildMachine(root);

        // controles
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
            if (state.renderer && state.scene && state.camera) {
                state.renderer.render(state.scene, state.camera);
            }
        })();
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
        if (state.platoMovil) {
            state.platoMovil.position.y = state.platoBaseY + lift;
        }
        state.muestra.position.y = state.muestraBaseY + lift - compress * 0.35 * scaleH;
        if (state.piston) {
            state.piston.position.y = state.pistonBaseY - lift * 0.25;
        }
        if (state.dialNeedle) {
            state.dialNeedle.rotation.z = -eps * 0.11;
        }
        if (state.muestraBody && state.muestraBody.material) {
            var t = Math.min(1, sig / 180);
            state.muestraBody.material.color.setRGB(0.77 - t * 0.08, 0.65 - t * 0.12, 0.45 - t * 0.1);
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
