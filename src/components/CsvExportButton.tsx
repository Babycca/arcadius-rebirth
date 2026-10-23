"use client";

import { Download } from "lucide-react";

function toCsvField(value: string | number | null): string {
  const s = String(value ?? "");
  // Échappe guillemets/virgules/retours à la ligne — Excel/Sheets attendent
  // un champ entre guillemets dès qu'il contient un de ces caractères.
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Même format de données que TranscriptButton (lignes de cellules), mais en
// fichier .csv téléchargeable plutôt qu'en presse-papiers — utile pour
// archiver/transmettre en dehors de Google Sheets.
export default function CsvExportButton({
  rows,
  filename,
}: {
  rows: (string | number | null)[][];
  filename: string;
}) {
  function handleExport() {
    // ﻿ (BOM) force Excel à lire les accents en UTF-8 correctement.
    const csv = "﻿" + rows.map((r) => r.map(toCsvField).join(",")).join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 text-sm rounded-xl px-4 py-2.5 glass hover:border-[rgb(var(--brand-500)/0.4)] transition-colors"
      title="Télécharger en fichier .csv"
    >
      <Download size={14} />
      Exporter CSV
    </button>
  );
}
