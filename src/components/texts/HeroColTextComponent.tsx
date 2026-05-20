"use client";
import { motion } from "framer-motion";

const HeroColTextComponent = ({
  pretitle,
  title,
  word,
  subtitle,
  className,
}: {
  pretitle: string;
  title: string;
  word: string;
  subtitle: string;
  className: string;
}) => {
  return (
    <div className={`${className}  `}>
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-[16px] uppercase pb-2 tracking-wide"
      >
        {pretitle}
      </motion.p>
      <motion.h2
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="text-4xl maxmd:text-4xl font-raleway font-bold tracking-normal"
      >
        {title} <span className=" text-greenLight font-black">{word} </span>
      </motion.h2>
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-base pt-3 tracking-wide font-ubuntu"
      >
        {subtitle}
      </motion.p>
    </div>
  );
};

export default HeroColTextComponent;
