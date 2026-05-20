import Tag from "@/components/layouts/Tag";
import Link from "next/link";
import Image from "next/image";

const BlogLayoutOne = ({ blog }: { blog: any }) => {
  return (
    <div className="group relative h-full overflow-hidden ">
      <div
        className="absolute top-0 left-0 bottom-0 right-0 h-full
            bg-gradient-to-b from-transparent from-0% to-zinc-950  z-10
            "
      />
      <Image
        src={blog?.mainImage || "/images/next.svg"}
        placeholder="blur"
        blurDataURL={blog?.mainImage || "/images/next.svg"}
        alt={blog?.mainTitle || "img"}
        width={800}
        height={800}
        className="w-full h-full object-center object-cover  group-hover:scale-105 transition-all ease duration-300"
        sizes="(max-width: 1180px) 100vw, 50vw"
      />

      <div className="w-full absolute bottom-0 p-4 xs:p-6 sm:p-10 z-20">
        <Tag
          link={`/blog/categorias/${blog?.category}`}
          name={blog?.category}
          className="px-6 text-xs  maxsm:text-sm py-1 sm:py-2 !border text-white"
        />
        <Link href={`/blog/publicacion/${blog?.slug}`} className="mt-6">
          <h2 className="font-bold capitalize text-sm xs:text-base sm:text-xl md:text-2xl text-light mt-2 sm:mt-4">
            <span
              className="bg-gradient-to-r text-white font-EB_Garamond from-orange-400 to-orange-600 bg-[length:0px_2px] dark:from-accentDark/50 dark:to-accentDark/50
                group-hover:bg-[length:100%_2px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500 "
            >
              {blog?.mainTitle}
            </span>
          </h2>
        </Link>
      </div>
    </div>
  );
};

export default BlogLayoutOne;
