import { ArrowLeft, LoaderCircle, UploadCloud } from 'lucide-react'
import { useState, type DragEvent } from 'react'

export default function OnboardingImportacao({ aoSelecionar, aoVoltar, ocupado }:{
  aoSelecionar:(arquivo:File)=>void; aoVoltar:()=>void; ocupado:boolean
}) {
  const [arrastando, setArrastando] = useState(false)
  const soltar = (evento:DragEvent<HTMLLabelElement>) => {
    evento.preventDefault(); setArrastando(false)
    const arquivo = evento.dataTransfer.files?.[0]
    if (arquivo && !ocupado) aoSelecionar(arquivo)
  }
  return <div>
    <div className="wizard-heading"><span>Passo 3 de 5</span><h2>Importe seu pedido</h2><p>Arraste aqui a planilha exportada do seu sistema.</p></div>
    <label className={`dropzone onboarding-dropzone ${arrastando ? 'dragging' : ''} ${ocupado ? 'disabled' : ''}`}
      onDragOver={evento => { evento.preventDefault(); if (!ocupado) setArrastando(true) }}
      onDragLeave={() => setArrastando(false)} onDrop={soltar}>
      {ocupado ? <LoaderCircle className="spin"/> : <UploadCloud/>}
      <strong>{ocupado ? 'Estamos lendo seu pedido...' : 'Arraste sua planilha aqui'}</strong>
      <span>{ocupado ? 'Isso leva só alguns segundos.' : 'Ou clique para selecionar o arquivo no computador.'}</span>
      <input type="file" accept=".csv,.xlsx" disabled={ocupado}
        onChange={evento => { const arquivo = evento.target.files?.[0]; if (arquivo) aoSelecionar(arquivo); evento.currentTarget.value = '' }}/>
      {!ocupado && <span className="button button-secondary onboarding-dropzone-botao">Selecionar arquivo</span>}
    </label>
    <p className="onboarding-tranquilizador">Não precisa modificar sua planilha. O CotaPreço organiza os produtos para você.</p>
    <div className="onboarding-actions">
      <button type="button" className="button button-ghost" disabled={ocupado} onClick={aoVoltar}><ArrowLeft/>Voltar</button>
      <span/>
    </div>
  </div>
}
