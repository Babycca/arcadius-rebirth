import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

// Cloudflare R2 est compatible avec l'API S3 — on utilise le client AWS SDK
// standard pointé vers l'endpoint R2, pas de fichiers locaux (nécessaire
// pour tourner sur Vercel, dont le système de fichiers ne persiste pas).
const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

const BUCKET = process.env.R2_BUCKET!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

// `key` inclut le "dossier" logique, ex: "avatars/abc-123.webp"
export async function uploadToR2(key: string, buffer: Buffer, contentType = "image/webp"): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );
  return `${PUBLIC_URL}/${key}`;
}

export async function deleteFromR2(urlOrKey: string): Promise<void> {
  const key = urlOrKey.startsWith(PUBLIC_URL) ? urlOrKey.slice(PUBLIC_URL.length + 1) : urlOrKey;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // Fichier déjà absent ou erreur réseau : pas bloquant pour l'action en cours.
  }
}
