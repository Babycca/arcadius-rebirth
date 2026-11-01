import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWeekId, getActiveWeekStart } from "@/lib/accounting/week";
import { hasServerPermission } from "@/lib/permissions-server";

// Clôture la semaine en cours : enregistre un instantané (WeeklyReset) avec
// Semaine A/B et Lot employé au moment de l'archivage. Les ventes restent en
// base (consultables via /comptabilite/archive) — rien n'est supprimé.
// La bascule vers la semaine suivante n'a rien à voir avec ce bouton : elle
// est purement calendaire (voir getActiveWeekId), donc spammer "Archiver"
// ne fait pas sauter de semaines, ça refuse juste d'archiver deux fois la
// même.
export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiverCompta"))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const weekId = await getActiveWeekId();
  const weekStart = await getActiveWeekStart();

  const existing = await prisma.weeklyReset.findUnique({ where: { weekId } });
  if (existing) {
    return NextResponse.json({ error: "Cette semaine est déjà archivée." }, { status: 409 });
  }

  const [semaineA, semaineB, lotEmploye] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "comptabilite-semaine-a" } }),
    prisma.appSetting.findUnique({ where: { key: "comptabilite-semaine-b" } }),
    prisma.appSetting.findUnique({ where: { key: "comptabilite-lot-employe" } }),
  ]);

  await prisma.weeklyReset.create({
    data: {
      weekId,
      triggeredBy: user!.id!,
      periodStart: weekStart,
      semaineA: semaineA?.value ?? null,
      semaineB: semaineB?.value ?? null,
      lotEmploye: lotEmploye?.value ?? null,
    },
  });

  return NextResponse.json({ weekId });
}
