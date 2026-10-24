const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const { pathToFileURL } = require('node:url');

(async () => {
  const real = (await import(pathToFileURL(path.join(__dirname, '../cloudflare/worker.mjs')).href)).default;
  // Simulate a consenting browser: the session starts the lap, then records its completion.
  const analyticsEvent = async (lapMs, env, { start = true, late = 0 } = {}) => {
    const token = require('node:crypto').randomBytes(32).toString('hex'), now = Date.now(), id = () => require('node:crypto').randomBytes(32).toString('hex');
    const events = [{ id: id(), type: 'lap_complete', state: 'driving', input: 'keyboard', nickname: '', at: now, lapMs }];
    if (start) events.unshift({ id: id(), type: 'lap_start', state: 'driving', input: 'keyboard', nickname: '', at: now - lapMs + late });
    const response = await real.fetch(new Request('https://example.com/api/analytics/events', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, session: 'd'.repeat(64), version: 'lut-20261024-v4', consentAt: now,
        meta: { device: 'desktop', browser: 'Chrome', os: 'Windows', width: 1, height: 1, language: 'fi', referrer: '' },
        events }) }), env);
    assert.equal(response.status, 200);
    return token;
  };
  const worker = { async fetch(request, env) {
    if (request.method !== 'POST' || !request.url.endsWith('/api/laps')) return real.fetch(request, env);
    let body; try { body = JSON.parse(await request.clone().text()); } catch {}
    if (!Number.isSafeInteger(body?.lapMs) || body.lapMs <= 5000 || 'analyticsToken' in body) return real.fetch(request, env);
    return real.fetch(new Request(request.url, { method: 'POST', headers: request.headers,
      body: JSON.stringify({ ...body, analyticsToken: await analyticsEvent(body.lapMs, env) }) }), env);
  } };
  const db = new DatabaseSync(':memory:');
  // Start with the production legacy schema and existing records only.
  const schema = fs.readFileSync(path.join(__dirname, '../cloudflare/schema.sql'), 'utf8');
  db.exec(schema.split('-- Every completed lap')[0]);
  db.prepare('INSERT INTO best_laps(version,player_hash,nickname,lap_ms,sector1,sector2,sector3) VALUES (?,?,?,?,?,?,?)')
    .run('lut-20261024-v4','legacy-player','Panu',69698,16237,17170,36291);
  const env = { DB: { async batch(statements) {
    db.exec('BEGIN');
    try { const results=[];for(const statement of statements)results.push(await statement.run());db.exec('COMMIT');return results; }
    catch(error) { db.exec('ROLLBACK');throw error; }
  }, prepare(sql) {
    let values = [];
    return {
      bind(...args) { values = args; return this; },
      async first() { return db.prepare(sql).get(...values); },
      async all() { return { results: db.prepare(sql).all(...values) }; },
      async run() { return { meta: { changes: Number(db.prepare(sql).run(...values).changes) } }; }
    };
  } } };
  const origin = 'https://panulut.github.io';
  const data = { version: 'lut-20261024-v4', nickname: 'Test Driver', lapMs: 40000, sectors: [10000, 10000, 20000] };
  const request = (body, token = 'a'.repeat(64), extra = {}) => new Request('https://example.com/api/laps', {
    method: 'POST', headers: { Origin: origin, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...extra }, body: JSON.stringify(body)
  });
  let response = await worker.fetch(request(data), env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  let result = await response.json();assert.equal(result.rank,1);assert.equal(result.record,true);assert.equal(result.mode,'laps');
  response = await worker.fetch(request({ ...data, lapMs: 45000, sectors: [10000, 10000, 25000] }), env);
  result=await response.json();assert.equal(result.saved,true);assert.equal(result.rank,2);assert.equal(result.record,false);
  const lapId='c'.repeat(64);
  const fastest={ ...data, lapId, lapMs:35000, sectors:[10000,10000,15000] };
  result=await (await worker.fetch(request(fastest),env)).json();assert.equal(result.bestMs,35000);assert.equal(result.record,true);
  result=await (await worker.fetch(request(fastest),env)).json();assert.equal(result.saved,false,'Retry is idempotent');assert.equal(result.record,false);
  assert.equal((await worker.fetch(request({...fastest,lapMs:36000,sectors:[10000,10000,16000]}),env)).status,409);
  response = await worker.fetch(request(data, 'b'.repeat(64)), env);
  assert.equal((await response.json()).rank,3,'Equal times retain arrival order');
  const board = await worker.fetch(new Request('https://example.com/api/leaderboard'), env);
  const results = (await board.json()).results;
  assert.equal(results.length,5,'Slower laps by the same driver remain separate entries');
  assert.equal(results[0].lap_ms,35000);assert.equal(results.at(-1).lap_ms,69698,'Legacy record survives automatic migration');
  assert.equal(results[0].player_hash,undefined);
  db.exec(schema);db.exec(schema);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM laps').get().n,5,'Rerunning migration does not duplicate historical laps');
  db.exec('DELETE FROM submission_limits');
  for(let i=0;i<10;i++) {
    const lapMs=30000+i*500;
    response=await worker.fetch(request({...data,lapMs,sectors:[8000,8000,lapMs-16000]}),env);
    assert.equal(response.status,200);
  }
  const top=(await (await worker.fetch(new Request('https://example.com/api/leaderboard'),env)).json()).results;
  assert.equal(top.length,10);assert(top.every(row=>row.nickname==='Test Driver'),'One driver can hold every TOP 10 place in one session');
  assert.deepEqual(top.map(row=>row.lap_ms),Array.from({length:10},(_,i)=>30000+i*500));
  const longLap={...data,lapMs:7200000,sectors:[10000,10000,7180000]};
  db.exec('DELETE FROM submission_limits');
  assert.equal((await worker.fetch(request(longLap),env)).status,200,'A long break does not invalidate the lap');
  db.exec('DELETE FROM submission_limits');
  assert.equal((await worker.fetch(request({ ...data, sectors: [1, 2, 3] }), env)).status, 400);
  assert.equal((await worker.fetch(request({ ...data, lapMs: 29999, sectors: [9999, 10000, 10000] }), env)).status, 400, 'Implausibly fast lap is rejected');
  assert.equal((await worker.fetch(request({ ...data, lapMs: 40000, sectors: [4999, 15001, 20000] }), env)).status, 400, 'Implausibly fast sector is rejected');
  assert.equal((await worker.fetch(request({ ...data, version: 'old' }), env)).status, 400);
  assert.equal((await worker.fetch(request({ ...data, nickname: '<script>' }), env)).status, 400);
  assert.equal((await worker.fetch(request(null), env)).status, 400);
  assert.equal((await worker.fetch(request(data, 'bad'), env)).status, 401);
  assert.equal((await worker.fetch(request(data, 'a'.repeat(64), { Origin: 'https://other.example' }), env)).status, 403);
  assert.equal((await worker.fetch(request({ ...data, padding: 'x'.repeat(3000) }), env)).status, 413);
  const preflight = await worker.fetch(new Request('https://example.com/api/laps', { method: 'OPTIONS', headers: { Origin: origin } }), env);
  assert.equal(preflight.status, 204);
  for (let i = 0; i < 10; i++) assert.equal((await worker.fetch(request(data), env)).status, 200);
  assert.equal((await worker.fetch(request(data), env)).status, 429);
  db.exec('DELETE FROM submission_limits');
  assert.equal((await worker.fetch(request({ ...data, lapMs: 41000, sectors: [10000, 10000, 21000], analyticsToken: 'e'.repeat(64) }), env)).status, 428, 'Lap without analytics trail is rejected');
  const otherLap = await analyticsEvent(42000, env);
  assert.equal((await worker.fetch(request({ ...data, lapMs: 41000, sectors: [10000, 10000, 21000], analyticsToken: otherLap }), env)).status, 428, 'Analytics must contain the same lap');
  assert.equal((await worker.fetch(request({ ...data, lapMs: 42000, sectors: [10000, 10000, 22000], analyticsToken: otherLap }), env)).status, 200);
  assert.equal((await worker.fetch(request({ ...data, lapMs: 43000, sectors: [10000, 10000, 23000], analyticsToken: 'x' }), env)).status, 400);
  const noStart = await analyticsEvent(44000, env, { start: false });
  assert.equal((await worker.fetch(request({ ...data, lapMs: 44000, sectors: [10000, 10000, 24000], analyticsToken: noStart }), env)).status, 428, 'Completion without a lap start in the same session is rejected');
  const tooSoon = await analyticsEvent(44000, env, { late: 5000 });
  assert.equal((await worker.fetch(request({ ...data, lapMs: 44000, sectors: [10000, 10000, 24000], analyticsToken: tooSoon }), env)).status, 428, 'Lap start must precede completion by the lap time');
  const jitter = await analyticsEvent(44000, env, { late: 1500 });
  assert.equal((await worker.fetch(request({ ...data, lapMs: 44000, sectors: [10000, 10000, 24000], analyticsToken: jitter }), env)).status, 200, 'Frame and clock jitter within 2 s is tolerated');
  env.ANALYTICS_ADMIN_TOKEN = 'z'.repeat(40);
  const admin = (query = '', method = 'GET', token = env.ANALYTICS_ADMIN_TOKEN) => worker.fetch(new Request('https://example.com/api/admin/laps' + query, { method, headers: { Authorization: `Bearer ${token}`, ...(method === 'DELETE' ? { Origin: 'https://example.com' } : {}) } }), env);
  assert.equal((await admin('', 'GET', 'wrong'.repeat(8))).status, 401);
  assert.equal((await admin('?id=1', 'DELETE', 'wrong'.repeat(8))).status, 401);
  let listed = (await (await admin()).json()).results;
  assert.equal(listed[0].lap_ms, 30000);assert.equal(listed[0].player_hash.length, 64);
  assert.equal((await admin('?id=' + listed[0].id, 'DELETE')).status, 200);
  listed = (await (await admin()).json()).results;
  assert.equal(listed[0].lap_ms, 30500, 'Single lap removed');
  assert.equal((await admin('?id=999999', 'DELETE')).status, 404);
  assert.equal((await admin('?id=abc', 'DELETE')).status, 400);
  const legacy = listed.find(r => r.player_hash === 'legacy-player');
  assert.equal((await admin('?id=' + legacy.id, 'DELETE')).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM best_laps').get().n, 0, 'Legacy source removed so migration cannot restore it');
  const cheater = listed[0].player_hash;
  assert.equal((await admin('?player=' + cheater, 'DELETE')).status, 200);
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM laps WHERE player_hash = ?').get(cheater).n, 0, 'All laps of a player removed');
  assert((await (await admin()).json()).results.length > 0, 'Other players remain');
  assert.equal((await admin('', 'POST')).status, 405);
  db.close();
  console.log('PASS: real SQLite schema, independent laps, top ten from one driver, idempotent retries, legacy migration, rank, public list, CORS, validation, plausibility floors, analytics lap trail, body limits, submission throttling and admin lap removal');
})().catch(error => { console.error(error); process.exitCode = 1; });
