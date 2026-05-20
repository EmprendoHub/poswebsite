"use client";
import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

const ImageOpacityMotion = ({
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
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 1.5 }}
      className={className}
    >
      <Image
        src={imgSrc}
        width={imgWidth}
        height={imgHeight}
        alt="motion image"
      />
    </motion.div>
  );
};

export default ImageOpacityMotion;
