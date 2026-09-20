/* Os hooks usam o prefixo português "usar" por padrão de nomenclatura do projeto. */
/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback } from 'react'
import { api } from '../api'
import { criarChave } from '../cache/cacheConsulta'
import { usarConsulta } from './usarConsulta'
import type { EtapaOnboarding, Onboarding, SistemaErp, StatusOnboarding, Usuario } from '../types'

interface AtualizacaoOnboarding { status?:StatusOnboarding; erp?:SistemaErp; currentStep?:EtapaOnboarding }

function onboardingValido(valor:unknown):valor is Onboarding {
  if(!valor||typeof valor!=='object')return false
  const onboarding=valor as Partial<Onboarding>
  return typeof onboarding.status==='string'&&Boolean(onboarding.checklist)&&typeof onboarding.checklist?.accountCreated==='boolean'
}

/* O estado do onboarding é da conta, então a chave é o grupo: trocar de farmácia dentro do
   mesmo grupo não recomeça o fluxo. */
export function usarOnboarding(user:Usuario|null){
  const chave=user&&!user.staff?criarChave('onboarding',user.groupId):null
  const consulta=usarConsulta<Onboarding>(
    chave,
    ()=>api<Onboarding>('/onboarding'),
    {valido:onboardingValido,mensagemErro:'Não foi possível carregar seus primeiros passos.'},
  )
  const {recarregar}=consulta
  const atualizar=useCallback(async(mudanca:AtualizacaoOnboarding)=>{
    const atualizado=await api<Onboarding>('/onboarding',{method:'PATCH',body:JSON.stringify(mudanca)})
    /* Esperar a releitura é de propósito: o cache é compartilhado com o painel, e quem sai
       daqui (pular, concluir) navega logo em seguida. Sem isso o painel poderia ler o estado
       antigo e mandar a pessoa de volta para o fluxo que ela acabou de deixar. */
    await recarregar()
    return atualizado
  },[recarregar])
  return {...consulta,atualizar}
}

