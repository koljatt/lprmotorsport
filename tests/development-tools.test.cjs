const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {build,root}=require('../scripts/build.cjs');
const {createServer}=require('../server.js');
const editor=fs.readFileSync(path.join(root,'tools/track-editor/editor.js'),'utf8');
assert.match(editor,/fetch\('\/api\/dev\/track-objects'/);
assert.match(editor,/JSON\.stringify\(\{version:1,objects:JSON\.parse\(snapshot\)\}\)/);
assert.match(editor,/rotate-left/);
assert.match(editor,/rotate-right/);
assert.match(editor,/drawRotationHandle/);
assert.match(editor,/mode:'rotate'/);
assert.match(editor,/o\.angle=drag\.originAngle/);
assert.doesNotMatch(editor,/trackCones/);
async function check(production){
  const server=createServer({production});
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(base+'/')).status,200);
    assert.equal((await fetch(base+'/tools/track-editor/editor.html')).status,production?404:200);
    assert.equal((await fetch(base+'/tools/track-editor/editor.js')).status,production?404:200);
    assert.equal((await fetch(base+'/tools/track-editor/editor.css')).status,production?404:200);
    assert.equal((await fetch(base+'/editor.html')).status,404);
    assert.equal((await fetch(base+'/server.js')).status,404);
    assert.equal((await fetch(base+'/data/track-data.js')).status,200);
    const html=await(await fetch(base+'/')).text();
    assert.ok(!html.includes('editor'));
    for(const match of html.matchAll(/(?:src|href)="([^"?#]+)(?:[^" ]*)"/g)) {
      if(match[1].startsWith('assets/')||match[1].endsWith('.js')||match[1].endsWith('.css'))assert.equal((await fetch(base+'/'+match[1])).status,200,match[1]);
    }
    const api=base+'/api/dev/track-objects';
    assert.equal((await fetch(api,{method:'PUT',headers:{'Content-Type':'application/json',Origin:'https://example.com'},body:'{}'})).status,production?404:403);
    if(!production){const port=new URL(base).port;assert.equal((await fetch(api,{method:'PUT',headers:{'Content-Type':'application/json',Host:`attacker.example:${port}`,Origin:`http://attacker.example:${port}`},body:'{}'})).status,403);}
    if(!production){
      assert.equal((await fetch(api,{method:'PUT',headers:{'Content-Type':'application/json',Origin:base},body:'{"version":2,"objects":[]}'})).status,400);
      const file=path.join(root,'data/track-objects.json'),original=fs.readFileSync(file);
      try{
        const doc={version:1,objects:[{type:'cone',x:100,y:100,angle:0,scale:1}]};
        assert.equal((await fetch(api,{method:'PUT',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify(doc)})).status,200);
        assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),doc);
        assert.ok((await(await fetch(base+'/data/track-data.js')).text()).includes('"cone"'));
      }finally{fs.writeFileSync(file,original);}
    }
  }finally{await new Promise(resolve=>server.close(resolve));}
}
(async()=>{
  const output=build();
  assert.ok(!fs.existsSync(path.join(output,'tools')));
  assert.ok(!fs.existsSync(path.join(output,'server.js')));
  assert.ok(!fs.existsSync(path.join(output,'tests')));
  await check(false);await check(true);
  console.log('PASS: game build, separate editor, local write protection and project data save');
})().catch(e=>{console.error(e);process.exitCode=1;});
