import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWeekId, getArchivedWeekIds } from "@/lib/accounting/week";
import { sortByHouseNumberDesc } from "@/lib/accounting/sort-sales";
import { canAccessPage } from "@/lib/page-access";
import { hasServerPermission } from "@/lib/permissions-server";
import { logActivity } from "@/lib/audit-log";

const COMPANY_PROFIT_RATE = 0.1;

export async function GET(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;

  const requestedWeekId = req.nextUrl.searchParams.get("weekId");
  // Une semaine archivée n'est consultable qu'avec la permission
  // "archiveComptabilite".
  if (requestedWeekId) {
    if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiveComptabilite"))) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
  } else if (!session?.user || !(await canAccessPage("/comptabilite", user?.id, user?.role))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { agentId } = await params;
  const where = requestedWeekId
    ? { agentId, weekId: requestedWeekId }
    : { agentId, weekId: { notIn: await getArchivedWeekIds() } };
  const [agent, salesRaw] = await Promise.all([
    prisma.agent.findUnique({ where: { id: agentId } }),
    prisma.sale.findMany({ where }),
  ]);
  const sales = sortByHouseNumberDesc(salesRaw);

  if (!agent) return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });

  // Absence affichée uniquement sur la semaine en cours (une semaine
  // archivée reflète une période passée, l'absence actuelle n'a pas de sens).
  let isAbsentToday = false;
  if (!requestedWeekId) {
    const today = new Date();
    const absence = await prisma.absence.findFirst({
      where: { agentId, startDate: { lte: today }, endDate: { gte: today } },
    });
    isAbsentToday = !!absence;
  }

  return NextResponse.json({
    agent: {
      id: agent.id,
      name: `${agent.firstName} ${agent.lastName}`,
      avatarUrl: agent.avatarUrl,
      grade: agent.grade,
      role: agent.role,
    },
    sales,
    isAbsentToday,
  });
}

// Admin seul (mode éditeur) : saisir une vente directement sur la fiche
// d'un autre agent.
export async function POST(req: NextRequest, { params }: { params: Promise<{ agentId: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  if (!session?.user || !isAdmin) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { agentId } = await params;
  const target = await prisma.agent.findUnique({ where: { id: agentId }, select: { grade: true } });
  if (!target) return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });
  if (target.grade === "SEC") {
    return NextResponse.json({ error: "Ce compte ne peut pas enregistrer de vente." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const houseNumber = body?.houseNumber?.trim();
  const clientName = body?.clientName?.trim();
  const priceAmount = Number(body?.priceAmount);
  const clientPhone = body?.clientPhone?.trim() || null;
  const date = body?.date ? new Date(body.date) : new Date();

  if (!houseNumber || !clientName || !Number.isFinite(priceAmount) || priceAmount <= 0) {
    return NextResponse.json({ error: "Numéro d'habitation, client et prix sont requis." }, { status: 400 });
  }

  const weekId = await getActiveWeekId();
  const sale = await prisma.sale.create({
    data: {
      agentId,
      houseNumber,
      clientName,
      clientPhone,
      priceAmount,
      date,
      weekId,
      companyProfit: priceAmount * COMPANY_PROFIT_RATE,
    },
  });

  const actorName = user!.name ?? "Admin";
  await logActivity({
    actorId: user!.id!,
    actorName,
    action: "CREATE",
    entityType: "Sale",
    entityId: sale.id,
    summary: `${actorName} a ajouté une vente pour un autre agent — habitation #${houseNumber}, ${clientName}, $${priceAmount.toLocaleString("fr-FR")}`,
  });

  return NextResponse.json(sale, { status: 201 });
}
