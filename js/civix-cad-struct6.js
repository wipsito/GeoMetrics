/**
 * Civix CAD — Diseño estructural académico, bloque P3: PUENTES
 *   puente (losa maciza o vigas + losa, simplemente apoyado, carga vehicular tipo HL-93 / CC-14)
 *   + atención desde el chat: «diseña un puente…», «diseña un pórtico…» (sin IA, sin tokens).
 *
 * EDUCATIVO: predimensionamiento y croquis basados en principios de AASHTO LRFD / CCP-14 y ACI 318 / NSR-10.
 * NO sustituye el diseño completo firmado por un ingeniero (no incluye sismo, apoyos, fatiga, deflexiones,
 * barandas ni estribos). Unidades de cálculo: kN, m, MPa; secciones y dibujo en mm.
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || !CAD.struct || !CAD.struct._h || CAD.struct.__v6) return; var S = CAD.struct; S.__v6 = true; var H = S._h;
    var SQ = Math.sqrt, BARS = H.BARS, F = H.F, Draw = H.Draw, needAs = H.needAs, pickRow = H.pickRow, bomRow = H.bomRow, BOMH = H.BOMH, finish = H.finish, fail = H.fail, AVISO = H.AVISO, stir = H.stir, phiMn = H.phiMn;

    /* ---------- carga vehicular HL-93 / CC-14: envolvente en viga simplemente apoyada ---------- */
    var TRUCK_A = [[0, 35], [4.3, 145], [8.6, 145]], TRUCK_B = [[0, 35], [4.3, 145], [13.3, 145]], TANDEM = [[0, 110], [1.2, 110]], LANE = 9.3, IM = 1.33;
    function infM(L, x, p) { return p < 0 || p > L ? 0 : (p <= x ? p * (L - x) / L : x * (L - p) / L); }
    function infV0(L, p) { return p < 0 || p > L ? 0 : (L - p) / L; }
    function sweep(L, veh, fn) { // máximo de fn(posiciones) recorriendo el vehículo en ambos sentidos
        var tot = veh[veh.length - 1][0], best = 0, s, dir, k;
        for (dir = 0; dir < 2; dir++) {
            for (s = -tot; s <= L + 1e-9; s += 0.1) {
                var tv = 0;
                for (k = 0; k < veh.length; k++) { var off = dir ? tot - veh[veh.length - 1 - k][0] : veh[k][0]; tv += fn(s + off, veh[dir ? veh.length - 1 - k : k][1]); }
                if (tv > best) best = tv;
            }
        }
        return best;
    }
    function liveEnvelope(L) {
        var n = 40, i, M = { v: 0, l: 0, x: L / 2, tipo: '' }, cands = [['camión', TRUCK_A], ['camión', TRUCK_B], ['tándem', TANDEM]];
        cands.forEach(function (c) {
            for (i = 1; i < n; i++) {
                var x = L * i / n, mv = sweep(L, c[1], function (p, P) { return P * infM(L, x, p); }) * IM, ml = LANE * x * (L - x) / 2;
                if (mv + ml > M.v + M.l) { M.v = mv; M.l = ml; M.x = x; M.tipo = c[0]; }
            }
        });
        var V = { v: 0, l: LANE * L / 2, tipo: '' };
        cands.forEach(function (c) { var vv = sweep(L, c[1], function (p, P) { return P * infV0(L, p); }) * IM; if (vv > V.v) { V.v = vv; V.tipo = c[0]; } });
        return { M: M, V: V };
    }
    function mpf(NL) { return NL <= 1 ? 1.2 : (NL === 2 ? 1.0 : (NL === 3 ? 0.85 : 0.65)); }

    /* ---------- dibujo ---------- */
    function bearing(D, x, y, tri, kind, fixedOne) {
        if (kind === 1) { D.rect(x - tri * 0.9, y - tri * 0.45, tri * 1.8, tri * 0.45, 'APOYOS'); D.text(x, y - tri * 0.7, 'neopreno', { ha: 1, va: 3, h: D.th * 0.6 }); }
        else if (fixedOne) { D.poly([[x, y], [x - tri / 2, y - tri], [x + tri / 2, y - tri]], true, 'APOYOS'); D.line(x - tri, y - tri, x + tri, y - tri, 'APOYOS'); D.text(x, y - tri * 1.2, 'fijo', { ha: 1, va: 3, h: D.th * 0.6 }); }
        else { D.poly([[x, y], [x - tri / 2, y - tri * 0.8], [x + tri / 2, y - tri * 0.8]], true, 'APOYOS'); D.circle(x - tri * 0.25, y - tri * 0.95, tri * 0.15, 'APOYOS'); D.circle(x + tri * 0.25, y - tri * 0.95, tri * 0.15, 'APOYOS'); D.line(x - tri, y - tri * 1.1, x + tri, y - tri * 1.1, 'APOYOS'); D.text(x, y - tri * 1.35, 'móvil', { ha: 1, va: 3, h: D.th * 0.6 }); }
    }

    S.puente = function (o) {
        o = Object.assign({ tipo: 1, L: 8, Wc: 7.2, Wa: 0.8, NB: 4, fc: 28, fy: 420, apoyo: 1 }, o || {});
        var L = +o.L, Wc = +o.Wc, Wa = +o.Wa, fc = +o.fc, fy = +o.fy, tipo = o.tipo === 2 ? 2 : 1, kind = o.apoyo === 2 ? 2 : 1, NB = Math.max(3, Math.min(6, Math.round(o.NB || 4)));
        if (!(L >= 3 && L <= 30)) return fail('La luz debe estar entre 3 y 30 m.');
        if (tipo === 1 && L > 14) return fail('Una losa maciza de L > 14 m resulta excesivamente gruesa: usa el tipo «vigas + losa».');
        if (!(Wc >= 3.6 && Wc <= 14)) return fail('El ancho de calzada debe estar entre 3.6 y 14 m.');
        var warns = [], memo = [], Wt = Wc + 2 * Wa, NL = Math.max(1, Math.floor(Wc / 3.6)), m = mpf(NL), Lmm = L * 1000, env = liveEnvelope(L), WDW = 0.075 * 22, D, th = Math.max(80, Lmm * 0.012), bom = { head: BOMH, rows: [] };
        var Mu, Vu, info = {};

        if (tipo === 1) {
            /* ===================== LOSA MACIZA, franja de 1 m ===================== */
            var hmin = Math.max(165, 1.2 * (Lmm + 3000) / 30), h = Math.ceil(hmin / 25) * 25, wdc = 24 * h / 1000, L1 = Math.min(Lmm, 18000), W1a = Math.min(Wt * 1000, 9000), W1b = Math.min(Wt * 1000, 18000);
            var E1 = (250 + 0.42 * SQ(L1 * W1a)) / 1000, EM = Math.min((2100 + 0.12 * SQ(L1 * W1b)) / 1000, Wt / NL);
            var Mdc = wdc * L * L / 8, Mdw = WDW * L * L / 8, Vdc = wdc * L / 2, Vdw = WDW * L / 2;
            var Mll1 = 1.2 * (env.M.v / E1 + env.M.l / 3), MllM = m * (env.M.v / EM + env.M.l / 3), Mll = Math.max(Mll1, MllM);
            var Vll1 = 1.2 * (env.V.v / E1 + env.V.l / 3), VllM = m * (env.V.v / EM + env.V.l / 3), Vll = Math.max(Vll1, VllM);
            Mu = 1.25 * Mdc + 1.5 * Mdw + 1.75 * Mll; Vu = 1.25 * Vdc + 1.5 * Vdw + 1.75 * Vll;
            var d = h - 50 - 12.7, na = needAs(Mu, 1000, d, fc, fy);
            if (!na.ok) { h += 100; d = h - 50 - 12.7; wdc = 24 * h / 1000; na = needAs(Mu * 1.1, 1000, d, fc, fy); warns.push('La losa se engrosó a h = ' + h + ' mm para cumplir la cuantía máxima.'); }
            var row = pickRow(na.As, 1000, h, 50), Asp = row.As, sMain = Math.max(75, Math.floor((1000 - 100) / (row.n - 1) / 25) * 25);
            var phiVc = 0.75 * 0.17 * SQ(fc) * 1000 * d / 1000;
            if (Vu > phiVc) warns.push('Vu = ' + F(Vu, 1) + ' kN/m > φVc = ' + F(phiVc, 1) + ' kN/m: aumenta el espesor (las losas de puente no llevan estribos).');
            var pctD = Math.min(67, 3840 / SQ(Lmm)), AsD = pctD / 100 * Asp, rowD = pickRow(AsD, 1000, h, 50), AsT = 0.0018 * 1000 * h;
            if (h > 0.07 * Lmm) warns.push('h/L > 0.07: la losa es muy pesada; para L > 10 m suele convenir el tipo vigas + losa.');
            memo.push('PUENTE DE LOSA MACIZA — PREDIMENSIONAMIENTO (educativo, tipo AASHTO LRFD / CCP-14 + ACI 318)', AVISO,
                'Datos: luz L = ' + L + ' m (apoyos simples) · calzada ' + Wc + ' m · andenes 2 × ' + Wa + ' m · ancho total ' + F(Wt, 2) + ' m · ' + NL + ' carril(es) de diseño · f′c = ' + fc + ' MPa · fy = ' + fy + ' MPa',
                'Espesor mínimo (losa con refuerzo paralelo al tráfico, simple): 1.2(S+3000)/30 = ' + F(hmin, 0) + ' mm → h = ' + h + ' mm',
                'Carga muerta (franja de 1 m): DC = 24·h = ' + F(wdc, 2) + ' kN/m · DW (asfalto 75 mm) = ' + F(WDW, 2) + ' kN/m → M_DC = ' + F(Mdc, 1) + ' · M_DW = ' + F(Mdw, 1) + ' kN·m/m',
                'Carga viva: camión HL-93/CC-14 (35-145-145 kN), tándem (110+110 kN @ 1.2 m) y carril 9.3 kN/m; incremento dinámico 33 % solo en camión/tándem. Rige: ' + env.M.tipo + ' + carril (a x = ' + F(env.M.x, 2) + ' m)',
                'Por carril: M_vehículo(+IM) = ' + F(env.M.v, 1) + ' kN·m · M_carril = ' + F(env.M.l, 1) + ' kN·m · V_apoyo = ' + F(env.V.v + env.V.l, 1) + ' kN',
                'Ancho de franja: 1 carril E = 250 + 0.42√(L1·W1) = ' + F(E1, 2) + ' m (factor de presencia múltiple 1.2) · varios carriles E = ' + F(EM, 2) + ' m (m = ' + m + ')',
                'M_LL por metro (rige ' + (Mll1 >= MllM ? '1 carril' : NL + ' carriles') + ') = ' + F(Mll, 1) + ' kN·m/m',
                'Resistencia I: Mu = 1.25 DC + 1.5 DW + 1.75 (LL+IM) = ' + F(Mu, 1) + ' kN·m/m · Vu = ' + F(Vu, 1) + ' kN/m',
                'd = h − 50 − db/2 = ' + F(d, 0) + ' mm · As req = ' + F(na.Areq, 0) + ' mm²/m (mín. ' + F(na.Amin, 0) + ') → #' + row.no + ' @ ' + sMain + ' mm, As = ' + F(Asp, 0) + ' mm²/m · φMn = ' + F(phiMn(Asp, 1000, d, fc, fy), 1) + ' kN·m/m',
                'Cortante: φVc = ' + F(phiVc, 1) + ' kN/m ' + (Vu <= phiVc ? '≥ Vu → OK sin estribos' : '< Vu → NO CUMPLE'),
                'Refuerzo de distribución (transversal) = 3840/√S = ' + F(pctD, 0) + ' % del principal → #' + rowD.no + ' @ ' + Math.max(100, Math.floor(rowD.s / 25) * 25) + ' mm · retracción y temperatura (cara superior) ≥ 0.0018·b·h = ' + F(AsT, 0) + ' mm²/m',
                'Apoyos: ' + (kind === 1 ? 'elastoméricos (neopreno) en ambos estribos' : 'pasador fijo en un estribo y rodillo móvil en el otro') + ' · Junta de dilatación en el extremo móvil.',
                'NO verificado: sismo (CCP-14), diseño de apoyos y estribos, barandas, andenes, deflexión de carga viva (L/800), fatiga, flexión transversal ni voladizos.');
            /* dibujo: elevación + sección */
            D = new Draw(th); var tri = th * 2.4, hh = h, gap = th * 14;
            D.text(0, hh + th * 9, 'PUENTE DE LOSA MACIZA — ELEVACION Y SECCION TRANSVERSAL (mm)', { h: th * 1.4 });
            D.text(0, hh + th * 7, 'L = ' + L + ' m · calzada ' + Wc + ' m · h = ' + h + ' mm · f′c ' + fc + ' MPa · fy ' + fy + ' MPa', { h: th * 0.9 });
            D.rect(0, 0, Lmm, hh, 'CONTORNO'); D.rect(-th * 5, -th * 8, th * 5, hh + th * 8, 'CONTORNO'); D.rect(Lmm, -th * 8, th * 5, hh + th * 8, 'CONTORNO'); D.hatch(-th * 5, -th * 8, th * 5, hh + th * 8, th * 2); D.hatch(Lmm, -th * 8, th * 5, hh + th * 8, th * 2);
            bearing(D, 0, 0, tri, kind, true); bearing(D, Lmm, 0, tri, kind, false);
            D.line(60, 50 + 13, Lmm - 60, 50 + 13, 'ARMADURA'); D.line(60, hh - 50, Lmm - 60, hh - 50, 'ARMADURA');
            D.text(Lmm / 2, hh / 2, 'ARMADURA PRINCIPAL #' + row.no + ' @ ' + sMain + ' (inferior)', { ha: 1, va: 2, h: th * 0.8 });
            D.dim(0, hh, Lmm, hh, th * 2.2, 'L = ' + F(Lmm) + ' (luz entre ejes de apoyo)'); D.dim(Lmm + th * 5, 0, Lmm + th * 5, hh, th * 2, 'h = ' + h);
            var X0 = Lmm + th * 5 + gap, Y0 = 0, Wmm = Wt * 1000, aMm = Wa * 1000, cMm = Wc * 1000;
            D.rect(X0, Y0, Wmm, hh, 'CONTORNO'); D.rect(X0, Y0 + hh, aMm, 200, 'CONTORNO'); D.rect(X0 + Wmm - aMm, Y0 + hh, aMm, 200, 'CONTORNO');
            D.line(X0 + aMm, Y0 + hh + 15, X0 + aMm + cMm, Y0 + hh + 15, 'ASFALTO', 5); D.line(X0 + aMm + cMm / 2, Y0 + hh, X0 + aMm + cMm / 2, Y0 + hh + 60, 'EJES');
            var nbar = Math.min(40, Math.max(6, Math.round(Wmm / sMain))), i2;
            for (i2 = 0; i2 < nbar; i2++) D.circle(X0 + 80 + (Wmm - 160) * i2 / (nbar - 1), Y0 + 63, BARS[row.no][0] / 2 * 1.3, 'ARMADURA');
            D.dim(X0, Y0, X0 + Wmm, Y0, -th * 2.2, 'ancho total = ' + F(Wmm)); D.dim(X0, Y0 + hh + 200, X0 + aMm, Y0 + hh + 200, th * 1.4, F(aMm)); D.dim(X0 + aMm, Y0 + hh + 200, X0 + aMm + cMm, Y0 + hh + 200, th * 1.4, 'calzada ' + F(cMm)); D.dim(X0 + aMm + cMm, Y0 + hh + 200, X0 + Wmm, Y0 + hh + 200, th * 1.4, F(aMm));
            D.text(X0 + Wmm / 2, Y0 - th * 6, 'SECCION TRANSVERSAL', { ha: 1, h: th * 1.1 });
            var Lb = Lmm + 2 * 300, wB = Wmm / 1000;
            bom.rows.push(bomRow('Losa', 'P-1', row.no, Math.ceil(Wmm / sMain) + 1, Lmm + 600), bomRow('Losa', 'D-1', rowD.no, Math.ceil(Lmm / Math.max(100, Math.floor(rowD.s / 25) * 25)) + 1, Wmm - 100));
            info = { h: h, Mu: Mu, Vu: Vu, As: Asp };
        } else {
            /* ===================== VIGAS + LOSA (viga interior) ===================== */
            var Sp = Wt / (NB - 0.3), Smm = Sp * 1000, ts = Math.max(190, Math.ceil((Smm + 3000) / 30 / 5) * 5), hb = Math.max(900, Math.ceil(0.075 * Lmm / 50) * 50), bw = Math.max(350, Math.ceil(hb / 3 / 50) * 50);
            if (hb - ts < 400) hb = ts + 500;
            var wslab = Sp * ts / 1000 * 24, wweb = bw / 1000 * (hb - ts) / 1000 * 24, wbar = 2 * 5 / NB, wdc2 = wslab + wweb + wbar, wdw2 = WDW * Wc / NB;
            var Kg = 1.0, g1 = 0.06 + Math.pow(Smm / 4300, 0.4) * Math.pow(Smm / Lmm, 0.3) * Math.pow(Kg, 0.1), g2 = 0.075 + Math.pow(Smm / 2900, 0.6) * Math.pow(Smm / Lmm, 0.2) * Math.pow(Kg, 0.1), gM = NL === 1 ? g1 : Math.max(g1, g2);
            var gV1 = 0.36 + Smm / 7600, gV2 = 0.2 + Smm / 3600 - Math.pow(Smm / 10700, 2), gV = NL === 1 ? gV1 : Math.max(gV1, gV2);
            var Mdc2 = wdc2 * L * L / 8, Mdw2 = wdw2 * L * L / 8, Vdc2 = wdc2 * L / 2, Vdw2 = wdw2 * L / 2, Mll2 = gM * (env.M.v + env.M.l), Vll2 = gV * (env.V.v + env.V.l);
            Mu = 1.25 * Mdc2 + 1.5 * Mdw2 + 1.75 * Mll2; Vu = 1.25 * Vdc2 + 1.5 * Vdw2 + 1.75 * Vll2;
            var beff = Math.min(Lmm / 4, 12 * ts + bw, Smm), rows = 1, d2 = hb - 50 - 12 - 12.7, na2, nB, nPer = Math.max(2, Math.floor((bw - 2 * (50 + 12) + 38) / (25.4 + 38.1))), k2;
            for (k2 = 0; k2 < 4; k2++) { na2 = needAs(Mu, beff, d2, fc, fy); nB = Math.ceil(na2.As / BARS[8][1]); rows = Math.max(1, Math.ceil(nB / nPer)); d2 = hb - 50 - 12 - 12.7 - (rows - 1) * (25.4 + 25) / 2; }
            if (!na2.ok) return fail('La sección propuesta (h = ' + hb + ' mm) no alcanza para Mu = ' + F(Mu, 0) + ' kN·m: reduce la luz o aumenta el número de vigas.');
            var Asp2 = nB * BARS[8][1], aStress = Asp2 * fy / (0.85 * fc * beff), phiM = phiMn(Asp2, beff, d2, fc, fy), dvs = Math.max(0.9 * d2, 0.72 * hb), st = stir(Vu * (1 - dvs / 1000 / (L / 2)), bw, dvs, fc, fy, 12.7);
            if (aStress > ts) warns.push('a = ' + F(aStress, 0) + ' mm > ts = ' + ts + ' mm: el bloque de compresión entra en el alma (comportamiento de viga T); revisa con el módulo de vigas T.');
            if (nB > 3 * nPer) warns.push('Se requieren ' + nB + ' barras #8 (más de 3 capas): conviene aumentar el peralte o usar acero preesforzado.');
            if (!st.ok) warns.push('Vs excede el límite: aumenta bw o el peralte.');
            memo.push('PUENTE DE VIGAS + LOSA — PREDIMENSIONAMIENTO (educativo, tipo AASHTO LRFD / CCP-14 + ACI 318)', AVISO,
                'Datos: luz L = ' + L + ' m (apoyos simples) · calzada ' + Wc + ' m · andenes 2 × ' + Wa + ' m · ancho total ' + F(Wt, 2) + ' m · ' + NB + ' vigas · ' + NL + ' carril(es) · f′c = ' + fc + ' MPa · fy = ' + fy + ' MPa',
                'Geometría: separación S = ' + F(Smm, 0) + ' mm (voladizos 0.35 S) · losa ts = ' + ts + ' mm (≥ (S+3000)/30 y ≥ 190) · viga h = ' + hb + ' mm (≈ 0.075 L) × bw = ' + bw + ' mm',
                'Carga muerta por viga interior: losa ' + F(wslab, 2) + ' + alma ' + F(wweb, 2) + ' + barandas ' + F(wbar, 2) + ' = DC ' + F(wdc2, 2) + ' kN/m · DW (asfalto 75 mm) ' + F(wdw2, 2) + ' kN/m',
                'Carga viva por carril: M_veh(+IM) = ' + F(env.M.v, 1) + ' + M_carril = ' + F(env.M.l, 1) + ' kN·m (rige ' + env.M.tipo + ') · V_apoyo = ' + F(env.V.v + env.V.l, 1) + ' kN',
                'Factores de distribución (viga interior, con Kg/(L·ts³) ≈ 1.0): g_momento = ' + F(gM, 3) + ' · g_cortante = ' + F(gV, 3),
                'M_LL por viga = g·(M_veh + M_carril) = ' + F(Mll2, 1) + ' kN·m · V_LL = ' + F(Vll2, 1) + ' kN',
                'Resistencia I: Mu = 1.25 DC + 1.5 DW + 1.75 (LL+IM) = ' + F(Mu, 1) + ' kN·m · Vu(apoyo) = ' + F(Vu, 1) + ' kN',
                'Ancho efectivo del ala: b_ef = mín(L/4, 12·ts + bw, S) = ' + F(beff, 0) + ' mm · d = ' + F(d2, 0) + ' mm',
                'As req = ' + F(na2.Areq, 0) + ' mm² (mín. ' + F(na2.Amin, 0) + ') → ' + nB + ' Ø#8 en ' + rows + ' capa(s), As = ' + F(Asp2, 0) + ' mm² · a = ' + F(aStress, 0) + ' mm ' + (aStress <= ts ? '≤ ts (comportamiento rectangular)' : '> ts') + ' · φMn = ' + F(phiM, 1) + ' kN·m ' + (phiM >= Mu ? '≥ Mu OK' : '< Mu NO CUMPLE'),
                'Cortante a dv: Vu = ' + F(st.Vu, 1) + ' kN · φVc = ' + F(st.phiVc, 1) + ' kN → estribos Ø#4 de 2 ramas: extremos @ ' + st.sEnd + ' mm · centro @ ' + st.sMid + ' mm',
                'Apoyos: ' + (kind === 1 ? 'elastoméricos (neopreno) bajo cada viga' : 'pasador fijo en un estribo y rodillo móvil en el otro') + ' · Junta de dilatación en el extremo móvil.',
                'NO verificado: sismo (CCP-14), diseño de apoyos y estribos, vigas exteriores, diafragmas, losa del tablero (flexión transversal), deflexión de carga viva (L/800), fatiga ni torsión.');
            if (phiM < Mu) warns.push('φMn < Mu: aumenta el refuerzo o el peralte.');
            D = new Draw(th); var tri2 = th * 2.4, Wm = Wt * 1000;
            D.text(0, hb + th * 9, 'PUENTE DE VIGAS Y LOSA — ELEVACION Y SECCION TRANSVERSAL (mm)', { h: th * 1.4 });
            D.text(0, hb + th * 7, 'L = ' + L + ' m · ' + NB + ' vigas ' + bw + '×' + hb + ' · losa ' + ts + ' mm · f′c ' + fc + ' MPa · fy ' + fy + ' MPa', { h: th * 0.9 });
            D.rect(0, 0, Lmm, hb, 'CONTORNO'); D.line(0, hb - ts, Lmm, hb - ts, 'CONTORNO'); D.rect(-th * 5, -th * 8, th * 5, hb + th * 8, 'CONTORNO'); D.rect(Lmm, -th * 8, th * 5, hb + th * 8, 'CONTORNO'); D.hatch(-th * 5, -th * 8, th * 5, hb + th * 8, th * 2); D.hatch(Lmm, -th * 8, th * 5, hb + th * 8, th * 2);
            bearing(D, 0, 0, tri2, kind, true); bearing(D, Lmm, 0, tri2, kind, false);
            D.line(80, 62, Lmm - 80, 62, 'ARMADURA'); D.text(Lmm / 2, hb * 0.35, 'ARMADURA INFERIOR: ' + nB + ' Ø#8 (' + rows + ' capa/s)', { ha: 1, va: 2, h: th * 0.8 });
            D.text(Lmm / 2, hb * 0.18, 'ESTRIBOS Ø#4: ' + st.sEnd + ' mm en extremos · ' + st.sMid + ' mm al centro', { ha: 1, va: 2, h: th * 0.7 });
            D.dim(0, hb, Lmm, hb, th * 2.2, 'L = ' + F(Lmm)); D.dim(Lmm + th * 5, 0, Lmm + th * 5, hb, th * 2, 'h = ' + hb);
            var X1 = Lmm + th * 5 + th * 14, Y1 = 0, ovh = 0.35 * Smm, i3;
            D.rect(X1, Y1 + hb - ts, Wm, ts, 'CONTORNO');
            for (i3 = 0; i3 < NB; i3++) { var xc = X1 + ovh + i3 * Smm; D.rect(xc - bw / 2, Y1, bw, hb - ts, 'CONTORNO'); D.rect(xc - bw / 2 + 50, Y1 + 50, bw - 100, hb - ts - 50, 'ARMADURA', 3); }
            D.line(X1 + Wa * 1000, Y1 + hb + 15, X1 + Wa * 1000 + Wc * 1000, Y1 + hb + 15, 'ASFALTO', 5); D.rect(X1, Y1 + hb, Wa * 1000, 180, 'CONTORNO'); D.rect(X1 + Wm - Wa * 1000, Y1 + hb, Wa * 1000, 180, 'CONTORNO');
            D.dim(X1, Y1, X1 + Wm, Y1, -th * 2.2, 'ancho total = ' + F(Wm)); D.dim(X1 + ovh, Y1 - th * 6, X1 + ovh + Smm, Y1 - th * 6, -th * 1.2, 'S = ' + F(Smm)); D.dim(X1 + Wm + th * 2, Y1 + hb - ts, X1 + Wm + th * 2, Y1 + hb, th * 2, 'ts = ' + ts);
            D.text(X1 + Wm / 2, Y1 - th * 12, 'SECCION TRANSVERSAL', { ha: 1, h: th * 1.1 });
            bom.rows.push(bomRow('Viga', 'V-1', 8, nB * NB, Lmm + 400), bomRow('Viga', 'E-1', 4, (Math.ceil(2 * 2 * hb / st.sEnd) + Math.ceil((Lmm - 4 * hb) / st.sMid) + 1) * NB, 2 * (bw - 100) + 2 * (hb - ts - 50) + 200));
            info = { h: hb, Mu: Mu, Vu: Vu, As: Asp2 };
        }
        D.layers.APOYOS = { name: 'APOYOS', aci: 3 }; D.layers.ASFALTO = { name: 'ASFALTO', aci: 8 };
        var mdl = finish(D, tipo === 1 ? 'PUENTE DE LOSA MACIZA L=' + L + ' m' : 'PUENTE DE VIGAS Y LOSA L=' + L + ' m', bom, { noTable: false });
        return { ok: true, warns: warns, memo: memo, model: mdl, bom: bom, calc: info };
    };

    /* ====================== Atención desde el chat (sin IA) ====================== */
    function norm(s) { s = String(s || '').toLowerCase(); try { s = s.normalize('NFD').replace(/[̀-ͯ]/g, ''); } catch (e) { } return s; }
    function nx(m) { return m ? parseFloat(String(m).replace(',', '.')) : NaN; }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
    function parseParams(q) {
        var o = {}, m;
        if ((m = q.match(/(?:luz|longitud)\s*(?:de|=)?\s*(\d+(?:[.,]\d+)?)/)) || (m = q.match(/(\d+(?:[.,]\d+)?)\s*(?:m|metros?)\s*de\s*(?:luz|longitud)/)) || (m = q.match(/puente[^.\d]{0,40}?(\d+(?:[.,]\d+)?)\s*(?:m|metros?)\b/))) o.L = nx(m[1]);
        if ((m = q.match(/(?:calzada|ancho)\s*(?:de|=)?\s*(\d+(?:[.,]\d+)?)/))) o.Wc = nx(m[1]);
        if ((m = q.match(/and[eé]n(?:es)?\s*(?:de|=)?\s*(\d+(?:[.,]\d+)?)/))) o.Wa = nx(m[1]);
        if ((m = q.match(/(\d)\s*vigas/))) { o.NB = +m[1]; o.tipo = 2; }
        if (/vigas?\s*(?:y|\+|con)\s*losa|viga[- ]losa|vigas?\s*t\b|tablero\s*sobre\s*vigas|de vigas/.test(q)) o.tipo = 2;
        if (/losa\s*maciza|puente\s*(?:de\s*)?losa/.test(q) && !/vigas/.test(q)) o.tipo = 1;
        if ((m = q.match(/f['’´]?c\s*(?:=|de)?\s*(\d+)/))) { var v = +m[1]; if ([17, 21, 24, 28, 35, 42].indexOf(v) >= 0) o.fc = v; }
        if (/pasador|rodillo|articulad/.test(q)) o.apoyo = 2; if (/neopreno|elastomer/.test(q)) o.apoyo = 1;
        return o;
    }
    function parsePortico(q) {
        var o = {}, m;
        if ((m = q.match(/(\d)\s*pisos?/))) o.pisos = Math.min(2, Math.max(1, +m[1]));
        if ((m = q.match(/(\d)\s*vanos?/))) o.vanos = Math.min(2, Math.max(1, +m[1]));
        if ((m = q.match(/vanos?\s*de\s*(\d+(?:[.,]\d+)?)/)) || (m = q.match(/(?:luz|longitud)\s*(?:de)?\s*(\d+(?:[.,]\d+)?)/))) o.Lv = nx(m[1]);
        if ((m = q.match(/altura\s*(?:de\s*(?:piso|entrepiso))?\s*(?:de|=)?\s*(\d+(?:[.,]\d+)?)/)) || (m = q.match(/(\d+(?:[.,]\d+)?)\s*m\s*por\s*piso/))) o.Hp = nx(m[1]);
        if (/base\s*(?:articulada|con pasador)|articulad[ao]s?\s*en\s*la\s*base|apoyos?\s*articulad/.test(q)) o.base = 2; else if (/empotrad/.test(q)) o.base = 1;
        return o;
    }
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function cardFor(titulo, intro, r, nm, resumen) {
        var chat = document.getElementById('chatMensajes'); if (!chat) return;
        var card = el('div', 'mensaje mensaje-bot mensaje-bot-rich cx-card'); chat.appendChild(card);
        var b = el('div', 'civix-md'); b.innerHTML = intro; card.appendChild(b);
        r.warns.forEach(function (w) { card.appendChild(el('p', 'cxp-warn', '⚠ ' + esc(w))); });
        var bar = el('div', 'cxs-row'), host = el('div', 'cx-box'); card.appendChild(bar); card.appendChild(host);
        CAD.viewer(host, r.model, { name: nm, extra: 'Dibujo en mm · el botón <b>⬇ DXF</b> descarga el plano para AutoCAD / Civil 3D.' });
        function btn(label, fn) { var x = el('button', 'cx-btn', label); x.type = 'button'; x.style.marginRight = '6px'; x.addEventListener('click', function () { try { fn(x); } catch (e) { x.textContent = '⚠ ' + (e.message || 'error'); } }); bar.appendChild(x); }
        btn('⬇ Descargar DXF', function () { CAD.download(nm + '.dxf', new Blob([CAD.writeDXF(r.model)], { type: 'application/dxf' })); });
        btn('⬇ Memoria .pdf', function () { CAD.download(nm + '_memoria.pdf', S.memoPDF(r.memo, 'MEMORIA DE CALCULO — ' + titulo.toUpperCase())); });
        btn('📄 Lámina PDF', function (x) { var m = S.lamina(r, { titulo: titulo.toUpperCase() }); CAD.exportRaster(m, 'pdf', nm + '_lamina'); x.textContent = '📄 Lámina PDF ✓'; });
        var memo = el('details', 'cxp-memo'); memo.innerHTML = '<summary>Memoria de cálculo</summary><pre>' + esc(r.memo.join('\n')) + '</pre>'; card.appendChild(memo);
        try { if (typeof chatHistory !== 'undefined') { chatHistory.push({ role: 'user', content: global.__cxLastUser || titulo }); chatHistory.push({ role: 'assistant', content: resumen }); } if (typeof civixGuardarConversacionActual === 'function') civixGuardarConversacionActual(); } catch (e) { }
        chat.scrollTop = chat.scrollHeight;
    }
    var prevSend = CAD.onSend;
    CAD.onSend = function (texto, adj) {
        try {
            var q = norm(texto);
            if (q && !adj && /dise[nñ]|dibuj|calcul|predimension|haz\b|hazme|genera|crea\b|elabora|dame\s+un|quiero\s+un|necesito\s+un/.test(q) && !/^(que|como|cual|por que|explica)/.test(q.trim())) {
                global.__cxLastUser = texto;
                if (/puente/.test(q)) {
                    var p = parseParams(q), o = { tipo: p.tipo || 1, L: clamp(p.L || 10, 3, 30), Wc: clamp(p.Wc || 7.2, 3.6, 14), Wa: clamp(p.Wa != null ? p.Wa : 0.8, 0, 2), NB: p.NB || 4, fc: p.fc || 28, apoyo: p.apoyo || 1 };
                    if (o.tipo === 1 && o.L > 14) o.tipo = 2;
                    var r = S.puente(o);
                    if (r && r.ok) {
                        var intro = '🌉 Diseñé un <b>puente ' + (o.tipo === 1 ? 'de losa maciza' : 'de vigas y losa') + '</b> de <b>' + o.L + ' m</b> (calzada ' + o.Wc + ' m, andenes ' + o.Wa + ' m) con carga vehicular tipo HL-93 / CC-14. Resultado: <b>' + (o.tipo === 1 ? 'h = ' + r.calc.h + ' mm' : 'viga de ' + r.calc.h + ' mm') + '</b>, Mu = ' + F(r.calc.Mu, 0) + ' kN·m' + (o.tipo === 1 ? '/m' : '') + '. Lo calculé en tu navegador (sin gastar tokens). Para cambiar luz, ancho, tipo o apoyos usa <b>Planos y CAD → Diseño estructural → Puentes</b>.';
                        cardFor('Puente', intro, r, 'puente_civix', 'Diseñé un puente ' + (o.tipo === 1 ? 'de losa maciza' : 'de vigas y losa') + ' de ' + o.L + ' m (predimensionamiento académico): ' + r.memo.slice(2, 12).join(' · ').slice(0, 900));
                        return true;
                    }
                } else if (/portico/.test(q)) {
                    var pp = parsePortico(q), po = { pisos: pp.pisos || 2, vanos: pp.vanos || 2, Lv: clamp(pp.Lv || 5, 2.5, 9), Hp: clamp(pp.Hp || 3, 2.4, 5), base: pp.base || 1 };
                    var rp = S.portico(po);
                    if (rp && rp.ok) {
                        cardFor('Pórtico plano', '🏢 Calculé un <b>pórtico plano de ' + po.pisos + ' piso(s) y ' + po.vanos + ' vano(s)</b> (vano ' + po.Lv + ' m, piso ' + po.Hp + ' m, base ' + (po.base === 1 ? 'empotrada' : 'articulada') + ') con el método matricial de rigidez: diagramas de momento, cortante y axial y plano DXF. Se hace en tu navegador, sin tokens. Puedes cambiar secciones, cargas y apoyo en <b>Planos y CAD → Diseño estructural → Pórticos</b>.', rp, 'portico_civix', 'Calculé un pórtico plano de ' + po.pisos + ' piso(s) y ' + po.vanos + ' vano(s) (predimensionamiento académico): ' + rp.memo.slice(0, 8).join(' · ').slice(0, 900));
                        return true;
                    }
                }
            }
        } catch (e) { try { console.warn('CivixCAD puente/portico', e); } catch (e2) { } }
        return prevSend ? prevSend.apply(this, arguments) : false;
    };
})(typeof window !== 'undefined' ? window : globalThis);
