/* GeoMetrics — diseño "laboratorio" del Panel docente (Dashboard, Tareas, Entregas y demás vistas).
 * Solo reorganiza y da estilo: los ids, botones y renderizados de aula.js / docente-dashboard.js no cambian. */
(function () {
    'use strict';
    var doc = document;
    function $(id) { return doc.getElementById(id); }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function norm(s) { s = String(s || '').toLowerCase(); return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s; }
    var MONO = '"JetBrains Mono","IBM Plex Mono",ui-monospace,SFMono-Regular,Consolas,monospace', SANS = 'Inter,"Segoe UI",system-ui,sans-serif';
    var SV = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
    var IC = {
        users: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.2 2.4 3.5 5.5"/>'),
        star: SV('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
        check: SV('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="m8 12 3 3 5-6"/>'),
        inbox: SV('<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>'),
        chart: SV('<path d="M4 4v16h16"/><path d="m7 15 4-5 3 3 5-6"/>'),
        cal: SV('<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
        book: SV('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
        hist: SV('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'),
        plus: SV('<path d="M12 5v14M5 12h14"/>'),
        list: SV('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
        upload: SV('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>'),
        send: SV('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
        clock: SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
        search: SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
        bell: SV('<path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
        back: SV('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
        out: SV('<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>'),
        down: SV('<path d="m6 9 6 6 6-6"/>'),
        layers: SV('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>'),
        home: SV('<path d="M4 20h16"/><path d="M6 20v-6h12v6"/><path d="M10 14V6h4v8"/><path d="M12 3v3"/>'),
        beam: SV('<path d="M4 6h16M4 18h16M12 6v12"/>'),
        flask: SV('<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/>'),
        msg: SV('<path d="M4 5h16v11H9l-5 4z"/>'),
        file: SV('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>')
    };
    var R = '#pantallaDocente.gtd';

    var css = el('style'); css.id = 'gtd-css';
    css.textContent = [
        R + '{--cy:#22d3ee;--am:#f59e0b;--vi:#a78bfa;--pk:#f472b6;--te:#2dd4bf;--ln:#172235;--ln2:#24324a;--in:#05080f;--mu:#8b9ab0;color:#e6edf6}',
        /* barra superior */
        R + ' .dp-top{display:flex!important;align-items:center;gap:20px;padding:14px 26px!important;min-height:0!important}',
        R + ' .dp-top-nav{display:none!important}',
        R + ' .dp-brand{display:flex!important;align-items:center;gap:16px}' + R + ' .dp-brand > img,' + R + ' .dp-brand > div:not(.gtd-brand):not(.gtd-logos){display:none!important}',
        R + ' .gtd-logos{display:flex;gap:10px}' + R + ' .gtd-logos img{width:50px;height:50px;object-fit:contain;background:#fff;border-radius:9px;padding:5px;box-sizing:border-box}',
        R + ' .gtd-brand{padding-left:18px;border-left:1px solid var(--ln)}' + R + ' .gtd-brand b{display:block;font:700 19px/1 ' + MONO + ';letter-spacing:.32em;color:#fff}' + R + ' .gtd-brand b i{font-style:normal;color:var(--cy)}' + R + ' .gtd-brand span{display:block;margin-top:7px;font:500 11.5px/1 ' + MONO + ';letter-spacing:.24em;color:var(--mu)}',
        R + ' .dp-search{flex:0 1 600px;margin-left:auto!important;display:flex!important;align-items:center;gap:12px;padding:0 18px!important;height:54px;border-radius:0!important;background:var(--in)!important;border:1px solid var(--ln2)!important}',
        R + ' .dp-search > span{font-size:0!important;color:var(--cy);display:flex}' + R + ' .dp-search > span svg{width:19px;height:19px}',
        R + ' .dp-search input,' + R + ' #dpSearch{border:0!important;outline:0!important;background:transparent!important;color:#e2e8f0!important;font:500 15px/1 ' + MONO + '!important;padding:0!important;box-shadow:none!important;outline:0!important;width:100%}',
        R + ' .dp-top-right{display:flex!important;align-items:center;gap:14px}',
        R + ' #dpBtnNotif{width:54px;height:54px;display:flex!important;align-items:center;justify-content:center;font-size:0!important;position:relative}' + R + ' #dpBtnNotif svg{width:21px;height:21px;color:#cbd5e1}' + R + ' #dpBtnNotif .dp-badge{position:absolute;top:6px;right:6px;font-size:10px!important;background:var(--pk)!important;color:#fff!important;border:0!important;border-radius:50%!important;min-width:16px;height:16px;display:flex;align-items:center;justify-content:center}',
        R + ' .dp-user-chip{display:flex!important;align-items:center;gap:14px;padding:6px 16px 6px 6px!important;min-height:54px;box-sizing:border-box;cursor:pointer}',
        R + ' .dp-user-chip strong{display:block;font-size:16px;color:#fff;font-weight:600}' + R + ' .dp-user-chip small{display:block;margin-top:4px;font:500 11.5px/1 ' + MONO + ';letter-spacing:.24em;text-transform:uppercase;color:var(--mu)}',
        R + ' .dp-user-av{width:44px!important;height:44px!important;font:700 15px/1 ' + MONO + '!important;display:flex!important;align-items:center;justify-content:center;background-size:cover!important}',
        R + ' .gtd-caret{width:16px;height:16px;color:var(--mu);margin-left:8px}',
        R + ' #btnVolverDocente{display:inline-flex!important;align-items:center;gap:10px;height:54px;padding:0 20px!important}' + R + ' #btnVolverDocente svg{width:17px;height:17px;color:var(--cy)}',
        /* lateral */
        R + ' .dp-side{padding:28px 18px!important}',
        R + ' .dp-side .nav-display-toggle{display:none!important}',
        R + ' .dp-side > button,' + R + ' .dp-side-foot > button{display:flex!important;align-items:center;gap:16px;width:100%;padding:16px 18px!important;margin:3px 0!important;background:transparent!important;border:0!important;text-align:left}',
        R + ' .dp-side > button .tab-badge,' + R + ' .gtd-cnt{margin-left:auto;font:600 12px/1 ' + MONO + ';padding:5px 8px;border:1px solid rgba(34,211,238,.55);color:var(--cy)}',
        R + ' .dp-side-foot{border-top:1px solid var(--ln)!important;padding-top:16px!important}',
        R + ' #dpBtnMsgs{display:none!important}',
        R + ' .gtd-logout,' + R + ' .gtd-logout .label{color:#fb7185!important}',
        /* encabezado de vista */
        R + ' .dp-main{padding:38px 44px 24px!important}',
        R + ' .dp-head{display:flex!important;align-items:flex-end;justify-content:space-between;gap:20px;margin:0 0 30px!important;padding:0!important;border:0!important;background:none!important}',
        R + ' .gtd-eye{font:500 13px/1 ' + MONO + ';letter-spacing:.26em;color:var(--cy);text-transform:uppercase;margin-bottom:14px}',
        R + ' .dp-head h1{margin:0!important;font-family:' + SANS + '!important;font-size:clamp(34px,3.6vw,54px)!important;font-weight:900!important;letter-spacing:-.045em!important;line-height:1.02!important;color:#fff!important;background:none!important;-webkit-text-fill-color:#fff!important}',
        R + ' .dp-head h1 em{font-style:normal;color:var(--cy);-webkit-text-fill-color:var(--cy)}',
        R + ' .dp-head p{margin:12px 0 0!important;font-size:17px!important;color:#aebbd0!important}',
        R + ' .dp-head .dp-btn-primary{display:inline-flex!important;align-items:center;gap:12px;padding:22px 30px!important;font-size:15px!important}' + R + ' .dp-head .dp-btn-primary svg{width:18px;height:18px}',
        /* KPIs */
        R + ' .dp-kpis{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:20px!important;margin:0 0 26px!important}',
        R + ' .dp-kpi,' + R + ' .gtd-kpi{--c:var(--cy);display:flex!important;flex-direction:row!important;align-items:center;gap:22px;padding:30px 28px!important;min-height:0!important}',
        R + ' .dp-kpi.alert{--c:var(--pk)}' + R + ' .dp-kpi.violet{--c:var(--vi)}' + R + ' .dp-kpi.ok{--c:var(--te)}',
        R + ' .dp-kpi:before,' + R + ' .gtd-kpi:before{background:linear-gradient(90deg,var(--c),transparent 75%)!important}',
        R + ' .gtd-ico{flex:0 0 auto;width:60px;height:60px;display:flex;align-items:center;justify-content:center;color:var(--c);background:color-mix(in srgb,var(--c) 10%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 60%,transparent);clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}',
        R + ' .gtd-ico svg{width:26px;height:26px}',
        R + ' .dp-kpi-num,' + R + ' .gtd-kpi b{display:block;font:700 38px/1 ' + MONO + '!important;color:var(--c)!important}',
        R + ' .dp-kpi > div > span:not(.dp-kpi-num),' + R + ' .gtd-kpi > div > span{display:block;margin-top:10px;font:500 13px/1.2 ' + MONO + '!important;letter-spacing:.24em;text-transform:uppercase;color:#9fb0c6!important}',
        /* tarjetas */
        R + ' .dp-card{--c:var(--cy);padding:30px 30px!important}',
        R + ' .dp-card:before{background:linear-gradient(90deg,var(--c),transparent 75%)!important}',
        R + ' .gtd-ch{display:flex;align-items:center;gap:20px;padding-bottom:24px;margin-bottom:26px;border-bottom:1px solid var(--ln)}',
        R + ' .gtd-ch small{display:block;font:500 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:var(--c);text-transform:uppercase}',
        R + ' .gtd-ch h3{display:block!important;margin:9px 0 0!important;font-family:' + SANS + '!important;font-size:26px!important;font-weight:800!important;letter-spacing:-.02em;color:#fff!important;border:0!important;padding:0!important;background:none!important}',
        R + ' .gtd-ch .gtd-r{margin-left:auto;display:flex;align-items:center;gap:10px}',
        R + ' .gtd-ch .dp-link{font:600 13px/1 ' + MONO + '!important;letter-spacing:.24em;text-transform:uppercase;color:var(--cy)!important;cursor:pointer}',
        R + ' .gtd-ch .tab-badge,' + R + ' .gtd-tag{font:600 12.5px/1 ' + MONO + '!important;letter-spacing:.2em;text-transform:uppercase;padding:8px 12px!important;border:1px solid color-mix(in srgb,var(--c) 60%,transparent)!important;color:var(--c)!important;background:transparent!important;border-radius:0!important}',
        R + ' .dp-dash-grid{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:24px!important}',
        R + ' .dp-dash-grid > .dp-card{grid-column:span 4}' + R + ' .dp-dash-grid > .dp-card.dp-span-2{grid-column:span 8}' + R + ' .dp-dash-grid > .dp-card.gtd-cursos{grid-column:span 6}' + R + ' .dp-dash-grid > .dp-card.gtd-act{grid-column:span 3}' + R + ' .dp-dash-grid > .dp-card.gtd-pend{grid-column:span 3}' + R + ' [hidden]{display:none!important}',
        R + ' .dp-chart-legend{font:500 13px/1 ' + MONO + ';letter-spacing:.2em;text-transform:uppercase;color:#9fb0c6}' + R + ' .dp-chart-legend i{border-radius:0!important}',
        R + ' #dpChartEmpty{display:none!important}',
        R + ' .dp-chart-wrap{position:relative}' + R + ' .gtd-chart-empty{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);display:flex;align-items:center;gap:12px;padding:16px 24px;background:#070c16;border:1px solid var(--ln2);font:500 14px/1 ' + MONO + ';letter-spacing:.2em;text-transform:uppercase;color:#cbd5e1;white-space:nowrap}' + R + ' .gtd-chart-empty svg{width:18px;height:18px;color:var(--cy)}',
        R + ' .dp-course{display:grid!important;grid-template-columns:58px minmax(0,1fr) auto;align-items:center;gap:6px 18px;padding:20px!important;margin:0 0 14px!important;border-radius:0!important;background:var(--in)!important;border:1px solid var(--ln)!important}',
        R + ' .dp-course-top{display:contents!important}',
        R + ' .dp-course .gtd-cico{grid-row:1/3;width:58px;height:58px;display:flex;align-items:center;justify-content:center;color:var(--cy);box-shadow:inset 0 0 0 1px rgba(34,211,238,.55);background:rgba(34,211,238,.06)}' + R + ' .dp-course .gtd-cico svg{width:26px;height:26px}',
        R + ' .dp-course strong{font-size:19px;color:#fff}' + R + ' .dp-course small{font:500 13px/1.6 ' + MONO + ';letter-spacing:.16em;text-transform:uppercase;color:#9fb0c6}',
        R + ' .dp-course .gtd-code{display:inline-block;margin-left:10px;font:600 12px/1 ' + MONO + ';letter-spacing:.14em;padding:5px 8px;border:1px solid rgba(34,211,238,.55);color:var(--cy);vertical-align:3px}',
        R + ' .dp-btn-sm{border-radius:0!important;background:transparent!important;border:1px solid var(--ln2)!important;color:#e2e8f0!important;font:600 13.5px/1 ' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase;padding:16px 18px!important;box-shadow:none!important}',
        R + ' .dp-btn-sm:hover{border-color:var(--cy)!important}',
        R + ' .dp-progress{grid-column:2;height:5px!important;border-radius:0!important;background:#1c2638!important}' + R + ' .dp-progress span{border-radius:0!important;background:var(--cy)!important;min-width:8px}',
        R + ' .dp-activity-item,' + R + ' .dp-event{border-radius:0!important;background:var(--in)!important;border:1px solid var(--ln)!important;margin-bottom:10px!important;padding:14px!important}',
        R + ' .dp-event-date{border-radius:0!important}',
        /* vacíos */
        R + ' .gtd-empty{display:flex;flex-direction:column;align-items:center;text-align:center;padding:30px 10px}',
        R + ' .gtd-ring{position:relative;width:118px;height:118px;display:flex;align-items:center;justify-content:center;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(148,163,184,.18)}',
        R + ' .gtd-ring:before{content:"";position:absolute;inset:12px;border-radius:50%;border:1px dashed rgba(148,163,184,.25)}',
        R + ' .gtd-ring:after{content:"";position:absolute;inset:-2px;border-radius:50%;border:3px solid transparent;border-top-color:var(--c);transform:rotate(30deg)}',
        R + ' .gtd-ring i{width:58px;height:58px;display:flex;align-items:center;justify-content:center;color:var(--c);background:color-mix(in srgb,var(--c) 12%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 60%,transparent)}' + R + ' .gtd-ring svg{width:24px;height:24px}',
        R + ' .gtd-empty b{display:block;margin-top:24px;font-size:22px;color:#fff;font-weight:700}' + R + ' .gtd-empty p{margin:12px 0 0;max-width:460px;font-size:16px;line-height:1.55;color:#aebbd0}',
        R + ' .gtd-empty button{margin-top:22px;display:inline-flex;align-items:center;gap:12px;border-radius:0!important;font:700 14px/1 ' + MONO + '!important;letter-spacing:.22em;text-transform:uppercase;padding:16px 20px!important;cursor:pointer;background:transparent!important;color:#e2e8f0!important;border:1px solid var(--ln2)!important;box-shadow:none!important}',
        R + ' .gtd-empty button.p{background:var(--cy)!important;color:#03202a!important;border:0!important;padding:22px 30px!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}' + R + ' .gtd-empty button svg{width:18px;height:18px}',
        R + ' .gtd-hide{display:none!important}',
        /* formularios */
        R + ' .dp-work-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:26px!important}',
        R + ' .dp-card label{display:block!important;margin:0 0 20px!important;font:500 12.5px/1 ' + MONO + '!important;letter-spacing:.24em!important;text-transform:uppercase!important;color:#9fb0c6!important}',
        R + ' .dp-card label > input,' + R + ' .dp-card label > select,' + R + ' .dp-card label > textarea{display:block;width:100%!important;box-sizing:border-box;margin-top:12px!important;padding:19px 20px!important;font-size:16px!important;letter-spacing:0!important;text-transform:none!important}',
        R + ' .dp-card label > textarea{min-height:130px;resize:vertical}',
        R + ' .av-doc-row{display:grid!important;grid-template-columns:1fr 1fr;gap:0 20px!important}',
        R + ' .gtd-drop{position:relative;display:flex;align-items:center;gap:18px;margin-top:12px;padding:24px 26px;border:1px dashed rgba(34,211,238,.4);background:rgba(8,40,56,.18);cursor:pointer;text-transform:none;letter-spacing:0}',
        R + ' .gtd-drop svg{width:26px;height:26px;color:var(--cy);flex:0 0 auto}' + R + ' .gtd-drop b{display:block;font:600 17px/1.2 ' + SANS + ';color:#fff;letter-spacing:0}' + R + ' .gtd-drop small{display:block;margin-top:8px;font:500 12.5px/1 ' + MONO + ';letter-spacing:.2em;color:#9fb0c6;text-transform:uppercase}',
        R + ' .gtd-drop input[type=file]{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;margin:0!important;padding:0!important}',
        R + ' .gtd-drop.on{border-color:var(--cy);background:rgba(34,211,238,.08)}',
        R + ' .av-doc-actions{display:flex!important;gap:14px;margin-top:8px}',
        R + ' .av-doc-actions .av-btn-primary,' + R + ' #btnSubirPres{flex:2 1 auto;display:inline-flex!important;align-items:center;justify-content:center;gap:12px;padding:24px 20px!important;font-size:15px!important}',
        R + ' .av-doc-actions .av-btn-primary svg,' + R + ' #btnSubirPres svg{width:19px;height:19px}',
        R + ' .av-doc-actions .av-btn-ghost{flex:1 1 auto;padding:22px 18px!important}',
        R + ' #btnSubirPres{width:100%;margin-top:6px}',
        R + ' .av-btn-ghost{border-radius:0!important;background:transparent!important;border:1px solid var(--ln2)!important;color:#e2e8f0!important;font:600 14px/1 ' + MONO + '!important;letter-spacing:.22em!important;text-transform:uppercase}',
        R + ' .av-btn-primary{border-radius:0!important;background:var(--cy)!important;color:#03202a!important;border:0!important;font:800 15px/1 ' + MONO + '!important;letter-spacing:.24em!important;text-transform:uppercase;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}',
        R + ' #btnFiltrarTareas{display:none!important}',
        R + ' .gtd-chips{display:flex;gap:10px;flex-wrap:wrap;margin:0 0 20px}',
        R + ' .gtd-chips button{display:inline-flex;align-items:center;gap:10px;background:rgba(6,11,20,.85)!important;border:1px solid var(--ln2)!important;border-radius:0!important;color:#cbd5e1!important;font:600 13.5px/1 ' + MONO + '!important;letter-spacing:.22em;padding:17px 20px!important;cursor:pointer;text-transform:uppercase;box-shadow:none!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)}',
        R + ' .gtd-chips button i{width:9px;height:9px;transform:rotate(45deg);background:var(--c)}',
        R + ' .gtd-chips button.on{background:var(--cy)!important;color:#03202a!important;border-color:var(--cy)!important}',
        R + ' .gtd-chips .gtd-s{position:relative;flex:1 1 360px}' + R + ' .gtd-chips .gtd-s svg{position:absolute;left:20px;top:50%;width:19px;height:19px;transform:translateY(-50%);color:var(--cy)}',
        R + ' .gtd-chips .gtd-s input{width:100%;box-sizing:border-box;height:100%;min-height:58px;padding:0 20px 0 54px!important;font:500 15px/1 ' + MONO + '!important}',
        R + ' .gtd-chips select{min-height:58px;padding:0 18px!important;font:600 13.5px/1 ' + MONO + '!important;letter-spacing:.18em;text-transform:uppercase}',
        R + ' .aula-item{border-radius:0!important;background:var(--in)!important;border:1px solid var(--ln)!important;padding:18px 20px!important;margin:0 0 12px!important;box-shadow:none!important}',
        R + ' .aula-item strong{font-size:17px;color:#fff}' + R + ' .aula-item small{font-family:' + MONO + ';letter-spacing:.06em;color:#9fb0c6}',
        R + ' .aula-item-acciones button,' + R + ' .entrega-detalle button{border-radius:0!important;font:600 12.5px/1 ' + MONO + '!important;letter-spacing:.16em;text-transform:uppercase;padding:11px 14px!important;background:transparent!important;border:1px solid var(--ln2)!important;color:#e2e8f0!important;box-shadow:none!important}',
        R + ' .aula-item-acciones .btn-item-del{border-color:rgba(248,113,113,.55)!important;color:#fca5a5!important}',
        R + ' .entrega-detalle .btn-calificar{background:var(--cy)!important;color:#03202a!important;border:0!important}',
        R + ' .aula-vacio,' + R + ' .dp-empty{color:#9fb0c6!important}',
        /* entregas como tabla */
        R + ' .gtd-thead,' + R + ' .gtd-erow{display:grid;grid-template-columns:2fr 2.4fr 1.8fr 1.3fr .7fr 24px;align-items:center;gap:12px;padding:0 20px 16px;border-bottom:1px solid var(--ln);margin-bottom:14px;font:500 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6;text-transform:uppercase}' + R + ' .gtd-erow{flex:1;padding:0;margin:0;border:0;font:inherit;letter-spacing:0;text-transform:none;color:#e2e8f0}' + R + ' .gtd-erow b{font-size:16px;color:#fff}' + R + ' .gtd-erow small{display:block;margin-top:5px;font:500 12px/1.3 ' + MONO + ';color:#8b9ab0}' + R + ' .gtd-erow .n{text-align:right;font:700 20px/1 ' + MONO + ';color:var(--cy)}' + R + ' .gtd-erow .tl{color:#fcd34d}' + R + ' .entrega-toggle.gtd-ok > .entrega-toggle-main,' + R + ' .entrega-toggle.gtd-ok > .entrega-toggle-meta{display:none!important}' + R + ' .entrega-toggle.gtd-ok{display:flex!important}' + R + ' .gtd-thead span:nth-child(5){text-align:right}' + R + ' .gtd-thead:after{content:""}',
        R + ' .entrega-toggle{display:flex!important;align-items:center;gap:14px;width:100%;background:none!important;border:0!important;color:#e2e8f0!important;text-align:left;cursor:pointer;padding:0!important}',
        R + ' .badge-ok,' + R + ' .badge-pend{border-radius:0!important;font:600 11.5px/1 ' + MONO + '!important;letter-spacing:.18em;text-transform:uppercase;padding:6px 10px!important;background:transparent!important}',
        R + ' .badge-ok{border:1px solid rgba(45,212,191,.6)!important;color:#5eead4!important}' + R + ' .badge-pend{border:1px solid rgba(244,114,182,.6)!important;color:#f9a8d4!important}',
        R + ' .entrega-toggle-meta{margin-left:auto;font:500 12.5px/1.3 ' + MONO + ';color:#9fb0c6}',
        '@media (max-width:1300px){' + R + ' .dp-dash-grid > .dp-card,' + R + ' .dp-dash-grid > .dp-card.dp-span-2,' + R + ' .dp-dash-grid > .dp-card.gtd-cursos,' + R + ' .dp-dash-grid > .dp-card.gtd-act,' + R + ' .dp-dash-grid > .dp-card.gtd-pend{grid-column:span 6}}',
        '@media (max-width:1000px){' + R + ' .dp-kpis{grid-template-columns:repeat(2,minmax(0,1fr))!important}' + R + ' .dp-work-grid{grid-template-columns:1fr!important}' + R + ' .dp-dash-grid > .dp-card{grid-column:1/-1!important}' + R + ' .dp-search{display:none!important}' + R + ' .gtd-thead{display:none}}',
        '@media (max-width:640px){' + R + ' .dp-main{padding:24px 16px!important}' + R + ' .dp-kpis{grid-template-columns:1fr!important}' + R + ' .gtd-brand span{display:none}' + R + ' .av-doc-row{grid-template-columns:1fr!important}}',
        R + ' .gtd-foot{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:36px;padding:24px 0 4px;border-top:1px solid var(--ln);font:500 12px/1.4 ' + MONO + ';letter-spacing:.22em;color:#64748b}'
    ].join('\n');
    doc.head.appendChild(css);

    function ico(c, svg) { return '<span class="gtd-ico" style="--c:' + c + '">' + svg + '</span>'; }
    function vacio(o) {
        return '<div class="gtd-empty" style="--c:' + o.c + '"><div class="gtd-ring"><i>' + o.i + '</i></div><b>' + esc(o.t) + '</b><p>' + esc(o.d) + '</p>' + (o.b ? '<button type="button" class="' + (o.p ? 'p' : '') + '" data-dp-view="' + o.v + '">' + (o.p ? IC.back.replace('M19 12H5M11 6l-6 6 6 6', 'M5 12h14M13 6l6 6-6 6') : '') + esc(o.b) + '</button>' : '') + '</div>';
    }
    var VACIOS = {
        dpEventsList: { c: '#a78bfa', i: IC.cal, t: 'Sin fechas límite', d: 'Cuando publiques una tarea con fecha límite aparecerá aquí.', b: 'Programar tarea', v: 'tareas' },
        dpActivityList: { c: '#2dd4bf', i: IC.hist, t: 'Aún no hay actividad', d: 'Las entregas y publicaciones aparecerán aquí.' },
        dpPendingTasks: { c: '#f472b6', i: IC.check, t: 'Todo al día', d: 'No hay entregas pendientes de calificar.' },
        listaTareasDocente: { c: '#a78bfa', i: IC.check, t: 'Aún no has publicado tareas', d: 'Completa el formulario de la izquierda para publicar tu primera actividad.' },
        listaEntregasDocente: { c: '#22d3ee', i: IC.inbox, t: 'No hay entregas todavía', d: 'Cuando tus estudiantes envíen sus trabajos aparecerán aquí para revisarlos y calificarlos.', b: 'Ir a tareas', v: 'tareas', p: 1 },
        listaPresDocente: { c: '#f59e0b', i: IC.file, t: 'No hay presentaciones cargadas', d: 'El material que subas aparecerá aquí y en Mi aula de tus estudiantes.' }
    };
    function revisarVacios() {
        Object.keys(VACIOS).forEach(function (id) {
            var box = $(id); if (!box) return;
            var p = box.querySelector(':scope > p.dp-empty, :scope > p.aula-vacio');
            if (!p || box.querySelector('.gtd-empty')) return;
            var o = VACIOS[id], extra = /filtro/.test(p.textContent) ? Object.assign({}, o, { t: 'Sin resultados con ese filtro', d: 'Cambia la materia o el grupo para ver otras actividades.', b: null }) : o;
            p.classList.add('gtd-hide'); p.insertAdjacentHTML('afterend', vacio(extra));
        });
    }

    var HEADS = {
        dashboard: ['// PANEL DOCENTE'], tareas: ['// GESTIÓN DE ACTIVIDADES'], entregas: ['// REVISIÓN'], estudiantes: ['// MIS GRUPOS'],
        cursos: ['// ASIGNATURAS', 'Mis <em>cursos</em>'], material: ['// PRESENTACIONES', 'Material <em>de clase</em>'], analisis: ['// INDICADORES'], foros: ['// COMUNICACIÓN']
    };
    var CARDS = [
        [/actividad semanal/, 'ACTIVIDAD // 7 DÍAS', '#22d3ee', IC.chart],
        [/proximos eventos/, 'CALENDARIO', '#a78bfa', IC.cal],
        [/mis cursos/, 'MIS CURSOS', '#22d3ee', IC.book, 'Cursos activos', 'gtd-cursos'],
        [/actividad reciente/, 'REGISTRO', '#2dd4bf', IC.hist, null, 'gtd-act'],
        [/tareas por corregir/, 'CALIFICAR', '#f472b6', IC.star, null, 'gtd-pend'],
        [/publicar tarea|editar tarea/, 'NUEVA ACTIVIDAD', '#22d3ee', IC.plus],
        [/tareas publicadas/, 'PUBLICADAS', '#a78bfa', IC.list],
        [/subir material/, 'NUEVO ARCHIVO', '#22d3ee', IC.upload],
        [/material publicado/, 'PUBLICADO', '#f59e0b', IC.file],
        [/rendimiento/, 'RENDIMIENTO // 7 DÍAS', '#22d3ee', IC.chart, 'Entregas vs. tareas'],
        [/indicadores/, 'RESUMEN', '#a78bfa', IC.star]
    ];
    function cabeceraCard(card) {
        if (card.__gtd) return; var h3 = card.querySelector(':scope > h3'); if (!h3) return;
        card.__gtd = true;
        var t = norm(h3.childNodes[0] ? h3.childNodes[0].textContent : h3.textContent);
        var m = CARDS.filter(function (x) { return x[0].test(t); })[0] || [null, 'GEOMETRICS', '#22d3ee', IC.layers];
        card.style.setProperty('--c', m[2]); if (m[5]) card.classList.add(m[5]);
        var ch = el('div', 'gtd-ch', ico(m[2], m[3]) + '<div><small>' + m[1] + '</small></div><div class="gtd-r"></div>');
        card.insertBefore(ch, h3);
        var r = ch.querySelector('.gtd-r');
        [].slice.call(h3.children).forEach(function (c) { r.appendChild(c); });
        if (m[4] && h3.childNodes[0]) h3.childNodes[0].textContent = m[4];
        ch.children[1].appendChild(h3);
        return ch;
    }
    var CODE = function (n) { n = norm(n); return /suelos ii/.test(n) ? 'MS-II' : /suelos/.test(n) ? 'MS-I' : /resistencia/.test(n) ? 'RM' : /mezcla/.test(n) ? 'DM' : /estructura/.test(n) ? 'EST-I' : ''; };
    function decorarCursos() {
        doc.querySelectorAll('#pantallaDocente .dp-course').forEach(function (c) {
            if (c.querySelector('.gtd-cico')) return;
            var s = c.querySelector('strong'), n = s ? s.textContent : '';
            c.insertAdjacentHTML('afterbegin', '<span class="gtd-cico">' + (/suelos ii/i.test(n) ? IC.home : /suelos/i.test(n) ? IC.layers : /resistencia/i.test(n) ? IC.beam : /mezcla/i.test(n) ? IC.flask : IC.book) + '</span>');
            var code = CODE(n); if (s && code) s.insertAdjacentHTML('afterend', '<span class="gtd-code">' + code + '</span>');
        });
    }
    function primerNombre() { try { var u = window.aulaGetSession && window.aulaGetSession(); return String((u && (u.nombres || u.nombre)) || '').trim().split(/\s+/)[0] || 'docente'; } catch (e) { return 'docente'; } }

    function chartVacio() {
        var e = $('dpChartEmpty'), w = doc.querySelector('#pantallaDocente .dp-chart-wrap'); if (!e || !w) return;
        var b = w.querySelector('.gtd-chart-empty'); if (!b) { b = el('div', 'gtd-chart-empty', IC.chart + 'Sin actividad esta semana'); w.appendChild(b); }
        b.style.display = e.hidden ? 'none' : '';
    }
    function dropzone(input, txt) {
        if (!input || input.closest('.gtd-drop')) return;
        var d = el('div', 'gtd-drop', IC.upload + '<div><b>' + txt + '</b><small>PDF · DOCX · XLSX · DWG — máx. 20 MB</small></div>');
        input.parentNode.insertBefore(d, input); d.appendChild(input);
        var b = d.querySelector('b'), orig = txt;
        function upd() { var f = input.files && input.files[0]; b.textContent = f ? f.name : orig; d.classList.toggle('on', !!f); }
        input.addEventListener('change', upd);
        d.addEventListener('dragover', function () { d.classList.add('on'); }); d.addEventListener('dragleave', upd); d.addEventListener('drop', function () { setTimeout(upd, 0); });
        new MutationObserver(upd).observe(input, { attributes: true });
    }
    function chipsTareas() {
        var card = $('listaTareasDocente') && $('listaTareasDocente').closest('.dp-card'); if (!card || card.querySelector('.gtd-chips')) return;
        var ch = el('div', 'gtd-chips', '<button type="button" class="on" data-t="todas">Todas</button><button type="button" data-t="activas">Activas</button><button type="button" data-t="vencidas">Vencidas</button>');
        card.insertBefore(ch, $('listaTareasDocente'));
        var modo = 'todas';
        function vencida(it) { var m = (it.textContent || '').match(/Límite:\s*(\d{4}-\d{2}-\d{2})(?:\s+(\d{2}:\d{2}))?/); if (!m) return false; return new Date(m[1] + 'T' + (m[2] || '23:59')) < new Date(); }
        function aplicar() { doc.querySelectorAll('#listaTareasDocente .aula-item').forEach(function (it) { var v = vencida(it); it.classList.toggle('gtd-hide', (modo === 'activas' && v) || (modo === 'vencidas' && !v)); }); contar(); }
        ch.addEventListener('click', function (e) { var b = e.target.closest('button[data-t]'); if (!b) return; modo = b.getAttribute('data-t'); ch.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); aplicar(); });
        var f = $('btnFiltrarTareas'), m = $('filtroMateriaTareas'), g = $('filtroGrupoTareas'), tm = 0;
        if (m) m.addEventListener('change', function () { if (f) f.click(); });
        if (g) g.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { if (f) f.click(); }, 300); });
        new MutationObserver(aplicar).observe($('listaTareasDocente'), { childList: true });
        aplicar();
    }
    function contar() {
        var n = doc.querySelectorAll('#listaTareasDocente .aula-item').length, card = $('listaTareasDocente') && $('listaTareasDocente').closest('.dp-card');
        var r = card && card.querySelector('.gtd-r'); if (!r) return;
        var t = r.querySelector('.gtd-tag'); if (!t) { t = el('span', 'gtd-tag'); r.appendChild(t); }
        var tx = n + (n === 1 ? ' tarea' : ' tareas'); if (t.textContent !== tx) t.textContent = tx;
        var mp = $('listaPresDocente'), cp = mp && mp.closest('.dp-card'), rp = cp && cp.querySelector('.gtd-r');
        if (rp) { var tp = rp.querySelector('.gtd-tag'); if (!tp) { tp = el('span', 'gtd-tag'); rp.appendChild(tp); } var k = mp.querySelectorAll('.aula-item').length; var tx2 = k + (k === 1 ? ' archivo' : ' archivos'); if (tp.textContent !== tx2) tp.textContent = tx2; }
    }
    /* ---- Entregas: KPIs, buscador, filtros y cabecera de tabla ---- */
    function datosEntregas() {
        try {
            var u = window.aulaGetSession(), K = window.AULA_KEYS; if (!u || !K) return null;
            var ts = window.aulaLoad(K.tareas, []).filter(function (t) { return t.docenteId === u.id; }), ids = {};
            ts.forEach(function (t) { ids[t.id] = t; });
            var es = window.aulaLoad(K.entregas, []).filter(function (e) { return ids[e.tareaId]; });
            var cal = es.filter(function (e) { return e.nota != null && e.nota !== ''; });
            var tarde = es.filter(function (e) { var t = ids[e.tareaId]; if (!t || !t.fechaLimite) return false; return new Date(e.fecha) > new Date(t.fechaLimite + 'T' + (t.horaLimite || '23:59')); }).length;
            var prom = cal.length ? (cal.reduce(function (a, e) { return a + (parseFloat(e.nota) || 0); }, 0) / cal.length).toFixed(1) : '—';
            return { pend: es.length - cal.length, cal: cal.length, tarde: tarde, prom: prom };
        } catch (e) { return null; }
    }
    function entregas() {
        var box = $('listaEntregasDocente'), card = box && box.closest('.dp-card'); if (!card || card.__gtd) return;
        card.__gtd = true; card.style.setProperty('--c', '#22d3ee');
        var panel = card.closest('.dp-panel');
        var kp = el('div', 'dp-kpis gtd-kpis'); panel.insertBefore(kp, card);
        var tool = el('div', 'gtd-chips', '<label class="gtd-s">' + IC.search + '<input type="search" placeholder="buscar por estudiante o tarea…" aria-label="Buscar entregas"></label><button type="button" class="on" data-e="todas">Todas</button><button type="button" data-e="pend" style="--c:#f472b6"><i></i>Por calificar</button><button type="button" data-e="cal" style="--c:#2dd4bf"><i></i>Calificadas</button><select aria-label="Filtrar por materia"><option value="">Materia</option><option>Mecánica de Suelos I</option><option>Mecánica de Suelos II</option><option>Resistencia de Materiales</option><option>Diseño de Mezclas</option><option>Estructuras I</option></select>');
        panel.insertBefore(tool, card);
        tool.querySelector('label').style.margin = '0';
        card.insertBefore(el('div', 'gtd-ch', ico('#22d3ee', IC.inbox) + '<div><small>BANDEJA</small><h3>Trabajos recibidos</h3></div><div class="gtd-r"></div>'), box);
        card.insertBefore(el('div', 'gtd-thead', '<span>Estudiante</span><span>Tarea</span><span>Enviada</span><span>Estado</span><span>Nota</span>'), box);
        var modo = 'todas', inp = tool.querySelector('input'), sel = tool.querySelector('select');
        function aplicar() {
            var q = norm(inp.value.trim()), mat = norm(sel.value);
            box.querySelectorAll('.entrega-item').forEach(function (it) {
                var t = norm(it.textContent), c = it.classList.contains('item-calificada');
                it.classList.toggle('gtd-hide', !((modo === 'todas' || (modo === 'cal') === c) && (!q || t.indexOf(q) >= 0) && (!mat || t.indexOf(mat) >= 0)));
            });
            var d = datosEntregas() || { pend: 0, cal: 0, tarde: 0, prom: '—' };
            var h = kpi('#f472b6', IC.star, d.pend, 'Por calificar') + kpi('#2dd4bf', IC.check, d.cal, 'Calificadas') + kpi('#f59e0b', IC.clock, d.tarde, 'Entregadas tarde') + kpi('#a78bfa', IC.chart, d.prom, 'Promedio');
            if (kp.__h !== h) { kp.__h = h; kp.innerHTML = h; }
            filasEntregas(box);
            var vac = !box.querySelector('.entrega-item'); card.querySelector('.gtd-thead').style.display = vac ? 'none' : '';
        }
        tool.addEventListener('click', function (e) { var b = e.target.closest('button[data-e]'); if (!b) return; modo = b.getAttribute('data-e'); tool.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); aplicar(); });
        inp.addEventListener('input', aplicar); sel.addEventListener('change', aplicar);
        new MutationObserver(aplicar).observe(box, { childList: true });
        aplicar();
    }
    function filasEntregas(box) {
        var u, K = window.AULA_KEYS, ts = {}, es = {};
        try { u = window.aulaGetSession(); window.aulaLoad(K.tareas, []).forEach(function (t) { ts[t.id] = t; }); window.aulaLoad(K.entregas, []).forEach(function (e) { es[e.id] = e; }); } catch (x) { return; }
        box.querySelectorAll('.entrega-toggle[data-toggle-ent]').forEach(function (b) {
            if (b.classList.contains('gtd-ok')) return;
            var e = es[b.getAttribute('data-toggle-ent')]; if (!e) return;
            var t = ts[e.tareaId] || {}, cal = e.nota != null && e.nota !== '', meta = (b.querySelector('.entrega-toggle-meta') || {}).textContent || '';
            var d = new Date(e.fecha), f = isNaN(d) ? '—' : d.toLocaleDateString() + ' · ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            var tarde = /retraso|tarde/i.test(meta);
            var row = el('span', 'gtd-erow', '<span><b>' + esc(e.estudianteNombre || e.estudianteEmail || 'Estudiante') + '</b><small>' + esc(e.estudianteEmail || '') + '</small></span>' +
                '<span><b style="font-size:15px">' + esc(t.titulo || 'Tarea') + '</b><small>' + esc((t.materia || '') + (t.grupo ? ' · Grupo ' + t.grupo : '')) + '</small></span>' +
                '<span>' + esc(f) + '<small class="' + (tarde ? 'tl' : '') + '" title="' + esc(meta) + '">' + esc(tarde ? 'Entregada tarde' : (meta ? 'A tiempo' : '')) + '</small></span>' +
                '<span><span class="' + (cal ? 'badge-ok' : 'badge-pend') + '">' + (cal ? 'Calificada' : 'Por calificar') + '</span></span>' +
                '<span class="n">' + (cal ? esc(e.nota) : '—') + '</span>');
            b.insertBefore(row, b.querySelector('.entrega-flecha')); b.classList.add('gtd-ok');
        });
    }
    function kpi(c, svg, n, l) { return '<div class="dp-kpi gtd-kpi" style="--c:' + c + '">' + ico(c, svg) + '<div><b>' + esc(n) + '</b><span>' + esc(l) + '</span></div></div>'; }

    function montar() {
        var M = $('pantallaDocente'); if (!M) return;
        if (!M.classList.contains('gtd')) {
            M.classList.add('gtd');
            var brand = M.querySelector('.dp-brand');
            if (brand) brand.insertAdjacentHTML('beforeend', '<div class="gtd-logos"><img src="docs/logo_unipamplona.png" alt="Universidad de Pamplona"><img src="docs/logo_ingenieria_civil.png" alt="Ingeniería Civil"></div><div class="gtd-brand"><b>GEO<i>METRICS</i></b><span>PANEL DOCENTE</span></div>');
            var sp = M.querySelector('.dp-search > span'); if (sp) sp.innerHTML = IC.search;
            var ds = $('dpSearch'); if (ds) ds.placeholder = 'buscar cursos, tareas o estudiantes…';
            var nb = $('dpBtnNotif'); if (nb) nb.childNodes.forEach(function (n) { if (n.nodeType === 3 && n.textContent.trim()) n.textContent = ''; }), nb.insertAdjacentHTML('afterbegin', IC.bell);
            var chip = $('dpUserChip'); if (chip) chip.insertAdjacentHTML('beforeend', '<span class="gtd-caret">' + IC.down + '</span>');
            var bv = $('btnVolverDocente'); if (bv) bv.innerHTML = IC.back + 'MENÚ';
            var foot = M.querySelector('.dp-side-foot');
            if (foot && !foot.querySelector('.gtd-logout')) {
                var lo = el('button', 'gtd-logout', '<span class="dp-ico gt-lico">' + IC.out + '</span><span class="label">Cerrar sesión</span>'); lo.type = 'button';
                lo.addEventListener('click', function () { var b = $('btnCerrarSesion'); if (b) b.click(); else if (window.aulaLogout) window.aulaLogout(); });
                foot.appendChild(lo);
            }
            M.querySelectorAll('.dp-panel').forEach(function (p) {
                var k = p.getAttribute('data-dp-panel'), hd = p.querySelector(':scope > .dp-head'), o = HEADS[k]; if (!hd || !o) return;
                var h1 = hd.querySelector('h1'); if (!h1) return;
                h1.insertAdjacentHTML('beforebegin', '<div class="gtd-eye">' + o[0] + '</div>');
                if (o[1]) h1.innerHTML = o[1];
                if (k === 'dashboard') h1.innerHTML = 'Hola, <em>' + esc(primerNombre()) + '</em>';
            });
            var np = M.querySelector('.dp-head .dp-btn-primary'); if (np) np.innerHTML = IC.plus + 'NUEVA TAREA';
            var kpis = M.querySelectorAll('[data-dp-panel="dashboard"] .dp-kpi'), KI = [IC.users, IC.star, IC.check, IC.inbox], KC = ['#22d3ee', '#f472b6', '#a78bfa', '#2dd4bf'];
            kpis.forEach(function (k, i) { var w = el('div'); [].slice.call(k.children).forEach(function (c) { w.appendChild(c); }); k.insertAdjacentHTML('afterbegin', ico(KC[i] || '#22d3ee', KI[i] || IC.users)); k.appendChild(w); });
            var bt = $('btnCrearTarea'); if (bt) { bt.innerHTML = IC.send + '<span>PUBLICAR TAREA</span>'; }
            var bc = $('btnCancelarEditTarea'); if (bc) bc.textContent = 'CANCELAR';
            var bs = $('btnSubirPres'); if (bs) bs.innerHTML = IC.upload + '<span>SUBIR MATERIAL</span>';
            dropzone($('tareaArchivo'), 'Arrastra un archivo o haz clic');
            dropzone($('presArchivo'), 'Arrastra tu presentación aquí');
            var tt = $('tareaTitulo'); if (tt) tt.placeholder = 'Ej. Informe de granulometría';
            var td = $('tareaDesc'); if (td) td.placeholder = 'Indicaciones para el estudiante…';
            var main = M.querySelector('.dp-main'); if (main) main.appendChild(el('footer', 'gtd-foot', '<span>© ' + new Date().getFullYear() + ' GEOMETRICS // PANEL DOCENTE</span><span>UNIVERSIDAD DE PAMPLONA · INGENIERÍA CIVIL</span>'));
            chipsTareas(); entregas();
            var pend = false;
            new MutationObserver(function () { if (pend) return; pend = true; setTimeout(function () { pend = false; refrescar(); }, 60); }).observe(M, { childList: true, subtree: true });
            new MutationObserver(function () { if (M.style.display !== 'none') { var h = M.querySelector('[data-dp-panel="dashboard"] h1'); if (h) { var v = 'Hola, <em>' + esc(primerNombre()) + '</em>'; if (h.__h !== v) { h.__h = v; h.innerHTML = v; } } } }).observe(M, { attributes: true, attributeFilter: ['style'] });
        }
        refrescar();
    }
    function refrescar() {
        doc.querySelectorAll('#pantallaDocente .dp-card').forEach(cabeceraCard);
        revisarVacios(); decorarCursos(); chartVacio(); contar();
    }
    /* el formulario de tarea cambia su título a "Editar tarea": se conserva dentro de la cabecera */
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', montar); else montar();
    window.GMDocente = { montar: montar };
})();
