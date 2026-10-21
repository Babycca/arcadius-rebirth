// Comptes exclus de la Comptabilité (résumé général, tableau de bord,
// dernières ventes) : le Super Admin (compte technique) et le grade "Sec"
// (compte factice, pas un vrai agent commercial). Ne s'applique PAS à la
// liste d'Administration — ces comptes doivent rester gérables là-bas
// (grade, rôle, accès aux pages), seul le Super Admin y reste masqué, via un
// filtre séparé dans /api/agents.
export const HIDDEN_FROM_AGENT_LISTS_WHERE = {
  role: { not: "SUPER_ADMIN" },
  grade: { not: "Sec" },
} as const;
