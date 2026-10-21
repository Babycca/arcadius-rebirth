// Le logo source a déjà un vrai canal alpha (fond transparent). Pour servir
// de masque CSS fiable (mask = alpha × luminance), on force tous les pixels
// opaques en blanc pur (luminance = 1) et on garde l'alpha d'origine tel
// quel : le masque reprend alors exactement la silhouette complète du logo,
// peu importe les nuances de bleu/marine du dessin original.
import { PNG } from "pngjs";
import { readFileSync, writeFileSync } from "node:fs";

const src = PNG.sync.read(readFileSync("public/images/logo.png"));
const out = new PNG({ width: src.width, height: src.height });

for (let i = 0; i < src.data.length; i += 4) {
  out.data[i] = 255;
  out.data[i + 1] = 255;
  out.data[i + 2] = 255;
  out.data[i + 3] = src.data[i + 3];
}

writeFileSync("public/images/logo-mask.png", PNG.sync.write(out));
console.log("logo-mask.png régénéré :", out.width, "x", out.height);
