import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canEdit(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canEdit(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.zoneName === "string") data.zoneName = body.zoneName.trim();
  if (typeof body?.region === "string") data.region = body.region || null;
  if (body?.basePrice != null) data.basePrice = Number(body.basePrice);
  if ("maxPrice" in (body ?? {})) data.maxPrice = body.maxPrice != null && body.maxPrice !== "" ? Number(body.maxPrice) : null;

  const profile = await prisma.estimationProfile.update({ where: { id }, data });
  return NextResponse.json(profile);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canEdit(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  await prisma.estimationProfile.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
