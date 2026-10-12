export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import Arqueo from "@/backend/models/Arqueo";

const ALLOWED_ROLES = ["admin", "owner", "manager"];

export async function POST(req: Request) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?._id;

  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await dbConnect();

  try {
    const body = await req.json();
    const {
      storeId,
      storeName,
      dateRange,
      inStore,
      online,
      redesSociales,
      gastos,
      notes,
    } = body;

    if (!storeId || !storeName || !dateRange) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Calculate totals and discrepancies
    const allPaymentMethods = {
      inStore,
      online,
      redesSociales,
    };

    let expectedTotal = 0;
    let receivedTotal = 0;
    let allVerified = true;

    Object.values(allPaymentMethods).forEach((category: any) => {
      Object.values(category).forEach((method: any) => {
        expectedTotal += method.expectedAmount || 0;
        receivedTotal += method.receivedAmount || 0;
        if (!method.verified) allVerified = false;
      });
    });

    // Include gastos in totals if present
    if (gastos) {
      expectedTotal += gastos.expectedTotal || 0;
      receivedTotal += gastos.actualTotal || 0;
      if (!gastos.verified) allVerified = false;
    }

    const totalDiscrepancy = receivedTotal - expectedTotal;

    const arqueo = new Arqueo({
      store: storeId,
      storeName,
      date: new Date(),
      performedBy: userId,
      performedByName: (session?.user as any)?.name || "Admin",
      dateRange: {
        startDate: new Date(dateRange.startDate),
        endDate: new Date(dateRange.endDate),
      },
      inStore,
      online,
      redesSociales,
      gastos,
      totals: {
        expectedTotal,
        receivedTotal,
        totalDiscrepancy,
      },
      allVerified,
      notes,
    });

    await arqueo.save();

    return NextResponse.json({
      success: true,
      arqueo: arqueo.toJSON(),
      message: "Arqueo registrado exitosamente",
    });
  } catch (error) {
    console.error("Error saving arqueo:", error);
    return NextResponse.json(
      { error: "Error saving arqueo" },
      { status: 500 },
    );
  }
}
