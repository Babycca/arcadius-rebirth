import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ href: string }> }) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "administration")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

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
