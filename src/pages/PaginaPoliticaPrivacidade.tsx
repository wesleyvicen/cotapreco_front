import LayoutLegal, { DestaqueLegal, type SecaoLegal } from '../components/LayoutLegal'
import { LinkInterno } from '../roteamento'

const INDICE: SecaoLegal[] = [
  { id: 'quem-somos', titulo: 'Quem trata os seus dados' },
  { id: 'a-quem-se-aplica', titulo: 'A quem esta política se aplica' },
  { id: 'dados-farmacia', titulo: 'Dados de quem contrata (farmácia)' },
  { id: 'dados-representante', titulo: 'Dados do representante da distribuidora' },
  { id: 'dados-operacao', titulo: 'Dados de cotação, preço e compra' },
  { id: 'dados-automaticos', titulo: 'Dados coletados automaticamente' },
  { id: 'finalidades', titulo: 'Para que usamos cada dado' },
  { id: 'bases-legais', titulo: 'Bases legais da LGPD' },
  { id: 'compartilhamento', titulo: 'Com quem compartilhamos' },
  { id: 'quem-ve-o-que', titulo: 'Quem enxerga o que dentro do sistema' },
  { id: 'retencao', titulo: 'Por quanto tempo guardamos' },
  { id: 'seguranca', titulo: 'Como protegemos' },
  { id: 'direitos', titulo: 'Seus direitos e como exercê-los' },
  { id: 'menores', titulo: 'Crianças e adolescentes' },
  { id: 'internacional', titulo: 'Transferência internacional' },
  { id: 'alteracoes', titulo: 'Mudanças nesta política' },
  { id: 'contato', titulo: 'Contato e encarregado' },
]

