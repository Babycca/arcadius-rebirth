import { PageShell, PageHeader } from "@/components/PageShell";
import { prisma } from "@/lib/prisma";
import ReservedZonesMap from "@/components/ReservedZonesMapLoader";

export default async function CarteBiensReservesPage() {
  const zonesTotal = await prisma.reservedZone.count();

  return (
    <PageShell>
      <PageHeader
        title="Carte des biens réservés"
        subtitle={`${zonesTotal} zones — carte interactive`}
      />
      <ReservedZonesMap />
    </PageShell>
  );
}
