import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const categories = await prisma.reservedZoneCategory.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "administration")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

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
