"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, RotateCcw } from "lucide-react";
import {
  ESTIMATION_STRUCTURE_TYPES,
  ESTIMATION_STRUCTURE_LABELS,
  ESTIMATION_REGIONS,
  ESTIMATION_REGION_LABELS,
  type EstimationStructureType,
} from "@/lib/estimation-types";
import {
  pickActiveInteriorGroup,
  computeEstimation,
  formatEstimationPrice,
  type EstimationProfile,
  type EstimationCriterion,
} from "@/lib/estimation-pricing";

type Step = "structure" | "zone" | "criteria" | "interior" | "result";

export default function EstimationWizard() {
  const [profiles, setProfiles] = useState<EstimationProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [step, setStep] = useState<Step>("structure");
  const [structureType, setStructureType] = useState<EstimationStructureType | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [selectedOptionIds, setSelectedOptionIds] = useState<string[]>([]);
  const [interiorItemId, setInteriorItemId] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/estimation-profiles")
      .then((r) => r.json())
      .then((data: EstimationProfile[]) => {
        setProfiles(data);
        setLoading(false);
      });
  }, []);

  const zonesForStructure = useMemo(
    () => profiles.filter((p) => p.structureType === structureType).sort((a, b) => a.order - b.order),
    [profiles, structureType]
  );

  const zoneGroups = useMemo(() => {
    const groups: { label: string | null; zones: EstimationProfile[] }[] = [];
    for (const region of ESTIMATION_REGIONS) {
      const zones = zonesForStructure.filter((z) => z.region === region);
      if (zones.length > 0) groups.push({ label: ESTIMATION_REGION_LABELS[region], zones });
    }
    const uncategorized = zonesForStructure.filter((z) => !z.region);
    if (uncategorized.length > 0) groups.push({ label: null, zones: uncategorized });
    return groups;
  }, [zonesForStructure]);

  const profile = useMemo(() => profiles.find((p) => p.id === profileId) ?? null, [profiles, profileId]);

  const activeGroup = useMemo(() => {
    if (!profile) return null;
    return pickActiveInteriorGroup(profile.interiorGroups, selectedOptionIds);
  }, [profile, selectedOptionIds]);

  function reset() {
    setStep("structure");
    setStructureType(null);
    setProfileId(null);
    setSelectedOptionIds([]);
    setInteriorItemId(null);
    setResult(null);
  }

  function pickStructure(type: EstimationStructureType) {
    setStructureType(type);
    setStep("zone");
  }

  function pickZone(chosen: EstimationProfile) {
    setProfileId(chosen.id);
    setSelectedOptionIds([]);
    setInteriorItemId(null);
    setStep(chosen.criteria.length > 0 ? "criteria" : chosen.interiorGroups.length > 0 ? "interior" : "result");
    if (chosen.criteria.length === 0 && chosen.interiorGroups.length === 0) {
      setResult(computeEstimation(chosen, [], null));
    }
  }

  function toggleCheckbox(optionId: string) {
    setSelectedOptionIds((prev) => (prev.includes(optionId) ? prev.filter((id) => id !== optionId) : [...prev, optionId]));
  }

  function selectRadioOption(criterion: EstimationCriterion, optionId: string) {
    setSelectedOptionIds((prev) => {
      const withoutSiblings = prev.filter((id) => !criterion.options.some((o) => o.id === id));
      return [...withoutSiblings, optionId];
    });
  }

  const allRadioAnswered = useMemo(() => {
    if (!profile) return false;
    return profile.criteria
      .filter((c) => c.type === "radio")
      .every((c) => c.options.some((o) => selectedOptionIds.includes(o.id)));
  }, [profile, selectedOptionIds]);

  function goToInteriorOrResult() {
    if (!profile) return;
    if (profile.interiorGroups.length === 0) {
      setResult(computeEstimation(profile, selectedOptionIds, null));
      setStep("result");
    } else {
      setStep("interior");
    }
  }

  function validate() {
    if (!profile) return;
    const item = activeGroup?.items.find((it) => it.id === interiorItemId) ?? null;
    setResult(computeEstimation(profile, selectedOptionIds, item));
    setStep("result");
  }

  if (loading) return <p className="text-sm text-[rgb(var(--muted))]">Chargement…</p>;

  return (
    <div className="mx-auto max-w-4xl flex flex-col gap-4">
      {step !== "structure" && step !== "result" && (
        <button
          type="button"
          onClick={() => {
            if (step === "zone") setStep("structure");
            else if (step === "criteria") setStep("zone");
            else if (step === "interior") setStep(profile && profile.criteria.length > 0 ? "criteria" : "zone");
          }}
          className="inline-flex items-center gap-1 text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] w-fit"
        >
          <ChevronLeft size={16} /> Retour
        </button>
      )}

      {step === "structure" && (
        <div className="glass-strong rounded-xl p-6">
          <h2 className="font-heading text-sm mb-4">Structure</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {ESTIMATION_STRUCTURE_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => pickStructure(type)}
                className="rounded-xl glass px-4 py-6 text-center text-sm font-medium hover:border-[rgb(var(--brand-500)/0.5)] hover:bg-[rgb(var(--brand-500)/0.08)] transition-colors"
              >
                {ESTIMATION_STRUCTURE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === "zone" && (
        <div className="glass-strong rounded-xl p-6">
          <h2 className="font-heading text-sm mb-4">
            Zone — {structureType && ESTIMATION_STRUCTURE_LABELS[structureType]}
          </h2>
          {zonesForStructure.length === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">Aucune zone configurée pour cette structure.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {zoneGroups.map((group, i) => (
                <div key={group.label ?? `sans-region-${i}`}>
                  {group.label && (
                    <p className="mb-2 text-xs text-[rgb(var(--muted))]">{group.label}</p>
                  )}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {group.zones.map((z) => (
                      <button
                        key={z.id}
                        onClick={() => pickZone(z)}
                        className="rounded-lg glass px-3 py-3 text-sm font-medium hover:border-[rgb(var(--brand-500)/0.5)] hover:bg-[rgb(var(--brand-500)/0.08)] transition-colors"
                      >
                        {z.zoneName}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {step === "criteria" && profile && (
        <div className="glass-strong rounded-xl p-6 flex flex-col gap-5">
          <h2 className="font-heading text-sm">Critères — {profile.zoneName}</h2>
          {[...profile.criteria]
            .sort((a, b) => a.order - b.order)
            .map((criterion) => (
              <div key={criterion.id}>
                {criterion.type === "checkbox" ? (
                  (() => {
                    const optionId = criterion.options[0]?.id ?? "";
                    const checked = selectedOptionIds.includes(optionId);
                    return (
                      <button
                        onClick={() => optionId && toggleCheckbox(optionId)}
                        className="flex w-full items-center justify-between gap-3 py-1 text-left"
                      >
                        <span className="text-sm font-medium">{criterion.label}</span>
                        <span
                          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                            checked ? "bg-[rgb(var(--brand-500))]" : "bg-white/10"
                          }`}
                        >
                          <span
                            className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform ${
                              checked ? "translate-x-5" : "translate-x-1"
                            }`}
                          />
                        </span>
                      </button>
                    );
                  })()
                ) : (
                  <>
                    <p className="mb-2 text-sm font-medium">{criterion.label}</p>
                    <div className="flex flex-wrap gap-2">
                      {criterion.options.map((option) => {
                        const active = selectedOptionIds.includes(option.id);
                        return (
                          <button
                            key={option.id}
                            onClick={() => selectRadioOption(criterion, option.id)}
                            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                              active
                                ? "bg-[rgb(var(--brand-500))] text-white"
                                : "glass text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]"
                            }`}
                          >
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            ))}
          <div className="flex justify-end">
            <button
              disabled={!allRadioAnswered}
              onClick={goToInteriorOrResult}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Suivant
            </button>
          </div>
        </div>
      )}

      {step === "interior" && profile && (
        <div className="glass-strong rounded-xl p-6 flex flex-col gap-4">
          <h2 className="font-heading text-sm">Intérieur — {profile.zoneName}</h2>
          {!activeGroup || activeGroup.items.length === 0 ? (
            <p className="text-sm text-[rgb(var(--muted))]">Aucun intérieur disponible pour cette combinaison.</p>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto pr-1 flex flex-col gap-1.5">
              {activeGroup.items.map((it) => {
                const active = interiorItemId === it.id;
                return (
                  <button
                    key={it.id}
                    onClick={() => setInteriorItemId(it.id)}
                    className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      active ? "glass-strong border border-[rgb(var(--brand-500)/0.5)]" : "glass hover:border-white/20"
                    }`}
                  >
                    <span>
                      {it.name}
                      {it.type && <span className="ml-2 text-xs text-[rgb(var(--muted))]">{it.type}</span>}
                      {it.storageKg != null && (
                        <span className="ml-1 text-xs text-[rgb(var(--muted))]">— {it.storageKg} kg</span>
                      )}
                    </span>
                    <span
                      className={`h-4 w-4 shrink-0 rounded-full border-2 ${
                        active ? "border-[rgb(var(--brand-500))] bg-[rgb(var(--brand-500))]" : "border-white/20"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex justify-end">
            <button
              disabled={!interiorItemId}
              onClick={validate}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Valider
            </button>
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="glass-strong rounded-xl p-8 text-center flex flex-col items-center gap-4">
          <p className="text-sm text-[rgb(var(--muted))]">
            {structureType && ESTIMATION_STRUCTURE_LABELS[structureType]} — {profile?.zoneName}
          </p>
          <p className="font-heading text-3xl brand-gradient-text">
            {result != null ? `Estimation à ${formatEstimationPrice(result)}` : "—"}
          </p>
          <button
            onClick={reset}
            className="flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-medium glass hover:border-white/20 transition-colors"
          >
            <RotateCcw size={14} /> Recommencer
          </button>
        </div>
      )}
    </div>
  );
}
