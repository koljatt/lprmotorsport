/* Refresh an open local game after project edits have been saved. */
(() => {
  'use strict';
  if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)) return;
  const api = window.LPRTrackDocument;
  const loaded = JSON.stringify(api.validate(window.LPRTrackData));
  let checking = false;
  async function check() {
    if (checking || document.hidden) return;
    checking = true;
    try {
      const response = await fetch('data/track-objects.json', { cache: 'no-store' });
      if (!response.ok) return;
      const saved = JSON.stringify(api.validate(await response.json()));
      if (saved !== loaded) window.location.reload();
    } catch {
      // A temporary connection failure must not interrupt driving.
    } finally {
      checking = false;
    }
  }
  window.addEventListener('focus', check);
  window.addEventListener('pageshow', check);
  document.addEventListener('visibilitychange', check);
})();
