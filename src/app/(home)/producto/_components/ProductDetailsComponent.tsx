"use client";
import { useEffect, useRef, useState } from "react";
import "./productstyles.css";
import { FaAngleLeft, FaAngleRight } from "react-icons/fa";
import ProductCard from "./ProductCard";
import { IoMdCart } from "react-icons/io";
import FormattedPrice from "@/backend/helpers/FormattedPrice";
import { motion } from "framer-motion";
import { calculatePercentage } from "@/backend/helpers";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "@/redux/shoppingSlice";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Image from "next/image";
import Link from "next/link";

const ProductDetailsComponent = ({
  product,
  trendingProducts,
}: {
  product: any;
  trendingProducts: any;
}) => {
  const [storeInventoryData, setStoreInventoryData] = useState<
    Record<string, Array<{ variationId: string; quantity: number }>>
  >({});
  const colorList = product?.variations.map((variation: any) => ({
    value: variation.color,
    colorHex: variation.colorHex,
  }));
  const initialSizes = product?.variations
    .filter(
      (variation: any) => variation.color === product?.variations[0].color,
    )
    .map((variation: any) => variation.size);
  const dispatch = useDispatch();
  const { productsData } = useSelector((state: any) => state?.compras);
  const router = useRouter();
  const [images, setImages] = useState(product?.images);
  const [mainImage, setMainImage] = useState(product?.images[0].url);
  const slideRef = useRef<HTMLDivElement | null>(null);
  const [sizes, setSizes] = useState(initialSizes);
  const [colors, setColors] = useState(product?.colors);
  const [alreadyCart, setAlreadyCart] = useState(false);
  const [color, setColor] = useState(product?.variations[0].color);
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

  // Fetch store inventory data in batch for trending products
  useEffect(() => {
    if (!trendingProducts || trendingProducts.length === 0) return;

    const productIds = trendingProducts.map((p: any) => p._id);
    fetch("/api/store-inventory-batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds }),
    })
      .then((r) => r.json())
      .then((data) => {
        setStoreInventoryData(data);
      })
      .catch((err) => {
        console.error("Error fetching batch inventory:", err);
      });
  }, [trendingProducts]);

  useEffect(() => {
    // Find matches based on _id property
    const existingProduct = productsData.find((item1: any) =>
      product.variations.some((item2: any) => item1._id === item2._id),
    );
    const existingVariation = product.variations.find((item1: any) =>
      productsData.some((item2: any) => item1._id === item2._id),
    );

    if (existingProduct?.quantity >= existingVariation?.stock) {
      setAlreadyCart(true);
    }
    // eslint-disable-next-line
  }, [productsData]);

  const clickImage = (imageUrl: any) => {
    setMainImage(imageUrl);
  };

  const handleClick = () => {
    const v = { ...variation };
    v.product = product._id;
    v.variation = v._id;
    v.title = product.title;
    v.image = [{ url: variation.image }];
    v.quantity = 1;
    v.brand = product.brand;
    v.weight = product.weight || 0.5;
    v.length = product.dimensions?.length || 15;
    v.width = product.dimensions?.width || 15;
    v.height = product.dimensions?.height || 10;
    v.discountPercentage = product.discountPercentage || 0;
    dispatch(addToCart(v));
    toast(`${product?.title.substring(0, 15)}... se agrego al carrito`);
    router.push("/carrito");
  };

  const handleColorSelection = (e: any) => {
    e.preventDefault();
    const valueToCheck = e.target.value;
    setColor(valueToCheck);

    const pickedVariationByColor = product.variations.find(
      (variation: any) => variation.color === valueToCheck,
    );

    const existingProduct = productsData.find(
      (variation: any) => variation._id === pickedVariationByColor._id,
    );
    if (existingProduct) {
      setAlreadyCart(true);
    } else {
      setAlreadyCart(false);
    }
    setSize(pickedVariationByColor.size);
    setVariation(pickedVariationByColor);
    const newImage = [
      { url: pickedVariationByColor.image, _id: pickedVariationByColor._id },
    ];

    setImages(newImage);

    const currentSizes: any[] = [];
    product?.variations.forEach((variation: any) => {
      const exists = variation.color === valueToCheck;

      if (exists) {
        currentSizes.push(variation.size);
      }
    });
    setSizes(currentSizes);
  };

  const handleSizeSelection = (e: any) => {
    e.preventDefault();
    const valueToCheck = e.target.value;
    const pickedSizeVariation = product.variations.find(
      (variation: any) =>
        variation.size === valueToCheck && variation.color === color,
    );
    setVariation(pickedSizeVariation);
    setSize(valueToCheck);
  };

  useEffect(() => {
    if (imageRef.current) {
      setImageDimensions({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      });
    }
  }, []);

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

  const filteredTrendingProducts = (trendingProducts ?? []).filter(
    (p: any) =>
      p?.availability?.online === true &&
      (Number(p?.stock ?? 0) > 0 ||
        (Array.isArray(p?.variations) &&
          p.variations.some((v: any) => Number(v?.stock ?? 0) > 0))),
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-900">
      <div className="flex flex-col items-center justify-between">
        <div className="w-full mx-auto gap-3 text-foreground">
          <div className="flex flex-row maxsm:flex-col items-stretch justify-center gap-8 px-6 maxlg:px-8 py-8 maxmd:py-4 maxmd:px-4 maxsm:gap-4">
            {/* Left Panel - Product Image */}
            <div className="relative w-full lg:w-[50%] flex flex-col items-center justify-start">
              {/* Image Container */}
              <motion.div
                initial={{ x: -50, opacity: 0 }}
                whileInView={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.7 }}
                className="relative w-full aspect-square maxsm:aspect-auto flex items-center justify-center rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-800 hover:border-gray-700 transition-colors"
              >
                <motion.div
                  key={mainImage}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.5 }}
                  className="relative flex h-full w-full items-center justify-center"
                  onMouseEnter={() => setShowZoom(true)}
                  onMouseLeave={() => setShowZoom(false)}
                  onMouseMove={handleMouseMove}
                  ref={imageRef}
                  style={{ cursor: "none" }}
                >
                  <Image
                    src={mainImage}
                    alt="product image"
                    width={500}
                    height={500}
                    priority
                    className="w-full h-full object-cover"
                  />

                  {showZoom && (
                    <motion.div
                      className="absolute border-2 border-primary pointer-events-none overflow-hidden rounded-full shadow-lg"
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
              </motion.div>

              {/* Thumbnail Images */}
              <div className="w-full mt-4">
                <div className="flex items-center justify-start gap-3 overflow-x-auto pb-2">
                  {images.map((image: any) => (
                    <motion.button
                      key={image._id}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => clickImage(image.url)}
                      className={`relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                        mainImage === image.url
                          ? "border-primary shadow-lg shadow-primary/50"
                          : "border-gray-700 hover:border-gray-600"
                      }`}
                    >
                      <Image
                        src={image.url}
                        alt="product thumbnail"
                        width={80}
                        height={80}
                        className="w-full h-full object-cover"
                      />
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>
            {/* Right Panel - Product Details */}
            <div className="w-full lg:w-[50%] flex flex-col items-start justify-start">
              <div className="flex flex-col items-start justify-start gap-y-4 w-full">
                <motion.div
                  initial={{ x: 50, opacity: 0 }}
                  whileInView={{ x: 0, opacity: 1 }}
                  transition={{ duration: 0.5 }}
                  className="w-full space-y-3"
                >
                  {/* Brand */}
                  <p className="text-3xl lg:text-4xl font-semibold font-EB_Garamond text-white">
                    {product?.brand}
                  </p>

                  {/* Title */}
                  <p className="text-lg lg:text-xl text-gray-300 font-light">
                    {product?.title}
                  </p>

                  {/* Discount Badge and Old Price */}
                  {product?.sale_price || product?.discountPercentage > 0 ? (
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2">
                      {product?.sale_price && (
                        <div className="bg-gradient-to-r from-yellow-600 to-yellow-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          {calculatePercentage(
                            variation.price,
                            product?.sale_price,
                          )}
                          % OFF
                        </div>
                      )}
                      {product?.discountPercentage > 0 && (
                        <div className="bg-gradient-to-r from-green-600 to-green-500 text-white px-3 py-1 rounded-full text-xs font-semibold">
                          {product?.discountPercentage}% DESCUENTO
                        </div>
                      )}
                      {(product?.sale_price ||
                        product?.discountPercentage > 0) && (
                        <div className="flex items-center gap-3">
                          <p className="line-through text-sm text-gray-500 font-bodyFont">
                            <FormattedPrice amount={variation.price} />
                          </p>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Price - Main */}
                  <div className="pt-2">
                    <p className="font-semibold text-4xl lg:text-5xl text-white font-bodyFont">
                      {product?.sale_price > 0 ? (
                        <FormattedPrice amount={product?.sale_price} />
                      ) : product?.discountPercentage > 0 &&
                        variation.price > 0 ? (
                        <FormattedPrice
                          amount={
                            variation.price *
                            (1 - product.discountPercentage / 100)
                          }
                        />
                      ) : variation.price > 0 ? (
                        <FormattedPrice amount={variation.price} />
                      ) : (
                        ""
                      )}
                    </p>
                  </div>
                </motion.div>

                {/* Description */}
                <motion.div
                  initial={{ y: 30, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6 }}
                  className="text-gray-400 text-sm leading-relaxed pt-2"
                >
                  {product?.description ? product?.description : ""}
                </motion.div>
                {/* Stock Info */}
                <div className="flex items-center gap-2 pt-2 pb-4 border-b border-gray-800">
                  <span className="text-gray-400 text-sm">
                    Stock Disponible:
                  </span>
                  <span
                    className={`text-sm font-semibold ${variation.stock > 0 ? "text-green-400" : "text-red-400"}`}
                  >
                    {variation.stock} unidades
                  </span>
                </div>

                {/* Variations - Size and Color */}
                {variation?.stock > 0 && (
                  <motion.div
                    initial={{ y: 30, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.7 }}
                    className="w-full space-y-4 pt-2"
                  >
                    {/* Sizes */}
                    <div className="flex flex-col gap-2">
                      <label className="text-sm font-semibold text-gray-300">
                        Tamaño
                      </label>
                      {product?.variations.length > 1 ? (
                        <div className="flex flex-wrap gap-2">
                          {sizes?.map((s: any, index: number) => (
                            <motion.button
                              key={index}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={handleSizeSelection}
                              value={s}
                              className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                                size === s
                                  ? "bg-primary border-primary text-white shadow-lg shadow-primary/50"
                                  : "border-gray-700 text-gray-300 hover:border-gray-600"
                              }`}
                            >
                              {s}
                            </motion.button>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700">
                          <span className="text-gray-300 text-sm font-medium">
                            {product?.variations[0].size}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
                {/* Add to Cart Button */}
                <motion.div
                  initial={{ y: 50, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.8 }}
                  className="w-full pt-4"
                >
                  {variation?.stock <= 0 ? (
                    <div className="w-full px-6 py-3 bg-gray-700 text-gray-300 rounded-lg text-center font-semibold cursor-not-allowed">
                      Producto Agotado
                    </div>
                  ) : alreadyCart ? (
                    <Link href="/carrito">
                      <button className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-semibold transition-all">
                        Ver en Carrito
                      </button>
                    </Link>
                  ) : (
                    <motion.button
                      disabled={variation?.stock <= 0}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full px-6 py-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white rounded-lg font-semibold text-base flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl"
                      onClick={handleClick}
                    >
                      <IoMdCart size={20} />
                      Agregar a Carrito
                    </motion.button>
                  )}
                </motion.div>

                {/* Product Info */}
                <div className="w-full border-t border-gray-800 pt-4 space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Categoría:</span>
                    <span className="text-white font-medium">
                      {product?.category}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">Género:</span>
                    <span className="text-white font-medium">
                      {product?.gender}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Related Products Section */}
        <div className="w-full bg-gradient-to-b from-gray-900 to-gray-950 border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-16 maxmd:py-10">
            {/* Section Header */}
            <div className="mb-10">
              <h2 className="text-3xl lg:text-4xl font-bold font-EB_Garamond text-white mb-2">
                Productos Relacionados
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-primary to-primary/50 rounded-full"></div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 maxmd:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 maxmd:gap-4">
              {filteredTrendingProducts?.map((product: any, index: number) => (
                <ProductCard
                  key={product._id}
                  item={product}
                  index={index}
                  storeInventoryData={storeInventoryData}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailsComponent;
