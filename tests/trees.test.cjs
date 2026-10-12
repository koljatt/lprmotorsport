const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function createCampus() {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../campus.js'), 'utf8'), context);
  return context.window.LPRCampus;
}

const campus = createCampus();
const trees = campus.trees;
const species = ['pine', 'birch', 'broadleaf'];
assert(trees.length >= 170, 'Roadside woods should have enough trees to read as forest');
assert(trees.length <= 2600, 'Forest density should stay limited to selected woodland bands');
assert.deepEqual([...new Set(trees.map(tree => tree.species))].sort(), [...species].sort());
const lakeOutline = [[590,80],[1050,80],[1050,520],[850,480],[780,400],[745,330],[715,240]]
  .map(([x,y]) => campus.world(x,y));
const inLake = (x,y) => {
  let inside=false;
  for(let i=0,j=lakeOutline.length-1;i<lakeOutline.length;j=i++) {
    const a=lakeOutline[i],b=lakeOutline[j];
    if((a.y>y)!==(b.y>y) && x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x) inside=!inside;
  }
  return inside;
};
for (const type of species) {
  assert(trees.filter(tree => tree.species === type).length >= 25,
    `The roadside mix should include enough ${type} trees`);
}
for (const tree of trees) {
  assert(!inLake(tree.x,tree.y), 'Trees must not be placed in the lake');
  assert(tree.height >= 80 && tree.height <= 200, 'Trees should match local mature-tree scale');
  assert(tree.canopyRadius >= 20 && tree.canopyRadius <= 52);
  assert(tree.trunkWidth >= 2.4 && tree.trunkWidth <= 6);
  assert(tree.color.every(channel => channel >= 0 && channel <= 1));
  const trackClearance = campus.track.reduce((nearest, point, index) => {
    const next = campus.track[(index + 1) % campus.track.length];
    const dx = next.x - point.x, dy = next.y - point.y;
    const t = Math.max(0, Math.min(1,
      ((tree.x - point.x) * dx + (tree.y - point.y) * dy) / (dx * dx + dy * dy)));
    return Math.min(nearest, Math.hypot(
      tree.x - (point.x + dx * t),
      tree.y - (point.y + dy * t)
    ));
  }, Infinity);
  assert(trackClearance >= tree.canopyRadius + campus.road.shoulderOuter + 15,
    'Tree canopies must remain clear of the road and shoulder');
}
assert.equal(JSON.stringify(trees), JSON.stringify(createCampus().trees),
  'Tree species, sizes and positions should stay deterministic');

console.log('PASS: dense, deterministic campus mix of mature pine, birch and broadleaf trees');
