/**
 * GeoMetrics — Laboratorio 3D · Resistencia de Materiales
 * Máquinas: universal (tracción), prensa (compresión), banco de flexión, banco de torsión, durómetro Rockwell
 * Toman los valores del simulador 2D correspondiente (GeoSim2D.defs[tipo]).
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D;
    if (!L3 || !L3.kit || !L3.lib) return;
    var K = L3.kit, L = L3.lib, M = K.M, box = K.box, cyl = K.cyl, clamp = K.clamp, lerp = K.lerp, ease = K.ease, fmt = K.fmt;
    var paramsFrom = L.paramsFrom, stateOf = L.stateOf, screen = L.screen, bench = L.bench, mats = L.mats, deform = L.deform;
    function hud4(a, b, c, d) { return [a, b, c, d]; }
    function sstep(a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }

    /* ===================================================================
       1 · TRACCIÓN — máquina universal
    =================================================================== */
    L3.register('traccion', {
        meta: {
            accent: '#F87171', machine: 'Máquina universal de ensayos (UTM)', machineSub: 'Bastidor de dos columnas, celda de carga, mordazas y extensómetro',
            norma: 'ASTM E8 / E8M', duration: 22,
            phases: [
                { a: 0.00, b: 0.10, t: 'Zona elástica', d: 'σ = E·ε: la probeta se estira y recupera su longitud.' },
                { a: 0.10, b: 0.72, t: 'Fluencia y endurecimiento', d: 'Deformación plástica permanente hasta la carga máxima.' },
                { a: 0.72, b: 0.96, t: 'Estricción', d: 'El cuello se afina y la carga baja.' },
                { a: 0.96, b: 1.01, t: 'Fractura', d: 'La probeta se separa en dos mitades.' }
            ],
            parts: [
                { name: 'Bastidor con columnas', desc: 'Estructura rígida que guía el travesaño móvil.' },
                { name: 'Celda de carga', desc: 'Mide la fuerza P aplicada a la probeta.' },
                { name: 'Mordazas', desc: 'Sujetan los extremos de la probeta sin deslizamiento.' },
                { name: 'Probeta "hueso de perro"', desc: 'Sección reducida donde ocurre la deformación y la rotura.' },
                { name: 'Extensómetro', desc: 'Mide el alargamiento de la longitud calibrada L₀.' },
                { name: 'Consola de control', desc: 'Muestra P, σ y ε en tiempo real.' }
            ],
            cam: { target: [0, 2.7, 0], home: { theta: 0.55, phi: 1.12, radius: 11 }, frontal: { theta: 0, phi: 1.3, radius: 11.2 }, lateral: { theta: 1.4, phi: 1.2, radius: 10.6 }, detalle: { theta: 0.3, phi: 1.2, radius: 5.2, target: [0, 2.9, 0] } }
        },
        params: paramsFrom('traccion'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 7.4, 4.2, accent);
            var blue = M(0x4b6a93, 0.5, 0.4);
            box(root, 3.4, 0.8, 1.7, 0, 0.45, 0, blue);
            [-1.15, 1.15].forEach(function (x) { cyl(root, 0.1, 0.1, 4.25, x, 2.95, 0, mt.steelL, 20); });
            box(root, 3.0, 0.3, 1.1, 0, 4.9, 0, blue);
            cyl(root, 0.25, 0.25, 0.4, 0, 4.55, 0, mt.steelD, 24);
            var lower = new THREE.Group(); root.add(lower);
            box(lower, 2.8, 0.3, 1.0, 0, 0, 0, blue); cyl(lower, 0.3, 0.3, 0.6, 0, 0.45, 0, mt.steelD, 24);
            cyl(root, 0.3, 0.3, 0.6, 0, 4.05, 0, mt.steelD, 24);
            var steelM = M(0xb8c2cc, 0.85, 0.3), brittleM = M(0x8b929a, 0.5, 0.6);
            var geo = function () { return new THREE.CylinderGeometry(1, 1, 1, 22, 20); };
            var upper = new THREE.Mesh(geo(), steelM), lowerH = new THREE.Mesh(geo(), steelM); root.add(upper); root.add(lowerH);
            var rings = [new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 24), M(0xF87171, 0.3, 0.4)), new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.025, 8, 24), M(0xF87171, 0.3, 0.4))];
            rings.forEach(function (r) { r.rotation.x = Math.PI / 2; root.add(r); });
            var cons = new THREE.Group(); cons.position.set(-3.0, 0, 0.6); root.add(cons); box(cons, 1.1, 1.5, 0.7, 0, 0.8, 0, mt.dark);
            var scr = screen(cons, 0.9, 0.5, 0, 1.05, 0.36, 320, 180);
            var yTop = 3.75, gripTopBase = 2.35;
            var pins = [{ v: [1.3, 2.4, 0] }, { v: [0.4, 4.6, 0.3] }, { v: [0.4, 4.05, 0.3] }, { v: [0.2, 3.0, 0] }, { v: [0.35, 3.0, 0.2] }, { v: [-3.0, 1.8, 0.9] }];
            function set(p, prm) {
                var S = stateOf(prm, p), Mx = prm.M, m = Mx.m, drop = clamp(S.dL * 0.05, 0, 1.0);
                lower.position.y = 1.6 - drop;
                var yBot = gripTopBase - drop, neck = 0;
                if (!m.brittle && S.e > m.eu) neck = clamp((S.e - m.eu) / (m.ef - m.eu), 0, 1);
                var gap = S.broke ? S.gap * 0.5 : 0;
                function half(isUpper) {
                    return function (x, y, z) {
                        var u = isUpper ? (0.5 - y) * 0.5 : 0.5 + (0.5 - y) * 0.5;
                        var sh = clamp((Math.abs(u - 0.5) - 0.3) / 0.12, 0, 1), s = sh * sh * (3 - 2 * sh), f = lerp(0.11, 0.2, s);
                        f *= 1 - 0.64 * Math.pow(neck, 1.1) * Math.exp(-Math.pow((u - 0.5) / 0.08, 2));
                        var wy = yTop - u * (yTop - yBot) + (isUpper ? gap / 2 : -gap / 2) * 1;
                        return [x * f, wy, z * f];
                    };
                }
                upper.material = lowerH.material = m.brittle ? brittleM : steelM;
                deform(upper, half(true)); deform(lowerH, half(false));
                var mid = (yTop + yBot) / 2, span = yTop - yBot;
                rings[0].position.set(0, mid + span * 0.14, 0); rings[1].position.set(0, mid - span * 0.14, 0);
                rings.forEach(function (r) { r.visible = !S.broke; });
                scr.draw(Math.round(S.Pk * 10) + '|' + Math.round(S.eps * 10) + S.fase, function (g, W, H) {
                    g.fillStyle = '#0b1a10'; g.fillRect(0, 0, W, H); g.fillStyle = '#86efac'; g.textAlign = 'left'; g.font = 'bold 26px monospace';
                    g.fillText('P  ' + fmt(S.Pk, 2) + ' kN', 14, 52); g.fillText('σ  ' + fmt(S.sig, 0) + ' MPa', 14, 96); g.fillText('ε  ' + fmt(S.eps, 2) + ' %', 14, 140);
                    g.font = 'bold 18px sans-serif'; g.fillStyle = '#fbbf24'; g.fillText(S.fase, 14, 170);
                });
                var ph = S.fase === 'Elástica' ? 0 : (S.fase === 'Estricción' ? 2 : (S.fase === 'Fractura' || S.fase === 'Rotura frágil' ? 3 : 1));
                return { hud: hud4({ k: 'ε', v: fmt(S.eps, 2), u: '%' }, { k: 'σ', v: fmt(S.sig, 1), u: 'MPa' }, { k: 'P', v: fmt(S.Pk, 2), u: 'kN' }, { k: 'ΔL', v: fmt(S.dL, 2), u: 'mm' }), phase: ph };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       2 · COMPRESIÓN — prensa hidráulica
    =================================================================== */
    L3.register('compresion', {
        meta: {
            accent: '#60A5FA', machine: 'Prensa hidráulica de compresión', machineSub: 'Bastidor, plato superior, pistón hidráulico y manómetro',
            norma: 'ASTM C39 · ASTM E9', duration: 20,
            phases: [
                { a: 0.00, b: 0.50, t: 'Carga axial', d: 'El pistón sube y comprime el cilindro; σ crece con ε.' },
                { a: 0.50, b: 0.65, t: 'Falla', d: 'Aparecen fisuras o abarrilamiento: se alcanza la resistencia máxima.' },
                { a: 0.65, b: 1.01, t: 'Post-pico', d: 'La carga cae mientras el material se desintegra o fluye.' }
            ],
            parts: [
                { name: 'Bastidor de la prensa', desc: 'Columnas y travesaño que reaccionan la carga.' },
                { name: 'Plato superior', desc: 'Superficie fija contra la que se comprime la probeta.' },
                { name: 'Pistón hidráulico', desc: 'Empuja el plato inferior con presión de aceite.' },
                { name: 'Probeta cilíndrica', desc: 'Concreto, acero, madera u otro material.' },
                { name: 'Manómetro', desc: 'Indica la carga aplicada.' },
                { name: 'Compresómetro', desc: 'Mide el acortamiento ΔL de la probeta.' }
            ],
            cam: { target: [0, 2.5, 0], home: { theta: 0.55, phi: 1.12, radius: 10.4 }, frontal: { theta: 0, phi: 1.3, radius: 10.6 }, lateral: { theta: 1.4, phi: 1.2, radius: 10 }, detalle: { theta: 0.3, phi: 1.2, radius: 5, target: [0, 2.5, 0] } }
        },
        params: paramsFrom('compresion'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 7, 4, accent);
            var red = M(0x9b3b3b, 0.5, 0.45);
            box(root, 3.6, 0.9, 1.9, 0, 0.5, 0, red);
            [-1.3, 1.3].forEach(function (x) { cyl(root, 0.12, 0.12, 4.0, x, 2.9, 0, mt.steelL, 20); });
            box(root, 3.2, 0.34, 1.2, 0, 4.9, 0, red);
            cyl(root, 0.4, 0.4, 0.2, 0, 4.63, 0, mt.steelD, 28); box(root, 1.5, 0.12, 1.5, 0, 4.5, 0, mt.steelM);
            var low = new THREE.Group(); root.add(low);
            box(low, 1.5, 0.12, 1.5, 0, 0.06, 0, mt.steelM);
            var piston = cyl(root, 0.34, 0.34, 1, 0, 2, 0, mt.steelM, 24);
            var specMat = L.speckle('#8d9296', 4800, 60, 200, 3, 2, 1), specSteel = M(0xb8c2cc, 0.85, 0.3), specWood = L.speckle('#b08052', 3000, 80, 190, 3, 1, 3);
            var spec = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 30, 24), specMat); spec.castShadow = true; root.add(spec);
            var crackG = new THREE.Group(), crackMat = new THREE.MeshBasicMaterial({ color: 0x15100d, transparent: true, opacity: 0, side: THREE.DoubleSide });
            var crack = new THREE.Mesh(new THREE.RingGeometry(0.985, 1.015, 56), crackMat); crack.rotation.x = -Math.PI / 2; crackG.add(crack); root.add(crackG);
            var shards = []; for (var i = 0; i < 8; i++) { var sh = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.06), M(0x8d9296, 0, 0.9)); sh.visible = false; root.add(sh); shards.push(sh); }
            var gauge = K.makeDial(root, -2.4, 2.5, 0.6, 0.55, { chrome: mt.steelL, white: mt.white, accent: M(0x60A5FA, 0.3, 0.4), black: mt.dark, red: mt.red });
            box(root, 0.16, 0.9, 0.16, -2.4, 1.7, 0.6, mt.steelD);
            var scr = screen(root, 0.9, 0.3, 2.5, 1.3, 0.62, 256, 80); box(root, 1.0, 0.7, 0.5, 2.5, 1.1, 0.35, mt.dark);
            var pins = [{ v: [1.3, 3.6, 0] }, { v: [0.9, 4.6, 0.5] }, { v: [0.2, 1.3, 0.3] }, { v: [0.5, 2.6, 0.5] }, { v: [-2.4, 3.2, 0.6] }, { v: [2.5, 1.7, 0.6] }];
            function set(p, prm) {
                var S = stateOf(prm, p), Mx = prm.M, m = Mx.m, R = clamp(0.28 + prm.P.d / 160 * 0.3, 0.3, 0.6), H0 = clamp(R * 2 * m.ratio, 0.9, 2.1);
                var bot0 = 4.45 - H0, short = clamp(S.e * (m.fail === 'barrel' ? 1.2 : 55), 0, 0.32) * H0;
                var bot = bot0 + short, h = 4.45 - bot;
                low.position.y = bot - 0.12; piston.scale.y = Math.max(0.05, bot - 0.12 - 0.95); piston.position.y = 0.95 + piston.scale.y / 2;
                spec.material = m.fail === 'barrel' || m.fail === 'shear' ? specSteel : (m.fail === 'crush' ? specWood : specMat);
                var bul = m.fail === 'barrel' ? clamp(S.e * 1.6, 0, 0.3) : clamp(S.fail * 0.06, 0, 0.08);
                deform(spec, function (x, y, z) { var t = y + 0.5, f = R * (1 + bul * Math.sin(Math.PI * t) + short * 0.4); return [x * f, bot + t * h, z * f]; });
                var cone = m.fail === 'cone' || m.fail === 'shear';
                crackMat.opacity = cone ? 0.9 * sstep(0, 0.4, S.fail) : 0; crackG.position.set(0, bot + h / 2, 0); crackG.rotation.z = m.fail === 'shear' ? 0.78 : 1.0;
                crack.scale.set(R / Math.cos(crackG.rotation.z) * 1.0, R, 1); crack.scale.set(R / Math.cos(crackG.rotation.z), R, 1);
                shards.forEach(function (sh, i) { var on = m.fail === 'cone' && S.fail > 0.15 && p < 1; sh.visible = on; var f = ((p * 40 + i * 0.13) % 1); sh.position.set((i % 2 ? 1 : -1) * (R + 0.1 + f * 0.5), bot + h * 0.5 - f * 1.2, ((i * 37) % 10 - 5) * 0.06); });
                gauge.rotation.z = -clamp(S.Pk / Math.max(Mx.Pmax, 1), 0, 1.1) * 4.2;
                scr.lcd(fmt(S.Pk, 0) + ' kN', 'CARGA', '#93c5fd');
                var ph = S.fail <= 0.02 ? 0 : (S.fail < 1 ? 1 : 2);
                return { hud: hud4({ k: 'ε', v: fmt(S.eps, 3), u: '%' }, { k: 'σ', v: fmt(S.sig, 1), u: 'MPa' }, { k: 'P', v: fmt(S.Pk, 1), u: 'kN' }, { k: 'ΔL', v: fmt(S.dL, 2), u: 'mm' }), phase: ph };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       3 · FLEXIÓN — banco de tres puntos
    =================================================================== */
    L3.register('flexion', {
        meta: {
            accent: '#FBBF24', machine: 'Banco de flexión en 3 puntos', machineSub: 'Apoyos con rodillos, cabezal de carga y deflectómetro',
            norma: 'ASTM C78 · ASTM D790', duration: 20,
            phases: [
                { a: 0.00, b: 0.90, t: 'Carga creciente', d: 'La viga se curva: compresión arriba, tracción abajo; δ crece con P.' },
                { a: 0.90, b: 1.01, t: 'Rotura / fluencia', d: 'Se alcanza el módulo de ruptura (o la fluencia en el acero).' }
            ],
            parts: [
                { name: 'Apoyos con rodillos', desc: 'Apoyos simples separados la luz L.' },
                { name: 'Viga de ensayo', desc: 'Material a flexionar (acero, madera o concreto).' },
                { name: 'Cabezal de carga', desc: 'Aplica la carga puntual P en el centro.' },
                { name: 'Actuador', desc: 'Empuja el cabezal con velocidad controlada.' },
                { name: 'Deflectómetro', desc: 'Mide la deflexión δ en el centro.' },
                { name: 'Consola', desc: 'Lectura de P, δ y esfuerzo máximo.' }
            ],
            cam: { target: [0, 1.9, 0], home: { theta: 0.5, phi: 1.12, radius: 10.2 }, frontal: { theta: 0, phi: 1.28, radius: 10.4 }, lateral: { theta: 1.3, phi: 1.2, radius: 9.6 }, detalle: { theta: 0.3, phi: 1.2, radius: 5.4, target: [0, 1.6, 0] } }
        },
        params: paramsFrom('flexion'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 8.2, 3.6, accent);
            var blue = M(0x5a7aa0, 0.5, 0.4);
            box(root, 6.0, 0.36, 1.5, 0, 0.24, 0, blue);
            [-2.6, 2.6].forEach(function (x) { box(root, 0.3, 3.6, 0.5, x, 2.1, -0.6, blue); }); box(root, 5.5, 0.32, 0.6, 0, 3.95, -0.6, blue);
            [-1.7, 1.7].forEach(function (x) { box(root, 0.5, 0.35, 0.8, x, 0.6, 0, mt.steelD); var rl = cyl(root, 0.14, 0.14, 0.9, x, 0.9, 0, mt.steelL, 18); rl.rotation.x = Math.PI / 2; });
            var wood = L.speckle('#c9955e', 3000, 90, 200, 3, 3, 1), conc = L.speckle('#8d9296', 4800, 60, 200, 3, 3, 1), steel = M(0xb8c2cc, 0.85, 0.3);
            var beam = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 60, 4, 1), conc); beam.castShadow = true; root.add(beam);
            var nose = new THREE.Group(); root.add(nose);
            var nz = cyl(nose, 0.14, 0.14, 0.9, 0, 0, 0, mt.steelL, 18); nz.rotation.x = Math.PI / 2; box(nose, 0.5, 0.4, 0.8, 0, 0.36, 0, mt.steelD); cyl(nose, 0.13, 0.13, 1.2, 0, 1.1, 0, mt.steelM, 16);
            cyl(root, 0.3, 0.3, 0.5, 0, 3.6, 0, mt.steelD, 20);
            var crackM = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.5, 0.62), M(0x1d1411, 0, 1)); crackM.visible = false; root.add(crackM);
            var dialG = K.makeDial(root, 0, 0.55, 1.0, 0.45, { chrome: mt.steelL, white: mt.white, accent: M(0xFBBF24, 0.3, 0.4), black: mt.dark, red: mt.red });
            cyl(root, 0.04, 0.04, 0.5, 0, 0.35, 0.3, mt.steelL, 8);
            var scr = screen(root, 1.1, 0.4, 3.1, 1.3, 0.8, 320, 120); box(root, 1.2, 0.8, 0.5, 3.1, 1.0, 0.55, mt.dark);
            var pins = [{ v: [-1.7, 1.1, 0.6] }, { v: [-0.8, 1.7, 0.4] }, { v: [0, 2.2, 0.5] }, { v: [0, 3.5, 0.3] }, { v: [0, 1.0, 1.0] }, { v: [3.1, 1.9, 0.8] }];
            function set(p, prm) {
                var S = stateOf(prm, p), Mx = prm.M, P = prm.P, span = 3.4, hh = clamp(P.h / P.L * span, 0.3, 0.9), bw = 0.6;
                beam.material = P.mat === 'acero' ? steel : (P.mat === 'madera' ? wood : conc);
                var dm = 0.45, d = clamp(S.dl / Math.max(Mx.dmax, 1e-6), 0, 3) * dm * (S.plastic ? 0.7 : 1);
                if (S.broken) d = dm;
                var yb = 1.05 + hh / 2;     /* centro de la viga sobre los rodillos */
                deform(beam, function (x, y, z) {
                    var X = x * (span + 0.8), t = clamp((X + span / 2) / span, 0, 1), dd;
                    if (S.broken) { dd = d * 1.8 * (1 - Math.abs(2 * t - 1)); var gx = X > 0 ? 0.04 : -0.04; return [X + gx, yb + y * hh - dd * (1 - Math.abs(t - 0.5) * 0) * 0 - dd, z * bw]; }
                    dd = d * 4 * t * (1 - t); if (X < -span / 2 || X > span / 2) dd = 0;
                    return [X, yb + y * hh - dd, z * bw];
                });
                nose.position.y = yb + hh / 2 + 0.15 - d + 0.0;
                crackM.visible = S.broken; crackM.position.set(0, yb - d, 0); crackM.scale.y = hh / 0.5;
                dialG.rotation.z = -clamp(d / dm, 0, 1.2) * 4;
                scr.draw(Math.round(S.Pk * 100) + '|' + Math.round(S.dl * 10) + S.fase, function (g, W, H) {
                    g.fillStyle = '#0b1a10'; g.fillRect(0, 0, W, H); g.fillStyle = '#fde68a'; g.font = 'bold 24px monospace'; g.textAlign = 'left';
                    g.fillText('P ' + fmt(S.Pk, 2) + ' kN', 12, 40); g.fillText('δ ' + fmt(S.dl, 2) + ' mm', 12, 76); g.fillStyle = '#86efac'; g.font = 'bold 18px sans-serif'; g.fillText('σ ' + fmt(S.sg, 1) + ' MPa · ' + S.fase, 12, 106);
                });
                return { hud: hud4({ k: 'P', v: fmt(S.Pk, 2), u: 'kN' }, { k: 'δ', v: fmt(S.dl, 2), u: 'mm' }, { k: 'σ máx', v: fmt(S.sg, 1), u: 'MPa' }, { k: 'M', v: fmt(S.Mk, 3), u: 'kN·m' }), phase: p < 0.9 ? 0 : 1 };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       4 · TORSIÓN — banco de torsión
    =================================================================== */
    L3.register('torsion', {
        meta: {
            accent: '#C084FC', machine: 'Banco de torsión con goniómetro', machineSub: 'Cabezal fijo, cabezal giratorio con motor y torquímetro',
            norma: 'ASTM E143', duration: 20,
            phases: [
                { a: 0.00, b: 0.12, t: 'Zona elástica', d: 'γ = τ/G: las rayas se inclinan proporcionalmente al torque.' },
                { a: 0.12, b: 0.97, t: 'Fluencia por torsión', d: 'El material fluye; el torque crece lentamente hasta τu.' },
                { a: 0.97, b: 1.01, t: 'Fractura', d: 'La barra se corta en un plano perpendicular a su eje.' }
            ],
            parts: [
                { name: 'Cabezal fijo', desc: 'Sujeta un extremo e impide el giro.' },
                { name: 'Mandril (mordaza)', desc: 'Agarra la barra sin deslizamiento.' },
                { name: 'Probeta con rayas', desc: 'Las rayas rectas se vuelven hélices al torcerse.' },
                { name: 'Cabezal giratorio con motor', desc: 'Aplica el torque T girando un extremo.' },
                { name: 'Goniómetro', desc: 'Disco graduado: ángulo de giro φ.' },
                { name: 'Torquímetro', desc: 'Mide el torque aplicado.' }
            ],
            cam: { target: [0, 1.6, 0], home: { theta: 0.55, phi: 1.12, radius: 10.4 }, frontal: { theta: 0, phi: 1.32, radius: 10.6 }, lateral: { theta: 1.1, phi: 1.2, radius: 10 }, detalle: { theta: 0.3, phi: 1.2, radius: 5, target: [0, 1.5, 0] } }
        },
        params: paramsFrom('torsion'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 9.2, 3.8, accent);
            var blue = M(0x5b4a8a, 0.5, 0.4);
            box(root, 7.4, 0.4, 1.5, 0, 0.26, 0, blue);
            box(root, 1.3, 1.9, 1.3, -3.2, 1.45, 0, blue);
            var chL = cyl(root, 0.3, 0.3, 0.7, -2.4, 1.6, 0, mt.steelD, 24); chL.rotation.z = Math.PI / 2;
            var tail = new THREE.Group(); tail.position.set(3.2, 1.6, 0); root.add(tail);
            box(root, 1.5, 1.9, 1.3, 3.2, 1.45, 0, blue);
            var chR = cyl(tail, 0.3, 0.3, 0.7, -0.8, 0, 0, mt.steelD, 24); chR.rotation.z = Math.PI / 2;
            /* disco goniómetro con marca en el cabezal giratorio */
            var disc = cyl(tail, 0.75, 0.75, 0.08, 0.2, 0, 0, mt.white, 48); disc.rotation.z = Math.PI / 2;
            var mark = box(tail, 0.1, 0.5, 0.06, 0.26, 0.42, 0, M(0xbe123c, 0.2, 0.5));
            var stripes = document.createElement('canvas'); stripes.width = 256; stripes.height = 8; var sg = stripes.getContext('2d');
            sg.fillStyle = '#b8c2cc'; sg.fillRect(0, 0, 256, 8); sg.fillStyle = '#1e293b'; for (var k = 1; k < 6; k++) sg.fillRect(k * 42, 0, 5, 8); sg.fillStyle = '#F43F5E'; sg.fillRect(0, 0, 8, 8);
            var st = new THREE.CanvasTexture(stripes); st.wrapS = THREE.RepeatWrapping;
            var specGeo = new THREE.CylinderGeometry(1, 1, 1, 36, 60); specGeo.rotateZ(Math.PI / 2);
            var spec = new THREE.Mesh(specGeo, new THREE.MeshStandardMaterial({ map: st, metalness: 0.5, roughness: 0.4 })); spec.castShadow = true; root.add(spec);
            var tq = K.makeDial(root, -3.2, 2.9, 0.7, 0.5, { chrome: mt.steelL, white: mt.white, accent: M(0xC084FC, 0.3, 0.4), black: mt.dark, red: mt.red });
            var scr = screen(root, 1.0, 0.36, 3.2, 0.9, 0.67, 288, 104);
            var pins = [{ v: [-3.2, 2.6, 0.5] }, { v: [-2.4, 1.95, 0.3] }, { v: [0, 1.9, 0.3] }, { v: [3.2, 2.6, 0.5] }, { v: [3.4, 2.4, 0.5] }, { v: [-3.2, 3.3, 0.7] }];
            function set(p, prm) {
                var S = stateOf(prm, p), P = prm.P, R = clamp(0.12 + P.d / 50 * 0.22, 0.14, 0.34), Lm = 4.4, x0 = -2.05;
                var phi = Math.min(S.phi, Math.PI * 7), tw = phi;
                var gap = S.broke ? 0.1 : 0, xr = x0 + Lm;
                deform(spec, function (x, y, z) {
                    var t = (x + 0.5), X = x0 + t * Lm + (t > 0.5 ? gap : 0), a = tw * t, ca = Math.cos(a), sa = Math.sin(a), yy = y * R, zz = z * R;
                    return [X, 1.6 + yy * ca - zz * sa, yy * sa + zz * ca];
                });
                tail.position.x = xr + 0.8 + gap; tail.rotation.x = tw;
                chL.position.x = x0 - 0.2;
                tq.rotation.z = -clamp(S.T / Math.max(prm.M.Tu, 1), 0, 1.2) * 4.2;
                scr.draw(Math.round(S.T) + '|' + Math.round(S.phiD) + S.fase, function (g, W, H) {
                    g.fillStyle = '#0b1a10'; g.fillRect(0, 0, W, H); g.fillStyle = '#e9d5ff'; g.font = 'bold 26px monospace'; g.textAlign = 'left';
                    g.fillText('T ' + fmt(S.T, 1) + ' N·m', 12, 42); g.fillText('φ ' + fmt(S.phiD, 0) + '°', 12, 80); g.fillStyle = '#86efac'; g.font = 'bold 16px sans-serif'; g.fillText(S.fase, 190, 80);
                });
                return { hud: hud4({ k: 'φ', v: fmt(S.phiD, 1), u: '°' }, { k: 'T', v: fmt(S.T, 1), u: 'N·m' }, { k: 'τ máx', v: fmt(S.tau, 1), u: 'MPa' }, { k: 'γ', v: fmt(S.gam, 4), u: 'rad' }), phase: S.broke ? 2 : (S.fase === 'Elástica' ? 0 : 1) };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       5 · DUREZA — durómetro Rockwell
    =================================================================== */
    L3.register('dureza', {
        meta: {
            accent: '#2DD4BF', machine: 'Durómetro Rockwell', machineSub: 'Bastidor en C, indentador, yunque con husillo, carátula y pesas',
            norma: 'ASTM E18', duration: 20,
            phases: [
                { a: 0.00, b: 0.15, t: 'Precarga (10 kgf)', d: 'El indentador toca y fija la referencia h₀.' },
                { a: 0.15, b: 0.50, t: 'Carga mayor', d: 'Se suma la carga hasta el total (150 kgf en HRC, 100 kgf en HRB).' },
                { a: 0.50, b: 0.75, t: 'Mantener', d: 'La carga se sostiene unos segundos.' },
                { a: 0.75, b: 0.90, t: 'Retirar la carga mayor', d: 'Se recupera la parte elástica; queda la precarga.' },
                { a: 0.90, b: 1.01, t: 'Lectura', d: 'HR = N − e/0,002 mm, con e la profundidad permanente.' }
            ],
            parts: [
                { name: 'Bastidor en C', desc: 'Rígido: evita que el equipo se deforme bajo carga.' },
                { name: 'Indentador', desc: 'Cono de diamante (HRC) o bola de acero (HRB).' },
                { name: 'Probeta', desc: 'Superficie plana y pulida del material ensayado.' },
                { name: 'Yunque con husillo', desc: 'Eleva la probeta hasta aplicar la precarga.' },
                { name: 'Carátula', desc: 'Muestra la profundidad y la dureza HR.' },
                { name: 'Pesas de carga', desc: 'Generan la carga mayor mediante palanca.' }
            ],
            cam: { target: [0, 2.2, 0], home: { theta: 0.6, phi: 1.1, radius: 9.4 }, frontal: { theta: 0, phi: 1.25, radius: 9.6 }, lateral: { theta: 1.5, phi: 1.2, radius: 9 }, detalle: { theta: 0.5, phi: 1.15, radius: 4.4, target: [0, 1.7, 0.2] } }
        },
        params: paramsFrom('dureza'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 6.6, 3.6, accent);
            var body = M(0x4d7f86, 0.5, 0.42);
            /* silueta en C simplificada: columna trasera + brazo superior + base */
            box(root, 0.7, 4.9, 1.0, -1.3, 2.6, 0, body);
            box(root, 3.6, 0.8, 1.0, 0.3, 4.75, 0, body); box(root, 3.4, 0.7, 1.5, -0.1, 0.4, 0, body);
            cyl(root, 0.32, 0.32, 0.9, 0.9, 4.35, 0, mt.steelD, 24);
            var ind = new THREE.Group(); root.add(ind);
            cyl(ind, 0.1, 0.1, 0.9, 0, 0.45, 0, mt.steelL, 14); var tip = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 14), M(0xbfe9ff, 0.2, 0.2)); tip.rotation.x = Math.PI; tip.position.y = -0.15; ind.add(tip);
            var sphere = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), mt.steelL); sphere.position.y = -0.08; ind.add(sphere);
            ind.position.set(0.9, 3.0, 0);
            /* yunque + husillo + probeta */
            var anv = new THREE.Group(); root.add(anv); cyl(anv, 0.12, 0.12, 2.2, 0.9, -0.8, 0, mt.steelM, 14); cyl(anv, 0.42, 0.4, 0.14, 0.9, 0.3, 0, mt.steelL, 28);
            var blockM = M(0xb7c1cd, 0.85, 0.25); var block = box(anv, 0.9, 0.3, 0.9, 0.9, 0.52, 0, blockM);
            var dent = new THREE.Mesh(new THREE.CircleGeometry(0.05, 16), M(0x0b0f14, 0, 1)); dent.rotation.x = -Math.PI / 2; dent.position.set(0.9, 0.672, 0); dent.visible = false; anv.add(dent);
            var wheel = cyl(root, 0.5, 0.5, 0.12, 0.9, 0.55, 0.9, mt.dark, 24); wheel.rotation.x = Math.PI / 2;
            /* carátula */
            var dc = document.createElement('canvas'); dc.width = dc.height = 256; var dg = dc.getContext('2d'), dtex = new THREE.CanvasTexture(dc);
            var face = new THREE.Mesh(new THREE.CircleGeometry(0.62, 40), new THREE.MeshBasicMaterial({ map: dtex })); face.position.set(0.3, 4.75, 0.52); root.add(face);
            var ring = new THREE.Mesh(new THREE.TorusGeometry(0.64, 0.05, 10, 40), mt.steelL); ring.position.set(0.3, 4.75, 0.52); root.add(ring);
            var lastD = '';
            function drawDial(depth, hr, show, esc) {
                var key = Math.round(depth) + '|' + show + esc; if (key === lastD) return; lastD = key;
                dg.fillStyle = '#f4f6f8'; dg.fillRect(0, 0, 256, 256); dg.strokeStyle = '#1e293b'; dg.fillStyle = '#1e293b'; dg.textAlign = 'center'; dg.font = 'bold 15px sans-serif';
                for (var i = 0; i <= 50; i++) { var a = Math.PI * 0.75 + i / 50 * Math.PI * 1.5, big = i % 5 === 0; dg.lineWidth = big ? 3 : 1.4; dg.beginPath(); dg.moveTo(128 + Math.cos(a) * (big ? 96 : 108), 128 + Math.sin(a) * (big ? 96 : 108)); dg.lineTo(128 + Math.cos(a) * 118, 128 + Math.sin(a) * 118); dg.stroke(); if (big && i % 10 === 0) dg.fillText(String(i * 2), 128 + Math.cos(a) * 80, 128 + Math.sin(a) * 80 + 5); }
                var na = Math.PI * 0.75 + clamp(depth / 160, 0, 1) * Math.PI * 1.5;
                dg.strokeStyle = '#be123c'; dg.lineWidth = 5; dg.beginPath(); dg.moveTo(128, 128); dg.lineTo(128 + Math.cos(na) * 100, 128 + Math.sin(na) * 100); dg.stroke();
                dg.fillStyle = '#0f172a'; dg.font = 'bold 26px sans-serif'; dg.fillText(show ? hr + ' ' + esc : 'HR' + esc, 128, 190); dtex.needsUpdate = true;
            }
            /* pesas */
            var weights = []; for (var w = 0; w < 5; w++) { var wm = cyl(root, 0.32, 0.32, 0.12, -1.3, 5.3 + w * 0.14, -0.3, mt.steelD, 20); weights.push(wm); }
            var pins = [{ v: [-1.3, 3.0, 0.6] }, { v: [0.9, 3.3, 0.4] }, { v: [0.9, 1.3, 0.6] }, { v: [0.9, 0.6, 0.8] }, { v: [0.3, 5.5, 0.6] }, { v: [-1.3, 6.0, -0.3] }];
            function set(p, prm) {
                var S = stateOf(prm, p), Mx = prm.M, lift = S.depth / 150 * 0.28;
                ind.position.y = 2.75 - lift; tip.visible = Mx.C0; sphere.visible = !Mx.C0;
                anv.position.y = 1.78;
                var showHR = p >= 0.9; drawDial(S.depth, S.hrv, showHR, Mx.C0 ? 'HRC' : 'HRB');
                var nW = clamp(Math.round(S.load / Mx.total * 5), 0, 5); weights.forEach(function (wm, i) { wm.visible = i < Math.max(1, nW); });
                dent.visible = p >= 0.75; dent.scale.setScalar(Math.max(0.3, Mx.e / 90 * 1.2));
                wheel.rotation.y = p * 20;
                return { hud: hud4({ k: 'Carga', v: fmt(S.load, 0), u: 'kgf' }, { k: 'Prof.', v: fmt(S.depth, 1), u: 'µm' }, { k: 'HR', v: showHR ? S.hrv + (Mx.C0 ? ' HRC' : ' HRB') : '—', u: '' }, { k: 'Fase', v: S.fase, u: '' }), phase: S.ph };
            }
            return { root: root, pins: pins, set: set };
        }
    });
})(window);
