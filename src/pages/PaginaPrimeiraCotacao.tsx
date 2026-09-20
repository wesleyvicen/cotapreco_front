import { Check, Lock } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { api, ErroApi } from '../api'
import { usarAutenticacao } from '../autenticacao'
import { AvisoErro, Carregando } from '../components/ComponentesUI'
import OnboardingBoasVindas from '../components/onboarding/OnboardingBoasVindas'
import OnboardingComoFunciona from '../components/onboarding/OnboardingComoFunciona'
import OnboardingCriacao from '../components/onboarding/OnboardingCriacao'
import OnboardingEscolhaErp from '../components/onboarding/OnboardingEscolhaErp'
import OnboardingGuiaErp from '../components/onboarding/OnboardingGuiaErp'
import OnboardingImportacao from '../components/onboarding/OnboardingImportacao'
import OnboardingMapeamento from '../components/onboarding/OnboardingMapeamento'
import OnboardingOrigemPedido from '../components/onboarding/OnboardingOrigemPedido'
import OnboardingPrevia from '../components/onboarding/OnboardingPrevia'
import OnboardingSucesso from '../components/onboarding/OnboardingSucesso'
import { usarOnboarding } from '../hooks/usarOnboarding'
import { acessoBloqueado } from '../lib/assinatura'
import { guiaDoErp } from '../lib/guiasErp'
import { nomeSugeridoPrimeiraCotacao, prazoSugerido } from '../lib/sugestoesCotacao'
import { LinkInterno, usarNavegacao } from '../roteamento'
import type {
  AnaliseArquivoImportacao, Cotacao, EtapaOnboarding, MapeamentoColunas, PreviaImportacao, SistemaErp,
} from '../types'

type Passo = 'boas-vindas'|'erp'|'guia'|'origem'|'importar'|'mapeamento'|'previa'|'como-funciona'|'criacao'|'sucesso'
type CampoMapeamento = keyof MapeamentoColunas

const MARCOS = ['Sistema da farmácia', 'Importar pedido', 'Conferir produtos', 'Criar cotação', 'Compartilhar']
/* Em que marco do topo cada passo está. O indicador mostra cinco etapas; o fluxo tem mais
   telas do que isso porque algumas só aparecem às vezes (mapeamento, demonstração). */
const MARCO_DO_PASSO:Record<Passo, number> = {
  'boas-vindas':0, erp:1, guia:1, origem:2, importar:2, mapeamento:2, previa:3,
  'como-funciona':4, criacao:4, sucesso:5,
}
/* De onde retomar quando a pessoa recarrega a página. O arquivo em si não sobrevive a um
   recarregamento, então quem parou na importação ou na conferência volta para a importação. */
const PASSO_DA_ETAPA:Record<EtapaOnboarding, Passo> = {
  WELCOME:'boas-vindas', ERP_SELECTION:'erp', EXPORT_GUIDE:'guia', IMPORT:'origem',
  REVIEW:'origem', QUOTATION_CREATED:'origem', SHARED:'origem',
}
const ETAPA_DO_PASSO:Partial<Record<Passo, EtapaOnboarding>> = {
  'boas-vindas':'WELCOME', erp:'ERP_SELECTION', guia:'EXPORT_GUIDE', origem:'IMPORT',
  importar:'IMPORT', mapeamento:'IMPORT', previa:'REVIEW', 'como-funciona':'REVIEW', criacao:'REVIEW',
}

