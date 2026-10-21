import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFromR2 } from "@/lib/r2";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; imageId: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || (role !== "ADMIN" && role !== "SUPER_ADMIN")) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  const { imageId } = await params;
  const existing = await prisma.priceMapPinImage.findUnique({ where: { id: imageId } });
  await prisma.priceMapPinImage.delete({ where: { id: imageId } });
  if (existing) await deleteFromR2(existing.url);
  return NextResponse.json({ ok: true });
}
