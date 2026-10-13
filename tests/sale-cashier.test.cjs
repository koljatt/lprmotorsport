const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = {window: { LPRVehicleSpec: require('../shared/vehicle-spec.js'), LPRCampus:{world:(x,y)=>({x,y})}}};
vm.createContext(context);
for(const file of ['sale.js','renderer3d.js'])
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const sale=context.window.LPRSale,body=[],face=[];
let capturing=false,stationBoxes=0;
sale.buildInterior({
  box(x,y,z,w,h,d,color) {
    if(!capturing) { stationBoxes++; return; }
    for(const dx of [-w/2,w/2]) for(const dy of [0,h]) for(const dz of [-d/2,d/2])
      body.push(x+dx,y+dy,z+dz,...color);
  },
  quad(a,b,c,d,color) {
    if(capturing) for(const point of [a,b,c,a,c,d]) body.push(...point,...color);
  },
  cashierGeometry(build) { capturing=true; build(); capturing=false; },
  cashierFace(points,uv) {
    assert(capturing,'All face and shirt artwork must belong to the moving character');
    for(const i of [0,1,2,0,2,3]) face.push(...points[i],1,1,1,...uv[i]);
  }
});
assert(stationBoxes>0 && body.length>0 && face.length>0);
assert(body.some((value,i)=>i%6===1 && value===0),'Feet must be part of the moving character');
const renderer=Object.create(context.window.LPRRenderer3D.prototype);
const mesh=(vertices,stride)=>({buffer:{},vertices:new Float32Array(vertices),
  posedVertices:new Float32Array(vertices),count:vertices.length/stride,ready:true});
renderer.saleCashierBody=mesh(body,6);
renderer.saleCashier=mesh(face,8);
let uploads=0,bodyDraws=0,faceDraws=0;
renderer.gl={bindBuffer(){},bufferSubData(){uploads++;},drawArrays(){bodyDraws++;}};
renderer.bindMesh=()=>{};
renderer.drawKerbs=()=>{faceDraws++;};
const cx=-6000+sale.checkout.cashierX,cz=sale.checkout.cashierZ;
for(const [dx,dz] of [[40,0],[0,40],[-40,0],[0,-40],[80,-150],[40,0]]) {
  const car={saleX:sale.checkout.cashierX+dx,saleZ:cz+dz};
  renderer.drawSaleCashier(car);
  const cos=dx/Math.hypot(dx,dz),sin=dz/Math.hypot(dx,dz);
  for(const [m,stride] of [[renderer.saleCashierBody,6],[renderer.saleCashier,8]]) {
    for(let i=0;i<m.vertices.length;i+=stride) {
      const x=m.vertices[i]-cx,z=m.vertices[i+2]-cz;
      assert(Math.abs(m.posedVertices[i]-(cx+x*cos-z*sin))<.001);
      assert(Math.abs(m.posedVertices[i+2]-(cz+x*sin+z*cos))<.001);
      for(let j=1;j<stride;j++) if(j!==2)
        assert.equal(m.posedVertices[i+j],m.vertices[i+j],'Height, colors and UVs stay attached');
    }
  }
  // The front of the face and chest must point toward the player's position.
  const source=renderer.saleCashier.vertices,target=renderer.saleCashier.posedVertices;
  let x=0,z=0;
  for(let i=0;i<source.length;i+=8) { x+=target[i]-cx; z+=target[i+2]-cz; }
  assert(x*dx+z*dz>0,'Face and chest must face the player in every aisle');
  const previousUploads=uploads;
  renderer.drawSaleCashier(car);
  assert.equal(uploads,previousUploads,'Stationary players must not trigger redundant buffer uploads');
}
assert.equal(bodyDraws,12);
assert.equal(faceDraws,12);
console.log('PASS: cashier face, chest and solid body follow the player in all directions without pose drift');
