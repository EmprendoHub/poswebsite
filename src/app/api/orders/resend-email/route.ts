import { sendOrderConfirmationEmails } from "@/backend/helpers/emailService";
import Order from "@/backend/models/Order";
import dbConnect from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    await dbConnect();

    const { orderId } = await req.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 },
      );
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    await sendOrderConfirmationEmails(
      order,
      { method: "Manual", reference: "Reenvío manual" },
      { adminOnly: true },
    );

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error resending order email:", error);
    return NextResponse.json(
      { error: "Error al reenviar el email" },
      { status: 500 },
    );
  }
}
