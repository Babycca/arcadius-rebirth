import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getActiveWeekId } from "@/lib/accounting/week";

const COMPANY_PROFIT_RATE = 0.1;

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const weekId = await getActiveWeekId();
  const sales = await prisma.sale.findMany({
    where: { agentId: userId, weekId },
    orderBy: { date: "desc" },
  });
  return NextResponse.json(sales);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Non connecté" }, { status: 401 });

  const userId = (session.user as { id: string }).id;
  const body = await req.json().catch(() => null);

  const houseNumber = body?.houseNumber?.trim();
  const clientName = body?.clientName?.trim();
  const priceAmount = Number(body?.priceAmount);
  const clientPhone = body?.clientPhone?.trim() || null;
  const date = body?.date ? new Date(body.date) : new Date();

  if (!houseNumber || !clientName || !Number.isFinite(priceAmount) || priceAmount <= 0) {
    return NextResponse.json({ error: "Numéro d'habitation, client et prix sont requis." }, { status: 400 });
  }

  const weekId = await getActiveWeekId();
  const sale = await prisma.sale.create({
    data: {
      agentId: userId,
      houseNumber,
      clientName,
      clientPhone,
      priceAmount,
      date,
      weekId,
      companyProfit: priceAmount * COMPANY_PROFIT_RATE,
    },
  });

  return NextResponse.json(sale, { status: 201 });
}
