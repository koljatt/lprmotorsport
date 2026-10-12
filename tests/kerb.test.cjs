const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../vehicle.js'),'utf8'),context);
const dynamics=new context.window.VehicleDynamics();
const road={halfWidth:33,kerbOuter:39};
assert.equal(dynamics.kerbHeight(32,0,road),0);
assert.equal(dynamics.kerbHeight(40,0,road),0);
assert(dynamics.kerbHeight(36,0,road)>dynamics.kerbHeight(36,2.25,road));
assert(dynamics.kerbHeight(33.01,0,road)<.001);
function run(hz,speed) {
  const car={vx:speed,longitudinalG:0,lateralG:0,roadHeights:[0,0,0,0]};
  dynamics.createSuspension(car);
  let peak=0,loadMin=Infinity,loadMax=0;
  for(let i=0;i<hz*2;i++) {
    const time=i/hz;
    car.roadHeights=[0,1,2,3].map(index=>index%2 && time<1 ?
      dynamics.kerbHeight(36,(speed*time-(index>1?1.63:0))*10,road):0);
    dynamics.stepSuspension(car,1/hz);
    assert([car.suspension.heave,car.suspension.pitch,car.suspension.roll].every(Number.isFinite));
    if(time<1) {
      peak=Math.max(peak,Math.abs(car.suspension.roll));
      loadMin=Math.min(loadMin,car.suspension.wheels[1].load);
      loadMax=Math.max(loadMax,car.suspension.wheels[1].load);
    }
  }
  assert(peak>.005,'One-sided kerbs must rock the body');
  assert(loadMax-loadMin>100,'Kerbs must change actual tyre loads');
  assert(Math.abs(car.suspension.heave)<.002,'Body must settle after leaving kerb');
  assert(Math.abs(car.suspension.roll)<.002,'Roll must settle after leaving kerb');
  return peak;
}
for(const speed of [5,15,30]) for(const hz of [90,180]) run(hz,speed);
const parked={vx:0,roadHeights:[0,.06,0,.06]};
for(let i=0;i<360;i++) dynamics.stepSuspension(parked,1/180);
assert(Math.abs(parked.suspension.heaveVelocity)<.001,'Stationary car must stop vibrating');
// A kerb can briefly lift all four tyres. Braking must remain defined when
// there is no contact load, including with neither pedal pressed.
for(const speed of [0,15,30]) for(const brake of [0,1]) {
  const car={x:0,y:0,angle:0};
  dynamics.reset(car);
  car.vx=speed;
  dynamics.createSuspension(car);
  car.suspension.wheels.forEach(w=>{w.load=0;});
  dynamics.step(car,{gas:0,brake,steer:0},1/90,0);
  for(const key of ['x','y','angle','vx','vy','speed','lateralG','longitudinalG'])
    assert(Number.isFinite(car[key]),`Airborne ${key} must remain finite (speed=${speed}, brake=${brake})`);
}
console.log('PASS: kerb profile, wheel loads, speed range, settling, stationary and airborne contact');
