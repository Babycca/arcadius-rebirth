export { weekIdFor, currentWeekId, startOfIsoWeek, weekDateRangeLabel } from "./week-client";
import { currentWeekId, startOfIsoWeek } from "./week-client";

// Semaine "active" de la Comptabilité : toujours la semaine calendaire ISO
// en cours (lundi → dimanche), calculée en direct — jamais figée en base.
// Avant, "Archiver la comptabilité" fixait un identifiant manuel qui restait
// collé indéfiniment tant qu'on n'archivait pas à nouveau : si l'admin
// oubliait d'archiver un dimanche, le site restait bloqué sur l'ancienne
// semaine. Le calendrier fait maintenant foi tout seul, et "Archiver" ne
// sert qu'à clôturer/enregistrer la semaine qui vient de se terminer —
// la bascule vers la semaine suivante est automatique, pas déclenchée par ce
// bouton.
export async function getActiveWeekId(): Promise<string> {
  return currentWeekId();
}

// Début (lundi) de la période active — sert à afficher "Semaine du … au …".
export async function getActiveWeekStart(): Promise<Date> {
  return startOfIsoWeek(new Date());
}
