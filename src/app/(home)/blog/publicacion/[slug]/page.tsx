import { getOnePost } from "@/app/_actions";
import ViewPostDetails from "../../_components/ViewPostDetails";

const BlogPostPage = async ({ params }: { params: any }) => {
  const { slug } = await params;
  const data: any = await getOnePost(slug);
  const post = JSON.parse(data.post);
  const trendingProducts = JSON.parse(data.trendingProducts);
  return <ViewPostDetails post={post} trendingProducts={trendingProducts} />;
};

export default BlogPostPage;
