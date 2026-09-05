import { LinkInterno } from '../roteamento'

/* Dados da empresa que desenvolve o produto. Ficam num lugar só porque aparecem no rodapé
   do site, na entrada do sistema, dentro do painel e na página pública de resposta. */
const EMPRESA = {
  nome: 'AppStarter Pro',
  cnpj: '61.296.087/0001-80',
  site: 'https://wesleyv.online',
}

/* Assinatura curta, para rodapés que já existem e não comportam um bloco inteiro. */
export function AssinaturaEmpresa({ className = '' }: { className?: string }) {
  return <p className={`assinatura-empresa ${className}`.trim()}>
    <span>
      Desenvolvido por <a href={EMPRESA.site} target="_blank" rel="noopener noreferrer">
        <strong>{EMPRESA.nome}</strong></a>
    </span>
    <span>CNPJ {EMPRESA.cnpj}</span>
    <span className="assinatura-empresa-links">
      <LinkInterno to="/privacidade">Privacidade</LinkInterno>
      <LinkInterno to="/termos">Termos</LinkInterno>
      <LinkInterno to="/cookies">Cookies</LinkInterno>
    </span>
  </p>
}

/* Rodapé completo das páginas públicas, na linguagem visual da landing. */
export default function RodapeSite({ mostrarCadastro = true }: { mostrarCadastro?: boolean }) {
  return <footer className="lp-rodape">
    <div className="lp-container lp-rodape-interno">
      <div className="lp-marca">
        <img className="cotapreco-logo" src="/cotapreco-logo.png?v=20260904-2" alt="CotaPreço"/>
      </div>
      <p>Cotação e compra de medicamentos para farmácias.</p>
      <nav aria-label="Links do rodapé">
        <LinkInterno to="/login">Entrar</LinkInterno>
        {mostrarCadastro && <LinkInterno to="/cadastro">Criar conta</LinkInterno>}
      </nav>
    </div>
    <div className="lp-container lp-rodape-empresa">
      <nav className="lp-rodape-legal" aria-label="Documentos">
        <LinkInterno to="/privacidade">Política de Privacidade</LinkInterno>
        <LinkInterno to="/termos">Termos de Uso</LinkInterno>
        <LinkInterno to="/cookies">Política de Cookies</LinkInterno>
      </nav>
      <p>
        CotaPreço é desenvolvido pela <a href={EMPRESA.site} target="_blank" rel="noopener noreferrer">
          <strong>{EMPRESA.nome}</strong></a>, empresa registrada sob o CNPJ {EMPRESA.cnpj}.
      </p>
      <p>© {new Date().getFullYear()} {EMPRESA.nome}. Todos os direitos reservados.</p>
    </div>
  </footer>
}
