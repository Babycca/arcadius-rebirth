// Valeurs autorisées pour la page "Estimation", validées côté application
// (les champs correspondants sont des String non contraintes en base). Même
// esprit que src/lib/price-item-types.ts.

export const ESTIMATION_STRUCTURE_TYPES = ["appartement", "maison", "villa"] as const;
export type EstimationStructureType = (typeof ESTIMATION_STRUCTURE_TYPES)[number];

export const ESTIMATION_STRUCTURE_LABELS: Record<EstimationStructureType, string> = {
  appartement: "Appartement",
  maison: "Maison",
  villa: "Villa",
};

export const ESTIMATION_REGIONS = ["sud", "nord"] as const;
export type EstimationRegion = (typeof ESTIMATION_REGIONS)[number];

export const ESTIMATION_REGION_LABELS: Record<EstimationRegion, string> = {
  sud: "Sud",
  nord: "Nord",
};

export const ESTIMATION_CRITERION_TYPES = ["checkbox", "radio"] as const;
export type EstimationCriterionType = (typeof ESTIMATION_CRITERION_TYPES)[number];

export const ESTIMATION_PRICE_MODES = ["add", "subtract", "fixed"] as const;
export type EstimationPriceMode = (typeof ESTIMATION_PRICE_MODES)[number];

export const ESTIMATION_PRICE_MODE_LABELS: Record<EstimationPriceMode, string> = {
  add: "Addition",
  subtract: "Soustraction",
  fixed: "Prix fixe",
};
