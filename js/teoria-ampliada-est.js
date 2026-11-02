/* GeoMetrics — Teoría ampliada · Estructuras I */
(function (global) {
    'use strict';
    var S = String.raw;

    var sec = [
        {
            id: 'cargas', after: 'analisis',
            title: 'Cargas de diseño y combinaciones (NSR-10 Título B)',
            html: S`
<p>Antes de analizar hay que decidir qué fuerzas actúan. El Título B de la NSR-10 clasifica las cargas y fija las combinaciones con que deben verificarse las estructuras.</p>

<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Símbolo</th><th>Carga</th><th>Ejemplos</th></tr></thead><tbody>
<tr><td>D</td><td>Muerta</td><td>Peso propio, acabados, muros divisorios, equipos fijos</td></tr>
<tr><td>L</td><td>Viva</td><td>Ocupación y mobiliario; valores mínimos de B.4.2</td></tr>
<tr><td>Lr</td><td>Viva de cubierta</td><td>Mantenimiento y personal en cubiertas</td></tr>
<tr><td>G</td><td>Granizo</td><td>Acumulación en cubiertas</td></tr>
<tr><td>W</td><td>Viento</td><td>Presiones y succiones sobre fachada y cubierta</td></tr>
<tr><td>E</td><td>Sismo</td><td>Fuerzas del Título A</td></tr>
<tr><td>H</td><td>Empuje de tierra</td><td>Muros de contención y sótanos</td></tr>
<tr><td>F</td><td>Fluidos</td><td>Presión de líquidos de peso conocido</td></tr>
<tr><td>T</td><td>Efectos acumulados</td><td>Temperatura, retracción, asentamientos diferenciales</td></tr>
</tbody></table></div>

<h5>Cargas vivas mínimas (NSR-10 B.4.2.1-1, valores representativos)</h5>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Ocupación</th><th>Carga viva (kN/m²)</th></tr></thead><tbody>
<tr><td>Vivienda</td><td>1.8</td></tr>
<tr><td>Oficinas</td><td>2.0</td></tr>
<tr><td>Aulas</td><td>2.0</td></tr>
<tr><td>Salas de reunión con asientos fijos / escaleras y vías de evacuación</td><td>3.0</td></tr>
<tr><td>Salones de reunión sin asientos fijos, corredores de uso público, comercio</td><td>5.0 (comercio al detal: 5.0)</td></tr>
</tbody><caption>Los valores definitivos dependen del uso exacto; deben tomarse de la tabla B.4.2.1-1 de la norma. Densidad del concreto reforzado: 24 kN/m³ (2 400 kg/m³).</caption></table></div>

<h5>Combinaciones por el método de resistencia (LRFD), NSR-10 B.2.4</h5>
<div class="dm-formula">\[
\begin{aligned}
&1.4(D+F)\\
&1.2(D+F+T)+1.6(L+H)+0.5(L_r\ \text{o}\ G)\\
&1.2D+1.6(L_r\ \text{o}\ G)+(L\ \text{o}\ 0.8W)\\
&1.2D+1.6W+1.0L+0.5(L_r\ \text{o}\ G)\\
&1.2D+1.0E+1.0L\\
&0.9D+1.6W+1.6H\\
&0.9D+1.0E+1.6H
\end{aligned}
\]</div>
<p>La estructura debe tener una <strong>resistencia de diseño</strong> \(\phi R_n\) mayor o igual que la <strong>resistencia requerida</strong> \(U\) de la combinación más desfavorable: \(\phi R_n\ge U\). El factor \(\phi&lt;1\) cubre la incertidumbre en la resistencia; los factores de carga &gt; 1 cubren la incertidumbre en las solicitaciones. Las combinaciones con \(0.9D\) revisan los casos donde la carga muerta es favorable (volcamiento, levantamiento).</p>
<p>El método de <strong>esfuerzos admisibles (ASD)</strong> usa combinaciones sin mayorar (por ejemplo \(D+L\), \(D+0.7E\), \(D+0.75L+0.75(0.6W)\)) y compara el esfuerzo con un valor admisible = resistencia / factor de seguridad.</p>

<h5>Ancho tributario</h5>
<p>Una losa transmite su carga a las vigas de apoyo según su geometría: en losas armadas en una dirección, a las vigas perpendiculares a la luz corta; en losas armadas en dos direcciones, en forma trapecial y triangular (áreas tributarias a 45°). La carga lineal sobre una viga es \(w=q\times\text{ancho tributario}\).</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: carga mayorada sobre una viga de entrepiso</h5>
    <p>Losa maciza de 0.12 m con acabados de 1.5 kN/m² y uso de oficinas. Viga con ancho tributario de 4 m, peso propio de la viga 3.0 kN/m.</p>
    <div class="dm-formula">\[
q_D=0.12(24)+1.5=4.38\ \text{kN/m}^2,\qquad w_D=4.38(4)+3.0=20.5\ \text{kN/m},\qquad w_L=2.0(4)=8.0\ \text{kN/m}
\]</div>
    <div class="dm-formula">\[
w_u=\max\{1.4(20.5)=28.7,\ 1.2(20.5)+1.6(8.0)=37.4\}=37.4\ \text{kN/m}
\]</div>
    <div class="tn-result">Resultado: <b>w<sub>u</sub> = 37.4 kN/m</b> (rige \(1.2D+1.6L\)). Para una luz simple de 6 m: \(M_u=w_uL^2/8=168\ \text{kN·m}\).</div>
</div>
`
        },
        {
            id: 'lineas-influencia', after: 'estatica',
            title: 'Líneas de influencia y cargas móviles',
            html: S`
<p>Cuando la carga se mueve (puentes, grúas viaje), la posición que produce el efecto máximo no es obvia. La <strong>línea de influencia</strong> de un efecto (reacción, cortante o momento en una sección) es la gráfica de ese efecto en función de la posición de una carga unitaria móvil. Con ella:</p>
<div class="dm-formula">\[
\text{Efecto}=\sum P_i\,y_i\ \ (\text{cargas puntuales}),\qquad
\text{Efecto}=\int w(x)\,y(x)\,dx=w\cdot A\ \ (\text{carga uniforme})
\]</div>
<p>\(y_i\) es la ordenada de la línea de influencia bajo cada carga y \(A\) el área de ella bajo la carga distribuida.</p>

<h5>Principio de Müller-Breslau</h5>
<p>La línea de influencia de un efecto tiene la forma de la deformada que resulta al <em>liberar</em> la restricción correspondiente a ese efecto y aplicar un desplazamiento unitario en esa dirección. Permite dibujarlas cualitativamente sin cálculos y en estructuras indeterminadas es la vía más práctica.</p>

<h5>Vigas simplemente apoyadas, sección en \(x=a\) (con \(b=L-a\))</h5>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Efecto</th><th>Línea de influencia</th><th>Ordenada máxima</th></tr></thead><tbody>
<tr><td>Reacción \(R_A\)</td><td>Recta: \(1\) en A, \(0\) en B</td><td>1</td></tr>
<tr><td>Cortante en la sección</td><td>Dos rectas paralelas con salto de 1: \(-x/L\) a la izquierda y \(+(L-x)/L\) a la derecha</td><td>\(+b/L\) y \(-a/L\)</td></tr>
<tr><td>Momento en la sección</td><td>Triángulo con vértice bajo la sección</td><td>\(ab/L\)</td></tr>
</tbody></table></div>
<p>El momento máximo absoluto de una viga simple bajo un tren de cargas ocurre bajo una de las cargas cuando la <em>mitad de la luz</em> equidista de dicha carga y de la resultante del tren.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: tren de dos cargas</h5>
    <p>Viga simple de \(L=10\ \text{m}\). Cargas de 100 kN y 50 kN separadas 3 m (la de 50 kN viaja detrás de la de 100 kN). Momento máximo en la sección a \(a=4\ \text{m}\) del apoyo izquierdo.</p>
    <div class="dm-formula">\[
y_{max}=\frac{ab}{L}=\frac{4(6)}{10}=2.4\ \text{m}
\]</div>
    <p>Con la carga de 100 kN sobre la sección y la de 50 kN 3 m a la derecha (x = 7 m): la ordenada es \(a(L-x)/L=4(3)/10=1.2\).</p>
    <div class="dm-formula">\[
M=100(2.4)+50(1.2)=300\ \text{kN·m}
\]</div>
    <p>Alternativas: 50 kN sobre la sección y 100 kN a la derecha: \(50(2.4)+100(1.2)=240\); 100 kN sobre la sección y 50 kN 3 m a la izquierda: \(100(2.4)+50(0.6)=270\).</p>
    <div class="tn-result">Resultado: <b>M<sub>max</sub> = 300 kN·m</b>, con la carga mayor sobre la ordenada máxima y la menor del lado de la luz más larga.</div>
</div>
`
        },
        {
            id: 'metodo-fuerzas', after: 'energia',
            title: 'Método de las fuerzas (flexibilidad) para estructuras indeterminadas',
            html: S`
<p>Una estructura de grado de indeterminación \(n\) se vuelve isostática si se eliminan \(n\) reacciones o fuerzas internas (<em>redundantes</em>). Se calculan los desplazamientos en esos puntos con la estructura liberada y se impone la <strong>compatibilidad</strong> (desplazamiento real nulo en el apoyo eliminado).</p>
<div class="dm-formula">\[
\Delta_{10}+f_{11}X_1=0\ \Rightarrow\ X_1=-\frac{\Delta_{10}}{f_{11}}
\]</div>
<p>\(\Delta_{10}\) es el desplazamiento en la dirección de \(X_1\) por las cargas externas en la estructura primaria, y \(f_{11}\) el desplazamiento por una carga unitaria en esa dirección (coeficiente de flexibilidad). Se calculan con trabajo virtual: \(\Delta_{10}=\int M_0m_1/EI\,dx\), \(f_{11}=\int m_1^2/EI\,dx\). Para varias redundantes se plantea el sistema \([f]\{X\}=-\{\Delta_0\}\) (matriz de flexibilidad simétrica por el teorema de Maxwell–Betti).</p>

<h5>Pasos</h5>
<ol>
<li>Determinar el grado de indeterminación y escoger las redundantes (la elección no cambia el resultado).</li>
<li>Resolver la estructura primaria con las cargas externas (momentos \(M_0\)).</li>
<li>Resolver la primaria con cada redundante unitaria (\(m_i\)).</li>
<li>Calcular \(\Delta_{i0}\) y \(f_{ij}\); plantear y resolver la compatibilidad.</li>
<li>Obtener las fuerzas finales por superposición \(M=M_0+\sum X_im_i\).</li>
</ol>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: viga empotrada–apoyada con carga uniforme</h5>
    <p>Viga empotrada en A y con rodillo en B, longitud \(L\) y carga \(w\). Redundante \(X_1=R_B\); primaria: voladizo empotrado en A.</p>
    <div class="dm-formula">\[
\Delta_{10}=\frac{wL^4}{8EI}\ (\text{descenso en B}),\qquad f_{11}=\frac{L^3}{3EI}\ \Rightarrow\ R_B=\frac{wL^4/8}{L^3/3}=\frac{3wL}{8}
\]</div>
    <p>Con \(w=20\ \text{kN/m}\) y \(L=6\ \text{m}\):</p>
    <div class="dm-formula">\[
R_B=45\ \text{kN},\quad R_A=120-45=75\ \text{kN},\quad M_A=\frac{wL^2}{8}=90\ \text{kN·m},\quad M_{max}^{+}=\frac{9wL^2}{128}=50.6\ \text{kN·m}\ (x=3L/8\text{ desde B})
\]</div>
    <div class="tn-result">Resultado: <b>R<sub>B</sub> = 45 kN</b>, <b>M<sub>A</sub> = 90 kN·m</b> (negativo) y <b>M<sup>+</sup> = 50.6 kN·m</b>. El momento en el empotramiento es 1.8 veces el positivo máximo: la rigidez atrae momento.</div>
</div>
<div class="tn-note tn-norm"><b>Asentamientos de apoyo.</b> Si el apoyo eliminado se desplaza \(\delta\), la compatibilidad es \(\Delta_{10}+f_{11}X_1=\delta\). En estructuras indeterminadas los asentamientos diferenciales generan esfuerzos (no así en las isostáticas), un aspecto clave en la interacción suelo–estructura.</div>
`
        },
        {
            id: 'pendiente-deflexion', after: 'rigidez',
            title: 'Método de pendiente–deflexión y distribución de momentos (Cross)',
            html: S`
<p>Son métodos de desplazamientos manuales para vigas continuas y pórticos. Parten de la ecuación de la barra que relaciona los momentos en sus extremos con los giros \(\theta\), el desplazamiento relativo \(\Delta\) (con \(\psi=\Delta/L\)) y las cargas intermedias:</p>
<div class="dm-formula">\[
M_{ij}=\frac{2EI}{L}\left(2\theta_i+\theta_j-3\psi\right)+M^F_{ij}
\]</div>
<p>\(M^F_{ij}\) es el <strong>momento de empotramiento perfecto</strong>. Para carga uniforme \(w\): \(\pm wL^2/12\); para carga puntual central \(P\): \(\pm PL/8\). Si el extremo lejano es articulado, \(M_{ij}=\dfrac{3EI}{L}(\theta_i-\psi)+M^F_{ij}-\tfrac12M^F_{ji}\).</p>

<h5>Distribución de momentos de Cross</h5>
<p>Es la resolución iterativa del sistema anterior:</p>
<ol>
<li>Bloquear todos los nudos y calcular los momentos de empotramiento perfecto.</li>
<li>Liberar un nudo: el momento desequilibrado se reparte entre las barras que concurren según su <strong>factor de distribución</strong> \(DF_i=k_i/\sum k\), con \(k=4EI/L\) (extremo lejano empotrado) o \(3EI/L\) (articulado).</li>
<li>Cada momento distribuido transmite la mitad (factor de transporte 0.5) al extremo opuesto empotrado.</li>
<li>Repetir hasta que los momentos de transporte sean despreciables y sumar.</li>
</ol>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: viga continua de dos tramos iguales</h5>
    <p>Apoyos simples en A, B y C; cada tramo con \(L=6\ \text{m}\) y \(w=20\ \text{kN/m}\). Empotramientos perfectos: \(M^F=\pm20(6)^2/12=\pm60\ \text{kN·m}\).</p>
    <ul>
        <li>En el nudo B los momentos de empotramiento se anulan entre sí (+60 y –60); por simetría el nudo no gira.</li>
        <li>En A (apoyo simple) el momento debe ser cero: se libera el nudo y se distribuye –(–60)=+60, con transporte de 30 hacia B.</li>
        <li>Lo mismo en C: otro +30 en B.</li>
    </ul>
    <div class="dm-formula">\[
|M_B|=60+30=90\ \text{kN·m}=\frac{wL^2}{8}
\]</div>
    <div class="dm-formula">\[
R_A=\frac{wL}{2}-\frac{M_B}{L}=60-15=45\ \text{kN},\qquad R_B=2(60+15)=150\ \text{kN}
\]</div>
    <div class="tn-result">Resultado: <b>M<sub>B</sub> = –90 kN·m</b>, <b>R<sub>A</sub> = R<sub>C</sub> = 45 kN</b>, <b>R<sub>B</sub> = 150 kN</b>. Comprobación: 45 + 150 + 45 = 240 kN = 20 × 12 m ✓. Con la carga alternada por tramos, el momento positivo máximo es mayor: la combinación crítica se obtiene con líneas de influencia.</div>
</div>
<div class="tn-note tn-norm"><b>Vigas continuas.</b> La carga viva debe colocarse en tramos alternos para obtener los momentos positivos máximos, y en los dos tramos adyacentes al apoyo para el momento negativo máximo en ese apoyo (NSR-10 C.8.3).</div>
`
        },
        {
            id: 'arcos-cables', after: 'porticos',
            title: 'Arcos y cables',
            html: S`
<p>Cables y arcos resisten las cargas principalmente por <strong>axial</strong> (tracción o compresión) y no por flexión, lo que permite salvar grandes luces con poco material.</p>

<h5>Cables con carga uniforme horizontal</h5>
<p>Un cable sin rigidez a flexión adopta una forma parabólica bajo carga uniforme por unidad de proyección horizontal. En los apoyos a la misma altura, con flecha \(h\):</p>
<div class="dm-formula">\[
H=\frac{wL^2}{8h},\qquad V=\frac{wL}{2},\qquad T_{max}=\sqrt{H^2+V^2},\qquad
S\approx L\left[1+\frac83\left(\frac hL\right)^2\right]
\]</div>
<p>\(H\) es la componente horizontal (constante a lo largo del cable), \(T_{max}\) ocurre en los apoyos y \(S\) es la longitud aproximada del cable. A menor flecha, mayor tensión: la tensión crece sin límite cuando \(h\to0\).</p>

<h5>Arco triarticulado</h5>
<p>Con una rótula en la clave, el sistema es isostático: se resuelven \(H\) y las reacciones con equilibrio global y con \(\sum M_{clave}=0\) a un lado. En un <strong>arco parabólico bajo carga uniforme</strong> el momento flector es nulo en toda la luz (el arco coincide con la curva funicular): la sección trabaja solo a compresión axial. En otras cargas aparecen momentos que el arco debe resistir si se aparta de la funicular.</p>
<div class="dm-formula">\[
H=\frac{M^{0}_{clave}}{h},\qquad M(x)=M^{0}(x)-H\,y(x),\qquad N=V\sin\theta+H\cos\theta
\]</div>
<p>\(M^0\) es el momento de la viga simple equivalente. La reacción horizontal debe ser tomada por los apoyos o por un tensor (atirantado).</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: arco parabólico triarticulado</h5>
    <p>Luz \(L=20\ \text{m}\), flecha \(h=5\ \text{m}\), carga uniforme \(w=10\ \text{kN/m}\).</p>
    <div class="dm-formula">\[
V_A=V_B=\frac{10(20)}{2}=100\ \text{kN},\qquad
H=\frac{wL^2}{8h}=\frac{10(400)}{8(5)}=100\ \text{kN}
\]</div>
    <p>La pendiente en el apoyo es \(dy/dx=4h/L=1\) (45°):</p>
    <div class="dm-formula">\[
N_{apoyo}=\sqrt{100^2+100^2}=141.4\ \text{kN (compresión)},\qquad M=0\ \text{en toda la luz}
\]</div>
    <p>Si fuera un cable con los mismos datos, tendría \(T_{max}=141.4\ \text{kN}\) y longitud \(S\approx20[1+\tfrac83(0.25)^2]=23.3\ \text{m}\).</p>
    <div class="tn-result">Resultado: <b>H = 100 kN</b>, <b>N<sub>max</sub> = 141 kN</b> y momento nulo: el arco trabaja solo a compresión. Si la flecha se reduce a 2.5 m, \(H\) se duplica a 200 kN: los apoyos deben resistir mucho más empuje.</div>
</div>
`
        },
        {
            id: 'pandeo-segundo', after: 'aproximados',
            title: 'Pandeo y efectos de segundo orden (P–Δ)',
            html: S`
<p>El análisis lineal supone que el equilibrio se plantea sobre la geometría sin deformar. Cuando las cargas axiales son importantes, la deformación lateral genera momentos adicionales (\(P\Delta\)) y la rigidez efectiva disminuye. Los dos fenómenos relacionados son el <strong>pandeo</strong> (inestabilidad) y la <strong>amplificación de momentos</strong>.</p>

<h5>Carga crítica de Euler</h5>
<div class="dm-formula">\[
P_{cr}=\frac{\pi^2EI}{(KL)^2}
\]</div>
<p>\(K\) es el factor de longitud efectiva: 1.0 (articulada–articulada), 0.5 (empotrada–empotrada), 0.7 (empotrada–articulada), 2.0 (empotrada–libre) en el caso teórico; en pórticos reales se toma de nomogramas o análisis de pandeo. Euler es válido en el rango elástico (\(KL/r\) grande); para columnas cortas o intermedias el pandeo inelástico reduce la resistencia (ver Resistencia de Materiales).</p>

<h5>Amplificación de momentos</h5>
<p>Una forma práctica de incluir el efecto \(P\delta\) (en la barra) es amplificar el momento de primer orden:</p>
<div class="dm-formula">\[
M_u=B_1M_{1},\qquad B_1=\frac{C_m}{1-P_u/P_{e1}}\ge1,\qquad P_{e1}=\frac{\pi^2EI}{(K_1L)^2}
\]</div>
<p>\(C_m=0.6-0.4(M_1/M_2)\) para barras sin carga transversal y 1.0 como valor conservador. El efecto \(P\Delta\) del pórtico completo (desplazamiento lateral de los pisos) se amplifica con \(B_2=1/(1-\sum P_u/\sum P_{e2})\). En concreto, NSR-10 C.10.10 trata los efectos de esbeltez con el método de amplificación de momentos o un análisis no lineal de segundo orden.</p>
<p>Un análisis P–Δ riguroso resuelve la estructura de forma iterativa o con una matriz de rigidez geométrica \([K]=[K_E]-[K_G]\); la estabilidad se pierde cuando \(\det[K]=0\).</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: carga crítica y amplificación</h5>
    <p>Columna de acero con \(E=200\ \text{GPa}\) e \(I=25\times10^6\ \text{mm}^4\), \(L=4\ \text{m}\), \(P_u=1\,000\ \text{kN}\).</p>
    <div class="dm-formula">\[
P_{cr}(K=1)=\frac{\pi^2(200\,000)(25\times10^6)}{4000^2}=3\,084\ \text{kN},\qquad
P_{cr}(K=2)=\frac{3\,084}{4}=771\ \text{kN}
\]</div>
    <div class="dm-formula">\[
B_1(K=1,\,C_m=1)=\frac{1}{1-1000/3084}=1.48
\]</div>
    <div class="tn-result">Resultado: articulada en ambos extremos soporta hasta <b>3 084 kN</b>; como voladizo (K = 2) solo <b>771 kN</b> (¡la carga de 1 000 kN lo pandearía!). Con apoyos articulados, el momento de primer orden se debe amplificar <b>48 %</b>.</div>
</div>
`
        },
        {
            id: 'sismo-basico', after: 'pandeo-segundo',
            title: 'Introducción a la dinámica y al espectro de diseño sísmico (NSR-10)',
            html: S`
<p>Las fuerzas sísmicas son inercia: dependen de la masa, la rigidez y la forma en que el suelo excita el edificio. El modelo más simple es un oscilador de un grado de libertad con masa \(m\) y rigidez lateral \(k\):</p>
<div class="dm-formula">\[
\omega=\sqrt{\frac km},\qquad T=\frac{2\pi}{\omega}=2\pi\sqrt{\frac mk}
\]</div>
<p>Un edificio de varios pisos se aproxima con su modo fundamental. El periodo \(T\) controla la aceleración de respuesta \(S_a\) y por tanto la fuerza sísmica.</p>

<h5>Espectro elástico de diseño NSR-10 (A.2.6)</h5>
<div class="dm-formula">\[
\begin{aligned}
T<T_0&:\ S_a=2.5A_aF_aI\left(0.4+0.6\frac{T}{T_0}\right)\\
T_0\le T\le T_C&:\ S_a=2.5A_aF_aI\\
T_C<T\le T_L&:\ S_a=\frac{1.2A_vF_vI}{T}\\
T>T_L&:\ S_a=\frac{1.2A_vF_vT_LI}{T^2}
\end{aligned}
\]</div>
<div class="dm-formula">\[
T_C=0.48\frac{A_vF_v}{A_aF_a},\qquad T_0=0.1\frac{A_vF_v}{A_aF_a},\qquad T_L=2.4F_v
\]</div>
<p>\(A_a\) y \(A_v\) son los coeficientes de aceleración y velocidad pico efectivas de la zona (Apéndice A-4), \(F_a\) y \(F_v\) los coeficientes de sitio según el perfil de suelo (Tablas A.2.4-3 y A.2.4-4) e \(I\) el coeficiente de importancia de la edificación (1.0 grupo I; 1.1 a 1.5 para los grupos más importantes).</p>

<h5>Periodo y cortante basal</h5>
<div class="dm-formula">\[
T_a=C_t\,h^{\alpha}\ \ (\text{pórticos de concreto: }C_t=0.047,\ \alpha=0.90),\qquad
V_s=S_a\,g\,M
\]</div>
<p>El cortante en la base \(V_s\) se distribuye en altura (crece con la altura del piso y la masa) y se divide por el coeficiente de capacidad de disipación de energía \(R=\phi_a\phi_p\phi_rR_0\) para el diseño. La estructura <em>debe</em> tener detalles dúctiles que le permitan incursionar en el rango inelástico: el diseño por resistencia exclusivamente lineal no garantiza el comportamiento esperado.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: cortante basal elástico</h5>
    <p>Edificio de concreto de 8 pisos, \(h=24\ \text{m}\), peso sísmico \(W=24\,000\ \text{kN}\), Bogotá (valores indicativos: \(A_a=0.15\), \(A_v=0.20\)), suelo D (\(F_a=1.5\), \(F_v=2.0\)), grupo I (\(I=1.0\)).</p>
    <div class="dm-formula">\[
T_a=0.047(24)^{0.9}=0.82\ \text{s},\qquad
T_C=0.48\frac{0.20(2.0)}{0.15(1.5)}=0.85\ \text{s}
\]</div>
    <p>Como \(T_0=0.18\ \text{s}\le T_a=0.82\ \text{s}\le T_C\), el edificio está en la meseta del espectro:</p>
    <div class="dm-formula">\[
S_a=2.5(0.15)(1.5)(1.0)=0.5625\,g,\qquad V_s=0.5625(24\,000)=13\,500\ \text{kN}
\]</div>
    <div class="tn-result">Resultado: <b>T<sub>a</sub> = 0.82 s</b>, <b>S<sub>a</sub> = 0.56 g</b> y <b>V<sub>s</sub> ≈ 13 500 kN</b> (fuerza elástica). Con \(R=5\) como valor hipotético, la fuerza de diseño sería ≈ 2 700 kN (11 % del peso). Los valores de \(A_a\), \(A_v\), \(F_a\) y \(F_v\) deben verificarse en las tablas oficiales de la NSR-10 para cada proyecto.</div>
</div>
`
        },
        {
            id: 'mef-intro', after: 'sismo-basico',
            title: 'Introducción al método de los elementos finitos',
            html: S`
<p>El método de la rigidez matricial que se estudia en este curso es la base del método de los elementos finitos (MEF). Se divide la estructura en elementos conectados en nudos; se calculan sus matrices de rigidez, se ensamblan en una matriz global, se imponen las condiciones de apoyo y se resuelve el sistema de ecuaciones:</p>
<div class="dm-formula">\[
[K]\{u\}=\{F\}\ \ \Rightarrow\ \ \{u\}=[K]^{-1}\{F\}
\]</div>

<h5>Matriz de rigidez de una barra de armadura (2D)</h5>
<div class="dm-formula">\[
[k]=\frac{EA}{L}\begin{bmatrix}c^2&cs&-c^2&-cs\\cs&s^2&-cs&-s^2\\-c^2&-cs&c^2&cs\\-cs&-s^2&cs&s^2\end{bmatrix},\qquad c=\cos\theta,\ s=\sin\theta
\]</div>
<p>donde \(\theta\) es el ángulo de la barra respecto del eje global \(x\). Una barra de pórtico plano añade el grado de libertad de giro, con términos \(12EI/L^3\), \(6EI/L^2\), \(4EI/L\) y \(2EI/L\).</p>

<h5>Pasos del análisis</h5>
<ol>
<li>Numerar nudos y grados de libertad; definir propiedades \(E,A,I\).</li>
<li>Calcular \([k]\) de cada elemento en ejes locales y transformarla a ejes globales.</li>
<li>Ensamblar \([K]\) sumando las contribuciones en los grados de libertad compartidos.</li>
<li>Aplicar las condiciones de contorno (apoyos) y resolver los desplazamientos.</li>
<li>Calcular las reacciones y las fuerzas internas de cada elemento.</li>
</ol>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: dos barras axiales en serie</h5>
    <p>Dos resortes (barras) en serie de rigidez \(k_1=EA_1/L_1=100\ \text{kN/mm}\) y \(k_2=50\ \text{kN/mm}\); nudo 1 empotrado, carga de 30 kN en el nudo 3.</p>
    <div class="dm-formula">\[
\begin{bmatrix}k_1+k_2&-k_2\\-k_2&k_2\end{bmatrix}\begin{Bmatrix}u_2\\u_3\end{Bmatrix}=\begin{Bmatrix}0\\30\end{Bmatrix}
\ \Rightarrow\ u_2=\frac{30}{k_1}=0.30\ \text{mm},\quad u_3=u_2+\frac{30}{k_2}=0.90\ \text{mm}
\]</div>
    <div class="tn-result">Resultado: <b>u<sub>2</sub> = 0.30 mm</b> y <b>u<sub>3</sub> = 0.90 mm</b>. La rigidez equivalente en serie es \(1/(1/k_1+1/k_2)=33.3\ \text{kN/mm}\): \(30/33.3=0.90\) ✓.</div>
</div>
<div class="tn-note"><b>Para la práctica.</b> Los programas de análisis estructural resuelven miles de grados de libertad con este esquema; el criterio de verificación (equilibrio global, órdenes de magnitud con cálculos manuales y reacciones) sigue siendo responsabilidad del ingeniero.</div>
`
        }
    ];

    global.TN_ADD('est', sec, {
        bib: [
            'Hibbeler, R. C. <em>Análisis estructural</em>, 8.ª ed. Pearson.',
            'McCormac, J. C. y Nelson, J. K. <em>Análisis de estructuras: métodos clásico y matricial</em>, 4.ª ed. Alfaomega.',
            'Kassimali, A. <em>Structural Analysis</em>, 6.ª ed. Cengage.',
            'Chopra, A. K. <em>Dynamics of Structures</em>, 5.ª ed. Pearson.',
            'Reglamento Colombiano de Construcción Sismo Resistente NSR-10: Título A (A.2.6, A.4), Título B (B.2.4, B.4.2) y Título C (C.8.3, C.10.10).'
        ]
    });
})(window);
