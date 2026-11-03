"use client";

import { useState } from "react";
import { Star, Copy, Check } from "lucide-react";
import { renderDiscordText } from "@/lib/discord-markdown";
import { copyToClipboard } from "@/lib/clipboard";
import { useToast } from "@/components/ToastProvider";

type FavoriteMessage = { id: string; content: string; groupName: string };

export default function DashboardFavoriteMessages({ items }: { items: FavoriteMessage[] }) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
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
          {items.map((it) => (
            <div
              key={it.id}
              className="flex items-start justify-between gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm leading-relaxed">{renderDiscordText(it.content)}</p>
                <p className="text-xs text-[rgb(var(--muted))] mt-0.5">{it.groupName}</p>
              </div>
              <button
                onClick={() => copy(it.id, it.content)}
                className={`p-1.5 rounded-lg shrink-0 transition-colors ${
                  copiedId === it.id
                    ? "text-[rgb(var(--success))]"
                    : "text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] hover:bg-white/[0.06]"
                }`}
              >
                {copiedId === it.id ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
