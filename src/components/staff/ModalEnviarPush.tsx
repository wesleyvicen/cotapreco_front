import { AlertCircle, BellRing, Plus, X } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { api, ErroApi } from '../../api'
import { usarCamadaNoHistorico } from '../../hooks/usarCamadaNoHistorico'

/* Só telas do próprio app: a notificação chega com a marca do CotaPreço, então o toque nela
   nunca leva para fora (o backend confere de novo). */
const DESTINOS = [
  ['/', 'Painel'], ['/cotacoes', 'Cotações'], ['/cotacoes/nova', 'Nova cotação'], ['/produtos', 'Produtos'],
  ['/assinatura', 'Assinatura'], ['/dados-farmacia', 'Dados da farmácia'],
] as const
/* O que cabe na notificação sem o celular cortar, medido no texto já montado. O campo aceita
   mais porque as chaves ocupam espaço: {dias_teste|poucos} vira "3". */
const IDEAL_TITULO = 60
const IDEAL_MENSAGEM = 180
const MAX_TITULO = 120
const MAX_MENSAGEM = 300
const MARCADOR = /\{([a-z_]+)(?:\|([^{}]*))?}/g

/* Mesma regra do ModeloPushStaff no servidor; aqui só monta a prévia. O envio de verdade é
   montado lá, com os dados de cada pessoa. */
const montar = (texto:string, valores:Record<string, string>) =>
  texto.replace(MARCADOR, (_, chave:string, reserva?:string) => valores[chave] ?? reserva ?? '').replace(/ {2,}/g, ' ').trim()

/* Pontos de partida para as campanhas de conversão e recuperação; tudo continua editável.
   Cada um combina com um filtro da lista: escolha as contas pelo filtro, depois o modelo. */
const MODELOS = [
  { rotulo:'Teste acabando', paraQuem:'Quem está em teste e ainda não decidiu',
    titulo:'{nome}, faltam {dias_teste|poucos} dias do seu teste',
    mensagem:'Assine até {fim_teste|o fim do teste} e a {farmacia} continua cotando sem perder o histórico de preços.', link:'/assinatura' },
  { rotulo:'Teste venceu', paraQuem:'Quem testou e não assinou',
    titulo:'{nome}, sentimos sua falta',
    mensagem:'Seu teste acabou há {dias_vencido|alguns} dias. As {cotacoes} cotações da {farmacia} continuam salvas: assine e retome de onde parou.', link:'/assinatura' },
  { rotulo:'Nunca cotou', paraQuem:'Quem travou antes da primeira cotação',
    titulo:'{saudacao}, {nome}! Vamos fazer a primeira cotação?',
    mensagem:'Leva poucos minutos: importe sua lista e mande o link para as distribuidoras. Estamos aqui se precisar de ajuda.', link:'/cotacoes/nova' },
  { rotulo:'Parado', paraQuem:'Quem não cota há mais de 30 dias',
    titulo:'{nome}, os preços mudaram desde a sua última cotação',
    mensagem:'Faz {dias_sem_acesso|um tempo} dias que a {farmacia} não cota. Abra uma cotação nova e compare as distribuidoras de novo.', link:'/cotacoes/nova' },
  { rotulo:'Oferta com cupom', paraQuem:'Depois de aplicar um cupom na conta',
    titulo:'{nome}, separamos uma condição para a {farmacia}',
    mensagem:'Seu cupom {cupom|de desconto} já está aplicado. Assine agora e garanta a mensalidade de {mensalidade|valor promocional}.', link:'/assinatura' },
  { rotulo:'Novidade', paraQuem:'Comunicado para qualquer conta',
    titulo:'Novidade no CotaPreço',
    mensagem:'{saudacao}, {nome}! Preparamos uma melhoria para a {farmacia}. Toque para ver.', link:'/' },
]

export interface ContaParaPush { grupoId:number; nomeFarmacia:string; dispositivos:number }
interface Variavel { chave:string; descricao:string; grupo:string; exemplo:string; podeFaltar:boolean }

/* A prévia não consulta o servidor: monta o texto com uma pessoa inventada que tem todos os
   dados preenchidos. Quem pode ficar sem algum dado é avisado à parte (ver podeFaltar). */
