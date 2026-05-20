import BlogCoverSection from "../_components/BlogCoverSection";
import FeaturedPosts from "../_components/FeaturedPosts";
import RecentPosts from "../_components/RecentPosts";
import { getAllPost } from "@/app/_actions";

export const metadata = {
  title: "Super Collectibles Blog",
  description: "Ven y explora nuestro blog y descubre artículos de moda.",
};

const AllPostsPage = async ({ searchParams }: { searchParams: any }) => {
  const urlParams = {
    keyword: searchParams.keyword,
    page: searchParams.page,
  };
  const filteredUrlParams = Object.fromEntries(
    Object.entries(urlParams).filter(([key, value]) => value !== undefined)
  );
  const searchQuery = new URLSearchParams(filteredUrlParams).toString();
  const data = await getAllPost(searchQuery);
  const posts = JSON.parse(data.posts);
  return (
    <>
      <main className="flex flex-col items-center justify-center mt-10">
        <BlogCoverSection blogs={posts} />
        <FeaturedPosts blogs={posts} />
        <RecentPosts blogs={posts} />
      </main>
    </>
  );
};

export default AllPostsPage;
