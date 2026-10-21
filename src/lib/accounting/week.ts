export { weekIdFor, currentWeekId, startOfIsoWeek, weekDateRangeLabel } from "./week-client";
import { currentWeekId, startOfIsoWeek } from "./week-client";

// Semaine "active" de la Comptabilité : par défaut la semaine calendaire ISO
// en cours, mais un admin peut l'archiver manuellement à tout moment (bouton
// "Archiver la comptabilité" dans /comptabilite) — dans ce cas un identifiant
// manuel prend le relais jusqu'au prochain archivage, indépendamment du
// calendrier.
export async function getActiveWeekId(): Promise<string> {
  const { prisma } = await import("@/lib/prisma");
  const setting = await prisma.appSetting.findUnique({ where: { key: "currentWeekId" } });
  return setting?.value || currentWeekId();
}

// Début (lundi) de la période active — sert à afficher "Semaine du … au …"
// et à figer la date de départ de la prochaine période lors d'un archivage.
export async function getActiveWeekStart(): Promise<Date> {
  const { prisma } = await import("@/lib/prisma");
  const setting = await prisma.appSetting.findUnique({ where: { key: "currentWeekStart" } });
  if (setting?.value) return new Date(setting.value);
  return startOfIsoWeek(new Date());
}
