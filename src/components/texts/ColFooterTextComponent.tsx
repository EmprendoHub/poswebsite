"use client";
import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";

const ColFooterTextComponent = ({
  pretitle,
  title,
  subtitle,
  btnText,
  btnUrl = "/catalog",
}: {
  pretitle: string;
  title: string;
  subtitle: string;
  btnText: string;
  btnUrl: string;
}) => {
  return (
    <div>
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-xs tracking-normal uppercase text-white"
      >
        {pretitle}
      </motion.p>
      <motion.h2
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="text-2xl text-primary maxsm:text-xl tracking-normal uppercase"
      >
        {title}{" "}
      </motion.h2>
      {subtitle && (
        <motion.p
          initial={{ y: 30, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="text-xs pt-2 tracking-wide text-white"
        >
          {subtitle}
        </motion.p>
      )}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9 }}
        className="py-10"
      >
        <Link
          href={btnUrl}
          className="pt-3 uppercase text-lg rounded-full px-6 py-3 bg-primary drop-shadow-sm text-white hover:bg-foreground dark:hover:bg-background ease-linear duration-300"
        >
          {btnText}
        </Link>
      </motion.div>
    </div>
  );
};

export default ColFooterTextComponent;
