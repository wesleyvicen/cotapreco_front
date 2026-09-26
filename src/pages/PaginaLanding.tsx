import { ArrowRight, BadgeCheck, Boxes, Building2, CheckCircle2, Clock3, FileSpreadsheet, Layers, LineChart, Link2, MessageCircle, PackageCheck, Quote, Scale, Search, ShieldCheck, Sparkles, Tag, Users } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { money } from '../api'
import RodapeSite from '../components/RodapeEmpresa'
import { INCLUSO, linkWhatsappNegociarFarmacias, linkWhatsappRedes, PLANO_PADRAO, PRECO_ADICIONAL_FARMACIA_PADRAO, TOTAL_DIAS_TESTE } from '../lib/assinatura'
import { LinkInterno } from '../roteamento'

const PERGUNTAS = [
  {
    pergunta: 'Preciso cadastrar cartão de crédito para testar?',
    resposta: `Não. São ${TOTAL_DIAS_TESTE} dias com o sistema inteiro liberado, sem cartão e sem cobrança automática no fim do teste.`,
  },
  {
    pergunta: 'O preço muda de acordo com quantas pessoas usam?',
    resposta: 'Não. A mensalidade é por farmácia, não por usuário. Comprador, gerente ou dono podem ter acesso sem custo adicional.',
  },
  {
    pergunta: 'Tenho mais de uma farmácia. Como fica o preço?',
    resposta: 'Cada farmácia adicional soma R$ 89,90 à mensalidade da primeira, e todas ficam numa conta só. Para redes com mais de três farmácias, a gente costuma negociar um preço sob medida. É só chamar no WhatsApp.',
  },
  {
    pergunta: 'Dá para cotar para várias lojas de uma vez?',
    resposta: 'Dá. Na cotação unificada você importa o pedido de cada loja, e a distribuidora recebe um link só, com as quantidades somadas. Ela responde uma vez e cada loja recebe a sua parte, com o próprio pedido de compra.',
  },
  {
    pergunta: 'Minha farmácia precisa instalar algum programa?',
    resposta: 'Não. O CotaPreço funciona no navegador, no computador e no celular. Você entra com e-mail e senha, sem instalação e sem servidor na loja.',
  },
  {
    pergunta: 'Como as distribuidoras respondem? Elas precisam ter conta?',
    resposta: 'Você manda um link e o representante responde pelo navegador, sem instalar nada. Na primeira vez ele cria um acesso rápido com nome, telefone e senha; nas cotações seguintes é só entrar. Não existe contrato nem mensalidade para a distribuidora.',
  },
  {
    pergunta: 'Eu já uso planilha. Dá para aproveitar?',
    resposta: 'Sim, é o caminho normal. Você importa a planilha que já usa, confere o mapeamento das colunas e corrige o que estiver errado antes de abrir a cotação, sem precisar reimportar o arquivo.',
  },
  {
    pergunta: 'Serve para farmácia pequena, com poucos itens?',
    resposta: 'Serve. O ganho aparece a partir do momento em que você pede preço para mais de uma distribuidora, e cresce conforme o histórico se acumula.',
  },
  {
    pergunta: 'O que acontece com meus dados se eu cancelar?',
    resposta: 'As cotações, os pedidos e o histórico de preços continuam seus. Você pode exportar em Excel a qualquer momento, inclusive durante o teste.',
  },
]

type TipoDepoimento = 'farmacia' | 'representante'

const DEPOIMENTOS: { tipo: TipoDepoimento; nome: string; papel: string; texto: string }[] = [
  {
    tipo: 'representante',
    nome: 'Fernanda Rodrigues',
    papel: 'Representante · Acripel Distribuidora',
    texto: 'Foi tranquilo. Fiz o cadastro que eu ainda não tinha e respondi rapidinho. Só usei o campo de observação para avisar quando o laboratório era diferente ou quando tinha preço melhor para quantidade maior.',
  },
]

const ROTULO_TIPO_DEPOIMENTO: Record<TipoDepoimento, string> = {
  farmacia: 'Farmácia',
  representante: 'Representante',
}

interface ItemDiferencial {
  icone:ReactNode; titulo:string; texto:string; reforco?:string
  /* Nome base da captura (-desktop/-mobile). imagemMobile, quando existe, é a única captura. */
  imagem:string; imagemMobile?:string; alt:string; largura:number; altura:number; estreita?:boolean
}

