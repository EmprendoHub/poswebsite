"use client";
import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

const ImageUpMotion = ({
  imgSrc,
  imgWidth,
  imgHeight,
  imgAlt,
  imgDuration = 0.9,
  className,
}: {
  imgSrc: string;
  imgWidth: number;
  imgHeight: number;
  imgAlt: string;
  imgDuration: number;
  className: string;
}) => {
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ duration: imgDuration }}
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

export default ImageUpMotion;
