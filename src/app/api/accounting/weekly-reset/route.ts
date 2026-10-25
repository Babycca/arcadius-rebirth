import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWeekId, getActiveWeekStart, startOfIsoWeek, weekIdFor } from "@/lib/accounting/week";

export async function POST() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || (user?.role !== "ADMIN" && user?.role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // La semaine qui vient de se terminer est archivée sous son propre
  // weekId (les ventes restent en base, consultables via /comptabilite/archive) ;
  // une nouvelle semaine démarre, calée sur le lundi en cours.
  const archivedWeekId = await getActiveWeekId();
  const archivedWeekStart = await getActiveWeekStart();
  const newWeekStart = startOfIsoWeek(new Date());

  // Identifiant propre ("2026-S44") plutôt qu'un horodatage technique —
  // avec un suffixe si cette semaine calendaire a déjà été utilisée. On
  // vérifie aussi bien les archives existantes que les ventes historiques :
  // supprimer une archive ne supprime jamais ses ventes, donc son weekId ne
  // doit jamais être réutilisé pour une semaine active, sinon ces anciennes
  // ventes referaient surface comme si elles étaient "en cours".
  const base = weekIdFor(newWeekStart);
  let newWeekId = base;
  let suffix = 2;
  while (
    newWeekId === archivedWeekId ||
    (await prisma.weeklyReset.findUnique({ where: { weekId: newWeekId } })) ||
    (await prisma.sale.findFirst({ where: { weekId: newWeekId } }))
  ) {
    newWeekId = `${base}-${suffix}`;
    suffix += 1;
  }

  const [semaineA, semaineB, lotEmploye] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "comptabilite-semaine-a" } }),
    prisma.appSetting.findUnique({ where: { key: "comptabilite-semaine-b" } }),
    prisma.appSetting.findUnique({ where: { key: "comptabilite-lot-employe" } }),
  ]);

  await prisma.$transaction([
    prisma.appSetting.upsert({
      where: { key: "currentWeekId" },
      update: { value: newWeekId },
      create: { key: "currentWeekId", value: newWeekId },
    }),
    prisma.appSetting.upsert({
      where: { key: "currentWeekStart" },
      update: { value: newWeekStart.toISOString() },
      create: { key: "currentWeekStart", value: newWeekStart.toISOString() },
    }),
    prisma.weeklyReset.create({
      data: {
        weekId: archivedWeekId,
        triggeredBy: user!.id!,
        periodStart: archivedWeekStart,
        semaineA: semaineA?.value ?? null,
        semaineB: semaineB?.value ?? null,
        lotEmploye: lotEmploye?.value ?? null,
      },
    }),
  ]);

  return NextResponse.json({ weekId: newWeekId, archivedWeekId });
}
