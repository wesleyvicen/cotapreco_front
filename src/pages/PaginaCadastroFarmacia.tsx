import { AlertCircle, ArrowRight, BadgeCheck, Check, Clock3, Eye, EyeOff, Link2, ShieldCheck } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'
import { ErroApi } from '../api'
import { usarAutenticacao } from '../autenticacao'
import { IndicadorForcaSenha } from '../components/IndicadorForcaSenha'
import RodapeSite from '../components/RodapeEmpresa'
import { LinkInterno, Redirecionar, usarNavegacao } from '../roteamento'

type CampoCadastro = 'nomeUsuario' | 'nomeFarmacia' | 'cnpj' | 'email' | 'senha' | 'confirmacao'

/* A conferência fica calada enquanto o que foi digitado ainda é começo da senha: acusar
   "não conferem" a cada tecla treina a pessoa a ignorar o aviso. Ela fala no instante em
   que as duas divergem — que é onde está o erro de digitação — e confirma quando batem. */
type EstadoConferencia = 'vazio' | 'digitando' | 'confere' | 'diverge'
const conferirSenhas = (senha:string, confirmacao:string):EstadoConferencia => {
  if (!confirmacao) return 'vazio'
  if (senha === confirmacao) return 'confere'
  return senha.startsWith(confirmacao) ? 'digitando' : 'diverge'
}

const PROVAS = [
  { icone: <ShieldCheck/>, titulo: 'Sem cartão de crédito', texto: 'Não pedimos cartão para começar e não há cobrança automática quando os 7 dias terminam.' },
  { icone: <Clock3/>, titulo: 'Pronto para usar em minutos', texto: 'Funciona no navegador, no computador e no celular. Nada para instalar na loja.' },
  { icone: <Link2/>, titulo: 'A distribuidora responde por link', texto: 'Ela abre o link e preenche os preços. Sem contrato e sem mensalidade para ela.' },
]

