/**
 * Simulador de Obra 3D — INTEGRACIÓN de la retroexcavadora: subir/bajar (E), cámaras (C), panel de control y eventos.
 * Se engancha a GMObra.hooks igual que la excavadora; comparte S.mount (solo se maneja una máquina a la vez).
 */
(function (G) {
    'use strict';
    var Model = G.SimObraRetroModel, Sim = G.SimObraRetroSim, C = G.SimObraCore, GM = G.GMObra;
    if (!GM || !GM.hooks || !Model || !Sim) return;
    var API = GM.api, D = Model.DIM, START = { x: -6, z: 14, yaw: 0 }, MODES = ['cabin', 'op', 'ext'], NAMES = { cabin: 'Cabina', op: 'Operación', ext: 'Exterior' };
    var st = { mode: 'cabin', lookYaw: 0, lookPitch: 0, oYaw: 0, oPitch: 0.4, oDist: 12, opDist: 8, pos: null, tgt: null, init: false }, panel = null, acc = 0, lastModel = null;
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function cur() { var S = API.S(); return S && S.retro ? S : null; }
    function w2(M, lx, lz) { return Sim.w2(M, lx, lz); }

    function onWorld(S) {
        var T = G.THREE, old = lastModel; if (old) { if (old.root.parent) old.root.parent.remove(old.root); S.scene.children.slice().forEach(function (c) { if (c.userData && c.userData.gmRetro) S.scene.remove(c); }); try { old.dispose(); } catch (e) { } }
        var model = Model.build(T), M = Sim.create(START.x, START.z, START.yaw); model.root.userData.gmRetro = true; S.scene.add(model.root); Sim.settle(M, S.W, 1, true);
        S.retro = { M: M, model: model, mounted: false, kk: Sim.kin(M) }; lastModel = model; st.mode = 'cabin'; st.lookYaw = st.lookPitch = 0; st.oYaw = 0; st.oPitch = 0.4; st.init = false; st.pos = new T.Vector3(); st.tgt = new T.Vector3();
        model.setPose(M); model.setLoad('L', 0, M.capL); model.setLoad('B', 0, M.capB); ensureDom(API.ROOT());
        if (panel) panel.style.display = 'none';
    }
    var panelRoot = null;
    function ensureDom(root) {
        if (panelRoot === root && panel && panel.parentNode) return; panelRoot = root; var hud = root.querySelector('.sob-hud');
        panel = document.createElement('div'); panel.id = 'sobRetro'; panel.className = 'sob-p sob-mach'; panel.style.display = 'none'; hud.appendChild(panel);
    }
    function near(S) { var M = S.retro.M, lx, lz, dx = S.x - M.x, dz = S.z - M.z, c = Math.cos(M.yaw), s = Math.sin(M.yaw); lx = dx * c - dz * s; lz = dx * s + dz * c; return !S.ov && !S.collapsed && !S.mount && Math.abs(lx) < 3.2 && lz > -2.8 && lz < 3 && Math.abs(S.feet - M.y) < 3; }
    function mount(S) {
        var R = S.retro; S.fly = false; S.keys = {}; S.btn = {}; S.mount = true; R.mounted = true; S.anchor = null; API.ROOT().classList.add('mounted'); st.mode = 'cabin'; st.lookYaw = st.lookPitch = 0; st.init = false;
        var cp = w2(R.M, 0, 0.1); S.x = cp[0]; S.z = cp[1]; S.feet = R.M.y + 2; API.toast('🚜 Retroexcavadora activa — G: cambiar pala/retro · flechas/Q R/Z X: mover la parte activa · F: estabilizadores · C: cámara · E: bajar');
    }
    function dismount(S) {
        var R = S.retro, M = R.M, cands = [[-2.4, 0.4], [-2.4, -1.6], [2.4, 0.4], [2.4, -1.6], [0, 4.3], [-2.4, 2.5]], pick = null, i, p, g;
        S.mount = false; R.mounted = false; S.keys = {}; S.btn = {}; API.ROOT().classList.remove('mounted'); M.speed = 0; M.stabT = M.stabT; if (panel) panel.style.display = 'none';
        for (i = 0; i < cands.length && !pick; i++) { p = w2(M, cands[i][0], cands[i][1]); if (p[0] < -C.N / 2 + 0.7 || p[0] > C.N / 2 - 0.7 || p[1] < -C.N / 2 + 0.7 || p[1] > C.N / 2 - 0.7) continue; g = Sim.ground(S.W, p[0], p[1], M.y + 0.5); if (Math.abs(g - M.y) > 1.0) continue; if (API.blocked(p[0], p[1], g)) continue; pick = { x: p[0], z: p[1], g: g }; }
        if (!pick) { p = w2(M, -2.4, 0.4); pick = { x: p[0], z: p[1], g: Math.max(Sim.ground(S.W, p[0], p[1], M.y + 3), M.y) }; }
        S.x = pick.x; S.z = pick.z; S.feet = pick.g; S.vy = 0; S.eye = S.feet + 1.7; S.yaw = Math.atan2(-(M.x - S.x), -(M.z - S.z)); S.pitch = -0.12; API.toast('Bajaste de la retroexcavadora.');
    }
    function onKey(e) {
        var S = cur(); if (!S) return false; var code = e.code, R = S.retro, M = R.M;
        if (R.mounted) {
            if (code === 'KeyE') { dismount(S); return true; }
            if (code === 'KeyC') { st.mode = MODES[(MODES.indexOf(st.mode) + 1) % 3]; st.init = false; API.toast('Cámara: ' + NAMES[st.mode]); return true; }
            if (code === 'KeyG') {
                if (Math.abs(M.speed) > 0.3) { API.toast('Detén la máquina antes de cambiar de herramienta.', 'warn'); return true; }
                var im = Sim.toggleImp(M); M.stabT = im === 'B' ? 1 : 0; API.toast(im === 'B' ? '🦾 Controlando la RETRO trasera (bajando estabilizadores)' : '🚜 Controlando la PALA delantera (subiendo estabilizadores)'); return true;
            }
            if (code === 'KeyF') { if (Math.abs(M.speed) > 0.3) API.toast('Detén la máquina antes de mover los estabilizadores.', 'warn'); else API.toast(Sim.toggleStab(M) ? 'Estabilizadores bajando…' : 'Estabilizadores subiendo…'); return true; }
            if (['Escape', 'KeyM', 'KeyH', 'KeyT', 'KeyU', 'KeyN'].indexOf(code) >= 0) return false;
            return true;
        }
        if (code === 'KeyE' && near(S)) { mount(S); return true; }
        if (code === 'KeyY') { M.x = START.x; M.z = START.z; M.yaw = 0; M.swing = 0; M.speed = 0; Sim.settle(M, S.W, 1, true); API.toast('Retroexcavadora reubicada.'); }
        return false;
    }
    function camUpdate(cam, S, dt) {
        var R = S.retro, M = R.M, kk = R.kk, c = Math.cos(M.yaw), s = Math.sin(M.yaw), p = st.pos, t = st.tgt, k = 1 - Math.exp(-dt * 5), dx, dy, dz, tx, ty, tz;
        if (st.mode === 'cabin') { var e = w2(M, D.eye[0], D.eye[2]); cam.position.set(e[0], M.y + D.eye[1], e[1]); cam.rotation.set(-0.12 + st.lookPitch, M.yaw + st.lookYaw, 0); st.init = false; return; }
        if (st.mode === 'op') {
            var useB = M.imp === 'B', T = useB ? kk.B.T : kk.L.T, base = M.yaw + (useB ? Math.PI : 0) + 0.9 + st.oYaw, cp = Math.cos(st.oPitch);
            tx = T[0]; ty = T[1]; tz = T[2]; dx = tx + Math.sin(base) * cp * st.opDist; dy = ty + 1 + Math.sin(st.oPitch) * st.opDist; dz = tz + Math.cos(base) * cp * st.opDist;
        } else { var ang = M.yaw + st.oYaw, cp2 = Math.cos(st.oPitch); tx = M.x; ty = M.y + 1.6; tz = M.z; dx = tx + Math.sin(ang) * cp2 * st.oDist; dy = ty + Math.sin(st.oPitch) * st.oDist; dz = tz + Math.cos(ang) * cp2 * st.oDist; }
        if (!st.init) { p.set(dx, dy, dz); t.set(tx, ty, tz); st.init = true; }
        p.x += (dx - p.x) * k; p.y += (dy - p.y) * k; p.z += (dz - p.z) * k; t.x += (tx - t.x) * k; t.y += (ty - t.y) * k; t.z += (tz - t.z) * k;
        cam.position.set(p.x, Math.max(p.y, C.hAt(S.W, p.x, p.z) + 0.45), p.z); cam.lookAt(t.x, t.y, t.z);
    }
    function cardinal(deg) { return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(((deg % 360) + 360) % 360 / 45) % 8]; }
    function draw(S, dt, force) {
        acc += dt; if (!force && acc < 0.1) return; acc = 0; if (!panel) return; var R = S.retro; if (!R.mounted) { panel.style.display = 'none'; return; }
        var M = R.M, kk = R.kk, B = kk.B, head = -M.yaw * 180 / Math.PI, deg = function (v) { return Math.round(v * 180 / Math.PI); }, depth = Math.max(0, C.h0At(S.W, B.T[0], B.T[2]) - C.hAt(S.W, B.T[0], B.T[2]));
        panel.style.display = 'block';
        panel.innerHTML = '<h4>🚜 RETROEXCAVADORA ACTIVA</h4>'
            + '<div class="mrow"><span>Velocidad</span><b>' + Math.abs(M.speed * 3.6).toFixed(1) + ' km/h ' + (M.speed < -0.05 ? '↺ atrás' : (M.speed > 0.05 ? '↑' : '')) + '</b></div>'
            + '<div class="mrow"><span>Dirección</span><b>' + Math.round(((head % 360) + 360) % 360) + '° ' + cardinal(head) + '</b></div>'
            + '<div class="mrow"><span>Control activo (G)</span><b style="color:#ffcc4d">' + (M.imp === 'B' ? '🦾 RETRO trasera' : '🚜 PALA delantera') + '</b></div>'
            + '<div class="mrow"><span>Estabilizadores</span><b>' + (M.stab > 0.97 ? 'BAJADOS' : (M.stab < 0.03 ? 'subidos' : 'en movimiento')) + '</b></div>'
            + '<div class="mrow"><span>Pala · brazo / cuchara</span><b>' + deg(M.lift) + '° / ' + deg(M.ld) + '°</b></div>'
            + '<div class="mrow"><span>Pala · material</span><b>' + M.loadL.toFixed(2) + ' / ' + M.capL.toFixed(1) + ' m³</b></div><div class="mbar"><i style="width:' + Math.round(M.loadL / M.capL * 100) + '%"></i></div>'
            + '<div class="mrow"><span>Retro · boom / balancín</span><b>' + deg(M.boom) + '° / ' + deg(M.stick) + '°</b></div>'
            + '<div class="mrow"><span>Retro · giro</span><b>' + deg(M.swing) + '°</b></div>'
            + '<div class="mrow"><span>Retro · profundidad</span><b>' + depth.toFixed(2) + ' m</b></div>'
            + '<div class="mrow"><span>Retro · material</span><b>' + M.loadB.toFixed(2) + ' / ' + M.capB.toFixed(1) + ' m³</b></div><div class="mbar"><i style="width:' + Math.round(M.loadB / M.capB * 100) + '%"></i></div>'
            + '<div class="mrow dim"><span>Excavado con máquina</span><b>' + S.W.excavM.toFixed(1) + ' m³</b></div>'
            + (M.msg ? '<div class="mmsg">⚠ ' + M.msg + '</div>' : '')
            + '<div class="mkeys"><b>W S</b> avanzar · <b>A D</b> girar · <b>Esp</b> freno · <b>F</b> estabilizadores<br><b>G</b> cambiar PALA ⇄ RETRO<br>' + (M.imp === 'B' ? '<b>↓ ↑</b> boom (sube/baja) · <b>← →</b> balancín (recoge/extiende) · <b>Q R</b> cuchara · <b>Z X</b> girar' : '<b>↓ ↑</b> subir/bajar brazos · <b>← →</b> o <b>Q R</b> recoger/volcar') + '<br><b>C</b> cámara (' + NAMES[st.mode] + ') · <b>E</b> bajar';
    }
    function onFrame(dt) {
        var S = cur(); if (!S) return; var R = S.retro, M = R.M, kk, i, ev, soil;
        if (!S.ov) {
            kk = Sim.step(M, S.W, S.keys || {}, dt, R.mounted); R.model.animate(M, dt);
            for (i = 0; i < M.ev.length; i++) {
                ev = M.ev[i]; soil = C.layerAt(S.W.site, Math.max(0, C.h0At(S.W, ev.x || 0, ev.z || 0) - C.hAt(S.W, ev.x || 0, ev.z || 0))).col;
                if (ev.t === 'scoop') { API.puff({ x: ev.x, y: ev.y, z: ev.z }, 12, soil); API.sfx('mach'); S.shake = Math.max(S.shake || 0, 0.025); API.dirtyTerrain(); if (C.stabilize(S.W, 3) > 0) { API.toast('⚠ ¡Derrumbe de talud! Excava por escalones o con taludes más tendidos.', 'bad'); API.sfx('cave'); } }
                else if (ev.t === 'pour') { API.puff({ x: ev.x, y: ev.y, z: ev.z }, 14, soil); API.sfx('dig'); API.dirtyTerrain(); if (C.stabilize(S.W, 3) > 0) API.dirtyTerrain(); }
                else if (ev.t === 'full') API.toast(ev.who === 'L' ? 'Pala llena: levántala y vuelca con R (o →).' : 'Cuchara de la retro llena: levanta, gira y descarga con R.', 'warn');
            }
        } else kk = R.kk;
        R.kk = kk; R.model.setPose(M); R.model.setLoad('L', M.loadL, M.capL); R.model.setLoad('B', M.loadB, M.capB);
        if (R.mounted) camUpdate(S.cam, S, dt);
        draw(S, dt, false);
        if (near(S)) { var pr = document.getElementById('sobPrompt'); if (pr) { pr.textContent = 'Presiona E para subir a la retroexcavadora'; pr.classList.add('show'); } }
    }
    function onMouse(dx, dy) {
        var S = cur(); if (!S || !S.retro.mounted) return false;
        if (st.mode === 'cabin') { st.lookYaw = clamp(st.lookYaw - dx * 0.0024, -3.1, 3.1); st.lookPitch = clamp(st.lookPitch - dy * 0.0024, -0.8, 0.7); }
        else { st.oYaw -= dx * 0.005; st.oPitch = clamp(st.oPitch + dy * 0.005, 0.04, 1.3); } return true;
    }
    function onWheel(d) { var S = cur(); if (!S || !S.retro.mounted) return false; if (st.mode === 'ext') st.oDist = clamp(st.oDist * (d > 0 ? 1.1 : 0.9), 6, 26); else if (st.mode === 'op') st.opDist = clamp(st.opDist * (d > 0 ? 1.1 : 0.9), 4, 16); return true; }
    function onBlocked(x, z, feet) {
        var S = cur(); if (!S || S.mount) return false; var M = S.retro.M, dx = x - M.x, dz = z - M.z, c = Math.cos(M.yaw), s = Math.sin(M.yaw), lx = dx * c - dz * s, lz = dx * s + dz * c;
        return Math.abs(lx) < 1.5 && lz > -1.9 && lz < 2.5 && feet < M.y + 2.6;
    }
    function onClose() { var S = API.S(); if (S) S.mount = false; if (panel) panel.style.display = 'none'; }
    GM.hooks.world.push(onWorld); GM.hooks.frame.push(onFrame); GM.hooks.key.push(onKey); GM.hooks.mouse.push(onMouse); GM.hooks.wheel.push(onWheel); GM.hooks.blocked.push(onBlocked); GM.hooks.close.push(onClose);
    GM.retro = { mount: function () { var S = cur(); if (S) mount(S); }, dismount: function () { var S = cur(); if (S) dismount(S); }, state: function () { var S = cur(); return S && S.retro; }, near: function () { var S = cur(); return S ? near(S) : false; }, Sim: Sim, cam: st };
})(typeof window !== 'undefined' ? window : globalThis);
