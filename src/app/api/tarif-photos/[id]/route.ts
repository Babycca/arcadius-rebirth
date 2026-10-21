import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compressImage } from "@/lib/compress-image";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

// Remplace l'image d'une photo existante (garde sa place dans l'ordre).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Image requise." }, { status: 400 });
  }

  const existing = await prisma.tarifPhoto.findUnique({ where: { id } });

  const { buffer, ext } = await compressImage(Buffer.from(await file.arrayBuffer()), { maxWidth: 1800, quality: 85 });
  const fileName = `tarif-${Date.now()}.${ext}`;
  const url = await uploadToR2(`tarifs/${fileName}`, buffer);

  const photo = await prisma.tarifPhoto.update({ where: { id }, data: { url } });
  if (existing) await deleteFromR2(existing.url);

  return NextResponse.json(photo);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.tarifPhoto.findUnique({ where: { id } });
  await prisma.tarifPhoto.delete({ where: { id } });
  if (existing) await deleteFromR2(existing.url);
  return NextResponse.json({ ok: true });
}
