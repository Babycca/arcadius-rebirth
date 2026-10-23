import { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import PresenceIndicator from "./PresenceIndicator";

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col md:flex-row flex-1 min-h-screen">
      <Sidebar />
      <main className="flex-1 p-4 md:pl-0">
        <div className="glass rounded-2xl p-6 md:p-8 min-h-[calc(100vh-2rem)]">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
}: {
  title: ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
      <div>
        <h1 className="font-heading text-2xl sm:text-3xl leading-normal pb-1">{title}</h1>
        {subtitle && (
          <p className="text-sm text-[rgb(var(--muted))] mt-1.5">{subtitle}</p>
        )}
      </div>
      <PresenceIndicator />
    </div>
  );
}
