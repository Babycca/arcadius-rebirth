import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { PageShell } from "@/components/PageShell";
import MesMessagesPrefaitsClient from "@/components/MesMessagesPrefaitsClient";
import { prisma } from "@/lib/prisma";
import { PERSONAL_SECTION } from "@/lib/text-group-access";

export default async function MesMessagesPrefaitsPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;

  const groups = userId
    ? await prisma.textGroup.findMany({
        where: { section: PERSONAL_SECTION, ownerId: userId },
        orderBy: { order: "asc" },
        include: { items: { orderBy: { order: "asc" } } },
      })
    : [];

  return (
    <PageShell>
      <MesMessagesPrefaitsClient initialGroups={groups} />
    </PageShell>
  );
}
