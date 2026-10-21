import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole, PERSONAL_SECTION } from "@/lib/text-group-access";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const section = body?.section?.trim();
  const name = body?.name?.trim();
  if (!section || !name) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  const isPersonal = section === PERSONAL_SECTION;
  if (!isPersonal && !isAdminRole(user?.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const ownerId = isPersonal ? user?.id : null;
  const count = await prisma.textGroup.count({ where: { section, ownerId } });
  const group = await prisma.textGroup.create({
    data: { section, name, order: count, ownerId },
    include: { items: true },
  });
  return NextResponse.json(group, { status: 201 });
}
