/* Os hooks usam o prefixo português "usar" por padrão de nomenclatura do projeto. */
/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useRef, useState } from 'react'
import { estaFresco, invalidarCacheConsultas, lerCache, revalidarCache, type Validador } from '../cache/cacheConsulta'

/* Voltar de outra tela e encontrar a anterior remontada refazia a consulta. Dentro desta janela
   o valor em memória é reaproveitado sem rede; qualquer escrita invalida a geração e a próxima
   visita consulta de novo, mesmo dentro da janela. */
const JANELA_FRESCOR_PADRAO_MS=30_000

interface OpcoesConsulta<T> {
  valido:Validador<T>
  janelaFrescorMs?:number
  /* Revalidar quando chega o push de cotação respondida. Só faz sentido para telas cujo
     conteúdo muda com a proposta da distribuidora. */
  revalidarComPush?:boolean
  mensagemErro?:string
}

export function usarConsulta<T>(chave:string|null,carregarDados:()=>Promise<T>,opcoes:OpcoesConsulta<T>){
  const {janelaFrescorMs=JANELA_FRESCOR_PADRAO_MS,revalidarComPush=false,mensagemErro='Não foi possível carregar os dados.'}=opcoes
  /* carregarDados e valido chegam recriados a cada render quando o chamador passa uma função
     inline. Guardados em ref, ficam fora das dependências e não viram laço de consulta: quem
     manda em quando buscar é a chave. */
  const carregarRef=useRef(carregarDados)
  const validoRef=useRef(opcoes.valido)
  carregarRef.current=carregarDados
  validoRef.current=opcoes.valido

  const ler=useCallback((chaveAtual:string)=>lerCache(chaveAtual,validoRef.current),[])

  const [data,setData]=useState<T|null>(()=>chave?ler(chave):null)
  const [carregando,setCarregando]=useState(!data)
  const [revalidando,setRevalidando]=useState(()=>chave!=null&&!estaFresco(chave,janelaFrescorMs))
  const [erro,setErro]=useState('')

  /* forcar=true é o "Tentar novamente" das telas: precisa ir à rede mesmo com cache fresco. */
  const carregar=useCallback(async(forcar=false)=>{
    if(!chave)return
    const anterior=ler(chave)
    if(anterior)setData(anterior)
    if(!forcar&&anterior&&estaFresco(chave,janelaFrescorMs)){
      setCarregando(false)
      setRevalidando(false)
      setErro('')
      return
    }
    setCarregando(!anterior)
    setRevalidando(Boolean(anterior))
    setErro('')
    try{
      setData(await revalidarCache(chave,()=>carregarRef.current()))
    }catch(e){
      setErro(e instanceof Error?e.message:mensagemErro)
    }finally{
      setCarregando(false)
      setRevalidando(false)
    }
  },[chave,janelaFrescorMs,mensagemErro,ler])

  useEffect(()=>{void carregar()},[carregar])

  /* Alterações feitas por outra pessoa não avisam esta aba. Voltar à tela depois de trocar de
     aba, destravar o celular ou sair e voltar do app é o momento natural para conferir. Vai sem
     forcar de propósito, então a janela de frescor continua valendo e alternar de aba várias
     vezes seguidas não repete a consulta. */
  useEffect(()=>{
    const aoMudarVisibilidade=()=>{if(document.visibilityState==='visible')void carregar()}
    document.addEventListener('visibilitychange',aoMudarVisibilidade)
    return()=>document.removeEventListener('visibilitychange',aoMudarVisibilidade)
  },[carregar])

  /* Fecha o caso que o visibilitychange não cobre: a aba está em foco e a pessoa não sai dela.
     Vale só para quem ativou as notificações; sem inscrição nada chega e nada muda. */
  useEffect(()=>{
    if(!revalidarComPush||!('serviceWorker' in navigator))return
    const aoReceberAviso=(evento:MessageEvent)=>{
      if((evento.data as{tipo?:string}|null)?.tipo!=='cotacao-respondida')return
      invalidarCacheConsultas()
      void carregar(true)
    }
    navigator.serviceWorker.addEventListener('message',aoReceberAviso)
    return()=>navigator.serviceWorker.removeEventListener('message',aoReceberAviso)
  },[carregar,revalidarComPush])

  const recarregar=useCallback(()=>carregar(true),[carregar])

  return {data,carregando,revalidando,erro,recarregar}
}
