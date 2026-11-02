// Tri par numéro d'habitation (le plus récent/haut en premier) plutôt que
// par date — un houseNumber est stocké en texte, donc on compare la valeur
// numérique pour que "22610" passe bien avant "9999".
export function sortByHouseNumberDesc<T extends { houseNumber: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => Number(b.houseNumber) - Number(a.houseNumber));
}
