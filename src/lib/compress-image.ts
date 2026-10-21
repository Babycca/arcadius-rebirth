import sharp from "sharp";

// Compresse/redimensionne une image uploadée avant stockage : évite
// d'accumuler des centaines de Mo de photos en pleine résolution (utile
// vu le volume de photos de villas) sans visiblement dégrader la qualité
// affichée dans l'app (jamais montrée en plus grand que l'écran).
export async function compressImage(
  buffer: Buffer,
  { maxWidth = 1600, quality = 80 }: { maxWidth?: number; quality?: number } = {}
): Promise<{ buffer: Buffer; ext: string }> {
  try {
    const output = await sharp(buffer)
      .rotate() // respecte l'orientation EXIF avant de la perdre à la compression
      .resize({ width: maxWidth, withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();
    return { buffer: output, ext: "webp" };
  } catch {
    // Format non supporté ou image corrompue : on garde le fichier original
    // plutôt que de faire échouer tout l'upload.
    return { buffer, ext: "jpg" };
  }
}
