import { prisma } from "@/lib/prisma";

// Même logique que le filtrage de la Sidebar (src/components/Sidebar.tsx) :
// si une page est masquée pour tous, hiddenForAgentIds devient une liste
// d'exceptions autorisées (accès accordé au cas par cas) plutôt qu'une
// liste d'exclusions, sinon impossible de donner l'accès à un agent précis
// sans rendre la page visible pour tout le monde.
export async function canAccessPage(
  href: string,
  userId: string | undefined,
  role: string | undefined
): Promise<boolean> {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return true;
  if (!userId) return false;

  const vis = await prisma.pageVisibility.findUnique({ where: { href } });
  if (!vis) return true;

  let ids: string[] = [];
  try {
    ids = JSON.parse(vis.hiddenForAgentIds || "[]");
  } catch {
    ids = [];
  }

  if (vis.hiddenForAll) return ids.includes(userId);
  return !ids.includes(userId);
}
