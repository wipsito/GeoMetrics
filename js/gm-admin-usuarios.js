/* GeoMetrics — Panel de administración: usuarios registrados.
   Lista todas las cuentas de users/ y permite eliminarlas de la base de datos
   (perfil, roles, equipo creador) dejando la marca usersDeleted/{correo}, que
   bloquea el reingreso. Una cuenta eliminada se puede volver a permitir. */
(function (global) {
    var SUPER = 'andres.enriquezval@unipamplona.edu.co';
    var estado = { users: [], admins: [], docentes: [], deleted: [], cargando: false };

    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function yo() { try { return String(global.GeoAuth ? GeoAuth.email() : '').toLowerCase(); } catch (e) { return ''; } }
    function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    function fecha(ms) {
        if (!ms) return '';
        try { return new Date(ms).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; }
    }
    function iniciales(n, e) {
        var p = String(n || '').trim().split(/\s+/).filter(Boolean);
        if (p.length) return (p[0][0] + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
        return String(e || '?').charAt(0).toUpperCase();
    }
    function rolDe(u) {
        var e = u.email;
        if (e === SUPER) return 'superadmin';
        if (estado.admins.indexOf(e) >= 0) return 'admin';
        if (u.rol === 'docente' || estado.docentes.indexOf(e) >= 0) return 'docente';
        return u.rol || 'estudiante';
    }
    var ROL_TXT = { superadmin: 'Superadministrador', admin: 'Administrador', docente: 'Docente', estudiante: 'Estudiante' };
    function materias(u) {
        var out = [];
        if (Array.isArray(u.materias)) u.materias.forEach(function (m) { if (m && m.nombre) out.push(m.nombre + (m.grupo ? ' · ' + m.grupo : '')); });
        else if (u.materias && typeof u.materias === 'object') Object.keys(u.materias).forEach(function (k) { var m = u.materias[k]; if (m && m.nombre) out.push(m.nombre + (m.grupo ? ' · ' + m.grupo : '')); });
        if (!out.length && u.materia) out.push(u.materia + (u.grupo ? ' · ' + u.grupo : ''));
        return out;
    }
    function puedeEliminar(u) {
        var me = yo(), r = rolDe(u);
        if (u.email === me) return { ok: false, why: 'Es tu cuenta' };
        if (r === 'superadmin') return { ok: false, why: 'Superadministrador' };
        return { ok: true };
    }

    function msg(texto, tipo) {
        var el = $('adminUsrMsg');
        if (!el) return;
        el.hidden = !texto;
        el.textContent = texto || '';
        el.className = 'gm-usr-msg' + (tipo ? ' is-' + tipo : '');
    }

    function render() {
        var lista = $('adminUsrLista');
        if (!lista) return;
        var q = norm(($('adminUsrBuscar') || {}).value);
        var fr = ($('adminUsrRol') || {}).value || '';
        var rows = estado.users.filter(function (u) {
            var r = rolDe(u);
            if (fr === 'admin' && !(r === 'admin' || r === 'superadmin')) return false;
            if (fr && fr !== 'admin' && r !== fr) return false;
            if (!q) return true;
            return norm([u.nombre, u.email, u.codigo, materias(u).join(' ')].join(' ')).indexOf(q) >= 0;
        });
        var orden = { superadmin: 0, admin: 1, docente: 2, estudiante: 3 };
        rows.sort(function (a, b) {
            return (orden[rolDe(a)] - orden[rolDe(b)]) || String(a.nombre || a.email).localeCompare(String(b.nombre || b.email), 'es');
        });
        var cnt = $('adminUsrCount');
        if (cnt) cnt.textContent = estado.users.length;
        if (estado.cargando && !estado.users.length) { lista.innerHTML = '<p class="gm-usr-vacio">Cargando usuarios…</p>'; return; }
        if (!rows.length) { lista.innerHTML = '<p class="gm-usr-vacio">' + (estado.users.length ? 'Ningún usuario coincide con la búsqueda.' : 'No hay usuarios registrados en la base de datos.') + '</p>'; return; }
        lista.innerHTML = rows.map(function (u) {
            var r = rolDe(u), p = puedeEliminar(u), mats = materias(u);
            var detalle = [];
            if (u.codigo) detalle.push('Código ' + esc(u.codigo));
            if (mats.length) detalle.push(esc(mats.join(', ')));
            var foto = String(u.foto || u.photo || u.photoURL || u.avatarUrl || '');
            var av = foto
                ? '<div class="gm-usr-av gm-usr-av-' + r + ' con-foto" data-ini="' + esc(iniciales(u.nombre, u.email)) + '"><img src="' + esc(foto) + '" alt="" loading="lazy" onerror="var d=this.parentNode;d.classList.remove(\'con-foto\');d.textContent=d.getAttribute(\'data-ini\')"></div>'
                : '<div class="gm-usr-av gm-usr-av-' + r + '">' + esc(iniciales(u.nombre, u.email)) + '</div>';
            return '<div class="gm-usr-row" data-email="' + esc(u.email) + '">' + av +
                '<div class="gm-usr-info"><strong>' + esc(u.nombre || '(sin nombre)') + (u.email === yo() ? ' <em>(tú)</em>' : '') + '</strong>' +
                '<span class="gm-usr-mail">' + esc(u.email) + '</span>' +
                (detalle.length ? '<span class="gm-usr-det">' + detalle.join(' · ') + '</span>' : '') + '</div>' +
                '<span class="gm-usr-rol gm-usr-rol-' + r + '">' + ROL_TXT[r] + '</span>' +
                (p.ok ? '<button type="button" class="gm-usr-del" data-usr-del="' + esc(u.email) + '">Eliminar</button>'
                      : '<span class="gm-usr-lock" title="' + esc(p.why) + '">🔒</span>') +
                '</div>';
        }).join('');
    }

    function renderEliminados() {
        var box = $('adminUsrEliminados'), c = $('adminUsrDelCount');
        if (c) c.textContent = estado.deleted.length;
        if (!box) return;
        if (!estado.deleted.length) { box.innerHTML = '<p class="gm-usr-vacio">No hay cuentas eliminadas.</p>'; return; }
        box.innerHTML = estado.deleted.map(function (d) {
            return '<div class="gm-usr-row is-del">' +
                '<div class="gm-usr-av">✕</div>' +
                '<div class="gm-usr-info"><strong>' + esc(d.email) + '</strong>' +
                '<span class="gm-usr-det">Eliminada ' + esc(fecha(d.at)) + (d.by ? ' por ' + esc(d.by) : '') + '</span></div>' +
                '<button type="button" class="gm-usr-restore" data-usr-restore="' + esc(d.email) + '">Permitir de nuevo</button>' +
                '</div>';
        }).join('');
    }

    function cargar() {
        if (!global.GeoCloud || !GeoCloud.listAllUsers) return;
        estado.cargando = true; render();
        var sec = global.GeoSecure;
        return Promise.all([
            GeoCloud.listAllUsers(),
            sec ? sec.admins() : null,
            sec ? sec.docentes() : null,
            GeoCloud.listDeletedUsers()
        ]).then(function (r) {
            estado.users = r[0] || [];
            estado.admins = r[1] || [];
            estado.docentes = r[2] || [];
            estado.deleted = r[3] || [];
            estado.cargando = false;
            if (!r[0]) msg('No se pudo leer la lista de usuarios. Revisa tu conexión o tus permisos de administrador.', 'error');
            render(); renderEliminados();
        }).catch(function (e) {
            estado.cargando = false;
            msg('No se pudo cargar: ' + (e && e.message || e), 'error');
            render();
        });
    }

    function eliminar(email, btn) {
        var u = estado.users.find(function (x) { return x.email === email; }) || { email: email };
        var ok = confirm('¿Eliminar la cuenta de ' + (u.nombre ? u.nombre + ' (' + email + ')' : email) + '?\n\n' +
            '• Se borra su perfil de la base de datos, sus roles (docente/administrador) y su lugar en el equipo creador.\n' +
            '• No podrá volver a entrar a GeoMetrics con este correo.\n' +
            '• Podrás revertirlo desde «Cuentas eliminadas» → «Permitir de nuevo», pero el perfil borrado no se recupera.');
        if (!ok) return;
        if (btn) { btn.disabled = true; btn.textContent = 'Eliminando…'; }
        GeoCloud.deleteUser(email).then(function () {
            try { if (global.GeoSonidos) GeoSonidos.play('eliminar'); } catch (e) {}
            estado.users = estado.users.filter(function (x) { return x.email !== email; });
            msg('Cuenta eliminada: ' + email, 'ok');
            render();
            return GeoCloud.listDeletedUsers().then(function (d) { estado.deleted = d || []; renderEliminados(); });
        }).catch(function (e) {
            if (btn) { btn.disabled = false; btn.textContent = 'Eliminar'; }
            msg(e && e.message ? e.message : 'No se pudo eliminar la cuenta.', 'error');
        });
    }

    function restaurar(email, btn) {
        if (!confirm('¿Permitir de nuevo a ' + email + '?\nPodrá iniciar sesión y deberá completar su registro otra vez.')) return;
        if (btn) btn.disabled = true;
        GeoCloud.restoreUser(email).then(function () {
            msg('Se permitió de nuevo el ingreso de ' + email + '.', 'ok');
            return cargar();
        }).catch(function (e) {
            if (btn) btn.disabled = false;
            msg('No se pudo restaurar: ' + (e && e.message || e), 'error');
        });
    }

    function bind() {
        var card = $('adminUsuariosCard');
        if (!card || card.dataset.gmBound) return;
        card.dataset.gmBound = '1';
        var b = $('adminUsrBuscar'), r = $('adminUsrRol'), ref = $('btnAdminUsrRefresh');
        if (b) b.addEventListener('input', render);
        if (r) r.addEventListener('change', render);
        if (ref) ref.addEventListener('click', function () { msg(''); cargar(); });
        card.addEventListener('click', function (ev) {
            var d = ev.target.closest('[data-usr-del]');
            if (d) { eliminar(d.getAttribute('data-usr-del'), d); return; }
            var s = ev.target.closest('[data-usr-restore]');
            if (s) restaurar(s.getAttribute('data-usr-restore'), s);
        });
        /* carga cada vez que se abre el panel de administración */
        var pant = $('pantallaAdmin'), visible = false;
        function revisar() {
            var v = !!(pant && pant.offsetParent !== null && getComputedStyle(pant).display !== 'none');
            if (v && !visible) { msg(''); cargar(); }
            visible = v;
        }
        if (pant && global.MutationObserver) new MutationObserver(revisar).observe(pant, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
        revisar();
    }

    /* Si alguien con sesión abierta es eliminado, se le cierra la sesión. */
    function vigilarPropia() {
        if (!global.GeoCloud || !GeoCloud.amIDeleted) return;
        GeoCloud.amIDeleted().then(function (fue) {
            if (!fue) return;
            try { if (typeof aulaLogout === 'function') aulaLogout(); else if (global.GeoAuth) GeoAuth.signOut(); } catch (e) {}
            setTimeout(function () { alert('Tu cuenta fue eliminada por un administrador de GeoMetrics.'); }, 50);
        });
    }
    global.addEventListener('geometrics-auth-changed', function (ev) { if (ev.detail && ev.detail.verified) setTimeout(vigilarPropia, 400); });
    global.addEventListener('geometrics-users-deleted', function () {
        if (global.GeoCloud && GeoCloud.isDeletedUser && GeoCloud.isDeletedUser(yo())) vigilarPropia();
        var pant = $('pantallaAdmin');
        if (pant && pant.offsetParent !== null) {
            var before = estado.users.length;
            estado.users = estado.users.filter(function (u) { return !GeoCloud.isDeletedUser(u.email); });
            if (estado.users.length !== before) render();
        }
    });

    /* ---------- Botón «Cantidad de usuarios» + ventana con el conteo ---------- */
    function esDocente(u) { return u.rol === 'docente' || estado.docentes.indexOf(u.email) >= 0; }
    function esAdminU(u) { var r = rolDe(u); return r === 'admin' || r === 'superadmin'; }
    function conteo() {
        var c = { total: estado.users.length, est: 0, doc: 0, adm: 0, conFoto: 0, porMateria: {} };
        estado.users.forEach(function (u) {
            var d = esDocente(u);
            if (d) c.doc++; else c.est++;
            if (esAdminU(u)) c.adm++;
            if (u.foto || u.photo || u.photoURL) c.conFoto++;
            if (!d) materias(u).forEach(function (m) {
                var nom = m.split(' · ')[0];
                c.porMateria[nom] = (c.porMateria[nom] || 0) + 1;
            });
        });
        return c;
    }
    function pintarBoton() {
        var b = $('btnAdminUsrStats');
        if (!b) return;
        var n = b.querySelector('[data-usr-total]');
        if (n) n.textContent = estado.cargando && !estado.users.length ? '…' : estado.users.length;
    }
    function asegurarBoton() {
        var back = $('btnVolverAdmin');
        if (!back || !back.parentNode) return;
        var b = $('btnAdminUsrStats');
        if (!b) {
            b = document.createElement('button');
            b.type = 'button'; b.id = 'btnAdminUsrStats'; b.className = 'gm-usr-stats-btn';
            b.title = 'Ver cuántos docentes y estudiantes están registrados';
            b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>' +
                '<span>Cantidad de usuarios</span><b data-usr-total>…</b>';
            b.addEventListener('click', abrirStats);
        }
        /* va junto a «Volver al menú», que el rediseño del panel puede mover de sitio */
        if (b.nextSibling !== back || b.parentNode !== back.parentNode) back.parentNode.insertBefore(b, back);
        pintarBoton();
    }
    function abrirStats() {
        var ov = $('gmUsrStats');
        if (!ov) {
            ov = document.createElement('div');
            ov.id = 'gmUsrStats'; ov.className = 'gm-usr-stats-ov'; ov.hidden = true;
            ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Cantidad de usuarios');
            document.body.appendChild(ov);
            ov.addEventListener('click', function (ev) {
                if (ev.target === ov || ev.target.closest('[data-stats-close]')) { ov.hidden = true; return; }
                var f = ev.target.closest('[data-stats-filtro]');
                if (f) {
                    ov.hidden = true;
                    var sel = $('adminUsrRol'), bus = $('adminUsrBuscar');
                    if (sel) sel.value = f.getAttribute('data-stats-filtro');
                    if (bus) bus.value = '';
                    render();
                    var card = $('adminUsuariosCard'); if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
            });
            document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !ov.hidden) ov.hidden = true; });
        }
        function pintar() {
            var c = conteo();
            var pct = function (n) { return c.total ? Math.round(n * 100 / c.total) : 0; };
            var mats = Object.keys(c.porMateria).sort(function (a, b) { return c.porMateria[b] - c.porMateria[a] || a.localeCompare(b, 'es'); });
            var maxM = mats.length ? c.porMateria[mats[0]] : 1;
            ov.innerHTML = '<div class="gm-usr-stats-box">' +
                '<div class="gm-usr-stats-hd"><div><small>ADMINISTRACIÓN</small><h3>Cantidad de usuarios</h3></div>' +
                '<button type="button" class="gm-usr-stats-x" data-stats-close aria-label="Cerrar">✕</button></div>' +
                (estado.cargando && !c.total ? '<p class="gm-usr-vacio">Cargando usuarios…</p>' :
                '<div class="gm-usr-stats-total"><b>' + c.total + '</b><span>usuarios registrados en total</span></div>' +
                '<div class="gm-usr-stats-tiles">' +
                    '<button type="button" class="gm-usr-tile t-est" data-stats-filtro="estudiante"><b>' + c.est + '</b><span>Estudiantes</span><i style="--p:' + pct(c.est) + '%"></i><small>' + pct(c.est) + '% del total</small></button>' +
                    '<button type="button" class="gm-usr-tile t-doc" data-stats-filtro="docente"><b>' + c.doc + '</b><span>Docentes</span><i style="--p:' + pct(c.doc) + '%"></i><small>' + pct(c.doc) + '% del total</small></button>' +
                    '<button type="button" class="gm-usr-tile t-adm" data-stats-filtro="admin"><b>' + c.adm + '</b><span>Administradores</span><i style="--p:' + pct(c.adm) + '%"></i><small>incluidos en los anteriores</small></button>' +
                '</div>' +
                (mats.length ? '<h4>Estudiantes por materia</h4><div class="gm-usr-stats-mats">' + mats.map(function (m) {
                    return '<div class="gm-usr-mat"><span>' + esc(m) + '</span><i><em style="width:' + Math.max(4, Math.round(c.porMateria[m] * 100 / maxM)) + '%"></em></i><b>' + c.porMateria[m] + '</b></div>';
                }).join('') + '</div><p class="gm-usr-stats-nota">Un estudiante inscrito en varias materias cuenta en cada una.</p>' : '') +
                '<p class="gm-usr-stats-nota">Con foto de perfil: ' + c.conFoto + ' · Cuentas eliminadas: ' + estado.deleted.length + ' · Toca una tarjeta para ver la lista.</p>') +
                '</div>';
        }
        pintar();
        ov.hidden = false;
        var x = ov.querySelector('[data-stats-close]'); if (x) x.focus();
        if (!estado.users.length || estado.cargando) {
            var p = cargar(); if (p && p.then) p.then(function () { if (!ov.hidden) pintar(); });
        }
    }
    var _render = render;
    render = function () { _render(); pintarBoton(); };

    function vigilarBoton() {
        var pant = $('pantallaAdmin');
        asegurarBoton();
        if (pant && global.MutationObserver) new MutationObserver(function () { if ($('btnVolverAdmin') && (!$('btnAdminUsrStats') || $('btnAdminUsrStats').nextSibling !== $('btnVolverAdmin'))) asegurarBoton(); })
            .observe(pant, { childList: true, subtree: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { bind(); vigilarBoton(); }); else { bind(); vigilarBoton(); }
    global.GeoAdminUsuarios = { cargar: cargar };
})(window);
