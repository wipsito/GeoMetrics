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
    replyTo: null,
    _poll: null,
    _lastSig: '',
    _menuOpen: false,
    _painting: false,
    _sending: false,
    _quietUntil: 0
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

  /** El root visible: estudiante o docente (misma lógica en ambos perfiles) */
  function resolveHost(preferred) {
    if (preferred && preferred.querySelector) return preferred;
    try {
      var pd = document.getElementById('pantallaDocente');
      var pe = document.getElementById('pantallaEstudiante');
      var docRoot = document.getElementById('faRootDocente');
      var estRoot = document.getElementById('faRootEstudiante');
      // Preferir la pantalla visible
      var docVisible = pd && pd.style.display !== 'none' && pd.offsetParent !== null;
      var estVisible = pe && pe.style.display !== 'none' && pe.offsetParent !== null;
      if (docVisible && docRoot) return docRoot;
      if (estVisible && estRoot) return estRoot;
      // Fallback: el que tenga contenido de chat abierto
      if (docRoot && docRoot.querySelector('[data-ch-send]')) return docRoot;
      if (estRoot && estRoot.querySelector('[data-ch-send]')) return estRoot;
      return state.host || docRoot || estRoot || null;
    } catch (e) {
      return state.host || null;
    }
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

  function isBlockedContact(u) {
    if (!u) return true;
    var name = fullName(u).toLowerCase();
    var email = normEmail(u.email);
    if (name.indexOf('luke') >= 0 && name.indexOf('saint') >= 0) return true;
    if (email.indexOf('luke') >= 0 && email.indexOf('saint') >= 0) return true;
    if (email === 'luke.saint@' || email.indexOf('luke.saint') >= 0) return true;
    return false;
  }

  function listUsers() {
    var arr = [];
    try {
      if (typeof aulaLoad === 'function' && typeof AULA_KEYS !== 'undefined') {
        arr = aulaLoad(AULA_KEYS.users, []) || [];
      } else {
        arr = JSON.parse(localStorage.getItem('geometrics_users') || '[]') || [];
      }
    } catch (e) { arr = []; }
    return (arr || []).filter(function (u) { return !isBlockedContact(u); });
  }

  /** Limpia de storage a Luke Saint (una vez) */
  function purgeBlockedUsers() {
    try {
      var key = (typeof AULA_KEYS !== 'undefined' && AULA_KEYS.users) ? AULA_KEYS.users : 'geometrics_users';
      var arr = [];
      try {
        if (typeof aulaLoad === 'function' && typeof AULA_KEYS !== 'undefined') arr = aulaLoad(AULA_KEYS.users, []) || [];
        else arr = JSON.parse(localStorage.getItem(key) || '[]') || [];
      } catch (e0) { return; }
      var next = (arr || []).filter(function (u) { return !isBlockedContact(u); });
      if (next.length !== (arr || []).length) {
        if (typeof aulaSave === 'function' && typeof AULA_KEYS !== 'undefined') aulaSave(AULA_KEYS.users, next);
        else localStorage.setItem(key, JSON.stringify(next));
      }
      // Quitar chats con ese contacto
      var chats = [];
      try { chats = JSON.parse(localStorage.getItem('gm_chats_v1') || '[]') || []; } catch (e1) {}
      var filtered = (chats || []).filter(function (c) {
        if (!c) return false;
        var emails = [c.studentEmail, c.teacherEmail, c.peerEmail, c.emailA, c.emailB].map(normEmail);
        var names = [c.studentName, c.teacherName, c.peerName].join(' ').toLowerCase();
        if (names.indexOf('luke') >= 0 && names.indexOf('saint') >= 0) return false;
        if (emails.some(function (e) { return e && e.indexOf('luke') >= 0 && e.indexOf('saint') >= 0; })) return false;
        return true;
      });
      if (filtered.length !== chats.length) {
        localStorage.setItem('gm_chats_v1', JSON.stringify(filtered));
      }
    } catch (e) {}
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
    try {
      var local = JSON.parse(localStorage.getItem('gm_chats_v1') || '[]') || [];
      return Array.isArray(local) ? local.filter(function (c) { return c && c.id; }) : [];
    } catch (e) {
      return [];
    }
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
    notifyLocalPeers();
  }

  function pushChatCloud(chat) {
    if (!chat || !chat.id) return;
    try {
      if (typeof GeoCloud !== 'undefined' && GeoCloud.isOn && GeoCloud.isOn() && typeof GeoCloud.pushChat === 'function') {
        setTimeout(function () {
          try {
            GeoCloud.pushChat(chat).catch(function () {});
          } catch (e0) {}
        }, 0);
      }
    } catch (e) {}
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

  function chatsSignature(list) {
    list = list || [];
    var totalMsg = 0;
    var maxTs = 0;
    list.forEach(function (c) {
      if (!c) return;
      totalMsg += (c.messages && c.messages.length) || 0;
      if ((c.updatedAt || 0) > maxTs) maxTs = c.updatedAt || 0;
    });
    return list.length + ':' + totalMsg + ':' + maxTs;
  }

  function applyRemoteChats(remoteArr, fromListen) {
    if (!remoteArr) remoteArr = [];
    // Firebase a veces manda objeto; normalizar
    if (!Array.isArray(remoteArr)) {
      var tmp = [];
      Object.keys(remoteArr).forEach(function (k) {
        if (remoteArr[k] && typeof remoteArr[k] === 'object') tmp.push(remoteArr[k]);
      });
      remoteArr = tmp;
    }
    var local = [];
    try {
      local = JSON.parse(localStorage.getItem('gm_chats_v1') || '[]') || [];
    } catch (e) { local = []; }
    var before = chatsSignature(local);
    var merged = mergeChatLists(local, remoteArr);
    var after = chatsSignature(merged);
    try {
      localStorage.setItem('gm_chats_v1', JSON.stringify(merged));
    } catch (e2) {}
    if (after !== before) {
      state._dataSig = after;
      if (!state._menuOpen && Date.now() > (state._quietUntil || 0) && !state._sending) {
        refreshUI(true);
      }
    } else if (fromListen) {
      state.cloudStatus = 'online';
    }
  }

  function notifyLocalPeers() {
    try {
      if (state._bc) state._bc.postMessage({ type: 'chats-updated', t: Date.now() });
    } catch (e) {}
    try {
      localStorage.setItem('gm_chats_ping', String(Date.now()));
    } catch (e2) {}
  }

  function syncFromCloud() {
    try {
      if (typeof GeoCloud === 'undefined' || !GeoCloud.isOn || !GeoCloud.isOn()) {
        state.cloudStatus = 'local';
        return Promise.resolve(false);
      }
      state.cloudStatus = 'syncing';
      return GeoCloud.pullChats().then(function (arr) {
        applyRemoteChats(arr || [], false);
        state.cloudStatus = 'online';
        return true;
      }).catch(function (err) {
        console.warn('pullChats', err);
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
      // Re-suscribir siempre al montar (Firebase on value es seguro)
      GeoCloud.listenChats(function (arr) {
        state.cloudStatus = 'online';
        applyRemoteChats(arr || [], true);
      });
      state._cloudListening = true;
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
      if (!c || !c.id || chatEmails(c).indexOf(me) < 0) return false;
      var names = [c.studentName, c.teacherName, c.peerName].join(' ').toLowerCase();
      if (names.indexOf('luke') >= 0 && names.indexOf('saint') >= 0) return false;
      var em = chatEmails(c).join(' ');
      if (em.indexOf('luke') >= 0 && em.indexOf('saint') >= 0) return false;
      return true;
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

  function sendMessage(chatId, text, u, replyMeta) {
    text = String(text || '').trim();
    if (!text || !chatId || !u || !u.email) return false;

    var msg = {
      id: 'm_' + Date.now().toString(36) + Math.random().toString(16).slice(2, 6),
      from: normEmail(u.email),
      text: text,
      ts: Date.now(),
      readBy: [normEmail(u.email)]
    };
    var rt = replyMeta || state.replyTo;
    if (rt && rt.text) {
      msg.replyTo = {
        id: rt.id || '',
        text: String(rt.text),
        from: rt.from || '',
        fromName: rt.fromName || ''
      };
    }
    state.replyTo = null;

    // Leer storage crudo (sin filtros de aulaChatLoad)
    var list = [];
    try {
      list = JSON.parse(localStorage.getItem('gm_chats_v1') || '[]') || [];
      if (!Array.isArray(list)) list = [];
    } catch (e0) { list = []; }

    var c = null;
    var ix = -1;
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === chatId) { c = list[i]; ix = i; break; }
    }
    if (!c) {
      c = {
        id: chatId,
        type: 'peer',
        studentEmail: normEmail(u.email),
        studentName: fullName(u),
        teacherEmail: String(u.rol || '').toLowerCase().indexOf('docente') >= 0 ? normEmail(u.email) : '',
        teacherName: String(u.rol || '').toLowerCase().indexOf('docente') >= 0 ? fullName(u) : '',
        members: [normEmail(u.email)],
        messages: [],
        updatedAt: Date.now()
      };
      list.push(c);
      ix = list.length - 1;
    }
    if (!c.messages) c.messages = [];
    c.messages.push(msg);
    c.updatedAt = Date.now();
    list[ix] = c;

    try {
      localStorage.setItem('gm_chats_v1', JSON.stringify(list));
    } catch (e1) {
      console.error('send localStorage', e1);
      return false;
    }

    try {
      if (typeof aulaChatSaveOne === 'function') aulaChatSaveOne(c);
    } catch (e2) {}
    try { pushChatCloud(c); } catch (e3) {}
    try { notifyLocalPeers(); } catch (e4) {}

    return true;
  }


  function deleteMessage(chatId, msgId) {
    if (!chatId || !msgId) return false;
    var list = loadChats();
    var c = list.find(function (x) { return x && x.id === chatId; });
    if (!c || !c.messages) return false;
    var before = c.messages.length;
    c.messages = c.messages.filter(function (m) { return m && m.id !== msgId; });
    if (c.messages.length === before) return false;
    c.updatedAt = Date.now();
    saveChat(c);
    return true;
  }

  function clearChat(chatId) {
    if (!chatId) return false;
    var list = loadChats();
    var c = list.find(function (x) { return x && x.id === chatId; });
    if (!c) return false;
    c.messages = [];
    c.updatedAt = Date.now();
    saveChat(c);
    return true;
  }

  function deleteConversation(chatId) {
    if (!chatId) return false;
    var list = loadChats().filter(function (x) { return !x || x.id !== chatId; });
    try {
      localStorage.setItem('gm_chats_v1', JSON.stringify(list));
    } catch (e) {}
    try {
      if (typeof aulaChatEliminar === 'function') aulaChatEliminar(chatId);
      else if (typeof aulaChatSave === 'function') aulaChatSave(list);
    } catch (e2) {}
    try {
      if (typeof GeoCloud !== 'undefined' && GeoCloud.isOn && GeoCloud.isOn()) {
        if (typeof GeoCloud.pushChats === 'function') GeoCloud.pushChats(list);
        // borrar nodo del chat si hay API
        if (GeoCloud.db && typeof GeoCloud.db.ref === 'function') {
          /* skip low-level */
        }
      }
    } catch (e3) {}
    if (state.activeId === chatId) state.activeId = null;
    return true;
  }

  function markRead(chatId, u) {
    try {
      if (typeof aulaChatMarkRead === 'function') aulaChatMarkRead(chatId, normEmail(u.email));
    } catch (e) {}
  }

  /* ---------- UI ---------- */
  function emojiPanelHtml() {
    var emojis = [
      '😀','😁','😂','🤣','😊','😍','😘','😜','🤗','🤔',
      '👍','👎','👏','🙌','🙏','💪','🔥','⭐','✨','🎉',
      '❤️','🧡','💛','💚','💙','💜','🖤','💯','✅','❌',
      '📚','📝','🧠','💡','⏰','📌','📎','🗂️','🏫','👩‍🏫',
      '😮','😢','😭','😡','😴','🤝','👀','🙌','😎','🤩'
    ];
    return emojis.map(function (em) {
      return '<button type="button" class="fa-emoji-item" data-ch-emoji-pick="' + em + '">' + em + '</button>';
    }).join('');
  }

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
      '<div class="fa-search"><input type="text" data-ch-q placeholder="Buscar conversaciones…" value="' + esc(state.q) + '" autocomplete="off" spellcheck="false"></div>' +
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
      var mid = m.id || ('ts_' + (m.ts || ''));
      var replyHtml = '';
      if (m.replyTo && m.replyTo.text) {
        replyHtml = '<div class="fa-reply-quote"><span>' + esc(m.replyTo.fromName || 'Mensaje') + '</span>' +
          esc(String(m.replyTo.text).slice(0, 120)) + '</div>';
      }
      return '<div class="fa-msg' + (mine ? ' mine' : '') + '" data-msg-id="' + esc(mid) + '">' +
        (mine ? '' : '<div class="fa-avatar">' + esc(initials(title)) + '</div>') +
        '<div class="fa-bubble">' +
        '<button type="button" class="fa-msg-menu-btn" data-ch-msg-menu="' + esc(mid) + '" title="Opciones">⋮</button>' +
        (mine ? '' : '<div class="fa-msg-author">' + esc(title) + '</div>') +
        replyHtml +
        '<div class="fa-msg-text">' + esc(m.text || '') + '</div>' +
        '<div class="fa-msg-time">' + esc(fmtTime(m.ts)) + '</div>' +
        '<div class="fa-msg-dropdown" data-msg-dd="' + esc(mid) + '">' +
          '<button type="button" data-ch-reply-msg="' + esc(mid) + '">Responder</button>' +
          '<button type="button" data-ch-copy-msg="' + esc(mid) + '">Copiar mensaje</button>' +
          '<button type="button" data-ch-del-msg="' + esc(mid) + '" class="fa-danger">Eliminar mensaje</button>' +
        '</div>' +
        '</div></div>';
    }).join('');

    if (!msgs) {
      msgs = '<div class="fa-empty-center">Aún no hay mensajes. Escribe el primero.</div>';
    }

    return '<div class="fa-col-main">' +
      '<div class="fa-thread-head">' +
      '<div class="fa-avatar">' + esc(initials(title)) + '</div>' +
      '<div class="fa-thread-head-info"><strong>' + esc(title) + '</strong>' +
      '<span>' + esc(sub) + '</span></div>' +
      '<div class="fa-head-actions">' +
        '<button type="button" class="fa-icon-btn fa-head-more" data-ch-chat-menu title="Opciones del chat">⋮</button>' +
        '<div class="fa-chat-dropdown" data-ch-chat-dd>' +
          '<button type="button" data-ch-search-chat>Buscar en el chat</button>' +
          '<button type="button" data-ch-mute-chat>Silenciar notificaciones</button>' +
          '<div class="fa-dd-sep"></div>' +
          '<button type="button" data-ch-clear-chat>Vaciar chat</button>' +
          '<button type="button" data-ch-delete-chat class="fa-danger">Eliminar conversación</button>' +
        '</div>' +
      '</div></div>' +
      '<div class="fa-thread-body" data-ch-scroll>' + msgs + '</div>' +
      (state.replyTo ? ('<div class="fa-reply-bar">' +
        '<div class="fa-reply-bar-body"><strong>Respondiendo</strong><span>' + esc(String(state.replyTo.text || '').slice(0, 80)) + '</span></div>' +
        '<button type="button" class="fa-reply-cancel" data-ch-cancel-reply title="Cancelar">✕</button></div>') : '') +
      '<div class="fa-composer" data-ch-send data-chat-id="' + esc(c.id) + '"' +
        (state.replyTo ? (
          ' data-reply-id="' + esc(state.replyTo.id || '') + '"' +
          ' data-reply-text="' + esc(String(state.replyTo.text || '').slice(0, 200)) + '"' +
          ' data-reply-name="' + esc(state.replyTo.fromName || '') + '"'
        ) : '') + '>' +
      '<button type="button" class="fa-emoji-btn" data-ch-emoji title="Emojis">😊</button>' +
      '<input type="text" name="text" class="fa-chat-input" placeholder="Escribe un mensaje…" maxlength="2000" autocomplete="off">' +
      '<button type="button" class="fa-send" data-ch-send-btn title="Enviar">➤</button>' +
      '<div class="fa-emoji-panel" data-ch-emoji-panel hidden>' + emojiPanelHtml() + '</div>' +
      '</div></div>';
  }

  function isTypingInChat() {
    try {
      var el = document.activeElement;
      if (!el || !state.host) return false;
      if (!state.host.contains(el)) return false;
      if (el.classList && el.classList.contains('fa-chat-input')) return true;
      if (el.name === 'text' && el.closest('[data-ch-send]')) return true;
      return false;
    } catch (e) { return false; }
  }

  function preserveComposer(host) {
    var input = host.querySelector('.fa-chat-input, [data-ch-send] [name="text"]');
    return {
      value: input ? input.value : '',
      focused: !!(input && document.activeElement === input),
      selStart: input && input.selectionStart,
      selEnd: input && input.selectionEnd
    };
  }

  function restoreComposer(host, snap) {
    if (!snap) return;
    var input = host.querySelector('.fa-chat-input, [data-ch-send] [name="text"]');
    if (!input) return;
    input.value = snap.value || '';
    if (snap.focused) {
      try {
        input.focus();
        if (typeof snap.selStart === 'number') {
          input.setSelectionRange(snap.selStart, snap.selEnd || snap.selStart);
        }
      } catch (e) {}
    }
  }

  function paint(host, force) {
    if (state._painting) return;
    host = resolveHost(host);
    if (!host) return;
    state._painting = true;
    state.host = host;
    try {
      var u = session();
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
      state._dataSig = chatsSignature(loadChats());
      bind(host);
      if (force) {
        try {
          var inp = host.querySelector('input.fa-chat-input');
          if (inp) inp.focus();
        } catch (eF) {}
      }
    } catch (err) {
      console.error('GeoMetricsChat paint', err);
      try {
        host.innerHTML = '<div class="fa-status err" style="padding:24px">Error al cargar mensajes.<br><small>' +
          esc(String(err && err.message || err)) + '</small></div>';
      } catch (e2) {}
    } finally {
      state._painting = false;
    }
  }

  /** Actualiza UI sin perder el texto en el composer */
  function refreshUI(preferKeepInput) {
    var host = resolveHost(state.host);
    if (!host) return;
    state.host = host;
    paint(host, !preferKeepInput);
  }


  function placeDropdown(dd, anchor) {
    if (!dd || !anchor) return;
    dd.classList.add('is-open');
    var r = anchor.getBoundingClientRect();
    var w = 220;
    var left = Math.min(window.innerWidth - w - 8, Math.max(8, r.right - w));
    var top = r.bottom + 6;
    if (top + 200 > window.innerHeight) top = Math.max(8, r.top - 8 - 160);
    dd.style.left = left + 'px';
    dd.style.top = top + 'px';
    dd.style.right = 'auto';
  }

  function doSend(host) {
    if (state._sending) return false;
    state._sending = true;
    try {
      host = resolveHost(host);
      if (!host) return false;

      var u = session();
      if (!u || !u.email) return false;

      var box = host.querySelector('[data-ch-send]');
      var input = host.querySelector('input.fa-chat-input');
      var chatId = (box && box.getAttribute('data-chat-id')) || state.activeId;
      var text = input ? String(input.value || '').trim() : '';

      var replyMeta = null;
      if (state.replyTo && state.replyTo.text) {
        replyMeta = { id: state.replyTo.id || '', text: state.replyTo.text, fromName: state.replyTo.fromName || '' };
      } else if (box && box.getAttribute('data-reply-text')) {
        replyMeta = {
          id: box.getAttribute('data-reply-id') || '',
          text: box.getAttribute('data-reply-text') || '',
          fromName: box.getAttribute('data-reply-name') || ''
        };
      }

      if (!chatId) return false;
      if (!text) {
        if (input) input.focus();
        return false;
      }

      state.activeId = chatId;
      state.host = host;

      var ok = sendMessage(chatId, text, u, replyMeta);
      if (!ok) return false;

      if (input) input.value = '';
      state.replyTo = null;
      if (box) {
        box.removeAttribute('data-reply-id');
        box.removeAttribute('data-reply-text');
        box.removeAttribute('data-reply-name');
      }

      // Evitar que sync/poll repinte en bucle los próximos 1.5s
      state._quietUntil = Date.now() + 1500;
      state._dataSig = chatsSignature(loadChats());
      paint(host, true);
      return true;
    } catch (err) {
      console.error('doSend', err);
      return false;
    } finally {
      state._sending = false;
    }
  }

  function bind(host) {
    if (!host) return;

    // Quitar listeners previos
    if (host._chClick) host.removeEventListener('click', host._chClick, true);
    if (host._chKey) host.removeEventListener('keydown', host._chKey, true);
    if (host._chInput) host.removeEventListener('input', host._chInput, true);
    if (host._chSearchKey) host.removeEventListener('keydown', host._chSearchKey, true);

    function closeAllMenus() {
      state._menuOpen = false;
      try {
        host.querySelectorAll('.fa-msg-dropdown, .fa-chat-dropdown').forEach(function (d) {
          d.classList.remove('is-open');
        });
        host.querySelectorAll('.fa-msg-menu-btn').forEach(function (b) {
          b.classList.remove('is-open');
        });
      } catch (e) {}
    }

    function activeChatId() {
      var box = host.querySelector('[data-ch-send]');
      if (box && box.getAttribute('data-chat-id')) return box.getAttribute('data-chat-id');
      return state.activeId;
    }

    host._chClick = function (e) {
      if (!host.contains(e.target)) return;

      // Enviar
      var sendBtn = e.target.closest('[data-ch-send-btn], .fa-send');
      if (sendBtn && host.contains(sendBtn)) {
        e.preventDefault();
        e.stopPropagation();
        closeAllMenus();
        doSend(host);
        return;
      }

      // Panel emojis toggle
      var emojiBtn = e.target.closest('[data-ch-emoji]');
      if (emojiBtn && host.contains(emojiBtn)) {
        e.preventDefault();
        e.stopPropagation();
        var panel = host.querySelector('[data-ch-emoji-panel]');
        if (panel) {
          var open = !panel.hidden;
          panel.hidden = open;
        }
        return;
      }

      // Elegir emoji
      var emojiPick = e.target.closest('[data-ch-emoji-pick]');
      if (emojiPick && host.contains(emojiPick)) {
        e.preventDefault();
        e.stopPropagation();
        var em = emojiPick.getAttribute('data-ch-emoji-pick') || emojiPick.textContent || '';
        var inp = host.querySelector('.fa-chat-input');
        if (inp && em) {
          var start = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
          var end = inp.selectionEnd != null ? inp.selectionEnd : inp.value.length;
          var v = inp.value || '';
          inp.value = v.slice(0, start) + em + v.slice(end);
          try {
            var pos = start + em.length;
            inp.setSelectionRange(pos, pos);
          } catch (ePos) {}
          inp.focus();
        }
        return;
      }

      var inMenu = e.target.closest('[data-ch-msg-menu], .fa-msg-dropdown, [data-ch-chat-menu], .fa-chat-dropdown');
      if (!inMenu) closeAllMenus();

      // ⋮ mensaje
      var msgMenuBtn = e.target.closest('[data-ch-msg-menu]');
      if (msgMenuBtn && host.contains(msgMenuBtn)) {
        e.preventDefault();
        e.stopPropagation();
        var mid = msgMenuBtn.getAttribute('data-ch-msg-menu');
        var dd = host.querySelector('[data-msg-dd="' + mid + '"]');
        var wasOpen = dd && dd.classList.contains('is-open');
        closeAllMenus();
        if (dd && !wasOpen) {
          placeDropdown(dd, msgMenuBtn);
          msgMenuBtn.classList.add('is-open');
          state._menuOpen = true;
        }
        return;
      }

      // Responder
      var replyBtn = e.target.closest('[data-ch-reply-msg]');
      if (replyBtn && host.contains(replyBtn)) {
        e.preventDefault();
        e.stopPropagation();
        var rid = replyBtn.getAttribute('data-ch-reply-msg');
        var msgEl = host.querySelector('[data-msg-id="' + rid + '"] .fa-msg-text');
        var authorEl = host.querySelector('[data-msg-id="' + rid + '"] .fa-msg-author');
        var c = activeChat();
        var u0 = session();
        var me = u0 ? normEmail(u0.email) : '';
        var fromName = authorEl ? authorEl.textContent : (c ? chatTitle(c, u0) : 'Mensaje');
        // Si es mío, el author no se muestra
        var bubble = host.querySelector('[data-msg-id="' + rid + '"]');
        if (bubble && bubble.classList.contains('mine')) fromName = 'Tú';
        state.replyTo = {
          id: rid,
          text: msgEl ? msgEl.textContent : '',
          fromName: fromName
        };
        closeAllMenus();
        paint(host, true);
        setTimeout(function () {
          try {
            var inp = host.querySelector('.fa-chat-input');
            if (inp) inp.focus();
          } catch (eR) {}
        }, 30);
        return;
      }

      // Cancelar respuesta
      var cancelReply = e.target.closest('[data-ch-cancel-reply]');
      if (cancelReply && host.contains(cancelReply)) {
        e.preventDefault();
        e.stopPropagation();
        state.replyTo = null;
        paint(host, true);
        return;
      }

      // Copiar
      var copyMsg = e.target.closest('[data-ch-copy-msg]');
      if (copyMsg && host.contains(copyMsg)) {
        e.preventDefault();
        e.stopPropagation();
        var midC = copyMsg.getAttribute('data-ch-copy-msg');
        var bubble = host.querySelector('[data-msg-id="' + midC + '"] .fa-msg-text');
        var txt = bubble ? bubble.textContent : '';
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
          else {
            var ta = document.createElement('textarea');
            ta.value = txt;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
        } catch (eC) {}
        closeAllMenus();
        return;
      }

      // Eliminar mensaje
      var delMsg = e.target.closest('[data-ch-del-msg]');
      if (delMsg && host.contains(delMsg)) {
        e.preventDefault();
        e.stopPropagation();
        var msgId = delMsg.getAttribute('data-ch-del-msg');
        var chatId = activeChatId();
        closeAllMenus();
        if (!confirm('¿Eliminar este mensaje?')) return;
        if (deleteMessage(chatId, msgId)) paint(host, true);
        return;
      }

      // ⋮ chat cabecera
      var chatMenuBtn = e.target.closest('[data-ch-chat-menu]');
      if (chatMenuBtn && host.contains(chatMenuBtn)) {
        e.preventDefault();
        e.stopPropagation();
        var cdd = host.querySelector('[data-ch-chat-dd]');
        var open = cdd && cdd.classList.contains('is-open');
        closeAllMenus();
        if (cdd && !open) {
          placeDropdown(cdd, chatMenuBtn);
          state._menuOpen = true;
        }
        return;
      }

      // Buscar en el chat (menú)
      var searchChat = e.target.closest('[data-ch-search-chat]');
      if (searchChat && host.contains(searchChat)) {
        e.preventDefault();
        e.stopPropagation();
        closeAllMenus();
        var q = prompt('Buscar en este chat:');
        if (q == null || !String(q).trim()) return;
        var body = host.querySelector('[data-ch-scroll]');
        if (!body) return;
        var term = String(q).trim().toLowerCase();
        var found = null;
        body.querySelectorAll('.fa-msg-text').forEach(function (el) {
          if (found) return;
          if ((el.textContent || '').toLowerCase().indexOf(term) >= 0) found = el;
        });
        if (found) {
          found.scrollIntoView({ behavior: 'smooth', block: 'center' });
          found.style.outline = '2px solid #00C8E8';
          setTimeout(function () { found.style.outline = ''; }, 2000);
        } else {
          try { alert('No se encontraron mensajes.'); } catch (eA) {}
        }
        return;
      }

      // Silenciar
      var muteChat = e.target.closest('[data-ch-mute-chat]');
      if (muteChat && host.contains(muteChat)) {
        e.preventDefault();
        e.stopPropagation();
        closeAllMenus();
        var midChat = activeChatId();
        try {
          var key = 'gm_chat_muted_' + (midChat || '');
          var muted = localStorage.getItem(key) === '1';
          localStorage.setItem(key, muted ? '0' : '1');
          alert(muted ? 'Notificaciones reactivadas.' : 'Chat silenciado en este dispositivo.');
        } catch (eM) {}
        return;
      }

      // Vaciar
      var clearBtn = e.target.closest('[data-ch-clear-chat]');
      if (clearBtn && host.contains(clearBtn)) {
        e.preventDefault();
        e.stopPropagation();
        var cid = activeChatId();
        closeAllMenus();
        if (!cid) return;
        if (!confirm('¿Vaciar todos los mensajes de este chat?')) return;
        if (clearChat(cid)) paint(host, true);
        return;
      }

      // Eliminar conversación
      var delChat = e.target.closest('[data-ch-delete-chat]');
      if (delChat && host.contains(delChat)) {
        e.preventDefault();
        e.stopPropagation();
        var cid2 = activeChatId();
        closeAllMenus();
        if (!cid2) return;
        if (!confirm('¿Eliminar esta conversación por completo?')) return;
        if (deleteConversation(cid2)) paint(host, true);
        return;
      }

      // Lista / filtros / nuevo
      var t = e.target.closest('[data-ch-open],[data-ch-filter],[data-ch-new],[data-ch-cancel-new],[data-ch-start]');
      if (!t || !host.contains(t)) return;
      e.preventDefault();
      e.stopPropagation();
      closeAllMenus();
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
      if (input.name !== 'text' && !(input.classList && input.classList.contains('fa-chat-input'))) return;
      e.preventDefault();
      e.stopPropagation();
      doSend(host);
    };

    // Búsqueda respaldo
    host._chInput = function (e) {
      var el = e.target;
      if (!el || !host.contains(el)) return;
      if (!el.hasAttribute || el.getAttribute('data-ch-q') === null) return;
      e.stopPropagation();
      state.q = el.value || '';
      clearTimeout(host._chQt);
      host._chQt = setTimeout(function () { updateSearchList(host); }, 80);
    };
    host._chSearchKey = function (e) {
      var el = e.target;
      if (!el || !host.contains(el)) return;
      if (!el.hasAttribute || el.getAttribute('data-ch-q') === null) return;
      e.stopPropagation();
      if (e.key === 'Enter') e.preventDefault();
    };


    host.addEventListener('click', host._chClick, true);
    host.addEventListener('keydown', host._chKey, true);
    host.addEventListener('input', host._chInput, true);
    host.addEventListener('keydown', host._chSearchKey, true);

    // Envío directo (prioridad máxima)
    function wireSend() {
      var btn = host.querySelector('[data-ch-send-btn], button.fa-send');
      if (btn) {
        btn.onclick = null;
        btn.onmousedown = null;
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          doSend(host);
        }, true);
      }
      var input = host.querySelector('input.fa-chat-input');
      if (input) {
        input.addEventListener('keydown', function (e) {
          if (e.key !== 'Enter') return;
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          doSend(host);
        }, true);
      }
    }
    wireSend();

    // Buscador directo
    var searchInp = host.querySelector('[data-ch-q]');
    if (searchInp) {
      searchInp.oninput = function () {
        state.q = searchInp.value || '';
        clearTimeout(host._chQt);
        host._chQt = setTimeout(function () { updateSearchList(host); }, 80);
      };
      searchInp.onkeydown = function (e) {
        e.stopPropagation();
        if (e.key === 'Enter') e.preventDefault();
      };
    }
  }

  function updateSearchList(host) {
    host = host || state.host;
    if (!host) return;
    var u = session();
    if (!u) return;
    var itemsBox = host.querySelector('.fa-col-list .fa-items');
    if (!itemsBox) itemsBox = host.querySelector('.fa-items');
    if (!itemsBox) return;
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
      rows = '<div class="fa-status">' + (state.q
        ? ('Sin resultados para «' + esc(state.q) + '»')
        : 'No hay conversaciones.') + '</div>';
    }
    itemsBox.innerHTML = rows;
  }

  function mount(hostId) {
    var host = typeof hostId === 'string' ? document.getElementById(hostId) : hostId;
    if (!host) return;
    state.host = host;
    try { purgeBlockedUsers(); } catch (ePurge) {}
    paint(host, true);

    // Firebase: pull + listen en tiempo real
    syncFromCloud().then(function () {
      startCloudListen();
    });

    // Otras pestañas del mismo navegador
    try {
      if (!state._bc && typeof BroadcastChannel !== 'undefined') {
        state._bc = new BroadcastChannel('gm_chats_channel');
        state._bc.onmessage = function () {
          if (Date.now() < (state._quietUntil || 0) || state._sending) return;
          refreshUI(true);
        };
      }
    } catch (eBc) {}

    try {
      if (!global.__gmChatStorageBound) {
        global.__gmChatStorageBound = true;
        window.addEventListener('storage', function (ev) {
          if (!ev.key) return;
          if (ev.key === 'gm_chats_v1' || ev.key === 'gm_chats_ping' || String(ev.key).indexOf('chat') >= 0) {
            refreshUI(true);
          }
        });
      }
    } catch (e) {}

    // Poll agresivo: detectar cambios locales y bajar de la nube cada 2s
    try {
      if (state._poll) clearInterval(state._poll);
      state._poll = setInterval(function () {
        if (!state.host || !document.body.contains(state.host)) return;
        if (state._menuOpen || state._sending || state._painting) return;
        if (Date.now() < (state._quietUntil || 0)) return;
        var sig = chatsSignature(loadChats());
        if (sig !== state._dataSig) {
          state._dataSig = sig;
          refreshUI(true);
        }
      }, 1500);
      if (state._pullPoll) clearInterval(state._pullPoll);
      state._pullPoll = setInterval(function () {
        if (!state.host || !document.body.contains(state.host)) return;
        if (state._menuOpen || state._sending || state._painting) return;
        if (Date.now() < (state._quietUntil || 0)) return;
        try {
          var ae = document.activeElement;
          if (ae && state.host && state.host.contains(ae) && (ae.hasAttribute('data-ch-q') || (ae.classList && ae.classList.contains('fa-chat-input')))) return;
        } catch (eA) {}
        syncFromCloud();
      }, 4000);
    } catch (eP) {}
  }

  function refresh() {
    refreshUI(true);
    syncFromCloud();
  }

  // Emojis globales (el envío se cablea en bind/wireSend)
  if (!global.__gmChatEmojiBound) {
    global.__gmChatEmojiBound = true;
    document.addEventListener('click', function (e) {
      var pick = e.target && e.target.closest && e.target.closest('[data-ch-emoji-pick]');
      if (pick) {
        var root2 = pick.closest('#faRootDocente, #faRootEstudiante, .fa-root');
        if (!root2) return;
        e.preventDefault();
        e.stopPropagation();
        var em = pick.getAttribute('data-ch-emoji-pick') || pick.textContent || '';
        var inp = root2.querySelector('input.fa-chat-input');
        if (inp && em) {
          var start = inp.selectionStart != null ? inp.selectionStart : inp.value.length;
          var end = inp.selectionEnd != null ? inp.selectionEnd : inp.value.length;
          var v = inp.value || '';
          inp.value = v.slice(0, start) + em + v.slice(end);
          try { inp.setSelectionRange(start + em.length, start + em.length); } catch (eP) {}
          inp.focus();
        }
        return;
      }
      var tog = e.target && e.target.closest && e.target.closest('[data-ch-emoji]');
      if (tog) {
        var root3 = tog.closest('#faRootDocente, #faRootEstudiante, .fa-root');
        if (!root3) return;
        // no bloquear si el target es otro control
        if (tog.closest('[data-ch-send-btn], .fa-send, .fa-chat-input')) return;
        e.preventDefault();
        e.stopPropagation();
        var panel = root3.querySelector('[data-ch-emoji-panel]');
        if (panel) panel.hidden = !panel.hidden;
      }
    }, false);
  }


  global.ForosAvisos = { mount: mount, refresh: refresh, paint: paint, syncFromCloud: syncFromCloud, doSend: doSend };
  global.GeoMetricsChat = { mount: mount, refresh: refresh, paint: paint, syncFromCloud: syncFromCloud, doSend: doSend };
})(window);