const DIFERENCIAIS:ItemDiferencial[] = [
  {
    icone: <Sparkles/>,
    titulo: 'Ele aponta a oportunidade e o risco de ruptura',
    texto: 'Conforme as respostas chegam, o sistema destaca sozinho onde uma oferta está muito abaixo das outras (em reais, no volume que você pediu) e quais produtos só uma distribuidora ofertou, ou nenhuma.',
    reforco: 'Quando a diferença é grande demais para ser verdade, ele manda conferir embalagem e EAN antes de você contar com aquele preço.',
    imagem: '02-achados',
    alt: 'Faixa do CotaPreço destacando oportunidades de preço e produtos com risco de ruptura',
    largura: 1480,
    altura: 660,
  },
  {
    icone: <Boxes/>,
    titulo: 'Comparativo que cabe no celular',
    texto: 'No computador, uma coluna por distribuidora com o melhor preço destacado. No celular não é a tabela espremida: cada produto vira um cartão, com o ranking completo a um toque.',
    imagem: '03-comparativo-precos',
    alt: 'Comparativo de preços do CotaPreço em cartões por produto no celular',
    largura: 500,
    altura: 657,
    estreita: true,
  },
  {
    icone: <CheckCircle2/>,
    titulo: 'O pedido de cada distribuidora sai montado',
    texto: 'O sistema divide a compra pela melhor oferta de cada item, soma o total de cada distribuidora e avisa qual pedido ficou abaixo do mínimo. Toda alteração pode ser desfeita.',
    imagem: '04-compra-sugerida',
    alt: 'Plano de compra do CotaPreço dividido por distribuidora, com total e alerta de pedido mínimo',
    largura: 1480,
    altura: 464,
  },
  {
    icone: <PackageCheck/>,
    titulo: 'A compra só fecha quando você confere o que chegou',
    texto: 'Na entrega, você lança quantidade e preço da nota item a item. O sistema marca as divergências e deixa você mandar o saldo que faltou para a próxima cotação.',
    imagem: '06-conferencia',
    alt: 'Tela de conferência do CotaPreço comparando o que foi pedido com o que chegou',
    largura: 1120,
    altura: 680,
  },
  {
    icone: <LineChart/>,
    titulo: 'Memória de preço que só a sua farmácia tem',
    texto: 'Cada compra finalizada vira histórico. Você compara meses diferentes, vê o que subiu no volume que realmente comprou e leva para o Excel na hora de negociar.',
    reforco: 'Quanto mais tempo você usa, mais o sistema sabe sobre os seus preços.',
    imagem: '05-historico-entre-cotacoes',
    alt: 'Comparativo entre cotações do CotaPreço mostrando evolução de preço por produto',
    largura: 1480,
    altura: 607,
  },
]

/* Só o que a rede já faz no sistema hoje: cotação unificada, divisão de estoque, pedido por
   loja e acesso por loja. Nada de promessa de funcionalidade futura na página de venda. */
const VANTAGENS_REDE = [
  {
    icone: <Layers/>,
    titulo: 'Um link para todas as lojas',
    texto: 'Importe o pedido de cada loja e mande uma cotação só. A distribuidora vê as quantidades somadas e responde uma vez, em vez de preencher uma proposta por loja.',
  },
  {
    icone: <Scale/>,
    titulo: 'Volume de rede na negociação',
    texto: 'A distribuidora enxerga o pedido da rede inteira e as lojas que estão cotando juntas. Quantidade maior no mesmo link é argumento para preço melhor.',
  },
  {
    icone: <Boxes/>,
    titulo: 'Estoque curto dividido com critério',
    texto: 'Se a distribuidora não tem o total, o estoque é dividido na proporção do pedido de cada loja. Precisa priorizar uma delas? Você ajusta a divisão.',
  },
  {
    icone: <CheckCircle2/>,
    titulo: 'Cada loja com o seu pedido',
    texto: 'A compra sai separada por loja, com o CNPJ dela, o pedido mínimo de cada uma e um atalho para passar de uma loja para a outra.',
  },
  {
    icone: <Users/>,
    titulo: 'Uma conta, acesso por loja',
    texto: 'Comprador, gerente e dono entram na mesma conta, cada um com permissão só nas lojas que acompanha, e o painel mostra os números de todas juntas.',
  },
]

/* Capturas da seção de redes, no mesmo formato texto + imagem dos diferenciais. O convite só
   existe na versão celular (é assim que o representante abre o link), então ela serve às duas. */
