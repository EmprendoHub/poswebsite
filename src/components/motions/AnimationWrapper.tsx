"use client";
import { AnimatePresence, motion } from "framer-motion";
import React from "react";

const AnimationWrapper = ({
  children,
  keyValue,
  initial = { opacity: 0 },
  animate = { opacity: 1 },
  transition = { duration: 0.35, ease: "easeInOut" },
  className,
}: {
  children?: any;
  keyValue?: any;
  initial?: any;
  animate?: any;
  transition?: any;
  className?: any;
}) => {
  return (
    <AnimatePresence>
      <motion.div
        key={keyValue}
        initial={initial}
        animate={animate}
        transition={transition}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default AnimationWrapper;
