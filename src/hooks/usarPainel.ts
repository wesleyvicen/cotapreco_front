/* Os hooks usam o prefixo português "usar" por padrão de nomenclatura do projeto. */
/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useState } from 'react'
import { api } from '../api'
import { criarChavePainel, criarChavePainelGeral, lerPainelCache, revalidarPainelCache } from '../cache/cachePainel'
import { empresaAtiva } from '../lib/permissoes'
import type { Painel, Usuario } from '../types'

export function usarPainel(user:Usuario|null, geral=false){
  const empresa=empresaAtiva(user)
  const chave=!user?null:geral?criarChavePainelGeral(user.groupId,user.id):empresa?criarChavePainel(empresa.id,user.id):null
  const [data,setData]=useState<Painel|null>(()=>chave?lerPainelCache(chave):null)
  const [carregando,setCarregando]=useState(!data)
  const [revalidando,setRevalidando]=useState(Boolean(chave))
  const [erro,setErro]=useState('')

  const carregar=useCallback(async()=>{
    if(!chave)return
    const anterior=lerPainelCache(chave)
    if(anterior)setData(anterior)
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

  return {data,carregando,revalidando,erro,recarregar:carregar}
}
