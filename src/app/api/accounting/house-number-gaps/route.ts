import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminRole } from "@/lib/permissions";
import { getArchivedWeekIds } from "@/lib/accounting/week";

// Repère les "trous" dans la numérotation des habitations de la semaine en
// cours (tous agents confondus) : si #22636 et #22638 sont notés mais pas
// #22637, c'est probablement une vente oubliée. Purement indicatif — ne
// bloque rien, juste un avertissement sur la page Administration.
export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (!session?.user || !isAdminRole(user?.role)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const archivedWeekIds = await getArchivedWeekIds();
  const sales = await prisma.sale.findMany({
    where: { weekId: { notIn: archivedWeekIds } },
    select: { houseNumber: true },
  });

  const numbers = [...new Set(sales.map((s) => s.houseNumber).filter((h) => /^\d+$/.test(h)).map(Number))].sort(
    (a, b) => a - b
  );

  if (numbers.length < 2) {
    return NextResponse.json({ missing: [], min: numbers[0] ?? null, max: numbers[0] ?? null });
  }

  const min = numbers[0];
  const max = numbers[numbers.length - 1];
  // Garde-fou : si l'écart est énorme (plusieurs numéros très éloignés dans
  // la même semaine, ex: reprise après un import), on ne liste pas des
  // milliers de "trous" qui n'en sont pas vraiment.
  if (max - min > 2000) {
    return NextResponse.json({ missing: [], min, max, tooWide: true });
  }

  const present = new Set(numbers);
  const missing: number[] = [];
  for (let n = min; n <= max; n++) {
    if (!present.has(n)) missing.push(n);
  }

  return NextResponse.json({ missing, min, max });
}
