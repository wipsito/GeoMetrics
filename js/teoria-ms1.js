/* =========================================================
   GeoMetrics — Teoría de Mecánica de Suelos I
   Contenido con enfoque normativo colombiano (NTC / INVIAS / NSR-10)
   Las ecuaciones se escriben entre \[ ... \] y \( ... \); el
   renderizador de teoria-normas.js las convierte con KaTeX.
   ========================================================= */
(function (global) {
    'use strict';
    var S = String.raw;
    global.TN_MODULES = global.TN_MODULES || {};

    global.TN_MODULES.ms1 = {
        key: 'ms1',
        host: 'ms1-teoria',
        screen: 'pantallaSuelos',
        tab: 'ms1-ensayos',
        prefix: 'ms1',
        eyebrow: 'Mecánica de Suelos I · Laboratorio y control',
        title: 'Del suelo trifásico al control de compactación en obra',
        desc: 'Una ruta completa por los ensayos de laboratorio que sostienen la práctica geotécnica colombiana: humedad, granulometría, límites, gravedad específica, Proctor, densidad de campo, permeabilidad y clasificación SUCS. Cada tema incluye la ecuación, su interpretación, un ejemplo resuelto y la norma que lo respalda.',
        tags: ['NTC 1495', 'NTC 1522', 'NTC 4630', 'NTC 1504', 'NTC 1667', 'INVIAS E-122 a E-164', 'NSR-10 Título H'],
        stats: [
            ['8', 'ensayos de laboratorio'],
            ['10', 'secciones de teoría'],
            ['4', 'familias de normas'],
            ['100 %', 'ecuaciones renderizadas']
        ],
        scope: '<b>Alcance.</b> Este material es didáctico y sigue los procedimientos generales de las normas citadas. Antes de un diseño real, consulta la edición vigente de cada NTC, el manual de normas de ensayo de INVIAS y los requisitos particulares del proyecto. Las tolerancias y temperaturas pueden cambiar entre ediciones.',
        route: [
            { t: 'Contenido de humedad', d: 'Masa de agua / masa de sólidos', go: 'humedad' },
            { t: 'Granulometría', d: 'Curva acumulada, D10, D30, D60', go: 'granulometria' },
            { t: 'Límites de Atterberg', d: 'LL, LP, IP y carta de plasticidad', go: 'limites' },
            { t: 'Gravedad específica', d: 'Densidad relativa de los sólidos', go: 'gravedad' },
            { t: 'Compactación Proctor', d: 'Curva γd–w y energía de compactación', go: 'compactacion' },
            { t: 'Densidad de campo', d: 'Cono de arena y grado de compactación', go: 'densidad' },
            { t: 'Permeabilidad', d: 'Ley de Darcy y gradiente crítico', go: 'permeabilidad' },
            { t: 'Clasificación SUCS', d: 'Símbolo, grupo y uso ingenieril', go: 'clasificacion' }
        ],
        sections: [
            {
                id: 'panorama',
                title: 'El suelo como sistema trifásico',
                html: S`
<p>La mecánica de suelos estudia el comportamiento del suelo como material de construcción y como soporte de las obras. A diferencia del acero o del concreto, el suelo es un material <strong>natural, heterogéneo y trifásico</strong>: partículas minerales u orgánicas (sólidos), agua (fase líquida) y aire u otros gases (fase gaseosa). La proporción entre esas fases explica por qué dos suelos con la misma granulometría pueden tener resistencias, permeabilidades y deformabilidades muy distintas.</p>

<div class="tn-grid">
    <div class="tn-mini"><b>Fase sólida</b><p>Granos minerales, materia orgánica y sales. Su tamaño, forma y composición definen la granulometría, la plasticidad y la gravedad específica.</p></div>
    <div class="tn-mini"><b>Fase líquida</b><p>Agua libre, agua capilar y agua adsorbida. Controla la succión, la consistencia, la compactación y el flujo.</p></div>
    <div class="tn-mini"><b>Fase gaseosa</b><p>Aire o gases en los vacíos no ocupados por agua. Su presencia hace que el suelo sea parcialmente saturado y compresible.</p></div>
</div>

<p>El modelo de fases permite definir relaciones volumétricas y gravimétricas que se usan en todos los ensayos posteriores. En la práctica se adopta la densidad del agua \(\gamma_w = 9.81\ \text{kN/m}^3\) (o \(\rho_w = 1000\ \text{kg/m}^3\)) y se trabaja con masas o pesos secos, porque el agua es variable y los sólidos son la parte estable.</p>

<div class="dm-formula">\[
w=\frac{W_w}{W_s}\times 100=\frac{M_w}{M_s}\times 100
\]</div>

<div class="dm-formula">\[
e=\frac{V_v}{V_s},\qquad n=\frac{V_v}{V_t}=\frac{e}{1+e},\qquad e=\frac{n}{1-n}
\]</div>

<div class="dm-formula">\[
S=\frac{V_w}{V_v}\times 100 \qquad\Longrightarrow\qquad S\,e=w\,G_s
\]</div>

<p>En la última expresión, \(S\) se usa como fracción (0 a 1) y \(w\) como fracción; si se trabaja en porcentaje hay que dividir por 100. La gravedad específica de los sólidos se define como:</p>

<div class="dm-formula">\[
G_s=\frac{\gamma_s}{\gamma_w}=\frac{\rho_s}{\rho_w}
\]</div>

<p>Con estas definiciones se obtienen las relaciones más usadas para convertir pesos unitarios:</p>

<div class="tn-formulas">
    <div>\[ \gamma=\frac{W}{V} \]<small>Peso unitario total (húmedo)</small></div>
    <div>\[ \gamma_d=\frac{W_s}{V}=\frac{\gamma}{1+w} \]<small>Peso unitario seco</small></div>
    <div>\[ \gamma_d=\frac{G_s\gamma_w}{1+e} \]<small>Relación con el índice de vacíos</small></div>
    <div>\[ \gamma_{sat}=\frac{(G_s+e)\gamma_w}{1+e} \]<small>Suelo saturado</small></div>
    <div>\[ \gamma'=\gamma_{sat}-\gamma_w \]<small>Peso unitario sumergido</small></div>
    <div>\[ \gamma=\frac{G_s\gamma_w(1+w)}{1+e} \]<small>Peso unitario húmedo</small></div>
</div>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: relaciones de fase</h5>
    <p>Una muestra de arena tiene \(e=0.65\), \(G_s=2.68\) y \(w=15\,\%\). Calcula el grado de saturación, el peso unitario seco y el peso unitario húmedo.</p>
    <div class="dm-formula">\[
S=\frac{wG_s}{e}=\frac{0.15(2.68)}{0.65}=0.618\approx 61.8\,\%
\]</div>
    <div class="dm-formula">\[
\gamma_d=\frac{2.68(9.81)}{1+0.65}=15.94\ \text{kN/m}^3
\]</div>
    <div class="dm-formula">\[
\gamma=\gamma_d(1+w)=15.94(1+0.15)=18.33\ \text{kN/m}^3
\]</div>
    <div class="tn-result">Resultado: <b>S ≈ 61.8 %</b>, <b>γd ≈ 15.94 kN/m³</b>, <b>γ ≈ 18.33 kN/m³</b></div>
</div>

<div class="tn-note tn-norm"><b>Norma y alcance.</b> Las relaciones de fase no son una norma de ensayo: son el lenguaje común para interpretar NTC 1495, NTC 1522, NTC 4630, NTC 1504 y los ensayos INVIAS. Reporta siempre las unidades y la temperatura del agua cuando la precisión lo exija.</div>

<h5>Valores típicos para una primera comprobación</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Suelo</th><th>Gs típico</th><th>e típico</th><th>γd típico (kN/m³)</th><th>Observación</th></tr></thead>
<tbody>
<tr><td>Grava limpia</td><td>2.65 – 2.72</td><td>0.35 – 0.70</td><td>17 – 21</td><td>Alta permeabilidad y baja retención de agua</td></tr>
<tr><td>Arena limpia</td><td>2.64 – 2.70</td><td>0.45 – 0.80</td><td>15 – 19</td><td>El γd depende mucho del grado de compactación</td></tr>
<tr><td>Limo</td><td>2.65 – 2.72</td><td>0.60 – 1.10</td><td>13 – 17</td><td>Puede ser colapsable o susceptible a la erosión</td></tr>
<tr><td>Arcilla</td><td>2.70 – 2.85</td><td>0.70 – 1.50</td><td>12 – 17</td><td>La plasticidad y la historia de esfuerzos mandan</td></tr>
<tr><td>Turba / orgánico</td><td>1.40 – 2.00</td><td>2.0 – 8.0</td><td>5 – 11</td><td>Altamente compresible; requiere tratamiento especial</td></tr>
</tbody>
<caption>Órdenes de magnitud orientativos, no valores de diseño. Verifica con ensayos del sitio.</caption>
</table></div>
`
            },
            {
                id: 'humedad',
                title: 'Contenido de humedad: la medida que acompaña todo el laboratorio',
                html: S`
<p>El contenido de humedad es la relación entre la masa de agua y la masa de sólidos. Es el ensayo más simple y, a la vez, el más transversal: sin \(w\) no se puede convertir un peso unitario húmedo en seco, interpretar una curva de compactación o controlar un terraplén. En Colombia se ejecuta con <strong>NTC 1495</strong>, <strong>INVIAS E-122</strong> y, como referencia internacional, <strong>ASTM D2216</strong>.</p>

<div class="dm-formula">\[
w=\frac{M_w}{M_s}\times 100=\frac{M_{húmeda}-M_{seca}}{M_{seca}-M_{recipiente}}\times 100
\]</div>

<h5>Procedimiento esencial</h5>
<ol>
    <li>Pesa el recipiente limpio y seco: \(M_r\).</li>
    <li>Coloca la muestra representativa y pesa el conjunto húmedo: \(M_{h+r}\).</li>
    <li>Seca en horno a \(110\pm5\ ^\circ\text{C}\) hasta masa constante. Para suelos con yeso, materia orgánica o ciertos minerales, la norma puede exigir una temperatura menor o un método alterno.</li>
    <li>Enfría en desecador y pesa el conjunto seco: \(M_{s+r}\).</li>
    <li>Calcula y reporta con la precisión indicada por la norma; normalmente se informa al 0.1 % y se verifica con duplicados.</li>
</ol>

<div class="tn-example">
    <h5><span>2</span>Ejemplo: humedad gravimétrica</h5>
    <p>Recipiente: \(M_r=52.3\ \text{g}\). Muestra húmeda + recipiente: \(M_{h+r}=512.4\ \text{g}\). Muestra seca + recipiente: \(M_{s+r}=478.9\ \text{g}\).</p>
    <div class="dm-formula">\[
M_w=512.4-478.9=33.5\ \text{g},\qquad M_s=478.9-52.3=426.6\ \text{g}
\]</div>
    <div class="dm-formula">\[
w=\frac{33.5}{426.6}\times 100=7.85\,\%
\]</div>
    <div class="tn-result">Resultado: <b>w ≈ 7.9 %</b></div>
</div>

<div class="tn-note tn-warn"><b>Error frecuente.</b> Restar el recipiente dos veces o usar la masa total húmeda como denominador. La humedad se calcula siempre sobre la masa de sólidos secos, no sobre la masa total. Un error de 1 % en \(w\) puede cambiar el grado de compactación en varios puntos porcentuales.</div>

<h5>Cuidados que cambian el resultado</h5>
<ul>
    <li><strong>Representatividad:</strong> toma porciones de varios puntos y tamaños; en suelos heterogéneos, reduce por cuarteo.</li>
    <li><strong>Pérdida de agua:</strong> evita exposición prolongada al aire y usa recipientes con tapa durante el pesaje.</li>
    <li><strong>Masa constante:</strong> dos pesadas consecutivas con diferencia despreciable; no basta con un tiempo fijo.</li>
    <li><strong>Suelos especiales:</strong> yeso, calizas, suelos orgánicos y algunos sulfuros pueden oxidarse o deshidratarse; sigue el método alterno de la norma.</li>
    <li><strong>Unidades:</strong> la humedad es adimensional; se reporta en porcentaje y no se confunde con la humedad de saturación.</li>
</ul>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 1495 (método de ensayo para determinar el contenido de agua de los suelos); INVIAS E-122; ASTM D2216. En obra, la humedad también puede estimarse con métodos nucleares o eléctricos, pero deben calibrarse contra el método de horno.</div>
`
            },
            {
                id: 'granulometria',
                title: 'Granulometría: cómo leer una curva y obtener D10, D30 y D60',
                html: S`
<p>La granulometría describe la distribución de tamaños de las partículas. Se realiza por tamizado para la fracción gruesa y, cuando hay suficientes finos, por sedimentación (hidrómetro) para la fracción que pasa el tamiz de 75 µm. En Colombia se cita <strong>NTC 1522</strong>, <strong>INVIAS E-123</strong> y, para agregados y prácticas internacionales, <strong>ASTM D6913</strong> y <strong>ASTM D7928</strong>.</p>

<h5>Cálculos básicos</h5>
<div class="dm-formula">\[
\%\ \text{retenido}_i=\frac{M_i}{M_{total}}\times 100
\]</div>
<div class="dm-formula">\[
\%\ \text{retenido acumulado}_i=\sum_{j=1}^{i}\%R_j,\qquad
\%\ \text{pasa}_i=100-\%R_{acum,i}
\]</div>
<p>Para leer la curva se grafica el porcentaje que pasa en escala aritmética contra la abertura del tamiz en escala logarítmica. Los diámetros característicos \(D_{10}\), \(D_{30}\) y \(D_{60}\) son las aberturas para las cuales pasa el 10 %, 30 % y 60 % de la muestra, respectivamente. Se interpolan en la curva.</p>

<div class="dm-formula">\[
C_u=\frac{D_{60}}{D_{10}},\qquad
C_c=\frac{D_{30}^{2}}{D_{10}\,D_{60}}
\]</div>

<p>El coeficiente de uniformidad \(C_u\) mide el rango de tamaños; el coeficiente de curvatura \(C_c\) indica si la curva tiene una forma equilibrada. Una arena se considera bien graduada cuando \(C_u\ge 6\) y \(1<C_c<3\). Una grava se considera bien graduada cuando \(C_u\ge 4\) y \(1<C_c<3\). Para suelos con finos, además hay que cumplir los criterios de la clasificación SUCS.</p>

<div class="tn-example">
    <h5><span>3</span>Ejemplo: coeficientes de una arena</h5>
    <p>De la curva granulométrica se obtiene \(D_{10}=0.15\ \text{mm}\), \(D_{30}=0.45\ \text{mm}\) y \(D_{60}=1.20\ \text{mm}\).</p>
    <div class="dm-formula">\[
C_u=\frac{1.20}{0.15}=8.0,\qquad
C_c=\frac{0.45^2}{0.15(1.20)}=\frac{0.2025}{0.18}=1.13
\]</div>
    <div class="tn-result">Resultado: <b>Cu = 8.0</b> y <b>Cc = 1.13</b>. Si la muestra es limpia (sin finos), cumple los criterios de arena bien graduada (SW).</div>
</div>

<h5>Escala de tamaños y fracciones</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Fracción</th><th>Intervalo aproximado</th><th>Tamices de referencia</th><th>Observación</th></tr></thead>
<tbody>
<tr><td>Grava</td><td>4.75 mm – 75 mm</td><td>N.º 4 a 3"</td><td>Gruesa &gt; 19 mm; fina 4.75 – 19 mm</td></tr>
<tr><td>Arena</td><td>0.075 mm – 4.75 mm</td><td>N.º 200 a N.º 4</td><td>Gruesa 2.0 – 4.75; media 0.425 – 2.0; fina 0.075 – 0.425 mm</td></tr>
<tr><td>Finos (limo + arcilla)</td><td>&lt; 0.075 mm</td><td>Pasa N.º 200</td><td>Se separan por límites de Atterberg, no solo por tamaño</td></tr>
<tr><td>Grava gruesa</td><td>19 – 75 mm</td><td>3/4" a 3"</td><td>Puede requerir corrección por sobretamaños</td></tr>
</tbody>
</table></div>

<h5>Sedimentación: ley de Stokes</h5>
<p>Para partículas finas se usa la velocidad de caída en agua. Bajo las hipótesis de Stokes (partícula esférica, flujo laminar, baja concentración):</p>
<div class="dm-formula">\[
v=\frac{(\gamma_s-\gamma_w)D^2}{18\eta}
\qquad\Longrightarrow\qquad
D=\sqrt{\frac{18\eta\,v}{\gamma_s-\gamma_w}}
\]</div>
<p>donde \(\eta\) es la viscosidad dinámica del agua y \(v\) la velocidad de sedimentación. En la práctica se corrige por temperatura, gravedad específica y lectura del hidrómetro. Un error en la dispersión, en el agente defloculante o en el tiempo de reposo altera toda la cola fina de la curva.</p>

<div class="tn-note tn-warn"><b>No confundas.</b> Un suelo puede tener \(C_u\) alto y aun así ser mal graduado si \(C_c\) queda fuera de 1–3. Y un suelo con muchos finos puede parecer “bien graduado” por la cola fina, pero su comportamiento está controlado por la plasticidad de esos finos.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 1522; INVIAS E-123; ASTM D6913 (tamizado), ASTM D7928 (sedimentación). Para agregados de concreto se usan NTC 77 y ASTM C136, pero no reemplazan la norma de suelos cuando el material es un suelo natural.</div>
`
            },
            {
                id: 'limites',
                title: 'Límites de Atterberg: consistencia, plasticidad y carta de plasticidad',
                html: S`
<p>Los límites de Atterberg describen el contenido de humedad en el que un suelo fino cambia de estado: sólido, semisólido, plástico y líquido. Se determinan sobre la fracción que pasa el tamiz de 425 µm (N.º 40) y son la base para separar limos de arcillas en la clasificación SUCS. En Colombia se aplica <strong>NTC 4630</strong>, junto con <strong>INVIAS E-125</strong> (límite líquido) y <strong>E-126</strong> (límite plástico); internacionalmente, <strong>ASTM D4318</strong>.</p>

<div class="dm-formula">\[
IP=LL-LP
\]</div>
<p>El <strong>límite líquido (LL)</strong> es la humedad a la cual el suelo pasa de plástico a líquido; con la cuchara de Casagrande se reporta, por convención, a 25 golpes. El <strong>límite plástico (LP)</strong> es la humedad a la cual un rollito de suelo de 3 mm se desmorona y deja de ser plástico. La diferencia es el <strong>índice de plasticidad (IP)</strong>.</p>

<h5>Índices de estado y flujo</h5>
<div class="dm-formula">\[
IL=\frac{w-LP}{IP},\qquad
IC=\frac{LL-w}{IP}=1-IL
\]</div>
<p>El índice de liquidez \(IL\) indica qué tan cerca está el suelo natural del límite líquido; el índice de consistencia \(IC\) es su complemento. También se define el índice de flujo a partir de dos puntos del ensayo:</p>
<div class="dm-formula">\[
I_f=\frac{w_1-w_2}{\log_{10}(N_2/N_1)}
\]</div>
<p>donde \(N\) es el número de golpes y \(w\) la humedad correspondiente. La pendiente de la línea de flujo ayuda a detectar errores y a estimar el LL a 25 golpes.</p>

<h5>Carta de plasticidad</h5>
<div class="dm-formula">\[
\text{Línea A: } IP=0.73(LL-20)
\qquad\qquad
\text{Línea U: } IP=0.90(LL-8)
\]</div>
<p>La línea A separa, de forma aproximada, las arcillas (por encima) de los limos (por debajo). La línea U es un límite superior empírico: los puntos por encima suelen indicar errores de ensayo o suelos orgánicos. La banda CL-ML se reconoce cuando \(4\le IP\le 7\) y \(12\le LL\le 29\).</p>

<div class="tn-example">
    <h5><span>4</span>Ejemplo: clasificación preliminar con límites</h5>
    <p>Una muestra de finos presenta \(LL=42\,\%\) y \(LP=22\,\%\).</p>
    <div class="dm-formula">\[
IP=42-22=20\,\%,\qquad
IP_A=0.73(42-20)=16.06\,\%
\]</div>
    <p>Como \(IP=20>16.06\), el punto cae por encima de la línea A. Además \(LL=42<50\), por lo que se trata de una <strong>arcilla de baja plasticidad (CL)</strong>, siempre que los demás criterios de la clasificación se cumplan.</p>
    <div class="tn-result">Resultado: <b>IP = 20 %</b>, <b>LL &lt; 50</b>, sobre la línea A → <b>CL</b></div>
</div>

<div class="tn-note tn-warn"><b>Errores que invalidan el LL.</b> Usar suelo secado en horno cuando la norma pide secado al aire; mezclar la ranura con la cuchara; variar la velocidad de golpes; no calibrar la altura de caída; o reportar un solo punto sin la corrección a 25 golpes. En suelos orgánicos y en algunos limos el LL puede ser difícil de definir: reporta la observación.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 4630; INVIAS E-125 y E-126; ASTM D4318. La NTC 4630 se enfoca en suelos cohesivos; para suelos con comportamiento no plástico, el resultado se reporta como NP (no plástico) y no se fuerza un valor.</div>
`
            },
            {
                id: 'gravedad',
                title: 'Gravedad específica de las partículas sólidas',
                html: S`
<p>La gravedad específica \(G_s\) relaciona la densidad de los sólidos con la densidad del agua. Es un dato indispensable para convertir relaciones de fase, calcular el peso unitario seco teórico, interpretar la compactación y estimar el gradiente crítico. En Colombia se usa <strong>INVIAS E-128</strong>; internacionalmente, <strong>ASTM D854</strong>. Verifica siempre si el proyecto exige una NTC específica, porque las ediciones y los alcances cambian.</p>

<div class="dm-formula">\[
G_s=\frac{\gamma_s}{\gamma_w}=\frac{M_s}{M_s+M_{pw}-M_{pws}}
\]</div>
<p>donde \(M_{pw}\) es la masa del picnómetro con agua hasta la marca y \(M_{pws}\) es la masa del picnómetro con agua y suelo. El denominador representa el volumen de sólidos expresado como masa de agua desplazada. Para suelos con partículas solubles, sales o materia orgánica se requieren precauciones adicionales.</p>

<h5>Procedimiento y correcciones</h5>
<ul>
    <li>Calibra el picnómetro y determina su volumen a la temperatura de ensayo.</li>
    <li>Elimina el aire atrapado con vacío, ebullición suave o agitación, según la norma.</li>
    <li>Mide la temperatura y corrige la densidad del agua; el resultado se reporta normalmente a 20 °C.</li>
    <li>Usa una muestra representativa y seca al aire; no secar a temperatura excesiva si hay minerales hidratados.</li>
    <li>Para suelos con materia orgánica, la \(G_s\) puede ser menor que 2.0; no lo interpretes como error sin verificar.</li>
</ul>

<div class="tn-example">
    <h5><span>5</span>Ejemplo: picnómetro</h5>
    <p>Masa de sólidos secos: \(M_s=50.0\ \text{g}\). Picnómetro + agua: \(M_{pw}=650.0\ \text{g}\). Picnómetro + agua + suelo: \(M_{pws}=681.0\ \text{g}\).</p>
    <div class="dm-formula">\[
G_s=\frac{50.0}{50.0+650.0-681.0}=\frac{50.0}{19.0}=2.63
\]</div>
    <div class="tn-result">Resultado: <b>Gs ≈ 2.63</b>. Es un valor bajo para una arena cuarzosa; verifica la calibración y la presencia de materia orgánica o partículas livianas.</div>
</div>

<h5>Valores típicos</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Material</th><th>Gs típico</th><th>Comentario</th></tr></thead>
<tbody>
<tr><td>Cuarzo / arena silícea</td><td>2.64 – 2.68</td><td>Valor de referencia más común</td></tr>
<tr><td>Grava cuarzosa</td><td>2.65 – 2.70</td><td>Depende de la litología</td></tr>
<tr><td>Limo</td><td>2.65 – 2.72</td><td>Puede incluir micas</td></tr>
<tr><td>Arcilla illítica</td><td>2.70 – 2.80</td><td>Mayor contenido de minerales arcillosos</td></tr>
<tr><td>Arcilla montmorillonítica</td><td>2.70 – 2.90</td><td>Alta superficie específica y plasticidad</td></tr>
<tr><td>Materia orgánica / turba</td><td>1.40 – 2.00</td><td>Baja densidad de partículas</td></tr>
<tr><td>Minerales de hierro</td><td>3.0 – 5.0</td><td>Puede sesgar la muestra si no es representativa</td></tr>
</tbody>
</table></div>

<div class="tn-note tn-norm"><b>Uso en el diseño.</b> Con \(G_s\) y \(e\) se calcula el peso unitario seco teórico \(\gamma_d=G_s\gamma_w/(1+e)\). En compactación, la curva del 100 % de saturación (línea de saturación) se construye con \(S=1\): \(\gamma_d=G_s\gamma_w/(1+wG_s)\). Si un punto de la curva Proctor cae por encima de esa línea, hay un error de datos.</div>
`
            },
            {
                id: 'compactacion',
                title: 'Compactación Proctor: energía, humedad óptima y línea de saturación',
                html: S`
<p>Compactar es reducir el volumen de vacíos mediante energía mecánica. No es lo mismo que consolidar: la compactación se hace con el suelo en estado parcialmente saturado y produce una estructura que depende de la energía, el método y la humedad. En Colombia, la referencia de laboratorio es <strong>INVIAS E-141</strong> (Proctor estándar) y <strong>E-142</strong> (Proctor modificado); internacionalmente, <strong>ASTM D698</strong> y <strong>ASTM D1557</strong>.</p>

<h5>Energía de compactación</h5>
<div class="dm-formula">\[
E=\frac{N_{capas}\,N_{golpes}\,m_{martillo}\,g\,h}{V_{molde}}
\]</div>
<p>Con los datos clásicos se obtienen aproximadamente \(594\ \text{kJ/m}^3\) para el Proctor estándar y \(2\,683\ \text{kJ/m}^3\) para el modificado. La energía modificada es unas 4.5 veces mayor, por lo que produce mayores densidades secas y menores humedades óptimas.</p>

<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Parámetro</th><th>Proctor estándar</th><th>Proctor modificado</th></tr></thead>
<tbody>
<tr><td>Masa del martillo</td><td>2.5 kg</td><td>4.54 kg</td></tr>
<tr><td>Altura de caída</td><td>305 mm</td><td>457 mm</td></tr>
<tr><td>Capas</td><td>3</td><td>5</td></tr>
<tr><td>Golpes por capa</td><td>25</td><td>56</td></tr>
<tr><td>Molde típico</td><td>944 cm³ (4")</td><td>2 124 cm³ (6")</td></tr>
<tr><td>Energía aproximada</td><td>594 kJ/m³</td><td>2 683 kJ/m³</td></tr>
<tr><td>Uso típico</td><td>Rellenos, subrasantes, terraplenes</td><td>Pavimentos, capas granulares, aeropistas</td></tr>
</tbody>
</table></div>

<p>La curva de compactación se obtiene al repetir el ensayo con contenidos de agua crecientes. El máximo de la curva es la <strong>densidad seca máxima</strong> \(\gamma_{d,max}\) y su abscisa es la <strong>humedad óptima</strong> \(w_{opt}\). Para cada punto:</p>

<div class="dm-formula">\[
\gamma_d=\frac{\gamma}{1+w}
=\frac{M_{suelo}}{V_{molde}(1+w)}
\]</div>

<div class="dm-formula">\[
\gamma_{d,ZAV}=\frac{G_s\gamma_w}{1+wG_s}
\qquad (S=1,\ e=wG_s)
\]</div>

<div class="tn-example">
    <h5><span>6</span>Ejemplo: punto de la curva y grado de compactación</h5>
    <p>Un molde de \(944\ \text{cm}^3\) se llena con \(1\,825\ \text{g}\) de suelo húmedo. La humedad es \(14.5\,\%\). La densidad seca máxima del ensayo es \(1.85\ \text{g/cm}^3\).</p>
    <div class="dm-formula">\[
\gamma=\frac{1\,825}{944}=1.933\ \text{g/cm}^3
\]</div>
    <div class="dm-formula">\[
\gamma_d=\frac{1.933}{1+0.145}=1.688\ \text{g/cm}^3
\]</div>
    <div class="dm-formula">\[
GC=\frac{\gamma_{d,campo}}{\gamma_{d,max}}\times 100
=\frac{1.688}{1.85}\times 100=91.2\,\%
\]</div>
    <div class="tn-result">Resultado: <b>γd ≈ 1.688 g/cm³</b> y <b>GC ≈ 91.2 %</b>. Si la especificación exige 95 %, el punto no cumple.</div>
</div>

<div class="tn-note tn-warn"><b>La humedad óptima no es una constante.</b> Cambia con la energía, el método de preparación, la reutilización del material, el tamaño máximo y la cantidad de finos. En suelos con sobretamaños se corrige la curva y la densidad de campo; no compares directamente una curva de laboratorio con un material que tiene gravas que no caben en el molde.</div>

<h5>Lectura ingenieril de la curva</h5>
<ul>
    <li><strong>Rama húmeda:</strong> al aumentar \(w\), el agua lubrica las partículas y se alcanza mayor densidad; después el agua ocupa volumen y expulsa al aire, y \(\gamma_d\) baja.</li>
    <li><strong>Rama seca:</strong> la succión y la fricción impiden reacomodar las partículas; se necesita más energía para densificar.</li>
    <li><strong>Curva más alta y a la izquierda:</strong> mayor energía o mejor granulometría. No siempre es más resistente: un suelo compactado muy seco puede ser frágil y colapsable.</li>
    <li><strong>Control de campo:</strong> se compara \(\gamma_{d,campo}\) con \(\gamma_{d,max}\) y se verifica que \(w\) esté dentro de la ventana de la especificación.</li>
</ul>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> INVIAS E-141 y E-142; ASTM D698 y D1557. La NTC no ofrece una equivalencia directa universal para Proctor; en proyectos colombianos se suele citar la norma INVIAS o la ASTM adoptada contractualmente. Revisa siempre la especificación particular.</div>
`
            },
            {
                id: 'campo',
                title: 'Densidad de campo y control de compactación',
                html: S`
<p>El ensayo de densidad de campo determina la masa unitaria del suelo en su estado natural o compactado. El método clásico es el <strong>cono de arena</strong>, normalizado en Colombia por <strong>NTC 1667</strong> e <strong>INVIAS E-161</strong>; internacionalmente por <strong>ASTM D1556</strong>. Otros métodos son el balón de densidad, el núcleo tallado, el densímetro nuclear y los métodos eléctricos, cada uno con su campo de aplicación.</p>

<div class="dm-formula">\[
V_h=\frac{M_{arena}}{\rho_{arena}},\qquad
\gamma_h=\frac{M_{suelo}}{V_h},\qquad
\gamma_d=\frac{\gamma_h}{1+w}
\]</div>
<p>La calibración de la arena es crítica: su densidad aparente debe ser estable y conocida. También se corrige el volumen del cono y la placa base. La muestra extraída se pesa húmeda y se seca para obtener \(w\); con eso se calcula \(\gamma_d\).</p>

<div class="tn-example">
    <h5><span>7</span>Ejemplo: cono de arena</h5>
    <p>Masa de suelo extraído: \(1\,850\ \text{g}\). Volumen calibrado del hueco: \(925\ \text{cm}^3\). Humedad del suelo: \(12.0\,\%\). Densidad seca máxima Proctor: \(1.85\ \text{g/cm}^3\).</p>
    <div class="dm-formula">\[
\gamma_h=\frac{1\,850}{925}=2.00\ \text{g/cm}^3
\]</div>
    <div class="dm-formula">\[
\gamma_d=\frac{2.00}{1+0.12}=1.786\ \text{g/cm}^3
\]</div>
    <div class="dm-formula">\[
GC=\frac{1.786}{1.85}\times 100=96.5\,\%
\]</div>
    <div class="tn-result">Resultado: <b>γd ≈ 1.786 g/cm³</b> y <b>GC ≈ 96.5 %</b>. Cumple si la especificación exige 95 % o más.</div>
</div>

<h5>Controles que no se pueden omitir</h5>
<ul>
    <li><strong>Calibración diaria:</strong> masa y densidad de la arena, volumen del cono y de la placa.</li>
    <li><strong>Humedad representativa:</strong> toma la muestra del mismo hueco, no de un punto cercano.</li>
    <li><strong>Profundidad:</strong> la capa ensayada debe corresponder a la capa compactada; no mezcles material de capas distintas.</li>
    <li><strong>Comparación correcta:</strong> usa la curva Proctor del mismo material y energía; si hay sobretamaños, aplica la corrección.</li>
    <li><strong>Registro:</strong> anota coordenadas, abscisa, profundidad, capa, fecha, operador y condiciones climáticas.</li>
</ul>

<div class="tn-note tn-warn"><b>Error clásico.</b> Comparar el peso unitario húmedo con la densidad seca máxima. La especificación se expresa en densidad seca; si no divides por \((1+w)\), el grado de compactación queda artificialmente alto.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 1667; INVIAS E-161; ASTM D1556. Para densímetro nuclear, revisa ASTM D6938 y las limitaciones de calibración y seguridad radiológica. Para suelos finos y bloques, el método del núcleo tallado puede ser más representativo.</div>
`
            },
            {
                id: 'permeabilidad',
                title: 'Permeabilidad: Darcy, carga constante y carga variable',
                html: S`
<p>La permeabilidad describe la facilidad con que el agua fluye a través del suelo. Es clave para drenajes, presas, excavaciones, asentamientos por consolidación y estabilidad de taludes. En Colombia se cita <strong>INVIAS E-164</strong>; internacionalmente, <strong>ASTM D2434</strong> para suelos granulares y <strong>ASTM D5084</strong> para materiales finos con carga variable.</p>

<h5>Ley de Darcy</h5>
<div class="dm-formula">\[
v=k\,i=k\frac{\Delta h}{L},\qquad Q=vA=k\,i\,A
\]</div>
<p>donde \(v\) es la velocidad de descarga (no la velocidad real en los poros), \(k\) el coeficiente de permeabilidad, \(i\) el gradiente hidráulico, \(A\) el área transversal y \(Q\) el caudal. La velocidad real media en los poros es \(v_s=v/n\).</p>

<h5>Permeámetro de carga constante</h5>
<div class="dm-formula">\[
k=\frac{Q L}{A h t}
\]</div>
<p>Se usa en suelos granulares con \(k\) relativamente alto. Se mide el caudal \(Q\) que pasa en un tiempo \(t\) bajo una diferencia de carga \(h\).</p>

<h5>Permeámetro de carga variable</h5>
<div class="dm-formula">\[
k=\frac{a L}{A t}\ln\left(\frac{h_0}{h_1}\right)
\]</div>
<p>donde \(a\) es el área de la bureta o tubo de alimentación, \(h_0\) y \(h_1\) son las cargas inicial y final. Es apropiado para suelos finos, donde el caudal es pequeño.</p>

<div class="tn-example">
    <h5><span>8</span>Ejemplo: carga constante</h5>
    <p>En una muestra de \(15\ \text{cm}\) de longitud y \(78.5\ \text{cm}^2\) de área pasan \(250\ \text{cm}^3\) en \(300\ \text{s}\) bajo una carga de \(30\ \text{cm}\).</p>
    <div class="dm-formula">\[
k=\frac{(250)(15)}{(78.5)(30)(300)}
=\frac{3\,750}{706\,500}=5.31\times10^{-3}\ \text{cm/s}
\]</div>
    <div class="tn-result">Resultado: <b>k ≈ 5.3 × 10⁻³ cm/s</b>, coherente con una arena limpia o una grava fina.</div>
</div>

<h5>Gradiente crítico y licuación</h5>
<div class="dm-formula">\[
i_c=\frac{G_s-1}{1+e},\qquad
FS_{levantamiento}=\frac{i_c}{i}
\]</div>
<p>Si el gradiente de salida supera \(i_c\), el agua puede levantar las partículas y producir <strong>ebullición o piping</strong>. En excavaciones y tablestacas, el factor de seguridad frente al levantamiento debe ser mayor que 1.5 en condiciones normales; verifica los requisitos del proyecto y de la NSR-10 para la condición específica.</p>

<h5>Órdenes de magnitud de \(k\)</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Material</th><th>k típico (cm/s)</th><th>Comportamiento</th></tr></thead>
<tbody>
<tr><td>Grava limpia</td><td>&gt; 10⁻²</td><td>Drenaje muy rápido</td></tr>
<tr><td>Arena gruesa</td><td>10⁻³ – 10⁻²</td><td>Drenaje rápido</td></tr>
<tr><td>Arena fina / limo arenoso</td><td>10⁻⁵ – 10⁻³</td><td>Drenaje moderado</td></tr>
<tr><td>Limo</td><td>10⁻⁷ – 10⁻⁵</td><td>Drenaje lento; puede ser licuable</td></tr>
<tr><td>Arcilla</td><td>&lt; 10⁻⁷</td><td>Prácticamente impermeable a corto plazo</td></tr>
</tbody>
</table></div>

<div class="tn-note tn-warn"><b>La permeabilidad es anisótropa.</b> Un suelo estratificado puede tener \(k_h\) varias veces mayor que \(k_v\). El ensayo de laboratorio sobre una muestra pequeña no captura fracturas, lentes de arena ni heterogeneidades del depósito. Para problemas reales, complementa con ensayos de campo.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> INVIAS E-164; ASTM D2434; ASTM D5084. Reporta la temperatura del agua y corrige a 20 °C si la norma lo exige; la viscosidad cambia con la temperatura y altera \(k\).</div>
`
            },
            {
                id: 'sucs',
                title: 'Clasificación SUCS: del porcentaje que pasa al símbolo del suelo',
                html: S`
<p>El Sistema Unificado de Clasificación de Suelos (SUCS) agrupa los suelos por su comportamiento ingenieril, no solo por su tamaño. En Colombia se aplica <strong>NTC 1504</strong>; internacionalmente, <strong>ASTM D2487</strong>. La clasificación se basa en la granulometría, los límites de Atterberg, la forma de la curva y, cuando es necesario, en la observación de campo y el contenido orgánico.</p>

<h5>Secuencia de decisión</h5>
<ol>
    <li>Determina el porcentaje de grava, arena y finos (pasa N.º 200).</li>
    <li>Si pasa N.º 200 &gt; 50 %, el suelo es <strong>fino</strong> (M, C u O).</li>
    <li>Si pasa N.º 200 ≤ 50 %, el suelo es <strong>grueso</strong> (G o S), y se decide si la fracción gruesa dominante es grava o arena.</li>
    <li>En suelos gruesos, revisa el porcentaje de finos: &lt; 5 % (limpio), 5–12 % (transición, posible doble símbolo) y &gt; 12 % (con finos).</li>
    <li>En suelos finos, usa LL, IP y la posición respecto a la línea A; si el suelo es orgánico, usa O; si es turba, Pt.</li>
</ol>

<div class="dm-formula">\[
\text{Suelo grueso: } \%\text{pasa N.° 200}\le 50\,\%
\qquad
\text{Suelo fino: } \%\text{pasa N.° 200}>50\,\%
\]</div>

<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Símbolo</th><th>Nombre</th><th>Criterio principal</th><th>Uso ingenieril típico</th></tr></thead>
<tbody>
<tr><td>GW</td><td>Grava bien graduada</td><td>\(C_u\ge 4\), \(1<C_c<3\), finos &lt; 5 %</td><td>Excelente relleno y capa granular</td></tr>
<tr><td>GP</td><td>Grava mal graduada</td><td>No cumple GW; finos &lt; 5 %</td><td>Puede requerir mezcla o compactación cuidadosa</td></tr>
<tr><td>GM</td><td>Grava limosa</td><td>Finos &gt; 12 %, IP bajo o nulo</td><td>Sensible al agua; verifica permeabilidad</td></tr>
<tr><td>GC</td><td>Grava arcillosa</td><td>Finos &gt; 12 %, IP alto</td><td>Mayor cohesión; cuidado con expansión</td></tr>
<tr><td>SW</td><td>Arena bien graduada</td><td>\(C_u\ge 6\), \(1<C_c<3\), finos &lt; 5 %</td><td>Buen relleno y drenaje</td></tr>
<tr><td>SP</td><td>Arena mal graduada</td><td>No cumple SW; finos &lt; 5 %</td><td>Uniforme; puede ser licuable</td></tr>
<tr><td>SM</td><td>Arena limosa</td><td>Finos &gt; 12 %, IP bajo o nulo</td><td>Puede perder resistencia con agua</td></tr>
<tr><td>SC</td><td>Arena arcillosa</td><td>Finos &gt; 12 %, IP alto</td><td>Cohesiva; controlar humedad</td></tr>
<tr><td>ML</td><td>Limo de baja plasticidad</td><td>LL &lt; 50, bajo la línea A</td><td>Susceptible a erosión y colapso</td></tr>
<tr><td>CL</td><td>Arcilla de baja plasticidad</td><td>LL &lt; 50, sobre la línea A</td><td>Compresible; controlar expansión</td></tr>
<tr><td>OL</td><td>Limo orgánico</td><td>LL &lt; 50, materia orgánica</td><td>Baja resistencia; evitar como soporte</td></tr>
<tr><td>MH</td><td>Limo de alta plasticidad</td><td>LL ≥ 50, bajo la línea A</td><td>Compresible y sensible al agua</td></tr>
<tr><td>CH</td><td>Arcilla de alta plasticidad</td><td>LL ≥ 50, sobre la línea A</td><td>Alta expansión y compresibilidad</td></tr>
<tr><td>OH</td><td>Arcilla orgánica</td><td>LL ≥ 50, materia orgánica</td><td>Requiere tratamiento o reemplazo</td></tr>
<tr><td>Pt</td><td>Turba</td><td>Materia orgánica fibrosa</td><td>No apta como soporte sin mejoramiento</td></tr>
</tbody>
</table></div>

<div class="tn-example">
    <h5><span>9</span>Ejemplo: clasificación de una grava</h5>
    <p>Una muestra tiene 55 % de grava, 35 % de arena y 10 % de finos. Los finos presentan \(LL=30\,\%\) e \(IP=5\,\%\). La curva gruesa da \(C_u=20\) y \(C_c=1.2\).</p>
    <ul>
        <li>Pasa N.º 200 = 10 % ≤ 50 % → suelo grueso.</li>
        <li>Grava 55 % &gt; arena 35 % → familia G.</li>
        <li>Finos 10 % (entre 5 y 12 %) → probable símbolo doble.</li>
        <li>\(IP_A=0.73(30-20)=7.3\); \(IP=5<7.3\) → finos tipo ML.</li>
        <li>\(C_u=20>4\) y \(1<C_c=1.2<3\) → grava bien graduada GW.</li>
    </ul>
    <div class="tn-result">Resultado: <b>GW–GM</b> (grava bien graduada con finos limosos). Si los finos fueran arcillosos, sería GW–GC.</div>
</div>

<div class="tn-note tn-warn"><b>La clasificación no es un diseño.</b> Dos suelos con el mismo símbolo pueden tener densidades, cementación, estructura y historia de esfuerzos diferentes. El símbolo SUCS orienta la exploración y el uso, pero no reemplaza los ensayos de resistencia, compresibilidad y permeabilidad.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 1504; ASTM D2487. Para la descripción visual y manual de suelos, complementa con ASTM D2488. Reporta siempre el porcentaje de finos, el LL, el IP y los coeficientes de la curva; un símbolo sin esos datos es difícil de auditar.</div>
`
            },
            {
                id: 'errores',
                title: 'Buenas prácticas, errores frecuentes y estructura del informe',
                html: S`
<p>La calidad de un resultado geotécnico depende tanto del cálculo como de la cadena de muestreo, transporte, preparación, ejecución y registro. Un ensayo bien hecho pero mal identificado puede inducir una decisión de obra equivocada. Esta sección resume los controles que suelen aparecer en auditorías y en la revisión de informes.</p>

<h5>Cadena de calidad</h5>
<div class="tn-check">
    <ul>
        <li><strong>Muestreo:</strong> identifica sondeo, profundidad, coordenada, fecha, tipo de muestra y método de extracción.</li>
        <li><strong>Preservación:</strong> evita pérdida o ganancia de humedad; usa bolsas herméticas, tubos o recipientes adecuados.</li>
        <li><strong>Preparación:</strong> respeta el secado, el cuarteo y la reducción de tamaño que exige cada norma.</li>
        <li><strong>Calibración:</strong> balanzas, hornos, tamices, martillos, picnómetros y equipos de carga deben tener verificación vigente.</li>
        <li><strong>Duplicados:</strong> incluye repeticiones y materiales de referencia cuando el proyecto lo requiera.</li>
        <li><strong>Trazabilidad:</strong> conserva planillas, curvas, fotografías y cálculos; no solo el resultado final.</li>
    </ul>
</div>

<h5>Errores que más se repiten</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Ensayo</th><th>Error frecuente</th><th>Efecto</th><th>Cómo controlarlo</th></tr></thead>
<tbody>
<tr><td>Humedad</td><td>Masa de sólidos mal calculada</td><td>γd y grado de compactación incorrectos</td><td>Verificar tara y masa constante</td></tr>
<tr><td>Granulometría</td><td>Pérdida de finos o tamiz desgastado</td><td>Curva y SUCS sesgados</td><td>Lavar, secar y revisar tamices</td></tr>
<tr><td>Límites</td><td>Secado en horno antes del LL</td><td>LL e IP alterados</td><td>Secar al aire según norma</td></tr>
<tr><td>Gravedad específica</td><td>Aire atrapado en el picnómetro</td><td>Gs baja artificialmente</td><td>Vacío o ebullición controlada</td></tr>
<tr><td>Proctor</td><td>Reutilizar material sin control</td><td>Curva no representativa</td><td>Preparar por puntos o corregir</td></tr>
<tr><td>Densidad de campo</td><td>Comparar γ húmedo con γd máximo</td><td>GC sobreestimado</td><td>Calcular siempre γd</td></tr>
<tr><td>Permeabilidad</td><td>Muestra no saturada</td><td>k subestimada</td><td>Saturar y estabilizar flujo</td></tr>
<tr><td>SUCS</td><td>No reportar finos ni límites</td><td>Clasificación no auditable</td><td>Incluir todos los criterios</td></tr>
</tbody>
</table></div>

<h5>Estructura mínima de un informe</h5>
<ol>
    <li><strong>Identificación:</strong> proyecto, ubicación, sondeo, muestra, profundidad, fecha y laboratorio.</li>
    <li><strong>Norma aplicada:</strong> código, edición y método; si se usó una modificación, justificarla.</li>
    <li><strong>Datos y planillas:</strong> masas, temperaturas, lecturas, tamices, tiempos y observaciones.</li>
    <li><strong>Cálculos:</strong> ecuaciones, unidades, factores de corrección y resultados intermedios.</li>
    <li><strong>Resultados:</strong> tabla resumen, curvas y clasificación cuando aplique.</li>
    <li><strong>Interpretación:</strong> qué significa el resultado para el proyecto y qué limitaciones tiene.</li>
    <li><strong>Anexos:</strong> certificados de calibración, fotografías, cadenas de custodia y registros primarios.</li>
</ol>

<div class="tn-note tn-ok"><b>Regla de oro.</b> Si un resultado no se puede reproducir a partir de los datos del informe, el informe no es auditable. La trazabilidad vale tanto como el número final.</div>
`
            }
        ],
        bib: [
            'Das, B. M. <em>Fundamentos de ingeniería geotécnica</em>. Cengage Learning.',
            'Juárez Badillo, E. y Rico Rodríguez, A. <em>Mecánica de suelos, Tomo I: Fundamentos de la mecánica de suelos</em>. Limusa.',
            'Lambe, T. W. y Whitman, R. V. <em>Mecánica de suelos</em>. Limusa.',
            'Terzaghi, K., Peck, R. B. y Mesri, G. <em>Soil Mechanics in Engineering Practice</em>, 3.ª ed. Wiley.',
            'Reglamento Colombiano de Construcción Sismo Resistente <em>NSR-10</em>, Título H — Estudios geotécnicos.',
            'Instituto Nacional de Vías. <em>Normas de ensayo de materiales para carreteras</em>. INVIAS, edición vigente: E-122, E-123, E-125, E-126, E-128, E-141, E-142, E-161 y E-164.',
            'ICONTEC. <em>NTC 1495</em> (contenido de agua), <em>NTC 1522</em> (granulometría), <em>NTC 4630</em> (límites de Atterberg), <em>NTC 1504</em> (clasificación SUCS) y <em>NTC 1667</em> (densidad de campo por cono de arena).',
            'ASTM International. <em>D2216, D6913, D7928, D4318, D854, D698, D1557, D1556, D2434, D5084 y D2487</em>. Consultar la edición vigente.',
            'NSR-10. <em>Título H</em>: estudios geotécnicos, exploración, ensayos, cimentaciones, muros de contención y estabilidad de taludes.'
        ]
    };
})(window);
