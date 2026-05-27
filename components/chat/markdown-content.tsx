"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function cleanAssistantText(text: string) {
  return text
    .replace(/<\|python_tag\|>[\s\S]*?(?=\n\n|$)/g, "")
    .replace(/spawn_discover\s*\([^)]*\)/g, "")
    .replace(/spawn_execute\s*\([^)]*\)/g, "")
    .trim();
}

export function MarkdownContent({
  text,
  isStreaming = false,
}: {
  text: string;
  isStreaming?: boolean;
}) {
  const cleaned = cleanAssistantText(text);
  if (!cleaned) return null;

  return (
    <div className="markdown-body space-y-4 text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children }) => (
            <div className="my-4 w-full overflow-x-auto rounded-lg border">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b bg-muted/50">{children}</thead>
          ),
          tbody: ({ children }) => <tbody className="divide-y">{children}</tbody>,
          tr: ({ children }) => <tr className="hover:bg-muted/30">{children}</tr>,
          th: ({ children }) => (
            <th className="px-4 py-2.5 font-medium text-foreground">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2.5 align-top text-muted-foreground">{children}</td>
          ),
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          h1: ({ children }) => (
            <h1 className="mb-3 mt-6 text-xl font-semibold">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-5 text-lg font-semibold">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-2 mt-4 text-base font-semibold">{children}</h3>
          ),
          hr: () => <hr className="my-6 border-border" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
              {children}
            </code>
          ),
          pre: ({ children }) => (
            <pre className="my-3 overflow-x-auto rounded-lg bg-muted p-3 text-xs">
              {children}
            </pre>
          ),
        }}
      >
        {cleaned}
      </ReactMarkdown>
      {isStreaming ? (
        <span
          className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-foreground align-middle"
          aria-hidden
        />
      ) : null}
    </div>
  );
}

export function mergeAssistantTextParts(parts: { type: string; text?: string }[]) {
  const texts = parts
    .filter((part) => part.type === "text" && part.text?.trim())
    .map((part) => cleanAssistantText(part.text!))
    .filter(Boolean);

  if (texts.length === 0) return "";
  if (texts.length === 1) return texts[0];

  // Multi-step turns often repeat the final answer; keep the richest block.
  const sorted = [...texts].sort((a, b) => b.length - a.length);
  const primary = sorted[0];
  const intro = texts.find((t) => t !== primary && t.length < primary.length * 0.5);

  if (intro && !primary.includes(intro.slice(0, 80))) {
    return `${intro}\n\n${primary}`;
  }
  return primary;
}
