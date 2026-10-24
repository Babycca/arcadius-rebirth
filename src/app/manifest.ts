import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arcadius — Agence immobilière",
    short_name: "Arcadius",
    description: "Arcadius — agence immobilière",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0a0810",
    theme_color: "#0a0810",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Windows/Android redécoupent souvent l'icône en cercle (ou autre
      // forme) à l'installation en app : sans variante "maskable" avec de la
      // marge, le logo (badge hexagonal collé aux bords) se fait rogner
      // n'importe comment — d'où l'icône affreuse une fois l'app installée.
      { src: "/icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
