import { Clipboard, PlugZap, Unplug } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, date, ErroApi } from '../api'
import { usarAutenticacao } from '../autenticacao'
import { empresaAtiva, isAdminAtivo } from '../lib/permissoes'
import type { IntegracaoMercadoFarma } from '../types'
import { AvisoErro, Carregando } from './ComponentesUI'
import { avisarIntegracoesAlteradas } from '../lib/vinculosMercadoFarma'

const COMANDO_TOKEN = "copy(localStorage.getItem('token'))"

/* Conexão da farmácia ativa com o Mercado Farma. Por enquanto a farmácia cola o token do
   próprio login no site; o CotaPreço confere com o Mercado Farma, guarda cifrado e usa só
   para ler preços e estoque. O token vence em cerca de 24 horas. */
export default function CardMercadoFarma() {
  const { user } = usarAutenticacao()
  const admin = isAdminAtivo(user)
  const farmacia = empresaAtiva(user)
  const [integracao, setIntegracao] = useState<IntegracaoMercadoFarma|null>(null)
  const [token, setToken] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    api<IntegracaoMercadoFarma>('/integracoes/mercado-farma').then(setIntegracao)
      .catch(e => setErro(e instanceof ErroApi ? e.message : 'Não foi possível carregar a integração.'))
  }, [])

  const conectar = async (evento:FormEvent) => {
    evento.preventDefault(); setErro(''); setMensagem('')
    setOcupado(true)
    try {
      setIntegracao(await api<IntegracaoMercadoFarma>('/integracoes/mercado-farma', { method:'PUT', body:JSON.stringify({ token:token.trim() }) }))
      setToken('')
      avisarIntegracoesAlteradas()
      setMensagem('Mercado Farma conectado. Na cotação aberta, use "Importar do Mercado Farma".')
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível conectar.') }
    finally { setOcupado(false) }
  }

  const desconectar = async () => {
    setErro(''); setMensagem('')
    setOcupado(true)
    try {
      await api('/integracoes/mercado-farma', { method:'DELETE' })
      setIntegracao(atual => atual && { ...atual, status:null, tokenExpiraEm:null, ultimaImportacaoEm:null, ultimoErro:null })
      setMensagem('Mercado Farma desconectado.')
      avisarIntegracoesAlteradas()
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível desconectar.') }
    finally { setOcupado(false) }
  }

  const copiarComando = async () => {
    try { await navigator.clipboard.writeText(COMANDO_TOKEN); setCopiado(true); window.setTimeout(() => setCopiado(false), 2000) }
    catch { /* Sem permissão de área de transferência: o comando continua visível para copiar à mão. */ }
  }

  if (!integracao) return <section className="card settings-card">{erro ? <AvisoErro message={erro}/> : <Carregando/>}</section>

  const conectada = integracao.status === 'CONECTADA'
  return <section className="card settings-card">
    <div className="card-header"><div>
      <h2><PlugZap/> Mercado Farma</h2>
      <p>Traz os preços e o estoque do Mercado Farma para as cotações de {farmacia?.name ?? 'sua farmácia'}, como uma proposta por distribuidor.</p>
    </div></div>
    <div className="stack-form settings-form">
      {erro && <AvisoErro message={erro}/>}
      {mensagem && <div className="alert alert-success">{mensagem}</div>}
      {!integracao.disponivel
        ? <div className="alert alert-warning">A integração com o Mercado Farma ainda não está ativa neste servidor.</div>
        : <>
          <div className="integracao-status">
            <span className={conectada ? 'status-active' : 'status-inactive'}>
              {conectada ? 'Conectado' : integracao.status === 'EXPIRADA' ? 'Conexão expirada' : 'Não conectado'}
            </span>
            {conectada && integracao.tokenExpiraEm && <small>Válido até {date(integracao.tokenExpiraEm)}</small>}
            {integracao.ultimaImportacaoEm && <small>Última importação: {date(integracao.ultimaImportacaoEm)}</small>}
          </div>
          {integracao.status === 'EXPIRADA' && <div className="alert alert-warning">{integracao.ultimoErro ?? 'O acesso venceu.'} Conecte de novo para voltar a importar.</div>}
          {!admin
            ? <p className="modal-nota">Somente administradores desta farmácia podem conectar ou desconectar o Mercado Farma.</p>
            : <form className="stack-form" onSubmit={conectar}>
              <ol className="integracao-passos">
                <li>Entre em <a href="https://mercadofarma.com.br" target="_blank" rel="noopener noreferrer">mercadofarma.com.br</a> com a conta desta farmácia.</li>
                <li>Abra o console do navegador (tecla F12, aba Console), cole o comando abaixo e tecle Enter:
                  <span className="integracao-comando"><code>{COMANDO_TOKEN}</code>
                    <button type="button" className="button button-ghost" onClick={() => void copiarComando()}><Clipboard/>{copiado ? 'Copiado!' : 'Copiar'}</button></span>
                  <small>Se o Chrome não deixar colar, digite <code>allow pasting</code>, tecle Enter e cole de novo.</small>
                </li>
                <li>Volte aqui e cole no campo abaixo.</li>
              </ol>
              <label>Token de acesso do Mercado Farma
                <input type="password" autoComplete="off" spellCheck={false} required value={token} onChange={e => setToken(e.target.value)} placeholder="Cole aqui"/>
                <small>O acesso vale por cerca de 24 horas. Ele é guardado cifrado e usado só para ler preços e estoque; nenhum pedido é feito no Mercado Farma.</small>
              </label>
              <div className="line-actions">
                <button className="button button-primary" disabled={ocupado || !token.trim()}><PlugZap/>{ocupado ? 'Conferindo...' : conectada ? 'Atualizar acesso' : 'Conectar'}</button>
                {integracao.status && <button type="button" className="button button-ghost" disabled={ocupado} onClick={() => void desconectar()}><Unplug/>Desconectar</button>}
              </div>
            </form>}
        </>}
    </div>
  </section>
}
