import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function isAdmin(role: string | undefined) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const { key } = await params;
  const setting = await prisma.appSetting.findUnique({ where: { key } });
  return NextResponse.json({ key, value: setting?.value ?? "" });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!session?.user || !isAdmin(role)) return NextResponse.json({ error: "Accès refusé" }, { status: 403 });

  const { key } = await params;
  const body = await req.json().catch(() => null);
  const value = typeof body?.value === "string" ? body.value.trim() : "";

  const setting = await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
  return NextResponse.json(setting);
}
