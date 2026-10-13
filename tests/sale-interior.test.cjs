const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const context={window:{LPRCampus:{world:(x,y)=>({x,y})}}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../sale.js'),'utf8'),context);
const sale=context.window.LPRSale,faces=[],boxes=[],signs=new Set(),signFaces=[];
sale.buildInterior({box(...args){boxes.push(args);},artwork(id,points){signs.add(id);signFaces.push({id,points});},
  productFace(id,points){faces.push({id,points});}});
const bounds=points=>[0,1,2].map(axis=>[
  Math.min(...points.map(p=>p[axis])),Math.max(...points.map(p=>p[axis]))]);
const overlap=(a,b)=>Math.min(a[1],b[1])-Math.max(a[0],b[0])>.001;
// Intersecting coplanar artwork produces unstable depth ties as the camera moves.
for(let i=0;i<faces.length;i++) for(let j=i+1;j<faces.length;j++) {
  const a=bounds(faces[i].points),b=bounds(faces[j].points);
  for(const axis of [0,2]) {
    if(a[axis][1]-a[axis][0]>.001 || b[axis][1]-b[axis][0]>.001 ||
      Math.abs(a[axis][0]-b[axis][0])>.001) continue;
    assert(!(overlap(a[1],b[1]) && overlap(a[axis===0?2:0],b[axis===0?2:0])),
      `Coplanar packages overlap: ${faces[i].id} / ${faces[j].id}`);
  }
}
// Cabinet shelves must also clear the whole label, including its upper edge.
for(const {id,points} of faces.filter(face=>sale.products.find(p=>p.id===face.id).dairy)) {
  const [x,y,z]=bounds(points);
  for(const [bx,by,bz,w,h,d] of boxes) {
    if(w<10 || h>1) continue;
    assert(!(overlap(x,[bx-w/2,bx+w/2]) && overlap(y,[by,by+h]) &&
      z[0]>bz-d/2 && z[0]<bz+d/2),`Refrigerator shelf intersects ${id}`);
  }
}
for(const id of ['groceries','drinks','household','sweets','checkout','dairy'])
  assert(signs.has(id),`Missing department sign: ${id}`);
assert(!boxes.some(([x,y,z,w,h,d])=>x===-6003 && y===0 && z===-30 && w===70 && h===29 && d===180),
  'The central shelving must expose its decks rather than enclose products');
console.log('PASS: separated package artwork, refrigerator shelf clearance and department signs');
// Near-wall artwork is seen from inside the shop, looking toward increasing Z.
// An inverted winding mirrors every word even though the texture itself is right.
for(const id of ['sale','welcome','exit']) {
  const sign=signFaces.find(face=>face.id===id);
  assert(sign,`Missing customer-facing sign: ${id}`);
  assert(sign.points[1][0]<sign.points[0][0],`Mirrored customer-facing sign: ${id}`);
}
const till=signFaces.find(face=>face.id==='till');
assert(till && till.points[1][2]<till.points[0][2], 'Till screen must face the customer lane without mirrored text');
assert(signs.has('price-maito') && signs.has('price-kahvi'),
  'Shelf labels must distinguish products instead of repeating one generic price');
console.log('PASS: readable entrance and till signs, and product-specific shelf labels');

// Sight lines through the endcap gaps must hit a backing before the next aisle.
const blocksRay=(x,y,z0,z1)=>boxes.some(([bx,by,bz,w,h,d])=>
  x>bx-w/2 && x<bx+w/2 && y>by && y<by+h &&
  overlap([z0,z1],[bz-d/2,bz+d/2]));
for(const x of [-32,-26,23,29]) for(const y of [5,12,19,26,29.5]) {
  assert(blocksRay(-6000+x,y,56,59.5),'Front endcap must hide the opposite aisle between packages');
  assert(blocksRay(-6000+x,y,-119.5,-116),'Rear endcap must hide the opposite aisle between packages');
}
for(let z=-119;z<=59;z+=2) for(const y of [5,12,19,26,29.5]) {
  for(const side of [-1,1]) assert(boxes.some(([bx,by,bz,w,h,d])=>
    Math.abs(bx+6003-side*19)<1 && w<2 && y>by && y<by+h && z>=bz-d/2 && z<=bz+d/2),
    'Both shelf sides must have uninterrupted opaque backing');
}
const station=[];
sale.buildCheckout({b(...args){station.push(args)},q(){},artwork(){},cashierFace(){}});
const belt=station.find(([,y,,,h,,color])=>y===13.02 && h===.15 && color[0]===.065);
const scanner=station.find(([,y])=>y===13.24);
const packing=station.find(([,y,,,h,,color])=>y===13.02 && h===.15 && color[0]===.57);
assert(belt && scanner && packing,'Checkout must retain conveyor, scanner and packing area');
assert(belt[5]>belt[3],'Conveyor must run along the return aisle');
assert(belt[2]<scanner[2] && scanner[2]<packing[2], 'Conveyor must precede scanner and packing along the arrival direction');
console.log('PASS: opaque shelf backs and endcaps, and a lengthwise checkout with belt at the arrival end');
