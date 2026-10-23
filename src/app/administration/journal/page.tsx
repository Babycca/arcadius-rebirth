"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, PageHeader } from "@/components/PageShell";
import { useCanEdit } from "@/lib/use-can-edit";
import { useDialog } from "@/components/DialogProvider";
import { useToast } from "@/components/ToastProvider";
import { ArrowLeft, ChevronLeft, ChevronRight, PlusCircle, Pencil, Trash2, LogIn, Eraser, Search } from "lucide-react";
import LabeledSelect from "@/components/LabeledSelect";

type LogRow = {
  id: string;
  actorName: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "LOGIN";
  entityType: string;
  summary: string;
  createdAt: string;
};

const ACTION_STYLE: Record<LogRow["action"], { icon: typeof PlusCircle; color: string; label: string }> = {
  CREATE: { icon: PlusCircle, color: "text-[rgb(var(--success))]", label: "Création" },
  UPDATE: { icon: Pencil, color: "text-[rgb(var(--brand-400))]", label: "Modification" },
  DELETE: { icon: Trash2, color: "text-[rgb(var(--danger))]", label: "Suppression" },
  LOGIN: { icon: LogIn, color: "text-[rgb(var(--muted))]", label: "Connexion" },
};

export default function AuditLogPage() {
  const { isAdmin } = useCanEdit();
  const { confirm } = useDialog();
  const toast = useToast();
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actorInput, setActorInput] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [clearing, setClearing] = useState(false);
  const pageSize = 50;

  function load() {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (actionFilter) params.set("action", actionFilter);
    if (entityFilter) params.set("entityType", entityFilter);
    if (actorFilter) params.set("actor", actorFilter);
    fetch(`/api/audit-log?${params}`).then(async (res) => {
      if (res.status === 403) {
        setForbidden(true);
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLogs(data.logs);
      setTotal(data.total);
      setEntityTypes(data.entityTypes);
      setLoading(false);
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, actionFilter, entityFilter, actorFilter]);

  useEffect(() => {
    setPage(0);
  }, [actionFilter, entityFilter, actorFilter]);

  // Débounce : évite un appel réseau à chaque frappe pendant la recherche.
  useEffect(() => {
    const t = setTimeout(() => setActorFilter(actorInput), 350);
    return () => clearTimeout(t);
  }, [actorInput]);

  async function handleClear() {
    const ok = await confirm("Vider tout le journal d'activité ? Cette action est irréversible.", {
      danger: true,
      confirmLabel: "Vider",
    });
    if (!ok) return;
    setClearing(true);
    const res = await fetch("/api/audit-log", { method: "DELETE" });
    setClearing(false);
    if (res.ok) {
      toast("Journal vidé.");
      load();
    } else {
      toast("Échec de la suppression.", "error");
    }
  }

  if (forbidden || !isAdmin) {
    return (
      <PageShell>
        <PageHeader title="Journal d'activité" subtitle="Accès réservé aux administrateurs" />
        <p className="text-sm text-[rgb(var(--muted))]">Tu n&apos;as pas accès à cette page.</p>
      </PageShell>
    );
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageShell>
      <Link
        href="/administration"
        className="flex items-center gap-1.5 text-xs text-[rgb(var(--muted))] hover:text-[rgb(var(--brand-400))] mb-3"
      >
        <ArrowLeft size={13} />
        Administration
      </Link>
      <PageHeader title="Journal d'activité" subtitle={`${total} action${total > 1 ? "s" : ""} enregistrée${total > 1 ? "s" : ""}`} />

      <div className="flex gap-2 mb-4 flex-wrap items-center justify-between">
        <div className="flex gap-2 flex-wrap items-center">
          <LabeledSelect
            value={actionFilter}
            onChange={setActionFilter}
            options={[
              { value: "", label: "Toutes les actions" },
              { value: "CREATE", label: "Créations" },
              { value: "UPDATE", label: "Modifications" },
              { value: "DELETE", label: "Suppressions" },
              { value: "LOGIN", label: "Connexions" },
            ]}
          />
          <LabeledSelect
            value={entityFilter}
            onChange={setEntityFilter}
            options={[{ value: "", label: "Tous les types" }, ...entityTypes.map((t) => ({ value: t, label: t }))]}
          />
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[rgb(var(--muted))]" />
            <input
              value={actorInput}
              onChange={(e) => setActorInput(e.target.value)}
              placeholder="Chercher une personne…"
              className="glass rounded-lg pl-9 pr-3 py-2 text-sm outline-none w-48"
            />
          </div>
        </div>
        <button
          onClick={handleClear}
          disabled={clearing}
          className="flex items-center gap-1.5 text-xs text-[rgb(var(--danger))] hover:bg-[rgb(var(--danger)/0.1)] rounded-lg px-3 py-2 disabled:opacity-60"
        >
          <Eraser size={13} />
          {clearing ? "Suppression…" : "Vider le journal"}
        </button>
      </div>

      <div className="card-hover glass-strong rounded-xl overflow-hidden border border-transparent">
        {loading ? (
          <p className="px-4 py-6 text-center text-sm text-[rgb(var(--muted))]">Chargement…</p>
        ) : logs.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-[rgb(var(--muted))]">Aucune action enregistrée.</p>
        ) : (
          <div className="flex flex-col">
            {logs.map((log) => {
              const style = ACTION_STYLE[log.action];
              const Icon = style.icon;
              return (
                <div
                  key={log.id}
                  className="flex items-start gap-3 px-4 py-3 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.03] transition-colors"
                >
                  <Icon size={15} className={`${style.color} shrink-0 mt-0.5`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{log.summary}</p>
                    <p className="text-xs text-[rgb(var(--muted))] mt-0.5">
                      {new Date(log.createdAt).toLocaleString("fr-FR")} — {log.entityType}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] disabled:opacity-30 p-1.5"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-xs text-[rgb(var(--muted))]">
            Page {page + 1} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] disabled:opacity-30 p-1.5"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </PageShell>
  );
}
