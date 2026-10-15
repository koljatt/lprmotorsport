const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const spec = require('../shared/vehicle-spec.js');
const context = { window: { LPRVehicleSpec: spec } };
for (const file of ['vehicle.js', 'renderer3d.js']) {
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
const renderer = Object.create(context.window.LPRRenderer3D.prototype);
renderer.width = 1280;
renderer.height = 720;
function run(speed, steer, { analog = false, grass = 0, dt = 1 / 90 } = {}) {
  const model = new context.window.VehicleDynamics();
  const state = { x: 0, y: 0, angle: 0 };
  model.reset(state);
  for (let i = 0; i < Math.round(1.2 / dt); i++) {
    // Isolate rack travel at this speed, independently of tyre scrub slowing the car.
    state.vx = speed;
    model.step(state, { steer, gas: 1, brake: 0, analog }, dt, grass);
    assert([state.vx, state.vy, state.yawRate, state.steerAngle].every(Number.isFinite));
  }
  return { state, wheel: renderer.steeringWheelLayout(state).angle };
}
for (const speed of [0, 5, 15, 25, 30]) {
  for (const analog of [false, true]) {
    for (const grass of [0, 1]) {
      const left = run(speed, -1, { analog, grass });
      const right = run(speed, 1, { analog, grass });
      assert(Math.abs(left.wheel + right.wheel) < 1e-8, 'Visual steering mirrors between directions');
      const before = JSON.stringify(right.state);
      renderer.steeringWheelLayout(right.state);
      assert.equal(JSON.stringify(right.state), before, 'Visual steering must not change vehicle state');
      const visual = spec.visualRoadWheelAngle(right.state.steerAngle);
      assert(visual > Math.abs(right.state.steerAngle), 'Small physical angles become visible');
      assert(visual <= spec.maxVisualRoadWheelAngle, 'Visual wheel angle has a smooth limit');
    }
  }
}
const fast = run(25, 1), slow = run(5, 1);
const degrees = fast.wheel * 180 / Math.PI;
assert(degrees > 20 && degrees < 80, 'Fast steering is clearly visible without forcing full lock');
assert(slow.wheel > Math.PI / 2, 'Tight slow corners retain the large hairpin pose');
assert(fast.state.steerAngle < spec.maxRoadWheelAngle / 3, 'The original speed assistance still controls physics');
assert(Math.abs(spec.visualRoadWheelAngle(0)) === 0, 'Released steering centres visually');
for (let i = 1; i <= 100; i++) {
  const previous = spec.visualRoadWheelAngle((i - 1) / 100 * spec.maxRoadWheelAngle);
  const next = spec.visualRoadWheelAngle(i / 100 * spec.maxRoadWheelAngle);
  assert(next > previous && next - previous < .015, 'Visible steering builds smoothly without snapping to lock');
}
console.log('PASS: amplified visual steering, moderate high-speed wheel pose, original speed assistance and unchanged vehicle state', { fastWheelDegrees: degrees });
