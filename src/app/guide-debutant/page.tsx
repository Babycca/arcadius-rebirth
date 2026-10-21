import { PageShell, PageHeader } from "@/components/PageShell";
import CanvaGuideClient from "@/components/CanvaGuideClient";

export default function GuideDebutantPage() {
  return (
    <PageShell>
      <PageHeader title="Guide du débutant" subtitle="Les bases pour bien démarrer en tant qu'agent." />
      <CanvaGuideClient settingKey="guide-debutant-url" />
    </PageShell>
  );
}
