import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compressImage } from "@/lib/compress-image";
import { uploadToR2 } from "@/lib/r2";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { id: pinId } = await params;
  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Image requise." }, { status: 400 });
  }

  const { buffer, ext } = await compressImage(Buffer.from(await file.arrayBuffer()));
  const fileName = `${pinId}-${Date.now()}.${ext}`;
  const url = await uploadToR2(`price-map-photos/${fileName}`, buffer);

  const count = await prisma.priceMapPinImage.count({ where: { pinId } });
  const image = await prisma.priceMapPinImage.create({ data: { pinId, url, order: count } });

  return NextResponse.json(image, { status: 201 });
}
