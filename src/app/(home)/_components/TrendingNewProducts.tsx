"use client";
import BoxesSectionTitle from "@/components/texts/BoxesSectionTitle";
import { motion, AnimatePresence } from "framer-motion";
import React, { useState } from "react";
import ProductCard from "../producto/_components/ProductCard";
import Image from "next/image";

function shuffleArray(array: any) {
  let i = array.length - 1;
  for (; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
  return array;
}

const TrendingNewProducts = ({ trendProducts }: { trendProducts: any }) => {
  const cat_title = [
    { id: 1, category: "Tarjetas Coleccionables" },
    { id: 2, category: "Articulos Autografiados" },
    { id: 3, category: "Sets de Batalla" },
  ];
  const [allProducts, setAllProducts] = useState(trendProducts);
  const [trendingProducts, setTrendingProducts] = useState(trendProducts);
  const [activeTab, setActiveTab] = useState("All");

  const activatedTab = (category: string) => {
    setActiveTab(category);

    const productsArray = Object.values(allProducts);
    const randommized = shuffleArray(productsArray);

    const filteredProductData = productsArray.filter(
      (prod: any) => prod.category === category
    );
    if (category === "All") {
      setTrendingProducts(randommized);
    } else {
      setTrendingProducts(filteredProductData);
    }
  };

  return (
    <div className="flex flex-col justify-center items-center px-20 maxmd:px-5 my-20">
      <div className="absolute w-full h-full flex -z-[1]">
        <Image
          src={"/covers/duela_bg.webp"}
          alt="Invierte tu dinero en coleccionables"
          fill
        />
      </div>
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
        {trendingProducts.slice(0, 4).map((product: any, index: number) => {
          return (
            <AnimatePresence key={index}>
              <motion.div
                key={product._id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
              >
                <ProductCard item={product} index={index} />
              </motion.div>
            </AnimatePresence>
          );
        })}
      </motion.div>
    </div>
  );
};

export default TrendingNewProducts;
