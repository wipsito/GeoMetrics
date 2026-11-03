/* GeoMetrics — Panel de administración (diseño completo): avatar con zona de arrastre y vista previa,
 * listas de docentes y administradores con buscador, contadores y filas con iniciales, y tarjetas del equipo.
 * Solo decora: los botones, ids y funciones de aula.js / equipo-creador.js siguen siendo los mismos. */
(function () {
    'use strict';
    var doc = document;
    function $(id) { return doc.getElementById(id); }
    function el(t, c, h) { var e = doc.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function norm(s) { s = String(s || '').toLowerCase(); return s.normalize ? s.normalize('NFD').replace(/[̀-ͯ]/g, '') : s; }
    function ini(t) { t = String(t || '').split('@')[0].replace(/[._-]+/g, ' ').trim().split(/\s+/); return ((t[0] || '?')[0] + ((t[1] || '')[0] || '')).toUpperCase(); }
    var MONO = '"JetBrains Mono","IBM Plex Mono",ui-monospace,Consolas,monospace';
    var SV = function (p) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; };
    var IC = {
        at: SV('<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>'),
        user: SV('<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>'),
        uadd: SV('<circle cx="9" cy="8" r="4"/><path d="M2 21c1-4 3.5-6 7-6s6 2 7 6"/><path d="M19 8v6M16 11h6"/>'),
        key: SV('<circle cx="8" cy="15" r="4"/><path d="m11 12 9-9M17 6l3 3M14 9l2 2"/>'),
        search: SV('<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>'),
        trash: SV('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
        lock: SV('<rect x="5" y="11" width="14" height="10" rx="1"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>'),
        upload: SV('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>'),
        star: SV('<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>'),
        pen: SV('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m14 6 4 4"/>'),
        cam: SV('<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>'),
        up: SV('<path d="M12 19V5M6 11l6-6 6 6"/>'),
        down: SV('<path d="M12 5v14M6 13l6 6 6-6"/>'),
        mail: SV('<rect x="3" y="5" width="18" height="14" rx="1"/><path d="m3 7 9 6 9-6"/>')
    };
    var R = '#pantallaAdmin.gt';
    var css = el('style'); css.id = 'gma-css';
    css.textContent = [
        /* avatar */
        R + ' .admin-civix-avatar-row{display:grid!important;grid-template-columns:auto minmax(0,1fr);gap:34px!important;align-items:center}',
        R + ' .admin-civix-preview-wrap{width:200px!important;height:200px!important}',
        R + ' .admin-civix-preview-wrap:before{content:"";position:absolute;inset:-14px;border-radius:50%;border:1px dashed rgba(34,211,238,.28)}',
        R + ' .admin-civix-preview-wrap:after{content:"";position:absolute;inset:-6px;border-radius:50%;border:3px solid transparent;border-right-color:#22d3ee;transform:rotate(-20deg)}',
        R + ' .admin-civix-avatar-actions{display:grid!important;grid-template-columns:1fr 1fr;gap:14px!important}',
        R + ' .admin-civix-avatar-actions > p,' + R + ' .admin-civix-avatar-actions > .gma-drop,' + R + ' .admin-civix-avatar-actions > .gma-desc{grid-column:1/-1;margin:0!important}',
        R + ' .gma-desc{font-size:15.5px;color:#aebbd0;line-height:1.5}',
        R + ' #btnAdminCivixAvatar{background:#22d3ee!important;color:#03202a!important}',
        R + ' .admin-civix-avatar-actions button{min-height:58px;margin:0!important}',
        R + ' .gma-drop{position:relative;display:flex;align-items:center;gap:16px;padding:20px 22px;border:1px dashed rgba(34,211,238,.4);background:rgba(8,40,56,.18);cursor:pointer;font:500 14px/1.3 ' + MONO + ';color:#e2e8f0}',
        R + ' .gma-drop svg{width:22px;height:22px;color:#22d3ee;flex:0 0 auto}' + R + ' .gma-drop small{display:block;margin-top:6px;font-size:12px;letter-spacing:.18em;color:#8b9ab0}',
        R + ' .gma-drop.on{border-color:#22d3ee;background:rgba(34,211,238,.1)}',
        R + ' .gma-prev{display:flex;align-items:center;gap:22px;margin-top:26px;padding:16px 20px;background:#05080f;border:1px solid #172235}',
        R + ' .gma-prev > small{font:500 12px/1.3 ' + MONO + ';letter-spacing:.24em;color:#8b9ab0;width:70px}',
        R + ' .gma-prev img{width:44px;height:44px;border-radius:50%;object-fit:cover;background:#fff;border:2px solid #22d3ee}',
        R + ' .gma-prev span{padding:12px 16px;border:1px solid rgba(167,139,250,.5);background:rgba(76,29,149,.25);font-size:15px;color:#e2e8f0}' + R + ' .gma-prev span b{color:#f472b6}',
        /* inputs con icono */
        R + ' .gma-in{position:relative;display:block}' + R + ' .gma-in > svg{position:absolute;left:20px;top:50%;width:19px;height:19px;transform:translateY(-50%);color:#8b9ab0;pointer-events:none;z-index:1}',
        R + ' .gma-in.gma-in > input[id],' + R + ' .gma-in.gma-in > select[id],' + R + ' .gma-in.gma-in > input{padding-left:56px!important;width:100%!important;box-sizing:border-box}',
        R + ' .gma-in:focus-within > svg{color:#22d3ee}',
        R + ' .btn-calcular svg,' + R + ' .gma-btn svg{width:18px;height:18px;vertical-align:-3px;margin-right:10px}',
        /* listas */
        R + ' .gma-lh{display:flex;justify-content:space-between;margin:24px 0 12px;font:500 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6;text-transform:uppercase}',
        R + ' #adminListaDocentes > .login-hint,' + R + ' #adminListaAdmins > h4{display:none!important}',
        R + ' .admin-row{display:flex!important;align-items:center;gap:18px;padding:16px 18px!important;margin:0 0 12px!important;background:#05080f!important;border:1px solid #172235!important;border-radius:0!important}',
        R + ' .admin-row.gma-hide{display:none!important}',
        R + ' .admin-row > div{flex:1;min-width:0}' + R + ' .admin-row br{display:none}',
        R + ' .gma-av{flex:0 0 auto;width:48px;height:48px;display:flex;align-items:center;justify-content:center;font:700 16px/1 ' + MONO + ';color:var(--c,#22d3ee);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--c,#22d3ee) 60%,transparent);background:color-mix(in srgb,var(--c,#22d3ee) 8%,transparent)}',
        R + ' .admin-row-name{display:block;font-size:17px;color:#fff;overflow:hidden;text-overflow:ellipsis}',
        R + ' .admin-row-email{display:block;margin:6px 0 2px;font:500 14px/1.2 ' + MONO + ';color:#22d3ee;overflow:hidden;text-overflow:ellipsis}',
        R + ' #adminListaAdmins .admin-row-name{font:500 15px/1.2 ' + MONO + '!important;color:#22d3ee!important}' + R + ' .gm-team-add-box{border:0!important;background:none!important;padding:0!important;box-shadow:none!important;border-radius:0!important}',
        R + ' .admin-badge{display:inline-flex!important;align-items:center;gap:7px;margin:8px 8px 0 0!important;padding:6px 10px!important;border-radius:0!important;background:transparent!important;border:1px solid rgba(34,211,238,.55)!important;color:#22d3ee!important;font:600 11.5px/1 ' + MONO + '!important;letter-spacing:.2em;text-transform:uppercase}',
        R + ' .admin-badge:before{content:"";width:6px;height:6px;border-radius:50%;background:currentColor}',
        R + ' .admin-badge.sa{border-color:rgba(244,114,182,.6)!important;color:#f472b6!important;margin:0!important}' + R + ' .admin-badge.sa:before{display:none}' + R + ' .admin-badge svg{width:13px;height:13px}',
        R + ' .btn-admin-del{flex:0 0 auto;display:inline-flex!important;align-items:center;gap:9px;border-radius:0!important;background:transparent!important;border:1px solid rgba(248,113,113,.5)!important;color:#fca5a5!important;font:700 12.5px/1 ' + MONO + '!important;letter-spacing:.2em;text-transform:uppercase;padding:13px 16px!important;cursor:pointer;box-shadow:none!important}',
        R + ' .btn-admin-del svg{width:15px;height:15px}' + R + ' .btn-admin-del:hover{background:rgba(248,113,113,.12)!important}',
        R + ' .admin-row > .login-hint{font:600 11.5px/1 ' + MONO + ';letter-spacing:.2em;text-transform:uppercase;color:#8b9ab0;margin:0!important}',
        R + ' .gma-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin:22px 0}',
        R + ' .gma-stats div{--c:#22d3ee;padding:18px;border:1px solid color-mix(in srgb,var(--c) 45%,transparent);background:color-mix(in srgb,var(--c) 6%,transparent)}',
        R + ' .gma-stats b{display:block;font:700 32px/1 ' + MONO + ';color:var(--c)}' + R + ' .gma-stats span{display:block;margin-top:12px;font:500 12px/1.2 ' + MONO + ';letter-spacing:.2em;color:#9fb0c6;text-transform:uppercase}',
        R + ' .gma-search{margin:0 0 4px}',
        /* equipo */
        R + ' #adminEquipoCard .login-hint{display:block!important;font-size:15.5px;line-height:1.55;color:#aebbd0}',
        R + ' .gm-team-field-label{display:block;margin:20px 0 0;font:500 12.5px/1 ' + MONO + ';letter-spacing:.24em;color:#9fb0c6;text-transform:uppercase}',
        R + ' .gm-team-field-label .gma-in{margin-top:12px;text-transform:none;letter-spacing:0}',
        R + ' .gm-team-add-actions{display:grid!important;grid-template-columns:2fr 1fr;gap:14px;margin-top:26px}',
        R + ' .gm-team-add-actions button{min-height:58px;margin:0!important}',
        R + ' .gm-team-admin-gallery{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))!important;gap:18px!important}',
        R + ' .gm-team-card-manage{--c:#22d3ee;display:flex!important;flex-direction:column;align-items:center;text-align:center;padding:22px 16px 16px!important;border-radius:0!important;background:linear-gradient(180deg,rgba(15,30,48,.9),#060a12)!important;border:1px solid #1b2a40!important;box-shadow:none!important}',
        R + ' .gm-team-card-manage:nth-child(3n+2){--c:#a78bfa}' + R + ' .gm-team-card-manage:nth-child(3n+3){--c:#f59e0b}',
        R + ' .gm-team-card-manage .gm-team-photo{width:94px!important;height:94px!important;border-radius:50%!important;border:3px solid var(--c)!important;box-shadow:0 0 22px color-mix(in srgb,var(--c) 35%,transparent)!important;overflow:hidden;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb,var(--c) 14%,#060a12)!important;font:800 28px/1 Inter,sans-serif;color:var(--c)!important}',
        R + ' .gm-team-card-manage .gm-team-photo img{width:100%;height:100%;object-fit:cover}',
        R + ' .gm-team-card-manage .gm-team-name{margin:16px 0 0!important;font-size:18px!important;color:#fff!important}',
        R + ' .gm-team-card-manage .gm-team-handle{margin:6px 0 0!important;font:500 13px/1 ' + MONO + '!important;color:#8b9ab0!important}',
        R + ' .gm-team-card-manage .gm-team-role{display:none!important}',
        R + ' .gma-tags{display:flex;flex-direction:column;align-items:center;gap:7px;margin:12px 0 14px;flex:1}',
        R + ' .gma-tags i{font:600 11.5px/1 ' + MONO + ';font-style:normal;letter-spacing:.16em;text-transform:uppercase;padding:6px 9px;border:1px solid color-mix(in srgb,var(--c) 60%,transparent);color:var(--c)}',
        R + ' .gm-team-card-manage-bar{display:grid!important;grid-template-columns:repeat(3,44px) 1fr;gap:8px!important;width:100%;margin-top:auto}',
        R + ' .gm-team-card-role-input{grid-column:1/-1;width:100%!important;box-sizing:border-box;text-align:center;padding:14px 10px!important;font:500 14px/1.3 ' + MONO + '!important}',
        R + ' .gm-team-card-photo-btn,' + R + ' .gm-team-ico-btn,' + R + ' .gm-team-card-remove{height:44px;display:flex!important;align-items:center;justify-content:center;border-radius:0!important;background:transparent!important;border:1px solid #24324a!important;color:#cbd5e1!important;cursor:pointer;font-size:0!important;padding:0!important;box-shadow:none!important}',
        R + ' .gm-team-card-photo-btn svg,' + R + ' .gm-team-ico-btn svg{width:16px;height:16px}',
        R + ' .gm-team-card-remove{font:700 12px/1 ' + MONO + '!important;letter-spacing:.16em;text-transform:uppercase;color:#fca5a5!important;border-color:rgba(248,113,113,.5)!important}',
        '@media (max-width:1000px){' + R + ' .admin-civix-avatar-row{grid-template-columns:1fr!important;justify-items:center}' + R + ' .gma-stats{grid-template-columns:1fr}}'
    ].join('\n');
    doc.head.appendChild(css);

    function conIcono(input, svg) {
        if (!input || input.parentNode.classList.contains('gma-in')) return;
        var w = el('span', 'gma-in'); input.parentNode.insertBefore(w, input); w.innerHTML = svg; w.appendChild(input);
    }
    function decorarDocentes() {
        var box = $('adminListaDocentes'); if (!box) return;
        var rows = [].slice.call(box.querySelectorAll('.admin-row')), act = 0, aut = 0;
        rows.forEach(function (r) {
            var t = r.textContent; if (/autorizado|lista base/i.test(t)) aut++; if (/cuenta activa/i.test(t)) act++;
            if (r.__gma) return; r.__gma = 1;
            var n = r.querySelector('.admin-row-name'); r.insertAdjacentHTML('afterbegin', '<span class="gma-av" style="--c:#22d3ee">' + esc(ini(n && n.textContent)) + '</span>');
            var b = r.querySelector('.btn-admin-del'); if (b) b.innerHTML = IC.trash + 'Quitar';
        });
        var card = box.closest('.aula-card'); if (!card) return;
        var lh = card.querySelector('.gma-lh'), st = card.querySelector('.gma-stats');
        if (!lh) {
            var s = el('label', 'gma-in gma-search', IC.search + '<input type="search" placeholder="buscar docente o correo…" aria-label="Buscar docente">');
            box.parentNode.insertBefore(s, box);
            s.querySelector('input').addEventListener('input', function () { var q = norm(this.value.trim()); box.querySelectorAll('.admin-row').forEach(function (r) { r.classList.toggle('gma-hide', !!q && norm(r.textContent).indexOf(q) < 0); }); });
            lh = el('div', 'gma-lh', '<span>Lista actual</span><span></span>'); box.parentNode.insertBefore(lh, box);
            st = el('div', 'gma-stats'); box.parentNode.insertBefore(st, box.nextSibling);
        }
        var txt = rows.length + (rows.length === 1 ? ' docente' : ' docentes');
        if (lh.lastChild.textContent !== txt) lh.lastChild.textContent = txt;
        var h = '<div><b>' + aut + '</b><span>Autorizados</span></div><div><b>' + act + '</b><span>Cuentas activas</span></div><div style="--c:#f59e0b"><b>' + Math.max(0, rows.length - act) + '</b><span>Sin registrarse</span></div>';
        if (st.__h !== h) { st.__h = h; st.innerHTML = h; }
    }
    function decorarAdmins() {
        var box = $('adminListaAdmins'); if (!box) return;
        var rows = [].slice.call(box.querySelectorAll('.admin-row'));
        rows.forEach(function (r) {
            if (r.__gma) return; r.__gma = 1;
            var n = r.querySelector('.admin-row-name'), sa = r.querySelector('.admin-badge');
            r.insertAdjacentHTML('afterbegin', '<span class="gma-av" style="--c:' + (sa ? '#f472b6' : '#22d3ee') + '">' + esc(ini(n && n.textContent)) + '</span>');
            if (sa) { sa.classList.add('sa'); sa.innerHTML = IC.lock + 'Superadmin'; r.appendChild(sa); }
            var b = r.querySelector('.btn-admin-del'); if (b) b.innerHTML = IC.trash + 'Quitar admin';
        });
        var lh = box.previousElementSibling && box.previousElementSibling.classList.contains('gma-lh') ? box.previousElementSibling : null;
        if (!lh) { lh = el('div', 'gma-lh', '<span>Administradores actuales</span><span></span>'); box.parentNode.insertBefore(lh, box); box.style.marginTop = '0'; }
        var txt = rows.length + (rows.length === 1 ? ' cuenta' : ' cuentas'); if (lh.lastChild.textContent !== txt) lh.lastChild.textContent = txt;
    }
    function decorarEquipo() {
        var box = $('adminTeamList'); if (!box) return;
        box.querySelectorAll('.gm-team-card-manage').forEach(function (c) {
            if (c.__gma) return; c.__gma = 1;
            var role = c.querySelector('.gm-team-role'), name = c.querySelector('.gm-team-name'), bar = c.querySelector('.gm-team-card-manage-bar');
            var tags = String(role ? role.textContent : '').split(/\s*[,/·]\s*|\s+y\s+/).filter(Boolean).slice(0, 4);
            var tg = el('div', 'gma-tags', tags.map(function (t) { return '<i>' + esc(t) + '</i>'; }).join(''));
            if (bar) c.insertBefore(tg, bar); else c.appendChild(tg);
            if (name && !c.querySelector('.gm-team-handle')) name.insertAdjacentHTML('afterend', '');
            var pb = c.querySelector('.gm-team-card-photo-btn'); if (pb) pb.childNodes.forEach(function (n) { if (n.nodeType === 3) n.textContent = ''; }), pb.insertAdjacentHTML('afterbegin', IC.cam);
            var up = c.querySelector('[data-team-up]'); if (up) up.innerHTML = IC.up;
            var dn = c.querySelector('[data-team-down]'); if (dn) dn.innerHTML = IC.down;
            var ri = c.querySelector('.gm-team-card-role-input'); if (ri && bar) bar.insertBefore(ri, bar.firstChild);
        });
    }
    function avatar() {
        var row = doc.querySelector('#pantallaAdmin .admin-civix-avatar-row'); if (!row || row.__gma) return; row.__gma = 1;
        var acts = row.querySelector('.admin-civix-avatar-actions'), inp = $('adminCivixAvatarInput'), img = $('adminCivixAvatarPreview');
        if (!acts || !inp) return;
        acts.insertAdjacentHTML('afterbegin', '<p class="gma-desc">Imagen visible en el chat de Civix para todos los usuarios.</p>');
        var d = el('div', 'gma-drop', IC.upload + '<div>Arrastra una imagen o haz clic<small>JPG · PNG · WEBP · SVG — MÁX. 10 MB</small></div>');
        acts.insertBefore(d, acts.children[1]);
        d.addEventListener('click', function () { inp.click(); });
        d.addEventListener('dragover', function (e) { e.preventDefault(); d.classList.add('on'); });
        d.addEventListener('dragleave', function () { d.classList.remove('on'); });
        d.addEventListener('drop', function (e) {
            e.preventDefault(); d.classList.remove('on');
            var f = e.dataTransfer && e.dataTransfer.files; if (!f || !f.length) return;
            try { var dt = new DataTransfer(); dt.items.add(f[0]); inp.files = dt.files; inp.dispatchEvent(new Event('change', { bubbles: true })); } catch (x) { }
        });
        var rs = $('btnAdminCivixAvatarReset'); if (rs) rs.textContent = 'Restablecer';
        var card = row.closest('.aula-card');
        var pv = el('div', 'gma-prev', '<small>VISTA<br>PREVIA</small><img alt=""><span><b>Civix</b> · ¡Hola! ¿En qué te ayudo con tu ensayo?</span>');
        row.parentNode.insertBefore(pv, row.nextSibling);
        var mini = pv.querySelector('img');
        function sync() { if (img) mini.src = img.src; }
        sync(); if (img) new MutationObserver(sync).observe(img, { attributes: true, attributeFilter: ['src'] });
        if (card) card.querySelectorAll(':scope > p.login-hint').forEach(function (p) { if (/Imagen visible/.test(p.textContent)) p.style.display = 'none'; });
    }
    function badge() {
        var b = doc.querySelector('#pantallaAdmin .gt-badge'); if (!b) return;
        var sa = false; try { var u = window.aulaGetSession(); sa = !!(u && String(u.email || '').toLowerCase() === String(window.AULA_SUPER_ADMIN || '').toLowerCase()); } catch (e) { }
        var t = sa ? 'SUPERADMIN' : 'ADMIN'; if (b.textContent.replace(/[^A-Z]/g, '') !== t) b.innerHTML = b.innerHTML.replace(/SUPERADMIN|ADMIN/, t);
    }
    function montar() {
        var M = $('pantallaAdmin'); if (!M || !M.classList.contains('gt')) return false;
        if (!M.__gma) {
            M.__gma = 1;
            avatar();
            conIcono($('adminDocEmail'), IC.at); conIcono($('adminDocNombre'), IC.user); conIcono($('adminPromoEmail'), IC.at);
            conIcono($('adminTeamEmail'), IC.at); conIcono($('adminTeamRoleSelect'), IC.star); conIcono($('adminTeamRoleCustom'), IC.pen);
            var pe = $('adminPromoEmail'); if (pe) pe.placeholder = 'estudiante o docente@unipamplona.edu.co';
            var b1 = $('btnAdminAddDocente'); if (b1) b1.innerHTML = IC.uadd + 'AGREGAR DOCENTE';
            var b2 = $('btnAdminPromo'); if (b2) b2.innerHTML = IC.key + 'OTORGAR ADMIN';
            ['adminListaDocentes', 'adminListaAdmins', 'adminTeamList'].forEach(function (id) { var x = $(id); if (x) new MutationObserver(refrescar).observe(x, { childList: true }); });
            new MutationObserver(function () { if (M.style.display !== 'none') { badge(); refrescar(); } }).observe(M, { attributes: true, attributeFilter: ['style'] });
        }
        refrescar(); badge();
        return true;
    }
    function refrescar() { decorarDocentes(); decorarAdmins(); decorarEquipo(); }
    function intentar(n) { if (!montar() && n > 0) setTimeout(function () { intentar(n - 1); }, 150); }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', function () { intentar(20); }); else intentar(20);
})();
