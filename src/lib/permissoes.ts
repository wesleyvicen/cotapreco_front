import type { EmpresaAcesso, Usuario } from '../types'

/* Sem seletor de farmácia na tela ainda, a empresa ativa é sempre a primeira do vínculo —
   o mesmo padrão que o backend usa quando a requisição não manda X-Empresa-Id. */
export function empresaAtiva(user:Usuario|null):EmpresaAcesso|null {
  return user?.companies[0] ?? null
}

export function perfilAtivo(user:Usuario|null) {
  return empresaAtiva(user)?.role ?? null
}

export function isAdminAtivo(user:Usuario|null) {
  return perfilAtivo(user) === 'ADMIN'
}

/* Ações de conta (assinatura, dados de cobrança) exigem ADMIN em qualquer farmácia do
   grupo, não necessariamente na farmácia ativa — mesma regra do backend. */
export function isAdminDoGrupo(user:Usuario|null) {
  return user?.companies.some(c => c.role === 'ADMIN') ?? false
}
