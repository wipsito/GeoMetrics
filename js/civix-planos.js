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
    var ORD = { primer: 1, primero: 1, primera: 1, segundo: 2, segunda: 2, tercer: 3, tercero: 3, tercera: 3, cuarto: 4, cuarta: 4, quinto: 5, quinta: 5, sexto: 6, sexta: 6, septimo: 7, septima: 7, octavo: 8, octava: 8 };
    function num(s) { if (s == null) return NaN; s = String(s); return NUM[s] != null ? NUM[s] : (ORD[s] != null ? ORD[s] : parseFloat(s.replace(',', '.'))); }
    function ordinal(n) { return n === 1 ? '1.er' : n === 3 ? '3.er' : n + '.º'; }
    var NOMBRE_PISO = ['', 'PRIMER', 'SEGUNDO', 'TERCER', 'CUARTO', 'QUINTO', 'SEXTO', 'SÉPTIMO', 'OCTAVO'];

    /* =================================================================== 1. LECTURA DEL PEDIDO */
    var RE_PISO = '(primer[oa]?|segund[oa]|tercer[oa]?|cuart[oa]|quint[oa]|sext[oa]|septim[oa]|octav[oa]|\\d+)\\s*(?:er|ro|do|to|°|º|\\.º|\\.°)?';

    /* Catálogo de espacios no residenciales: [patrón, nombre, área típica m², tipo de mobiliario, cantidad si va en plural] */
    var ESPACIOS = [
        [/recepcion|lobby|hall de (?:acceso|entrada)|vestibulo/, 'RECEPCIÓN', 16, 'recepcion', 1],
        [/sala(?:s)? de lectura|lectura/, 'SALA DE LECTURA', 48, 'lectura', 1],
        [/zona infantil|sala infantil|ludoteca|area infantil/, 'ZONA INFANTIL', 30, 'infantil', 1],
        [/banos?|sanitarios|servicios sanitarios/, 'BAÑOS', 13, 'banos', 1],
        [/deposito|bodega|almacen/, 'DEPÓSITO', 9, 'deposito2', 1],
        [/ascensor/, 'ASCENSOR', 4, 'ascensor', 1],
        [/salas? de estudio|cubiculos?/, 'SALA DE ESTUDIO', 20, 'estudio2', 2],
        [/informatica|computo|computadores|sistemas|sala de computadores/, 'SALA DE INFORMÁTICA', 40, 'informatica', 1],
        [/sala de (?:juntas|reuniones)/, 'SALA DE REUNIONES', 18, 'reuniones', 1],
        [/oficinas? administrativas?|administracion|oficinas?/, 'OFICINA ADMINISTRATIVA', 13, 'oficina', 2],
        [/terraza|balcon/, 'TERRAZA', 28, 'terraza', 1],
        [/auditorio|salon de actos/, 'AUDITORIO', 70, 'auditorio', 1],
        [/cafeteria|cafe\b|restaurante|comedor/, 'CAFETERÍA', 30, 'cafeteria', 1],
        [/aulas?|salones? de clase/, 'AULA', 45, 'aula', 2],
        [/laboratorios?/, 'LABORATORIO', 45, 'aula', 1],
        [/archivo/, 'ARCHIVO', 10, 'deposito2', 1],
        [/enfermeria|primeros auxilios/, 'ENFERMERÍA', 12, 'oficina', 1],
        [/direccion|rectoria|coordinacion|secretaria|gerencia/, 'DIRECCIÓN', 14, 'oficina', 1],
        [/sala de profesores|sala de docentes/, 'SALA DE PROFESORES', 20, 'reuniones', 1],
        [/cocina|cocineta/, 'COCINETA', 10, 'cocina', 1],
        [/porteria|vigilancia/, 'PORTERÍA', 6, 'oficina', 1],
        [/sala de espera|espera/, 'SALA DE ESPERA', 16, 'recepcion', 1],
        [/consultorios?/, 'CONSULTORIO', 12, 'oficina', 2],
        [/sala de exposicion|exposiciones|galeria/, 'SALA DE EXPOSICIONES', 40, 'lectura', 1],
        [/hemeroteca|videoteca|mediateca/, 'MEDIATECA', 30, 'informatica', 1]
    ];
    var RESIDENCIAL = /cochera|garaje|parqueadero|departamento|apartamento|dormitorio|habitacion|alcoba|recamara|vivienda|apartaestudio|\bcasa\b|local comercial/;
    /* Convierte «recepción, sala de lectura, zona infantil, baños, depósito y escaleras» en espacios */
    function espacios(t) {
        var out = [], conEscalera = /escaleras?|punto fijo/.test(t);
        t = t.replace(/^[^:]*?(contara con|tendra|incluira|llevara|albergara|dispondra de|con|:)\s*/, '');
        t = t.replace(/\s+(?:en|sobre)\s+(?:un\s+|el\s+)?(?:lote|terreno|predio)\b.*$/, '');   /* «… y cafetería en un lote de 15 x 30» */
        t.split(/,|;|\s+y\s+|\s+e\s+|\s+ademas\s+/).forEach(function (raw) {
            var s = raw.trim().replace(/^(?:la|el|los|las|un|una|unos|unas)\s+/, '');
            /* se descartan los fragmentos que no son espacios: medidas, número de pisos, verbos del pedido… */
            if (!s || /escalera|punto fijo/.test(s) || /\blote\b|terreno|predio|\d+\s*(?:m|mts|metros)?\s*(?:x|×|por)\s*\d|\b(?:pisos|niveles|plantas)\b|^(?:dise|dibuj|haz|hazme|quiero|necesito|plano|edificio|edificacion)/.test(s)) return;
            var m = s.match(/^(\d+|dos|tres|cuatro|cinco|seis)\s+/), cant = m ? num(m[1]) : 0;
            var hit = null;
            for (var i = 0; i < ESPACIOS.length; i++) if (ESPACIOS[i][0].test(s)) { hit = ESPACIOS[i]; break; }
            if (!hit) { if (s.split(/\s+/).length > 5) return; hit = [null, s.toUpperCase(), 15, 'gen', 1]; }
            var plural = /s\b/.test(s.split(/\s+de\s+/)[0]) && !/banos/.test(s);
            var n = cant || (plural ? hit[4] : 1);
            out.push({ nombre: hit[1], area: hit[2], tipo: hit[3], n: Math.max(1, Math.min(6, n)) });
        });
        return { lista: out, escalera: conEscalera };
    }
    function esPedido(q) {
        if (/^(que es|que son|como funciona|cual es|por que|explica|define)\b/.test(q.trim())) return false;
        var arq = /(edificio|casa|vivienda|apartamento|departamento|apartaestudio|multifamiliar|bifamiliar|unifamiliar)/.test(q);
        var lote = /lote|terreno|predio/.test(q) || /\d+(?:[.,]\d+)?\s*(?:m\s*)?[x×]\s*\d+(?:[.,]\d+)?/.test(q);
        var verbo = /(hazme|haz|dise[nñ]|dibuj|genera|crea|elabora|plano|planta|distribuci|quiero|necesito|propon)/.test(q);
        return arq && lote && verbo && !/(zapata|viga|columna|losa|muro de contencion|cercha|pilote|escalera de concreto)/.test(q);
    }
    function programa(t, base, residencial) {
        var p = base ? JSON.parse(JSON.stringify(base)) : { cochera: 0, local: false, apto: false, dorm: 0, banos: 0, estudio: false, lav: true };
        if (/cochera|garaje|garage|parqueadero|estacionamiento/.test(t)) p.cochera = /doble|dos (?:carros|autos|vehiculos|puestos)|2 (?:carros|autos|vehiculos|puestos)/.test(t) ? 2 : 1;
        if (/local|comercio|tienda/.test(t)) p.local = true;
        if (/departamento|apartamento|vivienda|apartaestudio|casa/.test(t)) p.apto = true;
        var m = t.match(/(\d+|un|uno|una|dos|tres|cuatro|cinco|seis)\s*(?:dormitorios?|habitaciones?|alcobas?|cuartos?|recamaras?)/);
        if (m) { p.dorm = num(m[1]); p.apto = true; }
        m = t.match(/(\d+|un|uno|una|dos|tres|cuatro)\s*banos?/); if (m) p.banos = num(m[1]);
        if (/estudio|oficina/.test(t) && !/apartaestudio/.test(t)) p.estudio = true;
        if (/sin lavanderia/.test(t)) p.lav = false;
        /* vivienda: un piso con sala, comedor o cocina y sin dormitorios es la zona social de la casa */
        if (residencial && /\bsala\b|comedor|cocina|estar/.test(t) && !/(dormitorio|habitacion|alcoba|recamara|cuarto)/.test(t)) {
            p.apto = true; p.casaSocial = true; p.dorm = 0; p.sinDorm = true; if (!p.banos) p.banos = 1;
        }
        /* programa no residencial (biblioteca, oficinas, colegio, centro de salud…): lista de espacios */
        if (!residencial && !RESIDENCIAL.test(t)) {
            var e = espacios(t);
            if (e.lista.length) { p.gen = e.lista; p.escalera = e.escalera; p.apto = false; p.estudio = false; }
        }
        return p;
    }
    /* números escritos en palabras → cifras («doce por veinte» → «12 por 20»), sin tocar «un/una» */
    var PALABRAS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciseis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
        'veintiuno', 'veintidos', 'veintitres', 'veinticuatro', 'veinticinco', 'veintiseis', 'veintisiete', 'veintiocho', 'veintinueve', 'treinta'];
    function cifras(q) {
        q = q.replace(/\b(treinta|cuarenta|cincuenta)\s+y\s+(uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g, function (s, d, u) { return String({ treinta: 30, cuarenta: 40, cincuenta: 50 }[d] + PALABRAS.indexOf(u)); });
        q = q.replace(/\b(cuarenta|cincuenta)\b/g, function (s) { return s === 'cuarenta' ? '40' : '50'; });
        return q.replace(/\b[a-z]+\b/g, function (w) { var i = PALABRAS.indexOf(w); return i > 1 ? String(i) : w; });
    }
    var N_ = '(\\d+(?:[.,]\\d+)?)';
    /* medidas del lote en las formas habituales; si solo hay área, se supone un lote 1:2 */
    function medidasLote(q) {
        var m;
        if ((m = q.match(new RegExp(N_ + '\\s*(?:m|mts|metros)?\\s*(?:de\\s+frente\\s*)?(?:x|×|\\*|por)\\s*' + N_ + '(?!\\s*(?:pisos|niveles|plantas))')))) return { W: num(m[1]), L: num(m[2]) };
        if ((m = q.match(new RegExp('frente\\s*(?:de|:)?\\s*' + N_ + '[^\\d]{0,40}?fondo\\s*(?:de|:)?\\s*' + N_)))) return { W: num(m[1]), L: num(m[2]) };
        if ((m = q.match(new RegExp(N_ + '\\s*(?:m|mts|metros)?\\s*de\\s+frente[^\\d]{0,40}?' + N_ + '\\s*(?:m|mts|metros)?\\s*de\\s+fondo')))) return { W: num(m[1]), L: num(m[2]) };
        if ((m = q.match(new RegExp('fondo\\s*(?:de|:)?\\s*' + N_ + '[^\\d]{0,40}?frente\\s*(?:de|:)?\\s*' + N_)))) return { W: num(m[2]), L: num(m[1]) };
        if ((m = q.match(new RegExp(N_ + '\\s*(?:m2|m²|mts2|metros cuadrados|metros2)')))) {
            var A = num(m[1]); if (A > 20) { var w = Math.round(Math.sqrt(A / 2) * 2) / 2; return { W: w, L: Math.round(A / w * 2) / 2, area: A }; }
        }
        return null;
    }
    function leer(texto) {
        var q = cifras(norm(texto)), supuesto = '';
        var dims = medidasLote(q), W, L, m;
        if (dims) { W = dims.W; L = dims.L; if (dims.area) supuesto = 'Con un área de ' + dims.area + ' m² supuse un lote de ' + f2(W) + ' × ' + f2(L) + ' m (frente × fondo). Si tus medidas son otras, escríbelas así: «lote de 8 x 15 m».'; }
        if (!(W > 0) || !(L > 0)) {
            /* sin medidas: se propone un lote típico para el tipo de proyecto y se avisa */
            var publico = !RESIDENCIAL.test(q) && /(biblioteca|escuela|colegio|oficina|centro|clinica|auditorio|aula|recepcion|consultorio|comercial|tienda|laboratorio)/.test(q);
            W = publico ? 12 : 8; L = publico ? 20 : 16;
            supuesto = 'No indicaste las medidas del lote, así que supuse un lote de ' + W + ' × ' + L + ' m (frente × fondo). Si es otro, escríbelo así: «lote de 10 x 20 m».';
        }
        if (W > L) { var tmp = W; W = L; L = tmp; }
        if (W < 4 || L < 6 || W > 60 || L > 120) return { error: 'Las medidas del lote (' + f2(W) + ' × ' + f2(L) + ' m) no parecen de un lote. Escríbelas así: «lote de 10 x 20 m» (frente × fondo).' };
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
        /* «la segunda tendrá…», «el tercero contará con…» (sin repetir la palabra piso/planta) */
        var reLa = /\b(?:la|el)\s+(primer[oa]?|segund[oa]|tercer[oa]?|cuart[oa]|quint[oa])\s+(?=tendra|contara|incluira|llevara|albergara|dispondra)/g;
        while ((mm = reLa.exec(q))) {
            var dentro2 = marcas.some(function (k) { return mm.index >= k.i - 3 && mm.index < k.fin; });
            if (!dentro2) marcas.push({ i: mm.index, fin: reLa.lastIndex, a: num(mm[1]), b: num(mm[1]) });
        }
        /* «planta baja / primer nivel», «planta alta / último piso», «nivel 2:», «piso 3:» */
        var reBaja = /planta baja|primer nivel|\bpb\b|nivel 1\b|piso 1\b/g, reAlta = /planta alta|ultimo piso|ultima planta|ultimo nivel/g, reNum = /\b(?:piso|nivel|planta)\s+(\d)\b\s*:?/g;
        function marca(re, a) {
            var x; while ((x = re.exec(q))) {
                var ini = x.index, fin = re.lastIndex;
                if (!marcas.some(function (k) { return ini >= k.i - 2 && ini < k.fin + 2; })) { var v = a != null ? a : num(x[1]); marcas.push({ i: ini, fin: fin, a: v, b: v }); }
            }
        }
        marca(reBaja, 1); marca(reAlta, n); marca(reNum, null);
        marcas.sort(function (a, b) { return a.i - b.i; });
        var residencial = RESIDENCIAL.test(q) || (/\bsala\b|comedor|cocina|alcoba/.test(q) && !/(biblioteca|escuela|colegio|oficinas|centro|clinica|auditorio|aula|consultorio)/.test(q));
        var general = programa(q.replace(/(?:del?\s+)?(?:primer|segundo|tercer|cuarto|quinto|\d)[^.;]*?piso[^.;]*[.;]?/g, ' '), null, residencial);
        /* lo que se pide para «el resto» (p. ej. «apartamentos de 2 habitaciones arriba») vale para los pisos sin indicación */
        var todo = programa(q, null, residencial);
        if (!general.dorm && todo.dorm) { general.dorm = todo.dorm; general.apto = true; }
        if (!general.banos && todo.banos) general.banos = todo.banos;
        marcas.forEach(function (k, j) {
            var txt = q.slice(k.fin, j + 1 < marcas.length ? marcas[j + 1].i : q.length);
            txt = txt.split(/\.\s+|\.$|\n\s*\n|;\s*(?=planta|piso|nivel)/)[0];   /* el programa del piso termina con la frase */
            var p = programa(txt, null, residencial);
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
        /* «local comercial / cochera en el primer piso (o planta baja)» escrito antes del piso */
        var enPrimero = /(local(?: comercial)?|comercio|tienda|cochera|garaje|parqueadero)[^.;]{0,30}?(?:en el |en la )?(?:primer piso|planta baja|primer nivel)/.exec(q);
        if (enPrimero && pisos[1] && !residencialPiso1(pisos[1])) {
            if (/cochera|garaje|parqueadero/.test(enPrimero[1])) pisos[1].cochera = pisos[1].cochera || 1;
            else { pisos[1].local = true; pisos[1].apto = false; pisos[1].dorm = 0; }
            pisos[1].gen = null;
        }
        function residencialPiso1(p) { return p.cochera && p.apto; }
        var escala = (q.match(/escala\s*(?:de\s*)?1\s*[:\/]\s*(\d{2,3})/) || [])[1];
        var generico = pisos.some(function (p) { return p && p.gen; });
        /* edificio no residencial descrito solo por su uso («edificio de oficinas de 3 niveles»): programa típico */
        var PLANTILLAS = [
            [/oficina/, ['recepcion', 'oficina x4', 'sala de reuniones', 'banos', 'cocineta'], ['oficina x5', 'sala de reuniones', 'banos', 'archivo']],
            [/biblioteca/, ['recepcion', 'sala de lectura', 'zona infantil', 'banos', 'deposito'], ['salas de estudio', 'informatica', 'oficina', 'banos']],
            [/escuela|colegio/, ['recepcion', 'direccion', 'aula x2', 'banos', 'cafeteria'], ['aula x3', 'laboratorio', 'banos']],
            [/clinica|centro de salud|consultorio/, ['recepcion', 'sala de espera', 'consultorio x3', 'banos', 'enfermeria'], ['consultorio x4', 'oficina', 'banos']]
        ];
        var usoPlantilla = false;
        if (!residencial) PLANTILLAS.forEach(function (pl) {
            if (!pl[0].test(q) || usoPlantilla) return;
            for (var f3 = 1; f3 <= n; f3++) {
                var pp3 = pisos[f3];
                if (pp3 && pp3.gen && pp3.gen.length > 1) continue;
                usoPlantilla = true;
                var lista = (f3 === 1 ? pl[1] : pl[2]).map(function (t) { var mm2 = t.match(/^(.*) x(\d)$/); return mm2 ? mm2[2] + ' ' + mm2[1] : t; }).join(', ');
                var e = espacios('con ' + lista);
                pisos[f3] = { gen: e.lista, escalera: n > 1, apto: false, cochera: 0, local: false, plantilla: true };
            }
            generico = true;
            if (usoPlantilla) supuesto = (supuesto ? supuesto + ' ' : '') + 'Como no detallaste los espacios de cada piso, usé un programa típico para este uso; puedes pedir cambios en el chat.';
        });
        if (generico) {
            for (var g = 1; g <= n; g++) { var pg = pisos[g]; if (!pg.gen) { pg.gen = []; pg.apto = false; pg.cochera = 0; pg.local = false; } }
            return { W: W, L: L, n: n, pisos: pisos, texto: texto, generico: true, escala: escala ? '1:' + escala : null, supuesto: supuesto };
        }
        /* valores por defecto razonables (todo se puede cambiar antes de aprobar) */
        for (var k2 = 1; k2 <= n; k2++) {
            var pp = pisos[k2];
            if (!pp.apto && !pp.cochera && !pp.local) pp.apto = true;
            if (pp.apto && !pp.dorm && !pp.sinDorm) pp.dorm = (pp.cochera || pp.local) ? 2 : 3;
            if (pp.apto && !pp.banos) pp.banos = pp.dorm >= 3 ? 2 : 1;
            if (esCasa && n > 1) { /* casa: social abajo, dormitorios arriba (una sola vivienda: la cocina va solo en el primer piso) */
                if (k2 === 1) { pp.casaSocial = true; pp.dorm = pp.sinDorm ? 0 : Math.min(pp.dorm, 1); pp.banos = 1; }
                else { pp.casaUp = true; pp.casaSocial = false; pp.apto = true; if (!pp.dorm) pp.dorm = 3; }
            }
        }
        return { W: W, L: L, n: n, pisos: pisos, texto: texto, esCasa: esCasa, escala: escala ? '1:' + escala : null, supuesto: supuesto };
    }

    /* =================================================================== 2. DISTRIBUCIÓN */
    var MURO = 0.15, MURO_EXT = 0.25, ESC_W = 2.6, ESC_D = 3.1, PASILLO = 1.1, PAS_H = 1.2;
    /* Programa no residencial: corredor central de 1.60 m a lo largo del fondo; a la derecha, escalera y
       baños en la misma posición en todos los pisos (punto fijo e instalaciones alineadas); el resto de
       espacios se reparte por área entre las dos crujías. */
    function planGen(P) {
        var W = P.W, L = P.L, warns = [], cw = W >= 9 ? 1.6 : 1.3;
        var a = Math.max(3, (W - cw) * 0.52), b = W - cw - a;
        var conEsc = P.n > 1 || P.pisos.some(function (p) { return p.escalera; });
        var ESC_H = 3.6, BAN_H = Math.max(2.6, 13 / b);
        var hayBanos = function (p) { return p.gen.some(function (e) { return e.tipo === 'banos'; }); };
        var algunBano = P.pisos.some(function (p, i) { return i && hayBanos(p); });
        /* profundidad fija del punto fijo (escalera + baños), igual en todos los pisos */
        var fijo = (conEsc ? ESC_H : 0) + (algunBano ? BAN_H : 0);
        var cols = [];
        var maxD = 0;
        for (var f = 1; f <= P.n; f++) {
            var p = P.pisos[f], izq = [], der = [], sI = 0, sD = fijo;
            var items = [];
            p.gen.forEach(function (e) {
                if (e.tipo === 'banos') return;
                for (var k = 1; k <= e.n; k++) items.push({ nombre: e.n > 1 ? e.nombre + ' ' + k : e.nombre, area: e.area, tipo: e.tipo });
            });
            var rec = items.filter(function (e) { return e.tipo === 'recepcion'; }), ter = items.filter(function (e) { return e.tipo === 'terraza'; });
            items = items.filter(function (e) { return e.tipo !== 'recepcion' && e.tipo !== 'terraza'; }).sort(function (x, y) { return y.area - x.area; });
            rec.forEach(function (e) { e.h = Math.max(2.6, e.area / a); izq.push(e); sI += e.h; });
            items.concat(ter).forEach(function (e) {
                var hI = Math.max(2.6, e.area / a), hD = Math.max(2.6, e.area / b);
                if (sI + hI <= sD + hD) { e.h = hI; izq.push(e); sI += hI; } else { e.h = hD; der.push(e); sD += hD; }
            });
            /* reequilibrio: si una crujía no cabe en el fondo y la otra tiene espacio, se mueve el espacio que mejor encaje */
            for (var it = 0; it < 6 && Math.max(sI, sD) > L; it++) {
                var deIzq = sI > sD, origen = deIzq ? izq : der, wO = deIzq ? a : b, wD = deIzq ? b : a, libre = L - (deIzq ? sD : sI);
                var cand = origen.filter(function (e) { return e.tipo !== 'recepcion' && Math.max(2.6, e.area / wD) <= libre; }).sort(function (x, y) { return y.area - x.area; })[0];
                if (!cand) break;
                origen.splice(origen.indexOf(cand), 1);
                var hN = Math.max(2.6, cand.area / wD);
                if (deIzq) { sI -= cand.h; cand.h = hN; der.push(cand); sD += hN; } else { sD -= cand.h; cand.h = hN; izq.push(cand); sI += hN; }
            }
            cols[f] = { izq: izq, der: der, sI: sI, sD: sD, banos: hayBanos(p) };
            maxD = Math.max(maxD, sI, sD);
        }
        var D = maxD;
        if (D > L) {
            var k = (L - fijo) / (D - fijo);
            if (k < 0.8) warns.push('El programa pide más área de la que cabe en ' + f2(W) + ' × ' + f2(L) + ' m: las áreas se redujeron un ' + Math.round((1 - k) * 100) + ' %. Considera otro piso o menos espacios.');
            D = L;
        }
        if (!(D > 0)) D = Math.min(L, 10);
        var pisos = [];
        for (f = 1; f <= P.n; f++) {
            var c = cols[f], R = [];
            R.push(rm('CIRCULACIÓN', a, 0, cw, D, 'pasillo'));
            /* crujía derecha: punto fijo arriba (frente) y luego espacios */
            var y = 0;
            if (conEsc) { R.push(rm('ESCALERA', a + cw, y, b, ESC_H, 'escalera')); y += ESC_H; }
            if (algunBano) { R.push(rm(c.banos ? 'BAÑOS' : 'DEPÓSITO', a + cw, y, b, BAN_H, c.banos ? 'banos' : 'deposito2')); y += BAN_H; }
            llenar(c.der, a + cw, b, y, D - y, R);
            llenar(c.izq, 0, a, 0, D, R);
            if (f === 1 && L - D >= 1) R.push(rm('ZONA VERDE / RETIRO', 0, D, W, L - D, 'patio'));
            pisos.push({ n: f, rooms: R, p: P.pisos[f] });
        }
        function llenar(lista, x, w, y0, H, R) {
            if (!lista.length) { if (H > 0.5) R.push(rm('ÁREA LIBRE', x, y0, w, H, 'libre')); return; }
            var tot = lista.reduce(function (s, e) { return s + e.h; }, 0), k = Math.min(H / tot, 1.3), yy = y0;
            var hs = lista.map(function (e) { return e.h * k; });
            if (tot > H) {
                /* falta fondo: se recorta primero a los espacios grandes, sin bajar de 2.60 m */
                var falta = tot - H, holgura = lista.reduce(function (s, e) { return s + Math.max(0, e.h - 2.6); }, 0);
                hs = holgura > falta ? lista.map(function (e) { return e.h - Math.max(0, e.h - 2.6) / holgura * falta; }) : lista.map(function (e) { return e.h * H / tot; });
            }
            lista.forEach(function (e, i) { var h = hs[i]; R.push(rm(e.nombre, x, yy, w, h, e.tipo)); yy += h; });
            if (y0 + H - yy > 0.5) R.push(rm('ÁREA LIBRE', x, yy, w, y0 + H - yy, 'libre'));
            else if (R.length) R[R.length - 1].h += y0 + H - yy;
        }
        return { W: W, L: L, D: D, patio: L - D, a: a, b: b, cw: cw, wl: a, ws: b, hA: 0, hB: 0, pisos: pisos, warns: warns, n: P.n, generico: true, escala: P.escala };
    }

    function plan(P) {
        if (P.generico) return planGen(P);
        var W = P.W, L = P.L, warns = [];
        if (W < 5.5) warns.push('Un frente de ' + f2(W) + ' m es muy angosto: la distribución queda muy apretada.');
        var ws = W >= 7 ? ESC_W : 2.4;          /* franja de circulación (escalera / ingreso / estudio) a la derecha */
        var wl = W - ws;
        var a = Math.max(2.6, (W - PASILLO) * 0.55), b = W - PASILLO - a; /* columnas de cuartos a cada lado del pasillo */
        /* celdas de la zona de cuartos para cada piso */
        function celdas(p) {
            var izq = [], der = [];
            var lista = [];
            if (p.casaSocial) { if (p.cochera) lista.push(['SALA', 4.0]); lista.push(['COMEDOR', 3.4]); if (p.estudio) lista.push(['ESTUDIO', 3.0]); }
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
            for (f = P.n; f >= 1 && !hizo; f--) { var pf = P.pisos[f]; if (pf.banos > 1) { pf.banos--; quitados.push('quité un baño del ' + ordinal(f) + ' piso'); hizo = true; } }
            /* casa: antes de quitar un dormitorio del piso alto se intenta bajarlo al primer piso (una sola vivienda) */
            var p1 = P.pisos[1];
            if (!hizo && p1 && p1.casaSocial && P.n > 1 && !p1._bajados) {
                for (f = P.n; f >= 2 && !hizo; f--) { var pa = P.pisos[f]; if (pa.dorm > 1 && (p1.dorm || 0) < 1) { pa.dorm--; p1.dorm = (p1.dorm || 0) + 1; p1.apto = true; p1._bajados = true; quitados.push('bajé un dormitorio del ' + ordinal(f) + ' piso al 1.er piso'); hizo = true; } }
            }
            for (f = P.n; f >= 1 && !hizo; f--) { var pg = P.pisos[f]; if (pg.dorm > 1) { pg.dorm--; quitados.push('quité un dormitorio del ' + ordinal(f) + ' piso'); hizo = true; } }
            if (!hizo) break;
            medir();
        }
        if (quitados.length) warns.push('Para respetar medidas mínimas en un fondo de ' + f2(L) + ' m ' + quitados.join(', ') + '. Si lo necesitas, pide un lote más profundo o más pisos.');
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
                R.push(rm(p.cochera ? (p.cochera === 2 ? 'COCHERA DOBLE' : 'COCHERA') : 'SALA', 0, 0, wl, hA, p.cochera ? 'cochera' : 'sala', p.cochera));
                R.push(rm('INGRESO', wl, 0, ws, hA, 'ingreso'));
            } else if (p.casaUp) {
                R.push(rm('ESTAR FAMILIAR', 0, 0, wl, hA, 'sala'));
                R.push(rm(p.estudio ? 'ESTUDIO' : 'HALL', wl, 0, ws, hA, p.estudio ? 'estudio' : 'ingreso'));
            } else {
                R.push(rm('SALA-COMEDOR', 0, 0, wl, hA, 'sala'));
                R.push(rm(p.estudio ? 'ESTUDIO' : (f === 1 ? 'INGRESO' : 'HALL'), wl, 0, ws, hA, p.estudio ? 'estudio' : 'ingreso'));
            }
            y0 = hA;
            /* franja B: cocina, lavandería y escalera (se repiten en todos los pisos: instalaciones y escalera alineadas) */
            var lavW = p.lav && wl > 5 ? 1.4 : 0;
            if (p.casaUp) {
                /* piso alto de una casa: sobre la cocina va un baño social y un depósito/ropería (instalaciones alineadas) */
                R.push(rm('BAÑO SOCIAL', 0, y0, Math.min(2.6, wl * 0.45), hB, 'bano'));
                R.push(rm('ROPERÍA', Math.min(2.6, wl * 0.45), y0, wl - Math.min(2.6, wl * 0.45), hB, 'deposito'));
            } else if (p.apto || p.casaSocial) {
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
            /* un sobrante pequeño se reparte entre los ambientes; solo uno amplio (≥ 1.8 m) se vuelve depósito */
            if (sobra >= 1.8) { col = col.concat([['DEPÓSITO', sobra / k]]); tot = sum(col); }
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
        return { W: W, L: L, D: D, patio: patio, ws: ws, wl: wl, a: a, b: b, hA: hA, hB: hB, pisos: pisos, warns: warns, n: P.n, escala: P.escala };
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
        var ex, ey, y;
        if (Pl.generico) {
            /* ejes en los bordes del corredor; luces de máximo ~5.5 m a lo largo del fondo */
            ex = [0, Pl.a, Pl.a + Pl.cw, W];
            var nv = Math.max(2, Math.ceil(Pl.D / 5.5)); ey = [];
            for (var iy = 0; iy <= nv; iy++) ey.push(Pl.D * iy / nv);
        } else {
            ex = [0, W]; if (W >= 7) ex.splice(1, 0, Pl.a + PASILLO / 2 > W - 1.5 ? W / 2 : Pl.wl);
            if (W >= 12) ex.splice(1, 0, Pl.wl / 2);
            ey = [0, Pl.hA, Pl.hA + Pl.hB + PAS_H]; y = ey[ey.length - 1];
            while (Pl.D - y > 4.6) { y += Math.min(4.2, (Pl.D - y) / Math.ceil((Pl.D - y) / 4.2)); ey.push(y); }
            if (Math.abs(ey[ey.length - 1] - Pl.D) > 0.05) ey.push(Pl.D);
        }
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
                case 'pasillo':
                    if (Pl.generico && pi.n === 1 && r.y < 0.01) { var aw = Math.min(1.2, (r.w - 0.3) / 2); puerta(r.x + 0.15, 0.12, aw, 'up'); puerta(r.x + r.w - 0.15 - aw, 0.12, aw, 'up'); txt('TEXTO', r.x + r.w / 2, -0.3, 0.13, 'ACCESO'); }
                    break;
                case 'recepcion': case 'lectura': case 'infantil': case 'banos': case 'estudio2': case 'informatica': case 'reuniones': case 'oficina':
                case 'auditorio': case 'cafeteria': case 'aula': case 'gen': case 'terraza': case 'libre':
                case 'dorm': case 'dormp': case 'bano': case 'comedor': case 'otro': case 'deposito2': {
                    if (r.tipo === 'libre' && !Pl.generico) break;
                    if (Pl.generico && r.tipo !== 'bano') dw = r.h > 6 ? 1.0 : 0.9;
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
        txt('TEXTO', W / 2, -3.05, 0.17, 'NPT ' + (pi.n === 1 ? '±0.00' : '+' + f2((pi.n - 1) * (Pl.generico ? 3.2 : 2.7))) + ' · ESC. ' + (Pl.escala || '1:75') + ' · ANTEPROYECTO');
        return ents;
    }
    function mobiliario(r, rect, ln, circ, arco) {
        var M = 'MOBILIARIO', x = r.x, y = r.y, w = r.w, h = r.h, cx = x + w / 2, cy = y + h / 2;
        /* mesas de trabajo con sillas a ambos lados, en retícula, dejando circulación junto a la puerta */
        function mesas(tw, th, gap) {
            for (var my = y + 0.9; my + th + 0.45 < y + h - 0.4; my += th + gap + 0.5)
                for (var mx = x + 0.5; mx + tw < x + w - 0.4; mx += tw + gap) {
                    rect(M, mx, my, tw, th);
                    for (var sI = 0; sI < Math.floor(tw / 0.6); sI++) { rect(M, mx + 0.1 + sI * 0.6, my - 0.42, 0.38, 0.32); rect(M, mx + 0.1 + sI * 0.6, my + th + 0.1, 0.38, 0.32); }
                }
        }
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
            /* ---- espacios no residenciales ---- */
            case 'recepcion': {                                                      /* mostrador en L y sillas de espera */
                var mw = Math.min(2.6, w - 1.2); rect(M, x + 0.5, y + 0.9, mw, 0.6); rect(M, x + 0.5, y + 1.5, 0.6, 0.9);
                for (var s = 0; s < Math.min(4, Math.floor((w - 1) / 0.6)); s++) rect(M, x + 0.5 + s * 0.6, y + h - 0.8, 0.45, 0.45);
                break;
            }
            case 'lectura': case 'estudio2': case 'cafeteria': case 'reuniones': mesas(1.6, 0.8, 1.0); break;
            case 'infantil': {                                                       /* mesas redondas bajas y alfombra */
                rect(M, x + 0.4, y + h - 2.2, Math.min(2.4, w - 0.8), 1.8);
                for (var ix = x + 1.0; ix < x + w - 0.6; ix += 1.6) for (var iy2 = y + 1.0; iy2 < y + h - 2.6; iy2 += 1.6) { circ(M, ix, iy2, 0.45); [0, 1, 2, 3].forEach(function (q) { var an = q * Math.PI / 2; circ(M, ix + 0.68 * Math.cos(an), iy2 + 0.68 * Math.sin(an), 0.14); }); }
                break;
            }
            case 'informatica': case 'aula': {                                       /* filas de puestos y tablero */
                ln(M, x + w * 0.2, y + h - 0.25, x + w * 0.8, y + h - 0.25);
                for (var fy = y + 0.6; fy < y + h - 1.6; fy += 1.4) for (var fx = x + 0.4; fx + 1.2 < x + w - 0.3; fx += 1.4) {
                    rect(M, fx, fy, 1.2, 0.55); circ(M, fx + 0.6, fy - 0.25, 0.18);
                    if (r.tipo === 'informatica') rect(M, fx + 0.35, fy + 0.25, 0.5, 0.2);
                }
                break;
            }
            case 'oficina': {
                rect(M, x + 0.4, y + 0.7, Math.min(1.5, w - 0.8), 0.7); circ(M, x + 0.4 + Math.min(1.5, w - 0.8) / 2, y + 0.4, 0.22);
                rect(M, x + w - 0.6, y + 0.4, 0.4, Math.min(1.8, h - 0.8)); rect(M, x + 0.4, y + h - 1.0, 0.45, 0.45); rect(M, x + 0.95, y + h - 1.0, 0.45, 0.45);
                break;
            }
            case 'banos': {                                                          /* batería: cabinas con sanitario y mesón de lavamanos */
                var nc = Math.max(1, Math.min(4, Math.floor((w - 0.6) / 1.0)));
                for (var cI = 0; cI < nc; cI++) { var cx0 = x + 0.3 + cI * 1.0; rect(M, cx0, y + h - 1.6, 0.95, 1.45); circ(M, cx0 + 0.47, y + h - 0.55, 0.2); }
                rect(M, x + 0.3, y + 0.3, Math.min(nc * 1.0, w - 0.6), 0.5);
                for (var lI = 0; lI < nc; lI++) circ(M, x + 0.8 + lI * 1.0, y + 0.55, 0.13);
                break;
            }
            case 'deposito2': rect(M, x + 0.2, y + 0.2, 0.45, h - 0.4); if (w > 2) rect(M, x + w - 0.65, y + 0.2, 0.45, h - 0.4); break;
            case 'auditorio': for (var ay = y + 1.0; ay < y + h - 1.5; ay += 0.9) ln(M, x + 0.6, ay, x + w - 0.6, ay); rect(M, x + w * 0.2, y + h - 1.2, w * 0.6, 0.9); break;
            case 'terraza': {
                for (var tI = 0; tI < 4; tI++) circ(M, x + w * (tI + 0.5) / 4, y + h - 0.5, 0.3);
                for (var px2 = x + 0.5; px2 < x + w - 0.3; px2 += 0.6) ln(M, px2, y + 0.4, px2, y + h - 1.0);   /* pérgola */
                break;
            }
            case 'ascensor': rect(M, x + 0.3, y + 0.3, w - 0.6, h - 0.6); ln(M, x + 0.3, y + 0.3, x + w - 0.3, y + h - 0.3); ln(M, x + w - 0.3, y + 0.3, x + 0.3, y + h - 0.3); break;
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
        var out = ['<svg class="cxpl-svg" viewBox="0 0 ' + w.toFixed(2) + ' ' + h.toFixed(2) + '" xmlns="http://www.w3.org/2000/svg" role="img">'];
        ents.forEach(function (e, i) {
            var c = col[e.layer] || '#94a3b8', at = conIndices ? ' data-k="' + i + '" data-e="' + ETAPA[e.layer] + '" class="cxpl-e"' : '';
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
    function tarjeta(html) { var c = chat(); if (!c) return null; var m = el('div', 'mensaje mensaje-bot mensaje-bot-rich cx-card cxpl-card', html); c.appendChild(m); c.scrollTop = c.scrollHeight; return m; }
    function resumenPisos(P) {
        var out = [];
        for (var f = 1; f <= P.n; f++) {
            var p = P.pisos[f], t = [];
            if (p.gen) { out.push(ordinal(f) + ' piso: ' + (p.gen.length ? p.gen.map(function (e) { return (e.n > 1 ? e.n + ' × ' : '') + e.nombre.toLowerCase(); }).join(', ') : 'área libre')); continue; }
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
            '<div class="cxpl-tbl-wrap"><table class="cxpl-tbl"><thead><tr><th>Ambiente</th><th>Medidas (m)</th><th>Piso</th></tr></thead><tbody>' +
            filas.map(function (r, i) { return '<tr style="--i:' + i + '"><td>' + esc(r.nombre) + '</td><td>' + f2(r.w) + ' × ' + f2(r.h) + '</td><td>' + esc(r.txt) + '</td></tr>'; }).join('') +
            '</tbody></table></div>' +
            (P.supuesto ? '<p class="cxpl-sup">ℹ️ ' + esc(P.supuesto) + '</p>' : '') +
            (Pl.warns.length ? Pl.warns.map(function (w) { return '<p class="cxp-warn">⚠ ' + esc(w) + '</p>'; }).join('') : '') +
            '<p class="cxpl-q">¿Apruebas la distribución? También puedes pedir cambios en el chat: <i>«sin estudio», «agrega un baño», «4 dormitorios», «cochera simple»</i>.</p>' +
            '<div class="cxpl-acts"><button type="button" class="cxpl-btn ok" data-cxpl="aprobar">Sí, aprobado ✓</button><button type="button" class="cxpl-btn" data-cxpl="cambiar">Quiero cambiar algo</button></div>' +
            '<p class="cxpl-nota">Anteproyecto orientativo generado por reglas de distribución. No reemplaza el diseño arquitectónico y estructural firmado por un profesional ni la revisión de la norma local (POT, NSR-10).</p>');
        if (!c) return false;
        c.addEventListener('click', function (e) {
            var b = e.target.closest('[data-cxpl]'); if (!b) return;
            if (b.getAttribute('data-cxpl') === 'aprobar') { c.querySelectorAll('[data-cxpl]').forEach(function (x) { x.disabled = true; }); aprobar(); }
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
        var c = tarjeta('<div class="civix-md"><span class="cxpl-ok">Distribución aprobada · vista previa lista</span></div>' +
            '<div class="cxpl-prev-h">VISTA PREVIA DE CADA PLANTA</div>' +
            '<div class="cxpl-prev">' + unicos.map(function (u) {
                var ents = dibujarPiso(Pl, u.pi, 0);
                return '<figure>' + svgPiso(ents, true, false) + '<figcaption>' + (u.pisos.length > 1 ? ordinal(u.pisos[0]) + ' a ' + ordinal(u.pisos[u.pisos.length - 1]) : ordinal(u.pisos[0])) + ' PISO</figcaption></figure>';
            }).join('') + '</div>' +
            '<div class="cxpl-cambio"><b>¿Quieres cambiar algo?</b><span>Se corrige antes de dibujar: escríbelo en el chat.</span></div>' +
            '<div class="cxpl-acts"><button type="button" class="cxpl-btn ok" data-cxpl="cine">🎬 Dibujar en modo cine</button>' +
            '<button type="button" class="cxpl-btn" data-cxpl="dxf">⬇ DXF</button><button type="button" class="cxpl-btn" data-cxpl="pdf">⬇ PDF</button><button type="button" class="cxpl-btn" data-cxpl="png">⬇ PNG</button></div>' +
            '<p class="cxpl-nota">También puedes escribir «dibújalo».</p>');
        if (c) c.addEventListener('click', function (e) { var b = e.target.closest('[data-cxpl]'); if (b) accion(b.getAttribute('data-cxpl'), b); });
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
        var ov = el('div', 'cxpl-cine');
        ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Modo cine: dibujo de las plantas');
        ov.innerHTML = '<div class="cxpl-cine-top"><div><small>CIVIX · PLANOS</small><b>' + (actual && actual.P && actual.P.esCasa ? 'Casa ' : 'Edificio ') + Pl.n + ' piso' + (Pl.n > 1 ? 's' : '') + ' · lote ' + f2(Pl.W) + ' × ' + f2(Pl.L) + ' m</b></div>' +
            '<span class="cxpl-etapa">Preparando…</span><div class="cxpl-cine-acts">' +
            '<button type="button" data-c="vel" title="Velocidad">1×</button><button type="button" data-c="rep" title="Repetir">↺ Repetir</button>' +
            '<button type="button" data-c="dxf">⬇ DXF</button><button type="button" data-c="pdf">⬇ PDF</button><button type="button" data-c="x" aria-label="Cerrar">✕</button></div></div>' +
            '<div class="cxpl-cine-bar"><i></i></div><div class="cxpl-cine-g" style="--n:' + Math.min(Pl.n, 4) + '"></div>';
        doc.body.appendChild(ov);
        var grid = ov.querySelector('.cxpl-cine-g'), etq = ov.querySelector('.cxpl-etapa'), barra = ov.querySelector('.cxpl-cine-bar i');
        var vistas = Pl.pisos.map(function (pi, i) {
            var ents = dibujarPiso(Pl, pi, 0);
            var fig = el('figure', 'cxpl-cine-f', '<figcaption style="--c:' + CURSOR[i % CURSOR.length] + '">' + (NOMBRE_PISO[pi.n] || pi.n + '.º') + ' PISO</figcaption>' + svgPiso(ents, false, true) + '<span class="cxpl-cur" style="--c:' + CURSOR[i % CURSOR.length] + '"><i></i><b>' + ordinal(pi.n) + '</b></span>');
            grid.appendChild(fig);
            var nodos = [].slice.call(fig.querySelectorAll('.cxpl-e')).sort(function (a, b) { return (+a.getAttribute('data-e') - +b.getAttribute('data-e')) || (+a.getAttribute('data-k') - +b.getAttribute('data-k')); });
            return { fig: fig, svg: fig.querySelector('svg'), nodos: nodos, cur: fig.querySelector('.cxpl-cur') };
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
        'Zapata aislada para una carga de 800 kN, columna de 40 x 40 cm y capacidad portante de 150 kPa.',
        'Columna de 30 x 40 cm con carga axial de 1200 kN y altura libre de 3 m.',
        'Viga de 6 m de luz, sección 30 x 50 cm, carga muerta de 20 kN/m y carga viva de 10 kN/m.',
        'Muro de contención de 3 m de altura con sobrecarga de 10 kPa.'
    ];
    function enModoPlanos() { return global.__civixModo === 'planos'; }
    var sinBienvenida = false;
    function activarModo() { var b = doc.querySelector('#civixModos [data-modo="planos"]'); if (b && !b.classList.contains('active')) { sinBienvenida = true; b.click(); sinBienvenida = false; } }
    function bienvenida() {
        var c = tarjeta('<div class="civix-md">📐 <b>Modo Planos</b> — pide cualquier diseño:<br>' +
            '• <b>Edificios y casas:</b> te propongo la distribución, la vista previa de cada planta y el dibujo en <b>modo cine</b>. Indica pisos, lote (frente × fondo) y qué va en cada piso.<br>' +
            '• <b>Elementos y obras:</b> zapatas, columnas, vigas, losas, muros, escaleras, cerchas, pilotes, perfiles de acero, puentes, pórticos y curvas de nivel, con cálculo, armado, cotas y cantidades.<br>' +
            '<small>Todo se descarga en DXF y PDF.</small></div>' +
            '<div class="cxpl-ejemplos">' + EJEMPLOS.map(function (t) { return '<button type="button" class="cxpl-ej" data-cxpl-ej>' + esc(t) + '</button>'; }).join('') + '</div>' +
            '<p class="cxpl-nota">En este modo Civix genera planos y diseños. Para dudas de teoría vuelve a «Explicar».</p>');
        if (c) c.addEventListener('click', function (e) {
            var b = e.target.closest('[data-cxpl-ej]'); if (!b) return;
            var i = doc.getElementById('inputAsistente'); if (i) { i.value = b.textContent; i.focus(); try { i.dispatchEvent(new Event('input', { bubbles: true })); } catch (ex) { } }
        });
    }
    doc.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('#civixModos [data-modo]'); if (!b) return;
        if (b.getAttribute('data-modo') === 'planos' && !sinBienvenida) {
            var ult = chat() && chat().lastElementChild;
            if (!(ult && ult.querySelector && ult.querySelector('.cxpl-ejemplos'))) setTimeout(bienvenida, 0);
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
                    '<div class="cxpl-acts"><button type="button" class="cxpl-btn ok" data-cxpl-ir>Generar en modo Planos</button></div>');
                if (c) c.addEventListener('click', function (e) { if (!e.target.closest('[data-cxpl-ir]')) return; e.target.disabled = true; activarModo(); modoPlanos(texto, q); }, { once: false });
                historial(texto, 'Sugerí usar el modo Planos para este pedido.');
                return true;
            }
        } catch (e) { try { console.warn('Civix planos arquitectónicos', e); } catch (e2) { } }
        return prevSend ? prevSend.apply(this, arguments) : false;
    };
    /* ¿Es un elemento o una obra que ya resuelven los generadores de Civix CAD (sin IA)?
       zapatas, columnas, vigas, losas, muros, escaleras, cerchas, pilotes, perfiles de acero, puentes, pórticos, curvas de nivel. */
    var ELEMENTO = /\b(zapatas?|cimentaci|cimientos?|vigas?|vigueta|columnas?|losas?|muros?|escaleras? de concreto|gradas|cerchas?|armadura de techo|pilotes?|pilotaje|dado de cimentacion|perfil(?:es)? (?:w|de acero)|puentes?|porticos?|curvas de nivel|topografi|terreno aleatorio|despiece)\b/;
    var PROGRAMA_ARQ = /(dormitorio|habitacion|alcoba|recamara|cochera|garaje|sala|comedor|cocina|recepcion|oficinas? administrativ|aulas?\b|sala de lectura|consultorio|apartamento|departamento|vivienda|\bcasa\b|biblioteca|escuela|colegio|clinica|distribucion|planta arquitect)/;
    function esElemento(q) {
        if (!ELEMENTO.test(q)) return false;
        /* «escaleras» dentro de la lista de espacios de un edificio es arquitectura, no un elemento estructural */
        if (PROGRAMA_ARQ.test(q) && !/^(dise|dibuj|calcul|haz|hazme|genera|crea|predimension|necesito|quiero)?\s*\w*\s*(una?\s+)?(zapata|viga|columna|losa|muro|cercha|pilote|puente|portico)/.test(q)) return false;
        return true;
    }
    /* En modo Planos, un elemento estructural va a los generadores de Civix CAD (agregando el verbo si falta,
       para que lo reconozcan: «zapata para 800 kN» → «diseña zapata para 800 kN»). */
    function elementoCAD(texto, q) {
        var t = /^(dise|dibuj|calcul|haz|hazme|genera|crea|elabora|predimension|dame|quiero|necesito|muestra)/.test(q) ? texto : 'Diseña ' + texto;
        return prevSend ? prevSend.call(CAD, t, null) : false;
    }

    /* Atiende un mensaje en modo Planos: arquitectura con este módulo; elementos y obras con Civix CAD.
       Solo lo que ningún generador local resuelve se deja pasar a la IA (con instrucciones de plano CAD). */
    function modoPlanos(texto, q) {
        try {
            if (esElemento(q) && !(actual && /^(dibujalo|si|ok|apruebo|aprobado)\b/.test(q))) {
                if (elementoCAD(texto, q)) return true;
                return false;   /* sin generador local: la IA lo dibuja en formato DXF (modo Planos) */
            }
            if (actual && actual.estado === 'aprobado' && /^(dibujalo|dibujala|dibuja(?:lo)?|modo cine|efecto (?:de )?cine|dibuja el plano|hazlo|dale)\b/.test(q)) {
                tarjeta('<div class="civix-md">🎬 Dibujando las ' + actual.Pl.n + ' plantas en modo cine…</div>');
                return cine(actual.Pl);
            }
            if (actual && actual.estado === 'propuesta' && /^(si|ok|apruebo|aprobado|de acuerdo|listo|perfecto)\b/.test(q)) { aprobar(); return true; }
            var tieneLote = !!medidasLote(cifras(q));
            if (actual && !tieneLote) {
                var P2 = cambios(q);
                if (P2) return propuesta(texto, P2);
            }
            /* en este modo basta con describir el proyecto: no hace falta «hazme» ni «plano» */
            if (tieneLote || /(edificio|edificacion|casa|vivienda|apartamento|departamento|piso|nivel|planta|lote|terreno|cochera|dormitorio|habitacion|alcoba|biblioteca|escuela|colegio|oficina|local|clinica|consultorio|centro|auditorio|plano|distribucion)/.test(q)) {
                var P = leer(texto);
                if (P.error) return guia(texto, P.error);
                return propuesta(texto, P);
            }
            /* otros diseños (detalles, instalaciones, mobiliario, cubiertas…): los dibuja la IA en formato DXF */
            if (/(dise|dibuj|plano|detalle|planta|corte|elevacion|esquema|haz|hazme|genera|crea|dxf|cad)/.test(q)) return false;
            return guia(texto, 'En el modo Planos dibujo proyectos y elementos: un edificio o una casa (pisos, lote y qué va en cada piso), o un elemento como una zapata, columna, viga, losa, muro, escalera, cercha, puente o pórtico.');
        } catch (e) {
            try { console.warn('Civix planos arquitectónicos', e); } catch (e2) { }
            return guia(texto, 'No pude interpretar el pedido. Intenta con el formato del ejemplo.');
        }
    }
    /* =================================================================== 9. MODO CINE PARA CUALQUIER PLANO CAD
       Lo usa el botón «🎬 Modo cine» del visor de Civix CAD (Planos y CAD: curvas de nivel, diseño estructural,
       planos con IA, conversiones, DXF adjuntos y tarjetas del chat). Las etapas se deducen del nombre de la capa. */
    var ETAPAS_G = ['Marco y rótulo', 'Ejes', 'Contornos', 'Rellenos y secciones', 'Armadura', 'Detalles', 'Cotas', 'Textos'];
    function etapaDe(e) {
        var L = String(e.layer || '').toUpperCase();
        if (/MARCO|CAJETIN|ROTULO|TITLE|BORDER|FRAME|LAMINA/.test(L)) return 0;
        if (/EJE|AXIS|GRID|REJILLA/.test(L)) return 1;
        if (/COTA|DIM|ACOT/.test(L)) return 6;
        if (/TEXT|TXT|ETIQ|LABEL|NOTA|LEYENDA/.test(L) || e.t === 'text') return 7;
        if (/ARMAD|ACERO|REFUER|ESTRIB|VARILL|BARRA|REBAR|STEEL/.test(L)) return 4;
        if (e.fill || e.hatch || /HATCH|RELLENO|ACHUR|SECC/.test(L)) return 3;
        if (/CONTORNO|CONCRET|MURO|WALL|OUTLINE|PERFIL|TERRENO|CURVA|MAESTRA|COLUMN|VIGA|LOSA|ZAPATA|ESTRUC|PUENTE|CERCHA|BORDE|LIMITE/.test(L)) return 2;
        return 5;
    }
    function colorDe(model, e, oscuro) {
        var rgb = e.rgb, aci = e.aci, Lr = model.layers && model.layers[e.layer];
        if (!rgb && !aci && Lr) { rgb = Lr.rgb; aci = Lr.aci; }
        if (!rgb && aci && aci !== 7 && CAD.aciRGB) rgb = CAD.aciRGB(aci);
        if (!rgb) return oscuro ? '#e2e8f0' : '#111827';
        if (!oscuro && rgb[0] > 225 && rgb[1] > 225 && rgb[2] > 225) return '#111827';   /* blanco sobre fondo claro */
        return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    }
    function svgModelo(model, oscuro) {
        var ents = model.ents.filter(function (e) { var L = model.layers && model.layers[e.layer]; return !(L && L.off); });
        var bb = model.bbox || CAD.bboxOf(ents) || [0, 0, 10, 10], span = Math.max(bb[2] - bb[0], bb[3] - bb[1]) || 1, pad = span * 0.03;
        var w = bb[2] - bb[0] + 2 * pad, h = bb[3] - bb[1] + 2 * pad;
        function X(x) { return (x - bb[0] + pad).toFixed(4); } function Y(y) { return (bb[3] - y + pad).toFixed(4); }
        var orden = ents.map(function (e, i) { return { e: e, i: i, s: etapaDe(e) }; }).sort(function (a, b) { return a.s - b.s || a.i - b.i; });
        var out = ['<svg class="cxpl-svg" viewBox="0 0 ' + w.toFixed(3) + ' ' + h.toFixed(3) + '" xmlns="http://www.w3.org/2000/svg" role="img">'];
        orden.forEach(function (o, k) {
            /* grosor en unidades del dibujo (no «non-scaling-stroke»: rompe el trazo animado con pathLength) */
            var sw = span * (o.s === 0 ? 0.0024 : o.s === 1 || o.s === 6 ? 0.0019 : o.s === 4 ? 0.0042 : 0.0031);
            var e = o.e, c = colorDe(model, e, oscuro), at = ' data-k="' + k + '" data-e="' + o.s + '" class="cxpl-e"', st = ' stroke="' + c + '" stroke-width="' + sw.toFixed(5) + '" pathLength="1"';
            if (e.t === 'poly' && e.pts && e.pts.length) {
                var pts = e.pts.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ');
                var fill = e.fill ? ' fill="' + (e.fillRgb ? 'rgb(' + e.fillRgb.join(',') + ')' : c) + '" fill-opacity="' + (e.alpha != null ? e.alpha : 0.18) + '"' : ' fill="none"';
                out.push('<' + (e.closed ? 'polygon' : 'polyline') + at + ' points="' + pts + '"' + (e.noStroke ? ' stroke="none"' : st) + fill + ' stroke-linejoin="round"/>');
            } else if (e.t === 'circle') {
                out.push('<circle' + at + ' cx="' + X(e.c[0]) + '" cy="' + Y(e.c[1]) + '" r="' + e.r.toFixed(4) + '"' + st + ' fill="none"/>');
            } else if (e.t === 'point') {
                out.push('<circle' + at + ' cx="' + X(e.p[0]) + '" cy="' + Y(e.p[1]) + '" r="' + (span * 0.002).toFixed(4) + '" fill="' + c + '"/>');
            } else if (e.t === 'text' && e.s && e.h > 0) {
                var anc = e.ha === 1 ? 'middle' : e.ha === 2 ? 'end' : 'start', dy = e.va === 3 ? e.h * 0.9 : e.va === 2 ? e.h * 0.35 : 0;
                var rot = e.rot ? ' transform="rotate(' + (-e.rot * 180 / Math.PI).toFixed(2) + ' ' + X(e.p[0]) + ' ' + Y(e.p[1]) + ')"' : '';
                e.s.forEach(function (ln, j) {
                    out.push('<text' + at + ' x="' + X(e.p[0]) + '" y="' + (parseFloat(Y(e.p[1])) + dy + j * e.h * 1.4).toFixed(4) + '" font-size="' + e.h.toFixed(4) + '" fill="' + c + '" text-anchor="' + anc + '" font-family="Arial,sans-serif"' + rot + '>' + esc(ln) + '</text>');
                });
            }
        });
        out.push('</svg>');
        return out.join('');
    }
    function cineModelo(model, o) {
        o = o || {};
        if (!model || !model.ents || !model.ents.length) return false;
        var oscuro = o.dark !== false;
        var reducido = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var nombre = String(o.titulo || o.name || 'Plano Civix').replace(/_/g, ' ').replace(/\bcivix\b/i, '').trim() || 'Plano';
        var ov = el('div', 'cxpl-cine' + (oscuro ? '' : ' claro'));
        ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Modo cine: dibujo del plano');
        ov.innerHTML = '<div class="cxpl-cine-top"><div><small>CIVIX · PLANOS Y CAD</small><b>' + esc(nombre.charAt(0).toUpperCase() + nombre.slice(1)) + '</b></div>' +
            '<span class="cxpl-etapa">Preparando…</span><div class="cxpl-cine-acts">' +
            '<button type="button" data-c="vel" title="Velocidad">1×</button><button type="button" data-c="rep" title="Repetir">↺ Repetir</button>' +
            '<button type="button" data-c="dxf">⬇ DXF</button><button type="button" data-c="pdf">⬇ PDF</button><button type="button" data-c="x" aria-label="Cerrar">✕</button></div></div>' +
            '<div class="cxpl-cine-bar"><i></i></div><div class="cxpl-cine-g cxpl-cine-uno" style="--n:1"></div>';
        doc.body.appendChild(ov);
        var grid = ov.querySelector('.cxpl-cine-g'), etq = ov.querySelector('.cxpl-etapa'), barra = ov.querySelector('.cxpl-cine-bar i');
        var fig = el('figure', 'cxpl-cine-f', svgModelo(model, oscuro) + '<span class="cxpl-cur" style="--c:#3b82f6"><i></i><b>Civix</b></span>');
        grid.appendChild(fig);
        var svg = fig.querySelector('svg'), nodos = [].slice.call(fig.querySelectorAll('.cxpl-e')), cur = fig.querySelector('.cxpl-cur');
        var DUR = Math.max(9000, Math.min(22000, 6000 + nodos.length * 12)), vel = 1, t0 = 0, timer = null;
        function ocultar() { nodos.forEach(function (n) { n.classList.remove('on'); }); cur.style.opacity = 0; }
        function terminar() { nodos.forEach(function (n) { n.classList.add('on'); }); cur.style.opacity = 0; etq.textContent = 'Plano terminado'; barra.style.width = '100%'; }
        function paso() {
            var frac = Math.min(1, (Date.now() - t0) * vel / DUR), k = Math.floor(frac * nodos.length), ult = null;
            barra.style.width = (frac * 100).toFixed(1) + '%';
            for (var i = 0; i < k; i++) if (!nodos[i].classList.contains('on')) { nodos[i].classList.add('on'); ult = nodos[i]; }
            var n = ult || nodos[Math.max(0, k - 1)];
            if (n) {
                etq.textContent = 'Dibujando: ' + ETAPAS_G[+n.getAttribute('data-e')];
                try {
                    var bb = n.getBBox(), m = svg.getBoundingClientRect(), vb = svg.viewBox.baseVal, fr = fig.getBoundingClientRect();
                    var s = Math.min(m.width / vb.width, m.height / vb.height), ox = m.left + (m.width - vb.width * s) / 2, oy = m.top + (m.height - vb.height * s) / 2;
                    cur.style.left = (ox - fr.left + (bb.x + bb.width) * s) + 'px'; cur.style.top = (oy - fr.top + (bb.y + bb.height) * s) + 'px'; cur.style.opacity = 1;
                } catch (e) { }
            }
            if (frac >= 1) { terminar(); return; }
            timer = setTimeout(paso, 40);
        }
        function iniciar() { clearTimeout(timer); ocultar(); t0 = Date.now(); if (reducido) { terminar(); etq.textContent = 'Plano terminado (animación reducida)'; return; } paso(); }
        function cerrar() { clearTimeout(timer); ov.remove(); doc.removeEventListener('keydown', tecla); }
        function tecla(e) { if (e.key === 'Escape') cerrar(); }
        doc.addEventListener('keydown', tecla);
        ov.addEventListener('click', function (e) {
            var b = e.target.closest('[data-c]'); if (!b) return;
            var c = b.getAttribute('data-c'), arch = (o.name || 'plano_civix');
            if (c === 'x') cerrar();
            else if (c === 'rep') iniciar();
            else if (c === 'vel') { var t = (Date.now() - t0) * vel; vel = vel === 1 ? 2 : vel === 2 ? 4 : 1; t0 = Date.now() - t / vel; b.textContent = vel + '×'; }
            else if (c === 'dxf') CAD.download(arch + '.dxf', new Blob([CAD.writeDXF(model)], { type: 'application/dxf' }));
            else if (c === 'pdf' && CAD.exportRaster) CAD.exportRaster(model, 'pdf', arch);
        });
        setTimeout(iniciar, 350);
        return true;
    }
    CAD.cine = cineModelo;

    CAD.planosArq = { leer: leer, plan: plan, modelo: modelo, tabla: tabla, cine: function () { return actual && cine(actual.Pl); }, actual: function () { return actual; } };
})(typeof window !== 'undefined' ? window : globalThis);
