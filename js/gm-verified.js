/* GeoMetrics Verified — distintivo de verificación académica.
 *
 * Datos (Firebase Realtime Database; ver firebase/database.rules.json):
 *   verified/{correo}        distintivo vigente {status:'verified', type:'docente'|'estudiante', email, by, at, note?}
 *                            → solo administradores escriben; lo leen todos los usuarios con sesión.
 *   verifyRequests/{correo}  solicitud {email, type, status:'pending'|'rejected', at, nombre?, info?, message?,
 *                            reviewedBy?, reviewedAt?, reason?} → la persona crea/cancela la suya; el admin la revisa.
 *   verifyLog/{id}           historial inalterable {target, action:'approve'|'reject'|'revoke', type?, by, at, reason?}.
 *
 * El distintivo NUNCA se lee del perfil (users/), que cualquier cuenta puede reescribir: solo de verified/.
 *
 * Uso desde otros módulos:
 *   GMV.slot(email, 'xs'|'s'|'m'|'l')  → '<span class="gmv-slot" …>' que se rellena solo si la cuenta está verificada.
 *   GMV.after(elemento, email, tamaño) → coloca (o actualiza) el hueco justo después de un elemento con nombre.
 */
(function (global) {
    var doc = global.document;
    var ME_KEY = function (e) { return String(e || '').toLowerCase().replace(/\./g, ',').replace(/@/g, '_at_'); };
    var norm = function (e) { return String(e || '').trim().toLowerCase(); };
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var TIPO = { docente: 'Docente verificado', estudiante: 'Estudiante verificado' };

    var S = { verified: {}, mine: null, ready: false };

    /* ---------------- Distintivo (SVG original) ---------------- */
    var SPRITE = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true" focusable="false"><defs>' +
        '<linearGradient id="gmvL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fd8ff"/><stop offset=".45" stop-color="#2588F5"/><stop offset="1" stop-color="#1264C5"/></linearGradient>' +
        '<linearGradient id="gmvR" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#49C6F5"/><stop offset=".5" stop-color="#1a6fd6"/><stop offset="1" stop-color="#0b3f86"/></linearGradient>' +
        '<linearGradient id="gmvRim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#bfeaff"/><stop offset=".5" stop-color="#2a7fe0"/><stop offset="1" stop-color="#07182F"/></linearGradient>' +
        '<linearGradient id="gmvGl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
        '<symbol id="gmv-shield" viewBox="0 0 64 64">' +
        /* sombra de apoyo */
        '<path d="M32 6.5 55.5 14v18.2C55.5 46 46 56 32 62 18 56 8.5 46 8.5 32.2V14Z" fill="#07182F" opacity=".35" transform="translate(0 1.6)"/>' +
        /* borde exterior */
        '<path d="M32 3 57 11v20.6C57 46.6 46.8 57.4 32 63.4 17.2 57.4 7 46.6 7 31.6V11Z" fill="url(#gmvRim)"/>' +
        /* caras del escudo: mitad clara y mitad oscura dan el volumen geométrico */
        '<path d="M32 7.2 11 14v17.4C11 44.2 19.6 53.4 32 58.8Z" fill="url(#gmvL)"/>' +
        '<path d="M32 7.2 53 14v17.4C53 44.2 44.4 53.4 32 58.8Z" fill="url(#gmvR)"/>' +
        /* facetas internas */
        '<path d="M32 7.2 11 14l21 9.5Z" fill="#fff" opacity=".18"/>' +
        '<path d="M32 7.2 53 14 32 23.5Z" fill="#fff" opacity=".08"/>' +
        '<path d="M11 31.4C11 44.2 19.6 53.4 32 58.8V40Z" fill="#07182F" opacity=".12"/>' +
        /* brillo sutil */
        '<path d="M32 7.2 11 14v9.5C18 18 25 16 32 15.6Z" fill="url(#gmvGl)"/>' +
        /* marca de verificación con sombra para que se lea en tamaños pequeños */
        '<path d="M20.5 33.2 28.4 41 44 24.6" fill="none" stroke="#07182F" stroke-opacity=".35" stroke-width="7.6" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 1.4)"/>' +
        '<path d="M20.5 33.2 28.4 41 44 24.6" fill="none" stroke="#fff" stroke-width="6.4" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</symbol></defs></svg>';
    function asegurarSprite() {
        if (doc.getElementById('gmv-sprite')) return;
        var d = doc.createElement('div'); d.id = 'gmv-sprite'; d.innerHTML = SPRITE;
        (doc.body || doc.documentElement).appendChild(d);
    }
    /** SVG del escudo (sin depender de datos): para leyendas, ayuda y el panel admin. */
    function icono(size, titulo) {
        return '<svg class="gmv-svg" viewBox="0 0 64 64" role="img" aria-label="' + esc(titulo || 'GeoMetrics Verified') + '"><use href="#gmv-shield"></use></svg>';
    }
    function tituloDe(v) { return 'Cuenta verificada por GeoMetrics' + (v && TIPO[v.type] ? ' · ' + TIPO[v.type] : ''); }
    /** HTML del distintivo para un correo; '' si la cuenta no está verificada en Firebase. */
    function badge(email, size) {
        var v = S.verified[ME_KEY(email)];
        if (!v || v.status !== 'verified') return '';
        var t = tituloDe(v);
        return '<span class="gmv-badge gmv-' + (size || 's') + '" tabindex="0" role="img" title="' + esc(t) + '" aria-label="' + esc(t) + '" data-gmv-tip="' + esc(t) + '">' + icono(size, t) + '</span>';
    }
    function slot(email, size) {
        email = norm(email);
        if (!email) return '';
        return '<span class="gmv-slot" data-gmv="' + esc(email) + '" data-gmv-size="' + (size || 's') + '">' + badge(email, size) + '</span>';
    }
    /** Pone el hueco del distintivo justo después de `el` (idempotente). */
    function after(el, email, size) {
        if (!el || !el.parentNode) return;
        email = norm(email);
        var s = el.nextElementSibling;
        if (!s || !s.classList.contains('gmv-slot')) {
            if (!email) return;
            s = doc.createElement('span'); s.className = 'gmv-slot';
            el.parentNode.insertBefore(s, el.nextSibling);
        }
        if (s.getAttribute('data-gmv') !== email || s.getAttribute('data-gmv-size') !== (size || 's')) {
            s.setAttribute('data-gmv', email); s.setAttribute('data-gmv-size', size || 's');
        }
        pintarSlot(s);
    }
    function pintarSlot(s) {
        var html = badge(s.getAttribute('data-gmv'), s.getAttribute('data-gmv-size'));
        if (s.__h !== html) { s.__h = html; s.innerHTML = html; }
    }
    function decorar(root) {
        (root || doc).querySelectorAll('.gmv-slot[data-gmv]').forEach(pintarSlot);
    }

    /* Descripción al tocar el distintivo (en pantallas táctiles no hay "hover") */
    var tip;
    function mostrarTip(b) {
        if (!tip) { tip = doc.createElement('div'); tip.className = 'gmv-tip'; tip.setAttribute('role', 'tooltip'); doc.body.appendChild(tip); }
        tip.innerHTML = '<span class="gmv-tip-ico">' + icono('s') + '</span><span><b>Cuenta verificada por GeoMetrics</b>' +
            (b.getAttribute('data-gmv-tip').split(' · ')[1] ? '<small>' + esc(b.getAttribute('data-gmv-tip').split(' · ')[1]) + '</small>' : '') + '</span>';
        var r = b.getBoundingClientRect();
        tip.hidden = false;
        var w = tip.offsetWidth;
        tip.style.left = Math.round(Math.max(8, Math.min(global.innerWidth - w - 8, r.left + r.width / 2 - w / 2))) + 'px';
        tip.style.top = Math.round(r.bottom + 8) + 'px';
        clearTimeout(tip.__t); tip.__t = setTimeout(function () { tip.hidden = true; }, 2600);
    }
    doc.addEventListener('click', function (e) {
        var b = e.target.closest && e.target.closest('.gmv-badge');
        if (b) { e.preventDefault(); e.stopPropagation(); mostrarTip(b); }
        else if (tip && !tip.hidden) tip.hidden = true;
    }, true);
    doc.addEventListener('keydown', function (e) {
        var b = e.target.closest && e.target.closest('.gmv-badge');
        if (b && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); mostrarTip(b); }
    });

    /* ---------------- Datos ---------------- */
    function db() {
        try { if (global.GeoAuth) GeoAuth.firebaseApp(); return global.firebase && firebase.apps && firebase.apps.length ? firebase.database() : null; } catch (e) { return null; }
    }
    function yo() { try { return norm(global.GeoAuth ? GeoAuth.email() : ''); } catch (e) { return ''; } }
    function emitir() {
        decorar();
        try { global.dispatchEvent(new CustomEvent('gm-verified-changed', { detail: { mine: S.mine } })); } catch (e) {}
    }
    var escuchandoMio = '';
    function escuchar() {
        if (!global.GeoCloud || !GeoCloud.authed || !GeoCloud.authed()) return;
        if (!S.ready && GeoCloud.cloudListen) {
            S.ready = true;
            GeoCloud.cloudListen('verified', function (val) { S.verified = (val && typeof val === 'object') ? val : {}; emitir(); });
        }
        var e = yo();
        if (e && escuchandoMio !== e && GeoCloud.cloudListen) {
            escuchandoMio = e;
            GeoCloud.cloudListen('verifyRequests/' + ME_KEY(e), function (val) { S.mine = val || null; emitir(); });
        }
    }
    global.addEventListener('geometrics-auth-changed', function (ev) {
        if (ev.detail && ev.detail.verified) setTimeout(escuchar, 200);
        else { S.verified = {}; S.mine = null; S.ready = false; escuchandoMio = ''; emitir(); }
    });

    /** Estado de la cuenta con sesión: 'verified' | 'pending' | 'rejected' | 'none'. */
    function miEstado() {
        var e = yo(), v = S.verified[ME_KEY(e)];
        if (v && v.status === 'verified') return { estado: 'verified', tipo: v.type, por: v.by, en: v.at };
        if (S.mine && S.mine.status === 'pending') return { estado: 'pending', tipo: S.mine.type, en: S.mine.at };
        if (S.mine && S.mine.status === 'rejected') return { estado: 'rejected', tipo: S.mine.type, motivo: S.mine.reason || '', en: S.mine.reviewedAt };
        return { estado: 'none' };
    }
    function solicitar(datos) {
        var e = yo(), d = db();
        if (!e || !d) return Promise.reject(new Error('Inicia sesión para solicitar la verificación.'));
        var u = (typeof aulaGetSession === 'function' && aulaGetSession()) || {};
        var nombre = (typeof aulaNombreRegistro === 'function') ? aulaNombreRegistro(u) : (u.nombre || '');
        var req = {
            email: e, type: datos.type === 'docente' ? 'docente' : 'estudiante', status: 'pending',
            at: firebase.database.ServerValue.TIMESTAMP, nombre: String(nombre || '').slice(0, 120)
        };
        if (datos.info) req.info = String(datos.info).slice(0, 300);
        if (datos.message) req.message = String(datos.message).slice(0, 500);
        return d.ref('verifyRequests/' + ME_KEY(e)).set(req);
    }
    function cancelar() {
        var e = yo(), d = db();
        if (!e || !d) return Promise.resolve();
        return d.ref('verifyRequests/' + ME_KEY(e)).remove();
    }

    /* ---------------- Administración (las reglas exigen ser administrador) ---------------- */
    function log(d, target, action, extra) {
        var id = d.ref('verifyLog').push().key, o = { target: target, action: action, by: yo(), at: firebase.database.ServerValue.TIMESTAMP };
        Object.keys(extra || {}).forEach(function (k) { if (extra[k]) o[k] = String(extra[k]).slice(0, 300); });
        return ['verifyLog/' + id, o];
    }
    function aprobar(email, type, note) {
        var d = db(); email = norm(email);
        if (!d || !email) return Promise.reject(new Error('Sin conexión con la base de datos.'));
        type = type === 'docente' ? 'docente' : 'estudiante';
        var k = ME_KEY(email), up = {}, v = { status: 'verified', type: type, email: email, by: yo(), at: firebase.database.ServerValue.TIMESTAMP };
        if (note) v.note = String(note).slice(0, 300);
        up['verified/' + k] = v;
        up['verifyRequests/' + k] = null;
        var l = log(d, email, 'approve', { type: type, reason: note }); up[l[0]] = l[1];
        return d.ref().update(up);
    }
    function rechazar(email, motivo) {
        var d = db(); email = norm(email);
        if (!d || !email) return Promise.reject(new Error('Sin conexión con la base de datos.'));
        var k = ME_KEY(email), up = {};
        up['verifyRequests/' + k + '/status'] = 'rejected';
        up['verifyRequests/' + k + '/reviewedBy'] = yo();
        up['verifyRequests/' + k + '/reviewedAt'] = firebase.database.ServerValue.TIMESTAMP;
        up['verifyRequests/' + k + '/reason'] = String(motivo || 'Sin motivo indicado').slice(0, 300);
        var l = log(d, email, 'reject', { reason: motivo }); up[l[0]] = l[1];
        return d.ref().update(up);
    }
    function revocar(email, motivo) {
        var d = db(); email = norm(email);
        if (!d || !email) return Promise.reject(new Error('Sin conexión con la base de datos.'));
        var k = ME_KEY(email), prev = S.verified[k], up = {};
        up['verified/' + k] = null;
        var l = log(d, email, 'revoke', { type: prev && prev.type, reason: motivo }); up[l[0]] = l[1];
        return d.ref().update(up);
    }
    function leer(path) {
        var d = db();
        if (!d) return Promise.resolve(null);
        return d.ref(path).once('value').then(function (s) { return s.val(); });
    }
    function solicitudes() {
        return leer('verifyRequests').then(function (v) {
            return Object.keys(v || {}).map(function (k) { return Object.assign({ key: k }, v[k]); })
                .sort(function (a, b) { return (a.status === b.status ? 0 : a.status === 'pending' ? -1 : 1) || (b.at || 0) - (a.at || 0); });
        });
    }
    function historial(limite) {
        var d = db();
        if (!d) return Promise.resolve([]);
        return d.ref('verifyLog').orderByChild('at').limitToLast(limite || 200).once('value').then(function (s) {
            var v = s.val() || {};
            return Object.keys(v).map(function (k) { return Object.assign({ id: k }, v[k]); }).sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
        });
    }
    function verificados() {
        return Object.keys(S.verified).map(function (k) { return S.verified[k]; }).filter(function (v) { return v && v.status === 'verified'; })
            .sort(function (a, b) { return (b.at || 0) - (a.at || 0); });
    }

    /* Rellena los huecos que otros módulos agregan al pintar sus listas */
    var pend = false;
    function programar() { if (pend) return; pend = true; setTimeout(function () { pend = false; decorar(); }, 30); }
    function iniciar() {
        asegurarSprite();
        if (global.MutationObserver) new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                var n = muts[i].addedNodes;
                for (var j = 0; j < n.length; j++) {
                    var x = n[j];
                    if (x.nodeType === 1 && (x.classList.contains('gmv-slot') || x.querySelector('.gmv-slot'))) { programar(); return; }
                }
            }
        }).observe(doc.body, { childList: true, subtree: true });
        escuchar();
        setTimeout(escuchar, 1500);
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar); else iniciar();

    global.GMV = {
        TIPO: TIPO,
        icono: icono, badge: badge, slot: slot, after: after, decorar: decorar,
        isVerified: function (email) { var v = S.verified[ME_KEY(email)]; return v && v.status === 'verified' ? v : null; },
        miEstado: miEstado, solicitar: solicitar, cancelar: cancelar,
        admin: { aprobar: aprobar, rechazar: rechazar, revocar: revocar, solicitudes: solicitudes, historial: historial, verificados: verificados }
    };
})(window);
