import { Plus } from 'lucide-react'
import { usarAutenticacao } from '../autenticacao'
import { acessoBloqueado, LINK_WHATSAPP_ASSINATURA } from '../lib/assinatura'
import { LinkInterno } from '../roteamento'

/*
 * Com o teste vencido o botão vira o caminho da assinatura em vez de levar a um
 * formulário que só recusaria no fim — o pior lugar para dar a notícia.
 */
export default function BotaoNovaCotacao({ rotulo = 'Nova cotação', comIcone = true }:{ rotulo?:string; comIcone?:boolean }) {
  const { user } = usarAutenticacao()
  if (acessoBloqueado(user?.accessAllowed)) return <a className="button button-primary" href={LINK_WHATSAPP_ASSINATURA}
    target="_blank" rel="noopener noreferrer" title="Seu período de teste terminou. Assine para voltar a criar cotações.">
    Assinar para criar cotações
  </a>
  return <LinkInterno className="button button-primary" to="/cotacoes/nova">{comIcone && <Plus/>}{rotulo}</LinkInterno>
}
