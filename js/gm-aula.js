/* GeoMetrics — Mi aula (estudiante): barra superior, navegación, columna derecha, Mis tareas y Mensajes;
 * también da el diseño de la bandeja de mensajes (fa-*) del panel docente. Solo visual: ids y botones intactos. */
(function () {
    'use strict';
    var doc = document;
    function $(id) { return doc.getElementById(id); }
    function el(t, c, h) { var e = doc.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function norm(s) { s = String(s || '').toLowerCase(); return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s; }
    var MONO = '"JetBrains Mono","IBM Plex Mono",ui-monospace,Consolas,monospace', SANS = 'Inter,"Segoe UI",system-ui,sans-serif';
    var SV = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
    var IC = {
        check: SV('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="m8 12 3 3 5-6"/>'),
        clock: SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
        inbox: SV('<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'),
        upload: SV('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>'),
        send: SV('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
        pen: SV('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
        list: SV('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
        arrow: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'),
        msg: SV('<path d="M4 5h16v11H9l-5 4z"/>'),
        bell: SV('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
        back: SV('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
        down: SV('<path d="m6 9 6 6 6-6"/>'),
        search: SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
        cal: SV('<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
        layers: SV('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>'),
        home: SV('<path d="M4 20h16"/><path d="M6 20v-6h12v6"/><path d="M10 14V6h4v8"/><path d="M12 3v3"/>'),
        beam: SV('<path d="M4 6h16M4 18h16M12 6v12"/>'),
        flask: SV('<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/>'),
        grid: SV('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
        book: SV('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
        clip: SV('<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>'),
        pin: SV('<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>')
    };
    var MATS = [[/suelos ii/, '#38bdf8', IC.home], [/suelos/, '#22d3ee', IC.layers], [/resistencia/, '#f59e0b', IC.beam], [/mezcla/, '#a78bfa', IC.flask], [/estructura|fluido/, '#f472b6', IC.grid]];
    function mat(n) { n = norm(n); return MATS.filter(function (m) { return m[0].test(n); })[0] || [null, '#22d3ee', IC.book]; }
    var R = '#pantallaEstudiante.gav', FA = '#pantallaEstudiante.gav .fa-root,#pantallaDocente.gtd .fa-root';
    function F(s) { return FA.split(',').map(function (x) { return x + ' ' + s; }).join(','); }
    var css = el('style'); css.id = 'gav-css';
    css.textContent = [
        R + '{--cy:#22d3ee;--ln:#172235;--ln2:#24324a;--in:#05080f;--mu:#8b9ab0;background:#03060b!important;color:#e6edf6}',
        R + '.av-visible{grid-template-rows:88px 1fr!important;grid-template-columns:120px minmax(0,1fr) 360px!important}',
        R + ' .av-stage,' + R + ' .av-stage-overlay{opacity:var(--gav-stage,1)}',
        R + ':has(.av-view.active:not([data-av-view="aula"])) .av-stage{opacity:.06}',
        /* barra superior */
        R + ' .av-top{display:flex!important;align-items:center;gap:20px;padding:0 28px!important;background:#03060b!important;border-bottom:1px solid var(--ln)!important;height:auto!important}',
        R + ' .av-brand{display:flex!important;align-items:center;gap:16px}' + R + ' .av-brand > *:not(.gav-brand){display:none!important}',
        R + ' .gav-brand{display:flex;align-items:center;gap:12px}' + R + ' .gav-brand img{width:50px;height:50px;object-fit:contain;background:#fff;border-radius:9px;padding:5px;box-sizing:border-box}',
        R + ' .gav-brand div{margin-left:8px;padding-left:18px;border-left:1px solid var(--ln)}' + R + ' .gav-brand b{display:block;font:700 19px/1 ' + MONO + ';letter-spacing:.32em;color:#fff}' + R + ' .gav-brand b i{font-style:normal;color:var(--cy)}' + R + ' .gav-brand span{display:block;margin-top:7px;font:500 11.5px/1 ' + MONO + ';letter-spacing:.24em;color:var(--mu)}',
        R + ' .av-top-actions{margin-left:auto!important;display:flex!important;align-items:center;gap:14px}',
        R + ' .av-icon-btn{width:54px!important;height:54px!important;display:flex!important;align-items:center;justify-content:center;border-radius:0!important;background:transparent!important;border:1px solid var(--ln2)!important;font-size:0!important;color:#cbd5e1!important;position:relative;box-shadow:none!important}' + R + ' .av-icon-btn svg{width:21px;height:21px}',
        R + ' .av-badge{position:absolute;top:6px;right:6px;font-size:10px!important;min-width:16px;height:16px;border-radius:50%!important;background:#f472b6!important;color:#fff!important;display:flex;align-items:center;justify-content:center}' + R + ' .av-badge[hidden]{display:none!important}',
        R + ' .av-user-chip{display:flex!important;align-items:center;gap:14px;min-height:54px;padding:6px 16px 6px 6px!important;border-radius:0!important;background:transparent!important;border:1px solid var(--ln2)!important;box-shadow:none!important;cursor:pointer}',
        R + ' .av-user-fb{width:44px!important;height:44px!important;border-radius:0!important;display:flex!important;align-items:center;justify-content:center;font:700 15px/1 ' + MONO + '!important;color:var(--cy)!important;background:rgba(34,211,238,.08)!important;box-shadow:inset 0 0 0 1px rgba(34,211,238,.6)!important;background-size:cover!important}',
        R + ' .av-user-text span{display:block;font-size:16px;color:#fff;font-weight:600;text-align:left}' + R + ' .av-user-text small{display:block;margin-top:4px;font:500 11.5px/1 ' + MONO + ';letter-spacing:.24em;text-transform:uppercase;color:var(--mu);text-align:left}',
        R + ' .gav-caret{width:16px;height:16px;color:var(--mu);margin-left:8px}',
        R + ' .av-btn-menu{display:inline-flex!important;align-items:center;gap:10px;height:54px;padding:0 20px!important;border-radius:0!important;background:transparent!important;border:1px solid var(--ln2)!important;color:#e2e8f0!important;font:600 13.5px/1 ' + MONO + '!important;letter-spacing:.22em!important;text-transform:uppercase;box-shadow:none!important}' + R + ' .av-btn-menu svg{width:17px;height:17px;color:var(--cy)}',
        R + ' #btnVolverEstudiante[style*="none"],' + R + ' .av-toggle-side{display:none!important}',
        /* navegación izquierda */
        R + ' .av-nav{display:flex!important;flex-direction:column;align-items:stretch;gap:8px;padding:24px 12px!important;background:#03060b!important;border-right:1px solid var(--ln)!important}',
        R + ' .av-nav .nav-display-toggle{display:none!important}',
        R + ' .av-nav > button{position:relative;display:flex!important;flex-direction:column;align-items:center;gap:10px;padding:16px 4px!important;border-radius:0!important;background:transparent!important;border:0!important;color:#9fb0c6!important;font:500 11.5px/1 ' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase;box-shadow:none!important}',
        R + ' .av-nav > button .av-ico{font-size:0!important;width:24px;height:24px;display:flex;align-items:center;justify-content:center}' + R + ' .av-nav > button .av-ico svg,' + R + ' .av-nav > button svg{width:23px;height:23px}',
        R + ' .av-nav > button:hover{color:#fff!important;background:rgba(34,211,238,.05)!important}',
        R + ' .av-nav > button.active{color:var(--cy)!important;background:linear-gradient(90deg,rgba(34,211,238,.14),rgba(34,211,238,.03))!important}' + R + ' .av-nav > button.active:before{content:"";position:absolute;left:-12px;top:0;bottom:0;width:3px;background:var(--cy)}',
        /* columna derecha */
        R + ' .av-side{padding:26px 20px!important;background:linear-gradient(180deg,#050a13,#03060b)!important;border-left:1px solid var(--ln)!important;display:flex!important;flex-direction:column;gap:18px}',
        R + ' .av-side .av-card{--c:#22d3ee;position:relative;margin:0!important;padding:22px 22px!important;border-radius:0!important;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96))!important;border:0!important;box-shadow:inset 0 0 0 1px var(--ln)!important;clip-path:polygon(0 0,calc(100% - 16px) 0,100% 16px,100% 100%,16px 100%,0 calc(100% - 16px))}',
        R + ' .av-side .av-card:before{content:"";position:absolute;left:0;right:16px;top:0;height:2px;background:linear-gradient(90deg,var(--c),transparent 70%)}',
        R + ' .av-side .av-next-class{--c:#a78bfa}',
        R + ' .av-side .av-card > h3{display:flex!important;align-items:center;justify-content:space-between;gap:10px;margin:0 0 14px!important;font:500 12px/1 ' + MONO + '!important;letter-spacing:.24em!important;color:var(--c)!important;text-transform:uppercase}',
        R + ' .av-side .av-card > h3 svg{width:16px;height:16px;margin-right:8px;vertical-align:-3px}',
        R + ' .av-side .av-link{font:600 11.5px/1 ' + MONO + '!important;letter-spacing:.2em;color:var(--cy)!important;text-transform:uppercase}',
        R + ' .av-next-day{font:800 20px/1.2 ' + SANS + '!important;color:#fff!important;text-transform:none!important;letter-spacing:-.01em!important}',
        R + ' .av-next-status{font:500 11.5px/1 ' + MONO + '!important;letter-spacing:.22em;color:var(--mu)!important;text-transform:uppercase;margin-top:6px}',
        R + ' .av-next-item{margin-top:14px!important;padding:16px 18px!important;border-radius:0!important;background:rgba(76,29,149,.18)!important;border:1px solid rgba(167,139,250,.45)!important}',
        R + ' .av-next-item strong{font-size:16px!important;color:#fff!important}' + R + ' .av-next-item-time{margin-top:6px;font:500 14px/1.3 ' + MONO + '!important;color:var(--cy)!important}' + R + ' .av-next-item-meta{margin-top:6px;font-size:13.5px!important;color:#aebbd0!important}',
        R + ' .av-course-row{display:flex!important;align-items:flex-start;gap:10px;padding:8px 0!important;background:none!important;border:0!important;cursor:pointer}',
        R + ' .av-course-dot{width:9px!important;height:9px!important;margin-top:5px;border-radius:0!important;transform:rotate(45deg);background:var(--m,#22d3ee)!important;box-shadow:none!important}',
        R + ' .av-course-info{flex:1}' + R + ' .av-course-info strong{display:flex!important;justify-content:space-between;font:500 15px/1.2 ' + SANS + '!important;color:#e6edf6!important}' + R + ' .av-course-info em{font:600 12.5px/1 ' + MONO + '!important;font-style:normal;color:var(--m,#22d3ee)!important}',
        R + ' .av-mini-bar{height:3px!important;margin-top:9px;border-radius:0!important;background:#1c2638!important}' + R + ' .av-mini-bar span{border-radius:0!important;background:var(--m,#22d3ee)!important;min-width:4px}',
        R + ' .av-cal-head{display:flex!important;align-items:center;justify-content:space-between;margin-bottom:14px}' + R + ' .av-cal-head > span{font:800 19px/1 ' + SANS + '!important;color:#fff!important}',
        R + ' .av-cal-nav button{width:38px!important;height:38px!important;border-radius:0!important;background:transparent!important;border:1px solid var(--ln2)!important;color:#cbd5e1!important;font-size:0!important;padding:0!important;display:inline-flex!important;align-items:center;justify-content:center;margin-left:6px}' + R + ' .av-cal-nav svg{width:15px;height:15px}',
        R + ' .av-cal-grid{gap:5px!important}' + R + ' .av-cal-grid .dow{font:500 11.5px/1 ' + MONO + '!important;color:var(--mu)!important;padding:6px 0}',
        R + ' .av-cal-grid .day{border-radius:0!important;font:500 13.5px/1 ' + MONO + '!important;padding:10px 0!important;background:rgba(34,211,238,.04)!important;border:1px solid var(--ln)!important;color:#e6edf6!important;box-shadow:none!important}',
        R + ' .av-cal-grid .day.muted{background:none!important;border-color:transparent!important;color:#3b4a60!important}',
        R + ' .av-cal-grid .day.today{background:var(--cy)!important;border-color:var(--cy)!important;color:#03202a!important;font-weight:700!important}',
        R + ' .av-cal-grid .day.event{border-color:#a78bfa!important;color:#c4b5fd!important;background:rgba(124,58,237,.14)!important}',
        R + ' .gav-leg{display:flex;gap:12px;white-space:nowrap;font-size:9.5px!important;margin-top:12px;font:500 10.5px/1 ' + MONO + ';letter-spacing:.18em;color:var(--mu);text-transform:uppercase}' + R + ' .gav-leg span:before{content:"";display:inline-block;width:9px;height:9px;margin-right:6px;vertical-align:-1px;border:1px solid var(--k);background:var(--b,transparent)}',
        R + ' .av-resource-list button{display:flex!important;align-items:center;gap:12px;width:100%;margin:0 0 9px!important;padding:13px 14px!important;border-radius:0!important;background:#060b14!important;border:1px solid var(--ln)!important;color:#e6edf6!important;font:500 14px/1.2 ' + SANS + '!important;text-align:left;box-shadow:none!important}',
        /* vistas */
        R + ' .av-view{padding:34px 40px 30px!important;background:none!important}',
        R + ' .av-view > h2{margin:0!important;font:900 clamp(34px,3.2vw,50px)/1.02 ' + SANS + '!important;letter-spacing:-.045em!important;color:#fff!important}' + R + ' .av-view > h2 em{font-style:normal;color:var(--cy)}',
        R + ' .gav-eye{font:500 13px/1 ' + MONO + ';letter-spacing:.26em;color:var(--cy);margin-bottom:14px}',
        R + ' .av-view-hint{margin:12px 0 26px!important;font-size:16.5px!important;color:#aebbd0!important}',
        R + ' .gav-kpis{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;margin-bottom:24px}',
        R + ' .gav-kpi{--c:#22d3ee;position:relative;display:flex;align-items:center;gap:22px;padding:28px 26px;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96));box-shadow:inset 0 0 0 1px var(--ln);clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,18px 100%,0 calc(100% - 18px))}',
        R + ' .gav-kpi:before{content:"";position:absolute;left:0;right:18px;top:0;height:2px;background:linear-gradient(90deg,var(--c),transparent 75%)}',
        R + ' .gav-ico{flex:0 0 auto;width:58px;height:58px;display:flex;align-items:center;justify-content:center;color:var(--c);background:color-mix(in srgb,var(--c) 10%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 60%,transparent);clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}' + R + ' .gav-ico svg{width:25px;height:25px}',
        R + ' .gav-kpi b{display:block;font:700 36px/1 ' + MONO + ';color:var(--c)}' + R + ' .gav-kpi > div > span{display:block;margin-top:10px;font:500 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6;text-transform:uppercase}',
        R + ' .av-view .av-card,' + R + ' .gav-card{--c:#22d3ee;position:relative;margin:0 0 24px!important;padding:28px 30px!important;border-radius:0!important;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96))!important;border:0!important;box-shadow:inset 0 0 0 1px var(--ln)!important;clip-path:polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))}',
        R + ' .av-view .av-card:before,' + R + ' .gav-card:before{content:"";position:absolute;left:0;right:20px;top:0;height:2px;background:linear-gradient(90deg,var(--c),transparent 70%)}',
        R + ' .gav-ch{display:flex;align-items:center;gap:20px;padding-bottom:22px;margin-bottom:24px;border-bottom:1px solid var(--ln)}' + R + ' .gav-ch small{display:block;font:500 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:var(--c);text-transform:uppercase}',
        R + ' .gav-ch h3{display:block!important;margin:9px 0 0!important;font:800 26px/1.1 ' + SANS + '!important;color:#fff!important;padding:0!important;border:0!important;background:none!important}' + R + ' .gav-ch .gav-r{margin-left:auto;display:flex;gap:10px;flex-wrap:wrap}',
        R + ' .av-entrega-card label{display:block!important;margin:0 0 20px!important;font:500 12.5px/1 ' + MONO + '!important;letter-spacing:.24em!important;text-transform:uppercase!important;color:#9fb0c6!important}',
        R + ' .av-entrega-card label > select,' + R + ' .av-entrega-card label > textarea,' + R + ' .gav-in{display:block;width:100%!important;box-sizing:border-box;margin-top:12px!important}',
        R + ' .gav-in{position:relative}' + R + ' .gav-in > svg{position:absolute;left:20px;top:22px;width:19px;height:19px;color:var(--mu);pointer-events:none;z-index:1}',
        R + ' .gav-in > select,' + R + ' .gav-in > textarea{width:100%!important;box-sizing:border-box;margin:0!important;padding:19px 20px 19px 56px!important;font:500 15.5px/1.4 ' + MONO + '!important;letter-spacing:0!important;text-transform:none!important;border-radius:0!important;background:var(--in)!important;border:1px solid var(--ln2)!important;color:#e6edf6!important}',
        R + ' .gav-in > textarea{min-height:120px}',
        R + ' .plazo-info{margin:-8px 0 18px!important;font:500 13.5px/1.4 ' + MONO + '!important;letter-spacing:.1em;text-transform:uppercase}' + R + ' .plazo-info:empty{display:none}',
        R + ' .plazo-info.plazo-vencido,' + R + ' .plazo-info[class*="vencid"]{color:#fb7185!important}',
        R + ' .gav-drop{position:relative;display:flex;align-items:center;gap:18px;margin-top:12px;padding:24px 26px;border:1px dashed rgba(34,211,238,.4);background:rgba(8,40,56,.18);cursor:pointer;text-transform:none;letter-spacing:0}',
        R + ' .gav-drop > svg{width:26px;height:26px;color:var(--cy);flex:0 0 auto}' + R + ' .gav-drop b{display:block;font:600 17px/1.2 ' + SANS + ';color:#fff;letter-spacing:0}' + R + ' .gav-drop small{display:block;margin-top:8px;font:500 12.5px/1 ' + MONO + ';letter-spacing:.2em;color:#9fb0c6;text-transform:uppercase}',
        R + ' .gav-drop input[type=file]{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;margin:0!important}' + R + ' .gav-drop.on{border-color:var(--cy);background:rgba(34,211,238,.08)}',
        R + ' #btnEntregar{display:flex!important;align-items:center;justify-content:center;gap:12px;width:100%;padding:22px!important;border-radius:0!important;background:var(--cy)!important;color:#03202a!important;border:0!important;font:800 15px/1 ' + MONO + '!important;letter-spacing:.24em!important;text-transform:uppercase;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}' + R + ' #btnEntregar svg{width:19px;height:19px}',
        R + ' .av-subh{display:none!important}',
        R + ' .gav-chips{display:flex;gap:10px;flex-wrap:wrap}' + R + ' .gav-chips button{padding:15px 18px;background:rgba(6,11,20,.85);border:1px solid var(--ln2);color:#cbd5e1;font:600 13px/1 ' + MONO + ';letter-spacing:.2em;text-transform:uppercase;cursor:pointer}' + R + ' .gav-chips button.on{background:var(--cy);border-color:var(--cy);color:#03202a}',
        R + ' .aula-item-task{--m:#22d3ee;display:grid!important;grid-template-columns:62px minmax(0,1fr) auto;grid-template-areas:"i t b" "i p b" "i a b" "i m b" "i l b";column-gap:22px;align-items:center;padding:22px 24px!important;margin:0 0 14px!important;border-radius:0!important;background:#05080f!important;border:1px solid var(--ln)!important;box-shadow:none!important}',
        R + ' .aula-item-task.gav-late{border-color:rgba(251,113,133,.45)!important;background:linear-gradient(90deg,rgba(76,5,25,.25),#05080f)!important}',
        R + ' .aula-item-task.gav-hide{display:none!important}',
        R + ' .aula-item-task > .gav-ti{grid-area:i;width:62px;height:62px;display:flex;align-items:center;justify-content:center;color:var(--m);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--m) 60%,transparent);background:color-mix(in srgb,var(--m) 8%,transparent)}' + R + ' .aula-item-task > .gav-ti svg{width:26px;height:26px}',
        R + ' .aula-item-task .aula-item-top{grid-area:t;display:flex!important;align-items:center;gap:14px}' + R + ' .aula-item-task .aula-item-top strong{font:800 21px/1.2 ' + SANS + '!important;color:#fff!important}',
        R + ' .aula-item-task > p:not(.plazo-info){grid-area:p;margin:6px 0 0!important;font-size:14.5px;color:#aebbd0}' + R + ' .aula-item-task > p:not(.plazo-info):empty{display:none}',
        R + ' .aula-item-task > :not(.gav-ti):not(.aula-item-top):not(p):not(.aula-item-meta):not(.btn-entregar-item){grid-area:a}',
        R + ' .aula-item-task .aula-item-meta{grid-area:m;display:flex!important;gap:22px;flex-wrap:wrap;margin-top:10px;font:500 13px/1 ' + MONO + '!important;letter-spacing:.16em;color:#9fb0c6!important;text-transform:uppercase}' + R + ' .aula-item-task .aula-item-meta span:first-child{color:var(--m)}',
        R + ' .aula-item-task .plazo-info{grid-area:l;margin:10px 0 0!important}',
        R + ' .gav-msgdoc{display:inline-flex;align-items:center;gap:8px;padding:6px 10px;background:transparent;border:1px solid rgba(167,139,250,.5);color:#c4b5fd;font:600 11px/1 ' + MONO + ';letter-spacing:.16em;text-transform:uppercase;cursor:pointer}' + R + ' .gav-msgdoc svg{width:14px;height:14px}' + R + ' .gav-msgdoc:hover{background:rgba(124,58,237,.18)}',
        R + ' .badge-ok,' + R + ' .badge-pend,' + R + ' .badge-late{border-radius:0!important;font:600 11.5px/1 ' + MONO + '!important;letter-spacing:.2em;text-transform:uppercase;padding:7px 11px!important;background:transparent!important}',
        R + ' .badge-ok{border:1px solid rgba(45,212,191,.6)!important;color:#5eead4!important}' + R + ' .badge-pend{border:1px solid rgba(34,211,238,.6)!important;color:#67e8f9!important}' + R + ' .badge-late{border:1px solid rgba(251,113,133,.6)!important;color:#fda4af!important}' + R + ' .badge-late:before{content:"●";margin-right:8px}',
        R + ' .btn-entregar-item{grid-area:b;display:inline-flex!important;align-items:center;gap:12px;padding:20px 26px!important;border-radius:0!important;background:#a78bfa!important;color:#1b0b3a!important;border:0!important;font:800 14px/1 ' + MONO + '!important;letter-spacing:.24em!important;text-transform:uppercase;box-shadow:none!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}' + R + ' .btn-entregar-item svg{width:17px;height:17px}',
        R + ' .btn-entregar-item[data-reentregar]{background:transparent!important;color:#e2e8f0!important;border:1px solid var(--ln2)!important}',
        R + ' .aula-empty-state{text-align:center;padding:30px 10px}' + R + ' .aula-empty-ico{font-size:0!important}',
        R + ' .gav-ring{position:relative;width:118px;height:118px;margin:0 auto 22px;display:flex;align-items:center;justify-content:center;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(148,163,184,.18)}' + R + ' .gav-ring:before{content:"";position:absolute;inset:12px;border-radius:50%;border:1px dashed rgba(148,163,184,.25)}' + R + ' .gav-ring:after{content:"";position:absolute;inset:-2px;border-radius:50%;border:3px solid transparent;border-top-color:var(--c,#22d3ee);transform:rotate(30deg)}',
        R + ' .gav-ring i{width:58px;height:58px;display:flex;align-items:center;justify-content:center;color:var(--c,#22d3ee);background:color-mix(in srgb,var(--c,#22d3ee) 12%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c,#22d3ee) 60%,transparent)}' + R + ' .gav-ring svg{width:24px;height:24px}',
        R + ' .aula-empty-state .aula-vacio{font-size:16px;color:#aebbd0}',
        /* Mensajes (fa-*) */
        R + ' .av-view[data-av-view="foros"] .fa-root{height:auto!important;min-height:620px}',
        F('') + '{display:grid!important;grid-template-columns:minmax(300px,.85fr) minmax(0,1.7fr)!important;gap:24px!important;background:none!important;border:0!important;box-shadow:none!important}',
        F('.fa-col-list') + ',' + F('.fa-col-main') + '{--c:#22d3ee;position:relative;display:flex;flex-direction:column;min-height:0;padding:28px 28px!important;border-radius:0!important;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96))!important;border:0!important;box-shadow:inset 0 0 0 1px #172235!important;clip-path:polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))}',
        F('.fa-col-main') + '{--c:#a78bfa}',
        F('.fa-col-list:before') + ',' + F('.fa-col-main:before') + '{content:"";position:absolute;left:0;right:20px;top:0;height:2px;background:linear-gradient(90deg,var(--c),transparent 70%)}',
        F('.fa-list-head') + '{display:flex!important;align-items:center;gap:18px;padding:0 0 22px!important;margin-bottom:22px;border-bottom:1px solid #172235!important;background:none!important}',
        F('.fa-list-head h2') + '{margin:0!important;font:800 24px/1.1 ' + SANS + '!important;color:#fff!important}' + F('.fa-list-head h2:before') + '{content:"BANDEJA";display:block;margin-bottom:9px;font:500 12px/1 ' + MONO + ';letter-spacing:.24em;color:#22d3ee}',
        F('.fa-list-head .gav-hi') + '{flex:0 0 auto;width:54px;height:54px;display:flex;align-items:center;justify-content:center;color:var(--c);box-shadow:inset 0 0 0 1px rgba(34,211,238,.6);background:rgba(34,211,238,.08)}' + F('.gav-hi svg') + '{width:24px;height:24px}',
        F('.fa-list-head .fa-icon-btn') + '{margin-left:auto!important;width:50px!important;height:50px!important;border-radius:0!important;display:flex!important;align-items:center;justify-content:center;font-size:0!important;background:rgba(34,211,238,.08)!important;border:1px solid rgba(34,211,238,.55)!important;color:#22d3ee!important;box-shadow:none!important}' + F('.fa-icon-btn svg') + '{width:20px;height:20px}',
        F('.fa-search') + '{position:relative;margin:0 0 16px!important;padding:0!important;background:none!important;border:0!important}' + F('.fa-search > svg') + '{position:absolute;left:18px;top:50%;width:18px;height:18px;transform:translateY(-50%);color:#22d3ee;pointer-events:none}',
        F('.fa-search:before') + '{display:none!important;content:none!important}' + F('.fa-list-head h2:after') + '{display:none!important}' + F('.fa-search input') + '{width:100%!important;box-sizing:border-box;padding:17px 18px 17px 50px!important;border-radius:0!important;background:#05080f!important;border:1px solid #24324a!important;color:#e6edf6!important;font:500 14.5px/1 ' + MONO + '!important}',
        F('.fa-filters') + '{display:flex!important;flex-wrap:wrap;gap:10px!important;margin:0 0 18px!important;padding:0!important;border:0!important}',
        F('.fa-chip') + '{padding:14px 16px!important;border-radius:0!important;background:rgba(6,11,20,.85)!important;border:1px solid #24324a!important;color:#cbd5e1!important;font:600 12.5px/1 ' + MONO + '!important;letter-spacing:.18em!important;text-transform:uppercase;box-shadow:none!important}',
        F('.fa-chip.active') + '{background:#22d3ee!important;border-color:#22d3ee!important;color:#03202a!important}',
        F('.fa-items') + '{border:0!important;overflow-y:auto;min-height:0}',
        F('.fa-item') + '{display:flex!important;align-items:center;gap:16px;padding:16px 18px!important;margin:0 0 10px!important;border-radius:0!important;background:#05080f!important;border:1px solid #172235!important;cursor:pointer}',
        F('.fa-item.active') + '{border-color:rgba(34,211,238,.6)!important;background:rgba(8,40,56,.35)!important}',
        F('.fa-avatar') + '{flex:0 0 auto;width:50px!important;height:50px!important;border-radius:0!important;display:flex!important;align-items:center;justify-content:center;font:700 15px/1 ' + MONO + '!important;color:#22d3ee!important;background:rgba(34,211,238,.07)!important;box-shadow:inset 0 0 0 1px rgba(34,211,238,.6)!important}',
        F('.fa-item-body strong') + '{display:block;font:700 16px/1.2 ' + SANS + '!important;color:#fff!important}' + F('.fa-item-body p') + '{margin:6px 0 0!important;font-size:14px!important;color:#aebbd0!important}',
        F('.fa-item-meta') + '{margin-left:auto;align-self:flex-start;font:500 12px/1 ' + MONO + '!important;color:#8b9ab0!important;text-transform:uppercase}',
        F('.fa-badge') + '{border-radius:0!important;background:#f472b6!important;color:#fff!important;font:700 11px/1 ' + MONO + '!important;padding:4px 7px!important}',
        F('.fa-status') + '{font-size:15px;line-height:1.55;color:#9fb0c6!important;padding:10px 0}',
        F('.fa-thread-head') + '{display:flex!important;align-items:center;gap:18px;padding:0 0 22px!important;margin-bottom:0;border-bottom:1px solid #172235!important;background:none!important}',
        F('.fa-thread-head-info strong') + '{display:block;font:800 22px/1.15 ' + SANS + '!important;color:#fff!important}' + F('.fa-thread-head-info span') + '{display:block;margin-top:6px;font:500 12.5px/1 ' + MONO + '!important;letter-spacing:.18em;color:#8b9ab0!important;text-transform:uppercase}',
        F('.fa-thread-body') + '{flex:1;min-height:0;overflow-y:auto;padding:20px 0!important;background:none!important}',
        F('.fa-bubble') + '{border-radius:0!important}',
        F('.fa-composer') + '{display:flex!important;align-items:center;gap:12px;padding:12px!important;border-radius:0!important;background:#05080f!important;border:1px solid #24324a!important}',
        F('.fa-chat-input') + '{flex:1;background:transparent!important;border:0!important;color:#e6edf6!important;font:500 15px/1.4 ' + MONO + '!important;box-shadow:none!important;outline:0}',
        F('.fa-send') + '{width:52px!important;height:52px!important;border-radius:0!important;background:#22d3ee!important;color:#03202a!important;border:0!important;display:flex!important;align-items:center;justify-content:center;font-size:0!important}' + F('.fa-send svg') + '{width:20px;height:20px}',
        F('.fa-btn') + '{border-radius:0!important;font:600 12.5px/1 ' + MONO + '!important;letter-spacing:.18em;text-transform:uppercase;padding:13px 16px!important;background:transparent!important;border:1px solid #24324a!important;color:#e2e8f0!important}',
        F('.gav-conv') + '{display:flex;align-items:center;gap:18px;padding:0 0 22px;border-bottom:1px solid #172235}' + F('.gav-conv small') + '{display:block;font:500 12px/1 ' + MONO + ';letter-spacing:.24em;color:#a78bfa}' + F('.gav-conv b') + '{display:block;margin-top:9px;font:800 24px/1.1 ' + SANS + ';color:#fff}',
        F('.gav-conv .gav-hi') + '{flex:0 0 auto;width:54px;height:54px;display:flex;align-items:center;justify-content:center;color:#a78bfa;box-shadow:inset 0 0 0 1px rgba(167,139,250,.6);background:rgba(124,58,237,.1)}' + F('.gav-conv svg') + '{width:24px;height:24px}',
        F('.fa-empty-center') + '{flex:1;display:flex!important;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px 10px!important;color:#aebbd0!important;font-size:15.5px!important;line-height:1.6}',
        F('.fa-empty-center b') + '{display:block;font-size:22px;color:#fff;margin-bottom:10px}' + F('.fa-empty-center .gav-new') + '{margin-top:22px;display:inline-flex;align-items:center;gap:12px;padding:20px 28px;background:#a78bfa;color:#1b0b3a;border:0;font:800 14px/1 ' + MONO + ';letter-spacing:.24em;text-transform:uppercase;cursor:pointer;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}' + F('.gav-new svg') + '{width:17px;height:17px}',
        F('.fa-empty-center .gav-ring') + '{--c:#22d3ee}',
        '#pantallaDocente.gtd .dp-panel[data-dp-panel="foros"].active{padding:38px 44px!important;height:auto!important;overflow:visible!important}',
        'html body #pantallaDocente.gtd .dp-panel[data-dp-panel="foros"].active .dp-foros-layout{display:block!important;height:auto!important;min-height:640px}',
        '#pantallaDocente.gtd #faRootDocente{min-height:640px!important;width:100%!important;max-width:none!important}',
        '@media (max-width:1400px){' + R + '.av-visible{grid-template-columns:100px minmax(0,1fr) 300px!important}' + R + ' .aula-item-task{grid-template-columns:52px minmax(0,1fr);grid-template-areas:"i t" "i p" "i a" "i m" "i l" ". b"}' + R + ' .btn-entregar-item{justify-self:start;margin-top:14px}}',
        '@media (max-width:1100px){' + FA + '{grid-template-columns:1fr!important}' + R + ' .gav-kpis{grid-template-columns:1fr}}',
        /* Tableta: sin columna derecha (como define aula-virtual.css); el rediseño la forzaba con !important */
        '@media (max-width:1100px){' + R + '.av-visible{grid-template-columns:96px minmax(0,1fr)!important;grid-template-areas:"top top" "nav main"!important}' + R + ' .av-side{display:none!important}' +
            R + ' .av-top{gap:12px!important;padding:0 16px!important}' + R + ' .gav-brand img{width:42px;height:42px}' + R + ' .gav-brand div span{display:none!important}' +
            R + ' .av-user-text,' + R + ' .gav-caret{display:none!important}' + R + ' .av-user-chip{padding:5px!important;gap:0!important}}',
        /* Celular: encabezado compacto, menú en fila deslizable y contenido a todo el ancho */
        '@media (max-width:720px){' +
            R + '.av-visible{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto auto minmax(0,1fr)!important;grid-template-areas:"top" "nav" "main"!important}' +
            R + ' .av-top{gap:8px!important;padding:8px 12px!important;min-height:58px}' +
            R + ' .gav-brand{gap:6px;min-width:0}' + R + ' .gav-brand img{width:36px;height:36px;padding:3px}' + R + ' .gav-brand img + img,' + R + ' .gav-brand div span{display:none!important}' +
            R + ' .gav-brand div{margin-left:2px;padding-left:10px}' + R + ' .gav-brand b{font-size:13px;letter-spacing:.2em}' +
            R + ' .av-top-actions{gap:6px!important;flex:none}' +
            R + ' .av-icon-btn{width:40px!important;height:40px!important}' + R + ' .av-icon-btn svg{width:18px;height:18px}' +
            R + ' .av-badge{top:2px;right:2px}' +
            R + ' .av-user-chip{min-height:40px!important;padding:3px!important;gap:0!important}' + R + ' .av-user-text,' + R + ' .gav-caret{display:none!important}' +
            R + ' .av-user-fb{width:32px!important;height:32px!important;font-size:12px!important}' +
            R + ' .av-btn-menu{height:40px!important;padding:0 11px!important;font-size:0!important;gap:0!important}' + R + ' .av-btn-menu svg{width:18px;height:18px}' +
            R + ' .av-nav{flex-direction:row!important;align-items:stretch;gap:2px!important;padding:6px 8px!important;overflow-x:auto;overflow-y:hidden;border-right:0!important;border-bottom:1px solid var(--ln)!important;scrollbar-width:none}' +
            R + ' .av-nav::-webkit-scrollbar{display:none}' +
            R + ' .av-nav > button{flex:0 0 auto;min-width:64px;min-height:56px;padding:8px 6px!important;gap:6px!important;font-size:9.5px!important;letter-spacing:.1em!important}' +
            R + ' .av-nav > button .av-ico svg{width:20px;height:20px}' +
            R + ' .av-nav > button.active:before{left:6px;right:6px;top:auto;bottom:-6px;width:auto;height:3px}' +
            R + ' .av-view{padding:20px 14px 32px!important}' +
            R + ' .av-view > h2{font-size:30px!important}' + R + ' .av-view-hint{font-size:14.5px!important;margin:8px 0 18px!important}' +
            R + ' .gav-kpis{gap:12px}' + R + ' .gav-kpi{padding:16px 16px;gap:14px}' + R + ' .gav-kpi b{font-size:26px}' + R + ' .gav-ico{width:44px;height:44px}' +
            R + ' .av-view .av-card,' + R + ' .gav-card{padding:18px 16px!important;margin-bottom:16px!important}' +
            R + ' .gav-ch{gap:12px;flex-wrap:wrap;padding-bottom:14px;margin-bottom:16px}' + R + ' .gav-ch h3{font-size:20px!important}' + R + ' .gav-ch .gav-r{margin-left:0;width:100%}' +
        '}'
    ].join('\n');
    doc.head.appendChild(css);

    function ico(c, svg) { return '<span class="gav-ico" style="--c:' + c + '">' + svg + '</span>'; }
    var NAV = { aula: IC.home, inicio: IC.grid, cursos: IC.book, calendario: IC.cal, tareas: IC.check, foros: IC.msg, recursos: SV('<path d="M3 6h6l2 2h10v11H3z"/>'), quices: SV('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M9 3v2h6V3"/><path d="m8.5 12 2 2 4-4"/><path d="M9 18h6"/>'), calificaciones: SV('<path d="M4 4v16h16"/><path d="m7 15 4-5 3 3 5-6"/>') };
    function dropzone(input) {
        if (!input || input.closest('.gav-drop')) return;
        var d = el('div', 'gav-drop', IC.upload + '<div><b>Arrastra tu archivo o haz clic</b><small>PDF · DOCX · XLSX · DWG — máx. 20 MB</small></div>');
        input.parentNode.insertBefore(d, input); d.appendChild(input);
        var b = d.querySelector('b');
        function upd() { var f = input.files && input.files[0]; b.textContent = f ? f.name : 'Arrastra tu archivo o haz clic'; d.classList.toggle('on', !!f); }
        input.addEventListener('change', upd); d.addEventListener('dragover', function () { d.classList.add('on'); }); d.addEventListener('dragleave', upd); d.addEventListener('drop', function () { setTimeout(upd, 0); });
    }
    function conIcono(ctrl, svg) { if (!ctrl || ctrl.parentNode.classList.contains('gav-in')) return; var w = el('span', 'gav-in', svg); ctrl.parentNode.insertBefore(w, ctrl); w.appendChild(ctrl); }

    var filtro = 'todas';
    function tareas() {
        var V = doc.querySelector('#pantallaEstudiante .av-view[data-av-view="tareas"]'); if (!V) return;
        if (!V.__gav) {
            V.__gav = 1;
            var h2 = V.querySelector(':scope > h2'); if (h2) { h2.insertAdjacentHTML('beforebegin', '<div class="gav-eye">// MI AULA</div>'); h2.innerHTML = 'Mis <em>tareas</em>'; }
            var hint = V.querySelector(':scope > .av-view-hint'); if (hint) hint.insertAdjacentElement('afterend', el('div', 'gav-kpis'));
            var card = $('panelEntregaEstudiante');
            if (card) {
                var h3 = card.querySelector(':scope > h3');
                var ch = el('div', 'gav-ch', ico('#22d3ee', IC.upload) + '<div><small>ENTREGA</small><h3>Entregar actividad</h3></div>');
                if (h3) h3.replaceWith(ch); else card.insertBefore(ch, card.firstChild);
                conIcono($('entregaTarea'), IC.check); conIcono($('entregaComentario'), IC.pen); dropzone($('entregaArchivo'));
                var be = $('btnEntregar'); if (be) be.innerHTML = IC.send + 'ENTREGAR ACTIVIDAD';
                var tc = $('entregaComentario'); if (tc) tc.placeholder = 'Notas para el docente…';
            }
            var lista = $('listaTareasEstudiante');
            if (lista) {
                var lc = el('div', 'gav-card', '<div class="gav-ch">' + ico('#a78bfa', IC.list) + '<div><small>LISTADO</small><h3>Listado de tareas</h3></div><div class="gav-r gav-chips"><button type="button" class="on" data-gf="todas">Todas</button><button type="button" data-gf="pend">Pendientes</button><button type="button" data-gf="venc">Vencidas</button><button type="button" data-gf="ent">Entregadas</button></div></div>');
                lc.style.setProperty('--c', '#a78bfa');
                lista.parentNode.insertBefore(lc, lista); lc.appendChild(lista);
                lc.querySelector('.gav-chips').addEventListener('click', function (e) { var b = e.target.closest('[data-gf]'); if (!b) return; filtro = b.getAttribute('data-gf'); lc.querySelectorAll('[data-gf]').forEach(function (x) { x.classList.toggle('on', x === b); }); decorarTareas(); });
                new MutationObserver(decorarTareas).observe(lista, { childList: true });
            }
        }
        decorarTareas();
    }
    function decorarTareas() {
        var lista = $('listaTareasEstudiante'); if (!lista) return;
        var p = 0, v = 0, en = 0;
        lista.querySelectorAll('.aula-item-task').forEach(function (it) {
            var late = !!it.querySelector('.badge-late'), ok = !!it.querySelector('.badge-ok');
            if (ok) en++; else { p++; if (late) v++; }
            if (!it.__gav) {
                it.__gav = 1;
                var m = it.querySelector('.aula-item-meta span'), mm = mat(m ? m.textContent : '');
                it.style.setProperty('--m', mm[1]); it.insertAdjacentHTML('afterbegin', '<span class="gav-ti">' + mm[2] + '</span>');
                var b = it.querySelector('.btn-entregar-item'); if (b && b.hasAttribute('data-entregar')) b.innerHTML = IC.arrow + 'ENTREGAR';
                var bt = it.querySelector('[data-entregar],[data-reentregar]'), tid = bt && (bt.getAttribute('data-entregar') || bt.getAttribute('data-reentregar'));
                var tarea = null; try { tarea = window.aulaLoad(window.AULA_KEYS.tareas, []).filter(function (x) { return x.id === tid; })[0]; } catch (e) { }
                var em = tarea ? emailDocente(tarea.docenteId, tarea.docenteNombre) : '';
                if (em) {
                    var mb = el('button', 'gav-msgdoc', IC.msg + 'Mensaje al docente'); mb.type = 'button'; mb.title = 'Escribir al docente de esta tarea';
                    mb.addEventListener('click', function () { chatCon(em, 'estudiante'); });
                    var meta = it.querySelector('.aula-item-meta'); if (meta) meta.appendChild(mb);
                }
            }
            it.classList.toggle('gav-late', late);
            it.classList.toggle('gav-hide', (filtro === 'pend' && ok) || (filtro === 'venc' && !late) || (filtro === 'ent' && !ok));
        });
        var es = lista.querySelector('.aula-empty-state'); if (es && !es.querySelector('.gav-ring')) es.insertAdjacentHTML('afterbegin', '<div class="gav-ring" style="--c:#a78bfa"><i>' + IC.check + '</i></div>');
        var k = doc.querySelector('#pantallaEstudiante .gav-kpis');
        if (k) { var h = '<div class="gav-kpi" style="--c:#22d3ee">' + ico('#22d3ee', IC.check) + '<div><b>' + p + '</b><span>Pendientes</span></div></div><div class="gav-kpi" style="--c:#fb7185">' + ico('#fb7185', IC.clock) + '<div><b>' + v + '</b><span>Vencidas</span></div></div><div class="gav-kpi" style="--c:#2dd4bf">' + ico('#2dd4bf', IC.inbox) + '<div><b>' + en + '</b><span>Entregadas</span></div></div>'; if (k.__h !== h) { k.__h = h; k.innerHTML = h; } }
    }
    function mensajes() {
        var V = doc.querySelector('#pantallaEstudiante .av-view[data-av-view="foros"]');
        if (V && !V.__gav) { V.__gav = 1; V.insertAdjacentHTML('afterbegin', '<div class="gav-eye">// MI AULA</div><h2>Mensajes</h2><p class="av-view-hint">Habla con tus docentes, compañeros y grupos.</p>'); }
        doc.querySelectorAll('#pantallaEstudiante .fa-root, #pantallaDocente .fa-root').forEach(function (root) {
            var lh = root.querySelector('.fa-list-head');
            if (lh && !lh.querySelector('.gav-hi')) { lh.insertAdjacentHTML('afterbegin', '<span class="gav-hi">' + IC.msg + '</span>'); var ib = lh.querySelector('.fa-icon-btn'); if (ib && !ib.querySelector('svg')) ib.innerHTML = IC.pen; }
            var sr = root.querySelector('.fa-search'); if (sr && !sr.querySelector('svg')) { sr.insertAdjacentHTML('afterbegin', IC.search); var si = sr.querySelector('input'); if (si) si.placeholder = 'buscar conversaciones…'; }
            var main = root.querySelector('.fa-col-main'), ec = main && main.querySelector(':scope > .fa-empty-center');
            if (ec && !ec.querySelector('.gav-ring')) {
                if (!main.querySelector('.gav-conv')) main.insertAdjacentHTML('afterbegin', '<div class="gav-conv"><span class="gav-hi">' + IC.msg + '</span><span><small>CONVERSACIÓN</small><b>Sin conversación abierta</b></span></div>');
                ec.innerHTML = '<div class="gav-ring"><i>' + IC.msg + '</i></div><b>Selecciona una conversación</b>Elige un chat de la lista o empieza uno nuevo con tus docentes, compañeros o grupos.<button type="button" class="gav-new">' + IC.pen + 'Nuevo mensaje</button>';
                ec.querySelector('.gav-new').addEventListener('click', function () { var b = root.querySelector('.fa-list-head .fa-icon-btn'); if (b) b.click(); });
            } else if (main && !ec) { var c = main.querySelector('.gav-conv'); if (c) c.remove(); }
            var snd = root.querySelector('.fa-send'); if (snd && !snd.querySelector('svg')) snd.innerHTML = IC.send;
        });
    }
    function lateral() {
        var S = doc.querySelector('#pantallaEstudiante .av-side'); if (!S) return;
        var nh = S.querySelector('.av-next-class > h3'); if (nh && !nh.__gav) { nh.__gav = 1; nh.innerHTML = '<span>' + IC.cal + 'Próximas clases</span>'; }
        var pr = $('avCalPrev'), nx = $('avCalNext'); if (pr && !pr.querySelector('svg')) pr.innerHTML = IC.back; if (nx && !nx.querySelector('svg')) nx.innerHTML = IC.back.replace('M19 12H5M11 6l-6 6 6 6', 'M5 12h14M13 6l6 6-6 6');
        var g = $('avCalGrid'); if (g && !g.parentNode.querySelector('.gav-leg')) g.insertAdjacentElement('afterend', el('div', 'gav-leg', '<span style="--k:#22d3ee;--b:#22d3ee">Hoy</span><span style="--k:#a78bfa">Clase / entrega</span><span style="--k:#24324a">Día hábil</span>'));
        S.querySelectorAll('.av-course-row').forEach(function (r) { var s = r.querySelector('strong'); if (s) r.style.setProperty('--m', mat(s.textContent)[1]); });
        S.querySelectorAll('.av-resource-list button').forEach(function (b) { if (b.__gav) return; b.__gav = 1; var t = b.childNodes[0]; if (t && t.nodeType === 3) t.textContent = t.textContent.replace(/^[^A-Za-zÁÉÍÓÚáéíóú]+/, ''); });
    }
    /* abrir (o crear) el chat directo con un usuario: docente ↔ estudiante */
    function chatCon(email, lado) {
        if (!email) return;
        var esDoc = lado === 'docente';
        var nav = esDoc ? doc.querySelector('#pantallaDocente .dp-side [data-dp-view="foros"]') : doc.querySelector('#pantallaEstudiante .av-nav [data-av-view="foros"]');
        if (nav) nav.click();
        var intentos = 0;
        (function abrir() {
            var host = $(esDoc ? 'faRootDocente' : 'faRootEstudiante');
            if (!host || !host.querySelector('.fa-col-list')) { if (++intentos < 20) setTimeout(abrir, 120); return; }
            var t = doc.createElement('div'); t.setAttribute('data-ch-start', email); t.style.display = 'none';
            host.appendChild(t); t.click(); if (t.parentNode) t.parentNode.removeChild(t);
            setTimeout(function () { var i = host.querySelector('.fa-chat-input'); if (i) try { i.focus(); } catch (e) { } }, 150);
        })();
    }
    window.GMChatCon = chatCon;
    function emailDocente(id, nombre) {
        try {
            var us = window.aulaLoad(window.AULA_KEYS.users, []);
            var u = us.filter(function (x) { return x && x.id === id; })[0] || us.filter(function (x) { return x && (x.rol === 'docente') && norm(x.nombre) === norm(nombre); })[0];
            return u ? u.email : '';
        } catch (e) { return ''; }
    }

    function montar() {
        var M = $('pantallaEstudiante'); if (!M) return false;
        if (!M.classList.contains('gav')) {
            M.classList.add('gav');
            var br = M.querySelector('.av-brand'); if (br) br.insertAdjacentHTML('beforeend', '<span class="gav-brand"><img src="docs/logo_unipamplona.png" alt="Universidad de Pamplona"><img src="docs/logo_ingenieria_civil.png" alt="Ingeniería Civil"><div><b>GEO<i>METRICS</i></b><span>MI AULA · ESTUDIANTE</span></div></span>');
            var nb = $('avBtnNotif'); if (nb) { nb.childNodes.forEach(function (n) { if (n.nodeType === 3) n.textContent = ''; }); nb.insertAdjacentHTML('afterbegin', IC.bell); }
            M.querySelectorAll('.av-top-actions > .av-icon-btn').forEach(function (b) { if (b.id !== 'avBtnNotif' && !b.querySelector('svg')) { b.textContent = ''; b.innerHTML = IC.msg; b.addEventListener('click', function () { var f = M.querySelector('.av-nav [data-av-view="foros"]'); if (f) f.click(); }); } });
            var chip = $('avUserChip'); if (chip) chip.insertAdjacentHTML('beforeend', '<span class="gav-caret">' + IC.down + '</span>');
            ['avBtnMenu', 'btnVolverEstudiante'].forEach(function (id) { var b = $(id); if (b) b.innerHTML = IC.back + 'MENÚ'; });
            M.querySelectorAll('.av-nav > button[data-av-view]').forEach(function (b) { var k = b.getAttribute('data-av-view'), s = b.querySelector('.av-ico'); if (s && NAV[k]) s.innerHTML = NAV[k]; });
            // En celular el menú es una fila deslizable: mantener visible el apartado activo
            var navEl = M.querySelector('.av-nav');
            if (navEl) new MutationObserver(function () {
                var a = navEl.querySelector(':scope > button[data-av-view].active');
                if (a && navEl.scrollWidth > navEl.clientWidth + 2) navEl.scrollTo({ left: Math.max(0, a.offsetLeft - (navEl.clientWidth - a.offsetWidth) / 2), behavior: 'smooth' });
            }).observe(navEl, { attributes: true, subtree: true, attributeFilter: ['class'] });
            var pend = false;
            new MutationObserver(function () { if (pend) return; pend = true; setTimeout(function () { pend = false; refrescar(); }, 90); }).observe(M, { childList: true, subtree: true });
        }
        refrescar(); return true;
    }
    function refrescar() { tareas(); mensajes(); lateral(); }
    /* el panel docente también usa la bandeja de mensajes */
    function docenteFa() { var D = $('pantallaDocente'); if (!D || D.__gavfa) return; D.__gavfa = 1; var p = false; new MutationObserver(function () { if (p) return; p = true; setTimeout(function () { p = false; mensajes(); }, 90); }).observe(D, { childList: true, subtree: true }); }
    function intentar(n) { var ok = montar(); docenteFa(); if (!ok && n > 0) setTimeout(function () { intentar(n - 1); }, 150); }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { intentar(20); }); else intentar(20);
})();
