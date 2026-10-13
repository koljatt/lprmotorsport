const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), } };
const source = fs.readFileSync(path.join(__dirname, '../vehicle.js'), 'utf8');
vm.runInNewContext(source.replace('const vxDot =',
  'state.frontFx = frontFx; state.frontFy = frontFy; state.rearFx = rearFx; state.rearFy = rearFy; state.frontLimit = frontLimit; state.rearLimit = rearLimit; const vxDot ='), context);
function run(brake, wheel, grass = 0, direction = 1, dt = 1 / 180) {
  const model = new context.window.VehicleDynamics();
  const state = { x: 0, y: 0, angle: 0 };
  model.reset(state);
  state.vx = 20;
  const steer = direction * (wheel ? .07 : .5);
  for (let i = 0; i < Math.round(.5 / dt); i++) {
    state.vx = 20;
    model.step(state, { steer, gas: 0, brake: 0, analog: true, wheel }, dt, grass);
  }
  const entry = state.angle;
  for (let i = 0; i < Math.round(.5 / dt); i++) {
    model.step(state, { steer, gas: 0, brake, analog: true, wheel }, dt, grass);
    assert(Math.hypot(state.frontFx, state.frontFy) <= state.frontLimit + 1e-8);
    assert(Math.hypot(state.rearFx, state.rearFy) <= state.rearLimit + 1e-8);
    assert([state.vx, state.vy, state.yawRate, state.angle].every(Number.isFinite));
  }
  return { ...state, heading: direction * (state.angle - entry) };
}
for (const wheel of [false, true]) {
  const coasting = run(0, wheel);
  for (const brake of [.25, .5, .75, 1]) {
    const result = run(brake, wheel);
    assert(result.heading > coasting.heading * .5,
      'Moderate cornering must retain steering under braking, including full pressure');
    assert(result.speed < coasting.speed, 'Braking must reduce speed');
    assert(Math.abs(result.bodySlip) < .15, 'Moderate brake-in-turn must stay stable');
    assert(Math.abs(result.heading - run(brake, wheel, 0, -1).heading) < 1e-10,
      'Brake cornering must be symmetric');
    assert(Math.abs(result.heading - run(brake, wheel, 0, 1, 1 / 90).heading) < .01,
      'Brake cornering must be consistent across time steps');
    run(brake, wheel, 1);
  }
}
// At the same instantaneous tire state, more braking reduces lateral force,
// and releasing the pedal restores it without imposing a rotation.
const model = new context.window.VehicleDynamics();
const initial = { x: 0, y: 0, angle: 0 };
model.reset(initial);
Object.assign(initial, { vx: 20, steer: .07, steerAngle: .07 * .36 });
const forces = [0, .5, 1].map(brake => {
  const state = { ...initial };
  model.step(state, { steer: .07, gas: 0, brake, analog: true, wheel: true }, 1 / 180, 0);
  return { lateral: state.frontFx * Math.sin(state.steerAngle) + state.frontFy * Math.cos(state.steerAngle),
    braking: -state.frontFx - state.rearFx };
});
assert(forces[0].lateral > forces[1].lateral && forces[1].lateral > forces[2].lateral,
  'Brake pressure must progressively reduce lateral force at a fixed tire state');
assert(forces[0].braking < forces[1].braking && forces[1].braking < forces[2].braking);
console.log('PASS: steering through braking, friction budgets, pedal modulation, symmetry and time-step consistency');
