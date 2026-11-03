/* GeoMetrics — escala proporcional: las pantallas rediseñadas se ven igual en cualquier monitor
 * (1366, 1536, 1920 px…). Se usa CSS zoom calculado según el tamaño de la ventana. No toca la lógica. */
(function () {
    'use strict';
    var H = document.documentElement;
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function medir() {
        var w = window.innerWidth, h = window.innerHeight, movil = w < 900;
        var gz = movil ? 1 : clamp(w / 1920, 0.62, 1);                       /* pantallas con scroll */
        var gzf = movil ? 1 : clamp(Math.min(w / 1920, h / 1000), 0.6, 1), gzl = movil ? 1 : clamp(Math.min(w / 1680, h / 860), 0.66, 1);   /* pantallas a una sola vista */
        H.style.setProperty('--gz', gz.toFixed(4));
        H.style.setProperty('--gzf', gzf.toFixed(4)); H.style.setProperty('--gzl', gzl.toFixed(4));
    }
    medir();
    window.addEventListener('resize', medir);
    var css = document.createElement('style'); css.id = 'gm-escala-css';
    css.textContent = [
        'html #pantallaAdmin.gt,html #pantallaRecursos.gt,html #pantallaResultados.gt{zoom:var(--gz,1);min-height:calc(100vh / var(--gz,1))!important}',
        'html #pantallaInicio.glx:not([style*="none"]){zoom:var(--gzl,1)}',
        '@media (min-width:1100px) and (min-height:620px){html #pantallaInicio.glx:not([style*="none"]){height:calc(100vh / var(--gzl,1))!important}html #pantallaInicio.glx .hero-text{justify-content:center!important}}',
        'html #pantallaDocente.gtd,html #pantallaEstudiante.av-visible{zoom:var(--gzf,1)}',
        'html body #pantallaDocente.gtd,html body main#pantallaEstudiante.av-visible{padding:0!important;width:calc(100vw / var(--gzf,1))!important;height:calc(100vh / var(--gzf,1))!important;right:auto!important;bottom:auto!important}',
        'html #asistenteModal.gcx .civix-shell{zoom:var(--gzf,1);width:calc(100vw / var(--gzf,1))!important;height:calc(100vh / var(--gzf,1))!important}'
    ].join('\n');
    document.head.appendChild(css);
})();
