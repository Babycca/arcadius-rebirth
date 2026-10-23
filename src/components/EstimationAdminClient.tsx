"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import type { EstimationProfile } from "@/lib/estimation-pricing";

type Profile = EstimationProfile & { id: string };

export default function EstimationAdminClient({ initialProfiles }: { initialProfiles: Profile[] }) {
  const [profiles, setProfiles] = useState(initialProfiles);
  const [openId, setOpenId] = useState<string | null>(null);

  // Nouveau profil
  const [newType, setNewType] = useState("");
  const [newZone, setNewZone] = useState("");
  const [newBasePrice, setNewBasePrice] = useState("");

  // Nouveau critère par profil
  const [newCriterionLabel, setNewCriterionLabel] = useState<Record<string, string>>({});

  // Nouvelle option par critère
  const [newOptionLabel, setNewOptionLabel] = useState<Record<string, string>>({});
  const [newOptionAmount, setNewOptionAmount] = useState<Record<string, string>>({});
  const [newOptionMode, setNewOptionMode] = useState<Record<string, string>>({});

  async function createProfile() {
    if (!newType.trim() || !newZone.trim() || !newBasePrice) return;
    const res = await fetch("/api/estimation-profiles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structureType: newType.trim(), zoneName: newZone.trim(), basePrice: newBasePrice }),
    });
    if (res.ok) {
      const profile = await res.json();
      setProfiles((p) => [...p, profile]);
      setNewType("");
      setNewZone("");
      setNewBasePrice("");
    }
  }

  async function updateProfile(id: string, data: Record<string, unknown>) {
    const res = await fetch(`/api/estimation-profiles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const updated = await res.json();
      setProfiles((ps) => ps.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    }
  }

  async function deleteProfile(id: string) {
    setProfiles((p) => p.filter((x) => x.id !== id));
    await fetch(`/api/estimation-profiles/${id}`, { method: "DELETE" });
  }

  async function createCriterion(profileId: string) {
    const label = newCriterionLabel[profileId]?.trim();
    if (!label) return;
    const res = await fetch("/api/estimation-criteria", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, label }),
    });
    if (res.ok) {
      const criterion = await res.json();
      setProfiles((ps) =>
        ps.map((p) => (p.id === profileId ? { ...p, criteria: [...p.criteria, criterion] } : p))
      );
      setNewCriterionLabel((s) => ({ ...s, [profileId]: "" }));
    }
  }

  async function deleteCriterion(profileId: string, criterionId: string) {
    setProfiles((ps) =>
      ps.map((p) => (p.id === profileId ? { ...p, criteria: p.criteria.filter((c) => c.id !== criterionId) } : p))
    );
    await fetch(`/api/estimation-criteria/${criterionId}`, { method: "DELETE" });
  }

  async function createOption(profileId: string, criterionId: string) {
    const label = newOptionLabel[criterionId]?.trim();
    const amount = newOptionAmount[criterionId];
    const priceMode = newOptionMode[criterionId] || "add";
    if (!label || !amount) return;
    const res = await fetch("/api/estimation-criterion-options", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ criterionId, label, amount, priceMode }),
    });
    if (res.ok) {
      const option = await res.json();
      setProfiles((ps) =>
        ps.map((p) =>
          p.id === profileId
            ? {
                ...p,
                criteria: p.criteria.map((c) =>
                  c.id === criterionId ? { ...c, options: [...c.options, option] } : c
                ),
              }
            : p
        )
      );
      setNewOptionLabel((s) => ({ ...s, [criterionId]: "" }));
      setNewOptionAmount((s) => ({ ...s, [criterionId]: "" }));
    }
  }

  async function deleteOption(profileId: string, criterionId: string, optionId: string) {
    setProfiles((ps) =>
      ps.map((p) =>
        p.id === profileId
          ? {
              ...p,
              criteria: p.criteria.map((c) =>
                c.id === criterionId ? { ...c, options: c.options.filter((o) => o.id !== optionId) } : c
              ),
            }
          : p
      )
    );
    await fetch(`/api/estimation-criterion-options/${optionId}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-4 max-w-4xl mx-auto">
      <div className="glass-strong rounded-xl p-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="text-xs text-[rgb(var(--muted))] block mb-1">Type</label>
          <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="villa" className="glass rounded-lg px-3 py-2 text-sm outline-none w-32" />
        </div>
        <div>
          <label className="text-xs text-[rgb(var(--muted))] block mb-1">Zone</label>
          <input value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder="Nom de zone" className="glass rounded-lg px-3 py-2 text-sm outline-none w-40" />
        </div>
        <div>
          <label className="text-xs text-[rgb(var(--muted))] block mb-1">Prix de départ</label>
          <input value={newBasePrice} onChange={(e) => setNewBasePrice(e.target.value)} type="number" placeholder="100000" className="glass rounded-lg px-3 py-2 text-sm outline-none w-32" />
        </div>
        <button
          onClick={createProfile}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110"
        >
          <Plus size={14} /> Profil
        </button>
      </div>

      {profiles.map((profile) => {
        const open = openId === profile.id;
        return (
          <div key={profile.id} className="glass-strong rounded-xl overflow-hidden">
            <button onClick={() => setOpenId(open ? null : profile.id)} className="flex items-center gap-3 w-full px-4 py-3 text-left">
              <span className="flex-1 text-sm font-medium">
                {profile.structureType} — {profile.zoneName}
              </span>
              <span className="text-xs text-[rgb(var(--muted))]">{profile.criteria.length} critères</span>
              <ChevronDown size={16} className={`text-[rgb(var(--muted))] transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {open && (
              <div className="border-t border-white/[0.06] p-4 flex flex-col gap-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="text-xs text-[rgb(var(--muted))] block mb-1">Prix de départ</label>
                    <input
                      defaultValue={profile.basePrice}
                      type="number"
                      onBlur={(e) => updateProfile(profile.id, { basePrice: e.target.value })}
                      className="glass rounded-lg px-2 py-1.5 text-sm outline-none w-28"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-[rgb(var(--muted))] block mb-1">Plafond (optionnel)</label>
                    <input
                      defaultValue={profile.maxPrice ?? ""}
                      type="number"
                      onBlur={(e) => updateProfile(profile.id, { maxPrice: e.target.value })}
                      className="glass rounded-lg px-2 py-1.5 text-sm outline-none w-28"
                    />
                  </div>
                  <button
                    onClick={() => deleteProfile(profile.id)}
                    className="flex items-center gap-1 text-xs text-[rgb(var(--danger))] px-2 py-1.5"
                  >
                    <Trash2 size={13} /> Supprimer ce profil
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  {profile.criteria.map((criterion) => (
                    <div key={criterion.id} className="rounded-lg bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">{criterion.label}</span>
                        <button
                          onClick={() => deleteCriterion(profile.id, criterion.id)}
                          className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                      <div className="flex flex-col gap-1 mb-2">
                        {criterion.options.map((opt) => (
                          <div key={opt.id} className="flex items-center justify-between text-xs px-2 py-1 rounded hover:bg-white/[0.04]">
                            <span>{opt.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[rgb(var(--brand-400))]">
                                {opt.priceMode}: {opt.amount}
                              </span>
                              <button
                                onClick={() => deleteOption(profile.id, criterion.id, opt.id)}
                                className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))]"
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <input
                          value={newOptionLabel[criterion.id] ?? ""}
                          onChange={(e) => setNewOptionLabel((s) => ({ ...s, [criterion.id]: e.target.value }))}
                          placeholder="Option"
                          className="glass rounded-lg px-2 py-1 text-xs outline-none flex-1 min-w-[80px]"
                        />
                        <input
                          value={newOptionAmount[criterion.id] ?? ""}
                          onChange={(e) => setNewOptionAmount((s) => ({ ...s, [criterion.id]: e.target.value }))}
                          type="number"
                          placeholder="Montant"
                          className="glass rounded-lg px-2 py-1 text-xs outline-none w-20"
                        />
                        <select
                          value={newOptionMode[criterion.id] ?? "add"}
                          onChange={(e) => setNewOptionMode((s) => ({ ...s, [criterion.id]: e.target.value }))}
                          className="glass rounded-lg px-2 py-1 text-xs outline-none"
                        >
                          <option value="add">+</option>
                          <option value="subtract">-</option>
                          <option value="fixed">fixe</option>
                        </select>
                        <button
                          onClick={() => createOption(profile.id, criterion.id)}
                          className="text-xs rounded-lg px-2 py-1 text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))]"
                        >
                          OK
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={newCriterionLabel[profile.id] ?? ""}
                    onChange={(e) => setNewCriterionLabel((s) => ({ ...s, [profile.id]: e.target.value }))}
                    placeholder="Nom du nouveau critère"
                    className="glass rounded-lg px-3 py-1.5 text-sm outline-none flex-1"
                  />
                  <button
                    onClick={() => createCriterion(profile.id)}
                    className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))]"
                  >
                    <Plus size={12} /> Critère
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
