const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {validate} = require('../shared/track-document.js');
const source = fs.readFileSync(require('node:path').join(__dirname, '../shared/track-sync.js'), 'utf8');
const doc = {version:1, objects:[{type:'barrier', x:100, y:100, angle:0, scale:1, length:25}]};
function setup(hostname='localhost') {
  const events = {};
  let reloads=0, requests=0, saved=doc, ok=true;
  const context = {
    window:{location:{hostname,reload(){reloads++;}},LPRTrackDocument:{validate},LPRTrackData:doc,
      addEventListener(name,fn){events[name]=fn;}},
    document:{hidden:false,addEventListener(name,fn){events[name]=fn;}},
    async fetch(url,options){
      assert.equal(url,'data/track-objects.json');
      assert.equal(options.cache,'no-store');
      requests++;
      return {ok,json:async()=>saved};
    }
  };
  vm.runInNewContext(source,context);
  return {context,events,get reloads(){return reloads;},get requests(){return requests;},
    set saved(value){saved=value;},set ok(value){ok=value;}};
}
(async()=>{
  const s=setup();
  await s.events.pageshow();
  assert.equal(s.reloads,0,'An unchanged saved track must preserve the drive');
  s.saved={...doc,objects:[{...doc.objects[0],length:50}]};
  s.context.document.hidden=true;
  await s.events.visibilitychange();
  assert.equal(s.requests,1,'Do not check while the game is hidden');
  s.context.document.hidden=false;
  await s.events.visibilitychange();
  assert.equal(s.reloads,1,'Returning to the game must load changed guardrail geometry');
  const f=setup();
  f.ok=false;await f.events.focus();assert.equal(f.reloads,0);
  f.saved={version:2,objects:[]};f.ok=true;await f.events.focus();assert.equal(f.reloads,0);
  const remote=setup('example.com');assert.deepEqual(remote.events,{});
  console.log('PASS: saved guardrail updates, unchanged tracks, hidden tabs, failed reads and local-only refresh');
})().catch(error=>{console.error(error);process.exitCode=1;});
