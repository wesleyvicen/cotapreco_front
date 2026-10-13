import { AlertCircle, BadgeCheck, LoaderCircle } from 'lucide-react'
import type { EstadoCnpj } from '../hooks/usarDadosCnpj'

/* Linha embaixo do campo de CNPJ com o que a Receita diz dele: confirma que o número é o da
   farmácia certa antes de salvar. Fora do ar fica calada, não é erro de quem digitou. */
export default function ResumoCnpj({ estado }:{ estado:EstadoCnpj }) {
  const { status, dados } = estado
  if (status === 'buscando') return <small className="resumo-cnpj"><LoaderCircle className="spin"/>Consultando a Receita Federal...</small>
  if (status === 'nao-encontrado') return <small className="resumo-cnpj resumo-cnpj-alerta"><AlertCircle/>Não achamos este CNPJ na Receita Federal. Confira os números.</small>
  if (status !== 'encontrado' || !dados) return null
  if (!dados.ativa) return <small className="resumo-cnpj resumo-cnpj-alerta"><AlertCircle/>{dados.razaoSocial}: situação {dados.situacao?.toLowerCase() ?? 'desconhecida'} na Receita. Confira se é o CNPJ certo.</small>
  return <small className="resumo-cnpj"><BadgeCheck/>{dados.razaoSocial}{dados.endereco.cidade ? ` · ${dados.endereco.cidade}/${dados.endereco.uf}` : ''}</small>
}
