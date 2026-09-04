import { ChevronLeft, ChevronRight, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { api, date } from '../api'
import { Carregando, EstadoVazio } from '../components/ComponentesUI'
import { ROTULO_STATUS } from '../lib/assinatura'
import type { PaginaContasStaff } from '../types'

const TAMANHO_PAGINA = 20
/* Espera a pessoa parar de digitar antes de ir ao banco — sem isso cada tecla vira uma
   consulta nova. */
const ATRASO_BUSCA_MS = 350

function formatarCnpj(valor:string|null) {
  if (!valor) return '—'
  const digitos = valor.replace(/\D/g, '').slice(0, 14)
  return digitos.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

export default function PaginaStaff() {
  const [busca, setBusca] = useState('')
  const [buscaAplicada, setBuscaAplicada] = useState('')
  const [pagina, setPagina] = useState(0)
  const [resultado, setResultado] = useState<PaginaContasStaff|null>(null)
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')

  /* Debounce: só aplica a busca (e some com a página atual) depois que a digitação parar. */
  useEffect(() => {
    const relogio = setTimeout(() => { setBuscaAplicada(busca); setPagina(0) }, ATRASO_BUSCA_MS)
    return () => clearTimeout(relogio)
  }, [busca])

  useEffect(() => {
    setCarregando(true); setErro('')
    const parametros = new URLSearchParams({ pagina: String(pagina), tamanho: String(TAMANHO_PAGINA) })
    if (buscaAplicada) parametros.set('busca', buscaAplicada)
    api<PaginaContasStaff>(`/staff/accounts?${parametros}`)
      .then(setResultado)
      .catch(() => setErro('Não foi possível carregar as contas.'))
      .finally(() => setCarregando(false))
  }, [buscaAplicada, pagina])

  return <div className="page">
    <div className="page-header"><div><span className="eyebrow green">Contas</span><h1>Clientes do CotaPreço</h1><p>Quem está pagando, em teste ou com pagamento atrasado.</p></div></div>

    {resultado && <div className="staff-resumo">
      <div><strong>{resultado.totalContas}</strong><span>contas no total</span></div>
      <div><strong>{resultado.totalPagando}</strong><span>pagando</span></div>
      <div><strong>{resultado.totalEmTeste}</strong><span>em teste</span></div>
      <div><strong>{resultado.totalVencidas}</strong><span>com pagamento atrasado</span></div>
    </div>}

    {erro && <div className="alert alert-error">{erro}</div>}

    <div className="toolbar">
      <label className="search"><Search/><input placeholder="Buscar por farmácia, CNPJ, responsável ou e-mail..." value={busca} onChange={e => setBusca(e.target.value)}/></label>
    </div>

    <section className="card">
      {carregando && !resultado
        ? <Carregando/>
        : !resultado || resultado.itens.length === 0
          ? <EstadoVazio title={buscaAplicada ? 'Nenhuma conta encontrada' : 'Nenhuma conta ainda'}
              description={buscaAplicada ? 'Tente buscar por outro nome, CNPJ ou e-mail.' : 'As contas de clientes aparecem aqui assim que alguém se cadastrar.'}/>
          : <>
              <div className="table-wrap"><table>
                <thead><tr><th>Farmácia</th><th>Responsável</th><th>Status</th><th>Farmácias</th><th>Válido até</th><th>Desde</th></tr></thead>
                <tbody>{resultado.itens.map(c => <tr key={c.grupoId}>
                  <td><strong>{c.nomeFarmacia}</strong><br/><small>{formatarCnpj(c.cnpj)}</small></td>
                  <td>{c.responsavelNome ?? '—'}{c.responsavelEmail && <><br/><small>{c.responsavelEmail}</small></>}</td>
                  <td>
                    <span className={`status-badge status-${c.statusAssinatura.toLowerCase()}`}>{ROTULO_STATUS[c.statusAssinatura]}</span>
                    {!c.contaAtiva && <><br/><small>Conta desativada</small></>}
                  </td>
                  <td>{c.farmaciasAtivas} de {c.farmaciasContratadas}</td>
                  <td>{c.assinaturaAte ? date(c.assinaturaAte) : '—'}</td>
                  <td>{date(c.criadoEm)}</td>
                </tr>)}</tbody>
              </table></div>
              {resultado.totalPaginas > 1 && <div className="staff-paginacao">
                <span>Página {resultado.pagina + 1} de {resultado.totalPaginas} · {resultado.totalItens} conta{resultado.totalItens !== 1 ? 's' : ''} encontrada{resultado.totalItens !== 1 ? 's' : ''}</span>
                <div>
                  <button type="button" className="button button-ghost" disabled={pagina === 0} onClick={() => setPagina(p => p - 1)}><ChevronLeft size={16}/>Anterior</button>
                  <button type="button" className="button button-ghost" disabled={pagina + 1 >= resultado.totalPaginas} onClick={() => setPagina(p => p + 1)}>Próxima<ChevronRight size={16}/></button>
                </div>
              </div>}
            </>}
    </section>
  </div>
}
