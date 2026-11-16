"""Run with FreeCADCmd: freecad_step.py source.step output-directory.
Preserves each top-level solid as a separate STL for reviewed semantic mapping.
No automatic part identity or scale verification is inferred.
"""
import sys,json
from pathlib import Path
import FreeCAD,Part,Mesh
source=Path(sys.argv[-2]);output=Path(sys.argv[-1]);output.mkdir(parents=True,exist_ok=True)
shape=Part.read(str(source));records=[]
for i,solid in enumerate(shape.Solids):
    name='solid-'+str(i+1)+'.stl';solid.exportStl(str(output/name));records.append({'file':name,'sourceSolidIndex':i,'partId':None,'reviewState':'missing','units':'mm'})
(output/'segmentation-review.json').write_text(json.dumps(records,indent=2))
