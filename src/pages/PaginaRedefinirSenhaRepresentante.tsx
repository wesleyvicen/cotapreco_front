import { CheckCircle2, KeyRound, ShieldCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { apiPublica, ErroApi } from '../api'
import { AvisoErro } from '../components/ComponentesUI'
import { IndicadorForcaSenha } from '../components/IndicadorForcaSenha'
import { usarParametrosBusca } from '../roteamento'

export default function PaginaRedefinirSenhaRepresentante(){
  const[params]=usarParametrosBusca();const token=params.get('token')??''
  const[senha,setSenha]=useState('');const[confirmacao,setConfirmacao]=useState('');const[erro,setErro]=useState('');const[ocupado,setOcupado]=useState(false);const[concluido,setConcluido]=useState(false)
  const enviar=async(event:FormEvent)=>{event.preventDefault();setErro('');if(senha!==confirmacao){setErro('As senhas não coincidem.');return}setOcupado(true);try{await apiPublica('/publico/representantes/redefinir-senha',{method:'POST',body:JSON.stringify({token,novaSenha:senha})});setConcluido(true)}catch(e){setErro(e instanceof ErroApi?e.message:'Não foi possível redefinir a senha.')}finally{setOcupado(false)}}
  return <div className="public-page public-center"><div className="public-logo reset-logo"><img className="cotapreco-logo" src="/cotapreco-logo.png?v=20260905-1" alt="CotaPreço"/></div><section className="public-card reset-card">{concluido?<><div className="success-icon large"><CheckCircle2/></div><h1>Senha redefinida</h1><p>Abra novamente o link da cotação para entrar com sua nova senha.</p></>:<><div className="success-icon small-icon"><KeyRound/></div><span className="eyebrow green">Conta do representante</span><h1>Crie uma nova senha</h1><p>Escolha uma senha fácil de lembrar.</p>{!token&&<AvisoErro message="O link de redefinição está incompleto."/>}{erro&&<AvisoErro message={erro}/>}<form onSubmit={enviar} className="stack-form"><label>Nova senha<input type="password" required minLength={1} maxLength={72} autoComplete="new-password" value={senha} onChange={e=>setSenha(e.target.value)}/><IndicadorForcaSenha senha={senha}/></label><label>Confirmar nova senha<input type="password" required minLength={1} maxLength={72} autoComplete="new-password" value={confirmacao} onChange={e=>setConfirmacao(e.target.value)}/></label><button className="button button-primary button-large full-button" disabled={ocupado||!token}>{ocupado?'Salvando...':'Redefinir senha'}</button></form></>}<div className="public-security"><ShieldCheck/>Link protegido e de uso único.</div></section></div>
}
