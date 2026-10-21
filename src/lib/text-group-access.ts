// Les dépliants "Mes messages préfaits" sont personnels : chaque agent gère
// ses propres groupes/messages (TextGroup.ownerId = son id), sans passer par
// le mode édition admin — contrairement aux autres sections (Formulaires,
// Prix fixe, Tarifs, Intérieurs possibles…) qui restent admin uniquement.
export const PERSONAL_SECTION = "mes-messages";

export function isAdminRole(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export function canEditGroup(
  role: string | undefined,
  userId: string | undefined,
  group: { section: string; ownerId: string | null }
) {
  if (isAdminRole(role)) return true;
  return group.section === PERSONAL_SECTION && group.ownerId === userId;
}
