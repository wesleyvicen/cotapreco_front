import { CHAVE_TOKEN_FARMACIA, lerEmpresaAtivaId, limparSessaoFarmaciaLocal } from './cache/persistenciaSessao'
import { invalidarCachePainel, limparCachePainel } from './cache/cachePainel'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

export class ErroApi extends Error { fields: Record<string,string>; status: number; constructor(message:string, fields:Record<string,string>={}, status=0) { super(message); this.fields=fields; this.status=status } }
/* 402 é a resposta do backend quando o teste venceu: a escrita para, a leitura continua. */
export const assinaturaExpirada=(erro:unknown)=>erro instanceof ErroApi&&erro.status===402

type Sessao='farmacia'|'representante'
type RespostaToken={token:string}
const chaves:Record<Sessao,string>={farmacia:CHAVE_TOKEN_FARMACIA,representante:'cotapreco_token_representante'}
const rotasRefresh:Record<Sessao,string>={farmacia:'/auth/refresh',representante:'/publico/representantes/refresh'}
let renovacaoFarmacia:Promise<void>|null=null
let renovacaoRepresentante:Promise<void>|null=null

const limparSessao=(sessao:Sessao)=>{
  if(sessao==='farmacia'){
    limparSessaoFarmaciaLocal()
    limparCachePainel()
    return
  }
  localStorage.removeItem(chaves[sessao])
}
const alteraDados=(options:RequestInit)=>!['GET','HEAD','OPTIONS'].includes((options.method??'GET').toUpperCase())
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
  /* Farmácia ativa (hoje sempre a primeira do vínculo — sem seletor na tela ainda). Sem ela
     o backend cai no mesmo padrão, então o cabeçalho é redundante para quem só tem uma
     farmácia, mas correto para quando o seletor existir. */
  if(sessao==='farmacia'){
    const empresaId=lerEmpresaAtivaId()
    if(empresaId!=null)headers.set('X-Empresa-Id',String(empresaId))
  }
  const response=await fetch(`${API_URL}${path}`,{...options,headers,credentials:'include'})
  if(response.status===401&&sessao&&tentarRenovar&&podeRenovar(path,sessao)){
    try{await renovar(sessao);return executar(path,options,sessao,false)}catch{limparSessao(sessao)}
  }
  return response
}

async function requisicao<T>(path:string,options:RequestInit,sessao:Sessao|null,aoNaoAutorizado?:()=>void):Promise<T> {
  const response=await executar(path,options,sessao)
  if(response.status===401)aoNaoAutorizado?.()
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new ErroApi(body.message??'Não foi possível concluir a operação.',body.fields??{},response.status)}
  if(response.status===204)return undefined as T
  const texto=await response.text()
  return texto?JSON.parse(texto) as T:undefined as T
}

export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
  const resultado=await requisicao<T>(path,options,'farmacia',()=>{limparSessao('farmacia');window.location.href='/login'})
  if(alteraDados(options))invalidarCachePainel()
  return resultado
}

export async function apiArquivo(path:string):Promise<Blob>{
  const response=await executar(path,{},'farmacia')
  if(response.status===401){limparSessao('farmacia');window.location.href='/login'}
  if(!response.ok){const body=await response.json().catch(()=>({}));throw new ErroApi(body.message??'Não foi possível baixar o arquivo.',body.fields??{},response.status)}
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
export const possuiTokenRepresentante=()=>{try{return Boolean(localStorage.getItem(chaves.representante))}catch{return false}}
export const removerTokenRepresentante=()=>limparSessao('representante')
export const money=(value:number|null|undefined)=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value??0)
export const date=(value:string|null|undefined)=>value?new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)):'Sem prazo'
