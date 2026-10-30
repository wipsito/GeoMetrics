/**
 * GeoMetrics — Laboratorio 3D · Mecánica de Suelos II · PASO A PASO VISUAL
 *
 * Igual que en Suelos I: antes de cada ensayo se ve la preparación completa de la probeta
 * (tallar, medir, pesar, armar el equipo) y luego se ejecuta el ensayo original.
 *   · Corte directo ........ tallar con el anillo → medir y pesar → armar la caja de corte
 *   · Compresión inconfinada  extraer del tubo → medir y pesar → centrar en la prensa
 *   · Consolidación ........ tallar con el anillo → medir y pesar → montar el edómetro
 *   · Triaxial ............. tallar y medir → membrana, piedras y cabezal → armar la cámara
 *
 * Debe cargarse DESPUÉS de lab3d-ensayos.js, lab3d-ms1-pasos.js y lab3d-ms1.js.
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D;
    if (!L3 || !L3.get || !L3.__pasosWrap || L3.__pasos2) return;
    L3.__pasos2 = true;
    var K = L3.kit, M = K.M, box = K.box, cyl = K.cyl, clamp = K.clamp, lerp = K.lerp, ease = K.ease, fmt = K.fmt;
    var P = L3.__pasosKit, tw = P.tw, sm = P.sm;
    function Lb() { return L3.lib; }
    function str(v) { return String(v); }

    /* ------------------------- piezas del puesto de trabajo ------------------------- */
    function tableAt(root, x, z, top, w, d) {
        var mt = Lb().mats();
        box(root, w, 0.06, d, x, top - 0.03, z, mt.mint);
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (s) { box(root, 0.06, top - 0.06, 0.06, x + s[0] * (w / 2 - 0.06), (top - 0.06) / 2, z + s[1] * (d / 2 - 0.06), mt.steelD); });
    }
    function balAt(root, x, z, top, R) {
        var mt = Lb().mats(), w = 2 * R + 0.5, d = 2 * R + 0.35;
        box(root, w, 0.16, d, x, top + 0.08, z, mt.mint);
        cyl(root, R, R, 0.03, x, top + 0.175, z, mt.steelL, 32);
        var scr = Lb().screen(root, Math.min(0.9, w * 0.7), 0.17, x, top + 0.08, z + d / 2 + 0.004, 256, 56);
        scr.lcd('0.00 g', 'BALANZA');
        return { pan: top + 0.19, scr: scr, x: x, z: z };
    }
    /* calibre: dos pares de mordazas (diámetro / altura) */
    function jawsMake(root) {
        var steel = M(0xdfe5ea, 0.85, 0.25), g = new THREE.Group(); root.add(g);
        var j = { l: box(g, 0.03, 0.55, 0.3, 0, 0, 0, steel), r: box(g, 0.03, 0.55, 0.3, 0, 0, 0, steel), t: box(g, 0.5, 0.03, 0.3, 0, 0, 0, steel), b: box(g, 0.5, 0.03, 0.3, 0, 0, 0, steel), g: g };
        j.hide = function () { j.l.visible = j.r.visible = j.t.visible = j.b.visible = false; };
        j.diam = function (cx, cy, cz, half, open) { j.hide(); j.l.visible = j.r.visible = true; var gap = half + 0.02 + (1 - open) * 0.4; j.l.position.set(cx - gap, cy, cz); j.r.position.set(cx + gap, cy, cz); };
        j.alt = function (cx, cy, cz, half, open) { j.hide(); j.t.visible = j.b.visible = true; var gap = half + 0.02 + (1 - open) * 0.4; j.t.position.set(cx, cy + gap, cz); j.b.position.set(cx, cy - gap, cz); };
        j.hide(); return j;
    }
    function wireSaw(root) { var m = box(root, 1.5, 0.012, 0.012, 0, 0, 0, M(0xd9dde2, 0.9, 0.2)); m.visible = false; return m; }
    function path(pts, f) {            /* interpola por una lista de puntos [x,y,z] con f en 0..1 */
        var n = pts.length - 1, t = clamp(f, 0, 1) * n, i = Math.min(n - 1, Math.floor(t)), e = ease(t - i), a = pts[i], b = pts[i + 1];
        return [lerp(a[0], b[0], e), lerp(a[1], b[1], e), lerp(a[2], b[2], e)];
    }

    var CFG = {};

    /* ======================= CORTE DIRECTO ======================= */
    CFG.corte = {
        drop: 2,
        steps: [
            { t: 'Tallar la muestra con el anillo cortante', d: 'Se presiona el anillo de 60 × 60 mm sobre el bloque de suelo y se enrasan las caras con el alambre de corte.', sec: 6 },
            { t: 'Medir las dimensiones y pesar la muestra', d: 'Con el calibre se mide el lado y el espesor; luego se pesa para conocer la densidad inicial.', sec: 5 },
            { t: 'Armar la caja de corte y colocar la muestra', d: 'Se alinean las dos mitades de la caja, se coloca la muestra con sus placas porosas y se baja el cabezal de carga.', sec: 9 }
        ],
        props: function (root, h) {
            var mt = K.materiales(), TX = -1.7, TZ = 2.25, TT = 0.55;
            tableAt(root, TX, TZ, TT, 1.7, 1.4);
            var bal = balAt(root, -0.2, TZ, TT, 0.6);
            var blk = box(root, 1.4, 0.45, 1.4, TX, TT + 0.225, TZ, mt.soilDark);
            var ringM = M(0xc9a860, 0.8, 0.32), ring = new THREE.Group(); root.add(ring);
            [[0, 0.5, 1.0, 0.04], [0, -0.5, 1.0, 0.04]].forEach(function (a) { box(ring, 1.0, 0.38, 0.04, 0, 0, a[1], ringM); });
            box(ring, 0.04, 0.38, 1.0, 0.5, 0, 0, ringM); box(ring, 0.04, 0.38, 1.0, -0.5, 0, 0, ringM);
            var sp = box(root, 0.9, 0.32, 0.9, TX, TT + 0.2, TZ, mt.soil); sp.visible = false;
            var jaws = jawsMake(root), saw = wireSaw(root);
            var SH = 0.32;
            return {
                set: function (info, prm) {
                    var pre = info.step >= 0, q = info.q;
                    if (!pre) { h.soilLow.visible = true; h.soilUp.visible = true; ring.visible = blk.visible = sp.visible = false; jaws.hide(); saw.visible = false; return null; }
                    h.soilLow.visible = false; h.soilUp.visible = false;
                    h.upper.position.y += 1.0 * (1 - (info.step === 2 ? sm(q, 0.68, 1) : 0));
                    saw.visible = false; ring.visible = false; blk.visible = false; sp.visible = false; jaws.hide();
                    if (info.step === 0) {
                        blk.visible = true; ring.visible = q < 0.92; sp.visible = q > 0.45;
                        var dn = sm(q, 0, 0.42), up = sm(q, 0.45, 0.62);
                        var ry = lerp(TT + 1.2, TT + 0.2, dn) + up * 0.0;
                        ring.position.set(TX, ry, TZ); sp.position.set(TX, ry - 0.01, TZ);
                        blk.scale.y = 1 - 0.3 * up; blk.position.y = TT + 0.225 * blk.scale.y; if (q > 0.45) { ring.position.y = ry + 0.35 * up; sp.position.y = ry + 0.35 * up - 0.01; }
                        saw.visible = q > 0.66 && q < 0.92; saw.position.set(TX + Math.sin(q * 70) * 0.25, TT + 0.2 + 0.35 + 0.17, TZ);
                        return [{ k: 'Anillo', v: '60 × 60', u: 'mm' }, { k: 'Corte', v: q < 0.45 ? 'Presionando' : q < 0.92 ? 'Enrasando' : 'Listo', u: '' }, { k: 'Espesor', v: '≈ 20', u: 'mm' }, { k: 'Humedad', v: 'Natural', u: '' }];
                    }
                    if (info.step === 1) {
                        sp.visible = true; var toB = sm(q, 0.62, 0.82);
                        var A = [TX, TT + 0.2, TZ], B = [bal.x, bal.pan + SH / 2, bal.z];
                        sp.position.set(lerp(A[0], B[0], toB), lerp(A[1], B[1], toB) + Math.sin(Math.PI * toB) * 0.4, lerp(A[2], B[2], toB));
                        if (q < 0.3) jaws.diam(sp.position.x, sp.position.y, sp.position.z, 0.45, sm(q, 0, 0.18));
                        else if (q < 0.6) jaws.alt(sp.position.x, sp.position.y, sp.position.z, SH / 2, sm(q, 0.3, 0.46));
                        var mass = 1.85 * 6 * 6 * 2.0 * sm(q, 0.84, 0.98); bal.scr.lcd(fmt(mass, 1) + ' g', 'MUESTRA');
                        return [{ k: 'Lado', v: q > 0.12 ? '60.0' : '—', u: q > 0.12 ? 'mm' : '' }, { k: 'Espesor', v: q > 0.45 ? '20.0' : '—', u: q > 0.45 ? 'mm' : '' }, { k: 'Masa', v: q > 0.84 ? fmt(mass, 1) : '—', u: q > 0.84 ? 'g' : '' }, { k: 'γ', v: q > 0.95 ? '18.1' : '—', u: q > 0.95 ? 'kN/m³' : '' }];
                    }
                    /* paso 2: la muestra se lleva a la caja */
                    sp.visible = q < 0.66;
                    var pts = [[bal.x, bal.pan + SH / 2, bal.z], [-0.5, 1.05, bal.z], [-0.5, 1.05, 0], [0, 1.05, 0], [0, 0.61, 0]];
                    var pp = path(pts, tw(q, 0, 0.64)); sp.position.set(pp[0], pp[1], pp[2]);
                    h.soilLow.visible = q >= 0.66; h.soilUp.visible = q > 0.93;
                    bal.scr.lcd(q < 0.15 ? '266.4 g' : '0.00 g', 'MUESTRA');
                    return [{ k: 'Caja', v: q < 0.66 ? 'Abierta' : 'Alineada', u: '' }, { k: 'Placas', v: 'Porosas', u: '' }, { k: 'Pasadores', v: q > 0.9 ? 'Retirados' : 'Puestos', u: '' }, { k: 'Cabezal', v: q > 0.93 ? 'Colocado' : '—', u: '' }];
                }
            };
        }
    };

    /* ======================= COMPRESIÓN INCONFINADA ======================= */
    CFG.inconfinada = {
        drop: 3,
        steps: [
            { t: 'Extraer y tallar la probeta del tubo', d: 'La muestra se saca del tubo Shelby con el extractor y se enrasan los extremos con el alambre de corte.', sec: 7 },
            { t: 'Medir diámetro y altura, y pesar', d: 'Con el calibre se mide el diámetro y la altura inicial L₀; luego se pesa para obtener la densidad.', sec: 6 },
            { t: 'Centrar la probeta entre los platos de la prensa', d: 'La probeta se lleva a la prensa, se centra sobre el plato inferior y se sube el plato hasta tocar el cabezal (σ₃ = 0).', sec: 8 }
        ],
        props: function (root, h) {
            var mt = Lb().mats(), TX = -3.3, TZ = 1.75, TT = 0.55;
            tableAt(root, TX, TZ, TT, 1.2, 1.1);
            var bal = balAt(root, -2.1, 2.0, TT, 0.5);
            var tube = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.47, 1.35, 32, 1, true), Lb().glassM(0.3)); root.add(tube);
            cyl(root, 0.5, 0.5, 0.05, TX, TT + 0.025, TZ, mt.steelM, 28);
            var jaws = jawsMake(root), saw = wireSaw(root);
            return {
                set: function (info, prm) {
                    var pre = info.step >= 0, q = info.q, sH = clamp(prm.L0 / 76, 0.85, 1.1), sR = clamp(prm.dmm / 38, 0.8, 1.25);
                    var Hs = h.HS * sH, Rs = 0.4 * sR, R = 0.2;
                    if (!pre) { h.spec.position.x = 0; h.spec.position.z = 0; tube.visible = false; saw.visible = false; jaws.hide(); return null; }
                    saw.visible = false; jaws.hide(); tube.visible = false;
                    h.lower.position.y -= R * (1 - (info.step === 2 ? sm(q, 0.84, 1) : 0));
                    var sp = h.spec; sp.scale.set(sR, sH, sR);
                    var D = prm.dmm, L = prm.L0, mass = 1.9 * Math.PI * Math.pow(D / 20, 2) * (L / 10);
                    if (info.step === 0) {
                        tube.visible = q < 0.7; tube.position.set(TX, TT + 0.05 + 0.675, TZ);
                        var ex = sm(q, 0.1, 0.62);
                        sp.position.set(TX, TT + 0.05 + Hs / 2 + ex * 0.9, TZ);
                        saw.visible = q > 0.62 && q < 0.82; saw.position.set(TX + Math.sin(q * 70) * 0.3, TT + 0.05 + Hs + 0.9, TZ);
                        if (q >= 0.7) sp.position.y = TT + 0.05 + Hs / 2 + 0.9 * (1 - sm(q, 0.82, 1));
                        return [{ k: 'Tubo', v: 'Shelby', u: '' }, { k: 'Extracción', v: fmt(ex * 100, 0), u: '%' }, { k: 'Extremos', v: q > 0.82 ? 'Enrasados' : 'Sin enrasar', u: '' }, { k: 'σ₃', v: '0', u: 'kPa' }];
                    }
                    if (info.step === 1) {
                        var toB = sm(q, 0.64, 0.84), A = [TX, TT + 0.05 + Hs / 2, TZ], B = [bal.x, bal.pan + Hs / 2, bal.z];
                        sp.position.set(lerp(A[0], B[0], toB), lerp(A[1], B[1], toB) + Math.sin(Math.PI * toB) * 0.4, lerp(A[2], B[2], toB));
                        if (q < 0.3) jaws.diam(sp.position.x, sp.position.y, sp.position.z, Rs, sm(q, 0, 0.18));
                        else if (q < 0.6) jaws.alt(sp.position.x, sp.position.y, sp.position.z, Hs / 2, sm(q, 0.3, 0.46));
                        var ms = mass * sm(q, 0.86, 0.98); bal.scr.lcd(fmt(ms, 1) + ' g', 'PROBETA');
                        return [{ k: 'Diámetro', v: q > 0.12 ? fmt(D, 1) : '—', u: q > 0.12 ? 'mm' : '' }, { k: 'Altura L₀', v: q > 0.45 ? fmt(L, 1) : '—', u: q > 0.45 ? 'mm' : '' }, { k: 'Masa', v: q > 0.86 ? fmt(mass, 1) : '—', u: q > 0.86 ? 'g' : '' }, { k: 'L₀/D', v: q > 0.5 ? fmt(L / D, 2) : '—', u: '' }];
                    }
                    var yS = h.topY - R - Hs / 2, yF = h.topY - Hs / 2;
                    var pts = [[bal.x, bal.pan + Hs / 2, bal.z], [bal.x, yS + 0.15, bal.z], [0, yS + 0.15, bal.z - 0.1], [0, yS + 0.15, 0], [0, yS, 0]];
                    var pp = path(pts, tw(q, 0, 0.8)); var fin = sm(q, 0.84, 1);
                    sp.position.set(pp[0], lerp(pp[1], yF, fin), pp[2]);
                    bal.scr.lcd(q < 0.1 ? fmt(mass, 1) + ' g' : '0.00 g', 'PROBETA');
                    return [{ k: 'Centrado', v: q > 0.8 ? 'Sí' : 'Moviendo…', u: '' }, { k: 'Plato', v: q > 0.84 ? 'Subiendo' : 'Abajo', u: '' }, { k: 'Contacto', v: q > 0.98 ? 'Hecho' : '—', u: '' }, { k: 'σ₃', v: '0', u: 'kPa' }];
                }
            };
        }
    };

    /* ======================= CONSOLIDACIÓN (EDÓMETRO) ======================= */
    CFG.consolidacion = {
        drop: 2,
        steps: [
            { t: 'Tallar la muestra con el anillo de consolidación', d: 'El anillo de bordes cortantes se presiona sobre el suelo inalterado y se enrasa con el alambre a ras del anillo.', sec: 7 },
            { t: 'Medir la altura inicial H₀ y pesar', d: 'Se mide la altura del anillo, se pesa anillo + suelo y, al final del ensayo, se secará para hallar la humedad.', sec: 5 },
            { t: 'Montar el edómetro', d: 'Sobre la piedra porosa inferior se coloca el anillo con el suelo; arriba va la otra piedra y el cabezal. Se llena de agua y se pone a cero el deformímetro.', sec: 11 }
        ],
        props: function (root, h) {
            var mt = Lb().mats(), OFF = h.OFF, TX = OFF - 0.9, TZ = 2.1, TT = 0.55;
            tableAt(root, TX, TZ, TT, 1.5, 1.3);
            var bal = balAt(root, OFF + 1.3, 2.15, TT, 0.5);
            var blk = box(root, 1.2, 0.5, 1.2, TX, TT + 0.25, TZ, mt.soilDark);
            var ringG = new THREE.Group(); root.add(ringG);
            var rwall = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.28, 36, 1, true), new THREE.MeshStandardMaterial({ color: 0xc9a860, metalness: 0.8, roughness: 0.32, side: THREE.DoubleSide })); ringG.add(rwall);
            var rrim = cyl(ringG, 0.44, 0.44, 0.03, 0, 0.125, 0, mt.brass, 36);
            var rsoil = cyl(ringG, 0.38, 0.38, 0.28, 0, 0, 0, mt.soil, 36);
            var saw = wireSaw(root), jaws = jawsMake(root);
            var scr = bal.scr;
            return {
                set: function (info, prm) {
                    var pre = info.step >= 0, q = info.q, H0 = prm.H0 || 20;
                    if (!pre) { h.soil.visible = h.ringWall.visible = h.rim.visible = true; ringG.visible = blk.visible = false; saw.visible = false; jaws.hide(); return null; }
                    saw.visible = false; jaws.hide(); h.soil.visible = h.ringWall.visible = h.rim.visible = false;
                    h.ram.position.y += 1.3 * (1 - (info.step === 2 ? sm(q, 0.62, 0.95) : 0));
                    var mass = 55 + 1.9 * Math.PI * 3.175 * 3.175 * (H0 / 10);
                    if (info.step === 0) {
                        blk.visible = true; ringG.visible = true;
                        var dn = sm(q, 0, 0.45), up = sm(q, 0.5, 0.7);
                        ringG.position.set(TX, lerp(TT + 1.1, TT + 0.5 - 0.1, dn) + up * 0.4, TZ);
                        saw.visible = q > 0.7 && q < 0.95; saw.position.set(TX + Math.sin(q * 70) * 0.3, ringG.position.y + 0.15, TZ);
                        return [{ k: 'Anillo', v: 'Ø 63.5', u: 'mm' }, { k: 'Corte', v: q < 0.5 ? 'Presionando' : q < 0.95 ? 'Enrasando' : 'Listo', u: '' }, { k: 'Muestra', v: 'Inalterada', u: '' }, { k: 'H₀', v: '—', u: '' }];
                    }
                    ringG.visible = true; blk.visible = false;
                    if (info.step === 1) {
                        var toB = sm(q, 0.55, 0.78), A = [TX, TT + 0.5 + 0.3, TZ], B = [bal.x, bal.pan + 0.15, bal.z];
                        ringG.position.set(lerp(A[0], B[0], toB), lerp(A[1], B[1], toB) + Math.sin(Math.PI * toB) * 0.4, lerp(A[2], B[2], toB));
                        if (q < 0.5) jaws.alt(ringG.position.x, ringG.position.y, ringG.position.z, 0.14, sm(q, 0, 0.2));
                        var ms = mass * sm(q, 0.82, 0.98); scr.lcd(fmt(ms, 1) + ' g', 'ANILLO + SUELO');
                        return [{ k: 'H₀', v: q > 0.2 ? fmt(H0, 1) : '—', u: q > 0.2 ? 'mm' : '' }, { k: 'Diámetro', v: '63.5', u: 'mm' }, { k: 'Masa', v: q > 0.82 ? fmt(mass, 1) : '—', u: q > 0.82 ? 'g' : '' }, { k: 'e₀', v: q > 0.95 ? fmt(prm.e0, 3) : '—', u: '' }];
                    }
                    var pts = [[bal.x, bal.pan + 0.15, bal.z], [OFF, 1.3, 2.0], [OFF, 1.3, 0], [OFF, 0.58, 0]];
                    var pp = path(pts, tw(q, 0, 0.55)); ringG.position.set(pp[0], pp[1], pp[2]);
                    var inCell = q >= 0.56;
                    ringG.visible = !inCell; h.soil.visible = h.ringWall.visible = h.rim.visible = inCell;
                    scr.lcd(q < 0.08 ? fmt(mass, 1) + ' g' : '0.00 g', 'ANILLO + SUELO');
                    return [{ k: 'Piedra inferior', v: 'Colocada', u: '' }, { k: 'Anillo', v: inCell ? 'En la celda' : 'Llevando…', u: '' }, { k: 'Cabezal', v: q > 0.94 ? 'Colocado' : '—', u: '' }, { k: 'Deformímetro', v: q > 0.97 ? 'En cero' : '—', u: '' }];
                }
            };
        }
    };

    /* ======================= TRIAXIAL ======================= */
    CFG.triaxial = {
        drop: 3,
        steps: [
            { t: 'Tallar y medir la probeta', d: 'La probeta cilíndrica se recorta, se miden su diámetro y su altura con el calibre y se pesa.', sec: 7 },
            { t: 'Colocar membrana, piedras porosas y cabezal', d: 'La probeta se centra en el pedestal, se cubre con la membrana de látex (tensor de membrana), se sellan los anillos O y se coloca el cabezal.', sec: 9 },
            { t: 'Armar y cerrar la cámara', d: 'Se baja el cilindro acrílico, se pone la tapa superior, se aprietan los tensores y se comprueba la estanqueidad antes de llenar con agua.', sec: 8 }
        ],
        props: function (root, h) {
            var mt = Lb().mats(), TX = -2.9, TZ = 1.8, TT = 0.55;
            tableAt(root, TX, TZ, TT, 1.0, 1.0);
            var bal = balAt(root, -2.9, 0.3, TT, 0.45);
            var jaws = jawsMake(root), saw = wireSaw(root);
            var stretcher = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.45, 28, 1, true), Lb().glassM(0.3)); stretcher.visible = false; root.add(stretcher);
            var HS2 = 1.2;
            return {
                set: function (info, prm) {
                    var pre = info.step >= 0, q = info.q, sp = h.spec, c = h.cellG;
                    function showCham(a, b, c2, d) { h.tubeC.visible = a; h.topPlate.visible = b; h.topStem.visible = b; h.rods.forEach(function (r) { r.visible = c2; }); h.cap.visible = d; }
                    if (!pre) { sp.position.x = 0; sp.position.z = 0; showCham(true, true, true, true); h.memb.visible = true; h.orings.forEach(function (o) { o.visible = true; }); h.tubeC.position.y = 1.66; h.topPlate.position.y = 2.63; h.topStem.position.y = 2.81; stretcher.visible = false; saw.visible = false; jaws.hide(); return null; }
                    saw.visible = false; jaws.hide(); stretcher.visible = false;
                    var mass = 1.9 * Math.PI * 1.9 * 1.9 * 7.6;
                    h.waterM.scale.y = 0.001;
                    if (info.step === 0) {
                        showCham(false, false, false, false); h.memb.visible = false; h.orings.forEach(function (o) { o.visible = false; });
                        var gy = TT + HS2 / 2; sp.position.set(TX, gy, TZ);
                        var mv = sm(q, 0.7, 0.88); sp.position.set(lerp(TX, bal.x, mv), lerp(gy, bal.pan + HS2 / 2, mv) + Math.sin(Math.PI * mv) * 0.4, lerp(TZ, bal.z, mv));
                        saw.visible = q < 0.3; saw.position.set(TX + Math.sin(q * 80) * 0.25, gy + HS2 / 2 + 0.01, TZ);
                        if (q >= 0.3 && q < 0.5) jaws.diam(sp.position.x, sp.position.y, sp.position.z, 0.3, sm(q, 0.3, 0.38));
                        else if (q >= 0.5 && q < 0.7) jaws.alt(sp.position.x, sp.position.y, sp.position.z, HS2 / 2, sm(q, 0.5, 0.58));
                        bal.scr.lcd(fmt(mass * sm(q, 0.9, 1), 1) + ' g', 'PROBETA');
                        return [{ k: 'Diámetro', v: q > 0.35 ? '38.0' : '—', u: q > 0.35 ? 'mm' : '' }, { k: 'Altura', v: q > 0.55 ? '76.0' : '—', u: q > 0.55 ? 'mm' : '' }, { k: 'Masa', v: q > 0.9 ? fmt(mass, 1) : '—', u: q > 0.9 ? 'g' : '' }, { k: 'Estado', v: q < 0.3 ? 'Tallando' : 'Midiendo', u: '' }];
                    }
                    if (info.step === 1) {
                        showCham(false, false, false, false); h.cap.visible = q > 0.78;
                        var pts = [[bal.x, bal.pan + HS2 / 2, bal.z], [bal.x, 1.5, 1.7], [0, 1.5, 1.7], [0, 1.5, 0], [0, 1.46, 0]];
                        var pp = path(pts, tw(q, 0, 0.45)); sp.position.set(pp[0], pp[1], pp[2]);
                        var mq = tw(q, 0.5, 0.7);
                        stretcher.visible = q >= 0.5 && q < 0.72; stretcher.position.set(0, lerp(3.4, 1.46, ease(Math.min(1, mq * 2))) + (mq > 0.5 ? ease((mq - 0.5) * 2) * 1.8 : 0), 0);
                        h.memb.visible = q > 0.58; h.orings.forEach(function (o, i) { o.visible = q > 0.72 + i * 0.03; });
                        h.cap.position.y = lerp(3.0, 2.11, sm(q, 0.78, 1));
                        return [{ k: 'Pedestal', v: q > 0.45 ? 'Centrada' : 'Moviendo…', u: '' }, { k: 'Membrana', v: q > 0.72 ? 'Colocada' : q > 0.5 ? 'Estirando…' : '—', u: '' }, { k: 'Anillos O', v: q > 0.78 ? '2 / 2' : q > 0.72 ? '1 / 2' : '—', u: '' }, { k: 'Cabezal', v: q > 0.98 ? 'Colocado' : '—', u: '' }];
                    }
                    sp.position.set(0, 0.86 + 0.6, 0);
                    h.cap.visible = true; h.memb.visible = true; h.orings.forEach(function (o) { o.visible = true; });
                    var f1 = sm(q, 0, 0.4), f2 = sm(q, 0.38, 0.7), f3 = sm(q, 0.7, 0.9);
                    h.tubeC.visible = q > 0.01; h.tubeC.position.y = 1.66 + 2.8 * (1 - f1);
                    h.topPlate.visible = h.topStem.visible = q > 0.36; h.topPlate.position.y = 2.63 + 2.4 * (1 - f2); h.topStem.position.y = 2.81 + 2.4 * (1 - f2);
                    h.rods.forEach(function (r, i) { r.visible = q > 0.66; r.position.y += 0; });
                    var nut = q > 0.9 ? 'Apretados' : q > 0.7 ? 'Poniendo…' : '—';
                    return [{ k: 'Cilindro', v: f1 > 0.99 ? 'Bajado' : 'Bajando…', u: '' }, { k: 'Tapa', v: f2 > 0.99 ? 'Colocada' : q > 0.36 ? 'Bajando…' : '—', u: '' }, { k: 'Tensores', v: nut, u: '' }, { k: 'Estanqueidad', v: f3 > 0.95 ? 'OK' : '—', u: '' }];
                }
            };
        }
    };

    ['corte', 'inconfinada', 'consolidacion', 'triaxial'].forEach(function (t) {
        var def = L3.get(t);
        if (!def || !def.meta || !CFG[t]) return;
        L3.register(t, L3.__pasosWrap(t, def, CFG[t]));
    });
})(window);
