/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useState } from 'react'
import { apiPublica, ErroApi } from '../api'
import { cnpjValido } from '../lib/cnpj'
import type { DadosPublicosCnpj } from '../types'

export type StatusCnpj = 'ocioso' | 'buscando' | 'encontrado' | 'nao-encontrado' | 'indisponivel'
export interface EstadoCnpj { status:StatusCnpj; dados:DadosPublicosCnpj|null }

/* Abrir e fechar a mesma farmácia na lista não precisa ir ao servidor de novo: a base da
   Receita muda uma vez por mês. */
const memoria = new Map<string, DadosPublicosCnpj>()
const OCIOSO:EstadoCnpj = { status:'ocioso', dados:null }

/* Consulta os dados públicos assim que o CNPJ fica completo e válido. É conveniência: qualquer
   falha só deixa de preencher, os campos continuam editáveis à mão. */
export function usarDadosCnpj(cnpj:string|null|undefined):EstadoCnpj {
  const digitos = (cnpj ?? '').replace(/\D/g, '')
  const consultavel = cnpjValido(digitos)
  const [estado, setEstado] = useState<EstadoCnpj & { digitos:string }>({ ...OCIOSO, digitos:'' })

  useEffect(() => {
    if (!consultavel || memoria.has(digitos)) return
    let ativo = true
    setEstado({ status:'buscando', dados:null, digitos })
    apiPublica<DadosPublicosCnpj>(`/cnpj/${digitos}`)
      .then(dados => { memoria.set(digitos, dados); if (ativo) setEstado({ status:'encontrado', dados, digitos }) })
      .catch(e => { if (ativo) setEstado({ status:e instanceof ErroApi && e.status === 404 ? 'nao-encontrado' : 'indisponivel', dados:null, digitos }) })
    return () => { ativo = false }
  }, [digitos, consultavel])

  if (!consultavel) return OCIOSO
  const lembrado = memoria.get(digitos)
  if (lembrado) return { status:'encontrado', dados:lembrado }
  return estado.digitos === digitos ? { status:estado.status, dados:estado.dados } : { status:'buscando', dados:null }
}

/* Nome que a farmácia usa no dia a dia: o fantasia quando existe, senão a razão social. */
export const nomeSugerido = (dados:DadosPublicosCnpj) => dados.nomeFantasia ?? dados.razaoSocial ?? ''
