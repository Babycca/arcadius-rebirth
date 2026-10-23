import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NAV_PAGES } from "@/lib/nav-pages";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const rows = await prisma.pageVisibility.findMany({ orderBy: { order: "asc" } });
  const byHref = new Map(rows.map((r) => [r.href, r]));

  // Complète les pages canoniques qui n'ont pas encore de ligne en base
  // (jamais réordonnées/masquées par un admin) avec des valeurs par défaut,
  // pour qu'elles apparaissent quand même dans les panneaux de gestion.
  // Dépenses/Archive Comptabilité étaient auparavant des liens codés en dur
  // réservés aux admins : on garde ce comportement par défaut (masquées
  // pour les agents simples) tant qu'un admin ne les rend pas visibles.
  const ADMIN_ONLY_BY_DEFAULT = new Set(["/comptabilite/depenses", "/comptabilite/archive"]);
  const missing = NAV_PAGES.filter((p) => !byHref.has(p.href)).map((p, i) => ({
    href: p.href,
    hiddenForAll: ADMIN_ONLY_BY_DEFAULT.has(p.href),
    hiddenForAgentIds: "[]",
    order: rows.length + i,
  }));

  return NextResponse.json([...rows, ...missing]);
}
