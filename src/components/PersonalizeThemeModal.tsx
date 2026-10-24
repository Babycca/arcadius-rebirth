"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { X, Palette } from "lucide-react";
import { paletteFromAccent, logoFilter } from "@/lib/theme-colors";
import { useToast } from "./ToastProvider";

const PRESETS = [
  { label: "Bleu (défaut)", value: "#3b82f6" },
  { label: "Violet", value: "#8b5cf6" },
  { label: "Rose", value: "#ec4899" },
  { label: "Vert", value: "#22c55e" },
  { label: "Ambre", value: "#f59e0b" },
  { label: "Rouge", value: "#ef4444" },
];

export default function PersonalizeThemeModal({ onClose }: { onClose: () => void }) {
  const { data: session, update } = useSession();
  const current = (session?.user as { accentColor?: string | null } | undefined)?.accentColor ?? "#3b82f6";
  const [color, setColor] = useState(current);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  // Aperçu en direct pendant qu'on choisit une couleur (sinon aucun retour
  // visuel avant de cliquer "Appliquer", ce qui donnait l'impression que la
  // couleur perso choisie dans le sélecteur natif ne faisait jamais rien).
  // On revient à la couleur d'origine si la modale se ferme sans valider.
  useEffect(() => {
    const root = document.documentElement;
    function apply(hex: string) {
      const palette = paletteFromAccent(hex);
      if (!palette) return;
      root.style.setProperty("--brand-400", palette[400]);
      root.style.setProperty("--brand-500", palette[500]);
      root.style.setProperty("--brand-600", palette[600]);
      root.style.setProperty("--brand-glow", palette.glow);
      root.style.setProperty("--bg-elevated", palette.bgElevated);
      root.style.setProperty("--bg-elevated-2", palette.bgElevated2);
      root.style.setProperty("--logo-filter", logoFilter(hex));
    }
    apply(color);
    return () => apply(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [color]);

  async function save(value: string | null) {
    setSaving(true);
    await fetch("/api/my-theme", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accentColor: value }),
    });
    await update();
    setSaving(false);
    toast(value ? "Couleur enregistrée." : "Couleur réinitialisée.");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 p-4">
      <div className="glass-popover border border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-lg flex items-center gap-2">
            <Palette size={18} className="text-[rgb(var(--brand-400))]" />
            Personnaliser
          </h2>
          <button onClick={onClose} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
            <X size={18} />
          </button>
        </div>

        <p className="text-xs text-[rgb(var(--muted))] mb-3">
          Couleur d&apos;accent — visible uniquement sur ton compte.
        </p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {PRESETS.map((p) => (
            <button
              key={p.value}
              onClick={() => setColor(p.value)}
              className={`flex flex-col items-center gap-1.5 rounded-xl p-3 border transition-colors ${
                color === p.value ? "border-white/40" : "border-transparent hover:border-white/10"
              }`}
            >
              <span className="w-7 h-7 rounded-full" style={{ backgroundColor: p.value }} />
              <span className="text-[10px] text-[rgb(var(--muted))]">{p.label}</span>
            </button>
          ))}
        </div>

        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-full h-10 rounded-lg mb-4 bg-transparent cursor-pointer"
        />

        <div className="flex gap-2">
          <button
            onClick={() => save(null)}
            disabled={saving}
            className="flex-1 rounded-xl py-2 text-xs font-medium glass hover:border-white/20 transition-colors disabled:opacity-60"
          >
            Réinitialiser
          </button>
          <button
            onClick={() => save(color)}
            disabled={saving}
            className="flex-1 rounded-xl py-2 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
          >
            {saving ? "Enregistrement…" : "Appliquer"}
          </button>
        </div>
      </div>
    </div>
  );
}
