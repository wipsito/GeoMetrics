/* GeoMetrics — nuevo diseño del Centro de Aprendizaje (pantalla de menú).
 * Reorganiza #pantallaMenu sin recrear los botones originales: las tarjetas (.menu-card), el menú de usuario,
 * Civix y "Conoce al equipo" conservan sus id y sus eventos. Añade un modelo 3D (CSS 3D) que cambia según la
 * asignatura y gira 360° mientras el cursor está sobre su tarjeta. Solo front-end. */
(function () {
    'use strict';
    var doc = document;
    function $(id) { return doc.getElementById(id); }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ------------------------------------------------------------------ texturas */
    function svgUrl(svg) { return 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")'; }
    var TX = {
        dots: function (c) { return 'radial-gradient(' + c + ' 1.3px, transparent 1.6px) 0 0/9px 9px'; },
        waves: function (c) { return svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="14"><path d="M0 7 Q10 1 20 7 T40 7" fill="none" stroke="' + c + '" stroke-width="1.6"/></svg>') + ' 0 0/40px 14px'; },
        hatch: function (c) { return 'repeating-linear-gradient(135deg,' + c + ' 0 1.4px, transparent 1.4px 9px)'; },
        brick: function (c) { return svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="24" height="12"><path d="M0 .5H24M0 6.5H24M8 .5V6.5M20 6.5V12" fill="none" stroke="' + c + '" stroke-width="1.1"/></svg>') + ' 0 0/24px 12px'; },
        grid: function (c) { return 'linear-gradient(' + c + ' 1px, transparent 1px) 0 0/22px 22px, linear-gradient(90deg,' + c + ' 1px, transparent 1px) 0 0/22px 22px'; },
        speck: function (c) { return svgUrl('<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30"><g fill="' + c + '"><circle cx="4" cy="5" r="2.2"/><circle cx="17" cy="3" r="1.4"/><circle cx="25" cy="12" r="2.6"/><circle cx="9" cy="17" r="1.6"/><circle cx="20" cy="24" r="2"/><circle cx="4" cy="26" r="1.2"/></g></svg>') + ' 0 0/30px 30px' },
        lines: function (c) { return 'repeating-linear-gradient(90deg,' + c + ' 0 1px, transparent 1px 16px)'; }
    };
    /* caja 3D: centro en (x, y, z) con y hacia arriba; f = estilos por cara */
    function box(o) {
        var b = el('div', 'gmx-b'), w = o.w, h = o.h, d = o.d;
        b.style.transform = 'translate3d(' + (o.x || 0) + 'px,' + (-(o.y || 0)) + 'px,' + (o.z || 0) + 'px)' + (o.ry ? ' rotateY(' + o.ry + 'deg)' : '') + (o.rz ? ' rotateZ(' + o.rz + 'deg)' : '');
        var line = o.line || 'rgba(34,211,238,.85)', base = o.fill || 'rgba(8,47,73,.35)';
        var F = [
            ['front', w, h, 'translateZ(' + d / 2 + 'px)'], ['back', w, h, 'rotateY(180deg) translateZ(' + d / 2 + 'px)'],
            ['right', d, h, 'rotateY(90deg) translateZ(' + w / 2 + 'px)'], ['left', d, h, 'rotateY(-90deg) translateZ(' + w / 2 + 'px)'],
            ['top', w, d, 'rotateX(90deg) translateZ(' + h / 2 + 'px)'], ['bottom', w, d, 'rotateX(-90deg) translateZ(' + h / 2 + 'px)']
        ];
        F.forEach(function (q) {
            if (o.skip && o.skip.indexOf(q[0]) >= 0) return;
            var fc = el('i', 'gmx-f gmx-' + q[0]);
            fc.style.width = q[1] + 'px'; fc.style.height = q[2] + 'px'; fc.style.marginLeft = (-q[1] / 2) + 'px'; fc.style.marginTop = (-q[2] / 2) + 'px';
            fc.style.transform = q[3];
            var tex = (o.f && (o.f[q[0]] || (q[0] !== 'top' && q[0] !== 'bottom' ? o.f.side : null))) || o.f && o.f.all;
            fc.style.background = (tex ? tex + ',' : '') + (o.f && o.f[q[0] + 'Fill'] || (q[0] === 'top' ? (o.topFill || base) : base));
            fc.style.borderColor = line;
            if (o.glow) fc.style.boxShadow = 'inset 0 0 18px ' + o.glow;
            if (o.html && o.html[q[0]]) fc.innerHTML = o.html[q[0]];
            b.appendChild(fc);
        });
        return b;
    }
    var CY = 'rgba(34,211,238,.9)';

    /* ------------------------------------------------------------------ modelos por asignatura */
    var MODELS = {
        suelos: {
            head: 'PERFIL ESTRATIGRÁFICO // MODELO 3D', foot: 'w · γ · LL · LP · IP', accent: '#22d3ee',
            labels: [['ARENA', '0.0 m'], ['LIMO', ''], ['ARCILLA', ''], ['ROCA', '']],
            build: function (w) {
                var S = 210, layers = [['arena', 52, TX.dots('rgba(245,158,11,.9)'), 'rgba(120,53,15,.28)'], ['limo', 36, TX.waves('rgba(244,114,182,.85)'), 'rgba(131,24,67,.28)'], ['arcilla', 50, TX.hatch('rgba(167,139,250,.75)'), 'rgba(76,29,149,.32)'], ['roca', 34, TX.brick('rgba(148,163,184,.75)'), 'rgba(30,41,59,.55)']];
                var tot = layers.reduce(function (a, l) { return a + l[1]; }, 0), y = tot / 2;
                layers.forEach(function (l, i) {
                    y -= l[1] / 2;
                    w.appendChild(box({ w: S, h: l[1], d: S, y: y, line: CY, fill: l[3], f: { side: l[2], top: i === 0 ? TX.grid('rgba(34,211,238,.25)') : null, topFill: i === 0 ? 'rgba(8,47,73,.55)' : l[3] }, skip: i === 0 ? [] : ['top'] }));
                    y -= l[1] / 2;
                });
                var ring = el('div', 'gmx-ring'); ring.style.transform = 'translate3d(0,' + (-(tot / 2 + 1)) + 'px,0) rotateX(90deg)'; w.appendChild(ring);
                var bh = box({ w: 2, h: tot, d: 2, y: 0, line: 'rgba(34,211,238,.9)', fill: 'rgba(34,211,238,.6)' }); bh.classList.add('gmx-dash'); w.appendChild(bh);
                var tag = el('div', 'gmx-tag', 'SONDEO <span>SPT</span>'); tag.style.transform = 'translate3d(-70px,' + (-(tot / 2 + 34)) + 'px,0)'; w.appendChild(tag);
            }
        },
        cimentacion: {
            head: 'ZAPATA AISLADA // CAPACIDAD DE CARGA', foot: 'q_ult · B · Df · γ · c · φ', accent: '#22d3ee',
            labels: [['COLUMNA', 'P'], ['ZAPATA', 'B × B'], ['ESTRATO 1', 'γ₁'], ['ESTRATO 2', 'φ₂']],
            build: function (w) {
                w.appendChild(box({ w: 220, h: 70, d: 220, y: 5, line: CY, fill: 'rgba(120,53,15,.25)', f: { side: TX.dots('rgba(245,158,11,.8)'), top: TX.grid('rgba(34,211,238,.18)') } }));
                w.appendChild(box({ w: 220, h: 60, d: 220, y: -60, line: CY, fill: 'rgba(76,29,149,.3)', f: { side: TX.hatch('rgba(167,139,250,.7)') }, skip: ['top'] }));
                w.appendChild(box({ w: 110, h: 26, d: 110, y: 53, line: 'rgba(226,232,240,.95)', fill: 'rgba(148,163,184,.42)', f: { all: TX.speck('rgba(226,232,240,.35)') } }));
                w.appendChild(box({ w: 34, h: 96, d: 34, y: 114, line: 'rgba(226,232,240,.95)', fill: 'rgba(148,163,184,.5)', f: { all: TX.speck('rgba(226,232,240,.3)') } }));
                var ar = box({ w: 4, h: 40, d: 4, y: 185, line: '#f43f5e', fill: '#f43f5e' }); w.appendChild(ar);
                var tag = el('div', 'gmx-tag', 'CARGA <span>P</span>'); tag.style.transform = 'translate3d(14px,-200px,0)'; w.appendChild(tag);
            }
        },
        viga: {
            head: 'PERFIL IPE // ENSAYO DE FLEXIÓN', foot: 'σ · ε · E · M · τ', accent: '#f59e0b',
            labels: [['ALA SUPERIOR', 'bf'], ['ALMA', 'tw'], ['ALA INFERIOR', 'tf'], ['ACERO A36', 'fy 250']],
            build: function (w) {
                var st = 'rgba(148,163,184,.38)', ln = 'rgba(251,191,36,.95)', tx = TX.lines('rgba(226,232,240,.18)');
                w.appendChild(box({ w: 250, h: 16, d: 96, y: 58, line: ln, fill: st, f: { all: tx } }));
                w.appendChild(box({ w: 250, h: 100, d: 14, y: 0, line: ln, fill: 'rgba(100,116,139,.45)', f: { all: tx } }));
                w.appendChild(box({ w: 250, h: 16, d: 96, y: -58, line: ln, fill: st, f: { all: tx } }));
                [-110, 110].forEach(function (x) { w.appendChild(box({ w: 16, h: 30, d: 50, x: x, y: -82, line: 'rgba(34,211,238,.8)', fill: 'rgba(8,47,73,.5)' })); });
                w.appendChild(box({ w: 4, h: 46, d: 4, y: 92, line: '#f43f5e', fill: '#f43f5e' }));
            }
        },
        mezcla: {
            head: 'DOSIFICACIÓN POR VOLUMEN // ACI 211.1', foot: 'a/c · f′c · asentamiento · m³', accent: '#f59e0b',
            labels: [['AIRE', '2 %'], ['AGUA', '18 %'], ['CEMENTO', '11 %'], ['ARENA', '28 %'], ['GRAVA', '41 %']],
            build: function (w) {
                var S = 180, L = [['aire', 6, 'rgba(226,232,240,.18)', null], ['agua', 40, 'rgba(14,165,233,.42)', TX.waves('rgba(125,211,252,.8)')], ['cemento', 26, 'rgba(100,116,139,.55)', TX.dots('rgba(203,213,225,.65)')], ['arena', 62, 'rgba(180,83,9,.32)', TX.dots('rgba(251,191,36,.85)')], ['grava', 92, 'rgba(71,85,105,.5)', TX.speck('rgba(203,213,225,.55)')]];
                var tot = L.reduce(function (a, l) { return a + l[1]; }, 0), y = tot / 2;
                L.forEach(function (l, i) { y -= l[1] / 2; w.appendChild(box({ w: S, h: l[1], d: S, y: y, line: 'rgba(251,191,36,.9)', fill: l[2], f: { side: l[3] }, skip: i === 0 ? [] : ['top'] })); y -= l[1] / 2; });
                var tag = el('div', 'gmx-tag', '1 m³ <span>DE CONCRETO</span>'); tag.style.transform = 'translate3d(-60px,' + (-(tot / 2 + 30)) + 'px,0)'; w.appendChild(tag);
            }
        },
        portico: {
            head: 'PÓRTICO ESPACIAL // ANÁLISIS ESTRUCTURAL', foot: 'M · V · N · δ · K', accent: '#a78bfa',
            labels: [['LOSA', 'L2'], ['VIGA', 'b × h'], ['COLUMNA', 'EI'], ['NUDO', 'rígido']],
            build: function (w) {
                var ln = 'rgba(167,139,250,.95)', fc = 'rgba(76,29,149,.4)', X = 90, Z = 70, H1 = 90;
                [[-X, -Z], [X, -Z], [-X, Z], [X, Z]].forEach(function (p) { w.appendChild(box({ w: 14, h: 2 * H1, d: 14, x: p[0], z: p[1], y: 0, line: ln, fill: fc })); });
                [0, H1].forEach(function (yy) {
                    w.appendChild(box({ w: 2 * X + 14, h: 14, d: 14, y: yy, z: -Z, line: ln, fill: fc }));
                    w.appendChild(box({ w: 2 * X + 14, h: 14, d: 14, y: yy, z: Z, line: ln, fill: fc }));
                    w.appendChild(box({ w: 14, h: 14, d: 2 * Z, y: yy, x: -X, line: ln, fill: fc }));
                    w.appendChild(box({ w: 14, h: 14, d: 2 * Z, y: yy, x: X, line: ln, fill: fc }));
                    w.appendChild(box({ w: 2 * X, h: 4, d: 2 * Z, y: yy + 9, line: 'rgba(167,139,250,.5)', fill: 'rgba(167,139,250,.12)', f: { top: TX.grid('rgba(167,139,250,.25)') } }));
                });
                w.appendChild(box({ w: 260, h: 6, d: 200, y: -H1 - 3, line: 'rgba(34,211,238,.5)', fill: 'rgba(8,47,73,.4)', f: { top: TX.grid('rgba(34,211,238,.2)') } }));
            }
        },
        libros: {
            head: 'BIBLIOTECA // LIBROS GUÍA Y NORMAS', foot: 'NSR-10 · ASTM · INV · ACI', accent: '#94a3b8',
            labels: [['NORMAS', 'NSR-10'], ['LIBROS GUÍA', 'Das · Hibbeler'], ['APUNTES', 'clase'], ['PDF', 'descargas']],
            build: function (w) {
                var B = [[190, 34, 140, '#0e7490', -4], [176, 28, 128, '#7c3aed', 6], [200, 38, 146, '#b45309', -2], [168, 26, 120, '#be123c', 9], [184, 30, 134, '#334155', -6]], y = -80;
                B.forEach(function (b) {
                    y += b[1] / 2;
                    w.appendChild(box({ w: b[0], h: b[1], d: b[2], y: y, ry: b[4], line: 'rgba(226,232,240,.8)', fill: b[3] + 'b3', f: { front: TX.lines('rgba(255,255,255,.18)'), right: 'linear-gradient(rgba(255,255,255,.65),rgba(255,255,255,.65)) 0 0/100% 100%', rightFill: 'rgba(241,245,249,.85)', left: 'linear-gradient(rgba(255,255,255,.6),rgba(255,255,255,.6))' } }));
                    y += b[1] / 2 + 2;
                });
            }
        },
        barras: {
            head: 'HISTORIAL DE ENSAYOS // RESULTADOS', foot: 'w · Gs · γd · k · φ · f′c', accent: '#94a3b8',
            labels: [['HUMEDAD', 'w'], ['LÍMITES', 'IP'], ['PROCTOR', 'γd'], ['RESISTENCIA', 'f′c']],
            build: function (w) {
                w.appendChild(box({ w: 230, h: 8, d: 230, y: -90, line: 'rgba(34,211,238,.6)', fill: 'rgba(8,47,73,.45)', f: { top: TX.grid('rgba(34,211,238,.25)') } }));
                var hs = [[60, 120, 90], [150, 70, 110], [40, 160, 80]], cols = ['rgba(34,211,238,.45)', 'rgba(245,158,11,.45)', 'rgba(167,139,250,.45)'], lns = ['#22d3ee', '#fbbf24', '#a78bfa'];
                for (var i = 0; i < 3; i++) for (var j = 0; j < 3; j++) {
                    var h = hs[i][j];
                    w.appendChild(box({ w: 40, h: h, d: 40, x: (j - 1) * 66, z: (i - 1) * 66, y: -86 + h / 2, line: lns[j], fill: cols[j] }));
                }
            }
        },
        robot: {
            head: 'CIVIX // ASISTENTE DE INGENIERÍA', foot: 'civix> en línea · suelos · estructuras · materiales', accent: '#f472b6',
            labels: [['SUELOS', 'IA'], ['ESTRUCTURAS', 'IA'], ['MATERIALES', 'IA'], ['ARCHIVOS', 'DWG · PDF']],
            build: function (w) {
                var ln = 'rgba(244,114,182,.95)';
                w.appendChild(box({ w: 150, h: 120, d: 130, y: 20, line: ln, fill: 'rgba(80,7,36,.45)', f: { top: TX.grid('rgba(244,114,182,.2)') }, html: { front: '<b class="gmx-eye"></b><b class="gmx-eye"></b><b class="gmx-mouth"></b>' } }));
                w.appendChild(box({ w: 50, h: 22, d: 50, y: -51, line: ln, fill: 'rgba(80,7,36,.5)' }));
                w.appendChild(box({ w: 190, h: 40, d: 110, y: -82, line: ln, fill: 'rgba(80,7,36,.4)', f: { front: TX.lines('rgba(244,114,182,.25)') } }));
                w.appendChild(box({ w: 4, h: 34, d: 4, y: 96, line: ln, fill: '#f472b6' }));
                w.appendChild(box({ w: 14, h: 14, d: 14, y: 118, line: ln, fill: '#f472b6', glow: '#f472b6' }));
                [-82, 82].forEach(function (x) { w.appendChild(box({ w: 14, h: 40, d: 40, x: x, y: 20, line: ln, fill: 'rgba(80,7,36,.5)' })); });
            }
        }
    };
    var CARD = {
        'mecanica-suelos': { m: 'suelos', n: '01', eye: 'MS-I // LABORATORIO', cta: 'VER ENSAYOS', cat: 'su', ico: '<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>' },
        'mecanica-suelos-2': { m: 'cimentacion', n: '02', eye: 'MS-II // GEOTECNIA', cta: 'ENTRAR', cat: 'su', ico: '<path d="M4 20h16"/><path d="M6 20v-6h12v6"/><path d="M10 14V6h4v8"/><path d="M12 3v3"/>' },
        'resistencia-materiales': { m: 'viga', n: '03', eye: 'RM // MATERIALES', cta: 'ENTRAR', cat: 'ma', ico: '<path d="M4 6h16M4 18h16M12 6v12"/><path d="M8 10l-2 2 2 2M16 10l2 2-2 2"/>' },
        'diseno-mezclas': { m: 'mezcla', n: '04', eye: 'DM // ACI 211.1', cta: 'ENTRAR', cat: 'ma', ico: '<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/><path d="M7.5 14h9"/>' },
        'estructuras-1': { m: 'portico', n: '05', eye: 'EST-I // ANÁLISIS', cta: 'ENTRAR', cat: 'es', ico: '<path d="M3 19h18"/><path d="M5 19 9 9l3 6 3-6 4 10"/><path d="M9 9h6"/>' },
        'recursos': { m: 'libros', n: '06', eye: 'LIB // BIBLIOTECA', cta: 'ABRIR', cat: 'he', ico: '<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>' },
        'resultados': { m: 'barras', n: '07', eye: 'DATA // HISTORIAL', cta: 'VER RESULTADOS', cat: 'he', ico: '<path d="M4 4v16h16"/><path d="m7 15 4-5 3 3 5-6"/>' },
        'civix': { m: 'robot', n: '08', eye: 'IA // ASISTENTE', cta: '', cat: 'ia', ico: '<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16h5"/><path d="M3 12v3M21 12v3"/>' }
    };

    /* ------------------------------------------------------------------ estilos */
    var MONO = '"JetBrains Mono","IBM Plex Mono",ui-monospace,SFMono-Regular,Consolas,monospace';
    if (!doc.querySelector('link[data-gx-font]')) {
        var lf = doc.createElement('link'); lf.rel = 'stylesheet'; lf.setAttribute('data-gx-font', '1');
        lf.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap'; doc.head.appendChild(lf);
    }
    var R = '#pantallaMenu.gmx';
    var css = el('style'); css.id = 'gmx-css';
    css.textContent = [
        R + '{--cy:#22d3ee;--am:#f59e0b;--vi:#a78bfa;--gr:#94a3b8;--pk:#f472b6;--ln:#172235;--tx:#e6edf6;--mu:#8b9ab0;position:relative;max-width:none!important;width:100%!important;margin:0!important;padding:0 clamp(16px,3.4vw,60px) 30px!important;box-sizing:border-box;color:var(--tx);background:radial-gradient(1200px 600px at 75% 18%,rgba(34,211,238,.07),transparent 60%),radial-gradient(900px 700px at 0% 55%,rgba(124,58,237,.10),transparent 60%),linear-gradient(#04070d,#03060b)!important;min-height:100vh;overflow:hidden}',
        R + ':before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(rgba(148,163,184,.14) 1px,transparent 1.2px) 0 0/26px 26px;mask-image:linear-gradient(#000,transparent 70%);-webkit-mask-image:linear-gradient(#000,transparent 70%);opacity:.6}',
        R + ' > *{position:relative;z-index:1}',
        R + ' > .menu-encabezado,' + R + ' > .menu-grid > .gmx-x{display:none!important}',
        /* barra superior */
        R + ' .gmx-nav{display:flex;align-items:center;gap:24px;padding:28px 0 22px;border-bottom:1px solid var(--ln);z-index:40!important}',
        R + ' .menu-user-dropdown{z-index:1000!important}',
        R + ' .gmx-logos{display:flex;gap:12px;align-items:center}',
        R + ' .gmx-logos img{width:54px!important;height:54px!important;object-fit:contain;background:#fff;border-radius:10px;padding:5px;box-sizing:border-box;margin:0!important;box-shadow:none!important}',
        R + ' .gmx-brand{padding-left:20px;border-left:1px solid var(--ln)}',
        R + ' .gmx-brand b{display:block;font:700 19px/1 ' + MONO + ';letter-spacing:.32em;color:#fff}' + R + ' .gmx-brand b i{font-style:normal;color:var(--cy)}',
        R + ' .gmx-brand span{display:block;margin-top:8px;font:500 11px/1 ' + MONO + ';letter-spacing:.22em;color:var(--mu)}',
        R + ' .gmx-links{display:flex;gap:4px;margin:0 auto}',
        R + ' .gmx-links button{position:relative;background:none!important;border:0!important;box-shadow:none!important;color:#9fb0c6!important;font:500 13px/1 ' + MONO + '!important;letter-spacing:.22em;padding:14px 14px!important;cursor:pointer;text-transform:uppercase;width:auto!important;min-height:0!important}',
        R + ' .gmx-links button:hover,' + R + ' .gmx-links button.on{color:#fff!important}',
        R + ' .gmx-links button.on:after{content:"";position:absolute;left:14px;right:14px;bottom:-23px;height:2px;background:var(--cy);box-shadow:0 0 12px var(--cy)}',
        R + ' .menu-user-menu{position:relative;margin-left:auto}',
        R + ' .menu-user-trigger{display:flex!important;align-items:center;gap:12px;background:none!important;border:0!important;box-shadow:none!important;padding:4px!important;cursor:pointer;color:#fff!important}',
        R + ' .menu-user-trigger .menu-user-caret,' + R + ' .menu-user-trigger .menu-saludo-texto{display:none!important}',
        R + ' .gmx-who{text-align:right;line-height:1.25}' + R + ' .gmx-who small{display:block;font:500 11px/1.3 ' + MONO + ';letter-spacing:.2em;color:var(--mu);text-transform:uppercase}' + R + ' .gmx-who b{display:block;font-weight:600;font-size:15px;color:#fff}',
        R + ' .menu-user-avatar{order:2;width:50px!important;height:50px!important;border-radius:50%!important;border:2px solid var(--cy)!important;box-shadow:0 0 0 3px rgba(34,211,238,.15),0 0 18px rgba(34,211,238,.35)!important;font-size:18px!important}',
        R + ' .menu-user-dropdown{right:0;left:auto;top:calc(100% + 10px);z-index:50}',
        /* hero */
        R + ' .gmx-hero{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:40px;align-items:center;padding:56px 0 40px}',
        R + ' .gmx-chip{display:inline-flex;flex-wrap:wrap;max-width:100%;box-sizing:border-box;align-items:center;gap:10px;padding:10px 16px;border:1px solid var(--ln);background:rgba(8,18,32,.7);font:600 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:var(--cy);clip-path:polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,0 100%)}',
        R + ' .gmx-chip:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--cy);box-shadow:0 0 10px var(--cy)}' + R + ' .gmx-chip i{font-style:normal;color:#475569}',
        R + ' .gmx-hl{min-width:0}',
        R + ' .gmx-h1{margin:30px 0 0;font-family:Inter,"Segoe UI",system-ui,sans-serif;font-weight:900;font-size:clamp(46px,7.2vw,104px);line-height:.92;letter-spacing:-.045em;color:#eef4ff}',
        R + ' .gmx-h1 span{display:block}' + R + ' .gmx-h1 em{font-style:normal;color:transparent;-webkit-text-stroke:2.5px var(--cy);text-shadow:0 0 30px rgba(34,211,238,.25)}' + R + ' .gmx-h1 strong{color:var(--cy);font-weight:900;text-shadow:0 0 40px rgba(34,211,238,.35)}',
        R + ' .gmx-lead{max-width:620px;margin:28px 0 0;font-size:clamp(16px,1.35vw,20px);line-height:1.6;color:#aebbd0}' + R + ' .gmx-lead b{color:#fff;font-weight:600}',
        R + ' .gmx-search{position:relative;display:flex;align-items:center;gap:12px;max-width:640px;margin-top:34px;padding:8px 8px 8px 20px;border:1px solid var(--ln);background:rgba(6,12,22,.85);clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)}',
        R + ' .gmx-search:focus-within{border-color:rgba(34,211,238,.6)}',
        R + ' .gmx-search > span{font:600 15px/1 ' + MONO + ';color:var(--cy)}',
        R + ' .gmx-search input{flex:1;min-width:0;background:transparent!important;border:0!important;outline:0!important;box-shadow:none!important;color:#e2e8f0!important;font:500 15.5px/1 ' + MONO + '!important;padding:14px 0!important;margin:0!important}',
        R + ' .gmx-search input::placeholder{color:#6b7a90}',
        R + ' .gmx-search button{display:inline-flex;align-items:center;gap:10px;background:var(--cy)!important;color:#03202a!important;border:0!important;box-shadow:0 0 24px rgba(34,211,238,.3)!important;font:800 14px/1 ' + MONO + '!important;letter-spacing:.18em;padding:16px 22px!important;cursor:pointer;clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%);width:auto!important;min-height:0!important;margin:0!important}',
        R + ' .gmx-res{position:absolute;left:-1px;right:-1px;top:calc(100% + 6px);z-index:30;background:#060c18;border:1px solid rgba(34,211,238,.35);max-height:320px;overflow:auto;display:none}',
        R + ' .gmx-res.on{display:block}',
        R + ' .gmx-res button{display:flex!important;justify-content:space-between;gap:12px;width:100%!important;text-align:left;background:none!important;border:0!important;border-bottom:1px solid var(--ln)!important;box-shadow:none!important;color:#e2e8f0!important;padding:12px 16px!important;font-size:14px!important;cursor:pointer;min-height:0!important;margin:0!important;text-transform:none!important}',
        R + ' .gmx-res button:hover,' + R + ' .gmx-res button.sel{background:rgba(34,211,238,.1)!important}',
        R + ' .gmx-res small{font:500 11.5px/1.3 ' + MONO + ';color:var(--mu);white-space:nowrap}',
        R + ' .gmx-res p{margin:0;padding:14px 16px;color:var(--mu);font-size:14px}',
        R + ' #menuUserInfo{margin:16px 0 0!important;font:500 12.5px/1.4 ' + MONO + '!important;color:var(--mu)!important;letter-spacing:.04em}',
        R + ' #menuUserInfo:before{content:"// ";color:var(--cy)}',
        /* visor 3D */
        R + ' .gmx-view{position:relative;height:clamp(420px,44vw,560px);user-select:none}',
        R + ' .gmx-corner{position:absolute;width:24px;height:24px;border:2px solid var(--cy);opacity:.85}',
        R + ' .gmx-corner.a{left:0;top:0;border-right:0;border-bottom:0}' + R + ' .gmx-corner.b{right:0;top:0;border-left:0;border-bottom:0}' + R + ' .gmx-corner.c{left:0;bottom:0;border-right:0;border-top:0}' + R + ' .gmx-corner.d{right:0;bottom:0;border-left:0;border-top:0}',
        R + ' .gmx-vh,' + R + ' .gmx-vf{position:absolute;left:32px;font:500 12px/1 ' + MONO + ';letter-spacing:.2em;color:#9fb0c6;transition:opacity .3s}',
        R + ' .gmx-vh{top:28px}' + R + ' .gmx-vf{bottom:26px;letter-spacing:.16em}' + R + ' .gmx-vf b{color:var(--cy);font-weight:600;margin-left:16px}' + R + ' .gmx-vf b:before{content:"● "}',
        R + ' .gmx-stage{position:absolute;inset:60px 240px 60px 0;perspective:2200px;perspective-origin:50% 40%}',
        R + ' .gmx-world{position:absolute;left:50%;top:52%;width:0;height:0;transform-style:preserve-3d}',
        R + ' .gmx-stage{transition:opacity .25s ease}',
        R + ' .gmx-view.fade .gmx-stage{opacity:0}',
        R + ' .gmx-b{position:absolute;left:0;top:0;transform-style:preserve-3d}',
        R + ' .gmx-f{position:absolute;left:0;top:0;box-sizing:border-box;border:1.5px solid;backface-visibility:hidden}',
        R + ' .gmx-ring{position:absolute;left:-17px;top:-17px;width:34px;height:34px;border-radius:50%;border:2px solid var(--cy);background:rgba(34,211,238,.15);box-shadow:0 0 16px rgba(34,211,238,.6)}',
        R + ' .gmx-dash .gmx-f{border-style:dashed;background:transparent!important}',
        R + ' .gmx-tag{position:absolute;left:0;top:0;white-space:nowrap;font:600 12px/1 ' + MONO + ';letter-spacing:.14em;color:#e2e8f0}' + R + ' .gmx-tag span{color:var(--mu);margin-left:6px}',
        R + ' .gmx-eye{position:absolute;top:34px;width:26px;height:16px;border-radius:8px;background:#f472b6;box-shadow:0 0 14px #f472b6}' + R + ' .gmx-eye:first-child{left:32px}' + R + ' .gmx-eye:nth-child(2){right:32px}',
        R + ' .gmx-mouth{position:absolute;left:50%;bottom:26px;width:60px;margin-left:-30px;height:8px;border-radius:4px;background:repeating-linear-gradient(90deg,#f472b6 0 8px,transparent 8px 12px)}',
        R + ' .gmx-legend{position:absolute;right:16px;top:50%;transform:translateY(-50%);display:flex;flex-direction:column;gap:34px;padding-left:26px;border-left:1px solid rgba(148,163,184,.4);transition:opacity .3s}',
        R + ' .gmx-legend div{position:relative;font:600 12.5px/1 ' + MONO + ';letter-spacing:.12em;color:#e2e8f0;white-space:nowrap}',
        R + ' .gmx-legend div:before{content:"";position:absolute;left:-32px;top:50%;width:12px;height:1px;background:rgba(148,163,184,.7)}',
        R + ' .gmx-legend span{color:var(--mu);margin-left:10px;font-weight:500}',
        R + ' .gmx-view.fade .gmx-vh,' + R + ' .gmx-view.fade .gmx-vf,' + R + ' .gmx-view.fade .gmx-legend{opacity:0}',
        /* módulos */
        R + ' .gmx-sec{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:30px 0 22px;border-bottom:1px solid var(--ln);margin-bottom:30px}',
        R + ' .gmx-sec small{display:block;font:500 13px/1 ' + MONO + ';letter-spacing:.24em;color:var(--cy)}',
        R + ' .gmx-sec h2{margin:14px 0 0!important;font-size:clamp(28px,2.6vw,38px)!important;font-weight:800!important;letter-spacing:-.02em;color:#fff!important;text-align:left!important;background:none!important;-webkit-text-fill-color:#fff!important}',
        R + ' .gmx-cats{display:flex;gap:22px;flex-wrap:wrap;font:500 12.5px/1 ' + MONO + ';letter-spacing:.2em;color:#9fb0c6}',
        R + ' .gmx-cats span:before{content:"";display:inline-block;width:10px;height:10px;transform:rotate(45deg);background:var(--c);margin-right:10px;vertical-align:0}',
        R + ' .menu-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:22px!important;max-width:none!important;margin:0!important;padding:0!important}',
        R + ' .menu-grid .menu-card{--c:var(--cy);position:relative;display:flex!important;flex-direction:column;align-items:stretch!important;text-align:left!important;min-height:330px;padding:26px 26px 0!important;margin:0!important;border:0!important;border-radius:0!important;background:linear-gradient(160deg,rgba(17,26,44,.92),rgba(8,13,24,.94))!important;box-shadow:inset 0 0 0 1px var(--ln)!important;clip-path:polygon(0 0,calc(100% - 24px) 0,100% 24px,100% 100%,24px 100%,0 calc(100% - 24px));transition:transform .25s,box-shadow .25s,background .25s;cursor:pointer;overflow:visible;color:var(--tx)!important;transform:none}',
        R + ' .menu-grid .menu-card:before{content:"";position:absolute;left:0;right:24px;top:0;height:2px;background:linear-gradient(90deg,var(--c),transparent);opacity:.9}',
        R + ' .menu-grid .menu-card:after{content:"";position:absolute;left:24px;right:0;bottom:0;height:2px;background:var(--c);opacity:0;transition:opacity .25s;box-shadow:0 0 14px var(--c)}',
        R + ' .menu-grid .menu-card:hover,' + R + ' .menu-grid .menu-card.on,' + R + ' .menu-grid .menu-card:focus-visible{transform:translateY(-4px);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 70%,transparent),0 18px 40px rgba(0,0,0,.35)!important;background:linear-gradient(160deg,rgba(20,32,54,.96),rgba(9,15,28,.96))!important;outline:0}',
        R + ' .menu-grid .menu-card:hover:after,' + R + ' .menu-grid .menu-card.on:after{opacity:1}',
        R + ' .menu-grid .menu-card.c-su{--c:#22d3ee}' + R + ' .menu-grid .menu-card.c-ma{--c:#f59e0b}' + R + ' .menu-grid .menu-card.c-es{--c:#a78bfa}' + R + ' .menu-grid .menu-card.c-he{--c:#94a3b8}' + R + ' .menu-grid .menu-card.c-ia{--c:#f472b6;background:linear-gradient(160deg,rgba(38,14,34,.92),rgba(10,10,22,.94))!important}',
        R + ' .gmx-ct{display:flex;justify-content:space-between;align-items:flex-start}',
        R + ' .gmx-ico{width:54px;height:54px;display:flex;align-items:center;justify-content:center;color:var(--c);background:color-mix(in srgb,var(--c) 12%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 60%,transparent);clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)}',
        R + ' .gmx-ico svg{width:24px;height:24px}',
        R + ' .menu-grid .menu-card .gmx-num{font:500 46px/1 ' + MONO + '!important;color:transparent!important;-webkit-text-fill-color:transparent!important;-webkit-text-stroke:1.2px rgba(148,163,184,.45)!important;letter-spacing:-.04em;background:none!important;text-shadow:none!important}',
        R + ' .menu-grid .menu-card:hover .gmx-num,' + R + ' .menu-grid .menu-card.on .gmx-num{-webkit-text-stroke-color:color-mix(in srgb,var(--c) 75%,transparent)!important}',
        R + ' .gmx-eye2{margin:36px 0 0;font:600 12.5px/1 ' + MONO + ';letter-spacing:.22em;color:var(--c)}',
        R + ' .menu-card h3.gmx-t{margin:14px 0 0!important;font-size:24px!important;font-weight:800!important;letter-spacing:-.015em;color:#fff!important;text-align:left!important}',
        R + ' .menu-card p.gmx-d{margin:14px 0 0!important;font-size:15px!important;line-height:1.6!important;color:#aebbd0!important;text-align:left!important}',
        R + ' .gmx-cta{display:flex;justify-content:space-between;align-items:center;margin-top:auto;padding:22px 0 26px;border-top:1px solid var(--ln);font:600 13px/1 ' + MONO + ';letter-spacing:.26em;color:var(--c)}',
        R + ' .gmx-cta i{font-style:normal;font-size:20px;letter-spacing:0;transition:transform .25s}' + R + ' .menu-card:hover .gmx-cta i{transform:translateX(5px)}',
        R + ' .menu-grid > .menu-card .gmx-sp{flex:1;min-height:20px}',
        R + ' .gmx-prompt{margin:auto 0 24px;padding:14px 16px;border:1px solid color-mix(in srgb,var(--pk) 45%,transparent);font:500 14px/1 ' + MONO + ';color:#e2e8f0;background:rgba(10,6,16,.6)}',
        R + ' .gmx-prompt b{color:var(--pk);font-weight:600;margin-right:6px}' + R + ' .gmx-prompt i{display:inline-block;width:3px;height:17px;margin-left:6px;vertical-align:-3px;background:var(--cy);animation:gmxBlink 1s steps(2) infinite}',
        '@keyframes gmxBlink{50%{opacity:0}}',
        /* equipo */
        R + ' .gm-equipo-banner{margin:56px 0 0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;max-width:none!important;width:100%!important;display:block!important}',
        R + ' .gm-equipo-banner .gmx-team{width:100%;box-sizing:border-box}',
        R + ' .gmx-team{position:relative;display:flex;align-items:center;gap:34px;padding:42px 44px;background:linear-gradient(110deg,rgba(8,47,73,.45),rgba(10,16,30,.85) 55%,rgba(10,16,30,.85));box-shadow:inset 0 0 0 1px var(--ln);clip-path:polygon(0 0,100% 0,100% calc(100% - 26px),calc(100% - 26px) 100%,26px 100%,0 calc(100% - 26px))}',
        R + ' .gmx-team .gmx-corner{width:22px;height:22px}' + R + ' .gmx-team .gmx-corner.a{left:0;top:0}' + R + ' .gmx-team .gmx-corner.d{right:0;bottom:0}',
        R + ' .gmx-tico{flex:0 0 auto;width:78px;height:78px;display:flex;align-items:center;justify-content:center;color:var(--cy);font:600 26px/1 ' + MONO + ';background:rgba(34,211,238,.08);box-shadow:inset 0 0 0 1px rgba(34,211,238,.55);clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)}',
        R + ' .gmx-tt small{display:block;font:500 13px/1 ' + MONO + ';letter-spacing:.24em;color:var(--cy)}',
        R + ' .gmx-tt h3{margin:14px 0 0!important;font-size:clamp(24px,2.3vw,34px)!important;font-weight:800!important;letter-spacing:-.02em;color:#fff!important;text-align:left!important}' + R + ' .gmx-tt h3 span{color:var(--cy)}',
        R + ' .gmx-tt p{margin:12px 0 0!important;font-size:16px!important;line-height:1.6!important;color:#aebbd0!important;max-width:640px}',
        R + ' #btnEquipoCreador{margin-left:auto!important;flex:0 0 auto;display:inline-flex!important;align-items:center;gap:14px;background:var(--cy)!important;color:#03202a!important;border:0!important;border-radius:0!important;box-shadow:0 0 30px rgba(34,211,238,.28)!important;font:800 14px/1 ' + MONO + '!important;letter-spacing:.24em;padding:22px 30px!important;cursor:pointer;clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%);width:auto!important;text-transform:uppercase}',
        R + ' #btnEquipoCreador svg{width:18px;height:18px}',
        R + ' .gmx-foot{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:26px 0 6px;font:500 12px/1.4 ' + MONO + ';letter-spacing:.2em;color:#64748b}',
        /* responsivo */
        '@media (min-width:1240px) and (min-height:640px){' + R + '{height:100vh;min-height:0!important;flex-direction:column;padding-bottom:10px!important}' + R + ':not([style*="none"]){display:flex!important}' + R + ' .gmx-nav{flex:0 0 auto;padding:1.6vh 0 1.4vh;gap:20px}' + R + ' .gmx-logos img{width:clamp(38px,5.2vh,54px)!important;height:clamp(38px,5.2vh,54px)!important}' + R + ' .gmx-brand b{font-size:clamp(14px,1.9vh,19px)}' + R + ' .gmx-links button{padding:10px 12px!important}' + R + ' .gmx-links button.on:after{bottom:calc(-1.4vh - 1px)}' + R + ' .menu-user-avatar{width:clamp(38px,5vh,50px)!important;height:clamp(38px,5vh,50px)!important}' + R + ' .gmx-hero{flex:1 1 auto;min-height:0;padding:1.8vh 0 1vh;gap:3vw}' + R + ' .gmx-hl{align-self:center}' + R + ' .gmx-chip{padding:.8vh 14px;font-size:clamp(10px,1.25vh,12.5px)}' + R + ' .gmx-h1{margin-top:1.6vh;font-size:clamp(30px,min(7vh,6vw),96px)}' + R + ' .gmx-h1 em{-webkit-text-stroke-width:2px}' + R + ' .gmx-lead{margin-top:1.6vh;font-size:clamp(14px,1.75vh,19px);line-height:1.5}' + R + ' .gmx-search{margin-top:2vh;padding-top:5px;padding-bottom:5px}' + R + ' .gmx-search input{padding:1.1vh 0!important;font-size:clamp(13px,1.6vh,15.5px)!important}' + R + ' .gmx-search button{padding:1.3vh 20px!important;font-size:clamp(12px,1.45vh,14px)!important}' + R + ' #menuUserInfo{display:none!important}' + R + ' .gmx-view{height:100%;min-height:0;max-height:none}' + R + ' .gmx-vh{top:2.4vh}' + R + ' .gmx-vf{bottom:2.2vh}' + R + ' .gmx-stage{inset:5vh 240px 5vh 0}' + R + ' .gmx-legend{gap:3.2vh}' + R + ' .gmx-sec{flex:0 0 auto;padding:1.2vh 0 1.2vh;margin-bottom:1.6vh;align-items:center}' + R + ' .gmx-sec small{font-size:11.5px}' + R + ' .gmx-sec h2{margin-top:.6vh!important;font-size:clamp(20px,2.6vh,30px)!important}' + R + ' .menu-grid{flex:0 0 auto;gap:1.5vh 18px!important}' + R + ' .menu-grid .menu-card{min-height:0!important;padding:1.6vh 20px 0!important;display:grid!important;grid-template-columns:clamp(36px,4.6vh,48px) minmax(0,1fr) auto;grid-template-rows:auto auto minmax(0,1fr) auto;column-gap:14px;height:clamp(112px,17vh,186px)}' + R + ' .gmx-ct{display:contents}' + R + ' .gmx-ico{grid-column:1;grid-row:1/3;width:100%;aspect-ratio:1;height:auto;align-self:start}' + R + ' .gmx-ico svg{width:20px;height:20px}' + R + ' .menu-grid .menu-card .gmx-num{grid-column:3;grid-row:1/3;font-size:clamp(24px,3.6vh,38px)!important;align-self:start}' + R + ' .gmx-eye2{grid-column:2!important;grid-row:1!important;margin:2px 0 0;font-size:clamp(9.5px,1.15vh,11.5px);letter-spacing:.18em}' + R + ' .menu-card h3.gmx-t{grid-column:2!important;grid-row:2!important;margin:.6vh 0 0!important;font-size:clamp(15px,2.05vh,21px)!important;line-height:1.15!important}' + R + ' .menu-card p.gmx-d{grid-column:1/-1!important;grid-row:3!important;margin:1vh 0 0!important;font-size:clamp(12px,1.45vh,14px)!important;line-height:1.45!important;display:-webkit-box!important;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}' + R + ' .menu-grid > .menu-card .gmx-sp{display:none}' + R + ' .gmx-cta{grid-column:1/-1!important;grid-row:4!important;padding:1.2vh 0 1.4vh;font-size:clamp(10px,1.2vh,12px)}' + R + ' .gmx-cta i{font-size:16px}' + R + ' .gmx-prompt{grid-column:1/-1!important;grid-row:4!important;margin:0 0 1.4vh;padding:1vh 12px;font-size:clamp(11px,1.35vh,13px)}' + R + ' .gm-equipo-banner{flex:0 0 auto;margin:1.6vh 0 0!important}' + R + ' .gmx-team{padding:1.2vh 26px;gap:20px}' + R + ' .gmx-team .gmx-corner{width:14px;height:14px}' + R + ' .gmx-tico{width:clamp(36px,4.6vh,48px);height:clamp(36px,4.6vh,48px);font-size:16px}' + R + ' .gmx-tt{display:flex;align-items:baseline;gap:18px;flex-wrap:wrap}' + R + ' .gmx-tt small{font-size:11px}' + R + ' .gmx-tt h3{margin:0!important;font-size:clamp(15px,2vh,21px)!important}' + R + ' .gmx-tt p{display:none}' + R + ' #btnEquipoCreador{padding:1.3vh 20px!important;font-size:clamp(11px,1.35vh,13px)!important}' + R + ' .gmx-foot{flex:0 0 auto;padding:1vh 0 0;font-size:10.5px}' + '}',
        '@media (min-width:1240px) and (max-height:860px){' + R + ' .gmx-lead{display:none}' + R + ' .gmx-legend{gap:2.4vh}' + R + ' .gmx-vf{display:none}}',
        '@media (min-width:1240px) and (max-height:720px){' + R + ' .gmx-chip{display:none}' + R + ' .gmx-h1{margin-top:0}' + R + ' .menu-card p.gmx-d{display:none!important}' + R + ' .gmx-foot{display:none}}',
        '@media (max-width:1240px){' + R + ' .menu-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}' + R + ' .gmx-links{display:none}}',
        '@media (max-width:980px){' + R + ' .gmx-hero{grid-template-columns:minmax(0,1fr);padding-top:36px}' + R + ' .gmx-view{height:420px}}',
        '@media (max-width:640px){' + R + ' .gmx-stage{transform:none!important;inset:50px 120px 50px 0!important}' + R + ' .menu-grid{grid-template-columns:1fr!important}' + R + ' .gmx-chip{font-size:10.5px;letter-spacing:.14em;gap:6px}' + R + ' .gmx-h1{font-size:13.5vw}' + R + ' .gmx-search > span{display:none}' + R + ' .gmx-search{padding-left:14px}' + R + ' .gmx-brand{display:none}' + R + ' .gmx-who{display:none}' + R + ' .gmx-view{height:340px}' + R + ' .gmx-stage{inset:50px 110px 50px 0;transform:scale(.72)}' + R + ' .gmx-legend{gap:22px;padding-left:16px}' + R + ' .gmx-legend div{font-size:10.5px}' + R + ' .gmx-team{flex-direction:column;align-items:flex-start;padding:30px 24px}' + R + ' #btnEquipoCreador{margin-left:0!important}' + R + ' .gmx-search button{padding:14px 14px!important;letter-spacing:.1em}' + R + ' .gmx-h1 em{-webkit-text-stroke-width:1.6px}}'
    ].join('\n');
    doc.head.appendChild(css);

    /* ------------------------------------------------------------------ buscador */
    function irA(seccion, fn) {
        if (typeof window.abrirSeccion === 'function') window.abrirSeccion(seccion);
        if (fn) setTimeout(function () { try { fn(); } catch (e) { if (window.console) console.warn('[menu-diseno]', e); } }, 160);
    }
    function tab(scr, t) { var b = doc.querySelector('#' + scr + ' .tab-btn[data-tab="' + t + '"]'); if (b) b.click(); }
    function indice() {
        var I = [];
        function add(t, area, kw, go) { I.push({ t: t, area: area, k: (t + ' ' + area + ' ' + (kw || '')).toLowerCase(), go: go }); }
        add('Mecánica de Suelos I', 'Asignatura', 'suelos ms1 laboratorio', function () { irA('mecanica-suelos'); });
        add('Mecánica de Suelos II', 'Asignatura', 'suelos ms2 geotecnia cimentaciones', function () { irA('mecanica-suelos-2'); });
        add('Resistencia de Materiales', 'Asignatura', 'rm materiales', function () { irA('resistencia-materiales'); });
        add('Diseño de Mezclas', 'Asignatura', 'concreto dm aci', function () { irA('diseno-mezclas'); });
        add('Estructuras I', 'Asignatura', 'estructuras análisis', function () { irA('estructuras-1'); });
        add('Recursos', 'Biblioteca', 'libros normas pdf', function () { irA('recursos'); });
        add('Resultados', 'Historial', 'mis resultados informes', function () { irA('resultados'); });
        add('Simuladores', 'Laboratorio', 'simulador mohr', function () { irA('simuladores'); });
        add('Civix', 'Asistente IA', 'ia chat ayuda', function () { var b = $('btnAsistenteAI'); if (b) b.click(); });
        var GD = window.GMEnsayosDiseno || {}, M = GD.meta || {}, RM = GD.rm || {};
        var ms1 = { humedad: 'Contenido de humedad', granulometria: 'Granulometría', limites: 'Límites de Atterberg', gravedad: 'Gravedad específica', compactacion: 'Compactación Proctor', densidad: 'Densidad en campo (cono de arena)', clasificacion: 'Clasificación SUCS', permeabilidad: 'Permeabilidad' };
        Object.keys(ms1).forEach(function (k) { add(ms1[k], 'Ensayo · Suelos I', (M[k] ? M[k].chips.join(' ') + ' ' + (M[k].desc || '') : ''), function () { irA('mecanica-suelos', function () { tab('pantallaSuelos', 'ms1-ensayos'); setTimeout(function () { window.abrirEnsayoSuelos(k); }, 80); }); }); });
        var ms2 = { corte: 'Corte directo', inconfinada: 'Compresión inconfinada', consolidacion: 'Consolidación', triaxial: 'Triaxial' };
        Object.keys(ms2).forEach(function (k) { add(ms2[k], 'Ensayo · Suelos II', (M[k] ? M[k].chips.join(' ') : ''), function () { irA('mecanica-suelos-2', function () { tab('pantallaSuelos2', 'ms2-ensayos'); setTimeout(function () { window.abrirEnsayoSuelos2(k); }, 80); }); }); });
        var rm = { traccion: 'Tracción', compresion: 'Compresión', flexion: 'Flexión', torsion: 'Torsión', dureza: 'Dureza Rockwell' };
        Object.keys(rm).forEach(function (k) { add(rm[k], 'Ensayo · Resistencia de Materiales', (RM[k] ? RM[k].chips.join(' ') : ''), function () { irA('resistencia-materiales', function () { window.abrirModuloRM(k, 'ensayo'); }); }); });
        doc.querySelectorAll('#est-ensayos [data-ensayo], #dmEnsayosRoot [data-ens]').forEach(function () { });
        return I;
    }
    function quitarTildes(s) { return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s; }
    function buscador(host) {
        var box = el('form', 'gmx-search', '<span>&gt;_</span><input type="search" placeholder="buscar ensayo, tema o norma…" aria-label="Buscar ensayo, tema o norma" autocomplete="off"><button type="submit">EXPLORAR <i>→</i></button><div class="gmx-res" role="listbox"></div>');
        var inp = box.querySelector('input'), res = box.querySelector('.gmx-res'), I = null, list = [], sel = -1;
        function pintar() {
            var q = quitarTildes(inp.value.trim().toLowerCase());
            if (!I) I = indice();
            if (!q) { res.classList.remove('on'); list = []; return; }
            var ws = q.split(/\s+/);
            list = I.filter(function (it) { var k = quitarTildes(it.k); return ws.every(function (w) { return k.indexOf(w) >= 0; }); }).slice(0, 8);
            res.innerHTML = list.length ? list.map(function (it, i) { return '<button type="button" data-i="' + i + '"' + (i === sel ? ' class="sel"' : '') + '><span>' + esc(it.t) + '</span><small>' + esc(it.area) + '</small></button>'; }).join('') : '<p>Sin coincidencias. Prueba con “humedad”, “ASTM D2216” o “torsión”.</p>';
            res.classList.add('on');
        }
        function ir(i) { var it = list[i]; if (!it) return; res.classList.remove('on'); inp.value = ''; it.go(); }
        inp.addEventListener('input', function () { sel = -1; pintar(); });
        inp.addEventListener('keydown', function (e) {
            if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(list.length - 1, sel + 1); pintar(); }
            else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); pintar(); }
            else if (e.key === 'Escape') res.classList.remove('on');
        });
        res.addEventListener('mousedown', function (e) { var b = e.target.closest('button[data-i]'); if (b) { e.preventDefault(); ir(+b.getAttribute('data-i')); } });
        inp.addEventListener('blur', function () { setTimeout(function () { res.classList.remove('on'); }, 150); });
        box.addEventListener('submit', function (e) {
            e.preventDefault();
            if (!inp.value.trim()) { var g = host.querySelector('.gmx-sec'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
            pintar(); ir(sel >= 0 ? sel : 0);
        });
        return box;
    }

    /* ------------------------------------------------------------------ visor 3D */
    var V = { k: 1.25, cur: null, ang: -45, target: null, spin: false, raf: 0, last: 0, world: null, view: null, base: 'suelos', pend: null };
    var TILT = -24;
    function pintarMundo() { var vh = V.view ? V.view.clientHeight : 0; V.k = window.innerWidth < 640 ? 0.72 : window.innerWidth < 1100 ? 1 : (vh ? Math.max(0.55, Math.min(1.2, (vh - 110) / 290)) : 1.2); if (V.world) V.world.style.transform = 'scale3d(' + V.k + ',' + V.k + ',' + V.k + ') rotateX(' + TILT + 'deg) rotateY(' + V.ang.toFixed(2) + 'deg)'; }
    function cambiarModelo(key) {
        if (!V.world || V.cur === key) return;
        var m = MODELS[key]; if (!m) return;
        var first = !V.cur;
        V.cur = key;
        var aplicar = function () {
            V.world.innerHTML = ''; m.build(V.world);
            V.view.querySelector('.gmx-vh').textContent = m.head;
            V.view.querySelector('.gmx-vf').innerHTML = esc(m.foot) + '<b>EN LÍNEA</b>';
            V.view.querySelector('.gmx-legend').innerHTML = m.labels.map(function (l) { return '<div>' + esc(l[0]) + (l[1] ? '<span>' + esc(l[1]) + '</span>' : '') + '</div>'; }).join('');
            V.view.style.setProperty('--ac', m.accent);
            V.view.classList.remove('fade');
        };
        if (first || reduce) { aplicar(); return; }
        V.view.classList.add('fade');
        clearTimeout(V.pend); V.pend = setTimeout(aplicar, 220);
    }
    function loop(ts) {
        if (!V.world || !V.world.isConnected) { V.raf = 0; return; }
        var dt = V.last ? Math.min(0.05, (ts - V.last) / 1000) : 0; V.last = ts;
        if (V.spin) V.ang += dt * 60;                              /* 360° cada 6 s */
        else {
            var goal = V.home; var d = goal - V.ang;
            if (Math.abs(d) < 0.05) { V.ang = goal; pintarMundo(); V.raf = 0; V.last = 0; return; }
            V.ang += d * Math.min(1, dt * 5);
        }
        pintarMundo();
        V.raf = requestAnimationFrame(loop);
    }
    function arrancar() { if (!V.raf) { V.last = 0; V.raf = requestAnimationFrame(loop); } }
    function hover(key) {
        cambiarModelo(key);
        if (reduce) return;
        V.spin = true; arrancar();
    }
    function salir() {
        V.spin = false;
        /* volver al ángulo isométrico más cercano hacia adelante */
        var k = Math.ceil((V.ang + 45) / 360); V.home = k * 360 - 45;
        cambiarModelo(V.base); arrancar();
    }
    function visor() {
        var v = el('div', 'gmx-view', '<i class="gmx-corner a"></i><i class="gmx-corner b"></i><i class="gmx-corner c"></i><i class="gmx-corner d"></i><div class="gmx-vh"></div><div class="gmx-stage"><div class="gmx-world"></div></div><div class="gmx-legend"></div><div class="gmx-vf"></div>');
        V.view = v; V.world = v.querySelector('.gmx-world'); V.home = -45; V.ang = -45;
        cambiarModelo(V.base); pintarMundo();
        if (window.ResizeObserver) new ResizeObserver(function () { pintarMundo(); }).observe(v);
        return v;
    }

    /* ------------------------------------------------------------------ montaje */
    function quien() {
        var u = null; try { u = typeof window.aulaGetSession === 'function' ? window.aulaGetSession() : null; } catch (e) { }
        if (!u) return { rol: 'INVITADO', nombre: 'Bienvenido/a' };
        var g = ''; try { g = typeof window.aulaGeneroUsuario === 'function' ? window.aulaGeneroUsuario(u) : ''; } catch (e2) { }
        var adm = false; try { adm = typeof window.aulaEsAdminEmail === 'function' && window.aulaEsAdminEmail(u.email); } catch (e3) { }
        var rol = u.rol === 'docente' ? (g === 'mujer' ? 'INGENIERA DOCENTE' : 'INGENIERO DOCENTE') : (g === 'mujer' ? 'FUTURA INGENIERA' : 'FUTURO INGENIERO');
        if (adm && u.rol !== 'docente') rol = 'ADMINISTRADOR';
        var nombre = String(u.nombre || u.nombres || 'Usuario').trim().split(/\s+/).slice(0, 2).join(' ');
        return { rol: rol, nombre: nombre };
    }
    function pintarQuien(trg) {
        var w = trg.querySelector('.gmx-who'); if (!w) { w = el('span', 'gmx-who'); trg.insertBefore(w, trg.firstChild); }
        var q = quien(), h = '<small>' + esc(q.rol) + '</small><b>' + esc(q.nombre) + '</b>';
        if (w.innerHTML !== h) w.innerHTML = h;
    }
    function tarjeta(btn) {
        var key = btn.id === 'btnAsistenteAI' ? 'civix' : btn.getAttribute('data-seccion'), c = CARD[key]; if (!c || btn.__gmx) return;
        btn.__gmx = true;
        var h3 = btn.querySelector('h3'), p = btn.querySelector('p');
        var titulo = h3 ? h3.textContent.trim() : '', desc = p ? p.textContent.trim() : '';
        btn.classList.add('c-' + c.cat);
        btn.setAttribute('data-gmx-model', c.m);
        btn.innerHTML = '<div class="gmx-ct"><span class="gmx-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + c.ico + '</svg></span><span class="gmx-num" aria-hidden="true">' + c.n + '</span></div>' +
            '<div class="gmx-eye2">' + esc(c.eye) + '</div><h3 class="gmx-t">' + esc(titulo) + '</h3><p class="gmx-d">' + esc(desc) + '</p><div class="gmx-sp"></div>' +
            (key === 'civix' ? '<div class="gmx-prompt"><b>civix&gt;</b>¿En qué te ayudo hoy?<i></i></div>' : '<div class="gmx-cta"><span>' + esc(c.cta) + '</span><i>→</i></div>');
        btn.addEventListener('mouseenter', function () { marcar(btn); hover(c.m); });
        btn.addEventListener('focus', function () { marcar(btn); hover(c.m); });
        btn.addEventListener('mouseleave', function () { btn.classList.remove('on'); salir(); });
        btn.addEventListener('blur', function () { btn.classList.remove('on'); salir(); });
    }
    function marcar(btn) { doc.querySelectorAll('#pantallaMenu .menu-card.on').forEach(function (x) { if (x !== btn) x.classList.remove('on'); }); btn.classList.add('on'); }
    function numerar(grid) {
        var n = 0;
        (grid.closest('#pantallaMenu') || grid).querySelectorAll('.menu-card').forEach(function (b) { if (b.style.display === 'none') return; n++; var s = b.querySelector('.gmx-num'); if (s) { var t = ('0' + n).slice(-2); if (s.textContent !== t) s.textContent = t; } });
    }
    function montar() {
        var M = $('pantallaMenu'); if (!M || M.classList.contains('gmx')) return;
        var head = M.querySelector('.menu-encabezado'), grid = M.querySelector('.menu-grid'), team = $('gmEquipoBanner');
        if (!head || !grid) return;
        M.classList.add('gmx');
        /* barra superior */
        var nav = el('header', 'gmx-nav'), logos = el('div', 'gmx-logos');
        head.querySelectorAll('img.logo-menu').forEach(function (im) { logos.appendChild(im); });
        nav.appendChild(logos);
        nav.appendChild(el('div', 'gmx-brand', '<b>GEO<i>METRICS</i></b><span>LABORATORIO VIRTUAL // ING. CIVIL</span>'));
        var links = el('nav', 'gmx-links');
        [['INICIO', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); }], ['ASIGNATURAS', function () { var g = M.querySelector('.gmx-sec'); if (g) g.scrollIntoView({ behavior: 'smooth', block: 'start' }); }],
         ['SIMULADORES', function () { irA('simuladores'); }], ['RESULTADOS', function () { irA('resultados'); }], ['RECURSOS', function () { irA('recursos'); }]].forEach(function (l, i) {
            var b = el('button', i === 0 ? 'on' : '', l[0]); b.type = 'button'; b.addEventListener('click', l[1]); links.appendChild(b);
        });
        /* enlaces superiores retirados a petición: la navegación se hace con las tarjetas */
        var um = $('menuUserMenu'); if (um) nav.appendChild(um);
        M.insertBefore(nav, M.firstChild);
        var trg = $('btnMenuUsuario'); if (trg) { pintarQuien(trg); var sg = $('menuSaludoTexto'); if (sg) new MutationObserver(function () { pintarQuien(trg); }).observe(sg, { childList: true, characterData: true, subtree: true }); }
        /* hero */
        var hero = el('section', 'gmx-hero'), left = el('div', 'gmx-hl');
        left.innerHTML = '<span class="gmx-chip">MECÁNICA DE SUELOS <i>·</i> MATERIALES <i>·</i> ESTRUCTURAS</span>' +
            '<h1 class="gmx-h1"><span>CENTRO DE</span><span><em>APRENDI</em><strong>ZAJE</strong></span></h1>' +
            '<p class="gmx-lead">Teoría, <b>ensayos de laboratorio</b> y <b>simuladores</b> para la formación del ingeniero civil — todo en un laboratorio virtual.</p>';
        var info = $('menuUserInfo'); if (info) left.appendChild(info);
        hero.appendChild(left); hero.appendChild(visor());
        M.insertBefore(hero, nav.nextSibling);
        /* encabezado de módulos */
        var sec = el('div', 'gmx-sec', '<div><small>// MÓDULOS DE FORMACIÓN</small><h2>Explora por asignatura</h2></div><div class="gmx-cats"><span style="--c:#22d3ee">SUELOS</span><span style="--c:#f59e0b">MATERIALES</span><span style="--c:#a78bfa">ESTRUCTURAS</span><span style="--c:#94a3b8">HERRAMIENTAS</span></div>');
        M.insertBefore(sec, grid);
        head.style.display = 'none';
        grid.querySelectorAll('.menu-card').forEach(tarjeta);
        /* equipo creador */
        if (team) {
            var btn = $('btnEquipoCreador');
            var t = el('div', 'gmx-team', '<i class="gmx-corner a"></i><i class="gmx-corner d"></i><div class="gmx-tico" aria-hidden="true">&lt;/&gt;</div><div class="gmx-tt"><small>// EQUIPO CREADOR</small><h3>Hecho por estudiantes de <span>Ingeniería Civil</span></h3><p>Una herramienta creada por y para estudiantes: conoce a quienes diseñan y desarrollan GeoMetrics.</p></div>');
            if (btn) { btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5"/><path d="M15.5 5.2a3 3 0 0 1 0 5.6M17.5 14.2c1.8.6 2.8 2.2 3 4.8"/></svg>CONOCE AL EQUIPO <span aria-hidden="true">→</span>'; t.appendChild(btn); }
            team.innerHTML = ''; team.appendChild(t);
            team.parentNode.insertBefore(el('footer', 'gmx-foot', '<span>© ' + new Date().getFullYear() + ' GEOMETRICS // LABORATORIO VIRTUAL</span><span>MECÁNICA DE SUELOS · MATERIALES · ESTRUCTURAS</span>'), team.nextSibling);
        }
    }
    window.addEventListener('resize', function () { pintarMundo(); });
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', montar); else montar();
    window.GMMenuDiseno = { montar: montar, modelos: MODELS };
})();
