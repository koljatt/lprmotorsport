/* Cross-engine physics determinism scenario. Shared by tests/dmath.test.cjs (Node.js)
 * and the browser console, so one recording can be compared bit for bit everywhere.
 * Expects a loaded physics world: LPRMath, LPRCampus and VehicleDynamics. */
(function(root) {
  'use strict';
  function run(world) {
    const M = world.LPRMath, campus = world.LPRCampus, track = campus.track;
    const dynamics = new world.VehicleDynamics();
    const car = { x: track[0].x, y: track[0].y, angle: M.atan2(track[1].y - track[0].y, track[1].x - track[0].x) };
    dynamics.reset(car);
    campus.resetObstacles();
    const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
    let hash = 0, impacts = 0;
    // 20 s full throttle weaving into campus walls, then 10 s braking; grass for the first
    // half second of every five seconds.
    for (let i = 0; i < 3600; i++) {
      const input = { gas: i < 2400 ? 1 : 0, brake: i >= 2400 ? .8 : 0, steer: M.sin(i / 90) * .4, analog: false, wheel: false };
      campus.stepObstacles(1 / 120, car, () => { impacts++; });
      const previous = { x: car.x, y: car.y, angle: car.angle };
      dynamics.step(car, input, 1 / 120, i % 600 < 60 ? .5 : 0);
      campus.resolveObstacleCollision(car, previous, () => { impacts++; });
      for (const key of ['x', 'y', 'angle', 'vx', 'vy', 'yawRate']) {
        f64[0] = car[key];
        hash = (Math.imul(hash ^ u32[0], 2654435761) ^ u32[1]) >>> 0;
      }
    }
    campus.resetObstacles();
    return { hash: hash.toString(16).padStart(8, '0'), impacts, x: car.x, y: car.y };
  }
  // Verification-server world (verification/world.cjs createWorld): a deterministic
  // autopilot follows the circuit at ~40 km/h for 150 s, completing a full timed lap.
  function verifiedLap({ world, api, math }) {
    const M = math, track = world.track;
    const f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
    let hash = 0, laps = 0;
    const lapTicks = [];
    for (let i = 0; i < 18000; i++) {
      const s = world.result().state, near = world.nearestTrack(s.x, s.y);
      const target = track[(near.index + 4) % track.length];
      let error = M.atan2(target.y - s.y, target.x - s.x) - s.angle;
      error = M.atan2(M.sin(error), M.cos(error));
      const steer = Math.max(-1, Math.min(1, error * 2.2));
      const brake = M.hypot(s.vx, s.vy) > 11 ? .5 : 0;
      const event = world.step(api.decode([brake ? 0 : .6, brake, steer, true, false, true]));
      if (event.completed) { laps++; lapTicks.push(event.completed.lapTicks); }
      const r = world.result();
      for (const key of ['x', 'y', 'angle', 'vx', 'vy', 'yawRate', 'damage']) {
        f64[0] = r.state[key];
        hash = (Math.imul(hash ^ u32[0], 2654435761) ^ u32[1]) >>> 0;
      }
      hash = (Math.imul(hash ^ r.stage, 2654435761) ^ r.lap) >>> 0;
    }
    return { hash: hash.toString(16).padStart(8, '0'), laps, lapTicks, damage: world.result().state.damage };
  }
  run.verifiedLap = verifiedLap;
  if (typeof module === 'object' && module.exports) module.exports = run;
  else root.LPRDeterminismScenario = run;
})(typeof window === 'object' ? window : globalThis);
