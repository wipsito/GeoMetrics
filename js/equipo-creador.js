/**
 * GeoMetrics — Equipo creador dinámico
 * - Modal público con tarjetas (3 columnas)
 * - Datos desde teamCreators/ (Firebase) + users
 * - Administración exclusiva del Superadministrador
 */
(function (global) {
  'use strict';

  var LOCAL_KEY = 'geometrics_team_creators_v1';
  var state = {
    team: [],
    listening: false,
    adminOpen: false,
    draftPhoto: null,
    draftUserId: null
  };

  function normEmail(e) {
    return String(e || '').trim().toLowerCase();
  }

  function emailKey(email) {
    if (window.GeoCloud && typeof GeoCloud.emailKey === 'function') return GeoCloud.emailKey(email);
    return normEmail(email).replace(/\./g, ',').replace(/@/g, '_at_');
  }

  function session() {
    try {
      if (typeof aulaGetSession === 'function') return aulaGetSession();
    } catch (e) {}
    try {
      return JSON.parse(localStorage.getItem('geometrics_session') || 'null');
    } catch (e2) {
      return null;
    }
  }

  function isSuperAdmin() {
    var u = session();
    if (!u || !u.email) return false;
    var email = normEmail(u.email);
    var superE = normEmail(
      typeof AULA_SUPER_ADMIN !== 'undefined'
        ? AULA_SUPER_ADMIN
        : 'andres.enriquezval@unipamplona.edu.co'
    );
    return email === superE;
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function initials(name) {
    var n = String(name || '?').replace(/\[EDITABLE\]/gi, '').trim().split(/\s+/).filter(Boolean);
    if (!n.length) return '?';
    if (n.length >= 2) return (n[0][0] + n[1][0]).toUpperCase();
    return n[0].slice(0, 2).toUpperCase();
  }

  function fullName(u) {
    if (!u) return 'Usuario';
    var n = ((u.nombres || '') + ' ' + (u.apellidos || '')).trim();
    return n || u.nombre || (u.email ? String(u.email).split('@')[0] : 'Usuario');
  }

  function listUsers() {
    var arr = [];
    try {
      if (typeof aulaLoad === 'function' && typeof AULA_KEYS !== 'undefined') {
        arr = aulaLoad(AULA_KEYS.users, []) || [];
      } else {
        arr = JSON.parse(localStorage.getItem('geometrics_users') || '[]') || [];
      }
    } catch (e) {
      arr = [];
    }
    return arr || [];
  }

  function findUserByEmail(email) {
    email = normEmail(email);
    return listUsers().find(function (u) {
      return normEmail(u && u.email) === email;
    }) || null;
  }

  function loadLocalTeam() {
    try {
      var raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      return Array.isArray(raw) ? raw : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocalTeam(list) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(list || []));
    } catch (e) {}
  }

  function resolveMember(entry) {
    var email = normEmail(entry.userEmail || entry.email);
    var user = findUserByEmail(email);
    var name = user ? fullName(user) : (entry.fallbackName || email.split('@')[0] || 'Integrante');
    var handle = email ? '@' + email.split('@')[0] : '';
    var photo =
      (entry.photoURL && String(entry.photoURL).trim()) ||
      (user && user.foto) ||
      '';
    return {
      userId: entry.userId || emailKey(email),
      userEmail: email,
      nombre: name,
      handle: handle,
      role: (entry.role != null && String(entry.role).trim() !== '') ? String(entry.role) : 'Integrante del equipo',
      photoURL: photo,
      order: entry.order || 0,
      exists: !!user,
      user: user
    };
  }

  function getTeamResolved() {
    return (state.team || [])
      .filter(function (e) {
        return e && e.active !== false;
      })
      .map(resolveMember)
      .filter(function (m) {
        // Si el usuario fue eliminado, ocultar (no mostrar datos fantasmas)
        return m.exists || (m.photoURL && m.nombre);
      })
      .sort(function (a, b) {
        return (a.order || 0) - (b.order || 0);
      });
  }

  /* ——— Render público (modal) ——— */
  function cardHtml(m) {
    var avatar = m.photoURL
      ? '<div class="gm-team-photo"><img src="' +
        esc(m.photoURL) +
        '" alt="' +
        esc(m.nombre) +
        '"></div>'
      : '<div class="gm-team-photo gm-team-photo-fallback" aria-hidden="true">' +
        esc(initials(m.nombre)) +
        '</div>';

    return (
      '<article class="gm-team-card">' +
      avatar +
      '<h3 class="gm-team-name">' +
      esc(m.nombre) +
      '</h3>' +
      (m.handle
        ? '<p class="gm-team-handle">' + esc(m.handle) + '</p>'
        : '') +
      '<p class="gm-team-role">' +
      esc(m.role) +
      '</p>' +
      '</article>'
    );
  }

  function renderGrid() {
    var grid = document.getElementById('gmEquipoGrid');
    if (!grid) return;
    var members = getTeamResolved();
    if (!members.length) {
      grid.innerHTML =
        '<div class="gm-team-empty">' +
        '<p>Nuestro equipo está tomando forma.</p>' +
        '<p>Pronto conocerás a quienes hacen posible GeoMetrics.</p>' +
        '</div>';
      return;
    }
    grid.innerHTML = members.map(cardHtml).join('');
  }

  function updateAdminBtnVisibility() {
    var btn = document.getElementById('btnEquipoAdminOpen');
    if (btn) btn.hidden = true;
    var show = isSuperAdmin();
    var adminCard = document.getElementById('adminEquipoCard');
    var galleryCard = document.getElementById('adminEquipoGalleryCard');
    if (adminCard) adminCard.hidden = !show;
    if (galleryCard) galleryCard.hidden = !show;
  }

  /* ——— Persistencia ——— */
  function applyTeam(list, opts) {
    opts = opts || {};
    var incoming = (list || []).slice();
    var byId = {};
    (state.team || []).forEach(function (e) {
      if (e && e.userId) byId[e.userId] = e;
    });
    // Fusionar: si el local tiene updatedAt más reciente, conservar role local completo
    var merged = incoming.map(function (row) {
      if (!row || !row.userId) return row;
      var local = byId[row.userId];
      if (local && (local.updatedAt || 0) > (row.updatedAt || 0)) {
        return {
          userId: row.userId,
          userEmail: row.userEmail || local.userEmail,
          role: local.role,
          photoURL: local.photoURL || row.photoURL || '',
          order: typeof row.order === 'number' ? row.order : local.order,
          active: row.active !== false,
          createdAt: row.createdAt || local.createdAt || 0,
          updatedAt: local.updatedAt
        };
      }
      return row;
    });
    // Añadir locales que aún no están en la nube
    Object.keys(byId).forEach(function (id) {
      if (!merged.some(function (r) { return r && r.userId === id; })) {
        merged.push(byId[id]);
      }
    });
    state.team = merged;
    saveLocalTeam(state.team);
    renderGrid();
    if (isSuperAdmin() && !opts.skipAdmin) {
      try {
        var ae = document.activeElement;
        if (ae && ae.getAttribute && ae.getAttribute('data-team-role')) return;
        if (ae && ae.getAttribute && ae.getAttribute('data-team-photo')) return;
      } catch (eSkip) {}
      renderAdminList();
    }
  }

  function syncFromCloud() {
    if (window.GeoCloud && GeoCloud.isOn && GeoCloud.isOn() && typeof GeoCloud.pullTeamCreators === 'function') {
      return GeoCloud.pullTeamCreators().then(function (list) {
        if (list && list.length) applyTeam(list);
        else if (list && list.length === 0) applyTeam([]);
        else applyTeam(loadLocalTeam());
        return state.team;
      }).catch(function () {
        applyTeam(loadLocalTeam());
        return state.team;
      });
    }
    applyTeam(loadLocalTeam());
    return Promise.resolve(state.team);
  }

  function startListen() {
    if (state.listening) return;
    if (window.GeoCloud && GeoCloud.isOn && GeoCloud.isOn() && typeof GeoCloud.listenTeamCreators === 'function') {
      state.listening = true;
      GeoCloud.listenTeamCreators(function (list) {
        applyTeam(list || []);
      });
    }
  }

  function persistEntry(entry) {
    saveLocalTeam(state.team);
    if (window.GeoCloud && GeoCloud.isOn && GeoCloud.isOn() && typeof GeoCloud.pushTeamCreator === 'function') {
      return GeoCloud.pushTeamCreator(entry);
    }
    return Promise.resolve(true);
  }

  function persistRemove(userId) {
    state.team = state.team.filter(function (e) {
      return e.userId !== userId;
    });
    saveLocalTeam(state.team);
    if (window.GeoCloud && GeoCloud.isOn && GeoCloud.isOn() && typeof GeoCloud.removeTeamCreator === 'function') {
      return GeoCloud.removeTeamCreator(userId);
    }
    return Promise.resolve(true);
  }

  /* ——— Modal open/close ——— */
  var lastFocus = null;

  function openModal() {
    var modal = document.getElementById('gmEquipoModal');
    if (!modal) return;
    lastFocus = document.activeElement;
    updateAdminBtnVisibility();
    syncFromCloud().then(function () {
      renderGrid();
      startListen();
    });
    modal.hidden = false;
    document.body.classList.add('gm-equipo-modal-open');
    var closeBtn = document.getElementById('btnEquipoCerrar');
    if (closeBtn) {
      try {
        closeBtn.focus();
      } catch (e) {}
    }
  }

  function closeModal() {
    var modal = document.getElementById('gmEquipoModal');
    if (!modal) return;
    modal.hidden = true;
    document.body.classList.remove('gm-equipo-modal-open');
    closeAdminPanel();
    if (lastFocus && typeof lastFocus.focus === 'function') {
      try {
        lastFocus.focus();
      } catch (e) {}
    }
  }

  /* ——— Superadmin panel ——— */
  function openAdminPanel() {
    if (!isSuperAdmin()) {
      alert('Solo el Superadministrador puede gestionar el equipo creador.');
      return;
    }
    state.adminOpen = true;
    var panel = document.getElementById('gmTeamAdminPanel');
    if (panel) panel.hidden = false;
    renderAdminList();
    renderUserPick('');
  }

  function closeAdminPanel() {
    state.adminOpen = false;
    var panel = document.getElementById('gmTeamAdminPanel');
    if (panel) panel.hidden = true;
    state.draftPhoto = null;
    state.draftUserId = null;
  }

  function renderUserPick(q) {
    var box = document.getElementById('gmTeamUserPick') || document.getElementById('adminTeamUserPick');
    if (!box) return;
    q = String(q || '').toLowerCase().trim();
    var inTeam = {};
    (state.team || []).forEach(function (e) {
      inTeam[normEmail(e.userEmail)] = true;
    });
    var users = listUsers().filter(function (u) {
      if (!u || !u.email) return false;
      if (inTeam[normEmail(u.email)]) return false;
      if (!q) return true;
      var blob = (fullName(u) + ' ' + u.email).toLowerCase();
      return blob.indexOf(q) >= 0;
    });
    users = users.slice(0, 40);
    if (!users.length) {
      box.innerHTML = '<p class="gm-team-admin-hint">No hay usuarios disponibles para agregar' + (q ? ' con ese filtro' : '') + '.</p>';
      return;
    }
    box.innerHTML = users
      .map(function (u) {
        var em = normEmail(u.email);
        return (
          '<div class="gm-team-pick-row" data-team-add="' +
          esc(em) +
          '">' +
          '<div class="gm-team-pick-info"><strong>' +
          esc(fullName(u)) +
          '</strong><span>' +
          esc(em) +
          '</span></div>' +
          '<button type="button" class="gm-team-mini-btn" data-team-add="' +
          esc(em) +
          '">Agregar</button>' +
          '</div>'
        );
      })
      .join('');
  }

  function renderAdminList() {
    var members = getTeamResolved();
    var countEl = document.getElementById('adminTeamCount');
    if (countEl) countEl.textContent = String(members.length);

    var box = document.getElementById('adminTeamList');
    if (!box) return;

    if (!members.length) {
      box.innerHTML =
        '<div class="gm-team-empty">' +
        '<p>Aún no hay integrantes en el equipo.</p>' +
        '<p>Agrégalos con el formulario de «Administrar equipo creador».</p>' +
        '</div>';
      return;
    }

    box.innerHTML = members
      .map(function (m) {
        var entry = (state.team || []).find(function (e) {
          return e.userId === m.userId;
        }) || {};
        var avatar = m.photoURL
          ? '<div class="gm-team-photo"><img src="' + esc(m.photoURL) + '" alt="' + esc(m.nombre) + '"></div>'
          : '<div class="gm-team-photo gm-team-photo-fallback" aria-hidden="true">' + esc(initials(m.nombre)) + '</div>';

        return (
          '<article class="gm-team-card gm-team-card-manage" data-team-id="' + esc(m.userId) + '">' +
          avatar +
          '<h3 class="gm-team-name">' + esc(m.nombre) + '</h3>' +
          (m.handle ? '<p class="gm-team-handle">' + esc(m.handle) + '</p>' : '') +
          '<p class="gm-team-role">' + esc(m.role) + '</p>' +
          '<div class="gm-team-card-manage-bar">' +
          '<input type="text" class="gm-team-card-role-input" data-team-role="' + esc(m.userId) +
          '" value="' + esc(entry.role || m.role || '') +
          '" placeholder="Cargo" maxlength="160" autocomplete="off" title="Editar cargo">' +
          '<label class="gm-team-card-photo-btn" title="Cambiar foto">' +
          '📷<input type="file" accept="image/jpeg,image/png,image/webp,image/jpg" data-team-photo="' + esc(m.userId) + '" hidden>' +
          '</label>' +
          '<button type="button" class="gm-team-ico-btn" title="Subir" data-team-up="' + esc(m.userId) + '">↑</button>' +
          '<button type="button" class="gm-team-ico-btn" title="Bajar" data-team-down="' + esc(m.userId) + '">↓</button>' +
          '<button type="button" class="gm-team-danger gm-team-card-remove" title="Retirar del equipo" data-team-remove="' +
          esc(m.userId) + '">Retirar</button>' +
          '</div>' +
          '</article>'
        );
      })
      .join('');
  }

  function addMember(email) {
    if (!isSuperAdmin()) return;
    email = normEmail(email);
    var user = findUserByEmail(email);
    if (!user) {
      alert('Usuario no encontrado en la base de GeoMetrics.');
      return;
    }
    var id = emailKey(email);
    if (state.team.some(function (e) { return e.userId === id || normEmail(e.userEmail) === email; })) {
      alert('Ese usuario ya está en el equipo.');
      return;
    }
    var maxOrder = state.team.reduce(function (m, e) {
      return Math.max(m, e.order || 0);
    }, 0);
    var entry = {
      userId: id,
      userEmail: email,
      role: '',
      photoURL: user.foto || '',
      order: maxOrder + 1,
      active: true,
      createdAt: Date.now()
    };
    state.team.push(entry);
    persistEntry(entry).then(function () {
      renderGrid();
      renderAdminList();
      renderUserPick((document.getElementById('gmTeamSearch') || document.getElementById('adminTeamSearch') || {}).value || '');
    });
  }

  function updateRole(userId, role, fromBlur) {
    if (!isSuperAdmin()) return;
    var entry = state.team.find(function (e) {
      return e.userId === userId;
    });
    if (!entry) return;
    // Valor completo del input (trim solo al confirmar con blur)
    var next = fromBlur ? String(role == null ? '' : role).trim() : String(role == null ? '' : role);
    entry.role = next;
    entry.updatedAt = Date.now();
    // Guardar siempre el texto completo al confirmar; en escritura solo memoria
    if (!fromBlur) {
      renderGrid();
      return;
    }
    persistEntry(entry).then(function () {
      renderGrid();
    });
  }

  function moveMember(userId, dir) {
    if (!isSuperAdmin()) return;
    var sorted = state.team.slice().sort(function (a, b) {
      return (a.order || 0) - (b.order || 0);
    });
    var idx = sorted.findIndex(function (e) {
      return e.userId === userId;
    });
    if (idx < 0) return;
    var j = idx + dir;
    if (j < 0 || j >= sorted.length) return;
    var tmp = sorted[idx].order;
    sorted[idx].order = sorted[j].order;
    sorted[j].order = tmp;
    // normalize sequential
    sorted.forEach(function (e, i) {
      e.order = i + 1;
    });
    state.team = sorted;
    Promise.all(
      state.team.map(function (e) {
        return persistEntry(e);
      })
    ).then(function () {
      renderGrid();
      renderAdminList();
    });
  }

  function removeMember(userId) {
    if (!isSuperAdmin()) return;
    if (!confirm('¿Retirar a esta persona del equipo creador? Su cuenta de GeoMetrics no se eliminará.')) return;
    persistRemove(userId).then(function () {
      renderGrid();
      renderAdminList();
      renderUserPick('');
    });
  }

  function compressImage(file, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var dataUrl = reader.result;
      try {
        var img = new Image();
        img.onload = function () {
          var max = 320;
          var w = img.width;
          var h = img.height;
          if (w > max || h > max) {
            var r = Math.min(max / w, max / h);
            w = Math.round(w * r);
            h = Math.round(h * r);
          }
          var c = document.createElement('canvas');
          c.width = w;
          c.height = h;
          var ctx = c.getContext('2d');
          // circle crop center
          var size = Math.min(w, h);
          var sx = (w - size) / 2;
          var sy = (h - size) / 2;
          var out = document.createElement('canvas');
          out.width = 256;
          out.height = 256;
          var octx = out.getContext('2d');
          octx.beginPath();
          octx.arc(128, 128, 128, 0, Math.PI * 2);
          octx.closePath();
          octx.clip();
          octx.drawImage(img, sx, sy, size, size, 0, 0, 256, 256);
          var jpeg = out.toDataURL('image/jpeg', 0.82);
          if (jpeg.length > 700000) jpeg = out.toDataURL('image/jpeg', 0.65);
          cb(jpeg);
        };
        img.onerror = function () {
          cb(dataUrl);
        };
        img.src = dataUrl;
      } catch (e) {
        cb(dataUrl);
      }
    };
    reader.onerror = function () {
      cb(null);
    };
    reader.readAsDataURL(file);
  }

  function setPhoto(userId, file) {
    if (!isSuperAdmin()) return;
    if (!file) return;
    var okType = /image\/(jpeg|jpg|png|webp)/i.test(file.type);
    if (!okType) {
      alert('Formato no permitido. Usa JPG, PNG o WebP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      alert('La imagen supera 8 MB.');
      return;
    }
    compressImage(file, function (dataUrl) {
      if (!dataUrl) {
        alert('No se pudo leer la imagen.');
        return;
      }
      // Prefer Storage if available
      var tryStorage = function () {
        return new Promise(function (resolve) {
          try {
            if (typeof firebase === 'undefined' || !firebase.storage) {
              resolve(null);
              return;
            }
            var cfg = typeof FIREBASE_CONFIG !== 'undefined' ? FIREBASE_CONFIG : null;
            if (!cfg || !cfg.storageBucket) {
              resolve(null);
              return;
            }
            var storage = firebase.storage();
            var ref = storage.ref('teamCreators/' + userId + '/photo.jpg');
            // dataURL → blob
            var byteString = atob(dataUrl.split(',')[1]);
            var mime = dataUrl.split(',')[0].match(/:(.*?);/)[1];
            var ab = new ArrayBuffer(byteString.length);
            var ia = new Uint8Array(ab);
            for (var i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
            var blob = new Blob([ab], { type: mime });
            ref
              .put(blob, { contentType: 'image/jpeg' })
              .then(function () {
                return ref.getDownloadURL();
              })
              .then(function (url) {
                resolve(url);
              })
              .catch(function () {
                resolve(null);
              });
          } catch (e) {
            resolve(null);
          }
        });
      };

      tryStorage().then(function (url) {
        var entry = state.team.find(function (e) {
          return e.userId === userId;
        });
        if (!entry) return;
        // Si Storage falla (sin Auth), guardar JPEG comprimido en el nodo RTDB
        // (mismo patrón que el avatar de Civix; tamaño controlado)
        entry.photoURL = url || dataUrl;
        entry.updatedAt = Date.now();
        persistEntry(entry).then(function () {
          renderGrid();
          renderAdminList();
        });
      });
    });
  }


  var ROLE_OPTIONS = [
    'Coordinación del proyecto',
    'Desarrollo frontend',
    'Desarrollo backend',
    'Diseño UX/UI',
    'Contenido académico',
    'Investigación y documentación',
    'Simuladores y ensayos',
    'Pruebas y calidad'
  ];

  function lookupRegisteredUser(emailOrQuery) {
    var q = String(emailOrQuery || '').trim().toLowerCase();
    if (!q) return null;
    var users = listUsers();
    // Exact email match first
    var exact = users.find(function (u) {
      return normEmail(u && u.email) === normEmail(q);
    });
    if (exact) return exact;
    // Partial email / name
    var hits = users.filter(function (u) {
      if (!u || !u.email) return false;
      var blob = (fullName(u) + ' ' + u.email).toLowerCase();
      return blob.indexOf(q) >= 0;
    });
    if (hits.length === 1) return hits[0];
    // If looks like email local-part, try @unipamplona
    if (q.indexOf('@') < 0 && q.length >= 3) {
      var guess = q + '@unipamplona.edu.co';
      return users.find(function (u) {
        return normEmail(u && u.email) === guess;
      }) || null;
    }
    return null;
  }

  function setAdminLookupUI(user, errorMsg) {
    var box = document.getElementById('adminTeamLookup');
    var err = document.getElementById('adminTeamLookupError');
    var nameEl = document.getElementById('adminTeamLookupName');
    var emailEl = document.getElementById('adminTeamLookupEmail');
    var rolEl = document.getElementById('adminTeamLookupRol');
    var av = document.getElementById('adminTeamLookupAvatar');
    if (err) {
      if (errorMsg) {
        err.hidden = false;
        err.textContent = errorMsg;
      } else {
        err.hidden = true;
        err.textContent = '';
      }
    }
    if (!box) return;
    if (!user) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    if (nameEl) nameEl.textContent = fullName(user);
    if (emailEl) emailEl.textContent = normEmail(user.email);
    if (rolEl) {
      var r = String(user.rol || '').toLowerCase();
      rolEl.textContent = r === 'docente' ? 'Docente' : (r === 'estudiante' ? 'Estudiante' : (user.rol || ''));
    }
    if (av) {
      if (user.foto) {
        av.innerHTML = '<img src="' + esc(user.foto) + '" alt="">';
        av.classList.add('has-img');
      } else {
        av.textContent = initials(fullName(user));
        av.classList.remove('has-img');
      }
    }
  }

  function getSelectedAdminRole() {
    var sel = document.getElementById('adminTeamRoleSelect');
    var custom = document.getElementById('adminTeamRoleCustom');
    if (!sel) return '';
    if (sel.value === '__custom') {
      return custom ? String(custom.value || '').trim() : '';
    }
    return String(sel.value || '').trim();
  }

  function adminAddFromForm() {
    if (!isSuperAdmin()) {
      alert('Solo el Superadministrador puede agregar integrantes.');
      return;
    }
    var emailInp = document.getElementById('adminTeamEmail');
    var raw = emailInp ? emailInp.value : '';
    var user = lookupRegisteredUser(raw);
    var msg = document.getElementById('adminTeamAddMsg');
    function showMsg(text, ok) {
      if (!msg) return;
      msg.hidden = false;
      msg.textContent = text;
      msg.className = 'gm-team-add-msg' + (ok ? ' ok' : ' err');
    }
    if (!user) {
      setAdminLookupUI(null, 'No hay un usuario registrado en GeoMetrics con ese correo institucional.');
      showMsg('Correo no encontrado en la base de datos.', false);
      return;
    }
    setAdminLookupUI(user, null);
    var role = getSelectedAdminRole();
    if (!role) {
      showMsg('Selecciona o escribe un cargo para el integrante.', false);
      var sel = document.getElementById('adminTeamRoleSelect');
      if (sel) sel.focus();
      return;
    }
    var email = normEmail(user.email);
    var id = emailKey(email);
    if (state.team.some(function (e) {
      return e.userId === id || normEmail(e.userEmail) === email;
    })) {
      showMsg('Ese usuario ya pertenece al equipo creador.', false);
      return;
    }
    var maxOrder = state.team.reduce(function (m, e) {
      return Math.max(m, e.order || 0);
    }, 0);
    var entry = {
      userId: id,
      userEmail: email,
      role: role,
      photoURL: user.foto || '',
      order: maxOrder + 1,
      active: true,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    state.team.push(entry);
    persistEntry(entry).then(function () {
      renderGrid();
      renderAdminList();
      showMsg('Integrante agregado: ' + fullName(user) + ' · ' + role, true);
      if (emailInp) emailInp.value = '';
      setAdminLookupUI(null, null);
      var sel = document.getElementById('adminTeamRoleSelect');
      if (sel) sel.value = '';
      var custom = document.getElementById('adminTeamRoleCustom');
      var wrap = document.getElementById('adminTeamRoleCustomWrap');
      if (custom) custom.value = '';
      if (wrap) wrap.hidden = true;
    });
  }

  function onAdminEmailInput() {
    var emailInp = document.getElementById('adminTeamEmail');
    if (!emailInp) return;
    var q = emailInp.value;
    clearTimeout(emailInp._lookupT);
    emailInp._lookupT = setTimeout(function () {
      var user = lookupRegisteredUser(q);
      if (!String(q || '').trim()) {
        setAdminLookupUI(null, null);
        return;
      }
      if (user) setAdminLookupUI(user, null);
      else setAdminLookupUI(null, 'No coincide con ningún correo registrado. Verifica el correo institucional.');
    }, 280);
  }


  /* ——— Events ——— */
  function bind() {
    if (global.__gmEquipoBound) return;
    global.__gmEquipoBound = true;

    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;

      if (t.closest('#btnEquipoCreador')) {
        e.preventDefault();
        openModal();
        return;
      }
      if (t.closest('#btnEquipoCerrar') || t.closest('[data-equipo-close]')) {
        e.preventDefault();
        closeModal();
        return;
      }
      if (t.closest('#btnEquipoAdminOpen')) {
        e.preventDefault();
        openAdminPanel();
        return;
      }
      if (t.closest('#btnEquipoAdminClose')) {
        e.preventDefault();
        closeAdminPanel();
        return;
      }

      var add = t.closest('[data-team-add]');
      if (add) {
        e.preventDefault();
        addMember(add.getAttribute('data-team-add'));
        return;
      }
      var up = t.closest('[data-team-up]');
      if (up) {
        e.preventDefault();
        moveMember(up.getAttribute('data-team-up'), -1);
        return;
      }
      var down = t.closest('[data-team-down]');
      if (down) {
        e.preventDefault();
        moveMember(down.getAttribute('data-team-down'), 1);
        return;
      }
      var rm = t.closest('[data-team-remove]');
      if (rm) {
        e.preventDefault();
        removeMember(rm.getAttribute('data-team-remove'));
        return;
      }
      if (t.closest('#btnAdminTeamRefresh')) {
        e.preventDefault();
        syncFromCloud().then(function () {
          renderAdminList();
          renderUserPick('');
          onAdminEmailInput();
        });
        return;
      }
      if (t.closest('#btnAdminTeamAdd')) {
        e.preventDefault();
        adminAddFromForm();
        return;
      }
    });

    // Correo institucional → lookup en vivo
    document.addEventListener('input', function (e2) {
      if (!e2.target) return;
      if (e2.target.id === 'adminTeamEmail') onAdminEmailInput();
    });
    document.addEventListener('change', function (e2) {
      if (!e2.target) return;
      if (e2.target.id === 'adminTeamRoleSelect') {
        var wrap = document.getElementById('adminTeamRoleCustomWrap');
        if (wrap) wrap.hidden = e2.target.value !== '__custom';
        if (e2.target.value === '__custom') {
          var c = document.getElementById('adminTeamRoleCustom');
          if (c) c.focus();
        }
      }
    });
    document.addEventListener('keydown', function (e2) {
      if (!e2.target || e2.target.id !== 'adminTeamEmail') return;
      if (e2.key === 'Enter') {
        e2.preventDefault();
        onAdminEmailInput();
        var sel = document.getElementById('adminTeamRoleSelect');
        if (sel) sel.focus();
      }
    });

    document.addEventListener('input', function (e) {
      var t = e.target;
      if (!t) return;
      if (t.id === 'gmTeamSearch' || t.id === 'adminTeamSearch') {
        renderUserPick(t.value);
        return;
      }
      if (t.getAttribute && t.getAttribute('data-team-role')) {
        var id = t.getAttribute('data-team-role');
        // Solo memoria local mientras escribe (texto completo del input)
        var entry = state.team.find(function (e) { return e.userId === id; });
        if (entry) {
          entry.role = String(t.value == null ? '' : t.value);
          entry.updatedAt = Date.now();
        }
        // Vista previa en tarjetas sin tocar el input
        clearTimeout(t._teamPreviewT);
        t._teamPreviewT = setTimeout(function () { renderGrid(); }, 200);
      }
    });

    document.addEventListener('blur', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      if (t.getAttribute('data-team-role')) {
        clearTimeout(t._teamPreviewT);
        // Persistir el valor COMPLETO del campo al salir
        updateRole(t.getAttribute('data-team-role'), t.value, true);
      }
    }, true);

    document.addEventListener('keydown', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute || !t.getAttribute('data-team-role')) return;
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(t._teamPreviewT);
        updateRole(t.getAttribute('data-team-role'), t.value, true);
        try { t.blur(); } catch (eB) {}
      }
    });

    document.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var pid = t.getAttribute('data-team-photo');
      if (pid && t.files && t.files[0]) {
        setPhoto(pid, t.files[0]);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      var admin = document.getElementById('gmTeamAdminPanel');
      if (admin && !admin.hidden) {
        closeAdminPanel();
        return;
      }
      var modal = document.getElementById('gmEquipoModal');
      if (modal && !modal.hidden) {
        e.preventDefault();
        closeModal();
      }
    });
  }

  function ensureModalAdminUI() {
    var modal = document.getElementById('gmEquipoModal');
    if (!modal) return;
    var panel = modal.querySelector('.gm-equipo-modal-panel');
    if (!panel) return;

    // Quitar botón y panel de administración del modal (solo panel Superadmin)
    var btn = document.getElementById('btnEquipoAdminOpen');
    if (btn && btn.parentNode) btn.parentNode.removeChild(btn);
    var adminPanel = document.getElementById('gmTeamAdminPanel');
    if (adminPanel && adminPanel.parentNode) adminPanel.parentNode.removeChild(adminPanel);

    var note = panel.querySelector('.gm-equipo-modal-note');
    if (note) {
      note.textContent = isSuperAdmin()
        ? 'Como Superadministrador puedes gestionar el equipo desde el Panel de administración.'
        : 'Equipo de desarrollo de GeoMetrics · Universidad de Pamplona.';
    }
  }

  function init() {
    ensureModalAdminUI();
    bind();
    updateAdminBtnVisibility();
    applyTeam(loadLocalTeam());
    syncFromCloud().then(startListen);
    // Cuando se abre el panel admin de la app
    try {
      var btnAdmin = document.getElementById('btnAdminPanel');
      if (btnAdmin) {
        btnAdmin.addEventListener('click', function () {
          setTimeout(updateAdminBtnVisibility, 300);
          setTimeout(function () {
            if (isSuperAdmin()) {
              renderAdminList();
              renderUserPick('');
            }
          }, 400);
        });
      }
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  global.GeoMetricsEquipo = {
    open: openModal,
    close: closeModal,
    render: renderGrid,
    sync: syncFromCloud,
    isSuperAdmin: isSuperAdmin,
    refreshAdmin: function () { renderAdminList(); onAdminEmailInput(); }
  };
})(window);
