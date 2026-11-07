"use client";

import { Check, Copy } from "lucide-react";
import { Fragment, useState, type ReactNode } from "react";

/**
 * Markdown simples para as respostas do mentor: títulos, listas, negrito, código e links.
 * Em cada bloco de código, clicar numa linha pede "Explica essa linha".
 */
export function Md({ text, onLine }: { text: string; onLine?: (line: string, lang: string) => void }) {
  return <div className="md flex flex-col gap-3 text-[15px] leading-relaxed">{blocks(text).map((b, i) => render(b, i, onLine))}</div>;
}

type Block = { t: "code"; lang: string; lines: string[] } | { t: "h"; level: number; text: string } | { t: "ul" | "ol"; items: string[]; start?: number } | { t: "p"; text: string } | { t: "quote"; text: string } | { t: "hr" };

function blocks(src: string): Block[] {
  const out: Block[] = [];
  const lines = src.replace(/\r\n/g, "\n").split("\n");
  let i = 0;
  while (i < lines.length) {
    const l = lines[i]!;
    const fence = l.match(/^\s*```\s*([\w+#.-]*)/);
    if (fence) {
      const code: string[] = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i]!)) code.push(lines[i++]!);
      i++;
      out.push({ t: "code", lang: fence[1] || "", lines: code });
      continue;
    }
    if (!l.trim()) {
      i++;
      continue;
    }
    const h = l.match(/^(#{1,4})\s+(.*)/);
    if (h) {
      out.push({ t: "h", level: h[1]!.length, text: h[2]! });
      i++;
      continue;
    }
    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(l)) {
      out.push({ t: "hr" });
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l)) {
      const ordered = /^\s*\d+[.)]\s+/.test(l);
      const start = ordered ? Number(l.match(/\d+/)![0]) : undefined;
      const items: string[] = [];
      while (i < lines.length && (ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/).test(lines[i]!)) {
        let item = lines[i]!.replace(ordered ? /^\s*\d+[.)]\s+/ : /^\s*[-*]\s+/, "");
        i++;
        // continuação do item (linha recuada que não é outro item nem código)
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]!) && !/^\s*([-*]|\d+[.)])\s+/.test(lines[i]!) && !/^\s*```/.test(lines[i]!)) item += ` ${lines[i++]!.trim()}`;
        items.push(item);
      }
      out.push({ t: ordered ? "ol" : "ul", items, start });
      continue;
    }
    if (/^\s*>/.test(l)) {
      const q: string[] = [];
      while (i < lines.length && /^\s*>/.test(lines[i]!)) q.push(lines[i++]!.replace(/^\s*>\s?/, ""));
      out.push({ t: "quote", text: q.join(" ") });
      continue;
    }
    const p: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^\s*(```|#{1,4}\s|[-*]\s|\d+[.)]\s|>)/.test(lines[i]!)) p.push(lines[i++]!);
    if (!p.length) p.push(lines[i++]!);
    out.push({ t: "p", text: p.join("\n") });
  }
  return out;
}

function render(b: Block, key: number, onLine?: (line: string, lang: string) => void): ReactNode {
  switch (b.t) {
    case "code":
      return <Code key={key} lang={b.lang} lines={b.lines} onLine={onLine} />;
    case "h":
      return (
        <p key={key} className={`font-semibold text-warn ${b.level <= 2 ? "mt-1 text-base" : ""}`}>
          {inline(b.text)}
        </p>
      );
    case "ul":
      return (
        <ul key={key} className="ml-5 flex list-disc flex-col gap-1 marker:text-warn">
          {b.items.map((x, i) => (
            <li key={i}>{inline(x)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key} start={b.start} className="ml-5 flex list-decimal flex-col gap-1 marker:font-mono marker:text-warn">
          {b.items.map((x, i) => (
            <li key={i}>{inline(x)}</li>
          ))}
        </ol>
      );
    case "quote":
      return (
        <blockquote key={key} className="border-l-2 border-warn/60 pl-3 text-muted">
          {inline(b.text)}
        </blockquote>
      );
    case "hr":
      return <hr key={key} className="border-border" />;
    default:
      return (
        <p key={key} className="whitespace-pre-wrap">
          {inline(b.text)}
        </p>
      );
  }
}

/** Negrito, itálico, `código` e [links](url). */
function inline(s: string): ReactNode {
  const parts: ReactNode[] = [];
  const re = /(\*\*(?:[^*]|\*(?!\*))+\*\*)|(`[^`]+`)|(\[[^\]]+\]\(https?:\/\/[^)\s]+\))|(\*[^*\s][^*]*\*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) parts.push(s.slice(last, m.index));
    const x = m[0];
    if (m[2]) parts.push(<code key={k++} className="rounded bg-bg/80 px-1.5 py-0.5 font-mono text-[13px] text-warn">{x.slice(1, -1)}</code>);
    else if (m[1]) parts.push(<strong key={k++} className="font-semibold text-text">{inline(x.slice(2, -2))}</strong>);
    else if (m[3]) {
      const [, label, href] = x.match(/^\[([^\]]+)\]\(([^)]+)\)$/)!;
      parts.push(
        <a key={k++} href={href} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2">
          {label}
        </a>,
      );
    } else parts.push(<em key={k++}>{x.slice(1, -1)}</em>);
    last = m.index + x.length;
  }
  if (last < s.length) parts.push(s.slice(last));
  return parts.map((p, i) => <Fragment key={i}>{p}</Fragment>);
}

function Code({ lang, lines, onLine }: { lang: string; lines: string[]; onLine?: (line: string, lang: string) => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <div className="code-block overflow-hidden rounded-lg border border-border bg-[#070910]">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5 font-mono text-[11px] text-muted">
        <span className="uppercase tracking-[0.14em] text-warn/80">{lang || "código"}</span>
        <span className="flex items-center gap-3">
          {onLine && <span className="hidden sm:inline">clique numa linha para entender</span>}
          <button onClick={copy} className="flex items-center gap-1 hover:text-text" title="Copiar">
            {copied ? <Check size={12} /> : <Copy size={12} />} {copied ? "copiado" : "copiar"}
          </button>
        </span>
      </div>
      <pre className="overflow-x-auto py-2 font-mono text-[13px] leading-6">
        {lines.map((l, i) => {
          const blank = !l.trim();
          return (
            <div
              key={i}
              role={onLine && !blank ? "button" : undefined}
              tabIndex={onLine && !blank ? 0 : undefined}
              title={onLine && !blank ? "Explica essa linha" : undefined}
              onClick={() => onLine && !blank && onLine(l, lang)}
              onKeyDown={(e) => e.key === "Enter" && onLine && !blank && onLine(l, lang)}
              className={`code-line flex gap-3 px-3 ${onLine && !blank ? "cursor-pointer hover:bg-warn/10" : ""}`}
            >
              <span className="w-6 shrink-0 select-none text-right text-muted/60">{i + 1}</span>
              <span className="whitespace-pre text-text">{l || " "}</span>
            </div>
          );
        })}
      </pre>
    </div>
  );
}
