/* =========================================================
   GeoMetrics — Teoría de Mecánica de Suelos II
   Resistencia, deformación, cimentaciones y estabilidad.
   Enfoque normativo colombiano (NTC / INVIAS / NSR-10).
   ========================================================= */
(function (global) {
    'use strict';
    var S = String.raw;
    global.TN_MODULES = global.TN_MODULES || {};

    global.TN_MODULES.ms2 = {
        key: 'ms2',
        host: 'ms2-teoria',
        screen: 'pantallaSuelos2',
        tab: 'ms2-ensayos',
        prefix: 'ms2',
        eyebrow: 'Mecánica de Suelos II · Resistencia y diseño geotécnico',
        title: 'Del ensayo de resistencia al diseño de cimentaciones y taludes',
        desc: 'Resistencia al corte, consolidación, triaxial, capacidad de carga, asentamientos, empujes laterales, pilotes y estabilidad de taludes. La teoría conecta cada ensayo de laboratorio con las decisiones de diseño y cita las normas colombianas e internacionales que las respaldan.',
        tags: ['NTC 1917', 'NTC 1527', 'NTC 1967', 'NTC 2041', 'INVIAS E-151 a E-154', 'NSR-10 Título H'],
        stats: [
            ['4', 'ensayos de laboratorio'],
            ['12', 'secciones de teoría'],
            ['6', 'campos de aplicación'],
            ['100 %', 'ecuaciones renderizadas']
        ],
        scope: '<b>Alcance.</b> Las ecuaciones de capacidad de carga, asentamiento y estabilidad son modelos de ingeniería con hipótesis simplificadoras. En un proyecto real se combinan con exploración de campo, ensayos adicionales, análisis de sensibilidad y los requisitos del Título H de la NSR-10. No uses un resultado aislado sin verificar el mecanismo de falla y la condición crítica.',
        route: [
            { t: 'Corte directo', d: 'Envolvente de Mohr-Coulomb: c y φ', go: 'corte' },
            { t: 'Compresión inconfinada', d: 'qu y cohesión no drenada cu = qu/2', go: 'inconfinada' },
            { t: 'Consolidación', d: 'Cc, Cv, OCR y asentamiento', go: 'consolidacion' },
            { t: 'Triaxial', d: 'Círculos de Mohr: UU, CU y CD', go: 'triaxial' }
        ],
        sections: [
            {
                id: 'esfuerzos',
                title: 'Esfuerzos totales, efectivos y presión de poros',
                html: S`
<p>El suelo no resiste solo como un sólido: el agua que ocupa los vacíos ejerce presión y modifica el esfuerzo que toman las partículas. El <strong>principio de esfuerzos efectivos</strong> de Terzaghi es la base de la mecánica de suelos moderna:</p>

<div class="dm-formula">\[
\sigma=\sigma'+u
\qquad\Longrightarrow\qquad
\sigma'=\sigma-u
\]</div>

<p>donde \(\sigma\) es el esfuerzo total, \(u\) la presión de poros y \(\sigma'\) el esfuerzo efectivo. Solo el esfuerzo efectivo controla la fricción, la compresibilidad y la resistencia de los suelos granulares. En un perfil estratificado, el esfuerzo vertical total se obtiene sumando los pesos unitarios:</p>

<div class="dm-formula">\[
\sigma_v(z)=\sum_{i=1}^{n}\gamma_i\,\Delta z_i,
\qquad
u(z)=\gamma_w\,z_w,
\qquad
\sigma'_v(z)=\sigma_v(z)-u(z)
\]</div>

<div class="tn-example">
    <h5><span>1</span>Ejemplo: esfuerzo efectivo en un perfil sencillo</h5>
    <p>Una arena de \(5\ \text{m}\) de espesor tiene \(\gamma=18\ \text{kN/m}^3\) por encima del nivel freático y \(\gamma_{sat}=20\ \text{kN/m}^3\) por debajo. El nivel freático está a \(2\ \text{m}\) de profundidad. Calcula \(\sigma'_v\) a \(5\ \text{m}\).</p>
    <div class="dm-formula">\[
\sigma_v=(18)(2)+(20)(3)=36+60=96\ \text{kPa}
\]</div>
    <div class="dm-formula">\[
u=(9.81)(3)=29.43\ \text{kPa}
\qquad\Longrightarrow\qquad
\sigma'_v=96-29.43=66.57\ \text{kPa}
\]</div>
    <div class="tn-result">Resultado: <b>σv ≈ 96 kPa</b>, <b>u ≈ 29.4 kPa</b>, <b>σ'v ≈ 66.6 kPa</b></div>
</div>

<h5>Coeficiente de empuje en reposo</h5>
<div class="dm-formula">\[
K_0=1-\sin\phi'
\]</div>
<p>La fórmula de Jaky es una aproximación para suelos normalmente consolidados. Para suelos sobreconsolidados se usa una relación que depende de la historia de esfuerzos; una expresión frecuente es \(K_0^{OC}=K_0^{NC}\,OCR^{\sin\phi'}\), pero debe verificarse con la historia del depósito.</p>

<h5>Trayectorias de esfuerzo</h5>
<p>En laboratorio es útil representar el estado de esfuerzos con los invariantes:</p>
<div class="dm-formula">\[
p=\frac{\sigma_1+2\sigma_3}{3},
\qquad
q=\sigma_1-\sigma_3
\]</div>
<p>En algunos textos se usa \(p'=(\sigma'_1+\sigma'_3)/2\) y \(q=(\sigma'_1-\sigma'_3)/2\). <strong>No mezcles convenciones</strong> en la misma gráfica: cambia la posición de la envolvente y los parámetros interpretados. Registra siempre la convención en el informe.</p>

<div class="tn-note tn-warn"><b>Presión de poros no es lo mismo que presión hidrostática.</b> En suelos finos, la presión de poros puede incluir componentes inducidas por carga (exceso de presión de poros) y no se disipa instantáneamente. En un ensayo no drenado, \(u\) cambia durante el corte y el suelo puede fallar con un ángulo de fricción aparente distinto al efectivo.</div>

<div class="tn-note tn-norm"><b>Normas y contexto.</b> Los ensayos que miden o controlan presión de poros se interpretan con NTC 1917, NTC 1967, NTC 2041 e INVIAS E-151 a E-154. La NSR-10, Título H, exige que el estudio geotécnico defina el modelo de esfuerzos y las condiciones de agua subterránea del sitio.</div>
`
            },
            {
                id: 'mohr',
                title: 'Resistencia al corte y criterio de Mohr-Coulomb',
                html: S`
<p>La resistencia al corte es la capacidad del suelo para soportar esfuerzos tangenciales sin fallar. El criterio de Mohr-Coulomb expresa la envolvente de falla como una recta en el plano \(\tau\)–\(\sigma'\):</p>

<div class="dm-formula">\[
\tau_f=c'+\sigma'_f\tan\phi'
\]</div>

<p>donde \(c'\) es la cohesión efectiva, \(\phi'\) el ángulo de fricción interna efectiva y \(\sigma'_f\) el esfuerzo normal efectivo en la superficie de falla. En términos de esfuerzos principales, la condición de falla se escribe:</p>

<div class="dm-formula">\[
\frac{\sigma'_1-\sigma'_3}{2}
=c'\cos\phi'
+\frac{\sigma'_1+\sigma'_3}{2}\sin\phi'
\]</div>

<p>o, de forma equivalente:</p>

<div class="dm-formula">\[
\sigma'_1=\sigma'_3\tan^2\left(45^\circ+\frac{\phi'}{2}\right)
+2c'\tan\left(45^\circ+\frac{\phi'}{2}\right)
\]</div>

<p>La superficie de falla forma un ángulo \(45^\circ+\phi'/2\) con la dirección del esfuerzo principal menor. En un ensayo triaxial, los círculos de Mohr de varias probetas permiten dibujar la envolvente y obtener \(c'\) y \(\phi'\).</p>

<h5>Drenado, no drenado y parámetros aparentes</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Condición drenada</b><p>El agua tiene tiempo de salir; se usan \(c'\) y \(\phi'\) efectivos. Es la condición habitual para análisis a largo plazo en arenas y para suelos finos después de la consolidación.</p></div>
    <div class="tn-mini"><b>Condición no drenada</b><p>El agua no sale; en arcillas saturadas se usa \(c_u\) y \(\phi_u\approx0\) para análisis a corto plazo. La resistencia no drenada depende de la historia de esfuerzos y del grado de perturbación.</p></div>
</div>

<div class="tn-note tn-warn"><b>No mezcles parámetros.</b> Un análisis con \(c'\), \(\phi'\) y presiones de poros debe ser coherente. Si usas una envolvente total (\(c\), \(\phi\)) en un problema donde cambian las presiones de poros, el factor de seguridad puede quedar del lado inseguro. Define primero la condición de drenaje y el plazo del análisis.</div>

<div class="tn-example">
    <h5><span>2</span>Ejemplo: envolvente a partir de dos puntos</h5>
    <p>En corte directo se obtienen los puntos \((\sigma'_n,\tau)=(100,62)\ \text{kPa}\) y \((200,102)\ \text{kPa}\). La pendiente y la ordenada al origen son:</p>
    <div class="dm-formula">\[
\tan\phi'=\frac{102-62}{200-100}=0.40
\qquad\Longrightarrow\qquad
\phi'\approx21.8^\circ
\]</div>
    <div class="dm-formula">\[
c'=62-0.40(100)=22\ \text{kPa}
\]</div>
    <div class="tn-result">Resultado: <b>c' ≈ 22 kPa</b>, <b>φ' ≈ 21.8°</b>. Verifica con al menos tres puntos y observa la curvatura de la envolvente.</div>
</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 1917 (corte directo), NTC 2041 (triaxial UU), INVIAS E-154 y E-153, ASTM D3080 y D2850/D4767. La NSR-10, Título H, exige que los parámetros de resistencia sean coherentes con el mecanismo y la condición de análisis.</div>
`
            },
            {
                id: 'corte',
                title: 'Corte directo: cómo se obtienen c y φ en el laboratorio',
                html: S`
<p>El ensayo de corte directo somete una muestra confinada a una carga normal y a un desplazamiento horizontal hasta la falla. Es uno de los ensayos más usados en Colombia para obtener la envolvente de Mohr-Coulomb de suelos y superficies de contacto. La referencia nacional es <strong>NTC 1917</strong> y <strong>INVIAS E-154</strong>; internacionalmente, <strong>ASTM D3080/D3080M</strong>.</p>

<h5>Cálculos básicos</h5>
<div class="dm-formula">\[
\sigma_n=\frac{N}{A},\qquad
\tau=\frac{T}{A}
\]</div>
<p>donde \(N\) es la carga normal, \(T\) la fuerza tangencial y \(A\) el área de la muestra. En una caja circular, el área disminuye a medida que avanza el desplazamiento; para cálculos refinados se corrige el área, pero muchos informes reportan el esfuerzo con el área inicial y lo indican. La deformación tangencial se calcula como:</p>

<div class="dm-formula">\[
\gamma=\frac{\Delta x}{H}
\]</div>

<p>Se ensayan al menos tres especímenes con esfuerzos normales diferentes. Para cada uno se registra la curva \(\tau\)–\(\Delta x\) y se toma el esfuerzo de corte máximo (o el de falla a una deformación convencional). La envolvente se ajusta por regresión lineal:</p>

<div class="dm-formula">\[
\tau=c+\sigma_n\tan\phi
\qquad\Longrightarrow\qquad
\phi=\arctan(m),\quad c=b
\]</div>

<p>donde \(m\) es la pendiente y \(b\) la ordenada al origen de la recta ajustada. Si la envolvente es curva, un ajuste lineal puede ser conservador en unos rangos y no conservador en otros; revisa los puntos y el intervalo de esfuerzos del problema.</p>

<div class="tn-example">
    <h5><span>3</span>Ejemplo: tres puntos de corte directo</h5>
    <div class="dm-tablewrap"><table class="dm-table">
    <thead><tr><th>Ensayo</th><th>σn (kPa)</th><th>τpico (kPa)</th><th>Observación</th></tr></thead>
    <tbody>
    <tr><td>1</td><td>50</td><td>41</td><td>Falla dúctil</td></tr>
    <tr><td>2</td><td>100</td><td>61</td><td>Pico claro</td></tr>
    <tr><td>3</td><td>200</td><td>101</td><td>Pico y ablandamiento</td></tr>
    </tbody></table></div>
    <p>Un ajuste aproximado da \(m\approx0.40\) y \(b\approx21\ \text{kPa}\).</p>
    <div class="dm-formula">\[
c\approx21\ \text{kPa},\qquad
\phi\approx\arctan(0.40)\approx21.8^\circ
\]</div>
    <div class="tn-result">Resultado: <b>c ≈ 21 kPa</b>, <b>φ ≈ 21.8°</b>. Reporta también el tipo de falla y la velocidad de corte.</div>
</div>

<h5>Elección de la resistencia de diseño</h5>
<ul>
    <li><strong>Pico o residual:</strong> usa el pico para primeros deslizamientos y el residual para superficies ya formadas o suelos sensibles.</li>
    <li><strong>Drenado o no drenado:</strong> la velocidad de corte debe ser compatible con la condición que se analiza. Un corte rápido en arcilla saturada no drena.</li>
    <li><strong>Área y corrección:</strong> documenta si usaste área inicial o corregida; no compares resultados con criterios distintos.</li>
    <li><strong>Superficie de falla:</strong> en suelos heterogéneos o con inclusiones, la falla puede seguir una superficie débil; revisa la muestra después del ensayo.</li>
</ul>

<div class="tn-note tn-warn"><b>Limitación importante.</b> El corte directo impone una superficie de falla horizontal y no controla completamente el drenaje. Para suelos finos y para estudiar presión de poros, el triaxial suele ser más adecuado. Usa el corte directo como una herramienta complementaria, no como la única fuente de parámetros.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 1917; INVIAS E-154; ASTM D3080/D3080M. En el informe incluye la velocidad de corte, el área, la altura inicial, la humedad, la densidad y el criterio de falla adoptado.</div>
`
            },
            {
                id: 'inconfinada',
                title: 'Compresión inconfinada: qu, cu y sensibilidad',
                html: S`
<p>El ensayo de compresión inconfinada somete un cilindro de suelo fino a carga axial sin presión de confinamiento. Es rápido y económico, y se usa para estimar la resistencia al corte no drenada de arcillas y limos cohesivos. En Colombia se cita <strong>NTC 1527</strong> e <strong>INVIAS E-152</strong>; internacionalmente, <strong>ASTM D2166/D2166M</strong>.</p>

<div class="dm-formula">\[
q_u=\frac{P_{max}}{A_0},
\qquad
c_u=\frac{q_u}{2}
\]</div>
<p>La segunda igualdad supone \(\phi_u=0\), condición habitual en arcillas saturadas no drenadas. Si el suelo tiene fricción o no está saturado, \(c_u=q_u/2\) es una aproximación y debe interpretarse con cuidado.</p>

<h5>Deformación y módulo</h5>
<div class="dm-formula">\[
\varepsilon=\frac{\Delta H}{H_0},
\qquad
E_{50}=\frac{\Delta\sigma}{\Delta\varepsilon}\bigg|_{\varepsilon=50\%}
\]</div>
<p>El módulo secante \(E_{50}\) se evalúa entre el origen y el 50 % de la resistencia máxima. Es un indicador de rigidez, no un módulo elástico fundamental. La curva \(\sigma\)–\(\varepsilon\) también revela si la falla es frágil, dúctil o con ablandamiento.</p>

<h5>Sensibilidad y remoldeo</h5>
<div class="dm-formula">\[
S_t=\frac{q_{u,inalterado}}{q_{u,remoldeado}}
\]</div>
<p>Una arcilla sensible pierde gran parte de su resistencia al remoldearse. Valores de \(S_t\) mayores que 4–8 indican sensibilidad importante; por encima de 16 se habla de suelos muy sensibles o colapsables, y en casos extremos de arcillas quick. La sensibilidad es relevante para excavaciones, hinca de pilotes y procesos que perturben el suelo.</p>

<div class="tn-example">
    <h5><span>4</span>Ejemplo: arcilla saturada</h5>
    <p>Una probeta de \(75\ \text{mm}\) de diámetro y \(150\ \text{mm}\) de altura falla con \(P_{max}=530\ \text{N}\).</p>
    <div class="dm-formula">\[
A_0=\frac{\pi(75)^2}{4}=4\,417\ \text{mm}^2
\]</div>
    <div class="dm-formula">\[
q_u=\frac{530}{4\,417}=0.120\ \text{MPa}=120\ \text{kPa}
\qquad\Longrightarrow\qquad
c_u=60\ \text{kPa}
\]</div>
    <div class="tn-result">Resultado: <b>qu ≈ 120 kPa</b>, <b>cu ≈ 60 kPa</b> (si φu ≈ 0).</div>
</div>

<div class="tn-note tn-warn"><b>No aplica a todo suelo.</b> En arenas, gravas, suelos no saturados o materiales con fisuras, la compresión inconfinada no representa bien la resistencia. En arcillas fisuradas, la probeta puede fallar por una discontinuidad y dar un valor no representativo del macizo.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 1527; INVIAS E-152; ASTM D2166/D2166M. Reporta la velocidad de carga, la humedad, la densidad, la relación altura/diámetro y el aspecto de la falla.</div>
`
            },
            {
                id: 'consolidacion',
                title: 'Consolidación unidimensional: Cc, Cv, OCR y asentamiento',
                html: S`
<p>La consolidación es la reducción gradual del volumen de un suelo saturado por la expulsión de agua de los poros bajo un incremento de esfuerzo. Es el fenómeno que produce asentamientos diferidos en arcillas y el que puede convertir una cimentación aparentemente segura en un problema de servicio. En Colombia se aplica <strong>NTC 1967</strong> e <strong>INVIAS E-151</strong>; internacionalmente, <strong>ASTM D2435/D2435M</strong>.</p>

<h5>Curva e–log σ'</h5>
<p>El ensayo aplica incrementos de carga y mide la deformación vertical. Con la altura final de cada escalón se calcula la relación de vacíos:</p>
<div class="dm-formula">\[
e_i=e_0-\frac{\Delta H_i}{H_0}(1+e_0)
\]</div>

<p>La curva \(e\)–\(\log\sigma'\) permite identificar la presión de preconsolidación \(\sigma'_p\), el índice de compresión \(C_c\) y el índice de recompresión \(C_r\):</p>

<div class="dm-formula">\[
C_c=-\frac{\Delta e}{\Delta\log\sigma'},
\qquad
C_r=-\frac{\Delta e}{\Delta\log\sigma'}\quad(\text{rama de recompresión})
\]</div>

<div class="dm-formula">\[
OCR=\frac{\sigma'_p}{\sigma'_{v0}}
\]</div>

<p>Si \(OCR\approx1\), el suelo es normalmente consolidado (NC); si \(OCR>1\), está sobreconsolidado (OC). La presión de preconsolidación se estima con el método de Casagrande o con procedimientos similares; no es un punto que se lea sin criterio.</p>

<h5>Asentamiento por consolidación</h5>
<p>Para un suelo normalmente consolidado:</p>
<div class="dm-formula">\[
S_c=\frac{C_c H}{1+e_0}\log_{10}\left(\frac{\sigma'_{v0}+\Delta\sigma}{\sigma'_{v0}}\right)
\]</div>

<p>Para un suelo sobreconsolidado, se divide en dos tramos:</p>
<div class="dm-formula">\[
S_c=\frac{C_r H}{1+e_0}\log_{10}\left(\frac{\sigma'_p}{\sigma'_{v0}}\right)
+\frac{C_c H}{1+e_0}\log_{10}\left(\frac{\sigma'_{v0}+\Delta\sigma}{\sigma'_p}\right)
\]</div>

<p>válido cuando \(\sigma'_{v0}+\Delta\sigma>\sigma'_p\). Si el incremento no supera la presión de preconsolidación, solo se usa la rama de recompresión.</p>

<h5>Velocidad de consolidación</h5>
<div class="dm-formula">\[
T_v=\frac{C_v t}{H_{dr}^2},
\qquad
U=f(T_v)
\]</div>
<p>donde \(H_{dr}\) es la distancia de drenaje (la mitad del espesor para drenaje por ambas caras) y \(U\) el grado de consolidación. Para estimar el tiempo de un porcentaje dado se usan las soluciones de la teoría de Terzaghi; en la práctica se leen \(t_{50}\) y \(t_{90}\) de la curva de deformación–log tiempo.</p>

<div class="tn-example">
    <h5><span>5</span>Ejemplo: asentamiento de un estrato de arcilla</h5>
    <p>Estrato de \(4\ \text{m}\) de arcilla NC, \(e_0=0.90\), \(C_c=0.35\), \(\sigma'_{v0}=80\ \text{kPa}\). El incremento de esfuerzo es \(\Delta\sigma=40\ \text{kPa}\).</p>
    <div class="dm-formula">\[
S_c=\frac{0.35(4)}{1+0.90}\log_{10}\left(\frac{80+40}{80}\right)
=0.7368\log_{10}(1.5)
\]</div>
    <div class="dm-formula">\[
S_c=0.7368(0.1761)=0.1298\ \text{m}\approx13.0\ \text{cm}
\]</div>
    <div class="tn-result">Resultado: <b>Sc ≈ 13 cm</b>. Si la estructura no tolera ese asentamiento, evalúa mejoramiento, sobrecarga, drenes o cimentación profunda.</div>
</div>

<div class="tn-note tn-warn"><b>Asentamiento total no es solo consolidación.</b> También hay asentamiento inmediato o elástico, secundario y por colapso. En suelos orgánicos, la compresión secundaria puede ser dominante. Separa los componentes y revisa cuál gobierna el plazo de servicio.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 1967; INVIAS E-151; ASTM D2435/D2435M. En la NSR-10, Título H, los asentamientos deben evaluarse frente a los límites de servicio y a la compatibilidad entre elementos estructurales.</div>
`
            },
            {
                id: 'triaxial',
                title: 'Ensayo triaxial: UU, CU y CD',
                html: S`
<p>El triaxial es el ensayo de laboratorio más versátil para estudiar la resistencia y la deformación de suelos, porque permite controlar la presión de confinamiento y medir la presión de poros. En Colombia se cita <strong>NTC 2041</strong> para triaxial UU y <strong>INVIAS E-153</strong>; internacionalmente, <strong>ASTM D2850</strong> (UU) y <strong>ASTM D4767</strong> (CU).</p>

<h5>Esfuerzos en la probeta</h5>
<div class="dm-formula">\[
\sigma_3=\text{presión de cámara},
\qquad
\sigma_1=\sigma_3+\Delta\sigma,
\qquad
\Delta\sigma=\frac{P}{A}
\]</div>
<p>La deformación axial se mide con el desplazamiento del pistón o con instrumentos locales. El área corregida por deformación se estima como \(A=A_0/(1-\varepsilon)\) para una probeta cilíndrica que se deforma sin cambio de volumen; en ensayos drenados hay cambio de volumen y se requiere corrección adicional.</p>

<div class="dm-formula">\[
\varepsilon=\frac{\Delta H}{H_0},
\qquad
q=\sigma_1-\sigma_3,
\qquad
p=\frac{\sigma_1+2\sigma_3}{3}
\]</div>

<h5>Los tres tipos clásicos</h5>
<div class="dm-grid tn-2">
    <div class="tn-mini"><b>UU (no consolidado, no drenado)</b><p>No se permite consolidación ni drenaje. Se obtiene \(c_u\) y \(\phi_u\approx0\). Es apropiado para resistencia a corto plazo de arcillas saturadas.</p></div>
    <div class="tn-mini"><b>CU (consolidado, no drenado)</b><p>Se consolida y luego se corta sin drenaje. Se miden presiones de poros y se obtienen parámetros efectivos \(c'\), \(\phi'\) y trayectorias \(p'\)–\(q\).</p></div>
    <div class="tn-mini"><b>CD (consolidado, drenado)</b><p>Se permite drenaje durante el corte. Se obtienen \(c'\), \(\phi'\) y cambios de volumen. Es la condición de largo plazo.</p></div>
    <div class="tn-mini"><b>Presión de poros</b><p>Skempton: \(\Delta u=B[\Delta\sigma_3+A(\Delta\sigma_1-\Delta\sigma_3)]\). En suelo saturado, \(B\approx1\); \(A\) depende del tipo de suelo y de la deformación.</p></div>
</div>

<div class="tn-example">
    <h5><span>6</span>Ejemplo: lectura de un triaxial</h5>
    <p>Una probeta se consolida con \(\sigma_3=100\ \text{kPa}\) y falla con \(\sigma_1=300\ \text{kPa}\).</p>
    <div class="dm-formula">\[
q=\sigma_1-\sigma_3=200\ \text{kPa},
\qquad
p=\frac{300+2(100)}{3}=166.7\ \text{kPa}
\]</div>
    <p>El círculo de Mohr tiene centro en \((200,0)\) y radio \(100\ \text{kPa}\). Para obtener la envolvente se repiten ensayos con al menos tres confinamientos.</p>
    <div class="tn-result">Resultado: <b>q = 200 kPa</b>, <b>p = 166.7 kPa</b>, radio <b>100 kPa</b>.</div>
</div>

<div class="tn-note tn-warn"><b>La presión de cámara no es el esfuerzo efectivo.</b> En un ensayo saturado, el esfuerzo efectivo de confinamiento es \(\sigma'_3=\sigma_3-u_3\). Si no se mide \(u\), no se pueden interpretar correctamente los parámetros efectivos. Un triaxial sin medición de presión de poros solo entrega una parte de la información.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NTC 2041; INVIAS E-153; ASTM D2850 y D4767. Reporta la velocidad de corte, la saturación (parámetro B), la consolidación, la presión de poros y el criterio de falla.</div>
`
            },
            {
                id: 'capacidad',
                title: 'Capacidad de carga de cimentaciones superficiales',
                html: S`
<p>La capacidad de carga es la presión máxima que el suelo puede soportar antes de fallar por corte. La ecuación general de Terzaghi, con factores de forma, profundidad e inclinación, es la base de muchos métodos de diseño:</p>

<div class="dm-formula">\[
q_u=cN_c s_c d_c i_c
+qN_q s_q d_q i_q
+\frac{1}{2}\gamma B N_\gamma s_\gamma d_\gamma i_\gamma
\]</div>

<p>donde \(q=\gamma D_f\) es la sobrecarga al nivel de desplante, \(B\) el ancho, \(L\) el largo, y \(N_c,N_q,N_\gamma\) los factores de capacidad de carga. Para una cimentación corrida con \(\phi>0\):</p>

<div class="dm-formula">\[
N_q=\tan^2\left(45^\circ+\frac{\phi}{2}\right)e^{\pi\tan\phi},
\qquad
N_c=(N_q-1)\cot\phi
\]</div>

<div class="dm-formula">\[
N_\gamma\approx2(N_q+1)\tan\phi
\]</div>

<p>Para \(\phi=0\), \(N_c=5.14\), \(N_q=1\) y \(N_\gamma=0\). Los factores de forma, profundidad e inclinación dependen del método (Terzaghi, Meyerhof, Vesic, Hansen); no se mezclan formulaciones de autores distintos sin justificar la combinación.</p>

<h5>Factor de seguridad y presión admisible</h5>
<div class="dm-formula">\[
q_{adm}=\frac{q_u}{FS}
\]</div>
<p>Para cimentaciones superficiales se suele adoptar \(FS\ge3\) frente a la falla por corte, además de verificar asentamientos. La NSR-10, Título H, establece los requisitos de estudio geotécnico y las verificaciones de seguridad; el valor exacto de FS debe provenir de la norma o de la especificación del proyecto.</p>

<div class="tn-example">
    <h5><span>7</span>Ejemplo: zapata corrida</h5>
    <p>Zapata corrida de \(B=2.0\ \text{m}\), \(D_f=1.5\ \text{m}\), suelo con \(c=10\ \text{kPa}\), \(\phi=25^\circ\), \(\gamma=18\ \text{kN/m}^3\). Usa los factores aproximados \(N_c=20.7\), \(N_q=10.7\), \(N_\gamma=10.9\).</p>
    <div class="dm-formula">\[
q_u=10(20.7)+18(1.5)(10.7)+\frac{1}{2}(18)(2)(10.9)
\]</div>
    <div class="dm-formula">\[
q_u=207+288.9+196.2=692.1\ \text{kPa}
\]</div>
    <div class="dm-formula">\[
q_{adm}=\frac{692.1}{3}=230.7\ \text{kPa}
\]</div>
    <div class="tn-result">Resultado: <b>qu ≈ 692 kPa</b>, <b>qadm ≈ 231 kPa</b> con FS = 3. Verifica asentamiento y nivel freático.</div>
</div>

<h5>Efecto del nivel freático</h5>
<ul>
    <li>Si el nivel freático está por encima de la base, el término \(\frac{1}{2}\gamma B N_\gamma\) usa \(\gamma'\) y la sobrecarga se calcula con el peso sumergido.</li>
    <li>Si está entre la base y una profundidad \(B\), se interpola el peso unitario; no se reemplaza todo por \(\gamma'\) sin analizar.</li>
    <li>La sobrecarga \(q\) se calcula con los pesos unitarios por encima de \(D_f\), considerando el agua.</li>
</ul>

<div class="tn-note tn-warn"><b>Capacidad no es asentamiento.</b> Un suelo puede tener capacidad de carga suficiente y aun así producir asentamientos excesivos. En suelos finos, el asentamiento por consolidación puede gobernar el diseño aunque el FS de capacidad sea alto.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NSR-10, Título H, capítulos de estudios geotécnicos y cimentaciones; ACI 318 / NSR-10 Título C para el diseño estructural de la zapata. Los factores de capacidad de carga se toman de la referencia adoptada (Terzaghi, Meyerhof, Vesic o Hansen) y se documentan.</div>
`
            },
            {
                id: 'asentamientos',
                title: 'Asentamientos y distribución de esfuerzos en el terreno',
                html: S`
<p>El asentamiento es la deformación vertical del terreno bajo una carga. Se compone de una parte inmediata o elástica, una parte por consolidación y, en algunos suelos, una parte secundaria o por colapso. El diseño de cimentaciones debe verificar tanto la capacidad de carga como el asentamiento y la distorsión angular.</p>

<h5>Incremento de esfuerzo vertical</h5>
<p>La carga de una cimentación se distribuye en el terreno y disminuye con la profundidad. Para una carga uniforme \(q\), el incremento vertical se puede estimar como:</p>
<div class="dm-formula">\[
\Delta\sigma_z=q\,I_z
\]</div>
<p>donde \(I_z\) es un factor de influencia que depende de \(m=z/B\), \(n=L/B\) y de la posición del punto. La solución de Boussinesq, las cartas de Newmark y las tablas de Fadum son herramientas clásicas. Una aproximación frecuente es el método 2:1:</p>

<div class="dm-formula">\[
\Delta\sigma_z=\frac{qBL}{(B+z)(L+z)}
\]</div>

<h5>Asentamiento elástico</h5>
<div class="dm-formula">\[
S_e=\frac{qB(1-\nu^2)}{E}I_s
\]</div>
<p>donde \(E\) es el módulo de elasticidad del suelo, \(\nu\) la relación de Poisson e \(I_s\) un factor de forma y rigidez. Para una placa circular flexible, \(I_s\) es del orden de 1; para una zapata rígida, el factor cambia. El módulo \(E\) debe corresponder al nivel de deformación y al intervalo de esfuerzos del problema.</p>

<h5>Asentamiento por consolidación</h5>
<p>Se calcula integrando la deformación de cada subcapa o aplicando la fórmula del estrato equivalente. Para un estrato de espesor \(H\):</p>
<div class="dm-formula">\[
S_c=\int_0^H \frac{C_c}{1+e_0}\log_{10}\left(\frac{\sigma'_{v0}+\Delta\sigma_z}{\sigma'_{v0}}\right)dz
\]</div>

<div class="tn-example">
    <h5><span>8</span>Ejemplo: asentamiento elástico</h5>
    <p>Una zapata de \(2\ \text{m}\) de ancho transmite \(q=150\ \text{kPa}\). El suelo tiene \(E=25\ \text{MPa}\), \(\nu=0.30\) e \(I_s=1.0\).</p>
    <div class="dm-formula">\[
S_e=\frac{(150)(2)(1-0.30^2)}{25\,000}(1.0)
=\frac{273}{25\,000}=0.0109\ \text{m}
\]</div>
    <div class="tn-result">Resultado: <b>Se ≈ 10.9 mm</b>. Compara con el límite de servicio y con el asentamiento diferencial entre apoyos.</div>
</div>

<h5>Asentamiento diferencial y distorsión angular</h5>
<div class="dm-formula">\[
\delta=\frac{\Delta S}{L}
\]</div>
<p>La distorsión angular \(\delta\) relaciona la diferencia de asentamiento entre dos puntos con su separación. Los límites admisibles dependen del tipo de estructura, del elemento no estructural y de la norma; la NSR-10 y la especificación del proyecto deben consultarse. Un asentamiento total grande puede ser tolerable si es uniforme; uno pequeño pero diferencial puede fisurar la estructura.</p>

<div class="tn-note tn-warn"><b>No uses un solo punto.</b> El asentamiento diferencial se evalúa entre apoyos y a lo largo de la estructura. Una zapata aislada puede cumplir, pero la interacción con zapatas vecinas puede producir asentamientos adicionales por superposición de esfuerzos.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NSR-10, Título H (estudios geotécnicos y cimentaciones) y Título C para los estados límite de servicio de la estructura. Los métodos de distribución de esfuerzos (Boussinesq, Westergaard, 2:1) deben declararse en el informe.</div>
`
            },
            {
                id: 'empujes',
                title: 'Empujes laterales de tierra y muros de contención',
                html: S`
<p>Un muro de contención debe resistir el empuje del suelo, el agua y las sobrecargas, y transmitir esas fuerzas al terreno de fundación. El empuje depende del movimiento relativo entre el muro y el suelo: en reposo, activo o pasivo.</p>

<h5>Coeficientes de empuje</h5>
<div class="dm-formula">\[
K_0=1-\sin\phi',
\qquad
K_a=\tan^2\left(45^\circ-\frac{\phi'}{2}\right),
\qquad
K_p=\tan^2\left(45^\circ+\frac{\phi'}{2}\right)
\]</div>

<p>Para un relleno horizontal y sin cohesión, el empuje activo resultante es:</p>
<div class="dm-formula">\[
P_a=\frac{1}{2}K_a\gamma H^2
\]</div>
<p>y actúa a \(H/3\) desde la base. El empuje pasivo se calcula de forma análoga con \(K_p\), pero movilizarlo requiere desplazamientos importantes; no se debe contar con él sin justificar la compatibilidad de deformaciones.</p>

<h5>Estabilidad del muro</h5>
<div class="dm-formula">\[
FS_{volteo}=\frac{\sum M_R}{\sum M_O},
\qquad
FS_{deslizamiento}=\frac{\sum F_R}{\sum F_D},
\qquad
FS_{capacidad}=\frac{q_u}{q_{max}}
\]</div>
<p>Los valores mínimos dependen de la norma y del caso; como referencia frecuente se emplean \(FS\ge1.5\) para volteo y deslizamiento en condiciones estáticas, y \(FS\ge3\) para capacidad de carga. Verifica además las presiones en la base, el punzonamiento, la estabilidad global y el drenaje.</p>

<div class="tn-example">
    <h5><span>9</span>Ejemplo: empuje activo y estabilidad</h5>
    <p>Relleno granular con \(\phi'=30^\circ\), \(\gamma=18\ \text{kN/m}^3\), muro de \(H=5\ \text{m}\).</p>
    <div class="dm-formula">\[
K_a=\tan^2(45^\circ-15^\circ)=\tan^2(30^\circ)=\frac{1}{3}
\]</div>
    <div class="dm-formula">\[
P_a=\frac{1}{2}\left(\frac{1}{3}\right)(18)(5^2)=75\ \text{kN/m}
\]</div>
    <p>Si los momentos resistentes son \(450\ \text{kN·m/m}\) y los actuantes \(180\ \text{kN·m/m}\), entonces \(FS_{volteo}=2.5\). Si las fuerzas resistentes al deslizamiento son \(120\ \text{kN/m}\) y las actuantes \(60\ \text{kN/m}\), \(FS_{deslizamiento}=2.0\).</p>
    <div class="tn-result">Resultado: <b>Pa = 75 kN/m</b>; <b>FS volteo = 2.5</b>; <b>FS deslizamiento = 2.0</b>. Verifica capacidad y drenaje.</div>
</div>

<h5>Agua, drenaje y sismo</h5>
<ul>
    <li><strong>Agua:</strong> el agua ejerce empuje hidrostático y reduce los esfuerzos efectivos. Un drenaje deficiente puede duplicar el empuje y provocar la falla.</li>
    <li><strong>Sobrecargas:</strong> las cargas en la corona se suman al empuje; usa una distribución compatible con la teoría adoptada.</li>
    <li><strong>Sismo:</strong> el método de Mononobe-Okabe estima el empuje dinámico con un coeficiente sísmico horizontal; la NSR-10 exige considerar el efecto sísmico según la zona y el tipo de muro.</li>
    <li><strong>Empuje pasivo:</strong> no lo uses para estabilidad si el muro no puede desplazarse lo suficiente para movilizarlo.</li>
</ul>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NSR-10, Título H, capítulo de muros de contención; NSR-10, Título A, para acciones sísmicas. Los coeficientes de empuje y los factores de seguridad deben ser coherentes con la teoría y con las condiciones de drenaje del relleno.</div>
`
            },
            {
                id: 'pilotes',
                title: 'Cimentaciones profundas: capacidad y asentamiento de pilotes',
                html: S`
<p>Los pilotes transmiten carga por la punta, por fricción lateral o por una combinación de ambas. Se usan cuando el suelo superficial no tiene capacidad suficiente, cuando los asentamientos deben controlarse o cuando las cargas son muy concentradas. La capacidad última se expresa como:</p>

<div class="dm-formula">\[
Q_u=Q_p+Q_s=q_pA_p+\sum_i q_{s,i}A_{s,i}
\]</div>

<p>donde \(q_p\) es la resistencia unitaria de punta, \(A_p\) el área de la punta, \(q_s\) la resistencia unitaria por fricción y \(A_s\) el área lateral del fuste. Para un pilote cilíndrico de diámetro \(D\) y longitud \(L\), \(A_p=\pi D^2/4\) y \(A_s=\pi D L\).</p>

<h5>Métodos de estimación</h5>
<div class="tn-grid tn-2">
    <div class="tn-mini"><b>Arcillas (método α)</b><p>\(q_s=\alpha c_u\), con \(\alpha\) que depende de la resistencia no drenada y del tipo de pilote. La punta se estima con \(q_p=N_c c_u\), usualmente \(N_c\approx9\).</p></div>
    <div class="tn-mini"><b>Arenas (método β)</b><p>\(q_s=\beta\sigma'_v\), con \(\beta\) empírico. La punta se relaciona con \(N_q\sigma'_v\) y está limitada por la compresibilidad y la profundidad crítica.</p></div>
    <div class="tn-mini"><b>Ensayo de carga</b><p>Es la verificación más directa. Se aplica carga en etapas y se mide el asentamiento; los resultados se interpretan con criterios de falla y se comparan con la capacidad calculada.</p></div>
    <div class="tn-mini"><b>Grupo de pilotes</b><p>La capacidad del grupo no es la suma simple: hay interacción, efectos de bloque y asentamientos adicionales. Se usa una eficiencia \(\eta=Q_{grupo}/(nQ_{pilote})\).</p></div>
</div>

<div class="tn-example">
    <h5><span>10</span>Ejemplo: pilote de concreto</h5>
    <p>Pilote de \(0.50\ \text{m}\) de diámetro y \(10\ \text{m}\) de longitud. La resistencia de punta es \(q_p=2\,000\ \text{kPa}\) y la fricción lateral promedio es \(q_s=40\ \text{kPa}\).</p>
    <div class="dm-formula">\[
A_p=\frac{\pi(0.50)^2}{4}=0.1963\ \text{m}^2,
\qquad
A_s=\pi(0.50)(10)=15.71\ \text{m}^2
\]</div>
    <div class="dm-formula">\[
Q_u=(2\,000)(0.1963)+(40)(15.71)=392.6+628.4=1\,021\ \text{kN}
\]</div>
    <div class="dm-formula">\[
Q_{adm}=\frac{1\,021}{3}=340.3\ \text{kN}
\]</div>
    <div class="tn-result">Resultado: <b>Qu ≈ 1 021 kN</b>, <b>Qadm ≈ 340 kN</b> con FS = 3. Verifica asentamiento y grupo.</div>
</div>

<h5>Asentamiento y control de calidad</h5>
<ul>
    <li><strong>Asentamiento:</strong> depende del fuste, la punta, la interacción y la consolidación del estrato. Un pilote puede tener capacidad suficiente y asentamiento excesivo.</li>
    <li><strong>Construcción:</strong> la limpieza del fondo, la verticalidad, el control de lodos, el recubrimiento y la integridad del fuste son críticos.</li>
    <li><strong>Ensayos:</strong> carga estática, integridad (sónico o de impedancia) y, cuando aplique, pruebas dinámicas de hinca.</li>
    <li><strong>Grupo:</strong> evalúa el asentamiento del grupo y la redistribución de cargas; no supongas que cada pilote toma la misma carga.</li>
</ul>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NSR-10, Título H, capítulo de cimentaciones profundas; ASTM D1143 para ensayo de carga estática y ASTM D5882 para integridad. Los métodos α y β son empíricos: deben calibrarse con ensayos del sitio y con la experiencia local.</div>
`
            },
            {
                id: 'taludes',
                title: 'Estabilidad de taludes: mecanismos y factores de seguridad',
                html: S`
<p>Un talud falla cuando las fuerzas que lo empujan hacia abajo superan la resistencia al corte disponible a lo largo de una superficie de falla. Los mecanismos principales son la falla circular en suelos cohesivos, la falla planar en rocas o discontinuidades y la falla por cuña por intersección de dos planos.</p>

<h5>Talud infinito</h5>
<p>Para un talud infinito con flujo paralelo a la superficie, el factor de seguridad se aproxima con:</p>
<div class="dm-formula">\[
FS=\frac{c'}{\gamma H\sin\beta\cos\beta}
+\frac{\tan\phi'}{\tan\beta}
\]</div>
<p>donde \(\beta\) es la inclinación del talud, \(H\) la profundidad de la superficie de falla y \(c'\), \(\phi'\) los parámetros efectivos. Si el nivel freático coincide con la superficie, se usa el peso unitario saturado y se incluye la presión de poros.</p>

<h5>Métodos de dovelas</h5>
<p>Para superficies curvas se divide la masa en dovelas. El método ordinario de Fellenius es conservador y sencillo:</p>
<div class="dm-formula">\[
FS=\frac{\sum\left[c'\Delta l+(W\cos\alpha-u\Delta l)\tan\phi'\right]}
{\sum W\sin\alpha}
\]</div>

<p>Bishop simplificado incluye la interacción entre dovelas y suele dar factores de seguridad mayores; se resuelve iterativamente. Spencer y Morgenstern-Price satisfacen equilibrio de fuerzas y momentos y son preferibles en casos complejos. La elección del método debe ser coherente con la geometría, las cargas y el tipo de superficie de falla.</p>

<div class="tn-example">
    <h5><span>11</span>Ejemplo: talud infinito</h5>
    <p>Talud con \(\beta=25^\circ\), \(H=5\ \text{m}\), \(\gamma=18\ \text{kN/m}^3\), \(c'=10\ \text{kPa}\) y \(\phi'=30^\circ\).</p>
    <div class="dm-formula">\[
FS=\frac{10}{(18)(5)\sin25^\circ\cos25^\circ}
+\frac{\tan30^\circ}{\tan25^\circ}
\]</div>
    <div class="dm-formula">\[
FS=\frac{10}{34.47}+\frac{0.5774}{0.4663}
=0.290+1.238=1.528
\]</div>
    <div class="tn-result">Resultado: <b>FS ≈ 1.53</b>. Si la especificación exige 1.5, el talud está en el límite; revisa la presión de poros y la resistencia real.</div>
</div>

<h5>Factores que reducen la estabilidad</h5>
<ul>
    <li><strong>Agua:</strong> aumenta el peso, reduce los esfuerzos efectivos y puede generar flujo o erosión interna.</li>
    <li><strong>Sismo:</strong> agrega fuerzas inerciales y puede licuar suelos granulares sueltos saturados.</li>
    <li><strong>Excavación al pie:</strong> elimina el soporte y permite que la superficie de falla se desarrolle.</li>
    <li><strong>Sobrecargas:</strong> construcciones, equipos o material almacenado en la corona.</li>
    <li><strong>Meteorización y fisuración:</strong> reducen la resistencia y facilitan la entrada de agua.</li>
</ul>

<div class="tn-note tn-warn"><b>Factor de seguridad no es universal.</b> Los valores mínimos dependen de la norma, del tipo de obra, del plazo y de las consecuencias de la falla. La NSR-10, Título H, y la especificación del proyecto definen los requisitos; no adoptes 1.5 de forma automática para todos los casos.</div>

<div class="tn-note tn-norm"><b>Normas de referencia.</b> NSR-10, Título H, capítulo de estabilidad de taludes; ASTM D3080 y D4767 para parámetros de resistencia; ensayos de campo y exploración geotécnica para la geometría y el modelo de agua subterránea.</div>
`
            },
            {
                id: 'errores',
                title: 'Interpretación, errores frecuentes y reporte geotécnico',
                html: S`
<p>Un parámetro de resistencia o un asentamiento no es un número aislado: es una interpretación condicionada por el muestreo, el ensayo, la historia de esfuerzos y el mecanismo de falla. Esta sección reúne los controles que más influyen en la calidad de un informe de Mecánica de Suelos II.</p>

<h5>Coherencia entre ensayo y mecanismo</h5>
<div class="dm-tablewrap"><table class="dm-table">
<thead><tr><th>Situación</th><th>Condición</th><th>Parámetros típicos</th><th>Ensayo recomendado</th></tr></thead>
<tbody>
<tr><td>Arcilla saturada, carga rápida</td><td>No drenada, corto plazo</td><td>\(c_u\), \(\phi_u\approx0\)</td><td>Triaxial UU o compresión inconfinada</td></tr>
<tr><td>Arcilla, largo plazo</td><td>Drenada</td><td>\(c'\), \(\phi'\)</td><td>Triaxial CD o CU con presión de poros</td></tr>
<tr><td>Arena, carga rápida</td><td>Drenada (alta permeabilidad)</td><td>\(c'\approx0\), \(\phi'\)</td><td>Corte directo o triaxial CD</td></tr>
<tr><td>Interfaz suelo-estructura</td><td>Drenada o no drenada según caso</td><td>\(c_a\), \(\delta\)</td><td>Corte directo de interfaz</td></tr>
<tr><td>Asentamiento de arcilla</td><td>Consolidación</td><td>\(C_c\), \(C_r\), \(C_v\), \(OCR\)</td><td>Consolidación 1D</td></tr>
</tbody>
</table></div>

<h5>Errores que cambian el diseño</h5>
<div class="tn-check tn-x">
    <ul>
        <li>Usar parámetros totales en un análisis de largo plazo sin considerar la disipación de presión de poros.</li>
        <li>Tomar el pico de un ensayo en un suelo que ya tiene una superficie de falla; allí gobierna el residual.</li>
        <li>Ignorar la presión de poros medida o no medirla en un triaxial.</li>
        <li>Comparar capacidad de carga sin verificar asentamientos.</li>
        <li>Usar factores de capacidad de carga de autores distintos en una misma ecuación.</li>
        <li>No revisar el nivel freático ni el drenaje del relleno en muros y taludes.</li>
        <li>Extrapolar un ensayo puntual a todo un depósito heterogéneo.</li>
    </ul>
</div>

<h5>Contenido mínimo del informe</h5>
<ol>
    <li><strong>Objetivo y alcance:</strong> qué se va a diseñar y qué condiciones se evalúan.</li>
    <li><strong>Exploración:</strong> sondeos, profundidades, muestras, niveles de agua y descripción del perfil.</li>
    <li><strong>Ensayos:</strong> norma, método, datos, curvas y resultados.</li>
    <li><strong>Modelo geotécnico:</strong> estratigrafía, parámetros adoptados y justificación.</li>
    <li><strong>Análisis:</strong> mecanismos, estados límite, factores de seguridad y asentamientos.</li>
    <li><strong>Conclusiones:</strong> recomendaciones, limitaciones y verificaciones pendientes.</li>
    <li><strong>Anexos:</strong> registros, certificados, fotografías y cálculos.</li>
</ol>

<div class="tn-note tn-ok"><b>Buena práctica.</b> Acompaña cada parámetro con su origen: “φ'=28°, triaxial CU, muestra S-2 a 8 m, consolidada a 100 kPa”. Un parámetro sin procedencia no es trazable y no debería usarse en un diseño.</div>
`
            }
        ],
        bib: [
            'Das, B. M. <em>Principios de ingeniería de cimentaciones</em>. Cengage Learning.',
            'Terzaghi, K., Peck, R. B. y Mesri, G. <em>Soil Mechanics in Engineering Practice</em>, 3.ª ed. Wiley.',
            'Juárez Badillo, E. y Rico Rodríguez, A. <em>Mecánica de suelos, Tomo II: Teoría y aplicaciones de la mecánica de suelos</em>. Limusa.',
            'Bowles, J. E. <em>Foundation Analysis and Design</em>. McGraw-Hill.',
            'Reglamento Colombiano de Construcción Sismo Resistente <em>NSR-10</em>, Título H — Estudios geotécnicos (exploración, ensayos, cimentaciones, muros y taludes).',
            'ICONTEC. <em>NTC 1917</em> (corte directo), <em>NTC 1527</em> (compresión inconfinada), <em>NTC 1967</em> (consolidación) y <em>NTC 2041</em> (triaxial UU).',
            'INVIAS. <em>Normas de ensayo de materiales para carreteras</em>: E-151 (consolidación), E-152 (compresión inconfinada), E-153 (triaxial) y E-154 (corte directo).',
            'ASTM International. <em>D3080/D3080M, D2166/D2166M, D2435/D2435M, D2850 y D4767</em>. Consultar la edición vigente.',
            'NSR-10. <em>Título H</em>: requisitos de estudios geotécnicos, cimentaciones superficiales y profundas, muros de contención y estabilidad de taludes.'
        ]
    };
})(window);
