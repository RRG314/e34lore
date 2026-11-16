import { boundedModelBytes } from "../../graphics/bounded-model-bytes";
import type {BuildAppearance}from'../../build-studio/schema';
import{appearanceRole,applyBuildMaterial}from'../../build-studio/appearance';
import {splitPaintSurfaces} from '../../build-studio/paint-surfaces';
import wheelPackages from'../../../data/build-studio/wheel-packages.json';
import {localWheelPackages, type WheelAsset, type WheelPackage} from '../../build-studio/local-wheel-packages';
import {sha256Hex} from "../../graphics/sha256";
import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { isGearboxInspection, bodyTrimScope, brakeHydraulicsScope, engineCutaway, isEngineInspection, engineBayScope, frontSuspensionScope, rearSuspensionScope, gearboxCutaway, visibleNodes, isExteriorNode,enclosingParts, canOpenPanels, type ReferenceModel, type ReaderView, type Viewpoint, type Vec } from './model';
import { installedBounds, offsets, referenceFrame } from './layout';
const isE30RoadWheel=(id:string)=>/^e30assembly:(front|rear)-(left|right):wheel$/.test(id);
const isRoadWheel=(id:string)=>id.startsWith('wheel:')||isE30RoadWheel(id);
function coupeStudio(lowerReflectors: boolean) {
    const scene = new T.Scene();
    scene.background = new T.Color(.16, .17, .18);
    const surface = new T.PlaneGeometry(1, 1);
    // Long softboxes reveal the curve of the sheet metal and the front glass.
    const panels = [
        { position: [0, 7, 1.2], size: [9, 2.6], intensity: 4.4 },
        { position: [0, 3.4, -6], size: [9, 2.2], intensity: 3.0 },
        { position: [0, 2.0, 6.5], size: [9, 2.8], intensity: 2.25 },
        { position: [6.7, 3.0, 1], size: [5, 3.7], intensity: 2.5 },
        { position: [-6.8, 2.6, -.4], size: [4.5, 2.5], intensity: 1.85 },
        ...(lowerReflectors ? [
            { position: [0, .15, -5], size: [6, 1.0], intensity: 1.55 },
            { position: [0, .15, 5], size: [6, 1.0], intensity: 1.30 },
        ] : []),
    ] as const;
    for (const {position, size, intensity} of panels) {
        const material = new T.MeshBasicMaterial({
            color: new T.Color(intensity * .97, intensity, intensity * 1.025),
            toneMapped: false,
        });
        const panel = new T.Mesh(surface, material);
        const [x, y, z] = position, [width, height] = size;
        panel.position.set(x, y, z);
        panel.scale.set(width, height, 1);
        panel.lookAt(0, .55, 0);
        scene.add(panel);
    }
    return {
        scene,
        dispose: () => {
            surface.dispose();
            for (const panel of scene.children as T.Mesh<T.PlaneGeometry, T.MeshBasicMaterial>[]) panel.material.dispose();
        },
    };
}
const cabinFloorAngles: Record<string,Vec> = {
    'system:carpet-trim':[.74,1.36,1.08],
    'system:center-console':[.74,1.36,1.08],
    'system:front-seat-belts':[1.35,.70,.94],
    'system:rear-seat-belts':[1.35,.70,.94],
    'system:hvac':[-1.3,1.45,1.2],
    'system:hvac-box':[-1.35,1.2,1.1],
    'system:hvac-blower':[1.35,1.14,1.1],
    'system:hvac-vents':[-.94,1.6,1.1],
};
export type ModelCamera = {
    position: Vec;
    target: Vec;
    fov: number;
};
export class ReferenceRenderer {
    private renderer: T.WebGLRenderer;
    private detailedVisuals=false;
    private coupeFinish: boolean;
    private gearboxSectionPlanes = [new T.Plane(new T.Vector3(0,0,-1),0)];
    // The 525i engine leans 30 degrees about its longitudinal axis.
    private engineSectionPlanes = [new T.Plane(new T.Vector3(0,.5,-Math.sqrt(.75)),-.181)];
    private scene = new T.Scene();
    private camera = new T.PerspectiveCamera(42, 1, .003, 150);
    private controls: OrbitControls;
    private objects = new Map<string, T.Group>();
    private partTargets = new Map<string, T.Vector3>();
    private openingMembers=new Map<string,string[]>();
    private openingParents=new Map<string,string[]>();
    private panelNodes=new Map<string,ReferenceModel['nodes'][number]>();
    private closedRotations=new Map<string,T.Quaternion>();
    private openingProgress=new Map<string,number>();
    private openingsMoving=false;
    private partsMoving = false;
    private procedureFocus=false;
    private roots: T.Group[] = [];
    private materials: T.Material[] = [];
    private appearanceGeometries: T.BufferGeometry[] = [];
    private originLine = new T.Line(new T.BufferGeometry(),new T.LineDashedMaterial({color:'#8d4a2c',dashSize:.035,gapSize:.025,transparent:true,opacity:.7,depthTest:false}));
    private view: ReaderView;
    private frame = 0;
    private last = 0;
    private disposed = false;
    private observer: ResizeObserver;
    private environment: T.WebGLRenderTarget | null = null;
    private floor: T.Mesh;
    private destination: {
        position: T.Vector3;
        target: T.Vector3;
    } | null = null;
    private pointer: {
        id: number;
        x: number;
        y: number;
        startX: number;
        startY: number;
        button: number;
    } | null = null;
    private activePointers=new Set<number>();
    private keys = new Set<string>();
    private cleanup: (() => void)[] = [];
    private loaded = false;
    private buildAppearance:BuildAppearance|null=null;
    private wheelGeneration=0;
    private wheelPackage='reference';private wheelQuality='high';private wheelRequest='reference:high';
    private wheelRoots:T.Group[]=[];
    private wheelClones:T.Material[]=[];
    private wheelAbort:AbortController|null=null;
    private wheelStatus='';
    private paintNodes='[]';
    private baseWheels=new Map<string,T.Object3D[]>();
    private installedWheelScales=new Map<string,T.Vector3>();
    constructor(private host: HTMLElement, private model: ReferenceModel, view: ReaderView, private select: (id: string, isolate: boolean) => void, private status: (message: string, failed?: boolean) => void,private appearanceStatus:(message:string)=>void=()=>{},private openPanel?:(id:string)=>void) {
        this.view = view;
        const nodes=new Map(model.nodes.map(node=>[node.id,node]));
        for (const panel of model.openingPanels ?? []) {
            this.openingMembers.set(panel.id, []);
            this.panelNodes.set(panel.id, nodes.get(panel.id)!);
        }
        for (const node of model.nodes) {
            if (!node.assetId) continue;
            const ancestors: string[] = [];
            let part: typeof node | undefined = node;
            while (part) {
                if (this.openingMembers.has(part.id)) ancestors.push(part.id);
                part = part.parentId ? nodes.get(part.parentId) : undefined;
            }
            const [panel, ...parents] = ancestors;
            if (panel) this.openingMembers.get(panel)!.push(node.id);
            if (panel === node.id) this.openingParents.set(panel, parents);
        }
        this.renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
        this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
        this.detailedVisuals=!!model.studioLighting||model.assets.some(a=>a.id==='authored:525i-visual-detail');
        this.renderer.shadowMap.enabled=this.detailedVisuals;
        this.renderer.shadowMap.type=T.PCFShadowMap;
        this.renderer.shadowMap.autoUpdate=false;
        this.renderer.toneMapping = T.ACESFilmicToneMapping;
        const coupeFinish = this.coupeFinish = model.id === 'e30-325i-coupe-manual'
            && (model.revision >= 1177 || (model.revision >= 1161 && model.revision < 1174));
        this.renderer.toneMappingExposure = coupeFinish ? 1.0 : this.detailedVisuals ? 1.04 : 1.12;
        this.scene.background = new T.Color(coupeFinish ? '#e9eae6' : '#eeeee7');
        const canvas = this.renderer.domElement;
        canvas.tabIndex = 0;
        canvas.setAttribute('aria-label', 'Interactive BMW model. Drag to rotate; scroll or pinch to zoom.');
        canvas.style.touchAction = 'none';
        this.host.appendChild(canvas);
        this.controls = new OrbitControls(this.camera, canvas);
        this.controls.enableDamping = false;
        this.controls.zoomSpeed = .8;
        this.controls.panSpeed = .85;
        this.controls.minDistance = .002;
        this.controls.maxDistance = 100;
        this.controls.target.set(0, .7, 0);
        this.camera.position.set(7, 3.5, 7);
        const start = () => { this.destination = null; }, change = () => this.invalidate();
        this.controls.addEventListener('start', start);
        this.controls.addEventListener('change', change);
        this.cleanup.push(() => { this.controls.removeEventListener('start', start); this.controls.removeEventListener('change', change); });
        this.scene.add(new T.HemisphereLight('#ecf1f0', '#696c6b', coupeFinish ? .45 : this.detailedVisuals ? .8 : 1.1));
        const lights = coupeFinish ? [[2.7, 8.0, 3.1, 1.75], [-4, 3, -4, .82]] : [[4, 8, 4, 3], [-4, 3, -4, 1.5]];
        for (const [index, [x, y, z, intensity]] of lights.entries()) {
            const light = new T.DirectionalLight('#ffffff', this.detailedVisuals?intensity*.72:intensity);
            light.position.set(x, y, z);
            if(this.detailedVisuals&&index===0){light.castShadow=true;light.shadow.mapSize.setScalar(matchMedia('(max-width:700px)').matches?512:1024);light.shadow.camera.left=-3.2;light.shadow.camera.right=3.2;light.shadow.camera.top=3.2;light.shadow.camera.bottom=-3.2;light.shadow.camera.near=.1;light.shadow.camera.far=20;light.shadow.normalBias=coupeFinish?.018:.008;if(this.model.studioLighting)light.shadow.radius=coupeFinish?4:3;light.shadow.bias=coupeFinish?-.0004:-.00015;this.scene.add(light.target);}
            this.scene.add(light);
            this.cleanup.push(() => light.dispose());
        }
        const generator = new T.PMREMGenerator(this.renderer);
        const studio = coupeFinish ? coupeStudio(model.revision >= 1177) : null;
        const room = studio?.scene ?? new RoomEnvironment();
        this.environment = generator.fromScene(room, coupeFinish ? .07 : .04);
        this.scene.environment = this.environment.texture;
        this.scene.environmentIntensity = coupeFinish ? .90 : this.detailedVisuals ? .65 : .55;
        if (studio) studio.dispose();
        else if (room instanceof RoomEnvironment) room.dispose();
        generator.dispose();
        const refinedE30 = model.id==='e30-325i-coupe-manual' && model.revision>=1139;
        const shadowOpacity = coupeFinish ? .24 : model.studioLighting&&!refinedE30 ? .14 : .2;
        this.floor = new T.Mesh(new T.PlaneGeometry(120, 120), this.detailedVisuals?new T.ShadowMaterial({color:'#46534d',opacity:shadowOpacity}):new T.MeshStandardMaterial({ color: '#e3e5dd', roughness: .95 }));
        this.floor.rotation.x = -Math.PI / 2;
        this.floor.position.y = this.detailedVisuals?-.008:-.03;
        this.floor.receiveShadow=this.detailedVisuals;
        this.scene.add(this.floor);
        this.originLine.visible=false;
        this.originLine.renderOrder=5;
        this.scene.add(this.originLine);
        this.bindInput();
        this.observer = new ResizeObserver(() => this.resize());
        this.observer.observe(host);
        this.resize();
        this.load();
    }
    private async load() {
        const abort = new AbortController();
        this.cleanup.push(() => abort.abort());
        try {
            const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
            for (const asset of this.model.assets) {
                this.status('Loading the vehicle model…');
                const r = await fetch(asset.url, { signal: abort.signal });
                if (!r.ok)
                    throw Error('The model could not load. Please try again.');
                const bytes = await boundedModelBytes(r, asset.bytes);
                if (bytes.byteLength !== asset.bytes)
                    throw Error('The model file is incomplete. Please retry.');
                const hash = await sha256Hex(bytes);
                if (hash !== asset.sha256)
                    throw Error('The model file did not match its published version.');
                const gltf = await loader.parseAsync(bytes, '');
                if (this.disposed) {
                    this.disposeRoot(gltf.scene);
                    return;
                }
                this.roots.push(gltf.scene);
                gltf.scene.updateMatrixWorld(true);
                for (const node of this.model.nodes.filter(n => n.assetId === asset.id)) {
                    const wrapper = new T.Group();
                    wrapper.name = node.id;
                    const matrix = new T.Matrix4().fromArray(node.matrix);
                    matrix.decompose(wrapper.position, wrapper.quaternion, wrapper.scale);
                    this.closedRotations.set(node.id,wrapper.quaternion.clone());
                    if(isRoadWheel(node.id))this.installedWheelScales.set(node.id,wrapper.scale.clone());
                    gltf.scene.traverse(o => { if (!(o instanceof T.Mesh))
                        return; let p: T.Object3D | null = o, matched = false; while (p) {
                        if (node.meshNames.includes(p.name)) {
                            matched = true;
                            break;
                        }
                        p = p.parent;
                    } if (!matched)
                        return; const originals = (Array.isArray(o.material) ? o.material : [o.material]) as T.Material[];
                    const bindings=originals.map(mat=>({assetId:asset.id,sha256:asset.sha256,nodeId:node.id,materialIndex:gltf.parser.associations.get(mat)?.materials??-1,name:mat.name}));
                    const clones=originals.map((mat,i)=>{const clone=mat.clone();clone.userData={source:mat,buildRole:node.paintSurface && ((mat.name==='Body' && bindings[i].materialIndex===0) || (asset.id==='e30:325i-exterior' && mat.name==='E30_Body_Paint')) ? 'paint' : appearanceRole(bindings[i])};return clone;});
                    const surface=splitPaintSurfaces(o.geometry,clones,bindings);
                    this.materials.push(...surface.materials);if(surface.owned)this.appearanceGeometries.push(surface.geometry);
                    const mesh=new T.Mesh(surface.geometry,surface.materials.length===1?surface.materials[0]:surface.materials); mesh.matrixAutoUpdate = false; mesh.matrix.copy(o.matrixWorld); mesh.userData.partId = node.id; wrapper.add(mesh); });
                    if (!wrapper.children.length)
                        throw Error('A component is missing from the model.');
                    this.objects.set(node.id, wrapper);
                    this.scene.add(wrapper);
                }
            }
            this.loaded = true;
            this.applyAppearance();
            void this.loadBuildWheels();
            this.update(this.view);
            if (this.view.cabin)
                this.viewpoint(this.view.cabin === 'driver' ? 'driver' : 'rear-seat');
            else if (this.view.highlights?.length)
                this.fit(this.view.highlights,this.view.highlightViewpoint);
            else {
                const scope=this.view.scope;
                const overview=cabinFloorAngles[scope] || isGearboxInspection(scope) || isEngineInspection(scope) ||
                    [engineBayScope,brakeHydraulicsScope,frontSuspensionScope,rearSuspensionScope,bodyTrimScope].includes(scope) ||
                    scope.startsWith('system:parking-brake-');
                this.fit(this.procedureFocus?this.view.selected||undefined:undefined,overview?'overview':undefined);
            }
            this.status('');
            this.invalidate();
        }
        catch (e) {
            if (!this.disposed && !abort.signal.aborted)
                this.status(e instanceof Error ? e.message : 'The model could not load.', true);
        }
    }
    setBuildAppearance(appearance:BuildAppearance|null){this.buildAppearance=appearance;this.applyAppearance();void this.loadBuildWheels();this.update(this.view);}
    private updateContactShadows() {
        // The fixed light frustum covers the installed vehicle. Displaced
        // assemblies can extend past it and cause streaked shadow edges.
        const enabled = this.detailedVisuals && this.view.explosion === 0
            && !this.view.cabin && !this.partsMoving && this.buildAppearance?.quality !== 'low';
        this.renderer.shadowMap.enabled = enabled;
        if (enabled) this.renderer.shadowMap.needsUpdate = true;
    }
    private applyAppearance(){for(const mat of this.materials)applyBuildMaterial(mat,this.buildAppearance);for(const mat of this.wheelClones)applyBuildMaterial(mat,this.buildAppearance);this.paintNodes=JSON.stringify([...this.objects].flatMap(([id,root])=>{const colors:string[]=[];root.traverse(o=>{if(o instanceof T.Mesh)for(const m of(Array.isArray(o.material)?o.material:[o.material]))if(m.userData.buildRole==='paint'&&m instanceof T.MeshStandardMaterial)colors.push(m.color.getHexString());});return colors.length?[{id,colors}]:[];}));const quality=this.buildAppearance?.quality||'balanced';this.updateContactShadows();const ratio=Math.min(devicePixelRatio,quality==='low'?1:quality==='high'?2:1.5);if(this.renderer.getPixelRatio()!==ratio){this.renderer.setPixelRatio(ratio);this.resize();}this.invalidate();}
    private clearBuildWheels(){
        for(const [id,children] of this.baseWheels){
            const wrapper=this.objects.get(id);
            if(!wrapper)continue;
            for(const child of [...wrapper.children])if(!children.includes(child))wrapper.remove(child);
            for(const child of children)child.visible=true;
        }
        this.wheelClones.forEach(mat=>mat.dispose());
        this.wheelClones=[];
        this.wheelRoots.forEach(root=>this.disposeRoot(root));
        this.wheelRoots=[];
        this.wheelPackage='reference';
        this.wheelQuality='high';
    }
    private async wheelScene(asset:WheelAsset,signal:AbortSignal){
        const response=await fetch(asset.url,{signal});
        if(!response.ok)throw Error('Wheel file unavailable');
        const bytes=await response.arrayBuffer();
        if(bytes.byteLength!==asset.bytes||bytes.byteLength>1_000_000||await sha256Hex(bytes)!==asset.sha256)
            throw Error('Wheel file did not match its reference');
        return (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes,'')).scene;
    }
    private async loadBuildWheels(){
        if(!this.loaded||this.disposed)return;
        const id=this.buildAppearance?.wheels.packageId||'reference';
        const packages:WheelPackage[]=[...localWheelPackages,...wheelPackages];
        const e30=this.model.id==='e30-325i-coupe-manual';
        const chosen=packages.find(pkg=>pkg.id===id&&(e30 ? pkg.group==='E30' : this.model.id.startsWith('e34-')&&pkg.group!=='E30'));
        const quality=this.buildAppearance?.quality==='low'&&chosen?.lodLow?'low':'high';
        const request=id+':'+quality;
        if(this.wheelRequest===request)return;
        this.wheelRequest=request;
        const generation=++this.wheelGeneration;
        this.wheelAbort?.abort();
        this.clearBuildWheels();
        this.wheelStatus='';
        this.appearanceStatus('');
        this.invalidate();
        if(!chosen)return;

        const abort=new AbortController();
        const signal=AbortSignal.any([abort.signal,AbortSignal.timeout(15000)]);
        this.wheelAbort=abort;
        this.wheelStatus='Loading wheel preview…';
        this.appearanceStatus(this.wheelStatus);
        const pending:T.Group[]=[];
        try{
            const left=await this.wheelScene(quality==='low'&&chosen.lodLow?chosen.lodLow:chosen,signal);
            pending.push(left);
            signal.throwIfAborted();
            const right=chosen.right?await this.wheelScene(quality==='low'&&chosen.right.lodLow?chosen.right.lodLow:chosen.right,signal):left;
            if(right!==left)pending.push(right);
            if(this.disposed||generation!==this.wheelGeneration||signal.aborted)return;
            this.wheelRoots=pending.splice(0);
            for(const root of this.wheelRoots)root.updateMatrixWorld(true);
            for(const [nodeId,wrapper] of this.objects){
                if(!isRoadWheel(nodeId))continue;
                const base=this.baseWheels.get(nodeId)||[...wrapper.children];
                this.baseWheels.set(nodeId,base);
                base.forEach(child=>child.visible=false);
                const group=new T.Group();
                group.name='build-wheel:'+id;
                group.scale.setScalar(chosen.normalization);
                if(e30&&nodeId.includes('-left:'))group.rotation.y=Math.PI;
                const root=nodeId.endsWith('-right')?right:left;
                root.traverse(object=>{
                    if(!(object instanceof T.Mesh))return;
                    const sourceMats=(Array.isArray(object.material)?object.material:[object.material]) as T.Material[];
                    const mats=sourceMats.map(source=>{
                        const mat=source.clone();
                        mat.userData={source,buildRole:source.name==='original-alloy'?'originalWheel':null};
                        this.wheelClones.push(mat);
                        applyBuildMaterial(mat,this.buildAppearance);
                        return mat;
                    });
                    const mesh=new T.Mesh(object.geometry,mats.length===1?mats[0]:mats);
                    mesh.matrixAutoUpdate=false;
                    mesh.matrix.copy(object.matrixWorld);
                    mesh.userData.partId=nodeId;
                    group.add(mesh);
                });
                wrapper.add(group);
            }
            this.wheelPackage=id;
            this.wheelQuality=quality;
            this.wheelStatus='';
            this.appearanceStatus('');
            this.update(this.view);
        }catch{
            if(!this.disposed&&generation===this.wheelGeneration){
                this.clearBuildWheels();
                this.wheelRequest='';
                this.wheelStatus='Wheel preview unavailable. Your selection is saved.';
                this.appearanceStatus(this.wheelStatus);
                this.invalidate();
            }
        }finally{
            pending.forEach(root=>this.disposeRoot(root));
        }
    }
    setProcedureFocus(enabled:boolean){this.procedureFocus=enabled;this.update(this.view);}
    update(view: ReaderView) {
        const previous = this.view, reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
        const animate = this.loaded && previous.scope === view.scope && !view.cabin && !previous.cabin && !reducedMotion && (this.partsMoving || previous.explosion !== view.explosion);
        this.view = view;
        const containers=view.internals?enclosingParts(this.model,view.selected):new Set<string>();
        const highlights=new Set(view.highlights);
        const highlightGhost = highlights.size>0 && view.shell==='ghost';
        const cutaway = gearboxCutaway(view), engineSection=engineCutaway(view);
        this.renderer.localClippingEnabled = cutaway||engineSection;
        const visible = new Set(visibleNodes(this.model, animate && view.explosion === 0 ? {...view,explosion:previous.explosion} : view).map(n => n.id)), spread = offsets(this.model, view);
        for (const [id, object] of this.objects) {
            object.visible = visible.has(id);
            const n = this.model.nodes.find(n => n.id === id)!, base = new T.Vector3(n.matrix[12], n.matrix[13], n.matrix[14]);
            const target = base.add(new T.Vector3(...spread.get(id)||[0,0,0]));
            const appearance=this.buildAppearance;
            const installedScale=this.installedWheelScales.get(id);
            if(installedScale){
                object.scale.copy(installedScale);
                if(appearance)object.scale.multiply(new T.Vector3(appearance.wheels.scale,appearance.wheels.scale,appearance.wheels.widthScale));
            }
            if(appearance){
                const e30=this.model.id==='e30-325i-coupe-manual';
                target.y+=(e30?.300:.32375)*(appearance.wheels.scale-1);
                if(!installedScale&&/^(?:e34body|e34sys|e34trim|e34bay|e34brake|e34chassis|e34hvac|touring|e30body|e30trim|e30hvac):|^e30assembly:(?:cabin(?:-floor)?|cockpit|front-seats|rear-seats|headlining|luggage):/.test(id))
                    target.y+=appearance.rideHeight*.045;
            }
            this.partTargets.set(id, target);
            if (!animate) object.position.copy(target);
            object.traverse(o => { if (!(o instanceof T.Mesh))
                return; const mats = (Array.isArray(o.material) ? o.material : [o.material]) as T.Material[]; for (const mat of mats) {
                const source = mat.userData.source as T.Material;
                const active = view.selected === id || highlights.has(id);
                const section = cutaway&&n.gearbox?.section ? this.gearboxSectionPlanes
                    : engineSection&&n.engine==='section' ? this.engineSectionPlanes : null;
                const ghost = !section && (highlightGhost ? !active : (
                    containers.has(id) || (this.procedureFocus&&!!view.selected&&id!==view.selected) || (view.shell === 'ghost' && isExteriorNode(n))
                    || (view.internals && /^(?:m50|m60b30|m60b40|m30b35):(?:block|cylinder-head(?::[12])?|valve-cover(?::[12])?|coil-cover(?::[12])?|oil-pan|upper-oil-pan|lower-oil-pan|lower-timing-cover|timing-cover|upper-timing-cover:[12]|intake-cover)$/.test(id))
                    || (view.internals && !isGearboxInspection(view.scope) && /^e34auto:(?:case|bellhousing|adapter-case|extension|pan-main|pan-secondary|converter)$/.test(id))
                    || (view.internals && /^(?:getrag|zf)-.*:(?:case|bellhousing|extension|torque-converter)$/.test(id))
                ));
                mat.clippingPlanes = section;
                mat.clipShadows = !!section;
                const glazing = !!(view.cabin && n.cabinGlazing && source.transparent);
                mat.opacity = glazing ? .08 : ghost && !active ? Math.min(highlightGhost ? .09 : .16, source.opacity) : source.opacity;
                const side = glazing ? T.DoubleSide : source.side;
                if (mat.side !== side) {
                    mat.side = side;
                    mat.needsUpdate = true;
                }
                mat.transparent = source.transparent || ghost || glazing;
                mat.depthWrite = !(ghost || glazing) && source.depthWrite;
                if (mat instanceof T.MeshStandardMaterial) {
                    mat.emissive.set(active ? '#bd4d28' : '#000000');
                    mat.emissiveIntensity = highlights.has(id) ? .65 : active ? .25 : 0;
                    mat.envMapIntensity = this.coupeFinish && source.name === 'Clear auto glass' ? 1.1 : .7;
                }
            }
            const solid = mats.some(mat => !mat.transparent && mat.opacity > .95);
            const outerSkin = this.coupeFinish && n.paintSurface &&
                (id.startsWith('e30body:') || id.startsWith('e30trim:lid-'));
            o.receiveShadow = this.detailedVisuals && (!this.coupeFinish || (solid && !outerSkin));
            o.castShadow = this.detailedVisuals && solid;
        });
        }
        this.partsMoving = animate;
        this.openingsMoving=this.updateOpenings(0,reducedMotion||!canOpenPanels(view),!animate);
        this.updateContactShadows();
        const selected=this.model.nodes.find(n=>n.id===view.selected),delta=selected&&spread.get(selected.id);
        this.originLine.visible=!!selected&&visible.has(selected.id)&&!!delta&&delta.some(c=>Math.abs(c)>.00001);
        if(this.originLine.visible&&selected&&delta){const origin=installedBounds(selected).getCenter(new T.Vector3());this.originLine.geometry.dispose();this.originLine.geometry=new T.BufferGeometry().setFromPoints([origin,origin.clone().add(new T.Vector3(...delta))]);this.originLine.computeLineDistances();}
        this.floor.visible = view.explosion === 0 && !view.cabin && !this.partsMoving;
        this.controls.enableRotate = !view.cabin;
        this.controls.enablePan = !view.cabin;
        this.controls.enableZoom = !view.cabin;
        this.keys.clear();
        this.invalidate();
    }
    viewpoint(preset: Viewpoint) { if (preset === 'driver' || preset === 'rear-seat') {
        const defaultPose = preset === 'driver' ? { position: [-.42688, 1.09913, -.41437], target: [.25988, .98360, -.12915] } : { position: [-1.19326, 1.13858, 0], target: [.25988, .98360, 0] };
        const pose = this.model.cabin?.[preset === 'driver' ? 'driver' : 'rear'] || defaultPose;
        this.destination = null;
        this.camera.position.fromArray(pose.position);
        this.controls.target.fromArray(pose.target);
        this.camera.fov = this.model.cabin ? 64 : 55;
        this.camera.updateProjectionMatrix();
        this.controls.update();
        this.invalidate();
        return;
    } this.camera.fov = 42; this.camera.updateProjectionMatrix(); this.fit(undefined, preset); }
    fit(focus?: string|readonly string[], preset?: Viewpoint) {
        if (this.view.cabin) return;
        const directions: Partial<Record<Viewpoint,Vec>> = {overview:[1.2,.7,1.3],front:[1.8,.35,0],rear:[-1.8,.35,0],left:[0,.3,-1.8],right:[0,.3,1.8],top:[0,2,.001],underbody:[.2,-1.4,.2]};
        const direction = preset ? new T.Vector3(...directions[preset]||[1.2,.7,1.3]).normalize() : this.camera.position.clone().sub(this.controls.target).normalize();
        if(preset==='overview'&&this.view.scope==='vehicle'&&!focus)direction.set(1,.38,1.8).normalize();
        if(preset==='overview'&&!focus){
            if(isGearboxInspection(this.view.scope))direction.set(.20,.26,1.75).normalize();
            if(this.view.scope===engineBayScope)direction.set(.75,1.75,1.05).normalize();
            if(this.view.scope===brakeHydraulicsScope)direction.set(.68,1,-1.25).normalize();
            if(this.view.scope==='system:parking-brake-left')direction.set(.45,.35,-1.55).normalize();
            if(this.view.scope==='system:parking-brake-right')direction.set(.45,.35,1.55).normalize();
            if(this.view.scope===frontSuspensionScope)direction.set(-1.16,.56,1.55).normalize();
            if(this.view.scope===rearSuspensionScope)direction.set(1.23,.58,1.45).normalize();
            if(isEngineInspection(this.view.scope)){
                const engineAngles:Record<string,Vec>={
                    'system:m50-head':[.65,1.5,1.3],
                    'system:m50-timing':[1.8,.38,.50],
                    'system:m50-oil':[.72,.50,1.6],
                };
                direction.set(...(engineAngles[this.view.scope]||[.37,.52,1.75])).normalize();
            }
            if(this.view.scope===bodyTrimScope)direction.set(.47,.46,1.72).normalize();
            const cabinFloorAngle=cabinFloorAngles[this.view.scope];
            if(cabinFloorAngle)direction.set(...cabinFloorAngle).normalize();
        }
        const frame=referenceFrame(this.model,this.view,direction.toArray() as Vec,this.camera.aspect,this.camera.fov,focus);
        if(!frame)return;
        this.destination={position:new T.Vector3(...frame.position),target:new T.Vector3(...frame.target)};this.invalidate();
    }
    cameraPose(): ModelCamera { return { position: this.camera.position.toArray() as Vec, target: this.controls.target.toArray() as Vec, fov: this.camera.fov }; }
    restoreCamera(pose: ModelCamera) { this.destination = null; this.camera.position.fromArray(pose.position); this.controls.target.fromArray(pose.target); this.camera.fov = pose.fov; this.camera.updateProjectionMatrix(); this.controls.update(); this.invalidate(); }
    private resize() {
        if (this.disposed) return;
        const { width, height } = this.host.getBoundingClientRect();
        if (!width || !height) return;
        this.renderer.setSize(width, height, false);
        this.controls.rotateSpeed = T.MathUtils.clamp(height / width, .25, .85);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.invalidate();
    }
    private bindInput() {
        const canvas = this.renderer.domElement;
        const on = (target: EventTarget, event: string, handler: EventListener, options?: AddEventListenerOptions) => { target.addEventListener(event, handler, options); this.cleanup.push(() => target.removeEventListener(event, handler, options)); };
        on(canvas, 'pointerdown', ((e: PointerEvent) => { this.activePointers.add(e.pointerId); if(this.activePointers.size>1){this.pointer=null;return;} canvas.focus({ preventScroll: true }); this.pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, button: e.button }; if (this.view.cabin) {
            this.destination = null;
            canvas.setPointerCapture(e.pointerId);
        } }) as EventListener);
        on(window, 'pointermove', ((e: PointerEvent) => { const p = this.pointer; if (!p || p.id !== e.pointerId || !this.view.cabin || p.button !== 0)
            return; const direction = this.controls.target.clone().sub(this.camera.position), distance = Math.max(direction.length(), .01); direction.normalize(); const yaw = Math.atan2(direction.x, direction.z) - (e.clientX - p.x) * .003, pitch = T.MathUtils.clamp(Math.asin(direction.y) + (e.clientY - p.y) * .003, -Math.PI / 2 + .01, Math.PI / 2 - .01); direction.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); this.controls.target.copy(this.camera.position).addScaledVector(direction, distance); this.camera.lookAt(this.controls.target); p.x = e.clientX; p.y = e.clientY; this.invalidate(); }) as EventListener);
        on(window, 'pointerup', ((e: PointerEvent) => { this.activePointers.delete(e.pointerId); const p = this.pointer; if(p?.id===e.pointerId)this.pointer=null; if (!p || p.id !== e.pointerId || p.button !== 0 || Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 5)
            return; this.pick(e.clientX, e.clientY, false); }) as EventListener);
        on(window, 'pointercancel', ((e: PointerEvent) => { this.activePointers.delete(e.pointerId); if(this.pointer?.id===e.pointerId)this.pointer=null; }) as EventListener);
        on(canvas, 'dblclick', ((e: MouseEvent) => this.pick(e.clientX, e.clientY, true)) as EventListener);
        on(canvas, 'wheel', ((e: WheelEvent) => { if (!this.view.cabin)
            return; e.preventDefault(); this.camera.fov = T.MathUtils.clamp(this.camera.fov + Math.sign(e.deltaY) * 2, 42, 75); this.camera.updateProjectionMatrix(); this.invalidate(); }) as EventListener, { passive: false });
        on(window, 'keydown', ((e: KeyboardEvent) => { if (!this.view.cabin || document.activeElement !== canvas || !['w', 'a', 's', 'd', 'q', 'e'].includes(e.key.toLowerCase()))
            return; e.preventDefault(); this.keys.add(e.key.toLowerCase()); this.invalidate(); }) as EventListener);
        on(window, 'keyup', ((e: KeyboardEvent) => { this.keys.delete(e.key.toLowerCase()); }) as EventListener);
        on(window, 'blur', () => { this.keys.clear(); this.pointer = null; this.activePointers.clear(); });
        on(canvas, 'webglcontextlost', ((e: Event) => { e.preventDefault(); this.status('The 3D view was interrupted. Reload the model to continue.', true); }) as EventListener);
    }
    private pick(x: number, y: number, isolate: boolean) {
        const r = this.renderer.domElement.getBoundingClientRect();
        if (x < r.left || y < r.top || x > r.right || y > r.bottom) return;
        const ray = new T.Raycaster();
        ray.setFromCamera(new T.Vector2((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1),this.camera);
        const hits = ray.intersectObjects([...this.objects.values()].filter(o=>o.visible),true);
        const selectable = ({object,face,point}:T.Intersection)=>{
            if(!(object instanceof T.Mesh)||!object.userData.partId)return false;
            const material = Array.isArray(object.material) ? object.material[face?.materialIndex??0] : object.material;
            return !material?.clippingPlanes?.some((plane:T.Plane)=>plane.distanceToPoint(point)<0);
        };
        const highlights=this.view.shell==='ghost'?this.view.highlights:undefined;
        const hit = (highlights?.length ? hits.find(candidate=>highlights.includes(candidate.object.userData.partId)&&selectable(candidate)) : undefined)
            ?? hits.find(selectable);
        if(!hit) return;
        const id = hit.object.userData.partId;
        if (this.openPanel && canOpenPanels(this.view) && this.openingMembers.has(id) && !isolate) {
            this.openPanel(id);
        } else {
            this.select(id, isolate);
        }
    }
    private updateOpenings(dt:number,immediate=false,applyPositions=true) {
        const active=canOpenPanels(this.view), open=this.view.openPanels??[];
        let moving=false;
        const axis = new T.Vector3(), pivot = new T.Vector3(), shift = new T.Vector3();
        const rotations = new Map<string, T.Quaternion>();
        const transforms = new Map<string, T.Matrix4>();
        const panels = this.model.openingPanels ?? [];
        for (const panel of panels) {
            const target = active && open.includes(panel.id) && (!panel.requires || open.includes(panel.requires)) ? 1 : 0;
            const previous = this.openingProgress.get(panel.id) ?? 0;
            const next = immediate ? target : T.MathUtils.damp(previous, target, 16, dt);
            const progress = Math.abs(next - target) < .001 ? target : next;
            moving ||= progress !== target;
            this.openingProgress.set(panel.id, progress);
            const slideProgress = panel.angle === 0 ? progress : Math.min(progress * 2.4, 1);
            const turnProgress = panel.slide.some(Boolean) ? Math.max(0, (progress - .22) / .78) : progress;
            const rotation = new T.Quaternion().setFromAxisAngle(
                axis.fromArray(panel.axis).normalize(), T.MathUtils.degToRad(panel.angle) * turnProgress,
            );
            pivot.fromArray(panel.pivot);
            const root = this.panelNodes.get(panel.id);
            const rootTarget = this.partTargets.get(panel.id);
            if (root && rootTarget && active) pivot.y += rootTarget.y - root.matrix[13];
            shift.fromArray(panel.slide).multiplyScalar(slideProgress);
            if (panel.dropBeforeSlide) {
                shift.x = panel.slide[0] * Math.max(0, (progress - .27) / .73);
                shift.y = panel.slide[1] * Math.min(1, progress / .27);
            }
            const transform = new T.Matrix4().makeRotationFromQuaternion(rotation);
            transform.setPosition(shift.add(pivot).sub(pivot.clone().applyQuaternion(rotation)));
            transforms.set(panel.id, transform);
            rotations.set(panel.id, rotation);
        }
        for (const panel of panels) {
            const transform = transforms.get(panel.id)!.clone();
            const rotation = rotations.get(panel.id)!.clone();
            for (const parent of this.openingParents.get(panel.id) ?? []) {
                transform.premultiply(transforms.get(parent)!);
                rotation.premultiply(rotations.get(parent)!);
            }
            for (const id of this.openingMembers.get(panel.id) ?? []) {
                const object = this.objects.get(id), base = this.partTargets.get(id), closed = this.closedRotations.get(id);
                if (!object || !base || !closed) continue;
                object.quaternion.copy(closed).premultiply(rotation);
                if (applyPositions) object.position.copy(base).applyMatrix4(transform);
            }
        }
        return moving;
    }
    private invalidate = () => { if (!this.frame && !this.disposed)
        this.frame = requestAnimationFrame(this.render); };
    private render = (now: number) => {
        this.frame = 0;
        if (this.disposed)
            return;
        const dt = Math.min(.05, this.last ? (now - this.last) / 1000 : .016);
        this.last = now;
        let moving = false;
        if (this.partsMoving) {
            let unsettled = false;
            const fraction = 1 - Math.exp(-dt / .055);
            for (const [id, object] of this.objects) {
                const target = this.partTargets.get(id); if (!target) continue;
                object.position.lerp(target, fraction);
                if (object.position.distanceToSquared(target) > 1e-8) unsettled = true;
                else object.position.copy(target);
            }
            if (!unsettled) { const visible = new Set(visibleNodes(this.model,this.view).map(n=>n.id)); for (const [id,object] of this.objects) object.visible = visible.has(id); }
            this.partsMoving = unsettled;
            if (!unsettled) this.updateContactShadows();
            this.floor.visible = !unsettled && this.view.explosion === 0 && !this.view.cabin;
            moving ||= unsettled;
        }
        if(this.openingsMoving&&!this.partsMoving) {
            this.openingsMoving=this.updateOpenings(dt);
            moving||=this.openingsMoving;
        }
        if (this.destination) {
            this.camera.position.lerp(this.destination.position, Math.min(1, dt * 8));
            this.controls.target.lerp(this.destination.target, Math.min(1, dt * 8));
            this.controls.update();
            if (this.camera.position.distanceToSquared(this.destination.position) + this.controls.target.distanceToSquared(this.destination.target) < .0000001)
                this.destination = null;
            else
                moving = true;
        }
        if (this.view.cabin && this.keys.size) {
            const direction = this.controls.target.clone().sub(this.camera.position).normalize(), right = new T.Vector3().crossVectors(direction, this.camera.up).normalize(), move = new T.Vector3();
            if (this.keys.has('w'))
                move.add(direction);
            if (this.keys.has('s'))
                move.sub(direction);
            if (this.keys.has('a'))
                move.sub(right);
            if (this.keys.has('d'))
                move.add(right);
            if (this.keys.has('q'))
                move.y--;
            if (this.keys.has('e'))
                move.y++;
            move.normalize().multiplyScalar(dt * .35);
            const limits = this.model.cabin?.movement;
            if (limits) {
                const position = this.camera.position.clone().add(move).clamp(new T.Vector3(...limits.min), new T.Vector3(...limits.max));
                move.copy(position.sub(this.camera.position));
            }
            this.camera.position.add(move);
            this.controls.target.add(move);
            this.controls.update();
            moving = true;
        }
        if (this.originLine.visible && this.view.selected) {
            const object = this.objects.get(this.view.selected), node = this.model.nodes.find(n=>n.id===this.view.selected);
            if (object && node) { const origin = installedBounds(node).getCenter(new T.Vector3()), delta = object.position.clone().sub(new T.Vector3(node.matrix[12],node.matrix[13],node.matrix[14]));
                const points = this.originLine.geometry.getAttribute('position') as T.BufferAttribute;
                points.setXYZ(1,origin.x+delta.x,origin.y+delta.y,origin.z+delta.z); points.needsUpdate=true; this.originLine.geometry.computeBoundingSphere(); this.originLine.computeLineDistances(); }
        }
        this.renderer.render(this.scene, this.camera);
        const d = this.renderer.domElement.dataset;
        d.visualDetail=this.detailedVisuals?'shaped-parts':'accepted-reference';d.contactShadows=String(this.renderer.shadowMap.enabled);d.gpuDrawCalls=String(this.renderer.info.render.calls);d.buildPaintNodes=this.paintNodes;
        d.buildWheelPackage=this.wheelPackage;d.buildWheelQuality=this.wheelQuality;d.gpuTriangles=String(this.renderer.info.render.triangles);d.buildWheelStatus=this.wheelStatus;d.buildPaint=this.buildAppearance?.paint.enabled?this.buildAppearance.paint.color:'reference';d.buildMaterials=String(this.materials.filter(m=>m.userData.buildRole).length);d.gpuGeometries=String(this.renderer.info.memory.geometries);d.gpuTextures=String(this.renderer.info.memory.textures);
        d.cameraPosition = this.camera.position.toArray().map(n => n.toFixed(5)).join(',');
        d.cameraTarget = this.controls.target.toArray().map(n => n.toFixed(5)).join(',');
        d.explosion = String(this.view.explosion);
        if(this.view.highlights?.length) d.highlightedParts = this.view.highlights.filter(id=>this.objects.get(id)?.visible).join(',');
        else delete d.highlightedParts;
        d.gearboxCutaway = String(gearboxCutaway(this.view));
        d.engineCutaway=String(engineCutaway(this.view));
        d.partsMoving = String(this.partsMoving);
        d.openPanels = [...this.openingProgress].filter(([,progress])=>progress>.999).map(([id])=>id).join(',');
        d.panelsMoving = String(this.openingsMoving);
        d.modelRevision = String(this.model.revision);
        d.renderedParts = String([...this.objects.values()].filter(o => o.visible).length);
        d.renderFrames = String(Number(d.renderFrames || 0) + 1);
        const samples = new Set(['wheel:front-left','wheel:rear-right','e34body:front-door-left','e34body:front-door-right','e34body:rear-door-left','e34body:rear-door-right','e30body:door-left','e30body:door-right','e30body:hood','e30body:trunk','e30body:front-fender-left','e30body:front-fender-right','e30body:rear-quarter-left','e30body:rear-quarter-right','e30body:roof','e30body:front-bumper','e30body:rear-bumper','m50:block','m50:cylinder-head','m50:piston:1','m50:water-pump']);
        d.sampledPartPositions = JSON.stringify([...this.objects.entries()].filter(([id, o]) => o.visible && samples.has(id)).map(([id, o]) => ({ id, position: o.position.toArray().map(n => +n.toFixed(6)) })));
        if (moving)
            this.invalidate();
    };
    private disposeRoot(root: T.Object3D) { const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>(); root.traverse(o => { if (!(o instanceof T.Mesh))
        return; geometries.add(o.geometry); for (const mat of (Array.isArray(o.material) ? o.material : [o.material]) as T.Material[]) {
        materials.add(mat);
        for (const value of Object.values(mat))
            if (value instanceof T.Texture)
                textures.add(value);
    } }); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => { const source = t.source?.data as {
        close?: () => void;
    } | null; source?.close?.(); t.dispose(); }); }
    dispose() { this.disposed = true; if (this.frame)
        cancelAnimationFrame(this.frame); this.wheelGeneration++;this.wheelAbort?.abort();this.clearBuildWheels();this.observer.disconnect(); this.cleanup.forEach(fn => fn()); this.controls.dispose(); this.materials.forEach(m => m.dispose()); this.appearanceGeometries.forEach(g=>g.dispose()); this.roots.forEach(r => this.disposeRoot(r)); this.floor.geometry.dispose(); (this.floor.material as T.Material).dispose(); this.originLine.geometry.dispose();(this.originLine.material as T.Material).dispose();this.environment?.dispose(); this.renderer.dispose(); this.renderer.domElement.remove(); this.objects.clear(); }
}