const hojeMais = (dias:number) => new Date(Date.now() + dias * 86_400_000).toLocaleDateString('pt-BR')
const saudacaoAgora = () => { const hora = new Date().getHours(); return hora >= 5 && hora < 12 ? 'Bom dia' : hora >= 12 && hora < 18 ? 'Boa tarde' : 'Boa noite' }
const pessoaFicticia = ():Record<string, string> => ({
  nome:'Maria', nome_completo:'Maria Souza', saudacao:saudacaoAgora(), dias_sem_acesso:'12', farmacia:'Drogaria Central',
  farmacias_contratadas:'1', cotacoes:'8', cotacoes_abertas:'1', fim_teste:hojeMais(3), dias_teste:'3', vencimento:hojeMais(3),
  dias_vencimento:'3', dias_vencido:'5', mensalidade:'R$ 149,90', cupom:'BEMVINDO',
})
/* Variáveis escritas sem texto reserva: {chave} sim, {chave|reserva} não. */
const usadasSemReserva = (texto:string) => [...texto.matchAll(MARCADOR)].filter(m => m[2] === undefined).map(m => m[1])
const usadas = (texto:string) => [...texto.matchAll(MARCADOR)].map(m => m[1])
type Campo = 'titulo'|'mensagem'

let variaveisEmMemoria:Variavel[]|null = null
const plural = (n:number, singular:string, varios:string) => `${n} ${n === 1 ? singular : varios}`

/* Push escrito pela equipe para uma ou várias contas. As variáveis ({nome}, {fim_teste}...)
   viram os dados de cada pessoa no envio. À direita (no topo, no celular) fica a notificação
   do jeito que chega, montada com pessoas fictícias enquanto se escreve. */
