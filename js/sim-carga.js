/**
 * GeoMetrics — MODO «CARGA MANUAL» (laboratorio real) para los simuladores 2D.
 *
 * Hasta ahora cada ensayo se reproducía solo, por tiempo. Aquí el estudiante opera la máquina como en el
 * laboratorio: aplica la carga (o el desplazamiento, o deja pasar el tiempo), la probeta responde en vivo con el
 * mismo modelo del simulador, y si se pasa de su capacidad, falla. No se reescribe ningún ensayo: se usa su
 * propio at(P, M, p) para saber cómo responde la probeta a lo que el estudiante aplica.
 *
 *   Control por CARGA ........ tracción, compresión, flexión, torsión, dureza, inconfinada, triaxial
 *   Control por DEFORMACIÓN .. tracción, compresión, flexión, torsión, inconfinada, triaxial, corte directo
 *   Control por TIEMPO ....... consolidación (lecturas en los tiempos normalizados 6 s … 24 h)
 *
 * Incluye: volante/bomba con velocidad, pasos de carga, aguja de pico, velocidad de aplicación contra la
 * norma (ASTM E8, C39, C78, D2166), tabla de lecturas, gráfica de «mis lecturas», CSV y nueva probeta.
 * Si la probeta supera su capacidad bajo control por carga, falla de golpe (como con pesas o con la bomba).
 *
 * LIMITACIÓN: si se descarga antes de la rotura el modelo es reversible (no guarda deformación permanente).
 * Depende de: sim2d-core.js y de sim-hub.js (que llama a GeoSimCarga.attach).
 */
