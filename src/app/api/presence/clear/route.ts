import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Appelé juste avant la déconnexion volontaire pour sortir immédiatement
// l'agent de la liste "en ligne" sans attendre l'expiration du seuil.
export async function POST() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  await prisma.agent.update({ where: { id: userId }, data: { lastSeenAt: null } });
  return NextResponse.json({ ok: true });
}
