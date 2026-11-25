/**
 * GeoMetrics — DISEÑO INMERSIVO de los simuladores 3D.
 *
 * Reacomoda el visor 3D como un laboratorio a pantalla completa:
 *   · cabecera (volver, ensayo, normas, vistas 3D/Frontal/Lateral/Detalle, cronómetro, reiniciar, pantalla completa, ficha, usuario)
 *   · riel + panel izquierdo (Parámetros · Equipo · Ficha y pasos · ir a Resultados)
 *   · monitor holográfico (avance, lecturas y gráfica de la variable principal)
 *   · tarjeta «Resultado del ensayo» en vivo
 *   · barra inferior del tutor con el paso a paso (‹ / Siguiente) y los pasos numerados
 *   · etiquetas de las piezas con línea guía y cubo de orientación
 * No modifica las máquinas ni la lógica: mueve y re-estiliza los elementos que ya crean lab3d-ensayos, lab3d-pro y
 * lab3d-estudiante (tutor). Cargar después de lab3d-estudiante.js.
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D;
    if (!L3 || !L3.mount || L3.__inm) return;
    L3.__inm = true;
    var doc = document;

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function num(v) { var n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.')); return isFinite(n) ? n : null; }

    var ICO = {
        param: '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>',
        capas: '<svg viewBox="0 0 24 24"><path d="M12 3 2 8l10 5 10-5-10-5zM2 13l10 5 10-5M2 17.5l10 5 10-5"/></svg>',
        ficha: '<svg viewBox="0 0 24 24"><path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11"/></svg>',
        graf: '<svg viewBox="0 0 24 24"><path d="M4 4v16h16M7 15l4-4 3 3 5-6"/></svg>',
        back: '<svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7"/></svg>',
        reloj: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
        reset: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 0 1 14-5.3L20 8M20 4v4h-4M20 12a8 8 0 0 1-14 5.3L4 16M4 20v-4h4"/></svg>',
        full: '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>',
        info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8h.01"/></svg>',
        cerrar: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
        izq: '<svg viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
    };

    /* nombres cortos de las etapas para la barra de pasos */
    var CORTOS = {
        corte: ['Tallado', 'Medidas', 'Montaje', 'Carga normal', 'Corte', 'Lecturas', 'Esfuerzos', 'Resistencia', 'c y φ'],
        inconfinada: ['Tallado', 'Medidas', 'Montaje', 'Carga', 'Lecturas', 'Deformación', 'Esfuerzo', 'qu y cu'],
        consolidacion: ['Tallado', 'Altura H₀', 'Edómetro', 'Asiento', 'Cargas', 'Lecturas', 'Vacíos e', 'Cc y σ′p'],
        triaxial: ['Probeta', 'Membrana', 'Cámara', 'Confinamiento', 'Consolidar', 'Drenaje', 'Carga', 'Lecturas', 'Mohr'],
        humedad: ['Tara', 'Muestra', 'Masa húmeda', 'Secado', 'Masa seca'],
        granulometria: ['Muestra', 'Tamices', 'Carga', 'Tamizado', 'Retenidos'],
        limites: ['Suelo', 'Agua', 'Amasado', 'Copa', 'Ranura', 'Golpes', 'Humedad'],
        gravedad: ['Suelo seco', 'Llenado', 'Peso Wpw', 'Suelo', 'Vacío', 'Aforo', 'Peso Wpws'],
        compactacion: ['Porciones', 'Agua', 'Curado', 'Compactar', 'Pesaje'],
        densidad: ['Frasco', 'Placa', 'Excavación', 'Cono', 'Arena', 'Pesaje'],
        clasificacion: ['Tamizado', 'Límites', 'Granulometría', 'Plasticidad', 'SUCS'],
        permeabilidad: ['Muestra', 'Saturación', 'Flujo', 'Caudal', 'Cálculo k'],
        traccion: ['Elástica', 'Fluencia', 'Estricción', 'Fractura'],
        compresion: ['Carga', 'Falla', 'Post-pico'],
        flexion: ['Carga', 'Rotura'],
        torsion: ['Elástica', 'Fluencia', 'Fractura'],
        dureza: ['Precarga', 'Carga mayor', 'Mantener', 'Retiro', 'Lectura'],
        dm_rev: ['Llenado', 'Levantar cono', 'Asentamiento', 'Medición'],
        dm_comp: ['Carga', 'Pico', 'Falla', 'Registro'],
        dm_aci: ['f′cr', 'Agua y aire', 'a/c', 'Cemento', 'Grava', 'Arena', 'Proporciones'],
        dm_agg: ['Tolvas', 'Proporciones', 'Óptimo', 'Resultado'],
        dm_gran: ['Muestra', 'Tamizado', 'Retenidos', 'Módulo finura'],
        dm_punit: ['Tara', 'Llenado', 'Enrasado', 'Pesaje', 'Cálculo'],
        dm_hum: ['Masa húmeda', 'Secado', 'Masa seca', 'Cálculo'],
        dm_fresco: ['Llenado', 'Peso unitario', 'Tapa', 'Aire', 'Resultados']
    };

    /* equipo resaltado en cada etapa (índices de meta.parts) cuando la máquina no lo define */
    var FOCO = {
        /* 0 horno · 1 panel · 2 recipiente · 3 muestra · 4 balanza · 5 puerta y bandeja */
        humedad: [[4, 2], [3, 2, 4], [4, 2, 3], [0, 1, 5], [4, 2, 3]]
    };

    var baseMount = L3.mount;
    L3.mount = function (host, tipo) {
        var handle = baseMount.apply(this, arguments);
        if (handle && handle.instance && L3.meta[tipo]) esperar(handle.instance, host, tipo);
        return handle;
    };

    function esperar(inst, host, tipo) {
        var t0 = performance.now();
        (function w() {
            if (inst.disposed) return;
            var lab = host.querySelector('.lab3d'), dt = performance.now() - t0;
            if (inst.ready && lab && (lab.__pro || dt > 4000) && (host.querySelector('.tt-tutor') || dt > 4000)) {
                try { armar(inst, host, tipo, lab); } catch (e) { console.warn('Diseño 3D inmersivo', e); }
                return;
            }
            if (dt < 25000) setTimeout(w, 120);
        })();
    }

    function armar(inst, host, tipo, lab) {
        if (lab.__inm) return; lab.__inm = true;
        /* el visor sale al nivel de <body> mientras está abierto: así ningún contenedor de la página (con transformaciones o
           capas propias) lo recorta ni le pinta encima el encabezado de la app. Al salir vuelve a su sitio. */
        var marca = doc.createComment('visor-3d');
        lab.parentNode.insertBefore(marca, lab);
        lab.classList.add('lab3d-inm');
        doc.body.appendChild(lab);
        var pinta = [];   /* repintado de los valores de los parámetros */
        var meta = L3.meta[tipo], stage = lab.querySelector('.lab3d-stage');
        var q = function (s) { return lab.querySelector(s); };
        var phases = meta.phases || [];
        var shell = host.closest ? host.closest('.simhub-shell') : null;
        var GG = global.GeoGuia, al = { dm_rev: 'rev', dm_comp: 'comp', dm_aci: 'aci', dm_agg: 'agg' };
        var gmeta = GG && GG.data && (GG.data[tipo] || GG.data[al[tipo]]) ? (GG.data[tipo] || GG.data[al[tipo]]).meta : null;
        var titulo = (shell && shell.querySelector('.simhub-phero h2') && shell.querySelector('.simhub-phero h2').textContent) || (gmeta && gmeta.n) || meta.machine;
        var curso = shell && shell.querySelector('.simhub-crumbs span') ? shell.querySelector('.simhub-crumbs span').textContent : '';
        var normas = String(meta.norma || '').split(/·|,|\//).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 3);

        /* ---------------- cabecera ---------------- */
        var top = el('div', 'inm-top');
        top.innerHTML =
            '<div class="inm-id">' +
              '<button type="button" class="inm-ib inm-back" title="Volver a los simuladores" aria-label="Volver">' + ICO.back + '</button>' +
              '<div class="inm-tit"><b>' + esc(titulo) + '</b><span>Simulador 3D' + (curso ? ' · ' + esc(curso) : '') + '</span></div>' +
              '<div class="inm-badges">' + normas.map(function (n) { return '<i>' + esc(n) + '</i>'; }).join('') + '</div>' +
            '</div>' +
            '<div class="inm-right">' +
              '<span class="inm-crono" title="Tiempo del ensayo en marcha">' + ICO.reloj + '<b>00:00:00</b></span>' +
              '<button type="button" class="inm-ib inm-2d" title="Cambiar al simulador 2D" aria-label="Cambiar al simulador 2D">2D</button>' +
              '<button type="button" class="inm-ib inm-rst" title="Reiniciar la vista" aria-label="Reiniciar la vista">' + ICO.reset + '</button>' +
              '<button type="button" class="inm-ib inm-full" title="Pantalla completa" aria-label="Pantalla completa">' + ICO.full + '</button>' +
              '<button type="button" class="inm-ib inm-inf" title="Ficha de la máquina" aria-label="Ficha de la máquina">' + ICO.info + '</button>' +
              '<span class="inm-user"></span>' +
            '</div>';
        stage.appendChild(top);
        var back = shell && shell.querySelector('.simhub-back');
        if (back) top.querySelector('.inm-back').addEventListener('click', function () { salir(); back.click(); });
        else top.querySelector('.inm-back').hidden = true;
        top.querySelector('.inm-rst').addEventListener('click', function () { var hb3 = q('.lab3d-views [data-view="home"]'); if (hb3) hb3.click(); });
        var b2d = shell && shell.querySelector('.simhub-mode [data-mode="2d"], .simhub-mode [data-dm-mode="2d"]');
        if (b2d) top.querySelector('.inm-2d').addEventListener('click', function () { salir(); b2d.click(); }); else top.querySelector('.inm-2d').hidden = true;
        top.querySelector('.inm-full').addEventListener('click', function () {
            var fe = doc.fullscreenElement || doc.webkitFullscreenElement;
            if (fe) (doc.exitFullscreen || doc.webkitExitFullscreen).call(doc);
            else if (stage.requestFullscreen) stage.requestFullscreen(); else if (stage.webkitRequestFullscreen) stage.webkitRequestFullscreen();
        });
        /* ---- usuario: foto de perfil y el MISMO menú del Centro de aprendizaje (perfil, aula, admin, cerrar sesión) ---- */
        var uBox = top.querySelector('.inm-user'), ultFoto = null;
        function pintarUsuario() {
            var u = null, foto = '', ini = '?';
            try { u = typeof global.aulaGetSession === 'function' ? global.aulaGetSession() : null; } catch (e) { }
            if (u) {
                try { foto = (typeof global.aulaFotoUsuario === 'function' ? global.aulaFotoUsuario(u) : '') || u.foto || u.photoURL || ''; } catch (e2) { }
                var nom = String(u.nombres || u.nombre || u.email || '').trim();
                ini = nom.split(/\s+/).slice(0, 2).map(function (p) { return p.charAt(0); }).join('').toUpperCase() || '?';
            } else {
                var av = doc.getElementById('menuUserAvatar'); if (av) ini = (av.textContent || '?').trim();
            }
            var clave = foto + '|' + ini; if (clave === ultFoto) return; ultFoto = clave;
            uBox.style.backgroundImage = foto ? 'url("' + String(foto).replace(/"/g, '%22') + '")' : '';
            uBox.style.backgroundSize = 'cover'; uBox.style.backgroundPosition = 'center';
            uBox.textContent = foto ? '' : ini;
            uBox.hidden = !u && ini === '?';
        }
        pintarUsuario();
        uBox.setAttribute('role', 'button'); uBox.setAttribute('tabindex', '0');
        uBox.setAttribute('aria-label', 'Menú de usuario'); uBox.setAttribute('aria-haspopup', 'true'); uBox.setAttribute('aria-expanded', 'false');
        uBox.title = 'Tu perfil, tu aula y cerrar sesión';
        var uMenu = el('div', 'inm-umenu'); uBox.parentNode.insertBefore(uMenu, uBox); uMenu.appendChild(uBox);
        var DD = doc.getElementById('menuUserDropdown'), casaDD = doc.getElementById('menuUserMenu');
        function cerrarMenuU() { if (DD) DD.hidden = true; }
        if (DD && casaDD) {
            /* cuando el menú se cierra, vuelve a su sitio en el Centro de aprendizaje */
            new MutationObserver(function () {
                if (DD.hidden && DD.parentNode === uMenu) { casaDD.appendChild(DD); uBox.setAttribute('aria-expanded', 'false'); }
            }).observe(DD, { attributes: true, attributeFilter: ['hidden'] });
            /* Mi aula, Administrador y Cerrar sesión salen del simulador; Editar perfil se abre encima */
            DD.addEventListener('click', function (e) {
                if (DD.parentNode !== uMenu) return;
                var it = e.target.closest && e.target.closest('#btnAula,#btnAdminPanel,#btnCerrarSesion');
                if (!it) return;
                salir(); if (back) back.click();
            }, true);
        }
        function abrirMenuU(e) {
            if (e) { e.preventDefault(); e.stopPropagation(); }
            if (!DD) return;
            if (!DD.hidden && DD.parentNode === uMenu) { cerrarMenuU(); return; }
            uMenu.appendChild(DD); DD.hidden = false; uBox.setAttribute('aria-expanded', 'true');
        }
        uBox.addEventListener('click', abrirMenuU);
        uBox.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') abrirMenuU(e); });

        /* pestañas de vista: el botón ⌂ pasa a llamarse «3D» */
        var views = q('.lab3d-views');
        if (views) { var hb = views.querySelector('[data-view="home"]'); if (hb) { hb.textContent = '3D'; hb.title = 'Vista general 3D'; } }

        /* ---------------- riel + panel izquierdo ---------------- */
        var rail = el('nav', 'inm-rail');
        rail.setAttribute('aria-label', 'Herramientas del simulador');
        var TABS = [
            { k: 'param', t: 'Parámetros', s: 'Datos de la muestra' },
            { k: 'capas', t: 'Equipo', s: 'Componentes y despiece' },
            { k: 'ficha', t: 'Ficha y paso a paso', s: meta.machine },
            { k: 'graf', t: 'Gráficas y resultados', s: 'Tabla, curvas e interpretación' }
        ];
        rail.innerHTML = TABS.map(function (t) { return '<button type="button" data-k="' + t.k + '" title="' + esc(t.t) + '" aria-label="' + esc(t.t) + '">' + ICO[t.k] + '</button>'; }).join('');
        var panel = el('aside', 'inm-panel');
        panel.innerHTML = '<div class="inm-phead"><div><b></b><span></span></div><button type="button" class="inm-ib inm-pclose" aria-label="Cerrar panel">' + ICO.cerrar + '</button></div>' +
            '<div class="inm-pbody"><section data-k="param"></section><section data-k="capas"></section><section data-k="ficha"></section><section data-k="graf"></section></div>';
        stage.appendChild(rail); stage.appendChild(panel);
        var secParam = panel.querySelector('[data-k="param"]'), secCapas = panel.querySelector('[data-k="capas"]'), secFicha = panel.querySelector('[data-k="ficha"]');
        var pBox = lab.querySelector('.p3-params');
        if (pBox) { secParam.appendChild(pBox); compactar(pBox); }
        else secParam.innerHTML = '<p class="inm-vacio">Este ensayo usa los datos del simulador 2D; no tiene parámetros editables aquí.</p>';
        var info = q('.lab3d-info');
        if (info) {
            var tools = info.querySelector('.p3-tools'), h5s = info.querySelectorAll('h5'), parts = info.querySelector('.lab3d-parts');
            if (tools) secCapas.appendChild(tools);
            var h5c = el('h5', 'inm-h5', 'Componentes'); secCapas.appendChild(h5c);
            if (parts) secCapas.appendChild(parts);
            /* opciones de vista (velocidad, etiquetas, tutor): salen de la cápsula de controles para dejarla en una fila */
            var ctr = q('.lab3d-controls'), opc = el('div', 'inm-opc');
            if (ctr) {
                var spd = ctr.querySelector('.lab3d-speed');
                if (spd) { var ls = el('label', 'inm-spd', '<span>Velocidad</span>'); ls.appendChild(spd); opc.appendChild(ls); }
                Array.prototype.forEach.call(ctr.querySelectorAll('.lab3d-toggle'), function (t) { opc.appendChild(t); });
                secCapas.insertBefore(opc, secCapas.firstChild);
                secCapas.insertBefore(el('h5', 'inm-h5', 'Opciones de la simulación'), opc);
            }
            secFicha.appendChild(info);                     /* el resto de la ficha: cabecera, pasos y nota */
            Array.prototype.forEach.call(h5s, function (h) { if (/componentes/i.test(h.textContent)) h.remove(); });
        }
        /* gráficas y resultados: bloque propio debajo del tutor (se llega bajando o con el icono de gráficas) */
        var res = lab.querySelector('.p3-res'), grafBox = el('section', 'inm-grafbox');
        grafBox.innerHTML = '<div class="inm-phead"><div><b>Gráficas y resultados</b><span>Tabla, curvas e interpretación</span></div>' +
            '<button type="button" class="inm-ib inm-gup" title="Volver arriba" aria-label="Volver arriba"><svg viewBox="0 0 24 24"><path d="M6 15l6-6 6 6"/></svg></button></div><div class="inm-gbody"></div>';
        stage.appendChild(grafBox);
        grafBox.querySelector('.inm-gup').addEventListener('click', function () { stage.scrollTo({ top: 0, behavior: 'smooth' }); });
        var secGraf = grafBox.querySelector('.inm-gbody');
        if (res) secGraf.appendChild(res); else secGraf.innerHTML = '<p class="inm-vacio">Este ensayo no tiene gráficas adicionales; los valores medidos están en «Resultado del ensayo».</p>';

        /* la cámara se queda en la vista general (sin acercarse sola a cada pieza), como en el diseño */
        /* a pantalla completa la cámara se aleja un 30 % para que el equipo quepa entre los paneles */
        if (!meta.__inmZoom) {
            meta.__inmZoom = true;
            Object.keys(meta.cam || {}).forEach(function (k) { var v = meta.cam[k]; if (v && typeof v.radius === 'number') v.radius *= 1.12; });
        }
        if (inst.cam && meta.cam.home) inst.cam.radius = meta.cam.home.radius;
        /* las etiquetas de los equipos empiezan apagadas (se activan en Componentes › Opciones de la simulación) */
        var tglEt = lab.querySelector('.lab3d-tgl');
        if (tglEt && tglEt.checked) { tglEt.checked = false; tglEt.dispatchEvent(new Event('change', { bubbles: true })); }
        var ac = lab.querySelector('.p3-autocam');
        if (ac && ac.checked) { ac.checked = false; ac.dispatchEvent(new Event('change')); }
        var hv = views && views.querySelector('[data-view="home"]'); if (hv) hv.click();

        /* parámetros como en el diseño: nombre a la izquierda, valor grande a la derecha, deslizador y mínimo/máximo */
        function compactar(box) {
            Array.prototype.forEach.call(box.querySelectorAll('.p3-f'), function (row) {
                var lb = row.querySelector('.p3-l'), n = row.querySelector('input[type=number]'), rg = row.querySelector('.p3-rg');
                if (!lb || !n || !rg) return;
                var us = row.querySelector('select.p3-u'), u1 = row.querySelector('.p3-u1');
                var val = el('span', 'inm-pv'); lb.appendChild(val);
                var mm = el('div', 'inm-mm', '<span></span><span></span>'); rg.parentNode.insertBefore(mm, rg.nextSibling);
                function upd() {
                    var uni = us ? us.value : (u1 ? u1.textContent : '');
                    val.innerHTML = '<b>' + esc(n.value) + '</b><small>' + esc(uni) + '</small>';
                    mm.children[0].textContent = n.min; mm.children[1].textContent = n.max;
                }
                rg.addEventListener('input', function () { setTimeout(upd, 0); });
                n.addEventListener('change', function () { setTimeout(upd, 0); });
                if (us) us.addEventListener('change', function () { setTimeout(upd, 0); });
                pinta.push(upd); upd();
            });
            var ap = box.querySelector('.p3-apply'), rs = box.querySelector('.p3-reset');
            if (ap) ap.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10"/></svg> Aplicar';
            if (rs) rs.innerHTML = ICO.reset + ' Reiniciar';
        }
        function abrir(k) {
            if (k === 'graf') { grafBox.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
            panel.classList.remove('inm-ancho');
            var t = TABS.filter(function (x) { return x.k === k; })[0];
            var abierto = !lab.classList.contains('inm-poff') && panel.getAttribute('data-k') === k;
            if (abierto) { cerrarPanel(); return; }
            panel.setAttribute('data-k', k);
            panel.querySelector('.inm-phead b').textContent = t.t;
            panel.querySelector('.inm-phead span').textContent = t.s;
            Array.prototype.forEach.call(panel.querySelectorAll('.inm-pbody > section'), function (s) { s.hidden = s.getAttribute('data-k') !== k; });
            Array.prototype.forEach.call(rail.querySelectorAll('button'), function (b) { b.classList.toggle('on', b.getAttribute('data-k') === k); });
            lab.classList.remove('inm-poff');
        }
        function cerrarPanel() {
            lab.classList.add('inm-poff');
            Array.prototype.forEach.call(rail.querySelectorAll('button'), function (b) { b.classList.remove('on'); });
        }
        rail.addEventListener('click', function (e) { var b = e.target.closest('button[data-k]'); if (b) abrir(b.getAttribute('data-k')); });
        panel.querySelector('.inm-pclose').addEventListener('click', cerrarPanel);
        top.querySelector('.inm-inf').addEventListener('click', function () { abrir('ficha'); });
        abrir(pBox ? 'param' : 'ficha');
        if (global.matchMedia && global.matchMedia('(max-width: 900px)').matches) cerrarPanel();

        /* ---------------- pantalla completa: la escena es el fondo de toda la página ---------------- */
        doc.documentElement.classList.add('inm-abierto');
        function onKey(e) {
            if (e.key === 'Escape' && !doc.fullscreenElement && !lab.classList.contains('inm-poff')) { cerrarPanel(); e.preventDefault(); }
        }
        doc.addEventListener('keydown', onKey);
        function salir() {
            doc.documentElement.classList.remove('inm-abierto');
            /* el menú de usuario vuelve a su sitio antes de quitar el visor */
            var dd0 = doc.getElementById('menuUserDropdown'), cs0 = doc.getElementById('menuUserMenu');
            if (dd0 && cs0 && dd0.parentNode && lab.contains(dd0)) { dd0.hidden = true; cs0.appendChild(dd0); }
            doc.removeEventListener('keydown', onKey);
            if (doc.fullscreenElement) try { doc.exitFullscreen(); } catch (e) { }
            /* el visor vuelve a su sitio (o se elimina si la página ya cerró el simulador) */
            if (marca.parentNode && host.isConnected) { marca.parentNode.insertBefore(lab, marca); lab.classList.remove('lab3d-inm'); }
            else if (lab.parentNode === doc.body) lab.remove();
            if (marca.parentNode) marca.remove();
        }
        /* el visor original marca la vista activa buscando dentro de la página; como ahora vive en <body>, se marca aquí */
        if (views) views.addEventListener('click', function (e) {
            var b = e.target.closest('[data-view]'); if (!b) return;
            Array.prototype.forEach.call(views.querySelectorAll('[data-view]'), function (x) { x.classList.toggle('on', x === b); });
        });

        /* ---------------- monitor holográfico y tarjeta de resultado ---------------- */
        var normaTxt = normas[normas.length - 1] || meta.norma || '';
        var mon = el('div', 'inm-mon');
        mon.innerHTML = '<div class="inm-mhead">MONITOR · ENSAYO ' + esc(normaTxt.toUpperCase()) + '</div>' +
            '<div class="inm-mbody">' + anillo('inm-ring-m') +
              '<div class="inm-mchart"><div class="inm-mlee"></div><svg viewBox="0 0 300 96" preserveAspectRatio="none"><defs><linearGradient id="inmG' + tipo + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#22d3ee" stop-opacity=".35"/><stop offset="1" stop-color="#22d3ee" stop-opacity="0"/></linearGradient></defs>' +
              '<path class="inm-area" fill="url(#inmG' + tipo + ')"/><path class="inm-line"/></svg></div></div>';
        var card = el('div', 'inm-res');
        card.innerHTML = '<div class="inm-rhead"><span>Resultado del ensayo</span><em class="inm-live">LISTO</em></div>' +
            '<div class="inm-rbody">' + anillo('inm-ring-r') + '<dl class="inm-rlist"></dl></div><p class="inm-rfoot"></p>';
        /* columna derecha: resultado arriba y monitor debajo, cada uno en su tarjeta */
        var der = el('div', 'inm-der'); der.appendChild(card); der.appendChild(mon); stage.appendChild(der);
        /* la escena 3D en su propio recuadro central: el lienzo, las etiquetas y los avisos de carga van juntos */
        var escenaBox = el('div', 'inm-escena');
        ['.lab3d-canvas', '.lab3d-pins', '.lab3d-loading', '.lab3d-fail'].forEach(function (s) { var e = q(s); if (e) escenaBox.appendChild(e); });
        stage.appendChild(escenaBox);
        /* cuando cambia el tamaño del recuadro (abrir o cerrar el panel, girar el celular) el visor se ajusta */
        if (global.ResizeObserver) { var roT = 0; new ResizeObserver(function () { clearTimeout(roT); roT = setTimeout(function () { try { global.dispatchEvent(new Event('resize')); } catch (e) { } }, 40); }).observe(escenaBox); }
        var cv0 = escenaBox.querySelector('.lab3d-canvas'); if (cv0) cv0.removeAttribute('title');
        /* las vistas van en la cabecera, entre el título y la cápsula derecha */
        if (views) top.insertBefore(views, top.querySelector('.inm-right'));

        function anillo(cls) {
            return '<div class="inm-ring ' + cls + '"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" class="inm-rbg"/><circle cx="50" cy="50" r="42" class="inm-rfg" pathLength="100"/>' +
                '<circle cx="50" cy="50" r="34" class="inm-rdash"/></svg><b>—</b><small></small></div>';
        }

        /* ---------------- cubo de orientación ---------------- */
        var cubo = el('button', 'inm-cube');
        cubo.type = 'button'; cubo.title = 'Volver a la vista 3D general'; cubo.setAttribute('aria-label', 'Vista general');
        cubo.innerHTML = '<svg viewBox="-60 -60 120 120"></svg>';
        stage.appendChild(cubo);
        cubo.title = 'Clic en una cara para alinear la cámara · clic fuera del cubo: vista 3D';
        cubo.addEventListener('click', function (e) {
            var pg = e.target.closest && e.target.closest('polygon[data-n]');
            if (!pg || !inst.goal) { var hb2 = views && views.querySelector('[data-view="home"]'); if (hb2) hb2.click(); return; }
            var n = pg.getAttribute('data-n').split(',').map(Number), g = inst.goal;
            if (n[1] > 0.5) { g.phi = 0.18; }                                   /* cara superior: vista de planta */
            else if (n[1] < -0.5) { g.phi = 1.5; }
            else { g.theta = Math.atan2(n[0], n[2]); g.phi = 1.32; }          /* caras laterales: vista frontal, lateral o trasera */
            Array.prototype.forEach.call(lab.querySelectorAll('.lab3d-views [data-view]'), function (b) { b.classList.remove('on'); });
        });

        /* ---------------- barra inferior del tutor + pasos numerados ---------------- */
        var tutor = q('.tt-tutor');
        var pasos = el('ol', 'inm-steps');
        pasos.innerHTML = phases.map(function (ph, i) {
            return '<li><button type="button" data-i="' + i + '" title="' + esc(ph.t) + '"><i>' + (i + 1) + '</i><span>' + esc(corto(ph.t, i)) + '</span></button></li>';
        }).join('');
        if (tutor) { tutor.querySelector('.tt-globo').appendChild(pasos); lab.classList.add('inm-con-tutor'); }
        else { var barra = el('div', 'inm-bar'); barra.appendChild(pasos); stage.appendChild(barra); }
        pasos.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-i]'); if (!b) return;
            var li = lab.querySelectorAll('.lab3d-phases li')[+b.getAttribute('data-i')];
            if (li) li.click();
        });
        /* nombre corto de cada paso: «Pesar el recipiente vacío (tara)» → «Tara», «Pesar la muestra seca» → «Muestra seca» */
        function corto(t, i) {
            if (CORTOS[tipo] && CORTOS[tipo][i]) return CORTOS[tipo][i];
            var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };
            var m = /\(([^)]+)\)/.exec(t); if (m && m[1].length < 18) return cap(m[1].trim());
            var w = t.replace(/\s*\(.*?\)\s*/g, ' ').replace(/[·:,].*$/, '').trim().split(/\s+/);
            if (/^paso$/i.test(w[0]) && w.length > 2) w = w.slice(2);                    /* «Paso 1 · …» */
            var verbo = /^[a-záéíóúñ]+(ar|er|ir)(se|lo|la|los|las)?$/i.test(w[0]) ? w.shift() : null;
            while (w.length && /^(el|la|los|las|un|una|del|al|y)$/i.test(w[0])) w.shift();
            var out = [];
            for (var i = 0; i < w.length && out.length < 2; i++) {
                if (/^(con|en|de|a|por|hasta|para|sobre|entre|desde|y|o)$/i.test(w[i])) break;
                out.push(w[i]);
            }
            if (!out.length) return cap(verbo || w[0] || t);
            return cap(out.join(' '));
        }

        /* ---------------- datos en vivo ---------------- */
        var serie = [], crono = 0, tPrev = performance.now(), ultFase = -1;
        function lecturas() {
            return (inst.hudEls || []).map(function (h) { return { k: h.k.textContent, v: h.v.textContent, u: h.u.textContent }; })
                .filter(function (r) { return r.k && r.v && r.v !== '—'; });
        }
        function principal(rs) {
            /* humedad: el resultado es el agua perdida entre la masa seca, no la humedad que le queda a la muestra */
            if (tipo === 'humedad' || tipo === 'dm_hum') {
                var tb = lab.querySelectorAll('.p3-tbl tbody tr'), agua = null, seco = null;
                Array.prototype.forEach.call(tb, function (tr) {
                    var td = tr.querySelectorAll('td'); if (td.length < 3) return;
                    var l = td[0].textContent, v = num(td[2].textContent);
                    if (/agua perdida/i.test(l)) agua = v; else if (/masa (suelo|seca)/i.test(l)) seco = v;
                });
                if (agua != null && seco) return { k: 'w', v: (agua / seco * 100).toFixed(1), u: 'w %' };
            }
            /* ensayos cuyo resultado principal es una lectura concreta */
            var clave = { dm_rev: /asentamiento/i }[tipo];
            if (clave) for (var j = 0; j < rs.length; j++) if (clave.test(rs[j].k) && num(rs[j].v) != null) return rs[j];
            for (var i = rs.length - 1; i >= 0; i--) if (num(rs[i].v) != null && !/^(t|T|tiempo)$/.test(rs[i].k)) return rs[i];
            return rs[rs.length - 1] || null;
        }
        function pintarAnillo(box, frac, val, uni) {
            box.querySelector('.inm-rfg').style.strokeDasharray = Math.max(0, Math.min(100, frac * 100)).toFixed(1) + ' 100';
            box.querySelector('b').textContent = val;
            box.querySelector('small').textContent = uni;
        }
        function faseDe(p) { var k = 0; for (var i = 0; i < phases.length; i++) if (p >= phases[i].a) k = i; return k; }
        function tick() {
            if (!host.isConnected || inst.disposed) { clearInterval(tLoop); salir(); return; }
            if (doc.hidden) return;
            var now = performance.now(), p = inst.p || 0;
            if (inst.playing) crono += now - tPrev;
            tPrev = now;
            if (p <= 0.0005) { crono = 0; serie = []; }
            var s = Math.floor(crono / 1000);
            top.querySelector('.inm-crono b').textContent = [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(function (n) { return (n < 10 ? '0' : '') + n; }).join(':');

            var rs = lecturas(), pr = principal(rs);
            var valTxt = pr ? pr.v : Math.round(p * 100) + '', uniTxt = pr ? (pr.u || pr.k) : '%';
            pintarAnillo(mon.querySelector('.inm-ring'), p, valTxt, uniTxt);
            pintarAnillo(card.querySelector('.inm-ring'), p, valTxt, uniTxt);
            card.querySelector('.inm-rhead span').setAttribute('data-v', ' · ' + valTxt + ' ' + uniTxt);
            mon.querySelector('.inm-mlee').textContent = rs.slice(0, 3).map(function (r) { return r.k + ' ' + r.v + (r.u ? ' ' + r.u : ''); }).join('   ·   ') || 'Esperando el inicio del ensayo';
            card.querySelector('.inm-rlist').innerHTML = rs.filter(function (r) { return r !== pr && !(pr && pr.k === r.k); }).slice(0, 4).map(function (r) {
                return '<div><dt>' + esc(r.k) + '</dt><dd>' + esc(r.v) + (r.u ? ' <small>' + esc(r.u) + '</small>' : '') + '</dd></div>';
            }).join('') || '<div><dt>Avance</dt><dd>' + Math.round(p * 100) + ' <small>%</small></dd></div>';
            var live = card.querySelector('.inm-live'), fin = p >= 0.999;
            live.textContent = inst.playing ? 'EN VIVO' : fin ? 'FINAL' : p > 0.001 ? 'EN PAUSA' : 'LISTO';
            live.className = 'inm-live ' + (inst.playing ? 'is-run' : fin ? 'is-fin' : '');
            var fz = faseDe(p);
            card.querySelector('.inm-rfoot').innerHTML = 'Etapa: <b>' + esc((phases[fz] || {}).t || '') + '</b>';

            /* gráfica: evolución de la variable principal durante el ensayo */
            var v = pr ? num(pr.v) : null;
            if (v != null) {
                var last = serie[serie.length - 1];
                if (!last || p - last.p > 0.004) serie.push({ p: p, v: v });
                else if (p < last.p - 0.01) serie = [{ p: p, v: v }];
            }
            dibujar();

            /* etiquetas: solo las piezas que intervienen en la etapa actual (o las primeras 4 antes de empezar) */
            var activos = p > 0.001 ? focoDe(fz) : [];
            var foco = activos.length ? activos : [0, 1, 2, 3];
            (inst.pinEls || []).forEach(function (b, i) {
                b.classList.toggle('inm-lbl', foco.indexOf(i) >= 0);
                b.classList.toggle('inm-act', activos.indexOf(i) >= 0);
                datoVivo(b, i, rs);
            });
            resaltar(activos, p);
            if (Math.random() < 0.1) pinta.forEach(function (f) { f(); });
            separarEtiquetas();
            encuadre();

            if (fz !== ultFase) {
                ultFase = fz;
                Array.prototype.forEach.call(pasos.querySelectorAll('li'), function (li, i) {
                    li.classList.toggle('is-on', i === fz); li.classList.toggle('is-done', i < fz);
                });
            }
            /* el tutor dice «Paso i de n · Tutor/Tutora» */
            var nEl = tutor && tutor.querySelector('.tt-n');
            if (nEl && nEl.textContent && nEl.textContent.indexOf('·') < 0) {
                var quien = (tutor.querySelector('.tt-quien') || {}).textContent || '';
                nEl.textContent += ' · ' + (/compañero/i.test(quien) ? 'Rafael' : 'Elisa');
            }
            girarCubo();
            if (Math.random() < 0.08) pintarUsuario();   /* por si cambió la foto desde «Editar perfil» */
        }
        /* equipos que intervienen en cada etapa: los que define la máquina, el mapa de FOCO o, si no hay, los que nombra la etapa */
        var cacheFoco = {};
        function focoDe(i) {
            if (cacheFoco[i]) return cacheFoco[i];
            var ph = phases[i] || {}, out = [];
            if (ph.pins && ph.pins.length) out = ph.pins.slice();
            else if (FOCO[tipo] && FOCO[tipo][i]) out = FOCO[tipo][i].slice();
            else {
                var txt = ((ph.t || '') + ' ' + (ph.d || '')).toLowerCase();
                (meta.parts || []).forEach(function (pt, k) {
                    var ws = String(pt.name || '').toLowerCase().replace(/\(.*?\)|["“”]/g, ' ').split(/[^a-záéíóúñ0-9]+/).filter(function (w) { return w.length > 4; });
                    if (ws.some(function (w) { return txt.indexOf(w.slice(0, Math.max(5, w.length - 2))) >= 0; })) out.push(k);
                });
            }
            return (cacheFoco[i] = out);
        }
        /* las etiquetas visibles no se montan: si dos se cruzan, la de la derecha sube un escalón */
        function separarEtiquetas() {
            var vis = (inst.pinEls || []).filter(function (b) { return b.classList.contains('inm-lbl') && b.offsetParent !== null; });
            vis.forEach(function (b) { var em = b.querySelector('em'); if (em) { em.style.top = ''; em.style.removeProperty('--ln'); } });
            var cajas = vis.map(function (b) { var em = b.querySelector('em'); return { em: em, r: em.getBoundingClientRect() }; })
                .sort(function (a, b) { return a.r.left - b.r.left; });
            var puestas = [];
            cajas.forEach(function (c) {
                var dy = 0, r = c.r, choca = true, vueltas = 0;
                while (choca && vueltas < 6) {
                    choca = puestas.some(function (o) { return r.left < o.right + 8 && r.right + 8 > o.left && (r.top - dy) < o.bottom + 6 && (r.bottom - dy) + 6 > o.top; });
                    if (choca) { dy += r.height + 10; vueltas++; }
                }
                if (dy) { c.em.style.top = (-86 - dy) + 'px'; c.em.style.setProperty('--ln', (78 + dy) + 'px'); }
                puestas.push({ left: r.left, right: r.right, top: r.top - dy, bottom: r.bottom - dy });
            });
        }
        /* etiqueta HUD con dato en vivo: balanzas muestran la masa, hornos y paneles la temperatura */
        function datoVivo(b, i, rs) {
            var pt = (meta.parts || [])[i], sm = b.querySelector('em small'); if (!pt || !sm) return;
            if (!sm.__desc) sm.__desc = sm.textContent;
            var nombre = pt.name || '', r = null, estado = '';
            if (/balanza|b[aá]scula/i.test(nombre)) { r = rs.filter(function (x) { return /^g$|^kg$/.test(x.u); })[0]; estado = inst.playing ? 'midiendo' : 'estable'; }
            else if (/horno|temperatura|estufa/i.test(nombre)) { r = rs.filter(function (x) { return /°C/.test(x.u); })[0]; estado = inst.playing ? 'encendido' : 'en espera'; }
            else if (/manómetro|man[oó]metro|celda|prensa|dinam/i.test(nombre)) { r = rs.filter(function (x) { return /kN|kPa|MPa|N$/.test(x.u); })[0]; estado = inst.playing ? 'cargando' : 'en espera'; }
            var txt = r ? (r.v.replace('.', ',') + ' ' + r.u + ' · ' + estado) : sm.__desc;
            if (sm.textContent !== txt) sm.textContent = txt;
        }
        function dibujar() {
            var line = mon.querySelector('.inm-line'), area = mon.querySelector('.inm-area');
            if (serie.length < 2) { line.setAttribute('d', ''); area.setAttribute('d', ''); return; }
            var mn = Infinity, mx = -Infinity;
            serie.forEach(function (s) { mn = Math.min(mn, s.v); mx = Math.max(mx, s.v); });
            if (mx - mn < 1e-9) { mx += 1; mn -= 1; }
            var d = serie.map(function (s, i) { return (i ? 'L' : 'M') + (s.p * 296 + 2).toFixed(1) + ' ' + (90 - (s.v - mn) / (mx - mn) * 80).toFixed(1); }).join(' ');
            line.setAttribute('d', d);
            area.setAttribute('d', d + ' L' + (serie[serie.length - 1].p * 296 + 2).toFixed(1) + ' 96 L' + (serie[0].p * 296 + 2).toFixed(1) + ' 96 Z');
        }
        /* encuadre: la máquina se dibuja más abajo, debajo del monitor, como en el diseño */
        var canvasBox = q('.lab3d-canvas'), ultEnc = '';
        function encuadre() {
            var cam = inst.camera; if (!cam || !cam.setViewOffset || !canvasBox) return;
            var w = canvasBox.clientWidth, h = canvasBox.clientHeight, movil = w < 900;
            var key = w + 'x' + h + (movil ? 'm' : ''); if (key === ultEnc || w < 10 || h < 10) return; ultEnc = key;
            cam.clearViewOffset();   /* la escena ya tiene su propio recuadro: no hace falta desplazarla */
            cam.updateProjectionMatrix();
        }
        var V = [[-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1], [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]];
        var CARAS = [[1, 2, 6, 5, [1, 0, 0]], [0, 4, 7, 3, [-1, 0, 0]], [3, 7, 6, 2, [0, 1, 0]], [0, 1, 5, 4, [0, -1, 0]], [4, 5, 6, 7, [0, 0, 1]], [0, 3, 2, 1, [0, 0, -1]]];
        var ultCam = '';
        function girarCubo() {
            var c = inst.cam; if (!c) return;
            var key = c.theta.toFixed(2) + c.phi.toFixed(2); if (key === ultCam) return; ultCam = key;
            /* el cubo se ve siempre en perspectiva isométrica (ligero giro extra) para que se lean sus tres caras */
            var th = c.theta + 0.62, ph = Math.min(c.phi, 1.0);
            var f = [Math.sin(ph) * Math.sin(th), Math.cos(ph), Math.sin(ph) * Math.cos(th)];      /* hacia la cámara */
            var r = norm(cruz([0, 1, 0], f)), u = cruz(f, r);
            var P = V.map(function (v) { return [dot(v, r) * 24, -dot(v, u) * 24]; });
            var svg = '';
            CARAS.filter(function (cf) { return dot(cf[4], f) > 0.02; }).forEach(function (cf) {
                var luz = 0.35 + 0.5 * dot(cf[4], f);
                svg += '<polygon data-n="' + cf[4].join(',') + '" points="' + [0, 1, 2, 3].map(function (i) { return P[cf[i]].join(','); }).join(' ') + '" fill="rgba(56,189,248,' + (luz * 0.35).toFixed(2) + ')" stroke="#7dd3fc" stroke-width="1.6" stroke-linejoin="round"/>';
            });
            [['X', [1.7, 0, 0]], ['Y', [0, 1.7, 0]], ['Z', [0, 0, 1.7]]].forEach(function (a) {
                if (dot(a[1], f) < -0.6) return;
                var x = dot(a[1], r) * 24, y = -dot(a[1], u) * 24;
                svg += '<text x="' + x.toFixed(1) + '" y="' + (y + 4).toFixed(1) + '">' + a[0] + '</text>';
            });
            cubo.querySelector('svg').innerHTML = svg;
        }
        function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
        function cruz(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
        function norm(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
        /* ---------------- escena de laboratorio ---------------- */
        var T3 = global.THREE, SC = inst.scene, quieto = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var ENV = null;
        function escena() {
            if (!T3 || !SC || !inst.machine || !inst.machine.root) return;
            var box = new T3.Box3().setFromObject(inst.machine.root), size = box.getSize(new T3.Vector3()), ctr = box.getCenter(new T3.Vector3());
            var R = Math.max(size.x, size.z, 2), y0 = box.min.y, home = meta.cam.home || {}, th = home.theta || 0.6;
            var dir = new T3.Vector3(Math.sin(th), 0, Math.cos(th));                  /* hacia la cámara, en planta */
            var grupo = new T3.Group(); grupo.name = 'inm-entorno'; SC.add(grupo);

            SC.background = new T3.Color(0x03060f);
            SC.fog = new T3.Fog(0x03060f, R * 2.6, R * 7.5);

            /* pared azul noche con paneles y franja de luz en el techo (textura dibujada en canvas) */
            var cv = doc.createElement('canvas'); cv.width = 1024; cv.height = 512;
            var x = cv.getContext('2d'), gr = x.createLinearGradient(0, 0, 0, 512);
            gr.addColorStop(0, '#0b1a3a'); gr.addColorStop(0.55, '#071331'); gr.addColorStop(1, '#040a1c');
            x.fillStyle = gr; x.fillRect(0, 0, 1024, 512);
            x.strokeStyle = 'rgba(56,189,248,.10)'; x.lineWidth = 2;
            for (var i = 1; i < 8; i++) { x.beginPath(); x.moveTo(i * 128, 40); x.lineTo(i * 128, 512); x.stroke(); }
            var luz = x.createLinearGradient(0, 0, 0, 46); luz.addColorStop(0, 'rgba(186,230,253,.95)'); luz.addColorStop(1, 'rgba(56,189,248,0)');
            x.fillStyle = luz; x.fillRect(60, 6, 904, 40);
            x.fillStyle = 'rgba(129,140,248,.25)'; x.fillRect(0, 488, 1024, 3);
            var tex = new T3.CanvasTexture(cv);
            var pared = new T3.Mesh(new T3.PlaneGeometry(R * 9, R * 3.2), new T3.MeshBasicMaterial({ map: tex, fog: true }));
            pared.position.set(ctr.x - dir.x * R * 2.4, y0 + R * 1.6 - 0.02, ctr.z - dir.z * R * 2.4);
            pared.lookAt(ctr.x + dir.x * 10, y0 + R * 1.6, ctr.z + dir.z * 10);
            grupo.add(pared);

            /* cuadrícula holográfica cian sobre el piso */
            var grid = new T3.GridHelper(R * 12, 48, 0x38bdf8, 0x1d4ed8);
            grid.position.set(ctr.x, y0 + 0.004, ctr.z);
            [].concat(grid.material).forEach(function (m) { m.transparent = true; m.opacity = 0.16; m.depthWrite = false; });
            grupo.add(grid);
            var brillo = new T3.Mesh(new T3.CircleGeometry(R * 1.35, 48), new T3.MeshBasicMaterial({ color: 0x1e40af, transparent: true, opacity: 0.16, depthWrite: false }));
            brillo.rotation.x = -Math.PI / 2; brillo.position.set(ctr.x, y0 + 0.006, ctr.z); grupo.add(brillo);

            /* luz principal fría desde la derecha y contorno cian */
            var key = new T3.DirectionalLight(0xdbeafe, 0.55);
            var der = new T3.Vector3(dir.z, 0, -dir.x);
            key.position.set(ctr.x + der.x * R * 2 + dir.x * R, y0 + R * 2.2, ctr.z + der.z * R * 2 + dir.z * R);
            key.target.position.copy(ctr); grupo.add(key); grupo.add(key.target);
            var rim = new T3.PointLight(0x38bdf8, 0.9, R * 5);
            rim.position.set(ctr.x - dir.x * R * 1.4, y0 + size.y + R * 0.4, ctr.z - dir.z * R * 1.4); grupo.add(rim);

            /* foco para el equipo del paso activo y anillos holográficos en su base */
            var spot = new T3.SpotLight(0xffffff, 0, R * 4, Math.PI / 7, 0.55, 1.2);
            spot.position.set(ctr.x + dir.x * R * 0.4, y0 + R * 2.2, ctr.z + dir.z * R * 0.4); grupo.add(spot); grupo.add(spot.target);
            var anillos = new T3.Group(); anillos.visible = false; grupo.add(anillos);
            [0, 1].forEach(function (k) {
                var m = new T3.Mesh(new T3.RingGeometry(0.92, 1, 64), new T3.MeshBasicMaterial({ color: k ? 0x818cf8 : 0x38bdf8, transparent: true, opacity: 0.7, side: T3.DoubleSide, depthWrite: false, blending: T3.AdditiveBlending }));
                m.rotation.x = -Math.PI / 2; m.userData.k = k; anillos.add(m);
            });
            anillos.children[0].onBeforeRender = function () {
                if (quieto) return;
                var t = performance.now() / 1000;
                anillos.children.forEach(function (m) {
                    var f = ((t * 0.45 + m.userData.k * 0.5) % 1);
                    m.scale.setScalar(0.75 + f * 0.55); m.material.opacity = 0.75 * (1 - f);
                });
            };

            /* partículas sutiles */
            if (!quieto) {
                var N = 220, pos = new Float32Array(N * 3), vel = [];
                for (var j = 0; j < N; j++) {
                    pos[j * 3] = ctr.x + (Math.random() - 0.5) * R * 4; pos[j * 3 + 1] = y0 + Math.random() * R * 1.8; pos[j * 3 + 2] = ctr.z + (Math.random() - 0.5) * R * 4;
                    vel.push(0.002 + Math.random() * 0.004);
                }
                var gp = new T3.BufferGeometry(); gp.setAttribute('position', new T3.BufferAttribute(pos, 3));
                var pts = new T3.Points(gp, new T3.PointsMaterial({ color: 0x7dd3fc, size: R * 0.008, transparent: true, opacity: 0.55, depthWrite: false, blending: T3.AdditiveBlending }));
                pts.onBeforeRender = function () {
                    var a = gp.attributes.position.array;
                    for (var k = 0; k < N; k++) { a[k * 3 + 1] += vel[k] * R * 0.05; if (a[k * 3 + 1] > y0 + R * 1.8) a[k * 3 + 1] = y0; }
                    gp.attributes.position.needsUpdate = true;
                };
                grupo.add(pts);
            }

            /* luces originales de la escena (se atenúan cuando hay un equipo resaltado) */
            var base = [];
            SC.traverse(function (o) { if (o.isLight && !grupo.getObjectById(o.id)) base.push({ l: o, i: o.intensity }); });
            ENV = { grupo: grupo, spot: spot, anillos: anillos, base: base, R: R, y0: y0, ultimo: '' };
        }
        /* resalte del paso: el equipo activo a plena luz con anillos; el resto al ~65 % */
        function resaltar(activos, p) {
            if (!ENV) return;
            var key = activos.join(',') + (p > 0.001 ? 'a' : 'b'); if (key === ENV.ultimo) return; ENV.ultimo = key;
            var hay = activos.length && inst.pinVecs && inst.pinVecs.length;
            ENV.base.forEach(function (b) { b.l.intensity = b.i * (hay ? 0.65 : 1); });
            if (!hay) { ENV.spot.intensity = 0; ENV.anillos.visible = false; return; }
            var c = new T3.Vector3(), n = 0, mx = 0;
            activos.forEach(function (i) { var v = inst.pinVecs[i]; if (v) { c.add(v); n++; } });
            if (!n) { ENV.spot.intensity = 0; ENV.anillos.visible = false; return; }
            c.multiplyScalar(1 / n);
            activos.forEach(function (i) { var v = inst.pinVecs[i]; if (v) mx = Math.max(mx, Math.hypot(v.x - c.x, v.z - c.z)); });
            ENV.spot.target.position.set(c.x, ENV.y0, c.z); ENV.spot.target.updateMatrixWorld();
            ENV.spot.position.set(c.x, ENV.y0 + ENV.R * 2, c.z + ENV.R * 0.3);
            ENV.spot.intensity = 1.6;
            var rad = Math.max(ENV.R * 0.16, mx + ENV.R * 0.1);
            ENV.anillos.position.set(c.x, ENV.y0 + 0.01, c.z); ENV.anillos.scale.setScalar(rad); ENV.anillos.visible = true;
        }
        try { escena(); } catch (e) { console.warn('Escena 3D inmersiva', e); }

        var tLoop = setInterval(tick, 150);
        tick();

        /* el visor recalcula su tamaño con el nuevo diseño */
        setTimeout(function () { try { global.dispatchEvent(new Event('resize')); } catch (e) { } }, 60);
        doc.addEventListener('fullscreenchange', function () { setTimeout(function () { try { global.dispatchEvent(new Event('resize')); } catch (e) { } }, 80); });
    }

    /* ======================= estilos ======================= */
    (function () {
        if (doc.getElementById('inm-css')) return;
        var st = doc.createElement('style'); st.id = 'inm-css';
        var M = "ui-monospace,'SFMono-Regular','Cascadia Mono',Consolas,monospace";
        var VID = 'background:var(--inm-glass);backdrop-filter:blur(18px) saturate(1.2);-webkit-backdrop-filter:blur(18px) saturate(1.2);border:1px solid var(--inm-ln);border-radius:18px;box-shadow:0 18px 50px rgba(1,4,12,.55)';
        st.textContent = [
            /* tokens */
            '.lab3d.lab3d-inm{position:fixed!important;inset:0;z-index:2147480000;margin:0!important;max-width:none!important;--inm-bg:#03060f;--inm-cy:#38bdf8;--inm-az:#2563eb;--inm-vi:#818cf8;--inm-ve:#34d399;--inm-na:#ffb070;--inm-tx:#eef4ff;--inm-mu:#8fa0be;--inm-glass:rgba(18,30,58,.55);--inm-ln:rgba(125,211,252,.14);--lab-h:100vh;display:block!important;font-variant-numeric:tabular-nums}',
            'html.inm-abierto,html.inm-abierto body{overflow:hidden!important}',
            'html.inm-abierto #modalPerfil{z-index:2147483000!important}',

            /* la escena ocupa toda la pantalla y todo lo demás flota encima */
            '.lab3d-inm .lab3d-stage{position:absolute!important;inset:0;z-index:1;width:100vw;height:100vh;padding:0!important;margin:0;border:0!important;border-radius:0!important;background:var(--inm-bg)!important;box-shadow:none!important;overflow:hidden}',
            '.lab3d-inm .lab3d-canvas,.lab3d-inm .lab3d-pins,.lab3d-inm .lab3d-loading,.lab3d-inm .lab3d-fail{height:100vh}',
            '.lab3d-inm .lab3d-footer,.lab3d-inm>.lab3d-info{display:none!important}',
            '.lab3d-inm .lab3d-tag,.lab3d-inm .lab3d-state,.lab3d-inm .lab3d-hud,.lab3d-inm .lab3d-paso,.lab3d-inm .lab3d-resultados,.lab3d-inm .lab3d-views [data-zoom]{display:none!important}',

            /* esquinas de visor HUD y líneas de escaneo */
            '.lab3d-inm .lab3d-stage::before{content:"";position:absolute;inset:8px;z-index:1;pointer-events:none;border:0;width:auto;height:auto;' +
                'background:linear-gradient(var(--inm-cy),var(--inm-cy)) top left/34px 2px,linear-gradient(var(--inm-cy),var(--inm-cy)) top left/2px 34px,' +
                'linear-gradient(var(--inm-cy),var(--inm-cy)) top right/34px 2px,linear-gradient(var(--inm-cy),var(--inm-cy)) top right/2px 34px,' +
                'linear-gradient(var(--inm-cy),var(--inm-cy)) bottom left/34px 2px,linear-gradient(var(--inm-cy),var(--inm-cy)) bottom left/2px 34px,' +
                'linear-gradient(var(--inm-cy),var(--inm-cy)) bottom right/34px 2px,linear-gradient(var(--inm-cy),var(--inm-cy)) bottom right/2px 34px;background-repeat:no-repeat;opacity:.55}',
            '.lab3d-inm .lab3d-stage::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;border:0;width:auto;height:auto;background:repeating-linear-gradient(0deg,rgba(148,197,253,.035) 0 1px,transparent 1px 4px)}',

            /* vidrio */
            '.inm-top>div,.inm-panel,.inm-rail,.inm-res,.lab3d-inm .lab3d-views,.lab3d-inm .lab3d-controls,.lab3d-inm .tt-tutor,.inm-bar,.inm-cube{' + VID + '}',
            '.inm-panel::before,.inm-res::before,.lab3d-inm .tt-tutor::before{content:"";position:absolute;left:18px;right:18px;top:-1px;height:1px;background:linear-gradient(90deg,transparent,var(--inm-cy),var(--inm-vi),transparent)}',
            '.inm-ib{display:inline-grid;place-items:center;width:38px;height:38px;min-height:0;padding:0;border-radius:12px;border:0;background:transparent;color:var(--inm-tx);cursor:pointer;font-weight:800;font-size:13px}',
            '.inm-ib:hover{background:rgba(56,189,248,.14)}.inm-ib:focus-visible,.inm-rail button:focus-visible,.inm-steps button:focus-visible,.inm-cube:focus-visible{outline:2px solid var(--inm-cy);outline-offset:2px}',
            '.inm-ib svg,.inm-rail svg,.inm-crono svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',

            /* cabecera */
            '.inm-top{position:absolute;top:22px;left:26px;right:26px;z-index:8;display:flex;justify-content:space-between;align-items:flex-start;gap:14px;pointer-events:none}',
            '.inm-top>div{pointer-events:auto;display:flex;align-items:center;gap:12px;padding:8px 16px 8px 8px;border-radius:999px}',
            '.inm-back{width:44px;height:44px;border-radius:50%;background:rgba(3,6,15,.5);border:1px solid var(--inm-ln)}',
            '.inm-tit b{display:block;font-size:17px;color:var(--inm-tx);line-height:1.2}.inm-tit span{display:block;font-size:12.5px;color:var(--inm-mu)}',
            '.inm-badges{display:flex;gap:6px}.inm-badges i{font-style:normal;font:700 11.5px/1 ' + M + ';color:#bae6fd;padding:6px 10px;border-radius:999px;border:1px solid rgba(56,189,248,.4);background:rgba(37,99,235,.16);white-space:nowrap}',
            '.inm-right{gap:4px!important;padding:6px 8px 6px 16px!important}',
            '.inm-crono{display:inline-flex;align-items:center;gap:8px;color:var(--inm-cy);margin-right:6px}.inm-crono b{font:600 14.5px/1 ' + M + ';letter-spacing:.06em}',
            '.inm-umenu{position:relative;display:inline-flex}.inm-umenu #menuUserDropdown{position:absolute!important;right:0!important;left:auto!important;top:calc(100% + 12px)!important;z-index:30!important;min-width:220px}',
            '.inm-user{cursor:pointer;width:42px;height:42px;border-radius:50%;display:grid;place-items:center;overflow:hidden;border:2px solid var(--inm-cy);box-shadow:0 0 16px rgba(56,189,248,.35);color:#fff;font-weight:800;background:#0f1e3a}.inm-user img{width:100%;height:100%;object-fit:cover}',
            '.lab3d-inm .lab3d-views{position:absolute;top:22px;left:50%;right:auto;transform:translateX(-50%);z-index:9;padding:5px;border-radius:999px}',
            '.lab3d-inm .lab3d-views button{padding:9px 20px;font-size:13.5px;border-radius:999px;color:var(--inm-mu);font-weight:600}',
            '.lab3d-inm .lab3d-views button:hover{color:var(--inm-tx);background:rgba(56,189,248,.1)}',
            '.lab3d-inm .lab3d-views button.on{background:linear-gradient(135deg,rgba(56,189,248,.35),rgba(37,99,235,.45));color:#fff;box-shadow:inset 0 0 0 1px rgba(125,211,252,.4)}',

            /* riel y panel (uno a la vez) */
            '.inm-rail{position:absolute;left:26px;top:104px;z-index:8;display:grid;gap:8px;padding:8px}',
            '.inm-rail button{width:46px;height:46px;min-height:0;padding:0;display:grid;place-items:center;border-radius:13px;border:0;background:transparent;color:var(--inm-mu);cursor:pointer}',
            '.inm-rail button:hover{background:rgba(56,189,248,.12);color:var(--inm-tx)}.inm-rail button.on{background:linear-gradient(135deg,var(--inm-cy),var(--inm-az));color:#fff;box-shadow:0 8px 24px rgba(37,99,235,.45)}',
            '.inm-panel{position:absolute;left:100px;top:104px;z-index:8;width:330px;max-height:calc(100vh - 250px);display:flex;flex-direction:column;overflow:hidden}',
            '.inm-panel.inm-ancho{width:min(620px,calc(100vw - 520px))}',
            '.lab3d-inm.inm-poff .inm-panel{display:none}',
            '.inm-phead{display:flex;justify-content:space-between;align-items:flex-start;padding:16px 12px 4px 22px}.inm-phead b{display:block;font-size:17px;color:var(--inm-tx)}.inm-phead span{display:block;font-size:12.5px;color:var(--inm-mu);margin-top:2px}',
            '.inm-pbody{overflow:auto;padding:4px 22px 20px;color:var(--inm-tx);scrollbar-width:thin}.inm-pbody>section[hidden]{display:none}',
            '.inm-vacio{font-size:13px;color:var(--inm-mu)}.inm-h5{font-size:11px;letter-spacing:1.3px;text-transform:uppercase;color:var(--inm-cy);margin:14px 0 8px}',
            '.inm-panel .p3-params,.inm-panel .p3-res,.inm-panel .lab3d-info,.inm-panel .p3-tools{position:static;max-height:none;padding:0;margin:0;background:none;border:0;box-shadow:none;width:auto;border-radius:0}',
            '.inm-panel .p3-phead{display:none}.inm-panel .p3-pbody{display:block!important}',
            '.inm-panel .p3-live,.inm-panel .p3-hint,.inm-panel .p3-run,.inm-panel .p3-defaults,.inm-panel .p3-in,.inm-panel .p3-rng,.inm-panel .p3-d{display:none!important}',
            '.inm-panel .p3-f{padding:11px 0 4px;border:0;margin:0;background:none}.inm-panel .p3-f+.p3-f{border-top:1px solid rgba(125,211,252,.08)}',
            '.inm-panel .p3-l{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin:0 0 8px}.inm-panel .p3-l b{font-size:14.5px;font-weight:500;color:var(--inm-tx)}',
            '.inm-pv b{font:600 22px/1 ' + M + ';color:#fff}.inm-pv small{margin-left:4px;font-size:12px;color:var(--inm-mu)}',
            '.inm-panel input[type=range]{width:100%;margin:0;accent-color:var(--inm-cy)}',
            '.inm-mm{display:flex;justify-content:space-between;margin-top:6px;font:500 11.5px/1 ' + M + ';color:var(--inm-mu)}',
            '.inm-panel .p3-pbtns{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:14px}',
            '.inm-panel .p3-pbtns button{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:42px;border-radius:12px;font-size:14px;font-weight:600;border:1px solid rgba(125,211,252,.22);background:rgba(3,6,15,.35);color:var(--inm-tx);cursor:pointer}',
            '.inm-panel .p3-pbtns .p3-apply{background:linear-gradient(135deg,#38bdf8,#2563eb)!important;border-color:transparent!important;color:#fff!important;box-shadow:0 10px 26px rgba(37,99,235,.45)}',
            '.inm-panel .p3-pbtns svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}',
            '.inm-panel select{background:#0b1630;color:var(--inm-tx);border:1px solid rgba(125,211,252,.22);border-radius:10px;padding:8px}',
            '.inm-panel .p3-tbl{width:100%;font-size:12.5px}.inm-panel .p3-charts canvas{max-width:100%;height:auto}',

            /* monitor */
            '.inm-mon{position:absolute;top:104px;left:50%;transform:translateX(-50%);z-index:6;width:min(540px,calc(100vw - 920px));min-width:380px;padding:14px 18px 12px;color:var(--inm-tx);background:linear-gradient(180deg,rgba(14,40,86,.6),rgba(8,24,54,.4));border:1px solid rgba(56,189,248,.45);clip-path:polygon(0 0,calc(100% - 22px) 0,100% 22px,100% 100%,22px 100%,0 calc(100% - 22px));box-shadow:0 0 40px rgba(56,189,248,.16) inset;backdrop-filter:blur(6px)}',
            '.inm-mhead{font:600 12px/1 ' + M + ';letter-spacing:.28em;color:#7dd3fc;padding-bottom:10px;border-bottom:1px solid rgba(56,189,248,.22)}',
            '.inm-mbody{display:flex;align-items:center;gap:16px;padding-top:12px}.inm-mchart{flex:1;min-width:0}',
            '.inm-mlee{font:500 11.5px/1.4 ' + M + ';color:#a5c8ee;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:6px}',
            '.inm-mchart svg{width:100%;height:92px;display:block}.inm-line{fill:none;stroke:var(--inm-ve);stroke-width:2.2;vector-effect:non-scaling-stroke}',
            '.inm-ring{position:relative;flex:0 0 auto;width:108px;height:108px;display:grid;place-items:center;text-align:center}',
            '.inm-ring svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}',
            '.inm-rbg{fill:none;stroke:rgba(143,160,190,.18);stroke-width:7}.inm-rfg{fill:none;stroke:var(--inm-cy);stroke-width:7;stroke-linecap:round;stroke-dasharray:0 100;transition:stroke-dasharray .3s}',
            '.inm-rdash{fill:none;stroke:rgba(125,211,252,.32);stroke-width:1;stroke-dasharray:2 4}',
            '.inm-ring b{position:relative;font:700 24px/1 ' + M + ';color:#fff;max-width:90px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.inm-ring small{position:absolute;top:66%;font-size:10.5px;color:var(--inm-mu);max-width:84px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}',

            /* resultado */
            '.inm-res{position:absolute;top:104px;right:26px;z-index:8;width:330px;padding:18px 20px;color:var(--inm-tx)}',
            '.inm-rhead{display:flex;justify-content:space-between;align-items:center;font-size:14px;color:#c7d6ee}',
            '.inm-live{font-style:normal;font:800 11px/1 ' + M + ';letter-spacing:.06em;padding:6px 10px;border-radius:999px;color:var(--inm-mu);border:1px solid rgba(143,160,190,.35)}',
            '.inm-live.is-run{color:var(--inm-ve);border-color:rgba(52,211,153,.5);background:rgba(52,211,153,.1)}.inm-live.is-run::before{content:"● "}.inm-live.is-fin{color:#93c5fd;border-color:rgba(147,197,253,.45)}',
            '.inm-rbody{display:flex;align-items:center;gap:14px;padding:14px 0 12px;min-width:0}.inm-res .inm-ring{width:96px;height:96px}.inm-res .inm-ring b{font-size:20px}',
            '.inm-rlist{flex:1;min-width:0;display:grid;gap:9px;margin:0}.inm-rlist div{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0}',
            '.inm-rlist dt{font:500 11px/1.2 ' + M + ';color:var(--inm-mu);max-width:100%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.inm-rlist dd{margin:0;max-width:100%;font:700 15px/1.2 ' + M + ';color:#fff;white-space:normal;overflow-wrap:anywhere}.inm-rlist small{font-size:11px;color:var(--inm-mu)}',
            '.inm-rfoot{margin:0;padding-top:12px;border-top:1px solid rgba(125,211,252,.1);font-size:12.5px;color:var(--inm-mu)}.inm-rfoot b{color:var(--inm-cy)}',

            /* controles del ensayo */
            '.lab3d-inm .lab3d-controls{position:absolute;left:26px;bottom:26px;z-index:8;width:300px;max-width:none;padding:8px 10px;gap:8px;flex-wrap:nowrap;border-top:1px solid var(--inm-ln)}',
            '.lab3d-inm .lab3d-controls .lab3d-play{padding:9px 12px;white-space:nowrap}.lab3d-inm .lab3d-controls .lab3d-reset{display:inline-grid!important;width:38px;padding:0}.lab3d-inm .lab3d-pct{min-width:34px}',
            '.inm-opc{display:grid;gap:10px;margin:0 0 6px}.inm-opc .lab3d-toggle{font-size:13.5px;color:var(--inm-tx)}.inm-spd{display:flex;align-items:center;justify-content:space-between;gap:10px;font-size:13.5px;color:var(--inm-tx)}',
            '.lab3d-inm .lab3d-controls button{border-radius:12px;background:rgba(3,6,15,.4);border-color:rgba(125,211,252,.2)}',
            '.lab3d-inm .lab3d-controls .lab3d-play{min-width:0;background:linear-gradient(135deg,#38bdf8,#2563eb);border-color:transparent;color:#fff;box-shadow:0 8px 22px rgba(37,99,235,.4)}',
            '.lab3d-inm .lab3d-scrub{flex:1 1 110px;accent-color:var(--inm-cy)}.lab3d-inm .lab3d-speed{background:rgba(3,6,15,.4);border-color:rgba(125,211,252,.2)}',

            /* dock del tutor */
            '.lab3d-inm.inm-con-tutor .tt-tutor{left:50%;right:auto;top:auto;bottom:22px;transform:translateX(-50%);width:min(780px,calc(100vw - 820px));min-width:560px;max-width:none;align-items:center;gap:18px;padding:16px 20px;pointer-events:auto;z-index:8}',
            '.lab3d-inm .tt-cara{width:64px;height:64px;align-self:flex-start;filter:none}',
            '.lab3d-inm .tt-globo{position:static;max-height:none;overflow:visible;background:none;border:0;box-shadow:none;padding:0;display:grid;grid-template-columns:minmax(0,1fr) auto;column-gap:18px;align-items:center}',
            '.lab3d-inm .tt-globo:before{display:none}',
            '.lab3d-inm .tt-globo>*{grid-column:1}.lab3d-inm .tt-pie{grid-column:2;grid-row:2/span 4;margin:0}.lab3d-inm .inm-steps,.lab3d-inm .tt-elegir{grid-column:1/-1}',
            '.lab3d-inm .tt-cab{grid-column:2;grid-row:1;justify-self:end;margin:0}.lab3d-inm .tt-cab b{display:none}.lab3d-inm .tt-cab button{width:28px;height:26px;background:rgba(3,6,15,.35);border-color:rgba(125,211,252,.2)}',
            '.lab3d-inm .tt-n{color:var(--inm-cy);font-size:12.5px;font-weight:600}.lab3d-inm .tt-t{font-size:18px;margin:2px 0 3px;color:var(--inm-tx)}.lab3d-inm .tt-x{font-size:14px;color:#b9c7de;margin:0 0 4px;min-height:0}',
            '.lab3d-inm .tt-puntos{display:none}.lab3d-inm .tt-pie button{height:48px;border-radius:12px;font-size:15px}.lab3d-inm .tt-pie .tt-ant{width:52px;font-size:20px;background:rgba(3,6,15,.4)}',
            '.lab3d-inm .tt-pie .tt-sig{padding:0 26px;background:linear-gradient(135deg,#38bdf8,#2563eb);border-color:transparent;color:#fff;box-shadow:0 10px 26px rgba(37,99,235,.45)}',
            '.lab3d-inm .tt-pie .tt-sig.tt-fin{background:rgba(3,6,15,.4);color:#93c5fd;box-shadow:none}',
            '.inm-steps{list-style:none;display:flex;gap:6px;margin:12px 0 0;padding:12px 0 0;border-top:1px solid rgba(125,211,252,.1);overflow-x:auto;scrollbar-width:none}',
            '.inm-steps li{flex:1 1 auto;display:flex;align-items:center}.inm-steps li:first-child{flex:0 0 auto}.inm-steps li+li::before{content:"";flex:1 1 14px;min-width:10px;height:1px;background:rgba(143,160,190,.3);margin-right:8px}',
            '.inm-steps button{flex:0 0 auto;display:flex;align-items:center;gap:8px;min-height:0;padding:2px 4px;border:0;background:none;color:var(--inm-mu);font-size:13px;cursor:pointer;opacity:.75}',
            '.inm-steps i{flex:0 0 26px;height:26px;display:grid;place-items:center;border-radius:50%;font-style:normal;font-weight:700;font-size:12px;border:1px solid rgba(143,160,190,.45);color:#cbd5e1}',
            '.inm-steps span{white-space:nowrap}',
            '.inm-steps li.is-on button{opacity:1}.inm-steps li.is-on i{background:var(--inm-cy);border-color:#bae6fd;color:#03060f;box-shadow:0 0 0 4px rgba(56,189,248,.22)}.inm-steps li.is-on span{color:#fff;font-weight:700}',
            '.inm-steps li.is-done i{background:rgba(52,211,153,.14);border-color:var(--inm-ve);color:var(--inm-ve)}',
            '.inm-bar{position:absolute;left:50%;transform:translateX(-50%);bottom:26px;z-index:8;width:min(860px,calc(100vw - 880px));padding:12px 18px}',

            /* etiquetas HUD de los equipos */
            '.lab3d-inm .lab3d-pins{z-index:4}',
            '.lab3d-inm .lab3d-pin>span{width:14px;height:14px;left:-7px;top:-7px;font-size:0;background:var(--inm-cy);border:3px solid rgba(3,6,15,.9);box-shadow:0 0 0 2px var(--inm-cy),0 0 14px var(--inm-cy)}',
            '.lab3d-inm .lab3d-pin.inm-act>span{background:var(--inm-ve);box-shadow:0 0 0 2px var(--inm-ve),0 0 16px var(--inm-ve)}',
            '.lab3d-inm .lab3d-pin>em{opacity:0;transition:opacity .25s;transform:none;pointer-events:auto;left:30px;top:-86px;max-width:240px;padding:8px 12px 8px 14px;border-radius:6px;background:rgba(3,10,26,.78);border:1px solid rgba(125,211,252,.14);border-left:2px solid var(--inm-cy);box-shadow:0 10px 26px rgba(0,0,0,.4);backdrop-filter:blur(8px)}',
            '.lab3d-inm .lab3d-pin.inm-lbl>em,.lab3d-inm .lab3d-pin:hover>em,.lab3d-inm .lab3d-pin.hl>em,.lab3d-inm .lab3d-pin.pin-open>em{opacity:1}',
            '.lab3d-inm .lab3d-pin>em::after{content:"";position:absolute;left:-23px;top:calc(100% - 2px);width:1px;height:var(--ln,78px);background:linear-gradient(180deg,var(--inm-cy),rgba(56,189,248,.15));transform:skewX(-17deg);transform-origin:top}',
            '.lab3d-inm .lab3d-pin em b{font-size:13px;color:var(--inm-tx)}.lab3d-inm .lab3d-pin em b::before{content:"● ";color:var(--inm-mu);font-size:10px}',
            '.lab3d-inm .lab3d-pin em small{font:500 11.5px/1.3 ' + M + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:210px;color:#93b4d8!important}',
            '.lab3d-inm .lab3d-pin.inm-act>em{border-left-color:var(--inm-ve)}.lab3d-inm .lab3d-pin.inm-act>em::after{background:linear-gradient(180deg,var(--inm-ve),rgba(52,211,153,.15))}',
            '.lab3d-inm .lab3d-pin.inm-act em b::before{color:var(--inm-ve)}.lab3d-inm .lab3d-pin.inm-act em small{color:#6ee7b7!important}',
            '.lab3d-inm .lab3d-pin:hover>em small,.lab3d-inm .lab3d-pin.pin-open>em small{white-space:normal}',

            /* cubo */
            '.inm-cube{position:absolute;right:26px;bottom:26px;z-index:8;width:112px;height:112px;min-height:0;padding:10px;cursor:pointer}',
            '.inm-cube svg{width:100%;height:100%;display:block}.inm-cube polygon{cursor:pointer;transition:fill .15s}.inm-cube polygon:hover{fill:rgba(56,189,248,.45)}',
            '.inm-cube text{font:700 10px ' + M + ';fill:#bae6fd;text-anchor:middle;pointer-events:none}',

            /* pantalla completa del navegador */
            '.lab3d-inm .lab3d-stage:fullscreen{width:100vw;height:100vh}',

            /* ===== distribución en cuadrícula: cada elemento en su propio espacio, nada encima de otra cosa ===== */
            '.lab3d-inm .lab3d-stage{display:grid!important;grid-template-columns:76px 340px minmax(0,1fr) 340px;grid-template-rows:auto max(360px,calc(100vh - 400px)) auto auto;gap:16px;padding:18px 22px!important;box-sizing:border-box;overflow-y:auto!important;overflow-x:hidden;scrollbar-width:thin;background:radial-gradient(120% 90% at 50% 0%,#0c1b3d 0%,#050b1c 55%,#03060f 100%)!important}',
            '.inm-top{position:relative;top:auto;left:auto;right:auto;grid-column:1/-1;grid-row:1;align-items:center;z-index:20}',
            '.lab3d-inm .lab3d-views{position:static;transform:none;pointer-events:auto}',
            '.inm-rail{position:relative;left:auto;top:auto;grid-column:1;grid-row:2;align-self:start;z-index:2}',
            '.inm-panel,.inm-panel.inm-ancho{position:relative;left:auto;top:auto;grid-column:2;grid-row:2;width:auto;max-height:100%;align-self:start;z-index:2}',
            '.lab3d-inm.inm-poff .inm-escena{grid-column:2/4}',
            '.inm-panel.inm-ancho{grid-column:2/4;max-width:640px}',
            '.inm-escena{position:relative;grid-column:3;grid-row:2;min-height:0;min-width:0;border-radius:22px;overflow:hidden;border:1px solid var(--inm-ln);background:#03060f;box-shadow:inset 0 0 60px rgba(56,189,248,.08)}',
            '.lab3d-inm .inm-escena .lab3d-canvas,.lab3d-inm .inm-escena .lab3d-pins,.lab3d-inm .inm-escena .lab3d-loading,.lab3d-inm .inm-escena .lab3d-fail{position:absolute;top:0;left:0;right:0;bottom:0;height:100%!important}',
            '.inm-der{grid-column:4;grid-row:2;display:flex;flex-direction:column;gap:16px;min-height:0;overflow:auto;scrollbar-width:none;z-index:2}',
            '.inm-res{position:relative;top:auto;right:auto;width:auto}',
            '.inm-mon{position:relative;top:auto;left:auto;transform:none;width:auto;min-width:0;display:block;clip-path:none;border-radius:18px;padding:14px 16px 12px}',
            '.inm-mon .inm-ring{width:84px;height:84px}.inm-mon .inm-ring b{font-size:18px}.inm-mon .inm-mbody{gap:12px}.inm-mchart svg{height:80px}.inm-mhead{letter-spacing:.18em;font-size:11px}',
            '.lab3d-inm .lab3d-controls{position:relative;left:auto;bottom:auto;top:auto;right:auto;grid-column:1/3;grid-row:3;align-self:end;width:auto;max-width:none;z-index:2}',
            '.lab3d-inm .lab3d-controls .lab3d-play{flex:0 0 auto}.lab3d-inm .lab3d-controls .lab3d-reset{flex:0 0 38px}.lab3d-inm .lab3d-scrub{min-width:60px}',
            '.lab3d-inm.inm-con-tutor .tt-tutor,.inm-bar{position:relative;left:auto;right:auto;top:auto;bottom:auto;transform:none;width:auto;min-width:0;max-width:none;grid-column:3;grid-row:3;z-index:2}',
            '.lab3d-inm .tt-tutor.tt-cerrado .tt-globo{display:grid}.lab3d-inm .tt-min{display:none!important}',
            '.inm-cube{position:relative;right:auto;bottom:auto;grid-column:4;grid-row:3;justify-self:end;align-self:end;z-index:2}',
            '.inm-grafbox{grid-column:1/-1;grid-row:4;position:relative;z-index:2;color:var(--inm-tx);background:var(--inm-glass);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);border:1px solid var(--inm-ln);border-radius:18px;box-shadow:0 18px 50px rgba(1,4,12,.55);scroll-margin-top:18px}',
            '.inm-grafbox::before{content:"";position:absolute;left:18px;right:18px;top:-1px;height:1px;background:linear-gradient(90deg,transparent,var(--inm-cy),var(--inm-vi),transparent)}',
            '.inm-gbody{padding:6px 22px 22px}.inm-gbody .p3-res{position:static;padding:0;margin:0;background:none;border:0;box-shadow:none;border-radius:0}.inm-gbody .p3-charts canvas{max-width:100%;height:auto}',

            /* pantallas medianas */
            '@media (max-width:1400px){.lab3d-inm .lab3d-stage{grid-template-columns:68px 300px minmax(0,1fr) 300px}.inm-badges{display:none}}',
            '@media (max-width:1180px){.inm-mon{display:none}.lab3d-inm .lab3d-stage{grid-template-columns:64px 280px minmax(0,1fr) 260px}.inm-tit span{display:none}}',

            /* tablet y móvil: todo en una columna con desplazamiento, cada bloque debajo del anterior */
            '@media (max-width:980px){',
              '.lab3d-inm .lab3d-stage{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:none;grid-auto-rows:auto;overflow-y:auto;padding:12px!important;gap:12px}',
              '.inm-top,.inm-rail,.inm-panel,.inm-panel.inm-ancho,.inm-escena,.lab3d-inm.inm-poff .inm-escena,.inm-der,.lab3d-inm .lab3d-controls,.lab3d-inm.inm-con-tutor .tt-tutor,.inm-bar{grid-column:1!important;grid-row:auto!important;max-width:none}',
              '.inm-top{flex-wrap:wrap;justify-content:center}.inm-top>div{padding:4px 10px 4px 4px}.inm-tit b{font-size:14px}.inm-crono,.inm-user,.inm-inf{display:none!important}.inm-back{width:36px;height:36px}',
              '.lab3d-inm .lab3d-views{order:3}.lab3d-inm .lab3d-views button{padding:6px 12px;font-size:12px}',
              '.inm-escena{height:52vh;order:2}.lab3d-inm .lab3d-pin>em{display:none!important}',
              '.lab3d-inm.inm-con-tutor .tt-tutor,.inm-bar{order:3;padding:10px 12px;gap:10px}.lab3d-inm .lab3d-controls{order:4}.inm-rail{order:5;display:flex;justify-content:center}.inm-panel{order:6;max-height:none}.inm-der{order:7;overflow:visible}',
              '.inm-cube,.inm-mon{display:none!important}',
              '.inm-grafbox{grid-column:1!important;grid-row:auto!important;order:8}',
              '.lab3d-inm .tt-cara{width:44px;height:44px}.lab3d-inm .tt-t{font-size:15px}.lab3d-inm .tt-x{font-size:12.5px}.lab3d-inm .tt-pie button{height:40px}.lab3d-inm .tt-pie .tt-sig{padding:0 14px}.inm-steps span{display:none}',
              '.lab3d-inm .tt-globo{grid-template-columns:1fr}.lab3d-inm .tt-pie{grid-column:1;grid-row:auto}.lab3d-inm .tt-cab{grid-column:1;justify-self:end}',
            '}',

            /* movimiento reducido */
            '@media (prefers-reduced-motion:reduce){.inm-panel{animation:none!important}.inm-rfg{transition:none}}'
        ].join('\n');
        doc.head.appendChild(st);
    })();
})(window);
