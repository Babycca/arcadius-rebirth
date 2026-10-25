import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ href: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "pagesVisibilite")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { href } = await params;
  const decodedHref = `/${decodeURIComponent(href)}`;
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.hiddenForAll === "boolean") data.hiddenForAll = body.hiddenForAll;

  if (Array.isArray(body?.hiddenForAgentIds)) {
    const isRealAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
    if (!isRealAdmin) {
      // Un agent qui n'a que la permission "pagesVisibilite" (pas un vrai
      // admin) ne doit pas pouvoir s'accorder/se retirer l'accès à lui-même,
      // ni toucher à l'accès d'un collègue mieux classé que lui.
      const existing = await prisma.pageVisibility.findUnique({ where: { href: decodedHref } });
      let before: string[] = [];
      try {
        before = JSON.parse(existing?.hiddenForAgentIds || "[]");
      } catch {
        before = [];
      }
      const after: string[] = body.hiddenForAgentIds;
      const changedIds = [...new Set([...before, ...after])].filter(
        (agentId) => before.includes(agentId) !== after.includes(agentId)
      );
      if (changedIds.length > 0) {
        const [actor, rules, targets] = await Promise.all([
          prisma.agent.findUnique({ where: { id: user!.id! }, select: { grade: true } }),
          prisma.commissionRule.findMany({ orderBy: { order: "asc" }, select: { grade: true } }),
          prisma.agent.findMany({ where: { id: { in: changedIds } }, select: { id: true, grade: true } }),
        ]);
        const rankOf = (grade: string | undefined) => {
          const idx = rules.findIndex((r) => r.grade === grade);
          return idx === -1 ? rules.length : idx;
        };
        const actorRank = rankOf(actor?.grade);
        const targetById = new Map(targets.map((t) => [t.id, t]));
        for (const agentId of changedIds) {
          if (agentId === user!.id) {
            return NextResponse.json(
              { error: "Tu ne peux pas modifier tes propres pages visibles." },
              { status: 403 }
            );
          }
          const targetRank = rankOf(targetById.get(agentId)?.grade);
          if (targetRank <= actorRank) {
            return NextResponse.json(
              { error: "Tu ne peux pas modifier les pages visibles d'un agent mieux classé (ou égal à) toi." },
              { status: 403 }
            );
          }
        }
      }
    }
    data.hiddenForAgentIds = JSON.stringify(body.hiddenForAgentIds);
  }

  if (typeof body?.order === "number") data.order = body.order;

  const page = await prisma.pageVisibility.upsert({
    where: { href: decodedHref },
    update: data,
    create: { href: decodedHref, ...data },
  });
  return NextResponse.json(page);
}
