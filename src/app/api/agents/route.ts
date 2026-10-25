import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logActivity } from "@/lib/audit-log";
import { hasServerPermission } from "@/lib/permissions-server";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  // Liste des agents aussi utilisée comme simple sélecteur par les pages
  // Absences/Sanctions (pas seulement l'Administration elle-même).
  const allowed =
    session?.user &&
    ((await hasServerPermission(user?.id, user?.role, "administration")) ||
      (await hasServerPermission(user?.id, user?.role, "absences")) ||
      (await hasServerPermission(user?.id, user?.role, "sanctions")));
  if (!allowed) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  // Le Super Admin reste masqué ici (compte technique) mais un grade comme
  // "Sec" doit rester gérable en Administration — il n'est exclu que de la
  // Comptabilité (voir HIDDEN_FROM_AGENT_LISTS_WHERE), pas de cette liste.
  const agents = await prisma.agent.findMany({
    where: { role: { not: "SUPER_ADMIN" } },
    orderBy: { order: "asc" },
    select: {
      id: true, firstName: true, lastName: true, loginHandle: true, phone: true, avatarUrl: true,
      grade: true, role: true, mustChangePassword: true, canAccessAccounting: true, active: true, permissionsJson: true,
    },
  });
  return NextResponse.json(agents);
}

function randomPassword() {
  return Math.random().toString(36).slice(-10);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const sessionUser = session?.user as { id?: string; name?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(sessionUser?.id, sessionUser?.role, "agentsCreer"))) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const firstName = body?.firstName?.trim();
  const lastName = body?.lastName?.trim();
  const grade = body?.grade?.trim() || "AGENT_NOVICE";
  const phone = body?.phone?.trim() || null;

  if (!firstName || !lastName) {
    return NextResponse.json({ error: "Prénom et nom requis." }, { status: 400 });
  }

  const isRealAdmin = sessionUser?.role === "ADMIN" || sessionUser?.role === "SUPER_ADMIN";
  if (grade === "Sec" && !isRealAdmin) {
    return NextResponse.json({ error: "Seul un admin peut attribuer le grade Sec." }, { status: 403 });
  }

  const loginHandle = `${firstName}.${lastName}`.toLowerCase().replace(/\s+/g, "");
  const tempPassword = randomPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  const existing = await prisma.agent.findUnique({ where: { loginHandle } });
  if (existing) {
    return NextResponse.json({ error: "Un agent avec cet identifiant existe déjà." }, { status: 409 });
  }

  const agent = await prisma.agent.create({
    data: { firstName, lastName, loginHandle, grade, phone, passwordHash, role: "AGENT" },
  });

  const actorName = sessionUser!.name ?? "Admin";
  await logActivity({
    actorId: sessionUser!.id,
    actorName,
    action: "CREATE",
    entityType: "Agent",
    entityId: agent.id,
    summary: `${actorName} a créé le compte ${firstName} ${lastName} (${grade})`,
  });

  return NextResponse.json({ agent, tempPassword }, { status: 201 });
}
