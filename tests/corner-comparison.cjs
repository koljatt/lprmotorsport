// Usage: node tests/corner-comparison.cjs [path/to/vehicle.js]
// Fixed entry speed and identical driver inputs; speed evolves freely thereafter.
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), } };
const source = fs.readFileSync(process.argv[2] || path.join(__dirname, '../vehicle.js'), 'utf8');
// Observe axle forces without changing the integration or driver inputs.
vm.runInNewContext(source.replace('const vxDot =',
  'state.frontLateralForce = frontFy; state.rearLateralForce = rearFy; const vxDot ='), context);
const results = [];
for (const wheel of [false, true]) {
  for (const gas of [0, .4, 1]) {
    const model = new context.window.VehicleDynamics();
    const state = { x: 0, y: 0, angle: 0 };
    model.reset(state);
    state.vx = 15;
    const samples = [];
    for (let frame = 0; frame < 270; frame++) {
      model.step(state, { steer: frame < 180 ? .5 : 0, gas, brake: 0, analog: true, wheel }, 1 / 90, 0);
      if ((frame + 1) % 90 === 0) samples.push({
        seconds: (frame + 1) / 90,
        xMetres: state.x * model.parameters.metresPerWorldUnit,
        yMetres: state.y * model.parameters.metresPerWorldUnit,
        speed: state.speed, yawRate: state.yawRate, bodySlip: state.bodySlip,
        steerAngle: state.steerAngle, lateralG: state.lateralG,
        frontLateralForce: state.frontLateralForce ?? null,
        rearLateralForce: state.rearLateralForce ?? null
      });
    }
    results.push({ control: wheel ? 'wheel' : 'assisted', gas, samples });
  }
}
console.log(JSON.stringify(results, null, 2));
