"use client";
import { motion } from "framer-motion";

const BoxesSectionTitle = ({
  title,
  subtitle,
  className = "",
}: {
  title: string;
  subtitle: string;
  className: string;
}) => {
  return (
    <div className={`${className} `}>
      <motion.h2
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-2xl mb-2"
      >
        {title}
      </motion.h2>
      <motion.p
        initial={{ y: 50, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="text-xs"
      >
        {subtitle}
      </motion.p>
    </div>
  );
};

export default BoxesSectionTitle;
