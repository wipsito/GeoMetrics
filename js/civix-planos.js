/**
 * Civix — PLANOS ARQUITECTÓNICOS DESDE EL CHAT (anteproyecto de distribución).
 *
 * Flujo:
 *   1. El estudiante describe el proyecto: «Hazme un edificio de 4 pisos en un lote de 10 x 20 m.
 *      Primer piso: cochera doble y un departamento. Del 2.º al 4.º piso: un departamento de 3 dormitorios».
 *   2. Civix propone la distribución (ambientes, medidas y pisos) y pide aprobación.
 *      Se puede pedir cambios en el chat: «sin estudio», «agrega un baño», «4 dormitorios», «cochera simple».
 *   3. Vista previa de cada planta.
 *   4. «Dibújalo» / botón «Modo cine»: todas las plantas se dibujan solas a la vez (ejes → columnas → muros →
 *      puertas y ventanas → escalera → mobiliario → textos y cotas).
 *   Descargas: DXF (capas EJES, COLUMNAS, MUROS, PUERTAS, VENTANAS, ESCALERA, MOBILIARIO, TEXTO, COTAS), PNG y PDF.
 *
 * Todo se calcula en el navegador con reglas de distribución (sin IA ni tokens) y usa el motor de Civix CAD
 * (CivixCAD.writeDXF, CivixCAD.toSVG, CivixCAD.exportRaster). Es un ANTEPROYECTO orientativo: no reemplaza el
 * diseño arquitectónico ni estructural firmado por un profesional, ni la revisión de la norma local (POT, NSR-10).
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || CAD.__planosArq) return; CAD.__planosArq = true;
    var doc = global.document;
    function norm(s) { s = String(s || '').toLowerCase(); try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { } return s; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function f2(n) { return (Math.round(n * 100) / 100).toFixed(2); }
    var NUM = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8 };
    var ORD = { primer: 1, primero: 1, segundo: 2, tercer: 3, tercero: 3, cuarto: 4, quinto: 5, sexto: 6, septimo: 7, octavo: 8 };
    function num(s) { if (s == null) return NaN; s = String(s); return NUM[s] != null ? NUM[s] : (ORD[s] != null ? ORD[s] : parseFloat(s.replace(',', '.'))); }
    function ordinal(n) { return n === 1 ? '1.er' : n === 3 ? '3.er' : n + '.º'; }
    var NOMBRE_PISO = ['', 'PRIMER', 'SEGUNDO', 'TERCER', 'CUARTO', 'QUINTO', 'SEXTO', 'SÉPTIMO', 'OCTAVO'];

    /* =================================================================== 1. LECTURA DEL PEDIDO */
    var RE_PISO = '(primer[o]?|segundo|tercer[o]?|cuarto|quinto|sexto|septimo|octavo|\\d+)\\s*(?:er|ro|do|to|°|º|\\.º|\\.°)?';
    function esPedido(q) {
        if (/^(que es|que son|como funciona|cual es|por que|explica|define)\b/.test(q.trim())) return false;
        var arq = /(edificio|casa|vivienda|apartamento|departamento|apartaestudio|multifamiliar|bifamiliar|unifamiliar)/.test(q);
        var lote = /lote|terreno|predio/.test(q) || /\d+(?:[.,]\d+)?\s*(?:m\s*)?[x×]\s*\d+(?:[.,]\d+)?/.test(q);
        var verbo = /(hazme|haz|dise[nñ]|dibuj|genera|crea|elabora|plano|planta|distribuci|quiero|necesito|propon)/.test(q);
        return arq && lote && verbo && !/(zapata|viga|columna|losa|muro de contencion|cercha|pilote|escalera de concreto)/.test(q);
    }
    function programa(t, base) {
        var p = base ? JSON.parse(JSON.stringify(base)) : { cochera: 0, local: false, apto: false, dorm: 0, banos: 0, estudio: false, lav: true };
        if (/cochera|garaje|garage|parqueadero|estacionamiento/.test(t)) p.cochera = /doble|dos (?:carros|autos|vehiculos|puestos)|2 (?:carros|autos|vehiculos|puestos)/.test(t) ? 2 : 1;
        if (/local|comercio|tienda/.test(t)) p.local = true;
        if (/departamento|apartamento|vivienda|apartaestudio|casa/.test(t)) p.apto = true;
        var m = t.match(/(\d+|un|uno|una|dos|tres|cuatro|cinco|seis)\s*(?:dormitorios?|habitaciones?|alcobas?|cuartos?|recamaras?)/);
        if (m) { p.dorm = num(m[1]); p.apto = true; }
        m = t.match(/(\d+|un|uno|una|dos|tres|cuatro)\s*banos?/); if (m) p.banos = num(m[1]);
        if (/estudio|oficina/.test(t) && !/apartaestudio/.test(t)) p.estudio = true;
        if (/sin lavanderia/.test(t)) p.lav = false;
        return p;
    }
    function leer(texto) {
        var q = norm(texto);
        var W, L, m = q.match(/(\d+(?:[.,]\d+)?)\s*(?:m(?:etros)?)?\s*[x×]\s*(\d+(?:[.,]\d+)?)\s*(?:m(?:etros)?)?/);
        if (m) { W = num(m[1]); L = num(m[2]); }
        if (!(W > 0) || !(L > 0)) return { error: 'Indica las medidas del lote, por ejemplo «lote de 10 x 20 m» (frente × fondo).' };
        if (W > L) { var tmp = W; W = L; L = tmp; }
        var n = 1;
        m = q.match(/(\d+|un|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho)\s*(?:pisos|niveles|plantas)/); if (m) n = num(m[1]);
        else if (/(de un piso|una planta|un nivel)/.test(q)) n = 1;
        n = Math.max(1, Math.min(8, n || 1));
        var pisos = []; for (var i = 1; i <= n; i++) pisos[i] = null;
        /* segmentos «primer piso: …», «del 2.º al 4.º piso: …», «pisos 2 a 4: …» */
        var reRango = new RegExp('(?:del?\\s+)?' + RE_PISO + '\\s*(?:piso\\s*)?(?:al|a|-|hasta(?: el)?)\\s*' + RE_PISO + '\\s*pisos?', 'g');
        var reUno = new RegExp(RE_PISO + '\\s*(?:piso|nivel|planta)\\b', 'g');
        var marcas = [];
        var mm;
        while ((mm = reRango.exec(q))) marcas.push({ i: mm.index, fin: reRango.lastIndex, a: num(mm[1]), b: num(mm[2]) });
        while ((mm = reUno.exec(q))) {
            var dentro = marcas.some(function (k) { return mm.index >= k.i && mm.index < k.fin; });
            if (!dentro && !/pisos/.test(mm[0])) marcas.push({ i: mm.index, fin: reUno.lastIndex, a: num(mm[1]), b: num(mm[1]) });
        }
        marcas.sort(function (a, b) { return a.i - b.i; });
        var general = programa(q.replace(/(?:del?\s+)?(?:primer|segundo|tercer|cuarto|quinto|\d)[^.;]*?piso[^.;]*[.;]?/g, ' '));
        marcas.forEach(function (k, j) {
            var txt = q.slice(k.fin, j + 1 < marcas.length ? marcas[j + 1].i : q.length);
            var p = programa(txt);
            for (var f = Math.max(1, k.a); f <= Math.min(n, k.b); f++) pisos[f] = p;
        });
        var esCasa = /\bcasa\b|unifamiliar/.test(q) && !/edificio|multifamiliar/.test(q);
        for (var f2_ = 1; f2_ <= n; f2_++) {
            if (pisos[f2_]) continue;
            var p = JSON.parse(JSON.stringify(general));
            if (esCasa && n > 1) { p.casa = true; if (f2_ > 1) p.cochera = 0; }
            if (f2_ > 1) { p.cochera = 0; p.local = false; }
            pisos[f2_] = p;
        }
        /* valores por defecto razonables (todo se puede cambiar antes de aprobar) */
        for (var k2 = 1; k2 <= n; k2++) {
            var pp = pisos[k2];
            if (!pp.apto && !pp.cochera && !pp.local) pp.apto = true;
            if (pp.apto && !pp.dorm) pp.dorm = (pp.cochera || pp.local) ? 2 : 3;
            if (pp.apto && !pp.banos) pp.banos = pp.dorm >= 3 ? 2 : 1;
            if (esCasa && n > 1) { /* casa: social abajo, dormitorios arriba */
                if (k2 === 1) { pp.casaSocial = true; pp.dorm = Math.min(pp.dorm, 1); pp.banos = 1; }
            }
        }
        return { W: W, L: L, n: n, pisos: pisos, texto: texto, esCasa: esCasa };
    }

    /* =================================================================== 2. DISTRIBUCIÓN */
    var MURO = 0.15, MURO_EXT = 0.25, ESC_W = 2.6, ESC_D = 3.1, PASILLO = 1.1, PAS_H = 1.2;
    function plan(P) {
        var W = P.W, L = P.L, warns = [];
        if (W < 5.5) warns.push('Un frente de ' + f2(W) + ' m es muy angosto: la distribución queda muy apretada.');
        var ws = W >= 7 ? ESC_W : 2.4;          /* franja de circulación (escalera / ingreso / estudio) a la derecha */
        var wl = W - ws;
        var a = Math.max(2.6, (W - PASILLO) * 0.55), b = W - PASILLO - a; /* columnas de cuartos a cada lado del pasillo */
        /* celdas de la zona de cuartos para cada piso */
        function celdas(p) {
            var izq = [], der = [];
            var lista = [];
            if (p.casaSocial) { lista.push(['SALA', 4.0]); lista.push(['COMEDOR', 3.4]); }
            else if (p.apto && (p.cochera || p.local)) lista.push(['SALA-COMEDOR', 4.2]);
            if (p.apto) {
                for (var d = 1; d <= p.dorm; d++) lista.push([d === 1 ? 'DORM. PRINCIPAL' : 'DORMITORIO ' + d, d === 1 ? 4.0 : 3.6]);
                for (var k = 1; k <= p.banos; k++) lista.push([p.banos > 1 ? 'BAÑO ' + k : 'BAÑO', 2.4]);
            }
            /* reparto equilibrado: cada ambiente va a la columna más corta (la izquierda es la más ancha);
               así las dos columnas terminan con profundidades parecidas */
            lista.forEach(function (c) { if (sum(izq) <= sum(der)) izq.push(c); else der.push(c); });
            return { izq: izq, der: der };
        }
        function sum(col) { return col.reduce(function (s, c) { return s + c[1]; }, 0); }
        var C = [], maxZona = 0, f;
        function medir() { maxZona = 0; for (f = 1; f <= P.n; f++) { var c = celdas(P.pisos[f]); C[f] = c; maxZona = Math.max(maxZona, sum(c.izq), sum(c.der)); } }
        medir();
        var hA = 5.0, hB = P.n > 1 ? ESC_D : 2.8, patioMin = 2.0, esc = 1;
        /* Ajuste al fondo del lote: primero se compactan franjas y patio (sin bajar de medidas mínimas);
           si aun así no cabe, se quitan baños extra y luego dormitorios, y se avisa qué se quitó. */
        var pasos = [function () { hA = 4.5; }, function () { patioMin = 1.5; }, function () { hA = 4.0; hB = Math.min(hB, 2.8); }, function () { patioMin = 1.0; hA = 3.6; }];
        var quitados = [];
        function cabe() { return hA + hB + PAS_H + maxZona * 0.85 <= L - patioMin; }
        for (var s = 0; s < pasos.length && !cabe(); s++) pasos[s]();
        var guarda = 0;
        while (!cabe() && guarda++ < 20) {
            var hizo = false;
            for (f = P.n; f >= 1 && !hizo; f--) { var pf = P.pisos[f]; if (pf.banos > 1) { pf.banos--; quitados.push('un baño del ' + ordinal(f) + ' piso'); hizo = true; } }
            for (f = P.n; f >= 1 && !hizo; f--) { var pg = P.pisos[f]; if (pg.dorm > 1) { pg.dorm--; quitados.push('un dormitorio del ' + ordinal(f) + ' piso'); hizo = true; } }
            if (!hizo) break;
            medir();
        }
        if (quitados.length) warns.push('Para respetar medidas mínimas en un fondo de ' + f2(L) + ' m quité ' + quitados.join(', ') + '. Si lo necesitas, pide un lote más profundo o más pisos.');
        if (!cabe()) warns.push('El programa queda muy justo para un lote de ' + f2(W) + ' × ' + f2(L) + ' m: revisa las medidas antes de aprobar.');
        var D = hA + hB + PAS_H + maxZona;
        var disp = L - patioMin;
        if (D > disp) {
            esc = Math.max(0.85, (disp - hA - hB - PAS_H) / maxZona); D = hA + hB + PAS_H + maxZona * esc;
        } else if (D < disp - 2) {
            var extra = Math.min((disp - 1.5) - D, maxZona * 0.22);
            esc = (maxZona + extra) / maxZona; D = hA + hB + PAS_H + maxZona * esc;
        }
        D = Math.min(D, L - 1.2);
        var patio = L - D;
        /* construir los ambientes de cada piso */
        var pisos = [];
        for (f = 1; f <= P.n; f++) {
            var p = P.pisos[f], R = [];
            var y0 = 0;
            /* franja A (frente) */
            if (f === 1 && p.cochera) {
                R.push(rm(p.cochera === 2 ? 'COCHERA DOBLE' : 'COCHERA', 0, 0, wl, hA, 'cochera', p.cochera));
                R.push(rm('INGRESO', wl, 0, ws, hA, 'ingreso'));
            } else if (f === 1 && p.local) {
                R.push(rm('LOCAL COMERCIAL', 0, 0, wl, hA, 'local'));
                R.push(rm('INGRESO', wl, 0, ws, hA, 'ingreso'));
            } else if (p.casaSocial) {
                R.push(rm(p.cochera ? (p.cochera === 2 ? 'COCHERA DOBLE' : 'COCHERA') : 'ESTAR', 0, 0, wl, hA, p.cochera ? 'cochera' : 'sala', p.cochera));
                R.push(rm('INGRESO', wl, 0, ws, hA, 'ingreso'));
            } else {
                R.push(rm('SALA-COMEDOR', 0, 0, wl, hA, 'sala'));
                R.push(rm(p.estudio ? 'ESTUDIO' : (f === 1 ? 'INGRESO' : 'HALL'), wl, 0, ws, hA, p.estudio ? 'estudio' : 'ingreso'));
            }
            y0 = hA;
            /* franja B: cocina, lavandería y escalera (se repiten en todos los pisos: instalaciones y escalera alineadas) */
            var lavW = p.lav && wl > 5 ? 1.4 : 0;
            if (p.apto || p.casaSocial) {
                R.push(rm('COCINA', 0, y0, wl - lavW, hB, 'cocina'));
                if (lavW) R.push(rm('LAVANDERÍA', wl - lavW, y0, lavW, hB, 'lav'));
            } else R.push(rm(f === 1 && p.local ? 'BODEGA' : 'DEPÓSITO', 0, y0, wl, hB, 'deposito'));
            if (P.n > 1) R.push(rm('ESCALERA', wl, y0, ws, hB, 'escalera'));
            else R.push(rm(p.estudio && f === 1 ? 'ESTUDIO' : 'HALL', wl, y0, ws, hB, 'ingreso'));
            y0 += hB;
            /* pasillo distribuidor */
            R.push(rm('PASILLO', 0, y0, W, PAS_H, 'pasillo'));
            y0 += PAS_H;
            /* zona de cuartos: dos columnas con pasillo central */
            var zonaH = D - y0, cc = C[f];
            if (cc.izq.length || cc.der.length) {
                colocar(cc.izq, 0, a, y0, zonaH, R);
                R.push(rm('PASILLO', a, y0, PASILLO, zonaH - (cc.der.length ? 0 : 0), 'pasillo'));
                colocar(cc.der, a + PASILLO, b, y0, zonaH, R);
            } else {
                R.push(rm(f === 1 && p.local ? 'ÁREA DE VENTAS' : 'ÁREA LIBRE', 0, y0, W, zonaH, 'libre'));
            }
            if (f === 1) R.push(rm('PATIO POSTERIOR', 0, D, W, patio, 'patio'));
            pisos.push({ n: f, rooms: R, p: p });
        }
        function colocar(col, x, w, y, H, R) {
            if (!col.length) { R.push(rm('DEPÓSITO', x, y, w, H, 'deposito')); return; }
            var tot = sum(col), yy = y;
            /* si la columna es bastante más corta que la zona, no se estiran los ambientes de más:
               se crecen hasta un 25 % y lo que sobra queda como depósito / clóset al fondo */
            var k = Math.min(H / tot, 1.25), sobra = H - tot * k;
            if (sobra > 0.9) { col = col.concat([['DEPÓSITO', sobra / k]]); tot = sum(col); }
            col.forEach(function (c, i) {
                var h = i === col.length - 1 ? (y + H - yy) : c[1] * H / tot;
                /* un baño en una columna ancha no ocupa todo el ancho: 2.40 m de baño y el resto como clóset */
                if (/BAÑO/.test(c[0]) && w > 3.4) {
                    var bw = 2.4, bx = x === 0 ? x + w - bw : x;
                    R.push(rm(c[0], bx, yy, bw, h, 'bano'));
                    R.push(rm('CLÓSET', x === 0 ? x : x + bw, yy, w - bw, h, 'closet'));
                    yy += h; return;
                }
                var tipo = /BAÑO/.test(c[0]) ? 'bano' : /DORM/.test(c[0]) ? (/PRINCIPAL/.test(c[0]) ? 'dormp' : 'dorm') : /SALA|ESTAR/.test(c[0]) ? 'sala' : /COMEDOR/.test(c[0]) ? 'comedor' : /DEPÓSITO/.test(c[0]) ? 'deposito2' : 'otro';
                R.push(rm(c[0], x, yy, w, h, tipo)); yy += h;
            });
        }
        return { W: W, L: L, D: D, patio: patio, ws: ws, wl: wl, a: a, b: b, hA: hA, hB: hB, pisos: pisos, warns: warns, n: P.n };
    }
    function rm(nombre, x, y, w, h, tipo, extra) { return { nombre: nombre, x: x, y: y, w: w, h: h, tipo: tipo, extra: extra }; }

    /* Tabla de ambientes agrupando pisos con la misma distribución */
    function tabla(Pl) {
        var filas = [], idx = {};
        Pl.pisos.forEach(function (pi) {
            pi.rooms.forEach(function (r) {
                if (r.tipo === 'pasillo') return;
                var k = r.nombre + '|' + f2(r.w) + '|' + f2(r.h);
                if (!idx[k]) { idx[k] = { nombre: r.nombre, w: r.w, h: r.h, pisos: [], cant: {} }; filas.push(idx[k]); }
                if (idx[k].pisos.indexOf(pi.n) < 0) idx[k].pisos.push(pi.n);
                idx[k].cant[pi.n] = (idx[k].cant[pi.n] || 0) + 1;
            });
        });
        filas.forEach(function (r) {
            var p = r.pisos, txt;
            if (p.length === Pl.n && Pl.n > 1) txt = 'todos';
            else if (p.length > 1 && p[p.length - 1] - p[0] === p.length - 1) txt = ordinal(p[0]) + '–' + ordinal(p[p.length - 1]);
            else txt = p.map(ordinal).join(', ');
            r.txt = txt;
            var c = r.cant[p[0]]; if (c > 1) r.nombre += ' (' + c + ')';
        });
        return filas;
    }

    /* =================================================================== 3. DIBUJO (modelo CAD) */
    var LAYERS = { EJES: 1, COLUMNAS: 4, MUROS: 4, PUERTAS: 3, VENTANAS: 5, ESCALERA: 6, MOBILIARIO: 2, TEXTO: 7, COTAS: 5, MARCO: 8 };
    var ETAPA = { EJES: 0, COLUMNAS: 1, MUROS: 2, VENTANAS: 3, PUERTAS: 3, ESCALERA: 4, MOBILIARIO: 5, TEXTO: 6, COTAS: 6, MARCO: 6 };
    function dibujarPiso(Pl, pi, ox) {
        var ents = [], W = Pl.W, D = pi.n === 1 ? Pl.L : Pl.D;
        function P(x, y) { return [ox + x, y, 0]; }
        function ln(layer, x1, y1, x2, y2, extra) { var e = { t: 'poly', pts: [P(x1, y1), P(x2, y2)], closed: false, layer: layer }; if (extra) for (var k in extra) e[k] = extra[k]; ents.push(e); return e; }
        function rect(layer, x, y, w, h, extra) { var e = { t: 'poly', pts: [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)], closed: true, layer: layer }; if (extra) for (var k in extra) e[k] = extra[k]; ents.push(e); return e; }
        function arco(layer, cx, cy, r, a0, a1) { var pts = []; for (var i = 0; i <= 12; i++) { var t = a0 + (a1 - a0) * i / 12; pts.push(P(cx + r * Math.cos(t), cy + r * Math.sin(t))); } ents.push({ t: 'poly', pts: pts, closed: false, layer: layer }); }
        function circ(layer, cx, cy, r) { ents.push({ t: 'circle', c: P(cx, cy), r: r, layer: layer }); }
        function txt(layer, x, y, h, s, extra) { var e = { t: 'text', p: P(x, y), h: h, s: [s], rot: 0, ha: 1, va: 2, layer: layer }; if (extra) for (var k in extra) e[k] = extra[k]; ents.push(e); }

        /* --- ejes y columnas --- */
        var ex = [0, W]; if (W >= 7) ex.splice(1, 0, Pl.a + PASILLO / 2 > W - 1.5 ? W / 2 : Pl.wl);
        if (W >= 12) ex.splice(1, 0, Pl.wl / 2);
        var ey = [0, Pl.hA, Pl.hA + Pl.hB + PAS_H], y = ey[ey.length - 1];
        while (Pl.D - y > 4.6) { y += Math.min(4.2, (Pl.D - y) / Math.ceil((Pl.D - y) / 4.2)); ey.push(y); }
        if (Math.abs(ey[ey.length - 1] - Pl.D) > 0.05) ey.push(Pl.D);
        var LET = 'ABCDEFGHIJ';
        ex.forEach(function (x, i) {
            ln('EJES', x, -1.4, x, Pl.D + 1.0, { dash: true });
            circ('EJES', x, -1.75, 0.35); txt('EJES', x, -1.75, 0.3, String(i + 1));
        });
        ey.forEach(function (yy, i) {
            ln('EJES', -1.4, yy, W + 1.0, yy, { dash: true });
            circ('EJES', -1.75, yy, 0.35); txt('EJES', -1.75, yy, 0.3, LET[i] || String(i));
        });
        ex.forEach(function (x) { ey.forEach(function (yy) { rect('COLUMNAS', x - 0.15, yy - 0.15, 0.3, 0.3, { fill: true, alpha: 0.85 }); }); });

        /* --- muros: perímetro exterior + divisiones de cada ambiente --- */
        rect('MUROS', 0, 0, W, Pl.D, { ext: true });
        rect('MUROS', MURO_EXT, MURO_EXT, W - 2 * MURO_EXT, Pl.D - 2 * MURO_EXT, { ext: true });
        if (pi.n === 1 && Pl.patio > 0.5) { ln('MUROS', 0, Pl.D, 0, Pl.L); ln('MUROS', W, Pl.D, W, Pl.L); ln('MUROS', 0, Pl.L, W, Pl.L); }
        pi.rooms.forEach(function (r) {
            if (r.tipo === 'patio' || r.tipo === 'pasillo') return;
            rect('MUROS', r.x + MURO / 2, r.y + MURO / 2, r.w - MURO, r.h - MURO);
        });

        /* --- ventanas en fachada (frente y fondo) --- */
        pi.rooms.forEach(function (r) {
            if (r.tipo === 'patio' || r.tipo === 'pasillo' || r.tipo === 'escalera') return;
            var ww = Math.min(1.6, r.w * 0.5);
            if (r.y < 0.01 && !(pi.n === 1 && r.tipo === 'cochera')) { var cx = r.x + r.w / 2; [0.05, 0.125, 0.2].forEach(function (o) { ln('VENTANAS', cx - ww / 2, o, cx + ww / 2, o); }); }
            if (Math.abs(r.y + r.h - Pl.D) < 0.01) { var cx2 = r.x + r.w / 2; [Pl.D - 0.05, Pl.D - 0.125, Pl.D - 0.2].forEach(function (o) { ln('VENTANAS', cx2 - ww / 2, o, cx2 + ww / 2, o); }); }
        });

        /* --- puertas (hoja + arco de giro) --- */
        function puerta(x, y, ancho, dir) { /* dir: 'up','down','left','right' = hacia dónde abre; bisagra en (x,y) */
            var a0, a1, lx, ly;
            if (dir === 'up') { lx = x; ly = y + ancho; a0 = 0; a1 = Math.PI / 2; ln('PUERTAS', x, y, x, y + ancho); arco('PUERTAS', x, y, ancho, a0, a1); }
            else if (dir === 'down') { ln('PUERTAS', x, y, x, y - ancho); arco('PUERTAS', x, y, ancho, -Math.PI / 2, 0); }
            else if (dir === 'right') { ln('PUERTAS', x, y, x + ancho, y); arco('PUERTAS', x, y, ancho, 0, Math.PI / 2); }
            else { ln('PUERTAS', x, y, x - ancho, y); arco('PUERTAS', x, y, ancho, Math.PI / 2, Math.PI); }
        }
        pi.rooms.forEach(function (r) {
            var dw = r.tipo === 'bano' ? 0.75 : 0.9;
            switch (r.tipo) {
                case 'cochera': /* portón */
                    for (var g = 0; g < 3; g++) ln('PUERTAS', r.x + 0.4 + g * (r.w - 0.8) / 3, 0.12, r.x + 0.4 + (g + 1) * (r.w - 0.8) / 3 - 0.08, 0.12);
                    txt('TEXTO', r.x + r.w / 2, 0.45, 0.13, 'PORTÓN'); break;
                case 'ingreso': if (r.y < 0.01) puerta(r.x + 0.5, 0.12, 1.0, 'up'); break;
                case 'local': ln('PUERTAS', r.x + 0.6, 0.1, r.x + r.w - 0.6, 0.1); break;
                case 'sala': if (r.y < 0.01) puerta(r.x + r.w - 0.12, r.y + r.h - 1.05, 0.9, 'left'); else puerta(r.x + r.w - 0.12, r.y + 0.2, 0.9, 'left'); break;
                case 'estudio': puerta(r.x + 0.12, r.y + r.h - 1.05, 0.85, 'right'); break;
                case 'cocina': puerta(r.x + r.w - 1.15, r.y + r.h - 0.12, 0.9, 'down'); break;
                case 'lav': puerta(r.x + 0.25, r.y + r.h - 0.12, 0.75, 'down'); break;
                case 'deposito': puerta(r.x + r.w - 1.1, r.y + r.h - 0.12, 0.85, 'down'); break;
                case 'dorm': case 'dormp': case 'bano': case 'comedor': case 'otro': case 'deposito2': {
                    var izq = r.x < Pl.a - 0.01;
                    if (izq) puerta(r.x + r.w - 0.12, r.y + 0.2, dw, 'left'); else puerta(r.x + 0.12, r.y + 0.2 + dw, dw, 'right');
                    break;
                }
            }
        });

        /* --- escalera: dos tramos con huellas de 0.28 m --- */
        pi.rooms.forEach(function (r) {
            if (r.tipo !== 'escalera') return;
            var x0 = r.x + 0.2, x1 = r.x + r.w - 0.2, xm = (x0 + x1) / 2, y0 = r.y + 0.2, y1 = r.y + r.h - 0.2;
            ln('ESCALERA', xm, y0 + 0.9, xm, y1);
            for (var yy = y0 + 0.9; yy <= y1 + 0.001; yy += 0.28) { ln('ESCALERA', x0, yy, xm - 0.05, yy); ln('ESCALERA', xm + 0.05, yy, x1, yy); }
            ln('ESCALERA', (x0 + xm) / 2, y1 - 0.2, (x0 + xm) / 2, y0 + 1.1); ln('ESCALERA', (x0 + xm) / 2, y0 + 1.1, (x0 + xm) / 2 - 0.12, y0 + 1.3); ln('ESCALERA', (x0 + xm) / 2, y0 + 1.1, (x0 + xm) / 2 + 0.12, y0 + 1.3);
            txt('TEXTO', (xm + x1) / 2, y0 + 0.5, 0.12, 'SUBE');
        });

        /* --- mobiliario --- */
        pi.rooms.forEach(function (r) { mobiliario(r, rect, ln, circ, arco); });

        /* --- textos de ambientes --- */
        pi.rooms.forEach(function (r) {
            if (r.tipo === 'pasillo' && r.w < 2) return;
            var hT = r.w < 2 ? 0.16 : 0.22, cy = r.y + r.h / 2 + (r.tipo === 'escalera' ? 0.2 : 0);
            txt('TEXTO', r.x + r.w / 2, cy + 0.18, hT, r.nombre);
            txt('TEXTO', r.x + r.w / 2, cy - 0.12, 0.14, f2(r.w) + ' × ' + f2(r.h), { sub: true });
        });

        /* --- cotas generales y rótulo --- */
        ln('COTAS', 0, -0.7, W, -0.7); ln('COTAS', 0, -0.55, 0, -0.85); ln('COTAS', W, -0.55, W, -0.85);
        txt('COTAS', W / 2, -0.95, 0.2, f2(W) + ' m');
        ln('COTAS', -0.7, 0, -0.7, D); ln('COTAS', -0.55, 0, -0.85, 0); ln('COTAS', -0.55, D, -0.85, D);
        txt('COTAS', -1.0, D / 2, 0.2, f2(D) + ' m', { rot: Math.PI / 2 });
        txt('TEXTO', W / 2, -2.6, 0.38, 'PLANTA ' + (NOMBRE_PISO[pi.n] || pi.n + '.º') + ' PISO', { titulo: true });
        txt('TEXTO', W / 2, -3.05, 0.17, 'NPT ' + (pi.n === 1 ? '±0.00' : '+' + f2((pi.n - 1) * 2.7)) + ' · ESC. 1:75 · ANTEPROYECTO');
        return ents;
    }
    function mobiliario(r, rect, ln, circ, arco) {
        var M = 'MOBILIARIO', x = r.x, y = r.y, w = r.w, h = r.h, cx = x + w / 2, cy = y + h / 2;
        switch (r.tipo) {
            case 'cochera': {
                var n = r.extra === 2 && w >= 5 ? 2 : 1;
                for (var i = 0; i < n; i++) {
                    var cw = 1.8, cl = 4.2, px = n === 2 ? x + w * (i + 0.5) / 2 - cw / 2 : cx - cw / 2, py = y + (h - cl) / 2;
                    rect(M, px, py, cw, cl); rect(M, px + 0.2, py + 1.2, cw - 0.4, 1.0); rect(M, px + 0.2, py + 2.6, cw - 0.4, 0.9);
                }
                break;
            }
            case 'sala': case 'local': {
                if (r.tipo === 'local') { rect(M, x + 0.5, y + h - 1.2, w - 1.0, 0.6); break; }
                rect(M, x + 0.5, y + 0.6, Math.min(2.2, w * 0.4), 0.85);              /* sofá */
                rect(M, x + 0.5, y + 1.7, 0.85, 1.4);                                   /* sillón */
                rect(M, x + 1.6, y + 1.8, 1.1, 0.6);                                    /* mesa de centro */
                if (w > 4.5 && h > 3.5) {                                               /* comedor */
                    var tx = x + w - 2.6, ty = y + h - 2.4; rect(M, tx, ty, 1.6, 0.9);
                    for (var k = 0; k < 3; k++) { rect(M, tx + 0.15 + k * 0.5, ty - 0.45, 0.4, 0.35); rect(M, tx + 0.15 + k * 0.5, ty + 1.0, 0.4, 0.35); }
                }
                break;
            }
            case 'comedor': {
                var t2x = cx - 0.8, t2y = cy - 0.45; rect(M, t2x, t2y, 1.6, 0.9);
                for (var k2 = 0; k2 < 3; k2++) { rect(M, t2x + 0.15 + k2 * 0.5, t2y - 0.45, 0.4, 0.35); rect(M, t2x + 0.15 + k2 * 0.5, t2y + 1.0, 0.4, 0.35); }
                break;
            }
            case 'dormp': case 'dorm': {
                var dbl = r.tipo === 'dormp', bw = dbl ? 1.6 : 1.0, bl = 2.0, bx = x + (w - bw) / 2, by = y + h - 0.2 - bl;
                rect(M, bx, by, bw, bl); rect(M, bx + 0.1, by + bl - 0.5, dbl ? bw / 2 - 0.15 : bw - 0.2, 0.35); if (dbl) rect(M, bx + bw / 2 + 0.05, by + bl - 0.5, bw / 2 - 0.15, 0.35);
                rect(M, bx - 0.5, by + bl - 0.5, 0.42, 0.42); if (dbl) rect(M, bx + bw + 0.08, by + bl - 0.5, 0.42, 0.42);
                rect(M, x + 0.2, y + 0.25, Math.min(1.6, w * 0.4), 0.6);              /* clóset */
                break;
            }
            case 'bano': {
                rect(M, x + 0.2, y + h - 1.0, 0.85, 0.85); ln(M, x + 0.2, y + h - 1.0, x + 1.05, y + h - 0.15); /* ducha */
                rect(M, x + w - 0.75, y + h - 0.6, 0.5, 0.4); circ(M, x + w - 0.5, y + h - 1.0, 0.24);         /* inodoro */
                rect(M, x + w - 0.75, y + 0.3, 0.5, 0.4); circ(M, x + w - 0.5, y + 0.5, 0.13);                 /* lavamanos */
                break;
            }
            case 'cocina': {
                rect(M, x + 0.2, y + 0.2, w - 0.4, 0.6); rect(M, x + 0.2, y + 0.8, 0.6, Math.min(1.6, h - 1.2));
                [0.25, 0.65].forEach(function (o) { circ(M, x + 1.4 + o, y + 0.4, 0.12); circ(M, x + 1.4 + o, y + 0.62, 0.12); });
                rect(M, x + w - 1.3, y + 0.28, 0.7, 0.45);                                                    /* lavaplatos */
                break;
            }
            case 'lav': rect(M, x + 0.2, y + 0.25, 0.65, 0.65); circ(M, x + 0.525, y + 0.575, 0.22); break;
            case 'estudio': rect(M, x + 0.25, y + 0.4, Math.min(1.4, w - 0.5), 0.6); rect(M, x + 0.6, y + 1.15, 0.45, 0.45); break;
            case 'patio': for (var p = 0; p < 4; p++) circ(M, x + w * (p + 0.5) / 4, y + h / 2, Math.min(0.35, h * 0.2)); break;
        }
    }
    function modelo(Pl, soloPiso) {
        var ents = [], gap = Pl.W + 5;
        Pl.pisos.forEach(function (pi, i) { if (soloPiso && pi.n !== soloPiso) return; ents = ents.concat(dibujarPiso(Pl, pi, soloPiso ? 0 : i * gap)); });
        var layers = {}; Object.keys(LAYERS).forEach(function (k) { layers[k] = { name: k, aci: LAYERS[k], off: false }; });
        ents.forEach(function (e) { e.aci = LAYERS[e.layer]; });
        var m = { ents: ents, layers: layers, blocks: {}, units: 6 };
        m.bbox = CAD.bboxOf(ents);
        return m;
    }

    /* =================================================================== 4. SVG propio (vista previa y modo cine) */
    var COLOR = { EJES: '#ef4444', COLUMNAS: '#22d3ee', MUROS: '#2dd4bf', PUERTAS: '#4ade80', VENTANAS: '#60a5fa', ESCALERA: '#e879f9', MOBILIARIO: '#facc15', TEXTO: '#e2e8f0', COTAS: '#38bdf8', MARCO: '#94a3b8' };
    var COLOR_CLARO = { EJES: '#dc2626', COLUMNAS: '#0e7490', MUROS: '#0f766e', PUERTAS: '#15803d', VENTANAS: '#2563eb', ESCALERA: '#a21caf', MOBILIARIO: '#b45309', TEXTO: '#0f172a', COTAS: '#0369a1', MARCO: '#64748b' };
    function svgPiso(ents, claro, conIndices) {
        var bb = CAD.bboxOf(ents), pad = 0.6, w = bb[2] - bb[0] + 2 * pad, h = bb[3] - bb[1] + 2 * pad;
        var col = claro ? COLOR_CLARO : COLOR;
        function X(x) { return (x - bb[0] + pad).toFixed(3); } function Y(y) { return (bb[3] - y + pad).toFixed(3); }
        var out = ['<svg class="cxa-svg" viewBox="0 0 ' + w.toFixed(2) + ' ' + h.toFixed(2) + '" xmlns="http://www.w3.org/2000/svg" role="img">'];
        ents.forEach(function (e, i) {
            var c = col[e.layer] || '#94a3b8', at = conIndices ? ' data-k="' + i + '" data-e="' + ETAPA[e.layer] + '" class="cxa-e"' : '';
            var sw = e.layer === 'MUROS' ? (e.ext ? 0.07 : 0.045) : e.layer === 'EJES' ? 0.018 : 0.025;
            if (e.t === 'poly') {
                var pts = e.pts.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ');
                var fill = e.fill ? ' fill="' + c + '" fill-opacity="' + (e.alpha || 0.3) + '"' : ' fill="none"';
                out.push('<' + (e.closed ? 'polygon' : 'polyline') + at + ' points="' + pts + '" stroke="' + c + '" stroke-width="' + sw + '"' + fill + (e.dash ? ' stroke-dasharray="0.35 0.15 0.06 0.15"' : '') + ' pathLength="1" stroke-linejoin="round"/>');
            } else if (e.t === 'circle') {
                out.push('<circle' + at + ' cx="' + X(e.c[0]) + '" cy="' + Y(e.c[1]) + '" r="' + e.r.toFixed(3) + '" stroke="' + c + '" stroke-width="' + sw + '" fill="none" pathLength="1"/>');
            } else if (e.t === 'text') {
                var fs = e.h, rot = e.rot ? ' transform="rotate(' + (-e.rot * 180 / Math.PI).toFixed(1) + ' ' + X(e.p[0]) + ' ' + Y(e.p[1]) + ')"' : '';
                out.push('<text' + at + ' x="' + X(e.p[0]) + '" y="' + (parseFloat(Y(e.p[1])) + fs * 0.35).toFixed(3) + '" font-size="' + fs.toFixed(3) + '" fill="' + (e.sub ? (claro ? '#475569' : '#94a3b8') : c) + '" text-anchor="middle" font-family="JetBrains Mono,Consolas,monospace"' + (e.titulo ? ' font-weight="700"' : '') + rot + '>' + esc(e.s[0]) + '</text>');
            }
        });
        out.push('</svg>');
        return out.join('');
    }

    /* =================================================================== 5. TARJETAS DEL CHAT */
    var actual = null; /* último proyecto: { P, Pl, estado: 'propuesta'|'aprobado' } */
    function chat() { return doc.getElementById('chatMensajes'); }
    function historial(user, bot) { try { if (typeof chatHistory !== 'undefined') { chatHistory.push({ role: 'user', content: user }); chatHistory.push({ role: 'assistant', content: bot }); } if (typeof civixGuardarConversacionActual === 'function') civixGuardarConversacionActual(); } catch (e) { } }
    function tarjeta(html) { var c = chat(); if (!c) return null; var m = el('div', 'mensaje mensaje-bot mensaje-bot-rich cx-card cxa-card', html); c.appendChild(m); c.scrollTop = c.scrollHeight; return m; }
    function resumenPisos(P) {
        var out = [];
        for (var f = 1; f <= P.n; f++) {
            var p = P.pisos[f], t = [];
            if (p.cochera) t.push(p.cochera === 2 ? 'cochera doble' : 'cochera');
            if (p.local) t.push('local comercial');
            if (p.casaSocial) t.push('zona social');
            if (p.apto) t.push((p.casaSocial ? '' : 'departamento ') + p.dorm + ' dorm. y ' + p.banos + ' baño' + (p.banos > 1 ? 's' : ''));
            if (p.estudio) t.push('estudio');
            out.push(ordinal(f) + ' piso: ' + t.join(', '));
        }
        return out.join(' · ');
    }
    function propuesta(texto, P) {
        var Pl = plan(P); actual = { P: P, Pl: Pl, estado: 'propuesta', texto: texto };
        var filas = tabla(Pl);
        var c = tarjeta(
            '<div class="civix-md">🏗️ Te propongo esta distribución (lote ' + f2(P.W) + ' × ' + f2(P.L) + ' m, ' + P.n + ' piso' + (P.n > 1 ? 's' : '') + '):<br><small>' + esc(resumenPisos(P)) + '</small></div>' +
            '<div class="cxa-tbl-wrap"><table class="cxa-tbl"><thead><tr><th>Ambiente</th><th>Medidas (m)</th><th>Piso</th></tr></thead><tbody>' +
            filas.map(function (r, i) { return '<tr style="--i:' + i + '"><td>' + esc(r.nombre) + '</td><td>' + f2(r.w) + ' × ' + f2(r.h) + '</td><td>' + esc(r.txt) + '</td></tr>'; }).join('') +
            '</tbody></table></div>' +
            (Pl.warns.length ? Pl.warns.map(function (w) { return '<p class="cxp-warn">⚠ ' + esc(w) + '</p>'; }).join('') : '') +
            '<p class="cxa-q">¿Apruebas la distribución? También puedes pedir cambios en el chat: <i>«sin estudio», «agrega un baño», «4 dormitorios», «cochera simple»</i>.</p>' +
            '<div class="cxa-acts"><button type="button" class="cxa-btn ok" data-cxa="aprobar">Sí, aprobado ✓</button><button type="button" class="cxa-btn" data-cxa="cambiar">Quiero cambiar algo</button></div>' +
            '<p class="cxa-nota">Anteproyecto orientativo generado por reglas de distribución. No reemplaza el diseño arquitectónico y estructural firmado por un profesional ni la revisión de la norma local (POT, NSR-10).</p>');
        if (!c) return false;
        c.addEventListener('click', function (e) {
            var b = e.target.closest('[data-cxa]'); if (!b) return;
            if (b.getAttribute('data-cxa') === 'aprobar') { c.querySelectorAll('[data-cxa]').forEach(function (x) { x.disabled = true; }); aprobar(); }
            else { var i = doc.getElementById('inputAsistente'); if (i) { i.value = 'Cambia: '; i.focus(); } }
        });
        historial(texto, 'Propuse una distribución arquitectónica (anteproyecto) para un lote de ' + f2(P.W) + ' × ' + f2(P.L) + ' m con ' + P.n + ' pisos: ' + filas.map(function (r) { return r.nombre + ' ' + f2(r.w) + '×' + f2(r.h) + ' (' + r.txt + ')'; }).join('; ') + '.');
        return true;
    }
    function aprobar() {
        if (!actual) return;
        actual.estado = 'aprobado';
        var Pl = actual.Pl, unicos = [];
        Pl.pisos.forEach(function (pi) { var firma = JSON.stringify(pi.rooms.map(function (r) { return [r.nombre, f2(r.w), f2(r.h)]; })); if (!unicos.some(function (u) { return u.firma === firma; })) unicos.push({ firma: firma, pisos: [pi.n], pi: pi }); else unicos.filter(function (u) { return u.firma === firma; })[0].pisos.push(pi.n); });
        var c = tarjeta('<div class="civix-md"><span class="cxa-ok">Distribución aprobada · vista previa lista</span></div>' +
            '<div class="cxa-prev-h">VISTA PREVIA DE CADA PLANTA</div>' +
            '<div class="cxa-prev">' + unicos.map(function (u) {
                var ents = dibujarPiso(Pl, u.pi, 0);
                return '<figure>' + svgPiso(ents, true, false) + '<figcaption>' + (u.pisos.length > 1 ? ordinal(u.pisos[0]) + ' a ' + ordinal(u.pisos[u.pisos.length - 1]) : ordinal(u.pisos[0])) + ' PISO</figcaption></figure>';
            }).join('') + '</div>' +
            '<div class="cxa-cambio"><b>¿Quieres cambiar algo?</b><span>Se corrige antes de dibujar: escríbelo en el chat.</span></div>' +
            '<div class="cxa-acts"><button type="button" class="cxa-btn ok" data-cxa="cine">🎬 Dibujar en modo cine</button>' +
            '<button type="button" class="cxa-btn" data-cxa="dxf">⬇ DXF</button><button type="button" class="cxa-btn" data-cxa="pdf">⬇ PDF</button><button type="button" class="cxa-btn" data-cxa="png">⬇ PNG</button></div>' +
            '<p class="cxa-nota">También puedes escribir «dibújalo».</p>');
        if (c) c.addEventListener('click', function (e) { var b = e.target.closest('[data-cxa]'); if (b) accion(b.getAttribute('data-cxa'), b); });
        historial('Sí, aprobado', 'Distribución aprobada. Mostré la vista previa de cada planta; el estudiante puede pedir el modo cine («dibújalo») o descargar DXF/PDF/PNG.');
    }
    function nombreArchivo() { var P = actual.P; return 'Civix_anteproyecto_' + P.n + 'pisos_' + f2(P.W).replace('.', '_') + 'x' + f2(P.L).replace('.', '_'); }
    function accion(a, btn) {
        if (!actual) return;
        try {
            if (a === 'cine') return cine(actual.Pl);
            var m = modelo(actual.Pl);
            if (a === 'dxf') CAD.download(nombreArchivo() + '.dxf', new Blob([CAD.writeDXF(m)], { type: 'application/dxf' }));
            else if ((a === 'pdf' || a === 'png') && CAD.exportRaster) CAD.exportRaster(m, a, nombreArchivo());
            if (btn) { var t = btn.textContent; btn.textContent = t.replace(/ ✓$/, '') + ' ✓'; }
        } catch (e) { if (btn) btn.textContent = '⚠ ' + (e.message || 'error'); }
    }

    /* =================================================================== 6. MODO CINE */
    var NOMBRES_ETAPA = ['Ejes', 'Columnas', 'Muros', 'Puertas y ventanas', 'Escalera', 'Mobiliario', 'Textos y cotas'];
    var CURSOR = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];
    function cine(Pl) {
        var reducido = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var ov = el('div', 'cxa-cine');
        ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Modo cine: dibujo de las plantas');
        ov.innerHTML = '<div class="cxa-cine-top"><div><small>CIVIX · PLANOS</small><b>Edificio ' + Pl.n + ' piso' + (Pl.n > 1 ? 's' : '') + ' · lote ' + f2(Pl.W) + ' × ' + f2(Pl.L) + ' m</b></div>' +
            '<span class="cxa-etapa">Preparando…</span><div class="cxa-cine-acts">' +
            '<button type="button" data-c="vel" title="Velocidad">1×</button><button type="button" data-c="rep" title="Repetir">↺ Repetir</button>' +
            '<button type="button" data-c="dxf">⬇ DXF</button><button type="button" data-c="pdf">⬇ PDF</button><button type="button" data-c="x" aria-label="Cerrar">✕</button></div></div>' +
            '<div class="cxa-cine-bar"><i></i></div><div class="cxa-cine-g" style="--n:' + Math.min(Pl.n, 4) + '"></div>';
        doc.body.appendChild(ov);
        var grid = ov.querySelector('.cxa-cine-g'), etq = ov.querySelector('.cxa-etapa'), barra = ov.querySelector('.cxa-cine-bar i');
        var vistas = Pl.pisos.map(function (pi, i) {
            var ents = dibujarPiso(Pl, pi, 0);
            var fig = el('figure', 'cxa-cine-f', '<figcaption style="--c:' + CURSOR[i % CURSOR.length] + '">' + (NOMBRE_PISO[pi.n] || pi.n + '.º') + ' PISO</figcaption>' + svgPiso(ents, false, true) + '<span class="cxa-cur" style="--c:' + CURSOR[i % CURSOR.length] + '"><i></i><b>' + ordinal(pi.n) + '</b></span>');
            grid.appendChild(fig);
            var nodos = [].slice.call(fig.querySelectorAll('.cxa-e')).sort(function (a, b) { return (+a.getAttribute('data-e') - +b.getAttribute('data-e')) || (+a.getAttribute('data-k') - +b.getAttribute('data-k')); });
            return { fig: fig, svg: fig.querySelector('svg'), nodos: nodos, cur: fig.querySelector('.cxa-cur') };
        });
        var vel = 1, t0 = 0, pausa = false, fin = false, timer = null;
        var DUR = 16000; /* duración total a velocidad 1× */
        function ocultar() { vistas.forEach(function (v) { v.nodos.forEach(function (n) { n.classList.remove('on'); }); v.cur.style.opacity = 0; }); }
        function mostrarTodo() { vistas.forEach(function (v) { v.nodos.forEach(function (n) { n.classList.add('on'); }); v.cur.style.opacity = 0; }); etq.textContent = 'Plano terminado'; barra.style.width = '100%'; fin = true; }
        function paso() {
            if (pausa) return;
            var t = (Date.now() - t0) * vel, frac = Math.min(1, t / DUR);
            barra.style.width = (frac * 100).toFixed(1) + '%';
            var etapaMax = 0;
            vistas.forEach(function (v) {
                var k = Math.floor(frac * v.nodos.length), ult = null;
                for (var i = 0; i < k; i++) { if (!v.nodos[i].classList.contains('on')) { v.nodos[i].classList.add('on'); ult = v.nodos[i]; } }
                if (k > 0) etapaMax = Math.max(etapaMax, +v.nodos[Math.min(k, v.nodos.length) - 1].getAttribute('data-e'));
                var n = ult || v.nodos[Math.max(0, k - 1)];
                if (n && frac < 1) {
                    try {
                        var bb = n.getBBox(), m = n.getCTM && n.ownerSVGElement ? n.ownerSVGElement.getBoundingClientRect() : null, vb = v.svg.viewBox.baseVal;
                        if (m && vb && vb.width) {
                            var sx = m.width / vb.width, sy = m.height / vb.height, fr = v.fig.getBoundingClientRect();
                            v.cur.style.left = (m.left - fr.left + (bb.x + bb.width) * sx) + 'px'; v.cur.style.top = (m.top - fr.top + (bb.y + bb.height) * sy) + 'px'; v.cur.style.opacity = 1;
                        }
                    } catch (e) { }
                }
            });
            etq.textContent = 'Dibujando: ' + NOMBRES_ETAPA[etapaMax];
            if (frac >= 1) { mostrarTodo(); return; }
            timer = setTimeout(paso, 40);
        }
        function iniciar() { clearTimeout(timer); fin = false; ocultar(); t0 = Date.now(); if (reducido) { mostrarTodo(); etq.textContent = 'Plano terminado (animación reducida)'; return; } paso(); }
        function cerrar() { clearTimeout(timer); ov.remove(); doc.removeEventListener('keydown', tecla); }
        function tecla(e) { if (e.key === 'Escape') cerrar(); }
        doc.addEventListener('keydown', tecla);
        ov.addEventListener('click', function (e) {
            var b = e.target.closest('[data-c]'); if (!b) return;
            var c = b.getAttribute('data-c');
            if (c === 'x') cerrar();
            else if (c === 'rep') iniciar();
            else if (c === 'vel') { var t = (Date.now() - t0) * vel; vel = vel === 1 ? 2 : vel === 2 ? 4 : 1; t0 = Date.now() - t / vel; b.textContent = vel + '×'; }
            else accion(c, b);
        });
        setTimeout(iniciar, 350);
        historial('Dibújalo', 'Dibujé las ' + Pl.n + ' plantas en modo cine (ejes, columnas, muros, puertas y ventanas, escalera, mobiliario, textos y cotas).');
        return true;
    }

    /* =================================================================== 7. CAMBIOS PEDIDOS EN EL CHAT */
    function cambios(q) {
        if (!actual) return false;
        var P = JSON.parse(JSON.stringify(actual.P)), hubo = false;
        function todos(fn) { for (var f = 1; f <= P.n; f++) if (P.pisos[f].apto) { fn(P.pisos[f], f); hubo = true; } }
        var m;
        if (/sin estudio|quita(?:r)? (?:el )?estudio|elimina(?:r)? (?:el )?estudio/.test(q)) todos(function (p) { p.estudio = false; });
        else if (/(agrega|anade|con|pon)\w* (?:un )?estudio/.test(q)) todos(function (p, f) { if (f > 1 || !p.cochera) p.estudio = true; });
        if ((m = q.match(/(\d+|un|uno|una|dos|tres|cuatro|cinco|seis)\s*(?:dormitorios?|habitaciones?|alcobas?|cuartos?)/))) { var d = num(m[1]); todos(function (p, f) { if (f > 1 || P.n === 1) p.dorm = d; }); }
        if (/(agrega|anade|otro|un)\w* (?:dormitorio|habitacion|alcoba|cuarto) (?:mas|adicional)|mas dormitorios/.test(q)) todos(function (p) { p.dorm++; });
        if (/(quita|elimina|menos)\w* (?:un )?(?:dormitorio|habitacion|alcoba|cuarto)/.test(q)) todos(function (p) { p.dorm = Math.max(1, p.dorm - 1); });
        if ((m = q.match(/(\d+|un|uno|una|dos|tres|cuatro)\s*banos?/))) { var nb = num(m[1]); todos(function (p) { p.banos = nb; }); }
        else if (/(agrega|anade|otro)\w* (?:un )?bano/.test(q)) todos(function (p) { p.banos++; });
        else if (/(quita|elimina|menos)\w* (?:un )?bano/.test(q)) todos(function (p) { p.banos = Math.max(1, p.banos - 1); });
        if (/cochera simple|un solo (?:carro|auto|puesto)|cochera sencilla/.test(q)) { P.pisos[1].cochera = 1; hubo = true; }
        if (/cochera doble|dos (?:carros|autos|puestos)/.test(q)) { P.pisos[1].cochera = 2; hubo = true; }
        if (/sin cochera|quita(?:r)? la cochera/.test(q)) { P.pisos[1].cochera = 0; P.pisos[1].apto = true; hubo = true; }
        if (/sin lavanderia/.test(q)) todos(function (p) { p.lav = false; });
        if ((m = q.match(/(\d+|dos|tres|cuatro|cinco|seis)\s*pisos/))) {
            var n = Math.max(1, Math.min(8, num(m[1])));
            for (var f = P.n + 1; f <= n; f++) P.pisos[f] = JSON.parse(JSON.stringify(P.pisos[Math.max(1, P.n)]));
            P.pisos.length = n + 1; P.n = n; hubo = true;
        }
        if (!hubo) return false;
        return P;
    }

    /* =================================================================== 8. INTEGRACIÓN CON EL CHAT DE CIVIX */
    /* ---- Modo «Planos» (botón propio junto a Explicar, Pistas, Corregir y Quiz) ----
       En este modo Civix solo atiende pedidos de planos: nada se envía a la IA. */
    var EJEMPLOS = [
        'Hazme un edificio de 4 pisos en un lote de 10 x 20 m. Primer piso: cochera doble y un departamento. Del 2.º al 4.º piso: un departamento de 3 dormitorios.',
        'Casa de 2 pisos con 3 habitaciones y estudio en un lote de 7 x 15 m.',
        'Edificio de 3 pisos en lote de 8 x 18: primer piso local comercial; 2.º y 3.º piso apartamento de 2 alcobas.',
        'Vivienda de 1 piso con 2 dormitorios y cochera en lote de 9 x 16 m.'
    ];
    function enModoPlanos() { return global.__civixModo === 'planos'; }
    var sinBienvenida = false;
    function activarModo() { var b = doc.querySelector('#civixModos [data-modo="planos"]'); if (b && !b.classList.contains('active')) { sinBienvenida = true; b.click(); sinBienvenida = false; } }
    function bienvenida() {
        var c = tarjeta('<div class="civix-md">📐 <b>Modo Planos</b> — describe tu proyecto y te propongo la distribución, la vista previa de cada planta y el dibujo en <b>modo cine</b>, con descarga en DXF, PDF y PNG.<br>' +
            '<small>Indica: número de pisos, medidas del lote (frente × fondo) y qué va en cada piso (cochera, local, departamento, dormitorios, baños, estudio).</small></div>' +
            '<div class="cxa-ejemplos">' + EJEMPLOS.map(function (t) { return '<button type="button" class="cxa-ej" data-cxa-ej>' + esc(t) + '</button>'; }).join('') + '</div>' +
            '<p class="cxa-nota">En este modo Civix solo genera planos. Para dudas de teoría vuelve a «Explicar».</p>');
        if (c) c.addEventListener('click', function (e) {
            var b = e.target.closest('[data-cxa-ej]'); if (!b) return;
            var i = doc.getElementById('inputAsistente'); if (i) { i.value = b.textContent; i.focus(); try { i.dispatchEvent(new Event('input', { bubbles: true })); } catch (ex) { } }
        });
    }
    doc.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('#civixModos [data-modo]'); if (!b) return;
        if (b.getAttribute('data-modo') === 'planos' && !sinBienvenida) {
            var ult = chat() && chat().lastElementChild;
            if (!(ult && ult.querySelector && ult.querySelector('.cxa-ejemplos'))) setTimeout(bienvenida, 0);
        }
    });
    function guia(texto, motivo) {
        tarjeta('<div class="civix-md">📐 ' + esc(motivo) + '<br><small>Ejemplo: «' + esc(EJEMPLOS[0]) + '»</small></div>');
        historial(texto, motivo);
        return true;
    }

    var prevSend = CAD.onSend;
    CAD.onSend = function (texto, adj) {
        try {
            var q = norm(texto).trim();
            if (q && !adj && enModoPlanos()) return modoPlanos(texto, q);
            if (q && !adj && esPedido(q)) {
                /* en otros modos: se sugiere el modo Planos en lugar de que la IA intente dibujar */
                var c = tarjeta('<div class="civix-md">📐 Esto parece un pedido de <b>planos arquitectónicos</b>. El modo <b>Planos</b> lo resuelve con distribución, vista previa y modo cine.</div>' +
                    '<div class="cxa-acts"><button type="button" class="cxa-btn ok" data-cxa-ir>Generar en modo Planos</button></div>');
                if (c) c.addEventListener('click', function (e) { if (!e.target.closest('[data-cxa-ir]')) return; e.target.disabled = true; activarModo(); modoPlanos(texto, q); }, { once: false });
                historial(texto, 'Sugerí usar el modo Planos para este pedido.');
                return true;
            }
        } catch (e) { try { console.warn('Civix planos arquitectónicos', e); } catch (e2) { } }
        return prevSend ? prevSend.apply(this, arguments) : false;
    };
    /* Atiende un mensaje en modo Planos. Siempre devuelve true: en este modo nada va a la IA. */
    function modoPlanos(texto, q) {
        try {
            if (actual && actual.estado === 'aprobado' && /^(dibujalo|dibujala|dibuja(?:lo)?|modo cine|efecto (?:de )?cine|dibuja el plano|hazlo|dale)\b/.test(q)) {
                tarjeta('<div class="civix-md">🎬 Dibujando las ' + actual.Pl.n + ' plantas en modo cine…</div>');
                return cine(actual.Pl);
            }
            if (actual && actual.estado === 'propuesta' && /^(si|ok|apruebo|aprobado|de acuerdo|listo|perfecto)\b/.test(q)) { aprobar(); return true; }
            var tieneLote = /\d+(?:[.,]\d+)?\s*(?:m(?:etros)?\s*)?[x×]\s*\d+(?:[.,]\d+)?/.test(q);
            if (actual && !tieneLote) {
                var P2 = cambios(q);
                if (P2) return propuesta(texto, P2);
            }
            /* en este modo basta con describir el proyecto: no hace falta «hazme» ni «plano» */
            if (tieneLote || /(edificio|casa|vivienda|apartamento|departamento|piso|lote|cochera|dormitorio|habitacion)/.test(q)) {
                var P = leer(texto);
                if (P.error) return guia(texto, P.error);
                return propuesta(texto, P);
            }
            return guia(texto, 'En el modo Planos describo el proyecto que quieres dibujar. Cuéntame cuántos pisos, las medidas del lote (frente × fondo) y qué va en cada piso.');
        } catch (e) {
            try { console.warn('Civix planos arquitectónicos', e); } catch (e2) { }
            return guia(texto, 'No pude interpretar el pedido. Intenta con el formato del ejemplo.');
        }
    }
    CAD.planosArq = { leer: leer, plan: plan, modelo: modelo, tabla: tabla, cine: function () { return actual && cine(actual.Pl); }, actual: function () { return actual; } };
})(typeof window !== 'undefined' ? window : globalThis);
