import { PageShell, PageHeader } from "@/components/PageShell";
import PriceDepliantsClient from "@/components/PriceDepliantsClient";
import EditorModeBanner from "@/components/EditorModeBanner";
import { prisma } from "@/lib/prisma";

export default async function PrixFixePage() {
  const groups = await prisma.priceGroup.findMany({
    orderBy: { order: "asc" },
    include: { items: { orderBy: { order: "asc" } } },
  });

  return (
    <PageShell>
      <PageHeader
        title="Prix fixe"
        subtitle={`${groups.length} dépliants — données réelles importées`}
      />
      <EditorModeBanner />
      <PriceDepliantsClient initialGroups={groups} />
    </PageShell>
  );
}
