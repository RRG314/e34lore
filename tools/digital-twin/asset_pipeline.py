"""Reproducible asset registration, embedded GLB validation and tool preflight.
Raw inputs stay outside public/. Geometry claims require separate review records.
"""
import argparse, hashlib, json, shutil, struct, subprocess, sys
from pathlib import Path
FORMATS={'.glb','.gltf','.obj','.fbx','.stl','.step','.stp','.ply','.xyz','.pcd'}
MAX_RUNTIME_BYTES=100*1024*1024

def inspect_glb(path):
    if Path(path).stat().st_size>MAX_RUNTIME_BYTES: raise ValueError("Runtime GLB exceeds 100 MB")
    data=Path(path).read_bytes()
    if len(data)<20 or len(data)>MAX_RUNTIME_BYTES: raise ValueError('Runtime GLB must be <=100 MB and have a valid header')
    magic,version,total,size,chunk=struct.unpack_from('<5I',data)
    if magic!=0x46546c67 or version!=2 or total!=len(data) or chunk!=0x4e4f534a or size%4 or size+20>len(data): raise ValueError('Invalid GLB 2.0 structure')
    doc=json.loads(data[20:20+size])
    if doc.get('asset',{}).get('version')!='2.0': raise ValueError('glTF 2.0 required')
    if any(x.get('uri') for x in doc.get('buffers',[])+doc.get('images',[])): raise ValueError('External buffers/textures are forbidden in runtime GLB')
    triangles=0
    for mesh in doc.get('meshes',[]):
        for prim in mesh.get('primitives',[]):
            if prim.get('mode',4)==4:
                accessor=prim.get('indices',prim.get('attributes',{}).get('POSITION'))
                if accessor is not None: triangles+=doc['accessors'][accessor]['count']//3
    if triangles>1_000_000 or len(doc.get('nodes',[]))>10000: raise ValueError('Runtime geometry budget exceeded')
    return {'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data),'triangles':triangles,'meshCount':len(doc.get('meshes',[])),'nodeCount':len(doc.get('nodes',[])),'namedNodes':[n.get('name') for n in doc.get('nodes',[]) if n.get('name')]}

def validate_registration(doc):
    for field in ['id','targetIdentity','source','license','input','units','partIds','accuracy','knownGaps']:
        if field not in doc: raise ValueError('Missing registration field: '+field)
    if not doc['license'].get('evidence') or doc['license'].get('redistribution') not in ['allowed','restricted','unknown']: raise ValueError('Document license evidence and redistribution status')
    if doc['units'] not in ['m','mm','unknown']: raise ValueError('Invalid units')
    axes=['visual','dimensions','alignment','mechanical','removal']
    for axis in axes:
        state=doc['accuracy'].get(axis)
        if state not in ['missing','illustrative','source-checked','verified','disputed']: raise ValueError('Missing accuracy axis: '+axis)
        if state=='verified': raise ValueError('Registrations cannot self-certify verification; use independent database reviews')
    source=Path(doc['input'])
    if source.suffix.lower() not in FORMATS: raise ValueError('Unsupported source format')
    if not source.is_file(): raise ValueError('Source file is missing')
    if 'public' in source.resolve().parts: raise ValueError('Preserve the high-resolution source outside public/')
    return source

def run():
    p=argparse.ArgumentParser();sub=p.add_subparsers(dest='command',required=True)
    for name in ['register','convert']:
        c=sub.add_parser(name);c.add_argument('manifest');c.add_argument('--output',required=True);c.add_argument('--canonical-index')
    c=sub.add_parser('validate');c.add_argument('glb');c.add_argument('--canonical-index')
    sub.add_parser('preflight')
    args=p.parse_args()
    if args.command=='preflight':
        print(json.dumps({x:shutil.which(x) for x in ['blender','FreeCADCmd','freecadcmd','colmap','meshroom_batch']},indent=2));return
    if args.command=='validate':
        result=inspect_glb(args.glb)
        if args.canonical_index:
            identities=set(json.loads(Path(args.canonical_index).read_text()))
            unknown=[n for n in result['namedNodes'] if n.startswith('part:') and n[5:] not in identities]
            if unknown: raise ValueError('Unknown canonical part IDs: '+','.join(unknown))
        print(json.dumps(result,indent=2));return
    manifest=Path(args.manifest);doc=json.loads(manifest.read_text());source=validate_registration(doc)
    if args.canonical_index:
        identities=set(json.loads(Path(args.canonical_index).read_text()))
        if set(doc['partIds'])-identities: raise ValueError('Unregistered canonical part identity')
    if args.command=='register':
        result={**doc,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'inputBytes':source.stat().st_size,'status':'needs-review','runtimeApproved':False}
        Path(args.output).parent.mkdir(parents=True,exist_ok=True);Path(args.output).write_text(json.dumps(result,indent=2)+'\n');print('Registered source metadata; publication requires review.');return
    if doc['license']['redistribution']!='allowed': raise ValueError('Conversion for publication requires documented redistribution permission')
    if source.suffix.lower() in ['.step','.stp','.xyz','.pcd']: raise ValueError('Convert STEP with FreeCAD and reconstruct point clouds with Open3D/COLMAP first; preserve calibration and semantic component IDs. See reconstruction documentation.')
    blender=shutil.which('blender')
    if not blender: raise ValueError('Blender is not installed. Registration and GLB validation are available; conversion was not executed.')
    subprocess.run([blender,'--background','--python',str(Path(__file__).with_name('blender_runtime.py')),'--',str(source.resolve()),str(Path(args.output).resolve()),doc['units']],check=True)
    for suffix in ['-high.glb','-medium.glb','-low.glb']: inspect_glb(str(Path(args.output).resolve())+suffix)
    print('Three runtime LODs exported and checked. This does not verify dimensions or installed alignment.')
if __name__=='__main__':
    try:run()
    except (ValueError,KeyError,OSError,subprocess.CalledProcessError) as e:print(str(e),file=sys.stderr);sys.exit(1)
