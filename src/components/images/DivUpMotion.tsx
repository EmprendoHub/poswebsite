"use client";
import Image from "next/image";
import React from "react";
import { motion } from "framer-motion";

const DivUpMotion = ({
  divIndex,
  divDuration = 0.7,
  divClassName,
  imgClassName,
  imgSrc,
  imgWidth,
  imgHeight,
  imgAlt,
  title,
  text,
}: {
  divIndex: number;
  divDuration: number;
  divClassName: string;
  imgClassName: string;
  imgSrc: string;
  imgWidth: number;
  imgHeight: number;
  imgAlt: string;
  title: string;
  text: string;
}) => {
  const incrementDuration = divDuration + divIndex / 10;
  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      transition={{ duration: incrementDuration }}
      className={divClassName}
    >
      <Image
        src={imgSrc}
        width={imgWidth}
        height={imgHeight}
        alt={imgAlt}
        className={imgClassName}
      />
      <div className="flex flex-col justify-center items-center gap-2 bg-background p-2 w-[80%] absolute -bottom-[20px] text-center py-4 drop-shadow-md">
        <span className="text-base ">{title}</span>{" "}
        <span className="text-xs">{text}</span>{" "}
      </div>
    </motion.div>
  );
};

export default DivUpMotion;
