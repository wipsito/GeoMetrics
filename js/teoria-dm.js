/* =========================================================
   GeoMetrics — Teoría de Diseño de Mezclas
   Concreto, control de calidad y método ACI 211.1.
   Enfoque normativo colombiano (NTC / NSR-10 / ACI).
   ========================================================= */
(function (global) {
    'use strict';
    var S = String.raw;
    global.TN_MODULES = global.TN_MODULES || {};

    global.TN_MODULES.dm = {
        key: 'dm',
        host: 'dmTeoriaRoot',
        screen: 'pantallaDisenoMezclas',
        tab: 'dm-ensayos',
        prefix: 'dm',
        eyebrow: 'Diseño de Mezclas · Código 165019',
        title: 'Proporcionar concreto con criterio: resistencia, trabajabilidad y durabilidad',
        desc: 'Fundamentos del concreto, caracterización de agregados, diseño por ACI 211.1, mezcla de prueba, control estadístico y durabilidad. Las tablas y el ejemplo resuelto se apoyan en el motor de cálculo de la propia aplicación y en las normas colombianas NTC y NSR-10.',
        tags: ['NTC 121', 'NTC 174', 'NTC 77', 'NTC 396', 'NTC 673', 'ACI 211.1', 'NSR-10 Título C'],
        stats: [
            ['8', 'ensayos de laboratorio'],
            ['10', 'secciones de teoría'],
            ['3', 'tablas ACI interactivas'],
            ['100 %', 'ecuaciones renderizadas']
        ],
        scope: '<b>Alcance.</b> El método ACI 211.1 es una práctica de proporcionamiento inicial; la mezcla definitiva se ajusta con mezclas de prueba y con el comportamiento real de los materiales. Las tablas y los valores de ejemplo son didácticos. Para un diseño de obra, verifica la edición vigente de ACI 211.1, ACI 318, las NTC aplicables y los requisitos del Título C de la NSR-10.',
        route: [
            { t: 'Caracterizar agregados', d: 'Granulometría, Gs, absorción, PU y humedad', go: 'granulometria' },
            { t: 'Diseñar la mezcla', d: 'ACI 211.1: agua, a/c, cemento, arena y grava', go: 'aci211' },
            { t: 'Mezcla de prueba', d: 'Revenimiento, peso unitario y aire', go: 'revenimiento' },
            { t: 'Controlar resistencia', d: 'Cilindros a 7 y 28 días', go: 'compresion' }
        ],
        sections: [
            {
                id: 'fundamentos',
                title: 'Qué es diseñar una mezcla de concreto',
                html: S`
<p>El concreto es una mezcla de cemento, agua, agregados y, eventualmente, aditivos y adiciones. La pasta de cemento hidratado une los agregados y llena los vacíos; los agregados forman el esqueleto granular y aportan estabilidad volumétrica. El aire, atrapado o incorporado, también hace parte de la mezcla y condiciona su durabilidad.</p>

<div class="tn-grid">
    <div class="tn-mini"><b>Cemento + agua</b><p>Forman la pasta. La hidratación genera productos que endurecen y desarrollan resistencia. Una parte del agua se combina químicamente; otra queda como agua capilar.</p></div>
    <div class="tn-mini"><b>Agregados</b><p>Ocupan aproximadamente 60–75 % del volumen. Su granulometría, forma, textura, resistencia y absorción afectan la trabajabilidad y la resistencia.</p></div>
    <div class="tn-mini"><b>Aire</b><p>Atrapado (1–3 %) o incorporado intencionalmente (4–8 %). Mejora la resistencia al congelamiento, pero reduce la resistencia mecánica.</p></div>
    <div class="tn-mini"><b>Aditivos y adiciones</b><p>Modifican trabajabilidad, tiempo de fraguado, contenido de aire o durabilidad. Las adiciones (ceniza, escoria, humo de sílice) reducen el cemento y el impacto ambiental.</p></div>
</div>

<p>El objetivo no es solo alcanzar \(f'_c\). Una mezcla debe cumplir, al mismo tiempo, <strong>resistencia, trabajabilidad, durabilidad y economía</strong>. La relación agua/cemento (\(a/c\)) es la variable que más influye en la resistencia y en la permeabilidad; la trabajabilidad se logra con el contenido de agua, la granulometría y los aditivos, no agregando agua sin control.</p>

<div class="dm-formula">\[
f_c\approx \frac{A}{B^{\,a/c}}
\qquad\text{(ley de Abrams, forma conceptual)}
\]</div>

<p>La ley de Abrams expresa que, a menor relación \(a/c\), mayor resistencia para materiales y curado comparables. En la práctica se usan curvas o tablas de la norma y se verifica con mezclas de prueba. La durabilidad impone además un límite máximo de \(a/c\) y un contenido mínimo de cemento, aunque la resistencia sea alta.</p>

<div class="tn-note tn-norm"><b>Marco normativo colombiano.</b> La NSR-10, Título C, fija los requisitos de resistencia, durabilidad, recubrimiento y aceptación. Las NTC 121 (cemento), 174 (agregados), 77 (granulometría), 237 y 176 (densidad y absorción), 92 (masa unitaria y vacíos), 396 (asentamiento), 673 (compresión), 1377 (elaboración y curado de especímenes de laboratorio), 550 (especímenes de campo) y 1926 (masa unitaria, rendimiento y contenido de aire por gravimetría) son las referencias de laboratorio más usadas. ACI 211.1 y ACI 318 complementan el proporcionamiento y el diseño.</div>

<h5>Qué decide el diseñador</h5>
<ul>
    <li><strong>Resistencia requerida:</strong> \(f'_c\) de proyecto y \(f'_{cr}\) de dosificación.</li>
    <li><strong>Consistencia:</strong> asentamiento o extensión de flujo según el elemento y el método de colocación.</li>
    <li><strong>Tamaño máximo nominal:</strong> compatible con el refuerzo, el encofrado y el espesor.</li>
    <li><strong>Durabilidad:</strong> relación \(a/c\), contenido de cemento, aire incorporado y tipo de cemento.</li>
    <li><strong>Economía y sostenibilidad:</strong> minimizar cemento y agua sin sacrificar prestaciones.</li>
</ul>
`
            },
            {
                id: 'agregados',
                title: 'Agregados: granulometría, densidad, absorción y humedad',
                html: S`
<p>Los agregados ocupan la mayor parte del volumen del concreto. Su selección no consiste solo en “arena y grava”: la curva granulométrica, el tamaño máximo nominal, la forma, la textura, la resistencia y la absorción determinan la cantidad de pasta necesaria y la trabajabilidad de la mezcla. En Colombia se usan <strong>NTC 77</strong> (granulometría), <strong>NTC 174</strong> (requisitos), <strong>NTC 237</strong> y <strong>NTC 176</strong> (densidad y absorción), y <strong>NTC 92</strong> (masa unitaria y vacíos); internacionalmente, ASTM C33, C136, C127, C128 y C29.</p>

<h5>Granulometría y módulo de finura</h5>
<p>La granulometría se determina por tamizado y se expresa como porcentaje que pasa. Para la arena se calcula el módulo de finura con los tamices de la serie estándar:</p>

<div class="dm-formula">\[
MF=\frac{\sum \%\text{retenido acumulado}
\left(4.75,\ 2.36,\ 1.18,\ 0.60,\ 0.30,\ 0.15\ \text{mm}\right)}{100}
\]</div>

<p>Un \(MF\) entre 2.3 y 3.1 es típico para arena de concreto; valores fuera de ese intervalo pueden indicar exceso de finos o de gruesos y exigen ajustar la dosis de agua. La NTC 174 / ASTM C33 establece límites para la granulometría del agregado fino y del grueso; no basta con que “pase” todos los tamices.</p>

<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Tamiz</th><th>% que pasa típico (arena)</th><th>Observación</th></tr></thead>
<tbody>
<tr><td>9.5 mm (3/8")</td><td>100</td><td>La arena no debe retener grava</td></tr>
<tr><td>4.75 mm (N.º 4)</td><td>95 – 100</td><td>Control de gruesos</td></tr>
<tr><td>2.36 mm (N.º 8)</td><td>80 – 100</td><td>—</td></tr>
<tr><td>1.18 mm (N.º 16)</td><td>50 – 85</td><td>—</td></tr>
<tr><td>0.60 mm (N.º 30)</td><td>25 – 60</td><td>Zona de mayor sensibilidad</td></tr>
<tr><td>0.30 mm (N.º 50)</td><td>5 – 30</td><td>Control de finos</td></tr>
<tr><td>0.15 mm (N.º 100)</td><td>0 – 10</td><td>Exceso de finos aumenta demanda de agua</td></tr>
</tbody>
</table></div>

<h5>Densidad relativa y absorción</h5>
<p>La densidad relativa del agregado se reporta en tres condiciones: seca, saturada superficialmente seca (SSS) y aparente. La absorción es el agua que llena los poros permeables del grano.</p>

<div class="dm-formula">\[
G_{s,seca}=\frac{A}{B-C},
\qquad
G_{s,SSS}=\frac{B}{B-C},
\qquad
G_{s,aparente}=\frac{A}{A-C}
\]</div>

<div class="dm-formula">\[
\text{Absorción}=\frac{B-A}{A}\times100
\]</div>

<p>donde \(A\) es la masa seca, \(B\) la masa SSS y \(C\) la masa sumergida en agua. El agua de diseño de las tablas ACI se refiere a agregados en condición SSS. En obra, si el agregado está más húmedo o más seco, se corrige la cantidad de agua y la masa de agregado.</p>

<div class="dm-formula">\[
M_{húmeda}=M_{seca}\left(1+\frac{w}{100}\right),
\qquad
\Delta W_{agua}=\sum M_{seca}\frac{w-\text{absorción}}{100}
\]</div>

<p>Si \(w>\text{absorción}\), el agregado aporta agua a la mezcla y se descuenta del agua de diseño. Si \(w<\text{absorción}\), absorbe agua y se suma. En la práctica se mide la humedad de cada acopio antes de cada tanda; no se supone constante.</p>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: densidad y absorción de una arena</h5>
    <p>Masa seca \(A=500\ \text{g}\); masa SSS \(B=510\ \text{g}\); masa sumergida \(C=312\ \text{g}\).</p>
    <div class="dm-formula">\[
G_{s,seca}=\frac{500}{510-312}=2.53,
\qquad
G_{s,SSS}=\frac{510}{198}=2.58
\]</div>
    <div class="dm-formula">\[
\text{Absorción}=\frac{510-500}{500}\times100=2.0\,\%
\]</div>
    <div class="tn-result">Resultado: <b>Gs,seca ≈ 2.53</b>, <b>Gs,SSS ≈ 2.58</b>, <b>absorción = 2.0 %</b>. Es una arena con porosidad moderada; corrige el agua si la humedad de acopio difiere del 2 %.</div>
</div>

<h5>Masa unitaria y vacíos</h5>
<div class="dm-formula">\[
\gamma_{PU}=\frac{M}{V},
\qquad
\%\text{vacíos}=\frac{G_s\gamma_w-\gamma_{PU}}{G_s\gamma_w}\times100
\]</div>
<p>La masa unitaria puede medirse suelta o compactada. Para el método ACI se usa la masa unitaria compactada (varillada) del agregado grueso, porque representa mejor el acomodo dentro de la mezcla. Un agregado con buena granulometría tiene menos vacíos y requiere menos pasta para obtener la misma trabajabilidad.</p>

<div class="tn-note tn-warn"><b>No confundas condición seca con SSS.</b> Las tablas ACI suponen agregados SSS. Si usas la masa seca sin corregir por absorción, la mezcla queda con menos agua efectiva de la prevista y puede endurecerse o perder trabajabilidad. Si usas la masa húmeda sin descontar el agua libre, queda sobredosificada en agua y baja la resistencia.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 77, NTC 174, NTC 237, NTC 176 y NTC 92; ASTM C33, C136, C127, C128 y C29. Para agregados reciclados o industriales, verifica requisitos adicionales de absorción, sulfatos y contaminantes.</div>
`
            },
            {
                id: 'cemento',
                title: 'Cemento, agua, aditivos y relación agua/cemento',
                html: S`
<p>El cemento Portland es un aglomerante hidráulico: al reaccionar con el agua forma productos de hidratación que endurecen y desarrollan resistencia. La cantidad y el tipo de cemento, la relación \(a/c\) y la temperatura de curado condicionan la velocidad de endurecimiento, el calor de hidratación y la durabilidad.</p>

<div class="dm-formula">\[
\frac{a}{c}=\frac{W_{agua}}{W_{cemento}},
\qquad
W_{cemento}=\frac{W_{agua}}{a/c}
\]</div>

<p>La relación \(a/c\) se expresa en masa (kg de agua por kg de cemento). No es lo mismo que el contenido de agua por metro cúbico: dos mezclas pueden tener el mismo \(a/c\) y distinto contenido de pasta. Para una resistencia objetivo, la tabla ACI 211.1 relaciona \(f'_{cr}\) con \(a/c\); para durabilidad, la NSR-10 impone un máximo de \(a/c\) según la exposición.</p>

<h5>Tipos de cemento</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Tipo</th><th>Característica principal</th><th>Uso típico</th></tr></thead>
<tbody>
<tr><td>Tipo I</td><td>Uso general</td><td>Concreto estructural corriente</td></tr>
<tr><td>Tipo II</td><td>Moderada resistencia a sulfatos y calor de hidratación</td><td>Obras expuestas a sulfatos moderados</td></tr>
<tr><td>Tipo III</td><td>Alta resistencia temprana</td><td>Prefabricados, reparaciones, climas fríos</td></tr>
<tr><td>Tipo IV</td><td>Bajo calor de hidratación</td><td>Concreto masivo</td></tr>
<tr><td>Tipo V</td><td>Alta resistencia a sulfatos</td><td>Ambientes agresivos con sulfatos</td></tr>
</tbody>
</table></div>

<p>La NTC 121 establece los requisitos del cemento Portland. En Colombia también se usan cementos con adiciones (escoria, ceniza volante, caliza) y cementos especiales; su comportamiento depende de la composición y debe verificarse con ensayos. No reemplaces un cemento por otro solo por la resistencia a 28 días: cambian el calor, la retracción, la durabilidad y la compatibilidad con aditivos.</p>

<h5>Agua de mezclado</h5>
<p>El agua debe ser limpia y libre de aceites, ácidos, álcalis, materia orgánica y cantidades excesivas de sales. Como referencia, el agua potable suele ser apta; aguas recicladas o de fuentes no convencionales requieren ensayos de calidad y aprobación. Los sulfatos y cloruros pueden atacar el concreto o el refuerzo.</p>

<h5>Aditivos y adiciones</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Reductores de agua</b><p>Disminuyen el agua para un mismo asentamiento; los superplastificantes permiten mezclas fluidas con baja \(a/c\).</p></div>
    <div class="tn-mini"><b>Retardantes / acelerantes</b><p>Modifican el fraguado. Los acelerantes pueden aumentar el calor y el riesgo de fisuración; dosificar con cuidado.</p></div>
    <div class="tn-mini"><b>Inclusores de aire</b><p>Generan burbujas estables para resistir ciclos de congelamiento y deshielo. Reducen la resistencia, por lo que se ajusta la mezcla.</p></div>
    <div class="tn-mini"><b>Adiciones minerales</b><p>Ceniza volante, escoria, humo de sílice y metacaolín. Mejoran durabilidad y reducen el cemento, pero cambian la velocidad de resistencia.</p></div>
</div>

<div class="tn-note tn-warn"><b>Más cemento no siempre es mejor.</b> Un exceso de cemento aumenta el calor de hidratación, la retracción y el costo, y puede reducir la durabilidad. La mezcla óptima suele lograr la resistencia y durabilidad requeridas con el menor contenido de cemento compatible con la trabajabilidad y el curado.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 121 (cemento Portland); NSR-10, Título C, para requisitos de durabilidad, relación \(a/c\) máxima y contenido mínimo de cemento; ASTM C150/C150M y ASTM C595/C595M para cementos; ASTM C494/C494M para aditivos químicos.</div>
`
            },
            {
                id: 'fresco',
                title: 'Concreto fresco: trabajabilidad, revenimiento, peso unitario y aire',
                html: S`
<p>El concreto fresco debe ser transportable, colocable, compactable y acabable sin segregación. Estas propiedades se agrupan en la <strong>trabajabilidad</strong>, que no es una sola medida: depende del elemento, del refuerzo, del método de colocación y del tiempo disponible. El ensayo de asentamiento o revenimiento es el control más común, pero no describe por sí solo la trabajabilidad.</p>

<h5>Revenimiento</h5>
<div class="dm-formula">\[
\text{Asentamiento}=H_0-H_f
\]</div>
<p>Se mide con el cono de Abrams según <strong>NTC 396</strong> / <strong>ASTM C143/C143M</strong>. El cono se llena en tres capas, se compacta con 25 golpes por capa y se levanta verticalmente; la diferencia de altura entre el cono y el concreto asentado es el revenimiento. Un asentamiento alto no garantiza buena trabajabilidad: una mezcla puede ser fluida y aun así segregarse.</p>

<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Asentamiento</th><th>Consistencia</th><th>Uso típico</th></tr></thead>
<tbody>
<tr><td>0 – 25 mm</td><td>Muy seca</td><td>Prefabricados vibrados, concreto compactado con rodillo</td></tr>
<tr><td>25 – 50 mm</td><td>Seca / baja</td><td>Pavimentos con vibrador, concreto masivo</td></tr>
<tr><td>50 – 100 mm</td><td>Plástica / media</td><td>Losas, vigas y columnas de uso general</td></tr>
<tr><td>100 – 150 mm</td><td>Blanda / alta</td><td>Muros esbeltos, elementos muy armados</td></tr>
<tr><td>150 – 200 mm</td><td>Fluida</td><td>Bombeo, tremie; normalmente con superplastificante</td></tr>
</tbody>
</table></div>

<h5>Peso unitario, rendimiento y aire</h5>
<div class="dm-formula">\[
\gamma=\frac{M_c-M_m}{V_m},
\qquad
Y=\frac{M_{tanda}}{\gamma}
\]</div>
<p>donde \(M_c\) es la masa del recipiente lleno, \(M_m\) la masa del recipiente vacío y \(V_m\) su volumen. El rendimiento \(Y\) es el volumen de concreto producido por una tanda; permite verificar si la mezcla rinde lo previsto y ajustar las proporciones. El contenido de aire se mide por presión (ASTM C231) o por el método volumétrico (ASTM C173).</p>

<div class="dm-formula">\[
A_{aire}\approx\frac{\gamma_{teórico}-\gamma_{real}}{\gamma_{teórico}}\times100
\]</div>
<p>La diferencia gravimétrica es una aproximación; para el control oficial se usa el método normalizado. El aire incorporado intencionalmente debe verificarse en obra, porque la dosificación del aditivo y la mezcla pueden variar.</p>

<div class="tn-example">
    <h5><span>2</span>Ejemplo: peso unitario y rendimiento</h5>
    <p>Recipiente de \(V=0.007\ \text{m}^3\). Masa llena \(M_c=16.80\ \text{kg}\); masa vacía \(M_m=0.40\ \text{kg}\). La tanda produjo \(0.50\ \text{m}^3\).</p>
    <div class="dm-formula">\[
\gamma=\frac{16.80-0.40}{0.007}=2\,343\ \text{kg/m}^3
\]</div>
    <div class="dm-formula">\[
Y=\frac{M_{tanda}}{\gamma}
\]</div>
    <p>Si la masa de la tanda es \(1\,180\ \text{kg}\), \(Y=1\,180/2\,343=0.504\ \text{m}^3\). El rendimiento es coherente con los \(0.50\ \text{m}^3\) previstos; una diferencia mayor exige revisar la dosificación y el contenido de aire.</p>
    <div class="tn-result">Resultado: <b>γ ≈ 2 343 kg/m³</b>, <b>Y ≈ 0.504 m³</b>.</div>
</div>

<h5>Temperatura y tiempo</h5>
<p>La temperatura del concreto fresco afecta la velocidad de fraguado, la pérdida de asentamiento y la resistencia final. Como referencia, se busca mantenerla en un intervalo moderado (aproximadamente 10–32 °C, según la norma y el clima) y protegerla del sol, el viento y el frío. El tiempo entre mezclado y colocación debe ser compatible con el tipo de cemento y los aditivos.</p>

<div class="tn-note tn-warn"><b>No agregues agua en obra para “recuperar” el revenimiento.</b> Eso aumenta \(a/c\), reduce la resistencia y la durabilidad. Si el asentamiento se perdió, usa un aditivo reductor de agua o rechaza la mezcla; no improvises con agua.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 396 y ASTM C143/C143M (asentamiento); NTC 1926 y ASTM C138/C138M (peso unitario, rendimiento y aire por gravimetría); ASTM C231/C231M y C173/C173M (aire por presión y por método volumétrico); ASTM C1064/C1064M (temperatura); NTC 1377 y ASTM C192/C192M (elaboración y curado de especímenes de laboratorio); NTC 550 y ASTM C31/C31M (especímenes de campo).</div>
`
            },
            {
                id: 'duro',
                title: 'Concreto endurecido: compresión, módulo y aceptación',
                html: S`
<p>La resistencia a compresión es el parámetro más usado para controlar la calidad del concreto, aunque no describe por sí sola su durabilidad, su resistencia a tracción o su comportamiento frente a cargas cíclicas. Se determina con <strong>NTC 673</strong> y <strong>ASTM C39/C39M</strong> sobre cilindros elaborados y curados según <strong>NTC 1377</strong> / <strong>ASTM C192/C192M</strong> (laboratorio) o <strong>NTC 550</strong> / <strong>ASTM C31/C31M</strong> (campo).</p>

<div class="dm-formula">\[
f'_c=\frac{P_{max}}{A}=\frac{4P_{max}}{\pi D^2}
\]</div>

<p>La resistencia de diseño \(f'_c\) es un valor especificado; la resistencia requerida de dosificación \(f'_{cr}\) debe ser mayor para tener en cuenta la variabilidad. La NSR-10, Título C, y ACI 318 establecen los criterios. Con registros de desviación estándar \(s\):</p>

<div class="dm-formula">\[
f'_{cr}=\max\left(f'_c+1.34s,\ f'_c+2.33s-3.5\right)\ \text{MPa}
\]</div>

<p>Sin registros previos, se usan los valores de la norma: para \(f'_c<21\ \text{MPa}\), \(f'_{cr}=f'_c+7.0\); para \(21\le f'_c\le35\ \text{MPa}\), \(f'_{cr}=f'_c+8.5\); para \(f'_c>35\ \text{MPa}\), \(f'_{cr}=1.10f'_c+5.0\) (MPa). Verifica la edición vigente y las condiciones de aplicación.</p>

<h5>Otras propiedades</h5>
<div class="dm-formula">\[
E_c\approx4700\sqrt{f'_c}\ \text{MPa},
\qquad
f_r\approx0.62\sqrt{f'_c}\ \text{MPa}
\]</div>
<p>\(E_c\) es el módulo de elasticidad del concreto de peso normal y \(f_r\) el módulo de ruptura. Ambas expresiones son aproximadas y dependen del tipo de concreto, los agregados y la edad. Para concreto ligero, alta resistencia o edades distintas, usa las expresiones específicas de ACI 318 / NSR-10.</p>

<h5>Desarrollo de la resistencia con la edad</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Edad</th><th>Resistencia aproximada (% de 28 d)</th><th>Observación</th></tr></thead>
<tbody>
<tr><td>1 día</td><td>15 – 25 %</td><td>Depende del cemento y la temperatura</td></tr>
<tr><td>3 días</td><td>40 – 55 %</td><td>Útil para desencofrados tempranos</td></tr>
<tr><td>7 días</td><td>65 – 75 %</td><td>Control habitual de obra</td></tr>
<tr><td>28 días</td><td>100 %</td><td>Edad de referencia</td></tr>
<tr><td>90 días</td><td>105 – 115 %</td><td>Con cementos con adiciones puede ser mayor</td></tr>
</tbody>
</table></div>

<div class="tn-example">
    <h5><span>3</span>Ejemplo: aceptación de tres cilindros</h5>
    <p>\(f'_c=28\ \text{MPa}\). Resultados a 28 días: 28.5, 30.2 y 31.0 MPa.</p>
    <div class="dm-formula">\[
\bar{f}=\frac{28.5+30.2+31.0}{3}=29.9\ \text{MPa}
\]</div>
    <p>El promedio de los tres ensayos es mayor que \(28\ \text{MPa}\). Ningún resultado individual está por debajo de \(28-3.5=24.5\ \text{MPa}\). Con los criterios de aceptación de la NSR-10 / ACI 318, el conjunto cumple.</p>
    <div class="tn-result">Resultado: <b>promedio = 29.9 MPa</b>; cumple los criterios de aceptación para \(f'c = 28\) MPa.</div>
</div>

<div class="tn-note tn-warn"><b>Un cilindro no es una probeta cualquiera.</b> La resistencia depende de la geometría, del cabezal, de la velocidad de carga, de la edad y del curado. Un cilindro mal elaborado o curado en obra puede dar un resultado bajo que no representa la mezcla. Registra y controla toda la cadena.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 673; NTC 1377 y NTC 550 (especímenes); ASTM C39/C39M; ASTM C192/C192M y C31/C31M. NSR-10, Título C: C.5.3.2 (resistencia requerida), C.5.6.3.3 (aceptación), C.8.5 (módulo de elasticidad) y C.9.5.2.3 (módulo de ruptura).</div>
`
            },
            {
                id: 'aci',
                title: 'Método ACI 211.1: proporcionamiento por volumen absoluto',
                html: S`
<p>El método ACI 211.1 selecciona las proporciones de una mezcla de concreto de peso normal a partir de la resistencia requerida, el asentamiento, el tamaño máximo nominal, el módulo de finura y las propiedades de los agregados. Es una práctica de punto de partida: la mezcla se ajusta con mezclas de prueba y con el comportamiento real de los materiales.</p>

<h5>Secuencia de diseño</h5>
<ol>
    <li><strong>Resistencia requerida:</strong> calcular \(f'_{cr}\) a partir de \(f'_c\) y de la desviación estándar o de los valores de la norma.</li>
    <li><strong>Asentamiento y tamaño máximo:</strong> elegir la consistencia y el \(TMN\) compatible con el elemento y el refuerzo.</li>
    <li><strong>Agua y aire:</strong> de las tablas ACI, según asentamiento, \(TMN\) y contenido de aire.</li>
    <li><strong>Relación \(a/c\):</strong> la menor entre la requerida por resistencia y la máxima por durabilidad.</li>
    <li><strong>Cemento:</strong> \(C=W_{agua}/(a/c)\).</li>
    <li><strong>Agregado grueso:</strong> volumen de grueso por unidad de volumen de concreto, \(b/b_0\), según \(TMN\) y \(MF\).</li>
    <li><strong>Arena:</strong> por diferencia de volúmenes absolutos.</li>
    <li><strong>Corrección por humedad:</strong> ajustar agua y masas de agregados.</li>
    <li><strong>Mezcla de prueba:</strong> verificar asentamiento, peso unitario, aire y resistencia.</li>
</ol>

<div class="dm-formula">\[
V_{abs}=\frac{M}{G_s\,\rho_w},
\qquad
V_c+V_w+V_a+V_g+V_f=1\ \text{m}^3
\]</div>

<p>La ecuación de volumen absoluto es la columna vertebral del método: el volumen de cada componente se calcula con su masa y su densidad relativa, y la suma debe ser 1 m³. La arena se obtiene por diferencia, después de fijar cemento, agua, aire y agregado grueso.</p>

<div class="dm-formula">\[
V_f=1-\left(V_c+V_w+V_a+V_g\right),
\qquad
M_f=V_f\,G_{s,f}\,\rho_w
\]</div>

<h5>Tablas ACI que usa la aplicación</h5>
<p>Las tablas siguientes se generan con los datos de la aplicación y se interpolan linealmente. Úsalas como referencia: la edición de ACI 211.1 y las condiciones del proyecto mandan.</p>
<div id="tn-dm-aci-tabla"><p class="dm-hint">Cargando tablas ACI…</p></div>

<h5>Ejemplo resuelto con el motor de la aplicación</h5>
<p>El siguiente ejemplo usa una mezcla de \(f'_c=28\ \text{MPa}\), asentamiento de \(100\ \text{mm}\), \(TMN=19\ \text{mm}\), \(MF=2.7\), agregados con \(G_s\) y absorción típicas, y una tanda de laboratorio de \(30\ \text{L}\). Los valores se calculan con el mismo motor que usa el ensayo ACI 211.1.</p>
<div id="tn-dm-aci-ejemplo"><p class="dm-hint">Calculando ejemplo…</p></div>

<div class="tn-note tn-warn"><b>Las tablas no son una receta.</b> El \(b/b_0\) se multiplica por la masa unitaria compactada seca del agregado grueso, no por la masa suelta. La resistencia y la durabilidad se verifican con mezclas de prueba; los agregados reales pueden exigir ajustes de agua, arena o aditivo.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> ACI 211.1-91 (reaprobada), ACI 318 y NSR-10, Título C. Para los materiales, NTC 121, 174, 77, 237, 176, 92, 396, 673 y 1377; ASTM C33, C136, C127, C128, C29, C143, C138, C231, C39 y C192.</div>
`
            },
            {
                id: 'prueba',
                title: 'Mezcla de prueba, ajustes y corrección por humedad',
                html: S`
<p>La mezcla de prueba es el puente entre el diseño teórico y el concreto real. Se prepara una tanda de laboratorio con las masas corregidas por humedad, se miden asentamiento, peso unitario, aire y temperatura, y se moldean cilindros para evaluar la resistencia. Con los resultados se ajustan las proporciones antes de llevar la mezcla a obra.</p>

<h5>Corrección por humedad de los agregados</h5>
<div class="dm-formula">\[
M_{húmeda}=M_{seca}\left(1+\frac{w}{100}\right)
\]</div>
<div class="dm-formula">\[
W_{agua,aj}=W_{agua,diseño}
-\sum M_{seca}\frac{w-\text{absorción}}{100}
\]</div>
<p>Si el agregado está húmedo por encima de la absorción, aporta agua libre y se descuenta. Si está por debajo, absorbe agua y se suma. La corrección se hace para cada acopio y para cada tanda; las humedades cambian con el clima y el manejo.</p>

<div class="tn-example">
    <h5><span>4</span>Ejemplo: corrección de una tanda</h5>
    <p>Diseño para 1 m³: agua \(180\ \text{kg}\), cemento \(360\ \text{kg}\), arena seca \(700\ \text{kg}\), grava seca \(1\,050\ \text{kg}\). Humedades: arena \(4.0\,\%\) (absorción \(1.5\,\%\)), grava \(1.0\,\%\) (absorción \(0.8\,\%\)).</p>
    <div class="dm-formula">\[
M_{arena,h}=700(1+0.040)=728\ \text{kg}
\]</div>
    <div class="dm-formula">\[
M_{grava,h}=1\,050(1+0.010)=1\,060.5\ \text{kg}
\]</div>
    <div class="dm-formula">\[
\Delta W=700(0.040-0.015)+1\,050(0.010-0.008)
=17.5+2.1=19.6\ \text{kg}
\]</div>
    <div class="dm-formula">\[
W_{agua,aj}=180-19.6=160.4\ \text{kg}
\]</div>
    <div class="tn-result">Resultado: <b>arena húmeda = 728 kg</b>, <b>grava húmeda = 1 060.5 kg</b>, <b>agua a mezclar ≈ 160.4 kg</b> por m³.</div>
</div>

<h5>Ajustes de trabajabilidad y resistencia</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Síntoma</th><th>Causa probable</th><th>Ajuste inicial</th></tr></thead>
<tbody>
<tr><td>Asentamiento bajo</td><td>Falta de agua o exceso de finos</td><td>Ajustar agua manteniendo \(a/c\) o usar reductor</td></tr>
<tr><td>Asentamiento alto</td><td>Exceso de agua o arena gruesa</td><td>Reducir agua, ajustar arena o aditivo</td></tr>
<tr><td>Segregación</td><td>Falta de finos o exceso de agua</td><td>Aumentar finos o reducir agua</td></tr>
<tr><td>Mezcla pegajosa</td><td>Exceso de finos o arena angular</td><td>Ajustar arena, aditivo o contenido de pasta</td></tr>
<tr><td>Resistencia baja</td><td>\(a/c\) alta, cemento insuficiente, curado deficiente</td><td>Reducir \(a/c\), revisar cemento y curado</td></tr>
<tr><td>Aire excesivo</td><td>Aditivo o agregado poroso</td><td>Verificar dosificación y método de medición</td></tr>
</tbody>
</table></div>

<p>Como regla práctica, un cambio de aproximadamente \(2\ \text{kg/m}^3\) de agua puede modificar el asentamiento en unos \(10\ \text{mm}\), pero la respuesta depende de la mezcla. Si se agrega agua, se debe agregar cemento para mantener \(a/c\); si no, la resistencia baja. Un cambio de \(a/c\) de 0.02–0.03 puede ser necesario para corregir una resistencia baja, y siempre se verifica con una nueva mezcla de prueba.</p>

<h5>Rendimiento y contenido real de cemento</h5>
<div class="dm-formula">\[
Y=\frac{M_{tanda}}{\gamma},
\qquad
C_{real}=\frac{C_{diseño}}{Y}
\]</div>
<p>El rendimiento permite detectar diferencias entre el volumen producido y el previsto. Si el concreto rinde menos, el contenido de cemento por metro cúbico aumenta y el costo también; si rinde más, puede haber exceso de aire o de agregados y la resistencia puede caer.</p>

<div class="tn-note tn-warn"><b>No ajustes solo por asentamiento.</b> Una mezcla puede tener el asentamiento correcto y una resistencia baja por exceso de agua, cemento inadecuado o curado deficiente. El control debe incluir masa unitaria, aire, temperatura y resistencia.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> ACI 211.1; NTC 396, NTC 673 y NTC 1377; ASTM C143, C138, C231, C39 y C192. La NSR-10, Título C, define los criterios de aceptación y las responsabilidades del control de calidad.</div>
`
            },
            {
                id: 'durabilidad',
                title: 'Durabilidad: la mezcla debe resistir el ambiente, no solo la carga',
                html: S`
<p>La durabilidad es la capacidad del concreto para resistir la acción del ambiente y mantener sus propiedades durante la vida de servicio. Una mezcla puede cumplir la resistencia y fallar prematuramente por permeabilidad, ataques químicos, ciclos de congelamiento o corrosión del refuerzo. La NSR-10, Título C, establece requisitos según la clase de exposición.</p>

<h5>Los enemigos principales</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Permeabilidad</b><p>El agua y los agentes agresivos entran por los poros capilares. Una \(a/c\) baja y un buen curado reducen la porosidad y la conectividad de poros.</p></div>
    <div class="tn-mini"><b>Corrosión del refuerzo</b><p>Los cloruros y la carbonatación despasivan el acero. El recubrimiento, la baja permeabilidad y la calidad del concreto son barreras clave.</p></div>
    <div class="tn-mini"><b>Ataque por sulfatos</b><p>Los sulfatos del suelo o del agua reaccionan con los productos de hidratación y producen expansión y fisuración. Se controla con cemento adecuado y baja \(a/c\).</p></div>
    <div class="tn-mini"><b>Reacción álcali-sílice</b><p>Algunos agregados reactivos se expanden en presencia de álcalis. Se controla con agregados no reactivos, adiciones y limitación de álcalis.</p></div>
    <div class="tn-mini"><b>Congelamiento y deshielo</b><p>El agua en los poros se expande al congelarse. El aire incorporado genera burbujas que alivian la presión y protegen la pasta.</p></div>
    <div class="tn-mini"><b>Erosión y abrasión</b><p>El tráfico, el agua y los sedimentos desgastan la superficie. Una mezcla densa, con buena resistencia y curado, mejora la resistencia a la abrasión.</p></div>
</div>

<h5>Relación a/c, cemento y recubrimiento</h5>
<p>La durabilidad se controla con tres palancas principales: reducir la \(a/c\), asegurar un contenido mínimo de cemento y mantener un recubrimiento adecuado del refuerzo. La NSR-10 fija límites según la clase de exposición; no los sustituyas por una regla general. En ambientes marinos, industriales o con sulfatos, la selección del cemento y la calidad de la ejecución son tan importantes como la dosificación.</p>

<div class="dm-formula">\[
\text{Permeabilidad}\downarrow
\quad\text{cuando}\quad
a/c\downarrow,\quad
\text{curado}\uparrow,\quad
\text{contenido de aire adecuado}
\]</div>

<h5>Mezclas especiales</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Tipo</th><th>Característica</th><th>Uso / cuidado</th></tr></thead>
<tbody>
<tr><td>Alta resistencia</td><td>\(a/c<0.35\), adiciones y superplastificante; \(f'_c\ge55\ \text{MPa}\)</td><td>Columnas, puentes; control estricto de materiales y curado</td></tr>
<tr><td>Autocompactante</td><td>Fluye sin vibración; alta pasta y aditivo</td><td>Elementos muy armados; controlar segregación y extensión de flujo</td></tr>
<tr><td>Ligero</td><td>Agregado ligero; densidad reducida</td><td>Puentes y edificios; verificar resistencia y absorción</td></tr>
<tr><td>Permeable</td><td>Vacíos conectados; poco o nada de arena fina</td><td>Drenaje urbano; resistencia menor y mantenimiento</td></tr>
<tr><td>Con fibras</td><td>Fibras de acero, sintéticas o de vidrio</td><td>Control de fisuración y tenacidad; no reemplaza el refuerzo principal</td></tr>
<tr><td>Con adiciones</td><td>Ceniza volante, escoria, humo de sílice, metacaolín</td><td>Durabilidad y sostenibilidad; ajustar el desarrollo de resistencia</td></tr>
</tbody>
</table></div>

<div class="tn-note tn-warn"><b>Durabilidad no es un aditivo.</b> No se corrige una mezcla permeable agregando un producto milagroso. La baja \(a/c\), el curado, la compactación y el recubrimiento son la base. Cualquier aditivo debe evaluarse con la mezcla y la exposición real.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NSR-10, Título C, requisitos de durabilidad y clases de exposición; ACI 318; ACI 201.2R (durabilidad); ASTM C150/C150M, C595/C595M y C618; NTC 121 y NTC 174. Para ambientes específicos, consulta también las normas sectoriales y los ensayos de desempeño.</div>
`
            },
            {
                id: 'control',
                title: 'Control de calidad, estadística y errores frecuentes',
                html: S`
<p>El control de calidad del concreto combina ensayos de materiales, control del concreto fresco, resistencia endurecida y trazabilidad. La variabilidad es inevitable: la pregunta no es si un resultado difiere, sino si la mezcla y el proceso cumplen los criterios estadísticos y los requisitos del proyecto.</p>

<h5>Desviación estándar y coeficiente de variación</h5>
<div class="dm-formula">\[
s=\sqrt{\frac{\sum_{i=1}^{n}(f_i-\bar{f})^2}{n-1}},
\qquad
CV=\frac{s}{\bar{f}}\times100
\]</div>
<p>La desviación estándar \(s\) se usa para calcular \(f'_{cr}\) cuando existe un registro representativo. El coeficiente de variación permite comparar la dispersión entre mezclas o plantas. Un \(CV\) bajo indica un proceso controlado; un \(CV\) alto exige investigar materiales, dosificación, muestreo o laboratorio.</p>

<div class="dm-formula">\[
f'_{cr}=\max\left(f'_c+1.34s,\ f'_c+2.33s-3.5\right)
\]</div>

<h5>Aceptación</h5>
<p>La NSR-10 / ACI 318 exigen que el promedio de tres ensayos consecutivos sea mayor o igual que \(f'_c\), y que ningún resultado individual esté por debajo de \(f'_c-3.5\ \text{MPa}\) (o \(0.90f'_c\) cuando \(f'_c>35\ \text{MPa}\)). Los criterios exactos y el número de muestras dependen de la edición y del tipo de obra; verifica la norma vigente.</p>

<h5>Errores que más afectan la calidad</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Etapa</th><th>Error frecuente</th><th>Efecto</th><th>Control</th></tr></thead>
<tbody>
<tr><td>Materiales</td><td>Humedad de agregados supuesta</td><td>\(a/c\) real distinta a la de diseño</td><td>Medir humedad antes de cada tanda</td></tr>
<tr><td>Dosificación</td><td>Agregar agua en obra</td><td>Resistencia y durabilidad bajas</td><td>Prohibir agua no dosificada</td></tr>
<tr><td>Mezclado</td><td>Tiempo insuficiente</td><td>Mezcla no uniforme</td><td>Controlar tiempo y carga</td></tr>
<tr><td>Colocación</td><td>Segregación por caída libre</td><td>Resistencia desigual</td><td>Usar conducto o bomba</td></tr>
<tr><td>Compactación</td><td>Vibrado excesivo o insuficiente</td><td>Vacíos o segregación</td><td>Capacitar y controlar</td></tr>
<tr><td>Curado</td><td>Secado temprano</td><td>Pérdida de resistencia y fisuración</td><td>Humedecer y proteger</td></tr>
<tr><td>Muestreo</td><td>Cilindros mal elaborados</td><td>Resultado no representativo</td><td>NTC 1377 / ASTM C192</td></tr>
</tbody>
</table></div>

<h5>Lista de chequeo del control</h5>
<div class="tn-check">
    <ul>
        <li>¿Se verificaron las masas de cemento, agua, arena y grava contra la dosificación?</li>
        <li>¿Se midió la humedad de los agregados y se corrigió el agua?</li>
        <li>¿Se controlaron asentamiento, temperatura, peso unitario y aire?</li>
        <li>¿Se moldearon y curaron los cilindros según la norma?</li>
        <li>¿Se registraron lote, hora, elemento, proveedor y condiciones climáticas?</li>
        <li>¿Los resultados se evaluaron con criterios estadísticos y no solo con un cilindro?</li>
    </ul>
</div>

<div class="tn-note tn-ok"><b>Trazabilidad.</b> Un resultado de resistencia sin identificación de la mezcla, el elemento, la edad y el curado no es útil para tomar decisiones. Conserva los registros primarios y las curvas de dosificación.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NSR-10, Título C; ACI 318; NTC 673, NTC 1377 y NTC 396; ASTM C39, C192, C143 y C138. Para control estadístico, revisa los criterios de aceptación de la edición vigente.</div>
`
            },
            {
                id: 'sostenibilidad',
                title: 'Sostenibilidad e innovación en mezclas de concreto',
                html: S`
<p>El cemento es responsable de una parte importante de las emisiones de CO₂ de la construcción. La sostenibilidad del concreto no consiste solo en “usar menos cemento”: exige mantener resistencia, durabilidad y desempeño durante la vida de servicio, y evaluar el impacto del transporte, los agregados, el agua y el mantenimiento.</p>

<h5>Estrategias con mayor impacto</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Sustituir clínker</b><p>Ceniza volante, escoria granulada, humo de sílice, metacaolín y caliza reducen el cemento por metro cúbico. Ajusta la dosificación y el curado por el cambio en el desarrollo de resistencia.</p></div>
    <div class="tn-mini"><b>Optimizar la granulometría</b><p>Una combinación de agregados que reduzca vacíos necesita menos pasta. Menos pasta significa menos cemento y menos agua, si se mantiene la trabajabilidad.</p></div>
    <div class="tn-mini"><b>Reducir agua</b><p>Con aditivos reductores y superplastificantes se logra la consistencia con menor \(a/c\), mejorando resistencia y durabilidad.</p></div>
    <div class="tn-mini"><b>Agregados reciclados</b><p>El agregado de concreto reciclado tiene mayor absorción y menor densidad; exige corregir agua y verificar resistencia y durabilidad.</p></div>
    <div class="tn-mini"><b>Curado eficiente</b><p>Un buen curado permite usar mezclas con más adiciones y menor cemento sin perder desempeño. Es una de las medidas de menor costo.</p></div>
    <div class="tn-mini"><b>Análisis de ciclo de vida</b><p>Evalúa emisiones, energía, transporte, durabilidad y mantenimiento. Una mezcla con menor huella pero menor vida útil puede ser peor a largo plazo.</p></div>
</div>

<div class="dm-formula">\[
\text{Impacto}\ \approx
\sum_i m_i\,EF_i
+\text{transporte}
+\text{construcción}
+\text{mantenimiento}
\]</div>

<p>donde \(m_i\) es la masa del componente \(i\) y \(EF_i\) su factor de emisión. La ecuación es conceptual: el análisis completo incluye transporte, mezclado, curado, demolición y reciclaje. Para comparar alternativas, usa datos locales y declara los límites del análisis.</p>

<h5>Innovación con criterio</h5>
<ul>
    <li><strong>Concreto de alta resistencia:</strong> permite secciones más esbeltas, pero exige control estricto de materiales y curado.</li>
    <li><strong>Autocompactante:</strong> facilita elementos densamente armados y reduce ruido, pero tiene mayor contenido de pasta y control de segregación.</li>
    <li><strong>Concreto permeable:</strong> aporta drenaje urbano, pero su resistencia y mantenimiento son limitados; no es apto para todos los elementos.</li>
    <li><strong>Fibras:</strong> controlan fisuración y mejoran tenacidad; no sustituyen el refuerzo estructural principal sin justificación.</li>
    <li><strong>Impresión 3D y prefabricación:</strong> pueden reducir desperdicio, pero requieren mezclas y controles específicos.</li>
</ul>

<div class="tn-note tn-warn"><b>No sacrifiques durabilidad por un número verde.</b> Una mezcla con menos cemento pero con mayor permeabilidad puede durar menos y requerir más reparaciones. La sostenibilidad se mide en el desempeño durante la vida útil, no solo en la masa de cemento.</div>

<div class="tn-note tn-norm"><b>Referencias.</b> ACI 211.1, ACI 318 y NSR-10, Título C; ACI 213R (ligero), ACI 363R (alta resistencia), ACI 522R (permeable), ACI 212.3R (aditivos) y ACI 234R (humo de sílice). Para análisis ambiental, ISO 14040/14044 y datos locales de factores de emisión.</div>
`
            }
        ],
        bib: [
            'Sánchez de Guzmán, D. <em>Tecnología del concreto y del mortero</em>. Bhandar Editores, Bogotá.',
            'Neville, A. M. <em>Properties of Concrete</em>, 5.ª ed. Pearson, 2011.',
            'Mehta, P. K. y Monteiro, P. J. M. <em>Concrete: Microstructure, Properties, and Materials</em>, 4.ª ed. McGraw-Hill, 2014.',
            'ACI Committee 211. <em>ACI 211.1-91: Standard Practice for Selecting Proportions for Normal, Heavyweight, and Mass Concrete</em> (reaprobada 2002).',
            'ACI Committee 318. <em>Building Code Requirements for Structural Concrete (ACI 318)</em>. Consultar la edición adoptada.',
            'Reglamento Colombiano de Construcción Sismo Resistente <em>NSR-10</em>, Título C — Concreto estructural.',
            'ICONTEC. <em>NTC 121</em> (cemento Portland), <em>NTC 174</em> (agregados), <em>NTC 77</em> (granulometría), <em>NTC 237</em> y <em>NTC 176</em> (densidad y absorción), <em>NTC 92</em> (masa unitaria y vacíos), <em>NTC 396</em> (asentamiento), <em>NTC 673</em> (compresión), <em>NTC 1377</em> (elaboración y curado de especímenes de laboratorio), <em>NTC 550</em> (especímenes de campo) y <em>NTC 1926</em> (masa unitaria, rendimiento y contenido de aire por gravimetría).',
            'ASTM International. <em>C33, C136, C127, C128, C29, C143, C138, C231, C39, C192 y C94</em>. Consultar la edición vigente.',
            'NSR-10. <em>Título C</em>: requisitos de durabilidad, dosificación, resistencia, aceptación y ejecución del concreto estructural.'
        ]
    };
})(window);
