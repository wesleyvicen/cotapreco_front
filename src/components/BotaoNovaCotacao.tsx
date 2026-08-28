import { Plus } from 'lucide-react'
import { usarAutenticacao } from '../autenticacao'
import { acessoBloqueado, emailPendente } from '../lib/assinatura'
import { LinkInterno } from '../roteamento'

/*
 * Com o teste vencido o botão vira o caminho da assinatura em vez de levar a um
 * formulário que só recusaria no fim — o pior lugar para dar a notícia.
 */
export default function BotaoNovaCotacao({ rotulo = 'Nova cotação', comIcone = true }:{ rotulo?:string; comIcone?:boolean }) {
  const { user } = usarAutenticacao()
  if (acessoBloqueado(user?.accessAllowed)) return <LinkInterno className="button button-primary" to="/assinatura"
    title="Seu período de teste terminou. Assine para voltar a criar cotações.">
    Assinar para criar cotações
  </LinkInterno>
  /* Com o e-mail pendente o botão continua levando ao wizard: lá a tela explica o que falta
     e como achar o e-mail. Sumir com o botão esconderia justamente a explicação. */
  return <LinkInterno className="button button-primary" to="/cotacoes/nova"
    title={emailPendente(user?.emailConfirmed) ? 'Confirme seu e-mail para liberar a criação de cotações' : undefined}>
    {comIcone && <Plus/>}{rotulo}
  </LinkInterno>
}
