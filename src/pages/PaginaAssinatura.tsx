import {
  ArrowRight, BadgeCheck, CalendarClock, CircleAlert, CreditCard, Loader2, MessageCircle, ShieldCheck, X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { api, date, ErroApi, money } from '../api'
import { usarAutenticacao } from '../autenticacao'
import { AvisoErro } from '../components/ComponentesUI'
import {
  assinaturaEmConfirmacao, LINK_WHATSAPP_ASSINATURA, precoDoPlano, ROTULO_STATUS, TOTAL_DIAS_TESTE,
} from '../lib/assinatura'
import CamposEndereco from '../components/CamposEndereco'
import { enderecoDoServidor, enderecoVazio, formatarTelefone, paraEnvio, type FormularioEndereco } from '../lib/endereco'
import type { AjusteQuantidade, Assinatura, CheckoutAssinatura, Conta, Empresa } from '../types'

/* A mensagem já vai com o nome da farmácia: do outro lado, saber quem está pedindo
   evita a primeira ida e volta da conversa. */
const linkComContexto = (farmacia:string, assunto:string) =>
  'https://wa.me/5581999441494?text=' + encodeURIComponent(`Olá! ${assunto} — farmácia ${farmacia}.`)

const INCLUSO = [
  'Cotações e comparativo de preços ilimitados',
  'Plano de compra por distribuidora, com pedido mínimo',
  'Conferência de recebimento e histórico de preços',
  'Exportação em Excel de tudo',
  'Usuários da equipe sem custo por acesso',
]

/* Mesma lista usada em "O que acontece quando vence" e na confirmação de cancelamento — os
   dois casos têm exatamente a mesma consequência (o acesso completo pausa quando o prazo
   pago acaba), só muda o que leva até lá. */
const CONTINUA_FUNCIONANDO = [
  'Consultar cotações, comparativos e pedidos já criados',
  'Histórico de preços entre cotações',
  'Exportar tudo em Excel',
  'Acessar a conta e trocar a senha',
]
const FICA_PAUSADO = [
  'Criar e abrir novas cotações',
  'Importar planilhas e gerar pedidos',
  'Cotação para OL',
  'Conferir recebimento e finalizar compras',
]

/* O webhook do Asaas costuma chegar em segundos, mas a farmácia volta do checkout antes
   dele. Em vez de mostrar "vencida" para quem acabou de pagar, a tela espera um pouco. */
const ESPERA_CONFIRMACAO_MS = 3000
const TENTATIVAS_CONFIRMACAO = 10

export default function PaginaAssinatura() {
  const { user, recarregarUsuario } = usarAutenticacao()
  const [assinatura, setAssinatura] = useState<Assinatura|null>(null)
  const [carregando, setCarregando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [retorno, setRetorno] = useState(() => new URLSearchParams(window.location.search).get('checkout') ?? '')
  const [completando, setCompletando] = useState(false)
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState<FormularioEndereco>(enderecoVazio)
  const [conta, setConta] = useState<Conta|null>(null)
  const [quantidadeEstimada, setQuantidadeEstimada] = useState(() => Math.max(1, user?.companies.length ?? 1))
  const [editandoQuantidade, setEditandoQuantidade] = useState(false)
  const [novaQuantidade, setNovaQuantidade] = useState(1)
  const [empresasLista, setEmpresasLista] = useState<Empresa[]|null>(null)
  const [erroQuantidade, setErroQuantidade] = useState('')
  const [salvandoQuantidade, setSalvandoQuantidade] = useState(false)
  const [desativando, setDesativando] = useState<number|null>(null)
  const [cancelando, setCancelando] = useState(false)
  const [cancelandoEnviando, setCancelandoEnviando] = useState(false)
  const [erroCancelamento, setErroCancelamento] = useState('')
  const tentativas = useRef(0)

  const carregar = useCallback(async () => {
    try { setAssinatura(await api<Assinatura>('/subscription')) }
    /* Um backend que ainda não expõe a assinatura não pode derrubar a tela: ela cai no
       estado derivado do usuário, que é o que existia antes desta integração. */
    catch { setAssinatura(null) }
    finally { setCarregando(false) }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

  /* Só para calcular a estimativa de preço por quantidade de farmácia — não muda o que é
     cobrado de verdade, que o backend sempre calcula pela quantidade real na hora do checkout. */
  useEffect(() => { api<Conta>('/account').then(setConta).catch(() => {}) }, [])

  /* Limpa o parâmetro da URL para o aviso de retorno não voltar a cada refresh nem vazar
     em link compartilhado. */
  useEffect(() => {
    if (!retorno) return
    window.history.replaceState({}, '', '/assinatura')
  }, [retorno])

  useEffect(() => {
    if (retorno !== 'sucesso' && !assinaturaEmConfirmacao(assinatura?.status)) return
    if (assinatura?.status === 'ACTIVE') { setRetorno(''); void recarregarUsuario(); return }
    if (tentativas.current >= TENTATIVAS_CONFIRMACAO) return
    const relogio = setTimeout(() => { tentativas.current += 1; void carregar() }, ESPERA_CONFIRMACAO_MS)
    return () => clearTimeout(relogio)
  }, [retorno, assinatura, carregar, recarregarUsuario])

  if (!user) return null

  const plano = precoDoPlano(assinatura)
  /* Preço estimado pela quantidade que a pessoa disser ter — some o adicional por farmácia
     igual o backend faz, só que aqui é cálculo de exibição, sem cobrar nada. */
  const precoEstimado = conta
    ? conta.precoBase + conta.precoAdicionalPorFarmacia * Math.max(0, quantidadeEstimada - 1)
    : plano.value
  const semPrazo = user.subscriptionUntil == null
  const vencida = user.accessAllowed === false
  const emTeste = user.onTrial
  const diasRestantes = user.daysLeft ?? 0
  /* Com 7 dias pela frente a pessoa está vivendo o dia 1, não o dia 0. */
  const diaAtual = Math.min(TOTAL_DIAS_TESTE, Math.max(1, TOTAL_DIAS_TESTE - diasRestantes + 1))

  const status = assinatura?.status
  const ativa = status === 'ACTIVE'
  const confirmando = retorno === 'sucesso' || assinaturaEmConfirmacao(status)
  const estado = semPrazo ? 'sem-prazo' : vencida ? 'vencida' : emTeste ? 'teste' : 'ativa'
  const rotulo = status ? ROTULO_STATUS[status]
    : { 'sem-prazo':'Acesso liberado', vencida:'Vencida', teste:'Período de teste', ativa:'Assinatura ativa' }[estado]

  const empresasAtivasLista = (empresasLista ?? []).filter(e => e.ativo)
  const precisaDesativar = editandoQuantidade ? Math.max(0, empresasAtivasLista.length - novaQuantidade) : 0

  const assinar = async (quantidade?:number) => {
    setErro(''); setEnviando(true)
    try {
      const checkout = await api<CheckoutAssinatura>('/subscription/checkout', {
        method:'POST', body:JSON.stringify({ quantidadeFarmacias: quantidade ?? null }),
      })
      /* Sai do app para a página do Asaas: o cartão é digitado lá, e nenhum dado dele
         chega a passar por este domínio. */
      window.location.href = checkout.checkoutUrl
    } catch (e) {
      /* Falta de endereço não é erro, é etapa: em vez de um aviso vermelho sem saída, a
         tela abre o formulário já preenchido com o que a farmácia tiver. */
      if (e instanceof ErroApi && e.fields.motivo === 'DADOS_COBRANCA_INCOMPLETOS') {
        setEnviando(false); await abrirCadastro(); return
      }
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível abrir o pagamento. Tente de novo em instantes.')
      setEnviando(false)
    }
  }

  const abrirCadastro = async () => {
    setCompletando(true)
    try {
      const conta = await api<Conta>('/account')
      setTelefone(formatarTelefone(conta.telefone ?? '')); setEndereco(enderecoDoServidor(conta.endereco))
    } catch { /* Sem os dados atuais o formulário abre vazio, que é o caso mais comum mesmo. */ }
  }

  const salvarCadastroEAssinar = async (evento:FormEvent) => {
    evento.preventDefault(); setErro(''); setEnviando(true)
    try {
      const conta = await api<Conta>('/account')
      await api<Conta>('/account', { method:'PUT', body:JSON.stringify({
        empresaPagadoraId:conta.empresaPagadoraId, telefone:telefone.replace(/\D/g, ''), endereco:paraEnvio(endereco),
      }) })
      setCompletando(false)
      await assinar(quantidadeEstimada)
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar os dados.')
      setEnviando(false)
    }
  }

  const abrirEdicaoQuantidade = () => {
    setErroQuantidade(''); setEditandoQuantidade(true)
    setNovaQuantidade(conta?.farmaciasContratadasAgendadas ?? conta?.farmaciasContratadas ?? 1)
    api<Empresa[]>('/companies').then(setEmpresasLista).catch(() => {})
  }

  const desativarEmpresa = async (id:number) => {
    setDesativando(id); setErroQuantidade('')
    try {
      await api(`/companies/${id}/desativar`, { method:'POST' })
      setEmpresasLista(await api<Empresa[]>('/companies'))
    } catch (e) { setErroQuantidade(e instanceof ErroApi ? e.message : 'Não foi possível desativar.') }
    finally { setDesativando(null) }
  }

  const salvarQuantidade = async () => {
    setErroQuantidade(''); setSalvandoQuantidade(true)
    try {
      const resultado = await api<AjusteQuantidade>('/subscription/quantity', {
        method:'POST', body:JSON.stringify({ quantidade:novaQuantidade }),
      })
      if (resultado.checkout) {
        /* Aumentou: precisa pagar o proporcional antes de valer. */
        window.location.href = resultado.checkout.checkoutUrl
        return
      }
      setAssinatura(resultado.assinatura)
      setConta(await api<Conta>('/account'))
      setEditandoQuantidade(false)
      void recarregarUsuario()
    } catch (e) { setErroQuantidade(e instanceof ErroApi ? e.message : 'Não foi possível salvar.') }
    finally { setSalvandoQuantidade(false) }
  }

  const confirmarCancelamento = async () => {
    setErroCancelamento(''); setCancelandoEnviando(true)
    try {
      setAssinatura(await api<Assinatura>('/subscription/cancel', { method:'POST' }))
      setCancelando(false)
      void recarregarUsuario()
    } catch (e) { setErroCancelamento(e instanceof ErroApi ? e.message : 'Não foi possível cancelar agora.') }
    finally { setCancelandoEnviando(false) }
  }

  return <div className="page narrow">
    <div className="page-header">
      <div>
        <span className="eyebrow green">Minha conta</span>
        <h1>Assinatura</h1>
        <p>Situação do acesso da {user.groupName} e o que fazer para renovar.</p>
      </div>
    </div>

    {erro && <AvisoErro message={erro}/>}

    {retorno === 'cancelado' && <div className="alert alert-warning">Você saiu do pagamento antes de terminar. Nada foi cobrado — dá para recomeçar quando quiser.</div>}
    {retorno === 'expirado' && <div className="alert alert-warning">A página de pagamento expirou por tempo. Clique em assinar de novo para abrir uma nova.</div>}

    {confirmando && !ativa && <section className="card assinatura-confirmando" role="status">
      <Loader2 className="spin"/>
      <div>
        <strong>Confirmando seu pagamento</strong>
        <span>O Asaas está nos avisando. Isso leva alguns segundos e esta tela atualiza sozinha — não precisa pagar de novo.</span>
      </div>
    </section>}

    <section className={`card assinatura-estado assinatura-estado-${estado}`}>
      <div className="assinatura-estado-icone">
        {vencida ? <CircleAlert/> : estado === 'teste' ? <CalendarClock/> : <BadgeCheck/>}
      </div>
      <div className="assinatura-estado-texto">
        <span className="assinatura-etiqueta">{rotulo}</span>
        {semPrazo
          ? <strong>Sem data de vencimento</strong>
          : vencida
            ? <strong>Venceu em {date(user.subscriptionUntil)}</strong>
            : <strong>{diasRestantes === 1 ? 'Termina hoje' : `Faltam ${diasRestantes} dias`}</strong>}
        {!semPrazo && !vencida && <small>Vale até {date(user.subscriptionUntil)}</small>}
        {semPrazo && <small>Esta conta não tem prazo definido. Fale com a gente se precisar de nota fiscal ou contrato.</small>}
        {ativa && assinatura?.nextDueDate && <small>Próxima cobrança em {date(assinatura.nextDueDate)}{assinatura.cardLast4 ? ` · cartão final ${assinatura.cardLast4}` : ''}</small>}
      </div>
    </section>

    {estado === 'teste' && <section className="card assinatura-progresso">
      <div className="assinatura-progresso-topo">
        <strong>Dia {diaAtual} de {TOTAL_DIAS_TESTE}</strong>
        <span>{diasRestantes === 1 ? 'último dia' : `${diasRestantes} dias restantes`}</span>
      </div>
      <div className="assinatura-barra" role="img" aria-label={`Dia ${diaAtual} de ${TOTAL_DIAS_TESTE} do período de teste`}>
        <span style={{ width:`${(diaAtual / TOTAL_DIAS_TESTE) * 100}%` }}/>
      </div>
    </section>}

    {status === 'OVERDUE' && <div className="alert alert-error">
      A última cobrança não foi paga. Assim que o cartão for regularizado o acesso volta sozinho — pelo botão abaixo você atualiza o cartão.
    </div>}

    {completando && <section className="card assinatura-cadastro">
      <div className="card-header"><div><h2>Falta só o endereço da farmácia</h2><p>A operadora de pagamento exige estes dados na cobrança. Você preenche uma vez — nas próximas vezes vai direto.</p></div></div>
      <form onSubmit={salvarCadastroEAssinar}>
        <CamposEndereco telefone={telefone} setTelefone={setTelefone} endereco={endereco} setEndereco={setEndereco}/>
        <div className="assinatura-cadastro-acoes">
          <button type="button" className="button button-ghost" disabled={enviando} onClick={() => { setCompletando(false); setErro('') }}>Agora não</button>
          <button className="button button-primary" disabled={enviando}>{enviando ? 'Salvando...' : <>Salvar e continuar <ArrowRight/></>}</button>
        </div>
      </form>
    </section>}

    {!ativa && !carregando && !completando && <section className="card assinatura-plano">
      <div className="assinatura-plano-topo">
        <div>
          <span className="eyebrow green">Plano mensal</span>
          <h2>{quantidadeEstimada > 1 ? 'Uma mensalidade para toda a rede' : 'Tudo liberado, um preço só'}</h2>
        </div>
        <div className="assinatura-preco">
          <strong>{money(precoEstimado)}</strong>
          <span>por mês{quantidadeEstimada > 1 ? ` · ${quantidadeEstimada} farmácias` : ''}</span>
        </div>
      </div>
      <ul className="assinatura-inclui">{INCLUSO.map(item => <li key={item}><BadgeCheck/>{item}</li>)}</ul>
      {conta && <div className="assinatura-estimador">
        <label>Quantas farmácias você tem no total?
          <input type="number" min={1} max={99} value={quantidadeEstimada}
            onChange={e => setQuantidadeEstimada(Math.max(1, Number(e.target.value) || 1))}/>
        </label>
        <p>Com {quantidadeEstimada} farmácia{quantidadeEstimada !== 1 ? 's' : ''}, sua mensalidade é <strong>{money(precoEstimado)}</strong>.
          {quantidadeEstimada > (user.companies.length || 1) && ' Você paga por todas agora e fica liberado para criar as que faltam — sem cobrança extra — pela tela Dados da Farmácia.'}
        </p>
        {quantidadeEstimada > 3 && <p className="assinatura-estimador-contato">
          <MessageCircle/>
          <a href={linkComContexto(user.groupName, `Tenho ${quantidadeEstimada} farmácias e quero negociar condições especiais`)} target="_blank" rel="noopener noreferrer">Rede grande? Fale com a gente para negociar condições especiais.</a>
        </p>}
      </div>}
      <button className="button button-primary button-large" disabled={enviando} onClick={() => void assinar(quantidadeEstimada)}>
        {enviando ? 'Abrindo pagamento...' : <><CreditCard/>{vencida || status === 'OVERDUE' ? 'Reativar por' : 'Assinar por'} {money(precoEstimado)}/mês</>}
      </button>
      <p className="assinatura-plano-nota">
        <ShieldCheck/>
        O cartão é cadastrado na página do Asaas, nossa processadora — os dados dele não passam pelo CotaPreço.
        A cobrança se repete todo mês e você cancela quando quiser, aqui mesmo.
      </p>
    </section>}

    {ativa && conta && <section className="card assinatura-quantidade">
      <div className="card-header">
        <div>
          <h2>Farmácias contratadas</h2>
          <p>{money(conta.precoBase)} base{conta.farmaciasContratadas > 1 && <> + {money(conta.precoAdicionalPorFarmacia)} × {conta.farmaciasContratadas - 1} adicional{conta.farmaciasContratadas - 1 !== 1 ? 'is' : ''}</>} = <strong>{money(conta.precoMensalAtual)}</strong>/mês</p>
        </div>
        {!editandoQuantidade && <button type="button" className="button button-secondary" onClick={abrirEdicaoQuantidade}>Editar quantidade</button>}
      </div>
      <p className="assinatura-quantidade-resumo">Contratado para <strong>{conta.farmaciasContratadas}</strong> farmácia{conta.farmaciasContratadas !== 1 ? 's' : ''}
        {' · '}{conta.empresasAtivas} ativa{conta.empresasAtivas !== 1 ? 's' : ''}.</p>
      {conta.farmaciasContratadasAgendadas != null && <p className="assinatura-quantidade-agendada">
        Já pago até {assinatura?.nextDueDate ? date(assinatura.nextDueDate) : 'a próxima cobrança'} — depois disso cai para <strong>{conta.farmaciasContratadasAgendadas}</strong> farmácia{conta.farmaciasContratadasAgendadas !== 1 ? 's' : ''}.
      </p>}

      {editandoQuantidade && <div className="assinatura-editor-quantidade">
        {erroQuantidade && <AvisoErro message={erroQuantidade}/>}
        <label>Nova quantidade contratada
          <input type="number" min={1} max={99} value={novaQuantidade}
            onChange={e => setNovaQuantidade(Math.max(1, Number(e.target.value) || 1))}/>
        </label>
        {precisaDesativar > 0 && <div className="assinatura-desativar-lista">
          <p>Você tem {empresasAtivasLista.length} farmácias ativas — desative {precisaDesativar} para reduzir para {novaQuantidade}.</p>
          <ul>{empresasAtivasLista.map(e => <li key={e.id}>
            <span>{e.nome}</span>
            <button type="button" className="button button-ghost" disabled={desativando === e.id} onClick={() => void desativarEmpresa(e.id)}>
              {desativando === e.id ? 'Desativando...' : 'Desativar'}
            </button>
          </li>)}</ul>
        </div>}
        <div className="modal-actions">
          <button type="button" className="button button-ghost" onClick={() => setEditandoQuantidade(false)}>Cancelar</button>
          <button type="button" className="button button-primary" disabled={salvandoQuantidade || precisaDesativar > 0} onClick={() => void salvarQuantidade()}>
            {salvandoQuantidade ? 'Salvando...' : novaQuantidade > conta.farmaciasContratadas ? 'Ir para o pagamento' : 'Salvar'}
          </button>
        </div>
      </div>}
    </section>}

    {ativa && <section className="card assinatura-acao">
      <div>
        <h2>Trocar o cartão ou cancelar</h2>
        <p>Para trocar o cartão, abra um novo pagamento — a cobrança antiga é substituída. Para nota fiscal, fale com a gente.</p>
      </div>
      <div className="assinatura-acao-botoes">
        <button className="button button-secondary" disabled={enviando} onClick={() => void assinar()}><CreditCard/>{enviando ? 'Abrindo...' : 'Atualizar cartão'}</button>
        <button type="button" className="button button-ghost" onClick={() => { setErroCancelamento(''); setCancelando(true) }}>Cancelar assinatura</button>
      </div>
    </section>}

    <section className="card assinatura-detalhe">
      <div className="card-header"><div><h2>O que acontece quando vence</h2><p>Nada é apagado. O que muda é só o que você consegue criar.</p></div></div>
      <div className="assinatura-listas">
        <div>
          <span className="assinatura-lista-titulo assinatura-lista-mantem">Continua funcionando</span>
          <ul>{CONTINUA_FUNCIONANDO.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
        <div>
          <span className="assinatura-lista-titulo assinatura-lista-pausa">Fica pausado</span>
          <ul>{FICA_PAUSADO.map(item => <li key={item}>{item}</li>)}</ul>
        </div>
      </div>
    </section>

    <p className="assinatura-rodape">
      Precisa de nota fiscal, contrato, Pix ou boleto no lugar do cartão? É só chamar —
      <a href={LINK_WHATSAPP_ASSINATURA} target="_blank" rel="noopener noreferrer"> falar no WhatsApp</a>.
    </p>

    {cancelando && <ModalCancelarAssinatura
      farmacia={user.groupName} preco={plano.value} farmacias={conta?.farmaciasContratadas ?? 1}
      ativaAte={assinatura?.activeUntil ?? null} ocupado={cancelandoEnviando} erro={erroCancelamento}
      aoFechar={() => setCancelando(false)} aoConfirmar={() => void confirmarCancelamento()}/>}
  </div>
}

function ModalCancelarAssinatura({ farmacia, preco, farmacias, ativaAte, ocupado, erro, aoFechar, aoConfirmar }:{
  farmacia:string; preco:number; farmacias:number; ativaAte:string|null; ocupado:boolean; erro:string
  aoFechar:()=>void; aoConfirmar:()=>void
}) {
  return <div className="modal-backdrop">
    <section className="modal cancelar-assinatura-modal" role="dialog" aria-modal="true" aria-labelledby="titulo-cancelar-assinatura">
      <div className="modal-header modal-header-simple">
        <div>
          <span className="eyebrow warning">Cancelar assinatura</span>
          <h2 id="titulo-cancelar-assinatura">Antes de ir, veja o que muda</h2>
          <p>{ativaAte ? <>Já está tudo pago até <strong>{date(ativaAte)}</strong> — o acesso continua até lá de qualquer forma, cancelando ou não. Cancelar só evita a próxima cobrança.</> : 'Cancelar evita a próxima cobrança.'}</p>
        </div>
        <button className="icon-button" aria-label="Fechar" disabled={ocupado} onClick={aoFechar}><X/></button>
      </div>

      {erro && <AvisoErro message={erro}/>}

      <div className="cancelar-assinatura-bloco cancelar-assinatura-mantem">
        <span className="cancelar-assinatura-titulo">Hoje, por {money(preco)}/mês, você tem</span>
        <ul>{INCLUSO.map(item => <li key={item}><BadgeCheck/>{item}</li>)}</ul>
      </div>

      <div className="cancelar-assinatura-bloco cancelar-assinatura-perde">
        <span className="cancelar-assinatura-titulo">{ativaAte ? `A partir de ${date(ativaAte)}` : 'Ao cancelar'}, isso pausa</span>
        <ul>{FICA_PAUSADO.map(item => <li key={item}>{item}</li>)}</ul>
        {farmacias > 1 && <p className="cancelar-assinatura-nota">Isso vale para as {farmacias} farmácias da rede, não só uma.</p>}
      </div>

      <div className="cancelar-assinatura-oferta">
        <MessageCircle/>
        <div>
          <strong>É sobre o preço, ou falta algo no sistema?</strong>
          <p>Fala com a gente antes — às vezes dá pra resolver sem cancelar.</p>
        </div>
        <a className="button button-secondary" href={linkComContexto(farmacia, 'Antes de cancelar, quero ver se dá pra resolver de outro jeito')}
          target="_blank" rel="noopener noreferrer">Falar no WhatsApp</a>
      </div>

      <div className="modal-actions cancelar-assinatura-acoes">
        <button type="button" className="cancelar-assinatura-link" disabled={ocupado} onClick={aoConfirmar}>
          {ocupado ? 'Cancelando...' : 'Cancelar mesmo assim'}
        </button>
        <button type="button" className="button button-primary" disabled={ocupado} onClick={aoFechar}>Manter minha assinatura</button>
      </div>
    </section>
  </div>
}
