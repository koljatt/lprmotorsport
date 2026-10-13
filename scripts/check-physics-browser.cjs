// Optional real WebGL smoke check. Start npm run dev first; uses local Chrome.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {spawn}=require('node:child_process');
const assert=require('node:assert/strict');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function main() {
  const profile=fs.mkdtempSync(path.join(os.tmpdir(),'lpr-physics-'));
  const browser=spawn('C:/Program Files/Google/Chrome/Application/chrome.exe',[
    '--headless=new','--no-first-run','--remote-debugging-port=9331',
    '--enable-unsafe-swiftshader',`--user-data-dir=${profile}`,'about:blank'
  ],{windowsHide:true,stdio:'ignore'});
  let socket;
  try {
    let pages;
    for(let i=0;i<100;i++) {
      try{pages=await (await fetch('http://127.0.0.1:9331/json')).json();if(pages.length)break;}catch{}
      await pause(100);
    }
    assert(pages?.length,'Chrome must start');
    socket=new WebSocket(pages.find(p=>p.type==='page').webSocketDebuggerUrl);
    await new Promise(resolve=>socket.addEventListener('open',resolve,{once:true}));
    const pending=new Map(),errors=[];let id=0;
    socket.addEventListener('message',event=>{
      const message=JSON.parse(event.data);
      if(message.id){const handler=pending.get(message.id);pending.delete(message.id);handler(message);}
      if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails);
    });
    const send=(method,params={})=>new Promise((resolve,reject)=>{
      const request=++id;pending.set(request,m=>m.error?reject(Error(JSON.stringify(m.error))):resolve(m.result));
      socket.send(JSON.stringify({id:request,method,params}));
    });
    await send('Runtime.enable');await send('Page.enable');
    await send('Page.addScriptToEvaluateOnNewDocument',{source:'window.requestAnimationFrame=()=>0;'});
    await send('Emulation.setDeviceMetricsOverride',{width:1280,height:800,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url:'http://127.0.0.1:8000/'});
    for(let i=0;i<100;i++) {
      const result=await send('Runtime.evaluate',{expression:'!!window.LPRRenderer3D && !!window.VehicleDynamics && document.readyState==="complete"',returnByValue:true});
      if(result.result.value)break;await pause(100);
    }
    const result=await send('Runtime.evaluate',{returnByValue:true,expression:`(()=>{
      const campus=window.LPRCampus;
      const renderer=new LPRRenderer3D(document.querySelector('#track'),document.querySelector('#cockpit'),campus.track);
      renderer.resize();renderer.updatePeople(0);
      const dynamics=new VehicleDynamics(),body=campus.vehicleBounds[campus.campusCars.length+campus.lakesideCars.length-1].body;
      const car={x:body.x,y:body.y,angle:0};dynamics.reset(car);car.vx=7;
      const hit=campus.resolveObstacleCollision(car,{x:body.x-100,y:body.y,angle:0},contact=>dynamics.applyImpact(car,contact.normal,contact.impactMaterial,contact));
      if(!hit)throw Error('No contact');
      for(let i=0;i<30;i++)campus.stepObstacles(1/90);
      car.x=body.x-90;car.y=body.y-30;car.angle=Math.atan2(30,90);
      renderer.render(car,1000);
      const error=renderer.gl.getError();
      const moved=campus.bodies.filter(b=>b.damage>0).length;
      campus.resetObstacles();renderer.render(car,1100);
      return {error,resetError:renderer.gl.getError(),damaged:moved,meshCount:renderer.obstacleMeshes.length};
    })()`});
    assert(!result.exceptionDetails,JSON.stringify(result.exceptionDetails));
    assert.equal(result.result.value.error,0);assert.equal(result.result.value.resetError,0);
    assert(result.result.value.damaged>0);assert.equal(errors.length,0,JSON.stringify(errors));
    console.log('PASS: real Chrome/WebGL impact rendering and reset',result.result.value);
  } finally {
    socket?.close();browser.kill();
    // Chrome's temporary profile is intentionally left to the OS temp cleanup.
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
