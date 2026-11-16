'use client';
import {useCallback,useState,useLayoutEffect,useRef,type SetStateAction} from 'react';
/** Reset transient controls by scope without an effect or clearing saved data. */
export function useScopedState<T>(scope:string,initial:T):[T,(update:SetStateAction<T>)=>void]{
 const [stored,setStored]=useState<{scope:string;value:T}>(()=>({scope,value:initial}));
 const currentScope=useRef(scope);
 useLayoutEffect(()=>{currentScope.current=scope},[scope]);
 const value=stored.scope===scope?stored.value:initial;
 const update=useCallback((next:SetStateAction<T>)=>{if(currentScope.current!==scope)return;setStored(old=>({scope,value:typeof next==='function'?(next as (previous:T)=>T)(old.scope===scope?old.value:initial):next}));},[scope,initial]);
 return [value,update];
}
