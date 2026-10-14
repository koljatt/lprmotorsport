const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const context={window:{LPRVehicleSpec:require('../shared/vehicle-spec.js')}};
vm.createContext(context);vm.runInContext(fs.readFileSync(path.join(__dirname,'../renderer3d.js'),'utf8'),context);
const renderer=Object.create(context.window.LPRRenderer3D.prototype);
const uploads=[],draws=[];
renderer.gl={UNSIGNED_INT:5125,UNSIGNED_SHORT:5123,TRIANGLES:4,ELEMENT_ARRAY_BUFFER:34963,STATIC_DRAW:35044,
  createBuffer:()=>({}),getExtension:()=>({}),bindBuffer(){},bufferData:(_,data)=>uploads.push(data),
  drawArrays:(_,start,count)=>draws.push({fallback:true,count}),drawElements:(_,count,type)=>draws.push({count,type})};
const tri=(x,y,z)=>[x,y,z,1,1,1,x+2,y,z,1,1,1,x,y+2,z+2,1,1,1];
const source=new Float32Array([...tri(100,0,0),...tri(-1000,0,0),...tri(1000,0,1000)]);
const spatial=renderer.makeSpatialMesh(source);
assert.deepEqual(uploads.flatMap(data=>Array.from(data)).sort((a,b)=>a-b),[0,1,2,3,4,5,6,7,8],
  'All original vertices and triangles remain indexed exactly once');
assert.equal(spatial.chunks.length,3);
const view=(camera=[0,0,0],forward=[1,0,0],right=[0,0,1],up=[0,1,0],focal=1,aspect=1)=>{
  renderer.viewFrustum=renderer.makeViewFrustum(camera,forward,right,up,focal,aspect);
};
view();renderer.drawSpatialMesh(spatial,9);
assert.equal(draws.reduce((sum,draw)=>sum+draw.count,0),6,'Behind-camera triangles are not submitted');
assert(!renderer.boundsVisible([-1000,0,0,-990,10,10]));
assert(renderer.boundsVisible([-10,-10,-10,10,10,10]),'Camera inside a box never hides it');
assert(renderer.boundsVisible([-100,-10,-10,100,10,10]),'Triangles/boxes crossing the near plane remain visible');
assert(renderer.boundsVisible([100,0,99,110,10,120]),'Objects intersecting the screen edge remain visible');
assert(!renderer.boundsVisible([5000,0,0,5010,10,10]),'Only geometry beyond the shader far plane is excluded');
assert(renderer.boundsVisible([100,80,0,120,160,20]),'Tall objects retain their full vertical extent');
for(const aspect of [.5,2.2]) for(const yaw of [-2.4,0,.9]) for(const pitch of [-.2,.15]) {
  const c=Math.cos(yaw),s=Math.sin(yaw),cp=Math.cos(pitch),sp=Math.sin(pitch);
  const camera=[500,25,900],forward=[c*cp,sp,s*cp],right=[-s,0,c],up=[-c*sp,cp,-s*sp];
  view(camera,forward,right,up,1.3,aspect);
  for(const depth of [1.1,20,500,1999]) for(const horizontal of [-.99,0,.99]) for(const vertical of [-.99,0,.99]) {
    const point=camera.map((v,i)=>v+forward[i]*depth+right[i]*horizontal*depth*aspect/1.3+up[i]*vertical*depth/1.3);
    assert(renderer.boundsVisible([...point,...point]),'Every projected on-screen point must be retained');
  }
}
view();const moved=new Float32Array(tri(200,0,0));
renderer.expandSpatialBounds(spatial,18,moved);draws.length=0;renderer.drawSpatialMesh(spatial,9);
assert.equal(draws.reduce((sum,d)=>sum+d.count,0),9,'Moved/deformed geometry extends its original cell');
renderer.viewFrustum=null;draws.length=0;renderer.drawSpatialMesh(spatial,9);
assert.deepEqual(draws,[{fallback:true,count:9}],'Interior views retain the complete-mesh path');
const large=renderer.makeSpatialMesh(new Float32Array(65538*6));
assert.equal(large.type,renderer.gl.UNSIGNED_INT);
assert.equal(uploads.at(-1).constructor.name,'Uint32Array');
assert.equal(uploads.at(-1).at(-1),65537,'Large vertex offsets never overflow 16-bit indices');
renderer.indexUint32=false;
assert.equal(renderer.makeSpatialMesh(new Float32Array(65538*6)),null);
draws.length=0;view();renderer.drawSpatialMesh(null,65538);
assert.deepEqual(draws,[{fallback:true,count:65538}]);
console.log('PASS: complete triangle coverage, conservative frustum culling, portrait/landscape/turning/pitch, moving obstacles, interior and older-GPU fallback');
