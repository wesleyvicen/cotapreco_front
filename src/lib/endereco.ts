import type { EnderecoEmpresa } from '../types'

export interface FormularioEndereco { cep:string; logradouro:string; numero:string; complemento:string; bairro:string; cidade:string; uf:string }

export const enderecoVazio:FormularioEndereco = { cep:'', logradouro:'', numero:'', complemento:'', bairro:'', cidade:'', uf:'' }

export const formatarCep = (valor:string) => valor.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2')
export const formatarTelefone = (valor:string) => {
  const digitos = valor.replace(/\D/g, '').slice(0, 11)
  if (digitos.length <= 10) return digitos.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2')
  return digitos.replace(/^(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2')
}

export const enderecoDoServidor = (endereco:EnderecoEmpresa|null):FormularioEndereco => endereco
  ? { cep:formatarCep(endereco.cep), logradouro:endereco.logradouro, numero:endereco.numero,
      complemento:endereco.complemento ?? '', bairro:endereco.bairro, cidade:endereco.cidade, uf:endereco.uf }
  : enderecoVazio

export const paraEnvio = (formulario:FormularioEndereco) => ({
  cep:formulario.cep.replace(/\D/g, ''), logradouro:formulario.logradouro.trim(), numero:formulario.numero.trim(),
  complemento:formulario.complemento.trim() || null, bairro:formulario.bairro.trim(),
  cidade:formulario.cidade.trim(), uf:formulario.uf.trim().toUpperCase(),
})

/* Busca o CEP nos Correios via ViaCEP para a farmácia digitar dois campos em vez de seis.
   É conveniência: falha silenciosa, porque os campos continuam editáveis à mão. */
export async function buscarCep(cep:string):Promise<Partial<FormularioEndereco>|null> {
  const digitos = cep.replace(/\D/g, '')
  if (digitos.length !== 8) return null
  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${digitos}/json/`)
    if (!resposta.ok) return null
    const dados = await resposta.json() as { erro?:boolean; logradouro?:string; bairro?:string; localidade?:string; uf?:string }
    if (dados.erro) return null
    return { logradouro:dados.logradouro ?? '', bairro:dados.bairro ?? '', cidade:dados.localidade ?? '', uf:dados.uf ?? '' }
  } catch { return null }
}
