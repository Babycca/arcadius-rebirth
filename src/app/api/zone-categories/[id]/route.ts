import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "administration")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.color === "string") data.color = body.color.trim();
  if (typeof body?.emoji === "string" && body.emoji.trim()) data.emoji = body.emoji.trim();

  const category = await prisma.reservedZoneCategory.update({ where: { id }, data });
  return NextResponse.json(category);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "administration")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const inUse = await prisma.reservedZone.count({ where: { categoryId: id } });
  if (inUse > 0) {
    return NextResponse.json(
      { error: `${inUse} zone(s) utilisent encore cette catégorie — réaffecte-les avant de la supprimer.` },
      { status: 409 }
    );
  }
  await prisma.reservedZoneCategory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
