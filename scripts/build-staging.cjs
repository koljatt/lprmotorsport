const fs=require('node:fs'),path=require('node:path');
const {build}=require('./build.cjs');
const production=new Set(['lpr-verification.onrender.com','lpr-verified.panu-musakka.workers.dev','lpr-leaderboard.panu-musakka.workers.dev']);
function testURL(value){
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash||url.pathname!=='/'||production.has(url.hostname)||!/(?:test|staging)/.test(url.hostname))throw Error('An isolated HTTPS test endpoint is required');
 return url.origin;
}
function buildStaging(env=process.env,destination){
 const service=testURL(env.LPR_TEST_SERVICE_URL),leaderboard=testURL(env.LPR_TEST_LEADERBOARD_URL),analytics=testURL(env.LPR_TEST_ANALYTICS_URL);
 const target=build(destination);
 fs.writeFileSync(path.join(target,'verification/config.js'),`window.LPRVerificationConfig=${JSON.stringify({service,leaderboard})};\n`);
 for(const file of ['analytics.js','leaderboard.js']){
  const original=fs.readFileSync(path.join(target,file),'utf8');
  const changed=original.replaceAll('https://lpr-leaderboard.panu-musakka.workers.dev',analytics);
  if(changed===original)throw Error('Test endpoint replacement failed: '+file);
  fs.writeFileSync(path.join(target,file),changed);
 }
 const html=fs.readFileSync(path.join(target,'index.html'),'utf8').replace('<body>','<body>\n<div role="note" style="padding:8px;text-align:center;background:#ffe08a;color:#17231b;font:700 14px system-ui">TESTIVERSIO · Tulokset tallentuvat erilliselle testilistalle.</div>');
 fs.writeFileSync(path.join(target,'index.html'),html);
 const revision=require('../verification/world.cjs').revision;
 fs.writeFileSync(path.join(target,'staging.json'),JSON.stringify({environment:'staging',service,leaderboard,analytics,revision,commit:env.RENDER_GIT_COMMIT||null},null,2));
 return target;
}
module.exports={buildStaging,testURL};
if(require.main===module)console.log('Testipelin julkaisupaketti: '+buildStaging());
