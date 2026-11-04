/* ============================================================
   GeoMetrics · Pantalla de carga con retroexcavadora
   Secuencia: el operador llega caminando → se sube a la cabina → enciende → sale manejando.
   - Se muestra al cargar/recargar la página y se oculta sola cuando la página terminó de cargar.
   - Tocar la retroexcavadora hace sonar la bocina.
   API:  GeoLoader.replay()   // volver a mostrarla (para probar)
   ============================================================ */
(() => {
  const root = document.getElementById('geo-loader');
  if (!root) return;
  const IMG = root.dataset.img || 'img/retroexcavadora.png';      // retroexcavadora con la cabina vacía
  const MIN_MS = 1500;                                           // tiempo mínimo visible
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  const BUCKET = `
  <svg class="gl-bucket" viewBox="0 0 770 296" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="glBkPaint" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD24A"/><stop offset=".55" stop-color="#F2A91A"/><stop offset="1" stop-color="#C98208"/></linearGradient>
      <linearGradient id="glBkInner" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#B87404"/><stop offset="1" stop-color="#E9A015"/></linearGradient>
      <linearGradient id="glBkSteel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E4E9EF"/><stop offset=".45" stop-color="#9AA3AE"/><stop offset="1" stop-color="#4E5661"/></linearGradient>
      <radialGradient id="glBkPin" cx=".35" cy=".35" r=".7"><stop offset="0" stop-color="#F2F5F8"/><stop offset=".6" stop-color="#8E98A4"/><stop offset="1" stop-color="#4A525C"/></radialGradient>
    </defs>
    <g class="gl-bk">
      <!-- tilt link from the arm's cylinder rod -->
      <path d="M604 219 L620 211" stroke="#3B3F46" stroke-width="7" stroke-linecap="round"/>
      <path d="M604 219 L620 211" stroke="#B9C1CB" stroke-width="3" stroke-linecap="round"/>
      <!-- side plate -->
      <path d="M598 207 L710 197 Q722 196 727 205 L757 274 Q761 285 750 287 L642 294 Q613 296 604 285 C589 266 586 230 598 207 Z"
            fill="url(#glBkPaint)" stroke="#4E3207" stroke-width="2.5" stroke-linejoin="round"/>
      <!-- inside of the bucket seen through the opening -->
      <path d="M712 205 Q718 204 721 210 L747 270 L700 268 C694 246 698 222 712 205 Z" fill="url(#glBkInner)" opacity=".85"/>
      <path d="M712 205 Q718 204 721 210 L747 270" fill="none" stroke="#FFE7A0" stroke-width="2" stroke-linecap="round" opacity=".9"/>
      <!-- reinforcing ribs + back curve shading -->
      <path d="M603 214 C592 236 594 266 608 283" fill="none" stroke="#B57303" stroke-width="7" stroke-linecap="round" opacity=".55"/>
      <path d="M652 203 C646 232 646 262 652 292" fill="none" stroke="#C88406" stroke-width="5" stroke-linecap="round"/>
      <path d="M652 203 C646 232 646 262 652 292" fill="none" stroke="#FFDD7A" stroke-width="1.5" stroke-linecap="round" transform="translate(-2 0)"/>
      <!-- spill guard (top edge) -->
      <path d="M597 208 L711 198 Q720 197 724 203" fill="none" stroke="#FFE38E" stroke-width="5" stroke-linecap="round"/>
      <path d="M597 213 L712 203" fill="none" stroke="#A86B04" stroke-width="2" stroke-linecap="round" opacity=".7"/>
      <!-- wear strip + cutting edge -->
      <path d="M607 288 Q616 293 642 292 L752 286" fill="none" stroke="url(#glBkSteel)" stroke-width="7" stroke-linecap="round"/>
      <path d="M752 286 L758 276" stroke="#C7CED6" stroke-width="5" stroke-linecap="round"/>
      ${[630, 660, 690, 720].map(x => `<circle cx="${x}" cy="${292 - (x - 630) * .045}" r="1.8" fill="#2E333A"/>`).join('')}
      <!-- scratches -->
      <path d="M672 226l14-3M680 248l18-4M666 268l10-2" stroke="#FFE7A0" stroke-width="1.4" stroke-linecap="round" opacity=".55"/>
      <!-- pivot boss -->
      <rect x="607" y="225" width="30" height="30" rx="7" fill="url(#glBkSteel)" stroke="#2B2F35" stroke-width="1.8"/>
      <circle cx="622" cy="240" r="9.5" fill="url(#glBkPin)" stroke="#2B2F35" stroke-width="1.5"/>
      <circle cx="622" cy="240" r="3.4" fill="#22262C"/>
      ${[[611, 229], [633, 229], [611, 251], [633, 251]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2" fill="#2E333A"/>`).join('')}
      <!-- link ear -->
      <circle cx="620" cy="211" r="5" fill="url(#glBkPin)" stroke="#2B2F35" stroke-width="1.4"/>
    </g>
  </svg>`;

  function city() {
    let s = '', x = 0, seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const cols = ['#00E5FF', '#FFB547', '#9D6BFF'];
    while (x < 2400) {
      const w = 40 + rnd() * 70, h = 70 + rnd() * 160;
      s += `<rect x="${x}" y="${300 - h}" width="${w}" height="${h}" fill="#0B1A3A" stroke="rgba(0,229,255,.25)"/>`;
      for (let wy = 300 - h + 12; wy < 290; wy += 18)
        for (let wx = x + 8; wx < x + w - 8; wx += 16)
          if (rnd() < .22) s += `<rect x="${wx}" y="${wy}" width="6" height="8" fill="${cols[Math.floor(rnd() * 3)]}" opacity="${(.35 + rnd() * .5).toFixed(2)}"/>`;
      x += w + 4 + rnd() * 14;
    }
    const crane = (cx, h, jib) => {
      const t = 300 - h; let g = `<g stroke="#00E5FF" stroke-width="1.6" fill="none" opacity=".75"><path d="M${cx - 8} 300V${t}M${cx + 8} 300V${t}"/>`;
      for (let y = t; y < 300; y += 20) g += `<path d="M${cx - 8} ${y}L${cx + 8} ${y + 20}M${cx + 8} ${y}L${cx - 8} ${y + 20}"/>`;
      return g + `<path d="M${cx - 40} ${t}H${cx + jib}M${cx - 40} ${t + 14}H${cx + jib}M${cx} ${t - 34}L${cx + jib} ${t}M${cx} ${t - 34}L${cx - 40} ${t}M${cx + jib * .75} ${t + 14}v60"/><rect x="${cx + jib * .75 - 10}" y="${t + 74}" width="20" height="14"/><circle cx="${cx}" cy="${t - 38}" r="4" fill="#FF5CA8" stroke="none"/></g>`;
    };
    s += crane(700, 280, 230) + crane(1780, 250, 200);
    return `<svg class="gl-city" viewBox="0 0 4800 300" preserveAspectRatio="none" aria-hidden="true"><g>${s}</g><g transform="translate(2400 0)">${s}</g></svg>`;
  }


  // seated operator + control levers, seen through the cab's side window (vector, so the arms and levers can move)
  const CABIN = `
  <svg class="gl-cabin" viewBox="0 0 770 296" preserveAspectRatio="none" aria-hidden="true">
    <defs><clipPath id="glPane"><rect x="362.5" y="64" width="44" height="136" rx="2"/></clipPath></defs>
    <g clip-path="url(#glPane)">
      <g class="gl-seated">
        <rect x="376" y="159" width="36" height="12" rx="5.5" fill="#2F5CB8"/>
        <rect x="399" y="163" width="11" height="34" rx="5" fill="#2A54A8"/>
        <g id="glArmFar"><line class="u" stroke="#2A56AE" stroke-width="6" stroke-linecap="round"/><line class="f" stroke="#2A56AE" stroke-width="5.5" stroke-linecap="round"/><circle class="h" r="3.3" fill="#E2B184"/></g>
      </g>
      <g id="glLeverFar"><line stroke="#2A2F38" stroke-width="2.4" stroke-linecap="round"/><circle r="3.4" fill="#C9D0D8" stroke="#2A2F38" stroke-width="1"/></g>
      <g class="gl-seated">
        <rect x="372" y="112" width="24" height="52" rx="8" fill="#3A74D8"/>
        <path d="M372 120 Q372 112 380 112 L392 112 Q396 112 396 120 L396 158 L372 158 Z" fill="#F07A2A"/>
        <rect x="372" y="134" width="24" height="4" fill="#E9F3CF"/><rect x="372" y="145" width="24" height="4" fill="#E9F3CF"/>
        <rect x="372" y="156" width="24" height="7" rx="3" fill="#244C9E"/>
        <circle cx="386" cy="98" r="12" fill="#F2C9A0"/>
        <circle cx="391.5" cy="97" r="1.7" fill="#2A2F3A"/>
        <path d="M389 104 q4 2.4 7 -.8" stroke="#9A5B3C" stroke-width="1.6" fill="none" stroke-linecap="round"/>
        <path d="M371.5 96 A15 14 0 0 1 401.5 96 Z" fill="#F4F7FA" stroke="#C9D3DD" stroke-width="1"/>
        <rect x="373" y="88" width="27" height="4.5" rx="1.5" fill="#8FD3F4"/>
        <path d="M398 92.5 h12 a2.4 2.4 0 0 1 0 4.8 h-12 Z" fill="#E4EAF0" stroke="#C9D3DD" stroke-width=".8"/>
      </g>
      <g id="glLever"><line stroke="#1E232B" stroke-width="2.8" stroke-linecap="round"/><circle r="4.2" fill="#F2F5F8" stroke="#1E232B" stroke-width="1.2"/></g>
      <g class="gl-seated" id="glArm"><line class="u" stroke="#3A74D8" stroke-width="6.5" stroke-linecap="round"/><line class="f" stroke="#3A74D8" stroke-width="6" stroke-linecap="round"/><circle class="h" r="3.6" fill="#F2C9A0"/></g>
    </g>
  </svg>`;

  // operator walking (original vector, same palette as the driver in the cab). Units = backhoe image px (770×296).
  const WALKER = `
  <svg class="gl-walk" viewBox="0 0 770 296" preserveAspectRatio="none" aria-hidden="true">
    <g class="gl-op">
      <g class="gl-bob">
        <g class="gl-leg gl-leg-b"><rect x="-6" y="-64" width="12" height="56" rx="5" fill="#244C9E"/><rect x="-6" y="-12" width="18" height="10" rx="4" fill="#2A2F3A"/></g>
        <g class="gl-arm gl-arm-b"><rect x="-4.5" y="-114" width="9" height="40" rx="4.5" fill="#2F64C8"/><circle cx="0" cy="-72" r="5" fill="#E9B98C"/></g>
        <rect x="-17" y="-120" width="34" height="60" rx="9" fill="#3A74D8"/>
        <path d="M-17 -112 Q-17 -120 -9 -120 L-3 -120 L-3 -60 L-17 -60 Z M17 -112 Q17 -120 9 -120 L3 -120 L3 -60 L17 -60 Z" fill="#F07A2A"/>
        <rect x="-17" y="-90" width="14" height="5" fill="#E9F3CF"/><rect x="3" y="-90" width="14" height="5" fill="#E9F3CF"/>
        <rect x="-17" y="-76" width="14" height="5" fill="#E9F3CF"/><rect x="3" y="-76" width="14" height="5" fill="#E9F3CF"/>
        <rect x="-17" y="-64" width="34" height="8" rx="3" fill="#244C9E"/>
        <g class="gl-leg gl-leg-f"><rect x="-6" y="-64" width="12" height="56" rx="5" fill="#2F5CB8"/><rect x="-6" y="-12" width="18" height="10" rx="4" fill="#353B48"/></g>
        <circle cx="2" cy="-134" r="16" fill="#F2C9A0"/>
        <circle cx="9" cy="-136" r="2.2" fill="#2A2F3A"/>
        <path d="M5 -127 q5 3 9 -1" stroke="#9A5B3C" stroke-width="2" fill="none" stroke-linecap="round"/>
        <path d="M-18 -138 A20 19 0 0 1 22 -138 Z" fill="#F4F7FA" stroke="#C9D3DD" stroke-width="1.2"/>
        <rect x="-16" y="-146" width="36" height="6" rx="2" fill="#8FD3F4"/>
        <path d="M14 -139 h18 a3 3 0 0 1 0 6 h-18 Z" fill="#E4EAF0" stroke="#C9D3DD" stroke-width="1"/>
        <g class="gl-arm gl-arm-f"><rect x="-4.5" y="-114" width="9" height="40" rx="4.5" fill="#3A74D8"/><circle cx="0" cy="-72" r="5" fill="#F2C9A0"/></g>
      </g>
    </g>
  </svg>`;

  const MSGS = { walk: 'EL OPERADOR LLEGA…', climb: 'SUBIENDO A LA CABINA…', start: 'ENCENDIENDO MOTOR…', load: 'COMPACTANDO EL SUELO…', ready: '¡LISTO PARA TRABAJAR!' };

  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');
  root.innerHTML = `
    <div class="gl-sky"></div>${city()}
    <div class="gl-ground" aria-hidden="true">
      <div class="gl-ruler"><span style="top:0">0.0 m</span><span style="top:50%">-2.5 m</span><span style="top:100%">-5.0 m</span></div>
      <div class="gl-layer gl-l1"><i></i><span class="gl-tag">TIERRA VEGETAL</span></div>
      <div class="gl-layer gl-l2"><i></i><span class="gl-tag">ARENA</span></div>
      <div class="gl-layer gl-l3"><i></i><span class="gl-tag">ARCILLA</span></div>
      <div class="gl-layer gl-l4"><i></i><span class="gl-tag" style="top:18%">ROCA</span></div>
    </div>
    <div class="gl-title"><h1>Geo<b>Metrics</b></h1><p>LABORATORIO VIRTUAL · INGENIERÍA CIVIL</p></div>
    <button class="gl-rig" type="button" aria-label="Tocar la bocina">
      <div class="gl-body">
        <div class="gl-beam"></div>
        <img src="${IMG}" alt="">
        ${CABIN}
        ${BUCKET}
        <span class="gl-wheel" style="left:34.4%;top:79.5%;width:14.5%;aspect-ratio:1"></span>
        <span class="gl-wheel" style="left:71.4%;top:85%;width:10.6%;aspect-ratio:1"></span>
        <span class="gl-beacon"></span>
      </div>
      ${WALKER}
    </button>
    <div class="gl-load">
      <div class="gl-track"><div class="gl-fill"></div></div>
      <div class="gl-row"><span class="gl-msg">${MSGS.walk}</span><b class="gl-pct">0%</b></div>
      <div class="gl-hint">TOCA LA RETROEXCAVADORA PARA TOCAR LA BOCINA</div>
    </div>
    <div class="gl-hud" style="left:20px;top:20px;border-width:2px 0 0 2px"></div>
    <div class="gl-hud" style="right:20px;top:20px;border-width:2px 2px 0 0"></div>
    <div class="gl-hud" style="left:20px;bottom:20px;border-width:0 0 2px 2px"></div>
    <div class="gl-hud" style="right:20px;bottom:20px;border-width:0 2px 2px 0"></div>`;

  const $ = s => root.querySelector(s);
  const rig = $('.gl-rig'), body = $('.gl-body'), fill = $('.gl-fill'), pctEl = $('.gl-pct'), msgEl = $('.gl-msg'), beam = $('.gl-beam');
  const op = $('.gl-op');
  const seated = [...root.querySelectorAll('.gl-seated')];
  const driver = { style: { set opacity(v) { seated.forEach(g => g.style.opacity = v); } },
    animate: (kf, o) => { const a = seated.map(g => g.animate(kf, o)); return a[0]; },
    getAnimations: () => seated.flatMap(g => g.getAnimations()) };

  // ---------- levers + arms (the operator drives with the levers) ----------
  const L1 = { g: $('#glLever'), p: { x: 399, y: 197 }, len: 40 }, L2 = { g: $('#glLeverFar'), p: { x: 393, y: 197 }, len: 35 };
  const A1 = { g: $('#glArm'), s: { x: 385, y: 121 } }, A2 = { g: $('#glArmFar'), s: { x: 381, y: 120 } };
  const setLine = (el, a, b) => { el.setAttribute('x1', a.x); el.setAttribute('y1', a.y); el.setAttribute('x2', b.x); el.setAttribute('y2', b.y); };
  function lever(L, th) {
    const k = { x: L.p.x + Math.sin(th) * L.len, y: L.p.y - Math.cos(th) * L.len };
    setLine(L.g.querySelector('line'), L.p, k); const c = L.g.querySelector('circle'); c.setAttribute('cx', k.x); c.setAttribute('cy', k.y);
    return k;
  }
  function arm(A, h) {          // 2-bone IK, elbow bends down/back
    const a = 22, b = 22, dx = h.x - A.s.x, dy = h.y - A.s.y, d = Math.min(Math.hypot(dx, dy), a + b - .5);
    const base = Math.atan2(dy, dx), off = Math.acos((a * a + d * d - b * b) / (2 * a * d));
    const e1 = { x: A.s.x + a * Math.cos(base + off), y: A.s.y + a * Math.sin(base + off) }, e2 = { x: A.s.x + a * Math.cos(base - off), y: A.s.y + a * Math.sin(base - off) };
    const e = e1.x < e2.x ? e1 : e2;                       // elbow toward the back of the cab
    const hand = { x: A.s.x + Math.cos(base) * d, y: A.s.y + Math.sin(base) * d };
    setLine(A.g.querySelector('.u'), A.s, e); setLine(A.g.querySelector('.f'), e, hand);
    const c = A.g.querySelector('.h'); c.setAttribute('cx', hand.x); c.setAttribute('cy', hand.y);
  }
  let th1 = -.35, th2 = -.3, ctrlOn = false, ctrlRaf = 0;
  function controls(t) {
    if (!ctrlOn) { ctrlRaf = 0; return; }
    t /= 1000;
    let g1 = -.35, g2 = -.3;
    if (root.classList.contains('gl-drive')) { g1 = .22; g2 = .2; }                                   // push both levers forward to drive
    else if (root.classList.contains('gl-engine')) { g1 = -.33 + .2 * Math.sin(t * 7); g2 = -.28 + .17 * Math.sin(t * 7 + 1.9); }   // working the bucket
    th1 += (g1 - th1) * .25; th2 += (g2 - th2) * .25;
    arm(A2, lever(L2, th2)); arm(A1, lever(L1, th1));
    ctrlRaf = requestAnimationFrame(controls);
  }
  function controlsOn() { if (!ctrlOn && !reduce) { ctrlOn = true; ctrlRaf = requestAnimationFrame(controls); } }
  function controlsOff() { ctrlOn = false; if (ctrlRaf) cancelAnimationFrame(ctrlRaf); ctrlRaf = 0; }
  controls(0);                                   /* una pasada para dejar la pose inicial */

  // ---------- particles ----------
  function spawn(cls, x, y, size, kf, ms) {
    const p = document.createElement('span'); p.className = cls;
    Object.assign(p.style, { width: size + 'px', height: size + 'px', left: x + 'px', top: y + 'px' }); root.appendChild(p);
    p.animate(kf, { duration: ms, easing: 'ease-out' }).finished.then(() => p.remove());
  }
  let rigRect = null, rigT = 0;
  const medirRig = () => { const n = performance.now(); if (!rigRect || n - rigT > 500) { rigRect = rig.getBoundingClientRect(); rigT = n; } return rigRect; };
  addEventListener('resize', () => { rigRect = null; });
  const puff = (big) => { const r = medirRig(); spawn('gl-puff', r.left + r.width * .565, r.top + r.height * .24, r.width * (big ? .06 : .03 + Math.random() * .02),
      [{ transform: 'translate(-50%,-50%) scale(.6)', opacity: big ? .8 : .55 }, { transform: `translate(${-30 - Math.random() * 25}px,${-40 - Math.random() * 25}px) scale(${big ? 2.8 : 2})`, opacity: 0 }], big ? 900 : 600); };
  const dust = () => { const r = medirRig(); spawn('gl-dust', r.left + r.width * .3, r.bottom - 4, r.width * (.015 + Math.random() * .03),
      [{ transform: 'translate(-50%,-50%)', opacity: .7 }, { transform: `translate(${-60 - Math.random() * 80}px,${-20 - Math.random() * 30}px) scale(1.8)`, opacity: 0 }], 700); };
  let fx = null;
  const startFx = () => { if (!reduce && !fx) fx = setInterval(() => { puff(); if (root.classList.contains('gl-drive')) { dust(); dust(); } }, 150); };
  const stopFx = () => { clearInterval(fx); fx = null; };

  // ---------- horn ----------
  let ctx;
  function honk() {
    try {
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const t = ctx.currentTime, g = ctx.createGain(); g.connect(ctx.destination);
      [0, .22].forEach(o => {
        g.gain.setValueAtTime(0, t + o); g.gain.linearRampToValueAtTime(.12, t + o + .02); g.gain.setValueAtTime(.12, t + o + .16); g.gain.linearRampToValueAtTime(0, t + o + .2);
        [392, 494].forEach(f => { const osc = ctx.createOscillator(); osc.type = 'square'; osc.frequency.value = f; osc.connect(g); osc.start(t + o); osc.stop(t + o + .21); });
      });
    } catch (e) { /* sin audio */ }
    const r = rig.getBoundingClientRect(), b = document.createElement('span'); b.className = 'gl-beep'; b.textContent = '¡PII-PII!';
    Object.assign(b.style, { left: r.left + r.width * .62 + 'px', top: r.top + 'px' }); root.appendChild(b);
    b.animate([{ transform: 'translate(-50%,0) scale(.5)', opacity: 0 }, { transform: 'translate(-50%,-30px) scale(1.1)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-60px)', opacity: 0 }], { duration: 900 }).finished.then(() => b.remove());
    body.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-8px) rotate(-1.5deg)' }, { transform: 'translateY(0)' }, { transform: 'translateY(-3px)' }, { transform: 'translateY(0)' }], { duration: 450 });
    beam.animate([{ opacity: 1 }, { opacity: .2 }, { opacity: 1 }, { opacity: .2 }, { opacity: 1 }], { duration: 450 });
  }
  rig.addEventListener('click', honk);

  // ---------- operator: walk in, climb into the cab ----------
  const opAt = (x, y = 296, s = 1) => `translate(${x}px, ${y}px) scale(${s})`;
  async function operatorBoards() {
    const r = rig.getBoundingClientRect(), k = 770 / r.width;
    const startX = Math.max(-(r.left * k) - 40, -420);                      // just off the left edge of the screen
    root.classList.add('gl-walking');
    msgEl.textContent = MSGS.walk;
    await op.animate([{ transform: opAt(startX), opacity: 1 }, { transform: opAt(300), opacity: 1 }], { duration: 700, easing: 'linear', fill: 'forwards' }).finished;
    root.classList.remove('gl-walking');
    msgEl.textContent = MSGS.climb;
    // step up onto the machine and into the cab
    const climb = op.animate([
      { transform: opAt(300), opacity: 1 },
      { transform: opAt(318, 262, .97), opacity: 1, offset: .35 },
      { transform: opAt(346, 222, .9), opacity: 1, offset: .7 },
      { transform: opAt(372, 206, .82), opacity: 0 }], { duration: 300, easing: 'ease-in-out', fill: 'forwards' });
    await sleep(190);
    driver.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 160, fill: 'forwards' });
    await climb.finished;
    body.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(2px)' }, { transform: 'translateY(0)' }], { duration: 160 });   // door shuts
  }

  // ---------- progress ----------
  let shown = 0, loaded = false, t0 = 0, raf = 0, leaving = false, ready = false;
  let ultPct = -1;
  function setPct(p) {
    shown = p;
    fill.style.transform = 'scaleX(' + (p / 100).toFixed(4) + ')';
    var n = Math.round(p);
    if (n !== ultPct) { ultPct = n; pctEl.textContent = n + '%'; }
  }
  function loop() {
    const elapsed = performance.now() - t0;
    const target = loaded ? 100 : Math.min(92, 10 + elapsed / 30);
    const cap = Math.min(100, elapsed / MIN_MS * 100);
    setPct(shown + (Math.min(target, cap) - shown) * .2);
    if (shown > 98.5 && loaded && ready && !leaving) { setPct(100); leave(); return; }
    raf = requestAnimationFrame(loop);
  }

  async function enter() {
    root.classList.remove('gl-out', 'gl-drive', 'gl-engine', 'gl-raise'); root.style.display = '';
    rig.getAnimations().forEach(a => a.cancel()); op.getAnimations().forEach(a => a.cancel()); driver.getAnimations().forEach(a => a.cancel());
    driver.style.opacity = 0; leaving = false; ready = false; setPct(0); t0 = performance.now();
    rigRect = null; controlsOn();
    raf = requestAnimationFrame(loop);
    if (reduce) { driver.style.opacity = 1; op.style.opacity = 0; ready = true; return; }
    await operatorBoards();
    // engine on
    msgEl.textContent = MSGS.start;
    root.classList.add('gl-engine'); puff(true); setTimeout(() => puff(true), 120); startFx();
    await sleep(120);
    msgEl.textContent = MSGS.load;
    ready = true;
  }
  async function leave() {
    leaving = true; cancelAnimationFrame(raf);
    msgEl.textContent = MSGS.ready;
    root.classList.add('gl-drive', 'gl-raise');
    if (!reduce) await rig.animate([{ transform: 'translateX(-50%)' }, { transform: 'translateX(calc(50vw + 2%))' }], { duration: 2400, easing: 'cubic-bezier(.5,0,.85,.75)', fill: 'forwards' }).finished;   // slow, heavy roll-out
    stopFx(); controlsOff();                       /* el muñeco deja de calcularse al irse la carga */
    root.classList.add('gl-out'); lock(false);
    setTimeout(() => { root.style.display = 'none'; root.classList.remove('gl-drive', 'gl-engine', 'gl-raise'); }, 320);
  }

  function markLoaded() { loaded = true; }

  /* ---------- integracion con GeoMetrics ----------
     No se va hasta que la pagina termino de cargar Y la app acabo de arrancar
     (clases gm-restoring / gm-booting). Tope de seguridad: TOPE_MS. */
  const TOPE_MS = 15000;
  const arrancando = () => document.documentElement.classList.contains('gm-restoring')
                        || document.body.classList.contains('gm-booting');
  function esperarApp() {
    const t = performance.now();
    (function revisa() {
      if (!arrancando() || performance.now() - t > TOPE_MS) { markLoaded(); return; }
      setTimeout(revisa, 120);
    })();
  }
  if (document.readyState === 'complete') setTimeout(esperarApp, 300);
  else addEventListener('load', function () { setTimeout(esperarApp, 200); });
  setTimeout(markLoaded, TOPE_MS);                     /* red de seguridad */

  /* bloquear el scroll de la pagina mientras se ve la carga */
  const lock = v => { try { document.documentElement.classList.toggle('gl-lock', v); } catch (e) {} };
  lock(true);

  enter();

  window.GeoLoader = {
    replay() { cancelAnimationFrame(raf); stopFx(); loaded = false; lock(true); enter(); setTimeout(markLoaded, 600); },
    hide() { if (!leaving) { loaded = true; setPct(100); leave(); } },
    honk
  };
})();
