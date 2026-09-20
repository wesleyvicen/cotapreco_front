import { ArrowLeft, Check } from 'lucide-react'
import type { FormEvent } from 'react'
import { dataHoraLocal } from '../../lib/sugestoesCotacao'

/* Nome e prazo já chegam preenchidos com as mesmas sugestões do formulário normal: a etapa é
   um confirmar, não um formulário para preencher. */
export default function OnboardingCriacao({ nome, setNome, prazo, setPrazo, totalProdutos, aoCriar, aoVoltar, ocupado }:{
  nome:string; setNome:(valor:string)=>void; prazo:string; setPrazo:(valor:string)=>void
  totalProdutos:number; aoCriar:()=>void; aoVoltar:()=>void; ocupado:boolean
}) {
  return <form onSubmit={(evento:FormEvent) => { evento.preventDefault(); aoCriar() }}>
    <div className="wizard-heading"><span>Passo 5 de 5</span><h2>Tudo pronto para enviar</h2><p>{totalProdutos} {totalProdutos === 1 ? 'produto vai' : 'produtos vão'} nesta cotação. Você pode mudar o nome e o prazo.</p></div>
    <div className="form-grid">
      <label className="full">Nome da cotação<input required maxLength={180} value={nome} onChange={evento => setNome(evento.target.value)}/></label>
      <label className="full">Prazo para respostas <small>Opcional</small><input type="datetime-local" value={prazo} min={dataHoraLocal()} onChange={evento => setPrazo(evento.target.value)}/></label>
    </div>
    <div className="onboarding-actions">
      <button type="button" className="button button-ghost" disabled={ocupado} onClick={aoVoltar}><ArrowLeft/>Voltar</button>
      <button className="button button-primary" disabled={ocupado}>{ocupado ? 'Criando...' : 'Criar minha primeira cotação'} <Check/></button>
    </div>
  </form>
}
