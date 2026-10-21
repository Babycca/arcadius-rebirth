import { PageShell, PageHeader } from "@/components/PageShell";
import { prisma } from "@/lib/prisma";
import PriceMapClient from "@/components/PriceMapClient";

export default async function CartePrixVillasPage() {
  const [config, pins] = await Promise.all([
    prisma.priceMapConfig.findUnique({ where: { id: 1 } }),
    prisma.priceMapPin.findMany({ include: { images: { orderBy: { order: "asc" } } } }),
  ]);

  const withPrice = pins.filter((p) => p.price != null).length;

  return (
    <PageShell>
      <PageHeader
        title="Carte des prix des villas"
        subtitle={`${pins.length} villas — ${withPrice} avec un prix renseigné`}
      />
      <PriceMapClient imageUrl={config?.imageUrl ?? null} initialPins={pins} />
    </PageShell>
  );
}
