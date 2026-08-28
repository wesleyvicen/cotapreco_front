import { Building2, MapPin, Save } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { api, ErroApi } from '../api'
import { usarAutenticacao } from '../autenticacao'
import CamposEndereco from '../components/CamposEndereco'
import { AvisoErro, Carregando } from '../components/ComponentesUI'
import { enderecoDoServidor, enderecoVazio, formatarTelefone, paraEnvio, type FormularioEndereco } from '../lib/endereco'
import type { Empresa } from '../types'

export default function PaginaConfiguracoes() {
  const { user } = usarAutenticacao()
  const [empresa, setEmpresa] = useState<Empresa|null>(null)
  const [nome, setNome] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [telefone, setTelefone] = useState('')
  const [endereco, setEndereco] = useState<FormularioEndereco>(enderecoVazio)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const somenteLeitura = user?.role !== 'ADMIN'

  useEffect(() => {
    api<Empresa>('/company').then(dados => {
      setEmpresa(dados); setNome(dados.nome); setCnpj(formatarCnpj(dados.cnpj ?? ''))
      setTelefone(formatarTelefone(dados.telefone ?? '')); setEndereco(enderecoDoServidor(dados.endereco))
    }).catch(e => setErro(e instanceof ErroApi ? e.message : 'Falha ao carregar os dados.'))
  }, [])

  const salvar = async (evento:FormEvent) => {
    evento.preventDefault(); setErro(''); setMensagem(''); setOcupado(true)
    try {
      const atualizada = await api<Empresa>('/company', { method:'PUT', body:JSON.stringify({
        nome, cnpj:cnpj.replace(/\D/g, ''), telefone:telefone.replace(/\D/g, ''), endereco:paraEnvio(endereco),
      }) })
      setEmpresa(atualizada); setCnpj(formatarCnpj(atualizada.cnpj ?? ''))
      setEndereco(enderecoDoServidor(atualizada.endereco))
      setMensagem('Dados da farmácia atualizados.')
    } catch (e) { setErro(e instanceof ErroApi ? e.message : 'Não foi possível salvar.') }
    finally { setOcupado(false) }
  }

  if (!empresa) return <div className="page"><Carregando/>{erro && <AvisoErro message={erro}/>}</div>

  return <div className="page">
    <div className="page-header"><div><span className="eyebrow green">Administração</span><h1>Dados da farmácia</h1><p>Informações usadas nos pedidos de compra e na cobrança da assinatura.</p></div></div>
    <form className="settings-form-wrap" onSubmit={salvar}>
      {erro && <AvisoErro message={erro}/>}
      {mensagem && <div className="alert alert-success">{mensagem}</div>}

      <section className="card settings-card">
        <div className="card-header"><div><h2><Building2/> Identificação fiscal</h2><p>O CNPJ é obrigatório para gerar pedidos em PDF e imagem.</p></div></div>
        <div className="stack-form settings-form">
          <label>Nome da farmácia<input required maxLength={160} disabled={somenteLeitura} value={nome} onChange={e => setNome(e.target.value)}/></label>
          <label>CNPJ<input required inputMode="numeric" maxLength={18} disabled={somenteLeitura} value={cnpj} onChange={e => setCnpj(formatarCnpj(e.target.value))}/><small>Informe os 14 dígitos do CNPJ.</small></label>
        </div>
      </section>

      <section className="card settings-card">
        <div className="card-header"><div><h2><MapPin/> Endereço e contato</h2><p>A operadora de pagamento exige estes dados para emitir a cobrança da assinatura.</p></div></div>
        <div className="settings-form">
          <CamposEndereco telefone={telefone} setTelefone={setTelefone} endereco={endereco} setEndereco={setEndereco} desabilitado={somenteLeitura}/>
        </div>
      </section>

      {somenteLeitura
        ? <div className="alert alert-warning">Somente administradores podem alterar estes dados.</div>
        : <button className="button button-primary" disabled={ocupado}><Save/>{ocupado ? 'Salvando...' : 'Salvar dados'}</button>}
    </form>
  </div>
}

function formatarCnpj(valor:string) {
  const digitos = valor.replace(/\D/g, '').slice(0, 14)
  return digitos.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}
