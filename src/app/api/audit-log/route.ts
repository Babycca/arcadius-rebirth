import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const page = Math.max(0, Number(req.nextUrl.searchParams.get("page")) || 0);
  const action = req.nextUrl.searchParams.get("action");
  const entityType = req.nextUrl.searchParams.get("entityType");
  const actor = req.nextUrl.searchParams.get("actor")?.trim();
  const actorId = req.nextUrl.searchParams.get("actorId");

  const where: Record<string, unknown> = {};
  if (action) where.action = action;
  if (entityType) where.entityType = entityType;
  if (actor) where.actorName = { contains: actor, mode: "insensitive" };
  if (actorId) where.actorId = actorId;

  const [logs, total, entityTypes] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: page * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({ distinct: ["entityType"], select: { entityType: true } }),
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    pageSize: PAGE_SIZE,
    entityTypes: entityTypes.map((e) => e.entityType).sort(),
  });
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  await prisma.auditLog.deleteMany({});
  return NextResponse.json({ ok: true });
}
