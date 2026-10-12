export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import CashRegisterCut from "@/backend/models/CashRegisterCut";

const ALLOWED_ROLES = ["admin", "owner", "manager"];

export async function GET(req: Request) {
  const session = await getServerSession(options);
  const role = (session?.user as any)?.role;

  if (!session || !ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  await dbConnect();

  const url = new URL(req.url);
  const cutNumber = url.searchParams.get("cutNumber");

  if (!cutNumber) {
    return NextResponse.json(
      { error: "cutNumber parameter is required" },
      { status: 400 },
    );
  }

  try {
    // Search for the corte by cutNumber
    const corte = await CashRegisterCut.findOne({
      cutNumber: parseInt(cutNumber),
    })
      .populate("store", "name")
      .lean();

    if (!corte) {
      return NextResponse.json(
        {
          success: false,
          error: `No se encontró corte con número ${cutNumber}`,
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      corte,
    });
  } catch (error) {
    console.error("Error searching for corte:", error);
    return NextResponse.json(
      { error: "Error searching for corte" },
      { status: 500 },
    );
  }
}
