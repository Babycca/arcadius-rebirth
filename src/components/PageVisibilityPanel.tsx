"use client";

import { useEffect, useState } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";

const NAV_LABELS: Record<string, string> = {
  "/dashboard": "Tableau de bord",
  "/carte-biens-reserves": "Carte des biens réservés",
  "/carte-prix-villas": "Carte des prix des villas",
  "/prix-fixe": "Prix fixe",
  "/tarifs": "Tarifs",
  "/interieurs-possibles": "Intérieurs possibles",
  "/guide-coherences": "Guide des cohérences",
  "/guide-coherences-cayo": "Guide des cohérences — Cayo",
  "/guide-debutant": "Guide du débutant",
  "/estimation": "Estimation",
  "/formulaires": "Formulaires",
  "/mes-messages-prefaits": "Mes messages préfaits",
  "/comptabilite/mes-ventes": "Mes ventes",
  "/comptabilite": "Comptabilité",
  "/administration": "Administration",
};

type Page = { href: string; hiddenForAll: boolean; order: number };

export default function PageVisibilityPanel() {
  const [pages, setPages] = useState<Page[]>([]);

  function load() {
    fetch("/api/page-visibility")
      .then((r) => r.json())
      .then((data: Page[]) => setPages(data.sort((a, b) => a.order - b.order)));
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleHiddenForAll(href: string, hiddenForAll: boolean) {
    setPages((ps) => ps.map((p) => (p.href === href ? { ...p, hiddenForAll } : p)));
    await fetch(`/api/page-visibility/${encodeURIComponent(href.slice(1))}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiddenForAll }),
    });
  }

  async function move(index: number, dir: -1 | 1) {
    const next = [...pages];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPages(next);
    await fetch("/api/page-visibility/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hrefs: next.map((p) => p.href) }),
    });
  }

  return (
    <div className="glass-strong rounded-xl p-5 w-full">
      <h2 className="text-sm font-medium mb-1">Pages du menu</h2>
      <p className="text-xs text-[rgb(var(--muted))] mb-4">
        Visibilité globale et ordre des pages. Pour masquer une page à un compte précis, ouvre sa fiche dans le
        tableau des agents.
      </p>
      <div className="flex flex-col gap-1">
        {pages.map((p, i) => (
          <div key={p.href} className="flex items-center gap-2 py-1.5">
            <div className="flex flex-col shrink-0">
              <button onClick={() => move(i, -1)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
                <ChevronUp size={12} />
              </button>
              <button onClick={() => move(i, 1)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
                <ChevronDown size={12} />
              </button>
            </div>
            <span className="text-sm flex-1">{NAV_LABELS[p.href] ?? p.href}</span>

            <span className="text-xs text-[rgb(var(--muted))] w-16">
              {p.hiddenForAll ? "Masquée" : "Visible"}
            </span>
            <button
              onClick={() => toggleHiddenForAll(p.href, !p.hiddenForAll)}
              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                !p.hiddenForAll ? "bg-[rgb(var(--brand-500))]" : "bg-white/10"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                  !p.hiddenForAll ? "translate-x-4" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
