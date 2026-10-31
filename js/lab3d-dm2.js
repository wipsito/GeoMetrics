/**
 * GeoMetrics — Laboratorio 3D · Diseño de Mezclas (parte 2: ensayos de laboratorio)
 *   dm_gran   · Granulometría de agregados (tamizadora)         NTC 77 · ASTM C136
 *   dm_punit  · Peso unitario y vacíos del agregado             NTC 92 · ASTM C29
 *   dm_hum    · Humedad del agregado (horno)                    NTC 1776 · ASTM C566
 *   dm_fresco · Peso unitario y aire del concreto fresco        NTC 1926 · ASTM C138 / C231
 * Requiere lab3d-dm.js (L3.dm).
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D;
    if (!L3 || !L3.kit || !L3.lib || !L3.dm || L3.__dm2) return;
    L3.__dm2 = true;
    var K = L3.kit, L = L3.lib, D = L3.dm, M = K.M, box = K.box, cyl = K.cyl, clamp = K.clamp, lerp = K.lerp, ease = K.ease, fmt = K.fmt;
    var screen = L.screen, bench = L.bench, mats = L.mats;
    var tw = D.tw, sm = D.sm, mixCol = D.mixCol, simP = D.simP, MZ = D.MZ, CC = D.CC, num = D.num, setLine = D.setLine, lineStream = D.lineStream, drawDial = D.drawDial;

    var merge = D.merge, nOV = D.nOV, notaMod = D.notaMod;
    function ACIsrc() { var m = MZ(); return (m && m.lastACI) || null; }
    function scale3(m, x, y, z) { m.scale.set(x, y, z); }

    /* ===================================================================
       1 · GRANULOMETRÍA — tamizadora con columna de tamices
    =================================================================== */
    var SZ = [{ n: 'N.º 4', mm: 4.75 }, { n: 'N.º 8', mm: 2.36 }, { n: 'N.º 16', mm: 1.18 }, { n: 'N.º 30', mm: 0.6 }, { n: 'N.º 50', mm: 0.3 }, { n: 'N.º 100', mm: 0.15 }];
    function paramsGran() {
        var m = MZ(), P = merge({ tot: 500, arena: 'media' }, 'dm_gran'), pas = [98, 88, 68, 46, 21, 7];
        if (m && m._m && m._m.ARENAS && m._m.ARENAS[P.arena]) { var a = m._m.ARENAS[P.arena].p; pas = [a[5], a[6], a[7], a[8], a[9], a[10]]; }
        var prev = 100, ret = [], i, acc = 0;
        for (i = 0; i < 6; i++) { ret.push((prev - pas[i]) / 100 * P.tot); prev = pas[i]; }
        ret.push(pas[5] / 100 * P.tot);
        for (i = 0; i < 6; i++) acc += (100 - pas[i]);
        P.ret = ret; P.pas = pas; P.mf = acc / 100;
        return { P: P, real: false, nota: notaMod('dm_gran', 'Arena ' + P.arena + ' de la base del simulador, ' + fmt(P.tot, 0) + ' g de muestra seca (MF ≈ ' + fmt(P.mf, 2) + '). Ingresa tus masas en el ensayo de Granulometría para compararlas.') };
    }
    L3.register('dm_gran', {
        meta: {
            accent: '#F59E0B', machine: 'Tamizadora con columna de tamices', machineSub: 'Plataforma vibratoria, tamices N.º 4 a N.º 100, fondo, tapa y balanza',
            norma: 'NTC 77 · ASTM C136', duration: 26,
            phases: [
                { a: 0.00, b: 0.18, t: 'Pesar y verter la muestra', d: 'Se pesa la masa seca inicial y se vierte sobre el tamiz superior.' },
                { a: 0.18, b: 0.66, t: 'Tamizado por vibración', d: 'La columna vibra ≈ 10 min: cada tamiz retiene lo mayor que su abertura.' },
                { a: 0.66, b: 0.88, t: 'Pesar lo retenido', d: 'Se pesa el material de cada tamiz y del fondo; la suma debe ser ≈ la muestra (± 0.3 %).' },
                { a: 0.88, b: 1.01, t: 'Calcular % pasa y MF', d: '% retenido acumulado por tamiz; MF = Σ % retenido acumulado / 100.' }
            ],
            parts: [
                { name: 'Plataforma vibratoria', desc: 'Agita la columna con movimiento horizontal y golpeteo.' },
                { name: 'Tamiz superior (N.º 4)', desc: 'Abertura 4.75 mm; retiene la fracción más gruesa.' },
                { name: 'Columna de tamices', desc: 'Aberturas decrecientes de arriba hacia abajo.' },
                { name: 'Fondo', desc: 'Recibe lo que pasa el N.º 100.' },
                { name: 'Balanza', desc: 'Precisión de 0.1 g para pesar cada fracción.' },
                { name: 'Tabla de resultados', desc: '% retenido, acumulado y % pasa por tamiz.' }
            ],
            cam: { target: [0, 2.6, 0], home: { theta: 0.6, phi: 1.16, radius: 12.4 }, frontal: { theta: 0, phi: 1.3, radius: 12.8 }, lateral: { theta: 1.45, phi: 1.2, radius: 12 }, detalle: { theta: 0.35, phi: 1.2, radius: 6.4, target: [-0.6, 2.7, 0] } }
        },
        params: paramsGran,
        build: function (accent) {
            var root = new THREE.Group(), mt = mats(), SX = -0.9;
            bench(root, 10, 4.6, accent);
            var amber = M(0x9a6a1a, 0.5, 0.45);
            box(root, 3.2, 0.9, 2.4, SX, 0.5, 0, amber);
            var plat = new THREE.Group(); plat.position.set(SX, 0.95, 0); root.add(plat);
            cyl(plat, 1.35, 1.35, 0.12, 0, 0.06, 0, mt.steelD, 40);
            var stack = new THREE.Group(); stack.position.y = 0.12; plat.add(stack);
            var sandM = L.speckle('#b09a6a', 4200, 70, 175, 2, 2, 2), rims = [0xc9d2d9, 0xb08a3c];
            var HC = 0.5, STEP = 0.52, cont = [], i;
            function wallM() { return new THREE.MeshStandardMaterial({ color: 0xc9d2d9, metalness: 0.8, roughness: 0.3, transparent: true, opacity: 0.38, side: THREE.DoubleSide, depthWrite: false }); }
            for (i = 6; i >= 0; i--) {
                var idx = 6 - i, by = idx * STEP;         /* i=6 → fondo (abajo) … i=0 → N.º 4 (arriba) */
                var w = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, HC, 40, 1, true), wallM()); w.position.y = by + HC / 2; stack.add(w);
                var rim = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.045, 8, 40), M(rims[i % 2], 0.7, 0.35)); rim.rotation.x = Math.PI / 2; rim.position.y = by + HC; stack.add(rim);
                if (i === 6) cyl(stack, 1.05, 1.05, 0.05, 0, by + 0.03, 0, mt.steelD, 40);
                else { var mesh = cyl(stack, 1.04, 1.04, 0.025, 0, by + 0.03, 0, new THREE.MeshStandardMaterial({ color: 0xb8c2cc, metalness: 0.7, roughness: 0.5, transparent: true, opacity: 0.55 }), 40); mesh.castShadow = false; }
                var pile = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.98, 1, 28), sandM); pile.castShadow = true; stack.add(pile);
                cont[i] = { base: by + 0.05, pile: pile };
            }
            var topY = 6 * STEP + HC;
            var lid = new THREE.Group(); stack.add(lid);
            cyl(lid, 1.15, 1.15, 0.1, 0, 0, 0, mt.steelM, 40); cyl(lid, 0.2, 0.2, 0.18, 0, 0.12, 0, mt.steelD, 16);
            var hold = new THREE.Group(); plat.add(hold);
            [-1.25, 1.25].forEach(function (x) { cyl(hold, 0.04, 0.04, topY + 0.7, x, (topY + 0.7) / 2 + 0.1, 0, mt.steelL, 8); });
            var ring = new THREE.Mesh(new THREE.TorusGeometry(1.2, 0.05, 8, 44), new THREE.MeshBasicMaterial({ color: 0xfbbf24 })); ring.rotation.x = Math.PI / 2; ring.visible = false; stack.add(ring);
            var cup = new THREE.Group(); root.add(cup);
            cyl(cup, 0.4, 0.28, 0.5, 0, 0, 0, M(0xd9dde2, 0.4, 0.45), 20);
            var cupFill = cyl(cup, 0.37, 0.27, 0.06, 0, 0.2, 0, sandM, 20);
            var pour = lineStream(root, 0xdcc08a, 0.05);
            /* balanza */
            var bal = new THREE.Group(); bal.position.set(3.9, 0, 0.3); root.add(bal);
            box(bal, 2.2, 0.5, 2.0, 0, 0.25, 0, mt.dark); cyl(bal, 0.8, 0.8, 0.1, 0, 0.55, 0, mt.steelL, 30);
            var bscr = screen(bal, 1.6, 0.4, 0, 0.3, 1.01, 400, 100);
            var balMat = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.2, 20), sandM); balMat.position.set(0, 0.7, 0); bal.add(balMat);
            var board = new THREE.Group(); board.position.set(SX, 3.2, -2.1); root.add(board);
            box(board, 4.7, 2.7, 0.1, 0, 0, 0, mt.dark);
            var ts = screen(board, 4.5, 2.5, 0, 0, 0.06, 900, 500);
            var pins = [{ v: [SX + 1.4, 0.9, 1.2] }, { v: [SX + 0.9, 3.5, 0.6] }, { v: [SX + 1.1, 2.0, 0.8] }, { v: [SX + 1.0, 1.1, 0.8] }, { v: [3.9, 0.9, 0.3] }, { v: [SX, 4.7, -2.0] }];
            var lastIn = '';
            function set(p, prm) {
                var P = prm.P, tot = P.tot, ret = P.ret, A = [], acc = 0, q;
                for (q = 0; q < 6; q++) { acc += ret[q]; A.push(acc); }
                var shake = tw(p, 0.2, 0.62), sh = p > 0.2 && p < 0.64 ? 1 : 0;
                plat.position.x = SX + sh * 0.035 * Math.sin(p * 900); plat.position.z = sh * 0.03 * Math.cos(p * 770);
                var pourK = sm(p, 0.03, 0.14), passed = [], contM = [];
                for (q = 0; q < 6; q++) passed.push(sm(p, 0.2 + 0.045 * q, 0.6 + 0.014 * q) * (tot - A[q]));
                for (q = 0; q < 7; q++) {
                    var arr = q === 0 ? tot * pourK : passed[q - 1], out = q < 6 ? passed[q] : 0;
                    contM.push(Math.max(0, arr - out));
                }
                var wsel = clamp(Math.floor(tw(p, 0.68, 0.86) * 7), 0, 6), weighing = p >= 0.66 && p < 0.88;
                for (q = 0; q < 7; q++) {
                    var m = contM[q], h = m <= 0.05 ? 0 : 0.03 + Math.pow(m / 160, 0.7) * 0.34, c = cont[q];
                    c.pile.visible = h > 0.001; c.pile.scale.set(1, Math.max(0.001, h), 1); c.pile.position.y = c.base + h / 2;
                }
                var rise = p < 0.4 ? 1 - sm(p, 0.15, 0.22) : sm(p, 0.64, 0.7);
                lid.position.y = topY + 0.08 + rise * 2.0;
                /* vaso con muestra → vierte al tamiz superior */
                var pourPhase = p < 0.16, cupT = pourPhase ? 1 - sm(p, 0.1, 0.16) : 0;
                cup.visible = p < 0.17;
                var cx = SX + 0.1 + (1 - sm(p, 0.0, 0.03)) * 2.2, cy = topY + 1.6 + 0.7 * (1 - sm(p, 0.0, 0.03));
                cup.position.set(pourPhase && p > 0.02 ? SX + 0.2 : cx, cy + 0.12, 0.35); cup.rotation.z = -sm(p, 0.025, 0.06) * 1.2 * (1 - sm(p, 0.12, 0.16));
                cupFill.visible = pourK < 0.98; cupFill.scale.y = 1 + 4 * (1 - pourK);
                setLine(pour, SX + 0.45, cy - 0.05, 0.35, SX + 0.1, topY + 0.1 + 0.2 * pourK, 0, pourPhase && p > 0.04 && p < 0.14, 0.04);
                ring.visible = weighing; if (weighing) ring.position.y = cont[wsel].base + HC / 2 - 0.05;
                balMat.visible = weighing || p < 0.03; balMat.scale.y = weighing ? Math.max(0.1, contM[wsel] / 140) : 1;
                var bt = '0.0 g', bs = 'MUESTRA';
                if (p < 0.12) { bt = fmt(tot * sm(p, 0.0, 0.03), 1) + ' g'; bs = 'M₀ muestra seca'; }
                else if (p < 0.66) { bt = 't = ' + fmt(shake * 10, 1) + ' min'; bs = sh ? 'Tamizando…' : 'Listo'; }
                else if (p < 0.88) { bt = fmt(wsel < 6 ? ret[wsel] : ret[6], 1) + ' g'; bs = wsel < 6 ? SZ[wsel].n : 'Fondo'; }
                else { bt = 'MF ' + fmt(P.mf, 2); bs = 'Σ ret / 100'; }
                bscr.draw(bt + bs, function (g, W, H) { g.fillStyle = '#0b1a10'; g.fillRect(0, 0, W, H); g.fillStyle = '#86efac'; g.font = 'bold 46px monospace'; g.textAlign = 'right'; g.fillText(bt, W - 14, 74); g.font = 'bold 20px sans-serif'; g.textAlign = 'left'; g.fillText(bs, 12, 26); });
                var rows = p < 0.66 ? 0 : p >= 0.88 ? 7 : Math.min(7, Math.floor(tw(p, 0.66, 0.88) * 7) + 1), res = p >= 0.88;
                var k2 = rows + '|' + (res ? 1 : 0);
                if (k2 !== lastIn) {
                    lastIn = k2;
                    ts.draw(k2, function (g, W, H) {
                        g.fillStyle = '#0d1a2b'; g.fillRect(0, 0, W, H); g.fillStyle = '#fbbf24'; g.font = 'bold 34px sans-serif'; g.textAlign = 'left';
                        g.fillText('Granulometría · arena (500 g)', 30, 52);
                        var cols = [30, 250, 450, 650, 830], hd = ['Tamiz', 'Ret. (g)', '% Ret.', '% Ret. ac.', '% Pasa'];
                        g.font = 'bold 26px sans-serif'; g.fillStyle = '#9fb3c8'; hd.forEach(function (t, i) { g.textAlign = i ? 'right' : 'left'; g.fillText(t, cols[i] + (i ? 90 : 0), 100); });
                        var cum = 0;
                        for (var r = 0; r < 7; r++) {
                            var yy = 148 + r * 48, mm = r < 6 ? ret[r] : ret[6], pr = mm / tot * 100; cum += pr;
                            g.globalAlpha = r < rows ? 1 : 0.18; g.fillStyle = '#e6f3ff'; g.font = '26px monospace';
                            var vals = [r < 6 ? SZ[r].n : 'Fondo', fmt(mm, 1), fmt(pr, 1), r < 6 ? fmt(cum, 1) : '—', r < 6 ? fmt(100 - cum, 1) : '—'];
                            vals.forEach(function (t, i) { g.textAlign = i ? 'right' : 'left'; g.fillText(t, cols[i] + (i ? 90 : 0), yy); });
                        }
                        g.globalAlpha = 1; if (res) { g.fillStyle = '#34d399'; g.font = 'bold 40px sans-serif'; g.textAlign = 'left'; g.fillText('MF = ' + fmt(P.mf, 2), 30, 480); }
                    });
                }
                var cur = p < 0.66 ? '—' : (wsel < 6 ? SZ[wsel].n : 'Fondo');
                return { hud: [{ k: 'Muestra', v: fmt(tot * pourK, 0), u: 'g' }, { k: 'Tamiz', v: weighing ? cur : '—', u: '' }, { k: 'Retenido', v: weighing ? fmt(wsel < 6 ? ret[wsel] : ret[6], 1) : '—', u: 'g' }, { k: 'MF', v: p >= 0.88 ? fmt(P.mf, 2) : '—', u: '' }] };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       2 · PESO UNITARIO Y VACÍOS — recipiente, varilla y balanza
    =================================================================== */
    function paramsPunit() {
        var S = ACIsrc(), P = merge({ puc: S && S.puc ? S.puc : 1600, gs: S && S.gsG ? S.gsG : 2.7, Vl: 14.158, T: 4.8 }, 'dm_punit');
        P.V = P.Vl / 1000; P.neto = P.puc * P.V; P.vac = (1 - P.puc / (P.gs * 1000)) * 100;
        return { P: P, real: !!S && !nOV('dm_punit'), nota: notaMod('dm_punit', S ? 'Con el PUC (' + fmt(P.puc, 0) + ' kg/m³) y Gs (' + P.gs + ') de tu diseño ACI.' : 'Valores de ejemplo: grava con PUC = 1600 kg/m³, Gs = 2.70 y recipiente de ½ pie³ (14.2 L).') };
    }
    L3.register('dm_punit', {
        meta: {
            accent: '#38BDF8', machine: 'Recipiente calibrado, varilla y balanza', machineSub: 'Medida de 14.2 L, varilla Ø 16 mm, enrasador y balanza',
            norma: 'NTC 92 · ASTM C29', duration: 24,
            phases: [
                { a: 0.00, b: 0.10, t: 'Pesar el recipiente vacío', d: 'Se registra la tara T del recipiente de volumen V conocido.' },
                { a: 0.10, b: 0.64, t: 'Llenar y compactar en 3 capas', d: 'Cada capa se compacta con 25 golpes de varilla (método por varillado).' },
                { a: 0.64, b: 0.76, t: 'Enrasar la superficie', d: 'Se pasa el enrasador para dejar la superficie a nivel con el borde.' },
                { a: 0.76, b: 0.90, t: 'Pesar el recipiente lleno', d: 'La masa neta G − T se divide por el volumen V.' },
                { a: 0.90, b: 1.01, t: 'Calcular PUC y vacíos', d: 'PUC = (G − T)/V;  % vacíos = [1 − PUC/(Gs·ρw)]·100.' }
            ],
            parts: [
                { name: 'Recipiente calibrado', desc: 'Volumen conocido (14.2 L); se verifica con agua.' },
                { name: 'Agregado grueso', desc: 'Muestra seca al horno, en 3 capas iguales.' },
                { name: 'Varilla de compactación', desc: 'Ø 16 mm con punta redondeada: 25 golpes por capa.' },
                { name: 'Pala o cucharón', desc: 'Para colocar cada capa sin segregar.' },
                { name: 'Enrasador', desc: 'Regla recta que nivela la superficie.' },
                { name: 'Balanza', desc: 'Precisión de 10 g o mejor para este ensayo.' }
            ],
            cam: { target: [0, 1.7, 0], home: { theta: 0.6, phi: 1.14, radius: 10.4 }, frontal: { theta: 0, phi: 1.3, radius: 10.8 }, lateral: { theta: 1.45, phi: 1.2, radius: 10 }, detalle: { theta: 0.35, phi: 1.2, radius: 5.4, target: [0, 1.8, 0] } }
        },
        params: paramsPunit,
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 9, 4.4, accent);
            var gravM = L.speckle('#6b727b', 2600, 40, 150, 5, 2, 2);
            var bal = new THREE.Group(); root.add(bal);
            box(bal, 3.0, 0.5, 2.6, 0, 0.25, 0, mt.dark); cyl(bal, 1.3, 1.3, 0.1, 0, 0.55, 0, mt.steelL, 40);
            var bscr = screen(bal, 1.9, 0.42, 0, 0.3, 1.31, 440, 96);
            var BY = 0.6, RB = 1.05, HB = 2.2;
            var wall = new THREE.Mesh(new THREE.CylinderGeometry(RB, RB, HB, 44, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9d2d9, metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false })); wall.position.y = BY + HB / 2; root.add(wall);
            cyl(root, RB, RB, 0.05, 0, BY + 0.03, 0, mt.steelD, 44);
            var rim = new THREE.Mesh(new THREE.TorusGeometry(RB, 0.05, 8, 44), mt.steelL); rim.rotation.x = Math.PI / 2; rim.position.y = BY + HB; root.add(rim);
            var layers = [0, 1, 2].map(function () { var m = new THREE.Mesh(new THREE.CylinderGeometry(RB - 0.04, RB - 0.04, 1, 36), gravM); m.visible = false; root.add(m); return m; });
            var pile = L.speckle ? new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, 6.2832, 0, 1.5708), gravM) : null;
            pile.scale.set(1.5, 1.0, 1.5); pile.position.set(-3.5, 0, 0.4); pile.castShadow = true; root.add(pile);
            var scoop = new THREE.Group(); root.add(scoop);
            box(scoop, 0.4, 0.1, 0.3, 0.2, 0, 0, mt.steelL); box(scoop, 0.7, 0.06, 0.06, 0.65, 0.04, 0, mt.dark);
            var load = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), gravM); load.scale.y = 0.55; load.position.set(0.22, 0.12, 0); scoop.add(load);
            var rod = new THREE.Group(); root.add(rod); cyl(rod, 0.045, 0.045, 3.4, 0, 0, 0, mt.steelL, 12);
            var bar = new THREE.Group(); root.add(bar); box(bar, 3.2, 0.06, 0.14, 0, 0, 0, mt.steelL);
            var pins = [{ v: [RB, 1.6, 0.4] }, { v: [-3.5, 1.2, 0.4] }, { v: [0.3, 3.1, 0] }, { v: [-2.0, 1.6, 0.4] }, { v: [0, 2.8, 0.5] }, { v: [1.4, 0.45, 1.3] }];
            function set(p, prm) {
                var P = prm.P, T = P.T, filled = 0, i, stage = -1, fp = 0, rodding = false;
                for (i = 0; i < 3; i++) {
                    var s0 = 0.10 + 0.18 * i, sFill = tw(p, s0, s0 + 0.08), h = (HB / 3) * (0.97 + 0.03 * tw(p, s0 + 0.08, s0 + 0.18));
                    var L_ = layers[i]; L_.visible = sFill > 0.001; L_.scale.y = Math.max(0.001, (HB / 3 - 0.01) * sFill);
                    L_.position.y = BY + 0.05 + i * (HB / 3) + L_.scale.y / 2; filled += sFill / 3;
                    if (p >= s0 && p < s0 + 0.18) { stage = i; fp = tw(p, s0, s0 + 0.08); rodding = p >= s0 + 0.08; }
                }
                /* cucharón */
                scoop.visible = stage >= 0 && !rodding;
                if (scoop.visible) { var u = (fp * 4) % 1, to = u < 0.5 ? ease(u * 2) : 1 - ease((u - 0.5) * 2); scoop.position.set(lerp(-3.0, -0.3, to), lerp(1.2, BY + HB + 0.3, to), 0.3); scoop.rotation.z = -0.35 * to; load.visible = u < 0.5; }
                rod.visible = rodding;
                if (rodding) { var rp = tw(p, 0.10 + 0.18 * stage + 0.08, 0.10 + 0.18 * (stage + 1)), osc = 0.5 + 0.5 * Math.sin(rp * 25 * 6.2832); var ly = BY + 0.05 + (stage + 1) * (HB / 3); rod.position.set(0.55 * Math.sin(rp * 31), ly + 1.7 - 0.5 * osc + 0.0, 0.5 * Math.cos(rp * 23)); }
                var sw = sm(p, 0.64, 0.76);
                bar.visible = p > 0.62 && p < 0.78; bar.position.set(0, BY + HB + 0.1, lerp(-1.4, 1.4, sw)); bar.rotation.y = 0.1;
                var net = P.neto * filled, shown = p < 0.10 ? T * sm(p, 0.02, 0.08) : T + net;
                var txt = fmt(shown, 2) + ' kg', sub = p < 0.1 ? 'Tara T' : p < 0.76 ? 'En la balanza' : 'G = T + muestra';
                bscr.draw(txt + sub, function (g, W, H) { g.fillStyle = '#0b1a10'; g.fillRect(0, 0, W, H); g.fillStyle = '#86efac'; g.font = 'bold 46px monospace'; g.textAlign = 'right'; g.fillText(txt, W - 14, 70); g.font = 'bold 20px sans-serif'; g.textAlign = 'left'; g.fillText(sub, 12, 26); });
                var done = p >= 0.76, pu = net / P.V;
                return { hud: [{ k: 'Masa neta', v: fmt(net, 2), u: 'kg' }, { k: 'PUC', v: done ? fmt(pu, 0) : '—', u: 'kg/m³' }, { k: 'Vacíos', v: p >= 0.9 ? fmt(P.vac, 1) : '—', u: '%' }, { k: 'Volumen V', v: fmt(P.V * 1000, 1), u: 'L' }] };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       3 · HUMEDAD DEL AGREGADO — secado en horno
    =================================================================== */
    function paramsHum() {
        var P = merge({ mh: 1000, w: 3.8, ab: 1.5 }, 'dm_hum'); P.ms = P.mh / (1 + P.w / 100); P.libre = P.w - P.ab;
        return { P: P, real: false, nota: notaMod('dm_hum', 'Ejemplo: muestra húmeda de ' + fmt(P.mh, 0) + ' g, w = ' + fmt(P.w, 1) + ' % y absorción de ' + fmt(P.ab, 1) + ' % (humedad libre ≈ ' + fmt(P.libre, 1) + ' %). Ingresa tus masas en el ensayo de Humedad.') };
    }
    L3.register('dm_hum', {
        meta: {
            accent: '#FB7185', machine: 'Horno de secado y balanza', machineSub: 'Horno a 110 ± 5 °C, bandeja con muestra y balanza de 0.1 g',
            norma: 'NTC 1776 · ASTM C566', duration: 26,
            phases: [
                { a: 0.00, b: 0.16, t: 'Pesar la muestra húmeda', d: 'Se pesa la bandeja con la muestra en estado natural: masa húmeda Mh.' },
                { a: 0.16, b: 0.62, t: 'Secar en el horno a 110 °C', d: 'La bandeja entra al horno hasta masa constante (≈ 24 h en el ensayo real).' },
                { a: 0.62, b: 0.84, t: 'Retirar y pesar en seco', d: 'Se enfría y se pesa de nuevo: masa seca Ms.' },
                { a: 0.84, b: 1.01, t: 'Calcular la humedad', d: 'w = (Mh − Ms)/Ms · 100; humedad libre = w − absorción.' }
            ],
            parts: [
                { name: 'Horno', desc: 'Temperatura controlada de 110 ± 5 °C.' },
                { name: 'Puerta del horno', desc: 'Se abre solo para introducir o retirar la bandeja.' },
                { name: 'Panel de control', desc: 'Muestra temperatura y tiempo de secado.' },
                { name: 'Bandeja con muestra', desc: 'Agregado húmedo que pierde agua al secarse.' },
                { name: 'Balanza', desc: 'Precisión de 0.1 g.' },
                { name: 'Estante interior', desc: 'Soporta la bandeja con circulación de aire.' }
            ],
            cam: { target: [0.8, 1.9, 0], home: { theta: 0.85, phi: 1.2, radius: 11.4 }, frontal: { theta: 0.35, phi: 1.3, radius: 11.8 }, lateral: { theta: 1.5, phi: 1.22, radius: 11 }, detalle: { theta: 0.9, phi: 1.2, radius: 6.2, target: [-0.4, 1.9, 0] } }
        },
        params: paramsHum,
        build: function (accent) {
            var root = new THREE.Group(), mt = mats(), OX = -1.2, W = 3.0, H = 3.7, Dp = 2.4, XD = OX + W / 2;
            bench(root, 10, 4.6, accent);
            var red = M(0x8d3a46, 0.5, 0.45), innerM = M(0x3a2a2a, 0.3, 0.7, { emissive: 0x000000 });
            box(root, 0.15, H, Dp, OX - W / 2, H / 2, 0, red); box(root, W, 0.2, Dp, OX, H - 0.1, 0, red); box(root, W, 0.2, Dp, OX, 0.1, 0, red);
            box(root, W, H, 0.15, OX, H / 2, -Dp / 2, red); box(root, W, H, 0.15, OX, H / 2, Dp / 2, red);
            var inner = box(root, 0.06, H - 0.6, Dp - 0.4, OX - W / 2 + 0.12, H / 2, 0, innerM);
            var shelfM = M(0x8a8f96, 0.7, 0.4, { emissive: 0x000000 });
            var shelf = box(root, 2.5, 0.06, 2.0, OX - 0.1, 1.7, 0, shelfM);
            var door = new THREE.Group(); door.position.set(XD, 0, -Dp / 2); root.add(door);
            box(door, 0.14, 3.0, Dp - 0.05, 0, 1.75, (Dp - 0.05) / 2, red);
            var win = box(door, 0.04, 1.4, 1.2, 0.09, 2.0, Dp / 2, M(0x1a2230, 0.3, 0.2, { emissive: 0x000000 }));
            box(door, 0.1, 0.1, 0.5, 0.12, 1.6, Dp - 0.3, mt.steelL);
            var heatBar = new THREE.Mesh(new THREE.BoxGeometry(W - 0.4, 0.04, 0.04), new THREE.MeshBasicMaterial({ color: 0xff7a2a })); heatBar.position.set(OX, 0.32, 0); root.add(heatBar);
            var panel = screen(root, 1.6, 0.46, XD + 0.05, H - 0.4, 0, 400, 115); panel.mesh.rotation.y = Math.PI / 2;
            panel.mesh.position.set(XD + 0.08, H - 0.5, 0.0);
            var sandWet = 0x6b5a3d, sandDry = 0xb59c68;
            var sMat = new THREE.MeshStandardMaterial({ color: sandWet, roughness: 0.95 });
            var tray = new THREE.Group(); root.add(tray);
            box(tray, 1.5, 0.1, 1.1, 0, 0, 0, mt.steelL);
            box(tray, 1.5, 0.12, 0.05, 0, 0.1, 0.52, mt.steelL); box(tray, 1.5, 0.12, 0.05, 0, 0.1, -0.52, mt.steelL);
            box(tray, 0.05, 0.12, 1.1, 0.72, 0.1, 0, mt.steelL); box(tray, 0.05, 0.12, 1.1, -0.72, 0.1, 0, mt.steelL);
            var heap = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 10, 0, 6.2832, 0, 1.5708), sMat); heap.scale.set(0.62, 0.3, 0.45); heap.position.y = 0.1; heap.castShadow = true; tray.add(heap);
            var bal = new THREE.Group(); bal.position.set(3.9, 0, 0.4); root.add(bal);
            box(bal, 2.2, 0.5, 2.0, 0, 0.25, 0, mt.dark); cyl(bal, 0.85, 0.85, 0.1, 0, 0.55, 0, mt.steelL, 30);
            var bscr = screen(bal, 1.6, 0.4, 0, 0.3, 1.01, 400, 100);
            var steam = [], rnd = D.seeded(11), i;
            for (i = 0; i < 8; i++) { var sp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25 })); sp.userData = { x: (rnd() - 0.5) * 1.0, z: (rnd() - 0.5) * 0.8, o: rnd() }; sp.visible = false; root.add(sp); steam.push(sp); }
            var pins = [{ v: [OX, H, 0] }, { v: [XD + 0.1, 3.1, 0] }, { v: [XD + 0.1, H - 0.5, 0.7] }, { v: [OX, 1.9, 0] }, { v: [3.9, 0.9, 0.4] }, { v: [OX, 1.7, 0.9] }];
            function trayPos(p) {
                var x, y;
                if (p < 0.22) { x = 3.9; y = 0.66; }
                else if (p < 0.28) { x = 3.9; y = lerp(0.66, 2.0, sm(p, 0.22, 0.28)); }
                else if (p < 0.37) { x = lerp(3.9, OX + 0.05, sm(p, 0.28, 0.37)); y = 2.0; }
                else if (p < 0.41) { x = OX + 0.05; y = lerp(2.0, 1.83, sm(p, 0.37, 0.41)); }
                else if (p < 0.66) { x = OX + 0.05; y = 1.83; }
                else if (p < 0.70) { x = OX + 0.05; y = lerp(1.83, 2.0, sm(p, 0.66, 0.70)); }
                else if (p < 0.79) { x = lerp(OX + 0.05, 3.9, sm(p, 0.70, 0.79)); y = 2.0; }
                else { x = 3.9; y = lerp(2.0, 0.66, sm(p, 0.79, 0.83)); }
                return [x, y];
            }
            function set(p, prm) {
                var P = prm.P, tp = trayPos(p), dry = sm(p, 0.46, 0.62);
                tray.position.set(tp[0], tp[1], 0.1);
                var door1 = sm(p, 0.14, 0.22) * (1 - sm(p, 0.40, 0.46)), door2 = sm(p, 0.60, 0.66), ang = 1.75 * (p < 0.5 ? door1 : door2);
                door.rotation.y = ang;
                var heat = sm(p, 0.44, 0.52) * (1 - 0.8 * sm(p, 0.62, 0.72));
                innerM.emissive.copy(mixCol(0x000000, 0xff5a1a, heat * 0.55)); shelfM.emissive.copy(mixCol(0x000000, 0xff5a1a, heat * 0.35));
                win.material.emissive.copy(mixCol(0x000000, 0xff7a2a, heat * 0.8)); heatBar.visible = heat > 0.05;
                sMat.color.copy(mixCol(sandWet, sandDry, dry)); heap.scale.set(0.62 - 0.03 * dry, 0.3 - 0.025 * dry, 0.45 - 0.02 * dry);
                steam.forEach(function (s, k) {
                    var u = s.userData, on = p > 0.46 && p < 0.7 && door.rotation.y < 0.2 ? false : (p > 0.40 && p < 0.7);
                    var showS = (p > 0.5 && p < 0.64) || (p > 0.60 && p < 0.72 && ang > 0.3);
                    s.visible = showS; if (!showS) return;
                    var t = ((p * 14 + u.o + k * 0.13) % 1);
                    s.position.set(OX + u.x + (ang > 0.3 ? 1.6 : 0), H + 0.1 + t * 1.2, u.z); s.material.opacity = 0.35 * (1 - t); s.scale.setScalar(0.8 + t * 1.6);
                });
                var temp = 25 + 85 * heat, hours = tw(p, 0.44, 0.62) * 24;
                panel.draw(Math.round(temp) + '|' + Math.round(hours * 4), function (g, W2, H2) { g.fillStyle = '#1a0d0d'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#fb7185'; g.font = 'bold 50px monospace'; g.textAlign = 'left'; g.fillText(Math.round(temp) + ' °C', 14, 60); g.font = 'bold 26px sans-serif'; g.fillStyle = '#fbbf24'; g.fillText('t = ' + fmt(hours, 1) + ' h', 14, 98); });
                var onBal = tp[0] > 3.5 && tp[1] < 0.8, mass = onBal ? (p < 0.5 ? P.mh : P.ms) : 0;
                var bt = fmt(mass, 1) + ' g', bs = !onBal ? 'Sin carga' : (p < 0.5 ? 'Mh húmeda' : 'Ms seca');
                if (p >= 0.84) { bt = 'w = ' + fmt(P.w, 1) + ' %'; bs = 'libre ' + fmt(P.libre, 1) + ' %'; }
                bscr.draw(bt + bs, function (g, W2, H2) { g.fillStyle = '#0b1a10'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#86efac'; g.font = 'bold 46px monospace'; g.textAlign = 'right'; g.fillText(bt, W2 - 14, 74); g.font = 'bold 20px sans-serif'; g.textAlign = 'left'; g.fillText(bs, 12, 26); });
                var msShow = p >= 0.76;
                return { hud: [{ k: 'Mh húmeda', v: fmt(P.mh, 1), u: 'g' }, { k: 'Ms seca', v: msShow ? fmt(P.ms, 1) : '—', u: 'g' }, { k: 'w', v: p >= 0.84 ? fmt(P.w, 2) : '—', u: '%' }, { k: 'Temperatura', v: fmt(temp, 0), u: '°C' }] };
            }
            return { root: root, pins: pins, set: set };
        }
    });

    /* ===================================================================
       4 · CONCRETO FRESCO — peso unitario y aire (olla Tipo B)
    =================================================================== */
    function paramsFresco() {
        var C = CC(), S = ACIsrc(), air = 2.0, tanda = 2380, real = false;
        if (S && C) { var r = C.disenoACI(S); if (r && r.ok) { air = r.aire; tanda = r.cemento + r.agua + r.fino + r.grueso; real = true; } }
        var P = merge({ air: air, tanda: tanda, gamma0: 2480, T: 5.1 }, 'dm_fresco'); P.V = 0.007;
        P.gamma = P.gamma0 * (1 - P.air / 100); P.neto = P.gamma * P.V; P.rend = P.tanda / P.gamma;
        return { P: P, real: real && !nOV('dm_fresco'), nota: notaMod('dm_fresco', real ? 'Con tu diseño ACI: aire ' + fmt(P.air, 1) + ' % y masa de tanda ' + fmt(P.tanda, 0) + ' kg/m³.' : 'Valores de ejemplo: aire atrapado 2.0 %, olla de 7 L y mezcla de ≈ 2380 kg/m³ de diseño.') };
    }
    L3.register('dm_fresco', {
        meta: {
            accent: '#F472B6', machine: 'Olla de aire Tipo B y balanza', machineSub: 'Olla de 7 L, tapa con manómetro, bomba manual, botella y varilla',
            norma: 'NTC 1926 · ASTM C138 · ASTM C231', duration: 28,
            phases: [
                { a: 0.00, b: 0.30, t: 'Llenar en 3 capas y compactar', d: 'Cada capa: 25 golpes de varilla y 10–15 golpes laterales con el mazo.' },
                { a: 0.30, b: 0.46, t: 'Enrasar y pesar', d: 'Se enrasa el borde y se pesa: masa neta → peso unitario γ = Mc/V.' },
                { a: 0.46, b: 0.64, t: 'Colocar la tapa e inyectar agua', d: 'Se cierran los clips y se inyecta agua por una llave hasta que salga por la otra.' },
                { a: 0.64, b: 0.90, t: 'Presurizar y leer el aire', d: 'Se bombea a la presión inicial, se asienta la aguja y se abre la válvula principal.' },
                { a: 0.90, b: 1.01, t: 'Resultados', d: 'γ (kg/m³), contenido de aire (%) y rendimiento de la tanda.' }
            ],
            parts: [
                { name: 'Olla de 7 L', desc: 'Recipiente de volumen calibrado.' },
                { name: 'Tapa con clips', desc: 'Sella la olla para presurizar la cámara de aire.' },
                { name: 'Manómetro de aire', desc: 'Escala 0–10 % de aire; marca roja = presión inicial.' },
                { name: 'Bomba manual', desc: 'Lleva la cámara a la presión inicial.' },
                { name: 'Botella de agua', desc: 'Inyecta agua por la llave de purga.' },
                { name: 'Balanza', desc: 'Pesa el concreto compactado para obtener γ.' }
            ],
            cam: { target: [0, 1.9, 0], home: { theta: 0.6, phi: 1.16, radius: 10.6 }, frontal: { theta: 0, phi: 1.3, radius: 11 }, lateral: { theta: 1.45, phi: 1.2, radius: 10.2 }, detalle: { theta: 0.3, phi: 1.22, radius: 5.6, target: [0, 2.4, 0] } }
        },
        params: paramsFresco,
        build: function (accent) {
            var root = new THREE.Group(), mt = mats();
            bench(root, 9, 4.4, accent);
            var bal = new THREE.Group(); root.add(bal);
            box(bal, 3.0, 0.5, 2.6, 0, 0.25, 0, mt.dark); cyl(bal, 1.3, 1.3, 0.1, 0, 0.55, 0, mt.steelL, 40);
            var bscr = screen(bal, 1.9, 0.42, 0, 0.3, 1.31, 440, 96);
            var BY = 0.6, RB = 1.0, HB = 1.8, conM = L.speckle('#9a8a66', 5200, 60, 170, 3, 2, 2);
            var wall = new THREE.Mesh(new THREE.CylinderGeometry(RB, RB, HB, 44, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9d2d9, metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide, transparent: true, opacity: 0.6, depthWrite: false })); wall.position.y = BY + HB / 2; root.add(wall);
            cyl(root, RB, RB, 0.05, 0, BY + 0.03, 0, mt.steelD, 44);
            var rimT = new THREE.Mesh(new THREE.TorusGeometry(RB, 0.06, 8, 44), mt.steelL); rimT.rotation.x = Math.PI / 2; rimT.position.y = BY + HB; root.add(rimT);
            var layers = [0, 1, 2].map(function () { var m = new THREE.Mesh(new THREE.CylinderGeometry(RB - 0.04, RB - 0.04, 1, 36), conM); m.visible = false; root.add(m); return m; });
            var water = new THREE.Mesh(new THREE.CylinderGeometry(RB - 0.04, RB - 0.04, 0.4, 32), L.waterM(0.5)); water.visible = false; root.add(water);
            var cover = new THREE.Group(); root.add(cover);
            cyl(cover, RB + 0.14, RB + 0.14, 0.14, 0, 0, 0, mt.steelM, 44);
            var dome = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 10, 0, 6.2832, 0, 1.5708), mt.steelL); dome.scale.set(RB, 0.38, RB); dome.position.y = 0.07; dome.castShadow = true; cover.add(dome);
            [-1, 1].forEach(function (s) { box(cover, 0.18, 0.5, 0.14, s * (RB + 0.16), -0.2, 0, mt.steelD); });
            [[-0.55, 0.3], [0.45, 0.35]].forEach(function (o) { cyl(cover, 0.07, 0.07, 0.3, o[0], 0.4, o[1], mt.brass, 12); });
            var valve = cyl(cover, 0.1, 0.1, 0.12, 0.2, 0.46, -0.3, mt.red, 16);
            var gscr = screen(cover, 1.2, 1.2, 0, 0.62, 0.55, 256, 256); gscr.mesh.rotation.x = -0.25;
            var pump = new THREE.Group(); pump.position.set(2.7, 0, 0.6); root.add(pump);
            cyl(pump, 0.22, 0.22, 1.5, 0, 0.75, 0, mt.steelL, 18); box(pump, 0.8, 0.1, 0.8, 0, 0.05, 0, mt.dark);
            var handle = new THREE.Group(); handle.position.y = 1.5; pump.add(handle); cyl(handle, 0.05, 0.05, 0.9, 0, 0.45, 0, mt.steelD, 10); box(handle, 0.6, 0.07, 0.1, 0, 0.92, 0, mt.dark);
            var hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(2.7, 1.2, 0.6), new THREE.Vector3(1.8, 0.9, 0.9), new THREE.Vector3(1.0, 2.3, 0.5), new THREE.Vector3(0.45, 3.1, 0.35)]), 24, 0.035, 8, false), mt.dark); root.add(hose);
            var bottle = new THREE.Group(); root.add(bottle);
            cyl(bottle, 0.3, 0.3, 0.8, 0, 0, 0, L.glassM(0.5), 18); cyl(bottle, 0.3, 0.3, 0.55, 0, -0.1, 0, L.waterM(0.8), 18); cyl(bottle, 0.1, 0.12, 0.35, 0, 0.55, 0, M(0x2563eb, 0.1, 0.5), 12);
            var inj = lineStream(root, 0x5bb4ff, 0.03);
            var mallet = new THREE.Group(); root.add(mallet); cyl(mallet, 0.04, 0.04, 0.8, 0, 0.4, 0, mt.dark, 8); box(mallet, 0.4, 0.2, 0.2, 0, 0.85, 0, M(0x1f2937, 0, 0.8));
            var rod = new THREE.Group(); root.add(rod); cyl(rod, 0.045, 0.045, 3.2, 0, 0, 0, mt.steelL, 12);
            var bar = new THREE.Group(); root.add(bar); box(bar, 3.0, 0.06, 0.14, 0, 0, 0, mt.steelL);
            var pins = [{ v: [RB, 1.3, 0.6] }, { v: [RB + 0.2, 2.6, 0] }, { v: [0, 3.5, 0.55] }, { v: [2.7, 1.9, 0.6] }, { v: [-2.6, 1.0, 0.8] }, { v: [1.4, 0.45, 1.3] }];
            function set(p, prm) {
                var P = prm.P, i, filled = 0, stage = -1, rodding = false, T = P.T;
                for (i = 0; i < 3; i++) {
                    var s0 = 0.10 * i, f = sm(p, s0, s0 + 0.05) , L_ = layers[i], hh = HB / 3;
                    L_.visible = f > 0.001; L_.scale.y = Math.max(0.001, (hh - 0.01) * f); L_.position.y = BY + 0.05 + i * hh + L_.scale.y / 2; filled += f / 3;
                    if (p >= s0 && p < s0 + 0.10) { stage = i; rodding = p >= s0 + 0.05; }
                }
                rod.visible = rodding && p < 0.30;
                if (rod.visible) { var rp = tw(p, stage * 0.10 + 0.05, stage * 0.10 + 0.10), osc = 0.5 + 0.5 * Math.sin(rp * 25 * 6.2832); rod.position.set(0.5 * Math.sin(rp * 29), BY + 0.05 + (stage + 1) * (HB / 3) + 1.6 - 0.45 * osc, 0.45 * Math.cos(rp * 19)); }
                var tap = rodding && p < 0.30 && tw(p, stage * 0.10 + 0.07, stage * 0.10 + 0.10) > 0 ? 1 : 0;
                mallet.visible = p < 0.30 && stage >= 0 && tw(p, stage * 0.10 + 0.07, stage * 0.10 + 0.10) > 0 && tw(p, stage * 0.10 + 0.07, stage * 0.10 + 0.10) < 1;
                if (mallet.visible) { var mt_ = Math.abs(Math.sin(p * 300)); mallet.position.set(RB + 0.55 - 0.25 * mt_, BY + 0.9, 0); mallet.rotation.z = 0.9 - 0.6 * mt_; }
                var sw = sm(p, 0.30, 0.38);
                bar.visible = p > 0.29 && p < 0.40; bar.position.set(0, BY + HB + 0.1, lerp(-1.4, 1.4, sw)); bar.rotation.y = 0.1;
                var coverDown = sm(p, 0.46, 0.52), clip = sm(p, 0.52, 0.55);
                cover.visible = p > 0.44; cover.position.set(0, BY + HB + 0.1 + (1 - coverDown) * 2.6, 0);
                var injOn = p > 0.55 && p < 0.64, tb = sm(p, 0.55, 0.58) * (1 - sm(p, 0.62, 0.64));
                bottle.visible = p > 0.5 && p < 0.7; bottle.position.set(-1.1 - (1 - tb) * 1.5, BY + HB + 1.35 + 0.1 * tb, 1.0); bottle.rotation.z = -tb * 1.1;
                setLine(inj, -0.7, BY + HB + 1.35, 0.9, 0.45, BY + HB + 0.55, 0.35, injOn, 0.03);
                water.visible = p > 0.55 && p < 0.7; water.position.y = BY + HB - 0.1 + 0.2 * tw(p, 0.55, 0.64); water.scale.y = 0.3 + 0.7 * tw(p, 0.55, 0.64);
                var pump_ = tw(p, 0.64, 0.78), strokes = Math.abs(Math.sin(pump_ * 9 * 3.1416));
                handle.rotation.z = (pump_ > 0 && pump_ < 1 ? 1 : 0) * (-0.5 + 0.5 * strokes);
                var press = sm(p, 0.78, 0.8) * (1 - sm(p, 0.84, 0.86)); valve.position.y = 0.46 - 0.05 * press;
                var mark = 0.55, airF = P.air / 10, needle;
                if (p < 0.64) needle = 0; else if (p < 0.78) needle = mark * sm(p, 0.64, 0.78) + 0.015 * Math.sin(p * 200) * (1 - pump_);
                else if (p < 0.82) needle = mark; else needle = lerp(mark, airF, sm(p, 0.82, 0.88)) + (p < 0.9 ? 0.012 * Math.sin(p * 160) * (1 - sm(p, 0.82, 0.9)) : 0);
                drawDial(gscr, needle, { title: 'AIRE', unit: '% de aire', max: 10, ticks: 10, mark: mark });
                var net = P.neto * (p < 0.30 ? filled : 1), shown = p < 0.02 ? T : T + net;
                var txt = fmt(shown, 2) + ' kg', sub = p < 0.02 ? 'Tara de la olla' : p < 0.46 ? 'En la balanza' : 'T + Mc';
                bscr.draw(txt + sub, function (g, W2, H2) { g.fillStyle = '#0b1a10'; g.fillRect(0, 0, W2, H2); g.fillStyle = '#86efac'; g.font = 'bold 46px monospace'; g.textAlign = 'right'; g.fillText(txt, W2 - 14, 70); g.font = 'bold 20px sans-serif'; g.textAlign = 'left'; g.fillText(sub, 12, 26); });
                return { hud: [{ k: 'Masa neta Mc', v: fmt(net, 2), u: 'kg' }, { k: 'γ', v: p >= 0.36 ? fmt(P.gamma, 0) : '—', u: 'kg/m³' }, { k: 'Aire', v: p >= 0.88 ? fmt(P.air, 1) : '—', u: '%' }, { k: 'Rendimiento', v: p >= 0.9 ? fmt(P.rend, 3) : '—', u: 'm³/m³' }] };
            }
            return { root: root, pins: pins, set: set };
        }
    });
})(window);
