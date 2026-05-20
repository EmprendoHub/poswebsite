"use client";
import React, { useState } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Image from "next/image";
import ProductCard from "../producto/_components/ProductCard";

const HeaderProducts = ({ editorsProducts }: { editorsProducts: any }) => {
  const cat_title = [
    { id: 1, category: "Tarjetas Coleccionables" },
    { id: 2, category: "Artículos Autografiados" },
    { id: 3, category: "Sets de Batalla" },
  ];

  return (
    <div className="relative  h-full pb-20 pt-5">
      <div className="w-full h-20 absolute z-0 -top-10 bg-gradient-to-t from-black via-black to-black/30 blur-sm" />
      <div className="w-full h-20 absolute z-0 -top-5 bg-gradient-to-b from-black via-black to-black/30 blur-sm" />
      <div className="">
        <Image
          src={"/covers/duela_bg.webp"}
          alt="Invierte tu dinero en coleccionables"
          fill
          className="-z-[1] fixed w-full"
        />
      </div>
      <Carousel
        className="w-full max-w-[1450px] mx-auto mt-10 px-5"
        opts={{
          align: "center",
          slidesToScroll: 3,
        }}
      >
        <h3 className="ml-4 my-3 text-semibold text-4xl font-EB_Garamond text-white">
          Lo mas nuevo
        </h3>
        <CarouselContent className="-ml-1 ">
          {editorsProducts.slice(0, 20).map((product: any, index: any) => (
            <CarouselItem
              key={index}
              className="pl-1 basis-1/5 maxmd:basis-1/4 maxsm:basis-1/2"
            >
              <ProductCard item={product} index={index} />
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
