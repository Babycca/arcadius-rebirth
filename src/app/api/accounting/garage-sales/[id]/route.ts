import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { GARAGE_TYPES } from "../route";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const { id } = await params;
  const garageSale = await prisma.garageSale.findUnique({ where: { id } });
  if (!garageSale) return NextResponse.json({ error: "Garage introuvable" }, { status: 404 });
  if (garageSale.agentId !== user.id && !isAdmin(user.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const type = body?.type?.trim();
  const houseNumber = body?.houseNumber?.trim();
  const priceAmount = Number(body?.priceAmount);
  const date = body?.date ? new Date(body.date) : garageSale.date;

  if (!GARAGE_TYPES.includes(type) || !houseNumber || !Number.isFinite(priceAmount) || priceAmount <= 0) {
    return NextResponse.json({ error: "Type, numéro d'habitation et prix sont requis." }, { status: 400 });
  }

  const updated = await prisma.garageSale.update({
    where: { id },
    data: { type, houseNumber, priceAmount, date },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });
  const user = session.user as { id: string; role?: string };

  const { id } = await params;
  const garageSale = await prisma.garageSale.findUnique({ where: { id } });
  if (!garageSale) return NextResponse.json({ error: "Garage introuvable" }, { status: 404 });
  if (garageSale.agentId !== user.id && !isAdmin(user.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  await prisma.garageSale.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
