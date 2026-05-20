import dbConnect from "@/lib/db";
import { getToken } from "next-auth/jwt";
import Affiliate from "@/backend/models/Affiliate";
import { NextResponse } from "next/server";
import APIAffiliateFilters from "@/lib/APIAffiliateFilters";

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
    let affiliateQuery;
    affiliateQuery = Affiliate.find({});

    const resPerPage = Number(request.headers.get("perpage")) || 5;
    // Extract page and per_page from request URL
    const page = Number(request.nextUrl.searchParams.get("page")) || 1;
    // total number of documents in database
    const affiliatesCount = await Affiliate.countDocuments();

    // Apply search Filters
    const apiAffiliateFilters: any = new APIAffiliateFilters(
      affiliateQuery,
      request.nextUrl.searchParams
    )
      .searchAllFields()
      .filter();

    let affiliatesData = await apiAffiliateFilters.query;

    const filteredAffiliatesCount = affiliatesData.length;

    apiAffiliateFilters.pagination(resPerPage, page);
    affiliatesData = await apiAffiliateFilters.query.clone();

    // If you want a new sorted array without modifying the original one, use slice
    // const sortedObj1 = obj1
    //   .slice()
    //   .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // descending order
    // descending order
    const sortedAffiliates = affiliatesData
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const affiliates = {
      affiliates: sortedAffiliates,
    };

    const dataPacket = {
      affiliates,
      affiliatesCount,
      filteredAffiliatesCount,
      resPerPage,
    };
    return new Response(JSON.stringify(dataPacket), { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Affiliates loading error",
      },
      { status: 500 }
    );
  }
}
