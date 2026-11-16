// BMW of North America's 325i Owner's Handbook, Dimensions and weights.
// The two-door hardtop uses the 325i column, shared with the four-door.
export const factoryDimensions = Object.freeze({
  length: 4.325,
  width: 1.645,
  unloadedHeight: 1.380,
  wheelbase: 2.570,
  frontOverhang: .761,
  rearOverhang: .994,
  frontTrack: 1.407,
  rearTrack: 1.415,
});

export const frontAxleX = 1.390;
export const rearAxleX = frontAxleX - factoryDimensions.wheelbase;
export const frontBumperX = frontAxleX + factoryDimensions.frontOverhang;
export const rearBumperX = rearAxleX - factoryDimensions.rearOverhang;
export const axleHeight = .300;
