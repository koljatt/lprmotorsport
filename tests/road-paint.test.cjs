const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = { window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), } };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'renderer3d.js'), 'utf8'), context);
let vertices, pixels, mipmaps = 0;
const gl = {
  ARRAY_BUFFER:34962, ELEMENT_ARRAY_BUFFER:34963,
  createBuffer: () => ({}), createTexture: () => ({}),
  bindBuffer() {}, bindTexture() {}, texParameteri() {},
  bufferData: (target, data) => { if(target===gl.ARRAY_BUFFER) vertices = data; },
  texImage2D: (...args) => { pixels = args.at(-1); },
  generateMipmap: () => { mipmaps++; }, getExtension: () => null
};
const renderer = Object.create(context.window.LPRRenderer3D.prototype);
renderer.gl = gl;
// A right-angle bend makes an endpoint-only dash visibly cut the corner.
const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
renderer.makeRoadPaint(points, (i, offset, height) =>
  [points[i].x, height, points[i].y + offset], 31);
assert.equal(mipmaps, 1);
assert.equal(pixels.length, 128 * 256 * 4);
assert(vertices.every(Number.isFinite));
assert.equal(renderer.roadPaintMesh.count, vertices.length / 8);
const alpha = Array.from(pixels).filter((_, i) => i % 4 === 3);
assert(alpha.some(value => value === 0), 'Transparent edges expose asphalt');
assert(alpha.some(value => value > 200), 'Paint remains legible');
assert(alpha.some(value => value > 0 && value < 100), 'Chips and feathered edges');
const center = [];
for (let i = 0; i < vertices.length; i += 48) {
  if (vertices[i + 3] < .95) center.push(vertices.slice(i, i + 48));
}
assert.equal(center.length, 2, 'The dash is split at the bend');
for (const trianglePair of center) {
  assert(Math.abs(trianglePair[0] - trianglePair[8]) < 1e-6 ||
    Math.abs(trianglePair[2] - trianglePair[10]) < 1e-6,
  'Each piece follows one road segment');
}
console.log('PASS: road paint coverage, wear, mipmaps and curved dash segmentation');
