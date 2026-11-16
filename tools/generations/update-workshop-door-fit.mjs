import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { Box3, DoubleSide, Group, Matrix4, Mesh, MeshBasicMaterial, MeshStandardMaterial, Raycaster, Vector3 } from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { buildE30Exterior } from './e30-325i-exterior.mjs';
import { mix, patch } from './e30-exterior-surfaces.mjs';
import { compactPart } from '../geometry/local-cabin-glb.mjs';
import { compressGeometryGlb } from '../geometry/compress-glb.mjs';
import { immutable, localReferenceTools, readJson, replaceJson, sha } from '../geometry/local-reference-review.mjs';

const probe = new MeshBasicMaterial({side:DoubleSide});
const flange = new MeshStandardMaterial({name:'Door frame', color:0x565c5d, metalness:.27, roughness:.58, side:DoubleSide});
const belt = new MeshStandardMaterial({name:'Window belt seal', color:0x262725, roughness:.87, side:DoubleSide});
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const probeLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder)
  .register(() => ({name:'geometry probe',loadMaterial:() => Promise.resolve(probe)}));
globalThis.FileReader = class {
  async readAsArrayBuffer(blob) { this.result = await blob.arrayBuffer(); this.onloadend?.(); }
};

const archivePath = 'data/digital-twin/workshop-panel-archives.json';
const archives = await readJson(archivePath);
const {parseReference,members,defaultView} = await localReferenceTools();
const profiles = {
  coupe:[[-.252,.351],[.609,.351],[.680,.383],[.712,.431],[.726,.705],[.698,.745],[-.330,.745],[-.364,.695],[-.337,.460],[-.320,.389]],
  front:[[-.206,.353],[.557,.354],[.604,.390],[.634,.454],[.634,.784],[.604,.826],[-.252,.822],[-.266,.773],[-.249,.596],[-.229,.426]],
  rear:[[-.919,.362],[-.431,.362],[-.364,.403],[-.351,.811],[-.379,.842],[-1.168,.840],[-1.200,.819],[-1.165,.752],[-1.109,.659],[-1.052,.564],[-.994,.474],[-.940,.393]],
};

