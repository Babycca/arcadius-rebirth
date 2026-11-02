import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-log";
import { hasServerPermission } from "@/lib/permissions-server";
import { titleCase } from "@/lib/text-case";

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
  // Champs partiels : un transfert d'agent seul (voir plus bas) n'envoie que
  // "agentId", le reste garde sa valeur actuelle.
  const houseNumber = typeof body?.houseNumber === "string" ? body.houseNumber.trim() : sale.houseNumber;
  const clientName = typeof body?.clientName === "string" ? titleCase(body.clientName.trim()) : sale.clientName;
  const priceAmount = body?.priceAmount != null ? Number(body.priceAmount) : sale.priceAmount;
  const clientPhone = "clientPhone" in (body ?? {}) ? body.clientPhone?.trim() || null : sale.clientPhone;
  const date = body?.date ? new Date(body.date) : sale.date;

  if (!houseNumber || !clientName || !Number.isFinite(priceAmount) || priceAmount <= 0) {
    return NextResponse.json({ error: "Numéro d'habitation, client et prix sont requis." }, { status: 400 });
  }

  const data: Record<string, unknown> = {
    houseNumber,
    clientName,
    clientPhone,
    priceAmount,
    date,
    companyProfit: priceAmount * COMPANY_PROFIT_RATE,
  };

  // Transférer une vente à un autre agent — réservé aux admins ou à un
  // agent simple ayant reçu la permission "ventesTransferer".
  if (typeof body?.agentId === "string" && body.agentId !== sale.agentId) {
    if (!(await hasServerPermission(user.id, user.role, "ventesTransferer"))) {
      return NextResponse.json({ error: "Tu n'as pas la permission de transférer une vente." }, { status: 403 });
    }
    const target = await prisma.agent.findUnique({ where: { id: body.agentId }, select: { id: true, grade: true } });
    if (!target) return NextResponse.json({ error: "Agent introuvable." }, { status: 400 });
    if (target.grade === "SEC") {
      return NextResponse.json({ error: "Ce compte ne peut pas recevoir de vente." }, { status: 400 });
    }
    data.agentId = body.agentId;
  }

  const updated = await prisma.sale.update({ where: { id }, data });

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
