export const dynamic = "force-dynamic";
import Affiliate from "@/backend/models/Affiliate";
import Order from "@/backend/models/Order";
import APIOrderFilters from "@/lib/APIOrderFilters";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async (request: any, res: any) => {
  const sessionRaw = await request.headers.get("session");
  const session = JSON.parse(sessionRaw);
  if (!session) {
    // Not Signed in
    return new Response("You are not authorized, eh eh eh, no no no", {
      status: 400,
    });
  }

  try {
    await dbConnect();
    let orderQuery;
    if (["manager", "super_admin"].includes(session?.user?.role as string)) {
      orderQuery = Order.find({ orderStatus: { $ne: "Cancelado" } });
    } else if (session?.user?.role === "afiliado") {
      const affiliate = await Affiliate.findOne({ user: session?.user?._id });
      orderQuery = Order.find({
        affiliateId: affiliate?._id.toString(),
        orderStatus: { $ne: "Cancelado" },
      });
    } else {
      orderQuery = Order.find({
        user: session?.user?._id,
        orderStatus: { $ne: "Cancelado" },
      });
    }

    // Apply descending order based on a specific field (e.g., createdAt)
    orderQuery = orderQuery.sort({ createdAt: -1 });

    const resPerPage = 5;
    // Extract page and per_page from request URL
    const page = Number(request.nextUrl.searchParams.get("page")) || 1;
    const totalOrderCount = await Order.countDocuments();

    // Apply search Filters including order_id and orderStatus
    const apiOrderFilters: any = new APIOrderFilters(
      orderQuery,
      request.nextUrl.searchParams,
    )
      .searchAllFields()
      .filter();
    let ordersData = await apiOrderFilters.query;

    const itemCount = ordersData.length;
    apiOrderFilters.pagination(resPerPage, page);
    ordersData = await apiOrderFilters.query.clone();

    // await Promise.all(
    //   ordersData.map(async (order) => {
    //     let shippingInfo = await Address.findOne({
    //       _id: order.shippingInfo,
    //     });
    //     let user = await User.findOne({ _id: order.user });
    //     order.shippingInfo = shippingInfo;
    //     order.user = user;
    //   })
    // );

    // descending order
    // const sortedOrders = ordersData
    //   .slice()
    //   .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    // If you want a new sorted array without modifying the original one, use slice
    ordersData = await ordersData
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    const orders = {
      orders: ordersData,
    };

    const dataPacket = {
      orders,
      totalOrderCount,
      itemCount,
      resPerPage,
    };
    return new Response(JSON.stringify(dataPacket), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Orders loading error",
      },
      { status: 500 },
    );
  }
};
