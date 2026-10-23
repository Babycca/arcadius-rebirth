import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWeekId } from "@/lib/accounting/week";

export const GARAGE_TYPES = ["Garage Bateaux", "Garage Aéronefs", "Garage Hélicoptères"];

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const weekId = await getActiveWeekId();
  const garageSales = await prisma.garageSale.findMany({
    where: { agentId: userId, weekId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(garageSales);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => null);

  const type = body?.type?.trim();
  const houseNumber = body?.houseNumber?.trim();
  const priceAmount = Number(body?.priceAmount);
  const date = body?.date ? new Date(body.date) : new Date();

  if (!GARAGE_TYPES.includes(type) || !houseNumber || !Number.isFinite(priceAmount) || priceAmount <= 0) {
    return NextResponse.json({ error: "Type, numéro d'habitation et prix sont requis." }, { status: 400 });
  }

  const weekId = await getActiveWeekId();
  const garageSale = await prisma.garageSale.create({
    data: { agentId: userId, type, houseNumber, priceAmount, date, weekId },
  });

  return NextResponse.json(garageSale, { status: 201 });
}
