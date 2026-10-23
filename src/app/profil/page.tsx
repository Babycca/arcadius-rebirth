"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { PageShell } from "@/components/PageShell";
import PersonalizeThemeModal from "@/components/PersonalizeThemeModal";
import ChangePasswordModal from "@/components/ChangePasswordModal";
import {
  Palette,
  KeyRound,
  Phone,
  Camera,
  ChevronRight,
  Receipt,
  TrendingUp,
  Building2,
  Award,
  Wallet,
} from "lucide-react";

type Payroll = {
  totalSales: number;
  companyProfit: number;
  commission: number;
  bonusAmount: number;
  salary: number;
  salesCount: number;
};

type Profile = {
  firstName: string;
  lastName: string;
  loginHandle: string;
  phone: string | null;
  grade: string;
  role: string;
  accentColor: string | null;
  avatarUrl: string | null;
  payroll: Payroll;
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  AGENT: "Agent",
};

export default function ProfilPage() {
  const { update } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [phone, setPhone] = useState("");
  const [showPersonalize, setShowPersonalize] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/my-profile")
      .then((r) => r.json())
      .then((data: Profile) => {
        setProfile(data);
        setPhone(data.phone ?? "");
      });
  }

  useEffect(() => {
    load();
  }, []);

  async function savePhone() {
    await fetch("/api/my-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 1500);
  }

  async function handleAvatarChange(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/my-profile/avatar", { method: "POST", body: formData });
    setUploading(false);
    if (res.ok) {
      load();
      await update();
    }
  }

  if (!profile) {
    return (
      <PageShell>
        <p className="text-sm text-[rgb(var(--muted))]">Chargement…</p>
      </PageShell>
    );
  }

  const p = profile.payroll;

  return (
    <PageShell>
      <div className="flex flex-col items-center text-center mb-10">
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="relative w-28 h-28 rounded-full overflow-hidden group shrink-0 mb-4 ring-4 ring-[rgb(var(--brand-500)/0.25)] shadow-[0_0_40px_rgb(var(--brand-glow)/0.25)] transition-shadow hover:shadow-[0_0_55px_rgb(var(--brand-glow)/0.4)]"
        >
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatarUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] flex items-center justify-center text-3xl font-medium">
              {profile.firstName[0]}
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera size={20} className="text-white" />
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleAvatarChange(e.target.files?.[0])}
        />

        <h1 className="font-heading text-3xl">
          {profile.firstName} {profile.lastName}
        </h1>
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[rgb(var(--brand-400))] bg-[rgb(var(--brand-500)/0.12)] border border-[rgb(var(--brand-500)/0.25)] rounded-full px-3 py-1 mt-3">
          {profile.grade}
          {profile.role !== "SUPER_ADMIN" && (
            <>
              <span className="w-1 h-1 rounded-full bg-[rgb(var(--brand-400))]" />
              {ROLE_LABELS[profile.role] ?? profile.role}
            </>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 max-w-4xl mx-auto">
        <div className="glass-strong rounded-xl p-5 flex flex-col gap-4">
          <h2 className="text-sm font-medium">Modifier</h2>

          <div>
            <label className="flex items-center gap-2 text-xs text-[rgb(var(--muted))] mb-1.5">
              <Phone size={13} /> Téléphone
            </label>
            <div className="flex gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="—"
                className="glass rounded-lg px-3 py-2 text-sm flex-1 outline-none"
              />
              <button
                onClick={savePhone}
                className="rounded-lg px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all"
              >
                {savedMsg ? "✓" : "OK"}
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 -mx-1.5">
            <button
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left group"
            >
              <span className="w-8 h-8 rounded-full bg-[rgb(var(--brand-500)/0.14)] flex items-center justify-center shrink-0">
                <Camera size={14} className="text-[rgb(var(--brand-400))]" />
              </span>
              <span className="flex-1">Changer ma photo</span>
              <ChevronRight size={14} className="text-[rgb(var(--muted))] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => setShowPersonalize(true)}
              className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left group"
            >
              <span className="w-8 h-8 rounded-full bg-[rgb(var(--brand-500)/0.14)] flex items-center justify-center shrink-0">
                <Palette size={14} className="text-[rgb(var(--brand-400))]" />
              </span>
              <span className="flex-1">Couleur du site</span>
              <ChevronRight size={14} className="text-[rgb(var(--muted))] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
            <button
              onClick={() => setShowPassword(true)}
              className="flex items-center gap-3 text-sm px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left group"
            >
              <span className="w-8 h-8 rounded-full bg-[rgb(var(--brand-500)/0.14)] flex items-center justify-center shrink-0">
                <KeyRound size={14} className="text-[rgb(var(--brand-400))]" />
              </span>
              <span className="flex-1">Changer mon mot de passe</span>
              <ChevronRight size={14} className="text-[rgb(var(--muted))] opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </div>

        <div className="glass-strong rounded-xl p-6">
          <h2 className="text-sm font-medium mb-5">Mes performances — semaine en cours</h2>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div className="card-hover glass rounded-xl p-4 border border-transparent">
              <span className="w-8 h-8 rounded-lg bg-[rgb(var(--brand-500)/0.14)] flex items-center justify-center mb-2.5">
                <TrendingUp size={15} className="text-[rgb(var(--brand-400))]" />
              </span>
              <p className="text-xs text-[rgb(var(--muted))] mb-1">Ventes effectuées</p>
              <p className="text-2xl font-semibold">{p.salesCount}</p>
            </div>
            <div className="card-hover glass rounded-xl p-4 border border-transparent">
              <span className="w-8 h-8 rounded-lg bg-[rgb(var(--brand-500)/0.14)] flex items-center justify-center mb-2.5">
                <Receipt size={15} className="text-[rgb(var(--brand-400))]" />
              </span>
              <p className="text-xs text-[rgb(var(--muted))] mb-1">Factures (CA total)</p>
              <p className="text-2xl font-semibold">${p.totalSales.toLocaleString("fr-FR")}</p>
            </div>
            <div className="card-hover glass rounded-xl p-4 border border-transparent">
              <span className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center mb-2.5">
                <Building2 size={15} className="text-[rgb(var(--muted))]" />
              </span>
              <p className="text-xs text-[rgb(var(--muted))] mb-1">Bénéfice entreprise (10%)</p>
              <p className="text-2xl font-semibold text-[rgb(var(--muted))]">
                ${p.companyProfit.toLocaleString("fr-FR")}
              </p>
            </div>
            <div className="card-hover glass rounded-xl p-4 border border-transparent">
              <span className="w-8 h-8 rounded-lg bg-[rgb(var(--brand-500)/0.14)] flex items-center justify-center mb-2.5">
                <Award size={15} className="text-[rgb(var(--brand-400))]" />
              </span>
              <p className="text-xs text-[rgb(var(--muted))] mb-1">Prime de grade</p>
              <p className="text-2xl font-semibold">${p.bonusAmount.toLocaleString("fr-FR")}</p>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-xl p-5 border border-[rgb(var(--brand-500)/0.35)]" style={{ background: "linear-gradient(135deg, rgb(var(--brand-500)/0.14), rgb(var(--brand-600)/0.05))" }}>
            <Wallet size={72} className="absolute -right-3 -bottom-4 text-[rgb(var(--brand-500)/0.1)]" />
            <p className="text-xs text-[rgb(var(--muted))] mb-1">Salaire final</p>
            <p className="font-heading text-4xl brand-gradient-text">
              ${p.salary.toLocaleString("fr-FR")}
            </p>
          </div>
        </div>
      </div>

      {showPersonalize && <PersonalizeThemeModal onClose={() => setShowPersonalize(false)} />}
      {showPassword && <ChangePasswordModal onClose={() => setShowPassword(false)} />}
    </PageShell>
  );
}
