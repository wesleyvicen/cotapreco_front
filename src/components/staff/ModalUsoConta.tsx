import { Activity } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, date, ErroApi } from '../../api'
import { usarCamadaNoHistorico } from '../../hooks/usarCamadaNoHistorico'
import { guiaDoErp } from '../../lib/guiasErp'
import { formatarCnpj } from '../../lib/confirmacaoConta'
import { dataCurta, haQuantoTempo, ROTULO_ETAPA, SELO_USO } from '../../lib/usoConta'
import type { ContaStaff, UsoDetalhadoStaff } from '../../types'
import { AvisoErro, Carregando, EtiquetaStatus } from '../ComponentesUI'

/* Painel de suporte: onde a farmácia está e onde travou. Só leitura. Responde às perguntas de
   quem vai falar com o cliente: já cotou? recebeu proposta? gerou pedido? parou em qual passo
   do onboarding? quem da conta ainda entra? Seções sem conteúdo não aparecem. */
export default function ModalUsoConta({ conta, aoFechar }:{ conta:ContaStaff; aoFechar:()=>void }) {
  const [uso, setUso] = useState<UsoDetalhadoStaff|null>(null)
  const [erro, setErro] = useState('')

  usarCamadaNoHistorico(true, aoFechar)

  useEffect(() => {
    api<UsoDetalhadoStaff>(`/staff/accounts/${conta.grupoId}/uso`)
      .then(setUso)
      .catch(e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar os detalhes da conta.'))
  }, [conta.grupoId])

  return <div className="modal-backdrop" role="presentation"><div className="modal user-modal uso-modal" role="dialog" aria-modal="true" aria-labelledby="uso-titulo">
    <div className="modal-header"><div className="modal-icon"><Activity/></div>
      <div><h2 id="uso-titulo">{conta.nomeFarmacia}</h2><p>{conta.cnpj ? `${formatarCnpj(conta.cnpj)} · ` : ''}cliente desde {dataCurta(conta.criadoEm)}</p></div>
      <button type="button" className="icon-button" aria-label="Fechar" onClick={aoFechar}>×</button></div>

    <div className="uso-corpo">
      {erro && <AvisoErro message={erro}/>}
      {!uso ? !erro && <Carregando/> : <Conteudo uso={uso}/>}
    </div>

    <div className="modal-actions"><button type="button" className="button button-ghost" onClick={aoFechar} autoFocus>Fechar</button></div>
  </div></div>
}

function Conteudo({ uso }:{ uso:UsoDetalhadoStaff }) {
  const selo = SELO_USO[uso.resumo.situacao]
  const nuncaCotou = uso.resumo.situacao === 'NUNCA_COTOU'
  /* A demo do onboarding só confunde a lista de quem já cota de verdade. */
  const cotacoes = nuncaCotou ? [] : uso.ultimasCotacoes.filter(c => !c.demo)
  const onboardingPendente = uso.onboardingStatus === 'NOT_STARTED' || uso.onboardingStatus === 'IN_PROGRESS'
  const ondeParou = uso.onboardingStatus === 'IN_PROGRESS' && uso.onboardingEtapa ? ROTULO_ETAPA[uso.onboardingEtapa] : null
  const erp = uso.onboardingErp ? guiaDoErp(uso.onboardingErp).nome : null

  return <>
    <p className="uso-resumo">
      <span className={`uso-indicador uso-${selo.tom}`}>{selo.texto}</span>
      {/* Sem acesso registrado, o próprio selo (ou "Ainda não cotou") já diz o que importa. */}
      {uso.resumo.ultimoAcessoEm && <><span>·</span><span>último acesso {haQuantoTempo(uso.resumo.ultimoAcessoEm)}</span></>}
    </p>

    {nuncaCotou
      ? <div className="uso-aviso">
          <strong>Ainda não criou nenhuma cotação.</strong>
          <p>{ondeParou ? <>No onboarding, parou em <strong>{ondeParou}</strong>{erp && ` (ERP ${erp})`}.</>
            : uso.onboardingStatus === 'NOT_STARTED' ? 'Nem começou o onboarding.'
            : 'Pulou o onboarding para explorar sozinho.'}
            {uso.produtosCadastrados > 0 && ` Já tem ${uso.produtosCadastrados} produto${uso.produtosCadastrados !== 1 ? 's' : ''} no catálogo.`}</p>
        </div>
      : <>
          <div className="uso-numeros">
            <div><strong>{uso.resumo.cotacoes}</strong><span>cotações{uso.resumo.cotacoesAbertas > 0 && ` · ${uso.resumo.cotacoesAbertas} aberta${uso.resumo.cotacoesAbertas !== 1 ? 's' : ''}`}</span></div>
            <div><strong>{uso.respostasRecebidas}</strong><span>propostas recebidas</span></div>
            <div><strong>{uso.pedidosGerados}</strong><span>pedidos gerados</span></div>
            <div><strong>{uso.produtosCadastrados}</strong><span>produtos</span></div>
          </div>
          {onboardingPendente && <div className="uso-aviso">
            <strong>Onboarding não concluído.</strong>
            {ondeParou && <p>Parou em <strong>{ondeParou}</strong>{erp && ` (ERP ${erp})`}.</p>}
          </div>}
        </>}

    {cotacoes.length > 0 && <section className="uso-secao">
      <h3>Últimas cotações</h3>
      <ul className="uso-lista">{cotacoes.map(c => <li key={c.id}>
        <span><strong>{c.nome}</strong><small>{c.farmacia} · {c.respostas} proposta{c.respostas !== 1 ? 's' : ''}</small></span>
        <span><span title={date(c.criadoEm)}>{haQuantoTempo(c.criadoEm)}</span><EtiquetaStatus status={c.status}/></span>
      </li>)}</ul>
    </section>}

    <section className="uso-secao">
      <h3>Usuários</h3>
      <ul className="uso-lista">{uso.usuarios.map(u => <li key={u.email}>
        <span><strong>{u.nome}{!u.ativo && ' (inativo)'}</strong><small>{u.email}</small></span>
        <span title={u.ultimoAcessoEm ? date(u.ultimoAcessoEm) : undefined}>
          {u.ultimoAcessoEm ? `entrou ${haQuantoTempo(u.ultimoAcessoEm)}` : 'sem registro'}</span>
      </li>)}</ul>
    </section>

    {uso.integracoes.length > 0 && <section className="uso-secao">
      <h3>Integrações</h3>
      <ul className="uso-lista">{uso.integracoes.map(i => <li key={`${i.tipo}-${i.farmacia}`}>
        <span><strong>{i.tipo === 'MERCADO_FARMA' ? 'Mercado Farma' : i.tipo}</strong><small>{i.farmacia}</small></span>
        <span className={`uso-indicador uso-${i.status === 'CONECTADA' ? 'active' : 'overdue'}`}>{i.status === 'CONECTADA' ? 'Conectada' : 'Expirada'}</span>
      </li>)}</ul>
    </section>}
  </>
}
