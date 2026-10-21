import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};

  if ("price" in (body ?? {})) {
    const price = body.price === null ? null : Number(body.price);
    if (price !== null && !Number.isFinite(price)) {
      return NextResponse.json({ error: "Prix invalide" }, { status: 400 });
    }
    data.price = price;
  }
  if (typeof body?.label === "string") data.label = body.label.trim() || null;
  if (typeof body?.reserved === "boolean") data.reserved = body.reserved;

  const pin = await prisma.priceMapPin.update({ where: { id }, data });
  return NextResponse.json(pin);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { id } = await params;
  await prisma.priceMapPin.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
