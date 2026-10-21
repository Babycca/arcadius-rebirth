// Exporte toutes les tables de la base SQLite locale en JSON, avant la
// bascule du schéma vers Postgres (Neon) pour le déploiement en ligne.
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const MODELS = [
  "agent", "appSetting", "priceGroup", "priceItem", "tarifPhoto",
  "textGroup", "textSnippet", "estimationProfile", "estimationCriterion",
  "estimationCriterionOption", "estimationInteriorGroup", "estimationInteriorItem",
  "reservedZone", "priceMapConfig", "priceMapPin", "priceMapPinImage",
  "commissionRule", "sale", "weeklyReset", "agentWeekBonus",
  "legacyArchive", "legacySale", "reservedZoneCategory", "pageVisibility",
];

async function main() {
  const dump = {};
  for (const model of MODELS) {
    dump[model] = await prisma[model].findMany();
    console.log(model, "->", dump[model].length, "lignes");
  }
  const outPath = path.join(__dirname, "..", "sqlite-export.json");
  fs.writeFileSync(outPath, JSON.stringify(dump, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));
  console.log("Export écrit dans", outPath);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
