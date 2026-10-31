/**
 * GeoMetrics — Laboratorio 3D PRO (capa común para todas las máquinas de GeoLab3D)
 *
 * Se instala envolviendo GeoLab3D.mount(): no modifica las máquinas ni el visor original.
 * Añade, para cada simulador 3D:
 *   1. GUÍA PASO A PASO: anterior / reproducir paso / repetir paso / siguiente, modo guiado (se detiene al terminar cada
 *      etapa), cámara automática hacia la pieza que interviene, resaltado de la pieza y ficha técnica de la etapa
 *      (qué se hace, componente, por qué, variable medida, resultado esperado).
 *   2. PIEZAS: seleccionar (clic en la lista o en el modelo), ocultar, aislar, mostrar todo y vista de despiece.
 *   3. PARÁMETROS editables con símbolo, unidad (con selector de unidades), rango, descripción, validación y botones
 *      Aplicar / Ejecutar de nuevo / Valores predeterminados / Restablecer. (Máquinas con definición de parámetros.)
 *   4. RESULTADOS: tabla (dato · medido · calculado), gráficas dinámicas, comparación entre configuraciones,
 *      interpretación técnica e hipótesis del modelo.
 *
 * API para otros archivos:
 *   GeoLab3D.pro.over[tipo]  → { campo: valor } con los valores editados (las máquinas DM lo leen en sus params()).
 *   GeoLab3D.pro.defs[tipo]  → { fields, defaults, results(prm,p), charts:[{W,H,draw(ctx,W,H,prm,p)}], interp(prm,p),
 *                                hyp:[...], validate(prm) → [{lvl,msg}] }   (máquinas que no usan GeoSim2D.defs)
 *   Fases (META.phases[i]) pueden traer: pins:[índices de pieza], view:'detalle'…, why, meas, exp.
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D;
    if (!L3 || !L3.kit || L3.__pro) return;
    L3.__pro = true;
    var pro = L3.pro = L3.pro || {};
    pro.over = pro.over || {}; pro.defs = pro.defs || {}; pro.guide = pro.guide || {};
    var clamp = L3.kit.clamp;

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function fnum(v, d) { return (typeof v === 'number' && isFinite(v)) ? v.toFixed(d == null ? 2 : d) : (v == null ? '—' : String(v)); }

    /* ---------------- unidades (conversión solo de visualización) ---------------- */
    var UNITS = {
        'mm': [['mm', 1], ['cm', 0.1], ['in', 1 / 25.4]], 'cm': [['cm', 1], ['mm', 10], ['in', 1 / 2.54]],
        'kPa': [['kPa', 1], ['MPa', 0.001], ['psi', 0.145038]], 'MPa': [['MPa', 1], ['kPa', 1000], ['psi', 145.038]],
        'g': [['g', 1], ['kg', 0.001], ['lb', 0.00220462]], 'kg': [['kg', 1], ['g', 1000], ['lb', 2.20462]],
        'kg/m³': [['kg/m³', 1], ['lb/ft³', 0.062428]], 'kN/m³': [['kN/m³', 1], ['lbf/ft³', 6.36588]],
        'g/cm³': [['g/cm³', 1], ['kg/m³', 1000]], 'cm³': [['cm³', 1], ['L', 0.001]], 'L': [['L', 1], ['gal', 0.264172]],
        'kN': [['kN', 1], ['kgf', 101.972], ['lbf', 224.809]]
    };

    /* descripción física de los parámetros de los simuladores con GeoSim2D.defs */
    var DESC = {
        'corte.sn': 'Esfuerzo normal aplicado sobre el plano de corte; define la resistencia τ = c + σn·tan φ.',
        'corte.c': 'Intercepto de la envolvente de Mohr-Coulomb (resistencia sin carga normal).',
        'corte.phi': 'Pendiente de la envolvente: fricción interna entre partículas.',
        'corte.tipo': 'Cambia la combinación c–φ típica y el comportamiento del suelo.',
        'consolidacion.s0': 'Esfuerzo efectivo vertical antes del incremento de carga.',
        'consolidacion.s1': 'Esfuerzo efectivo final tras el incremento; Δσ = σ′₁ − σ′₀.',
        'consolidacion.e0': 'Relación de vacíos inicial (Vv/Vs) de la muestra.',
        'consolidacion.Cc': 'Pendiente de la curva e–log σ′ en la rama virgen (compresibilidad).',
        'consolidacion.Cv': 'Velocidad de disipación del exceso de presión de poros.',
        'consolidacion.dren': 'Trayectoria de drenaje: doble drenaje reduce la distancia a la mitad.',
        'triaxial.tipo': 'UU, CU o CD: define si hay consolidación y drenaje durante el corte.',
        'triaxial.s3': 'Presión de confinamiento aplicada al agua de la cámara.',
        'triaxial.c': 'Cohesión del suelo en términos del modelo de falla.',
        'triaxial.phi': 'Ángulo de fricción interna del suelo.',
        'humedad.Wh': 'Masa del suelo en estado natural (sin tara).',
        'humedad.w': 'Contenido de agua con que se genera el ejemplo: w = Mw / Ms.',
        'humedad.tara': 'Masa del recipiente, que se descuenta de las pesadas.',
        'granulometria.M': 'Masa seca total que se tamiza.',
        'granulometria.tipo': 'Distribución típica del suelo que se simula.',
        'limites.LL': 'Humedad en la que el suelo pasa de estado plástico a líquido.',
        'limites.IP': 'Rango de humedades en que el suelo es plástico: IP = LL − LP.',
        'limites.dw': 'Separación de la humedad de la prueba respecto al límite líquido.',
        'gravedad.Ws': 'Masa de suelo seco al horno usada en el picnómetro.',
        'gravedad.Gs': 'Densidad relativa de las partículas sólidas del suelo.',
        'gravedad.T': 'Temperatura del agua: cambia su densidad y la corrección de Gs.',
        'compactacion.energia': 'Energía por unidad de volumen aplicada (estándar o modificada).',
        'compactacion.gmax': 'Peso unitario seco máximo de la curva de compactación estándar.',
        'compactacion.wopt': 'Humedad a la que se alcanza γd máximo.',
        'compactacion.Gs': 'Gravedad específica usada para la curva de saturación completa.',
        'densidad.rs': 'Densidad de la arena calibrada que llena el hueco.',
        'densidad.V': 'Volumen del hueco excavado, obtenido de la arena usada.',
        'densidad.rh': 'Densidad húmeda in situ = masa húmeda / volumen.',
        'densidad.w': 'Humedad del suelo extraído del hueco.',
        'densidad.rdmax': 'Densidad seca máxima de laboratorio (Proctor) para el grado de compactación.',
        'clasificacion.F4': 'Porcentaje de material que pasa el tamiz No. 4.',
        'clasificacion.F200': 'Porcentaje de finos (pasa No. 200); decide entre suelo grueso y fino.',
        'clasificacion.LL': 'Límite líquido de la fracción fina.',
        'clasificacion.IP': 'Índice de plasticidad de la fracción fina.',
        'clasificacion.Cu': 'Coeficiente de uniformidad D60/D10.',
        'clasificacion.Cc': 'Coeficiente de curvatura D30²/(D10·D60).',
        'permeabilidad.tipo': 'Carga constante (suelos granulares) o variable (suelos finos).',
        'permeabilidad.lk': 'Logaritmo decimal de la conductividad hidráulica k (cm/s).',
        'permeabilidad.h': 'Diferencia de carga hidráulica que impulsa el flujo.',
        'permeabilidad.L': 'Longitud de la muestra recorrida por el agua.',
        'permeabilidad.D': 'Diámetro de la muestra; define el área de flujo.',
        'traccion.mat': 'Material de la probeta: define E, σy, σu y ductilidad.',
        'traccion.d': 'Diámetro de la sección calibrada; define el área A₀.',
        'traccion.L0': 'Longitud de medida del extensómetro para ε = ΔL/L₀.',
        'compresion.mat': 'Material del cilindro: define resistencia y modo de falla.',
        'compresion.f': 'Escala la resistencia del material respecto al valor nominal.',
        'compresion.d': 'Diámetro del cilindro; define el área cargada.',
        'flexion.mat': 'Material de la viga: define E y módulo de rotura.',
        'flexion.L': 'Distancia entre apoyos; el momento máximo crece con L.',
        'flexion.b': 'Ancho de la sección; I = b·h³/12.',
        'flexion.h': 'Altura de la sección; domina la rigidez (h³).',
        'torsion.mat': 'Material de la barra: define G y resistencia al corte.',
        'torsion.d': 'Diámetro de la barra; J = π·d⁴/32.',
        'torsion.L': 'Longitud calibrada donde se mide el ángulo de torsión.',
        'dureza.esc': 'Escala Rockwell: define penetrador y carga principal.',
        'dureza.hr': 'Dureza del material ensayado en la escala elegida.',
        'inconfinada.d': 'Diámetro de la probeta cilíndrica.',
        'inconfinada.L0': 'Altura inicial de la probeta (relación L/D ≈ 2).',
        'inconfinada.qu': 'Resistencia a compresión inconfinada; cu = qu/2.',
        'inconfinada.epsf': 'Deformación axial en la que ocurre la falla.',
        'inconfinada.falla': 'Modo de falla: cortante, abarrilamiento o frágil.'
    };

    function fieldsOf(tipo, prm) {
        var d = pro.defs[tipo], src = (d && d.fields) || (prm && prm.def && prm.def.fields) || null;
        if (!src) return null;
        return src.map(function (f) {
            return {
                id: f.id, label: f.label, unit: f.unit || '', min: f.min, max: f.max, step: f.step || 1, dec: f.dec == null ? 2 : f.dec,
                type: f.type || (f.options ? 'select' : 'num'), options: f.options, value: f.value,
                desc: f.desc || DESC[tipo + '.' + f.id] || ''
            };
        });
    }
    function defaultsOf(tipo, fields) {
        var d = pro.defs[tipo], o = {};
        fields.forEach(function (f) { o[f.id] = d && d.defaults && d.defaults[f.id] != null ? d.defaults[f.id] : f.value; });
        return o;
    }
    function applyOverSim2d(prm, over) {
        if (!over || !prm || !prm.def || !prm.P || prm.__pro) return prm;
        var any = false;
        Object.keys(over).forEach(function (k) { prm.P[k] = over[k]; any = true; });
        if (!any) return prm;
        prm.M = prm.def.model(prm.P); prm.real = false; prm.__pro = true;
        prm.nota = 'Parámetros editados por ti en el panel de configuración (modelo educativo del simulador 2D).';
        return prm;
    }

    /* ===================================================================== */
    /*  Instalación sobre mount()                                             */
    /* ===================================================================== */
    var baseMount = L3.mount;
    L3.mount = function (host, tipo) {
        var handle = baseMount(host, tipo);
        if (handle && handle.instance && L3.meta[tipo]) {
            try { whenReady(handle.instance, function () { attach(handle.instance, host, tipo); }); } catch (e) { console.warn('Lab3D PRO', e); }
        }
        return handle;
    };
    function whenReady(inst, fn) {
        var t0 = performance.now();
        (function poll() {
            if (inst.disposed) return;
            if (inst.ready && inst.machine) { fn(); return; }
            if (performance.now() - t0 > 20000) return;
            setTimeout(poll, 120);
        })();
    }

    function attach(inst, host, tipo) {
        var meta = L3.meta[tipo], q = function (s) { return host.querySelector(s); };
        var root = q('.lab3d'); if (!root || root.__pro) return; root.__pro = true;
        var scrub = q('.lab3d-scrub'), btnPlay = q('.lab3d-play'), pasoBox = q('.lab3d-paso'), partsList = q('.lab3d-parts'), info = q('.lab3d-info'), noteEl = q('.lab3d-note');
        var machine = inst.machine, scene = inst.scene, rootObj = machine.root, phases = meta.phases, stage = q('.lab3d-stage');
        var P3 = { guided: false, autocam: true, stopAt: null, phase: -1, hidden: {}, iso: -1, sel: -1, explode: 0, lastChartP: -1, lastPrm: null, snaps: [] };
        var canvasBox = q('.lab3d-canvas');
        var origSet = machine.set;

        /* ---------- util: avance externo ---------- */
        function updatePlayBtn() {
            btnPlay.textContent = inst.playing ? '⏸ Pausar' : (inst.p >= 0.999 ? '↻ Repetir ensayo' : (inst.p > 0.001 ? '▶ Continuar' : '▶ Iniciar ensayo'));
            btnPlay.classList.toggle('is-playing', !!inst.playing);
        }
        function seek(p, play) {
            scrub.value = String(Math.round(clamp(p, 0, 1) * 1000));
            scrub.dispatchEvent(new Event('input', { bubbles: true }));
            if (play) { inst.playing = true; P3.stopAt = null; }
            updatePlayBtn();
        }
        function reapply() { if (!inst.playing) { scrub.dispatchEvent(new Event('input', { bubbles: true })); updatePlayBtn(); } }
        function phaseOf(p) { var k = 0; for (var i = 0; i < phases.length; i++) if (p >= phases[i].a) k = i; return k; }

        /* ===================== PIEZAS: asignación malla → pieza ===================== */
        var meshes = [], pinsN = (meta.parts || []).length;
        (function assignMeshes() {
            scene.updateMatrixWorld(true);
            rootObj.traverse(function (o) { if (o.isMesh) meshes.push({ m: o, pin: -1, ground: false }); });
            var B = new THREE.Box3();
            meshes.forEach(function (it) {
                B.setFromObject(it.m);
                if (!isFinite(B.max.y)) { it.ground = true; return; }
                if (B.max.y < 0.14) { it.ground = true; return; }
                var best = -1, bd = 1e9;
                for (var i = 0; i < inst.pinVecs.length; i++) { var d = B.distanceToPoint(inst.pinVecs[i]); if (d < bd - 1e-6) { bd = d; best = i; } }
                if (bd <= 0.9) it.pin = best;
            });
        })();
        function meshesOf(pin) { return meshes.filter(function (it) { return it.pin === pin; }); }
        var helper = null;
        try { helper = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(meta.accent)); helper.visible = false; scene.add(helper); } catch (e) { helper = null; }
        function updateHelper() {
            if (!helper) return;
            if (P3.sel < 0) { helper.visible = false; return; }
            var B = new THREE.Box3(), any = false, B2 = new THREE.Box3();
            meshesOf(P3.sel).forEach(function (it) { if (!it.m.visible) return; B2.setFromObject(it.m); if (isFinite(B2.max.x)) { B.union(B2); any = true; } });
            if (!any) { var v = inst.pinVecs[P3.sel]; if (v) { B.setFromCenterAndSize(v, new THREE.Vector3(0.5, 0.5, 0.5)); any = true; } }
            if (any) { B.min.subScalar(0.06); B.max.addScalar(0.06); helper.box.copy(B); }
            helper.visible = any;
        }
        function visOf(it) {
            if (it.ground) return true;
            if (it.pin < 0) return P3.iso < 0;
            if (P3.hidden[it.pin]) return false;
            return P3.iso < 0 || P3.iso === it.pin;
        }
        function applyVis() { meshes.forEach(function (it) { if (!visOf(it)) it.m.visible = false; }); }
        function restoreVis() { meshes.forEach(function (it) { if (visOf(it)) it.m.visible = true; }); }

        /* ---------- despiece: desplaza los hijos directos del modelo ---------- */
        var kids = [];
        (function prepExplode() {
            var B = new THREE.Box3(), all = new THREE.Box3(), c = new THREE.Vector3();
            rootObj.children.forEach(function (ch) {
                B.setFromObject(ch);
                if (!isFinite(B.max.y) || B.max.y < 0.14) return;
                var cc = B.getCenter(new THREE.Vector3()); kids.push({ o: ch, c: cc, last: new THREE.Vector3() }); all.union(B);
            });
            var ctr = all.getCenter(c);
            kids.forEach(function (k) { var d = k.c.clone().sub(ctr); d.y *= 0.9; if (d.length() < 0.25) d.set(0, 0.35, 0); k.dir = d; });
        })();
        function unExplode() { kids.forEach(function (k) { k.o.position.sub(k.last); k.last.set(0, 0, 0); }); }
        function doExplode() {
            if (P3.explode <= 0) return;
            kids.forEach(function (k) { k.last.copy(k.dir).multiplyScalar(P3.explode * 1.1); k.o.position.add(k.last); });
        }

        /* ===================== GUÍA PASO A PASO ===================== */
        var guide = el('div', 'p3-guide');
        guide.innerHTML =
            '<div class="p3-dots" role="list"></div>' +
            '<div class="p3-gbtns">' +
              '<button type="button" data-g="prev" title="Volver a la etapa anterior">⏮ Anterior</button>' +
              '<button type="button" data-g="play" class="is-main" title="Reproducir la etapa actual">▶ Reproducir paso</button>' +
              '<button type="button" data-g="replay" title="Repetir la etapa actual">↺ Repetir paso</button>' +
              '<button type="button" data-g="next" title="Pasar a la etapa siguiente">Siguiente ⏭</button>' +
              '<button type="button" data-g="more" aria-expanded="false">ℹ Más información</button>' +
            '</div>' +
            '<div class="p3-gopts"><label><input type="checkbox" class="p3-guided"> <span>Modo guiado (se detiene al terminar cada etapa)</span></label>' +
            '<label><input type="checkbox" class="p3-autocam" checked> <span>Cámara automática</span></label></div>' +
            '<div class="p3-more" hidden></div>';
        if (pasoBox) pasoBox.appendChild(guide);
        var dots = guide.querySelector('.p3-dots'), more = guide.querySelector('.p3-more');
        phases.forEach(function (ph, i) {
            var b = el('button', 'p3-dot', '<i>' + (i + 1) + '</i>'); b.type = 'button'; b.title = 'Etapa ' + (i + 1) + ': ' + ph.t;
            b.addEventListener('click', function () { goPhase(i, P3.guided); });
            dots.appendChild(b);
        });
        function goPhase(i, play) {
            i = clamp(i, 0, phases.length - 1);
            var a = phases[i].a;
            P3.stopAt = null;
            inst.playing = false;
            seek(a + 0.0006, false);
            if (play) { inst.playing = true; P3.stopAt = null; updatePlayBtn(); }
        }
        guide.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-g]'); if (!b) return;
            var g = b.getAttribute('data-g'), cur = phaseOf(inst.p);
            if (g === 'prev') goPhase(Math.max(0, cur - 1), P3.guided);
            else if (g === 'next') goPhase(Math.min(phases.length - 1, cur + 1), P3.guided);
            else if (g === 'replay') goPhase(cur, true);
            else if (g === 'play') {
                if (inst.playing) { inst.playing = false; updatePlayBtn(); }
                else {
                    var endP = Math.min(1, phases[cur].b), atEnd = inst.p >= endP - 0.004, mid = inst.p > phases[cur].a + 0.004 && !atEnd;
                    if (mid) { inst.playing = true; P3.stopAt = null; updatePlayBtn(); }
                    else goPhase(atEnd && cur < phases.length - 1 ? cur + 1 : cur, true);
                }
            }
            else if (g === 'more') { more.hidden = !more.hidden; b.setAttribute('aria-expanded', String(!more.hidden)); }
        });
        guide.querySelector('.p3-guided').addEventListener('change', function () { P3.guided = this.checked; P3.stopAt = null; });
        guide.querySelector('.p3-autocam').addEventListener('change', function () { P3.autocam = this.checked; if (this.checked) onPhase(phaseOf(inst.p), true); });

        function focusCam(pins, viewName) {
            var g = inst.goal; if (!g) return;
            var v = meta.cam[viewName] || meta.cam.detalle || meta.cam.home, t = v.target || meta.cam.target;
            if (pins && pins.length) {
                var cx = 0, cy = 0, cz = 0, n = 0;
                pins.forEach(function (i) { var p = inst.pinVecs[i]; if (p) { cx += p.x; cy += p.y; cz += p.z; n++; } });
                if (n) { g.tx = cx / n; g.ty = cy / n; g.tz = cz / n; g.radius = Math.max(3.4, (meta.cam.detalle || v).radius * 0.95); g.theta = v.theta; g.phi = v.phi; }
            } else { g.tx = t[0]; g.ty = t[1]; g.tz = t[2]; g.radius = v.radius; g.theta = v.theta; g.phi = v.phi; }
            var bs = host.querySelectorAll('.lab3d-views [data-view]');
            for (var i2 = 0; i2 < bs.length; i2++) bs[i2].classList.toggle('on', !pins && bs[i2].getAttribute('data-view') === viewName);
        }
        function highlightPins(pins) {
            var items = host.querySelectorAll('.lab3d-pins .lab3d-pin'), lis = host.querySelectorAll('.lab3d-parts li');
            for (var i = 0; i < items.length; i++) { var on = pins && pins.indexOf(i) >= 0; items[i].classList.toggle('p3-focus', !!on); if (lis[i]) lis[i].classList.toggle('p3-focus', !!on); }
        }
        function onPhase(i, force) {
            if (i === P3.phase && !force) return;
            P3.phase = i;
            var ph = phases[i] || {};
            var ds = dots.children;
            for (var k = 0; k < ds.length; k++) { ds[k].classList.toggle('is-on', k === i); ds[k].classList.toggle('is-done', k < i); }
            var comps = (ph.pins || []).map(function (pi) { return meta.parts[pi] && meta.parts[pi].name; }).filter(Boolean);
            more.innerHTML =
                '<dl><dt>Objetivo de la etapa</dt><dd>' + esc(ph.d || '') + '</dd>' +
                (comps.length ? '<dt>Componente que interviene</dt><dd>' + esc(comps.join(' · ')) + '</dd>' : '') +
                (ph.why ? '<dt>Por qué se hace</dt><dd>' + esc(ph.why) + '</dd>' : '') +
                (ph.meas ? '<dt>Variable que se mide</dt><dd>' + esc(ph.meas) + '</dd>' : '') +
                (ph.exp ? '<dt>Resultado esperado</dt><dd>' + esc(ph.exp) + '</dd>' : '') + '</dl>' +
                ((ph.why || ph.meas || ph.exp) ? '' : '<p class="p3-hint">Esta etapa aún no tiene ficha ampliada; consulta el paso a paso y la ficha de la máquina.</p>');
            highlightPins(ph.pins);
            if (P3.autocam && inst.goal && P3.sel < 0) { if (inst.p > 0.002) focusCam(ph.pins, ph.view || (ph.pins ? 'detalle' : 'home')); else if (!force) focusCam(null, 'home'); }
        }

        /* ===================== HERRAMIENTAS DE PIEZAS ===================== */
        var tools = el('div', 'p3-tools');
        tools.innerHTML =
            '<h5>Explorar el equipo</h5>' +
            '<label class="p3-exp"><span>Despiece</span><input type="range" class="p3-explode" min="0" max="100" value="0" aria-label="Vista de despiece"><output>0 %</output></label>' +
            '<div class="p3-trow"><button type="button" class="p3-showall">Mostrar todo</button><button type="button" class="p3-home">Vista general</button></div>' +
            '<div class="p3-sel" hidden></div>';
        if (info) { var h5s = info.querySelectorAll('h5'); info.insertBefore(tools, h5s[0] || null); }
        var selBox = tools.querySelector('.p3-sel'), expR = tools.querySelector('.p3-explode'), expO = tools.querySelector('output');
        function renderSel() {
            if (P3.sel < 0) { selBox.hidden = true; return; }
            var pt = meta.parts[P3.sel] || {};
            selBox.hidden = false;
            selBox.innerHTML = '<b>' + (P3.sel + 1) + '. ' + esc(pt.name) + '</b><p>' + esc(pt.desc) + '</p>' +
                '<div class="p3-trow"><button type="button" data-a="hide">' + (P3.hidden[P3.sel] ? 'Mostrar' : 'Ocultar') + '</button><button type="button" data-a="iso">' + (P3.iso === P3.sel ? 'Quitar aislamiento' : 'Aislar') + '</button><button type="button" data-a="cam">Acercar</button></div>';
        }
        function refreshListState() {
            var lis = partsList.querySelectorAll('li');
            for (var i = 0; i < lis.length; i++) {
                lis[i].classList.toggle('p3-sel', i === P3.sel); lis[i].classList.toggle('p3-hid', !!P3.hidden[i]);
                lis[i].classList.toggle('p3-iso', i === P3.iso);
            }
        }
        function select(i, camera) {
            P3.sel = (P3.sel === i && !camera) ? -1 : i;
            renderSel(); refreshListState(); updateHelper();
            if (P3.sel >= 0 && camera) focusCam([P3.sel], 'detalle');
        }
        function setHidden(i, v) {
            if (v) P3.hidden[i] = true; else delete P3.hidden[i];
            if (!v) restoreVis(); applyVis(); reapply(); renderSel(); refreshListState(); updateHelper();
        }
        function setIso(i) {
            P3.iso = (P3.iso === i) ? -1 : i;
            restoreVis(); applyVis(); reapply(); renderSel(); refreshListState(); updateHelper();
        }
        selBox.addEventListener('click', function (e) {
            var b = e.target.closest('button[data-a]'); if (!b || P3.sel < 0) return;
            var a = b.getAttribute('data-a');
            if (a === 'hide') setHidden(P3.sel, !P3.hidden[P3.sel]); else if (a === 'iso') setIso(P3.sel); else if (a === 'cam') focusCam([P3.sel], 'detalle');
        });
        tools.querySelector('.p3-showall').addEventListener('click', function () { P3.hidden = {}; P3.iso = -1; restoreVis(); applyVis(); reapply(); renderSel(); refreshListState(); updateHelper(); });
        tools.querySelector('.p3-home').addEventListener('click', function () { P3.sel = -1; renderSel(); refreshListState(); updateHelper(); focusCam(null, 'home'); });
        expR.addEventListener('input', function () {
            P3.explode = parseInt(expR.value, 10) / 100; expO.textContent = expR.value + ' %';
            if (!inst.playing) { unExplode(); doExplode(); } else { /* se aplica en el siguiente fotograma de la animación */ }
        });
        /* botones por pieza en la lista de componentes */
        Array.prototype.forEach.call(partsList.querySelectorAll('li'), function (li, i) {
            var w = el('span', 'p3-lbtn', '<button type="button" data-act="hide" title="Ocultar / mostrar pieza" aria-label="Ocultar pieza">👁</button><button type="button" data-act="iso" title="Aislar pieza" aria-label="Aislar pieza">◎</button>');
            li.appendChild(w);
            li.addEventListener('click', function (e) {
                var b = e.target.closest('button[data-act]');
                if (b) { e.stopPropagation(); if (b.getAttribute('data-act') === 'hide') setHidden(i, !P3.hidden[i]); else { setIso(i); } return; }
                select(i, true);
            });
        });
        /* clic en el modelo 3D */
        (function pick() {
            var dom = inst.renderer.domElement, down = null, ray = new THREE.Raycaster(), v2 = new THREE.Vector2();
            dom.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
            dom.addEventListener('pointerup', function (e) {
                if (!down) return; var dx = e.clientX - down.x, dy = e.clientY - down.y, dt = performance.now() - down.t; down = null;
                if (dx * dx + dy * dy > 25 || dt > 450) return;
                var r = dom.getBoundingClientRect(); v2.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
                ray.setFromCamera(v2, inst.camera);
                var hits = ray.intersectObjects(rootObj.children, true), pin = -1;
                for (var i = 0; i < hits.length; i++) {
                    var h = hits[i].object; if (!h.visible) continue;
                    for (var k = 0; k < meshes.length; k++) if (meshes[k].m === h) { pin = meshes[k].ground ? -1 : meshes[k].pin; break; }
                    if (pin >= 0) break;
                }
                if (pin >= 0) select(pin, false); else if (P3.sel >= 0) select(P3.sel, false);
            });
        })();

        /* ===================== PARÁMETROS ===================== */
        var prm0 = inst.prm, fields = fieldsOf(tipo, prm0), def = pro.defs[tipo] || null, isSim2d = !!(prm0 && prm0.def && !def);
        var live = true, pendingVals = {}, uSel = {};
        var pBox = null;
        function curVal(f) { var P = inst.prm && inst.prm.P; return P && P[f.id] != null ? P[f.id] : f.value; }
        function unitFactor(f) { var u = UNITS[f.unit]; if (!u) return 1; var s = uSel[f.id] || f.unit, hit = u.filter(function (x) { return x[0] === s; })[0]; return hit ? hit[1] : 1; }
        function dispDec(f) { var k = unitFactor(f); return k === 1 ? f.dec : Math.max(f.dec, k < 0.01 ? 4 : (k < 1 ? 3 : 1)); }
        function fmtV(f, v) { return (v * unitFactor(f)).toFixed(dispDec(f)); }
        function msgsFor(f, txt, lvl) { var m = pBox.querySelector('.p3-f[data-id="' + f.id + '"] .p3-w'); if (m) { m.textContent = txt || ''; m.className = 'p3-w' + (txt ? ' is-' + (lvl || 'warn') : ''); } }

        function buildParams() {
            if (!fields || !fields.length) return;
            pBox = el('aside', 'p3-params');
            pBox.innerHTML =
                '<div class="p3-phead"><h5>Parámetros del ensayo</h5><button type="button" class="p3-col" aria-label="Contraer panel" title="Contraer / expandir">⟨</button></div>' +
                '<div class="p3-pbody"><label class="p3-live"><input type="checkbox" checked> <span>Actualizar en vivo al editar</span></label>' +
                '<div class="p3-fields"></div><div class="p3-msgs" role="status"></div>' +
                '<div class="p3-pbtns"><button type="button" class="p3-apply is-main">Aplicar cambios</button><button type="button" class="p3-run">▶ Ejecutar de nuevo</button>' +
                '<button type="button" class="p3-defaults">Valores predeterminados</button><button type="button" class="p3-reset">Restablecer</button></div>' +
                '<p class="p3-hint">Los resultados salen de las ecuaciones del modelo del ensayo; al cambiar un valor se recalculan la máquina, los indicadores y las gráficas.</p></div>';
            root.insertBefore(pBox, root.firstChild); root.classList.add('p3-on');
            var fb = pBox.querySelector('.p3-fields');
            fields.forEach(function (f) { fb.appendChild(fieldRow(f)); });
            pBox.querySelector('.p3-col').addEventListener('click', function () { root.classList.toggle('p3-collapsed'); this.textContent = root.classList.contains('p3-collapsed') ? '⟩' : '⟨'; });
            pBox.querySelector('.p3-live input').addEventListener('change', function () { live = this.checked; });
            pBox.querySelector('.p3-apply').addEventListener('click', function () { commit(); });
            pBox.querySelector('.p3-run').addEventListener('click', function () { commit(true); seek(0, false); inst.playing = true; P3.stopAt = null; updatePlayBtn(); });
            pBox.querySelector('.p3-defaults').addEventListener('click', function () { pro.over[tipo] = defaultsOf(tipo, fields); pendingVals = {}; recompute(); syncFields(); });
            pBox.querySelector('.p3-reset').addEventListener('click', function () { pro.over[tipo] = {}; pendingVals = {}; recompute(); syncFields(); });
        }
        function fieldRow(f) {
            var row = el('div', 'p3-f'); row.setAttribute('data-id', f.id);
            var v = curVal(f), unitHtml = '';
            if (f.type === 'select') {
                row.innerHTML = '<label class="p3-l" for="p3-' + tipo + '-' + f.id + '"><b>' + esc(f.label) + '</b></label><select id="p3-' + tipo + '-' + f.id + '">' +
                    f.options.map(function (o) { return '<option value="' + esc(o[0]) + '">' + esc(o[1]) + '</option>'; }).join('') + '</select>' +
                    (f.desc ? '<em class="p3-d">' + esc(f.desc) + '</em>' : '') + '<span class="p3-w"></span>';
                var s = row.querySelector('select'); s.value = String(v);
                s.addEventListener('change', function () { var raw = s.value, opt = f.options.filter(function (o) { return String(o[0]) === raw; })[0]; stage_(f, typeof f.options[0][0] === 'number' ? parseFloat(raw) : raw); });
                return row;
            }
            var u = UNITS[f.unit];
            if (u) unitHtml = '<select class="p3-u" aria-label="Unidad de ' + esc(f.label) + '">' + u.map(function (x) { return '<option value="' + x[0] + '">' + x[0] + '</option>'; }).join('') + '</select>';
            else if (f.unit) unitHtml = '<span class="p3-u1">' + esc(f.unit) + '</span>';
            row.innerHTML = '<label class="p3-l" for="p3-' + tipo + '-' + f.id + '"><b>' + esc(f.label) + '</b></label>' +
                '<div class="p3-in"><input type="number" id="p3-' + tipo + '-' + f.id + '" inputmode="decimal">' + unitHtml + '</div>' +
                '<input type="range" class="p3-rg" aria-label="' + esc(f.label) + '">' +
                '<span class="p3-rng"></span>' + (f.desc ? '<em class="p3-d">' + esc(f.desc) + '</em>' : '') + '<span class="p3-w"></span>';
            var num = row.querySelector('input[type=number]'), rg = row.querySelector('.p3-rg'), us = row.querySelector('select.p3-u');
            function paintRange() {
                var k = unitFactor(f), dd = dispDec(f), st = f.step * k;
                num.min = (f.min * k).toFixed(dd); num.max = (f.max * k).toFixed(dd); num.step = st < 1e-4 ? 'any' : String(+st.toPrecision(3));
                rg.min = f.min; rg.max = f.max; rg.step = f.step;
                row.querySelector('.p3-rng').textContent = 'Rango: ' + (f.min * k).toFixed(dd) + ' – ' + (f.max * k).toFixed(dd) + ' ' + (uSel[f.id] || f.unit);
            }
            row.__paint = function () { paintRange(); var val = pendingVals[f.id] != null ? pendingVals[f.id] : curVal(f); num.value = fmtV(f, val); rg.value = val; };
            if (us) us.addEventListener('change', function () { uSel[f.id] = us.value; row.__paint(); });
            rg.addEventListener('input', function () { var val = parseFloat(rg.value); num.value = fmtV(f, val); msgsFor(f, ''); stage_(f, val); });
            num.addEventListener('change', function () {
                var k = unitFactor(f), raw = parseFloat(num.value);
                if (!isFinite(raw)) { msgsFor(f, 'Escribe un valor numérico.', 'bad'); num.value = fmtV(f, curVal(f)); return; }
                var val = raw / k, c = clamp(val, f.min, f.max);
                if (c !== val) msgsFor(f, 'Valor fuera de rango (' + (f.min * k).toFixed(dispDec(f)) + ' – ' + (f.max * k).toFixed(dispDec(f)) + ' ' + (uSel[f.id] || f.unit) + '). Se ajustó a ' + fmtV(f, c) + '.', 'warn'); else msgsFor(f, '');
                num.value = fmtV(f, c); rg.value = c; stage_(f, c);
            });
            row.__paint();
            return row;
        }
        function syncFields() { if (!pBox) return; Array.prototype.forEach.call(pBox.querySelectorAll('.p3-f'), function (r) { if (r.__paint) r.__paint(); else { var f = fields.filter(function (x) { return x.id === r.getAttribute('data-id'); })[0], s = r.querySelector('select'); if (f && s) s.value = String(curVal(f)); } }); showMsgs(); }
        function stage_(f, val) {
            pendingVals[f.id] = val;
            if (live) commit();
            else pBox.querySelector('.p3-apply').classList.add('is-dirty');
        }
        function commit(silent) {
            var o = pro.over[tipo] = pro.over[tipo] || {};
            Object.keys(pendingVals).forEach(function (k) { o[k] = pendingVals[k]; });
            pendingVals = {}; if (pBox) pBox.querySelector('.p3-apply').classList.remove('is-dirty');
            recompute();
        }
        function recompute() {
            inst.prm = L3.get(tipo).params();
            if (isSim2d) inst.prm = applyOverSim2d(inst.prm, pro.over[tipo]);
            if (noteEl) noteEl.innerHTML = '<b>' + (inst.prm.real ? 'Datos del ensayo' : 'Modo demostración') + '</b> ' + esc(inst.prm.nota || '');
            P3.lastPrm = null; P3.stopAt = null;
            reapply(); refreshResults(true); showMsgs();
        }
        function showMsgs() {
            if (!pBox) return;
            var box = pBox.querySelector('.p3-msgs'), arr = (def && def.validate) ? def.validate(inst.prm) : [];
            box.innerHTML = arr.map(function (m) { return '<div class="p3-m is-' + (m.lvl || 'warn') + '">' + (m.lvl === 'bad' ? '⛔ ' : '⚠ ') + esc(m.msg) + '</div>'; }).join('');
        }

        /* ===================== RESULTADOS Y GRÁFICAS ===================== */
        var resBox = null, charts = [], hasRes = !!(def || isSim2d);
        function chartDefs() {
            if (def && def.charts) return def.charts.map(function (c) { return { W: c.W || 480, H: c.H || 300, draw: function (ctx, prm, p) { c.draw(ctx, c.W || 480, c.H || 300, prm, p); } }; });
            if (isSim2d && inst.prm.def.charts) return inst.prm.def.charts.map(function (c) { return { W: c.W, H: c.H, draw: function (ctx, prm, p) { var S = prm.def.at(prm.P, prm.M, p); c.draw(ctx, c.W, c.H, prm.P, prm.M, S, p); } }; });
            return [];
        }
        function rowsOf(prm, p) {
            if (def && def.results) return def.results(prm, p);
            if (isSim2d) {
                var d = prm.def, S = d.at(prm.P, prm.M, p), F = d.at(prm.P, prm.M, 1), out = [];
                (d.readouts || []).forEach(function (r) {
                    var f = function (v) { return typeof v === 'number' ? v.toFixed(r.dec == null ? 2 : r.dec) : (v == null ? '—' : String(v)); };
                    out.push({ l: r.label, u: r.unit || '', now: f(S[r.k]), fin: f(F[r.k]), kind: 'Medido' });
                });
                return out;
            }
            return [];
        }
        function paramRows(prm) {
            return (fields || []).map(function (f) {
                var v = prm.P ? prm.P[f.id] : null, disp = f.type === 'select' ? (f.options.filter(function (o) { return String(o[0]) === String(v); })[0] || [v, v])[1] : fmtV(f, +v) + ' ' + (uSel[f.id] || f.unit);
                return { l: f.label, v: disp };
            });
        }
        function buildResults() {
            if (!hasRes) return;
            resBox = el('section', 'p3-res');
            resBox.innerHTML =
                '<div class="p3-rhead"><h5>Resultados del ensayo</h5><div class="p3-rbtns"><button type="button" class="p3-snap">📌 Guardar para comparar</button><button type="button" class="p3-clr">Limpiar</button></div></div>' +
                '<div class="p3-rgrid"><div class="p3-tblwrap"><table class="p3-tbl"><thead><tr><th>Magnitud</th><th>Tipo</th><th>Ahora</th><th>Valor final</th></tr></thead><tbody></tbody></table>' +
                '<details class="p3-inputs"><summary>Datos de entrada</summary><ul></ul></details></div>' +
                '<div class="p3-charts"></div></div>' +
                '<div class="p3-cmp" hidden></div>' +
                '<details class="p3-interp" open><summary>Interpretación técnica</summary><div class="p3-ibody"></div></details>' +
                '<details class="p3-hyp"><summary>Hipótesis y simplificaciones del modelo</summary><ul class="p3-hbody"></ul></details>';
            var foot = q('.lab3d-footer'); (foot || root).appendChild(resBox);
            var cb = resBox.querySelector('.p3-charts');
            charts = chartDefs().map(function (c) { var cv = el('canvas', 'p3-chart'); cb.appendChild(cv); return { c: c, cv: cv }; });
            resBox.querySelector('.p3-snap').addEventListener('click', function () {
                if (P3.snaps.length >= 4) P3.snaps.shift();
                var prm = inst.prm, rows = rowsOf(prm, 1);
                P3.snaps.push({ name: 'Config. ' + (P3.snapN = (P3.snapN || 0) + 1), rows: rows.map(function (r) { return { l: r.l, u: r.u, v: r.fin }; }), inputs: paramRows(prm) });
                renderCmp();
            });
            resBox.querySelector('.p3-clr').addEventListener('click', function () { P3.snaps = []; renderCmp(); });
        }
        function renderCmp() {
            var b = resBox.querySelector('.p3-cmp');
            if (!P3.snaps.length) { b.hidden = true; return; }
            b.hidden = false;
            var labels = P3.snaps[P3.snaps.length - 1].rows.map(function (r) { return r.l; }), inLabels = P3.snaps[P3.snaps.length - 1].inputs.map(function (r) { return r.l; });
            var h = '<h6>Comparación entre configuraciones (valores finales del ensayo)</h6><div class="p3-cmpwrap"><table class="p3-tbl"><thead><tr><th></th>' + P3.snaps.map(function (s) { return '<th>' + esc(s.name) + '</th>'; }).join('') + '</tr></thead><tbody>';
            inLabels.forEach(function (l, i) { h += '<tr class="is-in"><td>' + esc(l) + '</td>' + P3.snaps.map(function (s) { return '<td>' + esc(s.inputs[i] ? s.inputs[i].v : '—') + '</td>'; }).join('') + '</tr>'; });
            labels.forEach(function (l, i) { h += '<tr><td>' + esc(l) + (P3.snaps[0].rows[i] && P3.snaps[0].rows[i].u ? ' <small>[' + esc(P3.snaps[0].rows[i].u) + ']</small>' : '') + '</td>' + P3.snaps.map(function (s) { return '<td><b>' + esc(s.rows[i] ? s.rows[i].v : '—') + '</b></td>'; }).join('') + '</tr>'; });
            b.innerHTML = h + '</tbody></table></div>';
        }
        function refreshResults(force) {
            if (!resBox) return;
            var prm = inst.prm, p = inst.p;
            if (!force && Math.abs(p - P3.lastChartP) < 0.003 && P3.lastPrm === prm) return;
            P3.lastChartP = p; P3.lastPrm = prm;
            var rows = rowsOf(prm, p), tb = resBox.querySelector('tbody');
            tb.innerHTML = rows.map(function (r) { return '<tr><td>' + esc(r.l) + (r.u ? ' <small>[' + esc(r.u) + ']</small>' : '') + '</td><td><i class="p3-k is-' + esc(String(r.kind || '').toLowerCase()) + '">' + esc(r.kind || '') + '</i></td><td><b>' + esc(r.now) + '</b></td><td>' + esc(r.fin) + '</td></tr>'; }).join('');
            resBox.querySelector('.p3-inputs ul').innerHTML = paramRows(prm).map(function (r) { return '<li><span>' + esc(r.l) + '</span><b>' + esc(r.v) + '</b></li>'; }).join('');
            var H = global.GeoSim2D && global.GeoSim2D.H;
            charts.forEach(function (ch) { try { var cx = H.prep(ch.cv, ch.c.W, ch.c.H); ch.c.draw(cx, prm, p); } catch (e) { /* una gráfica no debe romper el visor */ } });
            var ib = resBox.querySelector('.p3-ibody');
            ib.innerHTML = def && def.interp ? def.interp(prm, p) : '<p>Compara la gráfica con los valores medidos: la curva muestra cómo evoluciona la variable de respuesta durante el ensayo y la tabla resume los valores en este instante y al final.</p>';
            var hy = resBox.querySelector('.p3-hbody'), arr = def && def.hyp ? def.hyp : ['Modelo educativo simplificado del simulador 2D del mismo ensayo: las curvas salen de las relaciones del modelo, no de datos experimentales reales.', 'No sustituye el ensayo normativo ni el criterio del laboratorista.'];
            if (!hy.__done || force) { hy.innerHTML = arr.concat(meta.norma ? ['Norma de referencia: ' + meta.norma + '. El simulador representa una versión simplificada del procedimiento.'] : []).map(function (t) { return '<li>' + esc(t) + '</li>'; }).join(''); hy.__done = true; }
        }

        /* ===================== envoltura de machine.set ===================== */
        machine.set = function (p, prm) {
            if (isSim2d) { var o = pro.over[tipo]; if (o && Object.keys(o).length && !prm.__pro) { prm = applyOverSim2d(prm, o); inst.prm = prm; } }
            unExplode();
            if (P3.guided && inst.playing && P3.stopAt == null) { var cph = phaseOf(p); P3.stopAt = Math.min(1, phases[cph].b); P3.stopPh = cph; }
            var stopped = false;
            if (P3.guided && inst.playing && P3.stopAt != null && p >= P3.stopAt - 1e-6) {
                p = Math.max(phases[P3.stopPh].a + 0.0006, P3.stopAt - 0.0006); inst.p = p; inst.playing = false; P3.stopAt = null; stopped = true;
            }
            var r = origSet.call(machine, p, prm);
            applyVis(); doExplode(); updateHelper();
            if (stopped) { updatePlayBtn(); guide.classList.add('is-flash'); setTimeout(function () { guide.classList.remove('is-flash'); }, 700); }
            var ph = phaseOf(p); if (ph !== P3.phase) onPhase(ph);
            refreshResults(false);
            return r;
        };

        buildParams(); buildResults(); renderSel(); refreshListState();
        onPhase(phaseOf(inst.p), true);
        if (P3.autocam && inst.goal && !(phases[0] && phases[0].pins)) { /* vista inicial = general */ }
        reapply(); refreshResults(true); showMsgs();
        inst.pro = { state: P3, select: select, goPhase: goPhase, setExplode: function (v) { expR.value = String(Math.round(v * 100)); expR.dispatchEvent(new Event('input')); }, commit: commit, fields: fields };
    }

    /* Ayuda para los archivos que definen máquinas nuevas */
    pro.fieldsOf = fieldsOf;
})(window);
