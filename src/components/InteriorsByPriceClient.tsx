"use client";

import { useMemo, useState } from "react";
import { Copy, Check, Tag } from "lucide-react";
import { renderDiscordText } from "@/lib/discord-markdown";

type TextItem = { id: string; content: string };
type TextGroup = { id: string; name: string; items: TextItem[] };

// Dépliants volontairement exclus de "Trier par prix" (ex : Copropriété,
// dont les biens ne se comparent pas de la même façon que le reste).
const EXCLUDED_GROUP_NAMES = ["copropriété"];

// Une ligne de texte préfait contient généralement un prix au format
// français vers la fin, ex : "Bureau Ancien | *SHELL - 500 KG - 250.000$*"
// (le "*" final est du markdown Discord pour l'italique, pas du texte).
// On cherche le dernier prix présent dans la ligne, sans exiger qu'il soit
// le tout dernier caractère, pour ne pas être gêné par ce genre de
// ponctuation/markdown à la fin.
function parsePriceFromLine(line: string): number | null {
  const matches = [...line.matchAll(/(\d{1,3}(?:[.\s]\d{3})*)\s*\$/g)];
  if (matches.length === 0) return null;
  const digits = matches[matches.length - 1][1].replace(/[.\s]/g, "");
  const value = Number(digits);
  return Number.isNaN(value) ? null : value;
}

// Convertit ce que tape l'utilisateur ("300k", "300 000", "300000", "300.000")
// en un nombre, en acceptant le suffixe "k" pour "milliers".
function parsePriceInput(raw: string): number | null {
  let s = raw.trim().toLowerCase().replace(/\s/g, "").replace(/\$/g, "");
  if (!s) return null;
  let multiplier = 1;
  if (s.endsWith("k")) {
    multiplier = 1000;
    s = s.slice(0, -1);
  }
  s = s.replace(/\./g, "").replace(",", ".");
  const value = Number(s);
  if (Number.isNaN(value)) return null;
  return value * multiplier;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Presse-papiers indisponible (permissions navigateur) : rien à faire de plus.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        copied
          ? "bg-[rgb(var(--success)/0.15)] text-[rgb(var(--success))]"
          : "bg-[rgb(var(--brand-500)/0.15)] text-[rgb(var(--brand-400))] hover:bg-[rgb(var(--brand-500)/0.25)]"
      }`}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copié !" : "Copier"}
    </button>
  );
}

export default function InteriorsByPriceClient({ groups }: { groups: TextGroup[] }) {
  const [input, setInput] = useState("");
  const threshold = useMemo(() => parsePriceInput(input), [input]);

  // Pour chaque texte, on ne garde que les lignes dont le prix est ≤ au
  // seuil, en conservant la ligne d'en-tête (ex : "Bureaux :") uniquement
  // si au moins une de ses lignes est retenue — puis on assemble le tout
  // en un seul nouveau texte, tous dépliants mélangés.
  const mergedText = useMemo(() => {
    if (threshold == null) return "";
    const blocks: string[] = [];

    for (const group of groups) {
      if (EXCLUDED_GROUP_NAMES.includes(group.name.trim().toLowerCase())) continue;
      for (const item of group.items) {
        const lines = item.content.split("\n");
        const kept: string[] = [];
        let pendingHeader: string | null = null;
        // Vrai juste après avoir gardé une ligne à prix, tant qu'on n'a
        // croisé ni une autre ligne à prix ni une ligne de texte "normale" :
        // permet de rattacher au résultat une note sous la ligne (ex : "-# ⚠️
        // ...", ou une ligne vide de séparation) qui la concerne précisément.
        let afterKeptPrice = false;

        for (const line of lines) {
          const price = parsePriceFromLine(line);
          const trimmed = line.trim();
          const isNote = trimmed === "" || trimmed.startsWith("-#");

          if (price == null) {
            if (isNote && afterKeptPrice) {
              kept.push(line);
              continue;
            }
            // Ligne sans prix : probablement un en-tête ("Bureaux :", "Studio :"...),
            // on la met de côté tant qu'aucune ligne suivante ne la justifie.
            pendingHeader = line;
            afterKeptPrice = false;
            continue;
          }
          if (price <= threshold) {
            if (pendingHeader !== null) {
              kept.push(pendingHeader);
              pendingHeader = null;
            }
            kept.push(line);
            afterKeptPrice = true;
          } else {
            afterKeptPrice = false;
          }
        }

        if (kept.length > 0) blocks.push(kept.join("\n"));
      }
    }

    return blocks.join("\n\n");
  }, [groups, threshold]);

  return (
    <div className="glass-strong rounded-xl p-4 max-w-3xl mb-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex shrink-0 items-center gap-1.5 text-sm font-semibold">
          <Tag size={15} className="text-[rgb(var(--brand-400))]" />
          Trier par prix
        </span>
        <div className="w-28 shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ex : 300k"
            className="glass rounded-lg px-3 py-1.5 text-sm w-full outline-none"
          />
        </div>
        {input.trim() && threshold == null && (
          <span className="text-sm text-[rgb(var(--danger))]">Prix non reconnu.</span>
        )}
      </div>

      {threshold != null && (
        <div className="mt-3 rounded-xl border border-white/[0.08] overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-2.5 bg-white/[0.02]">
            <span className="text-sm font-semibold">Résultat</span>
            {mergedText && <CopyButton text={mergedText} />}
          </div>
          <div className="px-4 py-3 text-sm leading-relaxed">
            {mergedText ? (
              renderDiscordText(mergedText)
            ) : (
              <p className="text-[rgb(var(--muted))]">Aucun texte ne correspond à ce prix.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
