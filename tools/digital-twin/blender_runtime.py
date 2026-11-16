"""Blender background import + deterministic runtime LOD export.
Called only by asset_pipeline.py after source/license registration validation.
Never scales unknown units to assumed BMW dimensions. Leaves raw source intact.
"""
import bpy,sys
from pathlib import Path
source,output,units=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.read_factory_settings(use_empty=True)
ext=Path(source).suffix.lower()
if ext in ['.glb','.gltf']:bpy.ops.import_scene.gltf(filepath=source)
elif ext=='.obj':bpy.ops.wm.obj_import(filepath=source)
elif ext=='.fbx':bpy.ops.import_scene.fbx(filepath=source)
elif ext=='.stl':bpy.ops.wm.stl_import(filepath=source)
elif ext=='.ply':bpy.ops.wm.ply_import(filepath=source)
else:raise ValueError('Unsupported Blender import format')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not meshes:raise ValueError('No mesh geometry; reconstruct the point cloud before export')
if units=='mm':
    # Importers may carry their own scale; registration review must resolve it.
    for o in bpy.context.scene.objects:
        if o.parent is None:o.scale=tuple(x*.001 for x in o.scale);o.location=tuple(x*.001 for x in o.location)
Path(output).parent.mkdir(parents=True,exist_ok=True)
for image in bpy.data.images:
    if max(image.size,default=0)>2048:
        ratio=2048/max(image.size);image.scale(max(1,int(image.size[0]*ratio)),max(1,int(image.size[1]*ratio)))
modifiers=[]
for name,ratio in [('high',1.0),('medium',.5),('low',.2)]:
    for o,m in modifiers:o.modifiers.remove(m)
    modifiers=[]
    if ratio<1:
        for o in meshes:
            m=o.modifiers.new('Runtime LOD','DECIMATE');m.ratio=ratio;modifiers.append((o,m))
    bpy.ops.export_scene.gltf(filepath=output+'-'+name+'.glb',export_format='GLB',export_apply=True,export_extras=True)
