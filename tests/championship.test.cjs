const assert=require('node:assert/strict');
(async()=>{
 const {competitionDay,dayStart,shiftDay,scoreDays,validDay,GRACE_MS}=await import('../cloudflare/championship.mjs');
 assert.equal(competitionDay(Date.parse('2026-10-24T20:59:59Z')),'2026-10-24');
 assert.equal(competitionDay(Date.parse('2026-10-24T21:00:00Z')),'2026-10-25');
 assert.equal(dayStart('2026-10-26')-dayStart('2026-10-25'),25*3600000,'Autumn clock change is a calendar day, not a rolling 24h');
 assert.equal(dayStart('2026-03-30')-dayStart('2026-03-29'),23*3600000);
 assert.equal(shiftDay('2028-03-01',-1),'2028-02-29');assert(!validDay('2026-02-30'));assert(!validDay('2026-1-1'));
 const rows=[];for(let i=0;i<10;i++)rows.push({day:shiftDay('2026-10-25',i),player_hash:'p',nickname:'Panu',laps:30,best_ticks:5000});
 rows.push({day:'2026-10-25',player_hash:'e',nickname:'Eve',laps:30,best_ticks:5000});
 const days=scoreDays(rows,'2026-10-25','2026-11-03');
 assert.equal(days.get('2026-10-25')[0].speedRank,1);assert.equal(days.get('2026-10-25')[1].speedRank,1,'Ties share the place and points');
 assert.equal(days.get('2026-11-03')[0].breakdown.streak,7);assert.equal(days.get('2026-11-03')[0].breakdown.milestones,6);
 rows.push({day:'2026-11-05',player_hash:'p',nickname:'Panu',laps:1,best_ticks:5000});
 assert.equal(scoreDays(rows,'2026-11-05','2026-11-05').get('2026-11-05')[0].breakdown.streak,1,'A missed day resets the streak');
 const {revision}=require('../verification/world.cjs'),{sign}=await import('../verification/protocol.mjs');
 const secret='championship-test-secret-'.repeat(3),now=Date.now(),today=competitionDay(now);
 const board=await require('../verification/local-leaderboard.cjs').createLocalLeaderboard({secret,revision,passwordIterations:10000});
 await new Promise(r=>board.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${board.address().port}`;
 const post=(path,data,token)=>fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(data)});
 const get=async(day,token)=>{const response=await fetch(base+'/api/verified/championship'+(day?'?day='+day:''),{headers:token?{Authorization:'Bearer '+token}:{}});assert.equal(response.status,200);return response.json();};
 try{
  const account=await post('/api/verified/account',{nickname:'Panu',password:'test-password',create:true});assert.equal(account.status,201);
  const {token}=await account.json(),{player_hash:playerHash}=board.db.prepare('SELECT player_hash FROM verified_accounts').get();
  const lap={kind:'lap',protocol:'driving-v1',revision,playerHash,nickname:'Panu',sessionId:'a'.repeat(32),lap:1,startTick:0,endTick:6000,lapTicks:6000,sectorTicks:[2000,2000,2000],issuedAt:now};
  const send=async value=>{const response=await post('/api/verified/laps',{receipt:await sign(value,secret)},token);assert.equal(response.status,200);return response.json();};
  assert.equal((await send(lap)).saved,true);assert.equal((await send(lap)).saved,false);
  let result=await get(undefined,token);
  assert.equal(result.fastest[0].nickname,'Panu');assert.equal(result.fastest[0].laps,1,'Retries do not create extra lap points');
  assert.equal(result.me.streak,1);assert.equal(result.me.activeToday,true);assert.equal(result.me.selectedDay.points,41);
  assert.equal(result.monthly.length,0,'Live daily standings are not prematurely awarded in monthly points');
  assert.equal((await get()).me,null,'Public responses never contain another player’s personal streak');
  assert(!JSON.stringify(result).includes(playerHash),'Public results never expose stable account IDs');
  // A valid but differently issued duplicate receipt cannot move or duplicate the ledger entry.
  await send({...lap,issuedAt:now-1000});assert.equal(board.db.prepare('SELECT COUNT(*) n FROM championship_laps').get().n,1);
  const oldDay=shiftDay(today,-2),oldTime=dayStart(oldDay)+12*3600000;
  await send({...lap,sessionId:'b'.repeat(32),issuedAt:oldTime});
  assert.equal(board.db.prepare('SELECT COUNT(*) n FROM verified_laps').get().n,2);
  assert.equal(board.db.prepare('SELECT COUNT(*) n FROM championship_laps').get().n,1,'Late uploads preserve all-time laps without changing finalized daily scores');
  // Seed yesterday's accepted entries as if they arrived before finalization.
  const yesterday=shiftDay(today,-1);
  board.db.prepare('INSERT INTO championship_laps VALUES (?,?,?,?,?,?)').run('b'.repeat(32),1,yesterday,playerHash,revision,6000);
  result=await get(yesterday,token);assert.equal(result.me.streak,2);assert.equal(result.final,true);assert.equal(result.me.selectedDay.points,41);
  if(yesterday.slice(0,7)===today.slice(0,7))assert.equal(result.monthly[0].points,41);
  const future=await fetch(base+'/api/verified/championship?day='+shiftDay(today,1));assert.equal(future.status,400);
  const invalid=await fetch(base+'/api/verified/championship?day=2026-02-30');assert.equal(invalid.status,400);
  // Simulate a failed second SQL statement: neither table may retain the new lap.
  board.db.exec(`CREATE TRIGGER fail_competition BEFORE INSERT ON championship_laps BEGIN SELECT RAISE(ABORT,'test failure'); END`);
  const failed=await post('/api/verified/laps',{receipt:await sign({...lap,sessionId:'c'.repeat(32)},secret)},token);assert.equal(failed.status,503);
  assert.equal(board.db.prepare('SELECT COUNT(*) n FROM verified_laps WHERE session_id=?').get('c'.repeat(32)).n,0,'Ledger and lap save commit atomically');
  board.db.prepare('DELETE FROM verified_laps WHERE session_id=?').run('a'.repeat(32));
  assert.equal(board.db.prepare('SELECT COUNT(*) n FROM championship_laps WHERE session_id=?').get('a'.repeat(32)).n,0,'Deleting a lap also removes its competition entry');
  board.db.prepare('DELETE FROM verified_accounts WHERE player_hash=?').run(playerHash);
  assert.equal(board.db.prepare('SELECT COUNT(*) n FROM championship_laps').get().n,0,'Account erasure removes competition history');
  console.log('PASS: daily scoring, shared ties, capped bonuses, calendar and DST, month/streak boundaries, real Worker SQL, idempotent receipts, finalized results, privacy and atomic rollback');
 }finally{await new Promise(r=>{board.close(r);board.closeAllConnections();});}
})().catch(error=>{console.error(error);process.exitCode=1;});
