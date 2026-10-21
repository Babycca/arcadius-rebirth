import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function requireAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

function randomPassword() {
  return Math.random().toString(36).slice(-10);
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !requireAdmin(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const tempPassword = randomPassword();
  const passwordHash = await bcrypt.hash(tempPassword, 10);

  await prisma.agent.update({
    where: { id },
    data: { passwordHash, mustChangePassword: true },
  });

  return NextResponse.json({ tempPassword });
}
