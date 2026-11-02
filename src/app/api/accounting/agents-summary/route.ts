import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWeekId, getActiveWeekStart, getArchivedWeekIds } from "@/lib/accounting/week";
import { computeAgentPayroll } from "@/lib/accounting/payroll";
import { canAccessPage } from "@/lib/page-access";
import { HIDDEN_FROM_AGENT_LISTS_WHERE } from "@/lib/agent-filters";
import { hasServerPermission } from "@/lib/permissions-server";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  const requestedWeekId = req.nextUrl.searchParams.get("weekId");
  // Une semaine archivée (passée) n'est consultable qu'avec la permission
  // "archiveComptabilite" — pas via le système d'accès accordé par page,
  // réservé à la semaine en cours.
  if (requestedWeekId) {
    if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiveComptabilite"))) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else if (!session?.user || !(await canAccessPage("/comptabilite", user?.id, user?.role))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // weekId : étiquette affichée (semaine archivée demandée, ou la semaine
  // calendaire du jour en mode "en cours"). dataWhere : ce qui détermine
  // RÉELLEMENT quelles ventes/garages/primes sont inclus — en mode "en
  // cours" c'est tout ce qui n'a pas encore été archivé, peu importe sous
  // quelle étiquette de semaine calendaire ça a été enregistré.
  const weekId = requestedWeekId || (await getActiveWeekId());
  const dataWhere = requestedWeekId ? { weekId: requestedWeekId } : { weekId: { notIn: await getArchivedWeekIds() } };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [agents, rules, bonuses, archiveRecord, liveWeekStart, absencesToday] = await Promise.all([
    prisma.agent.findMany({ where: HIDDEN_FROM_AGENT_LISTS_WHERE, orderBy: { order: "asc" } }),
    prisma.commissionRule.findMany(),
    prisma.agentWeekBonus.findMany({ where: dataWhere }),
    requestedWeekId ? prisma.weeklyReset.findUnique({ where: { weekId: requestedWeekId } }) : null,
    requestedWeekId ? null : getActiveWeekStart(),
    // Pertinent uniquement pour la semaine en cours (une absence est un
    // statut du jour, pas une donnée historique d'une semaine archivée).
    requestedWeekId ? [] : prisma.absence.findMany({ where: { startDate: { lte: today }, endDate: { gte: today } } }),
  ]);
  const absentAgentIds = new Set(absencesToday.map((a) => a.agentId));

  let semaineA = archiveRecord?.semaineA ?? null;
  let semaineB = archiveRecord?.semaineB ?? null;
  let lotEmploye = archiveRecord?.lotEmploye ?? null;
  if (!requestedWeekId) {
    const [liveA, liveB, liveLot] = await Promise.all([
      prisma.appSetting.findUnique({ where: { key: "comptabilite-semaine-a" } }),
      prisma.appSetting.findUnique({ where: { key: "comptabilite-semaine-b" } }),
      prisma.appSetting.findUnique({ where: { key: "comptabilite-lot-employe" } }),
    ]);
    semaineA = liveA?.value ?? null;
    semaineB = liveB?.value ?? null;
    lotEmploye = liveLot?.value ?? null;
  }
  const periodStart = archiveRecord?.periodStart ?? liveWeekStart ?? null;
  const archivedAt = archiveRecord?.createdAt ?? null;

  const rulesByGrade = Object.fromEntries(rules.map((r) => [r.grade, r]));
  const bonusByAgentId = Object.fromEntries(bonuses.map((b) => [b.agentId, { enabled: b.enabled, amount: b.amount }]));

  const summaryAll = await Promise.all(
    agents.map(async (agent) => {
      const [sales, garageSales] = await Promise.all([
        prisma.sale.findMany({ where: { agentId: agent.id, ...dataWhere } }),
        prisma.garageSale.findMany({ where: { agentId: agent.id, ...dataWhere } }),
      ]);
      const rule = rulesByGrade[agent.grade] ?? null;
      const bonusOverride = bonusByAgentId[agent.id] ?? null;
      const payroll = computeAgentPayroll(sales, rule, bonusOverride, garageSales);
      return {
        id: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        avatarUrl: agent.avatarUrl,
        grade: agent.grade,
        phone: agent.phone,
        active: agent.active,
        isAbsentToday: absentAgentIds.has(agent.id),
        ruleBonusAmount: rule?.bonusAmount ?? 0,
        commissionRate: rule?.commissionRate ?? 0,
        ...payroll,
      };
    })
  );

  // Un employé désactivé (archivé) ne pollue plus la semaine active s'il n'y
  // a aucune activité (vente ou garage) — mais reste visible dans une
  // semaine (passée ou en cours) où il a effectivement travaillé, pour ne
  // jamais brouiller l'historique.
  const summary = summaryAll.filter((a) => a.active || a.invoiceCount > 0);

  return NextResponse.json({
    weekId,
    periodStart,
    archivedAt,
    semaineA,
    semaineB,
    lotEmploye,
    isArchived: Boolean(requestedWeekId),
    isFormallyArchived: Boolean(archiveRecord),
    agents: summary,
  });
}
