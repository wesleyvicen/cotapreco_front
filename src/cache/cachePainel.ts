import type { Painel } from '../types'

/* O painel fica no localStorage, e não no sessionStorage, para acompanhar a sessão: o token e o
   retrato do usuário também moram no localStorage (ver persistenciaSessao), então guardar o painel
   por aba fazia toda primeira abertura do navegador cair no esqueleto mesmo com a sessão intacta e
   com um painel anterior perfeitamente exibível enquanto a revalidação acontece. O logout continua
   apagando tudo em limparCachePainel, então nada atravessa de uma conta para outra. */
const PREFIXO_PAINEL='cotapreco:painel:'

interface RegistroPainel {
  versao:1
  data:Painel
  atualizadoEm:number
}

const memoria=new Map<string,RegistroPainel>()
const requisicoes=new Map<string,Promise<Painel>>()
/* Em que geração cada chave foi salva. Só existe em memória de propósito: depois de um
   recarregamento o mapa nasce vazio e nenhuma chave conta como fresca, que é o desejado,
   pois abrir o app de novo deve sempre revalidar. */
const geracaoPorChave=new Map<string,number>()
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
    const texto=window.localStorage.getItem(chave)
    if(!texto)return null
    const registro=JSON.parse(texto) as Partial<RegistroPainel>
    if(registro.versao!==1||!painelValido(registro.data)){
      window.localStorage.removeItem(chave)
      return null
    }
    const normalizado:RegistroPainel={versao:1,data:registro.data,atualizadoEm:typeof registro.atualizadoEm==='number'?registro.atualizadoEm:0}
    memoria.set(chave,normalizado)
    return normalizado.data
  }catch{
    try{window.localStorage.removeItem(chave)}catch{/* O cache é opcional. */}
    return null
  }
}

function salvarPainelCache(chave:string,data:Painel){
  const registro:RegistroPainel={versao:1,data,atualizadoEm:Date.now()}
  memoria.set(chave,registro)
  geracaoPorChave.set(chave,geracao)
  try{window.localStorage.setItem(chave,JSON.stringify(registro))}catch{/* O painel continua disponível somente em memória. */}
}

/* O painel é caro de calcular no backend, então voltar para ele logo depois de sair não precisa
   consultar de novo. Fresco exige as duas coisas: ter sido salvo nesta geração, ou seja sem
   nenhuma escrita depois dele, e ser recente. Qualquer mutação chama invalidarCachePainel e
   derruba a geração, então este atalho nunca segura um painel desatualizado. */
export function painelEstaFresco(chave:string,janelaMs:number){
  if(geracaoPorChave.get(chave)!==geracao)return false
  const registro=memoria.get(chave)
  return registro!=null&&Date.now()-registro.atualizadoEm<janelaMs
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
  geracaoPorChave.clear()
  try{
    Object.keys(window.localStorage).filter(chave=>chave.startsWith(PREFIXO_PAINEL)).forEach(chave=>window.localStorage.removeItem(chave))
  }catch{/* O navegador pode bloquear o armazenamento. */}
}
