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
    
    /* Paso a paso según Guía detallada de ensayos GeoMetrics (17 ensayos) */
    var STEPS = {
        humedad: [
            { a: 0.00, b: 0.12, t: 'Preparar el recipiente', d: 'Limpia y seca el recipiente; registra su masa Mc. (INV E-122 / ASTM D2216)' },
            { a: 0.12, b: 0.25, t: 'Pesar el suelo húmedo', d: 'Pesa recipiente más suelo húmedo: Mch.' },
            { a: 0.25, b: 0.50, t: 'Secar en horno', d: 'Introduce la muestra en el horno a 110 ± 5 °C hasta masa constante.' },
            { a: 0.50, b: 0.65, t: 'Enfriar y pesar', d: 'Registra la masa del recipiente más suelo seco: Mcs.' },
            { a: 0.65, b: 0.82, t: 'Calcular masas', d: 'Mh = Mch − Mc; Ms = Mcs − Mc; Mw = Mh − Ms.' },
            { a: 0.82, b: 1.01, t: 'Calcular humedad w', d: 'w = (Mw / Ms) × 100 %. El contenido de humedad se expresa respecto a la masa seca.' }
        ],
        granulometria: [
            { a: 0.00, b: 0.10, t: 'Preparar la muestra', d: 'Seca y desmenuza los terrones sin triturar partículas. (INV E-123 / ASTM D6913)' },
            { a: 0.10, b: 0.18, t: 'Pesar masa inicial', d: 'Registra la masa seca inicial de la muestra.' },
            { a: 0.18, b: 0.28, t: 'Organizar tamices', d: 'Apila los tamices de mayor a menor abertura y coloca un fondo colector.' },
            { a: 0.28, b: 0.45, t: 'Tamizar', d: 'Agita el conjunto. Si se requiere, lava el material sobre el tamiz N.º 200.' },
            { a: 0.45, b: 0.58, t: 'Pesar retenidos', d: 'Pesa el material retenido en cada tamiz y el del fondo. Verifica balance de masas.' },
            { a: 0.58, b: 0.72, t: 'Calcular porcentajes', d: '% retenido, retenido acumulado y % que pasa = 100 − % retenido acumulado.' },
            { a: 0.72, b: 0.85, t: 'Graficar curva', d: 'Eje X logarítmico (tamaño) y eje Y % que pasa.' },
            { a: 0.85, b: 0.93, t: 'Obtener D10, D30, D60', d: 'Lee o interpola los diámetros de la curva granulométrica.' },
            { a: 0.93, b: 1.01, t: 'Calcular Cu y Cc', d: 'Cu = D60/D10; Cc = D30²/(D10×D60). Interpreta la gradación.' }
        ],
        limites: [
            { a: 0.00, b: 0.12, t: 'Preparar pasta (LL)', d: 'Mezcla la fracción exigida con agua hasta pasta homogénea. (INV E-125)' },
            { a: 0.12, b: 0.24, t: 'Ranura en la copa', d: 'Coloca la pasta en la copa de Casagrande y forma la ranura normalizada.' },
            { a: 0.24, b: 0.36, t: 'Golpes hasta cierre', d: 'Acciona el aparato y registra el número de golpes para cerrar la ranura.' },
            { a: 0.36, b: 0.48, t: 'Curva de fluidez', d: 'Repite a varias humedades. LL = humedad a 25 golpes (método multipunto).' },
            { a: 0.48, b: 0.62, t: 'Enrollar hilos (LP)', d: 'Forma hilos por enrollado hasta ≈ 3,2 mm. (INV E-126)' },
            { a: 0.62, b: 0.78, t: 'Humedad en desmoronamiento', d: 'Cuando el suelo se desmorone, determina su humedad = LP.' },
            { a: 0.78, b: 1.01, t: 'Índice de plasticidad', d: 'IP = LL − LP. Ubica en la carta de plasticidad si corresponde.' }
        ],
        gravedad: [
            { a: 0.00, b: 0.12, t: 'Preparar y secar', d: 'Muestra representativa seca según el método. (INV E-128 / ASTM D854)' },
            { a: 0.12, b: 0.24, t: 'Pesar picnómetro vacío', d: 'Registra M1.' },
            { a: 0.24, b: 0.36, t: 'Añadir suelo seco', d: 'Pesa el picnómetro con suelo: M2.' },
            { a: 0.36, b: 0.52, t: 'Añadir agua y desairear', d: 'Agrega agua y elimina el aire atrapado por el procedimiento establecido.' },
            { a: 0.52, b: 0.68, t: 'Completar y pesar M3', d: 'Completa hasta la marca, controla temperatura y registra M3 (picnómetro + suelo + agua).' },
            { a: 0.68, b: 0.84, t: 'Pesar solo con agua M4', d: 'Llena el picnómetro solo con agua hasta la misma marca y registra M4.' },
            { a: 0.84, b: 1.01, t: 'Calcular Gs', d: 'Gs = (M2−M1) / [(M4−M1)−(M3−M2)]. Aplica correcciones de temperatura.' }
        ],
        compactacion: [
            { a: 0.00, b: 0.08, t: 'Preparar el suelo', d: 'Desmenuza y aplica criterios de tamaño máximo. (INV E-141/142 · ASTM D698/D1557)' },
            { a: 0.08, b: 0.18, t: 'Preparar humedades', d: 'Divide la muestra y añade distintas cantidades de agua; homogeneiza.' },
            { a: 0.18, b: 0.28, t: 'Pesar el molde', d: 'Registra masa del molde vacío y conoce su volumen calibrado.' },
            { a: 0.28, b: 0.45, t: 'Compactar por capas', d: 'Coloca el suelo en capas y aplica los golpes del método (estándar o modificado).' },
            { a: 0.45, b: 0.55, t: 'Nivelar y pesar', d: 'Enrasa y pesa el molde con suelo compactado.' },
            { a: 0.55, b: 0.65, t: 'Densidad húmeda', d: 'ρh = masa húmeda del suelo / volumen del molde.' },
            { a: 0.65, b: 0.75, t: 'Determinar humedad', d: 'Extrae porción representativa y mide w.' },
            { a: 0.75, b: 0.85, t: 'Densidad seca', d: 'ρd = ρh / (1 + w) con w en decimal.' },
            { a: 0.85, b: 0.93, t: 'Repetir puntos', d: 'Repite para varias humedades que definan la curva.' },
            { a: 0.93, b: 1.01, t: 'Curva Proctor', d: 'Grafica ρd vs w. Obtén γd máx y w óptima en el máximo de la curva.' }
        ],
        densidad: [
            { a: 0.00, b: 0.10, t: 'Preparar la superficie', d: 'Lugar representativo y nivelado para la placa. (INV E-161 · cono de arena)' },
            { a: 0.10, b: 0.20, t: 'Instalar placa base', d: 'Coloca y fija la placa base.' },
            { a: 0.20, b: 0.35, t: 'Excavar el hueco', d: 'Excava según el método y recoge todo el suelo sin pérdidas.' },
            { a: 0.35, b: 0.45, t: 'Pesar suelo húmedo', d: 'Registra la masa húmeda total extraída.' },
            { a: 0.45, b: 0.58, t: 'Llenar con arena', d: 'Llena el hueco con arena calibrada; descuenta cono y base.' },
            { a: 0.58, b: 0.70, t: 'Calcular volumen', d: 'Vh = Marena / ρarena.' },
            { a: 0.70, b: 0.82, t: 'Humedad de campo', d: 'Mide w de una porción representativa.' },
            { a: 0.82, b: 0.92, t: 'Densidades ρh y ρd', d: 'ρh = Msuelo/Vh; ρd = ρh/(1+w).' },
            { a: 0.92, b: 1.01, t: '% de compactación', d: '% = (γd campo / γd máx Proctor) × 100. Compara con especificación de obra.' }
        ],
        clasificacion: [
            { a: 0.00, b: 0.12, t: 'Revisar finos', d: 'Determina el % que pasa el tamiz N.º 200. (ASTM D2487 · SUCS)' },
            { a: 0.12, b: 0.25, t: 'Grueso o fino', d: 'Aplica los límites SUCS para decidir si el suelo es de grano grueso o fino.' },
            { a: 0.25, b: 0.40, t: 'Grava o arena', d: 'En suelos gruesos, determina si predomina grava o arena.' },
            { a: 0.40, b: 0.55, t: 'Evaluar gradación', d: 'Usa D10, D30, D60, Cu y Cc cuando proceda.' },
            { a: 0.55, b: 0.70, t: 'Evaluar plasticidad', d: 'Usa LL e IP para el comportamiento de los finos.' },
            { a: 0.70, b: 0.85, t: 'Carta de plasticidad', d: 'Ubica LL e IP y aplica las reglas de clasificación.' },
            { a: 0.85, b: 1.01, t: 'Asignar símbolo SUCS', d: 'Determina el símbolo (GW, CL, SM…) y redacta la descripción justificada.' }
        ],
        permeabilidad: [
            { a: 0.00, b: 0.12, t: 'Instalar muestra', d: 'Mide longitud L y área A. (ASTM D2434 / D5084)' },
            { a: 0.12, b: 0.25, t: 'Saturar', d: 'Satura la muestra y verifica que no existan fugas.' },
            { a: 0.25, b: 0.40, t: 'Carga hidráulica h', d: 'Carga constante: establece y mide la diferencia de carga h.' },
            { a: 0.40, b: 0.55, t: 'Medir caudal', d: 'Recoge volumen V durante un tiempo t.' },
            { a: 0.55, b: 0.70, t: 'Calcular k (constante)', d: 'k = (V × L) / (A × h × t). Verifica unidades.' },
            { a: 0.70, b: 0.85, t: 'Carga variable (si aplica)', d: 'Registra h1, h2 y t. k = (a×L/(A×t)) × ln(h1/h2).' },
            { a: 0.85, b: 1.01, t: 'Revisar resultado', d: 'Verifica temperatura, saturación, fugas y coherencia de k.' }
        ],
        corte: [
            { a: 0.00, b: 0.10, t: 'Preparar la muestra', d: 'Recorta o prepara la muestra con dimensiones apropiadas. (ASTM D3080)' },
            { a: 0.10, b: 0.20, t: 'Instalar en la caja', d: 'Coloca el suelo en la caja con los elementos porosos requeridos.' },
            { a: 0.20, b: 0.35, t: 'Aplicar carga normal σn', d: 'Aplica la tensión normal y permite la consolidación/estabilización requerida. σn = N/A.' },
            { a: 0.35, b: 0.55, t: 'Cortar a velocidad constante', d: 'Desplaza horizontalmente una mitad de la caja a la velocidad establecida.' },
            { a: 0.55, b: 0.68, t: 'Registrar mediciones', d: 'Mide desplazamiento horizontal, fuerza cortante y desplazamiento vertical.' },
            { a: 0.68, b: 0.80, t: 'Calcular esfuerzos', d: 'τ = T/A. Aplica corrección de área cuando corresponda.' },
            { a: 0.80, b: 0.90, t: 'Identificar resistencia', d: 'Curva esfuerzo cortante–desplazamiento; aplica el criterio de resistencia del ensayo.' },
            { a: 0.90, b: 1.01, t: 'Obtener c y φ', d: 'Repite a distintas σn. Ajusta la envolvente τf = c + σn·tan(φ).' }
        ],
        inconfinada: [
            { a: 0.00, b: 0.10, t: 'Preparar la probeta', d: 'Probeta cilíndrica con dimensiones del método. (ASTM D2166)' },
            { a: 0.10, b: 0.20, t: 'Medir geometría', d: 'Registra diámetro, altura inicial L0 y masa.' },
            { a: 0.20, b: 0.30, t: 'Instalar en la prensa', d: 'Centra la probeta entre los platos (σ₃ = 0).' },
            { a: 0.30, b: 0.50, t: 'Cargar axialmente', d: 'Aplica deformación axial a la velocidad especificada.' },
            { a: 0.50, b: 0.62, t: 'Registrar P y ΔL', d: 'Mide carga axial P y acortamiento ΔL.' },
            { a: 0.62, b: 0.74, t: 'Calcular ε y área corregida', d: 'ε = ΔL/L0; Acorr = A0/(1−ε).' },
            { a: 0.74, b: 0.86, t: 'Calcular esfuerzo σ', d: 'σ = P / Acorr. Construye la curva esfuerzo–deformación.' },
            { a: 0.86, b: 1.01, t: 'Identificar qu y cu', d: 'qu = máximo esfuerzo axial. cu ≈ qu/2 en condiciones apropiadas.' }
        ],
        consolidacion: [
            { a: 0.00, b: 0.12, t: 'Preparar la muestra', d: 'Recorta la muestra para el anillo conservando la estructura. (ASTM D2435)' },
            { a: 0.12, b: 0.24, t: 'Montar en el edómetro', d: 'Coloca la muestra entre piedras porosas e instala el conjunto.' },
            { a: 0.24, b: 0.36, t: 'Carga de asiento', d: 'Aplica la carga de asiento establecida y pon a cero el deformímetro.' },
            { a: 0.36, b: 0.58, t: 'Incrementos de carga', d: 'Aplica incrementos de tensión vertical según el programa del ensayo.' },
            { a: 0.58, b: 0.72, t: 'Medir tiempo y asentamiento', d: 'Registra desplazamientos a los tiempos establecidos en cada incremento.' },
            { a: 0.72, b: 0.84, t: 'Calcular e', d: 'Usa la geometría inicial y el cambio de altura: e = e0 − ΔH/Hs.' },
            { a: 0.84, b: 1.01, t: 'Interpretar parámetros', d: 'Curvas e–log σ′ y asentamiento–tiempo. Obtén Cc, Cr/Cs, σ′p y Cv.' }
        ],
        triaxial: [
            { a: 0.00, b: 0.10, t: 'Preparar la probeta', d: 'Obtén y mide una probeta cilíndrica. (ASTM D2850 / D4767)' },
            { a: 0.10, b: 0.20, t: 'Instalar membrana', d: 'Coloca membrana, piedras porosas y conexiones de drenaje.' },
            { a: 0.20, b: 0.30, t: 'Cerrar la cámara', d: 'Monta la cámara y comprueba estanqueidad.' },
            { a: 0.30, b: 0.42, t: 'Aplicar confinamiento σ₃', d: 'Aplica la presión lateral σ₃ indicada.' },
            { a: 0.42, b: 0.52, t: 'Consolidar si corresponde', d: 'CU y CD: fase de consolidación. UU: sin consolidación previa.' },
            { a: 0.52, b: 0.60, t: 'Definir drenaje', d: 'UU no drenado; CU consolidado–corte no drenado; CD consolidado–corte drenado.' },
            { a: 0.60, b: 0.78, t: 'Aplicar carga axial', d: 'Incrementa la carga a la velocidad establecida.' },
            { a: 0.78, b: 0.88, t: 'Registrar datos', d: 'Carga, deformación, σ₃ y, si procede, presión de poros y cambio volumétrico.' },
            { a: 0.88, b: 1.01, t: 'Círculos de Mohr y c–φ', d: 'σ₁ = σ₃ + q. Construye círculos de Mohr y obtiene parámetros resistentes.' }
        ],
        traccion: [
            { a: 0.00, b: 0.10, t: 'Seleccionar probeta', d: 'Geometría compatible con el material y la norma. (ASTM E8/E8M)' },
            { a: 0.10, b: 0.22, t: 'Medir A0 y L0', d: 'Registra área inicial A0 y longitud de referencia L0.' },
            { a: 0.22, b: 0.34, t: 'Sujetar en mordazas', d: 'Instala la probeta alineada en las mordazas.' },
            { a: 0.34, b: 0.45, t: 'Configurar ensayo', d: 'Define velocidad y adquisición de datos según el método.' },
            { a: 0.45, b: 0.65, t: 'Aplicar tracción', d: 'Incrementa la carga axial de forma controlada.' },
            { a: 0.65, b: 0.78, t: 'Registrar P y ΔL', d: 'Mide fuerza P y alargamiento ΔL.' },
            { a: 0.78, b: 0.90, t: 'Calcular σ y ε', d: 'σ = P/A0; ε = ΔL/L0. Grafica esfuerzo–deformación.' },
            { a: 0.90, b: 1.01, t: 'Propiedades mecánicas', d: 'E = Δσ/Δε (región elástica), fluencia, resistencia máxima y alargamiento.' }
        ],
        compresion: [
            { a: 0.00, b: 0.12, t: 'Preparar la probeta', d: 'Geometría y condición exigidas por el método. (p. ej. ASTM C39 para concreto)' },
            { a: 0.12, b: 0.24, t: 'Medir A0 y L0', d: 'Registra área transversal inicial y altura inicial.' },
            { a: 0.24, b: 0.36, t: 'Revisar extremos', d: 'Verifica planicidad, perpendicularidad y acondicionamiento.' },
            { a: 0.36, b: 0.48, t: 'Centrar en la prensa', d: 'Coloca la probeta alineada entre los platos.' },
            { a: 0.48, b: 0.70, t: 'Aplicar compresión', d: 'Carga a la velocidad prescrita hasta falla o criterio de terminación.' },
            { a: 0.70, b: 0.85, t: 'Registrar y calcular', d: 'σc = P/A0; εc = ΔL/L0. Obtén fc = Pmáx/A0.' },
            { a: 0.85, b: 1.01, t: 'Informar falla', d: 'Registra carga máxima, resistencia y modo de falla.' }
        ],
        flexion: [
            { a: 0.00, b: 0.12, t: 'Preparar la probeta', d: 'Geometría apropiada al método. (p. ej. ASTM C78 para concreto)' },
            { a: 0.12, b: 0.25, t: 'Medir b, d y luz', d: 'Registra ancho b, altura d y dimensiones de la luz L.' },
            { a: 0.25, b: 0.40, t: 'Instalar apoyos', d: 'Coloca la probeta sobre los apoyos a la luz indicada.' },
            { a: 0.40, b: 0.52, t: 'Configurar carga', d: 'Ubica el punto o puntos de carga según el método (3 o 4 puntos).' },
            { a: 0.52, b: 0.72, t: 'Cargar', d: 'Incrementa la carga a la velocidad especificada.' },
            { a: 0.72, b: 0.88, t: 'Registrar deflexión', d: 'Mide carga, deflexión y ubicación de la falla.' },
            { a: 0.88, b: 1.01, t: 'Calcular resistencia', d: 'Caso carga central: σmáx = 3PL/(2bd²). Informa modo de falla.' }
        ],
        torsion: [
            { a: 0.00, b: 0.12, t: 'Preparar la probeta', d: 'Geometría compatible con el equipo de torsión.' },
            { a: 0.12, b: 0.25, t: 'Medir sección', d: 'Registra longitud útil y dimensiones de la sección.' },
            { a: 0.25, b: 0.40, t: 'Instalar', d: 'Sujeta la probeta evitando desalineaciones.' },
            { a: 0.40, b: 0.60, t: 'Aplicar torque', d: 'Incrementa el momento torsor de forma controlada.' },
            { a: 0.60, b: 0.75, t: 'Registrar T y θ', d: 'Mide torque T y ángulo de giro θ.' },
            { a: 0.75, b: 0.88, t: 'Calcular τ y G', d: 'τmáx = T·R/J; G = T·L/(J·θ) en régimen elástico (eje circular).' },
            { a: 0.88, b: 1.01, t: 'Curva y falla', d: 'Grafica T–θ. Registra torque máximo y modo de falla.' }
        ],
        dureza: [
            { a: 0.00, b: 0.12, t: 'Seleccionar escala', d: 'Elige escala, penetrador y carga adecuados. (ASTM E18 · Rockwell)' },
            { a: 0.12, b: 0.25, t: 'Preparar superficie', d: 'Limpia; verifica espesor, planicidad y condición superficial.' },
            { a: 0.25, b: 0.38, t: 'Instalar probeta', d: 'Apoya la probeta de forma estable en el durómetro.' },
            { a: 0.38, b: 0.52, t: 'Carga preliminar', d: 'El equipo aplica la carga inicial de la escala.' },
            { a: 0.52, b: 0.68, t: 'Carga total', d: 'Añade la carga principal según el procedimiento.' },
            { a: 0.68, b: 0.82, t: 'Mantener y descargar', d: 'Mantén el tiempo indicado y retira la carga adicional.' },
            { a: 0.82, b: 1.01, t: 'Leer dureza Rockwell', d: 'Lee el valor con su escala. Repite respetando distancias a bordes y otras huellas.' }
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
