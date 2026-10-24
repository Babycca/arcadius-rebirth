"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

function greetingWord(hour: number) {
  if (hour >= 2 && hour < 7) return "Il faut dormir";
  if (hour >= 7 && hour < 18) return "Bonjour";
  return "Bonsoir";
}

export default function DashboardGreeting() {
  const { data: session } = useSession();
  const [word, setWord] = useState("Bonjour");

  useEffect(() => {
    setWord(greetingWord(new Date().getHours()));
  }, []);

  const firstName = (session?.user as { name?: string } | undefined)?.name?.split(" ")[0] ?? "";

  return (
    <>
      {word}, <span className="brand-gradient-text">{firstName}</span>
    </>
  );
}
