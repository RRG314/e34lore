import type {Vehicle} from '../data/catalog';
export type OwnedVehicle={id:string;user_id:string;nickname:string;model_id:string;configuration:Partial<Vehicle>;mileage:number|null;mileage_unit:'mi'|'km';private_notes:string;exterior_color:string;interior_trim:string;ownership_status:'current'|'previous';acquired_year:number|null;released_year:number|null;created_at:string};
export type ServiceRecord={id:string;user_id:string;vehicle_id:string;title:string;performed_on:string;mileage:number|null;notes:string;due_on:string|null;due_mileage:number|null;created_at:string};
export type Bookmark={user_id:string;kind:'guide'|'part'|'article'|'thread';target_id:string;title:string;created_at:string};
export type MemberNotification={id:string;user_id:string;thread_id:string|null;target_url:string|null;message:string;read_at:string|null;created_at:string};
export type VehicleModification={id:string;user_id:string;vehicle_id:string;title:string;notes:string;created_at:string};
export type InstalledPart={id:string;user_id:string;vehicle_id:string;part_id:string|null;description:string;number_raw:string;notes:string;created_at:string};
