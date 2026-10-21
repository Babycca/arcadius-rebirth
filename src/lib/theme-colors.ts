// Dérive une palette (400/500/600 + glow) en RGB "r g b" à partir d'une
// couleur hex d'accent, pour l'injecter dans les variables CSS --brand-*.
// Travaille en HSL (pas en mélange RGB vers le noir/blanc) pour que la teinte
// foncée reste harmonieuse avec la teinte claire quelle que soit la couleur
// choisie (un mélange RGB vers le noir donne des résultats ternes/boueux sur
// le jaune, le vert... un décalage de luminosité en HSL garde la même teinte).

function hexToRgb(hex: string): [number, number, number] | null {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// Teinte dominante (bleu) du logo source — sert de référence pour calculer
// la rotation de teinte CSS nécessaire pour l'accorder à la couleur choisie.
const LOGO_BASE_HUE = 217;

export function logoHueRotationDeg(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  const [h] = rgbToHsl(...rgb);
  return Math.round(((h - LOGO_BASE_HUE + 360) % 360));
}

export function paletteFromAccent(hex: string) {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  const [h, s, l] = rgbToHsl(...rgb);

  const clamp = (v: number) => Math.min(0.92, Math.max(0.08, v));
  const lighter = hslToRgb(h, s, clamp(l + 0.14));
  const darker = hslToRgb(h, s, clamp(l - 0.16));

  // Fonds des panneaux "glass"/"glass-strong" : même teinte que l'accent,
  // mais très sombre et peu saturée, pour que les fenêtres/cartes suivent
  // la couleur choisie au lieu de garder un violet fixe.
  const bgElevated = hslToRgb(h, 0.35, 0.09);
  const bgElevated2 = hslToRgb(h, 0.32, 0.12);

  return {
    400: lighter.join(" "),
    500: `${rgb[0]} ${rgb[1]} ${rgb[2]}`,
    600: darker.join(" "),
    glow: `${rgb[0]} ${rgb[1]} ${rgb[2]}`,
    bgElevated: bgElevated.join(" "),
    bgElevated2: bgElevated2.join(" "),
  };
}
