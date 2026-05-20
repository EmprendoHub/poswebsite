"use client";
import { motion } from "framer-motion";

const TextUnderConstruction = ({
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
        className=" w-full text-center leading-none font-EB_Garamond text-[10rem] maxmd:text-[6rem] maxsm:text-[4rem]"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="text-slate-100 text-center font-raleway text-[6rem] maxmd:text-[4rem] maxsm:text-[2rem] w-full pb-10 "
      >
        {subtitle}
      </motion.p>
    </div>
  );
};

export default TextUnderConstruction;
