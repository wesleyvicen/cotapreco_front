/* Os hooks usam o prefixo português "usar" por padrão de nomenclatura do projeto. */
import { api } from '../api'
import { criarChave } from '../cache/cacheConsulta'
import { usarConsulta } from './usarConsulta'
import { empresaAtiva } from '../lib/permissoes'
import type { Painel, Usuario } from '../types'

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

export function usarPainel(user:Usuario|null, geral=false){
  const empresa=empresaAtiva(user)
  const chave=!user?null:geral?criarChave('painel','geral',user.groupId,user.id):empresa?criarChave('painel',empresa.id,user.id):null
  return usarConsulta<Painel>(
    chave,
    ()=>api<Painel>(geral?'/dashboard/geral':'/dashboard'),
    {valido:painelValido,revalidarComPush:true,mensagemErro:'Não foi possível carregar o painel.'},
  )
}
