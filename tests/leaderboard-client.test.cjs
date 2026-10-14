const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../leaderboard.js'),'utf8');
function setup(storage=new Map(),offline=false) {
  const nodes=new Map(),calls=[];
  const node=id=>{
    if(!nodes.has(id)) {
      const handlers=new Map();let text='';
      nodes.set(id,{value:'',children:[],open:false,hidden:false,readOnly:false,
        get textContent(){return text},set textContent(value){text=value;this.children=[]},
        classList:{add(){},remove(){}},addEventListener:(type,fn)=>handlers.set(type,fn),
        trigger(type,event={preventDefault(){}}){handlers.get(type)?.(event)},
        append(item){this.children.push(item)},setCustomValidity(message){this.validationMessage=message},
        reportValidity(){this.reported=true},showModal(){this.open=true},close(){this.open=false}});
    }
    return nodes.get(id);
  };
  const context={window:{},crypto:require('node:crypto').webcrypto,AbortSignal,
    localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
    document:{querySelector:node,createElement:()=>({textContent:''})},
    async fetch(url,options){calls.push({url,options});if(offline)throw new Error('offline');
      return {ok:true,json:async()=>url.endsWith('/api/laps')?{rank:2,bestMs:12346}:
        {version:'lut-20261011-v3',results:Array.from({length:20},(_,i)=>({nickname:i?'Driver '+i:'<script>',lap_ms:12346+i*1000}))}};
    }};
  vm.createContext(context);vm.runInContext(source,context);
  return {board:context.window.LPRLeaderboard,node,calls,storage};
}
(async()=>{
  const app=setup(),{board,node,calls,storage}=app;
  board.beginSession();await board.refresh();
  assert(node('#settings-dialog').open,'Leaderboard opens independently of 3D initialization');
  assert(board.requiresName);
  assert.equal(node('#leaderboard-list').children.length,10,'Only the top ten are shown');
  assert.equal(node('#leaderboard-list').children[0].textContent,'<script> · 0:12.346','Names render as plain text');
  let prevented=false;node('#settings-dialog').trigger('cancel',{preventDefault(){prevented=true}});
  assert(prevented,'Escape cannot bypass naming');
  await board.submit(12345.6,[3000.4,3000.4,6344.8]);
  assert.equal(calls.filter(c=>c.options?.method==='POST').length,0,'No lap can submit before confirmation');
  node('#leaderboard-name').value='   ';node('#leaderboard-start-form').trigger('submit');
  assert(board.requiresName);assert(node('#leaderboard-name').reported);
  node('#leaderboard-name').value=' Panu ';node('#leaderboard-start-form').trigger('submit');
  assert(!board.requiresName);assert(!node('#settings-dialog').open);
  assert(node('#leaderboard-name').readOnly);assert(node('#leaderboard-start').hidden);
  const token=storage.get('lpr-player-token');assert.match(token,/^[a-f0-9]{64}$/);
  await board.submit(12345.6,[3000.4,3000.4,6344.8]);
  const post=calls.find(c=>c.options?.method==='POST'),sent=JSON.parse(post.options.body);
  assert.equal(sent.nickname,'Panu');assert.equal(sent.sectors.reduce((a,b)=>a+b,0),sent.lapMs);
  assert.equal(post.options.headers.Authorization,`Bearer ${token}`,'The first named lap is submitted');
  node('#leaderboard-name').value='Other';await board.submit(12345.6,[3000.4,3000.4,6344.8]);
  assert.equal(JSON.parse(calls.filter(c=>c.options?.method==='POST').at(-1).options.body).nickname,'Panu','Session identity stays fixed');
  const reopened=setup(storage);reopened.board.beginSession();await reopened.board.refresh();
  assert(reopened.board.requiresName,'Every page load asks again, even with a remembered nickname');
  assert.equal(reopened.node('#leaderboard-name').value,'Panu');
  reopened.node('#leaderboard-start-form').trigger('submit');
  assert.equal(storage.get('lpr-player-token'),token,'Same name preserves private identity and previous records');
  const other=setup(storage);other.node('#leaderboard-name').value='Eve';other.node('#leaderboard-start-form').trigger('submit');
  assert.notEqual(storage.get('lpr-player-token'),token,'Another driver on the same browser has a separate record');
  const legacyStorage=new Map([['lpr-nickname','Legacy'],['lpr-player-token','a'.repeat(64)]]);
  const legacy=setup(legacyStorage);legacy.node('#leaderboard-start-form').trigger('submit');
  assert.equal(legacyStorage.get('lpr-player-token:legacy'),'a'.repeat(64),'Existing player records survive migration');
  const offline=setup(new Map(),true);offline.board.beginSession();await offline.board.refresh();
  assert.match(offline.node('#leaderboard-list').textContent,/saatavilla/);
  offline.node('#leaderboard-name').value='Offline';offline.node('#leaderboard-start-form').trigger('submit');
  assert(!offline.board.requiresName,'Unavailable leaderboard does not block playing');
  await offline.board.submit(12345.6,[3000.4,3000.4,6344.8]);
  assert.match(offline.node('#leaderboard-status').textContent,/epäonnistui/);
  console.log('PASS: required startup nickname, top ten, first submission, reload confirmation, fixed/per-name identity, migration, safe rendering and offline play');
})().catch(e=>{console.error(e);process.exitCode=1});
