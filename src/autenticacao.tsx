/* Os hooks usam o prefixo português "usar" por padrão de nomenclatura do projeto. */
/* eslint-disable react-hooks/rules-of-hooks, react-refresh/only-export-components */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { api, encerrarSessaoFarmacia } from './api'
import { limparCachePainel } from './cache/cachePainel'
import { lerUsuarioFarmacia, limparSessaoFarmaciaLocal, possuiTokenFarmacia, salvarTokenFarmacia, salvarUsuarioFarmacia } from './cache/persistenciaSessao'
import { Redirecionar } from './roteamento'
import type { Usuario } from './types'

interface DadosCadastroFarmacia { nomeUsuario:string; nomeFarmacia:string; cnpj:string; email:string; senha:string }
interface ContextoAutenticacao { user:Usuario|null; loading:boolean; revalidating:boolean; recarregarUsuario:()=>Promise<void>; login:(email:string,password:string)=>Promise<void>; cadastrarFarmacia:(dados:DadosCadastroFarmacia)=>Promise<void>; logout:()=>Promise<void> }
const AuthContext=createContext<ContextoAutenticacao|null>(null)

let validacaoEmAndamento:Promise<Usuario>|null=null
function validarUsuarioAtual(){
  if(!validacaoEmAndamento)validacaoEmAndamento=api<Usuario>('/auth/me').finally(()=>{validacaoEmAndamento=null})
  return validacaoEmAndamento
}

function restaurarEstadoInicial(){
  const possuiToken=possuiTokenFarmacia()
  return {possuiToken,user:possuiToken?lerUsuarioFarmacia():null}
}

export function ProvedorAutenticacao({children}:{children:ReactNode}) {
  const [estadoInicial]=useState(restaurarEstadoInicial)
  const [user,setUser]=useState<Usuario|null>(estadoInicial.user)
  const [loading,setLoading]=useState(estadoInicial.possuiToken&&!estadoInicial.user)
  const [revalidating,setRevalidating]=useState(estadoInicial.possuiToken)
  const cicloSessao=useRef(0)

  useEffect(()=>{
    if(!estadoInicial.possuiToken)return
    const ciclo=++cicloSessao.current
    validarUsuarioAtual()
      .then(usuario=>{
        if(ciclo!==cicloSessao.current)return
        salvarUsuarioFarmacia(usuario)
        setUser(usuario)
      })
      .catch(()=>{
        if(ciclo!==cicloSessao.current||possuiTokenFarmacia())return
        setUser(null)
      })
      .finally(()=>{
        if(ciclo!==cicloSessao.current)return
        setLoading(false)
        setRevalidating(false)
      })
  },[estadoInicial.possuiToken])

  const login=async(email:string,password:string)=>{
    const ciclo=++cicloSessao.current
    const result=await api<{token:string;user:Usuario}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})})
    if(ciclo!==cicloSessao.current)return
    limparCachePainel()
    salvarTokenFarmacia(result.token)
    salvarUsuarioFarmacia(result.user)
    setUser(result.user)
    setLoading(false)
    setRevalidating(false)
  }
  const cadastrarFarmacia=async(dados:DadosCadastroFarmacia)=>{
    const ciclo=++cicloSessao.current
    const result=await api<{token:string;user:Usuario}>('/auth/register',{method:'POST',body:JSON.stringify(dados)})
    if(ciclo!==cicloSessao.current)return
    limparCachePainel()
    salvarTokenFarmacia(result.token)
    salvarUsuarioFarmacia(result.user)
    setUser(result.user)
    setLoading(false)
    setRevalidating(false)
  }
  const logout=async()=>{
    ++cicloSessao.current
    try{await encerrarSessaoFarmacia()}finally{
      limparSessaoFarmaciaLocal()
      setUser(null)
      setLoading(false)
      setRevalidating(false)
    }
  }
  /* Depois de confirmar o e-mail o usuário em memória ainda diz que falta confirmar;
     sem recarregar, a faixa e o bloqueio continuariam na tela até um refresh manual. */
  const recarregarUsuario=async()=>{
    try{const usuario=await validarUsuarioAtual();salvarUsuarioFarmacia(usuario);setUser(usuario)}
    catch{/* Sessão inválida já é tratada pelo fluxo de autenticação. */}
  }
  return <AuthContext.Provider value={{user,loading,revalidating,recarregarUsuario,login,cadastrarFarmacia,logout}}>{children}</AuthContext.Provider>
}
export const usarAutenticacao=()=>{ const value=useContext(AuthContext); if(!value) throw new Error('ProvedorAutenticacao ausente'); return value }
export function RotaProtegida({children}:{children:ReactNode}) { const {user,loading}=usarAutenticacao(); if(loading) return <div className="page-loader"><span className="spinner"/>Carregando...</div>; return user?children:<Redirecionar to="/login" replace/> }
