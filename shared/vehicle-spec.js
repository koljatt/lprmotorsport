/* Supplied inputs in SI units; estimates are identified below. Tyre sizes are nominal. */
(function(root) {
  const spec = Object.freeze({
    metresPerWorldUnit: .1,
    mass: 450, driverMass: 80, massWithoutDriver: 370,
    wheelbase: 1.525, trackWidth: 1.472, length: 2.9, height: 1.3,
    rimDiameter: 13 * .0254, rimWidth: 7 * .0254,
    tyreDiameter: 20.5 * .0254, tyreWidth: 7 * .0254,
    rimBrand: 'OZ Racing', tyreBrand: 'Hoosier',
    // Game design target: one commercially available EMRAX 208-class motor,
    // conservatively limited; these replace the team's supplied 14 kW / 80 Nm.
    drivetrain: 'RWD', motorPower: 60000, motorTorque: 140,
    maxMotorRpm: 7000,
    // FSG 2026 EV2.2.1 battery-output limit. Combined motor/inverter efficiency
    // is estimated; mechanical final-drive losses are accounted for separately.
    maxBatteryPower: 80000, motorInverterEfficiency: .90,
    // Unconfirmed gearing/efficiency: provisional single-speed drivetrain estimates.
    finalDriveRatio: 6, drivetrainEfficiency: .95,
    // Team reports near 50/50; use equal static loads until kinematics are confirmed.
    frontAxle: 1.525 / 2, rearAxle: 1.525 / 2,
    suspensionType: 'pushrod',
    // Unmeasured centre-of-mass height, retained estimate.
    centreOfMassHeight: .29,
    // Provisional steering setup: equivalent bicycle angle and cockpit lock.
    maxRoadWheelAngle: .36,
    maxVisualRoadWheelAngle: 27 * Math.PI / 180,
    maxSteeringWheelAngle: 120 * Math.PI / 180,
    visualRoadWheelAngle(angle) {
      // Presentation only: make small assisted rack angles visible, smoothly
      // approaching the hairpin pose without changing tyre forces or input.
      const lock = Math.max(-1, Math.min(1, angle / this.maxRoadWheelAngle));
      // Keep useful movement through the middle of the range instead of
      // saturating early. Both the wheel and tyres use this presentation ratio.
      return this.maxVisualRoadWheelAngle * 2.8 * lock / (1 + 1.8 * Math.abs(lock));
    },
    roadWheelAngle(angle, side) {
      // Positive side is right: the inside tyre turns more sharply.
      const tangent = Math.tan(angle);
      return Math.atan2(this.wheelbase * tangent,
        this.wheelbase - side * this.trackWidth * tangent / 2);
    },
    // Preserve the old concept's body proportions; wheel positions are independent.
    bodyLengthScale: 29 / (14.1 - .16 * 1.35 + 9.64),
    bodyHeightScale: 13 / 10.74
  });
  if (typeof module === 'object' && module.exports) module.exports = spec;
  else root.LPRVehicleSpec = spec;
})(typeof window === 'object' ? window : globalThis);
