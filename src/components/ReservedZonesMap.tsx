"use client";

import { useEffect, useRef, useState } from "react";
import type L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import { X } from "lucide-react";
import {
  categoryFor,
  getCategoryTextColor,
  MAP_CONFIG,
  type ReservedZoneCategory,
} from "@/lib/reserved-zone-categories";
import { useCanEdit } from "@/lib/use-can-edit";

type ZoneRecord = {
  id: string;
  name: string;
  categoryId: string;
  geometry: string;
  photoUrl: string | null;
};

type ZoneFormData = { name: string; categoryId: string; photoFile: File | null; removePhoto: boolean };
type FormModalState = { mode: "create"; defaultCategoryId: string } | { mode: "edit"; zone: ZoneRecord } | null;

function ZoneFormModal({
  state,
  categories,
  onClose,
  onSave,
}: {
  state: FormModalState;
  categories: ReservedZoneCategory[];
  onClose: () => void;
  onSave: (data: ZoneFormData) => Promise<void>;
}) {
  const initial = state?.mode === "edit" ? state.zone : null;
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryId, setCategoryId] = useState(
    initial?.categoryId ?? (state?.mode === "create" ? state.defaultCategoryId : categories[0]?.id ?? "")
  );
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!state) return null;

  const currentPhotoUrl = initial?.photoUrl ?? null;
  const showCurrentPhoto = currentPhotoUrl && !removePhoto && !photoFile;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Le nom est obligatoire.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ name: name.trim(), categoryId, photoFile, removePhoto });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "Enregistrement impossible.");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading text-lg">{state.mode === "create" ? "Nouvelle zone" : "Modifier cette zone"}</h2>
          <button onClick={onClose} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))]">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && (
            <div className="rounded-lg bg-[rgb(var(--danger)/0.12)] text-[rgb(var(--danger))] text-xs px-3 py-2">{error}</div>
          )}

          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1.5 block">Nom</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex : Villa Enchères"
              className="glass rounded-lg px-3 py-2 text-sm w-full outline-none"
            />
          </div>

          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1.5 block">Catégorie</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="glass rounded-lg px-3 py-2 text-sm w-full outline-none bg-transparent"
              style={{ colorScheme: "dark" }}
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id} style={{ backgroundColor: "rgb(22 18 32)" }}>
                  {cat.emoji} {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-[rgb(var(--muted))] mb-1.5 block">Photo (facultatif)</label>
            {showCurrentPhoto && (
              <div className="relative mb-2 inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={currentPhotoUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
                <button
                  type="button"
                  onClick={() => setRemovePhoto(true)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/80 text-[rgb(var(--danger))]"
                  title="Retirer la photo"
                >
                  <X size={13} />
                </button>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                setPhotoFile(e.target.files?.[0] ?? null);
                setRemovePhoto(false);
              }}
              className="text-xs text-[rgb(var(--muted))] w-full"
            />
          </div>

          <div className="flex justify-end gap-2 mt-1">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm glass">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] disabled:opacity-60"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmDeleteModal({
  zoneName,
  onClose,
  onConfirm,
}: {
  zoneName: string | null;
  onClose: () => void;
  onConfirm: () => void;
}) {
  if (!zoneName) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 p-4">
      <div className="glass-strong rounded-2xl p-6 w-full max-w-sm">
        <h2 className="font-heading text-lg mb-3">Confirmation</h2>
        <p className="text-sm text-[rgb(var(--muted))]">Supprimer définitivement « {zoneName} » ?</p>
        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm glass">
            Annuler
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-[rgb(var(--danger))]"
          >
            Supprimer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ReservedZonesMap() {
  const { canEdit } = useCanEdit();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const layersRef = useRef<Record<string, L.LayerGroup> | null>(null);
  const activeCategoryRef = useRef<string>("");
  const [categories, setCategories] = useState<ReservedZoneCategory[]>([]);
  const categoriesRef = useRef<ReservedZoneCategory[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [hidden, setHidden] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [formModal, setFormModal] = useState<FormModalState>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ zone: ZoneRecord } | null>(null);

  const saveHandlerRef = useRef<((data: ZoneFormData) => Promise<void>) | null>(null);
  const deleteHandlerRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    fetch("/api/zone-categories")
      .then((r) => r.json())
      .then((data: ReservedZoneCategory[]) => {
        setCategories(data);
        categoriesRef.current = data;
        if (data[0]) {
          setActiveCategory(data[0].id);
          activeCategoryRef.current = data[0].id;
        }
      });
  }, []);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!map || !layers) return;
    categories.forEach((cat) => {
      const group = layers[cat.id];
      if (!group) return;
      const shouldShow = !hidden.includes(cat.id);
      if (shouldShow && !map.hasLayer(group)) map.addLayer(group);
      if (!shouldShow && map.hasLayer(group)) map.removeLayer(group);
    });
  }, [hidden, categories]);

  useEffect(() => {
    if (categories.length === 0) return;
    let cancelled = false;

    async function init() {
      const leaflet = await import("leaflet");
      const L = leaflet.default;
      if (canEdit) await import("leaflet-draw");
      if (cancelled || !containerRef.current || mapRef.current) return;

      const bounds: L.LatLngBoundsExpression = [
        [0, 0],
        [MAP_CONFIG.height, MAP_CONFIG.width],
      ];

      const map = L.map(containerRef.current, {
        crs: L.CRS.Simple,
        minZoom: -4,
        maxZoom: 3,
        zoomSnap: 0.25,
      });
      mapRef.current = map;

      L.imageOverlay(MAP_CONFIG.imageUrl, bounds).addTo(map);
      map.fitBounds(bounds);

      const layers: Record<string, L.LayerGroup> = {};
      categories.forEach((cat) => {
        const group = L.layerGroup().addTo(map);
        layers[cat.id] = group;
      });
      layersRef.current = layers;

      const drawnItems = new L.FeatureGroup().addTo(map);

      function getCategoryByIdLocal(id: string): ReservedZoneCategory {
        return categoriesRef.current.find((c) => c.id === id) ?? categoriesRef.current[0];
      }

      function iconForCategory(cat: ReservedZoneCategory) {
        return L.divIcon({
          html: `<div style="width:14px;height:14px;border-radius:999px;background:${cat.color};box-shadow:0 0 10px ${cat.color}"></div>`,
          className: "",
          iconSize: [14, 14],
          iconAnchor: [7, 7],
          popupAnchor: [0, -7],
        });
      }

      function styleForCategory(cat: ReservedZoneCategory) {
        return { color: cat.color, weight: 2.5, fillColor: cat.color, fillOpacity: 0.25 };
      }

      function applyCategoryLook(layer: L.Layer, cat: ReservedZoneCategory) {
        if (layer instanceof L.Marker) layer.setIcon(iconForCategory(cat));
        else (layer as L.Path).setStyle(styleForCategory(cat));
      }

      type LeafletWithDraw = typeof L & {
        Control: typeof L.Control & { Draw: new (options: unknown) => L.Control };
        Draw: { Event: { CREATED: string } };
      };
      const LD = L as LeafletWithDraw;

      if (canEdit) {
        const drawControl = new LD.Control.Draw({
          position: "topleft",
          draw: {
            polygon: { allowIntersection: false, showArea: true },
            rectangle: {},
            circle: {},
            marker: {},
            polyline: false,
            circlemarker: false,
          },
          edit: { featureGroup: drawnItems, remove: true },
        });
        map.addControl(drawControl);
      }

      function openLightbox(src: string, alt: string) {
        const overlay = document.createElement("div");
        overlay.style.cssText =
          "position:fixed;inset:0;z-index:2100;background:rgba(8,6,14,0.85);display:flex;align-items:center;justify-content:center;cursor:zoom-out;";
        const img = document.createElement("img");
        img.src = src;
        img.alt = alt;
        img.style.cssText = "max-width:90vw;max-height:90vh;border-radius:12px;";
        overlay.appendChild(img);
        overlay.addEventListener("click", () => overlay.remove());
        document.body.appendChild(overlay);
      }

      function buildPopup(layer: L.Layer, zone: ZoneRecord) {
        const cat = getCategoryByIdLocal(zone.categoryId);
        const container = document.createElement("div");
        container.style.cssText = "font-family:inherit;min-width:160px;";

        const tag = document.createElement("span");
        tag.textContent = `${cat.emoji} ${cat.name}`;
        tag.style.cssText = `display:inline-block;background:${cat.color};color:${getCategoryTextColor(
          cat.color
        )};font-size:11px;font-weight:600;padding:2px 8px;border-radius:999px;margin-bottom:6px;`;
        container.appendChild(tag);

        const title = document.createElement("h3");
        title.textContent = zone.name;
        title.style.cssText = "margin:0 0 6px;font-size:14px;font-weight:600;color:#0a0810;";
        container.appendChild(title);

        if (zone.photoUrl) {
          const img = document.createElement("img");
          img.src = zone.photoUrl;
          img.alt = zone.name;
          img.style.cssText = "width:100%;max-width:220px;border-radius:8px;cursor:zoom-in;display:block;";
          img.addEventListener("click", () => openLightbox(zone.photoUrl as string, zone.name));
          container.appendChild(img);
        }

        if (canEdit) {
          const actions = document.createElement("div");
          actions.style.cssText = "display:flex;gap:6px;margin-top:8px;";

          const editBtn = document.createElement("button");
          editBtn.type = "button";
          editBtn.textContent = "✏️ Modifier";
          editBtn.style.cssText =
            "font-size:11px;padding:4px 8px;border-radius:6px;background:#f1f5f9;border:none;cursor:pointer;";
          editBtn.addEventListener("click", () => {
            saveHandlerRef.current = async (data: ZoneFormData) => {
              const formData = new FormData();
              formData.set("name", data.name);
              formData.set("categoryId", data.categoryId);
              formData.set("geometry", zone.geometry);
              formData.set("removePhoto", String(data.removePhoto));
              if (data.photoFile) formData.set("photo", data.photoFile);

              const res = await fetch(`/api/zones/${zone.id}`, { method: "PUT", body: formData });
              if (!res.ok) {
                const body = await res.json().catch(() => null);
                throw new Error(body?.error || "Modification impossible.");
              }
              const updated: ZoneRecord = await res.json();

              const oldCat = getCategoryByIdLocal(zone.categoryId);
              const newCat = getCategoryByIdLocal(updated.categoryId);
              if (oldCat.id !== newCat.id) {
                layers[oldCat.id].removeLayer(layer);
                layers[newCat.id].addLayer(layer);
              }
              applyCategoryLook(layer, newCat);

              Object.assign(zone, updated);
              buildPopup(layer, updated);
              layer.openPopup();
            };
            setFormModal({ mode: "edit", zone });
          });
          actions.appendChild(editBtn);

          const deleteBtn = document.createElement("button");
          deleteBtn.type = "button";
          deleteBtn.textContent = "🗑️ Supprimer";
          deleteBtn.style.cssText =
            "font-size:11px;padding:4px 8px;border-radius:6px;background:#fee2e2;color:#dc2626;border:none;cursor:pointer;";
          deleteBtn.addEventListener("click", () => {
            deleteHandlerRef.current = async () => {
              const res = await fetch(`/api/zones/${zone.id}`, { method: "DELETE" });
              if (!res.ok) {
                alert("Suppression impossible.");
                return;
              }
              drawnItems.removeLayer(layer);
              Object.values(layers).forEach((g) => g.removeLayer(layer));
            };
            setConfirmDelete({ zone });
          });
          actions.appendChild(deleteBtn);

          container.appendChild(actions);
        }

        (layer as L.Layer & { bindPopup: (c: HTMLElement, o?: object) => void }).bindPopup(container, {
          maxWidth: canEdit ? 260 : 440,
        });
      }

      async function loadZones() {
        try {
          const res = await fetch("/api/zones");
          const zones: ZoneRecord[] = await res.json();
          zones.forEach((zone) => {
            try {
              const feature = JSON.parse(zone.geometry);
              const cat = getCategoryByIdLocal(zone.categoryId);
              const geoLayer = L.geoJSON(feature, {
                style: () => styleForCategory(cat),
                pointToLayer: (_, latlng) => L.marker(latlng, { icon: iconForCategory(cat) }),
              }).getLayers()[0];
              if (canEdit) drawnItems.addLayer(geoLayer);
              layers[cat.id].addLayer(geoLayer);
              buildPopup(geoLayer, zone);
            } catch {
              // zone illisible, ignorée
            }
          });
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
      loadZones();

      if (canEdit) {
        map.on(LD.Draw.Event.CREATED, (e: unknown) => {
          const layer = (e as { layer: L.Layer & { toGeoJSON: () => unknown } }).layer;
          const cat = getCategoryByIdLocal(activeCategoryRef.current);
          const geometry = JSON.stringify(layer.toGeoJSON());
          applyCategoryLook(layer, cat);

          saveHandlerRef.current = async (data: ZoneFormData) => {
            const formData = new FormData();
            formData.set("name", data.name);
            formData.set("categoryId", data.categoryId);
            formData.set("geometry", geometry);
            if (data.photoFile) formData.set("photo", data.photoFile);

            const res = await fetch("/api/zones", { method: "POST", body: formData });
            if (!res.ok) {
              const body = await res.json().catch(() => null);
              throw new Error(body?.error || "Impossible d'enregistrer cette zone.");
            }
            const zone: ZoneRecord = await res.json();

            const finalCat = getCategoryByIdLocal(zone.categoryId);
            applyCategoryLook(layer, finalCat);
            drawnItems.addLayer(layer);
            layers[finalCat.id].addLayer(layer);
            buildPopup(layer, zone);
          };
          setFormModal({ mode: "create", defaultCategoryId: cat.id });
        });
      }
    }

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [categories, canEdit]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const isHidden = hidden.includes(cat.id);
          const isActiveForDraw = canEdit && activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                if (canEdit) setActiveCategory(cat.id);
                setHidden((h) => (isHidden ? h.filter((id) => id !== cat.id) : h));
              }}
              onDoubleClick={() => setHidden((h) => (h.includes(cat.id) ? h.filter((id) => id !== cat.id) : [...h, cat.id]))}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                isActiveForDraw ? "ring-2 ring-white/60" : ""
              }`}
              style={
                isHidden
                  ? { background: "rgba(255,255,255,0.05)", color: "rgb(var(--muted))" }
                  : { background: cat.color, color: getCategoryTextColor(cat.color) }
              }
              title={canEdit ? "Clic = catégorie active pour dessiner, double-clic = masquer" : "Double-clic pour masquer"}
            >
              <span>{cat.emoji}</span>
              {cat.name}
            </button>
          );
        })}
      </div>

      <div className="relative h-[75vh] min-h-[500px] w-full overflow-hidden rounded-xl border border-white/[0.08]">
        <div ref={containerRef} className="h-full w-full" style={{ background: "#143D6B" }} />

        {loading && (
          <div className="absolute inset-0 z-[999] flex items-center justify-center bg-[rgb(var(--bg-base))]/60 text-sm">
            Chargement de la carte…
          </div>
        )}
      </div>

      <ZoneFormModal
        key={formModal ? (formModal.mode === "edit" ? `edit-${formModal.zone.id}` : "create") : "closed"}
        state={formModal}
        categories={categories}
        onClose={() => setFormModal(null)}
        onSave={async (data) => {
          await saveHandlerRef.current?.(data);
          setFormModal(null);
        }}
      />
      <ConfirmDeleteModal
        zoneName={confirmDelete?.zone.name ?? null}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => {
          deleteHandlerRef.current?.();
        }}
      />
    </div>
  );
}
