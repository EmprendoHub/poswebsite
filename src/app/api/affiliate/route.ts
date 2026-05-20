import Affiliate from "@/backend/models/Affiliate";
import dbConnect from "@/lib/db";
import { getToken } from "next-auth/jwt";

export async function GET(request: any) {
  const token: any = await getToken({ req: request });
  const cookie = await request.headers.get("cookie");
  if (token || cookie) {
    let id;
    if (token) {
      id = token.user._id;
    } else {
      const urlData = await request.url.split("?");
      id = urlData[1];
    }
    try {
      await dbConnect();
      const affiliateData = await Affiliate.findOne({ _id: id });

      return new Response(JSON.stringify(affiliateData), { status: 201 });
    } catch (error: any) {
      return new Response(JSON.stringify(error.message), { status: 500 });
    }
  } else {
    // Not Signed in

    return new Response("You are not authorized, eh eh eh, no no no", {
      status: 400,
    });
  }
}