const DESTAQUES_REDE:ItemDiferencial[] = [
  {
    icone: <Link2/>,
    titulo: 'O representante recebe um link só',
    texto: 'O convite mostra as lojas que estão cotando juntas e as quantidades já somadas. Ele preenche uma proposta, e cada farmácia recebe a sua parte com o mesmo preço.',
    reforco: 'Nada de mandar cinco links para a mesma distribuidora.',
    imagem: '07-rede-convite-mobile',
    imagemMobile: '07-rede-convite-mobile',
    alt: 'Convite de cotação do CotaPreço para o representante, listando as três farmácias da rede que cotam juntas',
    largura: 500,
    altura: 334,
    estreita: true,
  },
  {
    icone: <Boxes/>,
    titulo: 'Estoque curto dividido entre as lojas',
    texto: 'Quando a distribuidora não tem o total, o sistema divide na proporção do pedido de cada farmácia e mostra tudo numa planilha. Precisa priorizar uma loja? Depois de fechar a cotação, você ajusta a divisão.',
    reforco: 'Um atalho no topo leva de uma farmácia para outra, cada uma com o seu pedido.',
    imagem: '08-rede-estoque',
    alt: 'Cotação unificada no CotaPreço com atalho entre as farmácias e o estoque de cada produto dividido por loja',
    largura: 1480,
    altura: 633,
  },
]

const [PRECO_REAIS, PRECO_CENTAVOS] = PLANO_PADRAO.value.toFixed(2).split('.')

