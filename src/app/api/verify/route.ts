import Subscriber from "@/backend/models/Subscriber";
import User from "@/backend/models/User";
import { NextResponse } from "next/server";

export async function POST(request: any) {
  const cookie = await request.headers.get("cookie");
  const token = await request.headers.get("token");
  if (!cookie) {
    // Not Signed in
    const notAuthorized = "You are not authorized no no no";
    return new Response(JSON.stringify(notAuthorized), {
      status: 400,
    });
  }
  try {
    const verifiedUser = await User.findOne({
      verificationToken: token,
    });
    const verifiedSubscriber = await Subscriber.findOne({
      verificationToken: token,
    });
    if (verifiedUser) {
      verifiedUser.active = true;
      verifiedUser.save();
      return NextResponse.json(
        { message: "Email verificado" },
        { status: 200 }
      );
    } else if (verifiedSubscriber) {
      verifiedSubscriber.active = true;
      verifiedSubscriber.save();
      return NextResponse.json(
        { message: "Email verificado" },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { message: "Email no verificado" },
        { status: 200 }
      );
    }
  } catch (error) {
    return NextResponse.json(
      { message: "No se pudo verificar el correo electrónico" },
      { status: 500 }
    );
  }
}
