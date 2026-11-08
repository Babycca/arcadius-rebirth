export { weekIdFor, currentWeekId, startOfIsoWeek, weekDateRangeLabel, mondayOfWeekId, nextWeekId } from "./week-client";
import { currentWeekId, startOfIsoWeek } from "./week-client";
import { prisma } from "@/lib/prisma";

// Simple étiquette d'affichage qui avance toute seule avec le calendrier
// (minuit du lundi). Sert uniquement à afficher "Semaine en cours" et à
// nommer l'archive créée au moment où l'agence clique sur "Archiver" — elle
// n'a AUCUN effet sur quelles ventes sont regroupées ou affichées, voir
// getArchivedWeekIds ci-dessous. C'est la date qui bouge toute seule, jamais
// la comptabilité elle-même.
export async function getActiveWeekId(): Promise<string> {
  return currentWeekId();
}
// Étiquette INTERNE posée sur toute nouvelle vente / garage / dépense /
// prime. Ce n'est jamais un nom d'archive, donc une nouvelle entrée ne peut
// jamais atterrir dans une archive, même si on archive avant lundi. Le vrai
// nom (ex: "2026-S45") n'est donné qu'au clic sur "Archiver".
export const OPEN_WEEK_ID = "en-cours";
export async function getNewRecordWeekId(): Promise<string> {
  return OPEN_WEEK_ID;
}
export async function getActiveWeekStart(): Promise<Date> {
  return startOfIsoWeek(new Date());
}

// Identifiants de toutes les semaines déjà formellement archivées (bouton
// "Archiver" cliqué). Tout ce qui n'est PAS dans cette liste fait partie de
// la comptabilité "en cours" — peu importe sous quelle étiquette de semaine
// calendaire une vente a été enregistrée, et peu importe depuis combien de
// temps elle traîne sans avoir été archivée. Rien n'en sort tant que
// l'agence n'archive pas elle-même.
export async function getArchivedWeekIds(): Promise<string[]> {
  const resets = await prisma.weeklyReset.findMany({ select: { weekId: true } });
  return resets.map((r) => r.weekId);
}
