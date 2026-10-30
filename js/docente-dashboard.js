/**
 * GeoMetrics — Panel Docente Pro
 * Dashboard UI, navegación y gráficos con datos reales de aula.js
 */
(function (global) {
  'use strict';

  function $(id) { return document.getElementById(id); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  var state = { view: 'dashboard' };

  function sessionUser() {
    try {
      if (typeof aulaGetSession === 'function') return aulaGetSession();
    } catch (e) {}
    return null;
  }


  var forosCalMonth = new Date();

  function renderForosSide() {
    try {
      var u = typeof aulaGetSession === 'function' ? aulaGetSession() : null;
      var coursesEl = document.getElementById('dpForosCourses');
      if (coursesEl) {
        var mats = [];
        try {
          if (u && typeof aulaMateriasUsuario === 'function') mats = aulaMateriasUsuario(u) || [];
        } catch (e0) {}
        if (!mats.length && u && u.materias) mats = u.materias;
        coursesEl.innerHTML = (mats || []).slice(0, 8).map(function (m) {
          var name = typeof m === 'string' ? m : (m.nombre || m.name || '');
          return '<div class="av-course-line"><i></i>' + (name || 'Curso') + '</div>';
        }).join('') || '<p class="av-muted">Sin cursos registrados</p>';
      }
      var title = document.getElementById('dpForosCalTitle');
      var todayLabel = document.getElementById('dpForosTodayLabel');
      var grid = document.getElementById('dpForosCalGrid');
      if (title && grid) {
        var y = forosCalMonth.getFullYear();
        var m = forosCalMonth.getMonth();
        var months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
        var weekdays = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
        var today = new Date();
        var todayText = weekdays[today.getDay()] + ', ' + today.getDate() + ' de ' + months[today.getMonth()].toLowerCase() + ' de ' + today.getFullYear();
        title.textContent = months[m] + ' ' + y;
        if (todayLabel) todayLabel.textContent = 'Hoy: ' + todayText;
        var first = new Date(y, m, 1);
        var start = (first.getDay() + 6) % 7; // Lunes=0
        var days = new Date(y, m + 1, 0).getDate();
        var html = '<div class="av-cal-hd">L</div><div class="av-cal-hd">M</div><div class="av-cal-hd">X</div><div class="av-cal-hd">J</div><div class="av-cal-hd">V</div><div class="av-cal-hd">S</div><div class="av-cal-hd">D</div>';
        for (var i = 0; i < start; i++) html += '<div class="av-cal-day muted" aria-hidden="true"></div>';
        for (var d = 1; d <= days; d++) {
          var isToday = today.getFullYear() === y && today.getMonth() === m && today.getDate() === d;
          var dateText = weekdays[new Date(y, m, d).getDay()] + ', ' + d + ' de ' + months[m].toLowerCase() + ' de ' + y;
          html += '<button type="button" class="av-cal-day' + (isToday ? ' today' : '') + '" data-dp-foros-day="' + d + '" aria-label="' + dateText + (isToday ? ', hoy' : '') + '"' + (isToday ? ' aria-current="date"' : '') + ' title="' + dateText + '">' + d + '</button>';
        }
        grid.innerHTML = html;
      }
      if (!document.body._dpForosCalBound) {
        document.body._dpForosCalBound = true;
        document.addEventListener('click', function (e) {
          var dayButton = e.target.closest('[data-dp-foros-day]');
          if (dayButton) {
            var picked = parseInt(dayButton.getAttribute('data-dp-foros-day'), 10);
            var pickedDate = new Date(forosCalMonth.getFullYear(), forosCalMonth.getMonth(), picked);
            var monthNames = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
            var weekdayNames = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
            var label = document.getElementById('dpForosTodayLabel');
            if (label) {
              var now = new Date();
              var isToday = pickedDate.getFullYear() === now.getFullYear() && pickedDate.getMonth() === now.getMonth() && pickedDate.getDate() === now.getDate();
              label.textContent = (isToday ? 'Hoy: ' : 'Fecha seleccionada: ') + weekdayNames[pickedDate.getDay()] + ', ' + picked + ' de ' + monthNames[pickedDate.getMonth()] + ' de ' + pickedDate.getFullYear();
            }
            return;
          }
          var b = e.target.closest('[data-dp-foros-cal]');
          if (!b) return;
          var delta = parseInt(b.getAttribute('data-dp-foros-cal'), 10) || 0;
          forosCalMonth.setMonth(forosCalMonth.getMonth() + delta);
          renderForosSide();
        });
      }
    } catch (e) { console.warn('renderForosSide', e); }
  }

  function setView(name) {
    if (name === 'foros') {
      try {
        var elD = document.getElementById('faRootDocente');
        if (elD && window.ForosAvisos && typeof ForosAvisos.mount === 'function') {
          ForosAvisos.mount(elD);
        } else if (window.ForosAvisos && typeof ForosAvisos.mount === 'function') {
          ForosAvisos.mount('faRootDocente');
        }
      } catch (eFa) { console.warn('mount docente chat', eFa); }
      try { renderForosSide(); } catch (eFs) {}
    }

    if (name === 'cursos') {
      /* vista cursos dedicada */
    } else if (name === 'mensajes') {
      name = 'entregas';
    }
    state.view = name;
    qsa('#pantallaDocente [data-dp-panel]').forEach(function (p) {
      p.classList.toggle('active', p.getAttribute('data-dp-panel') === name);
    });
    qsa('#pantallaDocente [data-dp-view]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-dp-view') === name);
    });
    qsa('#pantallaDocente [data-dp-nav]').forEach(function (b) {
      var n = b.getAttribute('data-dp-nav');
      var on = (n === name) || (n === 'cursos' && name === 'cursos') ||
        (n === 'dashboard' && name === 'dashboard') ||
        (n === 'estudiantes' && name === 'estudiantes');
      b.classList.toggle('active', on);
    });
    // Re-render lists according to the active panel
    try {
      if (name === 'dashboard' || name === 'analisis' || name === 'cursos') {
        refreshDashboardWidgets();
      }
      if (typeof aulaRenderDocente === 'function') {
        // Render all docente lists (tareas, entregas, estudiantes, material)
        aulaRenderDocente();
      }
      if (name === 'tareas' && typeof aulaRenderTareasDocente === 'function') {
        try { aulaRenderTareasDocente(); } catch (e1) {}
      }
      if (name === 'entregas' && typeof aulaRenderEntregasDocente === 'function') {
        try { aulaRenderEntregasDocente(); } catch (e2) {}
      }
      if (name === 'estudiantes' && typeof aulaRenderEstudiantes === 'function') {
        try { aulaRenderEstudiantes(); } catch (e3) {}
      }
      if (name === 'material' && typeof aulaRenderPresDocente === 'function') {
        try { aulaRenderPresDocente(); } catch (e4) {}
      }
    } catch (e) { console.warn(e); }
  }

  function displayNameNoEmail(u) {
    if (!u) return 'Docente';
    try {
      if (typeof userDisplayName === 'function') {
        var n0 = userDisplayName(u);
        if (n0 && String(n0).indexOf('@') < 0) return n0;
      }
    } catch (e) {}
    var pref = (u.preferenciaNombre || u.nombrePreferido || '').trim();
    if (pref && pref.indexOf('@') < 0) return pref;
    var full = ((u.nombres || '') + ' ' + (u.apellidos || '')).trim();
    if (full && full.indexOf('@') < 0) return full;
    var nom = (u.nombre || '').trim();
    if (nom && nom.indexOf('@') < 0) return nom;
    var email = String(u.email || '');
    if (email.indexOf('@') > 0) {
      var local = email.split('@')[0].replace(/[._]+/g, ' ').trim();
      if (local) return local.replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }
    return 'Docente';
  }

  function paintUser() {
    var u = sessionUser();
    var nameEl = $('dpUserName');
    var av = $('dpUserAv');
    var sub = $('docenteSubtitulo');
    var welcome = $('dpWelcomeInline');
    if (!u) return;
    var nom = displayNameNoEmail(u);
    if (nameEl) nameEl.textContent = nom;
    // Nunca poner el correo en el chip
    var chip = $('dpUserChip');
    if (chip) {
      chip.title = 'Mi cuenta · ' + nom;
      chip.setAttribute('aria-label', 'Cuenta de ' + nom);
    }
    if (av) {
      var avEl = $('dpUserAv');
      if (u.foto) {
        if (avEl && avEl.tagName === 'IMG') {
          avEl.src = String(u.foto);
        } else if (avEl) {
          avEl.outerHTML = '<img class="dp-user-av" id="dpUserAv" src="' + String(u.foto).replace(/"/g, '') + '" alt="">';
        }
      } else if (avEl) {
        if (avEl.tagName === 'IMG') {
          avEl.outerHTML = '<div class="dp-user-av" id="dpUserAv"></div>';
          avEl = $('dpUserAv');
        }
        var ini = (nom.split(/\s+/).map(function (w) { return w[0] || ''; }).join('').slice(0, 2) || 'D').toUpperCase();
        if (avEl) avEl.textContent = ini;
      }
    }
    var first = nom.split(/\s+/)[0] || 'Docente';
    if (sub) {
      sub.textContent = 'Estado actualizado según la actividad de tus grupos en GeoMetrics.';
    }
    if (welcome) welcome.textContent = '— Bienvenido/a, ' + first + '!';
  }

  function teacherMaterias(u) {
    var mats = [];
    if (u && Array.isArray(u.materiasDocente) && u.materiasDocente.length) {
      u.materiasDocente.forEach(function (m) {
        if (typeof m === 'string') mats.push({ nombre: m, grupo: '' });
        else if (m && m.nombre) mats.push({ nombre: m.nombre, grupo: m.grupo || m.grupos || '' });
      });
    }
    if (u && Array.isArray(u.materias) && !mats.length) {
      u.materias.forEach(function (m) {
        if (typeof m === 'string') mats.push({ nombre: m, grupo: '' });
        else if (m && (m.nombre || m.materia)) mats.push({ nombre: m.nombre || m.materia, grupo: m.grupo || '' });
      });
    }
    if (!mats.length) {
      ['Mecánica de Suelos I', 'Mecánica de Suelos II', 'Resistencia de Materiales', 'Diseño de Mezclas', 'Estructuras I'].forEach(function (n) {
        mats.push({ nombre: n, grupo: '' });
      });
    }
    return mats;
  }

  function loadKey(key, def) {
    try {
      if (typeof aulaLoad === 'function' && typeof AULA_KEYS !== 'undefined') {
        return aulaLoad(AULA_KEYS[key] || key, def);
      }
    } catch (e) {}
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : def;
    } catch (e2) { return def; }
  }

  function teacherData() {
    var u = sessionUser();
    if (!u) return { u: null, tareas: [], entregas: [], estudiantes: [], users: [] };
    var tareas = loadKey('tareas', []).filter(function (t) { return t && t.docenteId === u.id; });
    var entregas = loadKey('entregas', []);
    var taskIds = {};
    tareas.forEach(function (t) { taskIds[t.id] = t; });
    var misEntregas = entregas.filter(function (e) { return e && taskIds[e.tareaId]; });
    var users = loadKey('users', []);
    if (!users.length) {
      try {
        var raw = localStorage.getItem('geometrics_users');
        if (raw) users = JSON.parse(raw) || [];
      } catch (e) {}
    }
    var mats = teacherMaterias(u).map(function (m) { return String(m.nombre || '').toLowerCase(); });
    var estudiantes = users.filter(function (x) {
      if (!x || x.rol === 'docente') return false;
      var xm = x.materias || x.materiasEstudiante || [];
      if (!Array.isArray(xm)) return false;
      return xm.some(function (m) {
        var n = (typeof m === 'string' ? m : (m && (m.nombre || m.materia))) || '';
        return mats.indexOf(String(n).toLowerCase()) >= 0;
      });
    });
    return { u: u, tareas: tareas, entregas: misEntregas, estudiantes: estudiantes, users: users, taskIds: taskIds };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function daysAgoLabel(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '';
    var diff = Date.now() - d.getTime();
    var h = Math.floor(diff / 3600000);
    if (h < 1) return 'hace minutos';
    if (h < 24) return 'hace ' + h + ' h';
    var days = Math.floor(h / 24);
    if (days === 1) return 'ayer';
    return 'hace ' + days + ' d';
  }

  function renderCourses() {
    var data = teacherData();
    var box = $('dpCoursesList');
    var full = $('dpCoursesListFull');
    var mats = teacherMaterias(data.u);
    var html = mats.map(function (m) {
      var nombre = m.nombre || 'Curso';
      var estCount = data.estudiantes.filter(function (e) {
        var xm = e.materias || e.materiasEstudiante || [];
        return xm.some(function (mm) {
          var n = typeof mm === 'string' ? mm : (mm && (mm.nombre || mm.materia));
          return String(n).toLowerCase() === String(nombre).toLowerCase();
        });
      }).length;
      var tCount = data.tareas.filter(function (t) {
        return String(t.materia || '').toLowerCase() === String(nombre).toLowerCase();
      }).length;
      var pend = data.entregas.filter(function (e) {
        var t = data.taskIds[e.tareaId];
        return t && String(t.materia || '').toLowerCase() === String(nombre).toLowerCase() && (e.nota == null || e.nota === '');
      }).length;
      var pct = tCount ? Math.min(100, Math.round((estCount * 10 + tCount * 15) % 100)) : 0;
      // progress based on graded ratio if possible
      var related = data.entregas.filter(function (e) {
        var t = data.taskIds[e.tareaId];
        return t && String(t.materia || '').toLowerCase() === String(nombre).toLowerCase();
      });
      var graded = related.filter(function (e) { return e.nota != null && e.nota !== ''; }).length;
      if (related.length) pct = Math.round((graded / related.length) * 100);

      return '<div class="dp-course">' +
        '<div class="dp-course-top">' +
          '<div><strong>' + esc(nombre) + '</strong><br><small>' +
          esc(m.grupo ? ('Grupo ' + m.grupo) : 'Sin grupo fijo') + ' · ' + estCount + ' est. · ' + tCount + ' tareas' +
          (pend ? (' · ' + pend + ' por corregir') : '') +
          '</small></div>' +
          '<button type="button" class="dp-btn-sm" data-dp-view="tareas">Gestionar</button>' +
        '</div>' +
        '<div class="dp-progress"><span style="width:' + pct + '%"></span></div>' +
      '</div>';
    }).join('');
    if (!mats.length) html = '<p class="dp-empty">No hay materias en tu perfil docente.</p>';
    if (box) box.innerHTML = html;
    if (full) full.innerHTML = html || '<p class="dp-empty">Sin cursos.</p>';
  }

  function renderActivity() {
    var data = teacherData();
    var box = $('dpActivityList');
    if (!box) return;
    var events = [];
    data.entregas.slice().forEach(function (e) {
      var t = data.taskIds[e.tareaId] || {};
      var stu = data.users.find(function (x) { return x && x.id === e.estudianteId; });
      var nom = stu ? (((stu.nombres || '') + ' ' + (stu.apellidos || '')).trim() || stu.email) : (e.estudianteNombre || 'Estudiante');
      events.push({
        type: (e.nota != null && e.nota !== '') ? 'ok' : 'warn',
        title: (e.nota != null && e.nota !== '') ? 'Entrega calificada' : 'Nueva entrega',
        sub: nom + ' · ' + (t.titulo || t.materia || 'Tarea'),
        ts: e.fecha || e.creada || e.updatedAt || 0
      });
    });
    data.tareas.slice().forEach(function (t) {
      events.push({
        type: 'dot',
        title: 'Tarea publicada',
        sub: (t.titulo || '') + ' · ' + (t.materia || ''),
        ts: t.creada || t.fecha || 0
      });
    });
    events.sort(function (a, b) { return (b.ts || 0) - (a.ts || 0); });
    events = events.slice(0, 8);
    if (!events.length) {
      box.innerHTML = '<p class="dp-empty">Aún no hay actividad. Las entregas y publicaciones aparecerán aquí.</p>';
      return;
    }
    box.innerHTML = events.map(function (ev) {
      var cls = ev.type === 'warn' ? 'warn' : (ev.type === 'ok' ? 'ok' : '');
      return '<div class="dp-activity-item">' +
        '<div class="dp-dot ' + cls + '"></div>' +
        '<div><strong>' + esc(ev.title) + '</strong><span>' + esc(ev.sub) + '</span></div>' +
        '<time>' + esc(daysAgoLabel(ev.ts)) + '</time></div>';
    }).join('');
  }

  function renderPending() {
    var data = teacherData();
    var box = $('dpPendingTasks');
    if (!box) return;
    // group ungraded entregas by tarea
    var map = {};
    data.entregas.forEach(function (e) {
      if (e.nota != null && e.nota !== '') return;
      var t = data.taskIds[e.tareaId];
      if (!t) return;
      if (!map[t.id]) map[t.id] = { t: t, n: 0 };
      map[t.id].n++;
    });
    var rows = Object.keys(map).map(function (k) { return map[k]; });
    if (!rows.length) {
      box.innerHTML = '<p class="dp-empty">No hay entregas pendientes de calificar.</p>';
      return;
    }
    box.innerHTML = rows.slice(0, 6).map(function (r) {
      return '<div class="dp-course">' +
        '<div class="dp-course-top">' +
          '<div><strong>' + esc(r.t.titulo) + '</strong><br><small>' +
          esc(r.t.materia) + ' · ' + r.n + ' entrega(s) · límite ' + esc(r.t.fechaLimite || '—') +
          '</small></div>' +
          '<button type="button" class="dp-btn-sm" data-dp-view="entregas">Gestionar</button>' +
        '</div></div>';
    }).join('');
  }

  function renderEvents() {
    var data = teacherData();
    var box = $('dpEventsList');
    if (!box) return;
    var items = data.tareas.filter(function (t) { return t.fechaLimite; }).map(function (t) {
      return {
        date: t.fechaLimite,
        title: t.titulo || 'Tarea',
        sub: (t.materia || '') + (t.horaLimite ? (' · ' + t.horaLimite) : '')
      };
    });
    items.sort(function (a, b) { return String(a.date).localeCompare(String(b.date)); });
    var today = new Date().toISOString().slice(0, 10);
    items = items.filter(function (i) { return String(i.date) >= today; }).slice(0, 6);
    if (!items.length) {
      box.innerHTML = '<p class="dp-empty">Sin fechas límite próximas.</p>';
      return;
    }
    box.innerHTML = items.map(function (i) {
      var parts = String(i.date).split('-');
      var day = parts[2] || '—';
      var mon = parts[1] || '';
      return '<div class="dp-event">' +
        '<div class="dp-event-date"><b>' + esc(day) + '</b><span>' + esc(mon) + '</span></div>' +
        '<div><strong>' + esc(i.title) + '</strong><br><span style="color:var(--dp-muted);font-size:11px">' + esc(i.sub) + '</span></div>' +
        '</div>';
    }).join('');
  }

  function weekBuckets(items, dateField) {
    var days = [0, 0, 0, 0, 0, 0, 0]; // last 7 days index 0=oldest
    var now = new Date();
    now.setHours(23, 59, 59, 999);
    items.forEach(function (it) {
      var ts = it[dateField] || it.fecha || it.creada || it.updatedAt;
      if (!ts) return;
      var d = new Date(ts);
      if (isNaN(d.getTime())) return;
      var diff = Math.floor((now - d) / 86400000);
      if (diff >= 0 && diff < 7) {
        days[6 - diff] += 1;
      }
    });
    return days;
  }

  function drawLineChart(canvas, series, labels) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var w = canvas.width;
    var h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    var pad = 28;
    var max = 1;
    series.forEach(function (s) {
      s.data.forEach(function (v) { if (v > max) max = v; });
    });
    // grid
    ctx.strokeStyle = 'rgba(29,65,100,0.55)';
    ctx.lineWidth = 1;
    for (var g = 0; g < 4; g++) {
      var y = pad + ((h - pad * 2) * g) / 3;
      ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
    }
    function xAt(i, n) {
      return pad + ((w - pad * 2) * i) / Math.max(n - 1, 1);
    }
    function yAt(v) {
      return h - pad - ((h - pad * 2) * v) / max;
    }
    series.forEach(function (s) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      s.data.forEach(function (v, i) {
        var x = xAt(i, s.data.length);
        var y = yAt(v);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
      // glow points
      s.data.forEach(function (v, i) {
        var x = xAt(i, s.data.length);
        var y = yAt(v);
        ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fill();
      });
    });
    // labels
    ctx.fillStyle = '#8FA8C5';
    ctx.font = '10px system-ui';
    ctx.textAlign = 'center';
    labels.forEach(function (lb, i) {
      ctx.fillText(lb, xAt(i, labels.length), h - 8);
    });
  }

  function renderCharts() {
    var data = teacherData();
    var entregasW = weekBuckets(data.entregas, 'fecha');
    var tareasW = weekBuckets(data.tareas, 'creada');
    var labels = [];
    for (var i = 6; i >= 0; i--) {
      var d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'][d.getDay()]);
    }
    var empty = $('dpChartEmpty');
    var has = entregasW.some(function (v) { return v > 0; }) || tareasW.some(function (v) { return v > 0; });
    if (empty) empty.hidden = has;
    drawLineChart($('dpChartWeek'), [
      { color: '#00D9FF', data: entregasW },
      { color: '#A66CFF', data: tareasW }
    ], labels);
    drawLineChart($('dpChartPerf'), [
      { color: '#00D9FF', data: entregasW },
      { color: '#168BFF', data: tareasW }
    ], labels);

    // metrics
    var notes = data.entregas.map(function (e) { return parseFloat(e.nota); }).filter(function (n) { return !isNaN(n); });
    var avgEl = $('dpMetricAvg');
    var rateEl = $('dpMetricRate');
    var pendEl = $('dpMetricPending');
    if (avgEl) {
      avgEl.textContent = notes.length
        ? (notes.reduce(function (a, b) { return a + b; }, 0) / notes.length).toFixed(1)
        : '—';
    }
    var pend = data.entregas.filter(function (e) { return e.nota == null || e.nota === ''; }).length;
    if (pendEl) pendEl.textContent = String(pend);
    var est = Math.max(data.estudiantes.length, 1);
    var expected = data.tareas.length * est;
    if (rateEl) {
      rateEl.textContent = expected
        ? (Math.min(100, Math.round((data.entregas.length / expected) * 100)) + '%')
        : '—';
    }
  }

  function refreshDashboardWidgets() {
    paintUser();
    renderCourses();
    renderActivity();
    renderPending();
    renderEvents();
    renderCharts();
    // Badge de notificaciones reales (no redirigir por entregas pendientes)
    try {
      if (typeof aulaRefreshNotifBadges === 'function') aulaRefreshNotifBadges();
      else if (typeof aulaNotifUnreadCount === 'function') {
        var n = aulaNotifUnreadCount(sessionUser());
        var badge = $('dpNotifBadge');
        if (badge) {
          if (n > 0) { badge.hidden = false; badge.textContent = String(n); }
          else badge.hidden = true;
        }
      }
    } catch (eB) {}
  }

  function bind() {
    var root = $('pantallaDocente');
    if (!root) return;

    if (!root._dpDelegate) {
      root._dpDelegate = true;
      root.addEventListener('click', function (e) {
        var t = e.target;
        if (!t || !t.closest) return;

        // No interceptar la campana de notificaciones
        if (t.closest('#dpNotifWrap') || t.closest('#dpBtnNotif') || t.closest('#dpNotifPanel')) {
          return;
        }

        var viewBtn = t.closest('[data-dp-view]');
        if (viewBtn && root.contains(viewBtn) && !viewBtn.closest('#dpNotifWrap')) {
          e.preventDefault();
          var v = viewBtn.getAttribute('data-dp-view');
          if (v) setView(v);
          return;
        }

        var navBtn = t.closest('[data-dp-nav]');
        if (navBtn && root.contains(navBtn)) {
          e.preventDefault();
          var n = navBtn.getAttribute('data-dp-nav');
          if (n === 'inicio' || n === 'Inicio') n = 'dashboard';
          if (n) setView(n);
          return;
        }
      });
    }

    var chip = $('dpUserChip');
    if (chip && !chip._dpBound) {
      chip._dpBound = true;
      chip.addEventListener('click', function () {
        try {
          if (typeof aulaAbrirPerfil === 'function') aulaAbrirPerfil();
          else if (typeof openEditProfile === 'function') openEditProfile();
        } catch (e) {}
      });
    }
    var bp = $('dpBtnPerfil');
    if (bp && !bp._dpBound) {
      bp._dpBound = true;
      bp.addEventListener('click', function () {
        try {
          if (typeof aulaAbrirPerfil === 'function') aulaAbrirPerfil();
        } catch (e) {}
      });
    }

    // Notificaciones: solo panel (nunca navegar)
    var bn = $('dpBtnNotif');
    if (bn && !bn._dpNotifBound) {
      bn._dpNotifBound = true;
      bn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        try {
          if (typeof aulaToggleNotifPanel === 'function') {
            aulaToggleNotifPanel('dpNotifPanel', 'dpNotifList', 'dpNotifBadge');
          } else if (typeof aulaBindNotifUI === 'function') {
            aulaBindNotifUI();
            if (typeof aulaToggleNotifPanel === 'function') {
              aulaToggleNotifPanel('dpNotifPanel', 'dpNotifList', 'dpNotifBadge');
            }
          }
        } catch (err) { console.warn('notif', err); }
      }, true);
    }

    var search = $('dpSearch');
    if (search && !search._dpBound) {
      search._dpBound = true;
      search.addEventListener('input', function () {
        var q = (search.value || '').toLowerCase().trim();
        qsa('#pantallaDocente .aula-item, #pantallaDocente .dp-course, #pantallaDocente .av-doc-list > *').forEach(function (el) {
          if (!q) { el.style.display = ''; return; }
          var show = (el.textContent || '').toLowerCase().indexOf(q) >= 0;
          el.style.display = show ? '' : 'none';
        });
      });
    }

    try { if (typeof aulaBindNotifUI === 'function') aulaBindNotifUI(); } catch (eN) {}
  }

  // Hook after aulaRenderDocente
  var _orig = global.aulaRenderDocente;
  global.aulaRenderDocente = function () {
    if (typeof _orig === 'function') {
      try { _orig.apply(this, arguments); } catch (e) { console.warn(e); }
    }
    try {
      bind();
      refreshDashboardWidgets();
    } catch (e2) { console.warn('docente-dashboard', e2); }
  };

  global.DocenteDashboard = {
    setView: setView,
    refresh: refreshDashboardWidgets,
    bind: bind
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { bind(); });
  } else {
    bind();
  }
})(window);
