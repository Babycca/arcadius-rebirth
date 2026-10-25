import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { hasServerPermission } from "@/lib/permissions-server";
import { parseLegacyPaste } from "@/lib/accounting/legacy-import";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiveComptabilite")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const archives = await prisma.legacyArchive.findMany({
    orderBy: { createdAt: "desc" },
    include: { sales: true },
  });

  return NextResponse.json(
    archives.map((a) => ({
      id: a.id,
      label: a.label,
      createdAt: a.createdAt,
      salesCount: a.sales.length,
      totalSales: a.sales.reduce((s, x) => s + x.priceAmount, 0),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!session?.user || !(await hasServerPermission(user?.id, user?.role, "archiveComptabilite")))
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const body = await req.json().catch(() => null);
  const label = body?.label?.trim();
  const pasted = body?.pasted;
  if (!label || typeof pasted !== "string" || !pasted.trim()) {
    return NextResponse.json({ error: "Libellé et contenu collé requis." }, { status: 400 });
  }

  const parsed = parseLegacyPaste(pasted);
  if (parsed.length === 0) {
    return NextResponse.json({ error: "Aucune ligne de vente reconnue dans le texte collé." }, { status: 400 });
  }

  const archive = await prisma.legacyArchive.create({
    data: {
      label,
      sales: {
        create: parsed.map((s, order) => ({ ...s, order })),
      },
    },
    include: { sales: true },
  });

  return NextResponse.json(archive, { status: 201 });
}
