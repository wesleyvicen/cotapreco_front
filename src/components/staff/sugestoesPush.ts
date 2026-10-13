import type { ContaStaff } from '../../types'

export interface SugestaoPush { rotulo:string; motivo:string; titulo:string; mensagem:string; link:string }
type Abordagem = Omit<SugestaoPush, 'motivo'>

const DIA_MS = 86_400_000
const diasAte = (data:string, agora:number) => Math.ceil((new Date(data).getTime() - agora) / DIA_MS)
const diasDesde = (data:string, agora:number) => Math.floor((agora - new Date(data).getTime()) / DIA_MS)
const dias = (n:number) => `${n} dia${n === 1 ? '' : 's'}`
const MAXIMO = 6

/* Sugestões para o push direcionado a uma conta, a partir do que a lista do staff já sabe
   dela: assinatura, uso e cupom. Cada situação traz mais de uma abordagem (lembrete,
   benefício, ajuda, feedback), porque o mesmo texto não convence todo mundo. A ordem é
   prioridade - dinheiro parado antes de engajamento - e o motivo é o mesmo para as
   abordagens da mesma situação. */
export function sugestoesParaConta(conta:ContaStaff, agora = Date.now()):SugestaoPush[] {
  const sugestoes:SugestaoPush[] = []
  const situacao = (motivo:string, ...abordagens:Abordagem[]) => abordagens.forEach(a => sugestoes.push({ ...a, motivo }))
  const uso = conta.uso
  const pagante = !conta.emTeste && conta.acessoLiberado && !conta.cortesia
  const restamTeste = conta.emTeste && conta.acessoLiberado && conta.assinaturaAte ? diasAte(conta.assinaturaAte, agora) : null
  const idadeConta = diasDesde(conta.criadoEm, agora)

  if (conta.statusAssinatura === 'OVERDUE') situacao('A última cobrança não foi paga',
    { rotulo:'Pagamento pendente', titulo:'{nome}, não conseguimos confirmar seu pagamento',
      mensagem:'Atualize o cartão para a {farmacia} seguir cotando sem interrupção. Leva menos de um minuto.', link:'/assinatura' },
    { rotulo:'Ajuda com o pagamento', titulo:'{nome}, precisa de ajuda com o pagamento?',
      mensagem:'Se o cartão da {farmacia} mudou, é só atualizar na tela de assinatura. Ficou alguma dúvida? Fale com a gente no WhatsApp.', link:'/assinatura' })

  if (restamTeste !== null && restamTeste <= 5) situacao(`Faltam ${dias(Math.max(0, restamTeste))} de teste`,
    { rotulo:'Lembrete do fim do teste', titulo:'{nome}, faltam {dias_teste|poucos} dias do seu teste',
      mensagem:'Assine até {fim_teste|o fim do teste} e mantenha o histórico de preços da {farmacia}. Dúvidas? Fale no WhatsApp.', link:'/assinatura' },
    { rotulo:'O que perde sem assinar', titulo:'{nome}, não perca o histórico da {farmacia}',
      mensagem:'Em {dias_teste|poucos} dias o teste acaba. Assinando, as {cotacoes} cotações e os preços comparados continuam com você.', link:'/assinatura' },
    { rotulo:'Oferecer ajuda para decidir', titulo:'{nome}, posso ajudar a decidir?',
      mensagem:'Se ficou alguma dúvida sobre o CotaPreço, fale com a gente no WhatsApp. Ajudamos a montar a próxima cotação da {farmacia}.', link:'/' })

  if (conta.emTeste && conta.acessoLiberado && idadeConta <= 3) situacao(`Conta criada há ${dias(idadeConta)}`,
    { rotulo:'Boas-vindas', titulo:'{nome}, que bom ter a {farmacia} aqui!',
      mensagem:'Comece importando sua lista de compras. Em poucos minutos as distribuidoras já podem responder pelo link.', link:'/cotacoes/nova' })

  if (conta.emTeste && !conta.acessoLiberado && conta.assinaturaAte) situacao(`O teste acabou há ${dias(diasDesde(conta.assinaturaAte, agora))}`,
    { rotulo:'Conta continua salva', titulo:'{nome}, sua conta continua salva',
      mensagem:'O teste da {farmacia} acabou há {dias_vencido|alguns} dias, mas as {cotacoes} cotações estão guardadas. Assine e continue de onde parou.', link:'/assinatura' },
    { rotulo:'Perguntar o que faltou', titulo:'{nome}, o que faltou para assinar?',
      mensagem:'Queremos entender o que a {farmacia} precisa. Responda no WhatsApp: sua opinião ajuda a melhorar o CotaPreço.', link:'/' })

  if (!conta.emTeste && !conta.acessoLiberado && conta.statusAssinatura !== 'OVERDUE')
    situacao(conta.assinaturaAte ? `Acesso venceu há ${dias(diasDesde(conta.assinaturaAte, agora))}` : 'Sem acesso no momento',
      { rotulo:'Renovar acesso', titulo:'{nome}, seu acesso ao CotaPreço venceu',
        mensagem:'Renove a assinatura da {farmacia} para voltar a cotar. Seus dados e o histórico de preços continuam aqui.', link:'/assinatura' },
      { rotulo:'Perguntar o motivo', titulo:'{nome}, podemos ajudar a {farmacia} a voltar?',
        mensagem:'Se algo não funcionou como esperado, conte para a gente no WhatsApp. Queremos resolver antes de você decidir.', link:'/' })

  if (conta.cupomAtivo && !pagante) situacao(`Cupom ${conta.cupomAtivo} aplicado e ainda não assinou`,
    { rotulo:'Lembrar do cupom', titulo:'{nome}, seu cupom {cupom} está esperando',
      mensagem:'A {farmacia} tem uma condição especial: assine agora por {mensalidade|um valor promocional} ao mês.', link:'/assinatura' })

  if (uso?.situacao === 'NUNCA_COTOU') situacao('Nenhuma cotação criada desde o cadastro',
    { rotulo:'Convidar para a primeira cotação', titulo:'{saudacao}, {nome}! Vamos fazer a primeira cotação?',
      mensagem:'Importe sua lista de compras e mande o link para as distribuidoras. Em poucos minutos você compara os preços lado a lado.', link:'/cotacoes/nova' },
    { rotulo:'Oferecer ajuda para começar', titulo:'{nome}, quer ajuda na primeira cotação?',
      mensagem:'Mande sua lista para a gente no WhatsApp e montamos a primeira cotação da {farmacia} junto com você.', link:'/cotacoes/nova' },
    { rotulo:'Explicar como funciona', titulo:'{nome}, comparar preços leva poucos minutos',
      mensagem:'Importe a lista, envie o link para as distribuidoras e veja item a item quem está mais barato para a {farmacia}.', link:'/cotacoes/nova' })

  if (uso?.situacao === 'ESFRIANDO') situacao(uso.ultimoAcessoEm ? `Último acesso há ${dias(diasDesde(uso.ultimoAcessoEm, agora))}` : 'Entrando cada vez menos',
    { rotulo:'Reengajar', titulo:'{nome}, como estão as compras da {farmacia}?',
      mensagem:'Faz {dias_sem_acesso|alguns} dias que você não entra. Abra a cotação desta semana e veja se as distribuidoras baixaram os preços.', link:'/cotacoes/nova' },
    { rotulo:'Lembrete da cotação da semana', titulo:'{saudacao}, {nome}! Hora da cotação da semana?',
      mensagem:'Monte a lista de reposição da {farmacia} e mande para as distribuidoras. Quanto mais respostas, melhor o preço.', link:'/cotacoes/nova' })

  if (uso?.situacao === 'PARADO') situacao(uso.ultimoAcessoEm ? `Sem entrar há ${dias(diasDesde(uso.ultimoAcessoEm, agora))}` : 'Mais de 30 dias sem uso',
    { rotulo:'Sentimos sua falta', titulo:'{nome}, sentimos sua falta no CotaPreço',
      mensagem:'A {farmacia} não cota há mais de um mês e os preços mudaram. Abra uma cotação nova e compare as distribuidoras de novo.', link:'/cotacoes/nova' },
    { rotulo:'Perguntar se algo atrapalhou', titulo:'{nome}, aconteceu alguma coisa?',
      mensagem:'Notamos que a {farmacia} parou de cotar. Se algo atrapalhou, conte para a gente no WhatsApp.', link:'/' })

  if (uso && uso.cotacoesAbertas > 0) situacao(`${uso.cotacoesAbertas} cotaç${uso.cotacoesAbertas === 1 ? 'ão aberta' : 'ões abertas'} esperando`,
    { rotulo:'Conferir respostas', titulo:'{nome}, tem cotação esperando você',
      mensagem:'A {farmacia} tem {cotacoes_abertas} cotação(ões) aberta(s). Confira as respostas das distribuidoras.', link:'/cotacoes' },
    { rotulo:'Fechar o pedido', titulo:'{nome}, as respostas já chegaram?',
      mensagem:'Compare as propostas da cotação aberta da {farmacia} e gere o pedido de cada distribuidora pelo melhor preço.', link:'/cotacoes' })

  /* Em teste e usando, no meio do período: o momento de mostrar valor, não de cobrar. */
  if (restamTeste !== null && restamTeste > 5 && uso && uso.cotacoes > 0 && uso.situacao === 'ATIVO') situacao(`Em teste, ${uso.cotacoes} cotaç${uso.cotacoes === 1 ? 'ão' : 'ões'} até agora`,
    { rotulo:'Mostrar a economia', titulo:'{nome}, veja quanto a {farmacia} já economizou',
      mensagem:'No painel, a economia de cada cotação aparece somada. Confira e compare com o que você pagava antes.', link:'/' },
    { rotulo:'Dica de uso', titulo:'{nome}, convide mais distribuidoras',
      mensagem:'Quanto mais distribuidoras respondem, maior a chance de preço baixo. Mande o link da próxima cotação para todas.', link:'/cotacoes/nova' })

  /* Conta saudável não precisa de resgate: o push serve para fidelizar. */
  if (pagante && uso?.situacao === 'ATIVO') situacao('Cliente pagante e usando bem',
    { rotulo:'Pedir indicação', titulo:'{nome}, obrigado por cotar com a gente',
      mensagem:'Conhece outra farmácia que ainda cota pelo WhatsApp? Indique o CotaPreço e ajude um colega a economizar.', link:'/' },
    { rotulo:'Mostrar a economia', titulo:'{nome}, veja quanto a {farmacia} já economizou',
      mensagem:'No painel, a economia das suas cotações aparece somada mês a mês. Vale conferir.', link:'/' })

  /* Rótulos repetidos entre situações (ex.: "Mostrar a economia") aparecem uma vez só. */
  const vistos = new Set<string>()
  return sugestoes.filter(s => !vistos.has(s.rotulo) && vistos.add(s.rotulo)).slice(0, MAXIMO)
}
