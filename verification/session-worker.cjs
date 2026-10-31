// Dedicated-worker reference for local comparisons; production uses pool-worker.cjs.
const {parentPort}=require('node:worker_threads');
const {createWorld,revision}=require('./world.cjs');
const {world,api}=createWorld();
const recorder=new (require('./replay.cjs').Recorder)(world,revision);
parentPort.postMessage({ready:true,result:world.result()});
parentPort.on('message',async({id,inputs})=>{
 const start=performance.now();
 try{
  const laps=[];let physicsMs=0,replayMs=0;
  for(const value of inputs){
   const before=performance.now(),event=world.step(api.decode(value));physicsMs+=performance.now()-before;
   const recordStart=performance.now(),recording=recorder.step(value,event);
   if(event.completed)laps.push({...event.completed,replay:await recording});
   replayMs+=performance.now()-recordStart;
  }
  parentPort.postMessage({id,result:world.result(),laps,physicsMs,replayMs,wallMs:performance.now()-start});
 }catch(error){parentPort.postMessage({id,error:error.message});}
});
