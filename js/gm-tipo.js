/* GeoMetrics — Sistema tipográfico global (Inter).
 *
 * 1) Define en :root las variables de familia, tamaños, pesos y alturas de línea (con valores para
 *    escritorio, tableta y celular).
 * 2) Aplica Inter a todo el sitio (salvo fórmulas KaTeX, código y dibujos).
 * 3) Clasifica cada texto visible por su función (H1, H2, H3, H4, título de tarjeta, texto, navegación,
 *    botón, secundario, etiqueta, auxiliar, fórmula) y le asigna el tamaño y peso de la tabla,
 *    compensando el zoom de cada pantalla para que se vea igual en todas. Corrige así los tamaños
 *    sueltos de los CSS antiguos y los estilos en línea. No cambia contenido, lógica ni botones. */
(function () {
    'use strict';
    var doc = document, H = doc.documentElement;

    /* ---------- 1. Variables globales ---------- */
    var css = doc.createElement('style'); css.id = 'gm-tipo-root';
    css.textContent = [
        ':root{',
        '  --gm-font:"Inter","Segoe UI",system-ui,-apple-system,Roboto,Arial,sans-serif;',
        '  --gm-fw-regular:400;--gm-fw-medium:500;--gm-fw-semibold:600;--gm-fw-bold:700;',
        '  --gm-fs-h1:40px;--gm-fs-h2:32px;--gm-fs-h3:24px;--gm-fs-h4:20px;--gm-fs-card:18px;',
        '  --gm-fs-body:16px;--gm-fs-nav:14px;--gm-fs-btn:14px;--gm-fs-sec:14px;--gm-fs-label:13px;--gm-fs-aux:12px;--gm-fs-formula:20px;',
        '  --gm-lh-title:1.2;--gm-lh-body:1.55;--gm-lh-ui:1.3;',
        '  --gm-fw-h1:700;--gm-fw-h2:600;--gm-fw-h3:600;--gm-fw-h4:600;--gm-fw-card:600;--gm-fw-body:400;--gm-fw-nav:500;--gm-fw-btn:600;--gm-fw-sec:400;--gm-fw-label:500;--gm-fw-aux:400;--gm-fw-formula:500;',
        '}',
        '@media (max-width:1100px){:root{--gm-fs-h1:34px;--gm-fs-h2:28px;--gm-fs-h3:22px;--gm-fs-h4:19px;--gm-fs-card:17px}}',
        '@media (max-width:640px){:root{--gm-fs-h1:28px;--gm-fs-h2:24px;--gm-fs-h3:20px;--gm-fs-h4:18px;--gm-fs-card:17px;--gm-fs-body:15px;--gm-fs-formula:18px}}',
        /* familia única: Inter en todo, excepto fórmulas, código y gráficos */
        'html body,html body :where(*:not(svg):not(svg *):not(.katex):not(.katex *):not(code):not(pre):not(kbd):not(samp)){font-family:var(--gm-font)!important}',
        'html body :where(code,pre,kbd,samp){font-family:"JetBrains Mono",ui-monospace,Consolas,monospace!important}',
        /* números con ancho fijo para que tablas y contadores no "bailen" */
        'html body :where(td,.gt-stat b,.gtd-kpi b,.dp-kpi-num,.gav-kpi b,.gtd-cst b,.cxs-stat){font-variant-numeric:tabular-nums}'
    ].join('\n');
    doc.head.appendChild(css);
    /* Inter 400/500/600/700 (Google Fonts); si no hay conexión se usa la fuente del sistema */
    if (!doc.getElementById('gm-inter')) {
        var pc = doc.createElement('link'); pc.rel = 'preconnect'; pc.href = 'https://fonts.gstatic.com'; pc.crossOrigin = ''; doc.head.appendChild(pc);
        var lk = doc.createElement('link'); lk.id = 'gm-inter'; lk.rel = 'stylesheet'; lk.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'; doc.head.appendChild(lk);
    }

    /* ---------- 2. Clasificación por función ---------- */
    var SALTAR = 'svg,canvas,script,style,noscript,code,pre,.katex,.gmx-stage,.gml-orb,.glx-orb,.gm-backhoe,.cxp-out .cx-stage,.s2d-stage,[data-gm-tipo="off"]';
    var FORMULA = '.dm-formula,.s1-formula,.civix-formula,.katex-display,[class*="formula"]:not(.tn-formulas):not(button)';
    var NAV = 'nav,[role="navigation"],.dp-side,.av-nav,.civix-side-nav,.dp-top-nav,.gmx-nav,.glx-nav,.menu-user-dropdown,.gtd-menu';
    var TARJETA = '[class*="card"],[class*="-ch"],[class*="head"],.dp-course,.gtd-box,.aula-item,.gtd-st,.gtd-course,.fa-item,.admin-row,.gm-team-card,.libro-card,.recurso-bloque,.gx-step,.gtd-ev';
    var ETIQ = 'label,legend,th,[class*="badge"],[class*="tag"],[class*="eye"],[class*="eyebrow"],.gtd-bh,.gav-eye,.gtd-eye,.gt-eye,.gcx-eye,.gcx-lh,.gma-lh,.gtd-adv,.gtd-st-head,.gtr-head,.gtd-thead';
    var AUX = 'small,time,footer,figcaption,[class*="hint"],[class*="meta"],[class*="foot"],[class*="leg"],[class*="legend"],.gtd-cnt,.gcx-cnt,.gcx-hint,.fa-item-meta,.cx-info';
    var SEC = '[class*="desc"],[class*="sub"],[class*="muted"],[class*="secondary"],[class*="note"],.av-view-hint,.dp-head p,.gt-desc,.civix-view-head p,.gtd-empty p,.gav-empty p';
    function rol(e, r) {
        var tag = e.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return 'body';
        var hx = e.closest('h1,h2,h3,h4,h5,h6');
        var enBoton = e.closest('button,a,[role="button"],.btn,summary');
        var botonSimple = enBoton && !enBoton.querySelector('h1,h2,h3,h4,p');
        /* títulos de página: h1, o textos de presentación muy grandes */
        if (hx && r < 15) return 'label'; /* encabezados pequeños que funcionan como etiqueta */
        if (r >= 26 && /^[\s\d.,:%°/·—–-]+$/.test(e.textContent)) return 'h2'; /* cifras y numeraciones grandes */
        if ((hx && hx.tagName === 'H1') || r >= 34) return botonSimple ? 'h2' : 'h1';
        /* títulos dentro de cabeceras de tarjeta */
        if ((hx || /^(B|STRONG)$/.test(tag)) && r >= 15.5 && r < 34 && e.closest(TARJETA) && !botonSimple) return 'card';
        if (hx && hx.tagName === 'H2') return r >= 24 ? 'h2' : 'h3';
        if (r >= 26) return 'h2';                       /* cifras grandes, subtítulos destacados */
        if (hx && hx.tagName === 'H3') return r >= 21 ? 'h3' : 'card';
        if (r >= 21) return 'h3';
        if (hx) return 'h4';
        if (r >= 18.5 && !botonSimple) return 'h4';
        if (e.closest(NAV)) return 'nav';
        if (botonSimple) return 'btn';
        if (e.closest(ETIQ) || (getComputedStyle(e).textTransform === 'uppercase' && r < 15)) return 'label';
        if (e.closest(AUX) || r < 11.5) return 'aux';
        if (e.closest(SEC) || r < 14.5) return 'sec';
        return 'body';
    }
    var LH = { h1: 'title', h2: 'title', h3: 'title', h4: 'title', card: 'title', body: 'body', sec: 'body' };
    var tok = {};
    function leerTokens() {
        var cs = getComputedStyle(H);
        ['h1', 'h2', 'h3', 'h4', 'card', 'body', 'nav', 'btn', 'sec', 'label', 'aux', 'formula'].forEach(function (k) {
            tok[k] = { fs: parseFloat(cs.getPropertyValue('--gm-fs-' + k)) || 16, fw: cs.getPropertyValue('--gm-fw-' + k).trim() || '400' };
        });
        tok.lhTitle = cs.getPropertyValue('--gm-lh-title').trim() || '1.2';
        tok.lhBody = cs.getPropertyValue('--gm-lh-body').trim() || '1.55';
    }

    function zoomDe(e) { var k = 1; while (e && e.nodeType === 1) { var v = parseFloat(getComputedStyle(e).zoom); if (v && v !== 1) k *= v; e = e.parentElement; } return k; }
    function visible(e) { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
    function conTexto(e) { for (var c = e.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && c.textContent.trim().length > 0) return true; return false; }
    function poner(e, p, v) { if (e.style.getPropertyValue(p) !== v || e.style.getPropertyPriority(p) !== 'important') e.style.setProperty(p, v, 'important'); }

    var cola = false, version = 0;
    function aplicar(todo) {
        if (todo) { version++; leerTokens(); }
        var cambios = [];
        /* fórmulas: el contenedor fija el tamaño y KaTeX escala con él */
        doc.querySelectorAll(FORMULA).forEach(function (f) {
            if (!todo && f.__gtv === version) return;
            if (f.closest('svg,canvas') || !visible(f)) return;
            cambios.push([f, 'formula', zoomDe(f), parseFloat(getComputedStyle(f).fontWeight) || 400]);
        });
        var lista = doc.body.querySelectorAll('*');
        for (var i = 0; i < lista.length; i++) {
            var e = lista[i];
            if (e.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;
            var campo = e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT';
            if (campo && /^(checkbox|radio|range|color|file|hidden)$/i.test(e.type)) continue;
            if (!campo && !conTexto(e)) continue;
            if (!todo && e.__gtv === version) continue;
            if (e.closest(SALTAR) || e.closest(FORMULA) || !visible(e)) continue;
            var cs = getComputedStyle(e);
            if (e.__gfs == null) { e.__gfs = parseFloat(cs.fontSize); e.__gfw = parseFloat(cs.fontWeight) || 400; }
            if (!e.__gfs) continue; /* iconos ocultos con font-size:0 */
            var z = zoomDe(e);
            if (e.__grol == null) e.__grol = rol(e, e.__gfs * z);
            cambios.push([e, e.__grol, z, e.__gfw]);
        }
        /* primero se mide todo, después se escribe */
        for (var j = 0; j < cambios.length; j++) {
            var c = cambios[j], el = c[0], t = tok[c[1]]; if (!t) continue;
            el.__gtv = version;
            poner(el, 'font-size', (Math.round(t.fs / c[2] * 100) / 100) + 'px');
            var fw = t.fw;
            if ((c[1] === 'body' || c[1] === 'sec' || c[1] === 'aux') && c[3] >= 600) fw = '600'; /* conserva negritas dentro del texto */
            poner(el, 'font-weight', fw);
            if (c[1] !== 'formula') poner(el, 'font-family', 'var(--gm-font)');
            var lh = LH[c[1]];
            if (lh && /^(P|LI|H1|H2|H3|H4|H5|H6|BLOCKQUOTE|DD|DT)$/.test(el.tagName)) poner(el, 'line-height', lh === 'title' ? tok.lhTitle : tok.lhBody);
        }
    }
    function programar(todo) { if (cola) return; cola = true; setTimeout(function () { cola = false; try { aplicar(todo); } catch (e) { if (window.console) console.warn('gm-tipo', e); } }, 160); }
    function iniciar() {
        aplicar(true);
        new MutationObserver(function (ms) {
            for (var i = 0; i < ms.length; i++) {
                var m = ms[i], t = m.target;
                if (m.type === 'childList') { programar(false); return; }
                if (m.attributeName === 'style' && (t.__gtv || !(t.id || /^(MAIN|SECTION|ASIDE|DIALOG)$/.test(t.tagName)))) continue;
                programar(false); return;
            }
        }).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden', 'style'] });
        var tm; window.addEventListener('resize', function () { clearTimeout(tm); tm = setTimeout(function () { aplicar(true); }, 200); });
        if (doc.fonts && doc.fonts.ready) doc.fonts.ready.then(function () { programar(true); });
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { setTimeout(iniciar, 300); }); else setTimeout(iniciar, 300);
    window.GMTipo = { aplicar: function () { aplicar(true); }, tokens: function () { leerTokens(); return tok; } };
})();
