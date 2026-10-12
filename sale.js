/* Sale Skinnarila, stylised from the supplied exterior and interior photos. */
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
  // Street-facing corner entrance; interaction point sits in front of the threshold.
  entrance: window.LPRCampus.world(575.2,446.4),
  buildExterior({box,quad,materialBox=box,artwork=()=>{}}) {
    const p=window.LPRCampus.world(550,462), x=p.x,z=p.y;
    const white=[.94,.95,.94],metal=[.27,.32,.34];
    materialBox(x,0,z,300,65,100,white,'concrete');
    box(x,65,z,304,2,104,[.2,.25,.27]);
    box(x,0,z-50.8,300,2,1,[.48,.51,.51]);
    // Fine square panel joints, including the return wall.
    for(let dx=-150;dx<=100;dx+=25) box(x+dx,2,z-50.7,.35,63,.35,[.55,.6,.62]);
    for(const h of [18,38,58]) box(x-25,h,z-50.7,250,.35,.35,[.55,.6,.62]);
    for(let dz=-50;dz<=50;dz+=25) box(x+150.4,0,z+dz,.35,65,.35,[.55,.6,.62]);
    for(const h of [18,38,58]) box(x+150.4,h,z, .35,.35,100,[.55,.6,.62]);
    // Full-height glazed corner, divided by charcoal aluminium mullions.
    materialBox(x+126,0,z-51,47,64,1,[.32,.48,.53],'glass');
    materialBox(x+150.6,0,z-30,1,64,40,[.32,.48,.53],'glass');
    for(const dx of [102,125,149]) box(x+dx,0,z-52,1.1,65,1,metal);
    for(const h of [0,20,42,64]) box(x+126,h,z-52,48,1,1,metal);
    for(const h of [20,42,64]) box(x+151,h,z-30,1,1,40,metal);
    // Dark recessed opening and warm shop light behind the open door.
    box(x+126,0,z-52.1,20,40,.5,[.055,.075,.065]);
    box(x+126,34,z-52.5,17,1,.3,[1,.89,.52]);
    for(const dx of [115,137]) box(x+dx,0,z-53,1.3,42,1.3,metal);
    box(x+126,41,z-53,23,1.5,1.5,metal);
    const hinge=x+137, tip=x+146, doorZ=z-69;
    quad([hinge,2,z-53],[tip,2,doorZ],[tip,40,doorZ],[hinge,40,z-53],[.2,.34,.37]);
    for(const h of [2,15,40]) quad([hinge,h,z-53.2],[tip,h,doorZ-.2],[tip,h+1,doorZ-.2],[hinge,h+1,z-53.2],metal);
    box(tip,2,doorZ,1,39,1,metal);
    box(tip-1,17,doorZ-1,.65,8,.65,[.78,.81,.8]);
    box(x+126,.1,z-64,27,.6,22,[.15,.17,.17]);
    box(x+126,.8,z-76,29,.5,3,[1,.76,.08]);
    // Continuous framed advertisement strip below the projecting round sign.
    box(x-25,21,z-51.5,246,18,1.5,metal);
    for(let i=0;i<10;i++) {
      const cx=x+84-i*24;
      box(cx,22,z-52.5,22,16,.6,i%3===2 ? [.21,.48,.26] : [.99,.76,.16]);
      artwork('poster'+i,[[cx+11,22,z-53],[cx-11,22,z-53],[cx-11,38,z-53],[cx+11,38,z-53]]);
    }
    const cx=x+85,cy=49,front=z-56;
    box(cx,48,z-53,3,3,6,metal);
    for(let i=0;i<64;i++) {
      const a=i*Math.PI/32,b=(i+1)*Math.PI/32;
      quad([cx,cy,front],[cx+Math.cos(a)*13,cy+Math.sin(a)*13,front],
        [cx+Math.cos(b)*13,cy+Math.sin(b)*13,front],[cx,cy,front],[.88,.015,.065]);
    }
    artwork('sign',[[cx+13,cy-13,front-.1],[cx-13,cy-13,front-.1],[cx-13,cy+13,front-.1],[cx+13,cy+13,front-.1]]);
    // Paved approach, retaining curb and two continuous steel handrails.
    materialBox(x,0,z-67,300,.3,29,[.52,.54,.52],'concrete');
    box(x-12,0,z-81,230,3,2,[.83,.85,.82]);
    for(const railZ of [z-79,z-58]) {
      for(let dx=-124;dx<=94;dx+=22) box(x+dx,1,railZ,.65,11,.65,[.59,.65,.67]);
      for(const h of [7,12]) box(x-15,h,railZ,220,.65,.65,[.65,.7,.72]);
    }
  },
  buildInterior({box,quad=()=>{},productFace=()=>{},artwork=()=>{}}) {
    const b=(x,y,z,w,h,d,c)=>box(-6000+x,y,z,w,h,d,c);
    const q=(a,c,d,e,color)=>quad(...[a,c,d,e].map(p=>[p[0]-6000,p[1],p[2]]),color);
    const label=(id,x,y,z,w,h)=>artwork(id,[[x-6000-w/2,y,z],[x-6000+w/2,y,z],[x-6000+w/2,y+h,z],[x-6000-w/2,y+h,z]]);
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
      b(x,y,z,2.6,h,w,product.color);
      // Front artwork faces the aisle independently on either side of a shelf.
      const faceX=-6000+x+side*1.32;
      productFace(id,[[faceX,y,z+side*w/2],[faceX,y,z-side*w/2],
        [faceX,y+h,z-side*w/2],[faceX,y+h,z+side*w/2]]);
    };
    const stockZ=(id,x,y,z,side)=>{
      if(id==='omena') { apple(x,y,z,x+z); return; }
      const product=this.products.find(p=>p.id===id),w=product.width,h=product.height;
      if(id==='remix' || product.candyLabel) { candyBag(product,x,y,z,side,'z'); return; }
      if(product.shape==='tub') {
        const radius=w/2,point=(a,v,r)=>[x+Math.cos(a)*r,y+v,z+Math.sin(a)*r];
        for(let i=0;i<16;i++) {
          const a=i*Math.PI/8,c=(i+1)*Math.PI/8;
          q(point(a,0,radius*.8),point(c,0,radius*.8),point(c,h-.3,radius),point(a,h-.3,radius),[.92,.94,.92]);
          q([x,y+h,z],point(a,h,radius*1.05),point(c,h,radius*1.05),[x,y+h,z],product.color);
        }
      } else {
        b(x,y,z,w,h,2.6,product.dairy ? [.93,.94,.9] : product.color);
        if(product.dairy && id!=='voi' && id!=='juusto') {
          q([x-w/2,y+h,z-1.3],[x+w/2,y+h,z-1.3],[x+w/2,y+h+.7,z],[x-w/2,y+h+.7,z],[.84,.86,.83]);
          q([x-w/2,y+h,z+1.3],[x+w/2,y+h,z+1.3],[x+w/2,y+h+.7,z],[x-w/2,y+h+.7,z],product.color);
          b(x,y+h+.7,z,.9,.25,.7,product.color);
        }
      }
      // Tub labels must sit beyond the widest curved wall, not inside it.
      const faceZ=z+side*(product.shape==='tub' ? w/2+.04 : 1.32);
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
      const tone=.68+.025*Math.sin(ix*17+iz*31);
      b(-85+ix*10,-.03,-145+iz*10,9.85,.05,9.85,[tone,tone+.015,tone]);
    }
    for(const x of [-88,88]) b(x,0,0,.7,2,298,[.28,.31,.29]);
    b(0,45,0,180,2,300,[.28,.3,.29]);
    for(const x of [-90,90]) b(x,0,0,2,45,300,[.7,.71,.67]);
    for(const z of [-150,150]) b(0,0,z,180,45,2,[.7,.71,.67]);
    // Suspended ceiling grid, framed diffusers and warm perimeter trim.
    for(let x=-90;x<=90;x+=15) b(x,44,0,.3,.3,298,[.48,.51,.49]);
    for(let z=-150;z<=150;z+=15) b(0,44,z,178,.3,.3,[.48,.51,.49]);
    for(const x of [-88,88]) b(x,35,0,1,4,298,[.96,.75,.12]);
    // Ceiling panels and long bright strip lights.
    for(let z=-130;z<150;z+=35) {
      b(-20,43,z,110,1,28,[.72,.73,.67]);
      for(const x of [-55,35]) {
        b(x,42,z,5,1,29,[.64,.68,.68]);
        b(x,41.8,z,3.5,.2,27,[1,1,.96]);
      }
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
        for(let item=0;item<4;item++) stock(chilled[(item+Math.floor((z+34)/23))%chilled.length],69,h+1,z+3+item*4.8,-1);
      }
      b(67,1,z+11,.5,1,22,[.65,.71,.7]);
      b(67,34,z+11,.5,1,22,[.65,.71,.7]);
    }
    // One uninterrupted, wide shelving run leaves two narrow wall-side aisles.
    b(-3,0,-30,70,29,180,[.23,.25,.23]);
    for(const shelf of this.shelves) {
      const {x,z,products}=shelf;
      for(const side of [-1,1]) {
        if(z===30 && side===-1) { candyRack(x-35,z,-1,'x',60,10); continue; }
        for(let h=2;h<29;h+=7) {
          b(x+side*27,h,z,18,1,60,[.84,.86,.82]);
          b(x+side*36,h,z,.5,1,60,[.38,.42,.4]);
          for(let priceZ=z-26;priceZ<z+30;priceZ+=5.8) {
            const faceX=-6000+x+side*36.3;
            artwork('price',[[faceX,h,priceZ+side*2],[faceX,h,priceZ-side*2],
              [faceX,h+.85,priceZ-side*2],[faceX,h+.85,priceZ+side*2]]);
          }
          const facingProducts=side===1 && shelf.reverseProducts ? shelf.reverseProducts : products;
          for(let item=0;item<12;item++) {
            const id=side===1 && z===-30 && item<2 ? (item===0 ? 'doris' : 'jaffa') :
              facingProducts[Math.floor(item*facingProducts.length/12)];
            stock(id,x+side*35,h+1,z-26+item*4.8,side);
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
        for(let column=0;column<4;column++) {
          const px=x-4.5+column*3;
          // A second row adds depth behind the aisle-facing packages.
          stockZ(id,px,h+.6,z-.7,1);
          stockZ(id,px,h+.6,z+3,1);
        }
        label('price',x,h,z+5.8,6,.75);
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
        productFace(id,[[x-6000-4,10.03,z+dz+3.5],[x-6000+4,10.03,z+dz+3.5],
          [x-6000+4,10.03,z+dz-3.5],[x-6000-4,10.03,z+dz-3.5]]);
      }
    }
    for(const z of [fz-18,fz,fz+18]) b(fx,13.5,z,20,.5,.7,[.68,.8,.83]);
    for(const z of [fz-17,fz+17]) b(fx-6,14,z,3,.7,.8,[.22,.29,.32]);
    // Cold glass highlights along the edges avoid obscuring the stock below.
    for(const x of [fx-8,fx+8]) b(x,13.5,fz,.4,.25,68,[.77,.93,.97]);
    // Entrance and checkout at the near end.
    b(35,0,149,35,34,1,[.18,.31,.34]);
    b(-8,0,149,24,34,1,[.18,.31,.34]);
    b(-50,0,119,45,12,18,[.74,.74,.68]);
    b(-50,12,119,46,1,19,[.17,.19,.18]);
    b(-53,13,119,8,7,4,[.12,.14,.13]);
    // Cashier behind the counter, facing the customer aisle (-Z).
    const skin=[.83,.62,.46], uniform=[.12,.48,.28], trousers=[.12,.14,.15];
    for(const x of [-54,-46]) {
      b(x,0,133,4,11,5,trousers);
      b(x,0,131,5,2,8,[.08,.09,.08]);
    }
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
    b(-50,11,133,12,13,7,uniform);
    for(const x of [-58,-42]) {
      b(x,15,132,4,8,5,uniform);
      b(x,13,128,4,3,8,skin);
    }
    b(-50,24,133,3,2,3,skin);
    b(-50,26,133,8,8,7,skin);
    b(-50,33,133,9,2,8,[.23,.15,.1]);
    for(const x of [-52,-48]) b(x,30,129.4,1,1,.4,[.08,.08,.07]);
    b(-50,27.5,129.4,3,.5,.4,[.45,.2,.17]);
    b(-47,20,129.4,3,2,.4,[.96,.96,.88]);
  },
  shelves: [
    {x:-3,z:30,products:['riisi','pasta','kaurahiutaleet','kahvi','tee','tomaattimurska','hernekeitto','nuudelit']},
    {x:-3,z:-30,products:['hartwall-vichy','coca-cola','ekstroms-vadelma','marli-juissi','megaforce','karjala'],
      reverseProducts:['riisi','pasta','kaurahiutaleet','kahvi','tee','tomaattimurska','hernekeitto','nuudelit']},
    {x:-3,z:-90,products:['talouspaperi','astianpesuaine']}
  ],
  dairyBays: Array.from({length:9},(_,i)=>({x:-66+i*15})),
  freezer: {x:-79,z:-85,width:22,depth:74},
  canWalk(x,z) {
    if(x<-82 || x>60 || z<-140 || z>139) return false;
    if(x<-75 && !(Math.abs(z)<25 || Math.abs(z-81)<23)) return false;
    if(x<-68 && Math.abs(z-81)<15) return false;
    if(z<-135 || (z>135 && (x<-22 || x>60))) return false;
    // Include player clearance around the countertop and cashier.
    if(Math.abs(x+50)<28 && Math.abs(z-119)<15) return false;
    if(Math.abs(x+50)<13 && Math.abs(z-133)<10) return false;
    if(Math.abs(x-this.freezer.x)<this.freezer.width/2+4 &&
      Math.abs(z-this.freezer.z)<this.freezer.depth/2+4) return false;
    if(Math.abs(x+3)<13 && Math.abs(z-102)<16) return false;
    if(Math.abs(x+3)<13 && Math.abs(z-76)<16) return false;
    return !(Math.abs(x+3)<40 && z>-125 && z<64);
  }
};
