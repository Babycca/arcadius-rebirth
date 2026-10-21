import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function canEdit(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canEdit(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const hrefs: string[] = Array.isArray(body?.hrefs) ? body.hrefs : [];

  await Promise.all(
    hrefs.map((href, order) =>
      prisma.pageVisibility.upsert({
        where: { href },
        update: { order },
        create: { href, order },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
