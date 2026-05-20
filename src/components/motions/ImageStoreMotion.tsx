"use client";
import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

const ImageStoreMotion = ({
  imgSrc,
  className,
}: {
  imgSrc: any;
  className: any;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className="relative flex flex-col items-center justify-center w-full min-h-[400px] "
    >
      <Image
        src={imgSrc}
        fill
        priority
        sizes="100vw"
        alt="motion image"
        className={`${className} `}
      />

      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className="z-10 text-white text-[10rem] maxmd:text-[5rem] maxmd:leading-[6rem] min-h-[100%] w-full text-center font-EB_Garamond "
      >
        Tienda
      </motion.h2>
      {/* overlay */}
      <div className="min-h-[100%] absolute z-[2] min-w-[100%] top-0 left-0 bg-black opacity-20" />
    </motion.div>
  );
};

export default ImageStoreMotion;
