// Uncached reference from d4db5c7. Injected into campus.js by the comparison harness.
module.exports=function carCollisionParts(state) {
    const damage=state.damage || 0,impactSide=state.impactSide || .3;
    const parts=bodyParts.map(part=>part.map(([f,s])=>{
      f*=spec.bodyLengthScale;
      const crush=Math.max(0,f-2)*damage;
      return [f-crush*.55,s+impactSide*crush*.25];
    }));
    for(const axle of [0,1]) for(const side of [-1,1]) {
      const angle=axle===0?(state.steerAngle || 0)+side*damage*.65:0,c=Math.cos(angle),s=Math.sin(angle);
      const crush=axle===0?6.1*damage:0;
      const f=(axle===0?carGeometry.wheelForward:carGeometry.wheelRear)-crush*.55,lateral=side*carGeometry.wheelSide+impactSide*crush*.25;
      const profile=[...carGeometry.tyreProfile.map(([axial,r])=>[r,axial]),
        ...carGeometry.tyreProfile.slice().reverse().map(([axial,r])=>[-r,axial])];
      // Raised sidewall mouldings also belong to the visible wheel.
      const band=carGeometry.rimRadius+(1.88-1.12)/1.18*(carGeometry.tyreRadius-carGeometry.rimRadius);
      for(const axial of [-carGeometry.tyreHalfWidth,carGeometry.tyreHalfWidth]) profile.push([band,axial],[-band,axial]);
      parts.push(convexHull(profile).map(([x,y])=>[f+x*c-y*s,lateral+x*s+y*c]));
    }
    return parts;
  };
