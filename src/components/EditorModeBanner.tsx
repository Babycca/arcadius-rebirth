"use client";

import { Pencil } from "lucide-react";
import { useCanEdit } from "@/lib/use-can-edit";

export default function EditorModeBanner() {
  const { canEdit } = useCanEdit();
  if (!canEdit) return null;

  return (
    <div className="flex items-center gap-2 rounded-lg bg-[rgb(var(--brand-500)/0.12)] border border-[rgb(var(--brand-500)/0.3)] text-[rgb(var(--brand-400))] text-xs px-3 py-2 mb-4 w-fit">
      <Pencil size={12} />
      Mode édition activé — les boutons d&apos;ajout/modification sont visibles sur cette page
    </div>
  );
}
