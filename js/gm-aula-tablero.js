/* GeoMetrics — Mi aula: tablero
 * 1) Oculta la tarjeta "Próximas clases" que estaba suelta sobre el escenario (izquierda).
 *    El HTML y el JS siguen intactos: la tarjeta de la columna derecha sigue funcionando igual.
 * 2) Alinea el bloque de la materia (#avHologram) con el tablero del fondo del aula,
 *    calculando la posición real del tablero dentro de la imagen de fondo (background-size: cover).
 * No cambia ninguna función ni el comportamiento de los botones.
 */
(function () {
    'use strict';
    var doc = document;

    /* ---- Medidas del tablero dentro de docs/aula-referencia.png (1672 x 940) ----
       Marco luminoso del tablero: x 466 → 1204 · y 198 → 477.
       Se guardan como fracciones para que funcione con cualquier tamaño de pantalla. */
    var IMG_W = 1672, IMG_H = 940;
    var B = { l: 466 / IMG_W, r: 1204 / IMG_W, t: 198 / IMG_H, b: 477 / IMG_H };

    /* Margen interior respecto al marco del tablero (fracción del ancho del tablero) */
    var INSET = 0.055;      /* a izquierda y derecha */
    var BOTTOM_PAD = 0.07;  /* separación respecto al borde inferior del tablero */

    var css = doc.createElement('style');
    css.id = 'gm-aula-tablero-css';
    css.textContent = [
        /* 1) Fuera la tarjeta suelta de la izquierda (se mantiene la de la columna derecha) */
        'html body #pantallaEstudiante #avNextClassMain{display:none!important}',

        /* 2) El bloque de la materia se coloca sobre el tablero (JS pone left/width/top) */
        'html body #pantallaEstudiante .av-hologram{transform:none!important;max-width:none!important;max-height:none!important;' +
        'padding:14px 18px 16px!important;border-radius:14px!important;' +
        'background:linear-gradient(165deg,rgba(4,18,36,.82),rgba(2,10,24,.88))!important;' +
        'border:1px solid rgba(0,217,255,.55)!important;' +
        'box-shadow:0 0 0 1px rgba(0,217,255,.12),0 18px 44px rgba(0,0,0,.55),0 0 38px rgba(0,217,255,.22)!important}',

        /* Botones: cuatro columnas iguales, sin que se monten entre ellos */
        'html body #pantallaEstudiante .av-holo-actions{display:grid!important;grid-template-columns:repeat(4,1fr)!important;' +
        'gap:8px!important;margin-top:12px!important}',
        'html body #pantallaEstudiante .av-holo-actions button{width:100%!important;white-space:nowrap!important;' +
        'padding:8px 6px!important;text-align:center!important;overflow:hidden!important;text-overflow:ellipsis!important}',

        /* En pantallas estrechas el tablero casi no se ve: se vuelve al reparto en dos filas */
        '@media (max-width:900px){html body #pantallaEstudiante .av-holo-actions{grid-template-columns:repeat(2,1fr)!important}}'
    ].join('\n');
    (doc.head || doc.documentElement).appendChild(css);

    function medir() {
        var holo = doc.getElementById('avHologram');
        var stage = doc.getElementById('avStage');
        if (!holo || !stage) return;
        var main = holo.offsetParent;
        if (!main) return;                       /* aula oculta: nada que medir */

        var sw = stage.offsetWidth, sh = stage.offsetHeight;
        if (!sw || !sh) return;

        /* background-size: cover → la imagen se escala al máximo y se recorta centrada */
        var k = Math.max(sw / IMG_W, sh / IMG_H);
        var dw = IMG_W * k, dh = IMG_H * k;
        var ox = stage.offsetLeft + (sw - dw) / 2;
        var oy = stage.offsetTop + (sh - dh) / 2;

        var bx = ox + B.l * dw;                  /* borde izquierdo del tablero */
        var bw = (B.r - B.l) * dw;               /* ancho del tablero */
        var by = oy + B.t * dh;                  /* borde superior del tablero */
        var bh = (B.b - B.t) * dh;               /* alto del tablero */

        var ins = bw * INSET;
        var left = Math.round(bx + ins);
        var width = Math.round(bw - ins * 2);
        if (width < 280) { width = Math.min(280, sw - 24); left = Math.round(ox + (dw - width) / 2); }

        if (holo.__l !== left) { holo.__l = left; holo.style.left = left + 'px'; }
        if (holo.__w !== width) { holo.__w = width; holo.style.width = width + 'px'; }
        if (holo.style.right !== 'auto') holo.style.right = 'auto';

        /* El bloque se apoya en el borde inferior del tablero */
        var alto = holo.offsetHeight || 150;
        var top = Math.round(by + bh - bh * BOTTOM_PAD - alto);
        var minTop = Math.round(by - bh * 0.10);
        if (top < minTop) top = minTop;
        if (top < stage.offsetTop + 8) top = stage.offsetTop + 8;
        if (holo.__t !== top) { holo.__t = top; holo.style.top = top + 'px'; }
    }

    var pend = null;
    function pedir() {
        if (pend) return;
        pend = setTimeout(function () { pend = null; medir(); }, 60);
    }

    function arrancar() {
        medir();
        /* segunda pasada: cuando ya están las fuentes y el texto real de la materia */
        setTimeout(medir, 250);
        setTimeout(medir, 900);
        window.addEventListener('resize', pedir);
        if (doc.fonts && doc.fonts.ready && doc.fonts.ready.then) doc.fonts.ready.then(medir);

        var M = doc.getElementById('pantallaEstudiante');
        if (M) {
            new MutationObserver(pedir).observe(M, {
                childList: true, subtree: true,
                attributes: true, attributeFilter: ['class', 'style', 'hidden']
            });
        }
        var holo = doc.getElementById('avHologram');
        if (holo && window.ResizeObserver) new ResizeObserver(pedir).observe(holo);
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', arrancar);
    else arrancar();

    window.GMAulaTablero = { medir: medir };
})();
