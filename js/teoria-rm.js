/* =========================================================
   GeoMetrics — Teoría de Resistencia de Materiales
   Esfuerzo, deformación, ensayos y diseño estructural.
   Enfoque normativo colombiano (NTC / NSR-10) y ASTM.
   ========================================================= */
(function (global) {
    'use strict';
    var S = String.raw;
    global.TN_MODULES = global.TN_MODULES || {};

    global.TN_MODULES.rm = {
        key: 'rm',
        host: 'rm-teoria',
        screen: 'pantallaResistencia',
        tab: 'rm-ensayos',
        prefix: 'rm',
        eyebrow: 'Resistencia de Materiales · Laboratorio y diseño',
        title: 'Comprender cómo se deforma y falla un material',
        desc: 'Esfuerzo, deformación, elasticidad, tracción, compresión, flexión, cortante, torsión, transformación de esfuerzos, deflexiones, pandeo y dureza. Cada ensayo se conecta con la ecuación que lo interpreta y con la norma que define su ejecución.',
        tags: ['ASTM E8/E8M', 'ASTM E9', 'ASTM E18', 'NTC 2289', 'NTC 673', 'NSR-10 Títulos C y F'],
        stats: [
            ['5', 'ensayos de laboratorio'],
            ['11', 'secciones de teoría'],
            ['8', 'familias de ecuaciones'],
            ['100 %', 'ecuaciones renderizadas']
        ],
        scope: '<b>Alcance.</b> La resistencia de materiales es una disciplina de modelos: supone material homogéneo, secciones que permanecen planas, pequeñas deformaciones y comportamiento elástico lineal dentro de ciertos límites. En un diseño real se verifican estados límite últimos y de servicio, se usan factores de seguridad y se consulta la norma aplicable (NSR-10, AISC, ACI o la especificación del proyecto).',
        route: [
            { t: 'Tracción', d: 'Curva σ–ε, E, σy y σu', go: 'traccion' },
            { t: 'Compresión', d: 'Resistencia y módulo en compresión', go: 'compresion' },
            { t: 'Flexión', d: 'Módulo de ruptura y esfuerzo normal', go: 'flexion' },
            { t: 'Torsión', d: 'τ, γ, G y ángulo de giro', go: 'torsion' },
            { t: 'Dureza', d: 'Rockwell, Brinell y Vickers', go: 'dureza' }
        ],
        sections: [
            {
                id: 'esfuerzo',
                title: 'Esfuerzo, deformación y propiedades elásticas',
                html: S`
<p>La resistencia de materiales estudia cómo se deforman y fallan los sólidos bajo cargas. Los dos conceptos centrales son el <strong>esfuerzo</strong>, que mide la intensidad de la carga por unidad de área, y la <strong>deformación</strong>, que mide el cambio de forma o de longitud.</p>

<div class="dm-formula">\[
\sigma=\frac{P}{A_0},
\qquad
\varepsilon=\frac{\Delta L}{L_0}
\]</div>

<p>En la zona elástica lineal, el esfuerzo es proporcional a la deformación (ley de Hooke):</p>

<div class="dm-formula">\[
\sigma=E\,\varepsilon
\]</div>

<p>donde \(E\) es el módulo de Young. Para un elemento sometido a carga axial, la deformación total es:</p>

<div class="dm-formula">\[
\delta=\frac{PL}{AE}
\]</div>

<p>La deformación lateral permite definir la relación de Poisson y, junto con \(E\), las propiedades elásticas de un material isótropo:</p>

<div class="dm-formula">\[
\nu=-\frac{\varepsilon_{lat}}{\varepsilon_{long}},
\qquad
G=\frac{E}{2(1+\nu)},
\qquad
K=\frac{E}{3(1-2\nu)}
\]</div>

<div class="tn-formulas">
    <div>\[ \delta_T=\alpha L\Delta T \]<small>Deformación térmica libre</small></div>
    <div>\[ \sigma=E\varepsilon \]<small>Ley de Hooke uniaxial</small></div>
    <div>\[ U_r=\frac{\sigma_y^2}{2E} \]<small>Módulo de resiliencia</small></div>
    <div>\[ \delta=\sum\frac{P_iL_i}{A_iE_i} \]<small>Elementos en serie</small></div>
</div>

<p>Cuando la carga excede el límite elástico, el material se deforma permanentemente. En la zona plástica, la deformación ingenieril deja de representar bien el cambio real de área; por eso se definen el esfuerzo y la deformación verdaderos:</p>

<div class="dm-formula">\[
\sigma_t=\sigma(1+\varepsilon),
\qquad
\varepsilon_t=\ln(1+\varepsilon)
\]</div>

<p>Estas expresiones suponen volumen constante durante la deformación plástica, una aproximación razonable para muchos metales antes del inicio del estrangulamiento.</p>

<div class="tn-note tn-warn"><b>Esfuerzo ingenieril no es esfuerzo real.</b> Después del punto último, la carga disminuye porque la sección se reduce, no porque el material se haya vuelto más débil. El esfuerzo verdadero puede seguir aumentando hasta la fractura. No compares ambos tipos de curva sin indicar cuál usas.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> ASTM E8/E8M para tracción de metales, ASTM E111 para módulo de Young, ASTM E132 para relación de Poisson. En Colombia, la NTC 2289 cubre barras de acero para refuerzo de concreto y la NTC 673 la compresión del concreto.</div>
`
            },
            {
                id: 'traccion',
                title: 'Ensayo de tracción: de la curva σ–ε a las propiedades de diseño',
                html: S`
<p>El ensayo de tracción es el más utilizado para caracterizar metales. Una probeta normalizada se somete a carga axial creciente hasta la fractura, mientras se registran carga y alargamiento. De la curva esfuerzo–deformación se obtienen el módulo de elasticidad, el límite de fluencia, la resistencia última, la ductilidad y la tenacidad. La referencia principal es <strong>ASTM E8/E8M</strong>; para productos de acero, <strong>ASTM A370</strong>.</p>

<h5>Propiedades que se extraen</h5>
<div class="dm-formula">\[
\sigma_y=\frac{P_y}{A_0},
\qquad
\sigma_u=\frac{P_{max}}{A_0},
\qquad
E=\frac{\Delta\sigma}{\Delta\varepsilon}
\]</div>

<div class="dm-formula">\[
\%EL=\frac{L_f-L_0}{L_0}\times100,
\qquad
\%RA=\frac{A_0-A_f}{A_0}\times100
\]</div>

<p>El límite de fluencia \(σ_y\) se identifica por el cambio de pendiente o, cuando no hay fluencia definida, por el método del 0.2 % de deformación permanente. La resistencia última \(σ_u\) es el máximo esfuerzo ingenieril. La ductilidad se expresa como alargamiento porcentual y reducción de área; la tenacidad es el área bajo la curva \(\sigma\)–\(\varepsilon\) hasta la fractura.</p>

<h5>Ejemplo de curva típica de acero</h5>
<div class="tn-grid">
    <div class="tn-mini"><b>Zona elástica</b><p>Pendiente constante \(E\). Para el acero estructural, \(E\approx200\ \text{GPa}\).</p></div>
    <div class="tn-mini"><b>Fluencia</b><p>Puede aparecer un plateau de fluencia. Allí la deformación crece con poco aumento de carga.</p></div>
    <div class="tn-mini"><b>Endurecimiento</b><p>El material sigue resistiendo más carga hasta \(σ_u\); la sección se reduce.</p></div>
    <div class="tn-mini"><b>Estrangulamiento</b><p>La deformación se concentra en una zona; la carga baja y ocurre la fractura.</p></div>
</div>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: propiedades de un acero</h5>
    <p>Una probeta de \(A_0=200\ \text{mm}^2\) y \(L_0=50\ \text{mm}\) alcanza la fluencia con \(P_y=50\ \text{kN}\) y la carga máxima con \(P_{max}=82\ \text{kN}\). En la zona elástica, con \(\Delta P=20\ \text{kN}\), se mide \(\Delta L=0.025\ \text{mm}\) en una base de \(50\ \text{mm}\).</p>
    <div class="dm-formula">\[
\sigma_y=\frac{50\,000}{200}=250\ \text{MPa},
\qquad
\sigma_u=\frac{82\,000}{200}=410\ \text{MPa}
\]</div>
    <div class="dm-formula">\[
\Delta\sigma=\frac{20\,000}{200}=100\ \text{MPa},
\qquad
\Delta\varepsilon=\frac{0.025}{50}=0.0005
\]</div>
    <div class="dm-formula">\[
E=\frac{100}{0.0005}=200\,000\ \text{MPa}=200\ \text{GPa}
\]</div>
    <div class="tn-result">Resultado: <b>σy = 250 MPa</b>, <b>σu = 410 MPa</b>, <b>E ≈ 200 GPa</b>. El módulo es coherente con un acero estructural típico.</div>
</div>

<div class="tn-note tn-warn"><b>Comprobación de orden de magnitud.</b> Un acero estructural típico tiene \(E\approx200\ \text{GPa}\). Si obtienes el doble o la mitad, revisa la base extensométrica, el diámetro, las unidades o la calibración antes de reportar el resultado.</div>

<h5>Cuidados del ensayo</h5>
<ul>
    <li><strong>Alineación:</strong> la carga debe ser axial; la excentricidad produce flexión y reduce la resistencia aparente.</li>
    <li><strong>Velocidad:</strong> la velocidad de carga afecta la respuesta; sigue la norma y mantenla constante.</li>
    <li><strong>Extensómetro:</strong> retíralo antes de la fluencia si la norma lo indica, para evitar daños.</li>
    <li><strong>Dimensiones:</strong> mide el diámetro en varias direcciones y usa el área inicial para esfuerzos ingenieriles.</li>
    <li><strong>Fractura:</strong> registra la ubicación y el aspecto (dúctil, frágil, con inclusiones).</li>
</ul>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> ASTM E8/E8M, ASTM A370, ASTM E111 y ASTM E132. En Colombia, para acero de refuerzo consulta NTC 2289 y los requisitos del Título C de la NSR-10.</div>
`
            },
            {
                id: 'compresion',
                title: 'Compresión: concreto, acero y el efecto de la esbeltez',
                html: S`
<p>El ensayo de compresión aplica carga axial que tiende a acortar la probeta. Es fundamental para el concreto, las rocas, los suelos y los elementos estructurales comprimidos. En concreto se usa <strong>NTC 673</strong> y <strong>ASTM C39/C39M</strong>; en metales, <strong>ASTM E9</strong>.</p>

<div class="dm-formula">\[
\sigma_c=\frac{P}{A_0},
\qquad
\varepsilon_c=\frac{\Delta L}{L_0}
\]</div>

<p>Para un cilindro de concreto de diámetro \(D\), el área es \(A_0=\pi D^2/4\), y la resistencia a compresión se reporta como \(f'_c\). La resistencia medida depende de la relación altura/diámetro, del tipo de cabezal, de la velocidad de carga y del curado. La norma establece factores de corrección cuando la probeta no tiene la relación estándar.</p>

<div class="dm-formula">\[
f'_c=\frac{P_{max}}{A_0},
\qquad
E_c\approx4700\sqrt{f'_c}\ \text{MPa}
\]</div>

<p>La expresión de \(E_c\) es la del concreto de peso normal según ACI 318 / NSR-10 (Título C). Para otros concretos o edades, usa la expresión y los factores que correspondan. En acero, el módulo en compresión es esencialmente el mismo que en tracción dentro del rango elástico, pero la falla puede estar controlada por pandeo si la probeta es esbelta.</p>

<div class="tn-example">
    <h5><span>2</span>Ejemplo: cilindro de concreto</h5>
    <p>Un cilindro de \(150\ \text{mm}\) de diámetro falla con \(P_{max}=700\ \text{kN}\).</p>
    <div class="dm-formula">\[
A_0=\frac{\pi(150)^2}{4}=17\,671\ \text{mm}^2
\qquad\Longrightarrow\qquad
f'_c=\frac{700\,000}{17\,671}=39.6\ \text{MPa}
\]</div>
    <div class="dm-formula">\[
E_c\approx4700\sqrt{39.6}=29\,580\ \text{MPa}\approx29.6\ \text{GPa}
\]</div>
    <div class="tn-result">Resultado: <b>f'c ≈ 39.6 MPa</b>, <b>Ec ≈ 29.6 GPa</b>. Verifica la edad, el curado y la relación altura/diámetro.</div>
</div>

<h5>Modo de falla y efecto de la esbeltez</h5>
<ul>
    <li><strong>Concreto:</strong> la falla típica forma conos o fisuras verticales; un cabezal mal preparado produce concentraciones y resultados bajos.</li>
    <li><strong>Acero dúctil:</strong> se acorta y se abomba; en probetas esbeltas puede pandear antes de alcanzar la fluencia.</li>
    <li><strong>Materiales frágiles:</strong> pueden fallar por tracción lateral (efecto Poisson) o por grietas locales.</li>
    <li><strong>Relación L/D:</strong> al aumentar la esbeltez, disminuye la resistencia aparente por efecto de confinamiento de los cabezales.</li>
</ul>

<div class="tn-note tn-warn"><b>No compares resistencias sin corregir.</b> Un cilindro de \(100\times200\ \text{mm}\) y uno de \(150\times300\ \text{mm}\) pueden dar valores distintos. Aplica el factor de corrección de la norma y reporta la geometría, la edad y el tipo de curado.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 673; ASTM C39/C39M; ASTM E9 para metales. La NSR-10, Título C, establece los requisitos de resistencia, muestreo y aceptación del concreto estructural.</div>
`
            },
            {
                id: 'flexion',
                title: 'Flexión: esfuerzo normal, módulo de sección y curvatura',
                html: S`
<p>En una viga sometida a flexión, las fibras de un lado se alargan y las del otro se comprimen. La hipótesis de Bernoulli-Navier establece que las secciones planas permanecen planas; con comportamiento elástico lineal, la deformación varía linealmente con la distancia al eje neutro.</p>

<div class="dm-formula">\[
\sigma=-\frac{M y}{I},
\qquad
S=\frac{I}{c},
\qquad
\sigma_{max}=\frac{M}{S}
\]</div>

<p>donde \(M\) es el momento flector, \(y\) la distancia al eje neutro, \(I\) el momento de inercia de la sección y \(c\) la distancia a la fibra extrema. El signo depende de la convención; lo importante es identificar tracción y compresión.</p>

<h5>Curvatura y rigidez</h5>
<div class="dm-formula">\[
\frac{1}{\rho}=\frac{M}{EI}
\]</div>
<p>La rigidez a flexión es \(EI\). Si el momento es constante, la curvatura también lo es; si varía, la viga se deforma con una curvatura variable. Para una sección rectangular de ancho \(b\) y alto \(h\):</p>

<div class="dm-formula">\[
I=\frac{bh^3}{12},
\qquad
S=\frac{bh^2}{6}
\]</div>

<p>Para una sección circular maciza de diámetro \(D\): \(I=\pi D^4/64\) y \(S=\pi D^3/32\). Para secciones compuestas, se transforma la sección a un material de referencia usando la relación de módulos.</p>

<div class="tn-example">
    <h5><span>3</span>Ejemplo: viga rectangular</h5>
    <p>Viga de \(b=50\ \text{mm}\), \(h=100\ \text{mm}\), sometida a \(M=2.0\ \text{kN·m}\).</p>
    <div class="dm-formula">\[
I=\frac{(50)(100)^3}{12}=4.167\times10^6\ \text{mm}^4
\]</div>
    <div class="dm-formula">\[
S=\frac{4.167\times10^6}{50}=83\,333\ \text{mm}^3
\]</div>
    <div class="dm-formula">\[
\sigma_{max}=\frac{2.0\times10^6\ \text{N·mm}}{83\,333\ \text{mm}^3}=24.0\ \text{MPa}
\]</div>
    <div class="tn-result">Resultado: <b>I ≈ 4.17 × 10⁶ mm⁴</b>, <b>S ≈ 83 333 mm³</b>, <b>σmax = 24 MPa</b>.</div>
</div>

<h5>Flexión en concreto y módulo de ruptura</h5>
<p>En concreto, la resistencia a flexión se estima con el módulo de ruptura. La NSR-10 / ACI 318 usa, para concreto de peso normal:</p>
<div class="dm-formula">\[
f_r=0.62\sqrt{f'_c}\ \text{MPa}
\]</div>
<p>La resistencia a flexión no reemplaza la resistencia a compresión; es una propiedad diferente y depende de la tracción del concreto, de la edad y del curado. En vigas de concreto reforzado, el acero toma la tracción y el concreto la compresión; el análisis se hace por compatibilidad de deformaciones y equilibrio.</p>

<div class="tn-note tn-warn"><b>La flexión pura no siempre es pura.</b> En una viga real también hay cortante, y cerca de las cargas y apoyos aparecen concentraciones. La fórmula \(\sigma=My/I\) es válida lejos de esas zonas (principio de Saint-Venant) y dentro del rango elástico.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> ASTM E290 para ensayos de doblado; ASTM C78/C78M para módulo de ruptura del concreto; NSR-10, Título C, para el diseño de elementos de concreto. En acero estructural, consulta el Título F de la NSR-10 y la norma AISC aplicable.</div>
`
            },
            {
                id: 'cortante',
                title: 'Cortante en vigas: esfuerzo, flujo y conexiones',
                html: S`
<p>El cortante aparece cuando la fuerza interna tiene una componente tangencial a la sección. En una viga, la variación del momento flector produce esfuerzos cortantes longitudinales y verticales. La fórmula de Jourawski permite calcular el esfuerzo cortante en una sección:</p>

<div class="dm-formula">\[
\tau=\frac{VQ}{Ib}
\]</div>

<p>donde \(V\) es la fuerza cortante, \(Q\) el primer momento de área de la porción de sección respecto al eje neutro, \(I\) el momento de inercia total y \(b\) el ancho de la sección en el punto considerado. Para una sección rectangular, el esfuerzo cortante máximo ocurre en el eje neutro:</p>

<div class="dm-formula">\[
\tau_{max}=\frac{3V}{2A}
\]</div>

<p>Para una sección circular maciza, \(\tau_{max}=4V/(3A)\); para un perfil I, el alma toma la mayor parte del cortante y la fórmula se aplica con el espesor del alma. El flujo de cortante por unidad de longitud es:</p>

<div class="dm-formula">\[
q=\frac{VQ}{I}=\tau b
\]</div>

<p>El flujo de cortante es esencial para diseñar soldaduras, pernos, conectores de cortante y uniones entre elementos. En una viga compuesta, los conectores deben transmitir la fuerza longitudinal acumulada entre la losa y el perfil.</p>

<div class="tn-example">
    <h5><span>4</span>Ejemplo: cortante máximo en una sección rectangular</h5>
    <p>Una viga rectangular de \(b=50\ \text{mm}\), \(h=100\ \text{mm}\) soporta \(V=30\ \text{kN}\).</p>
    <div class="dm-formula">\[
A=(50)(100)=5\,000\ \text{mm}^2,
\qquad
\tau_{max}=\frac{3(30\,000)}{2(5\,000)}=9.0\ \text{MPa}
\]</div>
    <div class="tn-result">Resultado: <b>τmax = 9.0 MPa</b>. Verifica que el alma o la sección no falle por cortante y revisa el pandeo local si es un perfil delgado.</div>
</div>

<h5>Dónde revisar el cortante</h5>
<ul>
    <li><strong>Apoyos y cargas concentradas:</strong> zonas de alta cortante y concentración de esfuerzos.</li>
    <li><strong>Almas delgadas:</strong> pueden pandear por cortante antes de alcanzar la fluencia.</li>
    <li><strong>Uniones:</strong> pernos, soldaduras y conectores deben resistir el flujo de cortante.</li>
    <li><strong>Columnas y muros:</strong> el cortante puede combinarse con carga axial y flexión.</li>
</ul>

<div class="tn-note tn-warn"><b>Promedio no es máximo.</b> \(\tau=V/A\) es un esfuerzo promedio; en una sección rectangular el máximo es 1.5 veces mayor. Usar el promedio para verificar una sección puede ser no conservador.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NSR-10, Título F (estructuras metálicas) y Título C (concreto estructural); AISC Specification y ACI 318 en sus ediciones adoptadas. Para ensayos de cortante de materiales, consulta ASTM E143 y las normas específicas del producto.</div>
`
            },
            {
                id: 'torsion',
                title: 'Torsión: esfuerzo cortante, ángulo de giro y potencia',
                html: S`
<p>La torsión aparece cuando un elemento se somete a un momento que gira alrededor de su eje longitudinal. En una barra circular, las secciones giran sin deformarse en su plano y el esfuerzo cortante varía linealmente desde el centro hasta la superficie.</p>

<div class="dm-formula">\[
\tau=\frac{T\rho}{J},
\qquad
\tau_{max}=\frac{Tc}{J}=\frac{T}{W_t}
\]</div>

<p>donde \(T\) es el torque, \(\rho\) la distancia radial, \(c\) el radio exterior, \(J\) el momento polar de inercia y \(W_t=J/c\) el módulo polar de sección. Para una sección circular maciza de diámetro \(d\):</p>

<div class="dm-formula">\[
J=\frac{\pi d^4}{32},
\qquad
W_t=\frac{\pi d^3}{16}
\]</div>

<p>Para una sección tubular de diámetro exterior \(D\) e interior \(d\):</p>
<div class="dm-formula">\[
J=\frac{\pi(D^4-d^4)}{32}
\]</div>

<h5>Ángulo de giro</h5>
<div class="dm-formula">\[
\varphi=\frac{TL}{GJ}
\]</div>
<p>donde \(G\) es el módulo de cortante y \(L\) la longitud. Si el torque o la sección varían, se integra a lo largo del eje. La rigidez torsional es \(GJ\); un tubo puede ser mucho más eficiente que una barra maciza porque el material se coloca lejos del centro.</p>

<h5>Potencia transmitida</h5>
<div class="dm-formula">\[
P=T\omega=2\pi nT
\]</div>
<p>con \(n\) en revoluciones por segundo. Si \(n\) se expresa en rpm y \(T\) en N·m, entonces \(P(\text{W})=2\pi n_{rpm}T/60\). Esta relación se usa para diseñar ejes de motores, reductores y bombas.</p>

<div class="tn-example">
    <h5><span>5</span>Ejemplo: eje macizo</h5>
    <p>Eje de acero de \(d=40\ \text{mm}\), \(T=500\ \text{N·m}\), \(G=77\ \text{GPa}\), \(L=1.0\ \text{m}\).</p>
    <div class="dm-formula">\[
J=\frac{\pi(40)^4}{32}=251\,327\ \text{mm}^4
\]</div>
    <div class="dm-formula">\[
\tau_{max}=\frac{(500\,000)(20)}{251\,327}=39.8\ \text{MPa}
\]</div>
    <div class="dm-formula">\[
\varphi=\frac{(500)(1\,000)}{(77\,000)(251\,327)}=0.0258\ \text{rad}=1.48^\circ
\]</div>
    <div class="tn-result">Resultado: <b>τmax ≈ 39.8 MPa</b>, <b>φ ≈ 1.48°</b> en 1 m. Verifica la rigidez y la resistencia del acero.</div>
</div>

<div class="tn-note tn-warn"><b>La fórmula circular no aplica a secciones no circulares.</b> En una barra rectangular, la distribución de esfuerzos es más compleja y la sección se alabea. Usa las fórmulas específicas (Timoshenko) o un análisis por elementos finitos; no apliques \(Tc/J\) sin verificar la geometría.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> ASTM E143 para módulo de cortante; ASTM A370 para ensayos mecánicos de acero. En diseño de ejes y estructuras, consulta la NSR-10 y la norma sectorial aplicable.</div>
`
            },
            {
                id: 'transformacion',
                title: 'Transformación de esfuerzos, Mohr y criterios de falla',
                html: S`
<p>Un mismo estado de esfuerzos se ve diferente según la orientación del elemento. La transformación de esfuerzos permite encontrar los planos principales, el esfuerzo cortante máximo y la orientación crítica para el diseño.</p>

<div class="dm-formula">\[
\sigma_{x'}=\frac{\sigma_x+\sigma_y}{2}
+\frac{\sigma_x-\sigma_y}{2}\cos 2\theta
+\tau_{xy}\sin 2\theta
\]</div>

<div class="dm-formula">\[
\tau_{x'y'}=-\frac{\sigma_x-\sigma_y}{2}\sin 2\theta
+\tau_{xy}\cos 2\theta
\]</div>

<p>Los esfuerzos principales son los valores extremos de \(\sigma_{x'}\):</p>

<div class="dm-formula">\[
\sigma_{1,2}=\frac{\sigma_x+\sigma_y}{2}
\pm\sqrt{\left(\frac{\sigma_x-\sigma_y}{2}\right)^2+\tau_{xy}^2}
\]</div>

<div class="dm-formula">\[
\tan 2\theta_p=\frac{2\tau_{xy}}{\sigma_x-\sigma_y},
\qquad
\tau_{max}=\sqrt{\left(\frac{\sigma_x-\sigma_y}{2}\right)^2+\tau_{xy}^2}
\]</div>

<p>El círculo de Mohr es la representación gráfica: su centro está en \((\sigma_x+\sigma_y)/2\), su radio es \(\tau_{max}\) y los planos principales corresponden a los extremos horizontales del círculo.</p>

<div class="tn-example">
    <h5><span>6</span>Ejemplo: estado plano de esfuerzos</h5>
    <p>\(\sigma_x=80\ \text{MPa}\), \(\sigma_y=20\ \text{MPa}\), \(\tau_{xy}=30\ \text{MPa}\).</p>
    <div class="dm-formula">\[
\sigma_{1,2}=50\pm\sqrt{30^2+30^2}=50\pm42.43
\]</div>
    <div class="dm-formula">\[
\sigma_1=92.43\ \text{MPa},
\qquad
\sigma_2=7.57\ \text{MPa},
\qquad
\tau_{max}=42.43\ \text{MPa}
\]</div>
    <div class="dm-formula">\[
\theta_p=\frac{1}{2}\arctan\left(\frac{2(30)}{80-20}\right)=22.5^\circ
\]</div>
    <div class="tn-result">Resultado: <b>σ1 ≈ 92.4 MPa</b>, <b>σ2 ≈ 7.6 MPa</b>, <b>τmax ≈ 42.4 MPa</b>, <b>θp ≈ 22.5°</b>.</div>
</div>

<h5>Criterios de falla para materiales dúctiles y frágiles</h5>
<div class="dm-formula">\[
\sigma_{VM}=\sqrt{\sigma_1^2-\sigma_1\sigma_2+\sigma_2^2}
\qquad
\text{(von Mises, estado plano)}
\]</div>
<div class="dm-formula">\[
\sigma_{Tresca}=\sigma_1-\sigma_3
\qquad
\text{(máximo cortante)}
\]</div>
<p>Los criterios de von Mises y Tresca se usan para materiales dúctiles; el criterio de Rankine (máximo esfuerzo principal) se usa para materiales frágiles. El factor de seguridad se define como la razón entre la resistencia del material y el esfuerzo equivalente:</p>

<div class="dm-formula">\[
FS=\frac{\sigma_y}{\sigma_{eq}}
\]</div>

<div class="tn-note tn-warn"><b>Elige el criterio según el material y el modo de falla.</b> Un acero dúctil suele fallar por fluencia; un concreto o una cerámica, por tracción frágil. Aplicar von Mises a un material frágil puede dar un diseño inseguro.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NSR-10, Títulos C y F; AISC Specification; ACI 318. Para ensayos de propiedades mecánicas, ASTM E8/E8M y ASTM E9. Los criterios de falla son modelos: verifica que la hipótesis sea coherente con el material.</div>
`
            },
            {
                id: 'deflexiones',
                title: 'Deflexiones en vigas: integración, superposición y casos típicos',
                html: S`
<p>La deflexión es el desplazamiento vertical de la viga bajo carga. Además de la resistencia, el diseño debe verificar el estado límite de servicio: una viga puede resistir sin fallar y aun así deformarse demasiado para el uso previsto.</p>

<div class="dm-formula">\[
EI\frac{d^2y}{dx^2}=M(x)
\]</div>

<p>Integrando dos veces se obtienen la pendiente y la deflexión, con dos constantes que se determinan con las condiciones de borde. Para cargas y geometrías simples, es más eficiente usar fórmulas tabuladas y superponer los casos.</p>

<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Caso</th><th>Deflexión máxima</th><th>Dónde ocurre</th></tr></thead>
<tbody>
<tr><td>Viga simplemente apoyada, carga uniforme \(w\)</td><td>\(\delta_{max}=\dfrac{5wL^4}{384EI}\)</td><td>Centro</td></tr>
<tr><td>Viga simplemente apoyada, carga puntual \(P\) al centro</td><td>\(\delta_{max}=\dfrac{PL^3}{48EI}\)</td><td>Centro</td></tr>
<tr><td>Viga en voladizo, carga puntual en el extremo</td><td>\(\delta_{max}=\dfrac{PL^3}{3EI}\)</td><td>Extremo libre</td></tr>
<tr><td>Viga en voladizo, carga uniforme</td><td>\(\delta_{max}=\dfrac{wL^4}{8EI}\)</td><td>Extremo libre</td></tr>
<tr><td>Viga simplemente apoyada, momento en un extremo</td><td>\(\delta_{max}=\dfrac{ML^2}{9\sqrt{3}EI}\)</td><td>A \(L/\sqrt{3}\) del apoyo</td></tr>
</tbody>
</table></div>

<div class="tn-example">
    <h5><span>7</span>Ejemplo: viga simplemente apoyada</h5>
    <p>Viga de \(L=6\ \text{m}\), carga uniforme \(w=10\ \text{kN/m}\), \(E=200\ \text{GPa}\), \(I=50\times10^6\ \text{mm}^4\).</p>
    <div class="dm-formula">\[
\delta_{max}=\frac{5(10\,000)(6^4)}{384(200\times10^9)(50\times10^{-6})}
\]</div>
    <div class="dm-formula">\[
\delta_{max}=\frac{64.8\times10^6}{3.84\times10^9}=0.0169\ \text{m}=16.9\ \text{mm}
\]</div>
    <div class="tn-result">Resultado: <b>δmax ≈ 16.9 mm</b>. Compara con el límite de servicio; para una viga de 6 m, un límite típico puede ser \(L/250\) o \(L/360\), según el uso y la norma.</div>
</div>

<h5>Métodos de análisis</h5>
<ul>
    <li><strong>Integración:</strong> directa, útil cuando \(M(x)\) es una función simple.</li>
    <li><strong>Superposición:</strong> suma de casos tabulados; válida en comportamiento lineal.</li>
    <li><strong>Vigas conjugadas:</strong> transforma el problema de deflexión en uno de momentos.</li>
    <li><strong>Tres momentos:</strong> para vigas continuas con varios apoyos.</li>
    <li><strong>Castigliano:</strong> derivadas parciales de la energía de deformación; útil en estructuras reticulares.</li>
</ul>

<div class="tn-note tn-warn"><b>La deflexión depende de \(EI\), no solo de \(E\).</b> Un cambio de altura en la sección afecta \(I\) con la tercera potencia. Duplicar \(h\) en una sección rectangular multiplica \(I\) por 8 y reduce la deflexión considerablemente, si el resto permanece igual.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NSR-10, Título C y Título F, para límites de deflexión y estados límite de servicio; ACI 318 y AISC Specification según el material. Los límites exactos dependen del elemento y de la norma adoptada.</div>
`
            },
            {
                id: 'columnas',
                title: 'Columnas y pandeo: Euler, esbeltez y límites de validez',
                html: S`
<p>Una columna es un elemento sometido principalmente a compresión. Si es esbelta, puede fallar por <strong>pandeo</strong> antes de que el material alcance su resistencia. La carga crítica de Euler para una columna ideal, elástica y perfectamente recta es:</p>

<div class="dm-formula">\[
P_{cr}=\frac{\pi^2EI}{(KL)^2}
\]</div>

<p>donde \(K\) es el factor de longitud efectiva, \(L\) la longitud real y \(KL\) la longitud efectiva. Valores típicos: \(K=1.0\) articulada-articulada, \(K=0.5\) empotrada-empotrada, \(K=0.7\) empotrada-articulada y \(K=2.0\) libre en un extremo.</p>

<div class="dm-formula">\[
\sigma_{cr}=\frac{P_{cr}}{A}=\frac{\pi^2E}{(KL/r)^2},
\qquad
r=\sqrt{\frac{I}{A}},
\qquad
\lambda=\frac{KL}{r}
\]</div>

<p>El esfuerzo crítico de Euler solo es válido mientras \(\sigma_{cr}\) no supere el límite de proporcionalidad del material. La esbeltez de transición para acero es:</p>

<div class="dm-formula">\[
\lambda_c=\pi\sqrt{\frac{E}{\sigma_y}}
\]</div>

<p>Si \(\lambda\ge\lambda_c\), la columna es esbelta y puede usar Euler; si \(\lambda<\lambda_c\), la falla ocurre por fluencia o inestabilidad inelástica y se usan curvas de diseño empíricas (AISC, NSR-10).</p>

<div class="tn-example">
    <h5><span>8</span>Ejemplo: columna de acero</h5>
    <p>Columna articulada-articulada de \(L=4\ \text{m}\), \(E=200\ \text{GPa}\), \(I=10\times10^6\ \text{mm}^4\), \(A=5\,000\ \text{mm}^2\), \(\sigma_y=250\ \text{MPa}\).</p>
    <div class="dm-formula">\[
P_{cr}=\frac{\pi^2(200\times10^9)(10\times10^{-6})}{(1.0\times4)^2}
=1\,233.7\ \text{kN}
\]</div>
    <div class="dm-formula">\[
r=\sqrt{\frac{10\times10^6}{5\,000}}=44.72\ \text{mm},
\qquad
\lambda=\frac{4\,000}{44.72}=89.4
\]</div>
    <div class="dm-formula">\[
\lambda_c=\pi\sqrt{\frac{200\,000}{250}}=88.9
\]</div>
    <div class="tn-result">Resultado: <b>Pcr ≈ 1 234 kN</b>, <b>λ ≈ 89.4</b>, <b>λc ≈ 88.9</b>. La columna está en el límite; usa la curva de diseño y no solo Euler.</div>
</div>

<h5>Factores que reducen la capacidad</h5>
<ul>
    <li><strong>Imperfecciones iniciales:</strong> curvatura, excentricidad y falta de verticalidad.</li>
    <li><strong>Esbeltez local:</strong> placas o paredes delgadas pueden pandear antes que la columna global.</li>
    <li><strong>Condiciones de borde:</strong> una unión semirrígida no es empotramiento perfecto.</li>
    <li><strong>Cargas laterales:</strong> viento, sismo o empujes aumentan el momento y reducen la capacidad.</li>
    <li><strong>Fluencia y fatiga:</strong> en columnas cortas o cargas cíclicas, el material puede gobernar.</li>
</ul>

<div class="tn-note tn-warn"><b>Euler no es una receta universal.</b> La fórmula supone material elástico, columna perfectamente recta y carga centrada. En columnas reales, usa las curvas de pandeo de la norma, incluye imperfecciones y verifica la esbeltez local.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NSR-10, Título F (estructuras metálicas) y Título C (concreto estructural); AISC Specification y ACI 318. Para ensayos de compresión, ASTM E9.</div>
`
            },
            {
                id: 'dureza',
                title: 'Dureza y ensayos no destructivos: qué miden y qué no',
                html: S`
<p>La dureza es la resistencia de un material a la penetración o a la deformación local. No es una propiedad fundamental única: el resultado depende del método, de la carga, del penetrador y de la escala. Por eso se habla de dureza Rockwell, Brinell, Vickers o Leeb, y no simplemente de “dureza”.</p>

<h5>Rockwell</h5>
<p>Se mide la profundidad de penetración de un penetrador (esfera de acero o cono de diamante) bajo una carga preliminar y una carga mayor. El resultado es un número adimensional que depende de la escala (por ejemplo, HRC para cono de diamante y carga de 150 kgf). La norma es <strong>ASTM E18</strong>.</p>

<h5>Brinell</h5>
<div class="dm-formula">\[
HB=\frac{2P}{\pi D\left(D-\sqrt{D^2-d^2}\right)}
\]</div>
<p>donde \(P\) es la carga (kgf), \(D\) el diámetro de la esfera (mm) y \(d\) el diámetro de la huella (mm). Se usa una esfera de acero o carburo y cargas normalizadas. La norma es <strong>ASTM E10</strong>.</p>

<h5>Vickers</h5>
<div class="dm-formula">\[
HV=1.854\frac{P}{d^2}
\]</div>
<p>donde \(P\) es la carga (kgf) y \(d\) la diagonal promedio de la huella (mm). El penetrador es una pirámide de diamante; es útil para superficies duras y capas delgadas. La norma es <strong>ASTM E92</strong>.</p>

<div class="tn-example">
    <h5><span>9</span>Ejemplo: Brinell</h5>
    <p>Ensayo con \(P=3\,000\ \text{kgf}\), esfera de \(D=10\ \text{mm}\), huella de \(d=4.0\ \text{mm}\).</p>
    <div class="dm-formula">\[
HB=\frac{2(3\,000)}{\pi(10)\left(10-\sqrt{10^2-4^2}\right)}
=\frac{6\,000}{31.416(10-9.165)}
\]</div>
    <div class="dm-formula">\[
HB=\frac{6\,000}{26.24}=228.7
\]</div>
    <div class="tn-result">Resultado: <b>HB ≈ 229</b>. Reporta siempre la carga, el diámetro de la esfera y el tiempo de aplicación.</div>
</div>

<h5>Qué no dice la dureza</h5>
<ul>
    <li><strong>No es resistencia a la tracción:</strong> las correlaciones son empíricas y dependen del material.</li>
    <li><strong>No es tenacidad:</strong> un material duro puede ser frágil.</li>
    <li><strong>No es una propiedad única:</strong> la superficie puede estar endurecida, descarburizada o con recubrimiento.</li>
    <li><strong>No reemplaza el ensayo de tracción:</strong> para propiedades de diseño se requiere la curva \(\sigma\)–\(\varepsilon\) o la norma del producto.</li>
</ul>

<div class="tn-note tn-warn"><b>Las conversiones son aproximadas.</b> Las tablas de equivalencia entre HRC, HB y HV son válidas para materiales y condiciones específicas. ASTM E140 es una guía, no una verdad universal; no conviertas sin indicar el material y la fuente.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> ASTM E18 (Rockwell), ASTM E10 (Brinell), ASTM E92 (Vickers), ASTM E140 (tablas de conversión) y ASTM A370 (ensayos mecánicos de productos de acero).</div>
`
            },
            {
                id: 'errores',
                title: 'Prácticas de laboratorio, errores frecuentes y reporte',
                html: S`
<p>En resistencia de materiales, un resultado numérico sin contexto puede ser peor que no tenerlo. La validez depende de la preparación de la probeta, la alineación, la velocidad de carga, la calibración y la interpretación. Esta sección resume los controles que suelen definir la calidad de un informe.</p>

<h5>Errores que más afectan los resultados</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Ensayo</th><th>Error frecuente</th><th>Efecto</th><th>Control</th></tr></thead>
<tbody>
<tr><td>Tracción</td><td>Carga excéntrica</td><td>Flexión parásita y baja resistencia aparente</td><td>Alinear mordazas y probeta</td></tr>
<tr><td>Tracción</td><td>Velocidad inestable</td><td>Curva y fluencia distorsionadas</td><td>Controlar velocidad según norma</td></tr>
<tr><td>Compresión</td><td>Cabezal mal preparado</td><td>Concentración de esfuerzos y falla prematura</td><td>Caras paralelas y pulidas</td></tr>
<tr><td>Flexión</td><td>Apoyos mal ubicados</td><td>Momento distinto al calculado</td><td>Verificar luz y puntos de carga</td></tr>
<tr><td>Torsión</td><td>Torque o ángulo mal calibrados</td><td>τ y G incorrectos</td><td>Calibrar celda y encoder</td></tr>
<tr><td>Dureza</td><td>Superficie irregular</td><td>Huella mal medida</td><td>Preparar superficie y medir diagonales</td></tr>
<tr><td>Todas</td><td>Unidades mezcladas</td><td>Errores de 10, 100 o 1000</td><td>Convertir antes de calcular</td></tr>
</tbody>
</table></div>

<h5>Reporte mínimo</h5>
<ol>
    <li><strong>Material y probeta:</strong> tipo, dimensiones, orientación, tratamiento térmico y superficie.</li>
    <li><strong>Máquina y calibración:</strong> identificación, capacidad, celda de carga y fecha de calibración.</li>
    <li><strong>Procedimiento:</strong> norma, velocidad, temperatura y accesorios.</li>
    <li><strong>Datos:</strong> carga, desplazamiento, extensómetro, dimensiones y observaciones.</li>
    <li><strong>Cálculos:</strong> ecuaciones, unidades y resultados intermedios.</li>
    <li><strong>Resultados:</strong> tabla, curva y comparación con especificación.</li>
    <li><strong>Falla:</strong> ubicación, aspecto y posible causa.</li>
</ol>

<h5>Lista de chequeo rápida</h5>
<div class="tn-check">
    <ul>
        <li>¿La probeta cumple dimensiones y tolerancias de la norma?</li>
        <li>¿La carga es axial y la máquina está calibrada?</li>
        <li>¿La velocidad de ensayo es la especificada?</li>
        <li>¿Se registró la temperatura y la humedad cuando aplica?</li>
        <li>¿La curva tiene sentido físico y los valores están dentro del rango esperado?</li>
        <li>¿Se reportaron unidades y la incertidumbre o precisión?</li>
        <li>¿Se conservaron los datos primarios y las fotografías de la falla?</li>
    </ul>
</div>

<div class="tn-note tn-ok"><b>Regla de oro.</b> Si el resultado no se puede reproducir con los datos del informe, el informe no es auditable. La trazabilidad y la coherencia física son parte del resultado.</div>
`
            }
        ],
        bib: [
            'Beer, F. P., Johnston, E. R., DeWolf, J. T. y Mazurek, D. F. <em>Mecánica de materiales</em>. McGraw-Hill.',
            'Hibbeler, R. C. <em>Mecánica de materiales</em>. Pearson.',
            'Gere, J. M. y Goodno, B. J. <em>Mecánica de materiales</em>. Cengage Learning.',
            'Pytel, A. y Singer, F. L. <em>Resistencia de materiales</em>. Oxford University Press.',
            'ASTM International. <em>E8/E8M</em> (tracción), <em>E9</em> (compresión), <em>E18</em> (Rockwell), <em>E10</em> (Brinell), <em>E92</em> (Vickers), <em>E140</em> (conversiones), <em>E290</em> (doblado) y <em>A370</em> (productos de acero).',
            'ICONTEC. <em>NTC 2289</em> (barras de acero para refuerzo de concreto), <em>NTC 673</em> (compresión de concreto) y <em>NTC 4025</em> (módulo de elasticidad del concreto). Verificar la edición vigente.',
            'Reglamento Colombiano de Construcción Sismo Resistente <em>NSR-10</em>, Título C — Concreto estructural y Título F — Estructuras metálicas.',
            'AISC. <em>Specification for Structural Steel Buildings</em>; ACI. <em>Building Code Requirements for Structural Concrete (ACI 318)</em>. Consultar la edición adoptada por el proyecto.'
        ]
    };
})(window);
