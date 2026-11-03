import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Suggestions de clients déjà connus (nom + téléphone), tirées de TOUTES les
// ventes — en cours, archivées, et importées — pour éviter de retaper un
// client qui revient. Accessible à tout agent qui peut saisir une vente
// (pas réservé à la recherche admin) ; léger, pas de détails de semaine/prix.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json([]);

  const [sales, legacySales] = await Promise.all([
    prisma.sale.findMany({
      where: { OR: [{ clientName: { contains: q, mode: "insensitive" } }, { clientPhone: { contains: q } }] },
      select: { clientName: true, clientPhone: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
    prisma.legacySale.findMany({
      where: {
        OR: [{ clientName: { contains: q, mode: "insensitive" } }, { clientPhone: { contains: q } }],
      },
      select: { clientName: true, clientPhone: true },
      orderBy: { date: "desc" },
      take: 30,
    }),
  ]);

  // Beaucoup d'anciennes ventes ont un téléphone vide ou un espace réservé
  // ("-", "x", "/"...) plutôt qu'un vrai numéro — on ne propose jamais ça
  // comme suggestion, ça ne vaut pas mieux que de taper soi-même.
  function realPhone(raw: string | null): string | null {
    if (!raw) return null;
    const digits = raw.replace(/\D/g, "");
    return digits.length >= 5 ? raw.trim() : null;
  }

  const seen = new Set<string>();
  const results: { clientName: string; clientPhone: string | null }[] = [];
  for (const s of [...sales, ...legacySales]) {
    const name = s.clientName?.trim();
    if (!name) continue;
    const clientPhone = realPhone(s.clientPhone);
    const key = `${name.toLowerCase()}|${clientPhone ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ clientName: name, clientPhone });
    if (results.length >= 6) break;
  }

  return NextResponse.json(results);
}
