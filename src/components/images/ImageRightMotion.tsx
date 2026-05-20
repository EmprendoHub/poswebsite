"use client";
import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

const ImageRightMotion = ({
  imgSrc,
  imgWidth,
  imgHeight,
  imgAlt,
  className,
}: {
  imgSrc: string;
  imgWidth: number;
  imgHeight: number;
  imgAlt: string;
  className: string;
}) => {
  return (
    <motion.div
      initial={{ x: 50, opacity: 0 }}
      whileInView={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.9 }}
      className="w-full h-full object-cover p-0 m-0"
    >
      <Image
        src={imgSrc}
        width={imgWidth}
        height={imgHeight}
        alt={imgAlt}
        className={className}
      />
    </motion.div>
  );
};

export default ImageRightMotion;
