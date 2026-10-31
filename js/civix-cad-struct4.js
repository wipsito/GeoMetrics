/**
 * Civix CAD — Diseño estructural académico, bloque P1:
 *   portico (1–2 pisos, 1–2 vanos; método matricial de rigidez, diagramas M, V, N)
 *   columnaFlex (diagrama de interacción simplificado)
 *   muroC (muro de contención en voladizo completo: Rankine + sobrecarga + estabilidad + armado)
 *   losaNerv (losa nervada / aligerada en una dirección con ábaco)
 *   lamina / memoPDF (utilidades de entrega: lámina con rótulo y memoria en PDF)
 *
 * EDUCATIVO: predimensionamiento y croquis (principios ACI 318 / NSR-10).
 * NO sustituye el diseño completo firmado por un ingeniero. Unidades: kN, m, MPa; secciones en mm; dibujo en mm.
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || !CAD.struct || !CAD.struct._h || CAD.struct.__v4) return; var S = CAD.struct; S.__v4 = true; var H = S._h;
    var PI = Math.PI, SQ = Math.sqrt, BARS = H.BARS, F = H.F, Draw = H.Draw, needAs = H.needAs, bomRow = H.bomRow, BOMH = H.BOMH, finish = H.finish, fail = H.fail, AVISO = H.AVISO, beta1 = H.beta1, fl25 = H.fl25;

    /* ---------- solver lineal (eliminación gaussiana con pivoteo) ---------- */
    function solve(A, b) { var n = b.length, i, j, k; for (i = 0; i < n; i++) { var m = i; for (j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[m][i])) m = j; if (Math.abs(A[m][i]) < 1e-12) return null; var t = A[i]; A[i] = A[m]; A[m] = t; var tb = b[i]; b[i] = b[m]; b[m] = tb; for (j = i + 1; j < n; j++) { var f = A[j][i] / A[i][i]; if (!f) continue; for (k = i; k < n; k++) A[j][k] -= f * A[i][k]; b[j] -= f * b[i]; } } var x = new Array(n); for (i = n - 1; i >= 0; i--) { var s = b[i]; for (j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x; }

    /* ============================================================================
     * 6) PORTICO PLANO — método matricial de rigidez (elástico lineal, 2D)
     *    Hipótesis: material lineal; inercias agrietadas 0.70·Ig (columnas) y 0.35·Ig (vigas) (ACI 318 §6.6.3.1.1);
     *    nudos rígidos; cargas gravitacionales uniformes en vigas y fuerza horizontal en cada nivel (repartida entre nudos);
     *    sin efectos P-Δ, sin torsión, sin sismo ni viento reales (la fuerza lateral es un dato del usuario).
     *    Caso 1 = 1.2D + 1.6L · Caso 2 = 1.2D + 1.0L + 1.0E (E = fuerza lateral dada).
     * ========================================================================== */
    function frameSolve(G, wBeam, Fh, E, Ic, Ib, Ac, Ab, base) {
        var nn = G.nodes.length, nd = 3 * nn, K = [], R = new Array(nd).fill(0), i, j;
        for (i = 0; i < nd; i++) K.push(new Array(nd).fill(0));
        G.els.forEach(function (e) { var a = G.nodes[e.i], b = G.nodes[e.j], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), c = dx / L, s = dy / L, I = e.col ? Ic : Ib, A = e.col ? Ac : Ab, EA = E * A / L, EI = E * I; e.L = L; e.c = c; e.s = s;
            var k = [[EA, 0, 0, -EA, 0, 0], [0, 12 * EI / L ** 3, 6 * EI / L ** 2, 0, -12 * EI / L ** 3, 6 * EI / L ** 2], [0, 6 * EI / L ** 2, 4 * EI / L, 0, -6 * EI / L ** 2, 2 * EI / L], [-EA, 0, 0, EA, 0, 0], [0, -12 * EI / L ** 3, -6 * EI / L ** 2, 0, 12 * EI / L ** 3, -6 * EI / L ** 2], [0, 6 * EI / L ** 2, 2 * EI / L, 0, -6 * EI / L ** 2, 4 * EI / L]];
            var T = [[c, s, 0, 0, 0, 0], [-s, c, 0, 0, 0, 0], [0, 0, 1, 0, 0, 0], [0, 0, 0, c, s, 0], [0, 0, 0, -s, c, 0], [0, 0, 0, 0, 0, 1]]; e.k = k; e.T = T;
            var kg = [], p, q, r; for (p = 0; p < 6; p++) { kg.push([]); for (q = 0; q < 6; q++) { var v = 0; for (r = 0; r < 6; r++) for (var t2 = 0; t2 < 6; t2++) v += T[r][p] * k[r][t2] * T[t2][q]; kg[p].push(v); } }
            var dof = [3 * e.i, 3 * e.i + 1, 3 * e.i + 2, 3 * e.j, 3 * e.j + 1, 3 * e.j + 2]; e.dof = dof; for (p = 0; p < 6; p++) for (q = 0; q < 6; q++) K[dof[p]][dof[q]] += kg[p][q];
            e.w = e.col ? 0 : wBeam; if (e.w) { var w = e.w; e.fe = [0, w * L / 2, w * L * L / 12, 0, w * L / 2, -w * L * L / 12]; R[dof[1]] -= w * L / 2; R[dof[2]] -= w * L * L / 12; R[dof[4]] -= w * L / 2; R[dof[5]] += w * L * L / 12; } else e.fe = [0, 0, 0, 0, 0, 0]; });
        G.floors.forEach(function (fl) { var ids = fl.nodes; ids.forEach(function (id) { R[3 * id] += Fh / ids.length; }); });
        var fixed = {}; G.base.forEach(function (id) { fixed[3 * id] = 1; fixed[3 * id + 1] = 1; if (base === 1) fixed[3 * id + 2] = 1; });
        var free = [], k2; for (i = 0; i < nd; i++) if (!fixed[i]) free.push(i);
        var Kf = free.map(function (a) { return free.map(function (b) { return K[a][b]; }); }), Rf = free.map(function (a) { return R[a]; }), uf = solve(Kf, Rf); if (!uf) return null;
        var u = new Array(nd).fill(0); free.forEach(function (a, ii) { u[a] = uf[ii]; });
        var out = { u: u, els: [] };
        G.els.forEach(function (e) { var ug = e.dof.map(function (d) { return u[d]; }), ul = [], p, q; for (p = 0; p < 6; p++) { var v = 0; for (q = 0; q < 6; q++) v += e.T[p][q] * ug[q]; ul.push(v); } var f = []; for (p = 0; p < 6; p++) { var v2 = 0; for (q = 0; q < 6; q++) v2 += e.k[p][q] * ul[q]; f.push(v2 + e.fe[p]); }
            var n = 12, M = [], V = [], N = []; for (p = 0; p <= n; p++) { var x = e.L * p / n; M.push(-f[2] + f[1] * x - e.w * x * x / 2); V.push(f[1] - e.w * x); N.push(-f[0]); } out.els.push({ M: M, V: V, N: N, f: f }); });
        return out;
    }
    S.portico = function (o) {
        o = Object.assign({ pisos: 2, vanos: 2, Lv: 5, Hp: 3, bc: 400, hc: 400, bv: 300, hv: 500, wD: 20, wL: 8, Fh: 30, fc: 28, base: 1, caso: 1 }, o || {});
        var NP = o.pisos === 1 ? 1 : 2, NV = o.vanos === 1 ? 1 : 2, warns = [], memo = [], fc = o.fc, E = 4700 * SQ(fc) * 1000, Ic = 0.70 * (o.bc / 1000) * Math.pow(o.hc / 1000, 3) / 12, Ib = 0.35 * (o.bv / 1000) * Math.pow(o.hv / 1000, 3) / 12, Ac = o.bc * o.hc / 1e6, Ab = o.bv * o.hv / 1e6;
        var G = { nodes: [], els: [], floors: [], base: [] }, id = [], f, i; for (f = 0; f <= NP; f++) { id.push([]); for (i = 0; i <= NV; i++) { id[f].push(G.nodes.length); G.nodes.push([i * o.Lv, f * o.Hp]); } }
        for (f = 0; f < NP; f++) for (i = 0; i <= NV; i++) G.els.push({ i: id[f][i], j: id[f + 1][i], col: true, f: f }); for (f = 1; f <= NP; f++) for (i = 0; i < NV; i++) G.els.push({ i: id[f][i], j: id[f][i + 1], col: false, f: f }); for (f = 1; f <= NP; f++) G.floors.push({ nodes: id[f].slice() }); G.base = id[0].slice();
        var wself = 24 * o.bv * o.hv / 1e6, w1 = 1.2 * (o.wD + wself) + 1.6 * o.wL, w2 = 1.2 * (o.wD + wself) + 1.0 * o.wL, R1 = frameSolve(G, w1, 0, E, Ic, Ib, Ac, Ab, o.base), R2 = frameSolve(G, w2, o.Fh, E, Ic, Ib, Ac, Ab, o.base);
        if (!R1 || !R2) return fail('No se pudo resolver el pórtico (estructura inestable): revise datos.');
        var Rs = o.caso === 2 ? R2 : R1, summ = function (R) { var mb = 0, mc = 0, vb = 0, vc = 0, nc = 0; R.els.forEach(function (r, k) { var e = G.els[k], mx = Math.max.apply(null, r.M.map(Math.abs)), vx = Math.max.apply(null, r.V.map(Math.abs)), nx = Math.max.apply(null, r.N.map(Math.abs)); if (e.col) { mc = Math.max(mc, mx); vc = Math.max(vc, vx); nc = Math.max(nc, nx); } else { mb = Math.max(mb, mx); vb = Math.max(vb, vx); } }); return { mb: mb, mc: mc, vb: vb, vc: vc, nc: nc }; }, s1 = summ(R1), s2 = summ(R2);
        var Ek = 1, drifts = []; for (f = 1; f <= NP; f++) { var ux = R2.u[3 * id[f][0]], ub = f > 1 ? R2.u[3 * id[f - 1][0]] : 0; drifts.push(Math.abs(ux - ub) / o.Hp); } var dmax = Math.max.apply(null, drifts); if (dmax > 0.01) warns.push('Deriva ' + F(dmax * 100, 2) + ' % > 1.0 % (límite NSR-10 A.6.4 para concreto con fuerza E dada): aumente columnas/vigas o reduzca la fuerza lateral.');
        if (o.hc < 300 || o.bc < 300) warns.push('Columnas menores a 300 mm: revise requisitos mínimos de NSR-10.'); if (s2.nc > 0.5 * 0.65 * 0.85 * fc * o.bc * o.hc / 1000) warns.push('Carga axial en columna alta (> 0.5·φ·0.85f′c·Ag): verifique la sección con el módulo de columna.');
        memo.push('PORTICO PLANO DE ' + NP + ' PISO(S) Y ' + NV + ' VANO(S) — ANALISIS MATRICIAL (educativo)', 'Unidades: kN, m, MPa; secciones en mm.',
            'Hipótesis: elástico lineal 2D · E = 4700√f′c = ' + F(E / 1000, 0) + ' MPa · inercias agrietadas 0.70Ig (columnas) y 0.35Ig (vigas) · nudos rígidos · base ' + (o.base === 1 ? 'empotrada' : 'articulada') + ' · sin P-Δ, sin torsión; la fuerza lateral E es un dato (no se calcula sismo ni viento).',
            'Geometría: vano = ' + o.Lv + ' m · altura de piso = ' + o.Hp + ' m · columnas ' + o.bc + '×' + o.hc + ' · vigas ' + o.bv + '×' + o.hv + ' mm',
            'Cargas en vigas: wD = ' + o.wD + ' + p.p. ' + F(wself, 2) + ' kN/m, wL = ' + o.wL + ' kN/m · Caso 1: wu = 1.2D + 1.6L = ' + F(w1, 2) + ' kN/m · Caso 2: 1.2D + 1.0L = ' + F(w2, 2) + ' kN/m + fuerza lateral E = ' + o.Fh + ' kN por nivel',
            'CASO 1 (gravedad): M máx. vigas = ' + F(s1.mb, 1) + ' kN·m · M máx. columnas = ' + F(s1.mc, 1) + ' kN·m · V máx. vigas = ' + F(s1.vb, 1) + ' kN · N máx. columnas = ' + F(s1.nc, 1) + ' kN',
            'CASO 2 (gravedad + lateral): M máx. vigas = ' + F(s2.mb, 1) + ' kN·m · M máx. columnas = ' + F(s2.mc, 1) + ' kN·m · V máx. vigas = ' + F(s2.vb, 1) + ' kN · N máx. columnas = ' + F(s2.nc, 1) + ' kN',
            'Deriva de entrepiso (caso lateral, E sin mayorar): ' + drifts.map(function (d, k) { return 'piso ' + (k + 1) + ' = ' + F(d * 100, 3) + ' %'; }).join(' · ') + ' (límite 1.0 %)',
            'Diagrama mostrado: ' + (o.caso === 2 ? 'CASO 2' : 'CASO 1') + '. Use estos M, V y N con los módulos de viga y columna (flexocompresión) para dimensionar el acero. Momentos dibujados del lado de la tracción.',
            'NO verificado: P-Δ, efectos de segundo orden, torsión, losa como diafragma, combinaciones sísmicas NSR-10, diseño por capacidad, nudos.', AVISO);
        // dibujo
        var th = Math.max(45, o.Lv * 1000 * 0.014), D = new Draw(th), W = NV * o.Lv * 1000, Hh = NP * o.Hp * 1000, gap = W + 3500, kinds = ['M', 'V', 'N'], mmax = { M: Math.max(s1.mb, s1.mc, s2.mb, s2.mc, 1e-6), V: Math.max(s1.vb, s1.vc, s2.vb, s2.vc, 1e-6), N: Math.max(s1.nc, s2.nc, 1e-6) }, rows = [];
        if (o.caso === 2) { mmax.M = Math.max(s2.mb, s2.mc, 1e-6); mmax.V = Math.max(s2.vb, s2.vc, 1e-6); mmax.N = s2.nc || 1e-6; } else { mmax.M = Math.max(s1.mb, s1.mc, 1e-6); mmax.V = Math.max(s1.vb, s1.vc, 1e-6); mmax.N = s1.nc || 1e-6; }
        D.text(0, Hh + th * 10, 'PORTICO PLANO PP-1 — GEOMETRIA Y DIAGRAMAS M, V, N (' + (o.caso === 2 ? 'caso 2: 1.2D+1.0L+E' : 'caso 1: 1.2D+1.6L') + ')', { h: th * 1.5 }); D.text(0, Hh + th * 8, NP + ' pisos · ' + NV + ' vanos de ' + o.Lv + ' m · H = ' + o.Hp + ' m · col. ' + o.bc + '×' + o.hc + ' · vigas ' + o.bv + '×' + o.hv, { h: th * 0.9 });
        kinds.forEach(function (kd, ki) {
            var ox = ki * gap, scl = (0.28 * Math.min(o.Hp, o.Lv) * 1000) / mmax[kd]; D.text(ox + W / 2, Hh + th * 4, (kd === 'M' ? 'MOMENTO FLECTOR M (kN·m)' : kd === 'V' ? 'CORTANTE V (kN)' : 'AXIAL N (kN) (+ tracción)'), { ha: 1, h: th * 1.1 });
            G.els.forEach(function (e, k) { var a = G.nodes[e.i], b = G.nodes[e.j], r = Rs.els[k], vals = r[kd], n = vals.length - 1, lx = -e.s, ly = e.c; D.line(a[0] * 1000 + ox, a[1] * 1000, b[0] * 1000 + ox, b[1] * 1000, 'EJES'); var pts = [[a[0] * 1000 + ox, a[1] * 1000]], p;
                for (p = 0; p <= n; p++) { var x = e.L * p / n, px = a[0] * 1000 + e.c * x * 1000, py = a[1] * 1000 + e.s * x * 1000, sg = kd === 'M' ? -1 : 1, v = vals[p] * scl * sg; pts.push([px + ox + lx * v, py + ly * v]); } pts.push([b[0] * 1000 + ox, b[1] * 1000]); D.poly(pts, false, 'ARMADURA', kd === 'M' ? 1 : (kd === 'V' ? 3 : 5));
                var mid = vals.reduce(function (m, v) { return Math.abs(v) > Math.abs(m) ? v : m; }, 0), im = vals.indexOf(mid), xm = e.L * im / n; D.text(a[0] * 1000 + e.c * xm * 1000 + ox + lx * mid * scl * (kd === 'M' ? -1 : 1) + (e.col ? th * 0.6 : 0), a[1] * 1000 + e.s * xm * 1000 + ly * mid * scl * (kd === 'M' ? -1 : 1) + (e.col ? 0 : th * 0.6), F(mid, 1), { h: th * 0.8, aci: 2 }); });
            G.nodes.forEach(function (nd) { D.circle(nd[0] * 1000 + ox, nd[1] * 1000, th * 0.3, 'CONTORNO'); }); G.base.forEach(function (bid) { var nd = G.nodes[bid]; D.rect(nd[0] * 1000 + ox - th * 1.2, -th * 1.4, th * 2.4, th * 1.4, 'SOMBRA'); });
            if (ki === 0) { for (i = 0; i < NV; i++) D.dim(i * o.Lv * 1000, 0, (i + 1) * o.Lv * 1000, 0, -th * 3, F(o.Lv * 1000)); for (f = 0; f < NP; f++) D.dim(W, f * o.Hp * 1000, W, (f + 1) * o.Hp * 1000, th * 3, F(o.Hp * 1000)); }
        });
        G.floors.forEach(function (fl, k) { var y = (k + 1) * o.Hp * 1000; D.line(-th * 5, y, -th * 0.8, y, 'COTAS'); D.line(-th * 1.6, y + th * 0.5, -th * 0.8, y, 'COTAS'); D.line(-th * 1.6, y - th * 0.5, -th * 0.8, y, 'COTAS'); D.text(-th * 5.2, y + th * 0.6, 'E = ' + o.Fh + ' kN', { h: th * 0.8, ha: 2 }); });
        rows.push(['Vigas', 'M máx (kN·m)', F(s1.mb, 1), F(s2.mb, 1)], ['Vigas', 'V máx (kN)', F(s1.vb, 1), F(s2.vb, 1)], ['Columnas', 'M máx (kN·m)', F(s1.mc, 1), F(s2.mc, 1)], ['Columnas', 'N máx (kN)', F(s1.nc, 1), F(s2.nc, 1)]); var by = -th * 8; D.text(0, by, 'RESULTADOS MAXIMOS', { h: th * 1.1 }); D.table(0, by - th * 1.2, ['Elemento', 'Magnitud', 'Caso 1', 'Caso 2'], rows, [th * 9, th * 12, th * 8, th * 8]);
        var model = finish(D, 'PORTICO PLANO', null, { noTable: true });
        return { ok: true, warns: warns, memo: memo, model: model, calc: { s1: s1, s2: s2, drift: dmax } };
    };

    /* ============================================================================
     * 7) COLUMNA EN FLEXOCOMPRESION — diagrama de interacción simplificado
     *    Compatibilidad de deformaciones (εcu = 0.003), bloque de Whitney, acero repartido en 2 caras (n/2 por cara)
     *    para flexión alrededor del eje fuerte. Barras laterales intermedias NO se consideran (conservador).
     *    φ varía de 0.65 (control por compresión, estribos) a 0.90 (control por tracción); φPn,máx = 0.80·φ·P0.
     * ========================================================================== */
    function interaction(b, h, d1, as1, as2, fc, fy) {
        var Es = 200000, b1 = beta1(fc), Ag = b * h, Ast = as1 + as2, pts = [], d2 = h - d1, i, cs = [];
        for (i = 0; i <= 70; i++) cs.push(h * 3 * Math.pow(0.012, i / 70)); // c de 3h a ~0.036h (geométrico)
        cs.forEach(function (c) { var a = Math.min(b1 * c, h), Cc = 0.85 * fc * b * a, e1 = 0.003 * (c - d1) / c, e2 = 0.003 * (c - d2) / c, f1 = Math.max(-fy, Math.min(fy, Es * e1)), f2 = Math.max(-fy, Math.min(fy, Es * e2)), disp = a >= d1 ? 0.85 * fc : 0;
            var Pn = (Cc + as1 * (f1 - disp) + as2 * f2) / 1000, Mn = (Cc * (h / 2 - a / 2) + as1 * (f1 - disp) * (h / 2 - d1) + as2 * f2 * (h / 2 - d2)) / 1e6, et = -e2, ey = fy / Es, phi = et <= ey ? 0.65 : (et >= ey + 0.003 ? 0.9 : 0.65 + 0.25 * (et - ey) / 0.003);
            pts.push({ c: c, Pn: Pn, Mn: Mn, phi: phi, fP: phi * Pn, fM: phi * Mn }); });
        var P0 = (0.85 * fc * (Ag - Ast) + fy * Ast) / 1000, Pmax = 0.80 * 0.65 * P0, cb = 600 / (600 + fy) * d2;
        return { pts: pts, P0: P0, Pmax: Pmax, cb: cb, Pt: -fy * Ast / 1000 };
    }
    S.columnaFlex = function (o) {
        o = Object.assign({ Pu: 1200, Mu: 150, b: 400, h: 500, nBars: 8, bar: 6, rec: 40, fc: 28, fy: 420 }, o || {});
        var warns = [], memo = [], b = o.b, h = o.h, dest = BARS[3][0], db = BARS[o.bar][0], Ab = BARS[o.bar][1], n = Math.max(4, 2 * Math.round(o.nBars / 2)), d1 = o.rec + dest + db / 2, Ast = n * Ab, Ag = b * h, rho = Ast / Ag, as1 = Ab * n / 2, as2 = as1;
        if (rho < 0.01) warns.push('ρ = ' + F(rho * 100, 2) + ' % < 1 % (mínimo ACI/NSR-10 para columnas).'); if (rho > 0.04) warns.push('ρ = ' + F(rho * 100, 2) + ' % > 4 % (máximo práctico NSR-10: 4 % con empalmes).');
        var cl = (b - 2 * (o.rec + dest) - (n / 2) * db) / (n / 2 - 1 || 1); if (n / 2 > 1 && cl < Math.max(40, 1.5 * db)) warns.push('Separación libre entre barras ' + F(cl, 0) + ' mm < ' + F(Math.max(40, 1.5 * db), 0) + ' mm: aumente b o reduzca barras.');
        var I = interaction(b, h, d1, as1, as2, o.fc, o.fy), pts = I.pts, i, bal = pts.reduce(function (m, p) { return Math.abs(p.c - I.cb) < Math.abs(m.c - I.cb) ? p : m; }, pts[0]);
        var curve = pts.filter(function (p) { return p.fP <= I.Pmax + 1e-6; }); curve.unshift({ fP: I.Pmax, fM: curve.length ? interp(curve, I.Pmax) : 0 }); // tope φPn,máx
        function interp(arr, P) { var k; for (k = 0; k < arr.length - 1; k++) { var a = arr[k], c = arr[k + 1]; if ((a.fP - P) * (c.fP - P) <= 0 && a.fP !== c.fP) return a.fM + (c.fM - a.fM) * (P - a.fP) / (c.fP - a.fP); } return 0; }
        var capM = o.Pu > I.Pmax ? 0 : interp(curve.slice(1), Math.min(o.Pu, curve[1] ? curve[1].fP : o.Pu)), ratio = capM > 0 ? o.Mu / capM : Infinity, okc = o.Pu <= I.Pmax && o.Mu <= capM;
        if (o.Pu > I.Pmax) warns.push('Pu = ' + F(o.Pu, 0) + ' kN > φPn,máx = ' + F(I.Pmax, 0) + ' kN: aumente la sección o el acero.'); else if (!okc) warns.push('El punto (Mu, Pu) queda FUERA del diagrama: φMn(Pu) = ' + F(capM, 1) + ' < Mu = ' + F(o.Mu, 1) + ' kN·m.');
        var pmax = Math.max(I.P0 * 0.65, I.Pmax, o.Pu) * 1.05, mmaxv = Math.max.apply(null, curve.map(function (p) { return p.fM; }).concat([o.Mu])) * 1.1;
        memo.push('COLUMNA EN FLEXOCOMPRESION — DIAGRAMA DE INTERACCION SIMPLIFICADO (ACI 318 cap. 22 / NSR-10 C.10, educativo)', 'Unidades: kN, kN·m, mm, MPa.',
            'Datos: b×h = ' + b + '×' + h + ' mm · ' + n + ' Ø#' + o.bar + ' (' + n / 2 + ' por cara en h) · rec = ' + o.rec + ' mm · d′ = ' + F(d1, 0) + ' mm · f′c = ' + o.fc + ' · fy = ' + o.fy + ' MPa · Pu = ' + o.Pu + ' kN · Mu = ' + o.Mu + ' kN·m',
            'Ast = ' + F(Ast, 0) + ' mm² · ρ = Ast/Ag = ' + F(rho * 100, 2) + ' % · P0 = 0.85f′c(Ag − Ast) + fy·Ast = ' + F(I.P0, 0) + ' kN · φPn,máx = 0.80·0.65·P0 = ' + F(I.Pmax, 0) + ' kN',
            'Punto de falla balanceada: cb = 600d/(600 + fy) = ' + F(I.cb, 0) + ' mm → Pb ≈ ' + F(bal.Pn, 0) + ' kN, Mb ≈ ' + F(bal.Mn, 1) + ' kN·m (φPb = ' + F(bal.fP, 0) + ', φMb = ' + F(bal.fM, 1) + ')',
            'Flexión pura (Pn = 0): φMn ≈ ' + F(interp(curve.slice(1), 0), 1) + ' kN·m · tracción pura φPt = ' + F(0.9 * I.Pt, 0) + ' kN',
            'Verificación: con Pu = ' + o.Pu + ' kN, φMn = ' + F(capM, 1) + ' kN·m vs Mu = ' + o.Mu + ' kN·m → relación Mu/φMn = ' + (isFinite(ratio) ? F(ratio, 2) : '—') + ' ⇒ ' + (okc ? 'CUMPLE' : 'NO CUMPLE'),
            'NO verificado: flexión biaxial, esbeltez (momentos de segundo orden), cortante, sismo (diseño por capacidad), empalmes, barras intermedias en las caras laterales.', AVISO);
        // dibujo: diagrama + sección
        var W = 2200, Hd = 2600, sx = W / mmaxv, sy = Hd / pmax, th = 55, D = new Draw(th), ox = 0, oy = 0; function X(m) { return ox + m * sx; } function Y(p) { return oy + p * sy; }
        D.text(0, Hd + th * 7, 'COLUMNA EN FLEXOCOMPRESION CF-1 — DIAGRAMA DE INTERACCION φPn–φMn', { h: th * 1.5 }); D.text(0, Hd + th * 5, 'b×h = ' + b + '×' + h + ' · ' + n + ' Ø#' + o.bar + ' · ρ = ' + F(rho * 100, 2) + ' % · f′c ' + o.fc + ' · fy ' + o.fy + ' MPa', { h: th * 0.9 });
        D.line(X(0), Y(0), X(mmaxv), Y(0), 'EJES'); D.line(X(0), Y(0), X(0), Y(pmax), 'EJES'); D.text(X(mmaxv), Y(0) - th * 2, 'φMn (kN·m)', { ha: 2, h: th }); D.text(X(0) + th, Y(pmax), 'φPn (kN)', { h: th });
        var stepM = Math.pow(10, Math.floor(Math.log10(mmaxv))) , stepP = Math.pow(10, Math.floor(Math.log10(pmax))); for (i = 1; i * stepM < mmaxv; i++) { D.line(X(i * stepM), Y(0), X(i * stepM), Y(0) - th * 0.6, 'EJES'); D.text(X(i * stepM), Y(0) - th * 2, F(i * stepM), { ha: 1, h: th * 0.8 }); D.line(X(i * stepM), Y(0), X(i * stepM), Y(pmax), 'SOMBRA'); } for (i = 1; i * stepP < pmax; i++) { D.line(X(0), Y(i * stepP), X(0) - th * 0.6, Y(i * stepP), 'EJES'); D.text(X(0) - th, Y(i * stepP), F(i * stepP), { ha: 2, va: 2, h: th * 0.8 }); D.line(X(0), Y(i * stepP), X(mmaxv), Y(i * stepP), 'SOMBRA'); }
        var poly = [[X(0), Y(I.Pmax)]].concat(curve.slice(1).map(function (p) { return [X(Math.max(0, p.fM)), Y(p.fP)]; })); D.poly(poly, false, 'ARMADURA', 1); D.line(X(0), Y(I.Pmax), X(curve[1].fM), Y(I.Pmax), 'ARMADURA', 1);
        D.circle(X(bal.fM), Y(bal.fP), th * 0.5, 'ARMADURA', 5); D.text(X(bal.fM) + th, Y(bal.fP), 'balanceado', { h: th * 0.8, aci: 5 }); D.circle(X(o.Mu), Y(o.Pu), th * 0.7, 'COTAS', okc ? 3 : 1); D.text(X(o.Mu) + th, Y(o.Pu) + th, 'Pu, Mu ' + (okc ? 'OK' : 'FUERA'), { h: th * 0.9, aci: okc ? 3 : 1 }); D.text(X(0) + th, Y(I.Pmax) + th * 0.8, 'φPn,máx = ' + F(I.Pmax, 0), { h: th * 0.8 });
        var cx = W + 600, cy = 0; D.section(cx, cy + 400, b, h, o.rec, dest, { n: n / 2, no: o.bar }, { n: n / 2, no: o.bar }, 'SECCION (flexión eje fuerte)'); D.text(cx, cy + 250, n + ' Ø#' + o.bar + ' · estribos Ø#3', { h: th * 0.9 });
        var model = finish(D, 'COLUMNA FLEXOCOMPRESION', null, { noTable: true });
        return { ok: true, warns: warns, memo: memo, model: model, calc: { Pmax: I.Pmax, capM: capM, ratio: ratio, ok: okc, curve: curve } };
    };

    /* ============================================================================
     * 8) MURO DE CONTENCION EN VOLADIZO — completo (Rankine + sobrecarga)
     *    Empuje activo Ka = tan²(45° − φ/2) con relleno horizontal; Pa = ½·Ka·γ·Ht² + Ka·q·Ht.
     *    Se dimensiona automáticamente la base B hasta cumplir FS vuelco ≥ 1.5, FS deslizamiento ≥ 1.5,
     *    resultante en el tercio medio y qmax ≤ qadm (sin empuje pasivo; opcional llave de cortante).
     * ========================================================================== */
    function perM(As) { var no = [5, 6, 7, 8], i; for (i = 0; i < no.length; i++) { var ab = BARS[no[i]][1], sp = fl25(ab * 1000 / As); if (sp >= 100) return { no: no[i], s: Math.min(sp, 450) }; } return { no: 8, s: 100, short: true }; }
    S.muroC = function (o) {
        o = Object.assign({ H: 3, q: 10, gamma: 18, phi: 30, qadm: 150, mu: 0, fc: 21, fy: 420, Df: 0.5 }, o || {});
        var warns = [], memo = [], H0 = o.H, gam = o.gamma, phi = o.phi * PI / 180, Ka = Math.pow(Math.tan(PI / 4 - phi / 2), 2), Kp = 1 / Ka, mu = o.mu > 0 ? o.mu : Math.tan(2 * phi / 3), gc = 24, hz = Math.max(0.30, Math.ceil(H0 / 10 / 0.05) * 0.05), Ht = H0 + hz, tTop = 0.25, tBase = Math.max(0.30, Math.ceil(H0 / 11 / 0.05) * 0.05), res = null, kf, key = 0;
        for (kf = 0.45; kf <= 1.2; kf += 0.025) {
            var B = Math.ceil(kf * Ht / 0.05) * 0.05, toe = Math.max(0.3, Math.ceil(B / 4 / 0.05) * 0.05), heel = B - toe - tBase; if (heel < 0.2) continue;
            var Wst1 = tTop * H0 * gc, Wst2 = 0.5 * (tBase - tTop) * H0 * gc, Wb = B * hz * gc, Ws = heel * H0 * gam, Wq = heel * o.q, Pa1 = 0.5 * Ka * gam * Ht * Ht, Pa2 = Ka * o.q * Ht, Pa = Pa1 + Pa2;
            var x1 = toe + (tBase - tTop) + tTop / 2, x2 = toe + (tBase - tTop) * 2 / 3, xb = B / 2, xs = toe + tBase + heel / 2, xq = xs, Wt = Wst1 + Wst2 + Wb + Ws + Wq, Mr = Wst1 * x1 + Wst2 * x2 + Wb * xb + Ws * xs + Wq * xq, Mo = Pa1 * Ht / 3 + Pa2 * Ht / 2, FSv = Mr / Mo, Fres = mu * Wt, FSd = Fres / Pa;
            key = 0; if (FSd < 1.5) { key = 0.4; var Ep = 0.5 * Kp * gam * Math.pow(o.Df + key, 2) - 0.5 * Kp * gam * o.Df * o.Df; FSd = (Fres + Ep) / Pa; }
            var xbar = (Mr - Mo) / Wt, e = B / 2 - xbar, qmax, qmin, inThird = Math.abs(e) <= B / 6; if (inThird) { qmax = Wt / B * (1 + 6 * Math.abs(e) / B); qmin = Wt / B * (1 - 6 * Math.abs(e) / B); } else { qmax = 2 * Wt / (3 * xbar); qmin = 0; }
            res = { B: B, toe: toe, heel: heel, Wst1: Wst1, Wst2: Wst2, Wb: Wb, Ws: Ws, Wq: Wq, Wt: Wt, Pa1: Pa1, Pa2: Pa2, Pa: Pa, Mr: Mr, Mo: Mo, FSv: FSv, FSd: FSd, key: key, xbar: xbar, e: e, qmax: qmax, qmin: qmin, inThird: inThird, ok: FSv >= 1.5 && FSd >= 1.5 && inThird && qmax <= o.qadm };
            if (res.ok) break;
        }
        if (!res) return fail('No se pudo dimensionar el muro con estos datos.'); if (!res.ok) warns.push('Con la base máxima ensayada NO se cumplen todas las verificaciones: revise datos (φ, qadm, altura) o use contrafuertes / suelo mejorado.');
        if (res.FSv < 1.5) warns.push('FS vuelco = ' + F(res.FSv, 2) + ' < 1.5'); if (res.FSd < 1.5) warns.push('FS deslizamiento = ' + F(res.FSd, 2) + ' < 1.5'); if (!res.inThird) warns.push('La resultante sale del tercio medio (e = ' + F(res.e, 2) + ' m > B/6).'); if (res.qmax > o.qadm) warns.push('qmax = ' + F(res.qmax, 1) + ' kPa > qadm = ' + o.qadm + ' kPa.');
        // armado
        var fc = o.fc, fy = o.fy, Mst = 1.6 * (Ka * gam * H0 * H0 * H0 / 6 + Ka * o.q * H0 * H0 / 2), dS = tBaseMm() - 50 - 8, aS = needAs(Mst, 1000, dS, fc, fy), AsS = Math.max(aS.As, 0.0020 * 1000 * tBaseMm()), sSo = perM(AsS), sS = sSo.s;
        function tBaseMm() { return tBase * 1000; }
        var q1 = res.qmin + (res.qmax - res.qmin) * (res.B - res.toe) / res.B, Mtoe = 1.6 * ((2 * res.qmax + q1) / 6 * res.toe * res.toe) - 1.2 * gc * hz * res.toe * res.toe / 2, dZ = hz * 1000 - 75 - 8, aT = needAs(Math.max(Mtoe, 1), 1000, dZ, fc, fy), AsT = Math.max(aT.As, 0.0018 * 1000 * hz * 1000), sTo = perM(AsT), sT = sTo.s;
        var qb = res.qmax - (res.qmax - res.qmin) * (res.toe + tBase) / res.B, Mheel = Math.max(0.1, (1.2 * (gam * H0 + gc * hz) + 1.6 * o.q) * res.heel * res.heel / 2 - (res.qmin * res.heel * res.heel / 2 + (qb - res.qmin) * res.heel * res.heel / 3)), aH = needAs(Mheel, 1000, dZ, fc, fy), AsH = Math.max(aH.As, 0.0018 * 1000 * hz * 1000), sHo = perM(AsH), sH = sHo.s; if (sSo.short || sTo.short || sHo.short) warns.push('Aun con Ø#8 @ 100 mm el acero no alcanza en alguna sección: aumente espesores.');
        if (!aS.ok || !aT.ok || !aH.ok) warns.push('ρ > ρmáx en alguna sección: aumente espesores.'); var VuS = 1.6 * (Ka * gam * H0 * H0 / 2 + Ka * o.q * H0), phiVc = 0.75 * 0.17 * SQ(fc) * 1000 * dS / 1000 * 1; if (VuS > phiVc) warns.push('Cortante en la base del vástago: Vu = ' + F(VuS, 1) + ' > φVc = ' + F(phiVc, 1) + ' kN/m: aumente el espesor.');
        memo.push('MURO DE CONTENCION EN VOLADIZO — COMPLETO (Rankine, ACI 318 / NSR-10 H.4 educativo)', 'Unidades: kN/m, m, kPa, MPa; análisis por metro de longitud.',
            'Datos: H del vástago = ' + H0 + ' m · γ relleno = ' + gam + ' kN/m³ · φ = ' + o.phi + '° · sobrecarga q = ' + o.q + ' kPa · qadm = ' + o.qadm + ' kPa · f′c = ' + fc + ' · fy = ' + fy + ' MPa · μ = tan(2φ/3) = ' + F(mu, 2),
            'Dimensiones adoptadas: zapata hz = ' + F(hz, 2) + ' · B = ' + F(res.B, 2) + ' m · puntera = ' + F(res.toe, 2) + ' · talón = ' + F(res.heel, 2) + ' · vástago ' + F(tTop, 2) + ' (corona) a ' + F(tBase, 2) + ' m (base)' + (res.key ? ' · llave de cortante ' + res.key + ' m' : ''),
            'Ka = tan²(45° − φ/2) = ' + F(Ka, 3) + ' · Pa = ½·Ka·γ·Ht² + Ka·q·Ht = ' + F(res.Pa1, 1) + ' + ' + F(res.Pa2, 1) + ' = ' + F(res.Pa, 1) + ' kN/m (Ht = H + hz = ' + F(Ht, 2) + ' m)',
            'ΣW = ' + F(res.Wt, 1) + ' kN/m · Mr (estabilizante) = ' + F(res.Mr, 1) + ' · Mo (volcante) = ' + F(res.Mo, 1) + ' kN·m/m',
            'FS vuelco = Mr/Mo = ' + F(res.FSv, 2) + (res.FSv >= 1.5 ? ' ≥ 1.5 OK' : ' < 1.5 NO CUMPLE') + ' · FS deslizamiento = ' + F(res.FSd, 2) + (res.FSd >= 1.5 ? ' ≥ 1.5 OK' : ' < 1.5 NO CUMPLE') + (res.key ? ' (incluye empuje pasivo conservador de la llave)' : ' (sin empuje pasivo)'),
            'Capacidad portante: x̄ = (Mr − Mo)/ΣW = ' + F(res.xbar, 2) + ' m · e = |B/2 − x̄| = ' + F(Math.abs(res.e), 2) + ' m (' + (res.inThird ? '≤ B/6 = ' + F(res.B / 6, 2) + ' OK' : '> B/6') + ') · qmax = ' + F(res.qmax, 1) + ' kPa ' + (res.qmax <= o.qadm ? '≤' : '>') + ' qadm = ' + o.qadm + ' · qmin = ' + F(res.qmin, 1) + ' kPa',
            'Vástago (base): Mu = 1.6·(Ka·γ·H³/6 + Ka·q·H²/2) = ' + F(Mst, 1) + ' kN·m/m → As = ' + F(AsS, 0) + ' mm²/m → Ø#' + sSo.no + ' @ ' + sS + ' mm (cara del relleno) + Ø#4 @ 300 en la cara libre',
            'Puntera: Mu = ' + F(Math.max(Mtoe, 0), 1) + ' kN·m/m → Ø#' + sTo.no + ' @ ' + sT + ' mm (inferior) · Talón: Mu = ' + F(Mheel, 1) + ' kN·m/m (descontando la reacción del suelo bajo el talón con factor 1.0) → Ø#' + sHo.no + ' @ ' + sH + ' mm (superior)',
            'NO verificado: estabilidad global del talud, empuje sísmico (Mononobe–Okabe), drenaje (subpresión), asentamientos, cortante de la zapata, desarrollo del acero.', AVISO);
        // dibujo (mm)
        var th = Math.max(35, Ht * 1000 * 0.025), D = new Draw(th), Bm = res.B * 1000, hzm = hz * 1000, Hm = H0 * 1000, tm = tTop * 1000, tb = tBase * 1000, tom = res.toe * 1000, hem = res.heel * 1000, xs0 = tom, sx0 = tom, i;
        D.text(0, Ht * 1000 + th * 8, 'MURO DE CONTENCION MC-1 EN VOLADIZO — SECCION Y ARMADO (mm)', { h: th * 1.5 }); D.text(0, Ht * 1000 + th * 6, 'H = ' + F(Hm) + ' · B = ' + F(Bm) + ' · FS vuelco ' + F(res.FSv, 2) + ' · FS desliz. ' + F(res.FSd, 2) + ' · qmax ' + F(res.qmax, 0) + ' kPa', { h: th * 0.9 });
        var outl = [[0, 0], [Bm, 0], [Bm, hzm], [tom + tb, hzm], [tom + tb - (tb - tm), hzm + Hm], [tom, hzm + Hm], [tom, hzm], [0, hzm]]; D.poly(outl, true, 'CONTORNO'); if (res.key) D.rect(tom + tb / 2 - 150, -res.key * 1000, 300, res.key * 1000, 'CONTORNO'); D.hatch(tom + tb, hzm, hem, Hm, th * 3);
        D.line(tom + tb, hzm + Hm, Bm, hzm + Hm, 'SOMBRA'); D.line(Bm, hzm, Bm, hzm + Hm, 'SOMBRA'); D.text(Bm - th, hzm + Hm + th, 'relleno + sobrecarga q = ' + o.q + ' kPa', { ha: 2, h: th * 0.9 });
        var rv = 40 + 8; D.line(tom + tb - rv, hzm + 60, tom + tb - (tb - tm) + rv - 0, hzm + Hm - 60, 'ARMADURA'); D.text(tom + tb + th, hzm + Hm * 0.55, 'Ø#' + sSo.no + ' @ ' + sS + ' (vástago, cara relleno)', { h: th * 0.9 }); D.line(tom + 30, hzm + 60, tom + 30, hzm + Hm - 60, 'ARMADURA', 5); D.text(tom - th, hzm + Hm * 0.45, 'Ø#4 @ 300 (cara libre)', { ha: 2, h: th * 0.9, aci: 5 });
        D.line(60, 75 + 8, Bm - 60, 75 + 8, 'ARMADURA'); D.text(Bm / 2, 75 + th * 1.5, 'Ø#' + sTo.no + ' @ ' + sT + ' (puntera) / Ø#' + sHo.no + ' @ ' + sH + ' (talón) abajo', { ha: 1, h: th * 0.9 }); D.line(tom + tb, hzm - 75 - 8, Bm - 60, hzm - 75 - 8, 'ARMADURA', 5); D.text(Bm - th, hzm - 75 - th * 2, 'Ø#' + sHo.no + ' @ ' + sH + ' (talón, sup.)', { ha: 2, h: th * 0.9, aci: 5 });
        D.dim(0, 0, Bm, 0, -th * 3 - (res.key ? res.key * 1000 : 0), 'B = ' + F(Bm)); D.dim(0, 0, tom, 0, -th * 1.6 - (res.key ? res.key * 1000 : 0), F(tom)); D.dim(tom, 0, tom + tb, 0, th * 0, ''); D.dim(Bm, 0, Bm, hzm, th * 3, 'hz = ' + F(hzm)); D.dim(Bm, hzm, Bm, hzm + Hm, th * 3, 'H = ' + F(Hm)); D.dim(tom, hzm + Hm, tom + tm, hzm + Hm, th * 2, 'a = ' + F(tm));
        var px = -th * 20, pq = res.qmax / 1; var sc = Math.min(1500, Bm) / Math.max(res.qmax, 1) * 0.6; D.text(Bm / 2, -th * 7 - (res.key ? res.key * 1000 : 0), 'PRESIONES SOBRE EL SUELO', { ha: 1, h: th * 0.9 }); var yb2 = -th * 8 - (res.key ? res.key * 1000 : 0); D.poly([[0, yb2], [Bm, yb2], [Bm, yb2 - res.qmin * sc], [0, yb2 - res.qmax * sc]], true, 'ARMADURA', 3); D.text(0, yb2 - res.qmax * sc - th, 'qmax = ' + F(res.qmax, 1) + ' kPa', { h: th * 0.8 }); D.text(Bm, yb2 - res.qmin * sc - th, 'qmin = ' + F(res.qmin, 1), { ha: 2, h: th * 0.8 });
        D.line(-th * 4, hzm + Ht * 1000 / 3 - hzm / 3, -th * 0.5, hzm + Ht * 1000 / 3 - hzm / 3, 'COTAS'); D.text(-th * 4.5, hzm + Ht * 1000 / 3 - hzm / 3, 'Pa = ' + F(res.Pa, 1) + ' kN/m', { ha: 2, h: th * 0.8 });
        var Lstem = Hm + hzm + 400, rows = [bomRow('Vástago (por m)', 1, sSo.no, Math.round(1000 / sS), Lstem), bomRow('Cara libre (por m)', 2, 4, Math.round(1000 / 300), Hm), bomRow('Base inf. (por m)', 3, sTo.no, Math.round(1000 / sT), Bm - 100), bomRow('Talón sup. (por m)', 4, sHo.no, Math.round(1000 / sH), hem + 600)], bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'MURO DE CONTENCION', bom), bom: bom, calc: res };
    };

    /* ============================================================================
     * 9) LOSA NERVADA / ALIGERADA EN UNA DIRECCION — nervios T, ábaco macizo en apoyos
     *    Peralte mínimo ACI 318 Tabla 7.3.1.1 (L/16, L/18.5, L/21 según continuidad); coeficientes aproximados
     *    ACI §6.5 para momentos; nervio como viga T (be = separación entre ejes de nervios); Vc × 1.1 (ACI 9.8).
     * ========================================================================== */
    S.losaNerv = function (o) {
        o = Object.assign({ L: 6, Ly: 5, apoyo: 0, bw: 120, s: 800, hf: 50, wL: 2, acab: 1.5, fc: 21, fy: 420 }, o || {});
        var warns = [], memo = [], fc = o.fc, fy = o.fy, L = o.L, den = o.apoyo === 2 ? 21 : (o.apoyo === 1 ? 18.5 : 16), hmin = L * 1000 / den, h = Math.max(Math.ceil(hmin / 50) * 50, o.hf + 100), bw = o.bw, s = o.s, hf = o.hf, rec = 25;
        if (bw < 100) warns.push('bw < 100 mm: ancho mínimo de nervio ACI 9.8.1.2.'); if (s - bw > 750) warns.push('Separación libre entre nervios > 750 mm (ACI 9.8.1.3): reduzca s.'); if (h > 3.5 * bw) warns.push('h > 3.5·bw: viga de nervio esbelta (ACI 9.8.1.4).'); if (hf < 50) warns.push('Espesor de loseta < 50 mm (mínimo ACI 9.8.1.6: 50 mm o 1/12 de la luz libre entre nervios).');
        var ws = 24 * (hf + bw * (h - hf) / s) / 1000, wu = 1.2 * (ws + o.acab) + 1.6 * o.wL, wr = wu * s / 1000, cp = o.apoyo === 0 ? 8 : (o.apoyo === 1 ? 11 : 16), cn = o.apoyo === 0 ? 0 : (o.apoyo === 1 ? 10 : 11), Mp = wr * L * L / cp, Mn = cn ? wr * L * L / cn : 0, Vu0 = wr * L / 2 * (o.apoyo ? 1.15 : 1);
        var d = h - rec - 6.35 - BARS[3][0] / 2 - 2, be = s, a1 = needAs(Mp, be, d, fc, fy), a = a1.Areq * fy / (0.85 * fc * be), As, mode, Amin = Math.max(0.25 * SQ(fc) / fy, 1.4 / fy) * bw * d;
        if (a <= hf) { As = a1.Areq; mode = 'a = ' + F(a, 0) + ' mm ≤ hf → comportamiento rectangular'; } else { var Asf = 0.85 * fc * (be - bw) * hf / fy, Mnf = 0.9 * Asf * fy * (d - hf / 2) / 1e6, aw = needAs(Mp - Mnf, bw, d, fc, fy); As = Asf + aw.Areq; mode = 'T real: Asf = ' + F(Asf, 0) + ' mm²'; if (!aw.ok) warns.push('El nervio no resiste el momento: aumente h o bw.'); }
        As = Math.max(As, Amin); var bp = pickBarsRib(As), aN = Mn ? needAs(Mn, bw, d, fc, fy) : null, bn = aN ? pickBarsRib(Math.max(aN.Areq, Amin)) : null, Vc = 1.1 * 0.17 * SQ(fc) * bw * d / 1000, phiVc = 0.75 * Vc; if (Vu0 - wr * d / 1000 > phiVc) warns.push('Cortante en el nervio: Vu = ' + F(Vu0 - wr * d / 1000, 1) + ' > φVc = ' + F(phiVc, 1) + ' kN: aumente bw o h, o use macizo/ábaco más largo.'); if (aN && !aN.ok) warns.push('M⁻ en nervio excede ρmáx: aumente h o bw.');
        function pickBarsRib(Ar) { var no = [4, 5, 6, 7], i; for (i = 0; i < no.length; i++) { var ab = BARS[no[i]][1], n = Math.max(1, Math.ceil(Ar / ab)); if (n <= 2) return { no: no[i], n: n }; } return { no: 7, n: Math.ceil(Ar / BARS[7][1]) }; }
        var Lab = Math.max(600, Math.ceil(0.1 * L * 1000 / 50) * 50), lcl = s - bw, pesoLosa = ws;
        memo.push('LOSA NERVADA / ALIGERADA EN UNA DIRECCION — PREDIMENSIONAMIENTO (ACI 318 §9.8, §6.5 / NSR-10 C.8.13, educativo)', 'Unidades: kN, m, MPa; secciones en mm.',
            'Datos: luz L = ' + L + ' m · ancho del paño Ly = ' + o.Ly + ' m · continuidad: ' + (['ambos extremos discontinuos', 'un extremo continuo', 'ambos extremos continuos'][o.apoyo] || '') + ' · nervio bw = ' + bw + ' mm · separación entre ejes s = ' + s + ' mm · loseta hf = ' + hf + ' mm · wL = ' + o.wL + ' kN/m² · acabados = ' + o.acab + ' kN/m² · f′c = ' + fc + ' · fy = ' + fy,
            'Peralte mínimo: h ≥ L/' + den + ' = ' + F(hmin, 0) + ' mm → h = ' + h + ' mm (d = ' + F(d, 0) + ' mm)', 'Peso propio = 24·[hf + bw(h − hf)/s] = ' + F(ws, 2) + ' kN/m² (sin aligerante pesado) → wu = 1.2(' + F(ws, 2) + ' + ' + o.acab + ') + 1.6·' + o.wL + ' = ' + F(wu, 2) + ' kN/m² → por nervio: wr = wu·s = ' + F(wr, 2) + ' kN/m',
            'Mu⁺ = wr·L²/' + cp + ' = ' + F(Mp, 2) + ' kN·m por nervio · ' + mode + ' → As = ' + F(As, 0) + ' mm² (mín. ' + F(Amin, 0) + ') → ' + bp.n + ' Ø#' + bp.no + ' por nervio' + (bn ? ' · Mu⁻ = wr·L²/' + cn + ' = ' + F(Mn, 2) + ' kN·m → ' + bn.n + ' Ø#' + bn.no + ' superiores en apoyo' : ''),
            'Cortante: Vu(d) = ' + F(Vu0 - wr * d / 1000, 1) + ' kN · φVc (×1.1 por nervios) = ' + F(phiVc, 1) + ' kN → sin estribos si Vu ≤ φVc; si no, macizar (ábaco) o añadir estribos Ø#3',
            'Ábaco (zona maciza junto a apoyos): longitud ≈ max(0.60 m, 0.10·L) = ' + Lab + ' mm a cada lado, para cortante y aplastamiento de casetones.', 'Acero de retracción en la loseta: malla 0.0018·b·hf = ' + F(0.0018 * 1000 * hf, 0) + ' mm²/m (p. ej. Ø#2 @ 250 en ambos sentidos, ver electromalla).',
            'NO verificado: vibraciones, deflexión a largo plazo, nervios transversales de reparto, cargas concentradas, sismo.', AVISO);
        var Lm = L * 1000, Wp = o.Ly * 1000, thh = Math.max(40, Lm * 0.012), D = new Draw(thh), nr = Math.floor(Wp / s) + 1, i;
        D.text(0, Wp + thh * 6, 'LOSA NERVADA LN-1 — PLANTA Y SECCION DEL NERVIO (mm)', { h: thh * 1.5 }); D.text(0, Wp + thh * 4, 'h = ' + h + ' · bw = ' + bw + ' · s = ' + s + ' · hf = ' + hf + ' · f′c ' + fc + ' · fy ' + fy + ' MPa', { h: thh * 0.9 });
        D.rect(0, 0, Lm, Wp, 'CONTORNO'); D.rect(0, 0, Lab, Wp, 'SOMBRA'); D.rect(Lm - Lab, 0, Lab, Wp, 'SOMBRA'); D.hatch(0, 0, Lab, Wp, thh * 2.5); D.hatch(Lm - Lab, 0, Lab, Wp, thh * 2.5);
        for (i = 0; i < nr; i++) { var y = Math.min(Wp - bw / 2, bw / 2 + i * s); D.rect(Lab, y - bw / 2, Lm - 2 * Lab, bw, 'CONTORNO'); D.line(Lab, y, Lm - Lab, y, 'ARMADURA'); }
        D.text(Lm / 2, Wp / 2, 'nervios ' + bw + ' mm c/ ' + s + ' mm\n(' + nr + ' nervios en ' + o.Ly + ' m)', { ha: 1, va: 2, h: thh * 1.1 }); D.text(Lab / 2, Wp / 2, 'ABACO', { ha: 1, va: 2, h: thh, rot: PI / 2 }); D.dim(0, 0, Lm, 0, -thh * 2.5, 'L = ' + F(Lm)); D.dim(0, 0, 0, Wp, -thh * 2.5, 'Ly = ' + F(Wp)); D.dim(0, Wp, Lab, Wp, thh * 2, F(Lab));
        var cx = Lm + 1800, cy = 0, sc = 1; D.text(cx, cy + h + thh * 5, 'SECCION T DEL NERVIO', { h: thh * 1.1 }); D.rect(cx, cy + h - hf, s, hf, 'CONTORNO'); D.rect(cx + (s - bw) / 2, cy, bw, h - hf, 'CONTORNO'); D.rect(cx + (s - bw) / 2 + rec, cy + rec, bw - 2 * rec, h - 2 * rec, 'ARMADURA', 3);
        for (i = 0; i < bp.n; i++) D.circle(cx + s / 2 + (i - (bp.n - 1) / 2) * 40, cy + rec + 6.35 + 3, BARS[bp.no][0] / 2, 'ARMADURA'); D.dim(cx, cy + h, cx + s, cy + h, thh * 1.8, 's = ' + s); D.dim(cx + (s - bw) / 2, cy, cx + (s + bw) / 2, cy, -thh * 1.8, 'bw = ' + bw); D.dim(cx + s, cy, cx + s, cy + h, thh * 1.8, 'h = ' + h); D.dim(cx + s + thh * 5, cy + h - hf, cx + s + thh * 5, cy + h, thh * 1.8, 'hf = ' + hf); D.text(cx + s / 2, cy - thh * 6, bp.n + ' Ø#' + bp.no + ' inf. por nervio', { ha: 1, h: thh * 0.9 });
        var rows = [bomRow('Inferior por nervio', 1, bp.no, nr * bp.n, Lm + 300)]; if (bn) rows.push(bomRow('Superior en apoyos', 2, bn.no, nr * bn.n * (o.apoyo === 2 ? 2 : 1), 0.33 * Lm + 600)); var bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'LOSA NERVADA', bom), bom: bom, calc: { h: h, wu: wu, Mp: Mp, Mn: Mn, As: As, ws: pesoLosa } };
    };

    /* ============================================================================
     * 10) Entrega: lámina con rótulo y memoria en PDF
     * ========================================================================== */
    S.lamina = function (r, o) { // devuelve un modelo con rótulo (si no lo tiene) listo para CAD.exportRaster(model,'pdf',nombre)
        o = o || {}; var m = r.model; if (!m) return null; if (m.__tb) return m; var c = { ents: m.ents.slice(), layers: Object.assign({}, m.layers), warn: [], units: m.units || 4, blocks: {} }; c.bbox = CAD.bboxOf(c.ents);
        var bb = c.bbox, span = Math.max(bb[2] - bb[0], bb[3] - bb[1]); if (CAD.addTitleBlock) { CAD.addTitleBlock(c, { proyecto: 'GeoMetrics · Universidad de Pamplona · Ing. Civil', contenido: o.titulo || 'ELEMENTO ESTRUCTURAL', autor: o.autor != null ? o.autor : H.userName(), escala: H.niceScale(span) + ' (en hoja A3)', hoja: '1/1' }); c.ents.forEach(function (e) { if (e.layer === 'CAJETIN') e.layer = 'MARCO'; }); c.layers.MARCO = c.layers.MARCO || { name: 'MARCO', aci: 7 }; delete c.layers.CAJETIN; c.bbox = CAD.bboxOf(c.ents); } c.__tb = true; return c;
    };
    S.memoPDF = function (lines, titulo) { // PDF de texto (Helvetica, WinAnsi), varias páginas A4
        var W = 595, Hh = 842, ml = 50, top = 790, lead = 12.5, maxc = 98, pages = [], cur = [], y = top, out = [];
        function wrap(s) { var res = [], w = String(s).split(' '), line = ''; w.forEach(function (t) { if ((line + ' ' + t).length > maxc) { res.push(line); line = '    ' + t; } else line = line ? line + ' ' + t : t; }); res.push(line); return res; }
        function esc(s) { var o = ''; for (var i = 0; i < s.length; i++) { var c = s.charCodeAt(i); if (c === 40 || c === 41 || c === 92) o += '\\' + s[i]; else if (c < 32) o += ' '; else if (c <= 255) o += s[i]; else if (c === 0x2192) o += '->'; else if (c === 0x2264) o += '<='; else if (c === 0x2265) o += '>='; else if (c === 0x2248) o += '~'; else if (c === 0x2212) o += '-'; else if (c === 0x03C6 || c === 0x00F8) o += 'phi'; else if (c === 0x2032 || c === 0x2019) o += "'"; else if (c === 0x2013 || c === 0x2014) o += '-'; else if (c === 0x2074 || c === 0x00B2 || c === 0x00B3) o += s[i]; else if (c === 0x2070 || c === 0x2071) o += ''; else if (c === 0x03A3) o += 'Sum'; else o += '?'; } return o; }
        var all = [titulo || 'MEMORIA DE CALCULO', 'GeoMetrics - Universidad de Pamplona - Ingenieria Civil  |  ' + new Date().toISOString().slice(0, 10) + (H.userName() ? '  |  ' + H.userName() : ''), ''].concat(lines.reduce(function (a, l) { return a.concat(wrap(l), ['']); }, []));
        all.forEach(function (l, i) { if (y < 50) { pages.push(cur); cur = []; y = top; } cur.push('BT /F' + (i === 0 ? '2 13' : '1 9.5') + ' Tf ' + ml + ' ' + y + ' Td (' + esc(l) + ') Tj ET'); y -= i === 0 ? 18 : lead; }); pages.push(cur);
        var objs = [], n = 2 + pages.length * 2 + 2; objs[1] = '<< /Type /Catalog /Pages 2 0 R >>'; var kids = pages.map(function (p, i) { return (3 + i * 2) + ' 0 R'; }).join(' '); objs[2] = '<< /Type /Pages /Kids [' + kids + '] /Count ' + pages.length + ' >>';
        pages.forEach(function (p, i) { var st = p.join('\n'); objs[3 + i * 2] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + W + ' ' + Hh + '] /Resources << /Font << /F1 ' + (n - 1) + ' 0 R /F2 ' + n + ' 0 R >> >> /Contents ' + (4 + i * 2) + ' 0 R >>'; objs[4 + i * 2] = '<< /Length ' + st.length + ' >>\nstream\n' + st + '\nendstream'; });
        objs[n - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>'; objs[n] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
        var txt = '%PDF-1.4\n', offs = [], i; for (i = 1; i <= n; i++) { offs[i] = txt.length; txt += i + ' 0 obj\n' + objs[i] + '\nendobj\n'; } var xr = txt.length; txt += 'xref\n0 ' + (n + 1) + '\n0000000000 65535 f \n'; for (i = 1; i <= n; i++) txt += ('0000000000' + offs[i]).slice(-10) + ' 00000 n \n'; txt += 'trailer\n<< /Size ' + (n + 1) + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF\n';
        var bytes = new Uint8Array(txt.length); for (i = 0; i < txt.length; i++) bytes[i] = txt.charCodeAt(i) & 255; return new Blob([bytes], { type: 'application/pdf' });
    };
})(typeof window !== 'undefined' ? window : globalThis);
