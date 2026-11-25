/**
 * GeoMetrics — TUTOR (cabeza animada) en los simuladores 3D.
 *
 * En la esquina inferior izquierda de cada laboratorio 3D aparece la cabeza de un estudiante con gafas de
 * seguridad que explica el paso a paso: cuando el ensayo cambia de etapa, «habla» (mueve la boca mientras el texto
 * se escribe) y su globo cuenta qué se hace, para qué y cómo hacerlo en la vida real (tomado de la guía detallada
 * de js/sim-guia-*.js cuando existe). Tiene voz opcional (síntesis del navegador) y se puede ocultar.
 * No modifica las máquinas: se instala envolviendo GeoLab3D.mount(). Cargar después de lab3d-pro.js.
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D;
    if (!L3 || !L3.mount || L3.__tutor) return;
    L3.__tutor = true;
    var doc = document;
    var VOZ = { on: false, vol: 0.9 }, silenciadoAMano = false;
    try { var vg = parseFloat(localStorage.getItem('tt-vol')); if (isFinite(vg)) VOZ.vol = Math.max(0, Math.min(1, vg)); } catch (e) { }   /* volumen elegido por el estudiante */   /* voz desactivada por defecto (se activa con el botón 🔈 y se recuerda) */
    try { VOZ.on = localStorage.getItem('tt-voz-on') === '1'; } catch (e) { }

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    /* ---------- los dos tutores: el estudiante elige con quién aprender (se recuerda en el navegador) ---------- */
    var TUTORES = {
        hombre: { ico: '👨‍🔬', titulo: 'Rafael · tu compañero de laboratorio', nombre: 'Rafael' },
        mujer: { ico: '👩‍🔬', titulo: 'Elisa · tu compañera de laboratorio', nombre: 'Elisa' }
    };
    /* para qué sirve cada ensayo (presentación escrita al entrar al simulador) */
    var PARA = {
        corte: 'Sirve para obtener la cohesión y el ángulo de fricción del suelo, base del diseño de taludes y cimentaciones.',
        inconfinada: 'Sirve para conocer rápido la resistencia de las arcillas y qué tan firme es el suelo.',
        consolidacion: 'Sirve para calcular cuánto y en cuánto tiempo se asentará una estructura sobre arcilla.',
        triaxial: 'Sirve para medir la resistencia del suelo en condiciones parecidas a las reales bajo tierra.',
        humedad: 'Sirve para saber cuánta agua tiene el suelo, un dato que usan casi todos los demás ensayos.',
        granulometria: 'Sirve para conocer los tamaños de las partículas y clasificar el suelo.',
        limites: 'Sirve para medir la plasticidad de los suelos finos y clasificar limos y arcillas.',
        gravedad: 'Sirve para calcular la relación de vacíos, la porosidad y la saturación del suelo.',
        compactacion: 'Sirve para hallar la humedad óptima y la densidad máxima con que se compactan vías y rellenos.',
        densidad: 'Sirve para comprobar en obra si una capa quedó bien compactada.',
        clasificacion: 'Sirve para darle al suelo un nombre y un símbolo que anticipan su comportamiento.',
        permeabilidad: 'Sirve para saber qué tan rápido deja pasar el agua un suelo granular.',
        traccion: 'Sirve para obtener la elasticidad, la fluencia y la resistencia de materiales como el acero.',
        compresion: 'Sirve para conocer la resistencia a compresión con que se diseñan columnas y muros.',
        flexion: 'Sirve para obtener el módulo de ruptura, clave en pavimentos de concreto.',
        torsion: 'Sirve para medir cómo resiste un material cuando se tuerce, como en ejes y barras.',
        dureza: 'Sirve para medir rápido la dureza de un metal sin destruir la pieza.',
        dm_rev: 'Sirve para controlar en obra la manejabilidad del concreto fresco.',
        dm_comp: 'Sirve para verificar que el concreto alcanzó la resistencia de diseño.',
        dm_aci: 'Sirve para calcular cuánto cemento, agua, arena y grava lleva un metro cúbico de concreto.',
        dm_agg: 'Sirve para encontrar la mezcla de arena y grava con menos vacíos.',
        dm_gran: 'Sirve para calcular el módulo de finura y saber si el agregado sirve para concreto.',
        dm_punit: 'Sirve para conocer los vacíos del agregado, un dato del diseño de mezclas.',
        dm_hum: 'Sirve para corregir el agua de la mezcla según la humedad de los agregados.',
        dm_fresco: 'Sirve para comprobar el rendimiento y el aire del concreto antes de vaciarlo.',
        est_viga: 'Sirve para ver cómo cambian reacciones, momento y flecha según el tipo de apoyo de cada extremo.',
        est_voladizo: 'Sirve para entender por qué los balcones y aleros tienen el momento máximo en el empotramiento.',
        est_cercha: 'Sirve para ver qué barras de una cercha trabajan a tracción y cuáles a compresión.',
        est_portico: 'Sirve para repartir una carga de viento o sismo entre las columnas y estimar la deriva.',
        est_continuas: 'Sirve para ver cómo la continuidad sobre el apoyo central reduce los momentos de las luces.'
    };
    var TUTOR = null;
    try { TUTOR = localStorage.getItem('tt-tutor'); } catch (e) { }
    if (!TUTORES[TUTOR]) TUTOR = null;
    function elegirTutor(t) {
        if (!TUTORES[t]) return;
        TUTOR = t; VOZ_ELEGIDA = null;
        try { localStorage.setItem('tt-tutor', t); } catch (e) { }
        try { doc.dispatchEvent(new CustomEvent('tt-tutor', { detail: t })); } catch (e) { }
    }

    /* cabezas: la tutora con cabello largo y el tutor con cabello corto y barba; ambos con gafas y bata */
    function caraSvg(t) {
        var hombre = t === 'hombre';
        return '<svg viewBox="0 0 120 120" aria-hidden="true">' +
            '<defs><radialGradient id="ttPiel' + t + '" cx="45%" cy="40%" r="65%"><stop offset="0" stop-color="' + (hombre ? '#d9a77c' : '#e3b48a') + '"/><stop offset="1" stop-color="' + (hombre ? '#b27b50' : '#c08a5e') + '"/></radialGradient></defs>' +
            '<circle cx="60" cy="60" r="58" fill="#0b1220" stroke="var(--lab-accent,#22d3ee)" stroke-width="3"/>' +
            (hombre ? '' : '<path d="M29 50c-5 22-2 40 6 50h50c8-10 11-28 6-50z" fill="#2a1d16"/>') +          /* cabello largo */
            '<path d="M22 120c4-22 20-32 38-32s34 10 38 32z" fill="#f4f6f8"/>' +                                   /* bata */
            '<path d="M52 92l8 12 8-12" fill="none" stroke="#cbd5e1" stroke-width="2"/>' +
            '<rect x="70" y="100" width="12" height="9" rx="2" fill="var(--lab-accent,#22d3ee)"/>' +                  /* carné */
            '<rect x="53" y="78" width="14" height="14" rx="4" fill="' + (hombre ? '#c08c62' : '#c99a72') + '"/>' +    /* cuello */
            '<ellipse cx="32" cy="58" rx="5" ry="8" fill="#c08a5e"/><ellipse cx="88" cy="58" rx="5" ry="8" fill="#c08a5e"/>' +
            '<ellipse cx="60" cy="56" rx="28" ry="32" fill="url(#ttPiel' + t + ')"/>' +
            (hombre
                ? '<path d="M32 48c0-20 12-29 28-29s28 9 28 27c-4-6-9-9-15-9-9 4-24 5-41 11z" fill="#1f1611"/>' +       /* cabello corto */
                  '<path d="M33 62c2 18 13 26 27 26s25-8 27-26c-3 8-8 12-12 13-4-4-9-5-15-5s-11 1-15 5c-4-1-9-5-12-13z" fill="#1f1611" opacity=".85"/>'   /* barba */
                : '<path d="M31 50c0-22 14-32 29-32s30 10 30 30c-6-8-14-12-22-12-6 6-18 9-37 14z" fill="#2a1d16"/>') +
            '<g class="tt-ojos"><ellipse cx="49" cy="55" rx="3.6" ry="4.2" fill="#1f2937"/><ellipse cx="71" cy="55" rx="3.6" ry="4.2" fill="#1f2937"/></g>' +
            '<rect x="36" y="47" width="48" height="15" rx="6" fill="rgba(155,231,255,.35)" stroke="#1f2937" stroke-width="2.2"/>' +   /* gafas */
            '<path d="M60 49v11" stroke="#1f2937" stroke-width="2"/>' +
            '<path d="M44 44q5-3 10 0M66 44q5-3 10 0" fill="none" stroke="#2a1d16" stroke-width="' + (hombre ? '3.2' : '2.4') + '" stroke-linecap="round"/>' +
            '<path d="M58 62q2 6 4 0" fill="none" stroke="#9a6a48" stroke-width="1.6"/>' +
            '<ellipse class="tt-boca" cx="60" cy="74" rx="7" ry="2.2" fill="' + (hombre ? '#5b2626' : '#7a2f2f') + '"/>' +
            '</svg>';
    }

    var baseMount = L3.mount;
    L3.mount = function (host, tipo) {
        var handle = baseMount.apply(this, arguments);
        if (handle && handle.instance && L3.meta[tipo]) {
            var inst = handle.instance, t0 = performance.now();
            (function esperar() {
                if (inst.disposed) return;
                if (inst.ready) { try { instalar(inst, host, tipo); } catch (e) { console.warn('Tutor 3D', e); } return; }
                if (performance.now() - t0 < 20000) setTimeout(esperar, 150);
            })();
        }
        return handle;
    };

    /* ---------- voz: se busca la voz en español más natural que tenga el equipo ---------- */
    var VOCES = [], VOZ_ELEGIDA = null;
    function cargarVoces() {
        if (!global.speechSynthesis) return;
        VOCES = speechSynthesis.getVoices().filter(function (v) { return /^es([-_]|$)/i.test(v.lang); });
        VOZ_ELEGIDA = null;
    }
    if (global.speechSynthesis) { cargarVoces(); try { speechSynthesis.addEventListener('voiceschanged', cargarVoces); } catch (e) { speechSynthesis.onvoiceschanged = cargarVoces; } }
    function puntaje(v) {
        var n = v.name, s = 0;
        if (/natural|neural/i.test(n)) s += 100;          /* voces neuronales de Edge / Windows 11 */
        else if (/online/i.test(n)) s += 80;
        else if (/google/i.test(n)) s += 60;               /* voz de Chrome */
        else if (/siri|premium|enhanced|mejorad/i.test(n)) s += 70;   /* Safari / macOS */
        var fem = /salome|dalia|elvira|ximena|paloma|elena|camila|catalina|lupe|paulina|monica|mónica|sabina|helena|laura|marisol|triana|irene|vera|larissa|francisca|valentina|andrea|beatriz|female|mujer/i.test(n);
        var mas = /gonzalo|jorge|pablo|raul|raúl|alvaro|álvaro|dario|darío|tomas|tomás|gerardo|lorenzo|alonso|sergio|emilio|carlos|diego|enrique|andres|andrés|federico|mateo|male|hombre/i.test(n) && !/female/i.test(n);
        if (TUTOR === 'hombre' ? mas : fem) s += 30;   /* voz del mismo género que el tutor elegido */
        else if (TUTOR === 'hombre' ? fem : mas) s -= 30;
        if (/es[-_]co/i.test(v.lang)) s += 12; else if (/es[-_](mx|us|419|ar|cl|pe|ec|ve)/i.test(v.lang)) s += 8; else if (/es[-_]es/i.test(v.lang)) s += 4;
        if (/espeak|desktop/i.test(n)) s -= 40;            /* las más robóticas al final */
        return s;
    }
    function mejorVoz() {
        if (VOZ_ELEGIDA) return VOZ_ELEGIDA;
        if (!VOCES.length) cargarVoces();
        VOZ_ELEGIDA = VOCES.slice().sort(function (a, b) { return puntaje(b) - puntaje(a); })[0] || null;
        return VOZ_ELEGIDA;
    }
    /* símbolos y abreviaturas leídos como lo diría una persona */
    function paraVoz(t) {
        return String(t)
            .replace(/([A-Za-z])_([A-Za-z0-9]+)/g, '$1 $2')          /* R_A → «R A», M_B → «M B» */
            .replace(/\by\/o\b/g, 'o')
            .replace(/\s*\/\s*min\b/g, ' por minuto').replace(/\s*\/\s*s\b/g, ' por segundo').replace(/\s*\/\s*h\b/g, ' por hora').replace(/\s*\/\s*cm\b/g, ' por centímetro').replace(/\s*\/\s*m\b/g, ' por metro').replace(/N\.?\s*[º°]\s*/g, 'número ')
            .replace(/\b(\d)\.?\s*[ªº]/g, function (_, n) { return ['', 'primera', 'segunda', 'tercera', 'cuarta', 'quinta', 'sexta', 'séptima', 'octava', 'novena'][+n] || n; })
            .replace(/\b(1|3|5|7)\/(2|4|8|16)\b/g, function (_, a, b) { return ({ '1': 'un', '3': 'tres', '5': 'cinco', '7': 'siete' })[a] + ' ' + ({ '2': 'medio', '4': 'cuarto', '8': 'octavo', '16': 'dieciseisavo' })[b] + (a === '1' ? '' : 's'); })
            .replace(/(\d)\s*[–—]\s*(\d)/g, '$1 a $2').replace(/kN\s*\/\s*m³/g, ' kilonewtons por metro cúbico').replace(/kg\s*\/\s*m³/g, ' kilos por metro cúbico').replace(/g\s*\/\s*cm³/g, ' gramos por centímetro cúbico')
            .replace(/cm²/g, ' centímetros cuadrados').replace(/mm²/g, ' milímetros cuadrados').replace(/m²/g, ' metros cuadrados').replace(/cm³/g, ' centímetros cúbicos').replace(/m³/g, ' metros cúbicos')
            .replace(/²/g, ' al cuadrado').replace(/³/g, ' al cubo').replace(/√/g, ' raíz de ')
            .replace(/[₀₁₂₃₄₅₆₇₈₉]+/g, function (s) { return ' ' + s.split('').map(function (c) { return '₀₁₂₃₄₅₆₇₈₉'.indexOf(c); }).join(''); })
            .replace(/\s*°\s*C\b/g, ' grados').replace(/\bN\s*[º°]\s*/g, 'número ').replace(/(\d)\s*[ºª]/g, '$1').replace(/(\d)\s*°(?!C)/g, '$1 grados').replace(/°/g, ' grados ')
            .replace(/(\d)\s*½/g, '$1 y medio').replace(/½/g, ' medio').replace(/~\s*/g, 'aproximadamente ').replace(/Σ/g, ' la suma de ').replace(/[\[\]]/g, '')
            .replace(/([σετφγδ])\s*[′']/g, '$1 prima ').replace(/(\w)′/g, '$1 prima').replace(/(\w)'/g, '$1 prima').replace(/\s*\/\s*/g, ' sobre ').replace(/\s[−-]\s/g, ' menos ').replace(/−/g, ' menos ').replace(/\s*\+\s*/g, ' más ').replace(/\s*×\s*/g, ' por ')
            .replace(/→/g, ', luego ').replace(/[≠]/g, ' diferente de ').replace(/[<]/g, ' menor que ').replace(/[>]/g, ' mayor que ')
            .replace(/δ/g, ' delta ').replace(/ρ/g, ' ro ').replace(/μ/g, ' mu ').replace(/ν/g, ' nu ').replace(/θ/g, ' teta ').replace(/α/g, ' alfa ').replace(/β/g, ' beta ').replace(/π/g, ' pi ').replace(/ω/g, ' omega ').replace(/λ/g, ' lambda ').replace(/η/g, ' eta ')
            .replace(/σ/g, ' sigma ').replace(/ε/g, ' épsilon ').replace(/τ/g, ' tau ').replace(/φ/g, ' fi ').replace(/γ/g, ' gamma ').replace(/Δ/g, ' delta ')
            .replace(/\s+·\s+/g, ', ').replace(/\s*·\s*/g, ' por ').replace(/\s*=\s*/g, ' igual a ').replace(/\s*≈\s*/g, ' aproximadamente ').replace(/\s*±\s*/g, ' más o menos ')
            .replace(/≥/g, ' mayor o igual a ').replace(/≤/g, ' menor o igual a ').replace(/°C/g, ' grados ').replace(/%/g, ' por ciento')
            .replace(/(\d)\s*kN\b/g, '$1 kilonewtons').replace(/(\d)\s*MPa\b/g, '$1 megapascales').replace(/(\d)\s*kPa\b/g, '$1 kilopascales')
            .replace(/(\d)\s*mm\b/g, '$1 milímetros').replace(/(\d)\s*cm\b/g, '$1 centímetros').replace(/(\d)\s*kg\b/g, '$1 kilos').replace(/(\d)\s*g\b/g, '$1 gramos')
            .replace(/(\d)\s*h\b/g, '$1 horas').replace(/(\d)\s*min\b/g, '$1 minutos').replace(/(\d)\s*s\b/g, '$1 segundos')
            .replace(/(\d)\.(\d)/g, '$1 punto $2')
            .replace(/[«»"()]/g, '').replace(/\s*[—–]\s*/g, ', ').replace(/\s+/g, ' ')
            .replace(/\s+([.,;:!?])/g, '$1').replace(/([.,;:])\1+/g, '$1').replace(/,\s*\./g, '.').trim();
    }
    function oraciones(t) {
        t = String(t || '').trim(); if (!t) return [];
        return t.split(/(?<=[.!?…])\s+(?=[A-ZÁÉÍÓÚÑ¿¡«0-9σε])/).map(function (s) { return s.trim(); }).filter(Boolean);
    }

    /* texto que explica una etapa: la etapa de la máquina + la ficha de la guía detallada si existe */
    function explicacion(tipo, phases, i) {
        var ph = phases[i] || {}, G = global.GeoGuia, f = null;
        if (G && G.data && G.match) {
            var g = G.data[tipo] || G.data[{ rev: 'dm_rev', comp: 'dm_comp', aci: 'dm_aci', agg: 'dm_agg' }[tipo]];
            if (g) f = g.f[G.match(tipo, ph.t, i, phases.length)];
        }
        var partes = [];
        if (ph.d) partes.push(ph.d);
        else if (f && f.p) partes.push(f.p);
        var pasos = f && f.h ? f.h.slice(0, 4) : [];
        return { t: ph.t || '', texto: partes.join(' '), pasos: pasos, ojo: f && f.o ? f.o : '' };
    }

    /* lo que dice el tutor en una etapa, partido en fragmentos cortos que se avanzan con «Siguiente» */
    function fragmentar(e) {
        var out = [], buf = '';
        oraciones(e.texto).forEach(function (o) {
            if (buf && (buf + ' ' + o).length > 170) { out.push({ x: buf, tag: '' }); buf = o; }
            else buf = buf ? buf + ' ' + o : o;
        });
        if (buf) out.push({ x: buf, tag: '' });
        e.pasos.forEach(function (h, j) { out.push({ x: h, tag: '🧪 En el laboratorio real · ' + (j + 1) + '/' + e.pasos.length }); });
        if (e.ojo) out.push({ x: e.ojo, tag: '⚠️ Ojo con esto', ojo: true });
        if (!out.length) out.push({ x: 'Observa lo que ocurre en la máquina y pasa a la siguiente etapa cuando estés listo.', tag: '' });
        return out;
    }

    /* ---------- audios grabados: audio/tutor/<tipo>/e<etapa>-<parte>.mp3 (si no existen, se usa la voz del navegador) ---------- */
    var AUDIO_DIR = 'audio/tutor/', FALTA = {}, PRECARGA = {}, sonando = null;
    /* audio/tutor/<hombre|mujer>/<ensayo>/e<etapa>-<parte>.mp3 */
    function archivoAudio(tipo, fase, parte, voz) { return AUDIO_DIR + (voz || TUTOR || 'mujer') + '/' + tipo + '/e' + (fase + 1) + '-' + (parte + 1) + '.mp3'; }
    /* frases de una etapa: primero el guion escrito (js/tutor-guion.js); si no existe, se arman desde la guía */
    function etapa(tipo, phases, i) {
        var G = global.GeoTutorGuion, g = G && G[tipo] && G[tipo][i], t = (phases[i] || {}).t || '';
        if (g && g.length) return { t: t, frags: g.map(function (x) {
            var ojo = /^ojo\b/i.test(x);
            return { x: x, tag: ojo ? '⚠️ Ojo con esto' : '', ojo: ojo, propio: true };
        }) };
        var e = explicacion(tipo, phases, i);
        return { t: e.t, frags: fragmentar(e) };
    }
    function textoHablado(titulo, f, parte) {
        if (f.propio) return paraVoz(f.x);
        var x = f.ojo ? 'Ojo, un error común es: ' + f.x.charAt(0).toLowerCase() + f.x.slice(1) : f.x;
        return paraVoz((parte === 0 && titulo ? titulo + '. ' : '') + x);
    }
    /* guion completo de un simulador (para grabar los audios) */
    function guion(tipo) {
        var meta = L3.meta[tipo]; if (!meta) return null;
        var phases = meta.phases || [];
        return phases.map(function (ph, i) {
            var e = etapa(tipo, phases, i);
            return { etapa: i + 1, titulo: e.t, partes: e.frags.map(function (f, j) {
                return { archivo: archivoAudio(tipo, i, j), etiqueta: f.tag, texto: f.x, hablado: textoHablado(e.t, f, j) };
            }) };
        });
    }
    global.GeoTutor = { guion: guion, audioDir: AUDIO_DIR };

    function instalar(inst, host, tipo) {
        var meta = L3.meta[tipo], lab = host.querySelector('.lab3d'), stage = host.querySelector('.lab3d-stage');
        if (!lab || !stage || lab.__tutor) return; lab.__tutor = true;
        var phases = meta.phases || [];
        var box = doc.createElement('div'); box.className = 'tt-tutor';
        box.innerHTML = '<div class="tt-cara">' + caraSvg(TUTOR || 'mujer') + '</div>' +
            '<div class="tt-globo" aria-live="polite"><div class="tt-cab"><b class="tt-quien"></b>' +
              '<button type="button" class="tt-voz" title="Activar o silenciar la voz">🔈</button><input type="range" class="tt-vol" min="0" max="100" step="5" aria-label="Volumen de la voz del tutor" title="Volumen de la voz"><button type="button" class="tt-cfg" title="Cambiar de tutor">⇄</button><button type="button" class="tt-min" title="Minimizar">–</button></div>' +
              '<div class="tt-elegir" hidden><p>¿Con quién quieres aprender?</p><div class="tt-opc">' +
                '<button type="button" data-t="mujer">' + caraSvg('mujer') + '<span>Elisa</span><small>Tutora</small></button>' +
                '<button type="button" data-t="hombre">' + caraSvg('hombre') + '<span>Rafael</span><small>Tutor</small></button></div></div>' +
              '<em class="tt-n"></em><strong class="tt-t"></strong><span class="tt-tag"></span><p class="tt-x"></p>' +
              '<p class="tt-espera-msg" hidden>⏸ El ensayo espera a que el tutor termine de explicar esta etapa (o pulsa «Siguiente etapa»).</p>' +
              '<div class="tt-pie"><span class="tt-puntos"></span><button type="button" class="tt-ant" title="Anterior">‹</button>' +
              '<button type="button" class="tt-sig">Siguiente ›</button></div></div>';
        stage.appendChild(box);
        var cara = box.querySelector('.tt-cara'), globo = box.querySelector('.tt-globo');
        var btnVoz = box.querySelector('.tt-voz');
        function pintarVoz() { btnVoz.textContent = !VOZ.on ? '🔈' : (VOZ.vol <= 0 ? '🔇' : (VOZ.vol < 0.5 ? '🔉' : '🔊')); btnVoz.setAttribute('aria-pressed', String(VOZ.on)); }
        pintarVoz();
        btnVoz.addEventListener('click', function () { VOZ.on = !VOZ.on; silenciadoAMano = !VOZ.on; pintarVoz(); try { localStorage.setItem('tt-voz-on', VOZ.on ? '1' : '0'); } catch (e) { } if (!VOZ.on) callar(); else hablar(); });
        /* volumen de la voz: se aplica al instante al audio que suena y se recuerda para la próxima vez */
        var volEl = box.querySelector('.tt-vol');
        function pintarVol() { volEl.value = Math.round(VOZ.vol * 100); volEl.title = 'Volumen de la voz: ' + Math.round(VOZ.vol * 100) + ' %'; btnVoz.textContent = !VOZ.on ? '🔈' : (VOZ.vol <= 0 ? '🔇' : (VOZ.vol < 0.5 ? '🔉' : '🔊')); }
        pintarVol();
        volEl.addEventListener('input', function () {
            VOZ.vol = Math.max(0, Math.min(1, parseInt(volEl.value, 10) / 100));
            try { localStorage.setItem('tt-vol', String(VOZ.vol)); } catch (e) { }
            if (sonando) sonando.volume = VOZ.vol;
            pintarVol();
        });
        btnVoz.addEventListener('click', pintarVol);
        box.querySelector('.tt-min').addEventListener('click', function () { box.classList.toggle('tt-cerrado'); });
        cara.addEventListener('click', function () { box.classList.toggle('tt-cerrado'); });

        /* casilla para ocultar al tutor, junto a «Etiquetas» */
        var ctrls = host.querySelector('.lab3d-controls');
        if (ctrls && !ctrls.querySelector('.tt-tgl')) {
            var tgl = doc.createElement('label'); tgl.className = 'lab3d-toggle tt-tgl'; tgl.innerHTML = '<input type="checkbox" checked><span>Tutor</span>';
            ctrls.appendChild(tgl);
            tgl.querySelector('input').addEventListener('change', function () { box.hidden = !this.checked; if (!this.checked) callar(); });
        }
        var tglInput = ctrls && ctrls.querySelector('.tt-tgl input');

        var fase = -1, ultimo = '', tEsc = 0, frags = [], fi = 0, titulo = '';
        var arrancado = false;   /* el tutor habla solo después de pulsar «Iniciar ensayo» */
        var btnSig = box.querySelector('.tt-sig'), btnAnt = box.querySelector('.tt-ant');
        function callar() {
            if (sonando) { try { sonando.pause(); } catch (e) { } sonando = null; }
            if (global.speechSynthesis) speechSynthesis.cancel();
        }
        /* primero intenta el audio grabado de esta parte; si no existe, usa la voz del navegador */
        function hablar() {
            callar();
            if (!VOZ.on || !frags[fi] || !TUTOR || !arrancado || frags[fi].pres) return;   /* en silencio hasta «Iniciar ensayo»; la presentación nunca se dice en voz alta */
            var src = srcDe(fase, fi), txt = ultimo;
            if (FALTA[src]) { decir(txt); return; }
            var a = PRECARGA[src] || new Audio(src), yo = fi, fz = fase; delete PRECARGA[src]; sonando = a;
            try { a.currentTime = 0; } catch (e) { }
            a.volume = VOZ.vol;
            var miTurno = turno;
            a.onplay = function () { cara.classList.add('habla'); if (miTurno === turno) { vozFallo = false; if (!prog.t0) prog.t0 = performance.now(); } };
            a.onpause = function () { cara.classList.remove('habla'); if (sonando === a) sonando = null; };
            a.onended = function () { cara.classList.remove('habla'); if (sonando === a) sonando = null; if (miTurno === turno) marcarFin(); };
            a.onerror = function () { FALTA[src] = true; if (sonando === a && fi === yo && fase === fz) { sonando = null; decir(txt); } };
            if (a.error) { a.onerror(); return; }
            var pr = a.play(); if (pr && pr.catch) pr.catch(function () { });
            precargar(fase, fi + 1);
        }
        /* deja lista la siguiente parte para que suene sin espera al pulsar «Siguiente» */
        function precargar(fz, parte) {
            if (parte >= frags.length) { fz++; parte = 0; }
            if (fz >= phases.length) return;
            var src = srcDe(fz, parte);
            if (FALTA[src] || PRECARGA[src]) return;
            var a = new Audio(); a.preload = 'auto';
            a.onerror = function () { FALTA[src] = true; delete PRECARGA[src]; };
            a.src = src; PRECARGA[src] = a;
        }
        function decir(txt) {
            if (!VOZ.on || !txt || !global.speechSynthesis || !arrancado) return;
            try {
                speechSynthesis.cancel();
                var u = new SpeechSynthesisUtterance(paraVoz(txt)), v = mejorVoz();
                if (v) { u.voice = v; u.lang = v.lang; } else u.lang = 'es-ES';
                /* las voces neuronales ya suenan naturales a velocidad normal; las clásicas se bajan un poco */
                var natural = v && /natural|online|neural|google/i.test(v.name);
                u.rate = natural ? 1 : 0.92; u.pitch = natural ? 1 : 1.08; u.volume = VOZ.vol;
                var miTurno = turno, dicho = paraVoz(txt).length, t0 = performance.now();
                u.onstart = function () {
                    cara.classList.add('habla');
                    if (miTurno === turno) { prog.t0 = performance.now(); prog.est = dicho * 68 / (u.rate || 1); }
                };
                /* el texto escrito sigue a la voz palabra por palabra (si el navegador lo informa) */
                u.onboundary = function (ev) {
                    if (miTurno !== turno || !ev || ev.charIndex == null) return;
                    prog.bnd = Math.min(1, (ev.charIndex + (ev.charLength || 0)) / dicho);
                };
                /* Chrome a veces avisa «terminó» apenas empieza (o tras cancelar la frase anterior): solo cuenta un final
                   real, cuando ya pasó al menos el tiempo mínimo para decir la frase; si no, se usa el tiempo de lectura */
                u.onend = function () {
                    cara.classList.remove('habla');
                    if (miTurno !== turno) return;
                    if (performance.now() - t0 >= dicho * 45) marcarFin(); else vozFallo = true;
                };
                u.onerror = function (ev) {
                    cara.classList.remove('habla');
                    if (miTurno !== turno) return;
                    if (ev && /interrupted|canceled/.test(ev.error || '')) {
                        /* se cortó al arrancar: se vuelve a intentar una vez */
                        if (!u.__reintento) { u.__reintento = true; setTimeout(function () { if (miTurno === turno && VOZ.on) { try { speechSynthesis.speak(u); } catch (e) { vozFallo = true; } } }, 120); return; }
                    }
                    vozFallo = true;
                };
                speechSynthesis.speak(u);
            } catch (e) { }
        }
        /* ---- cuándo terminó de «decir» la parte actual: fin del audio o de la voz; sin voz, un tiempo de lectura ---- */
        var turno = 0, finFrag = false, tFin = 0, tLectura = 0, tInicio = 0, jugaba = false, vozFallo = false;
        function marcarFin() { finFrag = true; tFin = performance.now(); }
        var prog = { t0: 0, est: 0, bnd: -1 };
        /* qué fracción de la frase ya se dijo (0 a 1) */
        function fraccion() {
            var ahora = performance.now(), f = frags[fi]; if (!f) return 1;
            var lectura = (ahora - tInicio) / Math.max(1200, f.x.length * 36);
            if (finFrag) return 1;
            if (vozFallo && VOZ.on) return Math.min(1, (ahora - tInicio - 3500) / Math.max(1200, f.x.length * 36));
            /* el audio no arrancó (el navegador lo bloqueó): se sigue a ritmo de lectura */
            if (VOZ.on && sonando && sonando.paused && !sonando.currentTime && ahora - tInicio > 3500) vozFallo = true;
            if (VOZ.on && TUTOR && !vozFallo) {
                if (sonando) {
                    /* audio grabado: el texto va un poco DETRÁS del audio, nunca adelante */
                    if (sonando.duration > 0 && isFinite(sonando.duration)) return Math.max(0, Math.min(1, sonando.currentTime / sonando.duration - 0.04));
                    /* aún no se sabe cuánto dura: ritmo de una persona hablando (~13 letras por segundo) desde que empezó a sonar */
                    return prog.t0 ? Math.min(0.9, (ahora - prog.t0) / (f.x.length * 78)) : 0;
                }
                if (prog.bnd >= 0) return Math.min(1, prog.bnd + 0.02);
                if (prog.t0 && prog.est) return Math.min(0.97, (ahora - prog.t0) / prog.est);
                if (ahora - tInicio < 1800) return 0;                         /* esperando que empiece a hablar */
                return Math.min(1, (ahora - tInicio - 1800) / Math.max(1200, f.x.length * 36));   /* la voz no arrancó */
            }
            return Math.min(1, lectura);
        }
        function fragListo() {
            var ahora = performance.now();
            /* nunca se corta a alguien hablando: mientras suene el audio o la voz, se espera (con un tope de seguridad) */
            var suena = (sonando && !sonando.paused && !sonando.ended) || (VOZ.on && global.speechSynthesis && speechSynthesis.speaking);
            if (suena && ahora - tInicio < (tLectura - tInicio) * 3) return false;
            if (VOZ.on && sonando && sonando.paused && !sonando.currentTime && ahora - tInicio > 3500) vozFallo = true;
            if (VOZ.on && TUTOR && !vozFallo) {
                if (finFrag) return ahora - tFin > 600;                       /* respiro corto después de hablar */
                return ahora - tInicio > (tLectura - tInicio) * 2.5;            /* por si el navegador no avisa el final */
            }
            return ahora >= tLectura + (vozFallo && VOZ.on ? 3500 : 0);
        }
        function verFrag() {
            var f = frags[fi], p = box.querySelector('.tt-x'), tag = box.querySelector('.tt-tag'), k = 0;
            if (f.pres) f.x = textoPresentacion();             /* por si el estudiante acaba de elegir tutor */
            /* tiempo de lectura (sin voz o si la voz falla): lo que tarda en escribirse más ~14 letras por segundo */
            turno++; finFrag = false; vozFallo = false; tInicio = performance.now(); tLectura = tInicio + Math.max(3500, f.x.length * 85);
            tag.textContent = f.tag; tag.hidden = !f.tag; tag.classList.toggle('tt-tag-ojo', !!f.ojo);
            p.classList.toggle('tt-x-ojo', !!f.ojo);
            box.querySelector('.tt-puntos').innerHTML = frags.map(function (_, j) { return '<i class="' + (j === fi ? 'on' : j < fi ? 'ya' : '') + '"></i>'; }).join('');
            btnAnt.disabled = fi === 0;
            rotular();
            pintarBoton();
            /* el texto se escribe AL RITMO DE LA VOZ: avance del audio grabado, palabras que va diciendo la voz del
               navegador o, sin voz, a ritmo de lectura (~28 letras por segundo) */
            prog = { t0: 0, est: 0, bnd: -1 };
            clearInterval(tEsc); p.textContent = ''; cara.classList.add('habla');
            var miT = turno;
            tEsc = setInterval(function () {
                if (miT !== turno) { clearInterval(tEsc); return; }
                var fr = fraccion(), n = Math.min(f.x.length, Math.ceil(fr * f.x.length));
                if (fr < 1 && n > 0) { var sp = f.x.lastIndexOf(' ', n); n = sp < 0 ? 0 : sp; }   /* solo palabras ya dichas */
                if (p.textContent.length !== n) p.textContent = f.x.slice(0, n);
                if (n >= f.x.length) {
                    clearInterval(tEsc);
                    if (!VOZ.on || !(sonando || (global.speechSynthesis && speechSynthesis.speaking))) cara.classList.remove('habla');
                }
            }, 60);
            globo.scrollTop = 0;
            ultimo = textoHablado(titulo, f, fi);   /* lo mismo que dice el guion de los audios */
            hablar();
        }
        /* ---- el ensayo no pasa de etapa hasta que el tutor termina de explicarla ---- */
        var leidaHasta = -1, activo = true, esperando = false;
        var btnPlay = host.querySelector('.lab3d-play');
        /* al pulsar «Iniciar ensayo» el tutor empieza a hablar solo (salvo que el estudiante lo haya silenciado con 🔈) */
        if (btnPlay) btnPlay.addEventListener('click', function (e) {
            if (!e.isTrusted || !inst.playing || silenciadoAMano || !TUTOR || !activo) return;
            var empezando = (inst.p || 0) < 0.02 && fase === 0;
            arrancado = true;
            if (!VOZ.on) { VOZ.on = true; pintarVoz(); }
            if (empezando) { fi = nIntro; verFrag(); }       /* salta la presentación: etapa 1 desde la primera parte, ya con voz */
            else if (!sonando && !(global.speechSynthesis && speechSynthesis.speaking)) hablar();
        });
        function finEtapa(k) { return k + 1 < phases.length ? Math.max(0, phases[k + 1].a - 0.0008) : null; }
        function ponerTope() { inst.tope = activo ? finEtapa(leidaHasta + 1) : null; }
        inst.onTope = function () { esperando = true; pintarBoton(); globo.classList.add('tt-espera'); };
        function pintarBoton() {
            var ult = fi === frags.length - 1, hayMas = fase + 1 < phases.length;
            btnSig.classList.toggle('tt-fin', ult && !(activo && hayMas));
            btnSig.textContent = !ult ? 'Siguiente ›' : (activo && hayMas) ? 'Siguiente etapa ▶' : '↻ Repetir';
            box.querySelector('.tt-espera-msg').hidden = !(esperando && activo);
        }
        function siguienteEtapa() {
            leidaHasta = Math.max(leidaHasta, fase); esperando = false; globo.classList.remove('tt-espera');
            ponerTope();
            /* si el ensayo estaba detenido esperando (o aún no empieza) lo reanuda */
            if (!inst.playing && inst.p < 0.999 && btnPlay) btnPlay.click();
            pintarBoton();
        }
        btnSig.addEventListener('click', function () {
            if (fi < frags.length - 1) { fi++; verFrag(); return; }
            if (activo && fase + 1 < phases.length) siguienteEtapa();
            else { fi = 0; verFrag(); }
        });
        btnAnt.addEventListener('click', function () { if (fi > 0) { fi--; verFrag(); } });
        /* ---- presentación del ensayo: al abrir el simulador, antes de la etapa 1 (una sola vez) ---- */
        var yaIntro = false, nIntro = 0, tituloEtapa = '';
        /* presentación ESCRITA y en silencio: «Hola, soy Elisa…», el ensayo, su norma y para qué sirve */
        function textoPresentacion() {
            var t = TUTORES[TUTOR] || null, norma = (L3.meta[tipo] && L3.meta[tipo].norma) || '';
            return (t ? '¡Hola! Soy ' + t.nombre + '. ' : '¡Hola! ') + (/^est_/.test(tipo) ? 'Este es el modelo de ' : 'Este es el ensayo de ') + nombreEnsayo.charAt(0).toLowerCase() + nombreEnsayo.slice(1) +
                (norma ? ' (' + norma + ')' : '') + '. ' + (PARA[tipo] || '') + ' Pulsa «Iniciar ensayo» y te lo explico paso a paso.';
        }
        var GGm = global.GeoGuia && global.GeoGuia.data && (global.GeoGuia.data[tipo] || global.GeoGuia.data[{ dm_rev: 'rev', dm_comp: 'comp', dm_aci: 'aci', dm_agg: 'agg' }[tipo]]);
        var nombreEnsayo = (GGm && GGm.meta && GGm.meta.n) || (L3.meta[tipo] && L3.meta[tipo].machine) || '';
        function mostrar(i) {
            var e = etapa(tipo, phases, i);
            tituloEtapa = e.t; titulo = e.t;
            frags = e.frags; nIntro = 0;
            if (i === 0 && !yaIntro && !arrancado) {
                yaIntro = true; nIntro = 1;
                frags = [{ x: textoPresentacion(), tag: '🎓 Presentación del ensayo', propio: true, intro: 0, pres: true }].concat(frags);
            }
            fi = 0; esperando = false; globo.classList.remove('tt-espera'); verFrag();
        }
        /* encabezado del dock: «Presentación» durante la bienvenida, «Paso i de n» en las etapas */
        function rotular() {
            var f = frags[fi] || {}, enIntro = f.intro != null;
            box.querySelector('.tt-n').textContent = enIntro ? 'Presentación del ensayo' : 'Paso ' + (fase + 1) + ' de ' + phases.length;
            box.querySelector('.tt-t').textContent = enIntro ? nombreEnsayo : tituloEtapa;
        }
        /* archivo de audio de cualquier parte: presentación (intro-n) o etapa (e<etapa>-<parte>) */
        function srcDe(fz, k) {
            var f = fz === fase ? frags[k] : null;
            if (f && f.intro != null) return AUDIO_DIR + (TUTOR || 'mujer') + '/' + tipo + '/intro-' + (f.intro + 1) + '.mp3';
            return archivoAudio(tipo, fz, fz === fase ? k - nIntro : k);
        }
        function revisar() {
            if (!host.isConnected || inst.disposed) { clearInterval(tRev); clearInterval(tEsc); doc.removeEventListener('tt-tutor', alCambiar); return; }
            var p = inst.p || 0, k = 0;
            for (var i = 0; i < phases.length; i++) if (p >= phases[i].a) k = i;
            if (k !== fase) {
                if (k < fase || p <= 0.001) leidaHasta = Math.min(leidaHasta, k - 1);   /* se reinició o se devolvió */
                else if (k > fase) leidaHasta = Math.max(leidaHasta, k - 1);           /* saltó adelante con los pasos numerados */
                fase = k; ponerTope(); mostrar(k);
            }
            /* con el ensayo en marcha, el tutor avanza solo; al terminar de explicar la etapa, el ensayo puede seguir */
            /* al pulsar «Iniciar ensayo» desde cero, el tutor empieza a explicar desde la primera parte */
            /* con el ensayo en marcha la presentación ya no se muestra: pasa a la etapa 1 */
            if (inst.playing && fase === 0 && fi < nIntro) { fi = nIntro; verFrag(); }
            if (inst.playing && !jugaba && (inst.p || 0) < 0.02 && fase === 0 && fi >= nIntro && (fi > nIntro || fragListo())) { fi = nIntro; verFrag(); }
            jugaba = inst.playing;
            if (inst.playing) arrancado = true;
            var terminado = (inst.p || 0) >= 0.999;
            if (activo && (inst.playing || esperando || terminado) && frags.length && fragListo()) {
                if (fi < frags.length - 1) { fi++; verFrag(); }
                else if (fase + 1 < phases.length && leidaHasta < fase) {
                    leidaHasta = fase; ponerTope();
                    if (esperando) { esperando = false; globo.classList.remove('tt-espera'); if (!inst.playing && btnPlay) btnPlay.click(); }
                    pintarBoton();
                }
            }
        }
        if (tglInput) tglInput.addEventListener('change', function () {
            activo = this.checked; if (!activo) { esperando = false; globo.classList.remove('tt-espera'); }
            ponerTope(); pintarBoton();
        });

        /* ---- elegir tutor (hombre o mujer) ---- */
        var panelElegir = box.querySelector('.tt-elegir');
        function pintarTutor() {
            var t = TUTORES[TUTOR || 'mujer'];
            cara.innerHTML = caraSvg(TUTOR || 'mujer');
            box.querySelector('.tt-quien').textContent = t.ico + ' ' + t.titulo;
            var sin = !TUTOR;
            panelElegir.hidden = !sin; globo.classList.toggle('tt-sin-tutor', sin);
        }
        function abrirEleccion() { callar(); panelElegir.hidden = false; globo.classList.add('tt-sin-tutor'); }
        box.querySelector('.tt-cfg').addEventListener('click', function () {
            if (panelElegir.hidden) abrirEleccion(); else if (TUTOR) pintarTutor();
        });
        Array.prototype.forEach.call(panelElegir.querySelectorAll('button[data-t]'), function (b) {
            b.addEventListener('click', function () { elegirTutor(b.getAttribute('data-t')); });
        });
        function alCambiar() { pintarTutor(); if (frags.length) verFrag(); }
        doc.addEventListener('tt-tutor', alCambiar);
        pintarTutor();
        var tRev = setInterval(revisar, 250);
        revisar();
    }

    (function () {
        if (doc.getElementById('tt-css')) return;
        var st = doc.createElement('style'); st.id = 'tt-css';
        st.textContent = [
            '.tt-tutor{position:absolute;left:12px;top:var(--lab-h,520px);transform:translateY(calc(-100% - 12px));z-index:6;display:flex;align-items:flex-end;gap:10px;max-width:min(380px,calc(100% - 24px));pointer-events:none}',
            '.tt-tag{display:block;font-size:10.5px;font-weight:700;letter-spacing:.04em;color:var(--lab-accent,#22d3ee);margin:0 0 2px}.tt-tag[hidden]{display:none}.tt-tag-ojo{color:#fdba74}',
            '.tt-x-ojo{padding:6px 8px;border-radius:8px;background:rgba(251,146,60,.1);border:1px solid rgba(251,146,60,.35);color:#fed7aa}',
            '.tt-pie{display:flex;align-items:center;gap:6px;margin-top:2px}.tt-puntos{flex:1;display:flex;gap:4px;flex-wrap:wrap}',
            '.tt-puntos i{width:6px;height:6px;border-radius:50%;background:#2b3a50}.tt-puntos i.ya{background:#3d6b80}.tt-puntos i.on{background:var(--lab-accent,#22d3ee);transform:scale(1.25)}',
            '.tt-pie button{min-height:0;height:28px;border-radius:8px;border:1px solid #2b3a50;background:#0f1828;color:#dbe4f0;font-size:12.5px;font-weight:700;cursor:pointer;padding:0 10px}',
            '.tt-espera-msg[hidden],.tt-elegir[hidden]{display:none}',
            '.tt-elegir p{margin:2px 0 8px;font-size:13.5px;font-weight:700;color:#fff}',
            '.tt-opc{display:flex;gap:10px}.tt-opc button{flex:1;min-height:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:8px 6px;border-radius:12px;border:1px solid #2b3a50;background:#0f1828;color:#dbe4f0;font-weight:700;font-size:12.5px;cursor:pointer}',
            '.tt-opc button:hover,.tt-opc button:focus-visible{border-color:var(--lab-accent,#22d3ee)}.tt-opc svg{width:64px;height:64px;display:block}.tt-opc small{font-size:10.5px;font-weight:500;color:#9fb0c6}',
            '.tt-globo.tt-sin-tutor .tt-n,.tt-globo.tt-sin-tutor .tt-t,.tt-globo.tt-sin-tutor .tt-tag,.tt-globo.tt-sin-tutor .tt-x,.tt-globo.tt-sin-tutor .tt-pie,.tt-globo.tt-sin-tutor .tt-espera-msg{display:none}',
            '.tt-espera-msg{margin:0 0 6px;font-size:11.5px;color:#fde68a}',
            '.tt-globo.tt-espera .tt-sig:not(.tt-fin){animation:ttPulso 1.2s ease-in-out infinite}',
            '@keyframes ttPulso{0%,100%{box-shadow:0 0 0 0 rgba(34,211,238,.55)}50%{box-shadow:0 0 0 6px rgba(34,211,238,0)}}',
            '.tt-pie .tt-ant{width:28px;padding:0}.tt-pie .tt-ant:disabled{opacity:.35;cursor:default}',
            '.tt-pie .tt-sig{background:var(--lab-accent,#22d3ee);border-color:var(--lab-accent,#22d3ee);color:#06202a}.tt-pie .tt-sig.tt-fin{background:#0f1828;color:var(--lab-accent,#22d3ee)}',
            '.tt-tutor[hidden]{display:none}',
            '.tt-cara{flex:0 0 auto;width:92px;height:92px;pointer-events:auto;cursor:pointer;filter:drop-shadow(0 6px 14px rgba(0,0,0,.45))}',
            '.tt-cara svg{width:100%;height:100%;display:block}',
            '.tt-boca{transform-box:fill-box;transform-origin:center}',
            '.tt-cara.habla .tt-boca{animation:ttHabla .24s ease-in-out infinite alternate}',
            '@keyframes ttHabla{from{transform:scaleY(1)}to{transform:scaleY(3.2)}}',
            '.tt-ojos{transform-box:fill-box;transform-origin:center;animation:ttParpadeo 4.5s infinite}',
            '@keyframes ttParpadeo{0%,94%,100%{transform:scaleY(1)}96%{transform:scaleY(.1)}}',
            '.tt-globo{position:relative;pointer-events:auto;flex:1 1 auto;min-width:0;max-height:calc(var(--lab-h,520px) * .42);overflow:auto;padding:9px 12px 10px;border-radius:14px;background:rgba(9,15,27,.92);border:1px solid var(--lab-accent,#22d3ee);color:#dbe4f0;font-size:12.5px;line-height:1.45;box-shadow:0 10px 28px rgba(0,0,0,.45)}',
            '.tt-globo:before{content:"";position:absolute;left:-7px;bottom:26px;width:12px;height:12px;background:rgba(9,15,27,.92);border-left:1px solid var(--lab-accent,#22d3ee);border-bottom:1px solid var(--lab-accent,#22d3ee);transform:rotate(45deg)}',
            '.tt-cab{display:flex;align-items:center;gap:6px;margin-bottom:4px}.tt-cab b{flex:1;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--lab-accent,#22d3ee)}',
            '.tt-vol{width:74px;height:4px;margin:0 4px;accent-color:var(--lab-accent,#22d3ee);cursor:pointer;vertical-align:middle}.tt-vol[hidden]{display:none}',
            '.tt-cab button{width:26px;height:24px;min-height:0;padding:0;border-radius:7px;border:1px solid #2b3a50;background:#0f1828;color:#dbe4f0;font-size:13px;line-height:1;cursor:pointer}',
            '.tt-n{display:block;font-style:normal;font-size:11px;color:#9fb0c6}.tt-t{display:block;font-size:14px;color:#fff;margin:1px 0 4px}',
            '.tt-x{margin:0 0 6px;min-height:1.4em}.tt-pasos{margin:0 0 4px;padding-left:18px}.tt-pasos li{margin:0 0 3px}.tt-pasos li::marker{color:var(--lab-accent,#22d3ee);font-weight:700}',
            '.tt-ojo{margin:4px 0 0;padding:6px 8px;border-radius:8px;background:rgba(251,146,60,.1);border:1px solid rgba(251,146,60,.35);color:#fed7aa;font-size:12px}',
            '.tt-tutor.tt-cerrado .tt-globo{display:none}',
            '@media (max-width:640px){.tt-cara{width:64px;height:64px}.tt-tutor{max-width:calc(100% - 16px);left:8px}.tt-globo{font-size:11.5px;max-height:calc(var(--lab-h,400px) * .5)}}'
        ].join('\n');
        doc.head.appendChild(st);
    })();
})(window);
