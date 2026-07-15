import CashRegisterCut from "@/backend/models/CashRegisterCut";
import CashRegisterMovement from "@/backend/models/CashRegisterMovement";
import CashRegisterSession from "@/backend/models/CashRegisterSession";
import Store from "@/backend/models/Store";

export const POS_ALLOWED_ROLES = [
  "manager",
  "sucursal",
  "pos",
  "admin",
  "super_admin",
];

export function canUseStore(
  role: string,
  assignedStore: string | null | undefined,
  storeId: string,
) {
  if (role === "manager") return true;
  if (!assignedStore) return true;
  return String(assignedStore) === String(storeId);
}

export async function getStoreOrThrow(storeId: string) {
  const store = await Store.findById(storeId);
  if (!store) throw new Error("Sucursal no encontrada");
  return store;
}

export function calculateExpectedCash(session: any) {
  return (
    Number(session?.openingCash ?? 0) +
    Number(session?.totals?.cashSales ?? 0) +
    Number(session?.totals?.mixedCashSales ?? 0) +
    Number(session?.totals?.inflows ?? 0) -
    Number(session?.totals?.outflows ?? 0)
  );
}

export async function aggregateMovements(
  sessionId: string,
  start: Date,
  end: Date,
) {
  const [agg] = await CashRegisterMovement.aggregate([
    {
      $match: {
        session: sessionId,
        createdAt: { $gte: start, $lte: end },
      },
    },
    {
      $group: {
        _id: null,
        cashSales: {
          $sum: {
            $cond: [{ $eq: ["$type", "sale"] }, "$cashAmount", 0],
          },
        },
        cardSales: {
          $sum: {
            $cond: [{ $eq: ["$type", "sale"] }, "$cardAmount", 0],
          },
        },
        inflows: {
          $sum: {
            $cond: [{ $eq: ["$type", "manual_in"] }, "$cashAmount", 0],
          },
        },
        outflows: {
          $sum: {
            $cond: [{ $eq: ["$type", "manual_out"] }, "$cashAmount", 0],
          },
        },
        movementsCount: { $sum: 1 },
        salesCount: {
          $sum: {
            $cond: [{ $eq: ["$type", "sale"] }, 1, 0],
          },
        },
      },
    },
  ]);

  return {
    cashSales: Number(agg?.cashSales ?? 0),
    cardSales: Number(agg?.cardSales ?? 0),
    inflows: Number(agg?.inflows ?? 0),
    outflows: Number(agg?.outflows ?? 0),
    movementsCount: Number(agg?.movementsCount ?? 0),
    salesCount: Number(agg?.salesCount ?? 0),
  };
}

export async function nextCutNumber(sessionId: string) {
  // Get the session to find the store
  const session = await CashRegisterSession.findById(sessionId);
  if (!session) return 1;

  // Find the highest cutNumber for this store
  const lastCut = (await CashRegisterCut.findOne({ store: session.store })
    .sort({ cutNumber: -1 })
    .lean()) as any;

  return (lastCut?.cutNumber ?? 0) + 1;
}

export { CashRegisterSession, CashRegisterCut, CashRegisterMovement };
