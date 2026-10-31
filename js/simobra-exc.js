/**
 * Simulador de Obra 3D — INTEGRACIÓN de la excavadora con el juego (interacción con el jugador).
 * Une el modelo (simobra-exc-model), la simulación (simobra-exc-sim) y las cámaras/HUD (simobra-exc-ui)
 * mediante los ganchos de GMObra.hooks. No toca el control del personaje salvo para tomar/devolver el mando.
 */
(function (G) {
    'use strict';
    var Model = G.SimObraExcModel, Sim = G.SimObraExcSim, UI = G.SimObraExcUI, C = G.SimObraCore, GM = G.GMObra;
    if (!GM || !GM.hooks || !Model || !Sim || !UI) return;
    var API = GM.api, START = { x: 6, z: 14, yaw: 0 };
    function cur() { var S = API.S(); return S && S.exc ? S : null; }
    function w2(M, lx, lz) { var c = Math.cos(M.yaw), s = Math.sin(M.yaw); return [M.x + lx * c + lz * s, M.z - lx * s + lz * c]; }

    var lastModel = null;      /* S se recrea en cada misión: el modelo anterior se guarda aquí para no duplicarlo */
    function onWorld(S) {
        var T = G.THREE, old = lastModel; if (old) { if (old.root.parent) old.root.parent.remove(old.root); S.scene.children.slice().forEach(function (c) { if (c.userData && c.userData.gmExc) S.scene.remove(c); }); try { old.dispose(); } catch (e) { } }
        UI.reset(T); var model = Model.build(T), M = Sim.create(START.x, START.z, START.yaw);
        model.root.userData.gmExc = true; S.scene.add(model.root); Sim.settle(M, S.W, 1, true); S.exc = { M: M, model: model, mounted: false, kk: Sim.kin(M) }; S.__excModel = model; lastModel = model; S.mount = false;
        model.setPose(M); model.setLoad(0, M.cap); UI.ensureDom(API.ROOT()); API.ROOT().classList.remove('mounted'); UI.setPrompt('');
    }
    function near(S) { var M = S.exc.M; return !S.ov && !S.collapsed && !S.mount && Math.hypot(S.x - M.x, S.z - M.z) < 4.3 && Math.abs(S.feet - M.y) < 3; }
    function mount(S) {
        var E = S.exc; S.fly = false; S.keys = {}; S.btn = {}; S.mount = true; E.mounted = true; S.anchor = null; API.ROOT().classList.add('mounted'); UI.setPrompt('');
        var c = Model.DIM.cab, cp = w2(E.M, c[0], c[2]); S.x = cp[0]; S.z = cp[1]; S.feet = E.M.y + 2;
        API.toast('🚜 Excavadora activa — C: cámara · E: bajar · mueve con W A S D y maneja el brazo con las flechas, Q/R y Z/X');
    }
    function dismount(S) {
        var E = S.exc, M = E.M; S.mount = false; E.mounted = false; S.keys = {}; S.btn = {}; API.ROOT().classList.remove('mounted'); M.vL = M.vR = 0;
        var cands = [[-2.8, 0], [-2.8, 1.8], [2.8, 0], [0, 3.2], [0, -3.4], [2.8, -1.8], [-3.4, -1.8]], pick = null, i, p, g;
        for (i = 0; i < cands.length && !pick; i++) { p = w2(M, cands[i][0], cands[i][1]); if (p[0] < -C.N / 2 + 0.7 || p[0] > C.N / 2 - 0.7 || p[1] < -C.N / 2 + 0.7 || p[1] > C.N / 2 - 0.7) continue; g = Sim.ground(S.W, p[0], p[1], M.y + 0.5); if (Math.abs(g - M.y) > 1.0) continue; if (API.blocked(p[0], p[1], g)) continue; pick = { x: p[0], z: p[1], g: g }; }
        if (!pick) { p = w2(M, -2.8, 0); pick = { x: p[0], z: p[1], g: Math.max(Sim.ground(S.W, p[0], p[1], M.y + 3), M.y) }; }
        S.x = pick.x; S.z = pick.z; S.feet = pick.g; S.vy = 0; S.eye = S.feet + 1.7; S.yaw = Math.atan2(-(M.x - S.x), -(M.z - S.z)); S.pitch = -0.12;
        API.toast('Bajaste de la excavadora. Camina con W A S D.');
    }
    function onKey(e) {
        var S = cur(); if (!S) return false; var code = e.code, E = S.exc; if (S.retro && S.retro.mounted) return false;
        if (E.mounted) {
            if (code === 'KeyE') { dismount(S); return true; }
            if (code === 'KeyC') { API.toast('Cámara: ' + UI.NAMES[UI.cycle()]); return true; }
            if (['Escape', 'KeyM', 'KeyH', 'KeyT', 'KeyU', 'KeyN'].indexOf(code) >= 0) return false;
            return true;
        }
        if (code === 'KeyE' && near(S)) { mount(S); return true; }
        if (code === 'KeyY') { var M = E.M; M.x = START.x; M.z = START.z; M.yaw = 0; M.swing = 0; M.vL = M.vR = 0; Sim.settle(M, S.W, 1, true); API.toast('Excavadora reubicada en su posición inicial.'); return true; }
        return false;
    }
    function onFrame(dt) {
        var S = cur(); if (!S) return; var E = S.exc, M = E.M, kk, i, ev, soil;
        if (!S.ov) {
            kk = Sim.step(M, S.W, S.keys || {}, dt, E.mounted); E.model.animate(M, dt);
            for (i = 0; i < M.ev.length; i++) {
                ev = M.ev[i]; soil = C.layerAt(S.W.site, Math.max(0, C.h0At(S.W, ev.x || 0, ev.z || 0) - C.hAt(S.W, ev.x || 0, ev.z || 0))).col;
                if (ev.t === 'scoop') { API.puff({ x: ev.x, y: ev.y, z: ev.z }, 12, soil); API.sfx('mach'); S.shake = Math.max(S.shake || 0, 0.025); API.dirtyTerrain(); var m1 = C.stabilize(S.W, 3); if (m1 > 0) { API.toast('⚠ ¡Derrumbe de talud! Excava por escalones o con taludes más tendidos.', 'bad'); API.sfx('cave'); } }
                else if (ev.t === 'pour') { API.puff({ x: ev.x, y: ev.y, z: ev.z }, 14, soil); API.sfx('dig'); API.dirtyTerrain(); var m2 = C.stabilize(S.W, 3); if (m2 > 0) API.dirtyTerrain(); }
                else if (ev.t === 'full') API.toast('Cucharón lleno (' + M.cap.toFixed(1) + ' m³): levanta, gira y descarga con R.', 'warn');
            }
        } else kk = E.kk;
        E.kk = kk; E.model.setPose(M); E.model.setLoad(M.load, M.cap); E.model.operator.visible = E.mounted && UI.state.mode !== 'cabin';
        if (E.mounted) UI.update(S.cam, M, kk, C, S.W, dt);
        UI.draw(M, kk, C, S.W, E.mounted, dt, false);
        UI.setPrompt(near(S) ? 'Presiona E para subir a la excavadora' : '');
    }
    function onMouse(dx, dy) { var S = cur(); if (S && S.exc.mounted) UI.mouse(dx, dy); return !!(S && S.exc.mounted); }
    function onWheel(d) { var S = cur(); if (S && S.exc.mounted) { UI.wheel(d); return true; } return false; }
    function onBlocked(x, z, feet) {
        var S = cur(); if (!S || S.mount) return false; var M = S.exc.M, dx = x - M.x, dz = z - M.z, c = Math.cos(M.yaw), s = Math.sin(M.yaw), lx = dx * c - dz * s, lz = dx * s + dz * c;
        return Math.abs(lx) < 1.7 && Math.abs(lz) < 2.0 && feet < M.y + 2.2;
    }
    function onClose() { var S = API.S(); if (S) { S.mount = false; } API.ROOT() && API.ROOT().classList.remove('mounted'); }
    GM.hooks.world.push(onWorld); GM.hooks.frame.push(onFrame); GM.hooks.key.push(onKey); GM.hooks.mouse.push(onMouse); GM.hooks.wheel.push(onWheel); GM.hooks.blocked.push(onBlocked); GM.hooks.close.push(onClose);
    GM.exc = { mount: function () { var S = cur(); if (S) mount(S); }, dismount: function () { var S = cur(); if (S) dismount(S); }, state: function () { var S = cur(); return S && S.exc; }, near: function () { var S = cur(); return S ? near(S) : false; }, Sim: Sim, UI: UI };
})(typeof window !== 'undefined' ? window : globalThis);
