// Previous one-session-per-worker executor, used only for before/after measurements.
const {Worker}=require('node:worker_threads'),path=require('node:path');
const fail=(code,message)=>Object.assign(Error(message),{status:410,code});
class DedicatedExecutor {
 constructor({onLost=()=>{}}={}){this.entries=new Map();this.onLost=onLost;this.nextId=0;this.closed=false;}
 create(id){
  const worker=new Worker(path.resolve(__dirname,'../verification/session-worker.cjs'),{resourceLimits:{maxOldGenerationSizeMb:128}});
  return new Promise((resolve,reject)=>{
   const e={worker,pending:null,initReject:reject,dead:false};this.entries.set(id,e);
   const lost=()=>{if(e.dead)return;e.dead=true;clearTimeout(e.timer);this.entries.delete(id);e.initReject?.(fail('worker_lost','Worker stopped'));if(e.pending){clearTimeout(e.pending.timer);e.pending.reject(fail('worker_lost','Worker stopped'));}this.onLost(id);};
   e.timer=setTimeout(()=>{reject(Error('Initialization timeout'));void worker.terminate();},20000);
   worker.on('message',m=>{if(m.ready){clearTimeout(e.timer);e.initReject=null;resolve(m);}else if(e.pending&&m.id===e.pending.id){const p=e.pending;e.pending=null;clearTimeout(p.timer);m.error?p.reject(Error(m.error)):p.resolve(m);}});
   worker.once('error',lost);worker.once('exit',lost);
  });
 }
 inputs(id,inputs){const e=this.entries.get(id);return new Promise((resolve,reject)=>{
  if(!e)return reject(fail('session_lost','Session stopped'));
  const requestId=++this.nextId,timer=setTimeout(()=>{reject(Error('Input timeout'));void e.worker.terminate();},10000);
  e.pending={id:requestId,resolve,reject,timer};e.worker.postMessage({id:requestId,inputs});
 });}
 release(id){const e=this.entries.get(id);if(!e)return Promise.resolve();e.dead=true;clearTimeout(e.timer);e.initReject?.(fail('session_closed','Session stopped'));if(e.pending){clearTimeout(e.pending.timer);e.pending.reject(fail('session_closed','Session stopped'));}this.entries.delete(id);return e.worker.terminate();}
 snapshot(){return {mode:'dedicated-reference',workers:this.entries.size,sessions:this.entries.size};}
 async close(){await Promise.all([...this.entries.keys()].map(id=>this.release(id)));}
}
module.exports={DedicatedExecutor};
