import { ArrowLeft, ArrowRight, ExternalLink, PlayCircle } from 'lucide-react'
import type { GuiaErp } from '../../lib/guiasErp'

/* O guia é só apresentação: tudo o que muda de um ERP para outro vive em guiasErp.ts, e os
   espaços de imagem, vídeo e link de ajuda já ficam prontos para quando o material existir. */
export default function OnboardingGuiaErp({ guia, aoVoltar, aoContinuar }:{
  guia:GuiaErp; aoVoltar:()=>void; aoContinuar:()=>void
}) {
  return <div>
    <div className="wizard-heading"><span>Passo 2 de 5</span><h2>{guia.titulo}</h2><p>Agora vamos pegar o pedido que você já utiliza na sua farmácia.</p></div>
    <ol className="onboarding-passos">
      {guia.passos.map(passo => <li key={passo.titulo}><strong>{passo.titulo}</strong>{passo.detalhe && <small>{passo.detalhe}</small>}</li>)}
    </ol>
    {guia.imagens.length > 0 && <div className="onboarding-guia-midia">
      {guia.imagens.map(imagem => <img key={imagem.src} src={imagem.src} alt={imagem.alt} loading="lazy"/>)}
    </div>}
    {guia.videoUrl && <a className="button button-ghost onboarding-guia-video" href={guia.videoUrl} target="_blank" rel="noreferrer"><PlayCircle/>Ver em vídeo</a>}
    {guia.helpUrl && <a className="text-link" href={guia.helpUrl} target="_blank" rel="noreferrer">Abrir o passo a passo completo <ExternalLink/></a>}
    <div className="onboarding-actions">
      <button type="button" className="button button-ghost" onClick={aoVoltar}><ArrowLeft/>Voltar</button>
      <button type="button" className="button button-primary" onClick={aoContinuar}>Já tenho minha planilha <ArrowRight/></button>
    </div>
  </div>
}
