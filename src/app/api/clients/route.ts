import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import User from "@/backend/models/User";
import APIClientFilters from "@/lib/APIClientFilters";

export const GET = async (request: any, res: any) => {
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
    let clientQuery;
    clientQuery = User.find({ role: "cliente" });

    const resPerPage = Number(request.headers.get("perpage")) || 5;
    // Extract page and per_page from request URL
    const page = Number(request.nextUrl.searchParams.get("page")) || 1;
    // total number of documents in database
    const clientsCount = await User.countDocuments();

    // Apply search Filters
    const apiClientFilters: any = new APIClientFilters(
      clientQuery,
      request.nextUrl.searchParams
    )
      .searchAllFields()
      .filter();

    let clientsData = await apiClientFilters.query;

    const filteredClientsCount = clientsData.length;

    apiClientFilters.pagination(resPerPage, page);
    clientsData = await apiClientFilters.query.clone();

    // If you want a new sorted array without modifying the original one, use slice
    // const sortedObj1 = obj1
    //   .slice()
    //   .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // descending order
    // descending order
    const sortedClients = clientsData
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const clients = {
      clients: sortedClients,
    };

    const dataPacket = {
      clients,
      clientsCount,
      filteredClientsCount,
      resPerPage,
    };
    return new Response(JSON.stringify(dataPacket), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Clients loading error",
      },
      { status: 500 }
    );
  }
};
