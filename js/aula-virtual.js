/**
 * GeoMetrics — Aula Virtual Futurista (Fase 1)
 * UI estudiante + puente a datos reales de aula.js (tareas, materias, presentaciones).
 */
(function () {
  'use strict';

  var FALLBACK_COURSES = [
    { id: 'ms', name: 'Mecánica de Suelos I', code: 'IC-MS1', progress: 0, teacher: '—', theme: '—' },
    { id: 'ms2', name: 'Mecánica de Suelos II', code: 'IC-MS2', progress: 0, teacher: '—', theme: '—' },
    { id: 'rm', name: 'Resistencia de Materiales', code: 'IC-RM', progress: 0, teacher: '—', theme: '—' },
    { id: 'dm', name: 'Diseño de Mezclas', code: 'IC-DM', progress: 0, teacher: '—', theme: '—' }
  ];

  var state = {
    view: 'aula',
    courseId: null,
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth()
  };

  function $(id) { return document.getElementById(id); }
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function toast(msg) {
    var el = $('avToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { el.classList.remove('show'); }, 2800);
  }

  function esc(s) {
    if (typeof aulaEsc === 'function') return aulaEsc(s);
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function currentUser() {
    try {
      if (typeof aulaGetSession === 'function') {
        var u = aulaGetSession();
        if (u && typeof aulaUsuarioCompleto === 'function') u = aulaUsuarioCompleto(u) || u;
        return u;
      }
    } catch (e) {}
    return null;
  }

  function looksLikeEmail(s) {
    return /@/.test(String(s || ''));
  }

  /** Nombre visible (NUNCA correo) para chips, header y perfil. */
  function userDisplayName(u) {
    if (!u) return 'Usuario';
    var pref = (u.preferenciaNombre || u.nombrePreferido || u.nombreCorto || '').trim();
    if (pref && !looksLikeEmail(pref)) return pref;
    var full = ((u.nombres || '') + ' ' + (u.apellidos || '')).trim();
    if (full && !looksLikeEmail(full)) return full;
    var nom = (u.nombre || '').trim();
    if (nom && !looksLikeEmail(nom)) return nom;
    // último recurso: parte local del correo, sin dominio (ej. andres.enriquezval)
    var email = String(u.email || '');
    if (email.indexOf('@') > 0) {
      var local = email.split('@')[0].replace(/[._]+/g, ' ').trim();
      if (local) {
        return local.replace(/\w/g, function (c) { return c.toUpperCase(); });
      }
    }
    return (u.rol === 'docente') ? 'Docente' : 'Estudiante';
  }

  function userInitials(u) {
    var n = userDisplayName(u);
    var parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (n.slice(0, 2) || 'ES').toUpperCase();
  }

  /** Cursos desde materias reales del usuario; si no hay, fallback. */
  function loadCourses() {
    var u = currentUser();
    var mats = [];
    try {
      if (typeof aulaMateriasUsuario === 'function') mats = aulaMateriasUsuario(u) || [];
    } catch (e) {}
    if (mats.length) {
      return mats.map(function (m, i) {
        var name = m.nombre || m.name || ('Materia ' + (i + 1));
        return {
          id: 'm' + i,
          name: name,
          code: name.replace(/\s+/g, '-').slice(0, 12).toUpperCase(),
          progress: computeProgressForMateria(name),
          teacher: '—',
          theme: 'Grupo ' + (m.grupo || (m.grupos && m.grupos[0]) || '—'),
          grupo: m.grupo || ''
        };
      });
    }
    return FALLBACK_COURSES.slice();
  }

  function computeProgressForMateria(materia) {
    try {
      if (typeof aulaLoad !== 'function' || typeof AULA_KEYS === 'undefined') return 0;
      var u = currentUser();
      if (!u) return 0;
      var tareas = (aulaLoad(AULA_KEYS.tareas, []) || []).filter(function (t) {
        return t.materia === materia && studentSeesTask(t, u);
      });
      if (!tareas.length) return 0;
      var entregas = aulaLoad(AULA_KEYS.entregas, []) || [];
      var done = 0;
      tareas.forEach(function (t) {
        if (entregas.some(function (e) { return e.tareaId === t.id && e.estudianteId === u.id; })) done++;
      });
      return Math.round((done / tareas.length) * 100);
    } catch (e) { return 0; }
  }

  function studentSeesTask(t, user) {
    if (!t || !user) return false;
    try {
      if (typeof aulaUsuarioCoincideMateriaGrupo === 'function') {
        return aulaUsuarioCoincideMateriaGrupo(user, t.materia, t.grupo || '');
      }
    } catch (e) {}
    var mats = loadCourses().map(function (c) { return c.name; });
    return mats.indexOf(t.materia) >= 0;
  }

  function courseById(id) {
    var list = loadCourses();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return list[0] || FALLBACK_COURSES[0];
  }


  var FORUM_KEY = 'geometrics_aula_forum';

  function loadForum() {
    try {
      if (typeof aulaLoad === 'function') return aulaLoad(FORUM_KEY, []) || [];
      return JSON.parse(localStorage.getItem(FORUM_KEY) || '[]') || [];
    } catch (e) { return []; }
  }
  function saveForum(list) {
    try {
      if (typeof aulaSave === 'function') aulaSave(FORUM_KEY, list);
      else localStorage.setItem(FORUM_KEY, JSON.stringify(list));
    } catch (e) {}
  }

  function goToLab(which) {
    hideAulaVirtual();
    var map = {
      suelos: 'suelos',
      suelos2: 'suelos2',
      resistencia: 'resistencia',
      mezclas: 'disenoMezclas',
      recursos: 'recursos',
      resultados: 'resultados'
    };
    var p = map[which] || 'menu';
    if (typeof mostrarPantalla === 'function') {
      try { mostrarPantalla(p); } catch (e) { try { mostrarPantalla('menu'); } catch (e2) {} }
    }
  }

  function renderHome() {
    var stats = $('avHomeStats');
    var pend = $('avHomePendientes');
    var labs = $('avHomeLabs');
    var u = currentUser();
    var tareas = [];
    var entregas = [];
    try {
      if (typeof aulaLoad === 'function') {
        tareas = (aulaLoad(AULA_KEYS.tareas, []) || []).filter(function (t) { return studentSeesTask(t, u); });
        entregas = aulaLoad(AULA_KEYS.entregas, []) || [];
      }
    } catch (e) {}
    var doneMap = {};
    entregas.forEach(function (e) { if (u && e.estudianteId === u.id) doneMap[e.tareaId] = e; });
    var pending = tareas.filter(function (t) { return !doneMap[t.id]; });
    var graded = entregas.filter(function (e) { return u && e.estudianteId === u.id && e.nota != null && e.nota !== ''; });
    if (stats) {
      stats.innerHTML =
        '<div class="av-stat"><strong>' + loadCourses().length + '</strong><span>Cursos</span></div>' +
        '<div class="av-stat"><strong>' + tareas.length + '</strong><span>Tareas</span></div>' +
        '<div class="av-stat"><strong>' + pending.length + '</strong><span>Pendientes</span></div>' +
        '<div class="av-stat"><strong>' + graded.length + '</strong><span>Con nota</span></div>';
    }
    if (pend) {
      if (!pending.length) pend.innerHTML = '<div class="av-empty">No tienes tareas pendientes.</div>';
      else pend.innerHTML = pending.slice().reverse().slice(0, 8).map(function (t) {
        return '<div class="aula-item"><strong>' + esc(t.titulo) + '</strong><p>' + esc(t.materia) +
          (t.fechaLimite ? ' · Límite ' + esc(t.fechaLimite) : '') + '</p></div>';
      }).join('');
    }
    if (labs) renderLabsInto(labs);
    updateNotifBadge(pending.length);
  }

  function updateNotifBadge(n) {
    var b = $('avNotifBadge');
    if (!b) return;
    if (n > 0) { b.hidden = false; b.textContent = String(n); }
    else { b.hidden = true; }
  }

  function renderLabsInto(box) {
    if (!box) return;
    var items = [
      { id: 'suelos', title: 'Mecánica de Suelos I', desc: 'Teoría, ensayos y simuladores' },
      { id: 'suelos2', title: 'Mecánica de Suelos II', desc: 'Cimentaciones y estabilidad' },
      { id: 'resistencia', title: 'Resistencia de Materiales', desc: 'Esfuerzos y deformaciones' },
      { id: 'mezclas', title: 'Diseño de Mezclas', desc: 'Concreto y dosificaciones' },
      { id: 'recursos', title: 'Recursos / guías PDF', desc: 'Biblioteca del laboratorio' },
      { id: 'resultados', title: 'Mis resultados', desc: 'Historial de ensayos' }
    ];
    box.innerHTML = items.map(function (it) {
      return '<div class="av-tile av-lab-tile" data-lab="' + it.id + '"><h4>' + it.title + '</h4><p>' + it.desc + '</p></div>';
    }).join('');
    qsa('[data-lab]', box).forEach(function (el) {
      el.addEventListener('click', function () { goToLab(el.getAttribute('data-lab')); });
    });
  }

  function renderGrades() {
    var box = $('avGradesList');
    if (!box) return;
    var u = currentUser();
    if (typeof aulaLoad !== 'function') {
      box.innerHTML = '<div class="av-empty">Sin datos.</div>';
      return;
    }
    var tareas = (aulaLoad(AULA_KEYS.tareas, []) || []).filter(function (t) { return studentSeesTask(t, u); });
    var entregas = aulaLoad(AULA_KEYS.entregas, []) || [];
    var byTask = {};
    entregas.forEach(function (e) { if (u && e.estudianteId === u.id) byTask[e.tareaId] = e; });
    if (!tareas.length) {
      box.innerHTML = '<div class="av-empty">No hay tareas para calificar todavía.</div>';
      return;
    }
    box.innerHTML = tareas.slice().reverse().map(function (t) {
      var e = byTask[t.id];
      var estado, cls;
      if (!e) { estado = 'Sin entrega'; cls = 'badge-pend'; }
      else if (e.nota == null || e.nota === '') { estado = 'Entregada · sin nota'; cls = 'badge-ok'; }
      else { estado = 'Nota: ' + e.nota; cls = 'badge-ok'; }
      return '<div class="aula-item"><div class="aula-item-top"><strong>' + esc(t.titulo) + '</strong><span class="' + cls + '">' + esc(estado) + '</span></div>' +
        '<p>' + esc(t.materia) + (e && e.comentario ? ' · ' + esc(e.comentario) : '') + '</p></div>';
    }).join('');
  }

  function renderForum() {
    try {
      var el = document.getElementById('faRootEstudiante');
      if (el && window.ForosAvisos && typeof ForosAvisos.mount === 'function') {
        ForosAvisos.mount(el);
      } else if (el) {
        el.innerHTML = '<div style="padding:24px;color:#8DA7C2">Módulo de mensajes no cargado. Recarga con Ctrl+F5.</div>';
      }
    } catch (e) {
      console.error('renderForum', e);
    }
  }

  function postForum() {
    var sel = $('avForumMateria');
    var input = $('avForumInput');
    var texto = (input && input.value || '').trim();
    if (!texto) { toast('Escribe un mensaje.'); return; }
    var u = currentUser();
    var list = loadForum();
    list.push({
      id: (typeof aulaUid === 'function' ? aulaUid() : String(Date.now())),
      materia: (sel && sel.value) || '',
      texto: texto,
      autor: userDisplayName(u),
      autorId: u && (u.id || u.email) || '',
      fecha: new Date().toISOString()
    });
    saveForum(list);
    if (input) input.value = '';
    renderForum();
    toast('Publicado en el mural.');
  }

  function renderCalendarView() {
    var grid = $('avCalGridView');
    var label = $('avCalLabelView');
    var events = $('avCalEvents');
    if (!grid) return;
    // reuse main calendar month state
    var y = state.calYear, m = state.calMonth;
    var months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    if (label) label.textContent = months[m] + ' ' + y;
    var eventDays = {};
    var dayTasks = {};
    try {
      var u = currentUser();
      (aulaLoad(AULA_KEYS.tareas, []) || []).forEach(function (t) {
        if (!studentSeesTask(t, u) || !t.fechaLimite) return;
        var parts = String(t.fechaLimite).split('-');
        if (parts.length >= 3 && +parts[0] === y && (+parts[1] - 1) === m) {
          var d = +parts[2];
          eventDays[d] = true;
          (dayTasks[d] = dayTasks[d] || []).push(t);
        }
      });
    } catch (e) {}
    try {
      var schMap = collectScheduleEventsForMonth(y, m);
      Object.keys(schMap).forEach(function (d) {
        eventDays[+d] = true;
        (dayTasks[+d] = dayTasks[+d] || []);
        schMap[d].forEach(function (slot) {
          dayTasks[+d].push({
            titulo: slot.materia + ' (' + (slot.inicio || '') + ')',
            materia: (DIAS[slot.dia] || '') + ' · ' + (slot.aula || '') + ' · ' + (slot.docente || ''),
            _horario: true
          });
        });
      });
    } catch (eS2) {}
    var first = new Date(y, m, 1);
    var startDow = (first.getDay() + 6) % 7;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var prevDays = new Date(y, m, 0).getDate();
    var html = ['L','M','X','J','V','S','D'].map(function (d) { return '<div class="dow">' + d + '</div>'; }).join('');
    for (var i = 0; i < startDow; i++) html += '<div class="day muted">' + (prevDays - startDow + i + 1) + '</div>';
    var today = new Date();
    for (var day = 1; day <= daysInMonth; day++) {
      var cls = 'day';
      if (y === today.getFullYear() && m === today.getMonth() && day === today.getDate()) cls += ' today';
      if (eventDays[day]) cls += ' event';
      html += '<div class="' + cls + '" data-day="' + day + '">' + day + '</div>';
    }
    var cells = startDow + daysInMonth;
    var tail = (7 - (cells % 7)) % 7;
    for (var t = 1; t <= tail; t++) html += '<div class="day muted">' + t + '</div>';
    grid.innerHTML = html;
    qsa('.day[data-day]', grid).forEach(function (el) {
      el.addEventListener('click', function () {
        var d = +el.getAttribute('data-day');
        var list = dayTasks[d] || [];
        if (!events) return;
        if (!list.length) events.innerHTML = '<div class="av-empty">Sin entregas el día ' + d + '.</div>';
        else events.innerHTML = list.map(function (t) {
          return '<div class="aula-item"><strong>' + esc(t.titulo) + '</strong><p>' + esc(t.materia) + '</p></div>';
        }).join('');
      });
    });
  }


  var PROGRAM_LINK = 'https://www.unipamplona.edu.co/unipamplona/portalIG/home_129/publicacion/publicado/';
  var DIAS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];

  /**
   * Horario de referencia interno (NO se distribuye como PDF ni se aplica a otros usuarios).
   * Columnas: Lunes=0 … Domingo=6
   * Lunes: Suelos II 10:00-12:59 + Álgebra 14:00-16:59
   * Miércoles: Diseño Experimentos 09:00-11:59
   * Jueves: Fluidos 13:00-15:59
   * Viernes: Resistencia 10:00-12:59, Fluidos 14:00-15:59, Suelos II 17:00-18:59, Electiva 19:00-21:59
   */
  var HORARIO_VERSION = 6;
  var HORARIO_ACADEMUSOFT_DEFAULT = [
    /* Lunes */
    { materia: 'MECÁNICA DE SUELOS II', grupo: 'C', dia: 0, inicio: '10:00', fin: '12:59', aula: 'LAB100 (AULATIC CIV)', docente: 'ERIKA ALEJANDRA BAUTISTA RICO' },
    { materia: 'ÁLGEBRA LINEAL', grupo: 'M', dia: 0, inicio: '14:00', fin: '16:59', aula: 'JG 105', docente: 'ALVARO CARRILLO VERA' },
    /* Martes — Diseño (columna Martes del PDF Academusoft) */
    { materia: 'DISEÑO DE EXPERIMENTOS I', grupo: 'A', dia: 1, inicio: '09:00', fin: '11:59', aula: 'SVR106 (ING INDUS)', docente: 'NELCY XIOMARA ORJUELA DUARTE' },
    /* Miércoles / Jueves — Fluidos */
    { materia: 'MECÁNICA DE FLUIDOS', grupo: 'D', dia: 2, inicio: '13:00', fin: '15:59', aula: 'SVR219', docente: 'MARLON YESID POVEDA PACHON' },
    { materia: 'MECÁNICA DE FLUIDOS', grupo: 'D', dia: 3, inicio: '14:00', fin: '15:59', aula: 'JG 212', docente: 'MARLON YESID POVEDA PACHON' },
    /* Viernes */
    { materia: 'RESISTENCIA DE MATERIALES', grupo: 'A', dia: 4, inicio: '10:00', fin: '12:59', aula: 'CS205', docente: 'DAYANA JOSEFA ORTIZ CAMPO' },
    { materia: 'MECÁNICA DE SUELOS II', grupo: 'C', dia: 4, inicio: '17:00', fin: '18:59', aula: 'LC203', docente: 'ERIKA ALEJANDRA BAUTISTA RICO' },
    { materia: 'ELECTIVA SOCIOHUMANÍSTICA I', grupo: 'B', dia: 4, inicio: '19:00', fin: '21:59', aula: 'CS116', docente: 'VALENTINA MOGOLLON RAMON' }
  ];

  function horarioStorageKey() {
    var u = currentUser();
    var id = (u && (u.email || u.id)) ? String(u.email || u.id).toLowerCase() : 'anon';
    return 'geometrics_horario_' + id;
  }

  function horarioEmailKey() {
    var u = currentUser();
    if (!u || !u.email) return null;
    try {
      if (window.GeoCloud && typeof window.GeoCloud.emailKey === 'function') {
        return window.GeoCloud.emailKey(u.email);
      }
    } catch (e) {}
    return String(u.email).toLowerCase().replace(/\./g, ',').replace(/@/g, '_at_');
  }

  function horarioCloudPath() {
    var ek = horarioEmailKey();
    return ek ? ('horarios/' + ek) : null;
  }

  function normalizeDia(v) {
    if (typeof v === 'number' && !isNaN(v)) {
      var n = Math.floor(v);
      return (n >= 0 && n <= 6) ? n : -1;
    }
    var s = String(v == null ? '' : v).trim().toLowerCase();
    try {
      if (s.normalize) s = s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    } catch (eN) {
      s = s.replace(/á/g, 'a').replace(/é/g, 'e').replace(/í/g, 'i')
           .replace(/ó/g, 'o').replace(/ú/g, 'u');
    }
    if (/^[0-6]$/.test(s)) return +s;
    if (s.indexOf('lunes') === 0 || s === 'lun') return 0;
    if (s.indexOf('martes') === 0 || s === 'mar') return 1;
    if (s.indexOf('miercoles') === 0 || s === 'mie') return 2;
    if (s.indexOf('jueves') === 0 || s === 'jue') return 3;
    if (s.indexOf('viernes') === 0 || s === 'vie') return 4;
    if (s.indexOf('sabado') === 0 || s === 'sab') return 5;
    if (s.indexOf('domingo') === 0 || s === 'dom') return 6;
    var num = parseInt(s, 10);
    if (!isNaN(num) && num >= 0 && num <= 6) return num;
    return -1;
  }

  function cloneDefaultSlots() {
    return HORARIO_ACADEMUSOFT_DEFAULT.map(function (x) {
      return {
        materia: x.materia,
        grupo: x.grupo || '',
        dia: normalizeDia(x.dia),
        inicio: x.inicio,
        fin: x.fin,
        aula: x.aula || '',
        docente: x.docente || ''
      };
    });
  }

  function emptyHorario() {
    return {
      slots: [],
      fileName: '',
      fileData: '',
      version: HORARIO_VERSION,
      personal: true,
      fromDefault: false
    };
  }

  function sanitizeSlots(list) {
    return (Array.isArray(list) ? list : []).map(function (s) {
      return {
        materia: (s && s.materia) || '',
        grupo: (s && s.grupo) || '',
        dia: normalizeDia(s && s.dia),
        inicio: (s && s.inicio) || '',
        fin: (s && s.fin) || '',
        aula: (s && s.aula) || '',
        docente: (s && s.docente) || ''
      };
    }).filter(function (s) { return s.dia >= 0 && s.inicio; });
  }

  function isDemoScheduleSlots(slots) {
    slots = sanitizeSlots(slots);
    var demo = cloneDefaultSlots();
    if (slots.length !== demo.length) return false;
    var key = function (s) {
      return [s.dia, s.inicio, s.fin, String(s.materia || '').toUpperCase()].join('|');
    };
    return slots.map(key).sort().join(';;') === demo.map(key).sort().join(';;');
  }

  /** Payload liviano para localStorage (sin PDF base64 enorme). */
  function horarioToLocalPayload(data) {
    return {
      slots: sanitizeSlots(data && data.slots),
      fileName: (data && data.fileName) || '',
      // Nunca guardar PDF completo: satura localStorage y falla en muchos PCs
      fileData: '',
      version: HORARIO_VERSION,
      personal: true,
      fromDefault: !!(data && data.fromDefault),
      updatedAt: Date.now()
    };
  }

  function loadHorario() {
    try {
      var key = horarioStorageKey();
      var raw = localStorage.getItem(key);
      if (!raw) return emptyHorario();
      var o = JSON.parse(raw);
      var ver = Number(o.version || 0);
      var slots = sanitizeSlots(o.slots);

      // Migración: quitar demos compartidos por error
      if (ver < HORARIO_VERSION) {
        var wasSharedDemo = !!(o.fromDefault) || (!o.personal && isDemoScheduleSlots(slots));
        if (wasSharedDemo) {
          slots = [];
          o.fileName = '';
          o.fromDefault = false;
        }
        var fixed = horarioToLocalPayload({
          slots: slots,
          fileName: o.fileName || '',
          fromDefault: false
        });
        try { localStorage.setItem(key, JSON.stringify(fixed)); } catch (eM) {}
        return fixed;
      }

      return {
        slots: slots,
        fileName: o.fileName || '',
        fileData: '',
        version: ver || HORARIO_VERSION,
        personal: o.personal !== false,
        fromDefault: !!o.fromDefault
      };
    } catch (e) {
      console.warn('loadHorario', e);
      return emptyHorario();
    }
  }

  function pushHorarioCloud(data) {
    var path = horarioCloudPath();
    if (!path) return Promise.resolve(false);
    if (!window.GeoCloud || typeof window.GeoCloud.cloudSet !== 'function') {
      return Promise.resolve(false);
    }
    var payload = {
      slots: sanitizeSlots(data && data.slots),
      fileName: (data && data.fileName) || '',
      version: HORARIO_VERSION,
      personal: true,
      fromDefault: !!(data && data.fromDefault),
      updatedAt: Date.now(),
      email: (currentUser() && currentUser().email) || ''
    };
    return window.GeoCloud.cloudSet(path, payload)
      .then(function (ok) { return !!ok; })
      .catch(function (e) {
        console.warn('pushHorarioCloud', e);
        return false;
      });
  }

  function pullHorarioCloud() {
    var path = horarioCloudPath();
    if (!path || !window.GeoCloud || typeof window.GeoCloud.cloudGet !== 'function') {
      return Promise.resolve(null);
    }
    return window.GeoCloud.cloudGet(path).then(function (val) {
      if (!val || typeof val !== 'object') return null;
      var h = horarioToLocalPayload({
        slots: val.slots,
        fileName: val.fileName || '',
        fromDefault: !!val.fromDefault
      });
      try {
        localStorage.setItem(horarioStorageKey(), JSON.stringify(h));
      } catch (e) {}
      return h;
    }).catch(function (e) {
      console.warn('pullHorarioCloud', e);
      return null;
    });
  }

  function saveHorario(data) {
    var payload = horarioToLocalPayload(data || emptyHorario());
    var key = horarioStorageKey();
    try {
      localStorage.setItem(key, JSON.stringify(payload));
    } catch (e) {
      // Reintento sin nada extra
      try {
        localStorage.removeItem(key);
        localStorage.setItem(key, JSON.stringify(payload));
      } catch (e2) {
        console.warn('saveHorario local', e2);
        toast('No se pudo guardar en este navegador (almacenamiento lleno).');
        return false;
      }
    }
    // Nube (otros PCs)
    pushHorarioCloud(payload).then(function (ok) {
      if (ok) {
        /* silencioso */
      }
    });
    return true;
  }

  function syncHorarioFromCloud(cb) {
    return pullHorarioCloud().then(function (remote) {
      if (remote) {
        try {
          renderNextClass();
          renderCalendar();
          renderCalendarView();
          renderHorarioList();
          updatePerfilHorarioInfo();
        } catch (e) {}
      }
      if (typeof cb === 'function') cb(remote);
      return remote;
    }).catch(function () {
      if (typeof cb === 'function') cb(null);
      return null;
    });
  }

  /** Días del mes actual (state.calYear/Month) que coinciden con dia semanal 0=Lun..6=Dom */
  function daysInMonthMatchingWeekday(year, month, weekdayMon0) {
    var out = [];
    var dim = new Date(year, month + 1, 0).getDate();
    for (var d = 1; d <= dim; d++) {
      var wd = new Date(year, month, d).getDay(); // 0=Dom
      var mon0 = (wd + 6) % 7;
      if (mon0 === weekdayMon0) out.push(d);
    }
    return out;
  }

  function collectScheduleEventsForMonth(year, month) {
    var h = loadHorario();
    var map = {}; // day -> [slot,...]
    (h.slots || []).forEach(function (slot) {
      var days = daysInMonthMatchingWeekday(year, month, Number(slot.dia));
      days.forEach(function (d) {
        (map[d] = map[d] || []).push(slot);
      });
    });
    return map;
  }

  function renderHorarioList() {
    var box = $('avHorarioList');
    var info = $('avHorarioFileInfo');
    var h = loadHorario();
    if (info) {
      info.textContent = h.fileName
        ? ('Archivo: ' + h.fileName + (h.slots.length ? ' · ' + h.slots.length + ' clases/semana' : ''))
        : (h.slots.length ? (h.slots.length + ' clases vinculadas (sin PDF)') : 'Ningún horario cargado aún.');
    }
    if (!box) return;
    if (!h.slots.length) {
      box.innerHTML = '<div class="av-empty">Sube el PDF y pulsa «Vincular horario al calendario».</div>';
      return;
    }
    box.innerHTML = h.slots.map(function (s) {
      return '<div class="aula-item"><strong>' + esc(s.materia) + '</strong>' +
        '<p>Grupo ' + esc(s.grupo || '—') + ' · ' + esc(DIAS[s.dia] || '') + ' ' + esc(s.inicio) + '–' + esc(s.fin) + '</p>' +
        '<div class="aula-item-meta"><span>' + esc(s.aula || '') + '</span><span>' + esc(s.docente || '') + '</span></div></div>';
    }).join('');
  }

  function openEditProfile() {
    try {
      if (typeof aulaAbrirPerfil === 'function') {
        aulaAbrirPerfil();
      } else {
        var btn = $('btnEditarPerfil');
        if (btn) btn.click();
      }
      var modal = $('modalPerfil');
      if (modal) {
        modal.hidden = false;
        modal.removeAttribute('hidden');
        modal.style.zIndex = '10050';
        modal.style.display = 'flex';
      }
      bindPerfilHorarioBtn();
      updatePerfilHorarioInfo();
      try { syncHorarioFromCloud(function () { updatePerfilHorarioInfo(); renderNextClass(); }); } catch (eSy) {}
    } catch (e) {
      console.warn('openEditProfile', e);
      toast('No se pudo abrir el perfil.');
    }
  }

  function updatePerfilHorarioInfo() {
    var info = $('perfilHorarioInfo');
    if (info) {
      var h = loadHorario();
      if (h.fileName || (h.slots && h.slots.length)) {
        info.textContent = (h.fileName ? ('Archivo: ' + h.fileName) : 'Sin PDF') +
          (h.slots && h.slots.length ? (' · ' + h.slots.length + ' clases') : ' · sin clases aún') +
          ' · solo tu cuenta (nube)';
      } else {
        info.textContent = 'Sin horario personal. Sube tu PDF Academusoft o usa el editor manual.';
      }
    }
    try { renderPerfilHorarioSlots(); } catch (eR) {}
  }


  /** Carga pdf.js (reutiliza aula.js si existe). */
  function loadPdfJsLib() {
    if (typeof aulaLoadPdfJs === 'function') return aulaLoadPdfJs();
    return new Promise(function (resolve, reject) {
      if (window.pdfjsLib) return resolve(window.pdfjsLib);
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      s.onload = function () {
        if (window.pdfjsLib) {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        } else reject(new Error('pdf.js no disponible'));
      };
      s.onerror = function () { reject(new Error('No se pudo cargar pdf.js')); };
      document.head.appendChild(s);
    });
  }

  function fileToArrayBuffer(file) {
    return new Promise(function (resolve, reject) {
      var r = new FileReader();
      r.onload = function () { resolve(r.result); };
      r.onerror = function () { reject(new Error('No se pudo leer el archivo')); };
      r.readAsArrayBuffer(file);
    });
  }

  /**
   * Extrae ítems de texto con coordenadas de un PDF Academusoft.
   */
  function extractPdfTextItems(arrayBuffer) {
    return loadPdfJsLib().then(function (pdfjsLib) {
      return pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    }).then(function (pdf) {
      var maxPages = Math.min(pdf.numPages || 1, 8);
      var all = [];
      var chain = Promise.resolve();
      for (var p = 1; p <= maxPages; p++) {
        (function (pageNum) {
          chain = chain.then(function () {
            return pdf.getPage(pageNum).then(function (page) {
              return page.getTextContent().then(function (tc) {
                (tc.items || []).forEach(function (it) {
                  var str = String(it.str || '').trim();
                  if (!str) return;
                  var tr = it.transform || [1, 0, 0, 1, 0, 0];
                  all.push({ str: str, x: tr[4] || 0, y: tr[5] || 0, page: pageNum });
                });
              });
            });
          });
        })(p);
      }
      return chain.then(function () { return all; });
    });
  }

  function nearestDiaByX(x, dayCols) {
    var best = -1, bestD = 1e9;
    for (var d = 0; d < dayCols.length; d++) {
      if (dayCols[d] == null) continue;
      var dist = Math.abs(x - dayCols[d]);
      if (dist < bestD) { bestD = dist; best = d; }
    }
    return best;
  }

  /**
   * Parser del reporte "Horario Estudiante" Academusoft.
   * Usa posición X de columnas Lunes…Domingo y franjas HH:MM-HH:MM.
   */
  function parseAcademusoftHorarioItems(items) {
    if (!items || !items.length) return [];
    var dayNames = [
      { re: /^lunes$/i, d: 0 },
      { re: /^martes$/i, d: 1 },
      { re: /^mi[eé]rcoles$/i, d: 2 },
      { re: /^jueves$/i, d: 3 },
      { re: /^viernes$/i, d: 4 },
      { re: /^s[aá]bado$/i, d: 5 },
      { re: /^domingo$/i, d: 6 }
    ];
    var dayCols = [null, null, null, null, null, null, null];
    items.forEach(function (it) {
      var s = it.str.replace(/\s+/g, ' ').trim();
      for (var i = 0; i < dayNames.length; i++) {
        if (dayNames[i].re.test(s)) {
          // promedio si aparece varias veces
          var d = dayNames[i].d;
          dayCols[d] = dayCols[d] == null ? it.x : (dayCols[d] + it.x) / 2;
        }
      }
    });
    // Si no hay encabezados, estimar columnas típicas del PDF horizontal
    var hasCols = dayCols.some(function (v) { return v != null; });
    if (!hasCols) {
      var xs = items.map(function (it) { return it.x; });
      var minX = Math.min.apply(null, xs);
      var maxX = Math.max.apply(null, xs);
      var span = Math.max(maxX - minX, 1);
      // materia a la izquierda; días repartidos a la derecha
      for (var d = 0; d < 7; d++) {
        dayCols[d] = minX + span * (0.28 + d * 0.1);
      }
    }

    var timeRe = /(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/;
    var times = [];
    items.forEach(function (it) {
      var m = it.str.match(timeRe);
      if (!m) return;
      var inicio = (m[1].length === 1 ? '0' : '') + m[1] + ':' + m[2];
      var fin = (m[3].length === 1 ? '0' : '') + m[3] + ':' + m[4];
      // normalizar 9:00 -> 09:00
      inicio = ('0' + inicio).slice(-5);
      fin = ('0' + fin).slice(-5);
      if (inicio.charAt(2) !== ':') {
        inicio = m[1].padStart(2, '0') + ':' + m[2];
        fin = m[3].padStart(2, '0') + ':' + m[4];
      }
      try {
        inicio = (m[1].length < 2 ? '0' + m[1] : m[1]) + ':' + m[2];
        fin = (m[3].length < 2 ? '0' + m[3] : m[3]) + ':' + m[4];
      } catch (e) {}
      var dia = nearestDiaByX(it.x, dayCols);
      if (dia < 0) return;
      times.push({ inicio: inicio, fin: fin, dia: dia, x: it.x, y: it.y, page: it.page });
    });

    // Materias: líneas en mayúsculas / nombres conocidos a la izquierda
    var materiaHints = items.filter(function (it) {
      var s = it.str.replace(/\s+/g, ' ').trim();
      if (s.length < 4) return false;
      if (timeRe.test(s)) return false;
      if (/^grupo/i.test(s)) return false;
      if (/^\d{5,}$/.test(s)) return false; // códigos / docs
      if (/^(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)$/i.test(s)) return false;
      // prefer text on the left side of page
      return it.x < (dayCols[0] != null ? dayCols[0] - 20 : 200);
    });

    function findMateriaNear(t) {
      var best = null, bestScore = 1e12;
      materiaHints.forEach(function (it) {
        if (it.page !== t.page) return;
        var dy = Math.abs(it.y - t.y);
        var score = dy + (it.x > t.x ? 80 : 0);
        if (score < bestScore && dy < 55) {
          bestScore = score;
          best = it;
        }
      });
      if (!best) return 'CLASE';
      // juntar fragmentos cercanos de la misma materia (misma y aprox)
      var parts = materiaHints.filter(function (it) {
        return it.page === best.page && Math.abs(it.y - best.y) < 14 && Math.abs(it.x - best.x) < 120;
      }).sort(function (a, b) { return a.x - b.x; });
      var name = parts.map(function (p) { return p.str; }).join(' ').replace(/\s+/g, ' ').trim();
      return name || best.str;
    }

    function findAulaNear(t) {
      var aulaRe = /^(LAB|CS|JG|LC|SVR|AULA|SALON|SALÓN)[\w\s\.\-\(\)]*$/i;
      var best = '';
      items.forEach(function (it) {
        if (it.page !== t.page) return;
        if (Math.abs(it.y - t.y) > 40) return;
        if (Math.abs(it.x - t.x) > 90) return;
        if (aulaRe.test(it.str.trim()) || /\d{3}/.test(it.str) && it.str.length < 28) {
          if (!timeRe.test(it.str) && !/^\d{6,}$/.test(it.str)) {
            best = it.str.trim();
          }
        }
      });
      return best;
    }

    function findGrupoNear(t, materiaY) {
      var g = '';
      items.forEach(function (it) {
        if (it.page !== t.page) return;
        var m = it.str.match(/Grupo\s*:\s*([A-Z0-9]+)/i);
        if (m && Math.abs(it.y - (materiaY || t.y)) < 70) g = m[1];
      });
      return g;
    }

    var slots = times.map(function (t) {
      var mat = findMateriaNear(t);
      return {
        materia: mat,
        grupo: findGrupoNear(t),
        dia: t.dia,
        inicio: t.inicio,
        fin: t.fin,
        aula: findAulaNear(t),
        docente: ''
      };
    });

    // dedupe
    var seen = {};
    return slots.filter(function (s) {
      var k = [s.dia, s.inicio, s.fin, s.materia].join('|');
      if (seen[k]) return false;
      seen[k] = 1;
      return true;
    }).sort(function (a, b) {
      return a.dia - b.dia || String(a.inicio).localeCompare(String(b.inicio));
    });
  }

  /** Fallback por texto plano si las coordenadas fallan. */
  function parseAcademusoftHorarioText(text) {
    var slots = [];
    if (!text) return slots;
    // Si el texto contiene el patrón del ejemplo GeoMetrics, usar demo estructurado
    // NO: eso mezclaría. Solo extraer tiempos genéricos sin día fiable → vacío
    var timeRe = /(\d{1,2}):(\d{2})\s*[-–—]\s*(\d{1,2}):(\d{2})/g;
    var count = 0;
    var m;
    while ((m = timeRe.exec(text)) && count < 40) {
      count++;
    }
    // sin columnas no asignamos días inventados
    return slots;
  }

  function renderPerfilHorarioSlots() {
    var box = $('perfilHorarioSlots');
    if (!box) return;
    var h = loadHorario();
    var slots = h.slots || [];
    if (!slots.length) {
      box.innerHTML = '<p class="login-hint" style="margin:0">Aún no hay clases en tu horario.</p>';
      return;
    }
    box.innerHTML = slots.map(function (s, i) {
      return '<div class="ph-slot" data-i="' + i + '">' +
        '<div><strong>' + esc(s.materia || 'Clase') + '</strong>' +
        '<span>' + esc(DIAS[s.dia] || '') + ' · ' + esc(s.inicio) + '–' + esc(s.fin) +
        (s.grupo ? (' · Grupo ' + esc(s.grupo)) : '') +
        (s.aula ? (' · ' + esc(s.aula)) : '') + '</span></div>' +
        '<button type="button" class="ph-del" data-del="' + i + '" title="Quitar">✕</button></div>';
    }).join('');
    box.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var i = +btn.getAttribute('data-del');
        var cur = loadHorario();
        cur.slots = (cur.slots || []).slice();
        cur.slots.splice(i, 1);
        cur.personal = true;
        cur.fromDefault = false;
        applyHorarioPayload(cur, 'Clase eliminada de tu horario.');
        renderPerfilHorarioSlots();
      });
    });
  }

  function processHorarioPdfFile(file) {
    toast('Leyendo PDF de Academusoft…');
    return fileToArrayBuffer(file).then(function (buf) {
      return extractPdfTextItems(buf).then(function (items) {
        var slots = parseAcademusoftHorarioItems(items);
        if (!slots.length) {
          // texto unido por si acaso
          var plain = items.map(function (it) { return it.str; }).join(' ');
          slots = parseAcademusoftHorarioText(plain);
        }
        return slots;
      });
    });
  }


  function applyHorarioPayload(h, msg) {
    h.personal = true;
    saveHorario(h);
    try { updatePerfilHorarioInfo(); } catch (e0) {}
    try { renderHorarioList(); } catch (e1) {}
    try { renderCalendar(); } catch (e2) {}
    try { renderCalendarView(); } catch (e3) {}
    try { renderNextClass(); } catch (e4) {}
    if (msg) toast(msg);
  }

  function bindPerfilHorarioBtn() {
    var btn = $('btnCargarHorario');
    var file = $('perfilHorarioFile');
    var btnDel = $('btnBorrarHorario');
    if (!btn || !file) return;

    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      try { file.value = ''; } catch (eV) {}
      file.click();
    };

    file.onchange = function () {
      var f = file.files && file.files[0];
      if (!f) return;
      if (!/\.pdf$/i.test(f.name) && !(f.type && String(f.type).indexOf('pdf') >= 0)) {
        toast('Sube el reporte de horario en PDF (Academusoft).');
        return;
      }
      processHorarioPdfFile(f).then(function (slots) {
        var h = loadHorario();
        h.fileName = f.name;
        h.fileData = '';
        h.personal = true;
        h.fromDefault = false;
        if (slots && slots.length) {
          h.slots = slots;
          applyHorarioPayload(h, 'Se extrajeron ' + slots.length + ' clases de tu PDF. Solo tu cuenta las ve.');
        } else {
          applyHorarioPayload(h, 'PDF guardado, pero no se detectaron clases. Verifica que sea el reporte Academusoft de horario.');
        }
        renderPerfilHorarioSlots();
      }).catch(function (err) {
        console.warn('PDF horario', err);
        toast('No se pudo leer el PDF. Intenta con otro archivo Academusoft.');
      });
    };

    if (btnDel) {
      btnDel.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var ok = window.confirm('¿Eliminar tu horario guardado (este PC y la nube)?\nPodrás cargar uno nuevo después.');
        if (!ok) return;
        var empty = emptyHorario();
        applyHorarioPayload(empty, 'Horario eliminado. Ya puedes cargar uno nuevo.');
        try { file.value = ''; } catch (e2) {}
        try {
          var path = horarioCloudPath();
          if (path && window.GeoCloud && window.GeoCloud.cloudSet) {
            window.GeoCloud.cloudSet(path, null);
          }
        } catch (e3) {}
      };
    }
  }

  function bindHorarioUI() {
    var file = $('avHorarioFile');
    var imp = $('avHorarioImport');
    var clr = $('avHorarioClear');
    var btnProf = $('avBtnAbrirPerfil');
    if (btnProf && !btnProf._avBound) {
      btnProf._avBound = true;
      btnProf.addEventListener('click', openEditProfile);
    }
    if (file && !file._avBound) {
      file._avBound = true;
      file.addEventListener('change', function () {
        var f = file.files && file.files[0];
        if (!f) return;
        if (f.type && f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
          toast('Sube un archivo PDF del horario.');
          return;
        }
        if (f.size > 8 * 1024 * 1024) {
          toast('El PDF supera 8 MB.');
          return;
        }
        var reader = new FileReader();
        reader.onload = function () {
          var h = loadHorario();
          h.fileName = f.name;
          h.fileData = ''; // PDF no se guarda en local (evita fallos por cuota)
          h.personal = true;
          h.fromDefault = false;
          toast('PDF personal guardado. Solo tú lo ves en este navegador/cuenta.');
          saveHorario(h);
          renderHorarioList();
          renderCalendar();
          renderCalendarView();
          renderNextClass();
        };
        reader.readAsDataURL(f);
      });
    }
    if (clr && !clr._avBound) {
      clr._avBound = true;
      clr.addEventListener('click', function () {
        saveHorario({ slots: [], fileName: '', fileData: '', personal: true, fromDefault: false });
        var fi = $('avHorarioFile');
        if (fi) fi.value = '';
        renderHorarioList();
        renderCalendar();
        renderCalendarView();
        renderNextClass();
        toast('Horario eliminado.');
      });
    }
  }


  function renderProfile() {
    var box = $('avProfileBox');
    var tools = $('avToolsLabs');
    var u = currentUser();
    if (box) {
      box.innerHTML = '<p><strong>' + esc(userDisplayName(u)) + '</strong></p>' +
        '<p class="av-meta">' + esc((u && u.email) || '') + ' · ' + esc((u && u.rol) || 'estudiante') + '</p>' +
        '<p class="av-meta">Materias: ' + esc(loadCourses().map(function (c) { return c.name; }).join(', ') || '—') + '</p>' +
        '<p class="av-meta" style="margin-top:8px">Usa <strong>Editar perfil</strong> para cambiar nombre, foto y datos académicos.</p>';
    }
    if (tools) renderLabsInto(tools);
    bindConverter();
    bindHorarioUI();
    renderHorarioList();
  }

  function bindConverter() {
    var a = $('avConvVal'), b = $('avConvFrom'), c = $('avConvTo'), o = $('avConvOut');
    if (!a || !b || !c || !o || a._bound) return;
    a._bound = true;
    function factor(u) {
      var length = { m: 1, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048 };
      var pressure = { kPa: 1, MPa: 1000, kg_cm2: 98.0665 };
      if (length[u] != null) return { t: 'L', f: length[u] };
      if (pressure[u] != null) return { t: 'P', f: pressure[u] };
      return null;
    }
    function run() {
      var v = parseFloat(a.value);
      var fa = factor(b.value), fb = factor(c.value);
      if (isNaN(v) || !fa || !fb) { o.textContent = '—'; return; }
      if (fa.t !== fb.t) { o.textContent = 'Unidades incompatibles'; return; }
      var res = v * fa.f / fb.f;
      o.textContent = v + ' ' + b.value + ' = ' + (Math.round(res * 1e6) / 1e6) + ' ' + c.value;
    }
    a.addEventListener('input', run);
    b.addEventListener('change', run);
    c.addEventListener('change', run);
    run();
  }


  function setView(name) {
    state.view = name;
    qsa('.av-nav button[data-av-view]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-av-view') === name);
    });
    qsa('.av-view').forEach(function (v) {
      v.classList.toggle('active', v.getAttribute('data-av-view') === name);
    });

    var isAula = (name === 'aula');
    var main = document.querySelector('#pantallaEstudiante .av-main') || document.querySelector('.av-main');
    if (main) {
      main.classList.toggle('av-has-secondary-view', !isAula);
    }

    // Fondo del aula SIEMPRE visible (cursos, calendario, tareas, etc.)
    var stage = $('avStage');
    if (stage) {
      stage.style.display = '';
      stage.removeAttribute('hidden');
    }

    // Controles solo del modo "Aula" (tablero / anuncios / barra inferior)
    var holo = $('avHologram');
    if (holo) holo.style.display = isAula ? '' : 'none';
    var qb = $('avQuickbar');
    if (qb) qb.style.display = isAula ? '' : 'none';
    var an = $('avAnnounce');
    if (an) an.style.display = isAula ? '' : 'none';
    // Próximas clases del centro solo en aula
    var nextMain = $('avNextClassMain');
    if (nextMain) nextMain.style.display = isAula ? '' : 'none';

    // Mensajes: conservar el panel derecho del aula (calendario, cursos, etc.)
    var side = $('avSide');
    var stage = $('avStage');
    if (side) side.style.display = '';
    if (stage) stage.style.gridColumn = '';

    if (name === 'tareas') renderTasksStudent();
    if (name === 'recursos') renderMaterialsStudent();
    if (name === 'cursos') renderCoursesView();
    if (name === 'inicio') renderHome();
    if (name === 'calendario') renderCalendarView();
    if (name === 'foros') renderForum();
    if (name === 'calificaciones') renderGrades();
    if (name === 'perfil') { renderProfile(); setTimeout(openEditProfile, 120); }
  }

  function renderHologram() {
    var c = courseById(state.courseId);
    if (!c) return;
    var title = $('avHoloTitle');
    var code = $('avHoloCode');
    var pct = $('avHoloPct');
    var bar = $('avHoloBar');
    if (title) title.textContent = c.name;
    if (code) code.textContent = c.code + (c.theme ? ' · ' + c.theme : '');
    if (pct) pct.textContent = c.progress + '% completado';
    if (bar) bar.style.width = c.progress + '%';
  }

  function parseHm(str) {
    try {
      var p = String(str || '00:00').split(':');
      return (+p[0]) * 60 + (+(p[1] || 0));
    } catch (e) { return 0; }
  }

  function fmtHmPretty(str) {
    var m = parseHm(str);
    var h = Math.floor(m / 60);
    var min = m % 60;
    var ap = h >= 12 ? 'p. m.' : 'a. m.';
    var h12 = h % 12;
    if (h12 === 0) h12 = 12;
    return h12 + ':' + (min < 10 ? '0' : '') + min + ' ' + ap;
  }

  /**
   * Próximas clases — SOLO las del mismo día.
   * Hoy: las que aún no terminaron. Si no queda ninguna → todas las del siguiente día con clases.
   */
  function renderNextClass() {
    var dayNodes = qsa('[data-av-next-day]');
    var statusNodes = qsa('[data-av-next-status]');
    var listNodes = qsa('[data-av-next-list]');
    // compat ids
    if ($('avNextDay') && dayNodes.indexOf($('avNextDay')) < 0) dayNodes.push($('avNextDay'));
    if ($('avNextStatus') && statusNodes.indexOf($('avNextStatus')) < 0) statusNodes.push($('avNextStatus'));
    if ($('avNextList') && listNodes.indexOf($('avNextList')) < 0) listNodes.push($('avNextList'));

    function setDay(txt) {
      dayNodes.forEach(function (el) { if (el) el.textContent = txt; });
    }
    function setStatus(txt, cls, show) {
      statusNodes.forEach(function (el) {
        if (!el) return;
        el.hidden = !show;
        el.textContent = txt || '';
        el.className = 'av-meta av-next-status' + (cls ? (' ' + cls) : '');
      });
    }
    function setList(html) {
      listNodes.forEach(function (el) { if (el) el.innerHTML = html; });
    }

    try {
      var h = loadHorario();
      var slots = (h.slots || []).filter(function (s) {
        return s && normalizeDia(s.dia) >= 0 && s.inicio;
      });
      if (!slots.length) {
        setDay('Sin horario');
        setStatus('', '', false);
        setList('<p class="av-next-empty">Toca tu nombre (arriba) y carga el PDF de Academusoft, o se usará el horario de ejemplo del documento base.</p>');
        return;
      }

      var now = new Date();
      var hoyMon0 = (now.getDay() + 6) % 7; // 0=Lunes
      var minsNow = now.getHours() * 60 + now.getMinutes();

      function startM(s) { return parseHm(s.inicio); }
      function endM(s) {
        var a = startM(s);
        var b = parseHm(s.fin);
        return b > a ? b : a + 60;
      }

      var byDay = [[], [], [], [], [], [], []];
      slots.forEach(function (s) {
        var d = normalizeDia(s.dia);
        if (d >= 0 && d <= 6) byDay[d].push(s);
      });
      byDay.forEach(function (arr) {
        arr.sort(function (a, b) { return startM(a) - startM(b); });
      });

      var chosenDelta = -1;
      var chosenDay = -1;
      var remaining = [];

      for (var delta = 0; delta < 7; delta++) {
        var dIdx = (hoyMon0 + delta) % 7;
        var daySlots = byDay[dIdx];
        if (!daySlots.length) continue;
        var pending = (delta === 0)
          ? daySlots.filter(function (s) { return endM(s) > minsNow; })
          : daySlots.slice();
        if (pending.length) {
          chosenDelta = delta;
          chosenDay = dIdx;
          remaining = pending;
          break;
        }
      }

      if (chosenDay < 0 || !remaining.length) {
        setDay('Sin clases próximas');
        setStatus('', '', false);
        setList('<p class="av-next-empty">No hay más clases en los próximos 7 días según el horario cargado.</p>');
        return;
      }

      var diaNombre = DIAS[chosenDay] || ('Día ' + chosenDay);
      var label = diaNombre;
      if (chosenDelta === 0) label = 'Hoy · ' + diaNombre;
      else if (chosenDelta === 1) label = 'Mañana · ' + diaNombre;
      setDay(label);

      var live = 0;
      if (chosenDelta === 0) {
        remaining.forEach(function (s) {
          if (minsNow >= startM(s) && minsNow < endM(s)) live++;
        });
      }
      if (live) setStatus('● ' + live + ' en curso · ' + remaining.length + ' hoy', 'en-curso', true);
      else if (chosenDelta === 0) setStatus('● ' + remaining.length + ' clase' + (remaining.length > 1 ? 's' : '') + ' por ver hoy', 'hoy', true);
      else setStatus(remaining.length + ' clase' + (remaining.length > 1 ? 's' : '') + ' · ' + diaNombre, '', true);

      setList(remaining.map(function (s) {
        var enCurso = (chosenDelta === 0 && minsNow >= startM(s) && minsNow < endM(s));
        return (
          '<div class="av-next-item' + (enCurso ? ' is-live' : '') + '">' +
            '<div class="av-next-item-top">' +
              '<strong>' + esc(s.materia || 'Clase') + '</strong>' +
              (enCurso ? '<span class="av-next-live">En curso</span>' : '') +
            '</div>' +
            '<div class="av-next-item-time">' + esc(fmtHmPretty(s.inicio)) + ' – ' + esc(fmtHmPretty(s.fin)) + '</div>' +
            '<div class="av-next-item-meta">' +
              esc((s.aula ? ('Aula ' + s.aula) : 'Aula —') + (s.grupo ? (' · Grupo ' + s.grupo) : '')) +
              (s.docente ? (' · ' + esc(s.docente)) : '') +
            '</div>' +
          '</div>'
        );
      }).join(''));

      var first = remaining[0];
      var name = $('avNextName');
      var theme = $('avNextTheme');
      var time = $('avNextTime');
      if (name) name.textContent = first.materia || '';
      if (theme) theme.textContent = 'Aula ' + (first.aula || '—');
      if (time) time.textContent = fmtHmPretty(first.inicio) + ' – ' + fmtHmPretty(first.fin);
    } catch (err) {
      console.warn('renderNextClass', err);
      setDay('Error');
      setStatus('', '', false);
      setList('<p class="av-next-empty">No se pudo calcular el horario. Revisa la consola o recarga el horario en el perfil.</p>');
    }
  }

  function findNextTask(materia) {
    try {
      if (typeof aulaLoad !== 'function') return null;
      var u = currentUser();
      var tareas = (aulaLoad(AULA_KEYS.tareas, []) || []).filter(function (t) {
        return (!materia || t.materia === materia) && studentSeesTask(t, u);
      });
      tareas.sort(function (a, b) {
        return String(a.fechaLimite || '9999').localeCompare(String(b.fechaLimite || '9999'));
      });
      return tareas[0] || null;
    } catch (e) { return null; }
  }

  function renderCourses() {
    var box = $('avCourseList');
    if (!box) return;
    var list = loadCourses();
    if (!state.courseId && list[0]) state.courseId = list[0].id;
    box.innerHTML = list.map(function (c) {
      return (
        '<div class="av-course-row" data-course="' + esc(c.id) + '" role="button" tabindex="0">' +
          '<span class="av-course-dot"></span>' +
          '<div class="av-course-info">' +
            '<strong>' + esc(c.name) + '<em>' + c.progress + '%</em></strong>' +
            '<div class="av-mini-bar"><span style="width:' + c.progress + '%"></span></div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
    qsa('[data-course]', box).forEach(function (el) {
      el.addEventListener('click', function () {
        state.courseId = el.getAttribute('data-course');
        renderHologram();
        renderNextClass();
        toast('Curso activo: ' + courseById(state.courseId).name);
      });
    });
  }

  function renderCoursesView() {
    var box = $('avViewCourses');
    if (!box) return;
    var list = loadCourses();
    box.innerHTML = list.map(function (c) {
      return (
        '<div class="av-tile" data-open-course="' + esc(c.id) + '">' +
          '<h4>' + esc(c.name) + '</h4>' +
          '<p>' + esc(c.code) + ' · ' + esc(c.theme || '') + '</p>' +
          '<p style="margin-top:8px;color:var(--av-soft)">' + c.progress + '% completado (entregas)</p>' +
        '</div>'
      );
    }).join('');
    qsa('[data-open-course]', box).forEach(function (el) {
      el.addEventListener('click', function () {
        state.courseId = el.getAttribute('data-open-course');
        renderHologram();
        renderNextClass();
        setView('aula');
      });
    });
  }

    function renderTasksStudent() {
    // Delega al renderer completo de aula.js (select + entrega + botones)
    try {
      if (typeof aulaRenderEstudiante === 'function') {
        aulaRenderEstudiante();
        return;
      }
    } catch (e) { console.warn(e); }
    var box = $('listaTareasEstudiante');
    if (!box) return;
    box.innerHTML = '<div class="av-empty">No se pudo cargar el listado de tareas.</div>';
  }

  function renderMaterialsStudent() {
    var box = $('listaPresEstudiante');
    if (!box || typeof aulaLoad !== 'function') return;
    var u = currentUser();
    var list = (aulaLoad(AULA_KEYS.presentaciones, []) || []).filter(function (p) {
      return studentSeesTask({ materia: p.materia, grupo: p.grupo }, u);
    });
    if (!list.length) {
      box.innerHTML = '<div class="av-empty">No hay materiales publicados todavía.</div>';
      return;
    }
    box.innerHTML = list.slice().reverse().map(function (p) {
      var dl = p.data
        ? '<a class="btn-descarga" download="' + esc(p.fileName || 'material') + '" href="' + p.data + '">Descargar</a>'
        : '';
      return '<div class="aula-item"><strong>' + esc(p.titulo) + '</strong>' +
        '<p>' + esc(p.materia) + ' · Grupo ' + esc(p.grupo || 'Todos') + '</p>' +
        '<div class="aula-item-acciones">' + dl + '</div></div>';
    }).join('');
  }

  function renderAnnounce() {
    var body = $('avAnnounceBody');
    if (!body) return;
    var u = currentUser();
    var tareas = [];
    try {
      if (typeof aulaLoad === 'function') {
        tareas = (aulaLoad(AULA_KEYS.tareas, []) || []).filter(function (t) { return studentSeesTask(t, u); });
      }
    } catch (e) {}
    if (tareas.length) {
      var t = tareas[tareas.length - 1];
      body.innerHTML =
        '<div class="av-announce-av">DOC</div>' +
        '<div><strong>' + esc(t.docenteNombre || 'Docente') + '</strong>' +
        '<p>Nueva tarea: ' + esc(t.titulo) + ' (' + esc(t.materia) + ').</p></div>';
    } else {
      body.innerHTML =
        '<div class="av-announce-av">GM</div>' +
        '<div><strong>GeoMetrics</strong>' +
        '<p>Cuando tu docente publique tareas o materiales, aparecerán aquí.</p></div>';
    }
  }

  function renderCalendar() {
    var grid = $('avCalGrid');
    var label = $('avCalLabel');
    if (!grid) return;
    var y = state.calYear;
    var m = state.calMonth;
    var months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    if (label) label.textContent = months[m] + ' ' + y;

    var eventDays = {};
    try {
      if (typeof aulaLoad === 'function') {
        var u = currentUser();
        (aulaLoad(AULA_KEYS.tareas, []) || []).forEach(function (t) {
          if (!studentSeesTask(t, u) || !t.fechaLimite) return;
          var parts = String(t.fechaLimite).split('-');
          if (parts.length >= 3 && +parts[0] === y && (+parts[1] - 1) === m) {
            eventDays[+parts[2]] = true;
          }
        });
      }
    } catch (e) {}
    try {
      var schMap = collectScheduleEventsForMonth(y, m);
      Object.keys(schMap).forEach(function (d) { eventDays[+d] = true; });
    } catch (eS) {}

    var first = new Date(y, m, 1);
    var startDow = (first.getDay() + 6) % 7;
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var prevDays = new Date(y, m, 0).getDate();
    var html = ['L','M','X','J','V','S','D'].map(function (d) {
      return '<div class="dow">' + d + '</div>';
    }).join('');
    for (var i = 0; i < startDow; i++) {
      html += '<div class="day muted">' + (prevDays - startDow + i + 1) + '</div>';
    }
    var today = new Date();
    for (var day = 1; day <= daysInMonth; day++) {
      var cls = 'day';
      if (y === today.getFullYear() && m === today.getMonth() && day === today.getDate()) cls += ' today';
      if (eventDays[day]) cls += ' event';
      html += '<div class="' + cls + '" data-day="' + day + '">' + day + '</div>';
    }
    var cells = startDow + daysInMonth;
    var tail = (7 - (cells % 7)) % 7;
    for (var t = 1; t <= tail; t++) html += '<div class="day muted">' + t + '</div>';
    grid.innerHTML = html;
  }

  function renderUser() {
    var u = currentUser();
    var nameEl = $('avUserName');
    var roleEl = $('avUserRole');
    var fb = $('avUserFb');
    if (nameEl) nameEl.textContent = userDisplayName(u);
    if (roleEl) roleEl.textContent = (u && u.rol === 'docente') ? 'Docente' : 'Estudiante';
    if (fb) fb.textContent = userInitials(u);
  }

  function bind() {
    // ===== Estudiante: delegación (siempre funciona, aunque se re-renderice el DOM) =====
    var est = $('pantallaEstudiante');
    if (est && !est._avDelegate) {
      est._avDelegate = true;
      est.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;

        // No interferir con el módulo de Mensajes (enviar, emojis, menús)
        if (t.closest('#faRootEstudiante, .fa-root, [data-ch-send], .fa-send, .fa-chat-input, .fa-emoji-btn, .fa-emoji-panel, .fa-composer')) {
          return;
        }

        // Navegación principal / quickbar
        var navBtn = t.closest('button[data-av-view], [data-av-view]');
        if (navBtn && est.contains(navBtn)) {
          var v = navBtn.getAttribute('data-av-view');
          if (v) {
            e.preventDefault();
            if (v === 'perfil') { openEditProfile(); return; }
            setView(v);
            return;
          }
        }

        // Links tipo "Ver todos"
        var link = t.closest('[data-av-view-link]');
        if (link && est.contains(link)) {
          e.preventDefault();
          setView(link.getAttribute('data-av-view-link'));
          return;
        }

        // Acciones del holograma / recursos
        var actEl = t.closest('[data-av-action]');
        if (actEl && est.contains(actEl)) {
          e.preventDefault();
          var act = actEl.getAttribute('data-av-action');
          if (act === 'biblioteca') {
            window.open('docs/Guia_detallada_ensayos_GeoMetrics.pdf', '_blank');
          } else if (act === 'guias' || act === 'temas') setView('recursos');
          else if (act === 'enlaces') {
            window.open('https://www.unipamplona.edu.co/unipamplona/portalIG/home_129/publicacion/publicado/', '_blank');
          } else if (act === 'actividades') setView('tareas');
          else if (act === 'evaluaciones') setView('calificaciones');
          else if (act === 'foros') setView('foros');
          else if (act === 'cursos') setView('cursos');
          else if (act === 'calendario') setView('calendario');
          else if (act === 'inicio') setView('inicio');
          else if (act === 'aula') setView('aula');
          return;
        }

        // Laboratorios
        var lab = t.closest('[data-lab]');
        if (lab && est.contains(lab)) {
          e.preventDefault();
          goToLab(lab.getAttribute('data-lab'));
          return;
        }

        // Curso activo (sidebar)
        var course = t.closest('[data-course]');
        if (course && est.contains(course)) {
          e.preventDefault();
          state.courseId = course.getAttribute('data-course');
          renderHologram();
          renderNextClass();
          try {
            var c = courseById(state.courseId);
            if (c) toast('Curso activo: ' + c.name);
          } catch (eC) {}
          return;
        }

        // Abrir curso desde vista Cursos
        var openC = t.closest('[data-open-course]');
        if (openC && est.contains(openC)) {
          e.preventDefault();
          state.courseId = openC.getAttribute('data-open-course');
          renderHologram();
          renderNextClass();
          setView('aula');
          return;
        }
      });
    }

    // Chip perfil
    var chip = $('avUserChip') || qs('.av-user-chip');
    if (chip && !chip._avBound) {
      chip._avBound = true;
      chip.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        openEditProfile();
      });
      chip.style.cursor = 'pointer';
    }

    // Mensajes → foros
    var msgBtn = qs('#pantallaEstudiante .av-icon-btn[aria-label="Mensajes"]');
    if (msgBtn && !msgBtn._avBound) {
      msgBtn._avBound = true;
      msgBtn.addEventListener('click', function (e) {
        e.preventDefault();
        setView('foros');
      });
    }

    // Calendario prev/next
    var prev = $('avCalPrev');
    var next = $('avCalNext');
    if (prev && !prev._avBound) {
      prev._avBound = true;
      prev.addEventListener('click', function () {
        state.calMonth--;
        if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
        renderCalendar();
        renderCalendarView();
      });
    }
    if (next && !next._avBound) {
      next._avBound = true;
      next.addEventListener('click', function () {
        state.calMonth++;
        if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
        renderCalendar();
        renderCalendarView();
      });
    }
    var prev2 = $('avCalPrev2');
    var next2 = $('avCalNext2');
    if (prev2 && !prev2._avBound) {
      prev2._avBound = true;
      prev2.addEventListener('click', function () {
        state.calMonth--;
        if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
        renderCalendar();
        renderCalendarView();
      });
    }
    if (next2 && !next2._avBound) {
      next2._avBound = true;
      next2.addEventListener('click', function () {
        state.calMonth++;
        if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
        renderCalendar();
        renderCalendarView();
      });
    }

    function goMenu() {
      hideAulaVirtual();
      if (typeof mostrarPantalla === 'function') {
        try { mostrarPantalla('menu'); } catch (err) {}
      }
    }
    var back = $('btnVolverEstudiante');
    if (back && !back._avBound) {
      back._avBound = true;
      back.addEventListener('click', function (e) { e.preventDefault(); goMenu(); });
    }
    var menuBtn = $('avBtnMenu');
    if (menuBtn && !menuBtn._avBound) {
      menuBtn._avBound = true;
      menuBtn.addEventListener('click', function (e) { e.preventDefault(); goMenu(); });
    }

    var backDoc = $('btnVolverDocente');
    if (backDoc && !backDoc._avBound) {
      backDoc._avBound = true;
      backDoc.addEventListener('click', function (e) {
        e.preventDefault();
        hideAulaVirtual();
        try {
          var pd = $('pantallaDocente');
          if (pd) {
            pd.classList.remove('av-doc-visible', 'av-doc-pro', 'av-docente');
            pd.style.cssText = '';
            pd.style.display = 'none';
            pd.setAttribute('hidden', '');
          }
        } catch (eH) {}
        if (typeof mostrarPantalla === 'function') {
          try { mostrarPantalla('menu'); } catch (err) {}
        }
      });
    }

    var forumSend = $('avForumSend');
    if (forumSend && !forumSend._avBound) {
      forumSend._avBound = true;
      /* forum → ForosAvisos */;
    }
    var forumMat = $('avForumMateria');
    if (forumMat && !forumMat._avBound) {
      forumMat._avBound = true;
      forumMat.addEventListener('change', renderForum);
    }

    var sideBtn = $('avToggleSide');
    var side = $('avSide');
    if (sideBtn && side && !sideBtn._avBound) {
      sideBtn._avBound = true;
      sideBtn.addEventListener('click', function () {
        side.classList.toggle('av-side-open');
      });
    }

    // Notificaciones
    try { if (typeof aulaBindNotifUI === 'function') aulaBindNotifUI(); } catch (eN) {}
  }

  function refreshAll() {
    var list = loadCourses();
    if (!state.courseId && list[0]) state.courseId = list[0].id;
    renderUser();
    renderHologram();
    renderNextClass();
    renderCourses();
    renderCalendar();
    renderAnnounce();
    renderCoursesView();
    if (state.view === 'tareas') renderTasksStudent();
    if (state.view === 'recursos') renderMaterialsStudent();
    if (state.view === 'inicio') renderHome();
    if (state.view === 'calendario') renderCalendarView();
    if (state.view === 'foros') renderForum();
    if (state.view === 'calificaciones') renderGrades();
    if (state.view === 'perfil') { /* solo modal */ }
    try {
      var u = currentUser();
      var tareas = (typeof aulaLoad === 'function' ? (aulaLoad(AULA_KEYS.tareas, []) || []) : []).filter(function (t) { return studentSeesTask(t, u); });
      var entregas = typeof aulaLoad === 'function' ? (aulaLoad(AULA_KEYS.entregas, []) || []) : [];
      var done = {};
      entregas.forEach(function (e) { if (u && e.estudianteId === u.id) done[e.tareaId] = true; });
      updateNotifBadge(tareas.filter(function (t) { return !done[t.id]; }).length);
    } catch (eN) {}
  }

  function showAulaVirtual() {
    var root = $('pantallaEstudiante');
    if (!root) return;
    if (!root.querySelector('.av-top')) {
      console.warn('[AulaVirtual] HTML del aula virtual no está en el DOM.');
      return;
    }
    qsa('main').forEach(function (m) {
      if (m.id !== 'pantallaEstudiante') {
        m.style.display = 'none';
        try { m.setAttribute('hidden', ''); } catch (e) {}
      }
    });
    root.classList.add('av-root', 'av-visible');
    root.removeAttribute('hidden');
    root.style.cssText = 'display:grid!important;position:fixed!important;inset:0!important;z-index:9999!important;visibility:visible!important;opacity:1!important;width:100%!important;height:100%!important;';
    try { bind(); } catch (eB) {}
    refreshAll();
    setView('aula');
    setTimeout(function () { try { renderNextClass(); } catch (e) {} }, 100);
    setTimeout(function () { try { renderNextClass(); } catch (e) {} }, 600);
    // Sincronizar horario desde la nube (útil en otro PC)
    setTimeout(function () {
      try {
        if (typeof syncHorarioFromCloud === 'function') syncHorarioFromCloud();
      } catch (eS) {}
    }, 400);
  }

  function hideAulaVirtual() {
    var root = $('pantallaEstudiante');
    if (!root) return;
    root.classList.remove('av-visible', 'av-root');
    root.style.cssText = '';
    root.style.display = 'none';
    try { root.setAttribute('hidden', ''); } catch (e) {}
  }

  function showDocentePanel() {
    var root = $('pantallaDocente');
    if (!root) return;
    qsa('main').forEach(function (m) {
      if (m.id !== 'pantallaDocente') {
        m.style.display = 'none';
        try { m.setAttribute('hidden', ''); } catch (e) {}
      }
    });
    root.classList.add('av-docente', 'av-doc-pro', 'av-doc-visible');
    root.removeAttribute('hidden');
    root.style.cssText = 'display:grid!important;grid-template-rows:56px 1fr!important;position:fixed!important;inset:0!important;z-index:9998!important;visibility:visible!important;opacity:1!important;width:100%!important;height:100%!important;background:#061426!important;';
    try {
      if (typeof aulaRenderDocente === 'function') aulaRenderDocente();
    } catch (e) { console.warn('aulaRenderDocente', e); }
    try {
      if (window.DocenteDashboard && typeof DocenteDashboard.bind === 'function') {
        DocenteDashboard.bind();
      }
      if (window.DocenteDashboard && typeof DocenteDashboard.setView === 'function') {
        DocenteDashboard.setView('dashboard');
      }
      if (window.DocenteDashboard && typeof DocenteDashboard.refresh === 'function') {
        DocenteDashboard.refresh();
      }
    } catch (e2) {}
    try { if (typeof aulaBindNotifUI === 'function') aulaBindNotifUI(); } catch (e3) {}
  }

  function init() {
    var root = $('pantallaEstudiante');
    if (!root || !root.querySelector('.av-top')) return;
    bind();
    refreshAll();

    var btnAula = $('btnAula');
    if (btnAula && !btnAula._avBound) {
      btnAula._avBound = true;
      btnAula.addEventListener('click', function () {
        var u = currentUser();
        if (u && u.rol === 'docente') {
          setTimeout(showDocentePanel, 40);
          setTimeout(showDocentePanel, 200);
          return;
        }
        setTimeout(showAulaVirtual, 50);
        setTimeout(showAulaVirtual, 200);
        setTimeout(showAulaVirtual, 500);
      });
    }

    try {
      var pe = $('pantallaEstudiante');
      if (pe && !pe._avObserver) {
        pe._avObserver = true;
        var obs = new MutationObserver(function () {
          if (pe.style.display && pe.style.display !== 'none' && pe.querySelector('.av-top') && !pe.classList.contains('av-visible')) {
            showAulaVirtual();
          }
        });
        obs.observe(pe, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
      }
      var pd = $('pantallaDocente');
      if (pd && !pd._avObserver) {
        pd._avObserver = true;
        var obs2 = new MutationObserver(function () {
          if (pd.style.display && pd.style.display !== 'none' && !pd.classList.contains('av-doc-visible')) {
            showDocentePanel();
          }
        });
        obs2.observe(pd, { attributes: true, attributeFilter: ['style', 'class', 'hidden'] });
      }
    } catch (eObs) {}

    try {
    window.bindPerfilHorarioBtn = bindPerfilHorarioBtn;
    window.syncHorarioFromCloud = syncHorarioFromCloud;
    window.saveHorario = saveHorario;
    window.loadHorario = loadHorario;
  } catch (eExp) {}
  window.GeoMetricsAulaVirtual = {
      show: showAulaVirtual,
      hide: hideAulaVirtual,
      showDocente: showDocentePanel,
      refresh: refreshAll,
      setView: setView,
      setCourse: function (id) {
        state.courseId = id;
        renderHologram();
        renderNextClass();
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  try {
    if (!window.__avNextTimer) {
      window.__avNextTimer = setInterval(function () {
        try { renderNextClass(); } catch (eT) {}
      }, 60000);
    }
  } catch (eT0) {}
})();
