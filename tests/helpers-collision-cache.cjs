// Compile production code and the previous uncached implementation in isolated
// worlds. Only the collision-shape implementation differs between the variants.
const fs=require('node:fs'),path=require('node:path');
const {files,revision}=require('../verification/world.cjs');
const reference=require('./collision-shape-reference.cjs');
const root=path.resolve(__dirname,'..');
function createWorld({baseline=false}={}){
 const sources=files.map(file=>{
  let source=fs.readFileSync(path.join(root,file),'utf8');
  if(baseline&&file==='campus.js'){
   const start=source.indexOf('  // Collision parts are read-only local coordinates.'),end=source.indexOf('  function convexHull(points)',start);
   if(start<0||end<start)throw Error('Collision cache comparison markers missing');
   source=source.slice(0,start)+reference.toString()+'\n'+source.slice(end);
  }
  return source;
 });
 const window={LPRTrackData:JSON.parse(fs.readFileSync(path.join(root,'data/track-objects.json'),'utf8'))};
 new Function('window','module',sources.join('\n'))(window,undefined);
 return {world:window.LPRDriving.create(),api:window.LPRDriving,math:window.LPRMath,campus:window.LPRCampus,revision};
}
module.exports={createWorld};
