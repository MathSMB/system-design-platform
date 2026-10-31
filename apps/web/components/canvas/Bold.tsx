/** Renderiza **negrito** simples vindo do diagnóstico. */
export function Bold({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") ? <strong key={i} className="text-text">{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>,
      )}
    </>
  );
}
