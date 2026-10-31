/**
 * Simulador de Obra 3D — INTEGRACIÓN de hormigonado: camión MIXER (conducible, E), MEZCLADORA DE TROMPO (E / mantener G)
 * y PLANTA DOSIFICADORA (recarga). El hormigón vertido se dibuja como losetas de 0.5 m (InstancedMesh) y se cobra
 * como concreto (W.concPoured × PRICE.conc). Se engancha a GMObra.hooks igual que las demás máquinas.
 */
(function (G) {
    'use strict';
    var Model = G.SimObraMixModel, Sim = G.SimObraMixSim, C = G.SimObraCore, GM = G.GMObra;
    if (!GM || !GM.hooks || !Model || !Sim) return;
    var API = GM.api, D = Model.DT, MODES = ['cabin', 'op', 'ext'], NAMES = { cabin: 'Cabina', op: 'Canaleta', ext: 'Exterior' };
    var START = { truck: { x: -14, z: 6, yaw: 0 }, trompo: { x: 2, z: 19, yaw: 0 }, plant: { x: -14, z: 17.5 } };
    var st = { mode: 'cabin', lookYaw: 0, lookPitch: 0, oYaw: 0, oPitch: 0.35, oDist: 15, opDist: 7, pos: null, tgt: null, init: false };
    var panel = null, panelRoot = null, acc = 0, last = null, inst = null, instMap = {}, instN = 0, MAXI = 6000, tmpM = null;
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function cur() { var S = API.S(); return S && S.mix ? S : null; }
    function w2(M, lx, lz) { return Sim.w2(M, lx, lz); }
    function lc(M, x, z) { var dx = x - M.x, dz = z - M.z, c = Math.cos(M.yaw), s = Math.sin(M.yaw); return [dx * c - dz * s, dx * s + dz * c]; }

    /* ---------- hormigón colocado (losetas instanciadas) ---------- */
    function setupPours(S, T) {
        if (inst && inst.parent) inst.parent.remove(inst); if (inst) { inst.geometry.dispose(); inst.material.dispose(); }
        inst = new T.InstancedMesh(new T.BoxGeometry(0.5, 1, 0.5), new T.MeshPhongMaterial({ color: 0x8a8a85, shininess: 8, specular: 0x111111 }), MAXI); inst.count = 0; inst.frustumCulled = false; inst.castShadow = true; inst.receiveShadow = true; S.scene.add(inst);
        instMap = {}; instN = 0; tmpM = new T.Matrix4(); S.W.pours = {}; S.W.concPoured = 0;
    }
    function drawPours(S, keys) {
        var T = G.THREE, W = S.W, k, p, idx, sc = new T.Vector3(), pos = new T.Vector3(), q = new T.Quaternion();
        keys.forEach(function (key) {
            p = W.pours[key]; if (!p) return; idx = instMap[key]; if (idx == null) { if (instN >= MAXI) return; idx = instMap[key] = instN++; inst.count = instN; }
            var h = Math.max(0.02, p.h); pos.set(p.x, p.y0 + h / 2, p.z); sc.set(1, h, 1); tmpM.compose(pos, q, sc); inst.setMatrixAt(idx, tmpM);
        }); inst.instanceMatrix.needsUpdate = true;
    }

    function onWorld(S) {
        var T = G.THREE; if (last) { [last.truck, last.trompo, last.plant].forEach(function (o) { if (o && o.root.parent) o.root.parent.remove(o.root); try { o.dispose(); } catch (e) { } }); S.scene.children.slice().forEach(function (c) { if (c.userData && c.userData.gmMix) S.scene.remove(c); }); }
        var tr = Model.buildTruck(T), tp = Model.buildTrompo(T), pl = Model.buildPlant(T), TM = Sim.createTruck(START.truck.x, START.truck.z, START.truck.yaw), PM = Sim.createTrompo(START.trompo.x, START.trompo.z, START.trompo.yaw);
        [tr, tp, pl].forEach(function (o) { o.root.userData.gmMix = true; S.scene.add(o.root); });
        pl.root.position.set(START.plant.x, C.hAt(S.W, START.plant.x, START.plant.z), START.plant.z);
        setupPours(S, T); Sim.settleTruck(TM, S.W, 1, true); Sim.settleTrompo(PM, S.W);
        S.mix = { truck: { M: TM, model: tr, mounted: false }, trompo: { M: PM, model: tp }, plant: { x: START.plant.x, z: START.plant.z, model: pl } }; last = { truck: tr, trompo: tp, plant: pl };
        st.mode = 'cabin'; st.lookYaw = st.lookPitch = 0; st.oYaw = 0; st.init = false; st.pos = new T.Vector3(); st.tgt = new T.Vector3();
        tr.setPose(withGround(TM, S.W)); tp.setPose(PM); ensureDom(API.ROOT()); if (panel) panel.style.display = 'none';
    }
    function withGround(M, W) { var ch = Sim.chute(M); M.groundLocal = M.tipGround - M.y; M.streamTop = true; return M; }
    function ensureDom(root) {
        if (panelRoot === root && panel && panel.parentNode) return; panelRoot = root; var hud = root.querySelector('.sob-hud');
        panel = document.createElement('div'); panel.id = 'sobMix'; panel.className = 'sob-p sob-mach'; panel.style.display = 'none'; hud.appendChild(panel);
    }
    function nearTruck(S) { var M = S.mix.truck.M, l = lc(M, S.x, S.z); return !S.ov && !S.collapsed && !S.mount && Math.abs(l[0]) < 3.6 && l[1] > -5.6 && l[1] < 5.6 && Math.abs(S.feet - M.y) < 3; }
    function nearTrompo(S) { var M = S.mix.trompo.M, l = lc(M, S.x, S.z); return !S.ov && !S.collapsed && !S.mount && Math.abs(l[0]) < 2.4 && l[1] > -2.4 && l[1] < 2.4 && Math.abs(S.feet - M.y) < 3; }
    function mount(S) {
        var T = S.mix.truck; S.fly = false; S.keys = {}; S.btn = {}; S.mount = true; T.mounted = true; S.anchor = null; API.ROOT().classList.add('mounted'); st.mode = 'cabin'; st.lookYaw = st.lookPitch = 0; st.init = false;
        var p = w2(T.M, D.eye[0], D.eye[2]); S.x = p[0]; S.z = p[1]; S.feet = T.M.y + 2.2;
        API.toast('🚛 Mixer activo — W S A D conducir · Q verter · ← → giran la canaleta · ↑ ↓ la suben/bajan · Z tambor · C cámara · E bajar');
    }
    function dismount(S) {
        var T = S.mix.truck, M = T.M, cands = [[-3.0, -3.0], [-3.0, 0], [3.0, -3.0], [3.0, 0], [0, -6.2], [-3.2, 3.5]], pick = null, i, p, g;
        S.mount = false; T.mounted = false; S.keys = {}; S.btn = {}; API.ROOT().classList.remove('mounted'); if (panel) panel.style.display = 'none';
        for (i = 0; i < cands.length && !pick; i++) { p = w2(M, cands[i][0], cands[i][1]); if (p[0] < -C.N / 2 + 0.7 || p[0] > C.N / 2 - 0.7 || p[1] < -C.N / 2 + 0.7 || p[1] > C.N / 2 - 0.7) continue; g = Sim.ground(S.W, p[0], p[1], M.y + 0.5); if (Math.abs(g - M.y) > 1.0) continue; if (API.blocked(p[0], p[1], g)) continue; pick = { x: p[0], z: p[1], g: g }; }
        if (!pick) { p = w2(M, -3.0, -3.0); pick = { x: p[0], z: p[1], g: Math.max(Sim.ground(S.W, p[0], p[1], M.y + 3), M.y) }; }
        S.x = pick.x; S.z = pick.z; S.feet = pick.g; S.vy = 0; S.eye = S.feet + 1.7; S.yaw = Math.atan2(-(M.x - S.x), -(M.z - S.z)); S.pitch = -0.1; API.toast('Bajaste del mixer.');
    }
    function onKey(e) {
        var S = cur(); if (!S) return false; var code = e.code, T = S.mix.truck, P = S.mix.trompo.M;
        if (T.mounted) {
            if (code === 'KeyE') { dismount(S); return true; }
            if (code === 'KeyC') { st.mode = MODES[(MODES.indexOf(st.mode) + 1) % 3]; st.init = false; API.toast('Cámara: ' + NAMES[st.mode]); return true; }
            if (code === 'KeyZ') { T.M.drumOn = !T.M.drumOn; API.toast(T.M.drumOn ? 'Tambor girando (mezclando)' : 'Tambor detenido'); return true; }
            if (['Escape', 'KeyM', 'KeyH', 'KeyT', 'KeyU', 'KeyN'].indexOf(code) >= 0) return false;
            return true;
        }
        if (code === 'KeyE' && nearTruck(S)) { mount(S); return true; }
        if (code === 'KeyE' && nearTrompo(S)) {
            if (P.st === 0) { P.run = true; P.st = 1; P.mixT = 0; API.toast('Trompo encendido: cargando y mezclando (6 s)…'); }
            else { P.run = !P.run; API.toast(P.run ? 'Trompo girando' : 'Trompo detenido'); }
            return true;
        }
        if (code === 'KeyY') { var M = T.M; M.x = START.truck.x; M.z = START.truck.z; M.yaw = 0; M.speed = 0; Sim.settleTruck(M, S.W, 1, true); P.x = START.trompo.x; P.z = START.trompo.z; P.yaw = 0; Sim.settleTrompo(P, S.W); API.toast('Mixer y trompo reubicados.'); }
        return false;
    }
    function camUpdate(cam, S, dt) {
        var M = S.mix.truck.M, p = st.pos, t = st.tgt, k = 1 - Math.exp(-dt * 5), tx, ty, tz, dx, dy, dz, ang, cp;
        if (st.mode === 'cabin') { var e = w2(M, D.eye[0], D.eye[2]); cam.position.set(e[0], M.y + D.eye[1], e[1]); cam.rotation.set(-0.08 + st.lookPitch, M.yaw + st.lookYaw, 0); st.init = false; return; }
        if (st.mode === 'op') { var ch = Sim.chute(M); ang = M.yaw + Math.PI + st.oYaw + 0.8; cp = Math.cos(st.oPitch); tx = ch.T[0]; ty = ch.T[1]; tz = ch.T[2]; dx = tx + Math.sin(ang) * cp * st.opDist; dy = ty + 1.2 + Math.sin(st.oPitch) * st.opDist; dz = tz + Math.cos(ang) * cp * st.opDist; }
        else { ang = M.yaw + st.oYaw; cp = Math.cos(st.oPitch); tx = M.x; ty = M.y + 1.8; tz = M.z; dx = tx + Math.sin(ang) * cp * st.oDist; dy = ty + Math.sin(st.oPitch) * st.oDist; dz = tz + Math.cos(ang) * cp * st.oDist; }
        if (!st.init) { p.set(dx, dy, dz); t.set(tx, ty, tz); st.init = true; }
        p.x += (dx - p.x) * k; p.y += (dy - p.y) * k; p.z += (dz - p.z) * k; t.x += (tx - t.x) * k; t.y += (ty - t.y) * k; t.z += (tz - t.z) * k;
        cam.position.set(p.x, Math.max(p.y, C.hAt(S.W, p.x, p.z) + 0.45), p.z); cam.lookAt(t.x, t.y, t.z);
    }
    function cardinal(deg) { return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(((deg % 360) + 360) % 360 / 45) % 8]; }
    function draw(S, dt) {
        acc += dt; if (acc < 0.1) return; acc = 0; if (!panel) return; var T = S.mix.truck; if (!T.mounted) { panel.style.display = 'none'; return; }
        var M = T.M, head = -M.yaw * 180 / Math.PI; panel.style.display = 'block';
        panel.innerHTML = '<h4>🚛 MIXER ACTIVO</h4>'
            + '<div class="mrow"><span>Velocidad</span><b>' + Math.abs(M.speed * 3.6).toFixed(1) + ' km/h ' + (M.speed < -0.05 ? '↺ atrás' : (M.speed > 0.05 ? '↑' : '')) + '</b></div>'
            + '<div class="mrow"><span>Dirección</span><b>' + Math.round(((head % 360) + 360) % 360) + '° ' + cardinal(head) + '</b></div>'
            + '<div class="mrow"><span>Tambor</span><b>' + (M.pouring ? 'DESCARGANDO' : (M.drumOn ? 'mezclando' : 'detenido')) + '</b></div>'
            + '<div class="mrow"><span>Hormigón en tambor</span><b>' + M.load.toFixed(2) + ' / ' + M.cap.toFixed(0) + ' m³</b></div><div class="mbar"><i style="width:' + Math.round(M.load / M.cap * 100) + '%"></i></div>'
            + '<div class="mrow"><span>Canaleta · giro / altura</span><b>' + Math.round(M.cs * 180 / Math.PI) + '° / ' + Math.round(-M.ca * 180 / Math.PI) + '°</b></div>'
            + '<div class="mrow dim"><span>Vertido total</span><b>' + (S.W.concPoured || 0).toFixed(2) + ' m³</b></div>'
            + (M.refilling ? '<div class="mmsg">⬇ Cargando en la planta…</div>' : '') + (M.msg ? '<div class="mmsg">⚠ ' + M.msg + '</div>' : '')
            + '<div class="mkeys"><b>W S</b> avanzar · <b>A D</b> girar · <b>Esp</b> freno<br><b>Q</b> (mantener) verter · <b>← →</b> girar canaleta · <b>↑ ↓</b> subir/bajar<br><b>Z</b> tambor · <b>C</b> cámara (' + NAMES[st.mode] + ') · <b>E</b> bajar<br>Retrocede bajo la tolva de la planta para recargar.</div>';
    }
    function onFrame(dt) {
        var S = cur(); if (!S) return; var T = S.mix.truck, P = S.mix.trompo, M = T.M, i, ev;
        if (!S.ov) {
            Sim.stepTruck(M, S.W, S.keys || {}, dt, T.mounted, S.mix.plant); Sim.stepTrompo(P.M, S.W, dt, !T.mounted && nearTrompo(S) && !!(S.keys && S.keys.KeyG));
            [M.ev, P.M.ev].forEach(function (evs, which) {
                for (i = 0; i < evs.length; i++) {
                    ev = evs[i];
                    if (ev.t === 'pour') { drawPours(S, ev.cells || [Math.floor(ev.x / 0.5) * 0.5 + 0.25 + ',' + (Math.floor(ev.z / 0.5) * 0.5 + 0.25)]); if (Math.random() < 0.25) API.puff({ x: ev.x, y: ev.y + 0.1, z: ev.z }, 2, 0xb9b9b3); if (Math.random() < 0.1) API.sfx('dig'); API.dirtyTerrain(); }
                    else if (ev.t === 'ready') API.toast('Trompo: mezcla lista. Mantén G para verter.', 'ok');
                    else if (ev.t === 'empty') API.toast('Trompo vacío. Pulsa E para otra amasada.', 'warn');
                }
            });
        }
        var pm = withGround(M, S.W); T.model.setPose(pm); T.model.animate(M, dt); P.model.setPose(P.M);
        if (T.mounted) camUpdate(S.cam, S, dt);
        draw(S, dt);
        var pr = document.getElementById('sobPrompt'); if (pr && !S.mount) {
            if (nearTruck(S)) { pr.textContent = 'Presiona E para subir al camión mixer'; pr.classList.add('show'); }
            else if (nearTrompo(S)) { var Q = P.M; pr.textContent = Q.st === 0 ? 'E: encender y mezclar · mantén G para verter' : (Q.st === 1 ? 'Mezclando… ' + Math.round(Q.mixT / 6 * 100) + ' %' : (Q.run ? 'Mezcla lista: mantén G para verter · E detiene' : 'E: girar el tambor · mantén G para verter') + ' (' + Q.load.toFixed(2) + ' m³)'); pr.classList.add('show'); }
        }
    }
    function onMouse(dx, dy) { var S = cur(); if (!S || !S.mix.truck.mounted) return false; if (st.mode === 'cabin') { st.lookYaw = clamp(st.lookYaw - dx * 0.0024, -2.4, 2.4); st.lookPitch = clamp(st.lookPitch - dy * 0.0024, -0.8, 0.7); } else { st.oYaw -= dx * 0.005; st.oPitch = clamp(st.oPitch + dy * 0.005, 0.04, 1.3); } return true; }
    function onWheel(d) { var S = cur(); if (!S || !S.mix.truck.mounted) return false; if (st.mode === 'ext') st.oDist = clamp(st.oDist * (d > 0 ? 1.1 : 0.9), 8, 34); else if (st.mode === 'op') st.opDist = clamp(st.opDist * (d > 0 ? 1.1 : 0.9), 3.5, 16); return true; }
    function onBlocked(x, z, feet) {
        var S = cur(); if (!S || S.mount) return false; var M = S.mix.truck.M, l = lc(M, x, z), P = S.mix.trompo.M, q = lc(P, x, z), pl = S.mix.plant, dx = Math.abs(x - pl.x), dz = Math.abs(z - pl.z);
        if (Math.abs(l[0]) < 1.45 && l[1] > -4.4 && l[1] < 4.9 && feet < M.y + 3.4) return true;
        if (Math.abs(q[0]) < 0.8 && q[1] > -0.8 && q[1] < 0.9 && feet < P.y + 1.3) return true;
        return (Math.abs(dx - 2.1) < 0.35 && dz > 1.05 && dz < 1.75 && feet < 5) || (dx < 2.3 && dx > 1.9 && dz < 1.7 && feet < 5 && false) || (Math.abs(x - pl.x - 4.8) < 1.1 && dz < 0.9 && feet < 2);
    }
    function onClose() { var S = API.S(); if (S) S.mount = false; if (panel) panel.style.display = 'none'; }
    GM.hooks.world.push(onWorld); GM.hooks.frame.push(onFrame); GM.hooks.key.push(onKey); GM.hooks.mouse.push(onMouse); GM.hooks.wheel.push(onWheel); GM.hooks.blocked.push(onBlocked); GM.hooks.close.push(onClose);
    GM.mix = { mount: function () { var S = cur(); if (S) mount(S); }, dismount: function () { var S = cur(); if (S) dismount(S); }, state: function () { var S = cur(); return S && S.mix; }, nearTruck: function () { var S = cur(); return S ? nearTruck(S) : false; }, nearTrompo: function () { var S = cur(); return S ? nearTrompo(S) : false; }, Sim: Sim, cam: st };
})(typeof window !== 'undefined' ? window : globalThis);
