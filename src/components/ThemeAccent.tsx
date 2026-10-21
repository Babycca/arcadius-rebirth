"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { paletteFromAccent } from "@/lib/theme-colors";

// La couleur de base (premier affichage) vient désormais du serveur
// (layout.tsx, via la session) — ce composant ne sert plus qu'à appliquer
// un changement de couleur en direct, sans recharger la page, après une
// personnalisation dans /profil.
export default function ThemeAccent() {
  const { data: session } = useSession();
  const accentColor = (session?.user as { accentColor?: string | null } | undefined)?.accentColor;

  useEffect(() => {
    const root = document.documentElement;
    if (!accentColor) {
      root.style.removeProperty("--brand-400");
      root.style.removeProperty("--brand-500");
      root.style.removeProperty("--brand-600");
      root.style.removeProperty("--brand-glow");
      root.style.removeProperty("--bg-elevated");
      root.style.removeProperty("--bg-elevated-2");
      return;
    }
    const palette = paletteFromAccent(accentColor);
    if (!palette) return;
    root.style.setProperty("--brand-400", palette[400]);
    root.style.setProperty("--brand-500", palette[500]);
    root.style.setProperty("--brand-600", palette[600]);
    root.style.setProperty("--brand-glow", palette.glow);
    root.style.setProperty("--bg-elevated", palette.bgElevated);
    root.style.setProperty("--bg-elevated-2", palette.bgElevated2);
  }, [accentColor]);

  return null;
}
