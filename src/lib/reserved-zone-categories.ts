// Catégories de zones réservées — désormais éditables en base (table
// ReservedZoneCategory), gérées depuis /administration. Ce module ne garde
// que les helpers purs ; les catégories elles-mêmes sont chargées par
// l'appelant (prisma côté serveur, /api/zone-categories côté client).
export type ReservedZoneCategory = {
  id: string;
  name: string;
  color: string;
  emoji: string;
};

export function categoryFor(
  categories: ReservedZoneCategory[],
  id: string
): ReservedZoneCategory | undefined {
  return categories.find((c) => c.id === id) ?? categories[0];
}

export const MAP_CONFIG = {
  imageUrl: "/images/gta-map.jpg",
  width: 3620,
  height: 5000,
};

export function getCategoryTextColor(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0a0810" : "#ffffff";
}
