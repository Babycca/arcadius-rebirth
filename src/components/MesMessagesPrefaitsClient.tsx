"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import PresenceIndicator from "./PresenceIndicator";
import TextDepliantsClient from "./TextDepliantsClient";
import { PERSONAL_SECTION } from "@/lib/text-group-access";
import Tooltip from "@/components/Tooltip";

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
            <Tooltip label={editOn ? "Quitter le mode édition" : "Créer / organiser mes messages"}>
              <button
                onClick={() => setEditOn((v) => !v)}
                className={`p-1.5 rounded-lg transition-colors ${
                  editOn
                    ? "text-[rgb(var(--brand-400))] bg-[rgb(var(--brand-500)/0.15)]"
                    : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                }`}
              >
                <Pencil size={18} />
              </button>
            </Tooltip>
          </h1>
          <p className="text-sm text-[rgb(var(--muted))] mt-1.5">
            {initialGroups.length} dépliant{initialGroups.length > 1 ? "s" : ""} — tes propres messages, visibles par
            toi seul(e)
          </p>
        </div>
        <PresenceIndicator />
      </div>

      <TextDepliantsClient section={PERSONAL_SECTION} initialGroups={initialGroups} editableOverride={editOn} />
    </>
  );
}
