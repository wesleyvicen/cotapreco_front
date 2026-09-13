/* Cache de consultas de leitura, compartilhado por todas as telas.
   Nasceu específico do painel e foi generalizado sem mudar o desenho, que é o mesmo: memória
   como fonte rápida, localStorage para sobreviver ao fechamento do navegador, uma geração que
   qualquer escrita incrementa e deduplicação das requisições em voo.

   Fica no localStorage, e não no sessionStorage, para acompanhar a sessão: o token e o retrato
   do usuário também moram lá (ver persistenciaSessao), então guardar por aba fazia toda primeira
   abertura do navegador cair no esqueleto mesmo com a sessão intacta e com dados anteriores
   perfeitamente exibíveis durante a revalidação. O logout chama limparCacheConsultas, então
   nada atravessa de uma conta para outra. */

export type Validador<T>=(valor:unknown)=>valor is T

interface Registro<T> {
  versao:1
  data:T
  atualizadoEm:number
}

const PREFIXO='cotapreco:cache:'
/* Prefixo usado enquanto o cache só servia ao painel. Varrido uma vez na carga do módulo para
   as entradas antigas não ficarem ocupando espaço no navegador de quem já usava o sistema. */
const PREFIXO_LEGADO='cotapreco:painel:'

const memoria=new Map<string,Registro<unknown>>()
const requisicoes=new Map<string,Promise<unknown>>()
/* Em que geração cada chave foi salva. Só existe em memória de propósito: depois de um
   recarregamento o mapa nasce vazio e nenhuma chave conta como fresca, que é o desejado,
   pois abrir o app de novo deve sempre revalidar. */
const geracaoPorChave=new Map<string,number>()
let geracao=0
let geracaoLimpeza=0

export const criarChave=(...partes:(string|number)[])=>`${PREFIXO}${partes.join(':')}`

function removerPorPrefixo(prefixo:string){
  try{
    Object.keys(window.localStorage).filter(chave=>chave.startsWith(prefixo)).forEach(chave=>window.localStorage.removeItem(chave))
  }catch{/* O navegador pode bloquear o armazenamento. */}
}

removerPorPrefixo(PREFIXO_LEGADO)

/* O validador é responsabilidade de quem chama porque um cache genérico não sabe conferir tipo
   nenhum sozinho, e é justamente ele que impede um registro de formato antigo, salvo por uma
   versão anterior do sistema, de quebrar a tela de quem acabou de atualizar. */
export function lerCache<T>(chave:string,valido:Validador<T>):T|null {
  const local=memoria.get(chave)
  if(local)return local.data as T
  try{
    const texto=window.localStorage.getItem(chave)
    if(!texto)return null
    const registro=JSON.parse(texto) as Partial<Registro<unknown>>
    if(registro.versao!==1||!valido(registro.data)){
      window.localStorage.removeItem(chave)
      return null
    }
    const normalizado:Registro<T>={versao:1,data:registro.data,atualizadoEm:typeof registro.atualizadoEm==='number'?registro.atualizadoEm:0}
    memoria.set(chave,normalizado)
    return normalizado.data
  }catch{
    try{window.localStorage.removeItem(chave)}catch{/* O cache é opcional. */}
    return null
  }
}

function salvarCache<T>(chave:string,data:T){
  const registro:Registro<T>={versao:1,data,atualizadoEm:Date.now()}
  memoria.set(chave,registro)
  geracaoPorChave.set(chave,geracao)
  try{window.localStorage.setItem(chave,JSON.stringify(registro))}catch{/* Continua disponível somente em memória. */}
}

/* Voltar para uma tela logo depois de sair dela não precisa consultar de novo. Fresco exige as
   duas coisas: ter sido salvo nesta geração, ou seja sem nenhuma escrita depois dele, e ser
   recente. Qualquer mutação chama invalidarCacheConsultas e derruba a geração, então este
   atalho nunca segura dado desatualizado. */
export function estaFresco(chave:string,janelaMs:number){
  if(geracaoPorChave.get(chave)!==geracao)return false
  const registro=memoria.get(chave)
  return registro!=null&&Date.now()-registro.atualizadoEm<janelaMs
}

export function revalidarCache<T>(chave:string,carregar:()=>Promise<T>):Promise<T>{
  const existente=requisicoes.get(chave) as Promise<T>|undefined
  if(existente)return existente
  const geracaoInicial=geracao
  const limpezaInicial=geracaoLimpeza
  const requisicao:Promise<T>=carregar()
    .then(async data=>{
      /* Se uma escrita aconteceu enquanto esta consulta estava em voo, o que voltou já nasceu
         velho: busca de novo antes de guardar. Depois de uma limpeza (troca de conta) não há o
         que reconsultar, o resultado é apenas devolvido a quem pediu e não é salvo. */
      if(geracaoInicial===geracao){
        salvarCache(chave,data)
        return data
      }
      if(limpezaInicial!==geracaoLimpeza)return data
      const atualizado=await carregar()
      salvarCache(chave,atualizado)
      return atualizado
    })
    .finally(()=>{if(requisicoes.get(chave)===requisicao)requisicoes.delete(chave)})
  requisicoes.set(chave,requisicao)
  return requisicao
}

export function invalidarCacheConsultas(){
  geracao++
}

export function limparCacheConsultas(){
  geracao++
  geracaoLimpeza++
  memoria.clear()
  requisicoes.clear()
  geracaoPorChave.clear()
  removerPorPrefixo(PREFIXO)
}
