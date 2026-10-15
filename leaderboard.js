(() => {
  'use strict';
  const endpoint = 'https://lpr-leaderboard.panu-musakka.workers.dev';
  const version = 'lut-20261011-v3';
  const t = (text, values) => window.LPRI18n?.t(text, values) ?? text;
  const nickname = document.querySelector('#leaderboard-name');
  const status = document.querySelector('#leaderboard-status');
  const list = document.querySelector('#leaderboard-list');
  const format = ms => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`;
  const dialog = document.querySelector('#settings-dialog');
  const startForm = document.querySelector('#leaderboard-start-form');
  const startButton = document.querySelector('#leaderboard-start');
  const closeButton = document.querySelector('#close-settings');
  const podium = document.querySelector('#leaderboard-podium');
  const validName = name => /^[\p{L}\p{N} _.-]{1,24}$/u.test(name);
  const validToken = value => /^[a-f0-9]{64}$/.test(value ?? '');
  const newToken = () => [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join('');
  let trackBestMs = null;
  let token, activeName = '', rememberedName = '', legacyToken;
  try {
    rememberedName = localStorage.getItem('lpr-nickname') ?? '';
    nickname.value = rememberedName;
    legacyToken = localStorage.getItem('lpr-player-token');
  } catch {}
  function chooseIdentity(name) {
    // A shared phone can have several drivers; changing names must not submit
    // one person's lap under another person's persistent best-time identity.
    const key = `lpr-player-token:${name.normalize('NFC').toLowerCase()}`;
    let saved;
    try { saved = localStorage.getItem(key); } catch {}
    const identity = validToken(saved) ? saved
      : name === rememberedName && validToken(legacyToken) ? legacyToken : newToken();
    try {
      localStorage.setItem(key, identity);
      localStorage.setItem('lpr-player-token', identity);
      localStorage.setItem('lpr-nickname', name);
    } catch {}
    return identity;
  }
  nickname.addEventListener('input', () => nickname.setCustomValidity(''));
  startForm.addEventListener('submit', event => {
    event.preventDefault();
    if (activeName) return;
    const name = nickname.value.trim().normalize('NFC');
    if (!validName(name)) {
      nickname.setCustomValidity(t('Kirjoita 1–24 merkin nimimerkki. Käytä kirjaimia, numeroita, välilyöntiä, pistettä, viivaa tai alaviivaa.'));
      nickname.reportValidity();
      return;
    }
    token = chooseIdentity(name);
    activeName = name;
    nickname.value = name;
    nickname.readOnly = true;
    startButton.hidden = true;
    closeButton.hidden = false;
    dialog.classList.remove('session-start');
    dialog.close();
  });
  dialog.addEventListener('cancel', event => { if (!activeName) event.preventDefault(); });
  async function api(path, options) {
    const response = await fetch(endpoint + path, { ...options, signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`Leaderboard HTTP ${response.status}`);
    return response.json();
  }
  async function refresh() {
    list.textContent = t('Ladataan tuloslistaa…');
    podium.setAttribute('aria-busy', 'true');
    try {
      const data = await api('/api/leaderboard');
      if (data.version !== version || !Array.isArray(data.results)) throw new Error('Invalid leaderboard');
      list.textContent = '';
      const results = data.results.slice(0, 10);
      trackBestMs = results[0]?.lap_ms ?? null;
      for (let rank = 1; rank <= 3; rank++) {
        const row = results[rank - 1];
        const name = document.querySelector(`#podium-name-${rank}`);
        name.textContent = row ? row.nickname : '—';
        name.title = row ? row.nickname : '';
        document.querySelector(`#podium-time-${rank}`).textContent = row ? format(row.lap_ms) : '—';
      }
      for (const row of results) {
        const item = document.createElement('li');
        item.textContent = `${row.nickname} · ${format(row.lap_ms)}`;
        list.append(item);
      }
      if (!data.results.length) list.textContent = t('Ei vielä tuloksia.');
      return true;
    } catch {
      list.textContent = t('Tuloslista ei ole juuri nyt saatavilla.');
      return false;
    } finally { podium.setAttribute('aria-busy', 'false'); }
  }
  document.querySelector('#leaderboard-refresh').addEventListener('click', refresh);
  window.LPRLeaderboard = {
    refresh,
    get requiresName() { return !activeName; },
    beginSession() {
      if (activeName) return;
      // The last name is a suggestion, never an automatic login: each page
      // load requires an explicit confirmation before any driving can start.
      dialog.classList.add('session-start');
      closeButton.hidden = true;
      startButton.hidden = false;
      if (!dialog.open) dialog.showModal();
      refresh();
    },
    async submit(lapMs, sectors) {
      const name = activeName;
      if (!token || !validName(name)) {
        status.textContent = t('Valitse nimimerkki tuloslistasta ennen seuraavaa kierrosta.');
        return;
      }
      try {
        status.textContent = t('Lähetetään kierrosaikaa…');
        const rounded = sectors.map(Math.round);
        const elapsed = Math.round(lapMs);
        rounded[2] += elapsed - rounded.reduce((a, b) => a + b, 0);
        const previousRecord = trackBestMs;
        const result = await api('/api/laps', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ version, nickname: name, lapMs: elapsed, sectors: rounded })
        });
        if (result.saved === true && result.rank === 1 && result.bestMs === elapsed &&
            (previousRecord === null || elapsed < previousRecord)) {
          trackBestMs = elapsed;
          window.LPRRaceEffects?.celebrate(elapsed);
        }
        status.textContent = `${t('Oma sijoitus')}: ${result.rank} · ${t('Paras')}: ${format(result.bestMs)}`;
        await refresh();
      } catch { status.textContent = t('Tuloksen lähetys epäonnistui. Oma aika säilyy selaimessa.'); }
    }
  };
  window.LPRLeaderboard.beginSession();
})();
