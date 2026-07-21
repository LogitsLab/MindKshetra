import { Fragment, type ReactNode } from "react";

/** Escape text for safe embedding; we render React nodes, not HTML strings. */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  // **bold** then *italic* (non-greedy); leave unmatched markers as-is
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) {
      nodes.push(
        <Fragment key={`${keyPrefix}-t-${i++}`}>
          {text.slice(last, match.index)}
        </Fragment>
      );
    }
    if (match[1] != null) {
      nodes.push(
        <strong
          key={`${keyPrefix}-b-${i++}`}
          className="font-semibold text-[var(--text)]"
        >
          {match[1]}
        </strong>
      );
    } else if (match[2] != null) {
      nodes.push(
        <em key={`${keyPrefix}-i-${i++}`} className="italic text-[var(--text)]">
          {match[2]}
        </em>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    nodes.push(
      <Fragment key={`${keyPrefix}-t-${i++}`}>{text.slice(last)}</Fragment>
    );
  }

  return nodes;
}

function renderLine(line: string, keyPrefix: string): ReactNode {
  // Simple "- " / "• " list lines
  const listMatch = line.match(/^[-•]\s+(.+)$/);
  if (listMatch) {
    return (
      <li key={keyPrefix} className="ml-1 pl-1">
        {renderInline(listMatch[1], keyPrefix)}
      </li>
    );
  }
  return (
    <span key={keyPrefix} className="block">
      {renderInline(line, keyPrefix)}
    </span>
  );
}

type Props = {
  content: string;
  className?: string;
};

/**
 * Lightweight chat markdown: paragraphs, line breaks, **bold**, *italic*, simple lists.
 * Avoids a full markdown dependency for streamed assistant replies.
 */
export default function ChatMarkdown({ content, className = "" }: Props) {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const blocks = trimmed.split(/\n{2,}/);

  return (
    <div className={`space-y-4 ${className}`}>
      {blocks.map((block, bi) => {
        const lines = block.split("\n");
        const isList = lines.every((l) => /^[-•]\s+/.test(l.trim()) || !l.trim());
        const nonEmpty = lines.filter((l) => l.trim());

        if (isList && nonEmpty.length > 0) {
          return (
            <ul
              key={`p-${bi}`}
              className="list-disc space-y-2 pl-5 marker:text-[var(--brass-soft)]"
            >
              {nonEmpty.map((line, li) =>
                renderLine(line.trim(), `p-${bi}-l-${li}`)
              )}
            </ul>
          );
        }

        return (
          <p key={`p-${bi}`} className="space-y-2">
            {lines.map((line, li) =>
              line.trim() ? (
                <span key={`p-${bi}-l-${li}`} className="block">
                  {renderInline(line, `p-${bi}-l-${li}`)}
                </span>
              ) : (
                <span key={`p-${bi}-l-${li}`} className="block h-2" aria-hidden />
              )
            )}
          </p>
        );
      })}
    </div>
  );
}
