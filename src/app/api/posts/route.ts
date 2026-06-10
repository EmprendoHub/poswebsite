export const dynamic = "force-dynamic";
import Post from "@/backend/models/Post";
import { NextResponse } from "next/server";
import APIPostsFilters from "@/lib/APIPostsFilters";
import dbConnect from "@/lib/db";

export async function GET(request: any) {
  const cookie = await request.headers.get("cookie");
  if (!cookie) {
    // Not Signed in
    const notAuthorized = "You are not authorized no no no";
    return new Response(JSON.stringify(notAuthorized), {
      status: 400,
    });
  }

  try {
    await dbConnect();
    let postQuery;
    if (["manager", "super_admin"].includes(cookie?.user?.role as string)) {
      postQuery = Post.find();
    } else {
      postQuery = Post.find({ published: true });
    }

    const resPerPage = 10;
    // Extract page and per_page from request URL
    const page = Number(request.nextUrl.searchParams.get("page")) || 1;
    // total number of documents in database
    const itemCount = await Post.countDocuments();
    // Extract all possible categories
    const allCategories = await Post.distinct("category");

    // Apply search Filters
    const apiPostFilters: any = new APIPostsFilters(
      postQuery,
      request.nextUrl.searchParams,
    )
      .searchAllFields()
      .filter();

    let postsData = await apiPostFilters.query;

    const filteredPostsCount = postsData.length;

    // Pagination filter
    apiPostFilters.pagination(resPerPage, page);
    postsData = await apiPostFilters.query.clone();
    // If you want a new sorted array without modifying the original one, use slice
    // const sortedObj1 = obj1
    //   .slice()
    //   .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    // descending order
    // descending order
    const sortedPosts = postsData
      .slice()
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    const posts = {
      posts: sortedPosts,
    };

    const dataPacket = {
      posts,
      itemCount,
      filteredPostsCount,
    };
    return new Response(JSON.stringify(dataPacket), { status: 201 });
  } catch (error) {
    console.log("error", error);
    return NextResponse.json(
      {
        error: "Posts loading error",
      },
      { status: 500 },
    );
  }
}
