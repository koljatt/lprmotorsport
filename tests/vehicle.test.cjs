const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');

const context = { window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../vehicle.js'), 'utf8').replace(
  'const vxDot =', 'state.frontFx = frontFx; state.rearFx = rearFx; const vxDot ='), context);

function corner(speed, steer, extraInput = {}) {
  const dynamics = new context.window.VehicleDynamics();
  const state = { x: 0, y: 0, angle: 0 };
  dynamics.reset(state);
  for (let frame = 0; frame < 450; frame++) {
    // Hold the test speed to isolate steering from acceleration and drag.
    state.vx = speed;
    dynamics.step(state, { steer, gas: 0, brake: 0, ...extraInput }, 1 / 90, 0);
    for (const value of [state.x, state.y, state.vx, state.vy, state.yawRate]) {
      assert(Number.isFinite(value), 'Cornering must remain finite');
    }
  }
  return { state, radius: Math.abs(state.vx / state.yawRate) };
}

for (const speed of [1, 3, 5]) {
  const left = corner(speed, -1);
  const right = corner(speed, 1);
  assert(right.radius > 3.5 && right.radius < 6,
    `Full steering at ${speed * 3.6} km/h must negotiate a tight corner`);
  assert(left.state.yawRate < 0 && right.state.yawRate > 0);
  assert(Math.abs(left.radius - right.radius) < .01, 'Both directions must turn equally');
}

assert(corner(3, .5).radius > corner(3, 1).radius * 1.7,
  'Partial touch or tilt input must request a gentler turn');
const fast = corner(15, 1);
assert(fast.radius > 15, 'Steering must soften at higher speed');
assert(Math.abs(fast.state.lateralG) < 1.3, 'High-speed cornering must retain the grip budget');
assert(fast.radius < 17,
  'Full assisted steering at 54 km/h must negotiate a 17 m radius instead of pushing wide');
const wheel = corner(3, 1, { analog: true, wheel: true });
assert.equal(wheel.state.steerAngle, .36, 'Calibrated wheel input must retain direct full lock');

console.log('PASS: tight low-speed turns, symmetric steering, partial input, speed limiting and wheel input');

function steeringRun(speed, schedule, dt = 1 / 90) {
  const dynamics = new context.window.VehicleDynamics();
  const state = { x: 0, y: 0, angle: 0 };
  dynamics.reset(state);
  const samples = [];
  for (const [duration, steer] of schedule) {
    for (let frame = 0; frame < Math.round(duration / dt); frame++) {
      state.vx = speed;
      dynamics.step(state, { steer, gas: 0, brake: 0 }, dt, 0);
      assert([state.steerAngle, state.yawRate, state.vy].every(Number.isFinite));
      samples.push({ ...state });
    }
  }
  return samples;
}

const slowTap = steeringRun(3, [[.1, 1]]).at(-1);
const fastTap = steeringRun(20, [[.1, 1]]).at(-1);
assert(slowTap.steer > fastTap.steer, 'Short presses must build less steering at speed');
assert(fastTap.yawRate > 0 && fastTap.lateralG < .5,
  'A short high-speed correction must turn gently in the requested direction');

const release = steeringRun(15, [[1, 1], [.4, 0]]);
const released = release.slice(90);
assert.equal(released[17].steer, 0, 'Full keyboard steering must centre within .2 seconds');
assert(released.every(s => s.steerAngle >= -1e-8),
  'Releasing steering must not command a turn in the opposite direction');
assert(Math.abs(released.at(-1).yawRate) < .1,
  'The car must settle after releasing the steering');

const reversal = steeringRun(15, [[1, 1], [.4, -1]]).slice(90);
assert(reversal[17].steer < 0, 'Opposite input must unwind full lock within .2 seconds');
assert(reversal.at(-1).yawRate < 0, 'A correction must establish the opposite turn');

const schedule = [[.1, 1], [.2, 0], [.1, -1], [.2, 0]];
const reference = steeringRun(15, schedule).at(-1);
for (const dt of [1 / 120, 1 / 180]) {
  const result = steeringRun(15, schedule, dt).at(-1);
  assert(Math.abs(result.angle - reference.angle) < .005,
    'The same correction sequence must stay consistent across small time steps');
}
console.log('PASS: gentle taps at speed, quick centering, direction corrections and time-step consistency');

for (const speed of [8, 15, 20, 30]) {
  for (const grass of [0, 1]) {
    const dynamics = new context.window.VehicleDynamics();
    const state = { x: 0, y: 0, angle: 0 };
    dynamics.reset(state);
    const settledYaw = [];
    for (let step = 0; step < 900; step++) {
      state.vx = speed;
      dynamics.step(state, { steer: 1, gas: 1, brake: 0 }, 1 / 90, grass);
      assert(Math.abs(state.bodySlip) < .2, 'Sustained assisted cornering must not develop a spin');
      if (step >= 450) settledYaw.push(state.yawRate);
    }
    // Steering must not invent yaw when lateral force is zero.
    assert(settledYaw.every(yaw => yaw >= -1e-8), 'Holding right must not establish a left turn');
    if (!grass || speed <= 15) assert(state.yawRate > .1,
      'With lateral grip available, holding right must establish a right turn');
    assert(Math.max(...settledYaw) - Math.min(...settledYaw) < .02,
      'Holding steering must settle without repeated yaw oscillations');
    const mu = grass ? dynamics.parameters.grassGrip : dynamics.parameters.roadGrip;
    assert(state.vx * state.yawRate < mu * 9.81 * 1.05,
      'Steering assistance must respect the surface grip budget');
  }
}
console.log('PASS: tighter assisted cornering and stable sustained turns on asphalt and grass');

