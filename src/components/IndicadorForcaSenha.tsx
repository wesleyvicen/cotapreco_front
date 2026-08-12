type NivelForcaSenha = "starting" | "medium" | "strong";

function avaliarForcaSenha(senha: string): {
  nivel: NivelForcaSenha;
  percentual: number;
  mensagem: string;
} {
  const criterios = [
    senha.length >= 8,
    /[a-z]/.test(senha) && /[A-Z]/.test(senha),
    /\d/.test(senha),
    /[^A-Za-z\d]/.test(senha),
  ].filter(Boolean).length;

  if (criterios <= 1)
    return {
      nivel: "starting",
      percentual: 25,
      mensagem:
        "Pode continuar com esta senha; mais caracteres deixam sua conta mais protegida.",
    };
  if (criterios <= 3)
    return {
      nivel: "medium",
      percentual: 60,
      mensagem: "Está no caminho certo. Adicione mais variedade para reforçar.",
    };
  return { nivel: "strong", percentual: 100, mensagem: "Senha forte." };
}

export function IndicadorForcaSenha({ senha }: { senha: string }) {
  if (!senha) return null;
  const { nivel, mensagem, percentual } = avaliarForcaSenha(senha);
  return (
    <div className="password-strength" aria-live="polite">
      <div className="password-strength-track" aria-hidden="true">
        <span
          className={`password-strength-fill ${nivel}`}
          style={{ width: `${percentual}%` }}
        />
      </div>
      <small>{mensagem}</small>
    </div>
  );
}
