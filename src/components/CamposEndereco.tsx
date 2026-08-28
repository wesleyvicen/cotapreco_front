import { LoaderCircle } from 'lucide-react'
import { useState } from 'react'
import { buscarCep, formatarCep, formatarTelefone, type FormularioEndereco } from '../lib/endereco'

/* Campos compartilhados entre Dados da farmácia e o passo antes do pagamento: a mesma
   informação pedida em dois lugares tem que ser pedida do mesmo jeito. */
export default function CamposEndereco({ telefone, setTelefone, endereco, setEndereco, desabilitado = false }:{
  telefone:string; setTelefone:(valor:string) => void
  endereco:FormularioEndereco; setEndereco:(endereco:FormularioEndereco) => void
  desabilitado?:boolean
}) {
  const [buscando, setBuscando] = useState(false)
  const alterar = (campo:keyof FormularioEndereco, valor:string) => setEndereco({ ...endereco, [campo]:valor })

  /* O CEP preenche rua, bairro e cidade sozinho: são três campos a menos para digitar no
     celular, e menos chance de o endereço sair errado da cobrança. */
  const completarPeloCep = async (cep:string) => {
    if (cep.replace(/\D/g, '').length !== 8) return
    setBuscando(true)
    const encontrado = await buscarCep(cep)
    setBuscando(false)
    if (encontrado) setEndereco({ ...endereco, cep, ...encontrado })
  }

  return <div className="endereco-grid">
    <label className="endereco-telefone">Telefone
      <input required inputMode="tel" maxLength={15} disabled={desabilitado} placeholder="(00) 00000-0000"
        value={telefone} onChange={evento => setTelefone(formatarTelefone(evento.target.value))}/>
    </label>
    <label className="endereco-cep">CEP
      <span className="endereco-cep-campo">
        <input required inputMode="numeric" maxLength={9} disabled={desabilitado} placeholder="00000-000"
          value={endereco.cep}
          onChange={evento => { const cep = formatarCep(evento.target.value); alterar('cep', cep); void completarPeloCep(cep) }}/>
        {buscando && <LoaderCircle className="spin"/>}
      </span>
      <small>Preenche rua, bairro e cidade sozinho.</small>
    </label>
    <label className="endereco-logradouro">Logradouro
      <input required maxLength={160} disabled={desabilitado} placeholder="Rua, avenida..."
        value={endereco.logradouro} onChange={evento => alterar('logradouro', evento.target.value)}/>
    </label>
    <label className="endereco-numero">Número
      <input required maxLength={20} disabled={desabilitado} placeholder="123"
        value={endereco.numero} onChange={evento => alterar('numero', evento.target.value)}/>
    </label>
    <label className="endereco-complemento"><span className="endereco-rotulo">Complemento <small>Opcional</small></span>
      <input maxLength={120} disabled={desabilitado} placeholder="Sala, loja, andar"
        value={endereco.complemento} onChange={evento => alterar('complemento', evento.target.value)}/>
    </label>
    <label className="endereco-bairro">Bairro
      <input required maxLength={120} disabled={desabilitado}
        value={endereco.bairro} onChange={evento => alterar('bairro', evento.target.value)}/>
    </label>
    <label className="endereco-cidade">Cidade
      <input required maxLength={120} disabled={desabilitado}
        value={endereco.cidade} onChange={evento => alterar('cidade', evento.target.value)}/>
    </label>
    <label className="endereco-uf">UF
      <input required maxLength={2} disabled={desabilitado} placeholder="PE"
        value={endereco.uf} onChange={evento => alterar('uf', evento.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}/>
    </label>
  </div>
}
