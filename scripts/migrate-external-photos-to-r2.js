// Certaines photos pointent encore vers les buckets R2 des anciens sites
// (site1-villas, site2-arcadius) — fonctionnel pour l'instant, mais fragile
// (dépend de comptes externes). On les retélécharge et réuploade vers le
// nouveau bucket dédié, pour que ce site soit totalement indépendant.
const fs = require("fs");
const path = require("path");
for (const line of fs.readFileSync(path.join(__dirname, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});
const BUCKET = process.env.R2_BUCKET;
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

async function rehost(url, folder) {
  if (!url || url.startsWith(PUBLIC_URL)) return null; // déjà sur notre bucket
  const res = await fetch(url);
  if (!res.ok) {
    console.warn("Échec téléchargement:", url, res.status);
    return null;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = (new URL(url).pathname.split(".").pop() || "jpg").toLowerCase();
  const key = `${folder}/${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buffer }));
  return `${PUBLIC_URL}/${key}`;
}

async function main() {
  const zones = await prisma.reservedZone.findMany({ where: { photoUrl: { not: null } } });
  let n = 0;
  for (const z of zones) {
    const newUrl = await rehost(z.photoUrl, "zones");
    if (newUrl) {
      await prisma.reservedZone.update({ where: { id: z.id }, data: { photoUrl: newUrl } });
      n++;
    }
  }
  console.log("reservedZone.photoUrl ->", n, "rehébergées");

  const tarifs = await prisma.tarifPhoto.findMany();
  n = 0;
  for (const t of tarifs) {
    const newUrl = await rehost(t.url, "tarifs");
    if (newUrl) {
      await prisma.tarifPhoto.update({ where: { id: t.id }, data: { url: newUrl } });
      n++;
    }
  }
  console.log("tarifPhoto.url ->", n, "rehébergées");

  const config = await prisma.priceMapConfig.findUnique({ where: { id: 1 } });
  if (config?.imageUrl) {
    const newUrl = await rehost(config.imageUrl, "map");
    if (newUrl) {
      await prisma.priceMapConfig.update({ where: { id: 1 }, data: { imageUrl: newUrl } });
      console.log("priceMapConfig.imageUrl -> rehébergée");
    }
  }

  await prisma.$disconnect();
  console.log("Terminé.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
