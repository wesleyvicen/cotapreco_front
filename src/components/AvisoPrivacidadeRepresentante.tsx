import { ShieldCheck } from 'lucide-react'
import { LinkInterno } from '../roteamento'

/* Aviso na tela onde o representante cria o acesso e envia preço. Ele é a parte que menos
   informação tem sobre o sistema — chegou por um link, não contratou nada — e a pergunta
   que ele faz na prática é sempre a mesma: quem vai ver o preço que eu digitar. O resumo
   fica aberto; o detalhe fica no <details> para não empurrar o formulário para baixo. */
export default function AvisoPrivacidadeRepresentante() {
  return <div className="aviso-privacidade">
    <p className="aviso-privacidade-topo">
      <ShieldCheck/>
      <span>Os preços que você enviar são vistos <strong>apenas pela farmácia desta cotação</strong>. Nenhuma distribuidora concorrente vê a sua proposta.</span>
    </p>
    <details>
      <summary>O que fica guardado sobre você</summary>
      <ul>
        <li><strong>Seu nome, telefone e e-mail</strong>, para a farmácia saber com quem fala e para você entrar nas próximas cotações sem cadastro novo.</li>
        <li><strong>Sua senha</strong>, guardada apenas como hash — nem nós conseguimos lê-la.</li>
        <li><strong>As propostas que você envia</strong>: preço, disponibilidade e observação por item, com data e hora.</li>
        <li><strong>Nome, CNPJ e pedido mínimo da distribuidora</strong> que você informar.</li>
      </ul>
      <p>
        O acesso é gratuito, sem contrato e sem mensalidade, e serve para responder a
        qualquer farmácia. Você pode pedir a exclusão dos seus dados a qualquer momento em
        <a href="mailto:privacidade@cotapreco.com"> privacidade@cotapreco.com</a>.
      </p>
      <p>
        Detalhes na <LinkInterno to="/privacidade">Política de Privacidade</LinkInterno> e
        nos <LinkInterno to="/termos">Termos de Uso</LinkInterno>.
      </p>
    </details>
  </div>
}
