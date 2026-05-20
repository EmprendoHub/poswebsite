"use client";
import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

const ImageDownMotion = ({
  imgSrc,
  imgWidth,
  imgHeight,
  className,
}: {
  imgSrc: any;
  imgWidth: any;
  imgHeight: any;
  className: any;
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
        alt="motion image"
        className={className}
      />
    </motion.div>
  );
};

export default ImageDownMotion;
