import dbConnect from "@/lib/db";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { NextResponse } from "next/server";
import axios from "axios";
import Subscriber from "@/backend/models/Subscriber";

export async function POST(request: any) {
  const cookie = await request.headers.get("cookie");
  if (!cookie) {
    // Not Signed in
    const notAuthorized = "You are not authorized no no no";
    return new Response(JSON.stringify(notAuthorized), {
      status: 400,
    });
  }

  try {
    const { email, recaptcha, honeypot } = await request.json();
    if (honeypot) {
      console.log("no bots thank you!");
      throw new Error("hubo un error al iniciar session");
    }
    const secretKey = process?.env?.RECAPTCHA_SECRET_KEY;
    const formData = `secret=${secretKey}&response=${recaptcha}`;
    let response: any;
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
    }

    if (response && response.data?.success && response.data?.score > 0.5) {
      // Save data to the database from here
      await dbConnect();
      const isExisting = await Subscriber?.findOne({ email });
      if (isExisting) {
        return new Response("El correo electrónico ya está suscrito.", {
          status: 400,
        });
      }
      // Generate a random 64-byte token
      const verificationToken = crypto.randomBytes(64).toString("hex");

      const newUser = new Subscriber({
        email,
        verificationToken,
      });

      const res = await newUser.save();
      if (res?._id) {
        try {
          const subject = "Confirmar email";
          const body = `Por favor da click en confirmar email para verificar tu cuenta.`;
          const title = "Completar registro";
          const greeting = `Saludos`;
          const action = "CONFIRMAR EMAIL";
          const bestRegards = "Gracias por unirte a nuestro sitio.";
          const recipient_email = email;
          const sender_email = "mxsupercollectibles@gmail.com";
          const fromName = "Super Collectibles MX";

          var transporter = nodemailer.createTransport({
            service: "gmail",
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
            <a href="${process.env.NEXTAUTH_URL}/exito?token=${verificationToken}">${action}</a>
            <p>${bestRegards}</p>
            </body>
            
            </html>
            
            `,
          };

          await transporter.sendMail(mailOption);

          return NextResponse.json(
            { message: "Email sent successfully" },
            { status: 200 }
          );
        } catch (error) {
          console.log(error);
          return NextResponse.json(
            { message: "Failed to send email" },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({
        message: "New email subscribed",
        success: true,
        email,
        score: response.data?.score,
      });
    } else {
      return NextResponse.json({
        success: false,
        email,
        score: response.data?.score,
      });
    }
  } catch (error: any) {
    return new Response(JSON.stringify(error.message), { status: 500 });
  }
}
