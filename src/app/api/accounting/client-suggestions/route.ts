import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { titleCase } from "@/lib/text-case";

// Suggestions de clients déjà connus (nom + téléphone), tirées de TOUTES les
// ventes — en cours, archivées, et importées — pour éviter de retaper un
// client qui revient. Accessible à tout agent qui peut saisir une vente
// (pas réservé à la recherche admin) ; léger, pas de détails de semaine/prix.
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session?.user || !userId) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 3) return NextResponse.json([]);

  // Interrupteur global (Administration) — off par défaut tant qu'un admin
  // n'a rien réglé reviendrait à activé, donc on ne coupe que sur "false"
  // explicite. + préférence personnelle (Mon profil) : chacun peut aussi la
  // désactiver juste pour lui, sans toucher aux autres.
  const [toggle, me] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "client-suggestions-enabled" } }),
    prisma.agent.findUnique({ where: { id: userId }, select: { clientSuggestionsDisabled: true } }),
  ]);
  if (toggle?.value === "false" || me?.clientSuggestionsDisabled) return NextResponse.json([]);

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

  // Pas de vrai numéro = pas de suggestion du tout (une ligne "Nom — -" ne
  // sert à rien, autant laisser taper le nom normalement). Déduplication par
  // numéro seul (pas nom+numéro) : un même client parfois tapé "Nom Prénom"
  // puis "Prénom Nom" ne doit ressortir qu'une fois — on garde la saisie la
  // plus récente (la liste est déjà triée par date décroissante).
  const seen = new Set<string>();
  const results: { clientName: string; clientPhone: string }[] = [];
  for (const s of [...sales, ...legacySales]) {
    const rawName = s.clientName?.trim();
    if (!rawName) continue;
    const clientPhone = realPhone(s.clientPhone);
    if (!clientPhone) continue;
    if (seen.has(clientPhone)) continue;
    seen.add(clientPhone);
    results.push({ clientName: titleCase(rawName), clientPhone });
    if (results.length >= 6) break;
  }

  return NextResponse.json(results);
}
