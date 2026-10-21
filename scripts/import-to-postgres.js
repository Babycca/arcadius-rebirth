// Réimporte le dump JSON (sqlite-export.json) dans la base Postgres (Neon)
// maintenant que le schéma y a été poussé. Ordre respecté pour les clés
// étrangères (parents avant enfants).
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Ordre d'import : les modèles référencés par une relation doivent être
// importés avant ceux qui les référencent (TextSnippet -> TextGroup,
// PriceMapPinImage -> PriceMapPin, LegacySale -> LegacyArchive, etc.)
const ORDER = [
  "agent", "appSetting", "commissionRule", "reservedZoneCategory", "pageVisibility",
  "priceGroup", "priceItem",
  "tarifPhoto",
  "textGroup", "textSnippet",
  "estimationProfile", "estimationCriterion", "estimationCriterionOption",
  "estimationInteriorGroup", "estimationInteriorItem",
  "reservedZone",
  "priceMapConfig", "priceMapPin", "priceMapPinImage",
  "sale", "weeklyReset", "agentWeekBonus",
  "legacyArchive", "legacySale",
];

function parseDates(rows) {
  const dateKeys = ["createdAt", "updatedAt", "date", "endDate", "periodStart", "archivedAt"];
  return rows.map((row) => {
    const copy = { ...row };
    for (const k of dateKeys) {
      if (copy[k]) copy[k] = new Date(copy[k]);
    }
    return copy;
  });
}

async function main() {
  const dump = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "sqlite-export.json"), "utf8"));

  for (const model of ORDER) {
    const rows = parseDates(dump[model] || []);
    if (rows.length === 0) {
      console.log(model, "-> 0 lignes, ignoré");
      continue;
    }
    await prisma[model].createMany({ data: rows });
    console.log(model, "->", rows.length, "lignes importées");
  }

  await prisma.$disconnect();
  console.log("Import terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
