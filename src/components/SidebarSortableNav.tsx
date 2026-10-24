"use client";

// Extrait de Sidebar.tsx : regroupe tout ce qui dépend de @dnd-kit, chargé
// uniquement à la demande (voir Sidebar.tsx) — la grande majorité des
// comptes (agents simples, jamais en mode édition) n'ont aucune raison de
// télécharger cette librairie à chaque page.
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { GripVertical, type LucideIcon } from "lucide-react";

type NavEntry = { href: string; icon: LucideIcon; label: string; active: boolean };

function SortableNavItem({
  href,
  icon: Icon,
  label,
  active,
  canEdit,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  canEdit: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: href });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-1">
      {canEdit && (
        <button
          {...attributes}
          {...listeners}
          className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] cursor-grab active:cursor-grabbing shrink-0 touch-none p-1"
        >
          <GripVertical size={13} />
        </button>
      )}
      <Link
        href={href}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all flex-1 min-w-0 ${
          active
            ? "bg-[rgb(var(--brand-500)/0.18)] text-[rgb(var(--brand-400))] font-medium"
            : "text-[rgb(var(--muted))] hover:bg-[rgb(var(--brand-500)/0.1)] hover:text-[rgb(var(--foreground))] hover:shadow-[0_0_16px_rgb(var(--brand-glow)/0.18)]"
        }`}
      >
        <Icon size={17} />
        {label}
      </Link>
    </div>
  );
}

export default function SidebarSortableNav({
  items,
  canEdit,
  onReorder,
}: {
  items: NavEntry[];
  canEdit: boolean;
  onReorder: (hrefs: string[]) => void;
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const hrefs = items.map((n) => n.href);
    const oldIndex = hrefs.indexOf(String(active.id));
    const newIndex = hrefs.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    onReorder(arrayMove(hrefs, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((n) => n.href)} strategy={verticalListSortingStrategy}>
        {items.map(({ href, icon, label, active }) => (
          <SortableNavItem key={href} href={href} icon={icon} label={label} active={active} canEdit={canEdit} />
        ))}
      </SortableContext>
    </DndContext>
  );
}
