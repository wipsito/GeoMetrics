/**
 * GeoMetrics — Pestaña SIMULADORES · Mecánica de Suelos II
 * Cada ensayo ofrece dos simuladores: 2D (parámetros + curvas en vivo) y 3D (máquina completa).
 * Depende de: sim2d-core.js, sim2d-inconfinada.js, sim2d-defs.js, lab3d-ensayos.js
 */
(function (global) {
    'use strict';
    var G = global.GeoSim2D;
    if (!G) return;
    var H = G.H, doc = document;
    var ORDER = ['corte', 'inconfinada', 'consolidacion', 'triaxial'];

    var GLYPH = {
        corte: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 3v7M28.5 6.5 32 10l3.5-3.5"/><rect x="17" y="12" width="26" height="14" rx="1.8"/><rect x="24" y="30" width="26" height="14" rx="1.8"/><path d="M5 37h13M13 33l5 4-5 4"/><path d="M6 53h52"/></svg>',
        inconfinada: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M32 3v8M28.5 7.5 32 11l3.5-3.5"/><rect x="15" y="13" width="34" height="5" rx="1.8"/><rect x="24" y="18" width="16" height="26" rx="3"/><path d="M27 37l10-14" stroke-dasharray="2.5 3"/><rect x="15" y="44" width="34" height="5" rx="1.8"/><path d="M6 56h52"/></svg>',
        consolidacion: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20h54"/><path d="M38 20l-6 12h12z"/><path d="M14 20v9"/><rect x="6" y="29" width="16" height="17" rx="2.5"/><path d="M10 38h8"/><path d="M53 20v10"/><rect x="46" y="30" width="14" height="4.5" rx="1"/><rect x="47.5" y="36" width="11" height="4.5" rx="1"/><path d="M4 54h56"/></svg>',
        triaxial: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 7h46M13 7v47M51 7v47"/><path d="M32 7v14"/><rect x="21" y="21" width="22" height="28" rx="2.5"/><rect x="28" y="28" width="8" height="14" rx="1.5"/><path d="M24 31h-4M24 38h-4M40 31h4M40 38h4" stroke-dasharray="1.5 2.5"/><path d="M6 54h52"/></svg>'
    };
    var MACHINE = {
        corte: 'Aparato de corte directo', inconfinada: 'Prensa de compresión inconfinada',
        consolidacion: 'Consolidómetro (edómetro) de palanca', triaxial: 'Cámara triaxial con marco de carga'
    };

    function $(id) { return doc.getElementById(id); }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    var hub = $('simhub-ms2'), panel = $('simhub-panel'), grid = $('simhub-grid');
    if (!hub || !panel || !grid) return;

    var current = null;     /* { key, mode, runner } */

    /* ============================ TARJETAS DEL HUB ============================ */
    function buildHub() {
        grid.innerHTML = '';
        ORDER.forEach(function (k) {
            var d = G.defs[k]; if (!d) return;
            var card = el('article', 'simcard');
            card.style.setProperty('--a', d.accent); card.style.setProperty('--rgb', d.rgb);
            card.innerHTML =
                '<div class="simcard-glow"></div>' +
                '<div class="simcard-head"><em class="simcard-num">' + d.num + '</em><div class="simcard-glyph">' + GLYPH[k] + '</div></div>' +
                '<h4>' + esc(d.title) + '</h4>' +
                '<p>' + esc(d.desc) + '</p>' +
                '<div class="simcard-chips">' + d.chips.map(function (c) { return '<em>' + esc(c) + '</em>'; }).join('') + '</div>' +
                '<small class="simcard-norma">' + esc(d.norma) + '</small>' +
                '<div class="simcard-btns">' +
                  '<button type="button" class="simcard-btn is-2d" data-sim-open="' + k + '" data-mode="2d"><b>2D</b><span>Simulador 2D</span><i>Curvas en vivo</i></button>' +
                  '<button type="button" class="simcard-btn is-3d" data-sim-open="' + k + '" data-mode="3d"><b>3D</b><span>Simulador 3D</span><i>Máquina completa</i></button>' +
                '</div>';
            grid.appendChild(card);
        });
        grid.querySelectorAll('[data-sim-open]').forEach(function (b) {
            b.addEventListener('click', function () { open(b.getAttribute('data-sim-open'), b.getAttribute('data-mode')); });
        });
    }

    /* ============================== PANEL ============================== */
    function open(key, mode) {
        var d = G.defs[key]; if (!d) return;
        closeBody();
        var shell = el('div', 'simhub-shell');
        shell.style.setProperty('--a', d.accent); shell.style.setProperty('--rgb', d.rgb);
        shell.innerHTML =
            '<div class="simhub-topbar">' +
              '<button type="button" class="btn-volver simhub-back">← Simuladores</button>' +
              '<nav class="simhub-crumbs"><span>Mecánica de Suelos II</span><i>/</i><span>Simuladores</span><i>/</i><b>' + esc(d.title) + '</b></nav>' +
              '<div class="simhub-mode" role="tablist" aria-label="Tipo de simulador">' +
                '<button type="button" role="tab" data-mode="2d">2D</button><button type="button" role="tab" data-mode="3d">3D</button>' +
              '</div>' +
            '</div>' +
            '<header class="simhub-phero">' +
              '<div class="simhub-phero-icon">' + GLYPH[key] + '</div>' +
              '<div class="simhub-phero-text"><em class="simhub-phero-eyebrow"></em><h2>' + esc(d.title) + '</h2><p class="simhub-phero-desc"></p></div>' +
              '<ul class="simhub-phero-meta"><li><b>Normativa</b><span>' + esc(d.norma) + '</span></li><li><b>Parámetros</b><span>' + esc(d.chips.join(' · ')) + '</span></li></ul>' +
            '</header>' +
            '<div class="simhub-body"></div>';
        panel.innerHTML = ''; panel.appendChild(shell);
        hub.style.display = 'none'; panel.style.display = 'block';
        shell.querySelector('.simhub-back').addEventListener('click', close);
        shell.querySelectorAll('.simhub-mode button').forEach(function (b) {
            b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
        });
        current = { key: key, mode: null, runner: null, shell: shell };
        setMode(mode === '3d' ? '3d' : '2d');
        global.scrollTo(0, 0);
    }

    function setMode(mode) {
        if (!current) return;
        var d = G.defs[current.key], shell = current.shell, body = shell.querySelector('.simhub-body');
        closeBody();
        current.mode = mode;
        shell.querySelectorAll('.simhub-mode button').forEach(function (b) {
            var on = b.getAttribute('data-mode') === mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        shell.querySelector('.simhub-phero-eyebrow').textContent = 'Simulador ' + mode.toUpperCase() + ' · Laboratorio virtual';
        shell.querySelector('.simhub-phero-desc').textContent = mode === '2d'
            ? 'Ajusta los parámetros del suelo, inicia el ensayo y observa la máquina, las lecturas y las curvas en tiempo real.'
            : 'Recorre la ' + MACHINE[current.key].toLowerCase() + ' en 3D: reproduce la secuencia, rota la vista y consulta cada componente.';
        body.innerHTML = '';
        if (mode === '3d') {
            var host = el('div', 'simhub-3d-host'); body.appendChild(host);
            if (!global.GeoLab3D) host.innerHTML = '<p class="login-hint">El módulo 3D no está disponible.</p>';
            else global.__ms2Lab3D = global.GeoLab3D.mount(host, current.key);
        } else {
            current.runner = new Runner(d, body);
        }
    }

    function closeBody() {
        if (global.GeoLab3D) global.GeoLab3D.disposeAll();
        if (current && current.runner) { current.runner.destroy(); current.runner = null; }
    }
    function close() {
        closeBody(); current = null;
        panel.style.display = 'none'; panel.innerHTML = ''; hub.style.display = '';
        global.scrollTo(0, 0);
    }

    /* ============================== MOTOR 2D ============================== */
    function Runner(def, host) {
        var self = this;
        this.def = def; this.p = 0; this.running = false; this.tick = 0; this.last = 0; this.raf = 0; this.speed = 1; this.dead = false;
        this.P = {};
        def.fields.forEach(function (f) { self.P[f.id] = f.value; });
        /* usa los resultados calculados por el estudiante, si existen */
        this.fromData = null;
        try { var bag = global.__datosEnsayoMS2 && global.__datosEnsayoMS2[def.key]; this.fromData = bag && def.fromData ? def.fromData(bag) : null; } catch (e) {}
        if (this.fromData) Object.keys(this.fromData).forEach(function (k) { self.P[k] = self.fromData[k]; });

        var html =
            '<div class="s2d" style="--a:' + def.accent + ';--rgb:' + def.rgb + '">' +
              '<aside class="s2d-ctrl">' +
                '<h5><i></i>Parámetros</h5>' +
                '<div class="s2d-fields">' + def.fields.map(function (f) { return fieldHtml(f, self.P[f.id]); }).join('') + '</div>' +
                (this.fromData ? '<p class="s2d-note">Se cargaron tus resultados de <b>Ensayos</b>. Puedes modificarlos libremente.</p>' : '') +
                '<div class="s2d-btns"><button type="button" class="s2d-play"><span>▶</span> Iniciar ensayo</button><button type="button" class="s2d-reset" title="Reiniciar">↺</button></div>' +
                '<label class="s2d-row"><span>Velocidad de animación</span><select class="s2d-speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>' +
                '<label class="s2d-row"><span>Línea de tiempo</span><input type="range" class="s2d-scrub" min="0" max="1000" value="0"></label>' +
              '</aside>' +
              '<section class="s2d-main">' +
                '<div class="s2d-stagewrap"><canvas class="s2d-stage" aria-label="Simulación de la máquina"></canvas>' +
                  '<div class="s2d-led"><i></i><b>Listo</b></div><div class="s2d-tag">' + esc(MACHINE[def.key]) + '</div></div>' +
                '<div class="s2d-readouts">' + def.readouts.map(function (r) {
                    return '<div class="s2d-tile" data-k="' + r.k + '"><span>' + r.label + '</span><strong>—</strong><small>' + r.unit + '</small></div>'; }).join('') + '</div>' +
                '<div class="s2d-charts"><canvas class="s2d-chart"></canvas><canvas class="s2d-chart"></canvas></div>' +
                '<div class="s2d-summary"><h5>Resultados que se obtienen con estos parámetros</h5><div class="s2d-sumtiles"></div></div>' +
              '</section>' +
            '</div>';
        host.innerHTML = html;
        var q = function (s) { return host.querySelector(s); };
        this.root = q('.s2d');
        this.cv = q('.s2d-stage'); this.charts = Array.prototype.slice.call(host.querySelectorAll('.s2d-chart'));
        this.led = q('.s2d-led'); this.playBtn = q('.s2d-play'); this.scrub = q('.s2d-scrub');
        this.tiles = {}; host.querySelectorAll('.s2d-tile').forEach(function (t) { self.tiles[t.getAttribute('data-k')] = t.querySelector('strong'); });
        this.sumBox = q('.s2d-sumtiles');

        /* eventos */
        host.querySelectorAll('[data-fid]').forEach(function (inp) {
            inp.addEventListener('input', function () {
                var f = def.fields.filter(function (x) { return x.id === inp.getAttribute('data-fid'); })[0];
                self.P[f.id] = f.type === 'select' ? inp.value : parseFloat(inp.value);
                var out = host.querySelector('[data-out="' + f.id + '"]'); if (out && f.type !== 'select') out.textContent = H.fmt(self.P[f.id], f.dec);
                if (f.type !== 'select') paintRange(inp);
                self.recalc();
            });
            if (inp.type === 'range') paintRange(inp);
        });
        this.playBtn.addEventListener('click', function () { self.toggle(); });
        q('.s2d-reset').addEventListener('click', function () { self.reset(); });
        q('.s2d-speed').addEventListener('change', function (e) { self.speed = parseFloat(e.target.value) || 1; });
        this.scrub.addEventListener('input', function () { self.pause(); self.p = self.scrub.value / 1000; self.draw(); });
        this.onResize = function () { self.draw(); };
        global.addEventListener('resize', this.onResize);
        this.recalc();
    }
    function paintRange(inp) {
        var pct = (inp.value - inp.min) / (inp.max - inp.min) * 100;
        inp.style.setProperty('--pct', pct + '%');
    }
    function fieldHtml(f, v) {
        if (f.type === 'select') {
            return '<label class="s2d-field"><span class="s2d-flab">' + esc(f.label) + '</span><select data-fid="' + f.id + '">' +
                f.options.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
        }
        return '<label class="s2d-field"><span class="s2d-flab">' + esc(f.label) + '<output data-out="' + f.id + '">' + H.fmt(v, f.dec) + '</output><u>' + esc(f.unit) + '</u></span>' +
            '<input type="range" data-fid="' + f.id + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + v + '"></label>';
    }

    Runner.prototype.recalc = function () {
        this.M = this.def.model(this.P);
        var T = this.sumBox, items = this.def.summary(this.P, this.M);
        T.innerHTML = items.map(function (s) {
            return '<div class="s2d-sum' + (s.hi ? ' is-hi' : '') + '"><span>' + esc(s.label) + '</span><strong>' + esc(s.value) + '</strong><small>' + esc(s.unit) + '</small></div>';
        }).join('');
        this.draw();
    };
    Runner.prototype.toggle = function () {
        if (this.running) this.pause(); else this.start();
    };
    Runner.prototype.start = function () {
        if (this.p >= 1) this.p = 0;
        this.running = true; this.last = 0;
        this.playBtn.classList.add('is-on'); this.playBtn.innerHTML = '<span>❚❚</span> Pausar';
        var self = this;
        (function loop(ts) {
            if (self.dead || !self.running) return;
            if (!self.last) self.last = ts;
            var dt = Math.min(0.05, (ts - self.last) / 1000); self.last = ts;
            self.tick += dt * 60;
            self.p = Math.min(1, self.p + dt * self.speed / self.def.duration);
            self.draw();
            if (self.p >= 1) { self.pause(true); return; }
            self.raf = global.requestAnimationFrame(loop);
        })(performance.now());
    };
    Runner.prototype.pause = function (done) {
        this.running = false; if (this.raf) global.cancelAnimationFrame(this.raf);
        this.playBtn.classList.remove('is-on');
        this.playBtn.innerHTML = done ? '<span>↻</span> Repetir ensayo' : (this.p > 0 ? '<span>▶</span> Continuar' : '<span>▶</span> Iniciar ensayo');
        this.draw();
    };
    Runner.prototype.reset = function () {
        this.running = false; if (this.raf) global.cancelAnimationFrame(this.raf);
        this.p = 0; this.tick = 0; this.playBtn.classList.remove('is-on'); this.playBtn.innerHTML = '<span>▶</span> Iniciar ensayo';
        this.draw();
    };
    Runner.prototype.draw = function () {
        if (this.dead || !this.M) return;
        var d = this.def, S = d.at(this.P, this.M, this.p);
        var ctx = H.prep(this.cv, 800, 460);
        d.stage(ctx, 800, 460, this.P, this.M, S, this.p, this.tick);
        var P = this.P, M = this.M, p = this.p;
        this.charts.forEach(function (cv, i) {
            var c = d.charts[i]; if (!c) return;
            var cx = H.prep(cv, c.W, c.H); c.draw(cx, c.W, c.H, P, M, S, p);
        });
        var self = this;
        d.readouts.forEach(function (r) {
            var v = S[r.k];
            if (self.def.key === 'triaxial' && r.k === 'u' && self.P.tipo !== 'CU') { self.tiles[r.k].textContent = '—'; return; }
            self.tiles[r.k].textContent = p <= 0 && r.k !== 'sn' && r.k !== 's3' ? H.fmt(0, r.dec) : H.fmt(v, r.dec);
        });
        var st = d.estado(S, p);
        this.led.className = 's2d-led ' + st.cls; this.led.querySelector('b').textContent = st.txt;
        this.root.classList.toggle('is-finished', p >= 1);
        if (!this.running) this.scrub.value = Math.round(p * 1000); else this.scrub.value = Math.round(p * 1000);
    };
    Runner.prototype.destroy = function () {
        this.dead = true; this.running = false;
        if (this.raf) global.cancelAnimationFrame(this.raf);
        global.removeEventListener('resize', this.onResize);
    };

    /* ======================= integración con la pantalla ======================= */
    function wire() {
        buildHub();
        var scr = $('pantallaSuelos2');
        if (scr) {
            scr.querySelectorAll('.submenu-tabs .tab-btn').forEach(function (b) {
                b.addEventListener('click', function () { if (b.getAttribute('data-tab') !== 'ms2-simuladores' && current) close(); });
            });
        }
        var back = $('btnVolverSuelos2');
        if (back) back.addEventListener('click', function () { if (current) close(); });
    }
    global.GeoSimHub = { open: open, close: close };
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', wire); else wire();
})(window);

/* ============================================================================
 * Inicializador de los hubs de simuladores (Mecánica de Suelos I y II)
 * Cada hub monta sus tarjetas 2D/3D usando las definiciones registradas en
 * GeoSim2D (2D) y GeoLab3D (3D). Sin duplicar el motor 2D.
 * ========================================================================== */
(function (global) {
    'use strict';
    var G = global.GeoSim2D;
    if (!G) return;
    var H = G.H, doc = document;

    function $(id) { return doc.getElementById(id); }
    function el(tag, cls, html) { var e = doc.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    /* ------------------- MOTOR 2D (compartido con MS1 y MS2) ------------------- */
    function Runner(def, host, dataStore) {
        var self = this;
        this.def = def; this.p = 0; this.running = false; this.tick = 0; this.last = 0; this.raf = 0; this.speed = 1; this.dead = false;
        this.P = {}; this.dataStore = dataStore || '__datosEnsayoMS2';
        def.fields.forEach(function (f) { self.P[f.id] = f.value; });
        this.fromData = null;
        try {
            var store = global[self.dataStore];
            var bag = store && store[def.key];
            this.fromData = bag && def.fromData ? def.fromData(bag) : null;
        } catch (e) {}
        if (this.fromData) Object.keys(this.fromData).forEach(function (k) { self.P[k] = self.fromData[k]; });

        var html =
            '<div class="s2d" style="--a:' + def.accent + ';--rgb:' + def.rgb + '">' +
              '<aside class="s2d-ctrl">' +
                '<h5><i></i>Parámetros</h5>' +
                '<div class="s2d-fields">' + def.fields.map(function (f) { return fieldHtml(f, self.P[f.id]); }).join('') + '</div>' +
                (this.fromData ? '<p class="s2d-note">Se cargaron tus resultados de <b>Ensayos</b>. Puedes modificarlos libremente.</p>' : '') +
                '<div class="s2d-btns"><button type="button" class="s2d-play"><span>▶</span> Iniciar ensayo</button><button type="button" class="s2d-reset" title="Reiniciar">↺</button></div>' +
                '<label class="s2d-row"><span>Velocidad de animación</span><select class="s2d-speed"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option><option value="4">4×</option></select></label>' +
                '<label class="s2d-row"><span>Línea de tiempo</span><input type="range" class="s2d-scrub" min="0" max="1000" value="0"></label>' +
              '</aside>' +
              '<section class="s2d-main">' +
                '<div class="s2d-stagewrap"><canvas class="s2d-stage" aria-label="Simulación de la máquina"></canvas>' +
                  '<div class="s2d-led"><i></i><b>Listo</b></div><div class="s2d-tag">' + esc(def.machine || def.title) + '</div></div>' +
                '<div class="s2d-readouts">' + def.readouts.map(function (r) {
                    return '<div class="s2d-tile" data-k="' + r.k + '"><span>' + r.label + '</span><strong>—</strong><small>' + r.unit + '</small></div>'; }).join('') + '</div>' +
                '<div class="s2d-charts"><canvas class="s2d-chart"></canvas><canvas class="s2d-chart"></canvas></div>' +
                '<div class="s2d-summary"><h5>Resultados que se obtienen con estos parámetros</h5><div class="s2d-sumtiles"></div></div>' +
              '</section>' +
            '</div>';
        host.innerHTML = html;
        var q = function (s) { return host.querySelector(s); };
        this.root = q('.s2d');
        this.cv = q('.s2d-stage'); this.charts = Array.prototype.slice.call(host.querySelectorAll('.s2d-chart'));
        this.led = q('.s2d-led'); this.playBtn = q('.s2d-play'); this.scrub = q('.s2d-scrub');
        this.tiles = {}; host.querySelectorAll('.s2d-tile').forEach(function (t) { self.tiles[t.getAttribute('data-k')] = t.querySelector('strong'); });
        this.sumBox = q('.s2d-sumtiles');

        host.querySelectorAll('[data-fid]').forEach(function (inp) {
            inp.addEventListener('input', function () {
                var f = def.fields.filter(function (x) { return x.id === inp.getAttribute('data-fid'); })[0];
                self.P[f.id] = f.type === 'select' ? inp.value : parseFloat(inp.value);
                var out = host.querySelector('[data-out="' + f.id + '"]'); if (out && f.type !== 'select') out.textContent = H.fmt(self.P[f.id], f.dec);
                if (f.type !== 'select') paintRange(inp);
                self.recalc();
            });
            if (inp.type === 'range') paintRange(inp);
        });
        this.playBtn.addEventListener('click', function () { self.toggle(); });
        q('.s2d-reset').addEventListener('click', function () { self.reset(); });
        q('.s2d-speed').addEventListener('change', function (e) { self.speed = parseFloat(e.target.value) || 1; });
        this.scrub.addEventListener('input', function () { self.pause(); self.p = self.scrub.value / 1000; self.draw(); });
        this.onResize = function () { self.draw(); };
        global.addEventListener('resize', this.onResize);
        this.recalc();
    }
    function paintRange(inp) {
        var pct = (inp.value - inp.min) / (inp.max - inp.min) * 100;
        inp.style.setProperty('--pct', pct + '%');
    }
    function fieldHtml(f, v) {
        if (f.type === 'select') {
            return '<label class="s2d-field"><span class="s2d-flab">' + esc(f.label) + '</span><select data-fid="' + f.id + '">' +
                f.options.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
        }
        return '<label class="s2d-field"><span class="s2d-flab">' + esc(f.label) + '<output data-out="' + f.id + '">' + H.fmt(v, f.dec) + '</output><u>' + esc(f.unit) + '</u></span>' +
            '<input type="range" data-fid="' + f.id + '" min="' + f.min + '" max="' + f.max + '" step="' + f.step + '" value="' + v + '"></label>';
    }
    Runner.prototype.recalc = function () {
        this.M = this.def.model(this.P);
        var T = this.sumBox, items = this.def.summary(this.P, this.M);
        T.innerHTML = items.map(function (s) {
            return '<div class="s2d-sum' + (s.hi ? ' is-hi' : '') + '"><span>' + esc(s.label) + '</span><strong>' + esc(s.value) + '</strong><small>' + esc(s.unit) + '</small></div>';
        }).join('');
        this.draw();
    };
    Runner.prototype.toggle = function () { if (this.running) this.pause(); else this.start(); };
    Runner.prototype.start = function () {
        if (this.p >= 1) this.p = 0;
        this.running = true; this.last = 0;
        this.playBtn.classList.add('is-on'); this.playBtn.innerHTML = '<span>❚❚</span> Pausar';
        var self = this;
        (function loop(ts) {
            if (self.dead || !self.running) return;
            if (!self.last) self.last = ts;
            var dt = Math.min(0.05, (ts - self.last) / 1000); self.last = ts;
            self.tick += dt * 60;
            self.p = Math.min(1, self.p + dt * self.speed / self.def.duration);
            self.draw();
            if (self.p >= 1) { self.pause(true); return; }
            self.raf = global.requestAnimationFrame(loop);
        })(performance.now());
    };
    Runner.prototype.pause = function (done) {
        this.running = false; if (this.raf) global.cancelAnimationFrame(this.raf);
        this.playBtn.classList.remove('is-on');
        this.playBtn.innerHTML = done ? '<span>↻</span> Repetir ensayo' : (this.p > 0 ? '<span>▶</span> Continuar' : '<span>▶</span> Iniciar ensayo');
        this.draw();
    };
    Runner.prototype.reset = function () {
        this.running = false; if (this.raf) global.cancelAnimationFrame(this.raf);
        this.p = 0; this.tick = 0; this.playBtn.classList.remove('is-on'); this.playBtn.innerHTML = '<span>▶</span> Iniciar ensayo';
        this.draw();
    };
    Runner.prototype.draw = function () {
        if (this.dead || !this.M) return;
        var d = this.def, S = d.at(this.P, this.M, this.p);
        var ctx = H.prep(this.cv, 800, 460);
        d.stage(ctx, 800, 460, this.P, this.M, S, this.p, this.tick);
        var P = this.P, M = this.M, p = this.p;
        this.charts.forEach(function (cv, i) {
            var c = d.charts[i]; if (!c) return;
            var cx = H.prep(cv, c.W, c.H); c.draw(cx, c.W, c.H, P, M, S, p);
        });
        var self = this;
        d.readouts.forEach(function (r) {
            var v = S[r.k];
            if (self.def.key === 'triaxial' && r.k === 'u' && self.P.tipo !== 'CU') { self.tiles[r.k].textContent = '—'; return; }
            if (r.txt) { self.tiles[r.k].textContent = v == null ? '—' : String(v); return; }
            self.tiles[r.k].textContent = p <= 0 && r.k !== 'sn' && r.k !== 's3' ? H.fmt(0, r.dec) : H.fmt(v, r.dec);
        });
        var st = d.estado(S, p);
        this.led.className = 's2d-led ' + st.cls; this.led.querySelector('b').textContent = st.txt;
        this.root.classList.toggle('is-finished', p >= 1);
        this.scrub.value = Math.round(p * 1000);
    };
    Runner.prototype.destroy = function () {
        this.dead = true; this.running = false;
        if (this.raf) global.cancelAnimationFrame(this.raf);
        global.removeEventListener('resize', this.onResize);
    };

    /* ------------------------- HUB GENÉRICO ------------------------- */
    function buildHub(cfg) {
        var hub = $(cfg.hub), panel = $(cfg.panel), grid = $(cfg.grid);
        if (!hub || !panel || !grid) return null;

        grid.innerHTML = '';
        grid.classList.add('simhub-grid');
        cfg.keys.forEach(function (k, i) {
            var d = G.defs[k]; if (!d) return;
            var card = el('article', 'simcard');
            card.style.setProperty('--a', d.accent); card.style.setProperty('--rgb', d.rgb);
            var g = d.glyph || '';
            card.innerHTML =
                '<div class="simcard-glow"></div>' +
                '<div class="simcard-head"><em class="simcard-num">' + esc(d.num || (i + 1 < 10 ? '0' + (i + 1) : i + 1)) + '</em><div class="simcard-glyph">' + g + '</div></div>' +
                '<h4>' + esc(d.title) + '</h4>' +
                '<p>' + esc(d.desc) + '</p>' +
                '<div class="simcard-chips">' + (d.chips || []).map(function (c) { return '<em>' + esc(c) + '</em>'; }).join('') + '</div>' +
                '<small class="simcard-norma">' + esc(d.norma || '') + '</small>' +
                '<div class="simcard-btns">' +
                  '<button type="button" class="simcard-btn is-2d" data-sim-open="' + k + '" data-mode="2d"><b>2D</b><span>Simulador 2D</span><i>Curvas en vivo</i></button>' +
                  '<button type="button" class="simcard-btn is-3d" data-sim-open="' + k + '" data-mode="3d"><b>3D</b><span>Simulador 3D</span><i>' + esc(cfg.machineHint || 'Máquina completa') + '</i></button>' +
                '</div>';
            grid.appendChild(card);
        });

        var current = null;

        function open(key, mode) {
            var d = G.defs[key]; if (!d) return;
            closeBody();
            var shell = el('div', 'simhub-shell');
            shell.style.setProperty('--a', d.accent); shell.style.setProperty('--rgb', d.rgb);
            shell.innerHTML =
                '<div class="simhub-topbar">' +
                  '<button type="button" class="btn-volver simhub-back">← Simuladores</button>' +
                  '<nav class="simhub-crumbs"><span>' + esc(cfg.label) + '</span><i>/</i><span>Simuladores</span><i>/</i><b>' + esc(d.title) + '</b></nav>' +
                  '<div class="simhub-mode" role="tablist" aria-label="Tipo de simulador">' +
                    '<button type="button" role="tab" data-mode="2d">2D</button><button type="button" role="tab" data-mode="3d">3D</button>' +
                  '</div>' +
                '</div>' +
                '<header class="simhub-phero">' +
                  '<div class="simhub-phero-icon">' + (d.glyph || '') + '</div>' +
                  '<div class="simhub-phero-text"><em class="simhub-phero-eyebrow"></em><h2>' + esc(d.title) + '</h2><p class="simhub-phero-desc"></p></div>' +
                  '<ul class="simhub-phero-meta"><li><b>Normativa</b><span>' + esc(d.norma || '') + '</span></li><li><b>Parámetros</b><span>' + esc((d.chips || []).join(' · ')) + '</span></li></ul>' +
                '</header>' +
                '<div class="simhub-body"></div>';
            panel.innerHTML = ''; panel.appendChild(shell);
            hub.style.display = 'none'; panel.style.display = 'block';
            shell.querySelector('.simhub-back').addEventListener('click', close);
            shell.querySelectorAll('.simhub-mode button').forEach(function (b) {
                b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
            });
            current = { key: key, mode: null, runner: null, shell: shell };
            setMode(mode === '3d' ? '3d' : '2d');
            global.scrollTo(0, 0);
        }

        function setMode(mode) {
            if (!current) return;
            var d = G.defs[current.key], shell = current.shell, body = shell.querySelector('.simhub-body');
            closeBody();
            current.mode = mode;
            shell.querySelectorAll('.simhub-mode button').forEach(function (b) {
                var on = b.getAttribute('data-mode') === mode; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            shell.querySelector('.simhub-phero-eyebrow').textContent = 'Simulador ' + mode.toUpperCase() + ' · Laboratorio virtual';
            shell.querySelector('.simhub-phero-desc').textContent = mode === '2d'
                ? 'Ajusta los parámetros del suelo, inicia el ensayo y observa la máquina, las lecturas y las curvas en tiempo real.'
                : 'Recorre ' + ((d.machine || d.title) + '').toLowerCase() + ' en 3D: reproduce la secuencia, rota la vista, usa la rueda para acercar y consulta cada componente.';
            body.innerHTML = '';
            if (mode === '3d') {
                var host = el('div', 'simhub-3d-host'); body.appendChild(host);
                if (!global.GeoLab3D) host.innerHTML = '<p class="login-hint">El módulo 3D no está disponible.</p>';
                else current.inst = global.GeoLab3D.mount(host, current.key);
            } else {
                current.runner = new Runner(d, body, cfg.dataStore);
            }
        }

        function closeBody() {
            if (current && current.runner) { current.runner.destroy(); current.runner = null; }
            if (current && current.inst) {
                try { current.inst.dispose(); } catch (e) { if (global.GeoLab3D) global.GeoLab3D.disposeAll(); }
                current.inst = null;
            }
        }
        function close() {
            closeBody(); current = null;
            panel.style.display = 'none'; panel.innerHTML = ''; hub.style.display = '';
            global.scrollTo(0, 0);
        }

        grid.querySelectorAll('[data-sim-open]').forEach(function (b) {
            b.addEventListener('click', function () { open(b.getAttribute('data-sim-open'), b.getAttribute('data-mode')); });
        });

        /* cerrar el simulador al salir de la pestaña o de la sección */
        cfg.tabsRoots.forEach(function (rootId) {
            var scr = $(rootId);
            if (!scr) return;
            scr.querySelectorAll('.submenu-tabs .tab-btn').forEach(function (b) {
                b.addEventListener('click', function () { if (b.getAttribute('data-tab') !== cfg.tabId && current) close(); });
            });
        });
        cfg.backBtns.forEach(function (id) {
            var bt = $(id);
            if (bt) bt.addEventListener('click', function () { if (current) close(); });
        });

        return { open: open, close: close };
    }

    /* --------------------- HUBS CONFIGURADOS --------------------- */
    function initHubs() {
        var h1 = buildHub({
            hub: 'simhub-ms1', panel: 'simhub-panel-ms1', grid: 'simhub-grid-ms1',
            label: 'Mecánica de Suelos I', tabId: 'ms1-simuladores',
            keys: ['humedad', 'granulometria', 'limites', 'gravedad', 'compactacion', 'densidad', 'clasificacion', 'permeabilidad'],
            tabsRoots: ['pantallaSuelos'], backBtns: ['btnVolverSuelos'], machineHint: 'Equipo completo',
            dataStore: '__datosEnsayo'
        });

        /* RM: las tarjetas ya existen en el HTML; solo se engancha el 3D */
        function initRM() {
            var panel = $('rm-sim3d');
            var host3d = null, inst = null;
            function cerrar3d() {
                if (inst) { try { inst.dispose(); } catch (e) { if (global.GeoLab3D) global.GeoLab3D.disposeAll(); } inst = null; }
                if (panel) { panel.style.display = 'none'; panel.innerHTML = ''; }
                var grid = $('rm-sims-grid'); if (grid) grid.style.display = '';
                var launcher = document.querySelector('#rm-sim3d-launcher'); if (launcher) launcher.style.display = '';
            }
            function abrir3d(tipo) {
                var grid = $('rm-sims-grid');
                if (!panel || !global.GeoLab3D) { if (grid) grid.style.display = ''; return; }
                var sceneKey = 'rm-' + tipo;
                if (!global.GeoLab3D.meta[sceneKey]) sceneKey = tipo;
                if (grid) grid.style.display = 'none';
                panel.style.display = 'block';
                var shell = el('div', 'simhub-shell');
                shell.innerHTML =
                    '<div class="simhub-topbar">' +
                      '<button type="button" class="btn-volver simhub-back">← Simuladores</button>' +
                      '<nav class="simhub-crumbs"><span>Resistencia de Materiales</span><i>/</i><span>Simuladores 3D</span></nav>' +
                    '</div>' +
                    '<div class="simhub-body"></div>';
                panel.innerHTML = ''; panel.appendChild(shell);
                var host = el('div', 'simhub-3d-host');
                shell.querySelector('.simhub-body').appendChild(host);
                shell.querySelector('.simhub-back').addEventListener('click', cerrar3d);
                try { inst = global.GeoLab3D.mount(host, tipo); } catch (e) { host.innerHTML = '<p class="login-hint">No se pudo iniciar el visor 3D.</p>'; }
                global.scrollTo(0, 0);
            }
            document.querySelectorAll('#rm-simuladores [data-rm-3d]').forEach(function (b) {
                b.addEventListener('click', function () { abrir3d(b.getAttribute('data-rm-3d')); });
            });
            var scr = $('pantallaResistencia');
            if (scr) scr.querySelectorAll('.submenu-tabs .tab-btn').forEach(function (b) {
                b.addEventListener('click', function () { if (b.getAttribute('data-tab') !== 'rm-simuladores') cerrar3d(); });
            });
            var back = $('btnVolverResistencia');
            if (back) back.addEventListener('click', cerrar3d);
            return { abrir3d: abrir3d, cerrar3d: cerrar3d };
        }

        global.GeoSimHubMS1 = h1;
        global.GeoSimHubRM3D = initRM();
    }

    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', initHubs); else initHubs();
})(window);
