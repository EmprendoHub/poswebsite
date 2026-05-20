import Commission from "@/backend/models/Commission";
import dbConnect from "@/lib/db";
import { getToken } from "next-auth/jwt";

export async function GET(request: any) {
  const token = await request.headers.get("cookie");
  if (token) {
    try {
      await dbConnect();
      const commissionsCollection = await Commission.find({
        affiliateId: token?._id,
      });

      return new Response(JSON.stringify(commissionsCollection), {
        status: 201,
      });
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
