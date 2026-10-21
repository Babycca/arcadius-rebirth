"use client";

import dynamic from "next/dynamic";

const ReservedZonesMap = dynamic(() => import("./ReservedZonesMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[75vh] min-h-[500px] w-full rounded-xl border border-white/[0.08] flex items-center justify-center text-sm text-[rgb(var(--muted))]">
      Chargement de la carte…
    </div>
  ),
});

export default ReservedZonesMap;
