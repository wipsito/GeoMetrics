/**
 * GeoMetrics — Pestaña SIMULADORES · Mecánica de Suelos II
 * Cada ensayo ofrece dos simuladores: 2D (parámetros + curvas en vivo) y 3D (máquina completa).
 * Depende de: sim2d-core.js, sim2d-inconfinada.js, sim2d-defs.js, lab3d-ensayos.js
 */
(function (global) {
    'use strict';
    var G = global.GeoSim2D;
    if (!G) return;
    var H = G.H, doc = document;

    var GLYPH = {
        corte: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 3v7M28.5 6.5 32 10l3.5-3.5"/><rect x="17" y="12" width="26" height="14" rx="1.8"/><rect x="24" y="30" width="26" height="14" rx="1.8"/><path d="M5 37h13M13 33l5 4-5 4"/><path d="M6 53h52"/></svg>',
        inconfinada: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 3v8M28.5 7.5 32 11l3.5-3.5"/><rect x="15" y="13" width="34" height="5" rx="1.8"/><rect x="24" y="18" width="16" height="26" rx="3"/><path d="M27 37l10-14" stroke-dasharray="2.5 3"/><rect x="15" y="44" width="34" height="5" rx="1.8"/><path d="M6 56h52"/></svg>',
        consolidacion: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20h54"/><path d="M38 20l-6 12h12z"/><path d="M14 20v9"/><rect x="6" y="29" width="16" height="17" rx="2.5"/><path d="M10 38h8"/><path d="M53 20v10"/><rect x="46" y="30" width="14" height="4.5" rx="1"/><rect x="47.5" y="36" width="11" height="4.5" rx="1"/><path d="M4 54h56"/></svg>',
        triaxial: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7h46M13 7v47M51 7v47"/><path d="M32 7v14"/><rect x="21" y="21" width="22" height="28" rx="2.5"/><rect x="28" y="28" width="8" height="14" rx="1.5"/><path d="M24 31h-4M24 38h-4M40 31h4M40 38h4" stroke-dasharray="1.5 2.5"/><path d="M6 54h52"/></svg>'
    };
    var MACHINE = {
        corte: 'Aparato de corte directo', inconfinada: 'Prensa de compresión inconfinada',
        consolidacion: 'Consolidómetro (edómetro) de palanca', triaxial: 'Cámara triaxial con marco de carga'
    };

    function $(id) { return doc.getElementById(id); }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    
    /* Paso a paso educativo por ensayo (2D) */
    var STEPS = {
        corte: [
            { a: 0.00, b: 0.12, t: 'Preparar la muestra', d: 'Tallar o compactar la muestra. Verificar área A de la caja de corte.' },
            { a: 0.12, b: 0.25, t: 'Montar en la caja', d: 'Colocar la muestra entre las dos mitades y las piedras porosas si aplica.' },
            { a: 0.25, b: 0.40, t: 'Aplicar carga normal σn', d: 'Cargar pesas: σn = N / A. Verificar centrado.' },
            { a: 0.40, b: 0.50, t: 'Consolidar bajo σn', d: 'Esperar asentamiento y anotar δv inicial.' },
            { a: 0.50, b: 0.90, t: 'Cortar a velocidad constante', d: 'El carro avanza; el anillo mide Fh → τ = Fh / A.' },
            { a: 0.90, b: 1.01, t: 'Registrar pico y residual', d: 'Anotar τ pico, residual, δh y δv. Repetir con otras σn.' }
        ],
        inconfinada: [
            { a: 0.00, b: 0.12, t: 'Preparar la probeta', d: 'Cilindro de suelo con caras planas; H/D ≈ 2.' },
            { a: 0.12, b: 0.25, t: 'Medir geometría', d: 'Registrar D y L0. Calcular A = π·(D/2)².' },
            { a: 0.25, b: 0.35, t: 'Colocar en la prensa', d: 'Centrar entre platos (σ₃ = 0). Montar deformímetro.' },
            { a: 0.35, b: 0.75, t: 'Cargar axialmente', d: 'Leer pares (ΔL, P) hasta la falla.' },
            { a: 0.75, b: 0.90, t: 'Detectar qu', d: 'qu = σ máximo = P/A. Anotar ε en falla.' },
            { a: 0.90, b: 1.01, t: 'Calcular cu', d: 'cu = qu / 2. Documentar el modo de falla.' }
        ],
        consolidacion: [
            { a: 0.00, b: 0.15, t: 'Preparar el edómetro', d: 'Anillo, piedras porosas y muestra saturada. Carga de asiento.' },
            { a: 0.15, b: 0.25, t: 'Registrar e0 y H0', d: 'Poner a cero el deformímetro tras la carga de asiento.' },
            { a: 0.25, b: 0.75, t: 'Incrementos de carga', d: 'Duplicar σ\' en cada escalón y leer asentamiento hasta estabilizar.' },
            { a: 0.75, b: 0.90, t: 'Curva e–log σ\'', d: 'Calcular e en cada escalón; obtener Cc, Cr y σ\'p.' },
            { a: 0.90, b: 1.01, t: 'Determinar Cv', d: 'Método log t o √t → t50 → coeficiente de consolidación Cv.' }
        ],
        triaxial: [
            { a: 0.00, b: 0.12, t: 'Preparar la probeta', d: 'Membrana de látex, cabezales y sellos O-ring.' },
            { a: 0.12, b: 0.28, t: 'Montar en la cámara', d: 'Llenar con agua, conectar drenaje y contrapresión.' },
            { a: 0.28, b: 0.42, t: 'Aplicar σ₃', d: 'Presión de cámara según UU / CU / CD.' },
            { a: 0.42, b: 0.80, t: 'Carga axial σ₁', d: 'Avance controlado del vástago; leer P, ΔL y u o ΔV.' },
            { a: 0.80, b: 0.92, t: 'Falla', d: 'Pico de resistencia; plano ≈ 45° + φ/2.' },
            { a: 0.92, b: 1.01, t: 'Envolvente de Mohr', d: 'Repetir a varias σ₃ y obtener c y φ.' }
        ],
        humedad: [
            { a: 0.00, b: 0.20, t: 'Preparar cápsula', d: 'Pesar la cápsula limpia y seca (M_c).' },
            { a: 0.20, b: 0.40, t: 'Agregar suelo húmedo', d: 'Colocar la muestra y pesar cápsula + suelo húmedo (M_h).' },
            { a: 0.40, b: 0.75, t: 'Secar en horno', d: 'Llevar a 105–110 °C hasta masa constante.' },
            { a: 0.75, b: 0.90, t: 'Pesar suelo seco', d: 'Enfriar y pesar cápsula + suelo seco (M_s).' },
            { a: 0.90, b: 1.01, t: 'Calcular w', d: 'w = (M_h − M_s) / (M_s − M_c) × 100 %.' }
        ],
        granulometria: [
            { a: 0.00, b: 0.15, t: 'Preparar la muestra', d: 'Secar, desmenuzar y pesar la muestra total.' },
            { a: 0.15, b: 0.35, t: 'Apilar los tamices', d: 'Ordenar de mayor a menor abertura (p. ej. 3/8" → N.º 200).' },
            { a: 0.35, b: 0.65, t: 'Agitar y pesar retenidos', d: 'Agitar, retirar cada tamiz y pesar la masa retenida.' },
            { a: 0.65, b: 0.85, t: 'Calcular % que pasa', d: 'Obtener % retenido, acumulado y % que pasa.' },
            { a: 0.85, b: 1.01, t: 'Curva y coeficientes', d: 'Trazar curva granulométrica; calcular D10, D30, D60, Cu y Cc.' }
        ],
        limites: [
            { a: 0.00, b: 0.25, t: 'Límite líquido', d: 'Copa de Casagrande: anotar golpes y humedad; obtener LL.' },
            { a: 0.25, b: 0.55, t: 'Límite plástico', d: 'Rollitos de 3 mm hasta agrietar; obtener LP.' },
            { a: 0.55, b: 0.80, t: 'Índice de plasticidad', d: 'IP = LL − LP.' },
            { a: 0.80, b: 1.01, t: 'Interpretar', d: 'Clasificar plasticidad y relacionar con el comportamiento del suelo.' }
        ],
        gravedad: [
            { a: 0.00, b: 0.25, t: 'Calibrar picnómetro', d: 'Pesar picnómetro vacío y lleno de agua a temperatura controlada.' },
            { a: 0.25, b: 0.55, t: 'Suelo + agua', d: 'Introducir suelo seco, saturar, eliminar aire y pesar.' },
            { a: 0.55, b: 0.85, t: 'Calcular Gs', d: 'Gs = Ms / (Ms + Mw − Msw) (corregir por temperatura si aplica).' },
            { a: 0.85, b: 1.01, t: 'Verificar', d: 'Comparar con rangos típicos del tipo de suelo.' }
        ],
        compactacion: [
            { a: 0.00, b: 0.20, t: 'Preparar series de humedad', d: 'Mezclar porciones de suelo a distintos contenidos de agua.' },
            { a: 0.20, b: 0.55, t: 'Compactar en el molde', d: 'Capas y golpes según Proctor estándar o modificado.' },
            { a: 0.55, b: 0.80, t: 'Determinar γd y w', d: 'Pesar el molde, obtener humedad y densidad seca de cada punto.' },
            { a: 0.80, b: 1.01, t: 'Curva de compactación', d: 'Trazar γd vs w; obtener w óptima y γd máxima.' }
        ],
        densidad: [
            { a: 0.00, b: 0.30, t: 'Excavar y recuperar', d: 'Método del cono de arena o volumétrico en campo.' },
            { a: 0.30, b: 0.60, t: 'Pesar y medir volumen', d: 'Obtener masa húmeda y volumen del hueco.' },
            { a: 0.60, b: 0.85, t: 'Humedad de campo', d: 'Determinar w de una porción representativa.' },
            { a: 0.85, b: 1.01, t: 'Grado de compactación', d: 'γd campo / γd máx × 100 %.' }
        ],
        clasificacion: [
            { a: 0.00, b: 0.35, t: 'Datos de laboratorio', d: 'Usar granulometría y límites de Atterberg.' },
            { a: 0.35, b: 0.70, t: 'Carta de plasticidad', d: 'Ubicar el punto (LL, IP) en la carta de Casagrande.' },
            { a: 0.70, b: 1.01, t: 'Símbolo SUCS', d: 'Asignar grupo (GW, CL, SM, etc.) y descripción.' }
        ],
        permeabilidad: [
            { a: 0.00, b: 0.25, t: 'Montar la muestra', d: 'Carga constante o variable según el tipo de suelo.' },
            { a: 0.25, b: 0.60, t: 'Medir caudal / tiempo', d: 'Registrar nivel de agua y tiempo de percolación.' },
            { a: 0.60, b: 0.85, t: 'Calcular k', d: 'Ley de Darcy: k = (Q·L)/(A·h·t) o fórmula de carga variable.' },
            { a: 0.85, b: 1.01, t: 'Interpretar', d: 'Comparar k con rangos típicos (arcillas, arenas, gravas).' }
        ],
        traccion: [
            { a: 0.00, b: 0.20, t: 'Preparar la probeta', d: 'Medir sección y longitud calibrada.' },
            { a: 0.20, b: 0.40, t: 'Montar en la máquina', d: 'Fijar mordazas y extensómetro.' },
            { a: 0.40, b: 0.80, t: 'Ensayo de tracción', d: 'Cargar hasta rotura registrando σ–ε.' },
            { a: 0.80, b: 1.01, t: 'Propiedades mecánicas', d: 'E, σy, σu, ductilidad y tipo de falla.' }
        ],
        compresion: [
            { a: 0.00, b: 0.25, t: 'Preparar el cilindro', d: 'Verificar esbeltez y caras planas.' },
            { a: 0.25, b: 0.50, t: 'Centrar en la prensa', d: 'Alinear carga axial para evitar excentricidad.' },
            { a: 0.50, b: 0.85, t: 'Cargar a compresión', d: 'Registrar curva esfuerzo–deformación.' },
            { a: 0.85, b: 1.01, t: 'Resistencia y módulo', d: 'Obtener resistencia a la compresión y comportamiento post-pico.' }
        ],
        flexion: [
            { a: 0.00, b: 0.25, t: 'Montar la viga', d: 'Apoyos y punto de carga según el esquema (3 o 4 puntos).' },
            { a: 0.25, b: 0.55, t: 'Aplicar carga', d: 'Incrementar la carga y medir la deflexión central.' },
            { a: 0.55, b: 0.85, t: 'Diagrama M y σ', d: 'Relacionar momento flector con esfuerzo σ = M·c / I.' },
            { a: 0.85, b: 1.01, t: 'Falla por flexión', d: 'Observar fisuración o plastificación en la fibra extrema.' }
        ],
        torsion: [
            { a: 0.00, b: 0.25, t: 'Fijar la barra', d: 'Un extremo fijo, el otro con brazo de torsión.' },
            { a: 0.25, b: 0.60, t: 'Aplicar torque', d: 'Registrar ángulo de giro θ y momento T.' },
            { a: 0.60, b: 0.85, t: 'Esfuerzo cortante', d: 'τ = T·ρ / J en la sección.' },
            { a: 0.85, b: 1.01, t: 'Falla por torsión', d: 'Observar el modo de falla del material.' }
        ],
        dureza: [
            { a: 0.00, b: 0.30, t: 'Preparar la superficie', d: 'Superficie limpia y plana del material.' },
            { a: 0.30, b: 0.65, t: 'Aplicar la carga', d: 'Indentador Brinell / Rockwell / Vickers según norma.' },
            { a: 0.65, b: 1.01, t: 'Leer la dureza', d: 'Medir la huella o la profundidad y obtener el número de dureza.' }
        ]
    };

function glyphOf(k) { var d = G.defs[k]; return GLYPH[k] || (d && d.glyph) || ''; }
    function machineOf(k) { var d = G.defs[k]; return MACHINE[k] || (d && d.machine) || d.title; }

    /* ====================== HUB (uno por asignatura) ====================== */
    function createHub(cfg) {
        var hub = $('simhub-' + cfg.key), panel = $('simhub-panel-' + cfg.key), grid = $('simhub-grid-' + cfg.key);
        if (!hub || !panel || !grid) return;
        var current = null;

        function buildHub() {
            grid.innerHTML = '';
            cfg.order.forEach(function (k) {
                var d = G.defs[k]; if (!d) return;
                var card = el('article', 'simcard');
                card.style.setProperty('--a', d.accent); card.style.setProperty('--rgb', d.rgb);
                card.innerHTML =
                    '<div class="simcard-glow"></div>' +
                    '<div class="simcard-head"><em class="simcard-num">' + d.num + '</em><div class="simcard-glyph">' + glyphOf(k) + '</div></div>' +
                    '<h4>' + esc(d.title) + '</h4>' +
                    '<p>' + esc(d.desc) + '</p>' +
                    '<div class="simcard-chips">' + d.chips.map(function (c) { return '<em>' + esc(c) + '</em>'; }).join('') + '</div>' +
                    '<small class="simcard-norma">' + esc(d.norma) + '</small>' +
                    '<div class="simcard-btns">' +
                      '<button type="button" class="simcard-btn is-2d" data-sim-open="' + k + '" data-mode="2d"><b>2D</b><span>Simulador 2D</span><i>Curvas en vivo</i></button>' +
                      '<button type="button" class="simcard-btn is-3d" data-sim-open="' + k + '" data-mode="3d"><b>3D</b><span>Simulador 3D</span><i>Máquina completa</i></button>' +
                    '</div>';
                grid.appendChild(card);
            });
            grid.querySelectorAll('[data-sim-open]').forEach(function (b) {
                b.addEventListener('click', function () { open(b.getAttribute('data-sim-open'), b.getAttribute('data-mode')); });
            });
        }

        function open(key, mode) {
            var d = G.defs[key]; if (!d) return;
            closeBody();
            var shell = el('div', 'simhub-shell');
            shell.style.setProperty('--a', d.accent); shell.style.setProperty('--rgb', d.rgb);
            shell.innerHTML =
                '<div class="simhub-topbar">' +
                  '<button type="button" class="btn-volver simhub-back">← Simuladores</button>' +
                  '<nav class="simhub-crumbs"><span>' + esc(cfg.course) + '</span><i>/</i><span>Simuladores</span><i>/</i><b>' + esc(d.title) + '</b></nav>' +
                  '<div class="simhub-mode" role="tablist" aria-label="Tipo de simulador">' +
                    '<button type="button" role="tab" data-mode="2d">2D</button><button type="button" role="tab" data-mode="3d">3D</button>' +
                  '</div>' +
                '</div>' +
                '<header class="simhub-phero">' +
                  '<div class="simhub-phero-icon">' + glyphOf(key) + '</div>' +
                  '<div class="simhub-phero-text"><em class="simhub-phero-eyebrow"></em><h2>' + esc(d.title) + '</h2><p class="simhub-phero-desc"></p></div>' +
                  '<ul class="simhub-phero-meta"><li><b>Normativa</b><span>' + esc(d.norma) + '</span></li><li><b>Parámetros</b><span>' + esc(d.chips.join(' · ')) + '</span></li></ul>' +
                '</header>' +
                '<div class="simhub-body"></div>';
            panel.innerHTML = ''; panel.appendChild(shell);
            hub.style.display = 'none'; panel.style.display = 'block';
            shell.querySelector('.simhub-back').addEventListener('click', close);
            shell.querySelectorAll('.simhub-mode button').forEach(function (b) {
                b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
            });
            current = { key: key, mode: null, runner: null, shell: shell };
            setMode(mode === '3d' ? '3d' : '2d');
            global.scrollTo(0, 0);
        }

        function setMode(mode) {
            if (!current) return;
            var d = G.defs[current.key], shell = current.shell, body = shell.querySelector('.simhub-body');
            closeBody();
            current.mode = mode;
            shell.querySelectorAll('.simhub-mode button').forEach(function (b) {
                var on = b.getAttribute('data-mode') === mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            shell.querySelector('.simhub-phero-eyebrow').textContent = 'Simulador ' + mode.toUpperCase() + ' · Laboratorio virtual';
            shell.querySelector('.simhub-phero-desc').textContent = mode === '2d'
                ? 'Ajusta los parámetros, inicia el ensayo y observa la máquina, las lecturas y las curvas en tiempo real.'
                : 'Recorre ' + machineOf(current.key).toLowerCase() + ' en 3D: reproduce la secuencia, gira la vista, usa la rueda del ratón para acercar y consulta cada componente.';
            body.innerHTML = '';
            if (mode === '3d') {
                var host = el('div', 'simhub-3d-host'); body.appendChild(host);
                if (!global.GeoLab3D) host.innerHTML = '<p class="login-hint">El módulo 3D no está disponible.</p>';
                else { var inst = global.GeoLab3D.mount(host, current.key); if (cfg.key === 'ms2') global.__ms2Lab3D = inst; }
            } else {
                current.runner = new Runner(d, body);
            }
        }

        function closeBody() {
            if (global.GeoLab3D) global.GeoLab3D.disposeAll();
            if (current && current.runner) { current.runner.destroy(); current.runner = null; }
        }
        function close() {
            closeBody(); current = null;
            panel.style.display = 'none'; panel.innerHTML = ''; hub.style.display = '';
            global.scrollTo(0, 0);
        }

        buildHub();
        var scr = $(cfg.screen);
        if (scr) {
            scr.querySelectorAll('.submenu-tabs .tab-btn').forEach(function (b) {
                b.addEventListener('click', function () { if (b.getAttribute('data-tab') !== cfg.tab && current) close(); });
            });
        }
        var back = $(cfg.back);
        if (back) back.addEventListener('click', function () { if (current) close(); });
        return { open: open, close: close };
    }

    /* ============================== MOTOR 2D ============================== */
    function Runner(def, host) {
        var self = this;
        this.def = def; this.p = 0; this.running = false; this.tick = 0; this.last = 0; this.raf = 0; this.speed = 1; this.dead = false;
        this.P = {};
        def.fields.forEach(function (f) { self.P[f.id] = f.value; });
        /* usa los resultados calculados por el estudiante, si existen */
        this.fromData = null;
        try { var bag = def.store && global[def.store] && global[def.store][def.key]; this.fromData = bag && def.fromData ? def.fromData(bag) : null; } catch (e) {}
        if (this.fromData) Object.keys(this.fromData).forEach(function (k) { self.P[k] = self.fromData[k]; });

        var html =
            '<div class="s2d" style="--a:' + def.accent + ';--rgb:' + def.rgb + '">' +
              '<aside class="s2d-ctrl">' +
                '<h5><i></i>Parámetros</h5>' +
                '<div class="s2d-fields">' + def.fields.map(function (f) { return fieldHtml(f, self.P[f.id]); }).join('') + '</div>' +
                (this.fromData ? '<p class="s2d-note">Se cargaron tus resultados de <b>Ensayos</b>. Puedes modificarlos libremente.</p>' : '') +
                '<div class="s2d-btns"><button type="button" class="s2d-play"><span>▶</span> Iniciar ensayo</button><button type="button" class="s2d-reset" title="Reiniciar">↺</button></div>' +
                '<label class="s2d-row"><span>Velocidad de animación</span><select class="s2d-speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>' +
                '<label class="s2d-row"><span>Línea de tiempo</span><input type="range" class="s2d-scrub" min="0" max="1000" value="0"></label>' +
                pasosHtml(def.key) +
              '</aside>' +
              '<section class="s2d-main">' +
                '<div class="s2d-stagewrap"><canvas class="s2d-stage" aria-label="Simulación de la máquina"></canvas>' +
                  '<div class="s2d-led"><i></i><b>Listo</b></div><div class="s2d-tag">' + esc(machineOf(def.key)) + '</div></div>' +
                '<div class="s2d-readouts">' + def.readouts.map(function (r) {
                    return '<div class="s2d-tile" data-k="' + r.k + '"><span>' + r.label + '</span><strong>—</strong><small>' + r.unit + '</small></div>'; }).join('') + '</div>' +
                '<div class="s2d-charts"><canvas class="s2d-chart"></canvas><canvas class="s2d-chart"></canvas></div>' +
                '<div class="s2d-summary"><h5>Resultados que se obtienen con estos parámetros</h5><div class="s2d-sumtiles"></div></div>' +
              '</section>' +
            '</div>';
        host.innerHTML = html;
        var q = function (s) { return host.querySelector(s); };
        this.root = q('.s2d');
        this.cv = q('.s2d-stage'); this.charts = Array.prototype.slice.call(host.querySelectorAll('.s2d-chart'));
        this.led = q('.s2d-led'); this.playBtn = q('.s2d-play'); this.scrub = q('.s2d-scrub');
        this.tiles = {}; host.querySelectorAll('.s2d-tile').forEach(function (t) { self.tiles[t.getAttribute('data-k')] = t.querySelector('strong'); });
        this.sumBox = q('.s2d-sumtiles');

        /* eventos */
        host.querySelectorAll('[data-fid]').forEach(function (inp) {
            inp.addEventListener('input', function () {
                var f = def.fields.filter(function (x) { return x.id === inp.getAttribute('data-fid'); })[0];
                self.P[f.id] = f.type === 'select' ? inp.value : parseFloat(inp.value);
                var out = host.querySelector('[data-out="' + f.id + '"]'); if (out && f.type !== 'select') out.textContent = H.fmt(self.P[f.id], f.dec);
                if (f.type !== 'select') paintRange(inp);
                self.recalc();
            });
            if (inp.type === 'range') paintRange(inp);
        });
        this.playBtn.addEventListener('click', function () { self.toggle(); });
        q('.s2d-reset').addEventListener('click', function () { self.reset(); });
        q('.s2d-speed').addEventListener('change', function (e) { self.speed = parseFloat(e.target.value) || 1; });
        this.scrub.addEventListener('input', function () { self.pause(); self.p = self.scrub.value / 1000; self.draw(); });
        this.onResize = function () { self.draw(); };
        global.addEventListener('resize', this.onResize);
        this.steps = STEPS[def.key] || [];
        this.lastPh = -1;
        host.querySelectorAll('.s2d-pasos li').forEach(function (li) {
            li.addEventListener('click', function () {
                var i = parseInt(li.getAttribute('data-ph'), 10);
                var st = self.steps[i];
                if (!st) return;
                self.pause();
                self.p = (st.a + st.b) / 2;
                if (self.scrub) self.scrub.value = Math.round(self.p * 1000);
                self.draw();
            });
        });
        this.recalc();
    }
    function paintRange(inp) {
        var pct = (inp.value - inp.min) / (inp.max - inp.min) * 100;
        inp.style.setProperty('--pct', pct + '%');
    }
    
    function pasosHtml(key) {
        var steps = STEPS[key];
        if (!steps || !steps.length) return '';
        var lis = steps.map(function (s, i) {
            return '<li data-ph="' + i + '"><span class="s2d-ph-n">Paso ' + (i + 1) + '</span><div><b>' + esc(s.t) + '</b><small>' + esc(s.d) + '</small></div></li>';
        }).join('');
        return '<div class="s2d-pasos" data-key="' + key + '">' +
            '<h5>Paso a paso del laboratorio</h5>' +
            '<p class="s2d-pasos-hint">Al iniciar el ensayo se recorre cada etapa. Haz clic en un paso para saltar.</p>' +
            '<div class="s2d-paso-banner"><span>Paso 1 / ' + steps.length + '</span><strong>' + esc(steps[0].t) + '</strong><small>' + esc(steps[0].d) + '</small></div>' +
            '<ol>' + lis + '</ol></div>';
    }
    function phaseIndex(steps, p) {
        var idx = 0;
        if (!steps) return 0;
        for (var i = 0; i < steps.length; i++) if (p >= steps[i].a) idx = i;
        return idx;
    }

function fieldHtml(f, v) {
        if (f.type === 'select') {
            return '<label class="s2d-field"><span class="s2d-flab">' + esc(f.label) + '</span><select data-fid="' + f.id + '">' +
                f.options.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
        }
        return '<label class="s2d-field"><span class="s2d-flab">' + esc(f.label) + '<output data-out="' + f.id + '">' + H.fmt(v, f.dec) + '</output><u>' + esc(f.unit) + '</u></span>' +
            '<input type="range" data-fid="' + f.id + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + v + '"></label>';
    }

    Runner.prototype.recalc = function () {
        this.M = this.def.model(this.P);
        var T = this.sumBox, items = this.def.summary(this.P, this.M);
        T.innerHTML = items.map(function (s) {
            return '<div class="s2d-sum' + (s.hi ? ' is-hi' : '') + '"><span>' + esc(s.label) + '</span><strong>' + esc(s.value) + '</strong><small>' + esc(s.unit) + '</small></div>';
        }).join('');
        this.draw();
    };
    Runner.prototype.toggle = function () {
        if (this.running) this.pause(); else this.start();
    };
    Runner.prototype.start = function () {
        if (this.p >= 1) this.p = 0;
        this.running = true; this.last = 0;
        this.playBtn.classList.add('is-on'); this.playBtn.innerHTML = '<span>❚❚</span> Pausar';
        var self = this;
        (function loop(ts) {
            if (self.dead || !self.running) return;
            if (!self.last) self.last = ts;
            var dt = Math.min(0.05, (ts - self.last) / 1000); self.last = ts;
            self.tick += dt * 60;
            self.p = Math.min(1, self.p + dt * self.speed / self.def.duration);
            self.draw();
            if (self.p >= 1) { self.pause(true); return; }
            self.raf = global.requestAnimationFrame(loop);
        })(performance.now());
    };
    Runner.prototype.pause = function (done) {
        this.running = false; if (this.raf) global.cancelAnimationFrame(this.raf);
        this.playBtn.classList.remove('is-on');
        this.playBtn.innerHTML = done ? '<span>↻</span> Repetir ensayo' : (this.p > 0 ? '<span>▶</span> Continuar' : '<span>▶</span> Iniciar ensayo');
        this.draw();
    };
    Runner.prototype.reset = function () {
        this.running = false; if (this.raf) global.cancelAnimationFrame(this.raf);
        this.p = 0; this.tick = 0; this.playBtn.classList.remove('is-on'); this.playBtn.innerHTML = '<span>▶</span> Iniciar ensayo';
        this.draw();
    };
    Runner.prototype.draw = function () {
        if (this.dead || !this.M) return;
        var d = this.def, S = d.at(this.P, this.M, this.p);
        var ctx = H.prep(this.cv, 800, 460);
        d.stage(ctx, 800, 460, this.P, this.M, S, this.p, this.tick);
        var P = this.P, M = this.M, p = this.p;
        this.charts.forEach(function (cv, i) {
            var c = d.charts[i]; if (!c) return;
            var cx = H.prep(cv, c.W, c.H); c.draw(cx, c.W, c.H, P, M, S, p);
        });
        var self = this;
        d.readouts.forEach(function (r) {
            var v = S[r.k];
            if (r.f) { self.tiles[r.k].textContent = r.f(S, self.P, p); return; }
            if (self.def.key === 'triaxial' && r.k === 'u' && self.P.tipo !== 'CU') { self.tiles[r.k].textContent = '—'; return; }
            self.tiles[r.k].textContent = p <= 0 && r.k !== 'sn' && r.k !== 's3' ? H.fmt(0, r.dec) : H.fmt(v, r.dec);
        });
        var st = d.estado(S, p);
        this.led.className = 's2d-led ' + st.cls; this.led.querySelector('b').textContent = st.txt;
        this.root.classList.toggle('is-finished', p >= 1);
        if (!this.running) this.scrub.value = Math.round(p * 1000); else this.scrub.value = Math.round(p * 1000);
        /* Actualizar paso a paso del laboratorio */
        if (this.steps && this.steps.length) {
            var ph = phaseIndex(this.steps, p);
            if (ph !== this.lastPh) {
                this.lastPh = ph;
                var items = this.root.querySelectorAll('.s2d-pasos li');
                for (var i = 0; i < items.length; i++) {
                    items[i].classList.toggle('is-on', i === ph);
                    items[i].classList.toggle('is-done', i < ph);
                }
                var ban = this.root.querySelector('.s2d-paso-banner');
                if (ban && this.steps[ph]) {
                    ban.innerHTML = '<span>Paso ' + (ph + 1) + ' / ' + this.steps.length + '</span><strong>' +
                        esc(this.steps[ph].t) + '</strong><small>' + esc(this.steps[ph].d) + '</small>';
                }
            }
        }
    };
    Runner.prototype.destroy = function () {
        this.dead = true; this.running = false;
        if (this.raf) global.cancelAnimationFrame(this.raf);
        global.removeEventListener('resize', this.onResize);
    };

    /* ======================= integración con las pantallas ======================= */
    var HUBS = {};
    function wire() {
        [
            { key: 'ms1', tab: 'ms1-simuladores', screen: 'pantallaSuelos', back: 'btnVolverSuelos', course: 'Mecánica de Suelos I',
              order: ['humedad', 'granulometria', 'limites', 'gravedad', 'compactacion', 'densidad', 'clasificacion', 'permeabilidad'] },
            { key: 'ms2', tab: 'ms2-simuladores', screen: 'pantallaSuelos2', back: 'btnVolverSuelos2', course: 'Mecánica de Suelos II',
              order: ['corte', 'inconfinada', 'consolidacion', 'triaxial'] },
            { key: 'rm', tab: 'rm-simuladores', screen: 'pantallaResistencia', back: 'btnVolverResistencia', course: 'Resistencia de Materiales',
              order: ['traccion', 'compresion', 'flexion', 'torsion', 'dureza'] }
        ].forEach(function (c) {
            if (c.key === 'ms2') c.order.forEach(function (k) { if (G.defs[k]) G.defs[k].store = '__datosEnsayoMS2'; });
            HUBS[c.key] = createHub(c);
        });
    }
    global.GeoSimHub = HUBS;
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', wire); else wire();
})(window);
