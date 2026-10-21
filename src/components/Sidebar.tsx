"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
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
  LogOut,
  Palette,
  Pencil,
  User,
  Sofa,
  ChevronUp,
  ChevronDown,
  MessageSquareText,
  BookOpen,
  GraduationCap,
  Archive,
} from "lucide-react";
import LiveClock from "./LiveClock";
import PersonalizeThemeModal from "./PersonalizeThemeModal";
import ChangePasswordModal from "./ChangePasswordModal";
import { useCanEdit } from "@/lib/use-can-edit";
import { logoHueRotationDeg } from "@/lib/theme-colors";

const NAV = [
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
  { href: "/comptabilite/depenses", icon: Receipt, label: "Dépenses" },
  { href: "/comptabilite/archive", icon: Archive, label: "Archive Comptabilité" },
  { href: "/administration", icon: Settings, label: "Administration" },
];

type PageVisibilityRow = { href: string; hiddenForAll: boolean; hiddenForAgentIds: string; order: number };

const PAGE_VISIBILITY_CACHE_KEY = "arcadius-page-visibility-cache";

// La Sidebar est remontée à chaque navigation (PageShell est appelé par
// chaque page, pas par un layout partagé) : sans ce cache au niveau du
// module, l'état repartirait de [] à chaque clic et afficherait brièvement
// le menu complet, sans filtrage, avant que le fetch ne revienne. Le
// sessionStorage couvre en plus le cas d'un rechargement complet de page
// (F5), où le module JS lui-même repart de zéro.
let cachedPageVisibility: PageVisibilityRow[] | null = null;

