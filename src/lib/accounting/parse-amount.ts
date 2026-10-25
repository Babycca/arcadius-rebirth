// "Lot employé" reste un champ texte libre (comme Semaine A/B), mais sa
// valeur doit être déduite du bénéfice net comme les dépenses — on en
// extrait donc un montant numérique. Même convention de saisie que le
// reste de l'app (ex: InteriorsByPriceClient) : "300k", "300 000",
// "300.000" ou "300000" sont tous acceptés, le point servant de séparateur
// de milliers (convention française), pas de décimale.
export function parseMoneyAmount(raw: string | null | undefined): number {
  if (!raw) return 0;
  let s = raw.trim().toLowerCase().replace(/\s/g, "").replace(/\$/g, "");
  if (!s) return 0;
  let multiplier = 1;
  if (s.endsWith("k")) {
    multiplier = 1000;
    s = s.slice(0, -1);
  }
  s = s.replace(/\./g, "").replace(",", ".");
  const value = Number(s);
  return Number.isFinite(value) ? value * multiplier : 0;
}
