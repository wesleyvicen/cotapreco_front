import LayoutLegal, { DestaqueLegal, type SecaoLegal } from '../components/LayoutLegal'
import { LinkInterno } from '../roteamento'

const INDICE: SecaoLegal[] = [
  { id: 'aceite', titulo: 'Aceite destes termos' },
  { id: 'o-que-e', titulo: 'O que o CotaPreço é — e o que não é' },
  { id: 'conta', titulo: 'Conta, usuários e perfis' },
  { id: 'teste', titulo: 'Teste de 7 dias' },
  { id: 'assinatura', titulo: 'Assinatura, preço e cobrança' },
  { id: 'cancelamento', titulo: 'Cancelamento e reembolso' },
  { id: 'inadimplencia', titulo: 'Atraso no pagamento' },
  { id: 'representante', titulo: 'Regras para o representante da distribuidora' },
  { id: 'uso-aceitavel', titulo: 'Uso aceitável' },
  { id: 'conteudo', titulo: 'De quem são os dados e o conteúdo' },
  { id: 'disponibilidade', titulo: 'Disponibilidade e suporte' },
  { id: 'responsabilidade', titulo: 'Limites de responsabilidade' },
  { id: 'encerramento', titulo: 'Encerramento da conta' },
  { id: 'mudancas', titulo: 'Mudanças no serviço e nestes termos' },
  { id: 'foro', titulo: 'Lei aplicável e foro' },
  { id: 'contato', titulo: 'Contato' },
]

