import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function requireAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !requireAdmin(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  // Le Super Admin reste masqué ici (compte technique) mais un grade comme
  // "Sec" doit rester gérable en Administration — il n'est exclu que de la
  // Comptabilité (voir HIDDEN_FROM_AGENT_LISTS_WHERE), pas de cette liste.
  const agents = await prisma.agent.findMany({
    where: { role: { not: "SUPER_ADMIN" } },
    orderBy: { order: "asc" },
    select: {
      id: true, firstName: true, lastName: true, loginHandle: true, phone: true,
      grade: true, role: true, mustChangePassword: true, canAccessAccounting: true, active: true,
    },
  });
  return NextResponse.json(agents);
}

function randomPassword() {
  return Math.random().toString(36).slice(-10);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !requireAdmin(role)) {
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

  return NextResponse.json({ agent, tempPassword }, { status: 201 });
}
