import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compressImage } from "@/lib/compress-image";
import { uploadToR2 } from "@/lib/r2";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Image requise." }, { status: 400 });
  }

  // Grilles tarifaires = texte à lire, on garde une résolution plus haute.
  const { buffer, ext } = await compressImage(Buffer.from(await file.arrayBuffer()), { maxWidth: 1800, quality: 85 });
  const fileName = `tarif-${Date.now()}.${ext}`;
  const url = await uploadToR2(`tarifs/${fileName}`, buffer);

  const count = await prisma.tarifPhoto.count();
  const photo = await prisma.tarifPhoto.create({ data: { url, order: count } });

  return NextResponse.json(photo, { status: 201 });
}
