import dbConnect from "@/lib/db";
import bcrypt from "bcrypt";
import User from "@/backend/models/User";
import Affiliate from "@/backend/models/Affiliate";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import { cstDateTime } from "@/backend/helpers";
import axios from "axios";
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
    const {
      name,
      email,
      password: pass,
      phone,
      honeypot,
      recaptcha,
    } = await req.json();
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
    } catch (error: any) {
      console.log("recaptcha error:", error);
    }

    if (response && response.data?.success && response.data?.score > 0.5) {
      if (honeypot) {
        return NextResponse.json({
          success: false,
          email,
          message: "no bots",
        });
      }
      // Save data to the database from here
      await dbConnect();
      const isExisting = await User?.findOne({ email });
      if (isExisting) {
        return NextResponse.json({
          success: false,
          email,
          message: "User is already registered",
        });
      }
      const telephone = phone.replace(/\s/g, ""); // Replace all whitespace characters with an empty string
      const isExistingAffiliatePhone = await Affiliate?.findOne({
        "contact.phone": telephone,
      });
      if (isExistingAffiliatePhone) {
        return NextResponse.json({
          success: false,
          telephone,
          message: "Teléfono ya esta en uso por otro asociado.",
        });
      }
      const hashedPassword = await bcrypt.hash(pass, 10);
      const newUser = new User({
        name,
        email,
        password: hashedPassword,
        role: "afiliado",
      });

      const newAffiliate = new Affiliate({
        user: { _id: newUser._id },
        fullName: newUser.name,
        email: newUser.email,
        dateOfBirth: cstDateTime(),
        address: {
          street: "Calle 132",
          city: "Mi Ciudad",
          province: "Mi estado",
          zip_code: "55644",
          country: "Mexico",
        },
        contact: {
          phone: telephone,
        },
        joinedAt: cstDateTime(),
        isActive: true,
      });

      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
      const account = await stripe.accounts.create({
        type: "express",
        email: email,
        settings: {
          payouts: {
            schedule: {
              delay_days: 28,
              interval: "daily",
            },
          },
        },
        metadata: {
          affiliateId: newAffiliate._id,
        },
      });
      newAffiliate.stripe_id = account.id;
      newUser.stripe_id = account.id;
      try {
        const subject = "Confirmar email";
        const body = `Por favor da click en confirmar email para verificar tu cuenta de afiliado.`;
        const title = "Completar registro de afiliado";
        const greeting = `Saludos ${name}`;
        const action = "CONFIRMAR EMAIL";
        const bestRegards = "Gracias por unirte a nuestro equipo de afiliados.";
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
            <a href="${
              process.env.NEXTAUTH_URL
            }/exito?token=${"verificationToken"}">${action}</a>
            <p>${bestRegards}</p>
            </body>
            
            </html>
            
            `,
        };

        await transporter.sendMail(mailOption);
        await newUser.save();
        await newAffiliate.save();
        return NextResponse.json({
          success: true,
          email,
          message: "Se mando el correo electrónico",
        });
      } catch (error) {
        return NextResponse.json({
          success: false,
          email,
          message: "No se pudo mandar el correo electrónico",
        });
      }
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
