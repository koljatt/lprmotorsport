CREATE TABLE IF NOT EXISTS best_laps (
  version TEXT NOT NULL,
  player_hash TEXT NOT NULL,
  nickname TEXT NOT NULL,
  lap_ms INTEGER NOT NULL CHECK(lap_ms > 5000),
  sector1 INTEGER NOT NULL,
  sector2 INTEGER NOT NULL,
  sector3 INTEGER NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(version, player_hash)
);
CREATE INDEX IF NOT EXISTS leaderboard_order ON best_laps(version, lap_ms, updated_at);
CREATE TABLE IF NOT EXISTS submission_limits (
  ip_hash TEXT PRIMARY KEY,
  expires INTEGER NOT NULL,
  attempts INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS limits_expiry ON submission_limits(expires);

-- Every completed lap is a separate entry, including repeated drivers.
CREATE TABLE IF NOT EXISTS laps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version TEXT NOT NULL,
  player_hash TEXT NOT NULL,
  lap_id TEXT NOT NULL,
  nickname TEXT NOT NULL,
  lap_ms INTEGER NOT NULL CHECK(lap_ms > 5000),
  sector1 INTEGER NOT NULL,
  sector2 INTEGER NOT NULL,
  sector3 INTEGER NOT NULL,
  UNIQUE(version, player_hash, lap_id)
);
CREATE INDEX IF NOT EXISTS laps_order ON laps(version, lap_ms, id);
INSERT OR IGNORE INTO laps(version, player_hash, lap_id, nickname, lap_ms, sector1, sector2, sector3)
  SELECT version, player_hash, 'legacy', nickname, lap_ms, sector1, sector2, sector3 FROM best_laps;
