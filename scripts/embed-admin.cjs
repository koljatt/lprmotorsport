// Keep the Worker pasteable as one module while editing the dashboard as normal HTML.
const fs = require('node:fs');
const path = require('node:path');
const { translateAdmin } = require('./translate-admin.cjs');
const root = path.resolve(__dirname, '..');
const worker = path.join(root, 'cloudflare/worker.mjs');
const html = fs.readFileSync(path.join(root, 'cloudflare/admin.html'), 'utf8').replace(/\r\n/g, '\n');
const source = fs.readFileSync(worker, 'utf8');
if (!/^const ADMIN_HTML = .*;$/m.test(source)) throw Error('Missing embedded dashboard');
let updated = source.replace(/^const ADMIN_HTML = .*;$/m, () => 'const ADMIN_HTML = ' + JSON.stringify(html) + ';');
const english = 'const ADMIN_HTML_EN = ' + JSON.stringify(translateAdmin(html)) + ';';
updated = /^const ADMIN_HTML_EN = .*;$/m.test(updated)
  ? updated.replace(/^const ADMIN_HTML_EN = .*;$/m, () => english)
  : updated + '\n' + english + '\n';
fs.writeFileSync(worker, updated);
