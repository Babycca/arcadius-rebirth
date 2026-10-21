"use client";

import { ReactNode, useState } from "react";
import { useCanEdit } from "@/lib/use-can-edit";

export default function EstimationModeSwitch({ wizard, admin }: { wizard: ReactNode; admin: ReactNode }) {
  const { canEdit } = useCanEdit();
  const [tab, setTab] = useState<"wizard" | "admin">("wizard");

  if (!canEdit) return <>{wizard}</>;

  return (
    <div>
      <div className="flex gap-2 mb-5">
        <button
          onClick={() => setTab("wizard")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            tab === "wizard" ? "bg-[rgb(var(--brand-500))] text-white" : "glass text-[rgb(var(--muted))]"
          }`}
        >
          Calculer
        </button>
        <button
          onClick={() => setTab("admin")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
            tab === "admin" ? "bg-[rgb(var(--brand-500))] text-white" : "glass text-[rgb(var(--muted))]"
          }`}
        >
          Gérer les profils
        </button>
      </div>
      {tab === "wizard" ? wizard : admin}
    </div>
  );
}
