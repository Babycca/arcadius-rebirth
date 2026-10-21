"use client";

import { useRef, useState } from "react";
import { Plus, Trash2, RefreshCw } from "lucide-react";
import { useCanEdit } from "@/lib/use-can-edit";
import { useDialog } from "./DialogProvider";

type Photo = { id: string; url: string };

export default function TarifPhotosClient({ initialPhotos }: { initialPhotos: Photo[] }) {
  const { canEdit } = useCanEdit();
  const { confirm } = useDialog();
  const [photos, setPhotos] = useState(initialPhotos);
  const [uploading, setUploading] = useState(false);
  const addFileRef = useRef<HTMLInputElement>(null);
  const replaceFileRef = useRef<HTMLInputElement>(null);
  const replacingId = useRef<string | null>(null);

  async function handleAdd(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch("/api/tarif-photos", { method: "POST", body: formData });
    setUploading(false);
    if (res.ok) {
      const photo = await res.json();
      setPhotos((p) => [...p, photo]);
    }
  }

  function startReplace(id: string) {
    replacingId.current = id;
    replaceFileRef.current?.click();
  }

  async function handleReplace(file: File | undefined) {
    const id = replacingId.current;
    if (!file || !id) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/tarif-photos/${id}`, { method: "PATCH", body: formData });
    setUploading(false);
    if (res.ok) {
      const updated = await res.json();
      setPhotos((p) => p.map((ph) => (ph.id === id ? updated : ph)));
    }
  }

  async function handleDelete(id: string) {
    const ok = await confirm("Supprimer cette photo ?", { danger: true });
    if (!ok) return;
    setPhotos((p) => p.filter((ph) => ph.id !== id));
    await fetch(`/api/tarif-photos/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      {photos.length === 0 && (
        <p className="text-sm text-[rgb(var(--muted))]">Aucune photo pour l&apos;instant.</p>
      )}
      {photos.map((p) => (
        <div key={p.id} className="relative group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.url} alt="Grille tarifaire" className="w-full rounded-xl border border-white/[0.08]" />
          {canEdit && (
            <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => startReplace(p.id)}
                title="Remplacer cette photo"
                className="glass-strong rounded-lg p-2 text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))]"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => handleDelete(p.id)}
                title="Supprimer cette photo"
                className="glass-strong rounded-lg p-2 text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))]"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      ))}

      {canEdit && (
        <>
          <button
            onClick={() => addFileRef.current?.click()}
            disabled={uploading}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
          >
            <Plus size={15} />
            {uploading ? "Envoi…" : "Ajouter une photo"}
          </button>
          <input
            ref={addFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleAdd(e.target.files?.[0])}
          />
          <input
            ref={replaceFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleReplace(e.target.files?.[0])}
          />
        </>
      )}
    </div>
  );
}
