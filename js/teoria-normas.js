/* =========================================================
   GeoMetrics — Renderizador de teoría con enfoque normativo
   Requiere: js/teoria-ms1.js, teoria-ms2.js, teoria-rm.js,
             teoria-dm.js y KaTeX (cargado en index.html).
   ========================================================= */
(function (global) {
    'use strict';
    var doc = document;
    var MODULES = global.TN_MODULES || {};

    /* ---------- utilidades ---------- */
    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    }

    function num(v, d) {
        if (v == null || !isFinite(v)) return '—';
        return Number(v).toFixed(d == null ? 1 : d);
    }

    /* Protege <, > y & dentro de las ecuaciones para que el navegador
       no interprete expresiones como 1<C_c<3 como etiquetas HTML. */
    function protectMath(html) {
        return String(html || '').replace(/\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g, function (m, block, inline) {
            var tex = block != null ? block : inline;
            tex = tex.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            return block != null ? '\\[' + tex + '\\]' : '\\(' + tex + '\\)';
        });
    }

    /* ---------- render de un módulo ---------- */
    function renderModule(mod) {
        var prefix = mod.prefix;
        var all = [{ id: 'ruta', t: 'Ruta de trabajo' }]
            .concat(mod.sections || [])
            .concat([{ id: 'bib', t: 'Bibliografía y normas' }]);

        var toc = '<nav class="dm-toc" aria-label="Contenido de la teoría"><b>Contenido</b>' +
            all.map(function (s, i) {
                var label = s.t || s.title || s.id || '';
                return '<a href="#' + prefix + '-t-' + s.id + '" data-t="' + s.id + '"><span>' + (i + 1) + '</span>' + esc(label) + '</a>';
            }).join('') + '</nav>';

        var route = '<div class="dm-ruta">' + (mod.route || []).map(function (r, i) {
            return '<a href="#" class="dm-paso" data-go="' + esc(r.go) + '" data-kind="' + mod.key + '"><span>' + (i + 1) + '</span><b>' + esc(r.t) + '</b><small>' + esc(r.d) + '</small></a>';
        }).join('') + '</div>';

        var body = '';
        body += '<section class="dm-sec" id="' + prefix + '-t-ruta"><h4><span>1</span>Ruta de trabajo</h4>' +
            '<p>La teoría está organizada en el mismo orden en que se ejecutan los ensayos y se toman las decisiones. Puedes recorrer el índice o entrar directamente al ensayo relacionado.</p>' +
            route + '</section>';

        (mod.sections || []).forEach(function (s, i) {
            var n = i + 2;
            body += '<section class="dm-sec" id="' + prefix + '-t-' + s.id + '">' +
                '<h4><span>' + n + '</span>' + esc(s.title) + '</h4>' +
                protectMath(s.html) + '</section>';
        });

        var bibNum = (mod.sections || []).length + 2;
        var bib = '<section class="dm-sec" id="' + prefix + '-t-bib"><h4><span>' + bibNum + '</span>Bibliografía y normas</h4>' +
            '<ul class="dm-bib">' + (mod.bib || []).map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>' +
            '<p class="dm-hint">Verifica siempre la edición vigente de cada norma, las tablas originales y los requisitos particulares del proyecto. Las normas se citan como referencia técnica; este material no las reemplaza.</p></section>';

        var tags = (mod.tags || []).map(function (t) { return '<span class="tn-tag">' + esc(t) + '</span>'; }).join('');
        var stats = (mod.stats || []).map(function (s) {
            return '<li><strong>' + esc(s[0]) + '</strong><em>' + esc(s[1]) + '</em></li>';
        }).join('');

        return '<div class="dm tn-teoria" data-tn="1">' +
            '<header class="dm-teohead tn-hero">' +
                '<div>' +
                    '<span class="tn-eyebrow">' + esc(mod.eyebrow) + '</span>' +
                    '<h3>' + esc(mod.title) + '</h3>' +
                    '<p>' + esc(mod.desc) + '</p>' +
                    '<div class="tn-tags">' + tags + '</div>' +
                '</div>' +
                '<ul class="tn-stats">' + stats + '</ul>' +
            '</header>' +
            '<div class="tn-scope">' + (mod.scope || '') + '</div>' +
            '<div class="dm-teolayout">' + toc +
                '<div class="dm-teobody">' + body + bib + '</div>' +
            '</div>' +
        '</div>';
    }

    /* ---------- navegación ---------- */
    function openEnsayo(mod, go) {
        if (!mod || !go) return;
        if (mod.key === 'dm') {
            if (global.Mezclas && typeof global.Mezclas.abrirEnsayo === 'function') {
                global.Mezclas.abrirEnsayo(go);
                return;
            }
        }
        var scr = doc.getElementById(mod.screen);
        if (!scr) return;
        var tab = scr.querySelector('.tab-btn[data-tab="' + mod.tab + '"]');
        if (tab && !tab.classList.contains('active')) tab.click();
        if (mod.key === 'est' && global.Estru && typeof global.Estru.open === 'function') {
            global.Estru.open(go);
            try { scr.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { global.scrollTo(0, 0); }
            return;
        }
        var sel = mod.key === 'ms2'
            ? '#ms2-ensayos .ensayo-card[data-ensayo-ms2="' + go + '"]'
            : '#' + mod.tab + ' .ensayo-card[data-ensayo="' + go + '"]';
        setTimeout(function () {
            var card = doc.querySelector(sel);
            if (card) card.click();
            try { scr.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { global.scrollTo(0, 0); }
        }, 110);
    }

    function showTeoriaSection(root, mod, id) {
        if (!root || !id) return;
        var secs = root.querySelectorAll('.dm-sec');
        secs.forEach(function (s) {
            var on = s.id === mod.prefix + '-t-' + id;
            s.classList.toggle('is-active', on);
            s.hidden = !on;
            s.style.display = on ? 'block' : 'none';
        });
        root.querySelectorAll('.dm-toc a').forEach(function (a) {
            var on = a.getAttribute('data-t') === id;
            a.classList.toggle('is-on', on);
            a.setAttribute('aria-current', on ? 'true' : 'false');
        });
        try {
            var body = root.querySelector('.dm-teobody');
            if (body) body.scrollTop = 0;
            root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {}
        try { renderMath(root); } catch (e) {}
    }

    function bind(root, mod) {
        /* Solo un apartado visible a la vez */
        var firstId = 'ruta';
        root.querySelectorAll('.dm-sec').forEach(function (s, i) {
            var on = i === 0;
            s.classList.toggle('is-active', on);
            s.hidden = !on;
            s.style.display = on ? 'block' : 'none';
        });
        root.querySelectorAll('.dm-toc a').forEach(function (a, i) {
            a.classList.toggle('is-on', i === 0);
            a.addEventListener('click', function (e) {
                e.preventDefault();
                showTeoriaSection(root, mod, a.getAttribute('data-t'));
            });
        });
        root.querySelectorAll('[data-go]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                openEnsayo(mod, a.getAttribute('data-go'));
            });
        });
    }

    /* ---------- tablas ACI dinámicas ---------- */
    function dmTables() {
        var C = global.MezclasCalc;
        if (!C || !C.ACI) return '<p class="dm-hint">No se encontró el motor de cálculo de mezclas; consulta las tablas de ACI 211.1 en la edición vigente.</p>';
        var A = C.ACI;
        var th = A.tmn.map(function (v) { return '<th>' + v + '</th>'; }).join('');
        var labels = ['25 – 50', '75 – 100', '150 – 175'];

        function filas(matriz) {
            return matriz.map(function (fila, i) {
                return '<tr><td>' + labels[i] + '</td>' + fila.map(function (v) {
                    return '<td>' + (v == null ? '—' : v) + '</td>';
                }).join('') + '</tr>';
            }).join('');
        }

        var h = '<div class="tn-tablecap">Agua de mezclado aproximada (kg/m³) y aire atrapado — ACI 211.1</div>' +
            '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Asentamiento (mm)</th><th colspan="8">Tamaño máximo nominal (mm)</th></tr>' +
            '<tr><th></th>' + th + '</tr></thead><tbody>' +
            '<tr class="dm-sub"><td colspan="9">Sin aire incorporado</td></tr>' + filas(A.agua.sin) +
            '<tr><td><em>Aire atrapado (%)</em></td>' + A.aireAtrapado.map(function (v) { return '<td>' + v + '</td>'; }).join('') + '</tr>' +
            '<tr class="dm-sub"><td colspan="9">Con aire incorporado</td></tr>' + filas(A.agua.con) +
            '</tbody><caption>Valores de referencia; la aplicación interpola entre filas y columnas. Verifica la edición de ACI 211.1.</caption></table></div>';

        h += '<div class="tn-tablecap">Relación a/c máxima según la resistencia requerida f\'cr (MPa)</div>' +
            '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>f\'cr (MPa)</th><th>Sin aire incorporado</th><th>Con aire incorporado</th></tr></thead><tbody>' +
            A.acFcr.map(function (r) {
                return '<tr><td>' + r[0] + '</td><td>' + (r[1] == null ? '—' : r[1]) + '</td><td>' + (r[2] == null ? '—' : r[2]) + '</td></tr>';
            }).join('') + '</tbody><caption>La relación a/c de diseño es la menor entre la requerida por resistencia y la máxima por durabilidad.</caption></table></div>';

        h += '<div class="tn-tablecap">Volumen de agregado grueso por unidad de volumen de concreto (b/b0)</div>' +
            '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>TMN (mm)</th>' + A.vgMF.map(function (m) { return '<th>MF ' + m + '</th>'; }).join('') + '</tr></thead><tbody>' +
            A.tmn.map(function (t) {
                var fila = A.vg[String(t)];
                return '<tr><td>' + t + '</td>' + (fila ? fila.map(function (v) { return '<td>' + v + '</td>'; }).join('') : '<td colspan="4">—</td>') + '</tr>';
            }).join('') + '</tbody><caption>Se multiplica por la masa unitaria compactada seca del agregado grueso, no por la masa suelta.</caption></table></div>';

        return h;
    }

    function dmEjemplo() {
        var C = global.MezclasCalc;
        if (!C || !C.disenoACI) return '<p class="dm-hint">No se encontró el motor de cálculo de mezclas.</p>';
        var p = {
            fc: 28, s: 0, slump: 100, tmn: 19, mf: 2.7, puc: 1600,
            gsC: 3.15, gsG: 2.68, gsF: 2.65, aire: 'atrapado',
            acMax: 0.50, wG: 0.8, absG: 0.6, wF: 2.0, absF: 1.2, volLab: 30
        };
        var r = C.disenoACI(p);
        if (!r || !r.ok) {
            return '<div class="tn-note tn-bad"><b>No fue posible calcular el ejemplo.</b> ' + esc(r && r.error ? r.error : 'Revisa los datos de entrada.') + '</div>';
        }
        var tanda = r.tanda || {};
        var h = '<div class="tn-example"><h5><span>5</span>Ejemplo ACI 211.1 calculado por la aplicación</h5>' +
            '<p>Datos: <b>f′c = 28 MPa</b>, sin registro de desviación estándar, asentamiento <b>100 mm</b>, <b>TMN = 19 mm</b>, <b>MF = 2.7</b>, agregado grueso con masa unitaria compactada <b>1 600 kg/m³</b>, Gs del cemento <b>3.15</b>, Gs de arena <b>2.65</b>, Gs de grava <b>2.68</b>. Humedades: arena <b>2.0 %</b>, grava <b>0.8 %</b>; absorciones: arena <b>1.2 %</b>, grava <b>0.6 %</b>.</p>' +
            '<div class="tn-grid">' +
            '<div class="tn-mini"><b>f\'cr</b><p>' + num(r.fcr, 1) + ' MPa</p></div>' +
            '<div class="tn-mini"><b>a/c de diseño</b><p>' + num(r.ac, 3) + ' (' + (r.controla === 'durabilidad' ? 'gobierna durabilidad' : 'gobierna resistencia') + ')</p></div>' +
            '<div class="tn-mini"><b>Agua</b><p>' + num(r.agua, 0) + ' kg/m³</p></div>' +
            '<div class="tn-mini"><b>Cemento</b><p>' + num(r.cemento, 0) + ' kg/m³</p></div>' +
            '<div class="tn-mini"><b>Arena seca</b><p>' + num(r.fino, 0) + ' kg/m³</p></div>' +
            '<div class="tn-mini"><b>Grava seca</b><p>' + num(r.grueso, 0) + ' kg/m³</p></div>' +
            '<div class="tn-mini"><b>Aire</b><p>' + num(r.aire, 1) + ' %</p></div>' +
            '<div class="tn-mini"><b>Peso unitario teórico</b><p>' + num(r.pesoUnitarioTeorico, 0) + ' kg/m³</p></div>' +
            '</div>';

        h += '<div class="tn-tablecap">Cantidades para 1 m³ y para la tanda de laboratorio de 30 L</div>' +
            '<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Material</th><th>1 m³ (kg)</th><th>Tanda 30 L (kg)</th></tr></thead><tbody>' +
            '<tr><td>Cemento</td><td>' + num(r.cemento, 1) + '</td><td>' + num(tanda.cemento, 2) + '</td></tr>' +
            '<tr><td>Agua corregida</td><td>' + num(r.aguaCorregida, 1) + '</td><td>' + num(tanda.agua, 2) + '</td></tr>' +
            '<tr><td>Arena húmeda</td><td>' + num(r.finoHumedo, 1) + '</td><td>' + num(tanda.fino, 2) + '</td></tr>' +
            '<tr><td>Grava húmeda</td><td>' + num(r.gruesoHumedo, 1) + '</td><td>' + num(tanda.grueso, 2) + '</td></tr>' +
            '</tbody></table></div>';

        h += '<div class="tn-note tn-ok"><b>Proporción en masa:</b> cemento : arena : grava = 1 : ' + num(r.proporcion.fino, 2) + ' : ' + num(r.proporcion.grueso, 2) + '. Agua aproximada: ' + num(r.proporcion.aguaLitros50kg, 1) + ' L por 50 kg de cemento. Aire: ' + num(r.aire, 1) + ' %.</div>';

        if (r.avisos && r.avisos.length) {
            h += '<div class="tn-note tn-warn"><b>Avisos del cálculo:</b><ul>' + r.avisos.map(function (a) { return '<li>' + esc(a) + '</li>'; }).join('') + '</ul></div>';
        }
        h += '<p class="tn-small">Este ejemplo es didáctico. La mezcla de obra debe verificarse con mezclas de prueba, ajuste de humedad y control de resistencia.</p></div>';
        return h;
    }

    function fillDM() {
        var tabla = doc.getElementById('tn-dm-aci-tabla');
        if (tabla) tabla.innerHTML = dmTables();
        var ej = doc.getElementById('tn-dm-aci-ejemplo');
        if (ej) ej.innerHTML = dmEjemplo();
    }

    /* ---------- renderizado de ecuaciones ---------- */
    var MATH_RE = /\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|\$\$([\s\S]*?)\$\$/g;

    function isSkipped(node) {
        var p = node.parentNode;
        while (p && p !== doc.body) {
            if (p.nodeType === 1) {
                var tag = p.tagName;
                if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'CODE' || tag === 'PRE' || tag === 'TEXTAREA') return true;
                if (p.classList && (p.classList.contains('katex') || p.classList.contains('tn-math'))) return true;
            }
            p = p.parentNode;
        }
        return false;
    }

    function renderMath(root) {
        if (!root) return;
        var walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
        var nodes = [], n;
        while ((n = walker.nextNode())) {
            if (n.nodeValue && n.nodeValue.indexOf('\\') !== -1 && !isSkipped(n)) nodes.push(n);
        }
        nodes.forEach(function (node) {
            var text = node.nodeValue;
            MATH_RE.lastIndex = 0;
            if (!MATH_RE.test(text)) return;
            MATH_RE.lastIndex = 0;
            var frag = doc.createDocumentFragment();
            var last = 0, m;
            while ((m = MATH_RE.exec(text))) {
                if (m.index > last) frag.appendChild(doc.createTextNode(text.slice(last, m.index)));
                var tex = (m[1] != null ? m[1] : (m[2] != null ? m[2] : m[3])).trim();
                var display = m[1] != null || m[3] != null;
                var span = doc.createElement('span');
                span.className = 'tn-math' + (display ? ' tn-math-block' : '');
                span.setAttribute('data-tex', tex);
                span.textContent = tex;
                frag.appendChild(span);
                last = m.index + m[0].length;
            }
            if (last < text.length) frag.appendChild(doc.createTextNode(text.slice(last)));
            node.parentNode.replaceChild(frag, node);
        });

        var targets = root.querySelectorAll('[data-tex]');
        if (!targets.length) return;
        if (!global.katex || typeof global.katex.render !== 'function') {
            targets.forEach(function (el) { el.classList.add('tn-math-fallback'); });
            return;
        }
        targets.forEach(function (el) {
            var tex = el.getAttribute('data-tex');
            if (!tex || el.getAttribute('data-rendered') === '1') return;
            try {
                global.katex.render(tex, el, {
                    displayMode: el.classList.contains('tn-math-block'),
                    throwOnError: false,
                    strict: 'ignore',
                    trust: false,
                    errorColor: '#ffb4ae'
                });
                el.setAttribute('data-rendered', '1');
                el.classList.remove('tn-math-fallback');
            } catch (e) {
                el.classList.add('tn-math-fallback');
                el.textContent = tex;
            }
        });
    }

    function renderAllMath() {
        Object.keys(MODULES).forEach(function (k) {
            var mod = MODULES[k];
            var host = doc.getElementById(mod.host);
            if (host) renderMath(host);
        });
    }

    function retryMath() {
        var tries = 0;
        (function again() {
            if (global.katex || tries >= 12) { renderAllMath(); return; }
            tries++;
            setTimeout(again, 250);
        })();
    }

    /* ---------- arranque ---------- */
    function init() {
        ['ms1', 'ms2', 'rm', 'dm', 'est'].forEach(function (key) {
            var mod = MODULES[key];
            if (!mod) return;
            var host = doc.getElementById(mod.host);
            if (!host) return;
            if (host.getAttribute('data-tn') === '1') return;
            host.innerHTML = renderModule(mod);
            host.setAttribute('data-tn', '1');
            bind(host, mod);
        });
        fillDM();
        renderAllMath();
        retryMath();
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init);
    else init();

    global.TN = { modules: MODULES, renderMath: renderMath, renderAll: init };
})(window);
