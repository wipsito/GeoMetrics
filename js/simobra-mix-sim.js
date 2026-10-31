/**
 * Simulador de Obra 3D — SIMULACIÓN del CAMIÓN MIXER y de la MEZCLADORA DE TROMPO (sin DOM; se prueba en Node).
 *  · Mixer: conducción sobre ruedas (dirección Ackermann), tambor que gira, canaleta con giro y elevación,
 *    vertido por caudal (m³/s) con límites de altura, recarga en la planta dosificadora.
 *  · Trompo: carga + mezcla temporizada, volcado del tambor con G y vertido por caudal.
 *  · El vertido se entrega como eventos {t:'pour', x, z, vol}; el hormigón colocado se acumula en W.pours / W.concPoured.
 */
(function (G) {
    'use strict';
    var C = G.SimObraCore, DT = G.SimObraMixModel.DT, DM = G.SimObraMixModel.DM;
    var VF = 6.0, VR = 3.0, ACC = 1.7, MAXST = 0.5, CAP = 6, POUR = 0.6, CA = [-0.2, 0.95], CS = 1.25;
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function approach(v, t, d) { return v + clamp(t - v, -d, d); }
    function w2(M, lx, lz) { var c = Math.cos(M.yaw), s = Math.sin(M.yaw); return [M.x + lx * c + lz * s, M.z - lx * s + lz * c]; }
    function ground(W, x, z, y) { return C.groundAt(W, x, z, y); }

    /* ---------- concreto colocado ---------- */
    function deposit(W, x, z, vol) {
        W.pours = W.pours || {}; W.concPoured = (W.concPoured || 0) + vol; var changed = [], q = [[Math.floor(x / 0.5) * 0.5 + 0.25, Math.floor(z / 0.5) * 0.5 + 0.25, vol / 0.25]], n = 0, CAPH = 0.3;
        while (q.length && n++ < 60) {
            var c = q.shift(), key = c[0] + ',' + c[1], p = W.pours[key];
            if (Math.abs(c[0]) > C.N / 2 || Math.abs(c[1]) > C.N / 2) continue;
            if (!p) p = W.pours[key] = { x: c[0], z: c[1], y0: C.hAt(W, c[0], c[1]), h: 0 };
            var room = CAPH - p.h, put = Math.min(room, c[2]); p.h += put; changed.push(key);
            var rest = c[2] - put; if (rest > 1e-4) { var d = [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]; d.forEach(function (o) { q.push([c[0] + o[0], c[1] + o[1], rest / 4]); }); }
        }
        return changed;
    }
    /* ---------- camión mixer ---------- */
    function createTruck(x, z, yaw) { return { x: x, z: z, yaw: yaw || 0, y: 0, pitch: 0, roll: 0, speed: 0, steer: 0, drum: 0, drumOn: true, cs: 0, ca: 0.55, load: CAP, cap: CAP, pouring: false, poured: 0, msg: '', ev: [], tipGround: 0, refilling: false, wc: 0, wa: 0, bump: false }; }
    function settleTruck(M, W, dt, instant) {
        var f1 = ground(W, w2(M, -DT.tr, DT.fz)[0], w2(M, -DT.tr, DT.fz)[1], M.y), f2 = ground(W, w2(M, DT.tr, DT.fz)[0], w2(M, DT.tr, DT.fz)[1], M.y), r1 = ground(W, w2(M, -DT.tr, 2.2)[0], w2(M, -DT.tr, 2.2)[1], M.y), r2 = ground(W, w2(M, DT.tr, 2.2)[0], w2(M, DT.tr, 2.2)[1], M.y);
        var ty = (f1 + f2 + r1 + r2) / 4, tp = Math.atan2((f1 + f2) / 2 - (r1 + r2) / 2, 5.1), tr = Math.atan2((f2 + r2) / 2 - (f1 + r1) / 2, 2 * DT.tr), a = instant ? 1 : Math.min(1, dt * 6);
        M.y += (ty - M.y) * a; M.pitch += (clamp(tp, -0.4, 0.4) - M.pitch) * a; M.roll += (clamp(tr, -0.4, 0.4) - M.roll) * a;
    }
    function blockedTruck(M, W, x, z, yaw) {
        var c = Math.cos(yaw), s = Math.sin(yaw), ix, iz, i, e, px, pz, g, zs = [-4.2, -2, 0, 2, 4.7];
        for (ix = -1; ix <= 1; ix++) for (iz = 0; iz < zs.length; iz++) {
            px = x + ix * 1.2 * c + zs[iz] * s; pz = z - ix * 1.2 * s + zs[iz] * c;
            if (px < -C.N / 2 + 0.4 || px > C.N / 2 - 0.4 || pz < -C.N / 2 + 0.4 || pz > C.N / 2 - 0.4) return true;
            g = ground(W, px, pz, M.y); if (g > M.y + 0.5 || g < M.y - 0.9) return true;
            for (i = 0; i < W.elems.length; i++) { e = W.elems[i]; if (e.t === 'tub' || e.t === 'tec' || e.t === 'pav') continue; if (px > e.r[0] - 0.1 && px < e.r[2] + 0.1 && pz > e.r[1] - 0.1 && pz < e.r[3] + 0.1 && e.y1 > M.y + 0.5 && e.y0 < M.y + 2.5) return true; }
        }
        return false;
    }
    function chute(M) {                                                     /* punta de la canaleta */
        var p = w2(M, DT.ch[0], DT.ch[2]), psi = M.yaw + M.cs, py = M.y + DT.ch[1], h = DT.CL * Math.cos(M.ca);
        return { P: [p[0], py, p[1]], T: [p[0] + Math.sin(psi) * h, py - DT.CL * Math.sin(M.ca), p[1] + Math.cos(psi) * h] };
    }
    function hopperPos(M) { var p = w2(M, 0, 3.9); return [p[0], p[1]]; }
    function stepTruck(M, W, k, dt, driving, plant) {
        var fwd = (k.KeyW ? 1 : 0) - (k.KeyS ? 1 : 0), st = (k.KeyA ? 1 : 0) - (k.KeyD ? 1 : 0), ev = M.ev = [];
        M.msg = '';
        if (driving) {
            M.steer = approach(M.steer, st * MAXST, 1.4 * dt);
            var tv = fwd * (fwd > 0 ? VF : VR); if (k.Space) M.speed = approach(M.speed, 0, 7 * dt); else M.speed = approach(M.speed, tv, (tv === 0 ? ACC * 1.6 : ACC) * dt);
            var yr = M.speed * Math.tan(M.steer) / DT.wb, ny = M.yaw + yr * dt, nx = M.x - Math.sin(ny) * M.speed * dt, nz = M.z - Math.cos(ny) * M.speed * dt; M.bump = false;
            if (Math.abs(M.speed) > 1e-4) { if (!blockedTruck(M, W, nx, nz, ny)) { M.x = nx; M.z = nz; M.yaw = ny; } else { M.speed = 0; M.bump = true; M.msg = 'Obstáculo.'; } }
            M.wc = approach(M.wc, ((k.ArrowRight ? 1 : 0) - (k.ArrowLeft ? 1 : 0)) * 0.7, 3 * dt); M.wa = approach(M.wa, ((k.ArrowDown ? 1 : 0) - (k.ArrowUp ? 1 : 0)) * 0.6, 3 * dt);
        } else { M.speed = approach(M.speed, 0, 7 * dt); M.steer = approach(M.steer, 0, 1.4 * dt); M.wc = M.wa = 0; }
        var ca0 = M.ca; M.cs = clamp(M.cs + M.wc * dt, -CS, CS); M.ca = clamp(M.ca + M.wa * dt, CA[0], CA[1]);
        settleTruck(M, W, dt, false);
        var ch = chute(M), gr = C.hAt(W, ch.T[0], ch.T[2]), tg0 = C.pourTarget ? C.pourTarget(W, ch.T[0], ch.T[2], ch.T[1]) : null; if (ch.T[1] < gr + 0.25 && M.ca > ca0) { M.ca = ca0; M.wa = 0; ch = chute(M); gr = C.hAt(W, ch.T[0], ch.T[2]); } M.tipGround = gr; M.pouring = false;
        var want = driving && k.KeyQ && M.load > 0.001;
        if (want) {
            if (ch.T[1] - (tg0 ? Math.max(gr, tg0.y1) : gr) > 3.2) M.msg = 'Baja la canaleta (↓) para verter cerca del suelo.';
            else if (Math.hypot(ch.T[0] - M.x, ch.T[2] - M.z) < 3.0) M.msg = 'Gira la canaleta (← →) fuera del camión.';
            else if (Math.abs(ch.T[0]) > C.N / 2 - 0.3 || Math.abs(ch.T[2]) > C.N / 2 - 0.3) M.msg = 'Fuera del lote.';
            else { var v = Math.min(M.load, POUR * dt); M.load -= v; M.poured += v; M.pouring = true; var used = C.pourInto ? C.pourInto(W, ch.T[0], ch.T[2], ch.T[1], v) : 0, ch2 = used < v - 1e-9 ? deposit(W, ch.T[0], ch.T[2], v - used) : []; if (used > 0) M.msg = 'Vaciando en el encofrado (' + C.fmt(100 * (W.pourEl.pv / W.pourEl.vol), 0) + ' %).'; else if (W.real) M.msg = 'Apunta la canaleta sobre un encofrado: aquí el concreto cae al suelo y se pierde.'; ev.push({ t: 'pour', x: ch.T[0], y: tg0 ? tg0.y1 : gr, z: ch.T[2], vol: v, cells: ch2, form: used > 0 }); }
        } else if (driving && k.KeyQ && M.load <= 0.001) M.msg = 'Mixer vacío: recarga en la planta dosificadora.';
        M.drum += ((M.pouring ? -1.7 : (M.drumOn ? 1.0 : 0))) * dt;
        /* recarga: la tolva trasera bajo la boquilla de la planta */
        M.refilling = false;
        if (plant && M.load < M.cap - 1e-4 && Math.abs(M.speed) < 0.6) { var hp = hopperPos(M); if (Math.hypot(hp[0] - plant.x, hp[1] - plant.z) < 1.4) { M.load = Math.min(M.cap, M.load + 1.6 * dt); M.refilling = true; ev.push({ t: 'fill' }); } }
        else if (plant && M.load < M.cap - 1e-4 && driving) { var hp2 = hopperPos(M); if (Math.hypot(hp2[0] - plant.x, hp2[1] - plant.z) < 2.2 && Math.abs(M.speed) >= 0.6) M.msg = 'Detente bajo la tolva para cargar.'; }
        return ch;
    }
    /* ---------- mezcladora de trompo ---------- */
    function createTrompo(x, z, yaw) { return { x: x, z: z, yaw: yaw || 0, y: 0, pitch: 0, roll: 0, tilt: 0.75, spin: 0, run: false, st: 0, mixT: 0, load: 0, cap: DM.cap, poured: 0, msg: '', ev: [] }; }
    function settleTrompo(M, W) { M.y = ground(W, M.x, M.z, 0); }
    function lip(M) { var t = M.tilt, ax = [0, Math.cos(t), -Math.sin(t)], l = [0, DM.pivot[1] + 0.3 + ax[1] * 0.55, DM.pivot[2] + ax[2] * 0.55], p = w2(M, l[0], l[2]); return { x: p[0], y: M.y + l[1], z: p[1] }; }
    function stepTrompo(M, W, dt, tiltKey) {
        var ev = M.ev = []; M.msg = '';
        M.spin += (M.run ? (M.st === 1 ? 3.2 : 2.2) : 0) * dt;
        if (M.run && M.st === 1) { M.mixT += dt; if (M.mixT >= 6) { M.st = 2; M.load = M.cap; ev.push({ t: 'ready' }); } else M.load = M.cap * M.mixT / 6; }
        var target = tiltKey ? 2.05 : 0.75; M.tilt = approach(M.tilt, target, 1.3 * dt);
        if (M.tilt > 1.35 && M.load > 0.001) {
            var l = lip(M), v = Math.min(M.load, 0.05 * dt * (M.tilt - 1.2) / 0.85 * 1.5 + 0.0001); var tgT = C.pourTarget ? C.pourTarget(W, l.x, l.z, l.y) : null; var bt = W.bote; if (!(bt && bt.on) && l.y - (tgT ? Math.max(C.hAt(W, l.x, l.z), tgT.y1) : C.hAt(W, l.x, l.z)) > 1.4) { M.msg = 'El suelo está muy abajo: acerca el trompo.'; return; }
            M.load -= v; M.poured += v; var tk = 0; if (bt && bt.on && bt.vol < bt.cap - 1e-6) { tk = Math.min(v, bt.cap - bt.vol); bt.vol += tk; M.msg = bt.vol >= bt.cap - 1e-6 ? 'Bote lleno: suelta G y llévalo al encofrado.' : 'Llenando el bote…'; } var v2 = v - tk, usedT = v2 > 1e-9 && C.pourInto ? C.pourInto(W, l.x, l.z, l.y, v2) : 0, cT = v2 > 1e-9 && usedT < v2 - 1e-9 ? deposit(W, l.x, l.z, v2 - usedT) : []; ev.push({ t: 'pour', x: l.x, y: C.hAt(W, l.x, l.z), z: l.z, vol: v, cells: cT, form: usedT > 0 || tk > 0 });
            if (M.load <= 0.002) { M.load = 0; M.st = 0; M.mixT = 0; ev.push({ t: 'empty' }); }
        }
    }
    G.SimObraMixSim = { createTruck: createTruck, stepTruck: stepTruck, settleTruck: settleTruck, chute: chute, hopperPos: hopperPos, createTrompo: createTrompo, stepTrompo: stepTrompo, settleTrompo: settleTrompo, lip: lip, deposit: deposit, w2: w2, ground: ground, CAP: CAP };
})(typeof window !== 'undefined' ? window : globalThis);
