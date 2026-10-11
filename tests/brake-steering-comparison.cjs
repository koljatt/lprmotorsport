// node tests/brake-steering-comparison.cjs [vehicle source path | --legacy-tires]
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const context = { window: {} };
let source = fs.readFileSync(process.argv[2] && process.argv[2] !== '--legacy-tires'
  ? process.argv[2] : path.join(__dirname, '../vehicle.js'), 'utf8');
// Reconstruct the former longitudinal-priority envelope for reproducible
// comparisons with identical inputs; leave all other physics unchanged.
if (process.argv[2] === '--legacy-tires') source = source.replace(
  /let frontFy =[^]*?const vxDot =/,
  `const frontCapacity = Math.sqrt(Math.max(0, frontLimit ** 2 - frontFx ** 2));
   const rearCapacity = Math.sqrt(Math.max(0, rearLimit ** 2 - rearFx ** 2));
   const frontFy = -frontCapacity * Math.tanh(p.frontCorneringStiffness * alphaFront / Math.max(frontCapacity, 1));
   const rearFy = -rearCapacity * Math.tanh(p.rearCorneringStiffness * alphaRear / Math.max(rearCapacity, 1));
   const frontBodyFx = frontFx - frontFy * Math.sin(state.steerAngle);
   const frontBodyFy = frontFy * Math.cos(state.steerAngle);
   const vxDot =`);
vm.runInNewContext(source.replace('const vxDot =',
  'state.frontFx = frontFx; state.frontFy = frontFy; state.rearFx = rearFx; state.rearFy = rearFy; state.frontLimit = frontLimit; state.rearLimit = rearLimit; const vxDot ='), context);
const results = [];
for (const wheel of [false, true]) for (const brake of [0, .25, .5, .75, 1]) {
  const model = new context.window.VehicleDynamics();
  const state = { x: 0, y: 0, angle: 0 };
  model.reset(state);
  state.vx = 20;
  // Establish the same moderate corner before applying each brake pressure.
  const steer = wheel ? .07 : .5;
  for (let i = 0; i < 90; i++) {
    state.vx = 20;
    model.step(state, { steer, gas: 0, brake: 0, analog: true, wheel }, 1 / 180, 0);
  }
  const entryAngle = state.angle;
  for (let i = 0; i < 90; i++) model.step(state,
    { steer, gas: 0, brake, analog: true, wheel }, 1 / 180, 0);
  results.push({ wheel, brake, speed: state.speed, yawRate: state.yawRate,
    headingChange: state.angle - entryAngle, slip: state.bodySlip,
    frontFx: state.frontFx, frontFy: state.frontFy,
    rearFx: state.rearFx, rearFy: state.rearFy,
    frontUse: Math.hypot(state.frontFx, state.frontFy) / state.frontLimit,
    rearUse: Math.hypot(state.rearFx, state.rearFy) / state.rearLimit });
}
console.log(JSON.stringify(results, null, 2));
