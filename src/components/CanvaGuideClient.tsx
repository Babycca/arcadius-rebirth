"use client";

import { useEffect, useState } from "react";
import { Pencil, Check, X, ExternalLink } from "lucide-react";
import { useCanEdit } from "@/lib/use-can-edit";

export default function CanvaGuideClient({ settingKey }: { settingKey: string }) {
  const { canEdit } = useCanEdit();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/app-settings/${settingKey}`)
      .then((r) => r.json())
      .then((data) => setUrl(data.value ?? ""))
      .finally(() => setLoading(false));
  }, [settingKey]);

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/app-settings/${settingKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: draft.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setUrl(draft.trim());
      setEditing(false);
    }
  }

  if (loading) return null;

  if (editing) {
    return (
      <div className="glass-strong rounded-xl p-5 max-w-2xl">
        <label className="text-xs text-[rgb(var(--muted))] mb-1 block">
          Lien d&apos;intégration Canva (Partager → Intégrer)
        </label>
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="https://www.canva.com/design/XXXXX/view?embed"
          className="glass rounded-lg px-3 py-2 text-sm w-full outline-none mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] disabled:opacity-60"
          >
            <Check size={13} />
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
          >
            <X size={13} />
            Annuler
          </button>
        </div>
      </div>
    );
  }

  if (!url) {
    return (
      <div className="glass-strong rounded-xl p-8 max-w-2xl text-center">
        <p className="text-sm text-[rgb(var(--muted))] mb-3">Aucun lien Canva configuré pour l&apos;instant.</p>
        {canEdit && (
          <button
            onClick={() => {
              setDraft(url);
              setEditing(true);
            }}
            className="flex items-center gap-1.5 mx-auto rounded-lg px-3 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))]"
          >
            <Pencil size={13} />
            Ajouter le lien
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="glass-strong rounded-xl overflow-hidden">
      {canEdit && (
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 border-b border-white/[0.08]">
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))]"
          >
            <ExternalLink size={13} />
            Ouvrir dans Canva
          </a>
          <button
            onClick={() => {
              setDraft(url);
              setEditing(true);
            }}
            className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))]"
          >
            <Pencil size={13} />
            Modifier le lien
          </button>
        </div>
      )}
      <div className="relative w-full" style={{ paddingTop: "56.25%" }}>
        <iframe
          src={url}
          allow="fullscreen"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    </div>
  );
}
