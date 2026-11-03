"use client";

import { useEffect, useState } from "react";

const KEY = "client-suggestions-enabled";

// Interrupteur global (admin) pour les suggestions de client (nom/téléphone
// proposés en tapant une vente) — activées par défaut pour tout le monde,
// mais si un agent trouve ça gênant, un admin peut tout couper ici d'un
// coup, pour tout le site.
export default function ClientSuggestionsToggle() {
  const [enabled, setEnabled] = useState(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/app-settings/${KEY}`)
      .then((r) => r.json())
      .then((d) => {
        setEnabled(d.value !== "false");
        setLoaded(true);
      });
  }, []);

  async function toggle() {
    const next = !enabled;
    setEnabled(next);
    await fetch(`/api/app-settings/${KEY}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: next ? "true" : "false" }),
    });
  }

  if (!loaded) return null;

  return (
    <div className="card-hover glass-strong rounded-xl p-5 border border-transparent flex items-center justify-between gap-4 mt-6">
      <div>
        <p className="text-sm font-medium">Suggestions client</p>
        <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
          Propose nom + téléphone déjà connus en tapant une vente. Désactivable pour tout le monde si ça gêne.
        </p>
      </div>
      <button
        onClick={toggle}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          enabled ? "bg-[rgb(var(--brand-500))]" : "bg-white/10"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}
