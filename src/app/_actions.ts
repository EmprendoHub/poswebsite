"use server";
import Address from "@/backend/models/Address";
import dbConnect from "@/lib/db";
import { getServerSession } from "next-auth";
import { options } from "./api/auth/[...nextauth]/options";
import {
  AddressEntrySchema,
  ClientPasswordUpdateSchema,
  ClientUpdateSchema,
  PageEntrySchema,
  PageUpdateSchema,
  PostEntrySchema,
  PostUpdateSchema,
  ProductEntrySchema,
  VariationProductEntrySchema,
  VariationUpdateProductEntrySchema,
  VerifyEmailSchema,
} from "@/lib/schemas";
import { revalidatePath, unstable_cache } from "next/cache";
import Post from "@/backend/models/Post";
import Product from "@/backend/models/Product";
import User from "@/backend/models/User";
import Affiliate from "@/backend/models/Affiliate";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import axios from "axios";
import {
  cstDateTime,
  generateUrlSafeTitle,
  getTotalFromItems,
  newCSTDate,
} from "@/backend/helpers";
import Order from "@/backend/models/Order";
import APIPostsFilters from "@/lib/APIPostsFilters";
import APIFilters from "@/lib/APIFilters";
import APIOrderFilters from "@/lib/APIOrderFilters";
import APIClientFilters from "@/lib/APIClientFilters";
import APIAffiliateFilters from "@/lib/APIAffiliateFilters";
import Page from "@/backend/models/Page";
import Payment from "@/backend/models/Payment";
import Customer from "@/backend/models/Customer";
import Expense from "@/backend/models/Expense";
import PayrollEntry from "@/backend/models/PayrollEntry";
import WorkOrder from "@/backend/models/WorkOrder";
import StoreInventory from "@/backend/models/StoreInventory";
import Store from "@/backend/models/Store";
import { getToken } from "next-auth/jwt";
import TestUser from "@/backend/models/TestUser";
import { NextResponse } from "next/server";
import OpenAI from "openai";

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

async function getQuantities(orderItems: any) {
  // Use reduce to sum up the 'quantity' fields
  const totalQuantity = orderItems?.reduce(
    (sum: any, obj: any) => sum + obj.quantity,
    0,
  );
  return totalQuantity;
}

const formatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

async function getTotal(orderItems: any) {
  // Use reduce to sum up the 'total' field
  let totalAmount = orderItems?.reduce(
    (acc: number, cartItem: { quantity: number; price: number }) =>
      acc + cartItem.quantity * cartItem.price,
    0,
  );
  totalAmount = formatter.format(totalAmount);
  return totalAmount;
}

