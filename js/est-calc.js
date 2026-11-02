/* =========================================================
   GeoMetrics — Estructuras I · motor de cálculo
   Sin DOM. Unidades de entrada:
     longitudes m · cargas kN y kN/m · E GPa · secciones mm
     áreas cm² / mm² · inercias cm⁴ / mm⁴ según el caso.
   Las funciones devuelven objetos con los valores en unidades
   indicadas y arreglos muestreados para dibujar diagramas.
   ========================================================= */
(function (global) {
    'use strict';

    function isNum(v) { return typeof v === 'number' && isFinite(v); }
    function guard(cond, msg) { if (!cond) { var e = new Error(msg); e.userMessage = msg; throw e; } }
    function mm4(b, h) { return b * Math.pow(h, 3) / 12; }       // mm⁴
    function m4FromMm4(I) { return I * 1e-12; }
    function rectI(b, h) { return m4FromMm4(mm4(b, h)); }        // m⁴

    function validateBase(p) {
        guard(isNum(p.L) && p.L > 0, 'La longitud debe ser mayor que cero.');
        guard(isNum(p.b) && p.b > 0 && isNum(p.h) && p.h > 0, 'Las dimensiones de la sección deben ser positivas.');
        guard(isNum(p.E) && p.E > 0, 'El módulo de elasticidad E debe ser positivo.');
    }

    /* ---------------------------------------------------------
       VIGA SIMPLEMENTE APOYADA
       Carga puntual P en x=a y carga distribuida w en toda la luz.
       --------------------------------------------------------- */
    function simpleBeam(p) {
        p = p || {};
        var L = +p.L, P = +(p.P || 0), a = (p.a == null ? L / 2 : +p.a),
            w = +(p.w || 0), E = +p.E, b = +p.b, h = +p.h;
        validateBase({ L: L, E: E, b: b, h: h });
        guard(P >= 0 && w >= 0, 'Las cargas no pueden ser negativas en este modelo.');
        guard(a >= 0 && a <= L, 'La posición de la carga debe estar entre 0 y L.');

        var I = rectI(b, h);                 // m⁴
        var EI = E * 1e6 * I;                // kN·m²  (GPa · 1e6 = kN/m²)
        var RA = P * (L - a) / L + w * L / 2;
        var RB = P * a / L + w * L / 2;

        function V(x) {
            return RA - w * x - (x >= a ? P : 0);
        }
        function M(x) {
            return RA * x - w * x * x / 2 - P * Math.max(0, x - a);
        }
        function defl(x) {
            var d = 0;
            if (P > 0 && a > 0 && a < L) {
                var bb = L - a;
                if (x <= a) d += P * bb * x * (L * L - bb * bb - x * x) / (6 * L * EI);
                else d += P * a * (L - x) * (L * L - a * a - (L - x) * (L - x)) / (6 * L * EI);
            }
            if (w > 0) d += w * x * (Math.pow(L, 3) - 2 * L * x * x + Math.pow(x, 3)) / (24 * EI);
            return d;
        }

        var N = 240, xs = [], vs = [], ms = [], ds = [];
        var Vmax = 0, Mpos = 0, Mneg = 0, dmax = 0, xM = 0, xd = 0;
        for (var i = 0; i <= N; i++) {
            var x = L * i / N;
            var v = V(x), m = M(x), d = defl(x);
            xs.push(x); vs.push(v); ms.push(m); ds.push(d);
            if (Math.abs(v) > Math.abs(Vmax)) Vmax = v;
            if (m > Mpos) { Mpos = m; xM = x; }
            if (m < Mneg) Mneg = m;
            if (Math.abs(d) > Math.abs(dmax)) { dmax = d; xd = x; }
        }
        var Mabs = Math.max(Math.abs(Mpos), Math.abs(Mneg));
        var sigma = Mabs * 1e6 * (h / 2) / mm4(b, h); // N/mm² = MPa

        return {
            kind: 'simple', L: L, P: P, a: a, w: w, E: E, b: b, h: h,
            I: I, EI: EI, RA: RA, RB: RB,
            Vmax: Vmax, Mpos: Mpos, Mneg: Mneg, Mabs: Mabs,
            xM: xM, dmax: Math.abs(dmax) * 1000, xd: xd, sigma: sigma,
            xs: xs, vs: vs, ms: ms, ds: ds,
            V: V, M: M, defl: defl
        };
    }

    /* ---------------------------------------------------------
       VIGA EN VOLADIZO empotrada en x=0
       --------------------------------------------------------- */
    function cantilever(p) {
        p = p || {};
        var L = +p.L, P = +(p.P || 0), w = +(p.w || 0),
            E = +p.E, b = +p.b, h = +p.h;
        validateBase({ L: L, E: E, b: b, h: h });
        guard(P >= 0 && w >= 0, 'Las cargas no pueden ser negativas en este modelo.');

        var I = rectI(b, h), EI = E * 1e6 * I;
        var RA = P + w * L;
        var MA = -(P * L + w * L * L / 2); // kN·m, negativo = hogging

        function V(x) { return P + w * (L - x); }
        function M(x) { return -(P * (L - x) + w * Math.pow(L - x, 2) / 2); }
        function defl(x) {
            var d = 0;
            if (P > 0) d += P * x * x * (3 * L - x) / (6 * EI);
            if (w > 0) d += w * x * x * (6 * L * L - 4 * L * x + x * x) / (24 * EI);
            return d;
        }

        var N = 220, xs = [], vs = [], ms = [], ds = [];
        var Vmax = 0, Mabs = 0, dmax = 0, xd = 0;
        for (var i = 0; i <= N; i++) {
            var x = L * i / N, v = V(x), m = M(x), d = defl(x);
            xs.push(x); vs.push(v); ms.push(m); ds.push(d);
            if (Math.abs(v) > Math.abs(Vmax)) Vmax = v;
            if (Math.abs(m) > Math.abs(Mabs)) Mabs = m;
            if (Math.abs(d) > Math.abs(dmax)) { dmax = d; xd = x; }
        }
        var sigma = Math.abs(Mabs) * 1e6 * (h / 2) / mm4(b, h);

        return {
            kind: 'cantilever', L: L, P: P, w: w, E: E, b: b, h: h,
            I: I, EI: EI, RA: RA, MA: MA,
            Vmax: Vmax, Mabs: Math.abs(Mabs), dmax: Math.abs(dmax) * 1000, xd: xd,
            sigma: sigma, xs: xs, vs: vs, ms: ms, ds: ds,
            V: V, M: M, defl: defl
        };
    }

    /* ---------------------------------------------------------
       PROPIEDADES DE UNA SECCIÓN COMPUESTA POR RECTÁNGULOS
       rects = [{b, h, x, y}] con (x,y) la esquina inferior izquierda.
       --------------------------------------------------------- */
    function sectionProps(rects) {
        rects = (rects || []).filter(function (r) {
            return r && +r.b > 0 && +r.h > 0;
        }).map(function (r) {
            return { b: +r.b, h: +r.h, x: +(r.x || 0), y: +(r.y || 0) };
        });
        guard(rects.length > 0, 'Agrega al menos un rectángulo con base y altura positivas.');

        var A = 0, Qx = 0, Qy = 0;
        rects.forEach(function (r) {
            r.A = r.b * r.h;
            r.cx = r.x + r.b / 2;
            r.cy = r.y + r.h / 2;
            r.Ix0 = r.b * Math.pow(r.h, 3) / 12;
            r.Iy0 = r.h * Math.pow(r.b, 3) / 12;
            A += r.A; Qx += r.A * r.cy; Qy += r.A * r.cx;
        });
        var cy = Qx / A, cx = Qy / A;
        var Ix = 0, Iy = 0;
        rects.forEach(function (r) {
            r.dx = r.cx - cx;
            r.dy = r.cy - cy;
            r.Ix = r.Ix0 + r.A * r.dy * r.dy;
            r.Iy = r.Iy0 + r.A * r.dx * r.dx;
            Ix += r.Ix; Iy += r.Iy;
        });
        var ymin = Math.min.apply(null, rects.map(function (r) { return r.y; }));
        var ymax = Math.max.apply(null, rects.map(function (r) { return r.y + r.h; }));
        var xmin = Math.min.apply(null, rects.map(function (r) { return r.x; }));
        var xmax = Math.max.apply(null, rects.map(function (r) { return r.x + r.b; }));
        var cTop = ymax - cy, cBot = cy - ymin;
        return {
            rects: rects, A: A, cx: cx, cy: cy,
            Ix: Ix, Iy: Iy, SxTop: Ix / cTop, SxBot: Ix / cBot,
            SxMin: Ix / Math.max(cTop, cBot),
            rx: Math.sqrt(Iy / A), ry: Math.sqrt(Ix / A),
            xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax,
            cTop: cTop, cBot: cBot
        };
    }

    /* ---------------------------------------------------------
       GRADO DE INDETERMINACIÓN Y ESTABILIDAD
       type: 'viga' | 'portico' | 'cercha'
       m = miembros, j = nudos, r = reacciones externas.
       --------------------------------------------------------- */
    function indeterminacy(type, m, j, r) {
        type = type || 'portico';
        m = +m; j = +j; r = +r;
        guard(m >= 0 && j >= 1 && r >= 0, 'Revisa el número de miembros, nudos y reacciones.');
        var isTruss = type === 'cercha';
        var dsi = isTruss ? (m + r - 2 * j) : (3 * m + r - 3 * j);
        var dk = isTruss ? (2 * j - r - m) : (3 * j - r - m);
        if (dk < 0) dk = 0;
        var ext;
        if (r < 3) ext = 'Inestable: faltan reacciones (r < 3).';
        else if (r === 3) ext = 'Estable externamente en forma isostática (r = 3).';
        else ext = 'Estable externamente con ' + (r - 3) + ' redundante(s) de apoyo.';
        var cls, tone;
        if (dsi < 0) { cls = 'Inestable / mecanismo'; tone = 'bad'; }
        else if (dsi === 0) { cls = 'Isostática'; tone = 'ok'; }
        else { cls = 'Hiperestática de grado ' + dsi; tone = 'warn'; }
        var stable = r >= 3 && dsi >= 0;
        return {
            type: type, m: m, j: j, r: r, isTruss: isTruss,
            dsi: dsi, dk: dk, classification: cls, tone: tone, external: ext,
            stable: stable,
            note: isTruss
                ? 'Cercha: DSI = m + r − 2j; Dk = 2j − r − m (axiales activos).'
                : 'Vigas y pórticos: DSI = 3m + r − 3j; Dk = 3j − r − m (axiales rígidos).'
        };
    }

    /* ---------------------------------------------------------
       CERCHA PRATT DE 4 PANELES — solver matricial de equilibrio
       Nudos: B0..B4 (cordón inferior) y T1..T3 (cordón superior)
       Carga vertical P en T2. EA y E en kN y GPa.
       --------------------------------------------------------- */
    function solveLinear(A, bvec) {
        var n = bvec.length, a = A.map(function (row, i) { return row.slice().concat([bvec[i]]); });
        for (var col = 0; col < n; col++) {
            var piv = col;
            for (var rr = col + 1; rr < n; rr++) {
                if (Math.abs(a[rr][col]) > Math.abs(a[piv][col])) piv = rr;
            }
            if (Math.abs(a[piv][col]) < 1e-10) return null;
            if (piv !== col) { var t = a[piv]; a[piv] = a[col]; a[col] = t; }
            var pv = a[col][col];
            for (var k = col; k <= n; k++) a[col][k] /= pv;
            for (var row = 0; row < n; row++) {
                if (row === col) continue;
                var f = a[row][col];
                if (!f) continue;
                for (var kk = col; kk <= n; kk++) a[row][kk] -= f * a[col][kk];
            }
        }
        return a.map(function (row) { return row[n]; });
    }

    function prattTruss(p) {
        p = p || {};
        var L = +p.L, h = +p.h, P = +(p.P || 0), E = +(p.E || 200), A = +(p.A || 2000);
        guard(L > 0 && h > 0, 'La luz y la altura de la cercha deben ser positivas.');
        guard(P >= 0, 'La carga debe ser positiva.');
        guard(E > 0 && A > 0, 'E y el área de las barras deben ser positivas.');

        var nodes = [
            { x: 0, y: 0, n: 'B0' }, { x: L / 4, y: 0, n: 'B1' }, { x: L / 2, y: 0, n: 'B2' },
            { x: 3 * L / 4, y: 0, n: 'B3' }, { x: L, y: 0, n: 'B4' },
            { x: L / 4, y: h, n: 'T1' }, { x: L / 2, y: h, n: 'T2' }, { x: 3 * L / 4, y: h, n: 'T3' }
        ];
        var members = [
            [0, 1], [1, 2], [2, 3], [3, 4],       // cordón inferior
            [5, 6], [6, 7],                        // cordón superior
            [1, 5], [2, 6], [3, 7],                // montantes
            [0, 5], [5, 2], [6, 3], [7, 4]         // diagonales
        ];
        var names = ['B0-B1', 'B1-B2', 'B2-B3', 'B3-B4', 'T1-T2', 'T2-T3', 'B1-T1', 'B2-T2', 'B3-T3', 'B0-T1', 'T1-B2', 'T2-B3', 'T3-B4'];
        members.forEach(function (mm, i) {
            var a = nodes[mm[0]], b = nodes[mm[1]];
            mm.L = Math.hypot(b.x - a.x, b.y - a.y);
            mm.ux = (b.x - a.x) / mm.L;
            mm.uy = (b.y - a.y) / mm.L;
            mm.name = names[i];
        });

        function solve(loadNode, loadY) {
            var m = members.length, r = 3, j = nodes.length;
            var Aeq = [], rhs = [];
            for (var ni = 0; ni < j; ni++) {
                var rowX = new Array(m + r).fill(0);
                var rowY = new Array(m + r).fill(0);
                members.forEach(function (mm, k) {
                    if (mm[0] === ni) { rowX[k] += mm.ux; rowY[k] += mm.uy; }
                    if (mm[1] === ni) { rowX[k] -= mm.ux; rowY[k] -= mm.uy; }
                });
                // Reacciones: B0 pin (Rx, Ry), B4 roller (Ry)
                if (ni === 0) { rowX[m] = 1; rowY[m + 1] = 1; }
                if (ni === 4) { rowY[m + 2] = 1; }
                var fx = 0, fy = 0;
                if (ni === loadNode) fy += loadY;
                Aeq.push(rowX); rhs.push(-fx);
                Aeq.push(rowY); rhs.push(-fy);
            }
            var sol = solveLinear(Aeq, rhs);
            if (!sol) throw new Error('La cercha es inestable o la geometría es degenerada.');
            return {
                forces: sol.slice(0, m),
                Rx0: sol[m], Ry0: sol[m + 1], Ry4: sol[m + 2]
            };
        }

        var loadNode = 6; // T2 por defecto
        if (p.node != null && isFinite(+p.node)) {
            var ln_ = Math.round(+p.node);
            if ([1, 2, 3, 5, 6, 7].indexOf(ln_) >= 0) loadNode = ln_;
        }
        var real = solve(loadNode, -P);
        var virt = solve(loadNode, -1);

        var EA = E * 1e6 * (A * 1e-6); // kN
        var delta = 0;
        var forces = members.map(function (mm, i) {
            var f = real.forces[i];
            delta += f * virt.forces[i] * mm.L / EA;
            return {
                i: i, name: mm.name, a: mm[0], b: mm[1], L: mm.L,
                force: f, state: Math.abs(f) < 1e-7 ? 'cero' : (f > 0 ? 'traccion' : 'compresion')
            };
        });
        var maxT = 0, maxC = 0;
        forces.forEach(function (f) {
            if (f.force > maxT) maxT = f.force;
            if (-f.force > maxC) maxC = -f.force;
        });
        var maxAbs = Math.max(maxT, maxC) || 1;

        return {
            L: L, h: h, P: P, E: E, A: A, EA: EA,
            nodes: nodes, members: forces,
            reactions: { Rx0: real.Rx0, Ry0: real.Ry0, Ry4: real.Ry4 },
            loadNode: loadNode, loadName: nodes[loadNode].n,
            maxT: maxT, maxC: maxC, maxAbs: maxAbs,
            delta: delta * 1000, // mm
            deltaM: delta
        };
    }

    /* ---------------------------------------------------------
       PÓRTICO SIMPLE — método del portal (una luz, un piso)
       --------------------------------------------------------- */
    function portalFrame(p) {
        p = p || {};
        var W = +(p.W || 0), h = +p.h, b = +p.b, E = +(p.E || 25),
            bc = +(p.bc || 300), hc = +(p.hc || 300);
        guard(W >= 0 && h > 0 && b > 0, 'La carga, la altura y la luz deben ser válidas.');
        guard(E > 0 && bc > 0 && hc > 0, 'Revisa E y las dimensiones de las columnas.');
        var Ic = rectI(bc, hc), EI = E * 1e6 * Ic;
        var base = p.base === 'pinned' ? 'pinned' : 'fixed';
        var Vcol = W / 2;
        var Mcol = base === 'pinned' ? Vcol * h : Vcol * h / 2;   // articulada: M = V·h en la cabeza y 0 en la base
        var Mbeam = Mcol;
        var N = W * h / (2 * b);           // fuerza axial en vigas por vuelco
        var sway = base === 'pinned' ? (W * Math.pow(h, 3)) / (6 * EI) * 1000 : (W * Math.pow(h, 3)) / (24 * EI) * 1000; // mm
        return {
            base: base, W: W, h: h, b: b, E: E, bc: bc, hc: hc, Ic: Ic, EI: EI,
            Vcol: Vcol, Mcol: Mcol, Mbeam: Mbeam, N: N, sway: sway,
            reactionX: W / 2, reactionY: N,
            note: base === 'pinned' ? 'Bases articuladas: sin momento en la base, M = V·h en la cabeza de la columna y deriva 4 veces mayor que con bases empotradas (viga rígida).' : 'Hipótesis del portal: punto de inflexión a media altura de columnas y a media luz de la viga.'
        };
    }

    /* ---------------------------------------------------------
       MATRIZ DE RIGIDEZ DE UN ELEMENTO PRISMÁTICO 2D
       (axial + flexión, 3 GDL por nudo: u, v, θ)
       E GPa · A cm² · I cm⁴ · L m · ángulo en grados.
       --------------------------------------------------------- */
    function frameElementStiffness(p) {
        p = p || {};
        var L = +p.L, E = +p.E, A = +p.A, I = +p.I, ang = +(p.angle || 0);
        guard(L > 0 && E > 0 && A > 0 && I > 0, 'L, E, A e I deben ser positivos.');
        var Ee = E * 1e6;             // kN/m²
        var Am = A * 1e-4;            // m²
        var Im = I * 1e-8;            // m⁴
        var EA = Ee * Am;             // kN
        var EI = Ee * Im;             // kN·m²
        var k = [
            [EA / L, 0, 0, -EA / L, 0, 0],
            [0, 12 * EI / Math.pow(L, 3), 6 * EI / (L * L), 0, -12 * EI / Math.pow(L, 3), 6 * EI / (L * L)],
            [0, 6 * EI / (L * L), 4 * EI / L, 0, -6 * EI / (L * L), 2 * EI / L],
            [-EA / L, 0, 0, EA / L, 0, 0],
            [0, -12 * EI / Math.pow(L, 3), -6 * EI / (L * L), 0, 12 * EI / Math.pow(L, 3), -6 * EI / (L * L)],
            [0, 6 * EI / (L * L), 2 * EI / L, 0, -6 * EI / (L * L), 4 * EI / L]
        ];
        var th = ang * Math.PI / 180, c = Math.cos(th), s = Math.sin(th);
        var T = [
            [c, s, 0, 0, 0, 0],
            [-s, c, 0, 0, 0, 0],
            [0, 0, 1, 0, 0, 0],
            [0, 0, 0, c, s, 0],
            [0, 0, 0, -s, c, 0],
            [0, 0, 0, 0, 0, 1]
        ];
        function mul(X, Y) {
            var Z = [];
            for (var i = 0; i < X.length; i++) {
                Z[i] = [];
                for (var j = 0; j < Y[0].length; j++) {
                    var sum = 0;
                    for (var kk = 0; kk < Y.length; kk++) sum += X[i][kk] * Y[kk][j];
                    Z[i][j] = sum;
                }
            }
            return Z;
        }
        function transpose(X) {
            return X[0].map(function (_, j) { return X.map(function (row) { return row[j]; }); });
        }
        var Tt = transpose(T);
        var Kglobal = mul(mul(Tt, k), T);
        return {
            L: L, E: E, A: A, I: I, angle: ang, c: c, s: s,
            EA: EA, EI: EI, k: k, T: T, Kglobal: Kglobal,
            dof: ['u₁', 'v₁', 'θ₁', 'u₂', 'v₂', 'θ₂']
        };
    }

    /* ---------------------------------------------------------
       VIGA CONTINUA DE DOS LUCES — pendiente-deflexión
       Apoyos simples en A, B y C; UDL w1 y w2.
       --------------------------------------------------------- */
    function continuousBeam(p) {
        p = p || {};
        var L1 = +p.L1, L2 = +p.L2, w1 = +(p.w1 || 0), w2 = +(p.w2 || 0),
            E = +p.E, b = +p.b, h = +p.h;
        guard(L1 > 0 && L2 > 0 && w1 >= 0 && w2 >= 0, 'Revisa luces y cargas.');
        validateBase({ L: L1 + L2, E: E, b: b, h: h });
        var MB = -(w1 * Math.pow(L1, 3) + w2 * Math.pow(L2, 3)) / (8 * (L1 + L2));
        var RA = w1 * L1 / 2 + MB / L1;
        var RB1 = w1 * L1 - RA;
        var RB2 = w2 * L2 / 2 - MB / L2;
        var RC = w2 * L2 - RB2;

        function M1(x) { return RA * x - w1 * x * x / 2; }
        function M2(x) { return MB + RB2 * x - w2 * x * x / 2; }
        var xs = [], ms = [], vs = [], labels = [];
        var N = 120;
        for (var i = 0; i <= N; i++) {
            var x = L1 * i / N;
            xs.push(x); ms.push(M1(x)); vs.push(RA - w1 * x);
        }
        for (var j = 1; j <= N; j++) {
            var x2 = L2 * j / N;
            xs.push(L1 + x2); ms.push(M2(x2)); vs.push(RB2 - w2 * x2);
        }
        var Mpos = 0, Mneg = 0;
        ms.forEach(function (m) { if (m > Mpos) Mpos = m; if (m < Mneg) Mneg = m; });
        var I = rectI(b, h), EI = E * 1e6 * I;
        return {
            L1: L1, L2: L2, w1: w1, w2: w2, E: E, b: b, h: h, I: I, EI: EI,
            MB: MB, RA: RA, RB1: RB1, RB2: RB2, RB: RB1 + RB2, RC: RC,
            Mpos: Mpos, Mneg: Mneg, Mabs: Math.max(Math.abs(Mpos), Math.abs(Mneg)),
            xs: xs, ms: ms, vs: vs, M1: M1, M2: M2
        };
    }

    /* ---------------------------------------------------------
       VIGA CON APOYOS CONFIGURABLES (elementos finitos de viga)
       Extremos: 'pin' (pasador), 'roller' (rodillo), 'fixed' (empotrado), 'free' (libre).
       Carga puntual P (hacia abajo) en x=a y carga distribuida w en toda la luz.
       Convención: V y M positivos como en el análisis clásico (M>0 tracciona abajo).
       --------------------------------------------------------- */
    var SUP_N = { pin: 'Pasador', roller: 'Rodillo', fixed: 'Empotrado', free: 'Libre' };
    function solveSym(A, b) {
        var n = b.length, i, j, k;
        for (i = 0; i < n; i++) {
            var m = i;
            for (j = i + 1; j < n; j++) if (Math.abs(A[j][i]) > Math.abs(A[m][i])) m = j;
            if (Math.abs(A[m][i]) < 1e-12) return null;
            var t = A[i]; A[i] = A[m]; A[m] = t; var tb = b[i]; b[i] = b[m]; b[m] = tb;
            for (j = i + 1; j < n; j++) {
                var f = A[j][i] / A[i][i]; if (!f) continue;
                for (k = i; k < n; k++) A[j][k] -= f * A[i][k];
                b[j] -= f * b[i];
            }
        }
        var x = new Array(n);
        for (i = n - 1; i >= 0; i--) { var s = b[i]; for (k = i + 1; k < n; k++) s -= A[i][k] * x[k]; x[i] = s / A[i][i]; }
        return x;
    }
    function beamSupports(p) {
        p = p || {};
        var L = +p.L, P = +(p.P || 0), a = (p.a == null ? L / 2 : +p.a), w = +(p.w || 0), E = +p.E, b = +p.b, h = +p.h;
        var sl = p.sl || 'pin', sr = p.sr || 'roller';
        validateBase({ L: L, E: E, b: b, h: h });
        guard(P >= 0 && w >= 0, 'Las cargas no pueden ser negativas en este modelo.');
        guard(a >= 0 && a <= L, 'La posición de la carga debe estar entre 0 y L.');
        guard(SUP_N[sl] && SUP_N[sr], 'Tipo de apoyo no válido.');
        var nv = { pin: 1, roller: 1, fixed: 2, free: 0 }, nR = nv[sl] + nv[sr];
        guard(sl === 'fixed' || sr === 'fixed' || (nv[sl] === 1 && nv[sr] === 1),
            'Con esos apoyos la viga es un mecanismo (inestable): usa un empotramiento o dos apoyos (pasador/rodillo).');
        var I = rectI(b, h), EI = E * 1e6 * I;
        // malla
        var N = 120, xn = [], i;
        for (i = 0; i <= N; i++) xn.push(L * i / N);
        if (a > 1e-9 && a < L - 1e-9) { var near = 0; for (i = 1; i < xn.length; i++) if (Math.abs(xn[i] - a) < Math.abs(xn[near] - a)) near = i; xn[near] = a; }
        xn.sort(function (u, v) { return u - v; });
        var nn = xn.length, nd = 2 * nn, K = [], F = new Array(nd).fill(0), r, c;
        for (r = 0; r < nd; r++) K.push(new Array(nd).fill(0));
        var els = [];
        for (i = 0; i < nn - 1; i++) {
            var l = xn[i + 1] - xn[i], k = EI / Math.pow(l, 3);
            var ke = [[12, 6 * l, -12, 6 * l], [6 * l, 4 * l * l, -6 * l, 2 * l * l], [-12, -6 * l, 12, -6 * l], [6 * l, 2 * l * l, -6 * l, 4 * l * l]];
            var fe = [w * l / 2, w * l * l / 12, w * l / 2, -w * l * l / 12];   // fuerzas nodales equivalentes (hacia abajo → restar)
            var dof = [2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 3];
            for (r = 0; r < 4; r++) { F[dof[r]] -= fe[r]; for (c = 0; c < 4; c++) K[dof[r]][dof[c]] += k * ke[r][c]; }
            els.push({ l: l, k: k, ke: ke, fe: fe, dof: dof });
        }
        // carga puntual en el nudo de x=a
        var ia = 0; for (i = 0; i < nn; i++) if (Math.abs(xn[i] - a) < 1e-9) { ia = i; break; }
        F[2 * ia] -= P;
        // apoyos
        var fixedD = {};
        if (sl !== 'free') fixedD[0] = 1;
        if (sl === 'fixed') fixedD[1] = 1;
        if (sr !== 'free') fixedD[2 * (nn - 1)] = 1;
        if (sr === 'fixed') fixedD[2 * (nn - 1) + 1] = 1;
        var free = []; for (i = 0; i < nd; i++) if (!fixedD[i]) free.push(i);
        var Kf = free.map(function (u) { return free.map(function (v) { return K[u][v]; }); });
        var uf = solveSym(Kf, free.map(function (u) { return F[u]; }));
        guard(uf, 'No se pudo resolver la viga con esos apoyos (revisa la configuración).');
        var U = new Array(nd).fill(0); free.forEach(function (d, j) { U[d] = uf[j]; });
        // reacciones = K·U − F en grados restringidos
        function react(d) { var s = -F[d]; for (var j = 0; j < nd; j++) s += K[d][j] * U[j]; return s; }
        var RA = sl !== 'free' ? react(0) : 0, MAr = sl === 'fixed' ? react(1) : 0;
        var RB = sr !== 'free' ? react(2 * (nn - 1)) : 0, MBr = sr === 'fixed' ? react(2 * (nn - 1) + 1) : 0;
        // fuerzas internas por elemento
        els.forEach(function (e) {
            var u = e.dof.map(function (d) { return U[d]; }), f = [0, 0, 0, 0], r2, c2;
            for (r2 = 0; r2 < 4; r2++) { for (c2 = 0; c2 < 4; c2++) f[r2] += e.k * e.ke[r2][c2] * u[c2]; f[r2] -= e.fe[r2]; }
            e.V0 = f[0]; e.M0 = -f[1]; e.u = u;
        });
        var starts = xn.slice(0, nn - 1);
        function idx(x) { var lo = 0, hi = starts.length - 1; while (lo < hi) { var m = (lo + hi + 1) >> 1; if (starts[m] <= x + 1e-12) lo = m; else hi = m - 1; } return lo; }
        function V(x) { var e = els[idx(x)], t = x - starts[idx(x)]; return e.V0 - w * t; }
        function M(x) { var j = idx(x), e = els[j], t = x - starts[j]; return e.M0 + e.V0 * t - w * t * t / 2; }
        function defl(x) {            // positiva hacia abajo
            var j = idx(x), e = els[j], l = e.l, t = (x - starts[j]) / l, u = e.u;
            var h1 = 1 - 3 * t * t + 2 * t * t * t, h2 = l * (t - 2 * t * t + t * t * t), h3 = 3 * t * t - 2 * t * t * t, h4 = l * (-t * t + t * t * t);
            var v = h1 * u[0] + h2 * u[1] + h3 * u[2] + h4 * u[3];
            var xe = t * l; v -= w * xe * xe * (l - xe) * (l - xe) / (24 * EI);
            return -v;
        }
        var NS = 240, xs = [], vs = [], ms = [], ds = [], Mpos = 0, Mneg = 0, Vmax = 0, xM = 0, xMabs = 0, Mext = 0, dmax = 0, xd = 0;
        for (i = 0; i <= NS; i++) {
            var x = L * i / NS, v = V(x), m = M(x), d = defl(x);
            xs.push(x); vs.push(v); ms.push(m); ds.push(d);
            if (m > Mpos) { Mpos = m; xM = x; }
            if (m < Mneg) Mneg = m;
            if (Math.abs(m) > Math.abs(Mext)) { Mext = m; xMabs = x; }
            if (Math.abs(v) > Math.abs(Vmax)) Vmax = v;
            if (Math.abs(d) > Math.abs(dmax)) { dmax = d; xd = x; }
        }
        // en los extremos empotrados el momento exacto es el de la reacción
        ms[0] = sl === 'fixed' ? -MAr : 0;
        ms[NS] = sr === 'fixed' ? MBr : 0;
        Mpos = 0; Mneg = 0; Mext = 0;
        ms.forEach(function (m, j) { if (m > Mpos) { Mpos = m; xM = xs[j]; } if (m < Mneg) Mneg = m; if (Math.abs(m) > Math.abs(Mext)) { Mext = m; xMabs = xs[j]; } });
        var Mabs = Math.max(Math.abs(Mpos), Math.abs(Mneg));
        var sigma = Mabs * 1e6 * (h / 2) / mm4(b, h);
        var grado = nR - 2;
        return {
            kind: 'supports', L: L, P: P, a: a, w: w, E: E, b: b, h: h, I: I, EI: EI, sl: sl, sr: sr,
            RA: RA, RB: RB, MA: sl === 'fixed' ? -MAr : 0, MB: sr === 'fixed' ? MBr : 0,
            grado: grado, clase: grado === 0 ? 'isostática' : 'hiperestática de grado ' + grado,
            Vmax: Vmax, Mpos: Mpos, Mneg: Mneg, Mabs: Mabs, Mext: Mext, xM: xM, xMabs: xMabs,
            dmax: Math.abs(dmax) * 1000, xd: xd, sigma: sigma, xs: xs, vs: vs, ms: ms, ds: ds, V: V, M: M, defl: defl
        };
    }

    global.EstCalc = {
        beamSupports: beamSupports,
        supportNames: SUP_N,

        simpleBeam: simpleBeam,
        cantilever: cantilever,
        sectionProps: sectionProps,
        indeterminacy: indeterminacy,
        prattTruss: prattTruss,
        portalFrame: portalFrame,
        frameElementStiffness: frameElementStiffness,
        continuousBeam: continuousBeam,
        rectI: rectI,
        mm4: mm4
    };
})(typeof window !== 'undefined' ? window : globalThis);
