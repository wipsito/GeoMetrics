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

  function userDisplayName(u) {
    if (!u) return 'Estudiante';
    var n = ((u.nombres || '') + ' ' + (u.apellidos || '')).trim();
    return n || u.nombre || u.email || 'Estudiante';
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
    var sel = $('avForumMateria');
    var list = $('avForumList');
    if (!list) return;
    var courses = loadCourses();
    if (sel && !sel._filled) {
      sel.innerHTML = courses.map(function (c) {
        return '<option value="' + esc(c.name) + '">' + esc(c.name) + '</option>';
      }).join('') || '<option value="">General</option>';
      sel._filled = true;
    }
    var materia = (sel && sel.value) || (courses[0] && courses[0].name) || '';
    var posts = loadForum().filter(function (p) { return !materia || p.materia === materia; });
    if (!posts.length) {
      list.innerHTML = '<div class="av-empty">Sé el primero en publicar en este mural.</div>';
      return;
    }
    list.innerHTML = posts.slice().reverse().map(function (p) {
      return '<div class="aula-item"><strong>' + esc(p.autor || 'Usuario') + '</strong>' +
        '<p>' + esc(p.texto) + '</p>' +
        '<div class="aula-item-meta"><span>' + esc(p.materia || '') + '</span><span>' + esc((p.fecha || '').slice(0, 16).replace('T', ' ')) + '</span></div></div>';
    }).join('');
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
   * Horario base según docs/reporteHorario-ejemplo.pdf (Academusoft).
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
    if (s.indexOf('miercoles') === 0 || s.indexOf('miércoles') === 0 || s === 'mie') return 2;
    if (s.indexOf('jueves') === 0 || s === 'jue') return 3;
    if (s.indexOf('viernes') === 0 || s === 'vie') return 4;
    if (s.indexOf('sabado') === 0 || s.indexOf('sábado') === 0 || s === 'sab') return 5;
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
    return { slots: [], fileName: '', fileData: '', version: HORARIO_VERSION, personal: true, fromDefault: false };
  }

  /** ¿El set de slots es el horario de ejemplo de GeoMetrics (Andrés / PDF demo)? */
  function isDemoScheduleSlots(slots) {
    if (!slots || !slots.length) return false;
    var demo = HORARIO_ACADEMUSOFT_DEFAULT;
    if (slots.length !== demo.length) return false;
    var key = function (s) {
      return [normalizeDia(s.dia), s.inicio, s.fin, String(s.materia || '').toUpperCase()].join('|');
    };
    var a = slots.map(key).sort().join(';;');
    var b = demo.map(key).sort().join(';;');
    return a === b;
  }

  function loadHorario() {
    try {
      var key = horarioStorageKey();
      var raw = localStorage.getItem(key);
      if (!raw) {
        // Cada estudiante empieza vacío: NO hereda el horario de otra persona
        return emptyHorario();
      }
      var o = JSON.parse(raw);
      var ver = Number(o.version || 0);
      var slots = (Array.isArray(o.slots) ? o.slots : []).map(function (s) {
        return {
          materia: s.materia || '',
          grupo: s.grupo || '',
          dia: normalizeDia(s.dia),
          inicio: s.inicio || '',
          fin: s.fin || '',
          aula: s.aula || '',
          docente: s.docente || ''
        };
      }).filter(function (s) { return s.dia >= 0 && s.inicio; });

      // v6: dejar de compartir el horario demo entre cuentas
      // - Si se marcó fromDefault o nunca fue personal y coincide con el demo → limpiar
      // - Si el usuario ya tiene horario personal distinto del demo → conservarlo
      if (ver < HORARIO_VERSION) {
        var wasSharedDemo = !!(o.fromDefault) || (!o.personal && isDemoScheduleSlots(slots));
        if (wasSharedDemo) {
          slots = [];
          o.fileName = '';
          o.fileData = '';
          o.fromDefault = false;
        }
        var fixed = {
          slots: slots,
          fileName: o.fileName || '',
          fileData: o.fileData || '',
          version: HORARIO_VERSION,
          personal: true,
          fromDefault: false
        };
        try { localStorage.setItem(key, JSON.stringify(fixed)); } catch (eM) {}
        return fixed;
      }

      return {
        slots: slots,
        fileName: o.fileName || '',
        fileData: o.fileData || '',
        version: ver || HORARIO_VERSION,
        personal: o.personal !== false,
        fromDefault: !!o.fromDefault
      };
    } catch (e) {
      return emptyHorario();
    }
  }

  function saveHorario(data) {
    try {
      var payload = data || emptyHorario();
      payload.version = HORARIO_VERSION;
      payload.personal = true;
      if (payload.fromDefault == null) payload.fromDefault = false;
      if (Array.isArray(payload.slots)) {
        payload.slots = payload.slots.map(function (s) {
          return {
            materia: s.materia || '',
            grupo: s.grupo || '',
            dia: normalizeDia(s.dia),
            inicio: s.inicio || '',
            fin: s.fin || '',
            aula: s.aula || '',
            docente: s.docente || ''
          };
        }).filter(function (s) { return s.dia >= 0; });
      } else {
        payload.slots = [];
      }
      // Guardar SIEMPRE bajo la clave del usuario en sesión (email)
      localStorage.setItem(horarioStorageKey(), JSON.stringify(payload));
    } catch (e) {
      toast('No se pudo guardar el horario (almacenamiento lleno o bloqueado).');
    }
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
    if (!info) return;
    var h = loadHorario();
    if (h.fileName || (h.slots && h.slots.length)) {
      info.textContent = (h.fileName ? ('Archivo: ' + h.fileName) : 'Sin PDF') +
        (h.slots && h.slots.length ? (' · ' + h.slots.length + ' clases') : ' · sin clases aún') +
        ' · sincronizado por cuenta';
    } else {
      info.textContent = 'Sin horario. Usa «Cargar horario», «Ejemplo» o espera la sync de otro PC.';
    }
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
    var btnEj = $('btnEjemploHorario');
    if (!btn || !file) return;

    // Re-bind seguro cada vez que se abre el perfil
    btn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      try { file.value = ''; } catch (eV) {}
      file.click();
    };

    file.onchange = function () {
      var f = file.files && file.files[0];
      if (!f) return;
      if (f.type && f.type !== 'application/pdf' && !/\.pdf$/i.test(f.name)) {
        toast('Sube un archivo PDF del horario.');
        return;
      }
      if (f.size > 12 * 1024 * 1024) {
        toast('El PDF supera 12 MB. Usa un archivo más liviano.');
        return;
      }
      toast('Cargando horario…');
      var reader = new FileReader();
      reader.onerror = function () {
        toast('No se pudo leer el PDF. Intenta de nuevo.');
      };
      reader.onload = function () {
        try {
          var h = loadHorario();
          h.fileName = f.name;
          h.fileData = String(reader.result || '');
          h.personal = true;
          h.fromDefault = false;
          var isExample = /reportehorario-ejemplo|horario-ejemplo|ejemplo/i.test(f.name || '');
          if (isExample) {
            h.slots = cloneDefaultSlots();
            h.fromDefault = true;
            applyHorarioPayload(h, 'Ejemplo aplicado y sincronizado a la nube (solo tu cuenta).');
          } else {
            // PDF personal: conservar slots previos si existen; si no, dejar listo para ejemplo o nube
            if (!h.slots || !h.slots.length) {
              applyHorarioPayload(h, 'PDF guardado en tu cuenta. Si no ves clases, pulsa «Ejemplo» o sincroniza desde el otro PC.');
            } else {
              applyHorarioPayload(h, 'PDF actualizado. Tus clases se mantienen y se sincronizan.');
            }
          }
        } catch (err) {
          console.warn('perfil horario', err);
          toast('Error al guardar el horario.');
        }
      };
      reader.readAsDataURL(f);
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
        // borrar también en Firebase
        try {
          var path = horarioCloudPath();
          if (path && window.GeoCloud && window.GeoCloud.cloudSet) {
            window.GeoCloud.cloudSet(path, null);
          }
        } catch (e3) {}
      };
    }

    if (btnEj) {
      btnEj.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        var ok = window.confirm('¿Cargar el horario de EJEMPLO de GeoMetrics solo en TU cuenta?\nSe sincronizará a la nube para otros PCs con el mismo usuario.');
        if (!ok) return;
        var h = loadHorario();
        h.slots = cloneDefaultSlots();
        h.fileName = h.fileName || 'reporteHorario-ejemplo.pdf';
        h.fromDefault = true;
        h.personal = true;
        applyHorarioPayload(h, 'Ejemplo cargado y sincronizado (solo tu usuario).');
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
          h.fileData = String(reader.result || '');
          h.personal = true;
          h.fromDefault = false;
          var isExample = /reportehorario-ejemplo|horario-ejemplo|ejemplo/i.test(f.name || '');
          if (isExample) {
            h.slots = cloneDefaultSlots();
            h.fromDefault = true;
            toast('Ejemplo aplicado solo a tu usuario.');
          } else {
            toast('PDF personal guardado. Solo tú lo ves en este navegador/cuenta.');
          }
          saveHorario(h);
          renderHorarioList();
          renderCalendar();
          renderCalendarView();
          renderNextClass();
        };
        reader.readAsDataURL(f);
      });
    }
    if (imp && !imp._avBound) {
      imp._avBound = true;
      imp.addEventListener('click', function () {
        var ok = window.confirm(
          '¿Cargar el horario de EJEMPLO de GeoMetrics en TU cuenta?\n\n' +
          'Solo se guarda para el usuario con el que iniciaste sesión.\n' +
          'No modifica el horario de otros estudiantes.'
        );
        if (!ok) return;
        var h = loadHorario();
        h.slots = cloneDefaultSlots();
        h.fileName = h.fileName || 'reporteHorario-ejemplo.pdf';
        h.fromDefault = true;
        h.personal = true;
        saveHorario(h);
        renderHorarioList();
        renderCalendar();
        renderCalendarView();
        renderNextClass();
        toast('Ejemplo cargado solo en tu cuenta.');
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
    var stage = $('avStage');
    if (stage) stage.style.display = name === 'aula' ? '' : 'none';
    var holo = $('avHologram');
    if (holo) holo.style.display = name === 'aula' ? '' : 'none';
    var qb = $('avQuickbar');
    if (qb) qb.style.display = name === 'aula' ? '' : 'none';
    var an = $('avAnnounce');
    if (an) an.style.display = name === 'aula' ? '' : 'none';

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
    var box = $('listaTareasEstudiante');
    if (!box) return;
    // Prefer legacy renderer if available (rich badges / plazos)
    if (typeof aulaRenderEstudiante === 'function') {
      try {
        aulaRenderEstudiante();
        if (box.innerHTML && box.innerHTML.trim()) return;
      } catch (e) {}
    }
    var u = currentUser();
    if (typeof aulaLoad !== 'function') {
      box.innerHTML = '<div class="av-empty">Módulo de datos no disponible.</div>';
      return;
    }
    var tareas = (aulaLoad(AULA_KEYS.tareas, []) || []).filter(function (t) { return studentSeesTask(t, u); });
    var entregas = aulaLoad(AULA_KEYS.entregas, []) || [];
    var doneMap = {};
    entregas.forEach(function (e) {
      if (u && e.estudianteId === u.id) doneMap[e.tareaId] = true;
    });
    if (!tareas.length) {
      box.innerHTML = '<div class="av-empty">Aún no hay tareas publicadas para tus materias/grupos.</div>';
      return;
    }
    box.innerHTML = tareas.slice().reverse().map(function (t) {
      var done = !!doneMap[t.id];
      var badge = done ? '<span class="badge-ok">Entregada</span>' : '<span class="badge-pend">Pendiente</span>';
      return '<div class="aula-item aula-item-task">' +
        '<div class="aula-item-top"><strong>' + esc(t.titulo) + '</strong>' + badge + '</div>' +
        '<p>' + esc(t.descripcion || '') + '</p>' +
        '<div class="aula-item-meta">' +
        '<span>' + esc(t.materia) + '</span>' +
        '<span>Grupo ' + esc(t.grupo || 'Todos') + '</span>' +
        '<span>Prof. ' + esc(t.docenteNombre || '—') + '</span>' +
        (t.fechaLimite ? '<span>Límite ' + esc(t.fechaLimite) + (t.horaLimite ? ' ' + esc(t.horaLimite) : '') + '</span>' : '') +
        '</div></div>';
    }).join('');
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
    qsa('.av-nav button[data-av-view]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var v = btn.getAttribute('data-av-view');
        if (v === 'perfil') {
          openEditProfile();
          return;
        }
        setView(v);
      });
    });
    qsa('.av-quickbar button[data-av-view]').forEach(function (btn) {
      btn.addEventListener('click', function () { setView(btn.getAttribute('data-av-view')); });
    });

    // Nombre / avatar a la derecha → abre el mismo modal de perfil
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

    qsa('[data-av-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var act = btn.getAttribute('data-av-action');
        if (act === 'biblioteca') {
          window.open('docs/Guia_detallada_ensayos_GeoMetrics.pdf', '_blank');
        } else if (act === 'guias') setView('recursos');
        else if (act === 'enlaces') window.open('https://www.unipamplona.edu.co/unipamplona/portalIG/home_129/publicacion/publicado/', '_blank');
        else if (act === 'temas') setView('recursos');
        else if (act === 'actividades') setView('tareas');
        else if (act === 'evaluaciones') setView('calificaciones');
        else if (act === 'foros') setView('foros');
      });
    });

    var prev = $('avCalPrev');
    var next = $('avCalNext');
    if (prev) prev.addEventListener('click', function () {
      state.calMonth--;
      if (state.calMonth < 0) { state.calMonth = 11; state.calYear--; }
      renderCalendar();
    });
    if (next) next.addEventListener('click', function () {
      state.calMonth++;
      if (state.calMonth > 11) { state.calMonth = 0; state.calYear++; }
      renderCalendar();
    });

    function goMenu() {
      hideAulaVirtual();
      if (typeof mostrarPantalla === 'function') {
        try { mostrarPantalla('menu'); } catch (err) {}
      }
    }
    var back = $('btnVolverEstudiante');
    if (back) back.addEventListener('click', function (e) { e.preventDefault(); goMenu(); });
    var menuBtn = $('avBtnMenu');
    if (menuBtn) menuBtn.addEventListener('click', goMenu);

    var backDoc = $('btnVolverDocente');
    if (backDoc && !backDoc._avBound) {
      backDoc._avBound = true;
      backDoc.addEventListener('click', function () {
        var root = $('pantallaDocente');
        if (root) {
          root.classList.remove('av-doc-visible');
          root.style.display = 'none';
        }
        if (typeof mostrarPantalla === 'function') {
          try { mostrarPantalla('menu'); } catch (e) {}
        }
      });
    }

    var forumSend = $('avForumSend');
    if (forumSend && !forumSend._avBound) {
      forumSend._avBound = true;
      forumSend.addEventListener('click', postForum);
    }
    var forumMat = $('avForumMateria');
    if (forumMat && !forumMat._avBound) {
      forumMat._avBound = true;
      forumMat.addEventListener('change', renderForum);
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
    var sideBtn = $('avToggleSide');
    var side = $('avSide');
    if (sideBtn && side && !sideBtn._avBound) {
      sideBtn._avBound = true;
      sideBtn.addEventListener('click', function () {
        side.classList.toggle('av-side-open');
      });
    }
    qsa('[data-av-view-link]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        setView(a.getAttribute('data-av-view-link'));
      });
    });
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
    root.classList.add('av-docente', 'av-doc-visible');
    root.removeAttribute('hidden');
    root.style.cssText = 'display:block!important;position:fixed!important;inset:0!important;z-index:9998!important;visibility:visible!important;opacity:1!important;';
    try {
      if (typeof aulaRenderDocente === 'function') aulaRenderDocente();
    } catch (e) { console.warn('aulaRenderDocente', e); }
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

    window.GeoMetricsAulaVirtual = {
      show: showAulaVirtual,
      hide: hideAulaVirtual,
      showDocente: showDocentePanel,
      refresh: refreshAll,
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
