import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";
import { logActivity } from "@/lib/audit-log";

// Supprime définitivement UNE entrée de la corbeille (sans tout vider).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "ventesSupprimer")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  await prisma.deletedSale.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}

// Restaure une vente supprimée — recrée la vente avec un nouvel id, retire
// l'entrée de la corbeille.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "ventesSupprimer")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const deleted = await prisma.deletedSale.findUnique({ where: { id } });
  if (!deleted) return NextResponse.json({ error: "Introuvable dans la corbeille" }, { status: 404 });

  const [restored] = await prisma.$transaction([
    prisma.sale.create({
      data: {
        agentId: deleted.agentId,
        date: deleted.date,
        houseNumber: deleted.houseNumber,
        priceAmount: deleted.priceAmount,
        clientName: deleted.clientName,
        clientPhone: deleted.clientPhone,
        weekId: deleted.weekId,
        companyProfit: deleted.companyProfit,
      },
    }),
    prisma.deletedSale.delete({ where: { id } }),
  ]);

  const actorName = user!.name ?? "Admin";
  await logActivity({
    actorId: user!.id!,
    actorName,
    action: "CREATE",
    entityType: "Sale",
    entityId: restored.id,
    summary: `${actorName} a restauré une vente depuis la corbeille — habitation #${deleted.houseNumber}, ${deleted.clientName}, $${deleted.priceAmount.toLocaleString("fr-FR")}`,
  });

  return NextResponse.json(restored);
}
