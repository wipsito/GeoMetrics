/**
 * Civix 3D — RENDER 3D DEL ANTEPROYECTO a partir de las especificaciones de los planos.
 *
 * Toma el mismo modelo que Civix usa para dibujar las plantas (CivixCAD.planosArq: muros, vanos de puertas y
 * ventanas, columnas, escalera y ambientes por piso) y lo levanta en 3D: losas, muros con dinteles y antepechos,
 * ventanas con vidrio y marco, puertas, portón, columnas, escalera de dos tramos, cubierta y entorno (acera,
 * calle, vecinos, árboles).
 *
 * Todo corre en el navegador, sin IA, sin tokens y sin librerías externas (WebGL2 propio con sombras).
 *   Civix3D.abrir(Pl)     → abre el visor (Pl = modelo de CivixCAD.planosArq.plan(...))
 *   Civix3D.build(Pl)     → geometría (cajas) sin dibujar; sirve para pruebas
 *   Civix3D.cerrar()
 *
 * Vistas: perspectiva, fachada, aérea, posterior, lateral, planta. Hora: día, atardecer, noche (las ventanas se
 * encienden). Pisos: edificio completo o corte hasta un piso. Vista explotada. PNG de alta resolución.
 *
 * ALCANCE: es una maqueta 3D esquemática del anteproyecto (volúmenes, vanos y acabados genéricos por tipo de
 * ambiente). No es un render fotorrealista ni reemplaza el diseño arquitectónico y estructural de un profesional.
 */