export default function PaginaPrimeiraCotacao() {
  const navegar = usarNavegacao()
  const { user } = usarAutenticacao()
  const { data:onboarding, carregando, erro:erroOnboarding, atualizar } = usarOnboarding(user)

  const [passo, setPasso] = useState<Passo>('boas-vindas')
  const [retomado, setRetomado] = useState(false)
  const [erp, setErp] = useState<SistemaErp|null>(null)
  const [arquivo, setArquivo] = useState<File|null>(null)
  const [analise, setAnalise] = useState<AnaliseArquivoImportacao|null>(null)
  const [mapeamento, setMapeamento] = useState<MapeamentoColunas>({ ean:null, productName:null, quantity:null, laboratory:null })
  const [camposEmDuvida, setCamposEmDuvida] = useState<CampoMapeamento[]>([])
  const [previa, setPrevia] = useState<PreviaImportacao|null>(null)
  const [nome, setNome] = useState(nomeSugeridoPrimeiraCotacao)
  const [prazo, setPrazo] = useState(prazoSugerido)
  const [cotacao, setCotacao] = useState<Cotacao|null>(null)
  const [erro, setErro] = useState('')
  const [ocupado, setOcupado] = useState(false)

  /* Retomar acontece uma vez só: depois disso quem manda na tela é a navegação da pessoa,
     não o que o servidor sabia quando a página abriu. */
  useEffect(() => {
    if (retomado || !onboarding) return
    setRetomado(true)
    if (onboarding.erp) setErp(onboarding.erp)
    if (onboarding.status === 'COMPLETED') { navegar('/', { replace:true }); return }
    if (onboarding.currentStep) setPasso(PASSO_DA_ETAPA[onboarding.currentStep])
  }, [onboarding, retomado, navegar])

  const salvar = async (mudanca:{ status?:'IN_PROGRESS'|'COMPLETED'|'SKIPPED'; erp?:SistemaErp; currentStep?:EtapaOnboarding }) => {
    try { await atualizar(mudanca) } catch { /* O fluxo continua mesmo se o progresso não gravar agora. */ }
  }
  const irPara = (proximo:Passo) => {
    setErro(''); setPasso(proximo)
    const etapa = ETAPA_DO_PASSO[proximo]
    if (etapa) void salvar({ currentStep:etapa })
  }

  const pular = async () => { await salvar({ status:'SKIPPED' }); navegar('/') }

  const escolherErp = async (escolhido:SistemaErp) => {
    setErp(escolhido); setErro('')
    setPasso('guia')
    await salvar({ erp:escolhido, currentStep:'EXPORT_GUIDE' })
  }

  const analisarArquivo = async (selecionado:File) => {
    setErro(''); setOcupado(true); setArquivo(selecionado); setAnalise(null); setPrevia(null)
    const corpo = new FormData(); corpo.append('file', selecionado)
    try {
      const resultado = await api<AnaliseArquivoImportacao>('/quotations/import/analyze', { method:'POST', body:corpo })
      setAnalise(resultado); setMapeamento(resultado.suggestedMapping)
      /* Reconheceu o que precisava? Então não pergunta nada: segue direto para a conferência. */
      const duvidas = (['productName', 'quantity', 'ean'] as CampoMapeamento[]).filter(campo => resultado.suggestedMapping[campo] === null)
      const faltaObrigatorio = resultado.suggestedMapping.productName === null || resultado.suggestedMapping.quantity === null
      if (!faltaObrigatorio) { await gerarPrevia(selecionado, resultado.suggestedMapping); return }
      setCamposEmDuvida(duvidas); setPasso('mapeamento')
    } catch (e) {
      setArquivo(null)
      setErro(e instanceof ErroApi ? e.message : 'Não conseguimos ler essa planilha. Tente exportar de novo pelo seu sistema.')
    } finally { setOcupado(false) }
  }

  const gerarPrevia = async (arquivoParaLer:File, mapeamentoEscolhido:MapeamentoColunas) => {
    setErro(''); setOcupado(true)
    const corpo = new FormData(); corpo.append('file', arquivoParaLer)
    corpo.append('mapping', new Blob([JSON.stringify(mapeamentoEscolhido)], { type:'application/json' }), 'mapping.json')
    try {
      const resultado = await api<PreviaImportacao>('/quotations/import/preview', { method:'POST', body:corpo })
      setPrevia(resultado); setPasso('previa'); void salvar({ currentStep:'REVIEW' })
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não conseguimos organizar os produtos dessa planilha.') }
    finally { setOcupado(false) }
  }

  const criar = async () => {
    if (!previa) return
    setOcupado(true); setErro('')
    try {
      const rascunho = await api<Cotacao>('/quotations', { method:'POST', body:JSON.stringify({
        name:nome, expiresAt:prazo ? new Date(prazo).toISOString() : null,
        items:previa.lines.filter(linha => linha.valid).map(linha => ({
          ean:linha.ean, productName:linha.productName, quantity:linha.quantity, laboratory:linha.laboratory,
        })),
      }) })
      const aberta = await api<Cotacao>(`/quotations/${rascunho.id}/open`, { method:'POST' })
      setCotacao(aberta); setPasso('sucesso'); void salvar({ currentStep:'QUOTATION_CREATED' })
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível criar a cotação.') }
    finally { setOcupado(false) }
  }

  /* A demonstração usa o endpoint de cotação de exemplo: é uma cotação real, marcada como
     demo, então ela aparece na lista com o selo e fica fora dos indicadores. */
  const criarDemonstracao = async () => {
    setOcupado(true); setErro('')
    try {
      const demo = await api<Cotacao>('/quotations/demo', { method:'POST' })
      setCotacao(demo); setPasso('sucesso'); void salvar({ currentStep:'QUOTATION_CREATED' })
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível criar a cotação de demonstração.') }
    finally { setOcupado(false) }
  }

  const concluir = async () => {
    await salvar({ status:'COMPLETED', currentStep:'SHARED' })
    navegar(cotacao ? `/cotacoes/${cotacao.id}` : '/')
  }

  const guia = useMemo(() => guiaDoErp(erp), [erp])
  const marcoAtual = MARCO_DO_PASSO[passo]

  if (carregando && !onboarding) return <div className="page narrow"><Carregando/></div>

  return <div className="page narrow onboarding-page">
    <div className="page-header"><div>
      <span className="eyebrow green">Primeiros passos</span>
      <h1>Vamos criar sua primeira cotação</h1>
      <p>Acompanhamos você do pedido até o link pronto para enviar.</p>
    </div>
    {passo !== 'sucesso' && <button type="button" className="button button-ghost" onClick={() => void pular()}>Explorar sozinho</button>}
    </div>

    {passo !== 'boas-vindas' && <div className="stepper onboarding-stepper">{MARCOS.map((rotulo, indice) => {
      const numero = indice + 1
      return <div key={rotulo} className={`step ${marcoAtual === numero ? 'active' : ''} ${marcoAtual > numero ? 'done' : ''}`}>
        <span>{marcoAtual > numero ? <Check size={16}/> : numero}</span><label>{rotulo}</label>
      </div>
    })}</div>}

    {erroOnboarding && !onboarding && <AvisoErro message={erroOnboarding}/>}
    {erro && <AvisoErro message={erro}/>}

    <section className="card wizard-card onboarding-card">
      {passo === 'boas-vindas' && <OnboardingBoasVindas ocupado={ocupado}
        aoComecar={() => { void salvar({ status:'IN_PROGRESS', currentStep:'ERP_SELECTION' }); setPasso('erp') }}
        aoPular={() => void pular()}/>}

      {passo === 'erp' && <OnboardingEscolhaErp selecionado={erp} ocupado={ocupado} aoEscolher={erp => void escolherErp(erp)}/>}

      {passo === 'guia' && <OnboardingGuiaErp guia={guia} aoVoltar={() => irPara('erp')} aoContinuar={() => irPara('origem')}/>}

      {passo === 'origem' && <OnboardingOrigemPedido ocupado={ocupado} aoVoltar={() => irPara('guia')}
        aoImportar={() => irPara('importar')} aoUsarExemplo={() => void criarDemonstracao()}/>}

      {passo === 'importar' && (bloqueioAssinatura(user?.accessAllowed) ?? <OnboardingImportacao ocupado={ocupado}
        aoVoltar={() => irPara('origem')} aoSelecionar={selecionado => void analisarArquivo(selecionado)}/>)}

      {passo === 'mapeamento' && analise && <OnboardingMapeamento analise={analise} campos={camposEmDuvida} mapeamento={mapeamento}
        ocupado={ocupado} aoAlterar={(campo, indice) => setMapeamento(atual => ({ ...atual, [campo]:indice }))}
        aoVoltar={() => { setAnalise(null); setArquivo(null); irPara('importar') }}
        aoContinuar={() => { if (arquivo) void gerarPrevia(arquivo, mapeamento) }}/>}

      {passo === 'previa' && previa && <OnboardingPrevia previa={previa} ocupado={ocupado}
        aoVoltar={() => { setAnalise(null); setArquivo(null); setPrevia(null); irPara('importar') }}
        aoCorrigir={() => navegar('/cotacoes/nova')} aoContinuar={() => irPara('como-funciona')}/>}

      {passo === 'como-funciona' && <OnboardingComoFunciona aoContinuar={() => irPara('criacao')}/>}

      {passo === 'criacao' && previa && (bloqueioAssinatura(user?.accessAllowed)
        ?? <OnboardingCriacao nome={nome} setNome={setNome} prazo={prazo} setPrazo={setPrazo}
          totalProdutos={previa.validRows} ocupado={ocupado} aoVoltar={() => irPara('como-funciona')} aoCriar={() => void criar()}/>)}

      {passo === 'sucesso' && cotacao && <OnboardingSucesso cotacao={cotacao}
        aoCompartilhar={() => void salvar({ currentStep:'SHARED' })} aoAbrirCotacao={() => void concluir()}/>}
    </section>
  </div>
}

function bloqueioAssinatura(acessoLiberado:boolean|undefined) {
  if (!acessoBloqueado(acessoLiberado)) return null
  return <div className="onboarding-bloqueio">
    <div className="assinatura-bloqueio-icone"><Lock/></div>
    <h2>Seu período de teste terminou</h2>
    <p>Assine para criar cotações. Tudo o que você já tem continua aqui.</p>
    <div className="onboarding-actions centered"><LinkInterno className="button button-primary" to="/assinatura">Ver planos e assinar</LinkInterno></div>
  </div>
}
