import dbConnect from "@/lib/db";
import axios from "axios";
import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(req: any) {
  const cookie = await req.headers.get("cookie");
  if (!cookie) {
    // Not Signed in
    const notAuthorized = "You are not authorized no no no";
    return new Response(JSON.stringify(notAuthorized), {
      status: 400,
    });
  }
  try {
    await dbConnect();
    const { name, email, message, phone, honeypot, recaptcha } =
      await req.json();
    const secretKey = process?.env?.RECAPTCHA_SECRET_KEY;
    const formData = `secret=${secretKey}&response=${recaptcha}`;
    let response;
    try {
      response = await axios.post(
        "https://www.google.com/recaptcha/api/siteverify",
        formData,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
    } catch (error) {
      console.log("recaptcha error:", error);
      return NextResponse.json({
        success: false,
        message: "recaptcha error",
      });
    }

    if (response && response.data?.success && response.data?.score > 0.5) {
      if (honeypot) {
        return NextResponse.json({
          success: false,
          email,
          message: "no bots",
        });
      }

      const subject = "¡Mensaje Del formulario de contacto!";
      const phoneWithoutSpaces = phone.replace(/\s+/g, "");
      const greeting = `Estimado/a:`;
      const title = `${name} envió el siguiente mensaje:`;
      const bodyOne = message;
      const bodyTwo = `Puedes contactar por:`;
      const phoneContact = `Telefono:`;
      const emailContact = `Email:`;
      const senderName = "www.supercollectibles.com.mx";
      const bestRegards = "¡Creciendo tu presencia un contacto a la vez!";
      const contact_email = email;
      const sender_email = "supercollectiblesc12@gmail.com";

      var transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GOOGLE_MAIL,
          pass: process.env.GOOGLE_MAIL_PASS,
        },
      });

      const mailOption = {
        from: `"${name}" ${contact_email}`,
        to: sender_email,
        subject,
        html: `
    <!DOCTYPE html>
    <html lang="es">
    <body>
    <div>
    <p>${greeting}</p>
    <p>${title}</p>
    <p>${bodyOne}</p>
    <div>${bodyTwo}</div>
    <p>${phoneContact}</p>
    <a href="tel:${phoneWithoutSpaces}" target="_blank">${phone}</a>
    <p>${emailContact}</p>
    <div>${contact_email}</div>
    <p>${senderName}</p>
    <p>${bestRegards}</p>
    </div>
    </body>
    </html>
    `,
      };

      await transporter.sendMail(mailOption);
      return NextResponse.json(
        { message: "Email sent successfully" },
        { status: 200 }
      );
    } else {
      return NextResponse.json({
        success: false,
        email,
        score: response.data?.score,
      });
    }
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: JSON.stringify(error.message),
    });
  }
}
