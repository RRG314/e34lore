#!/usr/bin/env python3
"""Register and index an E34 scan privately; never publish OCR or certify claims."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import sys
import subprocess
from datetime import datetime, timezone

CHAPTERS = {
 '010':'Fundamentals','020':'Maintenance','100':'Engine general','110':'Engine removal',
 '113':'Cylinder head','116':'Valvetrain','117':'Timing chain','118':'Timing belt',
 '119':'Lubrication','120':'Ignition','121':'Starting and charging','130':'Fuel injection',
 '160':'Fuel tank and pump','170':'Cooling system','180':'Exhaust','200':'Transmission general',
 '210':'Clutch','230':'Manual transmission','240':'Automatic transmission','250':'Gearshift linkage',
 '260':'Driveshaft','300':'Suspension general','310':'Front suspension','320':'Steering',
 '330':'Rear suspension','331':'Final drive','340':'Brakes','400':'Body','410':'Fenders and hood',
 '411':'Doors','412':'Trunk and tailgate','510':'Exterior trim','512':'Door windows',
 '513':'Interior trim','515':'Central locking','520':'Seats','540':'Sunroof',
 '600':'Electrical general','610':'Fuses and relays','611':'Wipers','612':'Switches',
 '620':'Instruments','630':'Exterior lighting','640':'Heating and air conditioning',
 '650':'Radio','720':'Seat belts','721':'Airbag',
}

def validate_destination(path: Path) -> Path:
    declared = path.expanduser().absolute()
    explicit_private = any(p == 'private' and not (i == 1 and sys.platform == 'darwin') for i,p in enumerate(declared.parts))
    path = declared.resolve()
    if not explicit_private or any(p in path.parts for p in ('public','dist','node_modules','src')):
        raise ValueError('OCR output must be inside an explicitly private directory, outside public/build/source assets.')
    return path

def index_pages(text: str) -> dict:
    pages = text.split('\f')
    if pages and not pages[-1].strip():
        pages.pop()
    headers = []
    for physical, page in enumerate(pages, 1):
        # Running headers only. Index entries and cross-references in body text never establish a boundary.
        lines = [line.strip() for line in page.splitlines() if line.strip()][:2]
        found = None
        for line in lines:
            for match in re.finditer(r'\b(\d{3})\s*[-–]\s*(\d{1,2})\b', line):
                code, printed = match.group(1), int(match.group(2))
                if code in CHAPTERS:
                    found = {'chapter': code,'printedPage': printed,'pdfPage': physical}
                    break
            if found:
                break
        if found:
            headers.append(found)
    grouped = {}
    for h in headers:
        grouped.setdefault(h['chapter'], []).append(h)
    chapters = []
    for code, rows in grouped.items():
        chapters.append({'id':code,'title':CHAPTERS[code],'pdfStart':rows[0]['pdfPage'],
                         'pdfEnd':rows[-1]['pdfPage'],'headerPageCount':len(rows),
                         'printedPages':[r['printedPage'] for r in rows],
                         'reviewStatus':'header-indexed','technicalClaimsVerified':False})
    chapters.sort(key=lambda c:c['pdfStart'])
    issues = []
    for previous,current in zip(chapters,chapters[1:]):
        if current['pdfStart']<=previous['pdfEnd']:
            issues.append('Noncontiguous or overlapping headers: '+previous['id']+' / '+current['id'])
    return {'pdfPageCount':len(pages),'chapters':chapters,'issues':issues,
            'missingChapters':sorted(set(CHAPTERS)-set(grouped))}

def import_pdf(pdf: Path, private_dir: Path, title: str, publisher: str) -> dict:
    private_dir = validate_destination(private_dir)
    pdf = pdf.expanduser().resolve(strict=True)
    if not shutil.which('pdftotext'):
        raise RuntimeError('pdftotext is required. Install Poppler before importing.')
    with pdf.open('rb') as source:
        digest = hashlib.file_digest(source,'sha256').hexdigest()
    batch = private_dir/digest[:16]
    manifest_path = batch/'manifest.json'
    if manifest_path.exists():
        existing = json.loads(manifest_path.read_text())
        if existing['sha256'] != digest:
            raise RuntimeError('Batch identity conflict; no existing files were changed.')
        return existing
    result = subprocess.run(['pdftotext','-layout',str(pdf),'-'],capture_output=True,check=True)
    text = result.stdout.decode('utf-8',errors='replace')
    index = index_pages(text)
    manifest = {'batchId':digest[:16],'sha256':digest,'title':title,'publisher':publisher,
                'sourceFilename':pdf.name,'registeredAt':datetime.now(timezone.utc).isoformat(),
                'rightsStatus':'Private supplied source; publication permission not established',
                'extractionStatus':'completed','publicationStatus':'private',
                'technicalReviewStatus':'pending','index':index}
    batch.mkdir(parents=True,exist_ok=False)
    (batch/'ocr.txt').write_text(text)
    (batch/'index.json').write_text(json.dumps(index,indent=2)+'\n')
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    (batch/'audit.jsonl').write_text(json.dumps({'event':'private_import_completed','sha256':digest,
        'time':manifest['registeredAt'],'issues':index['issues'],'publicAssetsWritten':0})+'\n')
    return manifest

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--pdf',type=Path,required=True)
    parser.add_argument('--private-dir',type=Path,required=True)
    parser.add_argument('--title',default='BMW 5 Series (E34) Service Manual')
    parser.add_argument('--publisher',default='Not established')
    args=parser.parse_args()
    manifest=import_pdf(args.pdf,args.private_dir,args.title,args.publisher)
    print(json.dumps({'batchId':manifest['batchId'],'pages':manifest['index']['pdfPageCount'],
                      'chapters':len(manifest['index']['chapters']),'issues':manifest['index']['issues'],
                      'technicalReview':'pending','publicAssetsWritten':0}))

if __name__=='__main__':
    main()
