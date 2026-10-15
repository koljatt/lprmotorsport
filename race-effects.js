/* Brief, non-blocking celebration for a confirmed leaderboard record. */
(() => {
  'use strict';
  let overlay, timeout;
  const bottle = `<svg viewBox="0 0 80 180" aria-hidden="true"><path d="M32 25h16v46c0 13 14 18 14 36v57q0 10-10 10H28q-10 0-10-10v-57c0-18 14-23 14-36Z" fill="#124e38" stroke="#84d9a5" stroke-width="2"/><path d="M31 25h18v42H31Z" fill="#e9c56c"/><path d="M20 110h40v37H20Z" fill="#f0ddb0"/><path d="m28 119 12 6 12-6v18H28Z" fill="#162d26"/><path class="champagne-cork" d="M31 14h18v11H31Z" fill="#bc9561"/></svg>`;
  function clear() {
    clearTimeout(timeout);
    overlay?.remove();
    overlay = null;
  }
  window.LPRRaceEffects = {
    clear,
    celebrate(ms) {
      clear();
      overlay = document.createElement('div');
      overlay.className = 'record-celebration';
      const banner = document.createElement('div');
      banner.className = 'record-banner';
      banner.setAttribute('role', 'status');
      const heading = document.createElement('strong');
      heading.textContent = window.LPRI18n?.t('UUSI RATAENNÄTYS') ?? 'UUSI RATAENNÄTYS';
      const time = document.createElement('span');
      time.textContent = `${Math.floor(ms / 60000)}:${((ms % 60000) / 1000).toFixed(3).padStart(6, '0')}`;
      banner.append(heading, time);
      overlay.append(banner);
      for (const side of ['left', 'right']) {
        const spray = document.createElement('div');
        spray.className = `champagne champagne-${side}`;
        spray.setAttribute('aria-hidden', 'true');
        spray.innerHTML = bottle;
        for (let i = 0; i < 24; i++) {
          const drop = document.createElement('i');
          drop.style.setProperty('--x', `${45 + (i * 47 % 190)}px`);
          drop.style.setProperty('--y', `${-90 - (i * 31 % 210)}px`);
          drop.style.setProperty('--delay', `${(i % 8) * .065}s`);
          spray.append(drop);
        }
        overlay.append(spray);
      }
      document.querySelector('.game-shell').append(overlay);
      timeout = setTimeout(clear, 3500);
    }
  };
})();
