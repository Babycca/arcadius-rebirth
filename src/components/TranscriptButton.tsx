"use client";

import { useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";
import { useDialog } from "./DialogProvider";
import { copyToClipboard } from "@/lib/clipboard";

// Copie un tableau de lignes (chaque ligne = tableau de cellules) au format
// TSV (tabulations) dans le presse-papiers : collé directement dans Google
// Sheets, ça remplit une cellule par colonne automatiquement.
export default function TranscriptButton({ rows }: { rows: (string | number | null)[][] }) {
  const { alertDialog } = useDialog();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const today = new Date().toLocaleDateString("fr-FR");
    const text = [[`Export du ${today}`], [], ...rows].map((r) => r.map((c) => c ?? "").join("\t")).join("\n");

    const ok = await copyToClipboard(text);

    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else {
      await alertDialog(
        "Impossible de copier automatiquement (le navigateur a refusé l'accès au presse-papiers). Clique une première fois quelque part sur la page, puis réessaie.",
        { title: "Copie impossible" }
      );
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 glass hover:border-[rgb(var(--brand-500)/0.4)] transition-colors ${
        copied ? "text-[rgb(var(--success))]" : ""
      }`}
      title="Copier, prêt à coller dans Google Sheets"
    >
      {copied ? <Check size={14} /> : <ClipboardCopy size={14} />}
      {copied ? "Copié !" : "Transcript"}
    </button>
  );
}
