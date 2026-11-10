/* =========================================================
   GeoMetrics — Ensayos con resultados por defecto
   Al abrir un ensayo de Suelos I, Suelos II, Resistencia de
   Materiales o Estructuras I, se cargan los valores de ejemplo
   (los mismos «Ej. …» de cada casilla o el botón «Valores de
   ejemplo»), se calcula y se genera la gráfica. Así el ensayo
   ya muestra resultados; el estudiante reemplaza los datos por
   sus lecturas y vuelve a calcular.
   · Solo actúa una vez por apertura del ensayo.
   · No toca casillas que ya tienen un valor.
   · «Limpiar» deja el formulario vacío (no se vuelve a llenar).
   Diseño de Mezclas ya abre con su ejemplo calculado.
   ========================================================= */
(function (global) {
    'use strict';
    var doc = document;
    var HOSTS = ['panel-ensayo', 'panel-ensayo-ms2', 'panel-ensayo-rm', 'est-ensayos'];

    function numDe(ph) {
        var m = String(ph || '').match(/Ej\.?\s*(-?\d+(?:[.,]\d+)?)/i) || String(ph || '').match(/^\s*(-?\d+(?:[.,]\d+)?)\s*$/);
        return m ? m[1].replace(',', '.') : null;
    }
    function texto(b) { return (b.textContent || '').replace(/\s+/g, ' ').trim(); }
    function visible(el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }

    /* raíz del formulario abierto en cada panel */
    function formulario(host) {
        if (host.id === 'est-ensayos') return host.querySelector('.est-shell');
        if (host.id === 'panel-ensayo-rm') return host.querySelector('.ensayo-form.rm-form:not(.sim-layout-rm)');
        return host.querySelector('.laboratorio-panel');
    }

    function llenar(form) {
        var n = 0;
        /* botón propio de ejemplo (p. ej. granulometría) */
        var ej = [].slice.call(form.querySelectorAll('button')).filter(function (b) { return /valores de ejemplo|cargar ejemplo/i.test(texto(b)); })[0];
        var vacias = [].slice.call(form.querySelectorAll('input[type=number], input:not([type])')).filter(function (i) { return !i.value && !i.disabled && !i.readOnly; });
        if (ej && vacias.length) { ej.click(); n++; }
        /* casillas con «Ej. valor» */
        [].slice.call(form.querySelectorAll('input[type=number], input:not([type])')).forEach(function (i) {
            if (i.value || i.disabled || i.readOnly) return;
            var v = numDe(i.placeholder);
            if (v == null) return;
            i.value = v; n++;
        });
        return n;
    }

    function calcular(form) {
        var cands = [].slice.call(form.querySelectorAll('button, [onclick]')).filter(function (b) {
            var oc = b.getAttribute('onclick') || '';
            return b.id === 'estCalc' || /^\s*(calcular|clasificar)\w*\s*\(/i.test(oc) || /^(calcular|clasificar)(\s|$)/i.test(texto(b));
        });
        var b = cands[0];
        if (!b) return false;
        try { b.click(); } catch (e) { return false; }
        return true;
    }

    function graficar(form) {
        /* un solo botón de gráfica (hay copias en la barra de acciones y en el panel) */
        var vistos = {};
        [].slice.call(form.querySelectorAll('[onclick*="grafica"]')).forEach(function (b) {
            var oc = (b.getAttribute('onclick') || '').replace(/\s+/g, '');
            if (vistos[oc]) return;
            vistos[oc] = true;
            try { b.click(); } catch (e) {}
        });
    }

    function aviso(form) {
        if (form.querySelector('.gm-ej-aviso')) return;
        var dp = form.querySelector('.gx-dp, .datos-panel, .dm-panel') || form;
        var a = doc.createElement('p');
        a.className = 'gm-ej-aviso';
        a.setAttribute('role', 'note');
        a.innerHTML = '<b>Ejemplo cargado.</b> Los resultados y la gráfica corresponden a valores de ejemplo: reemplázalos por tus lecturas y pulsa <b>Calcular</b>.';
        var h = dp.querySelector('.gx-ph, h4');
        if (h && h.parentNode === dp) dp.insertBefore(a, h.nextSibling); else dp.insertBefore(a, dp.firstChild);
        /* se retira cuando el estudiante escribe su primer dato */
        form.addEventListener('input', function quitar(e) {
            if (!e.isTrusted) return;
            if (a.parentNode) a.parentNode.removeChild(a);
            form.removeEventListener('input', quitar);
        });
    }

    function procesar(host) {
        var form = formulario(host);
        if (!form || form.getAttribute('data-gm-ejemplo')) return;
        if (!visible(form)) return;
        form.setAttribute('data-gm-ejemplo', '1');
        try {
            var lleno = llenar(form);
            var esEst = host.id === 'est-ensayos';
            /* Estructuras ya calcula al abrir; solo se asegura el cálculo */
            setTimeout(function () {
                var hayRes = esEst && doc.getElementById('estRes') && !/pulsa CALCULAR/i.test(doc.getElementById('estRes').textContent);
                if (!hayRes) calcular(form);
                setTimeout(function () {
                    graficar(host);   /* el panel de la gráfica está fuera del formulario */
                    aviso(form);
                }, 120);
            }, lleno ? 160 : 60);
        } catch (e) {
            if (global.console) console.warn('[ensayos por defecto]', e);
        }
    }

    function programar(host) {
        clearTimeout(host.__gmEjT);
        /* se espera a que ensayos-diseno.js reorganice el formulario */
        host.__gmEjT = setTimeout(function () { procesar(host); }, 450);
    }

    function iniciar() {
        HOSTS.forEach(function (id) {
            var host = doc.getElementById(id);
            if (!host || host.__gmEj) return;
            host.__gmEj = true;
            new MutationObserver(function () { programar(host); }).observe(host, { childList: true, subtree: false });
            programar(host);
        });
        /* respaldo: un ensayo abierto mientras su pantalla estaba oculta se
           procesa cuando el estudiante llega a verlo */
        if (!iniciar.__t) iniciar.__t = setInterval(function () {
            HOSTS.forEach(function (id) { var h = doc.getElementById(id); if (h) procesar(h); });
        }, 1200);
    }

    var css = doc.createElement('style');
    css.textContent = '.gm-ej-aviso{margin:0 0 14px;padding:10px 14px;border:1px solid rgba(34,211,238,.35);border-left:3px solid #22D3EE;border-radius:10px;background:rgba(34,211,238,.07);color:#CFE8F2;font-size:13px;line-height:1.5}' +
        '.gm-ej-aviso b{color:#fff}';
    doc.head.appendChild(css);

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar); else iniciar();
    global.addEventListener('load', iniciar);
    global.GeoEnsayosDefecto = { procesar: function (id) { var h = doc.getElementById(id); if (h) procesar(h); } };
})(window);
