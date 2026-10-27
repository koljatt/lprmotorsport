const assert=require('node:assert/strict');
const {createChat}=require('../verification/chat.cjs');
const player='a'.repeat(64);
let time=0;
const chat=createChat({now:()=>time});
const ticket=(changes={})=>({kind:'chat',protocol:'driving-v1',playerHash:player,nickname:'Kuljettaja',issuedAt:time,expiresAt:time+600000,...changes});
const post=(text='Moi',identity=ticket())=>chat.post(identity,'local',{text});
assert.deepEqual(chat.list(),{messages:[]});
const visitorA='a'.repeat(36),visitorB='b'.repeat(36);
assert.deepEqual(chat.presence(visitorA),{onlineCount:1});
assert.deepEqual(chat.presence(visitorA),{onlineCount:1},'Multiple tabs in one browser count once');
assert.deepEqual(chat.presence(visitorB),{onlineCount:2});
time=30000;chat.presence(visitorA);
time=45000;assert.deepEqual(chat.presence(visitorA),{onlineCount:1},'Inactive visitors expire');
assert.throws(()=>chat.presence('invalid'),{status:400});
time=0;
for(const identity of [null,'a'.repeat(64),ticket({kind:'start'}),ticket({protocol:'other'}),ticket({playerHash:'bad'}),
 ticket({nickname:'<script>'}),ticket({expiresAt:time}),ticket({issuedAt:time+60000,expiresAt:time+120000}),ticket({expiresAt:time+3600000})])
 assert.throws(()=>post('Moi',identity),{status:401},'Only a valid, short-lived chat ticket can post');
assert.throws(()=>chat.post(undefined,'local',{nickname:'Kuljettaja',text:'Moi'}),{status:401});
for(const text of ['', ' '.repeat(10), 'x'.repeat(281),'a\nb','a\u202Eb'])assert.throws(()=>post(text),{status:400});
assert.equal(chat.post(ticket(),'local',{nickname:'Admin',text:'Hei'}).message.nickname,'Kuljettaja','The request body cannot choose the nickname');
post('<img src=x onerror=alert(1)>');
assert.equal(chat.list().messages[1].text,'<img src=x onerror=alert(1)>','Messages are plain data, rendered as text by the client');
assert(!JSON.stringify(chat.list()).includes(player));
assert(!('owner' in chat.list().messages[0]));
for(let i=2;i<6;i++)post();
assert.throws(()=>post(),{status:429});
time+=60000;post('Again');
for(let i=0;i<110;i++){time+=60000;post('message '+i);}
assert.equal(chat.list().messages.length,100);
time+=86400000;assert.equal(chat.list().messages.length,0);
const shared=createChat();
const fresh=n=>({kind:'chat',protocol:'driving-v1',playerHash:n.toString(16).padStart(64,'0'),nickname:'Player',issuedAt:Date.now(),expiresAt:Date.now()+600000});
for(let i=0;i<30;i++)shared.post(fresh(i),'shared',{text:'Hi'});
assert.throws(()=>shared.post(fresh(99),'shared',{text:'Hi'}),{status:429},'IP limit also applies across accounts');
(async()=>{
 const secret='test-secret-'.repeat(4),{sign}=await import('../verification/protocol.mjs');
 const server=await require('../verification/server.cjs').createServer({secret,origins:['https://game.test']});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const url=`http://127.0.0.1:${server.address().port}/api/chat`;
 const signed=(changes={},key=secret)=>sign({kind:'chat',protocol:'driving-v1',playerHash:player,nickname:'Pelaaja',issuedAt:Date.now(),expiresAt:Date.now()+600000,...changes},key);
 const valid=await signed();
 const send=(data,credential=valid,origin='https://game.test')=>fetch(url,{method:'POST',headers:{...(origin?{Origin:origin}:{}),'Content-Type':'application/json',Authorization:'Bearer '+credential},body:JSON.stringify(data)});
 try{
  const response=await send({nickname:'Panu',text:'Terve varikko!'});
  assert.equal(response.status,201);assert.equal(response.headers.get('Access-Control-Allow-Origin'),'https://game.test');
  assert.equal((await response.json()).message.nickname,'Pelaaja','The server uses the signed nickname, not the requested one');
  const other=await fetch(url);const data=await other.json();
  const presenceURL=url+'/presence?visitor=';
  assert.deepEqual(await (await fetch(presenceURL+visitorA)).json(),{onlineCount:1});
  assert.deepEqual(await (await fetch(presenceURL+visitorB)).json(),{onlineCount:2});
  assert.equal((await fetch(presenceURL+'invalid')).status,400);
  assert.equal(data.messages.length,1);assert.equal(data.messages[0].text,'Terve varikko!','Another client sees shared messages');
  assert.equal((await send({text:'No'},valid,'https://evil.test')).status,403);
  assert.equal((await send({text:'No'},'bad')).status,401);
  assert.equal((await send({nickname:'Panu',text:'No'},'b'.repeat(64),null)).status,401,'A random token without an Origin header cannot post');
  assert.equal((await send({text:'No'},await signed({nickname:'Panu'},'attacker-secret-'.repeat(4)),null)).status,401,'Forged tickets are rejected');
  assert.equal((await send({text:'No'},await signed({kind:'start'}))).status,401,'Driving start tickets cannot post');
  assert.equal((await send({text:'No'},await signed({issuedAt:Date.now()-700000,expiresAt:Date.now()-100000}))).status,401,'Expired tickets are rejected');
  assert.equal((await send({text:'x'.repeat(3000)})).status,413);
  assert.equal((await fetch(url,{method:'DELETE'})).status,405);
  assert.equal((await fetch(url,{method:'OPTIONS',headers:{Origin:'https://game.test'}})).status,204);
  for(let i=1;i<6;i++)assert.equal((await send({text:'Moi'})).status,201);
  assert.equal((await send({text:'Liikaa'},await signed())).status,429,'A new ticket for the same account shares its rate limit');
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
 console.log('Chat: signed nickname ownership, shared messages, validation, rate limits, expiry and HTTP routes OK');
})().catch(error=>{console.error(error);process.exitCode=1;});
