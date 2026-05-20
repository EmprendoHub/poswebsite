"use client";
import Link from "next/link";
import React from "react";
import { motion } from "framer-motion";
import { Button } from "../ui/button";

const ColTextComponent = ({
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
    <div className="p-20 maxmd:p-3 text-white ">
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="text-xl maxsm:text-lg tracking-normal uppercase"
      >
        {pretitle}
      </motion.p>
      <motion.h2
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="text-4xl maxsm:text-2xl font-raleway font-black tracking-normal uppercase"
      >
        {title}{" "}
      </motion.h2>
      <motion.p
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="text-sm  maxmd:text-sm pt-3 tracking-widest "
      >
        {subtitle}
      </motion.p>
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.9 }}
        className="py-10 "
      >
        <Link href={btnUrl}>
          <Button variant={"secondary"}>{btnText}</Button>
        </Link>
      </motion.div>
    </div>
  );
};

export default ColTextComponent;
