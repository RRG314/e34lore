import factoryWheels from '../../data/build-studio/factory-wheel-packages.json';
import e30Wheels from '../../data/build-studio/e30-wheel-packages.json';
export type WheelAsset = {url:string; bytes:number; sha256:string};
export type WheelPackage = WheelAsset & {
  id:string;
  label:string;
  normalization:number;
  lodLow:WheelAsset|null;
  right?: (WheelAsset & {lodLow:WheelAsset|null}) | null;
  dimensions?:string;
  source?:string;
  group?:'E34'|'M5'|'525iX'|'E30';
  number?:string;
};

export const localWheelPackages:WheelPackage[]=[...factoryWheels,...e30Wheels] as WheelPackage[];
