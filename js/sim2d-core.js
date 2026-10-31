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
        /* haz de luz cenital */
        var cone = ctx.createRadialGradient(W * 0.5, -30, 10, W * 0.5, H * 0.45, H * 0.95);
        cone.addColorStop(0, 'rgba(210,228,255,.10)'); cone.addColorStop(1, 'rgba(210,228,255,0)');
        ctx.fillStyle = cone; ctx.fillRect(0, 0, W, H);
        /* mesa de laboratorio: franja inferior con horizonte luminoso */
        var fy = H * 0.855;
        var fg = ctx.createLinearGradient(0, fy, 0, H);
        fg.addColorStop(0, 'rgba(30,45,72,.0)'); fg.addColorStop(0.18, 'rgba(26,40,66,.78)'); fg.addColorStop(1, 'rgba(6,10,19,.96)');
        ctx.fillStyle = fg; ctx.fillRect(0, fy - 6, W, H - fy + 6);
        var hl = ctx.createLinearGradient(0, 0, W, 0);
        hl.addColorStop(0, rgba(accent, 0)); hl.addColorStop(0.5, rgba(accent, 0.55)); hl.addColorStop(1, rgba(accent, 0));
        ctx.save(); ctx.shadowColor = accent; ctx.shadowBlur = 10;
        ctx.fillStyle = hl; ctx.fillRect(W * 0.04, fy, W * 0.92, 1.6); ctx.restore();
        var rf = ctx.createRadialGradient(W / 2, fy, 4, W / 2, fy, W * 0.42);
        rf.addColorStop(0, rgba(accent, 0.16)); rf.addColorStop(1, rgba(accent, 0));
        ctx.fillStyle = rf; ctx.fillRect(0, fy, W, H - fy);
    }

    /* Pieza metálica con degradado vertical */
    function steel(ctx, x, y, w, h, r, dark) {
        var g = ctx.createLinearGradient(x, y, x + w, y);
        if (dark) { g.addColorStop(0, '#1c2536'); g.addColorStop(0.5, '#3a4659'); g.addColorStop(1, '#1c2536'); }
        else { g.addColorStop(0, '#5a6a82'); g.addColorStop(0.45, '#9fb0c8'); g.addColorStop(0.6, '#7b8ca6'); g.addColorStop(1, '#4a5870'); }
        if (w * h > 600) {
            ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 9; ctx.shadowOffsetY = 3;
            rrect(ctx, x, y, w, h, r || 3); ctx.fillStyle = g; ctx.fill(); ctx.restore();
        }
        rrect(ctx, x, y, w, h, r || 3);
        ctx.fillStyle = g; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.45)'; ctx.lineWidth = 1; ctx.stroke();
        /* brillo superior y sombra inferior (volumen) */
        if (h > 5 && w > 5) {
            var gv = ctx.createLinearGradient(0, y, 0, y + h);
            gv.addColorStop(0, 'rgba(255,255,255,' + (dark ? 0.10 : 0.30) + ')'); gv.addColorStop(0.28, 'rgba(255,255,255,0)');
            gv.addColorStop(0.72, 'rgba(0,0,0,0)'); gv.addColorStop(1, 'rgba(0,0,0,.28)');
            rrect(ctx, x, y, w, h, r || 3); ctx.fillStyle = gv; ctx.fill();
        }
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
        bz.addColorStop(0, '#b9c8de'); bz.addColorStop(0.5, '#5b6b84'); bz.addColorStop(1, '#2b3647');
        ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.55)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
        ctx.fillStyle = bz; ctx.fill(); ctx.restore();
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
        /* cristal con reflejo */
        ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
        var gl = ctx.createLinearGradient(cx - r, cy - r, cx + r * 0.35, cy + r * 0.35);
        gl.addColorStop(0, 'rgba(255,255,255,.42)'); gl.addColorStop(0.55, 'rgba(255,255,255,.10)'); gl.addColorStop(0.56, 'rgba(255,255,255,0)');
        ctx.fillStyle = gl; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
        ctx.restore();
        ctx.restore();
    }

    /* Gráfica XY con curva completa tenue + trazo vivo + marcador */
    function plot(ctx, W, H, o) {
        var L = 54, R = 16, T = 30, B = 40;
        var pw = W - L - R, ph = H - T - B;
        function X(v) { return L + (v - o.xmin) / (o.xmax - o.xmin) * pw; }
        function Y(v) { return T + ph - (v - o.ymin) / (o.ymax - o.ymin) * ph; }
        ctx.save();
        rrect(ctx, 0, 0, W, H, 14); ctx.fillStyle = '#151F32'; ctx.fill();
        label(ctx, o.title, 16, 16, { color: C.text, size: 14.5, weight: '700' });
        /* rejilla y ticks */
        ctx.strokeStyle = 'rgba(167,180,200,.10)'; ctx.lineWidth = 1;
        var xt = o.xticks || ticks(o.xmin, o.xmax, 5), yt = o.yticks || ticks(o.ymin, o.ymax, 5);
        ctx.beginPath();
        xt.forEach(function (v) { ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); });
        yt.forEach(function (v) { ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); });
        ctx.stroke();
        ctx.fillStyle = C.soft; ctx.font = '500 11.5px Inter, system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        xt.forEach(function (v) { ctx.fillText(o.xfmt ? o.xfmt(v) : trim(v), X(v), T + ph + 6); });
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        yt.forEach(function (v) { ctx.fillText(o.yfmt ? o.yfmt(v) : trim(v), L - 7, Y(v)); });
        ctx.save(); ctx.strokeStyle = rgba(o.color, 0.55); ctx.lineWidth = 1.6; ctx.shadowColor = o.color; ctx.shadowBlur = 6;
        ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke(); ctx.restore();
        ctx.fillStyle = C.soft; ctx.font = '600 12px Inter, system-ui, sans-serif';
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
        if (o.progress > 0) {
            /* guías hacia los ejes con el valor leído */
            ctx.save(); ctx.setLineDash([3, 4]); ctx.lineWidth = 1; ctx.strokeStyle = rgba(o.color, 0.45);
            ctx.beginPath(); ctx.moveTo(X(pm.x), Y(pm.y)); ctx.lineTo(X(pm.x), T + ph); ctx.moveTo(X(pm.x), Y(pm.y)); ctx.lineTo(L, Y(pm.y)); ctx.stroke(); ctx.restore();
            var chip = function (txt, cx2, cy2, al) {
                ctx.save(); ctx.font = '700 10.5px Inter, system-ui, sans-serif';
                var tw = ctx.measureText(txt).width + 10, x0 = al === 'r' ? cx2 - tw : cx2 - tw / 2;
                rrect(ctx, x0, cy2 - 8, tw, 16, 5); ctx.fillStyle = o.color; ctx.fill();
                ctx.fillStyle = '#0B1220'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(txt, x0 + tw / 2, cy2 + 0.5); ctx.restore();
            };
            if (X(pm.x) > L + 24) chip(o.xfmt ? o.xfmt(pm.x) : trim(pm.x), X(pm.x), T + ph - 10, 'c');
            if (Y(pm.y) < T + ph - 22) chip(o.yfmt ? o.yfmt(pm.y) : trim(pm.y), L + 2 + 0, Y(pm.y), 'r');
        }
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
        var TONES = { sand: ['#caa86a', '#a98446', '#7d5f2c'], gray: ['#a4a9ad', '#868c91', '#5f6469'], steel: ['#c3ccd7', '#97a3b2', '#5d6877'], wood: ['#d2a468', '#ad8049', '#7e5a2c'], clay: ['#b98a5a', '#94673c', '#6b4626'] };
        var base = TONES[o.tone] || TONES.clay;
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

    /* Fondo de panel para gráficas personalizadas (mismo azul de la paleta) + título */
    function panelBg(ctx, W, H, title) {
        rrect(ctx, 0, 0, W, H, 14); ctx.fillStyle = '#151F32'; ctx.fill();
        if (title) label(ctx, title, 16, 16, { color: C.text, size: 13, weight: '700' });
    }
    /* Montón de material (suelo) dibujado como polígono suave */
    function pile(ctx, cx, base, w, h, col1, col2, seed) {
        if (h <= 0.5) return;
        var g = ctx.createLinearGradient(0, base - h, 0, base);
        g.addColorStop(0, col1); g.addColorStop(1, col2);
        ctx.beginPath(); ctx.moveTo(cx - w / 2, base);
        ctx.quadraticCurveTo(cx - w * 0.22, base - h * 1.1, cx, base - h);
        ctx.quadraticCurveTo(cx + w * 0.22, base - h * 1.1, cx + w / 2, base);
        ctx.closePath(); ctx.fillStyle = g; ctx.fill();
        var r = rng(seed || 3);
        for (var i = 0; i < Math.min(30, 6 + h); i++) {
            var px = cx + (r() - 0.5) * w * 0.7, py = base - r() * h * 0.85;
            ctx.fillStyle = r() > 0.5 ? 'rgba(0,0,0,.22)' : 'rgba(255,255,255,.16)';
            ctx.beginPath(); ctx.arc(px, py, 0.8 + r() * 1.3, 0, TAU); ctx.fill();
        }
    }

    /* Acabado común del escenario (se aplica sobre cualquier simulador): motas, viñeta y barra de progreso */
    var DUST = null;
    function stageFx(ctx, W, H, accent, p, running, tick) {
        if (!DUST) { var r = rng(77); DUST = []; for (var i = 0; i < 26; i++) DUST.push({ x: r() * W, y: r() * H, s: 0.4 + r() * 1.1, a: 0.06 + r() * 0.16, v: 0.08 + r() * 0.25, ph: r() * 6.28 }); }
        ctx.save();
        for (var k = 0; k < DUST.length; k++) {
            var d = DUST[k], y = ((d.y - tick * d.v) % H + H) % H, x = d.x + Math.sin(tick * 0.012 + d.ph) * 6;
            ctx.beginPath(); ctx.arc(x, y, d.s, 0, TAU);
            ctx.fillStyle = 'rgba(190,215,255,' + (d.a * (0.65 + 0.35 * Math.sin(tick * 0.03 + d.ph))).toFixed(3) + ')'; ctx.fill();
        }
        var vg = ctx.createRadialGradient(W / 2, H * 0.5, H * 0.35, W / 2, H * 0.5, W * 0.72);
        vg.addColorStop(0, 'rgba(3,7,14,0)'); vg.addColorStop(1, 'rgba(3,7,14,.52)');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
        /* barra de progreso del ensayo */
        if (p > 0) {
            ctx.fillStyle = 'rgba(255,255,255,.07)'; ctx.fillRect(0, H - 4, W, 4);
            var pg = ctx.createLinearGradient(0, 0, W, 0); pg.addColorStop(0, rgba(accent, 0.35)); pg.addColorStop(1, accent);
            ctx.shadowColor = accent; ctx.shadowBlur = 10; ctx.fillStyle = pg; ctx.fillRect(0, H - 4, W * Math.min(1, p), 4);
        }
        ctx.restore();
    }

    var defs = {};
    function register(key, def) { defs[key] = def; }

    global.GeoSim2D = {
        C: C, defs: defs, register: register,
        H: {
            clamp: clamp, lerp: lerp, fmt: fmt, rng: rng, prep: prep, rrect: rrect, rgba: rgba, hexRgb: hexRgb,
            stageBg: stageBg, stageFx: stageFx, steel: steel, arrow: arrow, label: label, dial: dial, plot: plot, ticks: ticks,
            specimen: specimen, panelBg: panelBg, pile: pile, halfPlane: halfPlane, polyPath: polyPath, TAU: TAU
        }
    };
})(window);
