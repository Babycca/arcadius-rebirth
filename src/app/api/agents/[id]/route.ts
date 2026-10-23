import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-log";

function requireAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

const FIELD_LABELS: Record<string, string> = {
  phone: "téléphone",
  grade: "grade",
  canAccessAccounting: "accès comptabilité",
  active: "statut actif",
  firstName: "prénom",
  lastName: "nom",
  loginHandle: "identifiant",
  role: "rôle",
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; name?: string; role?: string } | undefined;
  const role = sessionUser?.role;
  if (!session?.user || !requireAdmin(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);

  const data: Record<string, unknown> = {};
  if (typeof body?.phone === "string") data.phone = body.phone || null;
  if (typeof body?.grade === "string") data.grade = body.grade;
  if (typeof body?.canAccessAccounting === "boolean") data.canAccessAccounting = body.canAccessAccounting;
  // Désactiver (démission) plutôt que supprimer : le compte ne peut plus se
  // connecter et sort de la liste active, mais ses ventes passées restent
  // visibles dans les anciennes comptas — il apparaît dans "Archive Employés".
  if (typeof body?.active === "boolean") {
    if (id === sessionUser?.id && !body.active) {
      return NextResponse.json({ error: "Tu ne peux pas désactiver ton propre compte." }, { status: 400 });
    }
    data.active = body.active;
  }
  if (typeof body?.firstName === "string" && body.firstName.trim()) data.firstName = body.firstName.trim();
  if (typeof body?.lastName === "string" && body.lastName.trim()) data.lastName = body.lastName.trim();

  if (typeof body?.loginHandle === "string" && body.loginHandle.trim()) {
    const loginHandle = body.loginHandle.trim().toLowerCase();
    const existing = await prisma.agent.findUnique({ where: { loginHandle } });
    if (existing && existing.id !== id) {
      return NextResponse.json({ error: "Un agent avec cet identifiant existe déjà." }, { status: 409 });
    }
    data.loginHandle = loginHandle;
  }

  // Changer le rôle (Admin <-> Agent simple) — réservé au Super Admin, qui
  // ne peut pas non plus se retirer lui-même ses droits (évite de se bloquer
  // soi-même hors de l'administration).
  if (typeof body?.role === "string") {
    if (role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Seul un Super Admin peut changer les rôles." }, { status: 403 });
    }
    if (body.role !== "ADMIN" && body.role !== "AGENT") {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }
    if (id === sessionUser?.id) {
      return NextResponse.json({ error: "Tu ne peux pas changer ton propre rôle." }, { status: 400 });
    }
    data.role = body.role;
  }

  const agent = await prisma.agent.update({ where: { id }, data });

  const actorName = sessionUser!.name ?? "Admin";
  const changedFields = Object.keys(data).map((k) => FIELD_LABELS[k] ?? k);
  if (changedFields.length > 0) {
    await logActivity({
      actorId: sessionUser!.id,
      actorName,
      action: "UPDATE",
      entityType: "Agent",
      entityId: id,
      summary: `${actorName} a modifié ${agent.firstName} ${agent.lastName} — ${changedFields.join(", ")}`,
    });
  }

  return NextResponse.json(agent);
}
