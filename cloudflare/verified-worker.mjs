import {replaySchema,replayStatements,replayRoute} from './replays.mjs';
import {sign,verify,hash,protocol,validPlayer,validName} from '../verification/protocol.mjs';
// npm run build:verified-worker inlines the protocol and the simulation revision into a pasteable bundle.
const BUILD_REVISION='';

// Separate table and endpoints: legacy times can never appear as verified results.
// player_hash is a stable account identity, never a login credential.
const accountSchema=`CREATE TABLE IF NOT EXISTS verified_accounts (
  name_key TEXT PRIMARY KEY,nickname TEXT NOT NULL,player_hash TEXT NOT NULL UNIQUE,credential_salt TEXT NOT NULL,
  password_salt TEXT NOT NULL,password_hash TEXT NOT NULL,iterations INTEGER NOT NULL,created_ms INTEGER NOT NULL)`;
const sessionSchema=`CREATE TABLE IF NOT EXISTS verified_login_sessions (
 token_hash TEXT PRIMARY KEY,player_hash TEXT NOT NULL,secret_hash TEXT NOT NULL,created_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL)`;
const sessionIndex='CREATE INDEX IF NOT EXISTS verified_login_expiry ON verified_login_sessions(expires_ms)';
const SESSION_MS=7*86400000;
const CHAT_TICKET_MS=10*60000;
async function newSession(db,account,secret){
 const now=Date.now(),token=randomHex()+randomHex(),expiresAt=now+SESSION_MS;
 await db.prepare('DELETE FROM verified_login_sessions WHERE expires_ms<=?').bind(now).run();
 await db.prepare('INSERT INTO verified_login_sessions(token_hash,player_hash,secret_hash,created_ms,expires_ms) VALUES (?,?,?,?,?)')
  .bind(await hash(token),account.player_hash,await hash(secret),now,expiresAt).run();
 return {nickname:account.nickname,token,expiresAt};
}
export const schema=[...replaySchema,
 `CREATE TABLE IF NOT EXISTS verified_laps (
  session_id TEXT NOT NULL,lap INTEGER NOT NULL,revision TEXT NOT NULL,player_hash TEXT NOT NULL,nickname TEXT NOT NULL,
  start_tick INTEGER NOT NULL,end_tick INTEGER NOT NULL,lap_ticks INTEGER NOT NULL,
  sector1 INTEGER NOT NULL,sector2 INTEGER NOT NULL,sector3 INTEGER NOT NULL,issued_ms INTEGER NOT NULL,
  PRIMARY KEY(session_id,lap))`,
 'CREATE INDEX IF NOT EXISTS verified_order ON verified_laps(revision,lap_ticks,issued_ms,session_id,lap)',
 'CREATE TABLE IF NOT EXISTS verified_limits (key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires INTEGER NOT NULL)',
 accountSchema,sessionSchema,sessionIndex
];
const accountsReady=new WeakSet();
const ensureAccounts=async db=>{
 if(accountsReady.has(db))return;
 // Cache completion only: never share request-owned I/O promises across Worker requests.
 for(const sql of [accountSchema,sessionSchema,sessionIndex])await db.prepare(sql).run();
 accountsReady.add(db);
};
// Cloudflare Workers caps PBKDF2 at 100 000 iterations. If sign-ins exceed the plan's CPU limit,
// set PASSWORD_ITERATIONS lower; each account is rehashed at its next successful sign-in.
const PASSWORD_MIN=8,PASSWORD_MAX=128;
const passwordIterations=env=>{const n=Number(env.PASSWORD_ITERATIONS??100000);return Number.isSafeInteger(n)&&n>=10000&&n<=100000?n:100000;};
const textEncoder=new TextEncoder();
const hex=bytes=>[...new Uint8Array(bytes)].map(n=>n.toString(16).padStart(2,'0')).join('');
const randomHex=()=>hex(crypto.getRandomValues(new Uint8Array(16)));
export const nameKey=name=>name.normalize('NFC').toLowerCase();
const accountName=name=>validName(name)&&name===name.trim()&&!/\s\s/.test(name);
const validPassword=value=>typeof value==='string'&&[...value].length>=PASSWORD_MIN&&value.length<=PASSWORD_MAX;
const sameText=(a,b)=>{if(a.length!==b.length)return false;let diff=0;for(let i=0;i<a.length;i++)diff|=a.charCodeAt(i)^b.charCodeAt(i);return diff===0;};
async function passwordHash(password,salt,iterations){
 const material=await crypto.subtle.importKey('raw',textEncoder.encode(password),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',hash:'SHA-256',salt:textEncoder.encode(salt),iterations},material,256));
}
async function body(request,limit=8192){
 if(!request.headers.get('Content-Type')?.startsWith('application/json'))throw Object.assign(Error('JSON required'),{status:415});
 const reader=request.body?.getReader();if(!reader)throw Object.assign(Error('Missing body'),{status:400});
 const chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>limit){await reader.cancel();throw Object.assign(Error('Body too large'),{status:413});}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 try{return JSON.parse(new TextDecoder().decode(bytes));}catch{throw Object.assign(Error('Invalid JSON'),{status:400});}
}
export default {
 async scheduled(controller,env){
  await env.DB.prepare("DELETE FROM verified_replays WHERE expires_ms<=? AND pinned=0 AND review!='flagged'").bind(Date.now()).run();
 },
 async fetch(request,env){
  const revision=env.SIMULATION_REVISION||BUILD_REVISION;
  const origin=request.headers.get('Origin');
  const origins=new Set((env.GAME_ORIGINS||'https://panulut.github.io,http://localhost:8000,http://127.0.0.1:8000').split(','));
  const headers={'Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const reply=(data,status=200)=>Response.json(data,{status,headers});
  if(origin&&!origins.has(origin))return reply({error:'Origin denied'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers,'Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET, POST, OPTIONS'}});
  try{
   if(!env.DB||!validPlayer(revision)||typeof env.VERIFICATION_SECRET!=='string'||env.VERIFICATION_SECRET.length<32)return reply({error:'Verification not configured'},503);
   const url=new URL(request.url);
   await ensureAccounts(env.DB);
   if(url.pathname.startsWith('/api/verified/replays/')||url.pathname.startsWith('/api/verified/admin/'))return await replayRoute(request,env,url,reply,headers,body);
   if(url.pathname==='/api/verified/leaderboard'&&request.method==='GET'){
    const rows=await env.DB.prepare(`SELECT a.nickname,l.lap_ticks,l.sector1,l.sector2,l.sector3,l.session_id,l.lap,
     CASE WHEN r.pinned=1 THEN 1 ELSE 0 END AS replay_available FROM verified_laps l JOIN verified_replays r USING(session_id,lap) JOIN verified_accounts a ON a.player_hash=l.player_hash
     WHERE l.revision=? AND r.pinned=1 ORDER BY l.lap_ticks,l.issued_ms,l.session_id,l.lap LIMIT 10`).bind(revision).all();
    return reply({protocol,revision:revision,results:rows.results.map(row=>({...row,lap_ms:row.lap_ticks*1000/120}))});
   }
   const limit=async(id,max,windowMs)=>{
    const result=await env.DB.prepare('INSERT INTO verified_limits(key,attempts,expires) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=attempts+1 RETURNING attempts').bind(id,Date.now()+windowMs).first();
    return result.attempts>max;
   };
   if(url.pathname==='/api/verified/account'){
    if(request.method!=='POST')return reply({error:'POST required'},405);
    const now=Date.now(),ip=await hash(request.headers.get('CF-Connecting-IP')||'unknown');
    if(await limit(`a:${ip}:${Math.floor(now/60000)}`,20,120000))return reply({error:'Too many requests'},429);
    await env.DB.prepare('DELETE FROM verified_limits WHERE expires < ?').bind(now).run();
    const data=await body(request);
    if(!accountName(data?.nickname)||!validPassword(data.password))return reply({error:'Invalid account'},400);
    const key=nameKey(data.nickname);
    // Only failed passwords count: tightly per nickname and address, loosely per nickname,
    // so one address cannot lock the owner out and successful sign-ins are never throttled.
    const slot=Math.floor(now/600000),nameId=`f:${await hash(key)}:${slot}`,pairId=`g:${await hash(key+'\n'+ip)}:${slot}`;
    const failures=async id=>(await env.DB.prepare('SELECT attempts FROM verified_limits WHERE key=? AND expires>=?').bind(id,now).first())?.attempts??0;
    const account=await env.DB.prepare('SELECT * FROM verified_accounts WHERE name_key=?').bind(key).first();
    if(account){
     if(data.create===true)return reply({error:'Nickname taken'},409);
     if(await failures(pairId)>=5||await failures(nameId)>=30)return reply({error:'Too many requests'},429);
     if(!sameText(await passwordHash(data.password,account.password_salt,account.iterations),account.password_hash)){
      await limit(pairId,Infinity,1200000);await limit(nameId,Infinity,1200000);
      return reply({error:'Wrong password'},401);
     }
     const iterations=passwordIterations(env);
     if(account.iterations!==iterations){
      const salt=randomHex();
      await env.DB.prepare('UPDATE verified_accounts SET password_salt=?,password_hash=?,iterations=? WHERE name_key=?')
       .bind(salt,await passwordHash(data.password,salt,iterations),iterations,key).run();
     }
     return reply({...await newSession(env.DB,account,env.VERIFICATION_SECRET),created:false});
    }
    if(data.create!==true)return reply({error:'Account not found'},404);
    const created={name_key:key,nickname:data.nickname,credential_salt:randomHex(),password_salt:randomHex(),iterations:passwordIterations(env),created_ms:now};
    created.password_hash=await passwordHash(data.password,created.password_salt,created.iterations);
    created.player_hash=randomHex()+randomHex();
    const inserted=await env.DB.prepare(`INSERT OR IGNORE INTO verified_accounts
     (name_key,nickname,player_hash,credential_salt,password_salt,password_hash,iterations,created_ms) VALUES (?,?,?,?,?,?,?,?)`)
     .bind(key,created.nickname,created.player_hash,created.credential_salt,created.password_salt,created.password_hash,created.iterations,now).run();
    if(!inserted.meta.changes)return reply({error:'Nickname taken'},409);
    return reply({...await newSession(env.DB,created,env.VERIFICATION_SECRET),created:true},201);
   }
   if(!['/api/verified/start','/api/verified/chat-ticket','/api/verified/laps','/api/verified/logout'].includes(url.pathname))return reply({error:'Not found'},404);
   if(request.method!=='POST')return reply({error:'POST required'},405);
   const token=request.headers.get('Authorization')?.replace(/^Bearer /,'');
   if(!validPlayer(token))return reply({error:'Player credential required'},401);
   const tokenHash=await hash(token),secretHash=await hash(env.VERIFICATION_SECRET),now=Date.now(),starting=url.pathname.endsWith('/start');
   if(url.pathname==='/api/verified/logout'){
    await env.DB.prepare('DELETE FROM verified_login_sessions WHERE token_hash=?').bind(tokenHash).run();
    return reply({signedOut:true});
   }
   const owner=await env.DB.prepare(`SELECT a.nickname,a.player_hash FROM verified_login_sessions s
    JOIN verified_accounts a ON a.player_hash=s.player_hash
    WHERE s.token_hash=? AND s.expires_ms>? AND s.secret_hash=?`).bind(tokenHash,now,secretHash).first();
   if(!owner)return reply({error:'Sign in required'},401);
   const playerHash=owner.player_hash;
   const minute=Math.floor(now/60000),ip=await hash(request.headers.get('CF-Connecting-IP')||'unknown');
   for(const [id,max]of [[`p:${playerHash}:${minute}`,20],[`i:${ip}:${minute}`,80]]){
    if(await limit(id,max,120000))return reply({error:'Too many requests'},429);
   }
   await env.DB.prepare('DELETE FROM verified_limits WHERE expires < ?').bind(now).run();
   if(url.pathname==='/api/verified/chat-ticket'){
    // Short-lived, so a logout or a stolen ticket cannot post for long.
    const expiresAt=now+CHAT_TICKET_MS;
    return reply({protocol,nickname:owner.nickname,expiresInMs:CHAT_TICKET_MS,
     ticket:await sign({kind:'chat',protocol,playerHash,nickname:owner.nickname,issuedAt:now,expiresAt},env.VERIFICATION_SECRET)});
   }
   const data=await body(request,starting?8192:950000);
   if(starting){
    if(data?.revision!==revision)return reply({error:'Invalid start'},400);
    const nonce=crypto.randomUUID().replaceAll('-','')+crypto.randomUUID().replaceAll('-','');
    return reply({protocol,nickname:owner.nickname,ticket:await sign({kind:'start',protocol,revision:revision,playerHash,nickname:owner.nickname,nonce,issuedAt:now,expiresAt:now+120000},env.VERIFICATION_SECRET)});
   }
   let lap;try{lap=await verify(data?.receipt,env.VERIFICATION_SECRET);}catch{return reply({error:'Invalid lap signature'},403);}
   if(lap.kind!=='lap'||lap.protocol!==protocol||lap.revision!==revision||lap.playerHash!==playerHash||!validName(lap.nickname)||
    !/^[a-f0-9]{32}$/.test(lap.sessionId)||!Number.isSafeInteger(lap.lap)||lap.lap<1||
    !Number.isSafeInteger(lap.startTick)||lap.startTick<0||!Number.isSafeInteger(lap.endTick)||lap.endTick>72000||
    !Number.isSafeInteger(lap.lapTicks)||lap.lapTicks<=600||lap.endTick-lap.startTick!==lap.lapTicks||
    !Array.isArray(lap.sectorTicks)||lap.sectorTicks.length!==3||!lap.sectorTicks.every(n=>Number.isSafeInteger(n)&&n>0)||lap.sectorTicks.reduce((a,b)=>a+b,0)!==lap.lapTicks||
    !Number.isSafeInteger(lap.issuedAt)||lap.issuedAt>now+5000)return reply({error:'Invalid verified lap'},403);
   if(!validPlayer(lap.replayHash)||typeof data.replay!=='string')return reply({error:'A signed public replay is required for leaderboard submission'},403);
   const replayWrites=await replayStatements(env,lap,data,now,{tokenHash,secretHash});
   const insert=env.DB.prepare(`INSERT OR IGNORE INTO verified_laps
    (session_id,lap,revision,player_hash,nickname,start_tick,end_tick,lap_ticks,sector1,sector2,sector3,issued_ms) SELECT ?,?,?,?,?,?,?,?,?,?,?,?
    WHERE EXISTS (SELECT 1 FROM verified_login_sessions s JOIN verified_accounts a ON a.player_hash=s.player_hash
     WHERE s.token_hash=? AND s.expires_ms>? AND s.secret_hash=? AND a.player_hash=?)`)
    .bind(lap.sessionId,lap.lap,lap.revision,lap.playerHash,lap.nickname,lap.startTick,lap.endTick,lap.lapTicks,...lap.sectorTicks,lap.issuedAt,tokenHash,Date.now(),secretHash,playerHash);
   const [inserted]=await env.DB.batch([insert,...replayWrites]);
   // Revocation/expiry can occur while reading the body or checking the signature.
   // The write above validates the session atomically; distinguish this from a duplicate lap.
   if(!inserted.meta.changes&&!await env.DB.prepare(`SELECT 1 FROM verified_login_sessions s
    JOIN verified_accounts a ON a.player_hash=s.player_hash WHERE s.token_hash=? AND s.expires_ms>? AND s.secret_hash=?`)
    .bind(tokenHash,Date.now(),secretHash).first())return reply({error:'Sign in required'},401);
   return reply({protocol,saved:inserted.meta.changes>0,verified:true,lap:lap.lap,lapMs:lap.lapTicks*1000/120});
  }catch(error){console.error('Verified leaderboard request failed',error.status||500);return reply({error:error.status?error.message:'Verified leaderboard unavailable'},error.status||503);}
 }
};
