import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canEditGroup } from "@/lib/text-group-access";

async function loadItemWithGroup(id: string) {
  const item = await prisma.textSnippet.findUnique({ where: { id }, include: { group: true } });
  return item;
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { id } = await params;
  const existing = await loadItemWithGroup(id);
  if (!existing) return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  if (!canEditGroup(user?.role, user?.id, existing.group)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.content === "string") data.content = body.content.trim();
  if ("price" in (body ?? {})) data.price = body.price != null && body.price !== "" ? Number(body.price) : null;
  if (typeof body?.order === "number") data.order = body.order;

  const item = await prisma.textSnippet.update({ where: { id }, data });
  return NextResponse.json(item);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { id } = await params;
  const existing = await loadItemWithGroup(id);
  if (!existing) return NextResponse.json({ error: "Message introuvable" }, { status: 404 });
  if (!canEditGroup(user?.role, user?.id, existing.group)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await prisma.textSnippet.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
