const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{
 const secret='guest-test-secret-'.repeat(4),adminToken='guest-admin-secret-'.repeat(4),revision='a'.repeat(64);
 const {hash,sign,verify}=await import('../verification/protocol.mjs');
 const {competitionDay,dayStart,shiftDay}=await import('../cloudflare/championship.mjs');
 const {default:worker}=await import('../cloudflare/verified-worker.mjs');
 const board=await require('../verification/local-leaderboard.cjs').createLocalLeaderboard({secret,revision,adminToken,passwordIterations:10000});
 await new Promise(r=>board.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+board.address().port;
 const realNow=Date.now;let now=Date.parse('2026-10-29T12:00:00Z'),next=1,ip=1;
 Date.now=()=>now;
 // Exercise database-time midnight/expiry predicates with the same controllable
 // clock as the Worker; production D1 uses its own SQLite clock.
 board.db.function('strftime',(format,value)=>format==='%f'?((now%60000)/1000).toFixed(3).padStart(6,'0'):String(Math.floor(now/1000)));
 const post=(route,data,token)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json','CF-Connecting-IP':'test-'+ip++,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 const get=async route=>{const r=await fetch(base+route);assert.equal(r.status,200);return r.json();};
 const admin=async route=>{const r=await fetch(base+route,{headers:{Authorization:'Bearer '+adminToken}});assert.equal(r.status,200);return r.json();};
 const guest=async(nickname='Guest',series='human')=>{const r=await post('/api/verified/guest',{nickname,series});assert.equal(r.status,201);return r.json();};
 const principal=g=>board.db.prepare('SELECT player_hash FROM verified_login_sessions WHERE token_hash=?').get(g.tokenHash).player_hash;
 const attach=async g=>({...g,tokenHash:await hash(g.token)});
 const replay=require('node:zlib').gzipSync(JSON.stringify({format:'trusted-test-recording'})).toString('base64');
 const payload=async(g,issuedAt=now,ticks=6000)=>{
  const lap={kind:'lap',protocol:'driving-v1',revision,playerHash:principal(g),nickname:g.nickname,sessionId:(next++).toString(16).padStart(32,'0'),lap:1,startTick:0,endTick:ticks,lapTicks:ticks,sectorTicks:[2000,2000,ticks-4000],issuedAt,replayHash:await hash(replay)};
  return {lap,receipt:await sign(lap,secret),replay};
 };
 const send=(g,p)=>post('/api/verified/laps',{receipt:p.receipt,replay:p.replay},g.token);
 const claim=(g,nickname='Owner',extra={})=>post('/api/verified/account',{nickname,password:'guest-password',create:true,...extra},g.token);
 const snapshot=()=>board.db.prepare('SELECT * FROM verified_laps ORDER BY session_id,lap').all();
 const ledger=()=>board.db.prepare('SELECT * FROM championship_laps ORDER BY session_id,lap').all();
 const status=p=>'/api/verified/admin/lap-status?sessionId='+p.lap.sessionId+'&lap=1';
 try{
  assert.equal((await post('/api/verified/guest',{nickname:'Guest'})).status,400,'Explicit category required');
  assert.equal((await post('/api/verified/guest',{nickname:'<script>',series:'human'})).status,400);
  const g=await attach(await guest()),other=await attach(await guest('Guest'));
  assert.notEqual(principal(g),principal(other),'Same nickname is never ownership proof');
  assert.notEqual(g.token,g.tokenHash,'Only bearer hashes are stored');
  assert.equal(g.expiresAt-now,86400000,'Guest session has a fixed 24-hour lifetime');
  const resume=await post('/api/verified/guest',{},g.token);assert.equal((await resume.json()).token,g.token);
  const ticket=await post('/api/verified/start',{revision,nickname:'Impersonation'},g.token);
  const start=await verify((await ticket.json()).ticket,secret);assert.equal(start.nickname,'Guest');assert.equal(start.playerHash,principal(g));
  assert.equal((await post('/api/verified/start',{revision},'f'.repeat(64))).status,401);
  const chat=await post('/api/verified/chat-ticket',{},g.token);assert.equal((await verify((await chat.json()).ticket,secret)).kind,'guest-chat');
  const p=await payload(g);
  assert.equal((await send(other,p)).status,403,'Another authenticated guest cannot submit the receipt');
  assert.equal((await post('/api/verified/laps',{receipt:p.receipt},g.token)).status,403);
  assert.equal((await admin(status(p))).failure.reason,'missing_signed_replay');
  assert.equal((await send(g,{...p,replay:replay.slice(4)})).status,400);
  assert.equal((await admin(status(p))).failure.reason,'replay_mismatch');
  assert.equal((await send(g,{...p,receipt:p.receipt.slice(0,-5)+'aaaaa'})).status,403);
  assert.equal((await send(g,p)).status,200);
  assert.equal((await get('/api/verified/leaderboard')).results[0].nickname,'Guest (vierailija)');
  assert.equal(ledger().length,0,'Unregistered guests earn no points');
  assert.equal((await get('/api/verified/championship')).fastest.length,0);
  assert.equal((await admin(status(p))).status,'listed');
  assert.equal((await fetch(base+status(p))).status,401,'Evidence diagnostics require admin authentication');
  const original=snapshot(),evidence=board.db.prepare('SELECT * FROM verified_lap_evidence').all();
  assert.equal(evidence[0].receipt,p.receipt,'Retain original signature and replay hash');
  assert.equal((await claim(other,'Owner')).status,201,'Another guest may register but cannot claim our records');
  assert.equal((await claim(g,'Owner')).status,409,'Existing account cannot be hijacked');
  assert.equal((await claim(g,'New Owner',{series:'bot'})).status,409,'Promotion cannot launder human/bot category');
  const claimed=await claim(g,'New Owner');assert.equal(claimed.status,201);
  const account=await claimed.json();assert.equal(account.token,g.token);assert.equal(account.claimed,true);assert.equal(account.guest,false);
  assert.deepEqual(snapshot(),original,'Ownership promotion never rewrites timestamps or original results');
  assert.deepEqual(board.db.prepare('SELECT * FROM verified_lap_evidence').all(),evidence);
  assert.equal(ledger().length,1,'The current open day is enrolled atomically');
  assert.equal((await get('/api/verified/leaderboard')).results[0].nickname,'New Owner');
  assert.equal((await get('/api/verified/championship')).fastest[0].points,41);
  assert.equal((await claim(g,'New Owner')).status,200,'Lost responses can be retried');
  assert.equal((await send(g,p)).status,200);assert.equal(ledger().length,1,'Claims and upload retries never double-count');
  assert.equal((await claim(g,'Different Owner')).status,409);
  assert.equal((await claim(g,'New Owner',{password:'wrong-password'})).status,409);
  const independent=await post('/api/verified/account',{nickname:'Guest',password:'other-password',create:true});assert.equal(independent.status,201);
  assert.deepEqual(snapshot(),original,'Nickname registration alone cannot attach guest records');
  // Expiry and logout revoke claiming, not persistent standings.
  const expired=await attach(await guest('Expired')),ep=await payload(expired,now,6100);assert.equal((await send(expired,ep)).status,200);
  board.db.prepare('UPDATE verified_login_sessions SET expires_ms=? WHERE token_hash=?').run(now,expired.tokenHash);
  assert.equal((await claim(expired,'Expired Owner')).status,401);assert.equal((await send(expired,ep)).status,401);
  assert((await get('/api/verified/leaderboard')).results.some(r=>r.nickname==='Expired (vierailija)'));
  assert.equal((await post('/api/verified/logout',{},other.token)).status,200);assert.equal((await claim(other,'Other New')).status,401);
  // Rollback must leave the guest, points, and immutable evidence unchanged.
  const rollback=await attach(await guest('Rollback')),rp=await payload(rollback);assert.equal((await send(rollback,rp)).status,200);
  board.db.exec("CREATE TRIGGER fail_claim BEFORE INSERT ON championship_laps BEGIN SELECT RAISE(ABORT,'test rollback'); END");
  assert.equal((await claim(rollback,'Rollback Owner')).status,503);
  assert.equal(board.db.prepare('SELECT 1 FROM verified_accounts WHERE player_hash=?').get(principal(rollback)),undefined);
  assert.equal((await post('/api/verified/guest',{},rollback.token)).status,200);
  board.db.exec('DROP TRIGGER fail_claim');assert.equal((await claim(rollback,'Rollback Owner')).status,201);
  // Competing registrations on the same principal: exactly one account wins.
  const race=await attach(await guest('Race')),raceLap=await payload(race);assert.equal((await send(race,raceLap)).status,200);
  const racing=await Promise.all([claim(race,'Race A'),claim(race,'Race B')]);assert.deepEqual(racing.map(r=>r.status).sort(),[201,409]);
  assert.equal(board.db.prepare('SELECT COUNT(*) n FROM verified_accounts WHERE player_hash=?').get(principal(race)).n,1);
  assert.equal(board.db.prepare('SELECT COUNT(*) n FROM championship_laps WHERE player_hash=?').get(principal(race)).n,1);
  const duplicate=await attach(await guest('Duplicate'));
  const duplicateClaims=await Promise.all([claim(duplicate,'Duplicate Owner'),claim(duplicate,'Duplicate Owner')]);
  assert(duplicateClaims.every(r=>[200,201].includes(r.status)),'Concurrent matching retries are idempotent');
  const uploading=await attach(await guest('Upload Race')),uploadLap=await payload(uploading);
  const uploadRace=await Promise.all([send(uploading,uploadLap),claim(uploading,'Upload Race Owner')]);
  assert.equal(uploadRace[0].status,200);assert.equal(uploadRace[1].status,201);
  assert.equal(ledger().filter(l=>l.player_hash===principal(uploading)).length,1,'Upload/claim ordering cannot drop or duplicate championship enrollment');
  // A bot guest remains a bot before and after promotion.
  const bot=await attach(await guest('Bot','bot')),bp=await payload(bot,now,5000);assert.equal((await send(bot,bp)).status,200);
  assert(!(await get('/api/verified/leaderboard')).results.some(r=>r.session_id===bp.lap.sessionId));
  assert.equal((await get('/api/verified/leaderboard?series=bot')).results[0].nickname,'Bot (vierailija)');
  assert.equal((await claim(bot,'Bot Owner',{series:'human'})).status,409);assert.equal((await claim(bot,'Bot Owner')).status,201);
  assert.equal((await get('/api/verified/championship?series=bot')).fastest[0].nickname,'Bot Owner');
  const milestones=await attach(await guest('Milestones'));
  for(let i=0;i<30;i++){
   if(i%10===0)now+=60000;
   assert.equal((await send(milestones,await payload(milestones,now,7000+i))).status,200);
  }
  assert.equal(ledger().filter(l=>l.player_hash===principal(milestones)).length,0);
  assert.equal((await claim(milestones,'Milestone Owner')).status,201);
  const milestoneDay=await get('/api/verified/championship');
  const milestoneRow=milestoneDay.mostLaps.find(r=>r.nickname==='Milestone Owner');
  assert.equal(milestoneRow.laps,30);assert.equal(milestoneRow.breakdown.milestones,6,'Claimed laps grant all existing 5/15/30-lap milestones');
  assert.equal(milestoneRow.breakdown.volume,10);assert.equal(milestoneRow.breakdown.participation,5);
  const hostile=await fetch(base+'/api/verified/account',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://attacker.invalid',Authorization:'Bearer '+g.token},body:JSON.stringify({nickname:'Cross Origin',password:'guest-password',create:true})});
  assert.equal(hostile.status,403,'Disallowed browser origins cannot claim an account');
  // Midnight, multi-day session and month end. Only the open day's laps enroll.
  for(const date of ['2026-10-29','2026-10-31','2026-12-31','2026-03-28','2026-10-24']){
   const tomorrow=shiftDay(date,1),boundary=dayStart(tomorrow);now=boundary-60000;
   const spanning=await attach(await guest('Span '+date)),closed=await payload(spanning,now);
   assert.equal((await send(spanning,closed)).status,200);
   now=boundary+1000;
   const beforeDay=await get('/api/verified/championship?day='+date);
   const open=[];for(let i=0;i<5;i++){const lap=await payload(spanning,now,6200+i);open.push(lap);assert.equal((await send(spanning,lap)).status,200);}
   const closedLedger=ledger().filter(l=>l.day<tomorrow);
   assert.equal((await claim(spanning,'Owner '+date)).status,201);
   assert.deepEqual(ledger().filter(l=>l.day<tomorrow),closedLedger,'Closed competition ledger is unchanged');
   const enrolled=ledger().filter(l=>l.player_hash===principal(spanning));assert.equal(enrolled.length,5,'Open-day enrollment for '+date+' at '+new Date(now).toISOString());assert(enrolled.every(l=>l.day===tomorrow));
   const result=await get('/api/verified/championship?day='+tomorrow);
   const own=result.fastest.find(r=>r.nickname==='Owner '+date);assert.equal(own.laps,5);assert.equal(own.breakdown.participation,5);assert.equal(own.breakdown.milestones,2);assert.equal(own.breakdown.streak,1);
   const finalized=await get('/api/verified/championship?day='+date);
   assert.deepEqual(finalized.fastest,beforeDay.fastest);assert.deepEqual(finalized.monthly,beforeDay.monthly,'No closed monthly awards are modified');
   assert.equal((await claim(spanning,'Owner '+date)).status,200);assert.equal((await send(spanning,open[0])).status,200);
   assert.equal(ledger().filter(l=>l.player_hash===principal(spanning)).length,5);
   const pending=await payload(spanning,now,6500); // Authenticated before promotion and uploaded afterward uses the same principal.
   assert.equal((await send(spanning,pending)).status,200);
   now=dayStart(shiftDay(tomorrow,1))+1000;
   const monthly=(await get('/api/verified/championship?day='+tomorrow)).monthly;
   assert(monthly.some(r=>r.nickname==='Owner '+date),'Eligible claimed laps feed monthly points through finalized daily scoring');
   const oldUpload=await payload(spanning,boundary-1,6300);assert.equal((await send(spanning,oldUpload)).status,200);
   assert.equal(ledger().filter(l=>l.player_hash===principal(spanning)).length,6,'Late receipts from closed days earn no awards');
   assert.deepEqual((await get('/api/verified/championship?day='+tomorrow)).monthly,monthly);
  }
  // Database-time boundary wins when registration begins before midnight and commits after it.
  now=dayStart('2027-01-02')-500;const crossing=await attach(await guest('Crossing')),cp=await payload(crossing);assert.equal((await send(crossing,cp)).status,200);
  const wrapper={prepare:sql=>board.binding.prepare(sql),async batch(statements){now+=1000;return board.binding.batch(statements);}};
  const crossingResponse=await worker.fetch(new Request(base+'/api/verified/account',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+crossing.token},body:JSON.stringify({nickname:'Crossing Owner',password:'guest-password',create:true})}),{DB:wrapper,SIMULATION_REVISION:revision,VERIFICATION_SECRET:secret,PASSWORD_ITERATIONS:10000});
  assert.equal(crossingResponse.status,201);assert.equal(ledger().filter(l=>l.player_hash===principal(crossing)).length,0,'No backfill after the database closes the day');
  now=dayStart('2027-01-03');const timed=await attach(await guest('Expiry Race'));
  const expiring={prepare:sql=>board.binding.prepare(sql),async batch(statements){now=timed.expiresAt;return board.binding.batch(statements);}};
  const expiredClaim=await worker.fetch(new Request(base+'/api/verified/account',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+timed.token},body:JSON.stringify({nickname:'Expiry Race Owner',password:'guest-password',create:true})}),{DB:expiring,SIMULATION_REVISION:revision,VERIFICATION_SECRET:secret,PASSWORD_ITERATIONS:10000});
  assert.equal(expiredClaim.status,409);assert.equal(board.db.prepare('SELECT 1 FROM verified_accounts WHERE player_hash=?').get(principal(timed)),undefined,'Expiry during the claim transaction prevents promotion');
  const revoked=await attach(await guest('Revoked Claim'));
  const revokedPrincipal=principal(revoked);
  const revokeBinding={prepare:sql=>board.binding.prepare(sql),async batch(statements){board.db.prepare('DELETE FROM verified_login_sessions WHERE token_hash=?').run(revoked.tokenHash);return board.binding.batch(statements);}};
  const revokedClaim=await worker.fetch(new Request(base+'/api/verified/account',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+revoked.token},body:JSON.stringify({nickname:'Revoked Owner',password:'guest-password',create:true})}),{DB:revokeBinding,SIMULATION_REVISION:revision,VERIFICATION_SECRET:secret,PASSWORD_ITERATIONS:10000});
  assert.equal(revokedClaim.status,409);assert.equal(board.db.prepare('SELECT 1 FROM verified_accounts WHERE player_hash=?').get(revokedPrincipal),undefined,'Revocation between authentication and commit prevents claiming');
  // Migration is repeatable and preserves every preexisting record.
  const migration=fs.readFileSync(path.join(__dirname,'../cloudflare/migrations/0001_verified_guests.sql'),'utf8'),before=snapshot();
  board.db.exec(migration);board.db.exec(migration);assert.deepEqual(snapshot(),before);
  const {DatabaseSync}=require('node:sqlite'),legacy=new DatabaseSync(':memory:');
  try{
   legacy.exec(fs.readFileSync(path.join(__dirname,'../cloudflare/verified-schema.sql'),'utf8').split('-- Additive and repeatable:')[0]);
   const oldLap=before[0];legacy.prepare('INSERT INTO verified_laps VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(...Object.values(oldLap));
   legacy.exec(migration);legacy.exec(migration);
   assert.deepEqual({...legacy.prepare('SELECT * FROM verified_laps').get()},{...oldLap},'An actual pre-feature schema upgrades without overwriting records');
  }finally{legacy.close();}
  console.log('PASS: verified guest identity, replay integrity, authenticated atomic/idempotent claims, no nickname impersonation, rollback/concurrency, expiry, categories, evidence diagnostics, Helsinki midnight/DST/month/year boundaries, open-day retroactive scoring, milestones, closed competition immutability and duplicate prevention');
 }finally{Date.now=realNow;await new Promise(r=>{board.close(r);board.closeAllConnections();});}
})().catch(e=>{console.error(e);process.exitCode=1;});
