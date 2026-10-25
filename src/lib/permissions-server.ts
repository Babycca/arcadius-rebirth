import { prisma } from "@/lib/prisma";
import { isAdminRole, parsePermissions, type PermissionKey } from "@/lib/permissions";

// Toujours vérifié contre la base (pas le JWT de session) pour qu'un
// changement de permission par un admin s'applique immédiatement, sans
// attendre que l'agent concerné se reconnecte.
export async function hasServerPermission(
  userId: string | undefined,
  role: string | undefined,
  key: PermissionKey
): Promise<boolean> {
  if (isAdminRole(role)) return true;
  if (!userId) return false;
  const agent = await prisma.agent.findUnique({ where: { id: userId }, select: { permissionsJson: true } });
  const perms = parsePermissions(agent?.permissionsJson);
  return !!perms[key];
}
