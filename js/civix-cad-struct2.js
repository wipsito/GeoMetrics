/**
 * Civix CAD — más elementos estructurales: losa maciza, escalera de concreto, columna circular
 * con espiral y cercha Warren (análisis por el método de los nudos) + cuadro de acero (BOM) exportable.
 * Mismas reservas que civix-cad-struct.js: predimensionamiento educativo (ACI 318 / NSR-10),
 * NO sustituye el diseño completo ni la revisión de un ingeniero.
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || !CAD.struct || CAD.struct.__v2) return; var S = CAD.struct; S.__v2 = true;
    var PI = Math.PI, BARS = { 3: [9.5, 71], 4: [12.7, 129], 5: [15.9, 199], 6: [19.1, 284], 7: [22.2, 387], 8: [25.4, 510] };
    function f0(v, d) { return (+v).toFixed(d == null ? 0 : d); }
    function fl(v, st) { return Math.floor(v / st + 1e-9) * st; }
    function beta1(fc) { return fc <= 28 ? 0.85 : Math.max(0.65, 0.85 - 0.05 * (fc - 28) / 7); }
    function asFlex(Mu, b, d, fc, fy) { var Rn = Mu * 1e6 / (0.9 * b * d * d), disc = 1 - 2 * Rn / (0.85 * fc); if (disc <= 0) return { ok: false }; var rho = 0.85 * fc / fy * (1 - Math.sqrt(disc)); return { ok: true, As: rho * b * d, rho: rho, overMax: rho > 0.85 * beta1(fc) * fc / fy * 0.375 }; }
    var D_ = function (th) { return new (function () { })(); };
    function Draw(th) { this.th = th; this.ents = []; this.layers = { 'CONCRETO': { name: 'CONCRETO', aci: 7 }, 'ACERO-LONG': { name: 'ACERO-LONG', aci: 1 }, 'ACERO-REPARTICION': { name: 'ACERO-REPARTICION', aci: 6 }, 'ESTRIBOS': { name: 'ESTRIBOS', aci: 3 }, 'COTAS': { name: 'COTAS', aci: 4 }, 'TEXTOS': { name: 'TEXTOS', aci: 2 }, 'APOYOS': { name: 'APOYOS', aci: 5 }, 'TRACCION': { name: 'TRACCION', aci: 3 }, 'COMPRESION': { name: 'COMPRESION', aci: 1 }, 'CERO': { name: 'CERO', aci: 8 } }; }
    Draw.prototype = {
        line: function (x1, y1, x2, y2, ly) { this.ents.push({ t: 'poly', layer: ly || 'CONCRETO', pts: [[x1, y1, 0], [x2, y2, 0]], closed: false }); },
        poly: function (pts, closed, ly) { this.ents.push({ t: 'poly', layer: ly || 'CONCRETO', pts: pts.map(function (p) { return [p[0], p[1], 0]; }), closed: !!closed, keepPoly: true }); },
        rect: function (x, y, w, h, ly) { this.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true, ly); },
        circle: function (x, y, r, ly) { this.ents.push({ t: 'circle', layer: ly || 'ACERO-LONG', c: [x, y, 0], r: r }); },
        text: function (x, y, s, o) { o = o || {}; this.ents.push({ t: 'text', layer: o.layer || 'TEXTOS', p: [x, y, 0], h: o.h || this.th, s: String(s).split('\n'), rot: o.rot || 0, ha: o.ha || 0, va: o.va || 0 }); },
        dim: function (x1, y1, x2, y2, off, label) {
            var dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux, e = this.th * 0.5, k = this.th * 0.35, sg = off >= 0 ? 1 : -1, ax = x1 + nx * off, ay = y1 + ny * off, bx = x2 + nx * off, by = y2 + ny * off;
            this.line(x1 + nx * sg * this.th * 0.3, y1 + ny * sg * this.th * 0.3, ax + nx * sg * e, ay + ny * sg * e, 'COTAS'); this.line(x2 + nx * sg * this.th * 0.3, y2 + ny * sg * this.th * 0.3, bx + nx * sg * e, by + ny * sg * e, 'COTAS'); this.line(ax, ay, bx, by, 'COTAS');
            this.line(ax - ux * k - nx * k, ay - uy * k - ny * k, ax + ux * k + nx * k, ay + uy * k + ny * k, 'COTAS'); this.line(bx - ux * k - nx * k, by - uy * k - ny * k, bx + ux * k + nx * k, by + uy * k + ny * k, 'COTAS');
            var ang = Math.atan2(uy, ux); if (ang > PI / 2 + 1e-9 || ang < -PI / 2 - 1e-9) ang += PI; this.text((ax + bx) / 2 + nx * sg * this.th * 0.25, (ay + by) / 2 + ny * sg * this.th * 0.25, label == null ? f0(L) : label, { layer: 'COTAS', ha: 1, va: sg > 0 ? 0 : 3, rot: ang });
        },
        model: function () { var m = { ents: this.ents, layers: this.layers, warn: [], units: 4, blocks: {} }; m.bbox = CAD.bboxOf(this.ents); return m; }
    };
    function wkg(no) { return 0.00617 * BARS[no][0] * BARS[no][0]; } // kg/m
    function bomRow(el, no, n, Lmm) { return [el, '#' + no + ' (Ø' + BARS[no][0] + ')', n, Math.round(Lmm), +(n * Lmm / 1000).toFixed(2), +(n * Lmm / 1000 * wkg(no)).toFixed(1)]; }
    var BOMH = ['Elemento', 'Barra', 'Cantidad', 'Longitud (mm)', 'Total (m)', 'Peso (kg)'];

    /* ---------- añadir BOM a los elementos de la v1 ---------- */
    ['viga', 'columna', 'zapata', 'muro'].forEach(function (k) {
        var base = S[k]; S[k] = function (o) {
            var r = base(o); if (!r.ok) return r; var c = r.calc, rows = [];
            o = o || {};
            if (k === 'viga') { var L = (o.L || 6) * 1000, b = o.b || 300, h = o.h || 500, rec = o.rec || 40, nst = Math.round((2 * 2 * (o.h || 500)) / c.sEnd) + Math.round((L - 4 * h) / c.sMid) + 2; rows.push(bomRow('Inferior', c.bar, c.nBars, L - 2 * rec + 300), bomRow('Superior', 4, 2, L - 2 * rec), bomRow('Estribos', 3, nst, 2 * (b - 2 * rec) + 2 * (h - 2 * rec) + 100)); }
            else if (k === 'columna') { var Lu = (o.Lu || 3) * 1000, bb = o.b || 400, hh = o.h || 400, rc = o.rec || 40, ne = Math.round(2 * c.lo / c.sConf) + Math.round((Lu - 2 * c.lo) / c.sMid) + 1; rows.push(bomRow('Longitudinal', c.bar, c.nBars, Lu + 600), bomRow('Estribos', 3, ne, 2 * (bb - 2 * rc) + 2 * (hh - 2 * rc) + 100)); }
            else if (k === 'zapata') { var B = c.B * 1000; rows.push(bomRow('Parrilla (2 sentidos)', 5, c.n * 2, B - 150 + 2 * 200)); }
            else if (k === 'muro') { rows.push(bomRow('Vástago (por m)', 5, Math.round(1000 / c.sS), (o.H || 3) * 1000 + c.hz * 1000 + 400), bomRow('Base (por m)', 5, Math.round(1000 / c.sS), c.B * 1000 - 100)); }
            r.bom = { head: BOMH, rows: rows }; return r;
        };
    });

    /* ============================ LOSA MACIZA ============================ */
    S.losa = function (o) {
        o = Object.assign({ Lx: 4, Ly: 7, wL: 2, wDextra: 1.5, fc: 21, fy: 420, rec: 20 }, o || {});
        var warns = [], memo = [], Lx = o.Lx, Ly = o.Ly, fc = o.fc, fy = o.fy, rec = o.rec;
        if (Ly / Lx < 2) warns.push('Ly/Lx = ' + f0(Ly / Lx, 2) + ' < 2: la losa trabaja en dos direcciones; este módulo la trata como una dirección (conservador en la luz corta).');
        var h = Math.max(100, Math.ceil(Lx * 1000 / 20 / 10) * 10), db = 12.7, d = h - rec - db / 2, wself = 24 * h / 1000, wu = 1.2 * (wself + o.wDextra) + 1.6 * o.wL, Mu = wu * Lx * Lx / 8;
        var af = asFlex(Mu, 1000, d, fc, fy), Asmin = 0.0018 * 1000 * h; if (!af.ok) return { ok: false, warns: ['El espesor calculado no resiste Mu: aumenta el espesor (h) o reduce la luz.'], memo: [], model: null };
        var As = Math.max(af.As, Asmin), Ab = BARS[4][1], smax = Math.min(3 * h, 450), s = Math.max(75, Math.min(fl(Ab * 1000 / As, 25), fl(smax, 25))), Asprov = Ab * 1000 / s, pMn = 0.9 * Asprov * fy * (d - Asprov * fy / (0.85 * fc * 1000) / 2) / 1e6;
        var At = 0.0018 * 1000 * h, Ab3 = BARS[3][1], st = Math.max(100, Math.min(fl(Ab3 * 1000 / At, 25), fl(Math.min(5 * h, 450), 25)));
        var Vu = wu * (Lx / 2 - d / 1000), phiVc = 0.75 * 0.17 * Math.sqrt(fc) * 1000 * d / 1000; if (Vu > phiVc) warns.push('Vu = ' + f0(Vu, 1) + ' kN/m > φVc = ' + f0(phiVc, 1) + ' kN/m: aumenta el espesor (no se usan estribos en losas macizas).');
        if (af.overMax) warns.push('ρ supera ρmáx: aumenta el espesor.');
        memo.push('LOSA MACIZA EN UNA DIRECCION — PREDIMENSIONAMIENTO (ACI 318 / NSR-10, educativo)',
            'Datos: Lx (luz corta) = ' + Lx + ' m · Ly = ' + Ly + ' m · carga viva = ' + o.wL + ' kN/m² · acabados = ' + o.wDextra + ' kN/m² · f′c = ' + fc + ' MPa · fy = ' + fy + ' MPa',
            'Espesor mínimo (simplemente apoyada) h = L/20 = ' + f0(Lx * 1000 / 20, 0) + ' mm → h = ' + h + ' mm · d = ' + f0(d, 0) + ' mm',
            'Peso propio = 24·h = ' + f0(wself, 2) + ' kN/m² → wu = 1.2(D) + 1.6(L) = ' + f0(wu, 2) + ' kN/m²',
            'Mu = wu·L²/8 = ' + f0(Mu, 2) + ' kN·m por metro de ancho → As req = ' + f0(af.As, 0) + ' mm²/m (As,min retracción y temperatura 0.0018·b·h = ' + f0(Asmin, 0) + ')',
            'Acero principal: Ø#4 @ ' + s + ' mm (As = ' + f0(Asprov, 0) + ' mm²/m, s máx = ' + fl(smax, 25) + ') · φMn = ' + f0(pMn, 2) + ' kN·m/m ' + (pMn >= Mu ? '≥ Mu OK' : '< Mu NO CUMPLE'),
            'Acero de repartición (temperatura): Ø#3 @ ' + st + ' mm perpendicular al principal',
            'Cortante: Vu(d) = ' + f0(Vu, 1) + ' kN/m · φVc = ' + f0(phiVc, 1) + ' kN/m ' + (Vu <= phiVc ? 'OK' : 'NO CUMPLE'),
            'NO verificado: deflexiones, continuidad con otros paños, refuerzo negativo en apoyos, desarrollo, sismo.');
        var Lxm = Lx * 1000, Lym = Ly * 1000, th = Math.max(50, Lym * 0.02), D = new Draw(th), nmain = Math.floor(Lym / s), nrep = Math.floor(Lxm / st);
        D.text(0, Lym + th * 6, 'LOSA MACIZA L-1 — PLANTA Y CORTE (mm)', { h: th * 1.5 }); D.text(0, Lym + th * 4, 'h = ' + h + ' mm · f′c ' + fc + ' · fy ' + fy + ' MPa', { h: th * 0.9 });
        D.rect(0, 0, Lxm, Lym, 'CONCRETO'); for (var i = 0; i <= nmain; i++) { var y = Math.min(Lym - 25, 25 + i * s); D.line(25, y, Lxm - 25, y, 'ACERO-LONG'); } for (i = 0; i <= nrep; i++) { var x = Math.min(Lxm - 25, 25 + i * st); D.line(x, 25, x, Lym - 25, 'ACERO-REPARTICION'); }
        D.text(Lxm / 2, Lym / 2, 'Ø#4 @ ' + s + ' (principal)\nØ#3 @ ' + st + ' (repartición)', { ha: 1, va: 2, h: th * 1.1 });
        D.dim(0, 0, Lxm, 0, -th * 2.5, 'Lx = ' + f0(Lxm)); D.dim(0, 0, 0, Lym, -th * 2.5, 'Ly = ' + f0(Lym)); D.text(Lxm * 0.02, Lym * 0.04, 'Vigas de apoyo en x = 0 y x = Lx', { h: th * 0.8 });
        var cx = Lxm + 2500, ss = Math.max(1, Math.round(Lxm / (h * 8))), sth = th * 0.9; D.text(cx, h * ss + th * 6, 'CORTE A-A (esc. vertical ' + ss + '×)', { h: th });
        D.rect(cx, 0, Lxm, h * ss, 'CONCRETO'); D.line(cx + 25, (rec + db / 2) * ss, cx + Lxm - 25, (rec + db / 2) * ss, 'ACERO-LONG'); for (var k = 0; k <= 14; k++) D.circle(cx + Lxm * k / 14, (rec + db / 2 + 8) * ss, 6 * ss, 'ACERO-REPARTICION');
        var tri = th * 2; D.poly([[cx, 0], [cx - tri / 2, -tri], [cx + tri / 2, -tri]], true, 'APOYOS'); D.poly([[cx + Lxm, 0], [cx + Lxm - tri / 2, -tri], [cx + Lxm + tri / 2, -tri]], true, 'APOYOS');
        D.dim(cx + Lxm, 0, cx + Lxm, h * ss, th * 2.5, 'h = ' + h); D.dim(cx, -tri, cx + Lxm, -tri, -th * 2, f0(Lxm));
        var rows = [bomRow('Principal (' + nmain + '+1 barras)', 4, nmain + 1, Lxm + 300), bomRow('Repartición', 3, nrep + 1, Lym - 50)];
        return { ok: true, warns: warns, memo: memo, model: D.model(), bom: { head: BOMH, rows: rows }, calc: { h: h, wu: wu, Mu: Mu, s: s, st: st } };
    };

    /* ============================ ESCALERA ============================ */
    S.escalera = function (o) {
        o = Object.assign({ H: 3, b: 1.2, huella: 28, wL: 3, acab: 1.5, fc: 21, fy: 420, rec: 25 }, o || {});
        var warns = [], memo = [], n = Math.max(4, Math.round(o.H / 0.175)), r = o.H / n * 100, g = o.huella, rule = 2 * r + g, nt = n - 1, Lh = nt * g / 100, Lh_mm = Lh * 1000, alpha = Math.atan(r / g), Linc = Math.sqrt(Lh * Lh + Math.pow(o.H * (nt / n), 2));
        if (rule < 60 || rule > 64) warns.push('2·contrahuella + huella = ' + f0(rule, 1) + ' cm: fuera del rango cómodo 60–64 cm.'); if (r > 18) warns.push('Contrahuella ' + f0(r, 1) + ' cm > 18 cm.'); if (g < 25) warns.push('Huella ' + g + ' cm < 25 cm.');
        var t = Math.max(120, Math.ceil(Linc * 1000 / 20 / 10) * 10), db = 12.7, d = t - o.rec - db / 2, pp = 24 * (t / 1000 / Math.cos(alpha) + r / 200), wu = 1.2 * (pp + o.acab) + 1.6 * o.wL, Mu = wu * Lh * Lh / 8, af = asFlex(Mu, 1000, d, o.fc, o.fy);
        if (!af.ok) return { ok: false, warns: ['El espesor de la garganta no resiste Mu: aumenta el espesor.'], memo: [], model: null };
        var Asmin = 0.0018 * 1000 * t, As = Math.max(af.As, Asmin), s = Math.max(75, Math.min(fl(BARS[4][1] * 1000 / As, 25), fl(Math.min(3 * t, 450), 25))), st = Math.max(100, fl(Math.min(BARS[3][1] * 1000 / Asmin, 5 * t, 450), 25)), Asprov = BARS[4][1] * 1000 / s;
        memo.push('ESCALERA DE CONCRETO (tramo único apoyado) — PREDIMENSIONAMIENTO (ACI 318 / NSR-10, educativo)',
            'Datos: altura a salvar H = ' + o.H + ' m · ancho b = ' + o.b + ' m · huella = ' + g + ' cm · carga viva = ' + o.wL + ' kN/m² · acabados = ' + o.acab + ' kN/m²',
            'N.º de contrahuellas = ' + n + ' → contrahuella = ' + f0(r, 2) + ' cm · peldaños con huella = ' + nt + ' · regla 2c + h = ' + f0(rule, 1) + ' cm',
            'Luz horizontal = ' + f0(Lh, 2) + ' m · ángulo = ' + f0(alpha * 180 / PI, 1) + '° · espesor de garganta t = L/20 = ' + t + ' mm',
            'Peso propio (incl. peldaños) = ' + f0(pp, 2) + ' kN/m² → wu = 1.2(D) + 1.6(L) = ' + f0(wu, 2) + ' kN/m²',
            'Mu = wu·L²/8 = ' + f0(Mu, 2) + ' kN·m/m → As req = ' + f0(af.As, 0) + ' mm²/m (mín. ' + f0(Asmin, 0) + ') → Ø#4 @ ' + s + ' mm (As = ' + f0(Asprov, 0) + ' mm²/m)',
            'Repartición: Ø#3 @ ' + st + ' mm',
            'NO verificado: descanso, apoyos reales (empotramiento parcial), deflexión, cortante, vibración, desarrollo.');
        var th = Math.max(40, o.H * 1000 * 0.025), D = new Draw(th), G = g * 10, Rr = r * 10, pts = [[0, 0]];
        D.text(0, o.H * 1000 + th * 8, 'ESCALERA E-1 — CORTE LONGITUDINAL (mm)', { h: th * 1.5 }); D.text(0, o.H * 1000 + th * 6, n + ' contrahuellas de ' + f0(Rr, 0) + ' mm · huella ' + f0(G, 0) + ' mm · t = ' + t + ' mm', { h: th * 0.9 });
        pts = [[0, 0]]; for (var i = 0; i < n; i++) { pts.push([i * G, (i + 1) * Rr]); pts.push([(i + 1) * G, (i + 1) * Rr]); } pts.pop();
        var top = pts.slice(); var xe = nt * G, ye = o.H * 1000 * nt / n + 0, under = [[0, 0], [xe, n * Rr - Rr]]; // garganta: de (0,0) a (xe, (n-1)Rr) desplazada t perpendicular
        var ang = Math.atan2(Rr, G), nx = Math.sin(ang) * t, ny = -Math.cos(ang) * t;
        var line = [[0, 0]]; for (i = 0; i < n; i++) { line.push([i * G, (i + 1) * Rr]); line.push([(i + 1) * G, (i + 1) * Rr]); }
        D.poly(line, false, 'CONCRETO'); var xs = n * G, yb = n * Rr;
        D.line(0, 0, 0, Rr, 'CONCRETO'); D.line(0, 0, nx * 0 + 0, 0, 'CONCRETO');
        D.line(-nx * 0, 0, xs + nx * 0, yb - Rr + 0, 'CONCRETO'); D.line(0, 0, xs, yb - Rr + 0, 'CONCRETO');
        var off = t / Math.cos(ang); D.line(0, -off, xs, yb - Rr - off, 'CONCRETO'); D.line(0, 0, 0, -off, 'CONCRETO'); D.line(xs, yb - Rr, xs, yb - Rr - off, 'CONCRETO');
        var bo = o.rec + db / 2; D.line(0 + 40, -off + bo / Math.cos(ang), xs - 40, yb - Rr - off + bo / Math.cos(ang), 'ACERO-LONG');
        D.dim(0, 0, xs, 0, -th * 4, 'L horiz. = ' + f0(xs)); D.dim(xs, 0, xs, yb, th * 4, 'H = ' + f0(o.H * 1000)); D.dim(0, 0, G, 0, -th * 2, 'huella ' + f0(G)); D.dim(G * (n - 1), Rr * (n - 1), G * (n - 1), Rr * n, th * 2.2, 'c ' + f0(Rr));
        D.text(xs / 2, yb / 2 - off * 2.2, 'Ø#4 @ ' + s + ' (principal) · Ø#3 @ ' + st + ' (repartición)', { rot: ang, ha: 1, va: 2, h: th });
        var Lb = Linc * 1000 + 600, nb = Math.ceil(o.b * 1000 / s), nr = Math.ceil(Linc * 1000 / st), rows = [bomRow('Principal', 4, nb, Lb), bomRow('Repartición', 3, nr, o.b * 1000 - 50)];
        return { ok: true, warns: warns, memo: memo, model: D.model(), bom: { head: BOMH, rows: rows }, calc: { n: n, r: r, t: t, s: s, Mu: Mu } };
    };

    /* ============================ COLUMNA CIRCULAR ============================ */
    S.columnaC = function (o) {
        o = Object.assign({ Pu: 1800, D: 450, Lu: 3, fc: 28, fy: 420, rec: 40 }, o || {});
        var warns = [], memo = [], Dm = o.D, fc = o.fc, fy = o.fy, rec = o.rec, Ag = PI * Dm * Dm / 4, ds = 9.5;
        var AstReq = Math.max((o.Pu * 1000 / (0.85 * 0.75) - 0.85 * fc * Ag) / (fy - 0.85 * fc), 0.01 * Ag); if (AstReq > 0.04 * Ag) warns.push('ρ = ' + f0(AstReq / Ag * 100, 2) + ' % > 4 %: aumenta el diámetro.');
        var best = null; [5, 6, 7, 8].forEach(function (no) { if (best) return; var db = BARS[no][0], Ab = BARS[no][1]; for (var n = 6; n <= 20; n += 2) { if (n * Ab < AstReq) continue; var Dc = Dm - 2 * (rec + ds) - db, clear = PI * Dc / n - db; if (clear >= Math.max(40, 1.5 * db)) { best = { no: no, n: n }; break; } } });
        if (!best) return { ok: false, warns: ['No caben las barras necesarias: aumenta el diámetro.'], memo: [], model: null };
        var bar = BARS[best.no], db = bar[0], Ast = best.n * bar[1], phiPn = 0.85 * 0.75 * (0.85 * fc * (Ag - Ast) + fy * Ast) / 1000; if (phiPn < o.Pu) warns.push('φPn,máx < Pu: aumenta el diámetro.');
        var Ach = PI * Math.pow(Dm - 2 * rec, 2) / 4, rhoS = Math.max(0.45 * (Ag / Ach - 1) * fc / fy, 0.12 * fc / fy), Dc = Dm - 2 * rec, Asp = BARS[3][1], pitch = Math.max(25, Math.min(75, fl(4 * Asp * (Dc - ds) / (Dc * Dc * rhoS), 5)));
        memo.push('COLUMNA CIRCULAR CON ESPIRAL — PREDIMENSIONAMIENTO (ACI 318 / NSR-10, educativo)',
            'Datos: Pu = ' + o.Pu + ' kN · D = ' + Dm + ' mm · Lu = ' + o.Lu + ' m · f′c = ' + fc + ' MPa · fy = ' + fy + ' MPa',
            'Ag = ' + f0(Ag, 0) + ' mm² · φPn,máx = 0.85 φ [0.85 f′c (Ag − Ast) + fy Ast] con φ = 0.75 (espiral)',
            'Ast req. = ' + f0(AstReq, 0) + ' mm² → colocar ' + best.n + ' Ø#' + best.no + ' (' + db + ' mm): Ast = ' + f0(Ast, 0) + ' mm² · ρ = ' + f0(Ast / Ag * 100, 2) + ' % · φPn,máx = ' + f0(phiPn, 0) + ' kN ' + (phiPn >= o.Pu ? '≥ Pu OK' : '< Pu NO CUMPLE'),
            'Espiral Ø#3: ρs mín = 0.45 (Ag/Ach − 1) f′c/fy = ' + f0(rhoS, 4) + ' → paso = ' + pitch + ' mm (límite 25–75 mm)',
            'NO verificado: flexocompresión, esbeltez, sismo, empalmes, nudos.');
        var Lmm = o.Lu * 1000, th = Math.max(45, Lmm * 0.022), Dr = new Draw(th), R = Dm / 2, ss = Math.max(1, Math.floor(Lmm / (2.2 * Dm))), cx = Dm + 2500, cy = Lmm / 2;
        Dr.text(0, Lmm + th * 4, 'COLUMNA CIRCULAR CC-1 — ELEVACION Y SECCION (mm)', { h: th * 1.5 }); Dr.text(0, Lmm + th * 2, 'Pu = ' + o.Pu + ' kN · f′c ' + fc + ' · fy ' + fy + ' MPa', { h: th * 0.9 });
        Dr.rect(0, 0, Dm, Lmm, 'CONCRETO'); Dr.line(rec + ds + db / 2, 0, rec + ds + db / 2, Lmm, 'ACERO-LONG'); Dr.line(Dm - rec - ds - db / 2, 0, Dm - rec - ds - db / 2, Lmm, 'ACERO-LONG');
        var y = 50, c = 0, pitchD = Math.max(pitch, Lmm / 150); while (y < Lmm - 30 && c++ < 300) { Dr.line(rec, y, Dm - rec, y + pitchD / 2, 'ESTRIBOS'); Dr.line(Dm - rec, y + pitchD / 2, rec, y + pitchD, 'ESTRIBOS'); y += pitchD; }
        Dr.dim(0, 0, 0, Lmm, -th * 2.5, f0(Lmm)); Dr.text(Dm + th * 2, Lmm / 2, 'Espiral Ø#3 @ ' + pitch, { h: th * 0.9, va: 2 });
        Dr.text(cx, cy + R * ss + th * 3, 'SECCION (esc. ' + ss + '× la elevación)', { h: th }); Dr.circle(cx, cy, R * ss, 'CONCRETO'); Dr.circle(cx, cy, (R - rec) * ss, 'ESTRIBOS'); var Rb = R - rec - ds - db / 2;
        for (var i = 0; i < best.n; i++) { var a = 2 * PI * i / best.n; Dr.circle(cx + Rb * ss * Math.cos(a), cy + Rb * ss * Math.sin(a), db / 2 * ss, 'ACERO-LONG'); }
        Dr.dim(cx - R * ss, cy - R * ss - th * 2, cx + R * ss, cy - R * ss - th * 2, -th * 1.6, 'D = ' + Dm); Dr.text(cx, cy - R * ss - th * 8, best.n + ' Ø#' + best.no + ' (ρ = ' + f0(Ast / Ag * 100, 2) + ' %)\nEspiral Ø#3 @ ' + pitch, { ha: 1, h: th * 1.05 });
        var Lspiral = Math.ceil(Lmm / pitch) * PI * (Dc - ds) / 1000;
        return { ok: true, warns: warns, memo: memo, model: Dr.model(), bom: { head: BOMH, rows: [bomRow('Longitudinal', best.no, best.n, Lmm + 600), ['Espiral', '#3 (Ø9.5)', 1, Math.round(Lspiral * 1000), +Lspiral.toFixed(2), +(Lspiral * wkg(3)).toFixed(1)]] }, calc: { n: best.n, bar: best.no, phiPn: phiPn, pitch: pitch } };
    };

    /* ============================ CERCHA WARREN (método de los nudos) ============================ */
    function solveLin(A, b) { var n = A.length, i, j, k; for (i = 0; i < n; i++) { var m = i; for (j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[m][i])) m = j; if (Math.abs(A[m][i]) < 1e-12) return null; var t = A[i]; A[i] = A[m]; A[m] = t; var tb = b[i]; b[i] = b[m]; b[m] = tb; for (j = i + 1; j < n; j++) { var f = A[j][i] / A[i][i]; if (!f) continue; for (k = i; k < n; k++) A[j][k] -= f * A[i][k]; b[j] -= f * b[i]; } } var x = new Array(n); for (i = n - 1; i >= 0; i--) { var s = b[i]; for (j = i + 1; j < n; j++) s -= A[i][j] * x[j]; x[i] = s / A[i][i]; } return x; }
    S.cercha = function (o) {
        o = Object.assign({ L: 12, h: 2, n: 6, P: 10, fy: 250 }, o || {});
        var warns = [], memo = [], n = Math.max(2, Math.min(14, Math.round(o.n))), L = o.L, h = o.h, dx = L / n, nodes = [], mem = [], i;
        for (i = 0; i <= n; i++) nodes.push([i * dx, 0]); for (i = 0; i < n; i++) nodes.push([(i + 0.5) * dx, h]); var T0 = n + 1;
        for (i = 0; i < n; i++) mem.push([i, i + 1, 'CI']); for (i = 0; i < n - 1; i++) mem.push([T0 + i, T0 + i + 1, 'CS']); for (i = 0; i < n; i++) { mem.push([i, T0 + i, 'D']); mem.push([T0 + i, i + 1, 'D']); }
        var nj = nodes.length, nm = mem.length, N = nm + 3; if (N !== 2 * nj) warns.push('La cercha no es isostática (' + N + ' incógnitas, ' + 2 * nj + ' ecuaciones).');
        var A = [], b = [], r, Fx, Fy; for (r = 0; r < 2 * nj; r++) { A.push(new Array(N).fill(0)); b.push(0); }
        mem.forEach(function (m, k) { var a = nodes[m[0]], c = nodes[m[1]], Lm = Math.hypot(c[0] - a[0], c[1] - a[1]), cx = (c[0] - a[0]) / Lm, cy = (c[1] - a[1]) / Lm; A[2 * m[0]][k] += cx; A[2 * m[0] + 1][k] += cy; A[2 * m[1]][k] -= cx; A[2 * m[1] + 1][k] -= cy; m.push(Lm); });
        A[0][nm] = 1; A[1][nm + 1] = 1; A[2 * n + 1][nm + 2] = 1; for (i = 0; i < n; i++) b[2 * (T0 + i) + 1] = o.P; // P hacia abajo: las reacciones la equilibran (Fi + R + carga = 0 → carga entra con signo +P en el lado derecho)
        var sol = solveLin(A, b); if (!sol) return { ok: false, warns: ['No se pudo resolver la cercha (matriz singular).'], memo: [], model: null };
        var F = sol.slice(0, nm); // convención: positivo = tracción
        F = F.map(function (v) { return Math.abs(v) < 1e-9 ? 0 : v; });
        var RA = { x: sol[nm], y: sol[nm + 1] }, RB = sol[nm + 2], totalP = n * o.P, chk = Math.abs(Math.abs(RA.y) + Math.abs(RB) - totalP) < 1e-6 * totalP;
        var maxT = Math.max.apply(null, F), maxC = Math.min.apply(null, F), fy = o.fy, Areq = maxT * 1000 / (0.9 * fy);
        memo.push('CERCHA WARREN — ANALISIS POR EL METODO DE LOS NUDOS (educativo)',
            'Datos: luz L = ' + L + ' m · altura h = ' + h + ' m · paneles n = ' + n + ' · carga P = ' + o.P + ' kN en cada nudo superior (' + n + ' nudos) · acero fy = ' + fy + ' MPa',
            'Barras = ' + nm + ' · nudos = ' + nj + ' · isostática: m + r = 2j (' + nm + ' + 3 = ' + 2 * nj + ')',
            'Carga total = ' + f0(totalP, 1) + ' kN · reacciones: Ay = ' + f0(Math.abs(RA.y), 2) + ' kN, By = ' + f0(Math.abs(RB), 2) + ' kN · equilibrio vertical ' + (chk ? 'OK' : 'REVISAR'),
            'Tracción máxima = ' + f0(maxT, 2) + ' kN · compresión máxima = ' + f0(maxC, 2) + ' kN',
            'Área mínima a tracción A = T / (0.9 fy) = ' + f0(Areq, 0) + ' mm² (sección neta; no incluye conexiones)',
            'Fuerzas por barra (+ tracción, − compresión): ' + mem.map(function (m, k) { return (k + 1) + ': ' + f0(F[k], 1); }).join(' · '),
            'NO verificado: pandeo de las barras a compresión (KL/r), conexiones, peso propio de la cercha, cargas laterales (viento), arriostramiento.');
        var th = Math.max(40, L * 1000 * 0.014), D = new Draw(th), s = 1000, bom = [];
        D.text(0, h * s + th * 7, 'CERCHA WARREN C-1 — GEOMETRIA Y FUERZAS AXIALES (kN)', { h: th * 1.5 }); D.text(0, h * s + th * 5, 'L = ' + L + ' m · h = ' + h + ' m · ' + n + ' paneles · P = ' + o.P + ' kN/nudo · (+) tracción  (−) compresión', { h: th * 0.9 });
        mem.forEach(function (m, k) { var a = nodes[m[0]], c = nodes[m[1]], ly = F[k] > 1e-6 ? 'TRACCION' : (F[k] < -1e-6 ? 'COMPRESION' : 'CERO'); D.line(a[0] * s, a[1] * s, c[0] * s, c[1] * s, ly); var mx = (a[0] + c[0]) / 2 * s, my = (a[1] + c[1]) / 2 * s, ang = Math.atan2(c[1] - a[1], c[0] - a[0]); if (ang > PI / 2 + 1e-9 || ang < -PI / 2 - 1e-9) ang += PI; var nx = -Math.sin(ang), ny = Math.cos(ang), side = m[2] === 'CS' ? 1 : (m[2] === 'CI' ? -1 : 1); D.text(mx + nx * th * 0.6 * side, my + ny * th * 0.6 * side, (F[k] > 0 ? '+' : '') + f0(F[k], 1), { layer: ly, ha: 1, va: side > 0 ? 0 : 3, rot: ang, h: th * 0.85 }); bom.push([k + 1, m[2] === 'CI' ? 'Cordón inferior' : (m[2] === 'CS' ? 'Cordón superior' : 'Diagonal'), (m[0] + 1) + '-' + (m[1] + 1), +m[3].toFixed(3), +F[k].toFixed(2), F[k] > 1e-6 ? 'Tracción' : (F[k] < -1e-6 ? 'Compresión' : 'Fuerza nula')]); });
        nodes.forEach(function (p, i) { D.circle(p[0] * s, p[1] * s, th * 0.35, 'CONCRETO'); D.text(p[0] * s, p[1] * s + (p[1] > 0 ? th * 1.2 : -th * 1.2), String(i + 1), { ha: 1, va: p[1] > 0 ? 0 : 3, h: th * 0.9 }); });
        var tri = th * 2.4; D.poly([[0, 0], [-tri / 2, -tri], [tri / 2, -tri]], true, 'APOYOS'); D.circle(L * s, -tri * 0.6, tri * 0.45, 'APOYOS'); D.line(L * s - tri, -tri * 1.05, L * s + tri, -tri * 1.05, 'APOYOS');
        for (i = 0; i < n; i++) { var px = nodes[T0 + i][0] * s, py = h * s; D.line(px, py + th * 3.4, px, py + th * 0.5, 'COTAS'); D.line(px - th * 0.3, py + th * 1.1, px, py + th * 0.5, 'COTAS'); D.line(px + th * 0.3, py + th * 1.1, px, py + th * 0.5, 'COTAS'); }
        D.text(L * s / 2, h * s + th * 3.8, 'P = ' + o.P + ' kN por nudo', { ha: 1, layer: 'COTAS', h: th * 0.9 }); D.dim(0, -tri * 1.4, L * s, -tri * 1.4, -th * 2, 'L = ' + f0(L * s)); D.dim(-tri * 2, 0, -tri * 2, h * s, th * 1.2, 'h = ' + f0(h * s));
        return { ok: true, warns: warns, memo: memo, model: D.model(), bom: { head: ['N.º', 'Tipo', 'Nudos', 'Longitud (m)', 'Fuerza (kN)', 'Estado'], rows: bom }, calc: { maxT: maxT, maxC: maxC, Ay: Math.abs(RA.y), By: Math.abs(RB), Areq: Areq, F: F, nodes: nodes, mem: mem } };
    };
})(typeof window !== 'undefined' ? window : globalThis);
