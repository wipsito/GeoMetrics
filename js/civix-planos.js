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
        var W = P.W, L = P.L, warns = [];
        var conEsc = P.n > 1 || P.pisos.some(function (p) { return p.escalera; });
        /* «huella»: en los diseños por programa (IA) la edificación se ajusta a lo pedido y lo que sobra del lote
           queda como retiro alrededor (no como huecos «sin construir» por dentro). El muro de fachada se engrosa
           hacia afuera, así la medida libre de cada recinto es siempre su rectángulo menos un muro interior. */
        var huella = !!P.ia && !P.pisos.some(function (p) { return p && p.esquema === 'abierto'; });
        var EXT = MURO_EXT - MURO / 2, bx0 = huella ? EXT : 0, by0 = huella ? EXT : 0, Wu = W - 2 * bx0, Lu = L - 2 * by0;
        /* lotes anchos: varias franjas «crujía | corredor | crujía» para que los recintos tengan proporciones reales
           (no tiras de 14 m de fondo) y todos abran a un corredor */
        var m = Wu >= 20 ? Math.max(2, Math.min(4, Math.round(Wu / 15))) : 1, Wb = Wu / m;
        var cw = Wb >= 9 ? (Wu >= 20 ? 2.0 : 1.6) : 1.3;
        var a = Math.max(3, (Wb - cw) * 0.52), b = Wb - cw - a;
        /* ancho de crujía a partir de las medidas pedidas: el lado del recinto que va a lo ancho + un muro */
        var anchosPed = [];
        if (huella) P.pisos.forEach(function (p) { if (p && p.gen) p.gen.forEach(function (e) { var rq = e.reqStd || e.req; if (rq && e.tipo !== 'banos') anchosPed.push(Math.min(rq.w, rq.h) + MURO); }); });
        if (anchosPed.length) {
            var objetivo = Math.max(2.8, Math.max.apply(null, anchosPed)), cwH = 1.5, mejorM = 1;
            /* cuántas franjas: la menor cantidad que quepa en el fondo del lote */
            var estima = function (mm) {
                var peor = 0;
                P.pisos.forEach(function (p) {
                    if (!p || !p.gen) return; var suma = (conEsc ? 3.6 : 0) + (p.gen.some(function (e) { return e.tipo === 'banos'; }) ? 2.6 : 0);
                    p.gen.forEach(function (e) { if (e.tipo === 'banos') return; var hh = e.req ? Math.max(e.req.w, e.req.h) + MURO : Math.max(2.6, e.area / objetivo); if (e.req && Math.max(e.req.w, e.req.h) + MURO <= objetivo + 1e-6) hh = Math.min(e.req.w, e.req.h) + MURO; suma += hh * e.n; });
                    peor = Math.max(peor, suma / (2 * mm));
                });
                return peor;
            };
            for (var mm = 1; mm <= 4; mm++) { if (mm * (2 * objetivo + cwH) > Wu + 1e-6) break; mejorM = mm; if (estima(mm) <= Lu * 0.98) break; }
            if (mejorM * (2 * objetivo + cwH) <= Wu + 1e-6) { m = mejorM; cw = cwH; a = b = objetivo; Wb = 2 * objetivo + cwH; }
            else a = b = (Wb - cw) / 2;   /* lote angosto: dos crujías iguales, así los dormitorios estándar quedan todos iguales */
        }
        /* dormitorios sin medidas del usuario: medida estándar (3.20 × 3.60 libres) o, si el lote no da, el ancho libre
           de la crujía; la misma para todos */
        var wStd = Math.min(a, b) - MURO;
        P.pisos.forEach(function (p) { if (p && p.gen) p.gen.forEach(function (e) {
            if (!e.reqAuto || !/^dorm/.test(e.tipo)) return;
            e.reqStd = e.reqStd || { w: e.req.w, h: e.req.h };
            e.req = { w: Math.min(e.reqStd.w, wStd), h: e.reqStd.h }; e.area = e.req.w * e.req.h;
        }); });
        var CRU = [], CORR = [], ejesX = [];
        for (var kb = 0; kb < m; kb++) {
            var xb0 = bx0 + kb * Wb;
            CRU.push({ x: xb0, w: a, lado: 'der' }, { x: xb0 + a + cw, w: b, lado: 'izq' });
            CORR.push(xb0 + a); ejesX.push(xb0, xb0 + a, xb0 + a + cw);
        }
        ejesX.push(bx0 + m * Wb);
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
            if (p.esquema === 'abierto') {
                /* gran espacio (nave, bodega, cancha, templo…) atrás y una franja de espacios menores al frente,
                   con vestíbulo de acceso, escalera y baños */
                var todos = [];
                p.gen.forEach(function (e) { for (var k = 1; k <= e.n; k++) todos.push({ nombre: e.n > 1 ? e.nombre + ' ' + k : e.nombre, area: e.area, tipo: e.tipo, principal: e.principal, fondo: e.fondo }); });
                var big = todos.filter(function (e) { return e.principal; })[0] || todos.slice().sort(function (x, y) { return y.area - x.area; })[0];
                var fondo = todos.filter(function (e) { return e !== big && e.fondo; });
                var banda = todos.filter(function (e) { return e !== big && !e.fondo; });
                var fk = fondo.length ? Math.max(3.4, Math.min(8, fondo.reduce(function (s, e) { return s + e.area; }, 0) / W)) : 0;
                /* acceso: solo una circulación (no un recinto inventado) si hay espacios al frente que lo tapen */
                if (f === 1 && banda.length) banda.splice(Math.floor(banda.length / 2), 0, { nombre: 'ACCESO', area: 0, tipo: 'pasillo', acceso: true });
                if (conEsc) banda.push({ nombre: 'ESCALERA', area: 0, tipo: 'escalera' });
                var areaB = banda.reduce(function (s, e) { return s + e.area; }, 0);
                var fb = banda.length ? Math.max(3.4, Math.min(7, (areaB + 9 * banda.filter(function (e) { return !e.area; }).length) / W)) : 0;
                var bigD = big ? Math.max(6, big.area / W) : 0;
                cols[f] = { abierto: true, big: big, banda: banda, fb: fb, fondo: fondo, fk: fk };
                maxD = Math.max(maxD, fb + bigD + fk);
                continue;
            }
            p.gen.forEach(function (e) {
                if (e.tipo === 'banos') return;
                for (var k = 1; k <= e.n; k++) items.push({ nombre: e.n > 1 ? e.nombre + ' ' + k : e.nombre, area: e.area, tipo: e.tipo, req: e.req, privDe: e.privDe, k: k });
            });
            /* baños privados: cada uno se empareja con su espacio (habitación 1 ↔ baño 1…) y se ubica pegado a él */
            var nDe = {}; p.gen.forEach(function (e) { nDe[e.nombre] = e.n; });
            items.forEach(function (e) { if (e.privDe && nDe[e.privDe] != null) { var np = nDe[e.privDe]; e.padre = np > 1 ? e.privDe + ' ' + ((e.k - 1) % np + 1) : e.privDe; } });
            var privs = items.filter(function (e) { return e.padre && items.some(function (x) { return x.nombre === e.padre && !/^(cochera|recepcion|terraza)$/.test(x.tipo); }); });
            items = items.filter(function (e) { return privs.indexOf(e) < 0; });
            /* espacio con medidas pedidas: medida LIBRE (de cara a cara de muro) exacta, si cabe en la crujía.
               w y h son medidas libres; el recinto se dibuja con el espesor de muro adicional */
            function medidaEn(e, crW) {
                var q = e.req; if (!q) return null;
                if (crW >= q.h + MURO - 1e-6) return { w: q.h, h: q.w, ok: true };   /* el lado largo a lo ancho deja menos sobrante */
                if (crW >= q.w + MURO - 1e-6) return { w: q.w, h: q.h, ok: true };
                return { w: crW - MURO, h: q.w * q.h / (crW - MURO), ok: false };
            }
            /* el garaje va primero, sobre la fachada (entra por su portón); luego la recepción */
            var rec = items.filter(function (e) { return e.tipo === 'cochera'; }).concat(items.filter(function (e) { return e.tipo === 'recepcion'; })), ter = items.filter(function (e) { return e.tipo === 'terraza'; });
            items = items.filter(function (e) { return e.tipo !== 'recepcion' && e.tipo !== 'terraza' && e.tipo !== 'cochera'; }).sort(function (x, y) { return y.area - x.area; });
            /* cada espacio va a la crujía que quede menos profunda (la recepción, al frente de la primera) */
            var fijoP = (conEsc ? ESC_H : 0) + (hayBanos(p) ? BAN_H : 0);   /* punto fijo de este piso */
            var listas = CRU.map(function () { return []; }), sums = CRU.map(function (c_, i) { return i === 1 ? fijoP : 0; });
            rec.forEach(function (e) {
                var md0 = medidaEn(e, CRU[0].w);
                if (md0) { e.fijo = true; e.h = md0.h + MURO; e.wReq = md0.w; } else e.h = Math.max(2.6, e.area / CRU[0].w);   /* la recepción también respeta su medida */
                listas[0].push(e); sums[0] += e.h;
            });
            items.concat(ter).forEach(function (e) {
                var mejor = 0, val = Infinity, algunaCabe = e.req && CRU.some(function (c_) { return medidaEn(e, c_.w).ok; });
                CRU.forEach(function (c_, i) {
                    var md = medidaEn(e, c_.w); if (algunaCabe && !md.ok) return;   /* con medidas pedidas: solo crujías donde caben */
                    var h_ = md ? md.h : Math.max(2.6, e.area / c_.w), v_ = sums[i] + h_; if (v_ < val - 1e-6) { val = v_; mejor = i; }
                });
                var md2 = medidaEn(e, CRU[mejor].w);
                if (md2) { e.fijo = true; e.hLibre = md2.h; e.h = md2.h + MURO; e.wReq = md2.w; if (!md2.ok) warns.push(e.nombre.charAt(0) + e.nombre.slice(1).toLowerCase() + ': con ' + f2(e.req.w) + ' × ' + f2(e.req.h) + ' m no cabe en el ancho disponible (' + f2(CRU[mejor].w) + ' m); conservé el área pedida.'); }
                else e.h = Math.max(2.6, e.area / CRU[mejor].w);
                listas[mejor].push(e); sums[mejor] += e.h;
                /* su baño privado va enseguida, en la misma crujía (comparten muro y se entra desde el espacio) */
                privs.forEach(function (bq) {
                    if (bq.padre !== e.nombre) return;
                    var mdb = medidaEn(bq, CRU[mejor].w);
                    if (mdb) { bq.fijo = true; bq.hLibre = mdb.h; bq.h = mdb.h + MURO; bq.wReq = mdb.w; } else bq.h = Math.max(2.0, bq.area / CRU[mejor].w);
                    listas[mejor].push(bq); sums[mejor] += bq.h;
                });
            });
            var eBan = p.gen.filter(function (e) { return e.tipo === 'banos'; })[0];
            cols[f] = { listas: listas, sums: sums, banos: hayBanos(p), banosNombre: eBan ? eBan.nombre : 'BAÑOS' };
            maxD = Math.max.apply(null, [maxD].concat(sums));
        }
        var D = maxD;
        if (D > Lu) {
            var k = (Lu - fijo) / (D - fijo);
            if (k < 0.8) warns.push('El programa pide más área de la que cabe en ' + f2(W) + ' × ' + f2(L) + ' m: las áreas se redujeron un ' + Math.round((1 - k) * 100) + ' %. Considera otro piso o menos espacios.');
            D = Lu;
        }
        if (!(D > 0)) D = Math.min(L, 10);
        var pisos = [];
        for (f = 1; f <= P.n; f++) {
            var c = cols[f], R = [];
            if (c.abierto) {
                var fb_ = Math.min(c.fb, D * 0.45), fijos = c.banda.filter(function (e) { return !e.area; }).length;
                var anchoFijo = Math.min(W * 0.4, fijos * 2.8), resto = W - anchoFijo, aT = c.banda.reduce(function (s, e) { return s + e.area; }, 0) || 1, xb = 0;
                c.banda.forEach(function (e, i) {
                    var w = e.area ? resto * e.area / aT : anchoFijo / fijos;
                    if (i === c.banda.length - 1) w = W - xb;
                    var r = rm(e.nombre, xb, 0, w, fb_, e.tipo); r.banda = true; r.acceso = !!e.acceso; R.push(r); xb += w;
                });
                var fk_ = Math.min(c.fk, D * 0.3);
                if (c.big) { var rb = rm(c.big.nombre, 0, fb_, W, D - fb_ - fk_, c.big.tipo); rb.nave = true; R.push(rb); }
                /* espacios detrás del gran espacio (presbiterio, escenario…): franja posterior, abiertos hacia la nave */
                if (c.fondo.length) {
                    var aF = c.fondo.reduce(function (s, e) { return s + e.area; }, 0) || 1, xf = 0;
                    c.fondo.forEach(function (e, i) { var w = i === c.fondo.length - 1 ? W - xf : W * e.area / aF; var r = rm(e.nombre, xf, D - fk_, w, fk_, e.tipo); r.fondo = true; R.push(r); xf += w; });
                }
                if (f === 1 && L - D >= 1) R.push(rm('RETIRO (LOTE LIBRE)', 0, D, W, L - D, 'retiro'));
                pisos.push({ n: f, rooms: R, p: P.pisos[f] });
                continue;
            }
            CORR.forEach(function (xc) { R.push(rm('CIRCULACIÓN', xc, 0, cw, D, 'pasillo')); });
            CRU.forEach(function (cr, i) {
                /* la segunda crujía lleva el punto fijo (escalera + baños) al frente, igual en todos los pisos */
                var y = 0;
                if (i === 1) {
                    if (conEsc) { R.push(rm('ESCALERA', cr.x, y, cr.w, ESC_H, 'escalera')); y += ESC_H; }
                    /* baños solo en los pisos donde se pidieron (antes se rellenaba con un depósito no pedido) */
                    if (c.banos) { var rbn = rm(c.banosNombre, cr.x, y, cr.w, BAN_H, 'banos'); rbn.lado = cr.lado; R.push(rbn); y += BAN_H; }
                }
                llenar(c.listas[i], cr.x, cr.w, y, D - y, R, cr.lado);
            });
            if (huella) {
                /* la edificación arranca en el lindero (frente e izquierda); el resto del lote es retiro */
                R.forEach(function (r) { r.y += by0; r.frente = r.y < by0 + 0.01; });
                if (f === 1 && L - (D + 2 * by0) >= 1) R.push(rm('RETIRO (LOTE LIBRE)', 0, D + 2 * by0, W, L - D - 2 * by0, 'retiro'));
            } else if (f === 1 && L - D >= 1) R.push(rm('RETIRO (LOTE LIBRE)', 0, D, W, L - D, 'retiro'));
            pisos.push({ n: f, rooms: R, p: P.pisos[f] });
        }
        /* lo que sobra junto a un recinto con medidas exactas: con «huella» queda fuera de la edificación (retiro, sin rótulo) */
        function vacio(x, y, w, h) { var r = rm('SIN CONSTRUIR', x, y, w, h, 'retiro'); if (huella) { r.nombre = ''; r.sinEtiqueta = true; } return r; }
        function llenar(lista, x, w, y0, H, R, lado) {
            var n0 = R.length;
            llenar0(lista, x, w, y0, H, R, lado);
            for (var i = n0; i < R.length; i++) {
                R[i].lado = lado;
                for (var j = 0; j < lista.length; j++) if (lista[j].padre && lista[j].nombre === R[i].nombre) R[i].padre = lista[j].padre;
            }
        }
        function llenar0(lista, x, w, y0, H, R, lado) {
            if (!lista.length) { if (H > 0.5) R.push(P.ia ? vacio(x, y0, w, H) : rm('ÁREA LIBRE', x, y0, w, H, 'libre')); return; }
            if (P.ia && lista.some(function (e) { return e.fijo; })) {
                /* medidas pedidas: esos espacios quedan EXACTOS (ancho y fondo); los demás se ajustan al resto del fondo */
                var fijoT = 0, flexT = 0;
                lista.forEach(function (e) { if (e.fijo) fijoT += e.h; else flexT += e.h; });
                var libreH = H - fijoT, kf = 1, kx = flexT ? Math.min(Math.max(0, libreH) / flexT, 1.2) : 1;
                if (libreH < 0 || (flexT && libreH < flexT * 0.5)) { kf = H / (fijoT + flexT); kx = kf; warns.push('El fondo no alcanza para todas las medidas pedidas en una crujía: se ajustaron proporcionalmente.'); }
                var y_ = y0;
                lista.forEach(function (e) {
                    var h = e.h * (e.fijo ? kf : kx);
                    /* contra la fachada el muro es más grueso: se suma para que la medida libre siga exacta */
                    if (e.fijo && kf === 1 && y_ < 0.01 && !huella) h += MURO_EXT - MURO / 2;
                    var wR = e.fijo ? e.wReq + MURO : w;
                    if (e.fijo && wR < w - 0.05) {
                        var rx = lado === 'der' ? x + w - wR : x;   /* junto al corredor, para que tenga puerta */
                        var r1 = rm(e.nombre, rx, y_, wR, h, e.tipo); r1.pedida = e.req; R.push(r1);
                        R.push(vacio(lado === 'der' ? x : x + wR, y_, w - wR, h));
                    } else { var r2 = rm(e.nombre, x, y_, w, h, e.tipo); if (e.fijo) r2.pedida = e.req; R.push(r2); }
                    y_ += h;
                });
                if (y0 + H - y_ > 0.3) R.push(vacio(x, y_, w, y0 + H - y_));
                return;
            }
            /* los espacios conservan el área pedida (crecen a lo sumo un 20 %); lo que sobra no es un ambiente inventado */
            var tot = lista.reduce(function (s, e) { return s + e.h; }, 0), k = Math.min(H / tot, P.ia ? 1.2 : 1.3), yy = y0;
            var hs = lista.map(function (e) { return e.h * k; });
            if (tot > H) {
                /* falta fondo: se recorta primero a los espacios grandes, sin bajar de 2.60 m */
                var falta = tot - H, holgura = lista.reduce(function (s, e) { return s + Math.max(0, e.h - 2.6); }, 0);
                hs = holgura > falta ? lista.map(function (e) { return e.h - Math.max(0, e.h - 2.6) / holgura * falta; }) : lista.map(function (e) { return e.h * H / tot; });
            }
            lista.forEach(function (e, i) { var h = hs[i]; R.push(rm(e.nombre, x, yy, w, h, e.tipo)); yy += h; });
            if (y0 + H - yy > 0.5) R.push(P.ia ? vacio(x, yy, w, y0 + H - yy) : rm('ÁREA LIBRE', x, yy, w, y0 + H - yy, 'libre'));
            else if (R.length) R[R.length - 1].h += y0 + H - yy;
        }
        var ejesY = null;
        if (huella) { var nvY = Math.max(2, Math.ceil(D / 5.5)); ejesY = []; for (var iy = 0; iy <= nvY; iy++) ejesY.push(by0 + D * iy / nvY); }
        var DB_ = huella ? D + 2 * by0 : D;
        return { W: W, L: L, D: DB_, patio: L - DB_, a: a, b: b, cw: cw, wl: a, ws: b, hA: 0, hB: 0, pisos: pisos, warns: warns, n: P.n, generico: true, escala: P.escala, ejesX: ejesX, ejesY: ejesY, huella: huella, bx0: bx0, by0: by0, bx1: bx0 + m * Wb };
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
                if (r.tipo === 'pasillo' || r.tipo === 'retiro') return;   /* circulación y lote libre no son ambientes */
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
    var LAYERS = { ACABADOS: 8, EJES: 1, COLUMNAS: 4, MUROS: 4, PUERTAS: 3, VENTANAS: 5, ESCALERA: 6, MOBILIARIO: 2, TEXTO: 7, COTAS: 5, DETALLES: 7, MARCO: 8,
        VIGAS: 40, CONCRETO: 7, 'ACERO-LONG': 1, ESTRIBOS: 3, TEXTOS: 2, APOYOS: 5, SUELO: 30 };
    var ETAPA = { ACABADOS: 2, EJES: 0, COLUMNAS: 1, MUROS: 2, VENTANAS: 3, PUERTAS: 3, ESCALERA: 4, MOBILIARIO: 5, TEXTO: 6, COTAS: 6, DETALLES: 6, MARCO: 6,
        VIGAS: 2, CONCRETO: 1, 'ACERO-LONG': 3, ESTRIBOS: 4, TEXTOS: 6, APOYOS: 2, SUELO: 1 };
    /* ------------------------------------------------------------------ SIN LÍNEAS SUPERPUESTAS
       Recorre todos los trazos rectos de un dibujo y, si un tramo queda encima de otro ya dibujado (misma recta,
       intervalos que se cruzan), lo recorta. Las entidades que no se tocan quedan intactas; las que tenían un tramo
       repetido se rehacen con los tramos que quedan (un relleno conserva su color sin borde). Sirve para los planos
       de Planos, los de la IA y los generadores de Civix CAD (zapatas, vigas, curvas…). */
    function limpiarSolapes(ents, tolIn) {
        if (!ents || !ents.length) return ents;
        var bb = CAD.bboxOf ? CAD.bboxOf(ents) : null, span = bb ? Math.max(bb[2] - bb[0], bb[3] - bb[1]) : 10;
        var tol = tolIn || Math.max(1e-4, span * 2.5e-4), ANG = 0.0015;
        var cubos = {}, cambio = false;
        function claves(th, c) { var a = Math.round(th / ANG), o = Math.round(c / tol), out = []; for (var da = -1; da <= 1; da++) for (var dc = -1; dc <= 1; dc++) out.push((a + da) + ':' + (o + dc)); return out; }
        var res = ents.map(function (e) {
            if (!e || e.t !== 'poly' || e.noStroke || !e.pts || e.pts.length < 2) return null;
            var pts = e.pts, n = pts.length, segs = [], tocado = false;
            for (var i = 0; i < n - (e.closed ? 0 : 1); i++) {
                var A = pts[i], B = pts[(i + 1) % n], dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
                if (!(L > tol)) { segs.push({ A: A, B: B, piezas: [[A, B]] }); continue; }
                var th = Math.atan2(dy, dx); if (th < 0) th += Math.PI; if (th >= Math.PI - ANG) th -= Math.PI;
                var ux = Math.cos(th), uy = Math.sin(th), c = -uy * A[0] + ux * A[1];
                var s0 = ux * A[0] + uy * A[1], s1 = ux * B[0] + uy * B[1], lo = Math.min(s0, s1), hi = Math.max(s0, s1);
                /* intervalos ya ocupados en esta recta */
                var ocup = [];
                claves(th, c).forEach(function (k) { (cubos[k] || []).forEach(function (q) { if (Math.abs(q.c - c) <= tol && Math.abs(q.th - th) <= ANG * 1.5 && q.hi > lo + tol && q.lo < hi - tol) ocup.push([q.lo, q.hi]); }); });
                var libres = [[lo, hi]];
                ocup.forEach(function (o) {
                    var nuevos = [];
                    libres.forEach(function (l) {
                        if (o[1] <= l[0] + tol || o[0] >= l[1] - tol) { nuevos.push(l); return; }
                        if (o[0] > l[0] + tol) nuevos.push([l[0], o[0]]);
                        if (o[1] < l[1] - tol) nuevos.push([o[1], l[1]]);
                    });
                    libres = nuevos;
                });
                libres = libres.filter(function (l) { return l[1] - l[0] > tol * 2; });
                var entero = libres.length === 1 && Math.abs(libres[0][0] - lo) <= tol && Math.abs(libres[0][1] - hi) <= tol;
                if (!entero) tocado = true;
                var k0 = Math.round(th / ANG) + ':' + Math.round(c / tol);
                libres.forEach(function (l) { (cubos[k0] = cubos[k0] || []).push({ th: th, c: c, lo: l[0], hi: l[1] }); });
                var z = A[2] || 0;
                function P_(s) { return [ux * s - uy * c, uy * s + ux * c, z]; }
                segs.push({ A: A, B: B, piezas: entero ? [[A, B]] : libres.map(function (l) { var p = P_(l[0]), q = P_(l[1]); return s0 <= s1 ? [p, q] : [q, p]; }) });
            }
            if (!tocado) return null;
            cambio = true;
            return segs;
        });
        if (!cambio) return ents;
        var out = [];
        ents.forEach(function (e, idx) {
            var segs = res[idx];
            if (!segs) { out.push(e); return; }
            if (e.fill) { var f = {}; for (var k in e) f[k] = e[k]; f.noStroke = true; out.push(f); }
            /* se rehacen polilíneas con los tramos consecutivos que quedaron enteros */
            var actual = null;
            function cerrar() { if (actual && actual.length > 1) { var l = {}; for (var k2 in e) if (k2 !== 'pts' && k2 !== 'closed' && k2 !== 'fill' && k2 !== 'alpha') l[k2] = e[k2]; l.pts = actual; l.closed = false; out.push(l); } actual = null; }
            segs.forEach(function (s) {
                if (s.piezas.length === 1 && s.piezas[0][0] === s.A && s.piezas[0][1] === s.B) { if (!actual) actual = [s.A]; actual.push(s.B); }
                else { cerrar(); s.piezas.forEach(function (pz) { actual = [pz[0], pz[1]]; cerrar(); }); }
            });
            cerrar();
        });
        return out;
    }
    CAD.limpiarSolapes = limpiarSolapes;

    /* Unión de rectángulos alineados a los ejes (muros, columnas) menos los vanos (puertas, ventanas):
       se discretiza en una malla con las coordenadas de todos los bordes, se marcan las celdas ocupadas y se
       extrae el contorno. Resultado: un único contorno sin tramos repetidos y el relleno por franjas. */
    function unirRects(rects, quitar) {
        var R6 = function (v) { return Math.round(v * 10000) / 10000; };
        var xs = {}, ys = {};
        rects.concat(quitar).forEach(function (r) { xs[R6(r[0])] = 1; xs[R6(r[2])] = 1; ys[R6(r[1])] = 1; ys[R6(r[3])] = 1; });
        xs = Object.keys(xs).map(Number).sort(function (a, b) { return a - b; }); ys = Object.keys(ys).map(Number).sort(function (a, b) { return a - b; });
        var nx = xs.length - 1, ny = ys.length - 1; if (nx < 1 || ny < 1) return { lineas: [], filas: [] };
        var ix = {}, iy = {}; xs.forEach(function (v, i) { ix[v] = i; }); ys.forEach(function (v, i) { iy[v] = i; });
        var g = new Uint8Array(nx * ny);
        function marcar(r, val) {
            var i0 = ix[R6(r[0])], i1 = ix[R6(r[2])], j0 = iy[R6(r[1])], j1 = iy[R6(r[3])];
            if (i0 == null || i1 == null || j0 == null || j1 == null) return;
            for (var j = Math.min(j0, j1); j < Math.max(j0, j1); j++) for (var i = Math.min(i0, i1); i < Math.max(i0, i1); i++) g[j * nx + i] = val;
        }
        rects.forEach(function (r) { marcar(r, 1); });
        quitar.forEach(function (r) { marcar(r, 0); });
        function c(i, j) { return i >= 0 && j >= 0 && i < nx && j < ny ? g[j * nx + i] : 0; }
        var lineas = [], i, j, ini;
        for (j = 0; j <= ny; j++) {            /* bordes horizontales */
            ini = -1;
            for (i = 0; i <= nx; i++) {
                var b = i < nx && c(i, j - 1) !== c(i, j);
                if (b && ini < 0) ini = i;
                if (!b && ini >= 0) { lineas.push([[xs[ini], ys[j]], [xs[i], ys[j]]]); ini = -1; }
            }
        }
        for (i = 0; i <= nx; i++) {            /* bordes verticales */
            ini = -1;
            for (j = 0; j <= ny; j++) {
                var b2 = j < ny && c(i - 1, j) !== c(i, j);
                if (b2 && ini < 0) ini = j;
                if (!b2 && ini >= 0) { lineas.push([[xs[i], ys[ini]], [xs[i], ys[j]]]); ini = -1; }
            }
        }
        var filas = [];                        /* relleno: tramos ocupados por fila, fundidos con la fila anterior si coinciden */
        var abiertos = {};
        for (j = 0; j < ny; j++) {
            var nuevos = {};
            ini = -1;
            for (i = 0; i <= nx; i++) {
                var o = i < nx && c(i, j);
                if (o && ini < 0) ini = i;
                if (!o && ini >= 0) {
                    var k = ini + ':' + i;
                    if (abiertos[k]) { abiertos[k][3] = ys[j + 1]; nuevos[k] = abiertos[k]; }
                    else { var f = [xs[ini], ys[j], xs[i], ys[j + 1]]; filas.push(f); nuevos[k] = f; }
                    ini = -1;
                }
            }
            abiertos = nuevos;
        }
        return { lineas: lineas, filas: filas };
    }
    /* =================================================================== ESTRUCTURA (vigas, columnas, detalles)
       Ejes de la distribución → luces → cargas por área aferente (NSR-10 título B, valores típicos) → diseño de la
       viga crítica y de la columna más cargada con los generadores de Civix CAD (ACI 318 / NSR-10, educativo).
       La sección que resulta es la que se dibuja en las plantas, en la planta estructural y en los detalles. */
    function ejesPlan(Pl, pi) {
        var W = Pl.W, ex, ey, y;
        pi = pi || Pl.pisos[0];
        if (Pl.generico) {
            ex = Pl.ejesX ? Pl.ejesX.slice() : [0, Pl.a, Pl.a + Pl.cw, W];
            if (pi && pi.rooms.some(function (r) { return r.nave; })) { var nv_ = Math.max(1, Math.ceil(W / 20)); ex = []; for (var ix_ = 0; ix_ <= nv_; ix_++) ex.push(W * ix_ / nv_); }
            var nv = Math.max(2, Math.ceil(Pl.D / 5.5)); ey = [];
            if (Pl.ejesY) ey = Pl.ejesY.slice(); else for (var iy = 0; iy <= nv; iy++) ey.push(Pl.D * iy / nv);
        } else {
            ex = [0, W]; if (W >= 7) ex.splice(1, 0, Pl.a + PASILLO / 2 > W - 1.5 ? W / 2 : Pl.wl);
            if (W >= 12) ex.splice(1, 0, Pl.wl / 2);
            ey = [0, Pl.hA, Pl.hA + Pl.hB + PAS_H]; y = ey[ey.length - 1];
            while (Pl.D - y > 4.6) { y += Math.min(4.2, (Pl.D - y) / Math.ceil((Pl.D - y) / 4.2)); ey.push(y); }
            if (Math.abs(ey[ey.length - 1] - Pl.D) > 0.05) ey.push(Pl.D);
        }
        return { ex: ex, ey: ey };
    }
    function estructura(Pl) {
        if (Pl._est) return Pl._est;
        var EJ = ejesPlan(Pl, Pl.pisos[0]), ex = EJ.ex, ey = EJ.ey, dx = [], dy = [], i;
        for (i = 0; i < ex.length - 1; i++) if (ex[i + 1] - ex[i] > 0.5) dx.push(ex[i + 1] - ex[i]);
        for (i = 0; i < ey.length - 1; i++) if (ey[i + 1] - ey[i] > 0.5) dy.push(ey[i + 1] - ey[i]);
        var mx = Math.max.apply(null, dx.concat([3])), my = Math.max.apply(null, dy.concat([3])), Lmax = Math.max(mx, my);
        /* cargas de servicio (kN/m²): losa aligerada + acabados + muros divisorios; carga viva según el uso */
        var nombres = norm((Pl.pisos || []).map(function (pi) { return pi.rooms.map(function (r) { return r.nombre; }).join(' '); }).join(' '));
        var qD = 5.5, qL = !Pl.generico ? 1.8 : /auditorio|teatro|salon|nave|templo|iglesia|coliseo|cancha|gimnasio/.test(nombres) ? 5.0 : /bodega|almacen|deposito/.test(nombres) ? 6.0 : 2.0;
        var trib = Lmax === mx ? my : mx;   /* ancho aferente de la viga crítica (paño perpendicular) */
        var wD = qD * trib, wL = qL * trib, h = Math.max(0.3, Math.ceil(Lmax / 12 / 0.05) * 0.05), b = Math.max(0.25, Math.ceil(h / 2 / 0.05) * 0.05), rv = null, k;
        var S = CAD.struct;
        if (S && S.viga) for (k = 0; k < 14; k++) {
            rv = S.viga({ L: +Lmax.toFixed(2), b: Math.round(b * 1000), h: Math.round(h * 1000), wD: +wD.toFixed(2), wL: +wL.toFixed(2), fc: 21, fy: 420 });
            if (rv.ok && !rv.warns.some(function (w) { return /NO CUMPLE|< Mu|insuficiente|supera/.test(w); })) break;
            h = +(h + 0.05).toFixed(2); b = Math.max(b, Math.ceil(h / 2 / 0.05) * 0.05);
        }
        /* columna más cargada: área aferente de un paño completo por piso + peso propio */
        var At = mx * my, n = Pl.n || 1, c = 0.3, rc = null, Pu = 0;
        if (S && S.columna) for (k = 0; k < 12; k++) {
            Pu = (1.2 * qD + 1.6 * qL) * At * n + 1.2 * 24 * c * c * 2.7 * n;
            rc = S.columna({ Pu: Math.round(Pu), b: Math.round(c * 1000), h: Math.round(c * 1000), Lu: +(2.7 - h).toFixed(2), fc: 21, fy: 420 });
            if (rc.ok && !rc.warns.some(function (w) { return /NO CUMPLE|< Pu|aumenta/.test(w); })) break;
            c = +(c + 0.05).toFixed(2);
        }
        var cv = rv && rv.ok ? rv.calc : null, cc = rc && rc.ok ? rc.calc : null;
        Pl._est = {
            ex: ex, ey: ey, Lmax: Lmax, mx: mx, my: my, b: b, h: h, c: c, viga: rv, columna: rc, qD: qD, qL: qL, trib: trib, At: At, Pu: Pu,
            losa: Math.max(0.25, Math.ceil(Lmax / 18.5 / 0.05) * 0.05),
            vigaTxt: cv ? cv.nBars + ' Ø#' + cv.bar + ' inf. + 2 Ø#4 sup. · E#3 @' + cv.sEnd + '/' + cv.sMid + ' mm' : 'Refuerzo: ver memoria',
            colTxt: cc ? cc.nBars + ' Ø#' + cc.bar + ' (ρ ' + cc.rho.toFixed(2) + ' %) · E#3 @' + cc.sConf + '/' + cc.sMid + ' mm' : 'Refuerzo: ver memoria'
        };
        return Pl._est;
    }
    /* columnas que existen: en una «huella» solo donde hay edificación del primer piso */
    function columnasPlan(Pl, E) {
        var out = [], rooms = (Pl.pisos[0] || { rooms: [] }).rooms.filter(function (r) { return r.tipo !== 'retiro' && r.tipo !== 'patio'; });
        E.ex.forEach(function (x, i) {
            E.ey.forEach(function (y, j) {
                if (Pl.huella && !rooms.some(function (r) { return x > r.x - 0.2 && x < r.x + r.w + 0.2 && y > r.y - 0.2 && y < r.y + r.h + 0.2; })) return;
                out.push({ x: x, y: y, i: i, j: j });
            });
        });
        return out;
    }
    /* lámina: PLANTA ESTRUCTURAL (entrepiso tipo) — ejes, columnas C-1, vigas V-1 de cara a cara de columna, cotas */
    function dibujarEstructural(Pl, ox) {
        var E = estructura(Pl), ents = [], c = E.c, b = E.b;
        function P(x, y) { return [ox + x, y, 0]; }
        function pl(layer, pts, closed, extra) { var e = { t: 'poly', pts: pts.map(function (p) { return P(p[0], p[1]); }), closed: closed, layer: layer }; if (extra) for (var k in extra) e[k] = extra[k]; ents.push(e); return e; }
        function ln(layer, x1, y1, x2, y2, extra) { return pl(layer, [[x1, y1], [x2, y2]], false, extra); }
        function txt(layer, x, y, h, s, extra) { var e = { t: 'text', p: P(x, y), h: h, s: [s], rot: 0, ha: 1, va: 2, layer: layer }; if (extra) for (var k in extra) e[k] = extra[k]; ents.push(e); }
        function circ(layer, x, y, r) { ents.push({ t: 'circle', c: P(x, y), r: r, layer: layer }); }
        var cols = columnasPlan(Pl, E), hay = {};
        cols.forEach(function (q) { hay[q.i + ':' + q.j] = q; });
        var x0 = Math.min.apply(null, E.ex), x1 = Math.max.apply(null, E.ex), y0 = Math.min.apply(null, E.ey), y1 = Math.max.apply(null, E.ey), LET = 'ABCDEFGHIJKLMN';
        /* ejes: solo por fuera, interrumpidos donde pasa la cadena de cotas */
        E.ex.forEach(function (x, i) {
            ln('EJES', x, y0 - 1.4, x, y0 - 1.09, { dash: true }); ln('EJES', x, y0 - 0.91, x, y0 - 0.45, { dash: true }); ln('EJES', x, y1 + 0.45, x, y1 + 1.0, { dash: true });
            circ('EJES', x, y0 - 1.75, 0.35); txt('EJES', x, y0 - 1.75, 0.3, String(i + 1));
        });
        E.ey.forEach(function (y, j) {
            ln('EJES', x0 - 1.4, y, x0 - 1.09, y, { dash: true }); ln('EJES', x0 - 0.91, y, x0 - 0.45, y, { dash: true }); ln('EJES', x1 + 0.45, y, x1 + 1.0, y, { dash: true });
            circ('EJES', x0 - 1.75, y, 0.35); txt('EJES', x0 - 1.75, y, 0.3, LET[j] || String(j));
        });
        /* vigas de cara a cara de columna (sin pasar por encima de ellas) */
        function viga(xa, ya, xb, yb, hor) {
            var p = hor ? [[xa + c / 2, ya - b / 2], [xb - c / 2, ya - b / 2], [xb - c / 2, ya + b / 2], [xa + c / 2, ya + b / 2]] : [[xa - b / 2, ya + c / 2], [xa + b / 2, ya + c / 2], [xa + b / 2, yb - c / 2], [xa - b / 2, yb - c / 2]];
            pl('VIGAS', p, true, { fill: true, alpha: 0.28 });
            var L = hor ? xb - xa : yb - ya; if (L - c < 1.0) return;
            if (hor) txt('VIGAS', (xa + xb) / 2, ya + b / 2 + 0.16, 0.13, 'V-1 (' + f2(b) + '×' + f2(E.h) + ')');
            else txt('VIGAS', xa - b / 2 - 0.16, (ya + yb) / 2, 0.13, 'V-1 (' + f2(b) + '×' + f2(E.h) + ')', { rot: Math.PI / 2 });
        }
        E.ey.forEach(function (y, j) { for (var i = 0; i < E.ex.length - 1; i++) if (hay[i + ':' + j] && hay[(i + 1) + ':' + j]) viga(E.ex[i], y, E.ex[i + 1], y, true); });
        E.ex.forEach(function (x, i) { for (var j = 0; j < E.ey.length - 1; j++) if (hay[i + ':' + j] && hay[i + ':' + (j + 1)]) viga(x, E.ey[j], x, E.ey[j + 1], false); });
        /* columnas C-1 */
        cols.forEach(function (q) {
            pl('COLUMNAS', [[q.x - c / 2, q.y - c / 2], [q.x + c / 2, q.y - c / 2], [q.x + c / 2, q.y + c / 2], [q.x - c / 2, q.y + c / 2]], true, { fill: true, alpha: 0.85 });
        });
        if (cols.length) txt('COLUMNAS', cols[0].x + c / 2 + 0.28, cols[0].y + c / 2 + 0.18, 0.13, 'C-1', { ha: 0 });
        /* cadenas de luces entre ejes */
        function marca(x, y) { ln('COTAS', x - 0.08, y - 0.08, x + 0.08, y + 0.08, { sw: 0.02 }); }
        ln('COTAS', x0, y0 - 1.0, x1, y0 - 1.0); E.ex.forEach(function (x) { marca(x, y0 - 1.0); });
        for (var i = 0; i < E.ex.length - 1; i++) if (E.ex[i + 1] - E.ex[i] > 0.4) txt('COTAS', (E.ex[i] + E.ex[i + 1]) / 2, y0 - 0.88, 0.14, f2(E.ex[i + 1] - E.ex[i]));
        ln('COTAS', x0 - 1.0, y0, x0 - 1.0, y1); E.ey.forEach(function (y) { marca(x0 - 1.0, y); });
        for (var j = 0; j < E.ey.length - 1; j++) if (E.ey[j + 1] - E.ey[j] > 0.4) txt('COTAS', x0 - 1.12, (E.ey[j] + E.ey[j + 1]) / 2, 0.14, f2(E.ey[j + 1] - E.ey[j]), { rot: Math.PI / 2 });
        /* rótulo y especificaciones */
        var cx = (x0 + x1) / 2;
        txt('TEXTO', cx, y0 - 2.6, 0.38, 'PLANTA ESTRUCTURAL · ENTREPISO TIPO', { titulo: true });
        [
            'Columnas C-1: ' + f2(c) + ' × ' + f2(c) + ' m · ' + E.colTxt,
            'Vigas V-1: b × h = ' + f2(b) + ' × ' + f2(E.h) + ' m · ' + E.vigaTxt,
            'Losa aligerada en una dirección e = ' + f2(E.losa) + ' m (≈ L/18.5) · f′c = 21 MPa · fy = 420 MPa',
            'Cargas: muerta ' + E.qD + ' kN/m² · viva ' + E.qL + ' kN/m² · luz máx. ' + f2(E.Lmax) + ' m · Pu (columna) ≈ ' + Math.round(E.Pu) + ' kN',
            'Predimensionamiento educativo (ACI 318 / NSR-10). No reemplaza el diseño estructural firmado.'
        ].forEach(function (t, k) { txt('TEXTO', cx, y0 - 3.05 - k * 0.3, 0.15, t, { sub: k === 4 }); });
        return limpiarSolapes(ents, 0.004);
    }
    /* lámina: DETALLES — elevación y sección de la viga V-1 y de la columna C-1 con su refuerzo (de Civix CAD) */
    /* cual: 'viga' | 'columna' | (sin valor) ambos */
    function dibujarDetalles(Pl, ox, cual) {
        var E = estructura(Pl), ents = [], x = ox, k = 0.001;
        function pasar(model, titulo) {
            if (!model) return;
            /* sin el marco ni el cuadro de rótulo de la lámina individual (aquí ya hay rótulo): solo el dibujo técnico */
            model = { ents: model.ents.filter(function (e) { return !/^(MARCO|CAJETIN|ROTULO)$/.test(e.layer); }), units: model.units };
            var bb = CAD.bboxOf(model.ents) || [0, 0, 1000, 1000];
            /* el generador puede entregar el dibujo en mm o ya en metros: se detecta por su tamaño */
            k = (model.units === 6 || Math.max(bb[2] - bb[0], bb[3] - bb[1]) < 200) ? 1 : 0.001;
            /* los dos detalles a un tamaño parecido (la columna es más corta que la viga): ampliación de lectura */
            k *= Math.max(1, Math.min(3, 9 / (Math.max(bb[2] - bb[0], bb[3] - bb[1]) * k || 9)));
            var dx = x - bb[0] * k, dy = -bb[1] * k;
            model.ents.forEach(function (e) {
                if (e.t === 'poly') ents.push({ t: 'poly', pts: e.pts.map(function (p) { return [p[0] * k + dx, p[1] * k + dy, 0]; }), closed: !!e.closed, layer: e.layer });
                else if (e.t === 'circle') ents.push({ t: 'circle', c: [e.c[0] * k + dx, e.c[1] * k + dy, 0], r: e.r * k, layer: e.layer });
                else if (e.t === 'text') (e.s || []).forEach(function (ln_, j) {
                    var h = e.h * k, off = j * h * 1.35;
                    ents.push({ t: 'text', p: [e.p[0] * k + dx + Math.sin(e.rot || 0) * off, e.p[1] * k + dy - Math.cos(e.rot || 0) * off, 0], h: h, s: [ln_], rot: e.rot || 0, ha: e.ha === 1 ? 1 : e.ha === 2 ? 2 : 0, va: 2, layer: e.layer === 'TEXTOS' ? 'TEXTOS' : e.layer });
                });
            });
            ents.push({ t: 'text', p: [x + (bb[2] - bb[0]) * k / 2, -1.2, 0], h: 0.3, s: [titulo], rot: 0, ha: 1, va: 2, layer: 'TEXTO', titulo: true });
            x += (bb[2] - bb[0]) * k + 2.5;
        }
        if (cual !== 'columna') pasar(E.viga && E.viga.ok ? E.viga.model : null, 'DETALLE VIGA V-1');
        if (cual !== 'viga') pasar(E.columna && E.columna.ok ? E.columna.model : null, 'DETALLE COLUMNA C-1');
        if (!ents.length) ents.push({ t: 'text', p: [ox, 0, 0], h: 0.3, s: ['Diseño estructural no disponible'], rot: 0, ha: 0, va: 2, layer: 'TEXTO' });
        return limpiarSolapes(ents, 0.002);
    }
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
        var EJ = ejesPlan(Pl, pi), ex = EJ.ex, ey = EJ.ey, EST = estructura(Pl), CS = EST.c;
        var LET = 'ABCDEFGHIJ', Dtop = pi.n === 1 ? Pl.L : Pl.D;
        /* ejes solo por fuera de la planta (del círculo al borde), para que no pasen por encima de muros ni muebles */
        /* el eje se interrumpe donde pasan las dos cadenas de cotas (en -0.55 y -1.00): ninguna cota lo cruza */
        var TRAMOS_EJE = [[-1.4, -1.09], [-0.91, -0.64], [-0.46, -0.3]];
        ex.forEach(function (x, i) {
            TRAMOS_EJE.forEach(function (t) { ln('EJES', x, t[0], x, t[1], { dash: true }); });
            ln('EJES', x, Dtop + 0.3, x, Dtop + 1.0, { dash: true });
            circ('EJES', x, -1.75, 0.35); txt('EJES', x, -1.75, 0.3, String(i + 1));
        });
        ey.forEach(function (yy, i) {
            TRAMOS_EJE.forEach(function (t) { ln('EJES', t[0], yy, t[1], yy, { dash: true }); });
            ln('EJES', W + 0.3, yy, W + 1.0, yy, { dash: true });
            circ('EJES', -1.75, yy, 0.35); txt('EJES', -1.75, yy, 0.3, LET[i] || String(i));
        });
        /* columnas con la sección que resultó del diseño (C-1) */
        var colRects = [];
        ex.forEach(function (x) { ey.forEach(function (yy) { colRects.push([x - CS / 2, yy - CS / 2, x + CS / 2, yy + CS / 2]); }); });

        /* --- muros: se reúnen como una sola figura (unión de rectángulos) y se recortan los vanos de puertas y
           ventanas; así no queda ninguna línea encima de otra (muros vecinos, columnas, puertas y ventanas) --- */
        var ABIERTO = /^(patio|pasillo|piscina|jacuzzi|bbq|retiro)$/;   /* espacios exteriores o de circulación: sin muros propios */
        var murosR = [], vanos = [], DB = Pl.D;
        /* ¿un punto está dentro de la edificación? (recintos y circulaciones; no el retiro ni el patio) */
        var edif = pi.rooms.filter(function (r) { return r.tipo !== 'retiro' && r.tipo !== 'patio'; });
        function dentroEdif(px, py) { return edif.some(function (r) { return px > r.x - 1e-6 && px < r.x + r.w + 1e-6 && py > r.y - 1e-6 && py < r.y + r.h + 1e-6; }); }
        /* caras exteriores de un recinto, en tramos: [x0, y0, x1, y1, normal] */
        function carasExt(r) {
            var out = [], s = 0.25;
            [['b', r.x, r.y, r.x + r.w, r.y, 0, -1], ['t', r.x, r.y + r.h, r.x + r.w, r.y + r.h, 0, 1], ['l', r.x, r.y, r.x, r.y + r.h, -1, 0], ['r', r.x + r.w, r.y, r.x + r.w, r.y + r.h, 1, 0]].forEach(function (c) {
                var L_ = Math.hypot(c[3] - c[1], c[4] - c[2]), n = Math.max(1, Math.round(L_ / s));
                for (var i = 0; i < n; i++) {
                    var t0 = i / n, t1 = (i + 1) / n, mx = c[1] + (c[3] - c[1]) * (t0 + t1) / 2, my = c[2] + (c[4] - c[2]) * (t0 + t1) / 2;
                    if (!dentroEdif(mx + c[5] * 0.05, my + c[6] * 0.05)) out.push([c[1] + (c[3] - c[1]) * t0, c[2] + (c[4] - c[2]) * t0, c[1] + (c[3] - c[1]) * t1, c[2] + (c[4] - c[2]) * t1, c[5], c[6], c[0]]);
                }
            });
            return out;
        }
        if (Pl.huella) {
            /* columnas solo donde hay edificación (en los escalonamientos de la fachada el eje queda en el retiro) */
            var cerca = function (c) { var px = (c[0] + c[2]) / 2, py = (c[1] + c[3]) / 2; return edif.some(function (r) { return px > r.x - 0.2 && px < r.x + r.w + 0.2 && py > r.y - 0.2 && py < r.y + r.h + 0.2; }); };
            colRects = colRects.filter(cerca);
            /* fachada que sigue la huella real: en cada cara exterior el muro se engrosa hacia afuera (0.25 m en total) */
            var Ex = MURO_EXT - MURO / 2;
            edif.forEach(function (r) {
                carasExt(r).forEach(function (q) {
                    var x0 = Math.min(q[0], q[2]), x1 = Math.max(q[0], q[2]), y0 = Math.min(q[1], q[3]), y1 = Math.max(q[1], q[3]);
                    /* en las esquinas salientes el muro se prolonga para cerrar la esquina; en las entrantes no
                       (si no, entraría en el recinto vecino) */
                    if (q[4]) {
                        var xo = x0 + q[4] * Ex / 2, e0 = !dentroEdif(xo, y0 - Ex / 2) ? Ex : 0, e1 = !dentroEdif(xo, y1 + Ex / 2) ? Ex : 0;
                        murosR.push(q[4] < 0 ? [x0 - Ex, y0 - e0, x0 + MURO / 2, y1 + e1] : [x0 - MURO / 2, y0 - e0, x0 + Ex, y1 + e1]);
                    } else {
                        var yo = y0 + q[5] * Ex / 2, f0 = !dentroEdif(x0 - Ex / 2, yo) ? Ex : 0, f1 = !dentroEdif(x1 + Ex / 2, yo) ? Ex : 0;
                        murosR.push(q[5] < 0 ? [x0 - f0, y0 - Ex, x1 + f1, y0 + MURO / 2] : [x0 - f0, y0 - MURO / 2, x1 + f1, y0 + Ex]);
                    }
                });
            });
        } else murosR.push([0, 0, W, MURO_EXT], [0, DB - MURO_EXT, W, DB], [0, 0, MURO_EXT, DB], [W - MURO_EXT, 0, W, DB]);
        pi.rooms.forEach(function (r) {
            if (ABIERTO.test(r.tipo)) return;
            var h2 = MURO / 2, x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h;
            murosR.push([x0 - h2, y0 - h2, x1 + h2, y0 + h2], [x0 - h2, y1 - h2, x1 + h2, y1 + h2], [x0 - h2, y0 - h2, x0 + h2, y1 + h2], [x1 - h2, y0 - h2, x1 + h2, y1 + h2]);
        });
        colRects.forEach(function (c) { murosR.push(c); });

        /* --- ventanas en fachada (frente y fondo): vano en el muro + vidrio dentro del vano --- */
        if (Pl.huella) pi.rooms.forEach(function (r) {
            if (ABIERTO.test(r.tipo) || r.tipo === 'escalera' || r.tipo === 'ingreso' || r.acceso || r.tipo === 'cochera') return;
            var Ex = MURO_EXT - MURO / 2;
            /* una ventana centrada en cada cara exterior del recinto (toda la ventana debe quedar en fachada) */
            [['b', 0, -1], ['t', 0, 1], ['l', -1, 0], ['r', 1, 0]].forEach(function (c) {
                var hor = !c[1], len = hor ? r.w : r.h, ww = Math.min(1.6, len * 0.45); if (len < 1.4) return;
                var cx = r.x + r.w / 2, cy = r.y + r.h / 2, ex_ = c[0] === 'l' ? r.x : c[0] === 'r' ? r.x + r.w : 0, ey_ = c[0] === 'b' ? r.y : c[0] === 't' ? r.y + r.h : 0;
                for (var t = -0.5; t <= 0.5; t += 0.25) { var px = hor ? cx + t * ww : ex_ + c[1] * 0.05, py = hor ? ey_ + c[2] * 0.05 : cy + t * ww; if (dentroEdif(px, py)) return; }
                var a0 = -MURO / 2, a1 = Ex;   /* la banda de fachada va de la cara interior (−0.075) a la exterior (+0.175) */
                if (hor) {
                    var s = c[2]; vanos.push([cx - ww / 2, Math.min(ey_ + s * a0, ey_ + s * a1) - 0.05, cx + ww / 2, Math.max(ey_ + s * a0, ey_ + s * a1) + 0.05, 'v']);
                    [0.25, 0.5, 0.75].forEach(function (f) { var yy = ey_ + s * (a0 + (a1 - a0) * f); ln('VENTANAS', cx - ww / 2, yy, cx + ww / 2, yy); });
                } else {
                    var s2 = c[1]; vanos.push([Math.min(ex_ + s2 * a0, ex_ + s2 * a1) - 0.05, cy - ww / 2, Math.max(ex_ + s2 * a0, ex_ + s2 * a1) + 0.05, cy + ww / 2, 'v']);
                    [0.25, 0.5, 0.75].forEach(function (f) { var xx = ex_ + s2 * (a0 + (a1 - a0) * f); ln('VENTANAS', xx, cy - ww / 2, xx, cy + ww / 2); });
                }
            });
        });
        else pi.rooms.forEach(function (r) {
            if (ABIERTO.test(r.tipo) || r.tipo === 'escalera' || r.tipo === 'ingreso' || r.acceso) return;
            var ww = Math.min(1.6, r.w * 0.5);
            if (r.y < 0.01 && !(pi.n === 1 && (r.tipo === 'cochera' || r.tipo === 'local'))) { var cx = r.x + r.w / 2; vanos.push([cx - ww / 2, -0.05, cx + ww / 2, MURO_EXT + 0.05, 'v']); [0.06, 0.125, 0.19].forEach(function (o) { ln('VENTANAS', cx - ww / 2, o, cx + ww / 2, o); }); }
            if (Math.abs(r.y + r.h - DB) < 0.01) { var cx2 = r.x + r.w / 2; vanos.push([cx2 - ww / 2, DB - MURO_EXT - 0.05, cx2 + ww / 2, DB + 0.05, 'v']); [DB - 0.06, DB - 0.125, DB - 0.19].forEach(function (o) { ln('VENTANAS', cx2 - ww / 2, o, cx2 + ww / 2, o); }); }
        });

        /* --- puertas (hoja + arco de giro); cada una abre su vano en el muro --- */
        var barridos = [];   /* área que barre cada hoja de puerta: ahí no puede quedar ningún mueble */
        function puerta(x, y, ancho, dir) { /* dir: 'up','down','left','right' = hacia dónde abre; bisagra en (x,y) */
            var e_ = 0.34;
            barridos.push(dir === 'up' || dir === 'right' ? [x, y, x + ancho, y + ancho] : dir === 'down' ? [x, y - ancho, x + ancho, y] : [x - ancho, y, x, y + ancho]);
            if (dir === 'up') { ln('PUERTAS', x, y, x, y + ancho); arco('PUERTAS', x, y, ancho, 0, Math.PI / 2); vanos.push([x, y - e_, x + ancho, y + e_ * 0.5, 'p']); }
            else if (dir === 'down') { ln('PUERTAS', x, y, x, y - ancho); arco('PUERTAS', x, y, ancho, -Math.PI / 2, 0); vanos.push([x, y - e_ * 0.5, x + ancho, y + e_, 'p']); }
            else if (dir === 'right') { ln('PUERTAS', x, y, x + ancho, y); arco('PUERTAS', x, y, ancho, 0, Math.PI / 2); vanos.push([x - e_, y, x + e_ * 0.5, y + ancho, 'p']); }
            else { ln('PUERTAS', x, y, x - ancho, y); arco('PUERTAS', x, y, ancho, Math.PI / 2, Math.PI); vanos.push([x - e_ * 0.5, y, x + e_, y + ancho, 'p']); }
        }
        pi.rooms.forEach(function (r) {
            var dw = r.tipo === 'bano' ? 0.75 : 0.9;
            /* separación de la bisagra al muro de abajo: si es la fachada (muro más grueso), la hoja arranca después de él */
            var yP = r.y < 0.01 ? MURO_EXT + 0.1 : 0.2;
            /* baño privado: su única puerta está en el muro que comparte con su espacio (en la esquina del lado del
               corredor) y abre hacia el baño; no tiene puerta al corredor */
            if (r.padre) {
                var pa = pi.rooms.filter(function (q) { return q.nombre === r.padre; })[0];
                if (pa) {
                    var bx0 = Math.max(r.x, pa.x), bx1 = Math.min(r.x + r.w, pa.x + pa.w), dwp = Math.min(0.7, bx1 - bx0 - 0.4);
                    var encima = Math.abs(pa.y + pa.h - r.y) < 0.02, debajo = Math.abs(r.y + r.h - pa.y) < 0.02;
                    if ((encima || debajo) && dwp >= 0.6) {
                        var corrDer = r.lado ? r.lado === 'der' : r.x < Pl.a - 0.01, hx = corrDer ? bx1 - 0.15 - dwp : bx0 + 0.15;
                        if (encima) puerta(hx, r.y, dwp, 'up'); else puerta(hx, r.y + r.h, dwp, 'down');
                        barridos.push(encima ? [hx, r.y - 0.6, hx + dwp, r.y] : [hx, r.y + r.h, hx + dwp, r.y + r.h + 0.6]);   /* paso libre frente a la puerta, del lado del espacio */
                        r._puertaDer = corrDer;   /* el lavamanos va al lado contrario de la puerta */
                        pa._vanoPriv = { x0: hx - 0.05, x1: hx + dwp + 0.05, arriba: encima };   /* ese tramo de muro del espacio queda libre de muebles */
                        return;
                    }
                }
            }
            /* planta abierta: el vestíbulo tiene acceso doble por el frente; la franja del frente abre hacia la nave */
            if (r.banda) {
                if (r.tipo === 'escalera') return;
                if (r.acceso) { var aw2 = Math.min(1.0, (r.w - 0.3) / 2); puerta(r.x + 0.15, 0.12, aw2, 'up'); puerta(r.x + r.w - 0.15 - aw2, 0.12, aw2, 'up'); txt('TEXTO', r.x + r.w / 2, -0.19, 0.11, 'ACCESO'); }
                var dwb = Math.min(r.acceso ? 1.2 : 0.9, r.w - 0.4);
                if (dwb > 0.5) puerta(r.x + (r.w - dwb) / 2, r.y + r.h - 0.12, dwb, 'down');
                return;
            }
            if (r.nave) return;
            if (r.fondo) { var dwf = Math.min(1.2, r.w - 0.4); if (dwf > 0.5) puerta(r.x + (r.w - dwf) / 2, r.y + 0.12, dwf, 'up'); return; }
            /* edificaciones diseñadas por programa (corredor central): todo recinto abre hacia el corredor */
            /* un garaje en la fachada entra por su portón: sin puerta batiente hacia el corredor (chocaría con el carro) */
            if (Pl.generico && r.tipo !== 'pasillo' && !ABIERTO.test(r.tipo) && !/^(escalera|ascensor|libre)$/.test(r.tipo) && !(r.tipo === 'cochera' && (r.y < 0.01 || r.frente))) {
                var izG = r.lado ? r.lado === 'der' : r.x < Pl.a - 0.01; r._puertaDer = izG;   /* puerta en el muro que da al corredor */
                if (r.tipo === 'banos') dw = 0.9; else if (r.h > 6) dw = 1.0;
                if (izG) puerta(r.x + r.w - 0.12, r.y + yP, dw, 'left'); else puerta(r.x + 0.12, r.y + yP + dw, dw, 'right');
                return;
            }
            /* ambientes de la zona de cuartos (incluye los pedidos adicionales): puerta hacia el pasillo central */
            if (r.zona && r.tipo !== 'closet' && r.tipo !== 'ascensor') {
                var iz = r.x < Pl.a - 0.01; r._puertaDer = iz;
                if (iz) puerta(r.x + r.w - 0.12, r.y + yP, dw, 'left'); else puerta(r.x + 0.12, r.y + yP + dw, dw, 'right');
                return;
            }
            switch (r.tipo) {
                case 'cochera': /* portón: vano en la fachada y tres hojas dentro del vano */
                    if (r.y < 0.01 || r.frente) {
                        vanos.push([r.x + 0.4, -0.05, r.x + r.w - 0.4, MURO_EXT + 0.05, 'g']);
                        for (var g = 0; g < 3; g++) ln('PUERTAS', r.x + 0.4 + g * (r.w - 0.8) / 3 + 0.04, 0.12, r.x + 0.4 + (g + 1) * (r.w - 0.8) / 3 - 0.04, 0.12);
                        txt('TEXTO', r.x + r.w / 2, -0.19, 0.11, 'PORTÓN');
                    }
                    break;
                case 'ingreso': if (r.y < 0.01) puerta(r.x + 0.5, 0.12, 1.0, 'up'); break;
                case 'local': if (r.y < 0.01) { vanos.push([r.x + 0.6, -0.05, r.x + r.w - 0.6, MURO_EXT + 0.05, 'g']); ln('PUERTAS', r.x + 0.6, 0.1, r.x + r.w - 0.6, 0.1); } break;
                case 'sala': if (r.y < 0.01) puerta(r.x + r.w - 0.12, r.y + r.h - 1.05, 0.9, 'left'); else puerta(r.x + r.w - 0.12, r.y + yP, 0.9, 'left'); break;
                case 'estudio': puerta(r.x + 0.12, r.y + r.h - 1.05, 0.85, 'right'); break;
                case 'cocina': puerta(r.x + r.w - 1.15, r.y + r.h - 0.12, 0.9, 'down'); break;
                case 'lav': puerta(r.x + 0.25, r.y + r.h - 0.12, 0.75, 'down'); break;
                case 'deposito': puerta(r.x + r.w - 1.1, r.y + r.h - 0.12, 0.85, 'down'); break;
                case 'pasillo':
                    if (Pl.generico && pi.n === 1 && (r.y < 0.01 || r.frente)) { var aw = Math.min(1.2, (r.w - 0.3) / 2); puerta(r.x + 0.15, 0.12, aw, 'up'); puerta(r.x + r.w - 0.15 - aw, 0.12, aw, 'up'); txt('TEXTO', r.x + r.w / 2, -0.19, 0.11, 'ACCESO'); }
                    break;
                case 'recepcion': case 'lectura': case 'infantil': case 'banos': case 'estudio2': case 'informatica': case 'reuniones': case 'oficina':
                case 'auditorio': case 'cafeteria': case 'aula': case 'gen': case 'terraza': case 'libre':
                case 'dorm': case 'dormp': case 'bano': case 'comedor': case 'otro': case 'deposito2': {
                    if (r.tipo === 'libre' && !Pl.generico) break;
                    if (Pl.generico && r.tipo !== 'bano') dw = r.h > 6 ? 1.0 : 0.9;
                    var izq = r.x < Pl.a - 0.01;
                    r._puertaDer = izq;   /* puerta en el muro derecho del ambiente */
                    if (izq) puerta(r.x + r.w - 0.12, r.y + yP, dw, 'left'); else puerta(r.x + 0.12, r.y + yP + dw, dw, 'right');
                    break;
                }
            }
        });

        /* --- muros construidos: relleno (solo vista) + contorno único, con columnas y vanos --- */
        var U = unirRects(murosR.map(function (m) { return [Math.max(0, m[0]), Math.max(0, m[1]), Math.min(W, m[2]), Math.min(DB, m[3])]; }).filter(function (m) { return m[2] - m[0] > 1e-3 && m[3] - m[1] > 1e-3; }), vanos);
        pi._g3 = { muros0: murosR.map(function (m) { return [Math.max(0, m[0]), Math.max(0, m[1]), Math.min(W, m[2]), Math.min(DB, m[3])]; }), filas: U.filas.map(function (q) { return q.slice(0, 4); }), vanos: vanos.map(function (v) { return v.slice(); }), cols: colRects.map(function (c) { return c.slice(0, 4); }) };   /* geometría para el visor 3D (civix-3d.js) */
        U.filas.forEach(function (q) { pl('MUROS', [[q[0], q[1]], [q[2], q[1]], [q[2], q[3]], [q[0], q[3]]], true, { fill: true, alpha: 0.55, noStroke: true, soloVista: true }); });
        U.lineas.forEach(function (s) { pl('MUROS', s, false, { sw: 0.03 }); });
        colRects.forEach(function (c) { pl('COLUMNAS', [[c[0], c[1]], [c[2], c[1]], [c[2], c[3]], [c[0], c[3]]], true, { fill: true, alpha: 0.85, noStroke: true, soloVista: true }); });
        /* lindero del lote detrás de la edificación (empieza donde termina el muro: se tocan, no se montan) */
        if (Pl.huella && pi.n === 1) pl('MUROS', [[0, 0], [W, 0], [W, Pl.L], [0, Pl.L]], true, { sw: 0.02, dash: true });   /* lindero completo: la edificación y sus retiros */
        else if (pi.n === 1 && Pl.L - DB > 0.5) { pl('MUROS', [[0, DB], [0, Pl.L], [W, Pl.L], [W, DB]], false, { sw: 0.02 }); }

        /* --- escalera: dos tramos con huellas de 0.28 m --- */
        pi.rooms.forEach(function (r) {
            if (r.tipo !== 'escalera') return;
            /* dentro del espacio libre: junto a la fachada el muro es más grueso */
            var mx0 = r.x < 0.01 ? MURO_EXT + 0.08 : 0.2, mx1 = r.x + r.w > W - 0.01 ? MURO_EXT + 0.08 : 0.2, my0 = r.y < 0.01 ? MURO_EXT + 0.08 : 0.2, my1 = Math.abs(r.y + r.h - DB) < 0.01 ? MURO_EXT + 0.08 : 0.2;
            var x0 = r.x + mx0, x1 = r.x + r.w - mx1, xm = (x0 + x1) / 2, y0 = r.y + my0, y1 = r.y + r.h - my1;
            /* huellas interrumpidas donde pasa la flecha de subida: ninguna línea cruza a otra */
            var axe = (x0 + xm) / 2;
            ln('ESCALERA', xm, y0 + 0.9, xm, y1);
            for (var yy = y0 + 0.9; yy <= y1 + 0.001; yy += 0.28) {
                if (yy > y0 + 0.95 && yy < y1 - 0.15) { ln('ESCALERA', x0, yy, axe - 0.16, yy); ln('ESCALERA', axe + 0.16, yy, xm - 0.05, yy); }
                else ln('ESCALERA', x0, yy, xm - 0.05, yy);
                ln('ESCALERA', xm + 0.05, yy, x1, yy);
            }
            ln('ESCALERA', axe, y1 - 0.2, axe, y0 + 1.1); ln('ESCALERA', axe, y0 + 1.1, axe - 0.12, y0 + 1.3); ln('ESCALERA', axe, y0 + 1.1, axe + 0.12, y0 + 1.3);
            txt('TEXTO', (xm + x1) / 2, y0 + 0.5, 0.12, 'SUBE');
        });

        /* --- mobiliario --- */
        /* el mobiliario se ubica en el espacio libre interior: junto a la fachada el muro es más grueso (MURO_EXT),
           así que ningún mueble queda dentro del muro ni cruzado por su línea */
        var extra_ = MURO_EXT - MURO / 2, limites = {};
        /* ¿la geometría real de un mueble toca un rectángulo (barrido de puerta, columna)? — no su caja envolvente:
           un mesón en L no «choca» por el hueco interior de la L */
        function segToca(a, b, o) {
            var t0 = 0, t1 = 1, dx = b[0] - a[0], dy = b[1] - a[1], p = [-dx, dx, -dy, dy], q = [a[0] - o[0], o[2] - a[0], a[1] - o[1], o[3] - a[1]];
            for (var i = 0; i < 4; i++) { if (Math.abs(p[i]) < 1e-12) { if (q[i] < 0) return false; } else { var r = q[i] / p[i]; if (p[i] < 0) { if (r > t1) return false; if (r > t0) t0 = r; } else { if (r < t0) return false; if (r < t1) t1 = r; } } }
            return true;
        }
        function dentroPoly(px, py, pts) { var c = false; for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) { var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1]; if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) c = !c; } return c; }
        function tocaRect(e, o0, fx, fy, cx2, cy2) {
            var o = [o0[0] + 0.02, o0[1] + 0.02, o0[2] - 0.02, o0[3] - 0.02];   /* margen: rozar no cuenta */
            function T(q) { return [(fx ? cx2 - q[0] : q[0]) - ox, fy ? cy2 - q[1] : q[1]]; }
            if (e.t === 'circle') { var c = T(e.c), nx = Math.max(o[0], Math.min(c[0], o[2])), ny = Math.max(o[1], Math.min(c[1], o[3])); return Math.hypot(c[0] - nx, c[1] - ny) < e.r; }
            var pts = e.pts.map(T), n = pts.length;
            for (var i = 0; i < n - (e.closed ? 0 : 1); i++) if (segToca(pts[i], pts[(i + 1) % n], o)) return true;
            return !!(e.closed && dentroPoly((o[0] + o[2]) / 2, (o[1] + o[3]) / 2, pts));
        }
        /* Si el amueblado de un recinto choca con el barrido de una puerta o con una columna, se prueba el mismo
           amueblado reflejado (izquierda↔derecha, arriba↔abajo o ambos) y se queda la versión con menos choques.
           Así el mesón de la cocina, el carro del garaje o la cama no desaparecen por culpa de la puerta. */
        function acomodarAPuertas(nuevos, ri) {
            var muebles = nuevos.filter(function (e) { return e.layer === 'MOBILIARIO'; }); if (!muebles.length) return;
            var obst = barridos.concat(colRects).filter(function (o) { return Math.min(o[2], ri.x + ri.w) > Math.max(o[0], ri.x) && Math.min(o[3], ri.y + ri.h) > Math.max(o[1], ri.y); });
            if (!obst.length) return;
            var cx2 = 2 * (ox + ri.x + ri.w / 2), cy2 = 2 * (ri.y + ri.h / 2);
            function choques(fx, fy) {
                var cajas = {}, malos = {};
                muebles.forEach(function (e) {
                    var b = cajas[e._g] || (cajas[e._g] = [Infinity, Infinity, -Infinity, -Infinity]);
                    var pts = e.t === 'circle' ? [[e.c[0] - e.r, e.c[1] - e.r], [e.c[0] + e.r, e.c[1] + e.r]] : e.pts;
                    pts.forEach(function (q) { var X = (fx ? cx2 - q[0] : q[0]) - ox, Y = fy ? cy2 - q[1] : q[1]; b[0] = Math.min(b[0], X); b[1] = Math.min(b[1], Y); b[2] = Math.max(b[2], X); b[3] = Math.max(b[3], Y); });
                    if (!malos[e._g] && obst.some(function (o) { return tocaRect(e, o, fx, fy, cx2, cy2); })) malos[e._g] = true;
                });
                var n = 0, area = 0;
                Object.keys(malos).forEach(function (g) { var b = cajas[g]; n++; area += (b[2] - b[0]) * (b[3] - b[1]); });
                return n * 1000 + area;   /* primero, menos piezas en choque; luego, que las que choquen sean pequeñas */
            }
            var mejor = [false, false], val = choques(false, false), v0 = val;
            if (!val) return;
            [[true, false], [false, true], [true, true]].forEach(function (v) { var c = choques(v[0], v[1]); if (c < val - 1e-9) { val = c; mejor = v; } });
            if (!mejor[0] && !mejor[1]) return;
            muebles.forEach(function (e) {
                function T(q) { return [mejor[0] ? cx2 - q[0] : q[0], mejor[1] ? cy2 - q[1] : q[1], q[2] || 0]; }
                if (e.t === 'circle') e.c = T(e.c); else e.pts = e.pts.map(T);
            });
        }
        /* puestos del comedor que pidió el usuario («comedor para 8 personas», «comedor de 6 puestos») */
        var PUESTOS = (function () {
            var q = cifras(norm(Pl.texto || '')), m = q.match(/comedor[^.,;]{0,40}?\b(\d{1,2})\s*(?:puestos|personas|sillas|asientos)|\b(\d{1,2})\s*(?:puestos|personas|sillas|asientos)[^.,;]{0,25}comedor/);
            return m ? Math.min(16, +(m[1] || m[2])) : 0;
        })();
        pi.rooms.forEach(function (r) {
            delete r._ly;
            var a0 = r.x < 0.01 ? extra_ : 0, a1 = r.x + r.w > W - 0.01 ? extra_ : 0, b0 = r.y < 0.01 ? extra_ : 0, b1 = Math.abs(r.y + r.h - DB) < 0.01 ? extra_ : 0;
            if (ABIERTO.test(r.tipo)) { a0 = a1 = b0 = b1 = 0; }
            var ri = {}; for (var k in r) ri[k] = r[k];
            if (r.tipo === 'comedor' && PUESTOS) ri._puestos = PUESTOS;
            /* barridos de puertas que caen dentro del recinto: los muebles se acomodan para no quedar ahí */
            ri._barr = barridos.filter(function (b) { return b[0] < r.x + r.w && b[2] > r.x && b[1] < r.y + r.h && b[3] > r.y; });
            ri.x = r.x + a0; ri.y = r.y + b0; ri.w = r.w - a0 - a1; ri.h = r.h - b0 - b1;
            var g0 = PIEZA, e0 = ents.length;
            mobiliario(ri, pl);
            acomodarAPuertas(ents.slice(e0), ri);
            /* cada pieza recuerda el espacio libre de su recinto (para no cruzar muros ni ventanas) */
            for (var gq = g0 + 1; gq <= PIEZA; gq++) limites[gq] = ABIERTO.test(r.tipo) ? [r.x - 0.01, r.y - 0.01, r.x + r.w + 0.01, r.y + r.h + 0.01] : [ri.x + MURO / 2 - 0.01, ri.y + MURO / 2 - 0.01, ri.x + ri.w - MURO / 2 + 0.01, ri.y + ri.h - MURO / 2 + 0.01];
            if (ri._ly != null) r._ly = ri._ly;
        });
        /* muebles que caerían en el barrido de una puerta o sobre una columna: se retira la pieza completa
           (las piezas que se tocan, como un mesón y su estufa, se tratan como una sola) */
        (function () {
            var cajas = {}, padre = {};
            function raiz(g) { while (padre[g] !== g) { padre[g] = padre[padre[g]]; g = padre[g]; } return g; }
            ents.forEach(function (e) {
                if (e.layer !== 'MOBILIARIO' || e._g == null) return;
                var b = cajas[e._g] || (cajas[e._g] = [Infinity, Infinity, -Infinity, -Infinity]); padre[e._g] = e._g;
                var pts = e.t === 'circle' ? [[e.c[0] - e.r, e.c[1] - e.r], [e.c[0] + e.r, e.c[1] + e.r]] : e.pts;
                pts.forEach(function (q) { var X = q[0] - ox; b[0] = Math.min(b[0], X); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], X); b[3] = Math.max(b[3], q[1]); });
            });
            var ids = Object.keys(cajas);
            function corta(a, b, m) { return Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > m && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > m; }
            function dentro(a, b) { return a[0] >= b[0] - 1e-3 && a[1] >= b[1] - 1e-3 && a[2] <= b[2] + 1e-3 && a[3] <= b[3] + 1e-3; }
            function area(b) { return (b[2] - b[0]) * (b[3] - b[1]); }
            /* trazos de cada pieza, para saber si dos muebles distintos se cruzan de verdad */
            var trazos = {};
            ents.forEach(function (e) {
                if (e.layer !== 'MOBILIARIO' || e._g == null || e.noStroke || !e.pts) return;
                var L = trazos[e._g] || (trazos[e._g] = []), p = e.pts, n = p.length;
                for (var s = 0; s < n - (e.closed ? 0 : 1); s++) L.push([p[s], p[(s + 1) % n]]);
            });
            function orient(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
            function seCruzan(g1, g2) {
                var A = trazos[g1] || [], B = trazos[g2] || [];
                for (var a = 0; a < A.length; a++) for (var b = 0; b < B.length; b++) {
                    var p = A[a][0], q = A[a][1], r_ = B[b][0], s_ = B[b][1];
                    if (orient(r_, s_, p) * orient(r_, s_, q) < -1e-10 && orient(p, q, r_) * orient(p, q, s_) < -1e-10) return true;
                }
                return false;
            }
            var fuera = {}, obst = barridos.concat(colRects), quitar = {}, porG = {};
            ents.forEach(function (e) { if (e.layer === 'MOBILIARIO' && e._g != null) (porG[e._g] = porG[e._g] || []).push(e); });
            for (var i = 0; i < ids.length; i++) for (var j = i + 1; j < ids.length; j++) {
                var bi = cajas[ids[i]], bj = cajas[ids[j]];
                if (!corta(bi, bj, 0.001)) continue;
                /* una pieza dentro de otra (estufa sobre el mesón) se trata como un solo mueble */
                if (dentro(bi, bj) || dentro(bj, bi)) { if (!seCruzan(ids[i], ids[j])) { padre[raiz(ids[j])] = raiz(ids[i]); continue; } }
                /* dos muebles que se cruzan: se retira el más pequeño */
                if (seCruzan(ids[i], ids[j])) quitar[area(bi) < area(bj) ? ids[i] : ids[j]] = true;
            }
            ids.forEach(function (g) {
                var lim = limites[g], fueraDeSala = lim && !dentro(cajas[g], lim);   /* se sale de su recinto: tocaría un muro o una ventana */
                /* choque con puerta o columna medido con la geometría real de la pieza (no su caja envolvente) */
                var choca = obst.some(function (o) { return corta(cajas[g], o, 0.02) && (porG[g] || []).some(function (e) { return tocaRect(e, o, false, false, 0, 0); }); });
                if (fueraDeSala || choca) fuera[raiz(g)] = true;
            });
            /* lo que choca con una puerta, columna o muro sale con su conjunto; en un cruce entre dos muebles
               sale solo la pieza más pequeña */
            if (Object.keys(fuera).length || Object.keys(quitar).length) ents = ents.filter(function (e) { return !(e.layer === 'MOBILIARIO' && e._g != null && (fuera[raiz(String(e._g))] || quitar[String(e._g)])); });
        })();

        /* ================= COTAS (como en un plano de CAD) =================
           · fuera de la planta: cadena de luces entre ejes de columnas (luz de cada viga) y cadena de recintos por fachada;
           · dentro de cada recinto: ancho y fondo libres entre caras de muro, con flechas, donde no tapen muebles ni puertas. */
        function marca(x, y) { ln('COTAS', x - 0.08, y - 0.08, x + 0.08, y + 0.08, { sw: 0.02 }); }
        function unicos(v) { var o = []; v.slice().sort(function (a, b) { return a - b; }).forEach(function (t) { if (!o.length || t - o[o.length - 1] > 0.02) o.push(t); }); return o; }
        function cadenaH(xs, y) {
            xs = unicos(xs); if (xs.length < 2) return;
            ln('COTAS', xs[0], y, xs[xs.length - 1], y); xs.forEach(function (x) { marca(x, y); });
            for (var i = 0; i < xs.length - 1; i++) { var d = xs[i + 1] - xs[i]; if (d >= 0.35) txt('COTAS', (xs[i] + xs[i + 1]) / 2, y + 0.12, d < 0.9 ? 0.1 : 0.14, f2(d)); }
        }
        function cadenaV(ys, x) {
            ys = unicos(ys); if (ys.length < 2) return;
            ln('COTAS', x, ys[0], x, ys[ys.length - 1]); ys.forEach(function (y) { marca(x, y); });
            for (var i = 0; i < ys.length - 1; i++) { var d = ys[i + 1] - ys[i]; if (d >= 0.35) txt('COTAS', x - 0.12, (ys[i] + ys[i + 1]) / 2, d < 0.9 ? 0.1 : 0.14, f2(d), { rot: Math.PI / 2 }); }
        }
        /* luces entre ejes (a lo largo de las vigas) */
        cadenaH(ex, -1.0); cadenaV(ey, -1.0);
        /* recintos sobre la fachada frontal y el costado izquierdo (posiciones de muros) */
        var fx = [0, W], fy = [0, DB];
        pi.rooms.forEach(function (r) {
            if (r.tipo === 'retiro' || r.tipo === 'patio') return;
            if ((r.y < 0.01 || r.frente) && r.x < W - 0.01) { fx.push(r.x, Math.min(W, r.x + r.w)); }
            if (r.x < (Pl.bx0 || 0) + 0.01 && r.y < DB - 0.01) { fy.push(r.y, Math.min(DB, r.y + r.h)); }
        });
        cadenaH(fx, -0.55); cadenaV(fy, -0.55);

        /* obstáculos dentro de la planta: muebles, puertas y escalera */
        var obstC = [];
        ents.forEach(function (e) {
            if (!/^(MOBILIARIO|PUERTAS|ESCALERA)$/.test(e.layer)) return;
            var p = e.t === 'circle' ? [[e.c[0] - e.r, e.c[1] - e.r], [e.c[0] + e.r, e.c[1] + e.r]] : (e.pts || []); if (!p.length) return;
            var b = [Infinity, Infinity, -Infinity, -Infinity];
            p.forEach(function (q) { b[0] = Math.min(b[0], q[0] - ox); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0] - ox); b[3] = Math.max(b[3], q[1]); });
            obstC.push([b[0] - 0.04, b[1] - 0.04, b[2] + 0.04, b[3] + 0.04]);
        });
        function libreC(b) { return !obstC.some(function (o) { return Math.min(b[2], o[2]) > Math.max(b[0], o[0]) && Math.min(b[3], o[3]) > Math.max(b[1], o[1]); }); }
        /* cota interior con flechas: la punta toca la cara del muro y la línea arranca en la base de la flecha */
        function flecha(x, y, dx, dy) { var L = 0.14, a = 0.045; pl('COTAS', [[x, y], [x + dx * L - dy * a, y + dy * L + dx * a], [x + dx * L + dy * a, y + dy * L - dx * a]], true, { fill: true, alpha: 0.9, sw: 0.01 }); }
        pi.rooms.forEach(function (r) {
            if (ABIERTO.test(r.tipo) || /^(escalera|closet|ascensor)$/.test(r.tipo) || r.w < 1.3 || r.h < 1.3) return;
            var fx0 = r.x + (r.x < 0.01 ? MURO_EXT : MURO / 2), fx1 = r.x + r.w - (r.x + r.w > W - 0.01 ? MURO_EXT : MURO / 2);
            var fy0 = r.y + (r.y < 0.01 ? MURO_EXT : MURO / 2), fy1 = r.y + r.h - (Math.abs(r.y + r.h - DB) < 0.01 ? MURO_EXT : MURO / 2);
            var yA = null, xA = null, k;
            /* ancho: una franja libre cerca de un muro (o al centro) */
            [fy0 + 0.32, fy1 - 0.32, (fy0 + fy1) / 2, fy0 + 0.75, fy1 - 0.75].some(function (y) { if (y <= fy0 + 0.15 || y >= fy1 - 0.15) return false; if (libreC([fx0, y - 0.07, fx1, y + 0.24])) { yA = y; return true; } return false; });
            /* fondo: una franja libre cerca de un costado */
            [fx0 + 0.32, fx1 - 0.32, (fx0 + fx1) / 2, fx0 + 0.75, fx1 - 0.75].some(function (x) { if (x <= fx0 + 0.15 || x >= fx1 - 0.15) return false; if (libreC([x - 0.24, fy0, x + 0.07, fy1])) { xA = x; return true; } return false; });
            if (yA != null) {
                flecha(fx0, yA, 1, 0); flecha(fx1, yA, -1, 0);
                /* si la cota de fondo cruza esta línea, se deja un corte para que no se crucen */
                var xs_ = xA != null ? [fx0 + 0.14, xA - 0.07, xA + 0.07, fx1 - 0.14] : [fx0 + 0.14, fx1 - 0.14];
                for (k = 0; k < xs_.length; k += 2) if (xs_[k + 1] - xs_[k] > 0.02) ln('COTAS', xs_[k], yA, xs_[k + 1], yA, { sw: 0.012 });
                var tx = xA != null ? ((xA - fx0) > (fx1 - xA) ? (fx0 + xA) / 2 : (xA + fx1) / 2) : (fx0 + fx1) / 2;
                txt('COTAS', tx, yA + 0.12, 0.12, f2(fx1 - fx0));
                obstC.push([fx0, yA - 0.07, fx1, yA + 0.24]);
            }
            if (xA != null) {
                flecha(xA, fy0, 0, 1); flecha(xA, fy1, 0, -1);
                ln('COTAS', xA, fy0 + 0.14, xA, fy1 - 0.14, { sw: 0.012 });
                var ty = yA != null ? ((yA - fy0) > (fy1 - yA) ? (fy0 + yA) / 2 : (yA + fy1) / 2) : (fy0 + fy1) / 2;
                txt('COTAS', xA - 0.12, ty, 0.12, f2(fy1 - fy0), { rot: Math.PI / 2 });
                obstC.push([xA - 0.24, fy0, xA + 0.07, fy1]);
            }
        });

        /* cuadro de elementos estructurales (a la derecha de la planta): sección acotada de columna, viga y muros */
        (function () {
            /* secciones y refuerzo del diseño estructural (los mismos de la lámina de detalles) */
            var S = 5, x0 = W + 1.8, y = DB - 0.4, Lmax = EST.Lmax, hV = EST.h, bV = EST.b;
            txt('DETALLES', x0 + 1.6, y, 0.2, 'ELEMENTOS ESTRUCTURALES', { titulo: true });
            txt('DETALLES', x0 + 1.6, y - 0.3, 0.11, 'Secciones ampliadas ×' + S + ' · cotas en metros');
            function seccion(nombre, nota, b, h, capa, yTop, soloAncho) {
                var w = b * S, hh = h * S, xs0 = x0 + 0.7, ys1 = yTop, ys0 = yTop - hh;
                pl(capa, [[xs0, ys0], [xs0 + w, ys0], [xs0 + w, ys1], [xs0, ys1]], true, { fill: true, alpha: 0.35, noStroke: true, soloVista: true });
                pl('DETALLES', [[xs0, ys0], [xs0 + w, ys0], [xs0 + w, ys1], [xs0, ys1]], true, { sw: 0.02 });
                /* cota del ancho (abajo) y del alto (izquierda) con su valor real */
                ln('COTAS', xs0, ys0 - 0.3, xs0 + w, ys0 - 0.3); marca(xs0, ys0 - 0.3); marca(xs0 + w, ys0 - 0.3);
                txt('COTAS', xs0 + w / 2, ys0 - 0.18, 0.13, f2(b));
                if (!soloAncho) {
                    ln('COTAS', xs0 - 0.3, ys0, xs0 - 0.3, ys1); marca(xs0 - 0.3, ys0); marca(xs0 - 0.3, ys1);
                    txt('COTAS', xs0 - 0.42, (ys0 + ys1) / 2, 0.13, f2(h), { rot: Math.PI / 2 });
                }
                txt('DETALLES', xs0 + w + 0.3, yTop - 0.15, 0.15, nombre, { ha: 0 });
                (nota || []).forEach(function (t, j) { txt('DETALLES', xs0 + w + 0.3, yTop - 0.42 - j * 0.24, 0.11, t, { ha: 0, sub: true }); });
                return ys0 - 0.75;
            }
            var yy = y - 0.8;
            yy = seccion('C-1 · COLUMNA', ['Sección ' + f2(CS) + ' × ' + f2(CS) + ' m · ' + colRects.length + ' columnas', EST.colTxt], CS, CS, 'COLUMNAS', yy);
            yy = seccion('V-1 · VIGA', ['Sección b × h = ' + f2(bV) + ' × ' + f2(hV) + ' m · luz ' + f2(Lmax) + ' m', EST.vigaTxt], bV, hV, 'COLUMNAS', yy);
            /* muros: se dibuja un tramo en planta; la cota es su espesor */
            yy = seccion('M-1 · MURO EXTERIOR', ['Espesor ' + f2(MURO_EXT) + ' m'], MURO_EXT, 0.36, 'MUROS', yy, true);
            seccion('M-2 · MURO INTERIOR', ['Espesor ' + f2(MURO) + ' m'], MURO, 0.36, 'MUROS', yy, true);
        })();

        /* --- textos de ambientes: en el punto libre más cercano al centro (sin tapar muebles, puertas, escalera ni cotas) --- */
        var obst = [];
        ents.forEach(function (e) {
            if (!/^(MOBILIARIO|PUERTAS|ESCALERA|COTAS)$/.test(e.layer)) return;
            var p = e.t === 'circle' ? [[e.c[0] - e.r, e.c[1] - e.r], [e.c[0] + e.r, e.c[1] + e.r]] : (e.pts || []);
            if (!p.length) return;
            var b = [Infinity, Infinity, -Infinity, -Infinity];
            p.forEach(function (q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); });
            obst.push([b[0] - 0.05, b[1] - 0.05, b[2] + 0.05, b[3] + 0.05]);   /* margen: una línea recta no tiene alto */
        });
        function choque(b) { var s = 0; obst.forEach(function (o) { var ix = Math.min(b[2], o[2]) - Math.max(b[0], o[0]), iy = Math.min(b[3], o[3]) - Math.max(b[1], o[1]); if (ix > 0 && iy > 0) s += ix * iy; }); return s; }
        pi.rooms.forEach(function (r) {
            if ((r.tipo === 'pasillo' && r.w < 2) || r.sinEtiqueta) return;
            /* solo el nombre: las medidas van en las cotas del recinto (no como texto «a × b») */
            var hT = r.w < 2 ? 0.16 : 0.22;
            var anchoT = Math.min(r.w - 0.2, r.nombre.length * hT * 0.62) / 2 + 0.06;
            var cx0 = r.x + r.w / 2, cy0 = r._ly != null ? r._ly : r.y + r.h / 2 + (r.tipo === 'escalera' ? 0.2 : 0);
            var mejor = null;
            for (var gy = 0; gy <= 8; gy++) for (var gx = 0; gx <= 8; gx++) {
                var px = r.x + 0.25 + anchoT + (r.w - 0.5 - 2 * anchoT) * gx / 8, py = r.y + 0.45 + (r.h - 0.9) * gy / 8;
                if (r.w - 0.5 - 2 * anchoT < 0) px = cx0;
                if (r.h - 0.9 < 0) py = cy0;
                var caja = [ox + px - anchoT, py - 0.16, ox + px + anchoT, py + 0.16];
                var v = choque(caja) * 1000 + Math.hypot(px - cx0, py - cy0);
                if (!mejor || v < mejor.v) mejor = { v: v, x: px, y: py };
            }
            var lx = mejor ? mejor.x : cx0, ly = mejor ? mejor.y : cy0;
            txt('TEXTO', lx, ly, hT, r.nombre);
        });

        /* --- cotas generales y rótulo --- */
        /* cotas con marcas a 45° (una marca recta quedaría encima del eje que pasa por el mismo punto) */
        /* cotas generales por fuera de los círculos de los ejes: así ningún eje cruza la línea de cota */
        ln('COTAS', 0, -2.55, W, -2.55); ln('COTAS', -0.1, -2.65, 0.1, -2.45); ln('COTAS', W - 0.1, -2.65, W + 0.1, -2.45);
        txt('COTAS', W / 2, -2.8, 0.2, f2(W) + ' m');
        ln('COTAS', -2.55, 0, -2.55, D); ln('COTAS', -2.65, -0.1, -2.45, 0.1); ln('COTAS', -2.65, D - 0.1, -2.45, D + 0.1);
        txt('COTAS', -2.85, D / 2, 0.2, f2(D) + ' m', { rot: Math.PI / 2 });
        txt('TEXTO', W / 2, -3.5, 0.38, 'PLANTA ' + (NOMBRE_PISO[pi.n] || pi.n + '.º') + ' PISO', { titulo: true });
        txt('TEXTO', W / 2, -3.95, 0.17, 'NPT ' + (pi.n === 1 ? '±0.00' : '+' + f2((pi.n - 1) * (Pl.generico ? 3.2 : 2.7))) + ' · ESC. ' + (Pl.escala || '1:75'));
        return limpiarSolapes(ents, 0.004);   /* ninguna línea encima de otra */
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
    /* cada símbolo (cama, silla, mesa…) es una «pieza»: si choca con el barrido de una puerta o una columna,
       se retira completa (nunca queda un mueble a medias ni una línea cruzando otra) */
    var PIEZA = 0;
    function lapiz(pl, ox, oy, rot, porPieza) {
        var c = [1, 0, -1, 0][rot & 3], s = [0, 1, 0, -1][rot & 3], gid = ++PIEZA;
        function T(p) { return [ox + p[0] * c - p[1] * s, oy + p[0] * s + p[1] * c]; }
        function poly(pts, closed, ex) {
            var e2 = {}; if (ex) for (var k in ex) e2[k] = ex[k];
            e2._g = porPieza ? ++PIEZA : gid;
            return pl('MOBILIARIO', pts.map(T), closed, e2);
        }
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
            /* cada pieza separada de la vecina (ningún borde compartido) */
            S.rect(-bw / 2 - 0.05, 0, bw + 0.1, 0.06, F('madera', 0.75));                          /* cabecero */
            S.rr(-bw / 2 - 0.03, 0.08, bw + 0.06, bl - 0.08, 0.05, F('madera', 0.22));             /* estructura */
            S.rr(-bw / 2 + 0.02, 0.12, bw - 0.04, bl - 0.17, 0.06, Dl('cama'));                   /* colchón */
            var n = doble ? 2 : 1, g = 0.08, pw = (bw - 0.2 - g * (n - 1)) / n;
            for (var i = 0; i < n; i++) { var u = -bw / 2 + 0.1 + i * (pw + g); S.rr(u, 0.17, pw, 0.34, 0.11, F('tela', 0.4)); S.ln(u + 0.1, 0.34, u + pw - 0.1, 0.34, Dl('tela', 0.007)); }
            S.rr(-bw / 2 + 0.07, 0.6, bw - 0.14, bl - 0.71, 0.05, F('cama', 0.3));               /* edredón */
            /* esquina doblada del edredón: proporcional al largo de la cama (si la cama va a escala, no se sale ni cruza nada) */
            var fy = Math.min(0.67, (bl - 0.71) * 0.55), fx = Math.min(fy * 0.64, bw - 0.3), y0f = bl - 0.11 - fy;
            /* hasta dónde puede llegar una línea a la altura v sin tocar la diagonal de la esquina */
            var finX = function (v) { return fy > 0.15 && v > y0f - 0.02 ? bw / 2 - 0.07 - fx * Math.min(1, (v - y0f + 0.02) / fy) - 0.05 : bw / 2 - 0.07; };
            [[0.8, -bw / 2 + 0.07, 0.07, Dl('cama')], [1.15, -bw / 2 + 0.18, 0.5, Dl('cama', 0.006)], [1.5, -bw / 2 + 0.18, 0.65, Dl('cama', 0.006)]].forEach(function (l) {
                var x1 = Math.min(bw / 2 - l[2], finX(l[0]));
                if (l[0] < bl - 0.2 && x1 - l[1] > 0.15) S.ln(l[1], l[0], x1, l[0], l[3]);   /* doblez de la sábana y pliegues */
            });
            if (fy > 0.15) {
                /* relleno sin borde + solo la diagonal (los otros lados coincidirían con el edredón) */
                S.poly([[bw / 2 - 0.07, y0f], [bw / 2 - 0.07 - fx, bl - 0.11], [bw / 2 - 0.07, bl - 0.11]], true, { col: 'tela', fill: true, alpha: 0.45, noStroke: true });
                S.ln(bw / 2 - 0.07, y0f, bw / 2 - 0.07 - fx, bl - 0.11, Dl('tela', 0.01));
            }
        },
        mesaNoche: function (S, s) {
            S.rr(-s / 2, 0, s, s * 0.9, 0.04, F('madera', 0.3));
            S.circ(0, s * 0.45, s * 0.27, F('cama', 0.25)); S.circ(0, s * 0.45, s * 0.08, F('cama', 0.9));   /* lámpara (pantalla y bombillo) */
        },
        closet: function (S, L, d) {
            S.rect(-L / 2, 0, L, d, F('madera', 0.14));
            for (var u = -L / 2 + 0.12; u < L / 2 - 0.08; u += 0.11) S.ln(u - 0.03, d * 0.45 - 0.19, u + 0.03, d * 0.45 + 0.19, Dl('tela', 0.009)); /* ropa colgada (sin tubo que la cruce) */
            S.ln(-L / 2, d - 0.03, 0.06, d - 0.03, Dl('madera', 0.02)); S.ln(-0.06, d - 0.08, L / 2, d - 0.08, Dl('madera', 0.02)); /* puertas corredizas */
        },
        sofa: function (S, L, d, n) {
            /* espaldar, brazos y cojines como piezas separadas (sin bordes montados) */
            S.rr(-L / 2, 0, L, 0.2, 0.08, F('tela', 0.45));                                       /* espaldar */
            S.rr(-L / 2, 0.23, 0.2, d - 0.23, 0.08, F('tela', 0.45)); S.rr(L / 2 - 0.2, 0.23, 0.2, d - 0.23, 0.08, F('tela', 0.45)); /* brazos */
            var cw = (L - 0.46) / n;
            for (var i = 0; i < n; i++) S.rr(-L / 2 + 0.23 + i * cw + 0.02, 0.24, cw - 0.04, d - 0.27, 0.08, F('tela', 0.22));
            if (n > 1) S.rr(-L / 2 + 0.3, 0.3, 0.26, 0.13, 0.05, F('cama', 0.55));                /* cojín decorativo */
        },
        mesaCentro: function (S, w, h) {
            S.rr(-w / 2, 0, w, h, 0.1, F('vidrio', 0.15)); S.rr(-w / 2 + 0.06, 0.06, w - 0.12, h - 0.12, 0.07, Dl('vidrio', 0.006));
            /* la matera y sus hojas quedan dentro del vidrio interior (sin cruzar su borde) */
            var mx = w * 0.25, lh = Math.min(0.11, Math.min(w / 2 - 0.09 - mx, h / 2 - 0.09) - 0.056);
            if (lh < 0.04) { mx = 0; lh = Math.max(0.03, Math.min(0.11, Math.min(w / 2, h / 2) - 0.09 - 0.056)); }
            for (var k = 0; k < 5; k++) { var ak = k * 1.26 + 0.4; S.hoja(mx + 0.056 * Math.cos(ak), h / 2 + 0.056 * Math.sin(ak), ak, lh, F('verde', 0.45)); }   /* hojas desde el borde de la matera */
            S.circ(mx, h / 2, 0.05, F('madera', 0.8));
        },
        silla: function (S) { S.rr(-0.21, 0.1, 0.42, 0.37, 0.07, F('tela', 0.3)); S.rr(-0.22, 0, 0.44, 0.07, 0.03, F('madera', 0.75)); },
        sillaOficina: function (S) {
            S.circ(0, 0, 0.24, F('tela', 0.3)); S.rr(-0.22, -0.37, 0.44, 0.1, 0.04, F('tela', 0.6));
            S.rr(-0.31, -0.15, 0.05, 0.27, 0.02, F('metal', 0.5)); S.rr(0.26, -0.15, 0.05, 0.27, 0.02, F('metal', 0.5));
        },
        inodoro: function (S) {
            S.rr(-0.25, 0, 0.5, 0.19, 0.05, F('sanit', 0.35)); S.circ(0, 0.095, 0.03, F('metal', 0.8));        /* tanque */
            S.elip(0, 0.49, 0.2, 0.27, F('sanit', 0.14)); S.elip(0, 0.51, 0.13, 0.18, Dl('sanit'));            /* taza y asiento */
        },
        lavamanos: function (S, L) {
            S.rr(-L / 2, 0, L, 0.48, 0.04, F('metal', 0.12));
            S.elip(0, 0.28, Math.min(0.22, L / 2 - 0.08), 0.14, F('sanit', 0.25)); S.circ(0, 0.3, 0.025, Dl('metal'));
            S.rr(-0.02, 0.025, 0.04, 0.08, 0.015, F('metal', 0.8)); S.circ(-0.08, 0.065, 0.022, F('metal', 0.6)); S.circ(0.08, 0.065, 0.022, F('metal', 0.6));
        },
        ducha: function (S, a, b) {   /* S en la esquina inferior izquierda del plato; abierta hacia +u y -v */
            /* plato: relleno; bordes de muro (izquierdo y superior) en una sola línea; a la derecha la mampara de vidrio;
               abajo, la entrada (sin línea que se monte con nada) */
            S.rect(0, 0, a, b, { col: 'sanit', fill: true, alpha: 0.1, noStroke: true });
            S.poly([[0, 0.02], [0, b], [a - 0.02, b]], false, Dl('sanit'));
            S.ln(a, 0, a, b, Dl('vidrio', 0.022)); S.ln(0.02, 0, a * 0.35, 0, Dl('vidrio', 0.022));
            [[0, 0], [a, 0], [a, b], [0, b]].forEach(function (q) { S.ln(q[0] + (q[0] ? -0.06 : 0.06), q[1] + (q[1] ? -0.06 : 0.06), a / 2 + (q[0] ? 0.06 : -0.06), b / 2 + (q[1] ? 0.06 : -0.06), Dl('sanit', 0.005)); });
            S.circ(a / 2, b / 2, 0.05, Dl('metal')); S.ln(a / 2 - 0.035, b / 2, a / 2 + 0.035, b / 2, Dl('metal', 0.006));
            S.circ(a / 2, b - 0.12, 0.07, F('metal', 0.45)); S.circ(a / 2, b - 0.12, 0.03, F('metal', 0.9));   /* regadera (entre las diagonales) */
        },
        lavadora: function (S) {
            S.rr(-0.3, 0, 0.6, 0.6, 0.05, F('metal', 0.2)); S.ln(-0.3, 0.1, 0.3, 0.1, Dl('metal', 0.006));
            S.circ(0, 0.35, 0.2, F('vidrio', 0.12)); S.circ(0, 0.35, 0.12, Dl('vidrio')); S.circ(0.19, 0.05, 0.025, F('metal', 0.7));
        },
        lavadero: function (S) {
            S.rr(-0.35, 0, 0.7, 0.6, 0.04, F('sanit', 0.15));
            for (var k = 0; k < 5; k++) S.ln(-0.3, 0.12 + k * 0.08, -0.04, 0.12 + k * 0.08, Dl('sanit', 0.005));
            S.rr(0.0, 0.1, 0.3, 0.42, 0.05, F('sanit', 0.22)); S.circ(0.15, 0.31, 0.025, Dl('metal')); S.rr(0.13, 0.02, 0.04, 0.06, 0.015, F('metal', 0.8));
        },
        escritorio: function (S, L) {
            S.rr(-L / 2, 0, L, 0.6, 0.03, F('madera', 0.2));
            S.rr(-0.28, 0.08, 0.56, 0.06, 0.02, F('metal', 0.85)); S.rr(-0.06, 0.16, 0.12, 0.07, 0.02, F('metal', 0.5));   /* monitor */
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
        tvPared: function (S, L) {   /* televisor colgado en el muro (cuando no cabe mueble) */
            S.rr(-L / 2, 0, L, 0.08, 0.02, F('metal', 0.85)); S.ln(-L * 0.3, 0.04, L * 0.3, 0.04, Dl('vidrio', 0.006));
        },
        alfombra: function (S, u, v, w, h) { S.rect(u, v, w, h, F('tela', 0.07)); S.rect(u + 0.08, v + 0.08, w - 0.16, h - 0.16, Dl('tela', 0.005)); },
        maceta: function (S, r) { S.circ(0, 0, r, F('madera', 0.3)); for (var k = 0; k < 7; k++) { var a = k * 0.9 + 0.3; S.hoja(r * 1.06 * Math.cos(a), r * 1.06 * Math.sin(a), a, r * 0.6, F('verde', 0.35)); } },   /* hojas que salen del borde (no cruzan la matera) */
        arbol: function (S, R) {
            var p = [], q = [], i, a;
            for (i = 0; i < 40; i++) { a = 2 * Math.PI * i / 40; p.push([R * (1 + 0.07 * Math.sin(9 * a)) * Math.cos(a), R * (1 + 0.07 * Math.sin(9 * a)) * Math.sin(a)]); q.push([0.6 * R * (1 + 0.09 * Math.sin(7 * a + 1)) * Math.cos(a), 0.6 * R * (1 + 0.09 * Math.sin(7 * a + 1)) * Math.sin(a)]); }
            S.poly(p, true, F('verde', 0.22)); S.poly(q, true, F('verde', 0.2));
            for (i = 0; i < 6; i++) { a = i * 1.05 + 0.3; S.ln(0.13 * R * Math.cos(a), 0.13 * R * Math.sin(a), 0.48 * R * Math.cos(a), 0.48 * R * Math.sin(a), Dl('madera', 0.012)); }   /* ramas entre el tronco y la copa interior */
            S.circ(0, 0, R * 0.1, F('madera', 0.85));
        }
    };
    /* carro en planta: el frente está en v = 0 del lápiz (rot 2 = frente hacia arriba / al fondo del garaje) */
    function carro(pl, cx, py, Wc, Lc, rot) {
        var S = lapiz(pl, cx, py, rot || 0), k = Lc / 4.4; function q(v) { return v * k; }
        S.rr(-Wc / 2, 0, Wc, Lc, 0.45, F('carro', 0.18));                                                   /* carrocería */
        S.rr(-0.3, q(0.04), 0.6, 0.08, 0.03, F('metal', 0.5));                                               /* parrilla */
        S.rr(-Wc / 2 + 0.3, 0.15, 0.3, 0.11, 0.04, F('cama', 0.75)); S.rr(Wc / 2 - 0.6, 0.15, 0.3, 0.11, 0.04, F('cama', 0.75)); /* farolas (dentro de la curva del frente) */
        S.ln(-Wc * 0.13, 0.34, -Wc * 0.11, q(1.15), Dl('carro', 0.008)); S.ln(Wc * 0.13, 0.34, Wc * 0.11, q(1.15), Dl('carro', 0.008)); /* capó (entre las farolas, sin tocarlas) */
        S.poly([[-Wc / 2 + 0.17, q(1.25)], [Wc / 2 - 0.17, q(1.25)], [Wc / 2 - 0.27, q(1.85)], [-Wc / 2 + 0.27, q(1.85)]], true, F('vidrio', 0.35)); /* parabrisas */
        S.rr(-Wc / 2 + 0.27, q(1.88), Wc - 0.54, q(1.25), 0.12, F('carro', 0.32));                           /* techo */
        [-1, 1].forEach(function (sg) {
            S.poly([[sg * (Wc / 2 - 0.1), q(1.35)], [sg * (Wc / 2 - 0.25), q(1.9)], [sg * (Wc / 2 - 0.25), q(3.1)], [sg * (Wc / 2 - 0.1), q(3.3)]], true, F('vidrio', 0.3)); /* ventanas */
            S.poly([[sg * (Wc / 2 + 0.02), q(1.35)], [sg * (Wc / 2 + 0.18), q(1.42)], [sg * (Wc / 2 + 0.16), q(1.56)], [sg * (Wc / 2 + 0.02), q(1.56)]], true, F('carro', 0.55)); /* espejos (separados de la carrocería) */
            [q(0.6), Lc - q(1.05)].forEach(function (v) { S.rr(sg > 0 ? Wc / 2 - 0.13 : -Wc / 2 + 0.03, v, 0.1, q(0.62), 0.04, F('metal', 0.85)); }); /* llantas (dentro de la carrocería) */
            S.rr(sg > 0 ? Wc / 2 - 0.62 : -Wc / 2 + 0.32, Lc - 0.26, 0.3, 0.1, 0.04, F('carro', 0.85));          /* stops (dentro de la curva trasera) */
        });
        S.poly([[-Wc / 2 + 0.27, q(3.16)], [Wc / 2 - 0.27, q(3.16)], [Wc / 2 - 0.2, q(3.55)], [-Wc / 2 + 0.2, q(3.55)]], true, F('vidrio', 0.35)); /* vidrio trasero */
        S.ln(-Wc / 2 + 0.15, q(3.75), Wc / 2 - 0.15, q(3.75), Dl('carro', 0.008));                          /* baúl */
    }
    /* comedor: mesa con sillas en ambos lados (y cabeceras si es larga), puestos servidos y centro de mesa */
    /* mesa de comedor rectangular: L = largo, A = ancho; s1 / s2 puestos en cada costado largo, cab = 0, 1 o 2 cabeceras.
       vert: el largo de la mesa va en sentido Y. Cada puesto lleva su silla y su plato puesto sobre la mesa. */
    function comedor(pl, cx, cy, L, A, s1, s2, cab, vert) {
        var S = lapiz(pl, cx, cy, 0);
        function XY(u, v) { return vert ? [v, u] : [u, v]; }   /* u: a lo largo de la mesa, v: a lo ancho */
        var tw = vert ? A : L, th = vert ? L : A;
        S.rr(-tw / 2, -th / 2, tw, th, 0.08, F('madera', 0.25)); S.rr(-tw / 2 + 0.05, -th / 2 + 0.05, tw - 0.1, th - 0.1, 0.06, Dl('madera', 0.006));
        var ce = Math.min(0.2, L * 0.12);
        if (vert) S.elip(0, 0, 0.09, ce, F('verde', 0.4)); else S.elip(0, 0, ce, 0.09, F('verde', 0.4));   /* centro de mesa */
        function lado(n, sg) {   /* sg = -1: costado de abajo/izquierda, +1: arriba/derecha */
            for (var i = 0; i < n; i++) {
                var u = -L / 2 + L * (i + 0.5) / n, p = XY(u, sg * (A / 2 + 0.5)), q = XY(u, sg * (A / 2 - 0.17));
                SIM.silla(lapiz(pl, cx + p[0], cy + p[1], vert ? (sg < 0 ? 3 : 1) : (sg < 0 ? 0 : 2)));
                S.circ(q[0], q[1], 0.1, Dl('metal'));
            }
        }
        lado(s1, -1); lado(s2, 1);
        [-1, 1].slice(0, cab).forEach(function (sg) {   /* cabeceras */
            var p = XY(sg * (L / 2 + 0.5), 0), q = XY(sg * (L / 2 - 0.17), 0);
            SIM.silla(lapiz(pl, cx + p[0], cy + p[1], vert ? (sg < 0 ? 0 : 2) : (sg < 0 ? 3 : 1)));
            S.circ(q[0], q[1], 0.1, Dl('metal'));
        });
    }
    /* cuántos puestos y de qué tamaño cabe la mesa en el comedor (o los puestos que pidió el usuario) */
    function mesaComedor(r, vert) {
        if (vert == null) vert = r.h > r.w;
        var Lr = (vert ? r.h : r.w) - 0.2, Sr = (vert ? r.w : r.h) - 0.2;
        var A = Math.max(0.7, Math.min(Sr >= 3.2 ? 1.0 : 0.9, Sr - 2 * 0.72));
        var p = r._puestos || 0, cab, ns, L;
        var lMax = function (c) { return Math.min(3.6, Lr - (c ? 2 * 0.72 : 2 * 0.3)); };
        if (p >= 2) {
            cab = p >= 6 ? 2 : p % 2 ? 1 : 0;
            ns = Math.ceil((p - cab) / 2); L = Math.max(1.2, ns * 0.6);
            if (L > lMax(cab) && cab) { cab = 0; ns = Math.ceil(p / 2); L = Math.max(1.2, ns * 0.6); }
            if (L > lMax(0)) { ns = Math.max(1, Math.floor(lMax(0) / 0.6)); L = Math.max(1.0, ns * 0.6); }
            var s2 = Math.min(ns, Math.max(1, p - cab - ns));
            return { vert: vert, L: L, A: A, s1: ns, s2: s2, cab: cab };
        }
        /* sin número pedido: la mesa más grande que quepa, hasta 8 puestos (3 por costado + 2 cabeceras) */
        L = Math.max(1.0, Math.min(1.8, lMax(1)));
        cab = L >= 1.2 && lMax(1) >= 1.2 ? 2 : 0;
        if (!cab) L = Math.max(1.0, Math.min(1.8, lMax(0)));
        ns = Math.max(1, Math.floor(L / 0.6));
        return { vert: vert, L: L, A: A, s1: ns, s2: ns, cab: cab };
    }
    function mesaRedonda(pl, cx, cy, R, nS) {
        var S = lapiz(pl, cx, cy, 0); S.circ(0, 0, R, F('madera', 0.25)); S.circ(0, 0, R * 0.25, F('verde', 0.35));
        for (var i = 0; i < nS; i++) {
            var a = 2 * Math.PI * i / nS + Math.PI / 4, d = R + 0.32;
            var C = lapiz(pl, cx + d * Math.cos(a), cy + d * Math.sin(a), 0); C.circ(0, 0, 0.19, F('tela', 0.3)); C.circ(0, 0, 0.1, Dl('tela', 0.006));
        }
    }
    function mobiliario(r, pl) {
        var x = r.x, y = r.y, w = r.w, h = r.h, cx = x + w / 2, cy = y + h / 2, G = lapiz(pl, 0, 0, 0, true), k, i;
        /* mesas de trabajo con sillas a ambos lados, en retícula, dejando circulación junto a la puerta */
        function mesas(tw, th, gap) {
            for (var my = y + 1.0; my + th + 0.55 < y + h - 0.4; my += th + gap + 0.6)
                for (var mx = x + 0.6; mx + tw < x + w - 0.5; mx += tw + gap) { var nm = Math.max(1, Math.floor(tw / 0.55)); comedor(pl, mx + tw / 2, my + th / 2, tw, th, nm, nm, tw >= 1.4 ? 2 : 0, false); }
        }
        switch (r.tipo) {
            case 'cochera': {
                /* carros estacionados de frente (el capó mira al fondo); atrás queda espacio para el rótulo y una repisa */
                var n = r.extra === 2 && w >= 5 ? 2 : 1, Lc = Math.min(4.4, h - 0.8), y0c = y + 0.2;
                /* garaje más ancho que profundo: el carro se estaciona a lo ancho (a tamaño real, no encogido) */
                if (Lc < 3.8 && w - 0.8 > Lc + 0.3 && h >= 2.4) {
                    var Lh = Math.min(4.4, w - 0.8), nH = h >= 5 && r.extra === 2 ? 2 : 1;
                    for (i = 0; i < nH; i++) carro(pl, x + 0.4 + Lh, nH === 2 ? y + h * (i + 0.5) / 2 : cy, Math.min(1.8, h - 0.6), Lh, 1);
                    r._ly = y + h - 0.3;
                    break;
                }
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
                    /* ondas entre los escalones (izquierda) y la escalerilla (derecha), sin cruzarlos */
                    for (var ux = px + 1.2; ux <= px + pw - 0.55; ux += 0.12) ond.push([ux, vy + 0.05 * Math.sin((ux - px) * 7 + k)]);
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
            case 'bodega': {                                                          /* racks en filas con pasillos de 1.60 m */
                var largo = h - 2.0, vert = h >= w;
                if (!vert) largo = w - 2.0;
                var filas_ = 0;
                for (var rp = (vert ? x : y) + 1.0; rp + 1.0 < (vert ? x + w : y + h) - 0.6 && filas_ < 18; rp += 2.6, filas_++) {
                    if (vert) { G.rect(rp, y + 1.0, 1.0, largo, F('madera', 0.14)); for (var bq = y + 1.0 + 2.7; bq < y + h - 1.0; bq += 2.7) G.ln(rp, bq, rp + 1.0, bq, Dl('madera', 0.008)); }   /* rack con sus módulos */
                    else { G.rect(x + 1.0, rp, largo, 1.0, F('madera', 0.14)); for (var bq2 = x + 1.0 + 2.7; bq2 < x + w - 1.0; bq2 += 2.7) G.ln(bq2, rp, bq2, rp + 1.0, Dl('madera', 0.008)); }
                }
                break;
            }
            case 'cancha': {                                                          /* cancha múltiple con líneas reglamentarias simplificadas */
                var lc = Math.min(Math.max(w, h) - 2, 28), ac = Math.min(Math.min(w, h) - 2, 15), C_ = lapiz(pl, cx, cy, h >= w ? 1 : 0);
                if (lc < 6 || ac < 4) break;
                var rcc = Math.min(1.8, ac * 0.15);
                C_.rect(-lc / 2, -ac / 2, lc, ac, F('verde', 0.1));
                C_.ln(0, -ac / 2, 0, -rcc, Dl('cama', 0.02)); C_.ln(0, rcc, 0, ac / 2, Dl('cama', 0.02));   /* línea central interrumpida por el círculo */
                C_.circ(0, 0, rcc, Dl('cama', 0.02));
                [-1, 1].forEach(function (sg) {
                    /* zona restringida: tres lados (el cuarto es la línea final de la cancha) */
                    var kl = Math.min(5.8, lc * 0.2), kw = Math.min(2.45, ac * 0.18), xe = sg * lc / 2, xk = sg * (lc / 2 - kl);
                    C_.poly([[xe, -kw], [xk, -kw], [xk, kw], [xe, kw]], false, Dl('cama', 0.02));
                    C_.arc(sg * (lc / 2 - 1.575), 0, Math.min(6.75, ac * 0.45), sg > 0 ? Math.PI / 2 : -Math.PI / 2, sg > 0 ? Math.PI * 1.5 : Math.PI / 2, Dl('cama', 0.015));
                });
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
                    /* barra en dos tramos: del disco al banco, sin cruzar ninguno de los dos */
                    G.ln(bcx - 0.64, bcy + 0.45, bcx - 0.2, bcy + 0.45, Dl('metal', 0.03)); G.ln(bcx + 0.2, bcy + 0.45, bcx + 0.64, bcy + 0.45, Dl('metal', 0.03));
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
                    SIM.sofa(lapiz(pl, cx, y + 0.2, 0), Lt, 0.9, Lt > 1.9 ? 3 : 2);
                    SIM.tv(lapiz(pl, cx, y + h - 0.12, 2), Math.min(1.8, Lt));
                    break;
                }
                var L = Math.min(2.3, w * 0.45), sx = x + 0.35 + L / 2;
                SIM.sofa(lapiz(pl, sx, y + 0.22, 0), L, 0.9, L > 1.9 ? 3 : 2);                 /* sofá contra el muro */
                SIM.mesaCentro(lapiz(pl, sx, y + 1.35, 0), Math.min(1.1, L * 0.55), 0.55);
                if (w > 3.6) SIM.sofa(lapiz(pl, sx + L / 2 + 0.75, y + 1.6, 1), 0.95, 0.85, 1);   /* sillón mirando al sofá */
                SIM.maceta(lapiz(pl, x + 0.45, y + h - 0.45, 0), 0.17);
                if (w > 4.5 && h > 3.5) comedor(pl, x + w - 1.8, y + h - 1.65, 1.6, 0.9, 2, 2, 2, false);
                else if (h > 3.2) SIM.tv(lapiz(pl, sx, y + h - 0.12, 2), Math.min(1.8, L));
                break;
            }
            case 'comedor': {
                /* mesa del tamaño del comedor con TODOS sus puestos: se prueba en los dos sentidos y en cada posición del
                   recinto, y se elige la que no choca con el barrido de ninguna puerta (así ninguna silla se pierde);
                   solo si no hay forma, se usa una mesa con menos puestos */
                var barr = r._barr || [], pref = h > w, mejorC = null;
                var libreC = function (px, py, hx, hy) { return !barr.some(function (b) { return px - hx < b[2] - 0.02 && px + hx > b[0] + 0.02 && py - hy < b[3] - 0.02 && py + hy > b[1] + 0.02; }); };
                [pref, !pref].forEach(function (vo) {
                    var m0 = mesaComedor(r, vo), vars = [m0];
                    if (m0.cab) vars.push({ vert: vo, L: m0.L, A: m0.A, s1: m0.s1, s2: m0.s2, cab: 0 });
                    for (var s = m0.s1 - 1; s >= 1; s--) vars.push({ vert: vo, L: Math.max(1.0, s * 0.6), A: m0.A, s1: s, s2: Math.min(s, m0.s2), cab: m0.cab && s >= 2 ? 2 : 0 }, { vert: vo, L: Math.max(1.0, s * 0.6), A: m0.A, s1: s, s2: Math.min(s, m0.s2), cab: 0 });
                    vars.forEach(function (m) {
                        var ex = m.L / 2 + (m.cab ? 0.5 : 0), ey = m.A / 2 + 0.5, hx = vo ? ey : ex, hy = vo ? ex : ey;
                        var puestos = m.s1 + m.s2 + m.cab;
                        for (var px = x + 0.1 + hx; px <= x + w - 0.1 - hx + 1e-6; px += 0.05)
                            for (var py = y + 0.1 + hy; py <= y + h - 0.1 - hy + 1e-6; py += 0.05) {
                                if (!libreC(px, py, hx, hy)) continue;
                                var sc = puestos * 100 - Math.hypot(px - cx, py - cy) + (vo === pref ? 0.5 : 0);
                                if (!mejorC || sc > mejorC.sc) mejorC = { sc: sc, m: m, px: px, py: py, hy: hy };
                            }
                    });
                });
                if (!mejorC) { var mf = mesaComedor(r); mejorC = { m: mf, px: cx, py: cy, hy: (mf.vert ? mf.L / 2 + (mf.cab ? 0.5 : 0) : mf.A / 2 + 0.5) }; }
                var mc = mejorC.m;
                comedor(pl, mejorC.px, mejorC.py, mc.L, mc.A, mc.s1, mc.s2, mc.cab, mc.vert);
                /* rótulo en la franja libre más amplia (arriba o abajo del juego de comedor) */
                var bajo = mejorC.py - mejorC.hy - y, alto = y + h - (mejorC.py + mejorC.hy);
                r._ly = bajo >= alto ? y + Math.max(0.3, bajo / 2) : y + h - Math.max(0.3, alto / 2);
                break;
            }
            case 'dormp': case 'dorm': {
                /* todo dormitorio lleva: cama con cabecera contra el muro del fondo, dos mesas de noche, televisor frente a
                   la cama y clóset en el muro lateral sin puerta. Las piezas se acomodan para no quedar en el barrido de
                   ninguna puerta ni frente al vano de un baño privado; si el cuarto es angosto se reducen (no se quitan). */
                var dbl = r.tipo === 'dormp', top = y + h - 0.15, barrD = (r._barr || []).slice();
                var vp = r._vanoPriv && r._vanoPriv.arriba ? r._vanoPriv : null;
                if (vp) barrD.push([vp.x0, top - 0.7, vp.x1, top + 0.2]);
                /* el clóset va en el muro lateral contrario a la puerta; con baño privado, en el muro de la puerta (entre
                   la puerta del corredor y la del baño), para dejar todo el muro del fondo a la cama */
                var der = r._puertaDer;
                if (der == null) der = (r._barr || []).some(function (b) { return (b[0] + b[2]) / 2 > cx; });
                var cIzq = vp ? !der : der;
                var choca = function (q) { return q[0] < x + 0.08 || q[2] > x + w - 0.08 || q[1] < y + 0.08 || q[3] > y + h - 0.08 || barrD.some(function (b) { return q[0] < b[2] - 0.01 && q[2] > b[0] + 0.01 && q[1] < b[3] - 0.01 && q[3] > b[1] + 0.01; }); };
                var cruza = function (p, q) { return p[0] < q[2] - 0.01 && p[2] > q[0] + 0.01 && p[1] < q[3] - 0.01 && p[3] > q[1] + 0.01; };
                var mejorD = null;
                /* medidas reales primero; si no alcanzan, todo el juego se dibuja a escala (más pequeño) hasta que quepa completo */
                var cfgs = [[dbl ? 1.6 : 1.0, 0.45, 0.6, 1], [dbl ? 1.4 : 0.9, 0.42, 0.6, 1], [dbl ? 1.4 : 0.9, 0.4, 0.55, 1]];
                for (var ke = 0.95; ke >= 0.5; ke -= 0.05) cfgs.push([(dbl ? 1.4 : 0.9) * ke, 0.4 * ke, 0.55 * ke, ke]);
                cfgs.some(function (cfg) {
                    var bw = cfg[0], nsz = cfg[1], cd = cfg[2], bl = (h >= 2.75 ? 2.0 : 1.9) * cfg[3], by = top - bl, nsy = top - nsz * 0.9;
                    var tvL = 0, tvD = by - (y + 0.15) >= 0.75 ? 0.4 : 0.1;   /* mueble de TV si hay fondo; si no, TV en el muro */
                    /* clóset: el tramo libre más largo de su muro (sin puertas, bajo la mesa de noche y, si se puede,
                       por encima del mueble de TV) */
                    var cxw = cIzq ? [x + 0.15, x + 0.15 + cd] : [x + w - 0.15 - cd, x + w - 0.15], clo = null;
                    [true, false].some(function (conTV) {
                        var bloq = barrD.filter(function (b) { return b[0] < cxw[1] - 0.01 && b[2] > cxw[0] + 0.01; }).map(function (b) { return [b[1] - 0.02, b[3] + 0.02]; });
                        bloq.push([nsy - 0.08, top + 1]);
                        if (conTV) bloq.push([y - 1, y + 0.15 + tvD + 0.1]);
                        bloq.sort(function (p, q) { return p[0] - q[0]; });
                        var c0 = y + 0.15, mejorI = null;
                        bloq.concat([[top + 2, top + 3]]).forEach(function (bk) {
                            if (bk[0] > c0 && (!mejorI || bk[0] - c0 > mejorI[1] - mejorI[0])) mejorI = [c0, Math.min(bk[0], top)];
                            c0 = Math.max(c0, bk[1]);
                        });
                        if (!mejorI || mejorI[1] - mejorI[0] < 0.8 * cfg[3]) return false;
                        var cl = Math.min(2.0, mejorI[1] - mejorI[0]);
                        clo = [cxw[0], mejorI[1] - cl, cxw[1], mejorI[1]];
                        return !choca(clo);
                    });
                    if (!clo || choca(clo)) return false;
                    var best = null;
                    for (var bx = x + 0.1; bx <= x + w - 0.1 + 1e-6; bx += 0.05) {
                        var cama = [bx - bw / 2 - 0.05, by, bx + bw / 2 + 0.05, top + 0.01];
                        var n1 = [bx - bw / 2 - 0.08 - nsz, nsy, bx - bw / 2 - 0.08, top], n2 = [bx + bw / 2 + 0.08, nsy, bx + bw / 2 + 0.08 + nsz, top];
                        if ([cama, n1, n2].some(choca) || [cama, n1, n2].some(function (q) { return cruza(q, clo); })) continue;
                        if (!best || Math.abs(bx - cx) < Math.abs(best - cx)) best = bx;
                    }
                    if (best == null) return false;
                    /* televisor en el muro frente a la cama, centrado con ella y fuera del barrido de la puerta */
                    var tvy0 = y + 0.15, tvy1 = tvy0 + tvD, tvX = null;
                    for (var L_ = Math.min(1.5 * cfg[3], w - 0.6); L_ >= 0.8 * cfg[3] - 1e-6 && tvX == null; L_ -= 0.05)
                        for (var d_ = 0; d_ <= w; d_ += 0.05) {
                            var ok = [best - d_, best + d_].filter(function (tx) { var q = [tx - L_ / 2, tvy0, tx + L_ / 2, tvy1]; return !choca(q) && !cruza(q, clo); });
                            if (ok.length) { tvX = ok[0]; tvL = L_; break; }
                        }
                    if (tvX == null) return false;
                    mejorD = { bw: bw, nsz: nsz, bl: bl, by: by, bx: best, clo: clo, tvX: tvX, tvL: tvL, tvD: tvD, tvy1: tvy1 };
                    return true;
                });
                if (!mejorD) {   /* cuarto muy pequeño: lo esencial, centrado */
                    var bwF = dbl ? 1.2 : 0.9;
                    SIM.cama(lapiz(pl, cx, top, 2), bwF, Math.min(2.0, h - 0.4), dbl);
                    SIM.mesaNoche(lapiz(pl, cx - bwF / 2 - 0.08 - 0.175, top, 2), 0.35); SIM.mesaNoche(lapiz(pl, cx + bwF / 2 + 0.08 + 0.175, top, 2), 0.35);
                    break;
                }
                var D_ = mejorD;
                if (D_.by - (D_.tvy1 + 0.1) >= 0.75) SIM.alfombra(G, D_.bx - D_.bw / 2 - 0.2, D_.by - 0.7, D_.bw + 0.4, 0.6);   /* tapete al pie de la cama */
                SIM.cama(lapiz(pl, D_.bx, top, 2), D_.bw, D_.bl, dbl);
                SIM.mesaNoche(lapiz(pl, D_.bx - D_.bw / 2 - 0.08 - D_.nsz / 2, top, 2), D_.nsz);
                SIM.mesaNoche(lapiz(pl, D_.bx + D_.bw / 2 + 0.08 + D_.nsz / 2, top, 2), D_.nsz);
                var cq = D_.clo, clL = cq[3] - cq[1], cdd = cq[2] - cq[0];
                SIM.closet(cIzq ? lapiz(pl, cq[0], (cq[1] + cq[3]) / 2, 3) : lapiz(pl, cq[2], (cq[1] + cq[3]) / 2, 1), clL, cdd);
                if (D_.tvD >= 0.4) SIM.tv(lapiz(pl, D_.tvX, y + 0.15, 0), D_.tvL); else SIM.tvPared(lapiz(pl, D_.tvX, y + 0.15, 0), D_.tvL);
                if (D_.by - D_.tvy1 > 0.5) r._ly = (D_.tvy1 + D_.by) / 2;
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
                /* mesón: una sola pieza (recto o en L), sin líneas que pasen por debajo de la estufa o el lavaplatos */
                var leg = Math.min(1.6, h - 1.4);
                if (leg > 0.6) G.poly([[x + 0.2, y + 0.2], [x + 0.2 + cw, y + 0.2], [x + 0.2 + cw, y + 0.8], [x + 0.8, y + 0.8], [x + 0.8, y + 0.8 + leg], [x + 0.2, y + 0.8 + leg]], true, F('madera', 0.16));
                else G.rect(x + 0.2, y + 0.2, cw, 0.6, F('madera', 0.16));
                var st = x + 1.0;                                                                  /* estufa de 4 puestos */
                G.rr(st, y + 0.23, 0.6, 0.54, 0.03, F('metal', 0.25));
                [[0.16, 0.37, 0.1], [0.44, 0.37, 0.07], [0.16, 0.63, 0.07], [0.44, 0.63, 0.1]].forEach(function (q) {
                    G.circ(st + q[0], y + q[1], q[2], Dl('cocina')); G.circ(st + q[0], y + q[1], q[2] * 0.5, F('cocina', 0.5));
                });
                var sk = x + 0.2 + cw - 1.05;                                                     /* lavaplatos doble */
                if (sk > st + 0.7) {
                    G.rr(sk, y + 0.27, 0.88, 0.46, 0.04, F('metal', 0.15));
                    G.rr(sk + 0.05, y + 0.31, 0.37, 0.38, 0.05, F('sanit', 0.2)); G.rr(sk + 0.46, y + 0.31, 0.37, 0.38, 0.05, F('sanit', 0.2));
                    G.circ(sk + 0.235, y + 0.5, 0.025, Dl('metal')); G.circ(sk + 0.645, y + 0.5, 0.025, Dl('metal')); G.rr(sk + 0.42, y + 0.21, 0.04, 0.05, 0.015, F('metal', 0.8));   /* grifo (sin tocar las pocetas) */
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
                /* mostrador en L como una sola pieza */
                G.poly([[x + 0.5, y + 0.9], [x + 0.5 + mw, y + 0.9], [x + 0.5 + mw, y + 1.5], [x + 1.1, y + 1.5], [x + 1.1, y + 2.4], [x + 0.5, y + 2.4]], true, F('madera', 0.22));
                SIM.sillaOficina(lapiz(pl, x + 0.5 + mw / 2, y + 0.45, 0));
                for (k = 0; k < Math.min(4, Math.floor((w - 1.4) / 0.6)); k++) SIM.silla(lapiz(pl, x + 0.75 + k * 0.6, y + h - 0.15, 2));
                SIM.maceta(lapiz(pl, x + w - 0.45, y + h - 0.45, 0), 0.18);
                break;
            }
            case 'lectura': case 'estudio2': case 'reuniones': mesas(1.6, 0.8, 1.2); break;
            case 'cafeteria': for (var fy0 = y + 1.2; fy0 < y + h - 0.8; fy0 += 1.9) for (var fx0 = x + 1.0; fx0 < x + w - 0.8; fx0 += 1.9) mesaRedonda(pl, fx0, fy0, 0.4, 4); break;
            case 'infantil': {
                SIM.alfombra(G, x + 0.4, y + h - 2.2, Math.min(2.4, w - 0.8), 1.8);
                for (var ix = x + 1.0; ix < x + w - 0.6; ix += 1.7) for (var iy2 = y + 1.0; iy2 < y + h - 3.25; iy2 += 1.7) mesaRedonda(pl, ix, iy2, 0.42, 4);   /* sin tocar la alfombra */
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
                if (/NAVE|TEMPLO|IGLESIA|CAPILLA|PARROQUIA/.test(r.nombre)) {                     /* bancas en dos bloques con pasillo central */
                    var pas = Math.min(2.0, w * 0.14), lB = Math.min(4.5, (w - pas) / 2 - 0.9), filasB = 0;
                    for (var by_ = y + 2.0; by_ < y + h - 1.5 && filasB < 30; by_ += 0.95, filasB++) {
                        [cx - pas / 2 - lB, cx + pas / 2].forEach(function (bx_) {
                            G.rr(bx_, by_, lB, 0.42, 0.05, F('madera', 0.28)); G.ln(bx_, by_ + 0.36, bx_ + lB, by_ + 0.36, Dl('madera', 0.012));
                        });
                    }
                    SIM.alfombra(G, cx - pas / 2 + 0.15, y + 0.4, pas - 0.3, h - 0.8);
                    break;
                }
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
            case 'ascensor': G.rect(x + 0.3, y + 0.3, w - 0.6, h - 0.6, F('metal', 0.15)); G.ln(x + 0.3, y + 0.3, x + w - 0.3, y + h - 0.3, Dl('metal')); break;   /* cabina con una diagonal (sin X que se cruce) */
        }
    }
    /* acabado de piso: tono suave por ambiente + baldosa (zonas húmedas) o listones de madera (zonas secas) */
    function acabado(r, pl) {
        if (r.sinEtiqueta) return;   /* zona fuera de la edificación (retiro) */
        var m = MURO / 2 + 0.03, x0 = r.x + m, y0 = r.y + m, x1 = r.x + r.w - m, y1 = r.y + r.h - m, t = r.tipo;
        if (x1 - x0 < 0.4 || y1 - y0 < 0.4) return;
        var humedo = /^(bano|banos|cocina|lav)$/.test(t), madera = /^(dorm|dormp|sala|comedor|estudio|ingreso|oficina|lectura|estudio2|reuniones|infantil|recepcion|auditorio|aula|informatica|closet)$/.test(t);
        if (t === 'vestier') madera = true;
        var tono = humedo ? 'sanit' : madera ? 'madera' : t === 'patio' ? 'verde' : t === 'cochera' ? 'metal' : t === 'piscina' || t === 'jacuzzi' ? 'verde' : 'piso';
        /* solo el tono del material (sin líneas de baldosa ni de entablado: quedarían debajo de los muebles) */
        pl('ACABADOS', [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], true, { col: tono, fill: true, alpha: t === 'patio' ? 0.1 : humedo || madera ? 0.09 : 0.06, noStroke: true, soloVista: true });
    }
    function modelo(Pl, soloPiso) {
        var ents = [], gap = Pl.W + 12;   /* espacio para el cuadro de elementos a la derecha de cada planta */
        Pl.pisos.forEach(function (pi, i) { if (soloPiso && pi.n !== soloPiso) return; ents = ents.concat(dibujarPiso(Pl, pi, soloPiso ? 0 : i * gap)); });
        if (!soloPiso) {
            /* láminas estructurales a continuación de las plantas */
            var xE = Pl.pisos.length * gap;
            ents = ents.concat(dibujarEstructural(Pl, xE));
            ents = ents.concat(dibujarDetalles(Pl, xE + Pl.W + 8));
        }
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
    var COLOR = { EJES: '#ef4444', COLUMNAS: '#22d3ee', MUROS: '#2dd4bf', PUERTAS: '#4ade80', VENTANAS: '#60a5fa', ESCALERA: '#e879f9', MOBILIARIO: '#facc15', TEXTO: '#e2e8f0', COTAS: '#38bdf8', DETALLES: '#f8fafc', MARCO: '#94a3b8',
        VIGAS: '#f59e0b', CONCRETO: '#cbd5e1', 'ACERO-LONG': '#f87171', ESTRIBOS: '#4ade80', TEXTOS: '#e2e8f0', APOYOS: '#60a5fa', SUELO: '#a16207' };
    var COLOR_CLARO = { EJES: '#dc2626', COLUMNAS: '#0e7490', MUROS: '#0f766e', PUERTAS: '#15803d', VENTANAS: '#2563eb', ESCALERA: '#a21caf', MOBILIARIO: '#b45309', TEXTO: '#0f172a', COTAS: '#0369a1', DETALLES: '#0f172a', MARCO: '#64748b',
        VIGAS: '#b45309', CONCRETO: '#334155', 'ACERO-LONG': '#dc2626', ESTRIBOS: '#15803d', TEXTOS: '#0f172a', APOYOS: '#2563eb', SUELO: '#78350f' };
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
                out.push('<text' + at + ' x="' + X(e.p[0]) + '" y="' + (parseFloat(Y(e.p[1])) + fs * 0.35).toFixed(3) + '" font-size="' + fs.toFixed(3) + '" fill="' + (e.sub ? (claro ? '#475569' : '#94a3b8') : c) + '" text-anchor="' + (e.ha === 0 ? 'start' : e.ha === 2 ? 'end' : 'middle') + '" font-family="JetBrains Mono,Consolas,monospace"' + (e.titulo ? ' font-weight="700"' : '') + rot + '>' + esc(e.s[0]) + '</text>');
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
        if (P.ia) {
            var it2 = [], necesario = [];
            for (var fi = 1; fi <= P.n; fi++) {
                var rooms = (Pl.pisos[fi - 1] || { rooms: [] }).rooms;
                (P.pisos[fi].gen || []).forEach(function (e) {
                    var rs = rooms.filter(function (r) { return r.nombre === e.nombre || r.nombre.indexOf(e.nombre + ' ') === 0; });
                    var nom = e.nombre.charAt(0) + e.nombre.slice(1).toLowerCase();
                    if (!rs.length) { it2.push([false, (e.n > 1 ? e.n + ' × ' : '') + nom + ' (' + ordinal(fi) + ' piso) — no cupo']); return; }
                    /* medida libre (de cara a cara de muro), que es la que muestran las cotas del plano */
                    var r0 = rs[0], lw = r0.w - (r0.x < 0.01 ? MURO_EXT : MURO / 2) - (r0.x + r0.w > Pl.W - 0.01 ? MURO_EXT : MURO / 2), lh = r0.h - (r0.y < 0.01 ? MURO_EXT : MURO / 2) - (Math.abs(r0.y + r0.h - Pl.D) < 0.01 ? MURO_EXT : MURO / 2);
                    var txtM = f2(lw) + ' × ' + f2(lh) + ' m libres';
                    if (e.req) {
                        var a1 = [e.req.w, e.req.h].sort(function (a, b) { return a - b; }), a2 = [lw, lh].sort(function (a, b) { return a - b; });
                        var igual = Math.abs(a1[0] - a2[0]) <= 0.02 && Math.abs(a1[1] - a2[1]) <= 0.02;
                        it2.push([igual && rs.length >= e.n, (e.n > 1 ? e.n + ' × ' : '') + nom + ' (' + ordinal(fi) + ' piso): ' + (e.reqAuto ? (typeof e.reqAuto === 'string' ? e.reqAuto : 'mínimo para estacionar ') : 'pediste ') + f2(e.req.w) + ' × ' + f2(e.req.h) + ' → ' + txtM]);
                    } else it2.push([rs.length >= e.n, (e.n > 1 ? e.n + ' × ' : '') + nom + ' (' + ordinal(fi) + ' piso): ' + txtM]);
                });
                if (rooms.some(function (r) { return r.tipo === 'escalera'; }) && necesario.indexOf('escalera') < 0) necesario.push('escalera');
                if (rooms.some(function (r) { return r.tipo === 'pasillo'; }) && necesario.indexOf('circulación') < 0) necesario.push('circulación');
            }
            var html = '<div class="cxpl-cumple"><b>Lo que pediste</b><ul>' + it2.map(function (x) { return '<li class="' + (x[0] ? 'si' : 'aj') + '">' + (x[0] ? '✓ ' : '≈ ') + esc(x[1]) + '</li>'; }).join('') + '</ul>';
            if (necesario.length) html += '<p class="cxpl-cumple-n">➕ Agregado solo porque la obra no funciona sin ello: ' + esc(necesario.join(' y ')) + (necesario.indexOf('escalera') >= 0 ? ' (hay ' + P.n + ' pisos)' : '') + '.</p>';
            if (P.quitados && P.quitados.length) html += '<p class="cxpl-cumple-n">✂ Quité lo que no pediste: ' + esc(P.quitados.filter(function (v, i, a) { return a.indexOf(v) === i; }).join(', ')) + '. Si lo quieres, dime «agrega …».</p>';
            return html + '</div>';
        }
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
            '<div class="civix-md">🏗️ ' + (P.titulo ? '<b>' + esc(P.titulo) + '</b> — t' : 'T') + 'e propongo esta distribución (lote ' + f2(P.W) + ' × ' + f2(P.L) + ' m, ' + P.n + ' piso' + (P.n > 1 ? 's' : '') + '):<br><small>' + esc(resumenPisos(P)) + '</small></div>' +
            cumplimiento(P, Pl) +
            '<div class="cxpl-tbl-wrap"><table class="cxpl-tbl"><thead><tr><th>Ambiente</th><th>Medidas (m)</th><th>Piso</th></tr></thead><tbody>' +
            filas.map(function (r, i) { return '<tr style="--i:' + i + '"><td>' + esc(r.nombre) + '</td><td>' + f2(r.w) + ' × ' + f2(r.h) + '</td><td>' + esc(r.txt) + '</td></tr>'; }).join('') +
            '</tbody></table></div>' +
            (P.supuesto ? '<p class="cxpl-sup">ℹ️ ' + esc(P.supuesto) + '</p>' : '') +
            (Pl.warns.length ? Pl.warns.map(function (w) { return '<p class="cxp-warn">⚠ ' + esc(w) + '</p>'; }).join('') : '') +
            '<p class="cxpl-q">¿Apruebas la distribución? También puedes pedir cambios en el chat: <i>' + (P.ia ? '«agrega una sala de juntas», «cambia: el salón principal de 300 m²», «que tenga 3 pisos»' : '«sin estudio», «agrega un baño», «4 dormitorios», «cochera simple»') + '</i>.</p>' +
            '<div class="cxpl-acts"><button type="button" class="cxpl-btn ok" data-cxpl="aprobar">Sí, aprobado ✓</button><button type="button" class="cxpl-btn" data-cxpl="cambiar">Quiero cambiar algo</button></div>' +
            '<p class="cxpl-nota">Diseño generado ' + (P.ia ? 'a partir de tu pedido' : 'por reglas de distribución') + '. No reemplaza el diseño arquitectónico y estructural firmado por un profesional ni la revisión de la norma local (POT, NSR-10).</p>');
        if (!c) return false;
        c.addEventListener('click', function (e) {
            var b = e.target.closest('[data-cxpl]'); if (!b) return;
            if (b.getAttribute('data-cxpl') === 'aprobar') { c.querySelectorAll('[data-cxpl]').forEach(function (x) { x.disabled = true; }); aprobar(); }
            else { var i = doc.getElementById('inputAsistente'); if (i) { i.value = 'Cambia: '; i.focus(); } }
        });
        historial(texto, 'Propuse una distribución arquitectónica para un lote de ' + f2(P.W) + ' × ' + f2(P.L) + ' m con ' + P.n + ' pisos: ' + filas.map(function (r) { return r.nombre + ' ' + f2(r.w) + '×' + f2(r.h) + ' (' + r.txt + ')'; }).join('; ') + '.');
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
            }).join('') +
            /* láminas estructurales: planta de vigas y columnas + detalles de refuerzo */
            '<figure>' + svgPiso(dibujarEstructural(Pl, 0), true, false) + '<figcaption>PLANTA ESTRUCTURAL</figcaption></figure>' +
            '<figure>' + svgPiso(dibujarDetalles(Pl, 0, 'viga'), true, false) + '<figcaption>DETALLE VIGA V-1</figcaption></figure>' +
            '<figure>' + svgPiso(dibujarDetalles(Pl, 0, 'columna'), true, false) + '<figcaption>DETALLE COLUMNA C-1</figcaption></figure>' +
            '</div>' +
            '<div class="cxpl-cambio"><b>¿Quieres cambiar algo?</b><span>Escríbelo en el chat y se vuelve a dibujar.</span></div>' +
            '<div class="cxpl-acts"><button type="button" class="cxpl-btn ok" data-cxpl="cine">🎬 Ver de nuevo en modo cine</button><button type="button" class="cxpl-btn ok" data-cxpl="3d">🏗️ Render 3D</button>' +
            '<button type="button" class="cxpl-btn" data-cxpl="dxf">⬇ DXF</button><button type="button" class="cxpl-btn" data-cxpl="pdf">⬇ PDF</button><button type="button" class="cxpl-btn" data-cxpl="png">⬇ PNG</button></div>' +
            '<p class="cxpl-nota">También puedes escribir «dibújalo».</p>');
        if (c) c.addEventListener('click', function (e) { var b = e.target.closest('[data-cxpl]'); if (b) accion(b.getAttribute('data-cxpl'), b); });
        historial('Sí, aprobado', 'Distribución aprobada: las plantas se dibujaron en modo cine y luego se mostró la vista previa con descargas DXF/PDF/PNG.');
        /* al aprobar, el diseño se dibuja de una vez en modo cine; al terminar aparece la vista previa */
        if (c) { c.classList.add('cxpl-oculto'); setTimeout(function () { cine(Pl, { transicion: true, volverA: c }); }, 250); }
    }
    function nombreArchivo() { var P = actual.P; return 'Civix_planos_' + P.n + 'pisos_' + f2(P.W).replace('.', '_') + 'x' + f2(P.L).replace('.', '_'); }
    function accion(a, btn) {
        if (!actual) return;
        try {
            if (a === 'cine') return cine(actual.Pl);
            if (a === '3d') { if (global.Civix3D) global.Civix3D.abrir(actual.Pl); else if (btn) btn.textContent = '⚠ Falta js/civix-3d.js'; return; }
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
        ['Vigas', /^VIGAS$/, '#f59e0b', 0.12],
        ['Pisos y acabados', /^ACABADOS/, '#a5b4c8', 0.12],
        ['Armadura', /ARMAD|ACERO|ESTRIB|REFUER|VARILL|REBAR|STEEL/, '#ef4444', 0.18],
        ['Concreto y suelo', /CONTORNO|CONCRET|SUELO|ASFALTO|APOYO|SOMBRA|LOSA|VIGA|ZAPATA|PERFIL|OUTLINE|TERRENO|ESTRUC/, '#a3e635', 0.02],
        ['Cables y tirantes', /CABLE|TIRANT|TENSOR/, '#e879f9', 0.25],
        ['Agua', /^AGUA/, '#60a5fa', 0.3],
        ['Madera y mampostería', /MADERA|MAMPOST/, '#d6a35c', 0.12],
        ['Cotas', /COTA|DIM|ACOT/, '#38bdf8', 0.4],
        ['Rotulación', /TEXT|TXT|ETIQ|LABEL|NOTA|LEYENDA/, '#e2e8f0', 0.5]
    ];
    function rolDe(capa) {
        var L = String(capa || '').toUpperCase();
        for (var i = 0; i < ROLES.length; i++) if (ROLES[i][1].test(L)) return ROLES[i];
        return ['Detalles', null, '#a78bfa', 0.15];
    }
    /* solo 4 agentes dibujan: cada uno se encarga de varias capas, en este orden (primero lo que va debajo) */
    var AGENTES = [
        { nombre: 'Topografía y ejes', color: '#f97316', inicio: 0, capas: ['Cuadrícula y ejes', 'Topógrafo · puntos', 'Triangulación', 'Curvas de nivel', 'Agua'] },
        { nombre: 'Estructura', color: '#22d3ee', inicio: 0.02, capas: ['Columnas', 'Concreto y suelo', 'Vigas', 'Madera y mampostería', 'Armadura', 'Cables y tirantes'] },
        { nombre: 'Arquitectura', color: '#2dd4bf', inicio: 0.06, capas: ['Muros', 'Pisos y acabados', 'Escalera', 'Carpintería', 'Mobiliario'] },
        { nombre: 'Cotas y rotulación', color: '#38bdf8', inicio: 0.2, capas: ['Marco y rótulo', 'Detalles', 'Cotas', 'Rotulación'] }
    ];
    function agenteDe(rol) {
        for (var i = 0; i < AGENTES.length; i++) { var j = AGENTES[i].capas.indexOf(rol[0]); if (j >= 0) return { i: i, orden: j }; }
        return { i: 3, orden: 1 };
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
        var resumen = {}, agentes = [], porAg = AGENTES.map(function () { return []; }), sec = 0;
        /* cada trazo se asigna a uno de los 4 agentes; un mismo agente recorre todas las vistas (plantas y detalles) */
        vistas.forEach(function (v, iv) {
            v.idx = iv;
            var span = Math.max(v.svg.viewBox.baseVal.width, v.svg.viewBox.baseVal.height) || 1;
            [].slice.call(v.svg.querySelectorAll('.cxpl-e')).forEach(function (n) {
                var ag = agenteDe(rolDe(n.getAttribute('data-l'))), g = geometria(n);
                g.peso = g.tipo === 'linea' ? 0.25 + Math.min(3, g.len / span * 7) : (n.tagName.toLowerCase() === 'text' ? 0.3 : 0.07);
                porAg[ag.i].push({ n: n, g: g, v: v, orden: ag.orden, k: sec++ });
            });
        });
        porAg.forEach(function (nodos, ia) {
            if (!nodos.length) return;
            var A = AGENTES[ia], acc = [0];
            /* por vista y, dentro de cada vista, primero las capas de abajo (muros antes que muebles) */
            nodos.sort(function (a, b) { return a.v.idx - b.v.idx || a.orden - b.orden || a.k - b.k; });
            nodos.forEach(function (x, i) { acc.push(acc[i] + x.g.peso); });
            var curs = {};
            nodos.forEach(function (x) {
                if (curs[x.v.idx]) return;
                var cur = el('span', 'cxpl-cur', '<i></i><b>' + esc(A.nombre) + '</b>');
                cur.style.setProperty('--c', A.color); x.v.fig.appendChild(cur); curs[x.v.idx] = cur;
            });
            agentes.push({ nombre: A.nombre, color: A.color, inicio: A.inicio, nodos: nodos, acc: acc, total: acc[acc.length - 1], i: 0, curs: curs });
            resumen[A.nombre] = { color: A.color, hechos: 0, total: acc[acc.length - 1] };
        });
        /* cada agente termina según su carga: los de poco trabajo (marco, cotas) acaban antes y no se arrastran */
        var maxT = agentes.reduce(function (m, a) { return Math.max(m, a.total); }, 0) || 1;
        agentes.forEach(function (a) { a.fin = Math.min(1, a.inicio + (1 - a.inicio) * Math.min(1, 0.35 + 0.65 * Math.sqrt(a.total / maxT))); });
        /* leyenda de agentes con su avance */
        var nombres = Object.keys(resumen);
        if (leyenda) leyenda.innerHTML = nombres.map(function (k) { return '<span style="--c:' + resumen[k].color + '"><i></i>' + esc(k) + ' <b data-ag="' + esc(k) + '">0%</b></span>'; }).join('');
        var DUR = op.dur || 16000, vel = 1, t0 = 0, raf = 0, tmr = 0, ultimaLeyenda = 0;
        /* el cursor del agente solo se ve en la vista donde está trazando */
        function ocultar(a, salvo) { for (var k in a.curs) if (a.curs[k] !== salvo) a.curs[k].style.opacity = 0; }
        function poner(x, p) {
            var s = x.n.style;
            if (x.g.tipo === 'linea') { s.strokeDashoffset = String(1 - p); if (x.g.fill) s.fillOpacity = String(x.g.fill * p); }
            else s.opacity = String(p);
        }
        function preparar() {
            agentes.forEach(function (a) {
                a.i = 0; ocultar(a);
                a.nodos.forEach(function (x) {
                    var s = x.n.style;
                    if (x.g.tipo === 'linea') { s.opacity = '1'; s.strokeDasharray = '1'; s.strokeDashoffset = '1'; if (x.g.fill) s.fillOpacity = '0'; }
                    else s.opacity = '0';
                });
            });
        }
        function acabar() {
            agentes.forEach(function (a) { a.nodos.forEach(function (x) { poner(x, 1); if (x.g.tipo === 'linea') x.n.style.strokeDasharray = ''; }); ocultar(a); a.i = a.nodos.length; });
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
                        var v = x.v, cur = a.curs[v.idx], M = ctm[v.idx] || (ctm[v.idx] = { m: v.svg.getScreenCTM(), r: v.fig.getBoundingClientRect() });
                        var pt = v.svg.createSVGPoint(), q = puntoEn(x.g, p); pt.x = q[0]; pt.y = q[1]; pt = pt.matrixTransform(M.m);
                        ocultar(a, cur);
                        cur.style.transform = 'translate(' + (pt.x - M.r.left).toFixed(1) + 'px,' + (pt.y - M.r.top).toFixed(1) + 'px)'; cur.style.opacity = 1;
                    } catch (e) { }
                } else ocultar(a);
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
    /* Zoom y desplazamiento en el modo cine: rueda del ratón = zoom hacia el puntero; arrastrar = mover;
       doble clic = volver a la vista completa. Se hace con el viewBox del SVG (el trazo sigue siendo vectorial
       y los cursores de los agentes siguen ubicándose bien porque leen la matriz de pantalla en cada cuadro). */
    function zoomCine(ov) {
        var top = ov.querySelector('.cxpl-cine-top > div'), grid = ov.querySelector('.cxpl-cine-g'), figs = ov.querySelectorAll('.cxpl-cine-f'), multi = figs.length > 1;
        /* con varias vistas (plantas, planta estructural, detalles): clic en una para centrarla y ampliarla;
           el zoom y el desplazamiento funcionan sobre la vista centrada */
        if (top && !ov.querySelector('.cxpl-zoom-ayuda')) top.insertAdjacentHTML('beforeend', '<small class="cxpl-zoom-ayuda">' + (multi ? '🖱 Clic en una vista para centrarla · rueda: zoom · arrastrar: mover · doble clic: vista completa' : '🖱 Rueda: zoom · arrastrar: mover · doble clic: vista completa') + '</small>');
        var btnTodas = null;
        if (multi) {
            var acts = ov.querySelector('.cxpl-cine-acts');
            if (acts) { acts.insertAdjacentHTML('afterbegin', '<button type="button" data-c="todas" hidden title="Volver a ver todas las vistas">⤺ Todas las vistas</button>'); btnTodas = acts.querySelector('[data-c="todas"]'); }
            grid.classList.add('seleccionable');
        }
        function enfocar(fig) {
            grid.classList.add('enfocado'); fig.classList.add('foco');
            if (btnTodas) btnTodas.hidden = false;
            try { grid.scrollTop = 0; } catch (eS) { }
        }
        function desenfocar() {
            [].forEach.call(figs, function (f) { if (f._reset) f._reset(); f.classList.remove('foco'); });
            grid.classList.remove('enfocado');
            if (btnTodas) btnTodas.hidden = true;
        }
        ov._desenfocar = desenfocar;
        ov._enfocado = function () { return grid.classList.contains('enfocado'); };
        [].forEach.call(figs, function (fig) {
            var svg = fig.querySelector('svg'); if (!svg) return;
            var vb0 = svg.viewBox.baseVal, ORIG = [vb0.x, vb0.y, vb0.width, vb0.height], arr = null, movido = false, p0 = null;
            function poner(x, y, w, h) { svg.setAttribute('viewBox', x + ' ' + y + ' ' + w + ' ' + h); fig.classList.toggle('cxpl-zoom', w < ORIG[2] * 0.999); }
            fig._reset = function () { poner(ORIG[0], ORIG[1], ORIG[2], ORIG[3]); };
            function aSvg(cx, cy) { var m = svg.getScreenCTM(); if (!m) return null; var p = svg.createSVGPoint(); p.x = cx; p.y = cy; return p.matrixTransform(m.inverse()); }
            fig.addEventListener('pointerdown', function (e) { p0 = [e.clientX, e.clientY]; movido = false; });
            fig.addEventListener('click', function (e) {
                if (!multi || grid.classList.contains('enfocado') || movido) return;
                enfocar(fig);
            });
            fig.addEventListener('wheel', function (e) {
                if (multi && !fig.classList.contains('foco')) return;   /* en la cuadrícula la rueda desplaza; el zoom es para la vista centrada */
                e.preventDefault();
                var vb = svg.viewBox.baseVal, p = aSvg(e.clientX, e.clientY); if (!p) return;
                var f = Math.pow(1.0015, e.deltaY);   /* suave con ratón y con panel táctil */
                var w = Math.max(ORIG[2] * 0.04, Math.min(ORIG[2], vb.width * f)), h = w * ORIG[3] / ORIG[2], k = w / vb.width;
                var x = p.x - (p.x - vb.x) * k, y = p.y - (p.y - vb.y) * k;
                if (w >= ORIG[2] * 0.999) { x = ORIG[0]; y = ORIG[1]; }
                poner(x, y, w, h);
            }, { passive: false });
            fig.addEventListener('pointerdown', function (e) {
                if (e.button !== 0 || !fig.classList.contains('cxpl-zoom')) return;
                arr = { x: e.clientX, y: e.clientY, vb: [svg.viewBox.baseVal.x, svg.viewBox.baseVal.y] };
                try { fig.setPointerCapture(e.pointerId); } catch (eP) { }
                fig.classList.add('cxpl-arrastrando');
            });
            fig.addEventListener('pointermove', function (e) {
                if (p0 && Math.hypot(e.clientX - p0[0], e.clientY - p0[1]) > 5) movido = true;
                if (!arr) return;
                var m = svg.getScreenCTM(); if (!m) return;
                var vb = svg.viewBox.baseVal;
                poner(arr.vb[0] - (e.clientX - arr.x) / m.a, arr.vb[1] - (e.clientY - arr.y) / m.d, vb.width, vb.height);
            });
            function soltar() { arr = null; fig.classList.remove('cxpl-arrastrando'); }
            fig.addEventListener('pointerup', soltar); fig.addEventListener('pointercancel', soltar);
            fig.addEventListener('dblclick', function () { if (!multi || fig.classList.contains('foco')) poner(ORIG[0], ORIG[1], ORIG[2], ORIG[3]); });
        });
    }
    var CURSOR = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];
    /* o.transicion: se abre solo al aprobar y, al terminar de dibujar, se cierra y deja ver la vista previa (o.volverA) */
    function cine(Pl, o) {
        o = o || {};
        var reducido = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var ov = el('div', 'cxpl-cine');
        ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Modo cine: dibujo de las plantas');
        ov.innerHTML = '<div class="cxpl-cine-top"><div><small>CIVIX · PLANOS</small><b>' + (actual && actual.P && actual.P.titulo ? esc(actual.P.titulo) + ' · ' : (actual && actual.P && actual.P.esCasa ? 'Casa ' : 'Edificio ')) + Pl.n + ' piso' + (Pl.n > 1 ? 's' : '') + ' · lote ' + f2(Pl.W) + ' × ' + f2(Pl.L) + ' m</b></div>' +
            '<span class="cxpl-etapa">Preparando…</span><div class="cxpl-cine-acts">' +
            '<button type="button" data-c="vel" title="Velocidad">1×</button>' +
            (o.autoCierre ? '<button type="button" data-c="x" title="Ir directo a la vista previa">⏭ Saltar</button>'
                : '<button type="button" data-c="rep" title="Repetir">↺ Repetir</button><button type="button" data-c="dxf">⬇ DXF</button><button type="button" data-c="pdf">⬇ PDF</button><button type="button" data-c="x" aria-label="Cerrar" title="' + (o.transicion ? 'Cerrar y ver la vista previa' : 'Cerrar') + '">✕</button>') +
            '</div></div>' +
            '<div class="cxpl-cine-bar"><i></i></div><div class="cxpl-agentes" aria-live="off"></div><div class="cxpl-cine-g" style="--n:' + Math.min(Pl.n, 4) + '"></div>';
        doc.body.appendChild(ov);
        var grid = ov.querySelector('.cxpl-cine-g');
        var vistas = Pl.pisos.map(function (pi, i) {
            var ents = dibujarPiso(Pl, pi, 0);
            var fig = el('figure', 'cxpl-cine-f', '<figcaption style="--c:' + CURSOR[i % CURSOR.length] + '">' + (NOMBRE_PISO[pi.n] || pi.n + '.º') + ' PISO</figcaption>' + svgPiso(ents, false, true));
            grid.appendChild(fig);
            return { fig: fig, svg: fig.querySelector('svg'), etiqueta: ordinal(pi.n) };
        });
        /* láminas estructurales: los agentes también dibujan la planta de vigas y columnas y los detalles */
        [['PLANTA ESTRUCTURAL', dibujarEstructural(Pl, 0), '#f59e0b'], ['DETALLE VIGA V-1', dibujarDetalles(Pl, 0, 'viga'), '#f87171'], ['DETALLE COLUMNA C-1', dibujarDetalles(Pl, 0, 'columna'), '#a78bfa']].forEach(function (L, k) {
            var fig = el('figure', 'cxpl-cine-f', '<figcaption style="--c:' + L[2] + '">' + L[0] + '</figcaption>' + svgPiso(L[1], false, true));
            grid.appendChild(fig);
            vistas.push({ fig: fig, svg: fig.querySelector('svg'), etiqueta: 'E' + k });
        });
        grid.style.setProperty('--n', Math.min(vistas.length, 4));
        var cerrado = false;
        /* al terminar, el plano se queda en pantalla (solo se cierra con ✕ o Escape) y se invita a explorar cada vista */
        var motor = motorAgentes(ov, vistas, {
            dur: 15000 + 1500 * Math.min(Pl.n, 4),
            alTerminar: o.autoCierre ? function () { setTimeout(cerrar, 1300); } : function () { var et = ov.querySelector('.cxpl-etapa'); if (et) et.textContent = 'Plano terminado · clic en una vista'; }
        });
        zoomCine(ov);
        function cerrar() {
            if (cerrado) return; cerrado = true;
            motor.detener(); doc.removeEventListener('keydown', tecla);
            if (!o.transicion) { ov.remove(); return; }
            /* transición: el cine se desvanece y aparece la vista previa con las descargas */
            ov.classList.add('saliendo');
            var dest = o.volverA && o.volverA.isConnected ? o.volverA : null;
            if (dest) {
                dest.classList.remove('cxpl-oculto'); dest.classList.add('cxpl-aparece', 'cxpl-llegada');
                setTimeout(function () { dest.classList.remove('cxpl-aparece', 'cxpl-llegada'); }, 1600);
                try { dest.scrollIntoView({ block: 'start', behavior: 'smooth' }); } catch (eS) { }
            }
            setTimeout(function () { ov.remove(); }, 520);
        }
        /* Escape: primero vuelve a todas las vistas; si ya están todas, cierra */
        function tecla(e) { if (e.key !== 'Escape') return; if (ov._enfocado && ov._enfocado()) ov._desenfocar(); else cerrar(); }
        doc.addEventListener('keydown', tecla);
        ov.addEventListener('click', function (e) {
            var b = e.target.closest('[data-c]'); if (!b) return;
            var c = b.getAttribute('data-c');
            if (c === 'x') cerrar();
            else if (c === 'todas') { if (ov._desenfocar) ov._desenfocar(); }
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

    /* =================================================================== 10. CUALQUIER EDIFICACIÓN O ESTRUCTURA
       Lo que las reglas locales no cubren con seguridad (hospital, iglesia, bodega, hotel, estadio, tanque,
       torre, puente colgante, cubierta, silo…) se interpreta con la IA, que devuelve una ESPECIFICACIÓN en JSON
       de exactamente lo pedido; el dibujo lo hace este módulo:
         · edificación → programa por piso (espacios, áreas, cantidades) → distribución, vista previa y modo cine;
         · estructura  → geometría real en metros por vistas (capas, cotas, textos) → visor CAD y modo cine. */
    var TIPOS_IA = ['dorm', 'dormp', 'bano', 'banos', 'cocina', 'sala', 'comedor', 'estudio', 'oficina', 'aula', 'informatica', 'lectura', 'reuniones', 'recepcion', 'cafeteria', 'auditorio', 'infantil', 'deposito2', 'bodega', 'gimnasio', 'cancha', 'terraza', 'piscina', 'patio', 'local', 'cochera', 'ascensor', 'lav', 'gen'];
    var CAPAS_IA = { CONTORNO: 7, CONCRETO: 8, ACERO: 1, ARMADURA: 1, CABLES: 6, MADERA: 42, MAMPOSTERIA: 30, SUELO: 34, AGUA: 5, EJES: 1, OCULTO: 9, DETALLE: 3, COTAS: 4, TEXTO: 7 };
    var RELLENO_IA = { CONCRETO: 0.22, SUELO: 0.18, AGUA: 0.3, MAMPOSTERIA: 0.2, MADERA: 0.2, ACERO: 0.35 };
    var PROMPT_IA = [
        'Eres el motor de diseño del modo Planos de Civix. Conviertes el pedido del usuario en una especificación JSON que un programa dibuja.',
        'Responde SOLO con un objeto JSON válido: sin texto antes ni después, sin markdown, sin comentarios.',
        'Respeta EXACTAMENTE lo pedido: tipo de obra, cantidades, medidas, número de pisos, espacios, materiales y forma. No lo cambies por otro diseño ni uses uno genérico. Si falta un dato numérico, supón un valor técnico razonable y anótalo en "supuestos".',
        'REGLA ESTRICTA: incluye ÚNICAMENTE lo que el usuario nombró, con las cantidades exactas que dijo. NO agregues espacios ni elementos que no pidió (ni baños, depósitos, recepciones, vestíbulos, cocinas, lavanderías, parqueaderos, zonas verdes, barandas, losas o muros extra). Solo si el pedido no nombra ningún espacio, propón el programa mínimo y explícalo en "supuestos".',
        '',
        'EDIFICACIÓN (cualquier uso: hospital, hotel, iglesia, bodega, colegio, centro comercial, coliseo, oficinas, restaurante, vivienda…):',
        '{"clase":"edificacion","titulo":"…","lote":{"frente":m,"fondo":m},"pisos":[{"piso":1,"esquema":"corredor","espacios":[{"nombre":"…","area":m2,"ancho":m,"largo":m,"cantidad":1,"tipo":"…","principal":false}]}],"supuestos":["…"]}',
        '- Si el usuario dio medidas de un espacio (p. ej. «consultorio de 4 x 5»), copia EXACTAMENTE esos valores en "ancho" y "largo" (y area = ancho × largo); usa el mismo nombre que él usó. Si no dio medidas, omite ancho y largo.',
        '- "esquema":"abierto" si el piso es un gran espacio (nave, bodega, cancha, templo, salón, hangar) con espacios menores al frente; marca ese gran espacio con "principal":true y a los espacios que van detrás de él (presbiterio, escenario, muelle de carga posterior…) ponles "ubicacion":"fondo". "corredor" si son recintos a lado y lado de un pasillo.',
        '- "tipo" es el mobiliario a dibujar, uno de: ' + TIPOS_IA.join(', ') + '. Usa auditorio para naves de templo, teatros y salones con sillas; bodega para bodegas y naves industriales; cancha para coliseos y canchas; dorm para habitaciones de hotel u hospital; oficina para consultorios y oficinas.',
        '- Un objeto por cada piso pedido. Áreas en m² coherentes con el lote. No incluyas pasillos ni escaleras (se agregan solos). Usa "banos" para baterías sanitarias públicas.',
        '- Baño privado de un espacio (p. ej. «habitación principal con baño privado», «consultorio con baño»): crea un espacio aparte con "tipo":"bano" y "de":"<nombre exacto del espacio al que pertenece>". Si varios espacios iguales llevan baño (p. ej. «3 habitaciones con baño»), pon el baño con la misma cantidad y su "de".',
        '',
        'ESTRUCTURA u obra (puente, torre, tanque, muro, cubierta, cercha, silo, presa, alcantarilla, valla, muelle, escalera, elemento estructural…):',
        '{"clase":"estructura","titulo":"…","descripcion":"…","vistas":[{"nombre":"ELEVACIÓN","entidades":[…]}],"cantidades":[{"item":"…","valor":"…"}],"notas":["…"],"supuestos":["…"]}',
        '- Coordenadas en metros; x a la derecha, y hacia arriba; cada vista con su propio origen. Dibuja la geometría real a escala con las medidas pedidas, de 2 a 4 vistas (elevación, planta, sección, detalle).',
        '- Entidades: {"t":"linea","capa":"…","p":[[x,y],[x,y]]} | {"t":"poli","capa":"…","p":[[x,y],…],"cerrada":true,"relleno":false} | {"t":"circulo","capa":"…","c":[x,y],"r":r,"relleno":false} | {"t":"arco","capa":"…","c":[x,y],"r":r,"a0":grados,"a1":grados} | {"t":"texto","capa":"TEXTO","p":[x,y],"h":alto,"s":"…"} | {"t":"cota","p1":[x,y],"p2":[x,y],"d":desplazamiento}.',
        '- Capas: ' + Object.keys(CAPAS_IA).join(', ') + '.',
        '- Dibuja solo las partes que forman lo pedido (las estrictamente necesarias para que exista, como apoyos o cimentación, van anotadas en "supuestos").',
        '- Dibuja con detalle de plano real: cada elemento repetido uno por uno (péndolas, barras, varillas, estribos, pilotes, gradas, montantes), espesores reales (contornos cerrados, no líneas sueltas), terreno o apoyos, ejes y niveles. Entre 80 y 260 entidades.',
        '- Incluye cotas de las medidas principales, nombres de las partes y, si aplica, el refuerzo o los perfiles.'
    ].join('\n');
    var actualIA = null;   /* último diseño de estructura hecho con IA: { spec, texto } */
    function backendIA() { try { return (typeof AI_CONFIG !== 'undefined' && AI_CONFIG.backendUrl) ? String(AI_CONFIG.backendUrl).trim() : ''; } catch (e) { return ''; } }
    function extraerJSON(s) {
        s = String(s || '').replace(/```(?:json)?/gi, '');
        var i = s.indexOf('{'), j = s.lastIndexOf('}'); if (i < 0 || j <= i) throw new Error('sin JSON');
        var t = s.slice(i, j + 1);
        try { return JSON.parse(t); } catch (e) { return JSON.parse(t.replace(/,\s*([}\]])/g, '$1').replace(/\/\/[^\n]*/g, '')); }
    }
    function pedirIA(usuario) {
        var url = backendIA(); if (!url) return Promise.reject(new Error('No hay servidor de IA configurado.'));
        var modelo = ''; try { modelo = typeof civixGetSelectedModel === 'function' ? civixGetSelectedModel() : ''; } catch (e) { }
        var cuerpo = { mode: 'chat', provider: 'groq', model: modelo, temperature: 0.2, max_tokens: 6000, messages: [{ role: 'system', content: PROMPT_IA }, { role: 'user', content: usuario }] };
        function una() {
            return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) })
                .then(function (r) { return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok) throw new Error(d && d.error ? d.error : 'HTTP ' + r.status); return extraerJSON(d.content); }); });
        }
        function esperar(ms) { return new Promise(function (ok) { setTimeout(ok, ms); }); }
        /* límite de tokens por minuto del plan gratuito: se espera lo que indique el proveedor y se reintenta;
           si la respuesta no trae JSON válido, se pide de nuevo recalcando el formato */
        function intento(n) {
            return una().catch(function (e) {
                var msg = String(e && e.message || e);
                if (n < 3 && /rate.?limit|tokens per minute|TPM|429|too many/i.test(msg)) {
                    var s = +((msg.match(/try again in\s*([\d.]+)\s*s/i) || [])[1]) || 20;
                    if (opciones.onEspera) opciones.onEspera(Math.ceil(s));
                    return esperar(Math.min(60, s + 1.5) * 1000).then(function () { return intento(n + 1); });
                }
                if (n < 2 && /sin JSON|JSON|Unexpected|token/i.test(msg)) { cuerpo.messages[1].content = usuario + '\n\nIMPORTANTE: responde únicamente con el objeto JSON válido, completo y bien cerrado.'; return intento(n + 1); }
                throw e;
            });
        }
        return intento(0);
    }
    var opciones = {};
    function cl(v, a, b, d) { v = +v; return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; }
    function slug(s) { return norm(s).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40) || 'diseno'; }
    function cargando(texto) { return tarjeta('<div class="civix-md">🛠️ Civix está diseñando lo que pediste: <i>' + esc(texto.length > 140 ? texto.slice(0, 140) + '…' : texto) + '</i><span class="cxpl-cargando"><i></i><i></i><i></i></span></div>'); }

    /* mobiliario según el nombre del espacio cuando la IA no eligió uno */
    var POR_NOMBRE = [
        [/nave|templo|capilla|iglesia|parroquia|salon (?:de actos|comunal|social)|teatro|auditorio|sala de (?:conferencias|eventos|cine)/, 'auditorio'],
        [/bodega|almacen|deposito|nave industrial|hangar|galpon/, 'bodega'], [/cancha|coliseo|polideportivo|gimnasio cubierto|arena/, 'cancha'],
        [/habitacion|dormitorio|alcoba|suite|hospitalizacion/, 'dorm'], [/bano|sanitario|vestier|ducha/, 'banos'],
        [/cocina|cocineta/, 'cocina'], [/comedor|restaurante|cafeteria|cafe|plazoleta de comidas/, 'cafeteria'],
        [/consultorio|oficina|administra|gerencia|direccion|secretaria|coordinacion|enfermeria|estacion/, 'oficina'],
        [/aula|salon de clase|laboratorio|taller/, 'aula'], [/sistemas|computo|informatica/, 'informatica'], [/biblioteca|lectura/, 'lectura'],
        [/recepcion|lobby|vestibulo|sala de espera|espera|admision|urgencias|triage/, 'recepcion'], [/reunion|juntas|conferencia/, 'reuniones'],
        [/gimnasio|gym/, 'gimnasio'], [/piscina/, 'piscina'], [/parqueadero|garaje|cochera|estacionamiento/, 'cochera'], [/local|tienda|almacen comercial|farmacia/, 'local'],
        [/terraza|balcon/, 'terraza'], [/jardin|patio|zona verde/, 'patio'], [/lavanderia/, 'lav'], [/sala|estar/, 'sala']
    ];
    /* ---- control estricto: ¿el usuario nombró este espacio? ---- */
    var SINONIMOS = [
        /dormitori|habitacion|alcoba|cuarto|recamara|suite|hospitalizacion/, /bano|sanitari|aseo|toilet|ducha/, /\bsala\b|estar|living/, /cocina|cocineta/,
        /comedor|restaurante|cafeteria/, /estudio|biblioteca|lectura/, /garaje|cochera|parqueadero|estacionamiento|garage/, /patio|jardin|zona verde/,
        /lavanderia|zona de ropas/, /terraza|balcon/, /oficina|despacho|administra|gerencia|direccion/, /bodega|almacen|deposito|alacena|despensa/,
        /nave|templo|iglesia|capilla/, /cancha|coliseo|polideportivo/, /recepcion|lobby|vestibulo|hall|espera/, /aula|salon de clase|laboratorio|taller/,
        /consultorio|urgencias|quirofano|enfermeria/, /piscina|jacuzzi/, /gimnasio|\bgym\b/, /local|tienda|comercio/, /auditorio|teatro|escenario|tarima/
    ];
    function raices(s) { return norm(s).replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 4 && !/^(para|con|del|las|los|una|unos|unas|cada|piso|nivel|zona|area|espacio|principal|general|publico|publicos|privado)$/.test(w); }).map(function (w) { return w.replace(/(es|s)$/, ''); }); }
    function pedidoNombra(q, nombre) {
        var n = norm(nombre);
        if (raices(nombre).some(function (r) { return r.length >= 4 && q.indexOf(r) >= 0; })) return true;
        return SINONIMOS.some(function (re) { return re.test(n) && re.test(q); });
    }
    /* medidas que el usuario escribió para cada espacio: «consultorio de 4 x 5», «auditorio de 120 m2» */
    function medidasPorNombre(q) {
        var out = [], m;
        var reD = new RegExp('([a-zñ ]{3,60}?)\\s+(?:de|con|que midan?|miden?|:)\\s*' + N_ + '\\s*(?:m|mts|metros)?\\s*(?:x|×|por)\\s*' + N_ + '(?:\\s*(?:m|mts|metros)\\b)?(?!\\s*(?:pisos|niveles|plantas))', 'g');
        var reA = new RegExp('([a-zñ ]{3,60}?)\\s+(?:de|con)\\s*' + N_ + '\\s*(?:m2|m²|mts2|metros cuadrados|metros2)', 'g');
        while ((m = reD.exec(q))) { var t = m[1].split(/,|;|\by\b|\bcon\b/).pop(); if (/lote|terreno|predio|frente|fondo/.test(t)) continue; var a = num(m[2]), b = num(m[3]); if (a > 0 && b > 0 && a <= 80 && b <= 120) out.push({ t: t, w: Math.min(a, b), h: Math.max(a, b), A: a * b }); }
        while ((m = reA.exec(q))) { var t2 = m[1].split(/,|;|\by\b|\bcon\b/).pop(); if (/lote|terreno|predio/.test(t2)) continue; var A = num(m[2]); if (A > 1 && A < 20000) out.push({ t: t2, A: A }); }
        return out;
    }
    /* ¿el usuario escribió «a x b» (o «b por a») con estos valores? */
    function numerosEnPedido(q, a, b) {
        function t(v) { return String(Math.round(v * 100) / 100).replace('.', '[.,]'); }
        return new RegExp('\\b' + t(a) + '\\s*(?:m|mts|metros)?\\s*(?:x|×|por)\\s*' + t(b) + '\\b|\\b' + t(b) + '\\s*(?:m|mts|metros)?\\s*(?:x|×|por)\\s*' + t(a) + '\\b').test(q);
    }
    /* el pedido detalla espacios (dos o más tipos nombrados): entonces solo va lo que se nombró */
    function listaExplicita(q) { return SINONIMOS.filter(function (re) { return re.test(q); }).length >= 2; }
    function tipoPorNombre(nombre) { var s = norm(nombre); for (var i = 0; i < POR_NOMBRE.length; i++) if (POR_NOMBRE[i][0].test(s)) return POR_NOMBRE[i][1]; return 'gen'; }
    /* ---- edificación: especificación → programa por piso → propuesta (distribución + vista previa + modo cine) ---- */
    function edificacionIA(spec, texto) {
        var q = cifras(norm(texto)), dims = medidasLote(q), lote = spec.lote || {};
        var W = dims ? dims.W : cl(lote.frente, 4, 150, 12), L = dims ? dims.L : cl(lote.fondo, 6, 250, 20);
        var lista = Array.isArray(spec.pisos) ? spec.pisos.slice(0, 10) : [];
        if (!lista.length) throw new Error('La especificación no trae pisos.');
        var n = lista.length, pisos = [];   /* índice 1..n (el 0 queda vacío, como en leer()) */
        var estricto = listaExplicita(q), quitados = [], medPedidas = medidasPorNombre(q);
        lista.forEach(function (pi, ip) {
            /* el gran espacio de una planta abierta y lo que el usuario nombró se quedan; lo que la IA inventó, no */
            if (estricto && Array.isArray(pi.espacios)) pi.espacios = pi.espacios.filter(function (e) {
                var ok = e && (pedidoNombra(q, e.nombre) || (e.principal && pedidoNombra(q, (spec.titulo || '') + ' ' + e.nombre)));
                if (!ok && e) quitados.push(String(e.nombre || '').toLowerCase());
                return ok;
            });
            var esp = (Array.isArray(pi.espacios) ? pi.espacios : []).slice(0, 40).map(function (e) {
                var tipo = TIPOS_IA.indexOf(String(e.tipo || '').toLowerCase()) >= 0 ? String(e.tipo).toLowerCase() : 'gen';
                if (tipo === 'gen') tipo = tipoPorNombre(e.nombre);
                /* una habitación o dormitorio siempre se amuebla como dormitorio (con cama), aunque la IA le dé otro tipo */
                var nn = norm(e.nombre || '');
                if (/habitacion|dormitorio|alcoba|recamara|suite/.test(nn) && !/bano|hospitaliza|servicio|util/.test(nn) && tipo !== 'dorm' && tipo !== 'dormp') tipo = 'dorm';
                if (tipo === 'dorm' && /principal|matrimonial|master|suite|padres/.test(nn)) tipo = 'dormp';
                var r_ = { nombre: String(e.nombre || 'ESPACIO').toUpperCase().slice(0, 30), area: cl(e.area, 2, 20000, 15), tipo: tipo, n: Math.round(cl(e.cantidad, 1, 12, 1)), principal: !!e.principal, fondo: norm(e.ubicacion) === 'fondo', de: e.de ? String(e.de) : '' };
                /* medidas que TÚ escribiste para este espacio (mandan sobre lo que estime la IA) */
                /* primero la coincidencia por nombre (más palabras en común gana); los sinónimos solo si no hay ninguna */
                var rn = raices(r_.nombre), mejorM = null, mejorS = 0;
                medPedidas.forEach(function (x) { var rx = raices(x.t), s = rn.filter(function (w) { return rx.indexOf(w) >= 0; }).length; if (s > mejorS) { mejorS = s; mejorM = x; } });
                var mq = mejorM || medPedidas.filter(function (x) { return pedidoNombra(x.t, r_.nombre); })[0];
                if (mq) { r_.area = mq.A; if (mq.w) r_.req = { w: mq.w, h: mq.h }; r_.pedida = mq; }
                else if (+e.ancho > 0 && +e.largo > 0 && numerosEnPedido(q, +e.ancho, +e.largo)) { var w_ = Math.min(+e.ancho, +e.largo), h_ = Math.max(+e.ancho, +e.largo); r_.req = { w: w_, h: h_ }; r_.area = w_ * h_; }   /* solo si esas medidas las escribió el usuario */
                /* garaje sin medidas: el mínimo para estacionar (3.00 × 5.50 m libres por carro; 5.50 × 5.50 para dos) */
                if (tipo === 'cochera' && !r_.req) { var dos = /\b(dos|2)\s+(carros|autos|vehiculos|puestos)|doble/.test(q + ' ' + norm(e.nombre)); r_.req = { w: dos ? 5.5 : 3.0, h: 5.5 }; r_.area = r_.req.w * r_.req.h; r_.reqAuto = 'mínimo para estacionar '; }
                /* dormitorios sin medidas: todos con la misma medida estándar, suficiente para cama, mesas de noche, TV y clóset */
                if ((tipo === 'dorm' || tipo === 'dormp') && !r_.req) { r_.req = { w: 3.2, h: 3.6 }; r_.area = r_.req.w * r_.req.h; r_.reqAuto = 'medida estándar de dormitorio '; }
                return r_;
            }).filter(function (e) { return !/^(PASILLO|CIRCULACI[OÓ]N|ESCALERAS?|CORREDOR)$/.test(e.nombre); });
            /* baño privado: se asocia al espacio al que pertenece (va pegado a él y se entra desde él, no desde el corredor) */
            var noBanos = esp.filter(function (x) { return x.tipo !== 'bano' && x.tipo !== 'banos'; });
            function masParecido(rs) { var m = null, s = 0; noBanos.forEach(function (x) { var rx = raices(x.nombre), k = rs.filter(function (w) { return rx.indexOf(w) >= 0; }).length; if (k > s) { s = k; m = x; } }); return m; }
            esp.forEach(function (b) {
                if (b.tipo !== 'bano') return;
                var priv = /PRIVAD|PROPIO|INTERN|INCORPORAD|INTEGRAD|SUITE/.test(b.nombre) || !!b.de, cand = null;
                if (b.de) cand = masParecido(raices(b.de));
                if (!cand) cand = masParecido(raices(b.nombre.replace(/BA[ÑN]OS?|PRIVADOS?|PROPIOS?|INTERNOS?|INCORPORADOS?|INTEGRADOS?|SUITE/g, ' ')));
                if (!cand && priv) {
                    var mq = q.match(/([a-z ]{3,40}?)\s+con\s+(?:su\s+)?bano/);
                    if (mq) cand = masParecido(raices(mq[1]));
                    if (!cand) cand = noBanos.filter(function (x) { return x.tipo === 'dormp'; })[0] || noBanos.filter(function (x) { return x.tipo === 'dorm'; })[0] || null;
                }
                if (cand) b.privDe = cand.nombre;
            });
            pisos[ip + 1] = { gen: esp, escalera: n > 1, esquema: pi.esquema === 'abierto' ? 'abierto' : 'corredor', apto: false, cochera: 0, local: false };
        });
        /* si el usuario dio las medidas del lote, se usan las suyas y se descartan supuestos de la IA sobre el lote */
        var sup = (Array.isArray(spec.supuestos) ? spec.supuestos : []).filter(function (s) { return !(dims && /lote|terreno|frente|fondo/i.test(String(s))); }).slice(0, 6).join(' ');
        if (!dims) sup = 'Lote de ' + f2(W) + ' × ' + f2(L) + ' m (frente × fondo). ' + sup;
        if (!pisos.some(function (p) { return p && p.gen.length; })) throw new Error('no quedó ningún espacio de los que pediste');
        var P = { W: W, L: L, n: n, pisos: pisos, texto: texto, generico: true, ia: true, estricto: estricto, quitados: quitados, spec: spec, titulo: String(spec.titulo || ''), supuesto: sup.trim() };
        actualIA = null;
        return propuesta(texto, P);
    }

    /* ---- estructura: especificación → modelo CAD (vistas lado a lado, cotas, rótulos) → visor y modo cine ---- */
    function modeloIA(spec) {
        var vistas = (Array.isArray(spec.vistas) ? spec.vistas : []).slice(0, 6), ents = [], x0 = 0, total = 0, alturas = [];
        function P2(p) { return Array.isArray(p) && isFinite(+p[0]) && isFinite(+p[1]) ? [+p[0], +p[1]] : null; }
        var locales = vistas.map(function (v) {
            var out = [];
            (Array.isArray(v.entidades) ? v.entidades : []).forEach(function (e) {
                if (total > 900 || !e) return;
                var capa = String(e.capa || 'CONTORNO').toUpperCase(); if (!CAPAS_IA[capa]) capa = e.t === 'texto' ? 'TEXTO' : e.t === 'cota' ? 'COTAS' : 'CONTORNO';
                if (e.t === 'linea' || e.t === 'poli') {
                    var pts = (Array.isArray(e.p) ? e.p : []).map(P2).filter(Boolean); if (pts.length < 2) return;
                    out.push({ t: 'poly', pts: pts, closed: !!e.cerrada && pts.length > 2, layer: capa, fill: !!e.relleno && pts.length > 2 || (!!e.cerrada && RELLENO_IA[capa] > 0 && pts.length > 2), alpha: RELLENO_IA[capa] || 0.2 });
                } else if (e.t === 'circulo') {
                    var c = P2(e.c), r = +e.r; if (!c || !(r > 0)) return;
                    if (e.relleno) { var q = []; for (var k = 0; k < 24; k++) q.push([c[0] + r * Math.cos(k * Math.PI / 12), c[1] + r * Math.sin(k * Math.PI / 12)]); out.push({ t: 'poly', pts: q, closed: true, layer: capa, fill: true, alpha: 0.6 }); }
                    else out.push({ t: 'circle', c: c, r: r, layer: capa });
                } else if (e.t === 'arco') {
                    var c2 = P2(e.c), r2 = +e.r, a0 = (+e.a0 || 0) * Math.PI / 180, a1 = (+e.a1 || 0) * Math.PI / 180; if (!c2 || !(r2 > 0)) return;
                    if (a1 <= a0) a1 += 2 * Math.PI; var pa = [];
                    for (var j = 0; j <= 18; j++) { var a = a0 + (a1 - a0) * j / 18; pa.push([c2[0] + r2 * Math.cos(a), c2[1] + r2 * Math.sin(a)]); }
                    out.push({ t: 'poly', pts: pa, closed: false, layer: capa });
                } else if (e.t === 'texto') {
                    var pt = P2(e.p); if (!pt || !e.s) return;
                    out.push({ t: 'text', p: pt, h: +e.h > 0 ? +e.h : 0, s: [String(e.s).slice(0, 80)], rot: 0, ha: 0, va: 2, layer: 'TEXTO' });
                } else if (e.t === 'cota') {
                    var p1 = P2(e.p1), p2 = P2(e.p2); if (!p1 || !p2) return;
                    out.push({ t: 'cota', p1: p1, p2: p2, d: +e.d || 0, s: e.s });
                } else return;
                total++;
            });
            return { nombre: String(v.nombre || 'VISTA').toUpperCase().slice(0, 40), ents: out };
        }).filter(function (v) { return v.ents.length; });
        if (!locales.length) throw new Error('La especificación no trae geometría.');
        /* tamaño de referencia para textos y cotas */
        var spanG = 0;
        locales.forEach(function (v) { var bb = CAD.bboxOf(v.ents.filter(function (e) { return e.t !== 'cota'; }).map(function (e) { return e.t === 'text' ? { t: 'point', p: e.p } : e; })) || [0, 0, 1, 1]; v.bb = bb; spanG = Math.max(spanG, bb[2] - bb[0], bb[3] - bb[1]); });
        spanG = spanG || 10;
        var hT = spanG * 0.022, hTit = spanG * 0.035;
        /* acomodo de vistas: lado a lado si caben en una lámina razonable; si son muy alargadas (puentes, muros largos)
           una debajo de otra, para que el dibujo no quede diminuto */
        var sumW = locales.reduce(function (s, v) { return s + (v.bb[2] - v.bb[0]); }, 0), maxH = Math.max.apply(null, locales.map(function (v) { return v.bb[3] - v.bb[1]; })) || 1;
        var apilar = locales.length > 1 && sumW / maxH > 3.2, y0 = 0;
        locales.forEach(function (v, iv) {
            var bb = v.bb, dx = (apilar ? 0 : x0) - bb[0], dy = (apilar ? y0 : 0) - bb[1];
            if (apilar) {   /* la vista siguiente va debajo: el desplazamiento vertical se acumula hacia abajo */
                var hV = bb[3] - bb[1];
                dy = y0 - bb[3];
                y0 -= hV + spanG * 0.22;
            }
            function T(p) { return [p[0] + dx, p[1] + dy, 0]; }
            v.ents.forEach(function (e) {
                if (e.t === 'poly') ents.push({ t: 'poly', pts: e.pts.map(T), closed: e.closed, layer: e.layer, fill: e.fill, alpha: e.alpha });
                else if (e.t === 'circle') ents.push({ t: 'circle', c: T(e.c), r: e.r, layer: e.layer });
                else if (e.t === 'text') ents.push({ t: 'text', p: T(e.p), h: e.h > 0 ? Math.min(e.h, spanG * 0.06) : hT, s: e.s, rot: 0, ha: 0, va: 2, layer: 'TEXTO' });
                else if (e.t === 'cota') {
                    var a = T(e.p1), b = T(e.p2), L = Math.hypot(b[0] - a[0], b[1] - a[1]); if (!(L > 0)) return;
                    var ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L, nx = -uy, ny = ux, d = e.d || spanG * 0.05;
                    var A = [a[0] + nx * d, a[1] + ny * d, 0], B = [b[0] + nx * d, b[1] + ny * d, 0], tk = spanG * 0.008;
                    ents.push({ t: 'poly', pts: [a, A], closed: false, layer: 'COTAS' }, { t: 'poly', pts: [b, B], closed: false, layer: 'COTAS' }, { t: 'poly', pts: [A, B], closed: false, layer: 'COTAS' });
                    [A, B].forEach(function (P_) { ents.push({ t: 'poly', pts: [[P_[0] - (ux + nx) * tk, P_[1] - (uy + ny) * tk, 0], [P_[0] + (ux + nx) * tk, P_[1] + (uy + ny) * tk, 0]], closed: false, layer: 'COTAS' }); });
                    var ang = Math.atan2(uy, ux); if (ang > Math.PI / 2 || ang < -Math.PI / 2) ang += Math.PI;
                    ents.push({ t: 'text', p: [(A[0] + B[0]) / 2 + nx * hT * 0.8, (A[1] + B[1]) / 2 + ny * hT * 0.8, 0], h: hT, s: [e.s ? String(e.s) : f2(L) + ' m'], rot: ang, ha: 1, va: 2, layer: 'COTAS' });
                }
            });
            var w = bb[2] - bb[0], h = bb[3] - bb[1], xt = apilar ? 0 : x0, yt = (apilar ? dy + bb[1] : 0) - spanG * 0.09;
            ents.push({ t: 'text', p: [xt + w / 2, yt, 0], h: hTit, s: [v.nombre], rot: 0, ha: 1, va: 2, layer: 'TEXTO' });
            ents.push({ t: 'poly', pts: [[xt, yt - spanG * 0.03, 0], [xt + w, yt - spanG * 0.03, 0]], closed: false, layer: 'TEXTO' });
            alturas.push(h);
            x0 += w + Math.max(spanG * 0.18, 1);
        });
        var layers = {}; Object.keys(CAPAS_IA).forEach(function (k) { layers[k] = { name: k, aci: CAPAS_IA[k], off: false }; });
        ents = limpiarSolapes(ents);   /* la IA a veces repite trazos: ninguna línea encima de otra */
        ents.forEach(function (e) { e.aci = CAPAS_IA[e.layer] || 7; });
        var m = { ents: ents, layers: layers, blocks: {}, units: 6, __limpio: true }; m.bbox = CAD.bboxOf(ents);
        return m;
    }
    function estructuraIA(spec, texto) {
        var model = modeloIA(spec), titulo = String(spec.titulo || 'Diseño').slice(0, 80), nombre = slug(titulo);
        actualIA = { spec: spec, texto: texto }; actual = null;
        var lista = function (arr) { return (Array.isArray(arr) ? arr : []).slice(0, 10).map(function (s) { return '<li>' + esc(String(s)) + '</li>'; }).join(''); };
        var cant = (Array.isArray(spec.cantidades) ? spec.cantidades : []).slice(0, 14);
        var pedidas = medidasDelPedido(texto);
        var c = tarjeta('<div class="civix-md">📐 <b>' + esc(titulo) + '</b>' + (spec.descripcion ? '<br><small>' + esc(String(spec.descripcion).slice(0, 400)) + '</small>' : '') + '</div>' +
            (pedidas.length ? '<div class="cxpl-cumple"><b>Medidas que pediste</b><ul>' + pedidas.map(function (v) { var mal = (spec._faltan || []).indexOf(f2(v) + ' m') >= 0; return '<li class="' + (mal ? 'aj' : 'si') + '">' + (mal ? '≈ ' : '✓ ') + f2(v) + ' m' + (mal ? ' — la IA no logró respetarla; pídelo de nuevo indicando a qué elemento corresponde' : ' — presente en el diseño') + '</li>'; }).join('') + '</ul></div>' : '') +
            '<div class="cx-box cxpl-ia-box"></div>' +
            (cant.length ? '<div class="cxpl-tbl-wrap"><table class="cxpl-tbl"><thead><tr><th>Cantidad</th><th>Valor</th></tr></thead><tbody>' + cant.map(function (x, i) { return '<tr style="--i:' + i + '"><td>' + esc(String(x.item || '')) + '</td><td>' + esc(String(x.valor || '')) + '</td></tr>'; }).join('') + '</tbody></table></div>' : '') +
            ((spec.notas && spec.notas.length) ? '<div class="cxpl-cumple"><b>Notas</b><ul>' + lista(spec.notas) + '</ul></div>' : '') +
            ((spec.supuestos && spec.supuestos.length) ? '<p class="cxpl-sup">ℹ️ Supuestos: ' + esc((spec.supuestos || []).slice(0, 6).join(' · ')) + '</p>' : '') +
            '<p class="cxpl-q">Puedes pedir cambios en el chat: <i>«hazlo de 3 luces», «cambia la altura a 12 m», «agrega la vista en planta»</i>.</p>' +
            '<p class="cxpl-nota">Esquema generado a partir de tu pedido. No reemplaza el diseño y cálculo firmados por un profesional ni la revisión de la norma (NSR-10).</p>');
        if (!c) return false;
        global.__cxCineAuto = { hasta: Date.now() + 5000 };   /* el plano se presenta con el modo cine */
        CAD.viewer(c.querySelector('.cxpl-ia-box'), model, { name: nombre, titulo: nombre });
        historial(texto, 'Diseñé «' + titulo + '» (' + model.ents.length + ' entidades en ' + (spec.vistas || []).length + ' vistas) según el pedido.');
        return true;
    }
    function despacharIA(spec, texto) {
        var clase = norm(spec && spec.clase);
        if (clase === 'edificacion') return edificacionIA(spec, texto);
        if (clase === 'estructura' || (spec && spec.vistas)) return estructuraIA(spec, texto);
        if (spec && spec.pisos) return edificacionIA(spec, texto);
        throw new Error('Respuesta sin clase reconocible.');
    }
    /* ---- control de medidas: lo que el usuario escribió debe aparecer en el diseño ---- */
    function medidasDelPedido(texto) {
        var q = cifras(norm(texto)).replace(/lote[^.;]*?\d+(?:[.,]\d+)?\s*(?:m|mts|metros)?\s*(?:x|×|por)\s*\d+(?:[.,]\d+)?/g, ' '), out = [], m;
        var re = /(\d+(?:[.,]\d+)?)\s*(?:m|mts|metros|cm|centimetros|mm|milimetros)\b(?!\s*(?:2|²|3|³|cuadrad|cubic))/g;
        while ((m = re.exec(q))) {
            var v = num(m[1]), u = m[0].replace(m[1], '').trim();
            if (/^c/.test(u)) v /= 100; else if (/^mm|^mili/.test(u)) v /= 1000;
            if (v >= 0.05 && v <= 2000 && out.indexOf(v) < 0) out.push(v);
        }
        /* «4 x 5 m», «30 x 40 cm»: ambos valores */
        var re2 = /(\d+(?:[.,]\d+)?)\s*(?:x|×|por)\s*(\d+(?:[.,]\d+)?)\s*(m|mts|metros|cm|mm)\b/g;
        while ((m = re2.exec(q))) { var k = /^c/.test(m[3]) ? 0.01 : /^mm/.test(m[3]) ? 0.001 : 1; [num(m[1]) * k, num(m[2]) * k].forEach(function (v) { if (v >= 0.05 && out.indexOf(v) < 0) out.push(v); }); }
        return out;
    }
    function medidasDeSpec(spec) {
        var vals = [];
        function P(p) { return Array.isArray(p) && isFinite(+p[0]) && isFinite(+p[1]) ? [+p[0], +p[1]] : null; }
        (spec.vistas || []).forEach(function (v) {
            var xs = [], ys = [];
            (v.entidades || []).forEach(function (e) {
                if (!e) return;
                if (e.t === 'cota') { var a = P(e.p1), b = P(e.p2); if (a && b) vals.push(Math.hypot(b[0] - a[0], b[1] - a[1])); }
                if (e.t === 'texto' && e.s) (String(e.s).match(/\d+(?:[.,]\d+)?/g) || []).forEach(function (t) { vals.push(num(t)); vals.push(num(t) / 100); });
                if (e.t === 'circulo' && +e.r > 0) vals.push(2 * e.r, +e.r);
                if ((e.t === 'linea' || e.t === 'poli') && Array.isArray(e.p)) {
                    var pts = e.p.map(P).filter(Boolean);
                    for (var i = 1; i < pts.length; i++) vals.push(Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
                    pts.forEach(function (p) { xs.push(p[0]); ys.push(p[1]); });
                }
            });
            if (xs.length) { vals.push(Math.max.apply(null, xs) - Math.min.apply(null, xs), Math.max.apply(null, ys) - Math.min.apply(null, ys)); }
        });
        (spec.cantidades || []).forEach(function (c) { (String(c.valor || '').match(/\d+(?:[.,]\d+)?/g) || []).forEach(function (t) { vals.push(num(t)); }); });
        return vals.filter(function (v) { return isFinite(v) && v > 0; });
    }
    function verificarMedidas(spec, texto) {
        var faltan = [];
        if (norm(spec && spec.clase) === 'edificacion' || (spec && spec.pisos)) {
            var mp = cifras(norm(texto)).match(/(\d+)\s*(?:pisos|niveles|plantas)/);
            if (mp && Array.isArray(spec.pisos) && spec.pisos.length !== +mp[1]) faltan.push(mp[1] + ' pisos (la respuesta trae ' + spec.pisos.length + ')');
            return faltan;
        }
        var hay = medidasDeSpec(spec);
        medidasDelPedido(texto).forEach(function (v) {
            if (!hay.some(function (x) { return Math.abs(x - v) <= Math.max(0.02, v * 0.02); })) faltan.push(f2(v) + ' m');
        });
        return faltan;
    }
    /* diseña con IA exactamente lo pedido. Si la IA no responde NO se inventa un diseño genérico: se avisa y se
       ofrece reintentar (solo un elemento que un generador de Civix calcula puede resolverse localmente). */
    function disenarIA(texto, previo, respaldo) {
        var aviso = cargando(texto);
        opciones.onEspera = function (s) { var m_ = aviso && aviso.querySelector('.civix-md'); if (m_ && !m_.querySelector('.cxpl-espera')) m_.insertAdjacentHTML('beforeend', '<br><small class="cxpl-espera">⏳ La IA llegó a su límite por minuto; reintento en ~' + s + ' s…</small>'); };
        var usuario = previo ? 'Diseño actual (JSON):\n' + JSON.stringify(previo) + '\n\nModifícalo según este pedido del usuario: ' + texto + '\nDevuelve el JSON completo actualizado, con el mismo formato.' : 'Pedido del usuario: ' + texto;
        function fallo(motivo) {
            if (respaldo && respaldo()) return;
            var c = tarjeta('<div class="civix-md">⚠ No pude diseñar esto con la IA (' + esc(motivo) + '). No te muestro un diseño genérico para no cambiar lo que pediste.</div>' +
                '<div class="cxpl-acts"><button type="button" class="cxpl-btn ok" data-cxpl-re>↻ Reintentar</button></div>');
            if (c) c.addEventListener('click', function (e) { var b = e.target.closest('[data-cxpl-re]'); if (!b) return; b.disabled = true; disenarIA(texto, previo, respaldo); });
        }
        pedirIA(usuario).then(function (spec) {
            /* si el diseño no respeta las medidas pedidas, se le devuelve a la IA con lo que falta (una corrección) */
            var faltan = previo ? [] : verificarMedidas(spec, texto);
            if (!faltan.length) return spec;
            var m_ = aviso && aviso.querySelector('.civix-md');
            if (m_) m_.insertAdjacentHTML('beforeend', '<br><small>📏 Corrigiendo medidas que no coincidían con tu pedido: ' + esc(faltan.join(', ')) + '…</small>');
            return pedirIA(usuario + '\n\nTu respuesta anterior NO respetaba estas medidas del pedido: ' + faltan.join(', ') + '. Corrige la geometría y las cotas para que coincidan EXACTAMENTE con lo pedido (mismos valores en metros). Devuelve el JSON completo.')
                .then(function (s2) { var f2_ = verificarMedidas(s2, texto); s2._faltan = f2_; return s2; })
                .catch(function () { spec._faltan = faltan; return spec; });
        }).then(function (spec) {
            if (aviso) aviso.remove();
            try { despacharIA(spec, texto); }
            catch (e) { fallo('la especificación no se pudo dibujar: ' + e.message); }
        }).catch(function (e) {
            if (aviso) aviso.remove();
            fallo(String(e && e.message || e).slice(0, 200));
        });
        return true;
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
            '<p class="cxpl-nota">En este modo Civix genera planos y diseños. Para dudas de teoría vuelve a «Explicar».</p>');
        if (c) c.classList.add('cxpl-bienv');   /* sin prompts predeterminados: el usuario escribe su propio pedido */
    }
    doc.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('#civixModos [data-modo]'); if (!b) return;
        if (b.getAttribute('data-modo') === 'planos' && !sinBienvenida) {
            var ult = chat() && chat().lastElementChild;
            if (!(ult && ult.classList && ult.classList.contains('cxpl-bienv'))) setTimeout(bienvenida, 0);
        }
    });
    function guia(texto, motivo) {
        tarjeta('<div class="civix-md">📐 ' + esc(motivo) + '</div>');
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
    /* ¿El pedido es algo que las reglas locales resuelven tal cual? Si no, lo diseña la IA con la especificación del usuario. */
    var MAS_GRANDE = /(colgante|atirantad|en arco|\barco\b|tanque|torre|silo|presa|represa|alcantarilla|box ?culvert|tunel|galpon|nave|bodega|cubierta|domo|cupula|chimenea|antena|valla|muelle|pasarela|estadio|coliseo|graderia|tribuna|hangar|invernadero|tensoestructura|carpa|marquesina|iglesia|templo|hospital|hotel|colegio|escuela|universidad|centro comercial|planta de tratamiento|canal|acueducto|reservorio|dique|gavion|parqueadero|mercado|teatro|museo|terminal|aeropuerto|fabrica|industrial|cancha|polideportivo|cerramiento|reja|tribuna|caseta|kiosco|pergola|mirador|faro)/;
    var RES_LOCAL = /(\bcasa\b|vivienda|apartamentos?|departamentos?|apartaestudio|unifamiliar|bifamiliar|multifamiliar|edificio (?:residencial|de (?:apartamentos|departamentos|vivienda)))/;
    var NO_RES = /(hotel|hostal|motel|hospital|clinica|centro de salud|iglesia|templo|capilla|bodega|galpon|nave industrial|industrial|fabrica|centro comercial|restaurante|colegio|escuela|universidad|oficinas|estadio|coliseo|mercado|teatro|museo|biblioteca|cine\b|auditorio|terminal|aeropuerto|guarderia|jardin infantil|polideportivo|supermercado|banco\b|alcaldia|estacion)/;
    function esCambio(q) { return /^(cambia|cambiar|modifica|agrega|anade|quita|elimina|saca|hazl[oa]|ponle|pon\b|que sea|que tenga|ahora|aumenta|reduce|disminuye|amplia|mejor|tambien|en vez|sube|baja|alarga|acorta)/.test(q); }
    function modoPlanos(texto, q) {
        try {
            var hayIA = !!backendIA() && typeof fetch === 'function';
            if (actual && actual.estado === 'aprobado' && /^(dibujalo|dibujala|dibuja(?:lo)?|modo cine|efecto (?:de )?cine|dibuja el plano|hazlo|dale)\b/.test(q)) {
                tarjeta('<div class="civix-md">🎬 Dibujando las ' + actual.Pl.n + ' plantas en modo cine…</div>');
                return cine(actual.Pl);
            }
            if (actual && actual.estado === 'propuesta' && /^(si|ok|apruebo|aprobado|de acuerdo|listo|perfecto)\b/.test(q)) { aprobar(); return true; }
            var tieneLote = !!medidasLote(cifras(q));
            /* cambios sobre lo último que se diseñó */
            if (hayIA && actualIA && esCambio(q)) return disenarIA(texto, actualIA.spec);
            if (actual && !tieneLote) {
                if (hayIA && actual.P && actual.P.ia && (esCambio(q) || !MAS_GRANDE.test(q))) return disenarIA(texto, actual.P.spec);
                if (!(actual.P && actual.P.ia)) { var P2 = cambios(q); if (P2) return propuesta(texto, P2); }
            }
            /* 1) elemento estructural simple que un generador de Civix CAD calcula (zapata, viga, columna…) */
            if (esElemento(q) && !MAS_GRANDE.test(q)) {
                if (elementoCAD(texto, q)) return true;
                if (hayIA) return disenarIA(texto, null, null);
            }
            /* 2) vivienda (casa, apartamentos): reglas de distribución que respetan lo pedido */
            if (RES_LOCAL.test(q) && !NO_RES.test(q)) {
                /* si nombraste los espacios, va SOLO lo que nombraste (ruta estricta); la plantilla de vivienda
                   queda para pedidos sin detalle, y se avisa que es una propuesta típica */
                if (hayIA && listaExplicita(q)) return disenarIA(texto, null, null);
                var P = leer(texto);
                if (P.error) return guia(texto, P.error);
                if (!listaExplicita(q)) P.supuesto = ((P.supuesto ? P.supuesto + ' ' : '') + 'No nombraste los espacios, así que te propongo un programa típico de vivienda. Escribe cuáles quieres (por ejemplo «3 habitaciones, 2 baños, sala, cocina») y lo hago exactamente así.').trim();
                return propuesta(texto, P);
            }
            /* 3) cualquier otra edificación u obra: la IA la especifica tal cual la pidió el usuario y aquí se dibuja */
            var pareceDiseno = tieneLote || MAS_GRANDE.test(q) || ELEMENTO.test(q) || /(piso|nivel|planta|lote|terreno|dise|dibuj|plano|detalle|corte|elevacion|esquema|haz|hazme|genera|crea|estructura|obra|construccion|proyecto)/.test(q);
            if (pareceDiseno && hayIA) {
                return disenarIA(texto, null, function () {
                    /* respaldo sin IA: solo un elemento que un generador calcula; nunca una distribución genérica */
                    return esElemento(q) && elementoCAD(texto, q);
                });
            }
            if (pareceDiseno) {
                if (esElemento(q) && elementoCAD(texto, q)) return true;
                var P3 = leer(texto); if (P3.error) return guia(texto, P3.error); return propuesta(texto, P3);
            }
            return guia(texto, 'En el modo Planos diseño cualquier edificación u obra: describe qué es, sus medidas principales y qué debe tener (por ejemplo, pisos y espacios de un edificio, o luces y alturas de un puente).');
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
        zoomCine(ov);
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

    CAD.planosArq = { leer: leer, plan: plan, modelo: modelo, tabla: tabla, cine: function () { return actual && cine(actual.Pl); }, actual: function () { return actual; },
        /* geometría por piso para el visor 3D: ejecuta el dibujo (sin salida) y devuelve lo que dejó en cada piso */
        geom3d: function (Pl) { modelo(Pl); return Pl.pisos.map(function (pi) { return { n: pi.n, rooms: pi.rooms, g: pi._g3 || null }; }); } };
})(typeof window !== 'undefined' ? window : globalThis);
