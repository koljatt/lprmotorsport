// Keep the Worker pasteable as one module while editing the dashboard as normal HTML.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const worker = path.join(root, 'cloudflare/worker.mjs');
const html = fs.readFileSync(path.join(root, 'cloudflare/admin.html'), 'utf8');
const source = fs.readFileSync(worker, 'utf8');
if (!/^const ADMIN_HTML = .*;$/m.test(source)) throw Error('Missing embedded dashboard');
fs.writeFileSync(worker, source.replace(/^const ADMIN_HTML = .*;$/m, () => 'const ADMIN_HTML = ' + JSON.stringify(html) + ';'));
