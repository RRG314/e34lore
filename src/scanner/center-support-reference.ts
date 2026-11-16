import type { Series } from '../series/registry';
const references = {
  '525i': {
    label: '1995 525i Sedan',
    numbers: ['26121226723', '26121225071'],
    source: 'https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/steering_drive_shaft/drive_shaft_universal_joint_centre_mounting.html',
  },
  '540i': {
    label: '1994 540i Sedan',
    numbers: ['26121226657', '26121225002'],
    source: 'https://www.bmwpartsdeal.com/parts-list/1994-bmw-540i-sedan_e34/steering_drive_shaft/drive_shaft_center_bearing_constant_velocity_joint.html',
  },
};
export function centerSupportReference(model: string, series: Series = 'e34') {
  if (series === 'e30') return { label: '1991 325i Coupe', numbers: ['26121226723', '26121225071'], source: 'https://www.bmwpartsdeal.com/parts-list/1991-bmw-325i-coupe_e30/steering_drive_shaft/drive_shaft_universal_joint_centre_mounting.html' };
  return model === '540i' ? references['540i'] : references['525i'];
}
