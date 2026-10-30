/* =========================================================
   GeoMetrics — Teoría de Estructuras I (código 165013)
   Unidades: generalidades, métodos energéticos, método directo
   de rigidez y métodos aproximados para pórticos.
   ========================================================= */
(function (global) {
    'use strict';
    var S = String.raw;
    global.TN_MODULES = global.TN_MODULES || {};

    global.TN_MODULES.est = {
        key: 'est',
        host: 'estTeoriaRoot',
        screen: 'pantallaEstructuras',
        tab: 'est-ensayos',
        prefix: 'est',
        eyebrow: 'Estructuras I · Código 165013',
        title: 'Calcular desplazamientos y entender cómo resiste una estructura',
        desc: 'Del equilibrio y la estabilidad al trabajo virtual, Castigliano, la matriz de rigidez y los métodos aproximados para pórticos. Cada concepto se conecta con una práctica de cálculo y con un simulador paramétrico.',
        tags: ['NSR-10', 'NTC', 'Hibbeler', 'McCormac', 'Uribe Escamilla', 'Timoshenko'],
        stats: [
            ['4', 'unidades del programa'],
            ['8', 'prácticas de cálculo'],
            ['4', 'simuladores interactivos'],
            ['100 %', 'ecuaciones renderizadas']
        ],
        scope: '<b>Alcance.</b> El análisis estructural construye un modelo matemático de la estructura real: idealiza apoyos, uniones, material y cargas, y calcula fuerzas internas y desplazamientos. Los resultados son tan confiables como las hipótesis. En obra se contrastan con la norma (NSR-10), con ensayos de materiales y con el criterio del ingeniero; ningún resultado de esta aplicación reemplaza la revisión de un profesional responsable.',
        route: [
            { t: 'Sección y centroide', d: 'Área, centro de gravedad e inercia', go: 'centroides' },
            { t: 'Estabilidad y DSI', d: 'Grado de indeterminación estático y cinemático', go: 'indeterminacion' },
            { t: 'Viga simplemente apoyada', d: 'Reacciones, cortante, momento y deflexión', go: 'viga' },
            { t: 'Voladizo', d: 'Momento de empotramiento y flecha en punta', go: 'voladizo' },
            { t: 'Cercha por nudos', d: 'Fuerzas axiales y desplazamiento vertical', go: 'cercha' },
            { t: 'Pórtico por el portal', d: 'Cortantes y momentos por carga lateral', go: 'portico' },
            { t: 'Matriz de rigidez', d: 'Elemento viga y transformación de coordenadas', go: 'rigidez' },
            { t: 'Viga continua', d: 'Pendiente-deflexión y momentos de apoyo', go: 'continuas' }
        ],
        sections: [
            {
                id: 'analisis',
                title: 'Qué es el análisis estructural y cómo se modela',
                html: S`
<p>El <strong>análisis estructural</strong> es el proceso de determinar fuerzas internas, reacciones y desplazamientos de una estructura bajo un conjunto de acciones. No es lo mismo que el diseño: el diseño decide dimensiones, materiales y refuerzo; el análisis verifica si esa decisión resiste y se deforma de manera aceptable. El puente entre ambos es el <strong>modelo estructural</strong>.</p>

<div class="tn-grid">
    <div class="tn-mini"><b>Estructura real</b><p>Concreto, acero, madera, uniones, imperfecciones, fisuras, fluencia y tiempo. No es posible representarla con todas sus variables a la vez.</p></div>
    <div class="tn-mini"><b>Modelo</b><p>Idealización de barras, placas o sólidos; apoyos y uniones con condiciones de borde; cargas y combinaciones; hipótesis de material.</p></div>
    <div class="tn-mini"><b>Resultado</b><p>Reacciones, diagramas N–V–M, desplazamientos, esfuerzos y verificación de estados límite. Se compara con la norma y con el criterio profesional.</p></div>
</div>

<h5>Tipos de estructura según la forma de resistir</h5>
<ul>
    <li><strong>Estructuras de barras:</strong> vigas, columnas, pórticos y cerchas. Las cargas se transmiten principalmente por axial, flexión y cortante.</li>
    <li><strong>Cerchas:</strong> barras articuladas en sus extremos, cargadas en los nudos. Si el modelo es ideal, solo desarrollan fuerza axial.</li>
    <li><strong>Pórticos:</strong> vigas y columnas unidas con rigidez a flexión; resisten cargas verticales y horizontales. Son la base de la edificación en concreto y acero.</li>
    <li><strong>Arcos y cables:</strong> resisten principalmente por compresión o tracción. Su forma depende del estado de cargas.</li>
    <li><strong>Losas y placas:</strong> trabajan en dos direcciones; el modelo de barras no captura su comportamiento local.</li>
</ul>

<h5>Condiciones de borde y tipos de apoyo</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Apoyo</th><th>Grados restringidos</th><th>Reacciones</th><th>Uso típico</th></tr></thead>
<tbody>
<tr><td>Rodillo / apoyo simple</td><td>1 traslación</td><td>1 fuerza perpendicular</td><td>Extremo de viga o cercha</td></tr>
<tr><td>Articulación (pasador)</td><td>2 traslaciones</td><td>2 fuerzas (Rx, Ry)</td><td>Apoyo fijo de cercha</td></tr>
<tr><td>Empotramiento</td><td>2 traslaciones + giro</td><td>Rx, Ry y M</td><td>Columna en cimentación</td></tr>
<tr><td>Guía deslizante</td><td>1 traslación + giro</td><td>1 fuerza + M</td><td>Simetría o apoyo especial</td></tr>
</tbody></table></div>

<div class="tn-note tn-warn"><b>Una unión real no es perfectamente articulada ni perfectamente rígida.</b> La articulación ideal no transmite momento; el nudo rígido conserva el ángulo entre barras. En el análisis se elige la idealización que represente el detalle constructivo y se revisa su sensibilidad. Un nudo soldado puede modelarse rígido; una conexión con placa y pernos puede requerir rigidez parcial.</div>

<h5>Acciones que entran al modelo</h5>
<p>Las cargas se agrupan en <strong>permanentes</strong> (peso propio, acabados, muros), <strong>variables</strong> (uso, ocupación, granizo), <strong>accidentales</strong> (sismo, viento) y <strong>de construcción</strong> (empuje de encofrados, izaje). La NSR-10 establece combinaciones y factores de mayoración. El análisis elástico lineal es la base; para estados límite últimos se usan combinaciones mayoradas y, cuando corresponde, análisis plástico o no lineal.</p>

<div class="dm-formula">\[
\text{Demanda} \le \text{Capacidad}
\qquad\Longrightarrow\qquad
\phi R_n \ge \sum \gamma_i Q_i
\]</div>

<p>El objetivo del curso es dominar los métodos clásicos de análisis de estructuras determinadas e indeterminadas, no memorizar fórmulas. Antes de calcular, dibuja la estructura, identifica apoyos, nudos y cargas, y pregúntate: <em>¿por dónde quiere ir la carga hasta el suelo?</em></p>
`
            },
            {
                id: 'secciones',
                title: 'Centroides, momento de inercia y módulo de sección',
                html: S`
<p>Una sección transversal se caracteriza por su área \(A\), la posición de su centroide \((\bar x,\bar y)\) y sus momentos de inercia \(I_x\), \(I_y\). Estos valores controlan la respuesta a flexión, cortante, axial y torsión. En una sección compuesta se divide en figuras simples y se aplica el <strong>teorema de los ejes paralelos</strong>.</p>

<div class="dm-formula">\[
A=\sum A_i,\qquad
\bar x=\frac{\sum A_i x_i}{\sum A_i},\qquad
\bar y=\frac{\sum A_i y_i}{\sum A_i}
\]</div>

<div class="dm-formula">\[
I_x=\sum\left(\frac{b_i h_i^3}{12}+A_i\,d_{yi}^2\right),
\qquad
I_y=\sum\left(\frac{h_i b_i^3}{12}+A_i\,d_{xi}^2\right)
\]</div>

<p>donde \(d_{xi}=x_i-\bar x\) y \(d_{yi}=y_i-\bar y\). El <strong>módulo de sección</strong> relaciona el momento con el esfuerzo normal extremo:</p>

<div class="dm-formula">\[
S_{sup}=\frac{I_x}{c_{sup}},\qquad
S_{inf}=\frac{I_x}{c_{inf}},\qquad
\sigma=\frac{M}{S}
\]</div>

<h5>Ejemplo: sección T</h5>
<p>Ala de \(200\times50\) mm con su base en \(y=200\) mm y alma de \(50\times200\) mm desde \(y=0\). Áreas: \(10\,000\) mm² cada una. Centroide:</p>
<div class="dm-formula">\[
\bar y=\frac{10\,000(225)+10\,000(100)}{20\,000}=162.5\ \text{mm}
\]</div>
<p>Inercia respecto al eje centroidal horizontal:</p>
<div class="dm-formula">\[
I_x=\left[\frac{200(50)^3}{12}+10\,000(62.5)^2\right]
+\left[\frac{50(200)^3}{12}+10\,000(-62.5)^2\right]
\approx 1.198\times10^8\ \text{mm}^4
\]</div>
<p>El módulo de sección superior e inferior se obtiene con las distancias \(c_{sup}=87.5\) mm y \(c_{inf}=162.5\) mm. La fibra más alejada del eje neutro alcanza primero el esfuerzo límite. La práctica <em>Centroides y momento de inercia</em> permite cambiar las dimensiones y ver el efecto en \(I_x\), \(S_x\) y los radios de giro.</p>

<div class="tn-note tn-norm"><b>Unidades.</b> En secciones es común trabajar en mm y mm⁴; en cálculo estructural, en m y m⁴. Un error de unidades en la inercia se amplifica al cubo o a la cuarta potencia. Verifica siempre: \(1\ \text{cm}^4=10^4\ \text{mm}^4\), \(1\ \text{m}^4=10^{12}\ \text{mm}^4\).</div>
`
            },
            {
                id: 'indeterminacion',
                title: 'Estabilidad, grado de indeterminación y grados de libertad',
                html: S`
<p>Antes de resolver, hay que saber si la estructura puede permanecer en equilibrio y cuántas incógnitas adicionales aparecen. El <strong>grado de indeterminación estático</strong> \(DSI\) cuenta las redundantes; el <strong>grado de indeterminación cinemático</strong> \(D_k\) cuenta los desplazamientos independientes que hay que resolver en el método de rigidez.</p>

<h5>Estabilidad externa</h5>
<p>En el plano se necesitan al menos tres reacciones no concurrentes ni paralelas para equilibrar tres ecuaciones globales \((\sum F_x,\sum F_y,\sum M)\). Si \(r<3\), la estructura es un mecanismo. Si \(r\ge3\) pero las reacciones son concurrentes o paralelas, puede ser inestable aunque la cuenta de reacciones parezca suficiente. La geometría importa.</p>

<h5>Estructuras de barras y pórticos planos</h5>
<div class="dm-formula">\[
DSI=3m+r-3j
\qquad\qquad
D_k=3j-r-m
\]</div>
<p>\(m\) es el número de miembros, \(r\) el número de reacciones independientes y \(j\) el número de nudos. La expresión de \(D_k\) supone que las barras son axialmente rígidas: cada miembro elimina una traslación relativa axial. Si se incluyen las deformaciones axiales, \(D_k=3j-r\).</p>

<h5>Cerchas planas</h5>
<div class="dm-formula">\[
DSI=m+r-2j
\qquad\qquad
D_k=2j-r-m
\]</div>
<p>En una cercha ideal las uniones son articulaciones y las cargas actúan en los nudos. Para una cercha isostática, \(m=2j-3\) con \(r=3\).</p>

<div class="tn-grid">
    <div class="tn-mini"><b>\(DSI<0\)</b><p>Faltan barras o apoyos: mecanismo. La estructura no puede equilibrar cargas generales.</p></div>
    <div class="tn-mini"><b>\(DSI=0\)</b><p>Isostática. Las ecuaciones de equilibrio bastan para hallar todas las fuerzas; los desplazamientos se calculan con energía o rigidez.</p></div>
    <div class="tn-mini"><b>\(DSI>0\)</b><p>Hiperestática. Hay \(DSI\) redundantes; se necesitan ecuaciones de compatibilidad (flexibilidad, rigidez o métodos aproximados).</p></div>
    <div class="tn-mini"><b>\(D_k\)</b><p>Número de incógnitas de desplazamiento. Un pórtico de un piso y una luz con bases empotradas suele tener 3: giro y desplazamiento horizontal de los dos nudos superiores, menos la compatibilidad axial.</p></div>
</div>

<h5>Ejemplo: pórtico de una luz y un piso</h5>
<p>Dos columnas y una viga (\(m=3\)), cuatro nudos (\(j=4\)). Bases empotradas: \(r=6\). Entonces \(DSI=9+6-12=3\). Si las bases son articuladas, \(r=4\) y \(DSI=1\). El pórtico empotrado tiene tres redundantes: por ejemplo, los momentos en las bases; el articulado tiene una. La práctica <em>Estabilidad y DSI</em> permite cambiar el tipo de estructura y comparar ambos índices.</p>

<div class="tn-note tn-warn"><b>Contar no es suficiente.</b> Una cercha puede cumplir \(m=2j-3\) y aun así ser un mecanismo si sus barras forman un paralelogramo o si todas concurren en un punto. La condición \(DSI\ge0\) es necesaria, no suficiente: hay que revisar la geometría y la formación de triángulos estables.</div>
`
            },
            {
                id: 'estatica',
                title: 'Repaso de estática: reacciones, cortante y momento',
                html: S`
<p>El análisis comienza por el diagrama de cuerpo libre. Se reemplazan los apoyos por sus reacciones, se dibujan todas las cargas y se aplican las tres ecuaciones de equilibrio global. Para una viga horizontal con cargas verticales:</p>

<div class="dm-formula">\[
\sum F_x=0,\qquad
\sum F_y=0,\qquad
\sum M_A=0
\]</div>

<p>Las reacciones se obtienen resolviendo el sistema. Luego se corta la estructura en una sección \(x\) y se plantea el equilibrio del segmento izquierdo. El <strong>cortante</strong> \(V(x)\) es la suma de fuerzas verticales a un lado de la sección; el <strong>momento</strong> \(M(x)\) es la suma de momentos de esas fuerzas respecto a la sección.</p>

<div class="dm-formula">\[
V(x)=\sum F_y^{\,izq},\qquad
M(x)=\sum M^{\,izq}_{\,x}
\]</div>

<h5>Convención de signos</h5>
<ul>
    <li><strong>Cortante positivo:</strong> la fuerza a la izquierda de la sección apunta hacia arriba; a la derecha, hacia abajo.</li>
    <li><strong>Momento positivo (sagging):</strong> produce tracción en la fibra inferior y compresión en la superior. La viga se flexiona con la concavidad hacia arriba.</li>
    <li><strong>Carga distribuida positiva:</strong> actúa hacia abajo. \(dV/dx=-w\) y \(dM/dx=V\).</li>
    <li><strong>Carga puntual:</strong> produce un salto en el diagrama de cortante y un cambio de pendiente en el de momento.</li>
</ul>

<div class="dm-formula">\[
\frac{dV}{dx}=-w(x),\qquad
\frac{dM}{dx}=V(x),\qquad
\frac{d^2M}{dx^2}=-w(x)
\]</div>

<h5>Relaciones útiles para dibujar diagramas</h5>
<div class="tn-grid">
    <div class="tn-mini"><b>Sin carga</b><p>\(V\) constante, \(M\) lineal. La pendiente del momento es el cortante.</p></div>
    <div class="tn-mini"><b>Carga uniforme</b><p>\(V\) lineal, \(M\) parabólico. El máximo de \(M\) ocurre donde \(V=0\).</p></div>
    <div class="tn-mini"><b>Carga puntual</b><p>\(V\) salta en \(P\); \(M\) tiene un quiebre, no un salto (salvo momento aplicado).</p></div>
    <div class="tn-mini"><b>Momento aplicado</b><p>\(M\) salta; \(V\) no cambia. El salto es igual al momento externo.</p></div>
</div>

<p>Para una viga simplemente apoyada con carga puntual \(P\) a una distancia \(a\) del apoyo izquierdo y carga uniforme \(w\):</p>

<div class="dm-formula">\[
R_A=\frac{P(L-a)}{L}+\frac{wL}{2},
\qquad
R_B=\frac{Pa}{L}+\frac{wL}{2}
\]</div>

<div class="dm-formula">\[
M(x)=R_Ax-\frac{wx^2}{2}-P\langle x-a\rangle^1
\]</div>

<p>Los corchetes de Macaulay \(\langle x-a\rangle^n\) valen cero para \(x<a\) y \((x-a)^n\) para \(x\ge a\). Son una forma compacta de escribir la ecuación sin dividir el cálculo en tramos.</p>

<div class="tn-note tn-norm"><b>Comprobación.</b> Al terminar, verifica equilibrio global, continuidad de \(M\), condiciones de borde y que \(V=0\) donde \(M\) es máximo. Un diagrama que no cierra en cero en los apoyos simples es señal de un error de signo o de una carga olvidada.</div>
`
            },
            {
                id: 'energia',
                title: 'Métodos energéticos: trabajo virtual y Castigliano',
                html: S`
<p>La energía de deformación permite calcular desplazamientos sin integrar directamente la ecuación diferencial de la elástica. Es especialmente útil en vigas y pórticos con muchos tramos y en cerchas. La hipótesis básica es un material elástico lineal y pequeñas deformaciones.</p>

<h5>Energía de deformación por tipo de solicitación</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Solicitación</th><th>Energía \(U\)</th><th>Comentario</th></tr></thead>
<tbody>
<tr><td>Axial</td><td>\(\displaystyle U=\int \frac{N^2}{2EA}\,dx\)</td><td>Barras de cercha y columnas</td></tr>
<tr><td>Flexión</td><td>\(\displaystyle U=\int \frac{M^2}{2EI}\,dx\)</td><td>Contribución dominante en vigas esbeltas</td></tr>
<tr><td>Cortante</td><td>\(\displaystyle U=\int \frac{V^2}{2GA}\kappa\,dx\)</td><td>Importante en vigas cortas o de gran peralte</td></tr>
<tr><td>Torsión</td><td>\(\displaystyle U=\int \frac{T^2}{2GJ}\,dx\)</td><td>Ejes y elementos sometidos a giro</td></tr>
<tr><td>Temperatura</td><td>\(\displaystyle U=\int \frac{EA\alpha^2\Delta T^2}{2}\,dx\)</td><td>Si la dilatación está restringida</td></tr>
</tbody></table></div>

<p>La energía total es la suma de contribuciones. En vigas esbeltas de concreto o acero, la flexión suele gobernar y el cortante se desprecia en una primera aproximación; en elementos profundos o de madera, el cortante puede ser relevante.</p>

<h5>Trabajo virtual</h5>
<p>Para hallar el desplazamiento \(\Delta\) en un punto y dirección, se aplica una carga unitaria virtual en ese punto y dirección, se calculan las fuerzas internas virtuales \((\delta N,\delta M,\delta V,\delta T)\) y se integra el producto con las fuerzas reales:</p>

<div class="dm-formula">\[
1\cdot\Delta=\int \frac{N\,\delta N}{EA}\,dx
+\int \frac{M\,\delta M}{EI}\,dx
+\int \frac{V\,\delta V}{GA}\kappa\,dx
+\int \frac{T\,\delta T}{GJ}\,dx
\]</div>

<p>En cerchas, la integral se reduce a una suma sobre las barras:</p>

<div class="dm-formula">\[
\Delta=\sum_i \frac{F_i\,f_i\,L_i}{E_iA_i}
\]</div>

<p>donde \(F_i\) es la fuerza real y \(f_i\) la fuerza virtual producida por la carga unitaria. Si el resultado es positivo, el desplazamiento tiene el mismo sentido que la carga virtual.</p>

<h5>Teoremas de Castigliano</h5>
<p>Si la energía de deformación se expresa en función de las cargas \(P_i\), la derivada parcial respecto a una carga da el desplazamiento en su punto y dirección:</p>

<div class="dm-formula">\[
\Delta_i=\frac{\partial U}{\partial P_i}
\]</div>

<p>Para una viga con flexión dominante, \(U=\int M^2/(2EI)\,dx\), por lo que:</p>

<div class="dm-formula">\[
\Delta=\int \frac{M}{EI}\frac{\partial M}{\partial P}\,dx
\]</div>

<p>Este resultado es equivalente al trabajo virtual: \(\partial M/\partial P\) es el momento producido por una carga unitaria. Para rotaciones, se deriva respecto a un momento aplicado.</p>

<h5>Teorema de las deformaciones recíprocas (Maxwell–Betti)</h5>
<p>El desplazamiento en \(i\) producido por una carga unitaria en \(j\) es igual al desplazamiento en \(j\) producido por una carga unitaria en \(i\):</p>

<div class="dm-formula">\[
\delta_{ij}=\delta_{ji}
\]</div>

<p>Esta simetría es la base de la matriz de flexibilidad y de la matriz de rigidez. También permite construir líneas de influencia y verificar resultados numéricos.</p>

<div class="tn-note tn-ok"><b>Ejemplo de viga simplemente apoyada.</b> Para una carga \(P\) en el centro, \(M(x)=Px/2\) en \(0\le x\le L/2\). Con una carga unitaria en el centro, \(m(x)=x/2\). Entonces
\[
\delta=\int_0^{L/2}\frac{(Px/2)(x/2)}{EI}dx\times2
=\frac{PL^3}{48EI}.
\]
El mismo resultado se obtiene con Castigliano o con la elástica. La práctica <em>Viga simplemente apoyada</em> compara las tres vías y muestra la deflexión en tiempo real.</div>
`
            },
            {
                id: 'rigidez',
                title: 'Método directo de rigidez: del resorte al pórtico',
                html: S`
<p>El método de rigidez ensambla la relación fuerza–desplazamiento de cada elemento en una matriz global. Es la base de los programas de análisis estructural. La ecuación maestra es:</p>

<div class="dm-formula">\[
\mathbf{K}\,\mathbf{D}=\mathbf{F}
\]</div>

<p>\(\mathbf{K}\) es la matriz de rigidez global, \(\mathbf{D}\) el vector de desplazamientos nodales y \(\mathbf{F}\) el vector de cargas nodales. Se imponen las condiciones de borde, se resuelve el sistema y se recuperan las fuerzas internas de cada elemento.</p>

<h5>Resorte axial</h5>
<p>Un resorte de rigidez \(k\) que une dos nudos tiene la matriz local:</p>
<div class="dm-formula">\[
\begin{bmatrix}F_1\\F_2\end{bmatrix}
=
\begin{bmatrix}k&-k\\-k&k\end{bmatrix}
\begin{bmatrix}u_1\\u_2\end{bmatrix}
\]</div>

<h5>Elemento de cercha plana</h5>
<p>Con ángulo \(\theta\) respecto al eje global \(x\), \(c=\cos\theta\), \(s=\sin\theta\):</p>
<div class="dm-formula">\[
\mathbf{k}=\frac{EA}{L}
\begin{bmatrix}
c^2&cs&-c^2&-cs\\
cs&s^2&-cs&-s^2\\
-c^2&-cs&c^2&cs\\
-cs&-s^2&cs&s^2
\end{bmatrix}
\]</div>

<p>La matriz de transformación \(\mathbf{T}\) rota los desplazamientos globales a locales: \(\mathbf{d}=\mathbf{T}\mathbf{D}\). La rigidez global del elemento es \(\mathbf{K}_e=\mathbf{T}^{\mathsf T}\mathbf{k}\,\mathbf{T}\).</p>

<h5>Elemento prismático de pórtico plano</h5>
<p>Con tres grados de libertad por nudo \((u,v,\theta)\), la matriz local de un elemento de longitud \(L\), área \(A\) e inercia \(I\) es:</p>
<div class="dm-formula">\[
\mathbf{k}=
\begin{bmatrix}
\frac{EA}{L}&0&0&-\frac{EA}{L}&0&0\\
0&\frac{12EI}{L^3}&\frac{6EI}{L^2}&0&-\frac{12EI}{L^3}&\frac{6EI}{L^2}\\
0&\frac{6EI}{L^2}&\frac{4EI}{L}&0&-\frac{6EI}{L^2}&\frac{2EI}{L}\\
-\frac{EA}{L}&0&0&\frac{EA}{L}&0&0\\
0&-\frac{12EI}{L^3}&-\frac{6EI}{L^2}&0&\frac{12EI}{L^3}&-\frac{6EI}{L^2}\\
0&\frac{6EI}{L^2}&\frac{2EI}{L}&0&-\frac{6EI}{L^2}&\frac{4EI}{L}
\end{bmatrix}
\]</div>

<p>Los términos de flexión suponen secciones planas, material elástico lineal, pequeñas deformaciones y ausencia de fuerza axial en el comportamiento flexional. La matriz es simétrica y semidefinida positiva; las condiciones de borde eliminan los modos de cuerpo rígido.</p>

<h5>Pasos del método directo de rigidez</h5>
<ol>
    <li><strong>Numerar nudos y grados de libertad.</strong> Decide si incluyes deformación axial.</li>
    <li><strong>Calcular la matriz local</strong> de cada elemento y su matriz de transformación.</li>
    <li><strong>Ensamblar \(\mathbf{K}\)</strong> sumando las contribuciones en los grados de libertad globales.</li>
    <li><strong>Aplicar condiciones de borde</strong> y cargas nodales equivalentes.</li>
    <li><strong>Resolver \(\mathbf{K}\mathbf{D}=\mathbf{F}\)</strong> y recuperar fuerzas internas \(\mathbf{f}=\mathbf{k}\mathbf{T}\mathbf{D}\).</li>
    <li><strong>Verificar equilibrio</strong> y comparar con métodos energéticos o aproximados.</li>
</ol>

<div class="tn-note tn-warn"><b>Errores frecuentes.</b> Unidades inconsistentes entre \(E\), \(A\), \(I\) y \(L\); olvidar la transformación de coordenadas; ensamblar dos veces un término; no restringir un grado de libertad y obtener una matriz singular; confundir fuerzas nodales con fuerzas internas. La práctica <em>Matriz de rigidez</em> muestra la matriz local y global de un elemento inclinado con las unidades controladas.</div>
`
            },
            {
                id: 'vigas',
                title: 'Deflexiones en vigas: elástica, superposición y fórmulas',
                html: S`
<p>La deflexión de una viga se obtiene integrando la ecuación de la elástica o usando energía. Para una viga prismática con flexión dominante:</p>

<div class="dm-formula">\[
EI\frac{d^2v}{dx^2}=M(x)
\]</div>

<p>Las constantes de integración se determinan con las condiciones de borde: en un apoyo simple, \(v=0\); en un empotramiento, \(v=0\) y \(dv/dx=0\). El giro es \(\theta=dv/dx\) y la curvatura \(\kappa\approx d^2v/dx^2\).</p>

<h5>Fórmulas de referencia</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Caso</th><th>Flecha máxima</th><th>Ubicación</th></tr></thead>
<tbody>
<tr><td>Simple, carga \(P\) al centro</td><td>\(\displaystyle \frac{PL^3}{48EI}\)</td><td>Centro</td></tr>
<tr><td>Simple, carga \(P\) en \(a\)</td><td>\(\displaystyle \frac{Pa(L^2-a^2)^{3/2}}{9\sqrt3\,LEI}\) si \(a<L/2\)</td><td>Bajo la carga si \(a=L/2\)</td></tr>
<tr><td>Simple, carga uniforme \(w\)</td><td>\(\displaystyle \frac{5wL^4}{384EI}\)</td><td>Centro</td></tr>
<tr><td>Voladizo, carga \(P\) en punta</td><td>\(\displaystyle \frac{PL^3}{3EI}\)</td><td>Punta</td></tr>
<tr><td>Voladizo, carga uniforme \(w\)</td><td>\(\displaystyle \frac{wL^4}{8EI}\)</td><td>Punta</td></tr>
</tbody></table></div>

<p>Las fórmulas anteriores suponen material elástico lineal, sección constante y pequeñas deformaciones. La superposición es válida si el comportamiento es lineal: se suman los efectos de cada carga por separado.</p>

<h5>Ejemplo numérico</h5>
<p>Viga de \(L=6\) m, \(b=250\) mm, \(h=500\) mm, \(E=25\) GPa, carga \(P=20\) kN al centro y \(w=10\) kN/m. La inercia es \(I=bh^3/12=2.604\times10^{-3}\ \text{m}^4\) y \(EI=65\,104\ \text{kN·m}^2\).</p>
<div class="dm-formula">\[
\delta_P=\frac{20(6)^3}{48(65\,104)}=1.38\ \text{mm},
\qquad
\delta_w=\frac{5(10)(6)^4}{384(65\,104)}=2.59\ \text{mm}
\]</div>
<p>La flecha total es \(3.97\) mm. El momento máximo por la carga puntual es \(PL/4=30\) kN·m; por la carga distribuida, \(wL^2/8=45\) kN·m. El momento total en el centro es \(75\) kN·m y el esfuerzo normal máximo es \(\sigma=Mc/I\approx7.2\) MPa, todavía dentro del rango elástico del concreto para ese nivel de carga.</p>

<div class="tn-note tn-norm"><b>Criterios de servicio.</b> La NSR-10 y las buenas prácticas limitan la flecha según el elemento y el tipo de carga (por ejemplo, \(L/240\) o \(L/360\) para vigas de entrepiso, y valores más estrictos para cubiertas o muros). La flecha calculada debe compararse con la flecha admisible del proyecto, no solo con la resistencia.</div>
`
            },
            {
                id: 'cerchas',
                title: 'Análisis de cerchas: nudos, secciones y barras de fuerza cero',
                html: S`
<p>Una cercha ideal es un conjunto de barras rectas unidas por articulaciones sin fricción, cargadas solo en los nudos. Bajo estas hipótesis, cada barra trabaja a fuerza axial: tracción o compresión. Las cargas se transmiten hasta los apoyos formando triángulos estables.</p>

<h5>Método de los nudos</h5>
<p>Se aísla cada nudo y se plantean \(\sum F_x=0\), \(\sum F_y=0\). Como las fuerzas son concurrentes, no aparecen ecuaciones de momento. Se empieza por un nudo con dos incógnitas como máximo y se avanza por la cercha.</p>

<div class="dm-formula">\[
\sum F_x=0,\qquad \sum F_y=0
\quad\text{en cada nudo}
\]</div>

<p>Se supone tracción en todas las barras. Un resultado positivo indica tracción; uno negativo, compresión. La fuerza se dibuja saliendo del nudo si es tracción y entrando si es compresión.</p>

<h5>Método de las secciones</h5>
<p>Se corta la cercha en tres barras como máximo y se plantea equilibrio del segmento. Es útil para hallar una barra específica sin resolver toda la cercha. Las tres ecuaciones disponibles son \(\sum F_x=0\), \(\sum F_y=0\) y \(\sum M=0\).</p>

<h5>Barras de fuerza cero</h5>
<ul>
    <li>Nudo de dos barras no colineales sin carga externa: ambas fuerzas son cero.</li>
    <li>Nudo de tres barras, dos colineales y sin carga externa: la tercera barra tiene fuerza cero.</li>
    <li>Nudo de dos barras colineales con carga en la dirección de ellas: las fuerzas son iguales y opuestas; no necesariamente cero.</li>
</ul>
<p>Identificar estas barras simplifica el cálculo, pero no significa que puedan eliminarse sin revisar la estabilidad y la esbeltez. Una barra de fuerza cero puede ser necesaria para arriostrar y evitar el pandeo de otras.</p>

<h5>Desplazamiento por trabajo virtual</h5>
<p>Para una cercha, la suma \(\sum F_i f_i L_i/(EA)\) da el desplazamiento en la dirección de la carga virtual. La práctica <em>Cercha por nudos</em> resuelve una cercha Pratt de cuatro paneles, colorea las barras según tracción o compresión y calcula la flecha vertical del nudo cargado. El simulador permite mover la carga y observar cómo cambian las fuerzas.</p>

<div class="tn-note tn-warn"><b>Estabilidad.</b> Una cercha puede ser isostática y aun así inestable si su geometría forma un mecanismo. Verifica que cada panel esté triangulado y que las barras no sean concurrentes en un nudo. La fórmula \(m+r=2j\) es una condición necesaria, no suficiente.</div>
`
            },
            {
                id: 'porticos',
                title: 'Pórticos: flexión, desplazamiento lateral y métodos aproximados',
                html: S`
<p>Un pórtico es un sistema de vigas y columnas unidas rígidamente. A diferencia de una cercha, desarrolla momentos y cortantes; su rigidez depende de la inercia de cada elemento y de la rigidez de las uniones. Bajo cargas verticales, la viga flexiona y las columnas trabajan a axial y flexión. Bajo cargas horizontales, el pórtico se desplaza lateralmente y las columnas resisten el cortante.</p>

<h5>Método de pendiente-deflexión</h5>
<p>Relaciona los momentos en los extremos de una barra con los giros y el desplazamiento relativo. Para una barra \(AB\) de rigidez \(EI\) y longitud \(L\), sin cargas intermedias:</p>

<div class="dm-formula">\[
M_{AB}=\frac{2EI}{L}\left(2\theta_A+\theta_B-3\psi\right)+M_{AB}^{F}
\]</div>

<div class="dm-formula">\[
M_{BA}=\frac{2EI}{L}\left(2\theta_B+\theta_A-3\psi\right)+M_{BA}^{F}
\]</div>

<p>\(\psi=\Delta/L\) es el giro por desplazamiento relativo; \(M^{F}\) son los momentos de empotramiento perfecto por las cargas. Se plantean equilibrio de momentos en los nudos y equilibrio global de fuerzas para resolver giros y desplazamientos.</p>

<h5>Método del portal para cargas horizontales</h5>
<p>Es un método aproximado para pórticos de varios pisos. Supone que los puntos de inflexión (momento cero) están a media altura de las columnas y a media luz de las vigas. Para un piso con cortante total \(V\), las columnas exteriores toman \(V/4\) y las interiores \(V/2\) en cada dirección; en un pórtico de una luz, cada columna toma \(V/2\).</p>

<div class="dm-formula">\[
V_{col}=\frac{V}{2}\quad\text{(una luz)},\qquad
M_{col}=\frac{V_{col}h}{2},\qquad
M_{viga}=2M_{col}
\]</div>

<p>El momento en la viga es la suma de los momentos de las columnas que concurren al nudo. La fuerza axial en vigas y columnas se obtiene por equilibrio global de vuelco: el momento volcante \(Vh\) se equilibra con un par de fuerzas axiales separadas por la luz.</p>

<h5>Método simplificado para cargas verticales</h5>
<p>Para pórticos regulares con cargas distribuidas, se puede aproximar el momento en el centro de la viga como \(wL^2/8\) y repartir los momentos negativos en los extremos según la rigidez relativa de vigas y columnas. Es una herramienta de prediseño: sirve para dimensionar, no para reemplazar el análisis final.</p>

<div class="tn-note tn-norm"><b>Deriva.</b> La NSR-10 limita el desplazamiento lateral relativo de entrepiso (deriva) para proteger elementos no estructurales y evitar el efecto \(P-\Delta\). Un pórtico puede resistir por resistencia y fallar por servicio si su rigidez lateral es insuficiente. El simulador <em>Pórtico</em> muestra el desplazamiento lateral y los momentos del método del portal.</div>
`
            },
            {
                id: 'aproximados',
                title: 'Métodos aproximados y criterio de ingeniería',
                html: S`
<p>Los métodos aproximados no reemplazan el análisis matricial, pero son valiosos para predimensionar, verificar órdenes de magnitud y entender el comportamiento. Se basan en hipótesis de deformación y en la regularidad de la estructura. Si la geometría es muy irregular, las hipótesis dejan de ser válidas.</p>

<h5>Pendiente-deflexión en una viga continua</h5>
<p>Para dos luces \(L_1\) y \(L_2\) con cargas uniformes \(w_1\) y \(w_2\), la ecuación de los tres momentos con apoyos simples en los extremos da:</p>

<div class="dm-formula">\[
M_B=-\frac{w_1L_1^3+w_2L_2^3}{8(L_1+L_2)}
\]</div>

<p>Las reacciones se obtienen por equilibrio de cada tramo. Para el tramo \(A-B\):</p>

<div class="dm-formula">\[
R_A=\frac{w_1L_1}{2}+\frac{M_B}{L_1},
\qquad
R_{B1}=w_1L_1-R_A
\]</div>

<p>El momento negativo en el apoyo interior reduce la flecha en el centro de cada tramo, pero aumenta la reacción en el apoyo central. Este es el efecto de continuidad que distingue una viga continua de dos vigas simplemente apoyadas.</p>

<h5>Portal con varias luces y pisos</h5>
<p>El método del portal reparte el cortante de piso entre las columnas: las exteriores toman una fracción menor que las interiores. Para un piso con \(n\) luces, el cortante total \(V\) se distribuye de modo que cada columna interior recibe el doble que una exterior. Los momentos se obtienen multiplicando el cortante de la columna por la mitad de la altura libre. Las vigas toman la suma de momentos de las columnas del nudo.</p>

<h5>Cuándo usar cada método</h5>
<div class="tn-grid">
    <div class="tn-mini"><b>Prediseño</b><p>Métodos aproximados y fórmulas de vigas. Rápido, útil para dimensionar y detectar errores gruesos.</p></div>
    <div class="tn-mini"><b>Estructuras regulares</b><p>Pendiente-deflexión, portal y tres momentos. Buenas aproximaciones si la geometría y las cargas son uniformes.</p></div>
    <div class="tn-mini"><b>Estructuras irregulares</b><p>Método de rigidez o flexibilidad, con modelo computacional y revisión de resultados.</p></div>
    <div class="tn-mini"><b>Verificación</b><p>Compara equilibrio, órdenes de magnitud, simetría y casos límite. Un resultado que no cumple equilibrio no es confiable aunque provenga de un programa.</p></div>
</div>

<div class="tn-note tn-warn"><b>No confundas aproximación con arbitrariedad.</b> Cada método aproximado tiene hipótesis explícitas. Si la estructura no las cumple, el error puede ser grande. Documenta el método, las hipótesis y la comparación con un análisis más refinado.</div>
`
            },
            {
                id: 'unidades',
                title: 'Unidades, órdenes de magnitud y comprobaciones',
                html: S`
<p>La mayoría de los errores en análisis estructural son de unidades o de signo. Trabaja con un sistema coherente y escribe las unidades en cada paso. En esta aplicación se usan:</p>

<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Magnitud</th><th>Unidad</th><th>Equivalencia</th></tr></thead>
<tbody>
<tr><td>Longitud</td><td>m</td><td>\(1\ \text{m}=1000\ \text{mm}\)</td></tr>
<tr><td>Fuerza</td><td>kN</td><td>\(1\ \text{kN}=1000\ \text{N}\)</td></tr>
<tr><td>Momento</td><td>kN·m</td><td>\(1\ \text{kN·m}=10^6\ \text{N·mm}\)</td></tr>
<tr><td>Esfuerzo</td><td>MPa = N/mm²</td><td>\(1\ \text{MPa}=10^3\ \text{kN/m}^2\)</td></tr>
<tr><td>Módulo \(E\)</td><td>GPa</td><td>\(1\ \text{GPa}=10^6\ \text{kN/m}^2\)</td></tr>
<tr><td>Inercia</td><td>m⁴</td><td>\(1\ \text{m}^4=10^{12}\ \text{mm}^4\)</td></tr>
</tbody></table></div>

<p>Algunas comprobaciones rápidas: una viga de concreto de 6 m con \(250\times500\) mm y cargas de servicio del orden de 20 kN debe flechar unos pocos milímetros, no metros; un pórtico de un piso con carga lateral de 30 kN debe desplazarse algunos milímetros, no centímetros; una cercha de 12 m con barras de 2000 mm² y 40 kN debe tener fuerzas del orden de decenas de kN, no miles.</p>

<div class="dm-formula">\[
\delta \sim \frac{PL^3}{EI},\qquad
\sigma \sim \frac{M}{S},\qquad
\Delta \sim \frac{Vh^3}{EI}
\]</div>

<p>Si un resultado difiere en un factor \(10^3\), \(10^6\) o \(10^{12}\), revisa la conversión de mm a m o de mm⁴ a m⁴ antes de dudar del método. La aplicación muestra las unidades en cada tarjeta para facilitar esa revisión.</p>

<div class="tn-note tn-ok"><b>Rutina de verificación.</b> 1) Equilibrio global. 2) Condiciones de borde. 3) Continuidad de momentos. 4) Signo y orden de magnitud. 5) Comparación con una fórmula conocida o con un caso límite. 6) Revisión de la norma y del detalle constructivo.</div>
`
            }
        ],
        bib: [
            'Hibbeler, R. C. <em>Análisis estructural</em>, 8.ª ed. Pearson, 2012.',
            'McCormac, J. C. y Elling, R. E. <em>Análisis de estructuras: métodos clásico y matricial</em>, 4.ª ed. Alfaomega, 2013.',
            'Uribe Escamilla, J. <em>Análisis de estructuras</em>. Ediciones Uniandes, 1992.',
            'Timoshenko, S. P. y Young, D. H. <em>Theory of Structures</em>, 2.ª ed. McGraw-Hill, 1965.',
            'Wang, C. K. <em>Statically Indeterminate Structures</em>. McGraw-Hill, 1953.',
            'Norris, C. H. y Wilbur, J. B. <em>Elementary Structural Analysis</em>. McGraw-Hill, 1960.',
            'Reglamento Colombiano de Construcción Sismo Resistente <em>NSR-10</em>, Títulos A, B y C.',
            'Normas Técnicas Colombianas NTC aplicables a materiales y ensayos citadas en cada práctica.'
        ]
    };
})(typeof window !== 'undefined' ? window : globalThis);
