import dbConnect from "@/lib/db";
import Product from "@/backend/models/Product";

export async function GET(request: any) {
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
    const favoritesRaw = await request.headers.get("favorites");
    const newFavorites = JSON.parse(favoritesRaw);
    const id = session.user._id;
    const products = await Product.find({});

    const uniqueFavorites = newFavorites.filter(
      (favorite: any, index: any, self: any) =>
        index === self.findIndex((t: any) => t._id === favorite._id)
    );

    // Extract values from the Map to get an array of unique objects
    const uniqueObjects = Array.from(uniqueFavorites.values());
    return new Response(JSON.stringify(uniqueObjects), { status: 201 });
  } catch (error: any) {
    return new Response(JSON.stringify(error.message), { status: 500 });
  }
}