async function revise(pinName, baseRevision, revision, series) {
  const pinPath = 'data/digital-twin/' + pinName + '.json';
  const active = await readJson(pinPath);
  const pin = [active,...archives].find(item => item.id === active.id && item.revision === baseRevision);
  assert(pin, 'The door fit requires its original baseline');
  const manifest = await fs.readFile('public'+pin.manifestUrl);
  assert.equal(sha(manifest),pin.sha256);
  const model = JSON.parse(manifest), nodes = new Map(model.nodes.map(node=>[node.id,node]));
  const scenes = new Map(), dirty = new Set();

  async function sceneFor(assetId, readOnly = false) {
    if (!scenes.has(assetId)) {
      const asset = model.assets.find(asset => asset.id===assetId);
      const bytes = await fs.readFile('public'+asset.url);
      assert.equal(sha(bytes),asset.sha256);
      const reader = readOnly ? probeLoader : loader;
      const {scene} = await reader.parseAsync(Uint8Array.from(bytes).buffer,'');
      scene.updateMatrixWorld(true);
      scenes.set(assetId,scene);
    }
    const scene = scenes.get(assetId);
    scene.updateMatrixWorld(true);
    return scene;
  }

  async function worldMeshes(node, readOnly, materialName) {
    const scene = await sceneFor(node.assetId,readOnly), world = new Matrix4().fromArray(node.matrix), result = [];
    for (const name of node.meshNames) {
      const object = scene.getObjectByName(name);
      assert(object,node.id);
      object.traverse(source=>{
        if (!source.isMesh || (materialName && source.material.name!==materialName)) return;
        const mesh = new Mesh(source.geometry,probe);
        mesh.matrixWorld.multiplyMatrices(world,source.matrixWorld);
        result.push(mesh);
      });
    }
    return result;
  }

  if (series==='e30') {
    const assetId='e30:325i-exterior';
    const scene = await sceneFor(assetId);
    buildE30Exterior((parent,key,_name,_position,_direction,draw)=>{
      if (!/^(?:front-fender|rear-quarter)-(?:left|right)$|^door-moulding$/.test(key)) return;
      const id = (parent==='e30body:assembly'?'e30body':parent)+':'+key;
      const node = nodes.get(id), old = scene.getObjectByName(node.meshNames[0]);
      const group = new Group();
      group.name=old.name;
      draw(group);
      compactPart(group);
      const box = new Box3().setFromObject(group,true);
      node.bounds={min:box.min.toArray(),max:box.max.toArray()};
      old.parent.add(group);
      old.removeFromParent();
    });
    dirty.add(assetId);
  }

  const checked = [];
  for (const [side,sign] of [['left',-1],['right',1]]) {
    const doors = series==='e30'
      ? [[`e30body:door-${side}`,`e30body:door-${side}:door-card`,'coupe',0]]
      : [
          [`e34body:front-door-${side}`,side==='left'?'e34trim:front-left-card':'e34sys:door-card-front--1','front',.102],
          [`e34body:rear-door-${side}`,side==='left'?'e34sys:door-card-rear-1':'e34sys:door-card-rear--1','rear',.126],
        ];
    for (const [doorId,cardId,profile,shift] of doors) {
      const door=nodes.get(doorId), card=nodes.get(cardId);
      const hinge=model.openingPanels.find(panel=>panel.id===doorId);
      assert.equal(card.parentId,doorId);
      assert(hinge && hinge.angle!==0);
      const cardMembers=[card];
      for (const node of model.nodes) {
        let parent=nodes.get(node.parentId);
        while (parent && parent!==card) parent=nodes.get(parent.parentId);
        if (parent) cardMembers.push(node);
      }
      const fit = new Matrix4().makeTranslation(0,0,-sign*shift);
      if (series==='e30') {
        const center=new Vector3(.18,.410,0);
        fit.makeScale(1.075,1.17,1);
        fit.setPosition(center.clone().sub(center.applyMatrix4(fit)));
      }
      for (const member of cardMembers) member.matrix = new Matrix4().fromArray(member.matrix).premultiply(fit).toArray();
      const skin=await worldMeshes(door,series==='e34');
      const back=await worldMeshes(card,series==='e34');
      const ray=new Raycaster(new Vector3(),new Vector3(0,0,sign),0,.60);
      const shellNode=series==='e30'?nodes.get(doorId+':inner-shell'):{
        id:doorId+':inner-frame', parentId:doorId, kind:'part',
        name:hinge.label+' inner frame',
        assetId:'authored:525i-visual-detail', meshNames:[doorId.replaceAll(':','_')+'_inner_frame'],
        matrix:new Matrix4().toArray(), systemIds:card.systemIds,
        displayDirection:[0,.16,sign*.41], cabinVisible:true,
        internal:false, canonicalId:null, oem:null, guideIds:[], thumbnail:null,
      };
      const frame = new Group(), inverse = new Matrix4().fromArray(shellNode.matrix).invert();
      const outerFromCard=[];
      const outline=profiles[profile].map(([x,y])=>new Vector3(x,y,0).applyMatrix4(fit).toArray().slice(0,2));
      for (let edge=0;edge<outline.length;edge++) {
        const start=outline[edge], end=outline[(edge+1)%outline.length];
        const columns=Math.max(2,Math.ceil(Math.hypot(end[0]-start[0],end[1]-start[1])/.025));
        const stations=[];
        for (let i=0;i<=columns;i++) {
          const [x,y]=mix(start,end,i/columns);
          ray.ray.origin.set(x,y,sign*.34);
          const panel=ray.intersectObjects(back).at(-1);
          const outer=ray.intersectObjects(skin).at(-1);
          assert(panel&&outer, `Missing ${!panel?'trim':'door'} surface at ${x.toFixed(3)}, ${y.toFixed(3)} on ${cardId}`);
          const depth=(outer.point.z-panel.point.z)*sign;
          assert(depth>.002 && depth<.23,`Trim or shell depth is invalid on ${cardId}`);
          outerFromCard.push(depth);
          stations.push({x,y,seat:panel.point.z-sign*.004,outer:outer.point.z-sign*.001});
        }
        // The pressed return joins the mounting edge to the outer sheet.
        // Its top edge is the matte window-belt lip.
        patch(frame,start[1]>.73&&end[1]>.73?belt:flange,(u,v)=>{
          const station=stations[Math.round(u*columns)];
          const z=station.seat+(station.outer-station.seat)*v;
          return new Vector3(station.x,station.y,z).applyMatrix4(inverse).toArray();
        },columns,2);
      }
      compactPart(frame);
      const frameBounds=new Box3().setFromObject(frame,true);
      const scene=await sceneFor(shellNode.assetId);
      if (series==='e30') {
        const parent=scene.getObjectByName(shellNode.meshNames[0]);
        frameBounds.union(new Box3(new Vector3(...shellNode.bounds.min),new Vector3(...shellNode.bounds.max)));
        frame.applyMatrix4(parent.matrix.clone().invert());
        parent.add(frame);
      } else {
        frame.name=shellNode.meshNames[0];
        scene.add(frame);
        model.nodes.push(shellNode);
        nodes.set(shellNode.id,shellNode);
        if (model.catalog) model.catalog.coverage.renderable++;
      }
      shellNode.bounds={min:frameBounds.min.toArray(),max:frameBounds.max.toArray()};
      dirty.add(shellNode.assetId);
      const parsed=parseReference(model);
      const owned = members(parsed,doorId);
      assert(owned.has(cardId) && owned.has(shellNode.id),'Door card and frame must move with their door');
      checked.push([cardId,outerFromCard.length]);
    }
    if (series==='e30') {
      const stripSections=[
        [`e30body:front-fender-${side}`,[.843,.922,1.011,1.052],true],
        [`e30body:door-${side}:door-moulding`,[-.403,-.106,.273,.711],false],
        [`e30body:rear-quarter-${side}`,[-.839,-.723,-.590,-.516],true],
      ];
      for (const [id,positions,sameMesh] of stripSections) {
        const trim=await worldMeshes(nodes.get(id),false,'Rubber');
        const skin=await worldMeshes(nodes.get(sameMesh?id:`e30body:door-${side}`),false,'E30_Body_Paint');
        assert(trim.length && skin.length,`Missing paint or moulding at ${id}`);
        const ray=new Raycaster(new Vector3(),new Vector3(0,0,-sign),0,.20);
        for(const x of positions) {
          let visible=0;
          for(let y=.482;y<=.526;y+=.001) {
            ray.ray.origin.set(x,y,sign*.942);
            const trimHit=ray.intersectObjects(trim)[0], skinHit=ray.intersectObjects(skin)[0];
            if(trimHit && skinHit && trimHit.distance<skinHit.distance-.0007) visible++;
          }
          assert(visible>=31,`Visible moulding height at ${id}/${x} is only ${visible} mm`);
        }
      }
    }
  }

  const prefix='/models/'+series+'-lore/r'+revision+'/';
  const outputs=[];
  for (const asset of model.assets.filter(asset=>dirty.has(asset.id))) {
    const data=await compressGeometryGlb(Buffer.from(await new GLTFExporter().parseAsync(scenes.get(asset.id),{binary:true})));
    const digest=sha(data);
    Object.assign(asset,{url:prefix+digest+'.glb',bytes:data.length,sha256:digest});
    outputs.push([asset.url,data]);
  }
  model.revision=revision;
  if (model.catalog) model.catalog.modelRevision=revision;
  parseReference(model);
  assert.equal(defaultView().explosion,0);
  const bytes=Buffer.from(JSON.stringify(model)), digest=sha(bytes);
  const next={...pin,revision,manifestUrl:prefix+'manifest.'+digest+'.json',sha256:digest,
    assetBytes:model.assets.reduce((sum,asset)=>sum+asset.bytes,0),
    renderableCount:model.nodes.filter(node=>node.assetId).length};
  assert(next.assetBytes<24*1024*1024);
  for (const [url,data] of outputs) await immutable('public'+url,data);
  await immutable('public'+next.manifestUrl,bytes);
  if (!archives.some(saved=>saved.id===pin.id&&saved.revision===pin.revision)) {
    archives.push(pin);
    await replaceJson(archivePath,archives);
  }
  if (active.sha256!==next.sha256) await replaceJson(pinPath,next);
  console.log(JSON.stringify({reference:next.id,revision,checked,sha256:next.sha256}));
}

try {
  await revise('e30-candidate',1170,1172,'e30');
  await revise('525i-service-release',1043,1044,'e34');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