async function getPendingTotal(orderItems: any[], orderAmountPaid: number) {
  // Use reduce to sum up the 'total' field
  const totalAmount = orderItems?.reduce(
    (acc: number, cartItem: { quantity: number; price: number }) =>
      acc + cartItem.quantity * cartItem.price,
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

export async function updateUserMercadoToken(tokenData: any) {
  if (!tokenData) {
    throw new Error(`No token sent`);
  }
  const session = await getServerSession(options);
  try {
    await dbConnect();
    const updatedUser = await User.updateOne(
      { _id: session?.user?._id }, // Query condition
      { $set: { mercado_token: tokenData } }, // Update operation
      { runValidators: true }, // Options
    );
  } catch (error: any) {
    console.log(error);

    throw new Error(`Failed to update user: we got error: ${error.message}`);
  }
}

export async function getUserMercadoToken() {
  const session = await getServerSession(options);
  if (!session) {
    throw new Error(`No session available`);
  }
  try {
    await dbConnect();
    const user = await User.findOne(
      { _id: session?.user?._id }, // Query condition
    );

    const accessToken = user.mercado_token.access_token;
    return { accessToken };
  } catch (error: any) {
    console.log(error);

    throw new Error(`Failed to update user: we got error: ${error.message}`);
  }
}

export async function getProductCategories(token: string, inputSearch: string) {
  const response = await fetch(
    `https://api.mercadolibre.com/sites/MLM/domain_discovery/search?limit=8&q=${inputSearch}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  if (!response.ok) {
    throw new Error("Failed to create item");
  }
  const data = await response.json();
  return { data };
}

export async function getAllOrders(searchParams: any, session: any) {
  try {
    const urlParams = {
      keyword: searchParams.keyword,
      page: searchParams.page,
    };
    const stringSession = JSON.stringify(session);
    // Filter out undefined values
    const filteredUrlParams = Object.fromEntries(
      Object.entries(urlParams).filter(([key, value]) => value !== undefined),
    );
    const searchQuery = new URLSearchParams(filteredUrlParams).toString();
    const URL = `${process.env.NEXTAUTH_URL}/api/orders?${searchQuery}`;
    const res = await fetch(URL, {
      headers: {
        Session: stringSession,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
    const data = await res.json();
    return data;
  } catch (error: any) {
    console.log(error.message);
  }
}

export async function runRevalidationTo(path: string) {
  try {
    revalidatePath(path);
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export const updateOrder = async (formData: any) => {
  try {
    // Create a new FormData object
    const formDataObject = new FormData();
    // Append each form field to the FormData object
    for (const [key, value] of formData.entries()) {
      formDataObject.append(key, value);
    }

    const id = formDataObject.get("_id");

    // Construct the payload in the desired format
    const payload = {
      orderStatus: formDataObject.get("orderStatus"),
      _id: id,
    };
    const response = await axios.put(`/api/order`, {
      payload,
    });

    if (response) {
      return NextResponse.json(
        {
          message: "Se creo actualizo el pedido Exitosamente ",
          payload,
        },
        { status: 200 },
      );
    }
  } catch (error: any) {
    console.log(error?.response?.data?.message);
  }
};

export const updateProduct = async (formData: any) => {
  // Make the fetch request
  try {
    // Create a new FormData object
    const formDataObject: any = new FormData();
    // Append each form field to the FormData object
    for (const [key, value] of formData.entries()) {
      formDataObject.append(key, value);
    }

    // Construct the payload in the desired format
    const payload = {
      title: formDataObject.get("title"),
      description: formDataObject.get("description"),
      category: formDataObject.get("category"),
      cost: formDataObject.get("cost"),
      price: parseInt(formDataObject.get("price"), 10), // Convert to integer
      sizes: formDataObject.get("sizes"),
      images: formDataObject.get("images"),
      featured: formDataObject.get("featured"),
      brand: formDataObject.get("brand"),
      gender: formDataObject.get("gender"),
      salePrice: formDataObject.get("salePrice"),
      salePriceEndDate: formDataObject.get("salePriceEndDate"),
      stock: formDataObject.get("stock"),
      _id: formDataObject.get("_id"),
    };

    const response = await axios.put(
      `/api/product`,
      {
        payload,
      },
      {
        headers: {
          "X-Mysession-Key": JSON.stringify(payload),
        },
      },
    );
    if (response) {
      return NextResponse.json(
        {
          message: "Se creo el Producto Exitosamente ",
        },
        { status: 200 },
      );
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

export const getAffiliateDashboard = async (
  currentCookies: string,
  email: any,
) => {
  const URL = `${process.env.NEXTAUTH_URL}/api/affiliate/dashboard`;
  const { data } = await axios.get(URL, {
    headers: {
      Cookie: currentCookies,
      userEmail: email,
    },
  });

  return data;
};

export async function payPOSDrawer(data: any) {
  try {
    let {
      items,
      transactionNo,
      payType,
      amountReceived,
      note,
      email,
      phone,
      name,
    } = Object.fromEntries(data);

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
    const branchInfo = "Sucursal";
    const ship_cost = 0;
    const date = cstDateTime();
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
        taxPaid: 0,
        paymentIntent: "partial",
      };
      currentOrderStatus = "Apartado";
      layAwayIntent = true;
    } else {
      paymentInfo = {
        id: "paid",
        status: "paid",
        amountPaid: amountReceived,
        taxPaid: 0,
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
    } catch (error: any) {
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
        const senderName = "www.supercollectibles.com.mx";
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
      } catch (error: any) {
        console.log(error);
        throw Error(error);
      }
    }

    revalidatePath("/admin/");
    revalidatePath("/puntodeventa/");
    return { newOrder: newOrderString };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function payPOSInstagramDrawer(data: any) {
  try {
    let {
      items,
      transactionNo,
      payType,
      amountReceived,
      note,
      email,
      phone,
      name,
    } = Object.fromEntries(data);

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
      customerName = "INSTAGRAM";
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
    const branchInfo = "Instagram";
    const ship_cost = 0;
    const date = cstDateTime();
    console.log("Instagram Drawer new payment date", date);

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
        taxPaid: 0,
        paymentIntent: "partial",
      };
      currentOrderStatus = "Apartado";
      layAwayIntent = true;
    } else {
      paymentInfo = {
        id: "paid",
        status: "paid",
        amountPaid: amountReceived,
        taxPaid: 0,
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
    } catch (error: any) {
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
        const bodyOne = `Queríamos expresarte nuestro más sincero agradecimiento por haber elegido Super Collectibles MX para realizar tu compra reciente. Nos complace enormemente saber que confías en nuestros productos/servicios.`;
        const bodyTwo = `Tu apoyo significa mucho para nosotros y nos comprometemos a brindarte la mejor experiencia posible. Si tienes alguna pregunta o necesitas asistencia adicional, no dudes en ponerte en contacto con nuestro equipo de atención al cliente. Estamos aquí para ayudarte en cualquier momento.`;
        const title = "Recibo de compra";
        const greeting = `Estimado/a ${customer?.name}`;
        const senderName = "www.supercollectibles.com.mx";
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
      } catch (error: any) {
        console.log(error);
        throw Error(error);
      }
    }

    revalidatePath("/admin/");
    revalidatePath("/puntodeventa/");
    return { newOrder: newOrderString };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getDashboard() {
  try {
    await dbConnect();
    let orders;
    let products;
    let affiliates;
    let clients;
    let posts;
    let thisWeeksOrder;
    let totalPaymentsThisWeek;
    let dailyOrders;
    let dailyPaymentsTotals;
    let monthlyOrdersTotals;
    let yearlyOrdersTotals;

    const cstOffset = 6 * 60 * 60 * 1000; // CST is UTC+6

    const minusCstOffset = -6 * 60 * 60 * 1000; // CST is UTC+6

    // Create a new date with the offset applied
    const today = new Date(Date.now() + minusCstOffset);
    today.setUTCHours(0, 0, 0, 0); // Set time to midnight
    // Set start of the current year
    const startOfYear = new Date(today.getFullYear(), 0, 1, 0, 0, 0, 0);

    // Set end of the current year
    const endOfYear = new Date(
      today.getFullYear() + 1,
      0,
      0,
      23, // 23 hours
      59, // 59 minutes
      59, // 59 seconds
      999,
    );
    // Set start of the current month
    const startOfMonth = new Date(
      today.getFullYear(),
      today.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );

    // Set end of the current month
    const endOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1, // Next month
      0, // Day 0 of next month is the last day of the current month
      23, // 23 hours
      59, // 59 minutes
      59, // 59 seconds
      999,
    );

    const startOfCurrentWeek = new Date(today);
    startOfCurrentWeek.setDate(today.getDate() - today.getDay());
    startOfCurrentWeek.setUTCHours(0, 0, 0, 0); // Set time to midnight

    // Clone the start of the current week to avoid mutating it
    const endOfCurrentWeek = new Date(startOfCurrentWeek);
    endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6); // Add six days to get to the end of the week
    endOfCurrentWeek.setUTCHours(23, 59, 59, 999); // Set time to the end of the day

    // Last 7 days: today (end) back 6 days (start), so today IS included
    const endOfLast7Days = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getUTCDate(),
      23,
      59,
      59,
      999,
    );

    const startOfLast7Days = new Date(today);
    startOfLast7Days.setDate(today.getDate() - 6); // 6 days before today = 7 day window
    startOfLast7Days.setUTCHours(0, 0, 0, 0);

    const startOfLastWeek = new Date(today);
    startOfLastWeek.setDate(today.getDate() - 14);
    startOfLastWeek.setUTCHours(0, 0, 0, 0); // Set time to midnight

    // Clone the start of the current week to avoid mutating it
    const endOfLastWeek = new Date(startOfLastWeek);
    endOfLastWeek.setDate(startOfLastWeek.getDate() + 6); // Add six days to get to the end of the week
    endOfLastWeek.setUTCHours(23, 59, 59, 999); // Set time to the end of the day

    const startOfLastMonth = new Date(
      today.getFullYear(),
      today.getMonth() - 1,
      1,
    );
    startOfLastMonth.setUTCHours(0, 0, 0, 0); // Set time to midnight in UTC

    // Clone the start of the current week to avoid mutating it
    const endOfLastMonth = new Date(startOfLastMonth);
    endOfLastMonth.setDate(startOfLastMonth.getDate() + 30); // Add six days to get to the end of the week
    endOfLastMonth.setUTCHours(23, 59, 59, 999); // Set time to the end of the day

    const startOfLastYear = new Date(today.getFullYear() - 1, 0, 1);
    startOfLastYear.setUTCHours(0, 0, 0, 0); // Set time to midnight in UTC

    // Clone the start of the current week to avoid mutating it
    const endOfLastYear = new Date(startOfLastYear);
    endOfLastYear.setDate(startOfLastYear.getDate() + 364); // Add six days to get to the end of the week
    endOfLastYear.setUTCHours(23, 59, 59, 999); // Set time to the end of the day

    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getUTCDate(),
      0,
      0,
      0,
      0,
    );

    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getUTCDate(),
      23,
      59,
      59,
      999,
    );

    // Calculate yesterday's date
    const yesterday = new Date(today);
    // Set start and end of yesterday
    yesterday.setDate(today.getDate() - 1); // Set it to yesterday
    const endOfYesterday = new Date(
      yesterday.getFullYear(),
      yesterday.getMonth(),
      yesterday.getUTCDate(),
      23,
      59,
      59,
      999,
    );

    orders = await Order.find({ orderStatus: { $ne: "Cancelado" } })
      .sort({ createdAt: -1 }) // Sort in descending order of creation date
      .limit(5);

    affiliates = await Affiliate.find({ published: { $ne: "false" } })
      .sort({ createdAt: -1 }) // Sort in descending order of creation date
      .limit(5);
    clients = await Customer.find()
      .sort({ createdAt: -1 }) // Sort in descending order of creation date
      .limit(5);
    posts = await Post.find({ published: { $ne: "false" } })
      .sort({ createdAt: -1 }) // Sort in descending order of creation date
      .limit(5);

    // ── Revenue helpers (same source as finanzas module: Order.paymentInfo.amountPaid) ──
    const PAID_STATUSES = ["Pagado", "Entregado", "Enviado", "Procesando"];

    const revenueAgg = async (dateField: string, gte: Date, lte: Date) => {
      const [r] = await Order.aggregate([
        {
          $match: {
            [dateField]: { $gte: gte, $lte: lte },
            orderStatus: { $in: PAID_STATUSES },
          },
        },
        { $group: { _id: null, total: { $sum: "$paymentInfo.amountPaid" } } },
      ]);
      return r?.total ?? 0;
    };

    // 7-day chart: group by day using Order.createdAt
    let weeklyData: any = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfLast7Days, $lte: endOfLast7Days },
          orderStatus: { $in: PAID_STATUSES },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          totalAmount: { $sum: "$paymentInfo.amountPaid" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          Total: "$totalAmount",
          count: 1,
        },
      },
    ]);

    // dailyData kept for backward compatibility (not displayed in new dash)
    let dailyData: any = [];

    dailyOrders = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfToday, $lt: endOfToday },
        },
      },
      {
        $unwind: "$orderItems",
      },
      {
        $group: {
          _id: {
            orderStatus: "$orderStatus",
            orderId: "$orderId",
            _id: "$_id",
          },
          total: { $sum: "$orderItems.price" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          total: 1,
          orderStatus: "$_id.orderStatus",
          orderId: "$_id.orderId",
        },
      },
    ]);

    // All totals now from Order.paymentInfo.amountPaid (consistent with finanzas)
    dailyPaymentsTotals = await revenueAgg(
      "createdAt",
      startOfToday,
      endOfToday,
    );
    let yesterdaysOrdersTotals = await revenueAgg(
      "createdAt",
      yesterday,
      endOfYesterday,
    );
    let lastWeeksPaymentsTotals = await revenueAgg(
      "createdAt",
      startOfLastWeek,
      endOfLastWeek,
    );
    let lastMonthsPaymentsTotals = await revenueAgg(
      "createdAt",
      startOfLastMonth,
      endOfLastMonth,
    );
    let lastYearsPaymentsTotals = await revenueAgg(
      "createdAt",
      startOfLastYear,
      endOfLastYear,
    );

    thisWeeksOrder = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startOfCurrentWeek, $lt: endOfCurrentWeek },
        },
      },
      { $unwind: "$orderItems" },
      {
        $group: {
          _id: {
            orderStatus: "$orderStatus",
            orderId: "$orderId",
            _id: "$_id",
          },
          total: { $sum: "$orderItems.price" },
        },
      },
      {
        $project: {
          _id: "$_id._id",
          total: 1,
          orderStatus: "$_id.orderStatus",
          orderId: "$_id.orderId",
        },
      },
    ]);

    totalPaymentsThisWeek = await revenueAgg(
      "createdAt",
      startOfLast7Days,
      endOfLast7Days,
    );

    // Perform aggregation to get this month's totals
    monthlyOrdersTotals = await revenueAgg(
      "createdAt",
      startOfMonth,
      endOfMonth,
    );

    // Perform aggregation to get this year's totals
    yearlyOrdersTotals = await revenueAgg("createdAt", startOfYear, endOfYear);

    products = await Product.find({ published: { $ne: "false" } })
      .sort({ createdAt: -1 }) // Sort in descending order of creation date
      .limit(5);

    const totalOrderCount = await Order.countDocuments({
      orderStatus: { $ne: "Cancelado" },
    });
    const totalPostCount = await Post.countDocuments();
    const totalCustomerCount = await Customer.countDocuments({
      name: { $ne: "SUCURSAL" },
    });
    const totalProductCount = await Product.countDocuments({
      published: { $ne: "false" },
    });
    const orderCountPreviousMonth = await getDocumentCountPreviousMonth(Order);

    // ── New model stats ──────────────────────────────────────────────────────
    const pendingWorkOrders = await WorkOrder.countDocuments({
      status: { $in: ["pending", "approved", "in_transit"] },
    });
    const lowStockCount = await StoreInventory.countDocuments({
      $expr: { $lte: ["$quantity", "$minStock"] },
    });
    const expenseTotalsThisMonth = await Expense.aggregate([
      { $match: { date: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);
    const payrollTotalsThisMonth = await PayrollEntry.aggregate([
      { $match: { periodStart: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: "$netAmount" } } },
    ]);
    const totalExpensesThisMonth = expenseTotalsThisMonth[0]?.total ?? 0;
    const totalPayrollThisMonth = payrollTotalsThisMonth[0]?.total ?? 0;

    orders = JSON.stringify(orders);
    clients = JSON.stringify(clients);
    dailyOrders = JSON.stringify(dailyOrders);
    affiliates = JSON.stringify(affiliates);
    products = JSON.stringify(products);
    posts = JSON.stringify(posts);
    weeklyData = JSON.stringify(weeklyData);
    dailyData = JSON.stringify(dailyData);
    thisWeeksOrder = JSON.stringify(thisWeeksOrder);
    // Revenue totals are already plain numbers (returned by revenueAgg helper)
    return {
      dailyData: dailyData,
      weeklyData: weeklyData,
      orders: orders,
      clients: clients,
      posts: posts,
      affiliates: affiliates,
      dailyOrders: dailyOrders,
      dailyPaymentsTotals: dailyPaymentsTotals,
      yesterdaysOrdersTotals: yesterdaysOrdersTotals,
      thisWeeksOrder: thisWeeksOrder,
      products: products,
      totalOrderCount: totalOrderCount,
      totalCustomerCount: totalCustomerCount,
      orderCountPreviousMonth: orderCountPreviousMonth,
      totalProductCount: totalProductCount,
      totalPaymentsThisWeek: totalPaymentsThisWeek,
      monthlyOrdersTotals: monthlyOrdersTotals,
      yearlyOrdersTotals: yearlyOrdersTotals,
      totalPostCount: totalPostCount,
      lastWeeksPaymentsTotals: lastWeeksPaymentsTotals,
      lastMonthsPaymentsTotals: lastMonthsPaymentsTotals,
      lastYearsPaymentsTotals: lastYearsPaymentsTotals,
      pendingWorkOrders: pendingWorkOrders,
      lowStockCount: lowStockCount,
      totalExpensesThisMonth: totalExpensesThisMonth,
      totalPayrollThisMonth: totalPayrollThisMonth,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getPOSDashboard() {
  try {
    await dbConnect();
    const session = await getServerSession(options);
    let orders: any;
    let todaysOrders: any;
    let products: any;
    let thisWeeksOrder: any;
    let totalOrdersThisWeek: any;
    let dailyOrders: any;
    let dailyOrdersTotals: any | undefined;

    const today = newCSTDate();
    today.setUTCHours(0, 0, 0, 0); // Set time to midnight

    const startOfCurrentWeek = new Date(today);
    startOfCurrentWeek.setDate(today.getDate() - today.getDay());
    startOfCurrentWeek.setUTCHours(0, 0, 0, 0); // Set time to midnight

    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      0,
      0,
      0,
      0,
    );

    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
      0,
      0,
      0,
      0,
    );

    if (session) {
      if (session?.user?.role === "sucursal") {
        orders = await Order.find({ orderStatus: { $ne: "Cancelado" } })
          .sort({ createdAt: -1 }) // Sort in descending order of creation date
          .limit(5);

        dailyOrders = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfToday,
                $lt: endOfToday,
              },
            },
          },
          {
            $unwind: "$orderItems",
          },
          {
            $group: {
              _id: {
                orderStatus: "$orderStatus",
                orderId: "$orderId",
                _id: "$_id",
              },
              total: { $sum: "$orderItems.price" },
            },
          },
          {
            $project: {
              _id: "$_id._id",
              total: 1,
              orderStatus: "$_id.orderStatus",
              orderId: "$_id.orderId",
            },
          },
        ]);
        dailyOrdersTotals = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfToday,
                $lt: endOfToday,
              },
            },
          },
          {
            $unwind: "$orderItems",
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$orderItems.price" },
            },
          },
        ]);

        thisWeeksOrder = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfCurrentWeek,
                $lt: today,
              },
            },
          },
          {
            $unwind: "$orderItems", // Deconstruct the orderItems array
          },
          {
            $group: {
              _id: {
                orderStatus: "$orderStatus",
                orderId: "$orderId", // Include orderId in the _id
                _id: "$_id", // Include _id in the _id
              },
              total: { $sum: "$orderItems.price" }, // Calculate the total sum of prices
            },
          },
          {
            $project: {
              _id: "$_id._id", // Project the _id from _id
              total: 1,
              orderStatus: "$_id.orderStatus",
              orderId: "$_id.orderId", // Project orderId
            },
          },
        ]);
        totalOrdersThisWeek = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfCurrentWeek,
                $lt: today,
              },
            },
          },
          {
            $unwind: "$orderItems", // Deconstruct the orderItems array
          },
          {
            $group: {
              _id: null, // Group all documents without any specific criteria
              total: { $sum: "$orderItems.price" }, // Calculate the total sum of prices
            },
          },
        ]);

        products = await Product.find({ published: { $ne: "false" } })
          .sort({ createdAt: -1 }) // Sort in descending order of creation date
          .limit(5);
      }
      if (session?.user?.role === "instagram") {
        orders = await Order.find({ orderStatus: { $ne: "Cancelado" } })
          .sort({ createdAt: -1 }) // Sort in descending order of creation date
          .limit(5);

        dailyOrders = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfToday,
                $lt: endOfToday,
              },
            },
          },
          {
            $unwind: "$orderItems",
          },
          {
            $group: {
              _id: {
                orderStatus: "$orderStatus",
                orderId: "$orderId",
                _id: "$_id",
              },
              total: { $sum: "$orderItems.price" },
            },
          },
          {
            $project: {
              _id: "$_id._id",
              total: 1,
              orderStatus: "$_id.orderStatus",
              orderId: "$_id.orderId",
            },
          },
        ]);
        dailyOrdersTotals = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfToday,
                $lt: endOfToday,
              },
            },
          },
          {
            $unwind: "$orderItems",
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$orderItems.price" },
            },
          },
        ]);

        thisWeeksOrder = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfCurrentWeek,
                $lt: today,
              },
            },
          },
          {
            $unwind: "$orderItems", // Deconstruct the orderItems array
          },
          {
            $group: {
              _id: {
                orderStatus: "$orderStatus",
                orderId: "$orderId", // Include orderId in the _id
                _id: "$_id", // Include _id in the _id
              },
              total: { $sum: "$orderItems.price" }, // Calculate the total sum of prices
            },
          },
          {
            $project: {
              _id: "$_id._id", // Project the _id from _id
              total: 1,
              orderStatus: "$_id.orderStatus",
              orderId: "$_id.orderId", // Project orderId
            },
          },
        ]);
        totalOrdersThisWeek = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfCurrentWeek,
                $lt: today,
              },
            },
          },
          {
            $unwind: "$orderItems", // Deconstruct the orderItems array
          },
          {
            $group: {
              _id: null, // Group all documents without any specific criteria
              total: { $sum: "$orderItems.price" }, // Calculate the total sum of prices
            },
          },
        ]);

        products = await Product.find({ published: { $ne: "false" } })
          .sort({ createdAt: -1 }) // Sort in descending order of creation date
          .limit(5);
      }
    }

    const totalOrderCount = await Order.countDocuments({
      orderStatus: { $ne: "Cancelado" },
    });
    const totalProductCount = await Product.countDocuments({
      published: { $ne: "false" },
    });
    const orderCountPreviousMonth = await getDocumentCountPreviousMonth(Order);

    orders = JSON.stringify(orders);
    dailyOrders = JSON.stringify(dailyOrders);

    products = JSON.stringify(products);
    thisWeeksOrder = JSON.stringify(thisWeeksOrder);
    const thisWeekOrderTotals = totalOrdersThisWeek[0]?.total;
    dailyOrdersTotals = dailyOrdersTotals[0]?.total;
    return {
      orders: orders,
      dailyOrders: dailyOrders,
      dailyOrdersTotals: dailyOrdersTotals,
      thisWeeksOrder: thisWeeksOrder,
      products: products,
      totalOrderCount: totalOrderCount,
      orderCountPreviousMonth: orderCountPreviousMonth,
      totalProductCount: totalProductCount,
      thisWeekOrderTotals: thisWeekOrderTotals,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getInstagramDashboard() {
  try {
    await dbConnect();
    const session = await getServerSession(options);
    let orders: any | undefined;
    let todaysOrders: any | undefined;
    let products: any | undefined;
    let thisWeeksOrder: any | undefined;
    let totalOrdersThisWeek: any | undefined;
    let dailyOrders: any | undefined;
    let dailyOrdersTotals: any | undefined;
    const today = newCSTDate();
    const startOfCurrentWeek = new Date(today);
    startOfCurrentWeek.setDate(
      startOfCurrentWeek.getDate() - startOfCurrentWeek.getDay(),
    );
    const startOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
    );
    const endOfToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1,
    );

    if (session) {
      if (session?.user?.role === "sucursal") {
        orders = await Order.find({ orderStatus: { $ne: "Cancelado" } })
          .sort({ createdAt: -1 }) // Sort in descending order of creation date
          .limit(5);

        dailyOrders = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfToday,
                $lt: endOfToday,
              },
            },
          },
          {
            $unwind: "$orderItems",
          },
          {
            $group: {
              _id: {
                orderStatus: "$orderStatus",
                orderId: "$orderId",
                _id: "$_id",
              },
              total: { $sum: "$orderItems.price" },
            },
          },
          {
            $project: {
              _id: "$_id._id",
              total: 1,
              orderStatus: "$_id.orderStatus",
              orderId: "$_id.orderId",
            },
          },
        ]);
        dailyOrdersTotals = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfToday,
                $lt: endOfToday,
              },
            },
          },
          {
            $unwind: "$orderItems",
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$orderItems.price" },
            },
          },
        ]);

        thisWeeksOrder = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfCurrentWeek,
                $lt: today,
              },
            },
          },
          {
            $unwind: "$orderItems", // Deconstruct the orderItems array
          },
          {
            $group: {
              _id: {
                orderStatus: "$orderStatus",
                orderId: "$orderId", // Include orderId in the _id
                _id: "$_id", // Include _id in the _id
              },
              total: { $sum: "$orderItems.price" }, // Calculate the total sum of prices
            },
          },
          {
            $project: {
              _id: "$_id._id", // Project the _id from _id
              total: 1,
              orderStatus: "$_id.orderStatus",
              orderId: "$_id.orderId", // Project orderId
            },
          },
        ]);
        totalOrdersThisWeek = await Order.aggregate([
          {
            $match: {
              createdAt: {
                $gte: startOfCurrentWeek,
                $lt: today,
              },
            },
          },
          {
            $unwind: "$orderItems", // Deconstruct the orderItems array
          },
          {
            $group: {
              _id: null, // Group all documents without any specific criteria
              total: { $sum: "$orderItems.price" }, // Calculate the total sum of prices
            },
          },
        ]);

        products = await Product.find({ published: { $ne: "false" } })
          .sort({ createdAt: -1 }) // Sort in descending order of creation date
          .limit(5);
      }
    }

    const totalOrderCount = await Order.countDocuments({
      orderStatus: { $ne: "Cancelado" },
    });
    const totalProductCount = await Product.countDocuments({
      published: { $ne: "false" },
    });
    const orderCountPreviousMonth = await getDocumentCountPreviousMonth(Order);

    orders = JSON.stringify(orders);
    dailyOrders = JSON.stringify(dailyOrders);

    products = JSON.stringify(products);
    thisWeeksOrder = JSON.stringify(thisWeeksOrder);
    const thisWeekOrderTotals = totalOrdersThisWeek[0]?.total;
    dailyOrdersTotals = dailyOrdersTotals[0]?.total;
    return {
      orders: orders,
      dailyOrders: dailyOrders,
      dailyOrdersTotals: dailyOrdersTotals,
      thisWeeksOrder: thisWeeksOrder,
      products: products,
      totalOrderCount: totalOrderCount,
      orderCountPreviousMonth: orderCountPreviousMonth,
      totalProductCount: totalProductCount,
      thisWeekOrderTotals: thisWeekOrderTotals,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getOnePost(slug: any) {
  try {
    await dbConnect();

    let post = await Post.findOne({ slug: slug });
    const postCategory = post.category;
    // Find products matching any of the tag values
    let trendingProducts: any = await Product.find({
      "tags.value": postCategory,
    }).limit(4);

    // convert to string
    post = JSON.stringify(post);
    trendingProducts = JSON.stringify(trendingProducts);

    return { post: post, trendingProducts: trendingProducts };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function addNewPage(data: any) {
  const session = await getServerSession(options);
  const user = { _id: session?.user?._id };
  let {
    category,
    preTitle,
    mainTitle,
    subTitle,
    mainImage,
    sections,
    createdAt,
  } = Object.fromEntries(data);

  sections = JSON.parse(sections);
  createdAt = new Date(createdAt);
  // validate form data
  const result = PageEntrySchema.safeParse({
    mainTitle: mainTitle,
    mainImage: mainImage,
    createdAt: createdAt,
  });
  const { error: zodError } = result;
  if (zodError) {
    return { error: zodError.format() };
  }

  //check for errors
  await dbConnect();
  const slug = generateUrlSafeTitle(mainTitle);

  const slugExists = await Page.findOne({ slug: slug });
  if (slugExists) {
    return {
      error: {
        title: { _errors: ["Este Titulo de Pagina ya esta en uso"] },
      },
    };
  }
  const { error } = await Page.create({
    category,
    preTitle,
    mainTitle,
    subTitle,
    slug,
    mainImage,
    sections,
    createdAt,
    published: true,
    authorId: { _id: session?.user._id },
  });
  if (error) throw Error(error);
  revalidatePath("/");
}

export async function updatePage(data: any) {
  const session = await getServerSession(options);
  let {
    _id,
    category,
    preTitle,
    mainTitle,
    subTitle,
    mainImage,
    sections,
    createdAt,
  } = Object.fromEntries(data);
  sections = JSON.parse(sections);
  const updatedAt = new Date(createdAt);
  // validate form data
  const result = PageUpdateSchema.safeParse({
    category: category,
    mainTitle: mainTitle,
    mainImage: mainImage,
    updatedAt: updatedAt,
  });
  const { error: zodError } = result;
  if (zodError) {
    return { error: zodError.format() };
  }

  //check for errors
  await dbConnect();
  const slug = generateUrlSafeTitle(mainTitle);
  const slugExists = await Page.findOne({
    slug: slug,
    _id: { $ne: _id },
  });
  if (slugExists) {
    return {
      error: {
        title: { _errors: ["Este Titulo de Pagina ya esta en uso"] },
      },
    };
  }
  const { error }: any = await Page.updateOne(
    { _id },
    {
      category,
      preTitle,
      mainTitle,
      subTitle,
      slug,
      mainImage,
      sections,
      updatedAt,
      published: true,
      authorId: { _id: session?.user._id },
    },
  );
  if (error) throw Error(error);
  revalidatePath("/");
}

export async function getAllPost(searchQuery: any) {
  const session = await getServerSession(options);

  try {
    await dbConnect();
    let postQuery;
    if (session) {
      if (session?.user?.role === "manager") {
        postQuery = Post.find({});
      } else {
        postQuery = Post.find({ published: true });
      }
    } else {
      postQuery = Post.find({ published: true });
    }

    const searchParams = new URLSearchParams(searchQuery);
    const resPerPage = 10;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    // total number of documents in database
    const itemCount = await Post.countDocuments();
    // Extract all possible categories
    const allCategories = await Post.distinct("category");

    // Apply search Filters
    const apiPostFilters: any = new APIPostsFilters(postQuery, searchParams)
      .searchAllFields()
      .filter();

    let postsData = await apiPostFilters.query;

    const filteredPostsCount = postsData.length;

    // Pagination filter
    apiPostFilters.pagination(resPerPage, page);
    postsData = await apiPostFilters.query.clone();

    let sortedPosts = postsData
      .slice()
      .sort(
        (a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    sortedPosts = JSON.stringify(sortedPosts);
    return {
      posts: sortedPosts,
      itemCount: itemCount,
      filteredPostsCount: filteredPostsCount,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getOneOrder(id: any) {
  try {
    await dbConnect();

    let order = await Order.findOne({ _id: id });
    let deliveryAddress = await Address.findOne({ user: order.user });
    let orderPayments: any = await Payment.find({ order: order._id });
    let customer = await Customer.findOne({ user: order.user });

    // convert to string
    order = JSON.stringify(order);
    deliveryAddress = JSON.stringify(deliveryAddress);
    orderPayments = JSON.stringify(orderPayments);
    customer = JSON.stringify(customer);

    return {
      order: order,
      customer: customer,
      deliveryAddress: deliveryAddress,
      orderPayments: orderPayments,
    };
    // return { product };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getAllOrder(searchQuery: any) {
  try {
    await dbConnect();
    // Enable profiling for all database operations (level 2)

    const session = await getServerSession(options);
    let orderQuery;
    if (
      session?.user?.role === "manager" ||
      session?.user?.role === "super_admin" ||
      session?.user?.role === "director" ||
      session?.user?.role === "sucursal"
    ) {
      orderQuery = Order.find().populate("user");
    } else if (session?.user?.role === "supervisor") {
      // Find the user's assigned store to get its slug and legacy name
      const me = await User.findById((session.user as any)._id)
        .select("assignedStore")
        .lean();
      const storeId = (me as any)?.assignedStore;

      if (storeId) {
        const store = (await Store.findById(storeId)
          .select("slug branchLegacyName")
          .lean()) as any;

        const branchMatchers: any[] = [{ storeId: storeId }];
        if (store?.slug) branchMatchers.push({ branch: store.slug });
        if (store?.branchLegacyName)
          branchMatchers.push({ branch: store.branchLegacyName });

        orderQuery = Order.find({
          $or: branchMatchers,
          orderStatus: { $ne: "Cancelado" },
        }).populate("user");
      } else {
        // No assigned store — return empty set
        orderQuery = Order.find({ _id: null }).populate("user");
      }
    } else if (session?.user?.role === "afiliado") {
      const affiliate = await Affiliate.findOne({ user: session?.user?._id });
      orderQuery = Order.find({
        affiliateId: affiliate?._id.toString(),
        orderStatus: { $ne: "Cancelado" },
      }).populate("user");
    } else {
      orderQuery = Order.find({
        user: session?.user?._id,
        orderStatus: { $ne: "Cancelado" },
      }).populate("user");
    }

    const searchParams = new URLSearchParams(searchQuery);
    const resPerPage = Number(searchParams.get("perpage")) || 10;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    // Apply descending order based on a specific field (e.g., createdAt)
    orderQuery = orderQuery.sort({ createdAt: -1 });
    const totalOrderCount = await Order.countDocuments();

    // Apply search Filters including order_id and orderStatus
    const apiOrderFilters: any = new APIOrderFilters(
      orderQuery,
      searchParams,
    ).searchAllFields();

    let ordersData = await apiOrderFilters.query;

    const itemCount = ordersData.length;
    apiOrderFilters.pagination(resPerPage, page);
    ordersData = await apiOrderFilters.query.clone();

    // Resolve order.branch to real store names.
    // Covers new orders (slug e.g. "centro-magno") and old orders (branchLegacyName e.g. "Sucursal").
    const stores = await Store.find({}, "name slug branchLegacyName").lean();
    const branchToName = new Map<string, string>();
    for (const s of stores as any[]) {
      if (s.slug) branchToName.set(s.slug, s.name);
      if (s.branchLegacyName) branchToName.set(s.branchLegacyName, s.name);
    }
    ordersData = ordersData.map((o: any) => {
      const plain = o.toObject ? o.toObject() : { ...o };
      const resolved = plain.branch
        ? branchToName.get(plain.branch)
        : undefined;
      return resolved ? { ...plain, branch: resolved } : plain;
    });

    let orders = JSON.stringify(ordersData);

    return {
      orders: orders,
      totalOrderCount: totalOrderCount,
      itemCount: itemCount,
      resPerPage: resPerPage,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function updateOneOrder(data: any) {
  try {
    let { transactionNo, paidOn, note, amount, orderId } =
      Object.fromEntries(data);
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
    } catch (error: any) {
      console.log("dBberror", error);
    }
    revalidatePath(`/admin/pedidos`);
    revalidatePath(`/admin/pedido/${order?._id}`);
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function updateOneInstagramOrder(data: any) {
  try {
    let { transactionNo, paidOn, note, amount, orderId } =
      Object.fromEntries(data);
    let newOrderStatus;
    let newOrderPaymentStatus;
    // Define the model name with the suffix appended with the lottery ID
    await dbConnect();
    // Retrieve the dynamically created Ticket model
    const order = await Order.findOne({ _id: orderId });
    // Calculate total amount based on items
    const date = cstDateTime();
    const orderTotal = await getTotalFromItems(order?.orderItems);
    if (order.paymentInfo.amountPaid + Number(amount) >= orderTotal) {
      newOrderStatus = "Entregado";
      newOrderPaymentStatus = "Pagado";
    } else {
      newOrderStatus = "Apartado";
      newOrderPaymentStatus = "Pendiente";
    }

    let payMethod;
    if (transactionNo === "EFECTIVO") {
      payMethod = "EFECTIVO";
    } else if (!isNaN(transactionNo)) {
      payMethod = "TERMINAL";
    } else {
      payMethod = "EFECTIVO";
    }
    const updatedOrder = await Order.updateOne(
      { _id: orderId },
      {
        orderStatus: newOrderStatus,
        "paymentInfo.status": newOrderPaymentStatus,
        $inc: { "paymentInfo.amountPaid": Number(amount) },
      },
    );

    const lastOrder = await Order.findById(orderId);

    let paymentTransactionData = {
      type: "instagram",
      paymentIntent: "",
      amount: amount,
      comment: note,
      reference: transactionNo,
      pay_date: date,
      method: payMethod,
      order: lastOrder?._id,
      user: lastOrder?.user,
    };

    try {
      const newPaymentTransaction = await new Payment(paymentTransactionData);

      await newPaymentTransaction.save();
    } catch (error: any) {
      console.log("dBberror", error);
    }
    revalidatePath(`/admin/pedidos`);
    revalidatePath(`/admin/pedido/${lastOrder?._id}`);
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function changeOrderNoteStatus(data: any) {
  try {
    let { orderId, note, orderStatus } = Object.fromEntries(data);
    const newStatus = orderStatus;
    const newNote = note;
    await dbConnect();
    const date = cstDateTime();

    const updateOrder = await Order.updateOne(
      { _id: orderId },
      {
        orderStatus: newStatus,
        comment: newNote,
        updatedAt: date,
      },
    );
    revalidatePath(`/instagram/pedidos`);
    revalidatePath(`/instagram/pedido/${orderId}`);
    return {
      ok: true,
    };
  } catch (error: any) {
    throw Error(error);
  }
}

export async function getAllPOSOrder(searchQuery: any) {
  try {
    await dbConnect();
    const session = await getServerSession(options);
    let orderQuery: any;
    if (session?.user?.role === "sucursal") {
      orderQuery = Order.find({
        $and: [{ branch: "Sucursal" }, { orderStatus: { $ne: "Cancelado" } }],
      }).populate("user");
    }

    const searchParams = new URLSearchParams(searchQuery);

    const resPerPage = Number(searchParams.get("perpage")) || 10;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    // Apply descending order based on a specific field (e.g., createdAt)
    orderQuery = orderQuery.sort({ createdAt: -1 });

    // Apply search Filters including order_id and orderStatus
    const apiOrderFilters: any = new APIOrderFilters(orderQuery, searchParams)
      .searchAllFields()
      .filter();
    let ordersData = await apiOrderFilters.query;

    const itemCount = ordersData.length;

    apiOrderFilters.pagination(resPerPage, page);
    ordersData = await apiOrderFilters.query.clone();
    let orders = JSON.stringify(ordersData);

    return {
      orders: orders,
      itemCount: itemCount,
      resPerPage: resPerPage,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getAllPOSInstagramOrder(searchQuery: any) {
  try {
    await dbConnect();
    const session = await getServerSession(options);
    let orderQuery: any;
    if (session?.user?.role === "instagram") {
      orderQuery = Order.find({
        $and: [{ branch: "Instagram" }, { orderStatus: { $ne: "Cancelado" } }],
      }).populate("user");
    }

    const searchParams = new URLSearchParams(searchQuery);

    const resPerPage = Number(searchParams.get("perpage")) || 10;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    // Apply descending order based on a specific field (e.g., createdAt)
    orderQuery = orderQuery.sort({ createdAt: -1 });

    // Apply search Filters including order_id and orderStatus
    const apiOrderFilters: any = new APIOrderFilters(orderQuery, searchParams)
      .searchAllFields()
      .filter();
    let ordersData = await apiOrderFilters.query;

    const itemCount = ordersData.length;

    apiOrderFilters.pagination(resPerPage, page);
    ordersData = await apiOrderFilters.query.clone();
    let orders = JSON.stringify(ordersData);

    return {
      orders: orders,
      itemCount: itemCount,
      resPerPage: resPerPage,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getOneProduct(slug: any, id: any = "") {
  try {
    await dbConnect();
    let product;

    // Check if slug parameter is actually a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[a-f0-9]{24}$/.test(slug);

    if (isObjectId) {
      // slug parameter contains an ID
      product = await Product.findOne({ _id: slug });
    } else if (slug) {
      // slug parameter contains an actual slug
      product = await Product.findOne({ slug: slug });
    } else {
      throw new Error("Either slug or id must be provided");
    }

    // Apply 10% online markup before sending to client
    if (product?.availability?.online) {
      const p = product.toObject ? product.toObject() : { ...product };
      const ONLINE_MARKUP = 1.1;
      p.price = p.price
        ? Math.round(p.price * ONLINE_MARKUP * 100) / 100
        : p.price;
      p.variations = p.variations?.map((v: any) => ({
        ...v,
        price: v.price
          ? Math.round(v.price * ONLINE_MARKUP * 100) / 100
          : v.price,
      }));

      return { product: JSON.stringify(p) };
    }

    product = JSON.stringify(product);
    revalidatePath(`/admin/productos/variacion/${slug}`, "page");
    return { product: product };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

// Get product for editing - returns raw data without price markup
export async function getOneProductForEdit(slug: any, id: any = "") {
  try {
    await dbConnect();
    let product;

    // Check if slug parameter is actually a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[a-f0-9]{24}$/.test(slug);

    if (isObjectId) {
      // slug parameter contains an ID
      product = await Product.findOne({ _id: slug });
    } else if (slug) {
      // slug parameter contains an actual slug
      product = await Product.findOne({ slug: slug });
    } else {
      throw new Error("Either slug or id must be provided");
    }

    // Return raw product data without markup for editing
    product = JSON.stringify(product);
    revalidatePath(`/admin/productos/variacion/${slug}`, "page");
    return { product: product };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getOneProductWithTrending(slug: string, id: string) {
  try {
    await dbConnect();
    let product;

    // Check if slug parameter is actually a MongoDB ObjectId (24 hex characters)
    const isObjectId = /^[a-f0-9]{24}$/.test(slug);

    if (isObjectId) {
      // slug parameter contains an ID
      product = await Product.findOne({ _id: slug });
    } else if (slug) {
      // slug parameter contains an actual slug
      product = await Product.findOne({ slug: slug });
    } else {
      throw new Error("Either slug or id must be provided");
    }
    let trendingProducts: any = await Product.find({
      gender: { $regex: product.gender, $options: "i" },
      availability: { online: true },
      _id: { $ne: product._id },
    })
      .sort({ createdAt: -1 })
      .limit(4);

    // ── Merge real-time StoreInventory stock into each variation ─────────────
    const inventoryRecords = await StoreInventory.find(
      { product: product._id },
      { variationId: 1, quantity: 1 },
    ).lean();

    const stockMap = new Map<string, number>();
    for (const rec of inventoryRecords as any[]) {
      stockMap.set(
        rec.variationId,
        (stockMap.get(rec.variationId) ?? 0) + (rec.quantity ?? 0),
      );
    }

    const p: any = product.toObject ? product.toObject() : { ...product };
    if (stockMap.size > 0) {
      p.variations = p.variations?.map((v: any) => ({
        ...v,
        stock: stockMap.has(v._id?.toString())
          ? stockMap.get(v._id.toString())
          : v.stock,
      }));
      p.stock = p.variations?.reduce(
        (sum: number, v: any) => sum + (Number(v.stock) || 0),
        0,
      );
    }

    // Apply 10% online markup before sending to client
    if (p.availability?.online) {
      const ONLINE_MARKUP = 1.1;
      p.price = p.price
        ? Math.round(p.price * ONLINE_MARKUP * 100) / 100
        : p.price;
      p.variations = p.variations?.map((v: any) => ({
        ...v,
        price: v.price
          ? Math.round(v.price * ONLINE_MARKUP * 100) / 100
          : v.price,
      }));
    }

    trendingProducts = JSON.stringify(trendingProducts);
    return { product: JSON.stringify(p), trendingProducts };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

/**
 * Admin-only version: returns the product with real-time StoreInventory stock
 * merged into each variation, but WITHOUT any price markup.
 * Used by the admin product view page so managers see raw prices.
 */
export async function getOneProductAdmin(slug: string) {
  try {
    await dbConnect();
    const product = await Product.findOne({ slug });
    if (!product) throw new Error("Producto no encontrado");

    const inventoryRecords = await StoreInventory.find(
      { product: product._id },
      { variationId: 1, quantity: 1 },
    ).lean();

    const stockMap = new Map<string, number>();
    for (const rec of inventoryRecords as any[]) {
      stockMap.set(
        rec.variationId,
        (stockMap.get(rec.variationId) ?? 0) + (rec.quantity ?? 0),
      );
    }

    const p: any = product.toObject ? product.toObject() : { ...product };
    if (stockMap.size > 0) {
      p.variations = p.variations?.map((v: any) => ({
        ...v,
        stock: stockMap.has(v._id?.toString())
          ? stockMap.get(v._id.toString())
          : v.stock,
      }));
      p.stock = p.variations?.reduce(
        (sum: number, v: any) => sum + (Number(v.stock) || 0),
        0,
      );
    }

    return { product: JSON.stringify(p) };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

const getCachedEditorsProducts = unstable_cache(
  async () => {
    await dbConnect();
    const editorsProducts = await Product.find(
      { "availability.online": true },
      {
        _id: 1,
        title: 1,
        slug: 1,
        price: 1,
        category: 1,
        brand: 1,
        gender: 1,
        createdAt: 1,
        weight: 1,
        dimensions: 1,
        images: { $slice: 1 },
        variations: { $slice: 1 },
      },
    )
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    const ONLINE_MARKUP = 1.1;
    const markedUp = (editorsProducts as any[]).map((p) => ({
      ...p,
      price: p.price
        ? Math.round(p.price * ONLINE_MARKUP * 100) / 100
        : p.price,
      variations:
        p.variations?.map((v: any) => ({
          ...v,
          price: v.price
            ? Math.round(v.price * ONLINE_MARKUP * 100) / 100
            : v.price,
        })) ?? [],
    }));
    return JSON.stringify(markedUp);
  },
  ["home-editors-products"],
  { revalidate: 300 }, // 5 minutes
);

export async function getHomeProductsData() {
  try {
    const editorsProducts = await getCachedEditorsProducts();
    return {
      trendingProducts: "[]",
      editorsProducts,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function updateProductQuantity(variationId: any) {
  try {
    await dbConnect();
    // Find the product that contains the variation with the specified variation ID
    let product = await Product.findOne({ "variations._id": variationId });

    if (product) {
      // Find the variation within the variations array
      let variation = product.variations.find(
        (variation: any) => variation._id.toString() === variationId,
      );
      // Update the stock of the variation
      variation.stock -= 1; // Example stock update
      // Save the product to persist the changes
      await product.save();
    } else {
      console.log("Product not found");
      throw Error("Product not found");
    }
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function changeProductStatus(productId: any) {
  try {
    await dbConnect();
    // Find the product that contains the variation with the specified variation ID
    let product = await Product.findOne({ _id: productId });

    if (product.active === true) {
      product.active = false; // Deactivate Product
    } else {
      product.active = true; // ReActivate Product
    }
    // Save the product to persist the changes
    await product.save();
    revalidatePath("/admin/productos");
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function deleteOneProduct(productId: any) {
  try {
    const session = await getServerSession(options);
    const role = (session?.user as any)?.role;
    if (!session || role !== "super_admin") {
      throw new Error("Solo super_admin puede eliminar productos.");
    }
    await dbConnect();
    // First fetch the product so we know its variation IDs
    const product = (await Product.findById(productId).lean()) as any;
    if (!product) throw new Error("Producto no encontrado.");

    const variationIds: string[] = (product.variations ?? []).map((v: any) =>
      String(v._id),
    );

    // Delete all StoreInventory records tied to those variations
    if (variationIds.length > 0) {
      await StoreInventory.deleteMany({ variationId: { $in: variationIds } });
    }

    await Product.findByIdAndDelete(productId);
    revalidatePath("/admin/productos");
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function changeProductAvailability(productId: any, location: any) {
  try {
    await dbConnect();
    // Find the product that contains the variation with the specified variation ID
    let product = await Product.findOne({ _id: productId });
    if (location === "MercadoLibre") {
      if (product.availability.instagram === true) {
        product.availability.instagram = false; // Remove from physical branch
      } else {
        product.availability.instagram = true; // Add to physical branch
      }
    } else if (location === "Branch") {
      if (product.availability.branch === true) {
        product.availability.branch = false; // Remove from physical branch
      } else {
        product.availability.branch = true; // Add to physical branch
      }
    } else if (location === "Online") {
      if (product.availability.online === true) {
        product.availability.online = false; // Remove from physical branch
      } else {
        product.availability.online = true; // Add to physical branch
      }
    }
    // Save the product to persist the changes
    await product.save();
    revalidatePath("/admin/productos");
    revalidatePath("/admin/pos/tienda");
    revalidatePath("/puntodeventa/tienda");
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function bulkUpdateProducts(
  productIds: string[],
  updates: {
    category?: string;
    gender?: string;
    brand?: string;
    weight?: number;
    dimensions?: { length?: number; width?: number; height?: number };
  },
) {
  try {
    await dbConnect();
    const updateFields: Record<string, any> = {};
    if (updates.category) updateFields.category = updates.category;
    if (updates.gender) updateFields.gender = updates.gender;
    if (updates.brand) updateFields.brand = updates.brand;
    if (updates.weight != null) updateFields.weight = updates.weight;
    if (updates.dimensions) {
      const { length, width, height } = updates.dimensions;
      if (length != null) updateFields["dimensions.length"] = length;
      if (width != null) updateFields["dimensions.width"] = width;
      if (height != null) updateFields["dimensions.height"] = height;
    }
    if (Object.keys(updateFields).length === 0) return;
    await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: updateFields },
    );
    revalidatePath("/admin/productos");
    revalidatePath("/tienda");
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getVariationStock(variationId: any) {
  try {
    await dbConnect();
    // Find the product that contains the variation with the specified variation ID
    let product = await Product.findOne({ "variations._id": variationId });

    if (product) {
      // Find the variation within the variations array
      let variation = product.variations.find(
        (variation: any) => variation._id.toString() === variationId,
      );
      return { currentStock: variation.stock };
    } else {
      throw Error("Product not found");
    }
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getOnePOSProduct(variationId: any) {
  try {
    await dbConnect();
    // Find the product that contains the variation with the specified variation ID
    let product = await Product.findOne({ "variations._id": variationId });

    if (product) {
      // Find the variation within the variations array
      let variation = product.variations.find(
        (variation: any) => variation._id.toString() === variationId,
      );

      // Add product name and brand to the variation
      let { title, brand } = product;
      variation = {
        ...variation.toObject(), // Convert Mongoose document to plain object
        title: title,
        brand: brand,
      };

      // convert to string
      product = JSON.stringify(product);
      variation = JSON.stringify(variation);
      return {
        product: product,
        variation: variation,
        error: JSON.stringify("Producto no encontrado"),
      };
    } else {
      return {
        error: JSON.stringify("Producto no encontrado"),
        product: JSON.stringify({ product: "" }),
        variation: JSON.stringify({ variation: "" }),
      };
    }
  } catch (error: any) {
    return {
      error: JSON.stringify("Código Incorrecto"),
      product: JSON.stringify({ product: "" }),
      variation: JSON.stringify({ variation: "" }),
    };
  }
}

export async function getAllPOSProductOld(searchQuery: any) {
  try {
    await dbConnect();
    let productQuery;
    // Find the product that contains the variation with the specified variation ID
    productQuery = Product.find({
      $and: [{ stock: { $gt: 0 } }, { "availability.branch": true }],
    });

    const searchParams = new URLSearchParams(searchQuery);
    const resPerPage = Number(searchParams.get("perpage")) || 10;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    // total number of documents in database
    const productsCount = await Product.countDocuments();
    // Apply search Filters
    const apiProductFilters: any = new APIFilters(productQuery, searchParams)
      .searchAllFields()
      .filter();

    let productsData = await apiProductFilters.query;

    const filteredProductsCount = productsData.length;

    apiProductFilters.pagination(resPerPage, page);
    productsData = await apiProductFilters.query.clone();

    // descending order
    let sortedProducts = productsData
      .slice()
      .sort(
        (a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    sortedProducts = JSON.stringify(sortedProducts);
    return {
      products: sortedProducts,
      productsCount: productsCount,
      filteredProductsCount: filteredProductsCount,
      resPerPage: resPerPage,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getAllPOSProduct(searchQuery: any) {
  try {
    await dbConnect();
    // Find the product that contains the variation with the specified variation ID
    let productQuery = Product.find({
      $and: [{ stock: { $gt: 0 } }, { "availability.branch": true }],
    });
    const searchParams = new URLSearchParams(searchQuery);
    const resPerPage = Number(searchParams.get("perpage")) || 20;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    productQuery = productQuery.sort({ createdAt: -1 });
    // total number of documents in database
    const productsCount = await Product.countDocuments();
    // Apply search Filters
    const apiProductFilters: any = new APIFilters(productQuery, searchParams)
      .searchAllFields()
      .filter();

    let productsData = await apiProductFilters.query;

    const filteredProductsCount = productsData.length;

    apiProductFilters.pagination(resPerPage, page);
    productsData = await apiProductFilters.query.clone();
    let products = JSON.stringify(productsData);
    revalidatePath("/admin/pos/productos/");
    return {
      products: products,
      filteredProductsCount: filteredProductsCount,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getAllPOSMercadoLibreProduct(searchQuery: any) {
  try {
    await dbConnect();
    // Find the product that contains the variation with the specified variation ID
    // let productQuery = Product.find({
    //   $and: [{ stock: { $gt: 0 } }, { "availability.instagram": true }],
    // });
    let productQuery = Product.find({
      $and: [{ "availability.instagram": true }],
    });
    const searchParams = new URLSearchParams(searchQuery);
    const resPerPage = Number(searchParams.get("perpage")) || 20;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    productQuery = productQuery.sort({ createdAt: -1 });
    // total number of documents in database
    const productsCount = await Product.countDocuments();
    // Apply search Filters
    const apiProductFilters: any = new APIFilters(productQuery, searchParams)
      .searchAllFields()
      .filter();

    let productsData = await apiProductFilters.query;

    const filteredProductsCount = productsData.length;

    apiProductFilters.pagination(resPerPage, page);
    productsData = await apiProductFilters.query.clone();
    let products = JSON.stringify(productsData);
    const testUsersData = await TestUser.find({});
    const testUsers = JSON.stringify(testUsersData);
    revalidatePath("/admin/mercadolibre/producto");
    return {
      products: products,
      testUsers: testUsers,
      filteredProductsCount: filteredProductsCount,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getAllPOSProductNoFilter() {
  try {
    await dbConnect();
    // Find the product that contains the variation with the specified variation ID
    let productsData = await Product.find({
      $and: [{ stock: { $gt: 0 } }, { "availability.branch": true }],
    });

    const filteredProductsCount = productsData.length;
    let products = JSON.stringify(productsData);

    return {
      products: products,
      filteredProductsCount: filteredProductsCount,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getAllPOSMercadoLibreProductNoFilter() {
  try {
    await dbConnect();
    // Find the product that contains the variation with the specified variation ID
    let productsData = await Product.find({
      $and: [{ stock: { $gt: 0 } }, { "availability.instagram": true }],
    });

    const filteredProductsCount = productsData.length;
    let products = JSON.stringify(productsData);

    return {
      products: products,
      filteredProductsCount: filteredProductsCount,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getAllProduct(searchQuery: any) {
  try {
    await dbConnect();

    const session = await getServerSession(options);

    let productQuery: any;
    if (
      session &&
      ["manager", "sucursal", "instagram"].includes(session?.user?.role)
    ) {
      productQuery = Product.find();
    } else {
      productQuery = Product.find({ published: true });
    }

    const searchParams = new URLSearchParams(searchQuery);
    const resPerPage = Number(searchParams.get("perpage")) || 20;
    const page = Number(searchParams.get("page")) || 1;
    const sortBy = searchParams.get("sortBy");
    const sortDir = searchParams.get("sortDir") === "desc" ? -1 : 1;

    // Apply sorting if specified, otherwise default to createdAt
    if (sortBy) {
      if (sortBy === "title") {
        productQuery = productQuery.sort({ title: sortDir });
      } else if (sortBy === "category") {
        productQuery = productQuery.sort({ category: sortDir });
      } else if (sortBy === "gender") {
        productQuery = productQuery.sort({ gender: sortDir });
      } else if (sortBy === "brand") {
        productQuery = productQuery.sort({ brand: sortDir });
      } else if (sortBy === "price") {
        productQuery = productQuery.sort({ "variations.0.price": sortDir });
      } else if (sortBy === "stock") {
        // Stock sorting will be handled after fetching inventory data
        productQuery = productQuery.sort({ createdAt: -1 });
      } else {
        productQuery = productQuery.sort({ createdAt: -1 });
      }
    } else {
      productQuery = productQuery.sort({ createdAt: -1 });
    }

    const productsCount = await Product.countDocuments();

    const [allCategories, allBrands] = await Promise.all([
      Product.distinct("category"),
      Product.distinct("brand"),
    ]);

    const apiProductFilters: any = new APIFilters(productQuery, searchParams)
      .searchAllFields()
      .filter();

    let productsData = await apiProductFilters.query.exec();
    const filteredProductsCount = productsData.length;

    // For stock sorting, we need inventory data first to sort properly
    if (sortBy === "stock" && productsData.length > 0) {
      const allProductIds = productsData.map((p: any) => p._id);

      // Get stock totals for all products
      const allStockTotals = await StoreInventory.aggregate([
        { $match: { product: { $in: allProductIds } } },
        { $group: { _id: "$product", total: { $sum: "$quantity" } } },
      ]);
      const allStockMap = new Map<string, number>(
        allStockTotals.map((r: any) => [r._id.toString(), r.total]),
      );

      // Sort by stock before pagination
      productsData.sort((a: any, b: any) => {
        const stockA = allStockMap.get(a._id.toString()) || 0;
        const stockB = allStockMap.get(b._id.toString()) || 0;
        return sortDir === 1 ? stockA - stockB : stockB - stockA;
      });
    }

    // Apply pagination after sorting
    const startIndex = (page - 1) * resPerPage;
    const endIndex = startIndex + resPerPage;
    let paginatedProducts = productsData.slice(startIndex, endIndex);

    // Overlay Product.stock with the live sum from StoreInventory so the
    // admin table always shows the correct total across all branches.
    // Also fetch detailed inventory breakdown by store
    if (paginatedProducts.length > 0) {
      const productIds = paginatedProducts.map((p: any) => p._id);

      // Get stock totals for summary
      const stockTotals = await StoreInventory.aggregate([
        { $match: { product: { $in: productIds } } },
        { $group: { _id: "$product", total: { $sum: "$quantity" } } },
      ]);
      const stockMap = new Map<string, number>(
        stockTotals.map((r: any) => [r._id.toString(), r.total]),
      );

      // Get detailed inventory by store for each product
      const detailedInventory = await StoreInventory.find({
        product: { $in: productIds },
      }).populate("store", "name");

      // Group inventory by product ID
      const inventoryByProduct: { [productId: string]: any[] } = {};
      for (const inv of detailedInventory) {
        const pid = inv.product.toString();
        if (!inventoryByProduct[pid]) {
          inventoryByProduct[pid] = [];
        }
        inventoryByProduct[pid].push(inv);
      }

      productsData = paginatedProducts.map((p: any) => {
        const pid = p._id?.toString();
        if (pid && stockMap.has(pid)) {
          // toObject() so we can safely mutate without touching the Mongoose doc
          const obj =
            typeof p.toObject === "function" ? p.toObject() : { ...p };
          obj.stock = stockMap.get(pid);
          obj.storeInventory = inventoryByProduct[pid] || [];
          return obj;
        }
        return p;
      });
    }

    const response = {
      products: JSON.stringify(productsData),
      productsCount,
      filteredProductsCount,
      allCategories: JSON.stringify(allCategories),
      allBrands: JSON.stringify(allBrands),
    };

    revalidatePath("/admin/mercadolibre/producto/");

    return response;
  } catch (error: any) {
    console.error("Error in getAllProduct:", error);
    throw new Error(`Failed to get all products: ${error.message}`);
  }
}

export async function getAllUserOrder(searchQuery: any, id: any) {
  try {
    await dbConnect();
    const session = await getServerSession(options);
    let orderQuery;

    orderQuery = Order.find({
      user: id,
      orderStatus: { $ne: "Cancelado" },
    });
    let client = await User.findOne({ _id: id });

    const searchParams = new URLSearchParams(searchQuery);
    const resPerPage = Number(searchParams.get("perpage")) || 10;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    // Apply descending order based on a specific field (e.g., createdAt)
    orderQuery = orderQuery.sort({ createdAt: -1 });
    const totalOrderCount = await Order.countDocuments();

    // Apply search Filters including order_id and orderStatus
    const apiOrderFilters: any = new APIOrderFilters(orderQuery, searchParams)
      .searchAllFields()
      .filter();
    let ordersData = await apiOrderFilters.query;

    const itemCount = ordersData.length;
    apiOrderFilters.pagination(resPerPage, page);
    ordersData = await apiOrderFilters.query.clone();

    let orders = JSON.stringify(ordersData);
    client = JSON.stringify(client);

    return {
      orders: orders,
      client: client,
      totalOrderCount: totalOrderCount,
      itemCount: itemCount,
      resPerPage: resPerPage,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getAllCustomerOrders(searchQuery: any, id: any) {
  try {
    await dbConnect();
    const session = await getServerSession(options);
    let orderQuery;

    orderQuery = Order.find({
      customer: id,
      orderStatus: { $ne: "Cancelado" },
    });
    let client = await Customer.findOne({ _id: id });

    const searchParams = new URLSearchParams(searchQuery);
    const resPerPage = Number(searchParams.get("perpage")) || 10;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    // Apply descending order based on a specific field (e.g., createdAt)
    orderQuery = orderQuery.sort({ createdAt: -1 });
    const totalOrderCount = await Order.countDocuments();

    // Apply search Filters including order_id and orderStatus
    const apiOrderFilters: any = new APIOrderFilters(orderQuery, searchParams)
      .searchAllFields()
      .filter();
    let ordersData = await apiOrderFilters.query;

    const itemCount = ordersData.length;
    apiOrderFilters.pagination(resPerPage, page);
    ordersData = await apiOrderFilters.query.clone();

    let orders = JSON.stringify(ordersData);
    client = JSON.stringify(client);

    return {
      orders: orders,
      client: client,
      totalOrderCount: totalOrderCount,
      itemCount: itemCount,
      resPerPage: resPerPage,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getAllClient(searchQuery: any) {
  try {
    await dbConnect();
    const session = await getServerSession(options);
    let clientQuery: any;

    if (session) {
      if (
        session?.user?.role === "manager" ||
        session?.user?.role === "sucursal"
      ) {
        clientQuery = Customer.find({});
      }
    }

    const searchParams = new URLSearchParams(searchQuery);
    const resPerPage = Number(searchParams.get("perpage")) || 10;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    // total number of documents in database
    const clientsCount = await User.countDocuments();
    // Extract all possible categories
    // Apply search Filters
    const apiClientFilters: any = new APIClientFilters(
      clientQuery,
      searchParams,
    )
      .searchAllFields()
      .filter();

    let clientsData = await apiClientFilters.query;

    const filteredClientsCount = clientsData.length;

    apiClientFilters.pagination(resPerPage, page);
    clientsData = await apiClientFilters.query.clone();

    let sortedClients = clientsData
      .slice()
      .sort(
        (a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    let clients = JSON.stringify(sortedClients);

    return {
      clients: clients,
      clientsCount: clientsCount,
      filteredClientsCount: filteredClientsCount,
      resPerPage: resPerPage,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function changeClientStatus(_id: any) {
  try {
    await dbConnect();
    const client = await User.findOne({ _id: _id });
    if (client && client.active === false) {
      client.active = true;
    } else {
      client.active = false;
    }
    client.save();
    revalidatePath("/admin/clientes");
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function updateClient(data: any) {
  let { _id, name, phone, email, updatedAt } = Object.fromEntries(data);

  updatedAt = new Date(updatedAt);

  try {
    // validate form data
    const result = ClientUpdateSchema.safeParse({
      name: name,
      phone: phone,
      email: email,
      updatedAt: updatedAt,
    });

    //check for errors
    const { error: zodError } = result;
    if (zodError) {
      return { error: zodError.format() };
    }

    await dbConnect();
    let CustomZodError;
    const client = await User.findOne({ _id: _id });

    if (client?.email != email) {
      const emailExist = await User.find({ email: email });
      if (emailExist) {
        CustomZodError = {
          _errors: [],
          email: { _errors: ["El email ya esta en uso"] },
        };
        return { error: CustomZodError };
      }
    }

    if (client?.phone != phone) {
      const phoneExist = await User.find({ phone: phone });
      if (phoneExist.length > 0) {
        CustomZodError = {
          _errors: [],
          phone: { _errors: ["El teléfono ya esta en uso"] },
        };
        console.log({ error: CustomZodError });
        return { error: CustomZodError };
      }
    }

    client.name = name;
    client.phone = phone;
    client.email = email;
    client.updatedAt = updatedAt;
    // client.avatar = avatar;
    client.save();
    revalidatePath("/perfil/actualizar");
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function updateClientPassword(data: any) {
  let { _id, newPassword, currentPassword, updatedAt } =
    Object.fromEntries(data);

  updatedAt = new Date(updatedAt);

  try {
    // validate form data
    const result = ClientPasswordUpdateSchema.safeParse({
      newPassword: newPassword,
      currentPassword: currentPassword,
      updatedAt: updatedAt,
    });

    //check for errors
    const { error: zodError } = result;
    if (zodError) {
      return { error: zodError.format() };
    }

    await dbConnect();
    let CustomZodError;
    let hashedPassword;
    const client = await User.findOne({ _id: _id }).select("+password");
    const comparePass = await bcrypt.compare(currentPassword, client.password);
    if (!comparePass) {
      CustomZodError = {
        _errors: [],
        currentPassword: {
          _errors: ["La contraseña actual no es la correcta"],
        },
      };
      return { error: CustomZodError };
    } else {
      hashedPassword = await bcrypt.hash(newPassword, 10);
    }

    client.password = hashedPassword;
    client.updatedAt = updatedAt;
    client.save();
    revalidatePath("/perfil/actualizar_contrasena");
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getAllAffiliate(searchQuery: any) {
  try {
    await dbConnect();
    const session = await getServerSession(options);
    let affiliateQuery: any;

    if (session) {
      if (session?.user?.role === "manager") {
        affiliateQuery = Affiliate.find({});
      }
    }

    const searchParams = new URLSearchParams(searchQuery);
    const resPerPage = Number(searchParams.get("perpage")) || 5;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    // total number of documents in database
    const affiliatesCount = await Affiliate.countDocuments();
    // Extract all possible categories
    // Apply search Filters
    const apiAffiliateFilters: any = new APIAffiliateFilters(
      affiliateQuery,
      searchParams,
    )
      .searchAllFields()
      .filter();

    let affiliatesData = await apiAffiliateFilters.query;

    const filteredAffiliatesCount = affiliatesData.length;

    apiAffiliateFilters.pagination(resPerPage, page);
    affiliatesData = await apiAffiliateFilters.query.clone();

    let sortedAffiliates: any[] = affiliatesData
      .slice()
      .sort(
        (a: { createdAt: string }, b: { createdAt: string }) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    let affiliates = JSON.stringify(sortedAffiliates);

    return {
      affiliates: affiliates,
      affiliatesCount: affiliatesCount,
      filteredAffiliatesCount: filteredAffiliatesCount,
      resPerPage: resPerPage,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function getAllAffiliateOrder(searchQuery: any, id: any) {
  const session = await getServerSession(options);

  try {
    await dbConnect();
    const session = await getServerSession(options);
    let orderQuery: any;
    let affiliate;
    if (session) {
      orderQuery = Order.find({
        affiliateId: id,
        orderStatus: { $ne: "Cancelado" },
      });
      affiliate = await Affiliate.findOne({ _id: id });
    }

    const searchParams = new URLSearchParams(searchQuery);
    const resPerPage = Number(searchParams.get("perpage")) || 5;
    // Extract page and per_page from request URL
    const page = Number(searchParams.get("page")) || 1;
    // Apply descending order based on a specific field (e.g., createdAt)
    orderQuery = orderQuery.sort({ createdAt: -1 });
    const totalOrderCount = await Order.countDocuments();

    // Apply search Filters including order_id and orderStatus
    const apiOrderFilters: any = new APIOrderFilters(orderQuery, searchParams)
      .searchAllFields()
      .filter();
    let ordersData = await apiOrderFilters.query;

    const itemCount = ordersData.length;
    apiOrderFilters.pagination(resPerPage, page);
    ordersData = await apiOrderFilters.query.clone();

    let orders = JSON.stringify(ordersData);
    affiliate = JSON.stringify(affiliate);

    return {
      orders: orders,
      affiliate: affiliate,
      totalOrderCount: totalOrderCount,
      itemCount: itemCount,
      resPerPage: resPerPage,
    };
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function updateAffiliate(_id: any) {
  //check for errors
  await dbConnect();
  try {
    const affiliate = await Affiliate.findOne({ _id: _id });
    if (affiliate && affiliate.isActive === false) {
      affiliate.isActive = true;
    } else {
      affiliate.isActive = false;
    }
    affiliate.save();
    revalidatePath("/admin/clientes");
  } catch (error: any) {
    console.log(error);
    throw Error(error);
  }
}

export async function addAddress(data: any) {
  const session = await getServerSession(options);
  const user = { _id: session?.user?._id };
  const { street, city, province, zip_code, country, phone } =
    Object.fromEntries(data);

  // validate form data

  const { error: zodError } = AddressEntrySchema.safeParse({
    street,
    city,
    province,
    zip_code,
    country,
    phone,
  });
  if (zodError) {
    return { error: zodError.format() };
  }
  //check for errors
  await dbConnect();
  const { error } = await Address.create({
    street,
    city,
    province,
    zip_code,
    country,
    phone,
    user,
  });
  if (error) throw Error(error);
  revalidatePath("/perfil/direcciones");
  revalidatePath("/carrito/envio");
}

export const getUserFavorites = async (favoritesData: any, session: any) => {
  try {
    const stringSession = JSON.stringify(session);
    const stringFavorites = JSON.stringify(favoritesData);
    const URL = `/api/client`;
    const { data } = await axios.get(URL, {
      headers: {
        Session: stringSession,
        Favorites: stringFavorites,
      },
    });
    return data;
  } catch (error: any) {
    console.log(error?.response?.data?.message);
  }
};

export async function updateAddress(data: any) {
  const session = await getServerSession(options);
  const user = { _id: session?.user?._id };
  const { street, city, province, zip_code, country, phone } =
    Object.fromEntries(data);

  // validate form data

  const { error: zodError } = AddressEntrySchema.safeParse({
    street,
    city,
    province,
    zip_code,
    country,
    phone,
  });
  if (zodError) {
    return { error: zodError.format() };
  }
  //check for errors
  await dbConnect();
  const { error }: any = await Address.updateOne(
    { _id: data._id },
    {
      street,
      city,
      province,
      zip_code,
      country,
      phone,
      user,
    },
  );
  if (error) throw Error(error);
  revalidatePath("/perfil/direcciones");
  revalidatePath("/carrito/envio");
}

export async function getOneAddress(id: string) {
  //check for errors
  await dbConnect();
  const address = await Address.findOne({ _id: id });
  const stringAddress = JSON.stringify(address);
  if (address) {
    return stringAddress;
  }
}

export async function deleteAddress(id: any) {
  //check for errors
  try {
    await dbConnect();
    const deleteAddress = await Address.findByIdAndDelete(id);
    revalidatePath("/perfil/direcciones");
    revalidatePath("/carrito/envio");
  } catch (error: any) {
    if (error) throw Error(error);
  }
}

export async function addNewPost(data: any) {
  const session = await getServerSession(options);
  const user = { _id: session?.user?._id };
  let {
    category,
    mainTitle,
    mainImage,
    sectionTwoTitle,
    sectionTwoParagraphOne,
    sectionTwoParagraphTwo,
    sectionThreeTitle,
    sectionThreeParagraphOne,
    sectionThreeImage,
    sectionThreeParagraphFooter,
    sectionFourTitle,
    sectionFourImage,
    sectionFourParagraphOne,
    sectionFourParagraphTwo,
    createdAt,
  } = Object.fromEntries(data);

  createdAt = new Date(createdAt);
  // validate form data
  const result = PostEntrySchema.safeParse({
    category: category,
    mainTitle: mainTitle,
    mainImage: mainImage,
    createdAt: createdAt,
  });
  const { error: zodError } = result;
  if (zodError) {
    return { error: zodError.format() };
  }

  //check for errors
  await dbConnect();
  const slug = generateUrlSafeTitle(mainTitle);

  const slugExists = await Post.findOne({ slug: slug });
  if (slugExists) {
    return {
      error: {
        title: { _errors: ["Este Titulo de publicación ya esta en uso"] },
      },
    };
  }
  const { error } = await Post.create({
    category,
    mainTitle,
    slug,
    mainImage,
    sectionTwoTitle,
    sectionTwoParagraphOne,
    sectionTwoParagraphTwo,
    sectionThreeTitle,
    sectionThreeParagraphOne,
    sectionThreeImage,
    sectionThreeParagraphFooter,
    sectionFourTitle,
    sectionFourImage,
    sectionFourParagraphOne,
    sectionFourParagraphTwo,
    createdAt,
    published: true,
    authorId: { _id: session?.user._id },
  });
  if (error) throw Error(error);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
}

export async function updatePost(data: any) {
  const session = await getServerSession(options);
  const user = { _id: session?.user?._id };
  let {
    _id,
    category,
    mainTitle,
    mainImage,
    sectionTwoTitle,
    sectionTwoParagraphOne,
    sectionTwoParagraphTwo,
    sectionThreeTitle,
    sectionThreeParagraphOne,
    sectionThreeImage,
    sectionThreeParagraphFooter,
    sectionFourTitle,
    sectionFourOptionOne,
    sectionFourOptionTwo,
    sectionFourOptionThree,
    sectionFourParagraphOne,
    sectionFourImage,
    sectionFourParagraphFooter,
    sectionFiveTitle,
    sectionFiveImage,
    sectionFiveParagraphOne,
    sectionFiveParagraphTwo,
    updatedAt,
  } = Object.fromEntries(data);

  updatedAt = new Date(updatedAt);
  // validate form data
  const result = PostUpdateSchema.safeParse({
    category: category,
    mainTitle: mainTitle,
    mainImage: mainImage,
    updatedAt: updatedAt,
  });
  const { error: zodError } = result;
  if (zodError) {
    return { error: zodError.format() };
  }

  //check for errors
  await dbConnect();
  const slug = generateUrlSafeTitle(mainTitle);
  const slugExists = await Post.findOne({ slug: slug, _id: { $ne: _id } });
  if (slugExists) {
    return {
      error: {
        title: { _errors: ["Este Titulo de publicación ya esta en uso"] },
      },
    };
  }
  const { error }: any = await Post.updateOne(
    { _id },
    {
      category,
      mainTitle,
      slug,
      mainImage,
      sectionTwoTitle,
      sectionTwoParagraphOne,
      sectionTwoParagraphTwo,
      sectionThreeTitle,
      sectionThreeParagraphOne,
      sectionThreeImage,
      sectionThreeParagraphFooter,
      sectionFourTitle,
      sectionFourOptionOne,
      sectionFourOptionTwo,
      sectionFourOptionThree,
      sectionFourParagraphOne,
      sectionFourImage,
      sectionFourParagraphFooter,
      sectionFiveTitle,
      sectionFiveImage,
      sectionFiveParagraphOne,
      sectionFiveParagraphTwo,
      updatedAt,
      published: true,
      authorId: { _id: session?.user._id },
    },
  );
  if (error) throw Error(error);
  revalidatePath("/admin/blog");
  revalidatePath("/blog/publicacion/");
  revalidatePath("/admin/blog/editor");
  revalidatePath("/blog");
}

export async function addVariationProduct(data: any) {
  const session = await getServerSession(options);
  const user = { _id: session?.user?._id };

  let {
    title,
    description,
    category,
    tags,
    featured,
    branchAvailability,
    instagramAvailability,
    onlineAvailability,
    mainImage,
    brand,
    gender,
    variations,
    salePrice,
    salePriceEndDate,
    createdAt,
  } = Object.fromEntries(data);
  // Parse variations JSON string with reviver function to convert numeric strings to numbers
  let colors: any[] = [];
  variations = JSON.parse(variations, (key, value) => {
    if (key === "color") {
      const color = {
        value: value,
        label: value,
      };
      //check array of object to see if values exists
      const exists = colors.some((c) => c.value === value || c.label === value);
      if (!exists) {
        colors.push(color); // add to colors array
      }
    }
    // Check if the value is a string and represents a number
    if (!isNaN(value) && value !== "" && !Array.isArray(value)) {
      if (key != "size") {
        return Number(value); // Convert the string to a number
      }
    }
    return value; // Return unchanged for other types of values
  });

  tags = JSON.parse(tags);
  const sale_price = Number(salePrice);
  const sale_price_end_date = salePriceEndDate;
  const images = [{ url: mainImage }];

  // calculate product stock
  const stock = variations.reduce(
    (total: any, variation: any) => total + variation.stock,
    0,
  );
  createdAt = new Date(createdAt);

  // validate form data
  const result = VariationProductEntrySchema.safeParse({
    title: title,
    description: description,
    brand: brand,
    category: category,
    tags: tags,
    images: images,
    variations: variations,
    stock: stock,
    gender: gender,
    createdAt: createdAt,
  });

  //check for errors
  const { error: zodError } = result;
  if (zodError) {
    return { error: zodError.format() };
  }
  // Create a new Product in the database
  await dbConnect();
  const slug = generateUrlSafeTitle(title);

  const slugExists = await Product.findOne({ slug: slug });
  if (slugExists) {
    return {
      error: {
        title: { _errors: ["Este Titulo de producto ya esta en uso"] },
      },
    };
  }
  const availability = {
    instagram: instagramAvailability,
    branch: branchAvailability,
    online: onlineAvailability,
  };

  const { error } = await Product.create({
    type: "variation",
    title,
    slug,
    description,
    featured,
    availability,
    brand,
    gender,
    category,
    tags,
    images,
    colors,
    variations,
    stock,
    sale_price,
    sale_price_end_date,
    createdAt,
    user,
  });
  console.log(error);
  if (error) throw Error(error);
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
}

export async function updateVariationProduct(data: any) {
  const session = await getServerSession(options);
  const user = { _id: session?.user?._id };

  let {
    title,
    description,
    category,
    tags,
    featured,
    branchAvailability,
    instagramAvailability,
    onlineAvailability,
    mainImage,
    brand,
    gender,
    variations,
    salePrice,
    salePriceEndDate,
    updatedAt,
    _id,
  } = Object.fromEntries(data);
  // Parse variations JSON string with reviver function to convert numeric strings to numbers
  let colors: any[] = [];
  variations = JSON.parse(variations, (key, value) => {
    if (key === "color") {
      const color = {
        value: value,
        label: value,
      };
      //check array of object to see if values exists
      const exists = colors.some((c) => c.value === value || c.label === value);
      if (!exists) {
        colors.push(color); // add to colors array
      }
    }
    // Check if the value is a string and represents a number
    if (!isNaN(value) && value !== "" && !Array.isArray(value)) {
      if (key != "size") {
        return Number(value); // Convert the string to a number
      }
    }
    return value; // Return unchanged for other types of values
  });

  tags = JSON.parse(tags);
  const sale_price = Number(salePrice);
  const sale_price_end_date = salePriceEndDate;
  const images = [{ url: mainImage }];

  // calculate product stock
  const stock = variations.reduce(
    (total: any, variation: any) => total + variation.stock,
    0,
  );
  updatedAt = new Date(updatedAt);
  // validate form data
  const result = VariationUpdateProductEntrySchema.safeParse({
    title: title,
    description: description,
    brand: brand,
    category: category,
    tags: tags,
    images: images,
    variations: variations,
    stock: stock,
    gender: gender,
    updatedAt: updatedAt,
  });

  //check for errors
  const { error: zodError } = result;
  if (zodError) {
    return { error: zodError.format() };
  }

  // Create a new Product in the database
  await dbConnect();

  const slug = generateUrlSafeTitle(title);
  const slugExists = await Product.findOne({ slug: slug, _id: { $ne: _id } });
  if (slugExists) {
    return {
      error: {
        title: { _errors: ["Este Titulo de producto ya esta en uso"] },
      },
    };
  }
  const availability = {
    instagram: instagramAvailability,
    branch: branchAvailability,
    online: onlineAvailability,
  };

  const { error }: any = await Product.updateOne(
    { _id },
    {
      type: "variation",
      title,
      slug,
      description,
      featured,
      availability,
      brand,
      gender,
      category,
      tags,
      images,
      colors,
      variations,
      stock,
      sale_price,
      sale_price_end_date,
      updatedAt,
      user,
    },
  );
  if (error) throw Error(error);
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
}

export async function updateRevalidateProduct() {
  // Revalidate all product-related paths
  // Admin paths
  revalidatePath("/admin/productos", "page");
  revalidatePath("/(manager)/admin/productos", "page");
  revalidatePath("/(manager)/admin/productos/(.*)", "page");

  // Customer-facing paths
  revalidatePath("/tienda", "page");
  revalidatePath("/(home)/tienda", "page");
  revalidatePath("/(home)/producto/(.*)", "page");

  // API paths for data revalidation
  revalidatePath("/api/product", "layout");
  revalidatePath("/api/products", "layout");
}

export async function addProduct(data: any) {
  const session = await getServerSession(options);
  const user = { _id: session?.user?._id };

  let {
    title,
    description,
    category,
    cost,
    price,
    sizes,
    tags,
    colors,
    featured,
    images,
    brand,
    gender,
    salePrice,
    salePriceEndDate,
    stock,
    createdAt,
  } = Object.fromEntries(data);
  // Parse images as JSON
  images = JSON.parse(images);
  sizes = JSON.parse(sizes);
  tags = JSON.parse(tags);
  colors = JSON.parse(colors);
  stock = Number(stock);
  cost = Number(cost);
  price = Number(price);
  const sale_price = Number(salePrice);
  const sale_price_end_date = salePriceEndDate;

  createdAt = new Date(createdAt);

  // validate form data
  const result = ProductEntrySchema.safeParse({
    title: title,
    description: description,
    brand: brand,
    category: category,
    colors: colors,
    sizes: sizes,
    tags: tags,
    images: images,
    gender: gender,
    stock: stock,
    price: price,
    cost: cost,
    createdAt: createdAt,
  });

  //check for errors
  const { error: zodError } = result;
  if (zodError) {
    return { error: zodError.format() };
  }
  // Create a new Product in the database
  await dbConnect();
  const slug = generateUrlSafeTitle(title);
  const slugExists = await Post.findOne({ slug: slug });
  if (slugExists) {
    return {
      error: {
        title: { _errors: ["Este Titulo de producto ya esta en uso"] },
      },
    };
  }
  const { error } = await Product.create({
    type: "simple",
    title,
    slug,
    description,
    featured,
    brand,
    gender,
    category,
    colors,
    sizes,
    tags,
    images,
    stock,
    price,
    sale_price,
    sale_price_end_date,
    cost,
    createdAt,
    user,
  });
  if (error) throw Error(error);
  revalidatePath("/admin/productos");
  revalidatePath("/tienda");
}

export async function resendEmail(data: any) {
  let { email, gReCaptchaToken } = Object.fromEntries(data);
  const secretKey = process?.env?.RECAPTCHA_SECRET_KEY;

  //check for errors
  const { error: zodError } = VerifyEmailSchema.safeParse({
    email,
  });
  if (zodError) {
    return { error: zodError.format() };
  }

  const formData = `secret=${secretKey}&response=${gReCaptchaToken}`;
  let res: any;
  try {
    res = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
  } catch (e) {
    console.log("recaptcha error:", e);
  }

  if (res && res.data?.success && res.data?.score > 0.5) {
    // Save data to the database from here
    try {
      await dbConnect();
      const user = await User.findOne({ email: email });
      if (!user) {
        return { error: { email: { _errors: ["Email does not exist"] } } };
      }
      if (user?.isActive === true) {
        return { error: { email: { _errors: ["Email is already verified"] } } };
      }
      if (user?._id) {
        try {
          const subject = "Confirmar email";
          const body = `Por favor da click en confirmar email para verificar tu cuenta.`;
          const title = "Completar registro";
          const greeting = `Saludos ${user?.name}`;
          const action = "CONFIRMAR EMAIL";
          const bestRegards = "Gracias por unirte a nuestro sitio.";
          const recipient_email = email;
          const sender_email = "mxsupercollectibles@gmail.com";
          const fromName = "Super Collectibles MX";

          const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: process.env.GOOGLE_MAIL,
              pass: process.env.GOOGLE_MAIL_PASS,
            },
          });

          try {
            // Verify your transporter
            //await transporter.verify();

            const mailOptions = {
              from: `"${fromName}" ${sender_email}`,
              to: recipient_email,
              subject,
              html: `
        <!DOCTYPE html>
        <html lang="es">
        <body>
        <p>${greeting}</p>
        <p>${title}</p>
        <div>${body}</div>
        <a href="${process.env.NEXTAUTH_URL}/exito?token=${user?.verificationToken}">${action}</a>
        <p>${bestRegards}</p>
        </body>
        
        </html>
        
        `,
            };
            await transporter.sendMail(mailOptions);

            return {
              error: {
                success: {
                  _errors: [
                    "El correo se envió exitosamente revisa tu bandeja de entrada y tu correo no deseado",
                  ],
                },
              },
            };
          } catch (error: any) {
            console.log(error);
          }
        } catch (error: any) {
          return { error: { email: { _errors: ["Error al enviar email"] } } };
        }
      }
    } catch (error: any) {
      console.log(error);
      throw Error(error);
    }
  } else {
    return {
      error: {
        email: { _errors: [`Failed Google Captcha Score: ${res.data?.score}`] },
      },
    };
  }
}

export async function resetAccountEmail(data: any) {
  let { email, gReCaptchaToken } = Object.fromEntries(data);
  const secretKey = process?.env?.RECAPTCHA_SECRET_KEY;

  //check for errors
  const { error: zodError } = VerifyEmailSchema.safeParse({
    email,
  });
  if (zodError) {
    return { error: zodError.format() };
  }

  const formData = `secret=${secretKey}&response=${gReCaptchaToken}`;
  let res: any;
  try {
    res = await axios.post(
      "https://www.google.com/recaptcha/api/siteverify",
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
    );
  } catch (e) {
    console.log("recaptcha error:", e);
  }

  if (res && res.data?.success && res.data?.score > 0.5) {
    // Save data to the database from here
    try {
      await dbConnect();
      const user = await User.findOne({ email: email });
      if (!user) {
        return { error: { email: { _errors: ["El correo no existe"] } } };
      }
      if (user?.active === false) {
        return {
          error: { email: { _errors: ["El correo no esta verificado"] } },
        };
      }
      if (user?._id) {
        try {
          const subject = "Desbloquear Cuenta Super Collectibles Mx";
          const body = `Por favor da click en desbloquear para reactivar tu cuenta`;
          const title = "Desbloquear Cuenta";
          const btnAction = "DESBLOQUEAR";
          const greeting = `Saludos ${user?.name}`;
          const bestRegards =
            "¿Problemas? Ponte en contacto mxsupercollectibles@gmail.com";
          const recipient_email = email;
          const sender_email = "mxsupercollectibles@gmail.com";
          const fromName = "Super Collectibles Mx";

          const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: process.env.GOOGLE_MAIL,
              pass: process.env.GOOGLE_MAIL_PASS,
            },
          });

          const mailOption = {
            from: `"${fromName}" ${sender_email}`,
            to: recipient_email,
            subject,
            html: `
              <!DOCTYPE html>
              <html lang="es">
              <body>
              <p>${greeting}</p>
              <p>${title}</p>
              <div>${body}</div>
              <a href="${process.env.NEXTAUTH_URL}/reiniciar?token=${user?.verificationToken}">${btnAction}</a>
              <p>${bestRegards}</p>
              </body>
              
              </html>
              
              `,
          };

          await transporter.sendMail(mailOption);

          return {
            error: {
              success: {
                _errors: [
                  "El correo electrónico fue enviado exitosamente revisa tu bandeja de entrada y spam",
                ],
              },
            },
          };
        } catch (error: any) {
          return { error: { email: { _errors: ["Failed to send email"] } } };
        }
      }
    } catch (error: any) {
      if (error) throw Error(error);
    }
  } else {
    return {
      error: {
        email: { _errors: [`Failed Google Captcha Score: ${res.data?.score}`] },
      },
    };
  }
}

function delay(milliseconds = 5000) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function createFBPost(pageId: string, prompt: string) {
  const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_KEY,
  });

  const aiPromptRequest = await openai.chat.completions.create({
    messages: [
      {
        role: "system",
        content: `You are an expert in Search Engine Optimization and engaging copywriting. Your task is to generate SEO-optimized content for a blog called Super Collectibles MX, which sells sports memorabilia, cartoons like Pokémon, Yu-Gi-Oh, and card games like Magic. Always output the response in the same structured JSON format.`,
      },
      {
        role: "user",
        content: `Generate an SEO-optimized title, description, social_media_post, and midjourney_image_prompt for the blog using the following concept: ${prompt}. The title, description, and social_media_post should be in Spanish, while the midjourney_image_prompt should be in English. Always return the response as JSON with these exact field names: "title", "description", "social_media_post", "midjourney_image_prompt".`,
      },
    ],
    model: "gpt-3.5-turbo-0125",
  });

  if (aiPromptRequest.choices[0].message.content) {
    await aiPromptRequest.choices[0].message.content.replace("```", "").trim();
    await aiPromptRequest.choices[0].message.content.replace("json", "").trim();

    const responseContent = JSON.parse(
      aiPromptRequest.choices[0].message.content,
    );

    // Parse the content manually
    // const extractContent = async (content: string) => {
    //   const lines = content.split("\n").filter((line) => line.trim() !== "");
    //   const result: any = {};

    //   lines.forEach((line) => {
    //     if (line.startsWith("Title:")) {
    //       result.title = line.replace("Title:", "").trim();
    //     } else if (line.startsWith("Description:")) {
    //       result.description = line.replace("Description:", "").trim();
    //     } else if (line.startsWith("Social Media Post:")) {
    //       result.social_summary = line.replace("Social Media Post:", "").trim();
    //     } else if (line.startsWith("Midjourney Image Prompt:")) {
    //       result.midjourney_prompt = line
    //         .replace("Midjourney Image Prompt:", "")
    //         .trim();
    //     }
    //   });

    //   return result;
    // };

    //const parsedResponse = await extractContent(responseContent);
    console.log("Parsed Response:", responseContent);

    const message = responseContent.social_media_post;
    const prompt = responseContent.midjourney_image_prompt;

    if (prompt) {
      const headers = {
        Authorization: `Bearer ${process.env.FB_API_TOKEN}`,
      };

      try {
        // Generate post image with MidJourney

        const midJourneyUrl = "https://api.goapi.ai/api/v1/task";

        const dataMidjourneyImagine = JSON.stringify({
          model: "midjourney",
          task_type: "imagine",
          input: {
            prompt: prompt,
            aspect_ratio: "1:1",
            process_mode: "fast",
            skip_prompt_check: false,
            bot_id: 0,
          },
          config: {
            service_mode: "",
            webhook_config: {
              endpoint: "",
              secret: "",
            },
          },
        });

        const configImagine = {
          method: "post",
          url: midJourneyUrl,
          headers: {
            "x-api-key": `${process.env.GO_API_AI_KEY}`,
            "Content-Type": "application/json",
          },
          data: dataMidjourneyImagine,
        };

        const responseMidJourney = await axios(configImagine);
        if (responseMidJourney.status === 200) {
          await delay(45000); // Default 10 seconds

          const dataMidjourneyUpscale = JSON.stringify({
            model: "midjourney",
            task_type: "upscale",
            input: {
              origin_task_id: responseMidJourney.data.data.task_id,
              index: "3",
            },
            config: {
              service_mode: "",
              webhook_config: {
                endpoint: "",
                secret: "",
              },
            },
          });
          const configUpscale = {
            method: "post",
            url: midJourneyUrl,
            headers: {
              "X-API-Key": `${process.env.GO_API_AI_KEY}`,
              "Content-Type": "application/json",
            },
            data: dataMidjourneyUpscale,
          };

          const responseMidJourneyUpscale = await axios(configUpscale);
          if (responseMidJourneyUpscale.status === 200) {
            await delay(45000); // Default 10 seconds
            const getImageConfig = {
              method: "get",
              url: `${midJourneyUrl}/${responseMidJourneyUpscale.data.data.task_id}`,
              headers: {
                "x-api-key": `${process.env.GO_API_AI_KEY}`,
              },
            };

            const responseMidJourneyGetImage = await axios(getImageConfig);

            if (
              responseMidJourneyGetImage.status === 200 &&
              responseMidJourneyGetImage.data.data.output.image_url !== ""
            ) {
              console.log("Successfully created MidJourney Image:");

              const postImage =
                responseMidJourneyGetImage.data.data.output.image_url;

              const data = {
                message: message,
                published: true,
                url: postImage,
              };
              const baseUrl = `https://graph.facebook.com/v21.0/${pageId}/photos`;
              const createFBPostResponse = await axios.post(baseUrl, data, {
                headers,
              });

              if (createFBPostResponse.status === 200) {
                console.log("Successfully created Facebook post:");
                const instagramId = "17841435543056975";
                const instagramBaseUrl = `https://graph.facebook.com/v21.0/${instagramId}/media`;
                const instagramData = {
                  caption: message,
                  image_url: postImage,
                };

                const instagramResponse = await axios.post(
                  instagramBaseUrl,
                  instagramData,
                  { headers },
                );

                if (instagramResponse.status === 200) {
                  console.log(
                    "Successfully created Instagram post:",
                    instagramResponse.data.id,
                  );

                  const mediaPublishData = {
                    creation_id: instagramResponse.data.id,
                  };
                  const publishToInstagramUrl = `https://graph.facebook.com/v21.0/${instagramId}/media_publish`;

                  const instagramPublishResponse = await axios.post(
                    publishToInstagramUrl,
                    mediaPublishData,
                    { headers },
                  );

                  console.log("Instagram Publish Response");

                  return { status: 200, data: instagramPublishResponse.data };
                }
              } else {
                console.error(
                  "Unexpected response status:",
                  createFBPostResponse.status,
                );
                return {
                  status: createFBPostResponse.status,
                  data: createFBPostResponse.data,
                };
              }
            }
          }
        }
        console.log(JSON.stringify(responseMidJourney.data));
      } catch (error: any) {
        console.error(
          "Failed to respond to Facebook post:",
          error.response?.data || error.message,
        );
        return { status: 400, error: error.response?.data || error.message };
      }
    }
  }
}

export async function subscribeToFbApp(pageId: string) {
  const fbPage = pageId || "107551511895797";

  // Expanded fields to get more user information
  const baseUrl = `https://graph.facebook.com/v21.0/${fbPage}/subscribed_apps?subscribed_fields=feed`;

  const headers = {
    Authorization: `Bearer ${process.env.FB_API_TOKEN}`,
  };
  const config: any = {
    method: "post",
    url: baseUrl,
    headers,
  };

  try {
    // console.log("Initial API Call URL:", nextPageUrl);

    const response: any = await axios(config);

    if (response && response.status === 200) {
      const subscribeResponse = response;
      console.log(subscribeResponse.data);

      return {
        status: 200,
        response: JSON.stringify(subscribeResponse.data),
      };
    }

    if (response && response.error) {
      /* handle the result */
      console.log(response.error);
      return {
        status: 400,
        response: JSON.stringify(response.error),
      };
    }
  } catch (error) {
    console.error("Catastrophic error in subscribing to Facebook page:", error);
    return { status: 400 };
  }
}

/**
 * Export selected products to TikTok Shop Excel format
 * with AI-optimized titles and descriptions
 */
export async function exportProductsToTikTok(productIds: string[]) {
  try {
    const session = await getServerSession(options);
    if (!session || !["manager", "sucursal"].includes(session?.user?.role)) {
      return {
        success: false,
        error: "No autorizado",
      };
    }

    if (!productIds || productIds.length === 0) {
      return {
        success: false,
        error: "No se seleccionaron productos",
      };
    }

    await dbConnect();

    // Import required utilities
    const { optimizeProductsBatch } = await import("@/lib/aiOptimizer");
    const { mapProductsBatchToTikTok } = await import("@/lib/tiktokMapper");
    const { generateTikTokExcelBase64, validateTikTokRows } =
      await import("@/lib/excelGenerator");

    // Fetch products from database
    const products = await Product.find({
      _id: { $in: productIds },
    }).lean();

    if (!products || products.length === 0) {
      return {
        success: false,
        error: "No se encontraron productos",
      };
    }

    // Prepare products for AI optimization
    const productsForAI = products.map((p: any) => ({
      title: p.title || "",
      description: p.description || "",
      category: p.category || "",
      brand: p.brand || "",
    }));

    // Optimize with AI
    const optimizedContents = await optimizeProductsBatch(productsForAI);

    // Map to TikTok format
    const tiktokRows = mapProductsBatchToTikTok(
      products as any,
      optimizedContents,
    );

    // Validate rows
    const validationErrors = validateTikTokRows(tiktokRows);
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `Errores de validación: ${validationErrors.join(", ")}`,
      };
    }

    // Generate Excel file as base64
    const fileName = `tiktok-products-${
      new Date().toISOString().split("T")[0]
    }`;
    const fileData = generateTikTokExcelBase64(tiktokRows, fileName);

    return {
      success: true,
      fileName: `${fileName}.xlsx`,
      fileData,
      productsProcessed: products.length,
    };
  } catch (error: any) {
    console.error("Error exporting to TikTok:", error);
    return {
      success: false,
      error: error.message || "Error al exportar productos",
    };
  }
}

