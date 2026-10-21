"use client";

import { useState } from "react";
import { ChevronDown, GripVertical, Plus, Pencil, Trash2 } from "lucide-react";
import { useCanEdit } from "@/lib/use-can-edit";

type Item = { id: string; name: string; price: number; type: string | null };
type Group = { id: string; name: string; items: Item[] };

export default function PriceDepliantsClient({ initialGroups }: { initialGroups: Group[] }) {
  const { canEdit } = useCanEdit();
  const [groups, setGroups] = useState(initialGroups);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  function toggle(id: string) {
    setOpenIds((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    const res = await fetch("/api/price-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newGroupName.trim() }),
    });
    if (res.ok) {
      const group = await res.json();
      setGroups((g) => [...g, group]);
      setNewGroupName("");
    }
  }

  async function deleteGroup(id: string) {
    setGroups((g) => g.filter((x) => x.id !== id));
    await fetch(`/api/price-groups/${id}`, { method: "DELETE" });
  }

  async function addItem(groupId: string) {
    if (!itemName.trim() || !itemPrice) return;
    const res = await fetch("/api/price-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, name: itemName.trim(), price: Number(itemPrice) }),
    });
    if (res.ok) {
      const item = await res.json();
      setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, items: [...g.items, item] } : g)));
      setItemName("");
      setItemPrice("");
      setAddingItemTo(null);
    }
  }

  async function saveItem(groupId: string, id: string) {
    const res = await fetch(`/api/price-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, price: Number(editPrice) }),
    });
    if (res.ok) {
      setGroups((gs) =>
        gs.map((g) =>
          g.id === groupId
            ? { ...g, items: g.items.map((it) => (it.id === id ? { ...it, name: editName, price: Number(editPrice) } : it)) }
            : g
        )
      );
      setEditingItem(null);
    }
  }

  async function deleteItem(groupId: string, id: string) {
    setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, items: g.items.filter((it) => it.id !== id) } : g)));
    await fetch(`/api/price-items/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {canEdit && (
        <div className="flex gap-2 mb-1">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && createGroup()}
            placeholder="Nom du nouveau dépliant"
            className="glass rounded-lg px-3 py-2 text-sm flex-1 outline-none"
          />
          <button
            onClick={createGroup}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all"
          >
            <Plus size={14} /> Dépliant
          </button>
        </div>
      )}

      <div className="glass-strong rounded-xl overflow-hidden">
        {groups.map((group) => {
          const open = openIds.includes(group.id);
          return (
            <div key={group.id} className="border-b border-white/[0.06] last:border-0">
              <div className="flex items-center gap-1 pl-1 pr-2">
                {canEdit && <GripVertical size={14} className="text-[rgb(var(--muted))] shrink-0" />}
                <button
                  onClick={() => toggle(group.id)}
                  className="flex items-center gap-2.5 flex-1 text-left py-3 px-2 hover:bg-white/[0.02] transition-colors"
                >
                  <span className="w-1 h-1 rounded-full bg-[rgb(var(--brand-400))] shrink-0" />
                  <span className="flex-1 text-sm">{group.name}</span>
                  <span className="text-xs text-[rgb(var(--muted))]">{group.items.length}</span>
                  <ChevronDown size={14} className={`text-[rgb(var(--muted))] transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
                {canEdit && (
                  <button onClick={() => deleteGroup(group.id)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-2 shrink-0">
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

              {open && (
                <div className="bg-black/10 px-3 pb-2">
                  {group.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 py-2 px-2 border-t border-white/[0.04] first:border-0 group">
                      {canEdit && <GripVertical size={13} className="text-[rgb(var(--muted))] shrink-0" />}
                      {editingItem === item.id ? (
                        <>
                          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="glass rounded-lg px-2 py-1 text-sm flex-1 outline-none" />
                          <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} type="number" className="glass rounded-lg px-2 py-1 text-sm w-24 outline-none" />
                          <button onClick={() => saveItem(group.id, item.id)} className="text-xs text-[rgb(var(--brand-400))] font-medium px-2">OK</button>
                        </>
                      ) : (
                        <>
                          <span className="flex-1 text-sm text-[rgb(var(--muted))]">{item.name}</span>
                          {item.type && (
                            <span className="text-[10px] text-[rgb(var(--muted))] border border-white/[0.08] rounded px-1.5 py-0.5">
                              {item.type}
                            </span>
                          )}
                          <span className="text-sm font-medium text-[rgb(var(--brand-400))]">
                            ${item.price.toLocaleString("fr-FR")}
                          </span>
                          {canEdit && (
                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => {
                                  setEditingItem(item.id);
                                  setEditName(item.name);
                                  setEditPrice(String(item.price));
                                }}
                                className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1"
                              >
                                <Pencil size={12} />
                              </button>
                              <button onClick={() => deleteItem(group.id, item.id)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1">
                                <Trash2 size={12} />
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}

                  {canEdit &&
                    (addingItemTo === group.id ? (
                      <div className="flex gap-2 px-2 py-2 border-t border-white/[0.04]">
                        <input
                          autoFocus
                          value={itemName}
                          onChange={(e) => setItemName(e.target.value)}
                          placeholder="Nom"
                          className="glass rounded-lg px-2 py-1.5 text-sm flex-1 outline-none"
                        />
                        <input
                          value={itemPrice}
                          onChange={(e) => setItemPrice(e.target.value)}
                          placeholder="Prix"
                          type="number"
                          className="glass rounded-lg px-2 py-1.5 text-sm w-24 outline-none"
                        />
                        <button onClick={() => addItem(group.id)} className="text-xs rounded-lg px-3 py-1.5 text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))]">
                          OK
                        </button>
                        <button onClick={() => setAddingItemTo(null)} className="text-xs text-[rgb(var(--muted))]">
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingItemTo(group.id)}
                        className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] px-2 py-2"
                      >
                        <Plus size={12} /> Ajouter un prix
                      </button>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
