"use client";
import { motion } from "framer-motion";

const TextRightMotion = ({
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
        initial={{ x: -50, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className=" mb-2 text-5xl maxlg:text-3xl font-black uppercase pb-3 text-foreground font-EB_Garamond"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ x: -50, opacity: 0 }}
        whileInView={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="text-base pb-3 text-slate-700"
      >
        {subtitle}
      </motion.p>
    </div>
  );
};

export default TextRightMotion;
