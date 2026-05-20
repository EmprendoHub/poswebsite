"use client";
import { motion } from "framer-motion";

const TextOpacityMotion = ({
  title,
  subtitle,
  className = "",
}: {
  title: any;
  subtitle: any;
  className: any;
}) => {
  return (
    <div className={`${className} `}>
      <motion.h2
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 1.5 }}
        className=" w-full text-center leading-none font-EB_Garamond text-[24rem] maxmd:text-[12rem] maxsm:text-[8rem]"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className=" font-raleway text-xl w-1/3 pl-32 pb-10 maxmd:hidden"
      >
        {subtitle}
      </motion.p>
    </div>
  );
};

export default TextOpacityMotion;
