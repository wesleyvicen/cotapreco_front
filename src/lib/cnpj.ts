/* Mesmo algoritmo do backend (helper/Cnpj.java) — confere os dígitos verificadores antes de
   mandar pro servidor, pra dar o erro na hora em vez de depois de uma ida e volta. */
export function cnpjValido(valor:string):boolean {
  const digitos = valor.replace(/\D/g, '')
  if (digitos.length !== 14) return false
  if (/^(\d)\1{13}$/.test(digitos)) return false
  return digitoVerificador(digitos, 12) === Number(digitos[12])
    && digitoVerificador(digitos, 13) === Number(digitos[13])
}

function digitoVerificador(digitos:string, tamanho:number):number {
  let soma = 0
  let peso = tamanho - 7
  for (let i = 0; i < tamanho; i++) {
    soma += Number(digitos[i]) * peso
    peso--
    if (peso < 2) peso = 9
  }
  const resto = soma % 11
  return resto < 2 ? 0 : 11 - resto
}
