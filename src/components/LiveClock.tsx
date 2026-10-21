"use client";

import { useEffect, useState } from "react";

export default function LiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) return <span className="text-2xl font-semibold">—</span>;

  const date = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  const time = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  return (
    <>
      <span className="text-xl font-semibold capitalize">{time}</span>
      <span className="text-xs text-[rgb(var(--muted))] capitalize">{date}</span>
    </>
  );
}
