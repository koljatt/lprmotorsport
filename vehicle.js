/* Simplified dynamic bicycle model. Distances and speeds inside this class are SI units. */
window.VehicleDynamics = class VehicleDynamics {
  constructor() {
    this.parameters = {
      metresPerWorldUnit: 0.1,
      mass: 275,                 // car and driver, kg; provisional until LPR data is available
      wheelbase: 1.63,           // m
      frontAxle: 0.81,           // centre of mass to front axle, m
      rearAxle: 0.82,            // centre of mass to rear axle, m
      trackWidth: 1.2,           // m, provisional tire contact spacing
      yawInertia: 120,           // kg m²
      centreOfMassHeight: 0.29,  // m
      frontCorneringStiffness: 13000, // N/rad, combined front axle
      rearCorneringStiffness: 14000,  // N/rad, combined rear axle
      roadGrip: 1.55,
      grassGrip: 0.58,
      peakDriveForce: 1850,     // N
      peakPower: 60000,         // W
      peakBrakeForce: 4500,     // N, tire grip limits the delivered braking force
      coastBrakeForce: 420,     // N, game-tuned lift-off braking with stable axle distribution
      tractionControlEnabled: true,
      maxRoadWheelAngle: 0.36,  // rad
      assistedSteeringGrip: 0.9, // fraction of available grip requested at full assisted steering
      assistedCornerSpeed: 14,  // m/s at full steering; progressively higher for gentle turns
      dragArea: 0.75,           // CdA, m²
      rollingResistance: 45     // N
    };
  }

  reset(state) {
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

  applyImpact(state, normal) {
    const cos=Math.cos(state.angle), sin=Math.sin(state.angle);
    const worldVx=state.vx*cos-state.vy*sin;
    const worldVy=state.vx*sin+state.vy*cos;
    const normalVelocity=worldVx*normal.x+worldVy*normal.y;
    const impactSpeed=Math.max(0,-normalVelocity);
    // Provisional game damage: energy scales with speed squared. A perpendicular
    // 8 m/s impact disables this lightweight car; parking nudges cause no damage.
    const damage=Math.max(0,impactSpeed**2-2**2)/(8**2-2**2);
    state.damage=Math.min(1,(state.damage || 0)+damage);
    state.crashed=state.damage>=1;
    state.impactSpeed=impactSpeed;
    state.impactEnergy=.5*this.parameters.mass*impactSpeed**2;
    state.impactSide=normal.x*(-sin)+normal.y*cos;
    const vx=(worldVx-normalVelocity*normal.x)*.9;
    const vy=(worldVy-normalVelocity*normal.y)*.9;
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
      // Use the full rack at low speed (about a 4.3 m radius), then reduce
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
    // A sustained tight turn asks for a manageable corner speed, even with the
    // throttle held. Small corrections retain the full straight-line speed.
    // This uses driver input only, without following the track automatically.
    const turnDemand = Math.max(0, (Math.abs(state.steer) - .2) / .8);
    const cornerSpeed = 36 - (36 - p.assistedCornerSpeed) * turnDemand;
    const cornerBrake = assisted ? Math.min(2485,
      Math.max(0, speed - cornerSpeed) * p.mass * 2) : 0;
    const brakeRequest = Math.max(brake * p.peakBrakeForce + (1 - brake) * coastBrake, cornerBrake);
    const wheelbase = p.wheelbase;
    // With no wheel-speed measurements, this is a tire-capacity torque limiter rather
    // than a calibrated slip-ratio controller. It leaves lateral grip in reserve.
    const previousTransfer = p.mass * state.longitudinalG * gravity * p.centreOfMassHeight / wheelbase;
    const estimatedRearLoad = Math.max(100, p.mass * gravity * p.frontAxle / wheelbase + previousTransfer);
    const estimatedRearLimit = mu * estimatedRearLoad;
    const rearSlipAngle = speed >= 1.5 ? Math.atan2(state.vy - p.rearAxle * state.yawRate, speed) : 0;
    const predictedAy = speed * speed * Math.tan(state.steerAngle) / wheelbase;
    const predictedRearFy = p.mass * predictedAy * p.frontAxle / wheelbase;
    const lateralDemand = Math.max(Math.abs(p.rearCorneringStiffness * rearSlipAngle), Math.abs(predictedRearFy) * .65);
    const lateralReserve = Math.min(estimatedRearLimit, lateralDemand);
    const availableDrive = Math.sqrt(Math.max(0, estimatedRearLimit ** 2 - lateralReserve ** 2)) * .95;
    const targetScale = p.tractionControlEnabled && rawDriveRequest > 1 ? Math.min(1, availableDrive / rawDriveRequest) : 1;
    const changeRate = targetScale < state.torqueScale ? 12 : 2.5;
    state.torqueScale += Math.max(-changeRate * dt, Math.min(changeRate * dt, targetScale - state.torqueScale));
    state.tcActive = p.tractionControlEnabled && throttle > .1 && state.torqueScale < .97;
    const driveRequest = rawDriveRequest * state.torqueScale;
    const estimatedAx = Math.max(-mu * gravity, Math.min(mu * gravity,
      (driveRequest - brakeRequest - drag - rolling) / p.mass));
    const transfer = p.mass * estimatedAx * p.centreOfMassHeight / wheelbase;
    const frontLoad = Math.max(100, p.mass * gravity * p.rearAxle / wheelbase - transfer);
    const rearLoad = Math.max(100, p.mass * gravity * p.frontAxle / wheelbase + transfer);
    const frontLimit = mu * frontLoad;
    const rearLimit = mu * rearLoad;

    // Move brake bias forward as braking unloads the rear axle. Both axles
    // subsequently share their friction budget between braking and cornering.
    const frontBrakeBias = Math.max(.65, Math.min(.90, frontLoad / (frontLoad + rearLoad) + .10));
    const rearBrakeReserve = Math.min(rearLimit * .95, lateralDemand);
    const rearBrakeCapacity = Math.sqrt(Math.max(0, rearLimit ** 2 - rearBrakeReserve ** 2));
    // Existing brake-distribution assistance reserves rear lateral capacity.
    // Front combined-slip saturation below must still allow a steering force,
    // trading braking force for cornering rather than cancelling cornering.
    const totalBrake = Math.min(brakeRequest, frontLimit + rearBrakeCapacity);
    const frontBrakeForce = Math.max(totalBrake - rearBrakeCapacity,
      Math.min(frontLimit, totalBrake * frontBrakeBias));
    let frontFx = -frontBrakeForce;
    const rearBrakeForce = totalBrake - frontBrakeForce;
    // Power is provisionally sent to the rear axle.
    let rearFx = Math.max(-rearLimit, Math.min(rearLimit, driveRequest - rearBrakeForce));

    if (speed < 1.5) {
      const ax = (frontFx + rearFx - drag - rolling) / p.mass;
      state.vx = Math.max(0, Math.min(36, state.vx + ax * dt));
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
      const vxDot = (frontBodyFx + rearFx - drag - rolling) / p.mass + state.vy * state.yawRate;
      const vyDot = (frontBodyFy + rearFy) / p.mass - state.vx * state.yawRate;
      const yawDot = (p.frontAxle * frontBodyFy - p.rearAxle * rearFy) / p.yawInertia;
      state.vx = Math.max(0, Math.min(36, state.vx + vxDot * dt));
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
  }
};
