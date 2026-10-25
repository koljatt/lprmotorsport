-- Separate verified results; never migrates legacy lap times.
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
