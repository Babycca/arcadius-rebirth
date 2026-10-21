// Liste canonique des pages gérées par le système de visibilité/ordre du
// menu (Administration → "Pages du menu" et fiche agent). Toute page qui
// doit pouvoir être masquée/réordonnée doit figurer ici — l'API
// /api/page-visibility s'en sert pour compléter les pages qui n'ont pas
// encore de ligne en base (jamais touchées par un admin).
export const NAV_PAGES: { href: string; label: string }[] = [
  { href: "/dashboard", label: "Tableau de bord" },
  { href: "/profil", label: "Mon profil" },
  { href: "/carte-biens-reserves", label: "Carte des biens réservés" },
  { href: "/carte-prix-villas", label: "Carte des prix des villas" },
  { href: "/prix-fixe", label: "Prix fixe" },
  { href: "/tarifs", label: "Tarifs" },
  { href: "/interieurs-possibles", label: "Intérieurs possibles" },
  { href: "/guide-coherences", label: "Guide des cohérences" },
  { href: "/guide-coherences-cayo", label: "Guide des cohérences — Cayo" },
  { href: "/guide-debutant", label: "Guide du débutant" },
  { href: "/estimation", label: "Estimation" },
  { href: "/formulaires", label: "Formulaires" },
  { href: "/mes-messages-prefaits", label: "Mes messages préfaits" },
  { href: "/comptabilite/mes-ventes", label: "Mes ventes" },
  { href: "/comptabilite", label: "Comptabilité" },
  { href: "/comptabilite/depenses", label: "Dépenses" },
  { href: "/comptabilite/archive", label: "Archive Comptabilité" },
  { href: "/administration", label: "Administration" },
];

export const NAV_LABELS: Record<string, string> = Object.fromEntries(NAV_PAGES.map((p) => [p.href, p.label]));
