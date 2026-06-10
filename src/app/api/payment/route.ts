export const dynamic = "force-dynamic";
import { newCSTDate } from "@/backend/helpers";
import Customer from "@/backend/models/Customer";
import Order from "@/backend/models/Order";
import Payment from "@/backend/models/Payment";
import Product from "@/backend/models/Product";
import dbConnect from "@/lib/db";
import { getToken } from "next-auth/jwt";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

const formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

async function getQuantities(orderItems: any) {
  // Use reduce to sum up the 'quantity' fields
  const totalQuantity = orderItems?.reduce(
    (sum: any, obj: any) => sum + obj.quantity,
    0,
  );
  return totalQuantity;
}
async function getTotal(orderItems: any) {
  // Use reduce to sum up the 'total' field
  let totalAmount: any = orderItems?.reduce(
    (acc: any, cartItem: any) => acc + cartItem.quantity * cartItem.price,
    0,
  );
  totalAmount = formatter.format(totalAmount);
  return totalAmount;
}

async function getPendingTotal(orderItems: any, orderAmountPaid: any) {
  // Use reduce to sum up the 'total' field
  const totalAmount = orderItems?.reduce(
    (acc: any, cartItem: any) => acc + cartItem.quantity * cartItem.price,
    0,
  );
  let pendingAmount: any = totalAmount - orderAmountPaid;
  pendingAmount = formatter.format(pendingAmount);
  return pendingAmount;
}

async function subtotal(order: any) {
  let sub: any = order?.paymentInfo?.amountPaid - order?.ship_cost;
  sub = formatter.format(sub);
  return sub;
}

