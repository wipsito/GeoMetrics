/* ============================================================
   GeoMetrics · Intro del fósil
   El logo se parte en tres capas, el fósil sale de la roca,
   se come un módulo y vuelve a su sitio.

   API
     GeoIntro.montar(host)       crea la escena dentro de host (una sola vez)
     GeoIntro.play(modulo)       reproduce la secuencia; devuelve una promesa
     GeoIntro.reset()            devuelve los módulos comidos
     GeoIntro.setDuracion(ms)    duración total de la transición (por defecto 4000)
     GeoIntro.duracion           duración actual en ms

   La animación completa dura siempre lo que diga setDuracion: el 75 %
   es la secuencia (despertar, correr, morder, huir) y el 25 % restante
   el remate con «ACCESO CONCEDIDO».
   ============================================================ */
(function () {
    'use strict';

    /* ---------- duración de la transición ---------- */
    var VEL = 4000;                 /* ms · cámbialo con GeoIntro.setDuracion(ms) */
    var BASE = 2025;                /* duración natural de la secuencia, sin escalar */
    var FIJO = 560;                 /* coste fijo de encadenar las animaciones (~1 cuadro por paso) */
    function K() { return Math.max(0.25, (VEL * 0.75 - FIJO) / BASE); }
    function D(ms) { return Math.max(1, Math.round(ms * K())); }
    function COLA() { return Math.max(300, Math.round(VEL * 0.25)); }

    var IMG = (window.GEO_INTRO_IMG || 'docs/intro/');

    var TPL =
        '<div class="fit"><div id="stage">' +
        '<div class="hud" style="left:30px;top:16px;border-width:2px 0 0 2px"></div>' +
        '<div class="hud" style="right:30px;top:16px;border-width:2px 2px 0 0"></div>' +
        '<div class="hud" style="left:30px;bottom:14px;border-width:0 0 2px 2px"></div>' +
        '<div class="hud" style="right:30px;bottom:14px;border-width:0 2px 2px 0"></div>' +
        '<div class="lbl" style="left:78px;top:40px">GEOMETRICS // NÚCLEO DEL LABORATORIO</div>' +
        '<div class="lbl" style="left:78px;bottom:42px">TEORÍA · ENSAYOS · SIMULADORES</div>' +
        '<div class="lbl" style="right:78px;bottom:42px"><span id="status">● SISTEMA EN LÍNEA</span></div>' +
        '<svg id="rings" viewBox="0 0 860 860" aria-hidden="true"><g fill="none">' +
        '<circle cx="430" cy="430" r="320" stroke="rgba(0,229,255,.16)"/>' +
        '<circle cx="430" cy="430" r="290" stroke="rgba(157,107,255,.3)" stroke-dasharray="2 9"/>' +
        '<circle cx="430" cy="430" r="258" stroke="rgba(0,229,255,.22)"/>' +
        '<g class="spin"><circle cx="430" cy="430" r="258" stroke="#00E5FF" stroke-width="4" stroke-linecap="round" stroke-dasharray="110 1511"/>' +
        '<circle cx="430" cy="430" r="258" stroke="#00E5FF" stroke-width="4" stroke-linecap="round" stroke-dasharray="90 1531" stroke-dashoffset="-800"/></g>' +
        '<g class="spin r2"><circle cx="430" cy="430" r="320" stroke="#9D6BFF" stroke-width="3" stroke-linecap="round" stroke-dasharray="70 1941" stroke-dashoffset="-1300"/></g>' +
        '<path d="M430 96v22M430 742v22M96 430h22M742 430h22" stroke="rgba(0,229,255,.6)" stroke-width="2"/>' +
        '<path d="M202 202l12 12M658 202l-12 12M202 658l12-12M658 658l-12-12" stroke="rgba(0,229,255,.35)" stroke-width="2"/>' +
        '</g></svg>' +
        '<div id="logo"><div id="glow"></div>' +
        '<div class="piece" id="pTop"><img alt="" src="' + IMG + 'geo-logo.png"></div>' +
        '<div class="piece" id="pMid"><img alt="GeoMetrics" src="' + IMG + 'geo-logo.png"></div>' +
        '<div class="piece" id="pBot"><img alt="" src="' + IMG + 'geo-logo.png"><img class="empty" id="pBotEmpty" alt="" src="' + IMG + 'geo-logo-sin-fosil.png"></div>' +
        '<div class="seam" id="s1" style="top:42%"></div><div class="seam" id="s2" style="top:66%"></div></div>' +
        '<button type="button" class="chip" data-k="suelos"      style="--acc:#00E5FF;left:80px;top:215px"><small>MÓDULO</small><b>Suelos</b></button>' +
        '<button type="button" class="chip" data-k="materiales"  style="--acc:#FFB547;left:625px;top:262px"><small>MÓDULO</small><b>Materiales</b></button>' +
        '<button type="button" class="chip" data-k="estructuras" style="--acc:#9D6BFF;left:95px;top:580px"><small>MÓDULO</small><b>Estructuras</b></button>' +
        '<button type="button" class="chip" data-k="civix"       style="--acc:#FF5CA8;left:635px;top:650px"><small>ASISTENTE</small><b>Civix IA</b></button>' +
        '<div id="fossil" aria-hidden="true"><div id="fInner">' +
        '<svg class="legs" id="legsFar" viewBox="0 0 229.51 99.45"></svg>' +
        '<img alt="" src="' + IMG + 'fosil-cuerpo.png">' +
        '<img id="fJaw" alt="" src="' + IMG + 'fosil-mandibula.png">' +
        '<svg class="legs" id="legsNear" viewBox="0 0 229.51 99.45"></svg>' +
        '</div></div>' +
        '<div id="digger" aria-hidden="true"><div class="dg"><img alt="" src="' + IMG + 'retroexcavadora.png"></div></div>' +
        '<div id="toast">SESIÓN INICIADA · BIENVENIDO</div>' +
        '</div></div>';

    var M = null;        /* escena montada */

    function montar(host) {
        if (M) return M;
        host = host || document.body;
        if (!host.querySelector('#stage')) host.innerHTML = TPL;

        var q = function (id) { return host.querySelector('#' + id); };
        var S = q('stage');
        if (!S) return null;

        var m = {
            host: host, S: S,
            pTop: q('pTop'), pMid: q('pMid'), pBot: q('pBot'), empty: q('pBotEmpty'),
            fossil: q('fossil'), jaw: q('fJaw'), inner: q('fInner'), digger: q('digger'),
            statusEl: q('status'), toast: q('toast'), logo: q('logo'), glow: q('glow'),
            s1: q('s1'), s2: q('s2'),
            busy: false, selected: null
        };

        var C = 430, SPLIT = 0;   /* el logo ya no se parte en capas */
        var F = { left: 280.27, top: 504.86, w: 229.51, h: 99.45, mx: 3.83, my: 34.97 };
        var HOME = { x: F.left + F.mx, y: F.top + F.my + SPLIT };

        /* ---------- patas de hueso (solo visibles fuera de la roca) ---------- */
        var NS = 'http://www.w3.org/2000/svg';
        function mk(parent, tag, attrs) {
            var e = document.createElementNS(NS, tag);
            for (var k in attrs) e.setAttribute(k, attrs[k]);
            parent.appendChild(e); return e;
        }
        function makeLeg(svg, shade, edge) {
            var g = mk(svg, 'g', {}), L = { g: g, under: [], over: [], joints: [], toes: [] }, i;
            for (i = 0; i < 3; i++) L.under.push(mk(g, 'line', { stroke: edge, 'stroke-width': 7, 'stroke-linecap': 'round' }));
            for (i = 0; i < 3; i++) L.toes.push(mk(g, 'line', { stroke: shade, 'stroke-width': 2.8, 'stroke-linecap': 'round' }));
            for (i = 0; i < 3; i++) L.over.push(mk(g, 'line', { stroke: shade, 'stroke-width': 4.6, 'stroke-linecap': 'round' }));
            for (i = 0; i < 3; i++) L.joints.push(mk(g, 'circle', { r: [6, 4.8, 4][i], fill: shade, stroke: edge, 'stroke-width': 1 }));
            return L;
        }
        function makeArm(svg, shade, edge) {
            var g = mk(svg, 'g', {}), A = { g: g, seg: [], claws: [] }, i;
            for (i = 0; i < 2; i++) A.seg.push(mk(g, 'line', { stroke: shade, 'stroke-width': 3.6, 'stroke-linecap': 'round' }));
            for (i = 0; i < 2; i++) A.claws.push(mk(g, 'line', { stroke: shade, 'stroke-width': 2, 'stroke-linecap': 'round' }));
            return A;
        }
        var BONE = '#D3D0C8', BONE_EDGE = '#8E8A80', FAR = '#A9A69E', FAR_EDGE = '#6F6C65';
        var HIP = { x: 166, y: 52 }, SHOULDER = { x: 102, y: 33 };
        var legsFar = q('legsFar'), legsNear = q('legsNear');
        var pelvis = mk(legsNear, 'path', {
            d: 'M' + (HIP.x - 16) + ' ' + (HIP.y - 6) + ' C' + (HIP.x - 8) + ' ' + (HIP.y - 14) + ' ' + (HIP.x + 12) + ' ' + (HIP.y - 14) + ' ' + (HIP.x + 18) + ' ' + (HIP.y - 5) +
               ' C' + (HIP.x + 12) + ' ' + (HIP.y + 2) + ' ' + (HIP.x + 2) + ' ' + (HIP.y + 1) + ' ' + HIP.x + ' ' + (HIP.y + 6) +
               ' C' + (HIP.x - 4) + ' ' + HIP.y + ' ' + (HIP.x - 12) + ' ' + HIP.y + ' ' + (HIP.x - 16) + ' ' + (HIP.y - 6) + 'Z',
            fill: BONE, stroke: BONE_EDGE, 'stroke-width': 1
        });
        var far = makeLeg(legsFar, FAR, FAR_EDGE), near = makeLeg(legsNear, BONE, BONE_EDGE);
        var armFar = makeArm(legsFar, FAR, FAR_EDGE), arm = makeArm(legsNear, BONE, BONE_EDGE);

        var v = function (p, a, l) { return { x: p.x - Math.sin(a) * l, y: p.y + Math.cos(a) * l }; };
        var ln = function (e, a, b) { e.setAttribute('x1', a.x); e.setAttribute('y1', a.y); e.setAttribute('x2', b.x); e.setAttribute('y2', b.y); };
        function poseLeg(L, hip, ph, amp, grow) {
            var s = Math.sin(ph);
            var a1 = 0.15 + 0.62 * s * amp;
            var a2 = a1 - 0.95 - 0.6 * Math.max(0, Math.sin(ph + 1.2)) * amp;
            var a3 = a2 + 1.15 + 0.4 * Math.max(0, -s) * amp;
            var p1 = v(hip, a1, 34), p2 = v(p1, a2, 32), p3 = v(p2, a3, 16);
            var t = 1.45 + 0.45 * Math.max(0, Math.cos(ph)) * amp;
            [[hip, p1], [p1, p2], [p2, p3]].forEach(function (par, i) { ln(L.under[i], par[0], par[1]); ln(L.over[i], par[0], par[1]); });
            [hip, p1, p2].forEach(function (p, i) { L.joints[i].setAttribute('cx', p.x); L.joints[i].setAttribute('cy', p.y); });
            [[t, 10], [t + 0.28, 9], [t - 0.32, 7]].forEach(function (par, i) { ln(L.toes[i], p3, v(p3, par[0], par[1])); });
            L.g.setAttribute('transform', 'translate(' + hip.x + ' ' + hip.y + ') scale(' + grow + ') translate(' + (-hip.x) + ' ' + (-hip.y) + ')');
        }
        function poseArm(A, sh, ph, amp, grow) {
            var a1 = 0.5 + 0.35 * Math.sin(ph * 2) * amp, p1 = v(sh, a1, 11), p2 = v(p1, a1 + 1.0, 9);
            ln(A.seg[0], sh, p1); ln(A.seg[1], p1, p2);
            ln(A.claws[0], p2, v(p2, a1 + 1.5, 4)); ln(A.claws[1], p2, v(p2, a1 + 0.6, 4));
            A.g.setAttribute('transform', 'translate(' + sh.x + ' ' + sh.y + ') scale(' + grow + ') translate(' + (-sh.x) + ' ' + (-sh.y) + ')');
        }

        var rig = { grow: 0, growT: 0, amp: 0, ampT: 0, speed: 30, ph: 0, last: 0 };
        var raf = 0, vivo = false;
        function tick(t) {
            var dt = Math.min(.05, (t - (rig.last || t)) / 1000); rig.last = t;
            rig.grow += (rig.growT - rig.grow) * Math.min(1, dt * 22);
            rig.amp += (rig.ampT - rig.amp) * Math.min(1, dt * 18);
            rig.ph += dt * rig.speed * (0.25 + rig.amp);
            var g = rig.grow < .01 ? 0 : rig.grow;
            poseLeg(far, { x: HIP.x + 5, y: HIP.y - 2 }, rig.ph + Math.PI, rig.amp, g);
            poseLeg(near, HIP, rig.ph, rig.amp, g);
            pelvis.setAttribute('transform', 'translate(' + HIP.x + ' ' + HIP.y + ') scale(' + g + ') translate(' + (-HIP.x) + ' ' + (-HIP.y) + ')');
            poseArm(armFar, { x: SHOULDER.x + 4, y: SHOULDER.y - 1 }, rig.ph + 1, rig.amp, g);
            poseArm(arm, SHOULDER, rig.ph, rig.amp, g);
            var bob = -Math.abs(Math.sin(rig.ph)) * 4 * rig.amp * g, tilt = Math.sin(rig.ph * 2) * 1.5 * rig.amp;
            m.inner.style.transform = 'translateY(' + bob + 'px) rotate(' + tilt + 'deg)';
            if (vivo) raf = requestAnimationFrame(tick);
        }
        m.arrancarRig = function () { if (vivo) return; vivo = true; rig.last = 0; raf = requestAnimationFrame(tick); };
        m.pararRig = function () { vivo = false; if (raf) cancelAnimationFrame(raf); raf = 0; };

        /* ---------- encaje en pantalla ---------- */
        function fit() {
            var cont = host.querySelector('.fit') || host;
            var w = cont.clientWidth || window.innerWidth, h = cont.clientHeight || window.innerHeight;
            var s = Math.min(w / 860, h / 860, 1.1);
            S.style.transform = 'scale(' + s + ')';
        }
        m.fit = fit;
        window.addEventListener('resize', fit); fit();

        /* ---------- utilidades ---------- */
        var sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
        var run = function (el, kf, o) {
            var op = { fill: 'forwards', easing: 'cubic-bezier(.2,.8,.2,1)' };
            for (var k in o) op[k] = o[k];
            return el.animate(kf, op).finished;
        };
        var rectOf = function (el) {
            var sr = S.getBoundingClientRect(), r = el.getBoundingClientRect(), k = sr.width / 860;
            return { x: (r.left + r.width / 2 - sr.left) / k, y: (r.top + r.height / 2 - sr.top) / k, w: r.width / k, h: r.height / k };
        };
        var fk = function (mx, my, f, s, rot, op) {
            s = (s === undefined ? 1 : s); rot = rot || 0; op = (op === undefined ? 1 : op);
            var cx = F.w / 2, cy = F.h / 2, sx = (f === 1 ? -1 : 1) * s;
            var tx = mx - cx - (F.mx - cx) * sx, ty = my - cy - (F.my - cy) * s;
            return { transform: 'translate(' + tx + 'px,' + ty + 'px) rotate(' + rot + 'deg) scale(' + sx + ',' + s + ')', opacity: op };
        };
        function bite(chip, list) {
            var g = list.map(function (b) { return 'radial-gradient(circle at ' + b.x + '% ' + b.y + '%, transparent ' + b.r + 'px, #000 ' + (b.r + 1) + 'px)'; }).join(',');
            chip.style.webkitMaskImage = g; chip.style.maskImage = g;
            chip.style.setProperty('-webkit-mask-composite', 'source-in');
            chip.style.setProperty('mask-composite', 'intersect');
        }
        function crumbs(x, y, color, n) {
            n = n || 9;
            for (var i = 0; i < n; i++) {
                var c = document.createElement('div'); c.className = 'crumb';
                c.style.background = i % 3 ? color : '#D9D6CE';
                S.appendChild(c);
                var dx = (Math.random() - .5) * 90, dy = 50 + Math.random() * 80, r = Math.random() * 360;
                (function (el) {
                    el.animate([{ transform: 'translate(' + x + 'px,' + y + 'px)', opacity: 1 },
                                { transform: 'translate(' + (x + dx * .6) + 'px,' + (y - 24) + 'px) rotate(' + (r / 2) + 'deg)', opacity: 1, offset: .3 },
                                { transform: 'translate(' + (x + dx) + 'px,' + (y + dy) + 'px) rotate(' + r + 'deg)', opacity: 0 }],
                               { duration: D(650 + Math.random() * 300), easing: 'cubic-bezier(.3,.1,.7,1)' })
                      .finished.then(function () { el.remove(); });
                })(c);
            }
        }
        function pop(text, x, y) {
            var n = document.createElement('div'); n.className = 'nam'; n.textContent = text; S.appendChild(n);
            n.animate([{ transform: 'translate(' + x + 'px,' + y + 'px) scale(.4)', opacity: 0 },
                       { transform: 'translate(' + x + 'px,' + (y - 30) + 'px) scale(1.1)', opacity: 1, offset: .35 },
                       { transform: 'translate(' + x + 'px,' + (y - 60) + 'px) scale(1)', opacity: 0 }],
                      { duration: D(900) }).finished.then(function () { n.remove(); });
        }
        var setStatus = function (t, ok) { m.statusEl.textContent = t; m.statusEl.classList.toggle('ok', !!ok); };

        /* ---------- la secuencia ---------- */
        m.play = function (target) {
            if (m.busy) return Promise.resolve(null);
            m.busy = true;
            m.arrancarRig();
            var reduce = false;
            try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

            var chips = [].slice.call(S.querySelectorAll('.chip:not(.eaten)'));
            if (!chips.length) { m.reset(); chips = [].slice.call(S.querySelectorAll('.chip')); }
            var chip = (target && S.querySelector('.chip[data-k="' + target + '"]:not(.eaten)')) || m.selected || chips[Math.floor(Math.random() * chips.length)];
            S.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('sel'); }); m.selected = null;
            var acc = getComputedStyle(chip).getPropertyValue('--acc').trim();
            setStatus('● AUTENTICANDO…');

            if (reduce) {
                return run(chip, [{ opacity: 1 }, { opacity: 0 }], { duration: Math.min(500, VEL / 2) }).then(function () {
                    chip.classList.add('eaten'); setStatus('● ACCESO CONCEDIDO', true);
                    return sleep(Math.max(0, VEL - 500));
                }).then(function () { m.busy = false; m.pararRig(); return chip.dataset.k; });
            }

            var t0 = (window.performance ? performance.now() : Date.now());

            return (function () {
                var f, T, MID, E, c;
                var dg = m.digger, DW = 210, DH = 86, G = 806;      /* G = línea de suelo bajo el logo */
                var chase = null, dustT = 0;
                var dgAt = function (x) {
                    return { transform: 'translate(' + (x - DW / 2) + 'px,' + (G - DH) + 'px) scaleX(' + f + ')', opacity: 1 };
                };

                return Promise.resolve()
                    /* 1 · arranque (el logo queda entero) */
                    .then(function () {
                        S.classList.add('boot');
                        return run(m.logo, [{ transform: 'scale(1)' }, { transform: 'scale(1.05)' }, { transform: 'scale(1)' }], { duration: D(80) });
                    })
                    /* 2 · el fósil despierta: los mismos huesos, levantados de la roca */
                    .then(function () {
                        m.fossil.getAnimations().forEach(function (a) { a.cancel(); });
                        var h = fk(HOME.x, HOME.y, -1);
                        m.fossil.style.transform = h.transform; m.fossil.style.opacity = h.opacity;
                        m.empty.style.opacity = 1;
                        return run(m.fossil, [fk(HOME.x, HOME.y, -1, 1, 0, 1), fk(HOME.x - 6, HOME.y - 20, -1, 1.08, -4, 1), fk(HOME.x, HOME.y - 30, -1, 1.1, 2, 1)], { duration: D(140) });
                    })
                    /* 3 · corre hacia el módulo */
                    .then(function () {
                        rig.growT = 1;
                        run(m.jaw, [{ transform: 'rotate(0)' }, { transform: 'rotate(-18deg)' }, { transform: 'rotate(0)' }], { duration: D(200) });
                        c = rectOf(chip);
                        f = c.x > C ? 1 : -1;
                        T = { x: c.x - f * (c.w / 2) + f * 30, y: c.y + 6 };
                        MID = { x: (HOME.x + T.x) / 2, y: Math.min(HOME.y, T.y) - 70 };
                        rig.ampT = 1;
                        return run(m.fossil, [fk(HOME.x, HOME.y - 30, f, 1.1, 2), fk(MID.x, MID.y, f, 1.25, -f * 12), fk(T.x, T.y, f, 1.2, 0)],
                                   { duration: D(320), easing: 'cubic-bezier(.4,0,.3,1)' });
                    })
                    /* 4 · tres mordiscos */
                    .then(function () {
                        rig.ampT = 0;
                        var side = f === 1 ? 0 : 100;
                        var bites = [{ x: side, y: 30, r: 18 }, { x: side, y: 72, r: 20 }, { x: f === 1 ? 32 : 68, y: 50, r: 36 }];
                        var list = [], p = Promise.resolve();
                        [0, 1, 2].forEach(function (i) {
                            p = p.then(function () { return run(m.jaw, [{ transform: 'rotate(0)' }, { transform: 'rotate(-26deg)' }], { duration: D(55), easing: 'ease-out' }); })
                                 .then(function () {
                                     run(m.fossil, [fk(T.x + f * i * 10 - f * 6, T.y, f, 1.2), fk(T.x + f * (8 + i * 12), T.y, f, 1.2)], { duration: D(60) });
                                     return run(m.jaw, [{ transform: 'rotate(-26deg)' }, { transform: 'rotate(0)' }], { duration: D(45), easing: 'ease-in' });
                                 })
                                 .then(function () {
                                     list.push(bites[i]); bite(chip, list);
                                     chip.animate([{ transform: 'translateX(0)' }, { transform: 'translateX(' + (f * 5) + 'px)' }, { transform: 'translateX(' + (-f * 3) + 'px)' }, { transform: 'translateX(0)' }], { duration: D(160) });
                                     crumbs(T.x + f * (14 + i * 10), T.y + (i - 1) * 12, acc);
                                     return sleep(D(5));
                                 });
                        });
                        return p;
                    })
                    .then(function () {
                        return run(chip, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(.2) rotate(' + (f * 20) + 'deg)', opacity: 0 }], { duration: D(120), easing: 'ease-in' });
                    })
                    /* 5 · la retroexcavadora entra por el suelo y espanta al fósil */
                    .then(function () {
                        chip.classList.add('eaten'); chip.getAnimations().forEach(function (a) { a.cancel(); });
                        crumbs(c.x, c.y, acc, 14);
                        E = { x: T.x + f * 32, y: T.y };
                        pop('¡ÑAM!', E.x - 40, E.y - 60);

                        var xs = C - f * (430 + DW), xe = C + f * (430 + DW + 80);
                        dg.getAnimations().forEach(function (x) { x.cancel(); });
                        dg.classList.add('go');
                        chase = dg.animate([dgAt(xs), dgAt(xe)], { duration: D(760), easing: 'linear', fill: 'forwards' });
                        dustT = setInterval(function () {
                            var mx = 0;
                            try { mx = new DOMMatrixReadOnly(getComputedStyle(dg).transform).m41; } catch (e) { return; }
                            var x = mx + DW / 2 - f * DW * 0.3;
                            var d = document.createElement('div'); d.className = 'dust';
                            var z = 8 + Math.random() * 12;
                            d.style.width = z + 'px'; d.style.height = z + 'px';
                            S.appendChild(d);
                            d.animate([{ transform: 'translate(' + x + 'px,' + (G - 6) + 'px)', opacity: .8 },
                                       { transform: 'translate(' + (x - f * (30 + Math.random() * 40)) + 'px,' + (G - 26 - Math.random() * 20) + 'px) scale(1.8)', opacity: 0 }],
                                      { duration: D(520), easing: 'ease-out' }).finished.then(function () { d.remove(); });
                        }, Math.max(30, D(60)));

                        /* el fósil la oye: "!" + salto, mira atrás y sale corriendo */
                        var al = document.createElement('div'); al.className = 'alert'; al.textContent = '!'; S.appendChild(al);
                        al.animate([{ transform: 'translate(' + (E.x - 8) + 'px,' + (E.y - 80) + 'px) scale(.3)', opacity: 0 },
                                    { transform: 'translate(' + (E.x - 8) + 'px,' + (E.y - 96) + 'px) scale(1.2)', opacity: 1, offset: .3 },
                                    { transform: 'translate(' + (E.x - 8) + 'px,' + (E.y - 100) + 'px)', opacity: 0 }], { duration: D(600) })
                          .finished.then(function () { al.remove(); });
                        run(m.jaw, [{ transform: 'rotate(0)' }, { transform: 'rotate(-30deg)' }, { transform: 'rotate(0)' }], { duration: D(200) });
                        return run(m.fossil, [fk(E.x, E.y, f, 1.2), fk(E.x, E.y - 30, -f, 1.3, 0), fk(E.x, E.y, -f, 1.2)], { duration: D(150), easing: 'ease-out' });
                    })
                    .then(function () {
                        rig.ampT = 1;
                        var FY = G - 64, OUT = C + f * (430 + 320);
                        m.__FY = FY;
                        return run(m.fossil, [fk(E.x, E.y, f, 1.2), fk(E.x + f * 150, E.y + (FY - E.y) * .45, f, 1.2, f * 14), fk(C + f * 520, FY, f, 1.2), fk(OUT, FY, f, 1.2)],
                                   { duration: D(450), easing: 'cubic-bezier(.3,0,.9,.9)' });
                    })
                    /* 6 · …y vuelve a entrar por el otro lado, directo a su hueco en la roca */
                    .then(function () {
                        var FY = m.__FY, IN = C - f * (430 + 320), face = f;
                        m.fossil.animate([fk(IN, FY, face, 1.2), fk(C - f * 260, FY, face, 1.2), fk(HOME.x - f * 40, HOME.y - 30, face, 1.1, -f * 10), fk(HOME.x, HOME.y, -1, 1, 0)],
                                         { duration: D(450), easing: 'cubic-bezier(.25,.5,.35,1)', fill: 'forwards' });
                        return sleep(D(330));
                    })
                    .then(function () { rig.ampT = 0; rig.growT = 0; return sleep(D(120)); })
                    .then(function () {
                        m.empty.style.opacity = 0;
                        m.fossil.animate([{ opacity: 1 }, { opacity: 0 }], { duration: D(120), fill: 'forwards' });
                        m.logo.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: D(220) });
                        if (chase) chase.finished.then(function () {
                            clearInterval(dustT); dg.classList.remove('go');
                            dg.getAnimations().forEach(function (x) { x.cancel(); });
                            dg.style.opacity = 0;
                        }, function () {});
                        S.classList.remove('boot');

                        /* el remate se estira o se encoge para que el total sea exactamente VEL */
                        var ya = (window.performance ? performance.now() : Date.now()) - t0;
                        var cola = Math.max(300, Math.round(VEL - ya));
                        m.glow.animate([{ boxShadow: '0 0 0 3px #2DD4BF,0 0 140px rgba(45,212,191,.9)' },
                                        { boxShadow: '0 0 0 3px rgba(0,229,255,.85),0 0 60px rgba(0,229,255,.45),0 0 140px rgba(157,107,255,.18)' }],
                                       { duration: cola });
                        setStatus('● ACCESO CONCEDIDO', true);
                        m.toast.animate([{ opacity: 0, transform: 'translate(-50%,-10px)' },
                                         { opacity: 1, transform: 'translate(-50%,0)', offset: .14 },
                                         { opacity: 1, offset: .80 }, { opacity: 0 }], { duration: cola });
                        return sleep(cola);
                    })
                    .then(function () {
                        m.busy = false; m.pararRig();
                        return chip.dataset.k;
                    })
                    .catch(function (e) {
                        try { console.warn('GeoIntro', e); } catch (e2) {}
                        if (dustT) clearInterval(dustT);
                        m.busy = false; m.pararRig();
                        return null;
                    });
            })();
        };


        m.reset = function () {
            S.querySelectorAll('.chip').forEach(function (c) {
                c.classList.remove('eaten', 'sel');
                c.style.maskImage = c.style.webkitMaskImage = '';
                c.getAnimations().forEach(function (a) { a.cancel(); });
            });
            m.selected = null; setStatus('● SISTEMA EN LÍNEA');
            m.fossil.style.opacity = 0;
            if (m.digger) {
                m.digger.getAnimations().forEach(function (a) { a.cancel(); });
                m.digger.classList.remove('go'); m.digger.style.opacity = 0; m.digger.style.transform = '';
            }
            S.querySelectorAll('.dust,.alert,.crumb,.nam').forEach(function (n) { n.remove(); });
            S.classList.remove('split', 'boot');
            [m.pTop, m.pMid, m.pBot].forEach(function (p) { p.getAnimations().forEach(function (a) { a.cancel(); }); p.style.transform = ''; });
            m.empty.style.opacity = 0;
        };

        S.querySelectorAll('.chip').forEach(function (ch) {
            ch.addEventListener('click', function () {
                if (m.busy) return;
                var was = ch.classList.contains('sel');
                S.querySelectorAll('.chip').forEach(function (c) { c.classList.remove('sel'); });
                m.selected = was ? null : ch; if (!was) ch.classList.add('sel');
            });
        });

        M = m;
        return m;
    }

    window.GeoIntro = {
        montar: montar,
        play: function (t) { var m = M || montar(document.getElementById('geoIntro')); return m ? m.play(t) : Promise.resolve(null); },
        reset: function () { if (M) M.reset(); },
        fit: function () { if (M) M.fit(); },
        setDuracion: function (ms) { VEL = Math.max(600, Number(ms) || 4000); return VEL; },
        get duracion() { return VEL; },
        get montado() { return !!M; }
    };
})();
