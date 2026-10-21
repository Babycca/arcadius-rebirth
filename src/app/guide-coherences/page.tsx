import { PageShell, PageHeader } from "@/components/PageShell";
import CanvaGuideClient from "@/components/CanvaGuideClient";

export default function GuideCoherencesPage() {
  return (
    <PageShell>
      <PageHeader title="Guide des cohérences" subtitle="Exemples illustrés de lieux adaptés à chaque catégorie." />
      <CanvaGuideClient settingKey="guide-coherences-url" />
    </PageShell>
  );
}
