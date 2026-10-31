// Retained simulation memory in fresh processes: isolated worlds vs one shared
// track factory. This does not change the production one-session-per-thread model.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'),{createHash}=require('node:crypto');
const {createWorldFactory,createIsolatedWorld,revision}=require('../verification/world.cjs');
function child(variant,count){
 global.gc();global.gc();const before=process.memoryUsage(),cpu=process.cpuUsage(),started=performance.now();
 const factory=variant==='shared'?createWorldFactory():null,worlds=[];
 for(let i=0;i<count;i++)worlds.push(factory?factory.create():createIsolatedWorld());
 const createMs=performance.now()-started,usage=process.cpuUsage(cpu);
 global.gc();global.gc();const after=process.memoryUsage();
 const hash=createHash('sha256');
 for(const w of worlds){
  hash.update(JSON.stringify(w.world.result()));
  hash.update(JSON.stringify(w.campus.bodies.map(b=>[b.kind,b.mass,b.x,b.y,b.angle,b.width,b.depth,b.damage,b.vx,b.vy,b.spin,b.spawn,b.dents])));
 }
 return {variant,worlds:count,createMs,cpuMs:(usage.user+usage.system)/1000,
  retainedHeapBytes:after.heapUsed-before.heapUsed,memoryBytes:{before,after},hash:hash.digest('hex'),
  sharedTrack:count>1&&worlds[0].world.track===worlds[1].world.track,
  sharedIndex:count>1&&worlds[0].campus.collisionIndex===worlds[1].campus.collisionIndex&&!!worlds[0].campus.collisionIndex};
}
if(process.argv[2]==='--child')console.log(JSON.stringify(child(process.argv[3],Number(process.argv[4]))));
else{
 try{
  const rows=[];
  for(const count of [1,2,4,8,16]){
   const row={worlds:count};
   for(const variant of count%4?['isolated','shared']:['shared','isolated']){
    const result=spawnSync(process.execPath,['--expose-gc',__filename,'--child',variant,String(count)],{encoding:'utf8',timeout:180000,maxBuffer:1048576});
    if(result.status!==0)throw Error(result.stderr||result.error?.message||'Memory benchmark failed');
    row[variant]=JSON.parse(result.stdout);
   }
   assert.equal(row.isolated.hash,row.shared.hash);
   row.heapReductionPercent=100*(1-row.shared.retainedHeapBytes/row.isolated.retainedHeapBytes);
   rows.push(row);
  }
  const report={generatedAt:new Date().toISOString(),revision,node:process.version,
   scope:'Local retained JavaScript heap and initialization costs in fresh Node processes after explicit GC. Multiple worlds in one thread. Production still uses one session per worker; these savings require the later worker-pool stage. Not a Render capacity claim.',rows};
  const directory=path.resolve(__dirname,'../artifacts/verification');fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'shared-track-state-measurement.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
 }catch(error){console.error(error);process.exitCode=1;}
}
