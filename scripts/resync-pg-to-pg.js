// Resynchronisation complète (upsert) de l'ancienne base (source de vérité
// réelle jusqu'au basculement de DATABASE_URL en prod) vers la nouvelle.
// Contrairement à migrate-pg-to-pg.js (createMany + skipDuplicates, copie
// initiale), celui-ci met aussi à jour les lignes déjà copiées si elles ont
// changé entre-temps, et n'écrase jamais une ligne qui n'existe que côté
// nouvelle base (ex: GarageSale, inexistant côté ancienne base).
const { PrismaClient } = require("@prisma/client");

const OLD_URL = process.env.OLD_DATABASE_URL;
const NEW_URL = process.env.NEW_DATABASE_URL;

if (!OLD_URL || !NEW_URL) {
  console.error("OLD_DATABASE_URL et NEW_DATABASE_URL sont requis.");
  process.exit(1);
}

const oldDb = new PrismaClient({ datasources: { db: { url: OLD_URL } } });
const newDb = new PrismaClient({ datasources: { db: { url: NEW_URL } } });

const MODELS = [
  "agent",
  "appSetting",
  "priceGroup",
  "priceItem",
  "tarifPhoto",
  "textGroup",
  "textSnippet",
  "estimationProfile",
  "estimationCriterion",
  "estimationCriterionOption",
  "estimationInteriorGroup",
  "estimationInteriorItem",
  "reservedZoneCategory",
  "reservedZone",
  "priceMapConfig",
  "priceMapPin",
  "priceMapPinImage",
  "commissionRule",
  "sale",
  "expense",
  "weeklyReset",
  "agentWeekBonus",
  "legacyArchive",
  "legacySale",
  "pageVisibility",
];

const UNIQUE_KEY = { appSetting: "key", pageVisibility: "href" };
const SKIP = new Set(["agent", "appSetting", "priceGroup", "priceItem", "tarifPhoto", "textGroup", "textSnippet", "estimationProfile", "estimationCriterion", "estimationCriterionOption", "estimationInteriorGroup", "estimationInteriorItem", "reservedZoneCategory", "reservedZone", "priceMapConfig", "priceMapPin", "priceMapPinImage", "commissionRule", "sale", "expense", "weeklyReset", "agentWeekBonus", "legacyArchive", "legacySale"]);

async function main() {
  for (const model of MODELS) {
    if (SKIP.has(model)) {
      console.log(`${model}: déjà synchronisé, ignoré.`);
      continue;
    }
    const rows = await oldDb[model].findMany();
    let upserted = 0;
    for (const row of rows) {
      if (model === "agentWeekBonus") {
        await newDb[model].upsert({
          where: { agentId_weekId: { agentId: row.agentId, weekId: row.weekId } },
          create: row,
          update: row,
        });
      } else {
        const keyField = UNIQUE_KEY[model] || "id";
        await newDb[model].upsert({ where: { [keyField]: row[keyField] }, create: row, update: row });
      }
      upserted++;
    }
    console.log(`${model}: ${upserted} lignes synchronisées.`);
  }

  console.log("\nVérification des comptes :");
  for (const model of MODELS) {
    const oldCount = await oldDb[model].count();
    const newCount = await newDb[model].count();
    const flag = newCount >= oldCount ? "OK" : "!! NEW < OLD !!";
    console.log(`${model}: ancien=${oldCount} nouveau=${newCount} ${flag}`);
  }

  await oldDb.$disconnect();
  await newDb.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
