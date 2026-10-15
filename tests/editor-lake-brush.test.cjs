const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const documentApi=require('../shared/track-document.js');
const {maxObjects,types,validate,onAsphaltObject,asphaltOutline}=documentApi;

// Exercise the real editor event handlers with a small DOM/canvas adapter.
function editor(objects=[],withSale=false,protocol='http:',withSites=false,withRoad=false,recordDraws=false){
  const nodes=new Map(),windowEvents=new Map();
  const html=fs.readFileSync('tools/track-editor/editor.html','utf8');
  for(const [,id] of html.matchAll(/id="([^"]+)"/g)){
    const listeners=new Map();
    nodes.set(id,{value:'',style:{},checked:false,children:[],
      addEventListener(name,fn){listeners.set(name,fn);},
      emit(name,event={}){listeners.get(name)?.(event);},
      add(option){this.children.push(option);if(!this.value)this.value=option.value;},
      replaceChildren(...children){this.children=children;},
      setAttribute(){},checkValidity(){return true;}
    });
  }
  const canvas=nodes.get('map'),captures=new Set(),drawn=[];
  Object.assign(canvas,{clientWidth:5200,clientHeight:4400,
    getContext:()=>new Proxy({},{get:(_,name)=>(...args)=>{if(withSale||recordDraws)drawn.push([name,...args]);}}),
    getBoundingClientRect:()=>({left:0,top:0}),
    setPointerCapture:id=>captures.add(id),
    hasPointerCapture:id=>captures.has(id),
    releasePointerCapture:id=>captures.delete(id)
  });
  nodes.get('lake-width').value='20';
  nodes.get('asphalt-width').value='12';
  nodes.get('asphalt-roundness').value='20';
  nodes.get('hill-width').value='40';nodes.get('hill-height').value='3';
  let saved,saveMode='ok',writes=0;
  const window={location:{protocol},LPRTrackDocument:documentApi,LPRTrackData:{version:1,objects},
    addEventListener:(name,fn)=>windowEvents.set(name,fn)};
  const context={window,document:{getElementById:id=>nodes.get(id)},
    LPRCampus:{buildingBounds:[],world:(x,y)=>({x,y}),track:[{x:100,y:100}],trees:[]},
    Option:class{constructor(text,value){this.text=text;this.value=String(value);}},
    ResizeObserver:class{observe(){}},
    fetch:async(url,options)=>{
      if(options.method==='PUT'){
        writes++;
        if(saveMode==='reject')return{ok:false,text:async()=> 'Virheellinen rata'};
        saved=JSON.parse(options.body);return{ok:true};
      }
      assert.equal(url,'/data/track-objects.json');assert.equal(options.cache,'no-store');
      return{ok:saveMode!=='read-failure',json:async()=>saveMode==='mismatch'?{version:1,objects:[]}:saved};
    }
  };
  vm.createContext(context);
  if(withSites){context.LPRCampus.saunaSite={x:2000,y:1000};context.LPRCampus.bonfireSite={x:1800,y:700};}
  if(withRoad){context.LPRCampus.track=[{x:1000,y:1000},{x:1400,y:1000},{x:1400,y:1400},{x:1000,y:1400}];context.LPRCampus.road={kerbOuter:39};}
  if(withSale){
    window.LPRCampus=context.LPRCampus;
    vm.runInContext(fs.readFileSync('sale.js','utf8'),context);
  }
  vm.runInContext(fs.readFileSync('tools/track-editor/editor.js','utf8'),context);
  const pointer=(name,x,y,extra={})=>canvas.emit(name,{
    pointerId:1,button:0,clientX:130+x*.95,clientY:110+y*.95,preventDefault(){},...extra
  });
  return {nodes,pointer,drawn,
    set saveMode(mode){saveMode=mode;},get writes(){return writes;},
    barrier(){nodes.get('type').value='barrier';nodes.get('type').emit('change');},
    tyreWall(){nodes.get('type').value='tyreWall';nodes.get('type').emit('change');},
    lake(){nodes.get('type').value='lake';nodes.get('type').emit('change');},
    asphalt(){nodes.get('type').value='asphalt';nodes.get('type').emit('change');},
    hill(){nodes.get('type').value='hill';nodes.get('type').emit('change');},
    escape(){windowEvents.get('keydown')({key:'Escape'});},
    key(key,target){let prevented=false;windowEvents.get('keydown')({key,target,preventDefault(){prevented=true;}});return prevented;},
    async document(){await nodes.get('save').onclick();return saved;}
  };
}

