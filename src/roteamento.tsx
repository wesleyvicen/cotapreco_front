import { createContext, useCallback, useContext, useEffect, useMemo, useState, type AnchorHTMLAttributes, type MouseEvent, type ReactNode } from 'react'

interface ContextoLocalizacao { pathname:string; search:string; navigate:(to:string,options?:{replace?:boolean})=>void }
const LocationContext=createContext<ContextoLocalizacao|null>(null)
const ParamsContext=createContext<Record<string,string>>({})

export function ProvedorRoteamento({children}:{children:ReactNode}){
  const[current,setCurrent]=useState(()=>({pathname:window.location.pathname,search:window.location.search}))
  useEffect(()=>{const update=()=>setCurrent({pathname:window.location.pathname,search:window.location.search});window.addEventListener('popstate',update);return()=>window.removeEventListener('popstate',update)},[])
  const navigate=useCallback((to:string,options?:{replace?:boolean})=>{const url=new URL(to,window.location.origin);if(options?.replace)window.history.replaceState({},'',url);else window.history.pushState({},'',url);setCurrent({pathname:url.pathname,search:url.search});window.scrollTo({top:0,behavior:'smooth'})},[])
  return <LocationContext.Provider value={{...current,navigate}}>{children}</LocationContext.Provider>
}
export const usarLocalizacao=()=>{const value=useContext(LocationContext);if(!value)throw new Error('ProvedorRoteamento ausente');return value}
export const usarNavegacao=()=>usarLocalizacao().navigate
export const usarParametros=()=>useContext(ParamsContext)
export function ProvedorParametros({params,children}:{params:Record<string,string>;children:ReactNode}){return <ParamsContext.Provider value={params}>{children}</ParamsContext.Provider>}

interface PropriedadesLink extends AnchorHTMLAttributes<HTMLAnchorElement>{to:string;replace?:boolean}
export function LinkInterno({to,replace,onClick,children,...rest}:PropriedadesLink){const navigate=usarNavegacao();const click=(event:MouseEvent<HTMLAnchorElement>)=>{onClick?.(event);if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();navigate(to,{replace})};return <a href={to} onClick={click} {...rest}>{children}</a>}
export function LinkNavegacao({to,end=false,className='',children,onClick,...rest}:PropriedadesLink&{end?:boolean}){const{pathname}=usarLocalizacao();const active=end?pathname===to:pathname===to||pathname.startsWith(to.endsWith('/')?to:`${to}/`);return <LinkInterno to={to} className={`${className} ${active?'active':''}`.trim()} onClick={onClick} {...rest}>{children}</LinkInterno>}
export function Redirecionar({to,replace=false}:{to:string;replace?:boolean}){const navigate=usarNavegacao();useEffect(()=>navigate(to,{replace}),[navigate,to,replace]);return null}
export function usarParametrosBusca(){const{search,pathname,navigate}=usarLocalizacao();const params=useMemo(()=>new URLSearchParams(search),[search]);const setParams=useCallback((next:Record<string,string>|URLSearchParams,options?:{replace?:boolean})=>{const value=next instanceof URLSearchParams?next:new URLSearchParams(next);navigate(`${pathname}?${value.toString()}`,options)},[navigate,pathname]);return[params,setParams] as const}
