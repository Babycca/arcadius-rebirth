"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Lock, User } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    setLoading(false);
    if (res?.error) {
      setError("Identifiant ou mot de passe incorrect.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="relative flex flex-1 min-h-screen items-center justify-center p-4 overflow-hidden">
      <div
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px circle at 50% -10%, rgb(var(--brand-glow) / 0.22), transparent 60%)",
        }}
      />

      <div className="relative w-full max-w-sm">
        <div
          className="absolute inset-0 rounded-[28px] blur-2xl opacity-40 -z-10"
          style={{ background: "rgb(var(--brand-glow))" }}
        />

        <div className="glass-strong rounded-[28px] p-9 border border-white/[0.08] shadow-2xl">
          <div className="flex flex-col items-center mb-9">
            <div className="relative mb-4">
              <div
                className="absolute inset-0 rounded-3xl blur-xl opacity-50"
                style={{ background: "rgb(var(--brand-glow))" }}
              />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/images/logo.png"
                alt="Arcadius"
                className="relative w-20 h-20 rounded-2xl shrink-0"
              />
            </div>
            <h1 className="font-heading text-3xl brand-gradient-text">Arcadius</h1>
            <p className="text-sm text-[rgb(var(--muted))] mt-1.5">Connexion agent</p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex items-center gap-2.5 glass rounded-xl px-3.5 py-3 border border-white/[0.06] focus-within:border-[rgb(var(--brand-500)/0.5)] transition-colors">
              <User size={16} className="text-[rgb(var(--muted))] shrink-0" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Identifiant"
                required
                autoComplete="username"
                className="bg-transparent outline-none text-sm flex-1 placeholder:text-[rgb(var(--muted))]"
              />
            </div>

            <div className="flex items-center gap-2.5 glass rounded-xl px-3.5 py-3 border border-white/[0.06] focus-within:border-[rgb(var(--brand-500)/0.5)] transition-colors">
              <Lock size={16} className="text-[rgb(var(--muted))] shrink-0" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mot de passe"
                required
                autoComplete="current-password"
                className="bg-transparent outline-none text-sm flex-1 placeholder:text-[rgb(var(--muted))]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-xl py-3 text-sm font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all shadow-[0_8px_24px_rgb(var(--brand-glow)/0.4)] disabled:opacity-60"
            >
              {loading ? "Connexion…" : "Se connecter"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
