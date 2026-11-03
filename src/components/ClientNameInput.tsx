"use client";

import { useEffect, useRef, useState } from "react";

type Suggestion = { clientName: string; clientPhone: string | null };

// Champ "Identité du client" avec suggestions discrètes basées sur les
// clients déjà vus (ventes en cours, archivées, importées) — n'apparaît
// qu'à partir de 3 lettres, ignorable en continuant simplement à taper.
export default function ClientNameInput({
  value,
  onChange,
  onSelect,
  required,
  className,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (s: Suggestion) => void;
  required?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/accounting/client-suggestions?q=${encodeURIComponent(value.trim())}`)
        .then((r) => (r.ok ? r.json() : []))
        .then((d) => {
          setSuggestions(Array.isArray(d) ? d : []);
          setOpen(true);
        })
        .catch(() => {});
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <input
        required={required}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-white/10 shadow-xl glass-popover max-h-48 overflow-y-auto py-1">
          {suggestions.map((s, i) => (
            <button
              key={`${s.clientName}-${s.clientPhone}-${i}`}
              type="button"
              onClick={() => {
                onSelect(s);
                setOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-white/[0.06] transition-colors truncate"
            >
              {s.clientName}
              {s.clientPhone && <span className="text-[rgb(var(--muted))]"> — {s.clientPhone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
