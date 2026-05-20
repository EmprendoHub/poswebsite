import Address from "@/backend/models/Address";
import Order from "@/backend/models/Order";
import User from "@/backend/models/User";
import APIOrderFilters from "@/lib/APIOrderFilters";
import dbConnect from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function GET(request: any) {
  const token = await getToken({ req: request });
  if (token) {
    try {
      await dbConnect();
      const _id = request.nextUrl.searchParams.get("id");
      let orderQuery = Order.find({ user: _id });

      const resPerPage = 5;
      // Extract page and per_page from request URL
      const page = Number(request.nextUrl.searchParams.get("page")) || 1;
      const orderCount = await Order.countDocuments({ user: _id });

      // Apply search Filters including order_id and orderStatus
      const apiOrderFilters: any = new APIOrderFilters(
        orderQuery,
        request.nextUrl.searchParams
      )
        .searchAllFields()
        .filter();
      let ordersData = await apiOrderFilters.query;

      const filteredOrdersCount = ordersData.length;

      apiOrderFilters.pagination(resPerPage, page);
      ordersData = await apiOrderFilters.query.clone();

      await Promise.all(
        ordersData.map(async (order: any) => {
          let shippingInfo = await Address.findOne({
            _id: order.shippingInfo,
          });
          let user = await User.findOne({ _id: order.user });
          order.shippingInfo = shippingInfo;
          order.user = user;
        })
      );

      // descending order
      const sortedOrders = ordersData
        .slice()
        .sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      const orders = {
        orders: sortedOrders,
      };

      const dataPacket = {
        orders,
        orderCount,
        filteredOrdersCount,
      };
      return new Response(JSON.stringify(dataPacket), { status: 201 });
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        {
          error: "Orders loading error",
          message: error,
        },
        { status: 500 }
      );
    }
  } else {
    // Not Signed in
    return new Response("You are not authorized, eh eh eh, no no no", {
      status: 400,
    });
  }
}
