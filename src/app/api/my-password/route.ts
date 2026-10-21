import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => null);
  const currentPassword = body?.currentPassword;
  const newPassword = body?.newPassword;

  if (!newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: "Le nouveau mot de passe doit faire au moins 6 caractères." }, { status: 400 });
  }

  const agent = await prisma.agent.findUnique({ where: { id: userId } });
  if (!agent) return NextResponse.json({ error: "Agent introuvable" }, { status: 404 });

  if (!agent.mustChangePassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: "Mot de passe actuel requis." }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, agent.passwordHash);
    if (!valid) return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 401 });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.agent.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });

  return NextResponse.json({ ok: true });
}