function liftOffRun({ gas = 0, brake = 0, analog = false, grass = 0, coast = true,
  steer = 0, dt = 1 / 90, disturbed = false } = {}) {
  const dynamics = new context.window.VehicleDynamics();
  if (!coast) dynamics.parameters.coastBrakeForce = 0;
  const state = { x: 0, y: 0, angle: 0 };
  dynamics.reset(state);
  state.vx = 15;
  if (disturbed) {
    state.vy = 3;
    state.yawRate = .8;
  }
  for (let frame = 0; frame < Math.round(2 / dt); frame++) {
    dynamics.step(state, { gas, brake, steer, analog, wheel: analog }, dt, grass);
    assert([state.vx, state.vy, state.yawRate, state.bodySlip].every(Number.isFinite));
    assert(state.vx >= 0, 'Lift-off braking must not reverse the car');
    if (steer) assert(Math.abs(state.bodySlip) < .2, 'Lift-off in a turn must not develop a spin');
  }
  return state;
}

for (const analog of [false, true]) {
  const lifted = liftOffRun({ analog });
  const rolling = liftOffRun({ analog, coast: false });
  assert(lifted.vx < 13, 'Lifting must slow the 450 kg car under the retained provisional coast force');
  assert(rolling.vx - lifted.vx > 1.5, 'Lift-off must slow the car appreciably more than drag alone');
  assert(liftOffRun({ analog, brake: 1 }).vx < lifted.vx,
    'The brake pedal must remain stronger than lift-off braking');
  assert(liftOffRun({ analog, gas: 1 }).vx > 15, 'Full throttle must still accelerate');
}
for (const grass of [0, 1]) {
  for (const steer of [-1, 1]) liftOffRun({ grass, steer });
  const recovered = liftOffRun({ grass, disturbed: true });
  assert(Math.abs(recovered.bodySlip) < .02 && Math.abs(recovered.yawRate) < .05,
    'Lifting and centering must settle lateral slip and yaw on either surface');
}
const liftedReference = liftOffRun();
assert(Math.abs(liftOffRun({ dt: 1 / 180 }).vx - liftedReference.vx) < .02,
  'Lift-off slowing must remain consistent across small time steps');
const stoppedDynamics = new context.window.VehicleDynamics();
const stopped = { x: 0, y: 0, angle: 0 };
stoppedDynamics.reset(stopped);
for (let frame = 0; frame < 90; frame++) {
  stoppedDynamics.step(stopped, { gas: 0, brake: 0, steer: 0 }, 1 / 90, 0);
}
assert.equal(stopped.speed, 0, 'Lift-off braking must leave a stationary car at rest');
console.log('PASS: lift-off slowing, brake authority, corner stability, recovery and time-step consistency');

function poweredTurn(steer, analog = false, wheel = false) {
  const dynamics = new context.window.VehicleDynamics();
  const state = { x: 0, y: 0, angle: 0 };
  dynamics.reset(state);
  state.vx = 30;
  let greatestSlip = 0;
  for (let step = 0; step < 720; step++) {
    dynamics.step(state, { gas: 1, brake: 0, steer, analog, wheel }, 1 / 90, 0);
    greatestSlip = Math.max(greatestSlip, Math.abs(state.bodySlip));
    assert([state.vx, state.vy, state.yawRate].every(Number.isFinite));
    assert(Math.abs(state.frontFx) < 1e-10 && state.rearFx >= 0,
      'Full throttle without a brake input must never apply axle braking, even at full steering');
  }
  return { state, greatestSlip };
}
for (const analog of [false, true]) {
  const tight = poweredTurn(1, analog);
  const gentle = poweredTurn(.15, analog);
  assert(tight.state.speed > 17, 'Full steering must not impose the former automatic corner speed');
  assert(gentle.state.speed > 30, 'Small steering corrections must retain straight-line acceleration');
  assert(tight.greatestSlip < .1, 'Assisted turns must avoid persistent sideways drift');
  assert(tight.state.yawRate > .1, 'Powered cornering must retain a turning response');
  assert(Math.abs(tight.state.vx / tight.state.yawRate) > 17,
    'Excess entry speed must produce a wider turn instead of automatic braking into a tight corner');
}
assert(poweredTurn(0, true, true).state.speed > 30, 'Direct wheel driving must retain straight-line acceleration');
for (const steer of [-1, 1]) poweredTurn(steer, true, true);
console.log('PASS: no automatic braking in powered turns, wider fast corners and small corrections');