export default function ModalEnviarPush({ contas, aoFechar, aoEnviar }:{
  contas:ContaParaPush[]; aoFechar:()=>void; aoEnviar:(mensagem:string)=>void
}) {
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [link, setLink] = useState<string>('/')
  const [erro, setErro] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [variaveis, setVariaveis] = useState<Variavel[]>(variaveisEmMemoria ?? [])
  const [seletorAberto, setSeletorAberto] = useState<Campo|null>(null)
  const campos = { titulo:useRef<HTMLInputElement>(null), mensagem:useRef<HTMLTextAreaElement>(null) }
  /* Onde estava o cursor de cada campo: abrir a lista de dados tira o foco, e o dado escolhido
     tem que entrar onde a pessoa parou de digitar. */
  const cursor = useRef<Record<Campo, [number, number]|null>>({ titulo:null, mensagem:null })

  usarCamadaNoHistorico(true, aoFechar)

  useEffect(() => {
    if (variaveisEmMemoria) return
    api<Variavel[]>('/staff/push/variaveis').then(lista => { variaveisEmMemoria = lista; setVariaveis(lista) }).catch(() => {})
  }, [])

  const valor = (campo:Campo) => campo === 'titulo' ? titulo : mensagem
  const alterar = (campo:Campo, texto:string) => campo === 'titulo' ? setTitulo(texto) : setMensagem(texto)
  const lembrarCursor = (campo:Campo) => {
    const alvo = campos[campo].current
    if (alvo) cursor.current[campo] = [alvo.selectionStart ?? alvo.value.length, alvo.selectionEnd ?? alvo.value.length]
  }

  const inserir = (campo:Campo, chave:string) => {
    const marcador = `{${chave}}`
    const atual = valor(campo)
    const [inicio, fim] = cursor.current[campo] ?? [atual.length, atual.length]
    alterar(campo, (atual.slice(0, inicio) + marcador + atual.slice(fim)).slice(0, campo === 'titulo' ? MAX_TITULO : MAX_MENSAGEM))
    const depois = inicio + marcador.length
    cursor.current[campo] = [depois, depois]
    setSeletorAberto(null)
    requestAnimationFrame(() => { const alvo = campos[campo].current; alvo?.focus(); alvo?.setSelectionRange(depois, depois) })
  }

  const usarModelo = (modelo:typeof MODELOS[number]) => {
    setTitulo(modelo.titulo); setMensagem(modelo.mensagem); setLink(modelo.link); setSeletorAberto(null)
    cursor.current = { titulo:null, mensagem:null }
  }

  const aparelhos = contas.reduce((total, conta) => total + conta.dispositivos, 0)
  const destinatarios = contas.length === 1
    ? `Para ${contas[0].nomeFarmacia} (${plural(aparelhos, 'aparelho', 'aparelhos')})`
    : `Para ${contas.length} contas (${plural(aparelhos, 'aparelho', 'aparelhos')})`
  const descricao = (chave:string) => variaveis.find(v => v.chave === chave)?.descricao ?? chave
  const chaves = new Set(variaveis.map(v => v.chave))
  /* Só confere a grafia depois que a lista chegou: antes disso tudo pareceria desconhecido. */
  const desconhecidas = variaveis.length === 0 ? [] : [...new Set([...usadas(titulo), ...usadas(mensagem)].filter(c => !chaves.has(c)))]
  const valores = pessoaFicticia()
  const escreveuAlgo = titulo.trim() !== '' || mensagem.trim() !== ''
  const tituloMontado = montar(titulo, valores)
  const mensagemMontada = montar(mensagem, valores)
  /* Dado que nem toda conta tem (data do teste numa conta que já assinou), escrito sem reserva. */
  const semReserva = [...new Set([...usadasSemReserva(titulo), ...usadasSemReserva(mensagem)])]
    .filter(chave => variaveis.find(v => v.chave === chave)?.podeFaltar)
  const avisos = <>
    {desconhecidas.length > 0 && <p className="push-aviso push-aviso-erro"><AlertCircle size={15}/>
      <span>{desconhecidas.map(v => `{${v}}`).join(', ')} não existe. Corrija a grafia ou use Inserir dado.</span></p>}
    {semReserva.map(chave => <p key={chave} className="push-aviso"><AlertCircle size={15}/>
      <span>Nem toda conta tem {descricao(chave).toLowerCase()}. Escreva {`{${chave}|texto reserva}`} para não sobrar um buraco no texto de quem não tem.</span></p>)}
  </>
  const prontoParaEnviar = titulo.trim() !== '' && mensagem.trim() !== '' && desconhecidas.length === 0

  const enviar = async (evento:FormEvent) => {
    evento.preventDefault()
    setErro(''); setEnviando(true)
    try {
      const resultado = await api<{ contas:number; dispositivos:number }>('/staff/push', { method:'POST',
        body:JSON.stringify({ grupoIds:contas.map(c => c.grupoId), titulo, mensagem, link }) })
      aoEnviar(`Notificação enviada para ${plural(resultado.dispositivos, 'aparelho', 'aparelhos')}`
        + (resultado.contas > 1 ? ` em ${resultado.contas} contas.` : '.'))
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível enviar a notificação.') }
    finally { setEnviando(false) }
  }

  const campoTexto = (campo:Campo) => {
    const limite = campo === 'titulo' ? MAX_TITULO : MAX_MENSAGEM
    const ideal = campo === 'titulo' ? IDEAL_TITULO : IDEAL_MENSAGEM
    /* Conta o que a pessoa lê: o texto já montado com a pessoa de exemplo da prévia. */
    const montado = campo === 'titulo' ? tituloMontado : mensagemMontada
    const tamanho = montado.length
    const comum = {
      id:`push-${campo}`, required:true, maxLength:limite, value:valor(campo),
      onSelect:() => lembrarCursor(campo), onKeyUp:() => lembrarCursor(campo), onBlur:() => lembrarCursor(campo),
    }
    return <div className="push-campo">
      <div className="push-campo-topo">
        <label htmlFor={`push-${campo}`}>{campo === 'titulo' ? 'Título' : 'Mensagem'}</label>
        <span className={tamanho > ideal ? 'push-contador push-contador-perto' : 'push-contador'}
          title="Tamanho do texto que chega, já com os dados da pessoa">{tamanho > ideal ? `${tamanho}/${ideal}, pode ser cortado` : `${tamanho}/${ideal}`}</span>
        <button type="button" className="push-inserir" aria-expanded={seletorAberto === campo}
          onClick={() => setSeletorAberto(atual => atual === campo ? null : campo)}>
          {seletorAberto === campo ? <X size={14}/> : <Plus size={14}/>}Inserir dado</button>
      </div>
      {campo === 'titulo'
        ? <input ref={campos.titulo} {...comum} placeholder="Ex.: {nome}, seu teste acaba amanhã" onChange={e => setTitulo(e.target.value)}/>
        : <textarea ref={campos.mensagem} {...comum} rows={4} placeholder="O que a pessoa vai ler ao abrir a notificação" onChange={e => setMensagem(e.target.value)}/>}
      {seletorAberto === campo && <SeletorDados variaveis={variaveis} aoEscolher={chave => inserir(campo, chave)}/>}
    </div>
  }

  return <div className="modal-backdrop push-fundo" role="presentation"><form className="modal push-modal" onSubmit={enviar} aria-labelledby="push-titulo-modal">
    <header className="push-cabecalho">
      <div className="modal-icon"><BellRing/></div>
      <div><h2 id="push-titulo-modal">Enviar notificação</h2><p>{destinatarios}</p></div>
      <button type="button" className="icon-button" aria-label="Fechar" onClick={aoFechar}><X size={18}/></button>
    </header>

    <div className="push-corpo">
      <div className="push-escrita">
        <section className="push-bloco" aria-labelledby="push-modelos-titulo">
          <h3 id="push-modelos-titulo">Comece por um modelo</h3>
          <div className="push-modelos">
            {MODELOS.map(modelo => {
              const ativo = modelo.titulo === titulo && modelo.mensagem === mensagem
              return <button key={modelo.rotulo} type="button" className={ativo ? 'push-modelo ativo' : 'push-modelo'} aria-pressed={ativo} onClick={() => usarModelo(modelo)}>
                <strong>{modelo.rotulo}</strong><span>{modelo.paraQuem}</span>
              </button>
            })}
          </div>
        </section>

        <section className="push-bloco">
          <h3>Texto</h3>
          {campoTexto('titulo')}
          {campoTexto('mensagem')}
          {/* No celular a prévia fica presa no topo e só cabe a notificação: os avisos descem
              para junto do texto, que é onde a pessoa vai corrigir. */}
          <div className="push-avisos push-avisos-no-texto">{avisos}</div>
          <p className="push-dica">Dados entre chaves, como {'{nome}'}, mudam para cada pessoa. Se a farmácia não tiver o dado, escreva um texto reserva: {'{dias_teste|poucos}'}.</p>
        </section>

        <section className="push-bloco">
          <label className="push-destino">Ao tocar, abre
            <select value={link} onChange={e => setLink(e.target.value)}>
              {DESTINOS.map(([caminho, rotulo]) => <option key={caminho} value={caminho}>{rotulo}</option>)}
            </select>
          </label>
        </section>
      </div>

      <aside className="push-previa" aria-live="polite" aria-label="Prévia da notificação">
        <div className="push-previa-topo">
          <h3>Como chega <span className="push-ficticio">Dados fictícios</span></h3>
        </div>
        {escreveuAlgo
          ? <>
              <div className="push-notificacao">
                <img src="/cotapreco-icon-192.png" alt="" width={36} height={36}/>
                <div>
                  <span className="push-notificacao-app">CotaPreço <time>agora</time></span>
                  <strong className={tituloMontado ? undefined : 'push-notificacao-falta'}>{tituloMontado || 'Escreva o título'}</strong>
                  <p className={mensagemMontada ? undefined : 'push-notificacao-falta'}>{mensagemMontada || 'Escreva a mensagem'}</p>
                </div>
              </div>
              <p className="push-previa-para">Nome, farmácia e datas são inventados. No envio, cada pessoa recebe os próprios dados.</p>
            </>
          : <div className="push-notificacao push-notificacao-vazia">
              <img src="/cotapreco-icon-192.png" alt="" width={36} height={36}/>
              <p>Escolha um modelo ou escreva o texto para ver a notificação de cada pessoa aqui.</p>
            </div>}
        <div className="push-avisos push-avisos-ao-lado">{avisos}</div>
      </aside>
    </div>

    <footer className="push-rodape">
      {erro ? <p className="push-aviso push-aviso-erro" role="alert"><AlertCircle size={15}/><span>{erro}</span></p>
        : <p className="push-rodape-nota">Registrado na auditoria com o seu nome.</p>}
      <div>
        <button type="button" className="button button-ghost" onClick={aoFechar}>Cancelar</button>
        <button className="button button-primary" disabled={enviando || !prontoParaEnviar}>
          <BellRing size={16}/>{enviando ? 'Enviando...' : `Enviar para ${plural(aparelhos, 'aparelho', 'aparelhos')}`}</button>
      </div>
    </footer>
  </form></div>
}

/* Lista dos dados que dá para inserir, aberta embaixo do campo: cada linha diz o que o dado é
   e um exemplo do que vira, em vez de deixar a pessoa adivinhar pelo nome entre chaves. */
function SeletorDados({ variaveis, aoEscolher }:{ variaveis:Variavel[]; aoEscolher:(chave:string) => void }) {
  if (variaveis.length === 0) return <div className="push-seletor"><p className="push-dica">Carregando os dados disponíveis...</p></div>
  const grupos = [...new Set(variaveis.map(v => v.grupo))]
  return <div className="push-seletor" role="listbox" aria-label="Dados para inserir">
    {grupos.map(grupo => <div key={grupo} className="push-seletor-grupo">
      <h4>{grupo}</h4>
      {variaveis.filter(v => v.grupo === grupo).map(v =>
        <button key={v.chave} type="button" role="option" aria-selected={false} onClick={() => aoEscolher(v.chave)}>
          <span>{v.descricao}</span><small>ex.: {v.exemplo}</small>
        </button>)}
    </div>)}
  </div>
}
