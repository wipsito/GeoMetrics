/* =========================================================
   GeoMetrics — Mecánica de Suelos I
   Motor de cálculo sin DOM (ensayos de laboratorio)
   Se puede usar en el navegador (window.Suelos1Calc) o en Node
   (require('./js/suelos1-calc.js')) para pruebas.
   ========================================================= */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.Suelos1Calc = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {
    'use strict';

    var API = {};

    /* ---------- utilidades numéricas ---------- */
    function num(v) {
        if (v == null || v === '') return NaN;
        if (typeof v === 'number') return isFinite(v) ? v : NaN;
        var s = String(v).trim().replace(/\s/g, '').replace(',', '.');
        if (s === '') return NaN;
        var n = parseFloat(s);
        return isFinite(n) ? n : NaN;
    }
    function round(v, d) {
        if (v == null || !isFinite(v)) return null;
        var f = Math.pow(10, d == null ? 2 : d);
        return Math.round(v * f) / f;
    }
    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
    function mean(a) { return a.reduce(function (s, v) { return s + v; }, 0) / a.length; }
    function fmt(v, d) {
        if (v == null || !isFinite(v)) return '—';
        return Number(v).toFixed(d == null ? 2 : d);
    }
    API.num = num;
    API.round = round;
    API.fmt = fmt;

    /** Resuelve un sistema 3×3 por eliminación gaussiana. */
    function solve3(M) {
        var a = M.map(function (row) { return row.slice(); });
        for (var i = 0; i < 3; i++) {
            var p = i;
            for (var k = i + 1; k < 3; k++) if (Math.abs(a[k][i]) > Math.abs(a[p][i])) p = k;
            if (Math.abs(a[p][i]) < 1e-14) return null;
            var tmp = a[i]; a[i] = a[p]; a[p] = tmp;
            var piv = a[i][i];
            for (var j = i; j < 4; j++) a[i][j] /= piv;
            for (var r = 0; r < 3; r++) {
                if (r === i) continue;
                var f = a[r][i];
                if (!f) continue;
                for (var c = i; c < 4; c++) a[r][c] -= f * a[i][c];
            }
        }
        return [a[0][3], a[1][3], a[2][3]];
    }

    /** Ajuste cuadrático y = a·x² + b·x + c. */
    function fitQuad(xs, ys) {
        var n = xs.length;
        if (n < 3) return null;
        var S0 = n, S1 = 0, S2 = 0, S3 = 0, S4 = 0, T0 = 0, T1 = 0, T2 = 0;
        for (var i = 0; i < n; i++) {
            var x = xs[i], y = ys[i], x2 = x * x;
            S1 += x; S2 += x2; S3 += x2 * x; S4 += x2 * x2;
            T0 += y; T1 += x * y; T2 += x2 * y;
        }
        var sol = solve3([
            [S0, S1, S2, T0],
            [S1, S2, S3, T1],
            [S2, S3, S4, T2]
        ]);
        if (!sol) return null;
        var c = sol[0], b = sol[1], a = sol[2];
        var sy = 0, sse = 0, m = T0 / n;
        for (var k = 0; k < n; k++) {
            var yk = ys[k], fit = a * xs[k] * xs[k] + b * xs[k] + c;
            sy += (yk - m) * (yk - m);
            sse += (yk - fit) * (yk - fit);
        }
        return { a: a, b: b, c: c, r2: sy > 0 ? 1 - sse / sy : 1 };
    }

    /** Ajuste lineal y = m·x + b. */
    function fitLine(xs, ys) {
        var n = xs.length, sx = 0, sy = 0, sxy = 0, sx2 = 0;
        for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxy += xs[i] * ys[i]; sx2 += xs[i] * xs[i]; }
        var den = n * sx2 - sx * sx;
        if (Math.abs(den) < 1e-14) return null;
        var m = (n * sxy - sx * sy) / den, b = (sy - m * sx) / n;
        var ym = sy / n, sse = 0, sst = 0;
        for (var k = 0; k < n; k++) {
            var f = m * xs[k] + b;
            sse += (ys[k] - f) * (ys[k] - f);
            sst += (ys[k] - ym) * (ys[k] - ym);
        }
        return { m: m, b: b, r2: sst > 0 ? 1 - sse / sst : 1 };
    }

    /* ---------- agua y gravedad específica ---------- */
    var RHO_W20 = 0.998207;
    var RHO_TABLA = [[10, 0.999703], [15, 0.999103], [20, 0.998207], [25, 0.997047], [30, 0.995650]];
    function rhoAgua(t) {
        if (!isFinite(t)) return RHO_W20;
        if (t <= RHO_TABLA[0][0]) return RHO_TABLA[0][1];
        if (t >= RHO_TABLA[RHO_TABLA.length - 1][0]) return RHO_TABLA[RHO_TABLA.length - 1][1];
        for (var i = 0; i < RHO_TABLA.length - 1; i++) {
            var a = RHO_TABLA[i], b = RHO_TABLA[i + 1];
            if (t >= a[0] && t <= b[0]) {
                var f = (t - a[0]) / (b[0] - a[0]);
                return a[1] + f * (b[1] - a[1]);
            }
        }
        return RHO_W20;
    }
    API.rhoAgua = rhoAgua;

    /* =========================================================
       1. CONTENIDO DE HUMEDAD — ASTM D2216 / NTC 1495
       ========================================================= */
    API.humedad = function (filas, opciones) {
        opciones = opciones || {};
        var tol = isFinite(opciones.tolerancia) ? opciones.tolerancia : 0.5;
        var validas = [], errores = [];
        (filas || []).forEach(function (f, i) {
            var tara = num(f.tara), humeda = num(f.humeda), seca = num(f.seca);
            if (!isFinite(tara) && !isFinite(humeda) && !isFinite(seca)) return;
            if (!isFinite(tara) || !isFinite(humeda) || !isFinite(seca)) {
                errores.push('Determinación ' + (i + 1) + ': completa tara, masa húmeda y masa seca.');
                return;
            }
            if (tara < 0 || humeda <= 0 || seca <= 0) {
                errores.push('Determinación ' + (i + 1) + ': las masas deben ser positivas.');
                return;
            }
            if (humeda <= seca) {
                errores.push('Determinación ' + (i + 1) + ': la masa húmeda debe ser mayor que la seca. Revisa el secado.');
                return;
            }
            if (seca <= tara) {
                errores.push('Determinación ' + (i + 1) + ': la masa seca debe ser mayor que la tara.');
                return;
            }
            var agua = humeda - seca;
            var suelo = seca - tara;
            validas.push({
                n: i + 1, tara: tara, humeda: humeda, seca: seca,
                agua: agua, suelo: suelo, w: agua / suelo * 100
            });
        });
        if (errores.length) return { ok: false, error: errores[0] };
        if (!validas.length) return { ok: false, error: 'Ingresa al menos una determinación completa (tara, masa húmeda y masa seca).' };
        var ws = validas.map(function (v) { return v.w; });
        var promedio = mean(ws);
        var rango = ws.length > 1 ? Math.max.apply(null, ws) - Math.min.apply(null, ws) : 0;
        var avisos = [];
        if (ws.length < 2) avisos.push('La norma recomienda determinar la humedad por duplicado. Este resultado proviene de una sola determinación.');
        if (ws.length > 1 && rango > tol) avisos.push('Las determinaciones difieren ' + fmt(rango, 2) + ' % (tolerancia orientativa ' + fmt(tol, 1) + ' %). Revisa el secado y repite el ensayo.');
        if (promedio < 0) avisos.push('El contenido de humedad resultó negativo: verifica la tara y el orden de las masas.');
        return {
            ok: true, filas: validas, promedio: promedio, rango: rango, n: validas.length,
            min: Math.min.apply(null, ws), max: Math.max.apply(null, ws), avisos: avisos
        };
    };

    /* =========================================================
       2. GRAVEDAD ESPECÍFICA — ASTM D854 / D854 (picnómetro)
       ========================================================= */
    API.gravedad = function (d) {
        d = d || {};
        var metodo = d.metodo === 'grueso' ? 'grueso' : 'fino';
        var t = num(d.temperatura);
        var k = isFinite(t) ? rhoAgua(t) / RHO_W20 : 1;
        var A = num(d.a), B = num(d.b), Cc = num(d.c), S = num(d.s);
        var avisos = [];
        if (!isFinite(A) || !isFinite(B) || !isFinite(Cc)) {
            return { ok: false, error: 'Completa las tres masas del método seleccionado.' };
        }
        if (A <= 0 || B <= 0 || Cc <= 0) return { ok: false, error: 'Las masas deben ser positivas.' };
        var den, gsT, gsSSS = null, absorcion = null, vs;
        if (metodo === 'fino') {
            if (Cc <= B) return { ok: false, error: 'La masa «picnómetro + suelo + agua» debe ser mayor que «picnómetro + agua». Revisa la eliminación de burbujas.' };
            den = A + B - Cc;
            if (den <= 0) return { ok: false, error: 'El denominador es ≤ 0. Revisa las masas: A + B − C debe ser positivo.' };
            gsT = A / den;
            if (isFinite(S) && S > 0) {
                gsSSS = S / den;
                absorcion = (S - A) / A * 100;
            }
        } else {
            if (B <= Cc) return { ok: false, error: 'La masa saturada en aire debe ser mayor que la sumergida.' };
            den = B - Cc;
            gsT = A / den;
            gsSSS = B / den;
            absorcion = (B - A) / A * 100;
        }
        var gs = gsT * k;
        vs = A / gs;
        if (gs < 2.0) avisos.push('Gs < 2.0: posible presencia de materia orgánica, ceniza o partículas livianas. Verifica el ensayo.');
        else if (gs < 2.55) avisos.push('Gs por debajo del rango típico de suelos minerales (2.55 – 2.80). Revisa burbujas o pesajes.');
        else if (gs > 2.90) avisos.push('Gs > 2.90: poco común en suelos; puede indicar minerales pesados o un error de pesaje.');
        if (isFinite(t) && (t < 15 || t > 30)) avisos.push('La temperatura del agua está fuera del intervalo habitual de laboratorio (15 – 30 °C).');
        if (!isFinite(t)) avisos.push('No se ingresó temperatura: se asumió corrección a 20 °C igual a 1.000.');
        if (metodo === 'fino' && !isFinite(S)) avisos.push('Sin masa saturada superficialmente seca no se puede calcular la absorción.');
        var tipo = gs < 2.0 ? 'Material orgánico / liviano' : gs < 2.55 ? 'Por debajo del rango típico' : gs < 2.70 ? 'Arena / grava silícea' : gs < 2.80 ? 'Arcilla / minerales comunes' : 'Minerales pesados o suelo especial';
        return {
            ok: true, metodo: metodo, gs: gs, gsT: gsT, gsSSS: gsSSS, absorcion: absorcion,
            ms: A, vs: vs, den: den, kTemp: k, temperatura: isFinite(t) ? t : 20,
            tipo: tipo, rango: '2.55 – 2.80 típico', avisos: avisos
        };
    };

    /* =========================================================
       3. GRANULOMETRÍA — ASTM D6913 / NTC 1527
       ========================================================= */
    var MALLAS = [
        { mm: 75.0, label: '3"' }, { mm: 63.0, label: '2½"' }, { mm: 50.8, label: '2"' },
        { mm: 38.1, label: '1½"' }, { mm: 25.4, label: '1"' }, { mm: 19.1, label: '¾"' },
        { mm: 12.7, label: '½"' }, { mm: 9.52, label: '⅜"' }, { mm: 4.75, label: 'N.º 4' },
        { mm: 2.36, label: 'N.º 8' }, { mm: 2.00, label: 'N.º 10' }, { mm: 1.18, label: 'N.º 16' },
        { mm: 0.850, label: 'N.º 20' }, { mm: 0.600, label: 'N.º 30' }, { mm: 0.425, label: 'N.º 40' },
        { mm: 0.300, label: 'N.º 50' }, { mm: 0.250, label: 'N.º 60' }, { mm: 0.180, label: 'N.º 80' },
        { mm: 0.150, label: 'N.º 100' }, { mm: 0.106, label: 'N.º 140' }, { mm: 0.075, label: 'N.º 200' }
    ];
    API.MALLAS = MALLAS;
    API.etiquetaMalla = function (mm) {
        for (var i = 0; i < MALLAS.length; i++) if (Math.abs(MALLAS[i].mm - mm) < 1e-9) return MALLAS[i].label;
        return mm + ' mm';
    };

    function interpLogD(puntos, p) {
        // puntos ordenados por d ascendente; % pasa desciende al aumentar d
        var pts = puntos.filter(function (x) { return x.d > 0 && isFinite(x.pasa); });
        if (pts.length < 2) return null;
        for (var i = 0; i < pts.length; i++) if (Math.abs(pts[i].pasa - p) < 1e-9) return pts[i].d;
        for (var k = 0; k < pts.length - 1; k++) {
            var a = pts[k], b = pts[k + 1];
            var hi = Math.max(a.pasa, b.pasa), lo = Math.min(a.pasa, b.pasa);
            if (p <= hi && p >= lo) {
                var t = (p - a.pasa) / (b.pasa - a.pasa);
                var d = Math.pow(10, Math.log10(a.d) + t * (Math.log10(b.d) - Math.log10(a.d)));
                return isFinite(d) && d > 0 ? d : null;
            }
        }
        return null;
    }

    API.granulometria = function (d) {
        d = d || {};
        var m0 = num(d.m0);
        if (!isFinite(m0) || m0 <= 0) return { ok: false, error: 'Ingresa una masa seca inicial M₀ mayor que cero.' };
        var filas = (d.filas || []).filter(function (f) { return isFinite(num(f.masa)) || num(f.masa) === 0; })
            .map(function (f) { return { mm: num(f.mm), label: f.label || API.etiquetaMalla(num(f.mm)), masa: num(f.masa) }; });
        filas = filas.filter(function (f) { return isFinite(f.mm) && f.mm > 0 && isFinite(f.masa) && f.masa >= 0; });
        if (filas.length < 2) return { ok: false, error: 'Selecciona al menos dos tamices e ingresa las masas retenidas.' };
        filas.sort(function (a, b) { return b.mm - a.mm; });
        var suma = filas.reduce(function (s, f) { return s + f.masa; }, 0);
        var fondo = num(d.fondo);
        if (!isFinite(fondo)) fondo = m0 - suma;
        if (fondo < 0) return { ok: false, error: 'La suma de retenidos supera la masa inicial. Revisa las masas o el fondo.' };
        var total = suma + fondo;
        var perdida = (total - m0) / m0 * 100;
        var avisos = [];
        if (Math.abs(perdida) > 0.3) avisos.push('La suma de retenidos + fondo difiere de M₀ en ' + fmt(perdida, 2) + ' % (límite orientativo 0.3 %). Revisa pesajes y pérdida de material.');
        var acum = 0, tabla = [];
        filas.forEach(function (f) {
            acum += f.masa;
            var pctRet = f.masa / m0 * 100;
            var pctAcum = acum / m0 * 100;
            tabla.push({
                label: f.label, mm: f.mm, masa: f.masa, pctRet: pctRet,
                pctAcum: pctAcum, pctPasa: clamp(100 - pctAcum, 0, 100)
            });
        });
        var pFondo = fondo / m0 * 100;
        tabla.push({
            label: 'Fondo', mm: 0, masa: fondo, pctRet: pFondo,
            pctAcum: clamp((acum + fondo) / m0 * 100, 0, 100), pctPasa: 0
        });

        var puntos = filas.map(function (f, i) {
            return { d: f.mm, pasa: tabla[i].pctPasa, label: f.label };
        }).sort(function (a, b) { return a.d - b.d; });

        var D10 = interpLogD(puntos, 10);
        var D30 = interpLogD(puntos, 30);
        var D60 = interpLogD(puntos, 60);
        var Cu = D10 && D60 ? D60 / D10 : null;
        var Cc = D10 && D30 && D60 ? (D30 * D30) / (D10 * D60) : null;
        if (!D10) avisos.push('No se pudo interpolar D₁₀: la curva no cruza el 10 % que pasa dentro de los tamices ensayados.');
        if (!D30) avisos.push('No se pudo interpolar D₃₀: faltan tamices en la zona intermedia de la curva.');
        if (!D60) avisos.push('No se pudo interpolar D₆₀: la curva no cruza el 60 % que pasa dentro de los tamices ensayados.');

        var grav = 0, finos = null, tiene200 = false;
        filas.forEach(function (f) {
            if (f.mm >= 4.75) grav += f.masa;
            if (Math.abs(f.mm - 0.075) < 1e-9) tiene200 = true;
        });
        var p200Idx = -1;
        for (var i = 0; i < tabla.length; i++) if (Math.abs(tabla[i].mm - 0.075) < 1e-9) p200Idx = i;
        if (p200Idx >= 0) finos = tabla[p200Idx].pctPasa;
        else avisos.push('No se incluyó el tamiz N.º 200: no se puede determinar el porcentaje de finos ni clasificar por SUCS con precisión.');
        var grava = grav / m0 * 100;
        var arena = finos == null ? 100 - grava : Math.max(0, 100 - grava - finos);
        if (!tiene200) finos = null;
        var p4 = 100 - grava;

        var ll = num(d.ll), lp = num(d.lp), ip = num(d.ip);
        if (!isFinite(ip) && isFinite(ll) && isFinite(lp)) ip = ll - lp;
        var sucs = null;
        if (finos != null) {
            sucs = API.clasificarSUCS({ p200: finos, p4: p4, ll: ll, lp: lp, ip: ip, cu: Cu, cc: Cc });
            if (sucs && sucs.avisos) sucs.avisos.forEach(function (a) { avisos.push(a); });
        }
        return {
            ok: true, tabla: tabla, m0: m0, suma: suma, fondo: fondo, total: total,
            perdida: perdida, D10: D10, D30: D30, D60: D60, Cu: Cu, Cc: Cc,
            grava: grava, arena: arena, finos: finos, p4: p4, puntos: puntos,
            sucs: sucs, avisos: avisos
        };
    };

    /* =========================================================
       4. LÍMITES DE ATTERBERG — ASTM D4318 / NTC 4630
       ========================================================= */
    function clasificarFino(ll, lp) {
        var ip = ll - lp;
        var lineaA = 0.73 * (ll - 20);
        var simbolo, nombre, criterio;
        if (ll < 50) {
            if (ip < 4) { simbolo = 'ML'; nombre = 'Limo de baja plasticidad'; criterio = 'LL < 50 e IP < 4'; }
            else if (ip <= 7 && ip >= lineaA) { simbolo = 'CL-ML'; nombre = 'Arcilla limosa / limo arcilloso de baja plasticidad'; criterio = 'LL < 50, 4 ≤ IP ≤ 7 y sobre la línea A'; }
            else if (ip >= lineaA) { simbolo = 'CL'; nombre = 'Arcilla de baja plasticidad'; criterio = 'LL < 50 e IP sobre la línea A'; }
            else { simbolo = 'ML'; nombre = 'Limo de baja plasticidad'; criterio = 'LL < 50 e IP bajo la línea A'; }
        } else {
            if (ip >= lineaA) { simbolo = 'CH'; nombre = 'Arcilla de alta plasticidad'; criterio = 'LL ≥ 50 e IP sobre la línea A'; }
            else { simbolo = 'MH'; nombre = 'Limo de alta plasticidad (limo elástico)'; criterio = 'LL ≥ 50 e IP bajo la línea A'; }
        }
        return { simbolo: simbolo, nombre: nombre, criterio: criterio, ip: ip, lineaA: lineaA };
    }
    API.clasificarFino = clasificarFino;

    API.limites = function (d) {
        d = d || {};
        var pts = (d.puntos || []).map(function (p) {
            return { n: num(p.n), w: num(p.w) };
        }).filter(function (p) { return isFinite(p.n) && isFinite(p.w); });
        if (pts.length < 3) return { ok: false, error: 'Ingresa al menos tres puntos de golpes y humedad para ajustar la curva de fluidez.' };
        if (pts.some(function (p) { return p.n <= 0 || p.w <= 0; })) return { ok: false, error: 'Los golpes y las humedades deben ser mayores que cero.' };
        var ns = pts.map(function (p) { return p.n; });
        if (Math.max.apply(null, ns) - Math.min.apply(null, ns) < 1) return { ok: false, error: 'Los números de golpes deben ser distintos para ajustar la recta.' };
        var xs = pts.map(function (p) { return Math.log10(p.n); });
        var ys = pts.map(function (p) { return p.w; });
        var fit = fitLine(xs, ys);
        if (!fit) return { ok: false, error: 'No se pudo ajustar la curva de fluidez. Revisa los datos.' };
        var ll = fit.m * Math.log10(25) + fit.b;
        var iflow = -fit.m;
        var lpVals = (d.lpValores || []).map(num).filter(function (v) { return isFinite(v); });
        var lp = lpVals.length ? mean(lpVals) : num(d.lp);
        var ip = isFinite(lp) ? ll - lp : null;
        var wn = num(d.wn);
        var avisos = [];
        if (ll <= 0) avisos.push('El LL calculado es ≤ 0: los datos no son consistentes.');
        if (ll > 100) avisos.push('El LL calculado supera 100 %: revisa las humedades y los golpes.');
        if (fit.r2 < 0.98) avisos.push('R² = ' + fmt(fit.r2, 3) + ': la curva de fluidez no es suficientemente lineal. Revisa los puntos o repite el ensayo.');
        if (Math.min.apply(null, ns) > 20 && Math.max.apply(null, ns) < 30) avisos.push('Los puntos están muy agrupados alrededor de 25 golpes: la extrapolación puede ser inestable.');
        if (Math.max.apply(null, ns) - Math.min.apply(null, ns) < 5) avisos.push('El intervalo de golpes es estrecho (< 5). La norma sugiere puntos entre 10 y 40 golpes.');
        if (!isFinite(lp)) avisos.push('No se ingresó el límite plástico: solo se reporta LL y la curva de fluidez.');
        else if (ip < 0) avisos.push('El IP resultó negativo (LP > LL). Revisa las determinaciones de LP.');
        else if (ip > 7 && ll > 50 && ip < 0.73 * (ll - 20)) avisos.push('El punto cae bajo la línea A con LL ≥ 50: verifica si el suelo es realmente limoso (MH).');
        var clasif = isFinite(lp) ? clasificarFino(ll, lp) : null;
        var li = (isFinite(wn) && isFinite(lp) && ip > 0) ? (wn - lp) / ip : null;
        var consistencia = null;
        if (li != null) {
            if (li < 0) consistencia = 'Sólido (w < LP)';
            else if (li < 0.25) consistencia = 'Semisólido / muy rígido';
            else if (li < 0.5) consistencia = 'Rígido';
            else if (li < 0.75) consistencia = 'Medio';
            else if (li <= 1) consistencia = 'Blando';
            else consistencia = 'Líquido (w > LL)';
        }
        return {
            ok: true, puntos: pts, m: fit.m, b: fit.b, r2: fit.r2, ll: ll, lp: isFinite(lp) ? lp : null,
            ip: ip, if: iflow, clasif: clasif, li: li, consistencia: consistencia,
            lpValores: lpVals, avisos: avisos
        };
    };

    /* =========================================================
       5. CLASIFICACIÓN SUCS — ASTM D2487
       ========================================================= */
    function nombreGrueso(sim) {
        var map = {
            GW: 'Grava bien graduada', GP: 'Grava mal graduada', GM: 'Grava limosa', GC: 'Grava arcillosa',
            SW: 'Arena bien graduada', SP: 'Arena mal graduada', SM: 'Arena limosa', SC: 'Arena arcillosa',
            'GW-GM': 'Grava bien graduada con limo', 'GW-GC': 'Grava bien graduada con arcilla',
            'GP-GM': 'Grava mal graduada con limo', 'GP-GC': 'Grava mal graduada con arcilla',
            'SW-SM': 'Arena bien graduada con limo', 'SW-SC': 'Arena bien graduada con arcilla',
            'SP-SM': 'Arena mal graduada con limo', 'SP-SC': 'Arena mal graduada con arcilla'
        };
        return map[sim] || sim;
    }

    API.clasificarSUCS = function (d) {
        d = d || {};
        var p200 = num(d.p200), p4 = num(d.p4), ll = num(d.ll), lp = num(d.lp), ip = num(d.ip);
        if (!isFinite(p200)) return { ok: false, error: 'Ingresa el porcentaje que pasa el tamiz N.º 200.' };
        if (p200 < 0 || p200 > 100) return { ok: false, error: 'El porcentaje que pasa N.º 200 debe estar entre 0 y 100.' };
        if (!isFinite(p4)) p4 = 100;
        if (p4 < 0 || p4 > 100) return { ok: false, error: 'El porcentaje que pasa N.º 4 debe estar entre 0 y 100.' };
        if (p4 < p200) return { ok: false, error: 'El porcentaje que pasa N.º 4 no puede ser menor que el que pasa N.º 200.' };
        var grava = 100 - p4, arena = p4 - p200, finos = p200;
        var cu = num(d.cu), cc = num(d.cc);
        if (!isFinite(ip) && isFinite(ll) && isFinite(lp)) ip = ll - lp;
        var avisos = [], grupo, simbolo, nombre, criterios = [];

        function finosClasif() {
            if (!isFinite(ll) || !isFinite(lp) && !isFinite(ip)) return null;
            if (!isFinite(lp) && isFinite(ip)) lp = ll - ip;
            return clasificarFino(ll, lp);
        }

        if (finos >= 50) {
            grupo = 'Suelo fino';
            var cf = finosClasif();
            if (!cf) return { ok: false, error: 'Para un suelo fino (≥ 50 % pasa N.º 200) se requieren LL y LP.' };
            simbolo = cf.simbolo;
            nombre = cf.nombre;
            criterios.push('Más del 50 % pasa el tamiz N.º 200 (finos = ' + fmt(finos, 1) + ' %).');
            criterios.push('LL = ' + fmt(ll, 1) + ' %, LP = ' + fmt(lp, 1) + ' %, IP = ' + fmt(ip, 1) + ' %.');
            criterios.push(cf.criterio + ' (línea A: IP = ' + fmt(cf.lineaA, 1) + ').');
            if (cf.simbolo === 'CL-ML') avisos.push('La zona CL-ML es estrecha: confirma con ensayos adicionales y la descripción del suelo.');
        } else {
            grupo = 'Suelo grueso';
            var esGrava = grava >= arena;
            var base = esGrava ? 'G' : 'S';
            criterios.push('Menos del 50 % pasa N.º 200 (finos = ' + fmt(finos, 1) + ' %).');
            criterios.push('Grava = ' + fmt(grava, 1) + ' %, arena = ' + fmt(arena, 1) + ' % ⇒ predomina ' + (esGrava ? 'la grava' : 'la arena') + '.');
            if (finos < 5) {
                if (!isFinite(cu) || !isFinite(cc)) {
                    avisos.push('Con menos de 5 % de finos se requieren Cu y Cc para decidir W o P. Se reporta el grupo tentativo ' + (esGrava ? 'GP' : 'SP') + '.');
                    simbolo = base + 'P';
                } else {
                    var bien = esGrava ? (cu >= 4 && cc >= 1 && cc <= 3) : (cu >= 6 && cc >= 1 && cc <= 3);
                    simbolo = base + (bien ? 'W' : 'P');
                    criterios.push('Cu = ' + fmt(cu, 2) + ', Cc = ' + fmt(cc, 2) + ' ⇒ ' + (bien ? 'bien graduada' : 'mal graduada') + '.');
                    if (bien) criterios.push(esGrava ? 'Grava bien graduada: Cu ≥ 4 y 1 ≤ Cc ≤ 3.' : 'Arena bien graduada: Cu ≥ 6 y 1 ≤ Cc ≤ 3.');
                }
            } else if (finos > 12) {
                var cg = finosClasif();
                if (!cg) {
                    avisos.push('Con más de 12 % de finos se requieren LL y LP. Se reporta el grupo tentativo ' + base + 'M.');
                    simbolo = base + 'M';
                } else {
                    var letra = (cg.simbolo === 'CL' || cg.simbolo === 'CH' || cg.simbolo === 'CL-ML') ? 'C' : 'M';
                    simbolo = base + letra;
                    criterios.push('Finos clasificados como ' + cg.simbolo + ' (' + cg.nombre + ') ⇒ componente ' + (letra === 'C' ? 'arcilloso' : 'limoso') + '.');
                }
            } else {
                var cb = finosClasif();
                if (!cb) {
                    avisos.push('Entre 5 y 12 % de finos se requiere clasificar los finos (LL y LP). Se reporta el grupo tentativo ' + base + 'P.');
                    simbolo = base + 'P';
                } else {
                    var letra2 = (cb.simbolo === 'CL' || cb.simbolo === 'CH' || cb.simbolo === 'CL-ML') ? 'C' : 'M';
                    var limpio = base + (isFinite(cu) && isFinite(cc) ? ((esGrava ? (cu >= 4 && cc >= 1 && cc <= 3) : (cu >= 6 && cc >= 1 && cc <= 3)) ? 'W' : 'P') : 'P');
                    simbolo = limpio + '-' + base + letra2;
                    criterios.push('Finos entre 5 y 12 %: se usa doble símbolo (' + limpio + '-' + base + letra2 + ').');
                }
            }
            nombre = nombreGrueso(simbolo);
            if (finos >= 5 && finos <= 12) avisos.push('El suelo está en la transición 5 – 12 % de finos: reporta el doble símbolo y verifica la proporción de grava/arena.');
        }
        if (isFinite(cu)) criterios.push('Cu = ' + fmt(cu, 2) + (cu >= 4 ? ' (uniformidad alta)' : ' (uniformidad baja)') + '.');
        if (isFinite(cc)) criterios.push('Cc = ' + fmt(cc, 2) + (cc >= 1 && cc <= 3 ? ' (curvatura adecuada)' : ' (fuera de 1 – 3)') + '.');
        return {
            ok: true, simbolo: simbolo, nombre: nombre, grupo: grupo, criterios: criterios,
            grava: grava, arena: arena, finos: finos, p4: p4, p200: p200,
            ll: isFinite(ll) ? ll : null, lp: isFinite(lp) ? lp : null, ip: isFinite(ip) ? ip : null,
            cu: isFinite(cu) ? cu : null, cc: isFinite(cc) ? cc : null, avisos: avisos
        };
    };

    /* =========================================================
       6. COMPACTACIÓN PROCTOR — ASTM D698 / D1557
       ========================================================= */
    API.compactacion = function (d) {
        d = d || {};
        var molde = num(d.molde), vol = num(d.vol);
        if (!isFinite(molde) || molde <= 0) return { ok: false, error: 'Ingresa la masa del molde (g).' };
        if (!isFinite(vol) || vol <= 0) return { ok: false, error: 'Ingresa el volumen del molde (cm³).' };
        var puntos = (d.puntos || []).map(function (p, i) {
            var masa = num(p.masa), w = num(p.w);
            if (!isFinite(masa) && !isFinite(w)) return null;
            if (!isFinite(masa) || !isFinite(w)) return { error: 'Punto ' + (i + 1) + ': completa masa húmeda y humedad.' };
            if (w < 0 || masa <= molde) return { error: 'Punto ' + (i + 1) + ': la masa debe ser mayor que el molde y la humedad ≥ 0.' };
            var gh = (masa - molde) / vol;
            var gd = gh / (1 + w / 100);
            return { n: i + 1, masa: masa, w: w, gh: gh, gd: gd };
        }).filter(Boolean);
        var err = puntos.filter(function (p) { return p.error; });
        if (err.length) return { ok: false, error: err[0].error };
        if (puntos.length < 3) return { ok: false, error: 'Ingresa al menos tres puntos de compactación.' };
        var xs = puntos.map(function (p) { return p.w; });
        var ys = puntos.map(function (p) { return p.gd; });
        var fit = fitQuad(xs, ys);
        var metodo = d.metodo === 'modificado' ? 'modificado' : 'estandar';
        var gs = num(d.gs);
        var avisos = [];
        var wopt, gdmax, r2 = null, ajuste = 'medido';
        if (fit && fit.a < 0) {
            wopt = -fit.b / (2 * fit.a);
            gdmax = fit.c - fit.b * fit.b / (4 * fit.a);
            r2 = fit.r2;
            ajuste = 'cuadrático';
            if (r2 < 0.90) avisos.push('R² = ' + fmt(r2, 3) + ': la nube de puntos no se ajusta bien a una parábola. Revisa los datos.');
        } else {
            var maxP = puntos.reduce(function (b, p) { return p.gd > b.gd ? p : b; }, puntos[0]);
            wopt = maxP.w; gdmax = maxP.gd;
            avisos.push('No se pudo ajustar una parábola cóncava: se reporta el punto de mayor densidad medido. Agrega puntos alrededor del óptimo.');
        }
        var wMin = Math.min.apply(null, xs), wMax = Math.max.apply(null, xs);
        if (wopt < wMin || wopt > wMax) avisos.push('La humedad óptima calculada (' + fmt(wopt, 1) + ' %) cae fuera del intervalo ensayado (' + fmt(wMin, 1) + ' – ' + fmt(wMax, 1) + ' %). Agrega puntos.');
        if (puntos.length < 4) avisos.push('Se recomiendan al menos 4 o 5 puntos para definir la curva de compactación.');
        if (!isFinite(gs)) avisos.push('Sin gravedad específica no se dibuja la curva de saturación total (ZAV).');
        var curvaZav = [];
        var satOpt = null;
        if (isFinite(gs) && gs > 0) {
            var pasos = 40, w0 = Math.max(0, wMin - 2), w1 = wMax + 4;
            for (var i = 0; i <= pasos; i++) {
                var w = w0 + (w1 - w0) * i / pasos;
                curvaZav.push({ w: w, gd: gs * 1.0 / (1 + w * gs / 100) });
            }
            var eOpt = gs * 1.0 / gdmax - 1;
            if (eOpt > 0) satOpt = (wopt / 100) * gs / eOpt * 100;
            if (satOpt != null && satOpt > 100) avisos.push('La saturación calculada en el óptimo supera 100 %: revisa Gs o los datos.');
            if (wopt > 0 && wopt < w1) {
                var zavOpt = gs * 1.0 / (1 + wopt * gs / 100);
                if (gdmax > zavOpt * 1.02) avisos.push('La densidad seca máxima queda por encima de la curva ZAV: los datos son inconsistentes con el valor de Gs.');
            }
        }
        if (gdmax < 1.2 || gdmax > 2.4) avisos.push('La densidad seca máxima está fuera del rango habitual (1.2 – 2.4 g/cm³). Verifica molde, volumen y masas.');
        return {
            ok: true, puntos: puntos, molde: molde, vol: vol, wopt: wopt, gdmax: gdmax,
            gdmaxKn: gdmax * 9.81, r2: r2, ajuste: ajuste, metodo: metodo,
            energia: metodo === 'modificado' ? 2703 : 592.7,
            curva: { a: fit ? fit.a : null, b: fit ? fit.b : null, c: fit ? fit.c : null },
            curvaZav: curvaZav, satOpt: satOpt, gs: isFinite(gs) ? gs : null, avisos: avisos
        };
    };

    /* =========================================================
       7. DENSIDAD DE CAMPO — CONO DE ARENA (ASTM D1556)
       ========================================================= */
    API.densidadCampo = function (d) {
        d = d || {};
        var mi = num(d.mi), mf = num(d.mf), mcono = num(d.mcono);
        var darena = num(d.darena), msuelo = num(d.msuelo), w = num(d.w);
        var gdmax = num(d.gdmax);
        if (!isFinite(mi) || !isFinite(mf)) return { ok: false, error: 'Ingresa la masa inicial y final de arena en el frasco.' };
        if (!isFinite(darena) || darena <= 0) return { ok: false, error: 'Ingresa la densidad aparente seca de la arena patrón (g/cm³).' };
        if (!isFinite(msuelo) || msuelo <= 0) return { ok: false, error: 'Ingresa la masa del suelo húmedo extraído (g).' };
        if (!isFinite(w) || w < 0) return { ok: false, error: 'Ingresa el contenido de humedad del suelo extraído (%).' };
        if (!isFinite(mcono)) mcono = 0;
        var masaHoyo = mi - mf - mcono;
        if (masaHoyo <= 0) return { ok: false, error: 'La masa de arena en el hoyo es ≤ 0. Revisa las masas o la calibración del cono.' };
        var vol = masaHoyo / darena;
        var gh = msuelo / vol;
        var gd = gh / (1 + w / 100);
        var gc = isFinite(gdmax) && gdmax > 0 ? gd / gdmax * 100 : null;
        var avisos = [];
        if (!isFinite(gdmax)) avisos.push('No se ingresó la densidad seca máxima de Proctor: no se puede calcular el grado de compactación.');
        if (gc != null && gc < 95) avisos.push('Grado de compactación ' + fmt(gc, 1) + ' %: por debajo del 95 % típico de especificación. Revisa el proceso de compactación.');
        if (gc != null && gc > 105) avisos.push('Grado de compactación > 105 %: verifica la densidad máxima de referencia, la calibración de la arena y el volumen del hoyo.');
        if (vol < 300) avisos.push('El volumen del hoyo es pequeño (< 300 cm³): aumenta el tamaño para reducir el error experimental.');
        if (masaHoyo > mi) avisos.push('La masa de arena usada es mayor que la masa inicial: revisa la calibración del cono.');
        return {
            ok: true, masaHoyo: masaHoyo, vol: vol, gh: gh, gd: gd, gdKn: gd * 9.81,
            gc: gc, gdmax: isFinite(gdmax) ? gdmax : null, w: w, avisos: avisos
        };
    };

    /* =========================================================
       8. PERMEABILIDAD — CARGA CONSTANTE / VARIABLE
       ========================================================= */
    API.permeabilidad = function (d) {
        d = d || {};
        var metodo = d.metodo === 'variable' ? 'variable' : 'constante';
        var A = num(d.a), L = num(d.l), t = num(d.t), n = num(d.n);
        if (!isFinite(A) || A <= 0) return { ok: false, error: 'Ingresa el área de la muestra A (cm²).' };
        if (!isFinite(L) || L <= 0) return { ok: false, error: 'Ingresa la longitud de la muestra L (cm).' };
        if (!isFinite(t) || t <= 0) return { ok: false, error: 'Ingresa un tiempo de ensayo mayor que cero.' };
        var k, q, i, v;
        if (metodo === 'constante') {
            var Q = num(d.q), h = num(d.h);
            if (!isFinite(Q) || Q <= 0) return { ok: false, error: 'Ingresa el volumen de agua recolectado Q (cm³).' };
            if (!isFinite(h) || h <= 0) return { ok: false, error: 'Ingresa la carga hidráulica h (cm).' };
            q = Q / t;
            i = h / L;
            k = Q * L / (A * t * h);
            v = q / A;
        } else {
            var a = num(d.aTubo), h1 = num(d.h1), h2 = num(d.h2);
            if (!isFinite(a) || a <= 0) return { ok: false, error: 'Ingresa el área del tubo piezométrico a (cm²).' };
            if (!isFinite(h1) || !isFinite(h2) || h1 <= 0 || h2 <= 0) return { ok: false, error: 'Ingresa las cargas inicial y final (cm), mayores que cero.' };
            if (h1 <= h2) return { ok: false, error: 'La carga inicial h₁ debe ser mayor que la final h₂.' };
            k = (a * L) / (A * t) * Math.log(h1 / h2);
            q = k * A * (h1 - h2) / L;
            i = (h1 - h2) / L;
            v = q / A;
        }
        var vs = isFinite(n) && n > 0 && n <= 1 ? v / n : null;
        var tipo;
        if (k > 1e-2) tipo = 'Grava / material muy permeable';
        else if (k > 1e-3) tipo = 'Grava limpia o arena gruesa';
        else if (k > 1e-5) tipo = 'Arena';
        else if (k > 1e-7) tipo = 'Limo / mezcla limo-arcilla';
        else tipo = 'Arcilla (prácticamente impermeable)';
        var avisos = [];
        if (k > 1e-1) avisos.push('k > 0.1 cm/s: el flujo puede ser turbulento y la ley de Darcy dejar de ser válida.');
        if (i < 0.1) avisos.push('Gradiente hidráulico bajo (< 0.1): el error experimental aumenta.');
        if (i > 10) avisos.push('Gradiente hidráulico alto (> 10): puede producirse flujo preferencial o erosión interna.');
        if (metodo === 'variable' && t < 60) avisos.push('Ensayo corto (< 60 s): las lecturas de carga pueden tener mucho error.');
        return {
            ok: true, metodo: metodo, k: k, q: q, i: i, v: v, vs: vs,
            area: A, largo: L, tiempo: t, tipo: tipo, avisos: avisos
        };
    };

    /* =========================================================
       ESCALAS Y AYUDAS DIDÁCTICAS
       ========================================================= */
    API.escalaPermeabilidad = [
        { min: 1e-9, max: 1e-7, nombre: 'Arcilla', color: '#e0706b' },
        { min: 1e-7, max: 1e-5, nombre: 'Limo', color: '#e6b34a' },
        { min: 1e-5, max: 1e-3, nombre: 'Arena fina / media', color: '#5fb98a' },
        { min: 1e-3, max: 1e-1, nombre: 'Arena gruesa / grava', color: '#4d8fd9' }
    ];

    API.resumen = function (ensayo, r) {
        if (!r || !r.ok) return 'Sin resultado';
        switch (ensayo) {
            case 'humedad': return 'w = ' + fmt(r.promedio, 2) + ' %';
            case 'granulometria': return (r.sucs ? r.sucs.simbolo + ' · ' : '') + 'Grava ' + fmt(r.grava, 1) + ' % · Arena ' + fmt(r.arena, 1) + ' % · Finos ' + (r.finos == null ? '—' : fmt(r.finos, 1) + ' %');
            case 'limites': return 'LL = ' + fmt(r.ll, 1) + ' % · LP = ' + (r.lp == null ? '—' : fmt(r.lp, 1) + ' %') + ' · IP = ' + (r.ip == null ? '—' : fmt(r.ip, 1) + ' %');
            case 'gravedad': return 'Gs = ' + fmt(r.gs, 3);
            case 'compactacion': return 'wópt = ' + fmt(r.wopt, 1) + ' % · γd máx = ' + fmt(r.gdmax, 3) + ' g/cm³';
            case 'densidad': return 'γd = ' + fmt(r.gd, 3) + ' g/cm³' + (r.gc != null ? ' · ' + fmt(r.gc, 1) + ' %' : '');
            case 'clasificacion': return r.simbolo + ' — ' + r.nombre;
            case 'permeabilidad': return 'k = ' + (r.k != null ? r.k.toExponential(2) : '—') + ' cm/s';
            default: return 'Resultado calculado';
        }
    };

    return API;
});
