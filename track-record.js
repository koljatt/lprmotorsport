(() => {
  'use strict';
  const time = document.querySelector('#best-time');
  const holder = document.querySelector('#record-holder');
  const config = window.LPRVerificationConfig;
  const revision = window.LPRDrivingRevision;
  if (!time || !holder || !config?.leaderboard || !revision) return;
  let loading = false;
  async function refresh() {
    if (loading) return;
    loading = true;
    try {
      const response = await fetch(config.leaderboard + '/api/verified/leaderboard?series=human', { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw Error('Track record unavailable');
      const data = await response.json();
      if (data.protocol !== 'driving-v1' || data.revision !== revision || !Array.isArray(data.results)) throw Error('Invalid track record');
      const record = data.results[0];
      if (record && (!Number.isFinite(record.lap_ms) || record.lap_ms <= 0 || typeof record.nickname !== 'string')) throw Error('Invalid track record');
      const ms = record ? Math.round(record.lap_ms) : 0;
      time.textContent = record ? `${String(Math.floor(ms / 60000)).padStart(2, '0')}:${String(Math.floor(ms / 1000) % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}` : '--:--.---';
      holder.textContent = record ? record.nickname : '—';
      holder.title = record ? record.nickname : '';
    } catch {
      // Keep the last confirmed official record during a temporary network outage.
    } finally {
      loading = false;
    }
  }
  document.addEventListener('lpr-lap-saved', () => void refresh());
  document.addEventListener('visibilitychange', () => { if (!document.hidden) void refresh(); });
  window.addEventListener('online', () => void refresh());
  setInterval(() => { if (!document.hidden) void refresh(); }, 30000);
  void refresh();
})();
