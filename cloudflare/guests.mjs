import {hash,validPlayer} from '../verification/protocol.mjs';

// A guest is a durable principal, not a nickname. Promotion adds an account with
// the SAME player_hash; immutable laps and signed evidence never need rewriting.
export const guestSchema=[
 `CREATE TABLE IF NOT EXISTS verified_guests (
 player_hash TEXT PRIMARY KEY,nickname TEXT NOT NULL,created_ms INTEGER NOT NULL)`,
 `CREATE TABLE IF NOT EXISTS verified_lap_evidence (
 session_id TEXT NOT NULL,lap INTEGER NOT NULL,receipt TEXT NOT NULL,replay_hash TEXT NOT NULL,accepted_ms INTEGER NOT NULL,
 PRIMARY KEY(session_id,lap))`,
 `CREATE TABLE IF NOT EXISTS verified_record_archive (
 session_id TEXT NOT NULL,lap INTEGER NOT NULL,PRIMARY KEY(session_id,lap))`,
 `CREATE TABLE IF NOT EXISTS verified_lap_upload_failures (
 session_id TEXT NOT NULL,lap INTEGER NOT NULL,reason TEXT NOT NULL,at_ms INTEGER NOT NULL,
 PRIMARY KEY(session_id,lap))`
];
// SQLite's clock closes expiry races while hashing passwords or waiting for D1.
export const databaseNowSQL="(CAST(strftime('%s','now') AS INTEGER)*1000+CAST(substr(strftime('%f','now'),4,3) AS INTEGER))";
export const guestNameSQL=`COALESCE(a.nickname,g.nickname || ' (vierailija)')`;
export const principalJoins=`LEFT JOIN verified_accounts a ON a.player_hash=l.player_hash
 LEFT JOIN verified_guests g ON g.player_hash=l.player_hash`;
export const principalExists=`(a.player_hash IS NOT NULL OR g.player_hash IS NOT NULL)`;
export async function sessionOwner(db,token,secret,now=Date.now()){
 if(!validPlayer(token))return null;
 return db.prepare(`SELECT COALESCE(a.nickname,g.nickname) nickname,s.player_hash,s.expires_ms,
 CASE WHEN a.player_hash IS NULL THEN 1 ELSE 0 END guest FROM verified_login_sessions s
 LEFT JOIN verified_accounts a ON a.player_hash=s.player_hash
 LEFT JOIN verified_guests g ON g.player_hash=s.player_hash
 WHERE s.token_hash=? AND s.expires_ms>MAX(?,${databaseNowSQL}) AND s.secret_hash=?
 AND (a.player_hash IS NOT NULL OR g.player_hash IS NOT NULL)`)
 .bind(await hash(token),now,await hash(secret)).first();
}
export async function identityReply(db,owner,token){
 return {nickname:owner.nickname,token,expiresAt:owner.expires_ms,guest:!!owner.guest,series:(await db.prepare('SELECT series FROM verified_account_series WHERE player_hash=?').bind(owner.player_hash).first())?.series||'human'};
}
// Only authenticated, signature-validated lap identifiers reach this audit log.
export async function uploadFailure(db,lap,reason,login){
 await db.prepare(`INSERT INTO verified_lap_upload_failures(session_id,lap,reason,at_ms)
 SELECT ?,?,?,? WHERE EXISTS (SELECT 1 FROM verified_login_sessions
 WHERE token_hash=? AND expires_ms>MAX(?,${databaseNowSQL}) AND secret_hash=? AND player_hash=?)
 ON CONFLICT(session_id,lap) DO UPDATE SET reason=excluded.reason,at_ms=excluded.at_ms`)
 .bind(lap.sessionId,lap.lap,reason,Date.now(),login.tokenHash,Date.now(),login.secretHash,lap.playerHash).run();
}
