/* GeoMetrics — Panel docente (2.ª parte): columna derecha fija con calendario, Estudiantes, Mis cursos,
 * Material, Análisis y menú desplegable del usuario. Solo visual: usa los mismos ids, datos y botones. */
(function () {
    'use strict';
    var doc = document;
    function $(id) { return doc.getElementById(id); }
    function el(t, c, h) { var e = doc.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function norm(s) { s = String(s || '').toLowerCase(); return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s; }
    function ini(t) { t = String(t || '').trim().split(/\s+/); return ((t[0] || '?')[0] + ((t[1] || '')[0] || '')).toUpperCase(); }
    var MONO = '"JetBrains Mono","IBM Plex Mono",ui-monospace,Consolas,monospace', SANS = 'Inter,"Segoe UI",system-ui,sans-serif';
    var SV = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
    var IC = {
        users: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.2 2.4 3.5 5.5"/>'),
        book: SV('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
        layers: SV('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>'),
        clock: SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
        msg: SV('<path d="M4 5h16v11H9l-5 4z"/>'),
        eye: SV('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
        search: SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
        home: SV('<path d="M4 20h16"/><path d="M6 20v-6h12v6"/><path d="M10 14V6h4v8"/><path d="M12 3v3"/>'),
        beam: SV('<path d="M4 6h16M4 18h16M12 6v12"/>'),
        flask: SV('<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/>'),
        grid: SV('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
        arrow: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'),
        plus: SV('<path d="M12 5v14M5 12h14"/>'),
        upload: SV('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>'),
        info: SV('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'),
        star: SV('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
        inbox: SV('<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'),
        cal: SV('<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
        pin: SV('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>'),
        left: SV('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
        right: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'),
        user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
        shield: SV('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>'),
        out: SV('<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>'),
        pen: SV('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
        folder: SV('<path d="M3 6h6l2 2h10v11H3z"/>'),
        link: SV('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>')
    };
    var MATS = [[/suelos ii/, 'MS-II', '#38bdf8', IC.home], [/suelos/, 'MS-I', '#22d3ee', IC.layers], [/resistencia/, 'RM', '#f59e0b', IC.beam], [/mezcla/, 'DM', '#a78bfa', IC.flask], [/estructura/, 'EST-I', '#f472b6', IC.grid]];
    function mat(n) { n = norm(n); return MATS.filter(function (m) { return m[0].test(n); })[0] || [null, 'GM', '#22d3ee', IC.book]; }
    var R = '#pantallaDocente.gtd';
    var css = el('style'); css.id = 'gtd2-css';
    css.textContent = [
        /* columna derecha */
        R + ' .dp-body{grid-template-columns:250px minmax(0,1fr) 330px!important}',
        R + ' .gtd-aside{display:flex;flex-direction:column;gap:18px;padding:26px 18px;overflow-y:auto;border-left:1px solid #172235;background:linear-gradient(180deg,#050a13,#03060b);min-height:0}',
        R + ' #dpForosSide{display:none!important}' + R + ' .dp-foros-layout{grid-template-columns:1fr!important}',
        R + ' .gtd-box{--c:#22d3ee;position:relative;padding:20px 20px!important;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96));box-shadow:inset 0 0 0 1px #172235;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))}',
        R + ' .gtd-box:before{content:"";position:absolute;left:0;right:16px;top:0;height:2px;background:linear-gradient(90deg,var(--c),transparent 70%)}',
        R + ' .gtd-bh{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px;font:500 11.5px/1 ' + MONO + ';letter-spacing:.24em;color:var(--c);text-transform:uppercase}' + R + ' .gtd-bh span{display:flex;align-items:center;gap:9px}' + R + ' .gtd-bh svg{width:15px;height:15px}',
        R + ' .gtd-bh button{background:none;border:0;padding:0;color:var(--cy,#22d3ee);font:600 11.5px/1 ' + MONO + ';letter-spacing:.2em;cursor:pointer;text-transform:uppercase}',
        R + ' .gtd-next b{display:block;font:800 19px/1.2 ' + SANS + ';color:#fff}' + R + ' .gtd-next small{display:block;margin-top:5px;font:500 11.5px/1 ' + MONO + ';letter-spacing:.22em;color:#8b9ab0;text-transform:uppercase}',
        R + ' .gtd-ev{margin-top:14px;padding:14px 16px;border:1px solid rgba(167,139,250,.45);background:rgba(76,29,149,.18)}' + R + ' .gtd-ev b{font-size:15px}' + R + ' .gtd-ev span{display:block;margin-top:6px;font:500 13px/1.3 ' + MONO + ';color:#22d3ee}' + R + ' .gtd-ev em{display:flex;align-items:center;gap:7px;margin-top:6px;font-style:normal;font-size:13px;color:#aebbd0}' + R + ' .gtd-ev em svg{width:14px;height:14px}',
        R + ' .gtd-cl{list-style:none;margin:0;padding:0}' + R + ' .gtd-cl li{margin:0 0 12px}' + R + ' .gtd-cl div{display:flex;align-items:center;gap:10px;font-size:14.5px;color:#e6edf6}' + R + ' .gtd-cl div:before{content:"";width:8px;height:8px;transform:rotate(45deg);background:var(--m)}' + R + ' .gtd-cl div span{margin-left:auto;font:600 12px/1 ' + MONO + ';color:var(--m)}',
        R + ' .gtd-cl i{display:block;height:3px;margin-top:7px;background:#1c2638}' + R + ' .gtd-cl i b{display:block;height:100%;background:var(--m);min-width:4px}',
        R + ' .gtd-calh{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px}' + R + ' .gtd-calh b{font:800 18px/1 ' + SANS + ';color:#fff}',
        R + ' .gtd-calh button{width:36px;height:36px;display:inline-flex;align-items:center;justify-content:center;margin-left:6px;background:transparent;border:1px solid #24324a;color:#cbd5e1;cursor:pointer}' + R + ' .gtd-calh button svg{width:15px;height:15px}',
        R + ' .gtd-cal{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:5px;text-align:center}',
        R + ' .gtd-cal > span{font:500 11px/1 ' + MONO + ';color:#8b9ab0;padding:6px 0}',
        R + ' .gtd-cal > i{font:500 13px/1 ' + MONO + ';font-style:normal;padding:9px 0;color:#e6edf6;border:1px solid transparent}',
        R + ' .gtd-cal > i.o{color:#3b4a60}' + R + ' .gtd-cal > i.w{background:rgba(34,211,238,.05);border-color:#172235}' + R + ' .gtd-cal > i.t{background:#22d3ee;color:#03202a;font-weight:700}' + R + ' .gtd-cal > i.e{border-color:#a78bfa;color:#c4b5fd}',
        R + ' .gtd-leg{display:flex;gap:12px;white-space:nowrap;font-size:9.5px!important;margin-top:12px;font:500 10.5px/1 ' + MONO + ';letter-spacing:.18em;color:#8b9ab0;text-transform:uppercase}' + R + ' .gtd-leg span:before{content:"";display:inline-block;width:9px;height:9px;margin-right:6px;vertical-align:-1px;border:1px solid var(--k);background:var(--b,transparent)}',
        R + ' .gtd-qr button{display:flex;align-items:center;gap:12px;width:100%;margin:0 0 9px;padding:13px 14px;background:#060b14;border:1px solid #172235;color:#e6edf6;font:500 14px/1.2 ' + SANS + ';cursor:pointer;text-align:left}' + R + ' .gtd-qr button:hover{border-color:rgba(34,211,238,.45)}' + R + ' .gtd-qr svg{width:16px;height:16px;color:#22d3ee}' + R + ' .gtd-qr button span{margin-left:auto;color:#64748b}',
        /* Estudiantes */
        R + ' #listaEstudiantes > table{display:none!important}',
        R + ' .gtd-st-head{display:grid;grid-template-columns:2fr 2.1fr 2.4fr 110px;gap:16px;padding:0 20px 14px;font:500 12px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6;text-transform:uppercase}' + R + ' .gtd-st-head span:last-child{text-align:right}',
        R + ' .gtd-st{display:grid;grid-template-columns:2fr 2.1fr 2.4fr 110px;gap:16px;align-items:center;padding:16px 20px;margin-bottom:12px;background:#05080f;border:1px solid #172235}',
        R + ' .gtd-st.gtd-hide{display:none!important}',
        R + ' .gtd-st .n{display:flex;align-items:center;gap:16px;min-width:0}' + R + ' .gtd-st .n b{font-size:16.5px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        R + ' .gtd-av{flex:0 0 auto;width:48px;height:48px;display:flex;align-items:center;justify-content:center;font:700 15px/1 ' + MONO + ';color:#22d3ee;box-shadow:inset 0 0 0 1px rgba(34,211,238,.6);background:rgba(34,211,238,.07);overflow:hidden}',
        R + ' .gtd-av img,' + R + ' .gtd-av .tabla-foto{width:100%!important;height:100%!important;object-fit:cover;border-radius:50%!important;margin:0!important}' + R + ' .gtd-av:has(img){border-radius:50%;box-shadow:0 0 0 2px #22d3ee}',
        R + ' .gtd-st .e{font:500 13.5px/1.3 ' + MONO + ';color:#22d3ee;overflow:hidden;text-overflow:ellipsis}',
        R + ' .gtd-st .t{display:flex;flex-wrap:wrap;gap:7px}' + R + ' .gtd-st .t i{font:600 11.5px/1 ' + MONO + ';font-style:normal;letter-spacing:.14em;padding:7px 9px;border:1px solid color-mix(in srgb,var(--m) 60%,transparent);color:var(--m)}',
        R + ' .gtd-st .a{display:flex;justify-content:flex-end;gap:8px}' + R + ' .gtd-st .a button{width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:transparent;border:1px solid #24324a;color:#cbd5e1;cursor:pointer}' + R + ' .gtd-st .a button:hover{border-color:#22d3ee;color:#22d3ee}' + R + ' .gtd-st .a svg{width:17px;height:17px}',
        R + ' .gtd-mleg{display:flex;gap:22px;flex-wrap:wrap;margin-top:16px;font:500 11.5px/1 ' + MONO + ';letter-spacing:.2em;color:#8b9ab0;text-transform:uppercase}' + R + ' .gtd-mleg span:before{content:"";display:inline-block;width:8px;height:8px;margin-right:9px;transform:rotate(45deg);background:var(--m)}',
        R + ' .gtd-sr{position:relative;width:min(380px,100%)}' + R + ' .gtd-sr svg{position:absolute;left:16px;top:50%;width:17px;height:17px;transform:translateY(-50%);color:#22d3ee}' + R + ' .gtd-sr input[type=search]{width:100%;box-sizing:border-box;padding:15px 16px 15px 46px!important;font:500 14px/1 ' + MONO + '!important}',
        /* Cursos */
        R + ' .gtd-hidecard{display:none!important}',
        R + ' .gtd-courses{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px}',
        R + ' .gtd-course .gtd-tags{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:18px}' + R + ' .gtd-course .gtd-tags i{font:600 11.5px/1 ' + MONO + ';font-style:normal;letter-spacing:.2em;padding:8px 11px;border:1px solid color-mix(in srgb,var(--c) 60%,transparent);color:var(--c);text-transform:uppercase}',
        R + ' .gtd-cst{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:18px}' + R + ' .gtd-cst div{padding:16px;background:#05080f;border:1px solid #172235}' + R + ' .gtd-cst b{display:block;font:700 26px/1 ' + MONO + ';color:var(--k)}' + R + ' .gtd-cst span{display:block;margin-top:10px;font:500 11px/1 ' + MONO + ';letter-spacing:.2em;color:#9fb0c6;text-transform:uppercase}',
        R + ' .gtd-adv{display:flex;justify-content:space-between;font:500 11.5px/1 ' + MONO + ';letter-spacing:.22em;color:#9fb0c6;text-transform:uppercase}' + R + ' .gtd-bar{height:5px;margin:10px 0 20px;background:#1c2638}' + R + ' .gtd-bar b{display:block;height:100%;min-width:6px;background:var(--c)}',
        R + ' .gtd-cbtn{display:grid;grid-template-columns:1fr 1.2fr 1.2fr;gap:10px}' + R + ' .gtd-cbtn button{display:inline-flex;align-items:center;justify-content:center;gap:10px;padding:16px 10px;background:transparent;border:1px solid #24324a;color:#e2e8f0;font:600 12.5px/1 ' + MONO + ';letter-spacing:.18em;text-transform:uppercase;cursor:pointer}' + R + ' .gtd-cbtn button svg{width:16px;height:16px}',
        R + ' .gtd-cbtn button.p{background:var(--c);border-color:var(--c);color:#03202a;font-weight:800;clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)}',
        R + ' .gtd-note{display:flex;align-items:center;gap:14px;margin-top:22px;padding:18px 20px;border:1px solid rgba(34,211,238,.25);background:rgba(8,40,56,.18);font-size:15px;color:#cbd5e1}' + R + ' .gtd-note svg{width:19px;height:19px;color:#22d3ee;flex:0 0 auto}',
        /* Material */
        R + ' .gtd-drop.big{flex-direction:column;justify-content:center;text-align:center;padding:36px 20px;min-height:200px}' + R + ' .gtd-drop.big > svg{display:none}',
        R + ' .gtd-drop.big .gtd-ring{position:relative;width:96px;height:96px;display:flex;align-items:center;justify-content:center;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(148,163,184,.18);margin:0 auto 18px}' + R + ' .gtd-drop.big .gtd-ring:after{content:"";position:absolute;inset:-2px;border-radius:50%;border:3px solid transparent;border-top-color:#22d3ee;transform:rotate(30deg)}' + R + ' .gtd-drop.big .gtd-ring i{width:46px;height:46px;display:flex;align-items:center;justify-content:center;color:#22d3ee;box-shadow:inset 0 0 0 1px rgba(34,211,238,.6);background:rgba(34,211,238,.1)}' + R + ' .gtd-drop.big .gtd-ring svg{width:20px;height:20px}',
        R + ' .gtd-chips.gtd-mat button i{background:var(--c)}',
        R + ' #listaPresDocente .aula-item.gtd-hide{display:none!important}',
        /* Análisis */
        R + ' .dp-metrics{display:flex!important;flex-direction:column;gap:14px!important}',
        R + ' .dp-metric{--k:#f59e0b;display:grid!important;grid-template-columns:56px 1fr;grid-template-rows:auto auto auto;column-gap:18px;align-items:center;padding:20px!important;background:#05080f!important;border:1px solid #172235!important;border-radius:0!important}',
        R + ' .dp-metric .gtd-ico{grid-row:1/4;width:56px;height:56px}',
        R + ' .dp-metric strong{font:700 26px/1 ' + MONO + '!important;color:var(--k)!important}',
        R + ' .dp-metric > span:not(.gtd-ico){display:none!important}' + R + ' .dp-metric b.l{font-size:16px;color:#fff;margin-top:6px}' + R + ' .dp-metric small{font:500 11.5px/1.3 ' + MONO + ';letter-spacing:.18em;color:#8b9ab0;text-transform:uppercase;margin-top:5px}',
        R + ' .gtd-rate{display:flex;align-items:center;gap:18px;margin-top:18px;padding:22px;border:1px dashed rgba(34,211,238,.35);font-size:15px;line-height:1.5;color:#cbd5e1}',
        R + ' .gtd-rate .r{flex:0 0 auto;width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:700 13px/1 ' + MONO + ';color:#e2e8f0;background:conic-gradient(#22d3ee var(--p),#1c2638 0);-webkit-mask:radial-gradient(circle,transparent 25px,#000 26px);mask:radial-gradient(circle,transparent 25px,#000 26px)}',
        R + ' .gtd-rate .rw{position:relative;width:62px;height:62px;flex:0 0 auto}' + R + ' .gtd-rate .rw b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 12px/1 ' + MONO + ';color:#e2e8f0}',
        /* menú de usuario */
        '.gtd-menu{position:fixed;z-index:10050;width:400px;padding:18px;background:linear-gradient(170deg,#0d1424,#070b14);border:1px solid rgba(34,211,238,.4);box-shadow:0 30px 60px rgba(0,0,0,.55);font-family:' + SANS + '}',
        '.gtd-menu[hidden]{display:none}',
        '.gtd-menu .h{display:flex;align-items:center;gap:16px;padding:6px 6px 18px;margin-bottom:8px;border-bottom:1px solid #1b2a40}',
        '.gtd-menu .h i{flex:0 0 auto;width:54px;height:54px;display:flex;align-items:center;justify-content:center;font:700 17px/1 ' + MONO + ';font-style:normal;color:#22d3ee;box-shadow:inset 0 0 0 1px rgba(34,211,238,.6);background:rgba(34,211,238,.08);overflow:hidden}' + '.gtd-menu .h i img{width:100%;height:100%;object-fit:cover}',
        '.gtd-menu .h b{display:block;font-size:17px;color:#fff}' + '.gtd-menu .h small{display:block;margin-top:6px;font:500 13px/1.2 ' + MONO + ';color:#22d3ee;word-break:break-all}',
        '.gtd-menu button{display:flex;align-items:center;gap:16px;width:100%;padding:15px 12px;background:transparent;border:0;color:#cbd5e1;font:500 16px/1.2 ' + SANS + ';text-align:left;cursor:pointer}' + '.gtd-menu button:hover{background:rgba(34,211,238,.06);color:#fff}' + '.gtd-menu button svg{width:20px;height:20px;color:#9fb0c6}',
        '.gtd-menu button.adm,.gtd-menu button.adm svg{color:#f472b6}' + '.gtd-menu button.out,.gtd-menu button.out svg{color:#fb7185}' + '.gtd-menu hr{border:0;border-top:1px solid #1b2a40;margin:8px 0}',
        '@media (max-width:1500px){' + R + ' .dp-body{grid-template-columns:230px minmax(0,1fr) 300px!important}' + R + ' .gtd-courses{grid-template-columns:1fr}}',
        '@media (max-width:1250px){' + R + ' .dp-body{grid-template-columns:220px minmax(0,1fr)!important}' + R + ' .gtd-aside{display:none}}',
        '@media (max-width:900px){' + R + ' .gtd-st-head{display:none}' + R + ' .gtd-st{grid-template-columns:1fr}' + R + ' .gtd-cst{grid-template-columns:repeat(2,minmax(0,1fr))}' + R + ' .gtd-cbtn{grid-template-columns:1fr}}'
    ].join('\n');
    doc.head.appendChild(css);

    function ico(c, svg) { return '<span class="gtd-ico" style="--c:' + c + '">' + svg + '</span>'; }
    function kpi(c, svg, n, l) { return '<div class="dp-kpi gtd-kpi" style="--c:' + c + '">' + ico(c, svg) + '<div><b>' + esc(n) + '</b><span>' + esc(l) + '</span></div></div>'; }
    function sesion() { try { var u = window.aulaGetSession(); if (u && window.aulaUsuarioCompleto) u = window.aulaUsuarioCompleto(u) || u; return u; } catch (e) { return null; } }
    function load(k) { try { return window.aulaLoad(window.AULA_KEYS[k], []); } catch (e) { return []; } }
    function uniq(ms) { var seen = {}; return ms.filter(function (m) { var k = norm(m.nombre); if (seen[k]) return false; seen[k] = 1; return true; }); }
    function materias(u) { var m = []; try { m = window.aulaMateriasUsuario(u) || []; } catch (e) { m = (u && u.materias) || []; } return m.map(function (x) { return typeof x === 'string' ? { nombre: x, grupo: '' } : { nombre: x.nombre || x.materia || '', grupo: x.grupo || '' }; }).filter(function (x) { return x.nombre; }); }
    function tieneMat(user, nombre) { return materias(user).some(function (m) { return norm(m.nombre) === norm(nombre); }); }
    function datos() {
        var u = sesion(); if (!u) return null;
        var ms = materias(u), ts = load('tareas').filter(function (t) { return t && t.docenteId === u.id; }), ids = {};
        ts.forEach(function (t) { ids[t.id] = t; });
        var es = load('entregas').filter(function (e) { return e && ids[e.tareaId]; });
        var est = load('users').filter(function (x) { return x && x.rol === 'estudiante' && ms.some(function (m) { return tieneMat(x, m.nombre); }); });
        return { u: u, ms: ms, ts: ts, es: es, est: est, ids: ids };
    }
    function irA(v) { var b = doc.querySelector('#pantallaDocente .dp-side [data-dp-view="' + v + '"]') || doc.querySelector('#pantallaDocente [data-dp-view="' + v + '"]'); if (b) b.click(); }
    function limite(t) { return t && t.fechaLimite ? new Date(t.fechaLimite + 'T' + (t.horaLimite || '23:59')) : null; }

    /* ---------------- columna derecha ---------------- */
    var calMes = new Date(); calMes.setDate(1);
    var MES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    var DIA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    function aside() {
        var body = doc.querySelector('#pantallaDocente .dp-body'); if (!body) return;
        var A = body.querySelector('.gtd-aside');
        if (!A) {
            A = el('aside', 'gtd-aside'); A.setAttribute('aria-label', 'Calendario y resumen'); body.appendChild(A);
            A.addEventListener('click', function (e) {
                var c = e.target.closest('[data-gtd-cal]'); if (c) { calMes.setMonth(calMes.getMonth() + (+c.getAttribute('data-gtd-cal'))); pintarAside(); return; }
                var v = e.target.closest('[data-gtd-go]'); if (v) irA(v.getAttribute('data-gtd-go'));
            });
        }
        pintarAside();
    }
    function pintarAside() {
        var A = doc.querySelector('#pantallaDocente .gtd-aside'); if (!A) return;
        var d = datos() || { ms: [], ts: [], es: [], est: [] }, now = new Date();
        var prox = d.ts.map(function (t) { return { t: t, f: limite(t) }; }).filter(function (x) { return x.f && x.f >= now; }).sort(function (a, b) { return a.f - b.f; });
        var p = prox[0], dias = p ? Math.round((new Date(p.f.getFullYear(), p.f.getMonth(), p.f.getDate()) - new Date(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5) : 0;
        var cuando = p ? (dias === 0 ? 'Hoy' : dias === 1 ? 'Mañana' : 'En ' + dias + ' días') + ' · ' + DIA[p.f.getDay()] : 'Sin fechas';
        var h = '<div class="gtd-box gtd-next" style="--c:#a78bfa"><div class="gtd-bh"><span>' + IC.cal + 'Próximas fechas</span></div><b>' + esc(cuando) + '</b><small>' + prox.length + (prox.length === 1 ? ' entrega programada' : ' entregas programadas') + '</small>' +
            (p ? '<div class="gtd-ev"><b>' + esc(p.t.titulo || 'Tarea') + '</b><span>Límite ' + p.f.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) + ' · ' + p.f.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) + '</span><em>' + IC.pin + esc((p.t.materia || '') + (p.t.grupo ? ' · Grupo ' + p.t.grupo : ' · Todos los grupos')) + '</em></div>' : '') + '</div>';
        h += '<div class="gtd-box" style="--c:#22d3ee"><div class="gtd-bh"><span>Tus cursos</span><button type="button" data-gtd-go="cursos">Ver todos →</button></div><ul class="gtd-cl">' + (d.ms.length ? uniq(d.ms).map(function (m) {
            var mm = mat(m.nombre), tt = d.ts.filter(function (t) { return norm(t.materia) === norm(m.nombre); }), cerr = tt.filter(function (t) { var f = limite(t); return f && f < now; }).length, pc = tt.length ? Math.round(cerr / tt.length * 100) : 0;
            return '<li style="--m:' + mm[2] + '"><div>' + esc(m.nombre) + '<span>' + pc + '%</span></div><i><b style="width:' + pc + '%"></b></i></li>';
        }).join('') : '<li style="--m:#64748b"><div>Sin cursos registrados</div></li>') + '</ul></div>';
        var y = calMes.getFullYear(), mo = calMes.getMonth(), start = (new Date(y, mo, 1).getDay() + 6) % 7, nd = new Date(y, mo + 1, 0).getDate(), prev = new Date(y, mo, 0).getDate(), ev = {};
        d.ts.forEach(function (t) { var f = limite(t); if (f && f.getFullYear() === y && f.getMonth() === mo) ev[f.getDate()] = 1; });
        var g = ['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(function (x) { return '<span>' + x + '</span>'; }).join('');
        for (var i = start; i > 0; i--) g += '<i class="o">' + (prev - i + 1) + '</i>';
        for (var k = 1; k <= nd; k++) { var dw = (start + k - 1) % 7, hoy = now.getFullYear() === y && now.getMonth() === mo && now.getDate() === k; g += '<i class="' + (hoy ? 't' : ev[k] ? 'e' : dw < 5 ? 'w' : '') + '" title="' + k + ' de ' + MES[mo].toLowerCase() + (ev[k] ? ' · fecha límite' : '') + '">' + k + '</i>'; }
        var tail = (7 - (start + nd) % 7) % 7; for (var j = 1; j <= tail; j++) g += '<i class="o">' + j + '</i>';
        h += '<div class="gtd-box" style="--c:#22d3ee"><div class="gtd-calh"><b>' + MES[mo] + ' ' + y + '</b><span><button type="button" data-gtd-cal="-1" aria-label="Mes anterior">' + IC.left + '</button><button type="button" data-gtd-cal="1" aria-label="Mes siguiente">' + IC.right + '</button></span></div><div class="gtd-cal">' + g + '</div><div class="gtd-leg"><span style="--k:#22d3ee;--b:#22d3ee">Hoy</span><span style="--k:#a78bfa">Fecha límite</span><span style="--k:#24324a">Día hábil</span></div></div>';
        h += '<div class="gtd-box gtd-qr" style="--c:#f59e0b"><div class="gtd-bh"><span>Recursos rápidos</span></div><button type="button" data-gtd-go="material">' + IC.book + 'Material de clase<span>→</span></button><button type="button" data-gtd-go="tareas">' + IC.plus + 'Publicar tarea<span>→</span></button><button type="button" data-gtd-go="foros">' + IC.msg + 'Mensajes<span>→</span></button></div>';
        if (A.__h !== h) { A.__h = h; A.innerHTML = h; }
    }

    /* ---------------- Estudiantes ---------------- */
    function estudiantes() {
        var box = $('listaEstudiantes'); if (!box) return;
        var card = box.closest('.dp-card'), panel = box.closest('.dp-panel'); if (!card || !panel) return;
        if (!card.__gtd2) {
            card.__gtd2 = 1; card.style.setProperty('--c', '#22d3ee');
            panel.insertBefore(el('div', 'dp-kpis gtd-stk'), card);
            var ch = el('div', 'gtd-ch', ico('#22d3ee', IC.users) + '<div><small>LISTADO</small><h3>Estudiantes vinculados</h3></div><div class="gtd-r"><label class="gtd-sr">' + IC.search + '<input type="search" placeholder="buscar estudiante…" aria-label="Buscar estudiante"></label></div>');
            card.insertBefore(ch, box);
            card.insertBefore(el('div', 'gtd-st-head', '<span>Estudiante</span><span>Correo</span><span>Materias · grupo</span><span>Acciones</span>'), box);
            card.appendChild(el('div', 'gtd-mleg', '<span style="--m:#22d3ee">MS-I · Suelos I</span><span style="--m:#38bdf8">MS-II · Suelos II</span><span style="--m:#f59e0b">RM · Resistencia</span><span style="--m:#a78bfa">DM · Mezclas</span><span style="--m:#f472b6">EST-I · Estructuras</span>'));
            ch.querySelector('input').addEventListener('input', function () { var q = norm(this.value.trim()); box.querySelectorAll('.gtd-st').forEach(function (r) { r.classList.toggle('gtd-hide', !!q && norm(r.textContent).indexOf(q) < 0); }); });
            box.addEventListener('click', function (e) {
                var b = e.target.closest('[data-gtd-st]'); if (!b) return;
                var r = b.closest('.gtd-st'), nm = r.getAttribute('data-n'), em = r.getAttribute('data-e');
                if (b.getAttribute('data-gtd-st') === 'msg') { if (window.GMChatCon) window.GMChatCon(em, 'docente'); else irA('foros'); return; }
                var msg = nm + '\n' + em + '\n\n' + [].map.call(r.querySelectorAll('.t i'), function (i) { return i.title; }).join('\n');
                if (window.gmAlert) window.gmAlert(msg, { titulo: 'Estudiante' }); else alert(msg);
            });
            new MutationObserver(pintarEst).observe(box, { childList: true });
        }
        pintarEst();
    }
    function pintarEst() {
        var box = $('listaEstudiantes'), tb = box && box.querySelector('table'), list = box && box.querySelector('.gtd-stlist');
        var rows = tb ? [].slice.call(tb.querySelectorAll('tbody tr')) : [], d = datos();
        var head = box && box.closest('.dp-card') && box.closest('.dp-card').querySelector('.gtd-st-head'); if (head) head.style.display = rows.length ? '' : 'none';
        var hace7 = Date.now() - 7 * 864e5, act = {};
        if (d) d.es.forEach(function (e) { if (new Date(e.fecha).getTime() >= hace7) { act[norm(e.estudianteEmail)] = 1; act[e.estudianteId] = 1; } });
        var mset = {}, gset = {}, sin = 0, dm = {}; (d ? d.ms : []).forEach(function (m) { dm[norm(m.nombre)] = 1; }); var filtrar = Object.keys(dm).length > 0;
        var html = rows.map(function (tr) {
            var td = tr.children; if (td.length < 5) return '';
            var nm = td[1].textContent.trim(), em = td[2].textContent.trim(), ms = td[3].textContent.split(/\s*,\s*/), gs = td[4].textContent.split(/\s*,\s*/);
            var foto = td[0].querySelector('img'), av = foto ? '<img src="' + esc(foto.getAttribute('src')) + '" alt="">' : esc(ini(nm));
            var user = load('users').filter(function (u) { return norm(u.email) === norm(em); })[0];
            if (!act[norm(em)] && !(user && act[user.id])) sin++;
            var tags = ms.map(function (m, i) { if (!m || m === '—') return ''; if (filtrar && !dm[norm(m)]) return ''; var mm = mat(m), g = (gs[i] || gs[0] || '—').trim().toUpperCase(); mset[norm(m)] = 1; if (g && g !== '—') gset[g] = 1; return '<i style="--m:' + mm[2] + '" title="' + esc(m + ' · Grupo ' + g) + '">' + mm[1] + ' · ' + esc(g === '—' ? 'X' : g) + '</i>'; }).join('');
            return '<div class="gtd-st" data-n="' + esc(nm) + '" data-e="' + esc(em) + '"><div class="n"><span class="gtd-av">' + av + '</span><b>' + esc(nm) + '</b></div><div class="e">' + esc(em) + '</div><div class="t">' + tags + '</div><div class="a"><button type="button" data-gtd-st="msg" title="Enviar mensaje" aria-label="Enviar mensaje">' + IC.msg + '</button><button type="button" data-gtd-st="ver" title="Ver detalle" aria-label="Ver detalle">' + IC.eye + '</button></div></div>';
        }).join('');
        var leg = box.closest('.dp-card') && box.closest('.dp-card').querySelector('.gtd-mleg');
        if (leg && filtrar) { var NOMB = { 'MS-I': 'Suelos I', 'MS-II': 'Suelos II', 'RM': 'Resistencia', 'DM': 'Mezclas', 'EST-I': 'Estructuras' }, lh = uniq(d.ms).map(function (m) { var mm = mat(m.nombre); return '<span style="--m:' + mm[2] + '">' + mm[1] + ' · ' + esc(NOMB[mm[1]] || m.nombre) + '</span>'; }).join(''); if (leg.__h !== lh) { leg.__h = lh; leg.innerHTML = lh; } }
        if (!list) { list = el('div', 'gtd-stlist'); box.appendChild(list); }
        if (list.__h !== html) { list.__h = html; list.innerHTML = html; }
        var k = doc.querySelector('#pantallaDocente .gtd-stk');
        if (k) { var kh = kpi('#22d3ee', IC.users, rows.length, 'Estudiantes') + kpi('#f59e0b', IC.book, Object.keys(mset).length, 'Materias') + kpi('#a78bfa', IC.layers, Object.keys(gset).length, 'Grupos') + kpi('#f472b6', IC.clock, rows.length ? sin : 0, 'Sin actividad 7d'); if (k.__h !== kh) { k.__h = kh; k.innerHTML = kh; } }
        contadores(rows.length);
    }
    function contadores(nEst) {
        var side = doc.querySelector('#pantallaDocente .dp-side'); if (!side) return;
        function badge(v, n) { var b = side.querySelector('[data-dp-view="' + v + '"]'); if (!b) return; var s = b.querySelector('.gtd-cnt'); if (!s) { s = el('span', 'gtd-cnt'); b.appendChild(s); } if (s.textContent !== String(n)) s.textContent = n; var dsp = n ? '' : 'none'; if (s.style.display !== dsp) s.style.display = dsp; }
        if (nEst != null) badge('estudiantes', nEst);
        var d = datos(); badge('cursos', d ? uniq(d.ms).length : 0);
    }
    function botonCursos() {
        var side = doc.querySelector('#pantallaDocente .dp-side'); if (!side || side.querySelector('[data-dp-view="cursos"]')) return;
        var ref = side.querySelector('[data-dp-view="estudiantes"]'); if (!ref) return;
        var b = el('button', '', '<span class="dp-ico gt-lico">' + IC.book + '</span><span class="label">Cursos</span>'); b.type = 'button'; b.setAttribute('data-dp-view', 'cursos'); b.title = 'Cursos';
        ref.insertAdjacentElement('afterend', b);
    }

    /* ---------------- Cursos ---------------- */
    function cursos() {
        var full = $('dpCoursesListFull'); if (!full) return;
        var card = full.closest('.dp-card'), panel = full.closest('.dp-panel'); if (!card || !panel) return;
        var cont = panel.querySelector('.gtd-courses');
        if (!cont) {
            card.classList.add('gtd-hidecard');
            cont = el('div', 'gtd-courses'); panel.insertBefore(cont, card);
            panel.insertBefore(el('div', 'gtd-note', IC.info + '<span>Los cursos se asignan según tu registro como docente. Si falta una asignatura, contacta al administrador de GeoMetrics.</span>'), card);
            cont.addEventListener('click', function (e) {
                var b = e.target.closest('[data-gtd-c]'); if (!b) return;
                var m = b.getAttribute('data-m'), a = b.getAttribute('data-gtd-c');
                if (a === 'material') { irA('material'); var pm = $('presMateria'); if (pm) { pm.value = m; pm.dispatchEvent(new Event('change', { bubbles: true })); } return; }
                irA('tareas');
                if (a === 'gestionar') { var fm = $('filtroMateriaTareas'); if (fm) { fm.value = m; fm.dispatchEvent(new Event('change', { bubbles: true })); } }
                else { var tm = $('tareaMateria'); if (tm) { tm.value = m; tm.dispatchEvent(new Event('change', { bubbles: true })); } var tt = $('tareaTitulo'); if (tt) setTimeout(function () { tt.focus(); }, 50); }
            });
            new MutationObserver(pintarCursos).observe(full, { childList: true });
        }
        pintarCursos();
    }
    function pintarCursos() {
        var cont = doc.querySelector('#pantallaDocente .gtd-courses'); if (!cont) return;
        var d = datos(); if (!d) return;
        var now = new Date(), by = {};
        d.ms.forEach(function (m) { var k = norm(m.nombre); if (!by[k]) by[k] = { nombre: m.nombre, grupos: [] }; if (m.grupo && by[k].grupos.indexOf(m.grupo) < 0) by[k].grupos.push(m.grupo); });
        var h = Object.keys(by).map(function (k) {
            var c = by[k], mm = mat(c.nombre), ne = d.est.filter(function (x) { return tieneMat(x, c.nombre); }).length;
            var tt = d.ts.filter(function (t) { return norm(t.materia) === k; }), tids = {}; tt.forEach(function (t) { tids[t.id] = 1; });
            var ee = d.es.filter(function (e) { return tids[e.tareaId]; }), cal = ee.filter(function (e) { return e.nota != null && e.nota !== ''; });
            var prom = cal.length ? (cal.reduce(function (a, e) { return a + (+e.nota || 0); }, 0) / cal.length).toFixed(1) : '—';
            var cerr = tt.filter(function (t) { var f = limite(t); return f && f < now; }).length, pc = tt.length ? Math.round(cerr / tt.length * 100) : 0;
            var tags = (c.grupos.length ? c.grupos : ['Todos']).map(function (g) { return '<i>Grupo ' + esc(g) + '</i>'; }).join('');
            return '<div class="dp-card gtd-course" style="--c:' + mm[2] + '"><div class="gtd-ch">' + ico(mm[2], mm[3]) + '<div><small>' + mm[1] + ' // UNIPAMPLONA</small><h3>' + esc(c.nombre) + '</h3></div></div><div class="gtd-tags">' + tags + '</div>' +
                '<div class="gtd-cst"><div style="--k:#22d3ee"><b>' + ne + '</b><span>Estudiantes</span></div><div style="--k:#a78bfa"><b>' + tt.length + '</b><span>Tareas</span></div><div style="--k:#2dd4bf"><b>' + ee.length + '</b><span>Entregas</span></div><div style="--k:#f59e0b"><b>' + prom + '</b><span>Promedio</span></div></div>' +
                '<div class="gtd-adv"><span>Avance del curso</span><span>' + cerr + ' / ' + tt.length + ' tareas cerradas</span></div><div class="gtd-bar"><b style="width:' + pc + '%"></b></div>' +
                '<div class="gtd-cbtn"><button type="button" class="p" data-gtd-c="gestionar" data-m="' + esc(c.nombre) + '">' + IC.arrow + 'Gestionar</button><button type="button" data-gtd-c="tarea" data-m="' + esc(c.nombre) + '">' + IC.plus + 'Publicar tarea</button><button type="button" data-gtd-c="material" data-m="' + esc(c.nombre) + '">' + IC.upload + 'Subir material</button></div></div>';
        }).join('') || '<div class="dp-card"><p class="dp-empty">No hay materias en tu perfil docente.</p></div>';
        if (cont.__h !== h) { cont.__h = h; cont.innerHTML = h; }
    }

    /* ---------------- Material ---------------- */
    function material() {
        var inp = $('presArchivo'), d = inp && inp.closest('.gtd-drop');
        if (d && !d.classList.contains('big')) {
            d.classList.add('big');
            var b = d.querySelector('b'), sm = d.querySelector('small');
            d.insertAdjacentHTML('afterbegin', '<div class="gtd-ring"><i>' + IC.upload + '</i></div>');
            if (b) b.textContent = 'Arrastra tu presentación aquí'; if (sm) sm.textContent = 'PDF · PPTX · DOCX · ZIP — máx. 50 MB';
        }
        var tt = $('presTitulo'); if (tt && !tt.placeholder) tt.placeholder = 'Título del material';
        var list = $('listaPresDocente'), card = list && list.closest('.dp-card');
        var msN = uniq(materias(sesion())); if (card && card.querySelector('.gtd-chips') && card.querySelectorAll('.gtd-chips [data-pm]').length !== msN.length + 1) card.querySelector('.gtd-chips').remove();
        if (card && !card.querySelector('.gtd-chips')) {
            var ms = msN, ch = el('div', 'gtd-chips gtd-mat', '<button type="button" class="on" data-pm="">Todo</button>' + ms.map(function (m) { var mm = mat(m.nombre); return '<button type="button" data-pm="' + esc(norm(m.nombre)) + '" style="--c:' + mm[2] + '"><i></i>' + esc(m.nombre.replace(/^Mecánica de /, '')) + '</button>'; }).join(''));
            card.insertBefore(ch, list);
            var f = '';
            function ap() { list.querySelectorAll('.aula-item').forEach(function (it) { it.classList.toggle('gtd-hide', !!f && norm(it.textContent).indexOf(f) < 0); }); }
            ch.addEventListener('click', function (e) { var b2 = e.target.closest('[data-pm]'); if (!b2) return; f = b2.getAttribute('data-pm'); ch.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b2); }); ap(); });
            new MutationObserver(ap).observe(list, { childList: true });
        }
    }

    /* ---------------- Análisis ---------------- */
    var MET = { dpMetricAvg: ['#f59e0b', IC.star, 'Promedio de notas', 'Notas registradas'], dpMetricRate: ['#2dd4bf', IC.inbox, 'Tasa de entrega', 'Entregas / (tareas × estudiantes)'], dpMetricPending: ['#f472b6', IC.clock, 'Pendientes de calificar', 'Entregas sin nota'] };
    function analisis() {
        Object.keys(MET).forEach(function (id) {
            var s = $(id), m = s && s.closest('.dp-metric'); if (!m || m.__gtd2) return; m.__gtd2 = 1;
            var o = MET[id]; m.style.setProperty('--k', o[0]);
            m.insertAdjacentHTML('afterbegin', ico(o[0], o[1])); m.insertAdjacentHTML('beforeend', '<b class="l">' + o[2] + '</b><small>' + o[3] + '</small>');
        });
        var r = $('dpMetricRate'), box = r && r.closest('.dp-card');
        if (box) {
            var rt = box.querySelector('.gtd-rate'); if (!rt) { rt = el('div', 'gtd-rate'); box.appendChild(rt); }
            var p = parseInt(r.textContent, 10); p = isNaN(p) ? 0 : Math.max(0, Math.min(100, p));
            var h = '<span class="rw"><span class="r" style="--p:' + p + '%"></span><b>' + p + '%</b></span><span>' + (p ? 'Tasa de entrega de tus grupos en las tareas publicadas.' : 'Los indicadores se activan cuando tus estudiantes empiecen a entregar.') + '</span>';
            if (rt.__h !== h) { rt.__h = h; rt.innerHTML = h; }
        }
    }

    /* ---------------- menú del usuario (docente y estudiante) ---------------- */
    var menu;
    function abrirMenu(chip) {
        var u = sesion(); if (!u) return;
        if (!menu) {
            menu = el('div', 'gtd-menu'); menu.hidden = true; menu.setAttribute('role', 'menu'); doc.body.appendChild(menu);
            menu.addEventListener('click', function (e) {
                var b = e.target.closest('[data-um]'); if (!b) return; var a = b.getAttribute('data-um'); cerrarMenu();
                if (a === 'perfil') { if (window.aulaAbrirPerfil) window.aulaAbrirPerfil(); }
                else if (a === 'aula') { var x = $('btnAula'); if (x) x.click(); }
                else if (a === 'admin') { if (window.aulaAbrirAdmin) window.aulaAbrirAdmin(); else { var y = $('btnAdminPanel'); if (y) y.click(); } }
                else if (a === 'salir') { var z = $('btnCerrarSesion'); if (z) z.click(); }
            });
            doc.addEventListener('click', function (e) { if (menu && !menu.hidden && !menu.contains(e.target) && !e.target.closest('#dpUserChip,#avUserChip')) cerrarMenu(); });
            doc.addEventListener('keydown', function (e) { if (e.key === 'Escape') cerrarMenu(); });
            window.addEventListener('resize', cerrarMenu);
        }
        var adm = false; try { adm = !!(window.aulaEsAdminEmail && window.aulaEsAdminEmail(u.email)); } catch (e) { }
        var nom = u.nombre || ((u.nombres || '') + ' ' + (u.apellidos || '')).trim() || u.email, foto = u.foto || u.photoURL;
        menu.innerHTML = '<div class="h"><i>' + (foto ? '<img src="' + esc(foto) + '" alt="">' : esc(ini(nom))) + '</i><span><b>' + esc(nom) + '</b><small>' + esc(u.email || '') + '</small></span></div>' +
            '<button type="button" data-um="perfil">' + IC.user + 'Editar perfil</button><button type="button" data-um="aula">' + IC.home + 'Mi aula</button>' + (adm ? '<button type="button" class="adm" data-um="admin">' + IC.shield + 'Administrador</button>' : '') + '<hr><button type="button" class="out" data-um="salir">' + IC.out + 'Cerrar sesión</button>';
        var r = chip.getBoundingClientRect();
        menu.style.top = Math.round(r.bottom + 10) + 'px';
        menu.style.left = Math.round(Math.max(10, Math.min(window.innerWidth - 410, r.right - 400))) + 'px';
        menu.hidden = false;
    }
    function cerrarMenu() { if (menu) menu.hidden = true; }
    doc.addEventListener('click', function (e) {
        var chip = e.target.closest && e.target.closest('#dpUserChip,#avUserChip'); if (!chip) return;
        e.stopPropagation(); e.preventDefault();
        if (menu && !menu.hidden) cerrarMenu(); else abrirMenu(chip);
    }, true);

    /* ---------------- menú del usuario en el Centro de aprendizaje ---------------- */
    var UM = '#menuUserDropdown.gum';
    var css2 = el('style'); css2.id = 'gum-css';
    css2.textContent = [
        UM + '{width:400px!important;padding:18px!important;border-radius:0!important;background:linear-gradient(170deg,#0d1424,#070b14)!important;border:1px solid rgba(34,211,238,.4)!important;box-shadow:0 30px 60px rgba(0,0,0,.55)!important;font-family:' + SANS + '!important;backdrop-filter:none!important}',
        UM + '[hidden]{display:none!important}',
        UM + ' .gum-h{display:flex;align-items:center;gap:16px;padding:6px 6px 18px;margin-bottom:8px;border-bottom:1px solid #1b2a40}',
        UM + ' .gum-h i{flex:0 0 auto;width:54px;height:54px;display:flex;align-items:center;justify-content:center;font:700 17px/1 ' + MONO + ';font-style:normal;color:#22d3ee;box-shadow:inset 0 0 0 1px rgba(34,211,238,.6);background:rgba(34,211,238,.08);overflow:hidden}' + UM + ' .gum-h i img{width:100%;height:100%;object-fit:cover}',
        UM + ' .gum-h b{display:block;font-size:17px;color:#fff;text-align:left}' + UM + ' .gum-h small{display:block;margin-top:6px;font:500 12px/1.2 ' + MONO + '!important;color:#22d3ee!important;word-break:break-all;text-align:left;letter-spacing:0!important;text-transform:none!important}',
        UM + ' .menu-user-item{display:flex!important;align-items:center;gap:16px;width:100%;margin:0!important;padding:15px 12px!important;border-radius:0!important;background:transparent!important;border:0!important;color:#cbd5e1!important;font:500 16px/1.2 ' + SANS + '!important;text-align:left;box-shadow:none!important;cursor:pointer}',
        UM + ' .menu-user-item:hover{background:rgba(34,211,238,.06)!important;color:#fff!important}' + UM + ' .menu-user-item svg{width:20px;height:20px;flex:0 0 auto;color:#9fb0c6}',
        UM + ' #btnAdminPanel,' + UM + ' #btnAdminPanel svg{color:#f472b6!important}' + UM + ' #btnAdminPanel[hidden]{display:none!important}',
        UM + ' .menu-user-item-danger{margin-top:8px!important;border-top:1px solid #1b2a40!important;padding-top:18px!important}' + UM + ' .menu-user-item-danger,' + UM + ' .menu-user-item-danger svg{color:#fb7185!important}'
    ].join('\n');
    doc.head.appendChild(css2);
    var UMI = { btnEditarPerfil: [IC.user, 'Editar perfil'], btnAula: [IC.home, 'Mi aula'], btnAdminPanel: [IC.shield, 'Administrador'], btnCerrarSesion: [IC.out, 'Cerrar sesión'] };
    function menuInicio() {
        var D = $('menuUserDropdown'); if (!D) return;
        if (!D.classList.contains('gum')) {
            D.classList.add('gum');
            Object.keys(UMI).forEach(function (id) { var b = $(id); if (b) b.innerHTML = UMI[id][0] + '<span>' + UMI[id][1] + '</span>'; });
            D.insertAdjacentHTML('afterbegin', '<div class="gum-h"></div>');
            new MutationObserver(function () { if (!D.hidden) cabeceraMenu(); }).observe(D, { attributes: true, attributeFilter: ['hidden'] });
        }
        cabeceraMenu();
    }
    function cabeceraMenu() {
        var D = $('menuUserDropdown'), h = D && D.querySelector('.gum-h'); if (!h) return;
        var u = sesion(); if (!u) { h.style.display = 'none'; return; } h.style.display = '';
        var nom = u.nombre || ((u.nombres || '') + ' ' + (u.apellidos || '')).trim() || u.email, foto = u.foto || u.photoURL;
        var html = '<i>' + (foto ? '<img src="' + esc(foto) + '" alt="">' : esc(ini(nom))) + '</i><span><b>' + esc(nom) + '</b><small>' + esc(u.email || '') + '</small></span>';
        if (h.__h !== html) { h.__h = html; h.innerHTML = html; }
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', menuInicio); else menuInicio();

    /* ---------------- montaje ---------------- */
    function refrescar() { botonCursos(); aside(); estudiantes(); cursos(); material(); analisis(); contadores(); }
    function montar() {
        var M = $('pantallaDocente'); if (!M || !M.classList.contains('gtd')) return false;
        if (!M.__gtd2) {
            M.__gtd2 = 1; var pend = false;
            new MutationObserver(function () { if (pend) return; pend = true; setTimeout(function () { pend = false; refrescar(); }, 90); }).observe(M, { childList: true, subtree: true });
            new MutationObserver(function () { if (M.style.display !== 'none' || M.classList.contains('av-doc-visible')) refrescar(); }).observe(M, { attributes: true, attributeFilter: ['style', 'class'] });
        }
        refrescar(); return true;
    }
    function intentar(n) { if (!montar() && n > 0) setTimeout(function () { intentar(n - 1); }, 150); }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { intentar(30); }); else intentar(30);
})();
