import dbConnect from "@/lib/db";
import Address from "@/backend/models/Address";

export async function GET(request: Request) {
  const sessionRaw = request.headers.get("session");
  const session = sessionRaw ? JSON.parse(sessionRaw) : null;

  if (!session) {
    // Not Signed in
    return new Response("You are not authorized, eh eh eh, no no no", {
      status: 401,
    });
  }

  try {
    await dbConnect();
    const addresses = await Address.find({ user: session.user?._id });

    return new Response(JSON.stringify(addresses), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
