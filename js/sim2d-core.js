/**
 * GeoMetrics — Simuladores 2D (Mecánica de Suelos II) · utilidades compartidas
 * Exporta window.GeoSim2D = { H: helpers de dibujo, defs: {}, register(def) }
 */
(function (global) {
    'use strict';

    var TAU = Math.PI * 2;
    var C = {
        bg: '#0B1220', panel: '#151F32', panel2: '#1E293B', line: '#2B3A50',
        text: '#F1F5F9', soft: '#A7B4C8', mute: '#718096',
        steel1: '#6b7a90', steel2: '#3a4659', steel3: '#222c3c',
        ok: '#22C55E', warn: '#FBBF24', bad: '#F43F5E'
    };

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function lerp(a, b, t) { return a + (b - a) * t; }
    function fmt(v, d) {
        if (v == null || !isFinite(v)) return '—';
        return Number(v).toFixed(d == null ? 1 : d);
    }
    /* PRNG determinista para granos (la textura no parpadea) */
    function rng(seed) {
        var s = seed >>> 0;
        return function () {
            s = (s + 0x6D2B79F5) >>> 0;
            var t = s;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    /* Prepara un canvas con coordenadas lógicas W×H, nítido en pantallas HiDPI */
    function prep(canvas, W, H) {
        var dpr = global.devicePixelRatio || 1;
        var cssW = canvas.clientWidth || W;
        var cssH = Math.round(cssW * H / W);
        var pw = Math.round(cssW * dpr), ph = Math.round(cssH * dpr);
        if (canvas.width !== pw || canvas.height !== ph) {
            canvas.width = pw; canvas.height = ph;
            canvas.style.height = cssH + 'px';
        }
        var ctx = canvas.getContext('2d');
        ctx.setTransform(pw / W, 0, 0, ph / H, 0, 0);
        ctx.clearRect(0, 0, W, H);
        return ctx;
    }

    function rrect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
    }

    function hexRgb(hex) {
        var h = hex.replace('#', '');
        return [parseInt(h.substr(0, 2), 16), parseInt(h.substr(2, 2), 16), parseInt(h.substr(4, 2), 16)];
    }
    function rgba(hex, a) { var c = hexRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

    /* Fondo de escenario: degradado + cuadrícula + resplandor del color del ensayo */
    function stageBg(ctx, W, H, accent, tick) {
        var g = ctx.createLinearGradient(0, 0, 0, H);
        g.addColorStop(0, '#0e1729'); g.addColorStop(1, '#0a101d');
        ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
        var rg = ctx.createRadialGradient(W / 2, H * 0.55, 20, W / 2, H * 0.55, W * 0.6);
        rg.addColorStop(0, rgba(accent, 0.20)); rg.addColorStop(1, rgba(accent, 0));
        ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(167,180,200,.06)'; ctx.lineWidth = 1;
        var off = (tick || 0) % 28;
        ctx.beginPath();
        for (var x = -off; x < W; x += 28) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
        for (var y = 0; y < H; y += 28) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
        ctx.stroke();
    }

    /* Pieza metálica con degradado vertical */
    function steel(ctx, x, y, w, h, r, dark) {
        var g = ctx.createLinearGradient(x, y, x + w, y);
        if (dark) { g.addColorStop(0, '#1c2536'); g.addColorStop(0.5, '#3a4659'); g.addColorStop(1, '#1c2536'); }
        else { g.addColorStop(0, '#5a6a82'); g.addColorStop(0.45, '#9fb0c8'); g.addColorStop(0.6, '#7b8ca6'); g.addColorStop(1, '#4a5870'); }
        rrect(ctx, x, y, w, h, r || 3);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.stroke();
    }

    function arrow(ctx, x1, y1, x2, y2, color, lw, head) {
        var a = Math.atan2(y2 - y1, x2 - x1), hs = head || 9;
        ctx.save();
        ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lw || 3; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2 - Math.cos(a) * hs * 0.6, y2 - Math.sin(a) * hs * 0.6); ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - Math.cos(a - 0.45) * hs, y2 - Math.sin(a - 0.45) * hs);
        ctx.lineTo(x2 - Math.cos(a + 0.45) * hs, y2 - Math.sin(a + 0.45) * hs);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    function label(ctx, txt, x, y, o) {
        o = o || {};
        ctx.save();
        ctx.font = (o.weight || '600') + ' ' + (o.size || 12) + 'px Inter, system-ui, sans-serif';
        ctx.textAlign = o.align || 'left'; ctx.textBaseline = o.base || 'middle';
        if (o.bg) {
            var w = ctx.measureText(txt).width + 14;
            var x0 = o.align === 'center' ? x - w / 2 : (o.align === 'right' ? x - w : x - 7);
            rrect(ctx, x0, y - (o.size || 12) / 2 - 5, w, (o.size || 12) + 10, 7);
            ctx.fillStyle = o.bg; ctx.fill();
            if (o.stroke) { ctx.strokeStyle = o.stroke; ctx.lineWidth = 1; ctx.stroke(); }
        }
        ctx.fillStyle = o.color || C.soft;
        ctx.fillText(txt, x, y);
        ctx.restore();
    }

    /* Reloj comparador / anillo de carga */
    function dial(ctx, cx, cy, r, val, max, accent, title, readout) {
        ctx.save();
        var g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.1, cx, cy, r);
        g.addColorStop(0, '#f4f7fb'); g.addColorStop(1, '#cdd6e3');
        ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU);
        var bz = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
        bz.addColorStop(0, '#9fb0c8'); bz.addColorStop(1, '#2b3647');
        ctx.fillStyle = bz; ctx.fill();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fillStyle = g; ctx.fill();
        var a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
        ctx.strokeStyle = '#334155'; ctx.lineWidth = 1.2;
        for (var i = 0; i <= 20; i++) {
            var a = lerp(a0, a1, i / 20), big = i % 5 === 0;
            ctx.beginPath();
            ctx.moveTo(cx + Math.cos(a) * (r - (big ? 11 : 6)), cy + Math.sin(a) * (r - (big ? 11 : 6)));
            ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
            ctx.lineWidth = big ? 1.8 : 1; ctx.stroke();
        }
        /* arco de color */
        var fa = lerp(a0, a1, clamp(val / max, 0, 1));
        ctx.beginPath(); ctx.arc(cx, cy, r - 15, a0, fa);
        ctx.strokeStyle = accent; ctx.lineWidth = 5; ctx.lineCap = 'round'; ctx.stroke();
        /* aguja */
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(fa) * (r - 9), cy + Math.sin(fa) * (r - 9));
        ctx.strokeStyle = '#be123c'; ctx.lineWidth = 2.4; ctx.stroke();
        ctx.beginPath(); ctx.arc(cx, cy, 4.5, 0, TAU); ctx.fillStyle = '#1e293b'; ctx.fill();
        ctx.font = '700 9px Inter, system-ui, sans-serif'; ctx.fillStyle = '#475569'; ctx.textAlign = 'center';
        ctx.fillText(title, cx, cy + r * 0.42);
        ctx.font = '700 11px Inter, system-ui, sans-serif'; ctx.fillStyle = '#0f172a';
        ctx.fillText(readout, cx, cy + r * 0.64);
        ctx.restore();
    }

    /* Gráfica XY con curva completa tenue + trazo vivo + marcador */
    function plot(ctx, W, H, o) {
        var L = 54, R = 16, T = 30, B = 40;
        var pw = W - L - R, ph = H - T - B;
        function X(v) { return L + (v - o.xmin) / (o.xmax - o.xmin) * pw; }
        function Y(v) { return T + ph - (v - o.ymin) / (o.ymax - o.ymin) * ph; }
        ctx.save();
        rrect(ctx, 0, 0, W, H, 14); ctx.fillStyle = '#0d1626'; ctx.fill();
        label(ctx, o.title, 16, 16, { color: C.text, size: 13, weight: '700' });
        /* rejilla y ticks */
        ctx.strokeStyle = 'rgba(167,180,200,.10)'; ctx.lineWidth = 1;
        var xt = o.xticks || ticks(o.xmin, o.xmax, 5), yt = o.yticks || ticks(o.ymin, o.ymax, 5);
        ctx.beginPath();
        xt.forEach(function (v) { ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); });
        yt.forEach(function (v) { ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); });
        ctx.stroke();
        ctx.fillStyle = C.mute; ctx.font = '500 10.5px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        xt.forEach(function (v) { ctx.fillText(o.xfmt ? o.xfmt(v) : trim(v), X(v), T + ph + 6); });
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        yt.forEach(function (v) { ctx.fillText(o.yfmt ? o.yfmt(v) : trim(v), L - 7, Y(v)); });
        ctx.strokeStyle = '#3b4a63'; ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
        ctx.fillStyle = C.soft; ctx.font = '600 11px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.fillText(o.xlabel, L + pw / 2, H - 14);
        ctx.save(); ctx.translate(14, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.fillText(o.ylabel, 0, 0); ctx.restore();
        /* extras previos (líneas guía) */
        if (o.under) o.under(ctx, X, Y, pw, ph, L, T);
        /* curva completa tenue */
        ctx.beginPath(); ctx.setLineDash([5, 5]); ctx.lineWidth = 1.6; ctx.strokeStyle = rgba(o.color, 0.35);
        o.pts.forEach(function (p, i) { if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); });
        ctx.stroke(); ctx.setLineDash([]);
        if (o.nolive) { if (o.over) o.over(ctx, X, Y, pw, ph, L, T); ctx.restore(); return; }
        /* trazo vivo */
        var n = Math.max(1, Math.round(o.progress * (o.pts.length - 1)));
        ctx.save();
        ctx.beginPath(); ctx.rect(L, T - 4, pw, ph + 8); ctx.clip();
        ctx.beginPath();
        for (var i = 0; i <= n; i++) { var p = o.pts[i]; if (i) ctx.lineTo(X(p.x), Y(p.y)); else ctx.moveTo(X(p.x), Y(p.y)); }
        ctx.shadowColor = o.color; ctx.shadowBlur = 12; ctx.strokeStyle = o.color; ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.stroke();
        ctx.shadowBlur = 0;
        /* relleno bajo la curva */
        ctx.lineTo(X(o.pts[n].x), Y(o.ymin)); ctx.lineTo(X(o.pts[0].x), Y(o.ymin)); ctx.closePath();
        var gf = ctx.createLinearGradient(0, T, 0, T + ph);
        gf.addColorStop(0, rgba(o.color, 0.28)); gf.addColorStop(1, rgba(o.color, 0));
        ctx.fillStyle = gf; ctx.fill();
        ctx.restore();
        /* marcador */
        var pm = o.pts[n];
        ctx.beginPath(); ctx.arc(X(pm.x), Y(pm.y), 9, 0, TAU); ctx.fillStyle = rgba(o.color, 0.25); ctx.fill();
        ctx.beginPath(); ctx.arc(X(pm.x), Y(pm.y), 4.6, 0, TAU); ctx.fillStyle = '#fff'; ctx.fill();
        ctx.lineWidth = 2; ctx.strokeStyle = o.color; ctx.stroke();
        if (o.over) o.over(ctx, X, Y, pw, ph, L, T);
        ctx.restore();
    }

    function trim(v) { return (Math.abs(v) >= 100 ? Math.round(v) : Math.round(v * 100) / 100).toString(); }
    function ticks(a, b, n) {
        var span = b - a, raw = span / n, mag = Math.pow(10, Math.floor(Math.log10(raw)));
        var step = [1, 2, 2.5, 5, 10].map(function (m) { return m * mag; }).filter(function (s) { return s >= raw; })[0];
        var out = [], v = Math.ceil(a / step) * step;
        for (; v <= b + 1e-9; v += step) out.push(Math.round(v / step) * step);
        return out;
    }

    /* Polígono de semiplano (para partir una probeta por un plano de falla) */
    function halfPlane(x0, y0, ang, side) {
        var dx = Math.cos(ang), dy = -Math.sin(ang), nx = -dy * side, ny = dx * side, B = 2000;
        return [
            [x0 - dx * B, y0 - dy * B], [x0 + dx * B, y0 + dy * B],
            [x0 + dx * B + nx * B, y0 + dy * B + ny * B], [x0 - dx * B + nx * B, y0 - dy * B + ny * B]
        ];
    }
    function polyPath(ctx, pts) {
        ctx.beginPath();
        pts.forEach(function (p, i) { if (i) ctx.lineTo(p[0], p[1]); else ctx.moveTo(p[0], p[1]); });
        ctx.closePath();
    }

    /**
     * Probeta cilíndrica vista de frente.
     *  o: { cx, top, w, h, eps(0-1), mode:'barrel'|'shear', failed(0-1), theta(rad), tone:'clay'|'sand' }
     */
    function specimen(ctx, o) {
        var cx = o.cx, top = o.top, w0 = o.w, h = o.h;
        var wMean = w0 / Math.sqrt(Math.max(0.5, 1 - o.eps));
        var bul = o.mode === 'barrel' ? clamp(o.eps * 0.9, 0, 0.22) * (o.failed > 0 ? 1 + o.failed * 0.35 : 1) : o.eps * 0.12;
        var N = 28, left = [], right = [], i;
        for (i = 0; i <= N; i++) {
            var t = i / N, w = wMean * (1 + bul * Math.sin(Math.PI * t));
            left.push([cx - w / 2, top + h * t]); right.push([cx + w / 2, top + h * t]);
        }
        var body = left.concat(right.slice().reverse());
        var base = o.tone === 'sand' ? ['#caa86a', '#a98446', '#7d5f2c'] : ['#b98a5a', '#94673c', '#6b4626'];
        function paint() {
            polyPath(ctx, body);
            var g = ctx.createLinearGradient(cx - wMean / 2, 0, cx + wMean / 2, 0);
            g.addColorStop(0, base[2]); g.addColorStop(0.28, base[0]); g.addColorStop(0.6, base[1]); g.addColorStop(1, base[2]);
            ctx.fillStyle = g; ctx.fill();
            /* textura */
            var r = rng(o.seed || 7);
            ctx.save(); polyPath(ctx, body); ctx.clip();
            for (var k = 0; k < 120; k++) {
                var gx = cx - wMean / 2 + r() * wMean, gy = top + r() * h, gr = 0.7 + r() * 1.6;
                ctx.fillStyle = r() > 0.5 ? 'rgba(0,0,0,.20)' : 'rgba(255,255,255,.12)';
                ctx.beginPath(); ctx.arc(gx, gy, gr, 0, TAU); ctx.fill();
            }
            ctx.restore();
        }
        if (o.mode === 'shear' && o.failed > 0) {
            var pxm = cx, pym = top + h / 2, th = o.theta;
            var slide = o.failed * 16;
            ctx.save(); polyPath(ctx, halfPlane(pxm, pym, th, 1)); ctx.clip(); paint(); ctx.restore();           /* parte inferior-derecha */
            ctx.save();
            polyPath(ctx, halfPlane(pxm, pym, th, -1)); ctx.clip();
            ctx.translate(-Math.cos(th) * slide, Math.sin(th) * slide); paint(); ctx.restore();                 /* cuña superior desliza */
            /* plano de falla brillante */
            var dx = Math.cos(th), dy = -Math.sin(th), len = h / Math.sin(th) / 2;
            ctx.save();
            ctx.shadowColor = '#fb7185'; ctx.shadowBlur = 14;
            ctx.strokeStyle = 'rgba(251,113,133,.95)'; ctx.lineWidth = 2.2; ctx.setLineDash([7, 4]);
            ctx.beginPath(); ctx.moveTo(pxm - dx * len, pym - dy * len); ctx.lineTo(pxm + dx * len, pym + dy * len); ctx.stroke();
            ctx.restore();
        } else {
            paint();
            if (o.failed > 0) {
                ctx.save(); ctx.strokeStyle = 'rgba(40,20,10,.75)'; ctx.lineWidth = 1.4;
                var rr = rng(21);
                for (var c = 0; c < 6; c++) {
                    var yy = top + h * (0.25 + rr() * 0.5), xx = cx + (c % 2 ? 1 : -1) * wMean * 0.5 * (1 + bul);
                    ctx.beginPath(); ctx.moveTo(xx, yy); ctx.lineTo(xx - (c % 2 ? 1 : -1) * 10 * o.failed, yy + 8 * (rr() - 0.3)); ctx.stroke();
                }
                ctx.restore();
            }
        }
        ctx.save(); polyPath(ctx, body); ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
        return { wMean: wMean };
    }

    var defs = {};
    function register(key, def) { defs[key] = def; }

    global.GeoSim2D = {
        C: C, defs: defs, register: register,
        H: {
            clamp: clamp, lerp: lerp, fmt: fmt, rng: rng, prep: prep, rrect: rrect, rgba: rgba, hexRgb: hexRgb,
            stageBg: stageBg, steel: steel, arrow: arrow, label: label, dial: dial, plot: plot, ticks: ticks,
            specimen: specimen, halfPlane: halfPlane, polyPath: polyPath, TAU: TAU
        }
    };
})(window);
