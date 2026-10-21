import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => null);

  const accentColor: string | null = body?.accentColor ?? null;

  const agent = await prisma.agent.update({
    where: { id: userId },
    data: { accentColor },
  });

  return NextResponse.json({ accentColor: agent.accentColor });
}
