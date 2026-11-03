/* GeoMetrics — diseño "laboratorio" de Civix (chat, conversaciones, recursos, herramientas y Planos y CAD).
 * Solo estilo y reorganización visual: ids, botones y funciones de app.js / civix-*.js no cambian. */
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
        bulb: SV('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.5c.8.8 1.3 1.6 1.5 2.5h5c.2-.9.7-1.7 1.5-2.5A6 6 0 0 0 12 3z"/>'),
        help: SV('<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7M12 17h.01"/>'),
        wrench: SV('<path d="M14.7 6.3a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.7-7.7a4 4 0 0 0-2-2z"/>'),
        check: SV('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="m8 12 3 3 5-6"/>'),
        spark: SV('<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 3v4M17 5h4"/>'),
        globe: SV('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
        clip: SV('<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>'),
        send: SV('<path d="M22 2 11 13"/><path d="M22 2 15 22l-4-9-9-4z"/>'),
        x: SV('<path d="M6 6l12 12M18 6 6 18"/>'),
        bolt: SV('<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>'),
        tools: SV('<path d="M14.7 6.3a4 4 0 0 0 5 5L12 19a2.1 2.1 0 0 1-3-3l7.7-7.7a4 4 0 0 0-2-2z"/>'),
        beam: SV('<path d="M4 7h16M7 7v3M17 7v3M4 10h16M9 14h6M12 10v9"/>'),
        calc: SV('<rect x="5" y="3" width="14" height="18" rx="1"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h8"/>'),
        list: SV('<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/>'),
        swap: SV('<path d="M4 8h14l-3-3M20 16H6l3 3"/>'),
        table: SV('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 10h18M3 15h18M9 4v16"/>'),
        link: SV('<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>'),
        search: SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
        flask: SV('<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/>'),
        map: SV('<path d="m9 4-6 2v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'),
        refresh: SV('<path d="M20 11a8 8 0 0 0-14.9-3.5M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.9 3.5M20 20v-4h-4"/>'),
        layers: SV('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>'),
        home: SV('<path d="M4 20h16"/><path d="M6 20v-6h12v6"/><path d="M10 14V6h4v8"/><path d="M12 3v3"/>'),
        robot: SV('<rect x="5" y="8" width="14" height="11" rx="1"/><path d="M12 4v4M9 13h.01M15 13h.01M9 16h6M3 12v3M21 12v3"/>'),
        cam: SV('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
        book: SV('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
        img: SV('<rect x="3" y="4" width="18" height="16" rx="1"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 8"/>'),
        upload: SV('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>'),
        doc: SV('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>'),
        grid: SV('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
        pen: SV('<path d="M4 20h4L19 9l-4-4L4 16z"/>'),
        user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
        info: SV('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>'),
        eye: SV('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
        chev: SV('<path d="m9 6 6 6-6 6"/>'),
        arrow: SV('<path d="M5 12h14M13 6l6 6-6 6"/>'),
        trash: SV('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
        tri: SV('<path d="M4 20 4 4l16 16z"/><path d="M8 16h4v-4"/>')
    };
    var R = '#asistenteModal.gcx';
    var css = el('style'); css.id = 'gcx-css';
    css.textContent = [
        R + '{--cy:#22d3ee;--vi:#a78bfa;--am:#f59e0b;--pk:#f472b6;--ln:#172235;--ln2:#24324a;--in:#05080f;--mu:#8b9ab0}',
        R + ' .civix-shell{display:grid!important;grid-template-columns:300px minmax(0,1fr) 340px!important;background:#03060b!important;border-radius:0!important;width:100vw!important;height:100vh!important;max-width:none!important;max-height:none!important;margin:0!important;border:0!important}',
        /* lateral izquierdo */
        R + ' .civix-side-left{display:flex!important;flex-direction:column;padding:20px 16px!important;background:linear-gradient(180deg,#050a13,#03060b)!important;border-right:1px solid var(--ln)!important;min-height:0;overflow-y:auto}',
        R + ' .civix-brand{display:flex!important;align-items:center;gap:14px;padding:0 4px 20px!important;margin-bottom:16px!important;border-bottom:1px solid var(--ln)!important}',
        R + ' .civix-brand-logo{width:54px!important;height:54px!important;border-radius:50%!important;box-shadow:0 0 0 1px rgba(34,211,238,.45),0 0 20px rgba(34,211,238,.2)}',
        R + ' .civix-brand-name{font:700 17px/1 ' + MONO + '!important;letter-spacing:.3em!important;color:#fff!important;text-transform:uppercase}' + R + ' .civix-brand-name i{font-style:normal;color:var(--cy)}',
        R + ' .civix-brand-sub{margin-top:7px;font:500 10.5px/1 ' + MONO + '!important;letter-spacing:.22em!important;color:var(--mu)!important;text-transform:uppercase}',
        R + ' .civix-side-nav{display:flex!important;flex-direction:column;gap:4px!important}',
        R + ' .civix-nav-item{position:relative;display:flex!important;align-items:center;gap:14px!important;width:100%;padding:15px 16px!important;border:0!important;border-radius:0!important;background:transparent!important;color:#cbd5e1!important;font:500 15.5px/1.2 ' + SANS + '!important;text-align:left;box-shadow:none!important;cursor:pointer}',
        R + ' .civix-nav-item:hover{background:rgba(34,211,238,.05)!important;color:#fff!important}',
        R + ' .civix-nav-item.active{background:linear-gradient(90deg,rgba(34,211,238,.14),rgba(34,211,238,.02))!important;color:#fff!important}',
        R + ' .civix-nav-item.active:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--cy)}',
        R + ' .civix-nav-ico{width:20px!important;height:20px!important;display:flex!important;align-items:center;justify-content:center;color:#9fb0c6;font-size:0!important}' + R + ' .civix-nav-item.active .civix-nav-ico{color:var(--cy)}' + R + ' .civix-nav-ico svg{width:19px;height:19px}',
        R + ' .gcx-cnt{margin-left:auto;font:600 11px/1 ' + MONO + ';padding:4px 7px;border:1px solid rgba(34,211,238,.55);color:var(--cy)}',
        R + ' .civix-side-card{margin-top:auto!important;padding:22px 20px!important;border-radius:0!important;background:linear-gradient(160deg,rgba(14,40,58,.55),rgba(6,12,22,.9))!important;border:1px solid rgba(34,211,238,.25)!important;box-shadow:none!important}',
        R + ' .civix-side-wire{width:44px;height:44px;display:flex;align-items:center;justify-content:center;font-size:0!important;color:var(--cy);box-shadow:inset 0 0 0 1px rgba(34,211,238,.6);margin-bottom:16px}' + R + ' .civix-side-wire svg{width:20px;height:20px}',
        R + ' .civix-side-card strong{display:block;font:700 18px/1.25 ' + SANS + '!important;color:#fff!important}' + R + ' .civix-side-card p{margin:8px 0 0!important;font-size:13.5px!important;line-height:1.5;color:#9fb0c6!important}',
        /* historial en el lateral */
        R + ' .civix-side-nav .civix-historial-panel{position:static!important;inset:auto!important;width:auto!important;max-height:340px;overflow-y:auto;margin:4px 0 8px 12px!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;transform:none!important}',
        R + ' .civix-side-nav .civix-historial-head{display:none!important}',
        R + ' .civix-hist-item{position:relative;display:block!important;width:100%;text-align:left;margin:0 0 8px!important;padding:14px 40px 12px 16px!important;border-radius:0!important;background:#060b14!important;border:1px solid var(--ln)!important;color:#fff!important;cursor:pointer;box-shadow:none!important}',
        R + ' .civix-hist-item:hover{border-color:rgba(34,211,238,.45)!important}',
        R + ' .civix-hist-item strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font:600 14px/1.35 ' + SANS + '!important;color:#fff!important}',
        R + ' .civix-hist-item > span{display:block;margin-top:8px;font:500 11.5px/1 ' + MONO + '!important;letter-spacing:.12em;color:var(--mu)!important;text-transform:uppercase}',
        R + ' .civix-hist-del{position:absolute!important;top:10px;right:8px;width:26px;height:26px;padding:0!important;display:flex!important;align-items:center;justify-content:center;background:transparent!important;border:0!important;color:#64748b!important;font-size:0!important;cursor:pointer}',
        R + ' .civix-hist-del svg{width:15px;height:15px;pointer-events:none}' + R + ' .civix-hist-del:hover{color:#fca5a5!important}',
        /* columna central */
        R + ' .civix-main-col{display:flex!important;flex-direction:column;min-width:0;min-height:0;background:radial-gradient(900px 500px at 70% 0%,rgba(34,211,238,.05),transparent 60%),#03060b!important;border:0!important}',
        R + ' .civix-header{display:flex!important;align-items:center;justify-content:space-between;padding:16px 32px!important;border-bottom:1px solid var(--ln)!important;background:transparent!important;min-height:0!important}',
        R + ' .civix-header .asistente-info{display:flex!important;align-items:center;gap:18px}',
        R + ' .civix-avatar-orb{width:64px!important;height:64px!important;border-radius:50%!important;box-shadow:0 0 0 2px var(--cy),0 0 24px rgba(34,211,238,.35)!important;overflow:hidden;background:#0b1a26}',
        R + ' .civix-avatar-img{width:100%!important;height:100%!important;object-fit:cover;border-radius:50%}',
        R + ' .civix-header h3{display:flex!important;align-items:center;gap:12px;margin:0!important;font:800 24px/1 ' + SANS + '!important;color:#fff!important}',
        R + ' .civix-online{font:600 11px/1 ' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase;padding:6px 10px!important;border:1px solid rgba(45,212,191,.6)!important;color:#5eead4!important;background:transparent!important;border-radius:0!important}',
        R + ' .civix-header p{margin:8px 0 0!important;font-size:15px!important;color:#aebbd0!important}',
        R + ' .btn-cerrar-asistente{width:50px!important;height:50px!important;display:flex!important;align-items:center;justify-content:center;border-radius:0!important;background:transparent!important;border:1px solid var(--ln2)!important;color:#cbd5e1!important;font-size:0!important;padding:0!important;box-shadow:none!important}' + R + ' .btn-cerrar-asistente svg{width:20px;height:20px}',
        R + ' .civix-toolbar{display:flex!important;align-items:center;justify-content:space-between;gap:14px;flex-wrap:wrap;margin:22px 32px 0!important;padding:0 0 20px!important;border-bottom:1px solid var(--ln)!important;background:none!important}',
        R + ' .civix-modos{display:flex!important;gap:10px!important;flex-wrap:wrap}',
        R + ' .civix-modo{display:inline-flex!important;align-items:center;gap:10px;padding:15px 18px!important;border-radius:0!important;background:rgba(6,11,20,.9)!important;border:1px solid var(--ln2)!important;color:#cbd5e1!important;font:600 13.5px/1 ' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase;box-shadow:none!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)}',
        R + ' .civix-modo svg{width:18px;height:18px}',
        R + ' .civix-modo.active{background:rgba(34,211,238,.1)!important;border-color:var(--cy)!important;color:var(--cy)!important;box-shadow:inset 0 -3px 0 var(--cy)!important}',
        R + ' .civix-toolbar-right{display:flex!important;align-items:center;gap:12px}',
        R + ' .civix-model-wrap{display:flex!important;align-items:center;gap:10px;height:54px;padding:0 16px!important;border-radius:0!important;background:rgba(6,11,20,.9)!important;border:1px solid var(--ln2)!important}',
        R + ' .civix-model-ico{font-size:0!important;color:var(--pk);display:flex}' + R + ' .civix-model-ico svg{width:18px;height:18px}',
        R + ' .civix-model-select{background:transparent!important;border:0!important;color:#e2e8f0!important;font:600 14px/1 ' + MONO + '!important;letter-spacing:.1em;text-transform:uppercase;outline:0;padding:0 6px!important;box-shadow:none!important}',
        R + ' .civix-model-select option{background:#0b1322;color:#e2e8f0}',
        R + ' .civix-web-toggle{display:flex!important;align-items:center;gap:12px;height:54px;padding:0 16px!important;border-radius:0!important;background:rgba(6,11,20,.9)!important;border:1px solid var(--ln2)!important;color:var(--cy)!important;font:600 14px/1 ' + MONO + '!important;letter-spacing:.18em;text-transform:uppercase;box-shadow:none!important}',
        R + ' .civix-web-toggle > svg{width:18px;height:18px}',
        R + ' .civix-web-dot{order:3;position:relative;width:42px!important;height:22px!important;border-radius:20px!important;background:#1c2638!important;box-shadow:none!important;transition:background .2s}',
        R + ' .civix-web-dot:after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:#94a3b8;transition:left .2s,background .2s}',
        R + ' .civix-web-toggle.on .civix-web-dot,' + R + ' .civix-web-toggle.active .civix-web-dot,' + R + ' .civix-web-toggle[aria-pressed="true"] .civix-web-dot{background:var(--cy)!important}',
        R + ' .civix-web-toggle.on .civix-web-dot:after,' + R + ' .civix-web-toggle.active .civix-web-dot:after,' + R + ' .civix-web-toggle[aria-pressed="true"] .civix-web-dot:after{left:23px;background:#03202a}',
        R + ' .civix-mode-pill{display:none!important}',
        R + ' .civix-main-col:has(.civix-view-panel:not([hidden])) .civix-toolbar{display:none!important}',
        R + ' .cx-btn svg,' + R + ' .cxp-modes svg,' + R + ' .cxa-btn svg{width:18px!important;height:18px!important;flex:0 0 auto}',
        R + ' .civix-quick:after,' + R + ' .civix-quick:before{display:none!important;content:none!important}',
        R + ' .civix-tool-card > .gcx-emo{display:none!important}',
        R + ' .gcx-tok{order:99}',
        R + ' .cxp-out:not(:empty):before{content:"VISTA PREVIA  //  PLANO GENERADO";display:block;margin:0 0 18px;padding-bottom:16px;border-bottom:1px solid var(--ln);font:500 12px/1 ' + MONO + ';letter-spacing:.24em;color:var(--cy)}',
        /* chat */
        R + ' .civix-chat{flex:1 1 auto;min-height:0;overflow-y:auto;padding:26px 32px!important;background:none!important}',
        R + ' .civix-chat .mensaje{max-width:min(960px,86%)}',
        R + ' .civix-chat .mensaje-bot{position:relative;padding-left:62px!important;background:none!important;border:0!important;box-shadow:none!important}',
        R + ' .civix-chat .mensaje-bot:before{content:"";position:absolute;left:0;top:0;width:46px;height:46px;border-radius:50%;background:var(--gcx-av) center/cover #0b1a26;box-shadow:0 0 0 2px rgba(34,211,238,.6)}',
        R + ' .civix-chat .mensaje-bot > *:not(.gcx-who){background:linear-gradient(160deg,rgba(14,40,58,.55),rgba(6,14,26,.9))!important;border:1px solid rgba(34,211,238,.28)!important;border-radius:0!important;padding:18px 24px!important;margin:0!important;color:#e6edf6!important;font-size:16px!important;line-height:1.6!important}',
        R + ' .gcx-who{display:block;margin:0 0 10px;font:600 12px/1 ' + MONO + ';letter-spacing:.24em;color:var(--cy);text-transform:uppercase}' + R + ' .gcx-who b{color:var(--vi);font-weight:600}',
        R + ' .civix-chat .mensaje-usuario > *{border-radius:0!important}',
        R + ' .gcx-start{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0 0 62px}',
        R + ' .gcx-start button{padding:14px 18px;border:1px solid var(--ln2);background:rgba(6,11,20,.85);color:#cbd5e1;font:500 13px/1 ' + MONO + ';letter-spacing:.16em;text-transform:uppercase;cursor:pointer}' + R + ' .gcx-start button:hover{border-color:var(--cy);color:var(--cy)}',
        R + ' .civix-footer-zone{padding:0 32px!important;background:none!important;border:0!important}',
        R + ' .asistente-input-wrap{max-width:none!important;margin:0!important;padding:0!important;background:none!important;border:0!important}',
        R + ' .civix-input-pro{display:flex!important;align-items:center;gap:14px;padding:16px!important;border-radius:0!important;background:#060b14!important;border:1px solid var(--ln2)!important;box-shadow:none!important}',
        R + ' .civix-input-pro:focus-within{border-color:rgba(34,211,238,.55)!important}',
        R + ' .btn-adjuntar-icon,' + R + ' .btn-mejorar-prompt,' + R + ' .civix-send-btn{flex:0 0 auto;width:56px!important;height:56px!important;display:flex!important;align-items:center;justify-content:center;border-radius:0!important;padding:0!important;font-size:0!important;box-shadow:none!important;cursor:pointer}',
        R + ' .btn-adjuntar-icon{background:transparent!important;border:1px solid var(--ln2)!important;color:#cbd5e1!important}',
        R + ' .btn-mejorar-prompt{background:rgba(124,58,237,.18)!important;border:1px solid rgba(167,139,250,.65)!important;color:#c4b5fd!important}',
        R + ' .civix-send-btn{background:var(--cy)!important;border:0!important;color:#03202a!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}',
        R + ' .btn-adjuntar-icon svg,' + R + ' .btn-mejorar-prompt svg,' + R + ' .civix-send-btn svg{width:21px;height:21px}',
        R + ' #inputAsistente{flex:1;min-height:56px!important;max-height:200px;padding:16px 6px!important;background:transparent!important;border:0!important;color:#e6edf6!important;font:500 16px/1.5 ' + MONO + '!important;resize:none;box-shadow:none!important;outline:0}',
        R + ' .gcx-hint{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:12px 0 0;font:500 12px/1 ' + MONO + ';letter-spacing:.2em;color:var(--mu);text-transform:uppercase}' + R + ' .gcx-hint b{color:var(--cy)}',
        R + ' .civix-footer-bar{padding:16px!important;text-align:center;font:500 12px/1 ' + MONO + '!important;letter-spacing:.24em;text-transform:uppercase;color:#4b5a70!important;background:none!important;border:0!important}',
        /* lateral derecho */
        R + ' .civix-side-right{display:flex!important;flex-direction:column;gap:6px;padding:22px 18px!important;background:linear-gradient(180deg,#050a13,#03060b)!important;border-left:1px solid var(--ln)!important;overflow-y:auto;min-height:0}',
        R + ' .civix-promo-card{position:relative;display:grid!important;grid-template-columns:1fr auto;align-items:center;gap:6px 14px;padding:24px 22px!important;margin-bottom:18px;border-radius:0!important;background:linear-gradient(150deg,rgba(14,52,72,.7),rgba(20,16,48,.6))!important;border:1px solid rgba(34,211,238,.3)!important;box-shadow:none!important;overflow:hidden}',
        R + ' .civix-promo-title{grid-column:1;font:800 34px/1 ' + SANS + '!important;font-style:normal!important;letter-spacing:-.03em;color:var(--cy)!important;-webkit-text-fill-color:var(--cy)!important;background:none!important}',
        R + ' .civix-promo-quote{grid-column:1;margin:0!important;font:italic 400 14px/1.5 ' + SANS + '!important;color:#cbd5e1!important}',
        R + ' .civix-promo-bot-img{grid-column:2;grid-row:1/3;width:86px!important;height:86px!important;border-radius:50%!important;object-fit:cover;box-shadow:0 0 0 3px var(--cy),0 0 26px rgba(34,211,238,.35)!important;position:static!important}',
        R + ' .civix-panel-block{padding:0!important;margin:0 0 14px!important;background:none!important;border:0!important;box-shadow:none!important}',
        R + ' .civix-panel-block h4{display:flex;align-items:center;gap:10px;margin:12px 0 14px!important;font:500 12px/1 ' + MONO + '!important;letter-spacing:.26em!important;text-transform:uppercase;color:#8b9ab0!important}',
        R + ' .civix-panel-block h4 svg{width:16px;height:16px;color:var(--am)}' + R + ' .civix-panel-block:nth-of-type(3) h4 svg{color:var(--vi)}',
        R + ' .civix-quick{display:flex!important;align-items:center;gap:14px;width:100%;margin:0 0 10px!important;padding:16px 16px!important;border-radius:0!important;background:#060b14!important;border:1px solid var(--ln)!important;color:#e6edf6!important;font:500 15px/1.2 ' + SANS + '!important;text-align:left;box-shadow:none!important;cursor:pointer}',
        R + ' .civix-quick:hover{border-color:rgba(34,211,238,.45)!important}',
        R + ' .civix-quick > svg:first-child{width:18px;height:18px;flex:0 0 auto;color:var(--cy)}' + R + ' .civix-panel-block:nth-of-type(3) .civix-quick > svg:first-child{color:var(--vi)}',
        R + ' .civix-quick .gcx-chev{margin-left:auto;width:15px;height:15px;color:#64748b}',
        /* vistas */
        R + ' .civix-view-panel{flex:1 1 auto;min-height:0;overflow-y:auto;padding:26px 32px 30px!important;background:none!important;border:0!important}',
        R + ' .civix-view-head{position:relative;margin:0 0 24px!important;padding:0!important;background:none!important;border:0!important}',
        R + ' .gcx-eye{display:flex;align-items:center;gap:12px;font:500 13px/1 ' + MONO + ';letter-spacing:.26em;color:var(--cy);text-transform:uppercase;margin-bottom:14px}' + R + ' .gcx-eye svg{width:18px;height:18px}',
        R + ' .civix-view-head h3{margin:0!important;font:800 clamp(30px,2.6vw,40px)/1.05 ' + SANS + '!important;letter-spacing:-.035em!important;color:#fff!important}',
        R + ' .civix-view-head p{margin:12px 0 0!important;font-size:16px!important;line-height:1.55;color:#aebbd0!important;max-width:980px}',
        R + ' .civix-view-head p b{color:#fff}',
        R + ' .gcx-card{--c:var(--cy);position:relative;padding:26px 28px!important;border-radius:0!important;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96))!important;border:0!important;box-shadow:inset 0 0 0 1px var(--ln)!important;clip-path:polygon(0 0,calc(100% - 20px) 0,100% 20px,100% 100%,20px 100%,0 calc(100% - 20px))}',
        R + ' .gcx-card:before{content:"";position:absolute;left:0;right:20px;top:0;height:2px;background:linear-gradient(90deg,var(--c),transparent 70%)}',
        R + ' .gcx-ch{display:flex;align-items:center;gap:18px;padding-bottom:20px;margin-bottom:20px;border-bottom:1px solid var(--ln)}',
        R + ' .gcx-ico{flex:0 0 auto;width:54px;height:54px;display:flex;align-items:center;justify-content:center;color:var(--c);background:color-mix(in srgb,var(--c) 9%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 60%,transparent);clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)}' + R + ' .gcx-ico svg{width:24px;height:24px}',
        R + ' .gcx-ch small{display:block;font:500 12px/1 ' + MONO + ';letter-spacing:.24em;color:var(--c);text-transform:uppercase}',
        R + ' .gcx-ch h4,' + R + ' .gcx-ch b{display:block;margin:9px 0 0!important;font:800 24px/1.15 ' + SANS + '!important;color:#fff!important}',
        R + ' .gcx-ch .gcx-r{margin-left:auto}',
        R + ' .gcx-tag{font:600 11.5px/1 ' + MONO + ';letter-spacing:.2em;text-transform:uppercase;padding:7px 10px;border:1px solid color-mix(in srgb,var(--c) 60%,transparent);color:var(--c)}',
        R + ' .gcx-note{display:flex;align-items:center;gap:14px;margin-top:22px;padding:18px 20px;border:1px solid rgba(34,211,238,.25);background:rgba(8,40,56,.18);font-size:15px;line-height:1.5;color:#cbd5e1}' + R + ' .gcx-note svg{width:20px;height:20px;color:var(--cy);flex:0 0 auto}' + R + ' .gcx-note b{color:#fff}',
        /* recursos */
        R + ' .civix-res-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:22px!important}',
        R + ' .civix-res-card{display:flex!important;flex-direction:column}',
        R + ' .civix-res-card > h4,' + R + ' .civix-res-card > p{display:none!important}',
        R + ' .gcx-lh{font:500 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6;text-transform:uppercase;margin-bottom:14px}',
        R + ' .gcx-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:24px;flex:1;align-content:flex-start}' + R + ' .gcx-tags i{font:600 12.5px/1.3 ' + MONO + ';font-style:normal;letter-spacing:.14em;text-transform:uppercase;padding:9px 11px;border:1px solid color-mix(in srgb,var(--c) 60%,transparent);color:var(--c)}',
        R + ' .civix-res-btn{display:flex!important;align-items:center;justify-content:center;gap:12px;width:100%;padding:20px!important;border-radius:0!important;border:0!important;background:var(--c)!important;color:#05121a!important;font:800 15px/1 ' + MONO + '!important;letter-spacing:.24em!important;text-transform:uppercase;cursor:pointer;box-shadow:none!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}',
        R + ' .civix-res-btn svg{width:19px;height:19px}',
        /* herramientas */
        R + ' .gcx-legend{display:flex;gap:26px;flex-wrap:wrap;margin:-6px 0 22px;font:500 12.5px/1 ' + MONO + ';letter-spacing:.2em;color:#9fb0c6;text-transform:uppercase}' + R + ' .gcx-legend span:before{content:"";display:inline-block;width:9px;height:9px;margin-right:10px;transform:rotate(45deg);background:var(--c)}',
        R + ' .civix-tools-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:18px!important}',
        R + ' .civix-tool-card{--c:var(--cy);position:relative;display:flex!important;flex-direction:column;align-items:flex-start!important;text-align:left!important;min-height:220px;padding:24px 24px 20px!important;border-radius:0!important;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96))!important;border:0!important;box-shadow:inset 0 0 0 1px var(--ln)!important;color:#fff!important;text-decoration:none!important;cursor:pointer;clip-path:polygon(0 0,calc(100% - 18px) 0,100% 18px,100% 100%,0 100%)}',
        R + ' .civix-tool-card:before{content:"";position:absolute;left:0;right:18px;top:0;height:2px;background:linear-gradient(90deg,var(--c),transparent 70%)}',
        R + ' .civix-tool-card:hover{box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 55%,transparent)!important}',
        
        R + ' .civix-tool-card .gcx-ico{margin-bottom:24px}',
        R + ' .civix-tool-card .gcx-tag{position:absolute;top:24px;right:24px}',
        R + ' .civix-tool-card strong{display:block;font:700 19px/1.25 ' + SANS + '!important;color:#fff!important}',
        R + ' .civix-tool-card em{display:block;margin-top:9px;font:500 13.5px/1.5 ' + MONO + '!important;font-style:normal!important;color:#9fb0c6!important}',
        R + ' .gcx-open{display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:auto;padding-top:22px;font:600 13px/1 ' + MONO + ';letter-spacing:.24em;color:var(--c)}' + R + ' .gcx-open svg{width:17px;height:17px}',
        /* Planos y CAD */
        R + ' .cxp-tabs{display:flex!important;align-items:center;gap:10px!important;flex-wrap:wrap;margin:0 0 22px!important;padding:0!important;border:0!important;background:none!important}',
        R + ' .cxp-tab{display:inline-flex!important;align-items:center;gap:11px;padding:16px 20px!important;border-radius:0!important;background:rgba(6,11,20,.9)!important;border:1px solid var(--ln2)!important;color:#cbd5e1!important;font:600 13.5px/1 ' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase;box-shadow:none!important;cursor:pointer;clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)}',
        R + ' .cxp-tab svg{width:18px;height:18px}' + R + ' .cxp-tab.on{background:rgba(34,211,238,.1)!important;border-color:var(--cy)!important;color:var(--cy)!important;box-shadow:inset 0 -3px 0 var(--cy)!important}',
        R + ' .gcx-tok{margin-left:auto;font:600 11.5px/1 ' + MONO + ';letter-spacing:.2em;text-transform:uppercase;padding:9px 12px;border:1px solid rgba(45,212,191,.6);color:#5eead4}' + R + ' .gcx-tok:before{content:"";display:inline-block;width:6px;height:6px;border-radius:50%;background:currentColor;margin-right:9px;vertical-align:1px}',
        R + ' .gcx-instr{position:absolute;right:0;bottom:4px}',
        R + ' .cxa-btn{display:inline-flex!important;align-items:center;gap:12px;padding:16px 20px!important;border-radius:0!important;background:transparent!important;border:1px solid var(--ln2)!important;color:#e2e8f0!important;font:600 13.5px/1 ' + MONO + '!important;letter-spacing:.22em!important;text-transform:uppercase;box-shadow:none!important;cursor:pointer}' + R + ' .cxa-btn svg{width:18px;height:18px}',
        R + ' .cxp-sec > .cxa-btn{display:none!important}',
        R + ' .cxp-sec{margin:0!important}',
        R + ' .cxp-sec > .cxp-form,' + R + ' .cxp-sec > .cxf-drop{display:block}',
        R + ' .cxp-modes{display:flex!important;gap:10px;margin:0 0 22px!important;flex-wrap:wrap}',
        R + ' .cxp-modes label{position:relative;display:inline-flex!important;align-items:center;gap:12px;padding:16px 20px!important;border:1px solid var(--ln2)!important;background:rgba(6,11,20,.9)!important;color:#cbd5e1!important;font:600 13.5px/1 ' + MONO + '!important;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;border-radius:0!important}',
        R + ' .cxp-modes label input{position:absolute;opacity:0;pointer-events:none}',
        R + ' .cxp-modes label:has(input:checked){border-color:var(--cy)!important;background:rgba(34,211,238,.1)!important;color:var(--cy)!important;box-shadow:inset 0 -3px 0 var(--cy)}',
        R + ' .cxp-presets{display:flex!important;align-items:center;gap:10px;flex-wrap:wrap;margin:0 0 22px!important}',
        R + ' .cxp-presets > span{flex-basis:100%;font:500 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6;text-transform:uppercase}',
        R + ' .cxp-chip{padding:14px 18px!important;border-radius:0!important;background:rgba(6,11,20,.9)!important;border:1px solid var(--ln2)!important;color:#cbd5e1!important;font:600 13px/1 ' + MONO + '!important;letter-spacing:.18em;text-transform:uppercase;box-shadow:none!important;cursor:pointer}',
        R + ' .cxp-chip:hover,' + R + ' .cxp-chip.on,' + R + ' .cxp-chip.active{background:var(--cy)!important;border-color:var(--cy)!important;color:#03202a!important}',
        R + ' .cxp-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:20px 18px!important;margin-bottom:20px}',
        R + ' .cxp-f{display:flex!important;flex-direction:column;gap:12px;margin:0!important}',
        R + ' .cxp-f > span{font:500 12.5px/1.3 ' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase;color:#9fb0c6!important}',
        R + ' .cxp-f input,' + R + ' .cxp-f select,' + R + ' .cxp-f textarea{width:100%!important;box-sizing:border-box;padding:17px 18px!important;border-radius:0!important;background:#05080f!important;border:1px solid var(--ln2)!important;color:#e6edf6!important;font:500 15.5px/1.3 ' + MONO + '!important;box-shadow:none!important}',
        R + ' .cxp-f input:focus,' + R + ' .cxp-f select:focus,' + R + ' .cxp-f textarea:focus{border-color:var(--cy)!important;outline:0;box-shadow:0 0 0 3px rgba(34,211,238,.12)!important}',
        R + ' .cxp-wide{grid-column:1/-1}',
        R + ' .cxp-form > .cxp-grid:last-of-type{grid-template-columns:1fr 1fr!important}',
        R + ' .cx-btn{display:inline-flex!important;align-items:center;justify-content:center;gap:12px;padding:20px 26px!important;border-radius:0!important;background:transparent!important;border:1px solid var(--ln2)!important;color:#e2e8f0!important;font:700 14px/1 ' + MONO + '!important;letter-spacing:.22em!important;text-transform:uppercase;box-shadow:none!important;cursor:pointer}',
        R + ' .cx-btn.cxp-go{background:var(--cy)!important;border-color:var(--cy)!important;color:#03202a!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}',
        R + ' .cxp-note{display:block!important;margin:0 0 20px!important;padding:18px 20px!important;border:1px solid rgba(34,211,238,.25)!important;background:rgba(8,40,56,.18)!important;border-radius:0!important;font-size:15px!important;line-height:1.55;color:#cbd5e1!important}' + R + ' .cxp-note b{color:#fff}',
        R + ' .cxp-out:not(:empty){margin-top:24px;padding:24px!important;border-radius:0!important;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96))!important;border:1px solid var(--ln)!important}',
        R + ' .cxp-out canvas,' + R + ' .cxp-out svg{max-width:100%}',
        R + ' .cxp-out .cx-view{width:100%!important;max-width:none!important;border-radius:0!important}',
        R + ' .cxp-out .cx-box{display:block!important;width:100%!important}',
        R + ' .cxp-out .cx-stage{height:calc(78vh / var(--gzf,1))!important;min-height:620px!important}',
        R + ' .cxp-out .cx-stage canvas{width:100%!important;height:100%!important;display:block}',
        R + ' .cxp-out .cx-card,' + R + ' .cxp-out .cxs-body{width:100%!important;max-width:none!important}',
        R + ' .cxp-out .cxs-stats{display:grid!important;grid-template-columns:repeat(6,minmax(0,1fr))!important;gap:12px!important}',
        R + ' .cxp-out .cxs-stat{width:auto!important;min-width:0;padding:14px 16px!important;border-radius:0!important}',
        R + ' .cxp-out .cxp-tabs{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important}' + R + ' .cxp-out .cxp-tab{justify-content:center}',
        R + ' .cxp-out .cx-bar{display:flex!important;flex-wrap:wrap;gap:8px}' + R + ' .cxp-out .cx-bar > *{flex:1 1 auto}',
        '@media (max-width:1400px){' + R + ' .cxp-out .cxs-stats{grid-template-columns:repeat(4,minmax(0,1fr))!important}}',
        '@media (max-width:900px){' + R + ' .cxp-out .cxs-stats{grid-template-columns:repeat(2,minmax(0,1fr))!important}' + R + ' .cxp-out .cxp-tabs{grid-template-columns:repeat(2,minmax(0,1fr))!important}}',
        R + ' .cxf-drop{position:relative;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:0;padding:54px 24px!important;border:1px dashed rgba(34,211,238,.4)!important;background:rgba(8,40,56,.14)!important;border-radius:0!important;text-align:center}',
        R + ' .cxf-drop .gcx-ring{position:relative;width:132px;height:132px;display:flex;align-items:center;justify-content:center;border-radius:50%;box-shadow:inset 0 0 0 1px rgba(148,163,184,.18);margin-bottom:28px}',
        R + ' .cxf-drop .gcx-ring:before{content:"";position:absolute;inset:14px;border-radius:50%;border:1px dashed rgba(148,163,184,.25)}',
        R + ' .cxf-drop .gcx-ring:after{content:"";position:absolute;inset:-2px;border-radius:50%;border:3px solid transparent;border-top-color:var(--cy);border-right-color:var(--cy);transform:rotate(10deg);clip-path:polygon(50% 0,100% 0,100% 50%,50% 50%)}',
        R + ' .cxf-drop .gcx-ring i{width:70px;height:70px;display:flex;align-items:center;justify-content:center;color:var(--cy);background:rgba(34,211,238,.12);box-shadow:inset 0 0 0 1px rgba(34,211,238,.55)}' + R + ' .cxf-drop .gcx-ring svg{width:28px;height:28px}',
        R + ' .cxf-drop-t{font:700 22px/1.3 ' + SANS + '!important;color:#fff!important;margin:0 0 10px!important}',
        R + ' .gcx-fmt{font:500 13px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6;margin-bottom:28px}',
        R + ' .gcx-btns{display:flex;gap:14px;flex-wrap:wrap;justify-content:center}',
        R + ' .gcx-tips{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin-top:22px}',
        R + ' .gcx-tips div{display:flex;align-items:center;gap:16px;padding:20px;border:1px solid var(--ln);background:#060b14}' + R + ' .gcx-tips .gcx-ico{width:50px;height:50px}' + R + ' .gcx-tips b{display:block;font-size:16px;color:#fff}' + R + ' .gcx-tips small{display:block;margin-top:5px;font-size:14px;color:#9fb0c6}',
        R + ' .gcx-steps{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:18px;font:500 12.5px/1 ' + MONO + ';letter-spacing:.2em;color:#9fb0c6;text-transform:uppercase}' + R + ' .gcx-steps span{padding:12px 14px;border:1px solid var(--ln2)}' + R + ' .gcx-steps i{font-style:normal;color:#4b5a70}',
        '@media (max-width:1400px){' + R + ' .civix-shell{grid-template-columns:260px minmax(0,1fr) 300px!important}' + R + ' .civix-tools-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important}' + R + ' .cxp-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}}',
        '@media (max-width:1100px){' + R + ' .civix-shell{grid-template-columns:240px minmax(0,1fr)!important}' + R + ' .civix-side-right{display:none!important}' + R + ' .civix-res-grid{grid-template-columns:1fr!important}' + R + ' .civix-tools-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important}' + R + ' .gcx-tips{grid-template-columns:1fr}}',
        '@media (max-width:760px){' + R + ' .civix-shell{grid-template-columns:1fr!important}' + R + ' .civix-side-left{display:none!important}' + R + ' .civix-header,' + R + ' .civix-chat,' + R + ' .civix-view-panel,' + R + ' .civix-footer-zone{padding-left:16px!important;padding-right:16px!important}' + R + ' .civix-toolbar{margin:14px 16px 0!important}' + R + ' .civix-tools-grid{grid-template-columns:1fr!important}}'
    ].join('\n');
    doc.head.appendChild(css);

    function ico(c, svg) { return '<span class="gcx-ico" style="--c:' + c + '">' + svg + '</span>'; }
    function setIco(btn, svg) { if (!btn || btn.__gcx) return; btn.__gcx = 1; var s = btn.querySelector('.civix-nav-ico'); if (s) s.innerHTML = svg; }
    function soloTexto(btn, svg) { if (!btn) return; var t = btn.textContent.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ¿]+/, '').trim(); btn.innerHTML = (svg || '') + esc(t); }

    function cabeceraVista(panel, svg) {
        var h = panel && panel.querySelector('.civix-view-head'); if (!h || h.__gcx) return h; h.__gcx = 1;
        var h3 = h.querySelector('h3'); if (h3) h3.textContent = h3.textContent.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ]+/, '').trim();
        h.insertAdjacentHTML('afterbegin', '<div class="gcx-eye">' + svg + '// CIVIX</div>');
        return h;
    }
    var RES = [[/resistencia/, 'RM', '#f59e0b', IC.beam], [/suelos ii/, 'MS-II', '#38bdf8', IC.home], [/suelos/, 'MS-I', '#22d3ee', IC.layers], [/mezcla/, 'DM', '#a78bfa', IC.flask], [/estructura/, 'EST-I', '#f472b6', IC.grid]];
    function recursos() {
        var P = $('civixViewRecursos'); if (!P) return;
        cabeceraVista(P, IC.book);
        P.querySelectorAll('.civix-res-card').forEach(function (c) {
            if (c.__gcx) return; c.__gcx = 1;
            var h4 = c.querySelector('h4'), p = c.querySelector('p'), t = h4 ? h4.textContent : '', n = norm(t);
            var m = RES.filter(function (x) { return x[0].test(n); })[0] || ['', 'GM', '#22d3ee', IC.book];
            var src = String(p ? p.textContent : '').split(/\s*·\s*/).filter(Boolean);
            c.classList.add('gcx-card'); c.style.setProperty('--c', m[2]);
            c.insertAdjacentHTML('afterbegin', '<div class="gcx-ch">' + ico(m[2], m[3]) + '<div><small>' + m[1] + ' // FUENTES</small><b>' + esc(t) + '</b></div></div><div class="gcx-lh">' + src.length + (src.length === 1 ? ' fuente autorizada' : ' fuentes autorizadas') + '</div><div class="gcx-tags">' + src.map(function (s) { return '<i>' + esc(s) + '</i>'; }).join('') + '</div>');
            var b = c.querySelector('.civix-res-btn'); if (b) b.innerHTML = IC.robot + 'ESTUDIAR CON CIVIX';
        });
        if (!P.querySelector('.gcx-note')) P.appendChild(el('div', 'gcx-note', IC.info + '<span>Civix responde citando estas fuentes y evita mezclar referencias entre materias, por ejemplo Beer/Hibbeler con Das.</span>'));
    }
    var TOOLS = [[/calculadora/, IC.calc, 'PROPIA', '#22d3ee'], [/conversor$|^conversor/, IC.swap, 'PROPIA', '#22d3ee'], [/tablas/, IC.table, 'PROMPT', '#22d3ee'], [/revisor/, IC.search, 'PROMPT', '#22d3ee'], [/resumen/, IC.list, 'PROMPT', '#22d3ee'], [/guia/, IC.flask, 'PROMPT', '#22d3ee'], [/curvas/, IC.map, 'PROPIA', '#22d3ee'], [/dwg|dxf/, IC.refresh, 'EXTERNO', '#f59e0b']];
    function herramientas() {
        var P = $('civixViewHerramientas'); if (!P) return;
        var h = cabeceraVista(P, IC.wrench);
        if (h && !P.querySelector('.gcx-legend')) h.insertAdjacentElement('afterend', el('div', 'gcx-legend', '<span style="--c:#2dd4bf">Herramienta propia · sin tokens</span><span style="--c:#22d3ee">Prompt a Civix</span><span style="--c:#f59e0b">Enlace externo</span>'));
        P.querySelectorAll('.civix-tool-card').forEach(function (c) {
            if (c.__gcx) return; c.__gcx = 1;
            var s = c.querySelector('strong'), n = norm(s ? s.textContent : ''), emo = c.querySelector(':scope > span'); if (emo) emo.classList.add('gcx-emo');
            var m = TOOLS.filter(function (x) { return x[0].test(n); })[0] || [null, IC.wrench, 'PROMPT', '#22d3ee'];
            var tc = m[2] === 'PROPIA' ? '#2dd4bf' : m[2] === 'EXTERNO' ? '#f59e0b' : '#22d3ee';
            c.style.setProperty('--c', m[3]);
            c.insertAdjacentHTML('afterbegin', ico(m[3], m[1]) + '<span class="gcx-tag" style="--c:' + tc + '">' + m[2] + '</span>');
            c.insertAdjacentHTML('beforeend', '<span class="gcx-open">ABRIR ' + IC.arrow + '</span>');
        });
    }
    var TABS = [IC.map, IC.beam, IC.robot, IC.cam];
    function cad() {
        var P = $('civixViewCad'); if (!P) return;
        var h = cabeceraVista(P, IC.tri);
        if (h && !h.__gcxP) { h.__gcxP = 1; var p = h.querySelector('p'); if (p) p.innerHTML = 'Genera curvas de nivel y diseños estructurales con su archivo <b>DXF</b> (AutoCAD / Civil 3D / LibreCAD).'; }
        var tabs = P.querySelector('.cxp-tabs');
        if (tabs && !tabs.__gcx) {
            tabs.__gcx = 1;
            tabs.querySelectorAll('.cxp-tab').forEach(function (t, i) { soloTexto(t, TABS[i] || IC.map); });
            tabs.appendChild(el('span', 'gcx-tok', 'No gasta tokens'));
            /* botón de instrucciones arriba a la derecha: replica el de la sección visible */
            var ib = el('button', 'cxa-btn gcx-instr', IC.book + 'INSTRUCCIONES'); ib.type = 'button';
            ib.addEventListener('click', function () { var s = [].slice.call(P.querySelectorAll('.cxp-sec')).filter(function (x) { return !x.hidden; })[0]; var b = s && s.querySelector('.cxa-btn'); if (b) b.click(); });
            if (h) h.appendChild(ib);
        }
        P.querySelectorAll('.cxp-sec').forEach(function (s, i) {
            if (s.__gcx) return; s.__gcx = 1;
            var f = s.querySelector('.cxp-form');
            if (i === 0 && f) {
                var card = el('div', 'gcx-card', '<div class="gcx-ch">' + ico('#22d3ee', IC.map) + '<div><small>PARÁMETROS</small><b>Terreno y cajetín</b></div></div>');
                s.insertBefore(card, f); card.appendChild(f);
                f.querySelectorAll('.cxp-modes label').forEach(function (l, k) {
                    var inp = l.querySelector('input'); var t = l.textContent.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ]+/, '').trim();
                    l.innerHTML = ''; if (inp) l.appendChild(inp); l.insertAdjacentHTML('beforeend', (k ? IC.table : IC.refresh) + esc(t));
                });
                var pr = f.querySelector('.cxp-presets > span'); if (pr) pr.textContent = 'Plantillas';
                f.querySelectorAll('.cxp-f > span').forEach(function (x) { x.textContent = x.textContent.replace(/\s*\((m, 0 = auto|vacío = al azar|para el cajetín)\)/i, function (a) { return /cajet/.test(a) ? ' (cajetín)' : ''; }); });
                var go = f.querySelector('.cxp-go'); if (go) go.innerHTML = IC.arrow + 'GENERAR CURVAS DE NIVEL';
                f.querySelectorAll('.cxp-chip').forEach(function (c) { c.addEventListener('click', function () { f.querySelectorAll('.cxp-chip').forEach(function (x) { x.classList.toggle('on', x === c); }); }); });
            } else if (f) {
                var c2 = el('div', 'gcx-card', '<div class="gcx-ch">' + ico('#22d3ee', i === 1 ? IC.beam : IC.robot) + '<div><small>PARÁMETROS</small><b>' + (i === 1 ? 'Diseño estructural' : 'Planos con IA') + '</b></div></div>');
                s.insertBefore(c2, s.querySelector('.cxp-presets') || f); while (c2.nextSibling && !c2.nextSibling.classList.contains('cxp-out')) c2.appendChild(c2.nextSibling);
            }
            var d = s.querySelector('.cxf-drop');
            if (d) {
                var t = d.querySelector('.cxf-drop-t'); if (t) t.textContent = 'Arrastra aquí la foto del plano';
                d.insertAdjacentHTML('afterbegin', '<div class="gcx-ring"><i>' + IC.img + '</i></div>');
                if (t) t.insertAdjacentHTML('afterend', '<div class="gcx-fmt">JPG · PNG · WEBP</div><div class="gcx-btns"></div>');
                var bx = d.querySelector('.gcx-btns');
                d.querySelectorAll(':scope > .cx-btn').forEach(function (b, k) { soloTexto(b, k ? IC.cam : IC.img); bx.appendChild(b); });
                var card3 = el('div', 'gcx-card', '<div class="gcx-ch">' + ico('#22d3ee', IC.upload) + '<div><small>IMAGEN</small><b>Subir foto del plano</b></div></div>');
                s.insertBefore(card3, d); card3.appendChild(d);
                card3.insertAdjacentHTML('beforeend', '<div class="gcx-tips"><div>' + ico('#22d3ee', IC.cam) + '<span><b>Toma de frente</b><small>Sin inclinación ni perspectiva</small></span></div><div>' + ico('#22d3ee', IC.bulb) + '<span><b>Buena luz</b><small>Evita sombras sobre el papel</small></span></div><div>' + ico('#22d3ee', IC.doc) + '<span><b>Papel claro</b><small>Trazos oscuros y bien definidos</small></span></div></div><div class="gcx-steps"><span>01 Subir foto</span><i>→</i><span>02 Recortar</span><i>→</i><span>03 Ajustar contraste</span><i>→</i><span>04 Vectorizar</span><i>→</i><span>05 Descargar DXF</span></div>');
                var ed = s.querySelector('.cxf-editor'); if (ed) card3.appendChild(ed);
            }
        });
    }
    var QUICK = { 'resuelve': IC.beam, 'explica': IC.bulb, 'formula': IC.calc, 'paso': IC.list, 'revisa': IC.check, 'calculadora': IC.calc, 'conversor': IC.swap, 'tablas': IC.table, 'enlaces': IC.link };
    function lateral() {
        doc.querySelectorAll('#asistenteModal .civix-quick').forEach(function (b) {
            if (b.__gcx) return; b.__gcx = 1;
            var n = norm(b.textContent), k = Object.keys(QUICK).filter(function (x) { return n.indexOf(x) >= 0; })[0];
            var t = b.textContent.replace(/[›>→]\s*$/, '').trim();
            b.innerHTML = (k ? QUICK[k] : IC.chev) + '<span>' + esc(t) + '</span>' + IC.chev.replace('<svg ', '<svg class="gcx-chev" ');
        });
        doc.querySelectorAll('#asistenteModal .civix-panel-block > h4').forEach(function (h, i) {
            if (h.__gcx) return; h.__gcx = 1; h.innerHTML = (i ? IC.tools : IC.bolt) + esc(h.textContent.replace(/^[^A-Za-zÁÉÍÓÚáéíóúÑñ]+/, '').trim());
        });
    }
    var MODOS = [IC.bulb, IC.help, IC.wrench, IC.check];
    function nombreModo() { var a = doc.querySelector('#civixModos .civix-modo.active'); return a ? a.textContent.trim() : 'Explicar'; }
    function chat() {
        var M = $('asistenteModal');
        var img = $('civixAvatarImg'); if (img && img.src) M.style.setProperty('--gcx-av', 'url("' + img.src.replace(/"/g, '%22') + '")');
        var modo = nombreModo();
        doc.querySelectorAll('#chatMensajes .mensaje-bot').forEach(function (m) {
            if (m.querySelector(':scope > .gcx-who')) return;
            m.insertAdjacentHTML('afterbegin', '<span class="gcx-who">Civix · <b>Modo ' + esc(modo) + '</b></span>');
        });
        var box = $('chatMensajes'), st = box && box.querySelector('.gcx-start');
        var soloSaludo = box && box.querySelectorAll('.mensaje').length === 1 && box.querySelector('.mensaje-bot');
        if (box && soloSaludo && !st) {
            st = el('div', 'gcx-start');
            ['¿Qué es el límite líquido?', 'Clasifica un suelo SUCS', 'Calcula una viga'].forEach(function (q) {
                var b = el('button', '', esc(q)); b.type = 'button';
                b.addEventListener('click', function () { var i = $('inputAsistente'); if (i) { i.value = q; i.dispatchEvent(new Event('input', { bubbles: true })); i.focus(); } });
                st.appendChild(b);
            });
            box.appendChild(st);
        } else if (st && !soloSaludo) st.remove();
        var hint = M.querySelector('.gcx-hint');
        if (hint) { var hb = hint.querySelector('b'); if (hb && hb.textContent !== modo.toUpperCase()) hb.textContent = modo.toUpperCase(); }
        var n = $('civixHistorialLista') ? $('civixHistorialLista').querySelectorAll('.civix-hist-item').length : 0, cnt = M.querySelector('#btnCivixHistorial .gcx-cnt');
        if (cnt && cnt.textContent !== String(n)) cnt.textContent = n;
        doc.querySelectorAll('#civixHistorialLista .civix-hist-del').forEach(function (d) { if (!d.querySelector('svg')) d.innerHTML = IC.trash; });
    }
    function montar() {
        var M = $('asistenteModal'); if (!M) return false;
        if (!M.classList.contains('gcx')) {
            M.classList.add('gcx');
            var bn = M.querySelector('.civix-brand-name'); if (bn) bn.innerHTML = 'GEO<i>METRICS</i>';
            var bs = M.querySelector('.civix-brand-sub'); if (bs) bs.textContent = 'Civix · UniPamplona';
            var w = M.querySelector('.civix-side-wire'); if (w) w.innerHTML = IC.spark;
            var cl = $('btnCerrarAsistente'); if (cl) cl.innerHTML = IC.x;
            M.querySelectorAll('#civixModos .civix-modo').forEach(function (b, i) { soloTexto(b, MODOS[i] || IC.bulb); });
            var mi = M.querySelector('.civix-model-ico'); if (mi) mi.innerHTML = IC.spark;
            var wt = $('civixWebToggle'); if (wt && !wt.querySelector('svg')) wt.insertAdjacentHTML('afterbegin', IC.globe);
            var a = $('btnAdjuntarArchivo'); if (a) a.innerHTML = IC.clip;
            var mp = $('btnMejorarPrompt'); if (mp) mp.innerHTML = IC.spark;
            var se = $('btnEnviarMensaje'); if (se) se.innerHTML = IC.send;
            var ia = $('inputAsistente'); if (ia) ia.placeholder = 'escribe tu mensaje…';
            var wrap = M.querySelector('.asistente-input-wrap');
            if (wrap) wrap.insertAdjacentElement('afterend', el('div', 'gcx-hint', '<span>Modo: <b>EXPLICAR</b> · PDF, imágenes, DXF</span><span>Enter envía · Shift+Enter nueva línea</span>'));
            var hb = $('btnCivixHistorial'); if (hb) hb.insertAdjacentHTML('beforeend', '<span class="gcx-cnt">0</span>');
            /* el historial se muestra bajo «Mis conversaciones», en el lateral */
            var hp = $('civixHistorialPanel'); if (hp && hb) hb.insertAdjacentElement('afterend', hp);
            var pend = false;
            new MutationObserver(function () { if (pend) return; pend = true; setTimeout(function () { pend = false; refrescar(); }, 80); }).observe(M, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'src'] });
        }
        refrescar(); return true;
    }
    var NAV = { chat: SV('<path d="M4 5h16v11H9l-5 4z"/>'), historial: SV('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>'), nuevo: SV('<path d="M12 5v14M5 12h14"/>'), recursos: IC.book, herramientas: IC.wrench, cad: IC.tri };
    function refrescar() {
        doc.querySelectorAll('#asistenteModal .civix-nav-item').forEach(function (b) { var k = b.getAttribute('data-civix-nav'); if (NAV[k]) setIco(b, NAV[k]); });
        lateral(); recursos(); herramientas(); cad(); chat();
    }
    function intentar(n) { if (!montar() && n > 0) setTimeout(function () { intentar(n - 1); }, 200); }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { intentar(25); }); else intentar(25);
    /* civix-cad-panel agrega su pestaña después de cargar: volver a revisar */
    setTimeout(refrescar, 1500); setTimeout(refrescar, 3500);
})();
