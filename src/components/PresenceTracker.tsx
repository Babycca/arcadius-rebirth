"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const PING_INTERVAL_MS = 30 * 1000;

// Ping discret tant que le site est ouvert (onglet actif ou non) — alimente
// Agent.lastSeenAt, seule source de la liste "en ligne" affichée via
// PresenceIndicator. Monté une fois à la racine (layout), pas par page.
export default function PresenceTracker() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    function ping() {
      fetch("/api/presence/ping", { method: "POST" }).catch(() => {});
    }
    ping();
    const id = setInterval(ping, PING_INTERVAL_MS);
    return () => clearInterval(id);
  }, [status]);

  return null;
}
