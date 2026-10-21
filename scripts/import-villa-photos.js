// Récupère les photos de villas depuis l'ancien site1-villas (map.json déjà
// exporté via son API) et les rattache aux points existants de la carte des
// prix des villas (PriceMapPin.id == ancien MapPin.id, déjà vérifié 1:1).
// Ne copie QUE les photos — pas les noms, dates, locataires etc.
const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function downloadImage(url, destPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
}

async function main() {
  const mapJsonPath = process.argv[2];
  const data = JSON.parse(fs.readFileSync(mapJsonPath, "utf8"));
  const pins = data.pins.filter((p) => p.card && p.card.images?.length > 0);

  const dir = path.join(__dirname, "..", "public", "uploads", "price-map-photos");
  fs.mkdirSync(dir, { recursive: true });

  const existingIds = new Set((await prisma.priceMapPin.findMany({ select: { id: true } })).map((p) => p.id));

  let downloaded = 0;
  let skippedPins = 0;
  let failed = 0;

  for (const pin of pins) {
    if (!existingIds.has(pin.id)) {
      skippedPins++;
      continue;
    }
    const images = [...pin.card.images].sort((a, b) => a.order - b.order);
    const rows = [];
    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      const ext = path.extname(new URL(img.url).pathname) || ".jpg";
      const fileName = `${pin.id}-${i}${ext}`;
      const destPath = path.join(dir, fileName);
      try {
        await downloadImage(img.url, destPath);
        downloaded++;
        rows.push({ pinId: pin.id, url: `/uploads/price-map-photos/${fileName}`, order: i });
      } catch (err) {
        failed++;
        console.error("Échec téléchargement:", img.url, err.message);
      }
    }
    if (rows.length > 0) {
      await prisma.priceMapPinImage.createMany({ data: rows });
    }
  }

  console.log(`Terminé. ${downloaded} photos téléchargées, ${failed} échecs, ${skippedPins} points ignorés (plus dans la base).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
