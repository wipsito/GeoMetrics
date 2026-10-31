/**
 * Civix — apartado «Planos y CAD»: curvas de nivel (aleatorias / puntos / archivo),
 * diseño estructural con DXF (viga, columna, zapata, muro) y prompts listos para la IA.
 * Lo que se calcula aquí corre en el navegador: no consume tokens.
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || !global.document || CAD.__panel) return; CAD.__panel = true;
    var doc = document;
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m]; }); }
    function $(id) { return doc.getElementById(id); }

    var CATS = ['Estructuras', 'Cimentaciones y geotecnia', 'Vías', 'Hidráulica', 'Edificaciones', 'Topografía'];
    var PROMPTS = [
        { c: 0, ico: '🏢', t: 'Pórtico plano 2 pisos', d: 'Geometría y cargas', q: 'Dibuja un pórtico plano de 2 pisos y 3 vanos de 5 m (altura 3 m por piso) con ejes, secciones de vigas 30x50 y columnas 40x40, nudos numerados y cargas distribuidas. Entrégame el DXF con capas y cotas.' },
        { c: 0, ico: '🌉', t: 'Cercha Howe / Pratt', d: 'Con nodos y cotas', q: 'Diseña una cercha tipo Pratt de 15 m de luz y 2.5 m de altura con 6 paneles. Da longitudes de barras, indica diagonales a tracción y entrégame un DXF con nodos numerados y cotas.' },
        { c: 0, ico: '🏗️', t: 'Losa nervada', d: 'Planta y corte', q: 'Diseña una losa aligerada con nervios en una dirección para un paño de 5 x 6 m: altura total, ancho de nervios, separación, acero y casetón. Entrégame un DXF con planta y corte del nervio.' },
        { c: 0, ico: '🌁', t: 'Puente losa simple', d: 'Sección y elevación', q: 'Dibuja un puente de losa maciza de una luz de 8 m, ancho de calzada 7.2 m con andenes de 0.8 m: sección transversal y elevación con apoyos y cotas. Entrégame el DXF.' },
        { c: 0, ico: '🔩', t: 'Detalle de conexión metálica', d: 'Placa base', q: 'Dibuja el detalle de una placa base de columna metálica HEB 200 sobre pedestal de concreto con 4 pernos de anclaje, planta y elevación acotadas. Entrégame el DXF.' },
        { c: 1, ico: '🧱', t: 'Planta de cimentación', d: 'Zapatas y amarres', q: 'Dibuja la planta de cimentación de una edificación de 3 x 3 ejes separados 5 m con zapatas aisladas de 2x2 m, columnas 40x40 y vigas de amarre 30x30. Entrégame el DXF con ejes y cotas.' },
        { c: 1, ico: '🧰', t: 'Zapata combinada', d: 'Dos columnas', q: 'Diseña una zapata combinada para dos columnas de 600 kN y 900 kN separadas 4 m, qadm 150 kPa. Da dimensiones y entrégame un DXF con planta, corte y acero.' },
        { c: 1, ico: '📍', t: 'Pilotes y dado', d: 'Grupo de 4', q: 'Dibuja un dado de cimentación sobre 4 pilotes de 0.40 m de diámetro y 12 m de longitud, separación 1.2 m, con planta y elevación acotadas. Entrégame el DXF.' },
        { c: 1, ico: '⛰️', t: 'Talud y estabilidad', d: 'Sección con estratos', q: 'Dibuja la sección de un talud de 8 m de altura con inclinación 1.5H:1V sobre dos estratos de suelo, con nivel freático. Entrégame el DXF con capas por estrato y cotas.' },
        { c: 1, ico: '🧪', t: 'Perfil estratigráfico', d: 'Sondeo de suelos', q: 'Dibuja un perfil estratigráfico de un sondeo de 10 m con 4 estratos (arcilla, arena limosa, grava, roca meteorizada), nivel freático a 2.5 m y sombreado por tipo de suelo. Entrégame el DXF.' },
        { c: 2, ico: '🛣️', t: 'Sección transversal de vía', d: 'Bombeo y cunetas', q: 'Dibuja la sección transversal típica de una vía rural de dos carriles de 3.0 m, bermas de 0.5 m, bombeo 2 %, cunetas triangulares y taludes 1.5:1. Entrégame el DXF acotado.' },
        { c: 2, ico: '🔄', t: 'Intersección en T', d: 'Radios y carriles', q: 'Dibuja en planta una intersección en T entre una vía principal de 2 carriles de 3.5 m y una secundaria de 2 carriles de 3.0 m con radios de giro de 12 m, ejes y bordes. Entrégame el DXF.' },
        { c: 2, ico: '📈', t: 'Perfil longitudinal', d: 'Rasante y terreno', q: 'Dibuja un perfil longitudinal de 500 m con terreno natural ondulado, rasante con dos pendientes (+3 % y -2 %) y curva vertical parabólica de 80 m, con abscisas cada 20 m. Entrégame el DXF.' },
        { c: 3, ico: '💧', t: 'Canal rectangular', d: 'Sección hidráulica', q: 'Dibuja y calcula un canal rectangular de concreto para Q = 1.2 m³/s, pendiente 0.2 %, n = 0.014. Da dimensiones y entrégame un DXF de la sección con borde libre.' },
        { c: 3, ico: '🕳️', t: 'Alcantarilla de cajón', d: 'Corte y planta', q: 'Dibuja una alcantarilla de cajón de 2 x 2 m bajo un terraplén de 3 m con aletas y cabezotes: corte longitudinal y planta con cotas. Entrégame el DXF.' },
        { c: 3, ico: '🚰', t: 'Red de acueducto', d: 'Esquema con nudos', q: 'Dibuja el esquema de una red de acueducto en malla de 6 nudos con tuberías numeradas, diámetros y longitudes, tanque de abastecimiento y cotas de nivel. Entrégame el DXF.' },
        { c: 4, ico: '🏠', t: 'Planta de vivienda', d: 'Muros, puertas, ventanas', q: 'Dibuja la planta arquitectónica de una vivienda de 1 piso de 6 x 8 m con sala-comedor, cocina, 2 alcobas y baño, muros, puertas y ventanas. Entrégame el DXF con capas y cotas.' },
        { c: 4, ico: '🏘️', t: 'Fachada y corte', d: 'Elevación acotada', q: 'Dibuja la fachada principal y un corte transversal de una vivienda de 2 pisos con altura de entrepiso 2.60 m, cubierta inclinada 25 % y ventanas, con niveles de piso. Entrégame el DXF.' },
        { c: 4, ico: '📑', t: 'Cuadro de áreas', d: 'Planta con áreas', q: 'Dibuja la planta de un apartamento de 60 m² con tres espacios y un cuadro de áreas por recinto (en el mismo DXF), con muros, puertas y cotas.' },
        { c: 4, ico: '🛗', t: 'Escalera y ducto', d: 'Planta de circulación', q: 'Dibuja la planta de un núcleo de circulación con escalera en U de 1.2 m de ancho, descanso y ducto de ascensor de 1.8 x 2.0 m, con muros y cotas. Entrégame el DXF.' },
        { c: 5, ico: '🗺️', t: 'Plano de lote', d: 'Linderos y áreas', q: 'Dibuja el plano de un lote de forma irregular con 5 linderos (da coordenadas ficticias), cuadro de rumbos, distancias y área calculada, con norte. Entrégame el DXF.' },
        { c: 5, ico: '📏', t: 'Poligonal cerrada', d: 'Cuadro de coordenadas', q: 'Dibuja una poligonal cerrada de 5 vértices con ángulos, distancias, azimuts y cuadro de coordenadas, indicando el error de cierre. Entrégame el DXF.' },
        { c: 5, ico: '🏔️', t: 'Perfil de terreno', d: 'Abscisas y cotas', q: 'Dibuja el perfil de un terreno a partir de estas abscisas y cotas (0=100, 20=101.5, 40=103, 60=102, 80=104, 100=105.5) con exageración vertical 5x. Entrégame el DXF.' }
    ];
    var REFINE = [
        ['＋ Cotas', 'Al DXF anterior agrégale cotas en una capa COTAS y corrige lo que haga falta. Entrégame el DXF completo.'],
        ['＋ Cuadro de áreas', 'Al plano anterior agrégale un cuadro de áreas/cantidades en una capa TEXTOS. Entrégame el DXF completo.'],
        ['＋ Cuadro de acero', 'Agrégale al diseño anterior un cuadro de acero (barra, cantidad, longitud, peso) y entrégame el DXF completo.'],
        ['＋ Norte y escala', 'Agrégale al plano anterior flecha de norte, escala gráfica y rótulo. Entrégame el DXF completo.'],
        ['↔ Más compacto', 'Reduce el DXF anterior: menos detalle, solo geometría esencial y capas ordenadas, para que quepa en pocos tokens.'],
        ['🔍 Revisar errores', 'Revisa el DXF anterior: unidades, capas, geometrías sin cerrar o fuera de escala. Dime qué corregir y entrégalo corregido.']
    ];

    var STRUCT = {
        viga: {
            nombre: 'Viga simplemente apoyada', ico: '➖', fields: [
                ['L', 'Luz L (m)', 6, 1, 20, 0.1], ['b', 'Ancho b (mm)', 300, 150, 800, 10], ['h', 'Altura h (mm)', 500, 200, 1200, 10], ['wD', 'Carga muerta (kN/m)', 12, 0, 200, 0.5], ['wL', 'Carga viva (kN/m)', 8, 0, 200, 0.5],
                ['fc', "f′c (MPa)", 21, 17, 50, 'sel:17,21,24,28,35,42'], ['fy', 'fy (MPa)', 420, 240, 520, 'sel:240,420,500'], ['rec', 'Recubrimiento (mm)', 40, 20, 75, 5]]
        },
        columna: {
            nombre: 'Columna rectangular', ico: '▮', fields: [
                ['Pu', 'Carga axial Pu (kN)', 1500, 100, 9000, 10], ['b', 'Ancho b (mm)', 400, 250, 1000, 10], ['h', 'Alto h (mm)', 400, 250, 1000, 10], ['Lu', 'Altura libre (m)', 3, 2, 8, 0.1],
                ['fc', "f′c (MPa)", 28, 17, 50, 'sel:17,21,24,28,35,42'], ['fy', 'fy (MPa)', 420, 240, 520, 'sel:240,420,500'], ['rec', 'Recubrimiento (mm)', 40, 25, 75, 5]]
        },
        zapata: {
            nombre: 'Zapata aislada', ico: '⬛', fields: [
                ['P', 'Carga de servicio P (kN)', 800, 50, 6000, 10], ['qadm', 'Capacidad portante qadm (kPa)', 150, 50, 600, 5], ['c1', 'Columna c1 (mm)', 400, 200, 1000, 10], ['c2', 'Columna c2 (mm)', 400, 200, 1000, 10],
                ['fc', "f′c (MPa)", 21, 17, 50, 'sel:17,21,24,28,35'], ['fy', 'fy (MPa)', 420, 240, 520, 'sel:240,420,500'], ['Df', 'Profundidad Df (m)', 1.5, 0.5, 5, 0.1]]
        },
        losa: {
            nombre: 'Losa maciza (1 dirección)', ico: '▭', fields: [
                ['Lx', 'Luz corta Lx (m)', 4, 1.5, 7, 0.1], ['Ly', 'Luz larga Ly (m)', 7, 2, 15, 0.1], ['wL', 'Carga viva (kN/m²)', 2, 0.5, 15, 0.5], ['wDextra', 'Acabados / muros (kN/m²)', 1.5, 0, 10, 0.25],
                ['fc', "f′c (MPa)", 21, 17, 50, 'sel:17,21,24,28,35'], ['fy', 'fy (MPa)', 420, 240, 520, 'sel:240,420,500'], ['rec', 'Recubrimiento (mm)', 20, 15, 50, 5]]
        },
        escalera: {
            nombre: 'Escalera de concreto', ico: '🪜', fields: [
                ['H', 'Altura a salvar H (m)', 3, 1.5, 6, 0.05], ['b', 'Ancho b (m)', 1.2, 0.8, 3, 0.05], ['huella', 'Huella (cm)', 28, 25, 35, 1], ['wL', 'Carga viva (kN/m²)', 3, 2, 6, 0.5], ['acab', 'Acabados (kN/m²)', 1.5, 0, 5, 0.25],
                ['fc', "f′c (MPa)", 21, 17, 50, 'sel:17,21,24,28,35'], ['fy', 'fy (MPa)', 420, 240, 520, 'sel:240,420,500']]
        },
        columnaC: {
            nombre: 'Columna circular (espiral)', ico: '⭕', fields: [
                ['Pu', 'Carga axial Pu (kN)', 1800, 200, 9000, 10], ['D', 'Diámetro D (mm)', 450, 300, 1000, 10], ['Lu', 'Altura libre (m)', 3, 2, 8, 0.1],
                ['fc', "f′c (MPa)", 28, 17, 50, 'sel:17,21,24,28,35,42'], ['fy', 'fy (MPa)', 420, 240, 520, 'sel:240,420,500'], ['rec', 'Recubrimiento (mm)', 40, 25, 75, 5]]
        },
        cercha: {
            nombre: 'Cercha Warren (nudos)', ico: '🔺', fields: [
                ['L', 'Luz L (m)', 12, 3, 40, 0.5], ['h', 'Altura h (m)', 2, 0.5, 8, 0.1], ['n', 'N.º de paneles', 6, 2, 14, 1], ['P', 'Carga P por nudo (kN)', 10, 1, 500, 1], ['fy', 'fy acero (MPa)', 250, 240, 420, 'sel:250,345,420']]
        },
        muro: {
            nombre: 'Muro de contención en voladizo', ico: '🧱', fields: [
                ['H', 'Altura del vástago H (m)', 3, 1.5, 7, 0.1], ['gamma', 'Peso unitario del relleno (kN/m³)', 18, 14, 22, 0.5], ['phi', 'Ángulo de fricción φ (°)', 30, 20, 42, 1], ['qadm', 'Capacidad portante qadm (kPa)', 150, 50, 600, 5],
                ['fc', "f′c (MPa)", 21, 17, 50, 'sel:17,21,24,28,35'], ['fy', 'fy (MPa)', 420, 240, 520, 'sel:240,420,500']]
        }
    };

    function build() {
        if ($('civixViewCad')) return;
        var her = $('civixViewHerramientas'), nav = $('civixNavTools'); if (!her || !nav) return;
        var btn = el('button', 'civix-nav-item', '<span class="civix-nav-ico">📐</span> Planos y CAD'); btn.type = 'button'; btn.id = 'civixNavCad'; btn.setAttribute('data-civix-nav', 'cad');
        nav.parentNode.insertBefore(btn, nav.nextSibling);
        var panel = el('div', 'civix-view-panel cxp'); panel.id = 'civixViewCad'; panel.hidden = true;
        panel.innerHTML =
            '<div class="civix-view-head"><h3>📐 Planos y CAD</h3><p>Genera curvas de nivel y diseños estructurales con su archivo <b>DXF</b> (AutoCAD / Civil 3D / LibreCAD). Lo calculado aquí corre en tu navegador y <b>no gasta tokens</b> de IA.</p></div>' +
            '<div class="cxp-tabs" role="tablist"><button class="cxp-tab on" data-t="curvas">🗺️ Curvas de nivel</button><button class="cxp-tab" data-t="struct">🏗️ Diseño estructural</button><button class="cxp-tab" data-t="ia">🤖 Planos con IA</button><button class="cxp-tab" data-t="conv">🔄 Convertidor DWG ⇄ DXF</button></div>' +
            '<section class="cxp-sec" data-s="curvas"></section><section class="cxp-sec" data-s="struct" hidden></section><section class="cxp-sec" data-s="ia" hidden></section><section class="cxp-sec" data-s="conv" hidden></section>';
        her.parentNode.insertBefore(panel, her.nextSibling);
        panel.querySelectorAll('.cxp-tab').forEach(function (t) { t.addEventListener('click', function () { panel.querySelectorAll('.cxp-tab').forEach(function (x) { x.classList.toggle('on', x === t); }); panel.querySelectorAll('.cxp-sec').forEach(function (s) { s.hidden = s.getAttribute('data-s') !== t.getAttribute('data-t'); }); if (t.getAttribute('data-t') === 'conv' && CAD.__convAct) CAD.__convAct(); }); });
        btn.addEventListener('click', function () { if (global.civixShowView) global.civixShowView('cad'); });
        buildCurvas(panel.querySelector('[data-s=curvas]')); buildStruct(panel.querySelector('[data-s=struct]')); buildIA(panel.querySelector('[data-s=ia]')); buildConv(panel.querySelector('[data-s=conv]')); addToolCard(panel);
        var orig = global.civixShowView;
        if (typeof orig === 'function' && !orig.__cx) { var w = function (name) { var r = orig.apply(this, arguments); panel.hidden = (name || 'chat') !== 'cad'; btn.classList.toggle('active', name === 'cad'); return r; }; w.__cx = true; global.civixShowView = w; }
    }

    function field(id, label, val, min, max, step, cls) {
        var w = el('label', 'cxp-f' + (cls ? ' ' + cls : '')), inp;
        if (typeof step === 'string' && step.indexOf('sel:') === 0) { inp = el('select'); step.slice(4).split(',').forEach(function (v) { var o = el('option', null, v); o.value = v; if (+v === +val) o.selected = true; inp.appendChild(o); }); }
        else { inp = el('input'); inp.type = 'number'; inp.min = min; inp.max = max; inp.step = step; inp.value = val; }
        inp.name = id; w.appendChild(el('span', null, esc(label))); w.appendChild(inp); return w;
    }
    function readForm(box) { var o = {}; box.querySelectorAll('input[name],select[name],textarea[name]').forEach(function (i) { if (i.type === 'radio') { if (i.checked) o[i.name] = i.value; } else if (i.type === 'checkbox') o[i.name] = i.checked; else o[i.name] = (i.tagName === 'TEXTAREA' || i.type === 'text') ? i.value : (i.value === '' ? null : parseFloat(i.value)); }); return o; }

    /* ---------- Curvas de nivel ---------- */
    var SHAPES = [['mixto', 'Mixto (colinas y vaguadas)'], ['colina', 'Colina'], ['cuenca', 'Cuenca / depresión'], ['ladera', 'Ladera inclinada'], ['valle', 'Valle con quebrada'], ['ondulado', 'Ondulado suave']];
    var PRESETS = [['Lote urbano', { width: 60, height: 40, n: 90, relief: 3, base: 2600, shape: 'ladera' }], ['Predio rural', { width: 400, height: 300, n: 400, relief: 35, base: 2300, shape: 'mixto' }], ['Colina', { width: 250, height: 250, n: 300, relief: 40, base: 2300, shape: 'colina' }], ['Valle', { width: 500, height: 300, n: 450, relief: 45, base: 2150, shape: 'valle' }]];
    function buildCurvas(sec) {
        var form = el('div', 'cxp-form');
        form.innerHTML = '<div class="cxp-modes"><label><input type="radio" name="modo" value="rand" checked> 🎲 Terreno aleatorio</label><label><input type="radio" name="modo" value="pts"> 📋 Mis puntos (X, Y, Z)</label></div>';
        var rand = el('div', 'cxp-rand'), pre = el('div', 'cxp-presets', '<span>Plantillas:</span>'), rg = el('div', 'cxp-grid'), pts = el('div', 'cxp-pts'); pts.hidden = true;
        PRESETS.forEach(function (pr) { var b = el('button', 'cxp-chip', pr[0]); b.type = 'button'; b.addEventListener('click', function () { Object.keys(pr[1]).forEach(function (k) { var i = form.querySelector('[name=' + k + ']'); if (i) i.value = pr[1][k]; }); }); pre.appendChild(b); });
        [['width', 'Ancho (m)', 200, 20, 3000, 5], ['height', 'Alto (m)', 150, 20, 3000, 5], ['n', 'N.º de puntos', 180, 30, 1500, 10], ['relief', 'Desnivel total (m)', 20, 1, 500, 1], ['base', 'Cota base (m)', 2300, 0, 6000, 10], ['interval', 'Equidistancia (m, 0 = auto)', 0, 0, 100, 0.5], ['seed', 'Semilla (vacío = al azar)', '', 0, 4294967295, 1]].forEach(function (f) { var fe = field(f[0], f[1], f[2], f[3], f[4], f[5]); if (f[0] === 'seed') fe.querySelector('input').value = ''; rg.appendChild(fe); });
        var sh = el('label', 'cxp-f'); sh.innerHTML = '<span>Forma del terreno</span>'; var ss = el('select'); ss.name = 'shape'; SHAPES.forEach(function (x) { var o = el('option', null, x[1]); o.value = x[0]; ss.appendChild(o); }); sh.appendChild(ss); rg.insertBefore(sh, rg.firstChild);
        rand.appendChild(pre); rand.appendChild(rg);
        pts.innerHTML = '<label class="cxp-f cxp-wide"><span>Pega tus puntos (una fila por punto: X, Y, Z — también «P,E,N,Z» o con coma decimal y «;»)</span><textarea name="txt" rows="7" placeholder="X,Y,Z\n500000,1200000,100.5\n500020,1200000,101.2\n…"></textarea></label>' +
            '<div class="cxp-file"><label class="cx-btn">📎 Cargar CSV / TXT / DXF<input type="file" id="cxpPtsFile" accept=".csv,.txt,.xyz,.pts,.dat,.asc,.dxf" hidden></label><span id="cxpPtsInfo"></span></div>' +
            '<div class="cxp-grid"></div>';
        var g2 = pts.querySelector('.cxp-grid'); g2.appendChild(field('interval2', 'Equidistancia (m, 0 = auto)', 0, 0, 100, 0.5));
        var meta = el('div', 'cxp-grid'); meta.appendChild(textField('proyecto', 'Proyecto (para el cajetín)', 'Levantamiento topográfico')); meta.appendChild(textField('autor', 'Elaboró', '')); 
        var go = el('button', 'cx-btn cxp-go', '▶ Generar curvas de nivel'); go.type = 'button';
        var out = el('div', 'cx-box cxp-out'); form.appendChild(rand); form.appendChild(pts); form.appendChild(meta); form.appendChild(go); sec.appendChild(form); sec.appendChild(out);
        form.querySelectorAll('input[name=modo]').forEach(function (r) { r.addEventListener('change', function () { var m = readForm(form).modo; rand.hidden = m !== 'rand'; pts.hidden = m !== 'pts'; }); });
        var loaded = null;
        form.querySelector('#cxpPtsFile').addEventListener('change', function (e) {
            var f = e.target.files && e.target.files[0]; if (!f) return; var r = new FileReader();
            r.onload = function () { var t = String(r.result || ''), p = /\.dxf$/i.test(f.name) ? CAD.pointsFromDXF(CAD.parseDXF(t)) : CAD.parsePoints(t); loaded = p; form.querySelector('#cxpPtsInfo').textContent = f.name + ': ' + p.length + ' puntos leídos'; if (p.length >= 3) form.querySelector('[name=txt]').value = ''; };
            r.readAsText(f);
        });
        function draw(host, spec) { if (CAD.contourStudio) CAD.contourStudio(host, spec); else CAD.contourCard(host, spec); }
        go.addEventListener('click', function () {
            out.innerHTML = ''; var v = readForm(form), card = el('div', 'cx-card'), meta = { proyecto: (v.proyecto || '').trim(), autor: (v.autor || '').trim() };
            if (v.modo === 'rand') {
                var prm = { width: v.width || 200, height: v.height || 150, n: v.n || 180, relief: v.relief || 20, base: v.base == null ? 2300 : v.base, interval: v.interval || 0, shape: v.shape || 'mixto' }; if (v.seed != null && !isNaN(v.seed)) prm.seed = v.seed;
                var t = CAD.randomTerrain(prm); out.appendChild(card);
                draw(card, { pts: t.pts, title: 'TERRENO ALEATORIO - CURVAS DE NIVEL', random: true, seed: t.seed, params: prm, name: 'curvas_nivel_' + t.seed, proyecto: meta.proyecto, autor: meta.autor, shape: prm.shape });
            } else {
                var pp = (loaded && loaded.length >= 3 && !(v.txt || '').trim()) ? loaded : CAD.parsePoints(v.txt || '');
                if (pp.length < 3) { out.appendChild(el('p', 'cx-err', '⚠ Necesito al menos 3 puntos con X, Y y Z. Pega filas o carga un archivo.')); return; }
                out.appendChild(card); draw(card, { pts: pp, title: 'PLANO TOPOGRAFICO - CURVAS DE NIVEL', random: false, params: { interval: v.interval2 || 0 }, name: 'curvas_de_nivel', proyecto: meta.proyecto, autor: meta.autor });
            }
            out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }
    function textField(id, label, val) { var w = el('label', 'cxp-f'), i = el('input'); i.type = 'text'; i.name = id; i.value = val || ''; i.maxLength = 60; i.setAttribute('data-txt', '1'); w.appendChild(el('span', null, esc(label))); w.appendChild(i); return w; }

    /* ---------- Diseño estructural ---------- */
    function buildStruct(sec) {
        var sel = el('div', 'cxp-els'); var form = el('div', 'cxp-form'), out = el('div', 'cx-box cxp-out'), cur = 'viga';
        Object.keys(STRUCT).forEach(function (k) { var b = el('button', 'cxp-el' + (k === cur ? ' on' : ''), '<span>' + STRUCT[k].ico + '</span>' + STRUCT[k].nombre); b.type = 'button'; b.addEventListener('click', function () { cur = k; sel.querySelectorAll('.cxp-el').forEach(function (x) { x.classList.toggle('on', x === b); }); renderForm(); out.innerHTML = ''; }); sel.appendChild(b); });
        var gridBox = el('div', 'cxp-grid'), go = el('button', 'cx-btn cxp-go', '▶ Calcular y dibujar'); go.type = 'button';
        var note = el('p', 'cxp-note', '⚠ Predimensionamiento <b>educativo</b> (principios de ACI 318 / NSR-10). No reemplaza el diseño completo ni la revisión de un ingeniero: cada resultado indica qué <b>no</b> verifica.');
        function renderForm() { gridBox.innerHTML = ''; STRUCT[cur].fields.forEach(function (f) { gridBox.appendChild(field(f[0], f[1], f[2], f[3], f[4], f[5])); }); }
        renderForm(); form.appendChild(gridBox); form.appendChild(go); sec.appendChild(sel); sec.appendChild(form); sec.appendChild(note); sec.appendChild(out);
        go.addEventListener('click', function () {
            out.innerHTML = ''; var v = readForm(form), r = CAD.struct[cur](v), card = el('div', 'cx-card');
            if (!r.ok) { out.appendChild(el('p', 'cx-err', '⚠ ' + esc(r.warns.join(' ')))); return; }
            r.warns.forEach(function (w) { out.appendChild(el('p', 'cxp-warn', '⚠ ' + esc(w))); });
            var host = el('div', 'cx-box'); out.appendChild(host);
            CAD.viewer(host, r.model, { name: cur + '_civix', extra: 'Dibujo en mm. El botón <b>⬇ DXF</b> descarga el plano para AutoCAD / Civil 3D.' });
            var memo = el('details', 'cxp-memo'); memo.open = true; memo.innerHTML = '<summary>Memoria de cálculo</summary><pre>' + esc(r.memo.join('\n')) + '</pre>';
            var cp = el('button', 'cx-btn', 'Copiar memoria'); cp.type = 'button'; cp.addEventListener('click', function () { try { navigator.clipboard.writeText(r.memo.join('\n')); cp.textContent = '✓ Copiada'; } catch (e) {} }); memo.appendChild(cp);
            var mb = el('button', 'cx-btn', '⬇ Memoria .txt'); mb.type = 'button'; mb.style.marginLeft = '6px'; mb.addEventListener('click', function () { CAD.download(cur + '_memoria.txt', new Blob([r.memo.join('\r\n')], { type: 'text/plain;charset=utf-8' })); }); memo.appendChild(mb);
            if (r.bom && r.bom.rows.length) out.appendChild(bomTable(r.bom, cur));
            out.appendChild(memo); out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }
    function bomTable(bom, name) {
        var w = el('div', 'cxp-tblwrap'), tot = 0, isF = bom.head[bom.head.length - 1].indexOf('Peso') === 0;
        var h = '<h4 class="cxp-h4">' + (isF ? 'Cuadro de acero' : 'Tabla de barras') + '</h4><table class="cxp-tbl"><thead><tr>' + bom.head.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>';
        bom.rows.forEach(function (r) { if (isF) tot += +r[r.length - 1] || 0; h += '<tr>' + r.map(function (x) { return '<td>' + esc(x) + '</td>'; }).join('') + '</tr>'; });
        if (isF) h += '<tr class="tot"><td colspan="' + (bom.head.length - 1) + '">Peso total aproximado (sin desperdicio ni traslapos)</td><td>' + tot.toFixed(1) + '</td></tr>';
        w.innerHTML = h + '</tbody></table>';
        var b = el('button', 'cx-btn', '⬇ Tabla .csv'); b.type = 'button'; b.addEventListener('click', function () { var q = function (x) { return '"' + String(x).replace(/"/g, '""') + '"'; }; var t = [bom.head.map(q).join(';')].concat(bom.rows.map(function (r) { return r.map(q).join(';'); })).join('\r\n'); CAD.download(name + '_tabla.csv', new Blob(['\ufeff' + t], { type: 'text/csv;charset=utf-8' })); }); w.appendChild(b);
        return w;
    }

    /* ---------- Prompts IA ---------- */
    function sendPrompt(q) {
        if (global.civixShowView) global.civixShowView('chat');
        var input = $('inputAsistente'); if (input) { input.value = q; input.focus(); }
        var b = $('btnEnviarMensaje'); if (b) setTimeout(function () { b.click(); }, 30);
    }
    function estTok(t) { return Math.ceil(String(t).length / 3.6); }
    function buildIA(sec) {
        sec.appendChild(el('p', 'cxp-note', 'Los prompts envían una petición específica a Civix, que responde con la explicación y un <b>DXF</b> dibujado en el chat. <b>Consumen tokens</b> de IA (una respuesta con plano ≈ 2 000–4 000); para curvas de nivel y los diseños estructurales usa las otras pestañas, que no gastan tokens.'));
        /* Constructor de prompt */
        var bld = el('div', 'cxp-builder');
        bld.innerHTML = '<h4 class="cxp-h4">🧩 Constructor de prompt</h4>';
        var g = el('div', 'cxp-grid');
        function sel(name, label, opts) { var w = el('label', 'cxp-f'), s2 = el('select'); s2.name = name; opts.forEach(function (o) { var op = el('option', null, o); op.value = o; s2.appendChild(op); }); w.appendChild(el('span', null, label)); w.appendChild(s2); return w; }
        g.appendChild(sel('tipo', 'Tipo de plano', ['Estructural (elemento)', 'Planta arquitectónica', 'Cimentación', 'Vía (planta / sección / perfil)', 'Hidráulico / drenaje', 'Topográfico', 'Detalle constructivo']));
        g.appendChild(sel('unid', 'Unidades', ['metros', 'milímetros', 'centímetros']));
        g.appendChild(sel('esc', 'Escala de referencia', ['1:50', '1:100', '1:20', '1:200', '1:500', 'sin escala']));
        g.appendChild(sel('det', 'Nivel de detalle', ['esencial (pocos tokens)', 'medio', 'detallado (cotas, textos y cuadros)']));
        var ta = el('label', 'cxp-f cxp-wide'); ta.innerHTML = '<span>Describe lo que necesitas (dimensiones, cargas, materiales, número de elementos…)</span><textarea name="desc" rows="3" placeholder="Ej.: viga de 6 m con cargas puntuales de 40 kN en los tercios, concreto 28 MPa…"></textarea>'; g.appendChild(ta);
        var ly = el('label', 'cxp-f cxp-wide'); ly.innerHTML = '<span>Capas deseadas (opcional)</span><input type="text" name="capas" placeholder="EJES, MUROS, COTAS, TEXTOS, ACERO…">'; g.appendChild(ly);
        bld.appendChild(g);
        var prev = el('pre', 'cxp-prev'), tok = el('span', 'cxp-tok'), row = el('div', 'cxp-row');
        function compose() { var v = readForm(bld); if (!(v.desc || '').trim()) return ''; return 'Genera un plano de tipo «' + v.tipo + '» en ' + v.unid + ', escala de referencia ' + v.esc + ', nivel de detalle ' + v.det + '. ' + v.desc.trim() + (v.capas && v.capas.trim() ? ' Usa estas capas: ' + v.capas.trim() + '.' : ' Usa capas con nombres claros.') + ' Entrégame el resultado como DXF (ASCII, R12) en un único bloque de código, con cotas y textos legibles, y una breve explicación de los criterios.'; }
        function upd() { var q = compose(); prev.textContent = q || 'Escribe la descripción para ver el prompt…'; tok.textContent = q ? '≈ ' + estTok(q) + ' tokens de entrada' : ''; }
        bld.addEventListener('input', upd); upd();
        var bs = el('button', 'cx-btn cxp-go', '➤ Enviar a Civix'), bc = el('button', 'cx-btn', 'Copiar prompt'); bs.type = bc.type = 'button';
        bs.addEventListener('click', function () { var q = compose(); if (q) sendPrompt(q); else { prev.textContent = '⚠ Describe primero lo que necesitas.'; } });
        bc.addEventListener('click', function () { var q = compose(); if (q) try { navigator.clipboard.writeText(q); bc.textContent = '✓ Copiado'; setTimeout(function () { bc.textContent = 'Copiar prompt'; }, 1500); } catch (e) { } });
        row.appendChild(bs); row.appendChild(bc); row.appendChild(tok); bld.appendChild(prev); bld.appendChild(row); sec.appendChild(bld);
        /* Refinamientos */
        var rf = el('div', 'cxp-refine', '<h4 class="cxp-h4">✏️ Refinar el último plano</h4>'), rr = el('div', 'cxp-presets');
        REFINE.forEach(function (r) { var b = el('button', 'cxp-chip', esc(r[0])); b.type = 'button'; b.title = r[1]; b.addEventListener('click', function () { sendPrompt(r[1]); }); rr.appendChild(b); }); rf.appendChild(rr); sec.appendChild(rf);
        /* Biblioteca por categorías */
        var filt = el('div', 'cxp-presets', '<span>Biblioteca:</span>'), grid = el('div', 'civix-tools-grid'), curC = -1;
        function paint() { grid.innerHTML = ''; PROMPTS.forEach(function (p) { if (curC >= 0 && p.c !== curC) return; var b = el('button', 'cxp-card', '<span>' + p.ico + '</span><strong>' + esc(p.t) + '</strong><em>' + esc(p.d) + '</em>'); b.type = 'button'; b.title = p.q; b.addEventListener('click', function () { sendPrompt(p.q); }); grid.appendChild(b); }); }
        [['Todos', -1]].concat(CATS.map(function (c, i) { return [c, i]; })).forEach(function (c) { var b = el('button', 'cxp-chip' + (c[1] === -1 ? ' on' : ''), esc(c[0])); b.type = 'button'; b.addEventListener('click', function () { curC = c[1]; filt.querySelectorAll('.cxp-chip').forEach(function (x) { x.classList.toggle('on', x === b); }); paint(); }); filt.appendChild(b); });
        paint(); sec.appendChild(filt); sec.appendChild(grid);
    }

    /* ---------- Convertidor + tarjeta en Herramientas ---------- */
    function buildConv(sec) {
        if (CAD.convertUI) CAD.convertUI(sec); else sec.appendChild(el('p', 'cx-err', 'El módulo de conversión no se cargó (js/civix-cad-convert.js).'));
    }
    function addToolCard(panel) {
        var grid = doc.querySelector('#civixViewHerramientas .civix-tools-grid'); if (!grid || $('civixToolConv')) return;
        function card(id, ico, t, d, tab) { var b = el('button', 'civix-tool-card', '<span>' + ico + '</span><strong>' + t + '</strong><em>' + d + '</em>'); b.type = 'button'; b.id = id; b.__boundProSend = true; b.addEventListener('click', function () { if (global.civixShowView) global.civixShowView('cad'); var tb = panel.querySelector('.cxp-tab[data-t=' + tab + ']'); if (tb) tb.click(); }); grid.appendChild(b); }
        card('civixToolConv', '🔄', 'Convertidor DWG ⇄ DXF', 'Sin páginas externas', 'conv'); card('civixToolCurv', '🗺️', 'Curvas de nivel', 'Perfil, volúmenes, PDF', 'curvas');
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { setTimeout(build, 300); }); else setTimeout(build, 300);
    CAD.panelBuild = build;
})(window);
