"use client";

import { useState, type ReactNode } from "react";

// Rendu simplifié du markdown Discord (gras/italique/souligné/barré/code/
// liens/citations/sous-texte/spoilers/émojis personnalisés) pour afficher
// les messages préfaits comme ils apparaissent réellement sur Discord. Le
// texte brut (non transformé) reste ce qui est copié par le bouton "Copier"
// — ce rendu ne sert qu'à l'aperçu. Porté depuis site2-arcadius.

const INLINE_PATTERN = new RegExp(
  [
    "<a:(?<animName>\\w+):(?<animId>\\d+)>",
    "<:(?<emojiName>\\w+):(?<emojiId>\\d+)>",
    "\\[(?<linkText>[^\\]]+)\\]\\s*\\((?<linkUrl>https?:\\/\\/[^\\s)]+)\\)",
    "\\|\\|(?<spoiler>[\\s\\S]+?)\\|\\|",
    "\\*\\*(?<bold>[\\s\\S]+?)\\*\\*",
    "__(?<underline>[\\s\\S]+?)__",
    "~~(?<strike>[\\s\\S]+?)~~",
    "`(?<code>[^`]+)`",
    "\\*(?<italic1>[^*]+)\\*",
    "_(?<italic2>[^_]+)_",
    "(?<bareUrl>https?:\\/\\/[^\\s<>()]+)",
  ].join("|"),
  "g"
);

function stripTrailingPunctuation(url: string): { url: string; trailing: string } {
  const match = url.match(/^(.*?)([.,!?;:)]+)$/);
  if (!match) return { url, trailing: "" };
  return { url: match[1], trailing: match[2] };
}

function Spoiler({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={() => setRevealed(true)}
      className={`rounded px-1 transition ${
        revealed ? "bg-white/10" : "cursor-pointer bg-white/20 text-transparent selection:text-transparent"
      }`}
      title={revealed ? undefined : "Cliquer pour révéler"}
    >
      {children}
    </span>
  );
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  const pattern = new RegExp(INLINE_PATTERN);

  while ((match = pattern.exec(text))) {
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    const key = `${keyPrefix}-${i++}`;
    const g = match.groups!;

    if (g.animId) {
      nodes.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img key={key} src={`https://cdn.discordapp.com/emojis/${g.animId}.gif`} alt={g.animName} className="inline-block h-5 w-5 align-text-bottom" />
      );
    } else if (g.emojiId) {
      nodes.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img key={key} src={`https://cdn.discordapp.com/emojis/${g.emojiId}.webp?size=48&quality=lossless`} alt={g.emojiName} className="inline-block h-5 w-5 align-text-bottom" />
      );
    } else if (g.linkText) {
      nodes.push(
        <a key={key} href={g.linkUrl} target="_blank" rel="noopener noreferrer" className="text-[rgb(var(--brand-400))] underline hover:no-underline">
          {renderInline(g.linkText, key)}
        </a>
      );
    } else if (g.spoiler !== undefined) {
      nodes.push(<Spoiler key={key}>{renderInline(g.spoiler, key)}</Spoiler>);
    } else if (g.bold !== undefined) {
      nodes.push(<strong key={key} className="font-semibold text-[rgb(var(--foreground))]">{renderInline(g.bold, key)}</strong>);
    } else if (g.underline !== undefined) {
      nodes.push(<u key={key}>{renderInline(g.underline, key)}</u>);
    } else if (g.strike !== undefined) {
      nodes.push(<s key={key}>{renderInline(g.strike, key)}</s>);
    } else if (g.code) {
      nodes.push(<code key={key} className="rounded bg-white/10 px-1 py-0.5 text-[0.85em]">{g.code}</code>);
    } else if (g.italic1) {
      nodes.push(<em key={key}>{renderInline(g.italic1, key)}</em>);
    } else if (g.italic2) {
      nodes.push(<em key={key}>{renderInline(g.italic2, key)}</em>);
    } else if (g.bareUrl) {
      const { url, trailing } = stripTrailingPunctuation(g.bareUrl);
      nodes.push(
        <a key={key} href={url} target="_blank" rel="noopener noreferrer" className="break-all text-[rgb(var(--brand-400))] underline hover:no-underline">
          {url}
        </a>
      );
      if (trailing) nodes.push(trailing);
    }
    lastIndex = pattern.lastIndex;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function renderDiscordText(content: string): ReactNode {
  const lines = content.split("\n");
  const blocks: ReactNode[] = [];
  let listBuffer: string[] = [];
  let quoteBuffer: string[] = [];

  function flushList() {
    if (listBuffer.length === 0) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc space-y-1 pl-5">
        {listBuffer.map((line, idx) => (
          <li key={idx}>{renderInline(line, `li-${blocks.length}-${idx}`)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  }

  function flushQuote() {
    if (quoteBuffer.length === 0) return;
    blocks.push(
      <blockquote
        key={`bq-${blocks.length}`}
        className="space-y-1 text-[rgb(var(--muted))] border-l-2 border-[rgb(var(--brand-500)/0.4)] pl-4"
      >
        {quoteBuffer.map((line, idx) => (
          <p key={idx}>{renderInline(line, `bq-${blocks.length}-${idx}`)}</p>
        ))}
      </blockquote>
    );
    quoteBuffer = [];
  }

  lines.forEach((line, idx) => {
    const bulletMatch = line.match(/^\s*[*-]\s+(.*)$/);
    const quoteMatch = line.match(/^>\s?(.*)$/);
    const subtextMatch = line.match(/^-#\s+(.*)$/);
    const headingMatch = line.match(/^(#{1,2})\s+(.*)$/);

    if (headingMatch) {
      flushList();
      flushQuote();
      const level = headingMatch[1].length;
      const text = renderInline(headingMatch[2], `h-${idx}`);
      blocks.push(
        level === 1 ? (
          <h1 key={`h-${idx}`} className="text-base font-semibold text-[rgb(var(--foreground))]">{text}</h1>
        ) : (
          <h2 key={`h-${idx}`} className="text-sm font-semibold text-[rgb(var(--foreground))]">{text}</h2>
        )
      );
      return;
    }
    if (bulletMatch) {
      flushQuote();
      listBuffer.push(bulletMatch[1]);
      return;
    }
    if (quoteMatch) {
      flushList();
      quoteBuffer.push(quoteMatch[1]);
      return;
    }
    flushList();
    flushQuote();

    if (subtextMatch) {
      blocks.push(
        <p key={`sub-${idx}`} className="text-xs text-[rgb(var(--muted))]">
          {renderInline(subtextMatch[1], `sub-${idx}`)}
        </p>
      );
    } else if (line.trim() === "") {
      blocks.push(<div key={`sp-${idx}`} className="h-2" />);
    } else {
      blocks.push(<p key={`p-${idx}`}>{renderInline(line, `p-${idx}`)}</p>);
    }
  });
  flushList();
  flushQuote();

  return <div className="space-y-1">{blocks}</div>;
}
