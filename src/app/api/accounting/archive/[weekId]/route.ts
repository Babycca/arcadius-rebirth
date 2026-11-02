import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

// Pour une semaine formellement archivée (WeeklyReset existe) : supprime
// seulement l'entrée d'archive + les primes de la semaine, les ventes
// elles-mêmes ne sont jamais touchées.
// Pour une semaine "orpheline" (jamais archivée via le bouton Archiver, mais
// listée quand même pour ne rien cacher, voir /api/accounting/archive) : il
// n'y a pas d'entrée d'archive à proprement parler, la ligne n'existe que
// parce qu'il y a des ventes/garages/dépenses sur cette semaine — la
// supprimer supprime donc réellement ces données, à la demande explicite de
// l'utilisateur qui gère lui-même le nettoyage de ces vieilles semaines.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ weekId: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiveSupprimer")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { weekId } = await params;
  const reset = await prisma.weeklyReset.findUnique({ where: { weekId } });

  if (reset) {
    await prisma.$transaction([
      prisma.agentWeekBonus.deleteMany({ where: { weekId } }),
      prisma.weeklyReset.deleteMany({ where: { weekId } }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.agentWeekBonus.deleteMany({ where: { weekId } }),
      prisma.sale.deleteMany({ where: { weekId } }),
      prisma.garageSale.deleteMany({ where: { weekId } }),
      prisma.expense.deleteMany({ where: { weekId } }),
    ]);
  }

  return NextResponse.json({ ok: true });
}
