import { Plus } from 'lucide-react'
import { usarAutenticacao } from '../autenticacao'
import { acessoBloqueado } from '../lib/assinatura'
import { LinkInterno } from '../roteamento'

/*
 * Com o teste vencido o botão vira o caminho da assinatura em vez de levar a um
 * formulário que só recusaria no fim - o pior lugar para dar a notícia.
 */
export default function BotaoNovaCotacao({ rotulo = 'Nova cotação', comIcone = true }:{ rotulo?:string; comIcone?:boolean }) {
  const { user } = usarAutenticacao()
  if (acessoBloqueado(user?.accessAllowed)) return <LinkInterno className="button button-primary" to="/assinatura"
    title="Seu período de teste terminou. Assine para voltar a criar cotações.">
    Assinar para criar cotações
  </LinkInterno>
  return <LinkInterno className="button button-primary" to="/cotacoes/nova">
    {comIcone && <Plus/>}{rotulo}
  </LinkInterno>
}