(function (global) {
    'use strict';
    var G = global.GeoSim2D; if (!G || global.GeoSimCarga) return;
    var H = G.H, doc = document, fmt = H.fmt, clamp = H.clamp;

    var TIEMPOS = [0.1, 0.25, 0.5, 1, 2, 4, 8, 15, 30, 60, 120, 240, 480, 1440];     /* min · INV E-151 / ASTM D2435 */
    var N = 800;                                                                         /* muestras de la curva */

    /* ---------------------------------------------------------------- descriptores por ensayo */
    var D = {
        traccion: {
            modos: ['carga', 'def'], ini: 'carga',
            lect: { n: 'Carga P', u: 'kN', dec: 2, get: function (S) { return S.Pk; } },
            def: { n: 'Alargamiento ΔL', u: 'mm', dec: 2, get: function (S) { return S.dL; } },
            plot: { x: function (S) { return S.dL; }, xl: 'ΔL (mm)', y: function (S) { return S.Pk; }, yl: 'P (kN)' },
            vent: function () { return { get: function (S) { return S.sig; }, min: 1.15, max: 11.5, u: 'MPa/s', por: 1, act: function (S) { return S.fase === 'Elástica'; }, norma: 'ASTM E8 · 1,15–11,5 MPa/s en la zona elástica' }; }
        },
        compresion: {
            modos: ['carga', 'def'], ini: 'carga',
            lect: { n: 'Carga P', u: 'kN', dec: 2, get: function (S) { return S.Pk; } },
            def: { n: 'Acortamiento ΔL', u: 'mm', dec: 3, get: function (S) { return S.dL; } },
            plot: { x: function (S) { return S.dL; }, xl: 'ΔL (mm)', y: function (S) { return S.Pk; }, yl: 'P (kN)' },
            vent: function (P) { return P.mat === 'conc' ? { get: function (S) { return S.sig; }, min: 0.20, max: 0.30, u: 'MPa/s', por: 1, norma: 'ASTM C39 · 0,25 ± 0,05 MPa/s' } : null; }
        },
        flexion: {
            modos: ['carga', 'def'], ini: 'carga',
            lect: { n: 'Carga P', u: 'kN', dec: 2, get: function (S) { return S.Pk; } },
            def: { n: 'Deflexión δ', u: 'mm', dec: 2, get: function (S) { return S.dl; } },
            plot: { x: function (S) { return S.dl; }, xl: 'δ (mm)', y: function (S) { return S.Pk; }, yl: 'P (kN)' },
            vent: function (P) { return P.mat === 'conc' ? { get: function (S) { return S.sg; }, min: 0.9, max: 1.2, u: 'MPa/min', por: 60, norma: 'ASTM C78 · 0,9–1,2 MPa/min en la fibra extrema' } : null; }
        },
        torsion: {
            modos: ['carga', 'def'], ini: 'carga',
            lect: { n: 'Torque T', u: 'N·m', dec: 1, get: function (S) { return S.T; } },
            def: { n: 'Ángulo de giro φ', u: '°', dec: 2, get: function (S) { return S.phiD; } },
            plot: { x: function (S) { return S.phiD; }, xl: 'φ (°)', y: function (S) { return S.T; }, yl: 'T (N·m)' }
        },
        dureza: {
            modos: ['carga'], ini: 'carga', fin: 'sostener',
            lect: { n: 'Carga', u: 'kgf', dec: 0, get: function (S) { return S.load; } },
            def: { n: 'Profundidad', u: 'µm', dec: 0, get: function (S) { return S.depth; } },
            plot: { x: function (S) { return S.depth; }, xl: 'Profundidad (µm)', y: function (S) { return S.load; }, yl: 'Carga (kgf)' }
        },
        inconfinada: {
            modos: ['def', 'carga'], ini: 'def',
            lect: { n: 'Carga P', u: 'N', dec: 0, get: function (S) { return S.P; } },
            def: { n: 'Acortamiento ΔL', u: 'mm', dec: 2, get: function (S) { return S.dL; } },
            plot: { x: function (S) { return S.eps; }, xl: 'ε (%)', y: function (S) { return S.sigma; }, yl: 'σ (kPa)' },
            vent: function () { return { get: function (S) { return S.eps; }, min: 0.5, max: 2, u: '%/min', por: 60, norma: 'ASTM D2166 · 0,5–2 % de deformación por minuto' }; }
        },
        triaxial: {
            modos: ['def', 'carga'], ini: 'def',
            lect: { n: 'Desviador σ₁−σ₃', u: 'kPa', dec: 1, get: function (S) { return S.q; } },
            def: { n: 'Deformación axial εa', u: '%', dec: 2, get: function (S) { return S.eps; } },
            plot: { x: function (S) { return S.eps; }, xl: 'εa (%)', y: function (S) { return S.q; }, yl: 'σ₁−σ₃ (kPa)' }
        },
        corte: {
            modos: ['def'], ini: 'def',
            lect: { n: 'Esfuerzo cortante τ', u: 'kPa', dec: 1, get: function (S) { return S.tau; } },
            def: { n: 'Desplazamiento δh', u: 'mm', dec: 2, get: function (S) { return S.dh; } },
            plot: { x: function (S) { return S.dh; }, xl: 'δh (mm)', y: function (S) { return S.tau; }, yl: 'τ (kPa)' },
            paso: function () { return 0.25; },
            nota: function (P) {
                var Nn = P.sn * 3.6, kg = Nn / 10 / 9.81;
                return 'σn = ' + fmt(P.sn, 0) + ' kPa ⇒ N = ' + fmt(Nn, 0) + ' N ⇒ ≈ ' + fmt(kg, 1) + ' kg en el colgador (palanca 10:1, caja 6×6 cm).';
            }
        },
        consolidacion: {
            modos: ['tiempo'], ini: 'tiempo',
            lect: { n: 'Lectura del deformímetro δv', u: 'mm', dec: 3, get: function (S) { return S.dv; } },
            plot: { x: function (S) { return Math.log10(S.t); }, xl: 'log t (min)', y: function (S) { return S.dv; }, yl: 'δv (mm)' },
            tiempo: function (S) { return S.t; },
            nota: function (P) {
                var F = P.s1 * 31.67 * 0.1, kg = F / 10 / 9.81;
                return 'σ = ' + fmt(P.s1, 0) + ' kPa ⇒ F = ' + fmt(F, 0) + ' N ⇒ ≈ ' + fmt(kg, 1) + ' kg en el colgador (anillo Ø 63,5 mm, palanca 10:1).';
            }
        }
    };

    /* ---------------------------------------------------------------- utilidades */
    function nice(x, ceil) {
        if (!(x > 0)) return 1;
        var e = Math.pow(10, Math.floor(Math.log10(x))), m = x / e, s = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10], i;
        for (i = 0; i < s.length; i++) if (ceil ? s[i] >= m - 1e-9 : s[i] >= m * 0.999) return s[i] * e;
        return 10 * e;
    }
    function niceStep(x) { var e = Math.pow(10, Math.floor(Math.log10(x))), m = x / e; return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7 ? 5 : 10) * e; }
    function tk(v) { return v === 0 ? '0' : String(+v.toPrecision(3)); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function tiempoTxt(t) { return t < 1 ? fmt(t * 60, 0) + ' s' : t < 60 ? fmt(t, t < 10 ? 2 : 1).replace(/\.?0+$/, '') + ' min' : fmt(t / 60, t < 600 ? 1 : 0).replace(/\.0$/, '') + ' h'; }
    var MODOS = { carga: 'Carga', def: 'Deformación', tiempo: 'Tiempo' };

    /* ================================================================ motor */
    function Carga(R, host, d) {
        this.R = R; this.host = host; this.d = d; this.def = R.def;
        this.manual = false; this.modo = d.ini; this.cmd = 0; this.fase = 'listo';      /* listo | cargando | falla | fin */
        this.pico = 0; this.rec = []; this.held = 0; this.vel = 0.016; this.rate = 0; this.sPrev = null; this.cPrev = 0; this.last = 0; this.raf = 0; this.dead = false;
        this.build(); this.rebuild();
    }
    var C = Carga.prototype;

    /* curva control → p, a partir del propio modelo del simulador */
    C.rebuild = function () {
        var R = this.R, d = this.d, def = this.def, i, S, arrs = {};
        this.curva = {};
        d.modos.forEach(function (m) { arrs[m] = new Float64Array(N + 1); });
        this.lectMax = 0;
        for (i = 0; i <= N; i++) {
            S = def.at(R.P, R.M, i / N);
            d.modos.forEach(function (m) { arrs[m][i] = m === 'carga' ? d.lect.get(S) : m === 'def' ? d.def.get(S) : d.tiempo(S); });
            this.lectMax = Math.max(this.lectMax, d.lect.get(S));
        }
        var self = this;
        d.modos.forEach(function (m) {
            var a = arrs[m], cm = new Float64Array(N + 1), mx = 0, ip = 0, k;
            for (k = 0; k <= N; k++) { cm[k] = Math.max(k ? cm[k - 1] : a[0], a[k]); }
            mx = cm[N]; for (k = 0; k <= N; k++) if (cm[k] >= mx * 0.9995) { ip = k; break; }
            var v0 = cm[0];
            self.curva[m] = { cm: cm, vmax: mx, pPeak: m === 'carga' ? ip / N : 1, v0: v0 };
            self.curva[m].rango = m === 'carga' ? nice(mx * 1.25, true) : m === 'def' ? mx : cm[N];
        });
        this.ajustarUI();
    };
    C.cv = function () { return this.curva[this.modo]; };
    C.invert = function (c) {
        var cv = this.cv(), cm = cv.cm, lo = 0, hi = N, mid;
        if (c <= cm[0]) return 0; if (c >= cm[N]) return 1;
        while (lo < hi - 1) { mid = (lo + hi) >> 1; if (cm[mid] >= c) hi = mid; else lo = mid; }
        var a = cm[lo], b = cm[hi], f = b > a ? (c - a) / (b - a) : 0;
        return (lo + f) / N;
    };

    /* ---------------------------------------------------------------- interfaz */
    C.build = function () {
        var self = this, R = this.R, ctrl = R.root.querySelector('.s2d-ctrl'), d = this.d;
        var sw = doc.createElement('div'); sw.className = 's2d-modo';
        sw.innerHTML = '<button type="button" data-m="auto" class="on">Automático</button><button type="button" data-m="manual">Carga manual</button>';
        var h5 = ctrl.querySelector('h5'); h5.parentNode.insertBefore(sw, h5.nextSibling);
        var pan = doc.createElement('div'); pan.className = 'cg'; pan.hidden = true;
        var modosHtml = d.modos.length > 1 ? '<div class="cg-seg" data-cg="seg"><span>Controlar por</span>' + d.modos.map(function (m) { return '<button type="button" data-cm="' + m + '">' + MODOS[m] + '</button>'; }).join('') + '</div>' : '';
        pan.innerHTML =
            '<h5><i></i>Operación manual</h5>' + modosHtml +
            '<div class="cg-big"><span data-cg="bn">Carga aplicada</span><strong data-cg="cmd">0</strong><small data-cg="cu">kN</small></div>' +
            '<div class="cg-row"><span data-cg="l2n">Deformación</span><b data-cg="l2">—</b><small data-cg="l2u"></small></div>' +
            '<div class="cg-row" data-cg="rpico"><span data-cg="pn">Pico registrado</span><b data-cg="pico">—</b><small data-cg="pu"></small></div>' +
            '<div class="cg-row"><span>Velocidad de aplicación</span><b data-cg="rate">—</b><small data-cg="rateu"></small></div>' +
            '<div class="cg-msg" data-cg="msg"></div>' +
            '<label class="cg-sl"><span data-cg="sln">Volante / bomba</span><input type="range" min="0" max="1000" value="0" data-cg="sl"></label>' +
            '<div class="cg-btns" data-cg="hold"><button type="button" data-cg="down">▼ <span data-cg="dtxt">Descargar</span></button><button type="button" data-cg="up">▲ <span data-cg="utxt">Cargar</span></button></div>' +
            '<div class="cg-btns cg-small" data-cg="stp"><button type="button" data-cg="m1">− paso</button><b data-cg="stepv"></b><button type="button" data-cg="p1">+ paso</button></div>' +
            '<label class="cg-row cg-vel" data-cg="velrow"><span data-cg="veln">Velocidad de la bomba</span><select data-cg="vel"><option value="0.004">Muy lenta</option><option value="0.008">Lenta</option><option value="0.016" selected>Normal</option><option value="0.04">Rápida</option></select></label>' +
            '<div class="cg-btns cg-small" data-cg="tbtns" hidden><button type="button" data-cg="tprev">◀ Lectura anterior</button><button type="button" data-cg="tnext">Lectura siguiente ▶</button></div>' +
            '<p class="cg-nota" data-cg="nota"></p>' +
            '<div class="cg-acts"><button type="button" data-cg="reg" class="is-main">＋ Registrar lectura</button><button type="button" data-cg="nueva">↺ Nueva probeta</button></div>' +
            '<div class="cg-tabla" data-cg="tabla"></div><canvas class="cg-plot" data-cg="plot" hidden></canvas>' +
            '<button type="button" class="cg-csv" data-cg="csv" hidden>⬇ Descargar lecturas (CSV)</button>';
        sw.parentNode.insertBefore(pan, sw.nextSibling);
        this.sw = sw; this.pan = pan;
        var q = function (k) { return pan.querySelector('[data-cg="' + k + '"]'); }; this.q = q;

        sw.addEventListener('click', function (e) { var b = e.target.closest('[data-m]'); if (b) self.setManual(b.getAttribute('data-m') === 'manual'); });
        pan.addEventListener('click', function (e) {
            var b = e.target.closest('[data-cm]'); if (b) return self.setModo(b.getAttribute('data-cm'));
            b = e.target.closest('[data-cg]'); if (!b) return; var k = b.getAttribute('data-cg');
            if (k === 'reg') self.registrar(); else if (k === 'nueva') self.nueva(); else if (k === 'csv') self.csv();
            else if (k === 'p1') self.paso(1); else if (k === 'm1') self.paso(-1);
            else if (k === 'tnext') self.tiempo(1); else if (k === 'tprev') self.tiempo(-1);
        });
        q('sl').addEventListener('input', function (e) { self.deSlider(+e.target.value); });
        q('vel').addEventListener('change', function (e) { self.vel = +e.target.value; });
        ['up', 'down'].forEach(function (k) {
            var b = q(k), dir = k === 'up' ? 1 : -1;
            b.addEventListener('pointerdown', function (e) { e.preventDefault(); try { b.setPointerCapture(e.pointerId); } catch (x) { } self.held = dir; });
            ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { b.addEventListener(ev, function () { if (self.held === dir) self.held = 0; }); });
            b.addEventListener('keydown', function (e) { if (e.key === ' ' || e.key === 'Enter') { self.held = dir; e.preventDefault(); } });
            b.addEventListener('keyup', function () { if (self.held === dir) self.held = 0; });
        });
    };
    C.ajustarUI = function () {
        if (!this.q) return;
        var d = this.d, q = this.q, m = this.modo, esT = m === 'tiempo', cv = this.cv();
        this.pan.querySelectorAll('[data-cm]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-cm') === m); });
        var big = m === 'carga' ? d.lect : m === 'def' ? d.def : { n: 'Tiempo transcurrido', u: '' };
        var otro = m === 'carga' ? (d.def || null) : d.lect;
        q('bn').textContent = m === 'carga' ? big.n.replace(/^Carga/, 'Carga aplicada') : m === 'def' ? 'Avance: ' + big.n : big.n;
        q('cu').textContent = big.u;
        q('l2n').textContent = otro ? otro.n : '—'; q('l2u').textContent = otro ? otro.u : '';
        q('pn').textContent = 'Pico: ' + d.lect.n; q('pu').textContent = d.lect.u;
        q('rpico').hidden = esT; q('l2n').parentNode.hidden = !otro;
        q('hold').hidden = esT; q('stp').hidden = esT; q('velrow').hidden = esT; q('tbtns').hidden = !esT;
        q('sln').textContent = esT ? 'Tiempo (escala logarítmica)' : (m === 'carga' ? 'Volante / bomba' : 'Volante de desplazamiento');
        q('veln').textContent = m === 'carga' ? 'Velocidad de la bomba' : 'Velocidad del volante';
        q('utxt').textContent = m === 'carga' ? 'Cargar' : 'Avanzar'; q('dtxt').textContent = m === 'carga' ? 'Descargar' : 'Retroceder';
        q('stepv').textContent = esT ? '' : '= ' + fmt(this.pasoVal(), this.dec(big)) + ' ' + big.u;
        var nota = d.nota ? d.nota(this.R.P) : ''; q('nota').textContent = nota; q('nota').hidden = !nota;
        var v = this.def && this.R.M ? (d.vent ? d.vent(this.R.P) : null) : null;
        this.vent = v; q('rate').parentNode.hidden = !v;
        this.pintar();
    };
    C.dec = function (o) { return o && o.dec != null ? o.dec : 2; };
    C.pasoVal = function () { var cv = this.cv(); return this.d.paso && this.modo !== 'carga' ? this.d.paso(this.modo, cv.rango) : niceStep(cv.rango / 40); };

    C.setManual = function (on) {
        var R = this.R; if (on === this.manual) return;
        if (R.running) R.pause();
        this.manual = on; this.sw.querySelectorAll('[data-m]').forEach(function (b) { b.classList.toggle('on', (b.getAttribute('data-m') === 'manual') === on); });
        this.pan.hidden = !on; R.root.classList.toggle('is-manual', on);
        this.nueva(true);
        if (on) { this.last = 0; var self = this; this.raf = global.requestAnimationFrame(function f(ts) { if (self.dead || !self.manual) return; self.frame(ts); self.raf = global.requestAnimationFrame(f); }); }
        else if (this.raf) global.cancelAnimationFrame(this.raf);
    };
    C.setModo = function (m) {
        if (this.d.modos.indexOf(m) < 0 || m === this.modo) return;
        this.modo = m; this.nueva(true); this.ajustarUI();
    };
    C.nueva = function (silencio) {
        this.cmd = this.modo === 'tiempo' ? TIEMPOS[0] : 0; this.fase = 'listo'; this.pico = 0; this.held = 0; this.rate = 0; this.sPrev = null; this.R.p = 0;
        if (this.modo === 'tiempo') this.cmd = this.cv().v0;
        this.rec = []; this.tabla(); this.q('sl').value = 0; this.R.draw(); this.pintar();
    };
    C.deSlider = function (v) {
        if (this.fase === 'falla' || this.fase === 'fin') return;
        var cv = this.cv(), f = v / 1000;
        if (this.modo === 'tiempo') { var a = Math.log10(cv.v0), b = Math.log10(cv.cm[N]); this.cmd = Math.pow(10, a + (b - a) * f); }
        else this.cmd = cv.rango * f;
    };
    C.deCmd = function () {
        var cv = this.cv(), f;
        if (this.modo === 'tiempo') { var a = Math.log10(cv.v0), b = Math.log10(cv.cm[N]); f = (Math.log10(Math.max(this.cmd, cv.v0)) - a) / (b - a); }
        else f = this.cmd / cv.rango;
        this.q('sl').value = Math.round(clamp(f, 0, 1) * 1000);
    };
    C.paso = function (dir) {
        if (this.fase === 'falla' || this.fase === 'fin') return;
        this.cmd = clamp(this.cmd + dir * this.pasoVal(), 0, this.cv().rango); this.deCmd();
    };
    C.tiempo = function (dir) {
        if (this.fase === 'fin') return;
        var cv = this.cv(), t = this.cmd, i, j = -1;
        if (dir > 0) { for (i = 0; i < TIEMPOS.length; i++) if (TIEMPOS[i] > t * 1.0001) { j = i; break; } if (j < 0) return; this.cmd = Math.min(TIEMPOS[j], cv.cm[N]); }
        else { for (i = TIEMPOS.length - 1; i >= 0; i--) if (TIEMPOS[i] < t * 0.9999) { j = i; break; } this.cmd = j < 0 ? cv.v0 : TIEMPOS[j]; }
        this.deCmd();
    };

    /* ---------------------------------------------------------------- bucle */
    C.frame = function (ts) {
        var R = this.R, d = this.d, cv = this.cv(), self = this;
        if (!this.last) this.last = ts;
        var dt = Math.min(0.05, (ts - this.last) / 1000); this.last = ts; if (dt <= 0) return;
        var m = this.modo;
        /* el operador mueve la bomba / el volante */
        if (this.held && this.fase !== 'falla' && this.fase !== 'fin' && m !== 'tiempo') {
            this.cmd = clamp(this.cmd + this.held * this.vel * cv.rango * dt * (m === 'def' ? 1.6 : 1), 0, cv.rango); this.deCmd();
        }
        var pt, pAnt = R.p;
        if (this.fase === 'falla') pt = 1;
        else if (this.fase === 'fin') pt = 1;
        else {
            pt = this.invert(this.cmd);
            if (m === 'carga') {
                if (this.cmd > cv.vmax * 1.0002 && d.fin !== 'sostener') { this.fase = 'falla'; pt = 1; }
                else if (d.fin === 'sostener' && this.cmd >= cv.vmax * 0.9995) { this.fase = 'fin'; pt = 1; }
                else pt = Math.min(pt, cv.pPeak);
            } else if (pt >= 1 && m === 'def') { this.fase = 'fin'; }
            if (this.fase === 'listo' && pt > 0) this.fase = 'cargando';
        }
        /* la probeta responde con inercia; la rotura es más lenta de ver que de producirse */
        var v = this.fase === 'falla' ? 3.2 / this.def.duration : this.fase === 'fin' && m === 'carga' ? 3 / this.def.duration : 2.2;
        var k = 1 - Math.exp(-dt / (this.fase === 'falla' ? 0.25 : 0.07));
        var dp = clamp((pt - R.p) * k, -v * dt, v * dt); R.p = clamp(R.p + dp, 0, 1);
        if (this.fase === 'falla' && R.p >= 0.9995) { R.p = 1; this.fase = 'fin'; }
        if (this.fase === 'fin' && m !== 'carga' && R.p >= 0.9995) R.p = 1;
        var S = this.def.at(R.P, R.M, R.p);
        /* aguja de pico y velocidad */
        this.pico = Math.max(this.pico, d.lect.get(S));
        var vt = this.vent, rate = null, term0 = this.fase === 'falla' || this.fase === 'fin';
        if (term0) { this.rate = 0; this.sPrev = null; this.rateV = null; }
        else if (vt && (!vt.act || vt.act(S))) {
            var s = vt.get(S);
            if (this.sPrev != null) { var inst = (s - this.sPrev) / dt * vt.por; this.rate += (inst - this.rate) * (1 - Math.exp(-dt / 0.6)); }
            this.sPrev = s; rate = this.rate;
        } else { this.sPrev = null; this.rate *= Math.exp(-dt * 3); }
        if (!term0) this.rateV = rate;
        if (Math.abs(R.p - pAnt) > 1e-7 || this.fase !== this.fAnt || this.held) R.draw();
        this.fAnt = this.fase; this.S = S;
        this.pintar(S);
    };

    C.pintar = function (S) {
        var q = this.q, d = this.d, m = this.modo, R = this.R; if (!q) return;
        S = S || this.def.at(R.P, R.M, R.p);
        var big = m === 'carga' ? d.lect : m === 'def' ? d.def : null;
        if (m === 'tiempo') q('cmd').textContent = tiempoTxt(this.cmd);
        else { var vv = m === 'carga' ? d.lect.get(S) : d.def.get(S); q('cmd').textContent = fmt(R.p <= 0 ? 0 : vv, this.dec(big)); }
        var otro = m === 'carga' ? d.def : d.lect;
        if (otro) q('l2').textContent = fmt(otro.get(S), this.dec(otro));
        if (m !== 'tiempo') q('pico').textContent = fmt(this.pico, this.dec(d.lect));
        var vt = this.vent, rt = q('rate'), msg = q('msg'), est = '';
        if (vt && this.rateV != null && Math.abs(this.rateV) > 1e-6 * (vt.max || 1)) {
            rt.textContent = fmt(this.rateV, this.rateV < 1 ? 3 : 2); q('rateu').textContent = vt.u;
            var ok = this.rateV >= vt.min && this.rateV <= vt.max;
            msg.className = 'cg-msg ' + (ok ? 'ok' : 'bad'); est = (ok ? '✔ Velocidad dentro de la norma' : this.rateV > vt.max ? '▲ Demasiado rápido: sobrestima la resistencia' : '▼ Demasiado lento') + ' (' + vt.norma + ')';
        } else if (vt) { rt.textContent = '—'; q('rateu').textContent = vt.u; msg.className = 'cg-msg'; est = vt.norma; }
        else { rt.textContent = '—'; q('rateu').textContent = ''; msg.className = 'cg-msg'; est = ''; }
        if (this.fase === 'falla' || (this.fase === 'fin' && m === 'carga' && d.fin !== 'sostener')) { msg.className = 'cg-msg bad'; est = '✖ La probeta superó su capacidad y falló. Lee el pico registrado.'; }
        else if (this.fase === 'fin' && d.fin === 'sostener') { msg.className = 'cg-msg ok'; est = '✔ Carga mayor mantenida y retirada: lee la dureza.'; }
        else if (this.fase === 'fin') { msg.className = 'cg-msg ok'; est = '✔ Fin del recorrido: registra y revisa tus lecturas.'; }
        msg.textContent = est; msg.hidden = !est;
        var term = this.fase === 'falla' || this.fase === 'fin';
        ['up', 'down', 'm1', 'p1', 'sl'].forEach(function (k) { var e = q(k); if (e) e.disabled = term && !(m === 'def' && false); });
        q('tnext').disabled = this.fase === 'fin'; q('reg').disabled = R.p <= 0 && m !== 'tiempo';
        q('reg').classList.toggle('is-ready', !q('reg').disabled);
    };

    /* ---------------------------------------------------------------- lecturas */
    C.registrar = function () {
        var R = this.R, d = this.d, S = this.def.at(R.P, R.M, R.p), cells = [];
        this.def.readouts.forEach(function (r) { var t = R.tiles[r.k]; cells.push(t ? t.textContent : ''); });
        if (this.modo === 'tiempo') cells.unshift(tiempoTxt(this.cmd));
        this.rec.push({ cells: cells, x: d.plot.x(S), y: d.plot.y(S) });
        this.tabla();
    };
    C.cab = function () {
        var h = this.def.readouts.map(function (r) { return r.label + (r.unit ? ' (' + r.unit + ')' : ''); });
        if (this.modo === 'tiempo') h.unshift('t'); return h;
    };
    C.tabla = function () {
        var box = this.q('tabla'), q = this.q, rec = this.rec;
        if (!rec.length) { box.innerHTML = ''; q('plot').hidden = true; q('csv').hidden = true; return; }
        var h = this.cab();
        box.innerHTML = '<table><thead><tr><th>#</th>' + h.map(function (x) { return '<th>' + esc(x) + '</th>'; }).join('') + '</tr></thead><tbody>' +
            rec.map(function (r, i) { return '<tr><td>' + (i + 1) + '</td>' + r.cells.map(function (c) { return '<td>' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table>';
        box.scrollTop = box.scrollHeight;
        q('csv').hidden = false; q('plot').hidden = rec.length < 2; if (rec.length >= 2) this.graficar();
    };
    C.graficar = function () {
        var cv = this.q('plot'), W = 300, Hh = 190, ctx = H.prep(cv, W, Hh), P = this.d.plot, pts = this.rec;
        var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
        var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min(0, Math.min.apply(null, ys)), y1 = Math.max.apply(null, ys);
        if (x1 - x0 < 1e-9) x1 = x0 + 1; if (y1 - y0 < 1e-9) y1 = y0 + 1;
        var L = 46, T = 14, Rr = 10, B = 34, pw = W - L - Rr, ph = Hh - T - B;
        function X(v) { return L + (v - x0) / (x1 - x0) * pw; } function Y(v) { return T + ph - (v - y0) / (y1 - y0) * ph; }
        H.rrect(ctx, 0, 0, W, Hh, 10); ctx.fillStyle = '#0f1829'; ctx.fill();
        ctx.strokeStyle = 'rgba(167,180,200,.15)'; ctx.fillStyle = '#94a3b8'; ctx.font = '600 9.5px Inter, system-ui, sans-serif'; ctx.lineWidth = 1;
        H.ticks(y0, y1, 4).forEach(function (v) { ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(tk(v), L - 5, Y(v)); });
        H.ticks(x0, x1, 4).forEach(function (v) { ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(tk(v), X(v), T + ph + 4); });
        ctx.fillStyle = '#cbd5e1'; ctx.textAlign = 'center'; ctx.fillText(P.xl, L + pw / 2, Hh - 12); ctx.save(); ctx.translate(11, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(P.yl, 0, 0); ctx.restore();
        var col = getComputedStyle(this.R.root).getPropertyValue('--a').trim() || '#38bdf8';
        ctx.strokeStyle = col; ctx.lineWidth = 1.8; ctx.beginPath(); pts.forEach(function (p, i) { if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); }); ctx.stroke();
        pts.forEach(function (p) { ctx.beginPath(); ctx.arc(X(p.x), Y(p.y), 3.4, 0, H.TAU); ctx.fillStyle = '#fff'; ctx.fill(); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.stroke(); });
    };
    C.csv = function () {
        var rows = [this.cab()].concat(this.rec.map(function (r) { return r.cells; }));
        var txt = '\ufeff' + rows.map(function (r) { return r.map(function (c) { c = String(c).replace(/"/g, '""'); return /[;",\n]/.test(c) ? '"' + c + '"' : c; }).join(';'); }).join('\r\n');
        var a = doc.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/csv;charset=utf-8' }));
        a.download = 'lecturas_' + this.def.key + '.csv'; doc.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1200);
    };
    C.destroy = function () { this.dead = true; if (this.raf) global.cancelAnimationFrame(this.raf); };

    /* ---------------------------------------------------------------- enganche con el Runner de sim-hub.js */
    function attach(R, host, def) {
        var d = D[def.key]; if (!d) return null;
        var c = new Carga(R, host, d), orig = R.recalc, origDestroy = R.destroy;
        R.recalc = function () { orig.call(this); if (c.q) { c.rebuild(); if (c.manual) c.nueva(true); } };
        R.destroy = function () { c.destroy(); origDestroy.call(this); };
        var tg = R.toggle; R.toggle = function () { if (c.manual) return; tg.call(this); };
        R.carga = c; global.GeoSimCarga.ultimo = c; return c;
    }
    global.GeoSimCarga = { attach: attach, desc: D };
})(window);
