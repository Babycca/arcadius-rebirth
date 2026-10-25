import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";
import { logActivity } from "@/lib/audit-log";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "sanctions")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.sanction.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Sanction introuvable" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const type = "type" in (body ?? {}) ? body.type?.trim() : existing.type;
  const reason = "reason" in (body ?? {}) ? body.reason?.trim() : existing.reason;
  const date = body?.date ? new Date(body.date) : existing.date;

  if (!type || !reason || isNaN(date.getTime())) {
    return NextResponse.json({ error: "Type, motif et date sont requis." }, { status: 400 });
  }

  const updated = await prisma.sanction.update({ where: { id }, data: { type, reason, date } });

  const agent = await prisma.agent.findUnique({ where: { id: existing.agentId } });
  const actorName = user!.name ?? "Admin";
  await logActivity({
    actorId: user!.id,
    actorName,
    action: "UPDATE",
    entityType: "Sanction",
    entityId: id,
    summary: `${actorName} a modifié une sanction de ${agent ? `${agent.firstName} ${agent.lastName}` : "Inconnu"}`,
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "sanctions")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.sanction.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Sanction introuvable" }, { status: 404 });

  const agent = await prisma.agent.findUnique({ where: { id: existing.agentId } });
  await prisma.sanction.delete({ where: { id } });

  const actorName = user!.name ?? "Admin";
  await logActivity({
    actorId: user!.id,
    actorName,
    action: "DELETE",
    entityType: "Sanction",
    entityId: id,
    summary: `${actorName} a supprimé une sanction de ${agent ? `${agent.firstName} ${agent.lastName}` : "Inconnu"}`,
  });

  return NextResponse.json({ ok: true });
}
