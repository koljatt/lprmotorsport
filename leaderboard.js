(() => {
  'use strict';
  const endpoint = 'https://lpr-leaderboard.panu-musakka.workers.dev';
  const version = 'lut-20261024-v4';
  const protocol = 'timed-v1';
  const t = (text, values) => window.LPRI18n?.t(text, values) ?? text;
  const nickname = document.querySelector('#leaderboard-name');
  const status = document.querySelector('#leaderboard-status');
  const list = document.querySelector('#leaderboard-list');
  const format = ms => `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`;
  const dialog = document.querySelector('#settings-dialog');
  const startForm = document.querySelector('#leaderboard-start-form');
  const consent = document.querySelector('#analytics-consent');
  const startButton = document.querySelector('#leaderboard-start');
  const closeButton = document.querySelector('#close-settings');
  const validName = name => /^[\p{L}\p{N} _.-]{1,24}$/u.test(name) && !/\s\s/.test(name);
  const validToken = value => /^[a-f0-9]{64}$/.test(value ?? '');
  const newToken = () => [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join('');
  const nameKey = name => name.normalize('NFC').toLowerCase();
  const password = document.querySelector('#leaderboard-password');
  const passwordRow = [document.querySelector('#leaderboard-password-label'), password, document.querySelector('#leaderboard-password-hint')];
  const logoutButton = document.querySelector('#leaderboard-logout');
  const startLabel = document.querySelector('#leaderboard-start-label');
  const accountEndpoint = () => window.LPRVerificationConfig?.leaderboard;
  const accountKey = 'lpr-account';
  let sessionChosen = false;
  let token, activeName = '', account = null, claimName = null, signingIn = false;
  let pending = [], sending = null;
  let activeLap = null;
  const pendingKey = () => `lpr-pending-laps:${token}`;
  function savePending() {
    try { localStorage.setItem(pendingKey(), JSON.stringify(pending)); } catch {}
  }
  try {
    const saved = JSON.parse(localStorage.getItem(accountKey) ?? 'null');
    if (saved && validName(saved.nickname) && validToken(saved.token) && Number.isSafeInteger(saved.expiresAt) && saved.expiresAt > Date.now()) account = { nickname: saved.nickname, token: saved.token, expiresAt: saved.expiresAt };
    else localStorage.removeItem(accountKey);
    nickname.value = account?.nickname ?? localStorage.getItem('lpr-nickname') ?? '';
  } catch {}
  function showAccount() {
    // A remembered sign-in skips the password, but every page load still needs Aloita ajo.
    const remembered = !!account;
    nickname.readOnly = !!account || !!activeName;
    for (const element of passwordRow) if (element) element.hidden = !!account || !!activeName;
    if (logoutButton) logoutButton.hidden = !remembered;
    if (startLabel) startLabel.textContent = t(claimName ? 'Varaa nimimerkki' : 'Aja leaderboardiin');
  }
  function forget() {
    account = null; claimName = null;
    try { localStorage.removeItem(accountKey); } catch {}
  }
  async function signIn(name, secret, create) {
    if (!accountEndpoint()) throw Object.assign(new Error('Accounts unavailable'), { status: 503 });
    const response = await fetch(accountEndpoint() + '/api/verified/account', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname: name, password: secret, create }), signal: AbortSignal.timeout(15000)
    });
    if (!response.ok) throw Object.assign(new Error(`Account HTTP ${response.status}`), { status: response.status });
    const data = await response.json();
    if (!validName(data?.nickname) || nameKey(data.nickname) !== nameKey(name) || !validToken(data.token) || !Number.isSafeInteger(data.expiresAt) || data.expiresAt <= Date.now()) throw new Error('Invalid account response');
    return { nickname: data.nickname, token: data.token, expiresAt: data.expiresAt };
  }
  const signInError = (status, name) => status === 404 ? t('nameFree', { name })
    : status === 401 ? t('Väärä salasana tälle nimimerkille.')
    : status === 409 ? t('Nimimerkki on jo varattu. Kirjaudu sen salasanalla tai valitse toinen nimimerkki.')
    : status === 429 ? t('Liian monta kirjautumisyritystä. Odota hetki ja yritä uudelleen.')
    : status === 400 ? t('Tarkista nimimerkki ja salasana.')
    : t('Kirjautuminen ei onnistunut juuri nyt. Yritä uudelleen.');
  nickname.addEventListener('input', () => {
    nickname.setCustomValidity('');
    if (claimName) { claimName = null; status.textContent = ''; showAccount(); }
  });
  password.addEventListener('input', () => password.setCustomValidity(''));
  logoutButton?.addEventListener('click', async () => {
    if (!account || signingIn) return;
    signingIn = true; logoutButton.disabled = true; startButton.disabled = true;
    try {
      const response = await fetch(accountEndpoint() + '/api/verified/logout', {
        method: 'POST', headers: { Authorization: 'Bearer ' + account.token }, signal: AbortSignal.timeout(15000)
      });
      if (!response.ok) throw Error('Logout failed');
      window.LPRLeaderboard.signOut();
      nickname.value = ''; password.value = ''; status.textContent = '';
      showAccount(); nickname.focus?.();
    } catch {
      status.textContent = t('Uloskirjautuminen ei onnistunut. Tarkista yhteys ja yritä uudelleen.');
    } finally { signingIn = false; logoutButton.disabled = false; startButton.disabled = false; }
  });
  showAccount();
  startForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (signingIn) return;
    const name = activeName || nickname.value.trim().normalize('NFC');
    if (!validName(name)) {
      nickname.setCustomValidity(t('Kirjoita 1–24 merkin nimimerkki. Käytä kirjaimia, numeroita, välilyöntiä, pistettä, viivaa tai alaviivaa.'));
      nickname.reportValidity();
      return;
    }
    let identity = activeName ? { nickname: activeName, token }
      : account && nameKey(account.nickname) === nameKey(name) ? account : null;
    if (!identity) {
      if ([...password.value].length < 8) {
        password.setCustomValidity(t('Kirjoita vähintään 8 merkin salasana.'));
        password.reportValidity();
        return;
      }
      signingIn = true; startButton.disabled = true;
      status.textContent = t('Kirjaudutaan…');
      try {
        identity = await signIn(name, password.value, claimName === nameKey(name));
      } catch (error) {
        claimName = error.status === 404 ? nameKey(name) : null;
        status.textContent = signInError(error.status, name);
        showAccount();
        return;
      } finally { signingIn = false; startButton.disabled = false; }
      password.value = ''; claimName = null; status.textContent = '';
      account = identity;
      try { localStorage.setItem(accountKey, JSON.stringify(account)); localStorage.setItem('lpr-nickname', account.nickname); } catch {}
    }
    sessionChosen = true;
    token = identity.token;
    activeName = identity.nickname;
    window.LPRAnalytics?.identify(activeName);
    try {
      const saved = JSON.parse(localStorage.getItem(pendingKey()) ?? '[]');
      if (Array.isArray(saved)) pending = saved.filter(lap => lap?.version === version && lap.protocol === protocol &&
        typeof lap.nickname === 'string' && nameKey(lap.nickname) === nameKey(activeName) &&
        validToken(lap.lapId) && Number.isSafeInteger(lap.lapMs) && lap.lapMs > 5000 &&
        Array.isArray(lap.sectors) && lap.sectors.length === 3 && lap.sectors.every(n => Number.isSafeInteger(n) && n > 0) &&
        lap.sectors.reduce((a, b) => a + b, 0) === lap.lapMs);
    } catch {}
    nickname.value = activeName;
    showAccount();
    startButton.hidden = true;
    closeButton.hidden = false;
    dialog.classList.remove('session-start');
    dialog.close();
    flushPending();
    window.LPRVerifiedDriving?.identityReady?.();
  });
  document.querySelector('#leaderboard-practice')?.addEventListener('click', () => {
    if (signingIn) return;
    sessionChosen = true; activeName = ''; token = undefined; pending = []; activeLap = null;
    password.value = ''; claimName = null; status.textContent = '';
    window.LPRVerifiedDriving?.identityCleared?.();
    window.LPRAnalytics?.identify('');
    showAccount(); startButton.hidden = false; closeButton.hidden = false;
    dialog.classList.remove('session-start'); dialog.close();
    document.querySelector('#restart-button')?.click?.();
  });
  dialog.addEventListener('cancel', event => { if (!sessionChosen) event.preventDefault(); });
  consent.addEventListener('change',()=>window.LPRLeaderboard.consentChanged());
  async function api(path, options) {
    const response = await fetch(endpoint + path, { ...options, signal: AbortSignal.timeout(10000) });
    if (!response.ok) {
      const error = new Error(`Leaderboard HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return response.json();
  }
  async function refresh() {
    if (!list) return false; // The visible TOP 10 is now the server-verified list.
    list.textContent = t('Ladataan tuloslistaa…');
    list.setAttribute('aria-busy', 'true');
    try {
      const data = await api('/api/leaderboard');
      if (data.version !== version || !Array.isArray(data.results)) throw new Error('Invalid leaderboard');
      list.textContent = '';
      const results = data.results.slice(0, 10);
      for (const row of results) {
        const item = document.createElement('li');
        const name = document.createElement('span');
        name.className = 'standing-name';
        name.textContent = row.nickname;
        name.title = row.nickname;
        const time = document.createElement('span');
        time.className = 'standing-time';
        time.textContent = ` · ${format(row.lap_ms)}`;
        item.append(name, time);
        list.append(item);
      }
      if (!data.results.length) list.textContent = t('Ei vielä tuloksia.');
      return true;
    } catch {
      list.textContent = t('Tuloslista ei ole juuri nyt saatavilla.');
      return false;
    } finally { list.setAttribute('aria-busy', 'false'); }
  }
  async function flushPending() {
    if (!list) return; // Do not submit old, unverified laps from the retired leaderboard.
    if (sending) return sending;
    if (!token || !pending.length) return;
    sending = (async () => {
      try {
        do {
          while (pending.length) {
            const lap = pending[0];
            status.textContent = t('Lähetetään kierrosaikaa…');
            let result;
            try {
              result = await api('/api/laps', {
                method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(lap)
              });
            } catch (error) {
              if ([400,401,403,404,409,410,413,415,422,428].includes(error.status)) {
                pending.shift(); savePending();
                status.textContent = t('Kierrosta ei hyväksytty verkkotuloslistalle. Paikallinen aika säilyy.');
                continue;
              }
              throw error;
            }
            if (result.mode !== 'laps') {
              status.textContent = t('Verkkotuloslista ei vielä tue useita kierroksia samalta kuljettajalta.');
              return;
            }
            if (result.protection !== protocol || result.lapMs !== lap.lapMs) throw new Error('Invalid lap response');
            if (result.moderation === 'quarantined' || result.moderation === 'hidden') {
              pending.shift(); savePending();
              status.textContent = t('Kierros odottaa ylläpidon tarkistusta eikä näy vielä tuloslistalla.');
              continue;
            }
            if (result.moderation !== 'approved' || !Number.isSafeInteger(result.rank) || result.rank < 1) throw new Error('Invalid lap response');
            pending.shift();
            savePending();
            // The server decides whether this is a new record. A cached list may be stale.
            if (result.record === true && result.rank === 1) window.LPRRaceEffects?.celebrate(lap.lapMs);
            status.textContent = t('lapRank', { time: format(lap.lapMs), rank: result.rank });
            }
            await refresh();
          } while (pending.length);
        } catch {
          status.textContent = t('Kierrosaika odottaa lähetystä. Lähetystä yritetään uudelleen automaattisesti.');
        }
      })();
      try { await sending; } finally { sending = null; }
    }
    setInterval(()=>{
      if(!document.hidden&&dialog.open)void (async()=>{await flushPending();await refresh();})();
    },15000);
    window.addEventListener('online', flushPending);
    window.LPRLeaderboard = {
      get identity() { return activeName && token ? {nickname:activeName,token} : null; },
      consentChanged() { consent.setCustomValidity(''); },
      refresh,
      cancelLap() { activeLap = null; },
      // Called when the server no longer accepts the remembered account (deleted or revoked).
      signOut(message) {
        forget();
        sessionChosen = false; activeName = ''; token = undefined; pending = [];
        window.LPRVerifiedDriving?.identityCleared?.();
        showAccount();
        window.LPRLeaderboard.beginSession();
        if (message) status.textContent = t(message);
      },
      startLap() {
        // The retired leaderboard must never receive the account credential.
        if (!list || !token || !activeName) return Promise.resolve(null);
        const lap = { requestId: newToken(), nickname: activeName };
        activeLap = lap;
        lap.ticket = api('/api/laps/start', {
          method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ version, nickname: lap.nickname, requestId: lap.requestId })
        }).then(data => {
          if (data.mode !== protocol || !validToken(data.lapId)) throw new Error('Invalid lap start');
          return data.lapId;
        }).catch(() => null);
        return lap.ticket;
      },
      get requiresName() { return !sessionChosen; },
      beginSession() {
        if (sessionChosen) return;
        // The last name is a suggestion, never an automatic login: each page
        // load requires an explicit confirmation before any driving can start.
        dialog.classList.add('session-start');
        closeButton.hidden = true;
        startButton.hidden = false;
        if (!dialog.open) dialog.showModal();
        refresh();
      },
      async submit(lapMs, sectors) {
        if (!list) return;
        const started = activeLap;
        activeLap = null;
        const name = activeName;
        if (!token || !validName(name)) {
          status.textContent = t('Valitse nimimerkki tuloslistasta ennen seuraavaa kierrosta.');
          return;
        }
        if (!Number.isFinite(lapMs) || lapMs <= 5000 || !Array.isArray(sectors) || sectors.length !== 3 ||
            !sectors.every(n => Number.isFinite(n) && n > 0)) return;
        const rounded = sectors.map(Math.round);
        const elapsed = Math.round(lapMs);
        rounded[2] += elapsed - rounded.reduce((a, b) => a + b, 0);
        if (!rounded.every(n => Number.isSafeInteger(n) && n > 0) || !Number.isSafeInteger(elapsed) || elapsed <= 5000) return;
        const lapId = started && await started.ticket;
        if (!lapId || started.nickname !== name) {
          status.textContent = t('Kierros tallentui vain paikallisesti: verkkokierroksen aloitusta ei vahvistettu.');
          return;
        }
        pending.push({ version, protocol, nickname: name, lapId, lapMs: elapsed, sectors: rounded });
        savePending();
        await flushPending();
      }
    };
    window.LPRLeaderboard.beginSession();
  })();
