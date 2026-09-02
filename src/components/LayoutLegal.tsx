import { ArrowLeft } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import RodapeSite from './RodapeEmpresa'
import { LinkInterno } from '../roteamento'

export interface SecaoLegal { id: string; titulo: string }

/* Data em que os três documentos passaram a valer. Fica junta porque eles se citam:
   se um for revisado sozinho, separe a constante antes de mudar a data. */
export const VIGENCIA = '2 de setembro de 2026'

/* Moldura das páginas de documento (privacidade, termos, cookies). Reaproveita a
   linguagem visual da landing porque quem chega aqui vem do rodapé dela, e o índice
   fica ao lado em telas largas: são textos longos e a pessoa costuma vir atrás de
   uma seção específica, não da leitura inteira. */
export default function LayoutLegal({ titulo, resumo, indice, children }: {
  titulo: string
  resumo: string
  indice: SecaoLegal[]
  children: ReactNode
}) {
  useEffect(() => { document.title = `${titulo} | CotaPreço` }, [titulo])

  return <div className="lp legal">
    <a className="sr-only lp-pular" href="#documento">Pular para o conteúdo</a>

    <header className="lp-topo">
      <div className="lp-container lp-topo-interno">
        <LinkInterno to="/" className="lp-marca">
          <img src="/cotapreco-icon.png" alt="" width={34} height={34}/>
          <span>CotaPreço</span>
        </LinkInterno>
        <nav className="lp-topo-acoes" aria-label="Acesso ao sistema">
          <LinkInterno to="/login" className="lp-link-entrar">Entrar</LinkInterno>
          <LinkInterno to="/cadastro" className="lp-botao lp-botao-primario lp-botao-compacto">Testar grátis</LinkInterno>
        </nav>
      </div>
    </header>

    <main className="legal-main">
      <div className="lp-container">
        <LinkInterno to="/" className="legal-voltar"><ArrowLeft/> Voltar para a página inicial</LinkInterno>
        <header className="legal-cabecalho">
          <h1>{titulo}</h1>
          <p className="legal-resumo">{resumo}</p>
          <p className="legal-vigencia">Em vigor desde {VIGENCIA}</p>
        </header>

        <div className="legal-corpo">
          <nav className="legal-indice" aria-label="Índice do documento">
            <strong>Nesta página</strong>
            <ol>
              {indice.map(secao => <li key={secao.id}><a href={`#${secao.id}`}>{secao.titulo}</a></li>)}
            </ol>
          </nav>
          <article className="legal-texto" id="documento">{children}</article>
        </div>

        <nav className="legal-relacionados" aria-label="Outros documentos">
          <LinkInterno to="/privacidade">Política de Privacidade</LinkInterno>
          <LinkInterno to="/termos">Termos de Uso</LinkInterno>
          <LinkInterno to="/cookies">Política de Cookies</LinkInterno>
        </nav>
      </div>
    </main>

    <RodapeSite/>
  </div>
}

/* Bloco de destaque para o que a pessoa precisa ver mesmo sem ler o documento inteiro. */
export function DestaqueLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return <aside className="legal-destaque">
    <strong>{titulo}</strong>
    <div>{children}</div>
  </aside>
}
