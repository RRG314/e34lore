/** Group boundaries from the contents sheets of the supplied BMW repair manual. */
const groups = [
  ['00','Maintenance and general data',2,['engine','brakes','suspension','electrical']],
  ['11','Engine',26,['engine']],
  ['12','Engine electrical equipment',154,['engine','electrical']],
  ['13','Fuel system',237,['engine']],
  ['16','Fuel tank and lines',309,['engine']],
  ['17','Cooling system',325,['cooling']],
  ['18','Exhaust system',339,['drivetrain']],
  ['21','Clutch',357,['drivetrain']],
  ['23','Manual transmission',365,['drivetrain']],
  ['24','Automatic transmission',375,['drivetrain']],
  ['25','Shift linkage',427,['drivetrain']],
  ['26','Driveshaft',450,['drivetrain']],
  ['27','iX transfer case',473,['drivetrain']],
  ['31','Front axle',499,['suspension']],
  ['32','Steering and wheel alignment',562,['suspension']],
  ['33','Rear axle and final drive',617,['suspension','drivetrain']],
  ['34','Brakes',639,['brakes']],
  ['35','Pedals',692,['brakes','drivetrain']],
  ['36','Wheels and tires',718,['suspension']],
  ['37','Ride-height control',731,['suspension']],
  ['41','Body structure and panels',755,['body']],
  ['51','Body equipment and trim',892,['body']],
  ['52','Seats',1051,['body']],
  ['54','Roof and sunroof',1056,['body']],
  ['61','Electrical system',1131,['electrical']],
  ['62','Instruments',1155,['electrical']],
  ['63','Lighting',1181,['electrical']],
  ['64','Heating and air conditioning',1195,['climate']],
  ['65','Radio and special equipment',1231,['electrical']],
  ['71','Engine and chassis accessories',1281,['engine','drivetrain']],
  ['72','Body accessories and restraints',1294,['body']],
  ['97','Body cavity sealing and undercoating',1305,['body']],
] as const;

export type E30ManualGroup = {
  id:string;
  title:string;
  pdfStart:number;
  pdfEnd:number;
  systems:readonly string[];
};
export const e30ManualGroups: E30ManualGroup[] = groups.map(([id,title,pdfStart,systems],index)=>({
  id,title,pdfStart,pdfEnd:(groups[index+1]?.[2]??1309)-1,systems,
}));
export function e30ManualGroupForPage(page:number) {
  return e30ManualGroups.find(group=>page>=group.pdfStart&&page<=group.pdfEnd);
}
