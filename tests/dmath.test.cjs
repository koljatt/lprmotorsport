'use strict';
// Deterministic shared math: identical bits in every JavaScript engine.
// The fingerprint and scenario constants below were recorded in Chromium; this
// Node.js run passing proves browser and verification server agree bit for bit.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const LPRMath = require('../shared/dmath.js');

const f64 = new Float64Array(1), big = new BigUint64Array(f64.buffer);
const bits = x => { f64[0] = x; return big[0]; };
function ulps(a, b) {
  if (Number.isNaN(a) && Number.isNaN(b)) return 0n;
  if (a === b) return Object.is(a, b) ? 0n : 1n;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 1n << 60n;
  const x = bits(a), y = bits(b);
  if ((x >> 63n) !== (y >> 63n)) return 1n << 60n;
  return x > y ? x - y : y - x;
}
const lin = (a, b, n) => Array.from({ length: n }, (_, i) => a + (b - a) * i / (n - 1));
function within(name, limit, inputs) {
  let worst = 0n, at = null;
  for (const v of inputs) {
    const args = Array.isArray(v) ? v : [v];
    const d = ulps(LPRMath[name](...args), Math[name](...args));
    if (d > worst) { worst = d; at = args; }
  }
  assert.ok(worst <= BigInt(limit), `${name} differs from native Math by ${worst} ulps at ${JSON.stringify(at)}`);
}

// Accuracy: fdlibm is within 1 ulp; compositions (tanh, naive hypot) within 2.
const specials = [0, -0, 1e-320, -1e-320, 1e-10, -1e-10, .5, -.5, 1, -1, 2, -2, Math.PI / 4, Math.PI / 2, Math.PI, 2 * Math.PI, 1e5, -1e5, 7.1e2, -7.4e2, NaN, Infinity, -Infinity];
within('sin', 1, [...lin(-50, 50, 20001), ...lin(-8e5, 8e5, 4001), ...specials]);
within('cos', 1, [...lin(-50, 50, 20001), ...lin(-8e5, 8e5, 4001), ...specials]);
within('tan', 1, [...lin(-50, 50, 20001), ...specials]);
within('atan', 1, [...lin(-100, 100, 20001), ...lin(-1e9, 1e9, 1001), ...specials]);
within('exp', 1, [...lin(-700, 700, 20001), ...lin(-1, 1, 5001), ...specials]);
within('expm1', 1, [...lin(-50, 50, 20001), ...lin(-1, 1, 5001), ...specials]);
within('log', 1, [...lin(1e-300, 10, 10001), ...lin(1, 1e300, 10001), ...specials]);
within('tanh', 2, [...lin(-30, 30, 20001), ...lin(-1, 1, 5001), ...specials]);
const grid = [];
for (const y of lin(-10, 10, 101)) for (const x of lin(-10, 10, 101)) grid.push([y, x]);
for (const s of specials) for (const t of specials) grid.push([s, t]);
within('atan2', 1, grid);
// Naive sqrt(x*x+y*y) underflows for subnormal inputs, which never occur in the physics.
within('hypot', 2, grid.filter(([a, b]) => Math.abs(a) > 1e-150 || Math.abs(b) > 1e-150 || (a === 0 && b === 0)));
const powers = [];
for (const x of lin(.01, 20, 201)) for (const y of lin(-5, 5, 101)) powers.push([x, y]);
for (const x of lin(-5, 5, 41)) for (const y of [-3, -2, -1, 0, 1, 2, 3, 4, .5, 2.5, .94]) powers.push([x, y]);
for (const s of specials) for (const t of specials) powers.push([s, t]);
powers.push([450 / 275, .94], [2, 1023], [2, -1074], [-8, 1 / 3], [1e-300, 2], [1e300, 2]);
within('pow', 1, powers);

// ECMAScript semantics that differ from C: these are exact requirements.
assert.ok(Object.is(LPRMath.sin(-0), -0));
assert.ok(Object.is(LPRMath.tan(-0), -0));
assert.ok(Object.is(LPRMath.atan(-0), -0));
assert.ok(Object.is(LPRMath.expm1(-0), -0));
assert.ok(Object.is(LPRMath.tanh(-0), -0));
assert.ok(Number.isNaN(LPRMath.pow(1, Infinity)));
assert.ok(Number.isNaN(LPRMath.pow(-1, -Infinity)));
assert.ok(Number.isNaN(LPRMath.pow(NaN, 1)));
assert.equal(LPRMath.pow(NaN, 0), 1);
assert.equal(LPRMath.pow(-0, -1), -Infinity);
assert.equal(LPRMath.pow(-0, -2), Infinity);
assert.ok(Object.is(LPRMath.pow(-0, 3), -0));
assert.ok(Number.isNaN(LPRMath.pow(-8, 1 / 3)));
assert.equal(LPRMath.pow(-2, 3), -8);
assert.equal(LPRMath.pow(1.2345678, 2), 1.2345678 * 1.2345678);
assert.equal(LPRMath.log(0), -Infinity);
assert.ok(Number.isNaN(LPRMath.log(-1)));
assert.equal(LPRMath.hypot(), 0);
assert.equal(LPRMath.hypot(3, 4), 5);
assert.equal(LPRMath.hypot(Infinity, NaN), Infinity);
assert.equal(LPRMath.PI, Math.PI);
assert.equal(LPRMath.max(1, 2), 2);
assert.throws(() => LPRMath.random(), /not deterministic/);
assert.throws(() => LPRMath.asin(.5), /not deterministic/);

