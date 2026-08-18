import type { Usuario } from '../types'

export const CHAVE_TOKEN_FARMACIA='cotapreco_token'
export const CHAVE_USUARIO_FARMACIA='cotapreco:usuario-farmacia'

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
    &&typeof usuario.role==='string'
    &&typeof usuario.companyId==='number'
    &&typeof usuario.companyName==='string'
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

export function salvarUsuarioFarmacia(usuario:Usuario){
  const registro:UsuarioPersistido={versao:1,usuario,atualizadoEm:Date.now()}
  try{window.localStorage.setItem(CHAVE_USUARIO_FARMACIA,JSON.stringify(registro))}catch{/* A sessão continua válida mesmo sem hidratação local. */}
}

export function limparSessaoFarmaciaLocal(){
  try{
    window.localStorage.removeItem(CHAVE_TOKEN_FARMACIA)
    window.localStorage.removeItem(CHAVE_USUARIO_FARMACIA)
  }catch{/* O redirecionamento e o backend ainda encerram a sessão. */}
}
