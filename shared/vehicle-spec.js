/* Measured inputs in SI units. Tyre dimensions are nominal designation sizes. */
(function(root) {
  const spec = Object.freeze({
    metresPerWorldUnit: .1,
    mass: 450, driverMass: 80, massWithoutDriver: 370,
    wheelbase: 1.525, trackWidth: 1.472, length: 2.9, height: 1.3,
    rimDiameter: 13 * .0254, rimWidth: 7 * .0254,
    tyreDiameter: 20.5 * .0254, tyreWidth: 7 * .0254,
    rimBrand: 'OZ Racing', tyreBrand: 'Hoosier',
    // Unmeasured: retain the previous near-even weight distribution and CG height.
    frontAxle: 1.525 * .81 / 1.63, rearAxle: 1.525 * .82 / 1.63,
    centreOfMassHeight: .29,
    // Preserve the old concept's body proportions; wheel positions are independent.
    bodyLengthScale: 29 / (14.1 - .16 * 1.35 + 9.64),
    bodyHeightScale: 13 / 10.74
  });
  if (typeof module === 'object' && module.exports) module.exports = spec;
  else root.LPRVehicleSpec = spec;
})(typeof window === 'object' ? window : globalThis);
