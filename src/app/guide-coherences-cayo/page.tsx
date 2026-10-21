import { PageShell, PageHeader } from "@/components/PageShell";
import CanvaGuideClient from "@/components/CanvaGuideClient";

export default function GuideCoherencesCayoPage() {
  return (
    <PageShell>
      <PageHeader title="Guide des cohérences — Cayo" subtitle="Exemples illustrés de lieux adaptés à chaque catégorie, spécifique à Cayo Perico." />
      <CanvaGuideClient settingKey="guide-coherences-cayo-url" />
    </PageShell>
  );
}
