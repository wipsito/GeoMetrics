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
    /* Espacios residenciales adicionales que el usuario puede pedir (además de cochera, sala, cocina, dormitorios y baños).
       [clave, patrón, nombre, área típica m², tipo de mobiliario, zona] — zona: 'int' dentro de la vivienda,
       'ext' en el patio del primer piso, 'terr' terraza (piso alto; en una casa de un piso va al patio). */
    var EXTRAS = [
        ['piscina', /piscina|alberca|pileta/, 'PISCINA', 24, 'piscina', 'ext'],
        ['jacuzzi', /jacuzzi|hidromasaje|tina de hidro/, 'JACUZZI', 6, 'jacuzzi', 'ext'],
        ['bbq', /\bbbq\b|barbacoa|asador|parrilla|zona de asados?|quincho/, 'ZONA BBQ', 10, 'bbq', 'ext'],
        ['jardin', /jardin|zona verde|huerta/, 'JARDÍN', 12, 'patio', 'ext'],
        ['terraza', /terrazas?|balcon(?:es)?|azotea|mirador/, 'TERRAZA', 12, 'terraza', 'terr'],
        ['gimnasio', /gimnasio|\bgym\b/, 'GIMNASIO', 14, 'gimnasio', 'int'],
        ['tv', /sala de (?:tv|television|cine|entretenimiento)|cuarto de (?:tv|television)|home theater|sala de estar familiar|family room/, 'SALA DE TV', 12, 'sala', 'int'],
        ['juegos', /(?:sala|cuarto|zona) de juegos|ludoteca|cuarto de (?:los )?ninos/, 'SALA DE JUEGOS', 12, 'infantil', 'int'],
        ['servicio', /(?:cuarto|habitacion|alcoba|dormitorio) de servicio|cuarto de (?:la )?empleada/, 'CUARTO DE SERVICIO', 8, 'dorm', 'int'],
        ['vestier', /vestier|vestidor|walk[- ]?in/, 'VESTIER', 5, 'vestier', 'int'],
        ['biblio', /biblioteca/, 'BIBLIOTECA', 10, 'estudio', 'int'],
        ['despensa', /despensa|alacena/, 'DESPENSA', 3, 'deposito', 'int'],
        ['bodega', /bodega|deposito|cuarto util|cuarto de herramientas/, 'DEPÓSITO', 5, 'deposito2', 'int'],
        ['bsocial', /bano social|medio bano|bano de (?:visitas|invitados)|toilette/, 'BAÑO SOCIAL', 3, 'bano', 'int'],
        ['ascensor', /ascensor|elevador/, 'ASCENSOR', 4, 'ascensor', 'int']
    ];
    function extrasDe(t) {
        /* «sin piscina», «sin terraza»: lo negado no se agrega */
        var limpio = t.replace(/\bsin\s+(?:el |la |los |las |un |una )?[a-z]+(?:\s+(?:de|social)\s+[a-z]+)?/g, ' ');
        var out = [];
        EXTRAS.forEach(function (x) {
            var m = x[1].exec(limpio); if (!m) return;
            /* cantidad justo antes («2 terrazas», «dos amplias terrazas»), sin confundirla con medidas («de 4 x 5 con vestier») */
            var antes = limpio.slice(Math.max(0, m.index - 16), m.index), c = antes.match(/(\d+|un|una|dos|tres|cuatro)\s+(?:([a-z]+)\s+)?$/);
            if (c && c[2] && /^(con|de|del|y|e|por|x|en|a|al|para|sin|o)$/.test(c[2])) c = null;
            if (c && /(?:x|×|por)\s*$/.test(antes.slice(0, antes.length - c[0].length))) c = null;
            var n = c ? num(c[1]) : 1;
            out.push({ clave: x[0], nombre: x[2], area: x[3], tipo: x[4], zona: x[5], n: Math.max(1, Math.min(4, n || 1)) });
        });
        return out;
    }
    /* medidas pedidas por ambiente: «dormitorio principal de 4 x 5», «sala de 30 m2», «piscina de 3 por 8» */
    var MED_RE = [
        ['principal', '(?:dormitorio|habitacion|alcoba|cuarto|recamara)\\s+principal|master'],
        ['servicio', '(?:cuarto|habitacion|alcoba|dormitorio) de servicio'],
        ['dorm', '(?:dormitorios?|habitaciones?|alcobas?|recamaras?)(?!\\s+(?:principal|de servicio))'],
        ['tv', 'sala de (?:tv|television|cine)'], ['juegos', '(?:sala|cuarto|zona) de juegos'],
        ['sala', '\\bsala(?!\\s+de\\s+(?:tv|television|cine|juegos|estar familiar))(?:[- ]comedor)?'],
        ['cocina', 'cocina'], ['comedor', '\\bcomedor'], ['bsocial', 'bano social|medio bano'], ['bano', 'banos?(?!\\s+social)'],
        ['cochera', 'cochera|garaje|parqueadero'], ['patio', 'patio'], ['estudio', 'estudio|oficina'],
        ['piscina', 'piscina|alberca'], ['jacuzzi', 'jacuzzi'], ['bbq', 'bbq|zona de asados?|asador|parrilla'], ['jardin', 'jardin'],
        ['terraza', 'terrazas?|balcon(?:es)?'], ['gimnasio', 'gimnasio'], ['vestier', 'vestier|vestidor'], ['biblio', 'biblioteca'], ['bodega', 'bodega|deposito']
    ];
    function medidasDe(q) {
        var out = {}, usados = [];
        MED_RE.forEach(function (k) {
            var res = [
                new RegExp('(?:' + k[1] + ')([^,.;]{0,26}?)\\b(?:de|con|que mida|mide|:)\\s*' + N_ + '\\s*(?:m|mts|metros)?\\s*(?:x|×|por)\\s*' + N_ + '(?!\\s*(?:pisos|niveles))', 'g'),
                new RegExp('(?:' + k[1] + ')([^,.;]{0,26}?)\\b(?:de|con)\\s*' + N_ + '\\s*(?:m2|m²|mts2|metros cuadrados|metros2)', 'g')
            ];
            res.forEach(function (re, cual) {
                var m;
                while ((m = re.exec(q))) {
                    var i0 = m.index, i1 = re.lastIndex;
                    if (/lote|terreno|predio/.test(m[1]) || usados.some(function (u) { return i0 < u[1] && i1 > u[0]; })) continue;
                    if (out[k[0]]) continue;
                    var w = num(m[2]), h = cual === 0 ? num(m[3]) : 0;
                    if (cual === 0 && w > 0 && h > 0 && w * h >= 1.5 && w <= 40 && h <= 40) out[k[0]] = { w: Math.min(w, h), h: Math.max(w, h), A: w * h };
                    else if (cual === 1 && w >= 1.5 && w <= 400) out[k[0]] = { A: w };
                    else continue;
                    usados.push([i0, i1]);
                }
            });
        });
        return out;
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
        /* conteos explícitos (no cuentan «cuarto de servicio», «cuarto de juegos», «baño social»…) */
        var m = t.match(/(\d+|un|uno|una|dos|tres|cuatro|cinco|seis)\s*(?:dormitorios?|habitaciones?|alcobas?|cuartos?|recamaras?)(?!\s+(?:de\s+(?:servicio|juegos|tv|television|maquinas|herramientas|ropas?|la empleada|los ninos|ninos)|util|principal\b))/);
        if (m) { p.dorm = num(m[1]); p.apto = true; p.dormExpl = true; }
        m = t.match(/(\d+|un|uno|una|dos|tres|cuatro)\s*banos?(?!\s+(?:social|de visitas|de invitados))/); if (m) { p.banos = num(m[1]); p.banosExpl = true; }
        if (residencial) {
            p.extras = extrasDe(t);
            if (/cocina (?:abierta|americana|integral abierta|tipo isla|con isla)/.test(t)) p.cocinaAbierta = true;
        }
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
        /* «casa de 1 piso» es la cantidad de pisos, no el inicio de la descripción de un piso */
        q = q.replace(/\b(de|en)\s+(?:1|un|una)\s+(?:piso|nivel|planta)\b/g, '$1 una sola altura');
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
        /* tramo de texto de cada piso indicado («primer piso: …»); un tramo vacío («un gimnasio en el primer piso»)
           no describe el piso, solo ubica lo que se nombró antes */
        marcas.forEach(function (k, j) {
            var fin = j + 1 < marcas.length ? marcas[j + 1].i : q.length, txt = q.slice(k.fin, fin), corte = txt.search(/\.\s+|\.$|\n\s*\n|;\s*(?=planta|piso|nivel)/);
            k.txt = corte >= 0 ? txt.slice(0, corte) : txt; k.segFin = k.fin + k.txt.length;
            k.vacio = k.txt.replace(/[\s,.;:]|\b(?:y|e|con|el|la|del|de)\b/g, '').length < 3;
        });
        /* programa general: el pedido sin los tramos de pisos concretos (no se borra «de 2 pisos», que es solo la cantidad) */
        var qGen = q;
        marcas.slice().sort(function (a, b) { return b.i - a.i; }).forEach(function (k) { if (!k.vacio) qGen = qGen.slice(0, k.i) + ' ' + qGen.slice(k.segFin); });
        var general = programa(qGen, null, residencial);
        /* lo que se pide para «el resto» (p. ej. «apartamentos de 2 habitaciones arriba») vale para los pisos sin indicación */
        var todo = programa(q, null, residencial);
        if (!general.dorm && todo.dorm) { general.dorm = todo.dorm; general.apto = true; }
        if (!general.banos && todo.banos) general.banos = todo.banos;
        marcas.forEach(function (k) {
            if (k.vacio) return;
            var p = programa(k.txt, null, residencial); p._propio = true;
            for (var f = Math.max(1, k.a); f <= Math.min(n, k.b); f++) pisos[f] = JSON.parse(JSON.stringify(p));
        });
        var esCasa = /\bcasa\b|unifamiliar/.test(q) && !/edificio|multifamiliar/.test(q);
        for (var f2_ = 1; f2_ <= n; f2_++) {
            if (pisos[f2_]) continue;
            var p = JSON.parse(JSON.stringify(general));
            if (esCasa && n > 1) { p.casa = true; if (f2_ > 1) { p.cochera = 0; p.estudio = false; } }   /* una sola casa: el estudio no se repite */
            if (f2_ > 1) { p.cochera = 0; p.local = false; }
            /* espacios adicionales pedidos sin piso: cada uno va a donde corresponde (no se repite en todos los pisos) */
            p.extras = (p.extras || []).filter(function (e) {
                if (e.zona === 'ext') return f2_ === 1;
                if (e.zona === 'terr') return n === 1 || (esCasa ? f2_ === n : true);
                if (e.clave === 'ascensor') return true;
                if (esCasa && n > 1) return e.clave === 'vestier' ? f2_ === n : f2_ === 1;
                if (!esCasa && n > 1) return /gimnasio|bodega|bbq/.test(e.clave) ? f2_ === 1 : true;
                return true;
            });
            pisos[f2_] = p;
        }
        /* «un gimnasio en el primer piso», «la terraza en el último piso»: el espacio va solo a ese piso */
        EXTRAS.forEach(function (x) {
            var re = new RegExp('(?:' + x[1].source + ')[^.;,]{0,25}?\\b(?:en|para|sobre)\\s+(?:el\\s+|la\\s+)?(?:' + RE_PISO + '\\s*(?:piso|nivel|planta)|(planta baja)|(ultimo piso|planta alta|azotea|cubierta))', 'g'), mx;
            while ((mx = re.exec(q))) {
                var fx = mx[2] ? 1 : mx[3] ? n : num(mx[1]); if (!(fx >= 1 && fx <= n)) continue;
                var tpl = null;
                for (var ff = 1; ff <= n; ff++) { var ex = (pisos[ff].extras || []).filter(function (e) { return e.clave === x[0]; })[0]; if (ex && !tpl) tpl = ex; pisos[ff].extras = (pisos[ff].extras || []).filter(function (e) { return e.clave !== x[0]; }); }
                pisos[fx].extras = pisos[fx].extras || [];
                pisos[fx].extras.push(tpl || { clave: x[0], nombre: x[2], area: x[3], tipo: x[4], zona: x[5], n: 1 });
            }
        });
        /* medidas pedidas: se aplican a los espacios adicionales (las de los ambientes base las usa la distribución) */
        var med = medidasDe(q);
        pisos.forEach(function (pp) { if (pp && pp.extras) pp.extras.forEach(function (e) { if (med[e.clave]) { e.area = med[e.clave].A; e.med = med[e.clave]; } }); });
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
                if (general.dormExpl && !pp._propio) {
                    /* «casa de 2 pisos con 4 habitaciones»: el número pedido es el TOTAL de la casa, repartido entre pisos */
                    var tot = general.dorm, abajo = tot >= 4 ? 1 : 0, arriba = tot - abajo, cadaUno = Math.floor(arriba / (n - 1)), resto = arriba - cadaUno * (n - 1);
                    if (k2 === 1) { pp.casaSocial = true; pp.dorm = abajo; pp.sinDorm = !abajo; pp.banos = 1; }
                    else { pp.casaUp = true; pp.casaSocial = false; pp.apto = true; pp.dorm = Math.max(1, cadaUno + (k2 - 2 < resto ? 1 : 0)); }
                    if (k2 > 1) pp.banos = general.banosExpl ? Math.max(1, Math.round((general.banos - 1) / (n - 1))) : (pp.dorm >= 3 ? 2 : 1);
                    pp.dormExpl = true;
                }
                else if (k2 === 1) { pp.casaSocial = true; pp.dorm = pp.sinDorm ? 0 : Math.min(pp.dorm, 1); pp.banos = 1; }
                else { pp.casaUp = true; pp.casaSocial = false; pp.apto = true; if (!pp.dorm) pp.dorm = 3; }
            }
        }
        return { W: W, L: L, n: n, pisos: pisos, texto: texto, esCasa: esCasa, escala: escala ? '1:' + escala : null, supuesto: supuesto, med: med };
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
        var aw = (a + b) / 2, MD = P.med || {};
        function prof(A, def, min, max) { return A ? Math.max(min, Math.min(max, A / aw)) : def; }   /* área pedida → profundidad en la columna */
        /* celdas de la zona de cuartos para cada piso: [nombre, profundidad, tipo] */
        function celdas(p, f) {
            var izq = [], der = [];
            var lista = [];
            if (p.casaSocial) { if (p.cochera) lista.push(['SALA', prof(MD.sala && MD.sala.A, 4.0, 3, 8), 'sala']); lista.push(['COMEDOR', prof(MD.comedor && MD.comedor.A, 3.4, 2.6, 7), 'comedor']); if (p.estudio) lista.push(['ESTUDIO', prof(MD.estudio && MD.estudio.A, 3.0, 2.4, 6), 'otro']); }
            else if (p.apto && (p.cochera || p.local)) lista.push(['SALA-COMEDOR', prof(MD.sala && MD.sala.A, 4.2, 3, 8), 'sala']);
            /* el vestier pedido va junto al dormitorio principal (en el ancho que le sobra a la columna) */
            var vest = p.apto && p.dorm ? (p.extras || []).filter(function (e) { return e.clave === 'vestier'; })[0] : null;
            if (p.apto) {
                for (var d = 1; d <= p.dorm; d++) {
                    var mdD = d === 1 ? MD.principal : MD.dorm;
                    /* con medidas «a × b»: el ambiente toma el lado corto de ancho y el largo de fondo (c[3] = ancho pedido) */
                    var cel = [d === 1 ? 'DORM. PRINCIPAL' : 'DORMITORIO ' + d, mdD && mdD.w ? Math.max(2.6, Math.min(8, mdD.h)) : (d === 1 ? prof(mdD && mdD.A, 4.0, 2.8, 8) : prof(mdD && mdD.A, 3.6, 2.6, 7)), null, mdD && mdD.w ? mdD.w : 0];
                    if (d === 1 && vest) cel[4] = vest;
                    lista.push(cel);
                }
                for (var k = 1; k <= p.banos; k++) lista.push([p.banos > 1 ? 'BAÑO ' + k : 'BAÑO', prof(MD.bano && MD.bano.A, 2.4, 1.6, 5)]);
            }
            /* espacios adicionales pedidos (gimnasio, sala de TV, terraza en piso alto…) */
            (p.extras || []).forEach(function (e) {
                if (vest && e === vest) return;
                if (e.zona === 'int' || f > 1) for (var j = 1; j <= e.n; j++) lista.push([e.n > 1 ? e.nombre + ' ' + j : e.nombre, prof(e.area, 3, e.tipo === 'bano' || e.tipo === 'deposito' || e.tipo === 'ascensor' ? 1.6 : 2.4, 9), e.tipo]);
            });
            /* reparto equilibrado: cada ambiente va a la columna más corta (la izquierda es la más ancha);
               así las dos columnas terminan con profundidades parecidas */
            lista.forEach(function (c) { if (sum(izq) <= sum(der)) izq.push(c); else der.push(c); });
            return { izq: izq, der: der };
        }
        function sum(col) { return col.reduce(function (s, c) { return s + c[1]; }, 0); }
        var C = [], maxZona = 0, f;
        function medir() { maxZona = 0; for (f = 1; f <= P.n; f++) { var c = celdas(P.pisos[f], f); C[f] = c; maxZona = Math.max(maxZona, sum(c.izq), sum(c.der)); } }
        medir();
        /* patio del primer piso: si se pidieron piscina, BBQ, jardín… necesita fondo suficiente para ellos */
        var ext1 = [];
        ((P.pisos[1] && P.pisos[1].extras) || []).forEach(function (e) { if (e.zona === 'ext' || e.zona === 'terr') for (var j = 1; j <= e.n; j++) ext1.push({ nombre: e.n > 1 ? e.nombre + ' ' + j : e.nombre, area: e.area, tipo: e.tipo, med: e.med }); });
        var patioReq = 0;
        if (ext1.length) {
            var sumA = ext1.reduce(function (s, e) { return s + e.area; }, 0);
            patioReq = Math.max(2.6, Math.min(9, sumA / (W * 0.85)));
            ext1.forEach(function (e) { if (e.med && e.med.w) patioReq = Math.max(patioReq, Math.min(e.med.w, e.med.h) + (e.tipo === 'piscina' ? 1.2 : 0.4)); else if (e.tipo === 'piscina') patioReq = Math.max(patioReq, 4.2); });
        }
        if (MD.patio) patioReq = Math.max(patioReq, MD.patio.w ? Math.min(MD.patio.w, MD.patio.h) : MD.patio.A / W);
        var hA = 5.0, hB = P.n > 1 ? ESC_D : 2.8, patioMin = Math.max(2.0, patioReq), esc = 1;
        /* Ajuste al fondo del lote: primero se compactan franjas y patio (sin bajar de medidas mínimas);
           si aun así no cabe, se quitan baños extra y luego dormitorios NO pedidos explícitamente, y se avisa. */
        var pasos = [function () { hA = 4.5; }, function () { patioMin = Math.max(patioReq, 1.5); }, function () { hA = 4.0; hB = Math.min(hB, 2.8); }, function () { patioMin = Math.max(patioReq, 1.0); hA = 3.6; }];
        var quitados = [];
        function cabe() { return hA + hB + PAS_H + maxZona * 0.85 <= L - patioMin; }
        for (var s = 0; s < pasos.length && !cabe(); s++) pasos[s]();
        var guarda = 0;
        while (!cabe() && guarda++ < 20) {
            var hizo = false;
            for (f = P.n; f >= 1 && !hizo; f--) { var pf = P.pisos[f]; if (pf.banos > 1 && !pf.banosExpl) { pf.banos--; quitados.push('quité un baño del ' + ordinal(f) + ' piso'); hizo = true; } }
            /* casa: antes de quitar un dormitorio del piso alto se intenta bajarlo al primer piso (una sola vivienda) */
            var p1 = P.pisos[1];
            if (!hizo && p1 && p1.casaSocial && P.n > 1 && !p1._bajados) {
                for (f = P.n; f >= 2 && !hizo; f--) { var pa = P.pisos[f]; if (pa.dorm > 1 && (p1.dorm || 0) < 1) { pa.dorm--; p1.dorm = (p1.dorm || 0) + 1; p1.apto = true; p1._bajados = true; quitados.push('bajé un dormitorio del ' + ordinal(f) + ' piso al 1.er piso'); hizo = true; } }
            }
            for (f = P.n; f >= 1 && !hizo; f--) { var pg = P.pisos[f]; if (pg.dorm > 1 && !pg.dormExpl) { pg.dorm--; quitados.push('quité un dormitorio del ' + ordinal(f) + ' piso'); hizo = true; } }
            if (!hizo) break;
            medir();
        }
        if (quitados.length) warns.push('Para respetar medidas mínimas en un fondo de ' + f2(L) + ' m ' + quitados.join(', ') + '. Si lo necesitas, pide un lote más profundo o más pisos.');
        if (!cabe()) warns.push('Todo lo que pediste queda muy justo para un lote de ' + f2(W) + ' × ' + f2(L) + ' m: los ambientes se ajustaron para que quepan; revisa las medidas antes de aprobar.');
        /* medidas pedidas para la sala/cochera (franja del frente) y la cocina (franja central) */
        var p1 = P.pisos[1] || {};
        var frenteMed = (p1.cochera ? MD.cochera : null) || (!p1.cochera && !p1.local ? MD.sala : null);
        if (frenteMed) hA = Math.max(3.2, Math.min(8, frenteMed.w ? (frenteMed.w <= wl + 0.3 ? frenteMed.h : frenteMed.w) : frenteMed.A / wl));
        if (MD.cocina) hB = Math.max(P.n > 1 ? ESC_D : 2.4, Math.min(6, MD.cocina.A / Math.max(2.4, wl - 1.4)));
        var D = hA + hB + PAS_H + maxZona;
        var disp = L - patioMin;
        if (D > disp) {
            esc = Math.max(0.85, (disp - hA - hB - PAS_H) / maxZona); D = hA + hB + PAS_H + maxZona * esc;
        } else if (D < disp - 2) {
            var extra = Math.min((disp - 1.5) - D, maxZona * 0.22);
            esc = (maxZona + extra) / maxZona; D = hA + hB + PAS_H + maxZona * esc;
        }
        D = Math.min(D, L - Math.max(1.2, patioReq));
        var patio = L - D;
        if (patioReq && patio < patioReq - 0.05) warns.push('El patio quedó de ' + f2(patio) + ' m de fondo (pediste espacios que necesitan ~' + f2(patioReq) + ' m).');
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
                R.push(rm(p.cocinaAbierta ? 'COCINA ABIERTA' : 'COCINA', 0, y0, wl - lavW, hB, 'cocina'));
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
            if (f === 1) patioPosterior(R);
            pisos.push({ n: f, rooms: R, p: p });
        }
        /* patio posterior: piscina, BBQ, jardín… lado a lado a lo ancho; lo que sobra queda como patio */
        function patioPosterior(R) {
            if (!ext1.length) { R.push(rm('PATIO POSTERIOR', 0, D, W, patio, 'patio')); return; }
            var ws_ = ext1.map(function (e) {
                if (e.med && e.med.w) return Math.min(W, Math.max(e.med.w, e.med.h) + (e.tipo === 'piscina' ? 1.2 : 0.4));
                return Math.max(2.2, e.area / patio);
            });
            var tot = ws_.reduce(function (s, v) { return s + v; }, 0), k = tot > W ? W / tot : 1, x = 0;
            ext1.forEach(function (e, i) { var w = ws_[i] * k; var r = rm(e.nombre, x, D, w, patio, e.tipo); r.med = e.med; R.push(r); x += w; });
            if (W - x >= 1.2) R.push(rm(ext1.some(function (e) { return e.tipo === 'patio'; }) ? 'PATIO' : 'JARDÍN', x, D, W - x, patio, 'patio'));
            else if (R.length) R[R.length - 1].w += W - x;
            if (k < 0.97) warns.push('Los espacios del patio (' + ext1.map(function (e) { return e.nombre.toLowerCase(); }).join(', ') + ') se ajustaron al ancho del lote.');
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
                    var rb = rm(c[0], bx, yy, bw, h, 'bano'); rb.zona = true; R.push(rb);
                    R.push(rm('CLÓSET', x === 0 ? x : x + bw, yy, w - bw, h, 'closet'));
                    yy += h; return;
                }
                /* dormitorio con ancho pedido o con vestier: se parte la columna (dormitorio junto al pasillo, el resto al otro lado) */
                var anchoD = 0;
                if (c[3] && w - c[3] >= 1.2) anchoD = c[3];
                else if (c[4] && w >= 3.8) anchoD = w - Math.min(2.0, Math.max(1.3, w * 0.33));
                if (anchoD) {
                    var dx = x === 0 ? x + w - anchoD : x, rx = x === 0 ? x : x + anchoD;
                    var rd = rm(c[0], dx, yy, anchoD, h, /PRINCIPAL/.test(c[0]) ? 'dormp' : 'dorm'); rd.zona = true; R.push(rd);
                    R.push(rm(c[4] ? 'VESTIER' : 'CLÓSET', rx, yy, w - anchoD, h, c[4] ? 'vestier' : 'closet'));
                    yy += h; return;
                }
                var tipo = c[2] || (/BAÑO/.test(c[0]) ? 'bano' : /DORM/.test(c[0]) ? (/PRINCIPAL/.test(c[0]) ? 'dormp' : 'dorm') : /SALA|ESTAR/.test(c[0]) ? 'sala' : /COMEDOR/.test(c[0]) ? 'comedor' : /DEPÓSITO/.test(c[0]) ? 'deposito2' : 'otro');
                var rr_ = rm(c[0], x, yy, w, h, tipo); rr_.zona = true; R.push(rr_); yy += h;
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
    var LAYERS = { ACABADOS: 8, EJES: 1, COLUMNAS: 4, MUROS: 4, PUERTAS: 3, VENTANAS: 5, ESCALERA: 6, MOBILIARIO: 2, TEXTO: 7, COTAS: 5, MARCO: 8 };
    var ETAPA = { ACABADOS: 2, EJES: 0, COLUMNAS: 1, MUROS: 2, VENTANAS: 3, PUERTAS: 3, ESCALERA: 4, MOBILIARIO: 5, TEXTO: 6, COTAS: 6, MARCO: 6 };
    function dibujarPiso(Pl, pi, ox) {
        var ents = [], W = Pl.W, D = pi.n === 1 ? Pl.L : Pl.D;
        function P(x, y) { return [ox + x, y, 0]; }
        function ln(layer, x1, y1, x2, y2, extra) { var e = { t: 'poly', pts: [P(x1, y1), P(x2, y2)], closed: false, layer: layer }; if (extra) for (var k in extra) e[k] = extra[k]; ents.push(e); return e; }
        function rect(layer, x, y, w, h, extra) { var e = { t: 'poly', pts: [P(x, y), P(x + w, y), P(x + w, y + h), P(x, y + h)], closed: true, layer: layer }; if (extra) for (var k in extra) e[k] = extra[k]; ents.push(e); return e; }
        function arco(layer, cx, cy, r, a0, a1) { var pts = []; for (var i = 0; i <= 12; i++) { var t = a0 + (a1 - a0) * i / 12; pts.push(P(cx + r * Math.cos(t), cy + r * Math.sin(t))); } ents.push({ t: 'poly', pts: pts, closed: false, layer: layer }); }
        function circ(layer, cx, cy, r) { ents.push({ t: 'circle', c: P(cx, cy), r: r, layer: layer }); }
        function txt(layer, x, y, h, s, extra) { var e = { t: 'text', p: P(x, y), h: h, s: [s], rot: 0, ha: 1, va: 2, layer: layer }; if (extra) for (var k in extra) e[k] = extra[k]; ents.push(e); }
        function pl(layer, pts, closed, extra) { var e = { t: 'poly', pts: pts.map(function (p) { return P(p[0], p[1]); }), closed: closed, layer: layer }; if (extra) for (var k in extra) e[k] = extra[k]; ents.push(e); return e; }

        /* --- acabados de piso (debajo de todo lo demás) --- */
        pi.rooms.forEach(function (r) { acabado(r, pl); });

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
        /* muro de fachada relleno (anillo: contorno exterior y luego el interior en sentido contrario) */
        pl('MUROS', [[0, 0], [W, 0], [W, Pl.D], [0, Pl.D], [0, 0], [MURO_EXT, MURO_EXT], [MURO_EXT, Pl.D - MURO_EXT], [W - MURO_EXT, Pl.D - MURO_EXT], [W - MURO_EXT, MURO_EXT], [MURO_EXT, MURO_EXT]], true, { fill: true, alpha: 0.55, noStroke: true, soloVista: true });
        rect('MUROS', 0, 0, W, Pl.D, { ext: true });
        rect('MUROS', MURO_EXT, MURO_EXT, W - 2 * MURO_EXT, Pl.D - 2 * MURO_EXT, { ext: true });
        if (pi.n === 1 && Pl.patio > 0.5) { ln('MUROS', 0, Pl.D, 0, Pl.L); ln('MUROS', W, Pl.D, W, Pl.L); ln('MUROS', 0, Pl.L, W, Pl.L); }
        var ABIERTO = /^(patio|pasillo|piscina|jacuzzi|bbq)$/;   /* espacios exteriores o de circulación: sin muros propios */
        pi.rooms.forEach(function (r) {
            if (ABIERTO.test(r.tipo)) return;
            rect('MUROS', r.x + MURO / 2, r.y + MURO / 2, r.w - MURO, r.h - MURO);
        });

        /* --- ventanas en fachada (frente y fondo) --- */
        pi.rooms.forEach(function (r) {
            if (ABIERTO.test(r.tipo) || r.tipo === 'escalera') return;
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
            /* ambientes de la zona de cuartos (incluye los pedidos adicionales): puerta hacia el pasillo central */
            if (r.zona && r.tipo !== 'closet' && r.tipo !== 'ascensor') {
                var iz = r.x < Pl.a - 0.01; r._puertaDer = iz;
                if (iz) puerta(r.x + r.w - 0.12, r.y + 0.2, dw, 'left'); else puerta(r.x + 0.12, r.y + 0.2 + dw, dw, 'right');
                return;
            }
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
                    r._puertaDer = izq;   /* puerta en el muro derecho del ambiente */
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
        pi.rooms.forEach(function (r) { delete r._ly; mobiliario(r, pl); });

        /* --- textos de ambientes --- */
        pi.rooms.forEach(function (r) {
            if (r.tipo === 'pasillo' && r.w < 2) return;
            var hT = r.w < 2 ? 0.16 : 0.22, cy = r._ly != null ? r._ly : r.y + r.h / 2 + (r.tipo === 'escalera' ? 0.2 : 0);
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
    /* ------------------------------------------------------------------ MOBILIARIO DETALLADO
       Biblioteca de símbolos en planta (vista superior) dibujados como en un plano de arquitectura real:
       camas con almohadas y edredón, mesas de noche con lámpara, sofás con cojines, comedores con sillas,
       inodoro, lavamanos, ducha, estufa, lavaplatos, nevera, lavadora, carro, árboles, plantas…
       Cada símbolo se dibuja en coordenadas locales (u a lo largo del muro, v hacia el interior del espacio)
       con un «lápiz» que lo gira y lo ubica. Colores por material (tonos) y rellenos suaves para dar volumen. */
    var TONOS = {
        madera: ['#d6a35c', '#92400e'], cama: ['#fbbf24', '#b45309'], tela: ['#f472b6', '#be185d'], sanit: ['#7dd3fc', '#0369a1'],
        cocina: ['#fb923c', '#c2410c'], verde: ['#4ade80', '#15803d'], carro: ['#f87171', '#b91c1c'], vidrio: ['#a5f3fc', '#0e7490'],
        metal: ['#cbd5e1', '#475569'], piso: ['#243247', '#e5e7eb']
    };
    function F(col, a) { return { col: col, fill: true, alpha: a }; }
    function Dl(col, sw) { return sw ? { col: col, sw: sw } : { col: col }; }
    function lapiz(pl, ox, oy, rot) {
        var c = [1, 0, -1, 0][rot & 3], s = [0, 1, 0, -1][rot & 3];
        function T(p) { return [ox + p[0] * c - p[1] * s, oy + p[0] * s + p[1] * c]; }
        function poly(pts, closed, ex) { return pl('MOBILIARIO', pts.map(T), closed, ex); }
        var S = {
            poly: poly,
            ln: function (u1, v1, u2, v2, ex) { return poly([[u1, v1], [u2, v2]], false, ex); },
            rect: function (u, v, w, h, ex) { return poly([[u, v], [u + w, v], [u + w, v + h], [u, v + h]], true, ex); },
            rr: function (u, v, w, h, r, ex) {
                r = Math.max(0.001, Math.min(r, w / 2, h / 2)); var p = [];
                [[u + w - r, v + r, -90], [u + w - r, v + h - r, 0], [u + r, v + h - r, 90], [u + r, v + r, 180]].forEach(function (k) {
                    for (var i = 0; i <= 4; i++) { var a = (k[2] + i * 22.5) * Math.PI / 180; p.push([k[0] + r * Math.cos(a), k[1] + r * Math.sin(a)]); }
                });
                return poly(p, true, ex);
            },
            elip: function (cu, cv, ru, rv, ex, n) { n = n || 24; var p = []; for (var i = 0; i < n; i++) { var a = 2 * Math.PI * i / n; p.push([cu + ru * Math.cos(a), cv + rv * Math.sin(a)]); } return poly(p, true, ex); },
            circ: function (cu, cv, r, ex) { return S.elip(cu, cv, r, r, ex, r < 0.08 ? 12 : 24); },
            arc: function (cu, cv, r, a0, a1, ex) { var p = []; for (var i = 0; i <= 12; i++) { var a = a0 + (a1 - a0) * i / 12; p.push([cu + r * Math.cos(a), cv + r * Math.sin(a)]); } return poly(p, false, ex); },
            hoja: function (cu, cv, ang, len, ex) {   /* hoja de planta: lente alargada */
                var p = [], dx = Math.cos(ang), dy = Math.sin(ang), i, t, wv;
                for (i = 0; i <= 8; i++) { t = i / 8; wv = Math.sin(Math.PI * t) * len * 0.22; p.push([cu + dx * t * len - dy * wv, cv + dy * t * len + dx * wv]); }
                for (i = 7; i >= 1; i--) { t = i / 8; wv = Math.sin(Math.PI * t) * len * 0.22; p.push([cu + dx * t * len + dy * wv, cv + dy * t * len - dx * wv]); }
                return poly(p, true, ex);
            }
        };
        return S;
    }
    var SIM = {
        cama: function (S, bw, bl, doble) {
            S.rr(-bw / 2 - 0.03, 0, bw + 0.06, bl, 0.05, F('madera', 0.22));                     /* estructura */
            S.rect(-bw / 2 - 0.05, 0, bw + 0.1, 0.07, F('madera', 0.75));                          /* cabecero */
            S.rr(-bw / 2 + 0.03, 0.09, bw - 0.06, bl - 0.13, 0.06, Dl('cama'));                   /* colchón */
            var n = doble ? 2 : 1, g = 0.08, pw = (bw - 0.16 - g * (n - 1)) / n;
            for (var i = 0; i < n; i++) { var u = -bw / 2 + 0.08 + i * (pw + g); S.rr(u, 0.14, pw, 0.36, 0.11, F('tela', 0.4)); S.ln(u + 0.1, 0.32, u + pw - 0.1, 0.32, Dl('tela', 0.007)); }
            S.rr(-bw / 2 + 0.02, 0.6, bw - 0.04, bl - 0.64, 0.05, F('cama', 0.3));               /* edredón */
            S.ln(-bw / 2 + 0.02, 0.8, bw / 2 - 0.02, 0.8, Dl('cama'));                           /* doblez de la sábana */
            S.ln(-bw / 2 + 0.15, 1.15, bw / 2 - 0.45, 1.15, Dl('cama', 0.006)); S.ln(-bw / 2 + 0.15, 1.5, bw / 2 - 0.6, 1.5, Dl('cama', 0.006));
            S.poly([[bw / 2 - 0.02, bl - 0.78], [bw / 2 - 0.5, bl - 0.04], [bw / 2 - 0.02, bl - 0.04]], true, F('tela', 0.45)); /* esquina doblada */
        },
        mesaNoche: function (S, s) {
            S.rr(-s / 2, 0, s, s * 0.9, 0.04, F('madera', 0.3));
            S.circ(0, s * 0.45, s * 0.27, F('cama', 0.25)); S.circ(0, s * 0.45, s * 0.08, F('cama', 0.9));
            S.ln(-s * 0.27, s * 0.45, s * 0.27, s * 0.45, Dl('cama', 0.006)); S.ln(0, s * 0.18, 0, s * 0.72, Dl('cama', 0.006));
        },
        closet: function (S, L, d) {
            S.rect(-L / 2, 0, L, d, F('madera', 0.14));
            S.ln(-L / 2 + 0.06, d * 0.45, L / 2 - 0.06, d * 0.45, Dl('metal', 0.012));          /* tubo */
            for (var u = -L / 2 + 0.12; u < L / 2 - 0.08; u += 0.11) S.ln(u - 0.03, d * 0.45 - 0.19, u + 0.03, d * 0.45 + 0.19, Dl('tela', 0.009)); /* ganchos */
            S.ln(-L / 2, d - 0.03, 0.06, d - 0.03, Dl('madera', 0.02)); S.ln(-0.06, d - 0.08, L / 2, d - 0.08, Dl('madera', 0.02)); /* puertas corredizas */
        },
        sofa: function (S, L, d, n) {
            S.rr(-L / 2, 0, L, d, 0.09, F('tela', 0.12));
            S.rr(-L / 2, 0, L, 0.22, 0.08, F('tela', 0.45));                                      /* espaldar */
            S.rr(-L / 2, 0, 0.2, d, 0.08, F('tela', 0.45)); S.rr(L / 2 - 0.2, 0, 0.2, d, 0.08, F('tela', 0.45)); /* brazos */
            var cw = (L - 0.4) / n;
            for (var i = 0; i < n; i++) S.rr(-L / 2 + 0.2 + i * cw + 0.02, 0.25, cw - 0.04, d - 0.29, 0.08, F('tela', 0.22));
            if (n > 1) S.rr(-L / 2 + 0.24, 0.24, 0.3, 0.15, 0.06, F('cama', 0.55));               /* cojín decorativo */
        },
        mesaCentro: function (S, w, h) {
            S.rr(-w / 2, 0, w, h, 0.1, F('vidrio', 0.15)); S.rr(-w / 2 + 0.06, 0.06, w - 0.12, h - 0.12, 0.07, Dl('vidrio', 0.006));
            for (var k = 0; k < 5; k++) S.hoja(w * 0.25, h / 2, k * 1.26 + 0.4, 0.13, F('verde', 0.45));
            S.circ(w * 0.25, h / 2, 0.05, F('madera', 0.8));
        },
        silla: function (S) { S.rr(-0.21, 0.07, 0.42, 0.4, 0.07, F('tela', 0.3)); S.rr(-0.22, 0, 0.44, 0.08, 0.03, F('madera', 0.75)); },
        sillaOficina: function (S) {
            S.circ(0, 0, 0.24, F('tela', 0.3)); S.rr(-0.22, -0.33, 0.44, 0.1, 0.04, F('tela', 0.6));
            S.rr(-0.28, -0.18, 0.06, 0.3, 0.03, F('metal', 0.5)); S.rr(0.22, -0.18, 0.06, 0.3, 0.03, F('metal', 0.5));
        },
        inodoro: function (S) {
            S.rr(-0.25, 0, 0.5, 0.2, 0.05, F('sanit', 0.35)); S.circ(0, 0.1, 0.03, F('metal', 0.8));           /* tanque */
            S.elip(0, 0.46, 0.2, 0.27, F('sanit', 0.14)); S.elip(0, 0.48, 0.13, 0.18, Dl('sanit'));            /* taza y asiento */
        },
        lavamanos: function (S, L) {
            S.rr(-L / 2, 0, L, 0.48, 0.04, F('metal', 0.12));
            S.elip(0, 0.27, Math.min(0.22, L / 2 - 0.08), 0.15, F('sanit', 0.25)); S.circ(0, 0.3, 0.025, Dl('metal'));
            S.rr(-0.02, 0.03, 0.04, 0.13, 0.015, F('metal', 0.8)); S.circ(-0.08, 0.07, 0.025, F('metal', 0.6)); S.circ(0.08, 0.07, 0.025, F('metal', 0.6));
        },
        ducha: function (S, a, b) {   /* S en la esquina inferior izquierda del plato; abierta hacia +u y -v */
            S.rect(0, 0, a, b, F('sanit', 0.1));
            [[0, 0], [a, 0], [a, b], [0, b]].forEach(function (q) { S.ln(q[0], q[1], a / 2 + (q[0] ? 0.05 : -0.05), b / 2 + (q[1] ? 0.05 : -0.05), Dl('sanit', 0.005)); });
            S.circ(a / 2, b / 2, 0.05, Dl('metal')); S.ln(a / 2 - 0.035, b / 2, a / 2 + 0.035, b / 2, Dl('metal', 0.006));
            S.circ(a * 0.25, b - 0.12, 0.07, F('metal', 0.45)); S.circ(a * 0.25, b - 0.12, 0.03, F('metal', 0.9));   /* regadera */
            S.ln(a, 0, a, b, Dl('vidrio', 0.022)); S.ln(0, 0, a * 0.35, 0, Dl('vidrio', 0.022)); S.arc(a * 0.35, 0, a * 0.6, Math.PI, Math.PI * 1.5, Dl('vidrio', 0.006));
        },
        lavadora: function (S) {
            S.rr(-0.3, 0, 0.6, 0.6, 0.05, F('metal', 0.2)); S.ln(-0.3, 0.1, 0.3, 0.1, Dl('metal', 0.006));
            S.circ(0, 0.35, 0.2, F('vidrio', 0.12)); S.circ(0, 0.35, 0.12, Dl('vidrio')); S.circ(0.19, 0.05, 0.025, F('metal', 0.7));
        },
        lavadero: function (S) {
            S.rr(-0.35, 0, 0.7, 0.6, 0.04, F('sanit', 0.15));
            for (var k = 0; k < 5; k++) S.ln(-0.3, 0.12 + k * 0.08, -0.04, 0.12 + k * 0.08, Dl('sanit', 0.005));
            S.rr(0.0, 0.08, 0.3, 0.44, 0.05, F('sanit', 0.22)); S.circ(0.15, 0.3, 0.025, Dl('metal')); S.rr(0.13, 0.02, 0.04, 0.1, 0.015, F('metal', 0.8));
        },
        escritorio: function (S, L) {
            S.rr(-L / 2, 0, L, 0.6, 0.03, F('madera', 0.2));
            S.rr(-0.28, 0.08, 0.56, 0.06, 0.02, F('metal', 0.85)); S.rr(-0.06, 0.14, 0.12, 0.08, 0.02, F('metal', 0.5));   /* monitor */
            S.rr(-0.22, 0.3, 0.44, 0.13, 0.02, Dl('metal')); S.elip(0.32, 0.36, 0.035, 0.05, Dl('metal'));               /* teclado y mouse */
            if (L > 1.1) { S.circ(L / 2 - 0.16, 0.16, 0.08, F('cama', 0.4)); S.circ(L / 2 - 0.16, 0.16, 0.025, F('cama', 0.9)); }
        },
        estanteria: function (S, L, d) {
            S.rect(-L / 2, 0, L, d, F('madera', 0.18));
            var cols = ['tela', 'cama', 'sanit', 'verde', 'cocina'], u = -L / 2 + 0.04, k = 0;
            while (u < L / 2 - 0.08) { var bw = 0.035 + (k * 7 % 5) * 0.008; S.rect(u, 0.03, bw, d - 0.07 - (k % 3) * 0.03, F(cols[k % 5], 0.5)); u += bw + 0.012; k++; if (k % 9 === 0) u += 0.08; }
        },
        tv: function (S, L) {
            S.rect(-L / 2, 0, L, 0.4, F('madera', 0.2)); S.rr(-L * 0.36, 0.05, L * 0.72, 0.07, 0.02, F('metal', 0.85));
            S.circ(-L / 2 + 0.15, 0.22, 0.07, Dl('metal')); S.circ(L / 2 - 0.15, 0.22, 0.07, Dl('metal'));
        },
        alfombra: function (S, u, v, w, h) { S.rect(u, v, w, h, F('tela', 0.07)); S.rect(u + 0.08, v + 0.08, w - 0.16, h - 0.16, Dl('tela', 0.005)); },
        maceta: function (S, r) { S.circ(0, 0, r, F('madera', 0.3)); for (var k = 0; k < 7; k++) S.hoja(0, 0, k * 0.9 + 0.3, r * 1.6, F('verde', 0.35)); },
        arbol: function (S, R) {
            var p = [], q = [], i, a;
            for (i = 0; i < 40; i++) { a = 2 * Math.PI * i / 40; p.push([R * (1 + 0.07 * Math.sin(9 * a)) * Math.cos(a), R * (1 + 0.07 * Math.sin(9 * a)) * Math.sin(a)]); q.push([0.6 * R * (1 + 0.09 * Math.sin(7 * a + 1)) * Math.cos(a), 0.6 * R * (1 + 0.09 * Math.sin(7 * a + 1)) * Math.sin(a)]); }
            S.poly(p, true, F('verde', 0.22)); S.poly(q, true, F('verde', 0.2));
            for (i = 0; i < 6; i++) { a = i * 1.05 + 0.3; S.ln(0, 0, 0.55 * R * Math.cos(a), 0.55 * R * Math.sin(a), Dl('madera', 0.012)); }
            S.circ(0, 0, R * 0.1, F('madera', 0.85));
        }
    };
    /* carro en planta: el frente está en v = 0 del lápiz (rot 2 = frente hacia arriba / al fondo del garaje) */
    function carro(pl, cx, py, Wc, Lc, rot) {
        var S = lapiz(pl, cx, py, rot || 0), k = Lc / 4.4; function q(v) { return v * k; }
        S.rr(-Wc / 2, 0, Wc, Lc, 0.45, F('carro', 0.18));                                                   /* carrocería */
        S.rr(-0.3, q(0.04), 0.6, 0.08, 0.03, F('metal', 0.5));                                               /* parrilla */
        S.rr(-Wc / 2 + 0.15, q(0.08), 0.38, 0.13, 0.05, F('cama', 0.75)); S.rr(Wc / 2 - 0.53, q(0.08), 0.38, 0.13, 0.05, F('cama', 0.75)); /* farolas */
        S.ln(-Wc * 0.22, q(0.3), -Wc * 0.18, q(1.15), Dl('carro', 0.008)); S.ln(Wc * 0.22, q(0.3), Wc * 0.18, q(1.15), Dl('carro', 0.008)); /* capó */
        S.poly([[-Wc / 2 + 0.17, q(1.25)], [Wc / 2 - 0.17, q(1.25)], [Wc / 2 - 0.27, q(1.85)], [-Wc / 2 + 0.27, q(1.85)]], true, F('vidrio', 0.35)); /* parabrisas */
        S.rr(-Wc / 2 + 0.27, q(1.88), Wc - 0.54, q(1.25), 0.12, F('carro', 0.32));                           /* techo */
        [-1, 1].forEach(function (sg) {
            S.poly([[sg * (Wc / 2 - 0.1), q(1.35)], [sg * (Wc / 2 - 0.25), q(1.9)], [sg * (Wc / 2 - 0.25), q(3.1)], [sg * (Wc / 2 - 0.1), q(3.3)]], true, F('vidrio', 0.3)); /* ventanas */
            S.poly([[sg * Wc / 2, q(1.35)], [sg * (Wc / 2 + 0.18), q(1.42)], [sg * (Wc / 2 + 0.16), q(1.56)], [sg * Wc / 2, q(1.56)]], true, F('carro', 0.55)); /* espejos */
            [q(0.6), Lc - q(1.25)].forEach(function (v) { S.rr(sg > 0 ? Wc / 2 - 0.19 : -Wc / 2 - 0.05, v, 0.24, q(0.66), 0.08, F('metal', 0.85)); }); /* llantas */
            S.rr(sg > 0 ? Wc / 2 - 0.47 : -Wc / 2 + 0.12, Lc - 0.16, 0.35, 0.1, 0.04, F('carro', 0.85));          /* stops */
        });
        S.poly([[-Wc / 2 + 0.27, q(3.16)], [Wc / 2 - 0.27, q(3.16)], [Wc / 2 - 0.2, q(3.55)], [-Wc / 2 + 0.2, q(3.55)]], true, F('vidrio', 0.35)); /* vidrio trasero */
        S.ln(-Wc / 2 + 0.15, q(3.75), Wc / 2 - 0.15, q(3.75), Dl('carro', 0.008));                          /* baúl */
    }
    /* comedor: mesa con sillas en ambos lados (y cabeceras si es larga), puestos servidos y centro de mesa */
    function comedor(pl, cx, cy, tw, th) {
        var S = lapiz(pl, cx, cy, 0);
        S.rr(-tw / 2, -th / 2, tw, th, 0.08, F('madera', 0.25)); S.rr(-tw / 2 + 0.05, -th / 2 + 0.05, tw - 0.1, th - 0.1, 0.06, Dl('madera', 0.006));
        S.elip(0, 0, Math.min(0.2, tw * 0.12), 0.09, F('verde', 0.4));
        var n = Math.max(1, Math.floor(tw / 0.55));
        for (var i = 0; i < n; i++) {
            var u = -tw / 2 + tw * (i + 0.5) / n;
            SIM.silla(lapiz(pl, cx + u, cy - th / 2 - 0.5, 0)); SIM.silla(lapiz(pl, cx + u, cy + th / 2 + 0.5, 2));
            S.circ(u, -th / 2 + 0.17, 0.1, Dl('metal')); S.circ(u, th / 2 - 0.17, 0.1, Dl('metal'));
        }
        if (tw >= 1.4) { SIM.silla(lapiz(pl, cx - tw / 2 - 0.5, cy, 3)); SIM.silla(lapiz(pl, cx + tw / 2 + 0.5, cy, 1)); }
    }
    function mesaRedonda(pl, cx, cy, R, nS) {
        var S = lapiz(pl, cx, cy, 0); S.circ(0, 0, R, F('madera', 0.25)); S.circ(0, 0, R * 0.25, F('verde', 0.35));
        for (var i = 0; i < nS; i++) {
            var a = 2 * Math.PI * i / nS + Math.PI / 4, d = R + 0.32;
            var C = lapiz(pl, cx + d * Math.cos(a), cy + d * Math.sin(a), 0); C.circ(0, 0, 0.19, F('tela', 0.3)); C.circ(0, 0, 0.1, Dl('tela', 0.006));
        }
    }
    function mobiliario(r, pl) {
        var x = r.x, y = r.y, w = r.w, h = r.h, cx = x + w / 2, cy = y + h / 2, G = lapiz(pl, 0, 0, 0), k, i;
        /* mesas de trabajo con sillas a ambos lados, en retícula, dejando circulación junto a la puerta */
        function mesas(tw, th, gap) {
            for (var my = y + 1.0; my + th + 0.55 < y + h - 0.4; my += th + gap + 0.6)
                for (var mx = x + 0.6; mx + tw < x + w - 0.5; mx += tw + gap) comedor(pl, mx + tw / 2, my + th / 2, tw, th);
        }
        switch (r.tipo) {
            case 'cochera': {
                /* carros estacionados de frente (el capó mira al fondo); atrás queda espacio para el rótulo y una repisa */
                var n = r.extra === 2 && w >= 5 ? 2 : 1, Lc = Math.min(4.4, h - 0.8), y0c = y + 0.2;
                for (i = 0; i < n; i++) carro(pl, n === 2 ? x + w * (i + 0.5) / 2 : cx, y0c + Lc, 1.8, Lc, 2);
                if (h - Lc > 1.6) SIM.estanteria(lapiz(pl, cx, y + h - 0.1, 2), Math.min(2.4, w - 1.2), 0.4);   /* repisa de herramientas al fondo */
                r._ly = y + h - 0.42;
                break;
            }
            case 'local': {
                G.rr(x + 0.5, y + h - 1.2, w - 1.0, 0.6, 0.04, F('madera', 0.2));
                SIM.sillaOficina(lapiz(pl, cx, y + h - 1.6, 2));
                for (k = 0; k < Math.floor((w - 1.2) / 1.6); k++) SIM.estanteria(lapiz(pl, x + 1.2 + k * 1.6, y + 0.1 + MURO, 0), 1.3, 0.4);
                break;
            }
            case 'piscina': {
                /* piscina con borde (coping), agua, escalera de acceso, escalones y camastros con parasol en la playa */
                var md = r.med, pw = md && md.w ? Math.min(w - 0.5, Math.max(md.w, md.h)) : Math.max(1.8, w - (w > 5 ? 2.0 : 0.8)), ph = md && md.w ? Math.min(h - 0.5, Math.min(md.w, md.h)) : Math.max(1.6, h - 1.0);
                var px = x + 0.4, py = y + (h - ph) / 2;
                G.rr(px - 0.15, py - 0.15, pw + 0.3, ph + 0.3, 0.25, F('metal', 0.18));
                G.rr(px, py, pw, ph, 0.15, F('sanit', 0.42));
                for (k = 1; k <= 3; k++) {
                    var vy = py + ph * k / 4, ond = [];
                    for (var ux = px + 0.25; ux <= px + pw - 0.25; ux += 0.12) ond.push([ux, vy + 0.05 * Math.sin((ux - px) * 7 + k)]);
                    if (ond.length > 1) G.poly(ond, false, Dl('vidrio', 0.008));
                }
                for (k = 0; k < 3; k++) G.ln(px + 0.25 + k * 0.28, py + 0.08, px + 0.25 + k * 0.28, py + ph - 0.08, Dl('sanit', 0.012));   /* escalones */
                G.ln(px + pw - 0.35, py + ph - 0.05, px + pw - 0.35, py + ph - 0.55, Dl('metal', 0.02)); G.ln(px + pw - 0.15, py + ph - 0.05, px + pw - 0.15, py + ph - 0.55, Dl('metal', 0.02));
                for (k = 1; k <= 2; k++) G.ln(px + pw - 0.35, py + ph - 0.05 - k * 0.17, px + pw - 0.15, py + ph - 0.05 - k * 0.17, Dl('metal', 0.012));   /* escalerilla */
                var libreX = x + w - (px + pw + 0.15);
                if (libreX >= 0.9) {                                                                 /* camastros y parasol */
                    var nL = Math.max(1, Math.min(2, Math.floor(libreX / 0.75))), lL = Math.min(1.8, h - 1.4), x0L = px + pw + 0.15 + (libreX - nL * 0.75 + 0.15) / 2;
                    for (k = 0; k < nL && lL > 0.9; k++) {
                        var lx = x0L + k * 0.75, ly = y + 0.25;
                        G.rr(lx, ly, 0.6, lL, 0.1, F('tela', 0.28)); G.rr(lx + 0.05, ly + lL - 0.3, 0.5, 0.25, 0.07, F('tela', 0.5));   /* camastro + cabecera */
                    }
                    var um = lapiz(pl, x0L + nL * 0.375 - 0.1, y + h - 0.6, 0); um.circ(0, 0, 0.5, F('cama', 0.25));
                    for (k = 0; k < 8; k++) um.ln(0, 0, 0.5 * Math.cos(k * Math.PI / 4), 0.5 * Math.sin(k * Math.PI / 4), Dl('cama', 0.006));
                }
                break;
            }
            case 'jacuzzi': {
                var jr = Math.max(0.6, Math.min(1.1, Math.min(w, h) / 2 - 0.35)), J = lapiz(pl, cx, cy, 0);
                J.rr(-jr - 0.15, -jr - 0.15, 2 * jr + 0.3, 2 * jr + 0.3, 0.3, F('madera', 0.25));
                J.circ(0, 0, jr, F('sanit', 0.45)); J.circ(0, 0, jr * 0.62, Dl('vidrio', 0.008));
                for (k = 0; k < 8; k++) J.circ(jr * 0.82 * Math.cos(k * Math.PI / 4), jr * 0.82 * Math.sin(k * Math.PI / 4), 0.04, F('metal', 0.8));
                break;
            }
            case 'bbq': {
                var bl_ = Math.min(2.6, w - 0.4);
                G.rect(x + 0.2, y + h - 0.8, bl_, 0.6, F('madera', 0.2));                            /* mesón contra el muro */
                G.rr(x + 0.35, y + h - 0.75, 0.85, 0.5, 0.04, F('metal', 0.4));                     /* parrilla */
                for (var gx_ = x + 0.43; gx_ < x + 1.15; gx_ += 0.08) G.ln(gx_, y + h - 0.7, gx_, y + h - 0.3, Dl('metal', 0.006));
                if (bl_ > 1.9) { G.rr(x + 1.4, y + h - 0.72, 0.6, 0.42, 0.04, F('metal', 0.15)); G.circ(x + 1.7, y + h - 0.51, 0.03, Dl('metal')); }   /* lavaplatos */
                if (h > 2.6 && w > 1.9) mesaRedonda(pl, cx, y + (h - 0.8) / 2, Math.min(0.5, (h - 0.8) / 2 - 0.5), 4);
                break;
            }
            case 'gimnasio': {
                var nT = Math.max(1, Math.min(3, Math.floor((w - 0.4) / 1.0)));
                for (i = 0; i < nT && h >= 2.3; i++) {                                               /* caminadoras */
                    var T_ = lapiz(pl, x + 0.65 + i * 1.0, y + 0.2, 0);
                    T_.rr(-0.4, 0, 0.8, 1.8, 0.1, F('metal', 0.2)); T_.rr(-0.28, 0.35, 0.56, 1.3, 0.05, F('metal', 0.45));
                    for (var bv = 0.45; bv < 1.6; bv += 0.12) T_.ln(-0.28, bv, 0.28, bv, Dl('metal', 0.004));
                    T_.rr(-0.35, 0.05, 0.7, 0.2, 0.05, F('vidrio', 0.4));
                }
                if (h > 3.4) {                                                                       /* banco con barra y colchoneta */
                    var bcx = x + w - 0.9, bcy = y + h - 1.2;
                    G.rr(bcx - 0.18, bcy - 0.6, 0.36, 1.2, 0.06, F('tela', 0.4));
                    G.ln(bcx - 0.75, bcy + 0.45, bcx + 0.75, bcy + 0.45, Dl('metal', 0.03));
                    G.rr(bcx - 0.72, bcy + 0.3, 0.08, 0.3, 0.02, F('metal', 0.85)); G.rr(bcx + 0.64, bcy + 0.3, 0.08, 0.3, 0.02, F('metal', 0.85));
                    if (w > 3.2) G.rr(x + 0.3, y + h - 0.95, Math.min(1.8, w - 2.2), 0.7, 0.05, F('tela', 0.22));
                }
                break;
            }
            case 'vestier': {
                SIM.closet(lapiz(pl, x + 0.15, cy, 3), h - 0.4, Math.min(0.55, w * 0.35));
                if (w > 1.7) SIM.closet(lapiz(pl, x + w - 0.15, cy, 1), h - 0.4, Math.min(0.55, w * 0.35));
                if (w > 2.2 && h > 2) G.rr(cx - 0.3, cy - 0.3, 0.6, 0.6, 0.12, F('tela', 0.35));   /* puf */
                break;
            }
            case 'sala': {
                if (/TV|CINE/.test(r.nombre)) {                                                     /* sala de TV: sofá frente a la pantalla */
                    var Lt = Math.min(2.3, w - 0.8);
                    SIM.alfombra(G, cx - Lt / 2, y + 1.05, Lt, Math.max(0.8, h - 2.0));
                    SIM.sofa(lapiz(pl, cx, y + 0.2, 0), Lt, 0.9, Lt > 1.9 ? 3 : 2);
                    SIM.tv(lapiz(pl, cx, y + h - 0.12, 2), Math.min(1.8, Lt));
                    break;
                }
                var L = Math.min(2.3, w * 0.45), sx = x + 0.35 + L / 2;
                SIM.alfombra(G, sx - L / 2 - 0.1, y + 1.0, L + 0.6, 1.7);
                SIM.sofa(lapiz(pl, sx, y + 0.22, 0), L, 0.9, L > 1.9 ? 3 : 2);                 /* sofá contra el muro */
                SIM.mesaCentro(lapiz(pl, sx, y + 1.35, 0), Math.min(1.1, L * 0.55), 0.55);
                if (w > 3.6) SIM.sofa(lapiz(pl, sx + L / 2 + 0.75, y + 1.6, 1), 0.95, 0.85, 1);   /* sillón mirando al sofá */
                SIM.maceta(lapiz(pl, x + 0.45, y + h - 0.45, 0), 0.17);
                if (w > 4.5 && h > 3.5) comedor(pl, x + w - 1.8, y + h - 1.65, 1.6, 0.9);
                else if (h > 3.2) SIM.tv(lapiz(pl, sx, y + h - 0.12, 2), Math.min(1.8, L));
                break;
            }
            case 'comedor': comedor(pl, cx, cy, Math.min(1.8, w - 1.6), 0.95); SIM.maceta(lapiz(pl, x + w - 0.45, y + h - 0.45, 0), 0.16); r._ly = y + 0.45; break;
            case 'dormp': case 'dorm': {
                var dbl = r.tipo === 'dormp', bw = dbl ? 1.6 : 1.0, bl = 2.0, bx = cx, by = y + h - 0.15 - bl;
                if (by - (y + 0.9) > 0.8) SIM.alfombra(G, bx - bw / 2 - 0.2, by - 0.8, bw + 0.4, 0.65);   /* tapete al pie de la cama */
                SIM.cama(lapiz(pl, bx, y + h - 0.15, 2), bw, bl, dbl);
                var nsz = 0.45;
                if (bx - bw / 2 - nsz - 0.1 > x + 0.1) SIM.mesaNoche(lapiz(pl, bx - bw / 2 - 0.08 - nsz / 2, y + h - 0.15, 2), nsz);
                if (bx + bw / 2 + nsz + 0.1 < x + w - 0.1) SIM.mesaNoche(lapiz(pl, bx + bw / 2 + 0.08 + nsz / 2, y + h - 0.15, 2), nsz);
                var cl = Math.min(1.8, w * 0.45);
                /* clóset y cómoda en el lado contrario a la puerta (la hoja barre ~0.9 m junto a su muro) */
                var der = r._puertaDer;
                SIM.closet(lapiz(pl, der ? x + 0.15 + cl / 2 : x + w - 0.15 - cl / 2, y + 0.15, 0), cl, 0.6);
                var libre = by - (y + 0.9) - 0.15;
                if (dbl && libre >= 0.9) { var cm = Math.min(1.2, libre), cmy = y + 0.9 + libre / 2; SIM.estanteria(der ? lapiz(pl, x + 0.15, cmy, 3) : lapiz(pl, x + w - 0.15, cmy, 1), cm, 0.45); }
                if (by - (y + 0.8) > 0.7) r._ly = (y + 0.8 + by) / 2;
                break;
            }
            case 'bano': {
                var a = Math.min(0.9, w * 0.45), b = Math.min(0.9, h * 0.45);
                SIM.ducha(lapiz(pl, x + 0.15, y + h - 0.15 - b, 0), a, b);
                SIM.inodoro(lapiz(pl, x + w - 0.45, y + h - 0.12, 2));
                /* el lavamanos va en el muro opuesto a la puerta para que la hoja no lo golpee */
                if (r._puertaDer) SIM.lavamanos(lapiz(pl, x + 0.12, y + 0.55, 3), 0.65);
                else SIM.lavamanos(lapiz(pl, x + w - 0.12, y + 0.55, 1), 0.65);
                break;
            }
            case 'cocina': {
                var nev = w > 3.2 ? 0.75 : 0, cw = w - 0.4 - nev;
                G.rect(x + 0.2, y + 0.2, cw, 0.6, F('madera', 0.16)); G.ln(x + 0.2, y + 0.75, x + 0.2 + cw, y + 0.75, Dl('madera', 0.006));
                var leg = Math.min(1.6, h - 1.4);
                if (leg > 0.6) { G.rect(x + 0.2, y + 0.8, 0.6, leg, F('madera', 0.16)); G.ln(x + 0.75, y + 0.8, x + 0.75, y + 0.8 + leg, Dl('madera', 0.006)); }
                var st = x + 1.0;                                                                  /* estufa de 4 puestos */
                G.rr(st, y + 0.23, 0.6, 0.54, 0.03, F('metal', 0.25));
                [[0.16, 0.37, 0.1], [0.44, 0.37, 0.07], [0.16, 0.63, 0.07], [0.44, 0.63, 0.1]].forEach(function (q) {
                    G.circ(st + q[0], y + q[1], q[2], Dl('cocina')); G.circ(st + q[0], y + q[1], q[2] * 0.5, F('cocina', 0.5));
                });
                var sk = x + 0.2 + cw - 1.05;                                                     /* lavaplatos doble */
                if (sk > st + 0.7) {
                    G.rr(sk, y + 0.27, 0.88, 0.46, 0.04, F('metal', 0.15));
                    G.rr(sk + 0.05, y + 0.31, 0.37, 0.38, 0.05, F('sanit', 0.2)); G.rr(sk + 0.46, y + 0.31, 0.37, 0.38, 0.05, F('sanit', 0.2));
                    G.circ(sk + 0.235, y + 0.5, 0.025, Dl('metal')); G.circ(sk + 0.645, y + 0.5, 0.025, Dl('metal')); G.rr(sk + 0.42, y + 0.22, 0.04, 0.12, 0.015, F('metal', 0.8));
                }
                if (nev) {                                                                         /* nevera */
                    G.rr(x + w - 0.93, y + 0.15, 0.73, 0.7, 0.05, F('metal', 0.3)); G.rr(x + w - 0.88, y + 0.2, 0.63, 0.6, 0.04, Dl('metal', 0.006));
                    G.ln(x + w - 0.85, y + 0.83, x + w - 0.28, y + 0.83, Dl('metal', 0.014));
                }
                break;
            }
            case 'lav': {
                SIM.lavadora(lapiz(pl, x + 0.5, y + 0.15, 0));
                if (w >= 1.75) SIM.lavadero(lapiz(pl, x + 1.25, y + 0.15, 0));
                break;
            }
            case 'estudio': {
                var ew = Math.min(1.4, w - 0.5);
                SIM.escritorio(lapiz(pl, x + 0.2 + ew / 2, y + 0.15, 0), ew);
                SIM.sillaOficina(lapiz(pl, x + 0.2 + ew / 2, y + 1.0, 2));
                if (h > 2.4) SIM.estanteria(lapiz(pl, x + w - 0.15, y + h - 0.9, 1), Math.min(1.4, h - 1.4), 0.35);
                break;
            }
            case 'ingreso': {
                SIM.maceta(lapiz(pl, x + w - 0.45, y + h - 0.45, 0), 0.17);
                if (h > 2.2) { G.rr(x + w - 0.5, y + h - 2.0, 0.35, 1.1, 0.03, F('madera', 0.22)); G.ln(x + w - 0.5, y + h - 1.45, x + w - 0.15, y + h - 1.45, Dl('madera', 0.006)); } /* zapatero */
                break;
            }
            case 'deposito': SIM.estanteria(lapiz(pl, cx, y + 0.15, 0), w - 0.4, 0.45); if (h > 1.8) SIM.closet(lapiz(pl, cx, y + h - 0.15, 2), w - 0.4, 0.55); break;
            case 'closet': if (w >= h) SIM.closet(lapiz(pl, cx, y + 0.12, 0), w - 0.3, Math.min(0.6, h - 0.3)); else SIM.closet(lapiz(pl, x + 0.12, cy, 3), h - 0.3, Math.min(0.6, w - 0.3)); break;
            case 'patio': {
                var nA = Math.max(1, Math.floor(w / 3.2)), R = Math.min(0.95, h * 0.38, w / nA * 0.38);
                for (i = 0; i < nA; i++) SIM.arbol(lapiz(pl, x + w * (i + 0.5) / nA, cy, 0), R);
                for (i = 0; i < Math.floor(w * h * 1.6); i++) {                                     /* césped */
                    var gx = x + 0.25 + ((i * 0.6180339) % 1) * (w - 0.5), gy = y + 0.2 + ((i * 0.4142135 + 0.3) % 1) * (h - 0.4), lejos = true;
                    for (var t = 0; t < nA; t++) if (Math.hypot(gx - (x + w * (t + 0.5) / nA), gy - cy) < R + 0.12) lejos = false;
                    if (lejos) lapiz(pl, gx, gy, 0).poly([[-0.05, 0], [-0.015, 0.07], [0, 0.01], [0.015, 0.07], [0.05, 0]], false, Dl('verde', 0.006));
                }
                r._ly = y + 0.35;
                break;
            }
            /* ---- espacios no residenciales ---- */
            case 'recepcion': {
                var mw = Math.min(2.6, w - 1.2);
                G.rr(x + 0.5, y + 0.9, mw, 0.6, 0.05, F('madera', 0.22)); G.rr(x + 0.5, y + 1.5, 0.6, 0.9, 0.05, F('madera', 0.22));
                SIM.sillaOficina(lapiz(pl, x + 0.5 + mw / 2, y + 0.45, 0));
                for (k = 0; k < Math.min(4, Math.floor((w - 1.4) / 0.6)); k++) SIM.silla(lapiz(pl, x + 0.75 + k * 0.6, y + h - 0.15, 2));
                SIM.maceta(lapiz(pl, x + w - 0.45, y + h - 0.45, 0), 0.18);
                break;
            }
            case 'lectura': case 'estudio2': case 'reuniones': mesas(1.6, 0.8, 1.2); break;
            case 'cafeteria': for (var fy0 = y + 1.2; fy0 < y + h - 0.8; fy0 += 1.9) for (var fx0 = x + 1.0; fx0 < x + w - 0.8; fx0 += 1.9) mesaRedonda(pl, fx0, fy0, 0.4, 4); break;
            case 'infantil': {
                SIM.alfombra(G, x + 0.4, y + h - 2.2, Math.min(2.4, w - 0.8), 1.8);
                for (var ix = x + 1.0; ix < x + w - 0.6; ix += 1.7) for (var iy2 = y + 1.0; iy2 < y + h - 2.6; iy2 += 1.7) mesaRedonda(pl, ix, iy2, 0.42, 4);
                break;
            }
            case 'informatica': case 'aula': {
                G.rr(x + w * 0.2, y + h - 0.3, w * 0.6, 0.1, 0.03, F('verde', 0.5));                 /* tablero */
                for (var fy = y + 0.6; fy < y + h - 1.6; fy += 1.4) for (var fx = x + 0.4; fx + 1.2 < x + w - 0.3; fx += 1.4) {
                    if (r.tipo === 'informatica') SIM.escritorio(lapiz(pl, fx + 0.6, fy + 0.55, 2), 1.2);
                    else G.rr(fx, fy, 1.2, 0.55, 0.04, F('madera', 0.22));
                    SIM.sillaOficina(lapiz(pl, fx + 0.6, fy - 0.3, 0));
                }
                break;
            }
            case 'oficina': {
                var ow = Math.min(1.5, w - 0.8);
                SIM.escritorio(lapiz(pl, x + 0.4 + ow / 2, y + 0.15, 0), ow);
                SIM.sillaOficina(lapiz(pl, x + 0.4 + ow / 2, y + 1.0, 2));
                SIM.estanteria(lapiz(pl, x + w - 0.15, y + 0.3 + Math.min(1.8, h - 0.8) / 2, 1), Math.min(1.8, h - 0.8), 0.4);
                SIM.silla(lapiz(pl, x + 0.65, y + h - 0.2, 2)); SIM.silla(lapiz(pl, x + 1.2, y + h - 0.2, 2));
                SIM.maceta(lapiz(pl, x + w - 0.45, y + h - 0.45, 0), 0.16);
                break;
            }
            case 'banos': {                                                          /* batería: cabinas con sanitario y mesón de lavamanos */
                var nc = Math.max(1, Math.min(4, Math.floor((w - 0.6) / 1.0)));
                for (var cI = 0; cI < nc; cI++) { var cx0 = x + 0.3 + cI * 1.0; G.rect(cx0, y + h - 1.6, 0.95, 1.45, F('sanit', 0.06)); SIM.inodoro(lapiz(pl, cx0 + 0.47, y + h - 0.18, 2)); }
                G.rr(x + 0.3, y + 0.3, Math.min(nc * 1.0, w - 0.6), 0.5, 0.04, F('metal', 0.12));
                for (var lI = 0; lI < nc; lI++) { G.elip(x + 0.8 + lI * 1.0, y + 0.55, 0.2, 0.14, F('sanit', 0.25)); G.circ(x + 0.8 + lI * 1.0, y + 0.57, 0.025, Dl('metal')); }
                break;
            }
            case 'deposito2': SIM.estanteria(lapiz(pl, x + 0.15, cy, 3), h - 0.4, 0.45); if (w > 2) SIM.estanteria(lapiz(pl, x + w - 0.15, cy, 1), h - 0.4, 0.45); break;
            case 'auditorio': {
                G.rr(x + w * 0.2, y + h - 1.2, w * 0.6, 0.9, 0.08, F('madera', 0.25));             /* tarima */
                var filas = 0;
                for (var ay = y + 1.0; ay < y + h - 1.6 && filas < 14; ay += 0.9, filas++)
                    for (var axx = x + 0.8; axx < x + w - 0.7; axx += 0.55) SIM.silla(lapiz(pl, axx, ay - 0.25, 0));
                break;
            }
            case 'terraza': {
                for (var tI = 0; tI < Math.max(1, Math.floor(w / 2.2)); tI++) mesaRedonda(pl, x + 1.1 + tI * 2.2, y + h - 1.1, 0.38, 3);
                for (var px2 = x + 0.5; px2 < x + w - 0.3; px2 += 0.6) G.ln(px2, y + 0.4, px2, y + h - 2.0, Dl('madera', 0.02));   /* pérgola */
                SIM.maceta(lapiz(pl, x + 0.45, y + 0.45, 0), 0.2); SIM.maceta(lapiz(pl, x + w - 0.45, y + 0.45, 0), 0.2);
                break;
            }
            case 'ascensor': G.rect(x + 0.3, y + 0.3, w - 0.6, h - 0.6, F('metal', 0.15)); G.ln(x + 0.3, y + 0.3, x + w - 0.3, y + h - 0.3, Dl('metal')); G.ln(x + w - 0.3, y + 0.3, x + 0.3, y + h - 0.3, Dl('metal')); break;
        }
    }
    /* acabado de piso: tono suave por ambiente + baldosa (zonas húmedas) o listones de madera (zonas secas) */
    function acabado(r, pl) {
        var m = MURO / 2 + 0.03, x0 = r.x + m, y0 = r.y + m, x1 = r.x + r.w - m, y1 = r.y + r.h - m, t = r.tipo;
        if (x1 - x0 < 0.4 || y1 - y0 < 0.4) return;
        var humedo = /^(bano|banos|cocina|lav)$/.test(t), madera = /^(dorm|dormp|sala|comedor|estudio|ingreso|oficina|lectura|estudio2|reuniones|infantil|recepcion|auditorio|aula|informatica|closet)$/.test(t);
        if (t === 'vestier') madera = true;
        var tono = humedo ? 'sanit' : madera ? 'madera' : t === 'patio' ? 'verde' : t === 'cochera' ? 'metal' : t === 'piscina' || t === 'jacuzzi' ? 'verde' : 'piso';
        pl('ACABADOS', [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, { col: tono, fill: true, alpha: t === 'patio' ? 0.1 : 0.06, noStroke: true, soloVista: true });
        var o = { col: 'piso', sw: 0.006 }, v;
        if (humedo) {
            for (v = x0 + 0.4; v < x1 - 0.05; v += 0.4) pl('ACABADOS', [[v, y0], [v, y1]], false, o);
            for (v = y0 + 0.4; v < y1 - 0.05; v += 0.4) pl('ACABADOS', [[x0, v], [x1, v]], false, o);
        } else if (madera) {
            var j = 0;
            for (v = y0 + 0.3; v < y1 - 0.05; v += 0.3, j++) {
                pl('ACABADOS', [[x0, v], [x1, v]], false, o);
                for (var u = x0 + 0.5 + (j % 3) * 0.5; u < x1 - 0.1; u += 1.5) pl('ACABADOS', [[u, v - 0.3], [u, v]], false, o);   /* juntas trabadas */
            }
        } else if (t === 'cochera') {
            pl('ACABADOS', [[x0 + 0.3, y0 + 0.3], [x1 - 0.3, y0 + 0.3]], false, { col: 'cama', sw: 0.02 });
        }
    }
    function modelo(Pl, soloPiso) {
        var ents = [], gap = Pl.W + 5;
        Pl.pisos.forEach(function (pi, i) { if (soloPiso && pi.n !== soloPiso) return; ents = ents.concat(dibujarPiso(Pl, pi, soloPiso ? 0 : i * gap)); });
        /* los rellenos «solo vista» (tintes de piso, anillo del muro) no van al DXF */
        ents = ents.filter(function (e) { return !e.soloVista; });
        var layers = {}; Object.keys(LAYERS).forEach(function (k) { layers[k] = { name: k, aci: LAYERS[k], off: false }; });
        ents.forEach(function (e) {
            e.aci = LAYERS[e.layer];
            if (e.col && TONOS[e.col]) { var hx = TONOS[e.col][0]; e.rgb = [parseInt(hx.substr(1, 2), 16), parseInt(hx.substr(3, 2), 16), parseInt(hx.substr(5, 2), 16)]; }
        });
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
            var c = e.col && TONOS[e.col] ? TONOS[e.col][claro ? 1 : 0] : (col[e.layer] || '#94a3b8'), at = conIndices ? ' data-k="' + i + '" data-e="' + ETAPA[e.layer] + '" data-l="' + esc(e.layer || '') + '" class="cxpl-e"' : '';
            var sw = e.sw || (e.layer === 'MUROS' ? (e.ext ? 0.07 : 0.045) : e.layer === 'EJES' ? 0.018 : e.layer === 'MOBILIARIO' ? 0.016 : 0.025);
            if (e.t === 'poly') {
                var pts = e.pts.map(function (p) { return X(p[0]) + ',' + Y(p[1]); }).join(' ');
                var fill = e.fill ? ' fill="' + c + '" fill-opacity="' + (e.alpha || 0.3) + '"' : ' fill="none"';
                out.push('<' + (e.closed ? 'polygon' : 'polyline') + at + ' points="' + pts + '"' + (e.noStroke ? ' stroke="none"' : ' stroke="' + c + '" stroke-width="' + sw + '"') + fill + (e.dash ? ' stroke-dasharray="0.35 0.15 0.06 0.15"' : '') + ' pathLength="1" stroke-linejoin="round"/>');
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
            (p.extras || []).forEach(function (e) { t.push((e.n > 1 ? e.n + ' × ' : '') + e.nombre.toLowerCase()); });
            out.push(ordinal(f) + ' piso: ' + t.join(', '));
        }
        return out.join(' · ');
    }
    /* «Lo que pediste»: cada especificación del usuario contra lo que quedó en la distribución */
    var BUSCA_MED = { principal: /^DORM\. PRINCIPAL/, dorm: /^DORMITORIO/, sala: /^SALA(?:-COMEDOR)?$/, cocina: /^COCINA/, comedor: /^COMEDOR/, bano: /^BAÑO(?! SOCIAL)/, cochera: /^COCHERA/, patio: /PATIO/, estudio: /^ESTUDIO/ };
    var NOMBRE_MED = { principal: 'Dormitorio principal', dorm: 'Dormitorios', sala: 'Sala', cocina: 'Cocina', comedor: 'Comedor', bano: 'Baño', cochera: 'Cochera', patio: 'Patio', estudio: 'Estudio' };
    function cumplimiento(P, Pl) {
        if (P.generico) return '';
        var it = [];
        function cuarto(f, re) { var pi = Pl.pisos[f - 1]; return pi ? pi.rooms.filter(function (r) { return re.test(r.nombre); }) : []; }
        function dims(r) { return f2(r.w) + ' × ' + f2(r.h) + ' m (' + (r.w * r.h).toFixed(1) + ' m²)'; }
        /* casa de varios pisos: los dormitorios pedidos son el total de la casa */
        var casaVarios = P.esCasa && P.n > 1 && P.pisos.some(function (p) { return p && p.dormExpl; });
        if (casaVarios) {
            var pedidoT = 0, hayT = 0;
            for (var fc = 1; fc <= P.n; fc++) { pedidoT += (P.pisos[fc].dorm || 0); hayT += cuarto(fc, /^(?:DORM\. PRINCIPAL|DORMITORIO)/).length; }
            it.push([hayT === pedidoT, hayT + ' dormitorios en total' + (hayT === pedidoT ? '' : ' (pediste ' + pedidoT + ')')]);
        }
        for (var f = 1; f <= P.n; f++) {
            var p = P.pisos[f] || {};
            if (p.dormExpl && !casaVarios) { var nd = cuarto(f, /^(?:DORM\. PRINCIPAL|DORMITORIO)/).length; it.push([nd === p.dorm, nd + ' dormitorio' + (nd === 1 ? '' : 's') + ' en el ' + ordinal(f) + ' piso' + (nd === p.dorm ? '' : ' (pediste ' + p.dorm + ')')]); }
            if (p.banosExpl) { var nb = cuarto(f, /^BAÑO(?! SOCIAL)/).length; if (nb) it.push([nb === p.banos, nb + ' baño' + (nb === 1 ? '' : 's') + ' en el ' + ordinal(f) + ' piso']); }
            if (f === 1 && p.cochera) { var co = cuarto(1, /^COCHERA/)[0]; it.push([!!co, (p.cochera === 2 ? 'Cochera doble' : 'Cochera') + (co ? ': ' + dims(co) : ' — no cupo')]); }
            if (p.cocinaAbierta) it.push([cuarto(f, /COCINA ABIERTA/).length > 0, 'Cocina abierta']);
            (p.extras || []).forEach(function (e) {
                var esc_ = e.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), rs = cuarto(f, new RegExp('^' + esc_ + '(?: \\d+)?$'));
                it.push([rs.length >= e.n, (e.n > 1 ? e.n + ' × ' : '') + e.nombre.charAt(0) + e.nombre.slice(1).toLowerCase() + ' (' + ordinal(f) + ' piso)' + (rs.length ? ': ' + dims(rs[0]) : ' — no cupo')]);
            });
        }
        Object.keys(P.med || {}).forEach(function (k) {
            var m = P.med[k], re = BUSCA_MED[k];
            if (!re) { var ex = EXTRAS.filter(function (x) { return x[0] === k; })[0]; if (!ex) return; re = new RegExp('^' + ex[2]); }
            var r = null; for (var f3 = 1; f3 <= P.n && !r; f3++) r = cuarto(f3, re)[0];
            var pedido = m.w ? f2(m.w) + ' × ' + f2(m.h) + ' m (' + m.A.toFixed(1) + ' m²)' : m.A.toFixed(1) + ' m²';
            var nom = NOMBRE_MED[k] || (EXTRAS.filter(function (x) { return x[0] === k; })[0] || [0, 0, k])[2];
            nom = nom.charAt(0) + nom.slice(1).toLowerCase();
            if (!r) { it.push([false, nom + ' de ' + pedido + ' — no encontré ese ambiente en la distribución']); return; }
            var A = k === 'piscina' && r.med ? m.A : r.w * r.h, ok = Math.abs(A - m.A) / m.A <= 0.2;
            it.push([ok, nom + ': pediste ' + pedido + ' → ' + (k === 'piscina' ? 'vaso de ' + pedido + ' en un espacio de ' + dims(r) : dims(r))]);
        });
        if (!it.length) return '';
        return '<div class="cxpl-cumple"><b>Lo que pediste</b><ul>' + it.map(function (x) { return '<li class="' + (x[0] ? 'si' : 'aj') + '">' + (x[0] ? '✓ ' : '≈ ') + esc(x[1]) + '</li>'; }).join('') + '</ul></div>';
    }
    function propuesta(texto, P) {
        var Pl = plan(P); actual = { P: P, Pl: Pl, estado: 'propuesta', texto: texto };
        var filas = tabla(Pl);
        var c = tarjeta(
            '<div class="civix-md">🏗️ Te propongo esta distribución (lote ' + f2(P.W) + ' × ' + f2(P.L) + ' m, ' + P.n + ' piso' + (P.n > 1 ? 's' : '') + '):<br><small>' + esc(resumenPisos(P)) + '</small></div>' +
            cumplimiento(P, Pl) +
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

    /* =================================================================== 6. MODO CINE CON VARIOS AGENTES
       Cada «agente» es un dibujante con su cursor, color y nombre que se encarga de un apartado del plano
       (según la capa): puntos topográficos, triangulación, curvas, cuadrícula, concreto, armadura, cotas, rótulos,
       muros, carpintería, mobiliario… Todos trabajan a la vez; cada línea se traza de forma continua y el cursor
       la recorre. Animación con requestAnimationFrame (con respaldo por temporizador si la pestaña está oculta). */
    var ROLES = [
        /* [nombre del agente, patrón de capa, color, inicio relativo (0–1) dentro de la animación] */
        ['Marco y rótulo', /MARCO|CAJETIN|ROTULO|TITLE|BORDER|FRAME|LAMINA/, '#94a3b8', 0],
        ['Topógrafo · puntos', /^PUNTOS|COTAS-PUNTOS/, '#facc15', 0],
        ['Triangulación', /^TIN|TRIANG/, '#a5b4c8', 0.06],
        ['Curvas de nivel', /^CURVA|MAESTRA|INDICE/,'#f97316', 0.22],
        ['Cuadrícula y ejes', /CUADRIC|^EJES?\b|GRID|AXIS|REJILLA/, '#818cf8', 0],
        ['Columnas', /^COLUMNAS?$/, '#22d3ee', 0.04],
        ['Muros', /^MUROS?$/, '#2dd4bf', 0.08],
        ['Carpintería', /PUERTA|VENTANA/, '#4ade80', 0.3],
        ['Escalera', /ESCALERA/, '#e879f9', 0.3],
        ['Mobiliario', /MOBILIARIO|EQUIPO|MUEBLE/, '#fbbf24', 0.38],
        ['Pisos y acabados', /^ACABADOS/, '#a5b4c8', 0.12],
        ['Armadura', /ARMAD|ACERO|ESTRIB|REFUER|VARILL|REBAR|STEEL/, '#ef4444', 0.18],
        ['Concreto y suelo', /CONTORNO|CONCRET|SUELO|ASFALTO|APOYO|SOMBRA|LOSA|VIGA|ZAPATA|PERFIL|OUTLINE|TERRENO|ESTRUC/, '#a3e635', 0.02],
        ['Cotas', /COTA|DIM|ACOT/, '#38bdf8', 0.4],
        ['Rotulación', /TEXT|TXT|ETIQ|LABEL|NOTA|LEYENDA/, '#e2e8f0', 0.5]
    ];
    function rolDe(capa) {
        var L = String(capa || '').toUpperCase();
        for (var i = 0; i < ROLES.length; i++) if (ROLES[i][1].test(L)) return ROLES[i];
        return ['Detalles', null, '#a78bfa', 0.15];
    }
    /* geometría de un nodo SVG en unidades del dibujo, para que el cursor recorra el trazo */
    function geometria(n) {
        var tag = n.tagName.toLowerCase(), g = { tipo: 'fade', pts: null, len: 0 };
        var conTrazo = n.getAttribute('stroke') && n.getAttribute('stroke') !== 'none' && !n.hasAttribute('stroke-dasharray');
        if ((tag === 'polyline' || tag === 'polygon') && conTrazo) {
            var p = (n.getAttribute('points') || '').trim().split(/\s+/).map(function (s) { var a = s.split(','); return [+a[0], +a[1]]; }).filter(function (a) { return isFinite(a[0]) && isFinite(a[1]); });
            if (tag === 'polygon' && p.length) p.push(p[0]);
            var acc = [0]; for (var i = 1; i < p.length; i++) acc.push(acc[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
            g = { tipo: 'linea', pts: p, acc: acc, len: acc[acc.length - 1] || 0 };
        } else if (tag === 'circle' && conTrazo && (n.getAttribute('fill') === 'none' || !n.getAttribute('fill'))) {
            var r = +n.getAttribute('r'); g = { tipo: 'linea', circ: [+n.getAttribute('cx'), +n.getAttribute('cy'), r], len: 2 * Math.PI * r };
        } else if (tag === 'text') g.pt = [+n.getAttribute('x'), +n.getAttribute('y')];
        else if (tag === 'circle') g.pt = [+n.getAttribute('cx'), +n.getAttribute('cy')];
        else if (tag === 'polygon' || tag === 'polyline') { var q = (n.getAttribute('points') || '').trim().split(/\s+/)[0].split(','); g.pt = [+q[0], +q[1]]; }
        g.fill = n.getAttribute('fill') && n.getAttribute('fill') !== 'none' ? (+n.getAttribute('fill-opacity') || 1) : 0;
        return g;
    }
    function puntoEn(g, p) {
        if (g.circ) { var a = p * 2 * Math.PI; return [g.circ[0] + g.circ[2] * Math.cos(a), g.circ[1] + g.circ[2] * Math.sin(a)]; }
        if (g.pts) {
            if (g.pts.length < 2) return g.pts[0] || [0, 0];
            var d = p * g.len, i = 1; while (i < g.acc.length - 1 && g.acc[i] < d) i++;
            var s = g.acc[i] - g.acc[i - 1] || 1, f = (d - g.acc[i - 1]) / s, A = g.pts[i - 1], B = g.pts[i];
            return [A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f];
        }
        return g.pt || [0, 0];
    }
    /* vistas: [{ fig, svg, etiqueta }] · devuelve { iniciar, velocidad } */
    function motorAgentes(ov, vistas, op) {
        op = op || {};
        var etq = ov.querySelector('.cxpl-etapa'), barra = ov.querySelector('.cxpl-cine-bar i'), leyenda = ov.querySelector('.cxpl-agentes');
        var reducido = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var resumen = {}, agentes = [];
        vistas.forEach(function (v, iv) {
            v.idx = iv;
            var span = Math.max(v.svg.viewBox.baseVal.width, v.svg.viewBox.baseVal.height) || 1, porRol = {};
            [].slice.call(v.svg.querySelectorAll('.cxpl-e')).forEach(function (n) {
                var rol = rolDe(n.getAttribute('data-l')), k = rol[0];
                if (!porRol[k]) { porRol[k] = { rol: rol, nodos: [] }; }
                var g = geometria(n);
                g.peso = g.tipo === 'linea' ? 0.25 + Math.min(3, g.len / span * 7) : (n.tagName.toLowerCase() === 'text' ? 0.3 : 0.07);
                porRol[k].nodos.push({ n: n, g: g });
            });
            Object.keys(porRol).forEach(function (k) {
                var a = porRol[k], acc = [0];
                a.nodos.forEach(function (x, i) { acc.push(acc[i] + x.g.peso); });
                var cur = el('span', 'cxpl-cur', '<i></i><b>' + esc(k) + '</b>');
                cur.style.setProperty('--c', a.rol[2]); v.fig.appendChild(cur);
                agentes.push({ nombre: k, color: a.rol[2], inicio: a.rol[3], nodos: a.nodos, acc: acc, total: acc[acc.length - 1], i: 0, cur: cur, v: v });
                if (!resumen[k]) resumen[k] = { color: a.rol[2], hechos: 0, total: 0 };
                resumen[k].total += acc[acc.length - 1];
            });
        });
        /* cada agente termina según su carga: los de poco trabajo (marco, cotas) acaban antes y no se arrastran */
        var maxT = agentes.reduce(function (m, a) { return Math.max(m, a.total); }, 0) || 1;
        agentes.forEach(function (a) { a.fin = Math.min(1, a.inicio + (1 - a.inicio) * Math.min(1, 0.35 + 0.65 * Math.sqrt(a.total / maxT))); });
        /* leyenda de agentes con su avance */
        var nombres = Object.keys(resumen);
        if (leyenda) leyenda.innerHTML = nombres.map(function (k) { return '<span style="--c:' + resumen[k].color + '"><i></i>' + esc(k) + ' <b data-ag="' + esc(k) + '">0%</b></span>'; }).join('');
        var DUR = op.dur || 16000, vel = 1, t0 = 0, raf = 0, tmr = 0, ultimaLeyenda = 0;
        function poner(x, p) {
            var s = x.n.style;
            if (x.g.tipo === 'linea') { s.strokeDashoffset = String(1 - p); if (x.g.fill) s.fillOpacity = String(x.g.fill * p); }
            else s.opacity = String(p);
        }
        function preparar() {
            agentes.forEach(function (a) {
                a.i = 0; a.cur.style.opacity = 0;
                a.nodos.forEach(function (x) {
                    var s = x.n.style;
                    if (x.g.tipo === 'linea') { s.opacity = '1'; s.strokeDasharray = '1'; s.strokeDashoffset = '1'; if (x.g.fill) s.fillOpacity = '0'; }
                    else s.opacity = '0';
                });
            });
        }
        function acabar() {
            agentes.forEach(function (a) { a.nodos.forEach(function (x) { poner(x, 1); if (x.g.tipo === 'linea') x.n.style.strokeDasharray = ''; }); a.cur.style.opacity = 0; a.i = a.nodos.length; });
            if (leyenda) leyenda.querySelectorAll('[data-ag]').forEach(function (b) { b.textContent = '✓'; });
            etq.textContent = 'Plano terminado'; barra.style.width = '100%';
            if (op.alTerminar) op.alTerminar();
        }
        function cuadro() {
            raf = 0; tmr = 0;
            var t = Math.min(1, (performance.now() - t0) * vel / DUR);
            barra.style.width = (t * 100).toFixed(2) + '%';
            var activos = 0, ctm = {};
            agentes.forEach(function (a) {
                var local = Math.max(0, Math.min(1, (t - a.inicio) / ((a.fin - a.inicio) || 1))), W = local * a.total;
                a.w = W;
                while (a.i < a.nodos.length && a.acc[a.i + 1] <= W) { var x0 = a.nodos[a.i]; poner(x0, 1); if (x0.g.tipo === 'linea') x0.n.style.strokeDasharray = ''; a.i++; }
                var x = a.nodos[a.i];
                if (x && local > 0 && local < 1) {
                    var p = Math.max(0, Math.min(1, (W - a.acc[a.i]) / (x.g.peso || 1)));
                    poner(x, p); activos++;
                    try {
                        var v = a.v, M = ctm[v.idx] || (ctm[v.idx] ={ m: v.svg.getScreenCTM(), r: v.fig.getBoundingClientRect() });
                        var pt = v.svg.createSVGPoint(), q = puntoEn(x.g, p); pt.x = q[0]; pt.y = q[1]; pt = pt.matrixTransform(M.m);
                        a.cur.style.transform = 'translate(' + (pt.x - M.r.left).toFixed(1) + 'px,' + (pt.y - M.r.top).toFixed(1) + 'px)'; a.cur.style.opacity = 1;
                    } catch (e) { }
                } else a.cur.style.opacity = 0;
            });
            var ahora = performance.now();
            if (leyenda && ahora - ultimaLeyenda > 180) {
                ultimaLeyenda = ahora;
                var hechos = {}; agentes.forEach(function (a) { hechos[a.nombre] = (hechos[a.nombre] || 0) + (a.i >= a.nodos.length ? a.total : Math.min(a.w || 0, a.total)); });
                nombres.forEach(function (k) { var b = leyenda.querySelector('[data-ag="' + k.replace(/"/g, '') + '"]'); if (b) { var pc = Math.round(100 * hechos[k] / (resumen[k].total || 1)); b.textContent = pc >= 100 ? '✓' : pc + '%'; } });
                etq.textContent = activos ? activos + ' agente' + (activos === 1 ? '' : 's') + ' dibujando' : 'Preparando…';
            }
            if (t >= 1) { acabar(); return; }
            programar();
        }
        function programar() { if (doc.hidden || !global.requestAnimationFrame) tmr = setTimeout(cuadro, 33); else raf = requestAnimationFrame(cuadro); }
        function iniciar() {
            if (raf) cancelAnimationFrame(raf); clearTimeout(tmr);
            preparar(); t0 = performance.now();
            if (reducido) { acabar(); etq.textContent = 'Plano terminado (animación reducida)'; return; }
            programar();
        }
        function detener() { if (raf) cancelAnimationFrame(raf); clearTimeout(tmr); }
        return {
            iniciar: iniciar, detener: detener,
            velocidad: function () { var t = (performance.now() - t0) * vel; vel = vel === 1 ? 2 : vel === 2 ? 4 : 1; t0 = performance.now() - t / vel; return vel; }
        };
    }
    var CURSOR = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];
    function cine(Pl) {
        var reducido = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var ov = el('div', 'cxpl-cine');
        ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Modo cine: dibujo de las plantas');
        ov.innerHTML = '<div class="cxpl-cine-top"><div><small>CIVIX · PLANOS</small><b>' + (actual && actual.P && actual.P.esCasa ? 'Casa ' : 'Edificio ') + Pl.n + ' piso' + (Pl.n > 1 ? 's' : '') + ' · lote ' + f2(Pl.W) + ' × ' + f2(Pl.L) + ' m</b></div>' +
            '<span class="cxpl-etapa">Preparando…</span><div class="cxpl-cine-acts">' +
            '<button type="button" data-c="vel" title="Velocidad">1×</button><button type="button" data-c="rep" title="Repetir">↺ Repetir</button>' +
            '<button type="button" data-c="dxf">⬇ DXF</button><button type="button" data-c="pdf">⬇ PDF</button><button type="button" data-c="x" aria-label="Cerrar">✕</button></div></div>' +
            '<div class="cxpl-cine-bar"><i></i></div><div class="cxpl-agentes" aria-live="off"></div><div class="cxpl-cine-g" style="--n:' + Math.min(Pl.n, 4) + '"></div>';
        doc.body.appendChild(ov);
        var grid = ov.querySelector('.cxpl-cine-g');
        var vistas = Pl.pisos.map(function (pi, i) {
            var ents = dibujarPiso(Pl, pi, 0);
            var fig = el('figure', 'cxpl-cine-f', '<figcaption style="--c:' + CURSOR[i % CURSOR.length] + '">' + (NOMBRE_PISO[pi.n] || pi.n + '.º') + ' PISO</figcaption>' + svgPiso(ents, false, true));
            grid.appendChild(fig);
            return { fig: fig, svg: fig.querySelector('svg'), etiqueta: ordinal(pi.n) };
        });
        var motor = motorAgentes(ov, vistas, { dur: 15000 + 1500 * Math.min(Pl.n, 4) });
        function cerrar() { motor.detener(); ov.remove(); doc.removeEventListener('keydown', tecla); }
        function tecla(e) { if (e.key === 'Escape') cerrar(); }
        doc.addEventListener('keydown', tecla);
        ov.addEventListener('click', function (e) {
            var b = e.target.closest('[data-c]'); if (!b) return;
            var c = b.getAttribute('data-c');
            if (c === 'x') cerrar();
            else if (c === 'rep') motor.iniciar();
            else if (c === 'vel') b.textContent = motor.velocidad() + '×';
            else accion(c, b);
        });
        setTimeout(motor.iniciar, 350);
        historial('Dibújalo', 'Dibujé las ' + Pl.n + ' plantas en modo cine con varios agentes a la vez (estructura, muros, carpintería, escalera, mobiliario, cotas y rótulos).');
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
        if ((m = q.match(/(\d+|un|uno|una|dos|tres|cuatro|cinco|seis)\s*(?:dormitorios?|habitaciones?|alcobas?|cuartos?)(?!\s+(?:de\s+(?:servicio|juegos|tv|television|maquinas|herramientas)|util|principal\b))/))) { var d = num(m[1]); todos(function (p, f) { if (f > 1 || P.n === 1) { p.dorm = d; p.dormExpl = true; } }); }
        if (/(agrega|anade|otro|un)\w* (?:dormitorio|habitacion|alcoba|cuarto) (?:mas|adicional)|mas dormitorios/.test(q)) todos(function (p) { p.dorm++; });
        if (/(quita|elimina|menos)\w* (?:un )?(?:dormitorio|habitacion|alcoba|cuarto)/.test(q)) todos(function (p) { p.dorm = Math.max(1, p.dorm - 1); });
        if ((m = q.match(/(\d+|un|uno|una|dos|tres|cuatro)\s*banos?/))) { var nb = num(m[1]); todos(function (p) { p.banos = nb; }); }
        else if (/(agrega|anade|otro)\w* (?:un )?bano/.test(q)) todos(function (p) { p.banos++; });
        else if (/(quita|elimina|menos)\w* (?:un )?bano/.test(q)) todos(function (p) { p.banos = Math.max(1, p.banos - 1); });
        if (/cochera simple|un solo (?:carro|auto|puesto)|cochera sencilla/.test(q)) { P.pisos[1].cochera = 1; hubo = true; }
        if (/cochera doble|dos (?:carros|autos|puestos)/.test(q)) { P.pisos[1].cochera = 2; hubo = true; }
        if (/sin cochera|quita(?:r)? la cochera/.test(q)) { P.pisos[1].cochera = 0; P.pisos[1].apto = true; hubo = true; }
        if (/sin lavanderia/.test(q)) todos(function (p) { p.lav = false; });
        /* espacios adicionales: «agrega una piscina», «pon un gimnasio en el segundo piso», «quita la terraza» */
        /* cada cláusula tiene su verbo: «agrega un jacuzzi y quita el gimnasio» (sin verbo, hereda el anterior) */
        var VQ = /\b(quita|quitar|elimina|eliminar|saca|sacar|borra|borrar|sin)\b/, VA = /\b(agrega|agregar|anade|anadir|pon|poner|incluye|incluir|suma|mete|quiero|con|haz|crea)\b/;
        var verboQ = false, clQ = [];
        q.split(/,|;|\s+y\s+|\s+e\s+|\s+tambien\s+/).forEach(function (cl) { if (VQ.test(cl)) verboQ = true; else if (VA.test(cl)) verboQ = false; clQ.push([cl, verboQ]); });
        var quitar = clQ.some(function (c) { return c[1]; });
        EXTRAS.forEach(function (x) {
            var cl = clQ.filter(function (c) { return x[1].test(c[0]); })[0]; if (!cl) return;
            var quitar = cl[1];
            var mp = cl[0].match(new RegExp('(?:en el |en la |al )' + RE_PISO + '\\s*(?:piso|nivel|planta)'));
            var pisoPedido = mp ? Math.max(1, Math.min(P.n, num(mp[1]))) : 0;
            if (quitar) { for (var f = 1; f <= P.n; f++) P.pisos[f].extras = (P.pisos[f].extras || []).filter(function (e) { return e.clave !== x[0]; }); hubo = true; return; }
            var dest = pisoPedido || (x[5] === 'ext' ? 1 : x[5] === 'terr' ? P.n : (P.esCasa && x[0] === 'vestier' ? P.n : 1));
            var pd = P.pisos[dest]; pd.extras = pd.extras || [];
            var ya = pd.extras.filter(function (e) { return e.clave === x[0]; })[0];
            if (ya) { if (/otr[oa]|mas|adicional/.test(q)) ya.n = Math.min(4, ya.n + 1); }
            else pd.extras.push({ clave: x[0], nombre: x[2], area: x[3], tipo: x[4], zona: x[5], n: 1 });
            hubo = true;
        });
        if (/cocina (?:abierta|americana)/.test(q)) { P.pisos[1].cocinaAbierta = !quitar; hubo = true; }
        /* medidas: «el dormitorio principal de 4 x 5», «la piscina de 3 x 8», «sala de 30 m2» */
        var md = medidasDe(q);
        Object.keys(md).forEach(function (k) {
            P.med = P.med || {}; P.med[k] = md[k]; hubo = true;
            for (var f = 1; f <= P.n; f++) (P.pisos[f].extras || []).forEach(function (e) { if (e.clave === k) { e.area = md[k].A; e.med = md[k]; } });
        });
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
        global.__cxCineAuto = { hasta: Date.now() + 6000 };   /* el plano que genere se abre en modo cine */
        return prevSend ? prevSend.call(CAD, t, null) : false;
    }

    /* Atiende un mensaje en modo Planos: arquitectura con este módulo; elementos y obras con Civix CAD.
       Solo lo que ningún generador local resuelve se deja pasar a la IA (con instrucciones de plano CAD). */
    function modoPlanos(texto, q) {
        try {
            if (esElemento(q) && !(actual && /^(dibujalo|si|ok|apruebo|aprobado)\b/.test(q))) {
                if (elementoCAD(texto, q)) return true;
                global.__cxCineAuto = { hasta: Date.now() + 180000 };   /* la respuesta de la IA traerá el plano */
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
            if (/(dise|dibuj|plano|detalle|planta|corte|elevacion|esquema|haz|hazme|genera|crea|dxf|cad)/.test(q)) { global.__cxCineAuto = { hasta: Date.now() + 180000 }; return false; }
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
            /* capa → agente que lo dibuja (un texto suelto en una capa de geometría lo rotula el agente de rótulos) */
            var capa = String(o.e.layer || '');
            if (o.e.t === 'text' && !/COTA|DIM|TEXT|TXT|MARCO|CAJETIN|ROTULO|PUNTO|LEYENDA|NOTA/i.test(capa)) capa = 'TEXTO';
            var e = o.e, c = colorDe(model, e, oscuro), at = ' data-k="' + k + '" data-e="' + o.s + '" data-l="' + esc(capa) + '" class="cxpl-e"', st = ' stroke="' + c + '" stroke-width="' + sw.toFixed(5) + '" pathLength="1"';
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
        var NOMBRES = { viga: 'Viga simplemente apoyada', vigaapoyos: 'Viga con apoyos', vigacont: 'Viga continua', vigat: 'Viga T / L', despieceviga: 'Despiece de viga',
            columna: 'Columna rectangular', columnac: 'Columna circular', columnaflex: 'Columna en flexocompresión', despiececolumna: 'Despiece de columna',
            zapata: 'Zapata aislada', zapatacomb: 'Zapata combinada', zapatacorr: 'Zapata corrida', pilote: 'Pilotes y dado', muro: 'Muro de contención', muroc: 'Muro de contención', murocorte: 'Muro de corte',
            losa: 'Losa maciza', losa2d: 'Losa en dos direcciones', losanerv: 'Losa nervada', escalera: 'Escalera de concreto', cercha: 'Cercha Warren', cerchaph: 'Cercha Pratt / Howe',
            aceroviga: 'Viga de acero', acerocolumna: 'Columna de acero', portico: 'Pórtico', puente: 'Puente' };
        var base = String(o.titulo || o.name || 'plano').replace(/_?civix_?/ig, '').replace(/_lamina$/, '');
        var mCur = base.match(/^curvas_nivel(?:_aleatorio)?_?(\d+)?/i);
        var nombre = NOMBRES[base.toLowerCase()] || (mCur ? 'Curvas de nivel' + (mCur[1] ? ' · semilla ' + mCur[1] : '') : base.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').trim()) || 'Plano';
        var ov = el('div', 'cxpl-cine' + (oscuro ? '' : ' claro'));
        ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Modo cine: dibujo del plano');
        ov.innerHTML = '<div class="cxpl-cine-top"><div><small>CIVIX · PLANOS Y CAD</small><b>' + esc(nombre.charAt(0).toUpperCase() + nombre.slice(1)) + '</b></div>' +
            '<span class="cxpl-etapa">Preparando…</span><div class="cxpl-cine-acts">' +
            '<button type="button" data-c="vel" title="Velocidad">1×</button>' +
            (o.transicion ? '<button type="button" data-c="x" title="Ir directo al resultado">⏭ Saltar</button>' : '<button type="button" data-c="rep" title="Repetir">↺ Repetir</button>' +
            '<button type="button" data-c="dxf">⬇ DXF</button><button type="button" data-c="pdf">⬇ PDF</button>') +
            '<button type="button" data-c="x" aria-label="Cerrar">✕</button></div></div>' +
            '<div class="cxpl-cine-bar"><i></i></div><div class="cxpl-agentes" aria-live="off"></div><div class="cxpl-cine-g cxpl-cine-uno" style="--n:1"></div>';
        doc.body.appendChild(ov);
        var grid = ov.querySelector('.cxpl-cine-g');
        var fig = el('figure', 'cxpl-cine-f', svgModelo(model, oscuro));
        grid.appendChild(fig);
        var nN = fig.querySelectorAll('.cxpl-e').length, cerrado = false;
        /* como transición (al pulsar Calcular / Generar): al terminar de dibujar, el cine se desvanece solo
           y deja al usuario en el apartado del resultado (visor con el plano, memorias, descargas…) */
        var motor = motorAgentes(ov, [{ fig: fig, svg: fig.querySelector('svg'), etiqueta: '' }], {
            dur: Math.max(o.transicion ? 9000 : 11000, Math.min(o.transicion ? 15000 : 20000, 8000 + nN * 6)),
            alTerminar: o.transicion ? function () { setTimeout(cerrar, 1100); } : null
        });
        function cerrar() {
            if (cerrado) return; cerrado = true;
            motor.detener(); doc.removeEventListener('keydown', tecla);
            if (!o.transicion) { ov.remove(); return; }
            ov.classList.add('saliendo');
            /* ahora sí se muestra el resultado (estaba oculto durante el dibujo) */
            doc.body.classList.remove('cxpl-transicion');
            [].forEach.call(doc.querySelectorAll('.cxpl-oculto'), function (n) { n.classList.remove('cxpl-oculto'); n.classList.add('cxpl-aparece'); setTimeout(function () { n.classList.remove('cxpl-aparece'); }, 700); });
            var destino = o.volverA && o.volverA.isConnected ? o.volverA : null;
            if (destino) {
                /* el bloque «VISTA PREVIA // PLANO GENERADO» (.cxp-out) con sus descargas y el visor */
                var sec = destino.closest('.cxp-out') || destino.closest('.mensaje') || destino;
                try { sec.scrollIntoView({ block: 'start', behavior: 'auto' }); } catch (e) { }
                destino.classList.add('cxpl-llegada');
                setTimeout(function () { destino.classList.remove('cxpl-llegada'); }, 1600);
            }
            setTimeout(function () { ov.remove(); }, 520);
        }
        function tecla(e) { if (e.key === 'Escape') cerrar(); }
        doc.addEventListener('keydown', tecla);
        ov.addEventListener('click', function (e) {
            var b = e.target.closest('[data-c]'); if (!b) return;
            var c = b.getAttribute('data-c'), arch = (o.name || 'plano_civix');
            if (c === 'x') cerrar();
            else if (c === 'rep') motor.iniciar();
            else if (c === 'vel') b.textContent = motor.velocidad() + '×';
            else if (c === 'dxf') CAD.download(arch + '.dxf', new Blob([CAD.writeDXF(model)], { type: 'application/dxf' }));
            else if (c === 'pdf' && CAD.exportRaster) CAD.exportRaster(model, 'pdf', arch);
        });
        setTimeout(motor.iniciar, 350);
        return true;
    }
    CAD.cine = cineModelo;

    /* ---- Modo cine automático ----
       Al pulsar «▶ Calcular» / «▶ Generar curvas de nivel» (resultado inmediato) o al pedir un plano a la IA
       («Planos con IA» o modo Planos del chat; la respuesta tarda), el próximo plano que se muestre abre el modo cine solo. */
    function marcarCine(segundos) { global.__cxCineAuto = { hasta: Date.now() + segundos * 1000 }; }
    doc.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('#asistenteModal .cxp-sec button'); if (!b) return;
        var sec = b.closest('.cxp-sec'), t = norm(b.textContent);
        if (/calcular|generar/.test(t) && b.classList.contains('cxp-go')) marcarCine(6);
        else if (sec && sec.getAttribute('data-s') === 'ia' && (b.classList.contains('cxp-card') || b.classList.contains('cxp-chip') || /enviar a civix/.test(t))) marcarCine(180);
    }, true);

    CAD.planosArq = { leer: leer, plan: plan, modelo: modelo, tabla: tabla, cine: function () { return actual && cine(actual.Pl); }, actual: function () { return actual; } };
})(typeof window !== 'undefined' ? window : globalThis);
