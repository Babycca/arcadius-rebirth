import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";
import { logActivity } from "@/lib/audit-log";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "absences")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.absence.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Absence introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const startDate = body?.startDate ? new Date(body.startDate) : existing.startDate;
  const endDate = body?.endDate ? new Date(body.endDate) : existing.endDate;
  const reason = "reason" in (body ?? {}) ? body.reason?.trim() || null : existing.reason;

  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return NextResponse.json({ error: "Dates invalides." }, { status: 400 });
  }
  if (endDate < startDate) {
    return NextResponse.json({ error: "La date de fin doit être après la date de début." }, { status: 400 });
  }

  const updated = await prisma.absence.update({ where: { id }, data: { startDate, endDate, reason } });

  const agent = await prisma.agent.findUnique({ where: { id: existing.agentId } });
  const actorName = user!.name ?? "Admin";
  await logActivity({
    actorId: user!.id,
    actorName,
    action: "UPDATE",
    entityType: "Absence",
    entityId: id,
    summary: `${actorName} a modifié une absence de ${agent ? `${agent.firstName} ${agent.lastName}` : "Inconnu"} (${startDate.toLocaleDateString("fr-FR")} → ${endDate.toLocaleDateString("fr-FR")})`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "absencesSupprimer")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.absence.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Absence introuvable" }, { status: 404 });

  const agent = await prisma.agent.findUnique({ where: { id: existing.agentId } });
  await prisma.absence.delete({ where: { id } });

  const actorName = user!.name ?? "Admin";
  await logActivity({
    actorId: user!.id,
    actorName,
    action: "DELETE",
    entityType: "Absence",
    entityId: id,
    summary: `${actorName} a supprimé une absence de ${agent ? `${agent.firstName} ${agent.lastName}` : "Inconnu"}`,
  });

  return NextResponse.json({ ok: true });
}
