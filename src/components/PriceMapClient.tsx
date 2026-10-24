"use client";

import { useRef, useState } from "react";
import { Tag, X, Trash2, Plus, Image as ImageIcon } from "lucide-react";
import { useDialog } from "./DialogProvider";
import { useCanEdit } from "@/lib/use-can-edit";

type PinImage = { id: string; url: string };

type Pin = {
  id: string;
  x: number;
  y: number;
  label: string | null;
  price: number | null;
  reserved: boolean;
  images: PinImage[];
};

export default function PriceMapClient({
  imageUrl,
  initialPins,
}: {
  imageUrl: string | null;
  initialPins: Pin[];
}) {
  const { confirm } = useDialog();
  const { canEdit } = useCanEdit();

  const mapRef = useRef<HTMLDivElement>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const [pins, setPins] = useState(initialPins);
  const [editing, setEditing] = useState<Pin | null>(null);
  const [viewing, setViewing] = useState<Pin | null>(null);
  const [labelInput, setLabelInput] = useState("");
  const [priceInput, setPriceInput] = useState("");
  const [reservedInput, setReservedInput] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  function openEdit(pin: Pin) {
    if (!canEdit) return;
    setEditing(pin);
    setLabelInput(pin.label ?? "");
    setPriceInput(pin.price != null ? String(pin.price) : "");
    setReservedInput(pin.reserved);
  }

  async function handleMapClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!canEdit || !mapRef.current) return;
    if ((e.target as HTMLElement).closest("button")) return; // clic sur un point existant
    const rect = mapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const res = await fetch("/api/price-map/pins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ x, y }),
    });
    if (res.ok) {
      const pin = await res.json();
      setPins((prev) => [...prev, pin]);
      openEdit(pin);
    }
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    const price = priceInput.trim() === "" ? null : Number(priceInput);
    const res = await fetch(`/api/price-map/pins/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price, label: labelInput, reserved: reservedInput }),
    });
    setSaving(false);
    if (res.ok) {
      const updated = await res.json();
      setPins((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditing(null);
    }
  }

  async function addPhoto(file: File | undefined) {
    if (!file || !editing) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/price-map/pins/${editing.id}/images`, { method: "POST", body: formData });
    setUploadingPhoto(false);
    if (res.ok) {
      const image = await res.json();
      setEditing((p) => (p ? { ...p, images: [...p.images, image] } : p));
      setPins((prev) =>
        prev.map((p) => (p.id === editing.id ? { ...p, images: [...p.images, image] } : p))
      );
    }
  }

  async function deletePhoto(imageId: string) {
    if (!editing) return;
    await fetch(`/api/price-map/pins/${editing.id}/images/${imageId}`, { method: "DELETE" });
    setEditing((p) => (p ? { ...p, images: p.images.filter((i) => i.id !== imageId) } : p));
    setPins((prev) =>
      prev.map((p) => (p.id === editing.id ? { ...p, images: p.images.filter((i) => i.id !== imageId) } : p))
    );
  }

  async function deletePin() {
    if (!editing) return;
    const ok = await confirm("Supprimer ce point ?", { danger: true });
    if (!ok) return;
    await fetch(`/api/price-map/pins/${editing.id}`, { method: "DELETE" });
    setPins((prev) => prev.filter((p) => p.id !== editing.id));
    setEditing(null);
  }

  return (
    <div
      ref={mapRef}
      onClick={handleMapClick}
      className={`relative isolate rounded-xl bg-[rgb(var(--bg-base))] border border-white/[0.06] overflow-hidden ${
        canEdit ? "cursor-crosshair" : ""
      }`}
    >
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="Plan" className="block w-full h-auto" draggable={false} />
      ) : (
        <div className="ambient-bg min-h-[520px]" />
      )}

      {pins.map((pin) => {
        // Près d'un bord, l'infobulle centrée/au-dessus déborderait du cadre
        // (coupée par overflow-hidden) — on la recale vers l'intérieur.
        const horizontal = pin.x < 15 ? "left-0 translate-x-0" : pin.x > 85 ? "right-0 left-auto translate-x-0" : "left-1/2 -translate-x-1/2";
        const vertical = pin.y < 15 ? "top-[calc(100%+10px)]" : "-translate-y-[calc(100%+10px)]";

        return (
        <div
          key={pin.id}
          className="absolute group -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${pin.x}%`, top: `${pin.y}%` }}
        >
          <button
            type="button"
            onClick={() => (canEdit ? openEdit(pin) : setViewing(pin))}
            className={`relative flex items-center justify-center w-3.5 h-3.5 rounded-full transition-transform hover:scale-125 ${
              pin.reserved
                ? "bg-[rgb(var(--danger))] shadow-[0_0_12px_rgb(248,113,113)]"
                : pin.price != null
                ? "bg-[rgb(var(--brand-500))] shadow-[0_0_12px_rgb(139,92,246)]"
                : "bg-white/30"
            } ${canEdit ? "cursor-pointer" : "cursor-default"}`}
          />

          <div className={`absolute ${horizontal} ${vertical} opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10`}>
            <div className="glass-strong rounded-lg p-2 text-xs flex flex-col gap-1 items-start">
              {pin.images[0] && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={pin.images[0].url} alt="" className="w-28 h-20 object-cover rounded-md" />
              )}
              <div className="px-1 flex flex-col gap-0.5">
                <span className="font-medium">{pin.label ?? "Villa"}</span>
                {pin.reserved && <span className="text-[rgb(var(--danger))] font-semibold">Réservé</span>}
                <span className="text-[rgb(var(--brand-400))] font-semibold flex items-center gap-1">
                  <Tag size={10} />
                  {pin.price != null ? `$${pin.price.toLocaleString("fr-FR")}` : "Prix non renseigné"}
                </span>
              </div>
            </div>
          </div>
        </div>
        );
      })}

      <p className="absolute bottom-4 left-4 text-xs text-[rgb(var(--muted))]">
        {canEdit ? "Clique n'importe où pour ajouter un point, clique un point pour le modifier" : "Points gris = prix pas encore renseigné"}
      </p>

      {editing && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4" onClick={(e) => e.stopPropagation()}>
          <div className="glass-strong rounded-xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">Modifier le point</h3>
              <button onClick={() => setEditing(null)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
                <X size={16} />
              </button>
            </div>

            <label className="text-xs text-[rgb(var(--muted))] mb-1.5 block flex items-center gap-1.5">
              <ImageIcon size={12} />
              Photos ({editing.images.length})
            </label>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {editing.images.map((img) => (
                <div key={img.id} className="relative group/photo aspect-square">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt=""
                    onClick={() => setLightbox(img.url)}
                    className="w-full h-full object-cover rounded-md cursor-pointer"
                  />
                  {canEdit && (
                    <button
                      onClick={() => deletePhoto(img.id)}
                      className="absolute -top-1 -right-1 bg-[rgb(var(--danger))] text-white rounded-full p-0.5 opacity-0 group-hover/photo:opacity-100 transition-opacity"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              ))}
              {canEdit && (
                <button
                  onClick={() => photoFileRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="aspect-square flex items-center justify-center rounded-md glass text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] disabled:opacity-60"
                >
                  <Plus size={16} />
                </button>
              )}
            </div>
            <input
              ref={photoFileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => addPhoto(e.target.files?.[0])}
            />

            <label className="text-xs text-[rgb(var(--muted))] mb-1.5 block">Nom</label>
            <input
              value={labelInput}
              onChange={(e) => setLabelInput(e.target.value)}
              placeholder="Villa"
              className="glass rounded-lg px-3 py-2 text-sm w-full outline-none mb-3"
            />
            <label className="text-xs text-[rgb(var(--muted))] mb-1.5 block">Prix ($)</label>
            <input
              type="number"
              min="0"
              autoFocus
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="glass rounded-lg px-3 py-2 text-sm w-full outline-none mb-3"
              placeholder="250000"
            />
            <label className="flex items-center justify-between gap-2 mb-4 cursor-pointer">
              <span className="text-xs text-[rgb(var(--muted))]">Réservé</span>
              <button
                type="button"
                onClick={() => setReservedInput((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  reservedInput ? "bg-[rgb(var(--danger))]" : "bg-white/10"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    reservedInput ? "translate-x-4" : "translate-x-0.5"
                  }`}
                />
              </button>
            </label>
            <div className="flex gap-2">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 rounded-xl py-2 text-sm font-medium text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all disabled:opacity-60"
              >
                {saving ? "Enregistrement…" : "Enregistrer"}
              </button>
              <button
                onClick={deletePin}
                title="Supprimer ce point"
                className="rounded-xl px-3 text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger)/0.1)] glass"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        </div>
      )}

      {viewing && (
        <div
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setViewing(null);
          }}
        >
          <div className="glass-strong rounded-xl p-5 w-full max-w-sm max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium">{viewing.label ?? "Villa"}</h3>
              <button onClick={() => setViewing(null)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
                <X size={16} />
              </button>
            </div>

            {viewing.images.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {viewing.images.map((img) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={img.id}
                    src={img.url}
                    alt=""
                    onClick={() => setLightbox(img.url)}
                    className="w-full aspect-square object-cover rounded-md cursor-pointer"
                  />
                ))}
              </div>
            )}

            <div className="flex items-center justify-between">
              {viewing.reserved && <span className="text-sm text-[rgb(var(--danger))] font-semibold">Réservé</span>}
              <span className="text-base text-[rgb(var(--brand-400))] font-semibold flex items-center gap-1.5 ml-auto">
                <Tag size={14} />
                {viewing.price != null ? `$${viewing.price.toLocaleString("fr-FR")}` : "Prix non renseigné"}
              </span>
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/85 p-4"
          onClick={(e) => {
            e.stopPropagation();
            setLightbox(null);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={lightbox} alt="" className="max-w-full max-h-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
