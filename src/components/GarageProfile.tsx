'use client';

import {useState} from 'react';
import {ArrowUpRight,UserRound} from 'lucide-react';
import {useKeyedResource} from '../hooks/use-keyed-resource';
import {db,useApp} from './context';
import {PhotoImage} from './CarPhotos';
import {DocumentLink} from './DocumentLink';
import {Modal,Notice} from './common';

type Photo={id:string;object_path:string;caption:string;alt_text:string};
type Profile={name:string;photoId:string|null;showPublic:boolean;hasSharedStory:boolean;photos:Photo[];shareable:string[]};

export function useGarageAvatars(owners:string[]) {
  const ids=[...new Set(owners.filter(id=>/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(id)))].sort();
  const {user}=useApp();
  return useKeyedResource<Record<string,string>>(JSON.stringify([user?.id,ids]),async signal=>{
    const batches=[];
    for(let index=0;index<ids.length;index+=32){
      batches.push(db.rpc('garage_profile_avatars',{owners:ids.slice(index,index+32)}).abortSignal(signal));
    }
    const results=await Promise.all(batches);
    const entries=results.flatMap(result=>{
      if(result.error)throw result.error;
      return (result.data||[]).map((row:{user_id:string;object_path:string})=>[row.user_id,row.object_path]);
    });
    return Object.fromEntries(entries);
  },{enabled:ids.length>0,failureMessage:'Profile pictures could not load.'}).data||{};
}
export function GarageAvatar({path,name,className=''}:{path?:string;name?:string;className?:string}) {
  return <div className={'garage-avatar '+className} aria-hidden="true">
    {path ? <PhotoImage path={path} alt=""/> : name ? name.slice(0,1).toUpperCase() : <UserRound size={21}/>}
  </div>;
}

function GaragePhotoPicker({profile,photosHref,onClose,onSaved}:{profile:Profile;photosHref:string;onClose:()=>void;onSaved:()=>void}) {
  const [photoId,setPhotoId]=useState(profile.photoId||'');
  const [share,setShare]=useState(profile.showPublic);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const selected=profile.photos.find(photo=>photo.id===photoId);
  const canShare=profile.shareable.includes(photoId);
  return <Modal title="Profile picture" onClose={()=>{if(!busy)onClose();}}>
    {!profile.photos.length ? <DocumentLink className="button outline" href={photosHref}>Open car photos <ArrowUpRight size={15}/></DocumentLink> : <form className="garage-profile-form" onSubmit={async event=>{
      event.preventDefault();
      setBusy(true);setError('');
      const result=await db.rpc('set_garage_profile_photo',{photo:photoId||null,share_public:canShare&&share});
      setBusy(false);
      if(result.error){setError('The picture could not be saved. Reopen the picker to check which photos are available.');return;}
      onSaved();
    }}>
      <div className="garage-profile-selection">
        <GarageAvatar path={selected?.object_path} name={profile.name}/>
        <label>Uploaded photo
          <select value={photoId} onChange={event=>{setPhotoId(event.target.value);setShare(false);}}>
            <option value="">No profile picture</option>
            {profile.photos.map(photo=><option key={photo.id} value={photo.id}>{photo.caption||photo.alt_text}</option>)}
          </select>
        </label>
      </div>
      {selected&&<label className="check">
        <input type="checkbox" checked={canShare&&share} disabled={!canShare} onChange={event=>setShare(event.target.checked)}/>
        Show on my public garage and community posts
      </label>}
      {selected&&<p className="small">{canShare
        ? 'This setting applies to your profile. To remove the photo from a car story, withdraw it there.'
        : 'Only photos already shared in a car story can appear on your public profile.'}</p>}
      {error&&<Notice tone="warning">{error}</Notice>}
      <button className="button primary" disabled={busy}>{busy?'Saving…':'Save profile picture'}</button>
    </form>}
  </Modal>;
}
export function GarageProfileSettings({vehicleId,revision}:{vehicleId?:string;revision:number}) {
  const {user,toast}=useApp();
  const [editing,setEditing]=useState(false);
  const resource=useKeyedResource<Profile>(JSON.stringify([user?.id,revision]),async signal=>{
    const [settings,photos,profile,publications,stories]=await Promise.all([
      db.rpc('my_garage_profile_photo').abortSignal(signal),
      db.from('owner_car_photos').select('id,object_path,caption,alt_text').eq('user_id',user!.id)
        .eq('state','ready').not('vehicle_id','is',null).order('created_at',{ascending:false}).limit(100).abortSignal(signal),
      db.from('profiles').select('display_name').eq('id',user!.id).abortSignal(signal).maybeSingle(),
      db.rpc('my_car_photo_publications').abortSignal(signal),
      db.rpc('my_garage_publications').abortSignal(signal),
    ]);
    if([settings,photos,profile,publications,stories].some(result=>result.error))throw Error('Garage profile unavailable');
    const visible=new Set((stories.data||[]).filter((story:{published:boolean;hidden:boolean})=>story.published&&!story.hidden)
      .map((story:{entry_id:string})=>story.entry_id));
    return {name:profile.data?.display_name||'My Garage',photoId:settings.data?.[0]?.photo_id||null,
      showPublic:settings.data?.[0]?.show_public===true,hasSharedStory:visible.size>0,photos:photos.data||[],
      shareable:(publications.data||[]).filter((photo:{state:string;garage_id:string})=>photo.state==='approved'&&visible.has(photo.garage_id))
        .map((photo:{source_photo_id:string})=>photo.source_photo_id)};
  },{enabled:!!user&&!user.is_anonymous,failureMessage:'Your garage profile could not load.'});
  const profile=resource.data,selected=profile?.photos.find(photo=>photo.id===profile.photoId);
  const photosHref='/garage?tab=photos'+(vehicleId?'&vehicle='+encodeURIComponent(vehicleId):'');
  return <section className="garage-profile" aria-label="My garage profile">
    <GarageAvatar path={selected?.object_path} name={profile?.name}/>
    <div className="garage-profile-identity">
      <h2>{profile?.name||'Garage profile'}</h2>
      {selected&&<small>{profile?.showPublic&&profile.shareable.includes(selected.id)?'Public profile picture':'Private profile picture'}</small>}
      {resource.error&&<p role="status">{resource.error} <button className="text-link" onClick={resource.retry}>Retry</button></p>}
    </div>
    <button className="button outline" disabled={!profile} onClick={()=>{setEditing(true);resource.retry();}}>Edit profile picture</button>
    <DocumentLink className="text-link" href={photosHref}>Car photos & sharing <ArrowUpRight size={15}/></DocumentLink>
    {profile?.hasSharedStory&&user&&<DocumentLink className="text-link" href={'/garages/'+user.id}>View public garage <ArrowUpRight size={15}/></DocumentLink>}
    {editing&&(profile ? <GaragePhotoPicker profile={profile} photosHref={photosHref} onClose={()=>setEditing(false)}
      onSaved={()=>{setEditing(false);resource.retry();toast('Profile picture saved.');}}/>
      : <Modal title="Profile picture" onClose={()=>setEditing(false)}><p role="status">{resource.error||'Loading your photos…'}</p></Modal>)}
  </section>;
}
