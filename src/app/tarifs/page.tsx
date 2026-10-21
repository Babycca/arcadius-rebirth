import { PageShell, PageHeader } from "@/components/PageShell";
import { prisma } from "@/lib/prisma";
import TarifPhotosClient from "@/components/TarifPhotosClient";

export default async function TarifsPage() {
  const photos = await prisma.tarifPhoto.findMany({ orderBy: { order: "asc" } });

  return (
    <PageShell>
      <PageHeader title="Tarifs" subtitle={`${photos.length} photo${photos.length > 1 ? "s" : ""} — grille tarifaire`} />
      <TarifPhotosClient initialPhotos={photos} />
    </PageShell>
  );
}
