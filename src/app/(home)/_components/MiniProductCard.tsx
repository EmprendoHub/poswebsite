"use client";
import Image from "next/image";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { motion } from "framer-motion";
import Link from "next/link";
import { addToFavorites } from "@/redux/shoppingSlice";
import { useDispatch } from "react-redux";
import { IoMdHeart } from "react-icons/io";
import { calculatePercentage } from "@/backend/helpers";

const MiniProductCard = ({ item }: { item: any }) => {
  const dispatch = useDispatch();
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ duration: 1.0 }}
      className=" relative py-2"
    >
      <Link href={`/producto/${item.slug}`}>
        <div className="h-[200px] w-[200px]  relative">
          <Image
            src={item?.images[0].url}
            alt="product image"
            className=" ease-in-out duration-500 w-full h-full object-cover group-hover:scale-110 rounded-t-sm"
            width={450}
            height={450}
          />

          {item?.sale_price && (
            <span className="absolute top-2 right-2  border-[1px] border-black font-medium text-[12px] py-1 px-3 rounded-sm bg-black text-slate-100 group-hover:bg-slate-100 group-hover:text-foreground duration-200">
              Oferta
            </span>
          )}
          {item?.stock <= 0 && (
            <span className="absolute rotate-12 top-1/2 right-4  maxsm:-right-4  border-[1px] border-black font-medium text-[12px] py-1 px-3 rounded-sm bg-black text-slate-100 group-hover:bg-primary group-hover:text-foreground duration-200">
              VENDIDO
            </span>
          )}
        </div>
      </Link>
      <div className="absolute top-2 right-2  maxsm:right-2 ">
        {/* add to favorites button */}
        <motion.button
          whileHover={{ scale: 1.07 }}
          whileTap={{ scale: 0.9 }}
          className="bg-black h-5 w-5 text-xs flex flex-row rounded-full justify-center gap-x-2 items-center tracking-wide text-slate-100 hover:bg-primary hover:text-white duration-500"
          onClick={() => dispatch(addToFavorites(item))}
        >
          <IoMdHeart />
        </motion.button>
      </div>
      <div className=" px-2 pb-2 flex flex-col border-card rounded-b-sm text-black">
        <div className="flex items-center justify-between gap-x-1">
          <p className="tracking-wide text-[12px]">
            {item?.title.substring(0, 20) + "..."}
          </p>
        </div>

        <div className="pricing-class flex fle-row items-center gap-x-2">
          {item?.sale_price ? (
            <div>
              <div className="flex items-center gap-x-2">
                <p className="line-through text-sm text-foreground font-bodyFont">
                  <FormattedPrice amount={item?.sale_price} />
                </p>
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
        <div className="">
          <p className="font-semibold">
            <FormattedPrice
              amount={
                item?.variations[0]?.price > 0
                  ? item?.variations[0].price
                  : item?.sale_price
              }
            />
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default MiniProductCard;
