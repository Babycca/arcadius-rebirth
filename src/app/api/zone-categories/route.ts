import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canEdit(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET() {
  const categories = await prisma.reservedZoneCategory.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canEdit(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const name = body?.name?.trim();
  const color = body?.color?.trim() || "#a78bfa";
  if (!name) return NextResponse.json({ error: "Nom requis." }, { status: 400 });

  const id = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || `cat-${Date.now()}`;

  const existing = await prisma.reservedZoneCategory.findUnique({ where: { id } });
  if (existing) return NextResponse.json({ error: "Une catégorie avec ce nom existe déjà." }, { status: 409 });

  const count = await prisma.reservedZoneCategory.count();
  const category = await prisma.reservedZoneCategory.create({
    data: { id, name, color, order: count },
  });
  return NextResponse.json(category, { status: 201 });
}
