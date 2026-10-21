"use client";

import { useState } from "react";
import { ClipboardCopy, Check } from "lucide-react";
import { useDialog } from "./DialogProvider";

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  // Hors écran mais PAS opacity:0 — certains navigateurs refusent de
  // sélectionner/copier un élément invisible via opacity, ce qui fait
  // échouer execCommand("copy") silencieusement (ou copier la sélection
  // précédente de la page, pas le texte voulu).
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.readOnly = true;
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

// Copie un tableau de lignes (chaque ligne = tableau de cellules) au format
// TSV (tabulations) dans le presse-papiers : collé directement dans Google
// Sheets, ça remplit une cellule par colonne automatiquement.
export default function TranscriptButton({ rows }: { rows: (string | number | null)[][] }) {
  const { alertDialog } = useDialog();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const today = new Date().toLocaleDateString("fr-FR");
    const text = [[`Export du ${today}`], [], ...rows].map((r) => r.map((c) => c ?? "").join("\t")).join("\n");

    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = fallbackCopy(text);
    }

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
