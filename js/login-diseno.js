/* GeoMetrics — nuevo diseño de la pantalla de acceso (iniciar sesión / registrarse).
 * Solo reorganiza y da estilo: los formularios, sus id, las pestañas originales y toda la lógica de aula.js
 * (login, registro de estudiante y docente, recuperación de contraseña) siguen funcionando igual. */
(function () {
    'use strict';
    var doc = document;
    function $(id) { return doc.getElementById(id); }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    var MONO = '"JetBrains Mono","IBM Plex Mono",ui-monospace,SFMono-Regular,Consolas,monospace';
    var SV = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
    var IC = {
        mail: SV('<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>'),
        user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>'),
        lock: SV('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>'),
        card: SV('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h4M7 14h6M15 10h2"/>'),
        gen: SV('<circle cx="12" cy="9" r="5"/><path d="M12 14v7M9 18h6"/>'),
        code: SV('<path d="M4 7V4h16v3M9 20h6M12 4v16"/>'),
        login: SV('<path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/>'),
        reg: SV('<circle cx="9" cy="8" r="4"/><path d="M2 21c.8-3.8 3.6-6 7-6s6.2 2.2 7 6"/><path d="M19 8v6M16 11h6"/>'),
        cap: SV('<path d="M2 10 12 5l10 5-10 5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'),
        board: SV('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M8 20h8M12 16v4"/>'),
        shield: SV('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>')
    };

    var R = '#pantallaInicio.glx';
    var css = el('style'); css.id = 'glx-css';
    css.textContent = [
        R + '{--cy:#22d3ee;--ln:#172235;--mu:#8b9ab0;position:relative;display:block;min-height:100vh;box-sizing:border-box;padding:0 clamp(16px,3.4vw,70px)!important;color:#e6edf6;background:radial-gradient(900px 600px at 72% 45%,rgba(34,211,238,.08),transparent 60%),radial-gradient(800px 600px at 0% 100%,rgba(124,58,237,.12),transparent 60%),linear-gradient(#04070d,#03060b)!important;overflow:hidden}',
        R + ':before{content:"";position:absolute;inset:0;pointer-events:none;background:radial-gradient(rgba(148,163,184,.12) 1px,transparent 1.2px) 0 0/26px 26px;opacity:.55;z-index:0}',
        R + ' > *{position:relative;z-index:1}',
        R + ' > .inicio-topbar,' + R + ' > .inicio-footer,' + R + ' .login-tabs,' + R + ' .glx-hidden{display:none!important}',
        /* barra */
        R + ' .glx-nav{display:flex;align-items:center;gap:22px;padding:30px 0 24px;border-bottom:1px solid var(--ln)}',
        R + ' .glx-nav img{width:62px!important;height:62px!important;object-fit:contain;background:#fff;border-radius:11px;padding:6px;box-sizing:border-box;margin:0!important;box-shadow:0 0 0 1px rgba(255,255,255,.1)!important}',
        R + ' .glx-brand{padding-left:24px;border-left:1px solid var(--ln)}',
        R + ' .glx-brand b{display:block;font:700 22px/1 ' + MONO + ';letter-spacing:.34em;color:#fff}' + R + ' .glx-brand b i{font-style:normal;color:var(--cy)}',
        R + ' .glx-brand span{display:block;margin-top:9px;font:500 12px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6}',
        R + ' .glx-st{margin-left:auto;display:flex;gap:34px;font:500 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6}' + R + ' .glx-st span:first-child:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--cy);box-shadow:0 0 10px var(--cy);margin-right:10px;vertical-align:1px}',
        /* contenido */
        R + ' .inicio-hero{display:grid!important;grid-template-columns:minmax(0,820px) minmax(0,1fr)!important;gap:clamp(30px,4vw,80px)!important;align-items:center!important;max-width:none!important;margin:0!important;padding:42px 0 40px!important;min-height:0!important;background:none!important}',
        R + ' .hero-text{max-width:none!important;width:100%!important;text-align:left!important;padding:0!important;margin:0!important}',
        R + ' .hero-etiqueta{display:inline-flex!important;align-items:center;gap:12px;margin:0!important;padding:11px 18px!important;border:1px solid var(--ln);background:rgba(8,18,32,.75)!important;font:600 13px/1 ' + MONO + '!important;letter-spacing:.3em!important;color:var(--cy)!important;border-radius:0!important}',
        R + ' .hero-etiqueta:before{content:"";width:7px;height:7px;border-radius:50%;background:var(--cy);box-shadow:0 0 10px var(--cy)}',
        R + ' .inicio-titulo{margin:24px 0 0!important;font-family:Inter,"Segoe UI",system-ui,sans-serif!important;font-weight:900!important;font-size:clamp(44px,5.6vw,96px)!important;line-height:1!important;letter-spacing:-.05em!important;color:#eef4ff!important;text-align:left!important;background:none!important;-webkit-text-fill-color:currentColor!important;text-shadow:none!important}',
        R + ' .inicio-titulo .geo{color:#eef4ff!important;-webkit-text-fill-color:#eef4ff!important;background:none!important}',
        R + ' .inicio-titulo .metrics{color:var(--cy)!important;-webkit-text-fill-color:var(--cy)!important;background:none!important;text-shadow:0 0 40px rgba(34,211,238,.35)!important}',
        R + ' .inicio-subtitulo{margin:14px 0 0!important;font-size:clamp(16px,1.25vw,21px)!important;color:#c3cede!important;text-align:left!important;letter-spacing:0!important}',
        /* caja */
        R + ' .login-box{position:relative;max-width:none!important;width:100%!important;margin:36px 0 0!important;padding:0!important;border:0!important;border-radius:0!important;background:linear-gradient(170deg,rgba(14,22,38,.95),rgba(8,13,24,.96))!important;box-shadow:inset 0 0 0 1px rgba(34,211,238,.22)!important;clip-path:polygon(0 0,calc(100% - 32px) 0,100% 32px,100% 100%,32px 100%,0 calc(100% - 32px));backdrop-filter:none!important}',
        R + ' .login-box:before{content:"";position:absolute;left:0;top:0;right:32px;height:3px;background:linear-gradient(90deg,var(--cy),rgba(34,211,238,.2));z-index:2}',
        R + ' .glx-tabs{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid var(--ln)}',
        R + ' .glx-tabs button{display:flex!important;align-items:center;justify-content:center;gap:12px;background:transparent!important;border:0!important;box-shadow:none!important;border-radius:0!important;color:#9fb0c6!important;font:600 15px/1 ' + MONO + '!important;letter-spacing:.26em;padding:30px 10px!important;cursor:pointer;position:relative;margin:0!important;width:auto!important;min-height:0!important;text-transform:uppercase}',
        R + ' .glx-tabs button svg{width:19px;height:19px}',
        R + ' .glx-tabs button.on{color:#fff!important;background:linear-gradient(180deg,rgba(34,211,238,.10),rgba(34,211,238,.03))!important}',
        R + ' .glx-tabs button.on:after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:3px;background:var(--cy);box-shadow:0 0 14px var(--cy)}',
        R + ' .glx-body{padding:30px 38px 26px}',
        R + ' .glx-role{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:6px;margin:0 0 26px;border:1px solid var(--ln);background:#060a12}',
        R + ' .glx-role button{display:flex!important;align-items:center;justify-content:center;gap:10px;background:transparent!important;border:1px solid transparent!important;box-shadow:none!important;border-radius:0!important;color:#9fb0c6!important;font:600 14px/1 ' + MONO + '!important;letter-spacing:.22em;padding:18px 10px!important;cursor:pointer;margin:0!important;width:auto!important;min-height:0!important}',
        R + ' .glx-role button svg{width:18px;height:18px}',
        R + ' .glx-role button.on{color:var(--cy)!important;background:rgba(34,211,238,.12)!important;border-color:rgba(34,211,238,.55)!important}',
        R + ' .login-form{padding:0!important;margin:0!important;background:none!important;border:0!important;box-shadow:none!important}',
        R + ' .glx-grid{display:grid;grid-template-columns:1fr 1fr;gap:0 18px}',
        R + ' .glx-f{grid-column:1/-1;margin:0 0 22px}' + R + ' .glx-f.h{grid-column:auto}',
        R + ' .glx-f > label,' + R + ' .login-form > label{display:block!important;margin:0 0 11px!important;font:500 13px/1 ' + MONO + '!important;letter-spacing:.24em!important;text-transform:uppercase!important;color:#9fb0c6!important}',
        R + ' .glx-in{position:relative}',
        R + ' .glx-in > svg{position:absolute;left:20px;top:50%;width:20px;height:20px;transform:translateY(-50%);color:#9fb0c6;pointer-events:none;z-index:1}',
        R + ' .glx-in input,' + R + ' .glx-in select,' + R + ' .login-form input[type=email],' + R + ' .login-form input[type=text]:not(.reg-grupo-input):not(.doc-grupo-input),' + R + ' .login-form input[type=password]{width:100%!important;box-sizing:border-box!important;height:auto!important;margin:0!important;padding:21px 20px 21px 56px!important;border-radius:0!important;border:1px solid #1f2b40!important;background:#05080f!important;color:#f1f5f9!important;font:500 17px/1.2 ' + MONO + '!important;box-shadow:none!important;transition:border-color .2s,box-shadow .2s;appearance:none;-webkit-appearance:none}',
        R + ' .glx-in select{padding-right:44px!important;background-image:url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9fb0c6" stroke-width="2.4" stroke-linecap="round"><path d="m6 9 6 6 6-6"/></svg>') + '")!important;background-repeat:no-repeat!important;background-position:right 18px center!important;cursor:pointer}',
        R + ' .glx-in input:focus,' + R + ' .glx-in select:focus{outline:none!important;border-color:var(--cy)!important;box-shadow:0 0 0 1px var(--cy),0 0 22px rgba(34,211,238,.18)!important}',
        R + ' .glx-in input::placeholder{color:#6b7a90!important}',
        R + ' .password-wrap{position:relative;display:block!important}',
        R + ' .password-wrap input{padding-right:72px!important}',
        R + ' .btn-toggle-pass{position:absolute!important;right:12px!important;top:50%!important;transform:translateY(-50%)!important;width:46px!important;height:46px!important;display:flex!important;align-items:center;justify-content:center;background:#0b1626!important;border:1px solid #1f2b40!important;border-radius:0!important;font-size:20px!important;padding:0!important;margin:0!important;cursor:pointer;box-shadow:none!important}',
        R + ' .btn-toggle-pass:hover{border-color:var(--cy)!important}',
        /* identidad */
        R + ' #loginIdentidad,' + R + ' #loginIdentidad[hidden]{display:flex!important;align-items:center;gap:18px;margin:16px 0 26px!important;padding:16px 18px!important;border:1px dashed rgba(34,211,238,.32)!important;border-radius:0!important;background:rgba(8,30,44,.35)!important}',
        R + ' #loginIdentidad .login-avatar{flex:0 0 auto;width:50px!important;height:50px!important;border-radius:0!important;display:flex;align-items:center;justify-content:center;background:rgba(34,211,238,.08)!important;border:1px solid rgba(34,211,238,.55)!important;color:var(--cy)!important;font:700 17px/1 ' + MONO + '!important;clip-path:polygon(0 0,100% 0,100% calc(100% - 8px),calc(100% - 8px) 100%,0 100%)}',
        R + ' #loginIdentidad strong{display:block;font-size:17px;color:#fff;font-weight:600}',
        R + ' #loginIdentidad p{margin:6px 0 0!important;font:500 12.5px/1.3 ' + MONO + '!important;letter-spacing:.14em;text-transform:uppercase;color:#9fb0c6!important}',
        R + ' #loginIdentidad[hidden] > :not(.glx-wait),' + R + ' #loginIdentidad:not([hidden]) > .glx-wait{display:none!important}',
        R + ' .glx-wait{display:flex;align-items:center;gap:18px}',
        /* botones */
        R + ' .btn-login{display:flex!important;align-items:center;justify-content:center;gap:14px;width:100%!important;margin:6px 0 0!important;padding:26px 20px!important;border:0!important;border-radius:0!important;background:var(--cy)!important;color:#03202a!important;font:800 17px/1 ' + MONO + '!important;letter-spacing:.32em!important;box-shadow:0 0 30px rgba(34,211,238,.25)!important;cursor:pointer;clip-path:polygon(14px 0,100% 0,100% calc(100% - 14px),calc(100% - 14px) 100%,0 100%,0 14px);transition:filter .2s}',
        R + ' .btn-login:after{content:"→";font-size:20px;letter-spacing:0}',
        R + ' .btn-login:hover{filter:brightness(1.08)}',
        R + ' .glx-links{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:22px 0 0;font-size:15px;color:#aebbd0}',
        R + ' .glx-links button,' + R + ' .btn-link-recupero{background:none!important;border:0!important;box-shadow:none!important;padding:0!important;margin:0!important;color:var(--cy)!important;font:inherit!important;font-size:15px!important;cursor:pointer;text-decoration:none!important;width:auto!important;min-height:0!important}',
        R + ' .glx-links button:hover,' + R + ' .btn-link-recupero:hover{text-decoration:underline!important}',
        R + ' .glx-links.c{justify-content:center}',
        R + ' .glx-foot{display:flex;align-items:center;gap:14px;margin:26px 0 0;padding-top:24px;border-top:1px solid var(--ln);font:500 13.5px/1.5 ' + MONO + ';color:#aebbd0}',
        R + ' .glx-foot svg{flex:0 0 auto;width:20px;height:20px;color:var(--cy)}' + R + ' .glx-foot code{background:none;padding:0;color:var(--cy);font:inherit}',
        R + ' .login-error{margin:14px 0 0!important;color:#fca5a5!important;font-size:14.5px!important}' + R + ' .login-error:empty{display:none}',
        R + ' .login-ok{color:#6ee7b7!important}',
        R + ' .login-form .login-hint{margin:0 0 18px!important;font-size:13.5px!important;line-height:1.5!important;color:#8b9ab0!important}',
        R + ' .login-form .login-hint code{color:var(--cy);background:none}',
        R + ' #formRecupero .recupero-titulo{margin:16px 0 14px!important;font-size:22px!important;color:#fff!important}',
        /* materias */
        R + ' .reg-materias{display:grid!important;grid-template-columns:1fr 1fr;gap:10px!important;margin:0!important;padding:0!important;background:none!important;border:0!important}',
        R + ' .reg-mat-item{display:flex!important;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 14px!important;margin:0!important;border:1px solid #1f2b40!important;border-radius:0!important;background:#05080f!important;color:#dbe4ef!important;font-size:14px!important;letter-spacing:0!important;text-transform:none!important;cursor:pointer}',
        R + ' .reg-mat-item:has(input:checked){border-color:rgba(34,211,238,.6)!important;background:rgba(34,211,238,.08)!important}',
        R + ' .reg-mat-item input[type=checkbox],' + R + ' .glx-terms input{accent-color:#22d3ee;width:18px;height:18px;margin:0}',
        R + ' .reg-mat-item input[type=text]{flex:1 0 100%;width:100%!important;box-sizing:border-box;margin:4px 0 0!important;padding:10px 12px!important;border-radius:0!important;border:1px solid #1f2b40!important;background:#03060b!important;color:#f1f5f9!important;font:500 14px/1 ' + MONO + '!important}',
        R + ' .reg-mat-item input[type=text]:disabled{display:none}',
        /* seguridad + términos */
        R + ' .glx-meter{grid-column:1/-1;margin:-8px 0 22px}',
        R + ' .glx-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}' + R + ' .glx-bars i{height:5px;background:#1c2638;transition:background .25s}',
        R + ' .glx-meter[data-n="1"] i:nth-child(-n+1){background:#f87171}' + R + ' .glx-meter[data-n="2"] i:nth-child(-n+2){background:#fbbf24}' + R + ' .glx-meter[data-n="3"] i:nth-child(-n+3){background:var(--cy)}' + R + ' .glx-meter[data-n="4"] i{background:#34d399}',
        R + ' .glx-meter p{margin:10px 0 0!important;font:500 12.5px/1.4 ' + MONO + ';letter-spacing:.16em;text-transform:uppercase;color:#8b9ab0}' + R + ' .glx-meter p b{color:var(--cy);font-weight:700}',
        R + ' .glx-terms{display:flex!important;align-items:center;gap:14px;margin:0 0 22px!important;font-size:15.5px!important;color:#dbe4ef!important;text-transform:none!important;letter-spacing:0!important;cursor:pointer}',
        R + ' .glx-terms a{color:var(--cy);text-decoration:none;cursor:pointer}' + R + ' .glx-terms a:hover{text-decoration:underline}',
        /* visual derecho */
        R + ' .hero-logo{position:relative!important;display:block!important;width:100%!important;max-width:none!important;aspect-ratio:1.05;margin:0!important;padding:0!important;background:none!important}',
        R + ' .glx-corner{position:absolute;width:30px;height:30px;border:2px solid var(--cy)}',
        R + ' .glx-corner.a{left:0;top:0;border-right:0;border-bottom:0}' + R + ' .glx-corner.b{right:0;top:0;border-left:0;border-bottom:0}' + R + ' .glx-corner.c{left:0;bottom:0;border-right:0;border-top:0}' + R + ' .glx-corner.d{right:0;bottom:0;border-left:0;border-top:0}',
        R + ' .glx-vh,' + R + ' .glx-vf{position:absolute;left:40px;right:40px;display:flex;justify-content:space-between;font:500 13px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6}',
        R + ' .glx-vh{top:36px}' + R + ' .glx-vf{bottom:36px}' + R + ' .glx-vf b{color:var(--cy);font-weight:600}' + R + ' .glx-vf b:before{content:"● "}',
        R + ' .glx-orb{position:absolute;left:50%;top:50%;width:78%;aspect-ratio:1;transform:translate(-50%,-50%)}',
        R + ' .glx-orb svg.rings{position:absolute;inset:0;width:100%;height:100%;overflow:visible}',
        R + ' .glx-spin{transform-origin:50% 50%;animation:glxSpin 18s linear infinite}' + R + ' .glx-spin2{transform-origin:50% 50%;animation:glxSpin 26s linear infinite reverse}',
        '@keyframes glxSpin{to{transform:rotate(360deg)}}',
        R + ' .glx-disc{position:absolute;left:50%;top:50%;width:64%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 50% 40%,#1b2f4d,#0a1424 70%);box-shadow:0 0 0 3px rgba(34,211,238,.85),0 0 0 9px rgba(34,211,238,.10),0 0 60px rgba(34,211,238,.45),inset 0 0 40px rgba(0,0,0,.6);overflow:hidden}',
        R + ' .glx-disc img{position:absolute!important;left:50%!important;top:50%!important;width:112%!important;height:112%!important;max-width:none!important;transform:translate(-50%,-50%)!important;margin:0!important;filter:drop-shadow(0 6px 20px rgba(0,0,0,.4))!important;animation:none!important;object-fit:contain}',
        R + ' .glx-mod{position:absolute;padding:12px 18px 14px;background:rgba(6,11,20,.9);border:1px solid var(--c);clip-path:polygon(0 0,100% 0,100% calc(100% - 10px),calc(100% - 10px) 100%,0 100%);animation:glxFloat 6s ease-in-out infinite}',
        R + ' .glx-mod small{display:block;font:500 12px/1 ' + MONO + ';letter-spacing:.2em;color:#9fb0c6}' + R + ' .glx-mod b{display:block;margin-top:8px;font:700 18px/1 ' + MONO + ';color:#fff;letter-spacing:.04em}',
        R + ' .glx-mod.m1{--c:rgba(34,211,238,.5);left:6%;top:24%}' + R + ' .glx-mod.m2{--c:rgba(245,158,11,.55);right:4%;top:30%;animation-delay:-1.5s}' + R + ' .glx-mod.m3{--c:rgba(167,139,250,.6);left:8%;bottom:22%;animation-delay:-3s}' + R + ' .glx-mod.m4{--c:rgba(244,114,182,.6);right:6%;bottom:14%;animation-delay:-4.5s}',
        '@keyframes glxFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}',
        R + ' .glx-footer{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;padding:26px 0 28px;border-top:1px solid var(--ln);font:500 12.5px/1.4 ' + MONO + ';letter-spacing:.24em;color:#64748b}',
        R + ' > .glx-nav,' + R + ' > .glx-footer{max-width:none!important;width:100%!important;margin:0!important;box-sizing:border-box}',
        R + ' .glx-role button{text-transform:uppercase!important}',
        R + ' .login-form > label.glx-terms{display:flex!important;font:400 15.5px/1.4 Inter,"Segoe UI",system-ui,sans-serif!important;letter-spacing:0!important;text-transform:none!important;color:#dbe4ef!important;margin:4px 0 22px!important}',
        R + ' .glx-grid > .login-hint{grid-column:1/-1;margin-top:-8px!important}',
        R + ' .glx-vh,' + R + ' .glx-vf{flex-wrap:wrap;gap:8px 20px}',
        R + ' .hero-text{display:block!important}',
        R + ' .hero-text > *{margin-left:0!important;margin-right:0!important}',
        R + ' .inicio-titulo,' + R + ' .inicio-subtitulo{text-align:left!important}',
        '@media (prefers-reduced-motion:reduce){' + R + ' .glx-spin,' + R + ' .glx-spin2,' + R + ' .glx-mod{animation:none}}',
        '@media (min-width:1100px) and (min-height:620px){' + R + ':not([style*="none"]){display:flex!important;flex-direction:column;height:100vh;min-height:0!important}' + R + ' .glx-nav{flex:0 0 auto;padding:1.6vh 0 1.4vh}' + R + ' .glx-nav img{width:clamp(38px,5.4vh,58px)!important;height:clamp(38px,5.4vh,58px)!important}' + R + ' .glx-brand b{font-size:clamp(15px,2vh,21px)}' + R + ' .glx-brand span{margin-top:.8vh;font-size:clamp(10px,1.2vh,12px)}' + R + ' .inicio-hero{flex:1 1 auto;min-height:0!important;padding:1.8vh 0 1.2vh!important;align-items:stretch!important}' + R + ' .hero-text{display:flex!important;flex-direction:column;min-height:0;height:100%}' + R + ' .hero-etiqueta{align-self:flex-start;padding:.9vh 16px!important;font-size:clamp(10px,1.3vh,13px)!important}' + R + ' .inicio-titulo{margin-top:1.4vh!important;font-size:clamp(34px,min(7.4vh,5.4vw),92px)!important}' + R + ' .inicio-subtitulo{margin-top:.8vh!important;font-size:clamp(13px,1.8vh,20px)!important}' + R + ' .login-box{flex:0 1 auto;min-height:0;display:flex;flex-direction:column;margin-top:2vh!important;max-height:100%}' + R + ' .glx-tabs{flex:0 0 auto}' + R + ' .glx-tabs button{padding:2.1vh 10px!important;font-size:clamp(12px,1.5vh,15px)!important}' + R + ' .glx-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:2.2vh 34px 1.8vh;scrollbar-width:thin;scrollbar-color:#24324a transparent}' + R + ' .glx-role{margin-bottom:1.8vh}' + R + ' .glx-role button{padding:1.3vh 10px!important}' + R + ' .glx-f{margin-bottom:1.7vh}' + R + ' .glx-f > label{margin-bottom:.9vh!important;font-size:clamp(10.5px,1.25vh,13px)!important}' + R + ' .glx-in input,'+R+' .glx-in select,'+R+' .login-form input[type=email],'+R+' .login-form input[type=text]:not(.reg-grupo-input):not(.doc-grupo-input),'+R+' .login-form input[type=password]{padding-top:1.6vh!important;padding-bottom:1.6vh!important;font-size:clamp(13px,1.65vh,17px)!important}' + R + ' #loginIdentidad,'+R+' #loginIdentidad[hidden]{margin:1vh 0 1.8vh!important;padding:1.1vh 16px!important}' + R + ' #loginIdentidad .login-avatar{width:clamp(34px,4.6vh,50px)!important;height:clamp(34px,4.6vh,50px)!important}' + R + ' #loginIdentidad strong{font-size:clamp(14px,1.75vh,17px)}' + R + ' .btn-toggle-pass{width:clamp(34px,4.4vh,46px)!important;height:clamp(34px,4.4vh,46px)!important}' + R + ' .btn-login{padding:2vh 20px!important;font-size:clamp(13px,1.7vh,17px)!important}' + R + ' .glx-links{margin-top:1.6vh;font-size:clamp(13px,1.6vh,15px)}' + R + ' .glx-foot{margin-top:1.8vh;padding-top:1.6vh;font-size:clamp(11px,1.35vh,13.5px)}' + R + ' .hero-logo{aspect-ratio:auto!important;height:100%!important;min-height:0}' + R + ' .glx-orb{width:auto;height:78%;max-width:82%}' + R + ' .glx-vh{top:3vh}' + R + ' .glx-vf{bottom:3vh}' + R + ' .glx-footer{flex:0 0 auto;padding:1.2vh 0 1.4vh}' + '}',
        '@media (min-width:1100px) and (max-height:760px){' + R + ' .hero-etiqueta{display:none!important}' + R + ' .glx-foot{display:none}' + R + ' .glx-footer{display:none}}',
        '@media (max-width:1100px){' + R + ' .inicio-hero{grid-template-columns:1fr!important}' + R + ' .hero-logo{max-width:640px;margin:0 auto!important;width:100%!important}' + R + ' .glx-st{display:none}}',
        '@media (max-width:640px){' + R + ' .glx-brand span{display:none}' + R + ' .glx-brand b{font-size:16px;letter-spacing:.22em}' + R + ' .glx-nav img{width:46px!important;height:46px!important}' + R + ' .glx-body{padding:22px 18px 20px}' + R + ' .glx-grid{grid-template-columns:1fr}' + R + ' .glx-tabs button{font-size:12px!important;letter-spacing:.14em;padding:22px 6px!important}' + R + ' .glx-role button{font-size:12px!important;letter-spacing:.12em}' + R + ' .reg-materias{grid-template-columns:1fr}' + R + ' .btn-login{font-size:15px!important;letter-spacing:.2em!important}' + R + ' .glx-mod{padding:8px 10px}' + R + ' .glx-mod b{font-size:13px}' + R + ' .glx-mod small{font-size:9px}' + R + ' .glx-vh,' + R + ' .glx-vf{left:16px;right:16px;font-size:9.5px;letter-spacing:.12em}' + R + ' .glx-footer{font-size:10.5px;letter-spacing:.14em}}'
    ].join('\n');
    doc.head.appendChild(css);

    /* ------------------------------------------------------------------ campos */
    var HALF = { regNombres: 1, regApellidos: 1, regCodigo: 1, regGenero: 1, regPass: 1, regPass2: 1, docNombres: 1, docApellidos: 1, docPass: 1, docPass2: 1 };
    var RENAME = { regPass: 'Contraseña', regPass2: 'Confirmar', docPass: 'Contraseña', docPass2: 'Confirmar', recPass: 'Nueva contraseña', recPass2: 'Confirmar' };
    function icono(ctrl) {
        if (!ctrl) return '';
        var id = ctrl.id || '';
        if (ctrl.type === 'email') return IC.mail;
        if (ctrl.type === 'password') return IC.lock;
        if (/Codigo/i.test(id) && ctrl.tagName === 'INPUT') return /rec/.test(id) ? IC.code : IC.card;
        if (/Genero/.test(id)) return IC.gen;
        if (ctrl.tagName === 'INPUT') return IC.user;
        return '';
    }
    function envolver(form) {
        var map = {};
        [].slice.call(form.querySelectorAll('label')).forEach(function (lb) {
            if (lb.closest('.reg-materias') || lb.closest('.glx-f')) return;
            var nx = lb.nextElementSibling; if (!nx) return;
            var ctrl = null, box = nx;
            if (/^(INPUT|SELECT)$/.test(nx.tagName)) ctrl = nx;
            else if (nx.classList.contains('password-wrap')) ctrl = nx.querySelector('input');
            else if (nx.classList.contains('reg-materias')) ctrl = null;
            else return;
            var key = ctrl ? ctrl.id : nx.id;
            var f = el('div', 'glx-f' + (HALF[key] ? ' h' : ''));
            lb.parentNode.insertBefore(f, lb);
            if (RENAME[key]) lb.textContent = RENAME[key];
            if (ctrl && ctrl.id) lb.htmlFor = ctrl.id;
            f.appendChild(lb);
            if (nx.classList.contains('reg-materias')) { f.appendChild(nx); }
            else { var w = el('div', 'glx-in', icono(ctrl)); w.appendChild(box); f.appendChild(w); }
            map[key] = f;
        });
        return map;
    }
    function rejilla(form, map, orden, before) {
        var g = el('div', 'glx-grid');
        form.insertBefore(g, before || form.firstChild);
        orden.forEach(function (k) { if (map[k]) g.appendChild(map[k]); });
        return g;
    }
    function medidor(input) {
        var m = el('div', 'glx-meter', '<div class="glx-bars"><i></i><i></i><i></i><i></i></div><p>Seguridad: <b>—</b> · mín. 6 caracteres; mejor con un número y un símbolo</p>');
        function eval_() {
            var v = input.value || '', n = 0;
            if (v.length >= 6) n++;
            if (v.length >= 10) n++;
            if (/\d/.test(v)) n++;
            if (/[^A-Za-z0-9]/.test(v) || (/[a-z]/.test(v) && /[A-Z]/.test(v))) n++;
            if (!v) n = 0; else if (v.length < 6) n = 1; else n = Math.max(1, Math.min(4, n));
            m.setAttribute('data-n', String(n));
            m.querySelector('b').textContent = ['—', 'Débil', 'Regular', 'Buena', 'Fuerte'][n];
        }
        input.addEventListener('input', eval_); eval_();
        return m;
    }
    function terminos(id) {
        var t = el('label', 'glx-terms', '<input type="checkbox" id="' + id + '"> <span>Acepto los <a data-glx-terms>términos de uso</a> y el tratamiento de datos.</span>');
        return t;
    }
    function textoTerminos() {
        var msg = 'GeoMetrics es un laboratorio virtual educativo de Ingeniería Civil de la Universidad de Pamplona.\n\n' +
            '• Tus datos (nombre, correo institucional, código y materias) se usan solo para tu cuenta, tus entregas y tus resultados dentro de la plataforma.\n' +
            '• Los resultados de los ensayos y simuladores son de apoyo académico; no reemplazan ensayos ni diseños profesionales.\n' +
            '• Puedes pedir la corrección o eliminación de tus datos a un administrador.';
        if (window.gmAlert) window.gmAlert(msg, { titulo: 'Términos de uso', tono: 'info' }); else alert(msg);
    }

    /* ------------------------------------------------------------------ montaje */
    var ROLE = 'registro';
    function montar() {
        var S = $('pantallaInicio'); if (!S || S.classList.contains('glx')) return;
        var box = $('loginBox'), fl = $('formLogin'), fr = $('formRegistro'), fd = $('formDocente'), frec = $('formRecupero');
        if (!box || !fl || !fr || !fd) return;
        S.classList.add('glx');
        var top = S.querySelector('.inicio-topbar'), foot = S.querySelector('.inicio-footer');
        /* barra superior */
        var nav = el('header', 'glx-nav');
        if (top) top.querySelectorAll('img').forEach(function (im) { nav.appendChild(im); });
        nav.appendChild(el('div', 'glx-brand', '<b>GEO<i>METRICS</i></b><span>UNIVERSIDAD DE PAMPLONA // ING. CIVIL</span>'));
        nav.appendChild(el('div', 'glx-st', '<span>LABORATORIO VIRTUAL</span><span>ACCESO INSTITUCIONAL</span>'));
        S.insertBefore(nav, S.firstChild);
        S.appendChild(el('footer', 'glx-footer', '<span>© ' + new Date().getFullYear() + ' GEOMETRICS // LABORATORIO VIRTUAL</span><span>DESARROLLADO POR ESTUDIANTES DE INGENIERÍA CIVIL</span>'));
        /* pestañas nuevas (llaman a las originales) */
        var orig = function (w) { return box.querySelector('.login-tab[data-login-tab="' + w + '"]'); };
        var tabs = el('div', 'glx-tabs', '<button type="button" data-glx="entrar">' + IC.login + 'Iniciar sesión</button><button type="button" data-glx="reg">' + IC.reg + 'Registrarse</button>');
        var body = el('div', 'glx-body');
        var role = el('div', 'glx-role', '<button type="button" data-role="registro">' + IC.cap + 'Estudiante</button><button type="button" data-role="docente">' + IC.board + 'Docente</button>');
        box.insertBefore(tabs, box.firstChild);
        box.insertBefore(body, tabs.nextSibling);
        body.appendChild(role);
        [fl, frec, fr, fd].forEach(function (f) { if (f) body.appendChild(f); });
        tabs.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-glx]'); if (!b) return;
            var t = b.getAttribute('data-glx') === 'entrar' ? orig('entrar') : orig(ROLE);
            if (t) t.click();
        });
        role.addEventListener('click', function (e) { var b = e.target.closest('button[data-role]'); if (!b) return; ROLE = b.getAttribute('data-role'); var t = orig(ROLE); if (t) t.click(); });

        /* iniciar sesión */
        var mapL = envolver(fl);
        var idb = $('loginIdentidad');
        if (idb) {
            idb.appendChild(el('div', 'glx-wait', '<span class="login-avatar">?</span><div><strong>Cuenta institucional</strong><p>Esperando correo…</p></div>'));
            if (mapL.loginEmail) mapL.loginEmail.parentNode.insertBefore(idb, mapL.loginEmail.nextSibling);
        }
        var olv = $('btnOlvidoPass'), lnk = el('div', 'glx-links');
        if (olv) lnk.appendChild(olv);
        var toReg = el('span', '', '¿No tienes cuenta? '); var bReg = el('button', '', 'Regístrate'); bReg.type = 'button'; bReg.addEventListener('click', function () { var t = orig(ROLE); if (t) t.click(); }); toReg.appendChild(bReg); lnk.appendChild(toReg);
        var lerr = $('loginError'); fl.insertBefore(lnk, lerr || null);
        fl.querySelectorAll(':scope > .login-hint').forEach(function (p) { p.classList.add('glx-hidden'); });
        fl.appendChild(el('div', 'glx-foot', IC.shield + '<span>Solo correos <code>@unipamplona.edu.co</code> · Tu rol se asigna según tu cuenta.</span>'));

        /* registro de estudiante */
        var mapR = envolver(fr);
        var gR = rejilla(fr, mapR, ['regNombres', 'regApellidos', 'regEmail', 'regCodigo', 'regGenero', 'regPass', 'regPass2']);
        if ($('regPass')) gR.appendChild(medidor($('regPass')));
        if (mapR.regMaterias) gR.appendChild(mapR.regMaterias);
        var hintsR = fr.querySelectorAll(':scope > .login-hint');
        if (hintsR[0]) gR.appendChild(hintsR[0]);
        if (hintsR[1]) hintsR[1].classList.add('glx-hidden');
        var subR = fr.querySelector('button[type=submit]'); if (subR) { subR.textContent = 'CREAR CUENTA'; fr.insertBefore(terminos('glxTermsEst'), subR); }
        var lr = el('div', 'glx-links c'), sp = el('span', '', '¿Ya tienes cuenta? '), bL = el('button', '', 'Inicia sesión'); bL.type = 'button'; bL.addEventListener('click', function () { var t = orig('entrar'); if (t) t.click(); }); sp.appendChild(bL); lr.appendChild(sp);
        fr.insertBefore(lr, $('regError'));
        fr.appendChild(el('div', 'glx-foot', IC.shield + '<span>Solo correos <code>@unipamplona.edu.co</code> · El registro crea cuentas de <b>estudiante</b> y cada uno define su contraseña.</span>'));

        /* registro de docente */
        var mapD = envolver(fd);
        var hintsD = fd.querySelectorAll(':scope > .login-hint');
        var gD = rejilla(fd, mapD, ['docNombres', 'docApellidos', 'docEmail', 'docGenero', 'docPass', 'docPass2'], hintsD[0] ? hintsD[0].nextSibling : fd.firstChild);
        if ($('docPass')) gD.appendChild(medidor($('docPass')));
        if (mapD.docMaterias) gD.appendChild(mapD.docMaterias);
        if (hintsD[1]) gD.appendChild(hintsD[1]);
        var subD = fd.querySelector('button[type=submit]'); if (subD) { subD.textContent = 'REGISTRARME COMO DOCENTE'; fd.insertBefore(terminos('glxTermsDoc'), subD); }
        var ld = lr.cloneNode(true); ld.querySelector('button').addEventListener('click', function () { var t = orig('entrar'); if (t) t.click(); });
        fd.insertBefore(ld, $('docError'));
        if (hintsD[2]) hintsD[2].classList.add('glx-hidden');
        fd.appendChild(el('div', 'glx-foot', IC.shield + '<span>Solo correos de docentes autorizados por un administrador. Si el tuyo no lo está, pide que lo agreguen desde el panel Administrador.</span>'));

        /* recuperar contraseña */
        if (frec) { ['recuperoPaso1', 'recuperoPaso2'].forEach(function (id) { var p = $(id); if (p) envolver(p); }); }

        /* términos obligatorios */
        doc.addEventListener('submit', function (e) {
            var f = e.target, cb = f === fr ? $('glxTermsEst') : f === fd ? $('glxTermsDoc') : null;
            if (cb && !cb.checked) {
                e.preventDefault(); e.stopImmediatePropagation();
                var er = $(f === fr ? 'regError' : 'docError'); if (er) er.textContent = 'Debes aceptar los términos de uso para crear la cuenta.';
                cb.focus();
            }
        }, true);
        doc.addEventListener('click', function (e) { var a = e.target.closest && e.target.closest('[data-glx-terms]'); if (a) { e.preventDefault(); e.stopPropagation(); textoTerminos(); } }, true);

        /* visual derecho */
        var hl = S.querySelector('.hero-logo'), img = hl && hl.querySelector('img');
        if (hl) {
            hl.innerHTML = '';
            hl.insertAdjacentHTML('beforeend', '<i class="glx-corner a"></i><i class="glx-corner b"></i><i class="glx-corner c"></i><i class="glx-corner d"></i>' +
                '<div class="glx-vh"><span>GEOMETRICS // NÚCLEO DEL LABORATORIO</span></div>' +
                '<div class="glx-orb"><svg class="rings" viewBox="0 0 400 400" aria-hidden="true">' +
                '<circle cx="200" cy="200" r="198" fill="none" stroke="rgba(34,211,238,.16)" stroke-width="1"/>' +
                '<circle cx="200" cy="200" r="182" fill="none" stroke="rgba(148,163,184,.25)" stroke-width="1" stroke-dasharray="1 6"/>' +
                '<circle cx="200" cy="200" r="160" fill="none" stroke="rgba(34,211,238,.22)" stroke-width="1.2"/>' +
                '<g class="glx-spin"><path d="M 314 88 A 160 160 0 0 1 352 150" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/><path d="M 86 312 A 160 160 0 0 0 140 348" fill="none" stroke="#22d3ee" stroke-width="3" stroke-linecap="round"/></g>' +
                '<g class="glx-spin2"><path d="M 60 120 A 182 182 0 0 1 120 46" fill="none" stroke="rgba(167,139,250,.7)" stroke-width="2" stroke-linecap="round"/></g>' +
                '<path d="M200 2v10M200 388v10M2 200h10M388 200h10M58 58l7 7M342 342l-7-7M342 58l-7 7M58 342l7-7" stroke="rgba(34,211,238,.5)" stroke-width="1.5"/>' +
                '</svg><div class="glx-disc"></div></div>' +
                '<div class="glx-mod m1"><small>MÓDULO</small><b>Suelos</b></div><div class="glx-mod m2"><small>MÓDULO</small><b>Materiales</b></div><div class="glx-mod m3"><small>MÓDULO</small><b>Estructuras</b></div><div class="glx-mod m4"><small>ASISTENTE</small><b>Civix IA</b></div>' +
                '<div class="glx-vf"><span>TEORÍA · ENSAYOS · SIMULADORES</span><b>SISTEMA EN LÍNEA</b></div>');
            if (img) hl.querySelector('.glx-disc').appendChild(img);
        }

        /* títulos y estado según la pestaña activa */
        var h1 = S.querySelector('.inicio-titulo'), sub = S.querySelector('.inicio-subtitulo');
        var H1L = h1 ? h1.innerHTML : '', SUBL = sub ? sub.textContent : '';
        function sync() {
            var m = frec && frec.classList.contains('active') ? 'rec' : fr.classList.contains('active') ? 'registro' : fd.classList.contains('active') ? 'docente' : 'entrar';
            if (m === 'registro' || m === 'docente') ROLE = m;
            var reg = m === 'registro' || m === 'docente';
            tabs.querySelector('[data-glx="entrar"]').classList.toggle('on', !reg);
            tabs.querySelector('[data-glx="reg"]').classList.toggle('on', reg);
            role.style.display = reg ? '' : 'none';
            role.querySelectorAll('button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-role') === m); });
            if (h1) {
                var html = reg ? 'Únete a <span class="geo">Geo</span><span class="metrics">Metrics</span>' : m === 'rec' ? 'Recupera tu <span class="metrics">acceso</span>' : H1L;
                if (h1.innerHTML !== html) h1.innerHTML = html;
            }
            if (sub) {
                var t = reg ? (m === 'docente' ? 'Activa tu cuenta de docente para gestionar tu aula, ensayos y materiales.' : 'Crea tu cuenta institucional para acceder a teoría, ensayos y simuladores.') : m === 'rec' ? 'Te enviaremos un código a tu correo institucional.' : SUBL;
                if (sub.textContent !== t) sub.textContent = t;
            }
        }
        var mo = new MutationObserver(sync);
        [fl, fr, fd, frec].forEach(function (f) { if (f) mo.observe(f, { attributes: true, attributeFilter: ['class'] }); });
        sync();
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', montar); else montar();
    window.GMLoginDiseno = { montar: montar };
})();
