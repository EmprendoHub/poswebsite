"use client";
import React from "react";
import { motion } from "framer-motion";

const SvgRightMotion = () => {
  return (
    <>
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-[55%] h-[55%]  bg-secondary-opacity absolute -bottom-5 -right-5 z-[1]"
      ></motion.div>
    </>
  );
};

export default SvgRightMotion;