export async function POST(req: any, res: any) {
  const token = await getToken({ req: req });

  if (!token) {
    // Not Signed in
    return new Response("You are not authorized, eh eh eh, no no no", {
      status: 400,
    });
  }
  try {
    const payload = await req.formData();
    let {
      items,
      transactionNo,
      payType,
      amountReceived,
      note,
      email,
      phone,
      name,
      pathname,
    } = Object.fromEntries(payload);

    await dbConnect();
    let customer;
    let customerEmail;
    let customerPhone;
    let customerName;

    if (email.length > 3) {
      console.log("if  email", email);
      customerEmail = email;
    } else {
      if (phone.length > 3 || name.length > 3) {
        customerEmail =
          phone + name.replace(/\s/g, "").substring(0, 8) + "@noemail.com";
      } else {
        console.log("if sucursal");
        customerEmail = "mxsupercollectibles@gmail.com";
      }
    }

    if (name.length > 3) {
      customerName = name;
    } else {
      customerName = "SUCURSAL";
    }

    const query = { $or: [{ email: customerEmail }, { phone: customerPhone }] };
    if (phone.length > 3) {
      customerPhone = phone;
      query.$or.push({ phone: phone });
    } else {
      customerPhone = "";
    }

    const customerExists = await Customer.findOne(query);

    if (!customerExists) {
      // Generate a random 64-byte token
      const newCustomer = new Customer({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      });
      await newCustomer.save();
      customer = newCustomer;
    } else {
      customer = customerExists;
    }
    items = JSON.parse(items);
    const branchInfo = pathname;
    const ship_cost = 0;
    const itemsSubtotal = items.reduce(
      (acc: any, item: any) => acc + item.quantity * item.price,
      0,
    );
    const ivaAmount = Math.round(((itemsSubtotal * 16) / 116) * 100) / 100;
    const date = newCSTDate();
    console.log("POS Drawer new payment date", date);

    let paymentInfo;
    let layAwayIntent;
    let currentOrderStatus;
    let payMethod;
    let payIntent;

    if (payType === "layaway") {
      payIntent = "partial";
    } else {
      payIntent = "paid";
    }

    if (transactionNo === "EFECTIVO") {
      payMethod = "EFECTIVO";
    } else if (!isNaN(transactionNo)) {
      payMethod = "TERMINAL";
    }
    if (payType === "layaway") {
      paymentInfo = {
        id: "partial",
        status: "unpaid",
        amountPaid: amountReceived,
        taxPaid: ivaAmount,
        paymentIntent: "partial",
      };
      currentOrderStatus = "Apartado";
      layAwayIntent = true;
    } else {
      paymentInfo = {
        id: "paid",
        status: "paid",
        amountPaid: amountReceived,
        taxPaid: ivaAmount,
        paymentIntent: "paid",
      };
      currentOrderStatus = "Pagado";
      layAwayIntent = false;
    }

    const cartItems: any[] = [];
    await Promise.all(
      items?.map(async (item: any) => {
        const variationId = item._id.toString();
        const product = await Product.findOne({
          "variations._id": variationId,
        });

        const variation = product.variations.find((variation: any) =>
          variation._id.equals(variationId),
        );
        // Check if there is enough stock
        if (variation.stock < item.quantity) {
          console.log("Este producto no cuenta con existencias");
          return {
            error: {
              title: { _errors: ["Este producto no cuenta con existencias"] },
            },
          };
        } else {
          variation.stock -= 1;
          product.stock -= 1;
          cartItems.push({
            product: product._id,
            variation: variationId,
            name: item.title,
            color: item.color,
            size: item.size,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          });
          product.save();
        }
      }),
    );

    let orderData = {
      customer: customer._id,
      phone: customer?.phone,
      email: customer?.email,
      customerName: customerName,
      comment: note,
      ship_cost,
      createdAt: date,
      branch: branchInfo,
      paymentInfo,
      orderItems: cartItems,
      orderStatus: currentOrderStatus,
      layaway: layAwayIntent,
      affiliateId: "",
    };

    let newOrder = await new Order(orderData);
    await newOrder.save();
    const newOrderString = JSON.stringify(newOrder);

    let paymentTransactionData = {
      type: "sucursal",
      paymentIntent: payIntent,
      amount: amountReceived,
      reference: transactionNo,
      pay_date: date,
      method: payMethod,
      order: newOrder?._id,
      customer: newOrder?.customer,
    };
    try {
      const newPaymentTransaction = await new Payment(paymentTransactionData);

      await newPaymentTransaction.save();
    } catch (error) {
      console.log("dBberror", error);
    }

    // send email after order is confirmed
    if (
      customerEmail.includes("@noemail.com") ||
      customerEmail === "mxsupercollectibles@gmail.com"
    ) {
      console.log("did not send email");
    } else {
      try {
        const subject = "¡Gracias por tu compra!";
        const bodyOne = `Queríamos expresarte nuestro más sincero agradecimiento por haber elegido Super CollectiblesMX para realizar tu compra reciente. Nos complace enormemente saber que confías en nuestros productos/servicios.`;
        const bodyTwo = `Tu apoyo significa mucho para nosotros y nos comprometemos a brindarte la mejor experiencia posible. Si tienes alguna pregunta o necesitas asistencia adicional, no dudes en ponerte en contacto con nuestro equipo de atención al cliente. Estamos aquí para ayudarte en cualquier momento.`;
        const title = "Recibo de compra";
        const greeting = `Estimado/a ${customer?.name}`;
        const senderName = "www.SuperCollectibles.com.mx";
        const bestRegards = "¡Que tengas un excelente día!";
        const recipient_email = customer?.email;
        const sender_email = "mxsupercollectibles@gmail.com";
        const fromName = "Super Collectibles MX";

        var transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GOOGLE_MAIL,
            pass: process.env.GOOGLE_MAIL_PASS,
          },
        });

        const formattedAmountPaid = formatter.format(
          newOrder?.paymentInfo?.amountPaid || 0,
        );

        const mailOption = {
          from: `"${fromName}" ${sender_email}`,
          to: recipient_email,
          subject,
          html: `
            <!DOCTYPE html>
            <html lang="es">
            <body>
            <div>
            <p>${greeting}</p>
            <div>${bodyOne}</div>
            <p>${title}</p>
            <table style="width: 100%; font-size: 0.875rem; text-align: left;">
              <thead style="font-size: .7rem; color: #4a5568;  text-transform: uppercase;">
                <tr>
                  <th style="padding: 0.75rem;">Nombre</th>
                  <th style="padding: 0.75rem;">Tamaño</th>
                  <th style="padding: 0.75rem;">Color</th>
                  <th style="padding: 0.75rem;">Cant.</th>
                  <th style="padding: 0.75rem;">Precio</th>
                </tr>
              </thead>
              <tbody>
                ${newOrder?.orderItems
                  ?.map(
                    (item: any, index: number) =>
                      `<tr style="background-color: #fff;" key="${index}">
                    <td style="padding: 0.75rem;">${item.name}</td>
                    <td style="padding: 0.75rem;">${item.size}</td>
                    <td style="padding: 0.75rem;">${item.color}</td>
                    <td style="padding: 0.75rem;">${item.quantity}</td>
                    <td style="padding: 0.75rem;">${item.price}</td>
                  </tr>`,
                  )
                  .join("")}
                  <tr>
                  <div style="max-width: 100%; width: 100%; margin: 0 auto; background-color: #ffffff; display: flex; flex-direction: column; padding: 0.5rem;">
            ${
              newOrder?.orderStatus === "Apartado"
                ? `<ul style="margin-bottom: .75rem; padding-left: 0px;">
                <li style="display: flex; justify-content: space-between; gap: 0.75rem; color: #4a5568; margin-bottom: 0.25rem;">
                  <span>Total de Artículos:</span>
                  <span style="color: #48bb78;">
                    ${await getQuantities(newOrder?.orderItems)} (Artículos)
                  </span>
                </li>
                <li style="display: flex; justify-content: space-between; gap: 0.75rem; color: #4a5568; margin-bottom: 0.25rem;">
                  <span>Sub-Total:</span>
                  <span>
                    ${(await subtotal(newOrder)) || 0}
                  </span>
                </li>
                <li style="display: flex; justify-content: space-between; gap: 0.75rem; color: #4a5568; margin-bottom: 0.25rem;">
                  <span>Total:</span>
                  <span>
                    ${(await getTotal(newOrder?.orderItems)) || 0}
                  </span>
                </li>
                <li style="font-size: 1.25rem; font-weight: bold; border-top: 1px solid #cbd5e0; display: flex; justify-content: space-between; gap: 0.75rem; padding-top: 0.75rem;">
                  <span>Abono:</span>
                  <span>
                    - ${formattedAmountPaid}
                  </span>
                </li>
                <li style="font-size: 1.25rem; color: #ff9900; font-weight: bold; border-top: 1px solid #cbd5e0; display: flex; justify-content: space-between; gap: 0.75rem; padding-top: 0.25rem;">
                  <span>Pendiente:</span>
                  <span>
                    ${
                      (await getPendingTotal(
                        newOrder?.orderItems,
                        newOrder?.paymentInfo?.amountPaid,
                      )) || 0
                    }
                    
                  </span>
                </li>
              </ul>`
                : `<ul style="margin-bottom: 1.25rem;">
                <li style="display: flex; justify-content: space-between; gap: 0.75rem; color: #4a5568; margin-bottom: 0.25rem;">
                  <span>Sub-Total:</span>
                  <span>
                    ${(await subtotal(newOrder)) || 0}
                  </span>
                </li>
                <li style="display: flex; justify-content: space-between; gap: 0.75rem; color: #4a5568; margin-bottom: 0.25rem;">
                  <span>Total de Artículos:</span>
                  <span style="color: #086e4f;">
                    ${await getQuantities(newOrder?.orderItems)} (Artículos)
                  </span>
                </li>
                <li style="display: flex; justify-content: space-between; gap: 0.75rem; color: #4a5568; margin-bottom: 0.25rem;">
                  <span>Envió:</span>
                  <span>
                    ${newOrder?.ship_cost}
                  </span>
                </li>
                <li style="font-size: 1.875rem; font-weight: bold; border-top: 1px solid #cbd5e0; display: flex; justify-content: space-between; gap: 0.75rem; margin-top: 1rem; padding-top: 0.75rem;">
                  <span>Total:</span>
                  <span>
                    ${formattedAmountPaid}
                    
                  </span>
                </li>
              </ul>`
            }
            </div>
                  </tr>
              </tbody>
            </table>
            <div>${bodyTwo}</div>
            <p>${senderName}</p>
            <p>${bestRegards}</p>
            </div>
            </body>
            </html>
            `,
        };

        await transporter.sendMail(mailOption);
        console.log(`Email sent successfully to ${recipient_email}`);
      } catch (error) {
        console.log(error);
        return NextResponse.json(
          {
            error: "Error al actualizar pedido",
          },
          { status: 500 },
        );
      }
    }

    revalidatePath("/admin/");
    revalidatePath("/puntodeventa/");
    revalidatePath("/instagram/");
    const responseData = {
      message: "Nuevo pedido",
      newOrder: newOrderString,
    };
    return NextResponse.json(responseData, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      {
        error: "Error al actualizar pedido",
      },
      { status: 500 },
    );
  }
}
