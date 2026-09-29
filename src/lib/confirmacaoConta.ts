/* Regras compartilhadas pelos modais de desativar e reativar conta da tela de staff. */

/* Mesmo mínimo do backend (ver StaffDtos.SolicitacaoDesativacao): um motivo de uma palavra não
   explica nada para quem ler a auditoria depois. */
export const MOTIVO_MINIMO = 10

export function formatarCnpj(valor:string|null) {
  if (!valor) return '-'
  const digitos = valor.replace(/\D/g, '').slice(0, 14)
  return digitos.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2')
}