(function (global) {
    'use strict';
    var CAD = global.CivixCAD; if (!CAD || !CAD.planosArq || global.Civix3D) return;
    var doc = global.document;

    /* ------------------------------------------------------------------ constantes de obra */
    var H = 3.0, SL = 0.15, WH = H - SL;            /* altura de piso, espesor de losa, altura de muro */
    var EXT = /^(patio|retiro|piscina|jacuzzi|bbq)$/;

    var MAT = {
        muro: [.94, .92, .87], conc: [.70, .70, .68], col: [.80, .79, .76], techo: [.58, .59, .58],
        vidrio: [.50, .72, .84], marco: [.15, .16, .18], puerta: [.47, .32, .20], porton: [.22, .24, .27],
        pasto: [.38, .56, .28], acera: [.74, .74, .72], calle: [.20, .20, .22], raya: [.92, .88, .70],
        bordillo: [.60, .60, .58], vecino: [.89, .89, .88], tronco: [.36, .25, .16], copa: [.27, .49, .24],
        agua: [.22, .62, .82], escalon: [.82, .80, .76]
    };
    var PISO = {
        dorm: [.66, .48, .31], dormp: [.66, .48, .31], sala: [.78, .62, .44], comedor: [.78, .62, .44], estudio: [.66, .48, .31],
        cocina: [.85, .87, .88], bano: [.78, .85, .89], banos: [.78, .85, .89], lav: [.80, .84, .86], cochera: [.50, .50, .50],
        ingreso: [.80, .77, .72], pasillo: [.82, .79, .74], escalera: [.82, .80, .76], terraza: [.62, .50, .36], deposito: [.66, .66, .64],
        closet: [.66, .48, .31], oficina: [.74, .62, .46], aula: [.76, .70, .60], auditorio: [.52, .30, .28], cafeteria: [.78, .62, .44]
    };
    var PISO_DEF = [.82, .80, .76];

    /* ================================================================== 1. GEOMETRÍA (cajas) */

    function ensureStyles() {
        if (doc.getElementById('cx3d-css')) return;
        var s = doc.createElement('style'); s.id = 'cx3d-css';
        s.textContent = [
            '.cx3d{position:fixed;inset:0;z-index:12000;display:flex;flex-direction:column;background:#0a0f18;color:#e8eef7;font-family:Inter,system-ui,sans-serif}',
            '.cx3d-top{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 16px;background:linear-gradient(180deg,#121a28,#0d1420);border-bottom:1px solid rgba(56,189,248,.25);flex-shrink:0}',
            '.cx3d-top small{display:block;font-size:10px;letter-spacing:.18em;color:#67e8f9;font-weight:600}',
            '.cx3d-top b{font-size:14px;font-weight:650;color:#f1f5f9}',
            '.cx3d-acts{display:flex;gap:8px;flex-wrap:wrap}',
            '.cx3d-acts button,.cx3d-bar button{appearance:none;border:1px solid rgba(148,163,184,.35);background:rgba(15,23,42,.75);color:#e2e8f0;border-radius:10px;padding:8px 12px;font-size:12.5px;font-weight:600;cursor:pointer}',
            '.cx3d-acts button:hover,.cx3d-bar button:hover{border-color:#38bdf8;color:#fff}',
            '.cx3d-acts button[data-a=x]{background:rgba(248,113,113,.15);border-color:rgba(248,113,113,.45)}',
            '.cx3d-cv{flex:1 1 auto;width:100%;min-height:0;display:block;outline:none;cursor:grab;background:#0b1220}',
            '.cx3d-cv:active{cursor:grabbing}',
            '.cx3d-bar{display:flex;flex-wrap:wrap;gap:10px 14px;align-items:center;padding:10px 14px;background:rgba(10,15,24,.92);border-top:1px solid rgba(56,189,248,.2);flex-shrink:0}',
            '.cx3d-grp{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
            '.cx3d-grp>span{font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.08em;margin-right:2px}',
            '.cx3d-bar button.on{background:linear-gradient(135deg,#0e7490,#0284c7);border-color:#22d3ee;color:#fff}',
            '.cx3d-bar select{background:#0f172a;color:#e2e8f0;border:1px solid #334155;border-radius:8px;padding:6px 8px;font-size:12px}',
            '.cx3d-nota{padding:8px 14px 12px;font-size:11.5px;color:#94a3b8;background:#0a0f18;border-top:1px solid #1e293b;flex-shrink:0}',
            '@media (max-width:720px){.cx3d-top{flex-direction:column;align-items:flex-start}.cx3d-bar{gap:8px}.cx3d-nota{font-size:11px}}'
        ].join('');
        doc.head.appendChild(s);
    }

    function build(Pl) {
        var G = CAD.planosArq.geom3d(Pl), N = Pl.pisos.length;
        var opq = [], gls = [];
        function B(lst, x0, y0, z0, x1, y1, z1, col, fl, em) {
            if (x1 < x0) { var t = x0; x0 = x1; x1 = t; } if (y1 < y0) { t = y0; y0 = y1; y1 = t; } if (z1 < z0) { t = z0; z0 = z1; z1 = t; }
            if (x1 - x0 < 1e-4 || y1 - y0 < 1e-4 || z1 - z0 < 1e-4) return;
            lst.push({ x0: x0, y0: y0, z0: z0, x1: x1, y1: y1, z1: z1, c: col, f: fl, e: em || 0 });
        }
        function inter(a, b) { var r = [Math.max(a[0], b[0]), Math.max(a[1], b[1]), Math.min(a[2], b[2]), Math.min(a[3], b[3])]; return r[2] - r[0] > 1e-3 && r[3] - r[1] > 1e-3 ? r : null; }

        var Dmax = 0;
        G.forEach(function (pi) { pi.rooms.forEach(function (r) { if (!EXT.test(r.tipo)) Dmax = Math.max(Dmax, r.y + r.h); }); });
        if (!Dmax) Dmax = Pl.L;

        G.forEach(function (pi) {
            var n = pi.n, zf = (n - 1) * H, g = pi.g;
            /* Fallback arquitectónico: si no hay geometría de muros, extruir contornos de ambientes */
            if (!g) {
                var murosF = [], vanosF = [], colsF = [];
                pi.rooms.forEach(function (r) {
                    if (EXT.test(r.tipo)) return;
                    var x0 = r.x, y0 = r.y, x1 = r.x + r.w, y1 = r.y + r.h, e = 0.15;
                    murosF.push([x0, y0, x1, y0 + e], [x0, y1 - e, x1, y1], [x0, y0, x0 + e, y1], [x1 - e, y0, x1, y1]);
                });
                g = { muros0: murosF.slice(), filas: murosF, vanos: vanosF, cols: colsF };
            }
            /* --- losa + acabado de piso por ambiente --- */
            pi.rooms.forEach(function (r) {
                var x1 = r.x + r.w, y1 = r.y + r.h;
                if (EXT.test(r.tipo)) {
                    if (n === 1 && r.tipo === 'piscina') { B(opq, r.x + 0.25, r.y + 0.25, -0.5, x1 - 0.25, y1 - 0.25, -0.06, MAT.agua, 1, 0); B(opq, r.x, r.y, -0.5, x1, y1, 0.0, MAT.acera, 1, 0); B(opq, r.x + 0.25, r.y + 0.25, -0.06, x1 - 0.25, y1 - 0.25, -0.05, MAT.agua, 1, 0); }
                    return;
                }
                if (n > 1 && r.tipo === 'escalera') return;      /* hueco de escalera en las losas altas */
                B(opq, r.x, r.y, zf - SL, x1, y1, zf, MAT.conc, n, 0);
                B(opq, r.x, r.y, zf, x1, y1, zf + 0.02, PISO[r.tipo] || PISO_DEF, n, 0);
            });
            /* --- muros --- */
            g.filas.forEach(function (q) { B(opq, q[0], q[1], zf, q[2], q[3], zf + WH, MAT.muro, n, 0); });
            /* zócalo (planta baja) y cornisa entre pisos — lectura de fachada */
            if (n === 1) g.filas.forEach(function (q) { B(opq, q[0] - 0.02, q[1] - 0.02, -0.05, q[2] + 0.02, q[3] + 0.02, 0.28, MAT.conc, n, 0); });
            g.filas.forEach(function (q) { B(opq, q[0] - 0.015, q[1] - 0.015, zf + WH - 0.08, q[2] + 0.015, q[3] + 0.015, zf + WH + 0.04, MAT.conc, n, 0); });
            /* --- vanos: dintel y antepecho dentro del grosor real del muro; vidrio, marco, hoja --- */
            g.vanos.forEach(function (v) {
                var tipo = v[4], pcs = [];
                g.muros0.forEach(function (m) { var p = inter(m, v); if (p) pcs.push(p); });
                if (!pcs.length) return;
                var bb = [1e9, 1e9, -1e9, -1e9]; pcs.forEach(function (p) { bb[0] = Math.min(bb[0], p[0]); bb[1] = Math.min(bb[1], p[1]); bb[2] = Math.max(bb[2], p[2]); bb[3] = Math.max(bb[3], p[3]); });
                var wx = bb[2] - bb[0], wy = bb[3] - bb[1], porX = wx >= wy;     /* el vano corre a lo largo de X (muro horizontal) o de Y */
                var zl = tipo === 'v' ? 2.1 : tipo === 'g' ? 2.4 : 2.1;
                pcs.forEach(function (p) {
                    B(opq, p[0], p[1], zf + zl, p[2], p[3], zf + WH, MAT.muro, n, 0);
                    if (tipo === 'v') B(opq, p[0], p[1], zf, p[2], p[3], zf + 0.9, MAT.muro, n, 0);
                });
                var cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
                function plano(a0, a1, z0, z1, col, lst, grosor, em) {   /* panel a lo largo del vano, a media altura del grosor del muro */
                    if (porX) B(lst || opq, a0, cy - grosor / 2, zf + z0, a1, cy + grosor / 2, zf + z1, col, n, em);
                    else B(lst || opq, cx - grosor / 2, a0, zf + z0, cx + grosor / 2, a1, zf + z1, col, n, em);
                }
                var a0 = porX ? bb[0] : bb[1], a1 = porX ? bb[2] : bb[3], gr = Math.min(wx, wy);
                if (tipo === 'v') {
                    var fw = 0.05;
                    plano(a0, a1, 0.9, 2.1, MAT.vidrio, gls, 0.025, 1);
                    plano(a0, a0 + fw, 0.9, 2.1, MAT.marco, null, gr * 0.7); plano(a1 - fw, a1, 0.9, 2.1, MAT.marco, null, gr * 0.7);
                    plano(a0, a1, 0.9, 0.9 + fw, MAT.marco, null, gr * 0.7); plano(a0, a1, 2.1 - fw, 2.1, MAT.marco, null, gr * 0.7);
                    plano((a0 + a1) / 2 - 0.02, (a0 + a1) / 2 + 0.02, 0.9, 2.1, MAT.marco, null, gr * 0.6);   /* parteluz central */
                } else if (tipo === 'p') {
                    plano(a0 + 0.01, a1 - 0.01, 0, 2.1, MAT.puerta, null, 0.045);
                } else if (tipo === 'g') {
                    var nh = 3, ww = (a1 - a0) / nh;
                    for (var i = 0; i < nh; i++) plano(a0 + i * ww + 0.02, a0 + (i + 1) * ww - 0.02, 0, 2.4, MAT.porton, null, 0.06);
                }
            });
            /* --- columnas (pilastras que sobresalen un poco del muro) --- */
            g.cols.forEach(function (c) { B(opq, c[0] - 0.012, c[1] - 0.012, zf, c[2] + 0.012, c[3] + 0.012, zf + WH, MAT.col, n, 0); });
            /* --- escalera de dos tramos hasta el piso siguiente --- */
            if (n < N) pi.rooms.forEach(function (r) { if (r.tipo === 'escalera') escalera(r, zf, n); });
        });

        function escalera(r, zf, n) {
            var x0 = r.x + 0.12, y0 = r.y + 0.12, x1 = r.x + r.w - 0.12, y1 = r.y + r.h - 0.12, alongY = (y1 - y0) >= (x1 - x0);
            var U0 = alongY ? y0 : x0, U1 = alongY ? y1 : x1, V0 = alongY ? x0 : y0, V1 = alongY ? x1 : y1;
            var hw = (V1 - V0 - 0.1) / 2, land = Math.min(1.3, hw + 0.1), Lf = (U1 - U0) - land, nS = 8, tr = Lf / nS, ri = H / (2 * nS);
            function bx(u0, v0, u1, v1, z0, z1) { if (alongY) B(opq, v0, u0, z0, v1, u1, z1, MAT.escalon, n, 0); else B(opq, u0, v0, z0, u1, v1, z1, MAT.escalon, n, 0); }
            for (var i = 0; i < nS; i++) bx(U0 + i * tr, V0, U0 + (i + 1) * tr, V0 + hw, zf, zf + (i + 1) * ri);
            bx(U0 + Lf, V0, U1, V1, zf, zf + nS * ri);
            for (var j = 0; j < nS; j++) bx(U0 + Lf - (j + 1) * tr, V1 - hw, U0 + Lf - j * tr, V1, zf, zf + (nS + j + 1) * ri);
        }

        /* --- cubierta --- */
        var top = G[G.length - 1], zt = N * H, fr = N + 1;
        var bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9;
        if (top) top.rooms.forEach(function (r) {
            if (EXT.test(r.tipo)) return;
            bx0 = Math.min(bx0, r.x); bx1 = Math.max(bx1, r.x + r.w); by0 = Math.min(by0, r.y); by1 = Math.max(by1, r.y + r.h);
        });
        if (bx1 > bx0) {
            var casa = !!(Pl.esCasa || N <= 2), oh = casa ? 0.35 : 0.15;
            /* losa de cubierta con alero */
            B(opq, bx0 - oh, by0 - oh, zt - SL, bx1 + oh, by1 + oh, zt + 0.04, MAT.techo, fr, 0);
            if (casa) {
                /* pendiente suave a dos aguas (escalonada) hacia el eje longitudinal */
                var midY = (by0 + by1) / 2, steps = 4, rise = 0.55;
                for (var si = 0; si < steps; si++) {
                    var t0 = si / steps, t1 = (si + 1) / steps;
                    var yA = by0 - oh + (midY - (by0 - oh)) * t0, yB = by0 - oh + (midY - (by0 - oh)) * t1;
                    var yC = by1 + oh - (by1 + oh - midY) * t0, yD = by1 + oh - (by1 + oh - midY) * t1;
                    var zh = zt + 0.04 + rise * t1;
                    B(opq, bx0 - oh, yA, zt + 0.04, bx1 + oh, yB, zh, MAT.techo, fr, 0);
                    B(opq, bx0 - oh, yD, zt + 0.04, bx1 + oh, yC, zh, MAT.techo, fr, 0);
                }
                /* cumbrera */
                B(opq, bx0 - oh * 0.5, midY - 0.08, zt + 0.04 + rise, bx1 + oh * 0.5, midY + 0.08, zt + 0.08 + rise, MAT.marco, fr, 0);
            } else if (top.g) {
                /* edificio: pretil de fachada */
                top.g.filas.forEach(function (q) {
                    if (q[2] < bx0 + 0.3 || q[0] > bx1 - 0.3 || q[3] < by0 + 0.3 || q[1] > by1 - 0.3)
                        B(opq, q[0], q[1], zt + 0.02, q[2], q[3], zt + 0.55, MAT.muro, fr, 0);
                });
            }
        }

        /* --- suelo, acera, calle --- */
        var W = Pl.W, L = Pl.L, X0 = -70, X1 = W + 70;
        B(opq, X0, 0, -0.7, X1, L + 70, -0.03, MAT.pasto, 0, 0);
        B(opq, X0, -1.8, -0.7, X1, 0, 0.0, MAT.acera, 0, 0);
        B(opq, X0, -9.3, -0.7, X1, -1.8, -0.08, MAT.calle, 0, 0);
        B(opq, X0, -1.88, -0.7, X1, -1.8, 0.0, MAT.bordillo, 0, 0);
        B(opq, X0, -11.1, -0.7, X1, -9.3, 0.0, MAT.acera, 0, 0);
        B(opq, X0, -70, -0.7, X1, -11.1, -0.03, MAT.pasto, 0, 0);
        for (var x = X0 + 2; x < X1 - 3; x += 5) B(opq, x, -5.6, -0.7, x + 2, -5.48, -0.075, MAT.raya, 0, 0);
        /* --- entorno (se puede ocultar): vecinos medianeros y árboles de acera --- */
        var nl = Math.min(2, N), nr = Math.min(3, Math.max(2, N - 1));
        B(opq, -14, 0, -0.03, -0.3, L, nl * H, MAT.vecino, -1, 0);
        B(opq, W + 0.3, 0, -0.03, W + 14, L, nr * H, MAT.vecino, -1, 0);
        [[-2.6, -0.9], [W + 2.6, -0.9], [W / 2 + 7, -10.2]].forEach(function (a) {
            B(opq, a[0] - 0.09, a[1] - 0.09, 0, a[0] + 0.09, a[1] + 0.09, 2.3, MAT.tronco, -1, 0);
            B(opq, a[0] - 1.15, a[1] - 1.15, 2.2, a[0] + 1.15, a[1] + 1.15, 3.1, MAT.copa, -1, 0);
            B(opq, a[0] - 0.85, a[1] - 0.85, 3.1, a[0] + 0.85, a[1] + 0.85, 3.8, MAT.copa, -1, 0);
            B(opq, a[0] - 0.5, a[1] - 0.5, 3.8, a[0] + 0.5, a[1] + 0.5, 4.3, MAT.copa, -1, 0);
        });
        return { opq: opq, gls: gls, N: N, W: W, L: L, D: Dmax, H: H, titulo: (Pl.n || N) };
    }

    /* ================================================================== 2. MATEMÁTICA 4×4 */
    function mul(a, b) { var o = new Float32Array(16); for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) { var s = 0; for (var k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; }
    function persp(fov, asp, n, f) { var t = 1 / Math.tan(fov / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; }
    function ortho(l, r, b, t, n, f) { var o = new Float32Array(16); o[0] = 2 / (r - l); o[5] = 2 / (t - b); o[10] = -2 / (f - n); o[12] = -(r + l) / (r - l); o[13] = -(t + b) / (t - b); o[14] = -(f + n) / (f - n); o[15] = 1; return o; }
    function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
    function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
    function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
    function nrm3(a) { var l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; }
    function lookAt(e, c, u) {
        var z = nrm3(sub3(e, c)), x = nrm3(cross3(u, z)), y = cross3(z, x), o = new Float32Array(16);
        o[0] = x[0]; o[1] = y[0]; o[2] = z[0]; o[4] = x[1]; o[5] = y[1]; o[6] = z[1]; o[8] = x[2]; o[9] = y[2]; o[10] = z[2];
        o[12] = -dot3(x, e); o[13] = -dot3(y, e); o[14] = -dot3(z, e); o[15] = 1; return o;
    }
    function xf(m, p) { var x = p[0], y = p[1], z = p[2]; return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]]; }

    /* ================================================================== 3. SHADERS */
    var VS = '#version 300 es\n' +
        'layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec3 aC; layout(location=3) in vec2 aF;\n' +
        'uniform mat4 uVP, uLVP; uniform float uMax, uEx, uCtx, uNB;\n' +
        'out vec3 vN; out vec3 vC; out vec3 vW; out float vEm; out vec4 vSh;\n' +
        'void main(){ float fl=aF.x; vec3 p=aP;\n' +
        '  if (fl > uMax + 0.01 || (fl < -0.5 && uCtx < 0.5)) { gl_Position = vec4(2.,2.,2.,1.); vN=aN; vC=aC; vW=p; vEm=0.; vSh=vec4(0.); return; }\n' +
        '  if (fl >= 1.0) p.z += (fl - 1.0) * uEx;\n' +
        '  vN=aN; vC=aC; vW=p; vEm=aF.y; vSh = uLVP * vec4(p + aN * uNB, 1.); gl_Position = uVP * vec4(p, 1.); }\n';
    var FS = '#version 300 es\nprecision highp float; precision highp sampler2DShadow;\n' +
        'in vec3 vN; in vec3 vC; in vec3 vW; in float vEm; in vec4 vSh;\n' +
        'uniform vec3 uSun, uSunCol, uSky, uGnd, uCam, uFogCol; uniform float uAmb, uFogK, uTexel, uNight, uGlass;\n' +
        'uniform sampler2DShadow uShadow; out vec4 o;\n' +
        'float shadow(){ vec3 s = vSh.xyz / vSh.w * 0.5 + 0.5; if (s.x<0.||s.x>1.||s.y<0.||s.y>1.||s.z>1.) return 1.0; float a=0.;\n' +
        '  for (int i=-1;i<=1;i++) for (int j=-1;j<=1;j++) a += texture(uShadow, vec3(s.xy + vec2(float(i),float(j))*uTexel*1.3, s.z - 0.0006));\n' +
        '  return a/9.; }\n' +
        'void main(){ vec3 n = normalize(gl_FrontFacing ? vN : -vN); vec3 alb = pow(vC, vec3(2.2));\n' +
        '  float ndl = max(dot(n, uSun), 0.); float sh = shadow();\n' +
        '  vec3 amb = mix(uGnd, uSky, n.z * 0.5 + 0.5) * uAmb;\n' +
        '  vec3 col = alb * (uSunCol * ndl * sh + amb);\n' +
        '  vec3 V = normalize(uCam - vW); float fr = pow(1.0 - abs(dot(n, V)), 3.0); float al = 1.0;\n' +
        '  if (uGlass > 0.5) { col = mix(col, uSky * 1.1, 0.35 + 0.5 * fr) + uSunCol * sh * pow(max(dot(reflect(-V, n), uSun), 0.), 40.) * 0.6; al = 0.30 + 0.40 * fr + 0.40 * uNight; }\n' +
        '  col += vec3(1.0, 0.62, 0.22) * vEm * uNight * 0.9;\n' +
        '  float d = length(uCam - vW); col = mix(col, pow(uFogCol, vec3(2.2)), 1.0 - exp(-d * uFogK));\n' +
        '  col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14); col = pow(clamp(col, 0., 1.), vec3(1. / 2.2));\n' +
        '  o = vec4(col, al); }\n';
    var VS_SKY = '#version 300 es\nvoid main(){ vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2); gl_Position = vec4(p * 2.0 - 1.0, 0.9999, 1.0); }\n';
    var FS_SKY = '#version 300 es\nprecision highp float; uniform vec2 uRes; uniform float uHor; uniform vec3 uTop, uHorC; out vec4 o;\n' +
        'void main(){ float y = gl_FragCoord.y / uRes.y; vec3 c = y < uHor ? uHorC : mix(uHorC, uTop, smoothstep(uHor, uHor + 0.75, y));\n' +
        '  o = vec4(c, 1.); }\n';
    var FS_DEPTH = '#version 300 es\nprecision highp float; void main(){}\n';

    /* ================================================================== 4. AMBIENTES (hora del día) */
    var HORAS = {
        dia: { sun: [0.50, -0.58, 0.64], col: [2.2, 2.05, 1.80], sky: [0.46, 0.62, 0.90], gnd: [0.34, 0.31, 0.26], amb: 0.46, top: [0.30, 0.54, 0.90], hor: [0.80, 0.89, 0.97], noche: 0 },
        tarde: { sun: [0.70, -0.62, 0.30], col: [2.5, 1.35, 0.65], sky: [0.50, 0.46, 0.66], gnd: [0.34, 0.26, 0.20], amb: 0.38, top: [0.30, 0.38, 0.68], hor: [1.0, 0.68, 0.44], noche: 0.25 },
        noche: { sun: [-0.35, -0.50, 0.79], col: [0.14, 0.20, 0.40], sky: [0.10, 0.14, 0.30], gnd: [0.04, 0.05, 0.08], amb: 0.22, top: [0.02, 0.04, 0.11], hor: [0.12, 0.16, 0.28], noche: 1 }
    };
    var VISTAS = {
        perspectiva: { n: 'Perspectiva', az: -0.62, el: 0.32 }, fachada: { n: 'Fachada', az: 0, el: 0.07 }, aerea: { n: 'Aérea', az: -0.62, el: 0.80 },
        posterior: { n: 'Posterior', az: 2.55, el: 0.30 }, lateral: { n: 'Lateral', az: -1.45, el: 0.18 }, planta: { n: 'Planta', az: 0, el: 1.50 }
    };

    /* ================================================================== 5. VISOR */
    var activo = null;

    function abrir(Pl) {
        if (activo) cerrar();
        var data;
        try { data = build(Pl); } catch (e) { console.warn('Civix 3D', e); return alerta('No pude levantar el plano en 3D: ' + (e.message || e)); }
        if (!data || !data.opq || !data.opq.length) return alerta('El plano no tiene geometría suficiente para el 3D. Genera primero la distribución (aprobar / modo cine) y vuelve a intentar.');
        var ov = doc.createElement('div'); ov.className = 'cx3d'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Render 3D del anteproyecto');
        var vbtn = Object.keys(VISTAS).map(function (k) { return '<button type="button" data-v="' + k + '"' + (k === 'perspectiva' ? ' class="on"' : '') + '>' + VISTAS[k].n + '</button>'; }).join('');
        var pisosOpt = '<option value="' + (data.N + 1) + '">Edificio completo</option>'; for (var i = data.N; i >= 1; i--) pisosOpt += '<option value="' + i + '">Corte hasta el piso ' + i + '</option>';
        ov.innerHTML = '<div class="cx3d-top"><div><small>CIVIX · RENDER 3D</small><b>' + (Pl.esCasa ? 'Casa' : 'Edificio') + ' · ' + data.N + ' piso' + (data.N > 1 ? 's' : '') + ' · lote ' + Pl.W.toFixed(2) + ' × ' + Pl.L.toFixed(2) + ' m</b></div>' +
            '<div class="cx3d-acts"><button type="button" data-a="png" title="Descarga la imagen en alta resolución">⬇ PNG</button><button type="button" data-a="4k" title="Imagen de 3840 px de ancho">⬇ 4K</button><button type="button" data-a="x" aria-label="Cerrar">✕</button></div></div>' +
            '<canvas class="cx3d-cv" tabindex="0"></canvas>' +
            '<div class="cx3d-bar"><div class="cx3d-grp"><span>Vista</span>' + vbtn + '</div>' +
            '<div class="cx3d-grp"><span>Hora</span><button type="button" data-h="dia" class="on">☀ Día</button><button type="button" data-h="tarde">🌇 Atardecer</button><button type="button" data-h="noche">🌙 Noche</button></div>' +
            '<div class="cx3d-grp"><span>Pisos</span><select data-s="pisos">' + pisosOpt + '</select></div>' +
            '<div class="cx3d-grp"><button type="button" data-t="explotar">Explotar</button><button type="button" data-t="entorno" class="on">Entorno</button><button type="button" data-t="girar">Girar</button></div></div>' +
            '<div class="cx3d-nota">Anteproyecto 3D a partir de tus planos: arrastra para orbitar · rueda para zoom · Mayús+arrastre para desplazar · vistas y hora del día en la barra. Es orientativo; no sustituye el diseño profesional ni el cálculo estructural.</div>';
        doc.body.appendChild(ov);
        var cv = ov.querySelector('canvas');
        var gl = cv.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: false });
        if (!gl) { ov.remove(); return alerta('Tu navegador o dispositivo no admite WebGL2, necesario para el render 3D.'); }
        var S = activo = {
            ov: ov, cv: cv, gl: gl, data: data, Pl: Pl, hora: 'dia', vista: 'perspectiva', maxPiso: data.N + 1, explotar: 0, entorno: 1, girar: false,
            az: VISTAS.perspectiva.az, el: VISTAS.perspectiva.el, d: 40, tgt: [Pl.W / 2, data.D / 2, data.N * H / 2.2], sucio: true, shSucio: true, tween: null, off: []
        };
        try { iniciarGL(S); } catch (e) { console.warn('Civix 3D', e); ov.remove(); activo = null; return alerta('No pude iniciar el render 3D: ' + (e.message || e)); }
        encuadrar(S); S.az = VISTAS.perspectiva.az; S.el = VISTAS.perspectiva.el;
        conectar(S);
        S.raf = global.requestAnimationFrame(function f(t) { if (activo !== S) return; bucle(S, t); S.raf = global.requestAnimationFrame(f); });
        return true;
    }
    function alerta(m) { try { global.alert(m); } catch (e) { } return false; }

    function cerrar() {
        var S = activo; if (!S) return; activo = null;
        try { global.cancelAnimationFrame(S.raf); } catch (e) { }
        S.off.forEach(function (f) { try { f(); } catch (e) { } });
        try { var x = S.gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); } catch (e) { }
        S.ov.remove();
    }

    /* ---- WebGL ---- */
    function prog(gl, vs, fs) {
        function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
        var p = gl.createProgram(); gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
        if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
        var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS); for (var i = 0; i < n; i++) { var a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
        return { p: p, u: u };
    }
    function paquete(gl, cajas) {
        var nv = cajas.length * 24, V = new Float32Array(nv * 11), I = new Uint32Array(cajas.length * 36), vi = 0, ii = 0, b = 0;
        cajas.forEach(function (c) {
            var x0 = c.x0, y0 = c.y0, z0 = c.z0, x1 = c.x1, y1 = c.y1, z1 = c.z1, col = c.c;
            var F = [
                [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], [1, 0, 0]], [[x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [-1, 0, 0]],
                [[x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [0, 1, 0]], [[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], [0, -1, 0]],
                [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1]], [[x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0], [0, 0, -1]]];
            F.forEach(function (f) {
                for (var k = 0; k < 4; k++) { var p = f[k], o = vi * 11; V[o] = p[0]; V[o + 1] = p[1]; V[o + 2] = p[2]; V[o + 3] = f[4][0]; V[o + 4] = f[4][1]; V[o + 5] = f[4][2]; V[o + 6] = col[0]; V[o + 7] = col[1]; V[o + 8] = col[2]; V[o + 9] = c.f; V[o + 10] = c.e; vi++; }
                I[ii++] = b; I[ii++] = b + 1; I[ii++] = b + 2; I[ii++] = b; I[ii++] = b + 2; I[ii++] = b + 3; b += 4;
            });
        });
        var vao = gl.createVertexArray(); gl.bindVertexArray(vao);
        var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
        var ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, I, gl.STATIC_DRAW);
        var st = 44; gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, st, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, st, 12);
        gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, st, 24); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 2, gl.FLOAT, false, st, 36);
        gl.bindVertexArray(null);
        return { vao: vao, n: I.length };
    }
    function iniciarGL(S) {
        var gl = S.gl;
        S.pMain = prog(gl, VS, FS); S.pDepth = prog(gl, VS, FS_DEPTH); S.pSky = prog(gl, VS_SKY, FS_SKY);
        S.mOpq = paquete(gl, S.data.opq); S.mGls = paquete(gl, S.data.gls);
        S.vaoVacio = gl.createVertexArray();
        var maxT = gl.getParameter(gl.MAX_TEXTURE_SIZE), movil = global.matchMedia && global.matchMedia('(pointer: coarse)').matches;
        S.shRes = Math.min(maxT, movil ? 2048 : 4096);
        S.shTex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, S.shTex);
        gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT24, S.shRes, S.shRes);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);
        S.shFB = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, S.shFB); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, S.shTex, 0);
        gl.drawBuffers([gl.NONE]); gl.readBuffer(gl.NONE);
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('mapa de sombras no disponible');
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    /* ---- cámara y luz ---- */
    function encuadrar(S) {
        var d = S.data, r = Math.hypot(d.W, d.D, d.N * H) / 2;
        S.tgt = [d.W / 2, d.D / 2, d.N * H / 2.2];
        S.dFit = Math.max(14, r / Math.tan(0.5 * 0.72 / 2) * 0.52 + 6);
        S.d = S.dFit;
    }
    function camara(S, asp) {
        var cp = Math.cos(S.el), e = [S.tgt[0] + S.d * Math.sin(S.az) * cp, S.tgt[1] - S.d * Math.cos(S.az) * cp, S.tgt[2] + S.d * Math.sin(S.el)];
        var P = persp(0.72, asp, Math.max(0.3, S.d * 0.02), 600), Vw = lookAt(e, S.tgt, [0, 0, 1]);
        return { vp: mul(P, Vw), eye: e };
    }
    function luz(S) {
        var h = HORAS[S.hora], s = nrm3(h.sun), d = S.data, ex = S.explotar * d.N, c = [d.W / 2, d.D / 2, (d.N * H + ex) / 2];
        var V = lookAt([c[0] + s[0] * 150, c[1] + s[1] * 150, c[2] + s[2] * 150], c, [0, 0, 1]);
        var mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
        [-16, d.W + 16].forEach(function (x) { [-4, d.L + 4].forEach(function (y) { [-0.8, (d.N + 1) * H + ex + 5].forEach(function (z) {
            var p = xf(V, [x, y, z]); for (var k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); }
        }); }); });
        var P = ortho(mn[0], mx[0], mn[1], mx[1], -mx[2] - 10, -mn[2] + 10);
        return { vp: mul(P, V), sun: s, ancho: mx[0] - mn[0] };
    }

    /* ---- dibujo ---- */
    function uniformes(S, p, camVP, L, cam, w, h) {
        var gl = S.gl, u = p.u, H_ = HORAS[S.hora];
        gl.uniformMatrix4fv(u.uVP, false, camVP); gl.uniformMatrix4fv(u.uLVP, false, L.vp);
        gl.uniform1f(u.uMax, S.maxPiso); gl.uniform1f(u.uEx, S.explotar); gl.uniform1f(u.uCtx, S.entorno); gl.uniform1f(u.uNB, 0.05);
        if (!u.uSun) return;
        gl.uniform3fv(u.uSun, L.sun); gl.uniform3fv(u.uSunCol, H_.col); gl.uniform3fv(u.uSky, H_.sky); gl.uniform3fv(u.uGnd, H_.gnd); gl.uniform3fv(u.uCam, cam.eye);
        gl.uniform3fv(u.uFogCol, H_.hor); gl.uniform1f(u.uAmb, H_.amb); gl.uniform1f(u.uFogK, 0.0045); gl.uniform1f(u.uTexel, 1 / S.shRes); gl.uniform1f(u.uNight, H_.noche);
        gl.uniform1i(u.uShadow, 0);
    }
    function sombras(S, L) {
        var gl = S.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, S.shFB); gl.viewport(0, 0, S.shRes, S.shRes);
        gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE); gl.cullFace(gl.FRONT); gl.enable(gl.POLYGON_OFFSET_FILL); gl.polygonOffset(1.5, 3);
        gl.useProgram(S.pDepth.p); uniformes(S, S.pDepth, L.vp, L, null, 0, 0);
        gl.bindVertexArray(S.mOpq.vao); gl.drawElements(gl.TRIANGLES, S.mOpq.n, gl.UNSIGNED_INT, 0);
        gl.disable(gl.POLYGON_OFFSET_FILL); gl.cullFace(gl.BACK);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        S.shSucio = false;
    }
    function dibujar(S, w, h) {
        var gl = S.gl, H_ = HORAS[S.hora], L = luz(S);
        if (S.shSucio) sombras(S, L);
        var cam = camara(S, w / h);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, w, h);
        gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        /* cielo */
        gl.disable(gl.DEPTH_TEST); gl.disable(gl.CULL_FACE); gl.useProgram(S.pSky.p);
        var hor = 0.5 + 0.5 * Math.tan(S.el) / Math.tan(0.36);
        gl.uniform2f(S.pSky.u.uRes, w, h); gl.uniform1f(S.pSky.u.uHor, Math.max(0, Math.min(1.2, hor))); gl.uniform3fv(S.pSky.u.uTop, H_.top); gl.uniform3fv(S.pSky.u.uHorC, H_.hor);
        gl.bindVertexArray(S.vaoVacio); gl.drawArrays(gl.TRIANGLES, 0, 3);
        /* sólidos */
        gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, S.shTex);
        gl.useProgram(S.pMain.p); uniformes(S, S.pMain, cam.vp, L, cam, w, h); gl.uniform1f(S.pMain.u.uGlass, 0);
        gl.bindVertexArray(S.mOpq.vao); gl.drawElements(gl.TRIANGLES, S.mOpq.n, gl.UNSIGNED_INT, 0);
        /* vidrio */
        if (S.mGls.n) {
            gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false); gl.disable(gl.CULL_FACE);
            gl.uniform1f(S.pMain.u.uGlass, 1); gl.bindVertexArray(S.mGls.vao); gl.drawElements(gl.TRIANGLES, S.mGls.n, gl.UNSIGNED_INT, 0);
            gl.disable(gl.BLEND); gl.depthMask(true);
        }
        gl.bindVertexArray(null);
    }
    function tamano(S) {
        var dpr = Math.min(global.devicePixelRatio || 1, 2), w = Math.max(2, Math.round(S.cv.clientWidth * dpr)), h = Math.max(2, Math.round(S.cv.clientHeight * dpr));
        if (S.cv.width !== w || S.cv.height !== h) { S.cv.width = w; S.cv.height = h; S.sucio = true; }
        return [w, h];
    }
    function bucle(S, t) {
        if (S.tween) {
            var k = Math.min(1, (t - S.tween.t0) / 650), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2, T = S.tween;
            S.az = T.az0 + (T.az1 - T.az0) * e; S.el = T.el0 + (T.el1 - T.el0) * e; S.d = T.d0 + (T.d1 - T.d0) * e; S.sucio = true; if (k >= 1) S.tween = null;
        }
        if (S.girar) { S.az += 0.0035; S.sucio = true; }
        var wh = tamano(S); if (S.sucio) { dibujar(S, wh[0], wh[1]); S.sucio = false; }
    }
    function irA(S, k) {
        var v = VISTAS[k]; if (!v) return;
        var az1 = v.az, az0 = S.az; while (az1 - az0 > Math.PI) az1 -= 2 * Math.PI; while (az1 - az0 < -Math.PI) az1 += 2 * Math.PI;
        S.vista = k; S.tween = { t0: global.performance.now(), az0: az0, az1: az1, el0: S.el, el1: v.el, d0: S.d, d1: S.dFit * (k === 'planta' ? 1.25 : k === 'fachada' ? 0.95 : 1) };
    }

    /* ---- interacción ---- */
    function conectar(S) {
        var cv = S.cv, ov = S.ov, ptr = {}, last = null;
        function on(el, ev, fn, o) { el.addEventListener(ev, fn, o); S.off.push(function () { el.removeEventListener(ev, fn, o); }); }
        on(cv, 'pointerdown', function (e) { cv.setPointerCapture(e.pointerId); ptr[e.pointerId] = { x: e.clientX, y: e.clientY }; S.tween = null; S.girar && 0; });
        on(cv, 'pointerup', function (e) { delete ptr[e.pointerId]; last = null; });
        on(cv, 'pointercancel', function (e) { delete ptr[e.pointerId]; last = null; });
        on(cv, 'pointermove', function (e) {
            var p = ptr[e.pointerId]; if (!p) return;
            var ids = Object.keys(ptr), dx = e.clientX - p.x, dy = e.clientY - p.y;
            if (ids.length >= 2) {   /* dos dedos: pellizco = zoom */
                var o = ptr[ids[0] === String(e.pointerId) ? ids[1] : ids[0]], d0 = Math.hypot(p.x - o.x, p.y - o.y), d1 = Math.hypot(e.clientX - o.x, e.clientY - o.y);
                if (d0 > 1) S.d = Math.max(3, Math.min(300, S.d * d0 / d1));
            } else if (e.shiftKey || e.buttons === 2) {
                var k = S.d * 0.0016, cx = Math.cos(S.az), sx = Math.sin(S.az);
                S.tgt[0] -= (dx * cx) * k; S.tgt[1] -= (dx * sx) * k; S.tgt[2] += dy * k;
            } else { S.az -= dx * 0.006; S.el = Math.max(0.02, Math.min(1.52, S.el + dy * 0.006)); }
            p.x = e.clientX; p.y = e.clientY; S.sucio = true;
        });
        on(cv, 'wheel', function (e) { e.preventDefault(); S.tween = null; S.d = Math.max(3, Math.min(300, S.d * Math.exp(e.deltaY * 0.0012))); S.sucio = true; }, { passive: false });
        on(cv, 'contextmenu', function (e) { e.preventDefault(); });
        on(global, 'resize', function () { S.sucio = true; });
        on(global, 'keydown', function (e) { if (e.key === 'Escape') cerrar(); });
        on(ov, 'click', function (e) {
            var b = e.target.closest('button'); if (!b) return;
            var a = b.getAttribute('data-a'), v = b.getAttribute('data-v'), h = b.getAttribute('data-h'), t = b.getAttribute('data-t');
            if (a === 'x') return cerrar();
            if (a === 'png') return exportar(S, 2560, b);
            if (a === '4k') return exportar(S, 3840, b);
            if (v) { ov.querySelectorAll('[data-v]').forEach(function (x) { x.classList.toggle('on', x === b); }); irA(S, v); }
            if (h) { ov.querySelectorAll('[data-h]').forEach(function (x) { x.classList.toggle('on', x === b); }); S.hora = h; S.shSucio = true; S.sucio = true; }
            if (t === 'explotar') { var on_ = b.classList.toggle('on'); S.explotar = on_ ? 2.2 : 0; S.shSucio = true; S.sucio = true; }
            if (t === 'entorno') { var on2 = b.classList.toggle('on'); S.entorno = on2 ? 1 : 0; S.shSucio = true; S.sucio = true; }
            if (t === 'girar') { S.girar = b.classList.toggle('on'); S.tween = null; }
        });
        on(ov, 'change', function (e) { var s = e.target.closest('[data-s="pisos"]'); if (!s) return; S.maxPiso = +s.value; S.shSucio = true; S.sucio = true; });
    }

    /* ---- exportar PNG (renderiza de nuevo, a mayor resolución, y devuelve el visor a su tamaño) ---- */
    function exportar(S, ancho, btn) {
        var gl = S.gl, cv = S.cv, w0 = cv.width, h0 = cv.height, asp = w0 / h0, w = ancho, h = Math.round(ancho / asp);
        var maxR = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE); if (w > maxR) { w = maxR; h = Math.round(w / asp); }
        var txt = btn && btn.textContent;
        try {
            cv.width = w; cv.height = h; dibujar(S, w, h);
            cv.toBlob(function (blob) {
                cv.width = w0; cv.height = h0; S.sucio = true;
                if (!blob) { if (btn) btn.textContent = '⚠ sin memoria'; return; }
                var a = doc.createElement('a'), nombre = 'civix_render_3d_' + S.vista + '_' + S.hora + '_' + w + 'px.png';
                a.href = URL.createObjectURL(blob); a.download = nombre; doc.body.appendChild(a); a.click();
                setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
                if (btn) { btn.textContent = txt.replace(/ ✓$/, '') + ' ✓'; }
            }, 'image/png');
        } catch (e) { cv.width = w0; cv.height = h0; S.sucio = true; if (btn) btn.textContent = '⚠ ' + (e.message || 'error'); }
    }

    global.Civix3D = { abrir: abrir, cerrar: cerrar, build: build, estado: function () { return activo; } };
    CAD.render3d = abrir;
})(typeof window !== 'undefined' ? window : globalThis);
