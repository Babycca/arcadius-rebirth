"use client";

// Décor d'ambiance en fond de toute l'application : ciel étoilé sur tout le
// viewport (étoiles filantes + étoiles scintillantes) avec la tour Arcadius
// détourée (fond PNG transparent) ancrée à droite. Le bâtiment et ses
// fenêtres suivent la couleur d'accent choisie par l'utilisateur (même
// technique de hue-rotate que le logo dans la Sidebar).

const SHOOTING_STARS = [
  { top: "6%", left: "8%", delay: "0s", duration: "9s" },
  { top: "14%", left: "32%", delay: "3.5s", duration: "11s" },
  { top: "3%", left: "55%", delay: "7s", duration: "8.5s" },
  { top: "22%", left: "15%", delay: "11s", duration: "10s" },
  { top: "9%", left: "70%", delay: "5s", duration: "9.5s" },
  { top: "28%", left: "45%", delay: "14s", duration: "12s" },
];

function seededTwinkleStars(count: number) {
  // Génération déterministe (pas de Math.random pur) pour que le rendu
  // serveur/client reste identique et évite un mismatch d'hydratation.
  let seed = 42;
  const rand = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: count }, (_, i) => ({
    key: i,
    top: `${(rand() * 100).toFixed(1)}%`,
    left: `${(rand() * 100).toFixed(1)}%`,
    delay: `${(rand() * 6).toFixed(2)}s`,
    duration: `${(2.5 + rand() * 3).toFixed(2)}s`,
  }));
}

const TWINKLE_STARS = seededTwinkleStars(45);

export default function BackgroundScene() {
  return (
    <div className="fixed inset-0 -z-20 overflow-hidden pointer-events-none">
      {TWINKLE_STARS.map((s) => (
        <span
          key={s.key}
          className="twinkle-star"
          style={{ top: s.top, left: s.left, animationDelay: s.delay, animationDuration: s.duration }}
        />
      ))}

      {SHOOTING_STARS.map((s, i) => (
        <span
          key={i}
          className="shooting-star"
          style={{ top: s.top, left: s.left, animationDelay: s.delay, animationDuration: s.duration }}
        />
      ))}

      <div
        className="absolute right-0 bottom-0 w-[85vw] max-w-[1900px] h-[95vh]"
        style={{ filter: "var(--logo-filter, none)" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/arcadius-tower-cutout.webp"
          alt=""
          className="w-full h-full object-cover object-right-bottom"
        />
      </div>
    </div>
  );
}
