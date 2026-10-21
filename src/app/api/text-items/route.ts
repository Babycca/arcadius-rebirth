import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditGroup } from "@/lib/text-group-access";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const groupId = body?.groupId;
  const content = body?.content?.trim();
  const price = body?.price != null && body.price !== "" ? Number(body.price) : null;
  if (!groupId || !content) return NextResponse.json({ error: "Contenu requis." }, { status: 400 });

  const group = await prisma.textGroup.findUnique({ where: { id: groupId } });
  if (!group) return NextResponse.json({ error: "Dépliant introuvable" }, { status: 404 });
  if (!canEditGroup(user?.role, user?.id, group)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const count = await prisma.textSnippet.count({ where: { groupId } });
  const item = await prisma.textSnippet.create({
    data: { groupId, content, price, order: count },
  });
  return NextResponse.json(item, { status: 201 });
}