export async function deleteOrder(
  orderId: string,
  action: "cancel" | "delete" = "delete",
) {
  "use server";
  try {
    await dbConnect();

    const session = await getServerSession(options);
    if (!session?.user || (session.user as any).role !== "super_admin") {
      return {
        success: false,
        error: "Solo super_admin puede procesar pedidos",
      };
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return {
        success: false,
        error: "Pedido no encontrado",
      };
    }

    const actionLabel = action === "cancel" ? "CANCELACIÓN" : "ELIMINACIÓN";

    // Restore inventory for each item in the order
    for (const item of order.orderItems || []) {
      const storeId = item.storeId;

      if (storeId) {
        const beforeInventory = await StoreInventory.findOne({
          store: storeId,
          product: item.product,
          variationId: item.variation,
        });

        const updatedInventory = await StoreInventory.findOneAndUpdate(
          {
            store: storeId,
            product: item.product,
            variationId: item.variation,
          },
          { $inc: { quantity: item.quantity } },
          { new: true },
        );
      } else {
        console.warn(`⚠ Advertencia: storeId no encontrado para este item`);
      }
    }

    if (action === "cancel") {
      order.orderStatus = "Cancelado";
      await order.save();
    } else {
      await Order.findByIdAndDelete(orderId);
    }

    revalidatePath("/admin/pedidos");
    revalidatePath("/puntodeventa/pedidos");

    return {
      success: true,
      message: `Pedido ${action === "cancel" ? "cancelado" : "eliminado"} correctamente`,
    };
  } catch (error: any) {
    console.error("❌ Error procesando orden:", error);
    console.error(`Stack: ${error.stack}`);
    return {
      success: false,
      error: error.message || "Error al procesar el pedido",
    };
  }
}
