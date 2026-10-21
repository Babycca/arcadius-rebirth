// Parse un collage brut depuis l'ancien Google Sheets Compta : des lignes
// séparées par tabulations (Date | N° habitation ou libellé | Prix | Client |
// Téléphone), avec de temps en temps une ligne "en-tête" ne contenant qu'un
// nom d'agent (une cellule fusionnée A:E dans la feuille d'origine) qui
// s'applique à toutes les lignes suivantes jusqu'au prochain en-tête.
export type ParsedLegacySale = {
  agentName: string;
  date: Date | null;
  houseNumber: string | null;
  priceAmount: number;
  clientName: string | null;
  clientPhone: string | null;
};

const DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function parseDate(raw: string): Date | null {
  const m = raw.trim().match(DATE_RE);
  if (!m) return null;
  const [, d, mo, y] = m;
  return new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
}

function parsePrice(raw: string): number | null {
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  const value = Number(digits);
  return Number.isFinite(value) ? value : null;
}

export function parseLegacyPaste(text: string): ParsedLegacySale[] {
  const lines = text.split(/\r?\n/).map((l) => l.split("\t").map((c) => c.trim()));
  const sales: ParsedLegacySale[] = [];
  let currentAgent = "Inconnu";

  for (const cols of lines) {
    const nonEmpty = cols.filter((c) => c.length > 0);
    if (nonEmpty.length === 0) continue;

    // Ligne "en-tête agent" : une seule cellule remplie, et ce n'est ni une
    // date ni un prix — c'est le nom qui s'applique aux lignes suivantes.
    if (nonEmpty.length === 1 && !DATE_RE.test(nonEmpty[0]) && parsePrice(nonEmpty[0]) === null) {
      currentAgent = nonEmpty[0];
      continue;
    }

    const [dateRaw, houseRaw, priceRaw, clientRaw, phoneRaw] = cols;
    const price = priceRaw ? parsePrice(priceRaw) : null;
    if (price == null) continue; // ligne illisible, on l'ignore plutôt que planter l'import

    sales.push({
      agentName: currentAgent,
      date: dateRaw ? parseDate(dateRaw) : null,
      houseNumber: houseRaw || null,
      priceAmount: price,
      clientName: clientRaw || null,
      clientPhone: phoneRaw && phoneRaw !== "-" ? phoneRaw : null,
    });
  }

  return sales;
}
