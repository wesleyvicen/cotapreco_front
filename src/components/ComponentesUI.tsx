import { Inbox, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import type { StatusCotacao } from '../types'

const labels:Record<string,string>={DRAFT:'Rascunho',OPEN:'Aberta',CLOSED:'Fechada',COMPLETED:'Finalizada',CANCELLED:'Cancelada',IN_PROGRESS:'Em preenchimento',SUBMITTED:'Enviada'}
export function EtiquetaStatus({status}:{status:StatusCotacao|string}){return <span className={`badge badge-${status.toLowerCase()}`}>{labels[status]??status}</span>}
export function EstadoVazio({title='Nada por aqui',description,action}:{title?:string;description?:string;action?:ReactNode}){return <div className="empty"><div className="empty-icon"><Inbox/></div><h3>{title}</h3>{description&&<p>{description}</p>}{action}</div>}
export function Carregando(){return <div className="loading"><LoaderCircle className="spin"/>Carregando...</div>}
export function AvisoErro({message}:{message:string}){return <div className="alert alert-error">{message}</div>}
