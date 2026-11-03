import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Messages préfaits mis en favori par l'agent lui-même (étoile) — purement
// personnel, pour un accès rapide depuis le Tableau de bord sans fouiller
// dans les dépliants. Même pattern que /api/my-pinned-pages.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const agent = await prisma.agent.findUnique({ where: { id: userId }, select: { favoriteMessageIds: true } });
  let favoriteMessageIds: string[] = [];
  try {
    favoriteMessageIds = JSON.parse(agent?.favoriteMessageIds || "[]");
  } catch {
    favoriteMessageIds = [];
  }
  return NextResponse.json({ favoriteMessageIds });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.favoriteMessageIds) || !body.favoriteMessageIds.every((h: unknown) => typeof h === "string")) {
    return NextResponse.json({ error: "Liste invalide." }, { status: 400 });
  }

  await prisma.agent.update({
    where: { id: userId },
    data: { favoriteMessageIds: JSON.stringify(body.favoriteMessageIds) },
  });

  return NextResponse.json({ favoriteMessageIds: body.favoriteMessageIds });
}
