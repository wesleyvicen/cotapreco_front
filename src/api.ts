import { CHAVE_TOKEN_FARMACIA, limparSessaoFarmaciaLocal } from './cache/persistenciaSessao'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

export class ErroApi extends Error { fields: Record<string,string>; constructor(message:string, fields:Record<string,string>={}) { super(message); this.fields=fields } }

type Sessao='farmacia'|'representante'
type RespostaToken={token:string}
const chaves:Record<Sessao,string>={farmacia:CHAVE_TOKEN_FARMACIA,representante:'cotapreco_token_representante'}
const rotasRefresh:Record<Sessao,string>={farmacia:'/auth/refresh',representante:'/publico/representantes/refresh'}
let renovacaoFarmacia:Promise<void>|null=null
let renovacaoRepresentante:Promise<void>|null=null

const limparSessao=(sessao:Sessao)=>sessao==='farmacia'?limparSessaoFarmaciaLocal():localStorage.removeItem(chaves[sessao])
const podeRenovar=(path:string,sessao:Sessao)=>sessao==='farmacia'
  ? !['/auth/login','/auth/register','/auth/refresh','/auth/logout','/auth/esqueci-senha','/auth/redefinir-senha'].includes(path)
  : !['/publico/representantes/refresh','/publico/representantes/logout'].includes(path)

async function renovar(sessao:Sessao):Promise<void> {
  const atual=sessao==='farmacia'?renovacaoFarmacia:renovacaoRepresentante
  if(atual)return atual
  const execucao=(async()=>{
    const response=await fetch(`${API_URL}${rotasRefresh[sessao]}`,{method:'POST',credentials:'include',headers:{'X-Requested-With':'XMLHttpRequest'}})
    if(!response.ok)throw new Error('Sessão expirada.')
    const resposta=await response.json() as RespostaToken
    localStorage.setItem(chaves[sessao],resposta.token)
  })()
  if(sessao==='farmacia')renovacaoFarmacia=execucao
  else renovacaoRepresentante=execucao
  try{await execucao}finally{if(sessao==='farmacia')renovacaoFarmacia=null;else renovacaoRepresentante=null}
}

async function executar(path:string,options:RequestInit,sessao:Sessao|null,tentarRenovar=true):Promise<Response> {
  const headers=new Headers(options.headers)
  if(!(options.body instanceof FormData)&&!headers.has('Content-Type'))headers.set('Content-Type','application/json')
  const token=sessao?localStorage.getItem(chaves[sessao]):null
  if(token)headers.set('Authorization',`Bearer ${token}`)
  const response=await fetch(`${API_URL}${path}`,{...options,headers,credentials:'include'})
  if(response.status===401&&sessao&&tentarRenovar&&podeRenovar(path,sessao)){
    try{await renovar(sessao);return executar(path,options,sessao,false)}catch{limparSessao(sessao)}
  }
  return response
}

async function requisicao<T>(path:string,options:RequestInit,sessao:Sessao|null,aoNaoAutorizado?:()=>void):Promise<T> {
  const response=await executar(path,options,sessao)
  if(response.status===401)aoNaoAutorizado?.()
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new ErroApi(body.message??'Não foi possível concluir a operação.',body.fields??{})}
  if(response.status===204)return undefined as T
  const texto=await response.text()
  return texto?JSON.parse(texto) as T:undefined as T
}

export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  return requisicao<T>(path,options,'farmacia',()=>{limparSessao('farmacia');window.location.href='/login'})
}

export async function apiArquivo(path:string):Promise<Blob>{
  const response=await executar(path,{},'farmacia')
  if(response.status===401){limparSessao('farmacia');window.location.href='/login'}
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new ErroApi(body.message??'Não foi possível baixar o arquivo.',body.fields??{})}
  return response.blob()
}

export async function apiPublica<T>(path:string,options:RequestInit={}):Promise<T>{return requisicao<T>(path,options,null)}
export async function apiRepresentante<T>(path:string,options:RequestInit={}):Promise<T>{return requisicao<T>(path,options,'representante',()=>limparSessao('representante'))}

export async function encerrarSessaoFarmacia(){
  try{await fetch(`${API_URL}/auth/logout`,{method:'POST',credentials:'include',headers:{'X-Requested-With':'XMLHttpRequest'}})}finally{limparSessao('farmacia')}
}
export async function encerrarSessaoRepresentante(){
  try{await fetch(`${API_URL}/publico/representantes/logout`,{method:'POST',credentials:'include',headers:{'X-Requested-With':'XMLHttpRequest'}})}finally{limparSessao('representante')}
}
export const salvarTokenRepresentante=(token:string)=>localStorage.setItem(chaves.representante,token)
export const removerTokenRepresentante=()=>limparSessao('representante')
export const money=(value:number|null|undefined)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value??0)
export const date=(value:string|null|undefined)=>value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'Sem prazo'
