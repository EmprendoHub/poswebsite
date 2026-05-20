"use client";
import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

const ImageDownMotion = ({
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
      initial={{ y: -50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9 }}
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

export default ImageDownMotion;
