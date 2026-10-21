import { PageShell, PageHeader } from "@/components/PageShell";
import EstimationWizard from "@/components/EstimationWizard";
import EstimationAdminClient from "@/components/EstimationAdminClient";
import EditorModeBanner from "@/components/EditorModeBanner";
import EstimationModeSwitch from "@/components/EstimationModeSwitch";
import { prisma } from "@/lib/prisma";

export default async function EstimationPage() {
  const profiles = await prisma.estimationProfile.findMany({
    orderBy: [{ structureType: "asc" }, { order: "asc" }],
    include: {
      criteria: { orderBy: { order: "asc" }, include: { options: { orderBy: { order: "asc" } } } },
      interiorGroups: { orderBy: { order: "asc" }, include: { items: { orderBy: { order: "asc" } } } },
    },
  });

  return (
    <PageShell>
      <PageHeader title="Estimation" subtitle="Calculateur de prix immobilier" />
      <EditorModeBanner />
      <EstimationModeSwitch
        wizard={<EstimationWizard />}
        admin={<EstimationAdminClient initialProfiles={profiles} />}
      />
    </PageShell>
  );
}
