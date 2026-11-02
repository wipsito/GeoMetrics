/* GeoMetrics — Teoría ampliada · Mecánica de Suelos II */
(function (global) {
    'use strict';
    var S = String.raw;

    var sec = [
        /* ───────────── ESFUERZOS POR CARGAS EXTERNAS ───────────── */
        {
            id: 'carga-ext', after: 'esfuerzos',
            title: 'Distribución de esfuerzos por cargas externas (Boussinesq)',
            html: S`
<p>Una carga aplicada en la superficie (zapata, terraplén, tanque) se reparte en el terreno y produce un <strong>incremento de esfuerzo vertical</strong> \(\Delta\sigma_z\) que disminuye con la profundidad y con la distancia horizontal. Ese incremento, sumado a \(\sigma'_{v0}\), alimenta los cálculos de asentamiento. La solución clásica supone un medio elástico, homogéneo, isótropo y semi-infinito (Boussinesq, 1885).</p>

<h5>Carga puntual</h5>
<div class="dm-formula">\[
\Delta\sigma_z=\frac{3Q}{2\pi z^2}\left[\frac{1}{1+(r/z)^2}\right]^{5/2}
\]</div>
<p>\(Q\) es la carga, \(z\) la profundidad y \(r\) la distancia horizontal al eje de la carga. Directamente bajo la carga (\(r=0\)): \(\Delta\sigma_z=0.4775\,Q/z^2\).</p>

<h5>Área circular uniforme y franja</h5>
<div class="dm-formula">\[
\Delta\sigma_z=q\left[1-\frac{1}{\left(1+(R/z)^2\right)^{3/2}}\right]\ \ (\text{bajo el centro del círculo de radio }R)
\]</div>
<div class="dm-formula">\[
\Delta\sigma_z=\frac{q}{\pi}\left[\alpha+\sin\alpha\cos(\alpha+2\delta)\right]\ \ (\text{franja infinita de ancho }B)
\]</div>
<p>En la franja, \(\alpha\) es el ángulo subtendido en el punto por el ancho de la carga y \(\delta\) el ángulo entre la vertical y la línea al borde más cercano. Bajo el eje de una zapata corrida, el 10 % de \(q\) llega a una profundidad cercana a \(6B\) y el 20 % a \(\approx 2.5B\).</p>

<h5>Esquina de un área rectangular (Newmark)</h5>
<div class="dm-formula">\[
\Delta\sigma_z=q\,I,\quad
I=\frac{1}{4\pi}\left[\frac{2mn\sqrt{m^2+n^2+1}}{m^2+n^2+m^2n^2+1}\cdot\frac{m^2+n^2+2}{m^2+n^2+1}
+\tan^{-1}\frac{2mn\sqrt{m^2+n^2+1}}{m^2+n^2+1-m^2n^2}\right]
\]</div>
<p>con \(m=B/z\), \(n=L/z\) (intercambiables). El factor \(I\) corresponde al esfuerzo bajo la <strong>esquina</strong> del rectángulo cargado. Para cualquier otro punto se superponen rectángulos que tengan ese punto como esquina (sumando o restando áreas). Bajo el centro de un rectángulo se usan cuatro rectángulos de \(B/2\times L/2\): \(\Delta\sigma_z=4qI\).</p>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>n = L/z \ m = B/z</th><th>0.1</th><th>0.2</th><th>0.5</th><th>1.0</th><th>2.0</th><th>5.0</th></tr></thead><tbody>
<tr><td>0.5</td><td>0.020</td><td>0.039</td><td>0.084</td><td>0.120</td><td>0.135</td><td>0.137</td></tr>
<tr><td>1.0</td><td>0.028</td><td>0.055</td><td>0.120</td><td>0.175</td><td>0.200</td><td>0.204</td></tr>
<tr><td>2.0</td><td>0.031</td><td>0.061</td><td>0.135</td><td>0.200</td><td>0.232</td><td>0.240</td></tr>
<tr><td>5.0</td><td>0.032</td><td>0.062</td><td>0.137</td><td>0.204</td><td>0.240</td><td>0.249</td></tr>
<tr><td>10</td><td>0.032</td><td>0.062</td><td>0.137</td><td>0.205</td><td>0.240</td><td>0.249</td></tr>
</tbody><caption>Factor de influencia I bajo la esquina de un área rectangular uniformemente cargada (calculado con la ecuación de Newmark). Con m y n grandes, I tiende a 0.25.</caption></table></div>

<h5>Métodos aproximados</h5>
<ul>
<li><strong>2:1:</strong> \(\Delta\sigma_z=\dfrac{qBL}{(B+z)(L+z)}\). Simple y útil para predimensionar; subestima el esfuerzo cerca de la base y no representa la variación lateral.</li>
<li><strong>Westergaard:</strong> considera un suelo estratificado con capas rígidas que restringen la deformación lateral; da valores menores que Boussinesq y se usa en depósitos laminados.</li>
<li><strong>Cartas de Newmark:</strong> cada elemento del gráfico aporta un valor fijo de influencia; se cuentan los elementos cubiertos por la planta dibujada a escala según la profundidad.</li>
</ul>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: carga puntual</h5>
    <p>\(Q=500\ \text{kN}\), \(z=3\ \text{m}\), \(r=2\ \text{m}\).</p>
    <div class="dm-formula">\[
\Delta\sigma_z=\frac{3(500)}{2\pi(3)^2}\left[\frac{1}{1+(2/3)^2}\right]^{5/2}=26.5\,(0.399)=10.6\ \text{kPa}
\]</div>
    <div class="tn-result">Resultado: <b>Δσz ≈ 10.6 kPa</b> a 3 m de profundidad y 2 m del eje de la carga.</div>
</div>
<div class="tn-example">
    <h5><span>2</span>Ejemplo: zapata cuadrada, bajo el centro</h5>
    <p>Zapata de 2 × 2 m con \(q=150\ \text{kPa}\); se busca \(\Delta\sigma_z\) a \(z=2\ \text{m}\) bajo el centro. Cada cuarto es de 1 × 1 m, por lo que \(m=n=1/2=0.5\) y \(I=0.084\).</p>
    <div class="dm-formula">\[
\Delta\sigma_z=4\,q\,I=4(150)(0.084)=50.4\ \text{kPa}
\]</div>
    <p>El método 2:1 daría \(150(2)(2)/[(2+2)(2+2)]=37.5\ \text{kPa}\), un 26 % menos.</p>
    <div class="tn-result">Resultado: <b>Δσz ≈ 50 kPa</b> (Boussinesq). Úsalo a la mitad del estrato compresible para estimar asentamientos.</div>
</div>

<div class="tn-note tn-warn"><b>Hipótesis.</b> Boussinesq supone elasticidad lineal y homogeneidad. En capas de rigidez muy distinta (arcilla blanda sobre roca, o arena sobre arcilla) la distribución real cambia; se recomienda evaluar con modelos de elementos finitos o consultar soluciones para medios estratificados.</div>
`
        },
        /* ───────────── TIEMPO DE CONSOLIDACIÓN ───────────── */
        {
            id: 'tiempo', after: 'consolidacion',
            title: 'Velocidad de consolidación: teoría de Terzaghi y drenes verticales',
            html: S`
<p>El asentamiento por consolidación no ocurre de inmediato: el agua debe salir por los poros y la rapidez depende de la permeabilidad y del recorrido de drenaje. Terzaghi (1925) formuló la teoría unidimensional que permite calcular <strong>cuánto</strong> y <strong>cuándo</strong>.</p>

<h5>Ecuación diferencial</h5>
<p>Para flujo vertical en un estrato saturado, con deformaciones pequeñas y propiedades constantes, el exceso de presión de poros \(u(z,t)\) cumple:</p>
<div class="dm-formula">\[
\frac{\partial u}{\partial t}=c_v\,\frac{\partial^2u}{\partial z^2},\qquad
c_v=\frac{k}{m_v\,\gamma_w}=\frac{k\,(1+e_0)}{a_v\,\gamma_w}
\]</div>
<p>\(c_v\) es el <strong>coeficiente de consolidación</strong> (m²/día o cm²/s). Valores típicos: arcillas blandas \(10^{-4}\) a \(10^{-3}\ \text{cm}^2/\text{s}\); arcillas firmes \(10^{-3}\) a \(10^{-2}\ \text{cm}^2/\text{s}\).</p>

<h5>Factor tiempo y grado de consolidación</h5>
<div class="dm-formula">\[
T_v=\frac{c_v\,t}{H_{dr}^2},\qquad U=\frac{S_t}{S_c}
\]</div>
<p>\(H_{dr}\) es la <strong>longitud máxima de drenaje</strong>: la mitad del espesor si el estrato drena por arriba y por abajo (doble drenaje) y el espesor completo si drena por un solo lado. La solución en series de Fourier de la ecuación anterior produce la relación \(U\)–\(T_v\):</p>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>U (%)</th><th>10</th><th>20</th><th>30</th><th>40</th><th>50</th><th>60</th><th>70</th><th>80</th><th>90</th><th>95</th></tr></thead><tbody>
<tr><td>T<sub>v</sub></td><td>0.008</td><td>0.031</td><td>0.071</td><td>0.126</td><td>0.197</td><td>0.287</td><td>0.403</td><td>0.567</td><td>0.848</td><td>1.129</td></tr>
</tbody><caption>Para U &lt; 60 %, la aproximación \(T_v=\frac{\pi}{4}U^2\) es muy buena; para U &gt; 60 %, \(T_v=-0.933\log_{10}(1-U)-0.085\).</caption></table></div>

<p>Observa que el tiempo crece con el <strong>cuadrado</strong> del espesor: duplicar la longitud de drenaje multiplica por 4 el tiempo para un mismo grado de consolidación. Por eso los estratos gruesos de arcilla pueden tardar años o décadas.</p>

<h5>Obtención de c<sub>v</sub> en el laboratorio</h5>
<ul>
<li><strong>Casagrande (log t):</strong> se grafica deformación frente a \(\log t\); \(t_{50}\) corresponde al 50 % de consolidación y \(c_v=0.197H_{dr}^2/t_{50}\).</li>
<li><strong>Taylor (√t):</strong> se grafica deformación frente a \(\sqrt{t}\); el punto de 90 % se obtiene con una recta con pendiente 1.15 veces la inicial y \(c_v=0.848H_{dr}^2/t_{90}\).</li>
<li>Cada escalón de carga entrega un \(c_v\); se reporta la variación con la presión, porque \(k\) y \(m_v\) cambian a medida que la arcilla se compacta.</li>
</ul>

<h5>Consolidación secundaria</h5>
<p>Después de disiparse el exceso de presión de poros continúa un asentamiento lento por reorganización de la estructura (fluencia). Se estima con:</p>
<div class="dm-formula">\[
S_s=\frac{C_\alpha\,H}{1+e_p}\log_{10}\frac{t_2}{t_1},\qquad C_\alpha=\frac{\Delta e}{\Delta\log_{10}t}
\]</div>
<p>La relación \(C_\alpha/C_c\) es casi constante para cada suelo: 0.04 ± 0.01 en arcillas inorgánicas y 0.05 o más en suelos orgánicos y turbas. Es muy importante en rellenos sobre turbas y arcillas orgánicas.</p>

<h5>Aceleración: precarga y drenes verticales</h5>
<p>Para reducir el tiempo se acortan las trayectorias de drenaje colocando <strong>drenes verticales</strong> (de arena o prefabricados de banda) a espaciamiento \(S\) y se aplica una <strong>precarga</strong> temporal. El flujo pasa a ser mayormente radial (Barron) y el grado de consolidación radial es:</p>
<div class="dm-formula">\[
U_r=1-\exp\left(\frac{-8\,T_r}{F(n)}\right),\quad T_r=\frac{c_h\,t}{D_e^2},\quad n=\frac{D_e}{d_w},\quad F(n)\approx\ln n-0.75
\]</div>
<p>\(D_e=1.05S\) (malla triangular) o \(1.13S\) (malla cuadrada), \(d_w\) es el diámetro equivalente del dren y \(c_h\) el coeficiente de consolidación horizontal (\(c_h\ge c_v\)). Se desprecia el efecto de embadurnamiento (smear) en esta versión simplificada; en diseño real debe incluirse.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: tiempo para el 90 % de consolidación</h5>
    <p>Estrato de arcilla de 4 m de espesor, \(c_v=4\times10^{-3}\ \text{cm}^2/\text{s}\). Con doble drenaje, \(H_{dr}=2\ \text{m}=200\ \text{cm}\) y \(T_v(90\%)=0.848\):</p>
    <div class="dm-formula">\[
t_{90}=\frac{T_vH_{dr}^2}{c_v}=\frac{0.848(200)^2}{0.004}=8.48\times10^{6}\ \text{s}\approx98\ \text{días}
\]</div>
    <p>Con drenaje solo por arriba, \(H_{dr}=400\ \text{cm}\) y el tiempo se multiplica por 4:</p>
    <div class="dm-formula">\[
t_{90}=\frac{0.848(400)^2}{0.004}\approx3.4\times10^{7}\ \text{s}\approx393\ \text{días}
\]</div>
    <div class="tn-result">Resultado: <b>t₉₀ ≈ 98 días</b> (doble drenaje) o <b>≈ 393 días</b> (un solo drenaje). El asentamiento total \(S_c\) no cambia, solo cuándo ocurre.</div>
</div>
<div class="tn-example">
    <h5><span>2</span>Ejemplo: asentamiento a un tiempo dado</h5>
    <p>Si el asentamiento final es \(S_c=25\ \text{cm}\), ¿cuánto se ha asentado a 22.8 días con el mismo estrato (doble drenaje)? \(T_v=0.004(22.8\cdot86400)/200^2=0.197\Rightarrow U\approx50\%\):</p>
    <div class="dm-formula">\[
S_t=U\,S_c=0.50(25)=12.5\ \text{cm}
\]</div>
    <div class="tn-result">Resultado: <b>S ≈ 12.5 cm</b> a los 23 días; quedan 12.5 cm por ocurrir.</div>
</div>

<div class="tn-note tn-warn"><b>Limitaciones.</b> Terzaghi supone \(c_v\) constante, deformaciones pequeñas y carga aplicada de golpe y uniforme en la profundidad. Los terraplenes se construyen por etapas y la carga no es uniforme: se corrige con el tiempo equivalente de construcción y se monitorea con piezómetros y placas de asentamiento.</div>
`
        },
        /* ───────────── ESTADO CRÍTICO ───────────── */
        {
            id: 'critico', after: 'triaxial',
            title: 'Comportamiento esfuerzo–deformación, dilatancia y estado crítico',
            html: S`
<p>La resistencia del suelo no es una constante: depende de la densidad, de la historia de esfuerzos y de las condiciones de drenaje. El marco de los <strong>estados críticos</strong> (Roscoe, Schofield y Wroth) integra resistencia y cambio de volumen en una sola teoría y explica por qué una arena densa y una suelta, sometidas al mismo ensayo, terminan fallando en un mismo estado.</p>

<h5>Esfuerzos de trabajo en el espacio p′–q</h5>
<div class="dm-formula">\[
p'=\frac{\sigma'_1+2\sigma'_3}{3},\qquad q=\sigma_1-\sigma_3
\]</div>
<p>En el ensayo triaxial, la <strong>línea de estado crítico</strong> (CSL) es una recta que pasa por el origen en el plano \(p'\)–\(q\), con pendiente \(M\), y una curva paralela a la de consolidación normal en \(e\)–\(\ln p'\). Está relacionada con el ángulo de fricción en estado crítico:</p>
<div class="dm-formula">\[
q_f=M\,p'_f,\qquad M=\frac{6\sin\phi'_{cs}}{3-\sin\phi'_{cs}}
\]</div>
<p>Para \(\phi'_{cs}=30^\circ\) resulta \(M=1.20\). El estado crítico es aquel en el que el suelo se deforma a volumen, esfuerzo efectivo y velocidad de deformación constantes.</p>

<h5>Arena densa frente a arena suelta (ensayo drenado)</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Arena densa</b><p>Alcanza un <strong>pico</strong> de resistencia con deformación pequeña, luego pierde resistencia hasta el estado crítico. En volumen primero se contrae un poco y luego se <strong>dilata</strong> (aumenta de volumen) porque los granos tienen que subir unos sobre otros.</p></div>
    <div class="tn-mini"><b>Arena suelta</b><p>No muestra pico: la resistencia aumenta gradualmente hasta el estado crítico y el volumen <strong>se contrae</strong> todo el tiempo. Si el ensayo es no drenado, la contracción se convierte en aumento de presión de poros (riesgo de licuación).</p></div>
</div>
<p>La dilatancia añade resistencia al rozamiento básico. Una expresión útil, de Bolton (1986), relaciona el ángulo de fricción pico con el índice de dilatancia relativa \(I_R\):</p>
<div class="dm-formula">\[
\phi'_{p}-\phi'_{cs}=3\,I_R\ \ (\text{deformación plana: }5\,I_R),\qquad
I_R=D_r\left(10-\ln p'\right)-1
\]</div>
<p>con \(p'\) en kPa y \(0\le I_R\le4\). El ángulo de dilatancia \(\psi\) mide la razón entre deformación volumétrica y distorsión en la falla: \(\sin\psi=-\dot\varepsilon_v/\dot\gamma\).</p>

<h5>Arcillas: normalmente consolidadas y sobreconsolidadas</h5>
<ul>
<li><strong>Normalmente consolidada (OCR ≈ 1):</strong> en drenado se contrae, en no drenado genera presión de poros positiva; \(c'\approx0\).</li>
<li><strong>Ligeramente sobreconsolidada (OCR &lt; 2):</strong> comportamiento intermedio; la presión de poros no drenada es pequeña.</li>
<li><strong>Muy sobreconsolidada (OCR &gt; 4):</strong> pico de resistencia, dilatación en drenado y presiones de poros negativas en no drenado; la resistencia de pico se pierde por ablandamiento y se tiende a la <strong>resistencia residual</strong> tras grandes desplazamientos (importante en taludes reactivados y deslizamientos antiguos).</li>
</ul>
<p>La resistencia no drenada normalizada de una arcilla en corte triaxial es aproximadamente:</p>
<div class="dm-formula">\[
\frac{s_u}{\sigma'_{v0}}\approx\left(\frac{s_u}{\sigma'_{v0}}\right)_{NC}OCR^{\,\Lambda},\qquad \left(\frac{s_u}{\sigma'_{v0}}\right)_{NC}\approx0.2\text{ a }0.35,\quad\Lambda\approx0.8
\]</div>
<p>Es la base de la formulación SHANSEP (Ladd y Foott) y permite estimar \(s_u\) a partir del perfil de esfuerzos y del OCR (obtenido de la consolidación).</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: resistencia no drenada por OCR</h5>
    <p>Una arcilla con \((s_u/\sigma'_{v0})_{NC}=0.25\) y \(\Lambda=0.8\) se encuentra a 6 m donde \(\sigma'_{v0}=50\ \text{kPa}\) y la preconsolidación es \(\sigma'_p=100\ \text{kPa}\).</p>
    <div class="dm-formula">\[
OCR=\frac{100}{50}=2,\qquad s_u=0.25(2)^{0.8}(50)=21.8\ \text{kPa}
\]</div>
    <div class="tn-result">Resultado: <b>s<sub>u</sub> ≈ 22 kPa</b>. Si fuese normalmente consolidada daría 12.5 kPa; la sobreconsolidación casi duplica la resistencia no drenada.</div>
</div>

<div class="tn-note tn-norm"><b>Implicación práctica.</b> Elegir entre parámetros de pico, de estado crítico o residuales es una decisión de ingeniería: para capacidad de carga de arenas se suele usar \(\phi'\) de pico reducido; para taludes con deformaciones grandes o deslizamientos antiguos, \(\phi'_{res}\); para análisis sísmico de arenas sueltas, la resistencia no drenada de estado estable.</div>
`
        },
        /* ───────────── ZAPATAS ───────────── */
        {
            id: 'zapatas', after: 'capacidad',
            title: 'Cimentaciones superficiales: factores, excentricidad y diseño geotécnico',
            html: S`
<p>Una cimentación superficial transmite al suelo la carga de la estructura a través de su base. El diseño geotécnico verifica tres cosas: (1) que la presión de contacto sea menor que la capacidad admisible, (2) que los asentamientos total y diferencial sean tolerables y (3) que no haya deslizamiento ni volcamiento bajo cargas horizontales. El predimensionamiento se hace con las cargas de servicio y el diseño estructural con las cargas mayoradas.</p>

<h5>Factores de capacidad de carga</h5>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>φ′ (°)</th><th>N<sub>c</sub></th><th>N<sub>q</sub></th><th>N<sub>γ</sub> (Vesic)</th><th>N<sub>γ</sub> (Meyerhof)</th></tr></thead><tbody>
<tr><td>0</td><td>5.14</td><td>1.00</td><td>0.00</td><td>0.00</td></tr>
<tr><td>10</td><td>8.34</td><td>2.47</td><td>1.22</td><td>0.37</td></tr>
<tr><td>20</td><td>14.83</td><td>6.40</td><td>5.39</td><td>2.87</td></tr>
<tr><td>25</td><td>20.72</td><td>10.66</td><td>10.88</td><td>6.77</td></tr>
<tr><td>30</td><td>30.14</td><td>18.40</td><td>22.40</td><td>15.67</td></tr>
<tr><td>35</td><td>46.12</td><td>33.30</td><td>48.03</td><td>37.15</td></tr>
<tr><td>40</td><td>75.31</td><td>64.20</td><td>109.41</td><td>93.69</td></tr>
</tbody><caption>\(N_q=e^{\pi\tan\phi'}\tan^2(45^\circ+\phi'/2)\); \(N_c=(N_q-1)\cot\phi'\); \(N_\gamma=2(N_q+1)\tan\phi'\) (Vesic) o \((N_q-1)\tan(1.4\phi')\) (Meyerhof). Elige un solo autor y sus factores de forma, profundidad e inclinación.</caption></table></div>

<h5>Presión neta y efecto del nivel freático</h5>
<p>La capacidad se plantea sobre la <strong>presión neta</strong>, descontando el peso del suelo excavado y reemplazado por la cimentación: \(q_{neta}=q-\gamma D_f\). Si el nivel freático está sobre el plano de cimentación, la sobrecarga \(q=\gamma D_f\) usa el peso unitario con la presión de poros; si está dentro de una profundidad \(B\) debajo de la base, el término \(\tfrac12\gamma BN_\gamma\) usa un peso unitario promedio entre \(\gamma\) y \(\gamma'\); si está más abajo no afecta.</p>

<h5>Cargas excéntricas</h5>
<p>Con una carga vertical \(P\) y un momento \(M\), la excentricidad es \(e=M/P\). La presión de contacto es trapezoidal si \(e\le B/6\) (todo el cimiento comprimido):</p>
<div class="dm-formula">\[
q_{max,min}=\frac{P}{BL}\left(1\pm\frac{6e}{B}\right),\qquad e\le\frac{B}{6}
\]</div>
<p>Si \(e>B/6\) aparece tracción en la base, que el suelo no puede resistir; se asume que el cimiento se levanta parcialmente y la distribución es triangular:</p>
<div class="dm-formula">\[
q_{max}=\frac{2P}{3L\left(\dfrac{B}{2}-e\right)},\qquad e>\frac{B}{6}
\]</div>
<p>Para la capacidad de carga se usa el <strong>ancho efectivo</strong> de Meyerhof \(B'=B-2e\) (y \(L'=L-2e_L\) si hay excentricidad en ambas direcciones), con \(q_u\) calculado en el área efectiva \(A'=B'L'\). El factor de seguridad se verifica contra la carga total: \(FS=q_uA'/P\).</p>

<h5>Factores de seguridad y tipos de verificación</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Falla por capacidad</b><p>Con cargas estáticas normales se usan valores típicos de 3 en suelos granulares y de 3 en arcillas con carga permanente; se reduce con cargas eventuales (viento, sismo), según los valores de la Tabla H.2.4-1 y H.4.7-1 de la NSR-10.</p></div>
    <div class="tn-mini"><b>Asentamientos</b><p>Con frecuencia es el criterio que manda en arcillas y arenas sueltas: la presión admisible es la menor entre la de falla y la que produce el asentamiento máximo permitido (NSR-10, H.4.2.3).</p></div>
    <div class="tn-mini"><b>Deslizamiento</b><p>\(FS=\dfrac{N\tan\delta+c_aA'}{H}\ge1.5\) con \(\delta\approx\tfrac23\phi'\) para concreto fundido contra suelo; el empuje pasivo solo se considera si hay confinamiento garantizado.</p></div>
    <div class="tn-mini"><b>Distorsión angular</b><p>Control del daño en elementos no estructurales: 1/500 a 1/300 es el límite típico para muros de mampostería; para estructuras de acero o concreto aporticadas suele ser 1/250 a 1/150.</p></div>
</div>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: zapata con momento</h5>
    <p>Zapata de \(B=L=2.0\ \text{m}\) con \(P=800\ \text{kN}\) y \(M=120\ \text{kN·m}\) en la dirección de \(B\).</p>
    <div class="dm-formula">\[
e=\frac{120}{800}=0.15\ \text{m}<\frac{B}{6}=0.33\ \text{m}\ \ \Rightarrow\ \ \text{toda la base comprimida}
\]</div>
    <div class="dm-formula">\[
q_{max}=\frac{800}{4}\left(1+\frac{6(0.15)}{2}\right)=290\ \text{kPa},\qquad
q_{min}=\frac{800}{4}\left(1-0.45\right)=110\ \text{kPa}
\]</div>
    <p>Si \(q_u=900\ \text{kPa}\) con \(FS=3\), \(q_{adm}=300\ \text{kPa}\ge q_{max}\) ✔. Con ancho efectivo \(B'=2.0-2(0.15)=1.7\ \text{m}\), la presión media sobre el área efectiva es \(800/(1.7\times2.0)=235\ \text{kPa}\).</p>
    <div class="tn-result">Resultado: <b>q<sub>max</sub> = 290 kPa</b>, <b>q<sub>min</sub> = 110 kPa</b>; cumple con \(q_{adm}=300\ \text{kPa}\) pero con poco margen: una pequeña variación del momento exige ensanchar la zapata.</div>
</div>

<div class="tn-note tn-norm"><b>Buenas prácticas.</b> Cimentar siempre sobre suelo natural o relleno controlado, nunca sobre materia orgánica ni relleno suelto. Mantener el nivel de desplante por debajo de la profundidad de variación estacional de humedad. Verificar la capacidad con parámetros drenados y no drenados y usar el menor resultado. Documentar el nivel freático de diseño.</div>
`
        },
        /* ───────────── MUROS ───────────── */
        {
            id: 'muros', after: 'empujes',
            title: 'Teorías de Rankine y Coulomb y estabilidad de muros de contención',
            html: S`
<p>El empuje de tierras depende de cuánto se mueve el muro. Si el muro no se mueve se desarrolla el estado <strong>en reposo</strong> (\(K_0\)); si se aleja del relleno hasta una deformación del orden de 0.1–0.5 % de la altura se alcanza el estado <strong>activo</strong> (\(K_a\), mínimo); si empuja contra el suelo, el <strong>pasivo</strong> (\(K_p\), máximo, que necesita desplazamientos 10 veces mayores).</p>

<h5>Rankine (muro liso, relleno horizontal)</h5>
<div class="dm-formula">\[
K_a=\tan^2\left(45^\circ-\frac{\phi'}{2}\right),\quad K_p=\tan^2\left(45^\circ+\frac{\phi'}{2}\right)=\frac{1}{K_a}
\]</div>
<div class="dm-formula">\[
\sigma_a=K_a\,\sigma'_v-2c'\sqrt{K_a},\qquad
\sigma_p=K_p\,\sigma'_v+2c'\sqrt{K_p}
\]</div>
<p>En un suelo con cohesión, la parte superior de la pared trabaja en tracción: el suelo tiende a separarse del muro formando una <strong>grieta de tracción</strong> hasta la profundidad:</p>
<div class="dm-formula">\[
z_c=\frac{2c'}{\gamma\sqrt{K_a}}\quad\left(=\frac{2c_u}{\gamma}\text{ si }\phi_u=0\right)
\]</div>
<p>En el diseño se desprecia la zona en tracción y se supone que la grieta se llena de agua (empuje hidrostático adicional).</p>

<h5>Sobrecarga, nivel freático y estratos</h5>
<ul>
<li><strong>Sobrecarga uniforme \(q\):</strong> añade un rectángulo de presión \(K_a q\) a lo largo de toda la altura; su resultante \(K_a qH\) actúa a \(H/2\).</li>
<li><strong>Nivel freático:</strong> bajo el agua se usa \(\gamma'\) y se suma el empuje hidrostático \(\tfrac12\gamma_wh_w^2\). Un drenaje deficiente puede duplicar el empuje: por eso todo muro debe tener lloraderas, filtro y dren de pie.</li>
<li><strong>Estratos:</strong> se calcula el esfuerzo vertical en cada capa y se aplica el \(K_a\) correspondiente; hay saltos de presión en los contactos.</li>
</ul>

<h5>Coulomb (muro rugoso, relleno inclinado)</h5>
<p>Coulomb plantea el equilibrio de una cuña de suelo. Con ángulo de fricción muro–suelo \(\delta\), inclinación del respaldo \(\theta\) (respecto a la vertical) e inclinación del relleno \(\beta\):</p>
<div class="dm-formula">\[
K_a=\frac{\cos^2(\phi'-\theta)}{\cos^2\theta\,\cos(\delta+\theta)\left[1+\sqrt{\dfrac{\sin(\phi'+\delta)\sin(\phi'-\beta)}{\cos(\delta+\theta)\cos(\theta-\beta)}}\right]^2}
\]</div>
<p>Con \(\theta=\beta=\delta=0\) se obtiene Rankine. El empuje actúa con inclinación \(\delta\) respecto a la normal del muro, y su componente vertical contribuye a la estabilidad. En el estado sísmico se usa el método pseudo-estático de Mononobe–Okabe, que añade coeficientes sísmicos horizontal y vertical a la cuña de Coulomb.</p>

<h5>Verificaciones de estabilidad externa</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Volcamiento</b><p>\(FS_{v}=\dfrac{\sum M_{resistentes}}{\sum M_{volcadores}}\), momentos respecto a la punta. Valor usual mínimo 2.0 con empuje activo.</p></div>
    <div class="tn-mini"><b>Deslizamiento</b><p>\(FS_d=\dfrac{\sum V\tan\delta_b+c_aB}{\sum H}\), usual mínimo 1.5. Se puede aumentar con un dentellón.</p></div>
    <div class="tn-mini"><b>Capacidad de carga</b><p>Presión en la base con excentricidad \(e=\dfrac{B}{2}-\dfrac{\sum M_R-\sum M_O}{\sum V}\le\dfrac{B}{6}\); \(FS_q\ge3\).</p></div>
    <div class="tn-mini"><b>Estabilidad global</b><p>Superficie de falla profunda que pasa por debajo del muro; se verifica con métodos de dovelas (\(FS\ge1.5\) estático).</p></div>
</div>
<p>Los valores anteriores son referencias frecuentes de la práctica. La NSR-10, Título H (Tabla H.6.9-1), fija los factores de seguridad mínimos del proyecto y las combinaciones de carga y sismo a considerar.</p>

<h5>Tipos de muro</h5>
<ul>
<li><strong>Gravedad:</strong> concreto ciclópeo, mampostería o gaviones; se estabiliza por peso propio. Económico hasta unos 3–4 m.</li>
<li><strong>En voladizo (en L o T invertida):</strong> concreto reforzado; el peso del relleno sobre el talón colabora. Hasta unos 6–8 m.</li>
<li><strong>Con contrafuertes:</strong> para alturas mayores; el muro trabaja como losa apoyada en los contrafuertes.</li>
<li><strong>Suelo reforzado (geosintéticos o tiras metálicas) y tierra armada:</strong> el relleno compactado con refuerzos actúa como un bloque gravedad.</li>
</ul>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: empuje con sobrecarga</h5>
    <p>Muro de \(H=5\ \text{m}\), relleno con \(\phi'=32^\circ\), \(\gamma=18\ \text{kN/m}^3\), sobrecarga \(q=10\ \text{kPa}\), sin nivel freático.</p>
    <div class="dm-formula">\[
K_a=\tan^2(29^\circ)=0.307
\]</div>
    <div class="dm-formula">\[
P_{a1}=\tfrac12K_a\gamma H^2=\tfrac12(0.307)(18)(5)^2=69.1\ \text{kN/m}\ \ (\text{a }H/3=1.67\ \text{m})
\]</div>
    <div class="dm-formula">\[
P_{a2}=K_aqH=0.307(10)(5)=15.4\ \text{kN/m}\ \ (\text{a }H/2=2.5\ \text{m})
\]</div>
    <div class="dm-formula">\[
P_a=84.5\ \text{kN/m},\qquad M_O=69.1(1.67)+15.4(2.5)=153.6\ \text{kN·m/m}
\]</div>
    <div class="tn-result">Resultado: <b>P<sub>a</sub> ≈ 84.5 kN/m</b>, con momento volcador respecto a la base <b>≈ 154 kN·m/m</b>.</div>
</div>
<div class="tn-example">
    <h5><span>2</span>Ejemplo: corte en arcilla (φ<sub>u</sub> = 0)</h5>
    <p>Pared de \(H=6\ \text{m}\) en arcilla con \(c_u=20\ \text{kPa}\) y \(\gamma=18\ \text{kN/m}^3\). \(K_a=1\):</p>
    <div class="dm-formula">\[
z_c=\frac{2(20)}{18}=2.22\ \text{m},\qquad
\sigma_a(H)=18(6)-2(20)=68\ \text{kPa},\qquad
P_a=\tfrac12(68)(6-2.22)=128.5\ \text{kN/m}
\]</div>
    <div class="tn-result">Resultado: <b>P<sub>a</sub> ≈ 128 kN/m</b> si se desprecia la zona en tracción; con grieta llena de agua habría que añadir \(\tfrac12(9.81)(2.22)^2=24\ \text{kN/m}\).</div>
</div>

<div class="tn-note tn-warn"><b>Drenaje y relleno.</b> La mayoría de los muros fallan por exceso de agua, no por mal cálculo del suelo. Usa relleno granular, geotextil de filtro, dren longitudinal con tubería perforada y lloraderas cada 2–3 m. Si el relleno es arcilloso, diseña con parámetros no drenados y presión hidrostática completa.</div>
`
        },
        /* ───────────── EXCAVACIONES ───────────── */
        {
            id: 'excavaciones', after: 'muros',
            title: 'Excavaciones, pantallas y tablestacas',
            html: S`
<p>Una excavación profunda en zona urbana debe sostenerse con pantallas flexibles (tablestacas, pilas, muro pantalla, muros berlinés) apoyadas por puntales, anclajes o por empotramiento. El empuje que actúa sobre estos sistemas <strong>no</strong> sigue el triángulo de Rankine, porque el movimiento de la pantalla es limitado y no uniforme: se redistribuye hacia los apoyos.</p>

<h5>Diagramas aparentes de empuje (Peck, Terzaghi y Peck)</h5>
<p>Para cortes apuntalados se usan diagramas rectangulares o trapezoidales de “empuje aparente”, deducidos de mediciones de carga en puntales:</p>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Suelo</th><th>Presión máxima</th><th>Fuerza total</th></tr></thead><tbody>
<tr><td>Arenas</td><td>\(p=0.65\,K_a\,\gamma H\)</td><td>\(P=0.65\,K_a\,\gamma H^2\)</td></tr>
<tr><td>Arcillas blandas a medias (\(\gamma H/c_u>4\))</td><td>\(p=\gamma H\left(1-\dfrac{4c_u}{\gamma H}\right)\), mínimo \(0.3\gamma H\)</td><td>\(P=p\,H\) (aprox.)</td></tr>
<tr><td>Arcillas duras fisuradas (\(\gamma H/c_u\le4\))</td><td>\(p=0.2\gamma H\) a \(0.4\gamma H\)</td><td>\(P=p\,H\)</td></tr>
</tbody><caption>Peck (1969). Para el diseño de cada nivel de puntales se reparte la carga con el método de áreas tributarias (articulando el diagrama en cada apoyo).</caption></table></div>

<h5>Pantalla en voladizo y con apoyos</h5>
<ul>
<li><strong>En voladizo:</strong> la pantalla se empotra por debajo del fondo de excavación. Se determina la profundidad de empotramiento \(D\) igualando momentos del empuje activo (lado excavado vs trasdós) y se aumenta de 20 a 40 % por seguridad. Solo es viable en excavaciones de poca altura (≈ 4–5 m).</li>
<li><strong>Con un nivel de anclaje o puntal:</strong> método del apoyo libre o del apoyo fijo; el momento máximo es mucho menor y se pueden alcanzar alturas mayores.</li>
<li><strong>Con varios niveles:</strong> se analizan por etapas de excavación, porque cada instalación de puntal fija la deformación alcanzada hasta ese momento (modelos de viga sobre apoyos elásticos o elementos finitos).</li>
</ul>

<h5>Estabilidad del fondo de la excavación</h5>
<p>En arcillas blandas, el suelo bajo el fondo puede levantarse y la pantalla desplazarse hacia dentro (<strong>falla de fondo</strong> o levantamiento). El factor de seguridad (Terzaghi; Bjerrum y Eide) es:</p>
<div class="dm-formula">\[
FS_{fondo}=\frac{N_c\,c_u}{\gamma H+q},\qquad N_c\approx5.7\ \text{a }9\ (\text{según }H/B\text{ y la geometría})
\]</div>
<p>Si \(FS<1.5\) hay que profundizar la pantalla, reducir la etapa de excavación o mejorar el suelo. En arenas bajo el nivel freático el peligro es el <strong>sifonamiento</strong> (gradiente de salida cercano a 1, véase flujo en MS I) y la <strong>subpresión</strong> en el fondo (\(FS=\gamma_{sat}h/(\gamma_wh_w)\)).</p>

<h5>Control de deformaciones</h5>
<p>Los asentamientos del terreno vecino son más críticos que la falla: hay que instrumentar (inclinómetros, topografía de precisión, piezómetros, celdas de carga) y definir umbrales de alerta. Como orden de magnitud, el asentamiento máximo detrás de la pantalla se sitúa entre 0.1 % y 0.5 % de la altura en suelos firmes y puede superar el 2 % en arcillas blandas mal controladas.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: fuerza de puntales en arena</h5>
    <p>Excavación de \(H=6\ \text{m}\) en arena con \(\phi'=32^\circ\) y \(\gamma=18\ \text{kN/m}^3\) (\(K_a=0.307\)).</p>
    <div class="dm-formula">\[
p=0.65K_a\gamma H=0.65(0.307)(18)(6)=21.6\ \text{kPa},\qquad
P=pH=129.4\ \text{kN/m}
\]</div>
    <p>Si los puntales se colocan cada 3 m en planta, cada línea de puntales soporta en total \(129.4\times3=388\ \text{kN}\), que se reparte entre los niveles de puntales según el área tributaria de cada uno.</p>
    <div class="tn-result">Resultado: <b>p ≈ 21.6 kPa uniforme</b>, empuje total <b>≈ 129 kN por metro de pantalla</b>.</div>
</div>

<div class="tn-note tn-norm"><b>Aspectos normativos.</b> En Colombia, las excavaciones profundas y las medianerías se rigen por el Título H de la NSR-10 (muros de contención y excavaciones) y requieren estudio geotécnico específico, diseño del sistema de soporte y plan de monitoreo. El constructor debe vigilar los efectos sobre las edificaciones vecinas desde antes de excavar (actas de vecindad).</div>
`
        },
        /* ───────────── LICUACIÓN ───────────── */
        {
            id: 'licuacion', after: 'taludes',
            title: 'Efectos sísmicos: licuación y respuesta del terreno',
            html: S`
<p>Durante un sismo, las ondas inducen esfuerzos cíclicos de corte en el suelo. En arenas sueltas y limos no plásticos saturados, esa carga rápida no deja salir el agua: el suelo intenta contraerse, la presión de poros aumenta y el esfuerzo efectivo cae hasta anularse. Es la <strong>licuación</strong>: el suelo pierde resistencia y se comporta como un líquido (Niigata 1964, Kobe 1995, Armenia 1999 en Colombia).</p>

<h5>Condiciones de susceptibilidad</h5>
<ul>
<li>Suelo <strong>saturado</strong> (nivel freático cercano, normalmente menos de 10–15 m).</li>
<li>Arenas y limos de baja plasticidad, de compacidad suelta a media; gradaciones uniformes; granos redondeados.</li>
<li>Sismo de magnitud suficiente y duración larga (Mw ≥ 5.5) con aceleraciones significativas en superficie.</li>
<li>Poco confinamiento (profundidades menores de 20 m) y sin cementación.</li>
</ul>
<p>Las gravas pueden licuarse si están confinadas por capas impermeables. Las arcillas con IP mayor de 15 % y las arcillas sensibles se evalúan con otros criterios (ablandamiento cíclico).</p>

<h5>Método simplificado de Seed e Idriss (NCEER, Youd et al. 2001)</h5>
<p>Se compara la <strong>demanda sísmica</strong> (CSR) con la <strong>resistencia cíclica</strong> del suelo (CRR) a cada profundidad:</p>
<div class="dm-formula">\[
CSR=0.65\,\frac{a_{max}}{g}\,\frac{\sigma_v}{\sigma'_v}\,r_d,\qquad
r_d=\begin{cases}1-0.00765\,z & z\le9.15\ \text{m}\\ 1.174-0.0267\,z & 9.15<z\le23\ \text{m}\end{cases}
\]</div>
<p>\(a_{max}\) es la aceleración pico en superficie (incluyendo amplificación del suelo), \(\sigma_v\) y \(\sigma'_v\) los esfuerzos total y efectivo a la profundidad \(z\) (m) y \(r_d\) el factor de reducción por flexibilidad de la columna de suelo. La resistencia se obtiene del SPT corregido y limpio de finos \((N_1)_{60cs}\); para \((N_1)_{60cs}<30\), una buena aproximación (Rauch) del CRR para sismos de Mw = 7.5 es:</p>
<div class="dm-formula">\[
CRR_{7.5}=\frac{1}{34-(N_1)_{60}}+\frac{(N_1)_{60}}{135}+\frac{50}{\left[10(N_1)_{60}+45\right]^2}-\frac{1}{200}
\]</div>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>(N<sub>1</sub>)<sub>60cs</sub></th><th>5</th><th>10</th><th>15</th><th>20</th><th>25</th></tr></thead><tbody>
<tr><td>CRR<sub>7.5</sub></td><td>0.072</td><td>0.113</td><td>0.160</td><td>0.215</td><td>0.292</td></tr>
</tbody><caption>Para (N₁)₆₀ ≥ 30 la arena se considera no licuable en este método. La corrección por contenido de finos aumenta \((N_1)_{60}\) en arenas limosas.</caption></table></div>
<p>El factor de seguridad frente a la licuación se corrige por la magnitud del sismo mediante el factor de escala \(MSF\) (\(=1.0\) para \(M_w=7.5\), mayor para sismos menores):</p>
<div class="dm-formula">\[
FS_{liq}=\frac{CRR_{7.5}}{CSR}\,MSF\ \ \ (FS<1\Rightarrow\text{licúa};\ \text{se exige}\ FS\ge1.2\text{ a }1.3\text{ en obras importantes})
\]</div>

<h5>Consecuencias y mitigación</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Efectos</b><p>Volcanes de arena, asentamientos y pérdida de capacidad de carga, desplazamiento lateral (<em>lateral spreading</em>) en taludes suaves, flotación de tanques enterrados y fallas de presas de relaves.</p></div>
    <div class="tn-mini"><b>Mitigación</b><p>Densificación (compactación dinámica, vibroflotación, columnas de grava), drenaje (drenes verticales), inyecciones, reemplazo de suelo, cimentaciones profundas hasta estratos no licuables o rigidización de la cimentación.</p></div>
</div>

<h5>Amplificación y clasificación del sitio</h5>
<p>Los suelos blandos amplifican la señal sísmica: el espectro de diseño cambia con el tipo de perfil. La NSR-10 (Título A) define tipos de perfil A a F según la velocidad de onda de corte promedio en los 30 m superiores \(\bar V_s\), el SPT promedio o la resistencia no drenada, y define los coeficientes de amplificación \(F_a\) y \(F_v\). Los perfiles tipo F (licuables, turbas, arcillas muy blandas) exigen un estudio de respuesta de sitio específico.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: evaluación a 6 m en arena saturada</h5>
    <p>\(a_{max}=0.25g\), \(M_w=7.5\), profundidad 6 m con \(\sigma_v=110\ \text{kPa}\), \(\sigma'_v=70\ \text{kPa}\) y \((N_1)_{60cs}=15\).</p>
    <div class="dm-formula">\[
r_d=1-0.00765(6)=0.954,\qquad
CSR=0.65(0.25)\frac{110}{70}(0.954)=0.244
\]</div>
    <div class="dm-formula">\[
CRR_{7.5}=0.160\ \ \Rightarrow\ \ FS_{liq}=\frac{0.160}{0.244}=0.66
\]</div>
    <div class="tn-result">Resultado: <b>FS = 0.66 &lt; 1</b>: el estrato <b>se licúa</b>. Hay que mejorar el suelo o cimentar por debajo de él.</div>
</div>

<div class="tn-note tn-norm"><b>Normativa.</b> El Título H de la NSR-10 incluye un capítulo sobre efectos sísmicos (licuación, movimientos en masa y amplificación) y exige evaluar la susceptibilidad cuando el perfil contiene suelos granulares saturados sueltos. Las microzonificaciones sísmicas de cada ciudad (por ejemplo Bogotá, Medellín) pueden fijar parámetros más estrictos.</div>
`
        },
        /* ───────────── MEJORAMIENTO ───────────── */
        {
            id: 'mejoramiento', after: 'licuacion',
            title: 'Mejoramiento y estabilización de suelos',
            html: S`
<p>Cuando el suelo natural no cumple con la capacidad de carga, los asentamientos o la permeabilidad requeridos, hay tres opciones: <strong>reemplazarlo</strong>, <strong>cambiar el proyecto</strong> (cimentación profunda, estructura más liviana) o <strong>mejorarlo</strong>. La técnica correcta depende del tipo de suelo, de la profundidad del problema y del plazo disponible.</p>

<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Técnica</th><th>Suelos aplicables</th><th>Profundidad</th><th>Qué logra</th></tr></thead><tbody>
<tr><td>Compactación superficial (rodillos)</td><td>Rellenos, granulares y finos con humedad controlada</td><td>0.2 – 0.5 m por capa</td><td>Aumenta densidad y resistencia, reduce permeabilidad</td></tr>
<tr><td>Compactación dinámica</td><td>Granulares sueltos, rellenos heterogéneos</td><td>hasta 10 – 12 m</td><td>Densifica con caída de masas de 10–40 t</td></tr>
<tr><td>Vibroflotación / vibrocompactación</td><td>Arenas limpias</td><td>hasta 20 m</td><td>Aumenta \(D_r\) y reduce licuación</td></tr>
<tr><td>Columnas de grava</td><td>Arenas limosas y arcillas blandas</td><td>hasta 20 m</td><td>Refuerzo, drenaje y mitigación de licuación</td></tr>
<tr><td>Precarga con drenes verticales</td><td>Arcillas y turbas blandas</td><td>según espesor</td><td>Acelera la consolidación y reduce asentamientos posteriores</td></tr>
<tr><td>Estabilización con cal</td><td>Arcillas plásticas (IP &gt; 10 %)</td><td>0.2 – 0.4 m en subrasantes; columnas en profundidad</td><td>Reduce plasticidad y expansión, sube la resistencia y el CBR</td></tr>
<tr><td>Estabilización con cemento</td><td>Arenas, gravas y limos de baja plasticidad</td><td>0.2 – 0.4 m</td><td>Aumenta resistencia a la compresión y durabilidad</td></tr>
<tr><td>Inyecciones y jet grouting</td><td>Casi todos los suelos</td><td>variable</td><td>Reduce permeabilidad y cementa localmente</td></tr>
<tr><td>Geosintéticos y suelo reforzado</td><td>Rellenos, terraplenes sobre suelos blandos</td><td>capas</td><td>Aumenta estabilidad, controla deformaciones y mejora la distribución de carga</td></tr>
</tbody><caption>Resumen de aplicabilidad (Holtz y Kovacs; Mitchell; INVIAS). Las profundidades dependen del equipo y deben validarse con ensayos de campo antes y después del tratamiento.</caption></table></div>

<h5>Estabilización química de subrasantes</h5>
<ul>
<li><strong>Cal (viva o hidratada):</strong> primero modifica el suelo por intercambio catiónico y floculación (reduce IP y facilita compactar de inmediato); luego, con tiempo, reacciones puzolánicas forman gel cementante que sube la resistencia. Dosis típicas: 2–6 % en masa de suelo seco.</li>
<li><strong>Cemento:</strong> actúa por hidratación; es eficaz si el suelo tiene poca arcilla y materia orgánica. Dosis típicas: 5–12 %. La resistencia a compresión inconfinada a 7 días (por ejemplo, 1.4–3.5 MPa) es un criterio de aceptación habitual.</li>
<li><strong>Cenizas volantes, escorias y emulsiones asfálticas:</strong> alternativas según la química del suelo.</li>
</ul>
<p>El diseño de la mezcla se hace en laboratorio con Proctor y compresión inconfinada para varias dosificaciones, ensayos de durabilidad (humedecimiento–secado) y CBR; la cantidad óptima es la mínima que cumple los requisitos.</p>

<h5>Precarga y consolidación acelerada</h5>
<p>Se coloca temporalmente una sobrecarga \(\Delta\sigma_s\) mayor que la carga de servicio \(\Delta\sigma_p\) para que el asentamiento primario ocurra antes de construir. El criterio es que, al retirar la precarga, el suelo quede en estado sobreconsolidado bajo la carga final. La eficacia se verifica con placas de asentamiento y piezómetros.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: dosificación de cal</h5>
    <p>Para un lote de 1 000 m² de subrasante estabilizada con cal al 4 % (masa de suelo seco), espesor 0.30 m y \(\gamma_d=17\ \text{kN/m}^3\) (≈ 1 733 kg/m³):</p>
    <div class="dm-formula">\[
V=1000(0.30)=300\ \text{m}^3,\qquad M_{suelo}=300(1733)=520\ \text{t}
\]</div>
    <div class="dm-formula">\[
M_{cal}=0.04(520)=20.8\ \text{t}\ \ (\approx 69\ \text{kg/m}^2)
\]</div>
    <div class="tn-result">Resultado: <b>≈ 21 t de cal</b> para el tramo; añade un 10 % por pérdidas y haz una prueba de campo antes de extender el tratamiento.</div>
</div>

<div class="tn-note tn-warn"><b>Verificación del mejoramiento.</b> Toda mejora debe comprobarse con ensayos posteriores (SPT, CPT, placa de carga, densidad en sitio o ensayos de laboratorio sobre núcleos) y comparar con las metas de diseño. Sin un ensayo de verificación, el mejoramiento es solo una suposición.</div>
`
        }
    ];

    global.TN_ADD('ms2', sec, {
        bib: [
            'Holtz, R. D., Kovacs, W. D. y Sheahan, T. C. <em>An Introduction to Geotechnical Engineering</em>, 2.ª ed. Pearson (esfuerzos, consolidación, mejoramiento).',
            'Youd, T. L. et al. (2001). <em>Liquefaction Resistance of Soils: Summary Report from the 1996 NCEER and 1998 NCEER/NSF Workshops</em>. J. Geotech. Geoenviron. Eng., ASCE, 127(10).',
            'Ladd, C. C. y Foott, R. (1974). <em>New Design Procedure for Stability of Soft Clays</em> (SHANSEP). J. Geotech. Eng. Div., ASCE.',
            'Bolton, M. D. (1986). <em>The strength and dilatancy of sands</em>. Géotechnique, 36(1).',
            'Peck, R. B. (1969). <em>Deep excavations and tunneling in soft ground</em>. 7th ICSMFE, State-of-the-Art Volume.',
            'NSR-10, Título A (efectos sísmicos y perfiles de suelo) y Título H (cimentaciones, muros, taludes y efectos sísmicos del suelo).'
        ]
    });
})(window);
