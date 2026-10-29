/**
 * GeoMetrics — Chat general (Mensajes)
 * Lista + conversación; panel derecho del aula (calendario) aparte.
 */
(function (global) {
  'use strict';

  var state = {
    host: null,
    filter: 'todos',
    q: '',
    activeId: null,
    composing: false,
    _poll: null,
    _lastSig: ''
  };

  function esc(s) {
    if (typeof aulaEsc === 'function') return aulaEsc(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function session() {
    try {
      return typeof aulaGetSession === 'function' ? aulaGetSession() : null;
    } catch (e) { return null; }
  }

  function normEmail(e) {
    if (typeof aulaNormalizarEmail === 'function') return aulaNormalizarEmail(e);
    return String(e || '').trim().toLowerCase();
  }

  function fullName(u) {
    if (!u) return 'Usuario';
    var n = ((u.nombres || '') + ' ' + (u.apellidos || '')).trim();
    return n || u.nombre || (u.email ? String(u.email).split('@')[0] : 'Usuario');
  }

  function initials(name) {
    var n = String(name || '?').trim().split(/\s+/).filter(Boolean);
    if (n.length >= 2) return (n[0][0] + n[1][0]).toUpperCase();
    return (n[0] || '?').slice(0, 2).toUpperCase();
  }

  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    var now = new Date();
    if (d.toDateString() === now.toDateString()) {
      return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }
    var y = new Date(now); y.setDate(y.getDate() - 1);
    if (d.toDateString() === y.toDateString()) return 'Ayer';
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  }

  function listUsers() {
    try {
      if (typeof aulaLoad === 'function' && typeof AULA_KEYS !== 'undefined') {
        return aulaLoad(AULA_KEYS.users, []) || [];
      }
      return JSON.parse(localStorage.getItem('geometrics_users') || '[]') || [];
    } catch (e) { return []; }
  }

  function materiasOf(u) {
    if (!u) return [];
    try {
      if (typeof aulaMateriasUsuario === 'function') {
        return (aulaMateriasUsuario(u) || []).map(function (m) {
          return typeof m === 'string' ? m : (m.nombre || m.name || m.materia || '');
        }).filter(Boolean);
      }
    } catch (e) {}
    if (Array.isArray(u.materias)) {
      return u.materias.map(function (m) {
        return typeof m === 'string' ? m : (m.nombre || m.name || '');
      }).filter(Boolean);
    }
    return [];
  }

  function loadChats() {
    var local = [];
    try {
      local = JSON.parse(localStorage.getItem('gm_chats_v1') || '[]') || [];
      if (!Array.isArray(local)) local = [];
    } catch (e) { local = []; }
    try {
      if (typeof aulaChatLoad === 'function') {
        var a = aulaChatLoad() || [];
        if (a.length) {
          // merge local (más reciente) con API
          var map = {};
          a.forEach(function (c) { if (c && c.id) map[c.id] = c; });
          local.forEach(function (c) {
            if (!c || !c.id) return;
            if (!map[c.id]) map[c.id] = c;
            else {
              var cur = map[c.id];
              if ((c.updatedAt || 0) >= (cur.updatedAt || 0)) map[c.id] = c;
              else if ((c.messages || []).length > (cur.messages || []).length) map[c.id] = c;
            }
          });
          return Object.keys(map).map(function (k) { return map[k]; });
        }
      }
    } catch (e2) {}
    return local;
  }

  function saveChat(chat) {
    if (!chat || !chat.id) return;
    // Siempre local primero (fuente de verdad inmediata)
    try {
      var list = [];
      try { list = JSON.parse(localStorage.getItem('gm_chats_v1') || '[]') || []; } catch (e0) { list = []; }
      if (!Array.isArray(list)) list = [];
      var ix = list.findIndex(function (x) { return x && x.id === chat.id; });
      if (ix >= 0) list[ix] = chat; else list.push(chat);
      localStorage.setItem('gm_chats_v1', JSON.stringify(list));
    } catch (e) {
      console.warn('saveChat local', e);
    }
    try {
      if (typeof aulaChatSaveOne === 'function') aulaChatSaveOne(chat);
    } catch (e2) {}
    pushChatCloud(chat);
  }

  function pushChatCloud(chat) {
    if (!chat || !chat.id) return;
    try {
      if (typeof GeoCloud !== 'undefined' && GeoCloud.isOn && GeoCloud.isOn()) {
        if (typeof GeoCloud.pushChat === 'function') {
          GeoCloud.pushChat(chat).catch(function (err) {
            console.warn('pushChat cloud', err);
          });
        }
      }
    } catch (e) {
      console.warn('pushChatCloud', e);
    }
  }

  function mergeChatLists(localList, remoteList) {
    var map = {};
    (localList || []).forEach(function (c) {
      if (c && c.id) map[c.id] = c;
    });
    (remoteList || []).forEach(function (c) {
      if (!c || !c.id) return;
      if (!map[c.id]) {
        map[c.id] = c;
        return;
      }
      // Fusionar mensajes de ambos lados
      var base = map[c.id];
      var merged = {
        id: c.id,
        type: c.type || base.type,
        tipo: c.tipo || base.tipo,
        materia: c.materia || base.materia,
        grupo: c.grupo || base.grupo,
        studentEmail: c.studentEmail || base.studentEmail,
        studentName: c.studentName || base.studentName,
        teacherEmail: c.teacherEmail || base.teacherEmail,
        teacherName: c.teacherName || base.teacherName,
        peerEmail: c.peerEmail || base.peerEmail,
        peerName: c.peerName || base.peerName,
        members: c.members || base.members,
        messages: [],
        updatedAt: Math.max(c.updatedAt || 0, base.updatedAt || 0)
      };
      var seen = {};
      function addMsgs(arr) {
        (arr || []).forEach(function (m) {
          if (!m) return;
          var k = (m.id || '') + '|' + (m.ts || '') + '|' + String(m.text || '').slice(0, 40);
          if (seen[k]) return;
          seen[k] = true;
          merged.messages.push(m);
        });
      }
      addMsgs(base.messages);
      addMsgs(c.messages);
      merged.messages.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
      // Preferir campos del más reciente
      if ((c.updatedAt || 0) >= (base.updatedAt || 0)) {
        merged.teacherEmail = c.teacherEmail || merged.teacherEmail;
        merged.teacherName = c.teacherName || merged.teacherName;
        merged.studentEmail = c.studentEmail || merged.studentEmail;
        merged.studentName = c.studentName || merged.studentName;
        merged.peerEmail = c.peerEmail || merged.peerEmail;
        merged.peerName = c.peerName || merged.peerName;
        merged.materia = c.materia || merged.materia;
      }
      map[c.id] = merged;
    });
    return Object.keys(map).map(function (k) { return map[k]; });
  }

  function applyRemoteChats(remoteArr) {
    if (!remoteArr || !remoteArr.length) return;
    var local = loadChats();
    var merged = mergeChatLists(local, remoteArr);
    try {
      localStorage.setItem('gm_chats_v1', JSON.stringify(merged));
    } catch (e) {}
    if (state.host) paint(state.host);
  }

  function syncFromCloud() {
    try {
      if (typeof GeoCloud === 'undefined' || !GeoCloud.isOn || !GeoCloud.isOn()) {
        state.cloudStatus = 'local';
        return Promise.resolve(false);
      }
      state.cloudStatus = 'syncing';
      return GeoCloud.pullChats().then(function (arr) {
        if (arr && arr.length) applyRemoteChats(arr);
        state.cloudStatus = 'online';
        if (state.host) paint(state.host);
        return true;
      }).catch(function () {
        state.cloudStatus = 'error';
        return false;
      });
    } catch (e) {
      state.cloudStatus = 'error';
      return Promise.resolve(false);
    }
  }

  function startCloudListen() {
    try {
      if (typeof GeoCloud === 'undefined' || !GeoCloud.isOn || !GeoCloud.isOn()) return;
      if (typeof GeoCloud.listenChats !== 'function') return;
      if (state._cloudUnsub) return; // ya escuchando
      state._cloudUnsub = GeoCloud.listenChats(function (arr) {
        applyRemoteChats(arr || []);
        state.cloudStatus = 'online';
      });
    } catch (e) {
      console.warn('listenChats', e);
    }
  }

  function chatEmails(c) {
    var emails = [
      normEmail(c.studentEmail),
      normEmail(c.teacherEmail),
      normEmail(c.peerEmail),
      normEmail(c.emailA),
      normEmail(c.emailB)
    ];
    (c.members || []).forEach(function (m) { emails.push(normEmail(m)); });
    return emails.filter(Boolean);
  }

  function conversationKey(c, me) {
    me = normEmail(me);
    if (!c) return '';
    if (c.tipo === 'grupo' || c.type === 'grupo') return 'g:' + (c.id || '');
    var other = peerOtherEmail(c, me);
    return other ? ('u:' + other) : ('id:' + (c.id || ''));
  }

  function peerOtherEmail(c, me) {
    me = normEmail(me);
    if (!c) return '';
    var emails = chatEmails(c);
    for (var i = 0; i < emails.length; i++) {
      if (emails[i] !== me) return emails[i];
    }
    return '';
  }

  function mergeMessages(target, source) {
    if (!source || !source.messages) return target;
    if (!target.messages) target.messages = [];
    var seen = {};
    target.messages.forEach(function (m) {
      seen[(m.id || '') + '|' + (m.ts || '') + '|' + (m.text || '')] = true;
    });
    source.messages.forEach(function (m) {
      var k = (m.id || '') + '|' + (m.ts || '') + '|' + (m.text || '');
      if (!seen[k]) { target.messages.push(m); seen[k] = true; }
    });
    target.messages.sort(function (a, b) { return (a.ts || 0) - (b.ts || 0); });
    if ((source.updatedAt || 0) > (target.updatedAt || 0)) target.updatedAt = source.updatedAt;
    return target;
  }

  function myChats(u) {
    if (!u) return [];
    var me = normEmail(u.email);
    var raw = loadChats().filter(function (c) {
      return c && c.id && chatEmails(c).indexOf(me) >= 0;
    });
    var byKey = {};
    raw.forEach(function (c) {
      var key = conversationKey(c, me);
      if (!byKey[key]) byKey[key] = c;
      else {
        var cur = byKey[key];
        var curN = (cur.messages && cur.messages.length) || 0;
        var newN = (c.messages && c.messages.length) || 0;
        if (newN > curN || (newN === curN && (c.updatedAt || 0) > (cur.updatedAt || 0))) {
          mergeMessages(c, cur);
          byKey[key] = c;
        } else mergeMessages(cur, c);
      }
    });
    return Object.keys(byKey).map(function (k) { return byKey[k]; })
      .sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
  }

  function chatTitle(c, u) {
    if (!c) return 'Chat';
    var me = normEmail(u && u.email);
    var other = peerOtherEmail(c, me);
    if (c.tipo === 'grupo' || c.type === 'grupo') return c.titulo || ('Grupo · ' + (c.materia || ''));
    if (other) {
      if (normEmail(c.teacherEmail) === other) return c.teacherName || other;
      if (normEmail(c.peerEmail) === other) return c.peerName || other;
      if (normEmail(c.studentEmail) === other) return c.studentName || other;
      var peer = listUsers().find(function (x) { return normEmail(x.email) === other; });
      if (peer) return fullName(peer);
      return other.split('@')[0];
    }
    return c.teacherName || c.studentName || c.peerName || 'Chat';
  }

  function chatSubtitle(c) {
    if (!c) return '';
    var parts = [];
    if (c.materia) parts.push(c.materia);
    if (c.grupo) parts.push('Grupo ' + c.grupo);
    return parts.join(' · ') || 'Conversación';
  }

  function lastPreview(c) {
    if (!c || !c.messages || !c.messages.length) return 'Sin mensajes aún';
    var m = c.messages[c.messages.length - 1];
    return String(m.text || '').replace(/\s+/g, ' ').slice(0, 60);
  }

  function unreadCount(c, u) {
    try {
      if (typeof aulaChatUnread === 'function') return aulaChatUnread(c, normEmail(u.email)) || 0;
    } catch (e) {}
    return 0;
  }

  function activeChat() {
    if (!state.activeId) return null;
    var u = session();
    var list = u ? myChats(u) : loadChats();
    var found = list.find(function (c) { return c.id === state.activeId; });
    if (found) return found;
    var raw = loadChats().find(function (c) { return c.id === state.activeId; });
    if (!raw) return null;
    if (u) {
      var key = conversationKey(raw, u.email);
      var alt = list.find(function (c) { return conversationKey(c, u.email) === key; });
      if (alt) return alt;
    }
    return raw;
  }

  function isDocenteEmail(email) {
    email = normEmail(email);
    if (!email) return false;
    try {
      if (typeof aulaEsCorreoDocente === 'function' && aulaEsCorreoDocente(email)) return true;
    } catch (e) {}
    try {
      if (typeof aulaListaCorreosDocentes === 'function') {
        var arr = aulaListaCorreosDocentes() || [];
        if (arr.some(function (e) { return normEmail(e) === email; })) return true;
      }
    } catch (e2) {}
    try {
      if (typeof AULA_CONFIG !== 'undefined' && AULA_CONFIG.docentes) {
        if ((AULA_CONFIG.docentes || []).some(function (e) { return normEmail(e) === email; })) return true;
      }
    } catch (e3) {}
    var peer = listUsers().find(function (x) { return normEmail(x.email) === email; });
    if (peer) {
      var r = String(peer.rol || '').toLowerCase();
      if (r === 'docente' || r === 'profesor' || r === 'teacher') return true;
    }
    return false;
  }

  function isEstudianteEmail(email) {
    email = normEmail(email);
    if (!email) return false;
    if (isDocenteEmail(email)) return false;
    var peer = listUsers().find(function (x) { return normEmail(x.email) === email; });
    if (peer) {
      var r = String(peer.rol || '').toLowerCase();
      if (r === 'estudiante' || r === 'student' || !r) return true;
    }
    // Si no está en users pero es el studentEmail de un chat, tratarlo como estudiante
    return true;
  }

  function isGrupoChat(c) {
    if (!c) return false;
    if (c.tipo === 'grupo' || c.type === 'grupo') return true;
    if (c.isGroup || c.grupoChat) return true;
    // 3+ miembros → grupo
    if ((c.members || []).length >= 3) return true;
    return false;
  }

  /** Rol del interlocutor respecto a mí */
  function otherRole(c, me) {
    me = normEmail(me);
    if (isGrupoChat(c)) return 'grupo';
    var other = peerOtherEmail(c, me);
    if (!other) return 'otro';

    // Preferir datos del chat
    if (c.teacherEmail && normEmail(c.teacherEmail) === other) return 'docente';
    if (c.studentEmail && normEmail(c.studentEmail) === other && normEmail(c.teacherEmail) === me) return 'estudiante';

    if (isDocenteEmail(other)) return 'docente';

    var peer = listUsers().find(function (x) { return normEmail(x.email) === other; });
    if (peer) {
      var r = String(peer.rol || '').toLowerCase();
      if (r === 'docente' || r === 'profesor' || r === 'teacher') return 'docente';
      if (r === 'estudiante' || r === 'student') return 'estudiante';
    }
    // Si yo soy docente y el otro no, suele ser estudiante
    var u = session();
    if (u && (String(u.rol || '').toLowerCase() === 'docente' || isDocenteEmail(u.email))) {
      return 'estudiante';
    }
    // Si el chat tiene teacherEmail = yo y student = other
    if (normEmail(c.teacherEmail) === me && normEmail(c.studentEmail) === other) return 'estudiante';
    return 'estudiante';
  }

  function filteredChats(u) {
    var list = myChats(u) || [];
    var q = (state.q || '').toLowerCase().trim();
    var me = normEmail(u.email);
    var f = state.filter || 'todos';

    if (f === 'docentes') {
      list = list.filter(function (c) { return otherRole(c, me) === 'docente'; });
    } else if (f === 'estudiantes') {
      list = list.filter(function (c) { return otherRole(c, me) === 'estudiante'; });
    } else if (f === 'grupos') {
      list = list.filter(function (c) { return isGrupoChat(c) || otherRole(c, me) === 'grupo'; });
    }
    // f === 'todos' → sin filtro de rol

    if (q) {
      list = list.filter(function (c) {
        return chatTitle(c, u).toLowerCase().indexOf(q) >= 0 ||
          chatSubtitle(c).toLowerCase().indexOf(q) >= 0 ||
          lastPreview(c).toLowerCase().indexOf(q) >= 0;
      });
    }
    return list;
  }

  function suggestedContacts(u) {
    var users = listUsers();
    var me = normEmail(u.email);
    var mats = materiasOf(u);
    var out = [];
    users.forEach(function (p) {
      if (!p || !p.email || normEmail(p.email) === me) return;
      var rol = String(p.rol || '').toLowerCase();
      var pMats = materiasOf(p);
      var shared = mats.filter(function (m) { return pMats.indexOf(m) >= 0; });
      if (rol === 'docente' || rol === 'profesor') {
        out.push({ user: p, reason: shared[0] || 'Docente', kind: 'docente' });
        return;
      }
      if (String(u.rol || '').toLowerCase() === 'docente' || String(u.rol || '').toLowerCase() === 'profesor') {
        out.push({ user: p, reason: shared[0] || 'Estudiante', kind: 'estudiante' });
        return;
      }
      if (shared.length) out.push({ user: p, reason: shared[0], kind: 'estudiante' });
    });
    var seen = {};
    return out.filter(function (x) {
      var k = normEmail(x.user.email);
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    }).sort(function (a, b) {
      if (a.kind === 'docente' && b.kind !== 'docente') return -1;
      if (b.kind === 'docente' && a.kind !== 'docente') return 1;
      return fullName(a.user).localeCompare(fullName(b.user));
    });
  }

  function openOrCreateWith(peer, u) {
    if (!peer || !peer.email || !u || !u.email) return;
    var me = normEmail(u.email);
    var other = normEmail(peer.email);
    if (!other || other === me) return;

    var myRol = String(u.rol || '').toLowerCase();
    var peerRol = String(peer.rol || '').toLowerCase();
    var myMats = materiasOf(u);
    var peerMats = materiasOf(peer);
    var mat = myMats.filter(function (m) { return peerMats.indexOf(m) >= 0; })[0]
      || myMats[0] || peerMats[0] || 'General';
    var grp = '';
    try {
      if (typeof aulaGrupoDeMateria === 'function') grp = aulaGrupoDeMateria(u, mat) || '';
    } catch (e) {}

    var pair = [me, other].sort();
    var stableId = 'dm_' + pair[0].replace(/[^a-z0-9]/gi, '_') + '__' + pair[1].replace(/[^a-z0-9]/gi, '_');

    var list = loadChats();
    var chat = list.find(function (c) {
      if (!c || !c.id) return false;
      if (c.id === stableId) return true;
      var emails = chatEmails(c);
      return emails.indexOf(me) >= 0 && emails.indexOf(other) >= 0;
    });

    var isTeacherPeer = peerRol === 'docente' || peerRol === 'profesor';
    var isMeTeacher = myRol === 'docente' || myRol === 'profesor';

    if (!chat) {
      chat = {
        id: stableId,
        type: 'peer',
        materia: mat,
        grupo: grp || '',
        studentEmail: isMeTeacher ? other : me,
        studentName: isMeTeacher ? fullName(peer) : fullName(u),
        teacherEmail: isTeacherPeer ? other : (isMeTeacher ? me : ''),
        teacherName: isTeacherPeer ? fullName(peer) : (isMeTeacher ? fullName(u) : ''),
        peerEmail: other,
        peerName: fullName(peer),
        members: [me, other],
        messages: [],
        updatedAt: Date.now()
      };
      saveChat(chat);
    } else {
      var changed = false;
      if (!chat.members) { chat.members = [me, other]; changed = true; }
      if (chat.members.indexOf(me) < 0) { chat.members.push(me); changed = true; }
      if (chat.members.indexOf(other) < 0) { chat.members.push(other); changed = true; }
      if (isTeacherPeer) {
        if (normEmail(chat.teacherEmail) !== other) {
          chat.teacherEmail = other;
          chat.teacherName = fullName(peer);
          changed = true;
        }
      }
      if (isMeTeacher && normEmail(chat.teacherEmail) !== me) {
        chat.teacherEmail = me;
        chat.teacherName = fullName(u);
        changed = true;
      }
      if (!chat.peerEmail) { chat.peerEmail = other; chat.peerName = fullName(peer); changed = true; }
      if (!chat.studentEmail) {
        chat.studentEmail = isMeTeacher ? other : me;
        chat.studentName = isMeTeacher ? fullName(peer) : fullName(u);
        changed = true;
      }
      if (changed) {
        chat.updatedAt = Date.now();
        saveChat(chat);
      }
    }

    state.activeId = chat.id;
    state.composing = false;
    state.filter = 'todos';
    paint(state.host, true);
  }

  function sendMessage(chatId, text, u) {
    text = String(text || '').trim();
    if (!text || !chatId || !u) return false;

    var msg = {
      id: 'm_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 6),
      from: normEmail(u.email),
      text: text,
      ts: Date.now(),
      readBy: [normEmail(u.email)]
    };

    // 1) Local garantizado
    var list = loadChats();
    var c = list.find(function (x) { return x && x.id === chatId; });
    if (!c) {
      // crear contenedor mínimo para no perder el mensaje
      c = {
        id: chatId,
        type: 'peer',
        studentEmail: normEmail(u.email),
        studentName: fullName(u),
        members: [normEmail(u.email)],
        messages: [],
        updatedAt: Date.now()
      };
      list.push(c);
    }
    if (!c.messages) c.messages = [];
    c.messages.push(msg);
    c.updatedAt = Date.now();
    saveChat(c);

    // 2) API legacy (si existe y no duplica)
    try {
      if (typeof aulaChatSend === 'function') {
        // ya guardamos; intentar sync extra sin fallar
        var again = loadChats().find(function (x) { return x.id === chatId; });
        if (again && (!again.messages || !again.messages.some(function (m) { return m.id === msg.id; }))) {
          aulaChatSend(chatId, u.email, text);
        }
      }
    } catch (e) {}

    return true;
  }

  function markRead(chatId, u) {
    try {
      if (typeof aulaChatMarkRead === 'function') aulaChatMarkRead(chatId, normEmail(u.email));
    } catch (e) {}
  }

  /* ---------- UI ---------- */
  function chip(id, label, count) {
    var extra = (typeof count === 'number') ? ' (' + count + ')' : '';
    return '<button type="button" class="fa-chip' + (state.filter === id ? ' active' : '') +
      '" data-ch-filter="' + id + '">' + label + extra + '</button>';
  }

  function listCol(u) {
    var me = normEmail(u.email);
    var all = myChats(u);
    var nTodos = all.length;
    var nDoc = all.filter(function (c) { return otherRole(c, me) === 'docente'; }).length;
    var nEst = all.filter(function (c) { return otherRole(c, me) === 'estudiante'; }).length;
    var nGrp = all.filter(function (c) { return isGrupoChat(c); }).length;
    var items = filteredChats(u);
    var rows = items.map(function (c) {
      var active = c.id === state.activeId ? ' active' : '';
      var un = unreadCount(c, u);
      var title = chatTitle(c, u);
      return '<div class="fa-item' + active + '" data-ch-open="' + esc(c.id) + '" role="button" tabindex="0">' +
        '<div class="fa-avatar">' + esc(initials(title)) + '</div>' +
        '<div class="fa-item-body"><strong>' + esc(title) + '</strong>' +
        '<p>' + esc(lastPreview(c)) + '</p></div>' +
        '<div class="fa-item-meta"><span>' + esc(fmtTime(c.updatedAt)) + '</span>' +
        (un ? '<span class="fa-badge">' + un + '</span>' : '') +
        '</div></div>';
    }).join('');

    if (!rows) {
      var msg = 'No hay conversaciones.<br>Pulsa ✎ para escribir a un docente o compañero.';
      if (state.filter === 'docentes') msg = 'No hay chats con docentes en este filtro.<br>Pulsa ✎ y elige un docente.';
      else if (state.filter === 'estudiantes') msg = 'No hay chats con estudiantes en este filtro.';
      else if (state.filter === 'grupos') msg = 'Aún no hay chats de grupo.';
      rows = '<div class="fa-status">' + msg + '</div>';
    }

    var cloudHint = '';
    if (state.cloudStatus === 'online') cloudHint = '<span class="fa-cloud-ok" title="Sincronizado con la nube">☁</span>';
    else if (state.cloudStatus === 'syncing') cloudHint = '<span class="fa-cloud-wait" title="Sincronizando…">☁</span>';
    else if (state.cloudStatus === 'error') cloudHint = '<span class="fa-cloud-err" title="Sin nube — solo este dispositivo">☁</span>';
    else if (state.cloudStatus === 'local') cloudHint = '<span class="fa-cloud-err" title="Modo local (Firebase off)">☁</span>';

    return '<div class="fa-col-list">' +
      '<div class="fa-list-head"><h2>Mensajes ' + cloudHint + '</h2>' +
      '<button type="button" class="fa-icon-btn" data-ch-new title="Nuevo mensaje">✎</button></div>' +
      '<div class="fa-search"><input type="search" data-ch-q placeholder="Buscar conversaciones…" value="' + esc(state.q) + '"></div>' +
      '<div class="fa-filters">' +
      chip('todos', 'Todos', nTodos) + chip('docentes', 'Docentes', nDoc) +
      chip('estudiantes', 'Estudiantes', nEst) + chip('grupos', 'Grupos', nGrp) +
      '</div><div class="fa-items">' + rows + '</div></div>';
  }

  function mainCol(u) {
    if (state.composing) {
      var contacts = suggestedContacts(u);
      var opts = contacts.map(function (c) {
        return '<div class="fa-item" data-ch-start="' + esc(c.user.email) + '" role="button" tabindex="0">' +
          '<div class="fa-avatar">' + esc(initials(fullName(c.user))) + '</div>' +
          '<div class="fa-item-body"><strong>' + esc(fullName(c.user)) + '</strong>' +
          '<p>' + esc((c.user.rol || '') + ' · ' + c.reason) + '</p></div></div>';
      }).join('') || '<div class="fa-status">No hay contactos. Los docentes y compañeros de tus cursos aparecerán aquí cuando existan en el sistema.</div>';

      return '<div class="fa-col-main">' +
        '<div class="fa-thread-head"><div class="fa-thread-head-info"><strong>Nuevo mensaje</strong>' +
        '<span>Elige un contacto</span></div>' +
        '<button type="button" class="fa-btn fa-btn-sm" data-ch-cancel-new>Cancelar</button></div>' +
        '<div class="fa-thread-body"><div class="fa-items" style="border:none">' + opts + '</div></div></div>';
    }

    var c = activeChat();
    if (!c) {
      return '<div class="fa-col-main"><div class="fa-empty-center">' +
        'Selecciona una conversación o pulsa ✎ para iniciar un mensaje.' +
        '</div></div>';
    }

    markRead(c.id, u);
    var title = chatTitle(c, u);
    var sub = chatSubtitle(c);
    var me = normEmail(u.email);
    var msgs = (c.messages || []).map(function (m) {
      var mine = normEmail(m.from) === me;
      return '<div class="fa-msg' + (mine ? ' mine' : '') + '">' +
        (mine ? '' : '<div class="fa-avatar">' + esc(initials(title)) + '</div>') +
        '<div class="fa-bubble">' +
        (mine ? '' : '<div class="fa-msg-author">' + esc(title) + '</div>') +
        '<div class="fa-msg-text">' + esc(m.text || '') + '</div>' +
        '<div class="fa-msg-time">' + esc(fmtTime(m.ts)) + '</div></div></div>';
    }).join('');

    if (!msgs) {
      msgs = '<div class="fa-empty-center">Aún no hay mensajes. Escribe el primero.</div>';
    }

    return '<div class="fa-col-main">' +
      '<div class="fa-thread-head">' +
      '<div class="fa-avatar">' + esc(initials(title)) + '</div>' +
      '<div class="fa-thread-head-info"><strong>' + esc(title) + '</strong>' +
      '<span>' + esc(sub) + '</span></div></div>' +
      '<div class="fa-thread-body" data-ch-scroll>' + msgs + '</div>' +
      '<div class="fa-composer" data-ch-send data-chat-id="' + esc(c.id) + '">' +
      '<input type="text" name="text" id="faChatInput" placeholder="Escribe un mensaje…" maxlength="2000" autocomplete="off">' +
      '<button type="button" class="fa-send" data-ch-send-btn title="Enviar">➤</button>' +
      '</div></div>';
  }

  function isTypingInChat() {
    try {
      var el = document.activeElement;
      if (!el || !state.host) return false;
      if (!state.host.contains(el)) return false;
      var tag = (el.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return true;
      return !!el.closest('[data-ch-send], .fa-composer, .fa-search');
    } catch (e) { return false; }
  }

  function paint(host, force) {
    host = host || state.host;
    if (!host) return;
    state.host = host;
    // No destruir el input mientras el usuario escribe
    if (!force && isTypingInChat()) return;
    var u = session();
    try {
      if (!u) {
        host.className = 'fa-root fa-two-col';
        host.innerHTML = '<div class="fa-status err" style="padding:24px">Inicia sesión para usar Mensajes.</div>';
        return;
      }
      host.className = 'fa-root fa-two-col';
      host.innerHTML = listCol(u) + mainCol(u);
      var sc = host.querySelector('[data-ch-scroll]');
      if (sc) sc.scrollTop = sc.scrollHeight;
      var ac = activeChat();
      state._lastSig = (ac && ac.id ? ac.id : '') + ':' + ((ac && ac.messages) ? ac.messages.length : 0) + ':' + ((ac && ac.updatedAt) || 0);
      bind(host);
    } catch (err) {
      console.error('GeoMetricsChat paint', err);
      host.className = 'fa-root fa-two-col';
      host.innerHTML = '<div class="fa-status err" style="padding:24px">Error al cargar mensajes. Recarga la página (Ctrl+F5).<br><small>' +
        esc(String(err && err.message || err)) + '</small></div>';
    }
  }

  function doSend(host) {
    var u = session();
    if (!u) {
      try { alert('Sesión no disponible. Vuelve a iniciar sesión.'); } catch (e0) {}
      return;
    }
    var box = host.querySelector('[data-ch-send]');
    if (!box) return;
    var chatId = box.getAttribute('data-chat-id') || state.activeId;
    if (!chatId) {
      try { alert('Selecciona una conversación primero.'); } catch (e1) {}
      return;
    }
    state.activeId = chatId;
    var input = box.querySelector('[name="text"]') || host.querySelector('#faChatInput');
    var text = input ? String(input.value || '') : '';
    if (!text.trim()) {
      if (input) input.focus();
      return;
    }
    var ok = sendMessage(chatId, text, u);
    if (ok) {
      if (input) input.value = '';
      paint(host, true);
      setTimeout(function () {
        try {
          var inp = host.querySelector('#faChatInput, [data-ch-send] [name="text"]');
          if (inp) inp.focus();
        } catch (eF) {}
      }, 40);
    } else {
      try { alert('No se pudo enviar. Intenta de nuevo.'); } catch (e2) {}
    }
  }

  function bind(host) {
    if (!host) return;
    if (host._chClick) host.removeEventListener('click', host._chClick);
    if (host._chKey) host.removeEventListener('keydown', host._chKey);
    if (host._chInput) host.removeEventListener('input', host._chInput);

    host._chClick = function (e) {
      var sendBtn = e.target.closest('[data-ch-send-btn], .fa-send');
      if (sendBtn && host.contains(sendBtn)) {
        e.preventDefault();
        e.stopPropagation();
        doSend(host);
        return;
      }

      var t = e.target.closest('[data-ch-open],[data-ch-filter],[data-ch-new],[data-ch-cancel-new],[data-ch-start]');
      if (!t || !host.contains(t)) return;
      e.preventDefault();
      e.stopPropagation();
      var u = session();
      if (!u) return;

      if (t.hasAttribute('data-ch-open')) {
        state.activeId = t.getAttribute('data-ch-open');
        state.composing = false;
        state.filter = 'todos';
        var can = activeChat();
        if (can && can.id) state.activeId = can.id;
        paint(host, true);
        return;
      }
      if (t.hasAttribute('data-ch-filter')) {
        state.filter = t.getAttribute('data-ch-filter');
        paint(host, true);
        return;
      }
      if (t.hasAttribute('data-ch-new')) {
        state.composing = true;
        state.activeId = null;
        paint(host, true);
        return;
      }
      if (t.hasAttribute('data-ch-cancel-new')) {
        state.composing = false;
        paint(host, true);
        return;
      }
      if (t.hasAttribute('data-ch-start')) {
        var email = t.getAttribute('data-ch-start');
        var peer = listUsers().find(function (x) { return normEmail(x.email) === normEmail(email); });
        if (!peer) peer = { email: email, nombre: String(email).split('@')[0], rol: 'docente' };
        openOrCreateWith(peer, u);
        return;
      }
    };

    host._chKey = function (e) {
      if (e.key !== 'Enter') return;
      var input = e.target;
      if (!input || !host.contains(input)) return;
      if (input.name !== 'text' && input.id !== 'faChatInput') return;
      e.preventDefault();
      e.stopPropagation();
      doSend(host);
    };

    host._chInput = function (e) {
      if (e.target && e.target.matches('[data-ch-q]')) {
        clearTimeout(host._chQt);
        host._chQt = setTimeout(function () {
          state.q = e.target.value || '';
          if (!isTypingInChat()) paint(host);
        }, 250);
      }
    };

    host.addEventListener('click', host._chClick, true); // capture: gana a otros handlers
    host.addEventListener('keydown', host._chKey, true);
    host.addEventListener('input', host._chInput);

    // Enlace directo al botón por si acaso
    var btn = host.querySelector('[data-ch-send-btn], .fa-send');
    if (btn) {
      btn.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        doSend(host);
      };
    }
  }

  function mount(hostId) {
    var host = typeof hostId === 'string' ? document.getElementById(hostId) : hostId;
    if (!host) return;
    state.host = host;
    paint(host);

    // 1) Bajar chats de Firebase y fusionar
    syncFromCloud().then(function () {
      // 2) Escucha en tiempo real
      startCloudListen();
    });

    try {
      if (!global.__gmChatStorageBound) {
        global.__gmChatStorageBound = true;
        window.addEventListener('storage', function (ev) {
          if (ev.key && (ev.key === 'gm_chats_v1' || String(ev.key).indexOf('chat') >= 0) && state.host) {
            paint(state.host);
          }
        });
      }
    } catch (e) {}

    // Poll local + pull periódico (por si el listen falla)
    try {
      if (state._poll) clearInterval(state._poll);
      state._poll = setInterval(function () {
        if (!state.host || !document.body.contains(state.host)) return;
        if (state.composing) return;
        var ac = activeChat();
        var sig = (ac && ac.id ? ac.id : '') + ':' + ((ac && ac.messages) ? ac.messages.length : 0) + ':' + ((ac && ac.updatedAt) || 0);
        if (sig !== state._lastSig) {
          state._lastSig = sig;
          paint(state.host);
        }
      }, 2000);
      if (state._pullPoll) clearInterval(state._pullPoll);
      state._pullPoll = setInterval(function () {
        if (!state.host || !document.body.contains(state.host)) return;
        syncFromCloud();
      }, 12000);
    } catch (eP) {}
  }

  function refresh() {
    if (state.host) paint(state.host);
  }

  global.ForosAvisos = { mount: mount, refresh: refresh, paint: paint, syncFromCloud: syncFromCloud };
  global.GeoMetricsChat = { mount: mount, refresh: refresh, paint: paint, syncFromCloud: syncFromCloud };
})(window);
