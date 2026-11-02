/* GeoMetrics — Teoría ampliada · Mecánica de Suelos I */
(function (global) {
    'use strict';
    var S = String.raw;

    var sec = [
        /* ───────────── 1. ORIGEN Y MINERALOGÍA ───────────── */
        {
            id: 'origen', after: 'panorama',
            title: 'Origen, mineralogía y estructura de los suelos',
            html: S`
<p>El suelo es el producto de la <strong>meteorización</strong> de la roca. La forma en que se formó y se transportó explica casi todas sus propiedades de ingeniería: tamaño de grano, mineralogía, plasticidad, estructura y variabilidad en el terreno.</p>

<h5>Meteorización y transporte</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Meteorización física</b><p>Fragmenta la roca sin cambiar su composición: ciclos de temperatura, congelación del agua, abrasión y alivio de esfuerzos. Produce gravas, arenas y limos de minerales poco alterados (cuarzo, feldespato, mica).</p></div>
    <div class="tn-mini"><b>Meteorización química</b><p>Altera los minerales por hidrólisis, oxidación y disolución. Es dominante en climas cálidos y húmedos y genera los <strong>minerales arcillosos</strong> y los óxidos de hierro y aluminio.</p></div>
</div>
<p>Según el transporte se distinguen suelos <strong>residuales</strong> (permanecen sobre la roca madre; perfil de meteorización gradual y muy heterogéneo), <strong>aluviales</strong> (ríos: estratos de arenas y gravas, lentes de arcilla), <strong>coluviales</strong> (gravedad: laderas, mezclas sin clasificar), <strong>lacustres</strong> (lagos: arcillas blandas muy compresibles, como las de la Sabana de Bogotá), <strong>eólicos</strong> (viento: loess, dunas) y <strong>volcánicos</strong> (cenizas, con minerales como la alófana). En Colombia el perfil típico combina varios orígenes en una misma obra, por eso la exploración (sección de exploración y muestreo) es indispensable.</p>

<h5>Minerales arcillosos</h5>
<p>Las arcillas están formadas por láminas de silicio (tetraedros) y aluminio (octaedros) apiladas. El tipo de apilamiento y la sustitución de iones determinan la <strong>carga eléctrica superficial</strong>, la capacidad de adsorber agua y, con ello, la plasticidad y la expansividad.</p>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Mineral</th><th>Estructura</th><th>Superficie específica (m²/g)</th><th>Actividad típica A</th><th>Comportamiento</th></tr></thead><tbody>
<tr><td>Caolinita</td><td>1:1, unión por puentes de hidrógeno</td><td>10 – 20</td><td>0.3 – 0.5</td><td>Poco plástica, estable, baja expansión</td></tr>
<tr><td>Illita</td><td>2:1, unida por iones de potasio</td><td>65 – 100</td><td>0.5 – 1.0</td><td>Plasticidad media, expansión moderada</td></tr>
<tr><td>Montmorillonita (esmectita)</td><td>2:1, unión débil, el agua entra entre láminas</td><td>700 – 800</td><td>1 – 7</td><td>Muy plástica, muy expansiva y compresible</td></tr>
</tbody><caption>Valores típicos de la literatura (Lambe y Whitman; Mitchell y Soga). Cambian con el catión adsorbido y el grado de cristalinidad.</caption></table></div>

<p>Alrededor de cada partícula de arcilla existe una <strong>capa de agua adsorbida</strong> y una capa difusa de iones. Esa agua tiene propiedades distintas del agua libre y explica por qué una arcilla puede ser plástica con un contenido de agua que en una arena la dejaría casi seca. Como la superficie específica es enorme, en las arcillas dominan las fuerzas superficiales (eléctricas y de van der Waals) sobre el peso propio de los granos; en arenas y gravas ocurre lo contrario.</p>

<h5>Actividad y sensibilidad</h5>
<p>La <strong>actividad</strong> de Skempton relaciona la plasticidad con la fracción arcillosa:</p>
<div class="dm-formula">\[
A=\frac{IP}{\%\ \text{menor que }2\ \mu\text{m}}
\]</div>
<p>Si \(A<0.75\) la arcilla es inactiva, entre 0.75 y 1.25 normal y por encima de 1.25 activa (potencialmente expansiva). La <strong>sensibilidad</strong> \(S_t=q_{u,\text{inalterada}}/q_{u,\text{remoldeada}}\) mide cuánta resistencia pierde la arcilla al ser perturbada: \(S_t<2\) es baja, 4–8 alta y por encima de 8 se habla de arcillas muy sensibles o rápidas.</p>

<h5>Estructura del suelo</h5>
<ul>
<li><strong>Estructura granular simple:</strong> arenas y gravas; cada grano se apoya en los vecinos. La compacidad depende de la relación de vacíos.</li>
<li><strong>Estructura panaloide:</strong> limos finos que forman arcos y dejan huecos grandes; es metaestable y puede colapsar.</li>
<li><strong>Floculada:</strong> arcillas con atracción borde-cara (agua salada); estructura abierta, más resistente en estado inalterado.</li>
<li><strong>Dispersa:</strong> arcillas con partículas paralelas (agua dulce o remoldeo); más densa, menos permeable y con menor resistencia.</li>
</ul>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: actividad de una arcilla</h5>
    <p>Un ensayo da LL = 68 %, LP = 28 % y un 52 % de partículas menores de 2 µm.</p>
    <div class="dm-formula">\[
IP=68-28=40\%,\qquad A=\frac{40}{52}=0.77
\]</div>
    <div class="tn-result">Resultado: <b>A ≈ 0.77</b>, actividad normal, comparable a una illita. Con IP = 40 % se espera expansión moderada pese a no ser una arcilla activa.</div>
</div>

<div class="tn-note tn-norm"><b>Importancia práctica.</b> Dos suelos con la misma granulometría pueden comportarse de forma opuesta si uno contiene montmorillonita y el otro caolinita. Por eso la granulometría siempre se complementa con los límites de Atterberg y, si es necesario, con ensayos mineralógicos (difracción de rayos X).</div>
`
        },
        /* ───────────── 2. RELACIONES DE FASE ───────────── */
        {
            id: 'fases', after: 'origen',
            title: 'Relaciones volumétricas y gravimétricas',
            html: S`
<p>El suelo se idealiza como tres fases separadas: sólidos (\(V_s\), \(W_s\)), agua (\(V_w\), \(W_w\)) y aire (\(V_a\), con peso despreciable). Todas las propiedades índice se expresan con relaciones entre estos volúmenes y pesos.</p>

<h5>Definiciones</h5>
<div class="tn-formulas dm-formula">\[
e=\frac{V_v}{V_s},\qquad
n=\frac{V_v}{V}=\frac{e}{1+e},\qquad
S=\frac{V_w}{V_v},\qquad
w=\frac{W_w}{W_s}
\]</div>
<ul>
<li>\(e\): <strong>relación de vacíos</strong> (puede ser mayor que 1 en arcillas blandas y turbas).</li>
<li>\(n\): <strong>porosidad</strong>, siempre menor que 1.</li>
<li>\(S\): <strong>grado de saturación</strong>, de 0 (seco) a 1 (saturado).</li>
<li>\(w\): <strong>contenido de agua</strong>, puede superar el 100 % en suelos orgánicos.</li>
</ul>

<h5>Relación fundamental y pesos unitarios</h5>
<div class="dm-formula">\[
S\,e=w\,G_s
\]</div>
<div class="dm-formula">\[
\gamma=\frac{(G_s+S e)\,\gamma_w}{1+e},\qquad
\gamma_d=\frac{G_s\,\gamma_w}{1+e}=\frac{\gamma}{1+w},\qquad
\gamma_{sat}=\frac{(G_s+e)\,\gamma_w}{1+e},\qquad
\gamma'=\gamma_{sat}-\gamma_w
\]</div>
<p>Con \(\gamma_w=9.81\ \text{kN/m}^3\). El peso unitario sumergido \(\gamma'\) es el que interviene en los esfuerzos efectivos bajo el nivel freático.</p>

<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Suelo</th><th>e típico</th><th>n (%)</th><th>γd (kN/m³)</th><th>γsat (kN/m³)</th></tr></thead><tbody>
<tr><td>Arena suelta, uniforme</td><td>0.85</td><td>46</td><td>14.3</td><td>18.1</td></tr>
<tr><td>Arena densa, bien gradada</td><td>0.45</td><td>31</td><td>18.5</td><td>21.2</td></tr>
<tr><td>Arcilla blanda</td><td>0.9 – 1.4</td><td>47 – 58</td><td>11 – 14</td><td>15 – 17</td></tr>
<tr><td>Arcilla firme</td><td>0.6 – 0.8</td><td>38 – 44</td><td>15 – 17</td><td>18 – 20</td></tr>
</tbody><caption>Valores de referencia (Terzaghi, Peck y Mesri; Das). Úsalos solo como orden de magnitud.</caption></table></div>

<h5>Compacidad relativa en suelos granulares</h5>
<div class="dm-formula">\[
D_r=\frac{e_{max}-e}{e_{max}-e_{min}}=\frac{\gamma_{d,max}}{\gamma_d}\cdot\frac{\gamma_d-\gamma_{d,min}}{\gamma_{d,max}-\gamma_{d,min}}
\]</div>
<p>Clasificación usual: \(D_r<15\%\) muy suelta, 15–35 suelta, 35–65 media, 65–85 densa y mayor de 85 % muy densa. Los valores \(e_{max}\) y \(e_{min}\) se obtienen con ensayos de densidad mínima y máxima índice (ASTM D4254 y D4253).</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: arcilla saturada</h5>
    <p>Una muestra saturada tiene \(w=28\%\) y \(G_s=2.70\).</p>
    <div class="dm-formula">\[
e=wG_s=0.28(2.70)=0.756,\qquad n=\frac{0.756}{1.756}=0.43
\]</div>
    <div class="dm-formula">\[
\gamma_{sat}=\frac{2.70+0.756}{1.756}(9.81)=19.3\ \text{kN/m}^3,\qquad
\gamma_d=\frac{2.70(9.81)}{1.756}=15.1\ \text{kN/m}^3,\qquad
\gamma'=9.5\ \text{kN/m}^3
\]</div>
    <div class="tn-result">Resultado: <b>e = 0.756</b>, <b>n = 43 %</b>, <b>γsat ≈ 19.3 kN/m³</b>. Verificación: \(\gamma_d(1+w)=15.1(1.28)=19.3\) ✔</div>
</div>

<div class="tn-example">
    <h5><span>2</span>Ejemplo: cambio de volumen al compactar</h5>
    <p>Un material de préstamo con \(\gamma_d=14.5\ \text{kN/m}^3\) se compacta a \(\gamma_d=17.4\ \text{kN/m}^3\) en el terraplén. Por cada m³ de terraplén se necesitan:</p>
    <div class="dm-formula">\[
V_{pr\acute{e}stamo}=\frac{17.4}{14.5}=1.20\ \text{m}^3
\]</div>
    <div class="tn-result">Resultado: <b>1.20 m³ de préstamo por m³ compactado</b> (a la humedad de compactación). Para transporte hay que sumar además el esponjamiento del material suelto.</div>
</div>

<div class="tn-note tn-warn"><b>Errores frecuentes.</b> Confundir \(w\) con \(S\) (se relacionan solo por \(Se=wG_s\)), usar \(\gamma_{sat}\) por encima del nivel freático, o calcular \(\gamma'\) restando 10 en lugar de \(\gamma_w=9.81\). Define siempre en qué unidades trabajas (kN/m³ o g/cm³).</div>
`
        },
        /* ───────────── 3. AGUA, CAPILARIDAD Y SUCCIÓN ───────────── */
        {
            id: 'capilaridad', after: 'permeabilidad',
            title: 'El agua en el suelo: capilaridad y succión',
            html: S`
<p>El agua condiciona la resistencia, la rigidez y el volumen del suelo. Según su posición y energía de retención se distinguen varios estados:</p>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Agua gravitacional (freática)</b><p>Llena los poros bajo el nivel freático y se mueve por gradiente hidráulico. Su presión es positiva: \(u=\gamma_w z_w\).</p></div>
    <div class="tn-mini"><b>Agua capilar</b><p>Asciende por encima del nivel freático por tensión superficial. Está a <strong>presión negativa</strong> (succión) y aumenta temporalmente los esfuerzos efectivos.</p></div>
    <div class="tn-mini"><b>Agua higroscópica o adsorbida</b><p>Película muy delgada pegada a los granos por fuerzas eléctricas. Solo se elimina secando a 105–110 °C; explica la plasticidad de las arcillas.</p></div>
    <div class="tn-mini"><b>Agua de cristalización</b><p>Forma parte de la estructura mineral (yeso, algunas arcillas). No participa en el comportamiento mecánico habitual.</p></div>
</div>

<h5>Ascensión capilar</h5>
<p>En un tubo capilar de diámetro \(d\), el equilibrio entre la tensión superficial \(T_s\) y el peso de la columna de agua da:</p>
<div class="dm-formula">\[
h_c=\frac{4\,T_s\cos\alpha}{\gamma_w\,d}\approx\frac{0.30}{d}\ \ (h_c\ \text{y}\ d\ \text{en cm, agua a 20 °C})
\]</div>
<p>En el suelo, los poros no son tubos rectos. Una estimación empírica (Hazen) usa el tamaño efectivo:</p>
<div class="dm-formula">\[
h_c\approx\frac{C}{e\,D_{10}},\qquad C=10\text{ a }50\ \text{mm}^2\ \ (h_c,\ D_{10}\ \text{en mm})
\]</div>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Suelo</th><th>Altura capilar aproximada</th></tr></thead><tbody>
<tr><td>Grava</td><td>Despreciable</td></tr><tr><td>Arena gruesa</td><td>0.03 – 0.15 m</td></tr><tr><td>Arena media</td><td>0.15 – 0.5 m</td></tr><tr><td>Arena fina</td><td>0.3 – 2 m</td></tr><tr><td>Limo</td><td>1.5 – 10 m</td></tr><tr><td>Arcilla</td><td>Más de 10 m (con tiempos muy largos)</td></tr>
</tbody><caption>Valores de referencia de la literatura clásica. El ascenso en arcillas es lento y rara vez alcanza el valor máximo teórico.</caption></table></div>

<h5>Presión de poros y esfuerzo efectivo con capilaridad</h5>
<p>Dentro de la franja capilar saturada, la presión de poros es negativa:</p>
<div class="dm-formula">\[
u=-\gamma_w\,z_c,\qquad \sigma'=\sigma-u=\sigma+\gamma_w z_c
\]</div>
<p>donde \(z_c\) es la altura sobre el nivel freático. Esa succión es una “cohesión aparente” que desaparece cuando el suelo se satura por lluvia o se inunda: es la causa de muchos deslizamientos de suelos residuales y del colapso de rellenos poco densos.</p>
<p>En suelos no saturados Bishop propuso: \(\sigma'=(\sigma-u_a)+\chi(u_a-u_w)\), con \(\chi\) entre 0 (seco) y 1 (saturado). La diferencia \(u_a-u_w\) es la <strong>succión matricial</strong>; la curva que relaciona succión y humedad se llama curva característica suelo–agua.</p>

<h5>Expansión, contracción y colapso</h5>
<ul>
<li><strong>Suelos expansivos:</strong> arcillas activas que aumentan de volumen al humedecerse y se contraen al secarse; agrietan pisos, muros livianos y pavimentos. Se identifican con IP, actividad y ensayos de expansión libre.</li>
<li><strong>Suelos colapsables:</strong> limos y arenas finas con estructura abierta y cementación débil que se asientan bruscamente al saturarse bajo carga.</li>
<li><strong>Heladas:</strong> en climas fríos, los limos son los más susceptibles porque combinan alta capilaridad y permeabilidad suficiente.</li>
</ul>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: esfuerzo efectivo con franja capilar</h5>
    <p>Un limo con nivel freático a 4 m de profundidad tiene una franja capilar saturada de 1.5 m (\(\gamma_{sat}=18.5\ \text{kN/m}^3\)). Sobre ella, el suelo está húmedo con \(\gamma=17\ \text{kN/m}^3\). Esfuerzos a 4 m:</p>
    <div class="dm-formula">\[
\sigma=17(2.5)+18.5(1.5)=70.3\ \text{kPa}\ \text{(a 4 m)}
\]</div>
    <div class="dm-formula">\[
u=0\ (\text{nivel freático}),\qquad \sigma'=70.3\ \text{kPa}
\]</div>
    <p>A 2.5 m de profundidad (techo de la franja saturada) el suelo tiene \(u=-\gamma_w(1.5)=-14.7\ \text{kPa}\):</p>
    <div class="dm-formula">\[
\sigma=17(2.5)=42.5\ \text{kPa},\qquad \sigma'=42.5+14.7=57.2\ \text{kPa}
\]</div>
    <div class="tn-result">Resultado: la succión aporta <b>+14.7 kPa</b> de esfuerzo efectivo a 2.5 m. Si el limo se satura por lluvia, ese aporte se pierde.</div>
</div>
`
        },
        /* ───────────── 4. FLUJO Y REDES ───────────── */
        {
            id: 'flujo', after: 'capilaridad',
            title: 'Flujo de agua en el suelo: redes de flujo y sifonamiento',
            html: S`
<p>Cuando existe una diferencia de carga hidráulica, el agua se mueve por los poros. La <strong>carga total</strong> en un punto es \(h=\dfrac{u}{\gamma_w}+z\) (se desprecia la carga de velocidad, que es minúscula en suelos). El flujo ocurre de mayor a menor carga y la <strong>ley de Darcy</strong> relaciona caudal y gradiente:</p>
<div class="dm-formula">\[
v=k\,i,\qquad i=\frac{\Delta h}{L},\qquad q=k\,i\,A
\]</div>
<p>La velocidad de Darcy \(v\) es una velocidad aparente (caudal sobre área total). La velocidad real del agua en los poros es \(v_s=v/n\).</p>

<h5>Permeabilidad equivalente en suelos estratificados</h5>
<div class="dm-formula">\[
k_H=\frac{\sum k_iH_i}{\sum H_i}\quad(\text{flujo paralelo a los estratos}),\qquad
k_V=\frac{\sum H_i}{\sum (H_i/k_i)}\quad(\text{flujo perpendicular})
\]</div>
<p>Siempre \(k_H\ge k_V\): el flujo horizontal lo gobiernan las capas más permeables y el vertical las menos permeables. En depósitos naturales la relación \(k_H/k_V\) suele estar entre 2 y 20.</p>

<h5>Ecuación de Laplace y redes de flujo</h5>
<p>Para flujo permanente bidimensional en un medio homogéneo e isótropo, la carga hidráulica cumple \(\partial^2h/\partial x^2+\partial^2h/\partial z^2=0\). Su solución gráfica es la <strong>red de flujo</strong>: dos familias de curvas ortogonales.</p>
<ul>
<li><strong>Líneas de flujo:</strong> trayectorias del agua; entre dos líneas circula un caudal igual (canal de flujo).</li>
<li><strong>Líneas equipotenciales:</strong> unen puntos de igual carga; entre dos consecutivas la caída de carga es \(\Delta h=H/N_d\).</li>
<li>Los elementos deben ser aproximadamente cuadrados (relación largo/ancho cercana a 1).</li>
</ul>
<div class="dm-formula">\[
q=k\,H\,\frac{N_f}{N_d}\quad(\text{por metro de ancho}),\qquad
u=\gamma_w\left(h-z\right)
\]</div>
<p>\(N_f\) es el número de canales de flujo, \(N_d\) el número de caídas equipotenciales y \(H\) la diferencia total de carga. Esta fórmula se usa en presas de tierra, tablestacas, excavaciones bajo nivel freático y pantallas.</p>

<h5>Gradiente de salida y sifonamiento</h5>
<p>Cuando el agua sale por la superficie aguas abajo, el flujo ascendente reduce el esfuerzo efectivo. Si el gradiente iguala al <strong>gradiente crítico</strong>, el esfuerzo efectivo se anula y el suelo granular pierde toda su resistencia (arena movediza, tubificación o sifonamiento):</p>
<div class="dm-formula">\[
i_{cr}=\frac{\gamma'}{\gamma_w}=\frac{G_s-1}{1+e}\approx1,\qquad
FS=\frac{i_{cr}}{i_{salida}}
\]</div>
<p>En el diseño de presas y excavaciones se exigen factores de seguridad altos (en la práctica entre 3 y 5), porque el fenómeno es repentino y las redes de flujo reales están afectadas por anisotropía y heterogeneidad.</p>

<h5>Filtros de protección (criterios de Terzaghi)</h5>
<div class="dm-formula">\[
\frac{D_{15}^{filtro}}{D_{85}^{suelo}}<5\ \ (\text{retención}),\qquad
\frac{D_{15}^{filtro}}{D_{15}^{suelo}}>5\ \ (\text{permeabilidad})
\]</div>
<p>El filtro debe retener las partículas finas del suelo base y a la vez drenar mejor que éste; de lo contrario el agua arrastra material y se genera erosión interna.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: caudal por debajo de una tablestaca</h5>
    <p>Una red de flujo bajo una tablestaca tiene \(N_f=4\) y \(N_d=10\). La diferencia de carga es \(H=6\ \text{m}\) y \(k=3\times10^{-6}\ \text{m/s}\).</p>
    <div class="dm-formula">\[
q=kH\frac{N_f}{N_d}=(3\times10^{-6})(6)\frac{4}{10}=7.2\times10^{-6}\ \text{m}^3/\text{s}/\text{m}\approx0.62\ \text{m}^3/\text{día}/\text{m}
\]</div>
    <p>La caída por elemento es \(\Delta h=6/10=0.6\ \text{m}\). Si el elemento de salida mide 1.2 m:</p>
    <div class="dm-formula">\[
i_{salida}=\frac{0.6}{1.2}=0.5,\qquad
i_{cr}=\frac{2.68-1}{1+0.68}=1.0,\qquad FS=\frac{1.0}{0.5}=2.0
\]</div>
    <div class="tn-result">Resultado: <b>q ≈ 0.62 m³/día por metro</b> y <b>FS al sifonamiento = 2.0</b>, insuficiente frente a los 3–5 habituales; hay que alargar la tablestaca o colocar un filtro de descarga.</div>
</div>

<div class="tn-example">
    <h5><span>2</span>Ejemplo: permeabilidad equivalente</h5>
    <p>Tres estratos de 1, 2 y 1 m de espesor con \(k=10^{-4},\ 10^{-6}\) y \(10^{-5}\ \text{m/s}\).</p>
    <div class="dm-formula">\[
k_H=\frac{10^{-4}(1)+10^{-6}(2)+10^{-5}(1)}{4}=2.8\times10^{-5}\ \text{m/s},\qquad
k_V=\frac{4}{\frac{1}{10^{-4}}+\frac{2}{10^{-6}}+\frac{1}{10^{-5}}}=1.9\times10^{-6}\ \text{m/s}
\]</div>
    <div class="tn-result">Resultado: <b>kH ≈ 2.8 × 10⁻⁵ m/s</b>, <b>kV ≈ 1.9 × 10⁻⁶ m/s</b> (kH/kV ≈ 15).</div>
</div>
`
        },
        /* ───────────── 5. HIDRÓMETRO ───────────── */
        {
            id: 'hidrometro', after: 'granulometria',
            title: 'Granulometría de finos: sedimentación e hidrómetro',
            html: S`
<p>Por debajo de 0.075 mm (tamiz N° 200) ya no es posible tamizar. La distribución de las partículas finas se determina por <strong>sedimentación</strong>: se dispersa el suelo en agua con un agente defloculante y se mide cómo cae la densidad de la suspensión con el tiempo, usando un hidrómetro (ASTM D7928, antes D422; con norma INVIAS equivalente).</p>

<h5>Ley de Stokes</h5>
<p>Una partícula esférica que cae en un fluido viscoso alcanza una velocidad límite:</p>
<div class="dm-formula">\[
v=\frac{(\gamma_s-\gamma_w)\,D^2}{18\,\eta}
\quad\Longrightarrow\quad
D=\sqrt{\frac{18\,\eta\,L}{(\gamma_s-\gamma_w)\,t}}
\]</div>
<p>donde \(L\) es la profundidad efectiva a la que flota el bulbo del hidrómetro y \(t\) el tiempo transcurrido. En unidades de laboratorio:</p>
<div class="dm-formula">\[
D\ (\text{mm})=K\sqrt{\frac{L\ (\text{cm})}{t\ (\text{min})}},\qquad
K=\sqrt{\frac{30\,\eta}{980\,(G_s-1)}}\ \ (\eta\ \text{en poise})
\]</div>
<p>La viscosidad \(\eta\) depende de la temperatura, por eso se registra \(T\) en cada lectura. Cuanto más fina la partícula, más tiempo tarda en descender: lecturas a 2, 5, 15, 30, 60, 250 y 1440 minutos cubren el rango de 0.05 a 0.001 mm.</p>

<h5>Porcentaje más fino</h5>
<div class="dm-formula">\[
R_c=R+C_T-C_d,\qquad
P=\frac{R_c\,a}{W_s}\times100,\qquad
a=\frac{G_s(1.65)}{(G_s-1)(2.65)}
\]</div>
<p>\(R\) es la lectura del hidrómetro, \(C_T\) la corrección por temperatura, \(C_d\) la corrección por defloculante y menisco (lectura en agua con defloculante), y \(a\) la corrección por gravedad específica (hidrómetro 152H). \(W_s\) es la masa seca de la muestra en suspensión. Si el material pasa por un tamiz N° 10 antes del ensayo, el porcentaje se refiere al total multiplicando por el % que pasa N° 10.</p>

<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Tamaños de referencia</b><p>Arena: 4.75 – 0.075 mm · Limo: 0.075 – 0.002 mm · Arcilla: menor de 0.002 mm (2 µm). Los límites varían ligeramente entre sistemas (USDA, SUCS, AASHTO).</p></div>
    <div class="tn-mini"><b>Curva combinada</b><p>El resultado se une a la curva del tamizado para dibujar la curva granulométrica completa, desde grava hasta arcilla, con el diámetro en escala logarítmica.</p></div>
</div>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: diámetro y porcentaje a 60 minutos</h5>
    <p>\(G_s=2.70\), temperatura 20 °C (\(\eta=0.01005\ \text{poise}\)), profundidad efectiva \(L=12\ \text{cm}\), \(t=60\ \text{min}\), \(W_s=50\ \text{g}\) y lectura corregida \(R_c=24\).</p>
    <div class="dm-formula">\[
K=\sqrt{\frac{30(0.01005)}{980(1.70)}}=0.01345,\qquad
D=0.01345\sqrt{\frac{12}{60}}=0.0060\ \text{mm}
\]</div>
    <div class="dm-formula">\[
a=\frac{2.70(1.65)}{1.70(2.65)}=0.989,\qquad
P=\frac{24(0.989)}{50}(100)=47.5\%
\]</div>
    <div class="tn-result">Resultado: el <b>47.5 %</b> de la muestra en suspensión es más fino que <b>6 µm</b>.</div>
</div>

<div class="tn-note tn-warn"><b>Fuentes de error.</b> Dispersión incompleta (el suelo queda floculado y parece más grueso), cambios de temperatura entre lecturas, agitación al introducir el hidrómetro, burbujas y uso de agua destilada con distinta cantidad de defloculante en el blanco. La ley de Stokes supone esferas lisas; las partículas laminares de arcilla caen más despacio, por lo que el “diámetro equivalente” es un diámetro de esfera con igual velocidad de caída.</div>
`
        },
        /* ───────────── 6. AASHTO ───────────── */
        {
            id: 'aashto', after: 'sucs',
            title: 'Clasificación AASHTO y evaluación de la subrasante',
            html: S`
<p>El sistema AASHTO (M 145, también ASTM D3282) clasifica los suelos según su aptitud como <strong>subrasante de carreteras</strong>. A diferencia del SUCS, usa solo tres parámetros: porcentaje que pasa los tamices N° 10, 40 y 200, y los límites de Atterberg de la fracción que pasa el N° 40.</p>

<h5>Grupos y criterios</h5>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Grupo</th><th>% pasa N° 10</th><th>% pasa N° 40</th><th>% pasa N° 200</th><th>LL</th><th>IP</th></tr></thead><tbody>
<tr class="dm-sub"><td colspan="6">Materiales granulares (35 % o menos pasa el N° 200)</td></tr>
<tr><td>A-1-a</td><td>≤ 50</td><td>≤ 30</td><td>≤ 15</td><td>—</td><td>≤ 6</td></tr>
<tr><td>A-1-b</td><td>—</td><td>≤ 50</td><td>≤ 25</td><td>—</td><td>≤ 6</td></tr>
<tr><td>A-3</td><td>—</td><td>≥ 51</td><td>≤ 10</td><td>—</td><td>NP</td></tr>
<tr><td>A-2-4</td><td>—</td><td>—</td><td>≤ 35</td><td>≤ 40</td><td>≤ 10</td></tr>
<tr><td>A-2-5</td><td>—</td><td>—</td><td>≤ 35</td><td>≥ 41</td><td>≤ 10</td></tr>
<tr><td>A-2-6</td><td>—</td><td>—</td><td>≤ 35</td><td>≤ 40</td><td>≥ 11</td></tr>
<tr><td>A-2-7</td><td>—</td><td>—</td><td>≤ 35</td><td>≥ 41</td><td>≥ 11</td></tr>
<tr class="dm-sub"><td colspan="6">Suelos limo–arcillosos (más de 35 % pasa el N° 200)</td></tr>
<tr><td>A-4</td><td>—</td><td>—</td><td>≥ 36</td><td>≤ 40</td><td>≤ 10</td></tr>
<tr><td>A-5</td><td>—</td><td>—</td><td>≥ 36</td><td>≥ 41</td><td>≤ 10</td></tr>
<tr><td>A-6</td><td>—</td><td>—</td><td>≥ 36</td><td>≤ 40</td><td>≥ 11</td></tr>
<tr><td>A-7-5</td><td>—</td><td>—</td><td>≥ 36</td><td>≥ 41</td><td>IP ≤ LL − 30</td></tr>
<tr><td>A-7-6</td><td>—</td><td>—</td><td>≥ 36</td><td>≥ 41</td><td>IP &gt; LL − 30</td></tr>
</tbody><caption>Los grupos se asignan evaluando la tabla de izquierda a derecha; el primero que cumple todos los criterios es el correcto.</caption></table></div>

<h5>Índice de grupo (IG)</h5>
<p>Dentro de cada grupo, el índice de grupo estima la calidad relativa de la subrasante (a mayor IG, peor material):</p>
<div class="dm-formula">\[
IG=(F-35)\left[0.2+0.005\,(LL-40)\right]+0.01\,(F-15)\,(IP-10)
\]</div>
<p>donde \(F\) es el % que pasa el tamiz N° 200. Reglas: el IG se redondea al entero más cercano; si resulta negativo se toma 0; para A-2-6 y A-2-7 se usa solo el segundo término \(0.01(F-15)(IP-10)\); y para A-1-a, A-1-b, A-2-4, A-2-5 y A-3 el IG es 0. Se escribe entre paréntesis después del grupo: A-7-6(12).</p>

<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Subrasante buena</b><p>A-1, A-3 y A-2-4/A-2-5 con IG = 0: gravas y arenas con pocos finos. Buen drenaje y capacidad de soporte.</p></div>
    <div class="tn-mini"><b>Subrasante regular a mala</b><p>A-4 a A-7: limos y arcillas. Pierden capacidad al saturarse; suelen requerir mejoramiento, estabilización o capas de reemplazo.</p></div>
</div>

<h5>SUCS frente a AASHTO</h5>
<ul>
<li>SUCS (ASTM D2487) es el sistema usado en cimentaciones, presas y terraplenes; separa 50 % de finos y usa la carta de plasticidad.</li>
<li>AASHTO se usa en carreteras y pavimentos; separa 35 % de finos y entrega un índice de comportamiento (IG).</li>
<li>No hay equivalencia exacta: un suelo A-7-6 es en general CL o CH, un A-3 suele ser SP, un A-1-a suele ser GW, GP o SW, pero siempre hay que clasificar con ambos sistemas si el proyecto lo pide.</li>
</ul>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: clasificar un suelo fino</h5>
    <p>Datos de laboratorio: pasa N° 200 = 62 %, LL = 45 %, IP = 22 %.</p>
    <p>Como \(F=62\%>35\%\), es limo–arcilloso. \(LL\ge41\) e \(IP>LL-30=15\), luego es <strong>A-7-6</strong>.</p>
    <div class="dm-formula">\[
IG=(62-35)\left[0.2+0.005(45-40)\right]+0.01(62-15)(22-10)=6.08+5.64=11.7\approx12
\]</div>
    <div class="tn-result">Resultado: <b>A-7-6(12)</b>, subrasante mala; en SUCS correspondería a una arcilla de plasticidad media a alta (CL o CH).</div>
</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> AASHTO M 145 / ASTM D3282 para la clasificación; los ensayos de entrada son granulometría (INV E-123), límites líquido y plástico (INV E-125 y E-126). Para el diseño de pavimentos se complementa con el CBR (INVIAS) y el módulo resiliente de la subrasante.</div>
`
        },
        /* ───────────── 7. EXPLORACIÓN ───────────── */
        {
            id: 'exploracion', after: 'campo',
            title: 'Exploración del subsuelo, muestreo y ensayos in situ',
            html: S`
<p>Ningún ensayo de laboratorio vale más que la muestra que lo origina. La exploración define el perfil estratigráfico, el nivel freático y las muestras que representan cada estrato. En Colombia el alcance mínimo lo fija el Título H de la NSR-10.</p>

<h5>Categoría de la unidad de construcción y sondeos mínimos (NSR-10, H.3)</h5>
<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Categoría</th><th>Pisos</th><th>Carga de servicio por columna</th><th>Profundidad mínima</th><th>Número mínimo de sondeos</th></tr></thead><tbody>
<tr><td>Baja</td><td>Hasta 3</td><td>&lt; 800 kN</td><td>6 m</td><td>3</td></tr>
<tr><td>Media</td><td>4 a 10</td><td>801 a 4 000 kN</td><td>15 m</td><td>4</td></tr>
<tr><td>Alta</td><td>11 a 20</td><td>4 001 a 8 000 kN</td><td>25 m</td><td>4</td></tr>
<tr><td>Especial</td><td>Más de 20</td><td>&gt; 8 000 kN</td><td>30 m</td><td>5</td></tr>
</tbody><caption>NSR-10, Título H, tablas H.3.1-1 y H.3.2-1. Se aplica la categoría más desfavorable. En todos los casos se requieren al menos tres sondeos por estudio; la profundidad puede ser mayor según el bulbo de esfuerzos y la presencia de estratos blandos.</caption></table></div>

<h5>Métodos de exploración</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Apiques y trincheras</b><p>Excavaciones a cielo abierto de 1–3 m. Permiten ver el perfil, medir densidad en sitio y tomar bloques inalterados. Limitados por el nivel freático.</p></div>
    <div class="tn-mini"><b>Perforaciones con muestreo</b><p>Barrenos manuales o mecánicos y perforación rotatoria. Se combinan con el SPT cada 1–1.5 m y con tubos de pared delgada.</p></div>
    <div class="tn-mini"><b>Penetración de cono (CPT)</b><p>Se hinca un cono midiendo resistencia de punta \(q_c\) y fricción lateral \(f_s\) (ASTM D5778). Da perfil continuo y buenos parámetros en arenas y arcillas blandas.</p></div>
    <div class="tn-mini"><b>Geofísica</b><p>Refracción sísmica, down-hole, MASW o resistividad eléctrica: dan velocidades de onda \(V_s\) (clasificación sísmica del sitio) y detectan variaciones laterales entre sondeos.</p></div>
</div>

<h5>Muestras alteradas e inalteradas</h5>
<p>Las muestras <strong>alteradas</strong> (cuchara partida, barreno) sirven para clasificación, granulometría, límites y compactación. Las <strong>inalteradas</strong> se toman con tubo de pared delgada (Shelby, ASTM D1587) o con bloques; conservan estructura y humedad natural y son obligatorias para consolidación, triaxial y corte directo. Deben sellarse con parafina, transportarse sin golpes y ensayarse pronto (ASTM D4220).</p>

<h5>Ensayo de penetración estándar (SPT)</h5>
<p>Un martillo de 63.5 kg cae 76 cm sobre un tubo partido de 51 mm de diámetro. Se cuentan los golpes para penetrar tres tramos de 15 cm; <strong>N es la suma de los dos últimos tramos</strong> (ASTM D1586). El valor medido se corrige por energía, diámetro del pozo, varillas y tipo de muestreador:</p>
<div class="dm-formula">\[
N_{60}=\frac{N\,\eta_H\,\eta_B\,\eta_S\,\eta_R}{60},\qquad
(N_1)_{60}=C_N\,N_{60},\qquad
C_N=\sqrt{\frac{100\ \text{kPa}}{\sigma'_{v0}}}\le2
\]</div>
<p>donde \(\eta_H\) es la eficiencia del martillo en % (60 % para martillo de seguridad con cuerda y polea; 78 % para martillo donut en caída libre tipo Japón), \(\eta_B\) la corrección por diámetro del pozo (1.0 hasta 120 mm), \(\eta_S\) por muestreador (1.0 estándar, 0.8 con camisa en arenas densas y arcillas) y \(\eta_R\) por longitud de varilla (0.75 para menos de 4 m, 1.0 para más de 10 m). \(C_N\) (Liao y Whitman) solo se aplica en suelos granulares.</p>

<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>N (sin corregir)</th><th>Arena: compacidad</th><th>Arcilla: consistencia</th><th>qu aproximada (kPa)</th></tr></thead><tbody>
<tr><td>0 – 2</td><td>Muy suelta</td><td>Muy blanda</td><td>&lt; 25</td></tr>
<tr><td>2 – 4</td><td>Muy suelta</td><td>Blanda</td><td>25 – 50</td></tr>
<tr><td>4 – 8</td><td>Suelta</td><td>Media</td><td>50 – 100</td></tr>
<tr><td>8 – 15</td><td>Media</td><td>Firme</td><td>100 – 200</td></tr>
<tr><td>15 – 30</td><td>Densa</td><td>Muy firme</td><td>200 – 400</td></tr>
<tr><td>&gt; 30</td><td>Muy densa</td><td>Dura</td><td>&gt; 400</td></tr>
</tbody><caption>Terzaghi y Peck. Para arenas, N &lt; 4 muy suelta, 4–10 suelta, 10–30 media, 30–50 densa y &gt; 50 muy densa.</caption></table></div>

<h5>Correlaciones usuales</h5>
<div class="dm-formula">\[
\phi'\approx27.1+0.3\,(N_1)_{60}-0.00054\,(N_1)_{60}^2\ \ (\text{arenas; Peck, Hanson y Thornburn})
\]</div>
<div class="dm-formula">\[
s_u\approx\alpha'\,N_{60}\,p_a,\quad p_a=100\ \text{kPa},\quad\alpha'\approx0.045\text{ a }0.07\ (\text{decrece con IP})
\]</div>
<div class="tn-note tn-warn"><b>Las correlaciones son orientativas.</b> El SPT depende mucho del equipo y del operador, y en gravas, suelos cementados y arcillas sensibles pierde confiabilidad. Úsalas para anteproyecto y para contrastar los ensayos de laboratorio, no para reemplazarlos.</div>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: corregir un SPT en arena</h5>
    <p>A 6 m de profundidad en arena se registra \(N=18\). Martillo de seguridad con polea (\(\eta_H=60\%\)), pozo de 100 mm (\(\eta_B=1.0\)), muestreador estándar (\(\eta_S=1.0\)), varillas de 6 m (\(\eta_R=0.95\)); \(\sigma'_{v0}=60\ \text{kPa}\).</p>
    <div class="dm-formula">\[
N_{60}=\frac{18(60)(1.0)(1.0)(0.95)}{60}=17.1,\qquad
C_N=\sqrt{\frac{100}{60}}=1.29,\qquad (N_1)_{60}=22
\]</div>
    <div class="dm-formula">\[
\phi'\approx27.1+0.3(22)-0.00054(22)^2=33.4^\circ
\]</div>
    <div class="tn-result">Resultado: <b>(N₁)₆₀ ≈ 22</b> (arena de compacidad media) y <b>φ′ ≈ 33°</b>.</div>
</div>

<div class="tn-note tn-norm"><b>Informe de exploración.</b> Incluye localización y cotas de los sondeos, registro de perforación con descripción visual (color, compacidad, humedad, olor), nivel freático medido y su fecha, fotografías de las muestras, resultados de laboratorio y un perfil estratigráfico de síntesis. El nivel freático fluctúa con las lluvias: la fecha de la medición forma parte del dato.</div>
`
        }
    ];

    global.TN_ADD('ms1', sec, {
        bib: [
            'Mitchell, J. K. y Soga, K. <em>Fundamentals of Soil Behavior</em>, 3.ª ed. Wiley.',
            'Das, B. M. <em>Fundamentals of Geotechnical Engineering</em>. Cengage Learning (relaciones de fase, flujo, clasificación AASHTO).',
            'AASHTO M 145 / ASTM D3282 — Clasificación de suelos para subrasantes. ASTM D7928 (hidrómetro), D1586 (SPT), D1587 (muestreo con tubo de pared delgada), D5778 (CPT), D4253 y D4254 (densidades máxima y mínima índice).',
            'NSR-10, Título H, capítulo H.3: exploración del subsuelo (categorías de unidades de construcción, número y profundidad de sondeos).'
        ]
    });
})(window);
