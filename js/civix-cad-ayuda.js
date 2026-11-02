/* Civix CAD — botón "📖 Instrucciones" en cada apartado de Planos y CAD (qué es cada parámetro y para qué sirve). Solo texto, local. */
(function () {
    'use strict';
    var D = [ /* [regex sobre la etiqueta en minúsculas, explicación] — gana la primera coincidencia */
        [/n\.º de tramos/, 'Cantidad de tramos (luces) de la viga continua: 2 o 3. Cada tramo lleva su propia longitud.'],
        [/distancia libre a alma|alma vecina/, 'Distancia libre entre las almas de vigas T vecinas. Sirve para calcular el ancho efectivo del ala (be).'],
        [/longitud tramo|tramo \d/, 'Longitud de cada tramo (entre apoyos) de la viga continua. Define el diagrama de momentos y la armadura de cada tramo.'],
        [/longitud l|longitud de los nervios|longitud del vano|longitud entre apoyos|^longitud/, 'Distancia horizontal entre los apoyos del elemento. Es la dimensión que más influye en el momento y el cortante: al duplicarla, el momento se multiplica por cuatro.'],
        [/longitud lx|longitud corta/, 'Lado corto del paño de losa. La losa trabaja principalmente en esta dirección.'],
        [/longitud ly|ancho del paño|longitud larga/, 'Lado largo del paño de losa. Si Ly/Lx es mayor que 2 la losa se comporta en una dirección.'],
        [/longitud lw|^altura hw|hw \(m\)/, 'Dimensiones totales del muro de corte (largo Lw y altura hw). Definen su relación de esbeltez y la cuantía de borde.'],
        [/ancho b|ancho del alma|ancho del nervio|ancho de la viga|viga.* b \(|columnas b|vigas b/, 'Ancho de la sección (b o bw). Junto con la altura h define el área de concreto y la capacidad a flexión y a cortante.'],
        [/alto h|altura h|altura total h|columnas h|vigas h|^alto/, 'Altura total de la sección (h). Es el parámetro que más aumenta la rigidez y la resistencia a flexión; en el plano se acota como "h". La altura útil es d = h − recubrimiento − estribo − ½ barra.'],
        [/altura libre|altura de piso|altura del vástago|altura a salvar/, 'Altura libre del elemento o del piso. En columnas define la esbeltez y las zonas de confinamiento lo.'],
        [/espesor del ala|loseta|hf/, 'Espesor del ala o losa superior (hf) de una viga T o nervada. Controla el ancho efectivo que colabora a compresión.'],
        [/espesor del muro|espesor tw|^espesor/, 'Espesor del muro (t o tw). Afecta la rigidez, el peso propio y la resistencia al cortante del muro.'],
        [/carga muerta|muerta/, 'Carga permanente (D): peso propio, acabados, muros divisorios y equipos fijos. Se mayora con 1.2 (o 1.4 según combinación).'],
        [/carga viva|viva|cubierta lr/, 'Carga variable de uso (L): personas, muebles, equipos móviles. Se mayora con 1.6 (1.0 con sismo). Depende del uso de la edificación (NSR-10 B.4).'],
        [/acabados/, 'Peso de pisos, pañetes, cielo raso y muros livianos, en kN por m² de planta.'],
        [/sismo e|viento w/, 'Acción lateral de sismo (E) o viento (W), con signo. Se combina con la carga gravitacional en las combinaciones del pórtico.'],
        [/fuerza lateral/, 'Fuerza horizontal aplicada en cada nivel del pórtico (sismo simplificado), en kN.'],
        [/carga p por nudo|carga de servicio p|carga p1|carga p2|carga del muro p|^carga p/, 'Carga puntual o lineal que baja a la cimentación o actúa en el elemento. Es una carga de servicio (sin mayorar); el programa la mayora para el diseño estructural.'],
        [/axial pu|carga axial/, 'Carga axial última (mayorada) de compresión que debe resistir la columna.'],
        [/momento mu/, 'Momento flector último (mayorado) que actúa sobre la sección.'],
        [/cortante vu/, 'Fuerza cortante última (mayorada) que debe resistir el elemento.'],
        [/f.c \(mpa\)|f′c/, 'Resistencia a compresión del concreto a 28 días. A mayor f′c, mayor capacidad y menor sección; 21 MPa es lo mínimo usual en estructuras de concreto reforzado.'],
        [/^fy|fy acero|fy \(mpa\)/, 'Esfuerzo de fluencia del acero de refuerzo. 420 MPa es el acero corrugado estándar (grado 60); 240 MPa es acero liso.'],
        [/recubrimiento/, 'Distancia libre entre la cara del concreto y la armadura. Protege el acero de la corrosión y el fuego (NSR-10 C.7.7: 40 mm en vigas y columnas, 75 mm contra el suelo).'],
        [/barra/, 'Número de la barra longitudinal principal (en pulgadas: #4 = 1/2", #5 = 5/8", #6 = 3/4"…). Barras más gruesas dan menos unidades pero requieren más anclaje.'],
        [/n\.º de barras|n\.º de pilotes|n\.º de paneles|n\.º de vigas/, 'Cantidad de elementos repetidos (barras, pilotes, paneles o vigas). Cambia la cuantía, la separación y el cuadro de acero.'],
        [/n\.º de pisos|n\.º de vanos/, 'Número de pisos o de vanos (luces) del pórtico plano.'],
        [/apoyo izquierdo|apoyo derecho|tipo de apoyo|apoyo en la base/, 'Condición de borde: articulado (impide desplazamientos, permite giro), rodillo (impide solo el desplazamiento vertical), empotrado (impide giro y desplazamiento) o libre (voladizo). Cambia el cortante, el momento y dónde va el acero.'],
        [/voladizo izq|^a \(/, 'Longitud del voladizo del lado izquierdo, medida desde el apoyo hasta el extremo libre.'],
        [/ancho de apoyos/, 'Ancho del apoyo (columna o muro) sobre el que descansa la viga. Se usa para reducir el momento y revisar el aplastamiento.'],
        [/tipo de ala|tipolog|tipo de puente|tipo de suelo/, 'Selector del tipo constructivo o de suelo. Cambia las fórmulas y las propiedades usadas en el diseño.'],
        [/qadm|capacidad portante/, 'Capacidad portante admisible del suelo (kPa). Determina el área de la zapata: A = P / qadm.'],
        [/profundidad df|empotre df/, 'Profundidad de desplante de la cimentación medida desde el terreno. Más profundo suele significar suelo más resistente, pero más excavación.'],
        [/peso unitario|γ|gamma/, 'Peso unitario del suelo o relleno (kN/m³). Define el empuje de tierras sobre el muro.'],
        [/fricci|φ \(/, 'Ángulo de fricción interna del suelo granular (φ). Controla el empuje activo/pasivo y la capacidad portante.'],
        [/cu \(kpa\)/, 'Cohesión no drenada del suelo arcilloso. Se usa en suelos cohesivos para capacidad y empuje.'],
        [/sobrecarga q/, 'Carga uniforme sobre el terreno detrás del muro (tráfico, bodegas). Aumenta el empuje de tierras.'],
        [/μ base|mu \(/, 'Coeficiente de fricción entre la base del muro y el suelo, para revisar el deslizamiento.'],
        [/separaci|s \(× d\)|separación s/, 'Distancia entre ejes de los elementos (nervios, pilotes, paneles). Pilotes: mínimo 2.5–3 D.'],
        [/diámetro|ø/, 'Diámetro del pilote o de la columna circular.'],
        [/columna c|columna \d|lado \(mm\)|c1|c2/, 'Lado de la columna que transmite la carga a la zapata. Se usa en la verificación de punzonamiento.'],
        [/límite deflexión|defl/, 'Límite de deflexión viva como fracción de la luz (L/360, L/480…). Más exigente = viga más alta.'],
        [/bordes continuos/, 'Cantidad de bordes del paño de losa que continúan con otro paño. Cambia los coeficientes de momento.'],
        [/continuidad de los nervios/, 'Indica si los nervios son simplemente apoyados o continuos sobre los apoyos.'],
        [/diagrama a mostrar/, 'Elige la combinación de carga cuyo diagrama se dibuja en el pórtico.'],
        [/huella|contrahuella/, 'Huella: parte horizontal del peldaño. Con la contrahuella debe cumplir 2c + h ≈ 60–64 cm para que la escalera sea cómoda.'],
        [/ancho \(m\)|ancho de cada andén|ancho de calzada/, 'Ancho de la zona de terreno, de la calzada o de los andenes, según el apartado.'],
        [/n\.º de puntos/, 'Cantidad de puntos topográficos generados. Más puntos = curvas más detalladas, pero más pesado el DXF.'],
        [/desnivel total/, 'Diferencia entre la cota más alta y la más baja del terreno.'],
        [/cota base/, 'Cota (altitud) del punto más bajo del terreno, en metros sobre el nivel del mar.'],
        [/equidistancia/, 'Diferencia de cota entre dos curvas de nivel consecutivas. 0 = el programa elige una adecuada.'],
        [/semilla/, 'Número que fija el terreno aleatorio: con la misma semilla obtienes siempre el mismo terreno.'],
        [/colina|ladera|valle|cuenca|ondulado|mixto/, 'Forma del terreno que se genera de ejemplo (colina, ladera, valle, cuenca, ondulado o mixto).'],
        [/tipo de plano|unidades/, 'Datos que se agregan al prompt para que Civix dibuje el plano con el tipo y las unidades que necesitas.']
    ];
    var TIPS = {
        struct: '<b>Cómo usar:</b> elige una categoría y un elemento, escribe los datos y pulsa <b>▶ Calcular</b>. El programa predimensiona (ACI 318 / NSR-10, solo educativo), dibuja el plano en metros (varillas en pulgadas), muestra el cuadro de acero y las cantidades, y deja descargar el <b>DXF</b> para AutoCAD. Lo que cambies se recalcula completo; las dimensiones del plano siguen la escala del elemento.<br><b>Resultado:</b> botones DXF/PNG/SVG, memoria de cálculo y tabla de cantidades (concreto, acero, estribos, formaleta).',
        curvas: '<b>Cómo usar:</b> define el tamaño del terreno y su relieve, genera los puntos y pulsa para trazar las curvas de nivel (TIN + interpolación). También puedes pegar tus propios puntos X, Y, Z. Con las pestañas de resultados ves estadísticas, perfil longitudinal, pendientes y volúmenes. Descarga todo como DXF para Civil 3D.',
        ia: '<b>Cómo usar:</b> arma el prompt con el constructor (tipo de plano, unidades, datos) y se envía a Civix en el chat. Las peticiones de elementos estructurales se resuelven con los mismos diseños del apartado <b>Diseño estructural</b>; el resto las dibuja la IA y <b>consume tokens</b>.',
        foto: '<b>Cómo usar:</b> sube una foto o escaneo de un plano hecho a mano, ajusta los controles y pulsa convertir. Se detectan líneas, se enderezan, se escalan al ancho real y se descargan como DXF. Mejor con fondo claro, trazo oscuro y buena luz.<br><b>Controles:</b> <i>Sensibilidad</i> (qué tan tenue puede ser un trazo y aun contarse), <i>Resolución</i> (tamaño de procesamiento), <i>Unir trazos</i> (cierra huecos pequeños), <i>Ignorar cuadrícula</i> (descarta líneas más tenues que el trazo), <i>Descartar texto y detalles pequeños</i> (elimina garabatos), <i>Longitud mínima</i> y <i>Simplificar</i> (elimina segmentos cortos y reduce vértices), <i>Márgenes</i> (ignora el borde del cuaderno), <i>Enderezar</i> (corrige inclinación), <i>Invertir</i> (para pizarras oscuras) y <i>Ancho real (m)</i> (escala final del dibujo).'
    };
    function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    function help(label) { var l = label.toLowerCase().replace(/\s+/g, ' ').trim(), i; for (i = 0; i < D.length; i++) if (D[i][0].test(l)) return D[i][1]; return ''; }
    function build(sec, key) {
        var box = sec.querySelector('.cxa-box'); if (!box) return;
        var html = '<p class="cxa-tip">' + (TIPS[key] || TIPS.struct) + '</p>';
        var els = sec.querySelector('.cxp-el.on'); if (els) html += '<h5>Elemento: ' + esc(els.textContent.replace(/^\S+\s*/, '')) + '</h5>';
        var seen = {}, rows = '';
        sec.querySelectorAll('label.cxp-f > span, label.cxf-f > span, .cxf-row > span, .cxf-row > label').forEach(function (sp) {
            var t = sp.textContent.trim(); if (!t || seen[t]) return; seen[t] = 1; var h = help(t); if (h) rows += '<dt>' + esc(t) + '</dt><dd>' + h + '</dd>';
        });
        if (rows) html += '<h5>Parámetros</h5><dl>' + rows + '</dl>';
        box.innerHTML = html;
    }
    function attach(panel) {
        panel.querySelectorAll('.cxp-sec').forEach(function (sec) {
            if (sec.querySelector('.cxa-btn')) return;
            var key = sec.getAttribute('data-s') || 'struct', b = document.createElement('button'), box = document.createElement('div');
            b.type = 'button'; b.className = 'cxa-btn'; b.textContent = '📖 Instrucciones'; box.className = 'cxa-box'; box.hidden = true;
            b.addEventListener('click', function () { if (box.hidden) { build(sec, key); box.hidden = false; } else box.hidden = true; });
            sec.insertBefore(box, sec.firstChild); sec.insertBefore(b, box);
        });
    }
    function init() {
        var panel = document.querySelector('.cxp-tabs'); panel = panel && panel.parentNode; if (!panel) return false;
        attach(panel); new MutationObserver(function () { attach(panel); }).observe(panel, { childList: true });
        return true;
    }
    function boot() { if (init()) return; var n = 0, t = setInterval(function () { if (init() || ++n > 80) clearInterval(t); }, 250); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
