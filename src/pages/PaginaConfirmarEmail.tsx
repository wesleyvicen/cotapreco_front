import { CircleAlert } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api, ErroApi } from '../api'
import { usarAutenticacao } from '../autenticacao'
import { possuiTokenFarmacia } from '../cache/persistenciaSessao'
import { Carregando } from '../components/ComponentesUI'
import { LinkInterno, usarNavegacao } from '../roteamento'

/*
 * A confirmação é um passo de passagem, não uma tela: confirma e joga a pessoa
 * para dentro do sistema. Só quando falha é que ela vira tela de verdade, porque
 * aí existe algo para ler e decidir.
 */
export default function PaginaConfirmarEmail() {
  const { user, recarregarUsuario } = usarAutenticacao()
  const navegar = usarNavegacao()
  const [erro, setErro] = useState('')
  const jaTentou = useRef(false)

  useEffect(() => {
    if (jaTentou.current) return
    jaTentou.current = true
    const token = new URLSearchParams(window.location.search).get('token') ?? ''
    if (!token) { setErro('O link veio sem o código de confirmação. Abra o link direto do e-mail que enviamos.'); return }

    api('/auth/confirmar-email', { method:'POST', body:JSON.stringify({ token }) })
      .then(async () => {
        /* Logado, o painel já é o destino natural. Sem sessão, mandar para a raiz cairia
           na página de vendas — quem acabou de confirmar quer é entrar. */
        await recarregarUsuario()
        navegar(possuiTokenFarmacia() ? '/?email-confirmado=1' : '/login?email-confirmado=1', { replace: true })
      })
      .catch(erroApi => setErro(erroApi instanceof ErroApi ? erroApi.message : 'Não foi possível confirmar o e-mail agora.'))
  }, [navegar, recarregarUsuario])

  if (!erro) return <div className="page narrow confirmacao-pagina"><Carregando/></div>

  return <div className="page narrow confirmacao-pagina">
    <section className="card confirmacao-card">
      <div className="confirmacao-icone confirmacao-icone-erro"><CircleAlert/></div>
      <h1>Não conseguimos confirmar</h1>
      <p>{erro}</p>
      <LinkInterno className="button button-primary" to={user ? '/' : '/login'}>
        {user ? 'Voltar ao painel' : 'Entrar na minha conta'}
      </LinkInterno>
    </section>
  </div>
}
