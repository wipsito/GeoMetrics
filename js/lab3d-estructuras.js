/**
 * GeoMetrics — Estructuras I en el laboratorio 3D común (GeoLab3D).
 *
 * Registra los cinco modelos (viga con apoyos configurables, voladizo, cercha Pratt, pórtico y viga continua) como
 * máquinas de GeoLab3D: así heredan el diseño inmersivo a pantalla completa, el tutor Elisa/Rafael, el panel de
 * parámetros, la tabla de resultados y las gráficas (lab3d-pro, lab3d-inmersivo, lab3d-estudiante).
 *
 * Los cálculos salen de EstCalc (js/est-calc.js) a través de EstruSim.sims (js/est-sim.js); aquí solo se dibuja:
 *   · la viga se flexiona de verdad con su elástica (amplificada), con perfil I en acero/aluminio y macizo en concreto/madera
 *   · apoyos según su tipo (pasador, rodillo, empotramiento, libre) y reacciones con su valor
 *   · el análisis avanza por etapas: cargas → reacciones → cortante → momento → deformada
 * Tipos registrados: est_viga, est_voladizo, est_cercha, est_portico, est_continuas.
 */
(function (global) {
    'use strict';
    var L3 = global.GeoLab3D, S = global.EstruSim;
    if (!L3 || !L3.register || !S || !S.sims) return;
    var T = null;
    var doc = global.document;
    var IDS = ['viga', 'voladizo', 'cercha', 'portico', 'continuas'];
    var ESCALA = 6.6;                 /* el modelo se normaliza para que su luz quepa en el escenario */

    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function num(v) { return isFinite(+v) ? +v : 0; }
    function fmt(v, d) {
        if (v == null || !isFinite(v)) return '—';
        return Number(v).toLocaleString('es-CO', { minimumFractionDigits: d, maximumFractionDigits: d });
    }
    function plano(h) { var d = doc.createElement('div'); d.innerHTML = String(h == null ? '' : h); return (d.textContent || '').replace(/\s+/g, ' ').trim(); }

    /* ======================= materiales y piezas ======================= */
    var MAT = {
        acero: { color: 0x8FA0B0, metalness: 0.72, roughness: 0.3 },
        concreto: { color: 0x9AA5B1, metalness: 0.03, roughness: 0.9 },
        madera: { color: 0xB07F52, metalness: 0.03, roughness: 0.74 },
        aluminio: { color: 0xC3CED8, metalness: 0.85, roughness: 0.22 }
    };
    var STEEL = { color: 0x8FA3B8, metalness: 0.75, roughness: 0.3 };
    var STEEL_DARK = { color: 0x46566B, metalness: 0.55, roughness: 0.48 };
    var C_LOAD = 0xFBBF24, C_P = 0xF87171, C_REAC = 0x34D399, C_V = 0x60A5FA, C_M = 0x34D399, C_DEF = 0xF472B6;

    function std(info, extra) {
        var o = { color: info.color, metalness: info.metalness, roughness: info.roughness };
        if (extra) Object.keys(extra).forEach(function (k) { o[k] = extra[k]; });
        return new T.MeshStandardMaterial(o);
    }
    function glow(color, k) { return new T.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: k == null ? 0.25 : k, metalness: 0.2, roughness: 0.4 }); }
    function caja(parent, w, h, d, x, y, z, m) {
        var o = new T.Mesh(new T.BoxGeometry(Math.max(0.001, w), Math.max(0.001, h), Math.max(0.001, d)), m);
        o.position.set(x || 0, y || 0, z || 0); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
    }
    function cil(parent, rt, rb, h, x, y, z, m, eje, seg) {
        var o = new T.Mesh(new T.CylinderGeometry(Math.max(0.001, rt), Math.max(0.001, rb), Math.max(0.001, h), seg || 20), m);
        o.position.set(x || 0, y || 0, z || 0);
        if (eje === 'x') o.rotation.z = Math.PI / 2; else if (eje === 'z') o.rotation.x = Math.PI / 2;
        o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
    }
    function barra(parent, a, b, grueso, m, prof) {
        var dir = new T.Vector3().subVectors(b, a), len = dir.length();
        if (len < 1e-5) return null;
        var o = new T.Mesh(new T.BoxGeometry(len, grueso, prof || grueso), m);
        o.position.copy(a).add(b).multiplyScalar(0.5);
        o.quaternion.setFromUnitVectors(new T.Vector3(1, 0, 0), dir.normalize());
        o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
    }
    /* flecha 3D de «desde» a «hasta»; se escala a lo largo con g.scale.y */
    function flecha(parent, desde, hasta, color, radio) {
        var dir = new T.Vector3().subVectors(hasta, desde), len = dir.length();
        if (len < 1e-5) return null;
        var g = new T.Group(); g.position.copy(desde);
        var cab = Math.min(len * 0.32, 0.26), cuerpo = Math.max(0.02, len - cab), m = glow(color, 0.18);
        var sh = new T.Mesh(new T.CylinderGeometry(radio, radio, cuerpo, 10), m); sh.position.y = cuerpo / 2; sh.castShadow = true;
        var hd = new T.Mesh(new T.ConeGeometry(radio * 3.1, cab, 14), m); hd.position.y = cuerpo + cab / 2; hd.castShadow = true;
        g.add(sh); g.add(hd);
        g.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dir.normalize());
        parent.add(g); return g;
    }
    /* flecha curva de un momento (reacción de empotramiento o M_B) */
    function arcoMomento(parent, x, y, z, R, color, horario) {
        var g = new T.Group(); g.position.set(x, y, z); parent.add(g);
        var m = glow(color, 0.3);
        var arco = new T.Mesh(new T.TorusGeometry(R, R * 0.07, 8, 32, Math.PI * 1.45), m);
        arco.rotation.z = Math.PI * 0.27; g.add(arco);
        var punta = new T.Mesh(new T.ConeGeometry(R * 0.2, R * 0.42, 12), m);
        var ang = Math.PI * 0.27 + Math.PI * 1.45;
        punta.position.set(Math.cos(ang) * R, Math.sin(ang) * R, 0);
        punta.rotation.z = ang + Math.PI;                 /* apunta en el sentido del giro */
        g.add(punta);
        if (horario) g.scale.x = -1;
        return g;
    }
    function etiqueta(texto, color, k) {
        var font = '700 30px Inter, Arial, sans-serif', pad = 18;
        var c = doc.createElement('canvas'), ctx = c.getContext('2d');
        ctx.font = font; var tw = Math.ceil(ctx.measureText(texto).width);
        c.width = tw + pad * 2; c.height = 56; ctx = c.getContext('2d');
        ctx.font = font; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(11,18,32,.88)'; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(1, 1, c.width - 2, c.height - 2, 18); else ctx.rect(1, 1, c.width - 2, c.height - 2);
        ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = color; ctx.fillText(texto, c.width / 2, c.height / 2 + 1);
        var tex = new T.CanvasTexture(c); tex.minFilter = T.LinearFilter;
        var sp = new T.Sprite(new T.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
        sp.renderOrder = 10;
        sp.userData.base = [c.width / 120 * (k || 1), c.height / 120 * (k || 1)];
        sp.scale.set(sp.userData.base[0], sp.userData.base[1], 1);
        return sp;
    }
    function hex(c) { return '#' + ('000000' + c.toString(16)).slice(-6); }

    /* cinta de diagrama (V o M) en un plano vertical paralelo a la viga */
    function cinta(parent, xs, vals, z, color, escala, y0) {
        var n = xs.length, pos = new Float32Array(n * 6), idx = [], lp = new Float32Array(n * 3);
        for (var i = 0; i < n; i++) {
            pos[i * 6] = xs[i]; pos[i * 6 + 1] = 0; pos[i * 6 + 2] = 0;
            pos[i * 6 + 3] = xs[i]; pos[i * 6 + 4] = vals[i] * escala; pos[i * 6 + 5] = 0;
            lp[i * 3] = xs[i]; lp[i * 3 + 1] = vals[i] * escala; lp[i * 3 + 2] = 0;
            if (i < n - 1) { var a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setIndex(idx);
        var g = new T.Group(); g.position.set(0, y0 || 0, z);
        g.add(new T.Mesh(geo, new T.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.42, side: T.DoubleSide, depthWrite: false })));
        var lg = new T.BufferGeometry(); lg.setAttribute('position', new T.BufferAttribute(lp, 3));
        g.add(new T.Line(lg, new T.LineBasicMaterial({ color: color })));
        /* contorno grueso (las líneas de WebGL miden 1 px) */
        var paso = Math.max(1, Math.floor(n / 80)), pts = [];
        for (var j = 0; j < n; j += paso) pts.push(new T.Vector3(xs[j], vals[j] * escala, 0));
        pts.push(new T.Vector3(xs[n - 1], vals[n - 1] * escala, 0));
        if (pts.length > 2) g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts, false, 'centripetal'), pts.length * 2, 0.022, 6, false), new T.MeshBasicMaterial({ color: color })));
        var base = new T.BufferGeometry().setFromPoints([new T.Vector3(xs[0], 0, 0), new T.Vector3(xs[n - 1], 0, 0)]);
        g.add(new T.Line(base, new T.LineBasicMaterial({ color: color, transparent: true, opacity: 0.45 })));
        parent.add(g); return g;
    }
    function interp(xs, ys, x) {
        if (x <= xs[0]) return ys[0];
        var n = xs.length; if (x >= xs[n - 1]) return ys[n - 1];
        var lo = 0, hi = n - 1;
        while (hi - lo > 1) { var m = (lo + hi) >> 1; if (xs[m] <= x) lo = m; else hi = m; }
        var t = (x - xs[lo]) / ((xs[hi] - xs[lo]) || 1);
        return ys[lo] + (ys[hi] - ys[lo]) * t;
    }
    function maxAbs(a) { var m = 0; for (var i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i])); return m || 1; }

    /* viga que se flexiona: perfil I (acero, aluminio) o sección maciza (concreto, madera) */
    function vigaFlexible(parent, L, D, mat, y) {
        var geo, esI = mat === 'acero' || mat === 'aluminio';
        if (esI) {
            var w = D.w, d = D.d, tf = Math.max(0.025, d * 0.1), tw = Math.max(0.018, w * 0.13), s = new T.Shape();
            s.moveTo(-w / 2, -d / 2); s.lineTo(w / 2, -d / 2); s.lineTo(w / 2, -d / 2 + tf); s.lineTo(tw / 2, -d / 2 + tf);
            s.lineTo(tw / 2, d / 2 - tf); s.lineTo(w / 2, d / 2 - tf); s.lineTo(w / 2, d / 2); s.lineTo(-w / 2, d / 2);
            s.lineTo(-w / 2, d / 2 - tf); s.lineTo(-tw / 2, d / 2 - tf); s.lineTo(-tw / 2, -d / 2 + tf); s.lineTo(-w / 2, -d / 2 + tf);
            s.closePath();
            geo = new T.ExtrudeGeometry(s, { depth: L, steps: 96, bevelEnabled: false });
            geo.rotateY(Math.PI / 2); geo.translate(-L / 2, 0, 0);
        } else {
            geo = new T.BoxGeometry(L, D.d, D.w, 96, 2, 2);
        }
        var mesh = new T.Mesh(geo, std(MAT[mat] || MAT.concreto));
        mesh.position.y = y; mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh);
        var pos = geo.attributes.position, base = Float32Array.from(pos.array), ultimo = -1;
        return {
            mesh: mesh,
            /* fn(x) = descenso del eje en x (positivo hacia abajo); k = fracción aplicada */
            doblar: function (fn, k) {
                if (Math.abs(k - ultimo) < 1e-4) return; ultimo = k;
                var a = pos.array;
                for (var i = 0; i < pos.count; i++) a[i * 3 + 1] = base[i * 3 + 1] - fn(base[i * 3]) * k;
                pos.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
            }
        };
    }
    function lineaElastica(parent, L, fn, y, z) {
        var n = 90, pts = [], ref = [];
        for (var i = 0; i <= n; i++) { var x = -L / 2 + L * i / n; pts.push(new T.Vector3(x, y, z)); ref.push(new T.Vector3(x, y, z)); }
        var geo = new T.BufferGeometry().setFromPoints(pts);
        var linea = new T.Line(geo, new T.LineBasicMaterial({ color: C_DEF }));
        var rg = new T.BufferGeometry().setFromPoints(ref);
        var refL = new T.Line(rg, new T.LineDashedMaterial({ color: C_DEF, transparent: true, opacity: 0.35, dashSize: 0.12, gapSize: 0.09 }));
        refL.computeLineDistances();
        parent.add(linea); parent.add(refL);
        return function (k) {
            var a = geo.attributes.position.array;
            for (var i = 0; i <= n; i++) a[i * 3 + 1] = y - fn(-L / 2 + L * i / n) * k;
            geo.attributes.position.needsUpdate = true;
            linea.visible = refL.visible = k > 0.01;
        };
    }

    /* ---------------- apoyos ---------------- */
    function pasador(parent, x, z, topY, rodillo, ac) {
        var g = new T.Group(); g.position.set(x, 0, z); parent.add(g);
        var acero = std(STEEL), oscuro = std(STEEL_DARK), acc = std({ color: ac, metalness: 0.4, roughness: 0.38 });
        caja(g, 0.62, 0.07, 0.62, 0, 0.035, 0, oscuro);
        var y0 = 0.07;
        if (rodillo) {
            for (var i = -1; i <= 1; i++) cil(g, 0.05, 0.05, 0.5, i * 0.14, 0.12, 0, acero, 'z', 14);
            caja(g, 0.56, 0.04, 0.54, 0, 0.19, 0, oscuro); y0 = 0.21;
        }
        var h = Math.max(0.16, topY - y0 - 0.06);
        var tri = new T.Mesh(new T.CylinderGeometry(0.03, 0.26, h, 3), acero);
        tri.position.y = y0 + h / 2; tri.rotation.y = Math.PI / 6; tri.castShadow = true; g.add(tri);
        cil(g, 0.06, 0.06, 0.38, 0, topY - 0.04, 0, acc, 'z', 16);
        return g;
    }
    function muro(parent, x, lado, alto, ancho) {
        var g = new T.Group(); parent.add(g);
        var m = std({ color: 0x5B6B80, metalness: 0.06, roughness: 0.88 });
        var w = caja(g, 0.46, alto, ancho, x + lado * 0.23, alto / 2, 0, m);
        var e = new T.LineSegments(new T.EdgesGeometry(w.geometry), new T.LineBasicMaterial({ color: 0x0B1220, transparent: true, opacity: 0.35 }));
        w.add(e);
        var rayado = std(STEEL_DARK);
        for (var hh = -alto / 2 + 0.2; hh <= alto / 2 - 0.15; hh += 0.24) {
            var r = caja(g, 0.02, 0.02, ancho * 0.82, x + lado * 0.47, alto / 2 + hh, 0, rayado);
            r.rotation.z = -0.55 * lado;
        }
        return g;
    }
    function apoyo(parent, tipo, x, baseY, lado, ac, D) {
        if (tipo === 'pin') return pasador(parent, x, 0, baseY, false, ac);
        if (tipo === 'roller') return pasador(parent, x, 0, baseY, true, ac);
        if (tipo === 'fixed') return muro(parent, x, lado, Math.max(1.6, baseY + D.d + 0.9), Math.max(1.1, D.w + 0.7));
        return null;
    }
    /* reacción vertical con su valor: flecha delante del apoyo que llega a la altura yTop (cara inferior del elemento) */
    function reaccion(parent, x, yTop, valor, nombre, z) {
        var g = new T.Group(); g.position.set(x, 0, z); parent.add(g);
        var largo = clamp(yTop - 0.04, 0.45, 0.95), y0 = yTop - largo, y1 = yTop - 0.04;
        var f = new T.Group(); g.add(f);
        if (valor >= 0) flecha(f, new T.Vector3(0, y0, 0), new T.Vector3(0, y1, 0), C_REAC, 0.026);
        else flecha(f, new T.Vector3(0, y1, 0), new T.Vector3(0, y0, 0), C_REAC, 0.026);
        var et = etiqueta(nombre + ' = ' + fmt(valor, 1) + ' kN', '#34D399', 0.74);
        et.position.set(0, y0 + largo * 0.45, 0.42); g.add(et);
        g.userData.flecha = f;
        return g;
    }
    var CERO = { load: 0, reac: 0, V: 0, M: 0, d: 0, col: 0, eq: 0, inf: 0, MB: 0 };
    function reaccionMomento(parent, x, y, valor, nombre, z) {
        var g = new T.Group(); parent.add(g);
        arcoMomento(g, x, y, z, 0.42, C_REAC, valor < 0);
        var et = etiqueta(nombre + ' = ' + fmt(Math.abs(valor), 1) + ' kN·m', '#34D399', 0.74);
        et.position.set(x, y + 0.78, z); g.add(et);
        return g;
    }
    function cargaDistribuida(parent, xa, xb, yTop, yBase, w, nombre, n) {
        var g = new T.Group(); parent.add(g);
        n = n || 10;
        var flechas = [];
        for (var i = 0; i <= n; i++) {
            var x = xa + (xb - xa) * i / n;
            var f = new T.Group(); f.position.set(x, yBase, 0); g.add(f);
            flecha(f, new T.Vector3(0, yTop - yBase, 0), new T.Vector3(0, 0.04, 0), C_LOAD, 0.014);
            flechas.push(f);
        }
        caja(g, (xb - xa), 0.024, 0.024, (xa + xb) / 2, yTop, 0, glow(C_LOAD));
        var et = etiqueta(nombre + ' = ' + fmt(w, 1) + ' kN/m', '#FBBF24', 0.78);
        et.position.set((xa + xb) / 2, yTop + 0.3, 0); g.add(et);
        g.userData.flechas = flechas;
        return g;
    }
    function cargaPuntual(parent, x, yBase, P, nombre) {
        var g = new T.Group(); g.position.set(x, yBase, 0); parent.add(g);
        var f = new T.Group(); g.add(f);
        flecha(f, new T.Vector3(0, 1.3, 0), new T.Vector3(0, 0.05, 0), C_P, 0.028);
        var et = etiqueta(nombre + ' = ' + fmt(P, 1) + ' kN', '#F87171', 0.84);
        et.position.set(0, 1.62, 0); g.add(et);
        return g;
    }
    function dims(P) { return { w: clamp(num(P.b) / 1000, 0.14, 0.62), d: clamp(num(P.h) / 1000, 0.2, 0.9) }; }
    function escalaFlechas(g, k) { if (g) (g.userData.flechas || []).forEach(function (f) { f.scale.y = Math.max(0.001, k); }); }

    /* ======================= MODELOS ======================= */
    /* set(s): s = { load, reac, V, M, d, col, eq, inf, MB } con valores de 0 a 1 según la etapa del análisis */

    /* ---------- viga con apoyos configurables (y viga continua, que comparte la lógica) ---------- */
    function modeloViga(P, r, ac, tramos) {
        var root = new T.Group();
        var L = tramos ? num(P.L1) + num(P.L2) : num(P.L), D = dims(P), baseY = 0.66, y = baseY + D.d / 2, top = y + D.d / 2;
        var x0 = -L / 2;
        var maxD = maxAbs(r.ds || [1]), amp = clamp(L * 0.045, 0.2, 0.55);
        function fn(x) { return interp(r.xs, r.ds, x - x0) / maxD * amp; }
        var viga = vigaFlexible(root, L, D, P.mat, y);
        var zF = D.w / 2 + 0.05;
        var elast = lineaElastica(root, L, fn, y, zF);

        /* apoyos */
        var tipos = tramos ? ['pin', 'roller', 'roller'] : [P.sl, P.sr];
        var xsA = tramos ? [x0, x0 + num(P.L1), L / 2] : [x0, L / 2];
        tipos.forEach(function (t, i) { apoyo(root, t, xsA[i], baseY, i === 0 ? -1 : 1, ac, D); });

        /* cargas */
        var cargas = new T.Group(); root.add(cargas);
        var yC = top + 0.95, wG = [], pG = null;
        if (tramos) {
            if (num(P.w1) > 0) wG.push(cargaDistribuida(cargas, x0, xsA[1], yC, top, P.w1, 'w₁', 8));
            if (num(P.w2) > 0) wG.push(cargaDistribuida(cargas, xsA[1], xsA[2], yC, top, P.w2, 'w₂', 8));
        } else {
            if (num(P.w) > 0) wG.push(cargaDistribuida(cargas, x0, L / 2, yC, top, P.w, 'w', 10));
            if (num(P.P) > 0) pG = cargaPuntual(cargas, x0 + L * clamp(num(P.aF), 0, 1), top, P.P, 'P');
        }

        /* reacciones */
        var reacs = new T.Group(); root.add(reacs);
        var zR = D.w / 2 + 0.5;
        if (tramos) {
            reaccion(reacs, xsA[0], baseY, r.RA, 'R_A', zR); reaccion(reacs, xsA[1], baseY, r.RB, 'R_B', zR); reaccion(reacs, xsA[2], baseY, r.RC, 'R_C', zR);
        } else {
            if (P.sl !== 'free') reaccion(reacs, xsA[0] + (P.sl === 'fixed' ? 0.35 : 0), baseY, r.RA, 'R_A', zR);
            if (P.sr !== 'free') reaccion(reacs, xsA[1] - (P.sr === 'fixed' ? 0.35 : 0), baseY, r.RB, 'R_B', zR);
            if (P.sl === 'fixed') reaccionMomento(reacs, xsA[0] + 0.05, y, r.MA, 'M_A', zR + 0.1);
            if (P.sr === 'fixed') reaccionMomento(reacs, xsA[1] - 0.05, y, r.MB, 'M_B', zR + 0.1);
        }

        /* diagramas: cortante detrás, momento delante (positivo cuelga, como se dibuja en clase) */
        var diag = new T.Group(); root.add(diag);
        var xsW = r.xs.map(function (x) { return x0 + x; });
        var zD = Math.max(0.95, D.w / 2 + 0.75);
        var dV = cinta(diag, xsW, r.vs, -zD, C_V, 0.55 / maxAbs(r.vs), y);
        var dM = cinta(diag, xsW, r.ms.map(function (m) { return -m; }), zD, C_M, 0.7 / maxAbs(r.ms), y);
        var eV = etiqueta('V (kN)', '#60A5FA', 0.62); eV.position.set(x0 - 0.35, y + 0.15, -zD); diag.add(eV);
        var eM = etiqueta('M (kN·m)', '#34D399', 0.62); eM.position.set(x0 - 0.45, y + 0.15, zD); diag.add(eM);
        /* valor máximo de cada diagrama */
        var iV = 0, iM = 0;
        r.vs.forEach(function (v, i) { if (Math.abs(v) > Math.abs(r.vs[iV])) iV = i; });
        r.ms.forEach(function (m, i) { if (Math.abs(m) > Math.abs(r.ms[iM])) iM = i; });
        var mV = etiqueta('V = ' + fmt(r.vs[iV], 1) + ' kN', '#60A5FA', 0.66);
        mV.position.set(xsW[iV], y + r.vs[iV] * 0.55 / maxAbs(r.vs) + (r.vs[iV] >= 0 ? 0.25 : -0.25), -zD); diag.add(mV);
        var mM = etiqueta('M = ' + fmt(r.ms[iM], 1) + ' kN·m', '#34D399', 0.66);
        mM.position.set(xsW[iM], y - r.ms[iM] * 0.7 / maxAbs(r.ms) + (r.ms[iM] >= 0 ? -0.25 : 0.25), zD); diag.add(mM);
        var dMax = etiqueta('δmáx = ' + fmt(r.dmax, 2) + ' mm', '#F472B6', 0.7);
        dMax.position.set(x0 + (r.xd || L / 2), y - D.d / 2 - amp - 0.32, zF); root.add(dMax);

        var dim = etiqueta(tramos ? 'L₁ = ' + fmt(P.L1, 1) + ' m · L₂ = ' + fmt(P.L2, 1) + ' m' : 'L = ' + fmt(L, 2) + ' m', '#94A3B8', 0.74);
        dim.position.set(0, 0.16, D.w / 2 + 1.25); root.add(dim);

        /* momento negativo en B (viga continua) */
        var mb = null;
        if (tramos) {
            mb = new T.Group(); root.add(mb);
            arcoMomento(mb, xsA[1], top + 0.42, 0, 0.32, 0xF472B6, false);
            arcoMomento(mb, xsA[1], top + 0.42, 0, 0.32, 0xF472B6, true);
            var eB = etiqueta('M_B = ' + fmt(r.MB, 1) + ' kN·m', '#F472B6', 0.8); eB.position.set(xsA[1], top + 1.05, 0); mb.add(eB);
        }

        function set(s) {
            s = Object.assign({}, CERO, s);
            cargas.visible = s.load > 0.001;
            wG.forEach(function (g) { escalaFlechas(g, s.load); });
            if (pG) pG.children[0].scale.y = Math.max(0.001, s.load);
            reacs.visible = s.reac > 0.01;
            reacs.children.forEach(function (c) { c.scale.setScalar(0.4 + 0.6 * s.reac); });
            dV.visible = eV.visible = mV.visible = s.V > 0.01; dV.scale.y = s.V;
            dM.visible = eM.visible = mM.visible = s.M > 0.01; dM.scale.y = s.M;
            viga.doblar(fn, s.d); elast(s.d); dMax.visible = s.d > 0.95;
            if (mb) { mb.visible = s.MB > 0.01; mb.scale.setScalar(Math.max(0.001, s.MB)); }
        }
        set(CERO);
        var pins = tramos ? [
            [xsA[0], baseY * 0.5, 0], [xsA[1], baseY * 0.5, 0], [xsA[2], baseY * 0.5, 0],
            [(x0 + xsA[1]) / 2, yC + 0.1, 0], [(xsA[1] + xsA[2]) / 2, yC + 0.1, 0], [xsA[1], top + 0.4, 0],
            [x0 + L * 0.3, y + 0.3, zD], [x0 + L * 0.7, y - amp, zF]
        ] : [
            [-L * 0.1, top + 0.05, 0], [xsA[0], baseY * 0.5, 0], [xsA[1], baseY * 0.5, 0],
            [x0 + L * clamp(num(P.aF), 0, 1), top + 1.35, 0], [-L * 0.3, yC + 0.1, 0],
            [x0 + L * 0.3, y + 0.3, -zD], [x0 + L * 0.6, y - 0.3, zD], [x0 + (r.xd || L / 2), y - amp, zF]
        ];
        return { root: root, set: set, pins: pins, size: L + (tramos ? 1.2 : 1.6), alto: top + 1.6 };
    }

    /* ---------- voladizo ---------- */
    function modeloVoladizo(P, r, ac) {
        var root = new T.Group();
        var L = num(P.L), D = dims(P), baseY = 0.9, y = baseY + D.d / 2, top = y + D.d / 2, x0 = -L / 2;
        var maxD = maxAbs(r.ds), amp = clamp(L * 0.08, 0.2, 0.55);
        function fn(x) { return interp(r.xs, r.ds, x - x0) / maxD * amp; }
        var viga = vigaFlexible(root, L, D, P.mat, y);
        var zF = D.w / 2 + 0.05;
        var elast = lineaElastica(root, L, fn, y, zF);
        muro(root, x0, -1, Math.max(2.2, top + 0.9), Math.max(1.2, D.w + 0.8));
        var cargas = new T.Group(); root.add(cargas);
        var yC = top + 0.95, wG = null, pG = null;
        if (num(P.w) > 0) wG = cargaDistribuida(cargas, x0, L / 2, yC, top, P.w, 'w', 9);
        if (num(P.P) > 0) pG = cargaPuntual(cargas, L / 2, top, P.P, 'P');
        var reacs = new T.Group(); root.add(reacs);
        var zR = D.w / 2 + 0.55;
        reaccion(reacs, x0 + 0.35, baseY, r.RA, 'R_A', zR);
        reaccionMomento(reacs, x0 + 0.05, y, r.MA, 'M_A', zR + 0.1);
        var diag = new T.Group(); root.add(diag);
        var xsW = r.xs.map(function (x) { return x0 + x; }), zD = Math.max(0.95, D.w / 2 + 0.75);
        var dV = cinta(diag, xsW, r.vs, -zD, C_V, 0.5 / maxAbs(r.vs), y);
        var dM = cinta(diag, xsW, r.ms.map(function (m) { return -m; }), zD, C_M, 0.7 / maxAbs(r.ms), y);
        var mV = etiqueta('V = ' + fmt(r.vs[0], 1) + ' kN', '#60A5FA', 0.66); mV.position.set(x0 + 0.5, y + 0.82, -zD); diag.add(mV);
        var mM = etiqueta('M = ' + fmt(r.MA, 1) + ' kN·m', '#34D399', 0.66); mM.position.set(x0 + L * 0.42, y + 0.62, zD); diag.add(mM);
        var dMax = etiqueta('δpunta = ' + fmt(r.dmax, 2) + ' mm', '#F472B6', 0.7); dMax.position.set(L / 2 - 0.2, y - D.d / 2 - amp - 0.34, zF); root.add(dMax);
        var dim = etiqueta('L = ' + fmt(L, 2) + ' m', '#94A3B8', 0.74); dim.position.set(0.2, 0.16, D.w / 2 + 1.25); root.add(dim);
        function set(s) {
            s = Object.assign({}, CERO, s);
            cargas.visible = s.load > 0.001; escalaFlechas(wG, s.load); if (pG) pG.children[0].scale.y = Math.max(0.001, s.load);
            reacs.visible = s.reac > 0.01; reacs.children.forEach(function (c) { c.scale.setScalar(0.4 + 0.6 * s.reac); });
            dV.visible = mV.visible = s.V > 0.01; dV.scale.y = s.V;
            dM.visible = mM.visible = s.M > 0.01; dM.scale.y = s.M;
            viga.doblar(fn, s.d); elast(s.d); dMax.visible = s.d > 0.95;
        }
        set(CERO);
        return {
            root: root, set: set, size: L + 1.6, alto: top + 1.6,
            pins: [[x0 - 0.25, y + 0.7, 0], [0, top + 0.05, 0], [L / 2, top + 1.35, 0], [-L * 0.15, yC + 0.1, 0],
                [x0 + L * 0.3, y + 0.3, -zD], [x0 + L * 0.25, y - 0.3, zD], [L / 2 - 0.1, y - amp, zF]]
        };
    }

    /* ---------- cercha Pratt espacial (dos planos) ---------- */
    function colorFuerza(f, mx) {
        if (Math.abs(f) < 1e-6) return new T.Color(0x64748B);
        var t = clamp(Math.abs(f) / Math.max(1e-9, mx), 0, 1);
        return new T.Color(0x94A3B8).lerp(new T.Color(f > 0 ? 0xF87171 : 0x60A5FA), 0.35 + 0.65 * t);
    }
    function modeloCercha(P, r, ac) {
        var root = new T.Group();
        var L = num(P.L), h = num(P.h), baseY = 0.72, zH = 0.75, n = r.nodes, mx = Math.max(1e-9, r.maxAbs);
        var ox = -L / 2;
        function V3(nd, z) { return new T.Vector3(nd.x + ox, nd.y + baseY, z); }
        var barras = [];
        var neutro = new T.Color(0x9AA8BA);
        r.members.forEach(function (m) {
            var a = n[m.a], b = n[m.b];
            var mat = std({ color: 0x9AA8BA, metalness: 0.62, roughness: 0.34 });
            var objetivo = colorFuerza(m.force, mx), g0 = 0.07, g1 = 0.05 + 0.08 * clamp(Math.abs(m.force) / mx, 0, 1);
            [-zH, zH].forEach(function (z) {
                var o = barra(root, V3(a, z), V3(b, z), g0, mat, g0);
                if (o) barras.push({ o: o, mat: mat, col: objetivo, g0: g0, g1: g1 });
            });
        });
        /* placas de nudo, pasadores y riostras entre planos */
        var oscuro = std(STEEL_DARK), acero = std(STEEL);
        n.forEach(function (nd) {
            [-zH, zH].forEach(function (z) { caja(root, 0.2, 0.2, 0.025, nd.x + ox, nd.y + baseY, z + (z > 0 ? 0.045 : -0.045), oscuro); });
            cil(root, 0.03, 0.03, zH * 2 + 0.2, nd.x + ox, nd.y + baseY, 0, acero, 'z', 10);
        });
        var rio = std({ color: 0x7C8DA3, metalness: 0.55, roughness: 0.45 });
        [[5, 6], [6, 7], [0, 1], [3, 4]].forEach(function (pr) {
            barra(root, V3(n[pr[0]], -zH), V3(n[pr[1]], zH), 0.028, rio);
            barra(root, V3(n[pr[0]], zH), V3(n[pr[1]], -zH), 0.028, rio);
        });
        /* apoyos en los dos planos */
        [-zH, zH].forEach(function (z) { pasador(root, ox, z, baseY, false, ac); pasador(root, L / 2, z, baseY, true, ac); });
        /* carga */
        var ld = n[r.loadNode], lx = ld.x + ox, ly = ld.y + baseY;
        var carga = new T.Group(); carga.position.set(lx, ly + (ld.y > 0 ? 0.1 : -0.02), 0); root.add(carga);
        var cf = new T.Group(); carga.add(cf);
        if (ld.y > 0) flecha(cf, new T.Vector3(0, 1.25, 0), new T.Vector3(0, 0.02, 0), C_P, 0.028);
        else flecha(cf, new T.Vector3(0, 0.02, 0), new T.Vector3(0, -1.0, 0), C_P, 0.028);
        var ec = etiqueta('P = ' + fmt(P.P, 1) + ' kN en ' + r.loadName, '#F87171', 0.82); ec.position.set(0, ld.y > 0 ? 1.55 : -1.3, 0); carga.add(ec);
        /* reacciones */
        var reacs = new T.Group(); root.add(reacs);
        reaccion(reacs, ox, baseY, r.reactions.Ry0, 'R_B0', zH + 0.55);
        reaccion(reacs, L / 2, baseY, r.reactions.Ry4, 'R_B4', zH + 0.55);
        /* fuerzas en las barras (plano delantero) */
        var fuerzas = new T.Group(); root.add(fuerzas);
        r.members.forEach(function (m) {
            var a = n[m.a], b = n[m.b];
            var c = Math.abs(m.force) < 1e-6 ? '#94A3B8' : (m.force > 0 ? '#F87171' : '#60A5FA');
            var et = etiqueta((m.force > 0 ? '+' : '') + fmt(m.force, 1), c, 0.56);
            et.position.set((a.x + b.x) / 2 + ox, (a.y + b.y) / 2 + baseY + 0.12, zH + 0.2); fuerzas.add(et);
        });
        /* flecha medida en el nudo cargado */
        var dv = clamp(Math.abs(r.delta) / 1000 * 40, 0.08, 0.4);
        var def = new T.Group(); def.position.set(lx, ly, zH + 0.25); root.add(def);
        def.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), new T.Vector3(0, -dv, 0)]), new T.LineBasicMaterial({ color: C_DEF })));
        var dot = new T.Mesh(new T.SphereGeometry(0.06, 14, 12), new T.MeshBasicMaterial({ color: C_DEF })); dot.position.y = -dv; def.add(dot);
        var ed = etiqueta('Δ = ' + fmt(r.delta, 2) + ' mm', '#F472B6', 0.74); ed.position.set(0.7, -dv - 0.1, 0); def.add(ed);
        var nod = new T.Group(); root.add(nod);
        n.forEach(function (nd) { var e = etiqueta(nd.n, '#A7B4C8', 0.5); e.position.set(nd.x + ox, nd.y + baseY + (nd.y > 0 ? 0.3 : -0.28), -zH - 0.25); nod.add(e); });
        var dim = etiqueta('L = ' + fmt(L, 1) + ' m · h = ' + fmt(h, 1) + ' m', '#94A3B8', 0.74); dim.position.set(0, 0.16, zH + 1.35); root.add(dim);
        function set(s) {
            carga.visible = s.load > 0.001; cf.scale.y = Math.max(0.001, s.load);
            reacs.visible = s.reac > 0.01; reacs.children.forEach(function (c) { c.scale.setScalar(0.4 + 0.6 * s.reac); });
            fuerzas.visible = s.eq > 0.5;
            barras.forEach(function (b) {
                b.mat.color.copy(neutro).lerp(b.col, s.col || 0);
                var g = (b.g0 + (b.g1 - b.g0) * (s.col || 0)) / b.g0; b.o.scale.set(1, g, g);
            });
            def.visible = s.d > 0.01; def.scale.y = Math.max(0.001, s.d);
            ed.visible = s.d > 0.95;
        }
        set(CERO);
        return {
            root: root, set: set, size: L + 1.4, alto: baseY + h + 1.8,
            pins: [[0, baseY + h + 0.1, zH], [-L * 0.32, baseY, zH], [n[1].x + ox, baseY + h * 0.5, zH], [n[5].x + ox + L * 0.12, baseY + h * 0.5, zH],
                [ox, baseY * 0.5, -zH], [L / 2, baseY * 0.5, zH], [lx, ly + 1.2, 0], [0, baseY + h * 0.5, 0]]
        };
    }

    /* ---------- pórtico de un vano (método del portal) ---------- */
    function modeloPortico(P, r, ac) {
        var root = new T.Group();
        var b = num(P.b), h = num(P.h), zs = [-1.05, 1.05], art = r.base === 'pinned';
        var cw = clamp(num(P.hc) / 1000, 0.2, 0.62), vd = 0.36, y0 = art ? 0.62 : 0.14;
        var marco = new T.Group(); marco.position.y = y0; root.add(marco);
        var mCol = std(MAT[P.mat] || MAT.concreto), mVig = std({ color: 0xA7B4C8, metalness: 0.15, roughness: 0.72 });
        zs.forEach(function (z) {
            caja(marco, cw, h, 0.32, -b / 2, h / 2, z, mCol);
            caja(marco, cw, h, 0.32, b / 2, h / 2, z, mCol);
            caja(marco, b + cw, vd, 0.3, 0, h, z, mVig);
        });
        var losa = new T.MeshStandardMaterial({ color: 0x9AA6B2, metalness: 0.08, roughness: 0.88, transparent: true, opacity: 0.7 });
        caja(marco, b + 0.5, 0.08, 2.6, 0, h + vd / 2 + 0.1, 0, losa);
        for (var i = -2; i <= 2; i++) caja(marco, 0.07, 0.13, 2.6, i * b / 5, h + vd / 2 + 0.01, 0, std(STEEL_DARK));
        /* bases: placa empotrada o pasador */
        zs.forEach(function (z) {
            [-b / 2, b / 2].forEach(function (x) {
                if (art) pasador(root, x, z, y0, false, ac);
                else {
                    var g = new T.Group(); g.position.set(x, 0, z); root.add(g);
                    caja(g, 0.72, 0.14, 0.72, 0, 0.07, 0, std(STEEL_DARK));
                    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { cil(g, 0.03, 0.03, 0.12, q[0] * 0.24, 0.18, q[1] * 0.24, std({ color: ac, metalness: 0.4, roughness: 0.35 }), 'y', 10); });
                }
            });
        });
        /* carga lateral W en la cubierta */
        var carga = new T.Group(); carga.position.set(-b / 2 - cw / 2, y0 + h, 1.05); root.add(carga);
        var cf = new T.Group(); carga.add(cf);
        flecha(cf, new T.Vector3(-1.4, 0, 0), new T.Vector3(-0.04, 0, 0), C_LOAD, 0.032);
        var ew = etiqueta('W = ' + fmt(P.W, 1) + ' kN', '#FBBF24', 0.9); ew.position.set(-0.8, 0.4, 0); carga.add(ew);
        /* puntos de inflexión del portal */
        var inf = new T.Group(); marco.add(inf);
        var mInf = new T.MeshBasicMaterial({ color: 0xE2E8F0 });
        var ptsInf = art ? [[0, h, 1.2]] : [[-b / 2, h / 2, 1.2], [b / 2, h / 2, 1.2], [0, h, 1.2]];
        ptsInf.forEach(function (q) { var s = new T.Mesh(new T.TorusGeometry(0.12, 0.025, 8, 24), mInf); s.position.set(q[0], q[1], q[2]); inf.add(s); });
        var eI = etiqueta(art ? 'M = 0 en las bases y a media luz' : 'M = 0 a media altura y a media luz', '#E2E8F0', 0.6); eI.position.set(0, h * 0.5, 1.35); inf.add(eI);
        /* reacciones en las bases: cortante W/2 y axial ±N por vuelco */
        var reacs = new T.Group(); root.add(reacs);
        [-b / 2, b / 2].forEach(function (x, i) {
            var g = new T.Group(); g.position.set(x, 0.08, 1.5); reacs.add(g);
            flecha(g, new T.Vector3(0.95, 0, 0), new T.Vector3(0.05, 0, 0), C_REAC, 0.022);
            var Ny = i === 0 ? -r.N : r.N;              /* barlovento tira hacia abajo, sotavento empuja hacia arriba */
            if (Math.abs(Ny) > 1e-6) {
                if (Ny > 0) flecha(g, new T.Vector3(0, -0.85, 0), new T.Vector3(0, -0.05, 0), C_REAC, 0.022);
                else flecha(g, new T.Vector3(0, -0.05, 0), new T.Vector3(0, -0.85, 0), C_REAC, 0.022);
            }
            var e = etiqueta('H = ' + fmt(r.Vcol, 1) + ' · V = ' + fmt(Ny, 1) + ' kN', '#34D399', 0.8); e.position.set(0.3, 0.55, 0.3); g.add(e);
        });
        /* momentos en columnas y viga */
        var mom = new T.Group(); marco.add(mom);
        var Mb = Math.max(1e-9, Math.max(Math.abs(r.Mbase || 0), Math.abs(r.Mtop || 0)));
        var ys = [0.02, h / 2, h - 0.02], vals = [r.Mbase || 0, ((r.Mbase || 0) - (r.Mtop || 0)) / 2, -(r.Mtop || 0)];
        var esc = 0.55 / Mb;
        [-b / 2, b / 2].forEach(function (x) {
            var n = ys.length, pos = new Float32Array(n * 6), idx = [];
            for (var k = 0; k < n; k++) {
                pos[k * 6] = 0; pos[k * 6 + 1] = ys[k]; pos[k * 6 + 2] = 0;
                pos[k * 6 + 3] = vals[k] * esc; pos[k * 6 + 4] = ys[k]; pos[k * 6 + 5] = 0;
                if (k < n - 1) { var a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
            }
            var geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setIndex(idx);
            var g = new T.Group(); g.position.set(x, 0, 1.42); mom.add(g);
            g.add(new T.Mesh(geo, new T.MeshBasicMaterial({ color: 0xF472B6, transparent: true, opacity: 0.32, side: T.DoubleSide, depthWrite: false })));
            g.add(new T.Line(new T.BufferGeometry().setFromPoints(ys.map(function (yy, k) { return new T.Vector3(vals[k] * esc, yy, 0); })), new T.LineBasicMaterial({ color: 0xF472B6 })));
        });
        var eMc = etiqueta('M col = ' + fmt(r.Mcol, 1) + ' kN·m', '#F472B6', 0.66); eMc.position.set(b / 2 + 0.9, h - 0.2, 1.42); mom.add(eMc);
        /* deriva */
        var dx = clamp(r.sway / 1000 * 60, 0.12, 0.55);
        var der = new T.Group(); der.position.set(b / 2 + cw / 2 + 0.06, y0 + h + 0.55, 1.05); root.add(der);
        flecha(der, new T.Vector3(0, 0, 0), new T.Vector3(dx + 0.2, 0, 0), C_DEF, 0.022);
        var ed = etiqueta('Δ = ' + fmt(r.sway, 2) + ' mm', '#F472B6', 0.78); ed.position.set(dx * 0.5 + 0.1, 0.34, 0); der.add(ed);
        var dim = etiqueta('b = ' + fmt(b, 2) + ' m · h = ' + fmt(h, 2) + ' m', '#94A3B8', 0.74); dim.position.set(0, 0.16, 2.2); root.add(dim);
        var corte = new T.Matrix4();
        function set(s) {
            carga.visible = s.load > 0.001; cf.scale.set(Math.max(0.001, s.load), 1, 1);
            inf.visible = s.inf > 0.5;
            reacs.visible = s.reac > 0.01; reacs.children.forEach(function (c) { c.scale.setScalar(0.4 + 0.6 * s.reac); });
            mom.visible = s.M > 0.01; mom.children.forEach(function (g) { if (g.type === 'Group') g.scale.x = Math.max(0.001, s.M); });
            var k = (dx * (s.d || 0)) / Math.max(0.5, h);
            corte.set(1, k, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
            corte.setPosition(0, y0, 0);
            marco.matrixAutoUpdate = false; marco.matrix.copy(corte); marco.matrixWorldNeedsUpdate = true;
            der.visible = s.d > 0.01; der.scale.x = Math.max(0.001, s.d); ed.visible = s.d > 0.95;
        }
        set(CERO);
        return {
            root: root, set: set, size: Math.max(b + 2.6, h * 1.25 + 1), alto: y0 + h + 1.4,
            pins: [[-b / 2, y0 + h * 0.6, 1.05], [b / 2, y0 + h * 0.6, 1.05], [0, y0 + h + 0.1, 1.05], [-b / 2, 0.15, 1.05],
                [-b / 2 - 1.1, y0 + h, 1.05], [0, y0 + h + 0.3, 0], [b / 2 + 0.4, y0 + h + 0.55, 1.05]]
        };
    }

    var MODELOS = {
        viga: function (P, r, ac) { return modeloViga(P, r, ac, false); },
        voladizo: modeloVoladizo,
        cercha: modeloCercha,
        portico: modeloPortico,
        continuas: function (P, r, ac) { return modeloViga(P, r, ac, true); }
    };

    /* ======================= etapas del análisis ======================= */
    var CANALES = {
        viga: ['', 'load', 'reac', 'V', 'M', 'd'],
        voladizo: ['', 'load', 'reac', 'V', 'M', 'd'],
        cercha: ['', 'load', 'reac', 'eq', 'col', 'd'],
        portico: ['', 'load', 'inf', 'reac', 'M', 'd'],
        continuas: ['', 'load', 'MB', 'reac', 'VM']
    };
    function estado(id, p) {
        var c = CANALES[id], n = c.length, s = { load: 0, reac: 0, V: 0, M: 0, d: 0, col: 0, eq: 0, inf: 0, MB: 0 };
        for (var i = 0; i < n; i++) {
            var v = clamp(p * n - i, 0, 1);
            if (!c[i]) continue;
            if (c[i] === 'VM') { s.V = s.M = s.d = v; } else s[c[i]] = v;
        }
        return s;
    }
    /* piezas (etiquetas del visor) en el mismo orden que los pins de cada modelo */
    var PIEZAS = {
        viga: [['Viga', 'Prisma de la sección elegida: perfil I en acero o aluminio, sección maciza en concreto o madera.'],
            ['Apoyo A', 'Pasador, rodillo, empotramiento o libre: define qué reacciones aparecen en A.'],
            ['Apoyo B', 'El tipo de apoyo cambia si la viga es isostática o hiperestática.'],
            ['Carga puntual P', 'Carga concentrada a la distancia a = (a/L)·L del apoyo A.'],
            ['Carga distribuida w', 'Carga por metro sobre toda la luz (peso propio, losa, uso).'],
            ['Diagrama de cortante', 'V(x) en azul: salta bajo P y cambia de signo donde M es máximo.'],
            ['Diagrama de momento', 'M(x) en verde: el positivo cuelga hacia abajo; el negativo aparece en empotramientos.'],
            ['Elástica', 'La viga se flexiona con su deformada real, amplificada para poder verla.']],
        voladizo: [['Empotramiento', 'Muro que impide desplazamiento y giro: reacción R_A y momento M_A.'],
            ['Viga en voladizo', 'Un extremo empotrado y el otro libre.'],
            ['Carga en punta P', 'Carga concentrada en el extremo libre.'],
            ['Carga distribuida w', 'Carga repartida en toda la longitud.'],
            ['Diagrama de cortante', 'Máximo en el empotramiento y constante en el tramo sin w.'],
            ['Diagrama de momento', 'Negativo (tracción arriba), máximo en el empotramiento y nulo en la punta.'],
            ['Elástica', 'La flecha máxima está en la punta; crece con L³ y L⁴.']],
        cercha: [['Cordón superior', 'Barras T1–T2–T3; con carga hacia abajo trabajan a compresión.'],
            ['Cordón inferior', 'Barras B0 a B4; trabajan a tracción.'],
            ['Montantes', 'Barras verticales B1–T1, B2–T2 y B3–T3.'],
            ['Diagonales', 'En la Pratt bajan hacia el centro y, con carga de gravedad, trabajan a tracción.'],
            ['Apoyo B0 · pasador', 'Reacciones horizontal y vertical.'],
            ['Apoyo B4 · rodillo', 'Solo reacción vertical; deja dilatar la cercha.'],
            ['Carga P', 'Carga en el nudo elegido; cambia cómo se reparten las fuerzas.'],
            ['Riostras', 'Unen los dos planos y dan estabilidad fuera del plano.']],
        portico: [['Columna izquierda', 'Toma la mitad del cortante; trabaja a tracción por el vuelco.'],
            ['Columna derecha', 'Toma la otra mitad del cortante; trabaja a compresión por el vuelco.'],
            ['Viga de cubierta', 'Une las columnas y lleva la carga lateral de un lado al otro.'],
            ['Bases', 'Empotradas (resisten momento) o articuladas (M = 0 en la base).'],
            ['Carga lateral W', 'Viento o sismo a nivel de la cubierta.'],
            ['Losa y correas', 'Arriostran los dos pórticos paralelos.'],
            ['Deriva Δ', 'Desplazamiento lateral de la cubierta; se compara con h/250.']],
        continuas: [['Apoyo A', 'Apoyo simple en el extremo izquierdo.'],
            ['Apoyo B', 'Apoyo interior: la continuidad produce aquí el momento negativo M_B.'],
            ['Apoyo C', 'Apoyo simple en el extremo derecho.'],
            ['Tramo 1 · w₁', 'Carga distribuida de la primera luz.'],
            ['Tramo 2 · w₂', 'Carga distribuida de la segunda luz.'],
            ['Momento en B', 'M_B se obtiene con la ecuación de los tres momentos.'],
            ['Diagramas V y M', 'Cortante y momento de los dos tramos.'],
            ['Elástica', 'Deformada real de la viga continua (amplificada).']]
    };
    var FOCO = {
        viga: [[0, 1, 2], [3, 4], [1, 2], [5], [6], [7, 0]],
        voladizo: [[0, 1], [2, 3], [0], [4], [5], [6, 1]],
        cercha: [[0, 1, 2, 3], [6], [4, 5], [0, 1, 2, 3], [3, 0], [6]],
        portico: [[0, 1, 2, 3], [4], [0, 1, 2], [3], [0, 1, 2], [6]],
        continuas: [[0, 1, 2], [3, 4], [5, 1], [0, 1, 2], [6, 7]]
    };
    var MATS = [['acero', 'Acero A36 · E = 200 GPa'], ['concreto', 'Concreto 28 MPa · E = 25 GPa'], ['madera', 'Madera estructural · E = 11 GPa'], ['aluminio', 'Aluminio 6061 · E = 69 GPa']];
    var APOYOS = [['pin', 'Pasador (articulado)'], ['roller', 'Rodillo'], ['fixed', 'Empotrado'], ['free', 'Libre (voladizo)']];
    function F(id, label, unit, min, max, step, dec, desc) { return { id: id, label: label, unit: unit, min: min, max: max, step: step, dec: dec, desc: desc }; }
    function SEL(id, label, options, desc) { return { id: id, label: label, type: 'select', options: options, desc: desc }; }
    var CAMPOS = {
        viga: [SEL('sl', 'Apoyo izquierdo (A)', APOYOS, 'Un empotramiento impide giro y desplazamiento; el libre no restringe nada.'),
            SEL('sr', 'Apoyo derecho (B)', APOYOS, 'Pasador–rodillo y empotrado–libre son isostáticas; con un empotramiento y otro apoyo la viga es hiperestática.'),
            SEL('mat', 'Material', MATS, 'Define E y el esfuerzo admisible de referencia.'),
            F('L', 'Luz L', 'm', 3, 12, 0.5, 1, 'Distancia entre apoyos.'), F('P', 'Carga puntual P', 'kN', 0, 120, 5, 0, 'Carga concentrada.'),
            F('aF', 'Posición de P (a/L)', '', 0.1, 0.9, 0.05, 2, 'Fracción de la luz medida desde A.'), F('w', 'Carga distribuida w', 'kN/m', 0, 30, 1, 0, 'Carga por metro en toda la luz.'),
            F('b', 'Base b', 'mm', 100, 500, 10, 0, 'Ancho de la sección.'), F('h', 'Altura h', 'mm', 150, 800, 10, 0, 'Peralte: la inercia crece con h³.')],
        voladizo: [SEL('mat', 'Material', MATS, 'Define E y el esfuerzo admisible de referencia.'),
            F('L', 'Longitud L', 'm', 1, 6, 0.25, 2, 'La flecha crece con L³ (carga puntual) y L⁴ (distribuida).'), F('P', 'Carga en punta P', 'kN', 0, 80, 2, 0, 'Carga en el extremo libre.'),
            F('w', 'Carga distribuida w', 'kN/m', 0, 25, 0.5, 1, 'Carga por metro.'), F('b', 'Base b', 'mm', 100, 500, 10, 0, 'Ancho de la sección.'), F('h', 'Altura h', 'mm', 150, 800, 10, 0, 'Peralte de la sección.')],
        cercha: [SEL('mat', 'Material', MATS, 'Define E de las barras.'),
            SEL('node', 'Nudo cargado', [[6, 'T2 · centro, cordón superior'], [5, 'T1 · cordón superior'], [7, 'T3 · cordón superior'], [2, 'B2 · centro, cordón inferior'], [1, 'B1 · cordón inferior'], [3, 'B3 · cordón inferior']], 'Dónde actúa P.'),
            F('L', 'Luz L', 'm', 4, 16, 0.5, 1, 'Cuatro paneles iguales de L/4.'), F('h', 'Altura h', 'm', 1, 4, 0.1, 1, 'Más altura: menos fuerza en los cordones.'),
            F('P', 'Carga P', 'kN', 0, 120, 5, 0, 'Carga vertical en el nudo.'), F('A', 'Área de cada barra', 'mm²', 500, 5000, 100, 0, 'Más área: menos flecha (Δ ∝ 1/A).')],
        portico: [SEL('base', 'Apoyo en la base', [['fixed', 'Empotrado'], ['pinned', 'Articulado (pasador)']], 'Con base articulada no hay momento en la base y la deriva es 4 veces mayor.'),
            SEL('mat', 'Material', MATS, 'Define E de las columnas.'),
            F('W', 'Carga lateral total W', 'kN', 0, 120, 5, 0, 'Viento o sismo a nivel de cubierta.'), F('h', 'Altura h', 'm', 2, 8, 0.25, 2, 'La deriva crece con h³.'),
            F('b', 'Luz b', 'm', 3, 12, 0.5, 1, 'Brazo del par que resiste el vuelco.'), F('hc', 'Peralte de columna hc', 'mm', 200, 600, 25, 0, 'Sección 300 × hc mm.')],
        continuas: [SEL('mat', 'Material', MATS, 'Define E y el esfuerzo admisible de referencia.'),
            F('L1', 'Luz 1 · L₁', 'm', 2, 10, 0.5, 1, 'Primera luz.'), F('L2', 'Luz 2 · L₂', 'm', 2, 10, 0.5, 1, 'Segunda luz.'),
            F('w1', 'Carga w₁', 'kN/m', 0, 40, 1, 0, 'Carga distribuida del tramo 1.'), F('w2', 'Carga w₂', 'kN/m', 0, 40, 1, 0, 'Carga distribuida del tramo 2.'),
            F('b', 'Base b', 'mm', 100, 500, 10, 0, 'Ancho de la sección.'), F('h', 'Altura h', 'mm', 150, 800, 10, 0, 'Peralte de la sección.')]
    };
    var CARGAS = { viga: ['P', 'w'], voladizo: ['P', 'w'], cercha: ['P'], portico: ['W'], continuas: ['w1', 'w2'] };
    var HIPOTESIS = {
        viga: ['Material elástico lineal; pequeñas deformaciones (teoría de Euler-Bernoulli).', 'Se desprecia la deformación por cortante y el peso propio (inclúyelo en w).', 'El esfuerzo admisible es solo una referencia didáctica, no un chequeo de norma.'],
        voladizo: ['Empotramiento perfecto: sin giro ni desplazamiento en el muro.', 'Material elástico lineal y pequeñas deformaciones.', 'No incluye pandeo lateral ni deformación por cortante.'],
        cercha: ['Nudos articulados y cargas solo en los nudos: las barras trabajan solo a axial.', 'Todas las barras tienen la misma área A y el mismo material.', 'La compresión también exige revisar pandeo, que el modelo no incluye.'],
        portico: ['Método aproximado del portal: inflexión a media altura de columnas y a media luz de la viga.', 'Viga de cubierta mucho más rígida que las columnas para la deriva.', 'Herramienta de predimensionamiento, no reemplaza el análisis matricial.'],
        continuas: ['Apoyos simples sin asentamiento; viga prismática de un solo material.', 'M_B por la ecuación de los tres momentos; la elástica sale de superponer w y M_B en cada luz.', 'Material elástico lineal y pequeñas deformaciones.']
    };
    var CAM_Y = { viga: 0.85, voladizo: 0.95, cercha: 1.25, portico: 1.9, continuas: 0.85 };

    /* ======================= parámetros ======================= */
    var ULTIMO = {};
    function cargasPor(id, P, f) { var o = Object.assign({}, P); CARGAS[id].forEach(function (k) { o[k] = num(P[k]) * f; }); return o; }
    function params(id) {
        var s = S.sims[id], tipo = 'est_' + id, over = (L3.pro && L3.pro.over && L3.pro.over[tipo]) || {};
        var P = Object.assign({}, s.defaults, over), r = null, err = '';
        try { r = s.compute(P); } catch (e) { err = e && (e.userMessage || e.message) || 'Revisa los parámetros.'; }
        if (r) ULTIMO[id] = { P: P, r: r }; else if (!ULTIMO[id]) { var P0 = Object.assign({}, s.defaults); ULTIMO[id] = { P: P0, r: s.compute(P0) }; }
        var u = ULTIMO[id];
        try { if (S.alCambiar3d) S.alCambiar3d(id, P); } catch (e2) { }
        return {
            P: P, r: u.r, Pc: u.P, err: err, key: JSON.stringify(u.P), real: false,
            nota: err ? '⚠ ' + err + ' Se muestra la última configuración válida.' : 'Modelo de cálculo de Estructuras I: cambia apoyos, cargas y sección en el panel de parámetros.'
        };
    }

    /* ======================= máquina ======================= */
    function maquina(id) {
        return function (accent) {
            T = global.THREE;
            var tipo = 'est_' + id, meta = L3.meta[tipo];
            var root = new T.Group(), holder = new T.Group(); root.add(holder);
            var pins = PIEZAS[id].map(function () { return { v: [0, 1, 0] }; });
            var modelo = null, clave = null, mach = { root: root, pins: pins, extra: '', set: set };
            function limpiar() {
                holder.children.slice().forEach(function (o) {
                    holder.remove(o);
                    o.traverse(function (x) {
                        if (x.geometry) x.geometry.dispose();
                        if (x.material) (Array.isArray(x.material) ? x.material : [x.material]).forEach(function (m) { if (m.map) m.map.dispose(); m.dispose(); });
                    });
                });
            }
            function rehacer(prm) {
                limpiar();
                modelo = MODELOS[id](prm.Pc, prm.r, accent);
                var e = ESCALA / Math.max(1, modelo.size);
                holder.scale.setScalar(e);
                holder.add(modelo.root);
                /* las etiquetas conservan un tamaño legible aunque el modelo se reduzca */
                modelo.root.traverse(function (o) {
                    if (o.isSprite && o.userData.base) o.scale.set(o.userData.base[0] * 0.78 / e, o.userData.base[1] * 0.78 / e, 1);
                    if (o.isMesh && o.material && o.material.transparent) o.castShadow = false;
                });
                pins.forEach(function (pn, i) {
                    var v = modelo.pins[i] || [0, 1, 0];
                    pn.v = [v[0] * e, v[1] * e, v[2] * e];
                    var iv = mach.inst && mach.inst.pinVecs && mach.inst.pinVecs[i];
                    if (iv) iv.set(pn.v[0], pn.v[1], pn.v[2]);
                });
                /* la cámara apunta a la mitad de la altura del modelo */
                var cy = clamp(modelo.alto * e * 0.45, 0.6, 2.4);
                if (meta && meta.cam) {
                    meta.cam.target[1] = cy;
                    var ins = mach.inst;
                    if (ins && ins.goal) ins.goal.ty = cy;
                }
            }
            function hud(prm, s) {
                var r = prm.r, f = s.load, out;
                if (id === 'viga') out = [{ k: 'R_A', v: fmt(r.RA * f, 1), u: 'kN' }, { k: 'R_B', v: fmt(r.RB * f, 1), u: 'kN' }, { k: 'δ máx', v: fmt(r.dmax * f, 2), u: 'mm' }, { k: 'M máx', v: fmt(r.Mext != null ? r.Mext * f : r.Mabs * f, 1), u: 'kN·m' }];
                else if (id === 'voladizo') out = [{ k: 'R_A', v: fmt(r.RA * f, 1), u: 'kN' }, { k: 'V máx', v: fmt(r.Vmax * f, 1), u: 'kN' }, { k: 'δ punta', v: fmt(r.dmax * f, 2), u: 'mm' }, { k: 'M_A', v: fmt(r.MA * f, 1), u: 'kN·m' }];
                else if (id === 'cercha') {
                    var big = r.members.reduce(function (a, m) { return Math.abs(m.force) > Math.abs(a.force) ? m : a; }, r.members[0]);
                    out = [{ k: 'R_B0', v: fmt(r.reactions.Ry0 * f, 1), u: 'kN' }, { k: 'R_B4', v: fmt(r.reactions.Ry4 * f, 1), u: 'kN' }, { k: 'Δ ' + r.loadName, v: fmt(r.delta * f, 2), u: 'mm' }, { k: 'N máx (' + big.name + ')', v: fmt(big.force * f, 1), u: 'kN' }];
                }
                else if (id === 'portico') out = [{ k: 'V col', v: fmt(r.Vcol * f, 1), u: 'kN' }, { k: 'N col', v: '± ' + fmt(r.N * f, 1), u: 'kN' }, { k: 'M col', v: fmt(r.Mcol * f, 1), u: 'kN·m' }, { k: 'Deriva Δ', v: fmt(r.sway * f, 2), u: 'mm' }];
                else out = [{ k: 'R_A', v: fmt(r.RA * f, 1), u: 'kN' }, { k: 'R_B', v: fmt(r.RB * f, 1), u: 'kN' }, { k: 'R_C', v: fmt(r.RC * f, 1), u: 'kN' }, { k: 'M_B', v: fmt(r.MB * f, 1), u: 'kN·m' }];
                return out;
            }
            function set(p, prm) {
                prm = prm || params(id);
                if (prm.key !== clave) { clave = prm.key; rehacer(prm); }
                var s = estado(id, p);
                modelo.set(s);
                return { hud: hud(prm, s) };
            }
            var prm0 = params(id); clave = prm0.key; rehacer(prm0); modelo.set(estado(id, 0));
            return mach;
        };
    }

    /* ======================= registro ======================= */
    IDS.forEach(function (id) {
        var s = S.sims[id], tipo = 'est_' + id, steps = s.steps || [], n = steps.length;
        var cy = CAM_Y[id];
        var meta = {
            accent: s.accent, machine: s.title, machineSub: s.desc, norma: s.norma,
            duration: n * 6, defaultSpeed: 1,
            phases: steps.map(function (st, i) { return { t: st.t, d: st.d, a: i / n, b: (i + 1) / n, pins: (FOCO[id] || [])[i] || [] }; }),
            parts: PIEZAS[id].map(function (p) { return { name: p[0], desc: p[1] }; }),
            cam: {
                target: [0, cy, 0],
                home: { theta: 0.5, phi: 1.13, radius: id === 'portico' ? 9.6 : 7.9 },
                frontal: { theta: 0.0, phi: 1.42, radius: id === 'portico' ? 9.2 : 7.6 },
                lateral: { theta: 1.35, phi: 1.2, radius: id === 'portico' ? 9 : 7.6 },
                detalle: { theta: 0.35, phi: 1.05, radius: 5.4 }
            }
        };
        L3.register(tipo, { meta: meta, params: function () { return params(id); }, build: maquina(id) });

        /* panel de parámetros, resultados, gráficas e interpretación (lab3d-pro) */
        var pro = L3.pro = L3.pro || {}; pro.defs = pro.defs || {}; pro.over = pro.over || {};
        var defaults = {}; CAMPOS[id].forEach(function (f) { defaults[f.id] = s.defaults[f.id]; });
        var ratio = s.chartRatio || 0.7;
        pro.defs[tipo] = {
            fields: CAMPOS[id].map(function (f) { var o = Object.assign({}, f); o.value = s.defaults[f.id]; return o; }),
            defaults: defaults,
            results: function (prm, p) {
                var f = estado(id, p).load, ahora = null, fin = [];
                try { fin = s.tiles(prm.r, prm.Pc); } catch (e) { fin = []; }
                try { ahora = s.tiles(s.compute(cargasPor(id, prm.Pc, f)), cargasPor(id, prm.Pc, f)); } catch (e2) { ahora = null; }
                return fin.map(function (t, i) {
                    return { l: plano(t.l), u: '', now: f > 0 && ahora && ahora[i] ? plano(ahora[i].v) : '—', fin: plano(t.v), kind: /servicio|resistencia/i.test(t.l) ? 'Chequeo' : 'Calculado' };
                });
            },
            charts: [{
                W: 520, H: Math.round(520 * ratio),
                draw: function (ctx, W, H, prm, p) { s.chart(ctx, W, H, prm.r, prm.Pc, estado(id, p).load || 0.0001); }
            }],
            interp: function (prm) {
                var t = '';
                try { t = s.note(prm.r, prm.Pc); } catch (e) { }
                return '<p>' + t + '</p>' + (s.learn || '');
            },
            hyp: HIPOTESIS[id],
            validate: function (prm) {
                var out = [];
                if (prm.err) out.push({ lvl: 'bad', msg: prm.err });
                try {
                    s.tiles(prm.r, prm.Pc).forEach(function (t) {
                        if (t.tone === 'bad') out.push({ lvl: 'warn', msg: plano(t.l) + ': ' + plano(t.v) + ' — ' + plano(t.s || '') });
                    });
                } catch (e) { }
                return out;
            }
        };
    });

    /* el visor necesita saber qué instancia usa cada máquina para mover las etiquetas cuando cambia la geometría */
    var baseMount = L3.mount;
    L3.mount = function (host, tipo) {
        var handle = baseMount.apply(this, arguments);
        if (handle && handle.instance && /^est_/.test(tipo)) {
            var inst = handle.instance, t0 = performance.now();
            (function enlazar() {
                if (inst.disposed) return;
                if (inst.machine) { inst.machine.inst = inst; global.GeoEstru3D.actual = inst; return; }
                if (performance.now() - t0 < 20000) setTimeout(enlazar, 100);
            })();
        }
        return handle;
    };
    global.GeoEstru3D = { estado: estado, tipos: IDS.map(function (id) { return 'est_' + id; }) };
})(window);
