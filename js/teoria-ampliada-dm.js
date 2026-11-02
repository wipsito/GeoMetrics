/* GeoMetrics — Teoría ampliada · Diseño de Mezclas */
(function (global) {
    'use strict';
    var S = String.raw;

    var sec = [
        {
            id: 'hidratacion', after: 'cemento',
            title: 'Hidratación del cemento, fraguado y calor de hidratación',
            html: S`
<p>El cemento Portland no “seca”: reacciona químicamente con el agua (hidratación). Los productos de la reacción —principalmente silicato de calcio hidratado (C–S–H) y hidróxido de calcio— forman una red que endurece la pasta y da resistencia. La velocidad y el calor de la reacción determinan el fraguado, el desarrollo de resistencia y el riesgo de fisuración.</p>

<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Compuesto</th><th>Fórmula</th><th>Aporte principal</th><th>Calor aprox. (kJ/kg)</th></tr></thead><tbody>
<tr><td>Silicato tricálcico (C₃S)</td><td>3CaO·SiO₂</td><td>Resistencia a edades tempranas (hasta 28 d)</td><td>≈ 500</td></tr>
<tr><td>Silicato dicálcico (C₂S)</td><td>2CaO·SiO₂</td><td>Resistencia a largo plazo; hidratación lenta</td><td>≈ 250</td></tr>
<tr><td>Aluminato tricálcico (C₃A)</td><td>3CaO·Al₂O₃</td><td>Fraguado rápido (controlado con yeso); vulnerable a sulfatos</td><td>≈ 850</td></tr>
<tr><td>Ferroaluminato tetracálcico (C₄AF)</td><td>4CaO·Al₂O₃·Fe₂O₃</td><td>Color; poca resistencia</td><td>≈ 400</td></tr>
</tbody><caption>Valores de calor de hidratación completa de los compuestos puros; el cemento real da en conjunto 300–450 kJ/kg según su composición y finura.</caption></table></div>

<h5>Etapas de la hidratación</h5>
<ol>
<li><strong>Periodo inicial</strong> (minutos): disolución rápida y pico breve de calor, sobre todo del C₃A y el yeso.</li>
<li><strong>Periodo de latencia o inducción</strong> (1–3 h): la mezcla permanece plástica; es la ventana para transportar, colocar y compactar.</li>
<li><strong>Aceleración</strong>: comienza el fraguado inicial; la hidratación del C₃S libera calor de forma intensa y se forma el C–S–H.</li>
<li><strong>Desaceleración y difusión</strong>: la velocidad cae porque la reacción pasa a estar controlada por la difusión a través de los productos; la resistencia sigue aumentando por meses mientras haya agua y cemento sin hidratar.</li>
</ol>
<p>El <strong>fraguado inicial y final</strong> (ensayo de Vicat, NTC 118/ASTM C191) marca el tiempo en que la pasta pierde plasticidad y adquiere rigidez; no equivale a un nivel de resistencia concreto. Una relación a/c menor o una temperatura mayor lo aceleran; los retardantes y las bajas temperaturas lo prolongan.</p>

<h5>Calor de hidratación y concreto masivo</h5>
<p>En elementos gruesos (cimentaciones, estribos, presas) el calor no se disipa y la temperatura interior sube. El enfriamiento posterior en la superficie produce diferencias térmicas que fisuran el concreto. Estimación del aumento adiabático:</p>
<div class="dm-formula">\[
\Delta T_{ad}\approx\frac{q\,C}{c_p\,\rho}
\]</div>
<p>con \(q\) = calor liberado por kg de cemento, \(C\) = contenido de cemento (kg/m³), \(c_p\approx1.0\ \text{kJ/kg·°C}\) y \(\rho\approx2400\ \text{kg/m}^3\). Medidas de control: reducir cemento, usar cementos de bajo calor o adiciones (ceniza volante, escoria), enfriar los agregados y el agua (hielo), colocar por capas y curar con aislamiento. Como referencia habitual, se limita la diferencia entre núcleo y superficie a unos 20 °C y la temperatura máxima a unos 70 °C (para evitar etringita diferida).</p>

<h5>Madurez del concreto</h5>
<p>La resistencia depende de la combinación temperatura–tiempo. El método de Nurse–Saul usa el índice de madurez:</p>
<div class="dm-formula">\[
M=\sum (T-T_0)\,\Delta t\quad[\,^\circ\text{C·h}\,],\qquad T_0\approx-10\ ^\circ\text{C}
\]</div>
<p>Dos concretos con la misma madurez tienen una resistencia similar. Se calibra con probetas de la misma mezcla (ASTM C1074) y permite estimar la resistencia en obra para decidir, por ejemplo, el desencofrado.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: calor adiabático</h5>
    <p>Concreto con \(C=350\ \text{kg/m}^3\) y \(q=330\ \text{kJ/kg}\).</p>
    <div class="dm-formula">\[
\Delta T_{ad}=\frac{330(350)}{1.0(2400)}=48\ ^\circ\text{C}
\]</div>
    <div class="tn-result">Resultado: partiendo de 25 °C, el núcleo de un elemento masivo puede llegar a unos <b>73 °C</b>, por encima del límite recomendado: hay que reducir cemento o enfriar los materiales.</div>
</div>
<div class="tn-example">
    <h5><span>2</span>Ejemplo: índice de madurez</h5>
    <p>Un concreto estuvo 24 h a 20 °C y luego 24 h a 10 °C.</p>
    <div class="dm-formula">\[
M=(20+10)(24)+(10+10)(24)=720+480=1200\ ^\circ\text{C·h}
\]</div>
    <div class="tn-result">Resultado: <b>M = 1 200 °C·h</b>; el mismo concreto a 20 °C constante alcanzaría ese valor en 40 h.</div>
</div>
`
        },
        {
            id: 'granulometria-ideal', after: 'agregados',
            title: 'Granulometría ideal y combinación de agregados',
            html: S`
<p>Una buena granulometría combinada llena los vacíos con la menor cantidad de pasta, mejora la trabajabilidad y reduce la retracción. En vez de un solo agregado, se combinan arena y grava hasta que la mezcla se ajuste a una curva de referencia.</p>

<h5>Curvas de referencia</h5>
<div class="dm-formula">\[
\text{Fuller–Thompson: }P=100\sqrt{\frac{d}{D}},\qquad
\text{Bolomey: }P=a+(100-a)\sqrt{\frac{d}{D}}
\]</div>
<p>\(P\) es el porcentaje que pasa el tamiz de abertura \(d\); \(D\) es el tamaño máximo; \(a\) vale 10 a 12 para agregados redondeados y 12 a 15 para triturados (Bolomey incluye la finura de la pasta). Una curva Fuller es el límite teórico de máxima densidad; en la práctica se usa algo más fina para obtener cohesión.</p>

<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Tamiz (mm)</th><th>19</th><th>9.5</th><th>4.75</th><th>2.36</th><th>1.18</th><th>0.6</th><th>0.3</th><th>0.15</th></tr></thead><tbody>
<tr><td>% que pasa (Fuller, D = 19 mm)</td><td>100</td><td>70.7</td><td>50.0</td><td>35.2</td><td>24.9</td><td>17.8</td><td>12.6</td><td>8.9</td></tr>
</tbody><caption>Curva de Fuller para tamaño máximo de 19 mm (\(P=100\sqrt{d/D}\)).</caption></table></div>

<h5>Combinación por módulo de finura</h5>
<p>El módulo de finura de una mezcla de dos agregados es el promedio ponderado de sus módulos. Para un módulo combinado objetivo \(m\), con arena \(m_f\) y grava \(m_g\), la fracción de arena sobre el total de agregado es:</p>
<div class="dm-formula">\[
p_{arena}=\frac{m_g-m}{m_g-m_f}
\]</div>
<p>Esta fracción debe ajustarse luego por trabajabilidad, bombeo y acabado. Un exceso de finos aumenta la demanda de agua y la retracción; un déficit produce mezclas ásperas y segregables.</p>

<h5>Criterios complementarios</h5>
<ul>
<li><strong>Tamaño máximo nominal (TMN)</strong>: no mayor que 1/5 de la menor dimensión del elemento, 1/3 del espesor de la losa ni 3/4 del espacio libre entre barras (NSR-10 C.3.3.2).</li>
<li><strong>Granulometría discontinua</strong>: se omite un tamaño intermedio; puede dar resistencia con poca pasta, pero es sensible a la segregación.</li>
<li><strong>Forma y textura</strong>: las partículas angulares y rugosas mejoran la adherencia (mayor resistencia a flexión) pero exigen más agua que las redondeadas.</li>
<li><strong>Humedad y absorción</strong>: toda dosificación debe corregirse por la humedad de los agregados en obra (el agua de mezcla efectiva es la total menos la absorbida).</li>
</ul>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: porcentaje de arena</h5>
    <p>Arena con \(m_f=2.40\) y grava con \(m_g=6.80\); módulo combinado deseado \(m=5.0\).</p>
    <div class="dm-formula">\[
p_{arena}=\frac{6.80-5.0}{6.80-2.40}=0.409
\]</div>
    <div class="tn-result">Resultado: <b>41 % arena</b> y 59 % grava del total de agregado, en masa seca.</div>
</div>
`
        },
        {
            id: 'ejemplo-aci', after: 'aci',
            title: 'Ejemplo completo de dosificación por el método ACI 211.1',
            html: S`
<p>Se diseña un concreto de <strong>\(f'_c=28\ \text{MPa}\)</strong> para una columna con asentamiento de 75–100 mm, tamaño máximo nominal de 19 mm, sin aire incorporado y sin datos de desviación estándar. Se siguen los pasos del método ACI 211.1 con tablas típicas; en un diseño real deben usarse los datos medidos de los materiales y los valores de las tablas del manual.</p>

<h5>Datos de los materiales</h5>
<ul>
<li>Cemento: densidad relativa 3.15.</li>
<li>Arena: densidad relativa seca 2.60, módulo de finura 2.80.</li>
<li>Grava: densidad relativa seca 2.65, masa unitaria compactada seca 1 600 kg/m³.</li>
</ul>

<h5>Pasos</h5>
<ol>
<li><strong>Resistencia de diseño.</strong> NSR-10 C.5.3.2.2 para \(f'_c\) de 21 a 35 MPa sin datos: \(f'_{cr}=f'_c+8.5=36.5\ \text{MPa}\).</li>
<li><strong>Agua y aire.</strong> De la tabla (asentamiento 75–100 mm, TMN 19 mm, sin aire incorporado): agua = 205 kg/m³ y aire atrapado ≈ 2 %.</li>
<li><strong>Relación a/c.</strong> Para \(f'_{cr}=36.5\ \text{MPa}\), interpolando entre 0.48 (35 MPa) y 0.42 (40 MPa): a/c ≈ 0.46. Se verifica además la exigencia de durabilidad de NSR-10 C.4.</li>
<li><strong>Cemento.</strong> \(C=205/0.46=446\ \text{kg/m}^3\).</li>
<li><strong>Grava.</strong> Con TMN 19 mm y módulo de finura de la arena de 2.80 la fracción de volumen compactado es 0.62: \(0.62\times1600=992\ \text{kg/m}^3\).</li>
<li><strong>Arena por volumen absoluto.</strong></li>
</ol>

<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Componente</th><th>Masa (kg/m³)</th><th>Volumen absoluto (m³)</th></tr></thead><tbody>
<tr><td>Agua</td><td>205</td><td>0.2050</td></tr>
<tr><td>Cemento</td><td>446</td><td>0.1415</td></tr>
<tr><td>Grava</td><td>992</td><td>0.3743</td></tr>
<tr><td>Aire atrapado (2 %)</td><td>—</td><td>0.0200</td></tr>
<tr><td>Subtotal</td><td></td><td>0.7408</td></tr>
<tr><td>Arena (por diferencia)</td><td>674</td><td>0.2592</td></tr>
<tr class="dm-sub"><td>Total</td><td>2 317</td><td>1.0000</td></tr>
</tbody></table></div>

<div class="dm-formula">\[
V_{arena}=1-0.7408=0.2592\ \text{m}^3\ \Rightarrow\ M_{arena}=0.2592(2.60)(1000)=674\ \text{kg}
\]</div>

<h5>Proporciones y correcciones</h5>
<div class="dm-formula">\[
\text{cemento : arena : grava : agua}=1:1.51:2.22:0.46\quad(\text{en masa})
\]</div>
<p>Si en obra la arena trae 4 % de humedad con 1.5 % de absorción, y la grava 1 % con 0.8 %, se corrige la masa húmeda y el agua de mezcla:</p>
<div class="dm-formula">\[
\text{arena húmeda}=674(1.04)=701\ \text{kg},\quad \text{grava húmeda}=992(1.01)=1002\ \text{kg}
\]</div>
<div class="dm-formula">\[
\text{agua libre aportada}=674(0.04-0.015)+992(0.01-0.008)=16.9+2.0=18.9\ \text{kg}\ \Rightarrow\ \text{agua a añadir}=205-19=186\ \text{kg}
\]</div>
<div class="tn-result">Resultado: por m³, <b>446 kg de cemento, 701 kg de arena húmeda, 1 002 kg de grava húmeda y 186 kg de agua</b>. Esta mezcla es un punto de partida: debe verificarse con una mezcla de prueba (asentamiento, masa unitaria y resistencia a 7 y 28 días) y ajustarse.</div>
<div class="tn-note tn-warn"><b>Pesa el cemento como en la tanda real.</b> La mezcla de prueba de laboratorio suele hacerse en 0.02–0.05 m³; hay que escalar proporciones y recalcular cada ajuste de agua o aditivo sobre el volumen real.</div>
`
        },
        {
            id: 'retraccion', after: 'duro',
            title: 'Retracción, fluencia y fisuración',
            html: S`
<p>El concreto cambia de volumen aunque no esté cargado, y bajo carga sostenida sigue deformándose con el tiempo. Ambos fenómenos explican la mayor parte de las fisuras no estructurales y las deflexiones a largo plazo.</p>

<h5>Tipos de retracción</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Plástica</b><p>En las primeras horas, cuando el agua se evapora de la superficie más rápido de lo que sale por exudación (viento, sol, baja humedad). Causa fisuras cortas y paralelas. Se evita con protección contra la evaporación, nebulización y curado inmediato.</p></div>
    <div class="tn-mini"><b>Por secado</b><p>Pérdida de agua de los poros capilares en el concreto endurecido; es la más importante. Valores típicos: 400 a 800 × 10⁻⁶ (microdeformaciones) a largo plazo. Aumenta con la cantidad de pasta, la relación a/c, la menor humedad ambiente y los elementos delgados.</p></div>
    <div class="tn-mini"><b>Autógena</b><p>Contracción interna por consumo de agua en la hidratación, sin intercambio con el exterior; relevante en concretos con a/c &lt; 0.40 (alto desempeño). Se mitiga con curado interno (agregado liviano saturado, polímeros superabsorbentes).</p></div>
    <div class="tn-mini"><b>Térmica y por carbonatación</b><p>La térmica sigue al enfriamiento tras el calor de hidratación (\(\alpha\approx10\times10^{-6}\ /^\circ\text{C}\)); la carbonatación produce una pequeña contracción adicional en la zona superficial.</p></div>
</div>

<p>Si la retracción está restringida por apoyos, muros o armadura, aparecen esfuerzos de tracción que superan la baja resistencia del concreto en tracción y producen fisuras. El esfuerzo restringido es:</p>
<div class="dm-formula">\[
\sigma_{sh}=R\,E_c\,\varepsilon_{sh}\,(1-\text{relajación}),\qquad R=0\ \text{(libre) a }1\ \text{(totalmente restringido)}
\]</div>

<h5>Fluencia (flujo plástico)</h5>
<p>Bajo carga sostenida, la deformación continúa creciendo con el tiempo. Se expresa con el coeficiente de fluencia \(\varphi\), de modo que la deformación total final es:</p>
<div class="dm-formula">\[
\varepsilon_{final}=\varepsilon_{el}\,(1+\varphi),\qquad \varphi\approx1.5\text{ a }3
\]</div>
<p>Aumenta con la carga a edad temprana, la mayor relación a/c y la menor humedad; disminuye con agregados rígidos y concretos de resistencia alta. En vigas, la fluencia multiplica la deflexión inmediata: NSR-10 C.9.5.2.5 usa el factor \(\lambda_\Delta=\xi/(1+50\rho')\), con \(\xi=2.0\) para cargas sostenidas de 5 años o más (véase Estructuras de concreto).</p>

<h5>Control de la fisuración</h5>
<ul>
<li>Reducir el contenido de agua y de pasta; usar la mayor cantidad posible de agregado grueso.</li>
<li>Curar durante al menos 7 días en climas normales (cemento tipo I) para limitar la retracción temprana.</li>
<li>Colocar <strong>juntas de contracción</strong> en losas: separación del orden de 24 a 36 veces el espesor, con corte a 1/4 del espesor realizado a las 6–18 horas del vaciado.</li>
<li>Armadura de retracción y temperatura (NSR-10 C.7.12: cuantía mínima 0.0018 para barras grado 420 en losas).</li>
<li>Aditivos reductores de retracción o cementos expansivos (compensación de retracción).</li>
</ul>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: deformación por retracción de una losa</h5>
    <p>Losa de 12 m de longitud con retracción final \(\varepsilon_{sh}=600\times10^{-6}\) libre de restricciones.</p>
    <div class="dm-formula">\[
\Delta L=600\times10^{-6}(12\,000)=7.2\ \text{mm}
\]</div>
    <div class="dm-formula">\[
\sigma_{sh}(R=0.5)=0.5(25\,000)(600\times10^{-6})=7.5\ \text{MPa (sin relajación)}
\]</div>
    <div class="tn-result">Resultado: la losa se acortaría <b>7.2 mm</b>; con restricción parcial, el esfuerzo teórico (7.5 MPa) supera la resistencia a tracción del concreto (≈ 3 MPa): <b>habrá fisuras</b>, por lo que se necesitan juntas y armadura de control. (La fluencia reduce este esfuerzo a la mitad aproximadamente.)</div>
</div>
`
        },
        {
            id: 'especiales', after: 'prueba',
            title: 'Concretos especiales',
            html: S`
<p>Cuando las condiciones de la obra (peso, volumen, ductilidad, ambiente, bombeo) lo exigen, se modifica la dosificación habitual.</p>

<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Concreto</th><th>Características</th><th>Claves de diseño</th></tr></thead><tbody>
<tr><td><strong>Liviano estructural</strong></td><td>Densidad ≈ 1 400 – 1 850 kg/m³ y resistencia de hasta 35 MPa con agregado de arcilla o pizarra expandida</td><td>Pre-saturar el agregado (absorbe mucha agua); \(E_c\) menor (NSR-10 C.8.5.1 usa \(w_c^{1.5}0.043\sqrt{f'_c}\)); menor resistencia al cortante (factor λ)</td></tr>
<tr><td><strong>Masivo</strong></td><td>Elementos de gran volumen (cimentaciones, estribos)</td><td>Controlar el calor de hidratación y el gradiente térmico; cementos de bajo calor, adiciones, hielo, curado aislado</td></tr>
<tr><td><strong>Bombeable</strong></td><td>Debe fluir por tuberías sin segregarse</td><td>Granulometría continua, finos suficientes (cemento + arena fina del orden de 400 kg/m³ o más), TMN ≤ 1/3 del diámetro de la tubería; asentamiento 100–150 mm; plastificantes</td></tr>
<tr><td><strong>Autocompactante (CAC/SCC)</strong></td><td>Fluye por su peso entre barras congestionadas sin vibrado</td><td>Gran volumen de pasta y finos, superplastificante, modificador de viscosidad; extensión del cono de 650–800 mm y ensayo de embudo V y de caja L (ASTM C1611)</td></tr>
<tr><td><strong>Con fibras</strong></td><td>Acero, polipropileno o vidrio; controlan fisuras y dan tenacidad</td><td>Dosis 0.2–1 % del volumen; reducen trabajabilidad; el rendimiento se mide con ensayos de flexión (ASTM C1609)</td></tr>
<tr><td><strong>Alto desempeño (CAD)</strong></td><td>\(f'_c\ge55\ \text{MPa}\), a/c &lt; 0.35 y gran durabilidad</td><td>Superplastificante de alto rango, humo de sílice (5–10 %), agregado resistente, curado cuidadoso</td></tr>
<tr><td><strong>Para pavimentos</strong></td><td>Se especifica por <strong>módulo de rotura</strong> a flexión (MR) a 28 días</td><td>\(f_r\approx0.62\sqrt{f'_c}\) (ACI 318); MR típico 3.8–4.5 MPa; agregado duro y bien graduado; aire incorporado en climas fríos</td></tr>
<tr><td><strong>Lanzado (shotcrete)</strong></td><td>Se proyecta neumáticamente a gran velocidad; túneles, taludes</td><td>Vía seca o húmeda; acelerantes de fraguado; control del rebote</td></tr>
<tr><td><strong>Permeable</strong></td><td>Poco o nada de finos; 15–25 % de vacíos</td><td>Drenaje de aguas lluvias; resistencia reducida (5–20 MPa); relación a/c 0.27–0.34</td></tr>
</tbody></table></div>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: módulo de rotura de un pavimento</h5>
    <p>Para \(f'_c=28\ \text{MPa}\):</p>
    <div class="dm-formula">\[
f_r=0.62\sqrt{28}=3.28\ \text{MPa}
\]</div>
    <div class="tn-result">Resultado: <b>f<sub>r</sub> ≈ 3.3 MPa</b>. Si el diseño del pavimento exige MR = 4.0 MPa, la resistencia a compresión debe aumentarse (≈ 42 MPa con esta relación) o el MR debe controlarse directamente con vigas (NTC 2871/ASTM C78).</div>
</div>
`
        },
        {
            id: 'aditivos-detalle', after: 'especiales',
            title: 'Aditivos químicos y adiciones minerales: efecto en la dosificación',
            html: S`
<p>Los aditivos se dosifican como porcentaje de la masa de material cementante (normalmente 0.2–2 %). Su efecto en el diseño es sustituir parte del agua, modificar el tiempo de fraguado o mejorar la durabilidad. La clasificación de ASTM C494 (NTC 1299) es:</p>

<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Tipo</th><th>Función</th><th>Efecto típico</th></tr></thead><tbody>
<tr><td>A</td><td>Reductor de agua</td><td>Reduce el agua ≥ 5 % con igual asentamiento</td></tr>
<tr><td>B</td><td>Retardante</td><td>Retrasa el fraguado (climas cálidos, transporte largo)</td></tr>
<tr><td>C</td><td>Acelerante</td><td>Acorta el fraguado; ganancia temprana de resistencia (clima frío)</td></tr>
<tr><td>D / E</td><td>Reductor + retardante / reductor + acelerante</td><td>Efectos combinados</td></tr>
<tr><td>F / G</td><td>Reductor de alto rango (superplastificante)</td><td>Reduce el agua ≥ 12 % (hasta 30 % con policarboxilatos); concretos fluidos y de alta resistencia</td></tr>
<tr><td>—</td><td>Incorporador de aire (ASTM C260)</td><td>4–7 % de aire en burbujas de 0.05–1.25 mm: resistencia a hielo-deshielo y mejor cohesión; pierde ≈ 5 % de resistencia por cada 1 % de aire</td></tr>
</tbody></table></div>

<h5>Ajuste de la dosificación con aditivo</h5>
<p>Al reducir el agua con un plastificante, se puede disminuir el cemento manteniendo la relación a/c (ahorro) o mantener el cemento y obtener mayor resistencia. Se debe descontar el volumen del aditivo líquido si supera los 3 L/m³ (parte del agua de mezcla).</p>
<div class="tn-example">
    <h5><span>1</span>Ejemplo: ahorro de cemento con superplastificante</h5>
    <p>Mezcla base: agua 205 kg/m³, a/c = 0.46 (C = 446 kg/m³). Con un reductor de alto rango del 18 %:</p>
    <div class="dm-formula">\[
w=205(1-0.18)=168\ \text{kg/m}^3,\qquad C=\frac{168}{0.46}=365\ \text{kg/m}^3
\]</div>
    <div class="tn-result">Resultado: ahorro de <b>81 kg/m³ de cemento</b> (18 %) con la misma relación a/c y la misma resistencia, lo que también reduce el calor de hidratación y la huella de carbono.</div>
</div>

<h5>Adiciones minerales (efecto puzolánico)</h5>
<p>La sílice reactiva de las puzolanas reacciona con el hidróxido de calcio liberado por el cemento y produce C–S–H adicional, que densifica la pasta y reduce la permeabilidad. Aportan resistencia tardía (la ceniza volante se nota a 56–90 d), pero reducen la temprana.</p>
<ul>
<li><strong>Ceniza volante</strong> (ASTM C618): sustitución 15–35 % en masa; mejora la trabajabilidad y reduce el calor.</li>
<li><strong>Escoria granulada molida</strong> (ASTM C989): 25–50 %; excelente resistencia a sulfatos y cloruros.</li>
<li><strong>Humo de sílice</strong> (ASTM C1240): 5–10 %; resistencias muy altas; exige superplastificante.</li>
<li><strong>Metacaolín</strong>: 8–15 %; alta reactividad y buen color.</li>
</ul>
<p>Con adiciones, la relación de diseño se expresa como agua/(cemento + adición) y debe verificarse el curado: los materiales puzolánicos son más sensibles a un curado deficiente.</p>
`
        },
        {
            id: 'ensayos-nd', after: 'control',
            title: 'Evaluación del concreto endurecido: ensayos no destructivos y núcleos',
            html: S`
<p>Cuando hay dudas sobre la calidad del concreto de una estructura (resultados bajos de cilindros, patologías, reforzamiento), se emplean ensayos in situ. Ningún ensayo no destructivo mide la resistencia de manera directa: se correlacionan con una curva calibrada con núcleos de la propia estructura.</p>

<div class="dm-tablewrap"><table class="dm-table"><thead><tr><th>Ensayo</th><th>Norma</th><th>Qué mide</th><th>Limitaciones</th></tr></thead><tbody>
<tr><td>Esclerómetro (martillo Schmidt)</td><td>ASTM C805</td><td>Dureza superficial por rebote</td><td>Solo la capa de 30 mm superficial; afectado por carbonatación, humedad y acabado</td></tr>
<tr><td>Velocidad de pulso ultrasónico</td><td>ASTM C597</td><td>Uniformidad, vacíos y fisuras internas</td><td>Influido por humedad y armadura</td></tr>
<tr><td>Extracción de núcleos</td><td>ASTM C42</td><td>Resistencia directa a compresión</td><td>Daña el elemento; requiere correcciones por esbeltez y humedad</td></tr>
<tr><td>Arrancamiento (pull-out)</td><td>ASTM C900</td><td>Resistencia local a la extracción de un inserto</td><td>Requiere insertos previstos o postinstalados</td></tr>
<tr><td>Potencial de corrosión y resistividad</td><td>ASTM C876</td><td>Probabilidad de corrosión del acero</td><td>Interpretación cualitativa</td></tr>
<tr><td>Carbonatación (fenolftaleína)</td><td>—</td><td>Profundidad de la carbonatación</td><td>Solo ensayos locales</td></tr>
</tbody></table></div>

<h5>Velocidad de pulso ultrasónico</h5>
<div class="dm-formula">\[
V=\frac{L}{t}
\]</div>
<p>Como referencia general: \(V&gt;4500\ \text{m/s}\) calidad excelente; 3500–4500 buena; 3000–3500 dudosa; \(&lt;3000\) mala. Una caída de la velocidad en una zona indica vacíos, hormigueros o fisuras.</p>

<h5>Núcleos y criterio de aceptación</h5>
<p>Los núcleos deben tener diámetro de al menos 3 veces el tamaño máximo del agregado y relación \(L/D\) cercana a 2 (para \(L/D&lt;1.75\) se aplica un factor de corrección). Según NSR-10 C.5.6.5.4, la resistencia del concreto de una zona se considera estructuralmente adecuada si el <strong>promedio de tres núcleos es ≥ 0.85 \(f'_c\)</strong> y ningún núcleo individual es menor que <strong>0.75 \(f'_c\)</strong>.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: pulso ultrasónico</h5>
    <p>Pulso a través de 300 mm de concreto con un tiempo de tránsito de 65 µs.</p>
    <div class="dm-formula">\[
V=\frac{0.300}{65\times10^{-6}}=4\,615\ \text{m/s}
\]</div>
    <div class="tn-result">Resultado: <b>4 615 m/s</b>, calidad excelente (sin vacíos importantes en la trayectoria).</div>
</div>
<div class="tn-example">
    <h5><span>2</span>Ejemplo: aceptación por núcleos</h5>
    <p>\(f'_c=28\ \text{MPa}\). Tres núcleos dieron 28.5, 26.9 y 30.1 MPa.</p>
    <div class="dm-formula">\[
\bar f=\frac{28.5+26.9+30.1}{3}=28.5\ \text{MPa}\ge0.85(28)=23.8,\qquad 26.9\ge0.75(28)=21.0
\]</div>
    <div class="tn-result">Resultado: <b>cumple</b> ambos criterios; el concreto se considera estructuralmente adecuado.</div>
</div>
`
        }
    ];

    global.TN_ADD('dm', sec, {
        bib: [
            'Kosmatka, S. H. y Wilson, M. L. <em>Design and Control of Concrete Mixtures</em>, 16.ª ed. Portland Cement Association.',
            'Neville, A. M. <em>Properties of Concrete</em>, 5.ª ed. Pearson.',
            'Mehta, P. K. y Monteiro, P. J. M. <em>Concrete: Microstructure, Properties, and Materials</em>, 4.ª ed. McGraw-Hill.',
            'ACI 211.1 — <em>Standard Practice for Selecting Proportions for Normal, Heavyweight, and Mass Concrete</em>; ACI 207 (concreto masivo); ACI 209 (retracción y fluencia).',
            'ASTM C494, C260, C618, C989, C1240, C42, C597, C805, C1074 y NTC equivalentes.',
            'NSR-10 Título C (C.3, C.4, C.5, C.7.12, C.9.5).'
        ]
    });
})(window);
