/**
 * GeoMetrics — GUION DEL TUTOR de los simuladores 3D (diálogos en tono cercano).
 *
 * Una lista por ensayo; dentro, una lista por etapa; cada frase es una parte que el tutor dice y que se avanza con
 * «Siguiente». Cada frase corresponde a un audio: audio/tutor/<ensayo>/e<etapa>-<parte>.mp3 (ej. humedad/e2-3.mp3).
 * Las frases que empiezan por «Ojo» se muestran como advertencia.
 * Para cambiar lo que dice el tutor basta con editar este archivo (y volver a grabar ese audio).
 */
window.GeoTutorGuion = {

    /* ======================= MECÁNICA DE SUELOS ======================= */

    corte: [
        ['Empecemos tallando la muestra. Presiona el anillo cortante sobre el bloque de suelo y enrasa las caras con el alambre de corte.',
         'Lo típico es una caja de 60 por 60 milímetros, o un diámetro de 63,5 milímetros, con un espesor de unos 20 a 25 milímetros.',
         'Recuerda que el espesor debe ser al menos seis veces el tamaño de la partícula más grande.',
         'Ojo, un error común es: dejar la probeta más delgada de lo debido o con los bordes desmoronados.'],
        ['Ahora vamos a medir y pesar. Con el calibre mide el lado y el espesor de la muestra.',
         'Luego pésala; con estos datos conocemos su densidad inicial.',
         'Guarda un poco del material sobrante para sacarle la humedad.',
         'Ojo, un error común es: medir una sola vez; mide en varios puntos y saca el promedio.'],
        ['Es momento de armar la caja de corte. Coloca abajo la piedra porosa y, si aplica, un papel filtro.',
         'Mete la probeta con cuidado, y encima pon otro papel, la piedra porosa superior y el cabezal de carga.',
         'Asegura las dos mitades de la caja con los tornillos de alineación y deja los deformímetros en cero.',
         'Ojo, un error común es: olvidar quitar los tornillos de alineación antes de cortar; así la caja no se puede mover.'],
        ['Ahora aplicamos la carga normal. Pon la carga vertical con las pesas o con el actuador.',
         'El esfuerzo normal es esa carga dividida entre el área de la muestra.',
         'Si el ensayo es drenado, espera con paciencia a que termine el asentamiento vertical.',
         'Después separa un poquito las mitades de la caja, como medio milímetro, y retira los tornillos.',
         'Ojo, un error común es: cortar una arcilla antes de que termine de consolidarse.'],
        ['¡Llegó el corte! Una mitad de la caja se desplaza de lado a velocidad constante.',
         'En arenas se usa entre medio y un milímetro por minuto; en arcillas drenadas, mucho más lento.',
         'Arranca el motor y no lo detengas hasta el final, más o menos hasta un desplazamiento del diez por ciento del ancho.',
         'Ojo, un error común es: cortar una arcilla muy rápido; se generan presiones de agua y el ensayo deja de ser drenado.'],
        ['Mientras corta, vamos anotando. Registra el desplazamiento horizontal, la fuerza cortante y el desplazamiento vertical.',
         'Cuando te acerques al pico, toma las lecturas más seguido.',
         'Ojo, un error común es: anotar muy espaciado y perder el valor máximo.'],
        ['Con los datos calculamos el esfuerzo cortante: la fuerza cortante dividida entre el área.',
         'Si la norma lo pide, corrige el área, porque se va reduciendo a medida que la caja se desplaza.',
         'Después grafica el esfuerzo contra el desplazamiento horizontal, y el desplazamiento vertical contra el horizontal.',
         'Ojo, un error común es: usar el área inicial cuando el desplazamiento ya es grande.'],
        ['Ahora identificamos la resistencia. Si la curva tiene un pico claro, ese es tu esfuerzo de falla.',
         'Si no hay pico, toma el esfuerzo en un desplazamiento acordado.',
         'Y si la curva baja después del pico, anota también la resistencia residual.',
         'Ojo, un error común es: tomar la resistencia residual como si fuera la de pico.'],
        ['Para terminar, obtenemos la cohesión y el ángulo de fricción. Repite el ensayo con al menos tres cargas normales distintas.',
         'Grafica el esfuerzo de falla contra el esfuerzo normal y traza una recta por los puntos.',
         'Donde la recta corta el eje vertical está la cohesión, y su inclinación te da el ángulo de fricción.',
         'Ojo, un error común es: usar solo dos puntos, o mezclar resultados de pico con residuales.']
    ],

    inconfinada: [
        ['Empecemos con la probeta. Sácala del tubo Shelby y enrasa los extremos; su altura es de dos a dos veces y media el diámetro.',
         'Ojo: las caras deben quedar perpendiculares al eje, o la carga se concentra en un borde.'],
        ['Ahora medimos. Toma el diámetro y la altura en tres puntos, promedia y pesa la probeta.'],
        ['Centra la probeta en la prensa, sube el plato hasta que apenas la toque y pon todo en cero.'],
        ['¡A cargar! Entre medio y dos por ciento de deformación por minuto, hasta que falle.',
         'Ojo: si cargas muy rápido, la resistencia sale más alta de lo real.'],
        ['Anota la carga y el acortamiento, y más seguido cerca del pico.'],
        ['Calcula la deformación y corrige el área, porque la probeta se ensancha al comprimirse.'],
        ['El esfuerzo es la carga entre el área corregida. Grafícalo contra la deformación.'],
        ['Para terminar: el esfuerzo máximo es la resistencia inconfinada, y la cohesión es la mitad.',
         'Ojo: no reportes la resistencia como cohesión; es el doble.']
    ],

    consolidacion: [
        ['Empecemos tallando la muestra con el anillo cortante y enrasando ambas caras, sin alterarla.',
         'Ojo: si la alteras, pierde la historia de esfuerzos que queremos medir.'],
        ['Mide la altura inicial y pesa el anillo con el suelo; así calculas el índice de vacíos inicial.'],
        ['Arma el edómetro: piedra porosa abajo, el anillo con la muestra, y arriba otra piedra y el cabezal.',
         'Ojo: humedece las piedras, para que no le roben agua a la muestra.'],
        ['Aplica una carga pequeña de asiento y pon el deformímetro en cero.'],
        ['En cada escalón duplica la carga, y déjala normalmente veinticuatro horas.'],
        ['Lee el asentamiento a tiempos fijos y grafícalo contra el logaritmo del tiempo.'],
        ['Calcula el índice de vacíos de cada escalón y grafícalo contra el esfuerzo.'],
        ['Para terminar: la pendiente del tramo virgen es el índice de compresión, y con Casagrande hallas la preconsolidación.',
         'Ojo: en la zona sobreconsolidada se usa el índice de expansión.']
    ],

    triaxial: [
        ['Empecemos con la probeta. Tállala con cuidado, mide su diámetro y su altura, y pésala.'],
        ['Ponla sobre el pedestal y cúbrela con la membrana de látex.',
         'Ojo: si la membrana se rompe, entra agua y el ensayo se pierde.'],
        ['Cierra la cámara y llénala con agua desaireada, sin dejar burbujas.'],
        ['Aplica la presión de confinamiento. En los ensayos consolidados, satura primero la muestra.'],
        ['Si el ensayo es consolidado, abre el drenaje y espera a que termine de consolidar.'],
        ['En el UU el drenaje va cerrado; en el CU, cerrado midiendo presión de poros; y en el CD, abierto y lento.'],
        ['¡A cargar! Deformación constante hasta la falla, corrigiendo el área.'],
        ['Registra la carga y la deformación, y repite con tres confinamientos distintos.'],
        ['Para terminar, dibuja los círculos de Mohr y su tangente: el corte es la cohesión y la inclinación, el ángulo de fricción.',
         'Ojo: usa el radio del círculo, no el diámetro.']
    ],

    humedad: [
        ['Pesar el recipiente vacío. Usa un recipiente limpio y seco, rotúlalo y pésalo con la balanza en cero.',
         'Ojo: si está húmedo o caliente, la lectura sale falsa.'],
        ['Cargar la muestra. Pasa con la espátula una porción representativa, de unos veinte gramos, sin perder material.',
         'Ojo: tápala si no la pesas de inmediato, para que no pierda humedad.'],
        ['Pesar la muestra húmeda. Pon el recipiente con el suelo en la balanza y anota el peso húmedo.'],
        ['Secar en el horno a ciento diez grados, normalmente toda la noche, hasta que el peso ya no cambie.',
         'Ojo: no abras el horno a cada rato.'],
        ['Pesar la muestra seca. Sácala con pinzas o guantes térmicos, déjala enfriar y pésala.',
         'La humedad es el peso del agua entre el peso del suelo seco, por cien.']
    ],

    granulometria: [
        ['Empecemos secando la muestra y desmenuzando los terrones con suavidad. Pésala: será el cien por ciento de la curva.',
         'Ojo: no tritures los granos, o aparecen finos que no existían.'],
        ['Arma la columna de tamices: los más gruesos arriba, los más finos abajo y el fondo al final.'],
        ['Vierte la muestra en el tamiz de arriba y coloca la tapa.'],
        ['¡A tamizar! Agita unos diez a quince minutos, sin sobrecargar los tamices.'],
        ['Para terminar, pesa lo retenido en cada tamiz y en el fondo; con esos pesos armas la curva.']
    ],

    limites: [
        ['Empecemos pasando el suelo por el tamiz número cuarenta y colocándolo sobre la placa.'],
        ['Agrega agua destilada poco a poco con la piseta.',
         'Ojo: si echas mucha agua de golpe, tendrás que empezar de nuevo.'],
        ['Amasa con la espátula hasta tener una pasta uniforme y sin grumos.'],
        ['Pasa la pasta a la copa de Casagrande y alísala, con un centímetro de espesor en el centro.'],
        ['Traza la ranura en un solo movimiento firme.',
         'Ojo: si la haces en varias pasadas, la pasta se desgarra.'],
        ['¡A girar la manivela! Dos golpes por segundo, hasta que la ranura se cierre en trece milímetros.'],
        ['Anota los golpes y mide la humedad de esa zona. Repite con varias humedades.']
    ],

    gravedad: [
        ['Empecemos pesando el suelo seco al horno que vamos a ensayar.'],
        ['Llena el picnómetro con agua destilada hasta la marca.'],
        ['Sécalo por fuera y pésalo con el agua. Anota también la temperatura.'],
        ['Vacía una parte del agua y vierte el suelo con un embudo, sin perder partículas.'],
        ['Saca el aire atrapado con vacío, hasta que no salgan más burbujas.',
         'Ojo: si quitas poco aire, la gravedad específica sale menor.'],
        ['Completa con agua hasta la marca.'],
        ['Para terminar, seca por fuera y pesa. Con los tres pesos calculas la gravedad específica.']
    ],

    compactacion: [
        ['Empecemos secando y tamizando el suelo, y preparando cuatro o cinco porciones iguales.',
         'Ojo: no reutilices suelo ya compactado.'],
        ['A cada porción échale una cantidad distinta de agua.'],
        ['Mezcla hasta tener un color uniforme y deja reposar tapado.'],
        ['¡A compactar! Llena el molde por capas, con 25 golpes repartidos en cada una.',
         'Ojo: no golpees siempre en el centro.'],
        ['Retira el collar, enrasa y pesa: así obtienes un punto de la curva de compactación.']
    ],

    densidad: [
        ['Empecemos pesando el frasco lleno de arena calibrada.'],
        ['Nivela el terreno y fija la placa base.',
         'Ojo: si la superficie queda irregular, el volumen sale mayor.'],
        ['¡A excavar! Cava por el orificio y guarda todo el suelo en una bolsa cerrada. Luego pésalo.'],
        ['Invierte el frasco con el cono sobre la placa, encima del hueco.'],
        ['Abre la válvula y deja caer la arena, sin golpear nada.',
         'Ojo: si golpeas el equipo, la arena se compacta y el volumen sale mal.'],
        ['Para terminar, pesa el frasco. La arena usada da el volumen, y el suelo entre ese volumen es la densidad.']
    ],

    clasificacion: [
        ['Empecemos tamizando la muestra. Si pasa menos de la mitad por el tamiz doscientos, el suelo es grueso; si no, es fino.'],
        ['Con los finos se hacen el límite líquido y el límite plástico.',
         'Ojo: no clasifiques los finos sin haber hecho los límites.'],
        ['Revisa cuánto hay de grava, de arena y de finos.'],
        ['Ubica el punto en la carta de plasticidad: sobre la línea A son arcillas; debajo, limos.'],
        ['Para terminar, arma el símbolo SUCS y escribe su nombre, por ejemplo: arena limosa.']
    ],

    /* método de cabeza constante (el que muestra el simulador); así quedó grabado en los audios */
    permeabilidad: [
        ['Empecemos tamizando el suelo y retirando lo que queda en el tamiz de tres cuartos.',
         'Ojo: este método es para arenas y gravas con pocos finos.',
         'Coloca el suelo en el cilindro por capas, entre dos piedras porosas, apisonando cada capa.'],
        ['Satura la muestra desde abajo, despacio, para que no quede aire atrapado.'],
        ['Deja correr el agua con carga constante hasta que el caudal se estabilice.'],
        ['Recoge el agua en una probeta mientras mides el tiempo. Repite tres veces y anota la temperatura.'],
        ['Para terminar, calcula la permeabilidad con el caudal, la longitud, el área y la carga de agua, y corrígela a veinte grados.']
    ],

    traccion: [
        ['Zona elástica: la probeta se estira y volvería a su tamaño. Con esta recta calculas el módulo de elasticidad.'],
        ['Fluencia: el material se deforma para siempre, y luego se endurece hasta la carga máxima.'],
        ['Mira el centro: se forma un cuello y la curva baja.'],
        ['¡Fractura! Junta las mitades y calcula el alargamiento.',
         'Si la fractura es de copa y cono, el material es dúctil.']
    ],

    compresion: [
        ['El pistón comprime el cilindro de forma continua, sin golpes.',
         'Ojo: si cargas a golpes, la resistencia sale más alta.'],
        ['¡Falla! Anota la carga máxima y observa cómo se rompió.'],
        ['La resistencia es la carga máxima entre el área de la cara.']
    ],

    flexion: [
        ['La viga se curva: arriba se comprime y abajo se tracciona.'],
        ['¡Rotura! Calcula el módulo de ruptura con la fórmula de tu montaje.',
         'Ojo: tres puntos y carga en los tercios usan fórmulas distintas.']
    ],

    torsion: [
        ['Aplica el torque despacio y anota el ángulo de giro.'],
        ['El material fluye: la curva deja de ser recta.'],
        ['¡Fractura! Si es plana, el material es dúctil; si es en hélice, es frágil.']
    ],

    dureza: [
        ['Aplica la precarga de diez kilos y pon el indicador en cero.',
         'Ojo: sin precarga, la lectura no es Rockwell.'],
        ['Aplica la carga mayor, sin impactos.'],
        ['Mantén la carga unos segundos.'],
        ['Retira la carga mayor y deja la precarga.',
         'Ojo: nunca leas con la carga mayor puesta.'],
        ['Lee la dureza. Haz tres lecturas y promedia.']
    ],

    dm_rev: [
        ['Llena el cono en tres capas de igual volumen, con 25 golpes de varilla en cada una.',
         'Ojo: las capas son de igual volumen, no de igual altura.'],
        ['Levanta el cono en vertical, en unos cinco segundos, sin girarlo.'],
        ['Mira cómo se asienta. Si se desliza hacia un lado, repite el ensayo.'],
        ['Mide desde la varilla hasta el centro del concreto.']
    ],

    dm_comp: [
        ['Centra el cilindro y carga de forma continua, sin impactos.'],
        ['Cerca del pico la curva se aplana y aparecen grietas.'],
        ['¡Falla! Anota la carga máxima.'],
        ['La resistencia es la carga máxima entre el área. Promedia al menos dos cilindros.']
    ],

    dm_aci: [
        ['Empecemos calculando la resistencia requerida, que da un margen de seguridad.',
         'Ojo: no diseñes con la resistencia especificada.'],
        ['Con el asentamiento y el tamaño máximo, la tabla te da el agua y el aire.'],
        ['Busca la relación agua cemento según la resistencia y la durabilidad.'],
        ['El cemento es el agua dividida entre la relación agua cemento.'],
        ['La grava sale de la tabla, por su peso unitario compactado.'],
        ['La arena es lo que falta para completar un metro cúbico.',
         'Ojo: no olvides el volumen del aire.'],
        ['Para terminar, expresa las proporciones y corrige por la humedad de los agregados.']
    ],

    dm_agg: [
        ['Carga la arena y la grava por separado.'],
        ['Prueba distintas proporciones de arena y mira cómo cambia la curva.'],
        ['Elige la proporción que más se acerca a la curva ideal.'],
        ['Reporta el porcentaje de arena y revisa que quede dentro de la banda.']
    ],

    dm_gran: [
        ['Seca la muestra, pésala y viértela en el tamiz de arriba.'],
        ['Vibra la columna unos diez minutos.'],
        ['Pesa lo retenido en cada tamiz y en el fondo.'],
        ['Calcula el porcentaje que pasa y el módulo de finura, sin incluir el fondo.']
    ],

    dm_punit: [
        ['Pesa el recipiente vacío.'],
        ['Llénalo en tres capas, con 25 golpes de varilla en cada una.'],
        ['Enrasa la superficie con la regla.'],
        ['Limpia el recipiente por fuera y pésalo lleno.'],
        ['El peso unitario es el peso del material entre el volumen del recipiente.']
    ],

    dm_hum: [
        ['Pesa la muestra de inmediato, en su estado natural.',
         'Ojo: no la dejes al aire antes de pesarla.'],
        ['Sécala en el horno hasta que su peso ya no cambie.'],
        ['Déjala enfriar y pésala de nuevo.'],
        ['La humedad es la diferencia de pesos entre el peso seco. Réstale la absorción.']
    ],

    dm_fresco: [
        ['Llena la olla en tres capas, con 25 golpes de varilla y golpecitos laterales con el mazo.'],
        ['Enrasa y pesa: así obtienes el peso unitario.'],
        ['Cierra la tapa e inyecta agua hasta que salga sin burbujas.'],
        ['Bombea hasta la presión inicial, abre la válvula y lee el porcentaje de aire.',
         'Ojo: resta el factor de corrección del agregado.'],
        ['Para terminar, reporta el peso unitario, el aire y el rendimiento de la tanda.']
    ],

    /* ======================= ESTRUCTURAS I ======================= */
    /* (sin audios grabados todavía: el tutor usa la voz del navegador) */

    est_viga: [
        ['Mira primero los apoyos, porque ellos deciden todo. Un pasador no deja que la viga se desplace, pero sí que gire; un rodillo solo impide que baje.',
         'Si cambias un extremo a empotrado, la viga ya no puede girar ahí y se vuelve hiperestática. Pruébalo en Parámetros.'],
        ['Ahora aplicamos las cargas: la distribuida w sobre toda la luz y la puntual P en la posición que elegiste.',
         'Fíjate que las cargas crecen poco a poco; como el material es elástico, todos los resultados crecen en la misma proporción.'],
        ['Con las cargas puestas aparecen las reacciones. Sumando momentos en A y fuerzas verticales salen R_A y R_B.',
         'Ojo: si un extremo está empotrado, además de la fuerza aparece un momento de reacción.'],
        ['Este es el diagrama de cortante, en azul. Baja de forma lineal por la carga w y da un salto justo debajo de P.',
         'Donde el cortante cruza por cero, el momento llega a su máximo.'],
        ['Ahora el diagrama de momento, en verde. Lo positivo cuelga hacia abajo: ahí la fibra inferior está a tracción.',
         'El momento máximo es el que se usa para calcular el esfuerzo de flexión y dimensionar la sección.'],
        ['Por último, la viga se deforma. La elástica está amplificada para que la veas, pero la flecha real está en los resultados.',
         'Compárala con L sobre 360: si se pasa, toca aumentar la altura h, que es la que más rigidez aporta.']
    ],

    est_voladizo: [
        ['Este voladizo está empotrado en el muro y libre en la punta, como un balcón o un alero.',
         'El empotramiento impide que la viga baje y que gire en el muro.'],
        ['Aplicamos la carga en la punta y la carga repartida a lo largo de la viga.'],
        ['En el empotramiento aparecen dos reacciones: una fuerza vertical igual a toda la carga y un momento que evita el giro.',
         'Ojo: ese momento de empotramiento es el más grande de toda la viga.'],
        ['El cortante es máximo junto al muro y va bajando hacia la punta.'],
        ['El momento es negativo en todo el voladizo: aquí la fibra que trabaja a tracción es la de arriba.',
         'Por eso en un voladizo de concreto el acero principal va en la parte superior.'],
        ['Mira cómo se dobla: la flecha máxima está en la punta.',
         'Si duplicas la longitud, la flecha por la carga puntual se multiplica por ocho. La longitud manda.']
    ],

    est_cercha: [
        ['Esta es una cercha Pratt de cuatro paneles, con dos planos unidos por riostras.',
         'Todas las barras se unen en nudos articulados, así que solo trabajan a fuerza axial.'],
        ['Ponemos la carga P en el nudo que elegiste.'],
        ['Primero las reacciones en los apoyos. Con la carga en el centro, cada apoyo toma la mitad.'],
        ['Ahora resolvemos el equilibrio de cada nudo: suma de fuerzas horizontales y verticales igual a cero.',
         'Sobre cada barra aparece su fuerza en kilonewtons.'],
        ['Las barras rojas trabajan a tracción y las azules a compresión; las más gruesas son las más cargadas.',
         'En la Pratt las diagonales bajan hacia el centro y quedan a tracción, mientras el cordón superior se comprime.',
         'Ojo: las barras a compresión también hay que revisarlas por pandeo.'],
        ['Por último, la flecha del nudo cargado, calculada por trabajo virtual.',
         'Si aumentas el área de las barras, la flecha baja en la misma proporción.']
    ],

    est_portico: [
        ['Este es un pórtico de un vano y un piso. Las columnas pueden estar empotradas o articuladas en la base.'],
        ['Aplicamos la carga lateral W a la altura de la cubierta, como si fuera viento o sismo.'],
        ['El método del portal supone puntos de inflexión, donde el momento es cero, a media altura de las columnas y a media luz de la viga.',
         'Con base articulada, el momento es cero justo en la base.'],
        ['Cada columna toma la mitad del cortante. En las bases aparecen esas reacciones horizontales.',
         'El vuelco hace que una columna quede a tracción y la otra a compresión.'],
        ['Estos son los momentos en las columnas: máximos en los extremos y cero en el punto de inflexión.'],
        ['Por último, la deriva: cuánto se desplaza la cubierta. Se compara con la altura sobre 250.',
         'La deriva crece con el cubo de la altura, así que un pórtico más alto necesita columnas mucho más rígidas.']
    ],

    est_continuas: [
        ['Esta viga continua tiene dos luces y tres apoyos. Al ser continua sobre B, es hiperestática de grado uno.'],
        ['Aplicamos una carga distribuida en cada tramo.'],
        ['La incógnita clave es el momento en el apoyo central. Sale de la ecuación de los tres momentos, porque el giro en B es el mismo para los dos tramos.',
         'Ese momento es negativo: sobre el apoyo, la viga trabaja a tracción arriba.'],
        ['Conocido el momento en B, cada tramo es isostático y salen las tres reacciones.'],
        ['Mira los diagramas: el momento negativo en B reduce los momentos positivos de las luces.',
         'Por eso una viga continua es más eficiente que dos vigas simplemente apoyadas.']
    ]
};
