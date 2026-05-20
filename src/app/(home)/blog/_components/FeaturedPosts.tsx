import { sortBlogs } from "@/backend/helpers";
import BlogLayoutOne from "./BlogLayoutOne";
import BlogLayoutTwo from "./BlogLayoutTwo";

const FeaturedPosts = ({ blogs }: { blogs: any }) => {
  const sortedBlogs = sortBlogs(blogs);
  return (
    <section className="w-full mt-16 sm:mt-24  md:mt-32 px-5 sm:px-10 md:px-12  sxl:px-32 flex flex-col items-center justify-center">
      <h2 className="w-full font-EB_Garamond inline-block font-bold capitalize text-2xl md:text-4xl text-dark dark:text-light">
        Publicaciones destacadas
      </h2>

      <div className="flex flex-row maxmd:flex-col gap-6  mt-10 maxsm:mt-16">
        <article className="w-full relative">
          <BlogLayoutOne blog={sortedBlogs[1]} />
        </article>
        <div className="flex w-full flex-col gap-6 ">
          <article className=" relative">
            <BlogLayoutTwo blog={sortedBlogs[2]} />
          </article>
          <article className="relative">
            <BlogLayoutTwo blog={sortedBlogs[3]} />
          </article>
        </div>
      </div>
    </section>
  );
};

export default FeaturedPosts;
