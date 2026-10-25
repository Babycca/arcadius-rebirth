import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

// Supprime l'entrée d'archive (visible dans /comptabilite/archive) ainsi que
// les réglages de primes propres à cette semaine. Les ventes elles-mêmes ne
// sont jamais supprimées automatiquement, conformément au reste de l'appli.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ weekId: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiveSupprimer")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { weekId } = await params;
  await prisma.$transaction([
    prisma.agentWeekBonus.deleteMany({ where: { weekId } }),
    prisma.weeklyReset.delete({ where: { weekId } }),
  ]);

  return NextResponse.json({ ok: true });
}
