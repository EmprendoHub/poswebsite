"use client";
import { useEffect, useRef, useState } from "react";
import "./productstyles.css";
import { IoMdCart } from "react-icons/io";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { motion } from "framer-motion";
import { calculatePercentage } from "@/backend/helpers";
import Image from "next/image";

const ViewProductDetails = ({
  product,
  trendingProducts,
}: {
  product: any;
  trendingProducts: any;
}) => {
  const colorList = product?.variations.map((variation: any) => ({
    value: variation.color,
    colorHex: variation.colorHex,
  }));
  const initialSizes = product?.variations
    .filter(
      (variation: any) => variation.color === product?.variations[0].color
    )
    .map((variation: any) => variation.size);
  const [images, setImages] = useState(product?.images);
  const [mainImage, setMainImage] = useState(product?.images[0].url);
  const slideRef = useRef<HTMLDivElement | null>(null);
  const [sizes, setSizes] = useState(initialSizes);
  const [alreadyCart, setAlreadyCart] = useState(false);
  const [size, setSize] = useState(product?.variations[0].size);
  const [variation, setVariation]: any = useState({
    _id: product?.variations[0]._id || "",
    size: product?.variations[0].size || "",
    color: product?.variations[0].color || "",
    colorHex: product?.variations[0].colorHex || "",
    price: product?.variations[0].price || "",
    stock: product?.variations[0].stock || "",
    image: product?.variations[0].image || "",
  });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showZoom, setShowZoom] = useState(false);
  const imageRef = useRef<HTMLDivElement | null>(null);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });

  const clickImage = (imageUrl: any) => {
    setMainImage(imageUrl);
  };

  useEffect(() => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      });
    }
  }, [mainImage]);

  const handleMouseMove = (e: any) => {
    if (imageRef.current) {
      const { left, top } = imageRef.current.getBoundingClientRect();
      const x = e.clientX - left;
      const y = e.clientY - top;
      setMousePosition({ x, y });
    }
  };

  const zoomFactor = 3;
  const zoomSize = 200; // Diameter of the zoom circle

  return (
    <div className="container-class maxsm:py-8 ">
      <main className="bg-background flex flex-col items-center justify-between">
        <div className="w-full mx-auto wrapper-class gap-3 bg-background text-foreground  rounded-xl">
          <div className="flex flex-row maxsm:flex-col items-start justify-start gap-x-5 px-20 py-8 maxmd:py-4  maxmd:px-3">
            {/* Left Panel */}
            <div className="w-1/2 maxsm:w-full flex flex-col items-center justify-center">
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.7 }}
                className="p-2 w-full relative h-full"
              >
                <motion.div
                  key={mainImage} // This key prop forces the div to re-render when the mainImage changes
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }} // Adjust the duration to control the speed of the transition
                  className="relative h-auto"
                  onMouseEnter={() => setShowZoom(true)}
                  onMouseLeave={() => setShowZoom(false)}
                  onMouseMove={handleMouseMove}
                  ref={imageRef}
                  style={{ cursor: "none" }}
                >
                  <Image
                    src={mainImage}
                    alt="product image"
                    width={450}
                    height={450}
                    priority
                  />

                  {showZoom && (
                    <motion.div
                      className="absolute border-2 border-gray-300 pointer-events-none overflow-hidden rounded-full"
                      style={{
                        width: `${zoomSize}px`,
                        height: `${zoomSize}px`,
                        left: `${mousePosition.x - zoomSize / 2}px`,
                        top: `${mousePosition.y - zoomSize / 2}px`,
                      }}
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0 }}
                    >
                      <div
                        style={{
                          width: `${imageDimensions.width * zoomFactor}px`,
                          height: `${imageDimensions.height * zoomFactor}px`,
                          backgroundImage: `url(${mainImage})`,
                          backgroundSize: `${
                            imageDimensions.width * zoomFactor
                          }px ${imageDimensions.height * zoomFactor}px`,
                          backgroundRepeat: "no-repeat",
                          transform: `translate(
            -${mousePosition.x * zoomFactor - zoomSize / 2}px,
            -${mousePosition.y * zoomFactor - zoomSize / 2}px
          )`,
                        }}
                      />
                    </motion.div>
                  )}
                </motion.div>
                <div className="relative h-20 w-20 flex items-center justify-center gap-2 cursor-pointer">
                  {images.map((image: any) => (
                    <Image
                      key={image._id}
                      src={image.url}
                      alt="product image"
                      width={250}
                      height={250}
                      onClick={() => clickImage(image.url)}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
            {/* Right PAnel */}
            <div className="description-class w-1/2 maxsm:w-full h-full ">
              <div className="flex flex-col items-start justify-start pt-1 maxsm:pt-2 gap-y-3 w-[90%] maxmd:w-full p-5 pb-10">
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                >
                  <p className="text-5xl font-semibold font-EB_Garamond mb-3">
                    {product?.brand}
                  </p>
                  <div className="text-xl font-normal s">
                    <div className="flex items-center gap-x-1">
                      <span className="font-base text-base">
                        {product?.title}
                      </span>
                    </div>
                  </div>
                  {product?.sale_price ? (
                    <div className="flex flex-row items-center justify-between">
                      <div className="border-[1px] border-yellow-600 w-fit py-1 px-4 rounded-full text-xs text-foreground">
                        <p>
                          {calculatePercentage(
                            variation.price,
                            product?.sale_price
                          )}
                          % menos
                        </p>
                      </div>
                      <div className="flex items-center gap-x-2">
                        <p className="line-through text-sm text-muted font-bodyFont">
                          <FormattedPrice amount={variation.price} />
                        </p>
                      </div>
                    </div>
                  ) : (
                    ""
                  )}
                  <div>
                    <p className="font-semibold text-4xl text-foreground font-bodyFont">
                      {product?.sale_price > 0 ? (
                        <FormattedPrice amount={product?.sale_price} />
                      ) : variation.price > 0 ? (
                        <FormattedPrice amount={variation.price} />
                      ) : (
                        ""
                      )}
                    </p>
                  </div>
                </motion.div>

                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className="text-gray-500 text-base description-class tracking-wider"
                >
                  {product?.description ? product?.description : ""}
                </motion.div>
                <span className="text-xs">
                  Existencias:{" "}
                  <span className=" font-bodyFont">
                    <strong>{variation.stock}</strong>
                  </span>
                </span>
                {variation?.stock <= 0 ? (
                  ""
                ) : (
                  <div className="flex items-start gap-6">
                    <motion.div
                      initial={{ y: 50, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      transition={{ duration: 0.7 }}
                      className="text-sm text-lightText flex flex-col items-center justify-center"
                    >
                      {product?.variations.length > 1 ? (
                        <span className="flex items-center gap-5 justify-center ">
                          {sizes?.map((s: any, index: number) => (
                            <button
                              key={index}
                              value={s}
                              className={`rounded-full border border-slate-400 flex items-center justify-center px-2 py-1 ${
                                size === s
                                  ? " bg-black text-white"
                                  : "border-slate-400"
                              }`}
                            >
                              {s}
                            </button>
                          ))}
                        </span>
                      ) : (
                        <div className="grid maxxsm:grid-cols-1 maxmd:grid-cols-2 grid-cols-4 gap-4">
                          <p className="text-foreground">
                            {product?.variations[0].size}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  </div>
                )}
                {/* Cart Button */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="flex items-center group"
                >
                  {/* add to cart button */}
                  {variation?.stock <= 0 ? (
                    <span className="text-[12px] border-[1px] border-black font-medium py-1 px-3 rounded-xl bg-primary text-slate-100">
                      SIN EXISTENCIAS
                    </span>
                  ) : alreadyCart ? (
                    <span className="  border-[1px] border-black text-sm py-1 px-3 rounded-xl bg-primary text-slate-100">
                      TODAS LAS EXISTENCIAS ESTÁN EN CARRITO
                    </span>
                  ) : (
                    <motion.button
                      disabled={true}
                      whileHover={{ scale: 1.07 }}
                      whileTap={{ scale: 0.9 }}
                      className={` cursor-not-allowed ${
                        true
                          ? "bg-muted grayscale-0 text-foreground border-slate-300"
                          : "text-white border-black"
                      } border  drop-shadow-md flex flex-row items-center justify-between px-6 py-2  gap-x-4 text-xs bg-primary rounded-xl  ease-in-out  duration-300 w-auto uppercase tracking-wider `}
                    >
                      {variation?.stock <= 0
                        ? "Out of Stock"
                        : "Agregar a carrito"}

                      <span
                        className={`text-white ${
                          variation?.stock <= 0
                            ? "bg-slate-300 grayscale-0 text-foreground"
                            : "group-hover:bg-black group-hover:text-white duration-200 "
                        } text-xl text-foreground w-12 flex items-center justify-center  rounded-full py-2`}
                      >
                        <IoMdCart size={18} />
                      </span>
                    </motion.button>
                  )}
                </motion.div>
                <div className="flex flex-col text-xs">
                  <span>
                    Categoría:{" "}
                    <span className="t font-bodyFont">
                      <b>{product?.category}</b>
                    </span>
                  </span>
                  <span>
                    Genero:{" "}
                    <span className="t font-bodyFont">{product?.gender}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ViewProductDetails;
