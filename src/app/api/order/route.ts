import { getTotalFromItems, newCSTDate } from "@/backend/helpers";
import Address from "@/backend/models/Address";
import Order from "@/backend/models/Order";
import Payment from "@/backend/models/Payment";
import Product from "@/backend/models/Product";
import User from "@/backend/models/User";
import dbConnect from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const GET = async (request: any) => {
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
    const id = await request.headers.get("id");
    let order = await Order.findOne({ _id: id });

    let deliveryAddress = await Address.findOne(order.shippingInfo);
    let orderUser = await User.findOne(order.user);

    const dataPacket = {
      order,
      deliveryAddress,
      orderUser,
    };
    return new Response(JSON.stringify(dataPacket), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Orders loading error",
      },
      { status: 500 }
    );
  }
};

export async function PUT(req: any, res: any) {
  const token = await getToken({ req: req });

  if (!token) {
    // Not Signed in
    return new Response("You are not authorized, eh eh eh, no no no", {
      status: 400,
    });
  }
  try {
    const payload = await req.formData();
    let { transactionNo, paidOn, note, amount, orderId } =
      Object.fromEntries(payload);

    // Define the model name with the suffix appended with the lottery ID
    await dbConnect();
    // Retrieve the dynamically created Ticket model
    const order = await Order.findOne({ _id: orderId });
    // Calculate total amount based on items
    const date = newCSTDate();
    const orderTotal = await getTotalFromItems(order?.orderItems);

    if (order.paymentInfo.amountPaid + Number(amount) >= orderTotal) {
      order.orderStatus = "Entregado";
      order.paymentInfo.status = "Pagado";
    } else {
      order.orderStatus = "Apartado";
      order.paymentInfo.status = "Pendiente";
    }

    order.paymentInfo.amountPaid =
      Number(order.paymentInfo.amountPaid) + Number(amount);

    await order.save();

    let payMethod;
    if (transactionNo === "EFECTIVO") {
      payMethod = "EFECTIVO";
    } else if (!isNaN(transactionNo)) {
      payMethod = "TERMINAL";
    } else {
      payMethod = "EFECTIVO";
    }

    let paymentTransactionData = {
      type: "sucursal",
      paymentIntent: "",
      amount: amount,
      comment: note,
      reference: transactionNo,
      pay_date: date,
      method: payMethod,
      order: order?._id,
      user: order?.user,
    };

    try {
      const newPaymentTransaction = await new Payment(paymentTransactionData);

      await newPaymentTransaction.save();
    } catch (error) {
      console.log("dBberror", error);
    }
    revalidatePath(`/admin/pedidos`);
    revalidatePath(`/admin/pedido/${order?._id}`);
    revalidatePath(`/puntodeventa/pedidos`);
    revalidatePath(`/puntodeventa/pedido/${order?._id}`);
    return NextResponse.json(
      {
        error: "pedido actualizado ",
      },
      { status: 200 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        error: "Error al actualizar pedido",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: any) {
  const token = await request.headers.get("cookie");

  if (!token) {
    // Not Signed in
    const notAuthorized = "You are not authorized no no no";
    return new Response(JSON.stringify(notAuthorized), {
      status: 400,
    });
  }

  try {
    await dbConnect();
    const urlData = await request.url.split("?");
    const id = urlData[1];
    const soonToDeleteOrder = await Order.findById(id);

    if (!soonToDeleteOrder) {
      const notFoundResponse = "Order not found";
      return new Response(JSON.stringify(notFoundResponse), { status: 404 });
    }

    // Iterate through order items and update Product quantities
    for (const orderItem of soonToDeleteOrder.orderItems) {
      const productId = orderItem.product.toString();
      const product = await Product.findById(productId);

      if (product) {
        // Increment the product quantity by the quantity of items in the deleted order
        await Product.updateOne(
          { _id: productId },
          { $inc: { stock: orderItem.quantity } }
        );
      }
    }
    const deleteOrder = await Order.findByIdAndDelete(id);

    return new Response(JSON.stringify(deleteOrder), { status: 201 });
  } catch (error: any) {
    return new Response(JSON.stringify(error.message), { status: 500 });
  }
}
