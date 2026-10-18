/* GeoMetrics — Módulos 3D de Mecánica de Suelos II (máquinas por ensayo)
   API: GeoSim3DMS2.mount(container, 'corte'|'inconfinada'|'consolidacion'|'triaxial')
        GeoSim3DMS2.setRunning(bool) · GeoSim3DMS2.dispose() · GeoSim3DMS2.info(tipo) */
(function (global) {
    'use strict';
    var INFO = {
        corte: { maquina: 'Máquina de corte directo', partes: 'Caja de corte bipartida · motor de velocidad constante · anillo de carga · pesas y yugo vertical · deformímetros' },
        inconfinada: { maquina: 'Prensa de compresión inconfinada', partes: 'Bastidor con columnas · plato móvil · anillo de carga · deformímetro axial · probeta cilíndrica' },
        consolidacion: { maquina: 'Consolidómetro (odómetro) con marco de carga', partes: 'Anillo fijo con piedras porosas · celda con agua · brazo de palanca · pesas · deformímetro de lectura vertical' },
        triaxial: { maquina: 'Cámara triaxial con marco de carga', partes: 'Celda cilíndrica presurizada · probeta con membrana · pistón de carga · anillo de carga · controlador de presión de cámara' }
    };
    var S = { ready: false, token: 0 };

    function loadScript(src) {
        return new Promise(function (res, rej) {
            var s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s);
        });
    }
    function ensureThree() { return global.THREE ? Promise.resolve() : loadScript('https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js'); }
    function mat(c, m, r, extra) {
        var o = { color: c, metalness: m, roughness: r };
        if (extra) for (var k in extra) o[k] = extra[k];
        return new THREE.MeshStandardMaterial(o);
    }
    function box(p, w, h, d, x, y, z, m) {
        var o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o;
    }
    function cyl(p, rt, rb, h, x, y, z, m, seg) {
        var o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg || 40), m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; p.add(o); return o;
    }
    function dial(p, x, y, z, ry) {
        var g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; p.add(g);
        var d = cyl(g, 0.26, 0.26, 0.08, 0, 0, 0, mat(0x1f2937, 0.7, 0.3)); d.rotation.x = Math.PI / 2;
        var f = cyl(g, 0.22, 0.22, 0.02, 0, 0, 0.045, mat(0xf8fafc, 0.1, 0.6)); f.rotation.x = Math.PI / 2;
        var n = box(g, 0.02, 0.19, 0.01, 0, 0.09, 0.06, mat(0xdc2626, 0.2, 0.5)); n.geometry.translate(0, 0.09, 0); n.position.y = 0;
        return n;
    }
    var STEEL = function () { return mat(0x94a3b8, 0.85, 0.3); };
    var DARK = function () { return mat(0x1e3a5f, 0.6, 0.45); };
    var SOIL = function () { return mat(0xb08a5a, 0.0, 0.95); };
    var STONE = function () { return mat(0xcbd5e1, 0.0, 1); };

    /* ---------- builders: devuelven función de animación a(t) con t en [0,1] ---------- */
    function buildCorte(g) {
        box(g, 4.2, 0.2, 2.2, 0, 0.1, 0, DARK());
        box(g, 0.25, 1.6, 0.25, -1.9, 1.0, -0.8, STEEL()); box(g, 0.25, 1.6, 0.25, -1.9, 1.0, 0.8, STEEL());
        // motor + reductor
        var mot = cyl(g, 0.45, 0.45, 1.0, -1.7, 0.7, 0, mat(0x3b82f6, 0.5, 0.4)); mot.rotation.z = Math.PI / 2;
        box(g, 0.7, 0.7, 0.7, -1.1, 0.55, 0, DARK());
        // tornillo sin fin
        var rod = cyl(g, 0.06, 0.06, 1.4, -0.35, 0.55, 0, STEEL()); rod.rotation.z = Math.PI / 2;
        // caja de corte
        var base = new THREE.Group(); g.add(base); base.position.set(0.9, 0, 0);
        box(base, 1.6, 0.25, 1.3, 0, 0.32, 0, mat(0x475569, 0.7, 0.4));
        box(base, 1.0, 0.2, 0.9, 0, 0.55, 0, STEEL());
        box(base, 0.9, 0.18, 0.8, 0, 0.74, 0, SOIL()).material.color.set(0x9a7648);
        var top = new THREE.Group(); top.position.set(0, 0, 0); g.add(top); top.position.set(0.9, 0, 0);
        box(top, 1.0, 0.2, 0.9, 0, 0.93, 0, STEEL());
        box(top, 0.8, 0.12, 0.7, 0, 1.09, 0, STONE());
        cyl(top, 0.07, 0.07, 0.7, 0, 1.5, 0, STEEL());
        box(top, 0.9, 0.08, 0.08, 0, 1.87, 0, STEEL());
        // yugo y pesas
        var pes = [];
        for (var i = 0; i < 3; i++) { var w = cyl(top, 0.38 - i * 0.04, 0.38 - i * 0.04, 0.1, 0, 1.95 + i * 0.12, 0, mat(0x64748b, 0.8, 0.4)); pes.push(w); }
        // anillo de carga + empujador (conectado al tope)
        var ring = cyl(g, 0.22, 0.22, 0.16, 2.35, 0.95, 0, mat(0xf59e0b, 0.7, 0.35)); ring.rotation.x = Math.PI / 2;
        box(g, 0.1, 0.7, 0.1, 2.35, 0.55, 0, STEEL());
        var needle = dial(g, 2.35, 1.4, 0.3, 0);
        var dh = dial(g, 0.9, 1.4, 0.95, 0);
        var grooves = box(g, 0.01, 0.01, 0.01, 0, 0, 0, STEEL()); grooves.visible = false;
        return function (t) {
            var d = Math.min(1, t) * 0.28;
            base.position.x = 0.9 + d;
            rod.rotation.x = t * 20;
            mot.rotation.x = t * 40;
            needle.rotation.z = -Math.min(1, t * 1.2) * 2.4;
            dh.rotation.z = -t * 3.2;
        };
    }
    function buildInconfinada(g) {
        box(g, 3.2, 0.3, 2.4, 0, 0.15, 0, DARK());
        [[-1.1, -0.7], [1.1, -0.7], [-1.1, 0.7], [1.1, 0.7]].forEach(function (p) { cyl(g, 0.05, 0.05, 0.08, p[0], 0.34, p[1], STEEL(), 12); });
        var cols = [[-1.0, 0], [1.0, 0]];
        cols.forEach(function (c) { cyl(g, 0.08, 0.08, 3.1, c[0], 1.85, c[1], mat(0xcbd5e1, 0.95, 0.15)); });
        box(g, 2.5, 0.28, 0.9, 0, 3.5, 0, DARK());
        var pist = new THREE.Group(); g.add(pist);
        var plato = cyl(pist, 0.5, 0.5, 0.14, 0, 0.45, 0, STEEL());
        box(pist, 0.3, 0.5, 0.3, 0, 0.1, 0, mat(0x475569, 0.7, 0.4)).position.y = 0.15;
        var sample = cyl(g, 0.34, 0.34, 1.3, 0, 1.17, 0, SOIL());
        var topPlate = cyl(g, 0.44, 0.44, 0.1, 0, 1.87, 0, STEEL());
        cyl(g, 0.07, 0.07, 1.2, 0, 2.5, 0, STEEL());
        var ring = cyl(g, 0.3, 0.3, 0.22, 0, 3.1, 0, mat(0xf59e0b, 0.7, 0.35)); ring.rotation.x = 0;
        var n = dial(g, 1.45, 1.6, 0, Math.PI / 2);
        var failure = box(g, 0.02, 0.02, 0.02, 0, 0, 0, STEEL()); failure.visible = false;
        var crack = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.025, 0.025), mat(0x3b2a14, 0, 1)); crack.rotation.z = 1.0; crack.position.set(0, 1.17, 0.34); crack.visible = false; g.add(crack);
        return function (t) {
            var c = Math.min(1, t) * 0.17;
            sample.scale.set(1 + c * 0.45, 1 - c, 1 + c * 0.45);
            sample.position.y = 0.52 + 0.65 * (1 - c) + 0.0;
            topPlate.position.y = 0.52 + 1.3 * (1 - c) + 0.05;
            plato.position.y = 0.45; n.rotation.z = -t * 4;
            crack.visible = t > 0.8;
            sample.material.color.setRGB(0.69 - t * 0.08, 0.54 - t * 0.08, 0.35 - t * 0.06);
        };
    }
    function buildConsolidacion(g) {
        box(g, 4.2, 0.2, 2.2, 0, 0.1, 0, DARK());
        box(g, 0.3, 2.4, 0.3, -1.6, 1.4, 0, DARK());
        box(g, 0.2, 0.6, 1.0, -1.6, 2.5, 0, STEEL());
        // celda
        var cel = cyl(g, 0.8, 0.8, 0.5, 0.4, 0.45, 0, mat(0x64748b, 0.8, 0.35));
        var water = cyl(g, 0.7, 0.7, 0.34, 0.4, 0.62, 0, mat(0x38bdf8, 0.1, 0.1, { transparent: true, opacity: 0.5 }));
        var ring = cyl(g, 0.5, 0.5, 0.3, 0.4, 0.55, 0, STEEL());
        var sample = cyl(g, 0.46, 0.46, 0.2, 0.4, 0.55, 0, SOIL());
        var cap = cyl(g, 0.48, 0.48, 0.08, 0.4, 0.72, 0, STONE());
        var ram = cyl(g, 0.07, 0.07, 0.5, 0.4, 1.05, 0, STEEL());
        // brazo de palanca
        var arm = new THREE.Group(); arm.position.set(-1.6, 2.2, 0); g.add(arm);
        box(arm, 3.8, 0.12, 0.2, 1.9, 0, 0, mat(0x475569, 0.8, 0.35));
        // hanger y pesas
        var hang = new THREE.Group(); hang.position.set(3.4, 0, 0); arm.add(hang);
        cyl(hang, 0.02, 0.02, 1.0, 0, -0.5, 0, STEEL(), 8);
        for (var i = 0; i < 4; i++) cyl(hang, 0.35 - i * 0.03, 0.35 - i * 0.03, 0.13, 0, -1.1 + i * 0.15, 0, mat(0x64748b, 0.8, 0.4));
        box(g, 0.1, 0.3, 0.1, -0.1, 2.1, 0, STEEL());
        var n = dial(g, 1.6, 1.0, 0.6, 0);
        cyl(g, 0.02, 0.02, 0.8, 1.25, 1.1, 0.4, STEEL(), 8);
        return function (t) {
            var s = 1 - Math.exp(-4 * t); // consolidación asintótica
            sample.scale.y = 1 - s * 0.3;
            cap.position.y = 0.72 - s * 0.06; ram.position.y = 1.05 - s * 0.06;
            arm.rotation.z = -s * 0.012; hang.rotation.z = s * 0.012;
            n.rotation.z = -s * 3.4;
            water.scale.y = 1 - s * 0.05;
        };
    }
    function buildTriaxial(g) {
        box(g, 3.2, 0.3, 2.4, 0, 0.15, 0, DARK());
        [[-1.0, 0], [1.0, 0]].forEach(function (c) { cyl(g, 0.08, 0.08, 3.4, c[0], 2.0, c[1], mat(0xcbd5e1, 0.95, 0.15)); });
        box(g, 2.5, 0.28, 0.9, 0, 3.7, 0, DARK());
        cyl(g, 0.55, 0.55, 0.18, 0, 0.39, 0, STEEL());
        var celda = cyl(g, 0.5, 0.5, 1.9, 0, 1.43, 0, mat(0x93c5fd, 0.0, 0.05, { transparent: true, opacity: 0.28 }));
        cyl(g, 0.55, 0.55, 0.15, 0, 2.45, 0, STEEL());
        var sample = cyl(g, 0.28, 0.28, 1.0, 0, 1.0, 0, SOIL());
        var memb = cyl(g, 0.3, 0.3, 1.04, 0, 1.0, 0, mat(0xe2e8f0, 0, 0.4, { transparent: true, opacity: 0.3 }));
        var topCap = cyl(g, 0.3, 0.3, 0.08, 0, 1.54, 0, STEEL());
        var ram = cyl(g, 0.06, 0.06, 1.5, 0, 2.3, 0, mat(0xe2e8f0, 0.95, 0.1));
        var ring = cyl(g, 0.28, 0.28, 0.22, 0, 3.4, 0, mat(0xf59e0b, 0.7, 0.35));
        var n = dial(g, 1.45, 2.4, 0, Math.PI / 2);
        // controlador de presión
        box(g, 0.7, 1.1, 0.7, 2.3, 0.85, 0.2, mat(0x0f766e, 0.4, 0.5));
        box(g, 0.5, 0.25, 0.02, 2.3, 1.1, 0.56, mat(0x0b1220, 0.2, 0.3));
        cyl(g, 0.12, 0.12, 0.05, 2.3, 0.8, 0.58, mat(0x2dd4bf, 0.5, 0.3)).rotation.x = Math.PI / 2;
        var tube = cyl(g, 0.03, 0.03, 1.9, 1.25, 0.5, 0.2, mat(0x2dd4bf, 0.3, 0.4)); tube.rotation.z = Math.PI / 2;
        var crack = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.02, 0.02), mat(0x3b2a14, 0, 1)); crack.rotation.z = 1.0; crack.position.set(0, 1.0, 0.29); crack.visible = false; g.add(crack);
        return function (t) {
            var c = Math.min(1, t) * 0.15;
            sample.scale.set(1 + c * 0.5, 1 - c, 1 + c * 0.5); memb.scale.copy(sample.scale);
            sample.position.y = 0.5 + 0.5 * (1 - c); memb.position.y = sample.position.y;
            topCap.position.y = 0.5 + (1 - c) + 0.04; ram.position.y = 2.3 - c;
            n.rotation.z = -t * 4;
            crack.visible = t > 0.85;
            celda.material.opacity = 0.28 + 0.06 * Math.sin(t * 20);
        };
    }
    var BUILD = { corte: buildCorte, inconfinada: buildInconfinada, consolidacion: buildConsolidacion, triaxial: buildTriaxial };

    function dispose() {
        S.token++;
        if (S.raf) cancelAnimationFrame(S.raf);
        if (S.renderer) { try { S.renderer.dispose(); } catch (e) {} }
        if (S.ro) { try { S.ro.disconnect(); } catch (e) {} }
        S.raf = 0; S.renderer = null; S.ready = false; S.running = false; S.ro = null;
    }

    function mount(container, tipo) {
        if (typeof container === 'string') container = document.getElementById(container);
        if (!container || !BUILD[tipo]) return Promise.resolve(false);
        dispose();
        var tok = S.token;
        return ensureThree().then(function () {
            if (tok !== S.token) return false;
            var w = Math.max(320, container.clientWidth), h = Math.max(320, container.clientHeight);
            var scene = new THREE.Scene(); scene.background = new THREE.Color(0x0B1220);
            var cam = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
            var r;
            try { r = new THREE.WebGLRenderer({ antialias: true }); } catch (e) { return false; }
            r.setPixelRatio(Math.min(global.devicePixelRatio || 1, 2)); r.setSize(w, h); r.shadowMap.enabled = true;
            container.innerHTML = ''; container.appendChild(r.domElement);
            scene.add(new THREE.AmbientLight(0xb0c4de, 0.55));
            var key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(3.5, 7, 4); key.castShadow = true; scene.add(key);
            var fill = new THREE.DirectionalLight(0x3B82F6, 0.4); fill.position.set(-3, 2.5, -2); scene.add(fill);
            scene.add(new THREE.HemisphereLight(0xA7B4C8, 0x0B1220, 0.4));
            var floor = new THREE.Mesh(new THREE.CircleGeometry(4.5, 64), new THREE.MeshStandardMaterial({ color: 0x151F32, roughness: 0.9 }));
            floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
            var grid = new THREE.GridHelper(9, 18, 0x2B3A50, 0x1E293B); grid.position.y = 0.01; scene.add(grid);
            var root = new THREE.Group(); scene.add(root);
            var anim = BUILD[tipo](root);
            var st = { th: 0.7, ph: 1.15, rad: tipo === 'inconfinada' || tipo === 'triaxial' ? 9.5 : 8.2, t: 0, auto: true };
            var cy = tipo === 'consolidacion' ? 1.4 : 1.9;
            function cc() { cam.position.set(st.rad * Math.sin(st.ph) * Math.sin(st.th), st.rad * Math.cos(st.ph) + cy, st.rad * Math.sin(st.ph) * Math.cos(st.th)); cam.lookAt(0, cy, 0); }
            cc();
            var dom = r.domElement, drag = false, px = 0, py = 0;
            dom.style.touchAction = 'none'; dom.style.cursor = 'grab';
            dom.addEventListener('pointerdown', function (e) { drag = true; st.auto = false; px = e.clientX; py = e.clientY; try { dom.setPointerCapture(e.pointerId); } catch (x) {} });
            dom.addEventListener('pointermove', function (e) { if (!drag) return; st.th -= (e.clientX - px) * 0.006; st.ph = Math.max(0.4, Math.min(1.45, st.ph + (e.clientY - py) * 0.006)); px = e.clientX; py = e.clientY; cc(); });
            dom.addEventListener('pointerup', function () { drag = false; });
            dom.addEventListener('wheel', function (e) { e.preventDefault(); st.rad = Math.max(4.5, Math.min(14, st.rad + e.deltaY * 0.01)); cc(); }, { passive: false });
            S.st = st; S.renderer = r; S.running = false; S.ready = true; S.reset = function () { st.t = 0; anim(0); };
            S.ro = global.ResizeObserver ? new ResizeObserver(function () { var W = container.clientWidth, H = container.clientHeight; if (W > 0 && H > 0) { cam.aspect = W / H; cam.updateProjectionMatrix(); r.setSize(W, H); } }) : null;
            if (S.ro) S.ro.observe(container);
            anim(0);
            var last = 0;
            (function loop(now) {
                if (tok !== S.token) return;
                S.raf = requestAnimationFrame(loop);
                var dt = Math.min(0.05, ((now || 0) - last) / 1000); last = now || 0;
                if (S.running) { st.t += dt / 8; if (st.t >= 1) { st.t = 1; S.running = false; if (S.onEnd) S.onEnd(); } anim(st.t); }
                if (st.auto && !drag) { st.th += dt * 0.15; cc(); }
                r.render(scene, cam);
            })(0);
            return true;
        }).catch(function (e) { console.warn('3D MS2', e); return false; });
    }

    global.GeoSim3DMS2 = {
        mount: mount, dispose: dispose,
        info: function (t) { return INFO[t]; },
        isReady: function () { return !!S.ready; },
        play: function () { if (!S.ready) return; if (S.st && S.st.t >= 1) S.reset(); S.running = true; },
        pause: function () { S.running = false; },
        reset: function () { if (S.ready) { S.running = false; S.reset(); } },
        onEnd: function (fn) { S.onEnd = fn; }
    };
})(window);
