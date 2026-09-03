import type { Usuario } from '../types'

export const CHAVE_TOKEN_FARMACIA='cotapreco_token'
export const CHAVE_USUARIO_FARMACIA='cotapreco:usuario-farmacia'
export const CHAVE_EMPRESA_ATIVA='cotapreco:empresa-ativa'

interface UsuarioPersistido {
  versao:1
  usuario:Usuario
  atualizadoEm:number
}

function usuarioValido(valor:unknown):valor is Usuario {
  if(!valor||typeof valor!=='object')return false
  const usuario=valor as Partial<Usuario>
  return typeof usuario.id==='number'
    &&typeof usuario.name==='string'
    &&typeof usuario.email==='string'
    &&typeof usuario.groupId==='number'
    &&typeof usuario.groupName==='string'
    &&Array.isArray(usuario.companies)
}

export function possuiTokenFarmacia(){
  try{return Boolean(window.localStorage.getItem(CHAVE_TOKEN_FARMACIA))}catch{return false}
}

export function salvarTokenFarmacia(token:string){
  window.localStorage.setItem(CHAVE_TOKEN_FARMACIA,token)
}

export function lerUsuarioFarmacia():Usuario|null {
  try{
    const texto=window.localStorage.getItem(CHAVE_USUARIO_FARMACIA)
    if(!texto)return null
    const registro=JSON.parse(texto) as Partial<UsuarioPersistido>
    if(registro.versao!==1||!usuarioValido(registro.usuario)){
      window.localStorage.removeItem(CHAVE_USUARIO_FARMACIA)
      return null
    }
    return registro.usuario
  }catch{
    try{window.localStorage.removeItem(CHAVE_USUARIO_FARMACIA)}catch{/* O navegador pode bloquear o armazenamento. */}
    return null
  }
}

/* Guarda também a farmácia ativa (a primeira do vínculo, sem seletor na tela ainda) para o
   cliente HTTP mandar X-Empresa-Id sem depender de estado do React. */
export function salvarUsuarioFarmacia(usuario:Usuario){
  const registro:UsuarioPersistido={versao:1,usuario,atualizadoEm:Date.now()}
  try{
    window.localStorage.setItem(CHAVE_USUARIO_FARMACIA,JSON.stringify(registro))
    const empresa=usuario.companies[0]
    if(empresa)window.localStorage.setItem(CHAVE_EMPRESA_ATIVA,String(empresa.id))
    else window.localStorage.removeItem(CHAVE_EMPRESA_ATIVA)
  }catch{/* A sessão continua válida mesmo sem hidratação local. */}
}

export function lerEmpresaAtivaId():number|null {
  try{
    const valor=window.localStorage.getItem(CHAVE_EMPRESA_ATIVA)
    return valor?Number(valor):null
  }catch{return null}
}

export function limparSessaoFarmaciaLocal(){
  try{
    window.localStorage.removeItem(CHAVE_TOKEN_FARMACIA)
    window.localStorage.removeItem(CHAVE_USUARIO_FARMACIA)
    window.localStorage.removeItem(CHAVE_EMPRESA_ATIVA)
  }catch{/* O redirecionamento e o backend ainda encerram a sessão. */}
}