export default function PaginaCadastroFarmacia() {
  const { user, cadastrarFarmacia } = usarAutenticacao()
  const navegar = usarNavegacao()
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [nomeFarmacia, setNomeFarmacia] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmacao, setConfirmacao] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [erro, setErro] = useState('')
  const [errosCampos, setErrosCampos] = useState<Partial<Record<CampoCadastro, string>>>({})
  const [ocupado, setOcupado] = useState(false)
  const formulario = useRef<HTMLFormElement>(null)

  if (user) return <Redirecionar to="/" replace/>

  /* O erro do campo some assim que a pessoa mexe nele: manter o aviso embaixo de um valor
     que já mudou faz duvidar do que está errado. */
  const limparErroCampo = (campo:CampoCadastro) => setErrosCampos(atuais => {
    if (!atuais[campo]) return atuais
    const proximos = { ...atuais }; delete proximos[campo]; return proximos
  })

  const cadastrar = async (evento:FormEvent) => {
    evento.preventDefault(); setErro(''); setErrosCampos({})
    if (senha !== confirmacao) {
      setErrosCampos({ confirmacao:'As senhas não conferem. Confira as duas usando o olho ao lado.' })
      formulario.current?.querySelector<HTMLInputElement>('[name="confirmacao"]')?.focus()
      return
    }
    setOcupado(true)
    try {
      await cadastrarFarmacia({ nomeUsuario, nomeFarmacia, cnpj:cnpj.replace(/\D/g, ''), email, senha })
      navegar('/')
    } catch (e) {
      if (e instanceof ErroApi && Object.keys(e.fields).length) {
        setErrosCampos(e.fields)
        /* Num formulário de tela cheia o campo recusado pode estar fora da vista; sem levar o
           foco até ele, o erro geral no topo parece não ter causa. */
        const primeiro = Object.keys(e.fields)[0]
        formulario.current?.querySelector<HTMLInputElement>(`[name="${primeiro}"]`)?.focus()
      }
      setErro(e instanceof ErroApi ? e.message : 'Não foi possível criar a conta.')
    } finally { setOcupado(false) }
  }

  const campo = (nome:CampoCadastro) => ({
    name:nome, 'aria-invalid':Boolean(errosCampos[nome]) || undefined,
    'aria-describedby':errosCampos[nome] ? `erro-${nome}` : undefined,
  })
  const conferencia = conferirSenhas(senha, confirmacao)
  const avisoCampo = (nome:CampoCadastro) => errosCampos[nome]
    ? <small className="cad-erro-campo" id={`erro-${nome}`}>{errosCampos[nome]}</small>
    : null

  return <div className="lp cad">
    <header className="lp-topo">
      <div className="lp-container lp-topo-interno">
        <LinkInterno to="/" className="lp-marca"><img src="/cotapreco-icon.png" alt="" width={34} height={34}/><span>CotaPreço</span></LinkInterno>
        <nav className="lp-topo-acoes" aria-label="Acesso ao sistema"><LinkInterno to="/login" className="lp-link-entrar">Entrar</LinkInterno></nav>
      </div>
    </header>

    <main className="cad-main">
      <div className="lp-container cad-grid">
        <div className="cad-apresentacao">
          <p className="lp-selo"><BadgeCheck/> 7 dias grátis · sem cartão de crédito</p>
          <h1>Crie a conta da sua farmácia</h1>
          <p className="cad-subtitulo">O sistema inteiro liberado por 7 dias: cotações, comparativo de preços, plano de compra, histórico e exportação em Excel.</p>
        </div>

        <div className="cad-formulario">
          <form className="cad-card" ref={formulario} onSubmit={cadastrar}>
            {erro && <div className="alert alert-error" role="alert">{erro}</div>}

            <label className="cad-campo">Seu nome
              <input {...campo('nomeUsuario')} value={nomeUsuario} required maxLength={120} autoComplete="name" autoCapitalize="words"
                placeholder="Como podemos te chamar" onChange={evento => { setNomeUsuario(evento.target.value); limparErroCampo('nomeUsuario') }}/>
              {avisoCampo('nomeUsuario')}
            </label>

            <label className="cad-campo">Nome da farmácia
              <input {...campo('nomeFarmacia')} value={nomeFarmacia} required maxLength={160} autoComplete="organization" autoCapitalize="words"
                placeholder="Como aparece para a distribuidora" onChange={evento => { setNomeFarmacia(evento.target.value); limparErroCampo('nomeFarmacia') }}/>
              {avisoCampo('nomeFarmacia')}
            </label>

            <label className="cad-campo">CNPJ
              <input {...campo('cnpj')} value={cnpj} required maxLength={18} inputMode="numeric" autoComplete="off"
                placeholder="00.000.000/0000-00" onChange={evento => { setCnpj(formatarCnpj(evento.target.value)); limparErroCampo('cnpj') }}/>
              {avisoCampo('cnpj')}
            </label>

            <label className="cad-campo">E-mail
              <input {...campo('email')} value={email} required type="email" maxLength={180} autoComplete="email" autoCapitalize="none" spellCheck={false}
                placeholder="voce@suafarmacia.com.br" onChange={evento => { setEmail(evento.target.value); limparErroCampo('email') }}/>
              <small className="cad-dica">É para onde vai o link de confirmação e o acesso à conta.</small>
              {avisoCampo('email')}
            </label>

            <label className="cad-campo">Senha
              <span className="cad-senha">
                <input {...campo('senha')} value={senha} required minLength={8} maxLength={72} type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="No mínimo 8 caracteres" onChange={evento => { setSenha(evento.target.value); limparErroCampo('senha') }}/>
                <button type="button" onClick={() => setMostrarSenha(valor => !valor)}
                  aria-label={mostrarSenha ? 'Ocultar as senhas' : 'Mostrar as senhas'}>{mostrarSenha ? <EyeOff/> : <Eye/>}</button>
              </span>
              <IndicadorForcaSenha senha={senha}/>
              {avisoCampo('senha')}
            </label>

            <label className="cad-campo">Repita a senha
              <span className="cad-senha">
                <input {...campo('confirmacao')} value={confirmacao} required maxLength={72} type={mostrarSenha ? 'text' : 'password'} autoComplete="new-password"
                  placeholder="A mesma senha de novo" onChange={evento => { setConfirmacao(evento.target.value); limparErroCampo('confirmacao') }}/>
                <button type="button" onClick={() => setMostrarSenha(valor => !valor)}
                  aria-label={mostrarSenha ? 'Ocultar as senhas' : 'Mostrar as senhas'}>{mostrarSenha ? <EyeOff/> : <Eye/>}</button>
              </span>
              <span className="cad-conferencia" aria-live="polite">
                {conferencia === 'confere' && <span className="confere"><Check/> As senhas conferem</span>}
                {conferencia === 'diverge' && <span className="diverge"><AlertCircle/> As senhas não conferem</span>}
              </span>
              {avisoCampo('confirmacao')}
            </label>

            <button className="lp-botao lp-botao-primario cad-enviar" disabled={ocupado}>
              {ocupado ? 'Criando sua conta...' : <>Começar teste grátis <ArrowRight/></>}
            </button>
            <p className="cad-garantia"><ShieldCheck/> Sem cartão de crédito. Sem cobrança quando o teste terminar.</p>
            <p className="cad-aceite">
              Ao criar a conta você concorda com os <LinkInterno to="/termos">Termos de Uso</LinkInterno> e
              com a <LinkInterno to="/privacidade">Política de Privacidade</LinkInterno>.
            </p>
          </form>

          <p className="cad-alternativa">Já tem conta? <LinkInterno to="/login">Entrar na minha farmácia</LinkInterno></p>
        </div>

        <ul className="cad-provas">
          {PROVAS.map(prova => <li key={prova.titulo}>
            <span className="cad-prova-icone" aria-hidden="true">{prova.icone}</span>
            <div><strong>{prova.titulo}</strong><span>{prova.texto}</span></div>
          </li>)}
        </ul>
      </div>
    </main>

    <RodapeSite mostrarCadastro={false}/>
  </div>
}

function formatarCnpj(valor:string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 14)
  return digitos.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}
