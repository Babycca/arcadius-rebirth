// Fonctions pures (aucun accès Prisma/serveur) — utilisables aussi bien côté
// client que serveur. week.ts les ré-exporte et ajoute les fonctions liées à
// la base de données.

// Identifiant de semaine ISO (ex: "2026-S43"), utilisé pour regrouper les
// ventes et permettre un archivage hebdomadaire sans perdre l'historique.
// "S" pour Semaine (pas de "W" anglais).
export function weekIdFor(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-S${String(weekNo).padStart(2, "0")}`;
}

export function currentWeekId(): string {
  return weekIdFor(new Date());
}

// Lundi (00:00 UTC) de la semaine ISO contenant `date`.
export function startOfIsoWeek(date: Date): Date {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 1);
  return d;
}

// "du 13/10/2026 (lundi) au 19/10/2026 (dimanche)" — periodStart est toujours
// calé sur un lundi, donc les jours sont fixes.
export function weekDateRangeLabel(periodStart: Date): string {
  const start = new Date(periodStart);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const fmt = (d: Date) =>
    d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
  return `du ${fmt(start)} (lundi) au ${fmt(end)} (dimanche)`;
}

// Reconstruit le lundi (00:00 UTC) correspondant à un identifiant "YYYY-SNN".
export function mondayOfWeekId(weekId: string): Date {
  const m = /^(\d{4})-S(\d{2})$/.exec(weekId);
  if (!m) return startOfIsoWeek(new Date());
  const year = Number(m[1]);
  const week = Number(m[2]);
  // Le 4 janvier est toujours dans la semaine ISO 1.
  const jan4Monday = startOfIsoWeek(new Date(Date.UTC(year, 0, 4)));
  const monday = new Date(jan4Monday);
  monday.setUTCDate(monday.getUTCDate() + (week - 1) * 7);
  return monday;
}

// Identifiant de la semaine ISO suivante.
export function nextWeekId(weekId: string): string {
  const monday = mondayOfWeekId(weekId);
  monday.setUTCDate(monday.getUTCDate() + 7);
  return weekIdFor(monday);
}
