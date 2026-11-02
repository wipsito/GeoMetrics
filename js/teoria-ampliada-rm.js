/* GeoMetrics — Teoría ampliada · Resistencia de Materiales */
(function (global) {
    'use strict';
    var S = String.raw;

    var sec = [
        /* ───────────── PROPIEDADES DE MATERIALES ───────────── */
        {
            id: 'materiales', after: 'esfuerzo',
            title: 'Propiedades de los materiales de ingeniería',
            html: S`
<p>Las ecuaciones de resistencia de materiales se alimentan con propiedades medidas en ensayos. Conviene conocer los órdenes de magnitud de los materiales de uso común para detectar de inmediato resultados absurdos.</p>

<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Material</th><th>E (GPa)</th><th>G (GPa)</th><th>ν</th><th>F<sub>y</sub> o f′<sub>c</sub> (MPa)</th><th>F<sub>u</sub> (MPa)</th><th>α (10⁻⁶/°C)</th><th>ρ (kg/m³)</th></tr></thead><tbody>
<tr><td>Acero estructural A36</td><td>200</td><td>77</td><td>0.30</td><td>250</td><td>400 – 550</td><td>12</td><td>7 850</td></tr>
<tr><td>Acero de refuerzo grado 60</td><td>200</td><td>77</td><td>0.30</td><td>420</td><td>≥ 620</td><td>12</td><td>7 850</td></tr>
<tr><td>Aluminio 6061-T6</td><td>69</td><td>26</td><td>0.33</td><td>275</td><td>310</td><td>23.6</td><td>2 700</td></tr>
<tr><td>Concreto normal</td><td>\(4700\sqrt{f'_c}\)</td><td>≈ 0.42 E</td><td>0.15 – 0.20</td><td>f′<sub>c</sub> = 21 a 42</td><td>tracción ≈ 0.1 f′<sub>c</sub></td><td>10</td><td>2 300 – 2 400</td></tr>
<tr><td>Madera estructural (paralela a fibra)</td><td>7 – 14</td><td>0.5 – 1</td><td>0.3 – 0.4</td><td>10 – 25 (flexión)</td><td>—</td><td>3 – 5</td><td>400 – 800</td></tr>
<tr><td>Hierro fundido gris</td><td>100 – 170</td><td>40 – 65</td><td>0.25</td><td>(frágil)</td><td>150 – 350 (tracción)</td><td>10</td><td>7 200</td></tr>
</tbody><caption>Valores típicos; deben sustituirse por los de la ficha técnica o la norma del material (NTC 1920/ASTM A36 para perfiles, NTC 2289 para barras corrugadas, NSR-10 Títulos C, E y F). El módulo del concreto de la fila usa la expresión de ACI 318; los concretos locales pueden tener valores menores.</caption></table></div>

<h5>Relaciones entre constantes elásticas</h5>
<p>Un material elástico lineal, homogéneo e isótropo solo tiene dos constantes independientes. Las tres más usadas se relacionan por:</p>
<div class="dm-formula">\[
G=\frac{E}{2(1+\nu)},\qquad K=\frac{E}{3(1-2\nu)}
\]</div>
<p>donde \(K\) es el módulo volumétrico. Como \(0\le\nu\le0.5\), \(G\) siempre está entre \(E/3\) y \(E/2\); \(\nu=0.5\) corresponde a un material incompresible (caucho).</p>

<h5>Ley de Hooke generalizada</h5>
<div class="dm-formula">\[
\varepsilon_x=\frac{1}{E}\left[\sigma_x-\nu(\sigma_y+\sigma_z)\right],\quad
\varepsilon_y=\frac{1}{E}\left[\sigma_y-\nu(\sigma_x+\sigma_z)\right],\quad
\gamma_{xy}=\frac{\tau_{xy}}{G}
\]</div>
<p>Una carga axial \(\sigma_x\) produce una deformación transversal \(\varepsilon_y=\varepsilon_z=-\nu\,\varepsilon_x\) (efecto de Poisson).</p>

<h5>Clasificación del comportamiento</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Dúctil</b><p>Fluye antes de romper y presenta gran deformación plástica (acero dulce, aluminio, cobre). Se diseña con el esfuerzo de fluencia \(F_y\) y el criterio de Von Mises o Tresca.</p></div>
    <div class="tn-mini"><b>Frágil</b><p>Rompe sin fluir, con poca deformación (concreto, fundición, vidrio, cerámica). Se diseña con la resistencia última y el criterio de Mohr–Coulomb o del esfuerzo normal máximo.</p></div>
    <div class="tn-mini"><b>Isótropo y anisótropo</b><p>La madera, los compuestos y los suelos laminados tienen propiedades distintas según la dirección; hay que indicar siempre cuál es la dirección del esfuerzo.</p></div>
    <div class="tn-mini"><b>Elástico, plástico y viscoelástico</b><p>Elástico: recupera la forma al retirar la carga. Plástico: deformación permanente. Viscoelástico (concreto, madera, polímeros): la deformación depende del tiempo (fluencia).</p></div>
</div>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: deformación transversal de una barra</h5>
    <p>Barra de acero (\(E=200\ \text{GPa}\), \(\nu=0.30\)) de 20 mm de diámetro sometida a \(\sigma=150\ \text{MPa}\) de tracción.</p>
    <div class="dm-formula">\[
\varepsilon_x=\frac{150}{200000}=7.5\times10^{-4},\qquad
\varepsilon_y=-0.30(7.5\times10^{-4})=-2.25\times10^{-4}
\]</div>
    <div class="dm-formula">\[
\Delta d=\varepsilon_y\,d=-2.25\times10^{-4}(20)=-0.0045\ \text{mm}
\]</div>
    <div class="tn-result">Resultado: <b>ε<sub>x</sub> = 0.075 %</b> y el diámetro se reduce <b>0.0045 mm</b>.</div>
</div>
`
        },
        /* ───────────── CARGA AXIAL E INDETERMINADOS ───────────── */
        {
            id: 'axial', after: 'compresion',
            title: 'Carga axial, problemas indeterminados y efectos térmicos',
            html: S`
<p>Para una barra prismática de material elástico lineal bajo una fuerza axial \(P\) constante, el alargamiento es:</p>
<div class="dm-formula">\[
\delta=\frac{P\,L}{A\,E}=\frac{\sigma L}{E}
\]</div>
<p>Si la fuerza, el área o el módulo cambian a lo largo de la barra, se suman los tramos: \(\delta=\sum \dfrac{P_iL_i}{A_iE_i}\) o se integra: \(\delta=\displaystyle\int\dfrac{P(x)}{A(x)E}dx\). La cantidad \(AE/L\) se llama <strong>rigidez axial</strong> \(k\), lo que permite asimilar la barra a un resorte: \(P=k\delta\).</p>

<h5>Problemas estáticamente indeterminados</h5>
<p>Hay más incógnitas que ecuaciones de equilibrio. Se resuelven añadiendo ecuaciones de <strong>compatibilidad de deformaciones</strong> y la relación fuerza–desplazamiento de cada elemento. El procedimiento:</p>
<ol>
<li>Escribir el equilibrio de la estructura.</li>
<li>Escribir la compatibilidad (por ejemplo, que dos barras en paralelo se deformen lo mismo).</li>
<li>Reemplazar las deformaciones por \(\delta=PL/AE\) y resolver el sistema.</li>
</ol>
<p>Los elementos más rígidos absorben más carga: en paralelo, la carga se reparte en proporción a \(AE\).</p>

<h5>Efectos de temperatura y errores de fabricación</h5>
<p>Un cambio de temperatura \(\Delta T\) produce una deformación libre \(\varepsilon_T=\alpha\Delta T\) y un alargamiento \(\delta_T=\alpha\Delta T\,L\) sin esfuerzo si la barra puede expandirse. Si se impide el movimiento, aparece una fuerza:</p>
<div class="dm-formula">\[
\sigma_T=-E\,\alpha\,\Delta T\quad\text{(extremos empotrados; compresión si }\Delta T>0)
\]</div>
<p>Los esfuerzos térmicos no dependen de la longitud de la barra, solo de la restricción; por eso las juntas de dilatación en puentes, rieles y tuberías son esenciales. Un elemento ligeramente corto o largo (error de montaje) introduce esfuerzos iniciales que se resuelven con la misma lógica.</p>

<h5>Concentración en cargas axiales</h5>
<p>En agujeros, cambios bruscos de sección y puntos de aplicación de carga, la distribución deja de ser uniforme (principio de Saint-Venant: el efecto local se disipa a una distancia aproximadamente igual al ancho del elemento). Se estima \(\sigma_{max}=K_t\sigma_{nom}\), con \(K_t\) tomado de tablas (véase concentración de esfuerzos y fatiga).</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: restricción térmica</h5>
    <p>Barra de acero entre dos muros rígidos: \(L=3\ \text{m}\), \(A=500\ \text{mm}^2\), \(\alpha=12\times10^{-6}/^\circ\text{C}\), \(E=200\ \text{GPa}\), \(\Delta T=+40\ ^\circ\text{C}\).</p>
    <div class="dm-formula">\[
\delta_{T,libre}=12\times10^{-6}(40)(3000)=1.44\ \text{mm}
\]</div>
    <div class="dm-formula">\[
\sigma=E\alpha\Delta T=200\,000(12\times10^{-6})(40)=96\ \text{MPa (compresión)},\qquad
P=96(500)=48\ \text{kN}
\]</div>
    <div class="tn-result">Resultado: <b>σ = 96 MPa</b> en compresión y <b>P = 48 kN</b> contra cada muro, aunque no haya ninguna carga externa.</div>
</div>
<div class="tn-example">
    <h5><span>2</span>Ejemplo: columna de concreto con acero de refuerzo</h5>
    <p>Columna de 400 × 400 mm con \(A_s=2\,000\ \text{mm}^2\) de acero, \(E_s=200\ \text{GPa}\), \(E_c=25\ \text{GPa}\), carga \(P=1\,200\ \text{kN}\). Compatibilidad: ambos materiales tienen la misma deformación \(\varepsilon\).</p>
    <div class="dm-formula">\[
\varepsilon=\frac{P}{E_cA_c+E_sA_s}=\frac{1\,200\,000}{25\,000(158\,000)+200\,000(2\,000)}=2.76\times10^{-4}
\]</div>
    <div class="dm-formula">\[
\sigma_c=E_c\varepsilon=6.9\ \text{MPa},\qquad \sigma_s=E_s\varepsilon=55.2\ \text{MPa},\qquad P_s=\sigma_sA_s=110\ \text{kN}\ (9\%)
\]</div>
    <div class="tn-result">Resultado: <b>σ<sub>c</sub> = 6.9 MPa</b>, <b>σ<sub>s</sub> = 55 MPa</b>; el acero, con 1.25 % del área, soporta el 9 % de la carga en servicio elástico. (En la resistencia última la proporción cambia.)</div>
</div>
`
        },
        /* ───────────── EQUILIBRIO Y DIAGRAMAS ───────────── */
        {
            id: 'equilibrio', after: 'axial',
            title: 'Equilibrio, fuerzas internas y diagramas de cortante y momento',
            html: S`
<p>Antes de calcular esfuerzos hay que conocer las <strong>fuerzas internas</strong> en cada sección del elemento: fuerza axial \(N\), fuerza cortante \(V\), momento flector \(M\) y momento torsor \(T\). Se obtienen con el método de las secciones: se corta el elemento, se aísla un lado y se imponen las condiciones de equilibrio.</p>

<h5>Reacciones de apoyo</h5>
<div class="dm-formula">\[
\sum F_x=0,\qquad \sum F_y=0,\qquad \sum M_O=0
\]</div>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Apoyo</th><th>Restricciones</th><th>Reacciones</th></tr></thead><tbody>
<tr><td>Rodillo (móvil)</td><td>Impide desplazamiento perpendicular</td><td>1 fuerza</td></tr>
<tr><td>Articulación (fijo)</td><td>Impide ambos desplazamientos</td><td>2 fuerzas (horizontal y vertical)</td></tr>
<tr><td>Empotramiento</td><td>Impide desplazamientos y giro</td><td>2 fuerzas y 1 momento</td></tr>
</tbody></table></div>

<h5>Convención de signos y relaciones diferenciales</h5>
<p>Cortante positivo: gira el segmento en sentido horario. Momento positivo: produce compresión arriba (la viga se curva con concavidad hacia arriba). Si \(w(x)\) es la carga distribuida hacia abajo:</p>
<div class="dm-formula">\[
\frac{dV}{dx}=-w(x),\qquad \frac{dM}{dx}=V(x)
\]</div>
<ul>
<li>El cambio de \(V\) entre dos puntos es el área de la carga entre ellos; \(V\) tiene un salto igual a una carga puntual.</li>
<li>El cambio de \(M\) entre dos puntos es el área del diagrama de cortante entre ellos; \(M\) tiene un salto igual a un momento concentrado.</li>
<li>El momento máximo ocurre donde \(V=0\) (o cambia de signo).</li>
<li>Carga uniforme → cortante lineal → momento parabólico.</li>
</ul>

<h5>Casos típicos de referencia</h5>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Caso</th><th>Reacciones</th><th>Momento máximo</th></tr></thead><tbody>
<tr><td>Simplemente apoyada, carga uniforme \(w\)</td><td>\(wL/2\)</td><td>\(wL^2/8\) al centro</td></tr>
<tr><td>Simplemente apoyada, carga puntual \(P\) al centro</td><td>\(P/2\)</td><td>\(PL/4\) al centro</td></tr>
<tr><td>Voladizo, carga puntual \(P\) en el extremo</td><td>\(P\) y \(M=PL\)</td><td>\(PL\) en el empotramiento</td></tr>
<tr><td>Voladizo, carga uniforme \(w\)</td><td>\(wL\) y \(M=wL^2/2\)</td><td>\(wL^2/2\) en el empotramiento</td></tr>
<tr><td>Empotrada–empotrada, carga uniforme \(w\)</td><td>\(wL/2\)</td><td>\(wL^2/12\) en apoyos; \(wL^2/24\) al centro</td></tr>
</tbody></table></div>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: viga con carga distribuida y puntual</h5>
    <p>Viga simplemente apoyada de \(L=6\ \text{m}\) con \(w=10\ \text{kN/m}\) en toda la luz y \(P=20\ \text{kN}\) a 2 m del apoyo A.</p>
    <div class="dm-formula">\[
\sum M_A=0:\ R_B(6)=10(6)(3)+20(2)=220\ \Rightarrow\ R_B=36.67\ \text{kN},\qquad R_A=80-36.67=43.33\ \text{kN}
\]</div>
    <p>Cortante: \(V(0)=43.33\); justo antes de \(P\) (x = 2): \(43.33-20=23.33\); después de \(P\): \(3.33\). Es cero cuando \(3.33-10(x-2)=0\Rightarrow x=2.33\ \text{m}\).</p>
    <div class="dm-formula">\[
M_{max}=M(2.33)=43.33(2.33)-20(0.33)-\frac{10(2.33)^2}{2}=67.2\ \text{kN·m}
\]</div>
    <div class="tn-result">Resultado: <b>R<sub>A</sub> = 43.3 kN</b>, <b>R<sub>B</sub> = 36.7 kN</b>, <b>M<sub>max</sub> ≈ 67.2 kN·m</b> a 2.33 m del apoyo A.</div>
</div>
<div class="tn-note tn-warn"><b>Verifica siempre.</b> La suma de reacciones debe igualar la carga total; el diagrama de cortante debe cerrar en cero en el extremo libre o igualar la reacción en el apoyo, y el momento en un extremo articulado o libre vale cero.</div>
`
        },
        /* ───────────── PROPIEDADES GEOMÉTRICAS ───────────── */
        {
            id: 'geometria', after: 'equilibrio',
            title: 'Propiedades geométricas de las secciones',
            html: S`
<p>La resistencia a flexión, la rigidez y el pandeo dependen de cómo se distribuye el material alrededor del centroide. Estas son las propiedades que definen la eficiencia de una sección.</p>

<h5>Centroide y momento de inercia</h5>
<div class="dm-formula">\[
\bar y=\frac{\sum A_i\,y_i}{\sum A_i},\qquad
I_x=\int y^2\,dA,\qquad
I=\sum\left(\bar I_i+A_id_i^2\right)
\]</div>
<p>El segundo término es el <strong>teorema de los ejes paralelos</strong>: el momento de inercia respecto de un eje paralelo a distancia \(d\) del eje centroidal propio se incrementa en \(Ad^2\). El material alejado del eje contribuye cuadráticamente: por eso los perfiles I y los tubos son tan eficientes.</p>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Sección</th><th>Área</th><th>I<sub>x</sub> centroidal</th><th>S = I/c</th></tr></thead><tbody>
<tr><td>Rectángulo \(b\times h\)</td><td>\(bh\)</td><td>\(bh^3/12\)</td><td>\(bh^2/6\)</td></tr>
<tr><td>Círculo macizo, diámetro \(d\)</td><td>\(\pi d^2/4\)</td><td>\(\pi d^4/64\)</td><td>\(\pi d^3/32\)</td></tr>
<tr><td>Tubo \(d_e\), \(d_i\)</td><td>\(\pi(d_e^2-d_i^2)/4\)</td><td>\(\pi(d_e^4-d_i^4)/64\)</td><td>\(\pi(d_e^4-d_i^4)/(32d_e)\)</td></tr>
<tr><td>Triángulo base \(b\), altura \(h\)</td><td>\(bh/2\)</td><td>\(bh^3/36\) (eje por el centroide)</td><td>—</td></tr>
</tbody></table></div>

<h5>Otras propiedades</h5>
<ul>
<li><strong>Módulo de sección elástico</strong> \(S=I/c\): relaciona momento y esfuerzo máximo (\(\sigma=M/S\)).</li>
<li><strong>Módulo plástico</strong> \(Z\): momento plástico \(M_p=F_yZ\); el <strong>factor de forma</strong> \(Z/S\) vale 1.5 en una sección rectangular y 1.10–1.15 en perfiles I.</li>
<li><strong>Radio de giro</strong> \(r=\sqrt{I/A}\): controla la esbeltez en columnas, \(\lambda=KL/r\).</li>
<li><strong>Producto de inercia</strong> \(I_{xy}\) y ejes principales: necesarios para secciones asimétricas (ángulos, canales) que flectan y giran a la vez.</li>
<li><strong>Momento polar</strong> \(J=I_x+I_y\): torsión de secciones circulares.</li>
</ul>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: sección en T</h5>
    <p>Ala superior de 200 × 30 mm y alma de 30 × 170 mm (altura total 200 mm). Distancias medidas desde la base.</p>
    <div class="dm-formula">\[
\bar y=\frac{5\,100(85)+6\,000(185)}{11\,100}=139.05\ \text{mm}
\]</div>
    <div class="dm-formula">\[
I=\frac{30(170)^3}{12}+5\,100(54.05)^2+\frac{200(30)^3}{12}+6\,000(45.95)^2=40.3\times10^{6}\ \text{mm}^4
\]</div>
    <div class="dm-formula">\[
S_{sup}=\frac{40.3\times10^6}{200-139.05}=661\,000\ \text{mm}^3,\qquad
S_{inf}=\frac{40.3\times10^6}{139.05}=290\,000\ \text{mm}^3
\]</div>
    <div class="tn-result">Resultado: eje neutro a <b>139 mm</b> de la base e <b>I = 40.3 × 10⁶ mm⁴</b>. La fibra inferior tiene el menor módulo de sección, por lo que recibirá el esfuerzo mayor en flexión positiva.</div>
</div>
`
        },
        /* ───────────── SECCIÓN TRANSFORMADA ───────────── */
        {
            id: 'transformada', after: 'flexion',
            title: 'Vigas de varios materiales: método de la sección transformada',
            html: S`
<p>Cuando una viga combina materiales de distinto módulo (acero–concreto, madera reforzada con platina, vigas sándwich), la hipótesis de “las secciones planas permanecen planas” sigue valiendo, pero el esfuerzo en cada material es \(\sigma=E\varepsilon\): a igual deformación el material rígido recibe más esfuerzo.</p>

<h5>Procedimiento</h5>
<ol>
<li>Escoger un material de referencia (1) y calcular la relación modular \(n=E_2/E_1\) para cada otro material.</li>
<li>Transformar la sección: el ancho del material 2 se multiplica por \(n\), manteniendo la altura (el área equivalente se expresa en el material de referencia).</li>
<li>Calcular el eje neutro y la inercia transformada \(I_{tr}\) de esta sección homogénea equivalente.</li>
<li>Calcular esfuerzos: en el material de referencia, \(\sigma_1=-\dfrac{My}{I_{tr}}\); en el otro, \(\sigma_2=-n\dfrac{My}{I_{tr}}\).</li>
</ol>
<div class="dm-formula">\[
n=\frac{E_2}{E_1},\qquad b_{tr}=n\,b_2,\qquad
\sigma_1=\frac{M\,y}{I_{tr}},\qquad
\sigma_2=n\,\frac{M\,y}{I_{tr}}
\]</div>

<h5>Concreto reforzado en servicio</h5>
<p>Con la sección agrietada se desprecia el concreto en tracción y el acero se transforma en un área equivalente \(nA_s\) (con \(n=E_s/E_c\)). El eje neutro se determina con el equilibrio de momentos estáticos del área comprimida y del acero transformado:</p>
<div class="dm-formula">\[
\frac{b\,x^2}{2}=n\,A_s\,(d-x)
\]</div>
<p>donde \(x\) es la profundidad del eje neutro medida desde la cara comprimida. Es la base del método de esfuerzos de trabajo y del cálculo de deflexiones con inercia agrietada.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: viga de madera reforzada con platina de acero</h5>
    <p>Madera de 100 × 200 mm (\(E_w=10\ \text{GPa}\)) con una platina de acero de 100 × 10 mm (\(E_s=200\ \text{GPa}\)) en la cara inferior; \(M=10\ \text{kN·m}\). Se transforma el acero a madera con \(n=20\): ancho equivalente \(2\,000\) mm × 10 mm.</p>
    <div class="dm-formula">\[
\bar y=\frac{20\,000(110)+20\,000(5)}{40\,000}=57.5\ \text{mm}\ \text{(desde la base)}
\]</div>
    <div class="dm-formula">\[
I_{tr}=\left[\frac{100(200)^3}{12}+20\,000(52.5)^2\right]+\left[\frac{2\,000(10)^3}{12}+20\,000(52.5)^2\right]=177\times10^{6}\ \text{mm}^4
\]</div>
    <div class="dm-formula">\[
\sigma_{madera,sup}=\frac{10\times10^6(152.5)}{177\times10^6}=8.6\ \text{MPa},\qquad
\sigma_{acero}=20\,\frac{10\times10^6(57.5)}{177\times10^6}=65\ \text{MPa}\ (\text{tracción})
\]</div>
    <div class="tn-result">Resultado: la madera trabaja a <b>8.6 MPa</b> (compresión) y el acero a <b>65 MPa</b> (tracción). La platina eleva \(I\) más de 2.6 veces respecto de la madera sola (\(66.7\times10^6\ \text{mm}^4\)).</div>
</div>
<div class="tn-note tn-warn"><b>Condición clave.</b> El método supone una conexión perfecta entre los materiales (sin deslizamiento). En conexiones con tornillos o clavos hay que usar una rigidez reducida o el factor de eficiencia de la unión.</div>
`
        },
        /* ───────────── RECIPIENTES ───────────── */
        {
            id: 'recipientes', after: 'torsion',
            title: 'Recipientes a presión de pared delgada',
            html: S`
<p>Tanques, tuberías, calderas y silos se diseñan como cascarones de pared delgada cuando el espesor \(t\) es mucho menor que el radio \(r\) (norma práctica: \(r/t\ge10\)). La presión interna \(p\) produce esfuerzos de membrana uniformes en el espesor.</p>

<h5>Cilindro</h5>
<p>Si se corta un anillo y se plantea el equilibrio de fuerzas en la dirección circunferencial y en la longitudinal:</p>
<div class="dm-formula">\[
\sigma_\theta=\frac{p\,r}{t}\ \ (\text{esfuerzo circunferencial o de aro}),\qquad
\sigma_L=\frac{p\,r}{2t}\ \ (\text{esfuerzo longitudinal})
\]</div>
<p>El esfuerzo de aro es el doble del longitudinal, por eso los tubos revientan siguiendo una grieta <strong>longitudinal</strong>. Las uniones soldadas longitudinales deben tener la mejor calidad.</p>

<h5>Esfera</h5>
<div class="dm-formula">\[
\sigma_1=\sigma_2=\frac{p\,r}{2t}
\]</div>
<p>Una esfera es la forma más eficiente: con el mismo espesor soporta el doble de presión que un cilindro de igual radio.</p>

<h5>Esfuerzo radial y criterio de falla</h5>
<p>El esfuerzo radial varía de \(-p\) en la cara interior a 0 en la exterior y es despreciable frente a los de membrana si \(r/t\ge10\). Para verificar la fluencia en un material dúctil se usa el esfuerzo equivalente de Von Mises en el estado biaxial:</p>
<div class="dm-formula">\[
\sigma_e=\sqrt{\sigma_\theta^2-\sigma_\theta\sigma_L+\sigma_L^2}=\frac{\sqrt3}{2}\,\sigma_\theta\ \ (\text{cilindro cerrado}),\qquad
FS=\frac{F_y}{\sigma_e}
\]</div>
<p>Con la presión hidrostática de líquidos, \(p\) cambia con la profundidad y el esfuerzo de aro es máximo en el fondo del tanque: \(\sigma_\theta=\gamma h\,r/t\).</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: tanque cilíndrico</h5>
    <p>Tanque de radio interior \(r=1.0\ \text{m}\), espesor \(t=10\ \text{mm}\), presión \(p=1.5\ \text{MPa}\), acero con \(F_y=250\ \text{MPa}\).</p>
    <div class="dm-formula">\[
\sigma_\theta=\frac{1.5(1000)}{10}=150\ \text{MPa},\qquad \sigma_L=75\ \text{MPa},\qquad
\sigma_e=\frac{\sqrt3}{2}(150)=130\ \text{MPa}
\]</div>
    <div class="dm-formula">\[
FS=\frac{250}{130}=1.92,\qquad r/t=100\ge10\ \checkmark
\]</div>
    <div class="tn-result">Resultado: <b>σ<sub>θ</sub> = 150 MPa</b>, <b>σ<sub>L</sub> = 75 MPa</b>, <b>FS = 1.9</b> contra la fluencia. Un recipiente real exige factores mayores y las reglas del código ASME para recipientes a presión.</div>
</div>
`
        },
        /* ───────────── CARGAS COMBINADAS ───────────── */
        {
            id: 'combinadas', after: 'transformacion',
            title: 'Cargas combinadas, flexión compuesta y núcleo central',
            html: S`
<p>En la práctica un elemento rara vez soporta una sola solicitación: una columna recibe carga axial y momento, un eje transmite flexión y torsión, una viga puede flectarse en dos planos. Si el material es elástico lineal, se aplica el <strong>principio de superposición</strong>: se calcula el esfuerzo de cada acción por separado y se suman en el punto de interés.</p>

<h5>Flexión compuesta (axial + flexión)</h5>
<div class="dm-formula">\[
\sigma=\frac{N}{A}\pm\frac{M_x\,y}{I_x}\pm\frac{M_y\,x}{I_y}
\]</div>
<p>Con una carga axial excéntrica \(P\) con excentricidad \(e\), el momento es \(M=Pe\). En una sección rectangular de altura \(h\) en la dirección de la excentricidad:</p>
<div class="dm-formula">\[
\sigma_{max,min}=\frac{P}{A}\left(1\pm\frac{6e}{h}\right)
\]</div>

<h5>Núcleo central (kern)</h5>
<p>Es la zona de la sección dentro de la cual puede aplicarse la carga sin que aparezca tracción. Para materiales que no resisten tracción (mampostería, concreto simple, suelo bajo una zapata) es fundamental. La tracción aparece cuando \(e>h/6\):</p>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Rectángulo</b><p>Núcleo central: rombo con semidiagonales \(h/6\) y \(b/6\). La carga debe quedar en el tercio medio de cada dimensión.</p></div>
    <div class="tn-mini"><b>Círculo</b><p>Círculo de radio \(r/4\) (diámetro \(d/4\)). Para un tubo de pared delgada, de radio \(r/2\).</p></div>
</div>

<h5>Flexión biaxial (asimétrica)</h5>
<p>Cuando el plano de las cargas no coincide con un eje principal de inercia, el eje neutro no es perpendicular al plano de carga. Se descompone el momento en los ejes principales y se suman los esfuerzos; la inclinación del eje neutro cumple \(\tan\beta=\dfrac{I_x}{I_y}\tan\theta\), donde \(\theta\) es el ángulo del plano de carga con el eje de menor inercia.</p>

<h5>Flexión + torsión (ejes)</h5>
<p>En un eje circular con \(M\) y \(T\), el esfuerzo máximo está en la superficie, donde \(\sigma=\dfrac{32M}{\pi d^3}\) y \(\tau=\dfrac{16T}{\pi d^3}\). Los esfuerzos principales y el criterio de Von Mises para el eje se simplifican a:</p>
<div class="dm-formula">\[
\sigma_e=\frac{32}{\pi d^3}\sqrt{M^2+\tfrac34T^2},\qquad
d=\left[\frac{32\,FS}{\pi F_y}\sqrt{M^2+\tfrac34T^2}\right]^{1/3}
\]</div>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: columna corta excéntrica</h5>
    <p>Sección de 300 × 400 mm (\(h=400\ \text{mm}\) en la dirección de la excentricidad), \(P=300\ \text{kN}\), \(e=0.10\ \text{m}\).</p>
    <div class="dm-formula">\[
\frac{P}{A}=\frac{300\,000}{120\,000}=2.5\ \text{MPa},\qquad \frac{6e}{h}=\frac{6(100)}{400}=1.5
\]</div>
    <div class="dm-formula">\[
\sigma_{max}=2.5(1+1.5)=6.25\ \text{MPa (comp.)},\qquad
\sigma_{min}=2.5(1-1.5)=-1.25\ \text{MPa (tracción)}
\]</div>
    <div class="tn-result">Resultado: <b>6.25 MPa</b> de compresión y <b>1.25 MPa</b> de tracción. Como \(e=100\ \text{mm}>h/6=66.7\ \text{mm}\), la carga está fuera del núcleo central y el concreto simple se agrietaría.</div>
</div>
<div class="tn-example">
    <h5><span>2</span>Ejemplo: diámetro de un eje</h5>
    <p>Eje de acero (\(F_y=250\ \text{MPa}\)) con \(M=1.2\ \text{kN·m}\), \(T=0.9\ \text{kN·m}\) y \(FS=2\).</p>
    <div class="dm-formula">\[
\sqrt{M^2+\tfrac34T^2}=\sqrt{1.44+0.6075}=1.431\ \text{kN·m},\qquad
d=\left[\frac{32(2)(1.431\times10^6)}{\pi(250)}\right]^{1/3}=38.4\ \text{mm}
\]</div>
    <div class="tn-result">Resultado: <b>d ≥ 38.4 mm</b>; se adopta un diámetro comercial de 40 mm.</div>
</div>
`
        },
        /* ───────────── ENERGÍA E IMPACTO ───────────── */
        {
            id: 'energia', after: 'deflexiones',
            title: 'Energía de deformación y cargas de impacto',
            html: S`
<p>Una estructura cargada almacena energía elástica; esa energía permite calcular desplazamientos con el principio de conservación y es la clave para analizar cargas dinámicas simples como el impacto.</p>

<h5>Energía de deformación elástica</h5>
<div class="dm-formula">\[
U=\int\frac{\sigma^2}{2E}\,dV=\frac12P\,\delta\ \ (\text{una sola carga})
\]</div>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Solicitación</th><th>Energía de deformación</th></tr></thead><tbody>
<tr><td>Carga axial</td><td>\(U=\displaystyle\int\frac{N^2}{2AE}dx\ \to\ \dfrac{P^2L}{2AE}\) (constante)</td></tr>
<tr><td>Flexión</td><td>\(U=\displaystyle\int\frac{M^2}{2EI}dx\)</td></tr>
<tr><td>Torsión</td><td>\(U=\displaystyle\int\frac{T^2}{2GJ}dx\)</td></tr>
<tr><td>Cortante</td><td>\(U=\displaystyle\int\frac{f_s V^2}{2GA}dx\) (\(f_s\) = factor de forma; 1.2 en rectángulos)</td></tr>
</tbody></table></div>
<p>Con una sola carga \(P\) y el desplazamiento \(\delta\) en su misma dirección, la igualdad de trabajo y energía \(\tfrac12P\delta=U\) da \(\delta\) directamente. Para varias cargas se usa el teorema de Castigliano, \(\delta_i=\partial U/\partial P_i\) (véase Estructuras I).</p>

<h5>Carga de impacto</h5>
<p>Si un peso \(W\) cae desde una altura \(h\) sobre un elemento elástico de rigidez \(k\) (deformación estática \(\delta_{st}=W/k\)), la energía potencial \(W(h+\delta_{max})\) se transforma en energía de deformación \(\tfrac12k\delta_{max}^2\). Resolviendo:</p>
<div class="dm-formula">\[
\delta_{max}=\delta_{st}\left(1+\sqrt{1+\frac{2h}{\delta_{st}}}\right),\qquad
\sigma_{max}=\sigma_{st}\left(1+\sqrt{1+\frac{2h}{\delta_{st}}}\right)
\]</div>
<p>El factor entre paréntesis es el <strong>factor de impacto</strong>: es 2 cuando \(h=0\) (carga aplicada súbitamente) y crece con la altura. Para impacto horizontal de una masa \(m\) con velocidad \(v\): \(\delta_{max}=v\sqrt{m/k}\).</p>
<p>El impacto penaliza los elementos rígidos: para una misma energía de entrada, conviene un elemento con mucha capacidad de deformación (flexible y dúctil) y con sección uniforme (sin tramos de menor área que concentren el esfuerzo). Por eso los pernos de alta resistencia se diseñan con vástagos reducidos.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: desplazamiento por energía</h5>
    <p>Voladizo de longitud \(L\), rigidez \(EI\), con carga \(P\) en el extremo. \(M(x)=Px\):</p>
    <div class="dm-formula">\[
U=\int_0^L\frac{(Px)^2}{2EI}dx=\frac{P^2L^3}{6EI}=\frac12P\delta\ \Rightarrow\ \delta=\frac{PL^3}{3EI}
\]</div>
    <div class="tn-result">Resultado: se recupera el conocido <b>δ = PL³/(3EI)</b> sin integrar la elástica.</div>
</div>
<div class="tn-example">
    <h5><span>2</span>Ejemplo: peso que cae sobre una varilla</h5>
    <p>Un peso de \(W=1\ \text{kN}\) cae \(h=50\ \text{mm}\) sobre el collar de una varilla de acero de \(L=2\ \text{m}\) y \(A=300\ \text{mm}^2\) (\(E=200\ \text{GPa}\)).</p>
    <div class="dm-formula">\[
\delta_{st}=\frac{1000(2000)}{300(200\,000)}=0.0333\ \text{mm},\qquad
\sigma_{st}=\frac{1000}{300}=3.33\ \text{MPa}
\]</div>
    <div class="dm-formula">\[
\text{factor}=1+\sqrt{1+\frac{2(50)}{0.0333}}=55.8,\qquad
\sigma_{max}=55.8(3.33)=186\ \text{MPa},\quad \delta_{max}=1.86\ \text{mm}
\]</div>
    <div class="tn-result">Resultado: un peso de solo 1 kN produce <b>186 MPa</b>, casi 56 veces el esfuerzo estático. Con una fluencia de 250 MPa el margen real es muy pequeño.</div>
</div>
`
        },
        /* ───────────── FATIGA Y FRACTURA ───────────── */
        {
            id: 'fatiga', after: 'dureza',
            title: 'Concentración de esfuerzos, fatiga y fractura',
            html: S`
<p>Una gran parte de las fallas de elementos metálicos ocurre con esfuerzos muy inferiores a la fluencia estática: cargas repetidas, entallas y grietas pequeñas son los responsables. Aquí se resumen los tres fenómenos y sus métodos de verificación.</p>

<h5>Concentración de esfuerzos</h5>
<p>Los agujeros, ranuras, chaveteros, cambios de diámetro y filetes alteran el flujo de esfuerzos y generan picos locales:</p>
<div class="dm-formula">\[
\sigma_{max}=K_t\,\sigma_{nom}
\]</div>
<p>\(K_t\) depende solo de la geometría. Valores de referencia: placa infinita con agujero circular, \(K_t=3\) (tracción); eje con filete de radio \(r\) y relación \(D/d=1.5\), \(K_t\approx1.5\) a 2.2 según \(r/d\). Se reduce con transiciones suaves (radios grandes), agujeros de alivio y refuerzos. En materiales dúctiles bajo carga estática la fluencia local redistribuye el esfuerzo y \(K_t\) apenas importa; en materiales frágiles y en fatiga, sí.</p>

<h5>Fatiga: curva S–N y límite de fatiga</h5>
<p>Con esfuerzos alternados repetidos, la grieta nace en un punto de concentración, avanza ciclo a ciclo y el elemento rompe de forma súbita aunque \(\sigma_{max}<F_y\). El comportamiento se resume en la curva S–N (esfuerzo alternante frente al número de ciclos). Los aceros muestran un <strong>límite de fatiga</strong> por debajo del cual la vida es prácticamente infinita; el aluminio y otros no ferrosos no lo tienen y se usa la resistencia a \(5\times10^8\) ciclos.</p>
<p>El límite de fatiga de una probeta pulida en flexión rotatoria es aproximadamente \(S'_e\approx0.5S_u\) (para \(S_u\le1\,400\ \text{MPa}\)). En el elemento real se corrige con los factores de Marin:</p>
<div class="dm-formula">\[
S_e=k_a\,k_b\,k_c\,k_d\,k_e\,k_f\,S'_e
\]</div>
<p>\(k_a\): acabado superficial (\(k_a=4.51S_u^{-0.265}\) para acabado maquinado, \(S_u\) en MPa); \(k_b\): tamaño (\(k_b=1.24\,d^{-0.107}\) para \(2.79\le d\le51\ \text{mm}\) en flexión); \(k_c\): tipo de carga (1 flexión, 0.85 axial, 0.59 torsión); \(k_d\): temperatura; \(k_e\): confiabilidad; \(k_f\): efectos diversos (entallas, corrosión).</p>

<h5>Esfuerzo medio y criterio de Goodman</h5>
<p>Si el esfuerzo oscila alrededor de un valor medio \(\sigma_m\) con amplitud \(\sigma_a\), el esfuerzo medio de tracción reduce la vida. La línea de Goodman modificada da el factor de seguridad:</p>
<div class="dm-formula">\[
\frac{\sigma_a}{S_e}+\frac{\sigma_m}{S_u}=\frac1n
\]</div>
<p>Se complementa con la verificación de fluencia en el primer ciclo (\(\sigma_a+\sigma_m\le F_y/n\)). El esfuerzo medio de compresión no reduce la resistencia.</p>

<h5>Mecánica de la fractura</h5>
<p>Un elemento con una grieta de longitud \(a\) falla cuando el factor de intensidad de esfuerzos alcanza la <strong>tenacidad a la fractura</strong> del material \(K_{Ic}\):</p>
<div class="dm-formula">\[
K_I=Y\,\sigma\sqrt{\pi a}\ \ge\ K_{Ic}\ \ \Rightarrow\ \ a_{cr}=\frac1\pi\left(\frac{K_{Ic}}{Y\sigma}\right)^2
\]</div>
<p>donde \(Y\) depende de la geometría (\(Y\approx1.0\) a 1.12 para grietas pequeñas). Para aceros estructurales a temperatura ambiente, \(K_{Ic}\) está entre 50 y 150 MPa√m; baja mucho a bajas temperaturas (transición dúctil–frágil). Cuando la grieta crece por fatiga, la velocidad de propagación sigue la ley de Paris: \(da/dN=C(\Delta K)^m\).</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: verificación a fatiga de un eje</h5>
    <p>Eje de acero con \(S_u=500\ \text{MPa}\), diámetro de 25 mm, acabado maquinado, flexión; \(\sigma_m=100\ \text{MPa}\) y \(\sigma_a=80\ \text{MPa}\).</p>
    <div class="dm-formula">\[
S'_e=0.5(500)=250,\quad k_a=4.51(500)^{-0.265}=0.869,\quad k_b=1.24(25)^{-0.107}=0.879,\quad S_e=0.869(0.879)(250)=191\ \text{MPa}
\]</div>
    <div class="dm-formula">\[
\frac1n=\frac{80}{191}+\frac{100}{500}=0.619\ \Rightarrow\ n=1.62
\]</div>
    <div class="tn-result">Resultado: <b>S<sub>e</sub> ≈ 191 MPa</b> y <b>n ≈ 1.6</b> a vida infinita con Goodman (se omiten otros factores; añade el efecto de entallas con \(k_f\)).</div>
</div>
<div class="tn-example">
    <h5><span>2</span>Ejemplo: tamaño crítico de grieta</h5>
    <p>Placa de acero con \(K_{Ic}=50\ \text{MPa}\sqrt{\text{m}}\) cargada a \(\sigma=200\ \text{MPa}\), \(Y=1.12\).</p>
    <div class="dm-formula">\[
a_{cr}=\frac1\pi\left(\frac{50}{1.12(200)}\right)^2=0.0159\ \text{m}=15.9\ \text{mm}
\]</div>
    <div class="tn-result">Resultado: una grieta de <b>≈ 16 mm</b> es crítica. Las inspecciones deben detectar grietas bastante más pequeñas que ese tamaño.</div>
</div>
`
        }
    ];

    global.TN_ADD('rm', sec, {
        bib: [
            'Beer, F. P., Johnston, E. R., DeWolf, J. T. y Mazurek, D. F. <em>Mecánica de materiales</em>, 6.ª ed. McGraw-Hill.',
            'Hibbeler, R. C. <em>Mecánica de materiales</em>, 8.ª ed. Pearson.',
            'Gere, J. M. y Goodno, B. J. <em>Mecánica de materiales</em>, 8.ª ed. Cengage.',
            'Budynas, R. G. y Nisbett, J. K. <em>Diseño en ingeniería mecánica de Shigley</em>, 10.ª ed. McGraw-Hill (fatiga y factores de Marin).',
            'Anderson, T. L. <em>Fracture Mechanics: Fundamentals and Applications</em>, 4.ª ed. CRC Press.',
            'NTC 1920 (acero estructural), NTC 2289 (barras corrugadas) y NSR-10 Títulos C, E y F.'
        ]
    });
})(window);
