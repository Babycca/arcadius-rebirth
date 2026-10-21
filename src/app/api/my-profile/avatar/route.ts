import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { compressImage } from "@/lib/compress-image";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Image requise." }, { status: 400 });
  }

  const { buffer, ext } = await compressImage(Buffer.from(await file.arrayBuffer()), { maxWidth: 512, quality: 85 });
  const fileName = `${userId}-${Date.now()}.${ext}`;
  const avatarUrl = await uploadToR2(`avatars/${fileName}`, buffer);

  await prisma.agent.update({ where: { id: userId }, data: { avatarUrl } });

  return NextResponse.json({ avatarUrl });
}
