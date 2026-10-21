"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useDialog } from "@/components/DialogProvider";

type Category = { id: string; name: string; color: string; emoji: string };

export default function ZoneCategoriesPanel() {
  const { alertDialog } = useDialog();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#a78bfa");
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/zone-categories")
      .then((r) => r.json())
      .then(setCategories);
  }

  useEffect(() => {
    load();
  }, []);

  async function createCategory() {
    if (!newName.trim()) return;
    setError(null);
    const res = await fetch("/api/zone-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), color: newColor }),
    });
    if (res.ok) {
      setNewName("");
      load();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Impossible de créer cette catégorie.");
    }
  }

  async function updateCategory(id: string, field: string, value: string) {
    await fetch(`/api/zone-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
  }

  async function deleteCategory(id: string) {
    const res = await fetch(`/api/zone-categories/${id}`, { method: "DELETE" });
    if (res.ok) {
      setCategories((c) => c.filter((x) => x.id !== id));
    } else {
      const body = await res.json().catch(() => null);
      await alertDialog(body?.error ?? "Impossible de supprimer cette catégorie.");
    }
  }

  return (
    <div className="glass-strong rounded-xl p-5 w-full">
      <h2 className="text-sm font-medium mb-1">Catégories de la carte des biens réservés</h2>
      <p className="text-xs text-[rgb(var(--muted))] mb-4">
        Renomme, recolore ou supprime n&apos;importe quelle catégorie. Une catégorie encore utilisée par une zone
        ne peut pas être supprimée.
      </p>

      {error && (
        <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2 mb-3">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-2 mb-4">
        {categories.map((c) => (
          <div key={c.id} className="flex items-center gap-2">
            <input
              defaultValue={c.emoji}
              onBlur={(e) => e.target.value.trim() && updateCategory(c.id, "emoji", e.target.value.trim())}
              className="text-base shrink-0 w-9 text-center bg-transparent outline-none border-b border-transparent focus:border-white/20 rounded"
              title="Emoji de la catégorie"
            />
            <input
              defaultValue={c.name}
              onBlur={(e) => e.target.value.trim() && updateCategory(c.id, "name", e.target.value.trim())}
              className="text-sm flex-1 bg-transparent outline-none border-b border-transparent focus:border-white/20"
            />
            <input
              type="color"
              defaultValue={c.color}
              onBlur={(e) => updateCategory(c.id, "color", e.target.value)}
              className="w-7 h-7 rounded-lg overflow-hidden cursor-pointer bg-transparent border-0"
            />
            <input
              defaultValue={c.color}
              onBlur={(e) => e.target.value.trim() && updateCategory(c.id, "color", e.target.value.trim())}
              className="glass rounded-lg px-2 py-1 text-xs w-24 outline-none font-mono"
            />
            <button onClick={() => deleteCategory(c.id)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nom de la catégorie"
          className="glass rounded-lg px-3 py-2 text-sm outline-none flex-1"
        />
        <input
          type="color"
          value={newColor}
          onChange={(e) => setNewColor(e.target.value)}
          className="w-10 h-10 rounded-lg overflow-hidden cursor-pointer bg-transparent border-0"
        />
        <button
          onClick={createCategory}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110"
        >
          <Plus size={14} /> Ajouter
        </button>
      </div>
    </div>
  );
}
