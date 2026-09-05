import { Check, Eye, EyeOff, KeyRound, Save, ShieldCheck, X } from 'lucide-react'
import { useState, type FormEvent, type ReactNode } from 'react'
import { api, ErroApi } from '../api'
import { AvisoErro } from '../components/ComponentesUI'
import { usarAutenticacao } from '../autenticacao'

const NIVEIS = {
  fraca: { rotulo: 'Senha não segura', classe: 'fraca' },
  media: { rotulo: 'Senha razoável', classe: 'media' },
  boa: { rotulo: 'Quase lá', classe: 'boa' },
  forte: { rotulo: 'Senha segura', classe: 'forte' },
} as const

function avaliarForca(senha:string, tamanhoMinimo:number) {
  const criterios = [senha.length >= tamanhoMinimo, /[a-z]/.test(senha), /[A-Z]/.test(senha), /\d/.test(senha), /[^A-Za-z0-9]/.test(senha)]
  const pontos = criterios.filter(Boolean).length
  const nivel = pontos <= 1 ? NIVEIS.fraca : pontos <= 3 ? NIVEIS.media : pontos === 4 ? NIVEIS.boa : NIVEIS.forte
  return { pontos, ...nivel }
}

function MedidorDeForca({ senha, tamanhoMinimo }:{ senha:string; tamanhoMinimo:number }) {
  if (!senha) return null
  const { pontos, rotulo, classe } = avaliarForca(senha, tamanhoMinimo)
  return <div className="medidor-forca">
    <div className="medidor-forca-barra"><span className={`medidor-forca-preenchimento nivel-${classe}`} style={{ width: `${(pontos / 5) * 100}%` }}/></div>
    <small key={classe} className={`medidor-forca-rotulo nivel-${classe}`}>{rotulo}</small>
  </div>
}

function StatusConfirmacao({ novaSenha, confirmacao }:{ novaSenha:string; confirmacao:string }) {
  if (!confirmacao) return null
  const confere = novaSenha === confirmacao
  return <small key={confere ? 'ok' : 'nok'} className={`confirmacao-status ${confere ? 'ok' : 'nok'}`}>
    {confere ? <Check size={14}/> : <X size={14}/>}{confere ? 'As senhas conferem' : 'As senhas não conferem'}
  </small>
}

/* Cada campo de senha tem o próprio olhinho — um estado global de "mostrar" só confundia,
   porque revelava os três campos juntos mesmo clicando em só um. */
function CampoSenha({ label, autoComplete, valor, aoAlterar, minLength, children }:
  { label:string; autoComplete:string; valor:string; aoAlterar:(v:string)=>void; minLength?:number; children?:ReactNode }) {
  const [mostrar, setMostrar] = useState(false)
  return <label>{label}<div className="password-field">
    <input required minLength={minLength} maxLength={72} autoComplete={autoComplete} type={mostrar?'text':'password'} value={valor} onChange={e=>aoAlterar(e.target.value)}/>
    <button type="button" aria-label={mostrar?'Ocultar senha':'Mostrar senha'} onClick={()=>setMostrar(v=>!v)}>{mostrar?<EyeOff/>:<Eye/>}</button>
  </div>{children}</label>
}

export default function PaginaAlterarSenha(){
  const{user}=usarAutenticacao()
  const doisFatores=user?.doisFatoresAtivo??false
  const tamanhoMinimo=user?.staff?12:8
  const[senhaAtual,setSenhaAtual]=useState('');const[novaSenha,setNovaSenha]=useState('');const[confirmacao,setConfirmacao]=useState('');const[codigoTotp,setCodigoTotp]=useState('');const[erro,setErro]=useState('');const[mensagem,setMensagem]=useState('');const[ocupado,setOcupado]=useState(false)
  const salvar=async(event:FormEvent)=>{event.preventDefault();setErro('');setMensagem('');if(novaSenha!==confirmacao){setErro('A confirmação não corresponde à nova senha.');return}setOcupado(true);try{await api('/auth/password',{method:'PUT',body:JSON.stringify({senhaAtual,novaSenha,codigoTotp:doisFatores?codigoTotp:undefined})});setSenhaAtual('');setNovaSenha('');setConfirmacao('');setCodigoTotp('');setMensagem('Senha atualizada com sucesso.')}catch(e){setErro(e instanceof ErroApi?e.message:'Não foi possível alterar a senha.')}finally{setOcupado(false)}}
  return <div className="page"><div className="page-header"><div><span className="eyebrow green">Minha conta</span><h1>Alterar senha</h1><p>Atualize a senha usada para acessar o CotaPreço.</p></div></div><section className="card settings-card"><div className="card-header"><div><h2><KeyRound/> Segurança da conta</h2><p>Informe a senha atual para confirmar a alteração.</p></div></div><form className="stack-form settings-form" onSubmit={salvar}>
    {erro&&<AvisoErro message={erro}/>} {mensagem&&<div className="alert alert-success">{mensagem}</div>}
    <CampoSenha label="Senha atual" autoComplete="current-password" valor={senhaAtual} aoAlterar={setSenhaAtual}/>
    <CampoSenha label="Nova senha" autoComplete="new-password" valor={novaSenha} aoAlterar={setNovaSenha} minLength={tamanhoMinimo}>
      <MedidorDeForca senha={novaSenha} tamanhoMinimo={tamanhoMinimo}/>
      <small>{user?.staff?'Contas de staff exigem pelo menos 12 caracteres, com maiúscula, minúscula, número e símbolo.':'Use pelo menos 8 caracteres.'}</small>
    </CampoSenha>
    <CampoSenha label="Confirmar nova senha" autoComplete="new-password" valor={confirmacao} aoAlterar={setConfirmacao} minLength={tamanhoMinimo}>
      <StatusConfirmacao novaSenha={novaSenha} confirmacao={confirmacao}/>
    </CampoSenha>
    {doisFatores&&<div className="campo-seguranca">
      <div className="campo-seguranca-header"><div className="modal-icon"><ShieldCheck/></div>
        <div><span className="eyebrow green">Segunda etapa</span><strong>Código do autenticador</strong></div></div>
      <p>Sua conta tem verificação em duas etapas ativada. Abra o Google Authenticator (ou outro app compatível) e digite o código de 6 dígitos exibido agora.</p>
      <input className="codigo-input" required type="text" inputMode="numeric" pattern="\d{6}" maxLength={6} autoComplete="one-time-code" placeholder="000000" value={codigoTotp} onChange={e=>setCodigoTotp(e.target.value.replace(/\D/g,'').slice(0,6))}/>
    </div>}
    <button className="button button-primary button-large" disabled={ocupado}><Save/>{ocupado?'Atualizando...':'Atualizar senha'}</button>
  </form></section></div>
}
