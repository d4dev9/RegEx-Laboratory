import { tokenize, Token } from "./tokenizer";
import { Highlight } from "./highlighter";

export interface ExplainedToken extends Token {
  html: string;
}

export function explainRegex(pattern: string): ExplainedToken[] {
  const tokens = tokenize(pattern);
  return tokens.map((token) => ({
    ...token,
    html: generateTokenHtml(token),
  }));
}

function generateTokenHtml(token: Token): string {
  const typeColors: Record<string, string> = {
    anchor: "border-l-2 border-indigo-500",
    quantifier: "border-l-2 border-amber-500",
    charClass: "border-l-2 border-emerald-500",
    charClassRange: "border-l-2 border-emerald-400",
    charClassNegation: "border-l-2 border-rose-500",
    escape: "border-l-2 border-blue-500",
    group: "border-l-2 border-violet-500",
    groupNonCapturing: "border-l-2 border-violet-400",
    groupNamed: "border-l-2 border-violet-600",
    groupLookahead: "border-l-2 border-cyan-500",
    groupLookbehind: "border-l-2 border-cyan-400",
    alternation: "border-l-2 border-rose-400",
    dot: "border-l-2 border-slate-500",
    literal: "border-l-2 border-slate-200",
    boundary: "border-l-2 border-indigo-400",
    backreference: "border-l-2 border-orange-500",
  };

  const typeLabels: Record<string, string> = {
    anchor: "Ancla",
    quantifier: "Cuantificador",
    charClass: "Clase",
    charClassRange: "Rango",
    charClassNegation: "Clase negada",
    escape: "Escape",
    group: "Grupo",
    groupNonCapturing: "Grupo (no capt.)",
    groupNamed: "Grupo nombrado",
    groupLookahead: "Lookahead",
    groupLookbehind: "Lookbehind",
    alternation: "Alternancia",
    dot: "Punto",
    literal: "Literal",
    boundary: "Límite",
    backreference: "Referencia",
  };

  const colorClass = typeColors[token.type] || "border-l-2 border-slate-200";
  const label = typeLabels[token.type] || token.type;

  return `
    <div class="group ${colorClass} pl-2 py-0.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-r">
      <span class="font-mono text-sm text-slate-900 dark:text-slate-100">${escapeHtml(token.value)}</span>
      <span class="ml-2 text-xs text-slate-500 dark:text-slate-400 font-medium">${label}</span>
      <span class="ml-2 text-xs text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity max-w-xs truncate block">${escapeHtml(token.description)}</span>
    </div>
  `;
}

function escapeHtml(text: string): string {

  return Highlight.escapeHtml(text);
}

export function generateFullExplanation(pattern: string): string {
  const tokens = explainRegex(pattern);
  return tokens.map((t) => t.html).join("");
}