// Recorded in Chromium 24.10.2026. A different value here means this engine's
// arithmetic differs from the browser, which the verification server cannot tolerate.
const EXPECTED_FINGERPRINT = {
  sin: '05400620', cos: '0978e9d1', tan: '901d241c', atan: '96459cc5', atan2: 'ddf49740', exp: '1f30e2c5',
  expm1: 'd44e8e77', log: '735f83f7', pow: '73856608', pow2: 'e39f596c', tanh: 'd4fa7550', hypot: 'e7177f6b'
};
assert.deepEqual(LPRMath.fingerprint(), EXPECTED_FINGERPRINT);

// Physics files shadow Math: load them like the browser and the verification worker do.
function physicsContext() {
  const context = { window: { LPRTrackData: { version: 1, objects: [] } } };
  context.window.window = context.window;
  vm.createContext(context);
  for (const file of ['shared/dmath.js', 'shared/vehicle-spec.js', 'campus.js', 'shared/track-document.js', 'shared/terrain.js', 'shared/track-objects.js', 'vehicle.js'])
    vm.runInContext(read(file), context, { filename: file });
  return context.window;
}
const world = physicsContext();
assert.ok(world.LPRMath, 'dmath.js must publish window.LPRMath');
assert.equal(world.LPRMath.fingerprint().sin, EXPECTED_FINGERPRINT.sin);

// Same scenario recorded in Chromium: 30 s of full-throttle weaving into campus walls,
// then braking, with grass every five seconds. Any engine must reproduce the exact bits.
const EXPECTED_SCENARIO = '307c8dd4';
{
  const scenario = require('./determinism-scenario.js')(world);
  assert.ok(scenario.impacts > 0, 'scenario should exercise collisions');
  assert.equal(scenario.hash, EXPECTED_SCENARIO,
    'Physics state diverged from the browser recording. If the physics intentionally changed, re-record ' +
    'EXPECTED_SCENARIO in a browser as described in README (Deterministinen fysiikka) before updating this constant.');
}

// Verification server world: the exact code path verification/world.cjs compiles for
// the session worker must also reproduce the Chromium recording (autopilot lap).
const EXPECTED_VERIFIED_LAP = { hash: 'bf418c9e', laps: 1, lapTicks: [10040] };
if (fs.existsSync(path.join(root, 'verification/world.cjs'))) {
  const { createWorld, files } = require('../verification/world.cjs');
  assert.equal(files[0], 'shared/dmath.js', 'verification world must compile dmath.js before the physics');
  const created = createWorld();
  assert.ok(created.math && created.math.deterministic, 'createWorld must expose LPRMath');
  const lap = require('./determinism-scenario.js').verifiedLap(created);
  assert.deepEqual({ hash: lap.hash, laps: lap.laps, lapTicks: lap.lapTicks }, EXPECTED_VERIFIED_LAP,
    'Verification world diverged from the browser recording; see README (Deterministinen fysiikka).');
  assert.equal(lap.damage, 0);
}

// Without LPRMath the physics must still run (tests use native Math), but production must load it first.
{
  const context = { window: { LPRVehicleSpec: require('../shared/vehicle-spec.js') } };
  vm.createContext(context);
  vm.runInContext(read('vehicle.js'), context);
  assert.ok(Number.isFinite(new context.window.VehicleDynamics().parameters.frontCorneringStiffness));
}
const html = read('index.html');
const order = [...html.matchAll(/<script src="([^"?]+)/g)].map(m => m[1]);
const first = order.indexOf('shared/dmath.js');
assert.ok(first >= 0, 'index.html must load shared/dmath.js');
for (const file of ['shared/vehicle-spec.js', 'campus.js', 'shared/track-document.js', 'shared/terrain.js', 'shared/track-objects.js', 'vehicle.js'])
  assert.ok(order.indexOf(file) > first, `${file} must load after shared/dmath.js`);
const editor = read('tools/track-editor/editor.html');
assert.ok(editor.indexOf('shared/dmath.js') >= 0 && editor.indexOf('shared/dmath.js') < editor.indexOf('shared/vehicle-spec.js'), 'editor must load dmath.js first');
assert.ok(require('../scripts/build.cjs').gameFiles.includes('shared/dmath.js'), 'build must ship shared/dmath.js');

console.log('dmath: deterministic math matches native within 2 ulps, fingerprint and physics scenario identical to the browser recording.');
