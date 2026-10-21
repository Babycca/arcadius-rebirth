"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { X, KeyRound } from "lucide-react";

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const { data: session, update } = useSession();
  const mustChangePassword = (session?.user as { mustChangePassword?: boolean } | undefined)?.mustChangePassword;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirm) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch("/api/my-password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Impossible de modifier le mot de passe.");
      return;
    }
    await update();
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-lg flex items-center gap-2">
            <KeyRound size={18} className="text-[rgb(var(--brand-400))]" />
            Mot de passe
          </h2>
          <button onClick={onClose} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
            <X size={18} />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[rgb(var(--success))]">Mot de passe mis à jour.</p>
            <button
              onClick={onClose}
              className="rounded-xl py-2 text-sm font-medium text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))]"
            >
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            {mustChangePassword && (
              <p className="text-xs text-[rgb(var(--muted))]">
                Ton mot de passe a été généré par un administrateur — choisis-en un nouveau pour continuer.
              </p>
            )}
            {error && (
              <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs text-[rgb(var(--muted))] mb-1 block">
                Mot de passe actuel {mustChangePassword && "(si on te le demande)"}
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Nouveau mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-[rgb(var(--muted))] mb-1 block">Confirmer</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="mt-1 rounded-xl py-2 text-sm font-medium text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : "Mettre à jour"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
