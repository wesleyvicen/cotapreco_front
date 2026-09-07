import { ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck, Sparkles } from 'lucide-react'
import QRCode from 'qrcode'
import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ErroApi } from '../api'
import { usarAutenticacao } from '../autenticacao'
import AvisoEmailConfirmado from '../components/AvisoEmailConfirmado'
import { AssinaturaEmpresa } from '../components/RodapeEmpresa'
import { sugerirDominioEmail } from '../lib/sugestaoEmail'
import { LinkInterno, Redirecionar, usarNavegacao } from '../roteamento'
import type { PendenciaDoisFatores } from '../types'

export default function PaginaLogin(){
  const {user,login}=usarAutenticacao()
  const navigate=usarNavegacao()
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [showPassword,setShowPassword]=useState(false)
  const [error,setError]=useState('')
  const [loading,setLoading]=useState(false)
  const [pendencia,setPendencia]=useState<PendenciaDoisFatores|null>(null)
  const sugestaoEmail=sugerirDominioEmail(email)

  if(user)return <Redirecionar to="/" replace/>

  /* Tab e seta-direita são os dois jeitos que quem já viu esse tipo de sugestão espera
     usar para aceitar (é o mesmo padrão da barra de endereço do navegador). Tab aceita e
     já segue para o campo de senha; a seta só completa quando o cursor está no fim, senão
     ela precisa continuar navegando dentro do texto normalmente. */
  const teclaNoEmail=(e:KeyboardEvent<HTMLInputElement>)=>{
    if(!sugestaoEmail)return
    if(e.key==='Tab'&&!e.shiftKey){setEmail(sugestaoEmail);return}
    if(e.key==='ArrowRight'&&e.currentTarget.selectionStart===email.length&&e.currentTarget.selectionEnd===email.length){
      e.preventDefault();setEmail(sugestaoEmail)
    }
  }

  const submit=async(e:FormEvent)=>{
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const resultado=await login(email,password)
      if(resultado){ setPendencia(resultado); return }
      navigate('/')
    } catch(err){ setError(err instanceof ErroApi?err.message:'Não foi possível entrar.') }
    finally { setLoading(false) }
  }

  return <div className="login-page">
    <section className="login-hero">
      <div className="brand light"><div className="brand-copy"><img className="cotapreco-logo" src="/cotapreco-logo.png?v=20260905-1" alt="CotaPreço"/><span>Compras inteligentes</span></div></div>
      <div className="hero-copy">
        <span className="eyebrow"><Sparkles size={16}/> Mais economia, menos planilhas</span>
        <h1>Compare propostas.<br/>Compre melhor.</h1>
        <p>Centralize suas cotações, receba preços dos distribuidores e encontre a melhor composição de compra em minutos.</p>
        <ul><li><CheckCircle2/>Link simples para representantes</li><li><CheckCircle2/>Comparativo automático de preços</li><li><CheckCircle2/>Dados separados por farmácia</li></ul>
      </div>
      <div className="hero-security"><ShieldCheck/><span>Seus dados protegidos e isolados por empresa</span></div>
    </section>
    <section className="login-panel">
      <div className="login-panel-marca"><img className="cotapreco-logo" src="/cotapreco-logo.png?v=20260905-1" alt="CotaPreço"/></div>
      {pendencia
        ? <FormularioDoisFatores pendencia={pendencia} aoVoltar={() => { setPendencia(null); setError('') }}/>
        : <form className="login-card" onSubmit={submit}>
            <AvisoEmailConfirmado/>
            <div><span className="eyebrow green">Bem-vindo de volta</span><h2>Acesse sua conta</h2><p>Use suas credenciais para continuar.</p></div>
            {error&&<div className="alert alert-error">{error}</div>}
            <label>E-mail
              <div className="email-autocompletar">
                <div className="email-autocompletar-fantasma" aria-hidden="true">
                  <span className="email-autocompletar-digitado">{email}</span>
                  {sugestaoEmail&&<span className="email-autocompletar-sugestao">{sugestaoEmail.slice(email.length)}</span>}
                </div>
                <input type="text" inputMode="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={teclaNoEmail} autoComplete="email" required/>
              </div>
            </label>
            <label>Senha<div className="password-field"><input type={showPassword?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" required/><button type="button" aria-label={showPassword?'Ocultar senha':'Mostrar senha'} onClick={()=>setShowPassword(valor=>!valor)}>{showPassword?<EyeOff/>:<Eye/>}</button></div></label>
            <LinkInterno className="forgot-password-link" to="/esqueci-senha">Esqueci minha senha</LinkInterno>
            <button className="button button-primary button-large" disabled={loading}>{loading?'Entrando...':<>Entrar <ArrowRight size={19}/></>}</button>
            <p className="login-alternative">Ainda não tem uma conta? <LinkInterno to="/cadastro">Cadastre sua farmácia</LinkInterno></p>
          </form>}
      <AssinaturaEmpresa className="assinatura-empresa-login"/>
    </section>
  </div>
}

function FormularioDoisFatores({ pendencia, aoVoltar }:{ pendencia:PendenciaDoisFatores; aoVoltar:()=>void }) {
  const { confirmarDoisFatores } = usarAutenticacao()
  const navigate = usarNavegacao()
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    if (!pendencia.otpauthUri) return
    let cancelado = false
    QRCode.toDataURL(pendencia.otpauthUri, { margin: 1, width: 220 })
      .then(url => { if (!cancelado) setQrDataUrl(url) })
      .catch(() => {})
    return () => { cancelado = true }
  }, [pendencia.otpauthUri])

  const submit = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      await confirmarDoisFatores(pendencia.token, codigo)
      navigate('/')
    } catch (err) { setError(err instanceof ErroApi ? err.message : 'Não foi possível confirmar o código.') }
    finally { setLoading(false) }
  }

  return <form className="login-card" onSubmit={submit}>
    <div><span className="eyebrow green">Verificação em duas etapas</span><h2>{pendencia.configurando ? 'Configure o autenticador' : 'Digite o código'}</h2>
      <p>{pendencia.configurando
        ? 'Escaneie o QR code no Google Authenticator, Microsoft Authenticator ou outro app compatível, depois digite o código de 6 dígitos gerado.'
        : 'Abra o app autenticador no seu celular e digite o código de 6 dígitos.'}</p>
    </div>
    {error && <div className="alert alert-error">{error}</div>}
    {pendencia.configurando && <div className="totp-setup">
      {qrDataUrl && <img className="totp-qr" src={qrDataUrl} alt="QR code para configurar o autenticador"/>}
      {pendencia.segredoManual && <p className="totp-segredo-manual">Não consegue escanear? Digite este código manualmente: <code>{pendencia.segredoManual}</code></p>}
    </div>}
    <label>Código de 6 dígitos
      <input className="codigo-input" type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" autoFocus
        placeholder="000000" value={codigo} onChange={e => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} required/>
    </label>
    <button className="button button-primary button-large" disabled={loading || codigo.length !== 6}>
      {loading ? 'Verificando...' : <>Confirmar <ArrowRight size={19}/></>}
    </button>
    <button type="button" className="button button-ghost" onClick={aoVoltar}>Voltar</button>
  </form>
}
