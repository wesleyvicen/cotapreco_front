import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  LogOut,
  PackageCheck,
  Plus,
  Save,
  Search,
  Send,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  apiPublica,
  apiRepresentante,
  date,
  ErroApi,
  money,
  removerTokenRepresentante,
  salvarTokenRepresentante,
} from "../api";
import {
  AvisoErro,
  Carregando,
  EtiquetaStatus,
  EstadoVazio,
} from "../components/ComponentesUI";
import type {
  CotacaoPublica,
  ItemRespostaPublica,
  Representante,
  RespostaAutenticacaoRepresentante,
  RespostaPublica,
  ResumoRespostaPublica,
} from "../types";
import { LinkInterno, usarParametros } from "../roteamento";

type AbaAutenticacao = "entrar" | "cadastro" | "esqueci";
const dadosLogin = { telefone: "", senha: "" };
const dadosCadastro = {
  nome: "",
  telefone: "",
  email: "",
  senha: "",
  confirmacao: "",
};
const dadosDistribuidora = {
  nomeDistribuidora: "",
  documentoDistribuidora: "",
};

const notaQuantidadeMinima = (quantidade: number) =>
  `Preço válido a partir de ${quantidade} un.`;

export default function PaginaRespostaPublica() {
  const { token = "" } = usarParametros();
  const [cotacao, setCotacao] = useState<CotacaoPublica | null>(null);
  const [representante, setRepresentante] = useState<Representante | null>(
    null,
  );
  const [respostas, setRespostas] = useState<ResumoRespostaPublica[]>([]);
  const [resposta, setResposta] = useState<RespostaPublica | null>(null);
  const [aba, setAba] = useState<AbaAutenticacao>("entrar");
  const [login, setLogin] = useState(dadosLogin);
  const [cadastro, setCadastro] = useState(dadosCadastro);
  const [emailRecuperacao, setEmailRecuperacao] = useState("");
  const [distribuidora, setDistribuidora] = useState(dadosDistribuidora);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [criando, setCriando] = useState(false);
  const [revisando, setRevisando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [errosCampos, setErrosCampos] = useState<Record<string, string>>({});
  const [versaoAutoSave, setVersaoAutoSave] = useState(0);
  const [estadoAutoSave, setEstadoAutoSave] = useState<
    "idle" | "pending" | "saving" | "saved" | "error"
  >("idle");
  const respostaRef = useRef<RespostaPublica | null>(null);
  const salvandoAutomaticamente = useRef(false);
  const alteracaoDuranteSalvamento = useRef(false);

  useEffect(() => {
    let ativo = true;
    const carregar = async () => {
      try {
        const visao = await apiPublica<CotacaoPublica>(
          `/publico/cotacoes/${token}`,
        );
        if (!ativo) return;
        setCotacao(visao);
        if (localStorage.getItem("cotapreco_token_representante")) {
          try {
            const conta = await apiRepresentante<Representante>(
              "/publico/representantes/eu",
            );
            if (!ativo) return;
            setRepresentante(conta);
            setRespostas(
              await apiRepresentante<ResumoRespostaPublica[]>(
                `/publico/cotacoes/${token}/minhas-respostas`,
              ),
            );
          } catch {
            if (ativo) setRepresentante(null);
          }
        }
      } catch (e) {
        if (ativo) setErro(mensagemErro(e, "Cotação não encontrada."));
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    void carregar();
    return () => {
      ativo = false;
    };
  }, [token]);

  const limparAvisos = () => {
    setErro("");
    setMensagem("");
  };
  const carregarRespostas = async () =>
    setRespostas(
      await apiRepresentante<ResumoRespostaPublica[]>(
        `/publico/cotacoes/${token}/minhas-respostas`,
      ),
    );
  const autenticar = async (event: FormEvent) => {
    event.preventDefault();
    setOcupado(true);
    limparAvisos();
    try {
      const resultado = await apiPublica<RespostaAutenticacaoRepresentante>(
        "/publico/representantes/login",
        { method: "POST", body: JSON.stringify(login) },
      );
      salvarTokenRepresentante(resultado.token);
      setRepresentante(resultado.representante);
      await carregarRespostas();
    } catch (e) {
      setErro(mensagemErro(e, "Não foi possível entrar."));
    } finally {
      setOcupado(false);
    }
  };
  const cadastrar = async (event: FormEvent) => {
    event.preventDefault();
    limparAvisos();
    if (cadastro.senha !== cadastro.confirmacao) {
      setErro("As senhas não coincidem.");
      return;
    }
    setOcupado(true);
    try {
      const resultado = await apiPublica<RespostaAutenticacaoRepresentante>(
        "/publico/representantes/cadastro",
        {
          method: "POST",
          body: JSON.stringify({
            tokenCotacao: token,
            nome: cadastro.nome,
            telefone: cadastro.telefone,
            email: cadastro.email,
            senha: cadastro.senha,
          }),
        },
      );
      salvarTokenRepresentante(resultado.token);
      setRepresentante(resultado.representante);
      setRespostas([]);
    } catch (e) {
      setErro(mensagemErro(e, "Não foi possível criar a conta."));
    } finally {
      setOcupado(false);
    }
  };
  const recuperarSenha = async (event: FormEvent) => {
    event.preventDefault();
    setOcupado(true);
    limparAvisos();
    try {
      const resultado = await apiPublica<{ mensagem: string }>(
        "/publico/representantes/esqueci-senha",
        { method: "POST", body: JSON.stringify({ email: emailRecuperacao }) },
      );
      setMensagem(resultado.mensagem);
    } catch (e) {
      setErro(mensagemErro(e, "Não foi possível solicitar a redefinição."));
    } finally {
      setOcupado(false);
    }
  };
  const sair = () => {
    removerTokenRepresentante();
    setRepresentante(null);
    setRespostas([]);
    setResposta(null);
    setCriando(false);
    setAba("entrar");
    setErrosCampos({});
    limparAvisos();
  };
  const criarResposta = async (event: FormEvent) => {
    event.preventDefault();
    setOcupado(true);
    limparAvisos();
    try {
      const criada = await apiRepresentante<RespostaPublica>(
        `/publico/cotacoes/${token}/respostas`,
        { method: "POST", body: JSON.stringify(distribuidora) },
      );
      setResposta(criada);
      setCriando(false);
      setDistribuidora(dadosDistribuidora);
    } catch (e) {
      setErro(mensagemErro(e, "Não foi possível criar a proposta."));
    } finally {
      setOcupado(false);
    }
  };
  const abrirResposta = async (id: number) => {
    setOcupado(true);
    limparAvisos();
    setErrosCampos({});
    try {
      setResposta(
        await apiRepresentante<RespostaPublica>(
          `/publico/cotacoes/${token}/respostas/${id}`,
        ),
      );
    } catch (e) {
      setErro(mensagemErro(e, "Não foi possível abrir a proposta."));
    } finally {
      setOcupado(false);
    }
  };
  const marcarAlteracao = () => {
    alteracaoDuranteSalvamento.current = true;
    setVersaoAutoSave((versao) => versao + 1);
    setEstadoAutoSave("pending");
  };
  const alterarItem = (id: number, alteracao: Partial<ItemRespostaPublica>) => {
    setErrosCampos((atuais) => {
      const prefixo = `itens.${id}.`;
      if (alteracao.disponivel === false)
        return Object.fromEntries(
          Object.entries(atuais).filter(
            ([campo]) => !campo.startsWith(prefixo),
          ),
        );
      const corrigidos = new Set(Object.keys(alteracao));
      if ("quantidadeDisponivel" in alteracao) corrigidos.add("observacao");
      return Object.fromEntries(
        Object.entries(atuais).filter(
          ([campo]) =>
            !campo.startsWith(prefixo) ||
            !corrigidos.has(campo.slice(prefixo.length)),
        ),
      );
    });
    setResposta((atual) =>
      atual
        ? {
            ...atual,
            itens: atual.itens.map((item) =>
              item.id === id ? { ...item, ...alteracao } : item,
            ),
          }
        : atual,
    );
    marcarAlteracao();
  };
  const alterarResposta = (nova: RespostaPublica) => {
    setResposta(nova);
    marcarAlteracao();
  };
  const corpoResposta = (
    fonte: RespostaPublica | null = resposta,
    autoSave = false,
  ) => ({
    nomeDistribuidora: fonte?.nomeDistribuidora,
    documentoDistribuidora: fonte?.documentoDistribuidora,
    itens: fonte?.itens.map((item) => ({
      id: item.id,
      precoUnitario: item.disponivel ? item.precoUnitario : null,
      quantidadeDisponivel: item.disponivel ? item.quantidadeDisponivel : null,
      disponivel: item.disponivel,
      observacao: item.observacao,
    })),
    autoSave,
  });
  useEffect(() => {
    respostaRef.current = resposta;
  }, [resposta]);
  useEffect(() => {
    if (!versaoAutoSave) return;
    const espera = window.setTimeout(async () => {
      const atual = respostaRef.current;
      if (!atual?.podeCorrigir || salvandoAutomaticamente.current) return;
      salvandoAutomaticamente.current = true;
      alteracaoDuranteSalvamento.current = false;
      setEstadoAutoSave("saving");
      try {
        await apiRepresentante<RespostaPublica>(
          `/publico/cotacoes/${token}/respostas/${atual.id}`,
          {
            method: "PUT",
            body: JSON.stringify({
              nomeDistribuidora: atual.nomeDistribuidora,
              documentoDistribuidora: atual.documentoDistribuidora,
              itens: atual.itens.map((item) => ({
                id: item.id,
                precoUnitario: item.disponivel ? item.precoUnitario : null,
                quantidadeDisponivel: item.disponivel
                  ? item.quantidadeDisponivel
                  : null,
                disponivel: item.disponivel,
                observacao: item.observacao,
              })),
              autoSave: true,
            }),
          },
        );
        setEstadoAutoSave("saved");
      } catch {
        setEstadoAutoSave("error");
      } finally {
        salvandoAutomaticamente.current = false;
        if (alteracaoDuranteSalvamento.current) {
          setEstadoAutoSave("pending");
          setVersaoAutoSave((versao) => versao + 1);
        }
      }
    }, 900);
    return () => window.clearTimeout(espera);
  }, [versaoAutoSave, token]);
  const focarPrimeiroErro = (campos: Record<string, string>) => {
    if (!resposta) return;
    const item = resposta.itens.find((i) =>
      Object.keys(campos).some((c) => c.startsWith(`itens.${i.id}.`)),
    );
    if (!item) return;
    const campo = Object.keys(campos)
      .find((c) => c.startsWith(`itens.${item.id}.`))
      ?.split(".")
      .at(-1);
    window.setTimeout(() => {
      const cartao = document.querySelector<HTMLElement>(
        `[data-item-id="${item.id}"]`,
      );
      cartao?.scrollIntoView({ behavior: "smooth", block: "center" });
      cartao
        ?.querySelector<HTMLInputElement>(`[data-field="${campo}"]`)
        ?.focus({ preventScroll: true });
    }, 80);
  };
  const validarResposta = () => {
    if (!resposta) return false;
    const campos: Record<string, string> = {};
    for (const item of resposta.itens)
      if (item.disponivel) {
        const prefixo = `itens.${item.id}.`;
        if (!item.precoUnitario || item.precoUnitario <= 0)
          campos[`${prefixo}precoUnitario`] =
            "Informe um preço unitário maior que zero.";
        if (!item.quantidadeDisponivel || item.quantidadeDisponivel <= 0)
          campos[`${prefixo}quantidadeDisponivel`] =
            "Informe uma quantidade disponível maior que zero.";
        if (
          (item.quantidadeDisponivel ?? 0) > item.quantidadeSolicitada &&
          !item.observacao?.trim()
        )
          campos[`${prefixo}observacao`] =
            "Explique por que a quantidade disponível é maior que a solicitada.";
      }
    setErrosCampos(campos);
    if (Object.keys(campos).length) {
      setErro("Corrija os produtos destacados para continuar.");
      focarPrimeiroErro(campos);
      return false;
    }
    return true;
  };
  const aplicarErro = (e: unknown, padrao: string) => {
    setErro(mensagemErro(e, padrao));
    if (e instanceof ErroApi && Object.keys(e.fields).length) {
      setErrosCampos(e.fields);
      focarPrimeiroErro(e.fields);
    }
  };
  const salvarResposta = async (mostrarRevisao = false) => {
    if (!resposta || !validarResposta()) return;
    limparAvisos();
    if (mostrarRevisao) {
      setRevisando(true);
      return;
    }
    setOcupado(true);
    try {
      setResposta(
        await apiRepresentante<RespostaPublica>(
          `/publico/cotacoes/${token}/respostas/${resposta.id}`,
          { method: "PUT", body: JSON.stringify(corpoResposta()) },
        ),
      );
      setSalvo(true);
      setEstadoAutoSave("saved");
      window.setTimeout(() => setSalvo(false), 1800);
    } catch (e) {
      aplicarErro(e, "Não foi possível salvar.");
    } finally {
      setOcupado(false);
    }
  };
  const enviarResposta = async () => {
    if (!resposta || !validarResposta()) return;
    setOcupado(true);
    limparAvisos();
    try {
      const atualizada = await apiRepresentante<RespostaPublica>(
        `/publico/cotacoes/${token}/respostas/${resposta.id}`,
        { method: "PUT", body: JSON.stringify(corpoResposta()) },
      );
      const enviada =
        resposta.status === "SUBMITTED"
          ? atualizada
          : await apiRepresentante<RespostaPublica>(
              `/publico/cotacoes/${token}/respostas/${atualizada.id}/enviar`,
              { method: "POST" },
            );
      setResposta(enviada);
      setRevisando(false);
      setSucesso(true);
    } catch (e) {
      setRevisando(false);
      aplicarErro(e, "Não foi possível enviar a proposta.");
    } finally {
      setOcupado(false);
    }
  };
  const voltarParaLista = async () => {
    setResposta(null);
    setRevisando(false);
    setSucesso(false);
    setCriando(false);
    setErrosCampos({});
    limparAvisos();
    try {
      await carregarRespostas();
    } catch (e) {
      setErro(mensagemErro(e, "Não foi possível atualizar suas propostas."));
    }
  };

  if (carregando)
    return (
      <div className="public-page">
        <Carregando />
      </div>
    );
  if (!cotacao)
    return (
      <div className="public-page public-center">
        <Logo />
        <AvisoErro message={erro} />
      </div>
    );
  const itensCotados = resposta?.itens.filter((item) => item.disponivel) ?? [];
  const total = itensCotados.reduce(
    (soma, item) =>
      soma +
      (item.precoUnitario ?? 0) *
        Math.min(item.quantidadeDisponivel ?? 0, item.quantidadeSolicitada),
    0,
  );

  if (sucesso && resposta)
    return (
      <div className="public-page public-center">
        <Logo />
        <div className="success-icon large">
          <CheckCircle2 />
        </div>
        <span className="eyebrow green">Tudo certo!</span>
        <h1>Proposta salva com sucesso.</h1>
        <p>
          A {resposta.nomeEmpresa} já recebeu os valores da{" "}
          {resposta.nomeDistribuidora}. Você pode enviar propostas de outras
          distribuidoras pela mesma conta.
        </p>
        <div className="success-receipt">
          <Building2 />
          <div>
            <span>Distribuidora</span>
            <strong>{resposta.nomeDistribuidora}</strong>
          </div>
          <EtiquetaStatus status={resposta.status} />
        </div>
        <button
          className="button button-primary button-large"
          onClick={() => void voltarParaLista()}
        >
          Ver minhas propostas <ArrowRight />
        </button>
      </div>
    );
  if (resposta && revisando)
    return (
      <Revisao
        resposta={resposta}
        representante={representante}
        itensCotados={itensCotados}
        total={total}
        erro={erro}
        ocupado={ocupado}
        aoSair={sair}
        aoVoltar={() => setRevisando(false)}
        aoEnviar={() => void enviarResposta()}
      />
    );
  if (resposta)
    return (
      <Editor
        resposta={resposta}
        representante={representante}
        erro={erro}
        errosCampos={errosCampos}
        itensCotados={itensCotados.length}
        total={total}
        ocupado={ocupado}
        salvo={salvo}
        estadoAutoSave={estadoAutoSave}
        aoSair={sair}
        aoVoltar={() => void voltarParaLista()}
        aoAlterarItem={alterarItem}
        aoAlterarResposta={alterarResposta}
        aoSalvar={() => void salvarResposta()}
        aoRevisar={() => void salvarResposta(true)}
      />
    );

  return (
    <div className="public-page">
      <Cabecalho representante={representante} aoSair={sair} />
      <main className="public-container">
        <Introducao cotacao={cotacao} />
        {!representante ? (
          <Autenticacao
            aba={aba}
            setAba={(valor) => {
              setAba(valor);
              limparAvisos();
            }}
            login={login}
            setLogin={setLogin}
            cadastro={cadastro}
            setCadastro={setCadastro}
            email={emailRecuperacao}
            setEmail={setEmailRecuperacao}
            aoEntrar={autenticar}
            aoCadastrar={cadastrar}
            aoRecuperar={recuperarSenha}
            ocupado={ocupado}
            erro={erro}
            mensagem={mensagem}
            cadastroLiberado={cotacao.aceitaRespostas}
          />
        ) : criando ? (
          <form className="public-card" onSubmit={criarResposta}>
            <div>
              <span className="step-pill">+</span>
              <h2>Nova proposta</h2>
              <p>Identifique a distribuidora representada nesta resposta.</p>
            </div>
            {erro && <AvisoErro message={erro} />}
            <label>
              Nome da distribuidora
              <input
                required
                maxLength={160}
                value={distribuidora.nomeDistribuidora}
                onChange={(e) =>
                  setDistribuidora({
                    ...distribuidora,
                    nomeDistribuidora: e.target.value,
                  })
                }
              />
            </label>
            <label>
              CNPJ da distribuidora <small>Opcional</small>
              <input
                inputMode="numeric"
                maxLength={18}
                placeholder="00.000.000/0001-00"
                value={distribuidora.documentoDistribuidora}
                onChange={(e) =>
                  setDistribuidora({
                    ...distribuidora,
                    documentoDistribuidora: formatarCnpj(e.target.value),
                  })
                }
              />
            </label>
            <div className="form-actions">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setCriando(false)}
              >
                Cancelar
              </button>
              <button className="button button-primary" disabled={ocupado}>
                {ocupado ? (
                  "Criando..."
                ) : (
                  <>
                    Criar proposta <ArrowRight />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <ListaPropostas
            respostas={respostas}
            cotacaoAberta={cotacao.aceitaRespostas}
            aoAbrir={(id) => void abrirResposta(id)}
            aoCriar={() => {
              setCriando(true);
              limparAvisos();
            }}
            ocupado={ocupado}
            erro={erro}
          />
        )}
      </main>
      <Rodape />
    </div>
  );
}

function Editor({
  resposta,
  representante,
  erro,
  errosCampos,
  itensCotados,
  total,
  ocupado,
  salvo,
  estadoAutoSave,
  aoSair,
  aoVoltar,
  aoAlterarItem,
  aoAlterarResposta,
  aoSalvar,
  aoRevisar,
}: {
  resposta: RespostaPublica;
  representante: Representante | null;
  erro: string;
  errosCampos: Record<string, string>;
  itensCotados: number;
  total: number;
  ocupado: boolean;
  salvo: boolean;
  estadoAutoSave: "idle" | "pending" | "saving" | "saved" | "error";
  aoSair: () => void;
  aoVoltar: () => void;
  aoAlterarItem: (id: number, p: Partial<ItemRespostaPublica>) => void;
  aoAlterarResposta: (r: RespostaPublica) => void;
  aoSalvar: () => void;
  aoRevisar: () => void;
}) {
  const [busca, setBusca] = useState("");
  const [observacoesAbertas, setObservacoesAbertas] = useState<Set<number>>(
    new Set(),
  );
  const camposPreco = useRef<Record<number, HTMLInputElement | null>>({});
  const erroDo = (id: number, campo: string) =>
    errosCampos[`itens.${id}.${campo}`];
  const termo = busca
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const itensVisiveis = !termo
    ? resposta.itens
    : resposta.itens.filter((item) =>
        `${item.nomeProduto} ${item.ean ?? ""}`
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .includes(termo),
      );
  const totalItens = resposta.itens.length;
  const textoAutoSave = {
    idle: "",
    pending: "Alterações pendentes",
    saving: "Salvando automaticamente...",
    saved: "Salvo automaticamente",
    error: "Não foi possível salvar automaticamente",
  }[estadoAutoSave];
  return (
    <div className="public-page">
      <Cabecalho representante={representante} aoSair={aoSair} />
      <main className="public-container quote-container">
        <button className="text-link" onClick={aoVoltar}>
          <ArrowLeft />
          Minhas propostas
        </button>
        <section className="quote-heading">
          <span className="eyebrow green">{resposta.nomeEmpresa}</span>
          <div className="title-line">
            <div>
              <h1>{resposta.nomeDistribuidora}</h1>
              <p>{resposta.nomeCotacao}</p>
            </div>
            <EtiquetaStatus status={resposta.status} />
          </div>
          {resposta.status === "SUBMITTED" && resposta.podeCorrigir && (
            <div className="alert alert-success">
              <Edit3 />
              Esta proposta já foi enviada. As correções substituirão os valores
              anteriores.
            </div>
          )}
          {!resposta.podeCorrigir && (
            <div className="alert alert-warning">
              A cotação foi encerrada. A proposta está disponível somente para
              consulta.
            </div>
          )}
          <div className="proposal-company-fields">
            <label>
              Distribuidora
              <input
                disabled={!resposta.podeCorrigir}
                required
                value={resposta.nomeDistribuidora}
                onChange={(e) =>
                  aoAlterarResposta({
                    ...resposta,
                    nomeDistribuidora: e.target.value,
                  })
                }
              />
            </label>
            <label>
              CNPJ da distribuidora <small>Opcional</small>
              <input
                disabled={!resposta.podeCorrigir}
                inputMode="numeric"
                maxLength={18}
                placeholder="00.000.000/0001-00"
                value={resposta.documentoDistribuidora ?? ""}
                onChange={(e) =>
                  aoAlterarResposta({
                    ...resposta,
                    documentoDistribuidora: formatarCnpj(e.target.value),
                  })
                }
              />
            </label>
          </div>
          <div className="progress-line">
            <div
              style={{
                width: `${totalItens ? Math.round((itensCotados / totalItens) * 100) : 0}%`,
              }}
            />
            <span>
              {itensCotados} de {totalItens} cotados
            </span>
          </div>
        </section>
        {erro && <AvisoErro message={erro} />}
        <div className="representative-product-search">
          <Search />
          <input
            type="search"
            placeholder="Buscar produto por nome ou EAN"
            value={busca}
            onChange={(event) => setBusca(event.target.value)}
          />
          {busca && (
            <button
              type="button"
              onClick={() => setBusca("")}
              aria-label="Limpar busca"
            >
              ×
            </button>
          )}
          <span>
            {itensVisiveis.length} de {totalItens}
          </span>
        </div>
        <div className="public-products">
          {itensVisiveis.length === 0 ? (
            <EstadoVazio
              title="Nenhum produto encontrado"
              description="Tente buscar por outro nome ou EAN."
            />
          ) : (
            itensVisiveis.map((item) => {
              const indice =
                resposta.itens.findIndex(
                  (original) => original.id === item.id,
                ) + 1;
              const invalido = Object.keys(errosCampos).some((c) =>
                c.startsWith(`itens.${item.id}.`),
              );
              const excesso =
                (item.quantidadeDisponivel ?? 0) > item.quantidadeSolicitada;
              const observacaoEstaAberta = observacoesAbertas.has(item.id);
              const temObservacao = Boolean(item.observacao?.trim());
              const ativarItem = () => {
                aoAlterarItem(item.id, {
                  disponivel: true,
                  precoUnitario: item.precoUnitario,
                  quantidadeDisponivel:
                    item.quantidadeDisponivel ?? item.quantidadeSolicitada,
                });
                window.setTimeout(() => camposPreco.current[item.id]?.focus());
              };
              return (
                <article
                  data-item-id={item.id}
                  className={`public-product ${item.disponivel ? "available" : ""} ${invalido ? "product-error" : ""}`}
                  key={item.id}
                >
                  {!item.disponivel && resposta.podeCorrigir && (
                    <button
                      className="availability-card-overlay"
                      type="button"
                      aria-label={`Cotar ${item.nomeProduto}`}
                      onClick={ativarItem}
                    />
                  )}
                  <div className="product-top">
                    <span>{indice}</span>
                    <div>
                      <h3>{item.nomeProduto}</h3>
                      <p>
                        {item.ean ? `EAN ${item.ean}` : "EAN não informado"}
                      </p>
                    </div>
                    <strong>{item.quantidadeSolicitada} un.</strong>
                  </div>
                  {item.disponivel ? (
                    <label className="availability">
                      <input
                        disabled={!resposta.podeCorrigir}
                        type="checkbox"
                        checked
                        onChange={(e) =>
                          aoAlterarItem(item.id, {
                            disponivel: e.target.checked,
                            precoUnitario: e.target.checked
                              ? item.precoUnitario
                              : null,
                            quantidadeDisponivel: e.target.checked
                              ? (item.quantidadeDisponivel ??
                                item.quantidadeSolicitada)
                              : null,
                          })
                        }
                      />
                      <span>Disponível para cotar</span>
                    </label>
                  ) : (
                    <div className="availability availability-prompt">
                      <span className="availability-indicator" aria-hidden />
                      <span>
                        {resposta.podeCorrigir
                          ? "Toque para cotar"
                          : "Não cotado"}
                      </span>
                    </div>
                  )}
                  {item.disponivel && (
                    <div className="price-fields">
                      <label
                        className={
                          erroDo(item.id, "precoUnitario")
                            ? "field-invalid"
                            : ""
                        }
                      >
                        Preço por un. (R$)
                        <CampoPreco
                          id={item.id}
                          disabled={!resposta.podeCorrigir}
                          valor={item.precoUnitario}
                          referencia={(campo) => {
                            camposPreco.current[item.id] = campo;
                          }}
                          aoAlterar={(precoUnitario) =>
                            aoAlterarItem(item.id, { precoUnitario })
                          }
                        />
                        {erroDo(item.id, "precoUnitario") && (
                          <small className="field-error">
                            {erroDo(item.id, "precoUnitario")}
                          </small>
                        )}
                      </label>
                      <label
                        className={
                          erroDo(item.id, "quantidadeDisponivel")
                            ? "field-invalid"
                            : ""
                        }
                      >
                        <span className="quantity-field-label">
                          Qtde. para este preço
                          <small>Pedido: {item.quantidadeSolicitada} un.</small>
                        </span>
                        <input
                          data-field="quantidadeDisponivel"
                          disabled={!resposta.podeCorrigir}
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          value={item.quantidadeDisponivel ?? ""}
                          onChange={(e) => {
                            const quantidadeDisponivel = e.target.value
                              ? Number(e.target.value)
                              : null;
                            const notaAnterior = item.quantidadeDisponivel
                              ? notaQuantidadeMinima(item.quantidadeDisponivel)
                              : "";
                            const observacaoAtual = item.observacao?.trim();
                            const observacao =
                              quantidadeDisponivel &&
                              quantidadeDisponivel >
                                item.quantidadeSolicitada &&
                              (!observacaoAtual ||
                                observacaoAtual === notaAnterior)
                                ? notaQuantidadeMinima(quantidadeDisponivel)
                                : observacaoAtual === notaAnterior
                                  ? null
                                  : item.observacao;
                            aoAlterarItem(item.id, {
                              quantidadeDisponivel,
                              observacao,
                            });
                          }}
                        />
                        {erroDo(item.id, "quantidadeDisponivel") && (
                          <small className="field-error">
                            {erroDo(item.id, "quantidadeDisponivel")}
                          </small>
                        )}
                      </label>
                      {excesso && !observacaoEstaAberta && (
                        <div className="minimum-order-note">
                          <span>
                            {notaQuantidadeMinima(item.quantidadeDisponivel!)}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setObservacoesAbertas((atuais) =>
                                new Set(atuais).add(item.id),
                              )
                            }
                          >
                            Editar detalhe
                          </button>
                        </div>
                      )}
                      {!excesso && !observacaoEstaAberta && (
                        <button
                          className="product-note-toggle"
                          type="button"
                          onClick={() =>
                            setObservacoesAbertas((atuais) =>
                              new Set(atuais).add(item.id),
                            )
                          }
                        >
                          {temObservacao
                            ? "Ver/editar observação"
                            : "Adicionar observação"}
                        </button>
                      )}
                      {observacaoEstaAberta && (
                        <label
                          className={`full ${erroDo(item.id, "observacao") ? "field-invalid" : ""}`}
                        >
                          Observação <small>Opcional</small>
                          <input
                            data-field="observacao"
                            disabled={!resposta.podeCorrigir}
                            maxLength={500}
                            placeholder="Condição, validade, embalagem..."
                            value={item.observacao ?? ""}
                            onChange={(e) =>
                              aoAlterarItem(item.id, {
                                observacao: e.target.value,
                              })
                            }
                          />
                          {erroDo(item.id, "observacao") && (
                            <small className="field-error">
                              {erroDo(item.id, "observacao")}
                            </small>
                          )}
                        </label>
                      )}
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
        {resposta.podeCorrigir && (
          <div className="public-action-bar">
            <div>
              <span>{itensCotados} produtos cotados</span>
              <strong>{money(total)}</strong>
              <small className={`auto-save-status ${estadoAutoSave}`}>
                {textoAutoSave}
              </small>
            </div>
            {resposta.status === "IN_PROGRESS" && (
              <button
                className="button button-secondary"
                disabled={ocupado}
                onClick={aoSalvar}
              >
                <Save />
                {salvo ? "Salvo!" : "Salvar rascunho"}
              </button>
            )}
            <button
              className="button button-primary"
              disabled={ocupado || itensCotados === 0}
              onClick={aoRevisar}
            >
              {resposta.status === "SUBMITTED"
                ? "Revisar correção"
                : "Revisar e enviar"}{" "}
              <ArrowRight />
            </button>
          </div>
        )}
      </main>
      <Rodape />
    </div>
  );
}

function Revisao({
  resposta,
  representante,
  itensCotados,
  total,
  erro,
  ocupado,
  aoSair,
  aoVoltar,
  aoEnviar,
}: {
  resposta: RespostaPublica;
  representante: Representante | null;
  itensCotados: ItemRespostaPublica[];
  total: number;
  erro: string;
  ocupado: boolean;
  aoSair: () => void;
  aoVoltar: () => void;
  aoEnviar: () => void;
}) {
  return (
    <div className="public-page">
      <Cabecalho representante={representante} aoSair={aoSair} />
      <main className="public-container quote-container">
        <button className="text-link" onClick={aoVoltar}>
          <ArrowLeft />
          Voltar aos produtos
        </button>
        <section className="public-card review-card">
          <div className="success-icon small-icon">
            <PackageCheck />
          </div>
          <span className="eyebrow green">Revise antes de enviar</span>
          <h1>
            {resposta.status === "SUBMITTED"
              ? "Confirmar correção"
              : "Resumo da sua proposta"}
          </h1>
          <p>
            {resposta.status === "SUBMITTED"
              ? "A proposta anterior será substituída por estes valores."
              : "Você poderá corrigir a proposta enquanto a cotação estiver aberta."}
          </p>
          {erro && <AvisoErro message={erro} />}
          <div className="supplier-review">
            <Building2 />
            <div>
              <span>Distribuidora</span>
              <strong>{resposta.nomeDistribuidora}</strong>
            </div>
          </div>
          <div className="review-stats">
            <div>
              <span>Produtos cotados</span>
              <strong>
                {itensCotados.length} de {resposta.itens.length}
              </strong>
            </div>
            <div>
              <span>Valor total</span>
              <strong>{money(total)}</strong>
            </div>
          </div>
          <div className="review-products">
            {itensCotados.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>{item.nomeProduto}</strong>
                  <span>
                    {item.quantidadeDisponivel} un. ×{" "}
                    {money(item.precoUnitario)}
                  </span>
                </div>
                <strong>
                  {money(
                    (item.precoUnitario ?? 0) *
                      Math.min(
                        item.quantidadeDisponivel ?? 0,
                        item.quantidadeSolicitada,
                      ),
                  )}
                </strong>
              </div>
            ))}
          </div>
          <button
            className="button button-primary button-large full-button"
            disabled={ocupado || itensCotados.length === 0}
            onClick={aoEnviar}
          >
            {ocupado ? (
              "Enviando..."
            ) : (
              <>
                {resposta.status === "SUBMITTED"
                  ? "Reenviar correção"
                  : "Confirmar e enviar proposta"}{" "}
                <Send />
              </>
            )}
          </button>
          <button
            className="button button-ghost full-button"
            onClick={aoVoltar}
          >
            Continuar editando
          </button>
        </section>
      </main>
      <Rodape />
    </div>
  );
}

function Introducao({ cotacao }: { cotacao: CotacaoPublica }) {
  return (
    <section className="public-intro">
      <span className="eyebrow green">Convite para cotação</span>
      <h1>{cotacao.nomeCotacao}</h1>
      <p className="company-name">
        <Building2 />
        {cotacao.nomeEmpresa}
      </p>
      <div className="public-meta">
        <div>
          <ShoppingBag />
          <span>
            <strong>{cotacao.totalProdutos}</strong> produtos solicitados
          </span>
        </div>
        <div>
          <Clock3 />
          <span>
            <strong>Prazo</strong> {date(cotacao.expiraEm)}
          </span>
        </div>
      </div>
      {!cotacao.aceitaRespostas && (
        <div className="alert alert-warning">
          Esta cotação não está mais aceitando novas respostas ou correções.
        </div>
      )}
    </section>
  );
}
function Autenticacao({
  aba,
  setAba,
  login,
  setLogin,
  cadastro,
  setCadastro,
  email,
  setEmail,
  aoEntrar,
  aoCadastrar,
  aoRecuperar,
  ocupado,
  erro,
  mensagem,
  cadastroLiberado,
}: {
  aba: AbaAutenticacao;
  setAba: (v: AbaAutenticacao) => void;
  login: typeof dadosLogin;
  setLogin: (v: typeof dadosLogin) => void;
  cadastro: typeof dadosCadastro;
  setCadastro: (v: typeof dadosCadastro) => void;
  email: string;
  setEmail: (v: string) => void;
  aoEntrar: (e: FormEvent) => void;
  aoCadastrar: (e: FormEvent) => void;
  aoRecuperar: (e: FormEvent) => void;
  ocupado: boolean;
  erro: string;
  mensagem: string;
  cadastroLiberado: boolean;
}) {
  if (aba === "esqueci")
    return (
      <form className="public-card" onSubmit={aoRecuperar}>
        <div>
          <KeyRound />
          <h2>Esqueci minha senha</h2>
          <p>Enviaremos um link de redefinição para o e-mail cadastrado.</p>
        </div>
        {erro && <AvisoErro message={erro} />}{" "}
        {mensagem && <div className="alert alert-success">{mensagem}</div>}
        <label>
          E-mail
          <input
            required
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <button
          className="button button-primary button-large full-button"
          disabled={ocupado}
        >
          {ocupado ? "Enviando..." : "Enviar instruções"}
        </button>
        <button
          type="button"
          className="button button-ghost full-button"
          onClick={() => setAba("entrar")}
        >
          Voltar ao login
        </button>
      </form>
    );
  return (
    <section className="public-card auth-card">
      <div className="auth-tabs">
        <button
          className={aba === "entrar" ? "active" : ""}
          onClick={() => setAba("entrar")}
          type="button"
        >
          Entrar
        </button>
        <button
          className={aba === "cadastro" ? "active" : ""}
          onClick={() => setAba("cadastro")}
          type="button"
        >
          Criar conta
        </button>
      </div>
      {aba === "entrar" ? (
        <form className="stack-form" onSubmit={aoEntrar}>
          <div>
            <UserRound />
            <h2>Entre para responder</h2>
            <p>Use seu telefone e senha para acessar suas propostas.</p>
          </div>
          {erro && <AvisoErro message={erro} />}
          <label>
            Telefone
            <input
              required
              inputMode="tel"
              autoComplete="tel"
              value={login.telefone}
              onChange={(e) => setLogin({ ...login, telefone: e.target.value })}
            />
          </label>
          <label>
            Senha
            <CampoSenha
              value={login.senha}
              aoAlterar={(senha) => setLogin({ ...login, senha })}
              autoComplete="current-password"
            />
          </label>
          <button
            className="button button-primary button-large full-button"
            disabled={ocupado}
          >
            {ocupado ? "Entrando..." : "Entrar e ver propostas"}
          </button>
          <button
            type="button"
            className="forgot-link"
            onClick={() => setAba("esqueci")}
          >
            Esqueci minha senha
          </button>
        </form>
      ) : (
        <form className="stack-form" onSubmit={aoCadastrar}>
          <div>
            <UserRound />
            <h2>Crie sua conta</h2>
            <p>Uma única conta permite responder por várias distribuidoras.</p>
          </div>
          {erro && <AvisoErro message={erro} />}
          <label>
            Seu nome
            <input
              required
              maxLength={120}
              value={cadastro.nome}
              onChange={(e) =>
                setCadastro({ ...cadastro, nome: e.target.value })
              }
            />
          </label>
          <label>
            Telefone
            <input
              required
              inputMode="tel"
              value={cadastro.telefone}
              onChange={(e) =>
                setCadastro({ ...cadastro, telefone: e.target.value })
              }
            />
          </label>
          <label>
            E-mail
            <input
              required
              type="email"
              value={cadastro.email}
              onChange={(e) =>
                setCadastro({ ...cadastro, email: e.target.value })
              }
            />
          </label>
          <div className="public-form-row">
            <label>
              Senha
              <CampoSenha
                value={cadastro.senha}
                aoAlterar={(senha) => setCadastro({ ...cadastro, senha })}
                autoComplete="new-password"
              />
            </label>
            <label>
              Confirmar senha
              <CampoSenha
                value={cadastro.confirmacao}
                aoAlterar={(confirmacao) =>
                  setCadastro({ ...cadastro, confirmacao })
                }
                autoComplete="new-password"
              />
            </label>
          </div>
          <small>Use uma senha fácil de lembrar.</small>
          <button
            className="button button-primary button-large full-button"
            disabled={ocupado || !cadastroLiberado}
          >
            {ocupado ? "Criando conta..." : "Criar conta e continuar"}
          </button>
        </form>
      )}
    </section>
  );
}

function CampoSenha({
  value,
  aoAlterar,
  autoComplete,
}: {
  value: string;
  aoAlterar: (valor: string) => void;
  autoComplete: string;
}) {
  const [visivel, setVisivel] = useState(false);
  return (
    <div className="password-field">
      <input
        required
        type={visivel ? "text" : "password"}
        minLength={1}
        maxLength={72}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => aoAlterar(e.target.value)}
      />
      <button
        type="button"
        aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
        onClick={() => setVisivel((valor) => !valor)}
      >
        {visivel ? <EyeOff /> : <Eye />}
      </button>
    </div>
  );
}
function ListaPropostas({
  respostas,
  cotacaoAberta,
  aoAbrir,
  aoCriar,
  ocupado,
  erro,
}: {
  respostas: ResumoRespostaPublica[];
  cotacaoAberta: boolean;
  aoAbrir: (id: number) => void;
  aoCriar: () => void;
  ocupado: boolean;
  erro: string;
}) {
  return (
    <section className="proposals-panel">
      <div className="proposals-heading">
        <div>
          <span className="eyebrow green">Área do representante</span>
          <h2>Minhas propostas nesta cotação</h2>
          <p>Cada distribuidora possui uma proposta independente.</p>
          <LinkInterno
            className="representative-account-entry"
            to={`/representante/alterar-senha?retornar=${encodeURIComponent(window.location.pathname)}`}
          >
            <KeyRound /> Conta e senha
          </LinkInterno>
        </div>
        {cotacaoAberta && (
          <button className="button button-primary" onClick={aoCriar}>
            <Plus />
            Nova proposta
          </button>
        )}
      </div>
      {erro && <AvisoErro message={erro} />}{" "}
      {respostas.length === 0 ? (
        <EstadoVazio
          title="Nenhuma proposta criada"
          description={
            cotacaoAberta
              ? "Crie a primeira proposta para começar a informar os preços."
              : "Você não enviou propostas para esta cotação."
          }
          action={
            cotacaoAberta ? (
              <button className="button button-primary" onClick={aoCriar}>
                <Plus />
                Criar proposta
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="proposal-list">
          {respostas.map((r) => (
            <article key={r.id} className="proposal-card">
              <div className="supplier-initial">
                {r.nomeDistribuidora.charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="proposal-title">
                  <h3>{r.nomeDistribuidora}</h3>
                  <EtiquetaStatus status={r.status} />
                </div>
                <p>
                  {r.totalItensCotados} produtos cotados · {money(r.valorTotal)}
                </p>
              </div>
              <button
                className="button button-secondary"
                disabled={ocupado}
                onClick={() => aoAbrir(r.id)}
              >
                {r.status === "SUBMITTED" && cotacaoAberta ? (
                  <>
                    <Edit3 />
                    Corrigir
                  </>
                ) : (
                  <>
                    Abrir <ArrowRight />
                  </>
                )}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
function Cabecalho({
  representante,
  aoSair,
}: {
  representante: Representante | null;
  aoSair: () => void;
}) {
  return (
    <header className="public-header">
      <Logo />
      {representante ? (
        <div className="representative-session">
          <LinkInterno
            className="representative-account"
            to={`/representante/alterar-senha?retornar=${encodeURIComponent(window.location.pathname)}`}
          >
            <KeyRound />
            <span>Minha conta</span>
          </LinkInterno>
          <button onClick={aoSair} title="Sair" aria-label="Sair da conta">
            <LogOut />
          </button>
        </div>
      ) : (
        <div>
          <ShieldCheck />
          Ambiente seguro
        </div>
      )}
    </header>
  );
}
function Logo() {
  return (
    <div className="public-logo">
      <img src="/cotapreco-icon.png" alt="" />
      CotaPreço
    </div>
  );
}
function Rodape() {
  return (
    <footer className="public-footer">
      <ShieldCheck />
      Seus preços são confidenciais e visíveis apenas para a farmácia.
    </footer>
  );
}
function mensagemErro(erro: unknown, padrao: string) {
  return erro instanceof ErroApi ? erro.message : padrao;
}

function CampoPreco({
  id,
  valor,
  disabled,
  referencia,
  aoAlterar,
}: {
  id: number;
  valor: number | null;
  disabled: boolean;
  referencia?: (campo: HTMLInputElement | null) => void;
  aoAlterar: (valor: number | null) => void;
}) {
  const [digitos, setDigitos] = useState(() =>
    valor == null ? "" : String(Math.round(valor * 100)),
  );
  const atualizar = (proximo: string) => {
    const somenteNumeros = proximo.replace(/\D/g, "").slice(0, 9);
    setDigitos(somenteNumeros);
    aoAlterar(interpretarPreco(somenteNumeros));
  };
  return (
    <input
      ref={referencia}
      data-field="precoUnitario"
      aria-label={`Preço unitário do produto ${id}`}
      disabled={disabled}
      type="text"
      inputMode="numeric"
      placeholder="0,00"
      value={formatarPrecoDigitado(digitos)}
      onKeyDown={(event) => {
        if (/^\d$/.test(event.key)) {
          event.preventDefault();
          atualizar(digitos + event.key);
        } else if (event.key === "Backspace" || event.key === "Delete") {
          event.preventDefault();
          atualizar(digitos.slice(0, -1));
        }
      }}
      onPaste={(event) => {
        event.preventDefault();
        atualizar(digitos + event.clipboardData.getData("text"));
      }}
      onChange={() => undefined}
    />
  );
}

function formatarCnpj(valor: string) {
  const numeros = valor.replace(/\D/g, "").slice(0, 14);
  if (numeros.length <= 2) return numeros;
  if (numeros.length <= 5) return `${numeros.slice(0, 2)}.${numeros.slice(2)}`;
  if (numeros.length <= 8)
    return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5)}`;
  if (numeros.length <= 12)
    return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8)}`;
  return `${numeros.slice(0, 2)}.${numeros.slice(2, 5)}.${numeros.slice(5, 8)}/${numeros.slice(8, 12)}-${numeros.slice(12)}`;
}

function interpretarPreco(digitos: string) {
  if (!digitos) return null;
  const centavos =
    digitos.length === 1
      ? Number(digitos) * 100
      : digitos.length === 2
        ? Number(digitos[0]) * 100 + Number(digitos[1]) * 10
        : Number(digitos);
  return centavos / 100;
}

function formatarPrecoDigitado(digitos: string) {
  const valor = interpretarPreco(digitos);
  return valor == null
    ? ""
    : new Intl.NumberFormat("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(valor);
}
