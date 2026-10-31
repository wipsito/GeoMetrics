/**
 * Simulador de Obra 3D — SIMULACIÓN de la retroexcavadora (sin DOM ni three.js; se puede probar en Node).
 *  · Conducción sobre ruedas: dirección tipo Ackermann (giro de las ruedas delanteras), aceleración progresiva y freno.
 *  · Seguimiento del terreno por las 4 ruedas (altura, cabeceo, balanceo) y colisiones con desniveles, obras y límites.
 *  · Pala cargadora delantera: elevación de brazos + volteo del cucharón (autonivelante). Recoge empujando, carga y vuelca.
 *  · Retro trasera: torre giratoria, boom, balancín y cuchara; solo excava con los estabilizadores bajados (F).
 *  · Excavación real (SimObraCore.scoopCell) y descarga real (SimObraCore.dumpSoil): conservación del volumen.
 */
(function (G) {
    'use strict';
    var C = G.SimObraCore, D = G.SimObraRetroModel.DIM;
    var LIM = { lift: [-0.62, 0.95], ld: [-1.35, 0.8], boom: [-0.05, 1.2], stick: [0.25, 2.5], bucket: [-0.3, 1.9] }, CAPL = 1.6, CAPB = 0.6, VF = 4.2, VR = 2.6, ACC = 2.4, WB = 2.2, MAXST = 0.55;
    var RATE = { lift: 0.5, ld: 1.0, boom: 0.5, stick: 0.7, bucket: 1.0, swing: 0.8 };
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function approach(v, t, d) { return v + clamp(t - v, -d, d); }
    function create(x, z, yaw) {
        return { x: x, z: z, yaw: yaw || 0, y: 0, pitch: 0, roll: 0, speed: 0, steer: 0, lift: 0.05, ld: 0.35, swing: 0, boom: 0.9, stick: 1.6, bucket: 1.2, stab: 0, stabT: 0, imp: 'L', wl: 0, wd: 0, wb: 0, ws: 0, wk: 0, ww: 0, loadL: 0, loadB: 0, capL: CAPL, capB: CAPB, fullL: false, fullB: false, digL: 0, digB: 0, pourL: 0, pourB: 0, msg: '', ev: [], bump: false };
    }
    function ground(W, x, z, y) { return C.groundAt(W, x, z, y); }
    function w2(M, lx, lz, yaw) { var a = yaw == null ? M.yaw : yaw, c = Math.cos(a), s = Math.sin(a); return [M.x + lx * c + lz * s, M.z - lx * s + lz * c]; }
    function settle(M, W, dt, instant) {
        var f = ground(W, 0, 0, 0), pts = { fl: w2(M, -D.trF, D.fz), fr: w2(M, D.trF, D.fz), bl: w2(M, -D.trR, D.rz), br: w2(M, D.trR, D.rz) }, h = {}, k;
        for (k in pts) h[k] = ground(W, pts[k][0], pts[k][1], M.y);
        var ty = (h.fl + h.fr + h.bl + h.br) / 4, tp = Math.atan2((h.fl + h.fr) / 2 - (h.bl + h.br) / 2, D.rz - D.fz), tr = Math.atan2((h.fr + h.br) / 2 - (h.fl + h.bl) / 2, 2 * D.trF), a = instant ? 1 : Math.min(1, dt * 7);
        M.y += (ty - M.y) * a; M.pitch += (clamp(tp, -0.45, 0.45) - M.pitch) * a; M.roll += (clamp(tr, -0.45, 0.45) - M.roll) * a;
    }
    /* ---------- cinemática: cargadora (L) y retro (B) ---------- */
    function kin(M, x, z, yaw) {
        x = x == null ? M.x : x; z = z == null ? M.z : z; yaw = yaw == null ? M.yaw : yaw;
        var c = Math.cos(yaw), s = Math.sin(yaw), F = [-s, -c], P = [x + D.lp[0] * c + D.lp[2] * s, M.y + D.lp[1], z - D.lp[0] * s + D.lp[2] * c];
        var E = [P[0] + F[0] * D.LA * Math.cos(M.lift), P[1] + D.LA * Math.sin(M.lift), P[2] + F[1] * D.LA * Math.cos(M.lift)], d = M.ld;
        var T = [E[0] + F[0] * D.LB * Math.cos(d), E[1] + D.LB * Math.sin(d), E[2] + F[1] * D.LB * Math.cos(d)], Cb = [E[0] + F[0] * D.LB * 0.5 * Math.cos(d), E[1] + D.LB * 0.5 * Math.sin(d) + 0.2, E[2] + F[1] * D.LB * 0.5 * Math.cos(d)];
        var L = { P: P, E: E, T: T, Cb: Cb, F: F, d: d, mouthUp: Math.cos(d) };
        var yb = yaw + Math.PI + M.swing, cb = Math.cos(yb), sb = Math.sin(yb), Fb = [-sb, -cb], Pb = [x + D.bz * s, M.y + D.by, z + D.bz * c];
        var b = M.boom, g = b - M.stick, dd = g - M.bucket, e2 = [Pb[0] + Fb[0] * D.L1 * Math.cos(b), Pb[1] + D.L1 * Math.sin(b), Pb[2] + Fb[1] * D.L1 * Math.cos(b)];
        var S2 = [e2[0] + Fb[0] * D.L2 * Math.cos(g), e2[1] + D.L2 * Math.sin(g), e2[2] + Fb[1] * D.L2 * Math.cos(g)], T2 = [S2[0] + Fb[0] * D.L3 * Math.cos(dd), S2[1] + D.L3 * Math.sin(dd), S2[2] + Fb[1] * D.L3 * Math.cos(dd)];
        var B = { P: Pb, E: e2, S: S2, T: T2, Cb: [(S2[0] + T2[0]) / 2, (S2[1] + T2[1]) / 2, (S2[2] + T2[2]) / 2], F: Fb, d: dd, mouthUp: -Math.cos(dd), yaw: yb };
        return { L: L, B: B };
    }
    function surf(W, p) { return C.hAt(W, p[0], p[2]); }
    function elemAt(W, p) { for (var i = 0; i < W.elems.length; i++) { var e = W.elems[i]; if (e.t === 'tub' || e.t === 'tec') continue; if (p[0] > e.r[0] && p[0] < e.r[2] && p[2] > e.r[1] && p[2] < e.r[3] && p[1] > e.y0 && p[1] < e.y1) return e; } return null; }
    /* ---------- colisión del chasis ---------- */
    function blockedAt(M, W, x, z, yaw, fwd) {
        var c = Math.cos(yaw), s = Math.sin(yaw), ix, iz, i, e, px, pz, lx, lz, g, zs = [-2.0, -0.6, 0.9, 2.5];
        for (ix = -1; ix <= 1; ix++) for (iz = 0; iz < zs.length; iz++) {
            lx = ix * 1.0; lz = zs[iz]; px = x + lx * c + lz * s; pz = z - lx * s + lz * c;
            if (px < -C.N / 2 + 0.4 || px > C.N / 2 - 0.4 || pz < -C.N / 2 + 0.4 || pz > C.N / 2 - 0.4) return true;
            g = ground(W, px, pz, M.y); if (g > M.y + 0.55 || g < M.y - 0.9) return true;
            for (i = 0; i < W.elems.length; i++) { e = W.elems[i]; if (e.t === 'tub' || e.t === 'tec' || e.t === 'pav') continue; if (px > e.r[0] - 0.1 && px < e.r[2] + 0.1 && pz > e.r[1] - 0.1 && pz < e.r[3] + 0.1 && e.y1 > M.y + 0.5 && e.y0 < M.y + 2.2) return true; }
        }
        if (fwd > 0) { var k = kin(M, x, z, yaw).L; if (surf(W, k.T) - k.T[1] > 0.6) return true; if (elemAt(W, k.T)) return true; }
        return false;
    }
    function stepDrive(M, W, k, dt) {
        var fwd = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), st = (k.KeyA ? 1 : 0) - (k.KeyD ? 1 : 0), kk = kin(M).L, under = surf(W, kk.T) - kk.T[1], lock = M.stab > 0.02;
        M.steer = approach(M.steer, st * MAXST, 1.6 * dt);
        var top = lock ? 0 : (fwd > 0 ? VF : VR), tv = fwd * top; if (fwd > 0 && under > 0.05) tv *= 0.3;
        if (k.Space || lock) M.speed = approach(M.speed, 0, 9 * dt); else M.speed = approach(M.speed, tv, (tv === 0 ? ACC * 1.5 : ACC) * dt);
        if (lock && fwd) M.msg = 'Sube los estabilizadores (F) para avanzar.';
        var yr = M.speed * Math.tan(M.steer) / WB, ny = M.yaw + yr * dt, nx = M.x - Math.sin(ny) * M.speed * dt, nz = M.z - Math.cos(ny) * M.speed * dt; M.bump = false;
        if (Math.abs(M.speed) < 1e-4) return;
        if (!blockedAt(M, W, nx, nz, ny, M.speed)) { M.x = nx; M.z = nz; M.yaw = ny; }
        else { M.speed = 0; M.bump = true; M.msg = under > 0.5 ? 'El cucharón empuja demasiado: súbelo o excava por capas.' : 'Obstáculo adelante.'; }
    }
    /* ---------- articulaciones + excavación + descarga ---------- */
    function stepArms(M, W, k, dt) {
        var old = { lift: M.lift, ld: M.ld, boom: M.boom, stick: M.stick, bucket: M.bucket, swing: M.swing }, k0 = kin(M), ev = M.ev = [], i;
        M.stab = approach(M.stab, M.stabT, 0.7 * dt); var down = M.stab > 0.97;
        var up = !!k.ArrowDown, dn = !!k.ArrowUp, lf = !!k.ArrowRight, rt = !!k.ArrowLeft,   /* flechas invertidas: ↓ sube / ← cierra */  qk = !!k.KeyQ, rk = !!k.KeyR, zk = !!k.KeyZ, xk = !!k.KeyX, onL = M.imp === 'L', onB = M.imp === 'B', armOK = down && onB;
        /* los mismos controles gobiernan la parte activa (G alterna entre pala y retro) */
        M.wl = approach(M.wl, onL ? ((up ? 1 : 0) - (dn ? 1 : 0)) * RATE.lift : 0, 2.2 * dt);
        M.wd = approach(M.wd, onL ? (((rt || qk) ? 1 : 0) - ((lf || rk) ? 1 : 0)) * RATE.ld : 0, 3.5 * dt);
        M.wb = approach(M.wb, armOK ? ((up ? 1 : 0) - (dn ? 1 : 0)) * RATE.boom : 0, 2.2 * dt);
        M.ws = approach(M.ws, armOK ? ((rt ? 1 : 0) - (lf ? 1 : 0)) * RATE.stick : 0, 3 * dt);
        M.wk = approach(M.wk, armOK ? ((qk ? 1 : 0) - (rk ? 1 : 0)) * RATE.bucket : 0, 3.5 * dt);
        M.ww = approach(M.ww, armOK ? ((zk ? 1 : 0) - (xk ? 1 : 0)) * RATE.swing : 0, 3 * dt);
        if (onB && !down && (up || dn || lf || rt || qk || rk || zk || xk)) M.msg = 'Baja los estabilizadores (F) para operar la retro.';
        M.lift = clamp(M.lift + M.wl * dt, LIM.lift[0], LIM.lift[1]); if (M.lift === LIM.lift[0] || M.lift === LIM.lift[1]) M.wl = 0;
        M.ld = clamp(M.ld + M.wd * dt, LIM.ld[0], LIM.ld[1]); if (M.ld === LIM.ld[0] || M.ld === LIM.ld[1]) M.wd = 0;
        M.boom = clamp(M.boom + M.wb * dt, LIM.boom[0], LIM.boom[1]); if (M.boom === LIM.boom[0] || M.boom === LIM.boom[1]) M.wb = 0;
        M.stick = clamp(M.stick + M.ws * dt, LIM.stick[0], LIM.stick[1]); if (M.stick === LIM.stick[0] || M.stick === LIM.stick[1]) M.ws = 0;
        M.bucket = clamp(M.bucket + M.wk * dt, LIM.bucket[0], LIM.bucket[1]); if (M.bucket === LIM.bucket[0] || M.bucket === LIM.bucket[1]) M.wk = 0;
        M.swing = clamp(M.swing + M.ww * dt, -1.75, 1.75); if (Math.abs(M.swing) >= 1.75) M.ww = 0;
        var kk = kin(M), L = kk.L, B = kk.B, digL = onL && !!(dn || rt || qk || (k.KeyW && M.speed > 0.25)), digB = onB && !!(dn || rt || qk || zk || xk);
        var underB = Math.abs(((B.T[0] - M.x) * Math.cos(M.yaw) - (B.T[2] - M.z) * Math.sin(M.yaw))) < 1.45 && Math.abs(((B.T[0] - M.x) * Math.sin(M.yaw) + (B.T[2] - M.z) * Math.cos(M.yaw))) < 2.55;
        var canL = digL && !M.fullL, canB = digB && !M.fullB && !underB, revL = false, revB = false, stL = surf(W, L.T), stB = surf(W, B.T);
        if (elemAt(W, L.T) || elemAt(W, L.E)) { revL = true; M.msg = 'La pala choca con una estructura.'; }
        else {
            if (L.T[1] < stL - 0.03 && !canL && L.T[1] < k0.L.T[1] - 1e-5) { revL = true; M.msg = M.fullL && digL ? 'Cucharón de la pala lleno: levanta y descarga.' : 'El suelo detiene la pala.'; }
            if (L.E[1] < surf(W, L.E) - 0.05 && L.E[1] < k0.L.E[1] - 1e-5) { revL = true; M.msg = 'El brazo de la pala toca el suelo.'; }
        }
        if (elemAt(W, B.T) || elemAt(W, B.S) || elemAt(W, B.E)) { revB = true; M.msg = 'La retro choca con una estructura.'; }
        else {
            if (B.T[1] < stB - 0.03 && !canB && B.T[1] < k0.B.T[1] - 1e-5) { revB = true; M.msg = M.fullB && digB ? 'Cuchara llena: levanta y descarga.' : (underB && digB ? 'No puedes excavar bajo la máquina.' : 'El suelo detiene la cuchara.'); }
            if (B.S[1] < surf(W, B.S) - 0.05 && B.S[1] < k0.B.S[1] - 1e-5) { revB = true; M.msg = 'El balancín toca el suelo.'; }
            if (B.E[1] < surf(W, B.E) - 0.05 && B.E[1] < k0.B.E[1] - 1e-5) { revB = true; M.msg = 'El boom toca el suelo.'; }
        }
        if (revL) { M.lift = old.lift; M.ld = old.ld; M.wl = M.wd = 0; }
        if (revB) { M.boom = old.boom; M.stick = old.stick; M.bucket = old.bucket; M.swing = old.swing; M.wb = M.ws = M.wk = M.ww = 0; }
        if (revL || revB) { kk = kin(M); L = kk.L; B = kk.B; }
        /* excavar / recoger */
        M.digL -= dt; M.digB -= dt; var r, lat = [-L.F[1], L.F[0]], off;
        if (!revL && digL && !M.fullL && M.digL <= 0 && L.T[1] < surf(W, L.T) - 0.11) {
            M.digL = 0.2; var gotL = 0;
            for (i = -1; i <= 1; i += 2) { off = i * 0.55; r = C.scoopCell(W, L.T[0] + lat[0] * off, L.T[2] + lat[1] * off, L.T[1]); if (r.v > 0) { gotL += r.v; } }
            if (gotL > 0) { M.loadL = Math.min(M.capL, M.loadL + gotL); ev.push({ t: 'scoop', x: L.T[0], y: L.T[1], z: L.T[2] }); if (M.loadL >= M.capL - 1e-6) { M.fullL = true; ev.push({ t: 'full', who: 'L' }); } }
        }
        if (!revB && digB && !M.fullB && !underB && M.digB <= 0 && B.T[1] < surf(W, B.T) - 0.11) {
            M.digB = 0.2; r = C.scoopCell(W, B.T[0], B.T[2], B.T[1]);
            if (r.v > 0) { M.loadB = Math.min(M.capB, M.loadB + r.v); ev.push({ t: 'scoop', x: B.T[0], y: B.T[1], z: B.T[2] }); if (M.loadB >= M.capB - 1e-6) { M.fullB = true; ev.push({ t: 'full', who: 'B' }); } }
            else if (r.msg) M.msg = r.msg;
        }
        /* descargar */
        M.pourL -= dt; M.pourB -= dt;
        if (M.loadL > 0.001 && L.mouthUp < 0.5 && L.T[1] > surf(W, L.T) + 0.12 && M.pourL <= 0) {
            M.pourL = 0.16; var pl = C.dumpSoil(W, L.Cb[0] + L.F[0] * 0.4, L.Cb[2] + L.F[1] * 0.4, Math.min(M.loadL, 0.3));
            if (pl > 0) { M.loadL = Math.max(0, M.loadL - pl); M.fullL = false; ev.push({ t: 'pour', x: L.T[0], y: surf(W, L.T), z: L.T[2] }); } else M.msg = 'No se puede descargar aquí (estructura o pila al máximo).';
        }
        if (M.loadB > 0.001 && B.mouthUp < -0.2 && B.T[1] > surf(W, B.T) + 0.12 && M.pourB <= 0) {
            M.pourB = 0.16; var pb = C.dumpSoil(W, B.Cb[0], B.Cb[2], Math.min(M.loadB, 0.25));
            if (pb > 0) { M.loadB = Math.max(0, M.loadB - pb); M.fullB = false; ev.push({ t: 'pour', x: B.Cb[0], y: surf(W, B.Cb), z: B.Cb[2] }); } else M.msg = 'No se puede descargar aquí (estructura o pila al máximo).';
        }
        return kk;
    }
    function step(M, W, keys, dt, driving) {
        M.msg = '';
        if (driving) stepDrive(M, W, keys, dt); else { M.speed = approach(M.speed, 0, 9 * dt); M.steer = approach(M.steer, 0, 1.6 * dt); M.wl = M.wd = M.wb = M.ws = M.wk = M.ww = 0; }
        settle(M, W, dt, false);
        var kk = stepArms(M, W, driving ? keys : {}, dt); return kk;
    }
    function toggleImp(M) { M.imp = M.imp === 'L' ? 'B' : 'L'; return M.imp; }
    function toggleStab(M) { M.stabT = M.stabT > 0.5 ? 0 : 1; return M.stabT; }
    G.SimObraRetroSim = { create: create, step: step, settle: settle, kin: kin, blockedAt: blockedAt, toggleStab: toggleStab, toggleImp: toggleImp, LIM: LIM, CAPL: CAPL, CAPB: CAPB, ground: ground, w2: w2 };
})(typeof window !== 'undefined' ? window : globalThis);
