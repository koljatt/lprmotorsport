/* Shared Yolo / Sale building, stylised from the supplied exterior photos. */
window.LPRSale = {
  products: [
    {"id":"riisi","name":"Ben's Original basmatiriisi 1 kg","image":"assets/riisi.jpg","color":[0.88,0.79,0.5],"width":4,"height":5},
    {"id":"pasta","name":"Torino makaroni 400 g","image":"assets/pasta.jpg","color":[0.85,0.57,0.13],"width":4,"height":5},
    {"id":"kaurahiutaleet","name":"Kotimaista luomukaurahiutale 850 g","image":"assets/kaurahiutaleet.jpg","color":[0.73,0.41,0.15],"width":4,"height":5.5},
    {"id":"kahvi","name":"Paulig Juhla Mokka 500 g","image":"assets/kahvi.jpg","color":[0.35,0.13,0.08],"width":4,"height":4.5},
    {"id":"tee","name":"Lipton Yellow Label 50 pussia","image":"assets/tee.jpg","color":[0.18,0.42,0.22],"width":4,"height":3.5},
    {"id":"tomaattimurska","name":"Mutti Polpa tomaattimurska 400 g","image":"assets/tomaattimurska.jpg","color":[0.77,0.16,0.08],"width":3.5,"height":4},
    {"id":"hernekeitto","name":"Kotimaista hernekeitto 435 g","image":"assets/hernekeitto.jpg","color":[0.34,0.48,0.16],"width":3.5,"height":4},
    {"dairy":true,"id":"maito","name":"Valio vapaan lehmän kevytmaito 1 l","image":"assets/maito.jpg","color":[0.18,0.45,0.73],"width":3,"height":6},
    {"dairy":true,"shape":"tub","id":"jogurtti","name":"Valiojogurtti mansikka 200 g","image":"assets/jogurtti.jpg","color":[0.82,0.35,0.5],"width":3,"height":4},
    {"dairy":true,"id":"juusto","name":"Valio Oltermanni 500 g","image":"assets/juusto.jpg","color":[0.88,0.72,0.24],"width":4.8,"height":3.5},
    {"id":"ruisleipa","name":"Vaasan Ruispalat 330 g","image":"assets/ruisleipa.jpg","color":[0.53,0.32,0.12],"width":5,"height":4},
    {"id":"paahtoleipa","name":"Vaasan ISOpaahto Graham 500 g","image":"assets/paahtoleipa.jpg","color":[0.69,0.5,0.25],"width":5,"height":5},
    {"id":"talouspaperi","name":"Lotus Emilia Design 4 rll","image":"assets/talouspaperi.jpg","color":[0.55,0.66,0.7],"width":5,"height":5.5},
    {"id":"astianpesuaine","name":"Fairy Original 450 ml","image":"assets/astianpesuaine.jpg","color":[0.12,0.5,0.34],"width":3,"height":5.5},
    {id:'maitorahka',name:'Valio pehmeä maitorahka 250 g',image:'assets/maitorahka.jpg',color:[.31,.59,.82],width:3.2,height:3.5,dairy:true,shape:'tub',amount:'250 g'},
    {id:'kuohukerma',name:'Valio Keittiön kuohukerma laktoositon 2 dl',image:'assets/kuohukerma.jpg',color:[.72,.24,.31],width:2.8,height:4.5,dairy:true,amount:'2 dl'},
    {id:'ruokakerma',name:'Valio Keittiön ruokakerma 15% 2 dl',image:'assets/ruokakerma.jpg',color:[.28,.62,.36],width:2.8,height:4.5,dairy:true,amount:'2 dl'},
    {id:'smetana',name:'Valio Keittiön smetana 120 g',image:'assets/smetana.jpg',color:[.72,.52,.18],width:3,height:3.2,dairy:true,shape:'tub',amount:'120 g'},
    {id:'kermaviili',name:'Valio Keittiön kermaviili 200 g',image:'assets/kermaviili.jpg',color:[.19,.58,.57],width:3.2,height:3.5,dairy:true,shape:'tub',amount:'200 g'},
    {id:'voi',name:'Valio voi 500 g',image:'assets/voi.jpg',color:[.91,.74,.24],width:4,height:2.8,dairy:true,amount:'500 g'},
    {id:'doris',name:'Fazer Doris Tryffeli',image:'assets/doris.png',color:[.92,.57,.65],width:5.4,height:4.1},
    {id:'jaffa',name:'Fazer Jaffa Appelsiini',image:'assets/jaffa.webp',color:[.94,.36,.04],width:5.4,height:4.1},
    {id:'salmiakki-mix',name:'Fazer Pantteri Mix 230 g',image:'assets/salmiakki-mix.jpg',candyLabel:'SALMIAKKI',color:[.12,.1,.16],width:4.7,height:5.6},
    {id:'kirpeat-mix',name:'Fazer Ässä Mix 220 g',image:'assets/kirpeat-mix.jpg',candyLabel:'KIRPEÄ',color:[.75,.06,.4],width:4.7,height:5.6},
    {id:'vaahtokarkit',name:'Haribo Chamallows Original 250 g',image:'assets/vaahtokarkit.jpg',candyLabel:'VAAHTO',color:[.36,.66,.08],width:4.7,height:5.6},
    {id:'karkki-mix',name:'Malaco Aakkoset Sirkus 340 g',image:'assets/karkki-mix.jpg',candyLabel:'KARKKI',color:[.94,.65,.04],width:4.7,height:5.6},
    {id:'hartwall-vichy',name:'Hartwall Vichy Original 1,5 l',image:'assets/hartwall-vichy.jpg',color:[.85,.86,.8],width:2.8,height:6},
    {id:'coca-cola',name:'Coca-Cola Original Taste 1,5 l',image:'assets/coca-cola.jpg',color:[.85,.03,.04],width:3,height:5.5},
    {id:'ekstroms-vadelma',name:'Ekströms Vadelmainen sekamehu',image:'assets/ekstroms-vadelma.webp',color:[.24,.04,.08],width:2.8,height:6},
    {id:'marli-juissi',name:'Marli Juissi Mustikka-vadelma',image:'assets/marli-juissi.jpg',color:[.7,.12,.35],width:3,height:6},
    {id:'hk-sininen',name:'HK Sininen Lenkki',image:'assets/hk-sininen.jpg',color:[.9,.88,.8],width:5.8,height:5.5},
    {id:'megaforce',name:'Megaforce',image:'assets/megaforce.jpg',color:[.75,.04,.03],width:3,height:6},
    {id:'karjala',name:'Karjala',image:'assets/karjala.jpg',color:[.08,.07,.06],width:3,height:6},
    {id:'fazer-sininen',name:'Karl Fazer Maitosuklaa',image:'assets/fazer-sininen.jpg',color:[.02,.12,.35],width:6,height:3},
    {id:'remix',name:'Fazer Remix',image:'assets/remix.jpg',color:[.12,.06,.12],width:4.7,height:5.6},
    {id:'lihapiirakka',name:'HoviRuoka Lihapiirakka',image:'assets/lihapiirakka.jpg',color:[.94,.55,.08],width:6,height:3.8},
    {id:'snellman-nakki',name:'Snellman Kunnon kuoreton nakki',image:'assets/snellman-nakki.jpg',color:[.03,.33,.16],width:4.8,height:5.8},
    {id:'maksalaatikko',name:'Saarioinen maksalaatikko 400 g',image:'assets/maksalaatikko.jpg',color:[.58,.28,.12],width:5.5,height:3.8},
    {id:'nuudelit',name:'Nissin Demae Ramen kana 100 g',image:'assets/nuudelit.jpg',color:[.88,.58,.12],width:4,height:4.5},
    {id:'banaani',name:'Banaani',image:'assets/banaani.jpg',color:[.96,.81,.12],width:6,height:3.8},
    {id:'omena',name:'Omena Royal Gala',image:'assets/omena.jpg',color:[.78,.16,.08],width:4.4,height:4.4},
    {id:'croissant',name:'Voicroissant',image:'assets/croissant.jpg',color:[.83,.49,.16],width:6,height:3.5},
    {id:'nakkipiilo',name:'Nakkipiilo',image:'assets/nakkipiilo.jpg',color:[.76,.42,.17],width:6,height:3.6},
    {id:'aino-maitosuklaa',name:'Aino Ihana Maitosuklaa',image:'assets/aino-maitosuklaa.jpg',color:[.85,.77,.6],width:8,height:4},
    {id:'pingviini-suklaatuutit',name:'Pingviini Sukkela Suklaa',image:'assets/pingviini-suklaatuutit.png',color:[.05,.12,.5],width:8,height:4},
    {id:'eskimo-vanilja',name:'Eskimo Vanilja',image:'assets/eskimo-vanilja.jpg',color:[.16,.56,.8],width:8,height:4},
    {id:'pingviini-vanilja',name:'Pingviini Veikeä Vanilja',image:'assets/pingviini-vanilja.webp',color:[.02,.38,.65],width:8,height:4}
  ],
  // Shared glazed entrance; the interaction point is on the street below it.
  entrance: window.LPRCampus.world(539.2,446.4),
  buildExterior({box,quad,materialBox=box,artwork=()=>{}}) {
    const center=window.LPRCampus.world(550,462);
    // Facade coordinates: u runs left to right as seen from the street;
    // v is depth from the building centre. All details use this one transform.
    const point=([u,h,v])=>[center.x-u,h,center.y+v];
    const b=(u,h,v,w,height,depth,color)=>box(...point([u,h,v]),w,height,depth,color);
    const m=(u,h,v,w,height,depth,color,material)=>materialBox(...point([u,h,v]),w,height,depth,color,material);
    const q=(a,b,c,d,color)=>quad(...[a,b,c,d].map(point),color);
    const label=(id,u,h,v,w,height)=>artwork(id,
      [[u-w/2,h,v],[u+w/2,h,v],[u+w/2,h+height,v],[u-w/2,h+height,v]].map(point));
    let glassId=0;
    const glazing=(u,h,v,w,height,color)=>{
      m(u,h,v,w,height,.25,color,'glass');
      label('glass'+glassId++,u,h,v-.2,w,height);
    };
    const white=[.94,.94,.9],joint=[.64,.66,.64],frame=[.19,.22,.21];
    const concrete=[.65,.66,.62],steel=[.49,.54,.53];
    // Smooth off-white ceramic cladding, with one fine square joint grid.
    // Do not use the coarse concrete shader: it adds a second, incompatible grid.
    b(0,0,0,300,65,100,white);
    b(0,65,0,301,.7,101,[.69,.71,.68]);
    b(0,0,-50.15,300,6,.3,concrete);
    const panels=(u0,u1,h0,h1,v)=>{
      for(let u=u0;u<=u1+.01;u+=8) b(u,h0,v,.12,h1-h0,.16,joint);
      for(let h=h0;h<=h1+.01;h+=8) b((u0+u1)/2,h,v,u1-u0,.12,.16,joint);
    };
    panels(-150,150,6,65,-50.25);
    // Taller white stair tower and a recessed vertical slot at the left end.
    b(-134,0,-41.5,32,78,17,white);
    panels(-150,-118,6,78,-50.4);
    b(-134,78,-41.5,33,.7,18,[.7,.72,.69]);
    glazing(-136,13,-50.65,4,36,[.15,.21,.2]);
    for(const h of [13,25,37,49]) b(-136,h,-50.95,4.5,.5,.4,frame);
    glazing(-111,6,-50.7,9,57,[.16,.2,.18]);
    for(let h=6;h<63;h+=8) b(-111,h,-51,9,.45,.3,frame);
    // Upper ribbon is narrow, with a broad white band above and below it.
    // It stops at the tower and is interrupted by the tall entrance glazing.
    const upperWindows=(start,end)=>{
      for(let u=start;u<end;u+=10) {
        const w=Math.min(10,end-u);
        glazing(u+w/2,47,-50.7,w-.55,7,[.21,.25,.21]);
        b(u,46.7,-51,.45,7.6,.4,frame);
      }
      for(const h of [46.7,54]) b((start+end)/2,h,-51,end-start,.45,.4,frame);
    };
    upperWindows(-104,30);upperWindows(79,149);
    // Three dining-room bays, set above a substantial concrete plinth.
    // Separate panes avoid the old oversized blue glass slabs.
    b(-39,0,-50.6,140,12,.7,[.68,.69,.65]);
    for(const u of [-84,-39,6]) {
      b(u,13,-50.6,34,23,.6,frame);
      for(let col=0;col<3;col++) for(let row=0;row<3;row++) {
        const px=u-16+col*10.8+5.15,py=13.6+row*7.3;
        glazing(px,py,-51,10.15,6.8,
          row===2 ? [.26,.29,.24] : [.19+.015*col,.24,.21]);
      }
      b(u,36.5,-51.1,36,2.2,1.4,[.87,.88,.84]);
      b(u,11.6,-51.2,35,.65,1.8,[.62,.64,.6]);
    }
    // Modest cafeteria lettering on a window, rather than an invented billboard.
    label('yolo',-39,29,-51.3,12,3);
    // Two white pilasters frame the tall, recessed shared entrance.
    for(const u of [30,78]) {
      b(u,6,-51.1,5,55,2.2,white);
      panels(u-2.5,u+2.5,6,61,-52.3);
    }
    b(54,6,-50.7,43,54,.4,frame);
    for(let col=0;col<4;col++) for(let row=0;row<6;row++) {
      glazing(33.5+col*10.3+4.9,6.7+row*8.8,-51,9.7,8.2,
        [.19+.01*(col%2),.25,.23]);
    }
    // Thin entrance canopy and a correctly proportioned glazed door.
    b(54,36.5,-57.5,48,.8,14,[.2,.23,.22]);
    b(54,37.3,-57.5,48,.35,14,[.49,.5,.45]);
    b(54,6.5,-51.45,17,29,.4,[.075,.105,.08]);
    b(54,33.4,-51.7,15,1,.25,[.71,.65,.42]);
    for(const u of [45.5,62.5]) b(u,6.5,-52,.65,29.5,.7,frame);
    b(54,35.5,-52,17.7,.65,.7,frame);
    // The open leaf stays next to its hinge, clear of the poster strip.
    const doorA=[62,6.7,-52.2],doorB=[67,6.7,-59];
    q(doorA,doorB,[67,35,-59],[62,35,-52.2],[.23,.3,.27]);
    const tube=(a,c,r,color=steel)=>{
      const d=c.map((v,i)=>v-a[i]),length=Math.hypot(...d);
      const e=d.map(v=>v/length),ref=Math.abs(e[1])>.9 ? [1,0,0] : [0,1,0];
      const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
      const axis=cross(e,ref),size=Math.hypot(...axis),u=axis.map(v=>v/size),v=cross(e,u);
      const ring=(p,i)=>p.map((n,j)=>n+r*(u[j]*Math.cos(i*Math.PI/4)+v[j]*Math.sin(i*Math.PI/4)));
      for(let i=0;i<8;i++) q(ring(a,i),ring(c,i),ring(c,i+1),ring(a,i+1),color.map(n=>n*(.85+.15*Math.cos(i*Math.PI/4))));
    };
    for(const h of [6.7,19,35]) tube([62,h,-52.3],[67,h,-59],.3,frame);
    for(const [u,v] of [[62,-52.3],[67,-59]]) tube([u,6.7,v],[u,35,v],.3,frame);
    tube([66,17,-58.2],[66,23,-58.2],.22,[.73,.75,.7]);
    b(54,6.55,-56.5,17,.2,10,[.15,.16,.13]);
    b(54,6.7,-61.3,17,.18,.7,[.92,.69,.13]);
    // Sale is the solid white end wall to the RIGHT of the shared entrance.
    // A shallow framed poster band never crosses the glazed door.
    b(114,19,-51,67,9,.65,frame);
    for(let i=0;i<10;i++) {
      const u=84+i*6.6;
      b(u,19.5,-51.5,6.1,8,.25,i%3===2 ? [.27,.4,.22] : [.91,.66,.17]);
      label('poster'+i,u,19.5,-51.7,6.1,8);
    }
    const signU=86,signH=36,signV=-54;
    b(signU,35.5,-52,1.2,1.2,4,frame);
    for(let i=0;i<48;i++) {
      const a=i*Math.PI/24,c=(i+1)*Math.PI/24;
      q([signU,signH,signV],[signU+Math.cos(a)*5,signH+Math.sin(a)*5,signV],
        [signU+Math.cos(c)*5,signH+Math.sin(c)*5,signV],[signU,signH,signV],[.82,.015,.045]);
    }
    label('sign',signU,signH-5,signV-.12,10,10);
    // Square panel joints continue around the Sale return wall.
    for(let v=-50;v<=50;v+=8) b(150.2,6,v,.16,59,.12,joint);
    for(let h=6;h<65;h+=8) b(150.2,h,0,.16,.12,100,joint);
    // A level sidewalk below two real wedge-shaped ramps. Both rise toward
    // the central entrance landing; the thin tubular rails follow the slope.
    m(0,.05,-64,304,.25,26,[.46,.47,.43],'concrete');
    b(54,0,-60,48,6.5,18,[.71,.72,.68]);
    b(54,6.5,-60,48,.22,18,[.48,.49,.44]);
    const ramp=(start,end,startH,endH)=>{
      const front=-69,back=-51.4;
      q([start,startH,front],[end,endH,front],[end,endH,back],[start,startH,back],[.49,.5,.46]);
      q([start,0,front],[end,0,front],[end,endH,front],[start,startH,front],[.72,.73,.69]);
      q([start,0,back],[start,startH,back],[end,endH,back],[end,0,back],[.61,.63,.59]);
      const height=u=>startH+(endH-startH)*(u-start)/(end-start);
      // Continuous curb and two round horizontal bars along the outside edge.
      for(const rise of [.4,5.5,10.5]) tube([start,startH+rise,front],[end,endH+rise,front],rise===.4 ? .28 : .22);
      const spans=Math.ceil((end-start)/15);
      for(let i=0;i<=spans;i++) {
        const u=start+(end-start)*i/spans,h=height(u);
        tube([u,h,front],[u,h+10.5,front],.23);
      }
    };
    ramp(-147,30,.35,6.5);ramp(78,148,6.5,.35);
    // Landing rail leaves a clear central opening toward the door.
    for(const [start,end] of [[30,43],[65,78]]) {
      for(const h of [12,17]) tube([start,h,-69],[end,h,-69],.22);
      for(const u of [start,end]) tube([u,6.5,-69],[u,17,-69],.23);
    }
    // Three low central steps connect the street directly to the landing.
    for(let i=0;i<3;i++) b(54,0,-75+i*2.1,22,(i+1)*6.5/3,2.1,[.66,.67,.62]);
    // Secondary Yolo entrance canopy is a small detail beside the left tower.
    b(-111,36,-55.5,23,.65,10,[.23,.25,.23]);
    b(-111,36.65,-55.5,23,.25,10,[.51,.52,.48]);
  },
  buildInterior({box,quad=()=>{},productFace=()=>{},artwork=()=>{},cashierFace=()=>{},cashierGeometry=build=>build()}) {
    const b=(x,y,z,w,h,d,c)=>box(-6000+x,y,z,w,h,d,c);
    const q=(a,c,d,e,color)=>quad(...[a,c,d,e].map(p=>[p[0]-6000,p[1],p[2]]),color);
    const label=(id,x,y,z,w,h,side=1)=>artwork(id,[[x-6000-side*w/2,y,z],[x-6000+side*w/2,y,z],[x-6000+side*w/2,y+h,z],[x-6000-side*w/2,y+h,z]]);
    // Elliptical profiles keep every package inside its existing shelf facing.
    const roundPack=(x,y,z,w,h,axis,color,profile)=>{
      const point=(level,i)=>{
        const [rise,scale]=profile[level],angle=i*Math.PI/8;
        return axis==='x' ? [x+Math.cos(angle)*1.25*scale,y+rise*h,z+Math.sin(angle)*w*.5*scale] :
          [x+Math.sin(angle)*w*.5*scale,y+rise*h,z+Math.cos(angle)*1.25*scale];
      };
      for(let level=0;level<profile.length-1;level++) for(let i=0;i<16;i++) {
        const tone=.86+.14*Math.cos(i*Math.PI/8);
        q(point(level,i),point(level,i+1),point(level+1,i+1),point(level+1,i),color.map(c=>c*tone));
      }
      const top=profile.length-1;
      for(let i=0;i<16;i++) q([x,y+h,z],point(top,i),point(top,i+1),[x,y+h,z],[.78,.79,.74]);
    };
    const packageBody=(product,x,y,z,axis,h=product.height)=>{
      const bottles=['hartwall-vichy','coca-cola','ekstroms-vadelma','astianpesuaine'];
      const cans=['tomaattimurska','hernekeitto','megaforce','karjala'];
      if(bottles.includes(product.id)) {
        roundPack(x,y,z,product.width,h,axis,product.color,[[0,.8],[.06,1],[.66,1],[.83,.4],[.95,.35],[1,.4]]);
        b(x,y+h*.95,z,...(axis==='x' ? [1,.3,product.width*.4] : [product.width*.4,.3,1]),
          product.id==='coca-cola' ? [.82,.035,.03] : [.88,.9,.85]);
      } else if(cans.includes(product.id)) {
        roundPack(x,y,z,product.width,h,axis,product.color,[[0,.94],[.04,1],[.96,1],[1,.94]]);
      } else b(x,y,z,...(axis==='x' ? [2.6,h,product.width] : [product.width,h,2.6]),product.color);
    };
    const apple=(x,y,z,seed=0)=>{
      const radius=1.65+.12*Math.sin(seed*2.7);
      const point=(ring,segment)=>{
        const theta=ring*Math.PI/10,phi=segment*Math.PI/8;
        const r=radius*Math.sin(theta)*(1+.045*Math.cos(phi*5)*Math.abs(Math.cos(theta)));
        // Broad shoulders, narrower base and a small hollow around the stem.
        return [x+r*Math.cos(phi)*(1+.08*Math.cos(theta)),
          y+radius+radius*.92*Math.cos(theta)-.32*Math.exp(-theta*theta*12),
          z+r*Math.sin(phi)];
      };
      for(let ring=0;ring<10;ring++) for(let segment=0;segment<16;segment++) {
        const blush=(1+Math.sin(segment*Math.PI/8+seed))*.5;
        const stripe=.025*Math.sin(segment*3+seed);
        q(point(ring,segment),point(ring+1,segment),point(ring+1,segment+1),point(ring,segment+1),
          [.72+blush*.18,.09+(1-blush)*.29+stripe,.035+(1-blush)*.035]);
      }
      b(x,y+radius*1.92-.32,z,.22,.85,.22,[.27,.16,.055]);
      q([x,y+radius*1.92+.2,z],[x+.6,y+radius*1.92+.5,z-.3],
        [x+1.15,y+radius*1.92+.35,z],[x+.5,y+radius*1.92+.15,z+.2],[.18,.36,.07]);
    };
    const candyBag=(product,x,y,z,side,axis)=>{
      const w=product.width,h=product.height;
      const p=(u,v,d)=>axis==='x' ? [x+side*d,y+v,z-side*u] : [x+side*u,y+v,z+side*d];
      const front=[p(-w*.45,.35,1.32),p(w*.45,.35,1.32),p(w*.4,h-.35,1.32),p(-w*.4,h-.35,1.32)];
      const back=[p(-w*.48,0,-.3),p(w*.48,0,-.3),p(w*.46,h,-.3),p(-w*.46,h,-.3)];
      // A soft filled pouch, pinched flat at its heat-sealed edges.
      for(let i=0;i<4;i++) q(back[i],back[(i+1)%4],front[(i+1)%4],front[i],product.color);
      productFace(product.id,front.map(point=>[point[0]-6000,point[1],point[2]]));
      const localBox=(u,v,d,uw,vh,dd,c)=>{
        const point=p(u,v,d);
        b(...point,...(axis==='x' ? [dd,vh,uw] : [uw,vh,dd]),c);
      };
      for(const v of [0,h-.28]) {
        localBox(0,v,.05,w,.28,.22,product.color);
        for(let u=-w*.43;u<w*.44;u+=.4) localBox(u,v,.18,.09,.28,.05,[.86,.84,.75]);
      }
      // Metal peg behind the top seal, with a raised tip.
      localBox(0,h+.1,-.9,.13,.13,2.8,[.66,.69,.7]);
      localBox(0,h+.05,.52,.13,.35,.13,[.66,.69,.7]);
    };
    const stock=(id,x,y,z,side)=>{
      if(id==='omena') { apple(x,y,z,x+z); return; }
      const product=this.products.find(p=>p.id===id),w=product.width,h=product.height;
      if(id==='remix' || product.candyLabel) { candyBag(product,x,y,z,side,'x'); return; }
      packageBody(product,x,y,z,'x');
      // Front artwork faces the aisle independently on either side of a shelf.
      const faceX=-6000+x+side*1.42;
      productFace(id,[[faceX,y,z+side*w/2],[faceX,y,z-side*w/2],
        [faceX,y+h,z-side*w/2],[faceX,y+h,z+side*w/2]]);
    };
    const stockZ=(id,x,y,z,side)=>{
      if(id==='omena') { apple(x,y,z,x+z); return; }
      const product=this.products.find(p=>p.id===id),w=product.width;
      // Leave room for carton folds below the next refrigerated shelf.
      const h=product.dairy ? Math.min(product.height,5.4) : product.height;
      if(id==='remix' || product.candyLabel) { candyBag(product,x,y,z,side,'z'); return; }
      if(product.shape==='tub') {
        const radius=w/2,point=(a,v,r)=>[x+Math.cos(a)*r,y+v,z+Math.sin(a)*r];
        for(let i=0;i<16;i++) {
          const a=i*Math.PI/8,c=(i+1)*Math.PI/8;
          q(point(a,0,radius*.8),point(c,0,radius*.8),point(c,h-.3,radius),point(a,h-.3,radius),[.92,.94,.92]);
          q([x,y+h,z],point(a,h,radius*1.05),point(c,h,radius*1.05),[x,y+h,z],product.color);
        }
      } else {
        if(product.dairy) b(x,y,z,w,h,2.6,[.93,.94,.9]);
        else packageBody(product,x,y,z,'z',h);
        if(product.dairy && id!=='voi' && id!=='juusto') {
          q([x-w/2,y+h,z-1.3],[x+w/2,y+h,z-1.3],[x+w/2,y+h+.7,z],[x-w/2,y+h+.7,z],[.84,.86,.83]);
          q([x-w/2,y+h,z+1.3],[x+w/2,y+h,z+1.3],[x+w/2,y+h+.7,z],[x-w/2,y+h+.7,z],product.color);
          b(x,y+h+.7,z,.9,.25,.7,product.color);
        }
      }
      // Tub labels must sit beyond the widest curved wall, not inside it.
      const faceZ=z+side*(product.shape==='tub' ? w/2+.12 : 1.42);
      productFace(id,[[x-6000-side*w/2,y,faceZ],[x-6000+side*w/2,y,faceZ],
        [x-6000+side*w/2,y+h,faceZ],[x-6000-side*w/2,y+h,faceZ]]);
    };
    const candyIds=['salmiakki-mix','kirpeat-mix','vaahtokarkit','karkki-mix','remix'];
    const candyRack=(x,z,side,axis,width,columns)=>{
      const p=(u,y,d)=>axis==='x' ? [x+side*d,y,z-side*u] : [x+side*u,y,z+side*d];
      const block=(u,y,d,w,h,depth,color)=>b(...p(u,y,d),...(axis==='x' ? [depth,h,w] : [w,h,depth]),color);
      block(0,0,-2.3,width,35,.7,[.18,.19,.17]);
      // Regular perforations remain visible between the hanging bags.
      for(let y=6;y<35;y+=1.8) for(let u=-width/2+1;u<width/2;u+=1.8)
        block(u,y,-1.9,.24,.3,.04,[.045,.05,.045]);
      for(let row=0;row<4;row++) {
        const y=5+row*7.3;
        block(0,y-.9,.65,width,.8,.45,[.75,.76,.7]);
        for(let column=0;column<columns;column++) {
          const u=(column-(columns-1)/2)*(width-6)/(columns-1);
          const pos=p(u,y,0),id=candyIds[(column+row*2)%candyIds.length];
          if(axis==='x') stock(id,...pos,side); else stockZ(id,...pos,side);
          block(u,y-.88,.93,3,.65,.08,column%3===0 ? [.98,.85,.15] : [.96,.96,.91]);
          // Price digits and a barcode give the strips the reference's detail.
          for(let digit=0;digit<3;digit++) block(u-.7+digit*.55,y-.7,.99,.2,.22,.04,[.1,.1,.09]);
          for(let line=0;line<5;line++) block(u+.6+line*.09,y-.8,.99,.04,.35,.04,[.15,.15,.14]);
        }
      }
      // Chocolate bars in low open display trays.
      block(0,1,.2,width,.8,5,[.64,.62,.53]);
      for(let column=0;column<columns;column++) {
        const pos=p((column-(columns-1)/2)*(width-6)/(columns-1),2,0);
        if(axis==='x') stock('fazer-sininen',...pos,side); else stockZ('fazer-sininen',...pos,side);
      }
    };
    const dryGoods=['riisi','pasta','kaurahiutaleet','kahvi','tee','tomaattimurska','hernekeitto','nuudelit'];
    // Perimeter shelving is ambient; chilled products stay in the cases.
    const department=z=>z>70 ? ['ruisleipa','paahtoleipa'] :
      z<=-75 ? ['talouspaperi','astianpesuaine'] : dryGoods;
    b(0,-1,0,180,1,300,[.56,.58,.56]);
    // Individual ceramic tiles with quiet variation and recessed grout.
    for(let iz=0;iz<30;iz++) for(let ix=0;ix<18;ix++) {
      const tone=.72+.012*Math.sin(ix*17+iz*31);
      b(-85+ix*10,-.03,-145+iz*10,9.94,.05,9.94,[tone,tone+.012,tone+.005]);
    }
    for(const x of [-88,88]) b(x,0,0,.7,2,298,[.28,.31,.29]);
    b(0,45,0,180,2,300,[.83,.84,.81]);
    for(const x of [-90,90]) b(x,0,0,2,45,300,[.7,.71,.67]);
    for(const z of [-150,150]) b(0,0,z,180,45,2,[.7,.71,.67]);
    // Acoustic tiles in a continuous low suspended ceiling.
    for(let x=-82.5;x<90;x+=15) for(let z=-142.5;z<150;z+=15) {
      const tone=.86+.012*Math.sin(x*3+z);
      b(x,44.5,z,14.7,.4,14.7,[tone,tone+.008,tone-.014]);
    }
    for(let x=-90;x<=90;x+=15) b(x,44.4,0,.22,.2,298,[.73,.75,.73]);
    for(let z=-150;z<=150;z+=15) b(0,44.4,z,178,.2,.22,[.73,.75,.73]);
    for(const x of [-88,88]) b(x,35,0,1,4,298,[.96,.75,.12]);
    // Ceiling panels and long bright strip lights.
    for(let z=-130;z<150;z+=35) {
      for(const x of [-55,35]) {
        b(x,43.6,z,5,.8,29,[.78,.8,.78]);
        b(x,43.4,z,3.8,.2,27,[1,1,.97]);
        for(const dx of [-.95,.95]) b(x+dx,43.3,z,.42,.15,26,[1,1,1]);
      }
    }
    // Ventilation grilles, with recessed parallel slots.
    for(const z of [-105,0,105]) {
      b(-3,44,z,9,.3,8,[.72,.74,.72]);
      for(let dz=-3;dz<=3;dz+=.8) b(-3,43.95,z+dz,7,.08,.2,[.43,.46,.44]);
    }
    // Meat and chilled foods follow dry groceries, midway into the shop.
    b(80,0,0,18,36,70,[.16,.18,.17]);
    b(68,36,0,3,7,70,[.97,.78,.04]);
    for(let z=-34;z<30;z+=23) {
      b(68,1,z,1,35,1,[.07,.08,.075]);
      b(66,15,z+2,1,10,1,[.67,.69,.65]);
      for(let h=3;h<34;h+=7) {
        b(74,h,z+11,14,.8,21,[.76,.77,.7]);
        const chilled=['hk-sininen','snellman-nakki','lihapiirakka','maksalaatikko'];
        for(let item=0;item<3;item++) stock(chilled[(item+Math.floor((z+34)/23))%chilled.length],69,h+1,z+4+item*6.8,-1);
      }
      b(67,1,z+11,.5,1,22,[.65,.71,.7]);
      b(67,34,z+11,.5,1,22,[.65,.71,.7]);
    }
    // One uninterrupted, wide shelving run leaves two narrow wall-side aisles.
    // A recessed spine exposes the decks and packages instead of swallowing
    // them in a solid block. The broad plinth keeps the same aisle footprint.
    b(-3,0,-30,70,1.5,180,[.23,.25,.23]);
    b(-3,1.5,-30,34,27.5,180,[.31,.34,.32]);
    // Opaque steel backs reach above eye level, including both end displays.
    // Keep them behind the stock so labels and shelf decks remain visible.
    for(const side of [-1,1]) b(-3+side*19,1.5,-30,.8,31.5,180,[.61,.64,.6]);
    for(const z of [-118,58]) b(-3,1.5,z,70,31.5,.8,[.61,.64,.6]);
    for(const x of [-21,15]) for(const z of [-119,-60,0,59])
      b(x,1.5,z,.8,28,.8,[.53,.57,.55]);
    for(const side of [-1,1]) {
      for(const z of [-119,-60,0,59]) {
        b(-3+side*36,1.5,z,.65,28,.65,[.69,.71,.68]);
        for(let h=4;h<29;h+=1.5) b(-3+side*36.36,h,z,.05,.5,.18,[.2,.24,.22]);
      }
      b(-3+side*36,.3,-30,.7,1.1,180,[.12,.14,.13]);
    }
    for(const side of [-1,1]) {
      b(-3+side*27,30,-30,19,3,180,[.16,.34,.28]);
      for(const [id,z] of [['groceries',30],['household',-90],
        [side===-1 ? 'drinks' : 'groceries',-30]]) {
        const faceX=-6003+side*36.65;
        artwork(side===-1 && z===30 ? 'sweets' : id,
          [[faceX,30.4,z+side*24],[faceX,30.4,z-side*24],
           [faceX,32.6,z-side*24],[faceX,32.6,z+side*24]]);
      }
    }
    for(const shelf of this.shelves) {
      const {x,z,products}=shelf;
      for(const side of [-1,1]) {
        if(z===30 && side===-1) { candyRack(x-35,z,-1,'x',60,10); continue; }
        for(let h=2;h<29;h+=7) {
          b(x+side*27,h,z,18,1,60,[.84,.86,.82]);
          b(x+side*36,h,z,.5,1,60,[.38,.42,.4]);
          const facingProducts=side===1 && shelf.reverseProducts ? shelf.reverseProducts : products;
          for(let priceZ=z-26;priceZ<z+30;priceZ+=5.8) {
            const faceX=-6000+x+side*36.3;
            const priceId=facingProducts[Math.min(facingProducts.length-1,Math.floor((priceZ-z+29)/58*facingProducts.length))];
            artwork('price-'+priceId,[[faceX,h,priceZ+side*2],[faceX,h,priceZ-side*2],
              [faceX,h+.85,priceZ-side*2],[faceX,h+.85,priceZ+side*2]]);
          }
          const ids=Array.from({length:12},(_,item)=>
            side===1 && z===-30 && item<2 ? (item===0 ? 'doris' : 'jaffa') :
              facingProducts[Math.floor(item*facingProducts.length/12)]);
          const widths=ids.map(id=>this.products.find(p=>p.id===id).width);
          const gap=(58-widths.reduce((sum,w)=>sum+w,0))/(ids.length-1);
          let cursor=z-29;
          for(let item=0;item<ids.length;item++) {
            stock(ids[item],x+side*35,h+1,cursor+widths[item]/2,side);
            cursor+=widths[item]+gap;
          }

        }
      }
    }
    b(32,2,-47,6,27,.6,[.64,.65,.6]);
    // End displays only at the exposed ends; no gaps between departments.
    for(let h=2;h<29;h+=7) {
      b(-3,h,-120,70,1,3,[.74,.75,.68]);
      for(let item=0;item<10;item++) stockZ(item%2 ? 'talouspaperi' : 'astianpesuaine',-33+item*6.6,h+1,-120,-1);
    }
    for(let h=2;h<29;h+=7) {
      b(-3,h,60,70,1,3,[.74,.75,.68]);
      for(const dx of [-30,-24,-18,18,24,30]) stockZ(dx<0 ? 'ruisleipa' : 'paahtoleipa',-3+dx,h+1,60,1);
    }
    // Wall shelving follows the same department order as the central islands.
    for(const side of [-1,1]) for(let z=-122;z<=130;z+=21) {
      // Reserve the left wall for the staff door and bottle-return machine;
      // the existing meat refrigerators occupy the middle of the right wall.
      if(side===-1 && (Math.abs(z)<25 || Math.abs(z-81)<23)) continue;
      if(side===-1 && z<-34) continue; // Ice cream lines the left return aisle.
      if(side===1 && Math.abs(z)<46) continue; // Meat refrigerators stay on the right.
      const x=side===-1 ? -85 : 79,faceX=side===-1 ? -79 : 69;
      b(x,0,z,8,32,20,[.23,.25,.23]);
      const ids=department(z);
      for(let h=2;h<30;h+=7) {
        b(x,h,z,12,1,20,[.74,.75,.68]);
        for(let item=0;item<3;item++) stock(ids[(item+(h-2)/7)%ids.length],faceX,h+1,z-7+item*7,-side);
      }
    }
    // Both end walls are stocked, with a clear opening at the entrance.
    for(const side of [-1,1]) for(const x of [-66,-44,-22,0,24,48]) {
      if(side===-1) continue; // Back wall is dedicated to refrigerated dairy.
      if(side===1 && x>=-22 && x<=48) continue; // Separate entry and exit openings.
      b(x,0,side*146,22,30,6,[.23,.25,.23]);
      const ids=side===1 ? (x===-66 ? ['croissant','nakkipiilo'] : ['ruisleipa','paahtoleipa']) : ['talouspaperi','astianpesuaine'];
      for(let h=2;h<29;h+=7) {
        b(x,h,side*144,22,1,8,[.74,.75,.68]);
        for(let item=0;item<3;item++) stockZ(ids[item%ids.length],x-7+item*7,h+1,side*140,-side);
      }
    }
    // Nine illuminated refrigeration bays on the back wall; clear cross-aisle in front.
    const dairy=['maito','jogurtti','maitorahka','kuohukerma','ruokakerma','smetana','kermaviili','voi','juusto'];
    this.dairyBays.forEach((bay,index)=>{
      const x=bay.x,z=-144,id=dairy[index];
      b(x,0,z-4.5,15,37,1,[.21,.25,.26]);
      b(x,3,z-3.9,13,29,.2,[.87,.92,.93]);
      for(const dx of [-7.2,7.2]) b(x+dx,0,z,.6,37,10,[.21,.25,.26]);
      b(x,32,z,15,1,10,[.21,.25,.26]);
      b(x,0,z+5.3,15,3,.8,[.12,.13,.17]);
      for(let vent=-7;vent<=7;vent+=1.5) b(x+vent,1,z+5.8,.7,.2,.15,[.45,.5,.5]);
      for(const dx of [-7,7]) {
        b(x+dx,3,z+6,.65,30,.65,[.34,.41,.43]);
        b(x+dx*.9,4,z+5.2,.3,28,.3,[.86,.98,1]);
      }
      for(let level=0;level<4;level++) {
        const h=4+level*7;
        b(x,h,z+1,13,.5,8,[.72,.8,.82]);
        b(x,h,z+5.5,13,.8,.4,[.28,.35,.37]);
        const product=this.products.find(p=>p.id===id);
        const columns=Math.floor(13/(product.width+.35));
        const spacing=13/columns;
        for(let column=0;column<columns;column++) {
          const px=x+(column-(columns-1)/2)*spacing;
          // A second row adds depth behind the aisle-facing packages.
          stockZ(id,px,h+.6,z-.7,1);
          stockZ(id,px,h+.6,z+3,1);
        }
        label('price-'+id,x,h,z+5.8,6,.75);
      }
      b(x,33,z+5.6,15,4,.8,[.13,.34,.37]);
      label(id,x,33.5,z+6.1,13,2.7);
      b(x+5.7,13,z+6.2,.55,9,.7,[.68,.75,.77]);
      // Narrow reflected streaks suggest glass without hiding the product artwork.
      q([x-6,6,z+6.1],[x-5.5,6,z+6.1],[x-3,31,z+6.1],[x-3.5,31,z+6.1],[.64,.78,.8]);
    });
    label('dairy',-4,38,-138,95,5);
    // Bottle-return machine: dark intake, screen and green status light.
    b(-80,0,81,14,30,22,[.64,.68,.65]);
    b(-72.8,8,81,.5,20,18,[.15,.19,.17]);
    b(-72.4,16,85,.4,7,7,[.025,.03,.025]);
    b(-72.2,17,85,.4,5,5,[.07,.08,.07]);
    b(-72.3,22,77,.4,4,6,[.12,.65,.4]);
    b(-72.3,12,77,.4,1,3,[.1,.9,.25]);
    artwork('returns',[[-6072.1,25,88],[-6072.1,25,74],[-6072.1,28,74],[-6072.1,28,88]]);
    b(-72.1,9,77,.25,.4,4,[.035,.04,.035]);
    b(-72,8.7,77,.25,.3,2.8,[.94,.93,.85]);
    // Staff-only door with the requested lowercase wording and a handle.
    b(-88,0,0,2,34,32,[.33,.36,.34]);
    b(-86.8,22,0,.5,7,25,[.94,.94,.9]);
    b(-86.3,13,11,1,1,4,[.78,.8,.78]);
    const glyphs={v:['000','101','101','101','010'],a:['000','110','001','111','111'],
      i:['010','000','010','010','010'],n:['000','110','101','101','101'],
      h:['100','100','110','101','101'],e:['000','111','101','110','111'],
      k:['100','101','110','101','101'],l:['110','010','010','010','111'],
      ö:['101','000','111','101','111'],u:['000','101','101','101','111'],
      t:['010','111','010','010','011']};
    [...'vain henkilökunta'].forEach((letter,i)=>glyphs[letter]?.forEach((row,r)=>[...row].forEach((bit,c)=>{
      if(bit==='1') b(-86.4,26-r*.55,10-i*1.2-c*.3,.2,.45,.25,[.08,.1,.09]);
    })));
    // Apples beside the compact banana stand at the entrance.
    b(-3,0,76,18,10,24,[.57,.39,.16]);
    b(-3,10,76,17,.6,23,[.25,.36,.12]);
    for(const x of [-11.5,5.5]) b(x,10,76,1,2,24,[.72,.53,.24]);
    for(const z of [64.5,87.5]) b(-3,10,z,18,2,1,[.72,.53,.24]);
    for(let row=0;row<5;row++) for(let column=0;column<4;column++) {
      apple(-9.5+column*4.3,10.6,67+row*4.4,row*4+column);
    }
    for(let row=0;row<3;row++) for(let column=0;column<3;column++) {
      apple(-7.3+column*4.3,13.1,69.2+row*4.4,30+row*3+column);
    }
    // Low ice cream chest with four wire baskets and sliding lid frames.
    // Its hollow interior leaves the packages visible from above.
    const freezer=this.freezer;
    const fx=freezer.x,fz=freezer.z;
    b(fx,0,fz,20,3,72,[.79,.84,.86]);
    for(const x of [fx-10,fx+10]) {
      b(x,3,fz,1.5,10,72,[.92,.95,.96]);
      b(x,13,fz,2,1,74,[.49,.61,.65]);
    }
    for(const z of [fz-36,fz+36]) {
      b(fx,3,z,20,10,1.5,[.92,.95,.96]);
      b(fx,13,z,22,1,2,[.49,.61,.65]);
    }
    b(fx+(fx<0 ? 10.8 : -10.8),4,fz, .5,6,68,[.02,.4,.66]);
    const frozen=['aino-maitosuklaa','pingviini-suklaatuutit','eskimo-vanilja','pingviini-vanilja'];
    for(let section=0;section<4;section++) {
      const z=fz-27+section*18;
      b(fx,4,z,18,.5,16,[.67,.78,.8]);
      for(const offset of [-8,8]) b(fx,4,z+offset,18,7,.3,[.68,.76,.78]);
      for(let wire=-7;wire<=7;wire+=2) b(fx+wire,4,z, .2,.5,16,[.85,.9,.91]);
      for(const x of [fx-4.5,fx+4.5]) for(const dz of [-4,4]) {
        const id=frozen[section],product=this.products.find(p=>p.id===id);
        b(x,5,z+dz,8,5,7,product.color);
        productFace(id,[[x-6000-4,10.12,z+dz+3.5],[x-6000+4,10.12,z+dz+3.5],
          [x-6000+4,10.12,z+dz-3.5],[x-6000-4,10.12,z+dz-3.5]]);
      }
    }
    for(const z of [fz-18,fz,fz+18]) b(fx,13.5,z,20,.5,.7,[.68,.8,.83]);
    for(const z of [fz-17,fz+17]) b(fx-6,14,z,3,.7,.8,[.22,.29,.32]);
    // Cold glass highlights along the edges avoid obscuring the stock below.
    for(const x of [fx-8,fx+8]) b(x,13.5,fz,.4,.25,68,[.77,.93,.97]);
    // Entrance and checkout at the near end.
    b(35,0,149,35,34,1,[.18,.31,.34]);
    b(-8,0,149,24,34,1,[.18,.31,.34]);
    for(const [x,width] of [[35,35],[-8,24]]) {
      for(const side of [-1,1]) label('entrance-glass',x+side*width/4,1,148.35,width/2-.7,32,-1);
      for(const dx of [-width/2,0,width/2]) b(x+dx,0,148.2,.5,34,.6,[.63,.65,.62]);
      for(const h of [0,11,33.5]) b(x,h,148.2,width,.5,.6,[.63,.65,.62]);
      b(x,21,148,.2,7,.5,[.78,.83,.81]);
      b(x,11,147.9,width,.8,.3,[.94,.77,.14]);
      label(x===35 ? 'welcome' : 'exit',x,35,147.8,width,3,-1);
    }
    label('sale',68,35,148,24,7,-1);
    // Ribbed entrance mat and nested red hand baskets beside the door.
    b(35,.035,137,26,.06,18,[.19,.21,.2]);
    for(let z=128.5;z<146;z+=.65) b(35,.095,z,25,.025,.12,[.29,.31,.29]);
    b(65,0,124,10,2,12,[.16,.18,.17]);
    for(let level=0;level<8;level++) {
      const h=2+level*.8;
      for(const x of [60.5,69.5]) b(x,h,124,.4,2,11,[.73,.035,.065]);
      for(const z of [118.5,129.5]) b(65,h,z,9,.5,.4,[.83,.04,.07]);
    }
    for(const x of [61.5,68.5]) b(x,8,124,.3,2,9,[.15,.17,.16]);
    this.buildCheckout({b,q,artwork,cashierFace,cashierGeometry});
    // Compact produce stand immediately ahead of the entrance.
    const bx=-3,bz=102;
    b(bx,0,bz,18,9,24,[.57,.39,.16]);
    for(const x of [bx-9,bx+9]) b(x,9,bz,1,2,24,[.78,.61,.3]);
    q([bx-9,9,bz+12],[bx+9,9,bz+12],[bx+9,13,bz-12],[bx-9,13,bz-12],[.06,.36,.13]);
    b(bx,13,bz-12,18,7,1,[.05,.23,.1]);
    const letters={B:['110','101','110','101','110'],A:['010','101','111','101','101'],
      N:['101','111','111','111','101'],I:['111','010','010','010','111'],T:['111','010','010','010','010']};
    [...'BANAANIT'].forEach((letter,i)=>letters[letter].forEach((row,r)=>[...row].forEach((bit,c)=>{
      if(bit==='1') b(bx-8+i*2+c*.45,18.5-r*.7,bz-11.4,.4,.55,.3,[1,.95,.75]);
    })));
    for(let row=0;row<3;row++) for(let column=0;column<2;column++) {
      const cx=bx-4+column*8,cz=bz-8+row*8;
      for(let finger=0;finger<4;finger++) {
        const x=cx+(finger-1.5)*1.2;
        const point=(segment,ring)=>{
          const t=segment/8,a=ring*Math.PI/3;
          const radius=.5*Math.sin(Math.PI*t)+.12;
          return [x+Math.sin(t*Math.PI)*1.2+Math.cos(a)*radius,
            10+(bz+12-cz)/6+Math.sin(t*Math.PI)*.5+Math.sin(a)*radius,
            cz+(t-.5)*5];
        };
        for(let segment=0;segment<8;segment++) for(let ring=0;ring<6;ring++) {
          q(point(segment,ring),point(segment+1,ring),point(segment+1,ring+1),point(segment,ring+1),
            segment===0 || segment===7 ? [.38,.29,.06] : [.98,.77+ring*.018,.06]);
        }
      }
    }
    for(const side of [-1,1]) stock('banaani',bx+side*8,3,bz,side);
  },
  buildCheckout({b:box,q:quad,artwork,cashierFace,cashierGeometry=build=>build()}) {
    // Rotate the whole station together: belt toward -Z, packing toward +Z.
    // The customer follows the return aisle, then walks along the east side.
    const {x,z}=this.checkout;
    const point=([px,y,pz])=>[x-(pz-119),y,z+(px+50)];
    const worldPoint=([px,y,pz])=>{const p=point([px+6000,y,pz]);return [p[0]-6000,p[1],p[2]];};
    const b=(px,y,pz,w,h,d,color)=>box(...point([px,y,pz]),d,h,w,color);
    const q=(a,c,d,e,color)=>quad(...[a,c,d,e].map(point),color);
    const face=(id,points)=>artwork(id,points.map(worldPoint));
    const label=(id,px,y,pz,w,h)=>face(id,[[px-6000+w/2,y,pz],[px-6000-w/2,y,pz],
      [px-6000-w/2,y+h,pz],[px-6000+w/2,y+h,pz]]);
    b(-50,0,119,45,12,18,[.74,.74,.68]);
    b(-50,12,119,46,1,19,[.17,.19,.18]);
    // Conveyor, stainless scanner surround, packing well and bag hooks.
    b(-62,13.02,119,18,.15,13,[.065,.075,.07]);
    for(let x=-70;x<-53;x+=1.7) b(x,13.18,119,.06,.025,12,[.13,.14,.13]);
    for(const z of [112.2,125.8]) b(-60,13, z,23,.35,.6,[.69,.72,.71]);
    b(-45,13.03,119,8,.2,11,[.62,.65,.64]);
    b(-45,13.24,119,5,.05,5,[.08,.15,.17]);
    b(-45,13.3,119,3,.025,.1,[.87,.055,.04]);
    b(-35,13.02,122,10,.15,9,[.57,.6,.58]);
    b(-35,13.17,126,10,1,.4,[.7,.72,.7]);
    for(const x of [-35,-30]) {
      b(x,4,109.8,2,.3,2,[.69,.72,.7]);
      b(x,2,110,2,.2,1,[.86,.8,.63]);
    }
    b(-53,13,119,8,7,4,[.12,.14,.13]);
    b(-53,16,116.8,6,3,.25,[.04,.065,.06]);
    label('till',-53,16.2,116.6,5.7,2.5);
    // Customer-facing payment terminal and a framed checkout sign.
    b(-31,13,116,3,2,4,[.22,.26,.25]);
    b(-31,15,116,3,3,1,[.10,.13,.13]);
    b(-31,15.5,115.4,2.3,1.7,.2,[.42,.74,.64]);
    b(-50,35,136,42,5,1,[.16,.34,.28]);
    face('checkout',[[-6000-30.5,35.5,135.35],[-6000-69.5,35.5,135.35],
      [-6000-69.5,39.5,135.35],[-6000-30.5,39.5,135.35]]);
    // Local cashier coordinates rotate with the counter to face the customer lane.
    cashierGeometry(()=>{
      const trousers=[.12,.14,.15];
      for(const x of [-54,-46]) {
        b(x,0,133,4,11,5,trousers);
        b(x,0,131,5,2,8,[.08,.09,.08]);
      }
      this.buildCashier({b,q,cashierFace:(points,uv)=>cashierFace(points.map(worldPoint),uv)});
    });
  },
  buildCashier({b,q,cashierFace}) {
    const skin=[.72,.53,.43],shirt=[.48,.51,.68],hair=[.39,.26,.17];
    // The original reference is sampled directly: facial expression, hairline,
    // narrow blue stripes, open collar and chest pocket retain their detail.
    const textured=(points,pixels)=>cashierFace(
      points.map(([x,y,z])=>[x-6000,y,z]),pixels.map(([u,v])=>[u/468,v/312]));
    const shirtRows=[
      {y:25,left:-1.8,right:1.8,v:185,u0:251,u1:322,z:130},
      {y:23.5,left:-5.9,right:5.9,v:205,u0:202,u1:379,z:129.5},
      {y:21,left:-8,right:8,v:231,u0:175,u1:421,z:129.4},
      {y:16,left:-7.1,right:7.1,v:270,u0:167,u1:433,z:129.1},
      {y:11,left:-6.5,right:6.5,v:311,u0:164,u1:436,z:129.6}
    ];
    for(let row=0;row<shirtRows.length-1;row++) {
      const a=shirtRows[row],c=shirtRows[row+1];
      for(let column=0;column<12;column++) {
        const at=(r,t)=>[-50-r.left-(r.right-r.left)*t,r.y,
          r.z+.65*(2*t-1)**2];
        const uv=(r,t)=>[r.u0+(r.u1-r.u0)*t,r.v];
        const t=column/12,s=(column+1)/12;
        textured([at(c,t),at(c,s),at(a,s),at(a,t)],
          [uv(c,t),uv(c,s),uv(a,s),uv(a,t)]);
      }
      for(const side of ['left','right'])
        q([-50-a[side],a.y,a.z+.65],[-50-c[side],c.y,c.z+.65],
          [-50-c[side],c.y,136],[-50-a[side],a.y,136],shirt);
      q([-50+a.left,a.y,136],[-50+a.right,a.y,136],
        [-50+c.right,c.y,136],[-50+c.left,c.y,136],shirt);
    }
    // Rounded sleeves, forearms and hands resting beside the till.
    const limb=(start,end,radius,color)=>{
      const delta=end.map((v,i)=>v-start[i]),length=Math.hypot(...delta);
      const axis=delta.map(v=>v/length),right=[axis[1],-axis[0],0];
      const rightLength=Math.hypot(...right)||1;
      for(let i=0;i<3;i++) right[i]/=rightLength;
      const up=[axis[1]*right[2]-axis[2]*right[1],axis[2]*right[0]-axis[0]*right[2],axis[0]*right[1]-axis[1]*right[0]];
      const point=(p,angle,r)=>p.map((v,i)=>v+r*(right[i]*Math.cos(angle)+up[i]*Math.sin(angle)));
      for(let i=0;i<16;i++) {
        const a=i*Math.PI/8,c=(i+1)*Math.PI/8;
        q(point(start,a,radius),point(end,a,radius*.8),point(end,c,radius*.8),point(start,c,radius),color);
        q(end,point(end,a,radius*.8),point(end,c,radius*.8),end,color);
      }
    };
    for(const side of [-1,1]) {
      const shoulder=[-50+side*7,21.3,132.5],elbow=[-50+side*8.3,15,131];
      limb(shoulder,elbow,2.1,shirt);
      // Thin white pinstripes follow the sleeve length, separated from its skin.
      for(let stripe=0;stripe<12;stripe++) {
        const a=stripe*Math.PI/6;
        const offset=[Math.cos(a)*2.12,0,Math.sin(a)*2.12];
        limb(shoulder.map((v,i)=>v+offset[i]),elbow.map((v,i)=>v+offset[i]*.8),.035,[.76,.77,.84]);
      }
      limb(elbow,[-50+side*7.7,14.1,125.5],1.35,skin);
      limb([-50+side*7.7,14.1,125.5],[-50+side*6.2,14,123.7],1.15,skin);
      for(let finger=0;finger<4;finger++) {
        const x=-50+side*6.2+(finger-1.5)*.42;
        limb([x,14,123.6],[x,13.9,122.5-Math.sin((finger+1)*Math.PI/5)*.4],.24,skin);
      }
    }
    limb([-50,24,133],[-50,27,133],1.5,skin);
    const headRows=[
      [30,281,301],[34,273,310],[37,264,315],[41,257,320],[48,253,324],[54,249,328],[63,246,331],
      [81,242,334],[106,241,331],[127,246,325],[148,250,324],
      [169,259,317],[184,269,310]
    ];
    const headPoint=(row,t)=>{
      const [v,u0,u1]=row,u=u0+(u1-u0)*t;
      // Cheeks wrap toward the ears; nose and brow project gently forward.
      const nose=.45*Math.exp(-(((u-280)/12)**2)-((v-133)/21)**2);
      const crownScale=v===30 ? 1.8 : v===34 ? 1.2 : 1;
      const center=(u0+u1)/2;
      return [-50-(center+(u-center)*crownScale-287.5)*.075,
        35-(v-30)*9/154-(v===30 ? .28*(2*t-1)**2 : 0),
        129.1+1.6*(2*t-1)**2-nose];
    };
    for(let row=0;row<headRows.length-1;row++) {
      const a=headRows[row],c=headRows[row+1];
      const uv=(r,t)=>[r[1]+(r[2]-r[1])*t,r[0]];
      for(let column=0;column<12;column++) {
        const t=column/12,s=(column+1)/12;
        textured([headPoint(c,t),headPoint(c,s),headPoint(a,s),headPoint(a,t)],
          [uv(c,t),uv(c,s),uv(a,s),uv(a,t)]);
      }
      // Wrap short reddish-brown hair around the crown and receding temples.
      for(let segment=0;segment<16;segment++) {
        const point=(r,t)=>{
          const v=headPoint(r,t<.5?0:1),angle=Math.PI*t;
          const left=headPoint(r,0),right=headPoint(r,1);
          return [(left[0]+right[0])/2-(right[0]-left[0])/2*Math.cos(angle),
            v[1],130.7+4.2*Math.sin(angle)];
        };
        const t=segment/16,s=(segment+1)/16;
        const color=a[0]<81 || (a[0]<148 && segment>=3 && segment<=12) ?
          hair.map(v=>v*(.92+.08*Math.sin(segment*2.3))) : skin;
        q(point(a,t),point(c,t),point(c,s),point(a,s),color);
      }
    }
    const chin=headRows[headRows.length-1];
    for(let column=0;column<12;column++) {
      const t=column/12,s=(column+1)/12;
      const lower=t=>[-48.4-3.2*t,24.5,130+.65*(2*t-1)**2];
      const uv=(t,v)=>[269+41*t,v];
      textured([lower(t),lower(s),headPoint(chin,s),headPoint(chin,t)],
        [uv(t,205),uv(s,205),uv(s,184),uv(t,184)]);
    }
    for(const side of [-1,1]) {
      limb([-50+side*3.3,29.6,131],[-50+side*3.5,31,131],.48,skin);
    }
    // Close the crown and chin so oblique views retain a solid silhouette.
    for(const row of [headRows[0],headRows[headRows.length-1]]) {
      const left=headPoint(row,0),right=headPoint(row,1);
      q(left,right,[right[0],right[1],133],[left[0],left[1],133],row[0]===30?hair:skin);
    }
  },
  shelves: [
    {x:-3,z:30,products:['riisi','pasta','kaurahiutaleet','kahvi','tee','tomaattimurska','hernekeitto','nuudelit']},
    {x:-3,z:-30,products:['hartwall-vichy','coca-cola','ekstroms-vadelma','marli-juissi','megaforce','karjala'],
      reverseProducts:['riisi','pasta','kaurahiutaleet','kahvi','tee','tomaattimurska','hernekeitto','nuudelit']},
    {x:-3,z:-90,products:['talouspaperi','astianpesuaine']}
  ],
  dairyBays: Array.from({length:9},(_,i)=>({x:-66+i*15})),
  freezer: {x:-79,z:-85,width:22,depth:74},
  checkout: {x:-50,z:115,width:19,depth:46,cashierX:-64,cashierZ:115},
  canWalk(x,z) {
    if(x<-82 || x>60 || z<-140 || z>139) return false;
    if(x<-75 && !(Math.abs(z)<25 || Math.abs(z-81)<23)) return false;
    if(x<-68 && Math.abs(z-81)<15) return false;
    if(z<-135 || (z>135 && (x<-22 || x>60))) return false;
    // Include player clearance around the countertop and cashier.
    const checkout=this.checkout;
    if(Math.abs(x-checkout.x)<checkout.width/2+4 && Math.abs(z-checkout.z)<checkout.depth/2+4) return false;
    if(Math.abs(x-checkout.cashierX)<10 && Math.abs(z-checkout.cashierZ)<13) return false;
    if(Math.abs(x-this.freezer.x)<this.freezer.width/2+4 &&
      Math.abs(z-this.freezer.z)<this.freezer.depth/2+4) return false;
    if(Math.abs(x+3)<13 && Math.abs(z-102)<16) return false;
    if(Math.abs(x+3)<13 && Math.abs(z-76)<16) return false;
    return !(Math.abs(x+3)<40 && z>-125 && z<64);
  }
};
