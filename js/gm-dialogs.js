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
        '<ellipse cx="160" cy="164" rx="140" ry="6" fill="rgba(0,0,0,.35)"/>' +
        '<path d="M92 84 L52 38 L22 66 L36 112" fill="none" stroke="#f5b301" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/>' +
        '<path d="M36 112 L12 120 L18 140 L46 134 Z" fill="#9aa4b2" stroke="#4b5563" stroke-width="3"/>' +
        '<rect x="78" y="82" width="158" height="46" rx="9" fill="#f5b301"/>' +
        '<rect x="168" y="62" width="76" height="30" rx="7" fill="#f5b301"/><rect x="176" y="68" width="52" height="5" fill="#d99a00"/>' +
        '<rect x="96" y="30" width="72" height="58" rx="7" fill="#2563eb"/><rect x="104" y="38" width="56" height="38" rx="4" fill="#bfe3ff"/>' +
        '<circle cx="124" cy="56" r="9" fill="#fb923c"/><rect x="116" y="62" width="16" height="14" rx="3" fill="#fb923c"/>' +
        '<rect x="90" y="22" width="86" height="10" rx="4" fill="#f5b301"/>' +
        '<circle cx="118" cy="130" r="30" fill="#111827"/><circle cx="118" cy="130" r="14" fill="#f5b301"/><circle cx="118" cy="130" r="5" fill="#374151"/>' +
        '<circle cx="224" cy="138" r="22" fill="#111827"/><circle cx="224" cy="138" r="10" fill="#f5b301"/>' +
        '<path d="M238 104 L284 118" stroke="#f5b301" stroke-width="9" stroke-linecap="round"/>' +
        '<path d="M280 92 L314 98 L316 142 L284 144 Z" fill="#2563eb" stroke="#1e3a8a" stroke-width="3"/><path d="M286 146 L318 144" stroke="#cbd5e1" stroke-width="4"/>' +
        '</svg>';

    function sweepAway(box, modal, onHit, done) {
        var W = global.innerWidth, r = box.getBoundingClientRect(), bh = doc.createElement('div'); bh.className = 'gm-backhoe'; bh.innerHTML = SVG; doc.body.appendChild(bh);
        var topY = r.bottom + 8 - 164, front = 314, a = 0.0035, t0 = null, hit = false, lastDust = 0, dusts = [];
        box.classList.add('gm-away'); box.style.transformOrigin = 'left bottom';
        function frame(ts) {
            if (t0 == null) t0 = ts; var t = ts - t0, x = -330 + 0.5 * a * t * t, shift = Math.max(0, x + front - r.left);
            bh.style.transform = 'translate(' + x + 'px,' + topY + 'px)';
            if (shift > 0) {
                if (!hit) { hit = true; try { onHit(); } catch (e) { } }
                var tilt = Math.min(7, shift * 0.02); box.style.transform = 'translate(' + shift + 'px,' + (-Math.min(14, shift * 0.04)) + 'px) rotate(' + (-tilt) + 'deg)';
                modal.style.background = 'rgba(2,8,20,' + Math.max(0, 0.72 - shift / (W + r.width) * 0.9).toFixed(3) + ')'; modal.style.backdropFilter = 'blur(' + Math.max(0, 6 - shift / 200) + 'px)';
            }
            if (ts - lastDust > 45 && x > -200 && x < W) { lastDust = ts; var d = doc.createElement('div'); d.className = 'gm-dust'; d.style.left = (x + 70) + 'px'; d.style.top = (topY + 150) + 'px'; doc.body.appendChild(d); dusts.push({ el: d, t: ts, x: x + 70, y: topY + 150 }); }
            dusts = dusts.filter(function (p) { var k = (ts - p.t) / 600; if (k >= 1) { p.el.remove(); return false; } p.el.style.opacity = (0.7 * (1 - k)).toFixed(2); p.el.style.transform = 'translate(' + (-k * 30) + 'px,' + (-k * 26) + 'px) scale(' + (1 + k * 1.6) + ')'; return true; });
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
