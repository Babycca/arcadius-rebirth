import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-log";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !isAdmin(user?.role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

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
