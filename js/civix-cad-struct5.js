/**
 * Civix CAD — Diseño estructural académico, bloque P2:
 *   pilote (grupo de 2 ó 4 pilotes + dado) · muroCorte (muro estructural / de corte)
 *   cerchaPH (cerchas Pratt y Howe, método de los nudos) · aceroViga · aceroColumna (perfiles W de tabla reducida)
 *   combinaciones (combinaciones de carga LRFD tipo NSR-10 B.2.4)
 *
 * EDUCATIVO: predimensionamiento y croquis. NO sustituye el diseño completo firmado por un ingeniero.
 * Unidades: kN, m, MPa; secciones en mm; dibujo en mm. Capas: EJES, CONTORNO, ARMADURA, COTAS, TEXTO, MARCO, SOMBRA, ACERO.
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || !CAD.struct || !CAD.struct._h || CAD.struct.__v5) return; var S = CAD.struct; S.__v5 = true; var H = S._h;
    var PI = Math.PI, SQ = Math.sqrt, BARS = H.BARS, F = H.F, Draw = H.Draw, needAs = H.needAs, pickRow = H.pickRow, pickBars = H.pickBars, bomRow = H.bomRow, BOMH = H.BOMH, finish = H.finish, fail = H.fail, AVISO = H.AVISO, fl25 = H.fl25;
    function mkDraw(th) { var D = new Draw(th); D.layers.ACERO = { name: 'ACERO', aci: 5 }; return D; }

    /* ============================================================================
     * 11) PILOTES + DADO — capacidad estática simplificada
     *    Cohesivo (método α): Qs = α·cu·π·D·L ; Qp = 9·cu·Ap.   Granular: Qs = Ks·tanδ·σ'v,med·π·D·L (Ks = 1, δ = 0.75φ);
     *    Qp = Nq·σ'v,punta·Ap (Nq de Meyerhof, σ'v limitado a 15D, qp ≤ 10 MPa).   Qadm = Qu/2.5.   Grupo: Converse–Labarre.
     * ========================================================================== */
    S.pilote = function (o) {
        o = Object.assign({ P: 1200, c: 400, D: 400, L: 12, suelo: 1, cu: 50, phi: 32, gamma: 10, n: 4, sD: 3, fc: 21, fy: 420 }, o || {});
        var warns = [], memo = [], D_ = o.D / 1000, L = o.L, Ap = PI * D_ * D_ / 4, Qs, Qp, memS, fc = o.fc, fy = o.fy, n = o.n === 2 ? 2 : 4;
        if (o.suelo === 1) { var al = o.cu <= 25 ? 1 : (o.cu >= 70 ? 0.5 : 1 - 0.5 * (o.cu - 25) / 45); Qs = al * o.cu * PI * D_ * L; Qp = 9 * o.cu * Ap; memS = 'Suelo cohesivo (método α): α = ' + F(al, 2) + ' (cu = ' + o.cu + ' kPa) → Qs = α·cu·π·D·L = ' + F(Qs, 0) + ' kN · Qp = 9·cu·Ap = ' + F(Qp, 0) + ' kN'; }
        else { var ph = o.phi * PI / 180, sm = o.gamma * Math.min(L / 2, 15 * D_), st = o.gamma * Math.min(L, 15 * D_), Nq = Math.exp(PI * Math.tan(ph)) * Math.pow(Math.tan(PI / 4 + ph / 2), 2), qp = Math.min(Nq * st, 10000); Qs = 1.0 * Math.tan(0.75 * ph) * sm * PI * D_ * L; Qp = qp * Ap; memS = 'Suelo granular: σ′v,med = ' + F(sm, 0) + ' kPa · Qs = Ks·tan(0.75φ)·σ′v,med·π·D·L = ' + F(Qs, 0) + ' kN · Nq = ' + F(Nq, 1) + ' → qp = ' + F(qp, 0) + ' kPa → Qp = ' + F(Qp, 0) + ' kN (σ′v ≤ 15D)'; }
        var Qu = Qs + Qp, Qad = Qu / 2.5, s = o.sD * D_, theta = Math.atan(D_ / s) * 180 / PI, m = 2, nn = n === 4 ? 2 : 1, Eg = o.sD >= 3 ? 1 : 1 - theta * ((m - 1) * nn + (nn - 1) * m) / (90 * m * nn);
        if (o.sD < 2.5) warns.push('Separación s < 2.5D: mínimo recomendado 2.5D–3D.'); var edge = D_ * 1000 / 2 + 150, Lc = s * 1000 + 2 * edge, Wc = n === 4 ? Lc : D_ * 1000 + 300, Wcap = Lc / 1000 * Wc / 1000 * 0.9 * 24;
        var Qg = Eg * n * Qad, Ptot = o.P + Wcap, Rs = Ptot / n; if (Ptot > Qg) warns.push('P + peso del dado = ' + F(Ptot, 0) + ' kN > capacidad admisible del grupo ' + F(Qg, 0) + ' kN: aumente L, D o el número de pilotes.');
        // dado
        var Pu = 1.4 * o.P, Ru = Pu / n, h, d, ok = false, Vp, phiP, Vsh, phiV1, arm = s / 2 - o.c / 2000, nout;
        for (h = 600; h <= 1800; h += 50) { d = h - 75 - 10; var bo = 4 * (o.c + d); Vp = Pu; phiP = 0.75 * 0.33 * SQ(fc) * bo * d / 1000; nout = (s * 500 > o.c / 2 + d) ? (n === 4 ? 2 : 1) : 0; Vsh = nout * Ru; phiV1 = 0.75 * 0.17 * SQ(fc) * Wc * d / 1000; if (Vp <= phiP && Vsh <= phiV1) { ok = true; break; } }
        if (!ok) { warns.push('No cumple punzonamiento / cortante con h ≤ 1800 mm.'); h = 1800; d = h - 85; }
        var Mu = (n === 4 ? 2 : 1) * Ru * arm, a = needAs(Mu, Wc, d, fc, fy), Asm = 0.0018 * Wc * h, rw = pickRow(Math.max(a.As, Asm), Wc, h, 75); if (!a.ok) warns.push('ρ > ρmáx en el dado: aumente h.'); if (arm <= 0) warns.push('La columna es más ancha que la separación entre pilotes: aumente s.');
        memo.push('PILOTES Y DADO DE CIMENTACION (grupo de ' + n + ') — PREDIMENSIONAMIENTO (educativo)', 'Unidades: kN, m, kPa, MPa; dado en mm.',
            'Datos: P (servicio) = ' + o.P + ' kN · columna ' + o.c + ' mm · pilote Ø' + o.D + ' mm, L = ' + L + ' m · separación s = ' + o.sD + 'D = ' + F(s * 1000, 0) + ' mm · f′c = ' + fc + ' · fy = ' + fy + ' MPa', memS,
            'Capacidad última individual Qu = Qs + Qp = ' + F(Qu, 0) + ' kN → Qadm = Qu/2.5 = ' + F(Qad, 0) + ' kN', 'Eficiencia del grupo (Converse–Labarre): θ = atan(D/s) = ' + F(theta, 1) + '° → Eg = ' + F(Eg, 3) + ' → Qadm,grupo = Eg·n·Qadm = ' + F(Qg, 0) + ' kN',
            'Carga sobre el grupo: P + peso del dado (' + F(Wcap, 0) + ' kN) = ' + F(Ptot, 0) + ' kN → por pilote ' + F(Rs, 0) + ' kN ' + (Ptot <= Qg ? '≤ OK' : '> NO CUMPLE'),
            'Dado: ' + F(Lc, 0) + ' × ' + F(Wc, 0) + ' mm, h = ' + h + ' mm (d = ' + F(d, 0) + ') · punzonamiento de la columna: Vu = ' + F(Vp, 0) + ' ≤ φVc = ' + F(phiP, 0) + ' kN · cortante 1 dir.: Vu = ' + F(Vsh, 0) + ' ≤ φVc = ' + F(phiV1, 0) + ' kN',
            'Flexión (cara de la columna): Ru = 1.4P/n = ' + F(Ru, 0) + ' kN por pilote · Mu = ' + F(Mu, 1) + ' kN·m → As = ' + F(Math.max(a.As, Asm), 0) + ' mm² → ' + rw.n + ' Ø#' + rw.no + ' @ ' + F(rw.s, 0) + ' mm' + (n === 4 ? ' en cada sentido (parrilla)' : ' en el sentido de los pilotes + malla mínima transversal'),
            'NO verificado: efecto de carga lateral/momento, asentamiento del grupo, fricción negativa, capacidad estructural del pilote (acero longitudinal), método de bielas y tirantes, pandeo en suelos blandos, pruebas de carga (indispensables en obra).', AVISO);
        var th = Math.max(40, Lc * 0.02), Dr = mkDraw(th), px = [], py = []; if (n === 4) { px = [edge, edge + s * 1000, edge, edge + s * 1000]; py = [edge, edge, edge + s * 1000, edge + s * 1000]; } else { px = [edge, edge + s * 1000]; py = [Wc / 2, Wc / 2]; }
        Dr.text(0, Wc + th * 6, 'DADO SOBRE ' + n + ' PILOTES DP-1 — PLANTA Y ELEVACION (mm)', { h: th * 1.5 }); Dr.text(0, Wc + th * 4, 'Pilote Ø' + o.D + ' L = ' + L + ' m · s = ' + F(s * 1000) + ' · dado h = ' + h + ' · f′c ' + fc + ' · fy ' + fy + ' MPa', { h: th * 0.9 });
        Dr.rect(0, 0, Lc, Wc, 'CONTORNO'); Dr.rect(Lc / 2 - o.c / 2, Wc / 2 - o.c / 2, o.c, o.c, 'CONTORNO'); Dr.hatch(Lc / 2 - o.c / 2, Wc / 2 - o.c / 2, o.c, o.c, th * 2); px.forEach(function (x, i) { Dr.circle(x, py[i], o.D / 2, 'CONTORNO'); Dr.circle(x, py[i], o.D / 2 * 0.85, 'SOMBRA'); }); Dr.line(Lc / 2, -th * 2, Lc / 2, Wc + th * 2, 'EJES'); Dr.line(-th * 2, Wc / 2, Lc + th * 2, Wc / 2, 'EJES'); var i;
        for (i = 0; i < rw.n; i++) { var yy = 75 + (Wc - 150) * i / (rw.n - 1); Dr.line(75, yy, Lc - 75, yy, 'ARMADURA'); } if (n === 4) for (i = 0; i < rw.n; i++) { var xx = 75 + (Lc - 150) * i / (rw.n - 1); Dr.line(xx, 75, xx, Wc - 75, 'ARMADURA', 5); }
        Dr.dim(0, 0, Lc, 0, -th * 2.5, 'L = ' + F(Lc)); Dr.dim(0, 0, 0, Wc, -th * 2.5, 'B = ' + F(Wc)); Dr.dim(px[0], py[0] - o.D / 2 - 60, px[1], py[0] - o.D / 2 - 60, -th * 0.8, 's = ' + F(s * 1000));
        var ey = -th * 12, Lp = Math.min(L * 1000, Lc * 2.2), sc = 1; Dr.text(0, ey + h + th * 4, 'ELEVACION', { h: th * 1.1 }); Dr.rect(0, ey - 0, Lc, h, 'CONTORNO'); Dr.rect(Lc / 2 - o.c / 2, ey + h, o.c, h * 0.9, 'CONTORNO'); var xs = n === 4 ? [px[0], px[1]] : px;
        xs.forEach(function (x) { Dr.rect(x - o.D / 2, ey - Lp, o.D, Lp, 'CONTORNO'); Dr.line(x - o.D / 2 + 50, ey - Lp + 50, x - o.D / 2 + 50, ey + 75, 'ARMADURA'); Dr.line(x + o.D / 2 - 50, ey - Lp + 50, x + o.D / 2 - 50, ey + 75, 'ARMADURA'); }); Dr.line(75, ey + 75 + 8, Lc - 75, ey + 75 + 8, 'ARMADURA'); Dr.text(Lc / 2, ey + 75 + th * 1.5, rw.n + ' Ø#' + rw.no + ' @ ' + F(rw.s), { ha: 1, h: th * 0.9 });
        if (o.L * 1000 > Lp) { Dr.text(Lc / 2, ey - Lp - th * 2, '(longitud del pilote L = ' + L + ' m dibujada recortada)', { ha: 1, h: th * 0.8 }); } Dr.dim(Lc, ey, Lc, ey + h, th * 2.2, 'h = ' + h); Dr.dim(xs[0] - o.D / 2, ey - Lp, xs[0] + o.D / 2, ey - Lp, -th * 1.6, 'Ø' + o.D);
        var rows = [bomRow('Dado, sentido 1', 1, rw.no, rw.n, Lc - 150 + 2 * 250)]; if (n === 4) rows.push(bomRow('Dado, sentido 2', 2, rw.no, rw.n, Wc - 150 + 2 * 250)); else rows.push(bomRow('Transv. mínima', 2, 4, Math.ceil(Lc / 300), Wc - 150 + 200)); var bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(Dr, 'DADO Y PILOTES', bom), bom: bom, calc: { Qu: Qu, Qad: Qad, Eg: Eg, Qg: Qg, h: h } };
    };

    /* ============================================================================
     * 12) MURO ESTRUCTURAL / DE CORTE — espesor mínimo, refuerzo por cortante y elementos de borde
     *     (ACI 318 cap. 11 y 18 simplificados / NSR-10 C.11.9, C.14, C.21 educativo; NO es diseño sismo-resistente especial)
     * ========================================================================== */
    S.muroCorte = function (o) {
        o = Object.assign({ Lw: 4, hw: 9, tw: 200, Vu: 600, Mu: 3500, Pu: 1500, fc: 28, fy: 420 }, o || {});
        var warns = [], memo = [], Lw = o.Lw * 1000, hw = o.hw * 1000, tw = o.tw, fc = o.fc, fy = o.fy, d = 0.8 * Lw, twmin = Math.max(100, Math.min(hw, Lw) / 25), twsis = Math.max(150, Math.min(hw, Lw) / 20);
        if (tw < twmin) warns.push('tw = ' + tw + ' mm < espesor mínimo ' + F(twmin, 0) + ' mm (NSR-10 C.14.5.3.1).'); if (tw < 150) warns.push('Para muros sismo-resistentes se recomienda tw ≥ 150 mm (hasta ' + F(twsis, 0) + ' mm según esbeltez).');
        var Vc = 0.17 * SQ(fc) * tw * d / 1000, VnMax = 0.83 * SQ(fc) * tw * d / 1000, phiVnMax = 0.75 * VnMax, Vs = Math.max(0, o.Vu / 0.75 - Vc); if (o.Vu > phiVnMax) warns.push('Vu = ' + F(o.Vu, 0) + ' > φ·0.83√f′c·tw·d = ' + F(phiVnMax, 0) + ' kN: aumente tw o Lw.');
        var rt = Math.max(0.0025, Vs * 1000 / (fy * tw * d)), hwl = hw / Lw, rl = Math.max(0.0025, hwl <= 2.5 ? 0.0025 + 0.5 * (2.5 - hwl) * (rt - 0.0025) : 0.0025), curt = tw >= 200 || o.Vu > 0.17 * SQ(fc) * tw * Lw / 1000 ? 2 : 1, sMax = Math.min(Lw / 5, 3 * tw, 450);
        function sp(r, no) { var ab = BARS[no][1] * curt; return Math.max(75, Math.min(fl25(ab * 1000 / (r * tw)), fl25(sMax))); } var no_ = 4, sh = sp(rt, 4), sv = sp(rl, 4); if (sh < 100) { no_ = 5; sh = sp(rt, 5); sv = sp(rl, 5); }
        var T = o.Mu / (0.8 * o.Lw) - o.Pu / 2, Asb = Math.max(T > 0 ? T * 1000 / (0.9 * fy) : 0, 0.01 * tw * Math.max(300, 0.15 * Lw)), lb = Math.max(300, Math.ceil(0.15 * Lw / 50) * 50), bb = pickBars(Asb, Math.max(lb, 300), 40, BARS[3][0]);
        var Pmax = 0.8 * 0.65 * (0.85 * fc * tw * Lw) / 1000; if (o.Pu > 0.35 * 0.65 * 0.85 * fc * tw * Lw / 1000) warns.push('Carga axial alta (> 0.35·φ·0.85f′c·Ag): se requieren elementos de borde confinados (NSR-10 C.21.9.6).'); if (!bb.fit) warns.push('Las barras de borde no caben en una capa: aumente tw/lb o use dos capas.');
        memo.push('MURO ESTRUCTURAL / DE CORTE — PREDIMENSIONAMIENTO (ACI 318 cap. 11 y 18 / NSR-10 C.11.9, C.14, C.21 simplificados, educativo)', 'Unidades: kN, kN·m, mm, MPa.',
            'Datos: Lw = ' + o.Lw + ' m · hw = ' + o.hw + ' m (hw/Lw = ' + F(hwl, 2) + ') · tw = ' + tw + ' mm · Vu = ' + o.Vu + ' kN · Mu = ' + o.Mu + ' kN·m · Pu = ' + o.Pu + ' kN · f′c = ' + fc + ' · fy = ' + fy + ' MPa',
            'Espesor mínimo: tw ≥ max(100, menor(hw, Lw)/25) = ' + F(twmin, 0) + ' mm ' + (tw >= twmin ? 'OK' : 'NO CUMPLE'), 'Cortante: d = 0.8·Lw = ' + F(d, 0) + ' mm · Vc = 0.17√f′c·tw·d = ' + F(Vc, 0) + ' kN · límite φ0.83√f′c·tw·d = ' + F(phiVnMax, 0) + ' kN · Vs = Vu/φ − Vc = ' + F(Vs, 0) + ' kN',
            'Refuerzo horizontal: ρt = max(0.0025, Vs/(fy·tw·d)) = ' + F(rt, 4) + ' → ' + curt + ' cortina(s) Ø#' + no_ + ' @ ' + sh + ' mm · Refuerzo vertical: ρl = ' + F(rl, 4) + ' → Ø#' + no_ + ' @ ' + sv + ' mm (espaciamiento máx. ' + F(fl25(sMax), 0) + ' mm)',
            'Elementos de borde: T ≈ Mu/(0.8Lw) − Pu/2 = ' + F(T, 0) + ' kN → As = max(T/(0.9fy), 1 % del área de borde) = ' + F(Asb, 0) + ' mm² → ' + bb.n + ' Ø#' + bb.no + ' en cada extremo, longitud de borde lb = ' + lb + ' mm, estribos Ø#3 @ 100 mm',
            'NO verificado: pandeo fuera del plano, requisitos especiales de detallamiento sísmico (C.21), deriva, vigas de acople, cimentación, torsión en planta.', AVISO);
        var th = Math.max(40, Lw * 0.02), D = mkDraw(th), i;
        D.text(0, hw + th * 7, 'MURO ESTRUCTURAL MW-1 — ELEVACION Y SECCION (mm)', { h: th * 1.5 }); D.text(0, hw + th * 5, 'Lw×hw×tw = ' + F(Lw) + '×' + F(hw) + '×' + tw + ' · f′c ' + fc + ' · fy ' + fy + ' MPa', { h: th * 0.9 }); D.rect(0, 0, Lw, hw, 'CONTORNO'); D.rect(0, 0, lb, hw, 'SOMBRA'); D.rect(Lw - lb, 0, lb, hw, 'SOMBRA');
        var nh = Math.min(60, Math.floor(hw / sh)); for (i = 1; i <= nh; i++) D.line(40, i * sh, Lw - 40, i * sh, 'ARMADURA', 3); var nvv = Math.min(60, Math.floor((Lw - 2 * lb) / sv)); for (i = 1; i <= nvv; i++) { var x = lb + i * (Lw - 2 * lb) / (nvv + 1); D.line(x, 40, x, hw - 40, 'ARMADURA', 5); }
        for (i = 0; i < bb.n; i++) { var xb = 60 + (lb - 120) * i / Math.max(1, bb.n - 1); D.line(xb, 30, xb, hw - 30, 'ARMADURA'); D.line(Lw - lb + 60 + (lb - 120) * i / Math.max(1, bb.n - 1), 30, Lw - lb + 60 + (lb - 120) * i / Math.max(1, bb.n - 1), hw - 30, 'ARMADURA'); }
        D.text(Lw / 2, hw * 0.5, curt + ' cortinas: horiz. Ø#' + no_ + ' @ ' + sh + ' · vert. Ø#' + no_ + ' @ ' + sv, { ha: 1, va: 2, h: th, aci: 3 }); D.text(lb / 2, hw * 0.5, bb.n + ' Ø#' + bb.no + ' borde', { ha: 1, h: th * 0.9, rot: PI / 2 }); D.dim(0, 0, Lw, 0, -th * 2.5, 'Lw = ' + F(Lw)); D.dim(Lw, 0, Lw, hw, th * 2.5, 'hw = ' + F(hw)); D.dim(0, hw, lb, hw, th * 2, 'lb = ' + lb);
        var cx = Lw + th * 14, cy = hw * 0.4, sc2 = Math.min(1, 2500 / Lw); D.text(cx, cy + tw * 4 + th * 4, 'SECCION EN PLANTA', { h: th * 1.1 }); D.rect(cx, cy, Lw * sc2, tw * 3, 'CONTORNO'); D.rect(cx, cy, lb * sc2, tw * 3, 'SOMBRA'); D.rect(cx + (Lw - lb) * sc2, cy, lb * sc2, tw * 3, 'SOMBRA'); for (i = 0; i <= 12; i++) { D.circle(cx + (Lw * sc2) * i / 12, cy + tw * 3 * 0.18, 8, 'ARMADURA'); if (curt === 2) D.circle(cx + (Lw * sc2) * i / 12, cy + tw * 3 * 0.82, 8, 'ARMADURA'); } D.dim(cx, cy, cx, cy + tw * 3, -th * 2, 'tw = ' + tw + ' (×3)');
        var nrows = Math.max(1, Math.round(hw / sh) + 1), rows = [bomRow('Horizontales (' + curt + ' cortina' + (curt > 1 ? 's' : '') + ')', 1, no_, nrows * curt, Lw - 80 + 300), bomRow('Verticales (' + curt + ' cortina' + (curt > 1 ? 's' : '') + ')', 2, no_, Math.max(2, Math.round((Lw - 2 * lb) / sv) + 1) * curt, hw + 600), bomRow('Borde (2 extremos)', 3, bb.no, bb.n * 2, hw + 600), bomRow('Estribos de borde', 4, 3, 2 * Math.round(hw / 100), 2 * (lb - 80) + 2 * (tw - 80) + 150)], bom = { head: BOMH, rows: rows };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'MURO DE CORTE', bom), bom: bom, calc: { rt: rt, rl: rl, sh: sh, sv: sv, Asb: Asb } };
    };

    /* ============================================================================
     * 13) CERCHAS PRATT Y HOWE — método de los nudos (solución simultánea)
     *     Pratt: diagonales a tracción (inclinadas hacia el centro, bajando); Howe: diagonales a compresión.
     *     Paneles pares. Cargas P en nudos superiores (mitad en los extremos). Apoyo fijo izq., rodillo der.
     *     Sección orientativa: tracción A = T/(0.9fy); compresión con KL/r = 100 (AISC E3): A = C/(0.9·Fcr).
     * ========================================================================== */
    function solveN(A, b) { var n = b.length, i, j, k; for (i = 0; i < n; i++) { var m = i; for (j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[m][i])) m = j; if (Math.abs(A[m][i]) < 1e-12) return null; var t = A[i]; A[i] = A[m]; A[m] = t; var tb = b[i]; b[i] = b[m]; b[m] = tb; for (j = i + 1; j < n; j++) { var f = A[j][i] / A[i][i]; if (!f) continue; for (k = i; k < n; k++) A[j][k] -= f * A[i][k]; b[j] -= f * b[i]; } } var x = new Array(n); for (i = n - 1; i >= 0; i--) { var s = b[i]; for (j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x; }
    S.cerchaPH = function (o) {
        o = Object.assign({ tipo: 1, L: 12, h: 2.5, n: 6, P: 12, fy: 250 }, o || {});
        var warns = [], memo = [], pratt = o.tipo !== 2, n = Math.max(2, 2 * Math.round(o.n / 2)), L = o.L, h = o.h, dx = L / n, nodes = [], mem = [], i, E = 200000, fy = o.fy;
        for (i = 0; i <= n; i++) nodes.push([i * dx, 0]); var T0 = n + 1; for (i = 0; i <= n; i++) nodes.push([i * dx, h]);
        for (i = 0; i < n; i++) mem.push([i, i + 1, 'CI']); for (i = 0; i < n; i++) mem.push([T0 + i, T0 + i + 1, 'CS']); for (i = 0; i <= n; i++) mem.push([i, T0 + i, 'M']);
        for (i = 0; i < n; i++) { var left = i < n / 2; if (pratt) { if (left) mem.push([T0 + i, i + 1, 'D']); else mem.push([i, T0 + i + 1, 'D']); } else { if (left) mem.push([i, T0 + i + 1, 'D']); else mem.push([T0 + i, i + 1, 'D']); } }
        var nj = nodes.length, nm = mem.length, N = nm + 3; if (N !== 2 * nj) warns.push('Cercha no isostática.'); var A = [], b = [], r; for (r = 0; r < 2 * nj; r++) { A.push(new Array(N).fill(0)); b.push(0); }
        mem.forEach(function (m, k) { var a = nodes[m[0]], c = nodes[m[1]], Lm = Math.hypot(c[0] - a[0], c[1] - a[1]), cx = (c[0] - a[0]) / Lm, cy = (c[1] - a[1]) / Lm; A[2 * m[0]][k] += cx; A[2 * m[0] + 1][k] += cy; A[2 * m[1]][k] -= cx; A[2 * m[1] + 1][k] -= cy; m.push(Lm); });
        A[0][nm] = 1; A[1][nm + 1] = 1; A[2 * n + 1][nm + 2] = 1; for (i = 0; i <= n; i++) b[2 * (T0 + i) + 1] = (i === 0 || i === n) ? o.P / 2 : o.P;
        var sol = solveN(A, b); if (!sol) return fail('No se pudo resolver la cercha (matriz singular).'); var Fm = sol.slice(0, nm).map(function (v) { return Math.abs(v) < 1e-9 ? 0 : v; }), Ay = sol[nm + 1], By = sol[nm + 2], tot = o.P * n, chk = Math.abs(Ay + By - tot) < 1e-6 * tot;
        function Acomp(Lm, C) { var lam = 100, Fe = PI * PI * E / (lam * lam), Fcr = Math.pow(0.658, fy / Fe) * fy; return C * 1000 / (0.9 * Fcr); } var rowsM = [], maxT = 0, maxC = 0;
        mem.forEach(function (m, k) { var f = Fm[k], t = f > 1e-6, cmp = f < -1e-6, Ar = t ? f * 1000 / (0.9 * fy) : (cmp ? Acomp(m[3], -f) : 0); if (t) maxT = Math.max(maxT, f); if (cmp) maxC = Math.max(maxC, -f); rowsM.push([k + 1, m[2] === 'CI' ? 'Cordón inf.' : (m[2] === 'CS' ? 'Cordón sup.' : (m[2] === 'M' ? 'Montante' : 'Diagonal')), (m[0] + 1) + '-' + (m[1] + 1), F(m[3], 3), F(f, 1), t ? 'Tracción' : (cmp ? 'Compresión' : 'Nula'), F(Ar, 0)]); });
        var dT = mem.filter(function (m, k) { return m[2] === 'D' && Fm[k] > 1e-6; }).length, dC = mem.filter(function (m, k) { return m[2] === 'D' && Fm[k] < -1e-6; }).length; if (pratt && dC > 0) warns.push('Revise: en una Pratt las diagonales deberían ir a tracción con carga gravitacional hacia abajo.');
        memo.push('CERCHA ' + (pratt ? 'PRATT' : 'HOWE') + ' — ANALISIS POR EL METODO DE LOS NUDOS (educativo)', 'Unidades: kN, m, MPa.',
            'Datos: L = ' + L + ' m · h = ' + h + ' m · ' + n + ' paneles · P = ' + o.P + ' kN en nudos superiores (' + o.P / 2 + ' kN en los extremos) · acero fy = ' + fy + ' MPa',
            'Barras = ' + nm + ' · nudos = ' + nj + ' · m + r = 2j (' + nm + ' + 3 = ' + 2 * nj + ') isostática · carga total = ' + F(tot, 1) + ' kN · reacciones Ay = ' + F(Ay, 1) + ' ; By = ' + F(By, 1) + ' kN · equilibrio vertical ' + (chk ? 'OK' : 'REVISAR'),
            'Tracción máxima = ' + F(maxT, 1) + ' kN · compresión máxima = ' + F(maxC, 1) + ' kN · diagonales a tracción: ' + dT + ' · a compresión: ' + dC + (pratt ? ' (Pratt: diagonales a tracción, montantes a compresión)' : ' (Howe: diagonales a compresión, montantes a tracción)'),
            'Área orientativa: tracción A = T/(0.9fy); compresión A = C/(0.9·Fcr) con KL/r = 100 supuesto (AISC E3: Fcr = 0.658^(fy/Fe)·fy, Fe = π²E/(KL/r)²). Es solo punto de partida: verifique pandeo real de cada barra con su perfil.',
            'NO verificado: conexiones, peso propio, viento/sismo, arriostramiento lateral y fuera del plano, flexión local por carga entre nudos.', AVISO);
        var th = Math.max(40, L * 1000 * 0.013), D = mkDraw(th), s = 1000;
        D.text(0, h * s + th * 7, 'CERCHA ' + (pratt ? 'PRATT' : 'HOWE') + ' C-2 — GEOMETRIA Y FUERZAS AXIALES (kN)', { h: th * 1.5 }); D.text(0, h * s + th * 5, 'L = ' + L + ' m · h = ' + h + ' m · ' + n + ' paneles · P = ' + o.P + ' kN/nudo · (+) tracción (−) compresión', { h: th * 0.9 });
        mem.forEach(function (m, k) { var a = nodes[m[0]], c = nodes[m[1]], f = Fm[k], ly = 'ACERO', ac = f > 1e-6 ? 3 : (f < -1e-6 ? 1 : 8); D.line(a[0] * s, a[1] * s, c[0] * s, c[1] * s, ly, ac); var ang = Math.atan2(c[1] - a[1], c[0] - a[0]); if (ang > PI / 2 + 1e-9 || ang < -PI / 2 - 1e-9) ang += PI; var nx = -Math.sin(ang), ny = Math.cos(ang), side = m[2] === 'CS' ? 1 : (m[2] === 'CI' ? -1 : 1); D.text((a[0] + c[0]) / 2 * s + nx * th * 0.6 * side, (a[1] + c[1]) / 2 * s + ny * th * 0.6 * side, (f > 0 ? '+' : '') + F(f, 1), { layer: 'TEXTO', ha: 1, va: side > 0 ? 0 : 3, rot: ang, h: th * 0.85, aci: ac }); });
        nodes.forEach(function (p, i) { D.circle(p[0] * s, p[1] * s, th * 0.35, 'CONTORNO'); D.text(p[0] * s, p[1] * s + (p[1] > 0 ? th * 1.2 : -th * 1.2), String(i + 1), { ha: 1, va: p[1] > 0 ? 0 : 3, h: th * 0.9 }); }); var tri = th * 2.4; D.poly([[0, 0], [-tri / 2, -tri], [tri / 2, -tri]], true, 'CONTORNO'); D.circle(L * s, -tri * 0.6, tri * 0.45, 'CONTORNO'); D.line(L * s - tri, -tri * 1.05, L * s + tri, -tri * 1.05, 'CONTORNO');
        for (i = 0; i <= n; i++) { var px = nodes[T0 + i][0] * s, py = h * s; D.line(px, py + th * 3.4, px, py + th * 0.5, 'COTAS'); D.line(px - th * 0.3, py + th * 1.1, px, py + th * 0.5, 'COTAS'); D.line(px + th * 0.3, py + th * 1.1, px, py + th * 0.5, 'COTAS'); } D.dim(0, -tri * 1.4, L * s, -tri * 1.4, -th * 2, 'L = ' + F(L * s)); D.dim(-tri * 2, 0, -tri * 2, h * s, th * 1.2, 'h = ' + F(h * s));
        var bom = { head: ['N.º', 'Tipo', 'Nudos', 'Long. (m)', 'Fuerza (kN)', 'Estado', 'A orient. (mm²)'], rows: rowsM };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'CERCHA ' + (pratt ? 'PRATT' : 'HOWE'), null, { noTable: true }), bom: bom, calc: { F: Fm, maxT: maxT, maxC: maxC, Ay: Ay, By: By } };
    };

    /* ============================================================================
     * 14) ACERO LAMINADO — perfiles W de tabla REDUCIDA (dimensiones nominales aproximadas)
     *     Propiedades calculadas de las dimensiones (d, bf, tf, tw) SIN filetes: ligeramente conservadoras.
     *     Verifique SIEMPRE contra el manual AISC / catálogo del fabricante (IPR/HEB/W) antes de usar.
     *     AISC 360 (LRFD): φb = 0.90, φv = 1.00 (alma laminada), φc = 0.90.
     * ========================================================================== */
    var W = [['W200x35.9', 35.9, 201, 165, 10.2, 6.2], ['W200x46.1', 46.1, 203, 203, 11, 7.2], ['W250x44.8', 44.8, 266, 148, 13, 7.6], ['W250x73', 73, 253, 254, 14.2, 8.6], ['W310x38.7', 38.7, 310, 165, 9.7, 5.8], ['W310x60', 60, 303, 203, 13.1, 7.5], ['W360x51', 51, 355, 171, 11.6, 7.2], ['W360x79', 79, 354, 205, 16.8, 9.4], ['W410x53', 53, 403, 177, 10.9, 7.5], ['W460x60', 60, 455, 153, 13.3, 8], ['W530x82', 82, 528, 209, 13.3, 9.5], ['W610x101', 101, 603, 228, 14.9, 10.5]].map(function (p) {
        var d = p[2], bf = p[3], tf = p[4], tw = p[5], hw = d - 2 * tf, A = 2 * bf * tf + hw * tw, Ix = (bf * d * d * d - (bf - tw) * hw * hw * hw) / 12, Iy = 2 * tf * bf * bf * bf / 12 + hw * tw * tw * tw / 12, Zx = bf * tf * (d - tf) + tw * hw * hw / 4;
        return { n: p[0], kg: p[1], d: d, bf: bf, tf: tf, tw: tw, hw: hw, A: A, Ix: Ix, Iy: Iy, Zx: Zx, ry: SQ(Iy / A), rx: SQ(Ix / A) };
    }).sort(function (a, b) { return a.kg - b.kg; });
    function drawI(D, cx, cy, p, label) { // sección en I centrada en (cx, cy base)
        var d = p.d, bf = p.bf, tf = p.tf, tw = p.tw; D.poly([[cx - bf / 2, cy], [cx + bf / 2, cy], [cx + bf / 2, cy + tf], [cx + tw / 2, cy + tf], [cx + tw / 2, cy + d - tf], [cx + bf / 2, cy + d - tf], [cx + bf / 2, cy + d], [cx - bf / 2, cy + d], [cx - bf / 2, cy + d - tf], [cx - tw / 2, cy + d - tf], [cx - tw / 2, cy + tf], [cx - bf / 2, cy + tf]], true, 'ACERO'); D.dim(cx - bf / 2, cy, cx + bf / 2, cy, -D.th * 1.8, 'bf = ' + bf); D.dim(cx + bf / 2, cy, cx + bf / 2, cy + d, D.th * 1.8, 'd = ' + d); D.dim(cx - tw / 2, cy + d / 2, cx + tw / 2, cy + d / 2, -D.th * 0.2, ''); D.text(cx + tw / 2 + D.th * 0.5, cy + d / 2, 'tw = ' + tw, { h: D.th * 0.8 }); D.text(cx + bf / 2 + D.th * 0.5, cy + d - tf / 2, 'tf = ' + tf, { h: D.th * 0.8 }); D.text(cx, cy + d + D.th * 1.5, label, { ha: 1, h: D.th * 1.1 });
    }
    S.aceroViga = function (o) {
        o = Object.assign({ L: 6, wD: 12, wL: 15, fy: 250, defl: 360 }, o || {}); var warns = [], memo = [], E = 200000, L = o.L * 1000, fy = o.fy, Lim = Math.sqrt(E / fy), chosen = null, tried = [];
        for (var k = 0; k < W.length; k++) { var p = W[k], ws = p.kg * 9.81 / 1000, wu = 1.2 * (o.wD + ws) + 1.6 * o.wL, Mu = wu * o.L * o.L / 8, Vu = wu * o.L / 2, phiMn = 0.9 * fy * p.Zx / 1e6, Aw = p.d * p.tw, phiVn = 1.0 * 0.6 * fy * Aw / 1000, dL = 5 * o.wL * Math.pow(L, 4) / (384 * E * p.Ix), dT = 5 * (o.wD + ws + o.wL) * Math.pow(L, 4) / (384 * E * p.Ix), cf = (p.bf / 2 / p.tf) <= 0.38 * Lim, cw = (p.hw / p.tw) <= 3.76 * Lim; var ok = phiMn >= Mu && phiVn >= Vu && dL <= L / o.defl && dT <= L / 240 && cf && cw; tried.push(p.n); if (ok) { chosen = { p: p, ws: ws, wu: wu, Mu: Mu, Vu: Vu, phiMn: phiMn, phiVn: phiVn, dL: dL, dT: dT }; break; } }
        if (!chosen) return fail('Ningún perfil de la tabla reducida cumple (se probaron ' + tried.join(', ') + '): reduzca la luz o las cargas, o use un perfil mayor del manual AISC.'); var c = chosen, p = c.p;
        warns.push('Se asume la viga ARRIOSTRADA lateralmente en toda su longitud (sin pandeo lateral-torsional, Lb ≤ Lp). Verifique el arriostramiento.'); warns.push('Propiedades de ' + p.n + ' calculadas de dimensiones nominales sin filetes: confirme en el manual AISC / catálogo.');
        memo.push('VIGA DE ACERO LAMINADO (perfil W, tabla reducida) — PREDIMENSIONAMIENTO (AISC 360 LRFD / NSR-10 F, educativo)', 'Unidades: kN, m, MPa; perfil en mm.',
            'Datos: L = ' + o.L + ' m · wD = ' + o.wD + ' kN/m · wL = ' + o.wL + ' kN/m · Fy = ' + fy + ' MPa · E = 200 000 MPa · límites de deflexión: viva L/' + o.defl + ', total L/240',
            'Perfil adoptado (el más liviano que cumple): ' + p.n + ' · ' + p.kg + ' kg/m · d = ' + p.d + ' · bf = ' + p.bf + ' · tf = ' + p.tf + ' · tw = ' + p.tw + ' mm · A = ' + F(p.A, 0) + ' mm² · Ix = ' + F(p.Ix / 1e6, 1) + '×10⁶ mm⁴ · Zx = ' + F(p.Zx / 1e3, 0) + '×10³ mm³',
            'Carga: peso propio = ' + F(c.ws, 2) + ' kN/m → wu = 1.2(wD + p.p.) + 1.6wL = ' + F(c.wu, 2) + ' kN/m · Mu = wu·L²/8 = ' + F(c.Mu, 1) + ' kN·m · Vu = ' + F(c.Vu, 1) + ' kN',
            'Flexión (compacta, arriostrada): φMn = 0.90·Fy·Zx = ' + F(c.phiMn, 1) + ' kN·m ' + (c.phiMn >= c.Mu ? '≥ Mu OK' : 'NO CUMPLE') + ' · Cortante: φVn = 1.0·0.6·Fy·d·tw = ' + F(c.phiVn, 1) + ' kN ' + (c.phiVn >= c.Vu ? '≥ Vu OK' : 'NO CUMPLE'),
            'Esbeltez local: bf/2tf = ' + F(p.bf / 2 / p.tf, 1) + ' ≤ 0.38√(E/Fy) = ' + F(0.38 * Lim, 1) + ' · h/tw = ' + F(p.hw / p.tw, 1) + ' ≤ 3.76√(E/Fy) = ' + F(3.76 * Lim, 1) + ' → sección compacta',
            'Deflexión: viva = 5wL·L⁴/(384EI) = ' + F(c.dL, 1) + ' mm ≤ L/' + o.defl + ' = ' + F(L / o.defl, 1) + ' mm · total = ' + F(c.dT, 1) + ' mm ≤ L/240 = ' + F(L / 240, 1) + ' mm',
            'NO verificado: pandeo lateral-torsional, aplastamiento y pandeo del alma en apoyos, conexiones, vibraciones, cargas concentradas.', AVISO);
        var th = Math.max(30, L * 0.012), D = mkDraw(th), hv = p.d; D.text(0, hv + th * 8, 'VIGA DE ACERO ' + p.n + ' VA-1 — ELEVACION Y SECCION (mm)', { h: th * 1.5 }); D.text(0, hv + th * 6, 'L = ' + F(L) + ' · wu = ' + F(c.wu, 1) + ' kN/m · Fy ' + fy + ' MPa', { h: th * 0.9 });
        D.rect(0, 0, L, p.tf, 'ACERO'); D.rect(0, hv - p.tf, L, p.tf, 'ACERO'); D.line(0, p.tf, L, p.tf, 'ACERO'); D.line(0, hv - p.tf, L, hv - p.tf, 'ACERO'); D.line(0, 0, 0, hv, 'ACERO'); D.line(L, 0, L, hv, 'ACERO'); D.poly([[0, 0], [-th * 1.6, -th * 2.6], [th * 1.6, -th * 2.6]], true, 'CONTORNO'); D.poly([[L, 0], [L - th * 1.6, -th * 2.6], [L + th * 1.6, -th * 2.6]], true, 'CONTORNO');
        for (var i = 0; i <= 12; i++) { var x = L * i / 12; D.line(x, hv + th * 3.4, x, hv + th * 0.6, 'COTAS'); D.line(x - th * 0.3, hv + th * 1.2, x, hv + th * 0.6, 'COTAS'); D.line(x + th * 0.3, hv + th * 1.2, x, hv + th * 0.6, 'COTAS'); } D.text(L / 2, hv + th * 4, 'wu = ' + F(c.wu, 1) + ' kN/m', { ha: 1, layer: 'COTAS', h: th * 0.9 }); D.dim(0, 0, L, 0, -th * 4.5, 'L = ' + F(L));
        drawI(D, L + 900, -th * 2, p, 'SECCION ' + p.n);
        var bom = { head: ['Perfil', 'Masa (kg/m)', 'Longitud (m)', 'Masa total (kg)', 'φMn (kN·m)', 'φVn (kN)'], rows: [[p.n, p.kg, o.L, F(p.kg * o.L, 1), F(c.phiMn, 1), F(c.phiVn, 1)]] };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'VIGA DE ACERO', null, { noTable: true }), bom: bom, calc: c };
    };
    S.aceroColumna = function (o) {
        o = Object.assign({ Pu: 800, KL: 3.5, fy: 250 }, o || {}); var warns = [], memo = [], E = 200000, fy = o.fy, KL = o.KL * 1000, chosen = null;
        for (var k = 0; k < W.length; k++) { var p = W[k], lam = KL / p.ry, Fe = PI * PI * E / (lam * lam), Fcr = lam <= 4.71 * SQ(E / fy) ? Math.pow(0.658, fy / Fe) * fy : 0.877 * Fe, phiPn = 0.9 * Fcr * p.A / 1000, cf = (p.bf / 2 / p.tf) <= 0.56 * SQ(E / fy), cw = (p.hw / p.tw) <= 1.49 * SQ(E / fy); if (phiPn >= o.Pu && lam <= 200 && cf && cw) { chosen = { p: p, lam: lam, Fe: Fe, Fcr: Fcr, phiPn: phiPn }; break; } }
        if (!chosen) return fail('Ningún perfil de la tabla reducida resiste Pu con KL = ' + o.KL + ' m: reduzca la carga/longitud o use un perfil mayor del manual AISC.'); var c = chosen, p = c.p; warns.push('Solo compresión axial centrada; los momentos (flexocompresión, AISC H1) NO se consideran.'); warns.push('Propiedades de ' + p.n + ' calculadas de dimensiones nominales sin filetes: confirme en el manual.');
        memo.push('COLUMNA DE ACERO LAMINADO (perfil W, tabla reducida) — COMPRESION AXIAL (AISC 360 cap. E / NSR-10 F.2, educativo)', 'Unidades: kN, m, MPa; perfil en mm.',
            'Datos: Pu = ' + o.Pu + ' kN · KL = ' + o.KL + ' m · Fy = ' + fy + ' MPa · E = 200 000 MPa', 'Perfil adoptado: ' + p.n + ' · ' + p.kg + ' kg/m · A = ' + F(p.A, 0) + ' mm² · ry = ' + F(p.ry, 1) + ' mm · rx = ' + F(p.rx, 1) + ' mm',
            'Esbeltez: KL/r = ' + F(KL, 0) + '/' + F(p.ry, 1) + ' = ' + F(c.lam, 1) + ' (límite recomendado 200) · Fe = π²E/(KL/r)² = ' + F(c.Fe, 0) + ' MPa · Fcr = ' + F(c.Fcr, 1) + ' MPa (E3: ' + (c.lam <= 4.71 * SQ(E / fy) ? 'pandeo inelástico 0.658^(Fy/Fe)·Fy' : 'pandeo elástico 0.877·Fe') + ')',
            'Resistencia: φPn = 0.90·Fcr·A = ' + F(c.phiPn, 0) + ' kN ' + (c.phiPn >= o.Pu ? '≥ Pu OK' : '< Pu NO CUMPLE') + ' · aprovechamiento = ' + F(o.Pu / c.phiPn * 100, 0) + ' %', 'NO verificado: momentos, pandeo torsional/flexo-torsional, conexiones y placa base, estabilidad del pórtico (K real).', AVISO);
        var th = Math.max(30, KL * 0.014), D = mkDraw(th), x0 = 0; D.text(0, KL + th * 8, 'COLUMNA DE ACERO ' + p.n + ' CA-1 — ELEVACION Y SECCION (mm)', { h: th * 1.5 }); D.text(0, KL + th * 6, 'KL = ' + F(KL) + ' · Pu = ' + o.Pu + ' kN · φPn = ' + F(c.phiPn, 0) + ' kN', { h: th * 0.9 });
        D.rect(0, 0, p.d, KL, 'ACERO'); D.line(p.tf, 0, p.tf, KL, 'ACERO'); D.line(p.d - p.tf, 0, p.d - p.tf, KL, 'ACERO'); D.rect(-p.d * 0.3, -p.tf * 2.5 - 12, p.d * 1.6, p.tf * 2.5, 'CONTORNO'); D.rect(-p.d * 0.5, -p.tf * 2.5 - 12 - 400, p.d * 2, 400, 'SOMBRA'); D.hatch(-p.d * 0.5, -p.tf * 2.5 - 12 - 400, p.d * 2, 400, th * 3);
        D.line(p.d / 2, KL + th * 5, p.d / 2, KL + th * 0.6, 'COTAS'); D.line(p.d / 2 - th * 0.4, KL + th * 1.6, p.d / 2, KL + th * 0.6, 'COTAS'); D.line(p.d / 2 + th * 0.4, KL + th * 1.6, p.d / 2, KL + th * 0.6, 'COTAS'); D.text(p.d / 2 + th, KL + th * 3, 'Pu = ' + o.Pu + ' kN', { h: th * 0.9, layer: 'COTAS' }); D.dim(p.d, 0, p.d, KL, th * 4, 'KL = ' + F(KL));
        drawI(D, p.d * 3 + 400, KL * 0.4, { d: p.d, bf: p.bf, tf: p.tf, tw: p.tw, hw: p.hw }, 'SECCION ' + p.n);
        var bom = { head: ['Perfil', 'Masa (kg/m)', 'Longitud (m)', 'Masa total (kg)', 'φPn (kN)', 'KL/r'], rows: [[p.n, p.kg, F(o.KL, 2), F(p.kg * o.KL, 1), F(c.phiPn, 0), F(c.lam, 1)]] };
        return { ok: true, warns: warns, memo: memo, model: finish(D, 'COLUMNA DE ACERO', null, { noTable: true }), bom: bom, calc: c };
    };

    /* ============================================================================
     * 15) COMBINACIONES DE CARGA — LRFD (estilo NSR-10 B.2.4.2 / ASCE 7)
     *     D muerta, L viva, Lr cubierta, W viento, E sismo (valores de la misma magnitud y unidad; W y E con signo).
     *     NO calcula W ni E: son datos del usuario. Sin factores de reducción de L ni combinaciones especiales (sobrerresistencia).
     * ========================================================================== */
    S.combinaciones = function (o) {
        o = Object.assign({ D: 100, L: 50, Lr: 10, W: 20, E: 30 }, o || {}); var warns = [], memo = [], D_ = o.D, L_ = o.L, Lr = o.Lr, W_ = o.W, E_ = o.E;
        var rows = [['C1', '1.4D', 1.4 * D_], ['C2', '1.2D + 1.6L + 0.5Lr', 1.2 * D_ + 1.6 * L_ + 0.5 * Lr], ['C3', '1.2D + 1.6Lr + 1.0L', 1.2 * D_ + 1.6 * Lr + 1.0 * L_], ['C4', '1.2D + 1.6Lr + 0.5W', 1.2 * D_ + 1.6 * Lr + 0.5 * W_], ['C5', '1.2D + 1.0W + 1.0L + 0.5Lr', 1.2 * D_ + 1.0 * W_ + 1.0 * L_ + 0.5 * Lr], ['C6', '1.2D + 1.0W + 1.0L + 0.5Lr (W invertido)', 1.2 * D_ - 1.0 * W_ + 1.0 * L_ + 0.5 * Lr], ['C7', '1.2D + 1.0E + 1.0L', 1.2 * D_ + 1.0 * E_ + 1.0 * L_], ['C8', '1.2D − 1.0E + 1.0L (E invertido)', 1.2 * D_ - 1.0 * E_ + 1.0 * L_], ['C9', '0.9D + 1.0W', 0.9 * D_ + 1.0 * W_], ['C10', '0.9D − 1.0W', 0.9 * D_ - 1.0 * W_], ['C11', '0.9D + 1.0E', 0.9 * D_ + 1.0 * E_], ['C12', '0.9D − 1.0E', 0.9 * D_ - 1.0 * E_]];
        var mx = rows.reduce(function (m, r) { return r[2] > m[2] ? r : m; }, rows[0]), mn = rows.reduce(function (m, r) { return r[2] < m[2] ? r : m; }, rows[0]); if (D_ < 0 || L_ < 0 || Lr < 0) warns.push('D, L y Lr deben ser ≥ 0 (cargas gravitacionales de magnitud).'); if (mn[2] < 0) warns.push('Hay combinaciones con valor NEGATIVO (inversión de signo, p. ej. por viento o sismo): verifique levantamiento / tracción en conexiones.');
        memo.push('COMBINACIONES DE CARGA LRFD — NSR-10 B.2.4.2 / ASCE 7 (educativo)', 'Valores en la misma unidad que los datos ingresados (kN, kN·m, kN/m…). W y E pueden ser negativos.', 'Datos: D = ' + D_ + ' · L = ' + L_ + ' · Lr = ' + Lr + ' · W = ' + W_ + ' · E = ' + E_,
            rows.map(function (r) { return r[0] + ': ' + r[1] + ' = ' + F(r[2], 2); }).join('\n'), 'Máximo (positivo) = ' + F(mx[2], 2) + ' en ' + mx[0] + ' (' + mx[1] + ') · mínimo = ' + F(mn[2], 2) + ' en ' + mn[0] + ' (' + mn[1] + ')',
            'Uso: diseñar con el MAYOR valor absoluto de cada efecto (M, V, N) calculado con cada combinación; esta herramienta combina valores ya obtenidos de un efecto a la vez.', 'NO implementado: reducción de carga viva, combinaciones con sobrerresistencia (Ω0), efectos de sismo vertical, nieve/granizo, fluidos, tierra, ni viento/sismo reales.', AVISO);
        var th = 40, Dr = new Draw(th), sc = 2000 / Math.max(Math.abs(mx[2]), Math.abs(mn[2]), 1e-6), y0 = 0; Dr.text(0, rows.length * th * 3 + th * 6, 'COMBINACIONES DE CARGA LRFD — ENVOLVENTE', { h: th * 1.5 }); Dr.text(0, rows.length * th * 3 + th * 4, 'D = ' + D_ + ' · L = ' + L_ + ' · Lr = ' + Lr + ' · W = ' + W_ + ' · E = ' + E_, { h: th * 0.9 });
        rows.forEach(function (r, i) { var y = (rows.length - 1 - i) * th * 3, v = r[2] * sc; Dr.rect(Math.min(0, v) + 2200, y, Math.abs(v), th * 1.8, 'ARMADURA', r[2] >= 0 ? 3 : 1); Dr.text(2100, y + th * 0.4, r[0], { ha: 2, h: th * 0.9 }); Dr.text(Math.max(0, v) + 2200 + th, y + th * 0.4, F(r[2], 1) + '  (' + r[1] + ')', { h: th * 0.8 }); }); Dr.line(2200, -th, 2200, rows.length * th * 3, 'EJES');
        var bom = { head: ['Id', 'Combinación', 'Valor'], rows: rows.map(function (r) { return [r[0], r[1], F(r[2], 2)]; }) };
        return { ok: true, warns: warns, memo: memo, model: finish(Dr, 'COMBINACIONES DE CARGA', null, { noTable: true }), bom: bom, calc: { max: mx, min: mn } };
    };
    S._W = W;
})(typeof window !== 'undefined' ? window : globalThis);
