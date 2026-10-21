import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditGroup } from "@/lib/text-group-access";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.textGroup.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Dépliant introuvable" }, { status: 404 });
  if (!canEditGroup(user?.role, user?.id, existing)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.name === "string") data.name = body.name.trim();
  if (typeof body?.order === "number") data.order = body.order;

  const group = await prisma.textGroup.update({ where: { id }, data });
  return NextResponse.json(group);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.textGroup.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Dépliant introuvable" }, { status: 404 });
  if (!canEditGroup(user?.role, user?.id, existing)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await prisma.textGroup.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
