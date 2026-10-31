/**
 * GeoMetrics — Diseño de Mezclas · definición PRO de los 8 simuladores 3D
 * Parámetros editables, resultados, gráficas, validaciones, interpretación y guía ampliada de cada etapa.
 * Requiere lab3d-dm.js, lab3d-dm2.js y lab3d-pro.js. Las ecuaciones provienen de Mezclas.C (mezclas-calc.js,
 * ACI 211.1, ACI 209R, ASTM C138 / C29 / C566 / C136 / C39) — no hay valores aleatorios.
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D;
    if (!L3 || !L3.pro || !L3.dm || L3.__dmpro) return;
    L3.__dmpro = true;
    var pro = L3.pro, D = L3.dm, K = L3.kit, clamp = K.clamp, ease = K.ease, fmt = K.fmt;
    function CC() { return D.CC(); }
    function MZ() { return D.MZ(); }
    function HH() { return global.GeoSim2D && global.GeoSim2D.H; }
    function tw(p, a, b) { return clamp((p - a) / (b - a), 0, 1); }
    function sm(p, a, b) { return ease(tw(p, a, b)); }
    function f1(v, d) { return typeof v === 'number' && isFinite(v) ? v.toFixed(d) : '—'; }
    function R(l, u, now, fin, kind) { return { l: l, u: u, now: now, fin: fin, kind: kind }; }
    var SEL_TMN = [[9.5, '9.5 mm (⅜″)'], [12.5, '12.5 mm (½″)'], [19, '19 mm (¾″)'], [25, '25 mm (1″)'], [37.5, '37.5 mm (1½″)'], [50, '50 mm (2″)'], [75, '75 mm (3″)']];

    /* ---------- utilidades de gráfica ---------- */
    function solid(c, X, Y, pts, color, w, dash) {
        c.save(); c.strokeStyle = color; c.lineWidth = w || 3; c.lineJoin = 'round'; c.setLineDash(dash || []); c.beginPath();
        pts.forEach(function (p, i) { if (i) c.lineTo(X(p.x), Y(p.y)); else c.moveTo(X(p.x), Y(p.y)); }); c.stroke(); c.restore();
    }
    function mark(c, X, Y, x, y, color, txt) {
        c.save(); c.beginPath(); c.arc(X(x), Y(y), 9, 0, 6.2832); c.fillStyle = color + '44'; c.fill();
        c.beginPath(); c.arc(X(x), Y(y), 4.8, 0, 6.2832); c.fillStyle = '#fff'; c.fill(); c.lineWidth = 2; c.strokeStyle = color; c.stroke();
        if (txt) { c.font = '700 11px Inter, system-ui, sans-serif'; c.fillStyle = '#F1F5F9'; c.textAlign = 'left'; c.textBaseline = 'bottom'; c.fillText(txt, X(x) + 11, Y(y) - 8); }
        c.restore();
    }
    function plot(ctx, W, Ht, o) { HH().plot(ctx, W, Ht, o); }
    function lbl(ctx, t, x, y, o) { HH().label(ctx, t, x, y, o || {}); }
    function panel(ctx, W, Ht, title) { ctx.save(); HH().rrect(ctx, 0, 0, W, Ht, 14); ctx.fillStyle = '#151F32'; ctx.fill(); ctx.restore(); lbl(ctx, title, 16, 16, { color: '#F1F5F9', size: 14.5, weight: '700' }); }

    function defOf(tipo, d) { pro.defs[tipo] = d; }

    /* ===================================================================== */
    /* 1 · REVENIMIENTO                                                       */
    /* ===================================================================== */
    function revQ(p) { return sm(p, 0.5, 0.92); }
    defOf('dm_rev', {
        fields: [
            { id: 'agua', label: 'Agua de mezclado (a)', unit: 'kg/m³', min: 140, max: 280, step: 1, dec: 0, value: 205, desc: 'Cantidad de agua por m³ de concreto; cada +5 kg/m³ sube el asentamiento ≈ 25 mm (tabla 6.3.3 ACI 211.1).' },
            { id: 'cem', label: 'Contenido de cemento (c)', unit: 'kg/m³', min: 250, max: 550, step: 5, dec: 0, value: 430, desc: 'Define a/c = a/c; con poco cemento la mezcla pierde cohesión.' },
            { id: 'tmn', label: 'Tamaño máximo nominal (TMN)', type: 'select', options: SEL_TMN, value: 19, desc: 'Un TMN mayor necesita menos agua para el mismo asentamiento.' }
        ],
        defaults: { agua: 205, cem: 430, tmn: 19 },
        validate: function (prm) {
            var P = prm.P, o = [];
            if (P.ac > 0.75) o.push({ lvl: 'warn', msg: 'a/c = ' + f1(P.ac, 2) + ' > 0.75: la mezcla queda con poca pasta y puede fallar por cortante (ensayo no válido).' });
            if (P.ac < 0.35) o.push({ lvl: 'warn', msg: 'a/c = ' + f1(P.ac, 2) + ' < 0.35: no es trabajable sin aditivo reductor de agua.' });
            if (P.slump >= 200) o.push({ lvl: 'bad', msg: 'Revenimiento ≥ 200 mm: el concreto colapsa y el ensayo ya no es representativo.' });
            return o;
        },
        results: function (prm, p) {
            var P = prm.P, q = p < 0.5 ? 0 : revQ(p), C = CC(), done = p >= 0.92;
            return [R('Asentamiento', 'mm', f1(P.slump * q, 0), f1(P.slump, 0), 'Medido'), R('Consistencia', '', done ? (C ? C.claseAsentamiento(P.slump).split(' (')[0] : '—') : '—', C ? C.claseAsentamiento(P.slump).split(' (')[0] : '—', 'Calculado'),
                R('Forma de falla', '', done ? P.falla : '—', P.falla, 'Medido'), R('a/c', '', f1(P.ac, 3), f1(P.ac, 3), 'Calculado'), R("f′c estimada 28 d", 'MPa', '—', f1(P.fc, 1), 'Calculado')];
        },
        charts: [
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) {
                var P = prm.P, C = CC(), pts = []; if (!C) return;
                for (var a = 140; a <= 280; a += 3) pts.push({ x: a, y: C.slumpDesdeAgua(a, P.tmn, false) });
                var q = p < 0.5 ? 0 : revQ(p);
                plot(ctx, W, Ht, { title: 'Asentamiento vs. agua de mezclado', xlabel: 'Agua (kg/m³)', ylabel: 'Asentamiento (mm)', xmin: 140, xmax: 280, ymin: 0, ymax: 260, pts: pts, nolive: true, color: '#38BDF8',
                    over: function (c, X, Y) { solid(c, X, Y, pts, '#38BDF8', 3); c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.moveTo(X(P.agua), Y(0)); c.lineTo(X(P.agua), Y(P.slump)); c.stroke(); c.restore(); mark(c, X, Y, P.agua, P.slump, '#EF4444', 'a=' + f1(P.agua, 0) + ' → ' + f1(P.slump, 0) + ' mm'); mark(c, X, Y, P.agua, P.slump * q, '#38BDF8'); } });
            } },
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) {
                var P = prm.P, C = CC(), pts = []; if (!C) return;
                for (var a = 0.3; a <= 0.801; a += 0.01) pts.push({ x: a, y: C.resistenciaPorAC(a) });
                plot(ctx, W, Ht, { title: "f′c (28 d) vs. relación a/c", xlabel: 'a/c', ylabel: "f′c (MPa)", xmin: 0.3, xmax: 0.8, ymin: 10, ymax: 60, pts: pts, nolive: true, color: '#34D399', xfmt: function (v) { return v.toFixed(2); },
                    over: function (c, X, Y) { solid(c, X, Y, pts, '#34D399', 3); mark(c, X, Y, clamp(P.ac, 0.3, 0.8), clamp(P.fc, 10, 60), '#EF4444', 'a/c=' + f1(P.ac, 2) + ' → ' + f1(P.fc, 0) + ' MPa'); } });
            } }
        ],
        interp: function (prm) {
            var P = prm.P, C = CC(), cls = C ? C.claseAsentamiento(P.slump) : '';
            return '<p>Con <b>' + f1(P.agua, 0) + ' kg/m³</b> de agua y TMN ' + P.tmn + ' mm el modelo da un asentamiento de <b>' + f1(P.slump, 0) + ' mm</b> (' + cls + '). La relación a/c = ' + f1(P.ac, 3) + ' corresponde a una resistencia estimada de ' + f1(P.fc, 1) + ' MPa a 28 d.</p>' +
                '<p>Para ganar trabajabilidad <b>sin perder resistencia</b> hay que subir el cemento junto con el agua (mantener a/c) o usar aditivo.' + (P.falla === 'verdadero' ? ' La forma de falla es de asentamiento verdadero: el ensayo es válido.' : (P.falla === 'cortante' ? ' La falla por cortante invalida el ensayo: se repite con otra porción.' : ' El colapso indica una mezcla demasiado fluida para este ensayo.')) + '</p>';
        },
        hyp: ['Asentamiento = interpolación de la tabla 6.3.3 de ACI 211.1 para el TMN (concreto sin aire incorporado), no una medición experimental.', 'La forma del concreto asentado es una representación geométrica con conservación de volumen; no es un cálculo reológico.', 'La resistencia f′c sale de la curva a/c → f′cr de ACI 211.1 (tabla 6.3.4).']
    });

    /* ===================================================================== */
    /* 2 · COMPRESIÓN DE CILINDROS                                            */
    /* ===================================================================== */
    function cs(p, P) { var m = MZ(); return m && m._m && m._m.compState ? m._m.compState(p, P) : { s: 0, e: 0, q: 0 }; }
    defOf('dm_comp', {
        fields: [
            { id: 'ac', label: 'Relación agua/cemento (a/c)', unit: '', min: 0.3, max: 0.8, step: 0.01, dec: 2, value: 0.5, desc: 'A mayor a/c, menor resistencia (curva de ACI 211.1).' },
            { id: 'edad', label: 'Edad de ensayo (t)', unit: 'd', min: 1, max: 90, step: 1, dec: 0, value: 28, desc: 'Edad del cilindro; la resistencia crece con el tiempo (ACI 209R).' },
            { id: 'd', label: 'Diámetro del cilindro (D)', type: 'select', options: [[100, 'Ø 100 × 200 mm'], [150, 'Ø 150 × 300 mm']], value: 150, desc: 'Define el área cargada A = πD²/4 y la carga máxima.' },
            { id: 'rate', label: 'Velocidad de carga (r)', type: 'select', options: [[0.15, '0.15 MPa/s (lenta)'], [0.25, '0.25 MPa/s (norma)'], [0.5, '0.50 MPa/s'], [1, '1.0 MPa/s (rápida)']], value: 0.25, desc: 'La norma pide 0.25 ± 0.05 MPa/s; cargar más rápido aumenta la resistencia aparente.' }
        ],
        defaults: { ac: 0.5, edad: 28, d: 150, rate: 0.25 },
        validate: function (prm) {
            var P = prm.P, o = [];
            if (!P.rateOk) o.push({ lvl: 'warn', msg: 'Velocidad de carga fuera de la norma (0.25 ± 0.05 MPa/s): la resistencia aparente se altera (≈ +6 % por década de velocidad).' });
            if (P.ac > 0.7) o.push({ lvl: 'warn', msg: 'a/c > 0.70: concreto de baja resistencia y alta porosidad.' });
            if (P.edad < 3) o.push({ lvl: 'warn', msg: 'A edades < 3 d la resistencia aún es muy baja y variable.' });
            return o;
        },
        results: function (prm, p) {
            var P = prm.P, st = cs(p, P), A = P.A || Math.PI * P.d * P.d / 4, Pk = st.s * A / 1000, mx = P.fc * A / 1000;
            return [R('Esfuerzo σ = P/A', 'MPa', f1(st.s, 1), f1(P.fc, 1), 'Calculado'), R('Carga P', 'kN', f1(Pk, 0), f1(mx, 0), 'Medido'), R('Deformación ε', '‰', f1(st.e * 1000, 2), f1((P.e0 + 0.0016 * 1) * 1000, 2), 'Medido'),
                R("Resistencia f′c", 'MPa', p >= 0.8 ? f1(P.fc, 1) : '—', f1(P.fc, 1), 'Calculado'), R('Tipo de falla', '', p >= 0.8 ? P.tipo : '—', P.tipo, 'Medido'), R('Módulo Ec = 4700√f′c', 'MPa', '—', f1(4700 * Math.sqrt(P.fc), 0), 'Calculado')];
        },
        charts: [
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) {
                var P = prm.P, pts = [], i; for (i = 0; i <= 100; i++) { var st = cs(i / 100, P); pts.push({ x: st.e * 1000, y: st.s }); }
                var xm = Math.max.apply(null, pts.map(function (q) { return q.x; })) * 1.05, ym = Math.ceil(P.fc * 1.1 / 5) * 5;
                plot(ctx, W, Ht, { title: 'Esfuerzo – deformación (σ–ε)', xlabel: 'Deformación ε (‰)', ylabel: 'σ (MPa)', xmin: 0, xmax: xm, ymin: 0, ymax: ym, pts: pts, progress: Math.max(0.001, p), color: '#A78BFA',
                    under: function (c, X, Y) { c.save(); c.setLineDash([4, 4]); c.strokeStyle = 'rgba(167,139,250,.5)'; c.beginPath(); c.moveTo(X(0), Y(P.fc)); c.lineTo(X(xm), Y(P.fc)); c.stroke(); c.restore(); lbl(c, "f′c = " + f1(P.fc, 1) + ' MPa', X(0) + 8, Y(P.fc) - 10, { size: 10.5, color: '#C4B5FD', weight: '800' }); } });
            } },
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) {
                var P = prm.P, A = P.A || Math.PI * P.d * P.d / 4, tp = P.fc / P.rate, pts = [], i;
                for (i = 0; i <= 100; i++) { var st = cs(i / 100, P); pts.push({ x: tp * (i / 100) / 0.8, y: st.s * A / 1000 }); }
                plot(ctx, W, Ht, { title: 'Carga – tiempo (control por velocidad)', xlabel: 'Tiempo (s)', ylabel: 'Carga P (kN)', xmin: 0, xmax: tp / 0.8 * 1.02, ymin: 0, ymax: Math.ceil(P.fc * A / 1000 * 1.1 / 50) * 50, pts: pts, progress: Math.max(0.001, p), color: '#38BDF8' });
            } }
        ],
        interp: function (prm) {
            var P = prm.P, A = P.A, mx = P.fc * A / 1000, tp = P.fc / P.rate;
            return '<p>El cilindro de Ø ' + P.d + ' mm (A = ' + f1(A, 0) + ' mm²) alcanza <b>f′c = ' + f1(P.fc, 1) + ' MPa</b> a ' + f1(P.edad, 0) + ' d, es decir una carga máxima de <b>' + f1(mx, 0) + ' kN</b>. A ' + f1(P.rate, 2) + ' MPa/s el pico se alcanza a los ' + f1(tp, 0) + ' s.</p>' +
                '<p>' + (P.fc < 40 ? 'Falla tipo 1: conos bien formados, típica de concretos normales.' : 'Falla tipo 4 (diagonal): propia de concretos de alta resistencia, más frágiles.') + ' El rango del manómetro seleccionado es de ' + P.dial + ' kN.</p>';
        },
        hyp: ['f′c a 28 d: curva a/c → f′cr (ACI 211.1); edad: relación hiperbólica de ACI 209R; efecto de la velocidad: ≈ +6 % por década (aproximación del simulador).', 'Curva σ–ε: rama ascendente parabólica con Ec = 4700√f′c y rama descendente simplificada.', 'Las grietas y los fragmentos son una representación visual del modo de falla, no una simulación de fractura.']
    });

    /* ===================================================================== */
    /* 3 · DISEÑO ACI 211.1                                                   */
    /* ===================================================================== */
    function aciStep(p) { return p >= 1 ? 6 : Math.floor(p * 7); }
    defOf('dm_aci', {
        fields: [
            { id: 'fc', label: "Resistencia especificada (f′c)", unit: 'MPa', min: 10, max: 60, step: 1, dec: 0, value: 28, desc: 'Resistencia a compresión a 28 d que exige el proyecto.' },
            { id: 'slump', label: 'Asentamiento requerido (s)', unit: 'mm', min: 25, max: 175, step: 5, dec: 0, value: 100, desc: 'Consistencia necesaria para colocar y compactar el concreto.' },
            { id: 'tmn', label: 'TMN del agregado grueso', type: 'select', options: SEL_TMN.slice(0, 7), value: 19, desc: 'Tamaño máximo nominal: define agua, aire y volumen de grava.' },
            { id: 'mf', label: 'Módulo de finura de la arena (MF)', unit: '', min: 2.4, max: 3.2, step: 0.05, dec: 2, value: 2.7, desc: 'Σ % retenido acumulado / 100; define el volumen de grava (tabla 6.3.6).' },
            { id: 'aire', label: 'Aire', type: 'select', options: [['atrapado', 'Atrapado (sin incorporado)'], ['leve', 'Incorporado — leve'], ['moderada', 'Incorporado — moderada'], ['severa', 'Incorporado — severa']], value: 'atrapado', desc: 'Exposición: el aire incorporado mejora la durabilidad ante hielo-deshielo.' },
            { id: 'puc', label: 'Peso unitario compactado de la grava (PUC)', unit: 'kg/m³', min: 1000, max: 2200, step: 10, dec: 0, value: 1600, desc: 'Se mide con el ensayo de peso unitario (ASTM C29).' }
        ],
        defaults: { fc: 28, slump: 100, tmn: 19, mf: 2.7, aire: 'atrapado', puc: 1600, gsC: 3.15, gsG: 2.7, gsF: 2.65 },
        validate: function (prm) {
            var r = prm.P.r, o = [];
            if (!r) return o;
            if (!r.ok) { o.push({ lvl: 'bad', msg: r.error }); return o; }
            (r.avisos || []).forEach(function (a) { o.push({ lvl: 'warn', msg: a }); });
            return o;
        },
        results: function (prm, p) {
            var r = prm.P.r; if (!r || !r.ok) return [R('Diseño', '', '—', (r && r.error) || '—', 'Calculado')];
            var st = aciStep(p), s = function (k, v, d) { return st >= k ? f1(v, d) : '—'; };
            return [R("f′cr requerida", 'MPa', s(0, r.fcr, 1), f1(r.fcr, 1), 'Calculado'), R('Agua', 'kg/m³', s(1, r.agua, 0), f1(r.agua, 0), 'Calculado'), R('Aire', '%', s(1, r.aire, 1), f1(r.aire, 1), 'Calculado'),
                R('a/c', '', s(2, r.ac, 3), f1(r.ac, 3), 'Calculado'), R('Cemento', 'kg/m³', s(3, r.cemento, 0), f1(r.cemento, 0), 'Calculado'), R('Grava', 'kg/m³', s(4, r.grueso, 0), f1(r.grueso, 0), 'Calculado'), R('Arena', 'kg/m³', s(5, r.fino, 0), f1(r.fino, 0), 'Calculado')];
        },
        charts: [
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) {
                var r = prm.P.r, C = CC(), sin = [], con = [], f; if (!C) return;
                for (f = 10; f <= 55; f += 1) { sin.push({ x: f, y: C.acPorResistencia(f, false).ac }); if (f <= 45) con.push({ x: f, y: C.acPorResistencia(f, true).ac }); }
                plot(ctx, W, Ht, { title: 'Relación a/c vs. resistencia requerida', xlabel: "f′cr (MPa)", ylabel: 'a/c', xmin: 10, xmax: 55, ymin: 0.25, ymax: 0.85, pts: sin, nolive: true, color: '#34D399', yfmt: function (v) { return v.toFixed(2); },
                    over: function (c, X, Y) { solid(c, X, Y, sin, '#34D399', 3); solid(c, X, Y, con, '#FBBF24', 2, [5, 4]); lbl(c, '— sin aire incorporado', X(11), Y(0.8), { size: 10, color: '#6EE7B7' }); lbl(c, '- - con aire incorporado', X(11), Y(0.76), { size: 10, color: '#FCD34D' }); if (r && r.ok && aciStep(p) >= 2) mark(c, X, Y, clamp(r.fcr, 10, 55), r.ac, '#EF4444', 'a/c = ' + f1(r.ac, 3)); } });
            } },
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) {
                var r = prm.P.r; panel(ctx, W, Ht, 'Composición de 1 m³ (volumen absoluto)'); if (!r || !r.ok) return;
                var v = r.vol, items = [['Arena', v.fino, '#E3C586'], ['Grava', v.grueso, '#9AA5B1'], ['Cemento', v.cemento, '#9CA3AF'], ['Agua', v.agua, '#3B9EFF'], ['Aire', v.aire, '#E6F3FF']], tot = v.fino + v.grueso + v.cemento + v.agua + v.aire, x = 24, y0 = 80, w = W - 48, h = 54, i;
                for (i = 0; i < items.length; i++) { var ww = items[i][1] / tot * w; ctx.fillStyle = items[i][2]; ctx.fillRect(x, y0, ww, h); x += ww; }
                ctx.strokeStyle = 'rgba(255,255,255,.3)'; ctx.strokeRect(24, y0, w, h);
                items.forEach(function (it, k) { var yy = 170 + k * 24; ctx.fillStyle = it[2]; ctx.fillRect(24, yy - 8, 12, 12); lbl(ctx, it[0] + ' — ' + f1(it[1] * 1000, 0) + ' L (' + f1(it[1] / tot * 100, 1) + ' %)', 44, yy, { size: 12, color: '#E2E8F0' }); });
                lbl(ctx, 'Σ volúmenes = ' + f1(tot, 3) + ' m³', 24, 62, { size: 11, color: '#A7B4C8' });
            } }
        ],
        interp: function (prm) {
            var r = prm.P.r; if (!r || !r.ok) return '<p>' + ((r && r.error) || '') + '</p>';
            return '<p>Para <b>f′c = ' + prm.P.fc + ' MPa</b> se requiere f′cr = ' + f1(r.fcr, 1) + ' MPa. Con a/c = <b>' + f1(r.ac, 3) + '</b>' + (r.controla === 'durabilidad' ? ' (controla la durabilidad)' : '') + ', agua = ' + f1(r.agua, 0) + ' kg/m³ resulta cemento = <b>' + f1(r.cemento, 0) + ' kg/m³</b>.</p>' +
                '<p>Proporción en peso <b>1 : ' + f1(r.proporcion.fino, 2) + ' : ' + f1(r.proporcion.grueso, 2) + '</b> (cemento : arena : grava). La arena (' + f1(r.fino, 0) + ' kg/m³) completa el metro cúbico por volumen absoluto: es la incógnita del método.</p>';
        },
        hyp: ['Método de volúmenes absolutos de ACI 211.1-91; tablas de agua, aire, a/c y volumen de grava interpoladas.', 'Agregados supuestos saturados y superficialmente secos; la corrección por humedad se hace en el módulo de ajuste de agua.', 'Es una dosificación de partida: debe confirmarse con mezclas de prueba.']
    });

    /* ===================================================================== */
    /* 4 · COMBINACIÓN DE AGREGADOS                                           */
    /* ===================================================================== */
    var SIE = [37.5, 25, 19, 12.5, 9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15];
    function aggF(p, P, Mo) { var m = MZ(); return m._m.aggF(p, P, Mo); }
    function gradPaint(ctx, W, Ht, f, P, Mo, C) {
        panel(ctx, W, Ht, 'Granulometría combinada vs. curva objetivo');
        var Lx = 54, Rx = W - 16, Ty = 36, By = Ht - 44, w = Rx - Lx, h = By - Ty, l0 = Math.log10(0.15), l1 = Math.log10(40);
        function X(mm) { return Lx + (Math.log10(mm) - l0) / (l1 - l0) * w; } function Y(v) { return By - v / 100 * h; }
        ctx.strokeStyle = 'rgba(167,180,200,.12)'; ctx.fillStyle = '#A7B4C8'; ctx.font = '11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
        SIE.forEach(function (mm) { ctx.beginPath(); ctx.moveTo(X(mm), Ty); ctx.lineTo(X(mm), By); ctx.stroke(); if ([37.5, 19, 9.5, 4.75, 1.18, 0.3, 0.15].indexOf(mm) >= 0) ctx.fillText(String(mm), X(mm), By + 14); });
        ctx.textAlign = 'right'; for (var v = 0; v <= 100; v += 25) { ctx.beginPath(); ctx.moveTo(Lx, Y(v)); ctx.lineTo(Rx, Y(v)); ctx.stroke(); ctx.fillText(String(v), Lx - 6, Y(v) + 4); }
        ctx.textAlign = 'center'; ctx.fillText('Abertura (mm, escala log)', (Lx + Rx) / 2, Ht - 8);
        function line(arr, col, wd, dash) { solid(ctx, X, Y, SIE.map(function (mm, i) { return { x: mm, y: arr[i] }; }), col, wd, dash); }
        var target = SIE.map(function (mm) { return mm >= Mo.gr.D ? 100 : C.curvaObjetivo(mm, Mo.gr.D, P.obj); });
        line(Mo.ar, 'rgba(227,197,134,.6)', 2, [6, 5]); line(Mo.gr.p, 'rgba(154,165,177,.6)', 2, [6, 5]); line(target, '#34D399', 2.5, [9, 5]); line(C.combinar(Mo.ar, Mo.gr.p, f), '#FBBF24', 3.5);
        lbl(ctx, 'Combinada ' + f1(f * 100, 0) + ' % arena', Lx + 8, Ty + 8, { size: 11, color: '#FCD34D', weight: '800' });
        lbl(ctx, '- - ' + (P.obj === 'fuller' ? 'Fuller' : 'Bolomey'), Lx + 8, Ty + 24, { size: 11, color: '#6EE7B7' });
    }
    defOf('dm_agg', {
        fields: [
            { id: 'ar', label: 'Arena', type: 'select', options: [['fina', 'Fina (MF ≈ 2.2)'], ['media', 'Media (MF ≈ 2.7)'], ['gruesa', 'Gruesa (MF ≈ 3.3)']], value: 'media', desc: 'Granulometría del agregado fino disponible.' },
            { id: 'gr', label: 'Grava (TMN)', type: 'select', options: [['12.5', '12.5 mm'], ['19', '19 mm'], ['25', '25 mm']], value: '19', desc: 'Define la abertura D de la curva objetivo.' },
            { id: 'obj', label: 'Curva objetivo', type: 'select', options: [['fuller', 'Fuller: P = 100√(d/D)'], ['bolomey', 'Bolomey (a = 10)']], value: 'bolomey', desc: 'Granulometría ideal de referencia para la combinación.' },
            { id: 'f', label: 'Fracción de arena (f = arena/total)', unit: '', min: 0.2, max: 0.8, step: 0.01, dec: 2, value: 0.45, desc: 'Proporción en masa de arena del total de agregados.' }
        ],
        defaults: { ar: 'media', gr: '19', obj: 'bolomey', f: 0.45 },
        validate: function (prm) {
            var P = prm.P, Mo = P.mo, C = CC(), o = [];
            if (!Mo || !C) return [{ lvl: 'bad', msg: 'Módulo de cálculo de mezclas no disponible.' }];
            var e = C.errorCombinacion(C.combinar(Mo.ar, Mo.gr.p, P.f), SIE, Mo.gr.D, P.obj);
            if (e > 10) o.push({ lvl: 'warn', msg: 'El error RMS (' + f1(e, 1) + ') es alto: la combinación está lejos de la curva objetivo. Prueba cerca de ' + f1(Mo.best * 100, 0) + ' % de arena.' });
            return o;
        },
        results: function (prm, p) {
            var P = prm.P, Mo = P.mo, C = CC(); if (!Mo || !C) return [];
            var f = aggF(p, P, Mo), e = C.errorCombinacion(C.combinar(Mo.ar, Mo.gr.p, f), SIE, Mo.gr.D, P.obj), eb = Mo.bestE;
            return [R('Arena', '%', f1(f * 100, 0), f1(Mo.best * 100, 1), 'Calculado'), R('Grava', '%', f1((1 - f) * 100, 0), f1((1 - Mo.best) * 100, 1), 'Calculado'), R('Error RMS', '', f1(e, 2), f1(eb, 2), 'Calculado')];
        },
        charts: [
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) { var P = prm.P, Mo = P.mo, C = CC(); if (!Mo || !C) return; gradPaint(ctx, W, Ht, aggF(p, P, Mo), P, Mo, C); } },
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) {
                var P = prm.P, Mo = P.mo; if (!Mo) return; var pts = Mo.scan.map(function (s) { return { x: s[0] * 100, y: s[1] }; }), ym = Math.max.apply(null, pts.map(function (q) { return q.y; })) * 1.08, f = aggF(p, P, Mo), C = CC();
                var ecur = C.errorCombinacion(C.combinar(Mo.ar, Mo.gr.p, f), SIE, Mo.gr.D, P.obj);
                plot(ctx, W, Ht, { title: 'Error RMS vs. % de arena', xlabel: '% de arena', ylabel: 'Error RMS', xmin: 20, xmax: 80, ymin: 0, ymax: ym, pts: pts, nolive: true, color: '#FBBF24', over: function (c, X, Y) { solid(c, X, Y, pts, '#FBBF24', 3); mark(c, X, Y, Mo.best * 100, Mo.bestE, '#34D399', 'óptimo ' + f1(Mo.best * 100, 1) + ' %'); mark(c, X, Y, f * 100, ecur, '#EF4444'); } });
            } }
        ],
        interp: function (prm) {
            var P = prm.P, Mo = P.mo; if (!Mo) return '';
            return '<p>La mejor combinación con esta arena y grava de ' + P.gr + ' mm es <b>' + f1(Mo.best * 100, 1) + ' % de arena</b> y ' + f1((1 - Mo.best) * 100, 1) + ' % de grava, con un error RMS de ' + f1(Mo.bestE, 2) + ' frente a la curva de ' + (P.obj === 'fuller' ? 'Fuller' : 'Bolomey') + '.</p><p>Una buena combinación llena los vacíos con menos pasta de cemento. Las curvas teóricas son una guía: la mezcla real se afina con ensayos de trabajabilidad y resistencia.</p>';
        },
        hyp: ['Curvas teóricas: Fuller P = 100√(d/D); Bolomey P = a + (100 − a)√(d/D) con a = 10.', 'Error = RMS de la diferencia entre % pasa combinado y objetivo en los tamices ≤ D.', 'Granulometrías de arena y grava: datos típicos del simulador, no de un material real.']
    });

    /* ===================================================================== */
    /* 5 · GRANULOMETRÍA                                                      */
    /* ===================================================================== */
    var SZN = ['N.º 4', 'N.º 8', 'N.º 16', 'N.º 30', 'N.º 50', 'N.º 100', 'Fondo'];
    defOf('dm_gran', {
        fields: [
            { id: 'tot', label: 'Masa seca de la muestra (M₀)', unit: 'g', min: 200, max: 1000, step: 10, dec: 0, value: 500, desc: 'Masa inicial que se tamiza; la suma de retenidos debe coincidir con ella (± 0.3 %).' },
            { id: 'arena', label: 'Tipo de arena', type: 'select', options: [['fina', 'Fina (MF ≈ 2.2)'], ['media', 'Media (MF ≈ 2.7)'], ['gruesa', 'Gruesa (MF ≈ 3.3)']], value: 'media', desc: 'Distribución granulométrica que se simula.' }
        ],
        defaults: { tot: 500, arena: 'media' },
        validate: function (prm) {
            var P = prm.P, o = [];
            if (P.tot < 300) o.push({ lvl: 'warn', msg: 'ASTM C136 pide al menos 300 g para agregado fino: con ' + f1(P.tot, 0) + ' g el resultado es poco representativo.' });
            if (P.mf < 2.3 || P.mf > 3.1) o.push({ lvl: 'warn', msg: 'MF = ' + f1(P.mf, 2) + ' fuera del rango 2.3–3.1 de ASTM C33 para arena de concreto.' });
            return o;
        },
        results: function (prm, p) {
            var P = prm.P, w = p >= 0.88, ret = P.ret, acc = 0, i; for (i = 0; i < 7; i++) acc += ret[i];
            return [R('Masa inicial M₀', 'g', f1(P.tot * sm(p, 0.03, 0.14), 0), f1(P.tot, 0), 'Dato'), R('Suma de retenidos', 'g', p >= 0.66 ? f1(acc, 1) : '—', f1(acc, 1), 'Medido'), R('Módulo de finura (MF)', '', w ? f1(P.mf, 2) : '—', f1(P.mf, 2), 'Calculado'), R('% que pasa N.º 100', '%', w ? f1(P.pas[5], 1) : '—', f1(P.pas[5], 1), 'Calculado')];
        },
        charts: [
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) {
                var P = prm.P; panel(ctx, W, Ht, '% que pasa vs. abertura del tamiz');
                var mm = [9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15], pas = [100].concat(P.pas), Lx = 54, Rx = W - 16, Ty = 36, By = Ht - 44, w = Rx - Lx, h = By - Ty, l0 = Math.log10(0.1), l1 = Math.log10(12);
                function X(v) { return Lx + (Math.log10(v) - l0) / (l1 - l0) * w; } function Y(v) { return By - v / 100 * h; }
                ctx.strokeStyle = 'rgba(167,180,200,.12)'; ctx.fillStyle = '#A7B4C8'; ctx.font = '11px Inter, system-ui, sans-serif'; ctx.textAlign = 'center';
                mm.forEach(function (m) { ctx.beginPath(); ctx.moveTo(X(m), Ty); ctx.lineTo(X(m), By); ctx.stroke(); ctx.fillText(String(m), X(m), By + 14); });
                ctx.textAlign = 'right'; for (var v = 0; v <= 100; v += 25) { ctx.beginPath(); ctx.moveTo(Lx, Y(v)); ctx.lineTo(Rx, Y(v)); ctx.stroke(); ctx.fillText(String(v), Lx - 6, Y(v) + 4); }
                var C = CC(), pts = mm.map(function (m, i) { return { x: m, y: pas[i] }; });
                if (C && C.LIMITES_C33_FINO) { ctx.fillStyle = 'rgba(52,211,153,.10)'; ctx.beginPath(); C.LIMITES_C33_FINO.forEach(function (l, i) { ctx[i ? 'lineTo' : 'moveTo'](X(l[0]), Y(l[2])); }); for (var k = C.LIMITES_C33_FINO.length - 1; k >= 0; k--) ctx.lineTo(X(C.LIMITES_C33_FINO[k][0]), Y(C.LIMITES_C33_FINO[k][1])); ctx.closePath(); ctx.fill(); }
                var shown = p < 0.66 ? 0 : (p >= 0.88 ? 7 : Math.min(7, Math.floor(tw(p, 0.66, 0.88) * 7) + 1));
                solid(ctx, X, Y, pts, 'rgba(251,191,36,.3)', 2, [5, 5]); if (shown > 1) solid(ctx, X, Y, pts.slice(0, Math.max(2, shown)), '#FBBF24', 3.5);
                ctx.textAlign = 'center'; ctx.fillText('Abertura (mm, escala log)', (Lx + Rx) / 2, Ht - 8); lbl(ctx, 'Zona verde: límites ASTM C33 (arena)', Lx + 8, Ty + 8, { size: 10.5, color: '#6EE7B7' });
            } },
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) {
                var P = prm.P, mx = Math.max.apply(null, P.ret) * 1.15; panel(ctx, W, Ht, 'Masa retenida por tamiz (g)');
                var Lx = 54, Rx = W - 16, Ty = 36, By = Ht - 50, bw = (Rx - Lx) / 7, shown = p < 0.66 ? 0 : (p >= 0.88 ? 7 : Math.min(7, Math.floor(tw(p, 0.66, 0.88) * 7) + 1));
                ctx.fillStyle = '#A7B4C8'; ctx.font = '11px Inter, system-ui, sans-serif'; ctx.textAlign = 'right';
                for (var v = 0; v <= mx; v += Math.ceil(mx / 4 / 10) * 10) { var yy = By - v / mx * (By - Ty); ctx.strokeStyle = 'rgba(167,180,200,.12)'; ctx.beginPath(); ctx.moveTo(Lx, yy); ctx.lineTo(Rx, yy); ctx.stroke(); ctx.fillText(String(v), Lx - 6, yy + 4); }
                P.ret.forEach(function (m, i) { var h = m / mx * (By - Ty), x = Lx + i * bw + bw * 0.15; ctx.globalAlpha = i < shown ? 1 : 0.2; ctx.fillStyle = '#F59E0B'; ctx.fillRect(x, By - h, bw * 0.7, h); ctx.globalAlpha = 1; ctx.fillStyle = '#E2E8F0'; ctx.textAlign = 'center'; if (i < shown) ctx.fillText(f1(m, 0), x + bw * 0.35, By - h - 5); ctx.fillStyle = '#A7B4C8'; ctx.fillText(SZN[i], x + bw * 0.35, By + 14); });
            } }
        ],
        interp: function (prm) {
            var P = prm.P;
            return '<p>La arena tiene un <b>módulo de finura MF = ' + f1(P.mf, 2) + '</b> (' + (P.mf < 2.3 ? 'fina' : P.mf > 3.1 ? 'gruesa' : 'dentro del rango recomendado 2.3–3.1') + '). MF = Σ % retenido acumulado (N.º 4 a N.º 100) / 100.</p>' +
                '<p>El ' + f1(P.pas[5], 1) + ' % pasa el tamiz N.º 100; cuanto más fina es la arena, mayor demanda de agua y pasta de cemento.</p>';
        },
        hyp: ['Distribución granulométrica = datos típicos de arena fina/media/gruesa del simulador (no de un material real).', 'La transferencia del material entre tamices durante la vibración es una representación cualitativa; las masas finales sí cumplen M₀ = Σ retenidos.', 'MF según ASTM C136 usando N.º 4, 8, 16, 30, 50 y 100 (el tamiz de 9.5 mm retiene 0 en este ejemplo).']
    });

    /* ===================================================================== */
    /* 6 · PESO UNITARIO Y VACÍOS                                             */
    /* ===================================================================== */
    function punFill(p) { var s = 0, i; for (i = 0; i < 3; i++) s += tw(p, 0.10 + 0.18 * i, 0.18 + 0.18 * i) / 3; return s; }
    defOf('dm_punit', {
        fields: [
            { id: 'puc', label: 'PUC del agregado (γ)', unit: 'kg/m³', min: 1000, max: 2200, step: 10, dec: 0, value: 1600, desc: 'Masa compactada por unidad de volumen: se obtiene del ensayo (G − T)/V.' },
            { id: 'gs', label: 'Gravedad específica (Gs)', unit: '', min: 2.2, max: 3.2, step: 0.01, dec: 2, value: 2.7, desc: 'Densidad relativa de las partículas; con ella se calculan los vacíos.' },
            { id: 'Vl', label: 'Volumen del recipiente (V)', type: 'select', options: [[2.832, '2.8 L (⅒ pie³)'], [9.435, '9.4 L (⅓ pie³)'], [14.158, '14.2 L (½ pie³)'], [28.317, '28.3 L (1 pie³)']], value: 14.158, desc: 'Se elige según el TMN del agregado (ASTM C29); el modelo 3D conserva su tamaño visual.' },
            { id: 'T', label: 'Tara del recipiente (T)', unit: 'kg', min: 0.5, max: 15, step: 0.05, dec: 2, value: 4.8, desc: 'Masa del recipiente vacío, se descuenta de la pesada.' }
        ],
        defaults: { puc: 1600, gs: 2.7, Vl: 14.158, T: 4.8 },
        validate: function (prm) {
            var P = prm.P, o = [], rel = P.puc / (P.gs * 1000);
            if (P.vac < 25) o.push({ lvl: 'warn', msg: 'Vacíos = ' + f1(P.vac, 1) + ' %: demasiado bajo para un agregado suelto o varillado (típico 30–45 %). Revisa PUC y Gs.' });
            if (rel >= 1) o.push({ lvl: 'bad', msg: 'PUC ≥ Gs·ρw: físicamente imposible (vacíos negativos).' });
            if (P.vac > 55) o.push({ lvl: 'warn', msg: 'Vacíos = ' + f1(P.vac, 1) + ' %: muy alto, el agregado estaría casi suelto o mal graduado.' });
            return o;
        },
        results: function (prm, p) {
            var P = prm.P, fl = punFill(p), net = P.neto * fl;
            return [R('Tara T', 'kg', f1(P.T, 2), f1(P.T, 2), 'Medido'), R('Masa neta (G − T)', 'kg', f1(net, 2), f1(P.neto, 2), 'Medido'), R('Volumen V', 'L', f1(P.Vl, 2), f1(P.Vl, 2), 'Dato'), R('PUC = (G − T)/V', 'kg/m³', p >= 0.76 ? f1(net / P.V, 0) : '—', f1(P.puc, 0), 'Calculado'), R('Vacíos', '%', p >= 0.9 ? f1(P.vac, 1) : '—', f1(P.vac, 1), 'Calculado')];
        },
        charts: [
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) {
                var P = prm.P, fl = punFill(p), pts = [{ x: 0, y: 0 }, { x: P.Vl, y: P.neto }];
                plot(ctx, W, Ht, { title: 'Masa neta vs. volumen llenado', xlabel: 'Volumen llenado (L)', ylabel: 'Masa neta (kg)', xmin: 0, xmax: P.Vl, ymin: 0, ymax: P.neto * 1.1, pts: pts, nolive: true, color: '#38BDF8', over: function (c, X, Y) { solid(c, X, Y, pts, '#38BDF8', 3); mark(c, X, Y, P.Vl * fl, P.neto * fl, '#EF4444', 'pendiente = PUC'); } });
            } },
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm) {
                var P = prm.P, pts = [], u; for (u = 1000; u <= 2200; u += 50) pts.push({ x: u, y: (1 - u / (P.gs * 1000)) * 100 });
                plot(ctx, W, Ht, { title: 'Vacíos vs. PUC (para Gs = ' + f1(P.gs, 2) + ')', xlabel: 'PUC (kg/m³)', ylabel: 'Vacíos (%)', xmin: 1000, xmax: 2200, ymin: 0, ymax: 70, pts: pts, nolive: true, color: '#34D399', over: function (c, X, Y) { solid(c, X, Y, pts, '#34D399', 3); mark(c, X, Y, P.puc, clamp(P.vac, 0, 70), '#EF4444', f1(P.vac, 1) + ' % vacíos'); } });
            } }
        ],
        interp: function (prm) {
            var P = prm.P;
            return '<p>Con ' + f1(P.neto, 2) + ' kg de agregado en un recipiente de ' + f1(P.Vl, 1) + ' L, el <b>peso unitario compactado es ' + f1(P.puc, 0) + ' kg/m³</b>. Con Gs = ' + f1(P.gs, 2) + ' los <b>vacíos son ' + f1(P.vac, 1) + ' %</b>.</p><p>Este PUC es el dato que entra al diseño ACI para calcular la grava: Grava = b/b₀ × PUC.</p>';
        },
        hyp: ['PUC = (G − T)/V y % vacíos = [1 − PUC/(Gs·ρw)]·100 con ρw = 1000 kg/m³ (ASTM C29, método por varillado).', 'El tamaño visual del recipiente 3D no cambia con V; el cálculo sí.', 'Las pesadas intermedias se interpolan linealmente con el llenado.']
    });

    /* ===================================================================== */
    /* 7 · HUMEDAD DEL AGREGADO                                               */
    /* ===================================================================== */
    function humTemp(p) { return 25 + 85 * (sm(p, 0.44, 0.52) * (1 - 0.8 * sm(p, 0.62, 0.72))); }
    defOf('dm_hum', {
        fields: [
            { id: 'mh', label: 'Masa húmeda de la muestra (Mh)', unit: 'g', min: 100, max: 5000, step: 10, dec: 0, value: 1000, desc: 'Masa del agregado en estado natural, antes del horno.' },
            { id: 'w', label: 'Contenido de humedad real (w)', unit: '%', min: 0, max: 15, step: 0.1, dec: 1, value: 3.8, desc: 'w = (Mh − Ms)/Ms; define la masa seca que se obtendrá.' },
            { id: 'ab', label: 'Absorción del agregado (Abs)', unit: '%', min: 0, max: 8, step: 0.1, dec: 1, value: 1.5, desc: 'Agua que el agregado absorbe en su estado saturado superficialmente seco (SSS).' }
        ],
        defaults: { mh: 1000, w: 3.8, ab: 1.5 },
        validate: function (prm) {
            var P = prm.P, o = [];
            if (P.w < P.ab) o.push({ lvl: 'warn', msg: 'w (' + f1(P.w, 1) + ' %) < absorción (' + f1(P.ab, 1) + ' %): humedad libre negativa; el agregado está bajo el estado SSS y absorbería agua de la mezcla.' });
            if (P.mh < 500) o.push({ lvl: 'warn', msg: 'Menos de 500 g: la muestra puede no ser representativa del agregado fino.' });
            return o;
        },
        results: function (prm, p) {
            var P = prm.P;
            return [R('Masa húmeda Mh', 'g', f1(P.mh, 1), f1(P.mh, 1), 'Medido'), R('Masa seca Ms', 'g', p >= 0.76 ? f1(P.ms, 1) : '—', f1(P.ms, 1), 'Medido'), R('Humedad w', '%', p >= 0.84 ? f1(P.w, 2) : '—', f1(P.w, 2), 'Calculado'), R('Humedad libre (w − Abs)', '%', p >= 0.84 ? f1(P.libre, 2) : '—', f1(P.libre, 2), 'Calculado'), R('Temperatura del horno', '°C', f1(humTemp(p), 0), '110', 'Medido')];
        },
        charts: [
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm, p) {
                var P = prm.P, tau = 6, pts = [], t, hrs = 24 * tw(p, 0.44, 0.62); for (t = 0; t <= 24.01; t += 0.5) pts.push({ x: t, y: P.ms + (P.mh - P.ms) * Math.exp(-t / tau) });
                plot(ctx, W, Ht, { title: 'Masa durante el secado (tendencia cualitativa)', xlabel: 'Tiempo en el horno (h)', ylabel: 'Masa (g)', xmin: 0, xmax: 24, ymin: Math.floor(P.ms * 0.98), ymax: Math.ceil(P.mh * 1.01), pts: pts, nolive: true, color: '#FB7185', over: function (c, X, Y) { solid(c, X, Y, pts, '#FB7185', 3); c.save(); c.setLineDash([5, 4]); c.strokeStyle = 'rgba(255,255,255,.4)'; c.beginPath(); c.moveTo(X(0), Y(P.ms)); c.lineTo(X(24), Y(P.ms)); c.stroke(); c.restore(); lbl(c, 'Ms = ' + f1(P.ms, 1) + ' g (masa constante)', X(1), Y(P.ms) - 10, { size: 10.5, color: '#FDA4AF', weight: '800' }); if (p > 0.44) mark(c, X, Y, hrs, P.ms + (P.mh - P.ms) * Math.exp(-hrs / tau), '#EF4444'); } });
            } },
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm) {
                var P = prm.P, pts = [], m; for (m = P.ms * 1.0; m <= P.ms * 1.15 + 1e-9; m += P.ms * 0.005) pts.push({ x: m, y: (m - P.ms) / P.ms * 100 });
                var pts2 = []; var lo = P.ms * 0.98; for (m = lo; m <= P.ms * 1.16; m += P.ms * 0.005) pts2.push({ x: m, y: (m - P.ms) / P.ms * 100 });
                plot(ctx, W, Ht, { title: 'Humedad w vs. masa húmeda (Ms fija)', xlabel: 'Masa húmeda Mh (g)', ylabel: 'w (%)', xmin: lo, xmax: P.ms * 1.16, ymin: 0, ymax: 16, pts: pts2.map(function (q) { return { x: q.x, y: Math.max(0, q.y) }; }), nolive: true, color: '#34D399', over: function (c, X, Y) { solid(c, X, Y, pts2.map(function (q) { return { x: q.x, y: Math.max(0, q.y) }; }), '#34D399', 3); mark(c, X, Y, P.mh, clamp(P.w, 0, 16), '#EF4444', 'w = ' + f1(P.w, 2) + ' %'); } });
            } }
        ],
        interp: function (prm) {
            var P = prm.P;
            return '<p>La muestra pierde ' + f1(P.mh - P.ms, 1) + ' g de agua: <b>w = (' + f1(P.mh, 1) + ' − ' + f1(P.ms, 1) + ') / ' + f1(P.ms, 1) + ' = ' + f1(P.w, 2) + ' %</b>. Con absorción de ' + f1(P.ab, 1) + ' %, la <b>humedad libre es ' + f1(P.libre, 2) + ' %</b>.</p>' +
                '<p>' + (P.libre >= 0 ? 'Esa agua libre forma parte del agua de mezclado: hay que <b>restarla</b> del agua de diseño y sumar la masa de agua al peso del agregado.' : 'El agregado está seco: absorberá agua de la mezcla, por lo que hay que <b>agregar</b> agua extra al diseño.') + '</p>';
        },
        hyp: ['w = (Mh − Ms)/Ms según ASTM C566; en el ensayo real se seca hasta masa constante (variación < 0.1 %).', 'La curva de masa vs. tiempo es una tendencia cualitativa de primer orden (τ = 6 h): el tiempo real depende del material y del horno.', 'Humedad libre = w − absorción (agregado en estado SSS como referencia).']
    });

    /* ===================================================================== */
    /* 8 · CONCRETO FRESCO — peso unitario y aire                              */
    /* ===================================================================== */
    function frFill(p) { var s = 0, i; for (i = 0; i < 3; i++) s += sm(p, 0.1 * i, 0.1 * i + 0.05) / 3; return s; }
    defOf('dm_fresco', {
        fields: [
            { id: 'air', label: 'Contenido de aire (A)', unit: '%', min: 0.5, max: 8, step: 0.1, dec: 1, value: 2, desc: 'Aire total del concreto, leído en el manómetro de la olla (método de presión, ASTM C231).' },
            { id: 'gamma0', label: 'γ teórico sin aire (γt)', unit: 'kg/m³', min: 2200, max: 2650, step: 10, dec: 0, value: 2480, desc: 'Peso unitario que tendría la mezcla sin aire; γ = γt (1 − A).' },
            { id: 'tanda', label: 'Masa de la tanda de diseño (ΣM)', unit: 'kg/m³', min: 2200, max: 2550, step: 5, dec: 0, value: 2380, desc: 'Suma de masas de cemento, agua, arena y grava por m³ de diseño.' },
            { id: 'T', label: 'Tara de la olla (T)', unit: 'kg', min: 1, max: 10, step: 0.05, dec: 2, value: 5.1, desc: 'Masa de la olla vacía; se descuenta para obtener la masa del concreto.' }
        ],
        defaults: { air: 2, tanda: 2380, gamma0: 2480, T: 5.1 },
        validate: function (prm) {
            var P = prm.P, o = [];
            if (P.air > 6) o.push({ lvl: 'warn', msg: 'Aire > 6 %: muy alto para un concreto sin aditivo; reduce resistencia ≈ 5 % por cada 1 % de aire.' });
            if (P.gamma < 2200) o.push({ lvl: 'warn', msg: 'γ = ' + f1(P.gamma, 0) + ' kg/m³ es bajo para un concreto de peso normal (≈ 2200–2500).' });
            if (P.rend < 0.95 || P.rend > 1.05) o.push({ lvl: 'warn', msg: 'Rendimiento = ' + f1(P.rend, 3) + ' m³/m³: la tanda no produce el volumen de diseño; revisa dosificación.' });
            return o;
        },
        results: function (prm, p) {
            var P = prm.P, net = P.neto * (p < 0.3 ? frFill(p) : 1);
            return [R('Masa neta Mc', 'kg', f1(net, 2), f1(P.neto, 2), 'Medido'), R('Volumen de la olla V', 'L', '7.00', '7.00', 'Dato'), R('Peso unitario γ = Mc/V', 'kg/m³', p >= 0.36 ? f1(P.gamma, 0) : '—', f1(P.gamma, 0), 'Calculado'), R('Aire (manómetro)', '%', p >= 0.88 ? f1(P.air, 1) : '—', f1(P.air, 1), 'Medido'), R('Rendimiento Y = ΣM/γ', 'm³/m³', p >= 0.9 ? f1(P.rend, 3) : '—', f1(P.rend, 3), 'Calculado')];
        },
        charts: [
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm) {
                var P = prm.P, pts = [], a; for (a = 0; a <= 8.01; a += 0.25) pts.push({ x: a, y: P.gamma0 * (1 - a / 100) });
                plot(ctx, W, Ht, { title: 'Peso unitario vs. contenido de aire', xlabel: 'Aire (%)', ylabel: 'γ (kg/m³)', xmin: 0, xmax: 8, ymin: Math.floor(P.gamma0 * 0.9 / 50) * 50, ymax: Math.ceil(P.gamma0 / 50) * 50, pts: pts, nolive: true, color: '#F472B6', over: function (c, X, Y) { solid(c, X, Y, pts, '#F472B6', 3); mark(c, X, Y, P.air, P.gamma, '#EF4444', 'γ = ' + f1(P.gamma, 0)); } });
            } },
            { W: 480, H: 300, draw: function (ctx, W, Ht, prm) {
                var P = prm.P, pts = [], g; for (g = 2200; g <= 2600; g += 10) pts.push({ x: g, y: P.tanda / g });
                plot(ctx, W, Ht, { title: 'Rendimiento vs. peso unitario', xlabel: 'γ (kg/m³)', ylabel: 'Rendimiento (m³/m³)', xmin: 2200, xmax: 2600, ymin: 0.88, ymax: 1.1, pts: pts, nolive: true, color: '#38BDF8', yfmt: function (v) { return v.toFixed(2); }, over: function (c, X, Y) { solid(c, X, Y, pts, '#38BDF8', 3); mark(c, X, Y, clamp(P.gamma, 2200, 2600), clamp(P.rend, 0.88, 1.1), '#EF4444', 'Y = ' + f1(P.rend, 3)); } });
            } }
        ],
        interp: function (prm) {
            var P = prm.P;
            return '<p>La olla de 7 L pesa ' + f1(P.neto, 2) + ' kg de concreto: <b>γ = ' + f1(P.gamma, 0) + ' kg/m³</b> con ' + f1(P.air, 1) + ' % de aire. El <b>rendimiento</b> Y = ΣM/γ = ' + f1(P.tanda, 0) + '/' + f1(P.gamma, 0) + ' = <b>' + f1(P.rend, 3) + ' m³</b> por m³ de diseño' + (Math.abs(P.rend - 1) <= 0.02 ? ': la tanda rinde lo previsto.' : ': la tanda ' + (P.rend < 1 ? 'rinde menos' : 'rinde más') + ' que el volumen de diseño.') + '</p>';
        },
        hyp: ['γ = γt(1 − A/100) como relación de definición del aire con el peso unitario; γt es un dato que tú ajustas.', 'La lectura del manómetro se muestra directamente como el aire A; no se simula la ley de Boyle de la olla Tipo B.', 'Rendimiento Y = ΣM/γ (ASTM C138).']
    });

    /* ===================================================================== */
    /* GUÍA DE ETAPAS: pieza que interviene, cámara, por qué / qué se mide      */
    /* ===================================================================== */
    var G = {
        dm_rev: [
            { pins: [3, 2, 1], view: 'detalle', why: 'La compactación por capas elimina vacíos de aire atrapado y hace comparable el ensayo.', meas: 'Número de golpes por capa (25) y altura de cada capa.', exp: 'Un cono lleno y enrasado, sin vacíos visibles.' },
            { pins: [1], view: 'detalle', why: 'Levantar el molde en 5 ± 2 s sin torsión libera la masa sin perturbarla.', meas: 'Tiempo de levantamiento del cono.', exp: 'El concreto queda libre sobre la placa.' },
            { pins: [2], view: 'detalle', why: 'La masa se deforma por su propio peso según la fluidez de la mezcla.', meas: 'Altura de la masa respecto al borde del molde.', exp: 'Asentamiento verdadero: la masa baja sin romperse ni desplazarse.' },
            { pins: [4, 2, 5], view: 'frontal', why: 'Se mide al centro desplazado de la superficie, no al punto más alto.', meas: 'Asentamiento s = 300 mm − altura final (mm).', exp: 'Valor en mm que clasifica la consistencia de la mezcla.' }
        ],
        dm_comp: [
            { pins: [2, 3, 4], view: 'detalle', why: 'Una velocidad controlada evita que el efecto de la velocidad altere la resistencia.', meas: 'Carga aplicada P (kN) y velocidad de esfuerzo (MPa/s).', exp: 'La carga crece de forma continua y casi lineal.' },
            { pins: [3, 5], view: 'detalle', why: 'Cerca del pico se forman microfisuras que reducen la rigidez.', meas: 'Deformación axial ε y carga P.', exp: 'La curva σ–ε se aplana al acercarse a f′c.' },
            { pins: [3], view: 'detalle', why: 'La falla define la resistencia: la carga máxima soportada por la sección.', meas: 'Carga máxima Pmax (kN).', exp: 'Grietas y desprendimientos; f′c = Pmax/A.' },
            { pins: [5, 4], view: 'frontal', why: 'Se registran la carga máxima y el tipo de falla para validar el ensayo.', meas: 'Pmax, tipo de falla (1 a 6).', exp: 'Conos bien formados (tipo 1) en concretos normales.' }
        ],
        dm_aci: [
            { pins: [5], view: 'frontal', why: 'Se dosifica por encima de f′c para tener margen frente a la variabilidad (NSR-10 C.5.3.2).', meas: "f′cr (MPa).", exp: "f′cr > f′c." },
            { pins: [2, 0], view: 'detalle', why: 'Agua y aire dependen del asentamiento y del TMN (tabla 6.3.3).', meas: 'Agua (kg/m³) y aire atrapado (%).', exp: 'Agua entre ≈ 150 y 230 kg/m³ en concretos usuales.' },
            { pins: [5], view: 'frontal', why: 'La relación a/c controla resistencia y durabilidad.', meas: 'a/c por resistencia y por durabilidad (se toma la menor).', exp: 'A mayor f′cr, menor a/c.' },
            { pins: [1, 0], view: 'detalle', why: 'El cemento se obtiene del agua y de a/c.', meas: 'Cemento = agua/(a/c) (kg/m³).', exp: 'Más cemento a menor a/c.' },
            { pins: [3, 0], view: 'detalle', why: 'La grava ocupa un volumen fijo que depende del TMN y del MF de la arena.', meas: 'Grava = b/b₀ × PUC (kg/m³).', exp: 'Entre el 60 y 70 % del peso de los agregados.' },
            { pins: [4, 0], view: 'detalle', why: 'La arena completa el metro cúbico por diferencia de volumen absoluto.', meas: 'Volumen de arena (m³) → masa (kg/m³).', exp: 'Los cinco volúmenes suman exactamente 1 m³.' },
            { pins: [0, 5], view: 'home', why: 'Las proporciones facilitan la dosificación en obra.', meas: 'Proporción 1 : arena : grava y a/c.', exp: 'Dosificación lista para mezclas de prueba.' }
        ],
        dm_agg: [
            { pins: [0, 1], view: 'frontal', why: 'Arena y grava se pesan por separado para controlar la combinación.', meas: 'Fracciones de arena y grava.', exp: 'Las dos tolvas cargadas.' },
            { pins: [2, 3], view: 'detalle', why: 'Variar el % de arena cambia la granulometría combinada.', meas: '% pasa combinado por tamiz y error RMS.', exp: 'El error baja y luego sube: existe un mínimo.' },
            { pins: [4, 5], view: 'frontal', why: 'La mezcla óptima es la que más se parece a la curva objetivo.', meas: 'Error RMS mínimo.', exp: 'Curva amarilla sobre la verde.' },
            { pins: [4, 5], view: 'frontal', why: 'El resultado se usa en el diseño de la mezcla.', meas: '% óptimo de arena.', exp: 'Proporción arena/grava de partida.' }
        ],
        dm_gran: [
            { pins: [4, 1], view: 'detalle', why: 'La masa inicial permite verificar pérdidas al final del ensayo.', meas: 'Masa seca inicial M₀ (g).', exp: 'Muestra vertida sin pérdidas sobre el tamiz superior.' },
            { pins: [0, 2], view: 'detalle', why: 'La vibración separa las partículas por tamaño a través de las aberturas.', meas: 'Tiempo de tamizado (≈ 10 min).', exp: 'Las fracciones más finas bajan hasta el fondo.' },
            { pins: [4, 2], view: 'detalle', why: 'Pesar cada fracción permite calcular los porcentajes retenidos.', meas: 'Masa retenida en cada tamiz (g).', exp: 'La suma de retenidos ≈ M₀ (± 0.3 %).' },
            { pins: [5], view: 'frontal', why: 'El % pasa y el MF caracterizan la arena para el diseño y el control.', meas: '% retenido acumulado, % pasa, MF.', exp: 'MF entre 2.3 y 3.1 para arena de concreto.' }
        ],
        dm_punit: [
            { pins: [5, 0], view: 'detalle', why: 'La tara se descuenta para obtener la masa neta del agregado.', meas: 'Tara T (kg).', exp: 'Lectura estable de la balanza.' },
            { pins: [1, 3, 2, 0], view: 'detalle', why: 'La compactación por varillado es la que define el peso unitario compactado.', meas: 'Capas (3) y golpes por capa (25).', exp: 'Recipiente lleno y compactado.' },
            { pins: [4, 0], view: 'detalle', why: 'La superficie a ras garantiza que el volumen del material = V del recipiente.', meas: 'Superficie nivelada con el borde.', exp: 'Sin colmos ni huecos.' },
            { pins: [5, 0], view: 'detalle', why: 'La masa lleno − tara es la masa del agregado.', meas: 'G (kg) y masa neta G − T.', exp: 'Masa neta ≈ PUC × V.' },
            { pins: [5], view: 'frontal', why: 'El PUC entra a la dosificación y los vacíos describen el empaquetamiento.', meas: 'PUC y % de vacíos.', exp: 'Vacíos entre 30 y 45 %.' }
        ],
        dm_hum: [
            { pins: [4, 3], view: 'detalle', why: 'La masa húmeda es el punto de partida del cálculo de w.', meas: 'Masa húmeda Mh (g).', exp: 'Lectura de la bandeja con la muestra.' },
            { pins: [0, 1, 2, 3], view: 'home', why: 'A 110 °C se evapora el agua libre y absorbida sin alterar el agregado.', meas: 'Temperatura (110 ± 5 °C) y tiempo.', exp: 'Masa constante (variación < 0.1 %).' },
            { pins: [1, 3, 4], view: 'detalle', why: 'La masa seca es el denominador de la humedad.', meas: 'Masa seca Ms (g).', exp: 'Ms < Mh.' },
            { pins: [4], view: 'frontal', why: 'w y la humedad libre corrigen el agua de mezclado en obra.', meas: 'w = (Mh − Ms)/Ms y w − absorción.', exp: 'Humedad libre positiva = agua que hay que descontar.' }
        ],
        dm_fresco: [
            { pins: [0], view: 'detalle', why: 'Compactar por capas elimina vacíos y hace comparable la medida.', meas: 'Capas (3), golpes de varilla (25) y golpes de mazo.', exp: 'Olla llena sin burbujas grandes.' },
            { pins: [5, 0], view: 'detalle', why: 'Con el volumen conocido de la olla se obtiene el peso unitario.', meas: 'Masa del concreto Mc (kg).', exp: 'γ = Mc/V.' },
            { pins: [1, 4], view: 'detalle', why: 'El agua desplaza el aire sobre el concreto para que solo quede la cámara de aire.', meas: 'Cámara sellada y sin burbujas.', exp: 'Agua saliendo por la llave opuesta.' },
            { pins: [3, 2], view: 'detalle', why: 'La presión comprime el aire del concreto; el manómetro lo convierte a %.', meas: 'Presión inicial y lectura de aire (%).', exp: 'La aguja baja hasta el % de aire de la mezcla.' },
            { pins: [2, 5], view: 'frontal', why: 'Se reportan γ, aire y rendimiento de la tanda.', meas: 'γ (kg/m³), A (%), Y (m³).', exp: 'Rendimiento ≈ 1.0 m³ por m³ de diseño.' }
        ]
    };
    Object.keys(G).forEach(function (t) {
        var m = L3.meta[t]; if (!m) return;
        G[t].forEach(function (g, i) { if (m.phases[i]) { m.phases[i].pins = g.pins; m.phases[i].view = g.view; m.phases[i].why = g.why; m.phases[i].meas = g.meas; m.phases[i].exp = g.exp; } });
    });
})(window);
