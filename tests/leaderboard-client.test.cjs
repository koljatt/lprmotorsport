const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path'),nodeCrypto=require('node:crypto');
const source=fs.readFileSync(path.join(__dirname,'../leaderboard.js'),'utf8');
// One fake account server shared by every page load, like the real Worker.
const serverAccounts=new Map(),accountCalls=[];
function accountReply(body){
  const key=body.nickname.normalize('NFC').toLowerCase(),existing=serverAccounts.get(key);
  if(existing){
    if(body.create===true)return {status:409};
    if(existing.password!==body.password)return {status:401};
    return {status:200,data:{nickname:existing.nickname,token:existing.token,created:false}};
  }
  if(body.create!==true)return {status:404};
  const account={nickname:body.nickname,password:body.password,token:nodeCrypto.createHash('sha256').update('account:'+key).digest('hex')};
  serverAccounts.set(key,account);
  return {status:201,data:{nickname:account.nickname,token:account.token,created:true}};
}
function setup(storage=new Map(),options={}){
  const nodes=new Map(),calls=[],celebrations=[],handlers=new Map(),identified=[];
  const network={offline:false,finishOffline:false,status:200,statuses:[],...options};
  const node=id=>{
    if(!nodes.has(id)){
      const events=new Map();let text='';
      nodes.set(id,{value:'',children:[],open:false,hidden:false,readOnly:false,
        get textContent(){return text;},set textContent(value){text=value;this.children=[];},
        classList:{add(){},remove(){}},addEventListener:(type,fn)=>events.set(type,fn),
        trigger(type,event={preventDefault(){}}){return events.get(type)?.(event);},
        append(item){this.children.push(item);},setAttribute(){},setCustomValidity(message){this.validationMessage=message;},
        reportValidity(){this.reported=true;},showModal(){this.open=true;},close(){this.open=false;}});
    }
    return nodes.get(id);
  };
  const context={window:{addEventListener:(type,fn)=>handlers.set(type,fn),LPRAnalytics:{identify:name=>identified.push(name)},
    LPRVerificationConfig:{leaderboard:'https://verified.test'},LPRRaceEffects:{celebrate:ms=>celebrations.push(ms)}},crypto:require('node:crypto').webcrypto,AbortSignal,
    setInterval(){},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
    document:{querySelector:node,createElement:()=>({textContent:'',append(...items){this.textContent+=items.map(item=>item.textContent).join('');}})},
    async fetch(url,request){
      calls.push({url,options:request});
      if(url==='https://verified.test/api/verified/account'){
        accountCalls.push(JSON.parse(request.body));
        if(network.accountOffline)throw Error('offline');
        const {status,data}=accountReply(JSON.parse(request.body));
        return {ok:status>=200&&status<300,status,json:async()=>data};
      }
      const finish=url.endsWith('/api/laps'),start=url.endsWith('/api/laps/start');
      if(network.offline||(finish&&network.finishOffline))throw Error('offline');
      const status=finish?(network.statuses.shift()??network.status):start?(network.startStatus??200):200;
      const body=request?.body?JSON.parse(request.body):null;
      return {ok:status>=200&&status<300,status,json:async()=>start?
        {mode:'timed-v1',lapId:body.requestId,startedAt:1,expiresAt:86400001}:
        finish?{mode:'laps',protection:'timed-v1',moderation:'approved',saved:true,rank:2,lapMs:body.lapMs,record:false,...network.result}:
        {version:'lut-20261024-v4',results:Array.from({length:20},(_,i)=>({nickname:i?'Driver '+i:'<script>',lap_ms:12346+i*1000}))}};
    }};
  vm.createContext(context);vm.runInContext(source,context);
  const board=context.window.LPRLeaderboard;
  return {board,node,calls,storage,celebrations,network,handlers,identified,
    // Signs in, claiming the nickname when the server reports it free.
    async login(name='Panu',password='salasana'){
      node('#analytics-consent').checked=true;node('#leaderboard-name').value=name;node('#leaderboard-password').value=password;
      await node('#leaderboard-start-form').trigger('submit');
      if(node('#leaderboard-start-label').textContent==='Varaa nimimerkki')await node('#leaderboard-start-form').trigger('submit');
    },
    account:()=>JSON.parse(storage.get('lpr-account')??'null'),
    starts:()=>calls.filter(c=>c.url.endsWith('/api/laps/start')),
    finishes:()=>calls.filter(c=>c.url.endsWith('/api/laps')),
    async lap(ms=40000,sectors=[10000,10000,ms-20000]){await board.startLap();await board.submit(ms,sectors);},
    queue(){return JSON.parse(storage.get('lpr-pending-laps:'+JSON.parse(storage.get('lpr-account')).token)??'[]');}};
}
(async()=>{
  const app=setup(),{board,node,storage}=app;
  board.beginSession();await board.refresh();
  assert(node('#settings-dialog').open);assert(board.requiresName);
  assert.equal(node('#leaderboard-list').children.length,10);
  assert.equal(node('#leaderboard-list').children[0].textContent,'<script> · 0:12.346');
  let prevented=false;node('#settings-dialog').trigger('cancel',{preventDefault(){prevented=true;}});assert(prevented);
  await app.lap();assert.equal(app.starts().length,0);assert.equal(app.finishes().length,0);
  node('#leaderboard-name').value='Panu';node('#leaderboard-start-form').trigger('submit');
  assert(board.requiresName,'Consent is required before naming can start play');assert.equal(board.identity,null);assert(node('#analytics-consent').reported);assert.deepEqual(app.identified,[]);
  await app.login('   ');assert(board.requiresName);assert(node('#leaderboard-name').reported);assert.deepEqual(app.identified,[]);
  node('#leaderboard-password').value='1234';node('#leaderboard-name').value='Panu';await node('#leaderboard-start-form').trigger('submit');
  assert(board.requiresName);assert(node('#leaderboard-password').reported,'Short passwords are rejected before contacting the server');assert.equal(accountCalls.length,0);
  node('#leaderboard-password').value='salasana';node('#leaderboard-name').value=' Panu ';await node('#leaderboard-start-form').trigger('submit');
  assert(board.requiresName,'A free nickname is never claimed without confirmation');
  assert.equal(node('#leaderboard-start-label').textContent,'Varaa nimimerkki');assert.equal(accountCalls.at(-1).create,false);
  node('#leaderboard-name').trigger('input');assert.equal(node('#leaderboard-start-label').textContent,'Aloita ajo','Editing the name cancels the claim');
  await app.login(' Panu ');assert(!board.requiresName);assert(!node('#settings-dialog').open);
  assert.equal(accountCalls.at(-1).create,true);assert.equal(accountCalls.at(-1).nickname,'Panu');
  assert.deepEqual(app.identified,['Panu']);assert(node('#leaderboard-name').readOnly);assert(node('#leaderboard-start').hidden);
  assert.equal(node('#leaderboard-password').value,'','The password is not kept in the form');
  const token=app.account().token;assert.equal(token,serverAccounts.get('panu').token);
  assert(!storage.get('lpr-account').includes('salasana'),'Only the server credential is remembered, never the password');
  await app.lap(40000.6,[10000.4,10000.4,19999.8]);
  const post=app.finishes()[0],sent=JSON.parse(post.options.body);
  assert.equal(sent.nickname,'Panu');assert.equal(sent.protocol,'timed-v1');
  assert.equal(sent.lapId,JSON.parse(app.starts()[0].options.body).requestId,'Submission uses the returned server ticket');
  assert.equal(sent.sectors.reduce((a,b)=>a+b,0),sent.lapMs);
  assert.equal(post.options.headers.Authorization,`Bearer ${token}`);
  node('#leaderboard-name').value='Other';await app.lap();
  assert.equal(JSON.parse(app.finishes().at(-1).options.body).nickname,'Panu');
  assert.notEqual(sent.lapId,JSON.parse(app.finishes().at(-1).options.body).lapId);
  const count=app.finishes().length;
  await board.submit(40000,[10000,10000,20000]);assert.equal(app.finishes().length,count,'No retroactive start can be minted at finish');
  await board.startLap();board.cancelLap();await board.submit(40000,[10000,10000,20000]);
  assert.equal(app.finishes().length,count,'Restart discards the active start');
  const withdrawn=setup();await withdrawn.login();withdrawn.node('#analytics-consent').checked=false;withdrawn.node('#analytics-consent').trigger('change');
  assert(withdrawn.board.requiresName);assert.equal(withdrawn.board.identity,null);assert(withdrawn.node('#settings-dialog').open,'Withdrawal pauses play behind the required start dialog');
  await withdrawn.login();assert(!withdrawn.board.requiresName);assert(!withdrawn.node('#settings-dialog').open,'Consent can be accepted again');
  const calls=accountCalls.length;
  const reopened=setup(storage);assert(reopened.board.requiresName);assert.equal(reopened.node('#leaderboard-name').value,'Panu');
  assert(reopened.node('#leaderboard-name').readOnly);assert(reopened.node('#leaderboard-password').hidden,'A remembered account does not ask for the password');
  assert.equal(reopened.node('#leaderboard-logout').hidden,false);
  await reopened.login('Panu','');assert(!reopened.board.requiresName,'Each page load still needs an explicit start');
  assert.equal(reopened.board.identity.token,token);assert.equal(accountCalls.length,calls);
  const other=setup(storage);other.node('#leaderboard-logout').trigger('click');
  assert.equal(other.account(),null);assert.equal(other.node('#leaderboard-name').readOnly,false);assert.equal(other.node('#leaderboard-password').hidden,false);
  await other.login('Eve');assert.notEqual(other.account().token,token);assert.equal(other.board.identity.nickname,'Eve');
  const wrong=setup();await wrong.login('PANU','väärä');
  assert(wrong.board.requiresName);assert.match(wrong.node('#leaderboard-status').textContent,/Väärä salasana/);assert.equal(wrong.account(),null);
  const caseless=setup();await caseless.login('pAnU','salasana');
  assert.equal(caseless.board.identity.nickname,'Panu','The account keeps its original spelling');assert.equal(caseless.board.identity.token,token);
  const race=setup();race.node('#analytics-consent').checked=true;race.node('#leaderboard-name').value='Kilpa';race.node('#leaderboard-password').value='12345';
  await race.node('#leaderboard-start-form').trigger('submit');assert.equal(race.node('#leaderboard-start-label').textContent,'Varaa nimimerkki');
  accountReply({nickname:'kilpa',password:'toinen',create:true});
  await race.node('#leaderboard-start-form').trigger('submit');
  assert(race.board.requiresName);assert.match(race.node('#leaderboard-status').textContent,/jo varattu/,'A nickname claimed meanwhile is not overwritten');
  const down=setup(new Map(),{accountOffline:true});await down.login('Kuka');
  assert(down.board.requiresName);assert.match(down.node('#leaderboard-status').textContent,/ei onnistunut/);
  const legacy=setup(new Map([['lpr-nickname','Legacy'],['lpr-player-token','a'.repeat(64)]]));
  assert.equal(legacy.node('#leaderboard-name').value,'Legacy','An old nickname is only suggested');assert.equal(legacy.node('#leaderboard-password').hidden,false);
  await legacy.login('Legacy');assert.notEqual(legacy.board.identity.token,'a'.repeat(64),'Old device tokens never become account credentials');
  const record=setup(new Map(),{result:{rank:1,record:true}});await record.login();await record.lap();
  assert.deepEqual(record.celebrations,[40000]);
  for(const moderation of ['quarantined','hidden']){
    const reviewed=setup(new Map(),{status:202,result:{moderation,rank:null,record:false}});
    await reviewed.login();await reviewed.lap();
    assert.equal(reviewed.celebrations.length,0);assert.equal(reviewed.queue().length,0);
    assert.match(reviewed.node('#leaderboard-status').textContent,/tarkistusta/);
  }
  const offline=setup(new Map(),{offline:true});await offline.login('Offline');
  await offline.lap();assert(!offline.board.requiresName);assert.equal(offline.finishes().length,0);
  assert.match(offline.node('#leaderboard-status').textContent,/vain paikallisesti/);
  offline.network.offline=false;await offline.handlers.get('online')();
  assert.equal(offline.finishes().length,0,'An offline lap is never backdated into a new ticket');
  await offline.lap();assert.equal(offline.finishes().length,1);
  const retry=setup(new Map(),{finishOffline:true});await retry.login('Retry');await retry.lap();
  assert.equal(retry.queue().length,1);const queued=retry.finishes()[0].options.body;
  assert.match(retry.node('#leaderboard-status').textContent,/odottaa lähetystä/);
  retry.network.finishOffline=false;await retry.handlers.get('online')();
  assert.equal(retry.finishes().at(-1).options.body,queued);assert.equal(retry.queue().length,0);
  const saved=setup(new Map(),{finishOffline:true});await saved.login('Reload');await saved.lap();
  const reload=setup(saved.storage);await reload.login('Reload');await reload.handlers.get('online')();
  assert.equal(reload.starts().length,0);assert.equal(reload.finishes().length,1,'Reload retries the original ticket rather than starting again');
  assert.equal(reload.queue().length,0);assert.deepEqual(reload.identified,['Reload']);
  const failure=setup(new Map(),{finishOffline:true});await failure.login();await failure.lap();await failure.lap();
  assert.equal(failure.queue().length,2);
  failure.network.finishOffline=false;failure.network.statuses=[409,200];
  await failure.handlers.get('online')();assert.equal(failure.queue().length,0,'A permanently rejected item cannot block the next queued lap');
  const throttled=setup(new Map(),{status:429});await throttled.login();await throttled.lap();assert.equal(throttled.queue().length,1);
  throttled.network.status=200;await throttled.handlers.get('online')();assert.equal(throttled.queue().length,0);
  const old=setup(new Map(),{result:{mode:'old'}});await old.login();await old.lap();
  assert.match(old.node('#leaderboard-status').textContent,/ei vielä tue/);
  console.log('PASS: required identity, server start/finish hooks, no retrospective tickets, cancellation, moderation, safe rendering, records, password accounts with confirmed nickname claims, offline play, durable retries and terminal/transient queue errors');
})().catch(error=>{console.error(error);process.exitCode=1;});
