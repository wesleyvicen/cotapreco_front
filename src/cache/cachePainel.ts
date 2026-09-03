import type { Painel } from '../types'

const PREFIXO_PAINEL='cotapreco:painel:'

interface RegistroPainel {
  versao:1
  data:Painel
  atualizadoEm:number
}

const memoria=new Map<string,RegistroPainel>()
const requisicoes=new Map<string,Promise<Painel>>()
let geracao=0
let geracaoLimpeza=0

export function criarChavePainel(empresaId:number,usuarioId:number){
  return `${PREFIXO_PAINEL}${empresaId}:${usuarioId}`
}

export function criarChavePainelGeral(grupoId:number,usuarioId:number){
  return `${PREFIXO_PAINEL}geral:${grupoId}:${usuarioId}`
}

function painelValido(valor:unknown):valor is Painel {
  if(!valor||typeof valor!=='object')return false
  const painel=valor as Partial<Painel>
  return typeof painel.openQuotations==='number'
    &&typeof painel.finishedQuotations==='number'
    &&typeof painel.responsesThisMonth==='number'
    &&typeof painel.responsesTotal==='number'
    &&typeof painel.quotedValue==='number'
    &&typeof painel.estimatedSavings==='number'
    &&Array.isArray(painel.latestQuotations)
}

export function lerPainelCache(chave:string):Painel|null {
  const local=memoria.get(chave)
  if(local)return local.data
  try{
    const texto=window.sessionStorage.getItem(chave)
    if(!texto)return null
    const registro=JSON.parse(texto) as Partial<RegistroPainel>
    if(registro.versao!==1||!painelValido(registro.data)){
      window.sessionStorage.removeItem(chave)
      return null
    }
    const normalizado:RegistroPainel={versao:1,data:registro.data,atualizadoEm:typeof registro.atualizadoEm==='number'?registro.atualizadoEm:0}
    memoria.set(chave,normalizado)
    return normalizado.data
  }catch{
    try{window.sessionStorage.removeItem(chave)}catch{/* O cache é opcional. */}
    return null
  }
}

function salvarPainelCache(chave:string,data:Painel){
  const registro:RegistroPainel={versao:1,data,atualizadoEm:Date.now()}
  memoria.set(chave,registro)
  try{window.sessionStorage.setItem(chave,JSON.stringify(registro))}catch{/* O painel continua disponível somente em memória. */}
}

export function revalidarPainelCache(chave:string,carregar:()=>Promise<Painel>):Promise<Painel>{
  const existente=requisicoes.get(chave)
  if(existente)return existente
  const geracaoInicial=geracao
  const limpezaInicial=geracaoLimpeza
  const requisicao=carregar()
    .then(async data=>{
      if(geracaoInicial===geracao){
        salvarPainelCache(chave,data)
        return data
      }
      if(limpezaInicial!==geracaoLimpeza)return data
      const atualizado=await carregar()
      salvarPainelCache(chave,atualizado)
      return atualizado
    })
    .finally(()=>{if(requisicoes.get(chave)===requisicao)requisicoes.delete(chave)})
  requisicoes.set(chave,requisicao)
  return requisicao
}

export function invalidarCachePainel(){
  geracao++
}

export function limparCachePainel(){
  geracao++
  geracaoLimpeza++
  memoria.clear()
  requisicoes.clear()
  try{
    Object.keys(window.sessionStorage).filter(chave=>chave.startsWith(PREFIXO_PAINEL)).forEach(chave=>window.sessionStorage.removeItem(chave))
  }catch{/* O navegador pode bloquear o armazenamento. */}
}
