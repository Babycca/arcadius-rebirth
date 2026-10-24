"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AlertTriangle, Info } from "lucide-react";

type ConfirmOptions = { title?: string; confirmLabel?: string; cancelLabel?: string; danger?: boolean };
type AlertOptions = { title?: string };

type DialogState =
  | { kind: "confirm"; message: string; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "alert"; message: string; options: AlertOptions; resolve: () => void }
  | null;

const DialogContext = createContext<{
  confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  alertDialog: (message: string, options?: AlertOptions) => Promise<void>;
} | null>(null);

// Remplace window.confirm()/alert() par de vraies fenêtres habillées au
// design de l'app (glass-strong), montées une seule fois à la racine.
export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(null);

  const confirm = useCallback((message: string, options: ConfirmOptions = {}) => {
    return new Promise<boolean>((resolve) => {
      setState({ kind: "confirm", message, options, resolve });
    });
  }, []);

  const alertDialog = useCallback((message: string, options: AlertOptions = {}) => {
    return new Promise<void>((resolve) => {
      setState({ kind: "alert", message, options, resolve: () => resolve() });
    });
  }, []);

  function respond(result?: boolean) {
    if (!state) return;
    if (state.kind === "confirm") state.resolve(Boolean(result));
    else state.resolve();
    setState(null);
  }

  return (
    <DialogContext.Provider value={{ confirm, alertDialog }}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center bg-black/60 p-4">
          <div className="glass-popover border border-white/10 rounded-2xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-2 mb-3">
              {state.kind === "confirm" && (state.options as ConfirmOptions).danger ? (
                <AlertTriangle size={18} className="text-[rgb(var(--danger))]" />
              ) : (
                <Info size={18} className="text-[rgb(var(--brand-400))]" />
              )}
              <h2 className="font-heading text-lg">
                {state.options.title ?? (state.kind === "confirm" ? "Confirmation" : "Information")}
              </h2>
            </div>
            <p className="text-sm text-[rgb(var(--muted))] mb-5 whitespace-pre-line">{state.message}</p>
            {state.kind === "confirm" ? (
              <div className="flex gap-2">
                <button
                  onClick={() => respond(true)}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-medium text-white transition-all hover:brightness-110 ${
                    (state.options as ConfirmOptions).danger
                      ? "bg-gradient-to-r from-[rgb(var(--danger))] to-red-700"
                      : "bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))]"
                  }`}
                >
                  {(state.options as ConfirmOptions).confirmLabel ?? "Confirmer"}
                </button>
                <button
                  onClick={() => respond(false)}
                  className="flex-1 rounded-xl py-2.5 text-sm text-[rgb(var(--muted))] hover:text-[rgb(var(--foreground))] glass"
                >
                  {(state.options as ConfirmOptions).cancelLabel ?? "Annuler"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => respond()}
                className="w-full rounded-xl py-2.5 text-sm font-medium text-white bg-gradient-to-r from-[rgb(var(--brand-500))] to-[rgb(var(--brand-600))] hover:brightness-110 transition-all"
              >
                OK
              </button>
            )}
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog doit être utilisé dans un DialogProvider");
  return ctx;
}
