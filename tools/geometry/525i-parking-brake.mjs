import {box,cylinder,lathe,ring,tube,visualMaterials as M} from './525i-visual-details.mjs';

export const parkingBrakeScope='system:parking-brakes';
const assembly='catalog-assembly-5ce1d8b0c2af9db089886824';
export const parkingBrakeSource={
  title:'BMW parking brake and brake shoes',
  url:'https://www.bmwpartsdeal.com/parts-list/1995-bmw-525i-sedan_e34/brakes_pedals/parking_brake_brake_shoes.html',
};

function returnSpring(group,y,z){
  const path=[[-.042,y-.003,z],[-.033,y,z]];
  for(let i=0;i<=96;i++){
    const t=i/96, angle=t*Math.PI*24;
    path.push([-.032+t*.064,y+Math.cos(angle)*.003,z+Math.sin(angle)*.003]);
  }
  path.push([.033,y,z],[.042,y-.003,z]);
  tube(group,path,.00105,M.steel,120);
}

export function addParkingBrakes(collect,model){
  for(const [side,sign] of [['left',1],['right',-1]]){
    const shoes=model.nodes.find(node=>node.id==='e34sys:parking-brake-shoes-'+sign);
    const prefix='e34brake:parking-'+side+'-';
    const name=side==='left'?'Left rear':'Right rear';
    const options=(numbers,note)=>({
      parentId:shoes.id,matrix:shoes.matrix,systems:[...shoes.systemIds,parkingBrakeScope,'system:parking-brake-'+side],
      catalog:[assembly,...numbers],note,visualSources:[parkingBrakeSource],
    });
    collect(shoes.id,name+' parking brake shoes',group=>{
      for(const start of [.24,Math.PI+.24]){
        const angle=Math.PI-.48;
        lathe(group,[[.060,-.002],[.077,-.002],[.077,.002],[.060,.002],[.060,-.002]],
          M.steel,'z',32,start,angle);
        lathe(group,[[.073,-.011],[.077,-.011],[.077,.011],[.073,.011],[.073,-.011]],
          M.dark,'z',32,start,angle);
        lathe(group,[[.077,-.010],[.080,-.010],[.081,-.008],[.081,.008],
          [.080,.010],[.077,.010],[.077,-.010]],M.rubber,'z',36,start+.06,angle-.12);
      }
    },{...options(['34416761294'],'The retained shoe-kit occurrence specifies Great Britain equipment. Compare the installed shoes and source conditions.'),parentId:shoes.parentId,kind:'assembly'});

    collect(prefix+'return-springs',name+' parking brake return springs',group=>{
      for(const height of [-.050,.050])returnSpring(group,height,-sign*.006);
    },options(['34410304724'],'Two return springs are shown. Match the spring kit to the assembly.'));

    collect(prefix+'hold-downs',name+' parking brake shoe hold-downs',group=>{
      for(const x of [-.067,.067]){
        cylinder(group,.002,.027,[x,0,0],M.machined,'z',18);
        for(const z of [-.009,.009])ring(group,.006,.0021,.002,[x,0,z],M.steel,'z',24);
        const path=[];
        for(let i=0;i<=48;i++){
          const t=i/48,angle=t*Math.PI*10;
          path.push([x+.004*Math.cos(angle),.004*Math.sin(angle),-.008+t*.016]);
        }
        tube(group,path,.0008,M.dark,52);
      }
    },options(['34410304724'],'Hold-down hardware is shown as part of the spring kit.'));

    collect(prefix+'adjuster',name+' parking brake star-wheel adjuster',group=>{
      cylinder(group,.004,.045,[0,.067,0],M.machined,'x',26);
      for(const x of [-.020,.020])box(group,[.011,.010,.010],[x,.067,0],M.steel,.0015);
      cylinder(group,.008,.007,[.003,.067,0],M.dark,'x',24);
      for(let i=0;i<12;i++){
        const angle=i*Math.PI/6;
        const tooth=box(group,[.007,.003,.004],[.003,.067+.008*Math.cos(angle),.008*Math.sin(angle)],M.steel,.0005);
        tooth.rotation.x=angle;
      }
      for(let i=0;i<5;i++)ring(group,.0046,.0034,.001,[.010+i*.002,.067,0],M.steel,'x',20);
    },options(['34416851437','34411163400'],'The catalog lists two adjusting screws. Check the date and replacement conditions.'));

    collect(prefix+'expanding-lock',name+' parking brake expanding lock',group=>{
      box(group,[.044,.010,.013],[0,-.068,0],M.dark,.002);
      for(const x of [-.012,.012]){
        const lever=box(group,[.031,.007,.010],[x,-.063,-sign*.003],M.steel,.0015);
        lever.rotation.z=x<0?.22:-.22;
      }
      ring(group,.005,.002,.005,[0,-.066,sign*.007],M.machined,'z',24);
    },options(['34411163709','34416868624'],'The expanding lock acts on the shoe ends. Check the replacement part and required pin in the source.'));
  }
}
