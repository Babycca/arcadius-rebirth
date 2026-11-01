import {
  Home,
  Map as MapIcon,
  Tag,
  Calculator,
  FileText,
  Images,
  Wallet,
  Receipt,
  Settings,
  User,
  Sofa,
  MessageSquareText,
  BookOpen,
  GraduationCap,
  Archive,
  CalendarOff,
  ShieldAlert,
  ScrollText,
} from "lucide-react";
import type { PermissionKey } from "@/lib/permissions";

// Liste canonique des pages de navigation avec leur icône — partagée entre
// la Sidebar (client) et le Tableau de bord (serveur, pour les raccourcis
// épinglés), pour ne jamais la dupliquer.
export const NAV_ITEMS: { href: string; icon: typeof Home; label: string; permissionKey?: PermissionKey }[] = [
  { href: "/dashboard", icon: Home, label: "Tableau de bord" },
  { href: "/profil", icon: User, label: "Mon profil" },
  { href: "/carte-biens-reserves", icon: MapIcon, label: "Carte des biens réservés" },
  { href: "/carte-prix-villas", icon: Tag, label: "Carte des prix des villas" },
  { href: "/prix-fixe", icon: Tag, label: "Prix fixe" },
  { href: "/tarifs", icon: Images, label: "Tarifs" },
  { href: "/interieurs-possibles", icon: Sofa, label: "Intérieurs possibles" },
  { href: "/guide-coherences", icon: BookOpen, label: "Guide des cohérences" },
  { href: "/guide-coherences-cayo", icon: BookOpen, label: "Guide des cohérences — Cayo" },
  { href: "/guide-debutant", icon: GraduationCap, label: "Guide du débutant" },
  { href: "/estimation", icon: Calculator, label: "Estimation" },
  { href: "/formulaires", icon: FileText, label: "Formulaires" },
  { href: "/mes-messages-prefaits", icon: MessageSquareText, label: "Mes messages préfaits" },
  { href: "/comptabilite/mes-ventes", icon: Receipt, label: "Mes ventes" },
  { href: "/comptabilite", icon: Wallet, label: "Comptabilité" },
  { href: "/comptabilite/depenses", icon: Receipt, label: "Dépenses", permissionKey: "depenses" },
  { href: "/comptabilite/archive", icon: Archive, label: "Archive Comptabilité", permissionKey: "archiveComptabilite" },
  { href: "/administration", icon: Settings, label: "Administration", permissionKey: "administration" },
  { href: "/administration/absences", icon: CalendarOff, label: "Suivi des absences", permissionKey: "absences" },
  { href: "/administration/sanctions", icon: ShieldAlert, label: "Suivi des sanctions", permissionKey: "sanctions" },
  { href: "/administration/journal", icon: ScrollText, label: "Journal d'activité", permissionKey: "journal" },
];

export const NAV_ITEMS_BY_HREF = new Map(NAV_ITEMS.map((n) => [n.href, n]));
