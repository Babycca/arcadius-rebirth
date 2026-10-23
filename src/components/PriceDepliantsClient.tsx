"use client";

import { useMemo, useState } from "react";
import { ChevronDown, GripVertical, Plus, Pencil, Search, Trash2 } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCanEdit } from "@/lib/use-can-edit";

type Item = { id: string; name: string; price: number; type: string | null };
type Group = { id: string; name: string; items: Item[] };

function ItemRow({
  item,
  groupId,
  canEdit,
  editingItem,
  editName,
  setEditName,
  editPrice,
  setEditPrice,
  onStartEdit,
  onSaveEdit,
  onDelete,
}: {
  item: Item;
  groupId: string;
  canEdit: boolean;
  editingItem: string | null;
  editName: string;
  setEditName: (v: string) => void;
  editPrice: string;
  setEditPrice: (v: string) => void;
  onStartEdit: (item: Item) => void;
  onSaveEdit: (groupId: string, id: string) => void;
  onDelete: (groupId: string, id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 py-2 px-2 border-t border-white/[0.04] first:border-0 group"
    >
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] shrink-0 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical size={13} />
        </button>
      )}
      {editingItem === item.id ? (
        <>
          <input value={editName} onChange={(e) => setEditName(e.target.value)} className="glass rounded-lg px-2 py-1 text-sm flex-1 outline-none" />
          <input value={editPrice} onChange={(e) => setEditPrice(e.target.value)} type="number" className="glass rounded-lg px-2 py-1 text-sm w-24 outline-none" />
          <button onClick={() => onSaveEdit(groupId, item.id)} className="text-xs text-[rgb(var(--brand-400))] font-medium px-2">OK</button>
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
              <button onClick={() => onStartEdit(item)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1">
                <Pencil size={12} />
              </button>
              <button onClick={() => onDelete(groupId, item.id)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1">
                <Trash2 size={12} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function PriceDepliantsClient({ initialGroups }: { initialGroups: Group[] }) {
  const { canEdit } = useCanEdit();
  const [groups, setGroups] = useState(initialGroups);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState("");

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function toggle(id: string) {
    setOpenIds((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  }

  const query = search.trim().toLowerCase();
  const isSearching = query.length > 0;
  const displayGroups = useMemo(() => {
    if (!isSearching) return groups;
    return groups
      .map((g) => ({ ...g, items: g.items.filter((it) => it.name.toLowerCase().includes(query)) }))
      .filter((g) => g.items.length > 0);
  }, [groups, isSearching, query]);

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

  function startEdit(item: Item) {
    setEditingItem(item.id);
    setEditName(item.name);
    setEditPrice(String(item.price));
  }

  async function handleGroupDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = groups.findIndex((g) => g.id === active.id);
    const newIndex = groups.findIndex((g) => g.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(groups, oldIndex, newIndex);
    setGroups(reordered);
    await Promise.all(
      reordered.map((g, order) =>
        fetch(`/api/price-groups/${g.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order }),
        })
      )
    );
  }

  async function handleItemDragEnd(groupId: string, e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const oldIndex = group.items.findIndex((it) => it.id === active.id);
    const newIndex = group.items.findIndex((it) => it.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const reorderedItems = arrayMove(group.items, oldIndex, newIndex);
    setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, items: reorderedItems } : g)));
    await Promise.all(
      reorderedItems.map((it, order) =>
        fetch(`/api/price-items/${it.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order }),
        })
      )
    );
  }

  return (
    <div className="flex flex-col gap-3 max-w-4xl mx-auto">
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

      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou mot-clé…"
          className="glass rounded-lg pl-10 pr-3 py-2.5 text-sm w-full outline-none"
        />
      </div>

      <div className="glass-strong rounded-xl overflow-hidden">
        {isSearching && displayGroups.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-[rgb(var(--muted))]">Aucun résultat.</p>
        )}
        {isSearching ? (
          displayGroups.map((group) => (
            <GroupRow
              key={group.id}
              group={group}
              open
              canEdit={canEdit}
              onToggle={toggle}
              onDeleteGroup={deleteGroup}
              editingItem={editingItem}
              editName={editName}
              setEditName={setEditName}
              editPrice={editPrice}
              setEditPrice={setEditPrice}
              onStartEdit={startEdit}
              onSaveEdit={saveItem}
              onDeleteItem={deleteItem}
              sensors={sensors}
              onItemDragEnd={(e) => handleItemDragEnd(group.id, e)}
              addingItemTo={addingItemTo}
              setAddingItemTo={setAddingItemTo}
              itemName={itemName}
              setItemName={setItemName}
              itemPrice={itemPrice}
              setItemPrice2={setItemPrice}
              onAddItem={addItem}
              dragDisabled
            />
          ))
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
            <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
              {groups.map((group) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  open={openIds.includes(group.id)}
                  canEdit={canEdit}
                  onToggle={toggle}
                  onDeleteGroup={deleteGroup}
                  editingItem={editingItem}
                  editName={editName}
                  setEditName={setEditName}
                  editPrice={editPrice}
                  setEditPrice={setEditPrice}
                  onStartEdit={startEdit}
                  onSaveEdit={saveItem}
                  onDeleteItem={deleteItem}
                  sensors={sensors}
                  onItemDragEnd={(e) => handleItemDragEnd(group.id, e)}
                  addingItemTo={addingItemTo}
                  setAddingItemTo={setAddingItemTo}
                  itemName={itemName}
                  setItemName={setItemName}
                  itemPrice={itemPrice}
                  setItemPrice2={setItemPrice}
                  onAddItem={addItem}
                />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function GroupRow({
  group,
  open,
  canEdit,
  onToggle,
  onDeleteGroup,
  editingItem,
  editName,
  setEditName,
  editPrice,
  setEditPrice,
  onStartEdit,
  onSaveEdit,
  onDeleteItem,
  sensors,
  onItemDragEnd,
  addingItemTo,
  setAddingItemTo,
  itemName,
  setItemName,
  itemPrice,
  setItemPrice2,
  onAddItem,
  dragDisabled = false,
}: {
  group: Group;
  open: boolean;
  canEdit: boolean;
  onToggle: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  editingItem: string | null;
  editName: string;
  setEditName: (v: string) => void;
  editPrice: string;
  setEditPrice: (v: string) => void;
  onStartEdit: (item: Item) => void;
  onSaveEdit: (groupId: string, id: string) => void;
  onDeleteItem: (groupId: string, id: string) => void;
  sensors: ReturnType<typeof useSensors>;
  onItemDragEnd: (e: DragEndEvent) => void;
  addingItemTo: string | null;
  setAddingItemTo: (id: string | null) => void;
  itemName: string;
  setItemName: (v: string) => void;
  itemPrice: string;
  setItemPrice2: (v: string) => void;
  onAddItem: (groupId: string) => void;
  dragDisabled?: boolean;
}) {
  const sortable = useSortable({ id: group.id, disabled: dragDisabled });
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = sortable;
  const style = dragDisabled
    ? undefined
    : { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.03] transition-colors"
    >
      <div className="flex items-center gap-1 pl-1 pr-2">
        {canEdit && (
          <button
            {...attributes}
            {...listeners}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] shrink-0 cursor-grab active:cursor-grabbing touch-none p-1"
          >
            <GripVertical size={14} />
          </button>
        )}
        <button onClick={() => onToggle(group.id)} className="flex items-center gap-2.5 flex-1 text-left py-3 px-2">
          <span className="w-1 h-1 rounded-full bg-[rgb(var(--brand-400))] shrink-0" />
          <span className="flex-1 text-sm">{group.name}</span>
          <span className="text-xs text-[rgb(var(--muted))]">{group.items.length}</span>
          <ChevronDown size={14} className={`text-[rgb(var(--muted))] transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {canEdit && (
          <button onClick={() => onDeleteGroup(group.id)} className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-2 shrink-0">
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="bg-black/10 px-3 pb-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onItemDragEnd}>
            <SortableContext items={group.items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
              {group.items.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  groupId={group.id}
                  canEdit={canEdit}
                  editingItem={editingItem}
                  editName={editName}
                  setEditName={setEditName}
                  editPrice={editPrice}
                  setEditPrice={setEditPrice}
                  onStartEdit={onStartEdit}
                  onSaveEdit={onSaveEdit}
                  onDelete={onDeleteItem}
                />
              ))}
            </SortableContext>
          </DndContext>

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
                  onChange={(e) => setItemPrice2(e.target.value)}
                  placeholder="Prix"
                  type="number"
                  className="glass rounded-lg px-2 py-1.5 text-sm w-24 outline-none"
                />
                <button onClick={() => onAddItem(group.id)} className="text-xs rounded-lg px-3 py-1.5 text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))]">
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
}
