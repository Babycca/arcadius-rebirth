import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWeekId, getActiveWeekStart, getArchivedWeekIds } from "@/lib/accounting/week";
import { hasServerPermission } from "@/lib/permissions-server";

// Clôture la comptabilité "en cours" (tout ce qui n'a pas encore été
// archivé, peu importe sous quelle étiquette de semaine calendaire ça a été
// enregistré, et peu importe depuis quand) : renomme cet ensemble au nom de
// la semaine affichée au moment précis du clic (ex: elle archive un dimanche
// qui affiche "2026-S44" → l'archive s'appelle "2026-S44" ; si elle archive
// 3 semaines plus tard sans avoir touché à rien entre-temps, l'archive porte
// le nom de la semaine affichée ce jour-là), puis enregistre l'instantané
// (Semaine A/B, Lot employé). Les ventes elles-mêmes ne sont jamais
// supprimées, seulement ré-étiquetées pour que l'archive reste consultable
// sous son nom — ce renommage n'arrive QUE sur ce clic, jamais tout seul.
export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiverCompta"))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const title = await getActiveWeekId();
  const titleStart = await getActiveWeekStart();

  const existing = await prisma.weeklyReset.findUnique({ where: { weekId: title } });
  if (existing) {
    return NextResponse.json({ error: "Cette semaine est déjà archivée." }, { status: 409 });
  }

  const archivedWeekIds = await getArchivedWeekIds();
  const unarchivedWhere = { weekId: { notIn: archivedWeekIds } };

  const [semaineA, semaineB, lotEmploye, unarchivedBonuses] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "comptabilite-semaine-a" } }),
    prisma.appSetting.findUnique({ where: { key: "comptabilite-semaine-b" } }),
    prisma.appSetting.findUnique({ where: { key: "comptabilite-lot-employe" } }),
    prisma.agentWeekBonus.findMany({ where: unarchivedWhere }),
  ]);
  // Si l'admin a réglé la prime d'un même agent sur plusieurs semaines
  // calendaires différentes sans jamais archiver entre-temps, elles vont
  // toutes se retrouver renommées sur le même titre — on ne garde que la
  // dernière pour ne pas violer la contrainte d'unicité (agentId, weekId).
  const seenAgentIds = new Set<string>();
  const duplicateBonusIds: string[] = [];
  for (const b of [...unarchivedBonuses].reverse()) {
    if (seenAgentIds.has(b.agentId)) duplicateBonusIds.push(b.id);
    else seenAgentIds.add(b.agentId);
  }

  await prisma.$transaction([
    prisma.sale.updateMany({ where: unarchivedWhere, data: { weekId: title } }),
    prisma.garageSale.updateMany({ where: unarchivedWhere, data: { weekId: title } }),
    prisma.expense.updateMany({ where: unarchivedWhere, data: { weekId: title } }),
    prisma.agentWeekBonus.deleteMany({ where: { id: { in: duplicateBonusIds } } }),
    prisma.agentWeekBonus.updateMany({ where: unarchivedWhere, data: { weekId: title } }),
    prisma.weeklyReset.create({
      data: {
        weekId: title,
        triggeredBy: user!.id!,
        periodStart: titleStart,
        semaineA: semaineA?.value ?? null,
        semaineB: semaineB?.value ?? null,
        lotEmploye: lotEmploye?.value ?? null,
      },
    }),
  ]);

  return NextResponse.json({ weekId: title });
}
