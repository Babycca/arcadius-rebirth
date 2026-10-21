"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import UserAvatar from "./UserAvatar";
import TextDepliantsClient from "./TextDepliantsClient";
import { PERSONAL_SECTION } from "@/lib/text-group-access";

type Item = { id: string; content: string; price: number | null };
type Group = { id: string; name: string; items: Item[] };

export default function MesMessagesPrefaitsClient({ initialGroups }: { initialGroups: Group[] }) {
  const [editOn, setEditOn] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-heading text-2xl sm:text-3xl leading-normal pb-1 flex items-center gap-2">
            Mes messages préfaits
            <button
              onClick={() => setEditOn((v) => !v)}
              className={`p-1.5 rounded-lg transition-colors ${
                editOn
                  ? "text-[rgb(var(--brand-400))] bg-[rgb(var(--brand-500)/0.15)]"
                  : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
              }`}
              title={editOn ? "Quitter le mode édition" : "Créer / organiser mes messages"}
            >
              <Pencil size={18} />
            </button>
          </h1>
          <p className="text-sm text-[rgb(var(--muted))] mt-1.5">
            {initialGroups.length} dépliant{initialGroups.length > 1 ? "s" : ""} — tes propres messages, visibles par
            toi seul(e)
          </p>
        </div>
        <UserAvatar />
      </div>

      <TextDepliantsClient section={PERSONAL_SECTION} initialGroups={initialGroups} editableOverride={editOn} />
    </>
  );
}
