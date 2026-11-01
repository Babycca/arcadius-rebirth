import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Pages épinglées par l'agent lui-même — purement personnel, aucun droit
// particulier requis au-delà d'être connecté. Volontairement séparé de
// /api/my-profile (qui recalcule le payroll à chaque appel) : la Sidebar
// l'interroge à chaque page, ça doit rester léger.
export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const agent = await prisma.agent.findUnique({ where: { id: userId }, select: { pinnedPages: true } });
  let pinnedPages: string[] = [];
  try {
    pinnedPages = JSON.parse(agent?.pinnedPages || "[]");
  } catch {
    pinnedPages = [];
  }
  return NextResponse.json({ pinnedPages });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.pinnedPages) || !body.pinnedPages.every((h: unknown) => typeof h === "string")) {
    return NextResponse.json({ error: "Liste de pages invalide." }, { status: 400 });
  }

  await prisma.agent.update({
    where: { id: userId },
    data: { pinnedPages: JSON.stringify(body.pinnedPages) },
  });

  return NextResponse.json({ pinnedPages: body.pinnedPages });
}
