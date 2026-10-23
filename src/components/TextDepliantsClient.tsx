"use client";

import { useState } from "react";
import { ChevronDown, GripVertical, Plus, Pencil, Trash2, Copy, Check } from "lucide-react";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useCanEdit } from "@/lib/use-can-edit";
import { renderDiscordText } from "@/lib/discord-markdown";

type Item = { id: string; content: string; price: number | null };
type Group = { id: string; name: string; items: Item[] };

function ItemRow({
  item,
  groupId,
  showPrice,
  canEdit,
  copiedId,
  editingItem,
  editContent,
  setEditContent,
  onCopy,
  onStartEdit,
  onSaveEdit,
  onDelete,
}: {
  item: Item;
  groupId: string;
  showPrice: boolean;
  canEdit: boolean;
  copiedId: string | null;
  editingItem: { groupId: string; id: string } | null;
  editContent: string;
  setEditContent: (v: string) => void;
  onCopy: (id: string, content: string) => void;
  onStartEdit: (groupId: string, item: Item) => void;
  onSaveEdit: (groupId: string, id: string) => void;
  onDelete: (groupId: string, id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 py-2.5 px-2 border-t border-white/[0.04] first:border-0 group"
    >
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] mt-0.5 shrink-0 cursor-grab active:cursor-grabbing touch-none"
        >
          <GripVertical size={13} />
        </button>
      )}
      {editingItem?.id === item.id ? (
        <div className="flex-1 flex gap-2">
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="glass rounded-lg px-2 py-1 text-sm flex-1 outline-none"
            rows={2}
          />
          <button onClick={() => onSaveEdit(groupId, item.id)} className="text-xs text-[rgb(var(--brand-400))] shrink-0">
            OK
          </button>
        </div>
      ) : (
        <>
          <div className="text-sm leading-relaxed flex-1">{renderDiscordText(item.content)}</div>
          {showPrice && item.price != null && (
            <span className="text-sm font-medium text-[rgb(var(--brand-400))] shrink-0">
              ${item.price.toLocaleString("fr-FR")}
            </span>
          )}
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => onCopy(item.id, item.content)}
              className={`p-1.5 rounded-lg transition-colors ${
                copiedId === item.id
                  ? "text-[rgb(var(--success))]"
                  : "text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] hover:bg-white/[0.06]"
              }`}
              title="Copier"
            >
              {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
            </button>
            {canEdit && (
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onStartEdit(groupId, item)}
                  className="text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] p-1.5"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(groupId, item.id)}
                  className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-1.5"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function TextDepliantsClient({
  section,
  initialGroups,
  showPrice = false,
  editableOverride,
}: {
  section: string;
  initialGroups: Group[];
  showPrice?: boolean;
  // Pour les dépliants personnels ("Mes messages préfaits") : l'édition est
  // pilotée par un bouton local (pas le mode édition admin global), donc le
  // parent contrôle directement si c'est modifiable ou non.
  editableOverride?: boolean;
}) {
  const { canEdit: canEditAdmin } = useCanEdit();
  const canEdit = editableOverride !== undefined ? editableOverride : canEditAdmin;
  const [groups, setGroups] = useState(initialGroups);
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [addingItemTo, setAddingItemTo] = useState<string | null>(null);
  const [itemContent, setItemContent] = useState("");
  const [itemPrice, setItemPrice] = useState("");
  const [editingItem, setEditingItem] = useState<{ groupId: string; id: string } | null>(null);
  const [editContent, setEditContent] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function toggle(id: string) {
    setOpenIds((o) => (o.includes(id) ? o.filter((x) => x !== id) : [...o, id]));
  }

  async function copyContent(id: string, content: string) {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId((c) => (c === id ? null : c)), 1500);
    } catch {
      // ignore
    }
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    const res = await fetch("/api/text-groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section, name: newGroupName.trim() }),
    });
    if (res.ok) {
      const group = await res.json();
      setGroups((g) => [...g, group]);
      setNewGroupName("");
    }
  }

  async function deleteGroup(id: string) {
    setGroups((g) => g.filter((x) => x.id !== id));
    await fetch(`/api/text-groups/${id}`, { method: "DELETE" });
  }

  async function addItem(groupId: string) {
    if (!itemContent.trim()) return;
    const res = await fetch("/api/text-items", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId, content: itemContent.trim(), price: itemPrice || undefined }),
    });
    if (res.ok) {
      const item = await res.json();
      setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, items: [...g.items, item] } : g)));
      setItemContent("");
      setItemPrice("");
      setAddingItemTo(null);
    }
  }

  async function saveItem(groupId: string, id: string) {
    const res = await fetch(`/api/text-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editContent }),
    });
    if (res.ok) {
      setGroups((gs) =>
        gs.map((g) =>
          g.id === groupId
            ? { ...g, items: g.items.map((it) => (it.id === id ? { ...it, content: editContent } : it)) }
            : g
        )
      );
      setEditingItem(null);
    }
  }

  async function deleteItem(groupId: string, id: string) {
    setGroups((gs) => gs.map((g) => (g.id === groupId ? { ...g, items: g.items.filter((it) => it.id !== id) } : g)));
    await fetch(`/api/text-items/${id}`, { method: "DELETE" });
  }

  function startEdit(groupId: string, item: Item) {
    setEditingItem({ groupId, id: item.id });
    setEditContent(item.content);
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
        fetch(`/api/text-groups/${g.id}`, {
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
        fetch(`/api/text-items/${it.id}`, {
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

      <div className="glass-strong rounded-xl overflow-hidden">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleGroupDragEnd}>
          <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
            {groups.map((group) => {
              const open = openIds.includes(group.id);
              return (
                <GroupRow
                  key={group.id}
                  group={group}
                  open={open}
                  canEdit={canEdit}
                  showPrice={showPrice}
                  onToggle={toggle}
                  onDeleteGroup={deleteGroup}
                  copiedId={copiedId}
                  editingItem={editingItem}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  onCopy={copyContent}
                  onStartEdit={startEdit}
                  onSaveEdit={saveItem}
                  onDeleteItem={deleteItem}
                  sensors={sensors}
                  onItemDragEnd={(e) => handleItemDragEnd(group.id, e)}
                  addingItemTo={addingItemTo}
                  setAddingItemTo={setAddingItemTo}
                  itemContent={itemContent}
                  setItemContent={setItemContent}
                  itemPrice={itemPrice}
                  setItemPrice={setItemPrice}
                  onAddItem={addItem}
                />
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function GroupRow({
  group,
  open,
  canEdit,
  showPrice,
  onToggle,
  onDeleteGroup,
  copiedId,
  editingItem,
  editContent,
  setEditContent,
  onCopy,
  onStartEdit,
  onSaveEdit,
  onDeleteItem,
  sensors,
  onItemDragEnd,
  addingItemTo,
  setAddingItemTo,
  itemContent,
  setItemContent,
  itemPrice,
  setItemPrice,
  onAddItem,
}: {
  group: Group;
  open: boolean;
  canEdit: boolean;
  showPrice: boolean;
  onToggle: (id: string) => void;
  onDeleteGroup: (id: string) => void;
  copiedId: string | null;
  editingItem: { groupId: string; id: string } | null;
  editContent: string;
  setEditContent: (v: string) => void;
  onCopy: (id: string, content: string) => void;
  onStartEdit: (groupId: string, item: Item) => void;
  onSaveEdit: (groupId: string, id: string) => void;
  onDeleteItem: (groupId: string, id: string) => void;
  sensors: ReturnType<typeof useSensors>;
  onItemDragEnd: (e: DragEndEvent) => void;
  addingItemTo: string | null;
  setAddingItemTo: (id: string | null) => void;
  itemContent: string;
  setItemContent: (v: string) => void;
  itemPrice: string;
  setItemPrice: (v: string) => void;
  onAddItem: (groupId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

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
          <button
            onClick={() => onDeleteGroup(group.id)}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--danger))] p-2 shrink-0"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {open && (
        <div className="bg-black/10 px-3 pb-2 flex flex-col">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onItemDragEnd}>
            <SortableContext items={group.items.map((it) => it.id)} strategy={verticalListSortingStrategy}>
              {group.items.map((it) => (
                <ItemRow
                  key={it.id}
                  item={it}
                  groupId={group.id}
                  showPrice={showPrice}
                  canEdit={canEdit}
                  copiedId={copiedId}
                  editingItem={editingItem}
                  editContent={editContent}
                  setEditContent={setEditContent}
                  onCopy={onCopy}
                  onStartEdit={onStartEdit}
                  onSaveEdit={onSaveEdit}
                  onDelete={onDeleteItem}
                />
              ))}
            </SortableContext>
          </DndContext>

          {canEdit &&
            (addingItemTo === group.id ? (
              <div className="flex flex-col gap-2 px-2 py-2 border-t border-white/[0.04]">
                <textarea
                  autoFocus
                  value={itemContent}
                  onChange={(e) => setItemContent(e.target.value)}
                  placeholder="Message…"
                  className="glass rounded-lg px-2 py-1.5 text-sm outline-none"
                  rows={2}
                />
                {showPrice && (
                  <input
                    value={itemPrice}
                    onChange={(e) => setItemPrice(e.target.value)}
                    placeholder="Prix (optionnel)"
                    type="number"
                    className="glass rounded-lg px-2 py-1.5 text-sm outline-none"
                  />
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => onAddItem(group.id)}
                    className="text-xs rounded-lg px-3 py-1.5 text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))]"
                  >
                    Ajouter
                  </button>
                  <button onClick={() => setAddingItemTo(null)} className="text-xs text-[rgb(var(--muted))]">
                    Annuler
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingItemTo(group.id)}
                className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] px-2 py-2 border-t border-white/[0.04]"
              >
                <Plus size={12} /> Ajouter un message
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
