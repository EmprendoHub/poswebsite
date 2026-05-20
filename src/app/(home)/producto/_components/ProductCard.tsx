"use client";
import Image from "next/image";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useDispatch, useSelector } from "react-redux";
import { IoMdCart, IoMdCheckmark } from "react-icons/io";
import { calculatePercentage } from "@/backend/helpers";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { addToCart } from "@/redux/shoppingSlice";

const ProductCard = ({ item, index }: { item: any; index: number }) => {
  const dispatch = useDispatch();
  const { productsData } = useSelector((state: any) => state?.compras);
  const [alreadyCart, setAlreadyCart] = useState(false);
  const [added, setAdded] = useState(false);
  const [variation, setVariation]: any = useState({
    _id: item?.variations[0]._id || "",
    size: item?.variations[0].size || "",
    color: item?.variations[0].color || "",
    colorHex: item?.variations[0].colorHex || "",
    price: item?.variations[0].price || "",
    stock: item?.variations[0].stock || "",
    image: item?.variations[0].image || "",
  });

  const handleClick = () => {
    const v = { ...variation };
    v.item = item._id;
    v.variation = v._id;
    v.title = item.title;
    v.image = [{ url: variation.image }];
    v.quantity = 1;
    v.brand = item.brand;
    v.weight = item.weight || 0.5;
    v.length = item.dimensions?.length || 15;
    v.width = item.dimensions?.width || 15;
    v.height = item.dimensions?.height || 10;
    dispatch(addToCart(v));
    toast(`${item?.title.substring(0, 15)}... se agrego al carrito`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  useEffect(() => {
    // Find matches based on _id property
    const existingProduct = productsData.find((item1: any) =>
      item.variations.some((item2: any) => item1._id === item2._id),
    );
    const existingVariation = item.variations.find((item1: any) =>
      productsData.some((item2: any) => item1._id === item2._id),
    );

    if (existingProduct?.quantity >= existingVariation?.stock) {
      setAlreadyCart(true);
    }
    // eslint-disable-next-line
  }, [productsData]);

  return (
    <motion.div
      initial={{ y: 2 }}
      whileInView={{ y: 0 }}
      transition={{ duration: 1 }}
      className=" max-w-content relative  overflow-hidden"
    >
      <Link href={`/producto/${item.slug}`}>
        <div className="h-[250px] w-full  group  relative overflow-hidden">
          <Image
            src={item?.images[0].url}
            alt="item image"
            className=" ease-in-out duration-500 w-full h-full object-cover group-hover:scale-110"
            width={450}
            height={450}
          />

          {/* Hover overlay — slides up with product details */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3 pointer-events-none">
            <p className="text-white font-EB_Garamond font-bold text-sm uppercase leading-tight translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
              {item?.title}
            </p>
            {item?.brand && (
              <p className="text-gray-300 text-[11px] translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">
                {item?.brand}
              </p>
            )}
            {item?.category && (
              <p className="text-primary text-[11px] translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-100 mt-0.5">
                {item?.category}
              </p>
            )}
          </div>

          <div className="absolute top-2 right-2  maxsm:right-2 ">
            {/* add to favorites button */}
            {/* <motion.button
              whileHover={{ scale: 1.07 }}
              whileTap={{ scale: 0.9 }}
              className="bg-black h-5 w-5 text-sm flex flex-row rounded-full justify-center gap-x-2 items-center tracking-wide text-slate-100 hover:bg-primary hover:text-white duration-500"
              onClick={() => dispatch(addToFavorites(item))}
            >
              <IoMdHeart size={14} />
            </motion.button> */}
          </div>

          {item?.sale_price && (
            <span className="absolute top-2 right-2  border-[1px] border-black font-medium text-xl py-1 px-3 rounded-sm bg-black text-slate-100 group-hover:bg-slate-100 group-hover:text-foreground duration-200">
              Oferta
            </span>
          )}
          {item?.stock <= 0 && (
            <span className="absolute -rotate-12 top-1/2 right-4 maxsm:right-[10%] border-[1px] border-primary font-medium text-[12px] py-1 px-3 rounded-sm bg-black text-slate-100 group-hover:bg-primary group-hover:text-foreground duration-200">
              VENDIDO
            </span>
          )}
          {item?.sale_price ? (
            <div>
              <div className="absolute top-2 left-2  border-[1px] border-black w-fit py-1 px-4 rounded-sm text-xs bg-black text-slate-100 group-hover:bg-slate-100 group-hover:text-foreground duration-200">
                <p>
                  {calculatePercentage(item?.price, item?.sale_price)}% menos
                </p>
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
      </Link>
      <div className=" px-0.5 pb-4 flex flex-col border-card rounded-b-sm">
        <p className="text-center text-white tracking-wide font-EB_Garamond text-base font-bold uppercase">
          {item?.title.substring(0, 18)}
        </p>

        <div className="pricing-class flex fle-row items-center justify-center gap-x-2 text-center">
          {/* <div className="flex flex-col gap-y-1">
            <p className="font-semibold text-foreground tracking-wider text-4xl">
              {item?.sale_price > 0 ? (
                <FormattedPrice amount={item?.sale_price} />
              ) : item?.price > 0 ? (
                <FormattedPrice amount={item?.price} />
              ) : (
                ""
              )}
            </p>
          </div> */}
          {item?.sale_price ? (
            <div>
              <div className="flex items-center gap-x-2">
                <p className="line-through text-sm text-white font-bodyFont">
                  <FormattedPrice amount={item?.price} />
                </p>
              </div>
            </div>
          ) : (
            ""
          )}
        </div>
        <div className="">
          <p className="font-semibold  tracking-wide text-2xl text-center text-white">
            <FormattedPrice
              amount={
                item?.variations[0]?.price > 0
                  ? item?.variations[0].price
                  : (item?.sale_price ?? item?.sale_price)
              }
            />
          </p>
        </div>
        {/* add to cart button */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="flex items-center justify-center group mt-3 "
        >
          {alreadyCart ? (
            <Link href="/carrito">
              <span className="  border-black p-3 text-base text-slate-100 rounded-full border  drop-shadow-md flex flex-row items-center justify-between   gap-x-4 bg-primary ease-in-out  duration-300 w-auto tracking-wider cursor-not-allowed ">
                {"En Carrito"}
              </span>
            </Link>
          ) : (
            <motion.button
              disabled={variation?.stock <= 0}
              whileHover={{ scale: added ? 1 : 1.07 }}
              whileTap={{ scale: 0.9 }}
              animate={added ? { scale: [1, 1.15, 1] } : {}}
              transition={added ? { duration: 0.3 } : {}}
              className={`${
                added
                  ? "bg-green-700 border-green-700 text-white"
                  : variation?.stock <= 0
                    ? "bg-slate-300 grayscale-0 text-foreground border-slate-300"
                    : "text-white border-black bg-primary"
              } border drop-shadow-md flex flex-row items-center justify-center px-6 py-4 gap-x-2 text-xs ease-in-out duration-300 w-full uppercase tracking-wider cursor-pointer transition-colors`}
              onClick={handleClick}
            >
              <AnimatePresence mode="wait">
                {added ? (
                  <motion.span
                    key="added"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 18 }}
                    className="flex items-center gap-x-2 "
                  >
                    <IoMdCheckmark size={16} />
                    ¡Agregado!
                  </motion.span>
                ) : (
                  <motion.span
                    key="cart"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-x-2"
                  >
                    {variation?.stock <= 0
                      ? "Out of Stock"
                      : "Agregar a carrito"}
                    <span
                      className={`${
                        variation?.stock <= 0 ? "text-foreground" : "text-white"
                      } text-lg`}
                    >
                      <IoMdCart size={16} />
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          )}
        </motion.div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
