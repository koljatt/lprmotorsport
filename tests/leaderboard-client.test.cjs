const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../leaderboard.js'),'utf8');
function setup(storage=new Map(),offline=false,lapResult={mode:'laps',saved:true,rank:2,lapMs:12346,bestMs:12346,record:false},consent=true) {
  const nodes=new Map(),calls=[],celebrations=[];
  const node=id=>{
    if(!nodes.has(id)) {
      const handlers=new Map();let text='';
      nodes.set(id,{value:'',children:[],open:false,hidden:false,readOnly:false,
        get textContent(){return text},set textContent(value){text=value;this.children=[]},
        classList:{add(){},remove(){}},addEventListener:(type,fn)=>handlers.set(type,fn),
        trigger(type,event={preventDefault(){}}){handlers.get(type)?.(event)},
        append(item){this.children.push(item)},setAttribute(){},setCustomValidity(message){this.validationMessage=message},
        reportValidity(){this.reported=true},showModal(){this.open=true},close(){this.open=false}});
    }
    return nodes.get(id);
  };
  const context={window:{LPRRaceEffects:{celebrate:ms=>celebrations.push(ms)},
    LPRAnalytics:{proof:()=>consent?'f'.repeat(64):null,flush:async()=>{calls.push({url:'flush'})}}},crypto:require('node:crypto').webcrypto,AbortSignal,
    localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},
    document:{querySelector:node,createElement:()=>({textContent:''})},
    async fetch(url,options){calls.push({url,options});if(offline)throw new Error('offline');
      return {ok:true,json:async()=>url.endsWith('/api/laps')?lapResult:
        {version:'lut-20261011-v3',results:Array.from({length:20},(_,i)=>({nickname:i?'Driver '+i:'<script>',lap_ms:12346+i*1000}))}};
    }};
  vm.createContext(context);vm.runInContext(source,context);
  return {board:context.window.LPRLeaderboard,node,calls,storage,celebrations};
}
(async()=>{
  const app=setup(),{board,node,calls,storage}=app;
  board.beginSession();await board.refresh();
  assert(node('#settings-dialog').open,'Leaderboard opens independently of 3D initialization');
  assert(board.requiresName);
  assert.equal(node('#leaderboard-list').children.length,10,'Only the top ten are shown');
  assert.equal(node('#podium-name-1').textContent,'<script>','Leader is rendered safely on the podium');
  assert.equal(node('#podium-time-1').textContent,'0:12.346');
  assert.equal(node('#podium-name-2').textContent,'Driver 1');
  assert.equal(node('#podium-name-3').textContent,'Driver 2');
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
  assert.equal(sent.nickname,'Panu');assert.match(sent.lapId,/^[a-f0-9]{64}$/);assert.equal(sent.sectors.reduce((a,b)=>a+b,0),sent.lapMs);
  assert.equal(post.options.headers.Authorization,`Bearer ${token}`,'The first named lap is submitted');
  assert.equal(sent.analyticsToken,'f'.repeat(64),'Lap carries the analytics profile');
  assert.equal(calls[calls.indexOf(post)-1].url,'flush','Analytics is flushed before the lap is submitted');
  const noConsent=setup(new Map(),false,undefined,false);
  noConsent.node('#leaderboard-name').value='Private';noConsent.node('#leaderboard-start-form').trigger('submit');
  await noConsent.board.submit(12345.6,[3000.4,3000.4,6344.8]);
  assert.equal(noConsent.calls.filter(c=>c.options?.method==='POST').length,0,'No analytics consent, no leaderboard submission');
  assert.match(noConsent.node('#leaderboard-status').textContent,/analytiikkasuostumusta/);
  assert(!noConsent.board.requiresName,'Playing continues without consent');
  node('#leaderboard-name').value='Other';await board.submit(12345.6,[3000.4,3000.4,6344.8]);
  assert.equal(JSON.parse(calls.filter(c=>c.options?.method==='POST').at(-1).options.body).nickname,'Panu','Session identity stays fixed');
  const laps=calls.filter(c=>c.options?.method==='POST').map(c=>JSON.parse(c.options.body));
  assert.equal(new Set(laps.map(lap=>lap.lapId)).size,laps.length,'Each lap in one session has a distinct submission ID');
  const legacyServer=setup(new Map(),false,{rank:1,bestMs:10000,saved:true});
  legacyServer.node('#leaderboard-name').value='Legacy server';legacyServer.node('#leaderboard-start-form').trigger('submit');
  await legacyServer.board.submit(10000,[3000,3000,4000]);
  assert.match(legacyServer.node('#leaderboard-status').textContent,/ei vielä tue/,'An old server cannot silently claim to support multiple laps');
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
  const record=setup(new Map(),false,{mode:'laps',saved:true,rank:1,lapMs:11000,bestMs:11000,record:true});
  await record.board.refresh();record.node('#leaderboard-name').value='Record';record.node('#leaderboard-start-form').trigger('submit');
  await record.board.submit(11000,[3000,3000,5000]);
  assert.deepEqual(record.celebrations,[11000],'Confirmed new leader triggers champagne');
  const unchanged=setup(new Map(),false,{mode:'laps',saved:true,rank:3,lapMs:15000,bestMs:11000,record:false});
  await unchanged.board.refresh();unchanged.node('#leaderboard-name').value='Record';unchanged.node('#leaderboard-start-form').trigger('submit');
  await unchanged.board.submit(15000,[5000,5000,5000]);
  assert.equal(unchanged.celebrations.length,0,'An existing leader driving a slower lap does not celebrate');
  const tied=setup(new Map(),false,{mode:'laps',saved:true,rank:2,lapMs:12346,bestMs:12346,record:false});
  await tied.board.refresh();tied.node('#leaderboard-name').value='Tie';tied.node('#leaderboard-start-form').trigger('submit');
  await tied.board.submit(12346,[3000,3000,6346]);
  assert.equal(tied.celebrations.length,0,'Matching a known track record does not celebrate');
  const offline=setup(new Map(),true);offline.board.beginSession();await offline.board.refresh();
  assert.match(offline.node('#leaderboard-list').textContent,/saatavilla/);
  offline.node('#leaderboard-name').value='Offline';offline.node('#leaderboard-start-form').trigger('submit');
  assert(!offline.board.requiresName,'Unavailable leaderboard does not block playing');
  await offline.board.submit(12345.6,[3000.4,3000.4,6344.8]);
  assert.match(offline.node('#leaderboard-status').textContent,/epäonnistui/);
  console.log('PASS: required startup nickname, top ten, first submission, reload confirmation, fixed/per-name identity, migration, safe rendering and offline play');
})().catch(e=>{console.error(e);process.exitCode=1});
