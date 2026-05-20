import { sortBlogs } from "@/backend/helpers";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import Tag from "@/components/layouts/Tag";

const BlogCoverSection = ({ blogs }: { blogs: any }) => {
  const sortedBlogs = sortBlogs(blogs);
  const blog = sortedBlogs[0];

  return (
    <div className="w-full inline-block">
      <article className="flex flex-col items-start justify-end mx-5 sm:mx-10 relative h-[60vh] sm:h-[85vh]">
        <div
          className="absolute top-0 left-0 bottom-0 right-0 h-full
            bg-gradient-to-b from-transparent from-0% to-zinc-950  z-0
            "
        />
        <Image
          src={blog?.mainImage || "/images/next.svg"}
          alt={blog?.mainTitle}
          fill
          className="w-full h-full object-center object-cover  -z-10"
          sizes="(max-width: 1080px) 100vw, (max-width: 1200px) 100vw, 33vw"
          priority
        />

        <div className="w-full lg:w-3/4 p-6 sm:p-8 md:p-12  lg:p-16 flex flex-col items-start justify-center z-0 text-light">
          <span className="text-white">
            <Tag
              link={`/blog/categorias/${blog?.category}`}
              name={blog?.category}
            />
          </span>

          <Link href={`/blog/publicacion/${blog?.slug}`} className="mt-6">
            <h1 className="font-bold text-white font-EB_Garamond capitalize text-lg sm:text-xl md:text-3xl lg:text-4xl">
              <span
                className="bg-gradient-to-r from-orange-400 to-orange-600
                bg-[length:0px_2px]
                hover:bg-[length:100%_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 "
              >
                {blog?.mainTitle}
              </span>
            </h1>
          </Link>
          <p className="hidden  text-white sm:inline-block mt-4 md:text-lg lg:text-xl font-raleway">
            {blog?.sectionTwoParagraphOne.substring(0, 90)}...
          </p>
        </div>
      </article>
    </div>
  );
};

export default BlogCoverSection;
