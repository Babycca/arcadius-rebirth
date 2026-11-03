"use client";

import { useState } from "react";
import { Star, Copy, Check, ChevronDown } from "lucide-react";
import { renderDiscordText } from "@/lib/discord-markdown";
import { copyToClipboard } from "@/lib/clipboard";
import { useToast } from "@/components/ToastProvider";

type FavoriteMessage = { id: string; content: string; groupName: string };

// Aperçu en texte brut (pas de rendu Discord complet ici : sur un long
// modèle avec titres/spoilers/séparateurs, ça rend n'importe quoi dans une
// petite carte) — tronqué, mais c'est toujours le contenu complet qui est
// copié. Le rendu complet reste disponible en dépliant via le chevron.
function previewText(content: string): string {
  const firstLine = content.split("\n").find((l) => l.trim() !== "") ?? "";
  const flat = firstLine
    .replace(/\|\|([\s\S]+?)\|\|/g, "$1")
    .replace(/[*_~`#>-]/g, "")
    .trim();
  return flat.length > 90 ? `${flat.slice(0, 90)}…` : flat;
}

// Le chevron ne sert à rien si tout tient déjà sur la ligne d'aperçu — ne
// l'affiche que si le message a plus d'une ligne ou dépasse la troncature.
function hasMoreThanPreview(content: string): boolean {
  const lines = content.split("\n").filter((l) => l.trim() !== "");
  if (lines.length > 1) return true;
  return (lines[0] ?? "").trim().length > 90;
}

export default function DashboardFavoriteMessages({ items }: { items: FavoriteMessage[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const toast = useToast();

  async function copy(id: string, content: string) {
    const ok = await copyToClipboard(content);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } else {
      toast("Impossible de copier (presse-papiers refusé par le navigateur).", "error");
    }
  }

  function toggleExpanded(id: string) {
    setExpandedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }

  return (
    <div className="card-hover glass-strong rounded-xl p-5 border border-transparent">
      <h2 className="font-medium flex items-center gap-2 mb-4">
        <Star size={15} className="text-[rgb(var(--warning))]" />
        Mes favoris
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-[rgb(var(--muted))]">
          Clique l&apos;étoile ⭐ sur un message préfait ou un formulaire pour l&apos;ajouter ici.
        </p>
      ) : (
        <div className="flex flex-col gap-1">
          {items.map((it) => {
            const open = expandedIds.includes(it.id);
            const expandable = hasMoreThanPreview(it.content);
            return (
              <div key={it.id} className="rounded-lg hover:bg-white/[0.04] transition-colors">
                <div className="flex items-center justify-between gap-3 px-3 py-2.5">
                  {expandable ? (
                    <button onClick={() => toggleExpanded(it.id)} className="min-w-0 flex-1 text-left">
                      <p className="text-sm truncate">{previewText(it.content)}</p>
                      <p className="text-xs text-[rgb(var(--muted))] mt-0.5">{it.groupName}</p>
                    </button>
                  ) : (
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{previewText(it.content)}</p>
                      <p className="text-xs text-[rgb(var(--muted))] mt-0.5">{it.groupName}</p>
                    </div>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    {expandable && (
                      <button
                        onClick={() => toggleExpanded(it.id)}
                        className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] p-1.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                      >
                        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                      </button>
                    )}
                    <button
                      onClick={() => copy(it.id, it.content)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        copiedId === it.id
                          ? "text-[rgb(var(--success))]"
                          : "text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] hover:bg-white/[0.06]"
                      }`}
                    >
                      {copiedId === it.id ? <Check size={14} /> : <Copy size={14} />}
                    </button>
                  </div>
                </div>
                {open && (
                  <div className="px-3 pb-3 text-sm leading-relaxed">{renderDiscordText(it.content)}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
