const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ffb = require('../wheel-ffb.js');
const spec = require('../shared/vehicle-spec.js');
const context = { window: { LPRVehicleSpec: spec } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'vehicle.js'), 'utf8'), context);

// Command encoding matches the Linux hid-fanatecff high-resolution format.
assert.deepEqual(ffb.constantCmd(0), [0x03, 0x08, 0, 0, 0, 0, 0], 'zero force disables the constant slot');
assert.deepEqual(ffb.constantCmd(1), [0x01, 0x08, 0xff, 0xff, 0, 0, 0x01]);
assert.deepEqual(ffb.constantCmd(-1), [0x01, 0x08, 0x01, 0x00, 0, 0, 0x01]);
assert.deepEqual(ffb.constantCmd(5), ffb.constantCmd(1), 'force is clamped');
assert.deepEqual(ffb.rangeCmds(240)[2], [0xf8, 0x81, 240, 0, 0, 0, 0]);
assert.deepEqual(ffb.rangeCmds(900)[2], [0xf8, 0x81, 0x84, 0x03, 0, 0, 0]);
assert.deepEqual(ffb.damperCmd(0), [0x23, 0x0c, 0, 0, 0, 0, 0xff]);
assert.deepEqual(ffb.damperCmd(1), [0x21, 0x0c, 15, 0, 15, 0, 0xff]);
for (const cmd of [...ffb.SLOT_RESET, ffb.STOP_ALL, ffb.constantCmd(.37)]) {
  assert.equal(cmd.length, 7);
  assert(cmd.every(b => Number.isInteger(b) && b >= 0 && b <= 255));
}

// Drive the real vehicle model in a steady corner and check the torque it produces.
const cfg = { ...ffb.defaults, strength: 1, roadFeel: 0 };
function corner(speed, steer, seconds = 2) {
  const model = new context.window.VehicleDynamics();
  const car = { x: 0, y: 0, angle: 0 };
  model.reset(car);
  const st = {};
  ffb.computeTorque(car, st, cfg, 1 / 90); // records the static grip reference
  let torque = 0;
  for (let i = 0; i < seconds * 90; i++) {
    car.vx = Math.max(car.vx, speed);
    model.step(car, { steer, gas: .3, brake: 0, analog: true, wheel: true }, 1 / 90, 0);
    torque = ffb.computeTorque(car, st, cfg, 1 / 90);
    assert(Number.isFinite(torque) && Math.abs(torque) <= 1);
  }
  return { torque, car };
}
const straight = corner(15, 0);
assert(Math.abs(straight.torque) < .02, `no torque driving straight (${straight.torque})`);
const right = corner(15, .25), left = corner(15, -.25);
assert(right.torque < -.1, `turning right pulls the wheel back left (${right.torque})`);
assert(left.torque > .1, `turning left pulls the wheel back right (${left.torque})`);
assert(Math.abs(right.torque + left.torque) < .05, 'symmetric');
// Past the grip limit the pneumatic trail collapses and the wheel goes light.
const gentle = Math.abs(corner(15, .12).torque), sliding = Math.abs(corner(22, 1).torque);
assert(right.car.tireUse < .9, 'reference corner is within grip');
assert(sliding < Math.abs(right.torque), `wheel lightens when the fronts slide (${sliding} vs ${right.torque})`);
assert(gentle > 0 && gentle < Math.abs(right.torque), 'torque builds with lateral load below the limit');

// Torque scales with the strength setting.
const half = { ...cfg, strength: .5 }, st = { refLimit: right.car.frontGripLimit };
assert(Math.abs(ffb.computeTorque(right.car, st, half, 1 / 90) - right.torque / 2) < .02);

// Impacts give a short jolt that dies out.
{
  const car = { vx: 10, frontLateralForce: 0, frontGripLimit: 3000, impactSpeed: 0 }, s = {};
  const rf = { ...cfg, roadFeel: 1 };
  ffb.computeTorque(car, s, rf, 1 / 60);
  car.impactSpeed = 4; car.impactEnergy = 3600;
  let peak = 0;
  for (let i = 0; i < 30; i++) peak = Math.max(peak, Math.abs(ffb.computeTorque(car, s, rf, 1 / 60)));
  assert(peak > .1, 'impact is felt');
  assert(Math.abs(ffb.computeTorque(car, s, rf, 1 / 60)) < .02, 'impact jolt decays');
}

// Pedal and steering normalisation.
const pads = [{ id: 'FANATEC CSL DD (Vendor: 0eb7 Product: 0020)', mapping: '', axes: [.1, 1, -1, 0] }];
assert.equal(ffb.pedalValue({ pad: pads[0].id, axis: 1, rest: 1, full: -1 }, pads), 0, 'released pedal reads zero');
pads[0].axes[1] = 0;
assert.equal(ffb.pedalValue({ pad: pads[0].id, axis: 1, rest: 1, full: -1 }, pads), .5);
assert.equal(ffb.pedalValue(null, pads), 0);
assert(ffb.isWheelPad(pads[0]));
assert(!ffb.isWheelPad({ id: 'Xbox Wireless Controller', mapping: 'standard', axes: [] }));
// 900 degree base, 240 degree car: 0.1 of the axis is 45 degrees = 0.375 of the car's half-lock.
assert(Math.abs(ffb.steerValue({ ...ffb.defaults }, pads) - .375) < 1e-12);
assert.equal(ffb.steerValue({ ...ffb.defaults, steerInvert: true }, pads), -.375);
pads[0].axes[0] = .5;
assert.equal(ffb.steerValue({ ...ffb.defaults }, pads), 1, 'steering clamps at full lock');

// A physical wheel drives the rack directly; keyboard keeps its smoothed rack.
{
  const m = new context.window.VehicleDynamics(), car = { x: 0, y: 0, angle: 0 };
  m.reset(car); car.vx = 15;
  m.step(car, { steer: .8, gas: 0, brake: 0, analog: true, wheel: true }, 1 / 120, 0);
  assert.equal(car.steerAngle, .8 * m.parameters.maxRoadWheelAngle, 'wheel input reaches the rack in one step');
  m.step(car, { steer: -.8, gas: 0, brake: 0, analog: true, wheel: true }, 1 / 120, 0);
  assert.equal(car.steerAngle, -.8 * m.parameters.maxRoadWheelAngle, 'no rate limit on a fast correction');
  const k = new context.window.VehicleDynamics(), kc = { x: 0, y: 0, angle: 0 };
  k.reset(kc); kc.vx = 15;
  k.step(kc, { steer: 1, gas: 0, brake: 0 }, 1 / 120, 0);
  assert(kc.steerAngle < .05, 'keyboard steering is still smoothed');
}

console.log('wheel-ffb ok', { right: right.torque.toFixed(3), gentle: gentle.toFixed(3), sliding: sliding.toFixed(3) });
