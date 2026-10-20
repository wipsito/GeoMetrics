/**
 * GeoMetrics — Laboratorio 3D · Mecánica de Suelos I (2/2)
 * Máquinas: compactación (Proctor), densidad en sitio (cono de arena), clasificación SUCS (tablero), permeabilidad (permeámetro)
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D;
    if (!L3 || !L3.kit || !L3.lib) return;
    var K = L3.kit, L = L3.lib, M = K.M, box = K.box, cyl = K.cyl, cylX = K.cylX, clamp = K.clamp, lerp = K.lerp, ease = K.ease, fmt = K.fmt;
    var paramsFrom = L.paramsFrom, stateOf = L.stateOf, screen = L.screen, bench = L.bench, mats = L.mats, glassM = L.glassM, waterM = L.waterM, lathe = L.lathe, tube = L.tube;
    function hud4(a, b, c, d) { return [a, b, c, d]; }

    /* ===================================================================
       5 · COMPACTACIÓN — molde Proctor con martillo
    =================================================================== */
    L3.register('compactacion', {
        meta: {
            accent: '#FB923C', machine: 'Molde Proctor con martillo de compactación', machineSub: 'Molde cilíndrico, collar, martillo con guía y balanza',
            norma: 'ASTM D698 / D1557 · INV E-141 / E-142', duration: 24,
            phases: [1, 2, 3, 4, 5].map(function (i) { return { a: (i - 1) / 5, b: i / 5 + (i === 5 ? 0.01 : 0), t: 'Molde ' + i + ' de 5', d: 'Compactar en capas con 25 golpes cada una, enrasar y pesar (humedad creciente).' }; }),
            parts: [
                { name: 'Molde Proctor', desc: 'Cilindro de acero de volumen conocido.' },
                { name: 'Collar de extensión', desc: 'Se retira al terminar para enrasar el suelo.' },
                { name: 'Placa base', desc: 'Apoya y sujeta el molde durante los golpes.' },
                { name: 'Martillo de compactación', desc: '24,4 N (estándar) o 44,5 N (modificado).' },
                { name: 'Guía de caída', desc: 'Fija la altura de caída: 305 mm o 457 mm.' },
                { name: 'Capas de suelo', desc: '3 capas (estándar) o 5 capas (modificado), 25 golpes cada una.' }
            ],
            cam: { target: [0, 1.5, 0], home: { theta: 0.55, phi: 1.1, radius: 8.8 }, frontal: { theta: 0, phi: 1.25, radius: 9 }, lateral: { theta: 1.4, phi: 1.2, radius: 8.4 }, detalle: { theta: 0.4, phi: 1.15, radius: 4.6, target: [0, 1.0, 0] } }
        },
        params: paramsFrom('compactacion'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 8, 3.8, accent);
            var MY = 0.2, MH = 1.1, R = 0.62;
            box(root, 1.9, 0.14, 1.9, 0, 0.13, 0, mt.steelD);
            var mold = new THREE.Mesh(new THREE.CylinderGeometry(R, R, MH, 44, 1, true), mt.steelL); mold.material.side = THREE.DoubleSide; mold.position.y = MY + MH / 2; mold.castShadow = true; root.add(mold);
            var collar = new THREE.Mesh(new THREE.CylinderGeometry(R + 0.03, R + 0.03, 0.5, 44, 1, true), mt.steelM); collar.material.side = THREE.DoubleSide; collar.position.y = MY + MH + 0.25; root.add(collar);
            [-1, 1].forEach(function (s) { cyl(root, 0.06, 0.06, 0.16, s * 0.85, 0.28, 0, mt.steelL, 10); });
            var layers = []; for (var i = 0; i < 5; i++) { var l = new THREE.Mesh(new THREE.CylinderGeometry(R - 0.03, R - 0.03, 1, 36), M(0x8a6b4a, 0, 0.95)); l.visible = false; root.add(l); layers.push(l); }
            /* guía + martillo */
            var guide = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 2.2, 24, 1, true), glassM(0.18)); guide.position.y = MY + MH + 0.5 + 1.1; root.add(guide);
            var ham = new THREE.Group(); root.add(ham);
            cyl(ham, 0.15, 0.15, 0.5, 0, 0.25, 0, mt.steelD, 20); cyl(ham, 0.05, 0.05, 1.1, 0, 1.0, 0, mt.steelL, 10); cyl(ham, 0.12, 0.12, 0.12, 0, 1.62, 0, mt.dark, 14);
            var hl = box(root, 0.05, 1.0, 0.05, 0.9, 1.2, 0.8, M(0xFB923C, 0.2, 0.5)); hl.visible = false;
            /* bandejas de muestra */
            var cups = [];
            for (var m = 0; m < 5; m++) { var c = new THREE.Group(); c.position.set(-3.0 + m * 0.0, 0.1, -1.4 + m * 0.5); root.add(c); cyl(c, 0.2, 0.17, 0.16, 0, 0.08, 0, mt.alum, 18); var mo = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 8, 0, 6.3, 0, 1.6), M(0x8a6b4a, 0, 0.95)); mo.position.y = 0.16; mo.scale.y = 0.6; c.add(mo); cups.push({ g: c, mat: mo.material }); }
            /* balanza */
            box(root, 1.5, 0.3, 1.1, 2.7, 0.21, 0, mt.mint);
            var bscr = screen(root, 0.9, 0.2, 2.7, 0.26, 0.56, 256, 56);
            cyl(root, 0.09, 0.09, 0.3, 2.7, 0.5, 0, mt.steelD, 12); cyl(root, 0.5, 0.5, 0.04, 2.7, 0.67, 0, mt.steelL, 36);
            var pins = [{ v: [R, MY + 0.5, 0] }, { v: [R, MY + MH + 0.3, 0] }, { v: [0.9, 0.2, 0.9] }, { v: [0.2, 3.0, 0] }, { v: [0.25, 3.7, 0] }, { v: [0, MY + 0.5, R] }];
            var cDry = new THREE.Color(0xa5825c), cWet = new THREE.Color(0x624228);
            function set(p, prm) {
                var S = stateOf(prm, p), Pr = prm.M.Pr, Lc = Pr.layers, filled = Math.min(Lc, S.bl / Pr.blows), th = MH / Lc, tcol = clamp((S.w - 6) / 22, 0, 1);
                for (var i = 0; i < 5; i++) {
                    var l = layers[i], on = i < Lc, f = clamp(filled - i, 0, 1);
                    l.visible = on && f > 0.02;
                    if (on) { var h = th * (0.6 + 0.4 * f); l.scale.y = h; l.position.y = MY + i * th + h / 2; l.material.color.copy(cDry).lerp(cWet, tcol); l.material.color.multiplyScalar(1 - i * 0.04); }
                }
                var topSoil = MY + Math.min(MH, filled * th) + 0.02, hh = 1.1, fr = S.fr, y;
                if (S.weighing || p >= 1) y = 0; else y = fr < 0.7 ? ease(fr / 0.7) * hh : hh * (1 - Math.pow((fr - 0.7) / 0.3, 2));
                ham.position.y = topSoil + y;
                collar.visible = !S.weighing;
                cups.forEach(function (c, m) { var done = m < S.i || p >= 1, cur = m === S.i && p < 1; c.g.visible = !done; c.g.scale.setScalar(cur ? 1.25 : 1); c.mat.color.copy(cDry).lerp(cWet, clamp((prm.M.ws[m] - 6) / 22, 0, 1)); });
                bscr.lcd(S.weighing ? fmt(S.gh, 2) : '0.00', 'γh kN/m³');
                return { hud: hud4({ k: 'Molde', v: S.pt + '/5', u: '' }, { k: 'w', v: fmt(S.w, 1), u: '%' }, { k: 'Golpes', v: String(S.bl), u: '/' + S.total }, { k: 'γd', v: fmt(S.gd, 2), u: 'kN/m³' }), phase: S.i };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       6 · DENSIDAD EN SITIO — cono de arena
    =================================================================== */
    L3.register('densidad', {
        meta: {
            accent: '#A3E635', machine: 'Cono de arena con frasco y placa base', machineSub: 'Frasco con arena calibrada, válvula, cono y placa base',
            norma: 'ASTM D1556 · INV E-161', duration: 20,
            phases: [
                { a: 0.00, b: 0.15, t: 'Excavar el hueco', d: 'Se extrae el suelo y se pesa (Msuelo).' },
                { a: 0.15, b: 0.25, t: 'Colocar el cono', d: 'Placa base nivelada y frasco invertido sobre el hueco.' },
                { a: 0.25, b: 0.85, t: 'Dejar caer la arena', d: 'Primero llena el cono, luego el hueco; V = M_arena / ρ_arena.' },
                { a: 0.85, b: 1.01, t: 'Pesar el frasco', d: 'La arena consumida da el volumen; ρh = Msuelo / V.' }
            ],
            parts: [
                { name: 'Frasco con arena calibrada', desc: 'Arena de densidad conocida y granulometría uniforme.' },
                { name: 'Válvula', desc: 'Abre el paso de la arena hacia el cono.' },
                { name: 'Cono (embudo)', desc: 'Su volumen se calibra previamente.' },
                { name: 'Placa base', desc: 'Referencia plana alrededor del hueco.' },
                { name: 'Hueco excavado', desc: 'Su volumen se mide con la arena que lo llena.' },
                { name: 'Balanza', desc: 'Pesa el suelo excavado y el frasco.' }
            ],
            cam: { target: [0, 1.5, 0], home: { theta: 0.55, phi: 1.1, radius: 9.2 }, frontal: { theta: 0, phi: 1.2, radius: 9.4 }, lateral: { theta: 1.4, phi: 1.15, radius: 8.8 }, detalle: { theta: 0.3, phi: 1.1, radius: 5, target: [0, 1.3, 0] } }
        },
        params: paramsFrom('densidad'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 8.4, 4.2, accent);
            /* terreno con hueco */
            var sh = new THREE.Shape(); sh.moveTo(-2.1, -1.5); sh.lineTo(2.1, -1.5); sh.lineTo(2.1, 1.5); sh.lineTo(-2.1, 1.5); sh.closePath();
            var hole = new THREE.Path(); hole.absarc(0, 0, 0.5, 0, Math.PI * 2, true); sh.holes.push(hole);
            var gg = new THREE.ExtrudeGeometry(sh, { depth: 0.8, bevelEnabled: false }); gg.rotateX(-Math.PI / 2); gg.translate(-0.8, 0.06, 0);
            var ground = new THREE.Mesh(gg, L.speckle('#6b4a2d', 2600, 40, 140, 3, 3, 2)); ground.receiveShadow = true; root.add(ground);
            var HX = -0.8;
            cyl(root, 0.52, 0.52, 0.02, HX, 0.07, 0, M(0x120c07, 0, 1), 28);
            var fill = new THREE.Mesh(new THREE.CylinderGeometry(0.49, 0.49, 1, 28), mt.sand); fill.visible = false; root.add(fill);
            var cover = new THREE.Mesh(new THREE.CircleGeometry(0.52, 28), M(0x6b4a2d, 0, 1)); cover.rotation.x = -Math.PI / 2; cover.position.set(HX, 0.865, 0); root.add(cover);
            /* aparato */
            var app = new THREE.Group(); app.position.x = HX; root.add(app);
            app.add(lathe([[0.4, 0], [1.0, 0], [1.0, 0.06], [0.4, 0.06]], mt.steelL, 40)).position.y = 0.87;
            var cone = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.3, 0.62, 36, 1, true), mt.brass); cone.material.side = THREE.DoubleSide; cone.position.y = 1.2; app.add(cone);
            cyl(app, 0.14, 0.14, 0.2, 0, 1.58, 0, mt.steelD, 14); var handle = cylX(app, 0.04, 0.04, 0.6, 0, 1.58, 0, mt.dark, 8);
            var jar = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.5, 36, 1, true), glassM(0.22)); jar.position.y = 2.42; app.add(jar);
            var sand = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1, 30), mt.sand); app.add(sand);
            var stream = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), mt.sand); stream.visible = false; app.add(stream);
            /* balanza con cuenco */
            var BX = 2.9; box(root, 1.7, 0.3, 1.2, BX, 0.21, 0, mt.mint); var bscr = screen(root, 0.95, 0.2, BX, 0.26, 0.61, 256, 56);
            cyl(root, 0.09, 0.09, 0.3, BX, 0.5, 0, mt.steelD, 12); cyl(root, 0.55, 0.55, 0.04, BX, 0.67, 0, mt.steelL, 36);
            var bowl = new THREE.Mesh(new THREE.SphereGeometry(0.4, 22, 10, 0, 6.3, Math.PI / 2, Math.PI / 2), mt.alum); bowl.material.side = THREE.DoubleSide; bowl.position.set(BX, 0.98, 0); root.add(bowl);
            var heap = new THREE.Mesh(new THREE.SphereGeometry(0.34, 16, 8, 0, 6.3, 0, 1.6), M(0x8a6340, 0, 0.95)); heap.position.set(BX, 0.76, 0); heap.scale.y = 0.01; root.add(heap);
            var pins = [{ v: [HX, 3.2, 0.7] }, { v: [HX + 0.4, 1.58, 0] }, { v: [HX + 0.5, 1.2, 0.5] }, { v: [HX + 1.0, 0.95, 0.6] }, { v: [HX, 0.9, -0.6] }, { v: [BX, 1.0, 0.6] }];
            function set(p, prm) {
                var S = stateOf(prm, p), Mx = prm.M, ap = S.ph >= 1, drop = (1 - ease((p - 0.15) / 0.1)) * 1.4;
                app.visible = ap; app.position.y = drop; cover.scale.setScalar(Math.max(0.001, 1 - S.dig)); cover.visible = S.dig < 0.999;
                var level = clamp(1 - S.out / (Mx.Mtot + 3200), 0.1, 1), sh2 = 1.4 * level;
                sand.scale.y = sh2; sand.position.y = 1.67 + sh2 / 2;
                var holeTop = 0.07, depth = 0.8, fh = clamp(S.inHole / Mx.inHoleT, 0, 1) * depth * 0.95;
                fill.visible = S.inHole > 0; fill.scale.y = Math.max(0.01, fh); fill.position.set(HX, 0.07 + fh / 2, 0);
                stream.visible = S.ph === 2 && S.q < 0.995; if (stream.visible) { var top = 0.9, bot = 0.07 + fh; stream.scale.y = Math.max(0.05, top - bot); stream.position.y = (top + bot) / 2; }
                heap.scale.y = clamp(S.ph === 0 ? S.dig : 1, 0.01, 1) * 0.9; bowl.visible = true;
                bscr.lcd(fmt(S.ph === 3 ? Mx.Mtot : (S.ph === 0 ? Mx.Msoil * S.dig : Mx.Msoil), 0) + ' g', S.ph === 3 ? 'ARENA' : 'SUELO');
                return { hud: hud4({ k: 'Arena', v: fmt(S.out, 0), u: 'g' }, { k: 'En hueco', v: fmt(S.inHole, 0), u: 'g' }, { k: 'V hueco', v: fmt(S.Vc, 0), u: 'cm³' }, { k: 'ρd', v: S.rd ? fmt(S.rd, 3) : '—', u: S.rd ? 'g/cm³' : '' }), phase: S.ph };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       7 · CLASIFICACIÓN SUCS — tablero con carta de plasticidad
    =================================================================== */
    L3.register('clasificacion', {
        meta: {
            accent: '#818CF8', machine: 'Tablero de clasificación SUCS', machineSub: 'Frascos de composición, carta de plasticidad y letrero del símbolo',
            norma: 'ASTM D2487 · INV E-181', duration: 18,
            phases: [
                { a: 0.00, b: 0.35, t: 'Composición granulométrica', d: 'Porcentajes de grava, arena y finos (pasa No. 4 y No. 200).' },
                { a: 0.35, b: 0.70, t: 'Plasticidad de los finos', d: 'Se ubica el punto (LL, IP) respecto a la línea A.' },
                { a: 0.70, b: 1.01, t: 'Símbolo SUCS', d: 'El árbol de decisión entrega el símbolo y el nombre.' }
            ],
            parts: [
                { name: 'Frascos de composición', desc: 'Grava, arena y finos en proporción real.' },
                { name: 'Carta de plasticidad', desc: 'IP contra LL con la línea A y la línea U.' },
                { name: 'Línea A', desc: 'IP = 0,73 (LL − 20): separa arcillas (arriba) de limos (abajo).' },
                { name: 'Punto (LL, IP)', desc: 'Posición del suelo ensayado.' },
                { name: 'Letrero SUCS', desc: 'Símbolo y nombre del suelo.' },
                { name: 'Tablero', desc: 'Soporte de la carta.' }
            ],
            cam: { target: [0, 2.1, 0], home: { theta: 0.35, phi: 1.2, radius: 9.2 }, frontal: { theta: 0, phi: 1.35, radius: 9.2 }, lateral: { theta: 1.0, phi: 1.25, radius: 8.8 }, detalle: { theta: 0.2, phi: 1.3, radius: 5.6, target: [0.6, 2.2, 0] } }
        },
        params: paramsFrom('clasificacion'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 8.6, 3.6, accent);
            box(root, 4.2, 3.1, 0.14, 0.9, 2.1, -0.4, mt.mintD);
            var cv = document.createElement('canvas'); cv.width = 800; cv.height = 600; var g = cv.getContext('2d'), tex = new THREE.CanvasTexture(cv);
            var plate = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 2.9), new THREE.MeshBasicMaterial({ map: tex })); plate.position.set(0.9, 2.1, -0.32); root.add(plate);
            var PX = 70, PY = 540, PW = 700, PH = 460;
            function cx(LL) { return PX + LL / 100 * PW; } function cy(IP) { return PY - IP / 60 * PH; }
            var lastKey = '';
            function drawChart(LL, IP, prog) {
                var key = Math.round(LL * 10) + '|' + Math.round(IP * 10) + '|' + Math.round(prog * 50); if (key === lastKey) return; lastKey = key;
                g.fillStyle = '#151F32'; g.fillRect(0, 0, 800, 600);
                g.strokeStyle = 'rgba(167,180,200,.18)'; g.lineWidth = 1; g.fillStyle = '#A7B4C8'; g.font = '16px sans-serif'; g.textAlign = 'center';
                for (var x = 0; x <= 100; x += 10) { g.beginPath(); g.moveTo(cx(x), PY); g.lineTo(cx(x), cy(60)); g.stroke(); g.fillText(String(x), cx(x), PY + 22); }
                for (var y = 0; y <= 60; y += 10) { g.beginPath(); g.moveTo(PX, cy(y)); g.lineTo(PX + PW, cy(y)); g.stroke(); g.textAlign = 'right'; g.fillText(String(y), PX - 8, cy(y) + 5); g.textAlign = 'center'; }
                g.fillStyle = '#F1F5F9'; g.font = 'bold 18px sans-serif'; g.fillText('Límite líquido LL (%)', PX + PW / 2, 585); g.save(); g.translate(18, PY - PH / 2); g.rotate(-Math.PI / 2); g.fillText('Índice de plasticidad IP (%)', 0, 0); g.restore();
                g.lineWidth = 3; g.strokeStyle = '#FBBF24'; g.beginPath(); g.moveTo(cx(20), cy(0)); g.lineTo(cx(100), cy(58.4)); g.stroke();
                g.strokeStyle = '#F87171'; g.setLineDash([8, 6]); g.beginPath(); g.moveTo(cx(16), cy(0)); g.lineTo(cx(16), cy(7.2)); g.lineTo(cx(74.7), cy(60)); g.stroke(); g.setLineDash([]);
                g.strokeStyle = 'rgba(167,180,200,.6)'; g.setLineDash([4, 6]); g.beginPath(); g.moveTo(cx(50), cy(0)); g.lineTo(cx(50), cy(60)); g.stroke(); g.setLineDash([]);
                g.fillStyle = '#FBBF24'; g.font = 'bold 16px sans-serif'; g.fillText('Línea A', cx(86), cy(46)); g.fillStyle = '#F87171'; g.fillText('Línea U', cx(58), cy(54));
                g.fillStyle = '#C7D2FE'; g.font = 'bold 26px sans-serif'; g.fillText('CL', cx(34), cy(20)); g.fillText('CH', cx(76), cy(40)); g.fillText('ML', cx(34), cy(3)); g.fillText('MH', cx(76), cy(10));
                if (prog > 0) {
                    var px = cx(LL * prog), py = cy(IP * prog);
                    g.strokeStyle = 'rgba(255,255,255,.55)'; g.setLineDash([5, 5]); g.beginPath(); g.moveTo(px, PY); g.lineTo(px, py); g.lineTo(PX, py); g.stroke(); g.setLineDash([]);
                    g.fillStyle = 'rgba(129,140,248,.35)'; g.beginPath(); g.arc(px, py, 22, 0, 6.3); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(px, py, 9, 0, 6.3); g.fill(); g.strokeStyle = '#818CF8'; g.lineWidth = 4; g.stroke();
                    g.fillStyle = '#fff'; g.font = 'bold 20px sans-serif'; g.textAlign = 'left'; g.fillText('(' + Math.round(LL * prog) + ', ' + Math.round(IP * prog) + ')', px + 18, py - 14); g.textAlign = 'center';
                }
                tex.needsUpdate = true;
            }
            /* frascos */
            var jars = [];
            [['Grava', 0xF59E0B], ['Arena', 0xFBBF24], ['Finos', 0x818CF8]].forEach(function (a, i) {
                var j = new THREE.Group(); j.position.set(-3.2 + i * 0.0, 0.09, -0.9 + i * 0.95); root.add(j);
                var gl = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.1, 24, 1, true), glassM(0.22)); gl.position.y = 0.55; j.add(gl); cyl(j, 0.32, 0.32, 0.04, 0, 0.02, 0, glassM(0.4), 24);
                var fl = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 1, 24), M(a[1], 0, 0.9)); j.add(fl); jars.push(fl);
            });
            /* letrero */
            var sign = new THREE.Group(); sign.position.set(-1.1, 0.1, 1.2); root.add(sign); box(sign, 2.2, 0.9, 0.12, 0, 0.55, 0, mt.dark); cyl(sign, 0.05, 0.05, 0.2, -0.8, 0.1, 0, mt.steelD, 8); cyl(sign, 0.05, 0.05, 0.2, 0.8, 0.1, 0, mt.steelD, 8);
            var sscr = screen(sign, 2.0, 0.78, 0, 0.55, 0.07, 400, 156);
            var lastS = '';
            function drawSign(sym, name) { var k = sym + name; if (k === lastS) return; lastS = k; sscr.draw(k, function (g2, W, H) { g2.fillStyle = '#0B1220'; g2.fillRect(0, 0, W, H); g2.fillStyle = '#818CF8'; g2.font = 'bold 76px sans-serif'; g2.textAlign = 'center'; g2.fillText(sym, W / 2, 84); g2.fillStyle = '#C7D2FE'; g2.font = 'bold 24px sans-serif'; g2.fillText(name, W / 2, 130); }); }
            var pins = [{ v: [-3.2, 1.3, 0] }, { v: [0.9, 3.7, 0] }, { v: [2.3, 3.0, 0] }, { v: [0.9, 2.6, 0.1] }, { v: [-1.1, 1.8, 1.3] }, { v: [-1.1, 3.6, -0.4] }];
            function set(p, prm) {
                var r = prm.M.r, a = ease(p / 0.35), b = ease((p - 0.35) / 0.35), c = p >= 0.7;
                var tot = Math.max(r.grava + r.arena + r.F200, 1), fr = [r.grava / tot, r.arena / tot, r.F200 / tot];
                jars.forEach(function (j, i) { var h = Math.max(0.02, 1.0 * fr[i] * a * 1.0); j.scale.y = h; j.position.y = 0.04 + h / 2; });
                drawChart(prm.P.LL, prm.P.IP, b);
                drawSign(c ? r.sym : '?', c ? r.name : 'Evaluando…');
                return { hud: hud4({ k: 'Grava', v: fmt(r.grava * a, 0), u: '%' }, { k: 'Arena', v: fmt(r.arena * a, 0), u: '%' }, { k: 'Finos', v: fmt(r.F200 * a, 0), u: '%' }, { k: 'SUCS', v: c ? r.sym : '…', u: '' }), phase: p < 0.35 ? 0 : p < 0.7 ? 1 : 2 };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       8 · PERMEABILIDAD — permeámetro de carga constante
    =================================================================== */
    L3.register('permeabilidad', {
        meta: {
            accent: '#22D3EE', machine: 'Permeámetro de carga constante', machineSub: 'Tanque de nivel constante, cilindro con suelo y probeta graduada',
            norma: 'ASTM D2434 · INV E-130', duration: 20,
            phases: [
                { a: 0.00, b: 0.08, t: 'Establecer el flujo', d: 'El tanque mantiene la carga h constante mediante un rebose.' },
                { a: 0.08, b: 0.92, t: 'Recolectar el caudal', d: 'El agua atraviesa el suelo; se mide el volumen en la probeta.' },
                { a: 0.92, b: 1.01, t: 'Calcular k', d: 'k = Q·L / (A·h·t), con Q = V/t.' }
            ],
            parts: [
                { name: 'Tanque de nivel constante', desc: 'Con rebose para mantener la carga hidráulica h.' },
                { name: 'Cilindro permeámetro', desc: 'Contiene la muestra de longitud L y área A.' },
                { name: 'Muestra de suelo', desc: 'Suelo granular compactado a densidad conocida.' },
                { name: 'Piedras porosas', desc: 'Distribuyen el flujo y retienen el suelo.' },
                { name: 'Probeta graduada', desc: 'Mide el volumen de agua que atraviesa la muestra.' },
                { name: 'Mangueras', desc: 'Conducen el agua del tanque a la celda y a la probeta.' }
            ],
            cam: { target: [0, 2.1, 0], home: { theta: 0.5, phi: 1.1, radius: 10 }, frontal: { theta: 0, phi: 1.25, radius: 10.2 }, lateral: { theta: 1.3, phi: 1.2, radius: 9.6 }, detalle: { theta: 0.3, phi: 1.15, radius: 5.6, target: [0, 1.5, 0] } }
        },
        params: paramsFrom('permeabilidad', { tipo: 'constante' }),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 8.4, 3.6, accent);
            box(root, 0.2, 4.6, 0.2, -2.4, 2.4, -0.7, mt.steelM); box(root, 2.4, 0.12, 0.6, -1.4, 3.3, -0.7, mt.steelM);
            /* tanque */
            var tank = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.0, 1.0), glassM(0.2)); tank.position.set(-1.2, 3.95, -0.1); root.add(tank);
            var tw = new THREE.Mesh(new THREE.BoxGeometry(1.74, 0.8, 0.94), waterM(0.5)); tw.position.set(-1.2, 3.87, -0.1); root.add(tw);
            cyl(root, 0.05, 0.05, 0.8, -0.2, 3.75, -0.1, mt.slate, 10);
            /* celda */
            var CX = 0.9, CY = 0.7, CH = 1.6;
            box(root, 1.5, 0.16, 1.5, CX, 0.14, 0, mt.steelD);
            var cell = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, CH, 40, 1, true), glassM(0.25)); cell.position.set(CX, CY + CH / 2, 0); root.add(cell);
            var soil = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.58, 1.12, 36), L.speckle('#b78a5c', 2400, 60, 200, 3, 2, 1)); soil.position.set(CX, CY + CH / 2, 0); root.add(soil);
            cyl(root, 0.58, 0.58, 0.1, CX, CY + CH / 2 - 0.61, 0, M(0xd3dbe8, 0.1, 0.9), 30); cyl(root, 0.58, 0.58, 0.1, CX, CY + CH / 2 + 0.61, 0, M(0xd3dbe8, 0.1, 0.9), 30);
            cyl(root, 0.66, 0.66, 0.08, CX, CY + CH + 0.04, 0, mt.steelM, 36); cyl(root, 0.66, 0.66, 0.08, CX, CY - 0.04, 0, mt.steelM, 36);
            var inlet = tube(root, [[-0.2, 3.5, -0.1], [-0.2, 3.1, 0.2], [CX, 3.0, 0.3], [CX, CY + CH + 0.08, 0.1]], 0.05, M(0x3b9eff, 0.2, 0.3));
            tube(root, [[CX, CY - 0.06, 0], [CX, 0.5, 0.2], [2.7, 0.5, 0.4], [2.7, 0.95, 0.4]], 0.05, mt.rubber);
            /* probeta */
            var PX = 2.7;
            var pr = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 2.6, 28, 1, true), glassM(0.25)); pr.position.set(PX, 1.4, 0.4); root.add(pr);
            cyl(root, 0.4, 0.4, 0.06, PX, 0.1, 0.4, mt.steelM, 28);
            var pw = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.31, 1, 24), waterM(0.7)); pw.visible = false; root.add(pw);
            for (var t = 0; t <= 5; t++) { var tk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.012, 0.012), mt.dark); tk.position.set(PX + 0.34, 0.2 + t * 0.48, 0.4); root.add(tk); }
            var drop = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), waterM(0.9)); root.add(drop);
            var sc = screen(root, 1.2, 0.3, 0.9, 0.12, 0.8, 256, 64);
            var pins = [{ v: [-1.2, 4.55, -0.1] }, { v: [CX + 0.7, 1.9, 0] }, { v: [CX, 1.5, 0.6] }, { v: [CX + 0.6, 2.2, 0.3] }, { v: [PX + 0.5, 1.8, 0.4] }, { v: [1.7, 0.55, 0.3] }];
            function set(p, prm) {
                var S = stateOf(prm, p), vmax = 150, h = clamp(S.V, 0, vmax) / vmax * 2.35;
                pw.visible = h > 0.01; pw.scale.y = Math.max(0.01, h); pw.position.set(PX, 0.14 + h / 2, 0.4);
                drop.visible = S.flow; drop.position.set(PX, 2.95 - ((p * 90) % 1) * 1.0 - clamp(h, 0, 1.6), 0.4);
                sc.lcd(fmt(S.V, 1) + ' mL', 'PROBETA', '#67e8f9');
                var i = prm.P.h / prm.P.L;
                return { hud: hud4({ k: 't', v: S.t < 90 ? fmt(S.t, 0) : S.t < 5400 ? fmt(S.t / 60, 1) : fmt(S.t / 3600, 1), u: S.t < 90 ? 's' : S.t < 5400 ? 'min' : 'h' }, { k: 'V', v: fmt(S.V, 1), u: 'mL' }, { k: 'i', v: fmt(i, 2), u: '' }, { k: 'k', v: Math.pow(10, prm.P.lk).toExponential(1), u: 'cm/s' }), phase: p < 0.08 ? 0 : p < 0.92 ? 1 : 2 };
            }
            return { root: root, pins: pins, set: set };
        }
    });
})(window);
