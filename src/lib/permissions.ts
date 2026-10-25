// Permissions fines accordées au cas par cas à un agent qui n'est pas
// admin — stockées dans Agent.permissionsJson (ex: {"absences":true}).
// Un ADMIN/SUPER_ADMIN a toujours tout, ces permissions ne servent qu'à
// ouvrir un accès ponctuel à un agent simple sur une section précise.
export const PERMISSION_DEFS = [
  // Administration
  { key: "administration", label: "Administration — voir la page, modifier infos/grade d'un agent", group: "Administration" },
  { key: "agentsCreer", label: "Créer de nouveaux comptes agents", group: "Administration" },
  { key: "agentsSupprimer", label: "Désactiver / supprimer définitivement un compte", group: "Administration" },
  { key: "agentsMotDePasse", label: "Régénérer le mot de passe d'un agent", group: "Administration" },
  { key: "grades", label: "Gérer les grades, commissions & primes", group: "Administration" },
  { key: "pagesVisibilite", label: "Gérer la visibilité/l'ordre des pages du menu", group: "Administration" },
  { key: "zonesCategories", label: "Gérer les catégories de la carte des biens réservés", group: "Administration" },

  // Comptabilité
  { key: "archiveComptabilite", label: "Voir l'archive Comptabilité", group: "Comptabilité" },
  { key: "archiverCompta", label: "Archiver la comptabilité (clôturer la semaine)", group: "Comptabilité" },
  { key: "archiveSupprimer", label: "Supprimer une semaine archivée", group: "Comptabilité" },
  { key: "depenses", label: "Gérer les dépenses d'entreprise (ajouter/modifier/supprimer)", group: "Comptabilité" },
  { key: "ventesSupprimer", label: "Modifier/supprimer la vente d'un autre agent", group: "Comptabilité" },
  { key: "primes", label: "Activer/désactiver les primes des agents", group: "Comptabilité" },

  // Absences & sanctions
  { key: "absences", label: "Suivi des absences (ajouter/modifier)", group: "Absences & sanctions" },
  { key: "absencesSupprimer", label: "Supprimer une absence", group: "Absences & sanctions" },
  { key: "sanctions", label: "Suivi des sanctions (ajouter/modifier)", group: "Absences & sanctions" },
  { key: "sanctionsSupprimer", label: "Supprimer une sanction", group: "Absences & sanctions" },

  // Journal
  { key: "journal", label: "Voir le journal d'activité", group: "Journal" },
] as const;

export type PermissionKey = (typeof PERMISSION_DEFS)[number]["key"];

export const PERMISSION_GROUPS = [...new Set(PERMISSION_DEFS.map((p) => p.group))];

export function parsePermissions(json: string | null | undefined): Partial<Record<PermissionKey, boolean>> {
  if (!json) return {};
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}

export function isAdminRole(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}
