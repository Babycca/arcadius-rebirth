import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

// Modifier / supprimer une vente d'une archive IMPORTÉE (ancien Google Sheets).
// Même droit que pour modifier une vente d'une archive normale.
async function checkAccess() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "ventesSupprimer"))) return false;
  return true;
}

type Params = { params: Promise<{ id: string; saleId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  if (!(await checkAccess())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id, saleId } = await params;
  const sale = await prisma.legacySale.findUnique({ where: { id: saleId } });
  if (!sale || sale.archiveId !== id) return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const agentName = typeof body?.agentName === "string" && body.agentName.trim() ? body.agentName.trim() : sale.agentName;
  const houseNumber = typeof body?.houseNumber === "string" ? body.houseNumber.trim() || null : sale.houseNumber;
  const clientName = typeof body?.clientName === "string" ? body.clientName.trim() || null : sale.clientName;
  const clientPhone = typeof body?.clientPhone === "string" ? body.clientPhone.trim() || null : sale.clientPhone;
  const priceAmount = body?.priceAmount != null ? Number(body.priceAmount) : sale.priceAmount;

  if (!Number.isFinite(priceAmount) || priceAmount < 0) {
    return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
  }

  const updated = await prisma.legacySale.update({
    where: { id: saleId },
    data: { agentName, houseNumber, clientName, clientPhone, priceAmount },
  });
  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!(await checkAccess())) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id, saleId } = await params;
  const sale = await prisma.legacySale.findUnique({ where: { id: saleId } });
  if (!sale || sale.archiveId !== id) return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });

  await prisma.legacySale.delete({ where: { id: saleId } });
  return NextResponse.json({ ok: true });
}
