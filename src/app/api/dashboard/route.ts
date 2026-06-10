export const dynamic = "force-dynamic";
import { newCSTDate } from "@/backend/helpers";
import Affiliate from "@/backend/models/Affiliate";
import Order from "@/backend/models/Order";
import Post from "@/backend/models/Post";
import Product from "@/backend/models/Product";
import User from "@/backend/models/User";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

// Function to get the document count for all from the previous month
const getDocumentCountPreviousMonth = async (model: any) => {
  const now = newCSTDate();
  const firstDayOfPreviousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  );
  const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  try {
    const documentCount = await model.countDocuments(
      {
        createdAt: {
          $gte: firstDayOfPreviousMonth,
          $lte: lastDayOfPreviousMonth,
        },
      },
      {
        published: { $ne: "false" },
      },
    );

    return documentCount;
  } catch (error: any) {
    console.error("Error counting documents from the previous month:", error);
    throw error;
  }
};

// Function to get the document count for all orders from the previous month
const getClientCountPreviousMonth = async () => {
  const now = newCSTDate();
  const firstDayOfPreviousMonth = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    1,
  );
  const lastDayOfPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  try {
    const clientCount = await User.countDocuments({
      createdAt: {
        $gte: firstDayOfPreviousMonth,
        $lte: lastDayOfPreviousMonth,
      },
      role: "cliente",
    });

    return clientCount;
  } catch (error) {
    console.error("Error counting clients from the previous month:", error);
    throw error;
  }
};

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
    let orders;
    let affiliates;
    let products;
    let clients;
    let posts;

    if (["manager", "super_admin"].includes(session?.user?.role as string)) {
      orders = await Order.find({ orderStatus: { $ne: "Cancelado" } })
        .sort({ createdAt: -1 }) // Sort in descending order of creation date
        .limit(5);
      affiliates = await Affiliate.find({ published: { $ne: "false" } })
        .sort({ createdAt: -1 }) // Sort in descending order of creation date
        .limit(5);
      products = await Product.find({ published: { $ne: "false" } })
        .sort({ createdAt: -1 }) // Sort in descending order of creation date
        .limit(5);
      clients = await User.find({ role: "cliente" })
        .sort({ createdAt: -1 }) // Sort in descending order of creation date
        .limit(5);
      posts = await Post.find({ published: { $ne: "false" } })
        .sort({ createdAt: -1 }) // Sort in descending order of creation date
        .limit(5);

      const totalOrderCount = await Order.countDocuments({
        orderStatus: { $ne: "Cancelado" },
      });
      const totalAffiliateCount = await Affiliate.countDocuments({
        published: { $ne: "false" },
      });
      const totalProductCount = await Product.countDocuments({
        published: { $ne: "false" },
      });
      const totalClientCount = await User.countDocuments({ role: "cliente" });
      const totalPostCount = await Post.countDocuments({
        published: { $ne: "false" },
      });

      const orderCountPreviousMonth =
        await getDocumentCountPreviousMonth(Order);
      const affiliateCountPreviousMonth =
        await getDocumentCountPreviousMonth(Affiliate);
      const postCountPreviousMonth = await getDocumentCountPreviousMonth(Post);
      const clientCountPreviousMonth = await getClientCountPreviousMonth();

      const dataPacket = {
        orders,
        totalOrderCount,
        orderCountPreviousMonth,
        affiliates,
        totalAffiliateCount,
        affiliateCountPreviousMonth,
        products,
        totalProductCount,
        clients,
        totalClientCount,
        clientCountPreviousMonth,
        posts,
        totalPostCount,
        postCountPreviousMonth,
      };
      return new Response(JSON.stringify(dataPacket), { status: 201 });
    }
  } catch (error) {
    return NextResponse.json(
      {
        error: "Dashboard DB loading error",
      },
      { status: 500 },
    );
  }
};
