/* ============================================================
   GeoMetrics — la intro del fósil como transición de inicio de sesión
   Se reproduce SOLO cuando alguien entra con su cuenta (login, registro
   o activación de docente). Al restaurar la sesión con F5 no aparece.

   Duración: 4 segundos.  Para cambiarla, edita DURACION aquí abajo
   (o llama a GeoIntro.setDuracion(ms) desde la consola).

   No cambia la autenticación ni ninguna función: solo envuelve
   aulaEnterApp para mostrar la animación antes de abrir el menú.
   ============================================================ */
(function () {
    'use strict';

    var DURACION = 4000;          /* ← velocidad de la transición, en milisegundos */

    var doc = document;
    var overlay = null, pedido = false, corriendo = false;

    function crear() {
        if (overlay) return overlay;
        overlay = doc.createElement('div');
        overlay.id = 'geoIntro';
        overlay.setAttribute('aria-hidden', 'true');
        doc.body.appendChild(overlay);
        if (window.GeoIntro) {
            window.GeoIntro.setDuracion(DURACION);
            window.GeoIntro.montar(overlay);
        }
        return overlay;
    }

    /* Marca que la entrada viene de un formulario de acceso (no de un F5). */
    function marcar() { pedido = true; setTimeout(function () { pedido = false; }, 12000); }
    ['formLogin', 'formRegistro', 'formDocente', 'formAcceso'].forEach(function (id) {
        var f = doc.getElementById(id);
        if (f) f.addEventListener('submit', marcar, true);
    });
    /* por si los formularios se crean más tarde */
    doc.addEventListener('submit', function (e) {
        var f = e.target;
        if (!f || !f.id) return;
        if (/^form(Login|Registro|Docente|Acceso)$/i.test(f.id)) marcar();
    }, true);

    function reproducir() {
        if (!window.GeoIntro) return Promise.resolve();
        crear();
        if (!window.GeoIntro.montado) return Promise.resolve();
        corriendo = true;
        window.GeoIntro.reset();
        overlay.classList.add('on');
        window.GeoIntro.fit();
        return window.GeoIntro.play().then(cerrar, cerrar);
    }
    function cerrar() {
        if (!overlay) return;
        overlay.classList.remove('on');
        setTimeout(function () { corriendo = false; }, 400);
    }

    /* ---- envolver aulaEnterApp ---- */
    function enganchar() {
        var orig = window.aulaEnterApp;
        if (typeof orig !== 'function' || orig.__gmIntro) return false;

        var envuelto = function (user, opts) {
            if (!pedido || corriendo) return orig.apply(this, arguments);
            pedido = false;
            var args = arguments, self = this;
            try {
                reproducir().then(function () { orig.apply(self, args); });
            } catch (e) {
                return orig.apply(self, args);
            }
            return undefined;
        };
        envuelto.__gmIntro = 1;
        envuelto.original = orig;
        window.aulaEnterApp = envuelto;
        return true;
    }

    function intentar(n) {
        if (enganchar()) return;
        if (n > 0) setTimeout(function () { intentar(n - 1); }, 150);
    }

    function arrancar() { crear(); intentar(40); }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', arrancar);
    else arrancar();

    window.GMIntro = {
        reproducir: reproducir,
        setDuracion: function (ms) { DURACION = ms; if (window.GeoIntro) window.GeoIntro.setDuracion(ms); return ms; },
        get duracion() { return DURACION; }
    };
})();
