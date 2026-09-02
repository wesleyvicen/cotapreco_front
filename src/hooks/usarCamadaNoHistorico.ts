/* Os hooks usam o prefixo português "usar" por padrão de nomenclatura do projeto. */
/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useRef } from 'react'

/* Modais e telas cheias do sistema vivem na mesma URL: são estado de componente, não rota.
 * Para o navegador, abrir um deles não é navegar — então o voltar (e o gesto de voltar do
 * Android, que é como boa parte das pessoas usa o sistema no celular) pulava a página
 * inteira em vez de apenas fechar o que estava na frente.
 *
 * Este hook faz a camada participar do histórico: abrir empilha uma entrada marcada com um
 * identificador próprio, o voltar do navegador fecha a camada, e fechar pela interface
 * desfaz a entrada — senão o histórico acumularia passos mortos, em que voltar não faz nada
 * visível porque a camada já foi fechada.
 *
 * O identificador é o que sustenta camadas empilhadas. No voltar, cada camada aberta compara
 * a entrada atual com a sua: fecha apenas aquela cuja entrada acabou de ser descartada, e as
 * de baixo continuam abertas. E a entrada só é desfeita quando ainda é a atual: se outra
 * camada empilhou por cima, mexer no histórico jogaria a pessoa para fora da tela em que está.
 */

const CHAVE = 'camadaCotaPreco'
let proximoId = 1

export function usarCamadaNoHistorico(aberta: boolean, aoFechar: () => void) {
  const fechar = useRef(aoFechar)
  fechar.current = aoFechar
  const id = useRef<number | null>(null)
  const fechandoPeloNavegador = useRef(false)

  useEffect(() => {
    if (aberta) {
      if (id.current === null) {
        id.current = proximoId++
        window.history.pushState({ ...window.history.state, [CHAVE]: id.current }, '', window.location.href)
      }
      return
    }
    if (id.current === null) return
    const minha = id.current
    id.current = null
    /* Fechou porque o navegador voltou: a entrada já saiu, não há o que desfazer. */
    if (fechandoPeloNavegador.current) {
      fechandoPeloNavegador.current = false
      return
    }
    if (window.history.state?.[CHAVE] === minha) window.history.back()
  }, [aberta])

  useEffect(() => {
    if (!aberta) return
    const aoVoltar = () => {
      /* Só fecha a camada cuja entrada foi descartada; as de baixo seguem abertas. */
      if (window.history.state?.[CHAVE] === id.current) return
      fechandoPeloNavegador.current = true
      id.current = null
      fechar.current()
    }
    window.addEventListener('popstate', aoVoltar)
    return () => window.removeEventListener('popstate', aoVoltar)
  }, [aberta])
}