export default function PaginaPoliticaPrivacidade() {
  return <LayoutLegal
    titulo="Política de Privacidade"
    resumo="O que o CotaPreço coleta, por que coleta, com quem divide e o que você pode exigir da gente. Escrito para ser lido por quem trabalha na farmácia, não só por advogado."
    indice={INDICE}>

    <DestaqueLegal titulo="O essencial em cinco linhas">
      <ul>
        <li>Não vendemos, alugamos nem cedemos dados para publicidade. Nunca.</li>
        <li>Os preços que uma distribuidora informa ficam visíveis para a farmácia que abriu a cotação — e não para as distribuidoras concorrentes.</li>
        <li>Cada farmácia enxerga apenas os próprios dados; o isolamento é feito no banco, por empresa.</li>
        <li>Não usamos cookies de publicidade nem ferramentas de rastreamento de terceiros.</li>
        <li>Você pode exportar tudo em Excel a qualquer momento e pedir exclusão pelos canais do fim desta página.</li>
      </ul>
    </DestaqueLegal>

    <section id="quem-somos">
      <h2>1. Quem trata os seus dados</h2>
      <p>
        O CotaPreço é um sistema desenvolvido e operado pela <strong>AppStarter Pro</strong>, empresa
        registrada sob o CNPJ 61.296.087/0001-80, responsável pelo tratamento dos dados descritos aqui
        na condição de controladora, nos termos da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados).
      </p>
      <p>
        O serviço é acessado em <strong>cotapreco.com</strong> e a sua interface conversa com a nossa
        API em <strong>api.cotapreco.com</strong>. Quando esta política fala em “nós”, “nosso” ou
        “CotaPreço”, está falando da AppStarter Pro.
      </p>
      <p>
        Há uma inversão de papéis que vale explicar desde já: em relação aos dados da conta e do
        cadastro, somos <em>controladores</em>. Em relação ao conteúdo que a farmácia coloca dentro do
        sistema — a lista de produtos que ela quer comprar, o histórico de compra dela — agimos como
        <em> operadores</em>, tratando esse conteúdo por conta e ordem da farmácia, que decide o que
        entra, o que sai e quem da equipe dela tem acesso.
      </p>
    </section>

    <section id="a-quem-se-aplica">
      <h2>2. A quem esta política se aplica</h2>
      <p>Três grupos de pessoas passam pelo CotaPreço, e o tratamento é diferente para cada um:</p>
      <ul>
        <li>
          <strong>A farmácia que contrata</strong> — quem cria a conta, importa listas, abre cotações e
          fecha compras. Tem login, senha e assinatura.
        </li>
        <li>
          <strong>O representante da distribuidora</strong> — quem recebe o link de uma cotação e
          preenche preço e disponibilidade. Cria um acesso próprio na primeira vez que responde, e não
          paga nada para usar o sistema.
        </li>
        <li>
          <strong>Quem apenas visita o site</strong> — a página inicial, a página de cadastro e estes
          documentos, sem entrar em conta nenhuma.
        </li>
      </ul>
    </section>

    <section id="dados-farmacia">
      <h2>3. Dados de quem contrata (farmácia)</h2>
      <p>São os dados que a própria farmácia digita, na criação da conta e depois:</p>
      <div className="legal-tabela-wrap"><table className="legal-tabela">
        <caption className="sr-only">Dados coletados da farmácia e de seus usuários</caption>
        <thead><tr><th>Dado</th><th>Quando é coletado</th><th>Obrigatório?</th></tr></thead>
        <tbody>
          <tr><td>Nome da pessoa que usa o sistema</td><td>Criação da conta e cadastro de novos usuários</td><td>Sim</td></tr>
          <tr><td>E-mail</td><td>Criação da conta; é também o login</td><td>Sim</td></tr>
          <tr><td>Senha</td><td>Criação da conta</td><td>Sim — guardada apenas como hash, ver a seção 12</td></tr>
          <tr><td>Nome da farmácia e CNPJ</td><td>Criação da conta</td><td>Sim</td></tr>
          <tr><td>Telefone da farmácia</td><td>Ao assinar</td><td>Só para assinar: a operadora de pagamento exige</td></tr>
          <tr><td>Endereço completo (CEP, logradouro, número, complemento, bairro, cidade, UF)</td><td>Ao assinar</td><td>Só para assinar: a operadora de pagamento exige</td></tr>
          <tr><td>Perfil de acesso (administrador, comprador ou consulta)</td><td>Definido pelo administrador da farmácia</td><td>Sim</td></tr>
        </tbody>
      </table></div>
      <p>
        A conta funciona inteira, inclusive durante os 7 dias de teste, <strong>sem endereço e sem
        telefone</strong>. Esses dois só passam a ser exigidos no momento em que a farmácia decide
        assinar, porque a operadora de pagamento recusa a cobrança sem eles.
      </p>
      <p>
        <strong>Não pedimos e não recebemos dados de cartão de crédito.</strong> O número do cartão, o
        CVV e a validade são digitados diretamente no ambiente da operadora de pagamento, não passam
        pelos nossos servidores e não são gravados por nós. Do cartão, guardamos apenas os quatro
        últimos dígitos que a operadora nos devolve, para você reconhecer na tela de assinatura qual
        cartão está pagando.
      </p>
    </section>

    <section id="dados-representante">
      <h2>4. Dados do representante da distribuidora</h2>
      <p>
        Quem responde uma cotação cria um acesso próprio na primeira vez, e reaproveita esse acesso em
        todas as cotações seguintes, de qualquer farmácia. Coletamos:
      </p>
      <ul>
        <li><strong>Nome</strong> — para a farmácia saber com quem está falando;</li>
        <li><strong>Telefone</strong> — serve também como login alternativo;</li>
        <li><strong>E-mail</strong> — login e canal de recuperação de senha;</li>
        <li><strong>Senha</strong> — guardada apenas como hash;</li>
        <li><strong>Data do último acesso</strong> — para diagnóstico de suporte e segurança.</li>
      </ul>
      <p>
        Junto de cada proposta enviada, ficam gravados o nome da distribuidora, o CNPJ dela quando
        informado e o valor mínimo de pedido que ela pratica. Esses são dados da empresa, não da pessoa.
      </p>
      <DestaqueLegal titulo="O que a distribuidora precisa saber">
        <p>
          Os preços que você informa numa cotação são vistos <strong>apenas pela farmácia que abriu
          aquela cotação</strong>. Nenhuma outra distribuidora vê a sua proposta, nem sabe que você
          respondeu. A farmácia vê o comparativo entre as propostas recebidas por ela — é o propósito
          do sistema — e pode exportá-lo em Excel ou PDF para uso dela.
        </p>
      </DestaqueLegal>
      <p>
        O acesso do representante é gratuito, não tem contrato nem mensalidade e pode ser encerrado a
        qualquer momento pelos canais da seção 17. Encerrar o acesso não apaga as propostas já enviadas
        e usadas em compras fechadas, pelo motivo explicado na seção 11.
      </p>
    </section>

    <section id="dados-operacao">
      <h2>5. Dados de cotação, preço e compra</h2>
      <p>
        É o conteúdo de trabalho, e a maior parte dele não é dado pessoal — é dado comercial de empresa.
        Ainda assim, listamos com precisão o que fica gravado:
      </p>
      <ul>
        <li>
          <strong>A lista de produtos</strong> que a farmácia quer cotar: nome do produto, EAN,
          laboratório e quantidade. Vem de uma planilha que a farmácia importa (até 10 MB por arquivo)
          ou de colunas coladas na tela. Depois da importação, guardamos os itens interpretados — não
          mantemos o arquivo original.
        </li>
        <li>
          <strong>As propostas recebidas</strong>: preço unitário, disponibilidade e observações por
          item, com a data e a hora do envio.
        </li>
        <li>
          <strong>O plano de compra</strong>: qual distribuidora ficou com qual item, trocas feitas à
          mão pelo comprador, versões anteriores do plano (para permitir desfazer) e o motivo de cada
          ajuste, quando informado.
        </li>
        <li>
          <strong>Os pedidos gerados</strong> em PDF ou imagem e a conferência da entrega: quantidade
          e preço que chegaram na nota, divergências e saldo pendente.
        </li>
        <li>
          <strong>O histórico de preços</strong> entre cotações, que é o que permite comparar meses
          diferentes e negociar com número na mão.
        </li>
      </ul>
      <p>
        Esse conteúdo pertence à farmácia. Não o usamos para outro fim que não seja fazer o sistema
        funcionar para ela, não o divulgamos e não o cruzamos com o de outras farmácias para montar
        índices, rankings ou qualquer produto derivado.
      </p>
    </section>

    <section id="dados-automaticos">
      <h2>6. Dados coletados automaticamente</h2>
      <p>Sem que ninguém digite, o sistema registra:</p>
      <ul>
        <li>
          <strong>Registros de auditoria de negócio</strong>: quem fez o quê e quando — abriu uma
          cotação, comparou propostas, gerou um pedido. Guardam nome e e-mail do usuário, ou nome e
          telefone do representante, além da ação e do recurso envolvido. Não gravam senha, token,
          conteúdo de requisição nem dado de pagamento.
        </li>
        <li>
          <strong>Registros técnicos do servidor</strong>: endereço IP, data e hora, e o erro ocorrido,
          quando ocorre. Existem para investigar falha e abuso.
        </li>
        <li>
          <strong>Datas de ciclo de vida</strong>: criação da conta, confirmação do e-mail, último
          acesso, início e fim do período de teste.
        </li>
      </ul>
      <p>
        <strong>Não usamos Google Analytics, pixel de rede social, mapa de calor, gravador de sessão
        nem qualquer ferramenta de rastreamento publicitário.</strong> Não construímos perfil de
        comportamento e não fazemos decisão automatizada que afete alguém juridicamente.
      </p>
      <p>
        O detalhe de cookies e de armazenamento no navegador está na <LinkInterno to="/cookies">Política
        de Cookies</LinkInterno>.
      </p>
    </section>

    <section id="finalidades">
      <h2>7. Para que usamos cada dado</h2>
      <div className="legal-tabela-wrap"><table className="legal-tabela">
        <caption className="sr-only">Finalidade de cada grupo de dados</caption>
        <thead><tr><th>Finalidade</th><th>Dados usados</th></tr></thead>
        <tbody>
          <tr><td>Criar e manter a conta, autenticar quem entra</td><td>Nome, e-mail, senha, perfil de acesso</td></tr>
          <tr><td>Fazer o sistema funcionar: cotação, comparativo, plano de compra, conferência</td><td>Lista de produtos, propostas, pedidos, histórico</td></tr>
          <tr><td>Cobrar a assinatura e emitir a cobrança</td><td>Nome da farmácia, CNPJ, e-mail, telefone, endereço</td></tr>
          <tr><td>Avisos operacionais por e-mail (confirmação de e-mail, redefinição de senha, fim do teste, pagamento confirmado)</td><td>Nome e e-mail</td></tr>
          <tr><td>Suporte e diagnóstico de problema relatado</td><td>Auditoria, registros técnicos, dados da conta</td></tr>
          <tr><td>Segurança: impedir acesso indevido e investigar abuso</td><td>IP, data e hora, auditoria, sessões ativas</td></tr>
          <tr><td>Cumprir obrigação legal e defender direito em processo</td><td>O que a lei ou a autoridade exigir</td></tr>
        </tbody>
      </table></div>
      <p>
        Os e-mails que enviamos são <strong>operacionais</strong>: confirmação de endereço, redefinição
        de senha, aviso de fim do teste, link de pagamento e confirmação de pagamento. Não disparamos
        newsletter nem oferta de terceiro. Se um dia mandarmos comunicação de marketing, ela virá com
        descadastro em um clique.
      </p>
    </section>

    <section id="bases-legais">
      <h2>8. Bases legais da LGPD</h2>
      <ul>
        <li>
          <strong>Execução de contrato</strong> (art. 7º, V) — dados de conta, de cobrança e todo o
          conteúdo operacional. Sem eles, não há serviço a prestar.
        </li>
        <li>
          <strong>Cumprimento de obrigação legal ou regulatória</strong> (art. 7º, II) — guarda de
          registros fiscais e dos registros de acesso a aplicação exigidos pelo Marco Civil da Internet.
        </li>
        <li>
          <strong>Legítimo interesse</strong> (art. 7º, IX) — segurança da plataforma, prevenção a
          fraude, auditoria de quem fez o quê e melhoria do produto a partir de uso agregado. Sempre
          avaliado contra a sua expectativa razoável, e nunca para publicidade.
        </li>
        <li>
          <strong>Exercício regular de direito</strong> (art. 7º, VI) — defesa em processo
          administrativo, judicial ou arbitral.
        </li>
        <li>
          <strong>Consentimento</strong> (art. 7º, I) — reservado para o que fugir do acima, pedido de
          forma destacada e revogável a qualquer tempo. Hoje não dependemos dele para operar.
        </li>
      </ul>
    </section>

    <section id="compartilhamento">
      <h2>9. Com quem compartilhamos</h2>
      <p>
        <strong>Não vendemos, não alugamos e não cedemos dados pessoais para publicidade.</strong> O
        compartilhamento se limita a quem é necessário para o serviço existir:
      </p>
      <div className="legal-tabela-wrap"><table className="legal-tabela">
        <caption className="sr-only">Terceiros que recebem dados e o que recebem</caption>
        <thead><tr><th>Quem</th><th>Para quê</th><th>O que recebe</th></tr></thead>
        <tbody>
          <tr>
            <td>Asaas (operadora de pagamento)</td>
            <td>Processar a assinatura e a cobrança recorrente</td>
            <td>Nome da farmácia, CNPJ, e-mail, telefone e endereço. O cartão é digitado no ambiente da própria operadora.</td>
          </tr>
          <tr>
            <td>Provedor de e-mail (SMTP)</td>
            <td>Entregar os e-mails operacionais</td>
            <td>Nome e endereço de e-mail do destinatário, e o conteúdo da mensagem</td>
          </tr>
          <tr>
            <td>Cloudflare</td>
            <td>Publicar e proteger a interface web</td>
            <td>Dados de conexão: IP, data e hora, tipo de navegador</td>
          </tr>
          <tr>
            <td>Provedor de servidor e de banco de dados</td>
            <td>Hospedar a aplicação e o banco</td>
            <td>Toda a base, em repouso na infraestrutura contratada por nós</td>
          </tr>
          <tr>
            <td>Google Fonts</td>
            <td>Carregar as fontes usadas no visual das páginas</td>
            <td>Dados de conexão do navegador ao buscar o arquivo da fonte</td>
          </tr>
          <tr>
            <td>Autoridade pública</td>
            <td>Cumprir ordem legal</td>
            <td>Estritamente o que a ordem determinar</td>
          </tr>
        </tbody>
      </table></div>
      <p>
        Fora dessa lista, só compartilhamos com autorização expressa sua ou em caso de reorganização
        societária — e, nesse caso, quem receber a base fica obrigado a esta mesma política, com aviso
        prévio a você.
      </p>
    </section>

    <section id="quem-ve-o-que">
      <h2>10. Quem enxerga o que dentro do sistema</h2>
      <p>Esta é a pergunta que mais recebemos, então ela tem seção própria:</p>
      <ul>
        <li>
          <strong>Uma farmácia nunca vê os dados de outra.</strong> Toda consulta é filtrada pela
          empresa do usuário autenticado; não existe tela, exportação ou relatório que cruze farmácias.
        </li>
        <li>
          <strong>Uma distribuidora não vê a proposta da concorrente</strong>, nem os preços dela, nem
          o comparativo final, nem quem mais foi convidado para a cotação.
        </li>
        <li>
          <strong>A farmácia vê as propostas que recebeu</strong> — todas elas, lado a lado. É para isso
          que ela abriu a cotação, e o representante sabe disso ao responder.
        </li>
        <li>
          <strong>Dentro da farmácia, o perfil manda</strong>: administrador gerencia usuários e dados
          da empresa; comprador cria cotação, ajusta plano de compra e gera pedido; consulta apenas lê.
        </li>
        <li>
          <strong>Nossa equipe</strong> acessa dados de conta apenas quando é necessário para suporte,
          manutenção ou segurança, sob obrigação de sigilo e com o acesso registrado.
        </li>
      </ul>
      <p>
        Uma ressalva honesta sobre o link da cotação: ele é público por desenho — o representante abre
        sem instalar nada. Quem tiver o link consegue ver o nome da farmácia, o nome da cotação e a
        lista de produtos solicitados, e precisa se autenticar para enviar ou ver propostas. Trate o
        link como você trataria o pedido em si e mande só para quem deve responder.
      </p>
    </section>

    <section id="retencao">
      <h2>11. Por quanto tempo guardamos</h2>
      <div className="legal-tabela-wrap"><table className="legal-tabela">
        <caption className="sr-only">Prazo de guarda por tipo de dado</caption>
        <thead><tr><th>Dado</th><th>Prazo</th></tr></thead>
        <tbody>
          <tr><td>Conta, cotações, propostas, pedidos e histórico de preço</td><td>Enquanto a conta existir</td></tr>
          <tr><td>Depois do encerramento da conta</td><td>Até 12 meses, para permitir retomada e exportação; depois, exclusão ou anonimização</td></tr>
          <tr><td>Registros fiscais e de cobrança</td><td>5 anos, por exigência legal</td></tr>
          <tr><td>Registros de acesso à aplicação</td><td>6 meses, conforme o Marco Civil da Internet (Lei nº 12.965/2014)</td></tr>
          <tr><td>Sessão ativa (cookie de renovação)</td><td>Até 90 dias, ou até você sair da conta</td></tr>
          <tr><td>Link de redefinição de senha</td><td>30 minutos</td></tr>
          <tr><td>Link de confirmação de e-mail</td><td>48 horas</td></tr>
          <tr><td>Página de pagamento aberta no checkout</td><td>60 minutos</td></tr>
          <tr><td>Cache de consulta no servidor</td><td>10 minutos</td></tr>
        </tbody>
      </table></div>
      <p>
        Pedidos de exclusão são atendidos, mas há um limite que a lei impõe e que preferimos dizer com
        clareza: dado necessário ao cumprimento de obrigação legal, ou ao exercício regular de direito
        em processo, é retido pelo prazo correspondente, ainda que você peça o apagamento. Uma proposta
        já usada numa compra fechada também permanece vinculada àquela compra, porque ela é o registro
        do que foi negociado — o que fazemos, nesse caso, é desvincular os dados de contato da pessoa.
      </p>
    </section>

    <section id="seguranca">
      <h2>12. Como protegemos</h2>
      <ul>
        <li>
          <strong>Senhas nunca são guardadas em texto puro.</strong> Guardamos um hash com algoritmo
          próprio para senha, que não permite recuperar o valor original. Nem nós conseguimos ver a sua
          senha — por isso a recuperação é sempre por link, nunca por reenvio da senha antiga.
        </li>
        <li>
          <strong>Tráfego criptografado</strong> em HTTPS entre o seu navegador e os nossos servidores.
        </li>
        <li>
          <strong>Sessão curta com renovação controlada</strong>: o token de acesso vale 15 minutos e é
          renovado por um cookie que o JavaScript da página não consegue ler (<code>HttpOnly</code>,
          <code>SameSite=Lax</code>, restrito ao caminho de autenticação). O token de renovação é
          gravado no banco apenas como hash, em famílias que permitem revogar todas as sessões de uma
          vez ao trocar a senha.
        </li>
        <li>
          <strong>Isolamento por empresa</strong> aplicado no acesso ao banco, não só na tela.
        </li>
        <li>
          <strong>Permissão por perfil</strong> verificada no servidor a cada operação, e não apenas
          escondendo botão na interface.
        </li>
        <li>
          <strong>Painel de métricas fechado</strong>: a porta de diagnóstico responde só a quem já está
          na máquina, e não é exposta na internet.
        </li>
        <li>
          <strong>Webhook de pagamento autenticado</strong> por segredo compartilhado, para que ninguém
          libere assinatura descobrindo a URL.
        </li>
      </ul>
      <p>
        Nenhum sistema é impenetrável, e não vamos prometer o contrário. Se ocorrer incidente de
        segurança com risco relevante aos seus direitos, comunicaremos você e a Autoridade Nacional de
        Proteção de Dados em prazo razoável, descrevendo o que aconteceu, os dados envolvidos e as
        medidas tomadas.
      </p>
    </section>

    <section id="direitos">
      <h2>13. Seus direitos e como exercê-los</h2>
      <p>A LGPD garante a você, a qualquer momento e sem custo:</p>
      <ul>
        <li><strong>Confirmação</strong> de que tratamos dados seus, e <strong>acesso</strong> a eles;</li>
        <li><strong>Correção</strong> de dado incompleto, inexato ou desatualizado;</li>
        <li><strong>Anonimização, bloqueio ou eliminação</strong> de dado desnecessário, excessivo ou tratado fora da lei;</li>
        <li><strong>Portabilidade</strong> a outro fornecedor, mediante requisição expressa;</li>
        <li><strong>Eliminação</strong> dos dados tratados com base em consentimento;</li>
        <li><strong>Informação</strong> sobre com quem compartilhamos os seus dados;</li>
        <li><strong>Informação</strong> sobre a possibilidade de não consentir, e o que decorre disso;</li>
        <li><strong>Revogação do consentimento</strong>, quando for essa a base legal;</li>
        <li><strong>Oposição</strong> a tratamento feito com base em legítimo interesse.</li>
      </ul>
      <p>
        Boa parte disso você resolve sozinho, sem falar com a gente: a farmácia exporta cotações,
        comparativos e histórico em Excel direto do sistema, corrige o cadastro em <em>Dados da
        farmácia</em>, gerencia quem tem acesso em <em>Usuários</em> e troca a senha em <em>Alterar
        senha</em>. O representante ajusta os próprios dados na área dele.
      </p>
      <p>
        Para o que não está na tela — exclusão de conta, portabilidade formal, oposição —, escreva para
        os canais da seção 17. Respondemos em <strong>até 15 dias</strong>. Podemos pedir uma
        confirmação de identidade antes de atender: é proteção sua, não burocracia nossa. Se negarmos
        algum pedido, dizemos por escrito o motivo e a base legal.
      </p>
      <p>
        Você também pode reclamar diretamente à Autoridade Nacional de Proteção de Dados (ANPD), em
        gov.br/anpd.
      </p>
    </section>

    <section id="menores">
      <h2>14. Crianças e adolescentes</h2>
      <p>
        O CotaPreço é uma ferramenta de trabalho, destinada a maiores de 18 anos que atuam em farmácia
        ou distribuidora. Não coletamos dados de crianças e adolescentes de forma consciente. Se
        soubermos de um cadastro nessas condições, ele é encerrado e os dados são eliminados.
      </p>
    </section>

    <section id="internacional">
      <h2>15. Transferência internacional</h2>
      <p>
        A operação é brasileira e o banco de dados fica em infraestrutura contratada para atender o
        Brasil. Alguns fornecedores de apoio — rede de distribuição de conteúdo, envio de e-mail,
        fontes tipográficas — podem processar dados de conexão em servidores fora do país. Quando isso
        acontece, exigimos que o fornecedor ofereça grau de proteção compatível com a LGPD, na forma
        dos artigos 33 a 36.
      </p>
    </section>

    <section id="alteracoes">
      <h2>16. Mudanças nesta política</h2>
      <p>
        Esta política pode ser revisada para acompanhar mudanças no sistema ou na lei. A data de
        vigência no topo da página sempre indica a versão atual. Quando a mudança for relevante — nova
        finalidade, novo compartilhamento, prazo de guarda maior —, avisamos por e-mail ou por aviso
        dentro do sistema antes de ela passar a valer.
      </p>
    </section>

    <section id="contato">
      <h2>17. Contato e encarregado</h2>
      <p>
        Para exercer direitos, tirar dúvida sobre esta política ou relatar um problema de privacidade,
        fale com o nosso encarregado pelo tratamento de dados pessoais:
      </p>
      <ul className="legal-contato">
        <li><strong>E-mail:</strong> <a href="mailto:privacidade@cotapreco.com">privacidade@cotapreco.com</a></li>
        <li><strong>WhatsApp:</strong> <a href="https://wa.me/5581999441494" target="_blank" rel="noopener noreferrer">(81) 99944-1494</a></li>
        <li><strong>Controladora:</strong> AppStarter Pro — CNPJ 61.296.087/0001-80</li>
      </ul>
      <p>
        Leia também os <LinkInterno to="/termos">Termos de Uso</LinkInterno> e a <LinkInterno to="/cookies">Política
        de Cookies</LinkInterno>, que completam este documento.
      </p>
    </section>
  </LayoutLegal>
}
