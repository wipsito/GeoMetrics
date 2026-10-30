/* =========================================================
   GeoMetrics — Estructuras I · SIMULADORES 2D / 3D
   Viga simplemente apoyada, voladizo, cercha Pratt, pórtico y viga continua.
   Requiere: js/est-calc.js
   ========================================================= */
(function (root) {
    'use strict';
    var C = root.EstCalc;
    if (!C) { if (root.console) console.error('Simuladores Estructuras I: falta js/est-calc.js'); return; }

    var S = root.EstruSim = root.EstruSim || {};
    var SIMS = {};
    var ORDER = ['viga', 'voladizo', 'cercha', 'portico', 'continuas'];
    var ST = { id: null, mode: '2d', p: 0, running: false, raf: 0, last: 0, P: null, yaw: -0.55, zoom: 1, drag: null, speed: 1, cur: null, stepK: -1, readout: '' };
    var lab3d = null;

    function $(id) { return document.getElementById(id); }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function fmt(v, d) {
        if (v == null || !isFinite(v)) return '—';
        return Number(v).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    function fit(c) {
        if (!c) return null;
        var w = Math.round(c.getBoundingClientRect().width || c.parentNode.clientWidth || 0);
        if (w < 40) return null;
        var h = Math.round(w * 0.58);
        var dpr = Math.min(2.5, root.devicePixelRatio || 1);
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
        c.style.height = h + 'px';
        var ctx = c.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx: ctx, W: w, H: h };
    }

    /* ---------------- dibujo base ---------------- */
    var COL = { bg: '#0B1220', txt: '#c9d4df', dim: '#718096', beam: '#93C5FD', conc: '#94A3B8', load: '#FBBF24', ok: '#34D399', bad: '#F87171', pink: '#F472B6' };
    function bg(ctx, W, H) {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#101c30'); g.addColorStop(1, '#0B1220');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(167,180,200,.06)'; ctx.lineWidth = 1;
        for (var x = 0; x < W; x += 26) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (var y = 0; y < H; y += 26) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(167,180,200,.16)'; ctx.strokeRect(0.5, 0.5, W - 1, H - 1);
    }
    function tx(ctx, s, x, y, o) {
        o = o || {};
        ctx.save(); ctx.font = (o.w || 600) + ' ' + (o.size || 11) + 'px Inter, Arial, sans-serif';
        ctx.fillStyle = o.color || COL.txt; ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.baseline || 'middle';
        ctx.fillText(s, x, y); ctx.restore();
    }
    function ln(ctx, x1, y1, x2, y2, c, w, dash) {
        ctx.save(); ctx.strokeStyle = c || COL.dim; ctx.lineWidth = w || 1; ctx.setLineDash(dash || []);
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.restore();
    }
    function arrow(ctx, x1, y1, x2, y2, c, w) {
        var a = Math.atan2(y2 - y1, x2 - x1), hd = 7;
        ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = w || 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - hd * Math.cos(a - .45), y2 - hd * Math.sin(a - .45));
        ctx.lineTo(x2 - hd * Math.cos(a + .45), y2 - hd * Math.sin(a + .45)); ctx.closePath(); ctx.fill(); ctx.restore();
    }
    function pin(ctx, x, y, c) {
        c = c || '#E2E8F0';
        ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = 'rgba(226,232,240,.12)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 15); ctx.lineTo(x + 9, y + 15); ctx.closePath(); ctx.fill(); ctx.stroke();
        ln(ctx, x - 14, y + 16, x + 14, y + 16, c, 2); ctx.restore();
    }
    function roller(ctx, x, y, c) {
        c = c || '#E2E8F0';
        ctx.save(); ctx.strokeStyle = c; ctx.fillStyle = 'rgba(226,232,240,.12)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 9, y + 12); ctx.lineTo(x + 9, y + 12); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(x - 4.5, y + 16, 3.2, 0, 6.283); ctx.arc(x + 4.5, y + 16, 3.2, 0, 6.283); ctx.fill(); ctx.stroke();
        ln(ctx, x - 14, y + 20, x + 14, y + 20, c, 2); ctx.restore();
    }
    function fixed(ctx, x, y1, y2, side) {
        ctx.save(); ctx.strokeStyle = '#E2E8F0'; ctx.fillStyle = 'rgba(226,232,240,.1)'; ctx.lineWidth = 2;
        var d = side === 'left' ? -1 : 1;
        ctx.fillRect(side === 'left' ? x - 7 : x, y1, 7, y2 - y1); ctx.strokeRect(side === 'left' ? x - 7 : x, y1, 7, y2 - y1);
        for (var y = y1 + 5; y < y2; y += 9) ln(ctx, x, y, x + d * 9, y + 9, '#E2E8F0', 1);
        ctx.restore();
    }
    function tag(ctx, s, x, y, c) {
        ctx.save(); ctx.font = '700 10px Inter, Arial, sans-serif';
        var w = ctx.measureText(s).width + 14;
        ctx.fillStyle = 'rgba(11,18,32,.78)'; ctx.strokeStyle = c; ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y - 9, w, 18, 9); else ctx.rect(x, y - 9, w, 18);
        ctx.fill(); ctx.stroke();
        ctx.fillStyle = c; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(s, x + 7, y + 1); ctx.restore();
    }
    function dimH(ctx, x1, x2, y, s, at) {
        ln(ctx, x1, y, x1, y + 7, COL.dim, 1); ln(ctx, x2, y, x2, y + 7, COL.dim, 1); ln(ctx, x1, y + 3, x2, y + 3, COL.dim, 1);
        tx(ctx, s, x1 + (x2 - x1) * (at == null ? 0.5 : at), y - 8, { align: 'center', size: 10, color: COL.dim });
    }

    /* ---------------- proyección pseudo-3D ---------------- */
    function rot(x, z, a) { var c = Math.cos(a), s = Math.sin(a); return { x: x * c - z * s, z: x * s + z * c }; }
    function project(x, y, z, o) {
        var r = rot(x, z, ST.yaw);
        return {
            x: o.ox + (r.x - r.z * 0.52) * o.s,
            y: o.oy - y * o.s + (r.x + r.z) * 0.30 * o.s,
            d: r.x + r.z
        };
    }
    function quad(ctx, pts, fill, stroke) {
        ctx.save(); ctx.beginPath();
        pts.forEach(function (p, i) { i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); });
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.stroke(); }
        ctx.restore();
    }
    function shade(hex, f) {
        var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
        function q(v) { return Math.max(0, Math.min(255, Math.round(v * f))); }
        return 'rgb(' + q(r) + ',' + q(g) + ',' + q(b) + ')';
    }
    function box3(ctx, x0, x1, y0, y1, z0, z1, o, color) {
        var p000 = project(x0, y0, z0, o), p100 = project(x1, y0, z0, o), p110 = project(x1, y1, z0, o), p010 = project(x0, y1, z0, o);
        var p001 = project(x0, y0, z1, o), p101 = project(x1, y0, z1, o), p111 = project(x1, y1, z1, o), p011 = project(x0, y1, z1, o);
        quad(ctx, [p000, p100, p101, p001], shade(color, .52), 'rgba(15,23,42,.5)');
        quad(ctx, [p100, p101, p111, p110], shade(color, .68), 'rgba(15,23,42,.5)');
        quad(ctx, [p001, p101, p111, p011], shade(color, .58), 'rgba(15,23,42,.5)');
        quad(ctx, [p010, p110, p111, p011], shade(color, 1.02), 'rgba(15,23,42,.5)');
        quad(ctx, [p000, p100, p110, p010], shade(color, .8), 'rgba(15,23,42,.5)');
    }
    function bar3(ctx, x1, y1, z1, x2, y2, z2, o, color, w) {
        var a = project(x1, y1, z1, o), b = project(x2, y2, z2, o);
        ln(ctx, a.x, a.y, b.x, b.y, color, w || 2);
    }
    function ground(ctx, W, H, o, n) {
        for (var i = -n; i <= n; i++) {
            var a = project(i, -0.9, -n, o), b = project(i, -0.9, n, o);
            ln(ctx, a.x, a.y, b.x, b.y, 'rgba(167,180,200,.08)', 1);
            var c = project(-n, -0.9, i, o), d = project(n, -0.9, i, o);
            ln(ctx, c.x, c.y, d.x, d.y, 'rgba(167,180,200,.08)', 1);
        }
    }
    function popup(ctx, s, x, y, c) {
        ctx.save(); ctx.font = '800 11px Inter, Arial, sans-serif';
        var w = ctx.measureText(s).width + 16;
        ctx.fillStyle = 'rgba(11,18,32,.82)'; ctx.strokeStyle = c; ctx.lineWidth = 1;
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - w / 2, y - 11, w, 22, 11); else ctx.rect(x - w / 2, y - 11, w, 22);
        ctx.fill(); ctx.stroke(); ctx.fillStyle = c; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(s, x, y + 1); ctx.restore();
    }

    /* ---------------- home ---------------- */
    function home() {
        return '<header class="simhub-hero"><div class="simhub-hero-text"><em class="simhub-eyebrow">Laboratorio virtual · Estructuras I</em>' +
            '<h3>Cinco estructuras, curvas en vivo y paso a paso</h3>' +
            '<p>Cambia material, sección, luz y carga; sigue el <b>paso a paso</b>, lee los diagramas con ejes y recorre la viga con el cursor. Gira el modelo en <b>3D</b> para ver cómo se conectan los elementos. Todo se recalcula en vivo y puedes guardar la corrida.</p></div>' +
            '<ul class="simhub-hero-stats"><li><strong>5</strong><em>Estructuras</em></li><li><strong>4</strong><em>Materiales</em></li><li><strong>2D·3D</strong><em>Vistas</em></li></ul></header>' +
            '<div class="simhub-grid">' + ORDER.map(function (id) {
                var s = SIMS[id];
                return '<article class="simcard" style="--a:' + s.accent + ';--rgb:' + s.rgb + '"><div class="simcard-glow"></div>' +
                    '<div class="simcard-head"><em class="simcard-num">' + s.num + '</em><div class="simcard-glyph">' + s.icon + '</div></div>' +
                    '<h4>' + esc(s.title) + '</h4><p>' + esc(s.desc) + '</p>' +
                    '<div class="simcard-chips">' + s.chips.map(function (c) { return '<em>' + esc(c) + '</em>'; }).join('') + '</div>' +
                    '<small class="simcard-norma">' + esc(s.norma) + '</small>' +
                    '<div class="simcard-btns"><button type="button" class="simcard-btn is-2d" data-sim-open="' + id + '" data-mode="2d"><b>2D</b><span>Vista 2D</span><i>Diagramas en vivo</i></button>' +
                    '<button type="button" class="simcard-btn is-3d" data-sim-open="' + id + '" data-mode="3d"><b>3D</b><span>Vista 3D</span><i>Modelo isométrico</i></button></div></article>';
            }).join('') + '</div>' +
            '<section class="ms2-guias est-ruta"><div class="ms2-guias-head"><h4>Cómo usar los simuladores</h4><p>Elige una estructura y una vista. Ajusta los sliders: el modelo y las lecturas cambian sin recargar.</p></div>' +
            '<div class="est-ruta-chips"><span><b>1</b>Elige material y sección</span><span><b>2</b>Pulsa aplicar carga y sigue los pasos</span><span><b>3</b>Recorre las curvas con el cursor</span><span><b>4</b>Guarda la corrida</span></div></section>';
    }

    /* ---------------- detalle ---------------- */
    function detail(id) {
        var s = SIMS[id];
        return '<div class="simhub-shell est-sim-shell" style="--a:' + s.accent + ';--rgb:' + s.rgb + '">' +
            '<div class="simhub-topbar"><button type="button" class="btn-volver simhub-back" id="esimBack">← Simuladores</button>' +
            '<nav class="simhub-crumbs"><span>Estructuras I</span><i>/</i><span>Simuladores</span><i>/</i><b>' + esc(s.title) + '</b></nav>' +
            '<div class="simhub-mode" role="tablist"><button type="button" data-esim-mode="2d" class="' + (ST.mode === '3d' ? '' : 'on') + '">2D</button><button type="button" data-esim-mode="3d" class="' + (ST.mode === '3d' ? 'on' : '') + '">3D</button></div></div>' +
            '<header class="simhub-phero"><div class="simhub-phero-icon">' + s.icon + '</div>' +
            '<div class="simhub-phero-text"><em class="simhub-phero-eyebrow">Simulador ' + (ST.mode === '3d' ? '3D' : '2D') + ' · modelo paramétrico</em><h2>' + esc(s.title) + '</h2><p class="simhub-phero-desc">' + esc(s.desc) + '</p></div>' +
            '<ul class="simhub-phero-meta"><li><b>Referencia</b><span>' + esc(s.norma) + '</span></li><li><b>Variables</b><span>' + esc(s.chips.join(' · ')) + '</span></li></ul></header>' +
            '<div class="est-simwork"><aside class="dm-panel est-simpanel"><h4>Parámetros</h4><div id="esimControls">' + s.controls() + '</div>' +
            '<div class="dm-actions"><button type="button" class="btn-calcular" id="esimPlay">▶ APLICAR CARGA</button><button type="button" class="btn-limpiar" id="esimReset">Reiniciar</button></div>' +
            '<label class="est-range est-scrub"><span>Avance de la carga <output id="esimScrubV">0 %</output></span><input type="range" id="esimScrub" min="0" max="100" step="1" value="0"><small>Arrastra para detener la animación y ver cualquier instante</small></label>' +
            '<label class="est-range est-selrow"><span>Velocidad de animación</span><select id="esimSpeed"><option value="0.5">0,5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>' +
            '<div class="dm-actions"><button type="button" class="btn-limpiar est-savebtn" id="esimSave">Guardar en Mis resultados</button></div>' +
            '<p class="dm-hint est-simhint">' + (ST.mode === '3d' ? 'Arrastra el modelo para girarlo y usa la rueda para acercar.' : 'La animación aplica la carga gradualmente; los valores corresponden a la carga total.') + '</p></aside>' +
            '<section class="dm-panel est-simstage"><div class="est-stepbar" id="esimStep"></div><div class="est-simstagehead"><span id="esimModeLabel">Vista ' + (ST.mode === '3d' ? '3D' : '2D') + '</span><em id="esimHint">' + (ST.mode === '3d' ? 'Arrastra para girar · rueda para zoom' : 'Diagrama y deformada') + '</em></div>' +
            '<canvas id="esimCanvas" role="img" aria-label="Simulador estructural"></canvas>' +
            '<div class="est-chartwrap"><div class="est-charthead"><b>Curvas en vivo</b><span id="esimReadout"></span></div><canvas id="esimChart" role="img" aria-label="Gráficas con ejes"></canvas>' +
            '<small class="est-charthint">Línea punteada = carga total · trazo lleno = carga aplicada. ' + (s.chartHint || '') + '</small></div></section>' +
            '<aside class="dm-panel est-simres"><h4>Lecturas en vivo</h4><div class="dm-tiles" id="esimTiles"></div><div class="est-simnote" id="esimNote"></div></aside></div>' +
            '<details class="dm-panel est-panel est-simlearn" open><summary>Qué estás viendo</summary>' + s.learn + '</details></div>';
    }

    function detail3d(id) {
        var s = SIMS[id];
        return '<div class="simhub-shell est-sim-shell" style="--a:' + s.accent + ';--rgb:' + s.rgb + '">' +
            '<div class="simhub-topbar"><button type="button" class="btn-volver simhub-back" id="esimBack">← Simuladores</button>' +
            '<nav class="simhub-crumbs"><span>Estructuras I</span><i>/</i><span>Simuladores</span><i>/</i><b>' + esc(s.title) + '</b></nav>' +
            '<div class="simhub-mode" role="tablist"><button type="button" data-esim-mode="2d">2D</button><button type="button" data-esim-mode="3d" class="on">3D</button></div></div>' +
            '<header class="simhub-phero"><div class="simhub-phero-icon">' + s.icon + '</div>' +
            '<div class="simhub-phero-text"><em class="simhub-phero-eyebrow">Simulador 3D · laboratorio estructural</em><h2>' + esc(s.title) + '</h2><p class="simhub-phero-desc">' + esc(s.desc) + '</p></div>' +
            '<ul class="simhub-phero-meta"><li><b>Referencia</b><span>' + esc(s.norma) + '</span></li><li><b>Variables</b><span>' + esc(s.chips.join(' · ')) + '</span></li></ul></header>' +
            '<div class="simhub-3d-host" id="esimLab3dHost"></div>' +
            '<details class="dm-panel est-panel est-simlearn" open><summary>Qué estás viendo</summary>' + s.learn + '</details></div>';
    }

    function disposeLab3d() {
        if (lab3d) { try { lab3d.dispose(); } catch (e) {} lab3d = null; }
        if (root.EstruLab3D && root.EstruLab3D.disposeAll) { try { root.EstruLab3D.disposeAll(); } catch (e2) {} }
    }

    function render() {
        var host = $('est-simuladores'); if (!host) return;
        stop(); ST.stepK = -1; disposeLab3d();
        if (!ST.id) { host.innerHTML = home(); return; }
        if (ST.mode === '3d' && root.EstruLab3D) {
            var s3 = SIMS[ST.id];
            ST.P = ST.P || Object.assign({}, s3.defaults);
            host.innerHTML = detail3d(ST.id);
            $('esimBack').addEventListener('click', function () { ST.id = null; ST.P = null; ST.cur = null; ST.p = 0; ST.stepK = -1; render(); scrollTop(); });
            host.querySelectorAll('[data-esim-mode]').forEach(function (b) {
                b.addEventListener('click', function () { setMode(b.getAttribute('data-esim-mode')); });
            });
            lab3d = root.EstruLab3D.mount($('esimLab3dHost'), ST.id, {
                P: ST.P,
                onP: function (P) { ST.P = P; },
                onSave: function (P) { saveRun(P, ST.id); }
            });
            return;
        }
        if (ST.mode === '3d' && !root.EstruLab3D) {
            ST.mode = '2d';
            host.innerHTML = detail(ST.id);
        } else {
            host.innerHTML = detail(ST.id);
        }
        var s = SIMS[ST.id];
        ST.P = ST.P || Object.assign({}, s.defaults);
        var ctr = $('esimControls');
        ctr.querySelectorAll('[data-k]').forEach(function (el) {
            var k = el.getAttribute('data-k');
            if (ST.P[k] == null) return;
            el.value = ST.P[k];
            var out = $(el.id + 'V');
            if (out) out.textContent = fmt(ST.P[k], parseInt(el.getAttribute('data-dec') || '0', 10)) + (el.getAttribute('data-unit') || '');
        });
        function onCtl(e) {
            var t = e.target;
            if (!t || !t.getAttribute || !t.getAttribute('data-k')) return;
            var k = t.getAttribute('data-k');
            if (t.tagName === 'SELECT') {
                ST.P[k] = (t.value !== '' && isFinite(+t.value)) ? +t.value : t.value;
            } else {
                ST.P[k] = parseFloat(t.value);
                var out = $(t.id + 'V');
                if (out) out.textContent = fmt(parseFloat(t.value), parseInt(t.getAttribute('data-dec') || '0', 10)) + (t.getAttribute('data-unit') || '');
            }
            updateTiles(); paint();
        }
        ctr.addEventListener('input', onCtl);
        ctr.addEventListener('change', onCtl);
        var spd = $('esimSpeed'); if (spd) { spd.value = String(ST.speed); spd.addEventListener('change', function () { ST.speed = parseFloat(spd.value) || 1; }); }
        var scr = $('esimScrub');
        if (scr) scr.addEventListener('input', function () {
            stop(); ST.p = clamp(parseFloat(scr.value) / 100, 0, 1);
            setBtn(ST.p >= 1 ? '↻ REPETIR' : (ST.p > 0 ? '▶ CONTINUAR' : '▶ APLICAR CARGA')); paint();
        });
        var stp = $('esimStep');
        if (stp) stp.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-step]') : null; if (!b) return;
            var n = SIMS[ST.id].steps.length, i = parseInt(b.getAttribute('data-step'), 10);
            stop(); ST.p = i >= n - 1 ? 1 : (i + 0.5) / n;
            setBtn(ST.p >= 1 ? '↻ REPETIR' : '▶ CONTINUAR'); paint();
        });
        var sv = $('esimSave'); if (sv) sv.addEventListener('click', function () { saveRun(); });
        bindChart();
        $('esimBack').addEventListener('click', function () { ST.id = null; ST.P = null; ST.cur = null; ST.p = 0; ST.stepK = -1; render(); scrollTop(); });
        $('esimPlay').addEventListener('click', play);
        $('esimReset').addEventListener('click', function () { stop(); ST.p = 0; ST.cur = null; setBtn('▶ APLICAR CARGA'); paint(); });
        host.querySelectorAll('[data-esim-mode]').forEach(function (b) {
            b.addEventListener('click', function () { setMode(b.getAttribute('data-esim-mode')); });
        });
        bindOrbit();
        updateTiles();
        requestAnimationFrame(function () { requestAnimationFrame(function () { paint(); }); });
    }

    function setMode(mode) {
        var next = mode === '3d' ? '3d' : '2d';
        if (next === ST.mode && ST.id) return;
        ST.mode = next;
        if (ST.id) { render(); scrollTop(); return; }
        var host = $('est-simuladores'); if (!host) return;
        host.querySelectorAll('[data-esim-mode]').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-esim-mode') === ST.mode); });
    }

    function updateTiles() {
        if (!ST.id || ST.mode === '3d') return;
        var s = SIMS[ST.id], box = $('esimTiles'); if (!box) return;
        var r, err = null;
        try { r = s.compute(ST.P); } catch (e) { err = e; }
        if (err) { box.innerHTML = '<div class="dm-error">⚠ ' + esc(err.userMessage || err.message) + '</div>'; return; }
        box.innerHTML = s.tiles(r, ST.P).map(function (t) {
            return '<div class="dm-tile' + (t.tone ? ' is-' + t.tone : '') + '"><span>' + t.l + '</span><strong>' + t.v + '</strong>' + (t.s ? '<small>' + t.s + '</small>' : '') + '</div>';
        }).join('');
        var note = $('esimNote'); if (note) note.innerHTML = s.note(r, ST.P);
    }

    function paint() {
        if (!ST.id || ST.mode === '3d') return;
        var f = fit($('esimCanvas')); if (!f) return;
        var s = SIMS[ST.id], r;
        try { r = s.compute(ST.P); } catch (e) { bg(f.ctx, f.W, f.H); tx(f.ctx, e.userMessage || e.message, 20, 30, { color: COL.bad }); return; }
        if (ST.mode === '3d') s.draw3d(f.ctx, f.W, f.H, r, ST.P, ST.p);
        else s.draw2d(f.ctx, f.W, f.H, r, ST.P, ST.p);
        paintChart(r);
        updateStep();
        var scr = $('esimScrub');
        if (scr && String(Math.round(ST.p * 100)) !== scr.value) scr.value = Math.round(ST.p * 100);
        var sv = $('esimScrubV'); if (sv) sv.textContent = Math.round(ST.p * 100) + ' %';
    }
    function paintChart(r) {
        var s = SIMS[ST.id], c = $('esimChart'); if (!s || !c || !s.chart) return;
        var f = fitChart(c, s.chartRatio); if (!f) return;
        try { s.chart(f.ctx, f.W, f.H, r || s.compute(ST.P), ST.P, ST.p); } catch (e) { bg(f.ctx, f.W, f.H); }
        var ro = $('esimReadout'); if (ro) ro.textContent = ST.readout || '';
    }
    function updateStep() {
        var s = SIMS[ST.id], box = $('esimStep'); if (!s || !box || !s.steps) return;
        var n = s.steps.length, k = ST.p >= 1 ? n - 1 : Math.min(n - 1, Math.floor(ST.p * n));
        if (k === ST.stepK && box.firstChild) return;
        ST.stepK = k;
        var st = s.steps[k];
        box.innerHTML = '<span class="est-stepn">Paso ' + (k + 1) + ' / ' + n + '</span><div class="est-steptxt"><b>' + esc(st.t) + '</b><small>' + esc(st.d) + '</small></div>' +
            '<div class="est-stepdots">' + s.steps.map(function (x, i) {
                return '<button type="button" data-step="' + i + '" class="' + (i <= k ? 'on' : '') + (i === k ? ' cur' : '') + '" aria-label="Paso ' + (i + 1) + ': ' + esc(x.t) + '" title="' + esc(x.t) + '"></button>';
            }).join('') + '</div>';
    }
    function bindChart() {
        var c = $('esimChart'); if (!c) return;
        var s = SIMS[ST.id]; if (!s.cursor) return;
        function mv(e) {
            var rc = c.getBoundingClientRect(), x = e.clientX - rc.left;
            ST.cur = clamp((x - 48) / Math.max(1, rc.width - 60), 0, 1);
            paintChart();
        }
        c.addEventListener('pointerdown', function (e) { mv(e); try { c.setPointerCapture(e.pointerId); } catch (x) {} c._d = true; });
        c.addEventListener('pointermove', function (e) { if (c._d || e.pointerType === 'mouse') mv(e); });
        c.addEventListener('pointerup', function () { c._d = false; });
        c.style.cursor = 'crosshair'; c.style.touchAction = 'pan-y';
    }
    function readInputs() {
        var out = [];
        document.querySelectorAll('#esimControls label, .lab3d-params label').forEach(function (lb) {
            var sp = lb.querySelector('span'), el = lb.querySelector('[data-k]'); if (!sp || !el) return;
            var name = (sp.firstChild ? sp.firstChild.textContent : '').trim();
            var v = el.tagName === 'SELECT' ? el.options[el.selectedIndex].text : (lb.querySelector('output') ? lb.querySelector('output').textContent : el.value);
            out.push({ label: name, valor: v });
        });
        return out;
    }
    function plain(h) { return String(h == null ? '' : h).replace(/<[^>]+>/g, ''); }
    function saveRun(P, id) {
        id = id || ST.id;
        if (!id) return;
        var s = SIMS[id], r;
        P = P || ST.P;
        try { r = s.compute(P); } catch (e) { alert(e.userMessage || e.message); return; }
        if (typeof root.guardarResultado !== 'function') { alert('El historial no está disponible.'); return; }
        var tl = s.tiles(r, P), entradas = readInputs();
        var resumen = tl.slice(0, 3).map(function (t) { return plain(t.l) + ' = ' + plain(t.v); }).join(' · ');
        var rep = {
            titulo: 'Estructuras I — Simulador: ' + s.title, norma: s.norma, resumen: resumen, entradas: entradas,
            resultados: tl.map(function (t) { return { label: plain(t.l), valor: plain(t.v) + (t.s ? ' · ' + plain(t.s) : '') }; }),
            formulas: plain((s.learn.match(/est-eq">([^<]*)</) || [])[1] || ''),
            avisos: [plain(s.note(r, P)), 'Corrida del simulador con carga total aplicada; modelo elástico lineal con las hipótesis indicadas.'],
            fecha: new Date().toLocaleString('es-CO')
        };
        var html = root.Estru && root.Estru.reportHTML ? root.Estru.reportHTML(rep) : '';
        root.guardarResultado('Estructuras I — Simulador: ' + s.title, resumen, { tipo: 'est-sim-' + id, entradas: entradas, reporteHTML: html });
        var b = $('esimSave');
        if (b) { b.textContent = '✓ Guardado'; setTimeout(function () { var bb = $('esimSave'); if (bb) bb.textContent = 'Guardar en Mis resultados'; }, 1800); }
    }

    function setBtn(t) { var b = $('esimPlay'); if (b) b.textContent = t; }
    function stop() { ST.running = false; if (ST.raf) cancelAnimationFrame(ST.raf); ST.raf = 0; }
    function loop(now) {
        if (!ST.running) return;
        var dt = now - ST.last; ST.last = now;
        var nSteps = (SIMS[ST.id] && SIMS[ST.id].steps) ? SIMS[ST.id].steps.length : 2;
        ST.p = Math.min(1, ST.p + dt * ST.speed / (1100 * nSteps + 600));
        paint();
        if (ST.p >= 1) { stop(); setBtn('↻ REPETIR'); return; }
        ST.raf = requestAnimationFrame(loop);
    }
    function play() {
        if (ST.running) { stop(); setBtn('▶ CONTINUAR'); return; }
        if (ST.p >= 1) ST.p = 0;
        ST.running = true; ST.last = performance.now(); setBtn('⏸ PAUSAR'); ST.raf = requestAnimationFrame(loop);
    }
    function bindOrbit() {
        if (ST.mode === '3d') return;
        var c = $('esimCanvas'); if (!c) return;
        c.addEventListener('pointerdown', function (e) {
            if (ST.mode !== '3d') return;
            ST.drag = { x: e.clientX, yaw: ST.yaw }; try { c.setPointerCapture(e.pointerId); } catch (x) {}
            c.style.cursor = 'grabbing';
        });
        c.addEventListener('pointermove', function (e) {
            if (!ST.drag) return;
            ST.yaw = ST.drag.yaw + (e.clientX - ST.drag.x) * 0.012;
            paint();
        });
        c.addEventListener('pointerup', function () { ST.drag = null; c.style.cursor = ''; });
        c.addEventListener('pointercancel', function () { ST.drag = null; c.style.cursor = ''; });
        c.addEventListener('wheel', function (e) {
            if (ST.mode !== '3d') return;
            e.preventDefault(); ST.zoom = Math.max(0.55, Math.min(1.8, ST.zoom * (e.deltaY > 0 ? 0.92 : 1.08))); paint();
        }, { passive: false });
    }
    function scrollTop() { try { var s = $('pantallaEstructuras'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { root.scrollTo(0, 0); } }

    S.open = function (id, mode) {
        if (!SIMS[id]) return;
        disposeLab3d();
        ST.id = id; ST.p = 0; ST.P = Object.assign({}, SIMS[id].defaults); ST.zoom = 1; ST.cur = null; ST.stepK = -1;
        if (mode) ST.mode = mode === '3d' ? '3d' : '2d';
        var tab = document.querySelector('#pantallaEstructuras .tab-btn[data-tab="est-simuladores"]');
        if (tab && !tab.classList.contains('active')) tab.click();
        render();
        scrollTop();
    };
    S.close = function () { stop(); disposeLab3d(); ST.id = null; ST.P = null; render(); };
    S.render = render;
    S.sims = SIMS;

    function bindHub() {
        var host = $('est-simuladores'); if (!host || host.getAttribute('data-esim-bind') === '1') return;
        host.setAttribute('data-esim-bind', '1');
        host.addEventListener('click', function (e) {
            var b = e.target.closest ? e.target.closest('[data-sim-open]') : null;
            if (b) { e.preventDefault(); S.open(b.getAttribute('data-sim-open'), b.getAttribute('data-mode')); }
        });
    }
    function init() {
        bindHub(); render();
        var tabs = document.querySelectorAll('#pantallaEstructuras .submenu-tabs .tab-btn');
        tabs.forEach(function (b) {
            b.addEventListener('click', function () {
                if (b.getAttribute('data-tab') === 'est-simuladores') { render(); }
                else {
                    if (ST.running) { stop(); setBtn('▶ CONTINUAR'); }
                    disposeLab3d();
                }
            });
        });
        var rz;
        root.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(paint, 160); });
    }
    function slider(k, label, min, max, step, value, unit, dec) {
        var shown = dec === 2 ? Number(value).toFixed(2) : (dec === 1 ? Number(value).toFixed(1) : Math.round(value));
        return '<label class="est-range"><span>' + label + ' <output id="esim-' + k + 'V">' + shown + unit + '</output></span>' +
            '<input type="range" id="esim-' + k + '" data-k="' + k + '" data-unit="' + unit + '" data-dec="' + (dec || 0) + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + value + '">' +
            '<small>' + min + ' – ' + max + ' ' + unit.trim() + '</small></label>';
    }
    function loadFactor(p) { return 0.22 + 0.78 * (p == null ? 1 : p); }
    function dmaxOf(arr) { var m = 0; arr.forEach(function (v) { m = Math.max(m, Math.abs(v)); }); return m || 1; }

    /* ---------------- materiales y chequeos de servicio ---------------- */
    var MATS = {
        acero: { n: 'Acero A36', E: 200, adm: 150 },
        concreto: { n: 'Concreto 28 MPa', E: 25, adm: 12 },
        madera: { n: 'Madera estruct.', E: 11, adm: 10 },
        aluminio: { n: 'Aluminio 6061', E: 69, adm: 100 }
    };
    function matOf(P) { return MATS[P.mat] || MATS.concreto; }
    function selectCtl(k, label, opts, sel, hint) {
        return '<label class="est-range est-selrow"><span>' + label + '</span><select id="esim-' + k + '" data-k="' + k + '">' +
            opts.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(sel) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') +
            '</select>' + (hint ? '<small>' + hint + '</small>' : '') + '</label>';
    }
    function matSelect(sel) {
        return selectCtl('mat', 'Material', Object.keys(MATS).map(function (k) { return [k, MATS[k].n + ' · E = ' + MATS[k].E + ' GPa']; }), sel,
            'Define E y el esfuerzo admisible de referencia de los chequeos.');
    }
    function ratioTone(x) { return x > 1 ? 'bad' : (x > 0.8 ? 'warn' : 'ok'); }
    function pct(x) { return fmt(x * 100, 0) + ' %'; }
    function checkTiles(defl, limit, limLabel, sigma, adm) {
        var a = limit > 0 ? defl / limit : 0, b = adm > 0 ? sigma / adm : 0;
        return [
            { l: 'Servicio · ' + limLabel, v: pct(a), tone: ratioTone(a), s: fmt(defl, 2) + ' mm de ' + fmt(limit, 1) + ' mm admisibles' },
            { l: 'Resistencia σ / σadm', v: pct(b), tone: ratioTone(b), s: fmt(sigma, 1) + ' MPa de ' + fmt(adm, 0) + ' MPa (referencia)' }
        ];
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

    /* ---------------- gráficas con ejes ---------------- */
    function niceTicks(a, b, n) {
        var span = b - a; if (!(span > 0)) return [a];
        var raw = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(raw)));
        var step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (q) { return q >= raw; })[0];
        var out = [];
        for (var v = Math.ceil(a / step - 1e-9) * step; v <= b + step * 1e-6; v += step) out.push(Math.round(v / step) * step);
        return out;
    }
    function trimN(v) { var t = Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100; return String(t).replace('.', ','); }
    function panel(ctx, bx, o) {
        var padL = 48, padR = 12, padT = 6, padB = o.xlabel ? 24 : 8;
        var px = bx.x + padL, py = bx.y + padT, pw = bx.w - padL - padR, ph = bx.h - padT - padB;
        function X(v) { return px + (v - o.xmin) / ((o.xmax - o.xmin) || 1) * pw; }
        function Y(v) { var t = (v - o.ymin) / ((o.ymax - o.ymin) || 1); return o.invert ? py + t * ph : py + ph - t * ph; }
        ctx.save();
        ctx.fillStyle = 'rgba(8,14,26,.55)'; ctx.fillRect(px, py, pw, ph);
        ctx.font = '600 9px Inter, Arial, sans-serif'; ctx.fillStyle = COL.dim; ctx.strokeStyle = 'rgba(167,180,200,.12)'; ctx.lineWidth = 1;
        niceTicks(o.xmin, o.xmax, o.xt || 6).forEach(function (v) {
            var x = Math.round(X(v)) + 0.5;
            ctx.beginPath(); ctx.moveTo(x, py); ctx.lineTo(x, py + ph); ctx.stroke();
            if (o.xlabel) { ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(trimN(v), x, py + ph + 4); }
        });
        niceTicks(o.ymin, o.ymax, o.yt || 3).forEach(function (v) {
            var y = Math.round(Y(v)) + 0.5;
            ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px + pw, y); ctx.stroke();
            ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(trimN(v), px - 5, y);
        });
        if (o.ymin < 0 && o.ymax > 0) {
            ctx.strokeStyle = 'rgba(226,232,240,.42)'; var z = Math.round(Y(0)) + 0.5;
            ctx.beginPath(); ctx.moveTo(px, z); ctx.lineTo(px + pw, z); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(167,180,200,.35)'; ctx.strokeRect(px + 0.5, py + 0.5, pw, ph);
        ctx.translate(bx.x + 10, py + ph / 2); ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = o.color || COL.txt; ctx.font = '700 9.5px Inter, Arial, sans-serif';
        ctx.fillText(o.ylabel || '', 0, 0);
        ctx.restore();
        if (o.xlabel) tx(ctx, o.xlabel, px + pw / 2, bx.y + bx.h - 1, { align: 'center', baseline: 'bottom', size: 9.5, color: COL.dim });
        return { X: X, Y: Y, px: px, py: py, pw: pw, ph: ph };
    }
    function trace(ctx, g, xs, ys, k) {
        ctx.beginPath();
        for (var i = 0; i < xs.length; i++) { var x = g.X(xs[i]), y = g.Y(ys[i] * k); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
    }
    function curve(ctx, g, xs, ys, k, color, width, dash, fill) {
        ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.setLineDash(dash || []); ctx.lineJoin = 'round';
        if (fill) {
            trace(ctx, g, xs, ys, k);
            ctx.lineTo(g.X(xs[xs.length - 1]), g.Y(0)); ctx.lineTo(g.X(xs[0]), g.Y(0)); ctx.closePath();
            ctx.fillStyle = fill; ctx.fill();
        }
        trace(ctx, g, xs, ys, k); ctx.stroke(); ctx.restore();
    }
    function span(arr) {
        var lo = 0, hi = 0;
        arr.forEach(function (v) { if (v < lo) lo = v; if (v > hi) hi = v; });
        if (hi - lo < 1e-9) return [-1, 1];
        var pad = (hi - lo) * 0.14;
        return [lo < 0 ? lo - pad : 0, hi > 0 ? hi + pad : 0];
    }
    function fitChart(c, ratio) {
        if (!c) return null;
        var w = Math.round(c.getBoundingClientRect().width || c.parentNode.clientWidth || 0);
        if (w < 40) return null;
        var h = Math.round(w * (ratio || 0.7));
        var dpr = Math.min(2.5, root.devicePixelRatio || 1);
        if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
        c.style.height = h + 'px';
        var ctx = c.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        return { ctx: ctx, W: w, H: h };
    }
    /* V, M y δ a lo largo del eje de la viga con cursor interactivo */
    function beamChart(ctx, W, H, r, P, p, kinds, cur0) {
        bg(ctx, W, H);
        var q = clamp(p, 0, 1), n = kinds.length, top = 6, bot = 2, gap = 4;
        var hh = (H - top - bot - gap * (n - 1)) / n;
        var N = r.xs.length - 1, Ltot = r.xs[N];
        var cur = ST.cur != null ? ST.cur : cur0;
        var i = clamp(Math.round(cur * N), 0, N);
        var conf = {
            V: { a: r.vs, m: 1, name: 'V', unit: 'kN', col: '#60A5FA', inv: false, dec: 1 },
            M: { a: r.ms, m: 1, name: 'M', unit: 'kN·m', col: COL.ok, inv: false, dec: 1 },
            d: { a: r.ds, m: 1000, name: 'δ', unit: 'mm', col: COL.pink, inv: true, dec: 2 }
        };
        var read = ['x = ' + fmt(r.xs[i], 2) + ' m'];
        kinds.forEach(function (k, idx) {
            var c = conf[k], by = top + idx * (hh + gap), last = idx === n - 1;
            var vals = c.a.map(function (v) { return v * c.m; });
            var sp = span(vals);
            var g = panel(ctx, { x: 0, y: by, w: W, h: hh }, {
                xmin: 0, xmax: Ltot, ymin: sp[0], ymax: sp[1], ylabel: c.name + ' (' + c.unit + ')',
                xlabel: last ? 'x (m)' : '', invert: c.inv, color: c.col, yt: hh < 90 ? 2 : 3
            });
            var absv = vals.map(function (v) { return c.inv ? Math.abs(v) : v; });
            curve(ctx, g, r.xs, absv, 1, c.col, 1.4, [4, 3], null);
            curve(ctx, g, r.xs, absv, q, c.col, 2.2, null, c.col.replace('#', '') ? shadeAlpha(c.col, 0.14) : null);
            var xc = g.X(r.xs[i]);
            ln(ctx, xc, g.py, xc, g.py + g.ph, 'rgba(226,232,240,.55)', 1, [3, 3]);
            ctx.save(); ctx.fillStyle = c.col; ctx.strokeStyle = '#0B1220'; ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(xc, g.Y(absv[i]), 4, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.restore();
            read.push(c.name + ' = ' + fmt(vals[i], c.dec) + ' ' + c.unit);
        });
        ST.readout = read.join(' · ');
    }
    function shadeAlpha(hex, a) {
        var n = parseInt(hex.slice(1), 16);
        return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    function trussChart(ctx, W, H, r, P, p) {
        bg(ctx, W, H);
        var q = clamp(p, 0, 1), nM = r.members.length, top = 8, bot = 32, rowH = (H - top - bot) / nM;
        var padL = 64, padR = 16, pw = W - padL - padR, m = (r.maxAbs || 1) * 1.18;
        function X(v) { return padL + (v + m) / (2 * m) * pw; }
        ctx.save();
        ctx.fillStyle = 'rgba(8,14,26,.55)'; ctx.fillRect(padL, top, pw, H - top - bot);
        ctx.font = '600 9px Inter, Arial, sans-serif'; ctx.fillStyle = COL.dim; ctx.strokeStyle = 'rgba(167,180,200,.12)'; ctx.lineWidth = 1;
        niceTicks(-m, m, 6).forEach(function (v) {
            var x = Math.round(X(v)) + 0.5;
            ctx.beginPath(); ctx.moveTo(x, top); ctx.lineTo(x, H - bot); ctx.stroke();
            ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(trimN(v), x, H - bot + 4);
        });
        ctx.strokeStyle = 'rgba(226,232,240,.5)'; ctx.beginPath(); ctx.moveTo(Math.round(X(0)) + 0.5, top); ctx.lineTo(Math.round(X(0)) + 0.5, H - bot); ctx.stroke();
        ctx.restore();
        tx(ctx, 'N (kN) · tracción +  /  compresión −', padL + pw / 2, H - 2, { align: 'center', baseline: 'bottom', size: 9.5, color: COL.dim });
        var big = null;
        r.members.forEach(function (mem, i) {
            var y = top + i * rowH, bh = Math.max(4, rowH * 0.56), cy = y + rowH / 2;
            var col = Math.abs(mem.force) < 1e-6 ? '#64748B' : (mem.force > 0 ? '#F87171' : '#60A5FA');
            tx(ctx, mem.name, padL - 6, cy, { align: 'right', size: 9, color: '#A7B4C8' });
            ctx.save(); ctx.strokeStyle = col; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
            ctx.strokeRect(Math.min(X(0), X(mem.force)) + 0.5, cy - bh / 2 + 0.5, Math.abs(X(mem.force) - X(0)), bh); ctx.restore();
            ctx.save(); ctx.fillStyle = col;
            ctx.fillRect(Math.min(X(0), X(mem.force * q)), cy - bh / 2, Math.abs(X(mem.force * q) - X(0)), bh); ctx.restore();
            var xe = X(mem.force) + (mem.force >= 0 ? 4 : -4);
            tx(ctx, fmt(mem.force, 1), xe, cy, { align: mem.force >= 0 ? 'left' : 'right', size: 8.5, color: '#D6DEE6' });
            if (!big || Math.abs(mem.force) > Math.abs(big.force)) big = mem;
        });
        ST.readout = big ? 'Barra más cargada: ' + big.name + ' = ' + fmt(big.force, 1) + ' kN (' + (big.force > 0 ? 'tracción' : 'compresión') + ')' : '';
    }
    function portalChart(ctx, W, H, r, P, p) {
        bg(ctx, W, H);
        var q = clamp(p, 0, 1), half = (W - 8) / 2, wmax = 120;
        var k = P.W > 0 ? r.sway / P.W : C.portalFrame({ W: 1, h: P.h, b: P.b, E: matOf(P).E, bc: 300, hc: P.hc }).sway;
        var lim = P.h * 1000 / 250, ymax = Math.max(lim, k * wmax) * 1.12;
        var g1 = panel(ctx, { x: 0, y: 6, w: half, h: H - 10 }, { xmin: 0, xmax: wmax, ymin: 0, ymax: ymax, ylabel: 'Δ (mm)', xlabel: 'W (kN)', color: COL.ok });
        curve(ctx, g1, [0, wmax], [0, k * wmax], 1, COL.ok, 2, null, null);
        ln(ctx, g1.px, g1.Y(lim), g1.px + g1.pw, g1.Y(lim), COL.bad, 1.2, [5, 4]);
        tx(ctx, 'h/250', g1.px + g1.pw - 4, g1.Y(lim) - 7, { align: 'right', size: 9, color: COL.bad });
        var wq = P.W * q;
        ctx.save(); ctx.strokeStyle = COL.ok; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(g1.X(P.W), g1.Y(r.sway), 5, 0, 6.283); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.fillStyle = COL.ok; ctx.strokeStyle = '#0B1220'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g1.X(wq), g1.Y(k * wq), 4, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.restore();
        var Mb = r.Mcol > 1e-9 ? r.Mcol : 1;
        var g2 = panel(ctx, { x: half + 8, y: 6, w: half, h: H - 10 }, { xmin: -Mb * 1.25, xmax: Mb * 1.25, ymin: 0, ymax: P.h, ylabel: 'altura (m)', xlabel: 'M columna (kN·m)', color: COL.pink, xt: 4 });
        var pts = [[Mb, 0], [0, P.h / 2], [-Mb, P.h]];
        ctx.save(); ctx.strokeStyle = COL.pink; ctx.setLineDash([4, 3]); ctx.lineWidth = 1.4; ctx.beginPath();
        pts.forEach(function (a, i) { var x = g2.X(a[0]), y = g2.Y(a[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
        ctx.save(); ctx.strokeStyle = COL.pink; ctx.lineWidth = 2.2; ctx.beginPath();
        pts.forEach(function (a, i) { var x = g2.X(a[0] * q), y = g2.Y(a[1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.restore();
        tx(ctx, 'inflexión', g2.X(0) + 6, g2.Y(P.h / 2) - 8, { size: 9, color: COL.dim });
        ST.readout = 'Δ = ' + fmt(r.sway, 2) + ' mm con W = ' + fmt(P.W, 0) + ' kN · rigidez lateral ≈ ' + fmt(k > 0 ? 1 / k : 0, 1) + ' kN/mm';
    }

    /* =========================================================
       01 · VIGA SIMPLEMENTE APOYADA
       ========================================================= */
    SIMS.viga = {
        num: '01', title: 'Viga simplemente apoyada', accent: '#3B82F6', rgb: '59,130,246',
        desc: 'Carga puntual y distribuida sobre una viga isostática. Observa reacciones, momento y flecha.',
        chips: ['L', 'P', 'a', 'w'],
        norma: 'Hibbeler, Análisis Estructural, cap. 4 · NSR-10 C.8',
        icon: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 38h54"/><path d="M9 38l-5 12h10zM55 38l-5 12h10z"/><path d="M32 8v18M27 14l5-6 5 6"/><path d="M14 28v10M18 28l-4 10M42 28v10M46 28l-4 10"/><path d="M8 56h48" stroke-dasharray="2 4"/></svg>',
        defaults: { L: 7, P: 45, aF: 0.45, w: 9, b: 300, h: 500, mat: 'concreto' },
        steps: [
            { t: 'Modelo y apoyos', d: 'Viga isostática: pasador en A y rodillo en B. Se supone material elástico lineal y sección constante.' },
            { t: 'Aplicación de cargas', d: 'La carga distribuida w y la puntual P suben de 0 al 100 % (la barra de avance las controla).' },
            { t: 'Reacciones', d: 'ΣM_A = 0 y ΣFy = 0 dan R_A y R_B; de ahí arrancan los diagramas.' },
            { t: 'Diagrama de cortante', d: 'V(x) cambia de signo donde el momento es máximo (dM/dx = V).' },
            { t: 'Diagrama de momento', d: 'El momento máximo gobierna el esfuerzo σ = M·c/I y el dimensionamiento.' },
            { t: 'Deformada y chequeos', d: 'δ por superposición; se compara con L/360 y el esfuerzo con el admisible de referencia.' }
        ],
        chartRatio: 0.86, cursor: true,
        chart: function (ctx, W, H, r, P, p) { beamChart(ctx, W, H, r, P, p, ['V', 'M', 'd'], r.xM / r.L); },
        controls: function () {
            var d = this.defaults;
            return matSelect(d.mat) + slider('L', 'Luz L', 3, 12, 0.5, d.L, ' m', 1) + slider('P', 'Carga puntual P', 0, 120, 5, d.P, ' kN', 0) +
                slider('aF', 'Posición de P', 0.1, 0.9, 0.05, d.aF, ' L', 2) + slider('w', 'Carga distribuida w', 0, 30, 1, d.w, ' kN/m', 0) +
                slider('b', 'Base b', 100, 500, 10, d.b, ' mm', 0) + slider('h', 'Altura h', 150, 800, 10, d.h, ' mm', 0);
        },
        compute: function (P) {
            return C.simpleBeam({ L: P.L, P: P.P, a: P.L * P.aF, w: P.w, E: matOf(P).E, b: P.b, h: P.h });
        },
        tiles: function (r, P) {
            return [
                { l: 'Momento máximo', v: fmt(r.Mabs, 1) + ' kN·m', s: 'x = ' + fmt(r.xM, 2) + ' m' },
                { l: 'Flecha máxima', v: fmt(r.dmax, 2) + ' mm', s: 'x = ' + fmt(r.xd, 2) + ' m' },
                { l: 'Reacción RA', v: fmt(r.RA, 1) + ' kN', s: 'RB = ' + fmt(r.RB, 1) + ' kN' },
                { l: 'Esfuerzo σ = Mc/I', v: fmt(r.sigma, 2) + ' MPa', s: 'sección ' + P.b + ' × ' + P.h + ' mm' }
            ].concat(checkTiles(r.dmax, P.L * 1000 / 360, 'L/360', r.sigma, matOf(P).adm));
        },
        note: function (r, P) {
            return '<b>Lectura:</b> al mover P hacia el centro el momento máximo crece; al acercarla a un apoyo, la reacción de ese apoyo aumenta. La flecha límite de referencia es L/360 = ' + fmt(P.L * 1000 / 360, 1) + ' mm.';
        },
        learn: '<p>La viga simplemente apoyada es el caso base del análisis. Con carga puntual P a una distancia a, las reacciones son RA = P(L−a)/L y RB = Pa/L. Con una carga distribuida w se suma wL/2 en cada apoyo.</p>' +
            '<div class="est-eq">M(x) = RA·x − w·x²/2 − P⟨x−a⟩¹ · V(x) = dM/dx · δ = superposición</div>' +
            '<p>En la vista 3D se muestra la viga como un prisma; la línea magenta es la deformada amplificada. Los apoyos se idealizan como pasador y rodillo.</p>',
        draw2d: function (ctx, W, H, r, P, p) {
            bg(ctx, W, H);
            var x0 = 48, x1 = W - 18, beamY = H * 0.30;
            function X(x) { return x0 + (x / P.L) * (x1 - x0); }
            ln(ctx, x0, beamY, x1, beamY, COL.beam, 8);
            pin(ctx, x0, beamY + 2); roller(ctx, x1, beamY + 2);
            tx(ctx, 'A', x0, beamY + 38, { align: 'center', size: 10, color: '#A7B4C8' });
            tx(ctx, 'B', x1, beamY + 38, { align: 'center', size: 10, color: '#A7B4C8' });
            dimH(ctx, x0, x1, beamY - 58, 'L = ' + fmt(P.L, 2) + ' m', P.aF > 0.35 && P.aF < 0.65 ? 0.12 : 0.5);
            var f = loadFactor(p);
            if (P.w > 0) {
                var top = beamY - 10 - 24 * f;
                ln(ctx, x0, top, x1, top, COL.load, 1.8);
                for (var i = 0; i <= 12; i++) { var xu = x0 + (x1 - x0) * i / 12; arrow(ctx, xu, top, xu, beamY - 4, 'rgba(251,191,36,.72)', 1.2); }
                tag(ctx, 'w = ' + fmt(P.w, 1) + ' kN/m', x0 + 4, top - 12, COL.load);
            }
            if (P.P > 0) {
                var xp = X(P.L * P.aF), len = 26 + 34 * f;
                arrow(ctx, xp, beamY - 12 - len, xp, beamY - 4, '#F87171', 2.4);
                tag(ctx, 'P = ' + fmt(P.P, 1) + ' kN', Math.min(xp + 8, W - 118), beamY - 16 - len, '#F87171');
            }
            // deformada
            var db = beamY + 26 + H * 0.10 * p, dd = dmaxOf(r.ds);
            ln(ctx, x0, beamY + 20, x1, beamY + 20, 'rgba(244,114,182,.22)', 1, [3, 4]);
            ctx.save(); ctx.strokeStyle = COL.pink; ctx.lineWidth = 2;
            ctx.beginPath();
            for (var j = 0; j < r.xs.length; j += 2) {
                var xx = X(r.xs[j]), yy = beamY + 24 + (Math.abs(r.ds[j]) / dd) * H * 0.085 * p;
                j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
            }
            ctx.stroke(); ctx.restore();
            tx(ctx, 'δmax = ' + fmt(r.dmax, 2) + ' mm', x1 - 130, beamY + 24 + H * 0.10, { size: 10, color: COL.pink });
            // momento
            var mb = H * 0.80, amp = H * 0.20, mmax = Math.max(1e-9, r.Mabs);
            ln(ctx, x0, mb, x1, mb, 'rgba(167,180,200,.35)', 1);
            tx(ctx, 'M (kN·m)', 12, mb - amp - 4, { size: 10, color: COL.dim });
            ctx.save(); ctx.beginPath(); ctx.moveTo(x0, mb);
            for (var k = 0; k < r.xs.length; k++) ctx.lineTo(X(r.xs[k]), mb - (r.ms[k] / mmax) * amp);
            ctx.lineTo(x1, mb); ctx.closePath();
            ctx.fillStyle = 'rgba(52,211,153,.16)'; ctx.fill();
            ctx.strokeStyle = COL.ok; ctx.lineWidth = 2; ctx.beginPath();
            for (var k2 = 0; k2 < r.xs.length; k2++) { var mx = X(r.xs[k2]), my = mb - (r.ms[k2] / mmax) * amp; k2 ? ctx.lineTo(mx, my) : ctx.moveTo(mx, my); }
            ctx.stroke(); ctx.restore();
            tag(ctx, 'Mmax = ' + fmt(r.Mabs, 1) + ' kN·m', Math.min(X(r.xM) + 6, W - 150), mb - amp - 12, COL.ok);
            tx(ctx, 'Vista 2D · equilibrio y diagrama de momento', W - 12, H - 8, { align: 'right', size: 10, color: COL.dim });
        },
        draw3d: function (ctx, W, H, r, P, p) {
            bg(ctx, W, H);
            var L = P.L;
            var o = { ox: W * 0.5, oy: H * 0.64, s: Math.min(W * 0.72 / (L * 1.12), H * 0.48 / 1.5) * ST.zoom };
            ground(ctx, W, H, o, Math.ceil(L / 1.4));
            box3(ctx, -L / 2, L / 2, -0.25, 0.25, -0.15, 0.15, o, '#94A3B8');
            // apoyos
            box3(ctx, -L / 2 - 0.08, -L / 2 + 0.08, -0.9, -0.25, -0.28, 0.28, o, '#475569');
            box3(ctx, L / 2 - 0.08, L / 2 + 0.08, -0.9, -0.25, -0.28, 0.28, o, '#475569');
            var f = loadFactor(p);
            function P3(x, y, z) { return project(x, y, z, o); }
            if (P.w > 0) {
                var topY = 0.25 + 0.25 + 0.5 * f;
                for (var i = 0; i <= 10; i++) {
                    var x = -L / 2 + L * i / 10, a = P3(x, topY, 0), b = P3(x, 0.25, 0);
                    arrow(ctx, a.x, a.y, b.x, b.y, 'rgba(251,191,36,.7)', 1.1);
                }
                var l1 = P3(-L / 2, topY, 0), l2 = P3(L / 2, topY, 0);
                ln(ctx, l1.x, l1.y, l2.x, l2.y, COL.load, 1.5);
                popup(ctx, 'w = ' + fmt(P.w, 1) + ' kN/m', l1.x + 70, l1.y - 14, COL.load);
            }
            if (P.P > 0) {
                var xp = -L / 2 + L * P.aF, a2 = P3(xp, 1.25, 0), b2 = P3(xp, 0.25, 0);
                arrow(ctx, a2.x, a2.y, b2.x, b2.y, '#F87171', 2.4);
                popup(ctx, 'P = ' + fmt(P.P, 1) + ' kN', (a2.x + b2.x) / 2 + 4, a2.y - 12, '#F87171');
            }
            // deformada 3D
            var dd = dmaxOf(r.ds);
            ctx.save(); ctx.strokeStyle = COL.pink; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.beginPath();
            for (var j = 0; j < r.xs.length; j += 4) {
                var q = project(-L / 2 + r.xs[j], -0.25 - (Math.abs(r.ds[j]) / dd) * H * 0.10 * p / o.s, 0, o);
                j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
            }
            ctx.stroke(); ctx.restore();
            tx(ctx, 'Vista 3D · prisma de la viga y deformada amplificada', W - 12, H - 8, { align: 'right', size: 10, color: COL.dim });
            tx(ctx, 'arrastra para girar', W - 16, H - 16, { align: 'right', size: 10, color: COL.dim });
        }
    };

    /* =========================================================
       02 · VOLADIZO
       ========================================================= */
    SIMS.voladizo = {
        num: '02', title: 'Viga en voladizo', accent: '#F59E0B', rgb: '245,158,11',
        desc: 'Empotramiento, momento negativo y flecha en la punta. La longitud pesa al cubo en la deformación.',
        chips: ['L', 'P', 'w'],
        norma: 'Hibbeler, Mecánica de Materiales, cap. 12 · Beer & Johnston, cap. 9',
        icon: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12v40M10 36h44"/><path d="M10 18h-4M10 28h-4M10 46h-4"/><path d="M44 14v18M39 20l5-6 5 6"/><path d="M30 26v10M34 26l-4 10"/><path d="M6 56h50" stroke-dasharray="2 4"/></svg>',
        defaults: { L: 3, P: 25, w: 6, b: 300, h: 400, mat: 'concreto' },
        steps: [
            { t: 'Modelo y empotramiento', d: 'Un extremo empotrado impide desplazamiento y giro; el otro extremo es libre.' },
            { t: 'Aplicación de cargas', d: 'La carga P en la punta y la distribuida w suben de 0 al 100 %.' },
            { t: 'Reacciones', d: 'ΣFy = 0 y ΣM = 0 en el empotramiento dan la reacción vertical y MA.' },
            { t: 'Diagrama de cortante', d: 'V es máximo en el empotramiento y se reduce hasta la carga de punta.' },
            { t: 'Diagrama de momento', d: 'M es negativo (tracción arriba) y máximo en el apoyo; nulo en la punta.' },
            { t: 'Elástica en la punta', d: 'δ = PL³/3EI + wL⁴/8EI: la longitud pesa al cubo y a la cuarta.' }
        ],
        chartRatio: 0.86, cursor: true,
        chart: function (ctx, W, H, r, P, p) { beamChart(ctx, W, H, r, P, p, ['V', 'M', 'd'], 0); },
        controls: function () {
            var d = this.defaults;
            return matSelect(d.mat) + slider('L', 'Longitud L', 1, 6, 0.25, d.L, ' m', 2) + slider('P', 'Carga en punta P', 0, 80, 2, d.P, ' kN', 0) +
                slider('w', 'Carga distribuida w', 0, 25, 0.5, d.w, ' kN/m', 1) +
                slider('b', 'Base b', 100, 500, 10, d.b, ' mm', 0) + slider('h', 'Altura h', 150, 800, 10, d.h, ' mm', 0);
        },
        compute: function (P) { return C.cantilever({ L: P.L, P: P.P, w: P.w, E: matOf(P).E, b: P.b, h: P.h }); },
        tiles: function (r, P) {
            return [
                { l: 'Momento de empotramiento', v: fmt(r.MA, 1) + ' kN·m', s: 'negativo (hogging)' },
                { l: 'Flecha en punta', v: fmt(r.dmax, 2) + ' mm', s: 'x = L' },
                { l: 'Reacción vertical', v: fmt(r.RA, 1) + ' kN', s: 'en el empotramiento' },
                { l: 'Esfuerzo σ = Mc/I', v: fmt(r.sigma, 2) + ' MPa', s: 'sección ' + P.b + ' × ' + P.h + ' mm' }
            ].concat(checkTiles(r.dmax, P.L * 1000 / 180, 'L/180', r.sigma, matOf(P).adm));
        },
        note: function (r, P) {
            return '<b>Lectura:</b> duplicar L multiplica por 8 la flecha de la carga puntual y por 16 la de la distribuida. El momento de empotramiento crece lineal o cuadráticamente con L.';
        },
        learn: '<p>El voladizo tiene una reacción vertical y un momento de empotramiento. El momento flector es máximo en el apoyo y nulo en la punta; la fibra superior trabaja a tracción en el empotramiento.</p>' +
            '<div class="est-eq">MA = −(P·L + w·L²/2) · δpunta = P·L³/(3EI) + w·L⁴/(8EI)</div>' +
            '<p>La vista 3D muestra el muro de empotramiento y el prisma de la viga. La deformada está amplificada para que sea visible.</p>',
        draw2d: function (ctx, W, H, r, P, p) {
            bg(ctx, W, H);
            var x0 = 58, x1 = W - 20, beamY = H * 0.28, f = loadFactor(p);
            function X(x) { return x0 + (x / P.L) * (x1 - x0); }
            ln(ctx, x0, beamY, x1, beamY, COL.beam, 8);
            fixed(ctx, x0, beamY - 26, beamY + 26, 'left');
            tx(ctx, 'empotramiento', x0 + 8, beamY + 42, { size: 10, color: '#A7B4C8' });
            dimH(ctx, x0, x1, beamY - 54, 'L = ' + fmt(P.L, 2) + ' m');
            if (P.w > 0) {
                var top = beamY - 8 - 22 * f;
                ln(ctx, x0, top, x1, top, COL.load, 1.8);
                for (var i = 0; i <= 10; i++) { var xu = x0 + (x1 - x0) * i / 10; arrow(ctx, xu, top, xu, beamY - 4, 'rgba(251,191,36,.72)', 1.2); }
                tag(ctx, 'w = ' + fmt(P.w, 1) + ' kN/m', x0 + 6, top - 12, COL.load);
            }
            if (P.P > 0) {
                var len = 28 + 32 * f;
                arrow(ctx, x1, beamY - 12 - len, x1, beamY - 4, '#F87171', 2.4);
                tag(ctx, 'P = ' + fmt(P.P, 1) + ' kN', x1 - 112, beamY - 16 - len, '#F87171');
            }
            // elástica
            var dd = dmaxOf(r.ds);
            ln(ctx, x0, beamY + 18, x1, beamY + 18, 'rgba(244,114,182,.2)', 1, [3, 4]);
            ctx.save(); ctx.strokeStyle = COL.pink; ctx.lineWidth = 2; ctx.beginPath();
            for (var j = 0; j < r.xs.length; j += 2) {
                var xx = X(r.xs[j]), yy = beamY + 22 + (Math.abs(r.ds[j]) / dd) * H * 0.10 * p;
                j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy);
            }
            ctx.stroke(); ctx.restore();
            tx(ctx, 'δpunta = ' + fmt(r.dmax, 2) + ' mm', x1 - 132, beamY + 24 + H * 0.10, { size: 10, color: COL.pink });
            // momento negativo
            var mb = H * 0.60, amp = H * 0.20, mmax = Math.max(1e-9, r.Mabs);
            ln(ctx, x0, mb, x1, mb, 'rgba(167,180,200,.35)', 1);
            tx(ctx, 'M (kN·m)', 12, mb + amp + 10, { size: 10, color: COL.dim });
            ctx.save(); ctx.beginPath(); ctx.moveTo(x0, mb);
            for (var k = 0; k < r.xs.length; k++) ctx.lineTo(X(r.xs[k]), mb - (r.ms[k] / mmax) * amp);
            ctx.lineTo(x1, mb); ctx.closePath();
            ctx.fillStyle = 'rgba(248,113,113,.16)'; ctx.fill();
            ctx.strokeStyle = COL.bad; ctx.lineWidth = 2; ctx.beginPath();
            for (var k2 = 0; k2 < r.xs.length; k2++) { var mx = X(r.xs[k2]), my = mb - (r.ms[k2] / mmax) * amp; k2 ? ctx.lineTo(mx, my) : ctx.moveTo(mx, my); }
            ctx.stroke(); ctx.restore();
            tag(ctx, 'MA = ' + fmt(r.MA, 1) + ' kN·m', x0 + 8, mb + amp + 16, COL.bad);
            tx(ctx, 'Vista 2D · empotramiento y momento negativo', W - 12, H - 8, { align: 'right', size: 10, color: COL.dim });
        },
        draw3d: function (ctx, W, H, r, P, p) {
            bg(ctx, W, H);
            var L = P.L;
            var o = { ox: W * 0.5, oy: H * 0.62, s: Math.min(W * 0.70 / (L * 1.18), H * 0.46 / 1.7) * ST.zoom };
            ground(ctx, W, H, o, Math.ceil(L / 1.2) + 1);
            box3(ctx, -L / 2 - 0.18, -L / 2, -0.95, 0.95, -0.6, 0.6, o, '#475569');
            box3(ctx, -L / 2, L / 2, -0.20, 0.20, -0.12, 0.12, o, '#94A3B8');
            var f = loadFactor(p);
            function P3(x, y, z) { return project(x, y, z, o); }
            if (P.w > 0) {
                var topY = 0.2 + 0.18 + 0.45 * f;
                for (var i = 0; i <= 9; i++) {
                    var x = -L / 2 + L * i / 9, a = P3(x, topY, 0), b = P3(x, 0.2, 0);
                    arrow(ctx, a.x, a.y, b.x, b.y, 'rgba(251,191,36,.7)', 1.1);
                }
                var l1 = P3(-L / 2, topY, 0), l2 = P3(L / 2, topY, 0);
                ln(ctx, l1.x, l1.y, l2.x, l2.y, COL.load, 1.5);
                popup(ctx, 'w = ' + fmt(P.w, 1) + ' kN/m', l1.x + 72, l1.y - 14, COL.load);
            }
            if (P.P > 0) {
                var a2 = P3(L / 2, 1.15, 0), b2 = P3(L / 2, 0.2, 0);
                arrow(ctx, a2.x, a2.y, b2.x, b2.y, '#F87171', 2.4);
                popup(ctx, 'P = ' + fmt(P.P, 1) + ' kN', a2.x, a2.y - 14, '#F87171');
            }
            var dd = dmaxOf(r.ds);
            ctx.save(); ctx.strokeStyle = COL.pink; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.beginPath();
            for (var j = 0; j < r.xs.length; j += 4) {
                var q = project(-L / 2 + r.xs[j], -0.2 - (Math.abs(r.ds[j]) / dd) * H * 0.11 * p / o.s, 0, o);
                j ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
            }
            ctx.stroke(); ctx.restore();
            tx(ctx, 'Vista 3D · muro de empotramiento y voladizo', W - 12, H - 8, { align: 'right', size: 10, color: COL.dim });
            tx(ctx, 'arrastra para girar', W - 16, H - 16, { align: 'right', size: 10, color: COL.dim });
        }
    };

    /* =========================================================
       03 · CERCHA PRATT
       ========================================================= */
    SIMS.cercha = {
        num: '03', title: 'Cercha Pratt', accent: '#2DD4BF', rgb: '45,212,191',
        desc: 'Ocho nudos y trece barras. Colorea tracción y compresión y mide la flecha por trabajo virtual.',
        chips: ['L', 'h', 'P', 'A'],
        norma: 'Hibbeler, Análisis Estructural, cap. 3 y 9 · McCormac, cap. 4',
        icon: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 46h54M9 46l11-24h24l11 24"/><path d="M20 46V22M32 46V22M44 46V22M20 22l12 24M44 22L32 46M20 22l24 24M44 22L20 46"/><path d="M32 8v6"/></svg>',
        defaults: { L: 10, h: 2.6, P: 50, A: 2000, mat: 'acero', node: 6 },
        steps: [
            { t: 'Geometría y apoyos', d: 'Ocho nudos y trece barras articuladas; pasador en B0 y rodillo en B4.' },
            { t: 'Carga en el nudo', d: 'La carga P se aplica en el nudo elegido y sube de 0 al 100 %.' },
            { t: 'Reacciones', d: 'ΣM y ΣF globales dan las reacciones; con carga centrada son iguales.' },
            { t: 'Equilibrio nodal', d: 'Se plantea ΣFx = ΣFy = 0 en cada nudo (matriz de 16 ecuaciones) y se resuelve.' },
            { t: 'Tracción y compresión', d: 'Rojo = tracción (barra se alarga), azul = compresión; el grosor indica la magnitud.' },
            { t: 'Flecha por trabajo virtual', d: 'Δ = Σ N·n·L/(EA) con n la fuerza por una carga unitaria en el nudo.' }
        ],
        chartRatio: 0.74,
        chartHint: 'Cada fila es una barra.',
        chart: function (ctx, W, H, r, P, p) { trussChart(ctx, W, H, r, P, p); },
        controls: function () {
            var d = this.defaults;
            return matSelect(d.mat) + selectCtl('node', 'Nudo cargado', [[6, 'T2 · centro, cordón superior'], [5, 'T1 · cordón superior'], [7, 'T3 · cordón superior'], [2, 'B2 · centro, cordón inferior'], [1, 'B1 · cordón inferior'], [3, 'B3 · cordón inferior']], d.node, 'Cambia dónde actúa P y cómo se reparten las barras.') +
                slider('L', 'Luz L', 4, 16, 0.5, d.L, ' m', 1) + slider('h', 'Altura h', 1, 4, 0.1, d.h, ' m', 1) +
                slider('P', 'Carga P', 0, 120, 5, d.P, ' kN', 0) + slider('A', 'Área de barra', 500, 5000, 100, d.A, ' mm²', 0);
        },
        compute: function (P) { return C.prattTruss({ L: P.L, h: P.h, P: P.P, E: matOf(P).E, A: P.A, node: P.node }); },
        tiles: function (r, P) {
            return [
                { l: 'Tracción máxima', v: fmt(r.maxT, 1) + ' kN', s: 'barras rojas' },
                { l: 'Compresión máxima', v: fmt(r.maxC, 1) + ' kN', s: 'barras azules' },
                { l: 'Flecha en ' + r.loadName, v: fmt(r.delta, 2) + ' mm', s: 'trabajo virtual' },
                { l: 'Reacciones', v: fmt(r.reactions.Ry0, 1) + ' / ' + fmt(r.reactions.Ry4, 1) + ' kN', s: 'B0 / B4' }
            ].concat(checkTiles(r.delta, P.L * 1000 / 360, 'L/360', r.maxAbs * 1000 / P.A, matOf(P).adm));
        },
        note: function (r, P) {
            return '<b>Lectura:</b> al aumentar la altura h baja la fuerza en los cordones pero crecen las diagonales. Al aumentar el área A baja la flecha de forma proporcional; la resistencia a compresión también exige revisar pandeo.';
        },
        learn: '<p>La cercha Pratt se resuelve nudo por nudo o con una matriz de equilibrio. Cada barra solo trabaja axialmente: tracción si aleja los nudos, compresión si los acerca.</p>' +
            '<div class="est-eq">Δ = Σ N·n·L/(EA) · N = fuerza real · n = fuerza con carga unitaria</div>' +
            '<p>La vista 2D colorea las barras por estado. La vista 3D muestra dos planos paralelos unidos por riostras, como una cercha espacial simplificada.</p>',
        draw2d: function (ctx, W, H, r, P, p) {
            bg(ctx, W, H);
            var padX = 50, padT = 42, padB = 58;
            var sc = Math.min((W - 2 * padX) / Math.max(1, P.L), (H - padT - padB) / Math.max(1, P.h));
            var ox = (W - P.L * sc) / 2, oy = H - padB;
            function X(x) { return ox + x * sc; }
            function Y(y) { return oy - y * sc; }
            r.members.forEach(function (m) {
                var a = r.nodes[m.a], b = r.nodes[m.b], f = m.force / r.maxAbs;
                var c = Math.abs(f) < 1e-6 ? '#64748B' : (f > 0 ? '#F87171' : '#60A5FA');
                ln(ctx, X(a.x), Y(a.y), X(b.x), Y(b.y), c, 1.8 + 3.4 * Math.abs(f));
            });
            r.nodes.forEach(function (n) {
                ctx.save(); ctx.fillStyle = '#0B1220'; ctx.strokeStyle = '#E2E8F0'; ctx.lineWidth = 1.6;
                ctx.beginPath(); ctx.arc(X(n.x), Y(n.y), 3.5, 0, 6.283); ctx.fill(); ctx.stroke(); ctx.restore();
            });
            pin(ctx, X(0), Y(0) + 2); roller(ctx, X(P.L), Y(0) + 2);
            var f2 = loadFactor(p);
            var ldn = r.nodes[r.loadNode];
            if (ldn.y > 0) {
                arrow(ctx, X(ldn.x), Y(ldn.y) - 12 - 34 * f2, X(ldn.x), Y(ldn.y) - 8, COL.load, 2.6);
                tag(ctx, 'P = ' + fmt(P.P, 1) + ' kN', X(ldn.x) + 8, Y(ldn.y) - 16 - 34 * f2, COL.load);
            } else {
                arrow(ctx, X(ldn.x), Y(0) + 6, X(ldn.x), Y(0) + 8 + 18 * f2, COL.load, 2.6);
                tag(ctx, 'P = ' + fmt(P.P, 1) + ' kN', X(ldn.x) + 8, Y(0) + 12, COL.load);
            }
            dimH(ctx, X(0), X(P.L), H - 12, 'L = ' + fmt(P.L, 1) + ' m');
            tag(ctx, 'tracción ' + fmt(r.maxT, 1) + ' kN', 14, H - 22, '#F87171');
            tag(ctx, 'compresión ' + fmt(r.maxC, 1) + ' kN', 152, H - 22, '#60A5FA');
            tx(ctx, 'Vista 2D · fuerzas axiales', W - 12, H - 8, { align: 'right', size: 10, color: COL.dim });
        },
        draw3d: function (ctx, W, H, r, P, p) {
            bg(ctx, W, H);
            var L = P.L, h = P.h;
            var o = { ox: W * 0.5, oy: H * 0.68, s: Math.min(W * 0.68 / (L * 1.15), H * 0.50 / (h + 1.4)) * ST.zoom };
            ground(ctx, W, H, o, Math.ceil(L / 1.5));
            var zs = [-0.7, 0.7];
            function P3(x, y, z) { return project(x - L / 2, y, z, o); }
            zs.forEach(function (z) {
                r.members.forEach(function (m) {
                    var a = r.nodes[m.a], b = r.nodes[m.b], f = m.force / r.maxAbs;
                    var c = Math.abs(f) < 1e-6 ? '#64748B' : (f > 0 ? '#F87171' : '#60A5FA');
                    var q1 = P3(a.x, a.y + 0.15, z), q2 = P3(b.x, b.y + 0.15, z);
                    ln(ctx, q1.x, q1.y, q2.x, q2.y, c, 1.4 + 2.2 * Math.abs(f));
                });
            });
            for (var i = 0; i < r.nodes.length; i++) {
                var n = r.nodes[i];
                var q1 = P3(n.x, n.y + 0.15, -0.7), q2 = P3(n.x, n.y + 0.15, 0.7);
                ln(ctx, q1.x, q1.y, q2.x, q2.y, 'rgba(148,163,184,.55)', 1.2);
            }
            var baseL = P3(0, 0, -0.7), baseR = P3(0, 0, 0.7), baseL2 = P3(L, 0, -0.7), baseR2 = P3(L, 0, 0.7);
            box3(ctx, -L / 2 - 0.12, -L / 2 + 0.12, -0.9, 0, -0.85, -0.55, o, '#475569');
            box3(ctx, L / 2 - 0.12, L / 2 + 0.12, -0.9, 0, -0.85, -0.55, o, '#475569');
            var f2 = loadFactor(p);
            var ldn = r.nodes[r.loadNode], ny = ldn.y > 0 ? ldn.y : 0;
            var top = P3(ldn.x, ny + 0.15, 0.7), bot = P3(ldn.x, ny + 0.05, 0.7);
            arrow(ctx, top.x, top.y - 34 * f2 - 8, bot.x, bot.y - 6, COL.load, 2.4);
            popup(ctx, 'P = ' + fmt(P.P, 1) + ' kN', top.x + 18, top.y - 34 * f2 - 18, COL.load);
            tx(ctx, 'Vista 3D · dos planos de cercha y riostras', W - 12, H - 8, { align: 'right', size: 10, color: COL.dim });
            tx(ctx, 'arrastra para girar', W - 16, H - 16, { align: 'right', size: 10, color: COL.dim });
        }
    };

    /* =========================================================
       04 · PÓRTICO PORTAL
       ========================================================= */
    SIMS.portico = {
        num: '04', title: 'Pórtico por el portal', accent: '#F472B6', rgb: '244,114,182',
        desc: 'Un vano y un piso con carga lateral. Distribuye cortantes, momentos y deriva con las hipótesis del portal.',
        chips: ['W', 'h', 'b'],
        norma: 'Hibbeler, Análisis Estructural, cap. 12 · McCormac, cap. 7',
        icon: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 54V16h40v38"/><path d="M8 54h10M46 54h10"/><path d="M32 16V8"/><path d="M26 8h12"/><path d="M12 30h40" stroke-dasharray="2 4"/><path d="M12 30l8-6M52 30l-8-6"/><circle cx="12" cy="16" r="2.4"/><circle cx="52" cy="16" r="2.4"/></svg>',
        defaults: { W: 35, h: 4, b: 6, hc: 300, mat: 'concreto' },
        steps: [
            { t: 'Modelo del pórtico', d: 'Un vano y un piso, columnas empotradas en la base y viga superior rígida.' },
            { t: 'Carga lateral', d: 'La fuerza horizontal W (viento o sismo) actúa a nivel de la viga y sube de 0 al 100 %.' },
            { t: 'Hipótesis del portal', d: 'Puntos de inflexión a media altura de columnas y a media luz de la viga.' },
            { t: 'Cortante por columna', d: 'Cada columna toma V = W/2 (columnas iguales).' },
            { t: 'Momentos y axial', d: 'M_col = V·h/2 en la base y en la cabeza; N en la viga por vuelco = W·h/(2b).' },
            { t: 'Deriva lateral', d: 'Δ ≈ W·h³/(24·E·I_col); se compara con h/250 y se revisa el esfuerzo.' }
        ],
        chartRatio: 0.5,
        chartHint: 'Izquierda: Δ contra W. Derecha: momento a lo largo de la columna.',
        chart: function (ctx, W, H, r, P, p) { portalChart(ctx, W, H, r, P, p); },
        controls: function () {
            var d = this.defaults;
            return matSelect(d.mat) + slider('W', 'Carga lateral total W', 0, 120, 5, d.W, ' kN', 0) + slider('h', 'Altura h', 2, 8, 0.25, d.h, ' m', 2) +
                slider('b', 'Luz b', 3, 12, 0.5, d.b, ' m', 1) + slider('hc', 'Peralte columna hc', 200, 600, 25, d.hc, ' mm', 0);
        },
        compute: function (P) { return C.portalFrame({ W: P.W, h: P.h, b: P.b, E: matOf(P).E, bc: 300, hc: P.hc }); },
        tiles: function (r, P) {
            return [
                { l: 'Cortante por columna', v: fmt(r.Vcol, 1) + ' kN', s: 'W/2' },
                { l: 'Momento en columna', v: fmt(r.Mcol, 1) + ' kN·m', s: 'a media altura' },
                { l: 'Deriva estimada', v: fmt(r.sway, 2) + ' mm', s: 'h/250 = ' + fmt(P.h * 1000 / 250, 1) + ' mm' },
                { l: 'Axial en viga', v: fmt(r.N, 1) + ' kN', s: 'por vuelco' }
            ].concat(checkTiles(r.sway, P.h * 1000 / 250, 'h/250', r.Mcol * 1e6 / (300 * P.hc * P.hc / 6), matOf(P).adm));
        },
        note: function (r, P) {
            return '<b>Lectura:</b> la deriva crece con h³ y baja con la inercia de la columna. Duplicar la altura multiplica por 8 la deriva si la sección no cambia.';
        },
        learn: '<p>El método del portal reparte el cortante total por igual entre las columnas y ubica los puntos de inflexión a media altura. Es una herramienta de predimensionamiento, no un reemplazo del análisis matricial.</p>' +
            '<div class="est-eq">Vcol = W/2 · Mcol = Vcol·h/2 · Δ ≈ W·h³/(24EIcol)</div>' +
            '<p>La vista 2D marca los puntos de inflexión y los momentos en las esquinas. La vista 3D muestra dos pórticos paralelos unidos por la viga de cubierta.</p>',
        draw2d: function (ctx, W, H, r, P, p) {
            bg(ctx, W, H);
            var lx = W * 0.30, rx = W * 0.70, top = H * 0.27, base = H * 0.76;
            ctx.save(); ctx.strokeStyle = COL.beam; ctx.lineWidth = 8; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(lx, base); ctx.lineTo(lx, top); ctx.lineTo(rx, top); ctx.lineTo(rx, base); ctx.stroke(); ctx.restore();
            fixed(ctx, lx, base - 2, base + 2, 'left'); fixed(ctx, rx, base - 2, base + 2, 'right');
            var f = loadFactor(p);
            arrow(ctx, lx - 50 - 40 * f, top - 10, lx - 10, top - 10, COL.load, 3);
            tag(ctx, 'W = ' + fmt(P.W, 1) + ' kN', lx - 60 - 40 * f, top - 30, COL.load);
            var ym = (top + base) / 2;
            [lx, rx].forEach(function (x) {
                ln(ctx, x - 12, ym, x + 12, ym, 'rgba(148,163,184,.7)', 1, [3, 3]);
                ctx.save(); ctx.fillStyle = '#94A3B8'; ctx.beginPath(); ctx.arc(x, ym, 2.6, 0, 6.283); ctx.fill(); ctx.restore();
            });
            var xm = (lx + rx) / 2;
            ln(ctx, xm - 12, top, xm + 12, top, 'rgba(148,163,184,.7)', 1, [3, 3]);
            tag(ctx, 'Mcol = ' + fmt(r.Mcol, 1) + ' kN·m', lx - 66, top + 28, COL.pink);
            tag(ctx, 'Mviga = ' + fmt(r.Mbeam, 1) + ' kN·m', rx - 50, top + 28, COL.pink);
            var sw = Math.min(48, r.sway * 2.2 * p);
            arrow(ctx, rx + 18, top + 46, rx + 18 + sw, top + 46, COL.ok, 2);
            tx(ctx, 'Δ = ' + fmt(r.sway, 2) + ' mm', rx + 18, top + 62, { size: 10, color: COL.ok });
            dimH(ctx, lx, rx, base + 34, 'b = ' + fmt(P.b, 2) + ' m');
            tx(ctx, 'Vista 2D · cortantes, momentos y deriva', W - 12, H - 8, { align: 'right', size: 10, color: COL.dim });
        },
        draw3d: function (ctx, W, H, r, P, p) {
            bg(ctx, W, H);
            var b = P.b, h = P.h;
            var o = { ox: W * 0.5, oy: H * 0.68, s: Math.min(W * 0.65 / (b * 1.15), H * 0.50 / (h + 1.8)) * ST.zoom };
            ground(ctx, W, H, o, Math.ceil(b / 1.2) + 1);
            var zs = [-1.2, 1.2];
            zs.forEach(function (z) {
                box3(ctx, -b / 2 - 0.12, -b / 2 + 0.12, -0.9, h, z - 0.12, z + 0.12, o, '#64748B');
                box3(ctx, b / 2 - 0.12, b / 2 + 0.12, -0.9, h, z - 0.12, z + 0.12, o, '#64748B');
                box3(ctx, -b / 2, b / 2, h - 0.22, h, z - 0.12, z + 0.12, o, '#94A3B8');
            });
            box3(ctx, -b / 2, b / 2, h - 0.10, h - 0.02, -1.2, 1.2, o, '#64748B');
            var f = loadFactor(p);
            var a1 = project(-b / 2 - 1.6 * f, h + 0.4, 1.2, o), b1 = project(-b / 2 - 0.1, h + 0.4, 1.2, o);
            arrow(ctx, a1.x, a1.y, b1.x, b1.y, COL.load, 2.8);
            popup(ctx, 'W = ' + fmt(P.W, 1) + ' kN', a1.x - 8, a1.y - 16, COL.load);
            var c1 = project(-b / 2, h + 0.4, 0, o);
            tag(ctx, 'Mcol = ' + fmt(r.Mcol, 1) + ' kN·m', c1.x - 50, c1.y - 32, COL.pink);
            // deriva fantasma
            var dx = Math.min(P.b, r.sway / 1000 * 6 * p);
            ctx.save(); ctx.strokeStyle = COL.ok; ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6;
            var t1 = project(-b / 2 + dx, h, 1.2, o), t2 = project(b / 2 + dx, h, 1.2, o);
            ln(ctx, t1.x, t1.y, t2.x, t2.y, COL.ok, 1.6, [5, 4]); ctx.restore();
            tx(ctx, 'Vista 3D · dos pórticos y losa de cubierta', W - 12, H - 8, { align: 'right', size: 10, color: COL.dim });
            tx(ctx, 'arrastra para girar · Δ = ' + fmt(r.sway, 2) + ' mm', W - 16, H - 16, { align: 'right', size: 10, color: COL.dim });
        }
    };


    /* =========================================================
       05 · VIGA CONTINUA DE DOS LUCES
       ========================================================= */
    SIMS.continuas = {
        num: '05', title: 'Viga continua de dos luces', accent: '#34D399', rgb: '52,211,153',
        desc: 'Tres apoyos y carga distribuida por tramo. Observa cómo el momento negativo en B reduce el positivo en las luces.',
        chips: ['L₁', 'L₂', 'w₁', 'w₂'],
        norma: 'Hibbeler, Análisis Estructural, cap. 11 · McCormac, cap. 5',
        icon: '<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 34h56"/><path d="M8 34l-4 10h8zM32 34l-4 10h8zM56 34l-4 10h8z"/><path d="M12 22v10M16 22l-4 10M40 22v10M44 22l-4 10"/><path d="M8 54c8-10 16-10 24 0s16 10 24 0" stroke-dasharray="2 4"/></svg>',
        defaults: { L1: 5, L2: 4, w1: 10, w2: 8, b: 300, h: 500, mat: 'concreto' },
        steps: [
            { t: 'Modelo de tres apoyos', d: 'Dos luces continuas sobre apoyos simples A, B y C; la continuidad en B hace la viga hiperestática de grado 1.' },
            { t: 'Aplicación de cargas', d: 'Las cargas w₁ y w₂ suben de 0 al 100 % sobre cada tramo.' },
            { t: 'Incógnita M_B', d: 'La ecuación de tres momentos (o pendiente-deflexión) impone giro continuo en B: M_B = −(w₁L₁³ + w₂L₂³)/[8(L₁+L₂)].' },
            { t: 'Reacciones', d: 'Con M_B conocido, cada tramo es isostático: R_A, R_B y R_C salen del equilibrio.' },
            { t: 'Diagramas V y M', d: 'El momento negativo en B reduce los positivos en las luces: así se redistribuye la carga.' }
        ],
        chartRatio: 0.62, cursor: true,
        chart: function (ctx, W, H, r, P, p) { beamChart(ctx, W, H, r, P, p, ['V', 'M'], P.L1 / (P.L1 + P.L2)); },
        controls: function () {
            var d = this.defaults;
            return matSelect(d.mat) + slider('L1', 'Luz 1 L₁', 2, 10, 0.5, d.L1, ' m', 1) + slider('L2', 'Luz 2 L₂', 2, 10, 0.5, d.L2, ' m', 1) +
                slider('w1', 'Carga w₁', 0, 40, 1, d.w1, ' kN/m', 0) + slider('w2', 'Carga w₂', 0, 40, 1, d.w2, ' kN/m', 0) +
                slider('b', 'Base b', 100, 500, 10, d.b, ' mm', 0) + slider('h', 'Altura h', 150, 800, 10, d.h, ' mm', 0);
        },
        compute: function (P) { return C.continuousBeam({ L1: P.L1, L2: P.L2, w1: P.w1, w2: P.w2, E: matOf(P).E, b: P.b, h: P.h }); },
        tiles: function (r, P) {
            var sig = r.Mabs * 1e6 / (P.b * P.h * P.h / 6), adm = matOf(P).adm, u = sig / adm;
            return [
                { l: 'Momento en el apoyo B', v: fmt(r.MB, 1) + ' kN·m', s: 'negativo (hogging)' },
                { l: 'Reacciones A / B / C', v: fmt(r.RA, 1) + ' / ' + fmt(r.RB, 1) + ' / ' + fmt(r.RC, 1) + ' kN', s: 'suma = carga total' },
                { l: 'Momento positivo máx.', v: fmt(r.Mpos, 1) + ' kN·m', s: 'en las luces' },
                { l: 'Resistencia σ / σadm', v: pct(u), tone: ratioTone(u), s: fmt(sig, 1) + ' MPa de ' + fmt(adm, 0) + ' MPa (referencia)' }
            ];
        },
        note: function (r, P) {
            return '<b>Lectura:</b> si las dos luces son iguales y cargan igual, M_B = −wL²/8. Al cargar más un tramo, M_B crece y el otro tramo se descarga: ese es el efecto de continuidad. No incluye asentamientos de apoyo.';
        },
        learn: '<p>En una viga continua el giro sobre el apoyo central es único para ambos tramos. Esa condición de compatibilidad da la ecuación que resuelve el momento M_B; después cada tramo se trata como una viga isostática con un momento en el extremo.</p>' +
            '<div class="est-eq">M_B = −(w₁L₁³ + w₂L₂³)/[8(L₁+L₂)] · R_A = w₁L₁/2 + M_B/L₁</div>' +
            '<p>Las curvas muestran V(x) y M(x) a lo largo de los dos tramos; arrastra el cursor sobre la gráfica para leer los valores en cualquier sección.</p>',
        draw2d: function (ctx, W, H, r, P, p) {
            bg(ctx, W, H);
            var x0 = 48, x1 = W - 22, LT = r.L1 + r.L2, beamY = H * 0.27, f = loadFactor(p);
            function X(x) { return x0 + x / LT * (x1 - x0); }
            var xb = X(r.L1);
            ln(ctx, x0, beamY, x1, beamY, COL.beam, 8);
            pin(ctx, x0, beamY + 2); pin(ctx, xb, beamY + 2); roller(ctx, x1, beamY + 2);
            tx(ctx, 'A', x0, beamY + 38, { align: 'center', size: 10, color: '#A7B4C8' });
            tx(ctx, 'B', xb, beamY + 38, { align: 'center', size: 10, color: '#A7B4C8' });
            tx(ctx, 'C', x1, beamY + 38, { align: 'center', size: 10, color: '#A7B4C8' });
            dimH(ctx, x0, xb, beamY - 62, 'L₁ = ' + fmt(r.L1, 2) + ' m');
            dimH(ctx, xb, x1, beamY - 62, 'L₂ = ' + fmt(r.L2, 2) + ' m');
            function udl(a, b, w) {
                if (!(w > 0)) return;
                var top = beamY - 8 - 20 * f;
                ln(ctx, a, top, b, top, COL.load, 1.8);
                for (var i = 0; i <= 8; i++) { var xu = a + (b - a) * i / 8; arrow(ctx, xu, top, xu, beamY - 4, 'rgba(251,191,36,.72)', 1.2); }
                tag(ctx, fmt(w, 1) + ' kN/m', a + 6, top - 12, COL.load);
            }
            udl(x0, xb, r.w1); udl(xb, x1, r.w2);
            var mb = H * 0.68, amp = H * 0.19, mmax = Math.max(1e-9, r.Mabs);
            ln(ctx, x0, mb, x1, mb, 'rgba(167,180,200,.35)', 1);
            tx(ctx, 'M (kN·m)', 12, mb - amp - 6, { size: 10, color: COL.dim });
            ctx.save(); ctx.beginPath(); ctx.moveTo(x0, mb);
            for (var k = 0; k < r.xs.length; k++) ctx.lineTo(X(r.xs[k]), mb - (r.ms[k] / mmax) * amp);
            ctx.lineTo(x1, mb); ctx.closePath(); ctx.fillStyle = 'rgba(52,211,153,.16)'; ctx.fill();
            ctx.strokeStyle = COL.ok; ctx.lineWidth = 2; ctx.beginPath();
            for (var k2 = 0; k2 < r.xs.length; k2++) { var mx = X(r.xs[k2]), my = mb - (r.ms[k2] / mmax) * amp; k2 ? ctx.lineTo(mx, my) : ctx.moveTo(mx, my); }
            ctx.stroke(); ctx.restore();
            ln(ctx, xb, mb - amp, xb, mb + amp, 'rgba(167,180,200,.3)', 1, [3, 3]);
            tag(ctx, 'MB = ' + fmt(r.MB, 1) + ' kN·m', Math.min(xb + 8, W - 130), mb + (Math.abs(r.MB) / mmax) * amp + 12, COL.bad);
            var im = 0; r.ms.forEach(function (v, i) { if (v > r.ms[im]) im = i; });
            tag(ctx, 'M+ = ' + fmt(r.Mpos, 1) + ' kN·m', Math.min(X(r.xs[im]) - 20, W - 130), mb - (r.Mpos / mmax) * amp - 14, COL.ok);
            tx(ctx, 'Vista 2D · momento en viga continua', W - 12, H - 8, { align: 'right', size: 10, color: COL.dim });
        },
        draw3d: function (ctx, W, H, r, P, p) {
            bg(ctx, W, H);
            var LT = r.L1 + r.L2;
            var o = { ox: W * 0.5, oy: H * 0.64, s: Math.min(W * 0.72 / (LT * 1.12), H * 0.48 / 1.5) * ST.zoom };
            ground(ctx, W, H, o, Math.ceil(LT / 1.4));
            box3(ctx, -LT / 2, LT / 2, -0.25, 0.25, -0.15, 0.15, o, '#94A3B8');
            [-LT / 2, -LT / 2 + r.L1, LT / 2].forEach(function (x) { box3(ctx, x - 0.08, x + 0.08, -0.9, -0.25, -0.28, 0.28, o, '#475569'); });
            var f = loadFactor(p);
            function P3(x, y, z) { return project(x, y, z, o); }
            function udl(a, b, w) {
                if (!(w > 0)) return;
                var topY = 0.5 + 0.45 * f;
                for (var i = 0; i <= 8; i++) { var x = a + (b - a) * i / 8, q1 = P3(x, topY, 0), q2 = P3(x, 0.25, 0); arrow(ctx, q1.x, q1.y, q2.x, q2.y, 'rgba(251,191,36,.7)', 1.1); }
                var l1 = P3(a, topY, 0), l2 = P3(b, topY, 0); ln(ctx, l1.x, l1.y, l2.x, l2.y, COL.load, 1.5);
                popup(ctx, fmt(w, 1) + ' kN/m', (l1.x + l2.x) / 2, l1.y - 14, COL.load);
            }
            udl(-LT / 2, -LT / 2 + r.L1, r.w1); udl(-LT / 2 + r.L1, LT / 2, r.w2);
            tx(ctx, 'Vista 3D · viga continua sobre tres apoyos', W - 12, H - 8, { align: 'right', size: 10, color: COL.dim });
            tx(ctx, 'arrastra para girar', W - 16, H - 16, { align: 'right', size: 10, color: COL.dim });
        }
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

})(typeof window !== 'undefined' ? window : globalThis);
