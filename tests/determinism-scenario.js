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
  if (typeof module === 'object' && module.exports) module.exports = run;
  else root.LPRDeterminismScenario = run;
})(typeof window === 'object' ? window : globalThis);
