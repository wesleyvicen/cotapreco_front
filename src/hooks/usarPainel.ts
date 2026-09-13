/* Os hooks usam o prefixo português "usar" por padrão de nomenclatura do projeto. */
/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { criarChavePainel, criarChavePainelGeral, lerPainelCache, painelEstaFresco, revalidarPainelCache } from '../cache/cachePainel'
import { empresaAtiva } from '../lib/permissoes'
import type { Painel, Usuario } from '../types'

/* Ir para Cotações e voltar remonta a página e antes disso refazia a consulta do painel, que é a
   mais cara do backend. Dentro desta janela o valor em memória é reaproveitado sem rede; qualquer
   escrita invalida a geração e a próxima visita consulta de novo, mesmo dentro da janela. */
const JANELA_FRESCOR_MS=30_000

export function usarPainel(user:Usuario|null, geral=false){
  const empresa=empresaAtiva(user)
  const chave=!user?null:geral?criarChavePainelGeral(user.groupId,user.id):empresa?criarChavePainel(empresa.id,user.id):null
  const [data,setData]=useState<Painel|null>(()=>chave?lerPainelCache(chave):null)
  const [carregando,setCarregando]=useState(!data)
  const [revalidando,setRevalidando]=useState(()=>chave!=null&&!painelEstaFresco(chave,JANELA_FRESCOR_MS))
  const [erro,setErro]=useState('')

  /* forcar=true é o "Tentar novamente" da tela: ele precisa ir à rede mesmo com cache fresco. */
  const carregar=useCallback(async(forcar=false)=>{
    if(!chave)return
    const anterior=lerPainelCache(chave)
    if(anterior)setData(anterior)
    if(!forcar&&anterior&&painelEstaFresco(chave,JANELA_FRESCOR_MS)){
      setCarregando(false)
      setRevalidando(false)
      setErro('')
      return
    }
    setCarregando(!anterior)
    setRevalidando(Boolean(anterior))
    setErro('')
    try{
      const atualizado=await revalidarPainelCache(chave,()=>api<Painel>(geral?'/dashboard/geral':'/dashboard'))
      setData(atualizado)
    }catch(e){
      setErro(e instanceof Error?e.message:'Não foi possível carregar o painel.')
    }finally{
      setCarregando(false)
      setRevalidando(false)
    }
  },[chave,geral])

  useEffect(()=>{void carregar()},[carregar])

  const recarregar=useCallback(()=>carregar(true),[carregar])

  return {data,carregando,revalidando,erro,recarregar}
}
