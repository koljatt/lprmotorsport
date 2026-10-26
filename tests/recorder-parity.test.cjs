const assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{gunzipSync}=require('node:zlib');
const {createWorld}=require('../verification/world.cjs'),{Recorder}=require('../verification/replay.cjs'),{driver}=require('./helpers-driving.cjs');
(async()=>{
 const {world,api}=createWorld(),recorder=new Recorder(world,'recorder-parity'),hashes=[];
 // Captured with the previous synchronous recorder on c094c54, using the exact
 // same driving inputs. Hash JSON so gzip-library version differences do not matter.
 const expected=['0371e69915320dd39f0ea30345878dbb4b9fca2d711eccdb879b1eb3b689221b','e13530f1e848e459c3791c3387c8a8aa675ce176841eceaa2791485c81bc0405'];
 for(let tick=0;tick<24000;tick++){
  const input=driver(world),value=api.encode(input),event=world.step(input),recording=recorder.step(value,event);
  if(event.completed){
   const replay=await recording;assert(replay);assert.equal(createHash('sha256').update(replay.payload).digest('hex'),replay.hash);
   hashes.push(createHash('sha256').update(gunzipSync(Buffer.from(replay.payload,'base64'))).digest('hex'));
  }else assert.equal(recording,null);
 }
 assert.deepEqual(hashes,expected);assert.equal(world.ticks,24000);
 console.log('PASS: standing and flying lap recordings match the previous recorder exactly after decompression');
})().catch(e=>{console.error(e);process.exitCode=1;});
