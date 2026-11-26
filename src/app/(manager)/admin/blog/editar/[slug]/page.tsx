import { getOnePost } from "@/app/_actions";
import BlogPublishedComponent from "../../_components/BlogPublishedComponent";

const PostDetailsPage = async ({ params }: { params: any }) => {
  const { slug } = await params;
  const data = await getOnePost(slug);
  const post = JSON.parse(data.post);
  return <BlogPublishedComponent post={post} />;
};

export default PostDetailsPage;
