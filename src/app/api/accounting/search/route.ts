import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";
import { HIDDEN_FROM_AGENT_LISTS_WHERE } from "@/lib/agent-filters";

// Recherche par nom de client ou numéro d'habitation à travers TOUTES les
// ventes/garages (archivés ou non) ET les anciennes archives importées
// (LegacySale, voir /comptabilite/archive/import) — permission dédiée
// ("rechercheComptabilite"), déléguable indépendamment de l'accès à
// l'archive elle-même.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "rechercheComptabilite")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ sales: [], garages: [], legacySales: [] });

  const [resets, sales, garages, agents, legacySales] = await Promise.all([
    prisma.weeklyReset.findMany({ select: { weekId: true } }),
    prisma.sale.findMany({
      where: { OR: [{ clientName: { contains: q, mode: "insensitive" } }, { houseNumber: { contains: q } }] },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.garageSale.findMany({
      where: { houseNumber: { contains: q } },
      orderBy: { date: "desc" },
      take: 100,
    }),
    prisma.agent.findMany({ where: HIDDEN_FROM_AGENT_LISTS_WHERE, select: { id: true, firstName: true, lastName: true } }),
    prisma.legacySale.findMany({
      where: {
        OR: [
          { clientName: { contains: q, mode: "insensitive" } },
          { houseNumber: { contains: q } },
          { agentName: { contains: q, mode: "insensitive" } },
        ],
      },
      include: { archive: { select: { label: true } } },
      orderBy: { date: "desc" },
      take: 100,
    }),
  ]);

  const archivedWeekIds = new Set(resets.map((r) => r.weekId));
  const nameById = new Map(agents.map((a) => [a.id, `${a.firstName} ${a.lastName}`]));

  return NextResponse.json({
    sales: sales
      .filter((s) => nameById.has(s.agentId))
      .map((s) => ({
        id: s.id,
        agentId: s.agentId,
        agentName: nameById.get(s.agentId) ?? "Inconnu",
        date: s.date,
        houseNumber: s.houseNumber,
        priceAmount: s.priceAmount,
        clientName: s.clientName,
        clientPhone: s.clientPhone,
        weekId: s.weekId,
        isFormallyArchived: archivedWeekIds.has(s.weekId),
      })),
    garages: garages
      .filter((g) => nameById.has(g.agentId))
      .map((g) => ({
        id: g.id,
        agentId: g.agentId,
        agentName: nameById.get(g.agentId) ?? "Inconnu",
        date: g.date,
        type: g.type,
        name: g.name,
        houseNumber: g.houseNumber,
        priceAmount: g.priceAmount,
        weekId: g.weekId,
        isFormallyArchived: archivedWeekIds.has(g.weekId),
      })),
    legacySales: legacySales.map((s) => ({
      id: s.id,
      archiveId: s.archiveId,
      archiveLabel: s.archive.label,
      agentName: s.agentName,
      date: s.date,
      houseNumber: s.houseNumber,
      priceAmount: s.priceAmount,
      clientName: s.clientName,
      clientPhone: s.clientPhone,
    })),
  });
}
