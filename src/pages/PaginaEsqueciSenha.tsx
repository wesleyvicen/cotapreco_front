import { ArrowLeft, CheckCircle2, KeyRound, Mail } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { apiPublica, ErroApi } from '../api'
import { AvisoErro } from '../components/ComponentesUI'
import { LinkInterno } from '../roteamento'

export default function PaginaEsqueciSenha(){
  const[email,setEmail]=useState('');const[erro,setErro]=useState('');const[mensagem,setMensagem]=useState('');const[ocupado,setOcupado]=useState(false)
  const enviar=async(event:FormEvent)=>{event.preventDefault();setErro('');setMensagem('');setOcupado(true);try{const resposta=await apiPublica<{mensagem:string}>('/auth/esqueci-senha',{method:'POST',body:JSON.stringify({email})});setMensagem(resposta.mensagem)}catch(e){setErro(e instanceof ErroApi?e.message:'Não foi possível enviar as instruções.')}finally{setOcupado(false)}}
  return <div className="public-page public-center"><div className="public-logo reset-logo"><img className="cotapreco-logo" src="/cotapreco-logo.png?v=20260904-2" alt="CotaPreço"/></div><section className="public-card reset-card"><div className="success-icon small-icon"><KeyRound/></div><span className="eyebrow green">Recuperar acesso</span><h1>Esqueceu sua senha?</h1><p>Informe seu e-mail de acesso. Enviaremos um link seguro para criar uma nova senha.</p>{erro&&<AvisoErro message={erro}/>} {mensagem?<div className="reset-success"><CheckCircle2/><p>{mensagem}</p></div>:<form onSubmit={enviar} className="stack-form"><label>E-mail<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><button className="button button-primary button-large full-button" disabled={ocupado}>{ocupado?'Enviando...':<><Mail/>Enviar instruções</>}</button></form>}<LinkInterno className="reset-back" to="/login"><ArrowLeft/>Voltar para o login</LinkInterno></section></div>
}
