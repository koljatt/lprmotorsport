const fs = require('node:fs');
const {chromium} = require('playwright');

// Use a supplied browser in containers, installed Playwright Chromium otherwise,
// and preserve the system Chrome fallback used by developer machines.
function launchBrowser(options = {}) {
  const executablePath = process.env.LPR_BROWSER_EXECUTABLE_PATH;
  const browser = executablePath ? {executablePath}
    : fs.existsSync(chromium.executablePath()) ? {} : {channel: 'chrome'};
  return chromium.launch({...options, ...browser});
}

module.exports = {launchBrowser};
