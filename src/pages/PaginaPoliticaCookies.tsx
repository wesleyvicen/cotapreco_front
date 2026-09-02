import LayoutLegal, { DestaqueLegal, type SecaoLegal } from '../components/LayoutLegal'
import { LinkInterno } from '../roteamento'

const INDICE: SecaoLegal[] = [
  { id: 'resumo', titulo: 'O que usamos, em resumo' },
  { id: 'o-que-sao', titulo: 'Cookies e armazenamento local' },
  { id: 'cookies', titulo: 'Cookies que o sistema grava' },
  { id: 'local', titulo: 'O que fica no seu navegador' },
  { id: 'terceiros', titulo: 'Cookies de terceiros' },
  { id: 'gerenciar', titulo: 'Como apagar ou bloquear' },
  { id: 'banner', titulo: 'Por que não há banner de cookies' },
  { id: 'contato', titulo: 'Contato' },
]

export default function PaginaPoliticaCookies() {
  return <LayoutLegal
    titulo="Política de Cookies"
    resumo="A lista exata do que o CotaPreço grava no seu navegador, para que serve cada item e por quanto tempo ele fica."
    indice={INDICE}>

    <DestaqueLegal titulo="Direto ao ponto">
      <p>
        O CotaPreço usa <strong>dois cookies</strong>, ambos estritamente necessários para manter você
        conectado. <strong>Não usamos cookie de publicidade, de rastreamento ou de análise de
        audiência</strong> — nem nossos, nem de terceiros. Não há Google Analytics, pixel de rede
        social, mapa de calor nem gravador de sessão.
      </p>
    </DestaqueLegal>

    <section id="resumo">
      <h2>1. O que usamos, em resumo</h2>
      <ul>
        <li><strong>2 cookies</strong>, os dois para manter a sessão viva sem pedir sua senha a cada 15 minutos;</li>
        <li><strong>4 itens de armazenamento local</strong>, que ficam só no seu aparelho e nunca são enviados a nós;</li>
        <li><strong>Nenhum</strong> cookie de marketing, perfil de comportamento ou venda de dado.</li>
      </ul>
    </section>

    <section id="o-que-sao">
      <h2>2. Cookies e armazenamento local</h2>
      <p>
        <strong>Cookie</strong> é um arquivinho que o site grava no navegador e que <em>volta ao
        servidor</em> a cada requisição. É por isso que serve para reconhecer a sua sessão.
      </p>
      <p>
        <strong>Armazenamento local</strong> (<code>localStorage</code> e <code>sessionStorage</code>) é
        outra coisa: fica no seu aparelho e <em>não é enviado automaticamente</em> a servidor nenhum. Só
        vai para o servidor aquilo que a página resolver mandar — no nosso caso, o token de acesso no
        cabeçalho da requisição que você mesmo dispara ao usar o sistema.
      </p>
      <p>Explicamos os dois porque, para você, o efeito prático é o mesmo: são coisas guardadas no seu navegador.</p>
    </section>

    <section id="cookies">
      <h2>3. Cookies que o sistema grava</h2>
      <div className="legal-tabela-wrap"><table className="legal-tabela">
        <caption className="sr-only">Cookies usados pelo CotaPreço</caption>
        <thead>
          <tr><th>Nome</th><th>Para que serve</th><th>Duração</th><th>Categoria</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>cotapreco_refresh_farmacia</code></td>
            <td>Renova a sessão de quem entra pela farmácia, sem pedir a senha de novo a cada 15 minutos</td>
            <td>Até 90 dias, ou até você sair da conta</td>
            <td>Estritamente necessário</td>
          </tr>
          <tr>
            <td><code>cotapreco_refresh_representante</code></td>
            <td>Mesma função, para o representante da distribuidora que responde cotações</td>
            <td>Até 90 dias, ou até você sair da conta</td>
            <td>Estritamente necessário</td>
          </tr>
        </tbody>
      </table></div>
      <p>Os dois são gravados com proteções que vale conhecer:</p>
      <ul>
        <li>
          <strong><code>HttpOnly</code></strong> — o JavaScript da página não consegue ler o valor.
          Isso reduz muito o estrago de um eventual ataque de injeção de script.
        </li>
        <li>
          <strong><code>SameSite=Lax</code></strong> — o cookie não é enviado quando outro site dispara
          uma requisição para nós, o que barra o uso da sua sessão por uma página de terceiro.
        </li>
        <li>
          <strong>Caminho restrito</strong> — cada um vale apenas na rota de autenticação a que
          pertence, e não acompanha o resto da navegação.
        </li>
        <li>
          <strong><code>Secure</code></strong> em produção — só trafega por HTTPS.
        </li>
        <li>
          <strong>Guardado como hash</strong> no nosso banco: o valor que vale é o que está no seu
          navegador; do nosso lado fica apenas a impressão digital dele, agrupada em famílias que
          permitem revogar todas as suas sessões de uma vez quando você troca a senha.
        </li>
      </ul>
      <p>
        Sair da conta apaga o cookie no navegador e revoga a sessão no servidor — as duas coisas, não
        só uma.
      </p>
    </section>

    <section id="local">
      <h2>4. O que fica no seu navegador</h2>
      <div className="legal-tabela-wrap"><table className="legal-tabela">
        <caption className="sr-only">Itens de armazenamento local usados pelo CotaPreço</caption>
        <thead>
          <tr><th>Chave</th><th>Onde fica</th><th>Para que serve</th><th>Duração</th></tr>
        </thead>
        <tbody>
          <tr>
            <td><code>cotapreco_token</code></td>
            <td>localStorage</td>
            <td>Token de acesso da farmácia, enviado no cabeçalho de cada chamada à API</td>
            <td>Até sair da conta; o token em si vale 15 minutos e é renovado</td>
          </tr>
          <tr>
            <td><code>cotapreco_token_representante</code></td>
            <td>localStorage</td>
            <td>Mesma função, para o representante</td>
            <td>Até sair da conta</td>
          </tr>
          <tr>
            <td><code>cotapreco:usuario-farmacia</code></td>
            <td>localStorage</td>
            <td>Nome, e-mail e farmácia do usuário, para a tela já abrir preenchida em vez de piscar carregando</td>
            <td>Até sair da conta</td>
          </tr>
          <tr>
            <td><code>cotapreco:sidebar-recolhida</code></td>
            <td>localStorage</td>
            <td>Lembra se você deixou o menu lateral minimizado</td>
            <td>Até você limpar o navegador</td>
          </tr>
          <tr>
            <td><code>cotapreco:painel:*</code></td>
            <td>sessionStorage</td>
            <td>Cache do painel, para voltar a uma tela já vista sem recarregar tudo</td>
            <td>Apagado quando você fecha a aba</td>
          </tr>
        </tbody>
      </table></div>
      <p>
        Nada disso é enviado para nós por conta própria, e nada disso identifica você para terceiros. Se
        o seu navegador bloquear armazenamento, o sistema continua funcionando — você só perde as
        conveniências: a sessão não sobrevive ao fechamento do navegador e o painel recarrega do zero.
      </p>
    </section>

    <section id="terceiros">
      <h2>5. Cookies de terceiros</h2>
      <p><strong>Não incorporamos cookie de terceiro para publicidade ou análise.</strong> Dois serviços externos, porém, participam da entrega das páginas:</p>
      <ul>
        <li>
          <strong>Cloudflare</strong>, que publica e protege a interface. Pode gravar cookie próprio de
          segurança para distinguir tráfego legítimo de ataque automatizado.
        </li>
        <li>
          <strong>Google Fonts</strong>, de onde vêm as fontes das páginas. O carregamento da fonte
          expõe dados de conexão — endereço IP e tipo de navegador — ao servidor do Google, sem gravar
          cookie nosso.
        </li>
      </ul>
      <p>
        A página de pagamento é aberta no ambiente da operadora <strong>Asaas</strong>, que tem cookies e
        política próprios. Enquanto você está lá, quem manda são as regras dela.
      </p>
    </section>

    <section id="gerenciar">
      <h2>6. Como apagar ou bloquear</h2>
      <p>
        Você controla tudo isso pelo navegador — em geral no menu de configurações, na seção de
        privacidade, em “cookies e dados de sites”. Lá você apaga o que já está gravado, bloqueia novos
        registros ou define exceções por site.
      </p>
      <p>
        Duas consequências, ditas sem rodeio: bloquear os nossos cookies <strong>impede o login</strong>,
        porque não há como manter a sessão; e apagar o armazenamento local <strong>desconecta você</strong>,
        exigindo entrar de novo. Não há como usar o sistema autenticado sem eles.
      </p>
      <p>
        A forma mais simples de encerrar tudo pelo próprio sistema é clicar em <strong>Sair</strong>: o
        cookie é apagado e a sessão é revogada no servidor.
      </p>
    </section>

    <section id="banner">
      <h2>7. Por que não há banner de cookies</h2>
      <p>
        Porque não temos nada a pedir a você. Banner de consentimento existe para cookies não
        essenciais — publicidade, medição de audiência, perfil de comportamento. Como o CotaPreço usa
        <strong> apenas cookies estritamente necessários</strong> ao funcionamento de um serviço que
        você pediu para usar, o consentimento prévio não se aplica; a base legal é a execução do
        contrato, e a obrigação que resta é a de informar — que é o que este documento faz.
      </p>
      <p>
        Se um dia adotarmos qualquer cookie não essencial, ele virá com pedido de consentimento
        explícito, recusável, e esta página será atualizada antes.
      </p>
    </section>

    <section id="contato">
      <h2>8. Contato</h2>
      <ul className="legal-contato">
        <li><strong>E-mail:</strong> <a href="mailto:privacidade@cotapreco.com">privacidade@cotapreco.com</a></li>
        <li><strong>WhatsApp:</strong> <a href="https://wa.me/5581999441494" target="_blank" rel="noopener noreferrer">(81) 99944-1494</a></li>
        <li><strong>Empresa:</strong> AppStarter Pro — CNPJ 61.296.087/0001-80</li>
      </ul>
      <p>
        Leia também a <LinkInterno to="/privacidade">Política de Privacidade</LinkInterno> e os
        <LinkInterno to="/termos"> Termos de Uso</LinkInterno>.
      </p>
    </section>
  </LayoutLegal>
}
