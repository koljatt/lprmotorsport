const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), } };
const source = fs.readFileSync(path.join(__dirname, '../vehicle.js'), 'utf8');
vm.runInNewContext(source.replace('const vxDot =',
  'state.frontFy = frontFy; state.frontFx = frontFx; state.rearFy = rearFy; const vxDot ='), context);
for (const wheel of [false, true]) {
  for (const grass of [0, 1]) {
    const model = new context.window.VehicleDynamics();
    const state = { x: 0, y: 0, angle: 0 };
    model.reset(state);
    state.vx = 20;
    for (let frame = 0; frame < 360; frame++) {
      const previousYaw = state.yawRate;
      const previousSpeed = state.vx;
      model.step(state, { steer: frame < 180 ? .5 : -.3, gas: .4,
        brake: frame > 270 ? .2 : 0, analog: true, wheel }, 1 / 90, grass);
      if (previousSpeed < 1.5) continue; // Low-speed kinematic branch.
      const p = model.parameters;
      const torque = p.frontAxle * (state.frontFy * Math.cos(state.steerAngle) +
        state.frontFx * Math.sin(state.steerAngle)) - p.rearAxle * state.rearFy;
      const expectedYaw = Math.max(-3, Math.min(3, previousYaw + torque / p.yawInertia / 90));
      assert(Math.abs(state.yawRate - expectedYaw) < 1e-12,
        'Yaw must follow axle torque, including assisted steering and reduced grip');
    }
  }
}
console.log('PASS: assisted and wheel yaw follow tire torque on asphalt and grass');
