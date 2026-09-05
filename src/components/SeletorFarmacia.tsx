import { Check, ChevronsUpDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { empresaAtiva, trocarEmpresaAtiva } from '../lib/permissoes'
import type { Usuario } from '../types'

/* Troca a farmácia ativa. Antes era um <select> "invisível" (appearance:none, sem borda,
   texto de 11px) — dava pra trocar, mas nada na tela sugeria que aquilo era clicável. Aqui
   é um botão de verdade que abre um menu com todas as farmácias do usuário. */
export default function SeletorFarmacia({ user }:{ user:Usuario|null }) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const ativa = empresaAtiva(user)

  useEffect(() => {
    if (!aberto) return
    const fechar = (evento:MouseEvent) => { if (raiz.current && !raiz.current.contains(evento.target as Node)) setAberto(false) }
    const fecharComEsc = (evento:KeyboardEvent) => { if (evento.key === 'Escape') setAberto(false) }
    document.addEventListener('mousedown', fechar)
    document.addEventListener('keydown', fecharComEsc)
    return () => { document.removeEventListener('mousedown', fechar); document.removeEventListener('keydown', fecharComEsc) }
  }, [aberto])

  if (!user || (user.companies.length ?? 0) <= 1) return <span>{ativa?.name}</span>

  return <div className="empresa-switch" ref={raiz}>
    <button type="button" className="empresa-switch-gatilho" aria-haspopup="listbox" aria-expanded={aberto} onClick={() => setAberto(valor => !valor)}>
      <span>{ativa?.name}</span>
      <ChevronsUpDown size={13}/>
    </button>
    {aberto && <div className="empresa-switch-menu" role="listbox">
      <span className="empresa-switch-menu-title">Trocar de farmácia</span>
      {user.companies.map(c => <button type="button" key={c.id} role="option" aria-selected={c.id === ativa?.id}
        className={c.id === ativa?.id ? 'ativa' : ''} onClick={() => { setAberto(false); if (c.id !== ativa?.id) trocarEmpresaAtiva(c.id) }}>
        <span>{c.name}</span>
        {c.id === ativa?.id && <Check size={14}/>}
      </button>)}
    </div>}
  </div>
}
