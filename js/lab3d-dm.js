/**
 * GeoMetrics — Laboratorio 3D · Diseño de Mezclas (parte 1)
 * Simuladores 3D de los cuatro simuladores 2D del curso:
 *   dm_rev  · Revenimiento (cono de Abrams)
 *   dm_comp · Compresión de cilindros de concreto
 *   dm_aci  · Diseño ACI 211.1 paso a paso (1 m³ de concreto)
 *   dm_agg  · Combinación de agregados (Fuller / Bolomey)
 * Toman los valores del último simulador 2D que usó el estudiante (Mezclas.lastSimP) o valores de ejemplo.
 * Parte 2 (ensayos de laboratorio): lab3d-dm2.js. Requiere lab3d-ensayos.js y lab3d-ms1.js (L3.lib).
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D;
    if (!L3 || !L3.kit || !L3.lib || L3.__dm) return;
    L3.__dm = true;
    var K = L3.kit, L = L3.lib, M = K.M, box = K.box, cyl = K.cyl, clamp = K.clamp, lerp = K.lerp, ease = K.ease, fmt = K.fmt;
    var screen = L.screen, bench = L.bench, mats = L.mats, deform = L.deform;

    /* ------------------------- utilidades compartidas ------------------------- */
    function MZ() { return global.Mezclas || null; }
    function CC() { var m = MZ(); return m && m.C ? m.C : null; }
    function simP(id) { var m = MZ(); return (m && m.lastSimP && m.lastSimP[id]) || null; }
    function tw(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
    function sm(p, a, b) { return ease(tw(p, a, b)); }
    function mixCol(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), clamp(t, 0, 1)); }
    function seeded(seed) { var s = seed; return function () { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
    function num(v, d) { return (typeof v === 'number' && isFinite(v)) ? v : d; }
    /* valores editados por el estudiante en el panel de parámetros (lab3d-pro.js) */
    function OV(t) { return (L3.pro && L3.pro.over && L3.pro.over[t]) || {}; }
    function nOV(t) { return Object.keys(OV(t)).length; }
    function merge(base, t) { var o = OV(t), P = {}, k; for (k in base) P[k] = base[k]; for (k in o) P[k] = o[k]; return P; }
    function notaMod(t, txt) { return nOV(t) ? 'Parámetros editados por ti en el panel de configuración. ' + txt : txt; }

    /* manómetro de carátula dibujado en canvas: o = {title, unit, max, ticks, mark} */
    function drawDial(scr, frac, o) {
        var key = Math.round(frac * 400) + '|' + (o.mark == null ? '' : Math.round(o.mark * 100)) + '|' + o.title;
        scr.draw(key, function (g, W, H) {
            g.fillStyle = '#0f151e'; g.fillRect(0, 0, W, H);
            var cx = W / 2, cy = H / 2, r = W * 0.47, n = o.ticks || 10, a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, i, a;
            g.fillStyle = '#f5f7fa'; g.beginPath(); g.arc(cx, cy, r, 0, 6.2832); g.fill();
            g.strokeStyle = '#1b2430'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, r - 3, 0, 6.2832); g.stroke();
            g.font = 'bold ' + Math.round(W * 0.075) + 'px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
            for (i = 0; i <= n; i++) {
                a = a0 + (a1 - a0) * i / n;
                g.strokeStyle = '#1b2430'; g.lineWidth = i % 2 ? 2 : 3.5; g.beginPath();
                g.moveTo(cx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82); g.lineTo(cx + Math.cos(a) * r * 0.94, cy + Math.sin(a) * r * 0.94); g.stroke();
                if (i % 2 === 0) { g.fillStyle = '#1b2430'; g.fillText(String(Math.round(o.max * i / n * 10) / 10), cx + Math.cos(a) * r * 0.66, cy + Math.sin(a) * r * 0.66); }
            }
            g.fillStyle = '#1b2430'; g.font = 'bold ' + Math.round(W * 0.085) + 'px sans-serif'; g.fillText(o.title, cx, cy - r * 0.28);
            g.font = Math.round(W * 0.07) + 'px sans-serif'; g.fillStyle = '#475569'; g.fillText(o.unit, cx, cy + r * 0.36);
            if (o.mark != null) {
                a = a0 + (a1 - a0) * clamp(o.mark, 0, 1); g.fillStyle = '#dc2626'; g.beginPath();
                g.moveTo(cx + Math.cos(a) * r * 0.99, cy + Math.sin(a) * r * 0.99);
                g.lineTo(cx + Math.cos(a - 0.07) * r * 0.86, cy + Math.sin(a - 0.07) * r * 0.86);
                g.lineTo(cx + Math.cos(a + 0.07) * r * 0.86, cy + Math.sin(a + 0.07) * r * 0.86); g.closePath(); g.fill();
            }
            a = a0 + (a1 - a0) * clamp(frac, 0, 1);
            g.strokeStyle = '#dc2626'; g.lineWidth = 5; g.lineCap = 'round'; g.beginPath(); g.moveTo(cx - Math.cos(a) * r * 0.14, cy - Math.sin(a) * r * 0.14); g.lineTo(cx + Math.cos(a) * r * 0.8, cy + Math.sin(a) * r * 0.8); g.stroke();
            g.fillStyle = '#1b2430'; g.beginPath(); g.arc(cx, cy, r * 0.07, 0, 6.2832); g.fill();
        });
    }
    /* segmento orientado entre dos puntos (chorros, canaletas) — cilindro unitario escalado */
    function lineStream(parent, color, rad) {
        var m = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 10), new THREE.MeshStandardMaterial({ color: color, roughness: 0.6, transparent: true, opacity: 0.92 }));
        m.userData.rad = rad || 0.05; m.visible = false; parent.add(m); return m;
    }
    var UP = null;
    function setLine(m, ax, ay, az, bx, by, bz, on, rad) {
        var dx = bx - ax, dy = by - ay, dz = bz - az, len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        m.visible = !!on && len > 0.02;
        if (!m.visible) return;
        var r = rad == null ? m.userData.rad : rad;
        m.scale.set(r, len, r); m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
        if (!UP) UP = new THREE.Vector3(0, 1, 0);
        m.quaternion.setFromUnitVectors(UP, new THREE.Vector3(dx / len, dy / len, dz / len));
    }
    function tank(parent, w, h, d, x, y, z, op) {
        var g = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), K.glass(0xcfe9ff, op || 0.16));
        g.position.set(x, y, z); parent.add(g);
        var e = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(w, h, d)), new THREE.LineBasicMaterial({ color: 0xbfd7ee, transparent: true, opacity: 0.55 }));
        e.position.set(x, y, z); parent.add(e);
        return g;
    }
    function heapOf(parent, r, h, color, x, y, z, mat) {
        var m = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat || M(color, 0, 0.95));
        m.scale.set(r, h, r); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m;
    }
    L3.dm = { OV: OV, nOV: nOV, merge: merge, notaMod: notaMod, drawDial: drawDial, lineStream: lineStream, setLine: setLine, tank: tank, heapOf: heapOf, simP: simP, MZ: MZ, CC: CC, tw: tw, sm: sm, mixCol: mixCol, seeded: seeded, num: num };

    var CAM_STD = function (ty, r) {
        return { target: [0, ty, 0], home: { theta: 0.6, phi: 1.16, radius: r }, frontal: { theta: 0, phi: 1.32, radius: r + 0.4 }, lateral: { theta: 1.45, phi: 1.2, radius: r - 0.2 }, detalle: { theta: 0.35, phi: 1.22, radius: r * 0.52, target: [0, ty + 0.2, 0] } };
    };

    /* ===================================================================
       1 · REVENIMIENTO — cono de Abrams (100 mm = 1 unidad)
    =================================================================== */
    function deriveRev(P) {
        var C = CC();
        P.slump = C ? C.slumpDesdeAgua(P.agua, P.tmn, false) : 100; P.ac = P.agua / P.cem; P.fc = C ? C.resistenciaPorAC(P.ac) : 30;
        P.falla = P.slump >= 200 ? 'colapso' : (P.ac > 0.75 && P.slump >= 50 ? 'cortante' : 'verdadero');
        return P;
    }
    function paramsRev() {
        var S = simP('rev'), base = S ? { agua: S.agua, cem: S.cem, tmn: S.tmn } : { agua: 205, cem: 430, tmn: 19 };
        var P = deriveRev(merge(base, 'dm_rev'));
        return { P: P, real: !!S && !nOV('dm_rev'), nota: notaMod('dm_rev', S ? 'Con tu último simulador 2D: agua ' + fmt(P.agua, 0) + ' kg/m³ · cemento ' + fmt(P.cem, 0) + ' kg/m³ · TMN ' + P.tmn + ' mm → revenimiento ' + fmt(P.slump, 0) + ' mm.' : 'Valores de ejemplo (agua 205 kg/m³, cemento 430 kg/m³, TMN 19 mm). Edítalos en el panel de parámetros.') };
    }
    function slumpProfile(s, falla, q) {
        var h = Math.max(0.7, 3 - s / 100), k = falla === 'colapso' ? 0.9 : clamp(0.5 + 0.4 * (1 - h / 3), 0.5, 0.88);
        var Rb = Math.sqrt(5.25 / (h * (1 + k + k * k)));
        return { h: h, Rb: Rb, rt: Rb * k, dx: falla === 'cortante' ? Math.min(1.1, 0.5 * s / 100) : 0, bulge: 0.07 * q };
    }
    L3.register('dm_rev', {
        meta: {
            accent: '#38BDF8', machine: 'Cono de Abrams y placa base', machineSub: 'Molde troncocónico, varilla de compactación, regla de medición y escala',
            norma: 'NTC 396 · ASTM C143', duration: 22,
            phases: [
                { a: 0.00, b: 0.34, t: 'Llenado en 3 capas', d: 'Cada capa se compacta con 25 golpes de varilla de 16 mm.' },
                { a: 0.34, b: 0.50, t: 'Levantar el cono', d: 'Se alza en vertical en 5 ± 2 s, sin torcer ni golpear la muestra.' },
                { a: 0.50, b: 0.92, t: 'El concreto se asienta', d: 'La masa pierde altura según su consistencia (agua, cemento, TMN).' },
                { a: 0.92, b: 1.01, t: 'Medición del asentamiento', d: 'Se mide desde la varilla hasta el centro desplazado de la muestra.' }
            ],
            parts: [
                { name: 'Placa base', desc: 'Superficie rígida, plana y no absorbente.' },
                { name: 'Cono de Abrams', desc: 'Molde de 300 mm de alto, Ø 200 mm abajo y Ø 100 mm arriba.' },
                { name: 'Concreto fresco', desc: 'Se coloca en 3 capas de ≈ 1/3 del volumen.' },
                { name: 'Varilla de compactación', desc: 'Ø 16 mm con punta redondeada: 25 golpes por capa.' },
                { name: 'Regla de referencia', desc: 'Se apoya sobre el borde del molde para medir.' },
                { name: 'Escala graduada', desc: 'Marcas cada 50 mm para leer la altura.' }
            ],
            cam: { target: [0, 1.9, 0], home: { theta: 0.62, phi: 1.18, radius: 9.6 }, frontal: { theta: 0, phi: 1.34, radius: 10 }, lateral: { theta: 1.45, phi: 1.22, radius: 9.4 }, detalle: { theta: 0.35, phi: 1.26, radius: 5.4, target: [0, 2.2, 0] } }
        },
        params: paramsRev,
        build: function (accent) {
            var root = new THREE.Group(), mt = mats(), y0 = 0.08;
            bench(root, 7.2, 4.4, accent);
            box(root, 3.4, 0.08, 3.4, 0, 0.04, 0, mt.steelD);
            var rule = new THREE.Group(); rule.position.set(-2.5, y0, 0); root.add(rule);
            box(rule, 0.1, 3.4, 0.03, 0, 1.7, 0, mt.white);
            for (var t = 0; t <= 6; t++) box(rule, 0.32, 0.03, 0.03, 0.12, t * 0.5, 0.0, M(0x1b2430, 0, 0.5));
            var coneG = new THREE.Group(); root.add(coneG);
            var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1, 3, 40, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9d2d9, metalness: 0.85, roughness: 0.3, transparent: true, opacity: 0.42, side: THREE.DoubleSide, depthWrite: false }));
            cone.position.y = 1.5; coneG.add(cone);
            box(coneG, 0.5, 0.05, 0.22, 1.25, 0.08, 0, mt.steelL); box(coneG, 0.5, 0.05, 0.22, -1.25, 0.08, 0, mt.steelL);
            box(coneG, 0.05, 0.05, 0.5, 0.0, 0.0, 0, mt.steelL);
            box(coneG, 0.5, 0.06, 0.06, 0.78, 2.45, 0, mt.steelD); box(coneG, 0.5, 0.06, 0.06, -0.78, 2.45, 0, mt.steelD);
            coneG.position.y = y0;
            var conMat = L.speckle('#9a8a66', 5200, 60, 170, 3, 2, 2);
            var cm = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 34, 28), conMat); cm.castShadow = true; cm.position.y = y0; root.add(cm);
            var rod = new THREE.Group(); root.add(rod); cyl(rod, 0.045, 0.045, 3.6, 0, 0, 0, mt.steelL, 12);
            var tip = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), mt.steelL); tip.position.y = -1.8; rod.add(tip);
            var bar = new THREE.Group(); root.add(bar); box(bar, 3.5, 0.07, 0.16, 0, 0, 0, mt.steelL); bar.position.set(0, y0 + 3.04, 0); bar.visible = false;
            var arrow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.06), new THREE.MeshBasicMaterial({ color: 0xef4444 })); root.add(arrow); arrow.visible = false;
            var head = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.26, 12), new THREE.MeshBasicMaterial({ color: 0xef4444 })); head.rotation.x = Math.PI; root.add(head); head.visible = false;
            var cons = new THREE.Group(); cons.position.set(2.7, 0, 0.9); root.add(cons); box(cons, 1.5, 1.1, 0.7, 0, 0.55, 0, mt.dark);
            var scr = screen(cons, 1.3, 0.62, 0, 0.62, 0.36, 320, 150);
            var pins = [{ v: [1.3, 0.2, 1.6] }, { v: [1.0, 2.6, 0] }, { v: [0, 1.2, 0] }, { v: [0.3, 3.9, 0.2] }, { v: [1.7, 3.15, 0] }, { v: [-2.5, 3.6, 0] }];
            function shapeCm(h, Rb, rt, dx, bul) {
                deform(cm, function (x, y, z) {
                    var u = y + 0.5, r = lerp(Rb, rt, u) + bul * Math.sin(Math.PI * u);
                    return [x * r + dx * u * u, u * h, z * r];
                });
            }
            function set(p, prm) {
                var P = prm.P, fp = tw(p, 0, 0.34), lift = sm(p, 0.34, 0.5), q = sm(p, 0.5, 0.92), s = P.slump * q;
                var h, Rb, rt, dx = 0, bul = 0;
                if (p < 0.34 || lift <= 0) { h = Math.max(0.02, 3 * fp); Rb = 0.985; rt = 0.985 * (1 - 0.5 * h / 3); }
                else { var sh = slumpProfile(s, P.falla, q); h = sh.h; Rb = sh.Rb; rt = sh.rt; dx = sh.dx; bul = sh.bulge; if (s < 0.5) { h = 3; Rb = 1; rt = 0.5; bul = 0; } }
                shapeCm(h, Rb, rt, dx, bul);
                cm.visible = p > 0.002;
                coneG.position.y = y0 + lift * 4.6; coneG.visible = lift < 0.999;
                rod.visible = p < 0.335 && p > 0.001;
                if (rod.visible) {
                    var osc = 0.5 + 0.5 * Math.sin(fp * 75 * 6.2832);
                    rod.position.set(0.25 * Math.sin(fp * 40), y0 + h + 1.95 - 0.5 * osc * (1 - fp * 0.0), 0.2 * Math.cos(fp * 31));
                }
                bar.visible = lift > 0.9;
                var show = lift > 0.9 && s > 0.8, topY = y0 + h, len = Math.max(0.02, (y0 + 3.0) - topY);
                arrow.visible = head.visible = show;
                if (show) { arrow.scale.y = len; arrow.position.set(dx, topY + len / 2, 0); head.position.set(dx, topY + 0.13, 0); }
                scr.draw(Math.round(s) + P.falla, function (g, W, H) {
                    g.fillStyle = '#0b1a10'; g.fillRect(0, 0, W, H); g.fillStyle = '#86efac'; g.font = 'bold 50px monospace'; g.textAlign = 'left';
                    g.fillText(fmt(s, 0) + ' mm', 14, 70); g.font = 'bold 22px sans-serif'; g.fillStyle = '#fbbf24';
                    g.fillText(p >= 0.92 ? (P.falla === 'verdadero' ? 'Asentamiento verdadero' : P.falla === 'cortante' ? 'Falla por cortante' : 'Colapso') : 'Asentamiento', 14, 112);
                });
                var C = CC(), cls = C ? C.claseAsentamiento(P.slump).split(' (')[0] : '—';
                return { hud: [{ k: 'Asentamiento', v: fmt(s, 0), u: 'mm' }, { k: 'Consistencia', v: cls, u: '' }, { k: 'a/c', v: fmt(P.ac, 2), u: '' }, { k: "f′c 28 d", v: fmt(P.fc, 0), u: 'MPa' }] };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       2 · COMPRESIÓN DE CILINDROS — prensa hidráulica
    =================================================================== */
    var LOAD_END = 0.8;
    function compState(p, P) {
        if (p <= LOAD_END) { var s = P.fc * (p / LOAD_END); return { s: s, e: P.e0 * (1 - Math.sqrt(Math.max(0, 1 - s / P.fc))), q: 0 }; }
        var q = (p - LOAD_END) / (1 - LOAD_END); return { s: P.fc * (1 - 0.85 * ease(q)), e: P.e0 + 0.0016 * q, q: q };
    }
    function deriveComp(P) {
        var C = CC(), m = C ? C.modeloCompresion(P.ac, P.edad, P.rate) : { fc: 30, e0: 0.002 }, k;
        for (k in m) P[k] = m[k];
        P.fc = num(P.fc, 30); P.e0 = num(P.e0, 0.002);
        P.A = Math.PI * P.d * P.d / 4; P.Pmax = P.fc * P.A / 1000;
        var rngs = [200, 300, 500, 750, 1000, 1500, 2000, 3000]; P.dial = rngs.filter(function (r) { return r >= P.Pmax * 1.1; })[0] || 3000;
        P.tipo = P.fc < 40 ? 'Tipo 1 · conos' : 'Tipo 4 · diagonal'; P.rateOk = Math.abs(P.rate - 0.25) <= 0.05;
        return P;
    }
    function paramsComp() {
        var S = simP('comp'), base = S ? { ac: S.ac, edad: S.edad, d: S.d, rate: S.rate } : { ac: 0.5, edad: 28, d: 150, rate: 0.25 };
        var P = deriveComp(merge(base, 'dm_comp'));
        return { P: P, real: !!S && !nOV('dm_comp'), nota: notaMod('dm_comp', S ? 'Con tu último simulador 2D: a/c ' + fmt(P.ac, 2) + ' · ' + fmt(P.edad, 0) + ' d · f′c = ' + fmt(P.fc, 1) + ' MPa.' : 'Valores de ejemplo (a/c 0.50, 28 d, cilindro Ø 150 × 300 mm). Edítalos en el panel de parámetros.') };
    }
    L3.register('dm_comp', {
        meta: {
            accent: '#A78BFA', machine: 'Prensa de compresión para cilindros', machineSub: 'Bastidor, platos de apoyo, pistón hidráulico, manómetro y consola digital',
            norma: 'NTC 673 · ASTM C39', duration: 20,
            phases: [
                { a: 0.00, b: 0.55, t: 'Carga a velocidad normada', d: 'El pistón sube a 0.25 ± 0.05 MPa/s; la carga crece de forma continua.' },
                { a: 0.55, b: 0.80, t: 'Cerca del pico', d: 'La curva se aplana: aparecen microfisuras internas.' },
                { a: 0.80, b: 0.90, t: 'Falla del cilindro', d: 'Se alcanza f′c: grietas y desprendimiento de concreto.' },
                { a: 0.90, b: 1.01, t: 'Post-pico y registro', d: 'La carga cae; se registra la carga máxima y el tipo de falla.' }
            ],
            parts: [
                { name: 'Bastidor de la prensa', desc: 'Columnas y travesaño que reaccionan la carga.' },
                { name: 'Plato superior (rótula)', desc: 'Se asienta sobre la cara superior del cilindro.' },
                { name: 'Pistón hidráulico', desc: 'Empuja el plato inferior con presión de aceite.' },
                { name: 'Cilindro de concreto', desc: 'Ø 150 × 300 mm (o Ø 100 × 200 mm), cabeceado.' },
                { name: 'Manómetro de carga', desc: 'Indica la carga aplicada en kN.' },
                { name: 'Consola digital', desc: 'Muestra P, σ y ε en tiempo real.' }
            ],
            cam: { target: [0, 2.9, 0], home: { theta: 0.55, phi: 1.12, radius: 11.2 }, frontal: { theta: 0, phi: 1.3, radius: 11.4 }, lateral: { theta: 1.4, phi: 1.2, radius: 10.8 }, detalle: { theta: 0.3, phi: 1.2, radius: 5.4, target: [0, 2.7, 0] } }
        },
        params: paramsComp,
        build: function (accent) {
            var root = new THREE.Group(), mt = mats(), violet = M(0x6d4fb8, 0.5, 0.45);
            bench(root, 7.6, 4.4, accent);
            box(root, 3.8, 0.9, 2.0, 0, 0.5, 0, violet);
            [-1.55, 1.55].forEach(function (x) { cyl(root, 0.13, 0.13, 4.6, x, 3.25, 0, mt.steelL, 20); });
            box(root, 3.7, 0.42, 1.4, 0, 5.6, 0, violet);
            cyl(root, 0.3, 0.3, 0.9, 0, 4.9, 0, mt.steelD, 24);
            cyl(root, 0.95, 0.95, 0.12, 0, 4.41, 0, mt.steelM, 36);
            var low = new THREE.Group(); root.add(low); cyl(low, 0.95, 0.95, 0.12, 0, 0, 0, mt.steelM, 36);
            var piston = cyl(root, 0.36, 0.36, 1, 0, 1.1, 0, mt.steelL, 24);
            var spMat = L.speckle('#8d9296', 5200, 70, 205, 3, 2, 1);
            var spec = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 36, 22), spMat); spec.castShadow = true; root.add(spec);
            var rnd = seeded(31), cracks = [], chunks = [], i;
            var crMat = new THREE.MeshBasicMaterial({ color: 0x1b1b1b });
            for (i = 0; i < 9; i++) { var c = new THREE.Mesh(new THREE.BoxGeometry(0.035, 1, 0.035), crMat); c.rotation.order = 'YXZ'; c.userData = { a: (i - 4) * 0.28 + (rnd() - 0.5) * 0.1, yf: 0.25 + rnd() * 0.5, t: (rnd() - 0.5) * 0.8, l: 0.9 + rnd() * 1.1 }; c.visible = false; root.add(c); cracks.push(c); }
            for (i = 0; i < 16; i++) { var ch = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.13, 0.12), spMat); ch.userData = { a: (rnd() - 0.5) * 3.0, yf: rnd(), v: 0.8 + rnd() * 1.6, s: 0.5 + rnd() }; ch.visible = false; root.add(ch); chunks.push(ch); }
            var dialS = screen(root, 0.95, 0.95, -1.15, 0.55, 1.02, 256, 256);
            var cons = new THREE.Group(); cons.position.set(-3.3, 0, 0.5); root.add(cons); box(cons, 1.4, 1.7, 0.8, 0, 0.85, 0, mt.dark);
            var scr = screen(cons, 1.2, 0.8, 0, 1.2, 0.41, 320, 210);
            var pins = [{ v: [1.55, 2.2, 0] }, { v: [0.95, 4.45, 0] }, { v: [0.4, 1.1, 0] }, { v: [0.78, 2.9, 0.5] }, { v: [-1.15, 1.1, 1.05] }, { v: [-3.3, 2.1, 0.9] }];
            var rs = 0;
            function set(p, prm) {
                var P = prm.P, st = compState(p, P), Hs = P.d === 100 ? 2.0 : 3.0, R = P.d / 200;
                var sh = Math.min(0.42, st.e * Hs * 40), lowTop = 4.35 - Hs + sh, hh = Hs - sh, cy = lowTop + hh / 2;
                low.position.y = lowTop - 0.06;
                piston.scale.y = Math.max(0.05, lowTop - 0.12 - 0.95); piston.position.y = 0.95 + piston.scale.y / 2;
                var bul = st.q > 0 ? 0.05 * Math.min(1, st.q * 3) : 0.012 * (st.e / P.e0);
                deform(spec, function (x, y, z) { var u = y + 0.5, r = R + bul * Math.sin(Math.PI * u); return [x * r, (u - 0.5) * hh, z * r]; });
                spec.position.y = cy;
                var cp = Math.min(1, st.q * 3.5);
                cracks.forEach(function (c) {
                    var u = c.userData; c.visible = st.q > 0 && cp > 0.02;
                    if (!c.visible) return;
                    var len = u.l * cp * (Hs / 3); c.scale.y = len; c.rotation.y = u.a; c.rotation.z = u.t;
                    c.position.set(Math.sin(u.a) * (R + 0.01), lowTop + u.yf * hh, Math.cos(u.a) * (R + 0.01));
                });
                var tq = Math.max(0, st.q - 0.18);
                chunks.forEach(function (c) {
                    var u = c.userData; c.visible = tq > 0 && tq < 0.95;
                    if (!c.visible) return;
                    var t = tq * 1.9, rr = R + u.v * t * 0.9;
                    c.position.set(Math.sin(u.a) * rr, Math.max(0.1, lowTop + u.yf * hh + 0.5 * u.v * t - 3.2 * t * t), Math.cos(u.a) * rr);
                    c.rotation.set(t * 6 * u.s, t * 4, t * 5); c.scale.setScalar(Math.max(0.01, 1 - tq));
                });
                var Pk = st.s * (P.A || Math.PI * P.d * P.d / 4) / 1000;
                drawDial(dialS, Pk / (P.dial || 600), { title: 'CARGA', unit: 'kN', max: P.dial || 600, ticks: 10 });
                scr.draw(Math.round(Pk) + '|' + Math.round(st.s * 10) + '|' + Math.round(st.e * 1e5), function (g, W, H) {
                    g.fillStyle = '#0b1a10'; g.fillRect(0, 0, W, H); g.fillStyle = '#86efac'; g.textAlign = 'left'; g.font = 'bold 36px monospace';
                    g.fillText('P ' + fmt(Pk, 0) + ' kN', 14, 58); g.fillText('σ ' + fmt(st.s, 1) + ' MPa', 14, 112); g.fillText('ε ' + fmt(st.e * 1000, 2) + ' ‰', 14, 166);
                    g.font = 'bold 22px sans-serif'; g.fillStyle = '#fbbf24'; g.fillText(P.rateOk ? '0.25 MPa/s ✓' : fmt(P.rate, 2) + ' MPa/s', 14, 198);
                });
                var ph = p < 0.55 ? 0 : p < 0.8 ? 1 : p < 0.9 ? 2 : 3;
                return { hud: [{ k: 'σ', v: fmt(st.s, 1), u: 'MPa' }, { k: 'P', v: fmt(Pk, 0), u: 'kN' }, { k: 'ε', v: fmt(st.e * 1000, 2), u: '‰' }, { k: 'Falla', v: p >= 0.8 ? P.tipo.split(' · ')[0] : '—', u: P.tipo.split(' · ')[1] || '' }], phase: ph };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       3 · DISEÑO ACI 211.1 — 1 m³ de concreto, paso a paso
    =================================================================== */
    var ACI_DEF = { fc: 28, slump: 100, tmn: 19, mf: 2.7, aire: 'atrapado', puc: 1600, gsC: 3.15, gsG: 2.7, gsF: 2.65 };
    var ACI_T = ['f′cr requerida', 'Agua y aire (tabla 6.3.3)', 'Relación a/c', 'Cemento', 'Grava (volumen seco compactado)', 'Arena (por volumen absoluto)', 'Proporciones finales'];
    function paramsAci() {
        var m = MZ(), S = simP('aci211'), C = CC(), src, real = false;
        if (S && S.r) { src = S; real = true; } else if (m && m.lastACI) { src = m.lastACI; real = true; } else src = ACI_DEF;
        var base = {}, k; for (k in ACI_DEF) base[k] = k === 'aire' ? (src.aire || ACI_DEF.aire) : num(src[k], ACI_DEF[k]);
        var P = merge(base, 'dm_aci');
        P.r = C ? C.disenoACI(P) : { ok: false, error: 'Módulo de cálculo no disponible.' };
        return { P: P, real: real && !nOV('dm_aci'), nota: notaMod('dm_aci', real ? 'Diseño con tus datos: f′c ' + P.fc + ' MPa · asentamiento ' + P.slump + ' mm · TMN ' + P.tmn + ' mm.' : 'Diseño de ejemplo (f′c 28 MPa, 100 mm, TMN 19 mm, MF 2.7). Edítalo en el panel de parámetros.') };
    }
    L3.register('dm_aci', {
        meta: {
            accent: '#34D399', machine: 'Tanque de 1 m³ y estaciones de dosificación', machineSub: 'Cemento, agua, grava y arena entran al volumen unitario en el orden del método ACI 211.1',
            norma: 'ACI 211.1-91 · NSR-10 Título C', duration: 28, defaultSpeed: 1,
            phases: ACI_T.map(function (t, i) {
                var d = ['Se calcula la resistencia promedio para dosificar con margen de seguridad.', 'Con asentamiento y TMN se lee el agua de mezclado y el aire atrapado.', 'La resistencia requerida define a/c (por resistencia o durabilidad).', 'Cemento = agua / (a/c).', 'Grava = volumen seco compactado (tabla 6.3.6) × PUC.', 'La arena es lo que falta para completar 1 m³ de volumen absoluto.', 'Se expresan las cantidades en proporción 1 : arena : grava y a/c.'];
                return { a: i / 7, b: (i + 1) / 7 + (i === 6 ? 0.01 : 0), t: 'Paso ' + (i + 1) + ' · ' + t, d: d[i] };
            }),
            parts: [
                { name: 'Tanque de 1 m³', desc: 'Representa el volumen unitario; las capas son volúmenes absolutos.' },
                { name: 'Tolva de cemento', desc: 'Cemento = agua / (a/c).' },
                { name: 'Tanque de agua', desc: 'Agua de mezclado según asentamiento y TMN.' },
                { name: 'Tolva de grava', desc: 'Cantidad fijada por el volumen seco compactado.' },
                { name: 'Tolva de arena', desc: 'Cierra el volumen: 1 m³ − (cemento + agua + aire + grava).' },
                { name: 'Pizarra de cálculo', desc: 'Muestra la ecuación del paso actual.' }
            ],
            cam: { target: [0, 2.9, 0], home: { theta: 0.5, phi: 1.14, radius: 15.5 }, frontal: { theta: 0, phi: 1.3, radius: 16 }, lateral: { theta: 1.4, phi: 1.18, radius: 15 }, detalle: { theta: 0.35, phi: 1.2, radius: 7.4, target: [0, 2.2, 0] } }
        },
        params: paramsAci,
        build: function (accent) {
            var root = new THREE.Group(), mt = mats(), TH = 3.6, TB = 0.15;
            bench(root, 10, 4.6, accent);
            box(root, 2.6, 0.15, 2.6, 0, 0.075, 0, mt.steelD);
            tank(root, 2.5, TH, 2.5, 0, TB + TH / 2, 0, 0.12);
            var defs = [
                { k: 'fino', c: 0xe3c586, mat: L.speckle('#b09a6a', 4200, 70, 175, 2, 2, 2) }, { k: 'grueso', c: 0x9aa5b1, mat: L.speckle('#6b727b', 2600, 40, 150, 5, 2, 2) },
                { k: 'cemento', c: 0x9ca3af, mat: M(0x9ca3af, 0, 0.9) }, { k: 'agua', c: 0x3b9eff, mat: L.waterM(0.7) }, { k: 'aire', c: 0xffffff, mat: new THREE.MeshStandardMaterial({ color: 0xe6f3ff, transparent: true, opacity: 0.28, depthWrite: false }) }
            ];
            var layers = defs.map(function (d) { var m = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1, 2.4), d.mat); m.visible = false; root.add(m); return m; });
            var bubbles = new THREE.Group(); root.add(bubbles);
            var rnd = seeded(5), bub = [], i;
            for (i = 0; i < 14; i++) { var b = new THREE.Mesh(new THREE.SphereGeometry(0.06 + rnd() * 0.05, 8, 6), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 })); b.userData = { x: (rnd() - 0.5) * 2, z: (rnd() - 0.5) * 2, p: rnd() * 6 }; b.visible = false; bubbles.add(b); bub.push(b); }
            /* estaciones */
            var ST = [
                { k: 'cemento', x: -3.9, z: 0.9, col: 0x9ca3af, step: 3 }, { k: 'fino', x: -3.9, z: -1.1, col: 0xe3c586, step: 5 },
                { k: 'agua', x: 3.9, z: 0.9, col: 0x3b9eff, step: 1 }, { k: 'grueso', x: 3.9, z: -1.1, col: 0x9aa5b1, step: 4 }
            ], streams = [];
            ST.forEach(function (s) {
                [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(function (o) { cyl(root, 0.05, 0.05, 4.2, s.x + o[0], 2.1, s.z + o[1], mt.steelD, 8); });
                var hop = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.2, 1.2, 28, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9d2d9, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })); hop.position.set(s.x, 4.8, s.z); hop.castShadow = true; root.add(hop);
                var fill = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.2, 1.0, 28), s.k === 'agua' ? L.waterM(0.8) : (s.k === 'grueso' ? defs[1].mat : s.k === 'fino' ? defs[0].mat : defs[2].mat));
                fill.position.set(s.x, 4.75, s.z); root.add(fill); s.fill = fill;
                cyl(root, 0.11, 0.11, 0.3, s.x, 4.05, s.z, mt.steelD, 12);
                s.stream = lineStream(root, s.k === 'agua' ? 0x5bb4ff : s.col, 0.07); streams.push(s.stream);
            });
            var board = new THREE.Group(); board.position.set(0, 5.75, -2.3); root.add(board);
            box(board, 5.4, 1.5, 0.1, 0, 0, 0, mt.dark);
            var bs = screen(board, 5.2, 1.34, 0, 0, 0.06, 1024, 264);
            var pins = [{ v: [1.25, 3.6, 1.25] }, { v: [-3.9, 5.5, 0.9] }, { v: [3.9, 5.5, 0.9] }, { v: [3.9, 5.5, -1.1] }, { v: [-3.9, 5.5, -1.1] }, { v: [0, 5.75, -2.1] }];
            var fmtK = function (v) { return fmt(v, 0); };
            function set(p, prm) {
                var P = prm.P, r = P.r, step = p >= 1 ? 6 : Math.floor(p * 7), within = p >= 1 ? 1 : (p * 7) % 1;
                if (!r || !r.ok) {
                    layers.forEach(function (l) { l.visible = false; }); streams.forEach(function (s) { s.visible = false; });
                    bs.draw('err' + (r ? r.error : ''), function (g, W, H) { g.fillStyle = '#0d1a2b'; g.fillRect(0, 0, W, H); g.fillStyle = '#fca5a5'; g.font = 'bold 40px sans-serif'; g.fillText('⚠ ' + ((r && r.error) || 'Sin datos'), 30, 100); });
                    return { hud: [{ k: "f′cr", v: '—', u: 'MPa' }, { k: 'a/c', v: '—', u: '' }, { k: 'Cemento', v: '—', u: 'kg/m³' }, { k: 'Proporción', v: '—', u: '' }], phase: step };
                }
                var v = r.vol, total = v.cemento + v.agua + v.aire + v.grueso + v.fino, y = TB, tops = {};
                var order = [{ k: 'fino', st: 5 }, { k: 'grueso', st: 4 }, { k: 'cemento', st: 3 }, { k: 'agua', st: 1 }, { k: 'aire', st: 1 }];
                order.forEach(function (o, idx) {
                    var hh = v[o.k] / total * TH, vis = step > o.st ? 1 : (step === o.st ? ease(within) : 0), l = layers[idx], hv = Math.max(0.001, hh * vis);
                    l.visible = vis > 0.001 && o.k !== 'aire'; l.scale.y = hv; l.position.y = y + hv / 2; tops[o.k] = y + hh * vis;
                    if (o.k === 'aire') { l.visible = vis > 0.001; }
                    y += hh;
                });
                bub.forEach(function (b, bi) {
                    var u = b.userData, vis = step >= 1 && (step > 1 || within > 0.4);
                    b.visible = vis; if (!vis) return;
                    var yy = y - (v.aire / total * TH) + ((p * 18 + u.p + bi * 0.3) % 1) * Math.max(0.2, v.aire / total * TH);
                    b.position.set(u.x * 0.95, yy, u.z * 0.95);
                });
                ST.forEach(function (s) {
                    var active = step === s.step && p < 1 && within > 0.04 && within < 0.96, vis = step > s.step ? 1 : (step === s.step ? within : 0);
                    setLine(s.stream, s.x, 4.05, s.z, 0, (tops[s.k] || 1) + 0.02, 0, active, 0.06 + 0.05 * Math.sin(p * 90) * 0.4);
                    s.fill.scale.y = 1 - 0.35 * vis; s.fill.position.y = 4.25 + 0.5 * (1 - 0.35 * vis);
                });
                var cur = Math.min(6, step), eq = [
                    "f′cr = " + fmt(r.fcr, 1) + ' MPa   (NSR-10 C.5.3.2)',
                    'Agua = ' + fmt(r.agua, 0) + ' kg/m³ · aire = ' + fmt(r.aire, 1) + ' %   (TMN ' + P.tmn + ' mm, asentamiento ' + P.slump + ' mm)',
                    'a/c = ' + fmt(r.ac, 3) + (r.controla === 'durabilidad' ? '  (controla durabilidad)' : '  (tabla 6.3.4 con f′cr)'),
                    'Cemento = ' + fmt(r.agua, 0) + ' / ' + fmt(r.ac, 3) + ' = ' + fmt(r.cemento, 0) + ' kg/m³',
                    'Grava = ' + fmt(r.vg, 2) + ' × ' + P.puc + ' = ' + fmt(r.grueso, 0) + ' kg/m³',
                    'V arena = 1 − ΣV = ' + fmt(r.vol.fino, 3) + ' m³  →  ' + fmt(r.fino, 0) + ' kg/m³',
                    'Proporción 1 : ' + fmt(r.proporcion.fino, 2) + ' : ' + fmt(r.proporcion.grueso, 2) + '   ·   a/c = ' + fmt(r.ac, 2)];
                bs.draw(cur + '|' + eq[cur], function (g, W, H) {
                    g.fillStyle = '#0d1a2b'; g.fillRect(0, 0, W, H); g.fillStyle = '#34d399'; g.font = 'bold 34px sans-serif'; g.textAlign = 'left';
                    g.fillText('Paso ' + (cur + 1) + ' / 7 · ' + ACI_T[cur], 28, 62); g.fillStyle = '#e6f3ff'; g.font = 'bold 44px monospace';
                    g.fillText(eq[cur].length > 62 ? eq[cur].slice(0, 62) : eq[cur], 28, 140);
                    if (eq[cur].length > 62) { g.font = 'bold 32px monospace'; g.fillText(eq[cur].slice(62), 28, 196); }
                    g.fillStyle = '#34d399'; for (var q = 0; q < 7; q++) { g.globalAlpha = q <= cur ? 1 : 0.25; g.fillRect(28 + q * 140, 228, 120, 8); } g.globalAlpha = 1;
                });
                return { hud: [{ k: "f′cr", v: fmt(r.fcr, 1), u: 'MPa' }, { k: 'a/c', v: fmt(r.ac, 3), u: '' }, { k: 'Cemento', v: fmtK(r.cemento), u: 'kg/m³' }, { k: 'Proporción', v: '1:' + fmt(r.proporcion.fino, 2) + ':' + fmt(r.proporcion.grueso, 2), u: '' }], phase: step };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       4 · COMBINACIÓN DE AGREGADOS — Fuller / Bolomey
    =================================================================== */
    function paramsAgg() {
        var S = simP('agg'), m = MZ(), base = S ? { ar: S.ar, gr: S.gr, obj: S.obj, f: S.f } : { ar: 'media', gr: '19', obj: 'bolomey', f: 0.45 };
        var P = merge(base, 'dm_agg'); P.f = P.f > 1 ? P.f / 100 : P.f;
        P.mo = m && m._m && m._m.aggModel ? m._m.aggModel(P) : null;
        return { P: P, real: !!S && !nOV('dm_agg'), nota: notaMod('dm_agg', S ? 'Con tu último simulador 2D: arena ' + P.ar + ', grava ' + P.gr + ' mm, curva ' + P.obj + '.' : 'Valores de ejemplo (arena media, grava 19 mm, curva de Bolomey). Edítalos en el panel de parámetros.') };
    }
    L3.register('dm_agg', {
        meta: {
            accent: '#FBBF24', machine: 'Tolvas dosificadoras y mezcladora de agregados', machineSub: 'Dos tolvas alimentan una artesa; la pizarra compara la curva combinada con la ideal',
            norma: 'Curvas de Fuller y Bolomey', duration: 24,
            phases: [
                { a: 0.00, b: 0.08, t: 'Cargar las tolvas', d: 'Arena y grava se dosifican por separado antes de mezclarse.' },
                { a: 0.08, b: 0.75, t: 'Barrido de proporciones', d: 'El % de arena sube de 20 a 80 %: la curva combinada cambia.' },
                { a: 0.75, b: 0.97, t: 'Ajuste al óptimo', d: 'La mezcla se detiene en el % que minimiza el error (RMS) frente a la curva objetivo.' },
                { a: 0.97, b: 1.01, t: 'Resultado', d: 'Se reporta el porcentaje óptimo de arena y el error de ajuste.' }
            ],
            parts: [
                { name: 'Tolva de arena', desc: 'Agregado fino, MF según la arena elegida.' },
                { name: 'Tolva de grava', desc: 'Agregado grueso con TMN de 12.5, 19 o 25 mm.' },
                { name: 'Compuertas', desc: 'La abertura es proporcional al porcentaje de cada agregado.' },
                { name: 'Artesa mezcladora', desc: 'Homogeneiza la combinación de agregados.' },
                { name: 'Pizarra granulométrica', desc: 'Compara la curva combinada con Fuller o Bolomey.' },
                { name: 'Indicador de error', desc: 'Error cuadrático medio (RMS) frente a la curva ideal.' }
            ],
            cam: CAM_STD(2.7, 13.5)
        },
        params: paramsAgg,
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 9, 4.6, accent);
            var sandM = L.speckle('#b09a6a', 4200, 70, 175, 2, 2, 2), gravM = L.speckle('#6b727b', 2600, 40, 150, 5, 2, 2);
            var HX = 3.2, hop = [];
            [-1, 1].forEach(function (sg, idx) {
                var x = sg * HX;
                [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]].forEach(function (o) { cyl(root, 0.05, 0.05, 3.9, x + o[0], 1.95, o[1], mt.steelD, 8); });
                var h = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 0.22, 1.4, 30, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9d2d9, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })); h.position.set(x, 4.55, 0); h.castShadow = true; root.add(h);
                var f = new THREE.Mesh(new THREE.CylinderGeometry(0.98, 0.2, 1.2, 30), idx === 0 ? sandM : gravM); f.position.set(x, 4.4, 0); root.add(f);
                var gate = box(root, 0.5, 0.06, 0.34, x, 3.84, 0, mt.steelD);
                hop.push({ x: x, fill: f, gate: gate, st: lineStream(root, idx === 0 ? 0xdcc08a : 0xaab4bf, 0.05) });
            });
            var pan = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.35, 0.8, 44, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9d2d9, metalness: 0.8, roughness: 0.3, side: THREE.DoubleSide })); pan.position.set(0, 0.6, 0.7); pan.castShadow = true; root.add(pan);
            cyl(root, 1.35, 1.35, 0.06, 0, 0.23, 0.7, mt.steelD, 44);
            var mixM = new THREE.MeshStandardMaterial({ color: 0xa08a5a, roughness: 1, metalness: 0 });
            var mix = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.3, 1, 36), mixM); mix.position.set(0, 0.26, 0.7); root.add(mix);
            var pad = new THREE.Group(); pad.position.set(0, 0.8, 0.7); root.add(pad);
            cyl(pad, 0.07, 0.07, 1.3, 0, 0.4, 0, mt.steelL, 10); box(pad, 2.2, 0.06, 0.12, 0, 0.05, 0, mt.steelL); box(pad, 0.12, 0.06, 1.8, 0, 0.25, 0, mt.steelL);
            var board = new THREE.Group(); board.position.set(0, 2.6, -2.2); root.add(board);
            box(board, 4.8, 3.2, 0.12, 0, 0, 0, mt.dark);
            var bs = screen(board, 4.6, 3.0, 0, 0, 0.07, 768, 500);
            var pins = [{ v: [-3.2, 4.9, 0] }, { v: [3.2, 4.9, 0] }, { v: [0, 3.5, 0] }, { v: [1.3, 0.8, 1.6] }, { v: [-2.0, 3.6, -1.9] }, { v: [2.0, 3.6, -1.9] }];
            var SIE = [37.5, 25, 19, 12.5, 9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15], cache = null;
            function chart(g, W, H, f, P, Mo, C) {
                g.fillStyle = '#0d1a2b'; g.fillRect(0, 0, W, H);
                var Lx = 70, Rx = W - 24, Ty = 52, By = H - 62, w = Rx - Lx, h = By - Ty, l0 = Math.log10(0.15), l1 = Math.log10(40);
                function X(mm) { return Lx + (Math.log10(mm) - l0) / (l1 - l0) * w; } function Y(v) { return By - v / 100 * h; }
                g.strokeStyle = 'rgba(255,255,255,0.1)'; g.lineWidth = 1; g.font = '20px sans-serif'; g.fillStyle = '#9fb3c8'; g.textAlign = 'center';
                SIE.forEach(function (mm) { g.beginPath(); g.moveTo(X(mm), Ty); g.lineTo(X(mm), By); g.stroke(); if ([37.5, 19, 9.5, 4.75, 1.18, 0.3, 0.15].indexOf(mm) >= 0) g.fillText(String(mm), X(mm), By + 24); });
                g.textAlign = 'right'; for (var v = 0; v <= 100; v += 25) { g.beginPath(); g.moveTo(Lx, Y(v)); g.lineTo(Rx, Y(v)); g.stroke(); g.fillText(String(v), Lx - 8, Y(v) + 7); }
                g.textAlign = 'center'; g.fillText('Abertura (mm)', (Lx + Rx) / 2, H - 14);
                function line(arr, col, wd, dash) { g.strokeStyle = col; g.lineWidth = wd; g.setLineDash(dash || []); g.beginPath(); SIE.forEach(function (mm, i) { var yy = Y(arr[i]); i ? g.lineTo(X(mm), yy) : g.moveTo(X(mm), yy); }); g.stroke(); g.setLineDash([]); }
                var target = SIE.map(function (mm) { return mm >= Mo.gr.D ? 100 : C.curvaObjetivo(mm, Mo.gr.D, P.obj); });
                line(Mo.ar, 'rgba(220,192,138,0.55)', 2, [6, 5]); line(Mo.gr.p, 'rgba(170,180,191,0.55)', 2, [6, 5]);
                line(target, '#34d399', 3, [10, 6]);
                var comb = C.combinar(Mo.ar, Mo.gr.p, f); line(comb, '#fbbf24', 5);
                g.textAlign = 'left'; g.font = 'bold 26px sans-serif'; g.fillStyle = '#fbbf24'; g.fillText('Combinada · ' + fmt(f * 100, 0) + ' % arena', Lx + 8, 34);
                g.fillStyle = '#34d399'; g.font = '20px sans-serif'; g.fillText('- - ' + (P.obj === 'fuller' ? 'Fuller' : 'Bolomey'), Lx + 330, 34);
                g.textAlign = 'right'; g.fillStyle = '#e6f3ff'; g.font = 'bold 22px sans-serif'; g.fillText('óptimo ' + fmt(Mo.best * 100, 1) + ' %', Rx, 34);
            }
            function set(p, prm) {
                var P = prm.P, m = MZ(), C = CC();
                if (!P.mo && m && m._m && m._m.aggModel) P.mo = m._m.aggModel(P);
                if (!P.mo || !C) {
                    bs.draw('na', function (g, W, H) { g.fillStyle = '#0d1a2b'; g.fillRect(0, 0, W, H); g.fillStyle = '#fca5a5'; g.font = 'bold 30px sans-serif'; g.fillText('Módulo de mezclas no disponible', 40, 120); });
                    return { hud: [{ k: '% arena', v: '—', u: '' }, { k: '% grava', v: '—', u: '' }, { k: 'RMS', v: '—', u: '' }, { k: 'Óptimo', v: '—', u: '' }] };
                }
                var Mo = P.mo, f = m._m.aggF(p, P, Mo);
                var fg = 1 - f;
                hop[0].fill.scale.y = 0.2 + 0.8 * f; hop[0].fill.position.y = 3.82 + 0.6 * (0.2 + 0.8 * f);
                hop[1].fill.scale.y = 0.2 + 0.8 * fg; hop[1].fill.position.y = 3.82 + 0.6 * (0.2 + 0.8 * fg);
                var run = p > 0.04;
                hop[0].gate.scale.x = 0.4 + 1.2 * f; hop[1].gate.scale.x = 0.4 + 1.2 * fg;
                setLine(hop[0].st, hop[0].x, 3.8, 0, -0.5, 1.15, 0.7, run, 0.02 + 0.07 * f);
                setLine(hop[1].st, hop[1].x, 3.8, 0, 0.5, 1.15, 0.7, run, 0.02 + 0.07 * fg);
                var lvl = 0.15 + 0.85 * Math.min(1, p / 0.35);
                mix.scale.y = 0.15 + 0.5 * lvl; mix.position.y = 0.26 + mix.scale.y / 2;
                mixM.color.copy(mixCol(0x6e7681, 0xa88f5a, f));
                pad.position.y = 0.5 + mix.scale.y; pad.rotation.y = p * 60;
                var key = Math.round(f * 400);
                bs.draw(key + P.ar + P.gr + P.obj, function (g, W, H) { chart(g, W, H, f, P, Mo, C); });
                var comb = C.combinar(Mo.ar, Mo.gr.p, f), err = C.errorCombinacion(comb, SIE, Mo.gr.D, P.obj);
                var ph = p < 0.08 ? 0 : p < 0.75 ? 1 : p < 0.97 ? 2 : 3;
                return { hud: [{ k: '% arena', v: fmt(f * 100, 0), u: '%' }, { k: '% grava', v: fmt(fg * 100, 0), u: '%' }, { k: 'Error RMS', v: fmt(err, 2), u: '' }, { k: 'Óptimo', v: fmt(Mo.best * 100, 1), u: '% arena' }], phase: ph };
            }
            return { root: root, pins: pins, set: set };
        }
    });
})(window);
