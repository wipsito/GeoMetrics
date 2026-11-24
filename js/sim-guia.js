/**
 * GeoMetrics — GUÍA PASO A PASO DETALLADA para todos los simuladores 2D y 3D.
 *
 * Cada ensayo tiene una guía (js/sim-guia-*.js) con fichas muy detalladas: para qué sirve el paso, qué se hace
 * (sub-pasos numerados), qué tocar u observar en el simulador, el cálculo con un ejemplo numérico y los errores
 * comunes. Este archivo monta el panel de la guía en cada simulador y lo sincroniza con el paso que se está
 * ejecutando (2D, 3D, Estructuras, Mezclas, bulbos/incrementos y prensa 3D) sin modificar los simuladores.
 *
 * API:  GeoGuia.add(clave, { n: nombre, norma: '…' }, [ { k:'palabras clave', t:'título', p:'para qué',
 *                     h:['sub-paso 1', …], s:'en el simulador', c:'cálculo', o:'errores comunes' }, … ])
 */
(function (global) {
    'use strict';
    var doc = document;
    var G = global.GeoGuia = global.GeoGuia || { data: {} };
    G.data = G.data || {};
    G.add = function (key, meta, fichas) { G.data[key] = { meta: meta || {}, f: fichas || [] }; };
    var ALIAS = { rev: 'dm_rev', comp: 'dm_comp', aci: 'dm_aci', aci211: 'dm_aci', agg: 'dm_agg' };
    function clave(k) { k = String(k || ''); return ALIAS[k] || k; }

    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function norm(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9σφτεγρδ ]+/g, ' '); }
    function tokens(s) { return norm(s).split(/\s+/).filter(function (w) { return w.length >= 3 && !/^(del|las|los|una|con|por|para|que|cada|the)$/.test(w); }).map(function (w) { return w.length > 4 ? w.replace(/(es|s)$/, '') : w; }); }

    /* ficha que corresponde a un paso del simulador (por palabras clave; si no hay coincidencia, por posición) */
    G.match = function (key, titulo, idx, n) {
        var g = G.data[clave(key)]; if (!g || !g.f.length) return 0;
        var tk = tokens(titulo), best = -1, bestS = 0;
        g.f.forEach(function (f, i) {
            var base = ' ' + tokens((f.k || '') + ' ' + f.t).join(' ') + ' ', s = 0;
            tk.forEach(function (w) { if (base.indexOf(' ' + w) >= 0) s += 1; });
            if (s > bestS || (s === bestS && s > 0 && best >= 0 && n > 1 && Math.abs(i / (g.f.length - 1) - idx / (n - 1)) < Math.abs(best / (g.f.length - 1) - idx / (n - 1)))) { bestS = s; best = i; }
        });
        if (best >= 0 && bestS > 0) return best;
        if (n > 1 && idx != null) return Math.max(0, Math.min(g.f.length - 1, Math.round(idx / (n - 1) * (g.f.length - 1))));
        return 0;
    };

    function fichaHtml(f) {
        ['p', 's', 'c', 'o'].forEach(function (k) { if (f[k] && /^\s*[—-]\s*$/.test(f[k])) f[k] = ''; });   /* sin secciones vacías */
        return '<div class="gg-ficha">' +
            (f.p ? '<section class="gg-b gg-para"><h6>🎯 Para qué sirve este paso</h6><p>' + esc(f.p) + '</p></section>' : '') +
            (f.h && f.h.length ? '<section class="gg-b gg-hacer"><h6>🖐 Qué haces, paso por paso</h6><ol>' + f.h.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></section>' : '') +
            (f.s ? '<section class="gg-b gg-sim"><h6>🕹 En el simulador</h6><p>' + esc(f.s) + '</p></section>' : '') +
            (f.c ? '<section class="gg-b gg-calc"><h6>🧮 Cálculo y ejemplo</h6><pre>' + esc(f.c) + '</pre></section>' : '') +
            (f.o ? '<section class="gg-b gg-ojo"><h6>⚠️ Errores comunes y cómo evitarlos</h6><p>' + esc(f.o) + '</p></section>' : '') +
            '</div>';
    }

    /* ------------------------------ panel ------------------------------ */
    function Panel(key) {
        this.key = clave(key); this.i = 0; this.follow = true; this.all = false;
        var g = G.data[this.key], m = g.meta, self = this;
        var el = this.el = doc.createElement('section');
        el.className = 'gg'; el.setAttribute('data-gg', this.key);
        el.innerHTML =
            '<header class="gg-head"><div class="gg-tit"><span class="gg-ico" aria-hidden="true">📘</span><div><em>Guía detallada paso a paso</em><strong>' + esc(m.n || '') + '</strong></div></div>' +
            (m.norma ? '<code class="gg-norma">' + esc(m.norma) + '</code>' : '') + '</header>' +
            '<div class="gg-nav">' +
              '<button type="button" class="gg-prev" aria-label="Paso anterior">◀ Anterior</button>' +
              '<div class="gg-pos" aria-live="polite"><span class="gg-n"></span><b class="gg-t"></b></div>' +
              '<button type="button" class="gg-next" aria-label="Paso siguiente">Siguiente ▶</button>' +
            '</div>' +
            '<div class="gg-dots" role="list"></div>' +
            '<div class="gg-opts"><label><input type="checkbox" class="gg-follow" checked> <span>Seguir la simulación (la guía cambia sola con cada paso)</span></label>' +
              '<button type="button" class="gg-allbtn" aria-expanded="false">📋 Ver todos los pasos</button></div>' +
            '<div class="gg-body"></div>' +
            '<div class="gg-list" hidden></div>';
        var dots = el.querySelector('.gg-dots');
        g.f.forEach(function (f, i) {
            var b = doc.createElement('button'); b.type = 'button'; b.className = 'gg-dot'; b.textContent = i + 1; b.title = 'Paso ' + (i + 1) + ': ' + f.t;
            b.addEventListener('click', function () { self.go(i, true); }); dots.appendChild(b);
        });
        el.querySelector('.gg-list').innerHTML = g.f.map(function (f, i) {
            return '<details class="gg-item"' + (i === 0 ? ' open' : '') + '><summary><span>Paso ' + (i + 1) + '</span>' + esc(f.t) + '</summary>' + fichaHtml(f) + '</details>';
        }).join('');
        el.querySelector('.gg-prev').addEventListener('click', function () { self.go(self.i - 1, true); });
        el.querySelector('.gg-next').addEventListener('click', function () { self.go(self.i + 1, true); });
        el.querySelector('.gg-follow').addEventListener('change', function () { self.follow = this.checked; });
        el.querySelector('.gg-allbtn').addEventListener('click', function () {
            self.all = !self.all; this.setAttribute('aria-expanded', String(self.all));
            this.textContent = self.all ? '🔎 Ver solo el paso actual' : '📋 Ver todos los pasos';
            el.querySelector('.gg-list').hidden = !self.all; el.querySelector('.gg-body').hidden = self.all; el.querySelector('.gg-nav').hidden = self.all; dots.hidden = self.all;
        });
        this.go(0, false);
    }
    Panel.prototype.go = function (i, manual) {
        var g = G.data[this.key], n = g.f.length;
        i = Math.max(0, Math.min(n - 1, i));
        if (manual && this.follow && this.sync) { this.follow = false; var cb = this.el.querySelector('.gg-follow'); if (cb) cb.checked = false; }   /* navegar a mano pausa el seguimiento */
        if (i === this.i && this.el.querySelector('.gg-body').innerHTML) return;
        this.i = i;
        var f = g.f[i];
        this.el.querySelector('.gg-n').textContent = 'Paso ' + (i + 1) + ' de ' + n;
        this.el.querySelector('.gg-t').textContent = f.t;
        this.el.querySelector('.gg-body').innerHTML = fichaHtml(f);
        this.el.querySelector('.gg-prev').disabled = i === 0;
        this.el.querySelector('.gg-next').disabled = i === n - 1;
        var ds = this.el.querySelectorAll('.gg-dot');
        for (var k = 0; k < ds.length; k++) { ds[k].classList.toggle('on', k === i); ds[k].classList.toggle('done', k < i); }
    };
    Panel.prototype.seguir = function (titulo, idx, n) {
        this.sync = true;
        if (!this.follow) return;
        this.go(G.match(this.key, titulo, idx, n), false);
    };

    /* «Paso 3 / 9» → [2, 9] */
    function posDe(txt) { var m = /(\d+)\s*(?:\/|de)\s*(\d+)/.exec(String(txt || '')); return m ? [+m[1] - 1, +m[2]] : [null, null]; }
    function vigilar(nodo, fn) {
        if (!nodo || nodo.__ggObs) return; nodo.__ggObs = true;
        var t = 0, mo = new MutationObserver(function () { clearTimeout(t); t = setTimeout(fn, 60); });
        mo.observe(nodo, { childList: true, characterData: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        fn();
    }
    function montar(ref, key, donde) {
        key = clave(key);
        if (!G.data[key]) return null;
        var host = ref.parentNode; if (!host) return null;
        var prev = donde === 'despues' ? ref.nextElementSibling : null;
        if (prev && prev.classList && prev.classList.contains('gg')) return prev.__gg;
        if (ref.__gg) return ref.__gg;
        var p = new Panel(key);
        p.el.__gg = p; ref.__gg = p;
        if (donde === 'dentro') ref.appendChild(p.el);
        else host.insertBefore(p.el, ref.nextSibling);
        return p;
    }

    /* ------------------------------ detección de simuladores ------------------------------ */
    var EST_KEYS = ['viga', 'voladizo', 'cercha', 'portico', 'continuas'];
    function claveEst(texto) {
        var best = null, bs = 0;
        EST_KEYS.forEach(function (k) {
            if (!G.data[k]) return;
            var s = 0, tk = tokens(texto);
            G.data[k].f.forEach(function (f) { var b = ' ' + tokens(f.k + ' ' + f.t).join(' ') + ' '; tk.forEach(function (w) { if (b.indexOf(' ' + w) >= 0) s++; }); });
            if (s > bs) { bs = s; best = k; }
        });
        return best;
    }
    var DM_TITULOS = [[/revenimiento|asentamiento/i, 'dm_rev'], [/compresi/i, 'dm_comp'], [/aci/i, 'dm_aci'], [/combinaci/i, 'dm_agg']];

    function escanear() {
        /* 1 · simuladores 2D de Suelos I, Suelos II y Resistencia (sim-hub) */
        doc.querySelectorAll('.s2d-pasos[data-key]').forEach(function (ps) {
            /* debajo de todo el simulador (a todo el ancho), no en la columna lateral */
            var p = montar(ps.closest('.s2d') || ps, ps.getAttribute('data-key'), 'despues'); if (!p) return;
            var ban = ps.querySelector('.s2d-paso-banner');
            vigilar(ban, function () { var pos = posDe((ban.querySelector('span') || {}).textContent); p.seguir((ban.querySelector('strong') || {}).textContent, pos[0], pos[1]); });
        });
        /* 2 · laboratorios 3D (Suelos, Resistencia, Mezclas y Estructuras) */
        doc.querySelectorAll('.lab3d[data-tipo]').forEach(function (lab) {
            var foot = lab.querySelector(':scope > .lab3d-footer'); if (!foot) return;
            var p = montar(foot, lab.getAttribute('data-tipo'), 'despues'); if (!p) return;
            var paso = lab.querySelector('.lab3d-paso');
            vigilar(paso, function () {
                var t = paso.querySelector('.lab3d-paso-t'), n = paso.querySelector('.lab3d-paso-n'), pos = posDe(n && n.textContent);
                p.seguir(t && t.textContent, pos[0], pos[1]);
            });
        });
        /* 3 · Estructuras 2D (est-sim) */
        var es = doc.getElementById('esimStep');
        if (es && es.querySelector('.est-stepdots')) {
            var sec0 = es.closest('section') || es, sec = (sec0.parentElement && sec0.parentElement.id !== 'pantallaEstructuras') ? sec0.parentElement : sec0;   /* debajo de toda la cuadrícula del simulador */
            var titulos = [].map.call(es.querySelectorAll('.est-stepdots button'), function (b) { return b.title; }).join(' ');
            var k = claveEst(titulos);
            if (k) {
                var nx = sec.nextElementSibling;
                if (nx && nx.classList.contains('gg') && nx.getAttribute('data-gg') !== k) { nx.remove(); sec.__gg = null; es.__ggObs = false; }
                var p3 = montar(sec, k, 'despues');
                if (p3) vigilar(es, function () { var b = es.querySelector('.est-steptxt b'), pos = posDe((es.querySelector('.est-stepn') || {}).textContent); p3.seguir(b && b.textContent, pos[0], pos[1]); });
            }
        }
        /* 4 · Mezclas 2D (mezclas-sim) */
        var st = doc.getElementById('smStage');
        if (st) {
            var shell = st.closest('.simhub-shell'), grid = st.closest('.dm-simgrid'), h2 = shell && shell.querySelector('.simhub-phero-text h2');
            var kd = null; if (h2) DM_TITULOS.forEach(function (x) { if (!kd && x[0].test(h2.textContent)) kd = x[1]; });
            if (kd && grid) {
                var p4 = montar(grid, kd, 'despues');
                var ol = doc.getElementById('smSteps');
                if (p4 && ol) vigilar(ol, function () { var on = ol.querySelector('li.is-on') || ol.querySelector('li:last-child.is-done'), lis = ol.querySelectorAll('li'); if (on) p4.seguir(on.textContent, [].indexOf.call(lis, on), lis.length); });
            }
        }
        /* 5 · Suelos II: bulbos de presión, incrementos de esfuerzo y prensa 3D */
        [['card-sim-bulbos', 'bulbos'], ['card-sim-incrementos', 'incrementos']].forEach(function (x) {
            var card = doc.getElementById(x[0]); if (!card) return;
            var h = card.querySelector('h3'); if (h) montar(h, x[1], 'despues');
        });
        var pr = doc.getElementById('sim3d-prensa-container'); if (pr) montar(pr, 'inconfinada', 'despues');
    }
    var tEsc = 0;
    function programar() { clearTimeout(tEsc); tEsc = setTimeout(escanear, 250); }
    function iniciar() {
        estilos();
        escanear();
        new MutationObserver(programar).observe(doc.body, { childList: true, subtree: true });
    }

    /* ------------------------------ estilos ------------------------------ */
    function estilos() {
        if (doc.getElementById('gg-css')) return;
        var s = doc.createElement('style'); s.id = 'gg-css';
        s.textContent = [
            '.gg{--ga:var(--lab-accent,var(--a,#22d3ee));margin:18px 0 0;padding:18px 20px 20px;border-radius:18px;background:linear-gradient(160deg,#121c2f,#0b1220);border:1px solid #2b3a50;box-shadow:inset 0 2px 0 color-mix(in srgb,var(--ga) 55%,transparent);color:#dbe4f0;text-align:left;grid-column:1/-1}',
            '.gg-head{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:12px}',
            '.gg-tit{display:flex;align-items:center;gap:12px}.gg-ico{font-size:26px;line-height:1}',
            '.gg-tit em{display:block;font-style:normal;font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--ga)}.gg-tit strong{display:block;font-size:18px;color:#fff;margin-top:2px}',
            '.gg-norma{font-size:12px;padding:5px 10px;border-radius:8px;background:rgba(255,255,255,.05);border:1px solid #2b3a50;color:#9fb0c6}',
            '.gg-nav{display:grid;grid-template-columns:auto minmax(0,1fr) auto;gap:10px;align-items:center}',
            '.gg-nav button,.gg-allbtn{padding:9px 14px;border-radius:10px;border:1px solid color-mix(in srgb,var(--ga) 55%,#2b3a50);background:rgba(6,12,24,.7);color:#e6edf6;font-weight:600;font-size:13px;cursor:pointer;white-space:nowrap;width:auto;min-height:0}',
            '.gg-nav button:hover:not(:disabled),.gg-allbtn:hover{background:color-mix(in srgb,var(--ga) 18%,rgba(6,12,24,.85))}',
            '.gg-nav button:disabled{opacity:.35;cursor:default}',
            '.gg-pos{text-align:center;min-width:0}.gg-pos .gg-n{display:block;font-size:11.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ga)}.gg-pos .gg-t{display:block;font-size:16px;color:#fff;margin-top:2px}',
            '.gg-dots{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:12px 0 6px}',
            '.gg-dot{width:28px;height:28px;border-radius:50%;border:1px solid #2b3a50;background:#0f1828;color:#9fb0c6;font-size:12px;font-weight:700;cursor:pointer;padding:0;min-height:0}',
            '.gg-dot.done{background:color-mix(in srgb,var(--ga) 22%,#0f1828);color:#dbe4f0}.gg-dot.on{background:var(--ga);color:#04121c;border-color:var(--ga);box-shadow:0 0 12px color-mix(in srgb,var(--ga) 55%,transparent)}',
            '.gg-opts{display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0 12px;font-size:13px;color:#9fb0c6}',
            '.gg-opts label{display:flex;align-items:center;gap:8px;cursor:pointer}',
            '.gg-ficha{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr));gap:12px}',
            '.gg-b{padding:13px 15px;border-radius:13px;background:rgba(255,255,255,.035);border:1px solid #223047}',
            '.gg-b h6{margin:0 0 8px;font-size:12.5px;letter-spacing:.06em;text-transform:uppercase;color:#fff}',
            '.gg-b p{margin:0;font-size:14px;line-height:1.6;color:#cbd5e1}',
            '.gg-b ol{margin:0;padding-left:22px;font-size:14px;line-height:1.6;color:#cbd5e1}.gg-b ol li{margin:0 0 6px}.gg-b ol li::marker{color:var(--ga);font-weight:700}',
            '.gg-hacer{grid-column:1/-1;border-color:color-mix(in srgb,var(--ga) 40%,#223047)}',
            '.gg-calc pre{margin:0;white-space:pre-wrap;font:13px/1.65 "JetBrains Mono",Consolas,monospace;color:#a5f3fc}',
            '.gg-ojo{border-color:rgba(251,146,60,.4);background:rgba(251,146,60,.06)}.gg-ojo h6{color:#fdba74}',
            '.gg-item{margin:0 0 8px;border:1px solid #223047;border-radius:12px;background:rgba(255,255,255,.02)}',
            '.gg-item summary{cursor:pointer;padding:11px 14px;font-weight:700;color:#fff;font-size:14.5px}.gg-item summary span{display:inline-block;min-width:66px;color:var(--ga);font-size:12px;letter-spacing:.1em;text-transform:uppercase}',
            '.gg-item .gg-ficha{padding:0 12px 12px}',
            '@media (max-width:640px){.gg{padding:14px}.gg-nav{grid-template-columns:1fr 1fr}.gg-pos{grid-column:1/-1;grid-row:1}}'
        ].join('\n');
        doc.head.appendChild(s);
    }
    if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})(window);