(async()=>{
  // Compare the editor's actual canvas shapes with the game's generated mesh.
  // A thin centre-line symbol used to hide the guardrail's two wide beams.
  for(const [angle,scale,length] of [[0,1,40],[Math.PI/2,2,23],[Math.PI/4,.2,1],[-.7,5,50]]){
    const rail={type:'barrier',x:2500,y:2200,angle,scale,length};
    const tyres={...rail,type:'tyreWall',x:rail.x-Math.sin(angle)*8*scale,y:rail.y+Math.cos(angle)*8*scale};
    const plan=editor([rail,tyres],false,'http:',false,false,true);
    const game={window:{LPRVehicleSpec:require('../shared/vehicle-spec.js'),LPRTrackData:{version:1,objects:[rail,tyres]}}};
    vm.createContext(game);
    for(const file of ['campus.js','shared/track-document.js','shared/track-objects.js'])vm.runInContext(fs.readFileSync(file,'utf8'),game);
    const meshes=[];
    game.window.LPRTrackObjects.build({beginObject:()=>meshes.push([]),quad:(...q)=>meshes.at(-1).push(...q.slice(0,4))});
    const gameBounds=[];
    for(const [index,o] of [rail,tyres].entries()){
      const start=plan.drawn.findLastIndex(call=>call[0]==='translate'&&call[1]===o.x&&call[2]===o.y);
      assert(start>=0);
      const end=plan.drawn.findIndex((call,i)=>i>start&&call[0]==='restore');
      const points=[];
      for(const [method,x,y,w,d] of plan.drawn.slice(start+1,end)){
        if(method==='fillRect')points.push([x,y],[x+w,y+d]);
        if(method==='ellipse')points.push([x-w,y-d],[x+w,y+d]);
      }
      const bounds=ps=>[Math.min(...ps.map(p=>p[0])),Math.max(...ps.map(p=>p[0])),Math.min(...ps.map(p=>p[1])),Math.max(...ps.map(p=>p[1]))];
      const drawnBounds=bounds(points);
      const meshBounds=bounds(meshes[index].map(p=>{
        const dx=p[0]-o.x,dy=p[2]-o.y;
        return [dx*Math.cos(angle)+dy*Math.sin(angle),-dx*Math.sin(angle)+dy*Math.cos(angle)];
      }));
      drawnBounds.forEach((value,i)=>assert(Math.abs(value-meshBounds[i])<1e-8,`${o.type}: editor and game must show the same footprint (angle ${angle}, scale ${scale}, length ${length})`));
      gameBounds.push(meshBounds);
    }
    assert(gameBounds[0][3]<8*scale+gameBounds[1][2],'Walls placed side by side in the editor must stay separate in the game');
  }
  console.log('PASS: editor and game wall footprints agree for adjacent, rotated, scaled and short segments');
  const protectedRoad=editor([],false,'http:',false,true);protectedRoad.asphalt();
  protectedRoad.nodes.get('asphalt-width').value='4';
  protectedRoad.pointer('pointerdown',1200,1000);protectedRoad.pointer('pointerup',1200,1000);
  assert.deepEqual((await protectedRoad.document()).objects,[],'Protected painting entirely inside the track must add nothing');
  protectedRoad.nodes.get('asphalt-over-road').checked=true;
  protectedRoad.pointer('pointerdown',1200,1000);protectedRoad.pointer('pointerup',1200,1000);
  const overTrack=await protectedRoad.document();assert.equal(overTrack.objects.length,1);
  assert.equal(overTrack.objects[0].allowOnTrack,true);
  protectedRoad.nodes.get('list').value='0';protectedRoad.nodes.get('list').emit('change');
  protectedRoad.nodes.get('allow-on-track').checked=false;protectedRoad.nodes.get('allow-on-track').onchange();
  assert.equal((await protectedRoad.document()).objects[0].allowOnTrack,false,'The rule can also be changed for a selected asphalt area');
  console.log('PASS: protected track painting, explicit overlap permission and selected-area editing');
  const saveCheck=editor([{type:'barrier',x:1000,y:1000,angle:0,scale:1,length:25}]);
  const pendingSave=saveCheck.nodes.get('save').onclick();
  assert.equal(saveCheck.nodes.get('save').disabled,true);
  await saveCheck.nodes.get('save').onclick();await pendingSave;
  assert.equal(saveCheck.writes,1,'Repeated clicks must not start overlapping saves');
  assert.match(saveCheck.nodes.get('save-status').textContent,/tallennettu ja tarkistettu/);
  for(const mode of ['reject','read-failure','mismatch']){
    saveCheck.saveMode=mode;await saveCheck.document();
    assert.match(saveCheck.nodes.get('save-status').textContent,/Tallennus epäonnistui/,
      'Only an exact read-back of the saved track may report success');
    assert.equal(saveCheck.nodes.get('save').disabled,false,'A failed save must remain retryable');
  }
  saveCheck.saveMode='ok';await saveCheck.document();
  assert.match(saveCheck.nodes.get('save-status').textContent,/tallennettu ja tarkistettu/);
  console.log('PASS: confirmed saves, duplicate clicks, server failures, failed verification, mismatch and retry');
  const hills=editor();hills.hill();
  assert.equal(hills.nodes.get('hill-brush').hidden,false);
  hills.nodes.get('hill-width').value='20';hills.nodes.get('hill-height').value='6';
  hills.pointer('pointerdown',3000,2000);hills.pointer('pointermove',3100,2000);
  hills.nodes.get('hill-height').value='10';
  hills.pointer('pointerup',3150,2075);
  const hillDoc=await hills.document();
  assert(hillDoc.objects.length>2);
  assert(hillDoc.objects.every(o=>o.type==='hill'&&o.scale===.5&&o.height===6),'A hill stroke must retain its chosen width and height');
  assert.deepEqual(validate(hillDoc),hillDoc.objects);
  hills.nodes.get('undo').onclick();assert.deepEqual((await hills.document()).objects,[]);
  hills.nodes.get('redo').onclick();assert.deepEqual(await hills.document(),hillDoc);
  hills.nodes.get('list').value='0';hills.nodes.get('list').emit('change');
  hills.nodes.get('height').value='4';hills.nodes.get('height').onchange();
  assert.equal((await hills.document()).objects[0].height,4,'A selected hill can be resized vertically');
  hills.nodes.get('undo').onclick();assert.deepEqual(await hills.document(),hillDoc);
  hills.pointer('pointerdown',3400,2000);hills.pointer('pointermove',3500,2000);hills.escape();
  assert.deepEqual(await hills.document(),hillDoc);
  console.log('PASS: hill brush, latched height and width, save/load, height editing, undo/redo and cancellation');
  const scenes=editor([],false,'http:',true);
  const initialScene=await scenes.document();
  assert.equal(initialScene.objects.length,25,'Existing scene elements must appear without manual placement');
  assert.equal(initialScene.objects.filter(o=>o.type==='person').length,22);
  const sauna=initialScene.objects.find(o=>o.type==='sauna');
  scenes.pointer('pointerdown',sauna.x,sauna.y);
  scenes.pointer('pointermove',sauna.x+100,sauna.y+50);
  scenes.pointer('pointerup',sauna.x+100,sauna.y+50);
  const movedScene=await scenes.document();
  assert.equal(movedScene.objects.find(o=>o.type==='sauna').x,2100);
  assert.equal(movedScene.objects.find(o=>o.type==='sauna').y,1050);
  assert.deepEqual(movedScene.objects.filter(o=>o.type!=='sauna'),initialScene.objects.filter(o=>o.type!=='sauna'));
  assert.deepEqual(validate(movedScene),movedScene.objects);
  scenes.nodes.get('undo').onclick();assert.deepEqual(await scenes.document(),initialScene);
  scenes.nodes.get('redo').onclick();assert.deepEqual(await scenes.document(),movedScene);
  for(const type of ['bonfire','pool','person']){
    const index=movedScene.objects.findIndex(o=>o.type===type);
    scenes.nodes.get('list').value=String(index);scenes.nodes.get('list').emit('change');
    scenes.nodes.get('x').value=String((movedScene.objects[index].x+75)/10);
    scenes.nodes.get('x').onchange();
    const updated=await scenes.document();
    assert.equal(updated.objects[index].x,movedScene.objects[index].x+75);
    assert.equal(updated.objects[index].y,movedScene.objects[index].y);
    assert.equal(updated.objects[index].personId,movedScene.objects[index].personId);
    assert.deepEqual(validate(updated),updated.objects);
  }
  console.log('PASS: scene elements appear, move independently, save and support undo/redo');
  const existingTyres={type:'tyreWall',x:1000,y:1000,angle:0,scale:1};
  const tyres=editor([existingTyres]);tyres.tyreWall();
  assert.match(tyres.nodes.get('barrier-brush').textContent,/rengasvallia/);
  tyres.pointer('pointerdown',1027,1000);
  tyres.pointer('pointermove',1150,1000);
  tyres.pointer('pointerup',1150,1117);
  const tyreDoc=await tyres.document();
  assert.deepEqual(validate(tyreDoc),tyreDoc.objects,'Saved tyre-wall lengths must survive validation');
  const tyreSegments=tyreDoc.objects.slice(1);
  const end=(o,side)=>({x:o.x+side*documentApi.wallFootprint(o).w/2*Math.cos(o.angle),
    y:o.y+side*documentApi.wallFootprint(o).w/2*Math.sin(o.angle)});
  const joins=(a,b)=>assert(Math.hypot(a.x-b.x,a.y-b.y)<1e-8,'Tyre-wall endpoints must join exactly');
  joins(end(tyreSegments[0],-1),end(existingTyres,1));
  joins(end(tyreSegments.at(-1),1),{x:1150,y:1117});
  tyreSegments.forEach((o,i)=>{
    assert.equal(o.type,'tyreWall');assert.equal(o.scale,1);assert(o.length>=1&&o.length<=50);
    if(i)joins(end(tyreSegments[i-1],1),end(o,-1));
  });
  tyres.nodes.get('undo').onclick();assert.deepEqual((await tyres.document()).objects,[existingTyres]);
  tyres.nodes.get('redo').onclick();assert.deepEqual(await tyres.document(),tyreDoc);
  tyres.pointer('pointerdown',1152,1118);tyres.pointer('pointerup',1230,1130);
  const continued=await tyres.document();
  joins(end(continued.objects[tyreDoc.objects.length],-1),end(tyreSegments.at(-1),1));
  tyres.pointer('pointerdown',1500,1500);tyres.pointer('pointermove',1600,1500);tyres.escape();
  assert.deepEqual(await tyres.document(),continued,'Escape must discard the entire unfinished tyre-wall stroke');
  console.log('PASS: tyre-wall drawing, corners, endpoint snapping, lengths, continuation, undo/redo and cancellation');
  const removable={type:'barrier',x:1000,y:1000,angle:0,scale:1};
  const deletion=editor([removable]);
  deletion.nodes.get('list').value='0';deletion.nodes.get('list').emit('change');
  assert.equal(deletion.key('Delete',{tagName:'INPUT'}),false);
  assert.deepEqual((await deletion.document()).objects,[removable],'Delete inside an input must preserve the selected object');
  assert.equal(deletion.key('Delete',deletion.nodes.get('list')),true);
  assert.deepEqual((await deletion.document()).objects,[],'Delete must remove the selected object');
  deletion.nodes.get('undo').onclick();
  assert.deepEqual((await deletion.document()).objects,[removable],'Keyboard deletion must support undo');
  deletion.nodes.get('redo').onclick();
  assert.deepEqual((await deletion.document()).objects,[],'Keyboard deletion must support redo');
  assert.equal(deletion.key('Delete'),false,'Delete without a selection must do nothing');
  const fileEditor=editor([],false,'file:');
  assert.match(fileEditor.nodes.get('status').textContent,/Vie jo tekemäsi muutokset/);
  assert.equal(await fileEditor.document(),undefined,'A file URL cannot save through the development API');
  assert.match(fileEditor.nodes.get('status').textContent,/Tallennus ei onnistu/);
  const saleEditor=editor([],true);
  saleEditor.nodes.get('focus-sale').onclick();
  for(const label of ['Yolo','Sale','Pääovi'])assert(saleEditor.drawn.some(([method,text])=>method==='fillText'&&text===label),
    'The editor must label the shared building and its entrance: '+label);
  assert(saleEditor.drawn.some(([method,x,y])=>method==='moveTo'&&x===697&&y===393),
    'The left ramp footprint must come from the game exterior geometry');
  assert(saleEditor.drawn.some(([method,x,y])=>method==='lineTo'&&x===402&&y===393),
    'The right ramp footprint must come from the game exterior geometry');
  assert.deepEqual((await saleEditor.document()).objects,[],
    'Rendering the base building must not add generated geometry to the saved track objects');
  assert.match(saleEditor.nodes.get('status').textContent,/tallennettu/i);
  console.log('PASS: shared game exterior in editor, both ramps, tenant labels and clean saved data');
  const existingBarrier={type:'barrier',x:1000,y:1000,angle:0,scale:1};
  const rail=editor([existingBarrier]);rail.barrier();
  assert.equal(rail.nodes.get('barrier-brush').hidden,false);
  const endpoint=(o,side)=>({x:o.x+side*documentApi.barrierFootprint(o).w*o.scale/2*Math.cos(o.angle),
    y:o.y+side*documentApi.barrierFootprint(o).w*o.scale/2*Math.sin(o.angle)});
  const samePoint=(a,b,message)=>assert(Math.hypot(a.x-b.x,a.y-b.y)<1e-8,message);
  rail.pointer('pointerdown',1023,1000);
  rail.pointer('pointermove',1140,1000);
  rail.pointer('pointermove',1140,1118);
  rail.pointer('pointerup',1140,1133);
  const firstRail=await rail.document();validate(firstRail);
  assert.deepEqual(firstRail.objects[0],existingBarrier,'Starting a stroke must not move the existing barrier');
  const segments=firstRail.objects.slice(1);
  assert(segments.length>=7,'Fast movement and corners must create connected segments');
  samePoint(endpoint(segments[0],-1),endpoint(existingBarrier,1),'Snap the stroke start to an existing endpoint');
  samePoint(endpoint(segments.at(-1),1),{x:1140,y:1133},'Include the exact pointerup endpoint');
  for(let i=0;i<segments.length;i++){
    assert.equal(segments[i].scale,1,'Segment length must not stretch height or thickness');
    assert(segments[i].length>=1&&segments[i].length<=40.001);
    if(i)samePoint(endpoint(segments[i-1],1),endpoint(segments[i],-1),'No gaps at straight sections or turns');
  }
  rail.nodes.get('undo').onclick();assert.deepEqual((await rail.document()).objects,[existingBarrier]);
  rail.nodes.get('redo').onclick();assert.deepEqual(await rail.document(),firstRail);
  rail.pointer('pointerdown',1142,1135);rail.pointer('pointerup',1200,1200);
  const continuedRail=await rail.document();
  samePoint(endpoint(continuedRail.objects[firstRail.objects.length],-1),endpoint(segments.at(-1),1),
    'A second stroke must join the preceding stroke');
  for(const event of ['pointercancel','lostpointercapture']){
    rail.pointer('pointerdown',1200,1200);rail.pointer('pointermove',1400,1250);rail.pointer(event,1400,1250);
    assert.deepEqual(await rail.document(),continuedRail,'Interrupted line must not commit');
  }
  rail.pointer('pointerdown',1200,1200);rail.pointer('pointermove',1500,1300);rail.escape();
  assert.deepEqual(await rail.document(),continuedRail,'Escape must discard the active stroke');
  rail.pointer('pointerdown',1600,1600);rail.pointer('pointerup',1600,1600);
  assert.deepEqual(await rail.document(),continuedRail,'A click must not create a zero-length barrier');
  rail.pointer('pointerdown',1400,1300);rail.pointer('pointermove',1600,1400);rail.lake();
  rail.pointer('pointerup',1600,1400);
  assert.deepEqual(await rail.document(),continuedRail,'Changing tools must discard the line preview');
  const joinTarget={...existingBarrier,x:1100,length:40};
  const joined=editor([existingBarrier,joinTarget]);joined.barrier();
  joined.pointer('pointerdown',1020,1000);joined.pointer('pointerup',1077,1000);
  const joinedObjects=(await joined.document()).objects;
  samePoint(endpoint(joinedObjects.at(-1),1),endpoint(joinTarget,-1),'Snap the stroke end to another barrier');
  const oldLimit=editor(Array.from({length:1000},()=>({type:'cone',x:20,y:20,angle:0,scale:1})));oldLimit.barrier();
  oldLimit.pointer('pointerdown',1000,1000);oldLimit.pointer('pointerup',1160,1000);
  const extended=await oldLimit.document();assert(extended.objects.length>1000);validate(extended);
  assert.throws(()=>validate({version:1,objects:Array.from({length:maxObjects+1},()=>({type:'cone',x:20,y:20,angle:0,scale:1}))}));
  const nearLimit=Array.from({length:maxObjects-1},()=>({type:'cone',x:20,y:20,angle:0,scale:1}));
  const limited=editor(nearLimit);limited.barrier();
  limited.pointer('pointerdown',1000,1000);limited.pointer('pointerup',1600,1000);
  const limitedDoc=await limited.document();validate(limitedDoc);assert.equal(limitedDoc.objects.length,maxObjects);
  limited.nodes.get('undo').onclick();assert.deepEqual((await limited.document()).objects,nearLimit);
  for(const length of [0,.5,201,NaN,null,'40'])assert.throws(()=>validate({version:1,objects:[{...existingBarrier,length}]}));
  rail.barrier();rail.escape();assert.match(rail.nodes.get('add').textContent,/suojakaidetta/);
  console.log('PASS: continuous barrier drawing, corners, endpoint snapping, undo/redo, cancellation, length validation and limits');
  const original={type:'lake',x:1000,y:1000,angle:0,scale:1};
  const e=editor([original]);e.lake();
  assert.equal(e.nodes.get('lake-brush').hidden,false);
  // Starting on existing water must paint, never move the old element.
  e.pointer('pointerdown',1000,1000);
  e.pointer('pointermove',1400,1000);
  e.pointer('pointermove',1400,1400);
  e.pointer('pointerup',1600,1400);
  const first=await e.document();
  assert.deepEqual(first.objects[0],original);
  assert(first.objects.length>10,'A curved stroke must follow the pointer path');
  assert(first.objects.some(o=>o.x===1400&&o.y===1000));
  assert(first.objects.some(o=>o.x===1400&&o.y===1400));
  assert(first.objects.some(o=>o.x===1600&&o.y===1400),'Include pointerup position');
  validate(first);
  const stamps=first.objects.slice(1);
  for(let i=1;i<stamps.length;i++)assert(Math.hypot(stamps[i].x-stamps[i-1].x,stamps[i].y-stamps[i-1].y)<=30.001,'Fast pointer motion must leave continuous water');
  // Continue from a new stamp without re-enabling drawing.
  e.pointer('pointerdown',1600,1400);e.pointer('pointerup',1800,1400);
  const second=await e.document();assert(second.objects.length>first.objects.length);
  e.nodes.get('undo').onclick();assert.deepEqual(await e.document(),first);
  e.nodes.get('redo').onclick();assert.deepEqual(await e.document(),second);
  e.nodes.get('undo').onclick();e.nodes.get('undo').onclick();
  assert.deepEqual((await e.document()).objects,[original],'One undo per stroke');
  for(const ending of ['pointercancel','lostpointercapture']){
    e.pointer('pointerdown',1200,1200);e.pointer('pointermove',1800,1800);e.pointer(ending,1800,1800);
    assert.deepEqual((await e.document()).objects,[original],'Interrupted strokes must not commit');
  }
  e.pointer('pointerdown',1200,1200);e.pointer('pointermove',1500,1500);e.escape();
  assert.deepEqual((await e.document()).objects,[original]);
  // Smallest and largest brushes still produce valid saved data, even outside the map.
  for(const width of ['4','60']){
    e.nodes.get('lake-width').value=width;e.nodes.get('lake-width').oninput();
    e.pointer('pointerdown',-100,-100);e.pointer('pointerup',-100,-100);
    const doc=await e.document();validate(doc);
    assert.equal(doc.objects.at(-1).scale,Number(width)/20);
    assert.equal(doc.objects.at(-1).x,0);assert.equal(doc.objects.at(-1).y,0);
  }
  e.escape();
  assert.match(e.nodes.get('add').textContent,/^Piirr/);
  const count=(await e.document()).objects.length;
  // Selection/moving remains available after leaving paint mode.
  e.pointer('pointerdown',1000,1000);e.pointer('pointermove',1100,1100);e.pointer('pointerup',1100,1100);
  assert.equal((await e.document()).objects.length,count);
  assert.equal((await e.document()).objects[0].x,1100);
  const pan=editor();pan.lake();
  pan.pointer('pointerdown',500,500,{button:1});pan.pointer('pointermove',600,600);pan.pointer('pointerup',600,600);
  assert.equal((await pan.document()).objects.length,0,'Middle-button pan must not paint');
  const full=editor(Array.from({length:maxObjects-1},()=>({...original})));full.lake();
  full.pointer('pointerdown',1000,1000);full.pointer('pointerup',2000,2000);
  const limit=await full.document();assert.equal(limit.objects.length,maxObjects);validate(limit);
  full.pointer('pointerdown',2000,2000);full.pointer('pointerup',2100,2100);
  assert.equal((await full.document()).objects.length,maxObjects);
  full.nodes.get('undo').onclick();assert.equal((await full.document()).objects.length,maxObjects-1);

  const render={window:{LPRTrackDocument:documentApi,LPRTrackData:first,LPRCampus:{
    obstacleBounds:[],makeBody:(bounds,kind,mass)=>({bounds,kind,mass})
  }}};
  vm.createContext(render);vm.runInContext(fs.readFileSync('shared/track-objects.js','utf8'),render);
  const surfaces=[];render.window.LPRTrackObjects.build({quad:(...args)=>surfaces.push(args)});
  assert(surfaces.length>0);
  assert(surfaces.every(q=>q.slice(0,4).every(p=>p[1]===-.12)),'All scales must join the campus water height');
  assert(surfaces.every(q=>JSON.stringify(q[4])==='[0.12,0.36,0.45]'),'Overlaps must use the same water colour');
  console.log('PASS: lake brush continuation, curved strokes, undo/redo, cancellation, widths, limits, save and 3D water');

  const oldAsphalt={type:'asphalt',x:1000,y:1000,angle:0,scale:1};
  const a=editor([oldAsphalt]);a.asphalt();
  assert.equal(a.nodes.get('asphalt-brush').hidden,false);
  assert.equal(a.nodes.get('lake-brush').hidden,true);
  a.pointer('pointerdown',1000,1000);a.pointer('pointermove',1400,1000);
  a.pointer('pointermove',1400,1400);a.pointer('pointerup',1600,1400);
  const asphaltFirst=await a.document();validate(asphaltFirst);
  assert.deepEqual(asphaltFirst.objects[0],oldAsphalt,'Paint must not move existing asphalt');
  assert(asphaltFirst.objects.length>10);
  assert(asphaltFirst.objects.slice(1).every(o=>o.square&&o.roundness===.2));
  // The union remains paved throughout a fast, bent brush stroke.
  for(let x=1000;x<=1400;x+=5)assert(asphaltFirst.objects.some(o=>onAsphaltObject(o,x,1000)));
  for(let y=1000;y<=1400;y+=5)assert(asphaltFirst.objects.some(o=>onAsphaltObject(o,1400,y)));
  a.pointer('pointerdown',1600,1400);a.pointer('pointerup',1800,1400);
  const asphaltSecond=await a.document();assert(asphaltSecond.objects.length>asphaltFirst.objects.length);
  a.nodes.get('undo').onclick();assert.deepEqual(await a.document(),asphaltFirst);
  a.nodes.get('redo').onclick();assert.deepEqual(await a.document(),asphaltSecond);
  for(const ending of ['pointercancel','lostpointercapture']){
    a.pointer('pointerdown',2000,2000);a.pointer('pointermove',2200,2200);a.pointer(ending,2200,2200);
    assert.deepEqual(await a.document(),asphaltSecond);
  }
  a.pointer('pointerdown',2000,2000);a.escape();assert.deepEqual(await a.document(),asphaltSecond);
  // Both extreme corner settings and widths survive save/load validation.
  for(const [width,roundness] of [['1','0'],['2','100'],['4','0'],['60','100']]){
    a.nodes.get('asphalt-width').value=width;a.nodes.get('asphalt-width').oninput();
    a.nodes.get('asphalt-roundness').value=roundness;a.nodes.get('asphalt-roundness').oninput();
    a.pointer('pointerdown',3000,3000);a.pointer('pointerup',3000,3000);
    const doc=await a.document();assert.deepEqual(validate(doc),doc.objects);
    const stamp=doc.objects.at(-1);
    assert.equal(stamp.scale,Number(width)/12);assert.equal(stamp.roundness,Number(roundness)/100);
    const half=60*stamp.scale;
    assert(onAsphaltObject(stamp,stamp.x,stamp.y+half*.95),'Square stamp extends equally in both axes');
    assert.equal(onAsphaltObject(stamp,stamp.x+half*.95,stamp.y+half*.95),roundness==='0','Rounded corners exclude grass from paved ground');
  }
  const square={...oldAsphalt,square:true,roundness:0};
  const rounded={...square,roundness:1};
  assert(onAsphaltObject(square,1058,1058));assert(!onAsphaltObject(rounded,1058,1058));
  assert(!onAsphaltObject(oldAsphalt,1000,1050),'Legacy asphalt keeps its rectangular footprint');
  const rotated={...rounded,angle:Math.PI/4,scale:2};
  assert(onAsphaltObject(rotated,1000,1100));assert(!onAsphaltObject(rotated,1100,1100));
  for(const patch of [{square:'yes'},{roundness:-.1},{roundness:1.1},{roundness:NaN},{roundness:null}]){
    assert.throws(()=>validate({version:1,objects:[{...square,...patch}]}));
  }
  const asphaltRender={window:{LPRTrackDocument:documentApi,LPRTrackData:{version:1,objects:[rotated]},LPRCampus:{obstacleBounds:[]}}};
  vm.createContext(asphaltRender);vm.runInContext(fs.readFileSync('shared/track-objects.js','utf8'),asphaltRender);
  const asphaltApi=asphaltRender.window.LPRTrackObjects,asphaltSurfaces=[];
  asphaltApi.build({quad:(...args)=>asphaltSurfaces.push(args)});
  assert.equal(asphaltRender.window.LPRCampus.obstacleBounds.length,0);
  assert(asphaltApi.onAsphalt(1000,1100));assert(!asphaltApi.onAsphalt(1100,1100));
  assert(asphaltSurfaces.every(q=>q.slice(0,4).every(p=>p[1]===-.35)));
  const outline=asphaltOutline(rotated);
  for(const [x,y] of outline){
    const worldX=rotated.x+(x*Math.cos(rotated.angle)-y*Math.sin(rotated.angle))*rotated.scale;
    const worldY=rotated.y+(x*Math.sin(rotated.angle)+y*Math.cos(rotated.angle))*rotated.scale;
    assert(asphaltSurfaces.some(q=>q.slice(0,4).some(p=>Math.abs(p[0]-worldX)<1e-8&&Math.abs(p[2]-worldY)<1e-8)),'3D uses the same outline as the editor');
  }
  a.escape();assert.match(a.nodes.get('add').textContent,/asfalttia/);
  console.log('PASS: square asphalt brush, continuation, undo/redo, cancellation, rounded corners, validation and paved 3D footprint');
})().catch(error=>{console.error(error);process.exitCode=1;});
