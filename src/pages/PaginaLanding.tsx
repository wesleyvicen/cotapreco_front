import { ArrowRight, BadgeCheck, Boxes, CheckCircle2, Clock3, FileSpreadsheet, LineChart, Link2, PackageCheck, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { useEffect } from 'react'
import RodapeSite from '../components/RodapeEmpresa'
import { LinkInterno } from '../roteamento'

const PERGUNTAS = [
  {
    pergunta: 'Preciso cadastrar cartão de crédito para testar?',
    resposta: 'Não. São 7 dias com o sistema inteiro liberado, sem cartão e sem cobrança automática no fim do teste.',
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
    resposta: 'Serve. O ganho aparece a partir do momento em que você pede preço para mais de uma distribuidora — e cresce conforme o histórico se acumula.',
  },
  {
    pergunta: 'O que acontece com meus dados se eu cancelar?',
    resposta: 'As cotações, os pedidos e o histórico de preços continuam seus. Você pode exportar em Excel a qualquer momento, inclusive durante o teste.',
  },
]

const DIFERENCIAIS = [
  {
    icone: <Sparkles/>,
    titulo: 'Ele aponta a oportunidade e o risco de ruptura',
    texto: 'Conforme as respostas chegam, o sistema destaca sozinho onde uma oferta está muito abaixo das outras — em reais, no volume que você pediu — e quais produtos só uma distribuidora ofertou, ou nenhuma.',
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
    altura: 492,
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

export default function PaginaLanding() {
  useEffect(() => {
    document.title = 'CotaPreço — Cotação de medicamentos para farmácias | Teste 7 dias grátis'
  }, [])

  return <div className="lp">
    <a className="sr-only lp-pular" href="#conteudo">Pular para o conteúdo</a>

    <header className="lp-topo">
      <div className="lp-container lp-topo-interno">
        <div className="lp-marca">
          <img src="/cotapreco-icon.png" alt="" width={34} height={34}/>
          <span>CotaPreço</span>
        </div>
        <nav className="lp-topo-acoes" aria-label="Acesso ao sistema">
          <LinkInterno to="/login" className="lp-link-entrar">Entrar</LinkInterno>
          <LinkInterno to="/cadastro" className="lp-botao lp-botao-primario lp-botao-compacto">Testar grátis</LinkInterno>
        </nav>
      </div>
    </header>

    <main id="conteudo">
      <section className="lp-hero">
        <div className="lp-container">
          <p className="lp-selo"><BadgeCheck/> 7 dias grátis · sem cartão de crédito</p>
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
              <p>Suba a planilha que você já usa. O sistema identifica as colunas e deixa você corrigir produto, EAN e quantidade antes de abrir — sem reimportar o arquivo.</p>
            </li>
            <li>
              <span className="lp-passo-numero">2</span>
              <h3><Link2/> Mande o link para as distribuidoras</h3>
              <p>Cada representante abre o link no celular e preenche preço e disponibilidade. Nada para instalar e nenhuma planilha de volta por e-mail — ele só cria um acesso rápido na primeira vez.</p>
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
          <p className="lp-tempo-fecho">Some quanto tempo isso ocupa na sua semana. É esse o tempo que volta — junto com o erro de digitação que custa caro no fechamento.</p>
        </div>
      </section>

      <section className="lp-secao" aria-labelledby="diferenciais">
        <div className="lp-container">
          <h2 id="diferenciais">Por que não é só uma planilha mais bonita</h2>
          <div className="lp-diferenciais">
            {DIFERENCIAIS.map(item => <article className={`lp-diferencial ${item.estreita ? 'lp-diferencial-estreito' : ''}`} key={item.titulo}>
              <div className="lp-diferencial-texto">
                <span className="lp-diferencial-icone" aria-hidden="true">{item.icone}</span>
                <h3>{item.titulo}</h3>
                <p>{item.texto}</p>
                {item.reforco && <p className="lp-diferencial-reforco">{item.reforco}</p>}
              </div>
              {item.imagem && <figure className="lp-diferencial-imagem">
                <picture>
                  <source media="(max-width: 700px)" srcSet={`/landing/${item.imagem}-mobile.webp`}/>
                  <img src={`/landing/${item.imagem}-desktop.webp`} width={item.largura} height={item.altura}
                    loading="lazy" decoding="async" alt={item.alt}/>
                </picture>
              </figure>}
            </article>)}
          </div>
        </div>
      </section>

      <section className="lp-secao lp-oferta" aria-labelledby="oferta">
        <div className="lp-container lp-oferta-interno">
          <h2 id="oferta">Teste 7 dias, sem cartão</h2>
          <p>
            Todo o sistema liberado durante o teste: cotações, comparativo, plano de compra, histórico
            e exportação. Não pedimos cartão de crédito para começar e não há cobrança automática
            quando o período termina.
          </p>
          <LinkInterno to="/cadastro" className="lp-botao lp-botao-claro">Criar conta grátis <ArrowRight/></LinkInterno>
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
  </div>
}
