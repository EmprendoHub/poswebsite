"use client";
import React, { useState, useEffect } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import ProductCard from "../producto/_components/ProductCard";

const HeaderProducts = ({ editorsProducts }: { editorsProducts: any }) => {
  const [storeInventoryData, setStoreInventoryData] = useState<
    Record<string, Array<{ variationId: string; quantity: number }>>
  >({});

  // Fetch store inventory data in batch for displayed products
  useEffect(() => {
    if (!editorsProducts || editorsProducts.length === 0) return;

    const productIds = editorsProducts.slice(0, 20).map((p: any) => p._id);
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
  }, [editorsProducts]);
  return (
    <div className="relative h-full pb-10 pt-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 mb-6 flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">
            Catálogo
          </p>
          <h3 className="text-3xl font-bold text-white tracking-tight">
            Lo más nuevo
          </h3>
        </div>
        <a
          href="/tienda"
          className="text-xs font-semibold text-primary hover:underline"
        >
          Ver todo →
        </a>
      </div>
      <Carousel
        className="w-full max-w-7xl mx-auto px-4 sm:px-6"
        opts={{
          align: "start",
          slidesToScroll: 3,
        }}
      >
        <CarouselContent className="-ml-1 ">
          {editorsProducts.slice(0, 20).map((product: any, index: any) => (
            <CarouselItem
              key={index}
              className="pl-1 basis-1/5 maxmd:basis-1/4 maxsm:basis-1/2"
            >
              <ProductCard
                item={product}
                index={index}
                storeInventoryData={storeInventoryData}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>

      {/* Multi select animation */}
      {/* <div className="flex flex-col justify-center items-center px-20 maxmd:px-5 my-20">
        <BoxesSectionTitle
          className="pb-10 text-5xl maxmd:text-3xl text-center"
          title={"Explora la Colección"}
          subtitle={"Varios productos"}
        />

        <ul className="grid grid-cols-3 gap-4 my-2 px-10 maxmd:gap-2 maxmd:px-2">
          {cat_title.map((item, index) => {
            return (
              <li
                key={index}
                className={`${
                  activeTab == item.category
                    ? "active"
                    : "border-b border-gray-500"
                } cursor-pointer text-center  py-2 px-6 maxsm:px-2 text-sm maxsm:text-[12px] uppercase font-playfair-display`}
                onClick={() => activatedTab(item.category)}
              >
                {item.category}
              </li>
            );
          })}
        </ul>
        <motion.div
          className="w-full flex flex-row maxmd:flex-wrap gap-4 my-10 mx-auto justify-center items-center object-fill"
          layout
        >
          {trendingProducts.slice(0, 5).map((product: any, index: number) => {
            return (
              <AnimatePresence key={index}>
                <motion.div
                  key={product._id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5 }}
                  className="basis-1/5 maxmd:basis-1/4 maxsm:basis-1/3 my-10 mx-auto "
                >
                  <ProductCard item={product} index={index} />
                </motion.div>
              </AnimatePresence>
            );
          })}
        </motion.div>
      </div> */}
      <div className="w-full h-20 absolute z-0 -bottom-10 bg-gradient-to-b from-black via-black to-black/30 blur-sm" />
      <div className="w-full h-20 absolute z-0 -bottom-5 bg-gradient-to-t from-black via-black to-black/30 blur-sm" />
    </div>
  );
};

export default HeaderProducts;
