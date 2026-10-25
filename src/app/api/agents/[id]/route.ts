import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-log";
import { hasServerPermission } from "@/lib/permissions-server";

const FIELD_LABELS: Record<string, string> = {
  phone: "téléphone",
  grade: "grade",
  canAccessAccounting: "accès comptabilité",
  permissionsJson: "permissions",
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
  if (!session?.user || !(await hasServerPermission(sessionUser?.id, role, "administration"))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);

  if (typeof body?.permissionsJson === "string") {
    // Réservé aux vrais admins : un agent avec juste la permission
    // "administration" ne doit pas pouvoir s'accorder (ou accorder à
    // d'autres) davantage de droits que ce qu'un admin lui a donné.
    if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Seul un admin peut modifier les permissions." }, { status: 403 });
    }
  }

  const data: Record<string, unknown> = {};
  if (typeof body?.phone === "string") data.phone = body.phone || null;

  if (typeof body?.grade === "string") {
    const isRealAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
    // Un agent qui n'a que la permission "administration" (pas un vrai
    // admin) ne doit pas pouvoir s'auto-promouvoir, ni changer le grade
    // d'un collègue mieux classé que lui, ni promouvoir quelqu'un à un
    // rang égal ou supérieur au sien.
    if (!isRealAdmin) {
      if (id === sessionUser?.id) {
        return NextResponse.json({ error: "Tu ne peux pas changer ton propre grade." }, { status: 403 });
      }
      const [actor, target, rules] = await Promise.all([
        prisma.agent.findUnique({ where: { id: sessionUser!.id! }, select: { grade: true } }),
        prisma.agent.findUnique({ where: { id }, select: { grade: true } }),
        prisma.commissionRule.findMany({ orderBy: { order: "asc" }, select: { grade: true } }),
      ]);
      const rankOf = (grade: string | undefined) => {
        const idx = rules.findIndex((r) => r.grade === grade);
        return idx === -1 ? rules.length : idx;
      };
      const actorRank = rankOf(actor?.grade);
      const targetRank = rankOf(target?.grade);
      const newRank = rankOf(body.grade);
      if (targetRank <= actorRank || newRank <= actorRank) {
        return NextResponse.json(
          { error: "Tu ne peux pas attribuer un grade égal ou supérieur au tien." },
          { status: 403 }
        );
      }
    }
    data.grade = body.grade;
  }
  if (typeof body?.canAccessAccounting === "boolean") data.canAccessAccounting = body.canAccessAccounting;
  if (typeof body?.permissionsJson === "string") data.permissionsJson = body.permissionsJson;
  // Désactiver (démission) plutôt que supprimer : le compte ne peut plus se
  // connecter et sort de la liste active, mais ses ventes passées restent
  // visibles dans les anciennes comptas — il apparaît dans "Archive Employés".
  if (typeof body?.active === "boolean") {
    if (id === sessionUser?.id && !body.active) {
      return NextResponse.json({ error: "Tu ne peux pas désactiver ton propre compte." }, { status: 400 });
    }
    if (!(await hasServerPermission(sessionUser?.id, role, "agentsSupprimer"))) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
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

// Suppression définitive — réservée aux comptes déjà désactivés (démission),
// pour éviter de supprimer un employé actif par erreur sans passer par la
// désactivation d'abord. Ses ventes/garages passés ne sont pas supprimés
// (pas de cascade) : ils restent dans les archives, juste associés à un
// agent qui n'existe plus ("Inconnu" à l'affichage).
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(sessionUser?.id, sessionUser?.role, "agentsSupprimer"))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  if (id === sessionUser?.id) {
    return NextResponse.json({ error: "Tu ne peux pas supprimer ton propre compte." }, { status: 400 });
  }

  const existing = await prisma.agent.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Compte introuvable" }, { status: 404 });
  if (existing.role === "SUPER_ADMIN") {
    return NextResponse.json({ error: "Impossible de supprimer un compte Super Admin." }, { status: 400 });
  }
  if (existing.active) {
    return NextResponse.json({ error: "Désactive d'abord ce compte avant de le supprimer." }, { status: 400 });
  }

  await prisma.agent.delete({ where: { id } });

  const actorName = sessionUser!.name ?? "Admin";
  await logActivity({
    actorId: sessionUser!.id,
    actorName,
    action: "DELETE",
    entityType: "Agent",
    entityId: id,
    summary: `${actorName} a supprimé définitivement le compte ${existing.firstName} ${existing.lastName} (${existing.loginHandle})`,
  });

  return NextResponse.json({ ok: true });
}
