const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../vehicle.js'), 'utf8');

function stop(code = source, { brake = 1, gas = 0, steer = 0, grass = 0, dt = 1 / 180 } = {}) {
  const context = { window: {} };
  vm.runInNewContext(code, context);
  const dynamics = new context.window.VehicleDynamics();
  const state = { x: 0, y: 0, angle: 0 };
  dynamics.reset(state);
  state.vx = state.speed = 100 / 3.6;
  let time = 0, distance = 0;
  while (state.speed > .1 && time < 10) {
    const previous = { x: state.x, y: state.y };
    dynamics.step(state, { gas, brake, steer }, dt, grass);
    distance += Math.hypot(state.x - previous.x, state.y - previous.y) * dynamics.parameters.metresPerWorldUnit;
    time += dt;
    assert([state.vx, state.vy, state.yawRate].every(Number.isFinite));
    if (steer && state.vx > 3) assert(Math.abs(state.bodySlip) < .2,
      `Braking in a turn must remain stable at ${state.vx.toFixed(1)} m/s (slip ${state.bodySlip.toFixed(3)})`);
  }
  assert(time < 10, 'Braking must stop the car');
  assert(state.vx >= 0, 'Braking must not reverse the car');
  return { time, distance };
}

const full = stop();
assert(full.distance < 28 && full.time < 2, 'Full braking from 100 km/h must stop within 28 m and two seconds');
const overlap = stop(source, { gas: 1 });
assert(Math.abs(overlap.distance - full.distance) < .01, 'Held throttle must not weaken full braking');
assert(stop(source, { brake: .5 }).distance > full.distance * 1.3, 'Partial braking must retain pedal modulation');
assert(stop(source, { grass: 1 }).distance > full.distance * 1.5, 'Grass must retain a longer stopping distance');
for (const steer of [-1, 1]) stop(source, { steer });
assert(Math.abs(stop(source, { dt: 1 / 90 }).distance - full.distance) < .3, 'Stopping distance must remain consistent across simulation steps');
console.log(`PASS: 100 km/h stop in ${full.distance.toFixed(1)} m / ${full.time.toFixed(2)} s; brake priority, modulation, grass and corner stability`);
