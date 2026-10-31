const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const server = require('../server.js').createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1086, height: 698 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await page.route('https://*.workers.dev/**', route => route.fulfill({ json: { results: [] } }));
    await page.goto(`http://127.0.0.1:${server.address().port}`);
    await page.waitForFunction(() => window.LPRLeaderboard);
    for (const viewport of [{ width: 1086, height: 698 }, { width: 390, height: 844 }, { width: 740, height: 390 }]) {
      await page.setViewportSize(viewport);
      for (const id of ['leaderboard-practice', 'leaderboard-login', 'leaderboard-create']) assert(await page.locator('#' + id).isVisible());
      assert.equal(await page.locator('#leaderboard-name').isVisible(), false);
      assert.equal(await page.locator('#leaderboard-start').isVisible(), false);
      assert(await page.evaluate(() => { const dialog = document.querySelector('#settings-dialog'); return dialog.scrollWidth <= dialog.clientWidth; }));
      await page.screenshot({ path: path.join(__dirname, `start-menu-${viewport.width}.png`) });
      await page.click('#leaderboard-login');
      assert.equal(await page.locator('#leaderboard-start-label').textContent(), 'Kirjaudu sisään');
      assert.equal(await page.locator('#leaderboard-password').getAttribute('autocomplete'), 'current-password');
      await page.click('#leaderboard-back');
      await page.click('#leaderboard-create');
      assert.equal(await page.locator('#leaderboard-start-label').textContent(), 'Jatka');
      assert.equal(await page.locator('#leaderboard-password').getAttribute('autocomplete'), 'new-password');
      await page.click('#leaderboard-back');
    }
    await page.evaluate(() => window.LPRI18n.setLanguage('en'));
    assert.equal(await page.locator('#leaderboard-practice').textContent(), 'Practice without signing in');
    await page.click('#leaderboard-create');
    assert.equal(await page.locator('#leaderboard-start-label').textContent(), 'Continue');
    await page.click('#leaderboard-back');
    await page.click('#leaderboard-practice');
    assert(await page.evaluate(() => !window.LPRLeaderboard.requiresName && !window.LPRLeaderboard.identity));
    assert.deepEqual(errors, []);
    console.log('PASS: three menu choices, separate login and registration, back, password autofill, English, guest practice and responsive layouts');
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
