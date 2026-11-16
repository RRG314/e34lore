import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';

export const wheelRoot=path.resolve('work/525i-detail-review/wheels');
export const wheelReceipt=path.join(wheelRoot,'packages.json');
const wheelId=/^e34-factory-[a-z0-9-]{1,26}-v1$/;
const wheelUrl=/^\/models\/e34-build-review\/wheels\/([a-f0-9]{64})\.glb$/;
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export function reviewWheelFile(asset){
  const match=wheelUrl.exec(asset.url);
  if(!match||match[1]!==asset.sha256||!Number.isInteger(asset.bytes)||asset.bytes<1||asset.bytes>1_000_000)throw Error('Invalid local wheel receipt');
  const bytes=fs.readFileSync(path.join(wheelRoot,match[1]+'.glb'));
  if(bytes.length!==asset.bytes||digest(bytes)!==asset.sha256)throw Error('Local wheel receipt mismatch');
  return bytes;
}
export function wheelAssets(packages){
  return packages.flatMap(wheel=>[wheel,wheel.lodLow,wheel.right,wheel.right?.lodLow].filter(Boolean));
}
export function readReviewWheels(){
  if(!fs.existsSync(wheelReceipt))return [];
  const packages=JSON.parse(fs.readFileSync(wheelReceipt,'utf8'));
  if(!Array.isArray(packages)||packages.length>48)throw Error('Invalid local wheel index');
  const ids=packages.map(wheel=>wheel.id);
  if(ids.some(id=>!wheelId.test(id))||new Set(ids).size!==ids.length)throw Error('Invalid local wheel identities');
  return packages;
}
export function registerReviewWheels(sql){
  const packages=readReviewWheels();
  if(!packages.length)return 0;
  for(const asset of wheelAssets(packages))reviewWheelFile(asset);
  const ids=JSON.stringify(packages.map(wheel=>wheel.id));
  const key='{properties,appearance,properties,wheels,properties,packageId,enum}';
  const result=sql(`update e34_private.build_contract
    set contract=jsonb_set(contract,'${key}',(
      select jsonb_agg(distinct value)
      from jsonb_array_elements((contract#>'${key}')||'${ids}'::jsonb)
    ),false)
    where version=1 and jsonb_typeof(contract#>'${key}')='array'
    returning jsonb_array_length(contract#>'${key}');`);
  if(Number(result)<packages.length+3)throw Error('Local wheel allowlist was not registered');
  return packages.length;
}
