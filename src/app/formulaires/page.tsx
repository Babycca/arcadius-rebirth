import { PageShell, PageHeader } from "@/components/PageShell";
import TextDepliantsClient from "@/components/TextDepliantsClient";
import EditorModeBanner from "@/components/EditorModeBanner";
import { prisma } from "@/lib/prisma";

export default async function FormulairesPage() {
  const groups = await prisma.textGroup.findMany({
    where: { section: "formulaires" },
    orderBy: { order: "asc" },
    include: { items: { orderBy: { order: "asc" } } },
  });

  return (
    <PageShell>
      <PageHeader title="Formulaires" subtitle={`${groups.length} dépliants — messages préfaits`} />
      <EditorModeBanner />
      <TextDepliantsClient section="formulaires" initialGroups={groups} />
    </PageShell>
  );
}
