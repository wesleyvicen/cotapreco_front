import { Ticket } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, date, ErroApi } from '../../api'
import { usarCamadaNoHistorico } from '../../hooks/usarCamadaNoHistorico'
import { ROTULO_TIPO_CUPOM } from '../../lib/cupom'
import type { ContaStaff, Cupom, CupomDaConta, PaginaCupons } from '../../types'
import { AvisoErro, Carregando, EstadoVazio } from '../ComponentesUI'

/* A equipe aplica um cupom direto numa conta (cliente antigo, retenção), sem a farmácia
   digitar nada. Só aparecem cupons que valem agora: as regras de quem pode usar ficam no
   backend, que devolve o motivo quando a conta não pode. */
const CANAL:Record<CupomDaConta['canal'],string> = { CADASTRO:'no cadastro', ASSINATURA:'na tela de assinatura', EQUIPE:'aplicado pela equipe' }
const SITUACAO:Record<CupomDaConta['situacao'],{ texto:string, tom:string }> = {
  EM_USO:{ texto:'Em uso', tom:'active' }, CONCLUIDO:{ texto:'Concluído', tom:'none' }, ENCERRADO:{ texto:'Encerrado antes', tom:'canceled' },
}

export default function ModalAplicarCupom({ conta, aoFechar, aoAplicar }:{
  conta:ContaStaff; aoFechar:()=>void; aoAplicar:(atualizada:ContaStaff)=>void
}) {
  const [cupons, setCupons] = useState<Cupom[]|null>(null)
  const [historico, setHistorico] = useState<CupomDaConta[]|null>(null)
  const [escolhido, setEscolhido] = useState('')
  const [erro, setErro] = useState('')
  const [salvando, setSalvando] = useState(false)

  usarCamadaNoHistorico(true, aoFechar)

  useEffect(() => {
    Promise.all([
      api<PaginaCupons>('/staff/cupons?pagina=0&tamanho=100'),
      api<CupomDaConta[]>(`/staff/cupons/contas/${conta.grupoId}`),
    ]).then(([pagina, usados]) => { setCupons(pagina.itens.filter(c => c.situacao === 'ATIVO')); setHistorico(usados) })
      .catch(() => setErro('Não foi possível carregar os cupons.'))
  }, [conta.grupoId])

  /* A equipe pode reaplicar um cupom que a conta já usou (a própria farmácia não pode); o
     aviso só deixa isso claro antes do clique. */
  const jaUsado = (cupom:Cupom) => historico?.some(h => h.codigo === cupom.codigo) ?? false

  const aplicar = async (evento:FormEvent) => {
    evento.preventDefault()
    if (!escolhido) return
    setErro(''); setSalvando(true)
    try {
      aoAplicar(await api<ContaStaff>(`/staff/accounts/${conta.grupoId}/cupom`, { method:'PUT', body:JSON.stringify({ codigo:escolhido }) }))
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível aplicar o cupom.') }
    finally { setSalvando(false) }
  }

  const cupom = cupons?.find(c => c.codigo === escolhido)
  const substitui = conta.cupomAtivo && cupom && cupom.tipo !== 'TRIAL_ESTENDIDO'

  return <div className="modal-backdrop" role="presentation"><form className="modal user-modal cupom-modal" onSubmit={aplicar}>
    <div className="modal-header"><div className="modal-icon"><Ticket/></div><div><h2>Aplicar cupom</h2><p>{conta.nomeFarmacia}</p></div>
      <button type="button" className="icon-button" aria-label="Fechar" onClick={aoFechar}>×</button></div>
    <div className="cupom-modal-corpo">
      {erro && <AvisoErro message={erro}/>}
      {historico && <section className="cupom-historico">
        <h3>Cupons desta conta</h3>
        {historico.length === 0
          ? <p className="cupom-historico-vazio">Esta conta ainda não usou nenhum cupom.</p>
          : <ul>{historico.map(h => <li key={h.resgateId}>
              <span className="cupom-escolha-texto">
                <strong className="cupom-codigo">{h.codigo}</strong>
                <span>{h.beneficio}</span>
                <small>Usado em {date(h.resgatadoEm)} · {CANAL[h.canal]}
                  {h.situacao === 'EM_USO' && h.mesesRestantes != null && ` · ${h.mesesRestantes === 1 ? 'falta 1 mensalidade' : `faltam ${h.mesesRestantes} mensalidades`}`}
                  {/* Cupom de teste é consumido na hora: a data de fim repetiria a de uso. */}
                  {h.situacao !== 'EM_USO' && h.tipo !== 'TRIAL_ESTENDIDO' && h.encerradoEm && ` · até ${date(h.encerradoEm)}`}</small>
              </span>
              <span className={`status-badge status-${SITUACAO[h.situacao].tom}`}>{SITUACAO[h.situacao].texto}</span>
            </li>)}</ul>}
      </section>}
      {!cupons
        ? !erro && <Carregando/>
        : cupons.length === 0
          ? <EstadoVazio title="Nenhum cupom disponível" description="Crie um cupom na aba Cupons. Só aparecem cupons ativos e dentro da validade."/>
          : <fieldset className="cupom-escolha">
              <legend>Qual cupom?</legend>
              {cupons.map(c => { const usado = jaUsado(c); return <label key={c.id}
                className={`cupom-escolha-item${escolhido === c.codigo ? ' ativo' : ''}`}>
                <input type="radio" name="cupom-conta" value={c.codigo} checked={escolhido === c.codigo} onChange={() => setEscolhido(c.codigo)}/>
                <span className="cupom-escolha-texto">
                  <strong className="cupom-codigo">{c.codigo}</strong>
                  <span>{c.beneficio}</span>
                </span>
                <small>{usado && <span className="cupom-ja-usado">Já usado nesta conta<br/></span>}
                  {ROTULO_TIPO_CUPOM[c.tipo]}{c.limiteUsos != null ? ` · ${c.usos} de ${c.limiteUsos} usos` : ''}</small>
              </label> })}
            </fieldset>}
      {/* O histórico acima já mostra o cupom em uso; o aviso só aparece quando a escolha vai encerrá-lo. */}
      {substitui && <p className="modal-nota assinatura-cupom-aviso">O cupom <strong>{conta.cupomAtivo}</strong> em uso é encerrado e o <strong>{escolhido}</strong> passa a valer: nunca dois descontos juntos.</p>}
      {conta.precoMensalPersonalizado != null && <p className="modal-nota">Conta com preço negociado: cupom de desconto não se aplica. Para mudar o preço, use Negociar.</p>}
      <p className="modal-nota">Aplicar gasta 1 uso do cupom e fica registrado na auditoria. Se a conta já assina, o valor novo vale a partir da próxima cobrança.</p>
    </div>
    <div className="modal-actions"><button type="button" className="button button-ghost" onClick={aoFechar}>Cancelar</button>
      <button className="button button-primary" disabled={salvando || !escolhido}>{salvando ? 'Aplicando...' : 'Aplicar cupom'}</button></div>
  </form></div>
}
