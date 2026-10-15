const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const path=require('node:path');
const context={window:{LPRVehicleSpec:require('../shared/vehicle-spec.js')}};
vm.createContext(context);
for(const file of ['campus.js','renderer3d.js']) vm.runInContext(fs.readFileSync(path.join(__dirname,'..',file),'utf8'),context);
const makeRenderer=()=>{
  const renderer=Object.create(context.window.LPRRenderer3D.prototype);
  let bound;const buffers=new Map(),uniforms={};
  renderer.uploads=[];renderer.draws=[];renderer.deleted=[];
  renderer.gl=new Proxy({STATIC_DRAW:1,DYNAMIC_DRAW:2},{get:(target,key)=>target[key] ?? ({
    createBuffer:()=>({}),deleteBuffer:b=>renderer.deleted.push(b),
    bindBuffer:(_,b)=>{bound=b},bufferData:(_,data,usage)=>{buffers.set(bound,new Float32Array(data));renderer.uploads.push({usage,bytes:data.byteLength})},
    uniform1i:(name,value)=>{uniforms[name]=value},uniform1f:(name,value)=>{uniforms[name]=value},
    uniform3f:(name,...values)=>{uniforms[name]=values},
  }[key] || (()=>{}))});
  renderer.locations=Object.fromEntries(['meshTransform','meshOrigin','meshForward','meshUp','meshRight','meshFloor'].map(k=>[k,k]));
  // bindMesh binds the vertex buffer; normal setup must not change its attribute source.
  let vertexBuffer;
  renderer.bindMesh=b=>{vertexBuffer=b};
  renderer.gl=new Proxy(renderer.gl,{get:(target,key)=>key==='drawArrays'?()=>{
    if(uniforms.meshTransform)renderer.draws.push({data:buffers.get(vertexBuffer),uniforms:structuredClone(uniforms)});
  }:target[key]});
  renderer.wheelPhase=0;
  return renderer;
};
const world=(draw,i)=>{
  const d=draw.data,u=draw.uniforms;
  return [0,1,2].map(axis=>{
    const value=u.meshOrigin[axis]+u.meshForward[axis]*d[i]+u.meshUp[axis]*d[i+1]+u.meshRight[axis]*d[i+2];
    return axis===1?Math.max(value,u.meshFloor):value;
  });
};
const car={x:100,y:200,angle:0,vx:12,steerAngle:0};
const renderer=makeRenderer();
renderer.vehiclePose=renderer.updateSuspension(car,0);renderer.drawWheels(car,0);
assert.equal(renderer.vehicleParts.size,10,'Body, wing and two parts for each wheel are cached');
const legacy=makeRenderer();legacy.locations={};legacy.vehiclePose=legacy.updateSuspension(car,0);legacy.drawWheels(car,0);
assert.equal([...renderer.vehicleParts.values()].reduce((sum,part)=>sum+part.count,0)+renderer.uploads.at(-1).bytes/24,
  legacy.uploads.at(-1).bytes/24,'Caching retains every vertex of the original detailed vehicle');
const initialParts=[...renderer.vehicleParts.values()];
for(const [index,state] of [
  {...car,x:340,y:180,angle:.85,steerAngle:.3},
  {...car,x:500,y:310,angle:-1.8,steerAngle:-.2,suspension:{pitch:.025,roll:-.02,heave:.03,centreHeight:2,wheels:[{z:.02,road:.04,travel:.01},{z:-.01,road:0},{z:.03,road:.02},{z:0,road:0}]}},
].entries()) {
  renderer.uploads=[];renderer.draws=[];
  renderer.vehiclePose=renderer.updateSuspension(state,0);renderer.drawWheels(state,100+index*17);
  assert(renderer.uploads.every(u=>u.usage===2),'Moving, steering and suspension must not upload rigid meshes again');
  assert(renderer.uploads.reduce((sum,u)=>sum+u.bytes,0)<500000,'Per-frame vehicle uploads stay below 0.5 MB');
  assert.deepEqual([...renderer.vehicleParts.values()],initialParts);
  const fresh=makeRenderer();fresh.wheelPhase=renderer.wheelPhase;
  fresh.vehiclePose=fresh.updateSuspension(state,0);fresh.drawWheels(state,0);
  assert.equal(renderer.draws.length,10);
  for(let part=0;part<10;part++) {
    const a=renderer.draws[part],b=fresh.draws[part];assert.equal(a.data.length,b.data.length);
    // Retain panels, tyre/rim silhouettes and rotating text to within 1 mm.
    // Cylindrical trim can choose a different seam when generated at a tilted pose.
    const colors=part<2?[[.055,.075,.065],[.035,.62,.23]]:part%2===0?[[.075,.085,.09],[.38,.42,.43]]:[[.75,.73,.60],[.86,.88,.85]];
    let compared=0;
    for(let i=0;i<a.data.length;i+=6) {
      if(!colors.some(color=>color.every((v,j)=>Math.abs(a.data[i+3+j]-v)<1e-6)))continue;
      const pa=world(a,i),pb=world(b,i);
      pa.forEach((v,axis)=>assert(Math.abs(v-pb[axis])<.01,`Part ${part} vertex ${i} axis ${axis}: ${v} vs ${pb[axis]} follows pose/spin/road height`));compared++;
    }
    assert(compared>0);
  }
}
// Inspect rendered front-tyre bases at full lock, independent of the geometry helper.
for(const direction of [-1,1]) {
  const rack=direction*context.window.LPRVehicleSpec.maxRoadWheelAngle;
  renderer.draws=[];
  renderer.drawWheels({...car,steerAngle:rack},190);
  const front=renderer.draws.slice(2,6).filter((_,i)=>i%2===0).map(draw=>{
    const right=draw.uniforms.meshRight;
    return Math.atan2(-right[0],right[2]);
  });
  assert.equal(front.length,2);
  assert(direction>0 ? Math.abs(front[1])>Math.abs(front[0]) : Math.abs(front[0])>Math.abs(front[1]),
    'Rendered inside tyre turns more than the outside tyre');
  assert(Math.abs(context.window.LPRVehicleSpec.wheelbase/Math.tan(front[0])-
    context.window.LPRVehicleSpec.wheelbase/Math.tan(front[1])-context.window.LPRVehicleSpec.trackWidth)<1e-10,
    'Rendered tyre axes share the turn centre');
}
renderer.drawWheels({...car,damage:.3,impactSide:-1},200);
assert.equal(renderer.deleted.length,20,'Damage disposes all superseded GPU buffers');
assert.notEqual([...renderer.vehicleParts.values()][0],initialParts[0]);
renderer.drawWheels(car,217);
assert.equal(renderer.deleted.length,40,'Reset rebuilds undamaged geometry');
console.log('PASS: cached body/wheels preserve pose, steering, spin, terrain contact, detail and damage/reset; warm frames upload only dynamic suspension');
