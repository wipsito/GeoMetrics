/* GeoMetrics — ventanas de confirmación unificadas (eliminar, agregar, publicar…) con retroexcavadora que se lleva la ventana.
 * Sustituye a gmConfirm de aula.js (se carga después) y pide confirmación en acciones de publicar / agregar. Solo front-end, sin claves. */
(function (global) {
    'use strict';
    var doc = global.document, RED = /eliminar|quitar|retirar|vaciar|borrar|restablecer|revocar|cerrar sesi/i;
    var css = doc.createElement('style');
    css.textContent =
        '.gm-confirm-box.gm-tono-ok{border-color:rgba(56,189,248,.4)}' +
        '.gm-confirm-box.gm-tono-ok .gm-confirm-icon{background:rgba(52,211,153,.15);border-color:rgba(52,211,153,.45);color:#6ee7b7}' +
        '.gm-confirm-box.gm-tono-ok .gm-confirm-ok{background:linear-gradient(135deg,#0ea5e9,#0891b2)}' +
        '.gm-confirm-box.gm-away{transition:none!important;animation:none!important;will-change:transform}' +
        '.gm-backhoe{position:fixed;z-index:2147483647;pointer-events:none;width:320px;height:170px;left:0;top:0;will-change:transform;filter:drop-shadow(0 8px 10px rgba(0,0,0,.45))}' +
        '.gm-dust{position:fixed;z-index:2147483646;pointer-events:none;width:14px;height:14px;border-radius:50%;background:rgba(203,178,140,.75);will-change:transform,opacity}';
    doc.head.appendChild(css);

    var SVG = '<svg viewBox="0 0 320 170" xmlns="http://www.w3.org/2000/svg" width="320" height="170">' +
        '<defs><linearGradient id="gmBl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3b82f6"/><stop offset="1" stop-color="#1d4ed8"/></linearGradient><linearGradient id="gmYe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fcd34d"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>' +
        '<ellipse cx="160" cy="165" rx="146" ry="6" fill="rgba(0,0,0,.35)"/>' +
        '<g><animateTransform attributeName="transform" type="rotate" values="-3 70 90;3 70 90;-3 70 90" dur="0.9s" repeatCount="indefinite"/>' +
        '<path d="M88 88 L50 36 L20 62 L34 112" fill="none" stroke="#1f2937" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="M88 88 L50 36 L20 62 L34 112" fill="none" stroke="url(#gmYe)" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="M34 112 L10 118 L14 142 L48 136 Z" fill="#6b7280" stroke="#374151" stroke-width="3"/><path d="M14 142 L9 150 M26 139 L22 148 M38 137 L36 146" stroke="#cbd5e1" stroke-width="3" stroke-linecap="round"/></g>' +
        '<rect x="196" y="20" width="7" height="46" rx="3" fill="#374151"/>' +
        '<rect x="70" y="86" width="168" height="44" rx="10" fill="url(#gmBl)"/><rect x="70" y="106" width="168" height="5" fill="#fcd34d"/>' +
        '<text x="154" y="102" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="9" fill="#fff" letter-spacing="1.4">GEOMETRICS</text>' +
        '<path d="M170 88 L246 88 L250 112 L170 116 Z" fill="url(#gmYe)"/><rect x="236" y="76" width="12" height="9" rx="2" fill="#fef9c3"/><circle cx="246" cy="98" r="5" fill="#fef9c3"/>' +
        '<rect x="92" y="26" width="84" height="64" rx="8" fill="url(#gmBl)"/><rect x="100" y="34" width="46" height="48" rx="5" fill="#cfe8ff"/><rect x="150" y="34" width="20" height="48" rx="5" fill="#cfe8ff"/>' +
        '<circle cx="122" cy="52" r="9" fill="#f1c9a0"/><path d="M112 50 Q122 36 132 50 Z" fill="#fff"/><rect x="113" y="60" width="18" height="22" rx="4" fill="#fb923c"/><rect x="116" y="64" width="12" height="3" fill="#e5e7eb"/>' +
        '<rect x="86" y="18" width="96" height="11" rx="5" fill="url(#gmYe)"/>' +
        '<g><circle cx="116" cy="132" r="32" fill="#111827"/><circle cx="116" cy="132" r="26" fill="#1f2937"/><circle cx="116" cy="132" r="15" fill="#fbbf24"/><g><animateTransform attributeName="transform" type="rotate" from="0 116 132" to="360 116 132" dur="0.8s" repeatCount="indefinite"/><circle cx="116" cy="124" r="3" fill="#92400e"/><circle cx="124" cy="136" r="3" fill="#92400e"/><circle cx="108" cy="136" r="3" fill="#92400e"/></g></g>' +
        '<g><circle cx="224" cy="140" r="22" fill="#111827"/><circle cx="224" cy="140" r="11" fill="#fbbf24"/><g><animateTransform attributeName="transform" type="rotate" from="0 224 140" to="360 224 140" dur="0.8s" repeatCount="indefinite"/><circle cx="224" cy="134" r="2.5" fill="#92400e"/><circle cx="230" cy="144" r="2.5" fill="#92400e"/></g></g>' +
        '<rect x="196" y="140" width="34" height="9" rx="3" fill="#e5e7eb" opacity=".9"/>' +
        '<path d="M244 106 L288 120" stroke="#1f2937" stroke-width="12" stroke-linecap="round"/><path d="M244 106 L288 120" stroke="#9ca3af" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M282 90 L316 98 L318 144 L284 146 Z" fill="url(#gmBl)" stroke="#1e3a8a" stroke-width="3"/><path d="M290 100 L312 105 M290 118 L313 122" stroke="#93c5fd" stroke-width="2"/><path d="M286 148 L320 146" stroke="#e5e7eb" stroke-width="4"/>' +
        '</svg>';

    function sweepAway(box, modal, onHit, done) {
        var W = global.innerWidth, r = box.getBoundingClientRect(), bh = doc.createElement('div'); bh.className = 'gm-backhoe'; bh.innerHTML = SVG; doc.body.appendChild(bh);
        var topY = r.bottom + 8 - 164, front = 314, a = 0.0004, v0 = 0.25, t0 = null, hit = false, lastDust = 0, dusts = [];
        box.classList.add('gm-away'); box.style.transformOrigin = 'left bottom';
        function frame(ts) {
            if (t0 == null) t0 = ts; var t = ts - t0, x = -330 + v0 * t + 0.5 * a * t * t, shift = Math.max(0, x + front - r.left);
            bh.style.transform = 'translate(' + x + 'px,' + topY + 'px)';
            if (shift > 0) {
                if (!hit) { hit = true; try { onHit(); } catch (e) { } }
                var tilt = Math.min(7, shift * 0.02); box.style.transform = 'translate(' + shift + 'px,' + (-Math.min(14, shift * 0.04)) + 'px) rotate(' + (-tilt) + 'deg)';
                modal.style.background = 'rgba(2,8,20,' + Math.max(0, 0.72 - shift / (W + r.width) * 0.9).toFixed(3) + ')'; modal.style.backdropFilter = 'blur(' + Math.max(0, 6 - shift / 200) + 'px)';
            }
            if (ts - lastDust > 70 && x > -200 && x < W) { lastDust = ts; var d = doc.createElement('div'); d.className = 'gm-dust'; d.style.left = (x + 70) + 'px'; d.style.top = (topY + 150) + 'px'; doc.body.appendChild(d); dusts.push({ el: d, t: ts, x: x + 70, y: topY + 150 }); }
            dusts = dusts.filter(function (p) { var k = (ts - p.t) / 900; if (k >= 1) { p.el.remove(); return false; } p.el.style.opacity = (0.7 * (1 - k)).toFixed(2); p.el.style.transform = 'translate(' + (-k * 30) + 'px,' + (-k * 26) + 'px) scale(' + (1 + k * 1.6) + ')'; return true; });
            if (x < W + 20 || shift < W - r.left + r.width + 40) global.requestAnimationFrame(frame);
            else { bh.remove(); dusts.forEach(function (p) { p.el.remove(); }); box.classList.remove('gm-away'); box.style.transform = ''; box.style.transformOrigin = ''; modal.style.background = ''; modal.style.backdropFilter = ''; done(); }
        }
        global.requestAnimationFrame(frame);
    }

    function gmConfirm(mensaje, opts) {
        opts = opts || {};
        return new Promise(function (resolve) {
            var modal = doc.getElementById('gmConfirmModal'), msg = doc.getElementById('gmConfirmMsg'), title = doc.getElementById('gmConfirmTitle'), btnOk = doc.getElementById('gmConfirmOk'), btnCancel = doc.getElementById('gmConfirmCancel'), icon = modal && modal.querySelector('.gm-confirm-icon'), box = modal && modal.querySelector('.gm-confirm-box');
            if (!modal || !msg || !btnOk || !btnCancel || !box) { resolve(global.confirm(mensaje)); return; }
            var okTxt = opts.okTexto || 'Eliminar', tono = opts.tono || (RED.test(okTxt + ' ' + (opts.titulo || '')) ? 'peligro' : 'ok');
            if (title) title.textContent = opts.titulo || 'Confirmar acción'; msg.textContent = mensaje || '¿Estás seguro?'; btnOk.textContent = okTxt; btnCancel.textContent = opts.cancelTexto || 'Cancelar';
            box.classList.toggle('gm-tono-ok', tono === 'ok'); if (icon) icon.textContent = opts.icono || (tono === 'ok' ? '✓' : '⚠');
            modal.hidden = false; var busy = false;
            function cleanup() { btnOk.onclick = null; btnCancel.onclick = null; modal.onclick = null; doc.removeEventListener('keydown', onKey); }
            function accept() {
                if (busy) return; busy = true; cleanup();
                var reduce = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
                if (reduce) { modal.hidden = true; resolve(true); return; }
                btnOk.disabled = btnCancel.disabled = true;
                sweepAway(box, modal, function () { resolve(true); }, function () { modal.hidden = true; btnOk.disabled = btnCancel.disabled = false; });
            }
            function cancel() { if (busy) return; busy = true; cleanup(); modal.hidden = true; resolve(false); }
            function onKey(e) { if (e.key === 'Escape') cancel(); if (e.key === 'Enter') accept(); }
            btnOk.onclick = accept; btnCancel.onclick = cancel; modal.onclick = function (e) { if (e.target === modal) cancel(); }; doc.addEventListener('keydown', onKey);
            setTimeout(function () { try { btnCancel.focus(); } catch (e) { } }, 30);
        });
    }
    global.gmConfirm = gmConfirm;

    /* confirmación previa en acciones de publicar / agregar / entregar */
    var ACTIONS = {
        btnCrearTarea: ['Publicar tarea', '¿Publicar esta tarea para los estudiantes?', 'Publicar'],
        btnSubirPres: ['Subir material', '¿Subir este material para que lo vean los estudiantes?', 'Subir'],
        btnEntregar: ['Entregar actividad', '¿Entregar esta actividad? Después podrías no poder modificarla.', 'Entregar'],
        btnAdminAddDocente: ['Agregar docente', '¿Dar rol de docente a este correo?', 'Agregar'],
        btnAdminPromo: ['Otorgar administrador', '¿Otorgar permisos de administrador a este correo?', 'Otorgar'],
        btnAdminTeamAdd: ['Agregar al equipo', '¿Agregar a esta persona al equipo creador?', 'Agregar'],
        btnAdminCivixAvatarReset: ['Restablecer avatar', '¿Restablecer la imagen de Civix a la predeterminada?', 'Restablecer']
    };
    doc.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('button[id]'); if (!b || !ACTIONS[b.id] || b.__gmOk) return;
        e.preventDefault(); e.stopImmediatePropagation(); var a = ACTIONS[b.id];
        gmConfirm(a[1], { titulo: a[0], okTexto: a[2] }).then(function (ok) { if (ok) { b.__gmOk = true; try { b.click(); } finally { b.__gmOk = false; } } });
    }, true);
})(typeof window !== 'undefined' ? window : globalThis);
