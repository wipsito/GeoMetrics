/**
 * GeoMetrics — Prensa de Compresión Inconfinada 3D (GLB + fallback)
 * Modelo: models/prensa_inconfinada.glb
 */
(function (global) {
    'use strict';

    var state = {
        ready: false,
        renderer: null,
        scene: null,
        camera: null,
        root: null,
        model: null,
        muestra: null,
        platoMovil: null,
        piston: null,
        animId: null,
        container: null,
        width: 480,
        height: 400,
        dragging: false,
        prevX: 0,
        prevY: 0,
        theta: 0.55,
        phi: 1.05,
        radius: 6.2,
        muestraBaseScale: { x: 1, y: 1, z: 1 },
        muestraBaseY: 0,
        platoBaseY: 0,
        pistonBaseY: 0,
        usingGlb: false
    };

    function $(id) { return document.getElementById(id); }

    function loadScript(src) {
        return new Promise(function (resolve, reject) {
            var s = document.createElement('script');
            s.src = src;
            s.onload = resolve;
            s.onerror = reject;
            document.head.appendChild(s);
        });
    }

    async function ensureThree() {
        if (!global.THREE) {
            await loadScript('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js');
        }
        if (!global.THREE.GLTFLoader) {
            // GLTFLoader as UMD addon
            await loadScript('https://cdn.jsdelivr.net/npm/three@0.147.0/examples/js/loaders/GLTFLoader.js');
        }
    }

    function mat(color, metal, rough) {
        return new THREE.MeshStandardMaterial({
            color: color,
            metalness: metal != null ? metal : 0.5,
            roughness: rough != null ? rough : 0.4
        });
    }

    function updateCamera() {
        var cam = state.camera;
        if (!cam) return;
        cam.position.x = state.radius * Math.sin(state.phi) * Math.sin(state.theta);
        cam.position.y = state.radius * Math.cos(state.phi) + 1.4;
        cam.position.z = state.radius * Math.sin(state.phi) * Math.cos(state.theta);
        cam.lookAt(0, 1.5, 0);
    }

    function bindControls(dom) {
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
    }

    function setupRenderer(container) {
        var w = Math.max(320, container.clientWidth || state.width);
        var h = Math.max(300, container.clientHeight || state.height);
        state.width = w;
        state.height = h;
        state.container = container;

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
        container.innerHTML = '';
        container.appendChild(renderer.domElement);
        state.renderer = renderer;

        scene.add(new THREE.AmbientLight(0xffffff, 0.65));
        var key = new THREE.DirectionalLight(0xffffff, 1.0);
        key.position.set(4, 8, 5);
        key.castShadow = true;
        scene.add(key);
        scene.add(new THREE.HemisphereLight(0xddeeff, 0x999999, 0.4));

        var floor = new THREE.Mesh(
            new THREE.CircleGeometry(5, 48),
            new THREE.MeshStandardMaterial({ color: 0xe8eaed, roughnessness: 0.95 })
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        scene.add(floor);

        bindControls(renderer.domElement);
        startLoop();
    }

    function findByName(root, name) {
        var found = null;
        root.traverse(function (o) {
            if (o.name === name) found = o;
        });
        return found;
    }

    function loadGLB() {
        return new Promise(function (resolve, reject) {
            var loader = new THREE.GLTFLoader();
            var url = 'models/prensa_inconfinada.glb';
            loader.load(
                url,
                function (gltf) {
                    resolve(gltf);
                },
                undefined,
                function (err) {
                    reject(err);
                }
            );
        });
    }

    function attachGlb(gltf) {
        var model = gltf.scene;
        model.traverse(function (o) {
            if (o.isMesh) {
                o.castShadow = true;
                o.receiveShadow = true;
            }
        });
        state.scene.add(model);
        state.model = model;
        state.usingGlb = true;

        state.muestra = findByName(model, 'muestra');
        state.platoMovil = findByName(model, 'platoMovil');
        state.piston = findByName(model, 'piston');

        if (state.muestra) {
            state.muestraBaseScale = {
                x: state.muestra.scale.x,
                y: state.muestra.scale.y,
                z: state.muestra.scale.z
            };
            state.muestraBaseY = state.muestra.position.y;
        }
        if (state.platoMovil) state.platoBaseY = state.platoMovil.position.y;
        if (state.piston) state.pistonBaseY = state.piston.position.y;

        state.ready = true;
        update(0, 0, {});
    }

    /** Fallback procedural si el GLB no carga */
    function buildProcedural() {
        var root = new THREE.Group();
        state.scene.add(root);
        state.root = root;
        var gray = mat(0x6b7280, 0.5, 0.45);
        var chrome = mat(0xc0c8d0, 0.85, 0.22);
        var blue = mat(0x3b6ea5, 0.35, 0.45);
        var soil = mat(0xb8956a, 0.05, 0.92);

        function box(w, h, d, x, y, z, m) {
            var mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            root.add(mesh);
            return mesh;
        }
        function cyl(r, h, x, y, z, m) {
            var mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), m);
            mesh.position.set(x, y, z);
            mesh.castShadow = true;
            root.add(mesh);
            return mesh;
        }
        box(2.6, 0.22, 1.7, 0, 0.11, 0, gray);
        [[-0.72, 0.48], [0.72, 0.48], [-0.72, -0.48], [0.72, -0.48]].forEach(function (p) {
            cyl(0.055, 2.85, p[0], 1.55, p[1], chrome);
        });
        box(1.85, 0.28, 1.15, 0, 3.05, 0, gray);
        cyl(0.28, 0.55, 0, 3.55, 0, blue);
        cyl(0.5, 0.1, 0, 2.88, 0, chrome);
        state.piston = cyl(0.07, 1.1, 0, 2.25, 0, chrome);
        state.pistonBaseY = 2.25;
        state.platoMovil = cyl(0.58, 0.1, 0, 0.55, 0, chrome);
        state.platoBaseY = 0.55;
        state.muestra = cyl(0.32, 1.15, 0, 1.3, 0, soil);
        state.muestraBaseY = 1.3;
        state.muestraBaseScale = { x: 1, y: 1, z: 1 };
        box(0.55, 1.1, 0.7, 1.55, 0.95, 0.15, blue);
        state.usingGlb = false;
        state.ready = true;
        update(0, 0, {});
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

    function update(eps, sig, dims) {
        if (!state.ready) return;
        eps = Math.max(0, Number(eps) || 0);
        sig = Number(sig) || 0;
        dims = dims || {};
        var dmm = dims.d_mm || 38;
        var L0 = dims.L0_mm || 76;
        var scaleR = Math.max(0.75, Math.min(1.35, dmm / 38));
        var scaleH = Math.max(0.75, Math.min(1.35, L0 / 76));
        var compress = Math.min(0.28, (eps / 20) * 0.28);
        var bulge = 1 + compress * 0.45;
        var lift = compress * 0.45;

        if (state.muestra) {
            var bs = state.muestraBaseScale;
            state.muestra.scale.set(
                bs.x * scaleR * bulge,
                bs.y * scaleH * (1 - compress),
                bs.z * scaleR * bulge
            );
            if (state.platoMovil) {
                state.platoMovil.position.y = state.platoBaseY + lift;
                state.muestra.position.y = state.muestraBaseY + lift - compress * 0.35 * scaleH;
            } else {
                state.muestra.position.y = state.muestraBaseY - compress * 0.4;
            }
            if (state.muestra.material && state.muestra.material.color) {
                var t = Math.min(1, sig / 200);
                state.muestra.material.color.setRGB(0.72 - t * 0.1, 0.58 - t * 0.15, 0.42 - t * 0.1);
            }
        }
        if (state.piston) {
            state.piston.position.y = state.pistonBaseY - lift * 0.3;
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

        ensureThree()
            .then(function () {
                if (state.ready && state.container === el) {
                    resize();
                    update(0, 0, {});
                    return;
                }
                setupRenderer(el);
                return loadGLB().then(attachGlb).catch(function (err) {
                    console.warn('GLB no disponible, usando modelo procedural:', err);
                    buildProcedural();
                });
            })
            .catch(function (e) {
                console.warn('Three.js error', e);
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
