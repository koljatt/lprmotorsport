/* EV instrument cluster for the driver view: motor speed, road speed,
 * estimated battery power (drive / regen) and tyre-grip use.
 * Presentation only: it reads the car after each render and never writes
 * anything back into the physics, timing or verification state. */
(() => {
  'use strict';
  const W = 640, H = 480, deg = Math.PI / 180;
  const MAIN = { x: 400, y: 262, r: 200 }, SUB = { x: 124, y: 362, r: 100 };
  const RPM = { max: 8, red: 7, a0: 100 * deg, a1: 325 * deg };   // ×1000 r/min, motor limit 7000
  const KW = { min: -20, max: 80, a0: 110 * deg, a1: 320 * deg }; // 80 kW = FSG EV2.2.1 battery cap
  const GRIP = { max: 1.2, a0: 158 * deg, a1: 300 * deg, r: 219, w: 20 };
  const FONT = '"Barlow Condensed", Impact, Arial, sans-serif';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mainAngle = rpm => RPM.a0 + (RPM.a1 - RPM.a0) * clamp(rpm / RPM.max, 0, 1);
  const subAngle = kw => KW.a0 + (KW.a1 - KW.a0) * clamp((kw - KW.min) / (KW.max - KW.min), 0, 1);
  const polar = (c, r, a) => [c.x + r * Math.cos(a), c.y + r * Math.sin(a)];

  class LPRDash {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.layer = document.createElement('canvas');
      this.scale = 0;
      this.shown = { rpm: 0, kw: 0, grip: 0 };
      this.last = null;
      // Rebuild the static layer once the condensed race font has loaded.
      document.fonts?.ready.then(() => { this.scale = 0; });
    }

    params() {
      if (!this.p) {
        const s = window.LPRVehicleSpec;
        const d = window.VehicleDynamics ? new window.VehicleDynamics().parameters : {};
        this.p = { radius: s.tyreDiameter / 2, ratio: s.finalDriveRatio,
          drivetrain: s.drivetrainEfficiency, inverter: s.motorInverterEfficiency,
          peakForce: d.peakDriveForce || 0, peakPower: d.peakPower || 0, coast: d.coastBrakeForce || 0 };
      }
      return this.p;
    }

    read(car) {
      const p = this.params(), v = Math.max(0, car.vx || 0);
      const rpm = v / p.radius * p.ratio * 60 / (2 * Math.PI) / 1000;
      const gas = clamp(car.throttleInput || 0, 0, 1), brake = clamp(car.brakeInput || 0, 0, 1);
      let kw = 0;
      if (!car.crashed) {
        // Mirrors vehicle.js before the tyre-grip clamp: tyre power divided by
        // drivetrain and motor/inverter efficiency. The lift-off retardation is
        // presented as regeneration. Estimate, not a modelled battery current.
        const throttle = gas * (1 - brake) * (1 - .65 * (car.damage || 0));
        const drive = throttle * Math.min(p.peakForce, p.peakPower / Math.max(v, 2)) * (car.torqueScale ?? 1);
        const coast = (1 - gas) * (1 - brake) * p.coast * Math.min(1, v / 4);
        kw = (drive * v / (p.drivetrain * p.inverter) - coast * v * p.drivetrain * p.inverter) / 1000;
      }
      return { rpm, kw, grip: car.crashed ? 0 : clamp(car.tireUse || 0, 0, GRIP.max),
        speed: Math.round((car.speed || 0) * 3.6) };
    }

    update(car, now) {
      const hide = !car || car.sauna || car.sale || car.pool;
      this.canvas.hidden = !!hide;
      if (hide || !this.canvas.offsetWidth) { this.last = null; return; }
      this.resize();
      const target = this.read(car);
      const dt = this.last === null ? 1 : clamp((now - this.last) / 1000, 0, .25);
      this.last = now;
      const k = 1 - Math.exp(-14 * dt);
      for (const key of ['rpm', 'kw', 'grip']) this.shown[key] += (target[key] - this.shown[key]) * k;
      this.draw(car, target);
    }

    resize() {
      const scale = Math.min(window.devicePixelRatio || 1, 2) * (this.canvas.clientWidth || 300) / W;
      if (Math.abs(scale - this.scale) < 1e-3) return;
      this.scale = scale;
      for (const c of [this.canvas, this.layer]) { c.width = Math.round(W * scale); c.height = Math.round(H * scale); }
      const g = this.layer.getContext('2d');
      g.setTransform(scale, 0, 0, scale, 0, 0);
      this.drawStatic(g);
    }

    face(g, c, inset) {
      const grad = g.createRadialGradient(c.x - c.r * .3, c.y - c.r * .4, c.r * .1, c.x, c.y, c.r);
      grad.addColorStop(0, '#24406b'); grad.addColorStop(.7, '#13254a'); grad.addColorStop(1, '#0a1630');
      g.beginPath(); g.arc(c.x, c.y, c.r, 0, 2 * Math.PI);
      g.fillStyle = grad; g.fill();
      g.lineWidth = 8; g.strokeStyle = '#0a1222'; g.stroke();
      g.beginPath(); g.arc(c.x, c.y, c.r - inset, 0, 2 * Math.PI);
      g.lineWidth = 2.5; g.strokeStyle = '#4a6fa5'; g.stroke();
    }

    ticks(g, c, from, to, step, angle, inner, minorInner, outer, majorEvery) {
      for (let v = from, i = 0; v <= to + 1e-9; v += step, i++) {
        const a = angle(v), major = i % majorEvery === 0;
        g.beginPath();
        g.moveTo(...polar(c, major ? inner : minorInner, a)); g.lineTo(...polar(c, outer, a));
        g.lineWidth = major ? 5 : 2.5; g.strokeStyle = major ? '#f4f7fb' : '#b9c6da'; g.stroke();
      }
    }

    drawStatic(g) {
      g.clearRect(0, 0, W, H);
      g.lineCap = 'butt';
      // Grip band and its tab, behind the main dial.
      g.beginPath(); g.arc(MAIN.x, MAIN.y, GRIP.r, GRIP.a0 - 2 * deg, GRIP.a1 + 2 * deg);
      g.lineWidth = GRIP.w + 8; g.strokeStyle = '#071022'; g.stroke();
      g.beginPath(); g.arc(MAIN.x, MAIN.y, GRIP.r, GRIP.a0, GRIP.a1);
      g.lineWidth = GRIP.w; g.strokeStyle = '#0f2c52'; g.stroke();
      const tab = GRIP.a1 + 11 * deg;
      g.save(); g.translate(...polar(MAIN, GRIP.r, tab)); g.rotate(tab + Math.PI / 2);
      g.beginPath(); g.roundRect(-38, -16, 76, 32, 9);
      g.fillStyle = '#1a9ee8'; g.fill(); g.lineWidth = 4; g.strokeStyle = '#071022'; g.stroke();
      g.font = `italic 800 24px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#06213a'; g.fillText('GRIP', 0, 1); g.restore();

      // Main dial: motor speed.
      this.face(g, MAIN, 7);
      g.save(); g.beginPath(); g.arc(MAIN.x, MAIN.y, MAIN.r - 8, 0, 2 * Math.PI); g.clip();
      g.beginPath(); g.moveTo(MAIN.x + 20, 0); g.lineTo(W, 0); g.lineTo(W, H); g.lineTo(MAIN.x - 40, H); g.closePath();
      g.fillStyle = 'rgba(3,8,20,.42)'; g.fill(); g.restore();
      g.beginPath(); g.arc(MAIN.x, MAIN.y, 60, 200 * deg, 40 * deg);
      g.lineWidth = 12; g.strokeStyle = 'rgba(130,150,180,.18)'; g.stroke();
      g.beginPath(); g.arc(MAIN.x, MAIN.y, 180, RPM.a0, RPM.a1);
      g.lineWidth = 18; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
      g.beginPath(); g.arc(MAIN.x, MAIN.y, 180, mainAngle(RPM.red), RPM.a1);
      g.strokeStyle = '#c22f3d'; g.stroke();
      this.ticks(g, MAIN, 0, RPM.max, .5, mainAngle, 166, 175, 190, 2);
      g.font = `italic 700 44px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f4f7fb';
      for (let i = 0; i <= RPM.max; i++) g.fillText(String(i), ...polar(MAIN, 134, mainAngle(i)));
      g.font = `600 17px ${FONT}`; g.fillStyle = '#8fa6c8';
      g.fillText('×1000 r/min', MAIN.x - 12, MAIN.y + 74);
      g.textAlign = 'right'; g.font = `600 26px ${FONT}`; g.fillStyle = '#c9d6ea';
      g.fillText('km/h', 545, 362);

      // Sub dial: estimated battery power, regeneration below zero.
      this.face(g, SUB, 6);
      g.beginPath(); g.arc(SUB.x, SUB.y, 82, KW.a0, KW.a1);
      g.lineWidth = 10; g.strokeStyle = 'rgba(0,0,0,.35)'; g.stroke();
      g.beginPath(); g.arc(SUB.x, SUB.y, 82, KW.a0, subAngle(0)); g.strokeStyle = '#25b67c'; g.stroke();
      g.beginPath(); g.arc(SUB.x, SUB.y, 82, subAngle(70), KW.a1); g.strokeStyle = '#c22f3d'; g.stroke();
      this.ticks(g, SUB, KW.min, KW.max, 10, subAngle, 68, 76, 88, 2);
      g.font = `italic 700 22px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#f4f7fb';
      for (const v of [-20, 0, 40, 80]) g.fillText(String(v), ...polar(SUB, 52, subAngle(v)));
      g.font = `600 18px ${FONT}`; g.fillStyle = '#8fa6c8'; g.fillText('kW', SUB.x + 28, SUB.y + 46);
    }

    needle(g, c, a, length, tail, width) {
      const [x, y] = polar(c, length, a), [bx, by] = polar(c, -tail, a), nx = -Math.sin(a), ny = Math.cos(a);
      g.beginPath();
      g.moveTo(bx + nx * width, by + ny * width); g.lineTo(x + nx * 1.2, y + ny * 1.2);
      g.lineTo(x - nx * 1.2, y - ny * 1.2); g.lineTo(bx - nx * width, by - ny * width); g.closePath();
      const grad = g.createLinearGradient(bx + nx * width, by + ny * width, bx - nx * width, by - ny * width);
      grad.addColorStop(0, '#f1f4f7'); grad.addColorStop(1, '#8e9aa9');
      g.shadowColor = 'rgba(0,0,0,.55)'; g.shadowBlur = 8; g.fillStyle = grad; g.fill(); g.shadowBlur = 0;
      g.lineWidth = 1; g.strokeStyle = '#3b4552'; g.stroke();
      g.beginPath(); g.arc(c.x, c.y, width * 2.6, 0, 2 * Math.PI);
      g.fillStyle = '#d9dee5'; g.fill(); g.lineWidth = width * .9; g.strokeStyle = '#5c6878'; g.stroke();
      g.beginPath(); g.arc(c.x, c.y, width * .9, 0, 2 * Math.PI); g.fillStyle = '#1a2233'; g.fill();
    }

    draw(car, t) {
      const g = this.ctx, s = this.scale;
      g.setTransform(1, 0, 0, 1, 0, 0);
      g.clearRect(0, 0, this.canvas.width, this.canvas.height);
      g.drawImage(this.layer, 0, 0);
      g.setTransform(s, 0, 0, s, 0, 0);

      const grip = this.shown.grip, end = GRIP.a0 + (GRIP.a1 - GRIP.a0) * grip / GRIP.max;
      if (grip > .003) {
        g.beginPath(); g.arc(MAIN.x, MAIN.y, GRIP.r, GRIP.a0, end); g.lineWidth = GRIP.w;
        g.strokeStyle = grip > 1 ? '#ff5a4e' : grip > .9 ? '#ffc847' : '#1fb0ff'; g.stroke();
      }
      for (let i = 1; i < 12; i++) {
        const a = GRIP.a0 + (GRIP.a1 - GRIP.a0) * i / 12;
        g.beginPath(); g.moveTo(...polar(MAIN, GRIP.r - GRIP.w / 2, a)); g.lineTo(...polar(MAIN, GRIP.r + GRIP.w / 2, a));
        g.lineWidth = 2; g.strokeStyle = '#071022'; g.stroke();
      }

      g.textAlign = 'right'; g.textBaseline = 'alphabetic';
      g.font = `italic 800 84px ${FONT}`; g.fillStyle = '#f4f7fb'; g.fillText(String(t.speed), 545, 334);
      g.font = `italic 800 58px ${FONT}`;
      g.fillStyle = car.crashed ? '#ff5a4e' : '#ff8a1f';
      g.fillText(car.crashed ? '×' : car.started === false ? 'N' : 'D', 545, 268);

      // Traction-control lamp: off, armed, or limiting torque.
      const off = car.tcEnabled === false, active = !off && car.tcActive;
      g.beginPath(); g.roundRect(440, 236, 56, 28, 8);
      g.fillStyle = off ? '#262f3f' : active ? '#ffc847' : '#14563b'; g.fill();
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `800 19px ${FONT}`;
      g.fillStyle = off ? '#6d7a90' : active ? '#3a2600' : '#bff7d9';
      g.fillText(off ? 'TC OFF' : 'TC', 468, 251);

      this.needle(g, SUB, subAngle(this.shown.kw), 84, 16, 5);
      this.needle(g, MAIN, mainAngle(this.shown.rpm), 178, 24, 7);
    }
  }

  window.LPRDash = LPRDash;
  // Attach without touching game.js: draw after every driver-view render.
  const Renderer = window.LPRRenderer3D;
  if (Renderer && typeof document !== 'undefined') {
    const render = Renderer.prototype.render;
    let dash;
    Renderer.prototype.render = function(car, now) {
      render.call(this, car, now);
      if (dash === undefined) {
        dash = null;
        const shell = this.canvas?.closest?.('.game-shell');
        if (shell) {
          const canvas = document.createElement('canvas');
          canvas.id = 'ev-dash'; canvas.setAttribute('aria-hidden', 'true');
          shell.append(canvas); shell.classList.add('has-ev-dash');
          dash = new LPRDash(canvas);
        }
      }
      dash?.update(car, now);
    };
  }
})();
