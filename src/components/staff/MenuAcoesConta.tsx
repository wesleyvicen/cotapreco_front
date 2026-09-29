import { MoreHorizontal } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'

const MARGEM = 8

export interface ItemMenuConta { rotulo:string; icone:ReactNode; aoEscolher:()=>void; perigo?:boolean }

/* Menu "⋯" das ações de uma conta na tabela de staff. Posicionado com position: fixed a partir
   do botão, porque a tabela rola na horizontal (.table-wrap) e cortaria um menu absoluto.
   Grupos são separados por uma linha: ajustes comerciais em cima, desativar sozinho embaixo. */
export default function MenuAcoesConta({ rotulo, grupos }:{ rotulo:string; grupos:ItemMenuConta[][] }) {
  /* Abre invisível na altura do botão e só depois de medir o menu de verdade decide o lugar. */
  const [posicao, setPosicao] = useState<{ top:number, right:number, maxHeight?:number, visibility?:'hidden' }|null>(null)
  const botao = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const aberto = posicao !== null

  const fechar = (devolverFoco = true) => { setPosicao(null); if (devolverFoco) botao.current?.focus() }

  const abrir = () => {
    const caixa = botao.current?.getBoundingClientRect()
    if (!caixa) return
    setPosicao({ top: caixa.bottom + 4, right: Math.max(MARGEM, window.innerWidth - caixa.right), visibility: 'hidden' })
  }

  /* Com a altura real: abaixo do botão se couber; senão acima; se não couber em nenhum dos
     dois (tela baixa), encosta no topo e o próprio menu rola. Nunca sai da tela. */
  useLayoutEffect(() => {
    if (posicao?.visibility !== 'hidden' || !menu.current || !botao.current) return
    const caixa = botao.current.getBoundingClientRect()
    const altura = menu.current.offsetHeight
    const tela = window.innerHeight
    const top = caixa.bottom + 4 + altura <= tela - MARGEM ? caixa.bottom + 4
      : caixa.top - 4 - altura >= MARGEM ? caixa.top - 4 - altura
      : MARGEM
    setPosicao({ top, right: posicao.right, maxHeight: tela - top - MARGEM })
  }, [posicao])

  useEffect(() => {
    if (!aberto) return
    menu.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const cliqueFora = (evento:MouseEvent) => {
      if (!menu.current?.contains(evento.target as Node) && !botao.current?.contains(evento.target as Node)) fechar(false)
    }
    /* Rolar ou redimensionar descola o menu do botão: mais simples fechar do que acompanhar. */
    const descolou = () => fechar(false)
    document.addEventListener('mousedown', cliqueFora)
    window.addEventListener('scroll', descolou, true)
    window.addEventListener('resize', descolou)
    return () => {
      document.removeEventListener('mousedown', cliqueFora)
      window.removeEventListener('scroll', descolou, true)
      window.removeEventListener('resize', descolou)
    }
  }, [aberto])

  const teclado = (evento:React.KeyboardEvent) => {
    const itens = Array.from(menu.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])
    const atual = itens.indexOf(document.activeElement as HTMLButtonElement)
    if (evento.key === 'Escape') { evento.preventDefault(); fechar() }
    else if (evento.key === 'ArrowDown') { evento.preventDefault(); itens[(atual + 1) % itens.length]?.focus() }
    else if (evento.key === 'ArrowUp') { evento.preventDefault(); itens[(atual - 1 + itens.length) % itens.length]?.focus() }
    else if (evento.key === 'Tab') fechar(false)
  }

  return <>
    <button ref={botao} type="button" className="icon-button" aria-label={rotulo} title="Mais ações"
      aria-haspopup="menu" aria-expanded={aberto} onClick={() => aberto ? fechar() : abrir()}><MoreHorizontal size={18}/></button>
    {posicao && <div ref={menu} className="staff-menu" role="menu" aria-label={rotulo} style={posicao} onKeyDown={teclado}>
      {grupos.filter(g => g.length > 0).map((grupo, i) => <div key={i} className="staff-menu-grupo" role="group">
        {grupo.map(item => <button key={item.rotulo} type="button" role="menuitem" className={item.perigo ? 'perigo' : undefined}
          onClick={() => { fechar(false); item.aoEscolher() }}>{item.icone}{item.rotulo}</button>)}
      </div>)}
    </div>}
  </>
}
