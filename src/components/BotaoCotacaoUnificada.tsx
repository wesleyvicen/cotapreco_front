import { Layers } from 'lucide-react'
import { usarAutenticacao } from '../autenticacao'
import { acessoBloqueado } from '../lib/assinatura'
import { farmaciasDeCompra, perfilAtivo } from '../lib/permissoes'
import { LinkInterno } from '../roteamento'

/*
 * Cotação unificada: várias farmácias da rede num link só. Só aparece para quem compra em
 * pelo menos duas delas - inclusive na farmácia ativa, que é quem confere os produtos
 * importados no assistente. Com o teste vencido, o botão de nova cotação já leva à
 * assinatura; este simplesmente some.
 */
export default function BotaoCotacaoUnificada() {
  const { user } = usarAutenticacao()
  const perfil = perfilAtivo(user)
  if (acessoBloqueado(user?.accessAllowed) || farmaciasDeCompra(user).length < 2 || (perfil !== 'ADMIN' && perfil !== 'BUYER')) return null
  return <LinkInterno className="button button-secondary" to="/cotacoes/unificada/nova"
    title="Uma cotação com os pedidos de várias farmácias, respondida uma vez só pelo representante">
    <Layers/>Cotação unificada
  </LinkInterno>
}
