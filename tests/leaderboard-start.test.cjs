const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const nodes=new Map(),submissions=[],mediaHandlers=[];let requiresName=true,startedSessions=0;
const timers=new Map();let nextTimer=0;
const element=id=>{
  if(!nodes.has(id)){const handlers={};nodes.set(id,{tagName:'DIV',open:false,value:'',classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},setAttribute(){},querySelector:element,
    addEventListener:(type,handler)=>{handlers[type]=handler},click(){handlers.click?.()},showModal(){this.open=true},close(){this.open=false;handlers.close?.()},clientWidth:800});}
  return nodes.get(id);
};
const ctx={URLSearchParams,window:{LPRVehicleSpec:require('../shared/vehicle-spec.js'),location:{search:''},screen:{},addEventListener(){},
  matchMedia:()=>({matches:false,addEventListener:(type,handler)=>mediaHandlers.push(handler)}),
  LPRLeaderboard:{get requiresName(){return requiresName},beginSession(){startedSessions++;element('#settings-dialog').showModal()},submit:(ms,sectors)=>submissions.push({ms,sectors})}},
  document:{hidden:false,querySelector:element,querySelectorAll:()=>[],addEventListener(){}},performance:{now:()=>1000},navigator:{},
  localStorage:{getItem:()=>null,setItem(){}},setTimeout(fn,ms){const id=++nextTimer;timers.set(id,{fn,ms});return id},clearTimeout(id){timers.delete(id)},requestAnimationFrame(){},ResizeObserver:class{observe(){}},
  LPRRenderer3D:class{constructor(){this.saunaStop={x:900,y:650}}resize(){}updatePeople(){}}};
vm.createContext(ctx);
for(const file of ['audio.js','sauna.js','vehicle.js','campus.js','sale.js','timing.js'])vm.runInContext(read(file),ctx);
for(const name of ['LPRGameAudio','LPRCampus','LPRSaunaLife','VehicleDynamics','LPRLapTiming'])ctx[name]=ctx.window[name];
const source=read('game.js').replace('  reset();\n  openTestScene',
 '  globalThis.test={get car(){return car},held,update,dynamics,reset,showSector,toggleSauna,toggleSale,togglePool};\n  reset();\n  openTestScene');
ctx.window.LPRLeaderboard.beginSession(); // leaderboard.js runs before game.js.
vm.runInContext(source,ctx);const game=ctx.test,dialog=element('#settings-dialog');
assert.equal(startedSessions,1);assert(dialog.open);
game.held.gas=true;game.update(0,1500);assert.equal(game.car.started,false,'Startup dialog prevents the first lap from starting');
element('#close-settings').click();assert(dialog.open,'Close button cannot bypass nickname selection');
for(const handler of mediaHandlers)handler({matches:true});assert(dialog.open,'Rotating the phone cannot bypass nickname selection');
requiresName=false;dialog.close();game.update(0,2000);
assert(game.car.started);assert.equal(game.car.lapStart,2000);assert(!game.car.onlineInvalid,'Initial naming does not invalidate the first lap');
// Move through the genuine gate/sector logic without replacing scoring or submission.
game.dynamics.step=()=>{};
const track=ctx.window.LPRCampus.track;
for(const [index,time] of [[65,12000],[125,22000],[185,27000],[0,42000]]){
  game.car.x=track[index].x;game.car.y=track[index].y;game.car.speed=10;
  game.update(0,time);
}
assert.equal(submissions.length,1,'The very first complete valid lap is submitted');
assert.equal(submissions[0].ms,40000);
assert.deepEqual(Array.from(submissions[0].sectors),[10000,10000,20000]);
assert.equal(game.car.lap,2);
// A complete lap with sauna, pool and shop visits remains eligible.
game.reset();game.held.gas=true;game.update(0,50000);
for(const [toggle,position,time] of [
  ['toggleSauna',{x:900,y:650},55000],
  ['togglePool',{x:864,y:668},60000],
  ['toggleSale',ctx.window.LPRSale.entrance,65000]
]) {
  game.car.x=position.x;game.car.y=position.y;game.car.speed=0;
  game[toggle]();assert(!game.car.onlineInvalid,`${toggle} does not invalidate the lap`);
  game.update(.05,time);assert.equal(game.car.lapStart,50000,'Visit time is not subtracted');
  assert.equal(game.car.lapElapsedMs,time-50000);
  game[toggle]();
}
for(const [index,time] of [[65,75000],[125,85000],[185,90000],[0,105000]]) {
  game.car.x=track[index].x;game.car.y=track[index].y;game.car.speed=10;game.update(0,time);
}
assert.equal(submissions.length,2,'Visited lap submits normally');
assert.equal(submissions[1].ms,55000,'Full wall-clock time, including visits, is submitted');
console.log('PASS: mandatory startup pauses racing, orientation/close cannot skip naming, and the first lap submits through real scoring');

game.reset();game.showSector(1000);
assert.equal(element('#sector-time').hidden,false);
let timer=[...timers.values()].find(t=>t.ms===3000);assert(timer,'Sector expires after three wall-clock seconds');
game.showSector(2000);assert.equal([...timers.values()].filter(t=>t.ms===3000).length,1,'New split replaces the previous expiry');
timer=[...timers.values()].find(t=>t.ms===3000);timer.fn();assert.equal(element('#sector-time').hidden,true);
game.reset();assert(![...timers.values()].some(t=>t.ms===3000),'Restart clears pending sector expiry');
