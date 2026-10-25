import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "pagesVisibilite")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

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
