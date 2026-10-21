import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canEdit(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ href: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canEdit(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { href } = await params;
  const decodedHref = `/${decodeURIComponent(href)}`;
  const body = await req.json().catch(() => null);
  const data: Record<string, unknown> = {};
  if (typeof body?.hiddenForAll === "boolean") data.hiddenForAll = body.hiddenForAll;
  if (Array.isArray(body?.hiddenForAgentIds)) data.hiddenForAgentIds = JSON.stringify(body.hiddenForAgentIds);
  if (typeof body?.order === "number") data.order = body.order;

  const page = await prisma.pageVisibility.upsert({
    where: { href: decodedHref },
    update: data,
    create: { href: decodedHref, ...data },
  });
  return NextResponse.json(page);
}
