// Import des vraies données extraites des sites Arcadius et Villas (via leurs
// API en ligne) dans la base du nouveau site. À lancer une fois, en dev.
import { PrismaClient } from "@prisma/client";
import { readFile } from "node:fs/promises";

const prisma = new PrismaClient();

const ARC = "C:/Users/keatl/AppData/Local/Temp/claude/c--Users-keatl-Documents-Arcadius-2-0/eb9de4c5-464b-4b6b-94ae-7467570d7efe/scratchpad/arcadius-export";
const VIL = "C:/Users/keatl/AppData/Local/Temp/claude/c--Users-keatl-Documents-Arcadius-2-0/eb9de4c5-464b-4b6b-94ae-7467570d7efe/scratchpad/villas-export";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf-8"));
}

async function main() {
  // --- Prix fixe ---
  const priceGroups = await readJson(`${ARC}/price-groups.json`);
  for (const g of priceGroups) {
    await prisma.priceGroup.create({
      data: {
        id: g.id,
        name: g.name,
        order: g.order,
        items: {
          create: g.items.map((it) => ({
            id: it.id,
            name: it.name,
            price: it.price,
            type: it.type,
            storageKg: it.storageKg,
            order: it.order,
          })),
        },
      },
    });
  }
  console.log(`Prix fixe : ${priceGroups.length} groupes importés`);

  // --- Tarifs (photos) ---
  const tarifPhotos = await readJson(`${ARC}/tarif-photos.json`);
  for (const p of tarifPhotos) {
    await prisma.tarifPhoto.create({
      data: { id: p.id, url: p.url, order: p.order },
    });
  }
  console.log(`Tarifs : ${tarifPhotos.length} photos importées`);

  // --- Intérieurs possibles / Formulaires ---
  for (const section of ["interieurs", "formulaires"]) {
    const groups = await readJson(
      `${ARC}/text-groups_section_${section}.json`
    );
    for (const g of groups) {
      await prisma.textGroup.create({
        data: {
          id: g.id,
          section,
          name: g.name,
          order: g.order,
          items: {
            create: (g.items ?? []).map((it) => ({
              id: it.id,
              content: it.content,
              price: it.price,
              order: it.order,
            })),
          },
        },
      });
    }
    console.log(`${section} : ${groups.length} groupes importés`);
  }

  // --- Estimation ---
  const profiles = await readJson(`${ARC}/estimation-profiles.json`);
  for (const p of profiles) {
    await prisma.estimationProfile.create({
      data: {
        id: p.id,
        structureType: p.structureType,
        zoneName: p.zoneName,
        region: p.region,
        photoUrl: p.photoUrl,
        basePrice: p.basePrice,
        maxPrice: p.maxPrice,
        order: p.order,
        criteria: {
          create: (p.criteria ?? []).map((c) => ({
            id: c.id,
            label: c.label,
            type: c.type,
            order: c.order,
            options: {
              create: (c.options ?? []).map((o) => ({
                id: o.id,
                label: o.label,
                priceMode: o.priceMode,
                amount: o.amount,
                order: o.order,
              })),
            },
          })),
        },
        interiorGroups: {
          create: (p.interiorGroups ?? []).map((ig) => ({
            id: ig.id,
            label: ig.label,
            requireSelectedOptionIds: ig.requireSelectedOptionIds,
            requireUnselectedOptionIds: ig.requireUnselectedOptionIds,
            order: ig.order,
            items: {
              create: (ig.items ?? []).map((it) => ({
                id: it.id,
                name: it.name,
                priceMode: it.priceMode,
                amount: it.amount,
                type: it.type,
                storageKg: it.storageKg,
                order: it.order,
              })),
            },
          })),
        },
      },
    });
  }
  console.log(`Estimation : ${profiles.length} profils importés`);

  // --- Zones (carte des biens réservés) ---
  const zones = await readJson(`${ARC}/zones.json`);
  for (const z of zones) {
    await prisma.reservedZone.create({
      data: {
        id: z.id,
        name: z.name,
        categoryId: z.categoryId,
        geometry: z.geometry,
        photoUrl: z.photoUrl,
        createdById: z.createdById ?? null,
      },
    });
  }
  console.log(`Zones réservées : ${zones.length} zones importées`);

  // --- Carte des prix des villas (depuis les pins de site1, sans prix réel : à compléter) ---
  const map = await readJson(`${VIL}/map.json`);
  await prisma.priceMapConfig.upsert({
    where: { id: 1 },
    update: { imageUrl: map.imageUrl },
    create: { id: 1, imageUrl: map.imageUrl },
  });
  for (const pin of map.pins) {
    await prisma.priceMapPin.create({
      data: {
        id: pin.id,
        x: pin.x,
        y: pin.y,
        label: pin.card?.title ?? pin.label ?? null,
        price: null, // aucun prix n'existait côté Villas, à saisir manuellement
      },
    });
  }
  console.log(`Carte des prix : ${map.pins.length} pins importés (sans prix, à compléter)`);

  console.log("\nImport terminé.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
