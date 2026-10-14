import { LoaderCircle, PlugZap } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ErroApi } from '../api'
import { LinkInterno } from '../roteamento'
import type { IntegracaoMercadoFarma, ResultadoImportacaoMercadoFarma, SituacaoImportacaoMercadoFarma } from '../types'

/* Toda proposta importada leva este prefixo no nome da distribuidora (ver
   ImportacaoPropostasMercadoFarmaService.PREFIXO_DISTRIBUIDORA no backend). */
export const PREFIXO_MERCADO_FARMA = 'Mercado Farma · '

const INTERVALO_CONSULTA_MS = 3000
/* Desfecho que este aparelho já mostrou, por cotação: abrir a tela de novo (ou em outro
   aparelho, que tem o próprio registro) não repete o aviso nem o modal de vínculos. */
const chaveVisto = (cotacaoId:number) => `cotapreco_mf_importacao_${cotacaoId}`

/* Busca os preços do Mercado Farma e grava na cotação como propostas, uma por distribuidor.
   O portal limita as consultas, então o catálogo da loja baixa em segundo plano no servidor e
   leva alguns minutos na primeira vez. Enquanto isso o botão vira uma barra de progresso, que
   qualquer aparelho vê ao abrir a cotação; quando termina, o próprio servidor importa, com a
   tela aberta ou não. Com a conexão expirada, leva para a tela de conexão. jaImportado troca
   o texto para "Reimportar": importar de novo atualiza as mesmas propostas, não cria outras. */
export default function BotaoImportarMercadoFarma({ cotacaoId, desabilitado, jaImportado, aoImportar, aoErro }:{
  cotacaoId:number; desabilitado:boolean; jaImportado:boolean
  aoImportar:(resultado:ResultadoImportacaoMercadoFarma)=>void; aoErro:(mensagem:string)=>void
}) {
  const [integracao, setIntegracao] = useState<IntegracaoMercadoFarma|null>(null)
  const [situacao, setSituacao] = useState<SituacaoImportacaoMercadoFarma|null>(null)
  const [enviando, setEnviando] = useState(false)
  /* Callbacks da página chegam recriados a cada render; em ref, não reiniciam a consulta. */
  const avisos = useRef({ aoImportar, aoErro })
  avisos.current = { aoImportar, aoErro }

  useEffect(() => { api<IntegracaoMercadoFarma>('/integracoes/mercado-farma').then(setIntegracao).catch(() => setIntegracao(null)) }, [])

  /* Mostra o desfecho uma vez por aparelho: resultado (recarrega as respostas e abre os
     vínculos sugeridos) ou o motivo da falha. */
  const tratar = useCallback((atual:SituacaoImportacaoMercadoFarma) => {
    setSituacao(atual)
    if ((atual.estado !== 'CONCLUIDA' && atual.estado !== 'FALHOU') || !atual.atualizadoEm) return
    try {
      if (localStorage.getItem(chaveVisto(cotacaoId)) === atual.atualizadoEm) return
      localStorage.setItem(chaveVisto(cotacaoId), atual.atualizadoEm)
    } catch { /* Sem localStorage o aviso pode repetir; não impede nada. */ }
    if (atual.estado === 'CONCLUIDA' && atual.resultado) avisos.current.aoImportar(atual.resultado)
    if (atual.estado === 'FALHOU' && atual.erro) {
      avisos.current.aoErro(atual.erro)
      api<IntegracaoMercadoFarma>('/integracoes/mercado-farma').then(setIntegracao).catch(() => {})
    }
  }, [cotacaoId])

  const conectado = Boolean(integracao?.disponivel && integracao.status === 'CONECTADA')
  const emAndamento = situacao?.estado === 'BAIXANDO_CATALOGO' || situacao?.estado === 'IMPORTANDO'

  /* Ao abrir a cotação, retoma o que estiver acontecendo (inclusive vindo de outro aparelho);
     durante o download, consulta de novo a cada poucos segundos. */
  useEffect(() => {
    if (!conectado) return
    let ativo = true
    const consultar = () => api<SituacaoImportacaoMercadoFarma>(`/quotations/${cotacaoId}/mercado-farma/import`)
      .then(atual => { if (ativo) tratar(atual) }).catch(() => {})
    if (situacao === null) { void consultar(); return () => { ativo = false } }
    if (!emAndamento) return () => { ativo = false }
    const relogio = setInterval(() => void consultar(), INTERVALO_CONSULTA_MS)
    return () => { ativo = false; clearInterval(relogio) }
  }, [conectado, cotacaoId, emAndamento, situacao, tratar])

  /* Só aparece para quem configurou a integração: quem nunca conectou não vê nada aqui. */
  if (!integracao?.disponivel || integracao.status == null) return null
  if (integracao.status === 'EXPIRADA')
    return <LinkInterno to="/dados-farmacia?aba=integracoes" className="button button-ghost" title="A conexão com o Mercado Farma expirou">
      <PlugZap/>Reconectar Mercado Farma</LinkInterno>

  const importar = async () => {
    setEnviando(true)
    try {
      tratar(await api<SituacaoImportacaoMercadoFarma>(`/quotations/${cotacaoId}/mercado-farma/import`, { method:'POST' }))
    } catch (e) {
      aoErro(e instanceof ErroApi ? e.message : 'Não foi possível importar os preços do Mercado Farma.')
      /* Se o portal recusou o acesso, o botão vira "Reconectar" sem precisar recarregar a tela. */
      api<IntegracaoMercadoFarma>('/integracoes/mercado-farma').then(setIntegracao).catch(() => {})
    } finally { setEnviando(false) }
  }

  if (emAndamento && situacao) {
    const baixando = situacao.estado === 'BAIXANDO_CATALOGO'
    return <div className="mf-progresso" role="status" aria-live="polite"
      title="Pode fechar esta tela ou abrir em outro aparelho: a importação continua no servidor.">
      <span><LoaderCircle className="spin"/>{baixando ? `Mercado Farma · ${situacao.progresso}%` : 'Gravando preços...'}</span>
      <span className="mf-progresso-trilho" aria-hidden="true"><span style={{ width:`${baixando ? Math.max(3, situacao.progresso) : 100}%` }}/></span>
      <span className="sr-only">Baixando o catálogo do Mercado Farma. Pode fechar esta tela: a importação continua sozinha.</span>
    </div>
  }

  return <button type="button" className="button button-secondary" disabled={desabilitado || enviando} onClick={() => void importar()}
    title={jaImportado
      ? 'Atualiza preço e estoque das propostas do Mercado Farma nesta cotação, sem duplicar'
      : 'Busca preço e estoque no Mercado Farma e grava uma proposta por distribuidor'}>
    {enviando
      ? <><LoaderCircle className="spin"/>{jaImportado ? 'Atualizando preços...' : 'Buscando preços...'}</>
      : <><PlugZap/>{jaImportado ? 'Reimportar do Mercado Farma' : 'Importar do Mercado Farma'}</>}
  </button>
}
