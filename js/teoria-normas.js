/* =========================================================
   GeoMetrics — Renderizador de teoría con enfoque normativo
   Requiere: js/teoria-ms1.js, teoria-ms2.js, teoria-rm.js,
             teoria-dm.js, teoria-est.js y KaTeX (index.html).
   Diseño «laboratorio»: barra superior con buscador, cabecera
   de la asignatura, índice lateral con progreso, portada con
   ilustración y ruta de trabajo en tarjetas (css/teoria-diseno.css).
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

    function pad(n) { return (n < 10 ? '0' : '') + n; }

    function norm(s) {
        return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    }

    function store(k, v) {
        try {
            if (v === undefined) return localStorage.getItem(k);
            localStorage.setItem(k, v);
        } catch (e) {}
        return null;
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

    /* Texto plano de una sección (para el buscador): sin etiquetas ni TeX */
    function plain(html) {
        return String(html || '')
            .replace(/\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)/g, ' … ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ').trim();
    }

    /* ---------- iconos (trazo, 24×24) ---------- */
    var IC = {
        drop: '<path d="M12 3.5s6 6.4 6 10.8a6 6 0 0 1-12 0C6 9.9 12 3.5 12 3.5z"/>',
        sieve: '<path d="M4 7h16l-1.8 8.6A3 3 0 0 1 15.3 18H8.7a3 3 0 0 1-2.9-2.4z"/><path d="M8.5 11h7M9.5 14h5"/>',
        beaker: '<path d="M6.5 4h11M8 4v12.5A3.5 3.5 0 0 0 11.5 20h1a3.5 3.5 0 0 0 3.5-3.5V4"/><path d="M8 10h8"/>',
        flask: '<path d="M9 3.5h6M10 3.5v6L5.2 17.6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.8-2.9L14 9.5v-6"/><path d="M7.6 15h8.8"/>',
        hammer: '<path d="M13 6.5l4.5 4.5M3.5 20.5l9-9"/><path d="M11.5 4.5l2-2 8 8-2 2z"/>',
        pin: '<path d="M12 21s6.5-5.9 6.5-11a6.5 6.5 0 0 0-13 0c0 5.1 6.5 11 6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
        layers: '<path d="M12 3.5l8.5 4.7L12 13 3.5 8.2z"/><path d="M3.5 12.4L12 17.2l8.5-4.8"/><path d="M3.5 16.4L12 21.2l8.5-4.8"/>',
        shear: '<rect x="4" y="5" width="16" height="6" rx="1"/><rect x="4" y="13" width="16" height="6" rx="1"/><path d="M1.5 8h3M19.5 16h3"/>',
        compress: '<path d="M12 2.5v6M9 5.8l3 3 3-3"/><rect x="7" y="11" width="10" height="10" rx="1.2"/>',
        gauge: '<circle cx="12" cy="13" r="8"/><path d="M12 13l3.8-3.2M12 3v2"/>',
        circles: '<path d="M2.5 18a6 6 0 0 1 12 0"/><path d="M8.5 18a7 7 0 0 1 13 0"/><path d="M2 18h20"/>',
        tension: '<path d="M3 12h18M6.5 8.5L3 12l3.5 3.5M17.5 8.5L21 12l-3.5 3.5"/>',
        bend: '<path d="M3 9c6 5.5 12 5.5 18 0"/><path d="M12 3.5v5"/><path d="M3 17h18" opacity=".45"/>',
        twist: '<path d="M4.5 12a7.5 7.5 0 0 1 13-5.1"/><path d="M18 3v4.2h-4.2"/><path d="M19.5 12a7.5 7.5 0 0 1-13 5.1"/><path d="M6 21v-4.2h4.2"/>',
        diamond: '<path d="M12 3l7.5 7.2L12 21 4.5 10.2z"/><path d="M4.5 10.2h15"/>',
        calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8.5 7h7M8.5 11.5h1.5M12 11.5h1.5M15.5 11.5h0M8.5 15.5h1.5M12 15.5h1.5"/>',
        cone: '<path d="M9.2 4h5.6l3.5 16H5.7z"/><path d="M7.5 12h9"/>',
        section: '<path d="M4 4.5h16v4h-6v11h-4v-11H4z"/>',
        support: '<path d="M3 9h18"/><path d="M7 9l-3 6h6zM17 9l-3 6h6z"/><path d="M3 18.5h18"/>',
        beam: '<path d="M3 10h18"/><path d="M5 10l-2.5 4.5h5zM19 10l-2.5 4.5h5z"/><path d="M6 4v3.5M10 4v3.5M14 4v3.5M18 4v3.5"/>',
        cant: '<path d="M4 3.5v17"/><path d="M4 10h15"/><path d="M19 4.5v4"/><path d="M4 14c5 0 10-1 15-3.5" stroke-dasharray="2 2"/>',
        truss: '<path d="M2.5 18h19M2.5 18L7 9.5l5 8.5 5-8.5 4.5 8.5M7 9.5h10"/>',
        frame: '<path d="M5.5 20V6.5h13V20"/><path d="M3 20h5M16 20h5"/><path d="M2 6.5h3"/>',
        matrix: '<path d="M7 4H4v16h3M17 4h3v16h-3"/><path d="M8.5 9h2M13.5 9h2M8.5 15h2M13.5 15h2"/>',
        book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23"/><path d="M8.5 7.5h7"/>',
        lab: '<path d="M9 3.5h6M10 3.5v6L5.2 17.6A2 2 0 0 0 7 20.5h10a2 2 0 0 0 1.8-2.9L14 9.5v-6"/>',
        spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>',
        chat: '<path d="M4 5h16v11H9l-5 4z"/>',
        search: '<circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/>',
        back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
        arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
        warn: '<path d="M12 3.5L2.5 20h19z"/><path d="M12 10v4.5M12 17.2v.3"/>',
        chev: '<path d="M6 9l6 6 6-6"/>',
        check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>'
    };
    function ic(name, cls) {
        return '<svg class="tnx-ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[name] || IC.book) + '</svg>';
    }

    /* ---------- ilustraciones de la portada ---------- */
    var C = { cyan: '#22D3EE', purple: '#A78BFA', amber: '#FBBF24', green: '#34D399', slate: '#64748B', ink: '#CBD5E1' };
    var SVG_OPEN = '<svg class="tnx-ill" viewBox="0 0 240 280" role="img" font-family="JetBrains Mono, Consolas, monospace" font-size="11" aria-label="';
    var ILL = {
        fases: function () {
            return SVG_OPEN + 'Diagrama de fases del suelo: aire, agua y sólidos">' +
                '<rect x="70" y="18" width="110" height="50" fill="rgba(148,163,184,.10)" stroke="' + C.slate + '"/>' +
                '<rect x="70" y="68" width="110" height="68" fill="rgba(34,211,238,.16)" stroke="' + C.cyan + '"/>' +
                '<rect x="70" y="136" width="110" height="92" fill="rgba(251,191,36,.18)" stroke="' + C.amber + '"/>' +
                '<text x="125" y="47" text-anchor="middle" fill="' + C.ink + '">AIRE</text>' +
                '<text x="125" y="106" text-anchor="middle" fill="' + C.cyan + '">AGUA</text>' +
                '<text x="125" y="186" text-anchor="middle" fill="' + C.amber + '">SÓLIDOS</text>' +
                '<path d="M52 18v118M47 18h10M47 136h10M52 136v92M47 228h10" stroke="' + C.slate + '"/>' +
                '<text x="38" y="81" text-anchor="middle" fill="' + C.ink + '">Vv</text>' +
                '<text x="38" y="186" text-anchor="middle" fill="' + C.ink + '">Vs</text>' +
                '<path d="M198 68v68M193 68h10M193 136h10M198 136v92M193 228h10" stroke="' + C.purple + '"/>' +
                '<text x="214" y="106" fill="' + C.purple + '">Mw</text>' +
                '<text x="214" y="186" fill="' + C.purple + '">Ms</text>' +
                '<text x="125" y="258" text-anchor="middle" fill="' + C.ink + '">w = Mw / Ms · 100</text></svg>';
        },
        mohr: function () {
            return SVG_OPEN + 'Círculos de Mohr y envolvente de falla de Mohr-Coulomb">' +
                '<path d="M30 222H230M30 222V24" stroke="' + C.slate + '"/>' +
                '<text x="224" y="238" fill="' + C.ink + '">σ</text><text x="16" y="30" fill="' + C.ink + '">τ</text>' +
                '<path d="M35 222A50 50 0 0 1 135 222" fill="rgba(34,211,238,.10)" stroke="' + C.cyan + '" stroke-width="2"/>' +
                '<path d="M73 222A77 77 0 0 1 227 222" fill="rgba(167,139,250,.10)" stroke="' + C.purple + '" stroke-width="2"/>' +
                '<path d="M30 192L232 101" stroke="' + C.amber + '" stroke-width="2"/>' +
                '<circle cx="30" cy="192" r="4" fill="' + C.amber + '"/>' +
                '<text x="38" y="186" fill="' + C.amber + '">c</text>' +
                '<text x="196" y="94" fill="' + C.amber + '">φ</text>' +
                '<text x="130" y="262" text-anchor="middle" fill="' + C.ink + '">τ = c + σ′ tan φ</text></svg>';
        },
        curva: function () {
            return SVG_OPEN + 'Curva esfuerzo-deformación con fluencia, resistencia última y fractura">' +
                '<path d="M30 222H230M30 222V24" stroke="' + C.slate + '"/>' +
                '<text x="224" y="238" fill="' + C.ink + '">ε</text><text x="16" y="30" fill="' + C.ink + '">σ</text>' +
                '<path d="M30 222L68 96L92 99C118 62 148 52 168 54C190 56 204 68 214 86" fill="none" stroke="' + C.cyan + '" stroke-width="2.2"/>' +
                '<path d="M68 96H30M168 54H30" stroke="' + C.slate + '" stroke-dasharray="3 4"/>' +
                '<circle cx="68" cy="96" r="4.5" fill="' + C.purple + '"/><circle cx="168" cy="54" r="4.5" fill="' + C.amber + '"/>' +
                '<path d="M209 81l10 10M219 81l-10 10" stroke="' + C.green + '" stroke-width="2"/>' +
                '<text x="76" y="118" fill="' + C.purple + '">σy</text><text x="160" y="40" fill="' + C.amber + '">σu</text>' +
                '<text x="186" y="112" fill="' + C.green + '">fractura</text>' +
                '<text x="54" y="176" fill="' + C.ink + '">E</text>' +
                '<text x="130" y="262" text-anchor="middle" fill="' + C.ink + '">σ = P / A₀ · E = σ / ε</text></svg>';
        },
        mezcla: function () {
            var parts = [['AIRE', 6, 'rgba(148,163,184,.10)', C.slate, '2 %'], ['AGUA', 36, 'rgba(34,211,238,.16)', C.cyan, '18 %'],
                ['CEMENTO', 24, 'rgba(203,213,225,.14)', C.ink, '11 %'], ['ARENA', 52, 'rgba(251,191,36,.18)', C.amber, '26 %'],
                ['GRAVA', 84, 'rgba(167,139,250,.16)', C.purple, '43 %']];
            var y = 18, h = SVG_OPEN + 'Composición típica por volumen de 1 metro cúbico de concreto">';
            parts.forEach(function (p) {
                h += '<rect x="62" y="' + y + '" width="110" height="' + p[1] + '" fill="' + p[2] + '" stroke="' + p[3] + '"/>';
                var cy = y + p[1] / 2 + 4;
                if (p[1] >= 20) h += '<text x="117" y="' + cy + '" text-anchor="middle" fill="' + p[3] + '">' + p[0] + '</text>';
                else h += '<text x="117" y="' + (y - 3) + '" text-anchor="middle" fill="' + p[3] + '" font-size="9">' + p[0] + '</text>';
                h += '<text x="184" y="' + cy + '" fill="' + p[3] + '">' + p[4] + '</text>';
                y += p[1];
            });
            h += '<path d="M46 18v' + (y - 18) + 'M41 18h10M41 ' + y + 'h10" stroke="' + C.slate + '"/>' +
                '<text x="30" y="' + ((y + 18) / 2 + 4) + '" text-anchor="middle" fill="' + C.ink + '">1 m³</text>' +
                '<text x="120" y="248" text-anchor="middle" fill="' + C.ink + '">Σ Vᵢ = 1 m³</text>' +
                '<text x="120" y="266" text-anchor="middle" fill="' + C.slate + '" font-size="9.5">volumen absoluto típico</text></svg>';
            return h;
        },
        viga: function () {
            var arrows = '';
            for (var x = 40; x <= 200; x += 20) arrows += '<path d="M' + x + ' 38v26M' + (x - 4) + ' 58l4 6 4-6" stroke="' + C.purple + '"/>';
            return SVG_OPEN + 'Viga simplemente apoyada con carga distribuida, deformada y diagrama de momento">' +
                '<path d="M36 38H204" stroke="' + C.purple + '"/>' + arrows +
                '<text x="214" y="42" fill="' + C.purple + '">w</text>' +
                '<path d="M30 80H210" stroke="' + C.ink + '" stroke-width="3"/>' +
                '<path d="M30 80l-9 15h18z" fill="none" stroke="' + C.ink + '"/><path d="M210 80l-9 13h18z" fill="none" stroke="' + C.ink + '"/>' +
                '<circle cx="204" cy="97" r="2.6" fill="none" stroke="' + C.ink + '"/><circle cx="216" cy="97" r="2.6" fill="none" stroke="' + C.ink + '"/>' +
                '<path d="M30 80Q120 124 210 80" fill="none" stroke="' + C.cyan + '" stroke-width="2" stroke-dasharray="5 4"/>' +
                '<text x="120" y="118" text-anchor="middle" fill="' + C.cyan + '">δ</text>' +
                '<path d="M30 150H210" stroke="' + C.slate + '"/>' +
                '<path d="M30 150Q120 240 210 150Z" fill="rgba(251,191,36,.16)" stroke="' + C.amber + '" stroke-width="2"/>' +
                '<text x="120" y="186" text-anchor="middle" fill="' + C.amber + '">M máx = wL²/8</text>' +
                '<path d="M30 214H210M30 209v10M210 209v10" stroke="' + C.slate + '"/>' +
                '<text x="120" y="230" text-anchor="middle" fill="' + C.ink + '">L</text>' +
                '<text x="120" y="262" text-anchor="middle" fill="' + C.ink + '">δ máx = 5wL⁴ / 384EI</text></svg>';
        }
    };

    /* ---------- datos de diseño por asignatura ---------- */
    var CY = C.cyan, PU = C.purple, AM = C.amber, GR = C.green;
    var DESIGN = {
        ms1: {
            code: 'MS-I', accent: 'Suelos I', heroAccent: 'trifásico', ill: 'fases',
            short: 'Los ensayos que sostienen la práctica geotécnica colombiana, en el orden en que se ejecutan. Cada tema incluye la ecuación, su interpretación, un ejemplo resuelto y la norma que lo respalda.',
            cats: { ind: ['Propiedades índice', CY], pla: ['Plasticidad', PU], com: ['Compactación', AM], beh: ['Comportamiento', GR] },
            route: {
                humedad: ['drop', 'ind', 'INV E-122'], granulometria: ['sieve', 'ind', 'INV E-123'],
                limites: ['beaker', 'pla', 'INV E-125/126'], gravedad: ['flask', 'ind', 'INV E-128'],
                compactacion: ['hammer', 'com', 'INV E-141/142'], densidad: ['pin', 'com', 'INV E-161'],
                permeabilidad: ['drop', 'beh', 'ASTM D2434'], clasificacion: ['layers', 'beh', 'ASTM D2487']
            }
        },
        ms2: {
            code: 'MS-II', accent: 'Suelos II', heroAccent: 'resistencia', ill: 'mohr',
            short: 'De la resistencia al corte medida en el laboratorio al diseño de cimentaciones, muros y taludes. Cada tema enlaza la ecuación con el ensayo que entrega sus parámetros.',
            cats: { res: ['Resistencia al corte', CY], def: ['Deformación', AM] },
            route: {
                corte: ['shear', 'res', 'INV E-154'], inconfinada: ['compress', 'res', 'INV E-152'],
                consolidacion: ['gauge', 'def', 'INV E-151'], triaxial: ['circles', 'res', 'INV E-153']
            }
        },
        rm: {
            code: 'RM', accent: 'Materiales', heroAccent: 'deforma', ill: 'curva',
            short: 'Esfuerzos, deformaciones y modos de falla, con las ecuaciones que respaldan cada ensayo: tracción, compresión, flexión, torsión y dureza.',
            cats: { axi: ['Carga axial', CY], fle: ['Flexión y torsión', PU], sup: ['Superficie', AM] },
            route: {
                traccion: ['tension', 'axi', 'ASTM E8'], compresion: ['compress', 'axi', 'ASTM E9'],
                flexion: ['bend', 'fle', 'ASTM E290'], torsion: ['twist', 'fle', 'ASTM E143'],
                dureza: ['diamond', 'sup', 'ASTM E18 · E10']
            }
        },
        dm: {
            code: 'DM', accent: 'Mezclas', eyebrow: 'Concreto y control de calidad', heroAccent: 'criterio', ill: 'mezcla',
            short: 'Del agregado al cilindro de 28 días: caracterizar los materiales, proporcionar con ACI 211.1, ajustar la mezcla de prueba y controlar la resistencia.',
            cats: { mat: ['Materiales', CY], dis: ['Diseño', PU], ctl: ['Control', GR] },
            route: {
                granulometria: ['sieve', 'mat', 'NTC 77 · 176 · 237'], aci211: ['calc', 'dis', 'ACI 211.1'],
                revenimiento: ['cone', 'ctl', 'NTC 396'], compresion: ['compress', 'ctl', 'NTC 673']
            }
        },
        est: {
            code: 'EST-I', accent: 'I', eyebrow: 'Análisis estructural', heroAccent: 'desplazamientos', ill: 'viga',
            short: 'Modelar la estructura, verificar su estabilidad y calcular reacciones, fuerzas internas y desplazamientos con métodos energéticos, de rigidez y aproximados.',
            cats: { geo: ['Geometría y estabilidad', CY], iso: ['Isostáticas', PU], hip: ['Métodos de análisis', AM] },
            route: {
                centroides: ['section', 'geo', 'SECCIONES'], indeterminacion: ['support', 'geo', 'ESTABILIDAD'],
                viga: ['beam', 'iso', 'VIGAS'], voladizo: ['cant', 'iso', 'VOLADIZOS'], cercha: ['truss', 'iso', 'CERCHAS'],
                portico: ['frame', 'hip', 'PÓRTICOS'], rigidez: ['matrix', 'hip', 'RIGIDEZ'], continuas: ['bend', 'hip', 'HIPERESTÁTICAS']
            }
        }
    };

    function design(mod) { return DESIGN[mod.key] || { code: String(mod.key || '').toUpperCase(), cats: {}, route: {} }; }

    /* resalta la primera aparición de `word` dentro de `text` (ya escapado) */
    function accent(text, word) {
        var t = esc(text);
        if (!word) return t;
        var w = esc(word), i = t.lastIndexOf(w);
        if (word === 'I' || word === 'II') i = t.lastIndexOf(' ' + w) + 1;
        else i = t.indexOf(w);
        if (i < 0) return t;
        return t.slice(0, i) + '<span class="tnx-acc">' + w + '</span>' + t.slice(i + w.length);
    }

    function eyebrowRest(mod) {
        var parts = String(mod.eyebrow || '').split('·');
        return (parts.length > 1 ? parts.slice(1).join('·') : parts[0]).trim();
    }

    /* ---------- render de un módulo ---------- */
    function allSections(mod) {
        return [{ id: 'ruta', t: 'Ruta de trabajo' }]
            .concat((mod.sections || []).map(function (s) { return { id: s.id, t: s.title, html: s.html }; }))
            .concat([{ id: 'bib', t: 'Normas y referencias' }]);
    }

    function routeCard(mod, D, r, i) {
        var meta = D.route[r.go] || ['book', '', ''];
        var cat = D.cats[meta[1]];
        var color = cat ? cat[1] : C.cyan;
        return '<a href="#" class="tnx-step" data-go="' + esc(r.go) + '" style="--c:' + color + '">' +
            '<span class="tnx-step-top"><span class="tnx-step-ic">' + ic(meta[0]) + '</span><span class="tnx-step-n">' + pad(i + 1) + '</span></span>' +
            '<span class="tnx-step-title"><b>' + esc(r.t) + '</b><span class="tnx-badge" hidden></span></span>' +
            '<small>' + esc(r.d) + '</small>' +
            '<span class="tnx-step-foot"><code>' + esc(meta[2] || (cat ? cat[0] : '')) + '</code>' + ic('arrow') + '</span>' +
            (cat ? '<span class="tnx-sr">Categoría: ' + esc(cat[0]) + '</span>' : '') +
        '</a>';
    }

    function renderModule(mod) {
        var D = design(mod);
        var all = allSections(mod);
        var total = all.length;
        var P = mod.prefix;

        /* índice lateral */
        var toc = all.map(function (s, i) {
            return '<a href="#' + P + '-t-' + s.id + '" data-t="' + s.id + '"><span>' + pad(i + 1) + '</span><em>' + esc(s.t) + '</em></a>';
        }).join('');
        var side = '<aside class="tnx-side" aria-label="Contenido de la teoría">' +
            '<button type="button" class="tnx-side-toggle" aria-expanded="false">' +
                '<span>Contenido</span><span class="tnx-count">1 / ' + total + '</span>' + ic('chev', 'tnx-chev') +
            '</button>' +
            '<div class="tnx-side-head"><span>Contenido</span><span class="tnx-count">1 / ' + total + '</span></div>' +
            '<div class="tnx-prog" role="progressbar" aria-label="Avance en el índice" aria-valuemin="1" aria-valuemax="' + total + '" aria-valuenow="1"><i></i></div>' +
            '<nav class="tnx-toc">' + toc + '</nav>' +
        '</aside>';

        /* portada */
        var tags = (mod.tags || []).map(function (t) { return '<span class="tnx-tag">' + esc(t) + '</span>'; }).join('');
        var stats = (mod.stats || []).map(function (s) {
            var v = s[0], l = s[1];
            if (/secciones/i.test(l)) { v = String(total); l = 'secciones'; }
            return '<li><strong>' + esc(String(v).replace(/\s+%/, '%')) + '</strong><em>' + esc(l) + '</em></li>';
        }).join('');
        var hero = '<header class="tnx-hero tnx-panel">' +
            '<div class="tnx-hero-text">' +
                '<span class="tnx-eye">// Ruta de aprendizaje</span>' +
                '<h3>' + accent(mod.title, D.heroAccent) + '</h3>' +
                '<p>' + esc(D.short || mod.desc) + '</p>' +
                '<div class="tnx-tags">' + tags + '</div>' +
                '<div class="tnx-cta">' +
                    '<button type="button" class="tnx-btn tnx-btn-pri" data-tnx-act="start">' + ic('arrow') + 'Empezar ruta</button>' +
                    '<button type="button" class="tnx-btn" data-tnx-act="ensayos">' + ic('lab') + 'Ir a ensayos</button>' +
                '</div>' +
            '</div>' +
            (ILL[D.ill] ? '<div class="tnx-hero-ill">' + ILL[D.ill]() + '</div>' : '') +
            '<ul class="tnx-stats">' + stats + '</ul>' +
        '</header>';

        var scope = mod.scope ? '<div class="tnx-scope" role="note">' + ic('warn') + '<div>' + mod.scope + '</div></div>' : '';

        /* secciones */
        var body = '';
        all.forEach(function (s, i) {
            var n = pad(i + 1), inner = '', head = '';
            if (s.id === 'ruta') {
                var legend = Object.keys(D.cats).map(function (k) {
                    return '<li style="--c:' + D.cats[k][1] + '"><i></i>' + esc(D.cats[k][0]) + '</li>';
                }).join('');
                head = '<header class="tnx-sechead tnx-sechead-row"><div>' +
                    '<span class="tnx-eye">// ' + n + ' · Ruta de trabajo</span><h4>Ruta de trabajo</h4>' +
                    '<p class="tnx-sub">Organizada en el mismo orden en que se ejecutan los ensayos y se toman las decisiones.</p></div>' +
                    (legend ? '<ul class="tnx-legend" aria-label="Categorías">' + legend + '</ul>' : '') + '</header>';
                inner = '<div class="tnx-route">' + (mod.route || []).map(function (r, k) { return routeCard(mod, D, r, k); }).join('') + '</div>';
            } else if (s.id === 'bib') {
                head = '<header class="tnx-sechead"><span class="tnx-eye">// ' + n + ' · Referencias</span><h4>' + esc(s.t) + '</h4></header>';
                inner = '<ul class="dm-bib">' + (mod.bib || []).map(function (b) { return '<li>' + b + '</li>'; }).join('') + '</ul>' +
                    '<p class="dm-hint">Verifica siempre la edición vigente de cada norma, las tablas originales y los requisitos particulares del proyecto. Las normas se citan como referencia técnica; este material no las reemplaza.</p>';
            } else {
                head = '<header class="tnx-sechead"><span class="tnx-eye">// ' + n + ' · ' + esc(D.code) + ' · Teoría</span><h4>' + esc(s.t) + '</h4></header>';
                inner = protectMath(s.html);
            }
            var prev = all[i - 1], next = all[i + 1];
            var pager = '<nav class="tnx-pager" aria-label="Navegación entre apartados">' +
                (prev ? '<button type="button" data-to="' + prev.id + '">' + ic('back') + '<span><small>Anterior</small>' + pad(i) + ' · ' + esc(prev.t) + '</span></button>' : '<span></span>') +
                (next ? '<button type="button" class="tnx-next" data-to="' + next.id + '"><span><small>Siguiente</small>' + pad(i + 2) + ' · ' + esc(next.t) + '</span>' + ic('arrow') + '</button>' : '<span></span>') +
            '</nav>';
            body += '<section class="dm-sec tnx-sec tnx-panel" id="' + P + '-t-' + s.id + '" data-n="' + (i + 1) + '">' + head + inner + pager + '</section>';
        });

        var foot = '<footer class="tnx-foot"><span>© ' + new Date().getFullYear() + ' GeoMetrics // ' + esc(D.subject || '') + '</span><span>Universidad de Pamplona · Ingeniería Civil</span></footer>';

        return '<div class="dm tn-teoria tnx" data-tn="1" data-key="' + esc(mod.key) + '">' + side +
            '<div class="tnx-main">' + hero + scope + '<div class="tnx-body">' + body + '</div>' + foot + '</div>' +
        '</div>';
    }

    /* ---------- navegación a ensayos ---------- */
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

    function openTeoriaTab(mod) {
        var scr = doc.getElementById(mod.screen);
        var tab = scr && scr.querySelector('.tab-btn[data-tab*="teoria"]');
        if (tab && !tab.classList.contains('active')) tab.click();
    }

    /* ---------- apartados y progreso ---------- */
    function showTeoriaSection(root, mod, id, opts) {
        if (!root || !id) return;
        var tnx = root.querySelector('.tnx');
        var secs = root.querySelectorAll('.tnx-sec');
        var idx = 0, total = secs.length;
        secs.forEach(function (s, i) {
            var on = s.id === mod.prefix + '-t-' + id;
            if (on) idx = i;
            s.classList.toggle('is-active', on);
            s.hidden = !on;
            s.style.display = on ? 'block' : 'none';
        });
        if (tnx) tnx.classList.toggle('tnx-on-ruta', id === 'ruta');
        root.querySelectorAll('.tnx-toc a').forEach(function (a) {
            var on = a.getAttribute('data-t') === id;
            a.classList.toggle('is-on', on);
            if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        });
        root.querySelectorAll('.tnx-count').forEach(function (c) { c.textContent = (idx + 1) + ' / ' + total; });
        var bar = root.querySelector('.tnx-prog');
        if (bar) {
            bar.setAttribute('aria-valuenow', String(idx + 1));
            var fill = bar.querySelector('i');
            if (fill) fill.style.width = (total ? ((idx + 1) / total) * 100 : 0) + '%';
        }
        store('gm_tnx_last_' + mod.key, id);
        var side = root.querySelector('.tnx-side');
        if (side && opts && opts.user) {
            side.classList.remove('is-open');
            var tg = side.querySelector('.tnx-side-toggle');
            if (tg) tg.setAttribute('aria-expanded', 'false');
        }
        if (opts && opts.scroll) {
            try {
                var target = doc.getElementById(mod.screen) || root;
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            } catch (e) {}
        }
        /* mantiene visible el elemento activo del índice */
        var act = root.querySelector('.tnx-toc a.is-on');
        var nav = root.querySelector('.tnx-toc');
        if (act && nav && nav.scrollHeight > nav.clientHeight) {
            var top = act.offsetTop - nav.clientHeight / 2;
            nav.scrollTop = Math.max(0, top);
        }
        try { renderMath(root); } catch (e) {}
    }

    /* tarjetas de la ruta: visto / en curso */
    function routeSeen(mod) {
        try { return JSON.parse(store('gm_tnx_route_' + mod.key) || '[]') || []; } catch (e) { return []; }
    }
    function markRoute(root, mod) {
        var seen = routeSeen(mod), current = false;
        root.querySelectorAll('.tnx-step').forEach(function (a) {
            var b = a.querySelector('.tnx-badge');
            var visto = seen.indexOf(a.getAttribute('data-go')) >= 0;
            a.classList.toggle('is-seen', visto);
            a.classList.remove('is-current');
            if (!b) return;
            if (visto) { b.hidden = false; b.className = 'tnx-badge tnx-badge-ok'; b.innerHTML = ic('check') + 'Visto'; }
            else if (!current) { current = true; a.classList.add('is-current'); b.hidden = false; b.className = 'tnx-badge'; b.innerHTML = '<i></i>En curso'; }
            else { b.hidden = true; }
        });
    }

    function bind(root, mod) {
        var ids = allSections(mod).map(function (s) { return s.id; });
        var last = store('gm_tnx_last_' + mod.key);
        showTeoriaSection(root, mod, ids.indexOf(last) >= 0 ? last : 'ruta');
        markRoute(root, mod);

        root.addEventListener('click', function (e) {
            var t = e.target;
            var link = t.closest('.tnx-toc a');
            if (link) { e.preventDefault(); showTeoriaSection(root, mod, link.getAttribute('data-t'), { user: true, scroll: true }); return; }
            var to = t.closest('[data-to]');
            if (to) { e.preventDefault(); showTeoriaSection(root, mod, to.getAttribute('data-to'), { user: true, scroll: true }); return; }
            var go = t.closest('[data-go]');
            if (go) {
                e.preventDefault();
                var g = go.getAttribute('data-go'), seen = routeSeen(mod);
                if (seen.indexOf(g) < 0) { seen.push(g); store('gm_tnx_route_' + mod.key, JSON.stringify(seen)); }
                markRoute(root, mod);
                openEnsayo(mod, g);
                return;
            }
            var act = t.closest('[data-tnx-act]');
            if (act) {
                var a = act.getAttribute('data-tnx-act');
                if (a === 'start') showTeoriaSection(root, mod, ids[1] || 'ruta', { user: true, scroll: true });
                else if (a === 'ensayos') {
                    var scr = doc.getElementById(mod.screen);
                    var tab = scr && scr.querySelector('.tab-btn[data-tab="' + mod.tab + '"]');
                    if (tab) tab.click();
                }
                return;
            }
            var tg = t.closest('.tnx-side-toggle');
            if (tg) {
                var side = tg.parentNode, open = !side.classList.contains('is-open');
                side.classList.toggle('is-open', open);
                tg.setAttribute('aria-expanded', open ? 'true' : 'false');
            }
        });
    }

    /* ---------- barra superior y cabecera de la asignatura ---------- */
    function userInfo() {
        var u = null;
        try { u = typeof global.aulaGetSession === 'function' ? global.aulaGetSession() : null; } catch (e) {}
        if (!u || !(u.nombre || u.email)) return null;
        var nombre = String(u.nombres || u.nombre || u.email).trim();
        var corto = nombre.split(/\s+/).slice(0, 2).join(' ');
        var ini = nombre.split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0); }).join('').toUpperCase();
        var rol = String(u.rol || '').toLowerCase();
        var rolTxt = rol === 'docente' ? 'Docente' : rol === 'admin' || rol === 'administrador' ? 'Administrador' : rol === 'estudiante' ? 'Estudiante' : (rol || 'Usuario');
        return { nombre: corto, ini: ini || '?', rol: rolTxt };
    }

    function paintUser(top) {
        var box = top.querySelector('.tnx-user');
        if (!box) return;
        var u = userInfo();
        box.hidden = !u;
        if (!u) return;
        box.querySelector('.tnx-av').textContent = u.ini;
        box.querySelector('b').textContent = u.nombre;
        box.querySelector('small').textContent = u.rol;
    }

    var TAB_IC = { teoria: 'book', ensayos: 'lab', simuladores: 'spark', chat: 'chat' };

    function enhanceScreen(mod) {
        var scr = doc.getElementById(mod.screen);
        if (!scr || scr.getAttribute('data-tnx') === '1') return;
        var head = scr.querySelector(':scope > header.seccion-encabezado');
        var tabs = scr.querySelector(':scope > .submenu-tabs');
        if (!head || !tabs) return;
        var D = design(mod);
        var h2 = head.querySelector('h2');
        var p = head.querySelector('.seccion-titulo p');
        var back = head.querySelector('.btn-volver');
        var subject = h2 ? h2.textContent.trim() : '';
        D.subject = subject;

        var top = doc.createElement('div');
        top.className = 'tnx-top';
        top.innerHTML =
            '<div class="tnx-brand">' +
                '<span class="tnx-logo"><img src="docs/logo_unipamplona.png" alt="Universidad de Pamplona" width="34" height="34"></span>' +
                '<span class="tnx-logo"><img src="docs/logo_ingenieria_civil.png" alt="Ingeniería Civil" width="34" height="34"></span>' +
                '<span class="tnx-bname"><b>GEO<i>METRICS</i></b><small>' + esc(D.code) + ' // Laboratorio</small></span>' +
            '</div>' +
            '<div class="tnx-search" role="search">' + ic('search') +
                '<input type="search" placeholder="buscar tema, ensayo o norma…" aria-label="Buscar en la teoría de ' + esc(subject) + '" autocomplete="off">' +
                '<div class="tnx-results" role="listbox" hidden></div>' +
            '</div>' +
            '<div class="tnx-user" hidden><span class="tnx-av"></span><span><b></b><small></small></span></div>' +
            '<button type="button" class="tnx-back">' + ic('back') + '<span>Volver al menú</span></button>';

        var course = doc.createElement('div');
        course.className = 'tnx-course';
        course.innerHTML =
            '<span class="tnx-course-ic">' + ic(mod.key === 'est' ? 'truss' : mod.key === 'rm' ? 'tension' : 'layers') + '</span>' +
            '<div class="tnx-course-txt">' +
                '<span class="tnx-eye">// ' + esc(D.code) + ' · ' + esc(D.eyebrow || eyebrowRest(mod)) + '</span>' +
                '<h2>' + accent(subject, D.accent) + '</h2>' +
                (p ? '<p>' + esc(p.textContent.trim()) + '</p>' : '') +
            '</div>' +
            '<div class="tnx-tabslot"></div>';

        /* las pestañas originales (con sus eventos) pasan a la cabecera;
           queda un marcador .submenu-tabs para los selectores existentes */
        var ph = doc.createElement('section');
        ph.className = 'submenu-tabs tnx-ph';
        ph.hidden = true;
        tabs.parentNode.insertBefore(ph, tabs);
        tabs.classList.add('tnx-tabs');
        tabs.querySelectorAll('.tab-btn').forEach(function (b) {
            if (b.querySelector('.tnx-ic')) return;
            var k = String(b.getAttribute('data-tab') || '').split('-').pop();
            if (TAB_IC[k]) b.insertAdjacentHTML('afterbegin', ic(TAB_IC[k]));
        });
        course.querySelector('.tnx-tabslot').appendChild(tabs);

        head.parentNode.insertBefore(top, head);
        head.parentNode.insertBefore(course, head);
        head.classList.add('tnx-oldhead');
        scr.classList.add('tnx-screen');
        scr.setAttribute('data-tnx', '1');

        top.querySelector('.tnx-back').addEventListener('click', function () {
            if (back) back.click();
            else if (typeof global.mostrarPantalla === 'function') global.mostrarPantalla('menu');
        });

        paintUser(top);
        global.addEventListener('geometrics-auth-changed', function () { paintUser(top); });
        if ('MutationObserver' in global) {
            new MutationObserver(function () { if (scr.style.display !== 'none') paintUser(top); })
                .observe(scr, { attributes: true, attributeFilter: ['style', 'class'] });
        }
        bindSearch(top, mod);
    }

    /* ---------- buscador ---------- */
    function bindSearch(top, mod) {
        var input = top.querySelector('.tnx-search input');
        var box = top.querySelector('.tnx-results');
        if (!input || !box) return;
        var index = null, hits = [], sel = -1;

        function build() {
            index = [];
            allSections(mod).forEach(function (s, i) {
                var txt = s.id === 'bib' ? plain((mod.bib || []).join(' ')) : s.id === 'ruta' ? '' : plain(s.html);
                index.push({ kind: 'sec', id: s.id, n: i + 1, t: s.t, nt: norm(s.t), txt: txt, ntxt: norm(txt) });
            });
            var D = design(mod);
            (mod.route || []).forEach(function (r) {
                var code = (D.route[r.go] || [])[2] || '';
                var t = r.t + ' ' + r.d + ' ' + code;
                index.push({ kind: 'ens', go: r.go, t: r.t, d: r.d + (code ? ' · ' + code : ''), nt: norm(t), ntxt: '' });
            });
        }

        function snippet(it, q) {
            var i = it.ntxt.indexOf(q);
            if (i < 0) return '';
            var a = Math.max(0, i - 42), b = Math.min(it.txt.length, i + q.length + 70);
            return (a > 0 ? '…' : '') + esc(it.txt.slice(a, i)) + '<mark>' + esc(it.txt.slice(i, i + q.length)) + '</mark>' + esc(it.txt.slice(i + q.length, b)) + (b < it.txt.length ? '…' : '');
        }

        function close() { box.hidden = true; sel = -1; input.setAttribute('aria-expanded', 'false'); }

        function paint() {
            var q = norm(input.value.trim());
            if (q.length < 2) { close(); return; }
            if (!index) build();
            var scored = [];
            index.forEach(function (it) {
                var st = it.nt.indexOf(q) >= 0 ? 2 : 0;
                var sc = it.ntxt && it.ntxt.indexOf(q) >= 0 ? 1 : 0;
                if (st || sc) scored.push({ it: it, s: st + sc + (it.kind === 'ens' ? 0.5 : 0) });
            });
            scored.sort(function (a, b) { return b.s - a.s; });
            hits = scored.slice(0, 8).map(function (x) { return x.it; });
            if (!hits.length) {
                box.innerHTML = '<div class="tnx-res-empty">Sin resultados para «' + esc(input.value.trim()) + '».</div>';
            } else {
                box.innerHTML = hits.map(function (it, k) {
                    var tag = it.kind === 'ens' ? '<span class="tnx-res-tag">Ensayo</span>' : '<span class="tnx-res-tag">' + pad(it.n) + '</span>';
                    var sub = it.kind === 'ens' ? esc(it.d) : (snippet(it, q) || 'Coincide con el título');
                    return '<button type="button" role="option" data-k="' + k + '">' + tag + '<span><b>' + esc(it.t) + '</b><small>' + sub + '</small></span></button>';
                }).join('');
            }
            sel = -1;
            box.hidden = false;
            input.setAttribute('aria-expanded', 'true');
        }

        function choose(k) {
            var it = hits[k];
            if (!it) return;
            close();
            input.blur();
            if (it.kind === 'ens') { openEnsayo(mod, it.go); return; }
            openTeoriaTab(mod);
            var host = doc.getElementById(mod.host);
            if (host) showTeoriaSection(host, mod, it.id, { user: true, scroll: true });
        }

        function highlight() {
            box.querySelectorAll('button').forEach(function (b, i) { b.classList.toggle('is-sel', i === sel); });
        }

        input.addEventListener('input', paint);
        input.addEventListener('focus', function () { if (input.value.trim().length >= 2) paint(); });
        input.addEventListener('keydown', function (e) {
            if (box.hidden) return;
            if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(hits.length - 1, sel + 1); highlight(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); highlight(); }
            else if (e.key === 'Enter') { e.preventDefault(); choose(sel < 0 ? 0 : sel); }
            else if (e.key === 'Escape') { close(); }
        });
        box.addEventListener('mousedown', function (e) { e.preventDefault(); });
        box.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-k]');
            if (b) choose(parseInt(b.getAttribute('data-k'), 10));
        });
        input.addEventListener('blur', function () { setTimeout(close, 120); });
    }

    /* ---------- tablas ACI dinámicas ---------- */
    function dmTables() {
        var Cc = global.MezclasCalc;
        if (!Cc || !Cc.ACI) return '<p class="dm-hint">No se encontró el motor de cálculo de mezclas; consulta las tablas de ACI 211.1 en la edición vigente.</p>';
        var A = Cc.ACI;
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
        var Cc = global.MezclasCalc;
        if (!Cc || !Cc.disenoACI) return '<p class="dm-hint">No se encontró el motor de cálculo de mezclas.</p>';
        var p = {
            fc: 28, s: 0, slump: 100, tmn: 19, mf: 2.7, puc: 1600,
            gsC: 3.15, gsG: 2.68, gsF: 2.65, aire: 'atrapado',
            acMax: 0.50, wG: 0.8, absG: 0.6, wF: 2.0, absF: 1.2, volLab: 30
        };
        var r = Cc.disenoACI(p);
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
            try { enhanceScreen(mod); } catch (e) { if (global.console) console.warn('[teoría] cabecera', key, e); }
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
