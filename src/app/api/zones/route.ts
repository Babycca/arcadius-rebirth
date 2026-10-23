import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compressImage } from "@/lib/compress-image";
import { uploadToR2 } from "@/lib/r2";

function canEdit(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const zones = await prisma.reservedZone.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(zones);
}

async function savePhoto(file: File): Promise<string> {
  const { buffer, ext } = await compressImage(Buffer.from(await file.arrayBuffer()));
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;
  return uploadToR2(`zones/${fileName}`, buffer);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!session?.user || !canEdit(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const formData = await req.formData();
  const name = formData.get("name")?.toString().trim();
  const categoryId = formData.get("categoryId")?.toString();
  const geometry = formData.get("geometry")?.toString();
  const photo = formData.get("photo");

  if (!name || !categoryId || !geometry) {
    return NextResponse.json({ error: "Nom, catégorie et géométrie requis." }, { status: 400 });
  }

  let photoUrl: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    photoUrl = await savePhoto(photo);
  }

  const zone = await prisma.reservedZone.create({
    data: { name, categoryId, geometry, photoUrl, createdById: userId ?? null },
  });

  return NextResponse.json(zone, { status: 201 });
}
