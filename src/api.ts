const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

export class ErroApi extends Error { fields: Record<string,string>; constructor(message:string, fields:Record<string,string>={}) { super(message); this.fields=fields } }

async function requisicao<T>(path:string, options:RequestInit, token:string|null, aoNaoAutorizado?:()=>void):Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type','application/json')
  if (token) headers.set('Authorization',`Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`,{...options,headers})
  if (response.status === 401) aoNaoAutorizado?.()
  if (!response.ok) { const body = await response.json().catch(()=>({})); throw new ErroApi(body.message ?? 'Não foi possível concluir a operação.', body.fields ?? {}) }
  if(response.status===204)return undefined as T
  const texto=await response.text()
  return texto?JSON.parse(texto) as T:undefined as T
}

export async function api<T>(path:string, options:RequestInit = {}):Promise<T> {
  return requisicao<T>(path,options,localStorage.getItem('cotapreco_token'),()=>{localStorage.removeItem('cotapreco_token');window.location.href='/login'})
}

export async function apiArquivo(path:string):Promise<Blob>{
  const token=localStorage.getItem('cotapreco_token');const response=await fetch(`${API_URL}${path}`,{headers:token?{Authorization:`Bearer ${token}`}:{}})
  if(response.status===401){localStorage.removeItem('cotapreco_token');window.location.href='/login'}
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new ErroApi(body.message??'Não foi possível baixar o arquivo.',body.fields??{})}
  return response.blob()
}

export async function apiPublica<T>(path:string, options:RequestInit = {}):Promise<T> {
  return requisicao<T>(path,options,null)
}

export async function apiRepresentante<T>(path:string, options:RequestInit = {}):Promise<T> {
  return requisicao<T>(path,options,localStorage.getItem('cotapreco_token_representante'),()=>localStorage.removeItem('cotapreco_token_representante'))
}

export const salvarTokenRepresentante=(token:string)=>localStorage.setItem('cotapreco_token_representante',token)
export const removerTokenRepresentante=()=>localStorage.removeItem('cotapreco_token_representante')
export const money = (value:number|null|undefined) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value ?? 0)
export const date = (value:string|null|undefined) => value ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)) : 'Sem prazo'