function readCachedPageVisibility(): PageVisibilityRow[] | null {
  if (cachedPageVisibility) return cachedPageVisibility;
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PAGE_VISIBILITY_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeCachedPageVisibility(rows: PageVisibilityRow[]) {
  cachedPageVisibility = rows;
  try {
    sessionStorage.setItem(PAGE_VISIBILITY_CACHE_KEY, JSON.stringify(rows));
  } catch {
    // ignore (stockage indisponible/plein)
  }
}

export function Sidebar() {
  const pathname = usePathname();
  const { data: session, update } = useSession();
  const user = session?.user as {
    name?: string;
    role?: string;
    editorMode?: boolean;
    accentColor?: string | null;
    mustChangePassword?: boolean;
    avatarUrl?: string | null;
  } | undefined;
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pageVisibility, setPageVisibility] = useState<PageVisibilityRow[]>(() => readCachedPageVisibility() ?? []);
  const { isAdmin, canEdit } = useCanEdit();

  useEffect(() => {
    if (user?.mustChangePassword) setShowPassword(true);
  }, [user?.mustChangePassword]);

  useEffect(() => {
    fetch("/api/page-visibility")
      .then((r) => r.json())
      .then((rows: PageVisibilityRow[]) => {
        writeCachedPageVisibility(rows);
        setPageVisibility(rows);
      })
      .catch(() => {});
  }, []);

  const orderedNav = (() => {
    const orderMap = new Map(pageVisibility.map((p) => [p.href, p]));
    const sorted = [...NAV].sort((a, b) => {
      const oa = orderMap.get(a.href)?.order ?? NAV.indexOf(a);
      const ob = orderMap.get(b.href)?.order ?? NAV.indexOf(b);
      return oa - ob;
    });
    // Un admin hors mode édition voit le menu comme tout le monde (une page
    // masquée reste masquée) — les pages cachées ne réapparaissent que
    // lorsqu'il active le mode édition, pour gérer leur visibilité sans
    // qu'elles encombrent son quotidien.
    if (isAdmin && canEdit) return sorted;
    const userId = (user as { id?: string } | undefined)?.id;
    return sorted.filter((item) => {
      const vis = orderMap.get(item.href);
      if (!vis) return true;
      try {
        const ids: string[] = JSON.parse(vis.hiddenForAgentIds || "[]");
        // Masquée pour tous : la liste devient une liste d'exceptions
        // autorisées (accès accordé au cas par cas), au lieu d'une liste
        // d'exclusions — sinon impossible de donner l'accès à un agent
        // précis sans tout rendre visible pour tout le monde.
        if (vis.hiddenForAll) return Boolean(userId && ids.includes(userId));
        if (userId && ids.includes(userId)) return false;
      } catch {
        // ignore
      }
      return true;
    });
  })();

  const hueRotate = user?.accentColor ? logoHueRotationDeg(user.accentColor) : 0;

  async function movePage(href: string, dir: -1 | 1) {
    const hrefs = orderedNav.map((n) => n.href);
    const idx = hrefs.indexOf(href);
    const target = idx + dir;
    if (idx < 0 || target < 0 || target >= hrefs.length) return;
    [hrefs[idx], hrefs[target]] = [hrefs[target], hrefs[idx]];

    setPageVisibility((ps) => {
      const byHref = new Map(ps.map((p) => [p.href, p]));
      const next = hrefs.map((h, order) => {
        const existing = byHref.get(h);
        return existing ? { ...existing, order } : { href: h, hiddenForAll: false, hiddenForAgentIds: "[]", order };
      });
      writeCachedPageVisibility(next);
      return next;
    });
    await fetch("/api/page-visibility/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hrefs }),
    });
  }

  async function toggleEditorMode() {
    await fetch("/api/editor-mode", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editorMode: !user?.editorMode }),
    });
    await update();
  }

  return (
    <aside className="hidden md:flex w-64 flex-col glass m-4 rounded-2xl p-4 gap-1 shrink-0">
      <div className="px-2 pb-4 mb-2 border-b border-white/[0.08] flex flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/logo.png"
          alt="Arcadius"
          className="w-20 h-20 mb-2 rounded-2xl shrink-0"
          style={{ filter: `hue-rotate(${hueRotate}deg)` }}
        />
        <span className="font-heading text-2xl brand-gradient-text">Arcadius</span>
        <p className="text-xs text-[rgb(var(--muted))] mt-0.5">Agence immobilière</p>
        <div className="flex flex-col items-center mt-2">
          <LiveClock />
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-1">
        {orderedNav.map(({ href, icon: Icon, label }, i) => {
          const active =
            href === "/comptabilite/archive" ? pathname.startsWith(href) : pathname === href;
          return (
            <div key={href} className="flex items-center gap-1">
              {canEdit && (
                <div className="flex flex-col shrink-0">
                  <button
                    onClick={() => movePage(href, -1)}
                    disabled={i === 0}
                    className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] disabled:opacity-20"
                  >
                    <ChevronUp size={11} />
                  </button>
                  <button
                    onClick={() => movePage(href, 1)}
                    disabled={i === orderedNav.length - 1}
                    className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] disabled:opacity-20"
                  >
                    <ChevronDown size={11} />
                  </button>
                </div>
              )}
              <Link
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors flex-1 min-w-0 ${
                  active
                    ? "bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] font-medium"
                    : "text-[rgb(var(--muted))] hover:bg-white/[0.04] hover:text-[rgb(var(--foreground))]"
                }`}
              >
                <Icon size={17} />
                {label}
              </Link>
            </div>
          );
        })}
      </div>

      {user && (
        <div className="border-t border-white/[0.08] pt-3 mt-2 flex items-center gap-2 px-1">
          <Link href="/profil" className="flex items-center gap-2 flex-1 min-w-0 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-xs font-medium shrink-0 overflow-hidden">
              {user.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                user.name?.[0] ?? "?"
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{user.name}</p>
            </div>
          </Link>
          {isAdmin && (
            <button
              onClick={toggleEditorMode}
              className={`transition-colors p-1 ${
                canEdit ? "text-[rgb(var(--brand-400))]" : "text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
              }`}
              title={canEdit ? "Désactiver le mode édition" : "Activer le mode édition"}
            >
              <Pencil size={15} />
            </button>
          )}
          <button
            onClick={() => setShowPersonalize(true)}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] transition-colors p-1"
            title="Personnaliser"
          >
            <Palette size={15} />
          </button>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] transition-colors p-1"
            title="Déconnexion"
          >
            <LogOut size={15} />
          </button>
        </div>
      )}

      {showPersonalize && <PersonalizeThemeModal onClose={() => setShowPersonalize(false)} />}
      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
    </aside>
  );
}
