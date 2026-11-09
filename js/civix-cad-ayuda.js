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
    /* Filas fijas por apartado (coinciden exactamente con los controles que se ven): [control, qué es y para qué sirve, consejo estudiante, criterio docente] */
    var SECT = {
        curvas: [
            ['Plantillas (Lote urbano, Predio rural, Colina, Valle)', 'Botones que llenan de una vez los datos del terreno con ejemplos típicos.', 'Empieza con una plantilla y luego cambia un dato a la vez.', 'Útil para dar el mismo punto de partida a todo el grupo.'],
            ['Terreno aleatorio / Mis puntos (X, Y, Z)', 'Aleatorio: el programa inventa un terreno con la forma que elijas. Mis puntos: pegas tu levantamiento real y se interpola.', 'Usa «Mis puntos» con los datos de una práctica de topografía.', 'Permite contrastar un terreno sintético con un levantamiento real de campo.'],
            ['Forma del terreno', 'Tipo de relieve del terreno aleatorio: mixto, colina, cuenca, ladera, valle u ondulado.', 'Compara cómo se ven las curvas en una colina y en una cuenca (cerradas hacia arriba o hacia abajo).', 'Ayuda a explicar cómo se leen las curvas cerradas, el espaciamiento y las divisorias.'],
            ['Ancho (m)', 'Dimensión del terreno en el sentido este–oeste (eje X).', 'Con el alto define el área total del terreno.', 'Ancho × alto = área; relaciónela con el volumen de corte y relleno.'],
            ['Alto (m)', 'Dimensión del terreno en el sentido norte–sur (eje Y).', 'Un terreno más alargado da curvas más separadas.', 'Compare terrenos cuadrados y alargados con el mismo desnivel.'],
            ['N.º de puntos', 'Cantidad de puntos de cota con los que se arma la superficie (triangulación TIN). Más puntos = más detalle y más peso del DXF.', 'Con pocos puntos las curvas salen angulosas; con 400 se ven suaves.', 'Muestra cómo la densidad del levantamiento afecta la precisión de las curvas.'],
            ['Desnivel total (m)', 'Diferencia entre la cota más alta y la más baja del terreno.', 'A mayor desnivel, más curvas y más juntas (pendiente más fuerte).', 'Relaciónelo con pendiente = desnivel / distancia horizontal.'],
            ['Cota base (m)', 'Altitud (m s. n. m.) del punto más bajo; las demás cotas se suman a este valor.', 'Solo desplaza todas las cotas; no cambia la forma.', 'Puede usarse el valor real de la ciudad (ej. Pamplona ≈ 2300 m).'],
            ['Equidistancia (m, 0 = auto)', 'Diferencia de cota entre dos curvas consecutivas. Con 0 el programa elige una adecuada.', 'Con 1 m el plano se ve limpio; con 0.5 m salen más curvas.', 'Regla práctica: equidistancia ≈ desnivel / 5 a 10 curvas maestras.'],
            ['Semilla', 'Número que fija el terreno aleatorio; vacío = terreno distinto cada vez.', 'Repite el mismo número para obtener el mismo terreno.', 'Entregue la misma semilla a todo el grupo para comparar resultados.'],
            ['Pega tus puntos (X, Y, Z)', 'Cuadro de texto para tu levantamiento: una fila por punto, formato X, Y, Z (también P, E, N, Z, con coma decimal o «;»).', 'Copia directamente la tabla de Excel de tu práctica.', 'Verifique que el sistema de coordenadas sea el mismo para todos los puntos.'],
            ['Proyecto (para el cajetín)', 'Nombre que aparece en el cajetín (recuadro de datos) del plano.', 'Escribe el nombre de tu práctica o proyecto.', 'Exija un nombre claro para identificar cada entrega.'],
            ['Elaboró', 'Nombre de quien hizo el plano; sale en el cajetín.', 'Pon tu nombre completo.', 'Sirve para identificar al autor de cada entrega.'],
            ['▶ Generar curvas de nivel', 'Calcula la triangulación, traza las curvas y abre el visor con botones de DXF, PNG y SVG y las pestañas de resultados (estadísticas, perfil, pendientes y volúmenes).', 'Prueba el perfil entre dos puntos para ver el corte del terreno.', 'Los resultados permiten pedir informes de pendientes y movimiento de tierras.']
        ],
        ia: [
            ['Tipo de plano', 'Clase de plano que Civix debe dibujar (estructural, arquitectónico, cimentación, vía, hidráulico, topográfico…).', 'Elige el tipo más cercano a lo que necesitas.', 'Cada tipo cambia las capas y el estilo del DXF generado.'],
            ['Unidades', 'Unidad en que se dibuja el plano: metros, milímetros o centímetros.', 'Usa metros para planos de edificación y obra civil.', 'Pida siempre la misma unidad para poder comparar entregas.'],
            ['Escala de referencia', 'Escala con la que se piensa imprimir; define el tamaño de textos y cotas.', '1:50 sirve para detalles; 1:100 para plantas.', 'Debe ser coherente con el tamaño de hoja exigido.'],
            ['Nivel de detalle', 'Cuánta información lleva el plano: esencial (pocos tokens), medio o detallado (cotas, textos y cuadros). Más detalle consume más tokens.', 'Empieza en «esencial» y sube solo si lo necesitas.', 'Controla el consumo de la IA en el aula.'],
            ['Describe lo que necesitas', 'Texto libre con dimensiones, cargas, materiales y número de elementos. Mientras más datos des, más preciso el plano.', 'Escribe números concretos (ej. viga de 6 m, 40 kN).', 'Pida a los estudiantes que justifiquen cada dato que escriban.'],
            ['Capas deseadas (opcional)', 'Nombres de capas que quieres en el DXF (EJES, MUROS, COTAS, TEXTOS, ACERO…).', 'Déjalo vacío si no sabes qué capas usar.', 'Permite exigir una convención de capas.'],
            ['➤ Enviar a Civix / Copiar prompt', 'Envía el prompt armado al chat de Civix, o lo copia para usarlo en otro lugar.', 'Lee el prompt antes de enviarlo; cuenta los tokens estimados.', 'Los elementos estructurales usan los diseños locales y no gastan IA.'],
            ['✏️ Refinar el último plano', 'Botones que piden un cambio puntual al último plano: + Cotas, + Cuadro de áreas, + Cuadro de acero, + Norte y escala, Más compacto y Revisar errores.', 'Úsalos para completar el plano sin volver a describir todo.', 'Revisar errores sirve para una autoevaluación del plano antes de entregar.'],
            ['Filtros de prompts (Todos, Estructuras, Cimentaciones…)', 'Filtran la lista de prompts listos por tema; al pulsar uno se envía a Civix.', 'Explora los ejemplos para aprender qué pedir.', 'Son una biblioteca de ejercicios base.']
        ],
        foto: [
            ['🖼 Elegir imagen / 📸 Tomar foto', 'Sube una imagen del plano hecho a mano o toma la foto con la cámara. Mejor con buena luz, hoja plana y trazo oscuro.', 'Fotografía de frente, sin sombras, y llenando el encuadre.', 'Permite digitalizar planos antiguos o bocetos de clase.'],
            ['Sensibilidad del trazo', 'Qué tan tenue puede ser un trazo y aun así detectarse. Bájalo para captar más líneas; súbelo si aparece ruido o sombras.', 'Si faltan líneas, baja este valor.', 'Ajuste distinto para lápiz suave y para tinta.'],
            ['Resolución de análisis', 'Tamaño con el que se procesa la imagen. Más alta capta líneas finas pero tarda más.', 'Usa 2500–3000 en planos grandes.', 'Equilibre calidad y tiempo en computadores del aula.'],
            ['Ignorar cuadrícula del cuaderno / líneas tenues', 'Descarta líneas más débiles que el trazo (cuadrícula del cuaderno).', 'Súbelo hasta que desaparezca la cuadrícula.', 'Evita que la cuadrícula se convierta en entidades del DXF.'],
            ['Descartar texto y detalles pequeños', 'Elimina letras, números y garabatos; conserva muros, ejes y cotas largas. Con 0 se conserva todo.', 'Si se pierden líneas pequeñas importantes, bájalo.', 'Recuerde que el texto no se reconoce; debe re-escribirse en CAD.'],
            ['Unir trazos cercanos / punteados', 'Cierra pequeños huecos (líneas de eje, trazos discontinuos).', 'Súbelo si una línea sale partida en pedazos.', 'Útil para ejes punteados.'],
            ['Limpieza de ruido (longitud mínima)', 'Elimina trazos cortos y manchas por debajo de la longitud elegida.', 'Súbelo si salen puntitos sueltos.', 'Controla la limpieza del DXF final.'],
            ['Suavizado de líneas', 'Reduce vértices de las polilíneas: más alto = líneas más rectas y archivo más liviano.', 'Súbelo para muros rectos.', 'Menos vértices facilitan la edición posterior.'],
            ['Enderezar', 'Corrige la inclinación de la foto y alinea los trazos casi horizontales y verticales.', 'Déjalo activado en planos de plantas.', 'Desactívelo en dibujos curvos o libres.'],
            ['Ignorar márgenes y bordes de la hoja', 'Descarta el borde, la espiral y el margen del cuaderno.', 'Actívalo si el cuaderno tiene margen rojo o espiral.', 'Evita que los bordes de la hoja entren al dibujo.'],
            ['Fondo claro / oscuro', 'Indica si el trazo es oscuro sobre papel claro, o claro sobre fondo oscuro (plano azul); en automático lo detecta.', 'Déjalo en automático.', 'Fije «oscuro» para impresiones de planos azules.'],
            ['Ancho real del dibujo (m)', 'Medida real del ancho del dibujo; escala todo el DXF a metros.', 'Mide una dimensión conocida del plano y escríbela.', 'Sin este dato el DXF no queda a escala real.'],
            ['⬇ Descargar DXF / 👁 Ver en visor CAD', 'Descarga el resultado para AutoCAD o lo muestra en el visor del programa para revisarlo.', 'Revisa siempre las medidas antes de usarlo.', 'El resultado es un borrador para retocar, no un plano final.']
        ],
        vision: [
            ['Antes de empezar', 'CAD Vision necesita su motor local: haz doble clic en iniciar-cad-vision.bat y deja esa ventana abierta.', 'Arriba debe verse «Motor activo · OCR listo».', 'Cada equipo del aula necesita Python y el motor encendido.'],
            ['Interpretar plano', 'Lee cotas y nombres, reconoce muros, puertas y ventanas, y reconstruye el plano en medidas reales.', 'Foto de frente, con buena luz y cotas claras.', 'Pida al estudiante comparar el resultado con su croquis original.'],
            ['Colores de confianza', 'Verde: alta confianza. Ámbar: incertidumbre. Rojo: necesita tu decisión. Cian: ya confirmado.', 'Usa «Revisar siguiente» para recorrer los pendientes.', 'Lo incierto llega en rojo al DXF si se acepta exportarlo.'],
            ['Calibrar', 'Si no hay cotas legibles, pulsa una línea e indica cuánto mide en la realidad; todo el plano se escala.', 'Elige la línea más larga que conozcas.', 'Sin escala el sistema no permite exportar: no inventa medidas.'],
            ['Aplicar a la geometría', 'Corrige una cota y estira el plano para que la medida se cumpla.', 'Hazlo desde la pestaña Cotas.', 'Sirve para discutir la diferencia entre lo dibujado y lo acotado.'],
            ['Exportar', 'Descarga DXF para AutoCAD, PDF o SVG, con capas 00 a 09 y entidades editables.', 'Revisa siempre las cotas antes de usar el plano.', 'El resultado debe verificarse: es apoyo, no un plano aprobado.']
        ]
    };
    function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
    function help(label) { var l = label.toLowerCase().replace(/\s+/g, ' ').trim(), i; for (i = 0; i < D.length; i++) if (D[i][0].test(l)) return D[i][1]; return ''; }
    /* tercera columna según el rol: [regex, consejo para el estudiante, criterio para el docente] */
    var R = [
        [/f.c|f′c/, 'Prueba 21, 28 y 35 MPa y mira cómo baja la sección o el acero.', 'Valores usuales 21–35 MPa (NSR-10 C.1.1.1: mín. 17 MPa). Útil para comparar economía vs. resistencia.'],
        [/^fy|fy \(/, 'Casi siempre se usa 420 MPa (grado 60).', '240 MPa solo para ejemplos históricos; 420 y 500 MPa son los de obra.'],
        [/recubrimiento/, 'Si lo subes, la altura útil d baja y puede aumentar el acero.', 'NSR-10 C.7.7: 40 mm vigas/columnas, 50 mm losas expuestas, 75 mm contra el suelo.'],
        [/alto h|altura h|altura total h|^alto/, 'Aumenta h y verás que baja el acero necesario.', 'Criterio de predimensionamiento: h ≈ L/10 a L/12 en vigas simplemente apoyadas (NSR-10 C.9.5).'],
        [/ancho b|ancho del alma/, 'b ≥ 250 mm es lo habitual en vigas de pórtico.', 'NSR-10 C.21: bw ≥ 250 mm en DES; relación h/b ≤ 3.'],
        [/longitud l|longitud del vano|longitud entre apoyos|longitud tramo/, 'Duplica L y observa cómo el momento se cuadruplica.', 'Buen parámetro para ejercicios de sensibilidad (M ∝ L²).'],
        [/carga muerta/, 'Incluye el peso propio y los acabados.', 'Verifique que el estudiante no duplique el peso propio de la viga.'],
        [/carga viva/, 'Depende del uso: vivienda 1.8 kPa, oficinas 2.0 kPa.', 'NSR-10 B.4.2: tabla de cargas vivas mínimas por ocupación.'],
        [/apoyo/, 'Cambia de articulado a empotrado y compara los diagramas.', 'Permite discutir hiperestaticidad y redistribución de momentos.'],
        [/qadm|capacidad portante/, 'A menor qadm, más grande la zapata.', 'Debe provenir del estudio de suelos; aquí es un dato académico.'],
        [/barra/, '#4–#6 son las más comunes en vigas.', 'Controle separación mínima y longitud de desarrollo (C.12).'],
        [/equidistancia/, 'Con 1 m el plano se ve limpio; con 0.5 m salen más curvas.', 'Regla práctica: equidistancia = desnivel / 5 a 10 curvas maestras.'],
        [/n\.º de puntos/, 'Más puntos = terreno más fiel, pero más lento.', 'Con 400 puntos la triangulación sigue siendo ágil en un computador de aula.'],
        [/semilla/, 'Repite el número para obtener el mismo terreno.', 'Entregue la misma semilla a todo el grupo para comparar resultados.']
    ];
    function extra(label, rol) { var l = label.toLowerCase(), i; for (i = 0; i < R.length; i++) if (R[i][0].test(l)) return rol === 'docente' ? R[i][2] : R[i][1]; return rol === 'docente' ? 'Úselo para un ejercicio de sensibilidad: fije los demás datos y varíe solo este.' : 'Cámbialo y observa cómo se modifican el acero, los diagramas y las cantidades.'; }
    function rolActual() { try { var s = typeof aulaGetSession === 'function' && aulaGetSession(); return s && s.rol === 'docente' ? 'docente' : 'estudiante'; } catch (e) { return 'estudiante'; } }
    var NAMES = { struct: 'Diseño estructural', curvas: 'Curvas de nivel', ia: 'Planos con IA', foto: 'Foto → DXF', vision: 'CAD Vision' };
    function collect(sec, key) {
        var rol = rolActual(), rows = [], seen = {};
        if (SECT[key]) SECT[key].forEach(function (q) { rows.push([q[0], q[1], q[rol === 'docente' ? 3 : 2]]); });
        else sec.querySelectorAll('label.cxp-f > span').forEach(function (sp) {
            var t = sp.textContent.trim(); if (!t || seen[t]) return; seen[t] = 1;
            rows.push([t, help(t) || 'Dato de entrada de este elemento; cámbialo y vuelve a pulsar ▶ Calcular para ver el efecto.', extra(t, rol)]);
        });
        var els = key === 'struct' ? sec.querySelector('.cxp-el.on') : null;
        return { rol: rol, rows: rows, elem: els ? els.textContent.replace(/^\S+\s*/, '') : '' };
    }
    function avatarSrc() { try { if (typeof civixAvatarSrc === 'function') { var u = civixAvatarSrc(); if (u) return u; } var im = document.getElementById('civixAvatarImg'); if (im && im.src) return im.src; } catch (e) { } return 'docs/civix-robot.svg'; }
    function closeModal() { var m = document.getElementById('cxaModal'); if (m) m.remove(); document.removeEventListener('keydown', onKey); }
    function onKey(e) { if (e.key === 'Escape') closeModal(); }
    function openModal(sec, key) {
        closeModal(); var d = collect(sec, key), doc = d.rol === 'docente', ses = null;
        try { ses = typeof aulaGetSession === 'function' ? aulaGetSession() : null; } catch (e) { }
        var nombre = ses ? String(ses.nombre || ses.nombres || '').split(' ')[0] : '';
        var ov = document.createElement('div'); ov.id = 'cxaModal'; ov.className = 'cxa-ov';
        ov.innerHTML = '<div class="cxa-card" role="dialog" aria-modal="true" aria-label="Instrucciones">' +
            '<button type="button" class="cxa-x" aria-label="Cerrar">✕</button>' +
            '<div class="cxa-head"><img src="' + avatarSrc() + '" alt="Civix" class="cxa-av" width="84" height="84"><div class="cxa-ht"><small>' + (doc ? 'Guía para el docente' : 'Bienvenido futuro ingeniero' + (nombre ? ' ' + esc(nombre) : '')) + '</small><h3>Instrucciones · ' + esc(NAMES[key] || key) + '</h3><span class="cxa-pill">' + (doc ? 'DOCENTE' : 'ESTUDIANTE') + '</span>' + (d.elem ? '<span class="cxa-pill cxa-pill2">' + esc(d.elem) + '</span>' : '') + '</div></div>' +
            '<div class="cxa-tabs"><button type="button" class="on" data-p="uso">📘 Cómo usar</button><button type="button" data-p="par">⚙️ Parámetros <b>' + d.rows.length + '</b></button></div>' +
            '<div class="cxa-body"><div class="cxa-pane" data-p="uso"><div class="cxa-tipbox">' + (TIPS[key] || TIPS.struct) + '</div></div>' +
            '<div class="cxa-pane" data-p="par" hidden>' + d.rows.map(function (r) { return '<div class="cxa-item"><h4>' + esc(r[0]) + '</h4><p>' + r[1] + '</p><div class="cxa-adv"><span>' + (doc ? 'Criterio docente' : 'Consejo') + '</span>' + esc(r[2]) + '</div></div>'; }).join('') + '</div></div></div>';
        document.body.appendChild(ov);
        ov.addEventListener('click', function (e) { if (e.target === ov) closeModal(); });
        ov.querySelector('.cxa-x').addEventListener('click', closeModal);
        ov.querySelectorAll('.cxa-tabs button').forEach(function (b) { b.addEventListener('click', function () { ov.querySelectorAll('.cxa-tabs button').forEach(function (x) { x.classList.toggle('on', x === b); }); ov.querySelectorAll('.cxa-pane').forEach(function (pn) { pn.hidden = pn.getAttribute('data-p') !== b.getAttribute('data-p'); }); }); });
        document.addEventListener('keydown', onKey);
    }
    function attach(panel) {
        panel.querySelectorAll('.cxp-sec').forEach(function (sec) {
            if (sec.querySelector('.cxa-btn')) return;
            var key = sec.getAttribute('data-s') || 'struct', b = document.createElement('button');
            b.type = 'button'; b.className = 'cxa-btn'; b.textContent = '📖 Instrucciones';
            b.addEventListener('click', function () { openModal(sec, key); });
            sec.insertBefore(b, sec.firstChild);
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
