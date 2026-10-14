const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

function createCampus() {
  const context = { window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../campus.js'), 'utf8'), context);
  return context.window.LPRCampus;
}

const campus = createCampus();
const trees = campus.trees;
const species = ['pine', 'birch', 'broadleaf'];
assert(trees.length >= 170, 'Roadside woods should have enough trees to read as forest');
assert(trees.length <= 428, 'Limit the forest to the closest roadside trees');
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

const context = {window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), LPRTrackData:{version:1,objects:[]}}};
vm.createContext(context);
for(const file of ['campus.js','shared/track-document.js','shared/track-objects.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
}
const geometry=context.window.LPRTreeGeometry;
const mesh=object=>{
  context.window.LPRTrackData={version:1,objects:[object]};
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../shared/track-objects.js'),'utf8'),context);
  const faces=[],shadows=[];
  context.window.LPRTrackObjects.build({quad:(...args)=>faces.push(args),groundShadow:(...args)=>shadows.push(args)});
  return {faces,shadows};
};
const object={type:'tree',x:2100,y:3300,angle:0,scale:1};
const base=mesh(object),profile=geometry.profile(object),local=[];
geometry.build([profile],{quad:(...args)=>local.push(args)},profile.seed);
assert(base.faces.length>200,'Added trees need detailed trunks, branches and crowns');
assert.equal(base.faces.length,local.length,'Editor trees must use the same geometry builder as campus trees');
base.faces.forEach((face,i)=>{
  for(let j=0;j<4;j++) {
    assert.equal(face[j][0],local[i][j][0]+object.x);
    assert.equal(face[j][1],local[i][j][1]);
    assert.equal(face[j][2],local[i][j][2]+object.y);
  }
  assert.deepEqual(face[4],local[i][4]);
});
assert.deepEqual(mesh(object),base,'Added tree detail must survive rebuilding without random changes');
const transformed=mesh({...object,angle:Math.PI/2,scale:2});
base.faces.forEach((face,i)=>{
  for(let j=0;j<4;j++) {
    const a=face[j],b=transformed.faces[i][j];
    assert(Math.abs(b[0]-(object.x-2*(a[2]-object.y)))<1e-9);
    assert.equal(b[1],a[1]*2);
    assert(Math.abs(b[2]-(object.y+2*(a[0]-object.x)))<1e-9);
  }
});
assert.equal(base.shadows.length,1,'Added trees must cast the same sun-projected ground shadow as campus trees');
assert.equal(transformed.shadows[0][4],base.shadows[0][4]*2);
const profiles=Array.from({length:30},(_,i)=>geometry.profile({...object,x:object.x+i}));
assert.equal(new Set(profiles.map(p=>p.species)).size,3,'Added trees should include the local pine, birch and broadleaf mix');
assert(profiles.every(p=>p.height>=80&&p.height<=200),'Added trees should have the mature scale of campus trees');
console.log('PASS: shared detailed editor trees, deterministic species, mature scale, rotation and sunlight shadows');
