import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-log";
import { hasServerPermission } from "@/lib/permissions-server";

const COMPANY_PROFIT_RATE = 0.1;

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const user = session.user as { id: string; name?: string; role?: string };

  const { id } = await params;
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
  if (sale.agentId !== user.id && !(await hasServerPermission(user.id, user.role, "ventesSupprimer"))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const houseNumber = body?.houseNumber?.trim();
  const clientName = body?.clientName?.trim();
  const priceAmount = Number(body?.priceAmount);
  const clientPhone = body?.clientPhone?.trim() || null;
  const date = body?.date ? new Date(body.date) : sale.date;

  if (!houseNumber || !clientName || !Number.isFinite(priceAmount) || priceAmount <= 0) {
    return NextResponse.json({ error: "Numéro d'habitation, client et prix sont requis." }, { status: 400 });
  }

  const updated = await prisma.sale.update({
    where: { id },
    data: {
      houseNumber,
      clientName,
      clientPhone,
      priceAmount,
      date,
      companyProfit: priceAmount * COMPANY_PROFIT_RATE,
    },
  });

  const actorName = user.name ?? "Agent";
  await logActivity({
    actorId: user.id,
    actorName,
    action: "UPDATE",
    entityType: "Sale",
    entityId: id,
    summary: `${actorName} a modifié une vente — habitation #${houseNumber}, ${clientName}, $${priceAmount.toLocaleString("fr-FR")}`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const user = session.user as { id: string; name?: string; role?: string };

  const { id } = await params;
  const sale = await prisma.sale.findUnique({ where: { id } });
  if (!sale) return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });
  if (sale.agentId !== user.id && !(await hasServerPermission(user.id, user.role, "ventesSupprimer"))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await prisma.sale.delete({ where: { id } });

  const actorName = user.name ?? "Agent";
  await logActivity({
    actorId: user.id,
    actorName,
    action: "DELETE",
    entityType: "Sale",
    entityId: id,
    summary: `${actorName} a supprimé une vente — habitation #${sale.houseNumber}, ${sale.clientName}, $${sale.priceAmount.toLocaleString("fr-FR")}`,
  });

  return NextResponse.json({ ok: true });
}
