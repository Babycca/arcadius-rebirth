import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canEdit(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET() {
  const profiles = await prisma.estimationProfile.findMany({
    orderBy: [{ structureType: "asc" }, { order: "asc" }],
    include: {
      criteria: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
      interiorGroups: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
    },
  });
  return NextResponse.json(profiles);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canEdit(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const structureType = body?.structureType?.trim();
  const zoneName = body?.zoneName?.trim();
  const basePrice = Number(body?.basePrice);
  if (!structureType || !zoneName || !Number.isFinite(basePrice)) {
    return NextResponse.json({ error: "Type, zone et prix de départ requis." }, { status: 400 });
  }

  const count = await prisma.estimationProfile.count({ where: { structureType } });
  const profile = await prisma.estimationProfile.create({
    data: { structureType, zoneName, basePrice, order: count },
    include: { criteria: { include: { options: true } }, interiorGroups: { include: { items: true } } },
  });
  return NextResponse.json(profile, { status: 201 });
}
