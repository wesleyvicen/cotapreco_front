import { Check, ChevronDown, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Empresa } from '../types'

/* Multi-seleção de farmácias para o cadastro de usuário. É um botão que abre um popover com
   busca, em vez de uma lista de checkboxes sempre aberta no formulário — assim o modal não
   cresce conforme o grupo tem mais farmácias. */
export default function SeletorFarmacias({ empresas, selecionadas, aoAlterar }:{ empresas:Empresa[]; selecionadas:number[]; aoAlterar:(ids:number[])=>void }) {
  const [aberto, setAberto] = useState(false)
  const [busca, setBusca] = useState('')
  const raiz = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!aberto) return
    const fechar = (evento:MouseEvent) => { if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false) }
    const fecharComEsc = (evento:KeyboardEvent) => { if (evento.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fechar)
    document.addEventListener('keydown', fecharComEsc)
    return () => { document.removeEventListener('mousedown', fechar); document.removeEventListener('keydown', fecharComEsc) }
  }, [aberto])

  useEffect(() => { if (!aberto) setBusca('') }, [aberto])

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return termo ? empresas.filter(e => e.nome.toLowerCase().includes(termo)) : empresas
  }, [empresas, busca])

  const alternar = (id:number) => aoAlterar(selecionadas.includes(id) ? selecionadas.filter(i => i !== id) : [...selecionadas, id])

  const rotulo = selecionadas.length === 0 ? 'Selecione as farmácias'
    : selecionadas.length === 1 ? empresas.find(e => e.id === selecionadas[0])?.nome ?? '1 farmácia selecionada'
    : `${selecionadas.length} farmácias selecionadas`

  return <div className="farmacia-multi-select" ref={raiz}>
    <button type="button" className="farmacia-multi-gatilho" aria-haspopup="listbox" aria-expanded={aberto} onClick={() => setAberto(valor => !valor)}>
      <span className={selecionadas.length === 0 ? 'placeholder' : ''}>{rotulo}</span>
      <ChevronDown size={15}/>
    </button>
    {aberto && <div className="farmacia-multi-menu" role="listbox">
      {empresas.length > 5 && <label className="farmacia-multi-busca">
        <Search size={14}/>
        <input autoFocus placeholder="Buscar farmácia" value={busca} onChange={e => setBusca(e.target.value)}/>
      </label>}
      <div className="farmacia-multi-lista">
        {filtradas.length === 0
          ? <p className="farmacia-multi-vazio">Nenhuma farmácia encontrada.</p>
          : filtradas.map(e => <button type="button" key={e.id} role="option" aria-selected={selecionadas.includes(e.id)} onClick={() => alternar(e.id)}>
              <span className={`farmacia-multi-check ${selecionadas.includes(e.id) ? 'marcado' : ''}`}>{selecionadas.includes(e.id) && <Check size={12}/>}</span>
              <span>{e.nome}</span>
            </button>)}
      </div>
      <div className="farmacia-multi-rodape">
        <button type="button" onClick={() => aoAlterar(empresas.map(e => e.id))}>Selecionar todas</button>
        <button type="button" onClick={() => aoAlterar([])}>Limpar seleção</button>
      </div>
    </div>}
  </div>
}
