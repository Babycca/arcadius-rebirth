"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

type Toast = { id: number; message: string; type: "success" | "error" };

const ToastContext = createContext<{
  toast: (message: string, type?: "success" | "error") => void;
} | null>(null);

// Petite confirmation visuelle (coin bas-droit, auto-disparaît) pour les
// actions qui s'enregistrent silencieusement (modifier un téléphone, cocher
// une prime…) — sans elle, impossible de savoir si le clic a vraiment agi.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = nextId.current++;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2500);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[5000] flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="glass-strong rounded-xl px-4 py-2.5 flex items-center gap-2 text-sm shadow-lg animate-[toast-in_0.2s_ease-out]"
          >
            {t.type === "success" ? (
              <CheckCircle2 size={16} className="text-[rgb(var(--success))] shrink-0" />
            ) : (
              <XCircle size={16} className="text-[rgb(var(--danger))] shrink-0" />
            )}
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast doit être utilisé dans un ToastProvider");
  return ctx.toast;
}
