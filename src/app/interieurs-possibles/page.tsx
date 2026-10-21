import { PageShell, PageHeader } from "@/components/PageShell";
import TextDepliantsClient from "@/components/TextDepliantsClient";
import InteriorsByPriceClient from "@/components/InteriorsByPriceClient";
import EditorModeBanner from "@/components/EditorModeBanner";
import { prisma } from "@/lib/prisma";

export default async function InterieursPossiblesPage() {
  const groups = await prisma.textGroup.findMany({
    where: { section: "interieurs" },
    orderBy: { order: "asc" },
    include: { items: { orderBy: { order: "asc" } } },
  });

  return (
    <PageShell>
      <PageHeader
        title="Intérieurs possibles"
        subtitle={`${groups.length} dépliants — messages préfaits`}
      />
      <EditorModeBanner />
      <InteriorsByPriceClient groups={groups} />
      <TextDepliantsClient section="interieurs" initialGroups={groups} showPrice />
    </PageShell>
  );
}
