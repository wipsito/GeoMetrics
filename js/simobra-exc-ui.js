/**
 * Simulador de Obra 3D — CÁMARAS e INTERFAZ de la excavadora.
 *  · Cámaras: cabina (C), operación (ve el brazo y el cucharón) y exterior (órbita, zoom, seguimiento).
 *  · Panel de control minimalista (solo visible mientras se conduce) y aviso contextual «Presiona E…».
 */
(function (G) {
    'use strict';
    var D = G.SimObraExcModel.DIM, MODES = ['cabin', 'op', 'ext'], NAMES = { cabin: 'Cabina', op: 'Operación', ext: 'Exterior' };
    var st = { mode: 'cabin', lookYaw: 0, lookPitch: 0, oYaw: 0, oPitch: 0.38, oDist: 11, opDist: 7.5, pos: null, tgt: null };
    function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
    function reset(THREE) { st.mode = 'cabin'; st.lookYaw = st.lookPitch = 0; st.oYaw = 0; st.oPitch = 0.38; st.oDist = 11; st.opDist = 7.5; st.pos = new THREE.Vector3(); st.tgt = new THREE.Vector3(); st.init = false; }
    function cycle() { st.mode = MODES[(MODES.indexOf(st.mode) + 1) % MODES.length]; st.init = false; return st.mode; }
    function mouse(dx, dy) {
        if (st.mode === 'cabin') { st.lookYaw = clamp(st.lookYaw - dx * 0.0024, -2.2, 2.2); st.lookPitch = clamp(st.lookPitch - dy * 0.0024, -0.8, 0.7); }
        else if (st.mode === 'ext') { st.oYaw -= dx * 0.005; st.oPitch = clamp(st.oPitch + dy * 0.005, 0.04, 1.35); }
        else { st.oYaw -= dx * 0.004; st.oPitch = clamp(st.oPitch + dy * 0.004, 0.04, 1.2); }
    }
    function wheel(d) { if (st.mode === 'ext') st.oDist = clamp(st.oDist * (d > 0 ? 1.1 : 0.9), 5, 24); else if (st.mode === 'op') st.opDist = clamp(st.opDist * (d > 0 ? 1.1 : 0.9), 4, 14); }

    /* Coloca la cámara de three.js según el modo. Evita atravesar el terreno. */
    function update(cam, M, kk, C, W, dt) {
        var yu = M.yaw + M.swing, c = Math.cos(yu), s = Math.sin(yu), p = st.pos, t = st.tgt, k = 1 - Math.exp(-dt * 5), tx, ty, tz, dx, dy, dz;
        if (st.mode === 'cabin') {
            var ex = M.x + D.eye[0] * c + D.eye[2] * s, ez = M.z - D.eye[0] * s + D.eye[2] * c, ey = M.y + D.upperY + D.eye[1];
            cam.position.set(ex, ey, ez); cam.rotation.set(-0.1 + st.lookPitch, yu + st.lookYaw, 0); st.init = false; return;
        }
        if (st.mode === 'op') {
            var mx = (kk.P[0] + kk.T[0]) / 2, my = (kk.P[1] + kk.T[1]) / 2, mz = (kk.P[2] + kk.T[2]) / 2, F = kk.F, rx = -F[1], rz = F[0];       /* derecha del brazo */
            var a = Math.atan2(rz, rx) + st.oYaw, ch = Math.cos(st.oPitch - 0.2);
            dx = mx + Math.cos(a) * st.opDist * ch - F[0] * 0.5; dy = my + 1.2 + Math.sin(st.oPitch) * st.opDist * 0.6; dz = mz + Math.sin(a) * st.opDist * ch - F[1] * 0.5; tx = mx; ty = my; tz = mz;
        } else {
            var cx = M.x, cy = M.y + 1.7, cz = M.z, ang = M.yaw + st.oYaw, cp = Math.cos(st.oPitch);
            dx = cx + Math.sin(ang) * cp * st.oDist; dy = cy + Math.sin(st.oPitch) * st.oDist; dz = cz + Math.cos(ang) * cp * st.oDist; tx = cx; ty = cy; tz = cz;
        }
        if (!st.init) { p.set(dx, dy, dz); t.set(tx, ty, tz); st.init = true; }
        p.x += (dx - p.x) * k; p.y += (dy - p.y) * k; p.z += (dz - p.z) * k; t.x += (tx - t.x) * k; t.y += (ty - t.y) * k; t.z += (tz - t.z) * k;
        var floor = Math.max(C.hAt(W, p.x, p.z), M.y - 0.5) + 0.45; if (C.hAt(W, p.x, p.z) > M.y + 6) floor = C.hAt(W, p.x, p.z) + 0.45;
        cam.position.set(p.x, Math.max(p.y, C.hAt(W, p.x, p.z) + 0.45), p.z); cam.lookAt(t.x, t.y, t.z);
    }

    /* ---------- interfaz ---------- */
    var ROOTEL = null, panel = null, prompt = null, acc = 0;
    function ensureDom(root) {
        if (ROOTEL === root && panel && panel.parentNode) return; ROOTEL = root; var hud = root.querySelector('.sob-hud');
        panel = document.createElement('div'); panel.id = 'sobMach'; panel.className = 'sob-p sob-mach'; hud.appendChild(panel);
        prompt = document.createElement('div'); prompt.id = 'sobPrompt'; prompt.className = 'sob-prompt'; hud.appendChild(prompt);
    }
    function cardinal(deg) { return ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(((deg % 360) + 360) % 360 / 45) % 8]; }
    function draw(M, kk, C, W, mounted, dt, force) {
        acc += dt; if (!force && acc < 0.1) return; acc = 0; if (!panel) return;
        if (!mounted) { panel.style.display = 'none'; return; }
        panel.style.display = 'block';
        var kmh = Math.abs(M.speed) * 3.6, head = (-(M.yaw + M.swing) * 180 / Math.PI), open = clamp(Math.round((2.1 - M.bucket) / 2.45 * 100), 0, 100), nat = C.h0At(W, kk.T[0], kk.T[2]), cur = C.hAt(W, kk.T[0], kk.T[2]), depth = Math.max(0, nat - cur), pct = Math.round(M.load / M.cap * 100);
        panel.innerHTML = '<h4>🚜 EXCAVADORA ACTIVA</h4>'
            + '<div class="mrow"><span>Velocidad</span><b>' + kmh.toFixed(1) + ' km/h ' + (M.speed < -0.05 ? '↺ atrás' : (M.speed > 0.05 ? '↑' : '')) + '</b></div>'
            + '<div class="mrow"><span>Dirección</span><b>' + Math.round(((head % 360) + 360) % 360) + '° ' + cardinal(head) + '</b></div>'
            + '<div class="mrow"><span>Brazo principal</span><b>' + Math.round(M.boom * 180 / Math.PI) + '°</b></div>'
            + '<div class="mrow"><span>Brazo secundario</span><b>' + Math.round(M.stick * 180 / Math.PI) + '°</b></div>'
            + '<div class="mrow"><span>Cucharón abierto</span><b>' + open + ' %</b></div>'
            + '<div class="mrow"><span>Profundidad (diente)</span><b>' + depth.toFixed(2) + ' m</b></div>'
            + '<div class="mrow"><span>Material en cucharón</span><b>' + M.load.toFixed(2) + ' / ' + M.cap.toFixed(1) + ' m³</b></div><div class="mbar"><i style="width:' + pct + '%"></i></div>'
            + '<div class="mrow dim"><span>Excavado con máquina</span><b>' + W.excavM.toFixed(1) + ' m³</b></div>'
            + (M.msg ? '<div class="mmsg">⚠ ' + M.msg + '</div>' : '')
            + '<div class="mkeys"><b>W S</b> avanzar · <b>A D</b> girar · <b>Esp</b> freno<br><b>↑ ↓</b> brazo · <b>← →</b> brazo 2<br><b>Q R</b> cerrar/abrir cuchara · <b>Z X</b> girar torre<br><b>C</b> cámara (' + NAMES[st.mode] + ') · <b>E</b> bajar</div>';
    }
    function setPrompt(txt) { if (!prompt) return; if (txt) { prompt.textContent = txt; prompt.classList.add('show'); } else prompt.classList.remove('show'); }
    G.SimObraExcUI = { reset: reset, cycle: cycle, mouse: mouse, wheel: wheel, update: update, ensureDom: ensureDom, draw: draw, setPrompt: setPrompt, state: st, NAMES: NAMES };
})(typeof window !== 'undefined' ? window : globalThis);
