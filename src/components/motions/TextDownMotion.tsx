"use client";
import { motion } from "framer-motion";

const TextDownMotion = ({
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
        initial={{ y: -50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className=" mb-2 text-7xl maxlg:text-5xl font-black uppercase pb-3 text-foreground font-EB_Garamond"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ y: -50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="text-base pb-3 text-slate-700"
      >
        {subtitle}
      </motion.p>
    </div>
  );
};

export default TextDownMotion;
