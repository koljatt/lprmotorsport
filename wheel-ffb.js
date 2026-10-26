/* Steering-wheel input and basic force feedback (FFB).
 *
 * Input: any non-standard Gamepad (Fanatec, Logitech, Thrustmaster, ...) is
 * treated as a wheel. Axes are calibrated once and stored in localStorage.
 *
 * FFB: Fanatec wheel bases over WebHID (Chrome/Edge desktop). The base takes
 * 7-byte output reports; the encoding follows the open-source Linux driver
 * hid-fanatecff (gotzl/hid-fanatecff, hid-ftecff.c). Slot 0 is a constant
 * force, slot 2 the base's own damper. Everything the game feels is computed
 * here as one constant force, updated at the presentation rate.
 */
(() => {
  'use strict';
  const FANATEC_VENDOR = 0x0eb7;
  const STORAGE_KEY = 'lpr-wheel-settings-v1';
  const ALIGN_PEAK = 0.373; // max of tanh(s)*(1-s/2.5)^1.5, see trailShape()

  const defaults = {
    steerPad: '', steerAxis: 0, steerInvert: false,
    baseRange: 900,          // degrees lock-to-lock the base reports over the full axis
    lock: 240,               // degrees lock-to-lock that equal full lock in the car
    setBaseRange: true,      // write `lock` to the base when FFB connects
    gas: null, brake: null,  // {pad, axis, rest, full}
    strength: 0.4,           // 0..1 of the base's maximum torque
    damper: 0.25,            // 0..1, base hardware damper
    roadFeel: 0.5,           // kerbs, grass, impacts
    invertForce: false
  };

  /* ---------- pure helpers (also used by tests) ---------- */
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // Pneumatic trail falls to zero as the front tyres slide (Fiala-type shape).
  // s = Cf*|alpha|/Flim, recovered from the tanh tyre model as atanh(|Fy|/Flim).
  function trailShape(s) { return Math.tanh(s) * Math.pow(Math.max(0, 1 - s / 2.5), 1.5); }

  /** Steering torque request, -1..1, positive = turn the wheel to the right. */
  function computeTorque(car, st, cfg, dt) {
    const speed = Math.max(0, car.vx || 0);
    const fy = car.frontLateralForce || 0;
    const limit = Math.max(1, car.frontGripLimit || 1);
    if (speed < 0.5 && car.frontGripLimit > 0) st.refLimit = Math.max(st.refLimit || 0, car.frontGripLimit);
    const ref = st.refLimit || limit;
    const u = clamp(Math.abs(fy) / limit, 0, 0.999);
    const s = Math.atanh(u);
    // Self-aligning torque: opposes the lateral force (turning right gives Fy>0, wheel pulls left).
    // Pneumatic trail collapses at the limit; caster (mechanical trail) keeps some weight.
    const aligning = -Math.sign(fy) * (limit / ref) * (0.85 * trailShape(s) / ALIGN_PEAK + 0.15 * u);
    const atSpeed = clamp((speed - 1) / 3, 0, 1);
    // Light centring at walking pace, where the tyre model gives no lateral force.
    const parking = -0.12 * clamp(car.steer || 0, -1, 1) * (1 - atSpeed);

    // Road feel: left/right front load difference (kerbs), grass rumble, impacts.
    let road = 0;
    const w = car.suspension?.wheels;
    if (w && w[0] && w[1]) {
      const diff = (w[0].load - w[1].load) / Math.max(1, ref);
      st.loadDiffAvg = st.loadDiffAvg === undefined ? diff : st.loadDiffAvg + (diff - st.loadDiffAvg) * clamp(dt * 4, 0, 1);
      road += clamp((diff - st.loadDiffAvg) * 1.5, -0.35, 0.35);
    }
    if ((car.grassFraction || 0) > 0.05 && speed > 2) {
      st.phase = (st.phase || 0) + dt * 2 * Math.PI * 11;
      road += 0.07 * car.grassFraction * Math.min(1, speed / 15) * Math.sin(st.phase);
    }
    const impactKey = `${car.impactSpeed || 0}:${car.impactEnergy || 0}`;
    if (st.impactKey !== undefined && impactKey !== st.impactKey && (car.impactSpeed || 0) > 0.3) {
      st.jolt = clamp(car.impactSpeed / 6, 0.2, 1);
      st.joltT = 0;
    }
    st.impactKey = impactKey;
    if (st.jolt) {
      st.joltT += dt;
      road += st.jolt * Math.exp(-st.joltT * 14) * Math.sin(st.joltT * 2 * Math.PI * 9);
      if (st.joltT > 0.35) st.jolt = 0;
    }

    const raw = aligning * atSpeed * 0.85 + parking + road * cfg.roadFeel;
    return clamp(raw * cfg.strength, -1, 1);
  }

  // Constant force, high-resolution encoding (CSL DD, DD1/DD2, ClubSport DD).
  function constantCmd(force) {
    const level = Math.round(clamp(force, -1, 1) * 0x7fff);
    if (level === 0) return [0x03, 0x08, 0, 0, 0, 0, 0];
    const v = level + 0x8000;
    return [0x01, 0x08, v & 0xff, (v >> 8) & 0xff, 0, 0, 0x01];
  }
  function damperCmd(amount) {
    const k = Math.round(clamp(amount, 0, 1) * 15);
    return k === 0 ? [0x23, 0x0c, 0, 0, 0, 0, 0xff] : [0x21, 0x0c, k, 0, k, 0, 0xff];
  }
  function rangeCmds(degrees) {
    const r = Math.round(clamp(degrees, 90, 2520));
    return [[0xf5, 0, 0, 0, 0, 0, 0], [0xf8, 0x09, 0x01, 0x06, 0x01, 0, 0], [0xf8, 0x81, r & 0xff, (r >> 8) & 0xff, 0, 0, 0]];
  }
  const STOP_ALL = [0xf3, 0, 0, 0, 0, 0, 0];
  // Same slot reset the Linux driver performs on start-up.
  const SLOT_RESET = [[0x03, 0x08, 0, 0, 0, 0, 0], [0x13, 0x0b, 0, 0, 0, 0, 0], [0x23, 0x0c, 0, 0, 0, 0, 0xff], [0x33, 0x0c, 0, 0, 0, 0, 0xff], [0x43, 0x0c, 0, 0, 0, 0, 0xff]];

  function pedalValue(p, pads) {
    if (!p) return 0;
    const pad = pads.find(g => g && g.id === p.pad);
    const v = pad?.axes[p.axis];
    if (v === undefined || p.full === p.rest) return 0;
    const x = clamp((v - p.rest) / (p.full - p.rest), 0, 1);
    return x < 0.02 ? 0 : x;
  }
  function steerValue(cfg, pads) {
    const pad = pads.find(g => g && (cfg.steerPad ? g.id === cfg.steerPad : isWheelPad(g)));
    const v = pad?.axes[cfg.steerAxis] || 0;
    return clamp(v * (cfg.steerInvert ? -1 : 1) * cfg.baseRange / cfg.lock, -1, 1);
  }
  function isWheelPad(pad) {
    return !!pad && (pad.mapping !== 'standard' || /0eb7|fanatec|wheel/i.test(pad.id));
  }

  const core = { computeTorque, constantCmd, damperCmd, rangeCmds, trailShape, pedalValue, steerValue, isWheelPad, defaults, STOP_ALL, SLOT_RESET };
  if (typeof module !== 'undefined' && module.exports) { module.exports = core; return; }

  /* ---------- browser ---------- */
  let cfg = { ...defaults };
  try { Object.assign(cfg, JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}); } catch {}
  const save = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch {} };
  const fi = () => (window.LPRI18n?.language || 'fi') === 'fi';
  const L = (finnish, english) => fi() ? finnish : english;
  const pads = () => (navigator.getGamepads ? Array.from(navigator.getGamepads()) : []).filter(Boolean);

  /* --- FFB device --- */
  const hid = { device: null, reportId: 0, busy: false, queued: null, last: null, lastSend: 0, state: {}, lastUpdate: 0, current: 0 };

  function findOutputReport(device) {
    for (const c of device.collections || []) {
      for (const r of c.outputReports || []) {
        const bits = (r.items || []).reduce((sum, it) => sum + it.reportSize * it.reportCount, 0);
        if (bits === 56) return r.reportId;
      }
    }
    for (const c of device.collections || []) if (c.outputReports?.length) return c.outputReports[0].reportId;
    return null;
  }
  async function writeRaw(bytes) {
    if (!hid.device?.opened) return;
    await hid.device.sendReport(hid.reportId, new Uint8Array(bytes));
  }
  // Latest-wins queue so a slow USB write never builds up a backlog of stale forces.
  function send(bytes) {
    hid.queued = bytes;
    if (hid.busy) return;
    hid.busy = true;
    (async () => {
      while (hid.queued) {
        const next = hid.queued; hid.queued = null;
        try { await writeRaw(next); } catch (error) { console.warn('FFB write failed', error); disconnect(L('Yhteys rattiin katkesi.', 'Lost connection to the wheel.')); break; }
      }
      hid.busy = false;
    })();
  }
  async function sendNow(bytes) { try { await writeRaw(bytes); } catch (error) { console.warn('FFB write failed', error); } }

  async function connect() {
    if (!navigator.hid) { setStatus(L('Selain ei tue WebHID:tä. Käytä Chromea tai Edgeä tietokoneella.', 'This browser has no WebHID. Use Chrome or Edge on a computer.')); return; }
    let devices;
    try { devices = await navigator.hid.requestDevice({ filters: [{ vendorId: FANATEC_VENDOR }] }); }
    catch (error) { setStatus(String(error.message || error)); return; }
    const device = devices.find(d => findOutputReport(d) !== null);
    if (!device) { setStatus(devices.length ? L('Valitulla laitteella ei ole voimapalautteen raporttia. Valitse rattikanta.', 'The selected device has no force-feedback report. Pick the wheel base.') : L('Laitetta ei valittu.', 'No device selected.')); return; }
    try { if (!device.opened) await device.open(); }
    catch (error) { setStatus(L('Rattikantaa ei voitu avata: ', 'Could not open the wheel base: ') + (error.message || error) + L(' Sulje muut ohjelmat (esim. FanaLab) ja yritä uudelleen.', ' Close other apps (e.g. FanaLab) and try again.')); return; }
    hid.device = device;
    hid.reportId = findOutputReport(device);
    for (const cmd of SLOT_RESET) await sendNow(cmd);
    if (cfg.setBaseRange) { for (const cmd of rangeCmds(cfg.lock)) await sendNow(cmd); cfg.baseRange = cfg.lock; save(); }
    await sendNow(damperCmd(cfg.damper));
    hid.state = {}; hid.last = null; hid.current = 0;
    setStatus(L(`Voimapalaute päällä: ${device.productName}.`, `Force feedback on: ${device.productName}.`));
    render();
  }
  function disconnect(message) {
    const device = hid.device;
    hid.device = null; hid.queued = null;
    if (device?.opened) writeRawOn(device, STOP_ALL).finally(() => device.close().catch(() => {}));
    if (message) setStatus(message);
    render();
  }
  async function writeRawOn(device, bytes) { try { await device.sendReport(hid.reportId, new Uint8Array(bytes)); } catch {} }

  function stopForce() {
    if (!hid.device) return;
    hid.current = 0;
    if (hid.last && hid.last[0] !== 0x03) { hid.last = constantCmd(0); send(hid.last); }
  }

  /** Called once per physics tick (dt = fixed step). `active` = driving, not in a menu. */
  function updateFfb(car, active, step) {
    const now = performance.now();
    const dt = step || Math.min(0.05, hid.lastUpdate ? (now - hid.lastUpdate) / 1000 : 1 / 60);
    hid.lastUpdate = now;
    if (!hid.device) return;
    if (!active || test.until > now) { if (test.until <= now) stopForce(); return; }
    let target = computeTorque(car, hid.state, cfg, dt);
    if (cfg.invertForce) target = -target;
    // Slew limit: a DD base will happily deliver a step, the driver's wrists will not.
    hid.current += clamp(target - hid.current, -dt * 12, dt * 12);
    const cmd = constantCmd(hid.current);
    if (!hid.last || cmd.some((b, i) => b !== hid.last[i]) || now - hid.lastSend > 250) {
      hid.last = cmd; hid.lastSend = now; send(cmd);
    }
  }
  // Watchdog: background tabs stop animation frames; never leave a force applied.
  setInterval(() => { if (hid.device && performance.now() - hid.lastUpdate > 150) stopForce(); }, 100);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopForce(); });
  window.addEventListener('blur', stopForce);
  window.addEventListener('pagehide', () => { if (hid.device) writeRawOn(hid.device, STOP_ALL); });
  navigator.hid?.addEventListener('disconnect', e => { if (e.device === hid.device) disconnect(L('Rattikanta irrotettiin.', 'Wheel base disconnected.')); });

  const test = { until: 0 };
  async function testPulse(direction) {
    if (!hid.device) return;
    test.until = performance.now() + 450;
    const f = direction * 0.25 * (cfg.invertForce ? -1 : 1);
    await sendNow(constantCmd(f));
    setTimeout(() => { sendNow(constantCmd(0)); hid.last = constantCmd(0); hid.current = 0; }, 400);
  }

  /* --- input --- */
  function read() {
    const list = pads();
    return {
      steer: steerValue(cfg, list),
      gas: pedalValue(cfg.gas, list),
      brake: pedalValue(cfg.brake, list),
      analog: true, wheel: true
    };
  }
  const calibrated = () => !!(cfg.gas && cfg.brake);

  /* --- calibration --- */
  let calibration = null;
  function snapshot() { return pads().map(p => ({ id: p.id, axes: Array.from(p.axes) })); }
  function startPedal(which) {
    const base = snapshot();
    if (!base.length) { setStatus(L('Ohjainta ei löydy. Liikuta rattia tai poljinta, jotta selain havaitsee sen.', 'No controller found. Move the wheel or a pedal so the browser detects it.')); return; }
    calibration = { which, base, best: null, ends: performance.now() + 3500 };
    setStatus(which === 'gas' ? L('Paina KAASU pohjaan ja vapauta…', 'Press the THROTTLE fully and release…') : L('Paina JARRU pohjaan ja vapauta…', 'Press the BRAKE fully and release…'));
    tickCalibration();
  }
  function tickCalibration() {
    if (!calibration) return;
    const other = calibration.which === 'gas' ? cfg.brake : cfg.gas;
    const steerPadId = (pads().find(p => cfg.steerPad ? p.id === cfg.steerPad : isWheelPad(p)) || {}).id;
    for (const pad of snapshot()) {
      const base = calibration.base.find(b => b.id === pad.id);
      if (!base) continue;
      pad.axes.forEach((v, axis) => {
        if (pad.id === steerPadId && axis === cfg.steerAxis) return;
        if (other && other.pad === pad.id && other.axis === axis) return;
        const delta = Math.abs(v - base.axes[axis]);
        if (!calibration.best || delta > calibration.best.delta) calibration.best = { pad: pad.id, axis, rest: base.axes[axis], full: v, delta };
        else if (calibration.best.pad === pad.id && calibration.best.axis === axis && delta >= calibration.best.delta) calibration.best.full = v;
      });
    }
    if (performance.now() < calibration.ends) { requestAnimationFrame(tickCalibration); return; }
    const { which, best } = calibration;
    calibration = null;
    if (!best || best.delta < 0.3) { setStatus(L('Poljinliikettä ei havaittu. Yritä uudelleen.', 'No pedal movement detected. Try again.')); return; }
    cfg[which] = { pad: best.pad, axis: best.axis, rest: best.rest, full: best.full };
    save();
    setStatus(L(`${which === 'gas' ? 'Kaasu' : 'Jarru'} tallennettu (akseli ${best.axis}).`, `${which === 'gas' ? 'Throttle' : 'Brake'} saved (axis ${best.axis}).`));
    render();
  }
  let steerCal = null;
  function steerCalibration() {
    if (!steerCal) {
      steerCal = snapshot();
      if (!steerCal.length) { steerCal = null; setStatus(L('Ohjainta ei löydy.', 'No controller found.')); return; }
      setStatus(L('Käännä rattia tasan 90° oikealle ja paina "Valmis".', 'Turn the wheel exactly 90° right and press "Done".'));
      render(); return;
    }
    let best = null;
    for (const pad of snapshot()) {
      const base = steerCal.find(b => b.id === pad.id);
      if (!base) continue;
      pad.axes.forEach((v, axis) => { const d = v - base.axes[axis]; if (!best || Math.abs(d) > Math.abs(best.d)) best = { pad: pad.id, axis, d }; });
    }
    steerCal = null;
    if (!best || Math.abs(best.d) < 0.02) { setStatus(L('Ohjausliikettä ei havaittu.', 'No steering movement detected.')); render(); return; }
    cfg.steerPad = best.pad; cfg.steerAxis = best.axis; cfg.steerInvert = best.d < 0;
    cfg.baseRange = Math.round(2 * 90 / Math.abs(best.d));
    save();
    setStatus(L(`Ohjaus tallennettu: akseli ${best.axis}, kannan kääntöalue ${cfg.baseRange}°.`, `Steering saved: axis ${best.axis}, base range ${cfg.baseRange}°.`));
    render();
  }

  /* --- UI --- */
  let dialog, statusLine = '';
  function setStatus(text) { statusLine = text; const el = dialog?.querySelector('[data-w=status]'); if (el) el.textContent = text; }
  function pct(v) { return `${Math.round(v * 100)} %`; }
  function render() {
    if (!dialog) return;
    const wheel = pads().find(isWheelPad);
    const ffb = hid.device;
    dialog.innerHTML = `
      <div class="dialog-head"><h2>${L('RATTI', 'WHEEL')}</h2><button class="icon-button close" type="button" data-w="close" aria-label="${L('Sulje', 'Close')}">×</button></div>
      <p class="device-status">${wheel ? `${L('Havaittu', 'Detected')}: ${escapeHtml(wheel.id)}` : L('Rattia ei havaittu. Kytke ratti ja käännä sitä hieman.', 'No wheel detected. Plug it in and turn it a little.')}</p>
      <div class="wheel-live"><label>${L('Ohjaus', 'Steering')}<meter data-w="m-steer" min="-1" max="1" value="0"></meter></label><label>${L('Kaasu', 'Throttle')}<meter data-w="m-gas" min="0" max="1" value="0"></meter></label><label>${L('Jarru', 'Brake')}<meter data-w="m-brake" min="0" max="1" value="0"></meter></label></div>
      <div class="calibration">
        <div class="calibration-step"><span>1</span><div><strong>${L('Kaasu', 'Throttle')}</strong><small>${cfg.gas ? L('Kalibroitu', 'Calibrated') : L('Ei kalibroitu', 'Not calibrated')}</small></div><button type="button" data-w="cal-gas" class="${cfg.gas ? 'saved' : ''}">${L('Kalibroi', 'Calibrate')}</button></div>
        <div class="calibration-step"><span>2</span><div><strong>${L('Jarru', 'Brake')}</strong><small>${cfg.brake ? L('Kalibroitu', 'Calibrated') : L('Ei kalibroitu', 'Not calibrated')}</small></div><button type="button" data-w="cal-brake" class="${cfg.brake ? 'saved' : ''}">${L('Kalibroi', 'Calibrate')}</button></div>
        <div class="calibration-step"><span>3</span><div><strong>${L('Ohjaus (valinnainen)', 'Steering (optional)')}</strong><small>${L('Akseli', 'Axis')} ${cfg.steerAxis} · ${L('kanta', 'base')} ${cfg.baseRange}°</small></div><button type="button" data-w="cal-steer">${steerCal ? L('Valmis', 'Done') : L('Kalibroi', 'Calibrate')}</button></div>
      </div>
      <div class="wheel-settings">
        <label>${L('Ratin kääntöalue autossa', 'Wheel rotation in the car')} <output>${cfg.lock}°</output><input type="range" data-w="lock" min="120" max="540" step="10" value="${cfg.lock}"></label>
        <label>${L('Kannan kääntöalue', 'Base rotation range')} <output>${cfg.baseRange}°</output><input type="range" data-w="baseRange" min="90" max="2520" step="10" value="${cfg.baseRange}"></label>
      </div>
      <h3>${L('Voimapalaute', 'Force feedback')}</h3>
      <p class="hint">${L('Fanatec-rattikannat, Chrome tai Edge tietokoneella. Kokeellinen: aloita pienellä voimalla.', 'Fanatec wheel bases, Chrome or Edge on a computer. Experimental: start with low strength.')}</p>
      <div class="wheel-buttons">
        ${ffb ? `<button type="button" data-w="disconnect">${L('Katkaise voimapalaute', 'Disconnect force feedback')}</button><button type="button" data-w="test-left">${L('Testi: vasen', 'Test: left')}</button><button type="button" data-w="test-right">${L('Testi: oikea', 'Test: right')}</button>`
              : `<button type="button" data-w="connect" ${navigator.hid ? '' : 'disabled'}>${L('Yhdistä voimapalaute', 'Connect force feedback')}</button>`}
      </div>
      <div class="wheel-settings">
        <label>${L('Voimakkuus', 'Strength')} <output>${pct(cfg.strength)}</output><input type="range" data-w="strength" min="0" max="1" step="0.05" value="${cfg.strength}"></label>
        <label>${L('Vaimennus', 'Damping')} <output>${pct(cfg.damper)}</output><input type="range" data-w="damper" min="0" max="1" step="0.05" value="${cfg.damper}"></label>
        <label>${L('Tien tuntuma', 'Road feel')} <output>${pct(cfg.roadFeel)}</output><input type="range" data-w="roadFeel" min="0" max="1" step="0.05" value="${cfg.roadFeel}"></label>
        <label class="check"><input type="checkbox" data-w="invertForce" ${cfg.invertForce ? 'checked' : ''}> ${L('Käännä voiman suunta (jos testi vetää väärään suuntaan)', 'Invert force direction (if the test pulls the wrong way)')}</label>
        <label class="check"><input type="checkbox" data-w="setBaseRange" ${cfg.setBaseRange ? 'checked' : ''}> ${L('Aseta kannan kääntöalue automaattisesti', 'Set the base rotation range automatically')}</label>
      </div>
      <p class="calibration-status" data-w="status" role="status">${escapeHtml(statusLine)}</p>`;
  }
  function escapeHtml(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); }
  function liveMeters() {
    if (!dialog?.open) return;
    const input = read();
    const set = (k, v) => { const m = dialog.querySelector(`[data-w=${k}]`); if (m) m.value = v; };
    set('m-steer', input.steer); set('m-gas', input.gas); set('m-brake', input.brake);
    requestAnimationFrame(liveMeters);
  }

  function initUi() {
    const topbar = document.querySelector('.topbar');
    if (!topbar || document.querySelector('#wheel-button')) return;
    const button = document.createElement('button');
    button.id = 'wheel-button'; button.className = 'icon-button'; button.type = 'button';
    button.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.4"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><path d="M3.5 11h6M14.5 11h6M12 14.4V21" stroke="currentColor" stroke-width="2.4"/></svg>';
    const updateLabel = () => button.setAttribute('aria-label', L('Ratti ja voimapalaute', 'Wheel and force feedback'));
    updateLabel();
    topbar.querySelector('#leaderboard-button')?.before(button);
    // Only useful where a USB wheel can exist.
    button.hidden = !matchMedia('(pointer: fine)').matches && !pads().some(isWheelPad);
    window.addEventListener('gamepadconnected', e => { if (isWheelPad(e.gamepad)) button.hidden = false; render(); });

    dialog = document.createElement('dialog');
    dialog.id = 'wheel-dialog';
    dialog.setAttribute('aria-label', 'Ratti / Wheel');
    document.body.append(dialog);
    button.addEventListener('click', () => { render(); dialog.showModal(); liveMeters(); });
    dialog.addEventListener('close', () => { calibration = null; steerCal = null; });
    dialog.addEventListener('click', e => {
      const key = e.target.closest('[data-w]')?.dataset.w;
      if (key === 'close') dialog.close();
      else if (key === 'cal-gas') startPedal('gas');
      else if (key === 'cal-brake') startPedal('brake');
      else if (key === 'cal-steer') steerCalibration();
      else if (key === 'connect') connect();
      else if (key === 'disconnect') disconnect(L('Voimapalaute pois.', 'Force feedback off.'));
      else if (key === 'test-left') testPulse(-1);
      else if (key === 'test-right') testPulse(1);
    });
    dialog.addEventListener('input', e => {
      const key = e.target.dataset.w;
      if (!(key in cfg)) return;
      cfg[key] = e.target.type === 'checkbox' ? e.target.checked : Number(e.target.value);
      const out = e.target.parentElement.querySelector('output');
      if (out) out.textContent = ['lock', 'baseRange'].includes(key) ? `${cfg[key]}°` : pct(cfg[key]);
      if (key === 'damper') send(damperCmd(cfg.damper));
      if (key === 'lock' && hid.device && cfg.setBaseRange) { for (const cmd of rangeCmds(cfg.lock)) send(cmd); cfg.baseRange = cfg.lock; }
      save();
    });
    dialog.addEventListener('change', e => { if (['lock', 'setBaseRange'].includes(e.target.dataset.w)) render(); });
    for (const b of document.querySelectorAll('[data-language]')) b.addEventListener('click', () => setTimeout(() => { updateLabel(); render(); }, 0));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initUi); else initUi();

  window.LPRWheel = {
    isWheel: isWheelPad, read, calibrated, updateFfb,
    get dialogOpen() { return !!dialog?.open; },
    get ffbConnected() { return !!hid.device; },
    label: () => L('RATTI', 'WHEEL') + (hid.device ? ' · FFB' : '') + (calibrated() ? '' : L(' · KALIBROI POLKIMET 🛞', ' · CALIBRATE PEDALS 🛞'))
  };
})();
