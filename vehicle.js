/* Simplified dynamic bicycle model. Distances and speeds inside this class are SI units. */
window.VehicleDynamics = (() => {
// Shared physics must give bit-identical results in the browser and on the verification server.
const Math = window.LPRMath || globalThis.Math;
return class VehicleDynamics {
  constructor() {
    const spec = window.LPRVehicleSpec;
    this.parameters = {
      metresPerWorldUnit: spec.metresPerWorldUnit,
      mass: spec.mass,           // includes the 80 kg driver
      wheelbase: spec.wheelbase,
      frontAxle: spec.frontAxle, rearAxle: spec.rearAxle,
      trackWidth: spec.trackWidth,
      yawInertia: 120 * (spec.mass / 275) * Math.pow(spec.wheelbase / 1.63, 2), // estimated
      centreOfMassHeight: spec.centreOfMassHeight, // unmeasured, retained estimate
      frontCorneringStiffness: 13000 * Math.pow(spec.mass / 275, .94), // N/rad, combined front axle
      rearCorneringStiffness: 14000 * Math.pow(spec.mass / 275, .94),  // N/rad, combined rear axle
      roadGrip: 1.55,
      grassGrip: 0.58,
      drivetrain: spec.drivetrain, // two driven rear wheels; axle forces combined below
      motorTorque: spec.motorTorque, // Nm at the motor, before final drive
      finalDriveRatio: spec.finalDriveRatio, // unconfirmed estimate
      drivetrainEfficiency: spec.drivetrainEfficiency, // unconfirmed estimate
      peakDriveForce: spec.motorTorque * spec.finalDriveRatio * spec.drivetrainEfficiency / (spec.tyreDiameter / 2), // N at tyres
      peakPower: Math.min(spec.motorPower, spec.maxBatteryPower * spec.motorInverterEfficiency) * spec.drivetrainEfficiency, // W at tyres, electrical input capped first
      maxSpeed: spec.maxMotorRpm * 2 * Math.PI / 60 / spec.finalDriveRatio * (spec.tyreDiameter / 2), // m/s, motor rpm limit
      peakBrakeForce: 4500,     // N, tire grip limits the delivered braking force
      coastBrakeForce: 420,     // N, game-tuned lift-off braking with stable axle distribution
      tractionControlEnabled: true,
      maxRoadWheelAngle: spec.maxRoadWheelAngle, // equivalent bicycle angle, rad
      assistedSteeringGrip: 0.9, // fraction of available grip requested at full assisted steering
      dragArea: 0.75,           // CdA, m²
      rollingResistance: 45,    // N
      suspension: {
        type: spec.suspensionType, // pushrod linkage; forces below are wheel-equivalent
        unsprungMass: 8,        // kg per corner; provisional values throughout
        wheelRate: 28000,       // N/m at the wheel (includes motion ratio)
        bumpDamping: 900, reboundDamping: 1400, // N s/m at the wheel
        tyreRate: 160000, tyreDamping: 120,
        antiRollRate: 4500,     // N/m of left/right travel difference
        pitchInertia: 65 * (spec.mass / 275) * Math.pow(spec.wheelbase / 1.63, 2),
        rollInertia: 38 * (spec.mass / 275) * Math.pow(spec.trackWidth / 1.44, 2), // kg m²
        bumpTravel: .035, droopTravel: .040, bumpStopRate: 180000,
        motionRatio: .70
      }
    };
  }

  kerbHeight(distance, along, road) {
    const width=road.kerbOuter-road.halfWidth;
    const offset=distance-road.halfWidth;
    if(offset<=0 || offset>=width) return 0;
    // SI: 6.5 cm crown with 1.2 cm ribs every 45 cm. Bevel the edges
    // so entering the kerb loads the tyre rather than teleporting the body.
    const bevel=Math.min(1,offset/.65,(width-offset)/.65);
    const smooth=bevel*bevel*(3-2*bevel);
    const phase=along*this.parameters.metresPerWorldUnit/.45*2*Math.PI;
    return smooth*(.053+.012*(.5+.5*Math.cos(phase)));
  }

  reset(state) {
    delete state.visualSuspension;
    delete state.suspension;
    delete state.roadHeights;
    delete state.terrainSlope;
    state.vx = 0;
    state.vy = 0;
    state.yawRate = 0;
    state.steerAngle = 0;
    state.steer = 0;
    state.lateralG = 0;
    state.longitudinalG = 0;
    state.bodySlip = 0;
    state.tireUse = 0;
    state.torqueScale = 1;
    state.tcActive = false;
    state.speed = 0;
  }

  createSuspension(state) {
    const p=this.parameters,s=p.suspension,g=9.81;
    const sprungMass=p.mass-4*s.unsprungMass;
    const heights=state.roadHeights || [0,0,0,0];
    const front=(heights[0]+heights[1])/2,rear=(heights[2]+heights[3])/2;
    const pitch=(front-rear)/p.wheelbase;
    const roll=((heights[1]-heights[0])+(heights[3]-heights[2]))/(2*p.trackWidth);
    const heave=(front*p.rearAxle+rear*p.frontAxle)/p.wheelbase;
    state.suspension={heave,heaveVelocity:0,pitch,pitchVelocity:0,roll,rollVelocity:0,
      centreHeight:p.centreOfMassHeight,motionRatio:s.motionRatio,
      wheels:[p.frontAxle,-p.rearAxle].flatMap((x,axle)=>[-1,1].map((side,sideIndex)=>{
        const preload=sprungMass*g*(axle===0?p.rearAxle:p.frontAxle)/p.wheelbase/2;
        return {x,y:side*p.trackWidth/2,z:heights[axle*2+sideIndex] || 0,velocity:0,road:heights[axle*2+sideIndex] || 0,
          preload,load:preload+s.unsprungMass*g,travel:0};
      }))};
    return state.suspension;
  }

  stepSuspension(state,seconds) {
    const p=this.parameters,s=p.suspension,g=9.81;
    const body=state.suspension || this.createSuspension(state);
    const sprungMass=p.mass-4*s.unsprungMass;
    const road=state.roadHeights || [0,0,0,0];
    // Integrate the sprung body and four unsprung masses in SI units. Small
    // substeps resolve wheel hop independently of the presentation rate.
    const count=Math.max(1,Math.ceil(seconds*720)),dt=seconds/count;
    const previousRoad=body.wheels.map(w=>w.road);
    for(let step=0;step<count;step++) {
      let force=0,pitchMoment=0,rollMoment=0;
      const travel=body.wheels.map(w=>w.z-body.heave-w.x*body.pitch-w.y*body.roll);
      body.wheels.forEach((w,index)=>{
        const target=Number.isFinite(road[index])?road[index]:0;
        const surface=previousRoad[index]+(target-previousRoad[index])*(step+1)/count;
        const roadVelocity=seconds>0?(target-previousRoad[index])/seconds:0;
        const relativeVelocity=w.velocity-body.heaveVelocity-w.x*body.pitchVelocity-w.y*body.rollVelocity;
        const damping=relativeVelocity>=0?s.bumpDamping:s.reboundDamping;
        const stop=s.bumpStopRate*(Math.max(0,travel[index]-s.bumpTravel)+Math.min(0,travel[index]+s.droopTravel));
        const antiRoll=s.antiRollRate*(travel[index]-travel[index^1]);
        const spring=w.preload+s.wheelRate*travel[index]+damping*relativeVelocity+stop+antiRoll;
        // A tyre can push on the road, never pull it. Its static deflection is
        // implicit in preload; z is displacement from the settled wheel centre.
        const tyre=Math.max(0,w.preload+s.unsprungMass*g+s.tyreRate*(surface-w.z)+s.tyreDamping*(roadVelocity-w.velocity));
        force+=spring;pitchMoment+=spring*w.x;rollMoment+=spring*w.y;
        w.velocity+=(tyre-spring-s.unsprungMass*g)/s.unsprungMass*dt;
        w.z+=w.velocity*dt;
        w.load=tyre;w.travel=travel[index];w.road=surface;
      });
      const ax=(state.vx || 0)>.1?(state.longitudinalG || 0)*g:0;
      const ay=(state.vx || 0)>.1?(state.lateralG || 0)*g:0;
      body.heaveVelocity+=(force-sprungMass*g)/sprungMass*dt;
      body.pitchVelocity+=(pitchMoment+sprungMass*ax*p.centreOfMassHeight)/s.pitchInertia*dt;
      body.rollVelocity+=(rollMoment+sprungMass*ay*p.centreOfMassHeight)/s.rollInertia*dt;
      body.heave+=body.heaveVelocity*dt;
      body.pitch+=body.pitchVelocity*dt;
      body.roll+=body.rollVelocity*dt;
    }
    for(const w of body.wheels) w.travel=w.z-body.heave-w.x*body.pitch-w.y*body.roll;
  }

  applyImpact(state, normal, impactMaterial, contact) {
    const cos=Math.cos(state.angle), sin=Math.sin(state.angle);
    const worldVx=state.vx*cos-state.vy*sin;
    const worldVy=state.vx*sin+state.vy*cos;
    const normalVelocity=worldVx*normal.x+worldVy*normal.y;
    const impactSpeed=contact?.impulse!==undefined?contact.impulse/this.parameters.mass:Math.max(0,-normalVelocity);
    // Game tuning: stacked tyres cushion impacts more than rigid obstacles.
    // Use perpendicular speed; glancing contact keeps its tangential motion.
    const cushioned=impactMaterial==='tyres';
    const damageFreeSpeed=cushioned?4:2, disablingSpeed=cushioned?16:8;
    const damage=Math.max(0,impactSpeed*impactSpeed-damageFreeSpeed*damageFreeSpeed)/
      (disablingSpeed*disablingSpeed-damageFreeSpeed*damageFreeSpeed);
    state.damage=Math.min(1,(state.damage || 0)+damage);
    state.crashed=state.damage>=1;
    state.impactSpeed=impactSpeed;
    state.impactEnergy=.5*this.parameters.mass*impactSpeed*impactSpeed;
    state.impactSide=normal.x*(-sin)+normal.y*cos;
    // Wall friction follows the impulse into the wall. A constant speed cut
    // on every contact would brake a grazing slide repeatedly each frame.
    const tangentVx=worldVx-normalVelocity*normal.x;
    const tangentVy=worldVy-normalVelocity*normal.y;
    const tangentSpeed=Math.hypot(tangentVx,tangentVy);
    const retention=Math.max(0,1-.15*impactSpeed/Math.max(tangentSpeed,1e-12));
    const remainingNormal=normalVelocity+impactSpeed;
    const vx=tangentVx*retention+remainingNormal*normal.x;
    const vy=tangentVy*retention+remainingNormal*normal.y;
    state.vx=state.crashed?0:vx*cos+vy*sin;
    state.vy=state.crashed?0:-vx*sin+vy*cos;
    state.yawRate=0;
    state.speed=Math.hypot(state.vx,state.vy);
    state.bodySlip=Math.atan2(state.vy,Math.max(state.vx,.5));
    state.lateralG=state.longitudinalG=0;
    state.tcActive=false;
    return damage;
  }

  step(state, input, seconds, grassContact) {
    if(state.crashed) return;
    const p = this.parameters;
    const dt = Math.min(seconds, 1 / 90);
    const gravity = 9.81;
    const grade=state.terrainSlope||{forward:0,right:0};
    const gradeScale=gravity/Math.sqrt(1+grade.forward*grade.forward+grade.right*grade.right);
    const gradeForward=-grade.forward*gradeScale,gradeRight=-grade.right*gradeScale;
    const suspension=state.suspension || this.createSuspension(state);
    const gas = Math.max(0, Math.min(1, input.gas));
    const brake = Math.max(0, Math.min(1, input.brake));
    // Give the brake priority when keyboard/touch pedals overlap.
    const throttle = gas * (1 - brake) * (1-.65*(state.damage || 0));
    const desiredSteer = Math.max(-1, Math.min(1, input.steer));
    const analog = !!input.analog;
    const assisted = !input.wheel;
    const grassFraction = Math.max(0, Math.min(1, Number(grassContact) || 0));
    const mu = p.roadGrip + (p.grassGrip - p.roadGrip) * grassFraction;

    // Build lock quickly in tight turns, more gently at speed. Releasing a key
    // or correcting the other way should not leave the old turn held for .4 s.
    const steeringSpeed = Math.max(0, state.vx);
    const speedBlend = Math.min(1, steeringSpeed / 20);
    const reversing = desiredSteer * state.steer < 0;
    const centering = desiredSteer === 0 || reversing;
    const response = analog ? 8 : centering ? 8 : 5 - 2 * speedBlend;
    // First unwind to centre before building lock in the opposite direction.
    const steerTarget = !analog && reversing ? 0 : desiredSteer;
    const steerChange = steerTarget - state.steer;
    state.steer += Math.max(-response * dt, Math.min(response * dt, steerChange));
    // Keyboard buttons request a turn rate. The steering rack adds a little angle
    // when the car responds less than requested, while keeping lateral demand sane.
    let targetAngle;
    if (!assisted) {
      targetAngle = state.steer * p.maxRoadWheelAngle;
    } else {
      const speed = Math.max(state.vx, 1.5);
      const yawLimit = mu * gravity * p.assistedSteeringGrip / speed;
      // Use the full rack at low speed (about a 4.1 m radius), then reduce
      // steering demand as speed rises to stay within the lateral grip budget.
      const fullLockYawRate = speed * Math.tan(p.maxRoadWheelAngle) / p.wheelbase;
      const targetYawRate = state.steer * Math.min(fullLockYawRate, yawLimit);
      // The geometric angle alone underestimates the lock needed when the
      // front tires develop slip. Compensate the front/rear stiffness balance.
      const understeer = p.mass / p.wheelbase *
        (p.rearAxle / p.frontCorneringStiffness - p.frontAxle / p.rearCorneringStiffness);
      const feedForward = Math.atan(p.wheelbase * targetYawRate / speed) + understeer * speed * targetYawRate;
      // Fade the assistance with the requested turn so releasing the keys
      // centres the rack rather than generating an automatic opposite turn.
      const assistance = Math.abs(state.steer);
      targetAngle = feedForward + assistance * .18 * (targetYawRate - state.yawRate);
      targetAngle = Math.max(-p.maxRoadWheelAngle, Math.min(p.maxRoadWheelAngle, targetAngle));
    }
    const rackChange = (targetAngle - state.steerAngle) * (analog ? 1 : 1 - Math.exp(-18 * dt));
    state.steerAngle += Math.max(-2.8 * dt, Math.min(2.8 * dt, rackChange));

    const speed = Math.max(0, state.vx);
    const drag = 0.5 * 1.225 * p.dragArea * speed * speed;
    const rolling = p.rollingResistance * (1 + 2 * grassFraction);
    const rawDriveRequest = throttle * Math.min(p.peakDriveForce, p.peakPower / Math.max(speed, 2));
    // Lift-off braking fades near rest and with pedal input. Use the same
    // grip-aware axle distribution as the brakes rather than unloading and
    // locking the driven rear axle in a corner. This is a gameplay assist.
    const coastBrake = (1 - gas) * p.coastBrakeForce * Math.min(1, speed / 4);
    // Steering never requests braking. Corner speed follows tire forces,
    // available drive, drag and the driver's pedal inputs.
    const brakeRequest = brake * p.peakBrakeForce + (1 - brake) * coastBrake;
    const wheelbase = p.wheelbase;
    // With no wheel-speed measurements, this is a tire-capacity torque limiter rather
    // than a calibrated slip-ratio controller. It leaves lateral grip in reserve.
    const estimatedRearLoad = suspension.wheels[2].load+suspension.wheels[3].load;
    const estimatedRearLimit = mu * estimatedRearLoad;
    const rearSlipAngle = speed >= 1.5 ? Math.atan2(state.vy - p.rearAxle * state.yawRate, speed) : 0;
    const predictedAy = speed * speed * Math.tan(state.steerAngle) / wheelbase;
    const predictedRearFy = p.mass * predictedAy * p.frontAxle / wheelbase;
    const lateralDemand = Math.max(Math.abs(p.rearCorneringStiffness * rearSlipAngle), Math.abs(predictedRearFy) * .65);
    const lateralReserve = Math.min(estimatedRearLimit, lateralDemand);
    const availableDrive = Math.sqrt(Math.max(0, estimatedRearLimit * estimatedRearLimit - lateralReserve * lateralReserve)) * .95;
    const targetScale = p.tractionControlEnabled && rawDriveRequest > 1 ? Math.min(1, availableDrive / rawDriveRequest) : 1;
    const changeRate = targetScale < state.torqueScale ? 12 : 2.5;
    state.torqueScale += Math.max(-changeRate * dt, Math.min(changeRate * dt, targetScale - state.torqueScale));
    state.tcActive = p.tractionControlEnabled && throttle > .1 && state.torqueScale < .97;
    const driveRequest = rawDriveRequest * state.torqueScale;
    const frontLoad = suspension.wheels[0].load+suspension.wheels[1].load;
    const rearLoad = suspension.wheels[2].load+suspension.wheels[3].load;
    // Mild load sensitivity makes an unloaded inside tyre matter to grip.
    const axleCapacity=offset=>suspension.wheels.slice(offset,offset+2).reduce((sum,w)=>{
      const reference=w.preload+p.suspension.unsprungMass*gravity;
      return sum+mu*reference*Math.pow(Math.max(0,w.load)/reference,.94);
    },0);
    const frontLimit = Math.max(1,axleCapacity(0));
    const rearLimit = Math.max(1,axleCapacity(2));

    // Move brake bias forward as braking unloads the rear axle. Both axles
    // subsequently share their friction budget between braking and cornering.
    // All tyres can lose contact during a kerb hop. Avoid 0/0 propagating
    // through the brake forces into the vehicle position and camera.
    const totalLoad = frontLoad + rearLoad;
    const frontLoadShare = totalLoad > 0 ? frontLoad / totalLoad : p.rearAxle / wheelbase;
    const frontBrakeBias = Math.max(.65, Math.min(.90, frontLoadShare + .10));
    const rearBrakeReserve = Math.min(rearLimit * .95, lateralDemand);
    const rearBrakeCapacity = Math.sqrt(Math.max(0, rearLimit * rearLimit - rearBrakeReserve * rearBrakeReserve));
    // Existing brake-distribution assistance reserves rear lateral capacity.
    // Front combined-slip saturation below must still allow a steering force,
    // trading braking force for cornering rather than cancelling cornering.
    const totalBrake = Math.min(brakeRequest, frontLimit + rearBrakeCapacity);
    const frontBrakeForce = Math.max(totalBrake - rearBrakeCapacity,
      Math.min(frontLimit, totalBrake * frontBrakeBias));
    let frontFx = -frontBrakeForce;
    const rearBrakeForce = totalBrake - frontBrakeForce;
    // Confirmed rear-wheel drive: only the rear axle receives motor torque.
    let rearFx = Math.max(-rearLimit, Math.min(rearLimit, driveRequest - rearBrakeForce));

    if (speed < 1.5) {
      const ax = (frontFx + rearFx - drag - rolling) / p.mass+gradeForward;
      state.vx = Math.max(0, Math.min(p.maxSpeed, state.vx + ax * dt));
      state.vy *= Math.max(0, 1 - 6 * dt);
      state.yawRate = state.vx * Math.tan(state.steerAngle) / wheelbase;
      state.lateralG = state.vx * state.yawRate / gravity;
      state.longitudinalG = ax / gravity;
      state.tireUse = Math.min(1, Math.abs(state.lateralG) / mu);
    } else {
      const alphaFront = Math.atan2(state.vy + p.frontAxle * state.yawRate, speed) - state.steerAngle;
      const alphaRear = Math.atan2(state.vy - p.rearAxle * state.yawRate, speed);
      let frontFy = -frontLimit * Math.tanh(p.frontCorneringStiffness * alphaFront / frontLimit);
      let rearFy = -rearLimit * Math.tanh(p.rearCorneringStiffness * alphaRear / rearLimit);
      // Simplified combined-slip tire envelope: saturate the requested force
      // vector, rather than giving longitudinal force absolute priority.
      // Steering under braking trades some deceleration for lateral force.
      // This is not a wheel-speed or slip-ratio ABS simulation.
      const frontScale = Math.min(1, frontLimit / Math.max(1, Math.hypot(frontFx, frontFy)));
      const rearScale = Math.min(1, rearLimit / Math.max(1, Math.hypot(rearFx, rearFy)));
      frontFx *= frontScale;
      frontFy *= frontScale;
      rearFx *= rearScale;
      rearFy *= rearScale;
      const frontBodyFx = frontFx * Math.cos(state.steerAngle) - frontFy * Math.sin(state.steerAngle);
      const frontBodyFy = frontFx * Math.sin(state.steerAngle) + frontFy * Math.cos(state.steerAngle);
      const vxDot = (frontBodyFx + rearFx - drag - rolling) / p.mass + state.vy * state.yawRate+gradeForward;
      const vyDot = (frontBodyFy + rearFy) / p.mass - state.vx * state.yawRate+gradeRight;
      const yawDot = (p.frontAxle * frontBodyFy - p.rearAxle * rearFy) / p.yawInertia;
      state.vx = Math.max(0, Math.min(p.maxSpeed, state.vx + vxDot * dt));
      state.vy = Math.max(-14, Math.min(14, state.vy + vyDot * dt));
      state.yawRate = Math.max(-3, Math.min(3, state.yawRate + yawDot * dt));
      state.lateralG = (frontBodyFy + rearFy) / (p.mass * gravity);
      state.longitudinalG = (frontBodyFx + rearFx - drag - rolling) / (p.mass * gravity);
      state.tireUse = Math.max(Math.hypot(frontFx, frontFy) / Math.max(frontLimit, 1), Math.hypot(rearFx, rearFy) / Math.max(rearLimit, 1));
    }

    // Yaw assistance acts through the steering rack, never by overwriting
    // rotation after the tire-force integration. Lateral alignment remains
    // temporarily as a separate assist to be evaluated in the next step.
    if (assisted && speed >= 1.5) {
      const rollingVy = p.rearAxle * state.yawRate;
      const alignment = 1 - Math.exp(-(10 - 6 * grassFraction) * dt);
      state.vy += (rollingVy - state.vy) * alignment;
    }

    state.angle += state.yawRate * dt;
    const forwardX = Math.cos(state.angle), forwardY = Math.sin(state.angle);
    const worldUnitsPerMetre = 1 / p.metresPerWorldUnit;
    state.x += (state.vx * forwardX - state.vy * forwardY) * dt * worldUnitsPerMetre;
    state.y += (state.vx * forwardY + state.vy * forwardX) * dt * worldUnitsPerMetre;
    state.bodySlip = Math.atan2(state.vy, Math.max(state.vx, 0.5));
    state.speed = Math.hypot(state.vx, state.vy);
    this.stepSuspension(state,dt);
  }
};
})();
