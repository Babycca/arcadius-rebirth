// Permissions fines accordées au cas par cas à un agent qui n'est pas
// admin — stockées dans Agent.permissionsJson (ex: {"absences":true}).
// Un ADMIN/SUPER_ADMIN a toujours tout, ces permissions ne servent qu'à
// ouvrir un accès ponctuel à un agent simple sur une section précise.
export const PERMISSION_DEFS = [
  { key: "administration", label: "Administration (agents, grades, pages, catégories de carte)" },
  { key: "archiveComptabilite", label: "Voir l'archive Comptabilité" },
  { key: "archiverCompta", label: "Archiver la comptabilité (clôturer la semaine)" },
  { key: "absences", label: "Suivi des absences" },
  { key: "sanctions", label: "Suivi des sanctions" },
  { key: "journal", label: "Journal d'activité" },
] as const;

export type PermissionKey = (typeof PERMISSION_DEFS)[number]["key"];

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
