// Moteur de calcul du calculateur d'estimation ("/estimation"). Aucune règle
// de zone/prix n'est codée en dur ici : tout vient des données du profil
// (EstimationProfile + ses critères/options/groupes d'intérieurs).

export type EstimationOption = {
  id: string;
  label: string;
  priceMode: string; // "add" | "fixed"
  amount: number;
  order: number;
};

export type EstimationCriterion = {
  id: string;
  label: string;
  type: string; // "checkbox" | "radio"
  order: number;
  options: EstimationOption[];
};

export type EstimationInteriorItem = {
  id: string;
  name: string;
  priceMode: string; // "add" | "fixed"
  amount: number;
  type: string | null;
  storageKg: number | null;
  order: number;
};

export type EstimationInteriorGroup = {
  id: string;
  label: string;
  requireSelectedOptionIds: string; // JSON string[]
  requireUnselectedOptionIds: string; // JSON string[]
  order: number;
  items: EstimationInteriorItem[];
};

export type EstimationProfile = {
  id: string;
  structureType: string;
  zoneName: string;
  region: string | null;
  photoUrl: string | null;
  basePrice: number;
  maxPrice: number | null;
  order: number;
  criteria: EstimationCriterion[];
  interiorGroups: EstimationInteriorGroup[];
};

function parseIdList(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Détermine quel groupe d'intérieurs afficher à l'agent selon les options de
 * critères actuellement sélectionnées. Renvoie le premier groupe (par
 * `order`) dont toutes les conditions "doit être coché" sont remplies et
 * dont aucune condition "ne doit pas être coché" ne l'est. `null` si aucun
 * groupe ne correspond (configuration admin incomplète).
 */
export function pickActiveInteriorGroup(
  groups: EstimationInteriorGroup[],
  selectedOptionIds: string[]
): EstimationInteriorGroup | null {
  const selected = new Set(selectedOptionIds);
  const sorted = [...groups].sort((a, b) => a.order - b.order);
  for (const group of sorted) {
    const requireSelected = parseIdList(group.requireSelectedOptionIds);
    const requireUnselected = parseIdList(group.requireUnselectedOptionIds);
    const allSelectedPresent = requireSelected.every((id) => selected.has(id));
    const noneUnselectedPresent = requireUnselected.every((id) => !selected.has(id));
    if (allSelectedPresent && noneUnselectedPresent) return group;
  }
  return null;
}

/**
 * Calcule le prix final : part du prix de départ du profil, applique chaque
 * option de critère sélectionnée (dans l'ordre des critères) puis l'intérieur
 * choisi en dernier. Un élément en mode "fixed" bloque le total à son
 * montant (écrase tout calcul précédent) ; en mode "add" il s'additionne.
 * Le résultat est ensuite plafonné à `maxPrice` si défini.
 */
/** Applique un élément (option de critère ou intérieur) à un total en cours,
 * selon son mode : "add" additionne, "subtract" soustrait, "fixed" écrase le
 * total avec son propre montant. */
function applyPriceMode(total: number, priceMode: string, amount: number): { total: number; wasFixed: boolean } {
  if (priceMode === "fixed") return { total: amount, wasFixed: true };
  if (priceMode === "subtract") return { total: total - amount, wasFixed: false };
  return { total: total + amount, wasFixed: false };
}

export function computeEstimation(
  profile: EstimationProfile,
  selectedOptionIds: string[],
  interiorItem: EstimationInteriorItem | null
): number {
  let total = profile.basePrice;
  // Un élément "fixed" (ex : les intérieurs d'appartement) doit s'imposer
  // "peu importe la zone et tout et tout" : on ne plafonne donc PAS le
  // résultat si le dernier élément appliqué est en mode fixe. Le plafond ne
  // s'applique qu'à un total obtenu par additions/soustractions successives
  // (villas/maisons).
  let lastWasFixed = false;

  const orderedCriteria = [...profile.criteria].sort((a, b) => a.order - b.order);
  for (const criterion of orderedCriteria) {
    for (const option of criterion.options) {
      if (!selectedOptionIds.includes(option.id)) continue;
      const applied = applyPriceMode(total, option.priceMode, option.amount);
      total = applied.total;
      lastWasFixed = applied.wasFixed;
    }
  }

  if (interiorItem) {
    const applied = applyPriceMode(total, interiorItem.priceMode, interiorItem.amount);
    total = applied.total;
    lastWasFixed = applied.wasFixed;
  }

  if (!lastWasFixed) {
    // Une soustraction ne peut jamais faire descendre l'estimation en
    // dessous du prix de départ de la zone.
    total = Math.max(total, profile.basePrice);
    if (profile.maxPrice != null) total = Math.min(total, profile.maxPrice);
  }

  return total;
}

function groupThousands(value: number): string {
  return Math.abs(Math.round(value))
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "~1.234.567$" — séparateur de milliers en points, précédé d'un "~". */
export function formatEstimationPrice(amount: number): string {
  const rounded = Math.round(amount);
  return `~${rounded < 0 ? "-" : ""}${groupThousands(rounded)}$`;
}

/** "1.234.567$" (montant de base/plafond) ou "+200.000$" / "-50.000$" (delta d'une option/intérieur). */
export function formatAmount(amount: number, options: { signed?: boolean } = {}): string {
  const sign = options.signed ? (amount > 0 ? "+" : amount < 0 ? "-" : "") : amount < 0 ? "-" : "";
  return `${sign}${groupThousands(amount)}$`;
}

/** Affichage d'un montant selon son mode : "+200.000$" (add), "-50.000$"
 * (subtract, toujours affiché négatif même si le montant stocké est
 * positif), "200.000$" (fixed, sans signe). */
export function formatModeAmount(priceMode: string, amount: number): string {
  if (priceMode === "fixed") return formatAmount(amount);
  if (priceMode === "subtract") return formatAmount(-Math.abs(amount), { signed: true });
  return formatAmount(amount, { signed: true });
}
