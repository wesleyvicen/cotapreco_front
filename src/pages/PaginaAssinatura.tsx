import { BadgeCheck, CalendarClock, CircleAlert, MessageCircle } from 'lucide-react'
import { usarAutenticacao } from '../autenticacao'
import { date } from '../api'
import { LINK_WHATSAPP_ASSINATURA } from '../lib/assinatura'

const TOTAL_TESTE = 7

/* A mensagem já vai com o nome da farmácia: do outro lado, saber quem está pedindo
   evita a primeira ida e volta da conversa. */
const linkComContexto = (farmacia:string, assunto:string) =>
  'https://wa.me/5581999441494?text=' + encodeURIComponent(`Olá! ${assunto} — farmácia ${farmacia}.`)

export default function PaginaAssinatura() {
  const { user } = usarAutenticacao()
  if (!user) return null

  const semPrazo = user.subscriptionUntil == null
  const vencida = user.accessAllowed === false
  const emTeste = user.onTrial
  const diasRestantes = user.daysLeft ?? 0
  /* Com 7 dias pela frente a pessoa está vivendo o dia 1, não o dia 0. */
  const diaAtual = Math.min(TOTAL_TESTE, Math.max(1, TOTAL_TESTE - diasRestantes + 1))

  const estado = semPrazo ? 'sem-prazo' : vencida ? 'vencida' : emTeste ? 'teste' : 'ativa'
  const rotulo = { 'sem-prazo':'Acesso liberado', vencida:'Vencida', teste:'Período de teste', ativa:'Assinatura ativa' }[estado]

  return <div className="page narrow">
    <div className="page-header">
      <div>
        <span className="eyebrow green">Minha conta</span>
        <h1>Assinatura</h1>
        <p>Situação do acesso da {user.companyName} e o que fazer para renovar.</p>
      </div>
    </div>

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
      </div>
    </section>

    {estado === 'teste' && <section className="card assinatura-progresso">
      <div className="assinatura-progresso-topo">
        <strong>Dia {diaAtual} de {TOTAL_TESTE}</strong>
        <span>{diasRestantes === 1 ? 'último dia' : `${diasRestantes} dias restantes`}</span>
      </div>
      <div className="assinatura-barra" role="img" aria-label={`Dia ${diaAtual} de ${TOTAL_TESTE} do período de teste`}>
        <span style={{ width:`${(diaAtual / TOTAL_TESTE) * 100}%` }}/>
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

    <section className="card assinatura-acao">
      <div>
        <h2>{vencida ? 'Reative sua assinatura' : estado === 'teste' ? 'Gostou? Continue depois do teste' : 'Renovar ou tirar dúvida'}</h2>
        <p>
          O acerto é feito no WhatsApp, com Pix ou boleto — sem cartão cadastrado e sem cobrança automática.
          Você fala direto com a gente, combina o plano e a data é estendida na hora.
        </p>
      </div>
      <div className="assinatura-acao-botoes">
        <a className="button button-primary" href={linkComContexto(user.companyName, vencida ? 'Quero reativar minha assinatura do CotaPreço' : 'Quero assinar o CotaPreço')}
          target="_blank" rel="noopener noreferrer"><MessageCircle/>{vencida ? 'Reativar pelo WhatsApp' : 'Assinar pelo WhatsApp'}</a>
        {estado === 'teste' && <a className="button button-secondary" href={linkComContexto(user.companyName, 'Preciso de mais tempo para testar o CotaPreço')}
          target="_blank" rel="noopener noreferrer">Preciso de mais tempo</a>}
      </div>
    </section>

    <p className="assinatura-rodape">
      Precisa de nota fiscal, contrato ou de mais de um acesso? É a mesma conversa —
      <a href={LINK_WHATSAPP_ASSINATURA} target="_blank" rel="noopener noreferrer"> chame no WhatsApp</a>.
    </p>
  </div>
}
