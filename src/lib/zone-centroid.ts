// Calcule un centre approximatif (en % de l'image de la carte) pour une
// zone à partir de sa géométrie GeoJSON, pour un aperçu miniature (pas besoin
// de précision — juste un point représentatif).
import { MAP_CONFIG } from "./reserved-zone-categories";

function flattenCoords(coords: unknown, out: [number, number][]) {
  if (
    Array.isArray(coords) &&
    coords.length === 2 &&
    typeof coords[0] === "number" &&
    typeof coords[1] === "number"
  ) {
    out.push([coords[0], coords[1]]);
    return;
  }
  if (Array.isArray(coords)) {
    for (const c of coords) flattenCoords(c, out);
  }
}

export function zoneCentroidPercent(geometryJson: string): { x: number; y: number } | null {
  try {
    const feature = JSON.parse(geometryJson);
    const coords: [number, number][] = [];
    flattenCoords(feature?.geometry?.coordinates, coords);
    if (coords.length === 0) return null;
    const avgX = coords.reduce((s, c) => s + c[0], 0) / coords.length;
    const avgY = coords.reduce((s, c) => s + c[1], 0) / coords.length;
    return { x: (avgX / MAP_CONFIG.width) * 100, y: (avgY / MAP_CONFIG.height) * 100 };
  } catch {
    return null;
  }
}
