import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compressImage } from "@/lib/compress-image";
import { uploadToR2, deleteFromR2 } from "@/lib/r2";

function canEdit(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

async function savePhoto(file: File): Promise<string> {
  const { buffer, ext } = await compressImage(Buffer.from(await file.arrayBuffer()));
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  return uploadToR2(`zones/${fileName}`, buffer);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canEdit(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const formData = await req.formData();
  const name = formData.get("name")?.toString().trim();
  const categoryId = formData.get("categoryId")?.toString();
  const geometry = formData.get("geometry")?.toString();
  const removePhoto = formData.get("removePhoto")?.toString() === "true";
  const photo = formData.get("photo");

  if (!name || !categoryId) {
    return NextResponse.json({ error: "Nom et catégorie requis." }, { status: 400 });
  }

  const previous = await prisma.reservedZone.findUnique({ where: { id } });

  const data: Record<string, unknown> = { name, categoryId };
  if (geometry) data.geometry = geometry;
  if (removePhoto) data.photoUrl = null;
  if (photo instanceof File && photo.size > 0) {
    data.photoUrl = await savePhoto(photo);
  }

  const zone = await prisma.reservedZone.update({ where: { id }, data });
  if (previous?.photoUrl && previous.photoUrl !== zone.photoUrl) {
    await deleteFromR2(previous.photoUrl);
  }
  return NextResponse.json(zone);
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !canEdit(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id } = await params;
  const existing = await prisma.reservedZone.findUnique({ where: { id } });
  await prisma.reservedZone.delete({ where: { id } });
  if (existing?.photoUrl) await deleteFromR2(existing.photoUrl);
  return NextResponse.json({ ok: true });
}
