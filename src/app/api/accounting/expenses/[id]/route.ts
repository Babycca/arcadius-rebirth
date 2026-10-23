import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-log";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !isAdmin(user?.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const reason = body?.reason?.trim();
  const amount = Number(body?.amount);

  if (!reason || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "La raison et le montant sont requis." }, { status: 400 });
  }

  const updated = await prisma.expense.update({ where: { id }, data: { reason, amount } });

  const actorName = user?.name ?? "Admin";
  await logActivity({
    actorId: user?.id,
    actorName,
    action: "UPDATE",
    entityType: "Expense",
    entityId: id,
    summary: `${actorName} a modifié une dépense — ${reason}, $${amount.toLocaleString("fr-FR")}`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !isAdmin(user?.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.expense.findUnique({ where: { id } });
  await prisma.expense.delete({ where: { id } });

  const actorName = user?.name ?? "Admin";
  await logActivity({
    actorId: user?.id,
    actorName,
    action: "DELETE",
    entityType: "Expense",
    entityId: id,
    summary: `${actorName} a supprimé une dépense — ${existing?.reason ?? ""}, $${existing?.amount.toLocaleString("fr-FR") ?? ""}`,
  });

  return NextResponse.json({ ok: true });
}
