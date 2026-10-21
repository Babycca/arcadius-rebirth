const fs = require("fs");
const path = require("path");
const { PNG } = require("pngjs");

const srcPath = path.join(__dirname, "../public/images/arcadius-tower.png");
const outPath = path.join(__dirname, "../public/images/arcadius-tower-cutout.png");

const data = fs.readFileSync(srcPath);
const png = PNG.sync.read(data);

// Fond de la photo = quasi noir pur. On rend transparent tout pixel proche du
// noir, avec un dégradé doux (pas de seuil dur) pour un bord propre sans
// halo ni découpe en dents de scie. Les fenêtres allumées (chaudes, claires)
// et la matière du bâtiment (gris-bleu plus clair que le fond) restent intactes.
const THRESH_LOW = 18; // en dessous: alpha 0
const THRESH_HIGH = 46; // au dessus: alpha pleine (selon luminance)

for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (png.width * y + x) << 2;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const lum = r * 0.299 + g * 0.587 + b * 0.114;

    let alpha;
    if (lum <= THRESH_LOW) alpha = 0;
    else if (lum >= THRESH_HIGH) alpha = 255;
    else alpha = Math.round(((lum - THRESH_LOW) / (THRESH_HIGH - THRESH_LOW)) * 255);

    png.data[idx + 3] = alpha;
  }
}

fs.writeFileSync(outPath, PNG.sync.write(png));
console.log("written", outPath);
