/* Os hooks usam o prefixo português "usar" por padrão de nomenclatura do projeto. */
/* eslint-disable react-hooks/rules-of-hooks, react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api } from './api'
import { Redirecionar } from './roteamento'
import type { Usuario } from './types'

interface DadosCadastroFarmacia { nomeUsuario:string; nomeFarmacia:string; cnpj:string; email:string; senha:string }
interface ContextoAutenticacao { user:Usuario|null; loading:boolean; login:(email:string,password:string)=>Promise<void>; cadastrarFarmacia:(dados:DadosCadastroFarmacia)=>Promise<void>; logout:()=>void }
const AuthContext=createContext<ContextoAutenticacao|null>(null)
export function ProvedorAutenticacao({children}:{children:ReactNode}) {
  const [user,setUser]=useState<Usuario|null>(null); const [loading,setLoading]=useState(true)
  useEffect(()=>{ const token=localStorage.getItem('cotapreco_token'); if(!token){setLoading(false);return} api<Usuario>('/auth/me').then(setUser).catch(()=>localStorage.removeItem('cotapreco_token')).finally(()=>setLoading(false)) },[])
  const login=async(email:string,password:string)=>{ const result=await api<{token:string;user:Usuario}>('/auth/login',{method:'POST',body:JSON.stringify({email,password})}); localStorage.setItem('cotapreco_token',result.token); setUser(result.user) }
  const cadastrarFarmacia=async(dados:DadosCadastroFarmacia)=>{ const result=await api<{token:string;user:Usuario}>('/auth/register',{method:'POST',body:JSON.stringify(dados)}); localStorage.setItem('cotapreco_token',result.token); setUser(result.user) }
  const logout=()=>{ localStorage.removeItem('cotapreco_token'); setUser(null) }
  return <AuthContext.Provider value={{user,loading,login,cadastrarFarmacia,logout}}>{children}</AuthContext.Provider>
}
export const usarAutenticacao=()=>{ const value=useContext(AuthContext); if(!value) throw new Error('ProvedorAutenticacao ausente'); return value }
export function RotaProtegida({children}:{children:ReactNode}) { const {user,loading}=usarAutenticacao(); if(loading) return <div className="page-loader"><span className="spinner"/>Carregando...</div>; return user?children:<Redirecionar to="/login" replace/> }
