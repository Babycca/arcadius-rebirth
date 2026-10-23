import type { Metadata } from "next";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import { getServerSession } from "next-auth";
import "./globals.css";
import AuthProvider from "@/components/AuthProvider";
import ThemeAccent from "@/components/ThemeAccent";
import BackgroundScene from "@/components/BackgroundScene";
import PresenceTracker from "@/components/PresenceTracker";
import { DialogProvider } from "@/components/DialogProvider";
import { ToastProvider } from "@/components/ToastProvider";
import { authOptions } from "@/lib/auth";
import { paletteFromAccent, logoFilter } from "@/lib/theme-colors";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Arcadius",
  description: "Arcadius — agence immobilière",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Couleur d'accent injectée directement dans le HTML rendu côté serveur —
  // dépend du compte réellement connecté pour cette requête, donc plus
  // fiable qu'un script client (localStorage pouvait rester sur la couleur
  // d'un compte précédent le temps que la session se recharge, provoquant
  // un flash de couleur visible à chaque rafraîchissement/changement de compte).
  const session = await getServerSession(authOptions);
  const accentColor = (session?.user as { accentColor?: string | null } | undefined)?.accentColor;
  const palette = accentColor ? paletteFromAccent(accentColor) : null;
  const logoFilterValue = accentColor ? logoFilter(accentColor) : "none";

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        {palette && (
          <style
            dangerouslySetInnerHTML={{
              __html: `:root{--brand-400:${palette[400]};--brand-500:${palette[500]};--brand-600:${palette[600]};--brand-glow:${palette.glow};--bg-elevated:${palette.bgElevated};--bg-elevated-2:${palette.bgElevated2};--logo-filter:${logoFilterValue};}`,
            }}
          />
        )}
        <div className="ambient-bg" />
        <AuthProvider>
          <ThemeAccent />
          <BackgroundScene />
          <PresenceTracker />
          <DialogProvider>
            <ToastProvider>{children}</ToastProvider>
          </DialogProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
