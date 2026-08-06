const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api'

export class ErroApi extends Error { fields: Record<string,string>; constructor(message:string, fields:Record<string,string>={}) { super(message); this.fields=fields } }

export async function api<T>(path:string, options:RequestInit = {}):Promise<T> {
  const token = localStorage.getItem('cotapreco_token')
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData)) headers.set('Content-Type','application/json')
  if (token) headers.set('Authorization',`Bearer ${token}`)
  const response = await fetch(`${API_URL}${path}`,{...options,headers})
  if (response.status === 401) { localStorage.removeItem('cotapreco_token'); if (!path.startsWith('/public')) window.location.href='/login' }
  if (!response.ok) { const body = await response.json().catch(()=>({})); throw new ErroApi(body.message ?? 'Não foi possível concluir a operação.', body.fields ?? {}) }
  return response.status === 204 ? undefined as T : response.json()
}
export const money = (value:number|null|undefined) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value ?? 0)
export const date = (value:string|null|undefined) => value ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)) : 'Sem prazo'
