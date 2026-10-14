const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const read=name=>fs.readFileSync(path.join(__dirname,'..',name),'utf8');
const nodes=new Map(),submissions=[],mediaHandlers=[];let requiresName=true,startedSessions=0;
const element=id=>{
  if(!nodes.has(id)){const handlers={};nodes.set(id,{tagName:'DIV',open:false,value:'',classList:{add(){},remove(){},toggle(){}},style:{setProperty(){}},setAttribute(){},querySelector:element,
    addEventListener:(type,handler)=>{handlers[type]=handler},click(){handlers.click?.()},showModal(){this.open=true},close(){this.open=false;handlers.close?.()},clientWidth:800});}
  return nodes.get(id);
};
const ctx={URLSearchParams,window:{LPRVehicleSpec:require('../shared/vehicle-spec.js'),location:{search:''},screen:{},addEventListener(){},
  matchMedia:()=>({matches:false,addEventListener:(type,handler)=>mediaHandlers.push(handler)}),
  LPRLeaderboard:{get requiresName(){return requiresName},beginSession(){startedSessions++;element('#settings-dialog').showModal()},submit:(ms,sectors)=>submissions.push({ms,sectors})}},
  document:{hidden:false,querySelector:element,querySelectorAll:()=>[],addEventListener(){}},performance:{now:()=>1000},navigator:{},
  localStorage:{getItem:()=>null,setItem(){}},setTimeout(){},clearTimeout(){},requestAnimationFrame(){},ResizeObserver:class{observe(){}},
  LPRRenderer3D:class{constructor(){this.saunaStop={x:900,y:650}}resize(){}updatePeople(){}}};
vm.createContext(ctx);
for(const file of ['audio.js','sauna.js','vehicle.js','campus.js','sale.js','timing.js'])vm.runInContext(read(file),ctx);
for(const name of ['LPRGameAudio','LPRCampus','LPRSaunaLife','VehicleDynamics','LPRLapTiming'])ctx[name]=ctx.window[name];
const source=read('game.js').replace('  reset();\n  openTestScene',
 '  globalThis.test={get car(){return car},held,update,dynamics};\n  reset();\n  openTestScene');
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
console.log('PASS: mandatory startup pauses racing, orientation/close cannot skip naming, and the first lap submits through real scoring');
