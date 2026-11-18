/* GeoMetrics Verified — interfaz:
 *   1) Bloque «Verificación GeoMetrics» en el perfil (estado real + solicitar / cancelar / reenviar).
 *   2) Tarjeta «GeoMetrics Verified» en el panel de administración (pendientes, verificados, historial,
 *      aprobar, rechazar, revocar y verificar directamente a un usuario registrado).
 *   3) Distintivo junto al nombre en los chips de usuario, el perfil y los menús de cuenta.
 * Requiere js/gm-verified.js (objeto GMV). Las reglas de Firebase son las que impiden autoverificarse.
 */
(function (global) {
    var doc = global.document;
    function $(id) { return doc.getElementById(id); }
    var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var norm = function (e) { return String(e || '').trim().toLowerCase(); };
    function yo() { try { return norm(global.GeoAuth ? GeoAuth.email() : ''); } catch (e) { return ''; } }
    function sesion() { try { return typeof aulaGetSession === 'function' ? aulaGetSession() : null; } catch (e) { return null; } }
    function esAdmin() { try { return typeof aulaEsAdminEmail === 'function' && aulaEsAdminEmail(yo()); } catch (e) { return false; } }
    function fecha(ms) {
        if (!ms) return '—';
        try { return new Date(ms).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return '—'; }
    }
    function nombreDe(email) {
        try { if (typeof aulaNombreRegistro === 'function') return aulaNombreRegistro({ email: email }); } catch (e) {}
        return email;
    }
    function fotoDe(email) { try { return typeof aulaFotoUsuario === 'function' ? aulaFotoUsuario({ email: email }) : ''; } catch (e) { return ''; } }
    function avatar(email, nombre) {
        var f = fotoDe(email), p = String(nombre || email).split(/[\s.@]+/).filter(Boolean);
        var ini = ((p[0] || '?')[0] + ((p[1] || '')[0] || '')).toUpperCase();
        return f ? '<div class="gm-usr-av con-foto"><img src="' + esc(f) + '" alt="" loading="lazy"></div>' : '<div class="gm-usr-av">' + esc(ini) + '</div>';
    }

    /* =================== 1) Perfil =================== */
    function bloquePerfil() {
        var pane = $('perfilPaneDatos'), row = $('perfilBadgesRow');
        if (!pane || !row || !global.GMV) return;
        /* La insignia «✓ Institucional» anterior era fija: ahora muestra el estado real */
        var old = $('perfilBadgeVerificado');
        var st = GMV.miEstado();
        if (old) {
            var txt = st.estado === 'verified' ? (GMV.TIPO[st.tipo] || 'Verificado') : st.estado === 'pending' ? 'Verificación pendiente' : 'Sin verificar';
            old.textContent = txt;
            old.classList.toggle('perfil-mini-ok', st.estado === 'verified');
        }
        var box = $('gmvPerfil');
        if (!box) {
            box = doc.createElement('div'); box.id = 'gmvPerfil'; box.className = 'gmv-perfil';
            row.parentNode.insertBefore(box, row.nextSibling);
            box.addEventListener('click', accionPerfil);
        }
        var u = sesion() || {}, tipo = u.rol === 'docente' ? 'docente' : 'estudiante', h;
        if (st.estado === 'verified') {
            h = '<div class="gmv-perfil-h">' + GMV.icono('l') + '<div><b>' + esc(GMV.TIPO[st.tipo] || 'Cuenta verificada') + '</b>' +
                '<span>Cuenta verificada por GeoMetrics · desde el ' + esc(fecha(st.en)) + '</span></div></div>';
        } else if (st.estado === 'pending') {
            h = '<div class="gmv-perfil-h is-pend">' + GMV.icono('l') + '<div><b>Verificación pendiente</b>' +
                '<span>Enviaste tu solicitud el ' + esc(fecha(st.en)) + '; un administrador la revisará.</span></div></div>' +
                '<button type="button" class="gmv-btn ghost" data-gmv-act="cancelar">Cancelar solicitud</button>';
        } else {
            h = '<div class="gmv-perfil-h is-off">' + GMV.icono('l') + '<div><b>' + (st.estado === 'rejected' ? 'Solicitud rechazada' : 'Cuenta sin verificar') + '</b>' +
                '<span>' + (st.estado === 'rejected'
                    ? 'Motivo: ' + esc(st.motivo || 'no indicado') + '. Puedes corregir los datos y enviarla de nuevo.'
                    : 'El distintivo GeoMetrics Verified confirma tu vinculación académica. Lo otorga un administrador después de revisar tu solicitud.') + '</span></div></div>' +
                '<div class="gmv-form" hidden>' +
                    '<label>Tipo de verificación<select data-gmv-f="type"><option value="estudiante"' + (tipo === 'estudiante' ? ' selected' : '') + '>Estudiante</option><option value="docente"' + (tipo === 'docente' ? ' selected' : '') + '>Docente</option></select></label>' +
                    '<label>Información institucional<input type="text" data-gmv-f="info" maxlength="300" placeholder="' + (tipo === 'docente' ? 'Cargo, dependencia o vinculación docente' : 'Código estudiantil, programa y semestre') + '"></label>' +
                    '<label>Mensaje para el administrador (opcional)<textarea data-gmv-f="message" rows="2" maxlength="500"></textarea></label>' +
                    '<div class="gmv-form-act"><button type="button" class="gmv-btn" data-gmv-act="enviar">Enviar solicitud</button><button type="button" class="gmv-btn ghost" data-gmv-act="cerrar">Cancelar</button></div>' +
                '</div>' +
                '<button type="button" class="gmv-btn" data-gmv-act="abrir">' + (st.estado === 'rejected' ? 'Enviar de nuevo' : 'Solicitar verificación') + '</button>';
        }
        h += '<p class="gmv-msg" hidden></p>';
        if (box.__h !== h) { box.__h = h; box.innerHTML = h; }
        var t = $('perfilNombreTitulo'); if (t) GMV.after(t, yo(), 'm');
    }
    function msgPerfil(box, t, err) { var m = box.querySelector('.gmv-msg'); if (m) { m.hidden = !t; m.textContent = t || ''; m.classList.toggle('err', !!err); } }
    function accionPerfil(e) {
        var b = e.target.closest('[data-gmv-act]'); if (!b) return;
        var box = $('gmvPerfil'), a = b.getAttribute('data-gmv-act'), f = box.querySelector('.gmv-form');
        if (a === 'abrir') { if (f) { f.hidden = false; b.hidden = true; var i = f.querySelector('[data-gmv-f="info"]'); if (i) i.focus(); } return; }
        if (a === 'cerrar') { if (f) f.hidden = true; var ab = box.querySelector('[data-gmv-act="abrir"]'); if (ab) ab.hidden = false; return; }
        if (a === 'enviar') {
            var get = function (n) { var x = f.querySelector('[data-gmv-f="' + n + '"]'); return x ? x.value.trim() : ''; };
            if (get('info').length < 4) { msgPerfil(box, 'Escribe tu información institucional para que el administrador pueda revisarla.', true); return; }
            b.disabled = true; b.textContent = 'Enviando…';
            GMV.solicitar({ type: get('type'), info: get('info'), message: get('message') })
                .then(function () { box.__h = ''; bloquePerfil(); msgPerfil($('gmvPerfil'), 'Solicitud enviada. Te avisaremos aquí cuando sea revisada.'); })
                .catch(function (ex) { b.disabled = false; b.textContent = 'Enviar solicitud'; msgPerfil(box, 'No se pudo enviar: ' + (ex && ex.message || ex), true); });
            return;
        }
        if (a === 'cancelar') {
            if (!confirm('¿Cancelar tu solicitud de verificación?')) return;
            b.disabled = true;
            GMV.cancelar().then(function () { box.__h = ''; bloquePerfil(); }).catch(function (ex) { b.disabled = false; msgPerfil(box, 'No se pudo cancelar: ' + (ex && ex.message || ex), true); });
        }
    }

    /* =================== 2) Panel de administración =================== */
    var A = { tab: 'pend', reqs: [], log: [], users: [], cargando: false, q: '' };
    function tarjetaAdmin() {
        var grid = doc.querySelector('#pantallaAdmin .aula-grid'); if (!grid) return null;
        var c = $('adminVerifiedCard');
        if (!c) {
            c = doc.createElement('div'); c.id = 'adminVerifiedCard'; c.className = 'aula-card gmv-admin';
            c.innerHTML = '<div class="gmv-admin-hd">' + (global.GMV ? GMV.icono('l') : '') +
                '<div><small>IDENTIDAD ACADÉMICA</small><h3>GeoMetrics Verified</h3><p class="login-hint">Aprueba, rechaza o revoca el distintivo. Cada acción queda registrada con su autor, fecha y hora.</p></div>' +
                '<button type="button" class="btn-limpiar" data-gmva="refrescar">Actualizar</button></div>' +
                '<div class="gmv-tabs" role="tablist">' +
                    '<button type="button" data-gmva-tab="pend" role="tab">Pendientes <span data-gmva-n="pend">0</span></button>' +
                    '<button type="button" data-gmva-tab="ver" role="tab">Verificados <span data-gmva-n="ver">0</span></button>' +
                    '<button type="button" data-gmva-tab="nuevo" role="tab">Verificar usuario</button>' +
                    '<button type="button" data-gmva-tab="hist" role="tab">Historial</button>' +
                '</div><p class="gm-usr-msg" data-gmva-msg hidden></p><div class="gmv-admin-body"></div>';
            var ref = $('adminUsuariosCard');
            if (ref && ref.parentNode === grid) grid.insertBefore(c, ref.nextSibling); else grid.appendChild(c);
            c.addEventListener('click', accionAdmin);
            c.addEventListener('input', function (e) { if (e.target.matches('[data-gmva-q]')) { A.q = e.target.value; pintarAdmin(true); } });
        }
        return c;
    }
    function msgAdmin(t, tipo) {
        var m = doc.querySelector('[data-gmva-msg]'); if (!m) return;
        m.hidden = !t; m.textContent = t || ''; m.className = 'gm-usr-msg' + (tipo ? ' is-' + tipo : '');
    }
    function cargarAdmin() {
        if (!global.GMV || !esAdmin()) return;
        A.cargando = true; pintarAdmin();
        return Promise.all([
            GMV.admin.solicitudes().catch(function () { return null; }),
            GMV.admin.historial(200).catch(function () { return null; }),
            global.GeoCloud && GeoCloud.listAllUsers ? GeoCloud.listAllUsers().catch(function () { return []; }) : []
        ]).then(function (r) {
            A.cargando = false;
            if (r[0] === null) msgAdmin('No se pudieron leer las solicitudes. Publica las reglas nuevas de Firebase (verifyRequests, verified, verifyLog).', 'error');
            A.reqs = r[0] || []; A.log = r[1] || []; A.users = r[2] || [];
            pintarAdmin();
        });
    }
    function filaUsuario(email, nombre, extra, botones) {
        return '<div class="gmv-row">' + avatar(email, nombre) +
            '<div class="gm-usr-info"><strong>' + esc(nombre || email) + GMV.slot(email, 'xs') + '</strong><span class="gm-usr-mail">' + esc(email) + '</span>' +
            (extra ? '<span class="gm-usr-det gmv-extra">' + extra + '</span>' : '') + '</div>' +
            '<div class="gmv-row-act">' + botones + '</div></div>';
    }
    function pintarAdmin(soloLista) {
        var c = tarjetaAdmin(); if (!c || !global.GMV) return;
        var pend = A.reqs.filter(function (r) { return r.status === 'pending'; }), ver = GMV.admin.verificados();
        c.querySelector('[data-gmva-n="pend"]').textContent = pend.length;
        c.querySelector('[data-gmva-n="ver"]').textContent = ver.length;
        c.querySelectorAll('[data-gmva-tab]').forEach(function (b) { var on = b.getAttribute('data-gmva-tab') === A.tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
        var body = c.querySelector('.gmv-admin-body'), h = '';
        if (A.cargando && !A.reqs.length && !A.log.length) h = '<p class="gm-usr-vacio">Cargando…</p>';
        else if (A.tab === 'pend') {
            var rech = A.reqs.filter(function (r) { return r.status === 'rejected'; });
            h = pend.length ? pend.map(function (r) {
                var extra = esc(GMV.TIPO[r.type] ? 'Solicita: ' + GMV.TIPO[r.type] : '') + ' · ' + esc(fecha(r.at)) +
                    (r.info ? '<br><b>Información institucional:</b> ' + esc(r.info) : '') + (r.message ? '<br><b>Mensaje:</b> ' + esc(r.message) : '');
                return filaUsuario(r.email, r.nombre || nombreDe(r.email), extra,
                    '<select data-gmva-type="' + esc(r.email) + '"><option value="estudiante"' + (r.type === 'estudiante' ? ' selected' : '') + '>Estudiante</option><option value="docente"' + (r.type === 'docente' ? ' selected' : '') + '>Docente</option></select>' +
                    '<button type="button" class="gmv-btn" data-gmva="aprobar" data-email="' + esc(r.email) + '">Aprobar</button>' +
                    '<button type="button" class="gmv-btn danger" data-gmva="rechazar" data-email="' + esc(r.email) + '">Rechazar</button>');
            }).join('') : '<p class="gm-usr-vacio">No hay solicitudes pendientes.</p>';
            if (rech.length) h += '<details class="gm-usr-eliminados"><summary>Solicitudes rechazadas <span>' + rech.length + '</span></summary>' + rech.map(function (r) {
                return filaUsuario(r.email, r.nombre || nombreDe(r.email), 'Rechazada el ' + esc(fecha(r.reviewedAt)) + ' por ' + esc(r.reviewedBy || '—') + (r.reason ? '<br><b>Motivo:</b> ' + esc(r.reason) : ''), '');
            }).join('') + '</details>';
        } else if (A.tab === 'ver') {
            h = ver.length ? ver.map(function (v) {
                return filaUsuario(v.email, nombreDe(v.email), esc(GMV.TIPO[v.type] || '') + ' · desde ' + esc(fecha(v.at)) + ' · aprobado por ' + esc(v.by) + (v.note ? '<br>' + esc(v.note) : ''),
                    '<button type="button" class="gmv-btn danger" data-gmva="revocar" data-email="' + esc(v.email) + '">Revocar</button>');
            }).join('') : '<p class="gm-usr-vacio">Todavía no hay cuentas verificadas.</p>';
        } else if (A.tab === 'nuevo') {
            var q = norm(A.q);
            var lista = A.users.filter(function (u) { return !GMV.isVerified(u.email); }).filter(function (u) {
                return !q || norm((u.nombre || '') + ' ' + u.email + ' ' + (u.codigo || '')).indexOf(q) >= 0;
            }).slice(0, 60);
            if (!soloLista || !body.querySelector('[data-gmva-q]')) {
                body.innerHTML = '<input type="search" data-gmva-q placeholder="Buscar usuario registrado por nombre, correo o código…" value="' + esc(A.q) + '" autocomplete="off"><div data-gmva-lista></div>';
            }
            var box = body.querySelector('[data-gmva-lista]');
            box.innerHTML = lista.length ? lista.map(function (u) {
                var t = u.rol === 'docente' ? 'docente' : 'estudiante';
                return filaUsuario(u.email, u.nombre || nombreDe(u.email), esc(u.rol === 'docente' ? 'Docente' : 'Estudiante') + (u.codigo ? ' · Código ' + esc(u.codigo) : ''),
                    '<select data-gmva-type="' + esc(u.email) + '"><option value="estudiante"' + (t === 'estudiante' ? ' selected' : '') + '>Estudiante</option><option value="docente"' + (t === 'docente' ? ' selected' : '') + '>Docente</option></select>' +
                    '<button type="button" class="gmv-btn" data-gmva="aprobar" data-email="' + esc(u.email) + '">Verificar</button>');
            }).join('') : '<p class="gm-usr-vacio">' + (A.users.length ? 'Ningún usuario sin verificar coincide con la búsqueda.' : 'No hay usuarios registrados para mostrar.') + '</p>';
            return;
        } else {
            var ACC = { approve: ['Aprobó', 'ok'], reject: ['Rechazó', 'warn'], revoke: ['Revocó', 'bad'] };
            h = A.log.length ? '<div class="gmv-hist">' + A.log.map(function (l) {
                var a = ACC[l.action] || [l.action, ''];
                return '<div class="gmv-hist-row"><span class="gmv-hist-a ' + a[1] + '">' + esc(a[0]) + '</span>' +
                    '<div><b>' + esc(nombreDe(l.target)) + '</b> <small>' + esc(l.target) + '</small>' +
                    '<span>' + (l.type ? esc(GMV.TIPO[l.type] || l.type) + ' · ' : '') + 'por ' + esc(l.by) + ' · ' + esc(fecha(l.at)) + '</span>' +
                    (l.reason ? '<em>' + esc(l.reason) + '</em>' : '') + '</div></div>';
            }).join('') + '</div>' : '<p class="gm-usr-vacio">Aún no hay acciones registradas.</p>';
        }
        if (body.__h !== h) { body.__h = h; body.innerHTML = h; }
    }
    function accionAdmin(e) {
        var t = e.target.closest('[data-gmva-tab]');
        if (t) { A.tab = t.getAttribute('data-gmva-tab'); var body = doc.querySelector('#adminVerifiedCard .gmv-admin-body'); if (body) { body.__h = ''; body.innerHTML = ''; } pintarAdmin(); return; }
        var b = e.target.closest('[data-gmva]'); if (!b) return;
        var a = b.getAttribute('data-gmva'), email = b.getAttribute('data-email');
        if (a === 'refrescar') { msgAdmin(''); cargarAdmin(); return; }
        var fin = function (texto) { msgAdmin(texto, 'ok'); return cargarAdmin(); };
        var fallo = function (ex) { b.disabled = false; msgAdmin('No se pudo completar: ' + (ex && ex.message || ex), 'error'); };
        if (a === 'aprobar') {
            var sel = doc.querySelector('#adminVerifiedCard [data-gmva-type="' + email + '"]'), tipo = sel ? sel.value : 'estudiante';
            if (!confirm('¿Otorgar el distintivo GeoMetrics Verified (' + GMV.TIPO[tipo] + ') a ' + nombreDe(email) + ' (' + email + ')?')) return;
            b.disabled = true;
            GMV.admin.aprobar(email, tipo).then(function () { return fin('Distintivo otorgado a ' + email + '.'); }).catch(fallo);
        } else if (a === 'rechazar') {
            var motivo = prompt('Motivo del rechazo (lo verá la persona en su perfil):', '');
            if (motivo === null) return;
            if (!String(motivo).trim()) { msgAdmin('Escribe un motivo para rechazar la solicitud.', 'error'); return; }
            b.disabled = true;
            GMV.admin.rechazar(email, motivo.trim()).then(function () { return fin('Solicitud de ' + email + ' rechazada.'); }).catch(fallo);
        } else if (a === 'revocar') {
            var m2 = prompt('Motivo de la revocación (queda en el historial):', '');
            if (m2 === null) return;
            if (!String(m2).trim()) { msgAdmin('Escribe un motivo para revocar el distintivo.', 'error'); return; }
            b.disabled = true;
            GMV.admin.revocar(email, m2.trim()).then(function () { return fin('Distintivo revocado a ' + email + '.'); }).catch(fallo);
        }
    }

    /* =================== 3) Distintivo junto a los nombres propios =================== */
    function colocarPropios() {
        if (!global.GMV) return;
        var e = yo(); if (!e) return;
        ['avUserName', 'dpUserName'].forEach(function (id) { var x = $(id); if (x) GMV.after(x, e, 's'); });
        var t = $('perfilNombreTitulo'); if (t) GMV.after(t, e, 'm');
    }

    /* =================== Montaje =================== */
    /* Algunas pantallas conservan el atributo hidden aunque un estilo en línea las muestre: manda el display real */
    function visible(el) { return !!(el && getComputedStyle(el).display !== 'none'); }
    function iniciar() {
        var modal = $('modalPerfil');
        if (modal && global.MutationObserver) new MutationObserver(function () { if (visible(modal)) bloquePerfil(); })
            .observe(modal, { attributes: true, attributeFilter: ['hidden', 'style'] });
        var pant = $('pantallaAdmin'), estaba = false;
        if (pant && global.MutationObserver) new MutationObserver(function () {
            var v = visible(pant);
            if (v && !estaba && esAdmin()) { tarjetaAdmin(); cargarAdmin(); }
            estaba = v;
        }).observe(pant, { attributes: true, attributeFilter: ['style', 'hidden'] });
        global.addEventListener('gm-verified-changed', function () {
            colocarPropios();
            if (visible($('modalPerfil'))) bloquePerfil();
            if (visible($('pantallaAdmin')) && $('adminVerifiedCard')) pintarAdmin();
        });
        global.addEventListener('geometrics-perfil-actualizado', colocarPropios);
        colocarPropios();
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar); else iniciar();
    global.GMVUI = { cargarAdmin: cargarAdmin, bloquePerfil: bloquePerfil };
})(window);
