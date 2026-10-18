/* =========================================================
   GeoMetrics — Diseño de Mezclas: motor de cálculo (sin DOM)
   Funciones puras: reciben números y devuelven objetos.
   Se pueden probar en Node:  node -e "require('./js/mezclas-calc.js')"
   Referencias: ACI 211.1-91, ACI 318 / NSR-10 (Título C),
   ASTM C136, C128, C127, C29, C566, C143, C138, C39, C33.
========================================================= */
(function (root) {
    'use strict';

    /* ---------- utilidades ---------- */
    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
    function round(v, d) { var f = Math.pow(10, d || 0); return Math.round(v * f) / f; }

    /** Interpolación lineal sobre puntos [[x,y],...] ordenados por x. Extrapola con el último tramo. */
    function interp(points, x) {
        var n = points.length;
        if (n === 1) return points[0][1];
        var i = 0;
        while (i < n - 2 && x > points[i + 1][0]) i++;
        var x0 = points[i][0], y0 = points[i][1], x1 = points[i + 1][0], y1 = points[i + 1][1];
        if (x1 === x0) return y0;
        return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }

    /** Interpolación inversa (y → x) para curvas monótonas dadas como [[x,y],...]. */
    function interpInv(points, y) {
        var inv = points.map(function (p) { return [p[1], p[0]]; });
        inv.sort(function (a, b) { return a[0] - b[0]; });
        return interp(inv, y);
    }

    /* =========================================================
       TABLAS ACI 211.1 (unidades SI)
    ========================================================= */
    var ACI = {
        // Tamaños máximos nominales (mm) — columnas de las tablas
        tmn: [9.5, 12.5, 19, 25, 37.5, 50, 75, 150],
        // Agua de mezclado (kg/m³) por asentamiento (mm): concreto SIN aire incorporado
        agua: {
            lim:   [37.5, 87.5, 162.5],               // puntos medios de 25–50, 75–100, 150–175
            sin: [
                [207, 199, 190, 179, 166, 154, 130, 113],
                [228, 216, 205, 193, 181, 169, 145, 124],
                [243, 228, 216, 202, 190, 178, 160, null]
            ],
            con: [
                [181, 175, 168, 160, 150, 142, 122, 107],
                [202, 193, 184, 175, 165, 157, 133, 119],
                [216, 205, 197, 184, 174, 166, 154, null]
            ]
        },
        // Aire atrapado (%) — sin aire incorporado
        aireAtrapado: [3, 2.5, 2, 1.5, 1, 0.5, 0.3, 0.2],
        // Contenido total de aire (%) recomendado — con aire incorporado, según exposición
        aireIncorp: {
            leve:     [4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1],
            moderada: [6, 5.5, 5, 4.5, 4.5, 4, 3.5, 3],
            severa:   [7.5, 7, 6, 6, 5.5, 5, 4.5, 4]
        },
        // Relación a/c máxima según f'cr (MPa): [f'cr, sin aire, con aire]
        acFcr: [
            [15, 0.79, 0.70], [20, 0.69, 0.60], [25, 0.61, 0.52], [30, 0.54, 0.45],
            [35, 0.47, 0.39], [40, 0.42, null], [45, 0.38, null]
        ],
        // Volumen de agregado grueso seco-varillado por unidad de volumen (b/b0)
        vgMF: [2.4, 2.6, 2.8, 3.0],
        vg: {
            '9.5':  [0.50, 0.48, 0.46, 0.44],
            '12.5': [0.59, 0.57, 0.55, 0.53],
            '19':   [0.66, 0.64, 0.62, 0.60],
            '25':   [0.71, 0.69, 0.67, 0.65],
            '37.5': [0.75, 0.73, 0.71, 0.69],
            '50':   [0.78, 0.76, 0.74, 0.72],
            '75':   [0.82, 0.80, 0.78, 0.76],
            '150':  [0.87, 0.85, 0.83, 0.81]
        },
        // Asentamientos recomendados por tipo de elemento (mm): [máx, mín]
        asentamientos: [
            ['Zapatas y muros de cimentación reforzados', 75, 25],
            ['Zapatas, cajones y muros de subestructura sin refuerzo', 75, 25],
            ['Vigas y muros reforzados', 100, 25],
            ['Columnas', 100, 25],
            ['Pavimentos y losas', 75, 25],
            ['Concreto masivo', 75, 25]
        ]
    };

    function tmnIndex(tmn) {
        for (var i = 0; i < ACI.tmn.length; i++) if (Math.abs(ACI.tmn[i] - tmn) < 1e-6) return i;
        return -1;
    }

    /** Agua de mezclado (kg/m³) para un asentamiento y TMN, interpolando entre filas de la tabla. */
    function aguaACI(slump, tmn, aireIncorporado) {
        var j = tmnIndex(tmn);
        if (j < 0) return null;
        var filas = aireIncorporado ? ACI.agua.con : ACI.agua.sin;
        var pts = [];
        for (var r = 0; r < 3; r++) if (filas[r][j] != null) pts.push([ACI.agua.lim[r], filas[r][j]]);
        if (pts.length < 2) return null;
        var excede = slump > pts[pts.length - 1][0] + 12.5 || slump < 25;
        return { agua: interp(pts, slump), fueraDeTabla: excede, hastaSlump: pts[pts.length - 1][0] + 12.5 };
    }

    /** Asentamiento esperado (mm) a partir del agua de mezclado, para el modelo didáctico del simulador. */
    function slumpDesdeAgua(agua, tmn, aireIncorporado) {
        var j = tmnIndex(tmn);
        if (j < 0) j = 2;
        var filas = aireIncorporado ? ACI.agua.con : ACI.agua.sin;
        var pts = [];
        for (var r = 0; r < 3; r++) if (filas[r][j] != null) pts.push([filas[r][j], ACI.agua.lim[r]]);
        return clamp(interp(pts, agua), 0, 260);
    }

    /** Resistencia promedio requerida f'cr (MPa) — NSR-10 C.5.3.2 / ACI 318. s = desviación estándar (MPa) o 0 si no hay registro. */
    function fcrequerida(fc, s) {
        if (isNum(s) && s > 0) {
            var a = fc + 1.34 * s;
            var b = fc + 2.33 * s - 3.5;
            return Math.max(a, b);
        }
        if (fc < 21) return fc + 7;
        if (fc <= 35) return fc + 8.5;
        return 1.10 * fc + 5.0;
    }

    /** Relación a/c por resistencia (tabla ACI 211.1 interpolada). */
    function acPorResistencia(fcr, aireIncorporado) {
        var pts = [];
        ACI.acFcr.forEach(function (r) {
            var v = aireIncorporado ? r[2] : r[1];
            if (v != null) pts.push([r[0], v]);
        });
        var fuera = fcr < pts[0][0] || fcr > pts[pts.length - 1][0];
        var ac = interp(pts, fcr);
        return { ac: clamp(ac, 0.28, 0.85), fueraDeTabla: fuera };
    }

    /** Resistencia a 28 d estimada a partir de a/c (curva inversa de la tabla ACI, sin aire). */
    function resistenciaPorAC(ac) {
        var pts = ACI.acFcr.map(function (r) { return [r[1], r[0]]; }).sort(function (a, b) { return a[0] - b[0]; });
        return clamp(interp(pts, ac), 5, 80);
    }

    /** Volumen de agregado grueso seco-varillado por m³ de concreto (b/b0), interpolado por MF. */
    function volumenGrueso(tmn, mf) {
        var fila = ACI.vg[String(tmn)];
        if (!fila) return null;
        var pts = ACI.vgMF.map(function (m, i) { return [m, fila[i]]; });
        var fuera = mf < 2.4 || mf > 3.0;
        return { vg: clamp(interp(pts, mf), 0.3, 0.9), fueraDeTabla: fuera };
    }

    /* =========================================================
       DISEÑO ACI 211.1 — método del volumen absoluto
       p: { fc, s, slump, tmn, mf, puc, gsC, gsG, gsF, aire:'atrapado'|'leve'|'moderada'|'severa',
            acMax (opcional), ajusteAgua (kg/m³, opcional),
            wG, absG, wF, absF (% — humedad natural y absorción, opcionales),
            volLab (L, opcional) }
    ========================================================= */
    function disenoACI(p) {
        var err = function (m) { return { ok: false, error: m }; };
        var req = ['fc', 'slump', 'tmn', 'mf', 'puc', 'gsC', 'gsG', 'gsF'];
        for (var i = 0; i < req.length; i++) {
            if (!isNum(p[req[i]])) return err('Completa el campo «' + req[i] + '» con un número válido.');
        }
        if (p.fc < 10 || p.fc > 80) return err('f\'c fuera de rango razonable (10–80 MPa).');
        if (p.slump < 10 || p.slump > 250) return err('El asentamiento debe estar entre 10 y 250 mm.');
        if (p.puc < 1000 || p.puc > 2200) return err('El peso unitario compactado del grueso debe estar entre 1000 y 2200 kg/m³.');
        if (p.gsC < 2.8 || p.gsC > 3.4) return err('Gs del cemento fuera de rango (2.8–3.4).');
        if (p.gsG < 2.2 || p.gsG > 3.2 || p.gsF < 2.2 || p.gsF > 3.2) return err('Gs de agregados fuera de rango (2.2–3.2).');
        if (p.mf < 1.8 || p.mf > 3.6) return err('El módulo de finura de la arena debe estar entre 1.8 y 3.6.');

        var avisos = [];
        var ai = p.aire && p.aire !== 'atrapado';

        // 1. f'cr
        var fcr = fcrequerida(p.fc, p.s || 0);

        // 2–3. agua y aire
        var w = aguaACI(p.slump, p.tmn, ai);
        if (!w) return err('Para este TMN no hay dato de agua en la tabla ACI con ese asentamiento. Elige otro TMN o asentamiento.');
        if (w.fueraDeTabla) avisos.push('Asentamiento fuera del intervalo de la tabla ACI (25–' + w.hastaSlump + ' mm): el agua es una extrapolación.');
        var j = tmnIndex(p.tmn);
        var aire = ai ? ACI.aireIncorp[p.aire][j] : ACI.aireAtrapado[j];
        var agua = w.agua + (isNum(p.ajusteAgua) ? p.ajusteAgua : 0);
        if (agua < 120) return err('El contenido de agua resultante es demasiado bajo; revisa el ajuste de agua.');

        // 4. a/c
        var acR = acPorResistencia(fcr, ai);
        if (acR.fueraDeTabla) avisos.push('f\'cr = ' + round(fcr, 1) + ' MPa queda fuera del rango de la tabla a/c (15–' + (ai ? 35 : 45) + ' MPa): valor extrapolado, verifícalo con mezclas de prueba.');
        var ac = acR.ac, ctrl = 'resistencia';
        if (isNum(p.acMax) && p.acMax > 0 && p.acMax < ac) { ac = p.acMax; ctrl = 'durabilidad'; }

        // 5. cemento
        var cem = agua / ac;
        if (cem < 250) avisos.push('Cemento < 250 kg/m³: poco contenido de pasta; verifica durabilidad y trabajabilidad.');
        if (cem > 550) avisos.push('Cemento > 550 kg/m³: riesgo de retracción y calor de hidratación elevado.');

        // 6. grueso
        var g = volumenGrueso(p.tmn, p.mf);
        if (!g) return err('TMN no válido.');
        if (g.fueraDeTabla) avisos.push('MF fuera de 2.4–3.0: b/b0 extrapolado.');
        var mG = g.vg * p.puc;                                       // kg secos
        // 7. fino por volumen absoluto
        var vC = cem / (p.gsC * 1000), vW = agua / 1000, vA = aire / 100, vG = mG / (p.gsG * 1000);
        var vF = 1 - (vC + vW + vA + vG);
        if (vF <= 0.05) return err('El volumen restante para la arena es demasiado pequeño (' + round(vF * 1000, 0) + ' L). Revisa Gs, PUC, TMN o la relación a/c.');
        var mF = vF * p.gsF * 1000;
        if (vF / (vF + vG) < 0.25) avisos.push('La arena resulta < 25 % del volumen de agregados: mezcla pedregosa y poco cohesiva.');

        // 8. corrección por humedad (opcional)
        var hum = isNum(p.wG) && isNum(p.wF) && isNum(p.absG) && isNum(p.absF);
        var aguaAj = agua, mGh = mG, mFh = mF, aporte = 0;
        if (hum) {
            mGh = mG * (1 + p.wG / 100);
            mFh = mF * (1 + p.wF / 100);
            aporte = mG * (p.wG - p.absG) / 100 + mF * (p.wF - p.absF) / 100;   // + aporta agua, − absorbe
            aguaAj = agua - aporte;
            if (aguaAj < 0) { avisos.push('Los agregados aportan más agua que la requerida: revisa las humedades ingresadas.'); aguaAj = Math.max(aguaAj, 0); }
        }

        // 9. proporciones y masa teórica
        var absGv = isNum(p.absG) ? p.absG : 0, absFv = isNum(p.absF) ? p.absF : 0;
        var pesoUnitTeor = cem + agua + mG * (1 + absGv / 100) + mF * (1 + absFv / 100);
        var cemUse = cem, aguaUse = hum ? aguaAj : agua, gUse = hum ? mGh : mG, fUse = hum ? mFh : mF;

        var res = {
            ok: true, avisos: avisos,
            fcr: fcr, ac: ac, acResistencia: acR.ac, controla: ctrl, agua: agua, aire: aire, aireIncorporado: !!ai,
            cemento: cem, vg: g.vg, grueso: mG, fino: mF,
            vol: { cemento: vC, agua: vW, aire: vA, grueso: vG, fino: vF },
            humedad: hum, aporteAgua: aporte,
            aguaCorregida: aguaUse, gruesoHumedo: gUse, finoHumedo: fUse,
            pesoUnitarioTeorico: pesoUnitTeor,
            proporcion: { cemento: 1, fino: fUse / cemUse, grueso: gUse / cemUse, aguaLitros50kg: aguaUse / cemUse * 50 },
            pctArena: vF / (vF + vG) * 100
        };
        if (isNum(p.volLab) && p.volLab > 0) {
            var k = p.volLab / 1000;
            res.tanda = { volL: p.volLab, cemento: cemUse * k, agua: aguaUse * k, fino: fUse * k, grueso: gUse * k };
        }
        return res;
    }

    /* =========================================================
       GRANULOMETRÍA (ASTM C136 / NTC 77)
    ========================================================= */
    var TAMICES = [
        { k: '3"', mm: 75 }, { k: '2"', mm: 50 }, { k: '1½"', mm: 37.5 }, { k: '1"', mm: 25 },
        { k: '¾"', mm: 19 }, { k: '½"', mm: 12.5 }, { k: '3/8"', mm: 9.5 }, { k: 'N.º 4', mm: 4.75 },
        { k: 'N.º 8', mm: 2.36 }, { k: 'N.º 16', mm: 1.18 }, { k: 'N.º 30', mm: 0.6 },
        { k: 'N.º 50', mm: 0.3 }, { k: 'N.º 100', mm: 0.15 }
    ];
    var SERIE_MF = [75, 37.5, 19, 9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15];     // tamices que cuentan para el MF
    var LIMITES_C33_FINO = [                                                    // [mm, mín % pasa, máx % pasa]
        [9.5, 100, 100], [4.75, 95, 100], [2.36, 80, 100], [1.18, 50, 85],
        [0.6, 25, 60], [0.3, 5, 30], [0.15, 0, 10]
    ];
    var JUEGO_FINO = [9.5, 4.75, 2.36, 1.18, 0.6, 0.3, 0.15];
    var JUEGO_GRUESO = [50, 37.5, 25, 19, 12.5, 9.5, 4.75, 2.36];

    function etiquetaTamiz(mm) {
        for (var i = 0; i < TAMICES.length; i++) if (Math.abs(TAMICES[i].mm - mm) < 1e-6) return TAMICES[i].k;
        return mm + ' mm';
    }

    /**
     * filas: [{mm, masa}] de mayor a menor abertura (sin fondo), fondo: masa en el fondo (g),
     * m0: masa seca inicial (g, opcional), tipo: 'fino' | 'grueso'
     */
    function granulometria(filas, fondo, m0, tipo) {
        var err = function (m) { return { ok: false, error: m }; };
        if (!filas || !filas.length) return err('No hay tamices.');
        var suma = fondo || 0, i;
        for (i = 0; i < filas.length; i++) {
            if (!isNum(filas[i].masa) || filas[i].masa < 0) return err('Hay masas retenidas vacías o negativas.');
            suma += filas[i].masa;
        }
        if (!isNum(fondo) || fondo < 0) return err('Ingresa la masa retenida en el fondo (puede ser 0).');
        if (suma <= 0) return err('La masa total es cero.');
        var avisos = [], base = suma, perdida = null;
        if (isNum(m0) && m0 > 0) {
            perdida = (m0 - suma) / m0 * 100;
            base = m0;
            if (Math.abs(perdida) > 0.3) avisos.push('La suma de masas difiere ' + round(perdida, 2) + ' % de la masa inicial: la norma (ASTM C136) exige ≤ 0.3 %. Repite el tamizado.');
        }
        var acum = 0, tabla = [], sumaMF = 0;
        for (i = 0; i < filas.length; i++) {
            var pr = filas[i].masa / base * 100;
            acum += pr;
            var pasa = Math.max(0, 100 - acum);
            tabla.push({ mm: filas[i].mm, label: etiquetaTamiz(filas[i].mm), masa: filas[i].masa, pctRet: pr, pctAcum: acum, pctPasa: pasa });
            for (var s = 0; s < SERIE_MF.length; s++) if (Math.abs(SERIE_MF[s] - filas[i].mm) < 1e-6) sumaMF += acum;
        }
        var prF = fondo / base * 100;
        // Módulo de finura: sólo es válido si están todos los tamices de la serie desde 4.75 hasta 0.15
        var tieneSerieFino = [4.75, 2.36, 1.18, 0.6, 0.3, 0.15].every(function (m) { return filas.some(function (f) { return Math.abs(f.mm - m) < 1e-6; }); });
        var mf = tieneSerieFino ? sumaMF / 100 : null;
        // TM y TMN
        var tm = null, tmn = null;
        for (i = 0; i < tabla.length; i++) {
            if (tabla[i].pctPasa >= 99.95) { tm = tabla[i].mm; }
            else break;
        }
        // TMN: el tamiz inmediatamente mayor al primero que retiene más de 10 %
        for (i = 0; i < tabla.length; i++) {
            if (tabla[i].pctRet > 10) { tmn = i === 0 ? tabla[0].mm : tabla[i - 1].mm; break; }
        }
        var cumple = null, fuera = [];
        if (tipo === 'fino') {
            cumple = true;
            LIMITES_C33_FINO.forEach(function (l) {
                var f = tabla.filter(function (t) { return Math.abs(t.mm - l[0]) < 1e-6; })[0];
                if (f && (f.pctPasa < l[1] - 0.05 || f.pctPasa > l[2] + 0.05)) { cumple = false; fuera.push(f.label + ' (' + round(f.pctPasa, 1) + ' % vs ' + l[1] + '–' + l[2] + ')'); }
            });
            if (mf != null && (mf < 2.3 || mf > 3.1)) { cumple = false; fuera.push('MF = ' + round(mf, 2) + ' fuera de 2.3–3.1'); }
        }
        var clasMF = mf == null ? null : (mf < 2.3 ? 'Arena fina' : (mf <= 3.1 ? 'Arena media' : 'Arena gruesa'));
        return { ok: true, avisos: avisos, tabla: tabla, fondo: { masa: fondo, pctRet: prF }, total: suma, base: base, perdida: perdida,
                 mf: mf, tm: tm, tmn: tmn, cumpleC33: cumple, fueraC33: fuera, clasMF: clasMF };
    }

    /* =========================================================
       GRAVEDAD ESPECÍFICA Y ABSORCIÓN
    ========================================================= */
    /** Fino — picnómetro (ASTM C128 / NTC 237). A = seca al horno, B = picnómetro + agua, C = picnómetro + muestra + agua, S = masa SSS */
    function gravedadFino(A, B, C, S) {
        if (![A, B, C, S].every(isNum) || A <= 0 || S <= 0) return { ok: false, error: 'Completa A, B, C y S con valores positivos.' };
        if (S < A) return { ok: false, error: 'La masa SSS (S) no puede ser menor que la masa seca (A).' };
        var den = B + S - C, denAp = B + A - C;
        if (den <= 0 || denAp <= 0) return { ok: false, error: 'Datos incoherentes: B + S − C debe ser positivo (revisa las pesadas).' };
        var avisos = [];
        if (Math.abs(S - 500) > 10) avisos.push('La norma indica una muestra SSS de unos 500 g (S = ' + S + ' g).');
        var gs = A / den, abs = (S - A) / A * 100;
        if (gs < 2.2 || gs > 3.0) avisos.push('Gs fuera del rango usual de agregados (2.2–3.0): revisa las pesadas.');
        return { ok: true, avisos: avisos, gsSeca: gs, gsSSS: S / den, gsAparente: A / denAp, absorcion: abs };
    }
    /** Grueso — pesada hidrostática (ASTM C127 / NTC 176). A = seca al horno, B = SSS en aire, C = SSS sumergida */
    function gravedadGrueso(A, B, C) {
        if (![A, B, C].every(isNum) || A <= 0 || B <= 0 || C < 0) return { ok: false, error: 'Completa A, B y C con valores positivos.' };
        if (B < A) return { ok: false, error: 'La masa SSS en aire (B) no puede ser menor que la seca (A).' };
        if (C >= A) return { ok: false, error: 'La masa sumergida (C) debe ser menor que A: revisa las pesadas.' };
        var avisos = [], gs = A / (B - C);
        if (gs < 2.2 || gs > 3.2) avisos.push('Gs fuera del rango usual de agregados (2.2–3.2).');
        return { ok: true, avisos: avisos, gsSeca: gs, gsSSS: B / (B - C), gsAparente: A / (A - C), absorcion: (B - A) / A * 100 };
    }

    /* =========================================================
       PESO UNITARIO Y VACÍOS (ASTM C29 / NTC 92)
    ========================================================= */
    /** G = masa recipiente + agregado (kg), T = masa recipiente (kg), V (m³) o masa de agua (kg) para calibrar; gs = Gs seca */
    function pesoUnitarioAgregado(G, T, V, masaAgua, gs, rhoAgua) {
        if (!isNum(G) || !isNum(T) || G <= T || T < 0) return { ok: false, error: 'La masa del recipiente lleno debe ser mayor que la del recipiente vacío.' };
        var vol = V, avisos = [];
        if (!(isNum(vol) && vol > 0)) {
            if (isNum(masaAgua) && masaAgua > 0) vol = masaAgua / (isNum(rhoAgua) ? rhoAgua : 998);
            else return { ok: false, error: 'Indica el volumen del recipiente (m³) o la masa de agua de calibración (kg).' };
        }
        var pu = (G - T) / vol;
        if (pu < 800 || pu > 2300) avisos.push('PU fuera del rango usual (800–2300 kg/m³): revisa unidades (kg y m³).');
        var vacios = null;
        if (isNum(gs) && gs > 0) {
            var rw = isNum(rhoAgua) ? rhoAgua : 998;
            vacios = (gs * rw - pu) / (gs * rw) * 100;
            if (vacios < 0) avisos.push('Vacíos negativos: Gs menor que la requerida por la masa medida. Revisa datos.');
        }
        return { ok: true, avisos: avisos, volumen: vol, pu: pu, vacios: vacios };
    }

    /* =========================================================
       HUMEDAD DE AGREGADOS (ASTM C566 / NTC 1776)
    ========================================================= */
    function humedadAgregado(mh, ms, absorcion) {
        if (!isNum(mh) || !isNum(ms) || ms <= 0) return { ok: false, error: 'Ingresa masa húmeda y masa seca.' };
        if (mh < ms) return { ok: false, error: 'La masa húmeda no puede ser menor que la seca.' };
        var w = (mh - ms) / ms * 100;
        var out = { ok: true, avisos: [], w: w };
        if (isNum(absorcion)) {
            out.libre = w - absorcion;
            out.estado = out.libre > 0.05 ? 'Húmedo (aporta agua a la mezcla)' : (out.libre < -0.05 ? 'Parcialmente seco (absorbe agua de la mezcla)' : 'Saturado y superficialmente seco (SSS)');
        }
        return out;
    }

    /* =========================================================
       CONCRETO FRESCO
    ========================================================= */
    function claseAsentamiento(s) {
        if (s < 25) return 'Muy seca (consistencia rígida)';
        if (s < 50) return 'Seca / baja';
        if (s <= 100) return 'Plástica / media';
        if (s <= 150) return 'Blanda / alta';
        if (s <= 200) return 'Fluida';
        return 'Muy fluida (verificar con mesa de flujo / autocompactante)';
    }
    function revenimiento(H0, Hf, espec, temp, tipoFalla) {
        if (!isNum(H0) || !isNum(Hf) || H0 <= 0) return { ok: false, error: 'Ingresa la altura del molde y la altura final de la muestra.' };
        if (Hf > H0) return { ok: false, error: 'La altura final no puede ser mayor que la del molde.' };
        var s = H0 - Hf, avisos = [];
        if (Math.abs(H0 - 300) > 3) avisos.push('El cono de Abrams normalizado mide 300 mm de altura.');
        var out = { ok: true, avisos: avisos, slump: s, clase: claseAsentamiento(s) };
        if (tipoFalla === 'cortante') avisos.push('Falla por cortante: el ensayo no es válido; repite con otra porción de muestra (ASTM C143).');
        if (tipoFalla === 'colapso') avisos.push('Colapso total: indica una mezcla muy fluida o poco cohesiva.');
        if (isNum(espec) && espec > 0) {
            var tol = espec <= 50 ? 15 : (espec <= 100 ? 25 : 40);
            out.tolerancia = tol; out.dif = s - espec; out.cumple = Math.abs(s - espec) <= tol;
        }
        if (isNum(temp)) {
            out.temp = temp;
            if (temp < 10 || temp > 32) avisos.push('Temperatura fuera de 10–32 °C (límite habitual de ASTM C94 / NSR-10 para el concreto).');
        }
        return out;
    }
    /** Peso unitario del concreto fresco, rendimiento y aire gravimétrico (ASTM C138). */
    function concretoFresco(Mc, Mm, Vm, masaTanda, gammaTeorico) {
        if (![Mc, Mm, Vm].every(isNum) || Mc <= Mm || Vm <= 0) return { ok: false, error: 'Ingresa masa del recipiente lleno (mayor que la vacía) y su volumen.' };
        var gamma = (Mc - Mm) / Vm, out = { ok: true, avisos: [], gamma: gamma };
        if (gamma < 1800 || gamma > 2600) out.avisos.push('Peso unitario fuera de 1800–2600 kg/m³ (concreto normal): revisa unidades (kg y m³).');
        if (isNum(masaTanda) && masaTanda > 0) out.rendimiento = masaTanda / gamma;
        if (isNum(gammaTeorico) && gammaTeorico > 0) {
            out.aire = (gammaTeorico - gamma) / gammaTeorico * 100;
            if (out.aire < -1) out.avisos.push('Aire negativo: el peso unitario teórico es menor que el medido. Revisa Gs y humedades.');
        }
        return out;
    }

    /* =========================================================
       RESISTENCIA A COMPRESIÓN (ASTM C39 / NTC 673)
    ========================================================= */
    function factorLD(ld) {
        if (ld >= 1.75) return 1;
        var pts = [[1.0, 0.87], [1.25, 0.93], [1.5, 0.96], [1.75, 0.98]];
        if (ld < 1.0) return 0.87;
        return interp(pts, ld);
    }
    /** Factor de edad respecto a 28 d (ACI 209R, curado húmedo, cemento tipo I): f(t)/f28 */
    function factorEdad(t) {
        var b = function (x) { return x / (4 + 0.85 * x); };
        return b(t) / b(28);
    }
    /**
     * cil: [{d (mm), L (mm, opcional), P (kN)}], fcEsp (MPa), edad (d)
     */
    function compresionCilindros(cil, fcEsp, edad) {
        var vals = [], avisos = [];
        if (!cil || !cil.length) return { ok: false, error: 'No hay probetas.' };
        for (var i = 0; i < cil.length; i++) {
            var c = cil[i];
            if (!isNum(c.d) || !isNum(c.P) || c.d <= 0 || c.P <= 0) return { ok: false, error: 'Probeta ' + (i + 1) + ': diámetro y carga deben ser positivos.' };
            var A = Math.PI * c.d * c.d / 4;
            var f = c.P * 1000 / A, fac = 1;
            if (isNum(c.L) && c.L > 0) {
                var ld = c.L / c.d;
                if (ld < 1.75) { fac = factorLD(ld); avisos.push('Probeta ' + (i + 1) + ': L/D = ' + round(ld, 2) + ' < 1.75, se aplicó factor de corrección ' + round(fac, 3) + '.'); }
                if (ld < 1.0 || ld > 2.2) avisos.push('Probeta ' + (i + 1) + ': L/D fuera de 1.0–2.2: el resultado no es confiable (ASTM C39).');
            }
            vals.push({ n: i + 1, d: c.d, A: A, P: c.P, f: f * fac, fSinCorr: f, fac: fac });
        }
        var n = vals.length, mean = vals.reduce(function (a, v) { return a + v.f; }, 0) / n;
        var sd = n > 1 ? Math.sqrt(vals.reduce(function (a, v) { return a + Math.pow(v.f - mean, 2); }, 0) / (n - 1)) : null;
        var cv = sd != null ? sd / mean * 100 : null;
        var rango = null;
        if (n >= 2) {
            var fs = vals.map(function (v) { return v.f; });
            rango = (Math.max.apply(null, fs) - Math.min.apply(null, fs)) / mean * 100;
            if (n === 2 && rango > 8.0) avisos.push('Diferencia entre 2 cilindros de la misma tanda = ' + round(rango, 1) + ' % (> 8.0 %, rango aceptable de ASTM C39 en condiciones de obra para cilindros de 150 mm).');
            if (n >= 3 && rango > 9.5) avisos.push('Rango entre ' + n + ' cilindros = ' + round(rango, 1) + ' % (> 9.5 %, ASTM C39 en condiciones de obra para 3 cilindros): revisa moldeo, curado y refrentado.');
        }
        var out = { ok: true, avisos: avisos, cil: vals, media: mean, sd: sd, cv: cv, rango: rango, n: n };
        if (isNum(edad) && edad > 0) {
            out.edad = edad;
            out.f28 = mean / factorEdad(edad);
            out.factorEdad = factorEdad(edad);
        }
        if (isNum(fcEsp) && fcEsp > 0) {
            out.fcEsp = fcEsp;
            var tolMin = fcEsp <= 35 ? fcEsp - 3.5 : 0.90 * fcEsp;
            out.minimoIndividual = tolMin;
            out.minIndOk = vals.every(function (v) { return v.f >= tolMin; });
            out.mediaOk = mean >= fcEsp;
            out.cumple = out.minIndOk && out.mediaOk;
            out.relacion = mean / fcEsp * 100;
        }
        return out;
    }

    /* =========================================================
       Modelo del simulador de compresión (didáctico)
    ========================================================= */
    function modeloCompresion(ac, edad, rate) {
        var f28 = resistenciaPorAC(ac);
        var ft = f28 * factorEdad(edad);
        var vel = (isNum(rate) && rate > 0) ? rate : 0.25;
        var fAp = ft * (1 + 0.06 * (Math.log(vel / 0.25) / Math.LN10));
        var Ec = 4700 * Math.sqrt(fAp);
        var e0 = 2 * fAp / Ec;
        return { f28: f28, ft: ft, fc: fAp, Ec: Ec, e0: e0 };
    }

    /* =========================================================
       Combinación de agregados (Fuller / Bolomey)
    ========================================================= */
    function curvaObjetivo(d, D, tipo) {
        var base = Math.sqrt(Math.min(d, D) / D);
        if (tipo === 'bolomey') return 10 + 90 * base;
        return 100 * base;
    }
    function combinar(pasaFino, pasaGrueso, fFino) {
        return pasaFino.map(function (v, i) { return fFino * v + (1 - fFino) * pasaGrueso[i]; });
    }
    function errorCombinacion(pasa, aberturas, D, tipo) {
        var s = 0, n = 0;
        for (var i = 0; i < aberturas.length; i++) {
            if (aberturas[i] > D) continue;
            var d = curvaObjetivo(aberturas[i], D, tipo) - pasa[i];
            s += d * d; n++;
        }
        return n ? Math.sqrt(s / n) : 0;
    }

    var api = {
        isNum: isNum, clamp: clamp, round: round, interp: interp, interpInv: interpInv,
        ACI: ACI, TAMICES: TAMICES, SERIE_MF: SERIE_MF, LIMITES_C33_FINO: LIMITES_C33_FINO,
        JUEGO_FINO: JUEGO_FINO, JUEGO_GRUESO: JUEGO_GRUESO, etiquetaTamiz: etiquetaTamiz,
        aguaACI: aguaACI, slumpDesdeAgua: slumpDesdeAgua, fcrequerida: fcrequerida,
        acPorResistencia: acPorResistencia, resistenciaPorAC: resistenciaPorAC, volumenGrueso: volumenGrueso,
        disenoACI: disenoACI, granulometria: granulometria,
        gravedadFino: gravedadFino, gravedadGrueso: gravedadGrueso,
        pesoUnitarioAgregado: pesoUnitarioAgregado, humedadAgregado: humedadAgregado,
        claseAsentamiento: claseAsentamiento, revenimiento: revenimiento, concretoFresco: concretoFresco,
        factorLD: factorLD, factorEdad: factorEdad, compresionCilindros: compresionCilindros,
        modeloCompresion: modeloCompresion,
        curvaObjetivo: curvaObjetivo, combinar: combinar, errorCombinacion: errorCombinacion
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    root.MezclasCalc = api;
})(typeof window !== 'undefined' ? window : globalThis);
