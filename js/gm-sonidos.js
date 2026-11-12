/* =========================================================
   GeoMetrics — Sonidos de la interfaz
   Un sonido característico por TIPO de acción (navegar, pestaña,
   calcular, éxito, error, abrir, cerrar, enviar, respuesta de Civix,
   descargar, iniciar simulador, entregar, eliminar, interruptor).
   · Sintetizados con Web Audio: sin archivos de audio.
   · Un solo escuchador de clics para toda la página: los botones
     nuevos suenan solos, sin tocar su código.
   · Botón 🔊 (abajo a la izquierda) para silenciar y ajustar volumen;
     la preferencia se guarda en el dispositivo.
   · No suena al escribir; arranca después del primer toque (regla de
     los navegadores). Con «reducir movimiento» empieza en silencio.
   window.GeoSonidos.play('exito') para usarlo desde otro código.
   ========================================================= */
(function (global) {
    'use strict';
    var doc = document;
    var K_ON = 'gm_sonido_on', K_VOL = 'gm_sonido_vol';

    function leer(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
    function guardar(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
    var reducido = false;
    try { reducido = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
    var on = leer(K_ON) == null ? !reducido : leer(K_ON) === '1';
    var vol = parseFloat(leer(K_VOL));
    if (!(vol >= 0 && vol <= 1)) vol = 0.5;

    /* ---------- motor ---------- */
    var ctx = null, master = null, ultimo = 0;
    function audio() {
        if (ctx) return ctx;
        var AC = global.AudioContext || global.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = vol * 0.6;
        master.connect(ctx.destination);
        return ctx;
    }
    function tono(o) {
        var c = audio(); if (!c) return;
        var t0 = c.currentTime + (o.delay || 0), dur = o.dur || 0.08;
        var osc = c.createOscillator(), g = c.createGain();
        osc.type = o.type || 'sine';
        osc.frequency.setValueAtTime(o.f, t0);
        if (o.f2) osc.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
        var pk = o.gain == null ? 0.35 : o.gain;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(pk, t0 + Math.min(0.012, dur / 3));
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        var nodo = osc;
        if (o.lp) { var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = o.lp; osc.connect(f); nodo = f; }
        nodo.connect(g); g.connect(master);
        osc.start(t0); osc.stop(t0 + dur + 0.02);
    }
    function ruido(o) {
        var c = audio(); if (!c) return;
        var t0 = c.currentTime + (o.delay || 0), dur = o.dur || 0.16;
        var n = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
        for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
        var src = c.createBufferSource(); src.buffer = buf;
        var f = c.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
        f.frequency.setValueAtTime(o.f, t0); f.frequency.exponentialRampToValueAtTime(o.f2, t0 + dur);
        var g = c.createGain();
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(o.gain || 0.18, t0 + dur * 0.35); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(f); f.connect(g); g.connect(master);
        src.start(t0); src.stop(t0 + dur + 0.02);
    }

    /* ---------- catálogo ---------- */
    var SONIDOS = {
        navegar: function () { tono({ f: 900, f2: 700, dur: 0.05, gain: 0.18 }); },
        pestana: function () { tono({ f: 1350, dur: 0.035, gain: 0.16, type: 'triangle' }); },
        calcular: function () { tono({ f: 523, dur: 0.07, gain: 0.2, type: 'triangle' }); tono({ f: 784, dur: 0.09, gain: 0.2, type: 'triangle', delay: 0.07 }); },
        exito: function () { tono({ f: 1047, dur: 0.16, gain: 0.16 }); tono({ f: 1319, dur: 0.18, gain: 0.14, delay: 0.08 }); tono({ f: 1568, dur: 0.26, gain: 0.12, delay: 0.16 }); },
        error: function () { tono({ f: 220, f2: 150, dur: 0.18, gain: 0.22, type: 'sawtooth', lp: 900 }); },
        abrir: function () { ruido({ f: 500, f2: 2600, dur: 0.16, gain: 0.12 }); tono({ f: 520, f2: 880, dur: 0.12, gain: 0.08 }); },
        cerrar: function () { ruido({ f: 2400, f2: 450, dur: 0.14, gain: 0.1 }); tono({ f: 820, f2: 480, dur: 0.1, gain: 0.07 }); },
        enviar: function () { tono({ f: 620, f2: 1100, dur: 0.07, gain: 0.18 }); },
        respuesta: function () { tono({ f: 988, dur: 0.09, gain: 0.12 }); tono({ f: 1319, dur: 0.14, gain: 0.11, delay: 0.09 }); },
        descargar: function () { tono({ f: 1500, dur: 0.03, gain: 0.16, type: 'triangle' }); tono({ f: 1500, dur: 0.03, gain: 0.16, type: 'triangle', delay: 0.07 }); },
        iniciar: function () {
            var c = audio(); if (!c) return;
            tono({ f: 80, f2: 150, dur: 0.28, gain: 0.2, type: 'sawtooth', lp: 500 });
            tono({ f: 160, f2: 300, dur: 0.22, gain: 0.08, type: 'square', lp: 700, delay: 0.05 });
        },
        entregar: function () { [523, 659, 784].forEach(function (f, i) { tono({ f: f, dur: 0.3, gain: 0.11, delay: i * 0.03 }); }); tono({ f: 1047, dur: 0.32, gain: 0.09, delay: 0.12 }); },
        eliminar: function () { tono({ f: 620, f2: 200, dur: 0.16, gain: 0.16, type: 'triangle' }); },
        interruptor: function () { tono({ f: 1000, dur: 0.03, gain: 0.14, type: 'square', lp: 2500 }); }
    };

    function play(tipo) {
        if (!on || !SONIDOS[tipo]) return;
        var ahora = Date.now();
        if (ahora - ultimo < 45) return;              /* evita sonidos encimados */
        ultimo = ahora;
        try {
            var c = audio(); if (!c) return;
            if (c.state === 'suspended') c.resume();
            SONIDOS[tipo]();
        } catch (e) {}
    }

    /* ---------- clasificación del clic ---------- */
    function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
    var SEL = 'button, a[href], [role="button"], [role="tab"], [role="switch"], .tab-btn, summary, input[type="checkbox"], input[type="radio"], ' +
        '.ensayo-card, .civix-quick, .civix-tool-card, .dm-paso, .tnx-step, .tnx-toc a, [onclick], [data-go], [data-ens], [data-ensayo], [data-ensayo-ms2]';

    function clasificar(el) {
        var tag = el.tagName;
        var cls = typeof el.className === 'string' ? el.className : '';
        /* texto visible (lo que lee el estudiante) y texto completo (incluye onclick / id) */
        var v = norm([el.textContent, el.getAttribute('aria-label')].join(' ')).replace(/\s+/g, ' ').trim().slice(0, 160);
        var t = norm([v, el.getAttribute('title'), el.getAttribute('onclick'), el.id].join(' ')).slice(0, 260);
        if (tag === 'INPUT' || el.getAttribute('role') === 'switch') return 'interruptor';
        if (/eliminar|borrar|retirar|vaciar|quitar del|descartar/.test(v)) return 'eliminar';
        /* tarjetas (ensayos, asignaturas, plantillas): abren algo, aunque su ícono sea ▶ o ⬇ */
        if ((/ensayo-card|ms2-card|dm-paso|tnx-step|-card\b/.test(cls) || el.hasAttribute('data-ensayo') || el.hasAttribute('data-ens') || el.hasAttribute('data-ensayo-ms2')) &&
            !/civix-tool-card/.test(cls) && !/^\s*descarg/.test(v)) return 'abrir';
        if (!/subir|cargar/.test(v) && (/descarg|⬇|exportar|imprimir/.test(v) || (v.length <= 30 && /informe|\b(dxf|pdf|png|svg)\b/.test(v)) || /generarInforme|descargar/i.test(el.getAttribute('onclick') || ''))) return 'descargar';
        if (/entregar|finalizar intento|enviar respuestas|publicar/.test(v)) return 'entregar';
        if (el.id === 'btnEnviarMensaje' || /civix-quick|civix-tool-card|civix-res-btn/.test(cls)) return 'enviar';
        if (/cerrar|close|cancelar|^\s*[×✕x]\s*$/.test(v) || /close|cerrar|backdrop/.test(cls)) return 'cerrar';
        if (/calcular|clasificar|generar|grafica|resolver|dibujar|aplicar(?! carga)|valores de ejemplo|cargar ejemplo|predimension/.test(t)) return 'calcular';
        var tarjeta = /ensayo-card|ms2-card|dm-paso|tnx-step|card/.test(cls) || el.hasAttribute('data-ensayo') || el.hasAttribute('data-ens') || el.hasAttribute('data-ensayo-ms2');
        if (!tarjeta && !/sesion|reinici/.test(v) && /\bver ensayo\b|iniciar ensayo|iniciar simul|aplicar carga|reproducir|arrancar|▶/.test(v)) return 'iniciar';
        if (/tab-btn|cxp-tab|civix-modo|gx-tab|-tab\b/.test(cls) || el.getAttribute('role') === 'tab') return 'pestana';
        if (tag === 'SUMMARY') return 'pestana';
        if (/ensayo-card|ms2-card|dm-paso|tnx-step|card/.test(cls) || el.hasAttribute('data-ensayo') || el.hasAttribute('data-ens') || el.hasAttribute('data-ensayo-ms2') ||
            /conoce al equipo|abrir|ver resultados|ver ensayos|entrar/.test(t)) return 'abrir';
        return 'navegar';
    }

    /* tras «Calcular»: éxito si no aparece un mensaje de error, error si aparece */
    var ERR = '.mensaje-error, .error-msg, .dm-error, .s1-error, .cxp-warn, [role="alert"]';
    function textoErrores(raiz) {
        return [].slice.call((raiz || doc).querySelectorAll(ERR)).filter(function (e) { return e.offsetParent && e.textContent.trim(); })
            .map(function (e) { return e.textContent.trim(); }).join('|');
    }
    function verificarResultado(el) {
        var raiz = el.closest('.laboratorio-panel, .ensayo-form, .est-shell, .ms2-shell, .gx, #panel-ensayo, #panel-ensayo-ms2, #panel-ensayo-rm, #dmEnsayosRoot, #est-ensayos, .gq-root') || doc.body;
        var antes = textoErrores(raiz);
        setTimeout(function () {
            var despues = textoErrores(raiz);
            play(despues && despues !== antes ? 'error' : 'exito');
        }, 380);
    }

    doc.addEventListener('click', function (e) {
        if (!on || !e.isTrusted) return;
        var el = e.target && e.target.closest ? e.target.closest(SEL) : null;
        if (!el || el.closest('.gm-sonido-ctrl')) return;
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') return;
        if (/^(TEXTAREA|SELECT)$/.test(el.tagName) || (el.tagName === 'INPUT' && !/checkbox|radio/.test(el.type))) return;
        var tipo = clasificar(el);
        play(tipo);
        if (tipo === 'calcular') verificarResultado(el);
    }, true);

    /* respuesta de Civix: suena cuando llega un mensaje del asistente */
    function vigilarChat() {
        var chat = doc.getElementById('chatMensajes');
        if (!chat || chat.__gmSon) return;
        chat.__gmSon = true;
        new MutationObserver(function (ms) {
            for (var i = 0; i < ms.length; i++) {
                for (var j = 0; j < ms[i].addedNodes.length; j++) {
                    var n = ms[i].addedNodes[j];
                    if (n.nodeType === 1 && /mensaje-bot/.test(n.className) && !/escribiendo|typing|cargando/.test(n.className)) {
                        setTimeout(function () { play('respuesta'); }, 60);
                        return;
                    }
                }
            }
        }).observe(chat, { childList: true });
    }

    /* ---------- control: silenciar y volumen ---------- */
    var IC_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    var IC_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>';

    function control() {
        if (doc.querySelector('.gm-sonido-ctrl')) return;
        var box = doc.createElement('div');
        box.className = 'gm-sonido-ctrl';
        box.innerHTML =
            '<button type="button" class="gm-son-btn" aria-expanded="false" aria-label="Sonidos de la interfaz"></button>' +
            '<div class="gm-son-pop" hidden>' +
                '<b>Sonidos</b>' +
                '<label class="gm-son-sw"><input type="checkbox"> <span>Activados</span></label>' +
                '<label class="gm-son-vol"><span>Volumen</span><input type="range" min="0" max="100" step="5"></label>' +
                '<button type="button" class="gm-son-test">Probar</button>' +
            '</div>';
        doc.body.appendChild(box);
        var btn = box.querySelector('.gm-son-btn'), pop = box.querySelector('.gm-son-pop');
        var sw = pop.querySelector('input[type=checkbox]'), rg = pop.querySelector('input[type=range]');
        function pintar() {
            btn.innerHTML = on ? IC_ON : IC_OFF;
            btn.title = on ? 'Sonidos activados' : 'Sonidos silenciados';
            box.classList.toggle('is-off', !on);
            sw.checked = on; rg.value = Math.round(vol * 100); rg.disabled = !on;
        }
        btn.addEventListener('click', function () {
            var abrir = pop.hidden; pop.hidden = !abrir; btn.setAttribute('aria-expanded', abrir ? 'true' : 'false');
        });
        sw.addEventListener('change', function () {
            on = sw.checked; guardar(K_ON, on ? '1' : '0'); pintar(); if (on) play('interruptor');
        });
        rg.addEventListener('input', function () {
            vol = rg.value / 100; guardar(K_VOL, String(vol));
            if (master) master.gain.value = vol * 0.6;
        });
        rg.addEventListener('change', function () { play('exito'); });
        pop.querySelector('.gm-son-test').addEventListener('click', function () {
            var demo = ['navegar', 'pestana', 'calcular', 'exito', 'abrir', 'cerrar', 'enviar', 'respuesta', 'descargar', 'iniciar', 'entregar', 'error'], k = 0;
            (function sig() { if (k >= demo.length || !on) return; ultimo = 0; play(demo[k++]); setTimeout(sig, 420); })();
        });
        doc.addEventListener('click', function (e) {
            if (!pop.hidden && !box.contains(e.target)) { pop.hidden = true; btn.setAttribute('aria-expanded', 'false'); }
        });
        pintar();
    }

    var css = doc.createElement('style');
    css.textContent =
        '.gm-sonido-ctrl{position:fixed;left:12px;bottom:12px;z-index:2147480000;font-family:Inter,system-ui,sans-serif}' +
        '.gm-son-btn{display:grid;place-items:center;width:36px;height:36px;padding:0;border:1px solid rgba(34,211,238,.35);border-radius:50%;background:rgba(6,11,20,.82);color:#22D3EE;cursor:pointer;opacity:.6;transition:opacity .2s,border-color .2s;backdrop-filter:blur(6px)}' +
        '.gm-son-btn:hover,.gm-son-btn[aria-expanded="true"],.gm-son-btn:focus-visible{opacity:1;border-color:#22D3EE}' +
        '.gm-son-btn svg{width:18px;height:18px}' +
        '.gm-sonido-ctrl.is-off .gm-son-btn{color:#7C8BA3;border-color:rgba(148,163,184,.35)}' +
        '.gm-son-pop{position:absolute;left:0;bottom:46px;display:flex;flex-direction:column;gap:10px;width:210px;padding:14px;border:1px solid rgba(34,211,238,.35);border-radius:12px;background:#0B1424;box-shadow:0 18px 40px rgba(0,0,0,.5);color:#E2E8F0;font-size:13px}' +
        '.gm-son-pop[hidden]{display:none}' +
        '.gm-son-pop b{font:600 11px/1 "JetBrains Mono",monospace;letter-spacing:.2em;text-transform:uppercase;color:#22D3EE}' +
        '.gm-son-sw{display:flex;align-items:center;gap:8px;cursor:pointer}' +
        '.gm-son-sw input{width:16px;height:16px;accent-color:#22D3EE;margin:0}' +
        '.gm-son-vol{display:flex;flex-direction:column;gap:6px;color:#A3B1C6}' +
        '.gm-son-vol input{width:100%;accent-color:#22D3EE;margin:0}' +
        '.gm-son-test{padding:7px 10px;border:1px solid rgba(34,211,238,.4);border-radius:8px;background:transparent;color:#22D3EE;font:600 12px/1 Inter,system-ui,sans-serif;cursor:pointer}' +
        '.gm-son-test:hover{background:rgba(34,211,238,.1)}' +
        '@media print{.gm-sonido-ctrl{display:none}}';
    doc.head.appendChild(css);

    function iniciar() { control(); vigilarChat(); }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar); else iniciar();
    global.addEventListener('load', vigilarChat);

    global.GeoSonidos = { play: play, clasificar: clasificar, activo: function () { return on; } };
})(window);
