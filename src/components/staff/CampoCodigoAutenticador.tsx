/* Código atual do autenticador de quem está fazendo a ação, pedido de novo na hora mesmo com
   a sessão aberta: é o que garante que foi a pessoa, e não um computador deixado logado. */
export default function CampoCodigoAutenticador({ valor, aoAlterar, erro }:{ valor:string; aoAlterar:(codigo:string)=>void; erro?:string }) {
  return <label>Código do autenticador
    <input value={valor} onChange={e => aoAlterar(e.target.value.replace(/\D/g, '').slice(0, 6))}
      inputMode="numeric" autoComplete="one-time-code" placeholder="000000" maxLength={6}/>
    <small>{erro ?? 'Os 6 dígitos que aparecem agora no seu app autenticador.'}</small></label>
}
