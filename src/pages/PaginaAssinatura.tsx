import {
  ArrowRight, BadgeCheck, CalendarClock, CircleAlert, CreditCard, Loader2, MessageCircle, ShieldCheck,
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
import type { Assinatura, CheckoutAssinatura, Conta } from '../types'

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
  const tentativas = useRef(0)

  const carregar = useCallback(async () => {
    try { setAssinatura(await api<Assinatura>('/subscription')) }
    /* Um backend que ainda não expõe a assinatura não pode derrubar a tela: ela cai no
       estado derivado do usuário, que é o que existia antes desta integração. */
    catch { setAssinatura(null) }
    finally { setCarregando(false) }
  }, [])

  useEffect(() => { void carregar() }, [carregar])

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

  const assinar = async () => {
    setErro(''); setEnviando(true)
    try {
      const checkout = await api<CheckoutAssinatura>('/subscription/checkout', { method:'POST' })
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
        nome:conta.nome, cnpj:conta.cnpj, telefone:telefone.replace(/\D/g, ''), endereco:paraEnvio(endereco),
      }) })
      setCompletando(false)
      await assinar()
    } catch (e) {
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar os dados.')
      setEnviando(false)
    }
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
          <h2>Tudo liberado, um preço só</h2>
        </div>
        <div className="assinatura-preco">
          <strong>{money(plano.value)}</strong>
          <span>por mês</span>
        </div>
      </div>
      <ul className="assinatura-inclui">{INCLUSO.map(item => <li key={item}><BadgeCheck/>{item}</li>)}</ul>
      <button className="button button-primary button-large" disabled={enviando} onClick={() => void assinar()}>
        {enviando ? 'Abrindo pagamento...' : <><CreditCard/>{vencida || status === 'OVERDUE' ? 'Reativar por' : 'Assinar por'} {money(plano.value)}/mês</>}
      </button>
      <p className="assinatura-plano-nota">
        <ShieldCheck/>
        O cartão é cadastrado na página do Asaas, nossa processadora — os dados dele não passam pelo CotaPreço.
        A cobrança se repete todo mês e você cancela quando quiser, aqui mesmo.
      </p>
    </section>}

    {ativa && <section className="card assinatura-acao">
      <div>
        <h2>Trocar o cartão ou cancelar</h2>
        <p>Para trocar o cartão, abra um novo pagamento — a cobrança antiga é substituída. Para cancelar ou pedir nota fiscal, fale com a gente.</p>
      </div>
      <div className="assinatura-acao-botoes">
        <button className="button button-secondary" disabled={enviando} onClick={() => void assinar()}><CreditCard/>{enviando ? 'Abrindo...' : 'Atualizar cartão'}</button>
        <a className="button button-ghost" href={linkComContexto(user.groupName, 'Quero cancelar minha assinatura do CotaPreço')}
          target="_blank" rel="noopener noreferrer"><MessageCircle/>Cancelar assinatura</a>
      </div>
    </section>}

    <section className="card assinatura-detalhe">
      <div className="card-header"><div><h2>O que acontece quando vence</h2><p>Nada é apagado. O que muda é só o que você consegue criar.</p></div></div>
      <div className="assinatura-listas">
        <div>
          <span className="assinatura-lista-titulo assinatura-lista-mantem">Continua funcionando</span>
          <ul>
            <li>Consultar cotações, comparativos e pedidos já criados</li>
            <li>Histórico de preços entre cotações</li>
            <li>Exportar tudo em Excel</li>
            <li>Acessar a conta e trocar a senha</li>
          </ul>
        </div>
        <div>
          <span className="assinatura-lista-titulo assinatura-lista-pausa">Fica pausado</span>
          <ul>
            <li>Criar e abrir novas cotações</li>
            <li>Importar planilhas e gerar pedidos</li>
            <li>Cotação para OL</li>
            <li>Conferir recebimento e finalizar compras</li>
          </ul>
        </div>
      </div>
    </section>

    <p className="assinatura-rodape">
      Precisa de nota fiscal, contrato, Pix ou boleto no lugar do cartão? É só chamar —
      <a href={LINK_WHATSAPP_ASSINATURA} target="_blank" rel="noopener noreferrer"> falar no WhatsApp</a>.
    </p>
  </div>
}
