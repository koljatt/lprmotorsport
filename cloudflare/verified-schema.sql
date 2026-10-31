-- Separate verified results; never migrates legacy lap times.
CREATE TABLE IF NOT EXISTS verified_chat_messages (
 id TEXT PRIMARY KEY,nickname TEXT NOT NULL,text TEXT NOT NULL,at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS verified_chat_expiry ON verified_chat_messages(at);
CREATE TABLE IF NOT EXISTS verified_lap_exclusions (
 session_id TEXT NOT NULL,lap INTEGER NOT NULL,reason TEXT NOT NULL DEFAULT 'admin',created_ms INTEGER NOT NULL,
 PRIMARY KEY(session_id,lap));
CREATE TABLE IF NOT EXISTS verified_laps (
  session_id TEXT NOT NULL,lap INTEGER NOT NULL,revision TEXT NOT NULL,player_hash TEXT NOT NULL,nickname TEXT NOT NULL,
  start_tick INTEGER NOT NULL,end_tick INTEGER NOT NULL,lap_ticks INTEGER NOT NULL,
  sector1 INTEGER NOT NULL,sector2 INTEGER NOT NULL,sector3 INTEGER NOT NULL,issued_ms INTEGER NOT NULL,
  PRIMARY KEY(session_id,lap));
CREATE INDEX IF NOT EXISTS verified_order ON verified_laps(revision,lap_ticks,issued_ms,session_id,lap);
CREATE TABLE IF NOT EXISTS verified_limits (key TEXT PRIMARY KEY,attempts INTEGER NOT NULL,expires INTEGER NOT NULL);
-- One account owns one nickname; passwords are stored only as PBKDF2-SHA-256 hashes.
CREATE TABLE IF NOT EXISTS verified_accounts (
  name_key TEXT PRIMARY KEY,nickname TEXT NOT NULL,player_hash TEXT NOT NULL UNIQUE,credential_salt TEXT NOT NULL,
  password_salt TEXT NOT NULL,password_hash TEXT NOT NULL,iterations INTEGER NOT NULL,created_ms INTEGER NOT NULL);

-- Random, individually revocable logins with an absolute seven-day lifetime.
CREATE TABLE IF NOT EXISTS verified_login_sessions (
 token_hash TEXT PRIMARY KEY,player_hash TEXT NOT NULL,secret_hash TEXT NOT NULL,created_ms INTEGER NOT NULL,expires_ms INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS verified_login_expiry ON verified_login_sessions(expires_ms);


CREATE TABLE IF NOT EXISTS verified_replays (
 session_id TEXT NOT NULL,lap INTEGER NOT NULL,payload TEXT NOT NULL,payload_hash TEXT NOT NULL,
 expires_ms INTEGER NOT NULL,pinned INTEGER NOT NULL DEFAULT 0,review TEXT NOT NULL DEFAULT 'unreviewed',
 PRIMARY KEY(session_id,lap));
CREATE INDEX IF NOT EXISTS replay_expiry ON verified_replays(pinned,review,expires_ms);

-- Leaderboard series per account; a missing row means the human series.
CREATE TABLE IF NOT EXISTS verified_account_series (
 player_hash TEXT PRIMARY KEY,series TEXT NOT NULL CHECK(series IN ('human','bot')),changed_ms INTEGER NOT NULL);
-- One report per signed-in viewer and recording; removed together with the recording.
CREATE TABLE IF NOT EXISTS verified_reports (
 session_id TEXT NOT NULL,lap INTEGER NOT NULL,reporter_hash TEXT NOT NULL,reason TEXT NOT NULL,note TEXT NOT NULL DEFAULT '',
 created_ms INTEGER NOT NULL,PRIMARY KEY(session_id,lap,reporter_hash));
CREATE INDEX IF NOT EXISTS verified_report_author ON verified_reports(reporter_hash,created_ms);
-- Accepted daily entries. Old lap rows are intentionally not backfilled.
CREATE TABLE IF NOT EXISTS championship_laps (
 session_id TEXT NOT NULL,lap INTEGER NOT NULL,day TEXT NOT NULL,player_hash TEXT NOT NULL,
 revision TEXT NOT NULL,lap_ticks INTEGER NOT NULL,PRIMARY KEY(session_id,lap));
CREATE INDEX IF NOT EXISTS championship_days ON championship_laps(day,player_hash,lap_ticks);
CREATE INDEX IF NOT EXISTS championship_player_days ON championship_laps(player_hash,day);
CREATE TRIGGER IF NOT EXISTS championship_delete_lap AFTER DELETE ON verified_laps BEGIN
 DELETE FROM championship_laps WHERE session_id=OLD.session_id AND lap=OLD.lap; END;
CREATE TRIGGER IF NOT EXISTS championship_delete_account AFTER DELETE ON verified_accounts BEGIN
 DELETE FROM championship_laps WHERE player_hash=OLD.player_hash; END;

-- Additive and repeatable: no existing records are rewritten.
CREATE TABLE IF NOT EXISTS verified_guests (
 player_hash TEXT PRIMARY KEY,nickname TEXT NOT NULL,created_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS verified_lap_evidence (
 session_id TEXT NOT NULL,lap INTEGER NOT NULL,receipt TEXT NOT NULL,replay_hash TEXT NOT NULL,accepted_ms INTEGER NOT NULL,
 PRIMARY KEY(session_id,lap));
CREATE TABLE IF NOT EXISTS verified_record_archive (
 session_id TEXT NOT NULL,lap INTEGER NOT NULL,PRIMARY KEY(session_id,lap));
CREATE TABLE IF NOT EXISTS verified_lap_upload_failures (
 session_id TEXT NOT NULL,lap INTEGER NOT NULL,reason TEXT NOT NULL,at_ms INTEGER NOT NULL,
 PRIMARY KEY(session_id,lap));
INSERT OR IGNORE INTO verified_record_archive SELECT session_id,lap FROM verified_replays WHERE pinned=1;
CREATE INDEX IF NOT EXISTS verified_owner_time ON verified_laps(player_hash,issued_ms);
