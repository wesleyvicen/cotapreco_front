import { Building2, MapPin, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, ErroApi } from '../api'
import { usarAutenticacao } from '../autenticacao'
import CamposEndereco from '../components/CamposEndereco'
import { AvisoErro, Carregando } from '../components/ComponentesUI'
import { enderecoDoServidor, enderecoVazio, formatarTelefone, paraEnvio, type FormularioEndereco } from '../lib/endereco'
import { isAdminAtivo, isAdminDoGrupo } from '../lib/permissoes'
import type { Conta, Empresa } from '../types'

function formatarCnpj(valor:string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 14)
  return digitos.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}

/* Identificação fiscal da farmácia (nome/CNPJ) — por unidade. Distinto do bloco de cobrança
   abaixo, que é da conta (grupo) inteira, não desta farmácia específica. */
function CardIdentificacao() {
  const { user } = usarAutenticacao()
  const somenteLeitura = !isAdminAtivo(user)
  const [empresa, setEmpresa] = useState<Empresa|null>(null)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    api<Empresa>('/company').then(dados => { setEmpresa(dados); setNome(dados.nome); setCnpj(formatarCnpj(dados.cnpj ?? '')) })
      .catch(e => setErro(e instanceof ErroApi ? e.message : 'Falha ao carregar os dados.'))
  }, [])

  const salvar = async (evento:FormEvent) => {
    evento.preventDefault(); setErro(''); setMensagem(''); setOcupado(true)
    try {
      const atualizada = await api<Empresa>('/company', { method:'PUT', body:JSON.stringify({ nome, cnpj:cnpj.replace(/\D/g, '') }) })
      setEmpresa(atualizada); setCnpj(formatarCnpj(atualizada.cnpj ?? ''))
      setMensagem('Dados da farmácia atualizados.')
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar.') }
    finally { setOcupado(false) }
  }

  if (!empresa) return <section className="card settings-card"><Carregando/>{erro && <AvisoErro message={erro}/>}</section>

  return <form className="settings-form-wrap" onSubmit={salvar}>
    {erro && <AvisoErro message={erro}/>}
    {mensagem && <div className="alert alert-success">{mensagem}</div>}
    <section className="card settings-card">
      <div className="card-header"><div><h2><Building2/> Identificação fiscal</h2><p>O CNPJ é obrigatório para gerar pedidos em PDF e imagem.</p></div></div>
      <div className="stack-form settings-form">
        <label>Nome da farmácia<input required maxLength={160} disabled={somenteLeitura} value={nome} onChange={e => setNome(e.target.value)}/></label>
        <label>CNPJ<input required inputMode="numeric" maxLength={18} disabled={somenteLeitura} value={cnpj} onChange={e => setCnpj(formatarCnpj(e.target.value))}/><small>Informe os 14 dígitos do CNPJ.</small></label>
      </div>
    </section>
    {somenteLeitura
      ? <div className="alert alert-warning">Somente administradores desta farmácia podem alterar estes dados.</div>
      : <button className="button button-primary" disabled={ocupado}><Save/>{ocupado ? 'Salvando...' : 'Salvar dados'}</button>}
  </form>
}

/* Endereço e telefone de cobrança — da conta (grupo) inteira, usados pelo Asaas na
   assinatura. Quem administra qualquer farmácia do grupo pode alterar, mesmo que não seja
   admin da farmácia ativa no momento. */
function CardCobranca() {
  const { user } = usarAutenticacao()
  const somenteLeitura = !isAdminDoGrupo(user)
  const [conta, setConta] = useState<Conta|null>(null)
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState<FormularioEndereco>(enderecoVazio)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    api<Conta>('/account').then(dados => {
      setConta(dados); setTelefone(formatarTelefone(dados.telefone ?? '')); setEndereco(enderecoDoServidor(dados.endereco))
    }).catch(e => setErro(e instanceof ErroApi ? e.message : 'Falha ao carregar os dados.'))
  }, [])

  const salvar = async (evento:FormEvent) => {
    evento.preventDefault(); setErro(''); setMensagem(''); setOcupado(true)
    try {
      if (!conta) return
      const atualizada = await api<Conta>('/account', { method:'PUT', body:JSON.stringify({
        nome:conta.nome, cnpj:conta.cnpj, telefone:telefone.replace(/\D/g, ''), endereco:paraEnvio(endereco),
      }) })
      setConta(atualizada); setEndereco(enderecoDoServidor(atualizada.endereco))
      setMensagem('Dados de cobrança atualizados.')
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar.') }
    finally { setOcupado(false) }
  }

  if (!conta) return <section className="card settings-card"><Carregando/>{erro && <AvisoErro message={erro}/>}</section>

  return <form className="settings-form-wrap" onSubmit={salvar}>
    {erro && <AvisoErro message={erro}/>}
    {mensagem && <div className="alert alert-success">{mensagem}</div>}
    <section className="card settings-card">
      <div className="card-header"><div><h2><MapPin/> Endereço e contato</h2><p>A operadora de pagamento exige estes dados para emitir a cobrança da assinatura.</p></div></div>
      <div className="settings-form">
        <CamposEndereco telefone={telefone} setTelefone={setTelefone} endereco={endereco} setEndereco={setEndereco} desabilitado={somenteLeitura}/>
      </div>
    </section>
    {somenteLeitura
      ? <div className="alert alert-warning">Somente administradores da conta podem alterar estes dados.</div>
      : <button className="button button-primary" disabled={ocupado}><Save/>{ocupado ? 'Salvando...' : 'Salvar dados'}</button>}
  </form>
}

export default function PaginaConfiguracoes() {
  return <div className="page">
    <div className="page-header"><div><span className="eyebrow green">Administração</span><h1>Dados da farmácia</h1><p>Informações usadas nos pedidos de compra e na cobrança da assinatura.</p></div></div>
    <CardIdentificacao/>
    <CardCobranca/>
  </div>
}
