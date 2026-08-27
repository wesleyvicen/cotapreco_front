import { CheckCircle2 } from 'lucide-react'
import { useEffect, useState } from 'react'

/*
 * Confirmar redireciona direto para dentro do sistema, então o "deu certo" precisa
 * aparecer no destino — senão o clique no e-mail parece não ter feito nada.
 */
export default function AvisoEmailConfirmado() {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (!params.has('email-confirmado')) return
    setVisivel(true)
    /* Tira da URL para não reaparecer a cada refresh nem vazar em link compartilhado. */
    params.delete('email-confirmado')
    const busca = params.toString()
    window.history.replaceState({}, '', window.location.pathname + (busca ? `?${busca}` : ''))
  }, [])

  if (!visivel) return null
  return <div className="alert alert-success aviso-email-confirmado" role="status">
    <CheckCircle2/> E-mail confirmado. Sua conta está liberada para criar cotações.
  </div>
}
