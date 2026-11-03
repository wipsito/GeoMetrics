/* GeoMetrics — tema visual "laboratorio" para el resto de pantallas:
 * Panel de administración, Recursos, Resultados, Panel docente, Mi aula (estudiante), Civix (chat, recursos,
 * herramientas, planos y CAD), calculadora / conversor y ventana del equipo creador.
 * Solo reestiliza y añade envolturas visuales. No cambia ids, eventos ni la lógica existente. */
(function () {
    'use strict';
    var doc = document;
    function $(id) { return doc.getElementById(id); }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function sinTildes(s) { return String(s || '').toLowerCase().normalize ? String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') : String(s || '').toLowerCase(); }
    var MONO = '"JetBrains Mono","IBM Plex Mono",ui-monospace,SFMono-Regular,Consolas,monospace';
    var SANS = 'Inter,"Segoe UI",system-ui,sans-serif';
    var SV = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
    var IC = {
        bot: SV('<rect x="5" y="8" width="14" height="11" rx="2"/><path d="M12 4v4M9 13h.01M15 13h.01M9.5 16h5"/>'),
        uadd: SV('<circle cx="9" cy="8" r="4"/><path d="M2 21c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/><path d="M19 8v6M16 11h6"/>'),
        users: SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.2 2.4 3.5 5.5"/>'),
        key: SV('<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3"/>'),
        grid: SV('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
        book: SV('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
        flask: SV('<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/>'),
        shield: SV('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
        layers: SV('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>'),
        pencil: SV('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13 7 4 4"/>'),
        clock: SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
        file: SV('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>'),
        search: SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
        back: SV('<path d="M19 12H5M11 6l-6 6 6 6"/>'),
        beam: SV('<path d="M4 6h16M4 18h16M12 6v12"/><path d="M8 10l-2 2 2 2M16 10l2 2-2 2"/>'),
        home: SV('<path d="M4 20h16"/><path d="M6 20v-6h12v6"/><path d="M10 14V6h4v8"/><path d="M12 3v3"/>'),
        warn: SV('<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>'),
        info: SV('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>')
    };

    /* ================================================================== estilos */
    var S = ['#pantallaAdmin', '#pantallaRecursos', '#pantallaResultados'];
    function sc(sel) { return S.map(function (s) { return s + '.gt ' + sel; }).join(','); }
    var css = el('style'); css.id = 'gt-css';
    css.textContent = [
        /* ---- tokens y fondo comunes ---- */
        ':root{--gt-cy:#22d3ee;--gt-am:#f59e0b;--gt-vi:#a78bfa;--gt-pk:#f472b6;--gt-ln:#172235;--gt-ln2:#24324a;--gt-card:#0b1220;--gt-card2:#0e1628;--gt-in:#05080f;--gt-tx:#e6edf6;--gt-mu:#8b9ab0}',
        S.map(function (s) { return s + '.gt'; }).join(',') + '{position:relative;max-width:none!important;width:100%!important;margin:0!important;box-sizing:border-box;padding:0 clamp(16px,3.4vw,60px) 30px!important;color:var(--gt-tx);background:radial-gradient(1100px 600px at 80% 0%,rgba(34,211,238,.07),transparent 60%),radial-gradient(900px 700px at 0% 100%,rgba(124,58,237,.10),transparent 60%),linear-gradient(#04070d,#03060b)!important;min-height:100vh}',
        S.map(function (s) { return s + '.gt:before'; }).join(',') + '{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(rgba(148,163,184,.12) 1px,transparent 1.2px) 0 0/26px 26px;opacity:.5}',
        S.map(function (s) { return s + '.gt > *'; }).join(',') + '{position:relative;z-index:1}',
        sc('> .seccion-encabezado') + '{display:none!important}',
        /* barra superior */
        sc('.gt-nav') + '{display:flex;align-items:center;gap:22px;padding:26px 0 20px;border-bottom:1px solid var(--gt-ln)}',
        sc('.gt-nav .gt-logos') + '{display:flex;gap:12px}',
        sc('.gt-nav .gt-logos img') + '{width:52px;height:52px;object-fit:contain;background:#fff;border-radius:10px;padding:5px;box-sizing:border-box}',
        sc('.gt-brand') + '{padding-left:20px;border-left:1px solid var(--gt-ln)}',
        sc('.gt-brand b') + '{display:block;font:700 19px/1 ' + MONO + ';letter-spacing:.32em;color:#fff}' + sc('.gt-brand b i') + '{font-style:normal;color:var(--gt-cy)}',
        sc('.gt-brand span') + '{display:block;margin-top:8px;font:500 11px/1 ' + MONO + ';letter-spacing:.22em;color:var(--gt-mu)}',
        sc('.gt-who') + '{margin-left:auto;display:flex;align-items:center;gap:12px;text-align:right;line-height:1.25}',
        sc('.gt-who small') + '{display:block;font:500 11px/1.3 ' + MONO + ';letter-spacing:.2em;color:var(--gt-mu);text-transform:uppercase}' + sc('.gt-who b') + '{display:block;font-weight:600;font-size:15px;color:#fff}',
        sc('.gt-av') + '{width:48px;height:48px;border-radius:50%;border:2px solid var(--gt-cy);box-shadow:0 0 18px rgba(34,211,238,.35);display:flex;align-items:center;justify-content:center;background:#1d4ed8 center/cover no-repeat;color:#fff;font-weight:700;flex:0 0 auto}',
        /* encabezado */
        sc('.gt-head') + '{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:38px 0 28px}',
        sc('.gt-eye') + '{font:500 13px/1 ' + MONO + ';letter-spacing:.26em;color:var(--gt-cy);text-transform:uppercase}',
        sc('.gt-title') + '{display:flex;align-items:center;gap:18px;flex-wrap:wrap;margin:14px 0 0!important;font-family:' + SANS + '!important;font-weight:900!important;font-size:clamp(36px,4.6vw,72px)!important;line-height:1!important;letter-spacing:-.045em!important;color:#eef4ff!important;background:none!important;-webkit-text-fill-color:#eef4ff!important;text-align:left!important}',
        sc('.gt-title em') + '{font-style:normal;color:var(--gt-cy);-webkit-text-fill-color:var(--gt-cy);text-shadow:0 0 36px rgba(34,211,238,.3)}',
        sc('.gt-badge') + '{font:600 12px/1 ' + MONO + ';letter-spacing:.24em;color:var(--gt-pk);padding:9px 14px;border:1px solid rgba(244,114,182,.6);background:rgba(80,7,36,.25);-webkit-text-fill-color:var(--gt-pk)}' + sc('.gt-badge:before') + '{content:"● "}',
        sc('.gt-desc') + '{margin:14px 0 0!important;font-size:17px!important;color:#aebbd0!important}',
        sc('.gt-head .btn-volver') + '{display:inline-flex!important;align-items:center;gap:12px;background:rgba(6,11,20,.8)!important;border:1px solid var(--gt-ln2)!important;border-radius:0!important;color:#e2e8f0!important;font:600 14px/1 ' + MONO + '!important;letter-spacing:.24em!important;padding:20px 26px!important;box-shadow:none!important;cursor:pointer;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}',
        sc('.gt-head .btn-volver svg') + '{width:18px;height:18px;color:var(--gt-cy)}' + sc('.gt-head .btn-volver:hover') + '{border-color:var(--gt-cy)!important;color:#fff!important}',
        sc('.gt-foot') + '{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:40px;padding:24px 0 6px;border-top:1px solid var(--gt-ln);font:500 12px/1.4 ' + MONO + ';letter-spacing:.22em;color:#64748b}',
        /* tarjetas / paneles genéricos */
        sc('.gt-card') + '{--c:var(--gt-cy);position:relative;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96))!important;border:0!important;border-radius:0!important;box-shadow:inset 0 0 0 1px var(--gt-ln)!important;padding:28px!important;clip-path:polygon(0 0,calc(100% - 26px) 0,100% 26px,100% 100%,26px 100%,0 calc(100% - 26px));backdrop-filter:none!important}',
        sc('.gt-card:before') + '{content:"";position:absolute;left:0;right:26px;top:0;height:2px;background:linear-gradient(90deg,var(--c),transparent 80%)}',
        sc('.gt-ch') + '{display:flex;align-items:center;gap:18px;padding-bottom:22px;margin-bottom:24px;border-bottom:1px solid var(--gt-ln)}',
        sc('.gt-ico') + '{flex:0 0 auto;width:52px;height:52px;display:flex;align-items:center;justify-content:center;color:var(--c);background:color-mix(in srgb,var(--c) 10%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 60%,transparent);clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)}',
        sc('.gt-ico svg') + '{width:24px;height:24px}',
        sc('.gt-ch small') + '{display:block;font:500 12px/1 ' + MONO + ';letter-spacing:.24em;color:var(--c);text-transform:uppercase}',
        sc('.gt-ch h3') + '{display:flex;align-items:center;gap:12px;margin:8px 0 0!important;font-family:' + SANS + '!important;font-size:26px!important;font-weight:800!important;letter-spacing:-.02em;color:#fff!important;border:0!important;padding:0!important;background:none!important}',
        sc('.gt-ch .gt-r') + '{margin-left:auto;text-align:right;font:700 15px/1.3 ' + MONO + ';letter-spacing:.06em;color:var(--c)}' + sc('.gt-ch .gt-r span') + '{display:block;font-weight:500;font-size:12px;letter-spacing:.2em;color:var(--gt-mu)}',
        /* controles */
        sc('label') + '{color:#9fb0c6}',
        sc('.gt-card input[type=email],.gt-card input[type=text],.gt-card input[type=search],.gt-card select,.gt-tool input') + '{width:100%;box-sizing:border-box;height:auto!important;padding:16px 18px!important;border-radius:0!important;border:1px solid #1f2b40!important;background:var(--gt-in)!important;color:#f1f5f9!important;font:500 15.5px/1.2 ' + MONO + '!important;box-shadow:none!important;outline:none}',
        sc('.gt-card input:focus,.gt-card select:focus,.gt-tool input:focus') + '{border-color:var(--gt-cy)!important;box-shadow:0 0 0 1px var(--gt-cy),0 0 20px rgba(34,211,238,.15)!important}',
        sc('.gt-card .btn-calcular') + '{display:inline-flex!important;align-items:center;justify-content:center;gap:10px;border:0!important;border-radius:0!important;background:var(--c,var(--gt-cy))!important;color:#03202a!important;font:800 15px/1 ' + MONO + '!important;letter-spacing:.24em!important;padding:20px 26px!important;box-shadow:0 0 24px color-mix(in srgb,var(--c,#22d3ee) 30%,transparent)!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%);cursor:pointer;text-transform:uppercase}',
        sc('.gt-card .botones-calculo') + '{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}' + sc('.gt-card .botones-calculo .btn-calcular') + '{flex:1 1 auto}',
        sc('.gt-card .btn-limpiar') + '{background:transparent!important;border:1px solid var(--gt-ln2)!important;border-radius:0!important;color:#e2e8f0!important;font:600 14px/1 ' + MONO + '!important;letter-spacing:.2em!important;padding:19px 22px!important;box-shadow:none!important;text-transform:uppercase;cursor:pointer}',
        sc('.gt-card .btn-limpiar:hover') + '{border-color:var(--gt-cy)!important}',
        sc('.gt-card .login-hint') + '{font-size:14.5px!important;color:#aebbd0!important;line-height:1.55}',
        sc('.gt-note') + '{display:flex;gap:12px;align-items:flex-start;margin-top:20px;padding:14px 16px;border:1px solid rgba(34,211,238,.25);background:rgba(8,40,56,.25);font-size:13.5px;line-height:1.5;color:#cbd5e1}' + sc('.gt-note svg') + '{flex:0 0 auto;width:18px;height:18px;color:var(--gt-cy);margin-top:1px}',
        sc('.aula-lista > *') + '{border-radius:0!important;background:var(--gt-in)!important;border:1px solid var(--gt-ln)!important;box-shadow:none!important}',
        sc('.aula-lista .btn-admin-del,.aula-lista button') + '{border-radius:0!important;background:transparent!important;border:1px solid rgba(248,113,113,.55)!important;color:#fca5a5!important;font:600 12.5px/1 ' + MONO + '!important;letter-spacing:.18em!important;padding:10px 14px!important;text-transform:uppercase;box-shadow:none!important}',

        sc('.gt-ch small') + '{color:var(--c)!important}',
        sc('.gt-ico svg') + '{display:block;margin:auto}',
        sc('.gt-card label') + '{display:block;margin:18px 0 10px!important;font:500 12.5px/1 ' + MONO + '!important;letter-spacing:.22em!important;text-transform:uppercase;color:#9fb0c6!important}',
        '#pantallaResultados.gt .gt-rtop{margin-bottom:26px}#pantallaResultados.gt .gt-rtop .gt-tool{margin-bottom:0}',
        '.gt-lico{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;flex:0 0 auto;font-size:0!important}.gt-lico svg{width:20px;height:20px}',
        /* ---- Administración ---- */
        '#pantallaAdmin.gt .aula-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:24px!important;padding:0!important;max-width:none!important}',
        '#pantallaAdmin.gt .aula-card-wide{grid-column:auto!important}',
        '#pantallaAdmin.gt .admin-civix-avatar-row{display:flex;gap:28px;align-items:center;flex-wrap:wrap}',
        '#pantallaAdmin.gt .admin-civix-preview-wrap{position:relative;width:180px;height:180px;flex:0 0 auto;display:flex;align-items:center;justify-content:center;border-radius:50%;background:radial-gradient(circle,#0f2236,#071019 70%);box-shadow:0 0 0 1px rgba(34,211,238,.35),0 0 0 14px rgba(34,211,238,.04),0 0 40px rgba(34,211,238,.25)}',
        '#pantallaAdmin.gt .admin-civix-preview{width:140px!important;height:140px!important;border-radius:50%!important;border:3px solid var(--gt-cy)!important;object-fit:cover;background:#fff}',
        '#pantallaAdmin.gt .admin-civix-avatar-actions{flex:1 1 240px;display:flex;flex-wrap:wrap;gap:12px;align-content:center}',
        '#pantallaAdmin.gt .admin-civix-avatar-actions > *{flex:1 1 auto}',
        '#pantallaAdmin.gt .gm-team-count-badge{font:700 14px/1 ' + MONO + ';padding:6px 9px;border:1px solid var(--gt-cy);color:var(--gt-cy);background:transparent;border-radius:0}',
        '@media (max-width:1000px){#pantallaAdmin.gt .aula-grid{grid-template-columns:1fr!important}}',
        /* ---- Recursos ---- */
        '#pantallaRecursos.gt .recursos-hero{display:block!important;margin:0!important;padding:0!important;background:none!important;border:0!important}',
        '#pantallaRecursos.gt .gt-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}',
        sc('.gt-stat') + '{--c:var(--gt-cy);position:relative;display:flex;align-items:center;gap:20px;padding:30px 28px;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96));box-shadow:inset 0 0 0 1px var(--gt-ln);clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,0 100%)}',
        sc('.gt-stat:before') + '{content:"";position:absolute;left:0;right:22px;top:0;height:2px;background:linear-gradient(90deg,var(--c),transparent 80%)}',
        sc('.gt-stat b') + '{display:block;font:700 34px/1 ' + MONO + ';color:var(--c)}' + sc('.gt-stat span') + '{display:block;margin-top:10px;font:500 12.5px/1.3 ' + MONO + ';letter-spacing:.22em;color:#9fb0c6;text-transform:uppercase}',
        sc('.gt-tool') + '{display:flex;gap:12px;flex-wrap:wrap;margin:26px 0}',
        sc('.gt-tool .gt-s') + '{position:relative;flex:1 1 320px}' + sc('.gt-tool .gt-s svg') + '{position:absolute;left:18px;top:50%;width:18px;height:18px;transform:translateY(-50%);color:var(--gt-cy)}',
        sc('.gt-tool .gt-s input') + '{padding-left:50px!important}',
        sc('.gt-tool button') + '{display:inline-flex;align-items:center;gap:10px;background:rgba(6,11,20,.8)!important;border:1px solid var(--gt-ln2)!important;border-radius:0!important;color:#cbd5e1!important;font:600 13px/1 ' + MONO + '!important;letter-spacing:.22em;padding:0 22px!important;min-height:56px;cursor:pointer;box-shadow:none!important;text-transform:uppercase;clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)}',
        sc('.gt-tool button i') + '{width:9px;height:9px;transform:rotate(45deg);background:var(--c)}',
        sc('.gt-tool button.on') + '{background:var(--gt-cy)!important;color:#03202a!important;border-color:var(--gt-cy)!important}',
        '#pantallaRecursos.gt .gt-banner{--c:var(--gt-pk);display:flex;align-items:center;gap:22px;margin:0 0 28px;padding:24px 28px;background:linear-gradient(100deg,rgba(80,7,36,.30),rgba(10,10,22,.6));border:1px solid rgba(244,114,182,.45)}',
        '#pantallaRecursos.gt .gt-banner small{display:block;font:600 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:var(--gt-pk)}#pantallaRecursos.gt .gt-banner p{margin:8px 0 0;font-size:16px;color:#dbe4ef}',
        '#pantallaRecursos.gt .recursos-container{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:24px!important;padding:0!important;max-width:none!important}',
        '#pantallaRecursos.gt .recurso-bloque{margin:0!important}',
        '#pantallaRecursos.gt .recurso-bloque.gt-hide,#pantallaRecursos.gt .libro-card.gt-hide{display:none!important}',
        '#pantallaRecursos.gt .recurso-bloque > .login-hint{display:flex;align-items:center;gap:10px;margin:0 0 18px!important;font:500 12.5px/1.4 ' + MONO + '!important;letter-spacing:.16em;text-transform:uppercase;color:#9fb0c6!important}',
        '#pantallaRecursos.gt .recurso-bloque > .login-hint svg{width:16px;height:16px;color:var(--gt-am);flex:0 0 auto}',
        '#pantallaRecursos.gt .libros-grid{display:flex!important;flex-direction:column;gap:14px!important}',
        '#pantallaRecursos.gt .libro-card{--b:var(--c);display:grid!important;grid-template-columns:66px minmax(0,1fr) auto;grid-template-rows:auto auto auto;column-gap:22px;align-items:center;padding:22px 22px!important;margin:0!important;border-radius:0!important;background:var(--gt-in)!important;border:1px solid var(--gt-ln)!important;box-shadow:none!important;transform:none!important;text-align:left!important}',
        '#pantallaRecursos.gt .libro-card:hover{border-color:color-mix(in srgb,var(--b) 60%,transparent)!important}',
        '#pantallaRecursos.gt .libro-icono{grid-row:1/4;width:66px;height:90px;font-size:0!important;background:linear-gradient(90deg,color-mix(in srgb,var(--b) 45%,transparent) 0 9px,color-mix(in srgb,var(--b) 14%,#0b1220) 9px)!important;border:1.5px solid var(--b)!important;border-radius:0!important;position:relative;margin:0!important}',
        '#pantallaRecursos.gt .libro-icono:after{content:"";position:absolute;left:18px;right:10px;top:18px;height:2px;background:color-mix(in srgb,var(--b) 70%,transparent);box-shadow:0 7px 0 color-mix(in srgb,var(--b) 40%,transparent)}',
        '#pantallaRecursos.gt .libro-card h4{grid-column:2;margin:0!important;font-family:' + SANS + '!important;font-size:19px!important;font-weight:700!important;color:#fff!important}',
        '#pantallaRecursos.gt .libro-autor{grid-column:2;margin:6px 0 0!important;font-size:15px!important;color:var(--b)!important;font-weight:500}',
        '#pantallaRecursos.gt .libro-desc{grid-column:2;margin:6px 0 0!important;font-size:14.5px!important;color:#aebbd0!important}',
        '#pantallaRecursos.gt .libro-badge{grid-column:3;grid-row:1;justify-self:end;align-self:start;font:600 11.5px/1 ' + MONO + '!important;letter-spacing:.2em;text-transform:uppercase;padding:7px 11px!important;border:1px solid color-mix(in srgb,var(--b) 60%,transparent)!important;color:var(--b)!important;background:transparent!important;border-radius:0!important;white-space:nowrap}',
        '#pantallaRecursos.gt .gt-open{grid-column:3;grid-row:2/4;justify-self:end;display:inline-flex;align-items:center;gap:8px;background:var(--b)!important;color:#0b0f1a!important;border:0!important;border-radius:0!important;font:800 13.5px/1 ' + MONO + '!important;letter-spacing:.22em;padding:15px 18px!important;cursor:pointer;clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%);margin-top:10px;box-shadow:none!important}',
        '#pantallaRecursos.gt .libro-card.k-norma{--b:var(--gt-vi)}',
        '#pantallaRecursos.gt .gt-empty{display:none;padding:30px;text-align:center;color:var(--gt-mu);border:1px dashed var(--gt-ln2)}#pantallaRecursos.gt .gt-empty.on{display:block;grid-column:1/-1}',
        '@media (max-width:1100px){#pantallaRecursos.gt .recursos-container{grid-template-columns:1fr!important}#pantallaRecursos.gt .gt-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}',
        '@media (max-width:620px){#pantallaRecursos.gt .libro-card{grid-template-columns:52px minmax(0,1fr)}#pantallaRecursos.gt .libro-icono{width:52px;height:72px}#pantallaRecursos.gt .libro-badge,#pantallaRecursos.gt .gt-open{grid-column:2;grid-row:auto;justify-self:start;margin-top:10px}}',
        /* ---- Resultados ---- */
        '#pantallaResultados.gt .resultados-container{padding:0!important;max-width:none!important;margin:0!important;background:none!important}',
        '#pantallaResultados.gt .gt-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:18px}',
        '#pantallaResultados.gt .resultados-vacio{display:none!important}',
        '#pantallaResultados.gt .gt-emptybox{display:grid;grid-template-columns:minmax(0,.75fr) minmax(0,1.25fr);gap:40px;align-items:center;padding:56px 50px!important}',
        '#pantallaResultados.gt .gt-ill{position:relative;aspect-ratio:1;max-width:440px;margin:0 auto;width:100%}',
        '#pantallaResultados.gt .gt-emptybox h3{margin:16px 0 0!important;font-family:' + SANS + '!important;font-size:clamp(28px,3vw,46px)!important;font-weight:900!important;letter-spacing:-.04em;color:#fff!important}',
        '#pantallaResultados.gt .gt-emptybox > div > p{margin:18px 0 0;font-size:18px;line-height:1.6;color:#aebbd0;max-width:760px}',
        '#pantallaResultados.gt .gt-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:32px 0 30px}',
        '#pantallaResultados.gt .gt-steps div{padding:22px;border:1px solid var(--gt-ln2);background:var(--gt-in)}#pantallaResultados.gt .gt-steps small{font:500 13px/1 ' + MONO + ';letter-spacing:.2em;color:var(--gt-cy)}#pantallaResultados.gt .gt-steps b{display:block;margin-top:14px;font-size:18px;color:#fff}#pantallaResultados.gt .gt-steps p{margin:10px 0 0;font-size:14.5px;line-height:1.5;color:#9fb0c6}',
        '#pantallaResultados.gt .gt-go{display:inline-flex;align-items:center;gap:14px;background:var(--gt-cy)!important;color:#03202a!important;border:0!important;border-radius:0!important;font:800 16px/1 ' + MONO + '!important;letter-spacing:.24em;padding:24px 34px!important;cursor:pointer;box-shadow:0 0 30px rgba(34,211,238,.25)!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 12px),calc(100% - 12px) 100%,0 100%)}',
        '#pantallaResultados.gt .resultados-header-block{display:none}',
        '#pantallaResultados.gt .resultados-lista{display:block!important}',
        '#pantallaResultados.gt .gtr-wrap{position:relative;padding:8px 0 0!important;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96));box-shadow:inset 0 0 0 1px var(--gt-ln);clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,0 100%)}',
        '#pantallaResultados.gt .gtr-wrap:before{content:"";position:absolute;left:0;right:22px;top:0;height:2px;background:linear-gradient(90deg,var(--gt-cy),transparent 70%)}',
        '#pantallaResultados.gt .gtr-head,#pantallaResultados.gt .resultado-card{display:grid!important;grid-template-columns:minmax(0,2.5fr) minmax(0,1.3fr) minmax(0,1.1fr) minmax(0,1.4fr) minmax(0,1fr) auto;gap:16px;align-items:center;padding:20px 28px!important}',
        '#pantallaResultados.gt .gtr-head{font:500 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6;text-transform:uppercase;border-bottom:1px solid var(--gt-ln)}#pantallaResultados.gt .gtr-head span:last-child{text-align:right;min-width:230px}',
        '#pantallaResultados.gt .resultado-card{position:relative;margin:0!important;border-radius:0!important;background:transparent!important;border:0!important;border-bottom:1px solid var(--gt-ln)!important;box-shadow:none!important;clip-path:none!important;transition:background .15s}',
        '#pantallaResultados.gt .resultado-card:hover{background:rgba(34,211,238,.04)!important}',
        '#pantallaResultados.gt .resultado-card.gt-hide{display:none!important}',
        '#pantallaResultados.gt .resultado-card-top,#pantallaResultados.gt .resultado-card > h4,#pantallaResultados.gt .resultado-card > .resultado-valor{display:none!important}',
        '#pantallaResultados.gt .gtr-ens{display:flex;align-items:center;gap:16px;min-width:0}',
        '#pantallaResultados.gt .gtr-ens i{flex:0 0 auto;width:50px;height:50px;display:flex;align-items:center;justify-content:center;color:var(--c);background:color-mix(in srgb,var(--c) 9%,transparent);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c) 55%,transparent);clip-path:polygon(0 0,100% 0,100% calc(100% - 9px),calc(100% - 9px) 100%,0 100%)}#pantallaResultados.gt .gtr-ens i svg{width:22px;height:22px}',
        '#pantallaResultados.gt .gtr-ens b{display:block;font-size:17px;color:#fff;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#pantallaResultados.gt .gtr-ens small{display:block;margin-top:7px;font:500 12px/1 ' + MONO + ';letter-spacing:.16em;color:#8b9ab0;text-transform:uppercase}',
        '#pantallaResultados.gt .gtr-mat{font-size:15px;color:#cbd5e1}#pantallaResultados.gt .gtr-mat:before{content:"";display:inline-block;width:8px;height:8px;margin-right:10px;transform:rotate(45deg);background:var(--c)}',
        '#pantallaResultados.gt .gtr-fec{font:500 13.5px/1.5 ' + MONO + ';color:#aebbd0}#pantallaResultados.gt .gtr-fec small{display:block;color:#64748b}',
        '#pantallaResultados.gt .gtr-res b{font:700 24px/1 ' + MONO + ';color:var(--c)}#pantallaResultados.gt .gtr-res em{font-style:normal;margin-left:6px;font:500 13px/1 ' + MONO + ';color:#9fb0c6}#pantallaResultados.gt .gtr-res small{display:block;margin-top:7px;font:500 12px/1.3 ' + MONO + ';color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
        '#pantallaResultados.gt .gtr-est{justify-self:start;font:600 11.5px/1 ' + MONO + ';letter-spacing:.2em;padding:8px 11px;border:1px solid rgba(45,212,191,.6);color:#5eead4;text-transform:uppercase}#pantallaResultados.gt .gtr-est.rev{border-color:rgba(245,158,11,.6);color:#fcd34d}',
        '#pantallaResultados.gt .resultado-acciones{display:flex!important;gap:8px;margin:0!important;justify-content:flex-end;min-width:230px}',
        '#pantallaResultados.gt .resultado-acciones button{flex:0 0 auto;display:inline-flex;align-items:center;gap:8px;border-radius:0!important;font:700 12.5px/1 ' + MONO + '!important;letter-spacing:.18em;padding:13px 14px!important;text-transform:uppercase;cursor:pointer;box-shadow:none!important;background:transparent!important;color:#e2e8f0!important;border:1px solid var(--gt-ln2)!important}',
        '#pantallaResultados.gt .resultado-acciones button svg{width:15px;height:15px}',
        '#pantallaResultados.gt .resultado-acciones .gtr-ver{border-color:rgba(34,211,238,.6)!important;color:var(--gt-cy)!important}',
        '#pantallaResultados.gt .btn-ver-resultado:hover,#pantallaResultados.gt .gtr-ver:hover{background:var(--gt-cy)!important;color:#03202a!important}',
        '#pantallaResultados.gt .btn-del-resultado{color:#fca5a5!important;border-color:rgba(248,113,113,.45)!important}',
        '#pantallaResultados.gt .gtr-foot{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:20px 28px;font:500 12.5px/1 ' + MONO + ';letter-spacing:.22em;color:#8b9ab0;text-transform:uppercase}',
        '#pantallaResultados.gt .gtr-foot button{background:none!important;border:0!important;color:var(--gt-cy)!important;font:700 13px/1 ' + MONO + '!important;letter-spacing:.22em;cursor:pointer;padding:6px 0!important}',
        '@media (max-width:1100px){#pantallaResultados.gt .gtr-head{display:none!important}#pantallaResultados.gt .resultado-card{grid-template-columns:1fr 1fr!important}#pantallaResultados.gt .gtr-ens,#pantallaResultados.gt .resultado-acciones{grid-column:1/-1}#pantallaResultados.gt .resultado-acciones{justify-content:flex-start;min-width:0}}',
        '@media (max-width:1000px){#pantallaResultados.gt .gt-emptybox{grid-template-columns:1fr;padding:32px 22px!important}#pantallaResultados.gt .gt-steps{grid-template-columns:1fr}#pantallaResultados.gt .gt-stats{grid-template-columns:repeat(2,minmax(0,1fr))}}',
        '@media (max-width:640px){' + sc('.gt-brand span') + '{display:none}' + sc('.gt-who small') + '{display:none}' + S.map(function (s) { return s + '.gt .gt-stats'; }).join(',') + '{grid-template-columns:1fr!important}}',

        /* ================= Panel docente / Mi aula / Civix / herramientas / equipo (reskin) ================= */
        '#pantallaDocente,#pantallaEstudiante{--gt-cy:#22d3ee;background:radial-gradient(1000px 600px at 80% 0%,rgba(34,211,238,.06),transparent 60%),linear-gradient(#04070d,#03060b)!important}',
        '#pantallaDocente .dp-top,#pantallaEstudiante .av-top{background:rgba(4,7,13,.92)!important;border-bottom:1px solid var(--gt-ln)!important;box-shadow:none!important;backdrop-filter:blur(8px)}',
        '#pantallaDocente .dp-brand,#pantallaEstudiante .av-brand{font-family:' + MONO + '}',
        '#pantallaDocente .dp-search,#pantallaDocente .dp-search input,#pantallaEstudiante .av-search,#pantallaEstudiante .av-search input{border-radius:0!important}',
        '#pantallaDocente .dp-search,#pantallaEstudiante .av-search{background:var(--gt-in)!important;border:1px solid var(--gt-ln2)!important}',
        '#pantallaDocente .dp-search input,#pantallaEstudiante .av-search input{font-family:' + MONO + '!important;background:transparent!important}',
        '#pantallaDocente .dp-icon-btn,#pantallaDocente .dp-user-chip,#pantallaDocente .av-btn-ghost,#pantallaEstudiante .av-icon-btn,#pantallaEstudiante .av-user-chip,#pantallaEstudiante .av-btn-menu{border-radius:0!important;background:rgba(6,11,20,.85)!important;border:1px solid var(--gt-ln2)!important;box-shadow:none!important}',
        '#pantallaDocente .av-btn-ghost,#pantallaEstudiante .av-btn-menu{font:600 13px/1 ' + MONO + '!important;letter-spacing:.22em!important;text-transform:uppercase;color:#e2e8f0!important}',
        '#pantallaDocente .dp-user-av,#pantallaEstudiante .av-user-fb{border-radius:0!important;border:1px solid rgba(34,211,238,.6)!important;background:rgba(34,211,238,.08)!important;color:var(--gt-cy)!important;font-family:' + MONO + '!important}',
        '#pantallaDocente .dp-side{background:rgba(5,8,15,.92)!important;border-right:1px solid var(--gt-ln)!important}',
        '#pantallaDocente .dp-side-label{font:500 12px/1 ' + MONO + '!important;letter-spacing:.26em!important;color:var(--gt-mu)!important}',
        '#pantallaDocente .dp-side button,#pantallaDocente .dp-side a{border-radius:0!important;font-family:' + SANS + '!important;font-size:16px!important;color:#cbd5e1!important;border-left:2px solid transparent!important}',
        '#pantallaDocente .dp-side button.active,#pantallaDocente .dp-side button:hover{background:linear-gradient(90deg,rgba(34,211,238,.14),rgba(34,211,238,.02))!important;color:#fff!important;border-left-color:var(--gt-cy)!important}',
        '#pantallaDocente .tab-badge,#pantallaDocente .dp-badge{border-radius:0!important;border:1px solid rgba(34,211,238,.6)!important;background:transparent!important;color:var(--gt-cy)!important;font-family:' + MONO + '!important}',
        '#pantallaDocente .dp-head h1,#pantallaDocente .dp-head h2{font-family:' + SANS + '!important;font-weight:900!important;letter-spacing:-.04em!important;color:#fff!important}',
        '#pantallaDocente .dp-card,#pantallaDocente .dp-kpi,#pantallaEstudiante .av-card,#pantallaDocente .aula-card,#pantallaEstudiante .aula-card{position:relative;border-radius:0!important;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96))!important;border:0!important;box-shadow:inset 0 0 0 1px var(--gt-ln)!important;clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px))}',
        '#pantallaDocente .dp-kpi:before,#pantallaDocente .dp-card:before,#pantallaEstudiante .av-card:before{content:"";position:absolute;left:0;right:22px;top:0;height:2px;background:linear-gradient(90deg,var(--gt-cy),transparent 75%);pointer-events:none}',
        '#pantallaDocente .dp-kpi.violet:before{background:linear-gradient(90deg,var(--gt-vi),transparent 75%)}#pantallaDocente .dp-kpi.alert:before{background:linear-gradient(90deg,var(--gt-pk),transparent 75%)}#pantallaDocente .dp-kpi.ok:before{background:linear-gradient(90deg,#2dd4bf,transparent 75%)}',
        '#pantallaDocente .dp-kpi-num{font-family:' + MONO + '!important;font-weight:700!important}',
        '#pantallaDocente .dp-kpi .label,#pantallaDocente .dp-card h3 small,#pantallaEstudiante .av-card h4{font-family:' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase}',
        '#pantallaDocente .dp-ico,#pantallaEstudiante .av-ico{border-radius:0!important}',
        '#pantallaDocente .dp-btn-primary,#pantallaDocente .btn-calcular,#pantallaEstudiante .btn-calcular,#pantallaEstudiante .av-btn-primary{border-radius:0!important;background:var(--gt-cy)!important;color:#03202a!important;border:0!important;font:800 14px/1 ' + MONO + '!important;letter-spacing:.22em!important;text-transform:uppercase;box-shadow:0 0 24px rgba(34,211,238,.25)!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%)}',
        '#pantallaDocente .btn-limpiar,#pantallaEstudiante .btn-limpiar,#pantallaDocente .btn-secundario,#pantallaEstudiante .btn-secundario{border-radius:0!important;background:transparent!important;border:1px solid var(--gt-ln2)!important;color:#e2e8f0!important;font:600 13px/1 ' + MONO + '!important;letter-spacing:.18em!important;text-transform:uppercase}',
        '#pantallaDocente input:not([type=checkbox]):not([type=radio]):not([type=file]),#pantallaDocente select,#pantallaDocente textarea,#pantallaEstudiante input:not([type=checkbox]):not([type=radio]):not([type=file]),#pantallaEstudiante select,#pantallaEstudiante textarea{border-radius:0!important;background:var(--gt-in)!important;border:1px solid #1f2b40!important;color:#f1f5f9!important;font-family:' + MONO + '!important;box-shadow:none!important}',
        '#pantallaDocente input:focus,#pantallaDocente select:focus,#pantallaDocente textarea:focus,#pantallaEstudiante input:focus,#pantallaEstudiante select:focus,#pantallaEstudiante textarea:focus{border-color:var(--gt-cy)!important;outline:none!important;box-shadow:0 0 0 1px var(--gt-cy)!important}',
        '#pantallaDocente label,#pantallaEstudiante label{font-family:' + MONO + ';letter-spacing:.14em}',
        '#pantallaEstudiante .av-nav{background:rgba(5,8,15,.92)!important;border-right:1px solid var(--gt-ln)!important}',
        '#pantallaEstudiante .av-nav button,#pantallaEstudiante .av-nav a{border-radius:0!important;font-family:' + MONO + '!important;letter-spacing:.14em;text-transform:uppercase}',
        '#pantallaEstudiante .av-nav button.active{background:linear-gradient(90deg,rgba(34,211,238,.16),rgba(34,211,238,.02))!important;border-left:2px solid var(--gt-cy)!important;color:var(--gt-cy)!important}',
        '#pantallaEstudiante .av-cal-grid .day{border-radius:0!important;font-family:' + MONO + '}',
        '#pantallaEstudiante .av-cal-grid .day.today{background:var(--gt-cy)!important;color:#03202a!important}',
        '#pantallaEstudiante .av-mini-bar,#pantallaEstudiante .av-progress-bar{border-radius:0!important}',
        '#pantallaEstudiante .av-hologram,#pantallaEstudiante .av-announce,#pantallaEstudiante .av-quickbar{border-radius:0!important}',
        /* Civix */
        '#asistenteModal .asistente-contenido{background:#04070d!important;border-radius:0!important}',
        '#asistenteModal .civix-side-left,#asistenteModal .civix-side-right{background:rgba(5,8,15,.95)!important;border-color:var(--gt-ln)!important}',
        '#asistenteModal .civix-brand-name{font-family:' + MONO + '!important;letter-spacing:.3em!important;text-transform:uppercase;color:#fff!important}',
        '#asistenteModal .civix-brand-sub{font-family:' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase}',
        '#asistenteModal .civix-nav-item{border-radius:0!important;font-family:' + SANS + '!important;font-size:16px!important;border-left:2px solid transparent!important}',
        '#asistenteModal .civix-nav-item.active,#asistenteModal .civix-nav-item:hover{background:linear-gradient(90deg,rgba(34,211,238,.14),rgba(34,211,238,.02))!important;border-left-color:var(--gt-cy)!important;color:#fff!important}',
        '#asistenteModal .civix-side-card,#asistenteModal .civix-promo-card,#asistenteModal .civix-panel-block{border-radius:0!important;border:1px solid var(--gt-ln2)!important;background:linear-gradient(165deg,rgba(14,22,38,.95),rgba(8,13,24,.96))!important;box-shadow:none!important}',
        '#asistenteModal .civix-header{border-bottom:1px solid var(--gt-ln)!important;background:transparent!important}',
        '#asistenteModal .civix-online{border-radius:0!important;font-family:' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase;border:1px solid rgba(45,212,191,.55)!important;background:transparent!important;color:#5eead4!important}',
        '#asistenteModal .civix-modo,#asistenteModal .civix-model-wrap,#asistenteModal .civix-web-toggle{border-radius:0!important;background:rgba(6,11,20,.85)!important;border:1px solid var(--gt-ln2)!important;font-family:' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase;box-shadow:none!important}',
        '#asistenteModal .civix-modo.active{border-color:var(--gt-cy)!important;color:var(--gt-cy)!important;box-shadow:inset 0 -2px 0 var(--gt-cy)!important}',
        '#asistenteModal .civix-model-select{font-family:' + MONO + '!important;background:transparent!important}',
        '#asistenteModal .mensaje-bot,#asistenteModal .mensaje-usuario,#asistenteModal .mensaje > div{border-radius:0!important}',
        '#asistenteModal .mensaje-bot{border:1px solid rgba(34,211,238,.28)!important;background:rgba(8,40,56,.25)!important}',
        '#asistenteModal .civix-chips button,#asistenteModal .civix-chip{border-radius:0!important;font-family:' + MONO + '!important;letter-spacing:.16em;text-transform:uppercase;background:transparent!important;border:1px solid var(--gt-ln2)!important}',
        '#asistenteModal .civix-quick,#asistenteModal .civix-tool-card,#asistenteModal .civix-res-btn{border-radius:0!important;background:rgba(6,11,20,.85)!important;border:1px solid var(--gt-ln2)!important;box-shadow:none!important}',
        '#asistenteModal .civix-quick:hover,#asistenteModal .civix-tool-card:hover{border-color:var(--gt-cy)!important}',
        '#asistenteModal .asistente-input,#asistenteModal .civix-input-pro{border-radius:0!important;background:var(--gt-in)!important;border:1px solid var(--gt-ln2)!important}',
        '#asistenteModal #inputAsistente{font-family:' + MONO + '!important}',
        '#asistenteModal .civix-send-btn{border-radius:0!important;background:var(--gt-cy)!important;color:#03202a!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%)}',
        '#asistenteModal .btn-mejorar-prompt,#asistenteModal .btn-adjuntar-icon,#asistenteModal .btn-cerrar-asistente{border-radius:0!important}',
        '#asistenteModal .cxp-tab,#asistenteModal .cxp-chip,#asistenteModal .cxp-card,#asistenteModal .cx-btn,#asistenteModal .cxp-go,#asistenteModal .cxp-sec input,#asistenteModal .cxp-sec select,#asistenteModal .cxp-sec textarea,#asistenteModal .cx-card,#asistenteModal .cx-box{border-radius:0!important}',
        '#asistenteModal .cxp-tab{font-family:' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase}',
        '#asistenteModal .cxp-sec input,#asistenteModal .cxp-sec select,#asistenteModal .cxp-sec textarea{background:var(--gt-in)!important;border:1px solid #1f2b40!important;font-family:' + MONO + '!important;color:#f1f5f9!important}',
        '#asistenteModal .cxp-sec label,#asistenteModal .cxp-f > span{font-family:' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase}',
        /* Calculadora y conversor */
        '.cvx-win{border-radius:0!important;background:linear-gradient(165deg,#0b1220,#070c16)!important;border:1px solid rgba(34,211,238,.3)!important;clip-path:polygon(0 0,calc(100% - 28px) 0,100% 28px,100% 100%,28px 100%,0 calc(100% - 28px))}',
        '.cvx-tab,.cvx-pill,.cvx-key,.cvx-cat,.cvx-field,.cvx-swap,.cvx-x,.cvx-res-btns button,.cvx-presets button,.cvx-all-item,.cvx-hist > *,.cvx-screen,.cvx-result,.cvx-conv-panel select,.cvx-conv-panel input{border-radius:0!important}',
        '.cvx-tab,.cvx-pill,.cvx-presets button,.cvx-res-btns button{font-family:' + MONO + '!important;letter-spacing:.2em!important;text-transform:uppercase}',
        '.cvx-tab.on,.cvx-tab.active{border-color:var(--gt-cy)!important;color:var(--gt-cy)!important;box-shadow:inset 0 -2px 0 var(--gt-cy)!important}',
        '.cvx-screen,.cvx-result{background:linear-gradient(160deg,rgba(8,47,73,.35),rgba(5,10,20,.9))!important;border:1px solid rgba(34,211,238,.3)!important}',
        '.cvx-key{font-family:' + MONO + '!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 7px),calc(100% - 7px) 100%,0 100%)}',
        '.cvx-key.cvx-eq{background:var(--gt-cy)!important;color:#03202a!important}',
        '.cvx-res-num,.cvx-expr,.cvx-live{font-family:' + MONO + '!important}',
        '.cvx-cat.on,.cvx-cat.active{background:rgba(34,211,238,.1)!important;border-left:2px solid var(--gt-cy)!important}',
        '.cvx-pill-ai{background:var(--gt-pk)!important;color:#1a0510!important}',
        /* Equipo creador (ventana) */
        '.gm-equipo-modal-panel{border-radius:0!important;background:linear-gradient(165deg,#0b1220,#070c16)!important;border:1px solid rgba(34,211,238,.3)!important;clip-path:polygon(0 0,calc(100% - 30px) 0,100% 30px,100% 100%,30px 100%,0 calc(100% - 30px))}',
        '.gm-equipo-modal-head h2{font-family:' + SANS + '!important;font-weight:900!important;letter-spacing:-.04em!important;color:#fff!important}',
        '.gm-equipo-modal-head:before{content:"// EQUIPO CREADOR";display:block;margin-bottom:14px;font:500 13px/1 ' + MONO + ';letter-spacing:.26em;color:#22d3ee}',
        '.gm-equipo-card{border-radius:0!important;box-shadow:inset 0 0 0 1px var(--gt-ln)!important;background:linear-gradient(170deg,rgba(14,22,38,.95),rgba(8,13,24,.96))!important;border:0!important}',
        '.gm-equipo-rol,.gm-equipo-links a{border-radius:0!important;font-family:' + MONO + '!important;letter-spacing:.18em!important;text-transform:uppercase}',
        '.gm-equipo-modal-close{border-radius:0!important;border:1px solid var(--gt-ln2)!important;background:rgba(6,11,20,.9)!important}'
    ].join('\n');
    doc.head.appendChild(css);

    /* ================================================================== piezas */
    function quien() {
        var u = null; try { u = window.aulaGetSession ? window.aulaGetSession() : null; } catch (e) { }
        if (!u) return { u: null, rol: 'INVITADO', nombre: 'Bienvenido/a' };
        var g = ''; try { g = window.aulaGeneroUsuario ? window.aulaGeneroUsuario(u) : ''; } catch (e) { }
        var adm = false; try { adm = !!(window.aulaEsAdminEmail && window.aulaEsAdminEmail(u.email)); } catch (e) { }
        var rol = u.rol === 'docente' ? (g === 'mujer' ? 'INGENIERA DOCENTE' : 'INGENIERO DOCENTE') : (g === 'mujer' ? 'FUTURA INGENIERA' : 'FUTURO INGENIERO');
        if (adm && u.rol !== 'docente') rol = 'ADMINISTRADOR';
        return { u: u, rol: rol, nombre: String(u.nombre || u.nombres || 'Usuario').trim().split(/\s+/).slice(0, 2).join(' ') };
    }
    function pintarQuien(box) {
        var q = quien(), t = box.querySelector('.gt-who-t'), av = box.querySelector('.gt-av');
        var h = '<small>' + esc(q.rol) + '</small><b>' + esc(q.nombre) + '</b>'; if (t.__h !== h) { t.__h = h; t.innerHTML = h; }
        try { if (window.aulaSetAvatarEl) window.aulaSetAvatarEl(av, q.u, q.u && window.aulaIniciales ? window.aulaIniciales(q.u.nombre || '') : '?'); else av.textContent = '?'; } catch (e) { av.textContent = '?'; }
    }
    function barra(main) {
        var nav = el('header', 'gt-nav', '<div class="gt-logos"><img src="docs/logo_unipamplona.png" alt="Universidad de Pamplona"><img src="docs/logo_ingenieria_civil.png" alt="Ingeniería Civil"></div><div class="gt-brand"><b>GEO<i>METRICS</i></b><span>LABORATORIO VIRTUAL // ING. CIVIL</span></div><div class="gt-who"><div class="gt-who-t"></div><span class="gt-av"></span></div>');
        main.insertBefore(nav, main.firstChild);
        var who = nav.querySelector('.gt-who'); pintarQuien(who);
        new MutationObserver(function () { if (main.style.display !== 'none') pintarQuien(who); }).observe(main, { attributes: true, attributeFilter: ['style'] });
        return nav;
    }
    function cabecera(main, o) {
        var old = main.querySelector(':scope > .seccion-encabezado'), back = old && old.querySelector('.btn-volver');
        var hd = el('div', 'gt-head', '<div><div class="gt-eye">' + esc(o.eye) + '</div><h2 class="gt-title">' + o.title + (o.badge ? '<span class="gt-badge">' + esc(o.badge) + '</span>' : '') + '</h2><p class="gt-desc">' + esc(o.desc) + '</p></div>');
        if (back) { back.innerHTML = IC.back + 'VOLVER AL MENÚ'; hd.appendChild(back); }
        var nav = main.querySelector(':scope > .gt-nav');
        main.insertBefore(hd, nav ? nav.nextSibling : main.firstChild);
        return hd;
    }
    function pie(main, txt) { main.appendChild(el('footer', 'gt-foot', '<span>© ' + new Date().getFullYear() + ' GEOMETRICS // ' + esc(txt) + '</span><span>DESARROLLADO POR ESTUDIANTES DE INGENIERÍA CIVIL</span>')); }
    function tarjeta(card, o) {
        card.classList.add('gt-card'); card.style.setProperty('--c', o.c);
        var h3 = card.querySelector(':scope > h3, :scope > div > h3'); if (!h3) return;
        var ch = el('div', 'gt-ch', '<span class="gt-ico">' + o.ico + '</span><div><small>' + esc(o.eye) + '</small></div>');
        var holder = h3.parentNode === card ? card : h3.parentNode;
        ch.querySelector('div').appendChild(h3);
        if (o.right) ch.appendChild(el('div', 'gt-r', o.right));
        if (holder === card) card.insertBefore(ch, card.firstChild); else holder.parentNode.insertBefore(ch, holder), holder.childElementCount || holder.remove();
    }
    function stat(c, ico, num, lab) { return '<div class="gt-stat" style="--c:' + c + '"><span class="gt-ico" style="--c:' + c + '">' + ico + '</span><div><b>' + num + '</b><span>' + esc(lab) + '</span></div></div>'; }

    /* ================================================================== Administración */
    function admin() {
        var M = $('pantallaAdmin'); if (!M || M.classList.contains('gt')) return;
        M.classList.add('gt'); barra(M);
        var adm = false; try { var u = window.aulaGetSession && window.aulaGetSession(); adm = !!(u && window.aulaEsSuperAdmin && window.aulaEsSuperAdmin(u.email)); } catch (e) { }
        cabecera(M, { eye: '// ADMINISTRACIÓN', title: 'Panel de <em>administración</em>', desc: 'Gestiona correos de docentes y permisos de administrador.', badge: 'ADMIN' });
        var MAP = {
            'Avatar de Civix': { eye: 'CIVIX // APARIENCIA', c: '#f472b6', ico: IC.bot },
            'Agregar correo de docente': { eye: 'DOCENTES // AUTORIZAR', c: '#22d3ee', ico: IC.uadd },
            'Docentes autorizados': { eye: 'DOCENTES // ACCESO', c: '#a78bfa', ico: IC.users },
            'Permisos de administrador': { eye: 'PERMISOS // ADMINISTRADOR', c: '#f472b6', ico: IC.key },
            'Administrar equipo creador': { eye: 'EQUIPO // GESTIÓN', c: '#22d3ee', ico: IC.grid },
            'Integrantes del equipo creador': { eye: 'EQUIPO // VISTA PÚBLICA', c: '#22d3ee', ico: IC.users }
        };
        M.querySelectorAll('.aula-card').forEach(function (c) {
            var h = c.querySelector('h3'); if (!h) return;
            var t = (h.childNodes[0] && h.childNodes[0].textContent || h.textContent).trim();
            var o = MAP[t]; if (!o) { o = { eye: 'ADMINISTRACIÓN', c: '#22d3ee', ico: IC.shield }; }
            tarjeta(c, o);
            c.querySelectorAll(':scope > .login-hint').forEach(function (p) {
                if (/Solo autorizas|Incluye la lista|superadmin/i.test(p.textContent)) { var n = el('div', 'gt-note', IC.info + '<span></span>'); n.querySelector('span').innerHTML = p.innerHTML; p.remove(); c.appendChild(n); }
            });
        });
        pie(M, 'ADMINISTRACIÓN');
    }

    /* ================================================================== Recursos */
    var GRUPO = function (t) { t = sinTildes(t); if (/suelos|geotec/.test(t)) return 'suelos'; if (/norma|nsr|aci|astm/.test(t)) return 'normas'; return 'materiales'; };
    var BLOQUES = [
        [/resistencia/, 'RM // MATERIALES', '#f59e0b', IC.beam], [/suelos ii|suelos 2|cimentac/, 'MS-II // GEOTECNIA', '#22d3ee', IC.home],
        [/suelos/, 'MS-I // LABORATORIO', '#22d3ee', IC.layers], [/mezcla|concreto/, 'DM // CONCRETO', '#f59e0b', IC.flask],
        [/estructura/, 'EST-I // ANÁLISIS', '#a78bfa', IC.grid], [/norma/, 'NORMAS // REFERENCIA', '#a78bfa', IC.shield]
    ];
    function recursos() {
        var M = $('pantallaRecursos'); if (!M || M.classList.contains('gt')) return;
        M.classList.add('gt'); barra(M);
        cabecera(M, { eye: '// BIBLIOTECA GEOMETRICS', title: 'Recursos y <em>Materiales</em>', desc: 'Biblioteca académica por materia: textos guía, normas y guías de laboratorio.' });
        var hero = M.querySelector('.recursos-hero'), cont = M.querySelector('.recursos-container');
        var bloques = cont ? [].slice.call(cont.querySelectorAll('.recurso-bloque')) : [];
        if (hero) {
            var st = hero.querySelectorAll('.recursos-stats > div');
            var g = function (i, k) { var d = st[i]; return d ? (d.querySelector(k) || {}).textContent || '' : ''; };
            hero.innerHTML = '<div class="gt-stats">' + stat('#22d3ee', IC.book, esc(g(0, 'strong') || bloques.length), g(0, 'em') || 'Materias') + stat('#f59e0b', IC.flask, esc(g(1, 'strong') || 'FLA-23'), 'Guías lab · UniPamplona') + stat('#a78bfa', IC.shield, esc(g(2, 'strong') || 'NSR-10'), 'Título H · Geotecnia') + stat('#f472b6', IC.bot, 'CIVIX', 'Usa estas fuentes') + '</div>';
            var tool = el('div', 'gt-tool', '<label class="gt-s">' + IC.search + '<input type="search" placeholder="buscar libro, autor, norma o guía…" aria-label="Buscar en la biblioteca"></label><button type="button" class="on" data-f="todo">Todo</button><button type="button" data-f="suelos" style="--c:#22d3ee"><i></i>Suelos</button><button type="button" data-f="materiales" style="--c:#f59e0b"><i></i>Materiales</button><button type="button" data-f="normas" style="--c:#a78bfa"><i></i>Normas</button>');
            hero.appendChild(tool);
            hero.appendChild(el('div', 'gt-banner', '<span class="gt-ico">' + IC.bot + '</span><div><small>FUENTES AUTORIZADAS POR MATERIA</small><p>Cada bloque lista solo las referencias de esa asignatura. Así Civix y tus informes no mezclan Beer/Hibbeler con Das ni con las guías FLA-23.</p></div>'));
            var filtro = 'todo', inp = tool.querySelector('input'), vacio = el('div', 'gt-empty', 'No hay recursos que coincidan con la búsqueda.');
            if (cont) cont.appendChild(vacio);
            var aplicar = function () {
                var q = sinTildes(inp.value.trim()), vis = 0;
                bloques.forEach(function (b) {
                    var grp = b.__g, n = 0;
                    b.querySelectorAll('.libro-card').forEach(function (c) {
                        var okG = filtro === 'todo' || grp === filtro || (filtro === 'normas' && c.classList.contains('k-norma'));
                        var okQ = !q || sinTildes(c.textContent).indexOf(q) >= 0 || sinTildes(b.querySelector('h3').textContent).indexOf(q) >= 0;
                        c.classList.toggle('gt-hide', !(okG && okQ)); if (okG && okQ) n++;
                    });
                    b.classList.toggle('gt-hide', !n); vis += n;
                });
                vacio.classList.toggle('on', !vis);
            };
            tool.addEventListener('click', function (e) { var b = e.target.closest('button[data-f]'); if (!b) return; filtro = b.getAttribute('data-f'); tool.querySelectorAll('button').forEach(function (x) { x.classList.toggle('on', x === b); }); aplicar(); });
            inp.addEventListener('input', aplicar);
        }
        bloques.forEach(function (b) {
            var h = b.querySelector('h3'), tag = b.querySelector('.recurso-tag'), name = h ? h.textContent : '';
            var m = BLOQUES.filter(function (x) { return x[0].test(sinTildes(name)); })[0] || ['RECURSOS', '#22d3ee', IC.book];
            b.__g = GRUPO(name);
            var n = b.querySelectorAll('.libro-card').length;
            tarjeta(b, { eye: m[1], c: m[2], ico: m[3], right: esc(tag ? tag.textContent : '') + '<span>' + n + (n === 1 ? ' REFERENCIA' : ' REFERENCIAS') + '</span>' });
            var head = b.querySelector('.recurso-bloque-head'); if (head && !head.querySelector('h3')) head.remove();
            var hint = b.querySelector(':scope > .login-hint'); if (hint) hint.insertAdjacentHTML('afterbegin', IC.warn);
            b.querySelectorAll('.libro-card').forEach(function (c) {
                var badge = c.querySelector('.libro-badge'), bt = badge ? badge.textContent : '';
                if (/norma/i.test(bt) || /norma|nsr|aci|astm|ntc|inv/i.test((c.querySelector('h4') || {}).textContent || '')) c.classList.add('k-norma');
                if (badge) badge.textContent = bt.split('·')[0].trim();
                var open = el('button', 'gt-open', 'ABRIR <span aria-hidden="true">→</span>'); open.type = 'button';
                open.title = 'Estudiar este recurso con Civix';
                open.addEventListener('click', function () { estudiarConCivix(c, name); });
                c.appendChild(open);
            });
        });
        pie(M, 'BIBLIOTECA');
    }
    function estudiarConCivix(card, materia) {
        var t = (card.querySelector('h4') || {}).textContent || '', a = (card.querySelector('.libro-autor') || {}).textContent || '';
        var prompt = 'Quiero estudiar "' + t.trim() + '"' + (a ? ' (' + a.trim() + ')' : '') + ' para ' + String(materia).trim() + '. Dame un resumen de los temas principales del texto, las fórmulas clave y una guía de estudio paso a paso, citando solo esta fuente.';
        var btn = $('btnAsistenteAI');
        if (btn) btn.click();
        setTimeout(function () {
            var nav = doc.querySelector('#asistenteModal [data-civix-nav="chat"]'); if (nav) nav.click();
            var ta = $('inputAsistente'); if (!ta) return;
            ta.value = prompt; ta.dispatchEvent(new Event('input', { bubbles: true })); ta.focus();
        }, 350);
    }

    /* ================================================================== Resultados */
    function leerHist() { try { var k = window.historialStorageKey ? window.historialStorageKey() : null; return k ? JSON.parse(localStorage.getItem(k) || '[]') : []; } catch (e) { return []; } }
    function resultados() {
        var M = $('pantallaResultados'); if (!M || M.classList.contains('gt')) return;
        M.classList.add('gt'); barra(M);
        cabecera(M, { eye: '// HISTORIAL', title: 'Resultados <em>Guardados</em>', desc: 'Consulta tus ensayos y cálculos realizados.' });
        var cont = M.querySelector('.resultados-container'), box = $('historial-resultados'); if (!cont || !box) return;
        var top = el('div', 'gt-rtop'); cont.parentNode.insertBefore(top, cont);
        top.innerHTML = '<div class="gt-stats"></div><div class="gt-tool"><label class="gt-s">' + IC.search + '<input type="search" placeholder="buscar por ensayo, materia o fecha…" aria-label="Buscar en resultados"></label><button type="button" class="on" data-f="todo">Todos</button><button type="button" data-f="suelos" style="--c:#22d3ee"><i></i>Suelos</button><button type="button" data-f="materiales" style="--c:#f59e0b"><i></i>Materiales</button><button type="button" data-f="recientes">Recientes</button></div>';
        var empty = el('div', 'gt-card gt-emptybox', '<div class="gt-ill">' + ilustracion() + '</div><div><div class="gt-eye">// MIS RESULTADOS DE ENSAYOS</div><h3>Aún no hay ensayos guardados</h3><p>Cuando guardes un ensayo aparecerá aquí con su resultado, fecha y un informe en PDF listo para descargar.</p><div class="gt-steps"><div><small>01</small><b>Entra a Mecánica de Suelos I</b><p>Elige un ensayo, por ejemplo Contenido de Humedad.</p></div><div><small>02</small><b>Calcula el ensayo</b><p>Ingresa los datos de la muestra y presiona Calcular.</p></div><div><small>03</small><b>Pulsa Guardar datos</b><p>El resultado queda registrado en tu historial.</p></div></div><button type="button" class="gt-go">IR A MECÁNICA DE SUELOS I <span aria-hidden="true">→</span></button></div>');
        cont.appendChild(empty);
        empty.querySelector('.gt-go').addEventListener('click', function () { if (window.abrirSeccion) window.abrirSeccion('mecanica-suelos'); setTimeout(function () { var t = doc.querySelector('#pantallaSuelos .tab-btn[data-tab="ms1-ensayos"]'); if (t) t.click(); }, 120); });
        var filtro = 'todo', inp = top.querySelector('input');
        function aplicar() {
            var q = sinTildes(inp.value.trim()), cards = [].slice.call(box.querySelectorAll('.resultado-card'));
            cards.forEach(function (c, i) {
                var t = sinTildes(c.textContent), g = /resistencia|traccion|compresion|flexion|torsion|dureza|mezcla|concreto/.test(t) ? 'materiales' : 'suelos';
                var ok = (!q || t.indexOf(q) >= 0) && (filtro === 'todo' || filtro === g || (filtro === 'recientes' && i < 6));
                c.classList.toggle('gt-hide', !ok);
            });
            contarFilas(box);
        }
        top.addEventListener('click', function (e) { var b = e.target.closest('button[data-f]'); if (!b) return; filtro = b.getAttribute('data-f'); top.querySelectorAll('.gt-tool button').forEach(function (x) { x.classList.toggle('on', x === b); }); aplicar(); });
        inp.addEventListener('input', aplicar);
        function sync() {
            var h = leerHist(), mats = {}, pdf = 0;
            h.forEach(function (x) { var n = sinTildes(x.nombre || ''); mats[/resistencia|traccion|compresion|flexion|torsion|dureza/.test(n) ? 'rm' : /mezcla|concreto/.test(n) ? 'dm' : /corte|triaxial|consolid|inconfin/.test(n) ? 'ms2' : 'ms1'] = 1; if (x.detalle) pdf++; });
            var ult = h.length ? (h[h.length - 1].fecha || '').split(',')[0] : '—';
            var html = stat('#22d3ee', IC.layers, h.length, 'Ensayos guardados') + stat('#f59e0b', IC.pencil, Object.keys(mats).length, 'Materias con datos') + stat('#a78bfa', IC.clock, esc(ult || '—'), 'Último ensayo') + stat('#f472b6', IC.file, pdf, 'Informes PDF');
            var s = top.querySelector('.gt-stats'); if (s.__h !== html) { s.__h = html; s.innerHTML = html; }
            tabla(box, h);
            var vacio = !box.querySelector('.resultado-card');
            empty.style.display = vacio ? '' : 'none'; top.querySelector('.gt-tool').style.display = vacio ? 'none' : '';
            aplicar();
        }
        new MutationObserver(sync).observe(box, { childList: true, subtree: true });
        new MutationObserver(function () { if (M.style.display !== 'none') sync(); }).observe(M, { attributes: true, attributeFilter: ['style'] });
        sync();
        pie(M, 'HISTORIAL');
    }

    var TICO = { suelos: SV('<path d="M12 3 3 8l9 5 9-5-9-5z"/><path d="m3 12 9 5 9-5"/><path d="m3 16 9 5 9-5"/>'), rm: SV('<path d="M4 6h16M4 18h16M12 6v12"/>'), dm: SV('<path d="M9 3h6M10 3v6L5 19a1.5 1.5 0 0 0 1.3 2h11.4A1.5 1.5 0 0 0 19 19l-5-10V3"/>'), est: SV('<path d="M3 21h18M5 21V9l7-5 7 5v12M9 21v-6h6v6"/>') };
    function infoEnsayo(x) {
        var n = sinTildes(x.nombre || ''), tipo = x.detalle && x.detalle.tipo, G = window.GMEnsayosDiseno || {}, m = (G.meta && G.meta[tipo]) || (G.rm && G.rm[tipo]) || null;
        var g = /resistencia|traccion|compresion simple|flexion|torsion|dureza|^rm/.test(n) || (G.rm && G.rm[tipo]) ? 'rm' : /mezcla|concreto|^dm/.test(n) ? 'dm' : /estructura/.test(n) ? 'est' : /suelos ii|corte|triaxial|consolid|inconfin/.test(n) ? 'ms2' : 'ms1';
        var D = { ms1: ['Mecánica de Suelos I', 'MS-I', '#22d3ee', 'suelos'], ms2: ['Mecánica de Suelos II', 'MS-II', '#2dd4bf', 'suelos'], rm: ['Resistencia de Materiales', 'RM', '#f59e0b', 'rm'], dm: ['Diseño de Mezclas', 'DM', '#a78bfa', 'dm'], est: ['Estructuras I', 'EST-I', '#f472b6', 'est'] }[g];
        var norma = m && m.chips ? (m.chips.filter(function (c) { return /INV|NTC/.test(c); })[0] || m.chips[0]) : '';
        var nombre = String(x.nombre || 'Ensayo').replace(/^(Mecánica de Suelos I{1,2}|Resistencia de Materiales|Diseño de Mezclas|Estructuras I)\s*[—-]\s*/i, '').replace(/\s*\((Suelos I{1,2}|RM)\)\s*$/i, '');
        return { nombre: nombre, mat: D[0], code: D[1] + (norma ? ' · ' + norma : ''), c: D[2], ico: TICO[D[3]] };
    }
    function valorPrincipal(r) {
        var partes = String(r || '').split(/\s*[·\n]\s*/).filter(Boolean), p = partes[0] || '', m = p.match(/^\s*([^=]{0,14}?)\s*[=≈]\s*([-+]?\d[\d.,]*(?:e[-+]?\d+)?)\s*(.*)$/i);
        if (!m) return { big: p.slice(0, 18), unit: '', sym: '', rest: partes.slice(1).join(' · ') };
        return { sym: m[1], big: m[2], unit: m[3].slice(0, 10), rest: partes.slice(1).join(' · ') };
    }
    function tabla(box, hist) {
        var lista = box.querySelector('.resultados-lista'); if (!lista) return;
        var byId = {}; hist.forEach(function (x) { byId[x.id] = x; });
        var wrap = lista.closest('.gtr-wrap');
        if (!wrap) {
            wrap = el('div', 'gtr-wrap'); lista.parentNode.insertBefore(wrap, lista);
            wrap.appendChild(el('div', 'gtr-head', '<span>Ensayo</span><span>Materia</span><span>Fecha</span><span>Resultado</span><span>Estado</span><span>Acciones</span>'));
            wrap.appendChild(lista);
            var f = el('div', 'gtr-foot', '<span class="gtr-n"></span><button type="button">Exportar historial (CSV) →</button>'); wrap.appendChild(f);
            f.querySelector('button').addEventListener('click', exportarCSV);
        }
        lista.querySelectorAll('.resultado-card').forEach(function (c) {
            if (c.__gtr) return; c.__gtr = 1;
            var x = byId[c.getAttribute('data-res-id')] || { nombre: (c.querySelector('h4') || {}).textContent, resultado: (c.querySelector('.resultado-valor') || {}).textContent, fecha: (c.querySelector('time') || {}).textContent };
            var I = infoEnsayo(x), v = valorPrincipal(x.resultado), fe = String(x.fecha || '').split(/,\s*/);
            var rev = !x.resultado || /nan|infinity|undefined|error|revis/i.test(x.resultado);
            c.style.setProperty('--c', I.c);
            var acc = c.querySelector('.resultado-acciones');
            var cells = '<div class="gtr-ens"><i>' + I.ico + '</i><div><b title="' + esc(I.nombre) + '">' + esc(I.nombre) + '</b><small>' + esc(I.code) + '</small></div></div>' +
                '<div class="gtr-mat">' + esc(I.mat) + '</div><div class="gtr-fec">' + esc(fe[0] || '—') + (fe[1] ? '<small>' + esc(fe[1]) + '</small>' : '') + '</div>' +
                '<div class="gtr-res"><b>' + esc(v.big) + '</b>' + (v.unit ? '<em>' + esc(v.unit) + '</em>' : '') + '<small title="' + esc(x.resultado || '') + '">' + esc(v.sym ? v.sym + (v.rest ? ' · ' + v.rest : '') : v.rest) + '</small></div>' +
                '<span class="gtr-est' + (rev ? ' rev' : '') + '">' + (rev ? 'Revisar' : 'Calculado') + '</span>';
            if (acc) acc.insertAdjacentHTML('beforebegin', cells); else c.insertAdjacentHTML('beforeend', cells);
            if (acc) {
                var ver = el('button', 'gtr-ver', SV('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>') + 'Ver'); ver.type = 'button';
                ver.addEventListener('click', function (e) { e.stopPropagation(); var msg = I.nombre + '\n' + I.mat + ' · ' + (x.fecha || '') + '\n\n' + String(x.resultado || '').split(/\s*·\s*/).join('\n'); if (window.gmAlert) window.gmAlert(msg, { titulo: 'Resultado del ensayo' }); else alert(msg); });
                acc.insertBefore(ver, acc.firstChild);
                var pdf = acc.querySelector('.btn-ver-resultado'); if (pdf) { pdf.innerHTML = 'PDF ' + SV('<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>'); pdf.title = 'Descargar informe en PDF'; }
                var del = acc.querySelector('.btn-del-resultado'); if (del) { del.innerHTML = SV('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'); del.title = 'Eliminar resultado'; del.setAttribute('aria-label', 'Eliminar resultado'); }
            }
        });
        contarFilas(box);
    }
    function contarFilas(box) {
        var n = box.querySelector('.gtr-n'); if (!n) return;
        var vis = box.querySelectorAll('.resultado-card:not(.gt-hide)').length, tot = box.querySelectorAll('.resultado-card').length;
        var t = 'Mostrando ' + vis + (vis === tot ? '' : ' de ' + tot) + (tot === 1 ? ' ensayo' : ' ensayos') + ' · ordenados por fecha'; if (n.textContent !== t) n.textContent = t;
    }
    function exportarCSV() {
        var h = leerHist(); if (!h.length) return;
        var q = function (s) { return '"' + String(s == null ? '' : s).replace(/"/g, '""') + '"'; };
        var rows = [['Ensayo', 'Materia', 'Código', 'Fecha', 'Resultado'].map(q).join(';')];
        h.slice().reverse().forEach(function (x) { var I = infoEnsayo(x); rows.push([I.nombre, I.mat, I.code, x.fecha, x.resultado].map(q).join(';')); });
        var blob = new Blob(['﻿' + rows.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = doc.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'GeoMetrics_historial_' + new Date().toISOString().slice(0, 10) + '.csv';
        doc.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    function ilustracion() {
        return '<svg viewBox="0 0 400 400" width="100%" height="100%" aria-hidden="true"><circle cx="200" cy="200" r="190" fill="none" stroke="rgba(34,211,238,.18)"/><circle cx="200" cy="200" r="160" fill="none" stroke="rgba(148,163,184,.25)" stroke-dasharray="1 6"/>' +
            '<path d="M 330 90 A 190 190 0 0 1 380 190" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/><path d="M 60 290 A 190 190 0 0 0 85 335" fill="none" stroke="#a78bfa" stroke-width="3" stroke-linecap="round"/>' +
            '<path d="M200 0v14M200 386v14M0 200h14M386 200h14" stroke="rgba(34,211,238,.6)" stroke-width="2"/>' +
            '<rect x="128" y="110" width="144" height="190" fill="#06101c" stroke="#22d3ee" stroke-width="3"/><rect x="168" y="94" width="64" height="30" fill="#04070d" stroke="#22d3ee" stroke-width="3"/>' +
            '<path d="M150 160h100M150 190h100M150 220h70M150 250h40" stroke="rgba(148,163,184,.55)" stroke-width="3" stroke-dasharray="6 6"/>' +
            '<rect x="100" y="205" width="200" height="40" fill="url(#gtScan)"/><path d="M100 205h200" stroke="#22d3ee" stroke-width="2"/>' +
            '<circle cx="262" cy="282" r="30" fill="#04070d" stroke="#f472b6" stroke-width="3"/><path d="M262 268v28M248 282h28" stroke="#f472b6" stroke-width="3" stroke-linecap="round"/>' +
            '<defs><linearGradient id="gtScan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".35"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs></svg>';
    }


    /* ================================================================== iconos de línea en menús laterales */
    var LI = [
        [/dashboard|inicio|^aula$/, SV('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>')],
        [/tarea/, SV('<rect x="4" y="4" width="16" height="16" rx="1"/><path d="m8 12 3 3 5-6"/>')],
        [/entrega/, SV('<path d="M3 13h5l2 3h4l2-3h5"/><path d="M5 5h14l2 8v6H3v-6z"/>')],
        [/estudiante/, SV('<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.7-3.5 3.3-5.5 6.5-5.5s5.8 2 6.5 5.5"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5c2 .6 3.2 2.4 3.5 5.5"/>')],
        [/curso|clases/, SV('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3V4z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>')],
        [/mensaje|chat|foro/, SV('<path d="M4 5h16v11H9l-5 4z"/>')],
        [/material|recurso/, SV('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h6"/>')],
        [/analisis|nota/, SV('<path d="M4 4v16h16"/><path d="m7 15 4-5 3 3 5-6"/>')],
        [/perfil/, SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>')],
        [/calend/, SV('<rect x="3" y="5" width="18" height="16" rx="1"/><path d="M3 10h18M8 3v4M16 3v4"/>')],
        [/conversacion/, SV('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>')],
        [/nueva/, SV('<path d="M12 5v14M5 12h14"/>')],
        [/herramienta/, SV('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>')],
        [/plano|cad/, SV('<path d="M4 20V4l16 16z"/><path d="M8 16h4v-4"/>')],
        [/cerrar sesi/, SV('<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>')]
    ];
    function iconoDe(t) { t = sinTildes(t); for (var i = 0; i < LI.length; i++) if (LI[i][0].test(t)) return LI[i][1]; return null; }
    function lineIcons() {
        var sets = [['#pantallaDocente .dp-side button, #pantallaDocente .dp-side a', '.dp-ico'], ['#pantallaEstudiante .av-nav button, #pantallaEstudiante .av-nav a', '.av-ico'], ['#asistenteModal .civix-nav-item', '.civix-nav-ico']];
        sets.forEach(function (st) {
            doc.querySelectorAll(st[0]).forEach(function (b) {
                var ic = b.querySelector(st[1]); if (!ic || ic.__gt) return;
                var txt = (b.textContent || '').replace(ic.textContent || '', '').trim(), svg = iconoDe(txt); if (!svg) return;
                ic.__gt = true; ic.classList.add('gt-lico'); ic.innerHTML = svg;
            });
        });
    }

    /* ================================================================== montaje */
    function montar() { try { lineIcons(); } catch (e) { warn(e); } try { admin(); } catch (e) { warn(e); } try { recursos(); } catch (e) { warn(e); } try { resultados(); } catch (e) { warn(e); } }
    function warn(e) { if (window.console) console.warn('[gm-tema]', e); }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', montar); else montar();
    var lp = false; new MutationObserver(function () { if (lp) return; lp = true; setTimeout(function () { lp = false; try { lineIcons(); } catch (e) { } }, 200); }).observe(doc.body, { childList: true, subtree: true });
    window.GMTema = { montar: montar };
})();
