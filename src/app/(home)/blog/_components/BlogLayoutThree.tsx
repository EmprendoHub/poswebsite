import { formatDate } from "@/backend/helpers";
import Image from "next/image";
import Link from "next/link";
import React from "react";

const BlogLayoutThree = ({ blog }: { blog: any }) => {
  return (
    <div className="group flex flex-col items-center text-dark dark:text-light">
      <Link
        href={`/blog/publicacion/${blog?.slug}`}
        className="h-full  overflow-hidden"
      >
        <Image
          src={blog?.mainImage || "/images/next.svg"}
          placeholder="blur"
          blurDataURL={blog?.mainImage || "/images/next.svg"}
          alt={blog?.title}
          width={300}
          height={300}
          className=" aspect-[4/3] w-full h-full object-cover object-center  group-hover:scale-105 transition-all ease duration-300 "
          sizes="(max-width: 640px) 100vw,(max-width: 1024px) 50vw, 33vw"
        />
      </Link>

      <div className="flex flex-col w-full mt-4">
        <span className="uppercase text-accent dark:text-accentDark font-semibold text-xs sm:text-sm">
          <Link href={`/blog/categorias/${blog?.category}`}>
            {blog?.category}
          </Link>
        </span>
        <Link
          href={`/blog/publicacion/${blog?.slug}`}
          className="inline-block my-1"
        >
          <h2 className="font-semibold capitalize  text-base sm:text-lg">
            <span
              className="bg-gradient-to-r from-orange-400 to-orange-600
              bg-[length:0px_2px] font-EB_Garamond
              group-hover:bg-[length:100%_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 "
            >
              {blog?.title}
            </span>
          </h2>
        </Link>

        <span className="capitalize text-muted font-semibold text-sm  maxsm:text-base">
          {formatDate(new Date(blog?.createdAt))}
        </span>
      </div>
    </div>
  );
};

export default BlogLayoutThree;
