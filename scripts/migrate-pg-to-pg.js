const { PrismaClient } = require("@prisma/client");

const OLD_URL = process.env.OLD_DATABASE_URL;
const NEW_URL = process.env.NEW_DATABASE_URL;

if (!OLD_URL || !NEW_URL) {
  console.error("OLD_DATABASE_URL et NEW_DATABASE_URL sont requis.");
  process.exit(1);
}

const oldDb = new PrismaClient({ datasources: { db: { url: OLD_URL } } });
const newDb = new PrismaClient({ datasources: { db: { url: NEW_URL } } });

// Ordre respectant les clés étrangères (parents avant enfants).
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

async function main() {
  for (const model of MODELS) {
    const rows = await oldDb[model].findMany();
    if (rows.length === 0) {
      console.log(`${model}: 0 lignes, ignoré.`);
      continue;
    }
    await newDb[model].createMany({ data: rows, skipDuplicates: true });
    console.log(`${model}: ${rows.length} lignes copiées.`);
  }

  console.log("\nVérification des comptes :");
  for (const model of MODELS) {
    const oldCount = await oldDb[model].count();
    const newCount = await newDb[model].count();
    const flag = oldCount === newCount ? "OK" : "!! MISMATCH !!";
    console.log(`${model}: ancien=${oldCount} nouveau=${newCount} ${flag}`);
  }

  await oldDb.$disconnect();
  await newDb.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
