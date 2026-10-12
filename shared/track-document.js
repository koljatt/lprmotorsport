(function(root) {
  'use strict';
  const types={
    cone:{name:'Kartio',w:6,d:6,h:8,color:[1,.4,.05]},
    barrier:{name:'Suojakaide',w:40,d:8,h:12,color:[.48,.52,.54]},
    tyreWall:{name:'Rengasvalli',w:50,d:8,h:8,color:[.075,.085,.09]},
    kerb:{name:'Korkeuserä',w:20,d:8,h:24,color:[.63,.61,.5]},
    building:{name:'Rakennus',w:100,d:80,h:60,color:[.58,.57,.51]},
    asphalt:{name:'Asfaltti',w:120,d:80,h:0,color:[.14,.16,.17]},
    tree:{name:'Puu',w:16,d:16,h:45,color:[.14,.42,.18]},
    box:{name:'Laatikko',w:15,d:15,h:15,color:[.55,.38,.2]},
    lake:{name:'Järvi',w:200,d:180,h:0,color:[.15,.5,.8]},
    pier:{name:'Laituri',w:80,d:14,h:8,color:[.68,.49,.24]}
  };
  function validate(doc) {
    if(doc?.version!==1 || !Array.isArray(doc.objects) || doc.objects.length>1000) throw Error('Virheellinen rataelementtitiedosto (versio 1, enintään 1000 elementtiä).');
    return doc.objects.map((o,i)=>{
      if(!o || !Object.hasOwn(types,o.type) || !['x','y','angle','scale'].every(k=>Number.isFinite(o[k])) || o.scale<.2 || o.scale>5 || o.x<0 || o.x>5200 || o.y<0 || o.y>4400) throw Error(`Elementin ${i+1} tiedot eivät kelpaa.`);
      return {type:o.type,x:o.x,y:o.y,angle:o.angle,scale:o.scale};
    });
  }
  const api={types,validate};
  if(typeof module==='object') module.exports=api;
  else root.LPRTrackDocument=api;
})(typeof window==='object'?window:globalThis);
