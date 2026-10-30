/**
 * GeoMetrics — Laboratorio 3D · Mecánica de Suelos I · PASO A PASO VISUAL
 *
 * Antes del ensayo propiamente dicho, cada máquina 3D muestra la PREPARACIÓN que hace el estudiante
 * (pesar la tara, cargar el suelo con la espátula, agregar el agua con la piseta, mezclar, armar los
 * tamices, llenar el picnómetro, compactar el suelo en capas…). Cada acción se ve en pantalla.
 *
 * Funcionamiento: intercepta GeoLab3D.register() de los 8 ensayos de Suelos I y envuelve la máquina
 * original. La línea de tiempo queda así:  [pasos previos]  →  [ensayo original].
 * Debe cargarse ANTES de lab3d-ms1.js y lab3d-ms1b.js (y después de lab3d-ensayos.js).
 *
 * Compactación Proctor: tiene su propia línea de tiempo por molde (agua → mezcla → capas → pesada) y
 * los golpes del martillo se dan a ritmo lento (≈ 1 golpe cada 0,5 s a velocidad 1×).
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D;
    if (!L3 || !L3.kit || L3.__pasos) return;
    L3.__pasos = true;
    var K = L3.kit, M = K.M, box = K.box, cyl = K.cyl, clamp = K.clamp, lerp = K.lerp, ease = K.ease, fmt = K.fmt;
    function Lb() { return L3.lib; }
    function tw(q, a, b) { return clamp((q - a) / (b - a), 0, 1); }
    function sm(q, a, b) { return ease(tw(q, a, b)); }
    function colorMix(a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), clamp(t, 0, 1)); }
    function str(v) { return String(v); }

    /* ------------------------- piezas reutilizables ------------------------- */
    function spatula(parent) {
        var g = new THREE.Group(); parent.add(g);
        var steel = M(0xc9d2d9, 0.85, 0.28), dark = M(0x1f242b, 0.3, 0.6);
        box(g, 0.34, 0.025, 0.2, 0.17, 0, 0, steel);               /* hoja */
        box(g, 0.5, 0.05, 0.06, 0.58, 0.02, 0, dark);              /* mango */
        var blob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), M(0x8a6b4a, 0, 0.95));
        blob.position.set(0.17, 0.08, 0); blob.scale.y = 0.6; g.add(blob);
        return { g: g, blob: blob };
    }
    function heap(parent, r, color) {
        var m = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 10, 0, Math.PI * 2, 0, Math.PI / 2), M(color, 0, 0.95));
        m.scale.y = 0.7; m.castShadow = true; parent.add(m); return m;
    }
    function streamMesh(parent, color) {
        var m = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 8), new THREE.MeshStandardMaterial({ color: color || 0x6fb7ff, transparent: true, opacity: 0.8, roughness: 0.2 }));
        m.visible = false; parent.add(m); return m;
    }
    function setStream(m, x, yTop, yBot, z, on) {
        m.visible = !!on && yTop > yBot + 0.01;
        if (!m.visible) return;
        var len = yTop - yBot; m.scale.y = len; m.position.set(x, yBot + len / 2, z);
    }
    function washBottle(parent) {
        var g = new THREE.Group(); parent.add(g);            /* origen = punta de la boquilla */
        var body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.55, 20), new THREE.MeshStandardMaterial({ color: 0xe8f1ff, roughness: 0.3, transparent: true, opacity: 0.85 }));
        body.position.set(0.28, 0.1, 0); body.rotation.z = -0.5; g.add(body);
        var cap = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.16, 14), M(0x3b9eff, 0.2, 0.5)); cap.position.set(0.06, 0.38, 0); cap.rotation.z = -0.5 - 0.9; g.add(cap);
        var tip = cyl(g, 0.02, 0.035, 0.18, 0, 0.0, 0, M(0x3b9eff, 0.2, 0.5), 8); tip.rotation.z = 0.5;
        return g;
    }
    function beaker(parent) {
        var g = new THREE.Group(); parent.add(g);
        var gl = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.2, 0.7, 24, 1, true), Lb().glassM(0.3)); gl.position.y = 0.35; g.add(gl);
        cyl(g, 0.2, 0.2, 0.03, 0, 0.015, 0, Lb().glassM(0.4), 20);
        var w = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 22), Lb().waterM(0.6)); w.visible = true; g.add(w);
        for (var i = 1; i <= 5; i++) box(g, 0.1, 0.012, 0.012, 0.22, 0.1 * i + 0.06, 0, M(0x1f242b, 0.2, 0.6));
        function level(f) { f = clamp(f, 0.001, 1); w.scale.y = 0.6 * f; w.position.y = 0.03 + 0.3 * f; w.visible = f > 0.01; }
        level(1);
        return { g: g, level: level };
    }
    function triangle(f) { return f < 0.5 ? ease(f * 2) : ease(2 - f * 2); }

    /* ================================================================== */
    /*  CONFIGURACIÓN DE LOS PASOS PREVIOS POR ENSAYO                      */
    /* ================================================================== */
    var CFG = {};

    /* -------------------------- 1 · HUMEDAD -------------------------- */
    CFG.humedad = {
        steps: [
            { t: 'Pesar el recipiente vacío (tara)', d: 'Se rotula el recipiente de aluminio y se pesa vacío en la balanza para descontar su masa más adelante.', sec: 5 },
            { t: 'Cargar la muestra con la espátula', d: 'Se transfiere el suelo húmedo al recipiente en porciones, sin perder material, hasta la masa requerida.', sec: 8 }
        ],
        props: function (root, h) {
            var sp = spatula(root), tray = new THREE.Group(); tray.position.set(3.55, 0.09, 1.05); root.add(tray);
            cyl(tray, 0.55, 0.5, 0.07, 0, 0.035, 0, M(0xd5dbe2, 0.9, 0.25), 28);
            var hp = heap(tray, 0.42, 0x5b3a22); hp.position.y = 0.07;
            var A = new THREE.Vector3(3.55, 0.42, 1.05), B = new THREE.Vector3(h.BX, 1.1, 0);
            return {
                set: function (info, prm) {
                    var pre = info.step >= 0, P = prm.P;
                    sp.g.visible = pre && info.step === 1;
                    if (!pre) { hp.scale.set(1, 0.7, 1); h.mound.visible = true; h.dish.visible = true; return null; }
                    if (info.step === 0) {
                        var f = sm(info.q, 0, 0.45);
                        h.dish.position.y = lerp(2.4, 0.69, f);
                        h.mound.visible = false;
                        var shown = P.tara * sm(info.q, 0.5, 0.8);
                        h.bscr.lcd(fmt(shown, 2) + ' g', 'TARA');
                        return [{ k: 'Tara', v: fmt(shown, 2), u: 'g' }, { k: 'Recipiente', v: 'Aluminio', u: '' }, { k: 'Muestra', v: '—', u: '' }, { k: 'w', v: '—', u: '' }];
                    }
                    var n = 3, k = Math.min(n - 1, Math.floor(info.q * n)), fr = info.q * n - k, e = triangle(Math.min(fr, 0.999));
                    sp.g.position.set(lerp(A.x, B.x, e), lerp(A.y, B.y, e) + Math.sin(Math.PI * e) * 0.5, lerp(A.z, B.z, e));
                    sp.g.rotation.z = -0.25 * e; sp.blob.visible = fr < 0.5;
                    var grown = (k + (fr >= 0.5 ? 1 : 0)) / n;
                    var gs = Math.max(0.02, grown);
                    h.mound.visible = grown > 0.01;
                    h.mound.scale.x *= gs; h.mound.scale.z *= gs; h.mound.scale.y *= gs;
                    hp.scale.set(1, 0.7, 1); hp.scale.multiplyScalar(1 - 0.35 * grown); hp.scale.y = 0.7 * (1 - 0.35 * grown);
                    h.bscr.lcd(fmt(P.tara + P.Wh * grown, 2) + ' g', 'TARA + SUELO');
                    return [{ k: 'Tara', v: fmt(P.tara, 2), u: 'g' }, { k: 'Suelo húmedo', v: fmt(P.Wh * grown, 1), u: 'g' }, { k: 'Porción', v: Math.min(n, k + (fr >= 0.5 ? 1 : 0)) + '/' + n, u: '' }, { k: 'w', v: '—', u: '' }];
                }
            };
        }
    };

    /* ------------------------ 2 · GRANULOMETRÍA ------------------------ */
    var G_NAMES = ['FONDO', 'No.200', 'No.100', 'No.40', 'No.10', 'No.4', '3/8"', '3/4"'];
    var G_OPEN = ['—', '0,075', '0,150', '0,425', '2,00', '4,75', '9,50', '19,0'];
    CFG.granulometria = {
        steps: [
            { t: 'Secar y pesar la muestra', d: 'La muestra seca al horno se pesa completa: es la masa total M que servirá de 100 % en la curva.', sec: 5 },
            { t: 'Armar la columna de tamices', d: 'Se apilan los tamices con la malla más fina abajo y más gruesa arriba, sobre el fondo recolector.', sec: 9 }
        ],
        props: function (root, h) {
            var mt = Lb().mats(), BXg = 2.05, BZg = 1.2, st = h.stack, n = h.n, ch = st.children, base = ch.map(function (c) { return c.position.y; });
            box(root, 1.5, 0.3, 1.1, BXg, 0.21, BZg, mt.mint); cyl(root, 0.09, 0.09, 0.3, BXg, 0.5, BZg, mt.steelD, 14); cyl(root, 0.5, 0.5, 0.04, BXg, 0.67, BZg, mt.steelL, 36);
            var bsc = Lb().screen(root, 0.95, 0.2, BXg, 0.26, BZg + 0.56, 256, 56); bsc.lcd('0.00 g', 'BALANZA');
            box(root, 1.7, 0.5, 0.3, -2.0, 0.31, 1.3, mt.mint); var info2 = Lb().screen(root, 1.5, 0.4, -2.0, 0.34, 1.46, 256, 72); info2.lcd('—', 'TAMIZ');
            var bowl = new THREE.Group(); root.add(bowl);
            cyl(bowl, 0.42, 0.3, 0.26, 0, 0.13, 0, mt.alum, 28);
            var bh = heap(bowl, 0.36, 0xd8b98a); bh.position.y = 0.24;
            var parts = []; for (var i = 0; i < 8; i++) { var pm = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), M(0xd8b98a, 0, 0.95)); pm.visible = false; root.add(pm); parts.push(pm); }
            var units = [[0, 1]]; for (var s = n - 1; s >= 0; s--) units.push([2 + 4 * s, 3 + 4 * s, 4 + 4 * s, 5 + 4 * s]);
            var lid = [2 + 4 * n, 3 + 4 * n], isPile = {}; isPile[1] = true; for (var q2 = 0; q2 < n; q2++) isPile[5 + 4 * q2] = true;
            function place(idx, dy, vis) { idx.forEach(function (ix) { var c = ch[ix]; if (!c) return; c.position.y = (isPile[ix] ? c.position.y : base[ix]) + dy; c.visible = vis; }); }
            var topAbs = 3.74;
            return {
                set: function (info, prm) {
                    var Mm = prm.P.M, pre = info.step >= 0;
                    if (pre) {
                        if (info.step === 0) {
                            bowl.visible = true; bowl.position.set(BXg, lerp(2.4, 0.69, sm(info.q, 0, 0.45)), BZg); bowl.rotation.z = 0; bh.scale.set(1, 0.7, 1);
                            var v = Mm * sm(info.q, 0.5, 0.95); bsc.lcd(fmt(v, 2) + ' g', 'M SECA');
                            units.forEach(function (u) { place(u, 0, false); }); place(lid, 0, false);
                            info2.lcd('—', 'TAMIZ');
                            return [{ k: 'Masa seca', v: fmt(v, 1), u: 'g' }, { k: 'Secado', v: '110 °C', u: '' }, { k: 'Tamices', v: '—', u: '' }, { k: 'Pasa 200', v: '—', u: '' }];
                        }
                        bowl.visible = true; bowl.position.set(BXg, 0.69, BZg); bsc.lcd(fmt(Mm, 2) + ' g', 'M SECA');
                        var U = units.length, cur = 0;
                        units.forEach(function (u, k) { var a = k * 0.105, f = sm(info.q, a, a + 0.2), vis = info.q > a; place(u, (1 - f) * 2.6, vis); if (vis) cur = k; });
                        place(lid, 0, false);
                        info2.lcd(G_NAMES[cur], 'abertura ' + G_OPEN[cur] + (cur ? ' mm' : ''));
                        return [{ k: 'Tamiz', v: G_NAMES[cur], u: '' }, { k: 'Abertura', v: G_OPEN[cur], u: cur ? 'mm' : '' }, { k: 'Montados', v: (cur + 1) + '/' + U, u: '' }, { k: 'Masa M', v: fmt(Mm, 0), u: 'g' }];
                    }
                    /* durante "Cargar la muestra": se vierte el recipiente sobre el tamiz superior */
                    units.forEach(function (u) { place(u, 0, true); });
                    var u = clamp(info.po / 0.10, 0, 1), inPour = info.po < 0.10;
                    bowl.visible = inPour;
                    if (inPour) {
                        var mv = sm(u, 0, 0.3) * (1 - sm(u, 0.65, 0.95));
                        bowl.position.set(lerp(BXg, 0.45, mv), lerp(0.69, topAbs, mv), lerp(BZg, 0.05, mv));
                        bowl.rotation.z = -1.35 * sm(u, 0.3, 0.45) * (1 - sm(u, 0.6, 0.72));
                        bh.scale.set(1, 0.7, 1); bh.scale.multiplyScalar(1 - 0.95 * sm(u, 0.38, 0.62)); bh.scale.y = 0.7 * (1 - 0.95 * sm(u, 0.38, 0.62));
                        bsc.lcd(fmt(Mm * (1 - sm(u, 0.38, 0.62)), 2) + ' g', 'M SECA');
                    }
                    parts.forEach(function (pt, i) {
                        var on = inPour && u > 0.38 && u < 0.64, f = ((u * 9 + i / parts.length) % 1);
                        pt.visible = on; if (on) pt.position.set(0.12 + Math.sin(i * 3.1) * 0.12, 3.62 - f * 0.4, 0.05 + Math.cos(i * 2.3) * 0.1);
                    });
                    var ls = sm(u, 0.7, 1), lidOn = info.po >= 0.10 || u > 0.68;
                    place(lid, lidOn ? (1 - ls) * 2.2 * (info.po < 0.10 ? 1 : 0) : 0, lidOn);
                    if (inPour) info2.lcd('Verter M', 'CARGAR MUESTRA');
                    return null;
                }
            };
        }
    };

    /* --------------------------- 3 · LÍMITES --------------------------- */
    CFG.limites = {
        steps: [
            { t: 'Colocar el suelo (pasa No. 40) sobre la placa', d: 'Unos 150 g de suelo seco que pasa el tamiz No. 40 se colocan sobre la placa de vidrio.', sec: 4 },
            { t: 'Agregar agua destilada con la piseta, poco a poco', d: 'Se añade el agua en pequeñas porciones (≈ 5 mL cada vez); después de cada adición el suelo se humedece más.', sec: 8 },
            { t: 'Mezclar y amasar con la espátula', d: 'Se amasa hasta obtener una pasta uniforme y de consistencia plástica, sin grumos secos.', sec: 7 },
            { t: 'Colocar la pasta en la copa y alisarla', d: 'La pasta se pasa a la copa de Casagrande y se nivela con la espátula (máx. 10 mm de espesor).', sec: 5 }
        ],
        props: function (root, h) {
            var mt = Lb().mats(), PX = 2.0, PZ = 0.55;
            box(root, 1.1, 0.04, 1.0, PX, 0.1, PZ, Lb().glassM(0.5));
            var hp = heap(root, 0.4, 0xb89a74); hp.position.set(PX, 0.12, PZ); hp.scale.y = 0.001;
            var jar = new THREE.Group(); jar.position.set(2.1, 0.07, -0.9); root.add(jar);
            cyl(jar, 0.26, 0.26, 0.4, 0, 0.2, 0, Lb().glassM(0.3), 24); cyl(jar, 0.23, 0.23, 0.3, 0, 0.17, 0, M(0xb89a74, 0, 0.95), 20);
            var bt = washBottle(root), rest = new THREE.Vector3(2.35, 0.42, -0.7);
            bt.position.copy(rest);
            var stand = box(root, 1.3, 0.4, 0.22, 2.0, 0.2, 1.55, mt.mint), sc = Lb().screen(root, 1.1, 0.3, 2.0, 0.22, 1.67, 256, 72); sc.lcd('0 mL', 'AGUA');
            var sp = spatula(root), st = streamMesh(root);
            var paste = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 10), M(0x8a6b4a, 0, 0.95)); paste.scale.y = 0.45; paste.visible = false; root.add(paste);
            var dry = 0xb89a74, wet = 0x8a6b4a;
            return {
                set: function (info, prm) {
                    var pre = info.step >= 0, s = info.step, q = info.q;
                    bt.visible = true; stand.visible = true; sc.mesh.visible = true;
                    if (!pre) {
                        hp.visible = false; sp.g.visible = false; paste.visible = false; st.visible = false; bt.position.copy(rest); bt.rotation.z = 0;
                        h.soil.visible = true; h.soil.scale.set(1, 1, 1); sc.lcd('+15 mL', 'AGUA TOTAL');
                        return null;
                    }
                    h.groove.visible = false; hp.visible = s <= 2 || (s === 3 && q < 0.55); paste.visible = false; st.visible = false;
                    h.soil.visible = s === 3 && q > 0.55;
                    if (s === 3) h.soil.scale.set(1, Math.max(0.02, sm(q, 0.55, 0.8)), 1);
                    var C = new THREE.Vector3(PX, 0.3, PZ), mL = 0, state = 'Seco', col = dry;
                    sp.g.visible = false; bt.rotation.z = 0; bt.position.copy(rest);
                    if (s === 0) {
                        var n = 2, k = Math.min(n - 1, Math.floor(q * n)), fr = q * n - k, e = triangle(Math.min(fr, 0.999));
                        sp.g.visible = true; sp.g.position.set(lerp(2.1, PX, e), lerp(0.5, 0.55, e) + Math.sin(Math.PI * e) * 0.4, lerp(-0.9, PZ, e)); sp.blob.visible = fr < 0.5; sp.blob.material.color.setHex(dry);
                        var g0 = (k + (fr >= 0.5 ? 1 : 0)) / n; hp.scale.set(1, 0.7, 1); hp.scale.multiplyScalar(Math.max(0.02, g0)); hp.scale.y = 0.7 * Math.max(0.02, g0); hp.material.color.setHex(dry);
                        sc.lcd('0 mL', 'AGUA');
                        return [{ k: 'Suelo (No.40)', v: fmt(150 * g0, 0), u: 'g' }, { k: 'Agua', v: '0', u: 'mL' }, { k: 'Aspecto', v: 'Seco', u: '' }, { k: 'Golpes', v: '—', u: '' }];
                    }
                    hp.scale.set(1, 0.7, 1);
                    if (s === 1) {
                        var i = Math.min(2, Math.floor(q * 3)), f = q * 3 - i, mv = sm(f, 0, 0.25) * (1 - sm(f, 0.75, 1)), pour = f > 0.28 && f < 0.72;
                        bt.position.set(lerp(rest.x, PX + 0.18, mv), lerp(rest.y, 0.95, mv), lerp(rest.z, PZ, mv)); bt.rotation.z = 0.9 * mv;
                        setStream(st, PX + 0.18, 0.9, 0.24, PZ, pour);
                        mL = 5 * (i + sm(f, 0.3, 0.7)); col = colorMix(dry, wet, 0.6 * mL / 15);
                        hp.material.color.copy(col); state = mL < 5 ? 'Seco' : mL < 11 ? 'Húmedo' : 'Casi plástico';
                        sc.lcd('+' + fmt(mL, 1) + ' mL', 'AGUA AÑADIDA');
                        return [{ k: 'Suelo', v: '150', u: 'g' }, { k: 'Agua', v: fmt(mL, 1), u: 'mL' }, { k: 'Adición', v: (i + 1) + '/3', u: '' }, { k: 'Aspecto', v: state, u: '' }];
                    }
                    if (s === 2) {
                        var ang = q * Math.PI * 2 * 3.5, rr = 0.28 * (1 - 0.3 * q);
                        sp.g.visible = true; sp.g.position.set(PX + Math.cos(ang) * rr, 0.34 + 0.05 * Math.sin(ang * 2), PZ + Math.sin(ang) * rr); sp.g.rotation.y = -ang; sp.blob.visible = false;
                        hp.scale.set(1 + 0.5 * sm(q, 0, 0.8), 0.7 * (1 - 0.45 * sm(q, 0, 0.8)), 1 + 0.5 * sm(q, 0, 0.8));
                        col = colorMix(dry, wet, 0.6 + 0.4 * sm(q, 0, 0.85)); hp.material.color.copy(col);
                        sc.lcd('+15 mL', 'AGUA TOTAL');
                        return [{ k: 'Mezcla', v: fmt(sm(q, 0, 0.85) * 100, 0), u: '%' }, { k: 'Agua', v: '15', u: 'mL' }, { k: 'Aspecto', v: q < 0.5 ? 'Grumoso' : q < 0.85 ? 'Casi uniforme' : 'Pasta plástica', u: '' }, { k: 'Amasado', v: str(Math.floor(q * 12)), u: 'vueltas' }];
                    }
                    /* s === 3: pasta a la copa y alisar */
                    hp.material.color.setHex(wet);
                    var mvp = sm(q, 0, 0.5);
                    hp.scale.set(1.5, 0.7 * 0.55, 1.5); hp.scale.multiplyScalar(1 - mvp); hp.scale.y = 0.385 * (1 - mvp);
                    paste.visible = q < 0.55 && mvp > 0.02; paste.position.set(lerp(PX, 0, mvp), lerp(0.3, 1.25, mvp) + Math.sin(Math.PI * mvp) * 0.7, lerp(PZ, 0.15, mvp));
                    paste.material.color.setHex(wet);
                    var sw = sm(q, 0.78, 1);
                    sp.g.visible = q > 0.7; sp.g.position.set(-0.5 + Math.sin(sw * Math.PI * 3) * 0.5, 1.05, 0.15); sp.g.rotation.y = 0; sp.blob.visible = false;
                    sc.lcd('+15 mL', 'AGUA TOTAL');
                    return [{ k: 'Pasta', v: 'Lista', u: '' }, { k: 'Agua', v: '15', u: 'mL' }, { k: 'Espesor', v: '≤ 10', u: 'mm' }, { k: 'Golpes', v: '—', u: '' }];
                }
            };
        }
    };

    /* ------------------------ 4 · GRAVEDAD ESPECÍFICA ------------------------ */
    CFG.gravedad = {
        steps: [
            { t: 'Pesar el suelo seco (Ws)', d: 'Se pesa la masa de suelo seco al horno que se va a ensayar; queda reservada en su plato.', sec: 5 },
            { t: 'Llenar el picnómetro con agua destilada hasta la marca', d: 'Con la piseta se agrega agua destilada despacio hasta el aforo; luego se seca por fuera y se lleva a la balanza.', sec: 9 }
        ],
        props: function (root, h) {
            var mt = Lb().mats(), Wt = new THREE.Vector3(0.2, 0.09, 1.45);
            var dish = new THREE.Group(); root.add(dish);
            cyl(dish, 0.34, 0.24, 0.12, 0, 0.06, 0, mt.alum, 26);
            var dh = heap(dish, 0.28, 0xc6a27a); dh.position.y = 0.12;
            var funnel = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.35, 18, 1, true), new THREE.MeshStandardMaterial({ color: 0xd5dbe2, metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide })); funnel.rotation.x = Math.PI; funnel.visible = false; root.add(funnel);
            var bt = washBottle(root), st = streamMesh(root); bt.visible = false;
            var parts = []; for (var i = 0; i < 8; i++) { var pm = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), M(0xc6a27a, 0, 0.95)); pm.visible = false; root.add(pm); parts.push(pm); }
            var C = new THREE.Vector3(0, 0.06, 0), BXv = new THREE.Vector3(h.BX, 0.69, 0);
            return {
                set: function (info, prm) {
                    var pre = info.step >= 0, P = prm.P, Ws = P.Ws;
                    var wb = h.wBody, wc = h.wCone, wn = h.wNeck;
                    if (pre) {
                        funnel.visible = false; parts.forEach(function (pt) { pt.visible = false; });
                        if (info.step === 0) {
                            h.pic.visible = false; bt.visible = false; st.visible = false;
                            var d = sm(info.q, 0, 0.4), mv = sm(info.q, 0.8, 1);
                            dish.position.set(lerp(h.BX, Wt.x, mv), lerp(lerp(2.4, 0.69, d), Wt.y, mv), lerp(0, Wt.z, mv)); dish.rotation.z = 0; dh.scale.set(1, 0.7, 1);
                            var v = Ws * sm(info.q, 0.45, 0.78); h.bscr.lcd(fmt(v, 2) + ' g', 'Ws');
                            return [{ k: 'Ws', v: fmt(v, 2), u: 'g' }, { k: 'Suelo', v: 'Seco al horno', u: '' }, { k: 'Agua', v: '—', u: '' }, { k: 'Gs', v: '—', u: '' }];
                        }
                        dish.position.copy(Wt); dish.rotation.z = 0; dh.scale.set(1, 0.7, 1);
                        h.pic.visible = true;
                        var f = sm(info.q, 0.05, 0.68), go = sm(info.q, 0.78, 1);
                        h.pic.position.set(lerp(C.x, BXv.x, go), lerp(C.y, BXv.y, go), 0);
                        var bF = clamp(f / 0.5, 0, 1), cF = clamp((f - 0.5) / 0.25, 0, 1), nF = clamp((f - 0.75) / 0.25, 0, 1);
                        wb.scale.y = Math.max(0.001, bF); wb.position.y = 0.085 + 0.575 * bF;
                        wc.visible = cF > 0.001; wc.scale.y = Math.max(0.001, cF); wc.position.y = 1.25 + 0.3 * cF;
                        wn.scale.y = Math.max(0.001, 0.6 * nF); wn.position.y = 1.95 + 0.3 * nF;
                        bt.visible = info.q < 0.8; bt.position.set(0.45, 3.35, 0); bt.rotation.z = 0.9; 
                        var ys = 0.2 + f * 2.2;
                        setStream(st, 0.0, 3.2, 0.06 + ys, 0, f > 0.01 && f < 0.999 && info.q < 0.74);
                        h.bscr.lcd('0.00 g', 'Wpw');
                        return [{ k: 'Agua', v: fmt(500 * f, 0), u: 'mL' }, { k: 'Aforo', v: f > 0.99 ? 'En la marca' : 'Llenando…', u: '' }, { k: 'Ws', v: fmt(Ws, 2), u: 'g' }, { k: 'Gs', v: '—', u: '' }];
                    }
                    h.pic.visible = true; wb.scale.y = 1; wb.position.y = 0.66; wc.scale.y = 1; wc.position.y = 1.55; wc.visible = true; bt.visible = false; st.visible = false;
                    /* "Verter el suelo": el plato se inclina sobre el embudo del picnómetro */
                    var po = info.po, inPour = po >= 0.12 && po < 0.31;
                    dish.visible = po < 0.31; funnel.visible = po >= 0.13 && po < 0.30;
                    var mv2 = sm(po, 0.12, 0.19) * (1 - sm(po, 0.28, 0.31));
                    dish.position.set(lerp(Wt.x, 0.3, mv2), lerp(Wt.y, 3.75, mv2) + Math.sin(Math.PI * mv2) * 0.0, lerp(Wt.z, 0, mv2));
                    dish.rotation.z = 1.5 * sm(po, 0.19, 0.23) * (1 - sm(po, 0.27, 0.29)); dh.scale.set(1, 0.7, 1); dh.scale.multiplyScalar(1 - 0.97 * sm(po, 0.21, 0.27)); dh.scale.y = 0.7 * (1 - 0.97 * sm(po, 0.21, 0.27));
                    funnel.position.set(0, 3.1, 0);
                    parts.forEach(function (pt, i) {
                        var on = inPour && po > 0.21 && po < 0.275, f2 = ((po * 70 + i / parts.length) % 1);
                        pt.visible = on; if (on) pt.position.set(0.0 + Math.sin(i * 2.2) * 0.04, 3.55 - f2 * 1.0, Math.cos(i * 1.7) * 0.04);
                    });
                    return null;
                }
            };
        }
    };

    /* ------------------------ 5 · COMPACTACIÓN (Proctor) ------------------------ */
    /* Línea de tiempo propia: por cada molde → agua → mezcla → capas (con golpes lentos) → pesada.
       Un golpe cada 0,5 s a velocidad 1× (antes eran ~15 golpes por segundo).                     */
    var PROC = { Tp0: 6, Tw: 6, Tm: 5, Ts: 2.5, per: 0.5, Tg: 7 };
    CFG.compactacion = {
        defaultSpeed: 1,
        phases: [
            { t: 'Preparar las 5 porciones de suelo', d: 'El suelo seco se divide en cinco porciones iguales (≈ 2,5 kg cada una); cada una se ensayará con más agua que la anterior.' },
            { t: 'Agregar el agua (humedad objetivo)', d: 'Con la probeta graduada se vierte el volumen de agua calculado para alcanzar la humedad de este molde.' },
            { t: 'Mezclar y curar', d: 'Se mezcla con la espátula hasta que el agua quede repartida de forma uniforme y se deja reposar (curado).' },
            { t: 'Compactar por capas con el martillo', d: 'Se coloca cada capa en el molde y se le dan 25 golpes, repartidos sobre toda la superficie, con la altura de caída normalizada.' },
            { t: 'Enrasar y pesar el molde', d: 'Se retira el collar, se enrasa con la regla y se pesa: de ahí salen γ húmedo y γd para este punto de la curva.' }
        ],
        timeline: function (prm) {
            var Pr = prm.M.Pr, Lc = Pr.layers, B = Pr.blows, T = PROC;
            var perLayer = T.Ts + B * T.per, Tcomp = Lc * perLayer, slot = T.Tw + T.Tm + Tcomp + T.Tg, total = T.Tp0 + 5 * slot;
            return {
                total: total, L: Lc, B: B,
                marks: [0, T.Tp0, T.Tp0 + T.Tw, T.Tp0 + T.Tw + T.Tm, T.Tp0 + T.Tw + T.Tm + Tcomp, T.Tp0 + slot],
                map: function (t) {
                    if (t < T.Tp0) return { step: 0, q: t / T.Tp0, po: 0, i: 0, layer: 0, inLayer: 0, scoop: -1, blows: 0 };
                    if (t >= total) return { step: 4, q: 1, po: 1, i: 4, layer: Lc - 1, inLayer: B, scoop: -1, blows: Lc * B };
                    var u = t - T.Tp0, i = Math.min(4, Math.floor(u / slot)), v = u - i * slot;
                    if (v < T.Tw) return { step: 1, q: v / T.Tw, po: i / 5, i: i, layer: 0, inLayer: 0, scoop: -1, blows: 0 };
                    if (v < T.Tw + T.Tm) return { step: 2, q: (v - T.Tw) / T.Tm, po: i / 5, i: i, layer: 0, inLayer: 0, scoop: -1, blows: 0 };
                    var c = v - T.Tw - T.Tm;
                    if (c < Tcomp) {
                        var l = Math.min(Lc - 1, Math.floor(c / perLayer)), r = c - l * perLayer, scoop = -1, bd;
                        if (r < T.Ts) { scoop = r / T.Ts; bd = l * B; } else bd = l * B + (r - T.Ts) / T.per;
                        var s = 0.8 * (bd + 1e-6) / (Lc * B);
                        return { step: 3, q: c / Tcomp, po: (i + s) / 5, i: i, layer: l, inLayer: Math.floor(bd - l * B + 1e-6), scoop: scoop, blows: Math.floor(bd + 1e-6) };
                    }
                    var w = (c - Tcomp) / T.Tg;
                    return { step: 4, q: w, po: (i + 0.8 + 0.2 * Math.min(w, 0.9999) + 1e-6) / 5, i: i, layer: Lc - 1, inLayer: B, scoop: -1, blows: Lc * B };
                }
            };
        },
        props: function (root, h) {
            var mt = Lb().mats(), TX = -1.85, TZ = 1.1, dry = 0xa5825c, wet = 0x624228;
            box(root, 1.3, 0.08, 1.0, TX, 0.1, TZ, mt.alum);
            var hp = heap(root, 0.5, dry); hp.position.set(TX, 0.14, TZ);
            var bk = beaker(root), restB = new THREE.Vector3(-0.8, 0.1, 1.15); bk.g.position.copy(restB);
            var st = streamMesh(root), sp = spatula(root);
            box(root, 1.5, 0.5, 0.25, -0.9, 0.31, 1.75, mt.mint);
            var sc = Lb().screen(root, 1.3, 0.36, -0.9, 0.34, 1.88, 256, 72); sc.lcd('0 mL', 'AGUA');
            var loose = new THREE.Mesh(new THREE.CylinderGeometry(h.R - 0.03, h.R - 0.03, 1, 36), M(0x8a6b4a, 0, 0.95)); loose.visible = false; root.add(loose);
            var scoopBlob = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), M(0x8a6b4a, 0, 0.95)); scoopBlob.visible = false; root.add(scoopBlob);
            var lid = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.04, 28), M(0xc9d2d9, 0.8, 0.3)); lid.visible = false; root.add(lid);
            var M2 = null;
            return {
                set: function (info, prm) {
                    var Pr = prm.M.Pr, Lc = Pr.layers, B = Pr.blows, i = info.i, wi = prm.M.ws[i], t = clamp((wi - 6) / 22, 0, 1), mL = 2500 * wi / 100, s = info.step, q = info.q;
                    st.visible = false; sp.g.visible = false; loose.visible = false; scoopBlob.visible = false; lid.visible = false;
                    bk.g.position.copy(restB); bk.g.rotation.z = 0;
                    var colNow = colorMix(dry, wet, t);
                    /* --- paso 0: las cinco porciones aparecen una a una --- */
                    if (s === 0) {
                        h.cups.forEach(function (c, m) { var a = sm(q, m * 0.15, m * 0.15 + 0.25); c.g.visible = a > 0.01; c.g.scale.multiplyScalar(Math.max(0.01, a)); });
                        hp.visible = true; hp.material.color.setHex(dry); hp.scale.set(1.5 - 0.5 * sm(q, 0.1, 0.9), 1.05 - 0.35 * sm(q, 0.1, 0.9), 1.5 - 0.5 * sm(q, 0.1, 0.9));
                        sc.lcd('5 × 2500 g', 'PORCIONES');
                        return [{ k: 'Porciones', v: str(Math.min(5, Math.floor(q * 6.3))), u: '/5' }, { k: 'Masa c/u', v: '2500', u: 'g' }, { k: 'Suelo', v: 'Seco al aire', u: '' }, { k: 'Molde', v: '—', u: '' }];
                    }
                    hp.visible = true; hp.scale.set(1, 0.7, 1);
                    /* --- paso 1: agregar el agua --- */
                    if (s === 1) {
                        var mv = sm(q, 0, 0.2) * (1 - sm(q, 0.82, 1)), pour = q > 0.24 && q < 0.8, f = sm(q, 0.26, 0.78);
                        bk.g.position.set(lerp(restB.x, -1.13, mv), lerp(restB.y, 0.88, mv), lerp(restB.z, 1.1, mv)); bk.g.rotation.z = 1.1 * mv;
                        bk.level(1 - 0.85 * f); setStream(st, -1.85, 1.0, 0.56 - 0.12 * f, 1.1, pour);
                        hp.material.color.copy(colorMix(dry, colNow, 0.6 * f).clone()); hp.scale.set(1 + 0.08 * f, 0.7 * (1 - 0.1 * f), 1 + 0.08 * f);
                        sc.lcd('+' + fmt(mL * f, 0) + ' mL', 'MOLDE ' + (i + 1) + ' · w ' + fmt(wi, 1) + ' %');
                        return [{ k: 'Molde', v: (i + 1) + '/5', u: '' }, { k: 'w objetivo', v: fmt(wi, 1), u: '%' }, { k: 'Agua', v: fmt(mL * f, 0), u: 'mL' }, { k: 'Suelo seco', v: '2500', u: 'g' }];
                    }
                    /* --- paso 2: mezclar y curar --- */
                    if (s === 2) {
                        var ang = q * Math.PI * 2 * 4, rr = 0.32;
                        sp.g.visible = q < 0.8; sp.g.position.set(TX + Math.cos(ang) * rr, 0.42 + 0.05 * Math.sin(ang * 2), TZ + Math.sin(ang) * rr); sp.g.rotation.y = -ang; sp.blob.visible = false;
                        hp.material.color.copy(colorMix(dry, colNow, 0.6 + 0.4 * sm(q, 0, 0.8))); hp.scale.set(1.2, 0.55, 1.2);
                        lid.visible = q > 0.82; lid.position.set(TX, 0.5 + 0.8 * (1 - sm(q, 0.82, 0.95)), TZ);
                        sc.lcd(fmt(mL, 0) + ' mL', q > 0.82 ? 'CURANDO…' : 'MEZCLANDO');
                        return [{ k: 'Molde', v: (i + 1) + '/5', u: '' }, { k: 'w objetivo', v: fmt(wi, 1), u: '%' }, { k: 'Mezcla', v: q > 0.8 ? 'Curando' : fmt(sm(q, 0, 0.8) * 100, 0) + ' %', u: '' }, { k: 'Agua', v: fmt(mL, 0), u: 'mL' }];
                    }
                    /* --- paso 3: capas y golpes --- */
                    if (s === 3) {
                        var Lc2 = Lc, done = info.layer + (info.scoop >= 0 ? 0 : 1) * 0;
                        var left = 1 - (info.layer + (info.scoop >= 0 ? Math.min(1, info.scoop * 1.4) : 1)) / Lc2;
                        hp.material.color.copy(colNow); hp.scale.set(1.2 * Math.max(0.05, left) + 0.1, 0.55 * Math.max(0.1, left), 1.2 * Math.max(0.05, left) + 0.1); hp.visible = left > 0.02;
                        var th = h.MH / Lc, yBase = h.MY + info.layer * th;
                        if (info.scoop >= 0) {
                            var e = triangle(Math.min(info.scoop, 0.999));
                            sp.g.visible = true; sp.g.position.set(lerp(TX, 0.0, e), lerp(0.5, 2.1, e) + Math.sin(Math.PI * e) * 0.5, lerp(TZ, 0.0, e)); sp.g.rotation.z = -0.3 * e; sp.blob.visible = info.scoop < 0.5; sp.blob.material.color.copy(colNow);
                            var drop = sm(info.scoop, 0.45, 0.8);
                            loose.visible = drop > 0.02; loose.material.color.copy(colNow); loose.scale.y = Math.max(0.01, th * 0.6 * drop); loose.position.set(0, yBase + th * 0.3 * drop, 0);
                        }
                        h.ham.visible = true;
                        sc.lcd(fmt(wi, 1) + ' %', 'MOLDE ' + (i + 1) + ' · CAPA ' + (info.layer + 1) + '/' + Lc);
                        return [{ k: 'Molde', v: (i + 1) + '/5', u: '' }, { k: 'Capa', v: (info.layer + 1) + '/' + Lc, u: '' }, { k: 'Golpes', v: str(info.inLayer), u: '/' + B }, { k: 'w', v: fmt(wi, 1), u: '%' }];
                    }
                    /* --- paso 4: enrasar y pesar (HUD y balanza del original) --- */
                    hp.visible = false;
                    return null;
                }
            };
        }
    };

    /* --------------------- 6 · DENSIDAD DE CAMPO (cono de arena) --------------------- */
    CFG.densidad = {
        steps: [
            { t: 'Pesar el frasco con la arena calibrada', d: 'Se pesa el frasco lleno de arena de densidad conocida; al final, la diferencia da la arena que llenó el hueco y el cono.', sec: 5 },
            { t: 'Nivelar el terreno y asentar la placa base', d: 'Se alisa la superficie, se coloca la placa base y se comprueba con el nivel; la placa se fija al suelo para que no se mueva.', sec: 6 }
        ],
        props: function (root, h) {
            var mt = Lb().mats(), HX = h.HX, BX = h.BX;
            var jar = new THREE.Group(); root.add(jar);
            var jg = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.95, 28, 1, true), Lb().glassM(0.28)); jg.position.y = 0.475; jar.add(jg);
            cyl(jar, 0.4, 0.4, 0.78, 0, 0.4, 0, mt.sand, 26); cyl(jar, 0.16, 0.16, 0.12, 0, 0.99, 0, mt.steelD, 14);
            var plate = Lb().lathe([[0.4, 0], [1.0, 0], [1.0, 0.06], [0.4, 0.06]], mt.steelL, 40); plate.position.set(HX, 0.87, 0); root.add(plate);
            var lvl = new THREE.Group(); lvl.position.set(HX, 1.0, 0.3); root.add(lvl); box(lvl, 1.3, 0.07, 0.18, 0, 0, 0, mt.dark); cyl(lvl, 0.045, 0.045, 0.02, 0, 0.045, 0, mt.green, 10);
            var tr = new THREE.Group(); root.add(tr); box(tr, 0.3, 0.02, 0.2, 0.15, 0, 0, M(0xc9d2d9, 0.85, 0.28)); box(tr, 0.45, 0.05, 0.06, 0.5, 0.02, 0, mt.dark);
            return {
                set: function (info, prm) {
                    var pre = info.step >= 0, Mx = prm.M, P = prm.P, Mj = Mx.Mtot + 3200;
                    jar.visible = false; lvl.visible = false; tr.visible = false;
                    if (pre) {
                        h.bowl.visible = false; h.heap.visible = false; plate.visible = false;
                        if (info.step === 0) {
                            jar.visible = true; jar.position.set(BX, lerp(2.4, 0.69, sm(info.q, 0, 0.45)), 0);
                            var v = Mj * sm(info.q, 0.5, 0.9); h.bscr.lcd(fmt(v, 0) + ' g', 'ARENA');
                            return [{ k: 'Arena (frasco)', v: fmt(v, 0), u: 'g' }, { k: 'ρ arena', v: fmt(P.rs, 2), u: 'g/cm³' }, { k: 'Calibración', v: 'Hecha', u: '' }, { k: 'Hueco', v: '—', u: '' }];
                        }
                        var f = info.q;
                        jar.visible = f < 0.3; jar.position.set(BX, 0.69 + 2.2 * sm(f, 0, 0.28), 0);
                        plate.visible = f > 0.15; plate.position.y = lerp(2.3, 0.87, sm(f, 0.2, 0.62));
                        lvl.visible = f > 0.66 && f < 0.95; lvl.position.set(HX, 1.0, 0.3 + 0.4 * Math.sin(f * 20) * (f < 0.8 ? 1 : 0.1));
                        h.bscr.lcd('0 g', 'SUELO');
                        return [{ k: 'Placa base', v: f > 0.66 ? 'Nivelada' : 'Asentando…', u: '' }, { k: 'Terreno', v: f > 0.5 ? 'Plano' : 'Alisando', u: '' }, { k: 'ρ arena', v: fmt(P.rs, 2), u: 'g/cm³' }, { k: 'Hueco', v: '—', u: '' }];
                    }
                    /* excavación: la placa ya está colocada y se cava el hueco con la cuchara */
                    h.bowl.visible = true; h.heap.visible = true;
                    plate.visible = !h.app.visible; plate.position.y = 0.87;
                    if (info.po < 0.15) {
                        tr.visible = true; var a = info.po * 120;
                        tr.position.set(HX + Math.cos(a) * 0.2, 1.1 + 0.18 * Math.abs(Math.sin(a * 0.5)), Math.sin(a) * 0.2); tr.rotation.set(0, -a, 0.5);
                    }
                    return null;
                }
            };
        }
    };

    /* ------------------------ 7 · CLASIFICACIÓN SUCS ------------------------ */
    CFG.clasificacion = {
        steps: [
            { t: 'Secar, pesar y tamizar la muestra', d: 'La muestra seca se pasa por los tamices No. 4 y No. 200 para conocer los porcentajes de grava, arena y finos.', sec: 8 },
            { t: 'Ensayar la plasticidad de los finos', d: 'Con la fracción fina se determina el límite líquido (copa de Casagrande, 25 golpes) y el límite plástico (rollitos de 3 mm).', sec: 14 }
        ],
        props: function (root, h) {
            var mt = Lb().mats();
            var sv = new THREE.Group(); sv.position.set(3.6, 0.09, 0.95); root.add(sv);
            cyl(sv, 0.55, 0.5, 0.22, 0, 0.11, 0, mt.steelL, 32);
            [0.34, 0.6].forEach(function (y, k) { var m = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.24, 32, 1, true), mt.brass); m.material.side = THREE.DoubleSide; m.position.y = y; sv.add(m); });
            var hs = heap(sv, 0.4, 0xd8b98a); hs.position.y = 0.74;
            box(root, 2.0, 0.4, 0.2, 2.4, 0.2, 1.68, mt.mint); var sc = Lb().screen(root, 1.8, 0.34, 2.4, 0.22, 1.79, 256, 72); sc.lcd('—', 'ENSAYOS PREVIOS');
            /* mini copa de Casagrande */
            var cg = new THREE.Group(); cg.position.set(1.2, 0.09, 0.95); root.add(cg);
            box(cg, 0.9, 0.14, 0.8, 0, 0.07, 0, mt.rubber); box(cg, 0.12, 0.5, 0.12, 0, 0.35, -0.3, mt.steelM);
            var arm = new THREE.Group(); arm.position.set(0, 0.5, -0.3); cg.add(arm);
            box(arm, 0.08, 0.06, 0.55, 0, 0, 0.27, mt.steelM);
            var bowl = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mt.brass); bowl.material.side = THREE.DoubleSide; bowl.position.set(0, 0, 0.55); arm.add(bowl);
            cyl(arm, 0.27, 0.27, 0.03, 0, -0.07, 0.55, M(0x8a6b4a, 0, 0.95), 24);
            var groove = box(arm, 0.1, 0.01, 0.52, 0, -0.045, 0.55, M(0xb9962b, 0.1, 0.8));
            /* placa con rollitos */
            box(root, 0.9, 0.04, 0.8, 2.4, 0.11, 0.95, Lb().glassM(0.5));
            var th = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), M(0x8a6b4a, 0, 0.9)); th.rotation.z = Math.PI / 2; th.position.set(2.4, 0.2, 0.9); root.add(th);
            var th2 = th.clone(); th2.position.set(2.4, 0.2, 1.15); th2.visible = false; root.add(th2);
            var bar = box(root, 0.5, 0.03, 0.22, 2.4, 0.3, 0.9, mt.steelL);
            return {
                set: function (info, prm) {
                    var P = prm.P, pre = info.step >= 0, q = info.q, LP = Math.max(0, P.LL - P.IP);
                    if (!pre) { hs.visible = false; bar.visible = false; th.visible = th2.visible = true; sc.lcd(P.LL + ' / ' + P.IP, 'LL / IP'); arm.rotation.x = 0; groove.scale.x = 0.05; return null; }
                    if (info.step === 0) {
                        hs.visible = true; var f = sm(q, 0.2, 0.85); hs.scale.set(1 - 0.9 * f, 0.7 * (1 - 0.9 * f), 1 - 0.9 * f);
                        sv.position.x = 3.6 + (q > 0.15 && q < 0.9 ? Math.sin(q * 520) * 0.02 : 0); bar.visible = false; th.visible = th2.visible = false;
                        var a = sm(q, 0.4, 0.55), b = sm(q, 0.6, 0.8);
                        sc.lcd(fmt(P.F4 * a, 0) + ' %', 'PASA No.4'); 
                        return [{ k: 'Pasa No.4', v: fmt(P.F4 * a, 0), u: '%' }, { k: 'Pasa No.200', v: fmt(P.F200 * b, 0), u: '%' }, { k: 'Tamices', v: 'No.4 y No.200', u: '' }, { k: 'Fracción', v: 'Grava · Arena · Finos', u: '' }];
                    }
                    sv.position.x = 3.6; hs.visible = false;
                    var n = 25 * tw(q, 0.03, 0.62), fr = n - Math.floor(n), run = q > 0.03 && q < 0.62;
                    arm.rotation.x = -0.12 * (run ? (fr < 0.5 ? ease(fr * 2) : 1 - Math.pow((fr - 0.5) * 2, 3)) : 0);
                    groove.scale.x = Math.max(0.02, 1 - Math.pow(clamp(n / 25, 0, 1), 1.4));
                    var rl = sm(q, 0.7, 0.97);
                    th.visible = true; th.scale.set(1, 1.0 + 0.9 * rl, 1); th.scale.x = 1.2 - 0.6 * rl; th.scale.z = 1.2 - 0.6 * rl;
                    th2.visible = rl > 0.85; th2.scale.set(0.6, 0.45, 0.6); th2.position.x = 2.4 + 0.55;
                    bar.visible = q > 0.68 && q < 0.97; bar.position.set(2.4, 0.3, 0.9 + 0.12 * Math.sin(q * 140));
                    var txt = q < 0.64 ? 'N = ' + Math.floor(n) : q < 0.7 ? 'LL = ' + P.LL + ' %' : 'LP = ' + fmt(LP, 0) + ' %';
                    sc.lcd(txt, q < 0.64 ? 'GOLPES' : q < 0.7 ? 'LÍMITE LÍQUIDO' : 'LÍMITE PLÁSTICO');
                    return [{ k: 'Golpes N', v: str(Math.floor(n)), u: '' }, { k: 'LL', v: q > 0.64 ? str(P.LL) : '—', u: q > 0.64 ? '%' : '' }, { k: 'LP', v: q > 0.95 ? fmt(LP, 0) : '—', u: q > 0.95 ? '%' : '' }, { k: 'IP', v: q > 0.97 ? str(P.IP) : '—', u: q > 0.97 ? '%' : '' }];
                }
            };
        }
    };

    /* ------------------------ 8 · PERMEABILIDAD ------------------------ */
    CFG.permeabilidad = {
        steps: [
            { t: 'Compactar el suelo en el cilindro, por capas', d: 'Sobre la piedra porosa inferior se coloca el suelo en capas y se apisona cada una para lograr la densidad deseada; arriba va la otra piedra porosa.', sec: 9 },
            { t: 'Llenar el tanque y saturar la muestra', d: 'Se llena el tanque de nivel constante con agua y se deja que sature el suelo desde abajo, sin dejar aire atrapado.', sec: 9 }
        ],
        props: function (root, h) {
            var mt = Lb().mats(), CX = h.CX;
            var tamp = new THREE.Group(); root.add(tamp);
            cyl(tamp, 0.4, 0.4, 0.1, 0, 0, 0, mt.steelL, 24); cyl(tamp, 0.05, 0.05, 1.6, 0, 0.85, 0, mt.steelD, 10); cyl(tamp, 0.12, 0.12, 0.25, 0, 1.7, 0, mt.dark, 12);
            box(root, 1.4, 0.4, 0.25, -0.5, 0.2, 1.1, mt.mint); var sc = Lb().screen(root, 1.2, 0.32, -0.5, 0.22, 1.23, 256, 72); sc.lcd('—', 'CAPA');
            var jug = new THREE.Group(); root.add(jug);
            var jb = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.26, 0.8, 22), new THREE.MeshStandardMaterial({ color: 0xe8f1ff, transparent: true, opacity: 0.8, roughness: 0.3 })); jb.position.y = 0.4; jug.add(jb);
            var jw = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.23, 1, 20), Lb().waterM(0.7)); jug.add(jw);
            box(jug, 0.12, 0.5, 0.06, 0.38, 0.45, 0, mt.steelL);
            var st = streamMesh(root);
            var jugRest = new THREE.Vector3(-2.7, 0.09, 1.0);
            return {
                set: function (info, prm) {
                    var pre = info.step >= 0, q = info.q, soil = h.soil, topSoil = 0.94;
                    st.visible = false;
                    if (!pre) {
                        soil.scale.y = 1; soil.position.y = h.CY + h.CH / 2; soil.material.color.setScalar(0.72); h.stoneT.visible = true; h.stoneT.position.y = h.CY + h.CH / 2 + 0.61;
                        h.tw.scale.y = 1; h.tw.position.y = 3.87; tamp.visible = false; jug.visible = true; jug.position.copy(jugRest); jug.rotation.z = 0; jw.scale.y = 0.15; jw.position.y = 0.1;
                        return null;
                    }
                    var P = prm.P;
                    if (info.step === 0) {
                        var g = sm(q, 0, 0.8), lay = Math.min(3, Math.floor(q / 0.27) + 1), sh = Math.max(0.01, g);
                        soil.visible = true; soil.scale.y = sh; soil.position.y = topSoil + 0.56 * sh; soil.material.color.setScalar(1);
                        h.tw.scale.y = 0.001; h.tw.position.y = 3.47;
                        var tp = Math.sin(q * 90) * 0.5 + 0.5, topY = topSoil + 1.12 * sh;
                        tamp.visible = q < 0.86; tamp.position.set(CX, topY + 0.15 + 0.45 * tp, 0);
                        h.stoneT.visible = q > 0.84; h.stoneT.position.y = lerp(3.4, 2.11, sm(q, 0.86, 1));
                        jug.visible = true; jug.position.copy(jugRest); jug.rotation.z = 0; jw.scale.y = 0.65; jw.position.y = 0.5;
                        sc.lcd(q < 0.84 ? lay + ' / 3' : 'PIEDRA', q < 0.84 ? 'CAPA' : 'POROSA SUPERIOR');
                        return [{ k: 'Capa', v: lay + '/3', u: '' }, { k: 'L', v: fmt(P.L, 1), u: 'cm' }, { k: 'D', v: fmt(P.D, 1), u: 'cm' }, { k: 'Estado', v: q < 0.84 ? 'Apisonando' : 'Armando celda', u: '' }];
                    }
                    soil.visible = true; soil.scale.y = 1; soil.position.y = h.CY + h.CH / 2; tamp.visible = false;
                    h.stoneT.visible = true; h.stoneT.position.y = h.CY + h.CH / 2 + 0.61;
                    var mv = sm(q, 0, 0.18) * (1 - sm(q, 0.85, 1)), f = sm(q, 0.22, 0.8);
                    jug.visible = true; jug.position.set(lerp(jugRest.x, -1.55, mv), lerp(jugRest.y, 4.95, mv), lerp(jugRest.z, 0.5, mv)); jug.rotation.z = -0.95 * mv;
                    jw.scale.y = 0.65 * (1 - 0.85 * f) + 0.02; jw.position.y = 0.1 + 0.5 * (1 - 0.85 * f);
                    setStream(st, -1.2, 4.7, 3.47 + 0.8 * f, 0.1, q > 0.24 && q < 0.8);
                    h.tw.scale.y = Math.max(0.001, f); h.tw.position.y = 3.47 + 0.4 * f;
                    var sat = sm(q, 0.35, 1); soil.material.color.setScalar(1 - 0.28 * sat);
                    sc.lcd(fmt(sat * 100, 0) + ' %', 'SATURACIÓN');
                    return [{ k: 'Tanque', v: fmt(f * 100, 0), u: '%' }, { k: 'Saturación', v: fmt(sat * 100, 0), u: '%' }, { k: 'h', v: fmt(P.h, 0), u: 'cm' }, { k: 'Estado', v: sat < 0.99 ? 'Saturando' : 'Saturada', u: '' }];
                }
            };
        }
    };

    /* ================================================================== */
    /*  ENVOLTURA: pasos previos + ensayo original                         */
    /* ================================================================== */
    function sumSec(a) { var t = 0; a.forEach(function (s) { t += s.sec; }); return t; }

    function wrap(tipo, def, cfg) {
        var orig = def.meta, oldPh = orig.phases, origDur = orig.duration;
        if (cfg.drop) { oldPh = oldPh.slice(cfg.drop).map(function (ph) { var c = {}; Object.keys(ph).forEach(function (k) { c[k] = ph[k]; }); return c; }); oldPh[0].a = 0; }
        var meta = {}; Object.keys(orig).forEach(function (k) { meta[k] = orig[k]; });
        var steps = cfg.steps || [], nS = steps.length, T0 = sumSec(steps);

        function layout() {
            var total = T0 + origDur, arr = [], acc = 0;
            steps.forEach(function (s) { arr.push({ a: acc / total, b: (acc + s.sec) / total, t: s.t, d: s.d }); acc += s.sec; });
            oldPh.forEach(function (ph) { arr.push({ a: (T0 + ph.a * origDur) / total, b: (T0 + ph.b * origDur) / total, t: ph.t, d: ph.d }); });
            return arr;
        }
        if (cfg.timeline) {
            meta.phases = cfg.phases.map(function (ph, i) { return { a: i / cfg.phases.length, b: (i + 1) / cfg.phases.length, t: ph.t, d: ph.d }; });
            var tl0 = cfg.timeline({ M: { Pr: { layers: 3, blows: 25 } } }); meta.duration = tl0.total; meta.phases.forEach(function (ph, i) { ph.a = tl0.marks[i] / tl0.total; ph.b = tl0.marks[i + 1] / tl0.total; });
            if (cfg.defaultSpeed) meta.defaultSpeed = cfg.defaultSpeed;
        } else {
            meta.phases = layout(); meta.duration = T0 + origDur;
        }

        function setMarks(tl) { meta.phases.forEach(function (ph, i) { ph.a = tl.marks[i] / tl.total; ph.b = tl.marks[i + 1] / tl.total; }); }
        var params = function () {
            var prm = def.params();
            if (cfg.timeline) { prm.__tl = cfg.timeline(prm); meta.duration = prm.__tl.total; setMarks(prm.__tl); }
            return prm;
        };
        var build = function (accent) {
            var o = def.build(accent), ex = cfg.props ? cfg.props(o.root, o.h || {}) : null;
            function set(p, prm) {
                var info;
                if (cfg.timeline) {
                    var tl = prm.__tl || (prm.__tl = cfg.timeline(prm)); info = tl.map(p * tl.total);
                } else {
                    var t = p * meta.duration;
                    if (t < T0) { var acc = 0, i = 0; for (; i < nS; i++) { if (t < acc + steps[i].sec) break; acc += steps[i].sec; } i = Math.min(i, nS - 1); info = { step: i, q: clamp((t - acc) / steps[i].sec, 0, 1), po: 0 }; }
                    else info = { step: -1, q: 0, po: (t - T0) / origDur };
                }
                info.po = clamp(info.po, 0, 1);
                var r = o.set(info.po, prm), hud = ex ? ex.set(info, prm, r) : null;
                if (hud) r.hud = hud;
                var k = 0; oldPh.forEach(function (ph, j) { if (info.po >= ph.a) k = j; });
                r.stepIdx = info.step >= 0 ? info.step : nS + k;
                return r;
            }
            return { root: o.root, pins: o.pins, set: set, h: o.h };
        };
        return { meta: meta, params: params, build: build };
    }

    var base = L3.register;
    L3.register = function (tipo, def) {
        var cfg = CFG[tipo];
        if (cfg && def && def.meta && def.build) def = wrap(tipo, def, cfg);
        return base.call(L3, tipo, def);
    };
    L3.__pasosCFG = CFG;
    L3.__pasosWrap = wrap;
    L3.__pasosKit = { spatula: spatula, heap: heap, streamMesh: streamMesh, setStream: setStream, washBottle: washBottle, beaker: beaker, triangle: triangle, tw: tw, sm: sm, colorMix: colorMix };
})(window);
