/**
 * GeoMetrics — Teoría uniforme
 * Convierte la teoría de Mecánica de Suelos I, Mecánica de Suelos II y Resistencia de Materiales
 * a la misma estructura que "Diseño de mezclas" (clases .dm-*, definidas en css/mezclas.css):
 *   encabezado · índice lateral sticky · secciones numeradas · fórmulas · ruta de trabajo · bibliografía.
 * El contenido de cada tema se conserva tal cual está en index.html.
 */
(function (global) {
    'use strict';
    var doc = document;

    var CFG = {
        'ms1-teoria': {
            screen: 'pantallaSuelos', tab: 'ms1-ensayos', prefix: 'ms1',
            desc: 'Humedad, granulometría, límites de Atterberg, gravedad específica, compactación y clasificación SUCS: los fundamentos y las ecuaciones que usa cada ensayo del laboratorio.',
            ruta: [
                ['Contenido de humedad', 'Masa de agua / masa de sólidos', '#ms1-ensayos .ensayo-card[data-ensayo="humedad"]'],
                ['Granulometría', 'Curva granulométrica, D10, D30, D60', '#ms1-ensayos .ensayo-card[data-ensayo="granulometria"]'],
                ['Límites de Atterberg', 'LL, LP, IP y carta de plasticidad', '#ms1-ensayos .ensayo-card[data-ensayo="limites"]'],
                ['Clasificación SUCS', 'Grupo del suelo y símbolo', '#ms1-ensayos .ensayo-card[data-ensayo="clasificacion"]']
            ],
            bib: [
                'Das, B. M. <em>Fundamentos de ingeniería geotécnica</em>. Cengage Learning.',
                'Juárez Badillo, E. y Rico Rodríguez, A. <em>Mecánica de suelos, Tomo I: Fundamentos de la mecánica de suelos</em>. Limusa.',
                'Lambe, T. W. y Whitman, R. V. <em>Mecánica de suelos</em>. Limusa.',
                'Reglamento Colombiano de Construcción Sismo Resistente <em>NSR-10</em>, Título H — Estudios geotécnicos.',
                'ASTM D2216, D6913 / D422, D4318, D854, D698 / D1557, D2487 · INV E-122, E-123, E-125, E-126, E-128, E-141, E-142 (normas INVIAS equivalentes).'
            ]
        },
        'ms2-teoria': {
            screen: 'pantallaSuelos2', tab: 'ms2-ensayos', prefix: 'ms2',
            desc: 'Resistencia al corte, capacidad de carga, empujes de tierra, cimentaciones y estabilidad de taludes, con las ecuaciones de los ensayos de corte directo, compresión inconfinada, consolidación y triaxial.',
            ruta: [
                ['Corte directo', 'Envolvente de Mohr-Coulomb: c y φ', '#ms2-ensayos .ensayo-card[data-ensayo-ms2="corte"]'],
                ['Compresión inconfinada', 'qu y cohesión cu = qu/2', '#ms2-ensayos .ensayo-card[data-ensayo-ms2="inconfinada"]'],
                ['Consolidación', 'Cv, Cc y presión de preconsolidación', '#ms2-ensayos .ensayo-card[data-ensayo-ms2="consolidacion"]'],
                ['Ensayo triaxial', 'Círculos de Mohr: UU, CU y CD', '#ms2-ensayos .ensayo-card[data-ensayo-ms2="triaxial"]']
            ],
            bib: [
                'Das, B. M. <em>Principios de ingeniería de cimentaciones</em>. Cengage Learning.',
                'Terzaghi, K., Peck, R. B. y Mesri, G. <em>Soil Mechanics in Engineering Practice</em>, 3.ª ed. Wiley.',
                'Juárez Badillo, E. y Rico Rodríguez, A. <em>Mecánica de suelos, Tomo II: Teoría y aplicaciones de la mecánica de suelos</em>. Limusa.',
                'Bowles, J. E. <em>Foundation Analysis and Design</em>. McGraw-Hill.',
                'Reglamento Colombiano de Construcción Sismo Resistente <em>NSR-10</em>, Título H — Estudios geotécnicos.',
                'ASTM D3080, D2166, D2435, D2850, D4767 · INV E-154, E-152, E-151, E-153.'
            ]
        },
        'rm-teoria': {
            screen: 'pantallaResistencia', tab: 'rm-ensayos', prefix: 'rm',
            desc: 'Propiedades de los materiales, esfuerzos y deformaciones, torsión, flexión, cortante, transformación de esfuerzos, deflexiones y pandeo, con las ecuaciones que respaldan los ensayos y simuladores.',
            ruta: [
                ['Tracción', 'Curva σ–ε, E, σy y σu', '#rm-ensayos .ensayo-card[data-ensayo="traccion"]'],
                ['Compresión', 'Resistencia y módulo en compresión', '#rm-ensayos .ensayo-card[data-ensayo="compresion"]'],
                ['Flexión', 'Módulo de ruptura de la viga', '#rm-ensayos .ensayo-card[data-ensayo="flexion"]'],
                ['Torsión', 'τ, γ, G y ángulo de giro', '#rm-ensayos .ensayo-card[data-ensayo="torsion"]']
            ],
            bib: [
                'Beer, F. P., Johnston, E. R., DeWolf, J. T. y Mazurek, D. F. <em>Mecánica de materiales</em>. McGraw-Hill.',
                'Hibbeler, R. C. <em>Mecánica de materiales</em>. Pearson.',
                'Gere, J. M. y Goodno, B. J. <em>Mecánica de materiales</em>. Cengage Learning.',
                'Pytel, A. y Singer, F. L. <em>Resistencia de materiales</em>. Oxford University Press.',
                'ASTM E8/E8M (tracción), E9 (compresión) y E18 (dureza Rockwell).'
            ]
        }
    };

    function clean(t) { return (t || '').replace(/^\s*\d+\s*[.)]\s*/, '').trim(); }

    function irAEnsayo(cfg, sel) {
        var scr = doc.getElementById(cfg.screen);
        var tab = scr && scr.querySelector('.tab-btn[data-tab="' + cfg.tab + '"]');
        if (tab && !tab.classList.contains('active')) tab.click();
        setTimeout(function () {
            var card = doc.querySelector(sel);
            if (card) card.click();
            global.scrollTo(0, 0);
        }, 80);
    }

    function convertir(sectionId, cfg) {
        var host = doc.getElementById(sectionId);
        var old = host && host.querySelector('.teoria-container');
        if (!old || old.getAttribute('data-uniforme')) return;
        var h3 = old.querySelector(':scope > h3');
        var items = Array.prototype.slice.call(old.querySelectorAll(':scope > .teoria-seccion'));
        var titulo = h3 ? h3.textContent.trim() : 'Contenido programático';
        var pf = 'dm-t-' + cfg.prefix + '-';

        /* lista de secciones: ruta + temas + bibliografía */
        var secs = [{ id: 'ruta', t: 'Ruta de trabajo' }];
        items.forEach(function (it, i) {
            var h4 = it.querySelector('h4');
            secs.push({ id: 's' + (i + 1), t: clean(h4 ? h4.textContent : 'Tema ' + (i + 1)), node: it });
        });
        secs.push({ id: 'bib', t: 'Bibliografía y normas' });

        var wrap = doc.createElement('div');
        wrap.className = 'dm dm-teoria';
        wrap.setAttribute('data-uniforme', '1');

        var toc = '<nav class="dm-toc" aria-label="Contenido de la teoría"><b>Contenido</b>' + secs.map(function (s, i) {
            return '<a href="#' + pf + s.id + '" data-t="' + s.id + '"><span>' + (i + 1) + '</span>' + s.t + '</a>';
        }).join('') + '</nav>';

        var body = '';
        secs.forEach(function (s, i) {
            var num = i + 1, inner = '';
            if (s.id === 'ruta') {
                inner = '<div class="dm-ruta">' + cfg.ruta.map(function (r, k) {
                    return '<a href="#" class="dm-paso" data-go="' + k + '"><span>' + (k + 1) + '</span><b>' + r[0] + '</b><small>' + r[1] + '</small></a>';
                }).join('') + '</div>';
            } else if (s.id === 'bib') {
                inner = '<ul class="dm-bib">' + cfg.bib.map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>' +
                    '<p class="dm-hint">Verifica siempre la edición vigente de cada norma y las tablas originales antes de usar los resultados en un diseño real.</p>';
            } else {
                var tmp = doc.createElement('div');
                tmp.innerHTML = s.node.innerHTML;
                var h4 = tmp.querySelector('h4'); if (h4) h4.remove();
                tmp.querySelectorAll('.formula-box').forEach(function (f) { f.className = 'dm-formula'; });
                inner = tmp.innerHTML;
            }
            body += '<section class="dm-sec" id="' + pf + s.id + '"><h4><span>' + num + '</span>' + s.t + '</h4>' + inner + '</section>';
        });

        wrap.innerHTML = '<header class="dm-teohead"><h3>' + titulo + '</h3><p>' + cfg.desc + '</p></header>' +
            '<div class="dm-teolayout">' + toc + '<div class="dm-teobody">' + body + '</div></div>';

        old.parentNode.replaceChild(wrap, old);

        /* navegación del índice */
        wrap.querySelectorAll('.dm-toc a').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                var t = doc.getElementById(pf + a.getAttribute('data-t'));
                if (t) t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
        wrap.querySelectorAll('[data-go]').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                irAEnsayo(cfg, cfg.ruta[parseInt(a.getAttribute('data-go'), 10)][2]);
            });
        });
        /* resalta la sección visible */
        if ('IntersectionObserver' in global) {
            var links = {};
            wrap.querySelectorAll('.dm-toc a').forEach(function (a) { links[a.getAttribute('data-t')] = a; });
            var io = new IntersectionObserver(function (es) {
                es.forEach(function (en) {
                    if (!en.isIntersecting) return;
                    Object.keys(links).forEach(function (k) { links[k].classList.remove('is-on'); });
                    var k = en.target.id.replace(pf, ''); if (links[k]) links[k].classList.add('is-on');
                });
            }, { rootMargin: '-15% 0px -70% 0px' });
            wrap.querySelectorAll('.dm-sec').forEach(function (s) { io.observe(s); });
        }
    }

    function init() { Object.keys(CFG).forEach(function (id) { convertir(id, CFG[id]); }); }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', init); else init();
})(window);
