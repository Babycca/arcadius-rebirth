import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWeekId } from "@/lib/accounting/week";
import { logActivity } from "@/lib/audit-log";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (!session?.user || !isAdmin(user?.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const requestedWeekId = req.nextUrl.searchParams.get("weekId");
  const weekId = requestedWeekId || (await getActiveWeekId());
  const expenses = await prisma.expense.findMany({ where: { weekId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id: string; name?: string; role?: string } | undefined;
  if (!session?.user || !isAdmin(user?.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const reason = body?.reason?.trim();
  const amount = Number(body?.amount);

  if (!reason || !Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "La raison et le montant sont requis." }, { status: 400 });
  }

  const weekId = await getActiveWeekId();
  const expense = await prisma.expense.create({
    data: { reason, amount, weekId, createdBy: user!.id },
  });

  const actorName = user!.name ?? "Admin";
  await logActivity({
    actorId: user!.id,
    actorName,
    action: "CREATE",
    entityType: "Expense",
    entityId: expense.id,
    summary: `${actorName} a ajouté une dépense — ${reason}, $${amount.toLocaleString("fr-FR")}`,
  });

  return NextResponse.json(expense, { status: 201 });
}
