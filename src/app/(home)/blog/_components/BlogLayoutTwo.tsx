import { formatDate } from "@/backend/helpers";
import Image from "next/image";
import Link from "next/link";

const BlogLayoutTwo = ({ blog }: { blog: any }) => {
  return (
    <div className="group flex flex-row maxmd:flex-col gap-4 items-center text-dark dark:text-light">
      <Link
        href={`/blog/publicacion/${blog?.slug}` || "/"}
        className="w-full  h-full  overflow-hidden"
      >
        <Image
          src={blog?.mainImage || "/images/next.svg"}
          placeholder="blur"
          blurDataURL={blog?.mainImage || "/images/next.svg"}
          alt={blog?.mainTitle || "img"}
          width={800}
          height={800}
          className="aspect-square w-full h-full object-cover object-center group-hover:scale-105 transition-all ease duration-300"
          sizes="(max-width: 640px) 100vw,(max-width: 1024px) 50vw, 33vw"
        />
      </Link>

      <div className=" w-full">
        <span className="inline-block font-black w-full uppercase text-accent dark:text-accentDark text-xs sm:text-sm">
          <Link href={`/blog/categorias/${blog?.category}`}>
            {blog?.category}
          </Link>
        </span>
        <Link
          href={`/blog/publicacion/${blog?.slug}` || "/"}
          className="inline-block my-1"
        >
          <h2 className="font-semibold capitalize text-base sm:text-lg">
            <span
              className="bg-gradient-to-r font-EB_Garamond from-orange-400 to-orange-600 bg-[length:0px_2px]
                group-hover:bg-[length:100%_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 "
            >
              {blog?.mainTitle}
            </span>
          </h2>
        </Link>

        <span className="inline-block font-EB_Garamond w-full capitalize text-gray dark:text-light/50 font-semibold  text-xs sm:text-base">
          {formatDate(new Date(blog?.createdAt))}
        </span>
      </div>
    </div>
  );
};

export default BlogLayoutTwo;