export default function PaginaLanding() {
  const [quantidade, setQuantidade] = useState(1)
  const precoEstimado = PLANO_PADRAO.value + PRECO_ADICIONAL_FARMACIA_PADRAO * Math.max(0, quantidade - 1)

  useEffect(() => {
    document.title = `CotaPreço · Cotação de medicamentos para farmácias | Teste ${TOTAL_DIAS_TESTE} dias grátis`
  }, [])

  return <div className="lp">
    <a className="sr-only lp-pular" href="#conteudo">Pular para o conteúdo</a>

    <header className="lp-topo">
      <div className="lp-container lp-topo-interno">
        <div className="lp-marca">
          <img className="cotapreco-logo" src="/cotapreco-logo.png?v=20260905-1" width="450" height="106" alt="CotaPreço"/>
        </div>
        <nav className="lp-topo-acoes" aria-label="Acesso ao sistema">
          <a className="lp-link-precos" href="#precos">Preços</a>
          <LinkInterno to="/login" className="lp-link-entrar">Entrar</LinkInterno>
          <LinkInterno to="/cadastro" className="lp-botao lp-botao-primario lp-botao-compacto">Testar grátis</LinkInterno>
        </nav>
      </div>
    </header>

    <main id="conteudo">
      <section className="lp-hero">
        <div className="lp-container">
          <p className="lp-selo"><BadgeCheck/> {TOTAL_DIAS_TESTE} dias grátis · sem cartão de crédito</p>
          <h1>Pare de comparar preço de distribuidora na planilha</h1>
          <p className="lp-subtitulo">
            O CotaPreço recebe as propostas das suas distribuidoras, compara item a item e monta o
            pedido de cada uma pelo melhor preço. Feito para quem compra medicamento e não tem o dia
            inteiro para conferir cotação.
          </p>
          <div className="lp-hero-acoes">
            <LinkInterno to="/cadastro" className="lp-botao lp-botao-primario">Começar teste grátis <ArrowRight/></LinkInterno>
            <LinkInterno to="/login" className="lp-botao lp-botao-secundario">Já tenho conta</LinkInterno>
          </div>
          <ul className="lp-hero-provas">
            <li><Tag/> A partir de R$ {PRECO_REAIS},{PRECO_CENTAVOS}/mês por farmácia</li>
            <li><ShieldCheck/> Sem cartão para testar</li>
            <li><Clock3/> Pronto para usar em minutos</li>
            <li><Link2/> Distribuidora responde por link</li>
          </ul>
          <figure className="lp-hero-imagem">
            <picture>
              <source media="(max-width: 700px)" srcSet="/landing/03-comparativo-precos-mobile.webp"/>
              <img src="/landing/03-comparativo-precos-desktop.webp" width={1480} height={627} fetchPriority="high" decoding="async"
                alt="Comparativo de preços do CotaPreço com uma coluna por distribuidora e o melhor preço de cada produto destacado"/>
            </picture>
          </figure>
        </div>
      </section>

      <section className="lp-secao lp-passos" aria-labelledby="como-funciona">
        <div className="lp-container">
          <h2 id="como-funciona">Como funciona</h2>
          <ol className="lp-passos-lista">
            <li>
              <span className="lp-passo-numero">1</span>
              <h3><FileSpreadsheet/> Importe a sua lista</h3>
              <p>Suba a planilha que você já usa. O sistema identifica as colunas e deixa você corrigir produto, EAN e quantidade antes de abrir, sem reimportar o arquivo.</p>
            </li>
            <li>
              <span className="lp-passo-numero">2</span>
              <h3><Link2/> Mande o link para as distribuidoras</h3>
              <p>Cada representante abre o link no celular e preenche preço e disponibilidade. Nada para instalar e nenhuma planilha de volta por e-mail. Ele só cria um acesso rápido na primeira vez.</p>
            </li>
            <li>
              <span className="lp-passo-numero">3</span>
              <h3><Search/> Receba a compra montada</h3>
              <p>Comparativo item a item, alerta do que fugiu do padrão e o pedido de cada distribuidora pronto para enviar.</p>
            </li>
          </ol>
        </div>
      </section>

      <section className="lp-secao lp-tempo" aria-labelledby="tempo">
        <div className="lp-container lp-tempo-interno">
          <h2 id="tempo">O tempo que sai da sua semana</h2>
          <div className="lp-antes-depois">
            <article className="lp-antes">
              <span className="lp-etiqueta">Hoje</span>
              <p>Cinco tabelas em formatos diferentes, uma planilha para juntar tudo, e alguém somando pedido à mão para ver se bate o mínimo. Um preço novo chega e a conta recomeça.</p>
            </article>
            <span className="lp-seta" aria-hidden="true"><ArrowRight/></span>
            <article className="lp-depois">
              <span className="lp-etiqueta">Com o CotaPreço</span>
              <p>As respostas chegam prontas para comparar, o pedido de cada distribuidora sai montado e a conferência da entrega fecha o ciclo. Preço novo entra sozinho na conta.</p>
            </article>
          </div>
          <p className="lp-tempo-fecho">Some quanto tempo isso ocupa na sua semana. É esse o tempo que volta, junto com o erro de digitação que custa caro no fechamento.</p>
        </div>
      </section>

      <section className="lp-secao" aria-labelledby="diferenciais">
        <div className="lp-container">
          <h2 id="diferenciais">Por que não é só uma planilha mais bonita</h2>
          <div className="lp-diferenciais">
            {DIFERENCIAIS.map(item => <Diferencial item={item} key={item.titulo}/>)}
          </div>
        </div>
      </section>

      <section className="lp-secao lp-rede" aria-labelledby="redes" id="redes">
        <div className="lp-container">
          <span className="lp-rede-eyebrow"><Building2/> Para redes de farmácias</span>
          <h2 id="redes">Várias lojas, uma cotação</h2>
          <p className="lp-rede-sub">Quem compra para mais de uma loja não precisa repetir o processo em cada uma. A rede cota junto, e cada loja continua com o seu pedido.</p>
          <ul className="lp-rede-lista">
            {VANTAGENS_REDE.map(item => <li key={item.titulo}>
              <span className="lp-rede-icone" aria-hidden="true">{item.icone}</span>
              <h3>{item.titulo}</h3>
              <p>{item.texto}</p>
            </li>)}
          </ul>
          <div className="lp-diferenciais lp-rede-destaques">
            {DESTAQUES_REDE.map(item => <Diferencial item={item} key={item.titulo}/>)}
          </div>
          <p className="lp-rede-cta">
            <a href="#precos">Veja o preço por loja</a> ou <a href={linkWhatsappRedes()} target="_blank" rel="noopener noreferrer">fale com a gente pelo WhatsApp</a> sobre condições para redes.
          </p>
        </div>
      </section>

      <section className="lp-secao lp-depoimentos" aria-labelledby="depoimentos">
        <div className="lp-container">
          <h2 id="depoimentos">Quem já cotou pelo CotaPreço</h2>
          <div className="lp-depoimentos-lista">
            {DEPOIMENTOS.map(item => <article className="lp-depoimento" key={item.nome}>
              <Quote className="lp-depoimento-icone" aria-hidden="true"/>
              <p className="lp-depoimento-texto">{item.texto}</p>
              <footer>
                <span className="lp-depoimento-tipo">{ROTULO_TIPO_DEPOIMENTO[item.tipo]}</span>
                <strong>{item.nome}</strong>
                <span className="lp-depoimento-papel">{item.papel}</span>
              </footer>
            </article>)}
          </div>
        </div>
      </section>

      <section className="lp-secao lp-precos" aria-labelledby="precos" id="precos">
        <div className="lp-container lp-precos-interno">
          <span className="lp-precos-eyebrow">Assinatura</span>
          <h2 id="precos">Um preço, sem pegadinha</h2>
          <p className="lp-precos-sub">Mensalidade por farmácia: a equipe inteira usa sem custo extra por acesso.</p>

          <div className="lp-preco-card">
            <div className="lp-preco-numero">
              <span className="lp-preco-cifrao">R$</span>
              <strong>{PRECO_REAIS}</strong>
              <span className="lp-preco-centavos">,{PRECO_CENTAVOS}</span>
              <span className="lp-preco-periodo">/mês</span>
            </div>
            <p className="lp-preco-legenda">por farmácia · cancele quando quiser, sem multa</p>
            <ul className="lp-preco-lista">
              {INCLUSO.map(item => <li key={item}><BadgeCheck/>{item}</li>)}
            </ul>
            <LinkInterno to="/cadastro" className="lp-botao lp-botao-primario lp-botao-full">
              Começar teste grátis de {TOTAL_DIAS_TESTE} dias <ArrowRight/>
            </LinkInterno>
            <p className="lp-preco-nota"><ShieldCheck/> Sem cartão para testar. Sem cobrança automática quando o teste termina.</p>
          </div>

          <div className="lp-preco-estimador">
            <label><Users/> Quantas farmácias você tem?
              <input type="number" inputMode="numeric" min={1} max={99} value={quantidade}
                onChange={e => setQuantidade(Math.max(1, Number(e.target.value) || 1))}/>
            </label>
            {quantidade === 1
              ? <p>Uma farmácia: <strong>{money(PLANO_PADRAO.value)}</strong>/mês.</p>
              : <p>Com {quantidade} farmácias, numa conta só: <strong>{money(precoEstimado)}</strong>/mês
                {' '}({money(PLANO_PADRAO.value)} da primeira + {money(PRECO_ADICIONAL_FARMACIA_PADRAO)} × {quantidade - 1} adicional{quantidade - 1 !== 1 ? 'is' : ''}).</p>}
            {quantidade > 3 && <p className="lp-preco-estimador-contato">
              <MessageCircle/> Redes maiores costumam negociar condições especiais.{' '}
              <a href={linkWhatsappNegociarFarmacias(quantidade)} target="_blank" rel="noopener noreferrer">Fale com a gente pelo WhatsApp</a>.
            </p>}
          </div>
          <p className="lp-oferta-nota">Já usa o CotaPreço? <LinkInterno to="/login">Entrar na minha farmácia</LinkInterno></p>
        </div>
      </section>

      <section className="lp-secao" aria-labelledby="perguntas">
        <div className="lp-container lp-faq">
          <h2 id="perguntas">Perguntas frequentes</h2>
          {PERGUNTAS.map(item => <details key={item.pergunta}>
            <summary>{item.pergunta}</summary>
            <p>{item.resposta}</p>
          </details>)}
        </div>
      </section>
    </main>

    <RodapeSite/>

    <div className="lp-cta-fixa" role="region" aria-label="Começar teste grátis">
      <div>
        <strong>{TOTAL_DIAS_TESTE} dias grátis</strong>
        <span>Sem cartão de crédito</span>
      </div>
      <LinkInterno to="/cadastro" className="lp-botao lp-botao-primario lp-botao-compacto">Testar grátis</LinkInterno>
    </div>
  </div>
}


/* Bloco texto + captura, alternando o lado a cada item. Usado nos diferenciais e na seção de redes. */
function Diferencial({ item }:{ item:ItemDiferencial }) {
  return <article className={`lp-diferencial ${item.estreita ? 'lp-diferencial-estreito' : ''}`}>
    <div className="lp-diferencial-texto">
      <span className="lp-diferencial-icone" aria-hidden="true">{item.icone}</span>
      <h3>{item.titulo}</h3>
      <p>{item.texto}</p>
      {item.reforco && <p className="lp-diferencial-reforco">{item.reforco}</p>}
    </div>
    {item.imagem && <figure className="lp-diferencial-imagem">
      <picture>
        <source media="(max-width: 700px)" srcSet={`/landing/${item.imagemMobile ?? `${item.imagem}-mobile`}.webp`}/>
        <img src={`/landing/${item.imagem}${item.imagemMobile === undefined ? '-desktop' : ''}.webp`} width={item.largura} height={item.altura}
          loading="lazy" decoding="async" alt={item.alt}/>
      </picture>
    </figure>}
  </article>
}
