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
import { useRouter } from "next/navigation";
import { addToCart } from "@/redux/shoppingSlice";

interface ProductCardProps {
  item: any;
  index: number;
  storeInventoryData?: Record<
    string,
    Array<{ variationId: string; quantity: number }>
  >;
}

const ProductCard = ({ item, index, storeInventoryData }: ProductCardProps) => {
  const dispatch = useDispatch();
  const router = useRouter();
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
    // Use product's main image (displayed on card) or fallback to variation.image
    v.image = [{ url: item?.images[0]?.url || variation.image }];
    v.quantity = 1;
    v.brand = item.brand;
    v.weight = item.weight || 0.5;
    v.length = item.dimensions?.length || 15;
    v.width = item.dimensions?.width || 15;
    v.height = item.dimensions?.height || 10;
    v.discountPercentage = item.discountPercentage || 0;
    dispatch(addToCart(v));
    toast(`${item?.title.substring(0, 15)}... se agrego al carrito`);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      router.push("/carrito");
    }, 1600);
  };

  // Get total stock for a variation from storeInventory data (passed as prop), fallback to variation.stock
  const getVariationStock = (
    variationId: string,
    fallbackStock: number,
  ): number => {
    if (!storeInventoryData || !storeInventoryData[item._id]) {
      return fallbackStock;
    }
    const inventory = storeInventoryData[item._id];
    const found = inventory.find((r) => r.variationId === variationId);
    return found ? found.quantity : fallbackStock;
  };

  // Check if product brand requires a quote
  const isQuoteRequiredBrand = () => {
    const quoteBrands = [
      "PSA",
      "Beckett",
      "CGC",
      "AGS",
      "Icons",
      "GMA",
      "SGC",
      "BGS",
    ];
    return quoteBrands.some(
      (brand) => item?.brand?.toLowerCase() === brand.toLowerCase(),
    );
  };

  // Generate WhatsApp message with specific number
  const getWhatsAppMessage = () => {
    const message = `Hola, me gustaría obtener una cotización para el producto: ${item?.title}. Marca: ${item?.brand}. Gracias.`;
    return encodeURIComponent(message);
  };

  useEffect(() => {
    // Find matches based on _id property
    const existingProduct = productsData.find((item1: any) =>
      item.variations.some((item2: any) => item1._id === item2._id),
    );
    const existingVariation = item.variations.find((item1: any) =>
      productsData.some((item2: any) => item1._id === item2._id),
    );

    const availableStock = getVariationStock(
      existingVariation?._id,
      existingVariation?.stock || 0,
    );

    if (existingProduct?.quantity >= availableStock) {
      setAlreadyCart(true);
    } else {
      setAlreadyCart(false);
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
          {item?.discountPercentage && item?.discountPercentage > 0 && (
            <span className="absolute top-12 right-2 border-[1px] border-green-600 font-medium text-sm py-1 px-3 rounded-sm bg-green-900/80 text-green-200 group-hover:bg-green-800 group-hover:text-white duration-200">
              {item?.discountPercentage}% DESC
            </span>
          )}
          {(() => {
            const storeTotal = getVariationStock(
              item?.variations[0]?._id,
              item?.variations[0]?.stock || 0,
            );
            return storeTotal <= 0 ? (
              <span className="absolute -rotate-12 top-1/2 right-4 maxsm:right-[10%] border-[1px] border-primary font-medium text-[12px] py-1 px-3 rounded-sm bg-black text-slate-100 group-hover:bg-primary group-hover:text-foreground duration-200">
                VENDIDO
              </span>
            ) : null;
          })()}
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

        {!isQuoteRequiredBrand() && (
          <>
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
            <div className=" flex items-center justify-center gap-x-2">
              <p className="font-semibold  tracking-wide text-2xl text-center text-white">
                <FormattedPrice
                  amount={(() => {
                    const basePrice =
                      item?.variations[0]?.price > 0
                        ? item?.variations[0].price
                        : (item?.sale_price ?? item?.price);

                    // Apply product-level discount if present
                    if (
                      item?.discountPercentage &&
                      item?.discountPercentage > 0
                    ) {
                      return basePrice * (1 - item.discountPercentage / 100);
                    }
                    return basePrice;
                  })()}
                />
              </p>
              {item?.discountPercentage && item?.discountPercentage > 0 ? (
                <p className="text-xs text-gray-400 line-through">
                  <FormattedPrice
                    amount={
                      item?.variations[0]?.price > 0
                        ? item?.variations[0].price
                        : (item?.sale_price ?? item?.price)
                    }
                  />
                </p>
              ) : null}
            </div>
          </>
        )}
        {/* Add to Cart Button - Hidden for quote brands */}
        {!isQuoteRequiredBrand() && (
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
              (() => {
                const storeTotal = getVariationStock(
                  variation?._id,
                  variation?.stock || 0,
                );
                return (
                  <motion.button
                    disabled={storeTotal <= 0}
                    whileHover={{ scale: added ? 1 : 1.07 }}
                    whileTap={{ scale: 0.9 }}
                    animate={added ? { scale: [1, 1.15, 1] } : {}}
                    transition={added ? { duration: 0.3 } : {}}
                    className={`${
                      added
                        ? "bg-green-700 border-green-700 text-white"
                        : storeTotal <= 0
                          ? "bg-slate-300 grayscale-0 text-foreground border-slate-300"
                          : "text-white border-black bg-primary"
                    } border drop-shadow-md flex flex-row items-center justify-center px-6 py-4 gap-x-2 text-xs ease-in-out duration-300 w-full uppercase tracking-wider cursor-pointer transition-colors rounded-xl`}
                    onClick={handleClick}
                  >
                    <AnimatePresence mode="wait">
                      {added ? (
                        <motion.span
                          key="added"
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 18,
                          }}
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
                          {storeTotal <= 0
                            ? "Out of Stock"
                            : "Agregar a carrito"}
                          <span
                            className={`${
                              storeTotal <= 0 ? "text-foreground" : "text-white"
                            } text-lg`}
                          >
                            <IoMdCart size={16} />
                          </span>
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                );
              })()
            )}
          </motion.div>
        )}

        {/* WhatsApp Get Quote Button - Replaces Add to Cart for specific brands */}
        {isQuoteRequiredBrand() && (
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8 }}
            className="flex items-center justify-center group mt-3"
          >
            <a
              href={`https://wa.me/3328123760?text=${getWhatsAppMessage()}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-green-600 p-3 text-base text-white rounded-full border drop-shadow-md flex flex-row items-center justify-center gap-x-2 bg-gradient-to-r from-green-600 to-green-700 ease-in-out duration-300 w-full tracking-wider cursor-pointer hover:from-green-700 hover:to-green-800 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-1.557.946-2.833 2.622-2.833 4.646 0 1.524.57 2.925 1.524 4.021l-.713 2.473 2.619-.859c1.036.67 2.299 1.067 3.622 1.067 5.029 0 9.11-4.082 9.11-9.11 0-2.41-.965-4.693-2.568-6.38a9.101 9.101 0 00-4.418-2.247m7.752-12.386C6.359 2.251.472 8.138.472 15.224c0 2.104.547 4.156 1.588 5.946L.209 24l6.439-2.127c1.68.92 3.577 1.98 5.77 1.98 8.488 0 12.34-6.876 12.34-12.346 0-3.735-1.763-7.231-4.587-9.745A12.28 12.28 0 0024 11.555c0-6.4-5.129-11.85-11.676-11.85z" />
              </svg>
              Obtener Cotización
            </a>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default ProductCard;
