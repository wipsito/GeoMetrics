/**
 * GeoMetrics — Laboratorio 3D · Mecánica de Suelos I (1/2)
 * Máquinas: humedad (horno + balanza), granulometría (tamizadora), límites (copa de Casagrande), gravedad (picnómetro)
 * Todas toman los valores del simulador 2D correspondiente (GeoSim2D.defs[tipo]), así ambos simuladores coinciden.
 * Exporta GeoLab3D.lib con utilidades que reutilizan lab3d-ms1b.js y lab3d-rm.js
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D;
    if (!L3 || !L3.kit) return;
    var K = L3.kit, M = K.M, box = K.box, cyl = K.cyl, cylX = K.cylX, cylZ = K.cylZ, add = K.add, clamp = K.clamp, lerp = K.lerp, ease = K.ease, fmt = K.fmt;

    /* ------------------------- utilidades compartidas ------------------------- */
    function G2() { return global.GeoSim2D; }
    function paramsFrom(key, extra) {
        return function () {
            var d = G2().defs[key], P = {};
            d.fields.forEach(function (f) { P[f.id] = f.value; });
            if (extra) Object.keys(extra).forEach(function (k) { P[k] = extra[k]; });
            return { P: P, M: d.model(P), def: d, real: false, nota: 'Valores típicos del simulador. Cambia los parámetros en el simulador 2D y compara los resultados.' };
        };
    }
    function stateOf(prm, p) { return prm.def.at(prm.P, prm.M, p); }

    /* pantalla digital (textura de canvas) */
    function screen(parent, w, h, x, y, z, cw, ch, rotX) {
        var c = document.createElement('canvas'); c.width = cw; c.height = ch;
        var g = c.getContext('2d'), tex = new THREE.CanvasTexture(c);
        var mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
        mesh.position.set(x, y, z); if (rotX) mesh.rotation.x = rotX;
        parent.add(mesh);
        var last = '';
        return {
            mesh: mesh,
            draw: function (key, fn) { if (key === last) return; last = key; fn(g, cw, ch); tex.needsUpdate = true; },
            lcd: function (text, sub, color) {
                this.draw(text + '|' + sub, function (g2, W, H) {
                    g2.fillStyle = '#0b1a10'; g2.fillRect(0, 0, W, H);
                    g2.fillStyle = color || '#86efac'; g2.font = 'bold ' + Math.round(H * 0.5) + 'px monospace'; g2.textAlign = 'right'; g2.textBaseline = 'middle';
                    g2.fillText(text, W - 14, H * 0.55);
                    if (sub) { g2.font = 'bold ' + Math.round(H * 0.2) + 'px sans-serif'; g2.textAlign = 'left'; g2.fillText(sub, 12, H * 0.2); }
                });
            }
        };
    }
    /* textura granulada */
    function speckle(base, n, lo, hi, size, repX, repY) {
        var c = document.createElement('canvas'); c.width = c.height = 256;
        var g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, 256, 256);
        for (var i = 0; i < n; i++) { var v = Math.round(lo + Math.random() * (hi - lo)); g.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; var s = 1 + Math.random() * size; g.fillRect(Math.random() * 256, Math.random() * 256, s, s); }
        var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repX || 1, repY || 1);
        return new THREE.MeshStandardMaterial({ map: t, color: 0xffffff, metalness: 0, roughness: 0.95 });
    }
    function glassM(op) { return new THREE.MeshStandardMaterial({ color: 0xcfe9ff, metalness: 0.1, roughness: 0.08, transparent: true, opacity: op || 0.25, depthWrite: false, side: THREE.DoubleSide }); }
    function waterM(op) { return new THREE.MeshStandardMaterial({ color: 0x3b9eff, metalness: 0.05, roughness: 0.2, transparent: true, opacity: op || 0.55, depthWrite: false }); }
    function lathe(pts, mat, seg) {
        var v = pts.map(function (q) { return new THREE.Vector2(q[0], q[1]); });
        var m = new THREE.Mesh(new THREE.LatheGeometry(v, seg || 40), mat); m.castShadow = true; return m;
    }
    function tube(parent, pts, r, mat) {
        var curve = new THREE.CatmullRomCurve3(pts.map(function (q) { return new THREE.Vector3(q[0], q[1], q[2]); }));
        var m = new THREE.Mesh(new THREE.TubeGeometry(curve, 28, r, 8, false), mat); parent.add(m); return m;
    }
    function bench(root, w, d, accent) {
        K.plinth(root, w, d, accent);
        box(root, w - 0.3, 0.06, d - 0.3, 0, 0.03, 0, M(0x2a3547, 0.35, 0.55));
    }
    /* deforma una malla vértice a vértice. fn(x,y,z) → [x',y',z']  (usa las posiciones originales) */
    function deform(mesh, fn) {
        var pos = mesh.geometry.attributes.position;
        if (!mesh.userData.orig) mesh.userData.orig = pos.array.slice();
        var o = mesh.userData.orig, a = pos.array;
        for (var i = 0; i < a.length; i += 3) { var r = fn(o[i], o[i + 1], o[i + 2]); a[i] = r[0]; a[i + 1] = r[1]; a[i + 2] = r[2]; }
        pos.needsUpdate = true; mesh.geometry.computeVertexNormals();
    }
    function mats() {
        return {
            mint: M(0xa9bfba, 0.35, 0.42), mintD: M(0x8fa7a2, 0.4, 0.45), steelL: M(0xc9d2d9, 0.82, 0.26), steelM: M(0xaab5be, 0.85, 0.3),
            steelD: M(0x7d8892, 0.8, 0.35), dark: M(0x1f242b, 0.3, 0.6), rubber: M(0x1b1f24, 0.1, 0.85), brass: M(0xd1a84a, 0.85, 0.3),
            slate: M(0x6f8fb4, 0.45, 0.4), white: M(0xf1f5f9, 0.1, 0.7), alum: M(0xd5dbe2, 0.9, 0.25), red: M(0xd9482b, 0.2, 0.45), green: M(0x26b64d, 0.2, 0.45),
            soilD: M(0x6b4a2d, 0, 0.95), soilL: M(0xc9a876, 0, 0.9), sand: M(0xe3c586, 0, 0.9)
        };
    }
    L3.lib = { paramsFrom: paramsFrom, stateOf: stateOf, screen: screen, speckle: speckle, glassM: glassM, waterM: waterM, lathe: lathe, tube: tube, bench: bench, deform: deform, mats: mats, G2: G2 };

    function hud4(a, b, c, d) { return [a, b, c, d]; }

    /* ===================================================================
       1 · HUMEDAD — horno de secado + balanza
    =================================================================== */
    L3.register('humedad', {
        meta: {
            accent: '#38BDF8', machine: 'Horno de secado y balanza analítica', machineSub: 'Horno 105–110 °C, recipiente de aluminio y balanza de 0,01 g',
            norma: 'ASTM D2216 · INV E-122', duration: 18,
            phases: [
                { a: 0.00, b: 0.12, t: 'Pesar la muestra húmeda', d: 'Recipiente + suelo húmedo en la balanza (Wh + tara).' },
                { a: 0.12, b: 0.88, t: 'Secar en el horno', d: 'A 105–110 °C hasta masa constante; el agua se evapora.' },
                { a: 0.88, b: 1.01, t: 'Pesar la muestra seca', d: 'Se obtiene Ws; w = (Wh − Ws) / Ws × 100.' }
            ],
            parts: [
                { name: 'Horno de secado', desc: 'Mantiene 105–110 °C para evaporar el agua sin quemar el suelo.' },
                { name: 'Panel de temperatura', desc: 'Termostato digital con lectura de la temperatura interior.' },
                { name: 'Recipiente de aluminio (tara)', desc: 'Contiene la muestra; su masa se descuenta.' },
                { name: 'Muestra de suelo', desc: 'Cambia de color oscuro a claro al perder el agua.' },
                { name: 'Balanza analítica', desc: 'Precisión de 0,01 g para Wh y Ws.' },
                { name: 'Puerta y bandeja', desc: 'Se abre para introducir y retirar el recipiente.' }
            ],
            cam: { target: [0, 1.2, 0], home: { theta: 0.5, phi: 1.12, radius: 9.2 }, frontal: { theta: 0, phi: 1.3, radius: 9.4 }, lateral: { theta: 1.3, phi: 1.22, radius: 8.6 }, detalle: { theta: 0.3, phi: 1.2, radius: 5.2, target: [-1.2, 1.2, 0] } }
        },
        params: paramsFrom('humedad'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 8.2, 3.8, accent);
            /* horno */
            var X0 = -1.9, W = 2.5, Hh = 2.2, D = 1.7, T = 0.12, bodyM = mt.mint;
            box(root, T, Hh, D, X0 - W / 2 + T / 2, 0.1 + Hh / 2, 0, bodyM);
            box(root, T, Hh, D, X0 + W / 2 - T / 2, 0.1 + Hh / 2, 0, bodyM);
            box(root, W, T, D, X0, 0.1 + T / 2, 0, bodyM);
            box(root, W, T, D, X0, 0.1 + Hh - T / 2, 0, bodyM);
            box(root, W, Hh, T, X0, 0.1 + Hh / 2, -D / 2 + T / 2, bodyM);
            var glowM = new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: new THREE.Color(0xff5a1a), emissiveIntensity: 0, roughness: 0.8 });
            var glow = new THREE.Mesh(new THREE.BoxGeometry(W - 2 * T - 0.04, Hh - 2 * T - 0.04, 0.02), glowM); glow.position.set(X0, 0.1 + Hh / 2, -D / 2 + T + 0.02); root.add(glow);
            box(root, W - 2 * T - 0.1, 0.05, D - T - 0.2, X0, 1.1, 0.05, mt.steelM);                  /* bandeja */
            box(root, W + 0.2, 0.34, 0.34, X0, 0.1 + Hh + 0.17, D / 2 - 0.2, mt.mintD);              /* caja de control */
            var scr = screen(root, 0.95, 0.24, X0, 0.1 + Hh + 0.17, D / 2 - 0.02, 256, 64);
            cyl(root, 0.12, 0.12, 0.3, X0 + 0.8, 0.1 + Hh + 0.15, -0.3, mt.steelD, 16);
            /* puerta con bisagra a la izquierda */
            var door = new THREE.Group(); door.position.set(X0 - W / 2, 0.1, D / 2); root.add(door);
            box(door, W, Hh, 0.1, W / 2, Hh / 2, 0, mt.mintD);
            box(door, W - 0.6, Hh - 0.7, 0.03, W / 2, Hh / 2, 0.06, new THREE.MeshStandardMaterial({ color: 0x0d1117, metalness: 0.2, roughness: 0.15, transparent: true, opacity: 0.8 }));
            cyl(door, 0.05, 0.05, 0.5, W - 0.15, Hh / 2, 0.16, mt.steelL, 12);
            /* balanza */
            var BX = 2.2;
            box(root, 1.6, 0.3, 1.2, BX, 0.21, 0, mt.mint);
            var bscr = screen(root, 0.95, 0.2, BX, 0.26, 0.61, 256, 56);
            cyl(root, 0.09, 0.09, 0.3, BX, 0.5, 0, mt.steelD, 14);
            cyl(root, 0.5, 0.5, 0.04, BX, 0.67, 0, mt.steelL, 40);
            /* recipiente + suelo */
            var dish = new THREE.Group(); root.add(dish);
            cyl(dish, 0.3, 0.26, 0.16, 0, 0.08, 0, mt.alum, 28);
            var mound = new THREE.Mesh(new THREE.SphereGeometry(0.25, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(0x5b3a22, 0, 0.95));
            mound.position.y = 0.16; mound.scale.y = 0.55; dish.add(mound);
            /* vapor */
            var steam = []; for (var i = 0; i < 5; i++) { var sm = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xe6f4ff, transparent: true, opacity: 0, depthWrite: false })); sm.position.set(X0 + 0.8, 2.7, -0.3); root.add(sm); steam.push(sm); }
            var pins = [{ v: [X0, 1.8, 0.9] }, { v: [X0, 2.7, 0.9] }, { v: [BX, 0.95, 0.2] }, { v: [BX + 0.5, 0.95, 0] }, { v: [BX, 0.55, 0.7] }, { v: [X0 - 0.4, 0.5, 1.05] }];
            var cDark = new THREE.Color(0x5b3a22), cLight = new THREE.Color(0xbc9668);
            function set(p, prm) {
                var S = stateOf(prm, p), Tf = clamp((S.T - 22) / 88, 0, 1);
                var tIn = ease((p - 0.10) / 0.05), tOut = ease((p - 0.85) / 0.05);
                var k = tIn * (1 - tOut), sx = lerp(BX, X0, k), sy = lerp(0.69, 1.14, k) + Math.sin(k * Math.PI) * 0.9;
                dish.position.set(sx, sy, lerp(0, 0, k));
                var open = Math.max(0, ease((p - 0.06) / 0.04) - ease((p - 0.17) / 0.04), ease((p - 0.79) / 0.04) - ease((p - 0.93) / 0.04));
                door.rotation.y = -1.9 * open;
                glowM.emissiveIntensity = 0.9 * Tf;
                mound.material.color.copy(cDark).lerp(cLight, 1 - (S.ph === 1 ? S.wet : (S.ph === 0 ? 1 : 0)));
                mound.scale.set(1, 0.35 + 0.4 * (S.m / Math.max(prm.P.Wh, 1)), 1);
                scr.lcd(fmt(S.T, 0) + ' °C', 'HORNO', S.T > 60 ? '#fdba74' : '#86efac');
                var reading = S.ph === 1 ? 0 : (S.ph === 0 ? prm.P.Wh + prm.P.tara : prm.M.Ws + prm.P.tara);
                bscr.lcd(fmt(reading, 2) + ' g', 'BALANZA');
                steam.forEach(function (sm, i) {
                    var on = S.ph === 1 && S.wet > 0.05 && open < 0.2, ph = ((p * 55 + i * 0.21) % 1);
                    sm.position.y = 2.75 + ph * 0.9; sm.position.x = X0 + 0.8 + Math.sin(ph * 6 + i) * 0.1; sm.scale.setScalar(0.6 + ph * 1.4);
                    sm.material.opacity = on ? 0.45 * (1 - ph) : 0;
                });
                return { hud: hud4({ k: 't', v: fmt(S.tH, 1), u: 'h' }, { k: 'T', v: fmt(S.T, 0), u: '°C' }, { k: 'Masa', v: fmt(S.m, 2), u: 'g' }, { k: 'w', v: fmt(S.wNow, 2), u: '%' }), phase: S.ph };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       2 · GRANULOMETRÍA — tamizadora con columna de tamices
    =================================================================== */
    var SIEVE_NAMES = ['3/4"', '3/8"', 'No.4', 'No.10', 'No.40', 'No.100', 'No.200'];
    L3.register('granulometria', {
        meta: {
            accent: '#F59E0B', machine: 'Tamizadora con columna de tamices', machineSub: 'Siete tamices de malla decreciente y fondo recolector',
            norma: 'ASTM D6913 / D422 · INV E-123', duration: 18,
            phases: [
                { a: 0.00, b: 0.10, t: 'Cargar la muestra', d: 'Se vierte la masa seca sobre el tamiz superior.' },
                { a: 0.10, b: 0.80, t: 'Tamizar con vibración', d: 'Cada fracción queda retenida en su malla; el resto desciende.' },
                { a: 0.80, b: 1.01, t: 'Pesar lo retenido', d: 'Con las masas se obtiene la curva granulométrica.' }
            ],
            parts: [
                { name: 'Tamizadora (motor)', desc: 'Vibra la columna para que las partículas atraviesen las mallas.' },
                { name: 'Columna de tamices', desc: 'Del más grueso (arriba) al más fino (abajo).' },
                { name: 'Malla del tamiz', desc: 'Su abertura define el diámetro que retiene.' },
                { name: 'Fondo recolector', desc: 'Recibe el material que pasa el tamiz No. 200.' },
                { name: 'Tapa y sujeción', desc: 'Mantiene la columna firme durante la vibración.' },
                { name: 'Temporizador', desc: 'Controla la duración del tamizado (≈ 15 min).' }
            ],
            cam: { target: [0, 1.9, 0], home: { theta: 0.55, phi: 1.12, radius: 8.6 }, frontal: { theta: 0, phi: 1.3, radius: 8.8 }, lateral: { theta: 1.4, phi: 1.2, radius: 8.2 }, detalle: { theta: 0.4, phi: 1.15, radius: 4.8, target: [0, 2.0, 0] } }
        },
        params: paramsFrom('granulometria'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 5.6, 4.0, accent);
            box(root, 2.5, 0.8, 1.9, 0, 0.45, 0, mt.mint);
            var tscr = screen(root, 0.9, 0.26, 0.5, 0.52, 0.96, 256, 72);
            cyl(root, 0.1, 0.1, 0.06, -0.6, 0.52, 0.97, mt.red, 16).rotation.x = Math.PI / 2;
            cyl(root, 1.05, 1.05, 0.1, 0, 0.9, 0, mt.steelM, 48);
            var stack = new THREE.Group(); stack.position.y = 0.95; root.add(stack);
            var n = 7, gapH = 0.3, y0 = 0.14;
            /* fondo */
            cyl(stack, 0.86, 0.8, 0.26, 0, 0.13, 0, mt.steelL, 40);
            var panPile = new THREE.Mesh(new THREE.ConeGeometry(0.6, 0.3, 24), M(0xcfae7c, 0, 0.95)); panPile.position.set(0, 0.2, 0); stack.add(panPile);
            var piles = [], meshMat = new THREE.MeshBasicMaterial({ color: 0x9aa7b8, wireframe: true, transparent: true, opacity: 0.55 });
            for (var i = 0; i < n; i++) {
                var yy = y0 + 0.12 + (n - 1 - i) * gapH + 0.2;
                var frame = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.26, 40, 1, true), mt.brass); frame.material.side = THREE.DoubleSide; frame.position.y = yy; frame.castShadow = true; stack.add(frame);
                var rim = new THREE.Mesh(new THREE.TorusGeometry(0.88, 0.025, 8, 40), mt.brass); rim.rotation.x = Math.PI / 2; rim.position.y = yy + 0.13; stack.add(rim);
                var disc = new THREE.Mesh(new THREE.CircleGeometry(0.84, 28), meshMat); disc.rotation.x = -Math.PI / 2; disc.position.y = yy - 0.1; stack.add(disc);
                var pile = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.22, 20), M(0xd8b98a, 0, 0.95)); pile.userData.yb = yy - 0.09; pile.position.set(0, yy - 0.09, 0); pile.scale.y = 0.01; stack.add(pile); piles.push(pile);
            }
            var topY = y0 + 0.12 + (n - 1) * gapH + 0.2 + 0.2;
            cyl(stack, 0.9, 0.9, 0.08, 0, topY, 0, mt.steelL, 40);
            cyl(stack, 0.12, 0.12, 0.12, 0, topY + 0.1, 0, mt.dark, 16);
            [-1, 1].forEach(function (s) { cyl(root, 0.04, 0.04, 2.7, s * 0.98, 2.3, 0, mt.steelD, 10); });
            box(root, 2.2, 0.06, 0.14, 0, 3.62, 0, mt.steelD);
            var pins = [{ v: [-1.2, 0.5, 0.95] }, { v: [1.0, 2.0, 0.5] }, { v: [0.8, 1.9, 0.3] }, { v: [0.85, 1.1, 0.3] }, { v: [0.0, 3.7, 0] }, { v: [0.5, 0.85, 1.0] }];
            function set(p, prm) {
                var S = stateOf(prm, p), shaking = S.ph === 1 && p < 1 ? 1 : 0, tt = p * 900;
                stack.position.x = Math.sin(tt) * 0.025 * shaking; stack.position.z = Math.cos(tt * 1.3) * 0.02 * shaking;
                var mx = Math.max(prm.P.M * 0.25, 1);
                for (var i = 0; i < n; i++) { var h = clamp(S.live[i] / mx, 0, 1.4); piles[i].scale.y = Math.max(0.01, h * 1.6); piles[i].scale.x = piles[i].scale.z = 0.6 + Math.min(0.4, h * 0.5); piles[i].position.y = piles[i].userData.yb + 0.11 * piles[i].scale.y; }
                panPile.scale.y = Math.max(0.05, clamp(S.live[n] / mx * 1.6, 0.05, 1.6)); panPile.position.y = 0.26 + 0.15 * panPile.scale.y;
                tscr.lcd(fmt(S.tMin, 1) + ' min', 'TIMER');
                return { hud: hud4({ k: 't', v: fmt(S.tMin, 1), u: 'min' }, { k: 'Fondo', v: fmt(S.pan, 1), u: 'g' }, { k: 'Pasa 200', v: fmt(S.p200, 1), u: '%' }, { k: 'Masa', v: fmt(prm.P.M, 0), u: 'g' }), phase: S.ph };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       3 · LÍMITES — copa de Casagrande
    =================================================================== */
    L3.register('limites', {
        meta: {
            accent: '#34D399', machine: 'Copa de Casagrande', machineSub: 'Copa de bronce, base de caucho duro, leva y manivela',
            norma: 'ASTM D4318 · INV E-125 / E-126', duration: 18,
            phases: [
                { a: 0.00, b: 0.06, t: 'Trazar la ranura', d: 'El acanalador divide la pasta de suelo en dos mitades.' },
                { a: 0.06, b: 0.94, t: 'Girar la manivela', d: 'La copa se eleva 10 mm y cae contra la base; se cuentan los golpes.' },
                { a: 0.94, b: 1.01, t: 'Ranura cerrada', d: 'Se registra N y la humedad: un punto de la curva de flujo.' }
            ],
            parts: [
                { name: 'Base de caucho duro', desc: 'Superficie contra la que cae la copa.' },
                { name: 'Copa de bronce', desc: 'Recipiente de la pasta de suelo; cae 10 mm en cada golpe.' },
                { name: 'Muestra con ranura', desc: 'La ranura de 2 mm se cierra por los golpes.' },
                { name: 'Manivela y leva', desc: 'Elevan y sueltan la copa (2 golpes por segundo).' },
                { name: 'Contador de golpes', desc: 'Registra N hasta que la ranura se cierra 13 mm.' },
                { name: 'Acanalador', desc: 'Herramienta normalizada para abrir la ranura.' }
            ],
            cam: { target: [0, 0.9, 0], home: { theta: 0.6, phi: 1.05, radius: 6.4 }, frontal: { theta: 0, phi: 1.2, radius: 6.6 }, lateral: { theta: 1.4, phi: 1.2, radius: 6.2 }, detalle: { theta: 0.4, phi: 0.95, radius: 3.6, target: [0, 0.7, 0.3] } }
        },
        params: paramsFrom('limites'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 5.4, 3.4, accent);
            box(root, 2.4, 0.4, 1.9, 0, 0.26, 0, mt.rubber);
            box(root, 2.6, 0.12, 2.1, 0, 0.12, 0, mt.steelD);
            box(root, 0.36, 1.3, 0.3, 0, 0.9, -0.85, mt.steelM);                             /* columna */
            var arm = new THREE.Group(); arm.position.set(0, 0.62, -0.7); root.add(arm);      /* brazo con bisagra atrás */
            var cup = new THREE.Mesh(new THREE.SphereGeometry(0.68, 40, 20, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mt.brass);
            cup.material.side = THREE.DoubleSide; cup.position.set(0, 0.3, 0.85); cup.castShadow = true; arm.add(cup);
            var rim = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.03, 10, 40), mt.brass); rim.rotation.x = Math.PI / 2; rim.position.set(0, 0.3, 0.85); arm.add(rim);
            box(arm, 0.2, 0.1, 0.9, 0, 0.35, 0.3, mt.steelM);
            var soil = new THREE.Mesh(new THREE.CylinderGeometry(0.64, 0.5, 0.2, 40), M(0x8a6b4a, 0, 0.95)); soil.position.set(0, 0.2, 0.85); arm.add(soil);
            var groove = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 1.28), M(0xb9962b, 0.1, 0.8)); groove.position.set(0, 0.31, 0.85); arm.add(groove);
            /* manivela */
            var crank = new THREE.Group(); crank.position.set(1.28, 0.62, -0.2); root.add(crank);
            cylX(crank, 0.34, 0.34, 0.12, 0, 0, 0, mt.steelL, 32);
            box(crank, 0.1, 0.1, 0.62, 0.1, 0, 0.3, mt.steelM); var knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), mt.red); knob.position.set(0.1, 0, 0.62); crank.add(knob);
            box(root, 0.3, 0.5, 0.3, 1.1, 0.45, -0.2, mt.steelD);
            /* contador */
            box(root, 1.0, 0.5, 0.5, -1.6, 0.31, 0.9, mt.mint);
            var cscr = screen(root, 0.8, 0.28, -1.6, 0.34, 1.16, 256, 90);
            /* acanalador */
            var tool = new THREE.Group(); tool.position.set(-1.7, 0.1, -0.5); root.add(tool);
            box(tool, 0.12, 0.7, 0.12, 0, 0.45, 0, mt.dark); box(tool, 0.5, 0.05, 0.1, 0, 0.14, 0, mt.steelL);
            var pins = [{ v: [0, 0.55, 0.9] }, { v: [0.7, 0.75, 1.0] }, { v: [0, 0.5, 1.5] }, { v: [1.4, 0.95, 0.1] }, { v: [-1.6, 0.8, 1.1] }, { v: [-1.7, 0.95, -0.5] }];
            function set(p, prm) {
                var S = stateOf(prm, p), N = S.N, fr = N - Math.floor(N), run = S.ph === 1 && p < 1;
                var lift = run ? (fr < 0.5 ? ease(fr * 2) : 1 - Math.pow((fr - 0.5) * 2, 3)) : 0;
                if (run && fr > 0.92) lift = 0;
                arm.rotation.x = -0.12 * lift;
                crank.rotation.x = N * Math.PI * 2;
                var gw = 0.02 + 0.2 * clamp(S.gap / 2, 0, 1);
                groove.scale.x = gw / 0.2; groove.visible = S.gap > 0.05;
                cscr.lcd(String(Math.floor(N)), 'GOLPES', '#5eead4');
                return { hud: hud4({ k: 'Golpes', v: fmt(N, 0), u: 'N' }, { k: 'Ranura', v: fmt(S.gap, 1), u: 'mm' }, { k: 'w', v: fmt(S.w, 1), u: '%' }, { k: 'LL', v: fmt(S.LL, 0), u: '%' }), phase: S.ph };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       4 · GRAVEDAD ESPECÍFICA — picnómetro, vacío y balanza
    =================================================================== */
    L3.register('gravedad', {
        meta: {
            accent: '#F472B6', machine: 'Picnómetro con bomba de vacío y balanza', machineSub: 'Matraz aforado de 500 mL, bomba de vacío y balanza',
            norma: 'ASTM D854 · INV E-128', duration: 20,
            phases: [
                { a: 0.00, b: 0.15, t: 'Pesar picnómetro + agua', d: 'Se registra Wpw a la temperatura del ensayo.' },
                { a: 0.15, b: 0.30, t: 'Verter el suelo', d: 'La masa seca Ws se introduce con cuidado.' },
                { a: 0.30, b: 0.80, t: 'Aplicar vacío', d: 'Se extrae el aire atrapado entre las partículas.' },
                { a: 0.80, b: 0.92, t: 'Aforar', d: 'Se completa con agua hasta la marca.' },
                { a: 0.92, b: 1.01, t: 'Pesar Wpws', d: 'Gs = Ws / (Ws + Wpw − Wpws), corregido por temperatura.' }
            ],
            parts: [
                { name: 'Picnómetro de 500 mL', desc: 'Matraz aforado de volumen conocido.' },
                { name: 'Suspensión suelo-agua', desc: 'Suelo en el fondo; las burbujas de aire deben salir.' },
                { name: 'Bomba de vacío', desc: 'Extrae el aire atrapado en la suspensión.' },
                { name: 'Manguera y tapón', desc: 'Conectan el picnómetro a la bomba.' },
                { name: 'Balanza', desc: 'Pesa Wpw y Wpws con 0,01 g.' },
                { name: 'Marca de aforo', desc: 'Línea hasta donde se llena el picnómetro.' }
            ],
            cam: { target: [0, 1.5, 0], home: { theta: 0.5, phi: 1.12, radius: 9.6 }, frontal: { theta: 0, phi: 1.28, radius: 9.8 }, lateral: { theta: 1.35, phi: 1.2, radius: 9 }, detalle: { theta: 0.3, phi: 1.2, radius: 5.4, target: [0, 1.5, 0] } }
        },
        params: paramsFrom('gravedad'),
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 8.6, 3.6, accent);
            var BX = 2.6;
            box(root, 1.7, 0.3, 1.3, BX, 0.21, 0, mt.mint);
            var bscr = screen(root, 1.0, 0.2, BX, 0.26, 0.66, 256, 56);
            cyl(root, 0.09, 0.09, 0.3, BX, 0.5, 0, mt.steelD, 14); cyl(root, 0.55, 0.55, 0.04, BX, 0.67, 0, mt.steelL, 40);
            /* bomba */
            var PX = -2.6;
            box(root, 1.5, 1.0, 1.1, PX, 0.56, 0, mt.slate);
            cyl(root, 0.11, 0.11, 0.22, PX + 0.4, 1.17, 0, mt.dark, 12);
            var gauge = K.makeDial(root, PX - 0.2, 0.75, 0.57, 0.28, mt.steelL && { chrome: mt.steelL, white: mt.white, accent: M(0xF472B6, 0.3, 0.4), black: mt.dark, red: mt.red });
            /* picnómetro */
            var pic = new THREE.Group(); root.add(pic);
            var profile = [[0.001, 0.06], [0.7, 0.06], [0.92, 0.2], [0.98, 0.9], [0.9, 1.35], [0.45, 1.9], [0.2, 2.2], [0.17, 2.8], [0.2, 2.9]];
            var flask = lathe(profile, glassM(0.28), 40); pic.add(flask);
            var wBody = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 0.93, 1.15, 36), waterM(0.55)); wBody.position.y = 0.66; pic.add(wBody);
            var wCone = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.9, 0.6, 36), waterM(0.55)); wCone.position.y = 1.55; pic.add(wCone);
            var wNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1, 20), waterM(0.6)); wNeck.position.y = 2.25; pic.add(wNeck);
            var soilP = new THREE.Mesh(new THREE.ConeGeometry(0.75, 0.42, 28), M(0xc6a27a, 0, 0.95)); soilP.position.y = 0.3; soilP.scale.y = 0.01; pic.add(soilP);
            var mark = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 8, 28), M(0xF472B6, 0.2, 0.4)); mark.rotation.x = Math.PI / 2; mark.position.y = 2.45; pic.add(mark);
            var bubbles = []; for (var i = 0; i < 16; i++) { var b = new THREE.Mesh(new THREE.SphereGeometry(0.045 + (i % 3) * 0.015, 8, 6), new THREE.MeshBasicMaterial({ color: 0xe8f6ff, transparent: true, opacity: 0.8 })); pic.add(b); bubbles.push(b); }
            /* tapón y manguera */
            var cap = new THREE.Group(); cap.position.y = 3.0; pic.add(cap); cyl(cap, 0.24, 0.2, 0.28, 0, 0, 0, mt.rubber, 20); cyl(cap, 0.07, 0.07, 0.3, 0, 0.22, 0, mt.steelL, 10);
            var hose = tube(root, [[PX + 0.4, 1.3, 0], [PX + 0.4, 2.4, 0], [-1.2, 3.9, 0], [0, 3.8, 0], [0, 3.4, 0]], 0.05, mt.rubber);
            var pins = [{ v: [0.0, 1.0, 0.9] }, { v: [0.0, 0.5, 0.9] }, { v: [PX, 1.3, 0] }, { v: [-0.9, 3.8, 0] }, { v: [BX, 0.95, 0] }, { v: [0.3, 2.45, 0.2] }];
            function set(p, prm) {
                var S = stateOf(prm, p);
                var leave = ease((p - 0.12) / 0.04), back = ease((p - 0.90) / 0.04), k = leave * (1 - back);
                pic.position.set(lerp(BX, 0, k), lerp(0.69, 0.06, k), 0);
                var lvl = S.ph === 0 ? 0 : (S.ph === 1 ? 0.06 * S.pour : (S.ph === 2 ? 0.06 : 0));
                wNeck.scale.y = 0.6 + lvl; wNeck.position.y = 1.95 + (0.6 + lvl) * 0.5;
                wBody.visible = wCone.visible = true;
                soilP.scale.y = Math.max(0.01, S.pour * 1.1);
                var vac = S.ph === 2;
                cap.visible = hose.visible = vac;
                var left = 1 - S.air / 100;
                bubbles.forEach(function (b, i) {
                    var on = vac && i < Math.round(16 * left) + 1, ph = ((p * 60 + i * 0.137) % 1);
                    b.visible = on; b.position.set(Math.sin(i * 12.9) * 0.55 * (1 - ph * 0.7), 0.35 + ph * 2.0, Math.cos(i * 7.3) * 0.45 * (1 - ph * 0.7));
                });
                gauge.rotation.z = vac ? -2.2 : 0;
                bscr.lcd(fmt(S.ph === 0 ? S.Wpw : (S.ph === 4 ? S.Wpws : 0), 2) + ' g', S.ph === 0 ? 'Wpw' : S.ph === 4 ? 'Wpws' : '');
                return { hud: hud4({ k: 't vacío', v: fmt(S.tV, 0), u: 'min' }, { k: 'Aire', v: fmt(S.air, 0), u: '%' }, { k: 'Wpws', v: S.Wpws ? fmt(S.Wpws, 2) : '—', u: S.Wpws ? 'g' : '' }, { k: 'Gs', v: S.Gs ? fmt(S.Gs, 3) : '—', u: '' }), phase: S.ph };
            }
            return { root: root, pins: pins, set: set };
        }
    });
})(window);
