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

    var PROMPTS = [
        { ico: '🏗️', t: 'Losa maciza en una dirección', d: 'Planta y armado', q: 'Diseña una losa maciza en una dirección de 4 x 6 m, apoyada en vigas, carga viva 2 kN/m², f\'c 21 MPa, fy 420 MPa. Da espesor, acero y entrégame un plano DXF con planta, corte y cuadro de acero.' },
        { ico: '🏢', t: 'Pórtico plano 2 pisos', d: 'Geometría y cargas', q: 'Dibuja un pórtico plano de 2 pisos y 3 vanos de 5 m (altura 3 m por piso) con ejes, secciones de vigas 30x50 y columnas 40x40, nudos y cargas distribuidas. Entrégame el DXF.' },
        { ico: '🌉', t: 'Cercha de cubierta', d: 'Warren / Howe', q: 'Diseña una cercha tipo Warren de 12 m de luz y 2 m de altura con 6 paneles. Da longitudes de barras, y entrégame un DXF con nodos numerados y cotas.' },
        { ico: '🧱', t: 'Planta de cimentación', d: 'Zapatas y vigas de amarre', q: 'Dibuja la planta de cimentación de una edificación de 3 x 3 ejes separados 5 m con zapatas aisladas de 2x2 m, columnas 40x40 y vigas de amarre 30x30. Entrégame el DXF con ejes y cotas.' },
        { ico: '🛣️', t: 'Sección transversal de vía', d: 'Ancho, bombeo, cunetas', q: 'Dibuja la sección transversal típica de una vía rural de dos carriles de 3.0 m, bermas de 0.5 m, bombeo 2 %, cunetas triangulares y taludes 1.5:1. Entrégame el DXF acotado.' },
        { ico: '🏠', t: 'Planta de vivienda simple', d: 'Muros, puertas y ventanas', q: 'Dibuja la planta arquitectónica de una vivienda de 1 piso de 6 x 8 m con sala-comedor, cocina, 2 alcobas y baño, muros, puertas y ventanas. Entrégame el DXF con capas y cotas.' },
        { ico: '🪜', t: 'Escalera de concreto', d: 'Corte con refuerzo', q: 'Diseña una escalera de concreto de 3 m de altura entre pisos, huella 28 cm y contrahuella 17 cm. Calcula número de peldaños y entrégame un DXF con corte y armado.' },
        { ico: '💧', t: 'Canal rectangular', d: 'Sección hidráulica', q: 'Dibuja y calcula un canal rectangular de concreto para Q = 1.2 m³/s, pendiente 0.2 %, n = 0.014. Da dimensiones y entrégame un DXF de la sección con borde libre.' }
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
            '<div class="cxp-tabs" role="tablist"><button class="cxp-tab on" data-t="curvas">🗺️ Curvas de nivel</button><button class="cxp-tab" data-t="struct">🏗️ Diseño estructural</button><button class="cxp-tab" data-t="ia">🤖 Planos con IA</button></div>' +
            '<section class="cxp-sec" data-s="curvas"></section><section class="cxp-sec" data-s="struct" hidden></section><section class="cxp-sec" data-s="ia" hidden></section>';
        her.parentNode.insertBefore(panel, her.nextSibling);
        panel.querySelectorAll('.cxp-tab').forEach(function (t) { t.addEventListener('click', function () { panel.querySelectorAll('.cxp-tab').forEach(function (x) { x.classList.toggle('on', x === t); }); panel.querySelectorAll('.cxp-sec').forEach(function (s) { s.hidden = s.getAttribute('data-s') !== t.getAttribute('data-t'); }); }); });
        btn.addEventListener('click', function () { if (global.civixShowView) global.civixShowView('cad'); });
        buildCurvas(panel.querySelector('[data-s=curvas]')); buildStruct(panel.querySelector('[data-s=struct]')); buildIA(panel.querySelector('[data-s=ia]'));
        var orig = global.civixShowView;
        if (typeof orig === 'function' && !orig.__cx) { var w = function (name) { var r = orig.apply(this, arguments); panel.hidden = (name || 'chat') !== 'cad'; btn.classList.toggle('active', name === 'cad'); return r; }; w.__cx = true; global.civixShowView = w; }
    }

    function field(id, label, val, min, max, step, cls) {
        var w = el('label', 'cxp-f' + (cls ? ' ' + cls : '')), inp;
        if (typeof step === 'string' && step.indexOf('sel:') === 0) { inp = el('select'); step.slice(4).split(',').forEach(function (v) { var o = el('option', null, v); o.value = v; if (+v === +val) o.selected = true; inp.appendChild(o); }); }
        else { inp = el('input'); inp.type = 'number'; inp.min = min; inp.max = max; inp.step = step; inp.value = val; }
        inp.name = id; w.appendChild(el('span', null, esc(label))); w.appendChild(inp); return w;
    }
    function readForm(box) { var o = {}; box.querySelectorAll('input[name],select[name],textarea[name]').forEach(function (i) { if (i.type === 'radio') { if (i.checked) o[i.name] = i.value; } else if (i.type === 'checkbox') o[i.name] = i.checked; else o[i.name] = i.tagName === 'TEXTAREA' ? i.value : (i.value === '' ? null : parseFloat(i.value)); }); return o; }

    /* ---------- Curvas de nivel ---------- */
    function buildCurvas(sec) {
        var form = el('div', 'cxp-form');
        form.innerHTML = '<div class="cxp-modes"><label><input type="radio" name="modo" value="rand" checked> 🎲 Terreno aleatorio</label><label><input type="radio" name="modo" value="pts"> 📋 Mis puntos (X, Y, Z)</label></div>';
        var rand = el('div', 'cxp-grid'), pts = el('div', 'cxp-pts'); pts.hidden = true;
        [['width', 'Ancho (m)', 200, 20, 3000, 5], ['height', 'Alto (m)', 150, 20, 3000, 5], ['n', 'N.º de puntos', 180, 30, 1500, 10], ['relief', 'Desnivel total (m)', 20, 1, 500, 1], ['base', 'Cota base (m)', 2300, 0, 6000, 10], ['interval', 'Equidistancia (m, 0 = auto)', 0, 0, 100, 0.5], ['seed', 'Semilla (vacío = al azar)', '', 0, 4294967295, 1]].forEach(function (f) { var fe = field(f[0], f[1], f[2], f[3], f[4], f[5]); if (f[0] === 'seed') fe.querySelector('input').value = ''; rand.appendChild(fe); });
        pts.innerHTML = '<label class="cxp-f cxp-wide"><span>Pega tus puntos (una fila por punto: X, Y, Z — también «P,E,N,Z» o con coma decimal y «;»)</span><textarea name="txt" rows="7" placeholder="X,Y,Z\n500000,1200000,100.5\n500020,1200000,101.2\n…"></textarea></label>' +
            '<div class="cxp-file"><label class="cx-btn">📎 Cargar CSV / TXT / DXF<input type="file" id="cxpPtsFile" accept=".csv,.txt,.xyz,.pts,.dat,.asc,.dxf" hidden></label><span id="cxpPtsInfo"></span></div>' +
            '<div class="cxp-grid"></div>';
        var g2 = pts.querySelector('.cxp-grid'); g2.appendChild(field('interval2', 'Equidistancia (m, 0 = auto)', 0, 0, 100, 0.5));
        var go = el('button', 'cx-btn cxp-go', '▶ Generar curvas de nivel'); go.type = 'button';
        var out = el('div', 'cx-box cxp-out'); form.appendChild(rand); form.appendChild(pts); form.appendChild(go); sec.appendChild(form); sec.appendChild(out);
        form.querySelectorAll('input[name=modo]').forEach(function (r) { r.addEventListener('change', function () { var m = readForm(form).modo; rand.hidden = m !== 'rand'; pts.hidden = m !== 'pts'; }); });
        var loaded = null;
        form.querySelector('#cxpPtsFile').addEventListener('change', function (e) {
            var f = e.target.files && e.target.files[0]; if (!f) return; var r = new FileReader();
            r.onload = function () { var t = String(r.result || ''), p = /\.dxf$/i.test(f.name) ? CAD.pointsFromDXF(CAD.parseDXF(t)) : CAD.parsePoints(t); loaded = p; form.querySelector('#cxpPtsInfo').textContent = f.name + ': ' + p.length + ' puntos leídos'; if (p.length >= 3) form.querySelector('[name=txt]').value = ''; };
            r.readAsText(f);
        });
        go.addEventListener('click', function () {
            out.innerHTML = ''; var v = readForm(form), card = el('div', 'cx-card');
            if (v.modo === 'rand') {
                var prm = { width: v.width || 200, height: v.height || 150, n: v.n || 180, relief: v.relief || 20, base: v.base == null ? 2300 : v.base, interval: v.interval || 0 }; if (v.seed != null && !isNaN(v.seed)) prm.seed = v.seed;
                var t = CAD.randomTerrain(prm); out.appendChild(card);
                CAD.contourCard(card, { pts: t.pts, title: 'TERRENO ALEATORIO - CURVAS DE NIVEL', random: true, seed: t.seed, params: prm, name: 'curvas_nivel_' + t.seed });
            } else {
                var pp = (loaded && loaded.length >= 3 && !(v.txt || '').trim()) ? loaded : CAD.parsePoints(v.txt || '');
                if (pp.length < 3) { out.appendChild(el('p', 'cx-err', '⚠ Necesito al menos 3 puntos con X, Y y Z. Pega filas o carga un archivo.')); return; }
                out.appendChild(card); CAD.contourCard(card, { pts: pp, title: 'PLANO TOPOGRAFICO - CURVAS DE NIVEL', random: false, params: { interval: v.interval2 || 0 }, name: 'curvas_de_nivel' });
            }
            out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }

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
            out.appendChild(memo); out.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        });
    }

    /* ---------- Prompts IA ---------- */
    function sendPrompt(q) {
        if (global.civixShowView) global.civixShowView('chat');
        var input = $('inputAsistente'); if (input) { input.value = q; input.focus(); }
        var b = $('btnEnviarMensaje'); if (b) setTimeout(function () { b.click(); }, 30);
    }
    function buildIA(sec) {
        sec.appendChild(el('p', 'cxp-note', 'Estos botones envían un prompt específico a Civix, que responde con la explicación y un <b>DXF</b> que verás dibujado en el chat. Consumen tokens de IA; para curvas de nivel y los 4 diseños anteriores usa las otras pestañas.'));
        var grid = el('div', 'civix-tools-grid');
        PROMPTS.forEach(function (p) { var b = el('button', 'cxp-card', '<span>' + p.ico + '</span><strong>' + esc(p.t) + '</strong><em>' + esc(p.d) + '</em>'); b.type = 'button'; b.addEventListener('click', function () { sendPrompt(p.q); }); grid.appendChild(b); });
        sec.appendChild(grid);
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { setTimeout(build, 300); }); else setTimeout(build, 300);
    CAD.panelBuild = build;
})(window);
