/**
 * Simulador de Obra 3D — NÚCLEO de ingeniería (sin DOM ni 3D; se puede probar en Node).
 * Terreno (malla de celdas), perfil de suelos, elementos de obra (zapata, cimiento corrido, columna, viga, losa,
 * muro, techo, muro de contención, pavimento, tubería), análisis de cargas y verificaciones, colapso y misiones.
 *
 * EDUCATIVO: modelos simplificados (ACI 318 / NSR-10, capacidad de carga Vesic/Meyerhof, Rankine). NO reemplaza
 * un diseño firmado por un ingeniero. Unidades: m, kN, kPa, MPa.
 */
(function (G) {
    'use strict';
    var PI = Math.PI, N = 48, HMIN = -6, HMAX = 16, STEP = 0.25, FC = 21, FY = 420;
    function f(x, d) { var k = Math.pow(10, d == null ? 1 : d); return (Math.round(x * k) / k).toString(); }
    function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
    function snap(v, s) { return Math.round(v / s) * s; }

    /* ---------- Suelos ---------- */
    var SITES = {
        firme: { n: 'Suelo firme (arcilla dura sobre arena densa)', layers: [{ n: 'Capa vegetal / orgánica', d: 0.5, c: 5, phi: 15, gam: 15, col: 0x5b4128, N: 3 }, { n: 'Arcilla firme (CL)', d: 2.0, c: 40, phi: 8, gam: 18, col: 0xb4693f, N: 12 }, { n: 'Arena densa (SW)', d: 2.5, c: 0, phi: 34, gam: 19, col: 0xd6b87a, N: 35 }, { n: 'Grava / roca meteorizada', d: 999, c: 0, phi: 40, gam: 21, col: 0x8b8b8b, N: 60 }] },
        blando: { n: 'Suelo blando (arcilla blanda profunda)', layers: [{ n: 'Capa vegetal / orgánica', d: 0.5, c: 4, phi: 12, gam: 14, col: 0x5b4128, N: 2 }, { n: 'Arcilla blanda (CL-CH)', d: 3.0, c: 18, phi: 4, gam: 16.5, col: 0x9a5b3c, N: 4 }, { n: 'Arena media (SM)', d: 2.5, c: 0, phi: 30, gam: 18, col: 0xd6b87a, N: 22 }, { n: 'Grava densa', d: 999, c: 0, phi: 38, gam: 20, col: 0x8b8b8b, N: 50 }] }
    };
    var RELLENO_C = { n: 'Relleno compactado', c: 0, phi: 33, gam: 19, col: 0xa88c68, N: 20 };
    var RELLENO = { n: 'Relleno (suelo suelto)', c: 0, phi: 26, gam: 17, col: 0xb89a74, N: 6 };
    function layerAt(site, depth) { if (depth < -0.001) return RELLENO; var acc = 0, i; for (i = 0; i < site.layers.length; i++) { acc += site.layers[i].d; if (depth < acc) return site.layers[i]; } return site.layers[site.layers.length - 1]; }
    function layerBounds(site) { var b = [], acc = 0; site.layers.forEach(function (l) { acc += l.d; if (acc < 100) b.push(acc); }); return b; }
    function bearing(c, phi, gam, Df, B, sq) { var p = phi * PI / 180, Nq = Math.exp(PI * Math.tan(p)) * Math.pow(Math.tan(PI / 4 + p / 2), 2), Nc = phi > 0 ? (Nq - 1) / Math.tan(p) : 5.14, Ng = 2 * (Nq + 1) * Math.tan(p), sc = sq ? 1 + Nq / Nc : 1, sqq = sq ? 1 + Math.tan(p) : 1, sg = sq ? 0.6 : 1; return { qu: c * Nc * sc + gam * Df * Nq * sqq + 0.5 * gam * B * Ng * sg, Nc: Nc, Nq: Nq, Ng: Ng }; }

    /* ---------- Mundo ---------- */
    function idx(i, j) { return j * N + i; }
    function cellOf(x, z) { var i = Math.floor(x + N / 2), j = Math.floor(z + N / 2); return (i < 0 || j < 0 || i >= N || j >= N) ? null : [i, j]; }
    function hAt(W, x, z) { var c = cellOf(x, z); return c ? W.H[idx(c[0], c[1])] : HMIN; }
    function h0At(W, x, z) { var c = cellOf(x, z); return c ? W.H0[idx(c[0], c[1])] : 0; }
    function newWorld(missionId, siteKey) {
        var m = MISSIONS[missionId] || MISSIONS.libre, W = { N: N, H: new Float32Array(N * N), H0: new Float32Array(N * N), elems: [], nid: 1, site: SITES[siteKey || m.site || 'firme'], stock: 0, bought: 0, excav: 0, excavH: 0, excavM: 0, comp: new Uint8Array(N * N), mission: m, live: m.live || 1.8, marks: [], water: null, real: true, day: 0, pumpVol: 0 };
        if (m.setup) m.setup(W); W.H0.set(W.H); return W;
    }
    function dig(W, x, z, half, mode, level, machine) {
        var stp = machine ? 2 * STEP : STEP;
        var c = cellOf(x, z), moved = 0, blocked = 0, i, j; if (!c) return { moved: 0, msg: 'Fuera del lote.' };
        for (j = c[1] - half; j <= c[1] + half; j++) for (i = c[0] - half; i <= c[0] + half; i++) {
            if (i < 0 || j < 0 || i >= N || j >= N) continue; var k = idx(i, j), h = W.H[k], nh = h;
            if (mode === 'cut') nh = Math.max(HMIN + 0.5, h - stp); else if (mode === 'fill') nh = Math.min(HMAX, h + stp); else if (mode === 'level') nh = level;
            if (nh === h) continue;
            if (nh < h && cellBlocked(W, i, j, nh)) { blocked++; continue; }
            W.H[k] = nh; moved += (h - nh); if (nh > h) W.comp[k] = 0;
        }
        if (moved > 0) { W.stock += moved; W.excav += moved; if (machine) { W.excavM += moved; W.machUsed = true; } else W.excavH += moved; } else if (moved < 0) { var need = -moved, use = Math.min(W.stock, need); W.stock -= use; W.bought += need - use; }
        return { moved: moved, blocked: blocked, msg: blocked ? 'Hay una estructura sobre ' + blocked + ' celda(s): no se puede excavar bajo ella.' : '' };
    }
    function compact(W, x, z, half) {
        var c = cellOf(x, z), n = 0, i, j; if (!c) return 0;
        for (j = c[1] - half; j <= c[1] + half; j++) for (i = c[0] - half; i <= c[0] + half; i++) { if (i < 0 || j < 0 || i >= N || j >= N) continue; var k = idx(i, j); if (W.H[k] > W.H0[k] + 0.01 && !W.comp[k]) { W.comp[k] = 1; n++; } }
        return n;
    }
    /* ángulo de reposo: si el desnivel entre celdas vecinas supera lo que el suelo aguanta, el talud se derrumba */
    function slopeLimit(W, k) { var lay = layerAt(W.site, W.H0[k] - (W.H[k] + 0.001)); if (W.H[k] > W.H0[k] + 0.01) return W.comp[k] ? 1.5 : 0.75; return W.site === SITES.blando ? 2.0 : (lay.phi >= 30 ? 2.5 : 3.0); }
    function stabilize(W, maxIter) {
        var moved = 0, it, i, j, k, ch, dirs = [[1, 0], [0, 1]], d, n2, hi, lo, lim;
        function covered(i2, j2, y) { var x0 = i2 - N / 2, z0 = j2 - N / 2; return W.elems.some(function (e) { return e.t !== 'tub' && e.t !== 'tec' && e.t !== 'pav' && e.r[0] < x0 + 1 && e.r[2] > x0 && e.r[1] < z0 + 1 && e.r[3] > z0 && e.y0 < y + 0.01; }); }
        for (it = 0; it < (maxIter || 6); it++) {
            ch = false;
            for (j = 0; j < N; j++) for (i = 0; i < N; i++) for (d = 0; d < 2; d++) {
                var i2 = i + dirs[d][0], j2 = j + dirs[d][1]; if (i2 >= N || j2 >= N) continue; k = idx(i, j); n2 = idx(i2, j2);
                if (W.H[k] > W.H[n2]) { hi = k; lo = n2; } else { hi = n2; lo = k; }
                var diff = W.H[hi] - W.H[lo]; if (diff < 0.01) continue; lim = slopeLimit(W, hi);
                if (diff > lim + 0.001) { var hc = hi === k ? [i, j] : [i2, j2], lc = lo === k ? [i, j] : [i2, j2]; if (covered(hc[0], hc[1], W.H[hi]) || covered(lc[0], lc[1], W.H[lo] + STEP)) continue; W.H[hi] -= STEP; W.H[lo] += STEP; W.comp[lo] = 0; moved += STEP; ch = true; }
            }
            if (!ch) break;
        }
        return moved;
    }
    /* Cucharón de excavadora: retira un paso de una celda a la profundidad del diente y devuelve el volumen (va al cucharón, no al acopio) */
    function scoopCell(W, x, z, tipY) {
        var c = cellOf(x, z); if (!c) return { v: 0, msg: 'Fuera del lote.' }; var k = idx(c[0], c[1]), h = W.H[k];
        if (h - tipY < 0.12) return { v: 0 }; var nh = Math.max(HMIN + 0.5, h - STEP); if (nh >= h) return { v: 0 };
        if (cellBlocked(W, c[0], c[1], nh)) return { v: 0, msg: 'Hay una estructura: no se puede excavar bajo ella.' };
        W.H[k] = nh; W.excav += STEP; W.excavM += STEP; W.machUsed = true; return { v: STEP };
    }
    function occupied(W, i, j, h) { var x0 = i - N / 2, z0 = j - N / 2; return W.elems.some(function (e) { return e.t !== 'tub' && e.t !== 'tec' && e.r[0] < x0 + 1 && e.r[2] > x0 && e.r[1] < z0 + 1 && e.r[3] > z0 && e.y1 > h - 0.05 && e.y0 < h + STEP + 0.05; }); }
    /* Descarga de tierra: forma un montículo (centro hasta 0.5 m sobre los vecinos) y devuelve el volumen colocado */
    function dumpSoil(W, x, z, vol) {
        var c = cellOf(x, z), units = Math.floor(vol / STEP + 1e-6), placed = 0, u, a, b, best, bk, k, i, j, hmin; if (!c) return 0;
        for (u = 0; u < units; u++) {
            var cand = [], ctr = null; hmin = 1e9;
            for (j = c[1] - 1; j <= c[1] + 1; j++) for (i = c[0] - 1; i <= c[0] + 1; i++) { if (i < 0 || j < 0 || i >= N || j >= N) continue; k = idx(i, j); if (W.H[k] >= HMAX - 0.01 || occupied(W, i, j, W.H[k])) continue; var o = { i: i, j: j, k: k, h: W.H[k], d: Math.abs(i - c[0]) + Math.abs(j - c[1]) }; cand.push(o); if (i === c[0] && j === c[1]) ctr = o; }
            if (!cand.length) break; cand.forEach(function (o) { hmin = Math.min(hmin, o.h); });
            best = (ctr && ctr.h <= hmin + 0.5 + 1e-6) ? ctr : cand.sort(function (p, q) { return (p.h - q.h) || (p.d - q.d); })[0];
            W.H[best.k] += STEP; W.comp[best.k] = 0; placed += STEP;
        }
        return placed;
    }
    function cellBlocked(W, i, j, nh) { var x0 = i - N / 2, z0 = j - N / 2; return W.elems.some(function (e) { if (e.t === 'tub' || e.t === 'tec') return false; return e.r[0] < x0 + 1 && e.r[2] > x0 && e.r[1] < z0 + 1 && e.r[3] > z0 && e.y0 > nh - 0.001 && e.y0 < W.H[idx(i, j)] + 0.001 + 0.5 && e.t !== 'pav'; }); }

    /* ---------- Geometría de elementos ---------- */
    function fin(e) {
        var h;
        switch (e.t) {
            case 'zap': e.r = [e.x - e.B / 2, e.z - e.B / 2, e.x + e.B / 2, e.z + e.B / 2]; e.y0 = e.yb; e.y1 = e.yb + e.th; break;
            case 'col': e.r = [e.x - e.s / 2, e.z - e.s / 2, e.x + e.s / 2, e.z + e.s / 2]; e.y0 = e.yb; e.y1 = e.yb + e.h; break;
            case 'los': e.r = [e.x1, e.z1, e.x2, e.z2]; e.y0 = e.yb; e.y1 = e.yb + e.th; break;
            case 'tec': e.r = [e.x1, e.z1, e.x2, e.z2]; e.y0 = e.yb; e.y1 = e.yb + e.rise; break;
            case 'pav': e.r = [e.x1, e.z1, e.x2, e.z2]; e.y0 = e.yb; e.y1 = e.yb + e.th; break;
            default: { var w = e.t === 'vig' ? e.b : (e.t === 'mur' ? e.th : (e.t === 'cim' ? e.b : (e.t === 'tub' ? e.D : e.B))), ax = e.z1 === e.z2; e.len = Math.abs(e.x2 - e.x1) + Math.abs(e.z2 - e.z1);
                if (e.t === 'cont') { var lo = -e.B / 3, hi = 2 * e.B / 3; if (ax) e.r = [Math.min(e.x1, e.x2), e.z1 + (e.dir > 0 ? lo : -hi), Math.max(e.x1, e.x2), e.z1 + (e.dir > 0 ? hi : -lo)]; else e.r = [e.x1 + (e.dir > 0 ? lo : -hi), Math.min(e.z1, e.z2), e.x1 + (e.dir > 0 ? hi : -lo), Math.max(e.z1, e.z2)]; }
                else e.r = ax ? [Math.min(e.x1, e.x2) - (e.t === 'vig' ? 0 : 0), e.z1 - w / 2, Math.max(e.x1, e.x2), e.z1 + w / 2] : [e.x1 - w / 2, Math.min(e.z1, e.z2), e.x1 + w / 2, Math.max(e.z1, e.z2)];
                if (e.t === 'vig') { h = e.h; e.y1 = e.top; e.y0 = e.top - h; } else if (e.t === 'cim') { e.y0 = e.yb; e.y1 = e.yb + e.th; } else if (e.t === 'mur') { e.y0 = e.yb; e.y1 = e.yb + e.h; } else if (e.t === 'cont') { e.y0 = e.yb; e.y1 = e.yb + e.H; } else if (e.t === 'tub') { e.y0 = Math.min(e.y1v, e.y2v); e.y1 = Math.max(e.y1v, e.y2v) + e.D; }
                e.axisX = ax; break; }
        }
        e.cx = (e.r[0] + e.r[2]) / 2; e.cz = (e.r[1] + e.r[3]) / 2; e.area = (e.r[2] - e.r[0]) * (e.r[3] - e.r[1]); return e;
    }
    function near(a, b, t) { return Math.abs(a - b) < (t || 0.07); }
    function inR(x, z, r, m) { m = m || 0; return x >= r[0] - m && x <= r[2] + m && z >= r[1] - m && z <= r[3] + m; }
    function ovArea(a, b) { var w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), d = Math.min(a[3], b[3]) - Math.max(a[1], b[1]); return (w > 0 && d > 0) ? w * d : 0; }
    function samplesLine(e, step) { var L = e.len, n = Math.max(1, Math.ceil(L / step)), pts = [], k, t; for (k = 0; k < n; k++) { t = (k + 0.5) / n; pts.push([e.x1 + (e.x2 - e.x1) * t, e.z1 + (e.z2 - e.z1) * t]); } return pts; }
    function samplesPerim(r, step) { var pts = [], k, n, w = r[2] - r[0], d = r[3] - r[1]; n = Math.max(1, Math.ceil(w / step)); for (k = 0; k < n; k++) { var x = r[0] + w * (k + 0.5) / n; pts.push([x, r[1]], [x, r[3]]); } n = Math.max(1, Math.ceil(d / step)); for (k = 0; k < n; k++) { var z = r[1] + d * (k + 0.5) / n; pts.push([r[0], z], [r[2], z]); } return pts; }
    var PAIR_OK = { 'vig-col': 1, 'col-vig': 1, 'vig-vig': 1, 'mur-col': 1, 'col-mur': 1, 'mur-mur': 1, 'mur-vig': 1, 'vig-mur': 1, 'cim-zap': 1, 'zap-cim': 1, 'cim-cim': 1, 'cim-col': 1, 'col-cim': 1, 'cim-mur': 1, 'mur-cim': 1, 'tec-mur': 1, 'mur-tec': 1, 'los-col': 1, 'col-los': 1, 'los-mur': 1, 'mur-los': 1 };
    function collides(W, ne) { for (var i = 0; i < W.elems.length; i++) { var o = W.elems[i]; if (PAIR_OK[ne.t + '-' + o.t]) continue; if (ovArea(ne.r, o.r) > 0.005 && Math.min(ne.y1, o.y1) - Math.max(ne.y0, o.y0) > 0.02) return o; } return null; }

    function supportsOf(W, e) {
        var E = W.elems, out = { ids: [], per: [], cov: 0 }, i, o;
        function uniq(id) { if (id != null && out.ids.indexOf(id) < 0) out.ids.push(id); }
        if (e.t === 'col') { var best = null; E.forEach(function (o) { if ((o.t === 'zap' || o.t === 'col') && o !== e && near(o.y1, e.y0) && inR(e.x, e.z, o.r, 0.02)) best = o; }); if (best) { uniq(best.id); out.per.push({ id: best.id }); out.cov = 1; } }
        else if (e.t === 'vig') { [[e.x1, e.z1], [e.x2, e.z2]].forEach(function (p) { var c = null; E.forEach(function (o) { if (o.t === 'col' && near(o.y1, e.y1) && inR(p[0], p[1], o.r, 0.2)) c = o; }); out.per.push({ id: c ? c.id : null }); uniq(c ? c.id : null); }); out.cov = out.per.filter(function (p) { return p.id != null; }).length / 2; }
        else if (e.t === 'los' || e.t === 'tec' || e.t === 'mur') {
            var pts = e.t === 'mur' ? samplesLine(e, 0.25) : samplesPerim(e.r, 0.25), kinds = e.t === 'mur' ? ['cim', 'vig', 'los', 'zap', 'cont'] : (e.t === 'los' ? ['vig', 'mur', 'col'] : ['mur', 'vig']), ok = 0;
            pts.forEach(function (p) { var s = null, bd = 9; E.forEach(function (o) { if (kinds.indexOf(o.t) < 0 || o === e) return; if (!near(o.y1, e.y0)) return; var m = e.t === 'mur' ? 0.15 : 0.3; if (inR(p[0], p[1], o.r, m)) { var d = Math.hypot(p[0] - o.cx, p[1] - o.cz); if (d < bd) { bd = d; s = o; } } }); out.per.push({ id: s ? s.id : null, pt: p }); if (s) { ok++; uniq(s.id); } }); out.cov = ok / pts.length;
        }
        else if (e.t === 'pav' && e.layer > 0) { E.forEach(function (o) { if (o.t === 'pav' && o.layer === e.layer - 1 && near(o.y1, e.y0) && ovArea(o.r, e.r) > 0.05) uniq(o.id); }); out.cov = out.ids.length ? 1 : 0; }
        e.sup = out; return out;
    }

    /* ---------- Altas ---------- */
    var LIM = { zap: [0.6, 3.5], th: [0.25, 1.0] };
    function flatUnder(W, r) { var i0 = Math.floor(r[0] + N / 2 + 1e-6), i1 = Math.floor(r[2] + N / 2 - 1e-6), j0 = Math.floor(r[1] + N / 2 + 1e-6), j1 = Math.floor(r[3] + N / 2 - 1e-6), mn = 1e9, mx = -1e9, i, j; if (i0 < 0 || j0 < 0 || i1 >= N || j1 >= N) return null; for (j = j0; j <= j1; j++) for (i = i0; i <= i1; i++) { var h = W.H[idx(i, j)]; mn = Math.min(mn, h); mx = Math.max(mx, h); } return { mn: mn, mx: mx }; }
    function orient(p, pre) { var dx = p.x2 - p.x1, dz = p.z2 - p.z1; if (Math.abs(dx) >= Math.abs(dz)) p.z2 = p.z1; else p.x2 = p.x1; return p; }
    function add(W, type, p, opt) {
        var e = { t: type, id: W.nid }, s, fl, c, msg;
        p = Object.assign({}, p);
        function bad(m) { return { ok: false, msg: m }; }
        if (type === 'zap') { e.x = snap(p.x, 0.5); e.z = snap(p.z, 0.5); e.B = p.B || 1.5; e.th = p.th || 0.4; fin(Object.assign(e, { yb: 0 })); fl = flatUnder(W, e.r); if (!fl) return bad('La zapata queda fuera del lote.'); if (fl.mx - fl.mn > 0.01) return bad('El fondo no está a nivel (diferencia ' + f(fl.mx - fl.mn, 2) + ' m). Nivela la excavación con la pala (modo «nivelar»).'); e.yb = fl.mn; fin(e); }
        else if (type === 'cim') { s = orient({ x1: snap(p.x1, 0.5), z1: snap(p.z1, 0.5), x2: snap(p.x2, 0.5), z2: snap(p.z2, 0.5) }); Object.assign(e, s, { b: p.b || 0.6, th: p.th || 0.4, yb: 0 }); if (Math.abs(e.x2 - e.x1) + Math.abs(e.z2 - e.z1) < 1) return bad('Cimiento muy corto (mín. 1 m).'); fin(e); fl = flatUnder(W, e.r); if (!fl) return bad('Fuera del lote.'); if (fl.mx - fl.mn > 0.01) return bad('La zanja no está a nivel a lo largo del cimiento.'); e.yb = fl.mn; fin(e); }
        else if (type === 'col') { e.x = snap(p.x, 0.5); e.z = snap(p.z, 0.5); e.s = p.s || 0.3; e.h = p.h || 2.8; e.yb = p.yb; fin(e); if (!supportsOf(W, e).ids.length) return bad('La columna necesita apoyarse sobre una zapata o sobre otra columna (apunta a su cara superior).'); }
        else if (type === 'vig') { s = orient({ x1: snap(p.x1, 0.5), z1: snap(p.z1, 0.5), x2: snap(p.x2, 0.5), z2: snap(p.z2, 0.5) }); Object.assign(e, s, { b: p.b || 0.3, h: p.h || 0.4, top: p.top }); e.len = Math.abs(e.x2 - e.x1) + Math.abs(e.z2 - e.z1); if (e.len < 1) return bad('Viga muy corta.'); fin(e); var su = supportsOf(W, e); if (su.cov < 1) return bad('Los DOS extremos de la viga deben apoyarse en columnas a la misma altura (apunta a la parte superior de columnas del mismo nivel).'); }
        else if (type === 'los') { e.x1 = snap(Math.min(p.x1, p.x2), 0.5); e.x2 = snap(Math.max(p.x1, p.x2), 0.5); e.z1 = snap(Math.min(p.z1, p.z2), 0.5); e.z2 = snap(Math.max(p.z1, p.z2), 0.5); e.th = p.th || 0.15; e.yb = p.yb; if ((e.x2 - e.x1) * (e.z2 - e.z1) < 2) return bad('Losa muy pequeña.'); fin(e); var s2 = supportsOf(W, e); if (s2.ids.length < 2 || s2.cov < 0.45) return bad('La losa necesita apoyo continuo en vigas o muros en al menos dos lados (dibuja sus esquinas sobre los ejes de las vigas).'); }
        else if (type === 'mur') { s = orient({ x1: snap(p.x1, 0.5), z1: snap(p.z1, 0.5), x2: snap(p.x2, 0.5), z2: snap(p.z2, 0.5) }); Object.assign(e, s, { th: p.th || 0.15, h: p.h || 2.6, yb: p.yb }); e.len = Math.abs(e.x2 - e.x1) + Math.abs(e.z2 - e.z1); if (e.len < 0.5) return bad('Muro muy corto.'); fin(e); if (!cellOf(e.x1, e.z1) || !cellOf(e.x2, e.z2)) return bad('Fuera del lote.'); supportsOf(W, e); }
        else if (type === 'tec') { e.x1 = snap(Math.min(p.x1, p.x2), 0.5); e.x2 = snap(Math.max(p.x1, p.x2), 0.5); e.z1 = snap(Math.min(p.z1, p.z2), 0.5); e.z2 = snap(Math.max(p.z1, p.z2), 0.5); e.rise = p.rise || 1.0; e.yb = p.yb; if ((e.x2 - e.x1) * (e.z2 - e.z1) < 2) return bad('Techo muy pequeño.'); fin(e); var s3 = supportsOf(W, e); if (s3.ids.length < 2 || s3.cov < 0.45) return bad('El techo necesita apoyarse en muros o vigas en al menos dos lados (a la misma altura).'); }
        else if (type === 'pav') { e.x1 = snap(Math.min(p.x1, p.x2), 0.5); e.x2 = snap(Math.max(p.x1, p.x2), 0.5); e.z1 = snap(Math.min(p.z1, p.z2), 0.5); e.z2 = snap(Math.max(p.z1, p.z2), 0.5); e.layer = p.layer || 0; e.th = p.th || [0.25, 0.15, 0.075][e.layer]; if (!(e.x2 > e.x1 && e.z2 > e.z1)) return bad('Área inválida.'); fin(e);
            if (e.layer === 0) { fl = flatUnder(W, e.r); if (!fl) return bad('Fuera del lote.'); if (fl.mx - fl.mn > 0.01) return bad('La subrasante no está a nivel: nivela el terreno bajo la vía.'); e.yb = fl.mn; }
            else { var prev = W.elems.filter(function (o) { return o.t === 'pav' && o.layer === e.layer - 1 && ovArea(o.r, e.r) > 0.05; }); if (!prev.length) return bad('Primero coloca la capa anterior (subbase → base → carpeta asfáltica).'); e.yb = prev[0].y1; fin(e); } fin(e); supportsOf(W, e); }
        else if (type === 'cont') { s = orient({ x1: snap(p.x1, 0.5), z1: snap(p.z1, 0.5), x2: snap(p.x2, 0.5), z2: snap(p.z2, 0.5) }); Object.assign(e, s, { H: p.H || 3.5, B: p.B || 2.5, dir: 1, yb: 0 }); e.len = Math.abs(e.x2 - e.x1) + Math.abs(e.z2 - e.z1); if (e.len < 2) return bad('Muro de contención muy corto (mín. 2 m).'); var ax = e.z1 === e.z2, a = ax ? e.z1 : e.x1, mid = [(e.x1 + e.x2) / 2, (e.z1 + e.z2) / 2], hp = ax ? hAt(W, mid[0], a + 1.5) : hAt(W, a + 1.5, mid[1]), hm = ax ? hAt(W, mid[0], a - 1.5) : hAt(W, a - 1.5, mid[1]);
            e.dir = hp >= hm ? 1 : -1; e.hHigh = Math.max(hp, hm); e.hLow = Math.min(hp, hm); e.yb = e.hLow; fin(e); }
        else if (type === 'tub') { s = orient({ x1: snap(p.x1, 0.5), z1: snap(p.z1, 0.5), x2: snap(p.x2, 0.5), z2: snap(p.z2, 0.5) }); Object.assign(e, s, { D: p.D || 0.4, pend: p.pend == null ? 1 : p.pend }); e.len = Math.abs(e.x2 - e.x1) + Math.abs(e.z2 - e.z1); if (e.len < 1) return bad('Tubería muy corta.'); var floor0 = hAt(W, e.x1, e.z1); e.y1v = floor0; e.y2v = floor0 - e.pend / 100 * e.len; fin(e); }
        else return bad('Elemento desconocido.');
        if (!e.r) fin(e);
        if (e.r[0] < -N / 2 || e.r[1] < -N / 2 || e.r[2] > N / 2 || e.r[3] > N / 2) return bad('Fuera del lote.');
        c = collides(W, e); if (c) return bad('Choca con otro elemento (' + NAMES[c.t] + ').');
        if (W.real) { var rb = realCheck(W, e); if (rb) return bad(rb); }
        initReal(W, e);
        if (opt && opt.dry) return { ok: true, el: e }; W.nid++; W.elems.push(e); return { ok: true, el: e };
    }
    var NAMES = { zap: 'zapata', cim: 'cimiento corrido', col: 'columna', vig: 'viga', los: 'losa', mur: 'muro', tec: 'techo', pav: 'pavimento', cont: 'muro de contención', tub: 'tubería' };
    function remove(W, id) { var i = W.elems.findIndex(function (e) { return e.id === id; }); if (i < 0) return false; W.elems.splice(i, 1); return true; }

    /* ---------- Proceso constructivo realista: encofrado, armado, vaciado, curado, desencofrado ---------- */
    var CONC = { zap: 1, cim: 1, col: 1, vig: 1, los: 1 };
    var REBAR = { zap: 70, cim: 80, col: 150, vig: 120, los: 80 };          /* kg de acero por m³ */
    var STRIP = { zap: 2, cim: 2, col: 3, vig: 14, los: 14 };               /* días mínimos para desencofrar */
    var PX = { steel: 1.8, form: 12, day: 35, pump: 35 };
    function volOf(e) { switch (e.t) { case 'zap': return e.B * e.B * e.th; case 'cim': return e.b * e.th * e.len; case 'col': return e.s * e.s * e.h; case 'vig': return e.b * e.h * e.len; case 'los': return e.area * e.th; } return 0; }
    function formArea(e) { switch (e.t) { case 'zap': return 4 * e.B * e.th; case 'cim': return 2 * e.len * e.th; case 'col': return 4 * e.s * e.h; case 'vig': return (e.b + 2 * e.h) * e.len; case 'los': return e.area + 2 * ((e.r[2] - e.r[0]) + (e.r[3] - e.r[1])) * e.th; } return 0; }
    function initReal(W, e) {
        if (!CONC[e.t]) return; e.vol = volOf(e); e.fa = formArea(e); e.kg = e.vol * REBAR[e.t]; e.dmg = 0;
        if (W.real) { e.pv = 0; e.form = false; e.fp = 0; e.fullDay = null; e.stripped = false; e.rebar = false; e.rp = 0; }
        else { e.rebar = true; e.rp = 1; e.fp = 1; e.pv = e.vol; e.form = false; e.fullDay = -99; e.stripped = true; }
    }
    function isPoured(e) { return e.vol == null || e.pv >= e.vol - 1e-6; }
    function ageOf(W, e) { return e.fullDay == null ? -1 : W.day - e.fullDay; }
    function fcRatio(W, e) { if (e.vol == null) return 1; if (!isPoured(e)) return 0; var t = Math.max(0, ageOf(W, e)); return Math.min(1, (t / (4 + 0.85 * t)) / (28 / (4 + 0.85 * 28))); }
    function realCheck(W, e) {
        if (e.t !== 'col' && e.t !== 'vig' && e.t !== 'los') return null;
        var su = e.sup || supportsOf(W, e), i, o;
        for (i = 0; i < su.ids.length; i++) { o = W.elems.filter(function (z) { return z.id === su.ids[i]; })[0]; if (!o || o.vol == null) continue;
            if (!isPoured(o)) return 'El apoyo (' + NAMES[o.t] + ') aún no está hormigonado. Vacía el concreto antes de montar encima.';
            if (ageOf(W, o) < 1) return 'El concreto del apoyo (' + NAMES[o.t] + ') tiene menos de 1 día: espera a que fragüe (avanza el tiempo).'; }
        return null;
    }
    function pourTarget(W, x, z, y) { var best = null; W.elems.forEach(function (e) { if (!CONC[e.t] || e.vol == null || !e.form || !e.rebar || isPoured(e)) return; var r = e.r; if (x < r[0] || x > r[2] || z < r[1] || z > r[3]) return; if (y != null && y < e.y0 - 0.05) return; if (!best || e.y0 < best.y0) best = e; }); return best; }
    function pourInto(W, x, z, y, v) { var t = pourTarget(W, x, z, y); if (!t) return 0; var used = Math.min(v, t.vol - t.pv); t.pv += used; if (t.pv >= t.vol - 1e-6) { t.pv = t.vol; t.fullDay = W.day; } W.pourEl = t; return used; }
    function pumpPour(W, id) { var e = W.elems.filter(function (z) { return z.id === id; })[0]; if (!e || e.vol == null) return { ok: false, msg: 'Solo se vacía concreto en elementos encofrados.' }; if (e.stripped) return { ok: false, msg: 'Ya fue desencofrado.' }; if (!e.rebar) return { ok: false, msg: 'Primero arma el acero de refuerzo (herramienta Acero, mantén el clic).' }; if (!e.form) return { ok: false, msg: 'Primero encofra (herramienta Encofrar, mantén el clic).' }; if (isPoured(e)) return { ok: false, msg: 'Ya está vaciado.' }; var rem = e.vol - e.pv; W.pumpVol += rem; e.pv = e.vol; e.fullDay = W.day; return { ok: true, vol: rem, msg: 'Vaciado con bomba: ' + f(rem, 2) + ' m³ (recargo de bomba incluido).' }; }
    function armar(W, id, dt) { var e = W.elems.filter(function (z) { return z.id === id; })[0]; if (!e || e.vol == null) return { ok: false, msg: 'Solo se arma acero en zapatas, cimientos, columnas, vigas y losas.' }; if (e.rebar) return { ok: false, done: true, msg: 'El acero de este elemento ya está armado.' }; if (e.stripped) return { ok: false, msg: 'Ya está desencofrado.' }; e.rp = Math.min(1, e.rp + dt / (1.5 + e.kg / 100)); if (e.rp >= 1) { e.rebar = true; return { ok: true, done: true, msg: 'Acero armado: ' + f(e.kg, 0) + ' kg (' + REBAR[e.t] + ' kg/m³).' }; } return { ok: true, p: e.rp }; }
    function encofrar(W, id, dt) { var e = W.elems.filter(function (z) { return z.id === id; })[0]; if (!e || e.vol == null) return { ok: false, msg: 'Solo se encofra zapatas, cimientos, columnas, vigas y losas.' }; if (e.stripped) return { ok: false, msg: 'Ya está desencofrado.' }; if (e.form) return { ok: false, done: true, msg: 'Ya tiene encofrado.' }; if (!e.rebar) return { ok: false, msg: 'Primero arma el acero (herramienta Acero); después se encofra.' }; e.fp = Math.min(1, e.fp + dt / (1.2 + e.fa / 10)); if (e.fp >= 1) { e.form = true; return { ok: true, done: true, msg: 'Encofrado listo: ' + f(e.fa, 1) + ' m² de madera.' }; } return { ok: true, p: e.fp }; }
    function pourDirect(W, id, v) { var e = W.elems.filter(function (z) { return z.id === id; })[0]; if (!e || e.vol == null) return { ok: false, msg: 'Apunta a un elemento encofrado.' }; if (e.stripped) return { ok: false, msg: 'Ya está desencofrado.' }; if (!e.rebar) return { ok: false, msg: 'Falta armar el acero.' }; if (!e.form) return { ok: false, msg: 'Falta el encofrado: sin él el concreto se desparrama.' }; if (isPoured(e)) return { ok: false, msg: 'Este elemento ya está lleno.' }; var used = Math.min(v, e.vol - e.pv); e.pv += used; if (e.pv >= e.vol - 1e-6) { e.pv = e.vol; e.fullDay = W.day; } return { ok: true, used: used }; }
    function advance(W, d) { W.day = Math.round((W.day + d) * 100) / 100; return W.day; }
    function strip(W, id) {
        var e = W.elems.filter(function (z) { return z.id === id; })[0]; if (!e || e.vol == null) return { ok: false, msg: 'Este elemento no lleva encofrado.' }; if (!e.form) return { ok: false, msg: e.stripped ? 'Ya está desencofrado.' : 'Todavía no tiene encofrado.' };
        if (!isPoured(e)) { if (e.pv > 0) return { ok: false, msg: 'Hay concreto fresco: termina el vaciado antes de retirar el encofrado.' }; e.form = false; e.fp = 0; return { ok: true, msg: 'Encofrado retirado (estaba vacío).' }; }
        var age = ageOf(W, e), mn = STRIP[e.t]; e.form = false; e.stripped = true;
        if (age < mn) { e.dmg = Math.max(0.2, 1 - age / mn); return { ok: true, early: true, msg: '⚠ Desencofrado prematuro (' + f(age, 1) + ' d < ' + mn + ' d): el concreto se fisura/desmorona.' }; }
        return { ok: true, msg: 'Desencofrado correcto (' + f(age, 1) + ' d).' };
    }
    function setReal(W, on) { W.real = !!on; if (!on) W.elems.forEach(function (e) { if (e.vol != null) { e.pv = e.vol; e.form = false; e.stripped = true; e.rebar = true; e.rp = 1; e.fp = 1; if (e.fullDay == null) e.fullDay = -99; } }); }
    function pourAll(W, days) { W.elems.forEach(function (e) { if (e.vol != null && !e.stripped && !isPoured(e)) { e.rebar = true; e.rp = 1; e.form = true; e.fp = 1; e.pv = e.vol; e.fullDay = W.day; } }); if (days) advance(W, days); }
    function stripAll(W) { W.elems.forEach(function (e) { if (e.vol != null && e.form) strip(W, e.id); }); }
    function stateOf(W, e) {
        if (e.vol == null) return ''; var k = fcRatio(W, e);
        if (e.dmg > 0) return 'Dañado por desencofrado prematuro';
        if (!isPoured(e)) return e.pv > 0 ? 'Vaciado parcial ' + f(e.pv / e.vol * 100, 0) + ' %' : (!e.rebar ? 'Falta armar el acero (' + f(e.rp * 100, 0) + ' %)' : (!e.form ? 'Acero armado · falta el encofrado (' + f(e.fp * 100, 0) + ' %)' : 'Acero + encofrado listos · sin hormigonar'));
        var a = ageOf(W, e); return 'Concreto ' + f(a, 1) + ' d · ' + f(k * 100, 0) + ' % f\'c' + (e.form ? ' · encofrado puesto (mín. ' + STRIP[e.t] + ' d)' : ' · desencofrado');
    }

    /* ---------- Costos ---------- */
    var PRICE = { excH: 22, mob: 150, comp: 3, exc: 6, fill: 10, conc: 280, mas: 40, roof: 22, sub: 30, base: 45, asf: 160, tub: 70 };
    function costOf(W) {
        var cc = 0; for (var q = 0; q < W.comp.length; q++) if (W.comp[q]) cc++; var c = W.excavH * PRICE.excH + W.excavM * PRICE.exc + (W.machUsed ? PRICE.mob : 0) + W.bought * PRICE.fill + cc * PRICE.comp, det = { 'excavación y relleno': c }, add_ = function (k, v) { det[k] = (det[k] || 0) + v; c += v; };
        W.elems.forEach(function (e) { var vol; if (W.real && e.vol != null) { add_('concreto', e.pv * PRICE.conc); add_('acero de refuerzo', e.kg * (e.rebar ? 1 : e.rp) * PX.steel); add_('encofrado', e.fa * ((e.form || e.stripped) ? 1 : e.fp) * PX.form); return; } switch (e.t) { case 'zap': add_('concreto', e.B * e.B * e.th * PRICE.conc); break; case 'cim': add_('concreto', e.b * e.th * e.len * PRICE.conc); break; case 'col': add_('concreto', e.s * e.s * e.h * PRICE.conc); break; case 'vig': add_('concreto', e.b * e.h * e.len * PRICE.conc); break; case 'los': add_('concreto', e.area * e.th * PRICE.conc); break; case 'mur': add_('mampostería', e.len * e.h * PRICE.mas); break; case 'tec': add_('techo', e.area * PRICE.roof); break; case 'pav': add_('pavimento', e.area * e.th * [PRICE.sub, PRICE.base, PRICE.asf][e.layer]); break; case 'cont': add_('concreto', (e.B * 0.4 + 0.3 * (e.H - 0.4)) * e.len * PRICE.conc); break; case 'tub': add_('tubería', e.len * PRICE.tub * (e.D / 0.4)); break; } });
        if (W.real && W.pumpVol > 0) add_('bomba de concreto', W.pumpVol * PX.pump);
        if (W.real && W.day > 0) add_('tiempo de obra (' + f(W.day, 0) + ' d)', W.day * PX.day);
        if (W.concPoured > 0) add_('hormigón vertido (mixer / trompo)', W.concPoured * PRICE.conc);
        return { total: c, det: det };
    }

    /* ---------- Análisis ---------- */
    var PRI = { tec: 6, los: 5, vig: 4, mur: 3, col: 2, zap: 1, cim: 1, cont: 0, pav: 0, tub: 0 };
    function groundSoil(W, e, yb, Df) { var d = h0At(W, e.cx, e.cz) - yb, c = cellOf(e.cx, e.cz); if (d < -0.001 && c && W.comp[idx(c[0], c[1])]) return RELLENO_C; return layerAt(W.site, d); }
    function dfOf(W, e) { var r = e.r, ring = [], x, z; for (x = r[0] + 0.25; x <= r[2] - 0.2; x += 0.5) { ring.push(hAt(W, x, r[1] - 0.5), hAt(W, x, r[3] + 0.5)); } for (z = r[1] + 0.25; z <= r[3] - 0.2; z += 0.5) { ring.push(hAt(W, r[0] - 0.5, z), hAt(W, r[2] + 0.5, z)); } var m = ring.reduce(function (a, b) { return a + b; }, 0) / ring.length; return Math.max(0, m - e.y0); }
    function analyze(W) {
        var E = W.elems, items = [], by = {}, live = W.live, E_ = 4700 * Math.sqrt(FC), i;
        E.forEach(function (e) { supportsOf(W, e); e.D = 0; e.Lv = 0; e.gD = 0; e.gL = 0; });
        E.forEach(function (e) {
            switch (e.t) { case 'zap': e.D = 24 * e.B * e.B * e.th; break; case 'cim': e.D = 24 * e.b * e.th * e.len; break; case 'col': e.D = 24 * e.s * e.s * e.h; break; case 'vig': e.D = 24 * e.b * e.h * e.len; break;
                case 'los': e.D = (24 * e.th + 1.5) * e.area; e.Lv = live * e.area; break; case 'mur': e.D = (14 * e.th * e.h + 0.4 * e.h) * e.len; break; case 'tec': e.D = 1.0 * e.area; e.Lv = 0.5 * e.area; break; default: e.D = 0; }
        });
        var order = E.slice().sort(function (a, b) { return (b.y1 - a.y1) || ((PRI[b.t] || 0) - (PRI[a.t] || 0)); });
        order.forEach(function (e) {
            var per = e.sup.per, give = function (id, d, l) { var o = E.filter(function (z) { return z.id === id; })[0]; if (o) { o.D += d; o.Lv += l; } };
            if (e.t === 'col') { if (e.sup.ids.length) give(e.sup.ids[0], e.D, e.Lv); else { e.gD += e.D; e.gL += e.Lv; e.float = true; } }
            else if (e.t === 'vig') { per.forEach(function (p) { if (p.id != null) give(p.id, e.D / 2, e.Lv / 2); }); }
            else if (e.t === 'los' || e.t === 'tec' || e.t === 'mur') { var ok = per.filter(function (p) { return p.id != null; }), n = per.length; if (e.t === 'mur') { per.forEach(function (p) { if (p.id != null) give(p.id, e.D / n, e.Lv / n); else { e.gD += e.D / n; e.gL += e.Lv / n; } }); e.gLen = e.len * (n - ok.length) / n; } else if (ok.length) ok.forEach(function (p) { give(p.id, e.D / ok.length, e.Lv / ok.length); }); }
        });
        function it(e, st, msg, det) { var o = { id: e.id, t: e.t, status: st, msg: msg, det: det || '' }; items.push(o); by[e.id] = o; }
        function rank(r, okv, wv) { return r <= okv ? 'ok' : (r <= wv ? 'warn' : 'fail'); }
        E.forEach(function (e) {
            var Pd = e.D, Pl = e.Lv, Ps = Pd + Pl, Pu = 1.2 * Pd + 1.6 * Pl;
            if (e.t === 'zap') {
                var Df = dfOf(W, e), lay = groundSoil(W, e, e.y0, Df), bq = bearing(lay.c, lay.phi, lay.gam, Df, e.B, true), q = Ps / (e.B * e.B), FS = bq.qu / q, col = E.filter(function (o) { return o.t === 'col' && o.sup.ids.indexOf(e.id) >= 0; })[0], cc = col ? col.s : 0.3, d = e.th - 0.075, qn = Pu / (e.B * e.B), Vu = Pu - qn * Math.pow(cc + d, 2), phiVc = 0.75 * 0.33 * Math.sqrt(FC) * 4 * (cc + d) * d * 1000, pr = Vu / phiVc;
                var st = FS < 1.5 ? 'fail' : (FS < 3 ? 'warn' : 'ok'), msg = 'FS capacidad de carga = ' + f(FS, 2) + (FS < 3 ? ' (< 3)' : '') + ' · suelo: ' + lay.n + ' · Df = ' + f(Df, 2) + ' m · qu = ' + f(bq.qu, 0) + ' kPa · q = ' + f(q, 0) + ' kPa';
                if (pr > 1) { st = 'fail'; msg += ' · PUNZONAMIENTO: Vu ' + f(Vu, 0) + ' > φVc ' + f(phiVc, 0) + ' kN (aumenta el espesor)'; } else if (e.th < 0.3 && st === 'ok') { st = 'warn'; msg += ' · espesor < 0.30 m'; }
                if (FS < 3 && lay.n.indexOf('vegetal') >= 0) msg += ' · ¡estás cimentando sobre la capa vegetal! Excava hasta el suelo firme.'; e.FS = FS; it(e, st, msg, 'P = ' + f(Ps, 0) + ' kN');
            } else if (e.t === 'cim') {
                var Df2 = dfOf(W, e), lay2 = groundSoil(W, e, e.y0, Df2), bq2 = bearing(lay2.c, lay2.phi, lay2.gam, Df2, e.b, false), q2 = Ps / (e.b * e.len), FS2 = bq2.qu / q2; it(e, FS2 < 1.5 ? 'fail' : (FS2 < 3 ? 'warn' : 'ok'), 'FS = ' + f(FS2, 2) + ' · carga ' + f(Ps / e.len, 1) + ' kN/m sobre b = ' + f(e.b, 2) + ' m · suelo: ' + lay2.n + ' · Df = ' + f(Df2, 2) + ' m', ''); e.FS = FS2;
            } else if (e.t === 'col') {
                if (e.float) return it(e, 'fail', 'La columna no tiene apoyo debajo.', '');
                var Ag = e.s * e.s, As = 0.01 * Ag, phiPn = 0.8 * 0.65 * (0.85 * FC * 1000 * (Ag - As) + FY * 1000 * As), klr = 0.8 * e.h / (0.3 * e.s), m = klr <= 34 ? 1 : Math.max(0.3, 1 - (klr - 34) / 45), r = Pu / (m * phiPn);
                it(e, rank(r, 0.9, 1.0), 'Pu = ' + f(Pu, 0) + ' kN vs φPn = ' + f(m * phiPn, 0) + ' kN (' + f(r * 100, 0) + ' %) · esbeltez kL/r = ' + f(klr, 0) + (klr > 34 ? ' (esbelta: pandeo reduce la capacidad)' : '') + (r > 1 ? ' → aumenta la sección' : ''), '');
            } else if (e.t === 'vig') {
                if (e.sup.cov < 1) return it(e, 'fail', 'La viga perdió el apoyo en una columna.', '');
                var wu = (1.2 * Pd + 1.6 * Pl) / e.len, Mu = wu * e.len * e.len / 8, d3 = e.h - 0.05, As3 = 0.01 * e.b * d3, a3 = As3 * FY * 1000 / (0.85 * FC * 1000 * e.b), phiMn = 0.9 * As3 * FY * 1000 * (d3 - a3 / 2), r3 = Mu / phiMn, hmin = e.len / 16, st3 = rank(r3, 0.9, 1.0);
                var m3 = 'Mu = ' + f(Mu, 0) + ' kN·m vs φMn = ' + f(phiMn, 0) + ' kN·m (' + f(r3 * 100, 0) + ' %, ρ = 1 %) · wu = ' + f(wu, 1) + ' kN/m'; if (e.h < hmin && st3 === 'ok') { st3 = 'warn'; m3 += ' · peralte < L/16 = ' + f(hmin, 2) + ' m (deflexión)'; } if (r3 > 1) m3 += ' → aumenta el peralte h'; it(e, st3, m3, '');
            } else if (e.t === 'los') {
                if (e.sup.ids.length < 2 || e.sup.cov < 0.45) return it(e, 'fail', 'La losa no tiene apoyo suficiente.', ''); var Ls = Math.min(e.r[2] - e.r[0], e.r[3] - e.r[1]), hreq = Math.max(0.1, Ls / 28), r4 = hreq / e.th; it(e, r4 <= 1 ? 'ok' : (r4 <= 1.25 ? 'warn' : 'fail'), 'Espesor ' + f(e.th, 2) + ' m vs mínimo ≈ L/28 = ' + f(hreq, 2) + ' m (luz corta ' + f(Ls, 1) + ' m)' + (e.sup.cov < 0.8 ? ' · apoyo en ' + f(e.sup.cov * 100, 0) + ' % del perímetro' : '') + (r4 > 1 ? ' → más espesor o apoyos intermedios' : ''), '');
            } else if (e.t === 'mur') {
                var sl = e.h / e.th, st5 = sl <= 20 ? 'ok' : (sl <= 30 ? 'warn' : 'fail'), m5 = 'Esbeltez h/t = ' + f(sl, 0) + (sl > 20 ? ' (> 20: confina con columnetas o aumenta el espesor)' : ''); if (e.gLen > 0.3) { var Dfw = 0, layw = groundSoil(W, e, e.y0, 0), bw = bearing(layw.c, layw.phi, layw.gam, Dfw, e.th, false), qw = (e.gD + e.gL) / (e.gLen * e.th), FSw = bw.qu / qw; if (FSw < 1.5) st5 = 'fail'; else if (FSw < 3 && st5 === 'ok') st5 = 'warn'; m5 += ' · ' + f(e.gLen, 1) + ' m apoyan directo sobre el terreno (FS = ' + f(FSw, 1) + '): hace falta cimiento corrido'; } it(e, st5, m5, '');
            } else if (e.t === 'tec') { it(e, (e.sup.ids.length < 2 || e.sup.cov < 0.45) ? 'fail' : 'ok', (e.sup.ids.length < 2 || e.sup.cov < 0.45) ? 'El techo no tiene apoyo suficiente.' : 'Cubierta apoyada en ' + e.sup.ids.length + ' elemento(s).', '');
            } else if (e.t === 'cont') {
                var Hr = e.hHigh - e.hLow, B = e.B, tb = 0.4, ts = 0.3, H = e.H, toe = B / 3, heel = Math.max(0, B - toe - ts), lay6 = layerAt(W.site, h0At(W, e.cx, e.cz) - e.y0), Ka = Math.pow(Math.tan(PI / 4 - 30 * PI / 360), 2), gam = 18, Pa = 0.5 * Ka * gam * Hr * Hr, Mo = Pa * Hr / 3, W1 = 24 * ts * (H - tb), W2 = 24 * B * tb, Hs = Math.max(0, Hr - tb), W3 = gam * Hs * heel, V = W1 + W2 + W3, Mr = W1 * (toe + ts / 2) + W2 * B / 2 + W3 * (toe + ts + heel / 2), FSo = Mr / Math.max(Mo, 1e-6), mu = Math.max(0.35, Math.tan(2 / 3 * lay6.phi * PI / 180)), FSs = (mu * V + (lay6.phi < 10 ? 0.5 * lay6.c * B : 0)) / Math.max(Pa, 1e-6), ecc = B / 2 - (Mr - Mo) / V, qmax = ecc <= B / 6 ? V / B * (1 + 6 * ecc / B) : 2 * V / (3 * Math.max(0.05, B / 2 - ecc)), bq6 = bearing(lay6.c, lay6.phi, lay6.gam, 0.3, B, false), FSb = bq6.qu / qmax;
                var st6 = (FSo < 1.5 || FSs < 1.2 || FSb < 1.5 || ecc < 0 && false) ? 'fail' : ((FSo < 2 || FSs < 1.5 || FSb < 3) ? 'warn' : 'ok'), m6 = 'Altura retenida = ' + f(Hr, 2) + ' m · Pa = ' + f(Pa, 0) + ' kN/m · FS volcamiento = ' + f(FSo, 2) + ' (≥ 2) · FS deslizamiento = ' + f(FSs, 2) + ' (≥ 1.5) · FS capacidad = ' + f(FSb, 1) + ' · qmax = ' + f(qmax, 0) + ' kPa'; if (H < Hr - 0.05) { st6 = 'fail'; m6 += ' · el suelo rebosa por encima del muro (H < altura retenida)'; } if (Hr < 0.3) { st6 = 'warn'; m6 = 'Este muro no está reteniendo terreno (diferencia de nivel ' + f(Hr, 2) + ' m).'; } if (st6 !== 'ok' && FSs < 1.5) m6 += ' · aumenta la base B'; e.FSo = FSo; e.FSs = FSs; it(e, st6, m6, '');
            } else if (e.t === 'pav') {
                var req = W.mission.road || { sub: 0.2, base: 0.15, asf: 0.05 }, st7 = 'ok', m7 = ''; if (e.layer > 0 && !e.sup.ids.length) { st7 = 'fail'; m7 = 'Sin la capa inferior.'; } if (e.layer === 0) { var lay7 = layerAt(W.site, h0At(W, e.cx, e.cz) - e.y0); if (lay7.n.indexOf('vegetal') >= 0) { st7 = 'fail'; m7 = 'La subrasante es la capa vegetal/orgánica: retírala (excava) antes de construir la vía.'; } }
                if (st7 === 'ok') { var need = [req.sub, req.base, req.asf][e.layer]; if (e.th < need - 1e-6) { st7 = 'warn'; m7 = ['Subbase', 'Base', 'Carpeta'][e.layer] + ' de ' + f(e.th * 100, 1) + ' cm < ' + f(need * 100, 1) + ' cm requeridos'; } else m7 = ['Subbase', 'Base', 'Carpeta asfáltica'][e.layer] + ' de ' + f(e.th * 100, 1) + ' cm OK'; } it(e, st7, m7, '');
            } else if (e.t === 'tub') {
                var sl8 = (e.y1v - e.y2v) / e.len * 100, srf1 = surfAt(W, e.x1, e.z1), srf2 = surfAt(W, e.x2, e.z2), top1 = e.y1v + e.D, top2 = e.y2v + e.D, cov = (function () { var m = 9, k, n = Math.max(2, Math.ceil(e.len / 0.5)); for (k = 0; k <= n; k++) { var t = k / n, px = e.x1 + (e.x2 - e.x1) * t, pz = e.z1 + (e.z2 - e.z1) * t, ty = top1 + (top2 - top1) * t; m = Math.min(m, surfAt(W, px, pz) - ty); } return m; })(), st8 = 'ok', m8 = 'Pendiente ' + f(sl8, 1) + ' % · recubrimiento ' + f(cov, 2) + ' m (mín. 0.6 m bajo vía)'; if (sl8 < 0.5) { st8 = 'fail'; m8 += ' · no escurre (pendiente mínima 0.5 %)'; } else if (sl8 > 15) { st8 = 'warn'; m8 += ' · velocidad excesiva'; } if (cov < 0.3) st8 = 'fail'; else if (cov < 0.6 && st8 === 'ok') { st8 = 'warn'; m8 += ' · poco recubrimiento: se aplastará con el tráfico'; } e.cov = cov; e.slope = sl8; it(e, st8, m8, '');
            }
        });
        if (W.real) E.forEach(function (e) {
            var o = by[e.id]; if (!o || e.vol == null) return; var k = fcRatio(W, e), a = ageOf(W, e);
            function worse(st, msg) { var rk = { ok: 0, warn: 1, fail: 2 }; if (rk[st] > rk[o.status]) o.status = st; o.msg = msg + ' · ' + o.msg; }
            if (!isPoured(e)) worse('fail', '⛔ Sin hormigonar (' + f(e.pv / e.vol * 100, 0) + ' %): un encofrado vacío no resiste nada');
            else if (e.dmg > 0) worse('fail', '⛔ Desencofrado prematuro: concreto dañado');
            else if (k < 0.7) worse('warn', '⏳ Curando: ' + f(k * 100, 0) + ' % de f\'c (' + f(a, 1) + ' d; espera ~7 d)');
            else if (e.form && a >= STRIP[e.t]) worse('warn', '🪵 Retira el encofrado (ya pasaron ' + STRIP[e.t] + ' d)');
        });
        /* colapso */
        var fall = {}; items.forEach(function (o) { if (o.status === 'fail') fall[o.id] = true; });
        var chg = true; while (chg) { chg = false; E.forEach(function (e) { if (fall[e.id]) return; var s = e.sup; if (!s) return; var lost = 0, tot = 0; if (e.t === 'los' || e.t === 'tec') { var ok = s.per.filter(function (p) { return p.id != null && !fall[p.id]; }).length; if (s.per.length && ok / s.per.length < 0.6) { fall[e.id] = true; chg = true; } return; } s.per.forEach(function (p) { tot++; if (p.id != null && fall[p.id]) lost++; }); if (e.t === 'vig' && lost > 0) { fall[e.id] = true; chg = true; } else if ((e.t === 'col' || e.t === 'pav') && s.ids.some(function (id) { return fall[id]; })) { fall[e.id] = true; chg = true; } else if (e.t === 'mur' && tot && lost / tot > 0.5) { fall[e.id] = true; chg = true; } }); }
        var fails = items.filter(function (o) { return o.status === 'fail'; }).length, warns = items.filter(function (o) { return o.status === 'warn'; }).length;
        return { items: items, by: by, fails: fails, warns: warns, fall: fall, cost: costOf(W) };
    }
    function surfAt(W, x, z) { var h = hAt(W, x, z); W.elems.forEach(function (e) { if (e.t === 'pav' && inR(x, z, e.r, 0)) h = Math.max(h, e.y1); }); return h; }
    function groundAt(W, x, z, yFeet) { var h = hAt(W, x, z); W.elems.forEach(function (e) { if (e.t === 'tub' || e.t === 'tec') return; if (inR(x, z, e.r, 0) && e.y1 <= yFeet + 0.56 && e.y1 > h) h = e.y1; }); return h; }

    /* ---------- Misiones ---------- */
    function cnt(W, t, fn) { return W.elems.filter(function (e) { return e.t === t && (!fn || fn(e)); }); }
    function nearPt(e, p, d) { return Math.hypot((e.cx) - p[0], (e.cz) - p[1]) <= d; }
    function cover(W, t, rect, pred) { var a = 0; W.elems.forEach(function (e) { if (e.t === t && (!pred || pred(e))) a += ovArea(e.r, rect); }); var tot = (rect[2] - rect[0]) * (rect[3] - rect[1]); return a / tot; }
    function perimLen(W, t, rect, pred) { var L = 0; W.elems.forEach(function (e) { if (e.t !== t || (pred && !pred(e))) return; var x1 = rect[0], z1 = rect[1], x2 = rect[2], z2 = rect[3], tol = 0.5; if (e.axisX) { if (Math.abs(e.z1 - z1) < tol || Math.abs(e.z1 - z2) < tol) L += Math.max(0, Math.min(Math.max(e.x1, e.x2), x2 + tol) - Math.max(Math.min(e.x1, e.x2), x1 - tol)); } else { if (Math.abs(e.x1 - x1) < tol || Math.abs(e.x1 - x2) < tol) L += Math.max(0, Math.min(Math.max(e.z1, e.z2), z2 + tol) - Math.max(Math.min(e.z1, e.z2), z1 - tol)); } }); return L; }
    function obj(text, ok, extra) { return { text: text, ok: !!ok, extra: extra || '' }; }
    var MISSIONS = {
        libre: { id: 'libre', n: 'Modo libre', ico: '🛠️', desc: 'Lote vacío para experimentar: excava, cimenta y construye lo que quieras.', site: 'firme', budget: 0, objectives: function () { return []; } },
        casa: { id: 'casa', n: 'Casa de 1 piso (6 × 4 m)', ico: '🏠', site: 'firme', budget: 7500, live: 1.8, hint: 'Excava ≥ 0.8 m en las 4 esquinas (bajo la capa vegetal), nivela, cimenta, levanta columnas, vigas, losa y muros.',
            desc: 'Construye una casa de un piso sobre las estacas amarillas: cimentación en cada esquina, columnas, vigas perimetrales, losa y muros.',
            setup: function (W) { W.marks = [[-3, -2], [3, -2], [3, 2], [-3, 2]]; W.rectObj = [-3, -2, 3, 2]; },
            objectives: function (W, rep) { var R = W.rectObj, M = W.marks, corner = function (e) { return M.some(function (p) { return nearPt(e, p, 0.7); }); }, zs = cnt(W, 'zap', corner), deep = zs.filter(function (e) { return h0At(W, e.cx, e.cz) - e.y0 >= 0.79; }), cs = cnt(W, 'col', corner), pl = perimLen(W, 'vig', R) / 20, wl = perimLen(W, 'mur', R) / 20, sc = cover(W, 'los', R);
                return [obj('4 zapatas en las esquinas (' + zs.length + '/4)', zs.length >= 4), obj('Desplantadas ≥ 0.8 m bajo el terreno natural (' + deep.length + '/4)', deep.length >= 4), obj('Todas las zapatas con FS ≥ 3', zs.length >= 4 && zs.every(function (e) { return rep.by[e.id] && rep.by[e.id].status === 'ok'; })), obj('4 columnas en las esquinas (' + cs.length + '/4)', cs.length >= 4), obj('Vigas perimetrales ≥ 90 % (' + f(pl * 100, 0) + ' %)', pl >= 0.9), obj('Losa cubre ≥ 90 % de 6 × 4 m (' + f(sc * 100, 0) + ' %)', sc >= 0.9), obj('Muros de mampostería ≥ 80 % del perímetro (' + f(wl * 100, 0) + ' %)', wl >= 0.8), obj('Ningún elemento falla en la prueba de carga', rep.fails === 0 && W.elems.length > 0)]; } },
        edificio: { id: 'edificio', n: 'Edificio de 3 pisos (6 × 6 m)', ico: '🏢', site: 'blando', budget: 26000, live: 2.0, hint: 'Suelo blando: ensancha zapatas. Columnas de 3 pisos, vigas y losa en cada nivel (losa 6 m → espesor ≥ 0.22 m).',
            desc: 'Edificio de 3 niveles sobre suelo blando: cimentación, 3 niveles de columnas, vigas perimetrales y 3 losas.',
            setup: function (W) { W.marks = [[-3, -3], [3, -3], [3, 3], [-3, 3]]; W.rectObj = [-3, -3, 3, 3]; },
            objectives: function (W, rep) { var R = W.rectObj, M = W.marks, corner = function (e) { return M.some(function (p) { return nearPt(e, p, 0.7); }); }, zs = cnt(W, 'zap', corner), cs = cnt(W, 'col', corner), top = Math.max.apply(null, [0].concat(cs.map(function (e) { return e.y1; }))), lv = {}; cnt(W, 'los', function (e) { return ovArea(e.r, R) > 0.9 * 36; }).forEach(function (e) { lv[f(e.y0, 1)] = 1; }); var nl = Object.keys(lv).length, pl = perimLen(W, 'vig', R) / (24 * 3);
                return [obj('4 zapatas en las esquinas con FS ≥ 3', zs.length >= 4 && zs.every(function (e) { return rep.by[e.id] && rep.by[e.id].status === 'ok'; })), obj('Columnas hasta ≥ 8 m de altura (' + f(top, 1) + ' m)', cs.length >= 12 && top >= 7.5), obj('3 niveles de losa cubriendo 6 × 6 m (' + nl + '/3)', nl >= 3), obj('Vigas perimetrales en los 3 niveles ≥ 85 % (' + f(pl * 100, 0) + ' %)', pl >= 0.85), obj('Ningún elemento falla en la prueba de carga', rep.fails === 0 && W.elems.length > 0)]; } },
        contencion: { id: 'contencion', n: 'Muro de contención (talud de 3 m)', ico: '🧱', site: 'firme', budget: 9000, hint: 'Un banco de tierra de 3 m amenaza con deslizar. Coloca un muro de contención de ≥ 10 m. Sube la base B si no cumple el deslizamiento.',
            desc: 'Contén un talud de 3 m: el muro debe verificar volcamiento (FS ≥ 2), deslizamiento (FS ≥ 1.5) y capacidad portante.',
            setup: function (W) { var i, j; for (j = 0; j < N; j++) for (i = 0; i < N; i++) W.H[idx(i, j)] = (j - N / 2 < 0 && Math.abs(i - N / 2 + 0.5) < 14) ? 3 : 0; W.marks = [[-5, 0], [5, 0]]; },
            objectives: function (W, rep) { var ws = cnt(W, 'cont'), L = ws.reduce(function (a, e) { return a + e.len; }, 0), okw = ws.length && ws.every(function (e) { return rep.by[e.id] && rep.by[e.id].status === 'ok'; }), Hr = ws.length ? Math.min.apply(null, ws.map(function (e) { return e.H - (e.hHigh - e.hLow); })) : -1; return [obj('Muro de contención de ≥ 10 m de longitud (' + f(L, 1) + ' m)', L >= 10), obj('Altura del muro ≥ altura retenida', ws.length > 0 && Hr >= -0.05), obj('Verifica volcamiento, deslizamiento y capacidad', !!okw), obj('Ningún elemento falla', rep.fails === 0 && W.elems.length > 0)]; } },
        via: { id: 'via', n: 'Vía de 20 m con alcantarilla', ico: '🛣️', site: 'firme', budget: 14000, road: { sub: 0.2, base: 0.15, asf: 0.05 }, hint: 'Retira la capa vegetal (excava ≥ 0.5 m en el corredor), nivela, extiende subbase → base → asfalto y cruza una tubería con ≥ 0.6 m de recubrimiento y pendiente ≥ 1 %.',
            desc: 'Construye 20 m de vía de 4 m de ancho sobre subrasante limpia, con pavimento por capas y una alcantarilla transversal.',
            setup: function (W) { W.marks = [[-2, -10], [2, -10], [2, 10], [-2, 10]]; W.rectObj = [-2, -10, 2, 10]; },
            objectives: function (W, rep) { var R = W.rectObj, i, j, ok = 0, tot = 0; for (j = 0; j < N; j++) for (i = 0; i < N; i++) { var x = i - N / 2 + 0.5, z = j - N / 2 + 0.5; if (x > -2 && x < 2 && z > -10 && z < 10) { tot++; if (W.H[idx(i, j)] <= -0.49) ok++; } } var tub = cnt(W, 'tub', function (e) { return e.len >= 4 && e.axisX; }), tOk = tub.some(function (e) { return rep.by[e.id] && rep.by[e.id].status === 'ok'; }), c0 = cover(W, 'pav', R, function (e) { return e.layer === 0; }), c1 = cover(W, 'pav', R, function (e) { return e.layer === 1; }), c2 = cover(W, 'pav', R, function (e) { return e.layer === 2; }), pavOk = !W.elems.some(function (e) { return e.t === 'pav' && rep.by[e.id] && rep.by[e.id].status !== 'ok'; });
                return [obj('Subrasante limpia: corredor excavado a ≤ −0.5 m (' + f(ok / tot * 100, 0) + ' %)', ok / tot >= 0.9), obj('Subbase ≥ 90 % (' + f(c0 * 100, 0) + ' %)', c0 >= 0.9), obj('Base ≥ 90 % (' + f(c1 * 100, 0) + ' %)', c1 >= 0.9), obj('Carpeta asfáltica ≥ 90 % (' + f(c2 * 100, 0) + ' %)', c2 >= 0.9), obj('Espesores de capas cumplen (25/15/5 cm mín.)', c2 >= 0.9 && pavOk), obj('Alcantarilla transversal con pendiente y recubrimiento adecuados', tOk)]; } },
        puente: { id: 'puente', n: 'Puente de 10 m sobre quebrada', ico: '🌉', site: 'firme', budget: 22000, live: 5.0, hint: 'Cimenta 4 pilas en los bordes de la quebrada (z = ±5), une con 2 vigas de ≥ 10 m (peralte grande) y coloca la losa del tablero.',
            desc: 'Una quebrada de 8 m de ancho y 3 m de profundidad. Construye pilas, vigas principales y tablero para tráfico (5 kPa).',
            setup: function (W) { var i, j; for (j = 0; j < N; j++) for (i = 0; i < N; i++) { var z = j - N / 2 + 0.5; W.H[idx(i, j)] = Math.abs(z) < 4 ? -3 : 0; } W.water = -2; W.marks = [[-1.5, -5], [1.5, -5], [1.5, 5], [-1.5, 5]]; W.rectObj = [-1.5, -5, 1.5, 5]; },
            objectives: function (W, rep) { var M = W.marks, corner = function (e) { return M.some(function (p) { return nearPt(e, p, 0.8); }); }, zs = cnt(W, 'zap', corner), cs = cnt(W, 'col', corner), bs = cnt(W, 'vig', function (e) { return !e.axisX && e.len >= 9.5; }), sc = cover(W, 'los', W.rectObj);
                return [obj('4 pilas con zapata en los bordes (' + zs.length + '/4) y FS ≥ 3', zs.length >= 4 && zs.every(function (e) { return rep.by[e.id] && rep.by[e.id].status === 'ok'; })), obj('4 columnas (pilas) (' + cs.length + '/4)', cs.length >= 4), obj('2 vigas principales de ≥ 10 m (' + bs.length + '/2) que resisten flexión', bs.length >= 2 && bs.every(function (e) { return rep.by[e.id] && rep.by[e.id].status !== 'fail'; })), obj('Losa del tablero ≥ 80 % (' + f(sc * 100, 0) + ' %)', sc >= 0.8), obj('Ningún elemento falla con tráfico (5 kPa)', rep.fails === 0 && W.elems.length > 0)]; } }
    };
    function missionStatus(W, rep) { rep = rep || analyze(W); var o = W.mission.objectives(W, rep), done = o.length > 0 && o.every(function (x) { return x.ok; }), c = rep.cost.total, bud = Math.round((W.mission.budget || 0) * (W.real ? 1.35 : 1)), stars = done ? 1 + (bud && c <= bud ? 1 : 0) + (rep.warns === 0 && bud && c <= bud ? 1 : 0) : 0; return { objs: o, done: done, stars: stars, cost: c, budget: bud }; }

    G.SimObraCore = { N: N, HMIN: HMIN, HMAX: HMAX, STEP: STEP, SITES: SITES, RELLENO: RELLENO, MISSIONS: MISSIONS, NAMES: NAMES, PRICE: PRICE, layerAt: layerAt, RELLENO_C: RELLENO_C, compact: compact, stabilize: stabilize, slopeLimit: slopeLimit, scoopCell: scoopCell, dumpSoil: dumpSoil, layerBounds: layerBounds, bearing: bearing, newWorld: newWorld, dig: dig, add: add, remove: remove, analyze: analyze, missionStatus: missionStatus, costOf: costOf, hAt: hAt, h0At: h0At, cellOf: cellOf, idx: idx, groundAt: groundAt, surfAt: surfAt, snap: snap, supportsOf: supportsOf, fmt: f, inR: inR, ovArea: ovArea, CONC: CONC, STRIP: STRIP, PX: PX, pourInto: pourInto, pourTarget: pourTarget, pumpPour: pumpPour, armar: armar, encofrar: encofrar, pourDirect: pourDirect, advance: advance, strip: strip, setReal: setReal, pourAll: pourAll, stripAll: stripAll, stateOf: stateOf, fcRatio: fcRatio, isPoured: isPoured, ageOf: ageOf };
})(typeof window !== 'undefined' ? window : globalThis);
