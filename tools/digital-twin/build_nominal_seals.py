"""Original mathematical circular-seal meshes. Source recipes remain dimensioned JSON.
GLB units are metres. This does not establish BMW material, tolerances or fitment.
"""
import hashlib,json,math,struct
from pathlib import Path

def torus_glb(part_id,inside_mm,section_mm,segments=64,sides=16):
    if inside_mm<=0 or section_mm<=0 or inside_mm<section_mm:raise ValueError('Invalid nominal ring dimensions')
    major=(inside_mm+section_mm)/2000;minor=section_mm/2000
    positions=[];normals=[];indices=[]
    for i in range(segments+1):
        u=i/segments*2*math.pi
        for j in range(sides+1):
            v=j/sides*2*math.pi;c=math.cos(v);s=math.sin(v)
            positions.extend([(major+minor*c)*math.cos(u),minor*s,(major+minor*c)*math.sin(u)])
            normals.extend([c*math.cos(u),s,c*math.sin(u)])
    for i in range(segments):
        for j in range(sides):
            a=i*(sides+1)+j;b=a+sides+1
            indices.extend([a,a+1,b,b,a+1,b+1])
    vertex_data=struct.pack('<'+'f'*len(positions),*positions);normal_data=struct.pack('<'+'f'*len(normals),*normals);index_data=struct.pack('<'+'H'*len(indices),*indices)
    binary=vertex_data+normal_data+index_data;binary+=b'\0'*(-len(binary)%4)
    outer=major+minor
    doc={'asset':{'version':'2.0','generator':'E34 Collective nominal-seal pipeline v1'},'scene':0,'scenes':[{'nodes':[0]}],'nodes':[{'name':'part:'+part_id,'mesh':0,'extras':{'partId':part_id,'nominalInsideDiameterMm':inside_mm,'nominalCrossSectionMm':section_mm,'accuracy':'illustrative','installedGeometryVerified':False}}],'meshes':[{'primitives':[{'attributes':{'POSITION':0,'NORMAL':1},'indices':2,'material':0}]}],'materials':[{'name':'Illustrative elastomer','pbrMetallicRoughness':{'baseColorFactor':[.035,.045,.04,1],'metallicFactor':0,'roughnessFactor':.75}}],'buffers':[{'byteLength':len(binary)}],'bufferViews':[{'buffer':0,'byteOffset':0,'byteLength':len(vertex_data),'target':34962},{'buffer':0,'byteOffset':len(vertex_data),'byteLength':len(normal_data),'target':34962},{'buffer':0,'byteOffset':len(vertex_data)+len(normal_data),'byteLength':len(index_data),'target':34963}],'accessors':[{'bufferView':0,'componentType':5126,'count':len(positions)//3,'type':'VEC3','min':[-outer,-minor,-outer],'max':[outer,minor,outer]},{'bufferView':1,'componentType':5126,'count':len(normals)//3,'type':'VEC3'},{'bufferView':2,'componentType':5123,'count':len(indices),'type':'SCALAR'}]}
    js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*(-len(js)%4)
    return struct.pack('<III',0x46546c67,2,12+8+len(js)+8+len(binary))+struct.pack('<II',len(js),0x4e4f534a)+js+struct.pack('<II',len(binary),0x004e4942)+binary

def build():
    root=Path(__file__).resolve().parents[2];manifest=json.loads((root/'data/digital-twin/nominal-seals.json').read_text());runtime=root/'public/models/nominal-seals';masters=root/'outputs/digital-twin/nominal-seals';runtime.mkdir(parents=True,exist_ok=True);masters.mkdir(parents=True,exist_ok=True)
    output=[]
    for seal in manifest['seals']:
        files=[]
        for level,segments,sides in [('high',128,24),('medium',64,16),('low',32,8)]:
            data=torus_glb(seal['partId'],seal['insideDiameterMm'],seal['crossSectionMm'],segments,sides);name=seal['number']+'-'+level+'.glb';target=(masters if level=='high' else runtime)/name;target.write_bytes(data);files.append({'level':level,'path':str(target.relative_to(root)),'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),'triangles':segments*sides*2})
        output.append({'partId':seal['partId'],'files':files})
    (root/'data/digital-twin/nominal-seal-build.json').write_text(json.dumps({'pipelineVersion':1,'geometryClaims':'Nominal circular dimension interpretation only; no manufacturer verification','assets':output},indent=2)+'\n')
    (runtime/'LICENSE.md').write_text('# Original nominal seal geometry\n\nCreated by E34 Collective from catalog-listed numeric dimensions using an original torus generator. Catalog A×B is interpreted as nominal inside diameter × circular cross-section. This interpretation requires technical review for each application. No manufacturer material, tolerance, installed deformation, seal groove or fitment is inferred. See the source recipes and evidence register.\n')
    print(f"Built {len(output)} nominal circular seals, three LODs each. High-resolution outputs remain outside public/.")
if __name__=='__main__':build()
