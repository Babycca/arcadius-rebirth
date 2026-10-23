import { prisma } from "@/lib/prisma";

type LogParams = {
  actorId?: string | null;
  actorName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN";
  entityType: string;
  entityId?: string | null;
  summary: string;
};

// Ne doit jamais faire échouer l'action réelle (créer une vente, etc.) si la
// journalisation elle-même plante — on logue l'erreur côté serveur et on
// continue, plutôt que de propager.
export async function logActivity(params: LogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorName: params.actorName,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId ?? null,
        summary: params.summary,
      },
    });
  } catch (e) {
    console.error("logActivity failed", e);
  }
}
