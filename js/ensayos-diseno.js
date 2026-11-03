/* GeoMetrics — nuevo diseño de los apartados de ensayos (Mecánica de Suelos I y II).
 * Reorganiza visualmente cada ensayo (encabezado, pasos, campos con símbolo y unidad, medidor de resultado,
 * ecuación aplicada, escala referencial, interpretación y botón de informe) SIN tocar los cálculos:
 * se conservan todos los id, onclick y funciones de app.js. Solo front-end. */
(function () {
    'use strict';
    var doc = document;

    /* ---------------- utilidades ---------------- */
    function $(id) { return doc.getElementById(id); }
    function inp(id) { var e = $(id); if (!e || e.value === '') return NaN; return parseFloat(String(e.value).replace(',', '.')); }
    function txt(id) { var e = $(id); return e ? (e.textContent || '').trim() : ''; }
    function num(s) { var m = String(s || '').replace(',', '.').match(/-?\d+(?:\.\d+)?(?:e[-+]?\d+)?/i); return m ? parseFloat(m[0]) : NaN; }
    function ok(v) { return typeof v === 'number' && isFinite(v); }
    function f(v, d) { return ok(v) ? v.toFixed(d == null ? 2 : d) : '—'; }
    function calc(id) { var t = txt(id); return t && t !== '—' && t !== '-'; }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    var SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '' };
    function sci(v) { if (!ok(v) || v === 0) return f(v); var e = Math.floor(Math.log10(Math.abs(v))), m = v / Math.pow(10, e); return m.toFixed(2) + '×10' + String(e).split('').map(function (c) { return SUP[c]; }).join(''); }

    /* ---------------- datos de cada ensayo ---------------- */
    var MS1 = 'Mecánica de Suelos I', MS2 = 'Mecánica de Suelos II';
    var M = {
        humedad: {
            n: '01', mat: MS1, chips: ['ASTM D2216', 'INV E-122'], live: 'Horno 110 ± 5 °C',
            desc: 'Determinación en laboratorio de la relación entre la masa de agua y la masa de sólidos de una muestra de suelo.',
            steps: [['Pesar recipiente', 'Limpio y seco · M₁', ['h-recipiente']], ['Muestra húmeda', 'Recipiente + suelo · M₂', ['h-humeda']], ['Secado en horno', 'Masa constante · M₃', ['h-seca']], ['Cálculo de w', 'Resultado e informe']],
            hint: 'Balanza ± 0.01 g', sym: { 'h-recipiente': 'M₁', 'h-humeda': 'M₂', 'h-seca': 'M₃' },
            main: { id: 'h-resultado', sym: 'w', unit: '%', min: 0, max: 100 },
            sec: { 'h-agua': 'M₂ − M₃', 'h-suelo': 'M₃ − M₁' },
            eq: 'w = (M₂ − M₃) / (M₃ − M₁) × 100',
            sub: function () { var a = num(txt('h-agua')), s = num(txt('h-suelo')), w = num(txt('h-resultado')); return ok(w) ? 'w = ' + f(a) + ' / ' + f(s) + ' × 100 = ' + f(w) + ' %' : ''; },
            scale: { min: 0, max: 100, segs: [[0, 10, 'Baja'], [10, 25, 'Media'], [25, 50, 'Alta'], [50, 100, 'Muy alta']] },
            notes: {
                 'Baja': 'Humedad baja, típica de arenas y gravas o de suelos expuestos al sol. Compárala con los límites de Atterberg para estimar su consistencia.',
                 'Media': 'Humedad media, frecuente en limos y arcillas de baja plasticidad. Compárala con los límites de Atterberg para estimar su consistencia.',
                 'Alta': 'Humedad alta, habitual en arcillas y limos saturados o cercanos al límite líquido. Revisa su consistencia con los límites de Atterberg.',
                 'Muy alta': 'Humedad muy alta, propia de suelos orgánicos o arcillas muy blandas. Verifica el secado hasta masa constante.'
            },
            comp: true
        },
        granulometria: {
            n: '02', mat: MS1, chips: ['ASTM D6913', 'INV E-123'], live: 'Tamices ASTM E11',
            desc: 'Distribución de los tamaños de partícula de un suelo por tamizado, expresada como curva granulométrica.',
            steps: [['Muestra seca', 'Masa total · W', ['g-total']], ['Tamizado', 'Serie de tamices'], ['Retenidos', 'Masa en cada tamiz'], ['Curva y coeficientes', 'Cu · Cc · informe']],
            hint: 'Balanza ± 0.1 g', sym: { 'g-total': 'W' },
            main: { id: 'g-tipo', sym: 'Suelo', text: true },
            sec: { 'g-cu': 'Uniformidad', 'g-cc': 'Curvatura', 'g-finos': 'Pasa N.º 200', 'g-grava': 'Retiene N.º 4' },
            eq: 'Cu = D₆₀ / D₁₀ · Cc = D₃₀² / (D₁₀ · D₆₀)',
            sub: function () { var cu = num(txt('g-cu')), cc = num(txt('g-cc')); return ok(cu) ? 'Cu = ' + txt('g-d60') + ' / ' + txt('g-d10') + ' = ' + f(cu) + ' · Cc = ' + f(cc) : ''; },
            interp: function () { var cu = num(txt('g-cu')), cc = num(txt('g-cc')); if (!ok(cu)) return null; var bien = cu >= 4 && cc >= 1 && cc <= 3; return [bien ? 'Bien gradado' : 'Mal gradado', (bien ? 'Cu y Cc indican buena variedad de tamaños, lo que favorece la compactación.' : 'La curva muestra pocos tamaños dominantes (Cu bajo o Cc fuera de 1–3).') + ' Grava ' + txt('g-grava') + ' %, arena ' + txt('g-arena') + ' %, finos ' + txt('g-finos') + ' %.']; }
        },
        limites: {
            n: '03', mat: MS1, chips: ['ASTM D4318', 'INV E-125 / E-126'], live: 'Cazuela de Casagrande',
            desc: 'Contenidos de humedad que marcan los cambios de estado de un suelo fino: líquido, plástico y semisólido.',
            steps: [['Límite líquido', 'Golpes N y humedad', ['l-g1', 'l-h1']], ['Curva de fluidez', 'LL a 25 golpes', ['l-g2', 'l-h2', 'l-g3', 'l-h3']], ['Límite plástico', 'Rollitos de 3 mm', ['l-lp']], ['Plasticidad', 'IP = LL − LP']],
            hint: 'Humedades en %', sym: { 'l-lp': 'LP' },
            main: { id: 'l-ip', sym: 'IP', unit: '%', min: 0, max: 60 },
            sec: { 'l-ll': 'w a 25 golpes', 'l-lpres': 'Rollitos 3 mm' },
            eq: 'IP = LL − LP',
            sub: function () { var ip = num(txt('l-ip')); return ok(ip) ? 'IP = ' + txt('l-ll') + ' − ' + txt('l-lpres') + ' = ' + f(ip, 1) + ' %' : ''; },
            scale: { min: 0, max: 60, segs: [[0, 4, 'No plástico'], [4, 7, 'Baja'], [7, 17, 'Media'], [17, 35, 'Alta'], [35, 60, 'Muy alta']] },
            notes: { 'No plástico': 'Suelo prácticamente no plástico: se comporta como limo o arena fina.', 'Baja': 'Plasticidad baja: limos y arcillas magras con poca cohesión.', 'Media': 'Plasticidad media: arcillas de compresibilidad moderada.', 'Alta': 'Plasticidad alta: arcillas expansivas o muy compresibles; ubícala en la carta de plasticidad.', 'Muy alta': 'Plasticidad muy alta: arcillas grasas con alto potencial de cambio de volumen.' },
            extra: function () { return calc('l-tipo') ? 'Tipo: ' + txt('l-tipo') + '.' : ''; }
        },
        gravedad: {
            n: '04', mat: MS1, chips: ['ASTM D854', 'INV E-128'], live: 'Agua desairada',
            desc: 'Relación entre la densidad de los sólidos del suelo y la del agua, medida con picnómetro.',
            steps: [['Picnómetro vacío', 'Limpio y seco · W₁', ['ge-pic']], ['Suelo seco', 'Picnómetro + suelo · W₂', ['ge-picsuelo']], ['Con agua', 'W₃ (con suelo) · W₄ (solo agua)', ['ge-paguasuelo', 'ge-pagua']], ['Cálculo de Gs', 'Resultado e informe']],
            hint: 'Balanza ± 0.01 g', sym: { 'ge-pic': 'W₁', 'ge-picsuelo': 'W₂', 'ge-paguasuelo': 'W₃', 'ge-pagua': 'W₄' },
            main: { id: 'ge-gs', sym: 'Gs', unit: '', min: 2.4, max: 3.0, dec: 3 },
            sec: { 'ge-ms': 'Ws = W₂ − W₁', 'ge-vs': 'Ws / Gs' },
            eq: 'Gs = Ws / (Ws + W₄ − W₃)',
            sub: function () { var gs = num(txt('ge-gs')); return ok(gs) ? 'Gs = ' + f(inp('ge-picsuelo') - inp('ge-pic')) + ' / (' + f(inp('ge-picsuelo') - inp('ge-pic')) + ' + ' + f(inp('ge-pagua')) + ' − ' + f(inp('ge-paguasuelo')) + ') = ' + f(gs, 3) : ''; },
            scale: { min: 2.4, max: 3.0, segs: [[2.4, 2.65, 'Arena / grava'], [2.65, 2.8, 'Arcilla'], [2.8, 3.0, 'Especial']] },
            notes: { 'Arena / grava': 'Valor típico de suelos granulares con predominio de cuarzo y feldespato.', 'Arcilla': 'Rango habitual de arcillas y limos inorgánicos (2.65–2.80).', 'Especial': 'Gs elevado: posibles minerales pesados (óxidos de hierro). Revisa la extracción de aire.' }
        },
        compactacion: {
            n: '05', mat: MS1, chips: ['ASTM D698', 'INV E-141'], live: 'Martillo 2.5 kg · 3 capas',
            desc: 'Relación entre humedad y densidad seca de un suelo compactado con energía estándar, para hallar la humedad óptima.',
            steps: [['Molde', 'Masa W_m y volumen V', ['cp-molde', 'cp-vol']], ['Compactar', '3 capas × 25 golpes', ['cp-h1', 'cp-w1']], ['Varios puntos', '4–5 humedades', ['cp-h3', 'cp-w3']], ['Curva Proctor', 'γd máx · w ópt']],
            hint: 'Molde de 944 cm³', sym: { 'cp-molde': 'W_m', 'cp-vol': 'V' },
            main: { id: 'cp-wopt', sym: 'w ópt', unit: '%', min: 0, max: 40, dec: 1 },
            sec: { 'cp-gdmax': 'γd = γ / (1 + w)', 'cp-gdmaxkn': 'γd · 9.81' },
            eq: 'γ = (W − W_m) / V · γd = γ / (1 + w)',
            sub: function () { return calc('cp-wopt') ? 'γd máx = ' + txt('cp-gdmax') + ' g/cm³ con w ópt = ' + txt('cp-wopt') : ''; },
            interp: function () { var w = num(txt('cp-wopt')); if (!ok(w)) return null; return ['Punto óptimo', 'Compacta en obra con humedades cercanas a ' + f(w, 1) + ' % (normalmente w ópt ± 2 %) para alcanzar la densidad seca máxima de ' + txt('cp-gdmax') + ' g/cm³.']; }
        },
        densidad: {
            n: '06', mat: MS1, chips: ['ASTM D1556', 'INV E-161'], live: 'Arena patrón calibrada',
            desc: 'Densidad del suelo compactado en obra mediante el método del cono de arena calibrada.',
            steps: [['Arena inicial', 'Cono + arena · W_i', ['d-cono']], ['Excavar hueco', 'Suelo extraído · W_s', ['d-suelo']], ['Llenar con arena', 'Arena restante · W_f', ['d-rest', 'd-darena']], ['Densidad seca', 'γd y compactación']],
            hint: 'Balanza ± 1 g', sym: { 'd-cono': 'W_i', 'd-rest': 'W_f', 'd-darena': 'ρ_a', 'd-suelo': 'W_s', 'd-w': 'w' },
            main: { id: 'd-gd', sym: 'γd', unit: 'g/cm³', min: 1.0, max: 2.4, dec: 3 },
            sec: { 'd-vol': '(W_i − W_f) / ρ_a', 'd-gh': 'W_s / V', 'd-gdkn': 'γd · 9.81', 'd-gc': 'γd / γd máx' },
            eq: 'V = (W_i − W_f) / ρ_a · γd = (W_s / V) / (1 + w)',
            sub: function () { var gd = num(txt('d-gd')); return ok(gd) ? 'γd = (' + f(inp('d-suelo'), 1) + ' / ' + txt('d-vol') + ') / (1 + ' + f(inp('d-w') / 100, 3) + ') = ' + f(gd, 3) + ' g/cm³' : ''; },
            interp: function () { var gc = num(txt('d-gc')); if (!ok(gc)) return null; return gc >= 95 ? ['Cumple', 'Grado de compactación de ' + f(gc, 1) + ' % (≥ 95 %): cumple la exigencia usual para rellenos y terraplenes (referencia γd máx = 1.80 g/cm³).'] : ['No cumple', 'Grado de compactación de ' + f(gc, 1) + ' % (< 95 %): se recomienda recompactar o ajustar la humedad (referencia γd máx = 1.80 g/cm³).']; }
        },
        clasificacion: {
            n: '07', mat: MS1, chips: ['ASTM D2487', 'SUCS'], live: 'Carta de plasticidad',
            desc: 'Clasificación del suelo con el Sistema Unificado a partir de la granulometría y los límites de Atterberg.',
            steps: [['Finos', '% pasa N.º 200', ['c-p200']], ['Plasticidad', 'LL e IP', ['c-ll', 'c-ip']], ['Fracción gruesa', '% retenido N.º 4', ['c-p4']], ['Grupo SUCS', 'Símbolo y nombre']],
            hint: 'Valores en %', sym: { 'c-p200': 'F₂₀₀', 'c-ll': 'LL', 'c-ip': 'IP', 'c-p4': 'R₄' },
            main: { id: 'c-grupo', sym: 'SUCS', text: true },
            sec: {},
            eq: 'F₂₀₀ < 50 % → grueso (G / S) · F₂₀₀ ≥ 50 % → fino (M / C)',
            sub: function () { var p = inp('c-p200'); return ok(p) && calc('c-grupo') ? 'F₂₀₀ = ' + f(p, 1) + ' % → suelo ' + (p < 50 ? 'grueso' : 'fino') + ' · grupo ' + txt('c-sim') : ''; },
            interp: function () { return calc('c-grupo') ? [txt('c-sim') || 'Grupo', (txt('c-num') || txt('c-clasif')) + '.'] : null; }
        },
        permeabilidad: {
            n: '08', mat: MS1, chips: ['ASTM D2434', 'INV E-130'], live: 'Carga constante',
            desc: 'Coeficiente de permeabilidad de un suelo granular con permeámetro de carga constante, según la ley de Darcy.',
            steps: [['Muestra', 'Área A y longitud L', ['p-a', 'p-l']], ['Carga constante', 'Altura h', ['p-h']], ['Recolectar', 'Volumen Q en tiempo t', ['p-vol', 'p-t']], ['Cálculo de k', 'Ley de Darcy']],
            hint: 'Agua desairada', sym: { 'p-vol': 'Q', 'p-t': 't', 'p-a': 'A', 'p-l': 'L', 'p-h': 'h' },
            main: { id: 'p-k', sym: 'k', unit: 'cm/s', min: -9, max: 0, log: true },
            sec: { 'p-q': 'Q / t', 'p-i': 'h / L', 'p-v': 'Q / A' },
            eq: 'k = Q · L / (A · h · t)',
            sub: function () { var k = num(txt('p-k')); return ok(k) ? 'k = ' + f(inp('p-vol'), 1) + ' · ' + f(inp('p-l'), 1) + ' / (' + f(inp('p-a'), 1) + ' · ' + f(inp('p-h'), 1) + ' · ' + f(inp('p-t'), 1) + ') = ' + sci(k) + ' cm/s' : ''; },
            scale: { min: -9, max: 0, log: true, segs: [[-9, -6, 'Arcilla'], [-6, -4, 'Limo'], [-4, -2, 'Arena'], [-2, 0, 'Grava']] },
            notes: { 'Arcilla': 'Permeabilidad muy baja: prácticamente impermeable; útil como barrera o núcleo.', 'Limo': 'Permeabilidad baja: drenaje lento, típico de limos y mezclas limo-arcilla.', 'Arena': 'Permeabilidad media: buen drenaje, típico de arenas limpias.', 'Grava': 'Permeabilidad alta: drenaje libre; vigila la erosión interna.' }
        },
        corte: {
            n: '01', mat: MS2, chips: ['ASTM D3080', 'INV E-154'], live: 'Caja de corte',
            desc: 'Resistencia al corte de un suelo sobre un plano de falla impuesto; define la envolvente de Mohr-Coulomb.',
            steps: [['Montar muestra', 'Caja de corte'], ['Carga normal', 'σn en cada ensayo'], ['Corte', 'τ última'], ['Envolvente', 'c y φ']],
            hint: 'Esfuerzos en kPa', sym: {},
            main: { id: 'cd-phi', sym: 'φ', unit: '°', min: 0, max: 45, dec: 1 },
            sec: { 'cd-c': 'Intercepto de la envolvente' },
            eq: 'τ = c + σn · tan φ', eqFrom: 'cd-eq',
            scale: { min: 0, max: 45, segs: [[0, 20, 'Bajo'], [20, 30, 'Medio'], [30, 38, 'Alto'], [38, 45, 'Muy alto']] },
            notes: { 'Bajo': 'Ángulo de fricción bajo, típico de arcillas blandas.', 'Medio': 'Ángulo de fricción medio: limos y arenas sueltas.', 'Alto': 'Ángulo de fricción alto: arenas densas y bien gradadas.', 'Muy alto': 'Ángulo de fricción muy alto: gravas angulosas y arenas muy densas.' }
        },
        inconfinada: {
            n: '02', mat: MS2, chips: ['ASTM D2166', 'INV E-152'], live: 'φ ≈ 0 (no drenado)',
            desc: 'Resistencia a la compresión no confinada de suelos cohesivos; permite estimar la cohesión no drenada.',
            steps: [['Medir probeta', 'Diámetro y L₀'], ['Cargar', 'ΔL y P'], ['Esfuerzo', 'σ = P / A corregida'], ['Resistencia', 'qu y cu']],
            hint: 'Carga en N · mm', sym: {},
            main: { id: 'uc-qu', sym: 'qu', unit: 'kPa', min: 0, max: 400, dec: 1 },
            sec: { 'uc-cu': 'qu / 2', 'uc-ef': 'ΔL / L₀' },
            eq: 'cu = qu / 2 · σ = P / A_c · A_c = A₀ / (1 − ε)',
            sub: function () { var q = num(txt('uc-qu')); return ok(q) ? 'cu = ' + f(q, 1) + ' / 2 = ' + f(q / 2, 1) + ' kPa' : ''; },
            scale: { min: 0, max: 400, segs: [[0, 25, 'Muy blanda'], [25, 50, 'Blanda'], [50, 100, 'Media'], [100, 200, 'Firme'], [200, 400, 'Muy firme']] },
            notes: { 'Muy blanda': 'Consistencia muy blanda: el suelo se deforma con facilidad.', 'Blanda': 'Consistencia blanda: se moldea con presión ligera de los dedos.', 'Media': 'Consistencia media: se moldea con presión firme.', 'Firme': 'Consistencia firme: se marca con el pulgar con esfuerzo.', 'Muy firme': 'Consistencia muy firme: se marca solo con la uña.' }
        },
        consolidacion: {
            n: '03', mat: MS2, chips: ['ASTM D2435', 'INV E-151'], live: 'Edómetro',
            desc: 'Compresibilidad de un suelo saturado bajo carga vertical con drenaje, a partir de la curva e – log σ′.',
            steps: [['Datos iniciales', 'H₀ y e₀'], ['Incrementos', 'σ′ y e'], ['Curva e – log σ′', 'Cc y σ′p'], ['Velocidad', 'Cv con t₅₀']],
            hint: 'σ′ en kPa', sym: {},
            main: { id: 'co-cc', sym: 'Cc', unit: '', min: 0, max: 1, dec: 3 },
            sec: { 'co-cv': '0.197 · H² / t₅₀', 'co-pc': 'Método de Casagrande' },
            eq: 'Cc = Δe / Δlog σ′ · Cv = 0.197 · H² / t₅₀',
            scale: { min: 0, max: 1, segs: [[0, 0.2, 'Baja'], [0.2, 0.4, 'Media'], [0.4, 1, 'Alta']] },
            notes: { 'Baja': 'Compresibilidad baja: asentamientos pequeños bajo carga.', 'Media': 'Compresibilidad media: estima el asentamiento por consolidación primaria.', 'Alta': 'Compresibilidad alta: arcillas blandas con asentamientos importantes.' }
        },
        triaxial: {
            n: '04', mat: MS2, chips: ['ASTM D4767 / D2850', 'INV E-153'], live: 'Celda triaxial',
            desc: 'Resistencia al corte bajo presión de confinamiento controlada; círculos de Mohr y envolvente de falla.',
            steps: [['Confinar', 'σ₃ en la celda'], ['Cargar hasta falla', 'σ₁'], ['Círculos de Mohr', 'Uno por ensayo'], ['Envolvente', 'c y φ']],
            hint: 'Esfuerzos en kPa', sym: {},
            main: { id: 'tx-phi', sym: 'φ', unit: '°', min: 0, max: 45, dec: 1 },
            sec: { 'tx-c': 'Intercepto de la envolvente' },
            eq: 'σ₁ = σ₃ + P / A · τ = c + σ · tan φ', eqFrom: 'tx-eq',
            scale: { min: 0, max: 45, segs: [[0, 20, 'Bajo'], [20, 30, 'Medio'], [30, 38, 'Alto'], [38, 45, 'Muy alto']] },
            notes: { 'Bajo': 'Ángulo de fricción bajo, típico de arcillas blandas o ensayos no drenados.', 'Medio': 'Ángulo de fricción medio: limos y arenas sueltas.', 'Alto': 'Ángulo de fricción alto: arenas densas.', 'Muy alto': 'Ángulo de fricción muy alto: gravas y arenas muy densas.' }
        }
    };


    /* ---------------- Resistencia de Materiales ---------------- */
    var RMM = 'Resistencia de Materiales';
    var RM = {
        traccion: {
            n: '01', mat: RMM, chips: ['ASTM E8', 'NTC 2'], desc: 'Comportamiento de una probeta metálica sometida a carga axial de tracción hasta la rotura: esfuerzo, deformación y módulo elástico.',
            steps: [['Medir probeta', 'Diámetro d₀ y L₀', ['rm-tr-d', 'rm-tr-l0']], ['Montar en la UTM', 'Mordazas alineadas'], ['Aplicar carga', 'P, δ, Py y Pu', ['rm-tr-p', 'rm-tr-dL']], ['Resultados', 'σ, ε, E, σy y σu']],
            hint: 'Carga en kN · mm', main: { id: 'rm-tr-su', sym: 'σu', unit: 'MPa', min: 0, max: 800, dec: 1, lab: 'Resistencia última' },
            sec: { 'rm-tr-a': 'π · d₀² / 4', 'rm-tr-s': 'P / A₀', 'rm-tr-e': 'δ / L₀', 'rm-tr-E': 'σ / ε', 'rm-tr-sy': 'Py / A₀', 'rm-tr-su': 'Pu / A₀' },
            eq: 'σ = P / A₀ · ε = δ / L₀ · E = σ / ε',
            sub: function () { return calc('rm-tr-s') ? 'σ = ' + f(inp('rm-tr-p') * 1000, 0) + ' N / ' + txt('rm-tr-a') + ' mm² = ' + txt('rm-tr-s') + ' MPa' : ''; },
            scale: { min: 0, max: 800, segs: [[0, 250, 'Baja'], [250, 450, 'Acero estructural'], [450, 650, 'Alta'], [650, 800, 'Muy alta']] },
            notes: { 'Baja': 'Resistencia baja: aleaciones blandas (aluminio, cobre) o acero dulce recocido.', 'Acero estructural': 'Rango típico del acero estructural (A36 / A572).', 'Alta': 'Acero de refuerzo o de alta resistencia (por ejemplo, barras de 420 MPa de fluencia).', 'Muy alta': 'Aceros aleados o tratados térmicamente.' }
        },
        compresion: {
            n: '02', mat: RMM, chips: ['ASTM C39', 'NTC 673'], desc: 'Resistencia a la compresión de un cilindro de concreto u otro material frágil cargado axialmente hasta la falla.',
            steps: [['Medir cilindro', 'Diámetro d y altura h', ['rm-co-d', 'rm-co-h']], ['Refrentar y centrar', 'Caras paralelas'], ['Cargar hasta falla', 'Carga P', ['rm-co-p']], ['Resistencia', 'fc = P / A']],
            hint: 'Carga en kN · mm', main: { id: 'rm-co-fc', sym: 'fc', unit: 'MPa', min: 0, max: 60, dec: 2, lab: 'Resistencia a compresión' },
            sec: { 'rm-co-a': 'π · d² / 4' },
            eq: 'fc = P / A · A = π · d² / 4',
            sub: function () { return calc('rm-co-fc') ? 'fc = ' + f(inp('rm-co-p') * 1000, 0) + ' N / ' + txt('rm-co-a') + ' mm² = ' + txt('rm-co-fc') + ' MPa' : ''; },
            scale: { min: 0, max: 60, segs: [[0, 21, 'Baja'], [21, 28, 'Normal'], [28, 42, 'Alta'], [42, 60, 'Muy alta']] },
            notes: { 'Baja': 'Por debajo de 21 MPa: concreto no estructural (solados, rellenos).', 'Normal': 'Concreto estructural convencional (21–28 MPa).', 'Alta': 'Concreto de alta resistencia para columnas y elementos exigidos.', 'Muy alta': 'Concreto de muy alta resistencia; requiere diseño y control especiales.' }
        },
        flexion: {
            n: '03', mat: RMM, chips: ['ASTM C78', 'NTC 2871'], desc: 'Módulo de rotura de una viga simplemente apoyada con carga al centro de la luz.',
            steps: [['Medir viga', 'Luz L, ancho b y altura h', ['rm-fl-L', 'rm-fl-b', 'rm-fl-h']], ['Apoyar', 'Simplemente apoyada'], ['Cargar al centro', 'Carga de falla P', ['rm-fl-p']], ['Resultados', 'M, I y Mr']],
            hint: 'Carga en kN · mm', main: { id: 'rm-fl-mr', sym: 'Mr', unit: 'MPa', min: 0, max: 10, dec: 2, lab: 'Módulo de rotura' },
            sec: { 'rm-fl-m': 'P · L / 4', 'rm-fl-i': 'b · h³ / 12' },
            eq: 'M = P · L / 4 · Mr = M · c / I',
            sub: function () { return calc('rm-fl-mr') ? 'Mr = ' + txt('rm-fl-m') + ' · ' + f(inp('rm-fl-h') / 2, 1) + ' / ' + txt('rm-fl-i') + ' = ' + txt('rm-fl-mr') + ' MPa' : ''; },
            scale: { min: 0, max: 10, segs: [[0, 3, 'Bajo'], [3, 5, 'Normal'], [5, 10, 'Alto']] },
            notes: { 'Bajo': 'Módulo de rotura bajo para concreto (menor a 3 MPa).', 'Normal': 'Rango usual del concreto para pavimentos (3–5 MPa).', 'Alto': 'Módulo de rotura alto: concretos de alta resistencia o con fibras.' }
        },
        torsion: {
            n: '04', mat: RMM, chips: ['ASTM E143', 'Sección cuadrada'], desc: 'Respuesta de una barra de sección cuadrada sometida a un par torsor: esfuerzo cortante máximo, ángulo de giro y módulo de rigidez (teoría de Saint-Venant).',
            steps: [['Medir barra', 'Lado a y longitud L', ['rm-to-d', 'rm-to-L']], ['Fijar extremos', 'Banco de torsión'], ['Aplicar torque', 'T y ángulo θ', ['rm-to-T', 'rm-to-th']], ['Resultados', 'τmáx, γ y G']],
            hint: 'Torque en N·m', main: { id: 'rm-to-tau', sym: 'τmáx', unit: 'MPa', min: 0, max: 300, dec: 1, lab: 'Cortante en el centro de la cara' },
            sec: { 'rm-to-j': 'β · a⁴ (β = 0,1406)', 'rm-to-g': 'τmáx / G', 'rm-to-G': 'T · L / (θ · K)' },
            eq: 'τmáx = T / (α · a³) · θ = T · L / (G · β · a⁴) · α = 0,208 · β = 0,1406',
            sub: function () { return calc('rm-to-tau') ? 'τmáx = ' + f(inp('rm-to-T') * 1000, 0) + ' N·mm / (0,208 · ' + f(inp('rm-to-d'), 1) + '³ mm³) = ' + txt('rm-to-tau') + ' MPa' : ''; }
        },
        dureza: {
            n: '05', mat: RMM, chips: ['ASTM E18', 'Rockwell'], desc: 'Dureza Rockwell de un material a partir del promedio de varias lecturas del durómetro.',
            steps: [['Preparar superficie', 'Limpia y plana'], ['Elegir escala', 'HRB / HRC', ['rm-du-esc']], ['Tomar lecturas', '3 indentaciones', ['rm-du-1', 'rm-du-2', 'rm-du-3']], ['Promedio', 'Dureza del material']],
            hint: 'Durómetro Rockwell', main: { id: 'rm-du-avg', sym: 'HR', unit: '', min: 0, max: 100, dec: 1, lab: 'Dureza promedio' },
            sec: { 'rm-du-sc': 'Escala usada' },
            eq: 'HR = (L₁ + L₂ + L₃) / 3',
            sub: function () { return calc('rm-du-avg') ? 'HR = (' + [inp('rm-du-1'), inp('rm-du-2'), inp('rm-du-3')].filter(ok).join(' + ') + ') / 3 = ' + txt('rm-du-avg') + ' ' + txt('rm-du-sc') : ''; }
        }
    };

    /* ---------------- estilos ---------------- */
    if (!doc.querySelector('link[data-gx-font]')) {
        var lf = doc.createElement('link'); lf.rel = 'stylesheet'; lf.setAttribute('data-gx-font', '1');
        lf.href = 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap'; doc.head.appendChild(lf);
    }
    var HOSTS = '#panel-ensayo,#panel-ensayo-ms2,#panel-ensayo-rm,#dmEnsayosRoot,#est-ensayos';
    var P = ':is(' + HOSTS + ').gx';
    var MONO = '"JetBrains Mono","IBM Plex Mono",ui-monospace,SFMono-Regular,Consolas,monospace';
    var ICO = {
        calc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>',
        save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/></svg>',
        drop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/></svg>',
        back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 6l-6 6 6 6"/></svg>'
    };
    var DL = 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5M4 19h16"/></svg>') + '")';
    var css = doc.createElement('style');
    css.id = 'gx-css';
    css.textContent = [
        P + '{--gx-card:#0b1220;--gx-card2:#0e1628;--gx-line:#1b2638;--gx-line2:#24324a;--gx-tx:#e6edf6;--gx-mu:#8b9ab0;--gx-cy:#22d3ee;--gx-am:#f59e0b;--gx-dl:' + DL + ';max-width:1400px;margin:0 auto;padding:4px 4px 36px;color:var(--gx-tx);background:transparent!important;border:0!important;box-shadow:none!important;backdrop-filter:none!important}',
        P + ' .gx-hidden{display:none!important}',
        /* encabezado */
        P + ' .gx-head{margin:0 0 22px}',
        P + ' .gx-back{display:inline-flex!important;align-items:center;gap:8px;background:none!important;border:0!important;box-shadow:none!important;padding:4px 0!important;margin:0 0 14px!important;color:#c7d2e0!important;font:500 14px/1 ' + MONO + '!important;cursor:pointer;text-transform:none!important;letter-spacing:0!important;min-height:0!important;width:auto!important}',
        P + ' .gx-back svg{width:16px;height:16px}' + P + ' .gx-back:hover{color:var(--gx-cy)!important}',
        P + ' .gx-crumb{font:700 12px/1.2 ' + MONO + ';letter-spacing:.2em;text-transform:uppercase;color:var(--gx-cy)}' + P + ' .gx-crumb span{color:#9aa8bc;margin-left:10px}' + P + ' .gx-crumb i{font-style:normal;color:#475569;margin-left:10px}',
        P + ' .gx-title{margin:8px 0 10px!important;font-size:clamp(26px,3.5vw,42px)!important;font-weight:800!important;letter-spacing:-.02em;line-height:1.08!important;color:#fff!important;text-align:left!important;background:none!important;-webkit-text-fill-color:#fff!important;border:0!important;padding:0!important}',
        P + ' .gx-sub{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;padding-bottom:18px;border-bottom:1px solid var(--gx-line)}',
        P + ' .gx-desc{max-width:620px;margin:0;font-size:15px;line-height:1.5;color:#aebbd0}' + P + ' .gx-desc small{display:block;margin-top:6px;font-size:12.5px;color:var(--gx-mu)}',
        P + ' .gx-chips{display:flex;gap:8px;flex-wrap:wrap}',
        P + ' .gx-chip{padding:8px 14px;border-radius:999px;border:1px solid var(--gx-line2);background:var(--gx-card);font:600 12px/1 ' + MONO + ';color:#dbe4ef;white-space:nowrap}',
        P + ' .gx-chip.live{border-color:rgba(45,212,191,.55);color:#5eead4}' + P + ' .gx-chip.live:before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:#2dd4bf;margin-right:8px;vertical-align:0}',
        P + ' .gx-tools{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}',
        P + ' .gx-tools button{background:transparent!important;border:1px solid var(--gx-line2)!important;color:#dbe4ef!important;border-radius:10px!important;padding:8px 14px!important;font-size:13px!important;text-transform:none!important;box-shadow:none!important;width:auto!important;min-height:0!important}',
        P + ' .gx-steps{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:20px 0 0}',
        P + ' .gx-step{display:flex;align-items:center;gap:14px;padding:15px 16px;border-radius:13px;background:var(--gx-card);border:1px solid var(--gx-line)}',
        P + ' .gx-step b{flex:0 0 auto;width:34px;height:34px;border-radius:8px;display:flex;align-items:center;justify-content:center;font:600 13px/1 ' + MONO + ';color:var(--gx-cy);border:1.5px solid var(--gx-cy);transition:background .25s,color .25s}',
        P + ' .gx-step.done b{background:var(--gx-cy);color:#04202a}',
        P + ' .gx-step strong{display:block;font-size:14px;font-weight:700;color:#f1f5f9}' + P + ' .gx-step span{display:block;margin-top:3px;font-size:12.5px;color:var(--gx-mu)}',
        /* columnas */
        P + ' .gx-lab{display:grid!important;grid-template-columns:minmax(0,.9fr) minmax(0,1.1fr)!important;gap:22px!important;max-width:none!important;width:100%!important;margin:0!important;align-items:stretch!important}',
        P + ' .gx-dp,' + P + ' .gx-rp,' + P + ' .gx-card{background:var(--gx-card)!important;border:1px solid var(--gx-line)!important;border-radius:20px!important;padding:26px 26px!important;box-shadow:none!important;display:flex;flex-direction:column;min-width:0;margin:0!important}',
        P + ' .gx-more{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:22px;margin-top:22px}',
        P + ' .gx-more > *{margin:0!important}',
        P + ' .gx-card > h4,' + P + ' .gx-card > summary{margin:0 0 14px!important;font-size:17px!important;font-weight:700!important;color:#fff!important;text-transform:none!important;letter-spacing:0!important;border:0!important;padding:0!important}',
        P + ' .gx-card{color:#c7d2e0;font-size:14px;line-height:1.55}',
        P + ' .gx-ph{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0 0 18px}',
        P + ' .gx-ph h4{margin:0!important;font-size:19px!important;font-weight:700!important;color:#fff!important;text-transform:none!important;letter-spacing:0!important;border:0!important;padding:0!important;background:none!important}',
        P + ' .gx-ph small{font:500 12px/1 ' + MONO + ';color:var(--gx-mu);white-space:nowrap}',
        P + ' .gx-dp h4:not(.gx-ph h4),' + P + ' .gx-dp legend{margin:18px 0 10px!important;font:700 11px/1.2 ' + MONO + '!important;letter-spacing:.18em!important;text-transform:uppercase!important;color:var(--gx-cy)!important;border:0!important;padding:0!important}',
        P + ' .gx-dp fieldset{border:0!important;padding:0!important;margin:0!important}',
        /* campos */
        P + ' .gx-field{display:block!important;margin:0 0 16px!important;padding:0!important;background:none!important;border:0!important}',
        P + ' .gx-fl{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0 0 7px}',
        P + ' .gx-fl label,' + P + ' .gx-fl .dm-lab{margin:0!important;font-size:14px!important;color:#b8c4d6!important;font-weight:500!important;text-transform:none!important;letter-spacing:0!important}',
        P + ' .gx-fl em{font:600 13px/1 ' + MONO + ';font-style:normal;color:var(--gx-cy)}',
        P + ' .gx-in{position:relative}',
        P + ' .gx-dp input:not([type=checkbox]):not([type=radio]),' + P + ' .gx-dp select{width:100%!important;box-sizing:border-box!important;height:auto!important;padding:14px 44px 14px 18px!important;margin:0!important;border-radius:11px!important;border:1px solid var(--gx-line2)!important;background:#060a12!important;color:#f1f5f9!important;font:500 16px/1.2 ' + MONO + '!important;box-shadow:none!important;transition:border-color .2s,box-shadow .2s}',
        P + ' .gx-dp select{padding-right:18px!important;font-size:14px!important}',
        P + ' .gx-dp table input{padding:9px 12px!important;font-size:14px!important}',
        P + ' .gx-dp input:focus,' + P + ' .gx-dp select:focus{outline:none!important;border-color:var(--gx-cy)!important;box-shadow:0 0 0 3px rgba(34,211,238,.15)!important}',
        P + ' .gx-dp input::placeholder{color:#4b5a70!important}',
        P + ' .gx-in i{position:absolute;right:16px;top:50%;transform:translateY(-50%);font:500 13px/1 ' + MONO + ';font-style:normal;color:var(--gx-mu);pointer-events:none}',
        P + ' .gx-dp .dm-hint{display:block;margin-top:6px;font-size:12px;color:var(--gx-mu)}',
        P + ' .gx-dp > label,' + P + ' .proctor-inputs label,' + P + ' .g-campos-tamices label{font-size:13.5px!important;color:#b8c4d6!important;text-transform:none!important}',
        P + ' .gx-dp .dm-formrow,' + P + ' .gx-dp .form-grid{display:grid!important;grid-template-columns:repeat(auto-fill,minmax(210px,1fr))!important;gap:0 16px!important;margin:0!important;background:none!important;padding:0!important;border:0!important}',
        P + ' .proctor-inputs{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:4px 16px}',
        P + ' .proctor-inputs > div{display:contents}',
        P + ' .gx-equipo{margin:0 0 18px;padding:10px;border-radius:14px;background:#060a12;border:1px solid var(--gx-line)}',
        P + ' .gx-equipo canvas{display:block;width:100%!important;height:auto!important;border-radius:10px}',
        P + ' .gx-equipo canvas.gx-s2d{cursor:pointer}',
        P + ' .gx-s2d-cap{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 4px 2px;font:500 12px/1.3 ' + MONO + ';color:var(--gx-mu)}',
        P + ' .gx-s2d-cap button{flex:0 0 auto;background:transparent!important;border:1px solid var(--gx-line2)!important;color:#dbe4ef!important;border-radius:999px!important;padding:6px 12px!important;font:600 12px/1 ' + MONO + '!important;cursor:pointer;text-transform:none!important;box-shadow:none!important;width:auto!important;min-height:0!important}',
        P + ' .gx-s2d-cap button:hover{border-color:var(--gx-cy)!important;color:#fff!important}',
        P + ' .gx-s2d-cap{flex-wrap:wrap}',
        P + ' .gx-s2d-v{flex:1 0 100%;margin:8px 0 0!important;padding:10px 12px;border-radius:10px;font:600 12.5px/1.45 ' + MONO + ';border:1px solid var(--gx-line2);color:#cbd5e1;background:#0a1120}',
        P + ' .gx-s2d-v.is-ok{border-color:rgba(52,211,153,.5);color:#6ee7b7;background:rgba(6,78,59,.25)}',
        P + ' .gx-s2d-v.is-fail{border-color:rgba(248,113,113,.5);color:#fca5a5;background:rgba(127,29,29,.22)}',
        P + ' .gx-s2d-v.is-info{border-color:rgba(34,211,238,.4);color:#a5f3fc;background:rgba(8,51,68,.3)}',
        P + ' .gx-s2d-v.is-idle{color:var(--gx-mu)}',
        P + ' .gx-comp{margin:4px 0 20px;padding:16px 18px;border:1px dashed var(--gx-line2);border-radius:13px}',
        P + ' .gx-comp-h{display:flex;justify-content:space-between;font:500 12px/1 ' + MONO + ';letter-spacing:.14em;text-transform:uppercase;color:#aebbd0;margin-bottom:14px}' + P + ' .gx-comp-h b{font-weight:500;letter-spacing:.04em;text-transform:none}',
        P + ' .gx-bar{display:flex;height:11px;border-radius:999px;overflow:hidden;background:#111a2b}' + P + ' .gx-bar i{display:block;height:100%;transition:width .45s ease}',
        P + ' .gx-leg{display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;font-size:13px;color:#c7d2e0}' + P + ' .gx-leg span:before{content:"";display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px;background:var(--c);vertical-align:-1px}',
        /* botones */
        P + ' .gx-acts{display:flex;gap:12px;flex-wrap:wrap;margin-top:auto;padding-top:16px}',
        P + ' .gx-acts button{display:inline-flex!important;align-items:center;justify-content:center;gap:9px;flex:1 1 auto;min-height:50px!important;padding:0 18px!important;border-radius:11px!important;font-family:inherit!important;font-size:14.5px!important;font-weight:700!important;line-height:1!important;text-transform:none!important;letter-spacing:.01em!important;box-shadow:none!important;margin:0!important;width:auto!important;cursor:pointer;transition:filter .2s,border-color .2s,background .2s}',
        P + ' .gx-acts button svg{width:17px;height:17px;flex:0 0 auto}',
        P + ' .gx-acts .gx-b-calc{flex:1.25 1 150px;background:var(--gx-cy)!important;color:#03202a!important;border:0!important}' + P + ' .gx-acts .gx-b-calc:hover{filter:brightness(1.08)}',
        P + ' .gx-acts .gx-b-save,' + P + ' .gx-acts .gx-b-sec,' + P + ' .gx-acts .gx-b-clear{background:transparent!important;color:#dbe4ef!important;border:1px solid var(--gx-line2)!important}',
        P + ' .gx-acts .gx-b-save:hover,' + P + ' .gx-acts .gx-b-sec:hover,' + P + ' .gx-acts .gx-b-clear:hover{border-color:var(--gx-cy)!important;color:#fff!important}',
        P + ' .gx-acts .gx-b-clear{flex:.6 1 100px}',
        P + ' .mensaje-error:empty,' + P + ' .error-msg:empty{display:none}',
        /* resultados */
        P + ' .gx-badge{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;border:1px solid rgba(45,212,191,.5);font:500 12.5px/1 ' + MONO + ';color:#5eead4;opacity:0;transform:translateY(-4px);transition:.3s;white-space:nowrap}' + P + ' .gx-badge:before{content:"";width:7px;height:7px;border-radius:50%;background:#2dd4bf}',
        P + ' .gx-on .gx-badge{opacity:1;transform:none}',
        P + ' .gx-top{display:grid;grid-template-columns:250px minmax(0,1fr);gap:20px;align-items:center}',
        P + ' .gx-ring{position:relative;width:250px;height:250px;margin:0 auto}',
        P + ' .gx-ring svg{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg)}',
        P + ' .gx-ring .tr{fill:none;stroke:#0f1a2c;stroke-width:20}' + P + ' .gx-ring .tk{fill:none;stroke:#1a2740;stroke-width:1.4;stroke-dasharray:1 6}',
        P + ' .gx-ring .ar{fill:none;stroke:var(--gx-cy);stroke-width:10;stroke-linecap:round;transition:stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)}',
        P + ' .gx-rc{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 30px}',
        P + ' .gx-rc small{font:500 13px/1 ' + MONO + ';color:var(--gx-mu)}',
        P + ' .gx-rc strong{display:block;margin:10px 0 12px;font:700 50px/1 ' + MONO + ';letter-spacing:-.03em;color:#fff;word-break:break-word}',
        P + ' .gx-rc strong.md{font-size:32px}' + P + ' .gx-rc strong.sm{font-size:21px;line-height:1.15}',
        P + ' .gx-rc span{font:600 16px/1 ' + MONO + ';color:var(--gx-cy)}',
        P + ' .gx-rc em{font-style:normal;font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#64748b;margin-top:8px;max-width:170px}',
        P + ' .resultado-principal,' + P + ' .gx-main-tile,' + P + ' .gx-rp .dm-tile.gx-main-tile,' + P + ' .gx-sec > div.gx-main-tile{display:none!important}',
        P + ' .gx-right{display:flex;flex-direction:column;gap:16px;min-width:0}',
        P + ' .gx-sec,' + P + ' .gx-rp .dm-tiles{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:14px!important;margin:0!important;padding:0!important;background:none!important;border:0!important}',
        P + ' .gx-sec > div,' + P + ' .gx-rp .dm-tile{display:block!important;padding:16px 18px!important;border-radius:15px!important;background:var(--gx-card2)!important;border:1px solid var(--gx-line)!important;min-width:0;text-align:left!important;box-shadow:none!important}',
        P + ' .gx-sec > div > span,' + P + ' .gx-rp .dm-tile > span{display:block!important;font-size:13.5px!important;color:#aebbd0!important;text-transform:none!important;letter-spacing:0!important;margin:0 0 8px!important;font-weight:500!important}',
        P + ' .gx-sec > div > strong,' + P + ' .gx-rp .dm-tile > strong{display:inline!important;font:700 24px/1.15 ' + MONO + '!important;color:var(--gx-cy)!important;word-break:break-word}',
        P + ' .gx-sec > div:nth-child(even) > strong,' + P + ' .gx-rp .dm-tile:nth-child(even) > strong{color:var(--gx-am)!important}',
        P + ' .gx-sec > div > small{display:inline!important;margin-left:7px!important;font:500 14px/1 ' + MONO + '!important;color:#aebbd0!important}',
        P + ' .gx-rp .dm-tile > small{display:block!important;margin-top:8px!important;font:500 12px/1.35 ' + MONO + '!important;color:var(--gx-mu)!important}',
        P + ' .gx-sec > div > em{display:block;margin-top:8px;font:500 12px/1.3 ' + MONO + ';font-style:normal;color:var(--gx-mu)}',
        P + ' .gx-sec.gx-wide,' + P + ' .gx-rp .dm-tiles{grid-template-columns:repeat(auto-fill,minmax(160px,1fr))!important;margin-top:20px!important}',
        P + ' .gx-sec.gx-wide > div > strong{font-size:21px!important}',
        P + ' .gx-eq{padding:18px 20px;border-radius:15px;background:var(--gx-card2);border:1px solid var(--gx-line)}',
        P + ' .gx-eq > span{display:block;font-size:13.5px;color:#aebbd0;margin-bottom:12px}',
        P + ' .gx-eq > b{display:block;font:600 15.5px/1.5 ' + MONO + ';color:#f1f5f9;word-break:break-word}',
        P + ' .gx-eq > code{display:block;margin-top:10px;font:500 13.5px/1.45 ' + MONO + ';color:var(--gx-mu);background:none;padding:0;white-space:normal;word-break:break-word}',
        P + ' .gx-scale{margin-top:24px}',
        P + ' .gx-scale-h{display:flex;justify-content:space-between;gap:10px;font:500 12px/1 ' + MONO + ';letter-spacing:.18em;text-transform:uppercase;color:#aebbd0;margin-bottom:12px}' + P + ' .gx-scale-h b{font-weight:500;letter-spacing:.05em}',
        P + ' .gx-track{position:relative;display:flex;gap:5px;height:12px}',
        P + ' .gx-track > i{display:block;height:100%;border-radius:999px}',
        P + ' .gx-mark{position:absolute;top:-6px;width:5px;height:24px;margin-left:-2.5px;border-radius:3px;background:#fff;box-shadow:0 0 0 2px #070b14;transition:left .9s cubic-bezier(.2,.8,.2,1);opacity:0}',
        P + ' .gx-on .gx-mark{opacity:1}',
        P + ' .gx-labs{position:relative;height:16px;margin-top:10px;font-size:12.5px;color:#9aa8bc}' + P + ' .gx-labs span{position:absolute;top:0;white-space:nowrap}',
        P + ' .interpretacion,' + P + ' .gx-interp,' + P + ' .gx-rp .dm-alerts{position:relative;margin:24px 0 0!important;padding:22px 24px 22px 72px!important;border-radius:15px!important;background:linear-gradient(135deg,rgba(13,60,72,.55),rgba(9,30,44,.55))!important;border:1px solid rgba(34,211,238,.28)!important;list-style:none!important}',
        P + ' .interpretacion:before,' + P + ' .gx-interp:before{content:none!important}',
        P + ' .gx-rp .dm-alerts:before{content:"Observaciones"!important;display:block;font:600 12.5px/1 ' + MONO + ';letter-spacing:.22em;text-transform:uppercase;color:var(--gx-cy);margin:0 0 10px}',
        P + ' .gx-rp .dm-alerts:after{content:"";position:absolute;left:26px;top:22px;width:24px;height:24px;background:var(--gx-cy);-webkit-mask:var(--gx-drop) center/contain no-repeat;mask:var(--gx-drop) center/contain no-repeat}',
        P + ' .gx-rp .dm-alerts li{font-size:14.5px;line-height:1.5;color:#e2e8f0;margin:0 0 4px!important;padding:0!important;background:none!important;border:0!important}',
        P + ' .gx-ico{position:absolute;left:26px;top:24px;width:24px;height:24px;color:var(--gx-cy)}' + P + ' .gx-ico svg{width:100%;height:100%}',
        P + ' .interpretacion > span,' + P + ' .gx-interp > span{display:block!important;font:600 12.5px/1 ' + MONO + '!important;letter-spacing:.22em!important;text-transform:uppercase!important;color:var(--gx-cy)!important;margin:0 0 10px!important}',
        P + ' .interpretacion > p,' + P + ' .gx-interp > p{margin:0!important;font-size:15px!important;line-height:1.55!important;color:#e2e8f0!important}',
        P + ' .gx-interp-x{margin-top:6px!important;color:#aebbd0!important;font-size:14px!important}',
        P + ' .gx-rp .dm-res{display:block}' + P + ' .gx-rp .dm-res > p.dm-empty{display:none}',
        P + ' .gx-rp .dm-tablewrap{margin-top:18px;overflow:auto;border-radius:12px;border:1px solid var(--gx-line)}',
        P + ' .gx-rp table{width:100%;border-collapse:collapse;font-size:13px}' + P + ' .gx-rp th,' + P + ' .gx-rp td{padding:8px 10px;border-bottom:1px solid var(--gx-line);text-align:left}' + P + ' .gx-rp th{color:#aebbd0;font-weight:600;background:#0a1120}',
        P + ' .gx-rp .dm-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}',
        P + ' .gx-rp .dm-actions button{background:transparent!important;border:1px solid var(--gx-line2)!important;color:#dbe4ef!important;border-radius:10px!important;text-transform:none!important;box-shadow:none!important;font-size:13.5px!important}',
        P + ' .gx-rp .dm-error{margin-top:16px;padding:14px 16px;border-radius:12px;border:1px solid rgba(248,113,113,.4);background:rgba(127,29,29,.2);color:#fecaca}',
        P + ' .gx-pdf{margin-top:auto;padding-top:24px;display:flex;flex-direction:column;gap:12px}',
        P + ' .gx-pdf button{display:flex!important;align-items:center;justify-content:center;gap:10px;width:100%!important;min-height:54px!important;border-radius:13px!important;background:transparent!important;border:1px solid var(--gx-line2)!important;color:#f1f5f9!important;font-family:inherit!important;font-size:15px!important;font-weight:700!important;text-transform:none!important;box-shadow:none!important;margin:0!important;cursor:pointer}',
        P + ' .gx-pdf .gx-b-pdf:before{content:"";width:18px;height:18px;background:currentColor;-webkit-mask:var(--gx-dl) center/contain no-repeat;mask:var(--gx-dl) center/contain no-repeat}',
        P + ' .gx-pdf .gx-b-save:before{content:"";width:18px;height:18px;background:currentColor;-webkit-mask:var(--gx-sv) center/contain no-repeat;mask:var(--gx-sv) center/contain no-repeat}',
        P + ' .gx-pdf button:hover{border-color:var(--gx-cy)!important;color:#fff!important}',
        P + ' .gx-pdf button:disabled{opacity:.6}',
        P + ' .gx-rp > .login-hint,' + P + ' .gx-rp > .mohr-resultados{margin-top:16px!important}',
        P + ' .grafica-panel{width:100%!important;max-width:none!important;box-sizing:border-box;margin-top:22px!important;background:var(--gx-card)!important;border:1px solid var(--gx-line)!important;border-radius:20px!important;padding:22px 26px!important;box-shadow:none!important}',
        P + ' .grafica-panel h4{font-size:16px!important;color:#fff!important;text-transform:none!important;letter-spacing:0!important}',
        P + ' .grafica-panel canvas{max-width:100%;height:auto;border-radius:12px}',
        P + ' .btn-grafica{border-radius:10px!important;background:transparent!important;border:1px solid var(--gx-line2)!important;color:#dbe4ef!important;text-transform:none!important;box-shadow:none!important}',
        '@media (max-width:1180px){' + P + ' .gx-top{grid-template-columns:1fr}}',
        '@media (max-width:980px){' + P + ' .gx-lab{grid-template-columns:1fr!important}' + P + ' .gx-steps{grid-template-columns:repeat(2,minmax(0,1fr))}}',
        '@media (max-width:560px){' + P + ' .gx-steps{grid-template-columns:1fr}' + P + ' .gx-dp,' + P + ' .gx-rp,' + P + ' .gx-card{padding:20px 16px!important}' + P + ' .gx-sec,' + P + ' .gx-rp .dm-tiles{grid-template-columns:1fr!important}' + P + ' .gx-rc strong{font-size:42px}' + P + ' .gx-ring{width:220px;height:220px}' + P + ' .interpretacion,' + P + ' .gx-interp,' + P + ' .gx-rp .dm-alerts{padding:20px 18px 20px 58px!important}' + P + ' .gx-ico{left:18px}}'
    ].join('\n');
    css.textContent = css.textContent.replace('--gx-dl:', '--gx-drop:url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/></svg>') + '");--gx-sv:url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M7 3v5h8V3M7 21v-7h10v7"/></svg>') + '");--gx-dl:');
    doc.head.appendChild(css);

    /* ---------------- piezas comunes ---------------- */
    var UNIT = /^(g|kg|cm³|cm3|cm²|cm2|cm|mm|m|m²|m³|%|s|min|h|kPa|MPa|N|kN|N·m|kN·m|°|g\/cm³|kN\/m³|kg\/m³|mm²\/min|mm²|mm⁴|L)$/i;
    var SYMRX = /^(.{3,}?)\s+([A-Za-zΑ-ωθσφτγεδΔ][A-Za-z0-9₀-₉′'ᵢ_]{0,3})$/;
    function limpiarLabel(t, conSimbolo) {
        var unit = '', sym = '';
        t = String(t || '').replace(/\s*:\s*$/, '').replace(/\s+/g, ' ').trim();
        if (/\s%\s*$/.test(t)) { unit = '%'; t = t.replace(/\s%\s*$/, ''); }
        var m = t.match(/\(([^()]*)\)\s*$/);
        if (m) {
            var inner = m[1].trim();
            if (UNIT.test(inner)) { unit = unit || inner; t = t.slice(0, m.index).trim(); }
            else if (/^[A-Za-zΑ-ω₀-₉'′]{1,5}$/.test(inner)) { sym = inner; t = t.slice(0, m.index).trim(); }
        }
        if (conSimbolo && !sym) { var s2 = t.match(SYMRX); if (s2 && !/^(de|del|la|el|en|y|a|por|con)$/i.test(s2[2]) && !/^\d/.test(s2[2])) { sym = s2[2]; t = s2[1].trim(); } }
        return { t: t, unit: unit, sym: sym };
    }
    function campoDesde(lb, input, c, sym) {
        var w = el('div', 'gx-field'), fl = el('div', 'gx-fl'), box = el('div', 'gx-in');
        lb.parentNode.insertBefore(w, lb);
        lb.textContent = c.t; if (input.id) lb.htmlFor = input.id;
        fl.appendChild(lb); if (sym) fl.appendChild(el('em', '', esc(sym)));
        box.appendChild(input); if (c.unit && input.tagName === 'INPUT') box.appendChild(el('i', '', esc(c.unit)));
        w.appendChild(fl); w.appendChild(box);
        return w;
    }
    /* etiqueta seguida de input (Suelos I y II) */
    function camposHermanos(dp, meta) {
        dp.querySelectorAll('label').forEach(function (lb) {
            if (lb.closest('.tamices-selector') || lb.classList.contains('tamiz-check') || lb.closest('.gx-field')) return;
            var nx = lb.nextElementSibling;
            if (!nx || !/^(INPUT|SELECT)$/.test(nx.tagName) || nx.type === 'checkbox' || nx.type === 'radio') return;
            var c = limpiarLabel(lb.textContent || '');
            campoDesde(lb, nx, c, (meta.sym && meta.sym[nx.id]) || c.sym);
        });
    }
    /* input dentro de la etiqueta (Resistencia de Materiales) */
    function camposInternos(dp, meta) {
        dp.querySelectorAll('label').forEach(function (lb) {
            if (lb.closest('.gx-field')) return;
            var input = lb.querySelector('input,select'); if (!input || input.type === 'checkbox' || input.type === 'radio') return;
            var t = ''; lb.childNodes.forEach(function (n) { if (n.nodeType === 3) t += n.textContent; });
            var c = limpiarLabel(t, true);
            campoDesde(lb, input, c, (meta.sym && meta.sym[input.id]) || c.sym);
        });
    }
    /* label.dm-field > span.dm-lab + input (Diseño de Mezclas y Estructuras I) */
    function camposDM(dp) {
        dp.querySelectorAll('label.dm-field:not(.gx-field)').forEach(function (lb) {
            var sp = lb.querySelector('.dm-lab'), input = lb.querySelector('input,select'); if (!sp || !input) return;
            var em = sp.querySelector('em'), unit = em ? em.textContent.replace(/[()]/g, '').trim() : '';
            if (em) em.remove();
            var c = limpiarLabel(sp.textContent, true); if (!c.unit) c.unit = unit;
            sp.textContent = c.t;
            lb.classList.add('gx-field');
            var fl = el('div', 'gx-fl'), box = el('div', 'gx-in');
            lb.insertBefore(fl, lb.firstChild); fl.appendChild(sp); if (c.sym) fl.appendChild(el('em', '', esc(c.sym)));
            lb.insertBefore(box, fl.nextSibling); box.appendChild(input);
            if (c.unit && input.tagName === 'INPUT') box.appendChild(el('i', '', esc(c.unit)));
        });
    }
    function titulo1(s) { s = String(s || '').trim(); return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase(); }
    function marcarBoton(b) {
        var t = (b.textContent || '').trim(), oc = b.getAttribute('onclick') || '';
        if (/guardarDatos/.test(oc) || /^guardar/i.test(t)) { b.classList.add('gx-b-save'); b.innerHTML = ICO.save + 'Guardar'; }
        else if (/^(limpiar|restablecer)$/i.test(t)) { b.classList.add('gx-b-clear'); b.textContent = titulo1(t); }
        else if (b.classList.contains('btn-calcular') && /calcular|clasificar/i.test(t)) { b.classList.add('gx-b-calc'); b.innerHTML = ICO.calc + titulo1(t); }
        else { b.classList.add('gx-b-sec'); b.textContent = titulo1(t); }
    }
    function ordenar(acts) {
        var ord = ['gx-b-calc', 'gx-b-save', 'gx-b-sec', 'gx-b-clear'];
        [].slice.call(acts.children).sort(function (a, b) { return ord.findIndex(function (c) { return a.classList.contains(c); }) - ord.findIndex(function (c) { return b.classList.contains(c); }); }).forEach(function (b) { acts.appendChild(b); });
    }
    function encabezado(o) {
        var hd = el('div', 'gx-head');
        if (o.back) { o.back.classList.add('gx-back'); o.back.classList.remove('btn-limpiar', 'ms2-back', 'btn-volver', 'btn-volver-panel'); o.back.innerHTML = ICO.back + 'Volver a ensayos'; hd.appendChild(o.back); }
        hd.appendChild(el('div', 'gx-crumb', esc(o.mat) + '<i>/</i><span>' + esc(o.n) + '</span>'));
        var t = el('h2', 'gx-title'); t.textContent = o.titulo; hd.appendChild(t);
        var sub = el('div', 'gx-sub');
        sub.appendChild(el('p', 'gx-desc', esc(o.desc || '') + (o.note ? '<small>' + esc(o.note) + '</small>' : '')));
        var ch = el('div', 'gx-chips');
        (o.chips || []).forEach(function (c) { if (c) ch.appendChild(el('span', 'gx-chip', esc(c))); });
        if (o.live) ch.appendChild(el('span', 'gx-chip live', esc(o.live)));
        sub.appendChild(ch); hd.appendChild(sub);
        if (o.tools && o.tools.length) { var tl = el('div', 'gx-tools'); o.tools.forEach(function (b) { tl.appendChild(b); }); hd.appendChild(tl); }
        var st = el('div', 'gx-steps');
        o.steps.forEach(function (p, i) { var c = el('div', 'gx-step', '<b>' + ('0' + (i + 1)).slice(-2) + '</b><div><strong>' + esc(p[0]) + '</strong><span>' + esc(p[1]) + '</span></div>'); c.__in = p[2]; st.appendChild(c); });
        hd.appendChild(st);
        hd.__steps = st;
        return hd;
    }
    function panelHead(card, h4, extra) {
        var ph = el('div', 'gx-ph'); card.insertBefore(ph, card.firstChild);
        if (h4) ph.appendChild(h4); else ph.appendChild(el('h4', '', 'Resultados'));
        if (extra) ph.appendChild(extra);
        return ph;
    }
    function bloqueResultados(rp, meta, mlab, sec) {
        var ph = rp.querySelector(':scope > .gx-ph');
        var R = 100, C = 2 * Math.PI * R;
        var top = el('div', 'gx-top'), ring = el('div', 'gx-ring', '<svg viewBox="0 0 250 250"><circle class="tr" cx="125" cy="125" r="' + R + '"/><circle class="tk" cx="125" cy="125" r="116"/><circle class="ar" cx="125" cy="125" r="' + R + '" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + C.toFixed(1) + '"/></svg><div class="gx-rc"><small>' + esc(meta.main.sym || '') + '</small><strong>—</strong><span>' + esc(meta.main.unit || '') + '</span><em>' + esc(mlab || '') + '</em></div>');
        var right = el('div', 'gx-right');
        if (sec) {
            sec.classList.add('gx-sec');
            right.appendChild(sec);
            sec.querySelectorAll(':scope > div').forEach(function (d) { var s = d.querySelector('strong'); if (!s) return; if (meta.main.id && s.id === meta.main.id && meta.hideMainInSec) d.classList.add('gx-main-tile'); if (meta.sec && meta.sec[s.id] && !d.querySelector('em')) d.appendChild(el('em', '', esc(meta.sec[s.id]))); });
        }
        var eq = el('div', 'gx-eq', '<span>Ecuación aplicada</span><b>' + esc(meta.eq || '') + '</b><code></code>'); right.appendChild(eq);
        if (!meta.eq) eq.style.display = 'none';
        top.appendChild(ring); top.appendChild(right);
        ph.parentNode.insertBefore(top, ph.nextSibling);
        var after = top, scale = null;
        if (sec && sec.querySelectorAll(':scope > div:not(.gx-main-tile)').length > 4) { sec.classList.add('gx-wide'); top.parentNode.insertBefore(sec, top.nextSibling); after = sec; }
        if (meta.scale) {
            var sc = meta.scale, span = sc.max - sc.min;
            scale = el('div', 'gx-scale', '<div class="gx-scale-h"><span>Escala referencial</span><b>' + (sc.log ? 'log k: 10⁻⁹ — 10⁰ cm/s' : sc.min + ' — ' + sc.max + ' ' + (meta.main.unit || '')) + '</b></div>');
            var tr = el('div', 'gx-track'), labs = el('div', 'gx-labs'), n = sc.segs.length;
            sc.segs.forEach(function (s, i) {
                var seg = el('i'); seg.style.flex = ((s[1] - s[0]) / span) + ' 1 0';
                var a = 0.25 + 0.75 * (i / Math.max(1, n - 1));
                seg.style.background = '#1e293b'; seg.style.background = 'color-mix(in srgb, #22d3ee ' + Math.round(a * 100) + '%, #1e293b)';
                tr.appendChild(seg);
                var l = el('span', '', esc(s[2])); l.style.left = ((s[0] - sc.min) / span * 100) + '%'; labs.appendChild(l);
            });
            tr.appendChild(el('span', 'gx-mark')); scale.appendChild(tr); scale.appendChild(labs);
            after.parentNode.insertBefore(scale, after.nextSibling); after = scale;
        }
        var it = rp.querySelector('.interpretacion');
        if (it && meta.eqFrom) { it.classList.add('gx-hidden'); it = null; }
        if (!it && (meta.interp || meta.notes)) { it = el('div', 'gx-interp', '<span>Interpretación</span><p>Ingresa los datos para obtener el resultado.</p>'); it.__own = true; }
        if (it) {
            it.insertBefore(el('div', 'gx-ico', ICO.drop), it.firstChild);
            it.appendChild(el('p', 'gx-interp-x'));
            after.parentNode.insertBefore(it, after.nextSibling); after = it;
        }
        return { ring: ring, C: C, eq: eq, scale: scale, it: it, after: after };
    }
    function zonaPdf(rp) { var w = rp.querySelector(':scope > .gx-pdf'); if (!w) { w = el('div', 'gx-pdf'); rp.appendChild(w); } return w; }

    function nivel(meta, v) {
        var sc = meta.scale; if (!sc || !ok(v)) return null;
        var x = sc.log ? Math.log10(v) : v;
        for (var i = 0; i < sc.segs.length; i++) if (x < sc.segs[i][1] || i === sc.segs.length - 1) return { lab: sc.segs[i][2], x: x };
        return null;
    }
    function set(e, prop, val) { if (e && e[prop] !== val) e[prop] = val; }

    /* lectura del resultado principal según la familia */
    function principal(ctx) {
        var meta = ctx.meta;
        if (ctx.tiles) {
            var box = ctx.tiles(), tl = box ? box.querySelectorAll('.dm-tile') : [];
            if (!tl.length) return { hay: false };
            var t = box.querySelector('.dm-tile.is-big') || tl[0];
            tl.forEach(function (x) { x.classList.toggle('gx-main-tile', x === t); });
            var s = t.querySelector('strong'), sp = t.querySelector('span'), sm = t.querySelector('small');
            var raw = s ? s.textContent.trim() : '', v = num(raw), unidad = '';
            var m = raw.match(/^-?[\d.,]+(?:e[-+]?\d+)?\s*(.*)$/i); if (m && ok(v)) unidad = m[1];
            return { hay: !!raw && raw !== '—', text: raw, v: v, lab: sp ? sp.textContent.trim() : '', unit: unidad, hint: sm ? sm.textContent.trim() : '', txtOnly: !ok(v) || !/^-?[\d.,]/.test(raw) };
        }
        var mt = txt(meta.main.id), v2 = num(mt);
        return { hay: calc(meta.main.id), text: mt, v: v2, txtOnly: !!meta.main.text || !ok(v2) };
    }

    function refrescar(ctx) {
        var meta = ctx.meta, pr = principal(ctx), hay = pr.hay, v = pr.v;
        ctx.rp.classList.toggle('gx-on', !!hay);
        var rc = ctx.R.ring.querySelector('.gx-rc strong'), ar = ctx.R.ring.querySelector('.ar'), show = '—', frac = 0;
        if (hay) {
            if (pr.txtOnly) { show = pr.text; frac = 1; }
            else if (meta.main.log) { show = sci(v); frac = (Math.log10(v) - meta.main.min) / (meta.main.max - meta.main.min); }
            else if (meta.main.min != null) { show = v.toFixed(meta.main.dec != null ? meta.main.dec : 2); frac = (v - meta.main.min) / (meta.main.max - meta.main.min); }
            else { show = String(pr.text).replace(/\s*[^\d.,\-e].*$/i, '') || pr.text; frac = 1; }
        }
        frac = Math.max(0, Math.min(1, frac));
        set(rc, 'textContent', show);
        var cls = show.length > 9 ? 'sm' : show.length > 6 ? 'md' : '';
        if (rc.className !== cls) rc.className = cls;
        var off = (ctx.R.C * (1 - (hay ? Math.max(frac, 0.02) : 0))).toFixed(1);
        if (ar.getAttribute('stroke-dashoffset') !== off) ar.setAttribute('stroke-dashoffset', off);
        if (ctx.tiles) {
            var sm = ctx.R.ring.querySelector('.gx-rc small'), un = ctx.R.ring.querySelector('.gx-rc span'), lb = ctx.R.ring.querySelector('.gx-rc em');
            set(sm, 'textContent', hay ? pr.lab : (meta.main.sym || 'Resultado'));
            set(un, 'textContent', hay && !pr.txtOnly ? pr.unit : '');
            set(lb, 'textContent', hay ? (pr.hint || '') : 'Pulsa calcular');
        }
        var code = ctx.R.eq.querySelector('code'), s = '';
        if (hay) { try { s = meta.eqFrom ? txt(meta.eqFrom) : (meta.sub ? meta.sub() : ''); } catch (e) { s = ''; } }
        set(code, 'textContent', s); code.style.display = s ? '' : 'none';
        var nv = hay && !pr.txtOnly ? nivel(meta, v) : null;
        if (ctx.R.scale && nv) {
            var mk = ctx.R.scale.querySelector('.gx-mark'), sc = meta.scale;
            var l = ((Math.max(sc.min, Math.min(sc.max, nv.x)) - sc.min) / (sc.max - sc.min) * 100).toFixed(2) + '%'; if (mk.style.left !== l) mk.style.left = l;
        }
        if (ctx.R.it) {
            var tl = ctx.R.it.querySelector(':scope > span'), px = ctx.R.it.querySelector('.gx-interp-x'), mainP = ctx.R.it.querySelector(':scope > p:not(.gx-interp-x)');
            var titulo = 'Interpretación', extra = '';
            if (hay && meta.interp) { var r = null; try { r = meta.interp(); } catch (e) { } if (r) { titulo += ' · ' + r[0]; if (ctx.R.it.__own) set(mainP, 'textContent', r[1]); else extra = r[1]; } }
            else if (nv) { titulo += ' · ' + nv.lab; var nt = meta.notes && meta.notes[nv.lab]; if (ctx.R.it.__own) set(mainP, 'textContent', nt || ''); else extra = nt || ''; }
            if (hay && meta.extra) { try { extra = (extra ? extra + ' ' : '') + meta.extra(); } catch (e) { } }
            if (!hay && ctx.R.it.__own) set(mainP, 'textContent', 'Ingresa los datos para obtener el resultado.');
            set(tl, 'textContent', titulo); set(px, 'textContent', extra); px.style.display = extra ? '' : 'none';
        }
        if (ctx.comp) {
            var m1 = inp('h-recipiente'), m2 = inp('h-humeda'), m3 = inp('h-seca'), bars = ctx.comp.querySelectorAll('.gx-bar i'), hb = ctx.comp.querySelector('.gx-comp-h b');
            if (ok(m1) && ok(m2) && ok(m3) && m2 > m3 && m3 > m1 && m1 >= 0) {
                [m1, m3 - m1, m2 - m3].forEach(function (x, i) { var w = (x / m2 * 100).toFixed(2) + '%'; if (bars[i].style.width !== w) bars[i].style.width = w; });
                set(hb, 'textContent', m2.toFixed(2) + ' g');
            } else { bars.forEach(function (b) { if (b.style.width !== '0px') b.style.width = '0'; }); set(hb, 'textContent', ok(m2) ? m2.toFixed(2) + ' g' : '— g'); }
        }
        var lleno = ctx.dp ? [].slice.call(ctx.dp.querySelectorAll('input[type=number],input:not([type])')).some(function (x) { return x.value !== ''; }) : false;
        ctx.steps.querySelectorAll('.gx-step').forEach(function (stp, i, all) {
            var d;
            if (i === all.length - 1) d = hay;
            else if (stp.__in) d = stp.__in.every(function (id) { var e = $(id); return e && e.value !== ''; });
            else if (ctx.genericSteps) d = i === 0 ? lleno : hay;
            else d = hay;
            stp.classList.toggle('done', !!d);
        });
    }
    function vigilar(ctx, nodos) {
        var pend = false;
        function go() { if (pend) return; pend = true; requestAnimationFrame(function () { pend = false; try { refrescar(ctx); } catch (e) { if (window.console) console.warn('[ensayos-diseno]', e); } }); }
        var mo = new MutationObserver(go);
        nodos.forEach(function (n) { if (n) mo.observe(n, { childList: true, characterData: true, subtree: true }); });
        if (ctx.dp) { ctx.dp.addEventListener('input', go); ctx.dp.addEventListener('change', go); }
        ctx.go = go;
        refrescar(ctx);
    }
    function composicion(dp) {
        var c = el('div', 'gx-comp', '<div class="gx-comp-h"><span>Composición de M₂</span><b>— g</b></div><div class="gx-bar"><i style="background:#3b4a63;width:0"></i><i style="background:#f59e0b;width:0"></i><i style="background:#22d3ee;width:0"></i></div><div class="gx-leg"><span style="--c:#3b4a63">Recipiente</span><span style="--c:#f59e0b">Sólidos</span><span style="--c:#22d3ee">Agua</span></div>');
        var acts = dp.querySelector('.gx-acts'); dp.insertBefore(c, acts); return c;
    }

    /* =============== familia 1: Mecánica de Suelos I y II (app.js) =============== */
    function mejorarMS(lab) {
        var host = lab.closest('#panel-ensayo, #panel-ensayo-ms2'); if (!host) return;
        var g = lab.querySelector('[onclick*="guardarDatosEnsayo"]'), m = g && (g.getAttribute('onclick') || '').match(/guardarDatosEnsayo(?:MS2)?\('([a-z]+)'\)/);
        var tipo = m && m[1], meta = tipo && M[tipo]; if (!meta) return;
        var dp = lab.querySelector('.datos-panel'), rp = lab.querySelector('.resultado-panel'); if (!dp || !rp) return;
        host.classList.add('gx'); lab.classList.add('gx-lab'); dp.classList.add('gx-dp'); rp.classList.add('gx-rp');
        var oldHead = host.querySelector(':scope > .ensayo-vista-head'), back = oldHead && oldHead.querySelector('button');
        var h3 = null, note = '';
        for (var s = lab.previousElementSibling; s && s !== oldHead; s = s.previousElementSibling) {
            if (s.tagName === 'H3' && !h3) h3 = s;
            if (s.classList.contains('login-hint')) { note = s.textContent.trim(); s.classList.add('gx-hidden'); }
        }
        var titulo = (h3 ? h3.textContent : 'Ensayo').replace(/^Ensayo de\s+/i, '').trim();
        if (h3) h3.classList.add('gx-hidden');
        var hd = encabezado({ back: back, mat: meta.mat, n: 'Ensayo ' + meta.n, titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1), desc: meta.desc, note: note, chips: meta.chips, live: meta.live, steps: meta.steps });
        host.insertBefore(hd, oldHead ? oldHead.nextSibling : host.firstChild);
        if (oldHead) oldHead.classList.add('gx-hidden');
        var h4 = dp.querySelector(':scope > h4'); if (h4) panelHead(dp, h4, el('small', '', esc(meta.hint || '')));
        var eqp = el('div', 'gx-equipo'); var phd = dp.querySelector(':scope > .gx-ph'); dp.insertBefore(eqp, phd ? phd.nextSibling : dp.firstChild);
        maquina2D(eqp, null, tipo, dp); if (!eqp.children.length) eqp.remove();
        camposHermanos(dp, meta);
        var acts = el('div', 'gx-acts'), pdf = null;
        [].slice.call(dp.querySelectorAll('.botones-calculo button')).filter(function (b) { return !b.closest('.tamices-selector'); }).forEach(function (b) {
            if (b.classList.contains('btn-informe-pdf')) { pdf = b; return; }
            marcarBoton(b); acts.appendChild(b);
        });
        ordenar(acts);
        dp.querySelectorAll('.botones-calculo').forEach(function (bc) { if (!bc.closest('.tamices-selector') && !bc.querySelector('button')) bc.remove(); });
        var err = dp.querySelector('.mensaje-error'); if (err) dp.insertBefore(acts, err); else dp.appendChild(acts);
        panelHead(rp, rp.querySelector(':scope > h4'), el('span', 'gx-badge', 'Ensayo calculado'));
        var main = rp.querySelector('.resultado-principal'), mlab = main && main.querySelector('span') ? main.querySelector('span').textContent.trim() : '';
        var R = bloqueResultados(rp, meta, mlab, rp.querySelector('.resultados-secundarios'));
        if (!pdf) pdf = doc.getElementById('btnInforme-' + tipo);
        if (!pdf && typeof window.generarInformeEnsayoPDF === 'function') {
            pdf = el('button', 'btn-informe-pdf', 'Descargar informe'); pdf.type = 'button'; pdf.id = 'btnInforme-' + tipo;
            pdf.setAttribute('onclick', "generarInformeEnsayoPDF('" + tipo + "')");
        }
        if (pdf) { pdf.classList.add('gx-b-pdf'); zonaPdf(rp).appendChild(pdf); }
        var ctx = { meta: meta, rp: rp, dp: dp, R: R, steps: hd.__steps, comp: meta.comp ? composicion(dp) : null };
        var nodos = [meta.main.id].concat(Object.keys(meta.sec || {})).map($);
        nodos.push(rp.querySelector('.interpretacion p')); if (meta.eqFrom) nodos.push($(meta.eqFrom));
        vigilar(ctx, nodos);
        var dpPend = false; new MutationObserver(function () { if (dpPend) return; dpPend = true; setTimeout(function () { dpPend = false; camposHermanos(dp, meta); }, 0); }).observe(dp, { childList: true, subtree: true });
    }


    /* Máquina detallada de Simuladores (GeoSim2D) dentro del ensayo de Resistencia de Materiales */
    function R(id) { return num(txt(id)); }
    function sel(id) { var e = $(id); return e ? e.value : undefined; }
    var MAP2D = {
        traccion: function () { var E = R('rm-tr-E'); return { d: inp('rm-tr-d'), L0: inp('rm-tr-l0'), mat: ok(E) ? (E < 120 ? 'alum' : (R('rm-tr-su') > 600 ? 'alta' : 'a36')) : undefined }; },
        compresion: function () { return { d: inp('rm-co-d') }; },
        flexion: function () { var mr = R('rm-fl-mr'); return { L: inp('rm-fl-L'), b: inp('rm-fl-b'), h: inp('rm-fl-h'), mat: ok(mr) ? (mr <= 12 ? 'conc' : mr <= 120 ? 'madera' : 'acero') : undefined }; },
        torsion: function () { var G = R('rm-to-G'), m; if (ok(G)) { var o = { acero: 80, laton: 39, alum: 26 }; m = Object.keys(o).sort(function (a, b) { return Math.abs(o[a] - G) - Math.abs(o[b] - G); })[0]; } return { d: inp('rm-to-d'), L: inp('rm-to-L'), mat: m, sec: 'cuadrada' }; },
        dureza: function () { return { esc: sel('rm-du-esc'), hr: R('rm-du-avg') }; },
        humedad: function () { var r = inp('h-recipiente'), h = inp('h-humeda'), s = inp('h-seca'); return { tara: r, recipiente: r, humeda: h, seca: s, Wh: h - r, w: (h - s) / (s - r) * 100 }; },
        granulometria: function () { return { M: inp('g-total'), total: inp('g-total') }; },
        limites: function () { return { LL: R('l-ll'), IP: R('l-ip'), lp: inp('l-lp') }; },
        gravedad: function () { return { Ws: inp('ge-picsuelo') - inp('ge-pic'), Gs: R('ge-gs'), mp: inp('ge-pic'), mps: inp('ge-picsuelo'), mpws: inp('ge-paguasuelo'), mpw: inp('ge-pagua') }; },
        compactacion: function () { return { wopt: R('cp-wopt'), gmax: R('cp-gdmaxkn'), molde: inp('cp-molde'), vol: inp('cp-vol') }; },
        densidad: function () { return { rs: inp('d-darena'), darena: inp('d-darena'), V: R('d-vol'), rh: R('d-gh'), w: inp('d-w'), cono: inp('d-cono'), rest: inp('d-rest'), suelo: inp('d-suelo') }; },
        clasificacion: function () { return { F200: inp('c-p200'), p200: inp('c-p200'), LL: inp('c-ll'), ll: inp('c-ll'), IP: inp('c-ip'), ip: inp('c-ip'), F4: 100 - inp('c-p4'), p4: 100 - inp('c-p4') }; },
        permeabilidad: function () { var k = R('p-k'), a = inp('p-a'); return { lk: k > 0 ? Math.log10(k) : NaN, h: inp('p-h'), L: inp('p-l'), l: inp('p-l'), D: a > 0 ? Math.sqrt(4 * a / Math.PI) : NaN, vol: inp('p-vol'), t: inp('p-t'), a: a }; },
        corte: function () { return { sn: inp('cd-pv1'), c: R('cd-c'), phi: R('cd-phi') }; },
        inconfinada: function () { return { d: inp('uc-d'), L0: inp('uc-l0'), qu: R('uc-qu'), epsf: R('uc-ef') }; },
        consolidacion: function () { return { e0: inp('co-e0'), Cc: R('co-cc'), Cv: R('co-cv'), s0: inp('co-s1'), s1: inp('co-s2') }; },
        triaxial: function () { return { tipo: sel('tx-tipo'), c: R('tx-c'), phi: R('tx-phi') }; }
    };

    /* ------------------------------------------------------------------
       Adaptadores: llevan los datos y resultados del ensayo a la máquina 2D
       pre(P)   → ajusta los parámetros de entrada (sin los límites del simulador)
       post(P,M,def) → ajusta el modelo con los valores reales y decide si la muestra falla
       Devuelve { pEnd: hasta dónde llega la animación, v: [texto, 'ok' | 'fail' | 'info'] }
    ------------------------------------------------------------------ */
    function clone(o) { var r = {}; for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) r[k] = o[k]; return r; }
    function pHasta(def, P, M, key, target, pmax) {
        var prev = 0;
        for (var i = 1; i <= 800; i++) {
            var p = pmax * i / 800;
            if (def.at(P, M, p)[key] >= target) {
                var lo = prev, hi = p;
                for (var k = 0; k < 40; k++) { var mid = (lo + hi) / 2; if (def.at(P, M, mid)[key] >= target) hi = mid; else lo = mid; }
                return hi;
            }
            prev = p;
        }
        return pmax;
    }
    function f1(v, d) { return ok(v) ? v.toFixed(d == null ? 1 : d) : '—'; }
    var ADAPT = {
        traccion: {
            post: function (P, M, def) {
                var su = R('rm-tr-su'), sy = R('rm-tr-sy'), E = R('rm-tr-E'), A0 = R('rm-tr-a'), Pa = inp('rm-tr-p'), Py = inp('rm-tr-py'), Pu = inp('rm-tr-pu');
                if (!ok(su) || !ok(A0)) return null;
                var m = clone(M.m); m.brittle = false;
                if (ok(E) && E > 1) m.E = E * 1000;
                if (ok(sy) && sy > 0) m.sy = sy; if (m.sy >= su) m.sy = su * 0.9;
                m.su = su; m.sf = su * 0.75;
                var ey = m.sy / m.E; m.eh = Math.max(m.eh || 0.02, ey * 3); m.eu = Math.max(m.eu || 0.2, m.eh * 2.5); m.ef = Math.max(m.ef || 0.27, m.eu * 1.3);
                M.m = m; M.A0 = A0; M.ef = m.ef; M.Pmax = su * A0 / 1000; M.ey = ey;
                if (!ok(Pa)) Pa = Pu;
                if (ok(Pu) && Pa >= Pu) return { pEnd: 1, v: ['La probeta se rompe: P = ' + f1(Pa) + ' kN ≥ Pu = ' + f1(Pu) + ' kN (σu = ' + f1(su) + ' MPa)', 'fail'] };
                var pe = pHasta(def, P, M, 'Pk', Pa, 0.9);
                if (ok(Py) && Pa < Py) return { pEnd: pe, v: ['No falla · zona elástica: P = ' + f1(Pa) + ' kN < Py = ' + f1(Py) + ' kN', 'ok'] };
                return { pEnd: pe, v: ['No se rompe · fluencia plástica: Py ≤ P = ' + f1(Pa) + ' kN < Pu = ' + f1(Pu) + ' kN', 'info'] };
            }
        },
        compresion: {
            post: function (P, M) {
                var fc = R('rm-co-fc'), A = R('rm-co-a'), h = inp('rm-co-h'), Pf = inp('rm-co-p');
                if (!ok(fc) || !ok(A)) return null;
                var m = clone(M.m); m.fc = fc;
                M.m = m; M.f = 1; M.A0 = A; if (ok(h)) M.H = h; M.fc = fc; M.Pmax = fc * A / 1000; M.E = m.fail === 'cone' ? 4700 * Math.sqrt(fc) : M.E;
                return { pEnd: 1, v: ['El cilindro falla a P = ' + f1(Pf) + ' kN → fc = ' + f1(fc, 2) + ' MPa', 'fail'] };
            }
        },
        flexion: {
            post: function (P, M) {
                var Mr = R('rm-fl-mr'), Pf = inp('rm-fl-p'), L = inp('rm-fl-L'), b = inp('rm-fl-b'), h = inp('rm-fl-h');
                if (!ok(Mr) || !ok(Pf)) return null;
                var m = clone(M.m); m.sr = Mr; M.m = m;
                if (ok(b) && ok(h)) M.I = b * Math.pow(h, 3) / 12;
                M.Pmax = Pf * 1000; M.dmax = M.Pmax * Math.pow(ok(L) ? L : P.L, 3) / (48 * m.E * M.I);
                return { pEnd: 1, v: [m.brittle ? 'La viga se rompe a P = ' + f1(Pf) + ' kN → Mr = ' + f1(Mr, 2) + ' MPa' : 'La viga fluye (rótula plástica) a P = ' + f1(Pf) + ' kN → Mr = ' + f1(Mr, 2) + ' MPa', 'fail'] };
            }
        },
        torsion: {
            post: function (P, M, def) {
                var tau = R('rm-to-tau'), G = R('rm-to-G'), T = inp('rm-to-T'), d = inp('rm-to-d');
                if (!ok(tau) || !ok(T)) return null;
                var m = clone(M.m); if (ok(G) && G > 1) m.G = G * 1000; M.m = m;
                if (ok(d) && d > 0) { M.sq = true; M.J = 0.1406 * Math.pow(d, 4); M.c = d / 2; M.Jc = 0.208 * Math.pow(d, 3); M.kphi = 0.208 / (0.1406 * d); }
                var Jc = M.Jc || M.J / M.c; M.Ty = m.ty * Jc / 1000; M.Tu = m.tu * Jc / 1000;
                if (tau >= m.tu) return { pEnd: 1, v: ['La barra se fractura: τ = ' + f1(tau) + ' MPa ≥ τu = ' + f1(m.tu, 0) + ' MPa (' + m.n + ')', 'fail'] };
                var pe = pHasta(def, P, M, 'T', T, 0.95);
                if (tau < m.ty) return { pEnd: pe, v: ['No falla · zona elástica: τ = ' + f1(tau) + ' MPa < τy = ' + f1(m.ty, 0) + ' MPa (' + m.n + ')', 'ok'] };
                return { pEnd: pe, v: ['No se rompe · fluencia: τy ≤ τ = ' + f1(tau) + ' MPa < τu = ' + f1(m.tu, 0) + ' MPa', 'info'] };
            }
        },
        dureza: {
            post: function (P) { var hr = R('rm-du-avg'); if (!ok(hr)) return null; return { pEnd: 1, v: ['Lectura promedio ' + f1(hr) + ' ' + (txt('rm-du-sc') || 'HR'), 'info'] }; }
        },
        humedad: {
            pre: function (P) { var r = inp('h-recipiente'), h = inp('h-humeda'), s = inp('h-seca'); if (ok(r) && ok(h) && ok(s) && h > s && s > r) { P.tara = r; P.Wh = h - r; P.w = (h - s) / (s - r) * 100; } },
            post: function () { if (!calc('h-resultado')) return null; return { pEnd: 1, v: ['w = ' + txt('h-resultado') + ' · agua ' + txt('h-agua') + ' g · sólidos ' + txt('h-suelo') + ' g', 'info'] }; }
        },
        granulometria: {
            post: function (P, M) {
                var tab = window.TAMICES_ASTM || [], inputs = doc.querySelectorAll('.g-ret-input'); if (!inputs.length) return null;
                var SV = [19, 9.5, 4.75, 2.0, 0.425, 0.15, 0.075], fin = [0, 0, 0, 0, 0, 0, 0, 0], sum = 0, any = false;
                inputs.forEach(function (e) {
                    var v = parseFloat(String(e.value).replace(',', '.')); if (!ok(v) || v <= 0) return; any = true;
                    var t = tab.filter(function (x) { return x.id === e.getAttribute('data-tid'); })[0], d = t ? t.d : 0, j = -1;
                    for (var k = 0; k < SV.length; k++) if (SV[k] <= d + 1e-9) { j = k; break; }
                    if (j < 0) j = d > SV[0] ? 0 : SV.length;
                    fin[j] += v; sum += v;
                });
                if (!any) return null;
                var tot = inp('g-total'), fondo = inp('g-p200');
                if (ok(fondo)) fin[7] += fondo; else if (ok(tot) && tot > sum) fin[7] += tot - sum;
                var T = fin.reduce(function (a, b) { return a + b; }, 0); if (T <= 0) return null;
                M.fin = fin; P.M = T;
                var acc = 0; M.pass = SV.map(function (x, i) { acc += fin[i]; return Math.max(0, 100 - acc / T * 100); });
                return { pEnd: 1, v: calc('g-tipo') ? [txt('g-tipo') + ' · Cu = ' + txt('g-cu') + ' · Cc = ' + txt('g-cc'), 'info'] : ['Masa total ' + f1(T) + ' g repartida en los tamices', 'info'] };
            }
        },
        limites: {
            post: function (P, M) {
                if (!calc('l-ll')) return null;
                var best = null; for (var i = 1; i <= 3; i++) { var g = inp('l-g' + i), w = inp('l-h' + i); if (ok(g) && ok(w) && (!best || Math.abs(g - 25) < Math.abs(best.g - 25))) best = { g: g, w: w }; }
                if (best) { M.Nc = best.g; M.w = best.w; }
                M.LP = R('l-lpres');
                return { pEnd: 1, v: ['LL = ' + txt('l-ll') + ' % · LP = ' + txt('l-lpres') + ' % · IP = ' + txt('l-ip') + ' %' + (best ? ' · ranura cerrada a ' + best.g + ' golpes' : ''), 'info'] };
            }
        },
        gravedad: {
            pre: function (P) { var w1 = inp('ge-pic'), w2 = inp('ge-picsuelo'); if (ok(w1) && ok(w2) && w2 > w1) P.Ws = w2 - w1; },
            post: function (P, M) {
                var gs = R('ge-gs'); if (!ok(gs)) return null;
                var w3 = inp('ge-paguasuelo'), w4 = inp('ge-pagua'), w1 = inp('ge-pic');
                if (ok(w4)) M.Wpw = w4; if (ok(w3)) M.Wpws = w3; if (ok(w1)) M.Wp = w1;
                M.GsT = gs; M.Gs20 = gs;
                return { pEnd: 1, v: ['Gs = ' + f1(gs, 3) + ' · ' + (txt('ge-tipo') || ''), 'info'] };
            }
        },
        compactacion: {
            post: function (P, M) {
                var mol = inp('cp-molde'), V = inp('cp-vol'), pts = [];
                if (!ok(mol) || !ok(V) || V <= 0) return null;
                for (var i = 1; i <= 5; i++) { var W = inp('cp-h' + i), w = inp('cp-w' + i); if (ok(W) && ok(w) && W > mol) pts.push({ w: w, gd: (W - mol) / V / (1 + w / 100) * 9.81 }); }
                if (!pts.length) return null;
                while (pts.length < 5) pts.push(pts[pts.length - 1]);
                M.ws = pts.map(function (q) { return q.w; }); M.gds = pts.map(function (q) { return q.gd; });
                var mx = pts.reduce(function (a, b) { return b.gd > a.gd ? b : a; });
                var Pr = clone(M.Pr); Pr.gm = ok(R('cp-gdmaxkn')) ? R('cp-gdmaxkn') : mx.gd; Pr.wo = ok(R('cp-wopt')) ? R('cp-wopt') : mx.w; M.Pr = Pr;
                M.pts = pts.slice().sort(function (a, b) { return a.w - b.w; }).map(function (q) { return { x: q.w, y: q.gd }; });
                return { pEnd: 1, v: ['γd máx = ' + f1(Pr.gm, 2) + ' kN/m³ con w ópt = ' + f1(Pr.wo, 1) + ' %', 'info'] };
            }
        },
        densidad: {
            pre: function (P) { var V = R('d-vol'), gh = R('d-gh'), ra = inp('d-darena'), w = inp('d-w'); if (ok(V)) P.V = V; if (ok(gh)) P.rh = gh; if (ok(ra)) P.rs = ra; if (ok(w)) P.w = w; P.rdmax = 1.80; },
            post: function (P, M) {
                var gd = R('d-gd'), gc = R('d-gc'), Wi = inp('d-cono'), Wf = inp('d-rest'), Ws = inp('d-suelo'); if (!ok(gd)) return null;
                if (ok(Wi) && ok(Wf) && Wi > Wf) { M.inHoleT = Wi - Wf; M.Mtot = M.Mcono + M.inHoleT; }
                if (ok(Ws)) M.Msoil = Ws; M.rd = gd; M.GC = ok(gc) ? gc : gd / 1.8 * 100;
                return M.GC >= 95 ? { pEnd: 1, v: ['Cumple: grado de compactación ' + f1(M.GC) + ' % ≥ 95 %', 'ok'] } : { pEnd: 1, v: ['No cumple: grado de compactación ' + f1(M.GC) + ' % < 95 %', 'fail'] };
            }
        },
        clasificacion: {
            pre: function (P) { var a = inp('c-p200'), b = inp('c-ll'), c = inp('c-ip'), d = inp('c-p4'); if (ok(a)) P.F200 = a; if (ok(b)) P.LL = b; if (ok(c)) P.IP = c; if (ok(d)) P.F4 = 100 - d; },
            post: function (P, M) {
                if (!calc('c-grupo')) return null;
                var r = clone(M.r); if (calc('c-sim')) r.sym = txt('c-sim'); if (calc('c-num')) r.name = txt('c-num'); M.r = r;
                return { pEnd: 1, v: ['Grupo SUCS ' + (txt('c-sim') || txt('c-grupo')) + ' · ' + (txt('c-num') || txt('c-clasif')), 'info'] };
            }
        },
        permeabilidad: {
            pre: function (P) { var a = inp('p-a'), k = R('p-k'); P.tipo = 'constante'; if (ok(inp('p-h'))) P.h = inp('p-h'); if (ok(inp('p-l'))) P.L = inp('p-l'); if (ok(a) && a > 0) P.D = Math.sqrt(4 * a / Math.PI); if (ok(k) && k > 0) P.lk = Math.log10(k); },
            post: function (P, M) {
                var k = R('p-k'), vol = inp('p-vol'), t = inp('p-t'); if (!ok(k) || !ok(vol) || !ok(t) || t <= 0) return null;
                M.k = k; M.Q = vol / t; M.tmax = t; if (ok(inp('p-a'))) M.A = inp('p-a');
                return { pEnd: 1, v: ['k = ' + sci(k) + ' cm/s · Q = ' + f1(vol / t, 2) + ' cm³/s · ' + (txt('p-tipo') || ''), 'info'] };
            }
        },
        corte: {
            pre: function (P) { var sn = inp('cd-pv1'), c = R('cd-c'), ph = R('cd-phi'); if (ok(sn)) P.sn = sn; if (ok(c)) P.c = c; if (ok(ph)) { P.phi = ph; P.tipo = ph >= 33 ? 'denso' : ph <= 20 ? 'arcilla' : 'suelto'; } },
            post: function (P) {
                if (!calc('cd-phi')) return null;
                var tf = P.c + P.sn * Math.tan(P.phi * Math.PI / 180);
                return { pEnd: 1, v: ['Falla por corte con σn = ' + f1(P.sn) + ' kPa → τf = ' + f1(tf) + ' kPa (c = ' + f1(P.c) + ', φ = ' + f1(P.phi) + '°)', 'fail'] };
            }
        },
        inconfinada: {
            pre: function (P) { var d = inp('uc-d'), L0 = inp('uc-l0'), qu = R('uc-qu'), ef = R('uc-ef'); if (ok(d)) P.d = d; if (ok(L0)) P.L0 = L0; if (ok(qu)) P.qu = qu; if (ok(ef) && ef > 0) { P.epsf = ef; P.falla = ef < 5 ? 'fragil' : 'ductil'; } },
            post: function (P) { if (!calc('uc-qu')) return null; return { pEnd: 1, v: ['Falla ' + (P.falla === 'fragil' ? 'frágil (plano de corte)' : 'dúctil (abarrilamiento)') + ' a qu = ' + f1(P.qu) + ' kPa · cu = ' + f1(P.qu / 2) + ' kPa', 'fail'] }; }
        },
        consolidacion: {
            pre: function (P) { var e0 = inp('co-e0'), cc = R('co-cc'), cv = R('co-cv'), s0 = inp('co-s1'), s1 = inp('co-s2'); if (ok(e0)) P.e0 = e0; if (ok(cc) && cc > 0) P.Cc = cc; if (ok(cv) && cv > 0) P.Cv = cv; if (ok(s0)) P.s0 = s0; if (ok(s1) && s1 > P.s0) P.s1 = s1; },
            post: function (P) { if (!calc('co-cc')) return null; return { pEnd: 1, v: ['Cc = ' + txt('co-cc') + ' · Cv = ' + txt('co-cv') + ' mm²/min · σ′p ≈ ' + txt('co-pc') + ' kPa', 'info'] }; }
        },
        triaxial: {
            pre: function (P) { var s3 = inp('tx-s3-1'), c = R('tx-c'), ph = R('tx-phi'), t = sel('tx-tipo'); if (ok(s3)) P.s3 = s3; if (ok(c)) P.c = c; if (ok(ph)) P.phi = ph; if (t) P.tipo = t; },
            post: function (P) {
                if (!calc('tx-phi')) return null; var s1 = inp('tx-s1-1');
                return { pEnd: 1, v: ['Falla con σ₃ = ' + f1(P.s3) + ' kPa' + (ok(s1) ? ' y σ₁ = ' + f1(s1) + ' kPa' : '') + ' (c = ' + f1(P.c) + ' kPa, φ = ' + f1(P.phi) + '°)', 'fail'] };
            }
        }
    };

    function maquina2D(box, oldCv, tipo, dp) {
        var G = window.GeoSim2D, def = G && G.defs && G.defs[tipo]; if (!def || !def.stage || !def.model || !def.at) return;
        var H = G.H, cv = doc.createElement('canvas'); cv.className = 'gx-s2d'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', def.machine || 'Máquina del ensayo');
        if (oldCv) { oldCv.style.display = 'none'; box.insertBefore(cv, oldCv); } else box.appendChild(cv);
        var cap = el('div', 'gx-s2d-cap', '<span>' + esc(def.machine || def.title || '') + '</span><button type="button" class="gx-s2d-play">▶ Ver ensayo</button><p class="gx-s2d-v is-idle"></p>'); box.appendChild(cap);
        var st = { p: 0, tick: 0, raf: 0, run: false, pEnd: 1 };
        function params() {
            var P = {}, cand = {};
            try { cand = MAP2D[tipo] ? MAP2D[tipo]() || {} : {}; } catch (e) { cand = {}; }
            (def.fields || []).forEach(function (f) {
                var v = f.value, c = cand[f.id];
                if (f.type === 'select') { if (c != null && (f.options || []).some(function (o) { return String(o[0]) === String(c); })) v = c; }
                else if (ok(c)) v = Math.max(f.min, Math.min(f.max, c));
                P[f.id] = v;
            });
            return P;
        }
        function draw() {
            if (!cv.isConnected) { stop(); return; }
            try {
                var P = params(), ad = ADAPT[tipo], res = null;
                if (ad && ad.pre) { try { ad.pre(P); } catch (e1) { } }
                var Mo = def.model(P);
                if (ad && ad.post) { try { res = ad.post(P, Mo, def); } catch (e2) { res = null; if (window.console) console.warn('[ensayos-diseno] adaptador', tipo, e2); } }
                st.pEnd = res && ok(res.pEnd) ? Math.max(0.001, Math.min(1, res.pEnd)) : 1;
                var vv = cap.querySelector('.gx-s2d-v'), vt = res && res.v ? res.v[0] : 'Ingresa los datos y pulsa Calcular: la máquina usará tus valores.', vc = 'gx-s2d-v ' + (res && res.v ? 'is-' + res.v[1] : 'is-idle');
                if (vv.textContent !== vt) vv.textContent = vt; if (vv.className !== vc) vv.className = vc;
                var pp = Math.min(st.p, st.pEnd), S = def.at(P, Mo, pp), ctx = H.prep(cv, 800, 460);
                def.stage(ctx, 800, 460, P, Mo, S, pp, st.tick);
                if (H.stageFx) H.stageFx(ctx, 800, 460, def.accent, pp, st.run, st.tick);
            } catch (e) { if (window.console) console.warn('[ensayos-diseno] máquina 2D', e); }
        }
        function stop() { st.run = false; if (st.raf) cancelAnimationFrame(st.raf); st.raf = 0; }
        function play() {
            stop(); st.p = 0; st.run = true; var last = 0, dur = Math.min(10, Math.max(5, (def.duration || 10) * 0.55)); draw();
            (function loop(ts) {
                if (!st.run || !cv.isConnected) return;
                if (!last) last = ts; var dt = Math.min(0.05, (ts - last) / 1000); last = ts;
                st.tick += dt * 60; st.p = Math.min(st.pEnd, st.p + dt * st.pEnd / Math.max(3, dur * st.pEnd)); draw();
                if (st.p >= st.pEnd) { st.run = false; draw(); return; }
                st.raf = requestAnimationFrame(loop);
            })(performance.now());
        }
        cap.querySelector('button').addEventListener('click', play);
        cv.addEventListener('click', play);
        dp.addEventListener('click', function (e) { if (e.target.closest && e.target.closest('.gx-b-calc')) setTimeout(play, 60); });
        dp.addEventListener('input', function () { if (!st.run) draw(); });
        dp.addEventListener('change', function () { if (!st.run) draw(); });
        var rz = 0; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { if (cv.isConnected && !st.run) draw(); }, 120); });
        requestAnimationFrame(draw);
    }

    /* =============== familia 2: Resistencia de Materiales =============== */
    function mejorarRM(form) {
        var host = form.closest('#panel-ensayo-rm'); if (!host || form.classList.contains('sim-layout-rm')) return;
        var cb = form.querySelector('.btn-calcular[onclick*="calcularRM"]'), mm = cb && (cb.getAttribute('onclick') || '').match(/calcularRM(\w+)\(/);
        var tipo = mm && mm[1].toLowerCase().replace('traccion', 'traccion'); tipo = { traccion: 'traccion', compresion: 'compresion', flexion: 'flexion', torsion: 'torsion', dureza: 'dureza' }[tipo];
        var meta = tipo && RM[tipo]; if (!meta) return;
        host.classList.add('gx');
        var header = form.querySelector('.ensayo-form-header'), h3 = header && header.querySelector('h3'), hint = header && header.querySelector('.login-hint'), back = header && header.querySelector('button');
        var equipo = hint ? hint.textContent.replace(/^UniPamplona\s*·\s*/, '').trim() : '';
        var hd = encabezado({ back: back, mat: meta.mat, n: 'Ensayo ' + meta.n, titulo: (h3 ? h3.textContent : 'Ensayo').replace(/^Ensayo de\s+/i, '').trim(), desc: meta.desc, chips: meta.chips, live: equipo.split('—')[0].trim(), steps: meta.steps });
        form.insertBefore(hd, form.firstChild);
        if (header) header.classList.add('gx-hidden');
        var grid = form.querySelector('.sim-rm-grid'), left = form.querySelector('.sim-rm-left'), right = form.querySelector('.sim-rm-right');
        var lab = el('div', 'gx-lab'), dp = el('div', 'gx-dp'), rp = el('div', 'gx-rp');
        grid.parentNode.insertBefore(lab, grid); lab.appendChild(dp); lab.appendChild(rp);
        dp.appendChild(el('h4', '', 'Datos del ensayo')); panelHead(dp, dp.querySelector('h4'), el('small', '', esc(meta.hint || '')));
        var cv = left && left.querySelector('canvas'); if (cv) { var eqp = el('div', 'gx-equipo'); eqp.appendChild(cv); dp.appendChild(eqp); maquina2D(eqp, cv, tipo, dp); }
        var fg = right.querySelector('.form-grid'); if (fg) dp.appendChild(fg);
        camposInternos(dp, meta);
        var acts = el('div', 'gx-acts'); right.querySelectorAll('.rm-actions button').forEach(function (b) { marcarBoton(b); acts.appendChild(b); }); ordenar(acts); dp.appendChild(acts);
        var err = right.querySelector('.error-msg'); if (err) dp.appendChild(err);
        rp.appendChild(el('h4', '', 'Resultados')); panelHead(rp, rp.querySelector('h4'), el('span', 'gx-badge', 'Ensayo calculado'));
        var box = right.querySelector('.resultados-box');
        meta.hideMainInSec = true;
        var R = bloqueResultados(rp, meta, meta.main.lab, box);
        right.querySelectorAll(':scope > .login-hint').forEach(function (p) { p.classList.add('gx-hidden'); });
        grid.remove();
        var ctx = { meta: meta, rp: rp, dp: dp, R: R, steps: hd.__steps };
        vigilar(ctx, [box]);
        try { if (typeof window.dibujarMaquinaRM === 'function') requestAnimationFrame(function () { window.dibujarMaquinaRM(tipo, 0); }); } catch (e) { }
    }

    /* =============== familia 3: Diseño de Mezclas y Estructuras I =============== */
    function mejorarEST(shell) {
        var host = shell.closest('#dmEnsayosRoot, #est-ensayos'); if (!host) return;
        var esDM = host.id === 'dmEnsayosRoot';
        host.classList.add('gx');
        var top = shell.querySelector('.ms2-topbar'), back = top && top.querySelector('.ms2-back'), crumbs = top && top.querySelector('.ms2-crumbs');
        var tools = top ? [].slice.call(top.querySelectorAll('button:not(.ms2-back)')) : [];
        var hero = shell.querySelector('.ms2-phero'), em = hero && hero.querySelector('.ms2-phero-text > em'), h2 = hero && hero.querySelector('h2'), fund = hero && hero.querySelector('.ms2-fund');
        var metaLis = hero ? [].slice.call(hero.querySelectorAll('.ms2-phero-meta li')) : [];
        var info = {}; metaLis.forEach(function (li) { var b = li.querySelector('b'), sp = li.querySelector('span'); if (b && sp) info[b.textContent.trim()] = sp.textContent.trim(); });
        var emTxt = em ? em.textContent.trim() : '', n = emTxt.split('·')[0].trim();
        var norma = info['Referencia'] || (emTxt.split('·')[1] || '').trim();
        var desc = fund ? fund.textContent.replace(/^Objetivo\s*/, '').trim() : '';
        desc = desc.charAt(0).toUpperCase() + desc.slice(1);
        var chips = norma.split(/·|\//).map(function (x) { return x.trim(); }).filter(Boolean).slice(0, 3);
        var live = esDM ? (info['Qué se obtiene'] || '').split('·')[0].trim() : (info['Unidad del programa'] || '');
        var steps = esDM
            ? [['Datos del ensayo', 'Muestra y lecturas'], ['Cálculo', 'Pulsa calcular'], ['Resultados', 'Valores y observaciones'], ['Informe', 'Guardar o imprimir']]
            : [['Modelo', 'Datos de entrada'], ['Cálculo', 'Calcular y dibujar'], ['Diagrama', 'Figura del modelo'], ['Informe', info['Entregable'] || 'Guardar o imprimir']];
        var mat = crumbs && crumbs.querySelector('span') ? crumbs.querySelector('span').textContent.trim() : (esDM ? 'Diseño de Mezclas' : 'Estructuras I');
        var hd = encabezado({ back: back, mat: mat, n: n || 'Ensayo', titulo: h2 ? h2.textContent.trim() : 'Ensayo', desc: desc, chips: chips, live: live, steps: steps, tools: tools });
        shell.insertBefore(hd, shell.firstChild);
        if (top) top.classList.add('gx-hidden'); if (hero) hero.classList.add('gx-hidden');
        var work = shell.querySelector('.est-work'); if (!work) return;
        var panels = [].slice.call(work.querySelectorAll('.dm-panel'));
        var dpSrc = panels[0], rpSrc = work.querySelector('.est-respanel');
        var lab = el('div', 'gx-lab'), more = el('div', 'gx-more');
        work.parentNode.insertBefore(lab, work); work.parentNode.insertBefore(more, work.nextSibling);
        dpSrc.classList.add('gx-dp'); rpSrc.classList.add('gx-rp');
        lab.appendChild(dpSrc); lab.appendChild(rpSrc);
        panels.forEach(function (p) { if (p !== dpSrc && p !== rpSrc) { p.classList.add('gx-card'); more.appendChild(p); } });
        work.remove();
        var h4 = dpSrc.querySelector(':scope > h4'); panelHead(dpSrc, h4, el('small', '', esc(chips[0] || '')));
        camposDM(dpSrc);
        var acts = el('div', 'gx-acts');
        dpSrc.querySelectorAll('.dm-actions').forEach(function (a) {
            if (a.querySelector('table')) return;
            [].slice.call(a.querySelectorAll('button')).forEach(function (b) { marcarBoton(b); acts.appendChild(b); });
            if (!a.children.length) a.remove();
        });
        ordenar(acts); dpSrc.appendChild(acts);
        panelHead(rpSrc, rpSrc.querySelector(':scope > h4'), el('span', 'gx-badge', 'Ensayo calculado'));
        var res = rpSrc.querySelector('.dm-res');
        var form = '';
        var proc = more.querySelector('.dm-formula, .est-proc .dm-formula');
        if (proc) form = proc.textContent.replace(/\s+/g, ' ').trim();
        var meta = { main: { sym: 'Resultado' }, eq: form };
        var R = bloqueResultados(rpSrc, meta, '', null);
        var top2 = rpSrc.querySelector('.gx-top'); if (res && top2) top2.parentNode.insertBefore(res, top2.nextSibling);
        if (!form) { var right = rpSrc.querySelector('.gx-right'); if (right && !right.querySelector('.gx-sec')) top2.classList.add('gx-solo'); }
        var save = rpSrc.querySelector('.dm-savebar'), pz = zonaPdf(rpSrc);
        if (save) { save.querySelectorAll('button').forEach(function (b) { var t = b.textContent; b.classList.remove('btn-calcular', 'btn-limpiar'); if (/guardar/i.test(t)) { b.classList.add('gx-b-save'); b.textContent = 'Guardar en Mis resultados'; } else { b.classList.add('gx-b-pdf'); b.textContent = 'Descargar informe PDF'; } pz.appendChild(b); }); save.remove(); }
        // tarjetas de resultado: ocupan todo el ancho bajo el medidor
        var ctx = { meta: meta, rp: rpSrc, dp: dpSrc, R: R, steps: hd.__steps, genericSteps: true, tiles: function () { return res; } };
        vigilar(ctx, [res]);
    }

    var SOLO = P + ' .gx-top.gx-solo{grid-template-columns:1fr}';
    css.textContent += '\n' + SOLO + '\n' + P + ' .gx-top.gx-solo .gx-right{display:none}';

    function aplicar() {
        doc.querySelectorAll('#panel-ensayo .laboratorio-panel, #panel-ensayo-ms2 .laboratorio-panel').forEach(function (lab) { if (lab.__gx) return; lab.__gx = true; try { mejorarMS(lab); } catch (e) { if (window.console) console.warn('[ensayos-diseno]', e); } });
        doc.querySelectorAll('#panel-ensayo-rm .ensayo-form.rm-form').forEach(function (f) { if (f.__gx) return; f.__gx = true; try { mejorarRM(f); } catch (e) { if (window.console) console.warn('[ensayos-diseno]', e); } });
        doc.querySelectorAll('#dmEnsayosRoot > .est-shell, #est-ensayos > .est-shell').forEach(function (s) { if (s.__gx) return; s.__gx = true; try { mejorarEST(s); } catch (e) { if (window.console) console.warn('[ensayos-diseno]', e); } });
        HOSTS.split(',').forEach(function (sel) {
            var h = doc.querySelector(sel); if (!h || !h.classList.contains('gx')) return;
            if (!h.querySelector('.gx-head')) h.classList.remove('gx');
        });
    }
    var pendiente = false;
    var obs = new MutationObserver(function () { if (pendiente) return; pendiente = true; setTimeout(function () { pendiente = false; aplicar(); }, 0); });
    function start() {
        HOSTS.split(',').forEach(function (sel) { var p = doc.querySelector(sel); if (p) obs.observe(p, { childList: true }); });
        aplicar();
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', start); else start();
    window.addEventListener('load', start);
    window.GMEnsayosDiseno = { aplicar: aplicar, meta: M, rm: RM, adapt: ADAPT };
})();
