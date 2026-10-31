/**
 * Simulador de Obra 3D — SIMULACIÓN de la excavadora (sin DOM ni three.js; se puede probar en Node).
 *  · Conducción por orugas diferenciadas (aceleración progresiva, freno, giro sobre su eje).
 *  · Seguimiento del terreno (altura, cabeceo y balanceo), colisión con desniveles, obras y límites del lote.
 *  · Articulaciones independientes con límites: giro de torre, brazo principal, brazo secundario y cucharón.
 *  · Cinemática directa (posición real de los dientes del cucharón).
 *  · Excavación real: el diente que penetra el suelo retira material (SimObraCore.scoopCell) y llena el cucharón;
 *    al volcar la boca hacia abajo descarga y forma un montículo (SimObraCore.dumpSoil).
 */
(function (G) {
    'use strict';
    var C = G.SimObraCore, D = G.SimObraExcModel.DIM;
    var LIM = { boom: [-0.62, 1.12], stick: [0.12, 2.35], bucket: [-0.35, 2.1] }, CAP = 1.0, VMAX = 2.2, ACC = 2.6, RATE = { boom: 0.55, stick: 0.75, bucket: 1.0, swing: 0.85 };
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function approach(v, t, d) { return v + clamp(t - v, -d, d); }

    function create(x, z, yaw) {
        return { x: x, z: z, yaw: yaw || 0, y: 0, pitch: 0, roll: 0, vL: 0, vR: 0, speed: 0, swing: 0, boom: 0.3, stick: 0.7, bucket: 0.9, wb: 0, ws: 0, wk: 0, ww: 0, load: 0, cap: CAP, digT: 0, pourT: 0, full: false, msg: '', tipY: 0, dist: 0, bump: false, ev: [] };
    }
    function ground(W, x, z, y) { return C.groundAt(W, x, z, y); }
    function w2(M, lx, lz) { var c = Math.cos(M.yaw), s = Math.sin(M.yaw); return [M.x + lx * c + lz * s, M.z - lx * s + lz * c]; }

    /* ---------- terreno bajo las orugas ---------- */
    function settle(M, W, dt, instant) {
        var pts = { fl: w2(M, -1.05, -1.45), fr: w2(M, 1.05, -1.45), bl: w2(M, -1.05, 1.45), br: w2(M, 1.05, 1.45) }, h = {}, k;
        for (k in pts) h[k] = ground(W, pts[k][0], pts[k][1], M.y);
        var ty = (h.fl + h.fr + h.bl + h.br) / 4, tp = Math.atan2((h.fl + h.fr) / 2 - (h.bl + h.br) / 2, 2.9), tr = Math.atan2((h.fr + h.br) / 2 - (h.fl + h.bl) / 2, 2.1), a = instant ? 1 : Math.min(1, dt * 7);
        M.y += (ty - M.y) * a; M.pitch += (clamp(tp, -0.5, 0.5) - M.pitch) * a; M.roll += (clamp(tr, -0.5, 0.5) - M.roll) * a;
    }
    /* ---------- colisión del chasis ---------- */
    function blockedAt(M, W, x, z, yaw) {
        var c = Math.cos(yaw), s = Math.sin(yaw), ix, iz, i, e, px, pz, lx, lz, g;
        for (ix = -1; ix <= 1; ix++) for (iz = -1; iz <= 1; iz++) {
            lx = ix * 1.45; lz = iz * 1.7; px = x + lx * c + lz * s; pz = z - lx * s + lz * c;
            if (px < -C.N / 2 + 0.4 || px > C.N / 2 - 0.4 || pz < -C.N / 2 + 0.4 || pz > C.N / 2 - 0.4) return true;
            g = ground(W, px, pz, M.y); if (g > M.y + 0.62 || g < M.y - 0.95) return true;
            for (i = 0; i < W.elems.length; i++) { e = W.elems[i]; if (e.t === 'tub' || e.t === 'tec' || e.t === 'pav') continue; if (px > e.r[0] - 0.1 && px < e.r[2] + 0.1 && pz > e.r[1] - 0.1 && pz < e.r[3] + 0.1 && e.y1 > M.y + 0.55 && e.y0 < M.y + 2.0) return true; }
        }
        return false;
    }
    function stepDrive(M, W, k, dt) {
        var fwd = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), st = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0), K = fwd ? 0.6 : 1, tl = fwd + st * K, tr = fwd - st * K, m = Math.max(1, Math.abs(tl), Math.abs(tr)), top = VMAX * (fwd ? 1 : 0.6);
        tl = tl / m * top; tr = tr / m * top;
        if (k.Space) { M.vL = approach(M.vL, 0, 9 * dt); M.vR = approach(M.vR, 0, 9 * dt); } else { M.vL = approach(M.vL, tl, (tl === 0 ? ACC * 1.6 : ACC) * dt); M.vR = approach(M.vR, tr, (tr === 0 ? ACC * 1.6 : ACC) * dt); }
        M.speed = (M.vL + M.vR) / 2; var yr = -(M.vL - M.vR) / 2.1, ny = M.yaw + yr * dt, nx = M.x - Math.sin(ny) * M.speed * dt, nz = M.z - Math.cos(ny) * M.speed * dt;
        M.bump = false;
        if (Math.abs(M.speed) < 1e-4 && Math.abs(yr) < 1e-4) return;
        if (!blockedAt(M, W, nx, nz, ny)) { M.x = nx; M.z = nz; M.yaw = ny; }
        else if (!blockedAt(M, W, M.x, M.z, ny)) { M.yaw = ny; M.vL *= 0.6; M.vR *= 0.6; M.bump = true; }
        else { M.vL = M.vR = 0; M.speed = 0; M.bump = true; }
    }

    /* ---------- cinemática directa ---------- */
    function kin(M) {
        var yu = M.yaw + M.swing, c = Math.cos(yu), s = Math.sin(yu), F = [-s, -c], px = M.x + D.pivot[0] * c + D.pivot[2] * s, pz = M.z - D.pivot[0] * s + D.pivot[2] * c, py = M.y + D.upperY + D.pivot[1];
        var b = M.boom, g = b - M.stick, d = g - M.bucket, ef = D.L1 * Math.cos(b) - D.hump * Math.sin(b), eu = D.L1 * Math.sin(b) + D.hump * Math.cos(b);
        var E = [px + F[0] * ef, py + eu, pz + F[1] * ef], S = [E[0] + F[0] * D.L2 * Math.cos(g), E[1] + D.L2 * Math.sin(g), E[2] + F[1] * D.L2 * Math.cos(g)];
        var T = [S[0] + F[0] * D.L3 * Math.cos(d), S[1] + D.L3 * Math.sin(d), S[2] + F[1] * D.L3 * Math.cos(d)], Cb = [(S[0] + T[0]) / 2, (S[1] + T[1]) / 2, (S[2] + T[2]) / 2];
        return { P: [px, py, pz], E: E, S: S, T: T, Cb: Cb, F: F, g: g, d: d, mouthUp: -Math.cos(d), yaw: yu, reach: Math.hypot(T[0] - M.x, T[2] - M.z) };
    }
    function elemAt(W, p) { for (var i = 0; i < W.elems.length; i++) { var e = W.elems[i]; if (e.t === 'tub' || e.t === 'tec') continue; if (p[0] > e.r[0] && p[0] < e.r[2] && p[2] > e.r[1] && p[2] < e.r[3] && p[1] > e.y0 && p[1] < e.y1) return e; } return null; }
    function surf(W, p) { return C.hAt(W, p[0], p[2]); }

    /* ---------- articulaciones + excavación + descarga ---------- */
    function stepArm(M, W, k, dt) {
        var old = { boom: M.boom, stick: M.stick, bucket: M.bucket, swing: M.swing }, k0 = kin(M), ev = M.ev = [];
        M.wb = approach(M.wb, ((k.ArrowUp ? 1 : 0) - (k.ArrowDown ? 1 : 0)) * RATE.boom, 2.2 * dt);
        M.ws = approach(M.ws, ((k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0)) * RATE.stick, 3 * dt);
        M.wk = approach(M.wk, ((k.KeyQ ? 1 : 0) - (k.KeyR ? 1 : 0)) * RATE.bucket, 3.5 * dt);
        M.ww = approach(M.ww, ((k.KeyZ ? 1 : 0) - (k.KeyX ? 1 : 0)) * RATE.swing, 3 * dt);
        M.boom = clamp(M.boom + M.wb * dt, LIM.boom[0], LIM.boom[1]); if (M.boom === LIM.boom[0] || M.boom === LIM.boom[1]) M.wb = 0;
        M.stick = clamp(M.stick + M.ws * dt, LIM.stick[0], LIM.stick[1]); if (M.stick === LIM.stick[0] || M.stick === LIM.stick[1]) M.ws = 0;
        M.bucket = clamp(M.bucket + M.wk * dt, LIM.bucket[0], LIM.bucket[1]); if (M.bucket === LIM.bucket[0] || M.bucket === LIM.bucket[1]) M.wk = 0;
        M.swing += M.ww * dt; if (M.swing > Math.PI) M.swing -= 2 * Math.PI; if (M.swing < -Math.PI) M.swing += 2 * Math.PI;
        var kk = kin(M), dig = !!(k.ArrowDown || k.ArrowRight || k.KeyQ || k.KeyZ || k.KeyX), under = Math.hypot(kk.T[0] - M.x, kk.T[2] - M.z) < 2.0, st = surf(W, kk.T), canDig = dig && !M.full && !under, revert = false;
        M.msg = '';
        if (elemAt(W, kk.T) || elemAt(W, kk.S) || elemAt(W, kk.E)) { revert = true; M.msg = 'El brazo choca con una estructura.'; }
        else {
            if (kk.T[1] < st - 0.03 && !canDig && kk.T[1] < k0.T[1] - 1e-5) { revert = true; M.msg = M.full && dig ? 'Cucharón lleno: levanta y descarga.' : (under && dig ? 'No puedes excavar bajo la máquina.' : 'El suelo detiene el cucharón.'); }
            if (kk.S[1] < surf(W, kk.S) - 0.05 && kk.S[1] < k0.S[1] - 1e-5) { revert = true; M.msg = 'El brazo secundario toca el suelo.'; }
            if (kk.E[1] < surf(W, kk.E) - 0.05 && kk.E[1] < k0.E[1] - 1e-5) { revert = true; M.msg = 'El brazo toca el suelo.'; }
        }
        if (revert) { M.boom = old.boom; M.stick = old.stick; M.bucket = old.bucket; M.swing = old.swing; M.wb = M.ws = M.wk = M.ww = 0; kk = kin(M); }
        /* excavación: el diente está bajo la superficie y el operador empuja / cierra / barre */
        M.digT -= dt; var cell = surf(W, kk.T);
        if (!revert && dig && !M.full && !under && kk.T[1] < cell - 0.11 && M.digT <= 0) {
            var r = C.scoopCell(W, kk.T[0], kk.T[2], kk.T[1]); M.digT = 0.2;
            if (r.v > 0) { M.load = Math.min(M.cap, M.load + r.v); ev.push({ t: 'scoop', x: kk.T[0], y: kk.T[1], z: kk.T[2] }); if (M.load >= M.cap - 1e-6) { M.full = true; ev.push({ t: 'full' }); } }
            else if (r.msg) M.msg = r.msg;
        }
        /* descarga: boca hacia abajo */
        M.pourT -= dt;
        if (M.load > 0.001 && kk.mouthUp < -0.2 && kk.T[1] > surf(W, kk.T) + 0.12 && M.pourT <= 0) {
            M.pourT = 0.16; var dx = kk.Cb[0], dz = kk.Cb[2];
            if (Math.hypot(dx - M.x, dz - M.z) < 2.2) M.msg = 'Descarga lejos de la máquina (no sobre las orugas).';
            else { var pl = C.dumpSoil(W, dx, dz, Math.min(M.load, 0.25)); if (pl > 0) { M.load = Math.max(0, M.load - pl); M.full = false; ev.push({ t: 'pour', x: dx, y: surf(W, [dx, 0, dz]), z: dz }); } else M.msg = 'No se puede descargar aquí (estructura o pila al máximo).'; }
        }
        M.tipY = kk.T[1]; M.dist = kk.reach; return kk;
    }
    function step(M, W, keys, dt, driving) {
        if (driving) { stepDrive(M, W, keys, dt); } else { M.vL = approach(M.vL, 0, 9 * dt); M.vR = approach(M.vR, 0, 9 * dt); M.speed = 0; M.wb = M.ws = M.wk = M.ww = 0; }
        settle(M, W, dt, false);
        var kk = stepArm(M, W, driving ? keys : {}, dt); M.ev = M.ev || []; return kk;
    }
    G.SimObraExcSim = { create: create, step: step, settle: settle, kin: kin, blockedAt: blockedAt, LIM: LIM, CAP: CAP, VMAX: VMAX, ground: ground };
})(typeof window !== 'undefined' ? window : globalThis);
