/**
 * Civix CAD — predimensionamiento estructural con plano DXF (sin IA, sin gastar tokens).
 *   CivixCAD.struct.viga(o) · columna(o) · zapata(o) · muro(o)
 * Cada función devuelve { ok, warns[], memo[], model } donde model se dibuja con CivixCAD.viewer
 * y se exporta con CivixCAD.writeDXF. Unidades del dibujo: mm.
 *
 * ALCANCE: predimensionamiento educativo según los principios de ACI 318 / NSR-10 (flexión con
 * φ = 0.90, cortante con φ = 0.75, columnas con estribos φ = 0.65, límites de cuantía). NO sustituye
 * el diseño completo: no incluye combinaciones de carga reglamentarias completas, deflexiones,
 * sismo, longitud de desarrollo, ni esbeltez. Debe ser revisado por el docente o ingeniero responsable.
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD) return;
    var S = {}, PI = Math.PI;
    var BARS = { 3: [9.5, 71], 4: [12.7, 129], 5: [15.9, 199], 6: [19.1, 284], 7: [22.2, 387], 8: [25.4, 510] };
    function f0(v, d) { return (+v).toFixed(d == null ? 0 : d); }
    function fl(v, st) { return Math.floor(v / st + 1e-9) * st; }
    function cl(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function beta1(fc) { return fc <= 28 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 28) / 7); }

    /* flexión rectangular: As (mm²) para Mu (kN·m), ancho b y peralte d (mm) */
    function asFlex(Mu, b, d, fc, fy) {
        var Rn = Mu * 1e6 / (0.9 * b * d * d), disc = 1 - 2 * Rn / (0.85 * fc);
        if (disc <= 0) return { ok: false, Rn: Rn };
        var rho = 0.85 * fc / fy * (1 - Math.sqrt(disc)), rmin = Math.max(0.25 * Math.sqrt(fc) / fy, 1.4 / fy), rmax = 0.85 * beta1(fc) * fc / fy * 0.375;
        return { ok: true, Rn: Rn, rho: rho, As: Math.max(rho, rmin) * b * d, asMin: rmin * b * d, rmax: rmax, overMax: rho > rmax, minGoverns: rho < rmin };
    }
    function phiMn(As, b, d, fc, fy) { var a = As * fy / (0.85 * fc * b); return 0.9 * As * fy * (d - a / 2) / 1e6; }

    /* ---------- utilidades de dibujo ---------- */
    function Draw(th) {
        this.th = th; this.ents = [];
        this.layers = { 'CONCRETO': { name: 'CONCRETO', aci: 7 }, 'ACERO-LONG': { name: 'ACERO-LONG', aci: 1 }, 'ESTRIBOS': { name: 'ESTRIBOS', aci: 3 }, 'COTAS': { name: 'COTAS', aci: 4 }, 'TEXTOS': { name: 'TEXTOS', aci: 2 }, 'EJES': { name: 'EJES', aci: 8 }, 'SUELO': { name: 'SUELO', aci: 30 }, 'APOYOS': { name: 'APOYOS', aci: 5 } };
    }
    Draw.prototype = {
        line: function (x1, y1, x2, y2, ly) { this.ents.push({ t: 'poly', layer: ly || 'CONCRETO', pts: [[x1, y1, 0], [x2, y2, 0]], closed: false }); },
        poly: function (pts, closed, ly) { this.ents.push({ t: 'poly', layer: ly || 'CONCRETO', pts: pts.map(function (p) { return [p[0], p[1], 0]; }), closed: !!closed, keepPoly: true }); },
        rect: function (x, y, w, h, ly) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, ly); },
        circle: function (x, y, r, ly) { this.ents.push({ t: 'circle', layer: ly || 'ACERO-LONG', c: [x, y, 0], r: r }); },
        text: function (x, y, s, o) { o = o || {}; this.ents.push({ t: 'text', layer: o.layer || 'TEXTOS', p: [x, y, 0], h: o.h || this.th, s: String(s).split('\n'), rot: o.rot || 0, ha: o.ha || 0, va: o.va || 0 }); },
        dim: function (x1, y1, x2, y2, off, label) {
            var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, e = this.th * 0.5, k = this.th * 0.35, sg = off >= 0 ? 1 : -1;
            var ax = x1 + nx * off, ay = y1 + ny * off, bx = x2 + nx * off, by = y2 + ny * off;
            this.line(x1 + nx * sg * this.th * 0.3, y1 + ny * sg * this.th * 0.3, ax + nx * sg * e, ay + ny * sg * e, 'COTAS'); this.line(x2 + nx * sg * this.th * 0.3, y2 + ny * sg * this.th * 0.3, bx + nx * sg * e, by + ny * sg * e, 'COTAS'); this.line(ax, ay, bx, by, 'COTAS');
            this.line(ax - ux * k - nx * k, ay - uy * k - ny * k, ax + ux * k + nx * k, ay + uy * k + ny * k, 'COTAS'); this.line(bx - ux * k - nx * k, by - uy * k - ny * k, bx + ux * k + nx * k, by + uy * k + ny * k, 'COTAS');
            var ang = Math.atan2(uy, ux); if (ang > PI / 2 + 1e-9 || ang < -PI / 2 - 1e-9) ang += PI;
            this.text((ax + bx) / 2 + nx * sg * this.th * 0.25, (ay + by) / 2 + ny * sg * this.th * 0.25, label == null ? f0(L) : label, { layer: 'COTAS', ha: 1, va: sg > 0 ? 0 : 3, rot: ang });
        },
        model: function () { var m = { ents: this.ents, layers: this.layers, warn: [], units: 4, blocks: {} }; m.bbox = CAD.bboxOf(this.ents); return m; }
    };
    function barPositions(n, b, h, cov) { // coordenadas de n barras en el perímetro (esquinas + caras)
        var xs0 = cov, xs1 = b - cov, ys0 = cov, ys1 = h - cov, p = [[xs0, ys0], [xs1, ys0], [xs1, ys1], [xs0, ys1]];
        var r2 = Math.max(0, (n - 4) / 2), kx = Math.round(r2 * b / (b + h)), ky = Math.round(r2 - kx), i;
        for (i = 1; i <= kx; i++) { var x = xs0 + (xs1 - xs0) * i / (kx + 1); p.push([x, ys0]); p.push([x, ys1]); }
        for (i = 1; i <= ky; i++) { var y = ys0 + (ys1 - ys0) * i / (ky + 1); p.push([xs0, y]); p.push([xs1, y]); }
        return p;
    }

    /* ============================ VIGA ============================ */
    S.viga = function (o) {
        o = Object.assign({ L: 6, b: 300, h: 500, wD: 12, wL: 8, fc: 21, fy: 420, rec: 40 }, o || {});
        var warns = [], memo = [], est = 9.5, rec = o.rec, b = o.b, h = o.h, Lmm = o.L * 1000, fc = o.fc, fy = o.fy;
        var wself = 24 * (b / 1000) * (h / 1000), wu = 1.2 * (o.wD + wself) + 1.6 * o.wL, Mu = wu * o.L * o.L / 8, Vu0 = wu * o.L / 2;
        var d = h - rec - est - 19.1 / 2, af = asFlex(Mu, b, d, fc, fy), bar = null, nb = 0, k;
        if (!af.ok) return { ok: false, warns: ['La sección b × h es insuficiente para Mu = ' + f0(Mu, 1) + ' kN·m (la sección no admite refuerzo simple). Aumenta h o b.'], memo: [], model: null };
        var order = [4, 5, 6, 7, 8], pick = null, last = null;
        order.forEach(function (no) {
            if (pick) return; var db = BARS[no][0], Ab = BARS[no][1];
            for (var n = 2; n <= 8; n++) { if (n * Ab < af.As) continue; var clear = (b - 2 * (rec + est) - n * db) / (n - 1); if (clear >= Math.max(25, db)) { last = { no: no, n: n }; if (n <= 4) pick = last; break; } }
        });
        pick = pick || last; if (!pick) return { ok: false, warns: ['No caben las barras requeridas en el ancho b = ' + b + ' mm. Aumenta b.'], memo: [], model: null };
        bar = BARS[pick.no]; nb = pick.n; d = h - rec - est - bar[0] / 2;
        var af2 = asFlex(Mu, b, d, fc, fy), Asreq = af2.ok ? af2.As : af.As, Asprov = nb * bar[1], pMn = phiMn(Asprov, b, d, fc, fy);
        if (af2.overMax) warns.push('ρ = ' + f0(af2.rho * 100, 2) + ' % supera ρmáx (εt ≥ 0.005 → ' + f0(af2.rmax * 100, 2) + ' %): aumenta la sección.');
        if (pMn < Mu) warns.push('φMn = ' + f0(pMn, 1) + ' kN·m < Mu: aumenta el refuerzo o la sección.');
        var Vud = wu * (o.L / 2 - d / 1000), Vc = 0.17 * Math.sqrt(fc) * b * d / 1000, Vs = Math.max(0, Vud / 0.75 - Vc), Av = 2 * BARS[3][1], sCalc = Vs > 0 ? Av * fy * d / (Vs * 1000) : 1e9;
        if (Vs > 0.66 * Math.sqrt(fc) * b * d / 1000) warns.push('Vs excede 0.66√f′c·b·d: la sección es pequeña para el cortante.');
        var sEnd = Math.max(50, fl(Math.min(sCalc, d / 4, 300), 25)), sMid = Math.max(50, fl(Math.min(sCalc, d / 2, 600), 25));
        var defl = o.L * 1000 / (h < 1 ? 1 : h); if (h < Lmm / 16) warns.push('h < L/16: la viga puede requerir verificar deflexiones (no verificadas aquí).');
        memo.push('VIGA SIMPLEMENTE APOYADA — PREDIMENSIONAMIENTO (ACI 318 / NSR-10, educativo)',
            'Datos: L = ' + o.L + ' m · b × h = ' + b + ' × ' + h + ' mm · f′c = ' + fc + ' MPa · fy = ' + fy + ' MPa · rec. = ' + rec + ' mm',
            'Cargas: wD = ' + o.wD + ' + peso propio ' + f0(wself, 2) + ' = ' + f0(o.wD + wself, 2) + ' kN/m · wL = ' + o.wL + ' kN/m',
            'wu = 1.2(D) + 1.6(L) = ' + f0(wu, 2) + ' kN/m  (combinación 1.2D + 1.6L)',
            'Mu = wu·L²/8 = ' + f0(Mu, 1) + ' kN·m · Vu(apoyo) = wu·L/2 = ' + f0(Vu0, 1) + ' kN',
            'd = h − rec − dest − db/2 = ' + f0(d, 0) + ' mm',
            'Rn = Mu/(φ b d²) = ' + f0(af2.Rn, 2) + ' MPa → ρ = ' + f0((af2.rho || 0) * 100, 3) + ' % (ρmin = ' + f0(af2.asMin / (b * d) * 100, 3) + ' %' + (af2.minGoverns ? ' — controla' : '') + ')',
            'As req = ' + f0(Asreq, 0) + ' mm² → colocar ' + nb + ' Ø#' + pick.no + ' (' + bar[0] + ' mm), As = ' + f0(Asprov, 0) + ' mm² · φMn = ' + f0(pMn, 1) + ' kN·m ' + (pMn >= Mu ? '≥ Mu OK' : '< Mu NO CUMPLE'),
            'Cortante: Vu(d) = ' + f0(Vud, 1) + ' kN · φVc = ' + f0(0.75 * Vc, 1) + ' kN → ' + (Vs > 0 ? 'se requiere refuerzo: s = Av·fy·d/Vs = ' + f0(sCalc, 0) + ' mm' : 'concreto resiste; estribos mínimos'),
            'Estribos',
            'NO verificado: deflexiones, longitud de desarrollo, sismo, torsión.');
        memo[memo.length - 2] = 'Estribos Ø#3 (2 ramas): zonas de 2h = ' + (2 * h) + ' mm en cada extremo @ ' + sEnd + ' mm; centro @ ' + sMid + ' mm';
        /* dibujo */
        var th = Math.max(60, Lmm * 0.018), D = new Draw(th), db = bar[0], ye = rec + est / 2;
        D.text(0, h + th * 7, 'VIGA V-1 — ELEVACION Y SECCION (mm)', { h: th * 1.5 });
        D.text(0, h + th * 5, 'L = ' + o.L + ' m · f′c ' + fc + ' MPa · fy ' + fy + ' MPa · rec. ' + rec + ' mm', { h: th * 0.9 });
        D.rect(0, 0, Lmm, h, 'CONCRETO'); var tri = th * 2.2;
        D.poly([[0, 0], [-tri / 2, -tri], [tri / 2, -tri]], true, 'APOYOS'); D.poly([[Lmm, 0], [Lmm - tri / 2, -tri], [Lmm + tri / 2, -tri]], true, 'APOYOS');
        D.line(-tri, -tri, tri, -tri, 'APOYOS'); D.line(Lmm - tri, -tri, Lmm + tri, -tri, 'APOYOS');
        var yb = rec + est + db / 2, yt = h - rec - est - 6.35;
        D.line(rec, yb, Lmm - rec, yb, 'ACERO-LONG'); D.line(rec, yt, Lmm - rec, yt, 'ACERO-LONG'); D.line(rec, yb, rec, yb + 150, 'ACERO-LONG'); D.line(Lmm - rec, yb, Lmm - rec, yb + 150, 'ACERO-LONG');
        var x = 50, cnt = 0; while (x < Lmm - 40 && cnt++ < 600) { D.line(x, rec, x, h - rec, 'ESTRIBOS'); x += (x < 2 * h || x > Lmm - 2 * h) ? sEnd : sMid; }
        D.dim(0, -tri * 1.6, Lmm, -tri * 1.6, -th * 2, f0(Lmm)); D.dim(-tri * 2.5, 0, -tri * 2.5, h, th * 1.0, f0(h));
        D.dim(0, h, 2 * h, h, th * 1.6, '2h = ' + 2 * h); D.dim(2 * h, h, Lmm - 2 * h, h, th * 1.6, 'zona central'); D.dim(Lmm - 2 * h, h, Lmm, h, th * 1.6, '2h = ' + 2 * h);
        D.text(Lmm / 2, yb - th * 2.5, nb + ' Ø#' + pick.no + ' (inferior)', { ha: 1, layer: 'TEXTOS' }); D.text(Lmm / 2, h + th * 4.2, '2 Ø#4 (superior, armado de estribos)', { ha: 1 });
        D.text(2 * h / 2, h / 2, 'E#3 @' + sEnd, { h: th * 0.8, ha: 1, va: 2, rot: PI / 2 }); D.text(Lmm / 2, h / 2, 'E#3 @' + sMid + ' (centro)', { h: th * 0.9, ha: 1, va: 2 });
        /* sección ampliada */
        var ss = Math.max(1, Math.round(Lmm / (3 * h))), sx = Lmm + 2500, sy = 0, sth = th * 0.8;
        function T(px, py) { return [sx + px * ss, sy + py * ss]; }
        D.text(sx, h * ss + th * 3, 'SECCION A-A (esc. ' + ss + '× la elevación)', { h: th }); D.rect(sx, sy, b * ss, h * ss, 'CONCRETO');
        D.rect(sx + rec * ss, sy + rec * ss, (b - 2 * rec) * ss, (h - 2 * rec) * ss, 'ESTRIBOS');
        var xb0 = rec + est + db / 2, xb1 = b - rec - est - db / 2, i; for (i = 0; i < nb; i++) { var px = nb === 1 ? b / 2 : xb0 + (xb1 - xb0) * i / (nb - 1); D.circle(sx + px * ss, sy + yb * ss, db / 2 * ss, 'ACERO-LONG'); }
        D.circle(sx + (rec + est + 6.35) * ss, sy + yt * ss, 6.35 * ss, 'ACERO-LONG'); D.circle(sx + (b - rec - est - 6.35) * ss, sy + yt * ss, 6.35 * ss, 'ACERO-LONG');
        D.dim(sx, sy, sx + b * ss, sy, -sth * 2.4, 'b = ' + b); D.dim(sx + b * ss, sy, sx + b * ss, sy + h * ss, sth * 2.4, 'h = ' + h);
        D.text(sx, sy - sth * 6, nb + ' Ø#' + pick.no + '\n2 Ø#4\nE#3', { h: sth * 1.1 });
        /* cuadro de acero */
        var ty = -tri * 1.6 - th * 8; D.text(0, ty, 'CUADRO DE ACERO', { h: th * 1.1 });
        D.text(0, ty - th * 2, 'Inferior: ' + nb + ' Ø#' + pick.no + ' L = ' + f0(Lmm - 2 * rec + 300, 0) + ' mm (con ganchos)\nSuperior: 2 Ø#4 L = ' + f0(Lmm - 2 * rec, 0) + ' mm\nEstribos Ø#3: perimetro ' + f0(2 * (b - 2 * rec) + 2 * (h - 2 * rec) + 100, 0) + ' mm', { h: th * 0.9 });
        return { ok: true, warns: warns, memo: memo, model: D.model(), calc: { wu: wu, Mu: Mu, Vu: Vu0, d: d, As: Asreq, nBars: nb, bar: pick.no, phiMn: pMn, sEnd: sEnd, sMid: sMid } };
    };

    /* ============================ COLUMNA ============================ */
    S.columna = function (o) {
        o = Object.assign({ Pu: 1500, b: 400, h: 400, Lu: 3, fc: 28, fy: 420, rec: 40 }, o || {});
        var warns = [], memo = [], b = o.b, h = o.h, fc = o.fc, fy = o.fy, Ag = b * h, est = 9.5, rec = o.rec;
        var AstReq = Math.max((o.Pu * 1000 / (0.8 * 0.65) - 0.85 * fc * Ag) / (fy - 0.85 * fc), 0.01 * Ag);
        if (AstReq > 0.04 * Ag) warns.push('ρ = ' + f0(AstReq / Ag * 100, 2) + ' % > 4 %: aumenta la sección (congestión de acero; NSR-10 limita a 4 % en zona sísmica alta).');
        var best = null; [5, 6, 7, 8].forEach(function (no) {
            if (best) return; var db = BARS[no][0], Ab = BARS[no][1];
            for (var n = 4; n <= 16; n += 2) {
                if (n * Ab < AstReq) continue; var kx = Math.round((n - 4) / 2 * b / (b + h)), ky = Math.round((n - 4) / 2 - kx), nx = kx + 2, ny = ky + 2, cx = (b - 2 * (rec + est) - nx * db) / (nx - 1), cy = (h - 2 * (rec + est) - ny * db) / (ny - 1);
                if (cx >= Math.max(40, 1.5 * db) && cy >= Math.max(40, 1.5 * db)) { best = { no: no, n: n }; break; }
            }
        });
        if (!best) return { ok: false, warns: ['No caben las barras necesarias en la sección. Aumenta b × h.'], memo: [], model: null };
        var bar = BARS[best.no], db = bar[0], Ast = best.n * bar[1], rho = Ast / Ag * 100, phiPn = 0.8 * 0.65 * (0.85 * fc * (Ag - Ast) + fy * Ast) / 1000;
        if (phiPn < o.Pu) warns.push('φPn,máx = ' + f0(phiPn, 0) + ' kN < Pu: aumenta la sección.');
        var sMid = Math.max(75, fl(Math.min(16 * db, 48 * est, Math.min(b, h)), 25)), sConf = Math.max(75, fl(Math.min(Math.min(b, h) / 4, 150), 25)), lo = Math.max(Math.max(b, h), o.Lu * 1000 / 6, 450), Lmm = o.Lu * 1000;
        memo.push('COLUMNA RECTANGULAR CON ESTRIBOS — PREDIMENSIONAMIENTO (ACI 318 / NSR-10, educativo)',
            'Datos: Pu = ' + o.Pu + ' kN · b × h = ' + b + ' × ' + h + ' mm · Lu = ' + o.Lu + ' m · f′c = ' + fc + ' MPa · fy = ' + fy + ' MPa',
            'Ag = ' + f0(Ag, 0) + ' mm² · φPn,máx = 0.80 φ [0.85 f′c (Ag − Ast) + fy Ast] con φ = 0.65 (estribos)',
            'Ast requerida = ' + f0(AstReq, 0) + ' mm² (mín. 1 % Ag = ' + f0(0.01 * Ag, 0) + ' mm²)',
            'Colocar ' + best.n + ' Ø#' + best.no + ' (' + db + ' mm): Ast = ' + f0(Ast, 0) + ' mm² · ρ = ' + f0(rho, 2) + ' % · φPn,máx = ' + f0(phiPn, 0) + ' kN ' + (phiPn >= o.Pu ? '≥ Pu OK' : '< Pu NO CUMPLE'),
            'Estribos Ø#3: zona de confinamiento lo = ' + f0(lo, 0) + ' mm en cada extremo @ ' + sConf + ' mm; zona central @ ' + sMid + ' mm',
            'NO verificado: flexocompresión (momentos), esbeltez, sismo, empalmes, nudos.');
        var ss = Math.max(1, Math.floor(Lmm / (2.2 * Math.max(b, h)))), th = Math.max(50, Lmm * 0.022), D = new Draw(th), sth = th * 0.85;
        D.text(0, Lmm + th * 4, 'COLUMNA C-1 — ELEVACION Y SECCION (mm)', { h: th * 1.5 }); D.text(0, Lmm + th * 2, 'Pu = ' + o.Pu + ' kN · f′c ' + fc + ' MPa · fy ' + fy + ' MPa', { h: th * 0.9 });
        D.rect(0, 0, b, Lmm, 'CONCRETO'); D.line(-b * 0.4, 0, b * 1.4, 0, 'CONCRETO');
        D.line(rec + est + db / 2, 0, rec + est + db / 2, Lmm, 'ACERO-LONG'); D.line(b - rec - est - db / 2, 0, b - rec - est - db / 2, Lmm, 'ACERO-LONG');
        var y = 50, c = 0; while (y < Lmm - 30 && c++ < 400) { D.line(rec, y, b - rec, y, 'ESTRIBOS'); y += (y < lo || y > Lmm - lo) ? sConf : sMid; }
        D.dim(0, 0, 0, Lmm, -th * 2.5, f0(Lmm)); D.dim(b, 0, b, lo, th * 2, 'lo = ' + f0(lo, 0)); D.dim(b, Lmm - lo, b, Lmm, th * 2, 'lo = ' + f0(lo, 0));
        D.text(b + th * 3, lo / 2, 'E#3 @' + sConf, { h: th * 0.8, va: 2 }); D.text(b + th * 3, Lmm / 2, 'E#3 @' + sMid, { h: th * 0.8, va: 2 }); D.text(b + th * 3, Lmm - lo / 2, 'E#3 @' + sConf, { h: th * 0.8, va: 2 });
        var sx = b + 2500, sy = Lmm / 2 - h * ss / 2; D.text(sx, sy + h * ss + th * 2, 'SECCION (esc. ' + ss + '× la elevación)', { h: th });
        D.rect(sx, sy, b * ss, h * ss, 'CONCRETO'); D.rect(sx + rec * ss, sy + rec * ss, (b - 2 * rec) * ss, (h - 2 * rec) * ss, 'ESTRIBOS');
        barPositions(best.n, b, h, rec + est + db / 2).forEach(function (p) { D.circle(sx + p[0] * ss, sy + p[1] * ss, db / 2 * ss, 'ACERO-LONG'); });
        D.dim(sx, sy, sx + b * ss, sy, -sth * 2.6, 'b = ' + b); D.dim(sx + b * ss, sy, sx + b * ss, sy + h * ss, sth * 2.6, 'h = ' + h); D.text(sx, sy - sth * 6, best.n + ' Ø#' + best.no + ' (ρ = ' + f0(rho, 2) + ' %)\nEstribos Ø#3', { h: sth * 1.1 });
        return { ok: true, warns: warns, memo: memo, model: D.model(), calc: { AstReq: AstReq, nBars: best.n, bar: best.no, rho: rho, phiPn: phiPn, sConf: sConf, sMid: sMid, lo: lo } };
    };

    /* ============================ ZAPATA AISLADA ============================ */
    S.zapata = function (o) {
        o = Object.assign({ P: 800, qadm: 150, c1: 400, c2: 400, fc: 21, fy: 420, Df: 1.5 }, o || {});
        var warns = [], memo = [], fc = o.fc, fy = o.fy, c1 = o.c1, c2 = o.c2, A = o.P * 1.10 / o.qadm, Bm = Math.ceil(Math.sqrt(A) / 0.05) * 0.05, B = Bm * 1000, Pu = 1.4 * o.P, qu = Pu / (Bm * Bm);
        var d = 200, ok = false; for (; d <= 1500; d += 10) {
            var bo = 2 * (c1 + d) + 2 * (c2 + d), Vp = qu * (Bm * Bm - (c1 + d) * (c2 + d) / 1e6), phiVc = 0.75 * 0.33 * Math.sqrt(fc) * bo * d / 1000;
            var Vone = qu * Bm * ((B - c1) / 2 - d) / 1000, phiV1 = 0.75 * 0.17 * Math.sqrt(fc) * B * d / 1000;
            if (Vp <= phiVc && Vone <= phiV1) { ok = true; break; }
        }
        if (!ok) return { ok: false, warns: ['No se encontró un espesor razonable (> 1500 mm). Revisa carga y capacidad portante.'], memo: [], model: null };
        var dbAs = 15.9, h = Math.ceil((d + 75 + dbAs / 2) / 50) * 50, dEf = h - 75 - dbAs / 2;
        var Mu = qu * Bm * Math.pow((B - c1) / 2000, 2) / 2, af = asFlex(Mu, B, dEf, fc, fy), Asmin = 0.0018 * B * h, As = Math.max(af.ok ? af.As : Asmin, Asmin), Ab = BARS[5][1], n = Math.ceil(As / Ab), s = Math.min(fl((B - 150 - dbAs) / (n - 1), 25), 300);
        n = Math.floor((B - 150 - dbAs) / s) + 1; var Asprov = n * Ab;
        if (Bm > 4) warns.push('Zapata muy grande (B = ' + f0(Bm, 2) + ' m): considera zapata combinada o pilotes.');
        memo.push('ZAPATA AISLADA CUADRADA — PREDIMENSIONAMIENTO (ACI 318 / NSR-10, educativo)',
            'Datos: P (servicio) = ' + o.P + ' kN · qadm = ' + o.qadm + ' kPa · columna ' + c1 + ' × ' + c2 + ' mm · f′c = ' + fc + ' MPa · fy = ' + fy + ' MPa · Df = ' + o.Df + ' m',
            'Área req. = 1.10·P/qadm = ' + f0(A, 2) + ' m² (10 % por peso propio y relleno) → B = ' + f0(Bm, 2) + ' m',
            'Pu ≈ 1.4·P = ' + f0(Pu, 0) + ' kN (simplificado, sin separar D y L) → qu = Pu/B² = ' + f0(qu, 1) + ' kPa',
            'Espesor por punzonamiento y cortante en una dirección: d = ' + d + ' mm → h = d + 75 (recubrimiento contra el suelo) + db/2 ≈ ' + h + ' mm',
            'Flexión: Mu = qu·B·(B − c)²/8 = ' + f0(Mu, 1) + ' kN·m · As req = ' + f0(As, 0) + ' mm² (As,min 0.0018·B·h = ' + f0(Asmin, 0) + ')',
            'Acero: ' + n + ' Ø#5 en cada dirección @ ' + s + ' mm (As = ' + f0(Asprov, 0) + ' mm²)',
            'NO verificado: excentricidades y momentos en la columna, asentamientos, aplastamiento, desarrollo del acero, nivel freático.');
        var th = Math.max(50, B * 0.022), D = new Draw(th);
        D.text(0, B + th * 6, 'ZAPATA Z-1 — PLANTA Y CORTE (mm)', { h: th * 1.5 }); D.text(0, B + th * 4, 'B = ' + f0(B, 0) + ' · h = ' + h + ' · Ø#5 @ ' + s + ' ambos sentidos', { h: th * 0.9 });
        D.rect(0, 0, B, B, 'CONCRETO'); D.rect((B - c1) / 2, (B - c2) / 2, c1, c2, 'CONCRETO');
        for (var i = 0; i < n; i++) { var p = 75 + dbAs / 2 + (B - 150 - dbAs) * i / (n - 1); D.line(75, p, B - 75, p, 'ACERO-LONG'); D.line(p, 75, p, B - 75, 'ACERO-LONG'); }
        D.dim(0, 0, B, 0, -th * 2, f0(B)); D.dim(0, 0, 0, B, -th * 2, f0(B));
        var cx = B + 2000, hc = h + 900; D.text(cx, hc + th * 3, 'CORTE', { h: th });
        D.rect(cx, 0, B, h, 'CONCRETO'); D.rect(cx + (B - c1) / 2, h, c1, 900, 'CONCRETO');
        D.line(cx + 75, 75 + dbAs / 2, cx + B - 75, 75 + dbAs / 2, 'ACERO-LONG'); D.line(cx + 75, 75 + dbAs / 2, cx + 75, h - 75, 'ACERO-LONG'); D.line(cx + B - 75, 75 + dbAs / 2, cx + B - 75, h - 75, 'ACERO-LONG');
        D.line(cx + (B - c1) / 2 + 60, h - 75, cx + (B - c1) / 2 + 60, hc, 'ACERO-LONG'); D.line(cx + (B + c1) / 2 - 60, h - 75, cx + (B + c1) / 2 - 60, hc, 'ACERO-LONG');
        D.line(cx - B * 0.2, h, cx + B * 1.2, h, 'SUELO'); D.line(cx - B * 0.2, -th, cx + B * 1.2, -th, 'SUELO');
        D.dim(cx, 0, cx + B, 0, -th * 2.5, f0(B)); D.dim(cx + B, 0, cx + B, h, th * 2, 'h = ' + h); D.text(cx + B / 2, 75 + dbAs / 2 - th * 2.2, n + ' Ø#5 @ ' + s, { ha: 1 });
        D.text(cx + B / 2, h + 450, 'Columna ' + c1 + ' × ' + c2, { ha: 1, va: 2 });
        return { ok: true, warns: warns, memo: memo, model: D.model(), calc: { B: Bm, h: h, d: d, qu: qu, Mu: Mu, n: n, s: s } };
    };

    /* ============================ MURO EN VOLADIZO ============================ */
    S.muro = function (o) {
        o = Object.assign({ H: 3, gamma: 18, phi: 30, qadm: 150, fc: 21, fy: 420 }, o || {});
        var warns = [], memo = [], H = o.H, hz = Math.max(0.3, Math.ceil(H / 10 * 20) / 20), tTop = 0.25, tBot = Math.max(0.3, Math.ceil(H / 12 * 20) / 20), Ht = H + hz, B = Math.ceil(0.6 * Ht * 20) / 20, toe = Math.ceil(B / 3 * 20) / 20, heel = Math.max(0.2, +(B - toe - tBot).toFixed(2));
        var Ka = Math.pow(Math.tan((45 - o.phi / 2) * PI / 180), 2), Ea = 0.5 * Ka * o.gamma * Ht * Ht, yEa = Ht / 3, Mo = Ea * yEa;
        var gc = 24, W1 = gc * hz * B, x1 = B / 2, W2 = gc * H * (tTop + tBot) / 2, x2 = toe + tBot / 2 + (tBot - tTop) / 6 * 0 + 0, W3 = o.gamma * H * heel, x3 = B - heel / 2;
        // el vástago es trapecio con cara interior vertical; el brazo del peso del vástago se toma en su centroide
        // el brazo del peso del vástago se toma, de forma simplificada, en el centro de su base
        x2 = toe + tBot / 2;
        var SW = W1 + W2 + W3, Mr = W1 * x1 + W2 * x2 + W3 * x3, FSv = Mr / Mo, mu = Math.tan(2 * o.phi / 3 * PI / 180), FSd = mu * SW / Ea, xr = (Mr - Mo) / SW, e = B / 2 - xr, qmax = SW / B * (1 + 6 * e / B), qmin = SW / B * (1 - 6 * e / B);
        var Kp = Math.pow(Math.tan((45 + o.phi / 2) * PI / 180), 2), Dfr = 0.5, hk = 0, Ep = 0, FSd0 = FSd;
        while (FSd < 1.5 && hk < 0.8 - 1e-9) { hk = +(hk + 0.1).toFixed(2); Ep = 0.5 * Kp * o.gamma * (Math.pow(Dfr + hz + hk, 2) - Math.pow(Dfr + hz, 2)); FSd = (mu * SW + Ep) / Ea; }
        if (FSv < 2) warns.push('FS volcamiento = ' + f0(FSv, 2) + ' < 2.0: aumenta el talón o la base.');
        if (FSd < 1.5) warns.push('FS deslizamiento = ' + f0(FSd, 2) + ' < 1.5 incluso con llave de ' + f0(hk, 2) + ' m: amplía la base o mejora el suelo de apoyo.');
        if (Math.abs(e) > B / 6) warns.push('Excentricidad e = ' + f0(e, 2) + ' m > B/6 = ' + f0(B / 6, 2) + ' m: resultante fuera del tercio medio.');
        if (qmax > o.qadm) warns.push('qmáx = ' + f0(qmax, 0) + ' kPa > qadm = ' + o.qadm + ' kPa: amplía la base o mejora el suelo.');
        var Mus = 1.6 * (Ka * o.gamma * H * H / 2) * (H / 3), dS = tBot * 1000 - 50 - 8, afs = asFlex(Mus, 1000, dS, o.fc, o.fy), AsS = Math.max(afs.ok ? afs.As : 0, 0.0020 * 1000 * tBot * 1000), Ab = BARS[5][1], sS = Math.max(100, fl(Ab * 1000 / AsS, 25));
        memo.push('MURO DE CONTENCION EN VOLADIZO — PREDIMENSIONAMIENTO (Rankine, educativo)',
            'Datos: H = ' + H + ' m · γ relleno = ' + o.gamma + ' kN/m³ · φ = ' + o.phi + '° · qadm = ' + o.qadm + ' kPa · f′c = ' + o.fc + ' MPa · fy = ' + o.fy + ' MPa',
            'Dimensiones adoptadas: base B = ' + f0(B, 2) + ' m · zapata hz = ' + f0(hz, 2) + ' m · vástago ' + f0(tTop, 2) + ' (corona) a ' + f0(tBot, 2) + ' m (base) · puntera ' + f0(toe, 2) + ' m · talón ' + f0(heel, 2) + ' m',
            'Ka = tan²(45° − φ/2) = ' + f0(Ka, 3) + ' → Ea = ½·Ka·γ·(H+hz)² = ' + f0(Ea, 1) + ' kN/m a ' + f0(yEa, 2) + ' m de la base',
            'ΣW = ' + f0(SW, 1) + ' kN/m · Mr = ' + f0(Mr, 1) + ' kN·m/m · Mo = ' + f0(Mo, 1) + ' kN·m/m (sin empuje pasivo ni sobrecarga)',
            'FS volcamiento = Mr/Mo = ' + f0(FSv, 2) + (FSv >= 2 ? ' ≥ 2.0 OK' : ' < 2.0 NO CUMPLE'),
            'FS deslizamiento sin llave = μ·ΣW/Ea = ' + f0(FSd0, 2) + ' (μ = tan(2φ/3) = ' + f0(mu, 2) + ')' + (FSd0 >= 1.5 ? ' OK' : ' < 1.5 → se añade llave de cortante de ' + f0(hk, 2) + ' m (empuje pasivo conservador, Kp = ' + f0(Kp, 2) + ', solo en la profundidad de la llave, relleno frontal ' + Dfr + ' m): Ep = ' + f0(Ep, 1) + ' kN/m'),
            'FS deslizamiento final = (μ·ΣW + Ep)/Ea = ' + f0(FSd, 2) + (FSd >= 1.5 ? ' ≥ 1.5 OK' : ' < 1.5 NO CUMPLE'),
            'Excentricidad e = ' + f0(e, 2) + ' m (B/6 = ' + f0(B / 6, 2) + ') · qmáx = ' + f0(qmax, 0) + ' kPa · qmín = ' + f0(qmin, 0) + ' kPa ' + (qmax <= o.qadm ? '≤ qadm OK' : '> qadm NO CUMPLE'),
            'Acero del vástago (por metro): Mu = 1.6·Ea,vástago·H/3 = ' + f0(Mus, 1) + ' kN·m → As = ' + f0(AsS, 0) + ' mm²/m → Ø#5 @ ' + sS + ' mm (cara en contacto con el relleno)',
            'NO verificado: cortante del vástago, diseño de talón y puntera, sobrecarga, sismo, nivel freático, estabilidad global, drenaje.');
        var th = Math.max(40, Ht * 1000 * 0.022), D = new Draw(th), m = function (v) { return v * 1000; };
        D.text(0, m(Ht) + th * 8, 'MURO EN VOLADIZO M-1 — SECCION TIPICA (mm)', { h: th * 1.5 }); D.text(0, m(Ht) + th * 6, 'H = ' + H + ' m · φ = ' + o.phi + '° · γ = ' + o.gamma + ' kN/m³', { h: th * 0.9 });
        // vástago: cara trasera vertical en x = toe+tBot; cara frontal inclinada hasta toe+tBot-tTop
        D.poly([[0, 0], [m(B), 0], [m(B), m(hz)], [m(toe + tBot), m(hz)], [m(toe + tBot), m(Ht)], [m(toe + tBot - tTop), m(Ht)], [m(toe), m(hz)], [0, m(hz)]], true, 'CONCRETO');
        D.line(m(toe + tBot), m(hz), m(B), m(hz), 'SUELO'); D.poly([[m(toe + tBot), m(Ht)], [m(B) + th * 8, m(Ht) + th * 0.0], [m(B) + th * 8, m(hz)]], false, 'SUELO'); D.line(m(B), m(hz), m(B) + th * 8, m(hz), 'SUELO');
        for (var i = 1; i <= 5; i++) { var yy = m(hz) + (m(H)) * i / 6; D.line(m(toe + tBot) + th * 0.6, yy, m(B) + th * 7, yy - th * 1.4, 'SUELO'); }
        D.line(-th * 5, m(hz), m(toe) , m(hz), 'SUELO');
        if (hk > 0) { D.poly([[m(toe), 0], [m(toe), -m(hk)], [m(toe + tBot), -m(hk)], [m(toe + tBot), 0]], false, 'CONCRETO'); D.dim(m(toe + tBot) + th * 0.5, -m(hk), m(toe + tBot) + th * 0.5, 0, th * 3.2, 'llave ' + f0(m(hk))); }
        D.line(m(toe + tBot) - 50 - 8, m(hz) + 100, m(toe + tBot) - 58, m(Ht) - 100, 'ACERO-LONG'); D.line(m(toe + tBot) - 58, m(hz) + 100, m(toe + 0.05), 80, 'ACERO-LONG'); D.line(60, 60, m(B) - 60, 60, 'ACERO-LONG');
        D.dim(0, 0, m(B), 0, -th * 2.4, 'B = ' + f0(m(B))); D.dim(0, 0, m(toe), 0, -th * 5, 'puntera ' + f0(m(toe))); D.dim(m(toe), 0, m(toe + tBot), 0, -th * 5, f0(m(tBot))); D.dim(m(toe + tBot), 0, m(B), 0, -th * 5, 'talón ' + f0(m(heel)));
        D.dim(-th * 1.5, 0, -th * 1.5, m(hz), -th * 2, 'hz = ' + f0(m(hz))); D.dim(m(B) + th * 9, m(hz), m(B) + th * 9, m(Ht), th * 1.5, 'H = ' + f0(m(H)));
        D.text(m(toe + tBot) - th * 1.2, m(Ht) * 0.55, 'Ø#5 @' + sS + ' (vástago)', { h: th * 0.85, rot: PI / 2, ha: 1, va: 0 }); D.text(m(B) / 2, -th * 9, 'Base: Ø#5 @ ' + sS + ' (verificar flexión de talón y puntera)', { ha: 1, h: th * 0.85 });
        D.text(m(B) + th * 2, m(hz) + m(H) / 2, 'RELLENO', { h: th }); D.text(m(B) / 2, m(hz) + th, 'Ea = ' + f0(Ea, 1) + ' kN/m', { ha: 1, h: th * 0.8 });
        return { ok: true, warns: warns, memo: memo, model: D.model(), calc: { B: B, hz: hz, toe: toe, heel: heel, tBot: tBot, FSv: FSv, FSd: FSd, e: e, qmax: qmax, Ea: Ea, AsS: AsS, sS: sS } };
    };

    CAD.struct = S;
    if (typeof module !== 'undefined' && module.exports) module.exports = S;
})(typeof window !== 'undefined' ? window : globalThis);
