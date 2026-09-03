import { lerEmpresaAtivaId, salvarEmpresaAtiva } from '../cache/persistenciaSessao'
import type { EmpresaAcesso, Usuario } from '../types'

/* A empresa que a pessoa escolheu no seletor (persistida em localStorage); sem escolha
   guardada, ou se a farmácia guardada não existe mais entre as do usuário, cai na primeira
   — o mesmo padrão que o backend usa quando a requisição não manda X-Empresa-Id. */
export function empresaAtiva(user:Usuario|null):EmpresaAcesso|null {
  if (!user) return null
  const ativaId = lerEmpresaAtivaId()
  return user.companies.find(c => c.id === ativaId) ?? user.companies[0] ?? null
}

export function perfilAtivo(user:Usuario|null) {
  return empresaAtiva(user)?.role ?? null
}

export function isAdminAtivo(user:Usuario|null) {
  return perfilAtivo(user) === 'ADMIN'
}

/* Ações de conta (assinatura, dados de cobrança, criar farmácia) exigem ADMIN em qualquer
   farmácia do grupo, não necessariamente na farmácia ativa — mesma regra do backend. */
export function isAdminDoGrupo(user:Usuario|null) {
  return user?.companies.some(c => c.role === 'ADMIN') ?? false
}

/* Troca a farmácia ativa e recarrega a página: mais simples e seguro que invalidar cada
   cache/hook da aplicação um por um, e trocar de farmácia não é uma ação de todo momento. */
export function trocarEmpresaAtiva(empresaId:number) {
  salvarEmpresaAtiva(empresaId)
  window.location.reload()
}
