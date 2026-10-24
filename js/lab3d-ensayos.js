/**
 * GeoMetrics — Laboratorio 3D · Mecánica de Suelos II
 * Una máquina 3D por ensayo:
 *   corte        → Aparato de corte directo (caja de corte bipartida)
 *   inconfinada  → Prensa de compresión inconfinada
 *   consolidacion→ Consolidómetro (edómetro) de palanca
 *   triaxial     → Cámara triaxial con marco de carga
 *
 * API:  GeoLab3D.mount(hostElement, tipo)  →  instancia { dispose(), refresh() }
 *       GeoLab3D.disposeAll()
 */
(function (global) {
    'use strict';

    /* ------------------------------------------------------------------ */
    /*  Carga de three.js                                                  */
    /* ------------------------------------------------------------------ */
    var THREE_SRCS = [
        'https://cdn.jsdelivr.net/npm/three@0.147.0/build/three.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/three.js/r147/three.min.js',
        'https://unpkg.com/three@0.147.0/build/three.min.js'
    ];
    var threePromise = null;

    function loadScript(src) {
        return new Promise(function (res, rej) {
            var s = document.createElement('script');
            s.src = src;
            s.async = true;
            s.onload = function () { res(); };
            s.onerror = function () { rej(new Error('No se pudo cargar ' + src)); };
            document.head.appendChild(s);
        });
    }

    function ensureThree() {
        if (global.THREE) return Promise.resolve(global.THREE);
        if (!threePromise) {
            threePromise = THREE_SRCS.reduce(function (chain, src) {
                return chain.catch(function () { return loadScript(src); });
            }, Promise.reject())
                .then(function () {
                    if (!global.THREE) throw new Error('three.js cargó pero window.THREE no está disponible');
                    return global.THREE;
                })
                .catch(function (e) { threePromise = null; throw e; });
        }
        return threePromise;
    }

    /* ------------------------------------------------------------------ */
    /*  Metadatos por ensayo (máquina asignada, secuencia, cámaras)        */
    /* ------------------------------------------------------------------ */
    var META = {
        corte: {
            accent: '#3B82F6',
            machine: 'Aparato de corte directo',
            machineSub: 'Caja de corte bipartida con carro móvil',
            norma: 'ASTM D3080 · INV E-154',
            duration: 18,
            phases: [
                { a: 0.00, b: 0.10, t: 'Preparar la muestra', d: 'Recorta o prepara la muestra con dimensiones apropiadas. (ASTM D3080)' },
                { a: 0.10, b: 0.20, t: 'Instalar en la caja', d: 'Coloca el suelo en la caja con los elementos porosos requeridos.' },
                { a: 0.20, b: 0.35, t: 'Aplicar carga normal σn', d: 'Aplica la tensión normal y permite la consolidación requerida. σn = N / A.' },
                { a: 0.35, b: 0.55, t: 'Cortar a velocidad constante', d: 'Desplaza horizontalmente una mitad de la caja a la velocidad establecida.' },
                { a: 0.55, b: 0.68, t: 'Registrar mediciones', d: 'Mide desplazamiento horizontal, fuerza cortante y desplazamiento vertical.' },
                { a: 0.68, b: 0.80, t: 'Calcular esfuerzos', d: 'τ = T / A. Aplica corrección de área cuando corresponda.' },
                { a: 0.80, b: 0.90, t: 'Identificar resistencia', d: 'Construye la curva esfuerzo cortante–desplazamiento y aplica el criterio de resistencia.' },
                { a: 0.90, b: 1.01, t: 'Obtener c y φ', d: 'Repite a distintas σn. Ajusta la envolvente τf = c + σn · tan(φ).' }
            ],
            parts: [
                { name: "Mitad superior de la caja (fija)", desc: "Retenida por la mordaza y el anillo; no se desplaza." },
                { name: "Mitad inferior sobre carro móvil", desc: "Se desplaza con el carro empujada por el tornillo de avance." },
                { name: "Plano de corte", desc: "Interfaz entre ambas mitades donde se desarrolla la falla." },
                { name: "Colgador y pesas (carga normal)", desc: "Aplican la fuerza vertical N → σn = N / A." },
                { name: "Anillo dinamométrico", desc: "Mide la fuerza cortante horizontal → τ." },
                { name: "Motor y reductor", desc: "Fijan la velocidad de desplazamiento del carro." },
                { name: "Deformímetro horizontal (δh)", desc: "Mide el desplazamiento relativo del carro." },
                { name: "Deformímetro vertical (δv)", desc: "Mide la contracción o dilatación de la muestra." }
            ],
            cam: {
                target: [0, 1.25, 0],
                home: { theta: 0.62, phi: 1.2, radius: 9.6 },
                frontal: { theta: 0.0, phi: 1.32, radius: 9.8 },
                lateral: { theta: 1.5, phi: 1.28, radius: 9.0 },
                detalle: { theta: 0.45, phi: 1.28, radius: 5.4 }
            }
        },
        inconfinada: {
            accent: '#2DD4BF',
            machine: 'Prensa de compresión inconfinada',
            machineSub: 'Bastidor de acero, celda de carga, reloj comparador y panel de control',
            norma: 'ASTM D2166 · INV E-152',
            duration: 14,
            phases: [
                { a: 0.00, b: 0.10, t: 'Preparar la probeta', d: 'Probeta cilíndrica con dimensiones del método. (ASTM D2166)' },
                { a: 0.10, b: 0.20, t: 'Medir geometría', d: 'Registra diámetro, altura inicial L0 y masa.' },
                { a: 0.20, b: 0.30, t: 'Instalar en la prensa', d: 'Centra la probeta entre los platos (σ₃ = 0).' },
                { a: 0.30, b: 0.50, t: 'Cargar axialmente', d: 'Aplica deformación axial a la velocidad especificada.' },
                { a: 0.50, b: 0.62, t: 'Registrar P y ΔL', d: 'Mide carga axial P y acortamiento ΔL.' },
                { a: 0.62, b: 0.74, t: 'Calcular ε y área corregida', d: 'ε = ΔL / L0; Acorr = A0 / (1 − ε).' },
                { a: 0.74, b: 0.86, t: 'Calcular esfuerzo σ', d: 'σ = P / Acorr. Construye la curva esfuerzo–deformación.' },
                { a: 0.86, b: 1.01, t: 'Identificar qu y cu', d: 'qu = máximo esfuerzo axial. cu ≈ qu / 2 en condiciones apropiadas.' }
            ],
            parts: [
                { name: "Bastidor de acero", desc: "Columnas y travesaño rígidos que reaccionan la carga axial." },
                { name: "Celda de carga", desc: "Cabezal azul sobre el travesaño: mide la fuerza axial P." },
                { name: "Muestra de suelo (probeta)", desc: "Cilindro libre de suelo cohesivo, sin confinamiento lateral (σ₃ = 0)." },
                { name: "Plato móvil inferior", desc: "Sube a velocidad controlada y comprime la probeta contra el cabezal." },
                { name: "Reloj comparador", desc: "Mide el acortamiento ΔL de la probeta (deformación axial)." },
                { name: "Panel de control", desc: "Medidores, display de carga, arranque y parada del ensayo." }
            ],
            cam: {
                target: [0, 2.05, 0],
                home: { theta: 0.62, phi: 1.12, radius: 9.2 },
                frontal: { theta: 0.0, phi: 1.3, radius: 9.4 },
                lateral: { theta: 1.5, phi: 1.25, radius: 8.8 },
                detalle: { theta: 0.5, phi: 1.2, radius: 4.8, target: [0, 2.0, 0] }
            }
        },
        consolidacion: {
            accent: '#FBBF24',
            machine: 'Consolidómetro (edómetro) de palanca',
            machineSub: 'Celda con anillo, brazo de carga y pesas escalonadas',
            norma: 'ASTM D2435 · INV E-151',
            duration: 22,
            phases: [
                { a: 0.00, b: 0.12, t: 'Preparar la muestra', d: 'Recorta la muestra para el anillo conservando la estructura. (ASTM D2435)' },
                { a: 0.12, b: 0.24, t: 'Montar en el edómetro', d: 'Coloca la muestra entre piedras porosas e instala el conjunto.' },
                { a: 0.24, b: 0.36, t: 'Carga de asiento', d: 'Aplica la carga de asiento establecida y pon a cero el deformímetro.' },
                { a: 0.36, b: 0.58, t: 'Incrementos de carga', d: 'Aplica incrementos de tensión vertical según el programa del ensayo.' },
                { a: 0.58, b: 0.72, t: 'Medir tiempo y asentamiento', d: 'Registra desplazamientos a los tiempos establecidos en cada incremento.' },
                { a: 0.72, b: 0.84, t: 'Calcular índice de vacíos e', d: 'Usa la geometría inicial y el cambio de altura: e = e0 − ΔH / Hs.' },
                { a: 0.84, b: 1.01, t: 'Interpretar Cc, σ\'p y Cv', d: 'Curvas e–log σ\' y asentamiento–tiempo. Obtén Cc, Cr/Cs, σ\'p y Cv.' }
            ],
            parts: [
                { name: "Brazo de carga (palanca)", desc: "Multiplica la carga de las pesas sobre la muestra." },
                { name: "Columna y pivote", desc: "Apoyo del brazo de palanca." },
                { name: "Colgador y pesas", desc: "Cada escalón duplica σ' (carga escalonada)." },
                { name: "Vástago de carga", desc: "Transmite la fuerza del brazo al cabezal." },
                { name: "Anillo con la muestra", desc: "Confina lateralmente; drenaje por ambas caras." },
                { name: "Celda con piedras porosas y agua", desc: "Mantiene la muestra saturada y drenada." },
                { name: "Deformímetro de asentamiento", desc: "Lee ΔH en el tiempo para obtener Cv y e–log σ'." }
            ],
            cam: {
                target: [0.4, 1.25, 0],
                home: { theta: 0.5, phi: 1.2, radius: 10.8 },
                frontal: { theta: 0.0, phi: 1.34, radius: 11.0 },
                lateral: { theta: 1.45, phi: 1.28, radius: 9.5 },
                detalle: { theta: 0.35, phi: 1.25, radius: 5.8, target: [-0.6, 1.1, 0] }
            }
        },
        triaxial: {
            accent: '#A78BFA',
            machine: 'Cámara triaxial con marco de carga',
            machineSub: 'Cámara acrílica, controlador de presión y celda de carga',
            norma: 'ASTM D2850 / D4767 · INV E-153',
            duration: 20,
            phases: [
                { a: 0.00, b: 0.10, t: 'Preparar la probeta', d: 'Obtén y mide una probeta cilíndrica. (ASTM D2850 / D4767)' },
                { a: 0.10, b: 0.20, t: 'Instalar membrana', d: 'Coloca membrana, piedras porosas y conexiones de drenaje.' },
                { a: 0.20, b: 0.30, t: 'Cerrar la cámara', d: 'Monta la cámara y comprueba estanqueidad.' },
                { a: 0.30, b: 0.42, t: 'Aplicar confinamiento σ₃', d: 'Aplica la presión lateral σ₃ indicada.' },
                { a: 0.42, b: 0.52, t: 'Consolidar si corresponde', d: 'CU y CD: fase de consolidación. UU: sin consolidación previa.' },
                { a: 0.52, b: 0.60, t: 'Definir drenaje', d: 'UU no drenado; CU consolidado–corte no drenado; CD consolidado–corte drenado.' },
                { a: 0.60, b: 0.78, t: 'Aplicar carga axial', d: 'Incrementa la carga a la velocidad establecida.' },
                { a: 0.78, b: 0.88, t: 'Registrar datos', d: 'Carga, deformación, σ₃ y, si procede, presión de poros y cambio volumétrico.' },
                { a: 0.88, b: 1.01, t: 'Círculos de Mohr y c–φ', d: 'σ₁ = σ₃ + q. Construye círculos de Mohr y obtiene parámetros resistentes.' }
            ],
            parts: [
                { name: "Marco de carga", desc: "Columnas y travesaño que reaccionan la carga axial." },
                { name: "Celda de carga", desc: "Mide la fuerza axial en el vástago." },
                { name: "Vástago de carga", desc: "Transmite la carga al cabezal de la probeta." },
                { name: "Cámara triaxial", desc: "Cilindro acrílico lleno de agua a presión σ₃." },
                { name: "Probeta con membrana de látex", desc: "Suelo confinado; la membrana aísla del agua de la cámara." },
                { name: "Controlador de presión", desc: "Regula la presión de cámara σ₃ y la contrapresión." },
                { name: "Buretas (volumen y drenaje)", desc: "Miden cambio de volumen / presión de poros." },
                { name: "Deformímetro axial", desc: "Mide el acortamiento ΔL de la probeta." },
                { name: "Gato y plato móvil", desc: "Elevan la cámara a velocidad controlada." }
            ],
            cam: {
                target: [0.9, 2.0, 0],
                home: { theta: 0.6, phi: 1.18, radius: 10.4 },
                frontal: { theta: 0.0, phi: 1.3, radius: 10.6 },
                lateral: { theta: 1.5, phi: 1.25, radius: 9.6 },
                detalle: { theta: 0.35, phi: 1.2, radius: 5.4, target: [0, 1.7, 0] }
            }
        }
    };

    /* ------------------------------------------------------------------ */
    /*  Utilidades                                                         */
    /* ------------------------------------------------------------------ */
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function ease(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }
    function seg(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
    function fmt(v, d) { return (isFinite(v) ? v : 0).toFixed(d); }
    function esc(s) {
        return String(s).replace(/[&<>"]/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
        });
    }

    function datos(tipo) {
        return (global.__datosEnsayoMS2 && global.__datosEnsayoMS2[tipo]) || null;
    }
    function leerNum(id) {
        var el = document.getElementById(id);
        if (!el) return null;
        var v = parseFloat(el.value);
        return isFinite(v) ? v : null;
    }

    /* ------------------------------------------------------------------ */
    /*  Parámetros del ensayo (datos reales calculados o valores típicos)  */
    /* ------------------------------------------------------------------ */
    function paramsCorte() {
        var d = datos('corte');
        var o = { c: 10, phi: 30, sn: 100, real: false };
        if (d && isFinite(d.phi) && isFinite(d.c)) {
            o.c = d.c; o.phi = d.phi; o.real = true;
            if (d.pts && d.pts.length) o.sn = d.pts[Math.min(1, d.pts.length - 1)].sn || o.sn;
        }
        o.tauP = o.c + o.sn * Math.tan(o.phi * Math.PI / 180);
        o.nota = o.real
            ? 'Con tus resultados: c = ' + fmt(o.c, 1) + ' kPa · φ = ' + fmt(o.phi, 1) + '° · σn = ' + fmt(o.sn, 0) + ' kPa'
            : 'Valores típicos de ejemplo (c = 10 kPa, φ = 30°). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    function paramsInconf() {
        var d = datos('inconfinada');
        var o = { qu: 120, dmm: leerNum('uc-d') || 38, L0: leerNum('uc-l0') || 76, epsf: 12, real: false };
        if (d && isFinite(d.qu)) {
            o.qu = d.qu; o.real = true;
            if (d.d) o.dmm = d.d;
            if (d.L0) o.L0 = d.L0;
            if (d.peak && isFinite(d.peak.eps) && d.peak.eps > 1) o.epsf = clamp(d.peak.eps, 2, 16);
        }
        o.nota = o.real
            ? 'Con tus resultados: qu = ' + fmt(o.qu, 1) + ' kPa · cu = ' + fmt(o.qu / 2, 1) + ' kPa'
            : 'Valores típicos de ejemplo (qu = 120 kPa). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    function paramsConsol() {
        var d = datos('consolidacion');
        var H0 = leerNum('co-h0') || 20;
        var o = {
            H0: H0, e0: 0.88, real: false,
            steps: [
                { s: 25, e: 0.875 }, { s: 50, e: 0.860 }, { s: 100, e: 0.835 },
                { s: 200, e: 0.730 }, { s: 400, e: 0.625 }
            ]
        };
        if (d && d.pts && d.pts.length >= 2) {
            o.steps = d.pts.map(function (p) { return { s: p.s, e: p.e }; });
            o.e0 = isFinite(d.e0) && d.e0 ? d.e0 : o.steps[0].e + 0.02;
            o.real = true;
        }
        o.steps.forEach(function (st) {
            st.dH = Math.max(0, H0 * (o.e0 - st.e) / (1 + o.e0));
        });
        o.nota = o.real
            ? 'Con tus resultados: ' + o.steps.length + ' escalones de carga · e₀ = ' + fmt(o.e0, 3)
            : 'Valores típicos de ejemplo (5 escalones, 25–400 kPa). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    function paramsTriaxial() {
        var d = datos('triaxial');
        var tipoSel = (document.getElementById('tx-tipo') || {}).value || 'CU';
        var o = { s3: 200, s1: 650, phi: 30, tipo: tipoSel, real: false };
        if (d && d.pts && d.pts.length) {
            var p = d.pts[Math.min(1, d.pts.length - 1)];
            o.s3 = p.s3; o.s1 = p.s1; o.real = true;
            if (isFinite(d.phi)) o.phi = clamp(d.phi, 5, 50);
            if (d.tipo) o.tipo = d.tipo;
        }
        o.sdf = Math.max(10, o.s1 - o.s3);
        o.nota = o.real
            ? 'Con tus resultados: σ₃ = ' + fmt(o.s3, 0) + ' kPa · σ₁ = ' + fmt(o.s1, 0) + ' kPa · φ = ' + fmt(o.phi, 1) + '°'
            : 'Valores típicos de ejemplo (σ₃ = 200 kPa, φ = 30°). Pulsa CALCULAR para usar tus datos.';
        return o;
    }

    var PARAMS = {
        corte: paramsCorte,
        inconfinada: paramsInconf,
        consolidacion: paramsConsol,
        triaxial: paramsTriaxial
    };

    /* ------------------------------------------------------------------ */
    /*  Primitivas three.js                                                */
    /* ------------------------------------------------------------------ */
    function M(hex, metal, rough, extra) {
        var o = { color: hex, metalness: metal, roughness: rough };
        if (extra) { for (var k in extra) o[k] = extra[k]; }
        return new THREE.MeshStandardMaterial(o);
    }
    function glass(hex, op) {
        return new THREE.MeshStandardMaterial({
            color: hex, metalness: 0.1, roughness: 0.15, transparent: true,
            opacity: op, depthWrite: false, side: THREE.DoubleSide
        });
    }
    function add(parent, mesh, x, y, z) {
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        parent.add(mesh);
        return mesh;
    }
    function box(parent, w, h, d, x, y, z, mat) {
        return add(parent, new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat), x, y, z);
    }
    function cyl(parent, rT, rB, h, x, y, z, mat, seg) {
        return add(parent, new THREE.Mesh(new THREE.CylinderGeometry(rT, rB, h, seg || 32), mat), x, y, z);
    }
    function cylX(parent, rT, rB, h, x, y, z, mat, seg) {
        var m = cyl(parent, rT, rB, h, x, y, z, mat, seg);
        m.rotation.z = Math.PI / 2;
        return m;
    }
    function cylZ(parent, rT, rB, h, x, y, z, mat, seg) {
        var m = cyl(parent, rT, rB, h, x, y, z, mat, seg);
        m.rotation.x = Math.PI / 2;
        return m;
    }
    /* varilla horizontal de longitud 1 (se escala en X) */
    function rodX(parent, r, x, y, z, mat) {
        var g = new THREE.CylinderGeometry(r, r, 1, 14);
        g.rotateZ(Math.PI / 2);
        return add(parent, new THREE.Mesh(g, mat), x, y, z);
    }
    function setRodX(rod, x0, x1) {
        var L = Math.max(0.001, x1 - x0);
        rod.scale.x = L;
        rod.position.x = x0 + L / 2;
    }
    function plinth(parent, w, d, accent) {
        box(parent, w, 0.12, d, 0, -0.06, 0, M(0x1E293B, 0.2, 0.7));
        var edge = new THREE.Mesh(
            new THREE.BoxGeometry(w + 0.02, 0.022, 0.02),
            new THREE.MeshBasicMaterial({ color: new THREE.Color(accent) })
        );
        edge.position.set(0, -0.012, d / 2);
        parent.add(edge);
    }

    /* Deformímetro (carátula) con aguja. Devuelve el grupo de la aguja. */
    function makeDial(parent, x, y, z, R, mt) {
        var g = new THREE.Group();
        g.position.set(x, y, z);
        parent.add(g);
        var k = R / 0.28;
        cylZ(g, R, R, 0.1 * k, 0, 0, 0, mt.chrome, 36);
        cylZ(g, R * 0.93, R * 0.93, 0.04 * k, 0, 0, 0.06 * k, M(0x1E293B, 0.2, 0.5), 32);
        var face = new THREE.Mesh(new THREE.CircleGeometry(R * 0.86, 48), mt.white);
        face.position.z = 0.085 * k;
        g.add(face);
        var ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.86, 0.012 * k, 8, 48), mt.accent);
        ring.position.z = 0.09 * k;
        g.add(ring);
        for (var i = 0; i < 20; i++) {
            var ang = (i / 20) * Math.PI * 2 - Math.PI / 2;
            var long = (i % 5 === 0);
            var tick = new THREE.Mesh(
                new THREE.BoxGeometry((long ? 0.018 : 0.01) * k, (long ? 0.045 : 0.025) * k, 0.008 * k),
                mt.black
            );
            var rr = (long ? 0.195 : 0.205) * k;
            tick.position.set(Math.cos(ang) * rr, Math.sin(ang) * rr, 0.1 * k);
            tick.rotation.z = ang + Math.PI / 2;
            g.add(tick);
        }
        cylZ(g, 0.025 * k, 0.025 * k, 0.03 * k, 0, 0, 0.1 * k, mt.black, 12);
        var needleG = new THREE.Group();
        needleG.position.z = 0.11 * k;
        g.add(needleG);
        var needle = new THREE.Mesh(new THREE.BoxGeometry(0.02 * k, 0.2 * k, 0.012 * k), mt.red);
        needle.position.y = 0.08 * k;
        needleG.add(needle);
        return needleG;
    }

    function materiales() {
        return {
            frame: M(0x7a828c, 0.55, 0.38),
            frameDark: M(0x5c6570, 0.6, 0.35),
            frameLight: M(0x9aa3ad, 0.5, 0.4),
            chrome: M(0xd0d5dc, 0.92, 0.18),
            chromeDark: M(0xa8b0ba, 0.88, 0.22),
            blue: M(0x3B82F6, 0.4, 0.42),
            blueDeep: M(0x2563EB, 0.45, 0.4),
            plate: M(0xb8c0c8, 0.7, 0.28),
            soil: M(0xd2b48c, 0.0, 0.55),
            soilDark: M(0xb8946a, 0.0, 0.6),
            black: M(0x2a2e33, 0.3, 0.55),
            white: M(0xf1f5f9, 0.1, 0.7),
            red: M(0xF87171, 0.2, 0.45),
            green: M(0x22C55E, 0.15, 0.5),
            yellow: M(0xFBBF24, 0.15, 0.5),
            accent: M(0x2DD4BF, 0.3, 0.4),
            brass: M(0xc9a860, 0.8, 0.32),
            stone: M(0x9aa0a6, 0.05, 0.9),
            hose: M(0x334155, 0.2, 0.6)
        };
    }

    /* ================================================================== */
    /*  MÁQUINA 1 · APARATO DE CORTE DIRECTO                               */
    /* ================================================================== */
    function buildCorte(accent) {
        var root = new THREE.Group();
        var mt = materiales();
        var steel = glass(0xC8D3E0, 0.36);
        var acrylic = glass(0x93C5FD, 0.2);
        var water = glass(0x60A5FA, 0.14);

        plinth(root, 8.0, 3.2, accent);

        /* bancada */
        box(root, 6.8, 0.16, 2.4, 0, 0.08, 0, mt.frameDark);
        box(root, 6.6, 0.06, 2.2, 0, 0.19, 0, mt.frame);
        [[-3.1, -1.0], [3.1, -1.0], [-3.1, 1.0], [3.1, 1.0]].forEach(function (p) {
            box(root, 0.22, 0.04, 0.22, p[0], 0.02, p[1], mt.black);
        });

        /* rieles del carro */
        [-0.72, 0.72].forEach(function (z) {
            cylX(root, 0.05, 0.05, 3.7, 0, 0.28, z, mt.chrome, 16);
            box(root, 0.16, 0.14, 0.3, -1.85, 0.27, z, mt.frameDark);
            box(root, 0.16, 0.14, 0.3, 1.85, 0.27, z, mt.frameDark);
        });

        /* ---- carro móvil (tanque + mitad inferior) ---- */
        var carr = new THREE.Group();
        root.add(carr);
        box(carr, 2.2, 0.1, 1.7, 0, 0.40, 0, mt.frameLight);
        box(carr, 2.2, 0.3, 0.04, 0, 0.60, 0.83, acrylic);
        box(carr, 2.2, 0.3, 0.04, 0, 0.60, -0.83, acrylic);
        box(carr, 0.04, 0.3, 1.7, 1.08, 0.60, 0, acrylic);
        box(carr, 0.04, 0.3, 1.7, -1.08, 0.60, 0, acrylic);
        box(carr, 2.1, 0.2, 1.62, 0, 0.55, 0, water);
        box(carr, 0.9, 0.32, 0.9, 0, 0.61, 0, mt.soilDark);                /* suelo inferior */
        box(carr, 1.0, 0.32, 0.05, 0, 0.61, 0.475, steel);                 /* caja inferior */
        box(carr, 1.0, 0.32, 0.05, 0, 0.61, -0.475, steel);
        box(carr, 0.05, 0.32, 1.0, 0.475, 0.61, 0, steel);
        box(carr, 0.05, 0.32, 1.0, -0.475, 0.61, 0, steel);
        box(carr, 0.9, 0.03, 0.9, 0, 0.785, 0, mt.stone);                  /* placa ranurada inferior */

        /* ---- mitad superior (fija) ---- */
        var upper = new THREE.Group();
        root.add(upper);
        box(upper, 0.9, 0.03, 0.9, 0, 0.815, 0, mt.stone);
        box(upper, 0.9, 0.32, 0.9, 0, 0.99, 0, mt.soil);                   /* suelo superior */
        box(upper, 1.0, 0.32, 0.05, 0, 0.99, 0.475, steel);
        box(upper, 1.0, 0.32, 0.05, 0, 0.99, -0.475, steel);
        box(upper, 0.05, 0.32, 1.0, 0.475, 0.99, 0, steel);
        box(upper, 0.05, 0.32, 1.0, -0.475, 0.99, 0, steel);
        box(upper, 0.9, 0.04, 0.9, 0, 1.17, 0, mt.chrome);                 /* cabezal de carga */
        add(upper, new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), mt.chromeDark), 0, 1.22, 0);
        box(upper, 0.14, 0.2, 0.4, 0.55, 0.99, 0, mt.frameDark);           /* mordaza de restricción */

        /* plano de corte resaltado */
        var planeMat = new THREE.MeshBasicMaterial({
            color: new THREE.Color(0xF87171), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
        });
        var plane = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.012, 1.02), planeMat);
        plane.position.set(0, 0.80, 0);
        root.add(plane);

        /* ---- carga normal: pórtico, vástago, colgador y pesas ---- */
        [-1.0, 1.0].forEach(function (z) {
            cyl(root, 0.07, 0.07, 2.2, 0, 1.35, z, mt.chromeDark, 16);
            box(root, 0.3, 0.06, 0.3, 0, 0.25, z, mt.frameDark);
        });
        box(root, 0.24, 0.22, 2.2, 0, 2.42, 0, mt.frame);
        cyl(root, 0.14, 0.14, 0.3, 0, 2.42, 0, mt.chromeDark, 20);

        var loadG = new THREE.Group();
        root.add(loadG);
        cyl(loadG, 0.05, 0.05, 1.55, 0, 2.06, 0, mt.chrome, 14);
        cyl(loadG, 0.38, 0.38, 0.05, 0, 2.82, 0, mt.plate, 36);
        var weights = [];
        for (var k = 0; k < 4; k++) {
            var w = cyl(loadG, 0.32, 0.32, 0.1, 0, 2.9 + k * 0.11, 0, k % 2 ? mt.black : mt.frameDark, 32);
            cyl(loadG, 0.325, 0.325, 0.014, 0, 2.9 + k * 0.11 + 0.03, 0, mt.accent, 32);
            weights.push(w);
        }
        /* los discos de acento siguen al peso: guardamos pares */
        var accentDiscs = loadG.children.filter(function (c) {
            return c.geometry && c.geometry.parameters && c.geometry.parameters.height === 0.014;
        });
        /* brazo y vástago del deformímetro vertical */
        box(loadG, 0.06, 0.04, 1.0, 0, 1.45, 0.5, mt.frameDark);
        box(loadG, 0.4, 0.04, 0.06, 0.2, 1.45, 1.0, mt.frameDark);
        cyl(loadG, 0.025, 0.025, 0.5, 0.35, 1.68, 1.0, mt.chrome, 10);
        box(root, 0.4, 0.05, 0.06, 0.18, 1.9, 1.0, mt.frameDark);
        var dialV = makeDial(root, 0.35, 1.9, 1.04, 0.2, mt);

        /* ---- restricción horizontal + anillo dinamométrico ---- */
        var pushRod = rodX(root, 0.05, 0, 0.99, 0, mt.chrome);
        setRodX(pushRod, 0.62, 2.05);
        var ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.055, 14, 40), mt.blue);
        ring.position.set(2.35, 0.99, 0);
        ring.castShadow = true;
        root.add(ring);
        var rodR = rodX(root, 0.05, 0, 0.99, 0, mt.chrome);
        setRodX(rodR, 2.62, 2.95);
        box(root, 0.4, 1.7, 0.9, 3.15, 1.04, 0, mt.frame);
        box(root, 0.42, 0.06, 0.92, 3.15, 1.92, 0, mt.frameLight);
        var dialRing = makeDial(root, 2.35, 0.99, 0.1, 0.13, mt);

        /* ---- motor, reductor y tornillo de avance ---- */
        box(root, 0.9, 0.8, 0.9, -2.6, 0.62, 0, mt.blue);
        box(root, 0.5, 0.1, 0.02, -2.6, 0.85, 0.46, mt.white);
        box(root, 0.5, 0.12, 0.92, -2.6, 1.08, 0, mt.blueDeep);
        cylX(root, 0.26, 0.26, 0.7, -3.3, 0.62, 0, mt.frameDark, 24);
        cylX(root, 0.28, 0.28, 0.08, -3.68, 0.62, 0, mt.black, 24);
        var drive = rodX(root, 0.05, 0, 0.40, 0, mt.chromeDark);

        /* ---- deformímetro horizontal (δh) ---- */
        cyl(root, 0.04, 0.04, 0.56, 2.0, 0.5, 0.5, mt.chromeDark, 10);
        box(root, 0.08, 0.08, 0.12, 2.0, 0.62, 0.53, mt.frameDark);
        var dialH = makeDial(root, 2.0, 0.62, 0.62, 0.2, mt);
        var plungerH = rodX(root, 0.025, 0, 0.62, 0.6, mt.chrome);

        var pins = [
            { v: [-0.5, 1.15, 0.5] },
            { v: [-0.6, 0.5, 0.65] },
            { v: [0.62, 0.8, 0.5] },
            { v: [0, 3.2, 0] },
            { v: [2.35, 1.4, 0] },
            { v: [-3.0, 1.2, 0] },
            { v: [2.0, 0.95, 0.62] },
            { v: [0.35, 2.2, 1.04] }
        ];

        function set(p, prm) {
            var load = ease(seg(p, 0, 0.18));
            var nW = 1 + Math.floor(3 * seg(p, 0, 0.18) + 1e-6);
            weights.forEach(function (w, i) { w.visible = i < nW; });
            accentDiscs.forEach(function (a, i) { a.visible = i < nW; });

            var shear = seg(p, 0.30, 0.95);
            var dhmm = shear * 8;
            var x = dhmm / 3.5;
            var tau;
            if (p < 0.30) tau = 0;
            else if (x <= 1) tau = prm.tauP * (2 * x - x * x);
            else tau = prm.tauP * (1 - 0.10 * (1 - Math.exp(-(x - 1) * 2.2)));
            var cons = ease(seg(p, 0.05, 0.30)) * 0.35;
            var dvmm = cons + (p >= 0.30 ? 0.25 * x * (1 - 0.55 * x) : 0);

            var d = dhmm * 0.045;
            carr.position.x = d;
            setRodX(drive, -2.15, -1.1 + d);
            setRodX(plungerH, 1.12 + d, 1.82);
            dialH.rotation.z = -dhmm * 0.7;

            var dvVis = -dvmm * 0.05;
            upper.position.y = dvVis;
            loadG.position.y = dvVis;
            dialV.rotation.z = -dvmm * 1.4;

            ring.scale.x = 1 - 0.1 * clamp(tau / Math.max(1, prm.tauP), 0, 1);
            dialRing.rotation.z = -(tau / Math.max(1, prm.tauP)) * 4.2;

            var pa = ease(seg(p, 0.30, 0.5));
            planeMat.opacity = 0.8 * pa;
            plane.position.x = 0;

            var ph = p < 0.18 ? 0 : p < 0.30 ? 1 : p < 0.95 ? 2 : 3;
            return {
                hud: [
                    { k: 'σn', v: fmt(prm.sn * load, 0), u: 'kPa' },
                    { k: 'τ', v: fmt(tau, 1), u: 'kPa' },
                    { k: 'δh', v: fmt(dhmm, 2), u: 'mm' },
                    { k: 'δv', v: fmt(dvmm, 3), u: 'mm' }
                ],
                phase: ph
            };
        }

        return { root: root, pins: pins, set: set };
    }

    /* ================================================================== */
    /*  MÁQUINA 2 · PRENSA DE COMPRESIÓN INCONFINADA                       */
    /* ================================================================== */
    function buildPrensa(accent) {
        var root = new THREE.Group();
        var mt = materiales();
        plinth(root, 3.8, 2.7, accent);

        /* materiales del equipo (según la máquina de referencia) */
        var mint = M(0xa9bfba, 0.35, 0.42);
        var mintDark = M(0x8fa7a2, 0.4, 0.45);
        var steelL = M(0xc9d2d9, 0.82, 0.26);
        var steelM = M(0xaab5be, 0.85, 0.3);
        var steelD = M(0x7d8892, 0.8, 0.35);
        var slate = M(0x6f8fb4, 0.45, 0.4);
        var rubber = M(0x1b1f24, 0.1, 0.85);
        var bronze = M(0x9c8a6a, 0.7, 0.4);

        /* texturas procedurales (granulado de la probeta y de la piedra) */
        function speckle(base, n, lo, hi, size) {
            var c = document.createElement('canvas');
            c.width = c.height = 256;
            var g = c.getContext('2d');
            g.fillStyle = base; g.fillRect(0, 0, 256, 256);
            for (var i = 0; i < n; i++) {
                var v = Math.round(lo + Math.random() * (hi - lo));
                g.fillStyle = 'rgb(' + v + ',' + v + ',' + (v + 2) + ')';
                var s = 1 + Math.random() * size;
                g.fillRect(Math.random() * 256, Math.random() * 256, s, s);
            }
            var t = new THREE.CanvasTexture(c);
            t.wrapS = t.wrapT = THREE.RepeatWrapping;
            return t;
        }
        var texSoil = speckle('#8a8d90', 5200, 55, 205, 3.2);
        texSoil.repeat.set(2, 1);
        var texStone = speckle('#9a9da0', 3400, 70, 190, 2.6);
        texStone.repeat.set(2, 2);
        var soilMat = new THREE.MeshStandardMaterial({ map: texSoil, color: 0xffffff, metalness: 0.0, roughness: 0.95 });
        var stoneMat = new THREE.MeshStandardMaterial({ map: texStone, color: 0xffffff, metalness: 0.0, roughness: 0.95 });

        /* ---- carcasa con frente inclinado ---- */
        box(root, 3.2, 0.05, 2.2, 0, 0.025, 0, steelM);                          /* bandeja inferior */
        [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]].forEach(function (p) {
            cyl(root, 0.11, 0.13, 0.1, p[0], 0.0, p[1], rubber, 20);
        });
        var sh = new THREE.Shape();
        sh.moveTo(-0.95, 0); sh.lineTo(0.95, 0); sh.lineTo(0.95, 0.26); sh.lineTo(0.55, 0.8); sh.lineTo(-0.95, 0.8);
        sh.closePath();
        var hg = new THREE.ExtrudeGeometry(sh, { depth: 2.9, bevelEnabled: false });
        hg.rotateY(-Math.PI / 2);
        hg.translate(1.45, 0.05, 0);
        var housing = new THREE.Mesh(hg, mint);
        housing.castShadow = true; housing.receiveShadow = true;
        root.add(housing);
        box(root, 2.9, 0.03, 1.55, 0, 0.865, -0.17, mintDark);                    /* tapa superior */

        /* ---- panel de control (textura dibujada) ---- */
        var pc = document.createElement('canvas');
        pc.width = 1040; pc.height = 252;
        var pg = pc.getContext('2d');
        var panelTex = new THREE.CanvasTexture(pc);
        var lastPanel = '';
        function drawPanel(P, epsPct) {
            var key = Math.round(P) + '|' + Math.round(epsPct * 10);
            if (key === lastPanel) return;
            lastPanel = key;
            pg.clearRect(0, 0, 1040, 252);
            var gr = pg.createLinearGradient(0, 0, 0, 252);
            gr.addColorStop(0, '#e9eff1'); gr.addColorStop(1, '#bcc7cc');
            pg.fillStyle = gr; pg.fillRect(0, 0, 1040, 252);
            pg.strokeStyle = '#6c7780'; pg.lineWidth = 6; pg.strokeRect(4, 4, 1032, 244);
            function meter(x, ang) {
                pg.fillStyle = '#16191d'; pg.fillRect(x, 36, 150, 150);
                pg.fillStyle = '#f2f4f5'; pg.beginPath(); pg.arc(x + 75, 150, 58, Math.PI * 1.1, Math.PI * 1.9); pg.lineTo(x + 75, 150); pg.fill();
                pg.strokeStyle = '#c0392b'; pg.lineWidth = 5; pg.beginPath(); pg.moveTo(x + 75, 150);
                pg.lineTo(x + 75 + Math.cos(ang) * 54, 150 + Math.sin(ang) * 54); pg.stroke();
            }
            var frac = Math.min(1, P / 400), fe = Math.min(1, epsPct / 20);
            meter(40, Math.PI * (1.15 + 0.7 * frac));
            meter(220, Math.PI * (1.15 + 0.7 * fe));
            pg.fillStyle = '#9fd36a'; pg.fillRect(430, 40, 190, 70);
            pg.strokeStyle = '#3a4a2a'; pg.lineWidth = 5; pg.strokeRect(430, 40, 190, 70);
            pg.fillStyle = '#233016'; pg.font = 'bold 40px monospace'; pg.textAlign = 'right';
            pg.fillText(Math.round(P) + ' N', 608, 91);
            [470, 580].forEach(function (bx) {
                pg.fillStyle = '#0e5c26'; pg.beginPath(); pg.arc(bx, 160, 26, 0, 6.3); pg.fill();
                pg.fillStyle = '#26b64d'; pg.beginPath(); pg.arc(bx, 160, 20, 0, 6.3); pg.fill();
            });
            pg.fillStyle = '#34414b'; pg.font = 'bold 20px sans-serif'; pg.textAlign = 'center';
            pg.fillText('START', 470, 218); pg.fillText('STOP', 580, 218);
            [[775, 'CARGA', frac], [925, 'ΔL', fe]].forEach(function (d) {
                pg.fillStyle = '#8c969e'; pg.beginPath(); pg.arc(d[0], 118, 66, 0, 6.3); pg.fill();
                pg.fillStyle = '#fafafa'; pg.beginPath(); pg.arc(d[0], 118, 57, 0, 6.3); pg.fill();
                var a = Math.PI * (0.8 + 1.4 * d[2]);
                pg.strokeStyle = '#c0392b'; pg.lineWidth = 5; pg.beginPath(); pg.moveTo(d[0], 118); pg.lineTo(d[0] + Math.cos(a) * 46, 118 + Math.sin(a) * 46); pg.stroke();
                pg.fillStyle = '#34414b'; pg.font = 'bold 20px sans-serif'; pg.fillText(d[1], d[0], 218);
            });
            panelTex.needsUpdate = true;
        }
        drawPanel(0, 0);
        var panel = new THREE.Group();
        var slope = Math.atan2(0.54, 0.4);                 /* inclinación del frente */
        panel.position.set(0, 0.585, 0.755);
        panel.rotation.x = -(Math.PI / 2 - slope) ;
        root.add(panel);
        var face = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.63), new THREE.MeshStandardMaterial({ map: panelTex, metalness: 0.2, roughness: 0.5 }));
        face.position.z = 0.012;
        panel.add(face);

        /* ---- bancada y plato inferior ---- */
        [[-0.95, -0.55], [0.95, -0.55], [-0.95, 0.55], [0.95, 0.55]].forEach(function (p) {
            cyl(root, 0.05, 0.05, 0.12, p[0], 0.92, p[1], steelD, 12);
        });
        box(root, 2.3, 0.08, 1.7, 0, 1.0, 0, steelL);
        var knob = cyl(root, 0.075, 0.075, 0.1, 0.55, 0.93, 0.92, M(0xd9482b, 0.2, 0.45), 20);
        knob.rotation.x = Math.PI / 2;
        var lower = new THREE.Group();                        /* plato móvil: disco + vástago */
        root.add(lower);
        var disc = cyl(lower, 0.62, 0.62, 0.09, 0, 1.095, 0, stoneMat, 48);
        cyl(lower, 0.2, 0.2, 0.2, 0, 1.24, 0, steelM, 32);
        cyl(lower, 0.27, 0.27, 0.04, 0, 1.36, 0, steelL, 32);

        /* ---- probeta ---- */
        var HS = 1.3, RS = 0.4, topY = 2.7;                    /* altura inicial, radio, cara superior */
        var spec = new THREE.Group();
        var body = new THREE.Mesh(new THREE.CylinderGeometry(RS, RS, HS, 56), soilMat);
        body.castShadow = true; body.receiveShadow = true;
        spec.add(body);
        var lbl = document.createElement('canvas'); lbl.width = 128; lbl.height = 72;
        var lg = lbl.getContext('2d');
        lg.fillStyle = '#f7f7f4'; lg.fillRect(0, 0, 128, 72);
        lg.fillStyle = '#444'; lg.font = 'bold 14px sans-serif'; lg.fillText('M-01', 8, 20);
        lg.fillStyle = '#888'; for (var li = 0; li < 4; li++) lg.fillRect(8, 30 + li * 9, 90 - li * 12, 3);
        var label = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.17), new THREE.MeshStandardMaterial({ map: new THREE.CanvasTexture(lbl), roughness: 0.8 }));
        label.position.set(0, 0.12, RS + 0.004);
        spec.add(label);
        var crackG = new THREE.Group();
        var ang = 0.96;                                        /* ≈ 55° respecto a la horizontal */
        var crackMat = new THREE.MeshBasicMaterial({ color: 0x1b1210, transparent: true, opacity: 0, side: THREE.DoubleSide });
        var crack = new THREE.Mesh(new THREE.RingGeometry(RS - 0.012, RS + 0.012, 72), crackMat);
        crack.scale.set(1 / Math.cos(ang), 1, 1);
        crack.rotation.x = -Math.PI / 2;
        crackG.add(crack);
        crackG.rotation.z = ang;
        spec.add(crackG);
        root.add(spec);

        /* cabezal superior (fijo): anillo, vástago y collar */
        var ring = cyl(root, 0.27, 0.27, 0.06, 0, topY + 0.03, 0, bronze, 40);
        cyl(root, 0.17, 0.17, 0.32, 0, topY + 0.22, 0, steelM, 32);
        cyl(root, 0.24, 0.24, 0.16, 0, topY + 0.46, 0, steelD, 32);

        /* ---- bastidor de acero ---- */
        box(root, 0.2, 2.72, 0.2, -1.05, 2.2, 0.5, steelM);                 /* poste cuadrado delantero izq. */
        box(root, 0.2, 0.34, 0.2, -1.05, 3.72, 0.5, steelL);                /* bloque superior (celda lateral) */
        var colXZ = [[1.05, 0.5], [-1.05, -0.5], [1.05, -0.5]];
        colXZ.forEach(function (p) {
            cyl(root, 0.075, 0.075, 3.0, p[0], 2.38, p[1], steelL, 24);
            cyl(root, 0.1, 0.1, 0.1, p[0], 0.99, p[1], steelD, 20);
        });
        box(root, 2.9, 0.34, 1.5, 0, 3.33, 0, steelM);                      /* travesaño */
        box(root, 2.7, 0.03, 1.3, 0, 3.515, 0, steelL);
        var warn = box(root, 0.3, 0.004, 0.18, -0.55, 3.535, 0.25, M(0xf2c230, 0.1, 0.5));
        warn.rotation.y = 0.35;
        cyl(root, 0.36, 0.36, 0.22, 0, 3.66, 0, slate, 40);                 /* celda de carga */
        cyl(root, 0.25, 0.25, 0.3, 0, 3.88, 0, steelL, 40);
        cyl(root, 0.1, 0.1, 0.08, 0, 4.07, 0, steelM, 20);

        /* ---- reloj comparador (derecha) ---- */
        box(root, 0.34, 0.32, 0.34, 1.32, 1.02, -0.05, slate);
        cyl(root, 0.045, 0.045, 0.7, 1.32, 1.5, -0.05, steelL, 14);
        cyl(root, 0.07, 0.07, 0.12, 1.32, 1.85, -0.05, steelD, 14);
        var dialN = makeDial(root, 1.32, 2.12, -0.05, 0.3, mt);

        /* ---- sensor de carga (izquierda) y cable ---- */
        cyl(root, 0.19, 0.19, 0.2, -1.28, 0.99, -0.38, slate, 28);
        cyl(root, 0.1, 0.1, 0.07, -1.28, 1.13, -0.38, steelM, 20);
        var cable = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.018, 8, 24, Math.PI * 1.1), rubber);
        cable.position.set(-1.0, 1.0, -0.38); cable.rotation.set(Math.PI / 2, 0, 0.3);
        root.add(cable);

        var pins = [
            { v: [-1.05, 3.15, 0.5] },
            { v: [0, 4.15, 0] },
            { v: [0, 2.2, 0.42] },
            { v: [0, 1.1, 0.62] },
            { v: [1.32, 2.4, -0.05] },
            { v: [-0.9, 0.62, 1.0] }
        ];

        function set(p, prm) {
            var s0 = 0.08, sf = 0.65;
            var eps, sig, x;
            if (p < s0) { eps = 0; }
            else if (p < sf) { eps = prm.epsf * (p - s0) / (sf - s0); }
            else { eps = prm.epsf + (p - sf) / (1 - sf) * prm.epsf * 0.4; }
            x = eps / prm.epsf;
            if (x <= 1) sig = prm.qu * (2 * x - x * x);
            else sig = prm.qu * (1 - 0.18 * (1 - Math.exp(-(x - 1) * 5)));

            var sR = clamp(prm.dmm / 38, 0.8, 1.25), sH = clamp(prm.L0 / 76, 0.85, 1.1);
            var e = Math.min(0.32, eps / 100 * 1.7);                /* acortamiento (exagerado para verlo) */
            var h = HS * sH * (1 - e);
            var lift = HS * sH * e;
            body.scale.set(1, 1, 1);
            spec.scale.set(sR * (1 + e * 0.45), (1 - e) * sH, sR * (1 + e * 0.45));
            spec.position.y = topY - h / 2;
            lower.position.y = (topY - HS * sH) - (topY - HS) + lift;   /* el plato sigue a la cara inferior */
            dialN.rotation.z = -(eps / 20) * Math.PI * 1.6;

            var fa = ease(seg(p, sf, sf + 0.08));
            crackMat.opacity = 0.92 * fa;
            var tn = Math.min(1, sig / Math.max(40, prm.qu * 1.2));
            soilMat.color.setRGB(1 - tn * 0.12, 1 - tn * 0.12, 1 - tn * 0.1);

            var A0 = Math.PI * Math.pow(prm.dmm / 1000 / 2, 2);
            var Ac = A0 / (1 - Math.min(0.5, eps / 100));
            var P = sig * 1000 * Ac;
            drawPanel(P, eps);
            var ph = p < s0 ? 0 : p < sf ? 1 : 2;
            return {
                hud: [
                    { k: 'ε', v: fmt(eps, 2), u: '%' },
                    { k: 'σ', v: fmt(sig, 1), u: 'kPa' },
                    { k: 'P', v: fmt(P, 0), u: 'N' },
                    { k: 'qu', v: p >= sf ? fmt(prm.qu, 1) : '—', u: p >= sf ? 'kPa' : '' }
                ],
                phase: ph
            };
        }

        return { root: root, pins: pins, set: set };
    }

    /* ================================================================== */
    /*  MÁQUINA 3 · CONSOLIDÓMETRO (EDÓMETRO) DE PALANCA                   */
    /* ================================================================== */
    function buildConsol(accent) {
        var root = new THREE.Group();
        var mt = materiales();
        var acrylic = glass(0x93C5FD, 0.2);
        var water = glass(0x60A5FA, 0.22);
        var brassD = M(0xc9a860, 0.8, 0.32, { side: THREE.DoubleSide });
        var OFF = -1.4;                                   /* centra la máquina en escena */
        function P(x, y, z) { return [x + OFF, y, z]; }

        plinth(root, 8.4, 3.0, accent);
        var m = new THREE.Group();
        m.position.x = OFF;
        root.add(m);

        /* bancada */
        box(m, 6.4, 0.16, 2.2, 1.5, 0.08, 0, mt.frameDark);
        box(m, 6.2, 0.06, 2.0, 1.5, 0.19, 0, mt.frame);
        [[-1.4, -0.95], [4.4, -0.95], [-1.4, 0.95], [4.4, 0.95]].forEach(function (p) {
            box(m, 0.22, 0.04, 0.22, p[0], 0.02, p[1], mt.black);
        });

        /* pedestal y celda con agua */
        cyl(m, 0.85, 0.9, 0.14, 0, 0.29, 0, mt.frameLight, 40);
        cyl(m, 0.68, 0.68, 0.04, 0, 0.38, 0, mt.plate, 40);
        var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.5, 40, 1, true), acrylic);
        tube.position.set(0, 0.65, 0);
        m.add(tube);
        cyl(m, 0.6, 0.6, 0.42, 0, 0.61, 0, water, 40).castShadow = false;
        cyl(m, 0.4, 0.4, 0.04, 0, 0.42, 0, mt.stone, 40);                   /* piedra porosa inferior */
        var ringWall = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 40, 1, true), brassD);
        ringWall.position.set(0, 0.58, 0);
        m.add(ringWall);
        cyl(m, 0.44, 0.44, 0.03, 0, 0.705, 0, mt.brass, 40);                /* reborde del anillo */
        var soil = cyl(m, 0.38, 0.38, 0.28, 0, 0.58, 0, mt.soil, 40);

        /* ---- vástago y elementos que descienden con el asentamiento ---- */
        var ram = new THREE.Group();
        m.add(ram);
        cyl(ram, 0.38, 0.38, 0.04, 0, 0.74, 0, mt.stone, 40);               /* piedra porosa superior */
        cyl(ram, 0.4, 0.4, 0.05, 0, 0.785, 0, mt.chrome, 40);               /* cabezal de carga */
        cyl(ram, 0.06, 0.06, 1.12, 0, 1.37, 0, mt.chrome, 16);
        box(ram, 0.3, 0.06, 0.26, 0, 1.96, 0, mt.chromeDark);
        /* brazo y vástago del deformímetro */
        box(ram, 0.9, 0.04, 0.06, 0.45, 1.0, 0, mt.frameDark);
        box(ram, 0.06, 0.04, 0.62, 0.85, 1.0, 0.31, mt.frameDark);
        cyl(ram, 0.025, 0.025, 0.5, 0.85, 1.27, 0.62, mt.chrome, 10);

        /* columna de pivote y brazo de carga */
        box(m, 0.34, 1.7, 0.5, 1.3, 1.04, 0, mt.frame);
        box(m, 0.5, 0.08, 0.6, 1.3, 0.23, 0, mt.frameDark);
        cylZ(m, 0.1, 0.1, 0.6, 1.3, 1.93, 0, mt.chrome, 20);
        var beamG = new THREE.Group();
        beamG.position.set(1.3, 2.0, 0);
        m.add(beamG);
        box(beamG, 4.2, 0.14, 0.2, 0.4, 0, 0, mt.blue);
        box(beamG, 4.2, 0.03, 0.22, 0.4, 0.085, 0, mt.blueDeep);
        box(beamG, 0.3, 0.2, 0.26, 0, 0, 0, mt.frameDark);
        cyl(beamG, 0.07, 0.07, 0.24, -1.6, 0.0, 0, mt.chromeDark, 14).rotation.x = Math.PI / 2;

        /* colgador con pesas (permanece vertical) */
        var hangerG = new THREE.Group();
        hangerG.position.set(2.3, -0.07, 0);
        beamG.add(hangerG);
        box(hangerG, 0.5, 0.05, 0.2, 0, 0, 0, mt.frameDark);
        [-0.1, 0.1].forEach(function (z) { cyl(hangerG, 0.02, 0.02, 0.95, 0, -0.475, z, mt.chrome, 8); });
        cyl(hangerG, 0.04, 0.04, 0.9, 0, -0.46, 0, mt.chrome, 10);
        cyl(hangerG, 0.38, 0.38, 0.05, 0, -0.95, 0, mt.plate, 36);
        var weights = [];
        for (var k = 0; k < 5; k++) {
            var wm = new THREE.Group();
            wm.position.y = -0.875 + k * 0.1;
            hangerG.add(wm);
            cyl(wm, 0.3, 0.3, 0.09, 0, 0, 0, k % 2 ? mt.black : mt.frameDark, 32);
            cyl(wm, 0.305, 0.305, 0.012, 0, 0.03, 0, mt.accent, 32);
            weights.push(wm);
        }

        /* deformímetro de asentamiento */
        cyl(m, 0.04, 0.04, 1.4, 0.85, 0.89, 0.5, mt.chromeDark, 10);
        box(m, 0.08, 0.08, 0.12, 0.85, 1.55, 0.53, mt.frameDark);
        var dialN = makeDial(m, 0.85, 1.55, 0.62, 0.2, mt);

        var pins = [
            { v: P(2.4, 2.3, 0) },
            { v: P(1.3, 2.35, 0.3) },
            { v: P(3.6, 1.25, 0.4) },
            { v: P(-0.1, 1.55, 0.12) },
            { v: P(0, 0.58, 0.62) },
            { v: P(-0.6, 0.85, 0.45) },
            { v: P(0.85, 1.9, 0.62) }
        ];

        function stepState(p, prm) {
            var n = prm.steps.length;
            if (p < 0.08) return { k: -1, f: 0, dH: 0, e: prm.e0, sig: 0, nW: 0 };
            var t = seg(p, 0.08, 0.96) * n;
            var kk = Math.min(n - 1, Math.floor(t));
            var tt = p >= 0.96 ? 1 : t - kk;
            var f = (1 - Math.exp(-5 * tt)) / (1 - Math.exp(-5));
            var prevH = kk > 0 ? prm.steps[kk - 1].dH : 0;
            var prevE = kk > 0 ? prm.steps[kk - 1].e : prm.e0;
            return {
                k: kk, f: f,
                dH: lerp(prevH, prm.steps[kk].dH, f),
                e: lerp(prevE, prm.steps[kk].e, f),
                sig: prm.steps[kk].s,
                nW: Math.min(5, kk + 1)
            };
        }

        function set(p, prm) {
            var st = stepState(p, prm);
            weights.forEach(function (w, i) { w.visible = i < st.nW; });
            var sVis = clamp((st.dH / prm.H0) * 0.28 * 3.5, 0, 0.2);
            ram.position.y = -sVis;
            soil.scale.y = (0.28 - sVis) / 0.28;
            soil.position.y = 0.44 + (0.28 - sVis) / 2;
            var th = sVis / 1.7;
            beamG.rotation.z = th;
            hangerG.rotation.z = -th;
            dialN.rotation.z = -st.dH * 1.0;

            var ph = p < 0.08 ? 0 : p < 0.96 ? 1 : 2;
            return {
                hud: [
                    { k: 'σ\'', v: st.k < 0 ? '0' : fmt(st.sig, 1), u: 'kPa' },
                    { k: 'ΔH', v: fmt(st.dH, 3), u: 'mm' },
                    { k: 'e', v: fmt(st.e, 3), u: '' },
                    { k: 'U', v: st.k < 0 ? '—' : fmt(st.f * 100, 0), u: st.k < 0 ? '' : '%' }
                ],
                phase: ph
            };
        }

        return { root: root, pins: pins, set: set, extra: 'Deformación exagerada para poder apreciarla.' };
    }

    /* ================================================================== */
    /*  MÁQUINA 4 · CÁMARA TRIAXIAL                                         */
    /* ================================================================== */
    function buildTriaxial(accent) {
        var root = new THREE.Group();
        var mt = materiales();
        var acrylic = glass(0xBFDBFE, 0.16);
        var water = glass(0x60A5FA, 0.24);
        var membrane = glass(0xE5E7EB, 0.28);

        plinth(root, 8.6, 3.4, accent);

        /* bancada y gato */
        box(root, 3.4, 0.16, 2.6, 0, 0.08, 0, mt.frameDark);
        box(root, 3.2, 0.06, 2.4, 0, 0.19, 0, mt.frame);
        cyl(root, 0.24, 0.28, 0.3, 0, 0.37, 0, mt.frameLight, 28);

        /* columnas, travesaño y celda de carga */
        [-1.45, 1.45].forEach(function (x) {
            cyl(root, 0.09, 0.09, 3.87, x, 2.12, 0, mt.chrome, 20);
            cyl(root, 0.15, 0.15, 0.1, x, 0.24, 0, mt.chromeDark, 16);
            cyl(root, 0.13, 0.13, 0.06, x, 4.08, 0, mt.chromeDark, 16);
        });
        box(root, 3.4, 0.3, 0.7, 0, 3.9, 0, mt.frame);
        box(root, 3.2, 0.06, 0.6, 0, 4.08, 0, mt.frameLight);
        cyl(root, 0.25, 0.25, 0.4, 0, 3.55, 0, mt.blue, 28);
        cyl(root, 0.18, 0.18, 0.08, 0, 3.8, 0, mt.blueDeep, 20);
        box(root, 0.3, 0.1, 0.02, 0, 3.55, 0.26, mt.white);
        cyl(root, 0.06, 0.06, 1.19, 0, 2.755, 0, mt.chrome, 16);            /* vástago fijo */

        /* ---- conjunto móvil: gato, plato y cámara ---- */
        var cellG = new THREE.Group();
        root.add(cellG);
        cyl(cellG, 0.15, 0.15, 0.5, 0, 0.36, 0, mt.chrome, 20);
        cyl(cellG, 1.0, 1.0, 0.12, 0, 0.56, 0, mt.plate, 44);
        cyl(cellG, 0.95, 0.95, 0.14, 0, 0.69, 0, mt.frameLight, 44);
        var tubeC = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 1.8, 48, 1, true), acrylic);
        tubeC.position.set(0, 1.66, 0);
        cellG.add(tubeC);
        cyl(cellG, 0.95, 0.95, 0.14, 0, 2.63, 0, mt.frameLight, 44);
        cyl(cellG, 0.14, 0.14, 0.22, 0, 2.81, 0, mt.chromeDark, 20);
        [90, 210, 330].forEach(function (deg) {
            var a = deg * Math.PI / 180;
            cyl(cellG, 0.035, 0.035, 1.9, Math.cos(a) * 0.88, 1.66, Math.sin(a) * 0.88, mt.chrome, 10);
            cyl(cellG, 0.07, 0.07, 0.05, Math.cos(a) * 0.88, 2.72, Math.sin(a) * 0.88, mt.chromeDark, 8);
        });
        var waterM = new THREE.Mesh(new THREE.CylinderGeometry(0.73, 0.73, 1.76, 48), water);
        waterM.position.set(0, 0.76, 0);
        waterM.scale.y = 0.001;
        cellG.add(waterM);
        cyl(cellG, 0.34, 0.34, 0.1, 0, 0.81, 0, mt.chrome, 28);              /* pedestal */

        /* probeta con membrana */
        var spec = new THREE.Group();
        cellG.add(spec);
        var soilM = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 1.2, 40), mt.soil);
        soilM.castShadow = true;
        spec.add(soilM);
        spec.add(new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 1.2, 40, 1, true), membrane));
        [-0.55, 0.55].forEach(function (y) {
            var o = new THREE.Mesh(new THREE.TorusGeometry(0.318, 0.02, 8, 32), mt.black);
            o.rotation.x = Math.PI / 2;
            o.position.y = y;
            spec.add(o);
        });
        var cap = cyl(cellG, 0.34, 0.34, 0.1, 0, 2.11, 0, mt.chrome, 28);   /* cabezal superior */

        /* plano de falla (45° + φ/2) */
        var pivot = new THREE.Group();
        spec.add(pivot);
        var failMat = new THREE.MeshStandardMaterial({
            color: 0xF87171, metalness: 0.1, roughness: 0.5, transparent: true, opacity: 0, side: THREE.DoubleSide
        });
        var failPlane = new THREE.Mesh(new THREE.CircleGeometry(0.33, 40), failMat);
        failPlane.rotation.x = -Math.PI / 2;
        pivot.add(failPlane);

        /* flechas de presión de confinamiento */
        var arrowMat = new THREE.MeshBasicMaterial({ color: 0xC4B5FD });
        var arrows = new THREE.Group();
        cellG.add(arrows);
        var shafts = [];
        [1.2, 1.72].forEach(function (y) {
            for (var i = 0; i < 8; i++) {
                var a = (i / 8) * Math.PI * 2;
                var ag = new THREE.Group();
                ag.position.set(Math.cos(a) * 0.37, y, Math.sin(a) * 0.37);
                ag.rotation.y = -a;
                var cone = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.12, 10), arrowMat);
                cone.rotation.z = Math.PI / 2;
                cone.position.x = 0.06;
                ag.add(cone);
                var shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.25, 8), arrowMat);
                shaft.rotation.z = Math.PI / 2;
                shaft.position.x = 0.245;
                ag.add(shaft);
                shafts.push(shaft);
                arrows.add(ag);
            }
        });

        /* ---- controlador de presión (armario) ---- */
        box(root, 1.1, 1.9, 1.0, 3.2, 0.95, 0, mt.blue);
        box(root, 1.14, 0.06, 1.04, 3.2, 1.93, 0, mt.blueDeep);
        box(root, 0.8, 0.32, 0.02, 3.2, 1.62, 0.51, mt.black);
        box(root, 0.5, 0.06, 0.02, 3.2, 1.62, 0.525, mt.green);
        var dialS3 = makeDial(root, 2.95, 1.1, 0.52, 0.17, mt);
        var dialU = makeDial(root, 3.45, 1.1, 0.52, 0.17, mt);
        cyl(root, 0.08, 0.08, 0.06, 3.2, 0.55, 0.52, mt.red, 16).rotation.x = Math.PI / 2;
        /* buretas */
        [2.95, 3.3].forEach(function (x, i) {
            cyl(root, 0.07, 0.07, 1.0, x, 2.45, 0.1, glass(0xDBEAFE, 0.35), 14).castShadow = false;
            cyl(root, 0.055, 0.055, 0.55 + i * 0.12, x, 2.2 + i * 0.06, 0.1, M(0x38BDF8, 0.1, 0.3), 14).castShadow = false;
        });
        /* manguera cámara ↔ controlador */
        var curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(2.65, 0.55, 0.2),
            new THREE.Vector3(2.1, 0.3, 0.6),
            new THREE.Vector3(1.4, 0.3, 0.8),
            new THREE.Vector3(1.0, 0.55, 0.35),
            new THREE.Vector3(0.86, 0.7, 0.0)
        ]);
        var hoseM = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.035, 8, false), mt.hose);
        hoseM.castShadow = true;
        root.add(hoseM);

        /* deformímetro axial */
        cyl(root, 0.035, 0.035, 1.0, -1.2, 0.7, 0.6, mt.chromeDark, 10);
        var dialA = makeDial(root, -1.2, 1.2, 0.7, 0.2, mt);

        var pins = [
            { v: [1.45, 3.3, 0] },
            { v: [0, 4.2, 0] },
            { v: [0.0, 3.05, 0.1] },
            { v: [0.78, 1.95, 0.5] },
            { v: [0.0, 1.2, 0.34] },
            { v: [3.2, 2.15, 0.52] },
            { v: [3.12, 3.05, 0.1] },
            { v: [-1.2, 1.55, 0.7] },
            { v: [0, 0.5, 1.02] }
        ];

        function set(p, prm) {
            var epsf = 15;
            var s3t = ease(seg(p, 0.10, 0.30));
            var s3 = prm.s3 * s3t;
            var wl = ease(seg(p, 0.0, 0.18));
            var eps, sd;
            if (p < 0.30) { eps = 0; sd = 0; }
            else if (p < 0.85) {
                eps = seg(p, 0.30, 0.85) * epsf;
                var x = eps / epsf;
                sd = prm.sdf * (2 * x - x * x);
            } else {
                var q = seg(p, 0.85, 1);
                eps = epsf + q * 3;
                sd = prm.sdf * (1 - 0.06 * (1 - Math.exp(-q * 4)));
            }
            var lift = (eps / 100) * 1.2;
            var hs = 1 - eps / 100;
            var bulge = 1 / Math.sqrt(hs);

            cellG.position.y = lift;
            spec.scale.set(bulge, hs, bulge);
            spec.position.y = 0.86 + 0.6 * hs;
            cap.position.y = 2.11 - lift;
            waterM.scale.y = Math.max(0.001, wl);
            waterM.position.y = 0.76 + 0.88 * Math.max(0.001, wl);

            arrows.visible = s3t > 0.01;
            shafts.forEach(function (s) {
                var f = 0.25 + 0.75 * s3t;
                s.scale.y = f;
                s.position.x = 0.12 + 0.125 * f;
            });

            var alpha = (45 + prm.phi / 2) * Math.PI / 180;
            pivot.rotation.z = alpha;
            failPlane.scale.x = 1 / Math.cos(alpha);
            failMat.opacity = 0.85 * ease(seg(p, 0.85, 0.93));

            dialA.rotation.z = -(eps / 20) * Math.PI * 1.6;
            dialS3.rotation.z = -s3t * 4.4;
            dialU.rotation.z = -s3t * 1.9 - (sd / Math.max(1, prm.sdf)) * 0.6;

            var ph = p < 0.30 ? 0 : p < 0.85 ? 1 : 2;
            return {
                hud: [
                    { k: 'σ₃', v: fmt(s3, 0), u: 'kPa' },
                    { k: 'σd', v: fmt(sd, 0), u: 'kPa' },
                    { k: 'σ₁', v: fmt(s3 + sd, 0), u: 'kPa' },
                    { k: 'ε', v: fmt(eps, 2), u: '%' }
                ],
                phase: ph
            };
        }

        return { root: root, pins: pins, set: set };
    }

    var BUILDERS = {
        corte: buildCorte,
        inconfinada: buildPrensa,
        consolidacion: buildConsol,
        triaxial: buildTriaxial
    };

    /* ================================================================== */
    /*  VISOR: escena, cámara orbital, etiquetas, controles                */
    /* ================================================================== */
    var instances = [];

    function plantilla(meta, tipo) {
        var partsHtml = '';
        var phasesHtml = meta.phases.map(function (f, i) {
            return '<li data-ph="' + i + '" role="button" tabindex="0" title="Ir a este paso">' +
                '<span class="lab3d-ph-n">Paso ' + (i + 1) + '</span><div><b>' +
                esc(f.t) + '</b><small>' + esc(f.d) + '</small></div></li>';
        }).join('');
        return '' +
        '<div class="lab3d" data-tipo="' + tipo + '" style="--lab-accent:' + meta.accent + '">' +
          '<div class="lab3d-stage">' +
            '<div class="lab3d-canvas" role="img" aria-label="' + esc(meta.machine) + ' en 3D" title="Arrastra: orbitar · Rueda: zoom · Ctrl+rueda: mover izq/der"></div>' +
            '<div class="lab3d-pins"></div>' +
            '<div class="lab3d-tag"><span>Máquina asignada</span><strong>' + esc(meta.machine) + '</strong></div>' +
            '<div class="lab3d-state"><i></i><b>Listo</b></div>' +
            '<div class="lab3d-views">' +
              '<button type="button" data-view="home" title="Vista general">⌂</button>' +
              '<button type="button" data-view="frontal">Frontal</button>' +
              '<button type="button" data-view="lateral">Lateral</button>' +
              '<button type="button" data-view="detalle">Detalle</button>' +
              '<button type="button" data-zoom="-1" title="Acercar" aria-label="Acercar">＋</button>' +
              '<button type="button" data-zoom="1" title="Alejar" aria-label="Alejar">－</button>' +
            '</div>' +
            '<div class="lab3d-hud"></div>' +
            '<div class="lab3d-loading"><div class="lab3d-spin"></div><span>Preparando la máquina 3D…</span></div>' +
            '<div class="lab3d-fail" hidden></div>' +
            '<div class="lab3d-controls">' +
              '<button type="button" class="lab3d-play">▶ Iniciar ensayo</button>' +
              '<button type="button" class="lab3d-reset" title="Reiniciar" aria-label="Reiniciar">↺</button>' +
              '<input type="range" class="lab3d-scrub" min="0" max="1000" value="0" aria-label="Avance del ensayo">' +
              '<span class="lab3d-pct">0 %</span>' +
              '<select class="lab3d-speed" aria-label="Velocidad">' +
                '<option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option>' +
              '</select>' +
              '<label class="lab3d-toggle"><input type="checkbox" class="lab3d-tgl" checked><span>Etiquetas</span></label>' +
            '</div>' +
          '</div>' +
          '<aside class="lab3d-info">' +
            '<div class="lab3d-info-head"><span>Ficha de la máquina</span><strong>' + esc(meta.machine) + '</strong>' +
              '<em>' + esc(meta.machineSub) + '</em><code>' + esc(meta.norma) + '</code></div>' +
            '<h5>Componentes</h5><ol class="lab3d-parts"></ol>' +
            '<h5>Paso a paso del laboratorio</h5><p class="lab3d-pasos-hint">Haz clic en un paso para saltar a esa etapa. Al iniciar el ensayo, la secuencia se recorre automáticamente.</p><ol class="lab3d-phases">' + phasesHtml + '</ol>' +
            '<p class="lab3d-note"></p>' +
          '</aside>' +
          '<div class="lab3d-footer">' +
            '<div class="lab3d-paso" aria-live="polite">' +
              '<span class="lab3d-paso-n">Paso 1 / ' + meta.phases.length + '</span>' +
              '<strong class="lab3d-paso-t">' + esc(meta.phases[0].t) + '</strong>' +
              '<small class="lab3d-paso-d">' + esc(meta.phases[0].d) + '</small>' +
            '</div>' +
            '<div class="lab3d-resultados">' +
              '<h5>Valores registrados</h5>' +
              '<div class="lab3d-res-grid"></div>' +
            '</div>' +
          '</div>' +
        '</div>';
    }

    function mount(host, tipo) {
        if (!host || !META[tipo] || !BUILDERS[tipo]) return null;
        var meta = META[tipo];
        host.innerHTML = plantilla(meta, tipo);

        var q = function (s) { return host.querySelector(s); };
        var stage = q('.lab3d-stage');
        var canvasBox = q('.lab3d-canvas');
        var pinsBox = q('.lab3d-pins');
        var hudBox = q('.lab3d-hud');
        var loading = q('.lab3d-loading');
        var failBox = q('.lab3d-fail');
        var btnPlay = q('.lab3d-play');
        var btnReset = q('.lab3d-reset');
        var scrub = q('.lab3d-scrub');
        var pctEl = q('.lab3d-pct');
        var speedSel = q('.lab3d-speed');
        var tglPins = q('.lab3d-tgl');
        var stateEl = q('.lab3d-state');
        var stateTxt = stateEl.querySelector('b');
        var partsList = q('.lab3d-parts');
        var phaseItems = host.querySelectorAll('.lab3d-phases li');
        var noteEl = q('.lab3d-note');
        var inst = {
            tipo: tipo, host: host, disposed: false, playing: false,
            p: 0, speed: 1, prm: PARAMS[tipo](), lastPhase: -2,
            renderer: null, scene: null, camera: null, machine: null,
            raf: 0, last: 0, hudEls: [], pinEls: [], pinVecs: [],
            cam: null, goal: null, ready: false, dragging: false,
            cleanups: []
        };
        instances.push(inst);

        function on(el, ev, fn, opt) {
            el.addEventListener(ev, fn, opt);
            inst.cleanups.push(function () { el.removeEventListener(ev, fn, opt); });
        }

        /* Clic en un paso → saltar a esa etapa del ensayo */
        Array.prototype.forEach.call(phaseItems, function (li) {
            on(li, 'click', function () {
                var i = parseInt(li.getAttribute('data-ph'), 10);
                var ph = meta.phases[i];
                if (!ph) return;
                inst.playing = false;
                updatePlayBtn();
                inst.p = (ph.a + ph.b) / 2;
                if (scrub) scrub.value = Math.round(inst.p * 1000);
                apply();
            });
            on(li, 'keydown', function (e) {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); li.click(); }
            });
        });

        function setNota() {
            noteEl.innerHTML = '<b>' + (inst.prm.real ? 'Datos del ensayo' : 'Modo demostración') + '</b> ' + esc(inst.prm.nota) +
                (inst.machine && inst.machine.extra ? ' <em>' + esc(inst.machine.extra) + '</em>' : '');
            noteEl.classList.toggle('is-real', !!inst.prm.real);
        }
        setNota();

        function fail(msg) {
            loading.hidden = true;
            failBox.hidden = false;
            failBox.innerHTML = '<div class="lab3d-fail-ico">🛰️</div><strong>No se pudo mostrar el visor 3D</strong><span>' + esc(msg) +
                '</span><small>Verifica tu conexión a internet (el visor carga three.js) y recarga. La ficha de la máquina sigue disponible.</small>';
            stage.classList.add('is-fail');
        }

        /* ------- aplicar progreso ------- */
        function apply() {
            if (!inst.machine) return;
            var r = inst.machine.set(inst.p, inst.prm);
            /* Fase educativa según META.phases (paso a paso del laboratorio) */
            var phIdx = 0;
            for (var pi = 0; pi < meta.phases.length; pi++) {
                if (inst.p >= meta.phases[pi].a) phIdx = pi;
            }
            r.phase = phIdx;
            for (var i = 0; i < r.hud.length; i++) {
                var h = inst.hudEls[i];
                if (!h) continue;
                h.k.textContent = r.hud[i].k;
                h.v.textContent = r.hud[i].v;
                h.u.textContent = r.hud[i].u;
            }
            /* Panel inferior: mismos valores registrados */
            var resGrid = host.querySelector('.lab3d-res-grid');
            if (resGrid) {
                var html = '';
                for (var ri = 0; ri < r.hud.length; ri++) {
                    html += '<div class="lab3d-res-tile"><span>' + esc(r.hud[ri].k) + '</span><strong>' +
                        esc(String(r.hud[ri].v)) + '</strong><small>' + esc(r.hud[ri].u || '') + '</small></div>';
                }
                resGrid.innerHTML = html;
            }
            scrub.value = String(Math.round(inst.p * 1000));
            pctEl.textContent = Math.round(inst.p * 100) + ' %';
            if (r.phase !== inst.lastPhase) {
                inst.lastPhase = r.phase;
                for (var j = 0; j < phaseItems.length; j++) {
                    phaseItems[j].classList.toggle('is-on', j === r.phase);
                    phaseItems[j].classList.toggle('is-done', j < r.phase);
                }
                var pasoEl = host.querySelector('.lab3d-paso');
                if (pasoEl && meta.phases[r.phase]) {
                    var ph = meta.phases[r.phase];
                    var nEl = pasoEl.querySelector('.lab3d-paso-n');
                    var tEl = pasoEl.querySelector('.lab3d-paso-t');
                    var dEl = pasoEl.querySelector('.lab3d-paso-d');
                    if (nEl) nEl.textContent = 'Paso ' + (r.phase + 1) + ' / ' + meta.phases.length;
                    if (tEl) tEl.textContent = ph.t;
                    if (dEl) dEl.textContent = ph.d;
                    pasoEl.classList.add('is-pulse');
                    setTimeout(function () { try { pasoEl.classList.remove('is-pulse'); } catch (e) {} }, 450);
                }
            }
            var done = inst.p >= 0.999;
            var txt = inst.p <= 0.001 ? 'Listo — inicia el ensayo para ver el paso a paso' : done ? 'Ensayo finalizado' : meta.phases[r.phase].t;
            stateTxt.textContent = txt;
            stateEl.classList.toggle('is-run', inst.playing);
            stateEl.classList.toggle('is-done', done);
        }

        function updatePlayBtn() {
            if (inst.playing) btnPlay.textContent = '⏸ Pausar';
            else if (inst.p >= 0.999) btnPlay.textContent = '↻ Repetir ensayo';
            else if (inst.p > 0.001) btnPlay.textContent = '▶ Continuar';
            else btnPlay.textContent = '▶ Iniciar ensayo';
            btnPlay.classList.toggle('is-playing', inst.playing);
        }

        function refresh() {
            if (inst.disposed) return;
            inst.prm = PARAMS[tipo]();
            setNota();
            apply();
        }

        /* ------- construir leyenda y HUD ------- */
        function buildLegend(pins) {
            partsList.innerHTML = '';
            pinsBox.innerHTML = '';
            inst.pinEls = [];
            pins.forEach(function (pn, i) {
                var li = document.createElement('li');
                li.innerHTML = '<span class="lab3d-chip">' + (i + 1) + '</span><div><b>' + esc(pn.name) + '</b><small>' + esc(pn.desc) + '</small></div>';
                partsList.appendChild(li);

                var b = document.createElement('button');
                b.type = 'button';
                b.className = 'lab3d-pin';
                b.innerHTML = '<span>' + (i + 1) + '</span><em><b>' + esc(pn.name) + '</b><small>' + esc(pn.desc) + '</small></em>';
                pinsBox.appendChild(b);
                inst.pinEls.push(b);

                function hl(on_) { b.classList.toggle('hl', on_); li.classList.toggle('hl', on_); }
                li.addEventListener('mouseenter', function () { hl(true); });
                li.addEventListener('mouseleave', function () { hl(false); });
                b.addEventListener('mouseenter', function () { hl(true); });
                b.addEventListener('mouseleave', function () { hl(false); });
                b.addEventListener('focus', function () { hl(true); });
                b.addEventListener('blur', function () { hl(false); });
                li.addEventListener('click', function () { b.classList.toggle('pin-open'); });
                b.addEventListener('click', function () { b.classList.toggle('pin-open'); });
            });
        }
        function buildHud(n) {
            hudBox.innerHTML = '';
            inst.hudEls = [];
            for (var i = 0; i < n; i++) {
                var d = document.createElement('div');
                d.innerHTML = '<span></span><strong>—</strong><small></small>';
                hudBox.appendChild(d);
                inst.hudEls.push({ k: d.children[0], v: d.children[1], u: d.children[2] });
            }
        }

        /* ------- cámara orbital ------- */
        function camPos() {
            var c = inst.cam, cam = inst.camera;
            cam.position.set(
                c.tx + c.radius * Math.sin(c.phi) * Math.sin(c.theta),
                c.ty + c.radius * Math.cos(c.phi),
                c.tz + c.radius * Math.sin(c.phi) * Math.cos(c.theta)
            );
            cam.lookAt(c.tx, c.ty, c.tz);
        }
        function goView(name) {
            var v = meta.cam[name] || meta.cam.home;
            var t = v.target || meta.cam.target;
            inst.goal.theta = v.theta; inst.goal.phi = v.phi; inst.goal.radius = v.radius;
            inst.goal.tx = t[0]; inst.goal.ty = t[1]; inst.goal.tz = t[2];
            var btns = host.querySelectorAll('.lab3d-views [data-view]');
            for (var i = 0; i < btns.length; i++) btns[i].classList.toggle('on', btns[i].getAttribute('data-view') === name);
        }

        function resize() {
            if (!inst.renderer) return;
            var w = canvasBox.clientWidth, h = canvasBox.clientHeight;
            if (w < 10 || h < 10) return;
            inst.camera.aspect = w / h;
            inst.camera.updateProjectionMatrix();
            inst.renderer.setSize(w, h);
        }

        /* ------- bucle ------- */
        var v3;
        function tick(now) {
            if (inst.disposed) return;
            inst.raf = requestAnimationFrame(tick);
            if (!host.isConnected) { dispose(); return; }
            var dt = Math.min(0.06, (now - inst.last) / 1000 || 0);
            inst.last = now;
            if (stage.offsetParent === null) return;       /* pestaña oculta → no dibujar */

            if (inst.playing) {
                inst.p += dt * inst.speed / meta.duration;
                if (inst.p >= 1) { inst.p = 1; inst.playing = false; updatePlayBtn(); }
                apply();
            }
            var c = inst.cam, g = inst.goal, k = inst.dragging ? 0.4 : 0.12;
            c.theta += (g.theta - c.theta) * k;
            c.phi += (g.phi - c.phi) * k;
            c.radius += (g.radius - c.radius) * 0.12;
            c.tx += (g.tx - c.tx) * 0.12; c.ty += (g.ty - c.ty) * 0.12; c.tz += (g.tz - c.tz) * 0.12;
            camPos();
            inst.renderer.render(inst.scene, inst.camera);

            /* etiquetas */
            if (tglPins.checked) {
                var w = canvasBox.clientWidth, h = canvasBox.clientHeight;
                for (var i = 0; i < inst.pinVecs.length; i++) {
                    v3.copy(inst.pinVecs[i]).project(inst.camera);
                    var el = inst.pinEls[i];
                    var vis = v3.z < 1 && Math.abs(v3.x) < 1.05 && Math.abs(v3.y) < 1.05;
                    el.style.display = vis ? '' : 'none';
                    if (vis) {
                        el.style.transform = 'translate(' + ((v3.x * 0.5 + 0.5) * w).toFixed(1) + 'px,' + ((-v3.y * 0.5 + 0.5) * h).toFixed(1) + 'px)';
                    }
                }
            }
        }

        /* ------- inicialización 3D ------- */
        function init() {
            if (inst.disposed) return;
            try {
                var w = Math.max(320, canvasBox.clientWidth || 640);
                var h = Math.max(300, canvasBox.clientHeight || 460);
                var scene = new THREE.Scene();
                scene.background = new THREE.Color(0x0B1220);
                scene.fog = new THREE.Fog(0x0B1220, 16, 34);
                var camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
                var renderer = new THREE.WebGLRenderer({ antialias: true });
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
                renderer.setSize(w, h);
                renderer.shadowMap.enabled = true;
                if (THREE.PCFSoftShadowMap) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
                canvasBox.innerHTML = '';
                canvasBox.appendChild(renderer.domElement);

                scene.add(new THREE.AmbientLight(0xb0c4de, 0.55));
                var key = new THREE.DirectionalLight(0xffffff, 1.1);
                key.position.set(4, 8, 5);
                key.castShadow = true;
                key.shadow.mapSize.set(1024, 1024);
                var sc = key.shadow.camera;
                sc.left = -7; sc.right = 7; sc.top = 7; sc.bottom = -7; sc.near = 0.5; sc.far = 30; sc.updateProjectionMatrix();
                scene.add(key);
                var fill = new THREE.DirectionalLight(new THREE.Color(meta.accent), 0.35);
                fill.position.set(-4, 3, -2);
                scene.add(fill);
                scene.add(new THREE.HemisphereLight(0xA7B4C8, 0x0B1220, 0.45));
                var rim = new THREE.DirectionalLight(0x2DD4BF, 0.22);
                rim.position.set(0, 3, -6);
                scene.add(rim);

                var floor = new THREE.Mesh(
                    new THREE.CircleGeometry(9, 64),
                    new THREE.MeshStandardMaterial({ color: 0x111A2B, roughness: 0.92, metalness: 0.1 })
                );
                floor.rotation.x = -Math.PI / 2;
                floor.position.y = -0.125;
                floor.receiveShadow = true;
                scene.add(floor);
                var grid = new THREE.GridHelper(18, 36, 0x2B3A50, 0x1A2538);
                grid.position.y = -0.12;
                scene.add(grid);

                var machine = BUILDERS[tipo](meta.accent);
                machine.root.traverse(function (o) { if (o.isMesh && o.material && o.material.transparent) o.castShadow = false; });
                scene.add(machine.root);
                scene.updateMatrixWorld(true);

                inst.scene = scene; inst.camera = camera; inst.renderer = renderer; inst.machine = machine;
                v3 = new THREE.Vector3();
                inst.pinVecs = machine.pins.map(function (pn) { return new THREE.Vector3(pn.v[0], pn.v[1], pn.v[2]); });
                inst.pinEls = [];
                buildLegend(meta.parts);
                buildHud(4);

                var hv = meta.cam.home, t0 = meta.cam.target;
                inst.cam = { theta: hv.theta, phi: hv.phi, radius: hv.radius * 1.25, tx: t0[0], ty: t0[1], tz: t0[2] };
                inst.goal = { theta: hv.theta, phi: hv.phi, radius: hv.radius, tx: t0[0], ty: t0[1], tz: t0[2] };
                camPos();
                goView('home');

                /* orbitar con puntero */
                var dom = renderer.domElement;
                var px = 0, py = 0;
                on(dom, 'pointerdown', function (e) {
                    inst.dragging = true; px = e.clientX; py = e.clientY;
                    stage.classList.add('is-drag');
                    try { dom.setPointerCapture(e.pointerId); } catch (err) {}
                });
                on(dom, 'pointermove', function (e) {
                    if (!inst.dragging) return;
                    inst.goal.theta -= (e.clientX - px) * 0.006;
                    inst.goal.phi = clamp(inst.goal.phi + (e.clientY - py) * 0.006, 0.35, 1.5);
                    px = e.clientX; py = e.clientY;
                    var bs = host.querySelectorAll('.lab3d-views [data-view]');
                    for (var i = 0; i < bs.length; i++) bs[i].classList.remove('on');
                });
                function endDrag() { inst.dragging = false; stage.classList.remove('is-drag'); }
                on(dom, 'pointerup', endDrag);
                on(dom, 'pointercancel', endDrag);
                on(dom, 'pointerleave', endDrag);
                on(dom, 'wheel', function (e) {
                    e.preventDefault();
                    var dy = e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
                    var dx = e.deltaMode === 1 ? e.deltaX * 33 : e.deltaX;
                    /* Ctrl + scroll (o shift + scroll horizontal): desplazar cámara izquierda/derecha */
                    if (e.ctrlKey || e.metaKey) {
                        var th = inst.goal.theta;
                        /* vector "derecha" en el plano horizontal según el ángulo orbital */
                        var rx = Math.cos(th);
                        var rz = -Math.sin(th);
                        var step = dy * 0.012 * Math.max(0.5, inst.goal.radius * 0.08);
                        inst.goal.tx = clamp(inst.goal.tx + rx * step, -8, 8);
                        inst.goal.tz = clamp(inst.goal.tz + rz * step, -8, 8);
                        /* scroll horizontal nativo (trackpad) también panea */
                        if (dx) {
                            inst.goal.tx = clamp(inst.goal.tx - Math.sin(th) * dx * 0.01, -8, 8);
                            inst.goal.tz = clamp(inst.goal.tz - Math.cos(th) * dx * 0.01, -8, 8);
                        }
                    } else if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 0) {
                        /* trackpad: gesto horizontal sin Ctrl = pan izquierda/derecha */
                        var th2 = inst.goal.theta;
                        var step2 = dx * 0.01 * Math.max(0.5, inst.goal.radius * 0.08);
                        inst.goal.tx = clamp(inst.goal.tx - Math.sin(th2) * step2, -8, 8);
                        inst.goal.tz = clamp(inst.goal.tz - Math.cos(th2) * step2, -8, 8);
                    } else {
                        /* rueda normal: zoom */
                        inst.goal.radius = clamp(inst.goal.radius * Math.exp(dy * 0.0014), 1.3, 24);
                    }
                }, { passive: false });

                if (global.ResizeObserver) {
                    var ro = new ResizeObserver(resize);
                    ro.observe(canvasBox);
                    inst.cleanups.push(function () { ro.disconnect(); });
                } else {
                    on(window, 'resize', resize);
                }

                inst.ready = true;
                loading.hidden = true;
                setNota();
                apply();
                inst.last = performance.now();
                inst.raf = requestAnimationFrame(tick);
            } catch (err) {
                console.warn('Lab3D', err);
                fail(err && err.message ? err.message : 'WebGL no disponible en este navegador.');
            }
        }

        /* ------- controles ------- */
        on(btnPlay, 'click', function () {
            if (!inst.ready) return;
            if (inst.playing) { inst.playing = false; }
            else {
                if (inst.p >= 0.999 || inst.p <= 0.001) { inst.p = 0; inst.prm = PARAMS[tipo](); setNota(); }
                inst.playing = true;
            }
            updatePlayBtn();
            apply();
        });
        on(btnReset, 'click', function () {
            if (!inst.ready) return;
            inst.playing = false; inst.p = 0; inst.prm = PARAMS[tipo](); setNota();
            updatePlayBtn(); apply();
        });
        on(scrub, 'input', function () {
            if (!inst.ready) return;
            inst.playing = false;
            inst.p = clamp(parseInt(scrub.value, 10) / 1000, 0, 1);
            updatePlayBtn(); apply();
        });
        on(speedSel, 'change', function () { inst.speed = parseFloat(speedSel.value) || 1; });
        on(tglPins, 'change', function () {
            stage.classList.toggle('pins-off', !tglPins.checked);
        });
        on(host.querySelector('.lab3d-views'), 'click', function (e) {
            var b = e.target.closest('button');
            if (!b || !inst.goal) return;
            var vname = b.getAttribute('data-view');
            var z = b.getAttribute('data-zoom');
            if (vname) goView(vname);
            else if (z) inst.goal.radius = clamp(inst.goal.radius * (parseFloat(z) > 0 ? 1.25 : 0.8), 1.3, 24);
        });

        /* al pulsar CALCULAR en el formulario, la máquina adopta los resultados */
        var shell = host.closest('.ms2-shell') || host.parentNode;
        if (shell) {
            on(shell, 'click', function (e) {
                if (e.target.closest && e.target.closest('.btn-calcular:not(.btn-guardar-datos)')) {
                    setTimeout(refresh, 120);
                }
            });
        }

        function dispose() {
            if (inst.disposed) return;
            inst.disposed = true;
            if (inst.raf) cancelAnimationFrame(inst.raf);
            inst.cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
            inst.cleanups = [];
            try {
                if (inst.scene) {
                    inst.scene.traverse(function (o) {
                        if (o.geometry) o.geometry.dispose();
                        if (o.material) {
                            (Array.isArray(o.material) ? o.material : [o.material]).forEach(function (m) { m.dispose(); });
                        }
                    });
                }
                if (inst.renderer) {
                    inst.renderer.dispose();
                    if (inst.renderer.forceContextLoss) inst.renderer.forceContextLoss();
                }
            } catch (e) {}
            var ix = instances.indexOf(inst);
            if (ix >= 0) instances.splice(ix, 1);
        }

        buildLegend(meta.parts);
        ensureThree().then(init).catch(function (e) {
            fail(e && e.message ? e.message : 'No se pudo cargar three.js');
        });

        return { dispose: dispose, refresh: refresh, instance: inst };
    }

    function disposeAll() {
        instances.slice().forEach(function (i) {
            /* cada instancia se limpia sola al desconectarse; aquí forzamos */
            i.host && (i.host.innerHTML = '');
            i.disposed = true;
            if (i.raf) cancelAnimationFrame(i.raf);
            i.cleanups.forEach(function (fn) { try { fn(); } catch (e) {} });
            try { if (i.renderer) { i.renderer.dispose(); if (i.renderer.forceContextLoss) i.renderer.forceContextLoss(); } } catch (e) {}
        });
        instances.length = 0;
    }

    /* Permite que otros archivos (lab3d-ms1.js, lab3d-rm.js) añadan máquinas al mismo visor */
    function register(tipo, def) {
        META[tipo] = def.meta; PARAMS[tipo] = def.params; BUILDERS[tipo] = def.build;
    }

    global.GeoLab3D = {
        mount: mount,
        disposeAll: disposeAll,
        register: register,
        meta: META,
        kit: {
            M: M, glass: glass, add: add, box: box, cyl: cyl, cylX: cylX, cylZ: cylZ, rodX: rodX, setRodX: setRodX,
            plinth: plinth, makeDial: makeDial, materiales: materiales,
            clamp: clamp, lerp: lerp, ease: ease, seg: seg, fmt: fmt
        }
    };
})(window);
