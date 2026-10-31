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
