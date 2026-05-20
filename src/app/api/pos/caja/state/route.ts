import { options } from "@/app/api/auth/[...nextauth]/options";
import dbConnect from "@/lib/db";
import {
  POS_ALLOWED_ROLES,
  canUseStore,
  calculateExpectedCash,
  CashRegisterCut,
  CashRegisterSession,
} from "@/lib/posCaja";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(options);
    const user = session?.user as any;
    const role = user?.role;
    if (!session || !POS_ALLOWED_ROLES.includes(role)) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const url = new URL(req.url);
    const storeId = url.searchParams.get("storeId");

    if (!storeId) {
      return NextResponse.json(
        { error: "storeId es requerido" },
        { status: 400 },
      );
    }

    if (!canUseStore(role, user?.assignedStore, storeId)) {
      return NextResponse.json(
        { error: "No tienes acceso a esta sucursal" },
        { status: 403 },
      );
    }

    await dbConnect();

    const activeSession = await CashRegisterSession.findOne({
      store: storeId,
      status: "open",
    }).sort({ openedAt: -1 });

    const recentCuts = await CashRegisterCut.find({ store: storeId })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    return NextResponse.json(
      {
        activeSession: activeSession
          ? {
              ...activeSession.toObject(),
              expectedCash: calculateExpectedCash(activeSession),
            }
          : null,
        recentCuts,
      },
      { status: 200 },
    );
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
