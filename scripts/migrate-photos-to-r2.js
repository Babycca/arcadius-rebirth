// Upload tous les fichiers déjà présents dans public/uploads/ vers le bucket
// R2, puis met à jour les URLs correspondantes en base (table par table).
// Charge .env manuellement (pas de dépendance dotenv pour un script ponctuel).
const fs = require("fs");
for (const line of fs.readFileSync(require("path").join(__dirname, "..", ".env"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)="?(.*?)"?$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}
const path = require("path");
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

const CONTENT_TYPES = { webp: "image/webp", png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg" };

async function uploadLocalFile(localUrl) {
  // localUrl ex: "/uploads/avatars/xxx.jpg" -> uploads vers "avatars/xxx.jpg"
  const key = localUrl.replace(/^\/uploads\//, "");
  const filePath = path.join(__dirname, "..", "public", "uploads", key);
  if (!fs.existsSync(filePath)) {
    console.warn("Fichier introuvable, ignoré:", filePath);
    return null;
  }
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(key).slice(1).toLowerCase();
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: CONTENT_TYPES[ext] || "application/octet-stream",
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

async function migrateField(model, idField, urlField) {
  const rows = await prisma[model].findMany();
  let count = 0;
  for (const row of rows) {
    const url = row[urlField];
    if (!url || !url.startsWith("/uploads/")) continue;
    const newUrl = await uploadLocalFile(url);
    if (!newUrl) continue;
    await prisma[model].update({ where: { id: row[idField] }, data: { [urlField]: newUrl } });
    count++;
  }
  console.log(model + "." + urlField, "->", count, "fichiers migrés");
}

async function main() {
  await migrateField("agent", "id", "avatarUrl");
  await migrateField("tarifPhoto", "id", "url");
  await migrateField("priceMapPinImage", "id", "url");
  await migrateField("reservedZone", "id", "photoUrl");
  await migrateField("priceMapConfig", "id", "imageUrl");
  await prisma.$disconnect();
  console.log("Migration des photos terminée.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
