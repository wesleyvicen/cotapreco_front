import { LoaderCircle, PlugZap } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, ErroApi } from '../api'
import { LinkInterno } from '../roteamento'
import type { IntegracaoMercadoFarma, ResultadoImportacaoMercadoFarma } from '../types'

/* Busca os preços do Mercado Farma e grava na cotação como propostas, uma por distribuidor.
   Com a conexão expirada, leva para a tela de conexão em vez de mostrar um botão que só falharia.
   A primeira importação baixa o catálogo inteiro do portal e pode levar uns 20 segundos. */
export default function BotaoImportarMercadoFarma({ cotacaoId, desabilitado, aoImportar, aoErro }:{
  cotacaoId:number; desabilitado:boolean
  aoImportar:(resultado:ResultadoImportacaoMercadoFarma)=>void; aoErro:(mensagem:string)=>void
}) {
  const [integracao, setIntegracao] = useState<IntegracaoMercadoFarma|null>(null)
  const [importando, setImportando] = useState(false)

  useEffect(() => { api<IntegracaoMercadoFarma>('/integracoes/mercado-farma').then(setIntegracao).catch(() => setIntegracao(null)) }, [])

  /* Só aparece para quem configurou a integração: quem nunca conectou não vê nada aqui. */
  if (!integracao?.disponivel || integracao.status == null) return null
  if (integracao.status === 'EXPIRADA')
    return <LinkInterno to="/dados-farmacia?aba=integracoes" className="button button-ghost" title="A conexão com o Mercado Farma expirou">
      <PlugZap/>Reconectar Mercado Farma</LinkInterno>

  const importar = async () => {
    setImportando(true)
    try {
      aoImportar(await api<ResultadoImportacaoMercadoFarma>(`/quotations/${cotacaoId}/mercado-farma/import`, { method:'POST' }))
    } catch (e) {
      aoErro(e instanceof ErroApi ? e.message : 'Não foi possível importar os preços do Mercado Farma.')
      /* Se o portal recusou o acesso, o botão vira "Reconectar" sem precisar recarregar a tela. */
      api<IntegracaoMercadoFarma>('/integracoes/mercado-farma').then(setIntegracao).catch(() => {})
    } finally { setImportando(false) }
  }

  return <button type="button" className="button button-secondary" disabled={desabilitado || importando} onClick={() => void importar()}
    title="Busca preço e estoque no Mercado Farma e grava uma proposta por distribuidor">
    {importando ? <><LoaderCircle className="spin"/>Buscando preços...</> : <><PlugZap/>Importar do Mercado Farma</>}
  </button>
}
