const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {buildStaging,testURL}=require('../scripts/build-staging.cjs');
for(const bad of ['https://lpr-verification.onrender.com','https://lpr-verified.panu-musakka.workers.dev','https://lpr-leaderboard.panu-musakka.workers.dev','http://test.example','https://test.example/path','https://user:pass@test.example','https://test.example/?key=x'])assert.throws(()=>testURL(bad));
const destination=path.resolve(__dirname,'../artifacts/integration/staging-build');
try{
 const target=buildStaging({LPR_TEST_SERVICE_URL:'https://verification-test.example',LPR_TEST_LEADERBOARD_URL:'https://verified-test.example',LPR_TEST_ANALYTICS_URL:'https://analytics-test.example',RENDER_GIT_COMMIT:'test-commit'},destination);
 const config=fs.readFileSync(path.join(target,'verification/config.js'),'utf8');
 assert(config.includes('https://verification-test.example'));assert(!config.includes('lpr-verification.onrender.com'));
 for(const file of ['analytics.js','leaderboard.js']){
  const source=fs.readFileSync(path.join(target,file),'utf8');assert(source.includes('https://analytics-test.example'));assert(!source.includes('lpr-leaderboard.panu-musakka.workers.dev'));
 }
 assert(fs.readFileSync(path.join(target,'index.html'),'utf8').includes('TESTIVERSIO'));
 const manifest=JSON.parse(fs.readFileSync(path.join(target,'staging.json')));assert.equal(manifest.environment,'staging');assert.equal(manifest.commit,'test-commit');
 assert.equal(manifest.revision,require('../verification/world.cjs').revision);
 assert(fs.readFileSync(path.resolve(__dirname,'../verification/config.js'),'utf8').includes('https://lpr-verification.onrender.com'),'Production source stays unchanged');
 console.log('PASS: staging endpoint isolation, production URL rejection, test banner and revision manifest');
}finally{fs.rmSync(destination,{recursive:true,force:true});}