export default function PaginaTermosDeUso() {
  return <LayoutLegal
    titulo="Termos de Uso"
    resumo="As regras do serviço: o que entregamos, o que cobramos, o que esperamos de você e o que acontece quando algo dá errado."
    indice={INDICE}>

    <DestaqueLegal titulo="O essencial em cinco linhas">
      <ul>
        <li>São 7 dias de teste com tudo liberado, sem cartão e sem cobrança automática no fim.</li>
        <li>A assinatura custa R$ 119,90 por mês, cobrada no cartão pela operadora Asaas.</li>
        <li>Você cancela quando quiser; o acesso segue até o fim do período já pago.</li>
        <li>Os dados são seus e continuam seus. Exporte em Excel a qualquer momento.</li>
        <li>Os preços das propostas são informados pelas distribuidoras — nós comparamos, não os garantimos.</li>
      </ul>
    </DestaqueLegal>

    <section id="aceite">
      <h2>1. Aceite destes termos</h2>
      <p>
        Estes Termos de Uso regem o acesso e o uso do CotaPreço, sistema de cotação e compra de
        medicamentos para farmácias, operado pela <strong>AppStarter Pro</strong>, CNPJ
        61.296.087/0001-80, em cotapreco.com.
      </p>
      <p>
        Ao criar uma conta, ao responder uma cotação ou ao usar o sistema de qualquer forma, você
        declara que leu e concorda com estes termos e com a <LinkInterno to="/privacidade">Política de
        Privacidade</LinkInterno>. Se você aceita em nome de uma empresa, declara ter poderes para
        vinculá-la. Se não concorda com algum ponto, não use o serviço.
      </p>
    </section>

    <section id="o-que-e">
      <h2>2. O que o CotaPreço é — e o que não é</h2>
      <p>
        O CotaPreço é um <strong>software como serviço</strong>, acessado pelo navegador. Ele recebe a
        lista de produtos que a farmácia quer comprar, distribui essa lista para as distribuidoras por
        um link, organiza as propostas recebidas, monta um comparativo item a item, sugere a divisão da
        compra pelo melhor preço, gera o pedido de cada distribuidora e registra a conferência da
        entrega.
      </p>
      <p>Para evitar mal-entendido, o que ele <strong>não</strong> é:</p>
      <ul>
        <li>
          <strong>Não somos parte da compra.</strong> A negociação, o pedido, o pagamento e a entrega
          acontecem entre a farmácia e a distribuidora. Não vendemos medicamento, não intermediamos
          pagamento entre as partes e não respondemos pela mercadoria.
        </li>
        <li>
          <strong>Não garantimos preço nem disponibilidade.</strong> Ambos são informados pelo
          representante da distribuidora e podem estar errados, desatualizados ou sujeitos a condições
          que ele não digitou. O sistema chega a avisar quando um preço destoa demais dos outros — é um
          alerta para conferir, não uma validação.
        </li>
        <li>
          <strong>Não é sistema de gestão, ERP, PDV nem emissor fiscal.</strong> Não emitimos nota,
          não controlamos estoque e não substituímos o seu sistema de retaguarda.
        </li>
        <li>
          <strong>Não damos consultoria regulatória.</strong> O cumprimento das regras sanitárias e da
          legislação de medicamentos, incluindo controlados, é responsabilidade de quem compra e de
          quem vende.
        </li>
      </ul>
    </section>

    <section id="conta">
      <h2>3. Conta, usuários e perfis</h2>
      <p>
        A conta é da farmácia e é criada com nome do responsável, e-mail, nome da farmácia, CNPJ e
        senha. O e-mail precisa ser confirmado pelo link que enviamos, válido por 48 horas.
      </p>
      <p>Dentro da farmácia existem três perfis:</p>
      <ul>
        <li><strong>Administrador</strong> — faz tudo, além de gerenciar usuários e os dados da empresa;</li>
        <li><strong>Comprador</strong> — cria e conduz cotações, ajusta o plano de compra e gera pedidos;</li>
        <li><strong>Consulta</strong> — apenas visualiza.</li>
      </ul>
      <p>
        Você é responsável por manter a senha em sigilo, por quem você convida para a conta e por tudo
        o que é feito com as credenciais da sua farmácia. Suspeitou de acesso indevido? Troque a senha:
        isso encerra todas as sessões abertas. E avise a gente.
      </p>
      <p>
        Dados cadastrais precisam ser verdadeiros e atualizados. Cadastro com informação falsa,
        conta de terceiro sem autorização ou CNPJ que não corresponde à farmácia autorizam o
        encerramento imediato.
      </p>
    </section>

    <section id="teste">
      <h2>4. Teste de 7 dias</h2>
      <p>
        Toda conta nova começa com <strong>7 dias corridos</strong> de acesso completo, contados da
        criação: cotações, comparativo, plano de compra, histórico e exportação, sem limitação de
        funcionalidade.
      </p>
      <ul>
        <li><strong>Não pedimos cartão de crédito</strong> para iniciar o teste.</li>
        <li><strong>Não há cobrança automática</strong> quando os 7 dias terminam. O acesso simplesmente para até você decidir assinar.</li>
        <li>Enviamos um aviso por e-mail com antecedência de 2 dias do fim do teste.</li>
        <li>Terminado o teste, os seus dados continuam guardados: ao assinar, você retoma exatamente de onde parou.</li>
      </ul>
      <p>O teste é um por farmácia. Criar contas repetidas para renovar o período gratuito não é uso legítimo do serviço.</p>
    </section>

    <section id="assinatura">
      <h2>5. Assinatura, preço e cobrança</h2>
      <ul>
        <li><strong>Preço:</strong> R$ 119,90 por mês, por farmácia, com usuários ilimitados dentro dela.</li>
        <li><strong>Forma de pagamento:</strong> cartão de crédito, com renovação automática mensal.</li>
        <li><strong>Quem processa:</strong> Asaas, operadora de pagamento contratada por nós. Os dados do cartão são digitados no ambiente dela; não passam por nós e não são gravados por nós. Guardamos apenas os quatro últimos dígitos, para você identificar o cartão na tela de assinatura.</li>
        <li><strong>Dados exigidos para assinar:</strong> endereço completo e telefone da farmácia — exigência da operadora para emitir a cobrança.</li>
        <li><strong>Vencimento:</strong> a cada mês, na data correspondente à da contratação.</li>
        <li><strong>Reajuste:</strong> no máximo uma vez a cada 12 meses, com aviso de pelo menos 30 dias por e-mail. Se o novo preço não servir para você, cancele antes de ele entrar em vigor.</li>
        <li><strong>Tributos:</strong> o valor anunciado já inclui os tributos aplicáveis.</li>
      </ul>
      <p>
        A página de pagamento aberta no checkout vale por 60 minutos. Se expirar, é só abrir outra pela
        tela de assinatura.
      </p>
    </section>

    <section id="cancelamento">
      <h2>6. Cancelamento e reembolso</h2>
      <ul>
        <li>
          <strong>Cancelar é livre e sem multa</strong>, a qualquer momento, pela tela de assinatura ou
          pelos canais da seção 16.
        </li>
        <li>
          <strong>O acesso continua até o fim do período já pago.</strong> Cancelar no dia 3 não
          interrompe o mês que você pagou no dia 1º.
        </li>
        <li>
          <strong>Não devolvemos proporcionalmente</strong> o mês em curso, salvo nas hipóteses de
          arrependimento e de falha nossa descritas abaixo.
        </li>
        <li>
          <strong>Arrependimento:</strong> se você assinou pela internet, tem 7 dias corridos desde a
          contratação para desistir e receber de volta o valor integral, na forma do artigo 49 do
          Código de Defesa do Consumidor.
        </li>
        <li>
          <strong>Falha nossa:</strong> indisponibilidade prolongada causada por nós dá direito a
          abatimento proporcional aos dias afetados, mediante solicitação.
        </li>
      </ul>
      <p>
        Depois do cancelamento, você continua podendo exportar os seus dados durante o período descrito
        na <LinkInterno to="/privacidade">Política de Privacidade</LinkInterno>.
      </p>
    </section>

    <section id="inadimplencia">
      <h2>7. Atraso no pagamento</h2>
      <p>
        Se a cobrança não for aprovada, avisamos por e-mail e o acesso continua por uma
        <strong> carência de 3 dias</strong> após o vencimento. Passada a carência, a conta entra em
        modo somente leitura: você continua vendo e exportando o que já existe, mas não abre cotação
        nova nem gera pedido, até a regularização.
      </p>
      <p>
        Os dados não são apagados por inadimplência dentro dos prazos de guarda da política de
        privacidade. Regularizado o pagamento, o acesso volta ao normal automaticamente.
      </p>
    </section>

    <section id="representante">
      <h2>8. Regras para o representante da distribuidora</h2>
      <p>
        O acesso do representante é <strong>gratuito</strong>: não há contrato, mensalidade nem
        fidelidade para a distribuidora. Ao responder uma cotação, você concorda que:
      </p>
      <ul>
        <li>As informações que preenche — preço, disponibilidade, pedido mínimo — são de sua responsabilidade e devem ser verdadeiras;</li>
        <li>A farmácia que abriu a cotação verá a sua proposta e poderá compará-la com as demais que recebeu, exportá-la e usá-la para decidir a compra;</li>
        <li>Você tem autorização da distribuidora que representa para informar aqueles preços;</li>
        <li>Sua conta é pessoal: não a compartilhe com outro representante;</li>
        <li>Uma mesma conta pode responder por mais de uma distribuidora e em cotações de farmácias diferentes.</li>
      </ul>
      <p>
        Enviar preço falso, proposta em nome de distribuidora que você não representa ou usar o acesso
        para coletar informação de concorrente é motivo de encerramento imediato do acesso, sem prejuízo
        das medidas cabíveis.
      </p>
    </section>

    <section id="uso-aceitavel">
      <h2>9. Uso aceitável</h2>
      <p>Ao usar o CotaPreço, você se compromete a não:</p>
      <ul>
        <li>Tentar acessar dados de outra farmácia, de outra distribuidora ou de outro usuário;</li>
        <li>Sondar, varrer ou testar vulnerabilidades sem autorização escrita nossa;</li>
        <li>Automatizar acesso de forma a degradar o serviço, ou raspar conteúdo em massa;</li>
        <li>Fazer engenharia reversa, copiar, revender, sublicenciar ou hospedar o sistema por conta própria;</li>
        <li>Enviar conteúdo ilícito, malicioso ou que viole direito de terceiro;</li>
        <li>Usar a plataforma para combinar preço com concorrente ou para qualquer prática vedada pela legislação concorrencial;</li>
        <li>Contornar limites técnicos, incluindo o de 10 MB por arquivo importado.</li>
      </ul>
      <p>
        Encontrou uma falha de segurança? Avise em <a href="mailto:privacidade@cotapreco.com">privacidade@cotapreco.com</a>
        antes de divulgar. Relato responsável é bem-vindo e nunca será tratado como ataque.
      </p>
    </section>

    <section id="conteudo">
      <h2>10. De quem são os dados e o conteúdo</h2>
      <ul>
        <li>
          <strong>Seus dados são seus.</strong> A lista de produtos, as propostas recebidas, os pedidos
          e o histórico de preço pertencem à farmácia que os gerou. Nós apenas os tratamos para prestar
          o serviço, conforme a política de privacidade.
        </li>
        <li>
          <strong>Você nos autoriza</strong>, apenas na medida necessária para operar o sistema, a
          armazenar, processar, exibir e transmitir esse conteúdo — inclusive a mostrar à farmácia a
          proposta que o representante enviou.
        </li>
        <li>
          <strong>Dados agregados e anonimizados</strong>, que não identifiquem farmácia, distribuidora
          nem pessoa, podem ser usados para melhorar o produto. Nunca divulgamos preço de uma
          distribuidora identificável nem dado de compra de farmácia identificável.
        </li>
        <li>
          <strong>O software é nosso.</strong> Marca, código, layout e conteúdo do CotaPreço pertencem à
          AppStarter Pro. A assinatura concede uma licença de uso limitada, não exclusiva e
          intransferível, e nada além disso.
        </li>
        <li>
          <strong>Sugestões que você nos manda</strong> podem ser implementadas livremente, sem gerar
          obrigação de pagamento ou de atribuição.
        </li>
      </ul>
    </section>

    <section id="disponibilidade">
      <h2>11. Disponibilidade e suporte</h2>
      <p>
        Trabalhamos para manter o serviço no ar de forma contínua, mas <strong>não prometemos
        disponibilidade ininterrupta</strong>. Pode haver parada para manutenção — anunciada com
        antecedência sempre que possível e preferencialmente fora do horário comercial — e
        indisponibilidade causada por terceiros: provedor de infraestrutura, operadora de pagamento,
        provedor de e-mail, falha de rede.
      </p>
      <p>
        O suporte é prestado em português, em dias úteis, pelo WhatsApp (81) 99944-1494 e pelo e-mail
        da seção 16. Não há SLA contratual de tempo de resposta no plano mensal padrão.
      </p>
    </section>

    <section id="responsabilidade">
      <h2>12. Limites de responsabilidade</h2>
      <p>
        O CotaPreço é uma ferramenta de apoio à decisão. A decisão de compra, a conferência do preço
        praticado, a checagem da embalagem e do EAN e a negociação com a distribuidora continuam sendo
        da farmácia.
      </p>
      <p>Dentro do que a lei permite, não respondemos por:</p>
      <ul>
        <li>Preço, prazo, disponibilidade, qualidade ou entrega da mercadoria — que são da distribuidora;</li>
        <li>Prejuízo decorrente de informação incorreta preenchida por qualquer usuário, incluindo erro de digitação em planilha importada;</li>
        <li>Lucro cessante, perda de oportunidade de compra ou dano indireto;</li>
        <li>Indisponibilidade causada por terceiros ou por caso fortuito e força maior;</li>
        <li>Uso do sistema por quem obteve as credenciais da sua farmácia por culpa sua.</li>
      </ul>
      <p>
        Havendo responsabilidade nossa reconhecida, ela fica limitada ao total efetivamente pago por
        você nos <strong>12 meses anteriores</strong> ao evento. Nada aqui afasta direitos que o Código
        de Defesa do Consumidor garanta de forma imperativa a consumidor pessoa física.
      </p>
    </section>

    <section id="encerramento">
      <h2>13. Encerramento da conta</h2>
      <p>
        <strong>Por você:</strong> a qualquer momento, pelos canais da seção 16. Exporte antes o que
        quiser levar.
      </p>
      <p>
        <strong>Por nós:</strong> em caso de violação destes termos, uso fraudulento, ordem judicial ou
        inadimplência prolongada. Salvo em fraude ou ordem legal, avisamos com pelo menos 15 dias de
        antecedência e damos prazo para você exportar os dados.
      </p>
      <p>
        <strong>Descontinuação do serviço:</strong> se um dia encerrarmos o CotaPreço, avisamos com pelo
        menos 60 dias de antecedência, mantemos a exportação funcionando nesse período e devolvemos
        proporcionalmente o valor já pago e não usufruído.
      </p>
    </section>

    <section id="mudancas">
      <h2>14. Mudanças no serviço e nestes termos</h2>
      <p>
        O produto evolui: funcionalidades são acrescentadas, alteradas e, ocasionalmente, removidas. A
        remoção de funcionalidade relevante é avisada com pelo menos 30 dias de antecedência.
      </p>
      <p>
        Estes termos podem ser revisados. A data de vigência no topo indica a versão atual, e mudanças
        relevantes são avisadas por e-mail ou dentro do sistema com pelo menos 30 dias de antecedência.
        Continuar usando o serviço depois da entrada em vigor significa aceitar a nova versão; se você
        não concordar, pode cancelar sem multa antes disso.
      </p>
    </section>

    <section id="foro">
      <h2>15. Lei aplicável e foro</h2>
      <p>
        Estes termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca do Recife,
        Pernambuco, para dirimir controvérsias, ressalvado ao consumidor pessoa física o direito de
        ajuizar ação no foro de seu domicílio.
      </p>
      <p>
        Se alguma cláusula for considerada inválida, as demais continuam valendo. A tolerância com o
        descumprimento de uma cláusula não significa renúncia a ela.
      </p>
    </section>

    <section id="contato">
      <h2>16. Contato</h2>
      <ul className="legal-contato">
        <li><strong>E-mail:</strong> <a href="mailto:privacidade@cotapreco.com">privacidade@cotapreco.com</a></li>
        <li><strong>WhatsApp:</strong> <a href="https://wa.me/5581999441494" target="_blank" rel="noopener noreferrer">(81) 99944-1494</a></li>
        <li><strong>Empresa:</strong> AppStarter Pro — CNPJ 61.296.087/0001-80</li>
      </ul>
      <p>
        Leia também a <LinkInterno to="/privacidade">Política de Privacidade</LinkInterno> e a
        <LinkInterno to="/cookies"> Política de Cookies</LinkInterno>.
      </p>
    </section>
  </LayoutLegal>
}
