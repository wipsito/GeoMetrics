/**
 * GeoMetrics — Teoría extensiva por paneles (MS1, MS2, RM)
 * Cada tema se despliega al seleccionar el ítem del menú lateral.
 */
(function (global) {
    'use strict';

    function el(tag, cls, html) {
        var n = document.createElement(tag);
        if (cls) n.className = cls;
        if (html != null) n.innerHTML = html;
        return n;
    }

    var TEORIA = {
        ms2: {
            title: 'Mecánica de Suelos II',
            items: [
                {
                    id: 'ms2-t1',
                    nav: '1. Resistencia al corte',
                    html: '<h4><span class="teo-num">1</span> Resistencia al corte de los suelos</h4>' +
                        '<p>La <strong>resistencia al corte</strong> es la capacidad del suelo para resistir deslizamiento entre partículas. Gobierna estabilidad de taludes, capacidad de carga y empuje sobre muros.</p>' +
                        '<h5>Criterio de Mohr–Coulomb</h5>' +
                        '<div class="formula-box">τ<sub>f</sub> = c + σ<sub>n</sub> · tan(φ)</div>' +
                        '<p>En términos de esfuerzos efectivos: τ<sub>f</sub> = c′ + σ′ · tan(φ′). En condición no drenada de arcillas saturadas suele usarse τ<sub>f</sub> = c<sub>u</sub> (φ<sub>u</sub> ≈ 0).</p>' +
                        '<h5>Ensayos de laboratorio</h5>' +
                        '<ul><li><strong>Corte directo:</strong> plano de falla impuesto; obtiene c y φ de la envolvente τ–σn.</li>' +
                        '<li><strong>Compresión inconfinada:</strong> σ<sub>3</sub> = 0; q<sub>u</sub> y c<sub>u</sub> = q<sub>u</sub>/2.</li>' +
                        '<li><strong>Triaxial UU / CU / CD:</strong> control de drenaje y trayectoria de esfuerzos; círculos de Mohr.</li></ul>' +
                        '<p><em>Referencias:</em> Das; FLA-23 (corte, inconfinada, triaxial); ASTM D3080, D2166, D2850.</p>'
                },
                {
                    id: 'ms2-t2',
                    nav: '2. Corte directo',
                    html: '<h4><span class="teo-num">2</span> Ensayo de corte directo</h4>' +
                        '<p>La muestra se coloca en una caja bipartida. Se aplica esfuerzo normal σ<sub>n</sub> = P<sub>v</sub>/A y se impone desplazamiento horizontal midiendo la fuerza cortante P<sub>h</sub>.</p>' +
                        '<div class="formula-box">σ<sub>n</sub> = P<sub>v</sub> / A &nbsp;&nbsp;|&nbsp;&nbsp; τ = P<sub>h</sub> / A</div>' +
                        '<p>Con varios ensayos a distintos σ<sub>n</sub> se ajusta la recta de falla y se obtienen <strong>c</strong> y <strong>φ</strong>. Los círculos de Mohr asociados permiten estimar σ<sub>1</sub> y σ<sub>3</sub> en el plano de falla.</p>' +
                        '<p><strong>Ventajas:</strong> simple y rápido. <strong>Limitaciones:</strong> plano de falla impuesto, distribución de esfuerzos no uniforme, drenaje difícil de controlar en finos.</p>' +
                        '<p><em>Fuentes:</em> Das; FLA-23 Corte Directo; ASTM D3080.</p>'
                },
                {
                    id: 'ms2-t3',
                    nav: '3. Compresión inconfinada',
                    html: '<h4><span class="teo-num">3</span> Compresión inconfinada</h4>' +
                        '<p>Cilindro de suelo (sin presión de confín lateral) se carga axialmente hasta la falla. Aplicable a suelos cohesivos que mantienen forma sin confín.</p>' +
                        '<div class="formula-box">q<sub>u</sub> = P<sub>falla</sub> / A &nbsp;&nbsp;|&nbsp;&nbsp; c<sub>u</sub> = q<sub>u</sub> / 2</div>' +
                        '<p>Se registra la curva esfuerzo–deformación. La deformación axial ε = ΔL/L<sub>0</sub>. El plano de falla típico se inclina ≈ 45° + φ/2 (con φ≈0 → ≈45°).</p>' +
                        '<p><em>Fuentes:</em> Das; FLA-23 Compresión Inconfinada; ASTM D2166.</p>'
                },
                {
                    id: 'ms2-t4',
                    nav: '4. Consolidación',
                    html: '<h4><span class="teo-num">4</span> Consolidación unidimensional</h4>' +
                        '<p>Estudia la reducción de volumen de suelos saturados por disipación de exceso de presión de poros bajo carga. Se realiza en edómetro.</p>' +
                        '<div class="formula-box">e − log σ′ &nbsp;&nbsp;|&nbsp;&nbsp; C<sub>c</sub> = −Δe / Δlogσ′ &nbsp;&nbsp;|&nbsp;&nbsp; C<sub>v</sub> = T<sub>v</sub> H<sub>dr</sub>² / t</div>' +
                        '<p>Se identifican C<sub>c</sub>, C<sub>r</sub>, σ′<sub>p</sub> (preconsolidación) y C<sub>v</sub>. Fundamental para estimar asentamientos en el tiempo.</p>' +
                        '<p><em>Fuentes:</em> Das; FLA-23 Consolidación; ASTM D2435.</p>'
                },
                {
                    id: 'ms2-t5',
                    nav: '5. Triaxial',
                    html: '<h4><span class="teo-num">5</span> Ensayo triaxial</h4>' +
                        '<p>La muestra cilíndrica se confina con presión de cámara σ<sub>3</sub> y se incrementa el esfuerzo desviador (σ<sub>1</sub> − σ<sub>3</sub>) hasta la falla.</p>' +
                        '<ul><li><strong>UU:</strong> no consolidado–no drenado → c<sub>u</sub>.</li>' +
                        '<li><strong>CU:</strong> consolidado–no drenado (con o sin medida de u).</li>' +
                        '<li><strong>CD:</strong> consolidado–drenado → c′ y φ′.</li></ul>' +
                        '<div class="formula-box">σ<sub>1</sub> = σ<sub>3</sub> + (σ<sub>1</sub> − σ<sub>3</sub>) &nbsp;&nbsp;|&nbsp;&nbsp; círculos de Mohr → c, φ</div>' +
                        '<p><em>Fuentes:</em> Das; ASTM D2850 / D4767 / D7181.</p>'
                },
                {
                    id: 'ms2-t6',
                    nav: '6. Capacidad de carga',
                    html: '<h4><span class="teo-num">6</span> Cimentaciones superficiales — capacidad de carga</h4>' +
                        '<p>La capacidad de carga última q<sub>u</sub> se estima con teorías de Terzaghi, Meyerhof, Hansen, Vesic, etc.</p>' +
                        '<div class="formula-box">q<sub>u</sub> = c N<sub>c</sub> s<sub>c</sub> + γ D<sub>f</sub> N<sub>q</sub> s<sub>q</sub> + 0.5 γ B N<sub>γ</sub> s<sub>γ</sub></div>' +
                        '<p>N<sub>c</sub>, N<sub>q</sub>, N<sub>γ</sub> dependen de φ. La presión admisible incluye factor de seguridad (típicamente 2.5–3).</p>' +
                        '<p><em>Fuentes:</em> Das; NSR-10 Título H.</p>'
                },
                {
                    id: 'ms2-t7',
                    nav: '7. Muros y empujes',
                    html: '<h4><span class="teo-num">7</span> Empujes de tierra y muros</h4>' +
                        '<p>Teorías de Rankine y Coulomb: empuje activo y pasivo en función de φ, c, inclinación del terreno y del muro.</p>' +
                        '<div class="formula-box">K<sub>a</sub> = tan²(45° − φ/2) &nbsp;&nbsp;|&nbsp;&nbsp; K<sub>p</sub> = tan²(45° + φ/2)</div>' +
                        '<p>Verificaciones: volteo, deslizamiento y capacidad portante de la base.</p>' +
                        '<p><em>Fuentes:</em> Das; textos de estructuras de contención.</p>'
                },
                {
                    id: 'ms2-t8',
                    nav: '8. Taludes y pilotes',
                    html: '<h4><span class="teo-num">8</span> Estabilidad de taludes y cimentaciones profundas</h4>' +
                        '<p><strong>Taludes:</strong> métodos de equilibrio límite (Fellenius, Bishop, Janbu). FS = resistencia movilizable / solicitación.</p>' +
                        '<p><strong>Pilotes:</strong> Q<sub>u</sub> = Q<sub>p</sub> + Q<sub>s</sub> (punta + fuste). Instalación por hinca o perforación.</p>' +
                        '<div class="formula-box">Q<sub>u</sub> = q<sub>p</sub> A<sub>p</sub> + Σ f<sub>s</sub> A<sub>s</sub></div>' +
                        '<p><em>Fuentes:</em> Das; NSR-10 Título H.</p>'
                },
                {
                    id: 'ms2-t9',
                    nav: '9. Bibliografía',
                    html: '<h4><span class="teo-num">9</span> Bibliografía y normas</h4>' +
                        '<ul><li>Das, B. M. — <em>Principles of Geotechnical Engineering</em></li>' +
                        '<li>Guías FLA-23 UniPamplona (corte, inconfinada, consolidación)</li>' +
                        '<li>ASTM D3080, D2166, D2435, D2850</li>' +
                        '<li>NSR-10 Título H — estudios geotécnicos</li></ul>' +
                        '<p>En Civix y GeoMetrics, para Suelos II se priorizan estas fuentes; no se mezclan con Beer/Hibbeler.</p>'
                }
            ]
        },
        rm: {
            title: 'Resistencia de Materiales',
            items: [
                {
                    id: 'rm-t1',
                    nav: '1. Esfuerzo y deformación',
                    html: '<h4><span class="teo-num">1</span> Esfuerzo y deformación</h4>' +
                        '<p>El <strong>esfuerzo normal</strong> σ = N/A mide la intensidad de fuerza axial. El <strong>esfuerzo cortante</strong> τ = V/A actúa tangencial al plano.</p>' +
                        '<div class="formula-box">σ = N / A &nbsp;&nbsp;|&nbsp;&nbsp; τ = V / A &nbsp;&nbsp;|&nbsp;&nbsp; ε = δ / L</div>' +
                        '<p>La curva σ–ε define el módulo de elasticidad E, el límite de proporcionalidad y la resistencia última. Ley de Hooke: σ = E ε (rango elástico).</p>' +
                        '<p><em>Fuentes:</em> Beer &amp; Johnston; Hibbeler — <em>Mecánica de materiales</em>.</p>'
                },
                {
                    id: 'rm-t2',
                    nav: '2. Carga axial',
                    html: '<h4><span class="teo-num">2</span> Miembros cargados axialmente</h4>' +
                        '<div class="formula-box">δ = N L / (A E) &nbsp;&nbsp;|&nbsp;&nbsp; σ = N / A</div>' +
                        '<p>Barras estáticamente indeterminadas requieren compatibilidad de deformaciones además del equilibrio. Cambios de temperatura: δ<sub>T</sub> = α ΔT L.</p>' +
                        '<p><em>Fuentes:</em> Beer; Hibbeler.</p>'
                },
                {
                    id: 'rm-t3',
                    nav: '3. Torsión',
                    html: '<h4><span class="teo-num">3</span> Torsión en ejes circulares</h4>' +
                        '<div class="formula-box">τ = T ρ / J &nbsp;&nbsp;|&nbsp;&nbsp; θ = T L / (G J)</div>' +
                        '<p>J = π/32 d⁴ (macizo). El esfuerzo cortante máximo ocurre en la periferia. Potencia y velocidad angular relacionan el torque en diseño de ejes.</p>' +
                        '<p><em>Fuentes:</em> Beer; Hibbeler.</p>'
                },
                {
                    id: 'rm-t4',
                    nav: '4. Flexión',
                    html: '<h4><span class="teo-num">4</span> Flexión pura y esfuerzo normal</h4>' +
                        '<div class="formula-box">σ = − M y / I &nbsp;&nbsp;|&nbsp;&nbsp; 1/ρ = M / (E I)</div>' +
                        '<p>Hipótesis de Bernoulli–Navier: secciones planas permanecen planas. El eje neutro pasa por el centroide en flexión pura elástica.</p>' +
                        '<p><em>Fuentes:</em> Beer; Hibbeler.</p>'
                },
                {
                    id: 'rm-t5',
                    nav: '5. Cortante en vigas',
                    html: '<h4><span class="teo-num">5</span> Esfuerzo cortante en vigas</h4>' +
                        '<div class="formula-box">τ = V Q / (I b)</div>' +
                        '<p>Q es el momento estático del área por encima (o debajo) de la fibra. En secciones rectangulares τ<sub>máx</sub> = 1.5 V/A en el eje neutro.</p>' +
                        '<p><em>Fuentes:</em> Beer; Hibbeler.</p>'
                },
                {
                    id: 'rm-t6',
                    nav: '6. Transformación de esfuerzos',
                    html: '<h4><span class="teo-num">6</span> Transformación de esfuerzos y Mohr</h4>' +
                        '<div class="formula-box">σ<sub>x′</sub> = (σ<sub>x</sub>+σ<sub>y</sub>)/2 + (σ<sub>x</sub>−σ<sub>y</sub>)/2 · cos 2θ + τ<sub>xy</sub> sin 2θ</div>' +
                        '<p>Esfuerzos principales y cortante máximo se visualizan con el <strong>círculo de Mohr</strong>. Criterios de falla: Tresca, von Mises (dúctiles); Mohr–Coulomb / Rankine (frágiles).</p>' +
                        '<p><em>Fuentes:</em> Beer; Hibbeler.</p>'
                },
                {
                    id: 'rm-t7',
                    nav: '7. Deflexión de vigas',
                    html: '<h4><span class="teo-num">7</span> Deflexión de vigas</h4>' +
                        '<div class="formula-box">E I y″ = M(x)</div>' +
                        '<p>Métodos: integración doble, superposición, momentos de área, vigas conjugadas. Límites de servicio restringen deflexiones máximas.</p>' +
                        '<p><em>Fuentes:</em> Beer; Hibbeler.</p>'
                },
                {
                    id: 'rm-t8',
                    nav: '8. Columnas y pandeo',
                    html: '<h4><span class="teo-num">8</span> Columnas — pandeo</h4>' +
                        '<div class="formula-box">P<sub>cr</sub> = π² E I / (K L)² &nbsp;&nbsp;(Euler)</div>' +
                        '<p>K depende de los apoyos (articulada–articulada K=1; empotrada–libre K=2, etc.). Para columnas intermedias se usan fórmulas empíricas (Rankine, parabola, códigos).</p>' +
                        '<p><em>Fuentes:</em> Beer; Hibbeler.</p>'
                },
                {
                    id: 'rm-t9',
                    nav: '9. Bibliografía',
                    html: '<h4><span class="teo-num">9</span> Bibliografía</h4>' +
                        '<ul><li>Beer, Johnston, DeWolf &amp; Mazurek — <em>Mecánica de materiales</em></li>' +
                        '<li>Hibbeler, R. C. — <em>Mecánica de materiales</em></li></ul>' +
                        '<p>En Civix y GeoMetrics, para Resistencia <strong>solo</strong> estas fuentes; no mezclar con Das ni FLA-23 de suelos.</p>'
                }
            ]
        }
    };

    // Extra MS1 panels enrichment (append to existing if short)
    var MS1_EXTRA = {
        'ms1-t1': '<h4><span class="teo-num">1</span> Ruta de trabajo en Suelos I</h4>' +
            '<p>Orden sugerido de estudio y laboratorio:</p>' +
            '<div class="teo-ruta-grid">' +
            '<div class="teo-ruta-card"><b>1</b><strong>Humedad</strong><span>w</span></div>' +
            '<div class="teo-ruta-card"><b>2</b><strong>Granulometría</strong><span>curva, Cu, Cc</span></div>' +
            '<div class="teo-ruta-card"><b>3</b><strong>Atterberg</strong><span>LL, LP, IP</span></div>' +
            '<div class="teo-ruta-card"><b>4</b><strong>SUCS</strong><span>símbolo de grupo</span></div>' +
            '</div>' +
            '<p>Luego Gs, Proctor, densidad de campo y permeabilidad completan la caracterización. Cada tema del menú lateral despliega solo su contenido.</p>' +
            '<p><em>Guía:</em> FLA-23 UniPamplona · Das (propiedades índice).</p>'
    };

    function renderCourse(rootId, panelsId, navSelector, data) {
        var root = document.getElementById(rootId);
        var host = document.getElementById(panelsId);
        if (!root || !host || !data) return;
        var nav = root.querySelector('.teoria-nav');
        if (!nav) return;
        nav.innerHTML = '<p class="teoria-nav-title">CONTENIDO</p>';
        host.innerHTML = '';
        data.items.forEach(function (item, i) {
            var btn = el('button', 'teoria-nav-item' + (i === 0 ? ' active' : ''));
            btn.type = 'button';
            btn.setAttribute('data-teo', item.id);
            btn.textContent = item.nav;
            nav.appendChild(btn);
            var art = el('article', 'teoria-panel' + (i === 0 ? ' active' : ''));
            art.id = item.id;
            art.innerHTML = item.html;
            if (i !== 0) {
                art.hidden = true;
                art.style.display = 'none';
            } else {
                art.hidden = false;
                art.style.display = 'block';
            }
            host.appendChild(art);
        });
    }

    function bindNav(scope) {
        var root = typeof scope === 'string' ? document.querySelector(scope) : scope;
        if (!root) return;
        root.querySelectorAll('.teoria-nav-item[data-teo]').forEach(function (btn) {
            if (btn.__teoExt) return;
            btn.__teoExt = true;
            btn.addEventListener('click', function () {
                var id = btn.getAttribute('data-teo');
                var layout = btn.closest('.teoria-layout') || root;
                layout.querySelectorAll('.teoria-nav-item').forEach(function (b) {
                    b.classList.toggle('active', b === btn);
                });
                layout.querySelectorAll('.teoria-panel').forEach(function (p) {
                    var on = p.id === id;
                    p.classList.toggle('active', on);
                    p.hidden = !on;
                    p.style.display = on ? 'block' : 'none';
                });
            });
        });
    }

    function enrichMS1() {
        Object.keys(MS1_EXTRA).forEach(function (id) {
            var p = document.getElementById(id);
            if (p && p.innerHTML.length < 400) p.innerHTML = MS1_EXTRA[id];
        });
    }

    function init() {
        try {
            renderCourse('teoria-ms2-root', 'teoria-ms2-panels', null, TEORIA.ms2);
            renderCourse('teoria-rm-root', 'teoria-rm-panels', null, TEORIA.rm);
            enrichMS1();
            document.querySelectorAll('.teoria-layout').forEach(bindNav);
        } catch (e) {
            console.warn('teoria-extensa', e);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    global.GeoTeoriaExtensa = { init: init, TEORIA: TEORIA };
})(window);
